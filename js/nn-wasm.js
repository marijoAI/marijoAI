/**
 * WebAssembly Neural Network Loader.
 *
 * Loads the compiled WASM module and exposes it as `window._wasmNN`.
 * The binary is embedded as base64 in `js/nn-wasm-embed.js` so loading works
 * identically under `http(s)://` and `file://`. A `fetch()` fallback remains
 * only for environments where the embed script is missing (e.g. developing
 * against a rebuilt wasm without re-running the embed step).
 *
 * Consumers must `await window._wasmNNReady` before touching `_wasmNN` — if
 * loading fails the promise resolves to `false` and `_wasmNN` stays `null`,
 * which surfaces as a clear error when a NeuralNetwork is constructed.
 */

(function () {
    'use strict';

    const WASM_PATH = 'wasm/nn.wasm';

    function base64ToBytes(b64) {
        const bin = atob(b64);
        const len = bin.length;
        const out = new Uint8Array(len);
        for (let i = 0; i < len; i++) out[i] = bin.charCodeAt(i);
        return out;
    }

    async function loadWasm() {
        if (typeof WebAssembly === 'undefined') {
            console.error('[WASM] WebAssembly is not supported in this browser.');
            return null;
        }

        const imports = { env: { abort: () => { throw new Error('WASM abort'); } } };
        let wasmModule = null;

        // 1. Preferred: instantiate from embedded base64 bytes (works under file://).
        if (typeof window._nnWasmBase64 === 'string' && window._nnWasmBase64.length > 0) {
            try {
                const bytes = base64ToBytes(window._nnWasmBase64);
                wasmModule = await WebAssembly.instantiate(bytes, imports);
            } catch (err) {
                console.warn('[WASM] Embedded nn.wasm failed to instantiate:',
                    err && err.message);
            }
        }

        // 2. Fallback: fetch the binary (requires http(s)).
        if (wasmModule == null) {
            try {
                if (typeof WebAssembly.instantiateStreaming === 'function') {
                    wasmModule = await WebAssembly.instantiateStreaming(
                        fetch(WASM_PATH), imports
                    );
                } else {
                    const response = await fetch(WASM_PATH);
                    const bytes = await response.arrayBuffer();
                    wasmModule = await WebAssembly.instantiate(bytes, imports);
                }
            } catch (err) {
                console.error('[WASM] Failed to load nn.wasm:',
                    err && err.message);
                return null;
            }
        }

        try {
            const exports = wasmModule.instance.exports;

            // Validate that required functions exist
            const required = [
                'nn_init', 'nn_alloc_training_data', 'nn_get_x_ptr', 'nn_get_y_ptr',
                'nn_train_epoch', 'nn_get_epoch_loss', 'nn_get_epoch_accuracy',
                'nn_predict', 'nn_set_predict_feature', 'nn_get_pred_input_ptr',
                'nn_get_weight', 'nn_set_weight', 'nn_get_bias', 'nn_set_bias',
                'nn_get_input_size', 'nn_get_hidden_size', 'nn_get_output_size',
                'nn_set_seed', 'nn_reset_adam', 'memory'
            ];

            for (const fn of required) {
                if (!exports[fn]) {
                    console.error(`[WASM] Missing export: ${fn}.`);
                    return null;
                }
            }

            console.log('[WASM] Neural network module loaded successfully (' +
                (exports.memory.buffer.byteLength / 1024).toFixed(0) + ' KB initial memory)');

            return exports;
        } catch (err) {
            console.error('[WASM] Failed to instantiate module:', err && err.message);
            return null;
        }
    }

    /**
     * Helper: get a Float64Array view into WASM memory.
     * IMPORTANT: this view is invalidated when memory grows.
     * Always call this after any WASM function that may allocate.
     */
    function getF64View(wasmExports) {
        return new Float64Array(wasmExports.memory.buffer);
    }

    /**
     * Copy a 2D JS array of features into WASM memory (flat row-major layout).
     * @param {object} wasm - WASM exports
     * @param {number[][]} features - array of feature vectors
     * @param {number} inputSize - features per sample
     */
    function uploadFeatures(wasm, features, inputSize) {
        const xPtr = wasm.nn_get_x_ptr();
        const f64 = getF64View(wasm);
        const baseIdx = xPtr >>> 3; // byte offset to f64 index
        for (let i = 0; i < features.length; i++) {
            const rowBase = baseIdx + i * inputSize;
            const row = features[i];
            for (let j = 0; j < inputSize; j++) {
                f64[rowBase + j] = row[j];
            }
        }
    }

    /**
     * Copy a 1D JS array of labels into WASM memory.
     */
    function uploadLabels(wasm, labels) {
        const yPtr = wasm.nn_get_y_ptr();
        const f64 = getF64View(wasm);
        const baseIdx = yPtr >>> 3;
        for (let i = 0; i < labels.length; i++) {
            f64[baseIdx + i] = Array.isArray(labels[i]) ? labels[i][0] : labels[i];
        }
    }

    /**
     * Write a single feature vector to the prediction input buffer.
     */
    function uploadPredictInput(wasm, input) {
        const ptr = wasm.nn_get_pred_input_ptr();
        const f64 = getF64View(wasm);
        const baseIdx = ptr >>> 3;
        for (let i = 0; i < input.length; i++) {
            f64[baseIdx + i] = input[i];
        }
    }

    // Expose helpers alongside the WASM module
    window._wasmNNHelpers = {
        getF64View,
        uploadFeatures,
        uploadLabels,
        uploadPredictInput
    };

    // Load WASM module on page load. Expose a promise so callers can await readiness.
    window._wasmNNReady = loadWasm().then(function (exports) {
        window._wasmNN = exports;
        if (exports) {
            console.log('[WASM] Ready for accelerated training.');
        }
        return !!exports;
    });
})();
