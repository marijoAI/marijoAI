/**
 * Neural Network (ReLU hidden + Sigmoid output, Binary Cross-Entropy, Adam).
 *
 * Training runs inside a dedicated Web Worker (`js/nn-worker.js`, embedded
 * into `js/nn-worker-embed.js`), so browser background-tab throttling and
 * freezing have NO effect on training speed — workers live on their own
 * event loop that runs even when the owning tab is hidden or not focused.
 *
 * Inference stays on the main thread using the WASM module loaded in
 * `js/nn-wasm.js` (exposed as `window._wasmNN`), because prediction is fast
 * enough to not benefit from a worker round-trip. After training finishes,
 * the trained weights are pushed into the main-thread WASM so that
 * `forward()` / `predict()` can use them immediately.
 *
 * Both the WASM binary and the worker source are embedded as `window.*`
 * strings, so the app loads identically over `http(s)://` and `file://`.
 *
 * Callers MUST await `window._wasmNNReady` before constructing a network.
 */
class NeuralNetwork {
    constructor(config) {
        if (!window._wasmNN) {
            throw new Error(
                'NeuralNetwork: WebAssembly module not loaded. ' +
                'Await window._wasmNNReady before constructing a network.'
            );
        }

        this.config = config;
        this.layers = [];
        this.weights = [];
        this.biases = [];
        this.initializeNetwork();
    }

    initializeNetwork() {
        const { architecture } = this.config;

        this.layers.push({
            type: 'input',
            units: architecture.inputLayer.units,
            activation: 'linear'
        });

        architecture.hiddenLayers.forEach(layer => {
            this.layers.push({
                type: 'hidden',
                units: layer.units,
                activation: layer.activation
            });
        });

        this.layers.push({
            type: 'output',
            units: architecture.outputLayer.units,
            activation: architecture.outputLayer.activation
        });

        this._initWasm();
    }

    // ── WASM lifecycle ─────────────────────────────────────────────
    _initWasm() {
        const wasm = window._wasmNN;
        const inputSize = this.config.architecture.inputLayer.units;
        const hiddenSize = this.config.architecture.hiddenLayers[0].units;
        const outputSize = this.config.architecture.outputLayer.units;
        wasm.nn_init(inputSize, hiddenSize, outputSize);
        this._syncWeightsFromWasm();
    }

    _syncWeightsFromWasm() {
        const wasm = window._wasmNN;
        const inputSize = this.config.architecture.inputLayer.units;
        const hiddenSize = this.config.architecture.hiddenLayers[0].units;
        const outputSize = this.config.architecture.outputLayer.units;

        const w0 = [];
        const b0 = [];
        for (let j = 0; j < hiddenSize; j++) {
            const row = [];
            for (let k = 0; k < inputSize; k++) {
                row.push(wasm.nn_get_weight(0, j, k));
            }
            w0.push(row);
            b0.push(wasm.nn_get_bias(0, j));
        }

        const w1 = [];
        const b1 = [];
        for (let j = 0; j < outputSize; j++) {
            const row = [];
            for (let k = 0; k < hiddenSize; k++) {
                row.push(wasm.nn_get_weight(1, j, k));
            }
            w1.push(row);
            b1.push(wasm.nn_get_bias(1, j));
        }

        this.weights = [w0, w1];
        this.biases = [b0, b1];
    }

    _pushWeightsToWasm() {
        const wasm = window._wasmNN;
        const inputSize = this.config.architecture.inputLayer.units;
        const hiddenSize = this.config.architecture.hiddenLayers[0].units;
        const outputSize = this.config.architecture.outputLayer.units;

        for (let j = 0; j < hiddenSize; j++) {
            for (let k = 0; k < inputSize; k++) {
                wasm.nn_set_weight(0, j, k, this.weights[0][j][k]);
            }
            wasm.nn_set_bias(0, j, this.biases[0][j]);
        }

        for (let j = 0; j < outputSize; j++) {
            for (let k = 0; k < hiddenSize; k++) {
                wasm.nn_set_weight(1, j, k, this.weights[1][j][k]);
            }
            wasm.nn_set_bias(1, j, this.biases[1][j]);
        }

        wasm.nn_reset_adam();
    }

    // ── Forward pass ───────────────────────────────────────────────
    forward(input) {
        if (!input || !Array.isArray(input)) throw new Error('Input must be an array');
        const wasm = window._wasmNN;
        const helpers = window._wasmNNHelpers;
        helpers.uploadPredictInput(wasm, input);
        return [wasm.nn_predict()];
    }

    predict(x) {
        if (Array.isArray(x[0])) {
            return x.map(sample => this.forward(sample));
        }
        return this.forward(x);
    }

