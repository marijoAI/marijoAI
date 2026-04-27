/**
 * Neural-network training Web Worker.
 *
 * Runs the WASM training loop off the main thread so that browser background
 * throttling (and in the worst case full tab freezing) cannot slow training
 * down when the user switches focus to another tab.
 *
 * The main thread builds this worker from a Blob URL and prepends a
 * `NN_WASM_B64` declaration holding the base64-encoded nn.wasm bytes. That
 * prefix is what lets the worker instantiate WebAssembly without any fetch
 * (so it also works under file://). See `_trainInWorker()` in
 * `js/neural-network.js` for the exact wrapper.
 *
 * Protocol
 * --------
 * Main → Worker:
 *   { type: 'train',
 *     nSamples, inputSize, hiddenSize, outputSize,
 *     featuresFlat: Float64Array, labelsFlat: Float64Array,
 *     epochs, batchSize, learningRate,
 *     adamBeta1, adamBeta2, adamEpsilon }
 *
 * Worker → Main:
 *   { type: 'ready' }                          // sent after wasm instantiated
 *   { type: 'epoch', epoch, loss, accuracy }   // one per completed epoch
 *   { type: 'done', weights, biases }          // training finished
 *   { type: 'error', message }                 // anything threw
 */
'use strict';

let wasm = null;

function base64ToBytes(b64) {
    const bin = atob(b64);
    const len = bin.length;
    const out = new Uint8Array(len);
    for (let i = 0; i < len; i++) out[i] = bin.charCodeAt(i);
    return out;
}

async function ensureWasm() {
    if (wasm) return;
    // NN_WASM_B64 is injected by the main thread as a `const` prefix prepended
    // to this source when building the Blob worker.
    if (typeof NN_WASM_B64 !== 'string' || NN_WASM_B64.length === 0) {
        throw new Error('Worker: NN_WASM_B64 not injected by host.');
    }
    const bytes = base64ToBytes(NN_WASM_B64);
    const imports = { env: { abort: () => { throw new Error('WASM abort'); } } };
    const mod = await WebAssembly.instantiate(bytes, imports);
    wasm = mod.instance.exports;
    self.postMessage({ type: 'ready' });
}

function uploadFlat(ptr, flatF64) {
    const f64 = new Float64Array(wasm.memory.buffer);
    f64.set(flatF64, ptr >>> 3);
}

function extractWeights(inputSize, hiddenSize, outputSize) {
    const w0 = [];
    const b0 = [];
    for (let j = 0; j < hiddenSize; j++) {
        const row = new Array(inputSize);
        for (let k = 0; k < inputSize; k++) row[k] = wasm.nn_get_weight(0, j, k);
        w0.push(row);
        b0.push(wasm.nn_get_bias(0, j));
    }
    const w1 = [];
    const b1 = [];
    for (let j = 0; j < outputSize; j++) {
        const row = new Array(hiddenSize);
        for (let k = 0; k < hiddenSize; k++) row[k] = wasm.nn_get_weight(1, j, k);
        w1.push(row);
        b1.push(wasm.nn_get_bias(1, j));
    }
    return { weights: [w0, w1], biases: [b0, b1] };
}

self.onmessage = async (e) => {
    const msg = e.data;
    try {
        if (msg && msg.type === 'train') {
            await ensureWasm();

            const {
                nSamples, inputSize, hiddenSize, outputSize,
                featuresFlat, labelsFlat,
                epochs, batchSize, learningRate,
                adamBeta1, adamBeta2, adamEpsilon
            } = msg;

            wasm.nn_init(inputSize, hiddenSize, outputSize);
            wasm.nn_alloc_training_data(nSamples);

            // WASM memory may have grown; re-read the buffer each time before
            // copying data in.
            uploadFlat(wasm.nn_get_x_ptr(), featuresFlat);
            uploadFlat(wasm.nn_get_y_ptr(), labelsFlat);

            for (let epoch = 0; epoch < epochs; epoch++) {
                wasm.nn_train_epoch(
                    batchSize, learningRate,
                    adamBeta1, adamBeta2, adamEpsilon
                );
                const loss = wasm.nn_get_epoch_loss();
                const accuracy = wasm.nn_get_epoch_accuracy();
                self.postMessage({
                    type: 'epoch',
                    epoch: epoch + 1,
                    loss: loss,
                    accuracy: accuracy
                });
            }

            const out = extractWeights(inputSize, hiddenSize, outputSize);
            self.postMessage({
                type: 'done',
                weights: out.weights,
                biases: out.biases
            });
        }
    } catch (err) {
        self.postMessage({
            type: 'error',
            message: (err && err.message) || String(err)
        });
    }
};
