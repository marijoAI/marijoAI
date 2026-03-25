/**
 * WebAssembly Neural Network Loader
 * Loads the compiled WASM module and exposes it as window._wasmNN
 * Falls back gracefully if WASM is unavailable.
 */

(function () {
    'use strict';

    const WASM_PATH = 'wasm/nn.wasm';

    async function loadWasm() {
        if (typeof WebAssembly === 'undefined') {
            console.warn('[WASM] WebAssembly not supported in this browser. Using JS fallback.');
            return null;
        }

        try {
            let wasmModule;

            if (typeof WebAssembly.instantiateStreaming === 'function') {
                const response = fetch(WASM_PATH);
                wasmModule = await WebAssembly.instantiateStreaming(response, {
                    env: { abort: () => { throw new Error('WASM abort'); } }
                });
            } else {
                const response = await fetch(WASM_PATH);
                const bytes = await response.arrayBuffer();
                wasmModule = await WebAssembly.instantiate(bytes, {
                    env: { abort: () => { throw new Error('WASM abort'); } }
                });
            }

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
                    console.warn(`[WASM] Missing export: ${fn}. Using JS fallback.`);
                    return null;
                }
            }

            console.log('[WASM] Neural network module loaded successfully (' +
                (exports.memory.buffer.byteLength / 1024).toFixed(0) + ' KB initial memory)');

            return exports;
        } catch (err) {
            console.warn('[WASM] Failed to load module:', err.message, '- Using JS fallback.');
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