    // ── Training (delegated to a Web Worker) ───────────────────────
    async train(xTrain, yTrain, config) {
        if (!Array.isArray(xTrain) || !Array.isArray(yTrain)) throw new Error('Training data must be arrays');
        if (xTrain.length === 0 || yTrain.length === 0) throw new Error('Training data cannot be empty');
        if (xTrain.length !== yTrain.length) throw new Error('xTrain and yTrain must have the same length');

        if (typeof Worker === 'undefined') {
            throw new Error(
                'NeuralNetwork.train(): Web Workers are not available in this environment.'
            );
        }
        if (typeof window._nnWorkerSource !== 'string' || window._nnWorkerSource.length === 0) {
            throw new Error(
                'NeuralNetwork.train(): Worker source missing. ' +
                'Make sure js/nn-worker-embed.js is loaded.'
            );
        }
        if (typeof window._nnWasmBase64 !== 'string' || window._nnWasmBase64.length === 0) {
            throw new Error(
                'NeuralNetwork.train(): nn.wasm base64 missing. ' +
                'Make sure js/nn-wasm-embed.js is loaded.'
            );
        }

        const {
            epochs = 100,
            batchSize = 32,
            learningRate = 0.001,
            onEpochEnd = null,
            adamBeta1 = 0.9,
            adamBeta2 = 0.999,
            adamEpsilon = 1e-8
        } = config;

        const inputSize = this.config.architecture.inputLayer.units;
        const hiddenSize = this.config.architecture.hiddenLayers[0].units;
        const outputSize = this.config.architecture.outputLayer.units;
        const nSamples = xTrain.length;

        // Flatten features/labels into Float64Arrays for zero-copy transfer
        // (the underlying ArrayBuffers are transferred to the worker, which
        // avoids a structured-clone memcpy for big training sets).
        const featuresFlat = new Float64Array(nSamples * inputSize);
        for (let i = 0; i < nSamples; i++) {
            const row = xTrain[i];
            const base = i * inputSize;
            for (let j = 0; j < inputSize; j++) featuresFlat[base + j] = row[j];
        }
        const labelsFlat = new Float64Array(nSamples);
        for (let i = 0; i < nSamples; i++) {
            labelsFlat[i] = Array.isArray(yTrain[i]) ? yTrain[i][0] : yTrain[i];
        }

        // Build the Worker source by prepending the nn.wasm base64 as a
        // `const NN_WASM_B64 = "...";` line. The worker uses it to
        // instantiate WASM without needing a network fetch.
        const bootstrap =
            'const NN_WASM_B64 = ' + JSON.stringify(window._nnWasmBase64) + ';\n' +
            window._nnWorkerSource;
        const blob = new Blob([bootstrap], { type: 'application/javascript' });
        const blobUrl = URL.createObjectURL(blob);
        const worker = new Worker(blobUrl);

        const history = { loss: [], accuracy: [] };
        const t0 = performance.now();

        console.log(
            `[WASM worker] Training ${nSamples} samples, ${inputSize} features, ${epochs} epochs`
        );

        try {
            await new Promise((resolve, reject) => {
                worker.onerror = (ev) => {
                    reject(new Error(ev.message || 'Worker error'));
                };
                worker.onmessage = async (e) => {
                    const msg = e.data;
                    if (!msg || !msg.type) return;
                    try {
                        if (msg.type === 'epoch') {
                            history.loss.push(msg.loss);
                            history.accuracy.push(msg.accuracy);
                            if (onEpochEnd) {
                                await onEpochEnd({
                                    epoch: msg.epoch,
                                    loss: msg.loss,
                                    accuracy: msg.accuracy
                                });
                            }
                        } else if (msg.type === 'done') {
                            this.weights = msg.weights;
                            this.biases = msg.biases;
                            // Mirror trained weights into the main-thread WASM
                            // instance so forward()/predict() pick them up.
                            this._pushWeightsToWasm();
                            resolve();
                        } else if (msg.type === 'error') {
                            reject(new Error(msg.message || 'Worker error'));
                        }
                        // 'ready' is informational; no action required.
                    } catch (err) {
                        reject(err);
                    }
                };

                worker.postMessage({
                    type: 'train',
                    nSamples,
                    inputSize,
                    hiddenSize,
                    outputSize,
                    featuresFlat,
                    labelsFlat,
                    epochs,
                    batchSize,
                    learningRate,
                    adamBeta1,
                    adamBeta2,
                    adamEpsilon
                }, [featuresFlat.buffer, labelsFlat.buffer]);
            });
        } finally {
            worker.terminate();
            URL.revokeObjectURL(blobUrl);
        }

        const elapsed = ((performance.now() - t0) / 1000).toFixed(2);
        console.log(`[WASM worker] Training complete in ${elapsed}s`);

        return history;
    }

    // ── Persistence ────────────────────────────────────────────────
    save() {
        this._syncWeightsFromWasm();
        return {
            config: this.config,
            weights: this.weights,
            biases: this.biases,
            layers: this.layers
        };
    }

    static load(modelData) {
        const network = new NeuralNetwork(modelData.config);
        network.weights = modelData.weights;
        network.biases = modelData.biases;
        network.layers = modelData.layers;
        network._pushWeightsToWasm();
        return network;
    }
}

window.NeuralNetwork = NeuralNetwork;
