/**
 * Custom Neural Network Library
 * Uses WebAssembly for training/inference when available, with pure JS fallback.
 */

class NeuralNetwork {
    constructor(config) {
        this.config = config;
        this.layers = [];
        this.weights = [];
        this.biases = [];
        this.optimizerState = null;
        this.useWasm = this._canUseWasm();
        this.initializeNetwork();
    }

    _canUseWasm() {
        if (!window._wasmNN) return false;
        const arch = this.config.architecture;
        if (!arch || !arch.hiddenLayers) return false;
        if (arch.hiddenLayers.length !== 1) return false;
        if (arch.hiddenLayers[0].activation !== 'relu') return false;
        if (arch.outputLayer.units !== 1) return false;
        if (arch.outputLayer.activation !== 'sigmoid') return false;
        return true;
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

        if (this.useWasm) {
            this._initWasm();
        } else {
            this._initJS();
        }
    }

    // ── WASM initialization ─────────────────────────────────────────
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

        // WASM was already initialized in the constructor; just copy the loaded weights
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

    // ── JS initialization (fallback) ────────────────────────────────
    _initJS() {
        for (let i = 0; i < this.layers.length - 1; i++) {
            const currentLayer = this.layers[i];
            const nextLayer = this.layers[i + 1];
            const limit = Math.sqrt(6 / (currentLayer.units + nextLayer.units));
            const weights = [];
            const biases = [];

            for (let j = 0; j < nextLayer.units; j++) {
                const neuronWeights = [];
                for (let k = 0; k < currentLayer.units; k++) {
                    neuronWeights.push((Math.random() * 2 - 1) * limit);
                }
                weights.push(neuronWeights);
                biases.push(0);
            }

            this.weights.push(weights);
            this.biases.push(biases);
        }
    }

    // ── Activation functions ────────────────────────────────────────
    static relu(x) { return Math.max(0, x); }
    static sigmoid(x) { return 1 / (1 + Math.exp(-x)); }
    static tanh(x) { return Math.tanh(x); }

    static softmax(x) {
        if (!Array.isArray(x) || x.length === 0) return x;
        let max = x[0];
        for (let i = 1; i < x.length; i++) { if (x[i] > max) max = x[i]; }
        const exp = x.map(val => Math.exp(val - max));
        const sum = exp.reduce((a, b) => a + b, 0);
        return exp.map(val => val / sum);
    }

    static linear(x) { return x; }
    static elu(x, alpha = 1.0) { return x > 0 ? x : alpha * (Math.exp(x) - 1); }
    static selu(x, alpha = 1.67326, scale = 1.0507) { return scale * (x > 0 ? x : alpha * (Math.exp(x) - 1)); }
    static swish(x) { return x * this.sigmoid(x); }

    static activationDerivative(activation, z) {
        if (activation === 'relu') {
            if (Array.isArray(z)) { return z.map(v => v > 0 ? 1 : 0); }
            return z > 0 ? 1 : 0;
        }
        if (activation === 'sigmoid') {
            if (Array.isArray(z)) { return z.map(v => { const s = NeuralNetwork.sigmoid(v); return s * (1 - s); }); }
            const s = NeuralNetwork.sigmoid(z);
            return s * (1 - s);
        }
        if (activation === 'tanh') {
            if (Array.isArray(z)) { return z.map(v => { const t = Math.tanh(v); return 1 - t * t; }); }
            const t = Math.tanh(z);
            return 1 - t * t;
        }
        if (Array.isArray(z)) { return z.map(() => 1); }
        return 1;
    }

    applyActivation(x, activation) {
        switch (activation) {
            case 'relu': return Array.isArray(x) ? x.map(val => NeuralNetwork.relu(val)) : NeuralNetwork.relu(x);
            case 'sigmoid': return Array.isArray(x) ? x.map(val => NeuralNetwork.sigmoid(val)) : NeuralNetwork.sigmoid(x);
            case 'tanh': return Array.isArray(x) ? x.map(val => NeuralNetwork.tanh(val)) : NeuralNetwork.tanh(x);
            case 'softmax': return NeuralNetwork.softmax(x);
            case 'linear': return x;
            case 'elu': return Array.isArray(x) ? x.map(val => NeuralNetwork.elu(val)) : NeuralNetwork.elu(x);
            case 'selu': return Array.isArray(x) ? x.map(val => NeuralNetwork.selu(val)) : NeuralNetwork.selu(x);
            case 'swish': return Array.isArray(x) ? x.map(val => NeuralNetwork.swish(val)) : NeuralNetwork.swish(x);
            default: return x;
        }
    }

    // ── Forward pass ────────────────────────────────────────────────
    forward(input) {
        if (!input || !Array.isArray(input)) throw new Error('Input must be an array');

        if (this.useWasm) {
            return this._forwardWasm(input);
        }
        return this._forwardJS(input);
    }

    _forwardWasm(input) {
        const wasm = window._wasmNN;
        const helpers = window._wasmNNHelpers;
        helpers.uploadPredictInput(wasm, input);
        const result = wasm.nn_predict();
        return [result];
    }

    _forwardJS(input) {
        let activations = [];
        for (let i = 0; i < input.length; i++) activations.push(input[i]);

        for (let i = 0; i < this.weights.length; i++) {
            const layerWeights = this.weights[i];
            const layerBiases = this.biases[i];
            const nextLayer = this.layers[i + 1];
            const newActivations = [];

            for (let j = 0; j < layerWeights.length; j++) {
                let sum = layerBiases[j];
                for (let k = 0; k < activations.length; k++) {
                    sum += activations[k] * layerWeights[j][k];
                }
                newActivations.push(sum);
            }

            activations = this.applyActivation(newActivations, nextLayer.activation);
        }
        return activations;
    }

    forwardWithCache(input) {
        if (!input || !Array.isArray(input)) throw new Error('Input must be an array');

        const layerInputs = [];
        const layerZs = [];
        const layerActivations = [];

        let activations = [];
        for (let i = 0; i < input.length; i++) activations.push(input[i]);
        layerInputs.push(activations);

        for (let i = 0; i < this.weights.length; i++) {
            const layerWeights = this.weights[i];
            const layerBiases = this.biases[i];
            const nextLayer = this.layers[i + 1];
            const z = [];
            for (let j = 0; j < layerWeights.length; j++) {
                let sum = layerBiases[j];
                for (let k = 0; k < activations.length; k++) {
                    sum += activations[k] * layerWeights[j][k];
                }
                z.push(sum);
            }
            const aNext = this.applyActivation(z, nextLayer.activation);
            layerZs.push(z);
            layerActivations.push(aNext);
            activations = aNext;
            if (i < this.weights.length - 1) layerInputs.push(activations);
        }
        return { output: activations, layerInputs, layerZs, layerActivations };
    }

    // ── Optimizer state (JS fallback) ───────────────────────────────
    initializeOptimizerState() {
        const mW = [], vW = [], mB = [], vB = [];
        for (let wi = 0; wi < this.weights.length; wi++) {
            const layerW = this.weights[wi];
            const mWL = [], vWL = [], mBL = [], vBL = [];
            for (let r = 0; r < layerW.length; r++) {
                const mWR = [], vWR = [];
                for (let c = 0; c < layerW[r].length; c++) { mWR.push(0); vWR.push(0); }
                mWL.push(mWR); vWL.push(vWR); mBL.push(0); vBL.push(0);
            }
            mW.push(mWL); vW.push(vWL); mB.push(mBL); vB.push(vBL);
        }
        this.optimizerState = { t: 0, mW, vW, mB, vB };
    }

    applyAdamUpdate(gradWeights, gradBiases, learningRate, invBatch, beta1, beta2, epsilon) {
        if (!this.optimizerState) this.initializeOptimizerState();

        this.optimizerState.t += 1;
        const t = this.optimizerState.t;
        const biasCorr1 = 1 - Math.pow(beta1, t);
        const biasCorr2 = 1 - Math.pow(beta2, t);
        const lrT = learningRate * Math.sqrt(biasCorr2) / (biasCorr1 || 1e-12);

        for (let wi = 0; wi < this.weights.length; wi++) {
            for (let r = 0; r < this.weights[wi].length; r++) {
                for (let c = 0; c < this.weights[wi][r].length; c++) {
                    const g = gradWeights[wi][r][c] * invBatch;
                    this.optimizerState.mW[wi][r][c] = beta1 * this.optimizerState.mW[wi][r][c] + (1 - beta1) * g;
                    this.optimizerState.vW[wi][r][c] = beta2 * this.optimizerState.vW[wi][r][c] + (1 - beta2) * (g * g);
                    this.weights[wi][r][c] -= lrT * (this.optimizerState.mW[wi][r][c] / (Math.sqrt(this.optimizerState.vW[wi][r][c]) + epsilon));
                }
                const gb = gradBiases[wi][r] * invBatch;
                this.optimizerState.mB[wi][r] = beta1 * this.optimizerState.mB[wi][r] + (1 - beta1) * gb;
                this.optimizerState.vB[wi][r] = beta2 * this.optimizerState.vB[wi][r] + (1 - beta2) * (gb * gb);
                this.biases[wi][r] -= lrT * (this.optimizerState.mB[wi][r] / (Math.sqrt(this.optimizerState.vB[wi][r]) + epsilon));
            }
        }
    }

    // ── Loss functions ──────────────────────────────────────────────
    static binaryCrossentropy(yTrue, yPred) {
        if (typeof yTrue !== 'number' || typeof yPred !== 'number') return NaN;
        if (isNaN(yTrue) || isNaN(yPred)) return NaN;
        const epsilon = 1e-15;
        const clipped = Math.max(epsilon, Math.min(1 - epsilon, yPred));
        return -(yTrue * Math.log(clipped) + (1 - yTrue) * Math.log(1 - clipped));
    }

    static categoricalCrossentropy(yTrue, yPred) {
        const epsilon = 1e-15;
        let loss = 0;
        for (let i = 0; i < yTrue.length; i++) {
            loss -= yTrue[i] * Math.log(Math.max(epsilon, Math.min(1 - epsilon, yPred[i])));
        }
        return loss;
    }

    static meanSquaredError(yTrue, yPred) { return Math.pow(yTrue - yPred, 2); }

    calculateLoss(yTrue, yPred) {
        const predValue = Array.isArray(yPred) ? yPred[0] : yPred;
        const trueValue = Array.isArray(yTrue) ? yTrue[0] : yTrue;
        const loss = this.config.trainingConfig.loss;
        if (loss === 'binaryCrossentropy') return NeuralNetwork.binaryCrossentropy(trueValue, predValue);
        if (loss === 'categoricalCrossentropy') return NeuralNetwork.categoricalCrossentropy(yTrue, yPred);
        return NeuralNetwork.meanSquaredError(trueValue, predValue);
    }

    calculateAccuracy(yTrue, yPred) {
        const predValue = Array.isArray(yPred) ? yPred[0] : yPred;
        const trueValue = Array.isArray(yTrue) ? yTrue[0] : yTrue;
        if (Array.isArray(yPred) && yPred.length > 1) {
            let maxPred = yPred[0], maxPredIdx = 0;
            for (let i = 1; i < yPred.length; i++) { if (yPred[i] > maxPred) { maxPred = yPred[i]; maxPredIdx = i; } }
            let maxTrue = yTrue[0], maxTrueIdx = 0;
            for (let i = 1; i < yTrue.length; i++) { if (yTrue[i] > maxTrue) { maxTrue = yTrue[i]; maxTrueIdx = i; } }
            return maxPredIdx === maxTrueIdx ? 1 : 0;
        }
        return (predValue > 0.5 ? 1 : 0) === trueValue ? 1 : 0;
    }

    // ── Training (dispatcher) ───────────────────────────────────────
    async train(xTrain, yTrain, xVal, yVal, config) {
        if (!Array.isArray(xTrain) || !Array.isArray(yTrain)) throw new Error('Training data must be arrays');
        if (xTrain.length === 0 || yTrain.length === 0) throw new Error('Training data cannot be empty');
        if (xTrain.length !== yTrain.length) throw new Error('xTrain and yTrain must have the same length');

        if (this.useWasm) {
            return this._trainWasm(xTrain, yTrain, xVal, yVal, config);
        }
        return this._trainJS(xTrain, yTrain, xVal, yVal, config);
    }

    // ── WASM training ───────────────────────────────────────────────
    async _trainWasm(xTrain, yTrain, xVal, yVal, config) {
        const wasm = window._wasmNN;
        const helpers = window._wasmNNHelpers;
        const nSamples = xTrain.length;
        const inputSize = this.config.architecture.inputLayer.units;

        const {
            epochs = 100,
            batchSize = 32,
            learningRate = 0.001,
            earlyStopping = false,
            patience = 10,
            onEpochEnd = null,
            adamBeta1 = 0.9,
            adamBeta2 = 0.999,
            adamEpsilon = 1e-8
        } = config;

        // Upload training data to WASM memory (bulk transfer)
        wasm.nn_alloc_training_data(nSamples);
        helpers.uploadFeatures(wasm, xTrain, inputSize);
        helpers.uploadLabels(wasm, yTrain);

        const history = { loss: [], accuracy: [], valLoss: [], valAccuracy: [] };
        let bestLoss = Infinity;
        let patienceCounter = 0;

        console.log(`[WASM] Training ${nSamples} samples, ${inputSize} features, ${epochs} epochs`);
        const t0 = performance.now();

        for (let epoch = 0; epoch < epochs; epoch++) {
            // Entire epoch runs in WASM (no JS<->WASM crossing per sample)
            wasm.nn_train_epoch(batchSize, learningRate, adamBeta1, adamBeta2, adamEpsilon);

            const loss = wasm.nn_get_epoch_loss();
            const accuracy = wasm.nn_get_epoch_accuracy();

            // Validation (WASM forward pass per validation sample)
            let valLoss = null;
            let valAccuracy = null;
            const hasValidation = Array.isArray(xVal) && Array.isArray(yVal) && xVal.length > 0;
            if (hasValidation) {
                let vLossSum = 0;
                let vAccSum = 0;
                for (let i = 0; i < xVal.length; i++) {
                    helpers.uploadPredictInput(wasm, xVal[i]);
                    const pred = wasm.nn_predict();
                    const trueVal = Array.isArray(yVal[i]) ? yVal[i][0] : yVal[i];
                    const eps = 1e-15;
                    const clipped = Math.max(eps, Math.min(1 - eps, pred));
                    vLossSum += -(trueVal * Math.log(clipped) + (1 - trueVal) * Math.log(1 - clipped));
                    vAccSum += ((pred > 0.5 ? 1 : 0) === trueVal) ? 1 : 0;
                }
                valLoss = vLossSum / xVal.length;
                valAccuracy = vAccSum / xVal.length;
            }

            history.loss.push(loss);
            history.accuracy.push(accuracy);
            history.valLoss.push(valLoss);
            history.valAccuracy.push(valAccuracy);

            // Early stopping
            if (earlyStopping) {
                const metricLoss = hasValidation ? valLoss : loss;
                if (metricLoss < bestLoss) {
                    bestLoss = metricLoss;
                    patienceCounter = 0;
                } else {
                    patienceCounter++;
                    if (patienceCounter >= patience) {
                        console.log(`[WASM] Early stopping at epoch ${epoch + 1}`);
                        break;
                    }
                }
            }

            if (onEpochEnd) {
                await onEpochEnd({
                    epoch: epoch + 1,
                    loss,
                    accuracy,
                    valLoss,
                    valAccuracy
                });
            }

            // Yield to UI thread every epoch
            await new Promise(resolve => setTimeout(resolve, 0));
        }

        const elapsed = ((performance.now() - t0) / 1000).toFixed(2);
        console.log(`[WASM] Training complete in ${elapsed}s`);

        // Sync final weights back to JS arrays for model export
        this._syncWeightsFromWasm();
        return history;
    }

    // ── JS training (fallback) ──────────────────────────────────────
    async _trainJS(xTrain, yTrain, xVal, yVal, config) {
        const {
            epochs = 100,
            batchSize = 32,
            learningRate = 0.001,
            earlyStopping = false,
            patience = 10,
            onEpochEnd = null,
            adamBeta1 = 0.9,
            adamBeta2 = 0.999,
            adamEpsilon = 1e-8
        } = config;

        console.log('[JS] Training with pure JavaScript fallback');

        const history = { loss: [], accuracy: [], valLoss: [], valAccuracy: [] };
        let bestLoss = Infinity;
        let patienceCounter = 0;

        for (let epoch = 0; epoch < epochs; epoch++) {
            const indices = [];
            for (let i = 0; i < xTrain.length; i++) indices.push(i);
            const shuffledIndices = this.shuffleArray(indices);

            let epochLoss = 0;
            let epochAccuracy = 0;
            let batchCount = 0;

            for (let i = 0; i < xTrain.length; i += batchSize) {
                const batchIndices = shuffledIndices.slice(i, i + batchSize);
                const batchX = batchIndices.map(idx => xTrain[idx]);
                const batchY = batchIndices.map(idx => yTrain[idx]);

                let batchLoss = 0;
                let batchAccuracy = 0;

                const gradWeights = [];
                const gradBiases = [];
                for (let wi = 0; wi < this.weights.length; wi++) {
                    const layerW = this.weights[wi];
                    const gwLayer = [];
                    const gbLayer = [];
                    for (let r = 0; r < layerW.length; r++) {
                        gwLayer.push(new Array(layerW[r].length).fill(0));
                        gbLayer.push(0);
                    }
                    gradWeights.push(gwLayer);
                    gradBiases.push(gbLayer);
                }

                for (let j = 0; j < batchX.length; j++) {
                    const cache = this.forwardWithCache(batchX[j]);
                    const prediction = cache.output;
                    batchLoss += this.calculateLoss(batchY[j], prediction);
                    batchAccuracy += this.calculateAccuracy(batchY[j], prediction);

                    const numLayers = this.weights.length;
                    const deltas = [];
                    for (let di = 0; di < numLayers; di++) {
                        deltas.push(new Array(this.weights[di].length).fill(0));
                    }

                    const lastIdx = numLayers - 1;
                    const outputActivation = this.layers[this.layers.length - 1].activation;
                    const yTrueVal = Array.isArray(batchY[j]) ? batchY[j][0] : batchY[j];
                    const yPredVal = Array.isArray(prediction) ? prediction[0] : prediction;

                    if (outputActivation === 'sigmoid' && this.config.trainingConfig.loss === 'binaryCrossentropy') {
                        deltas[lastIdx][0] = yPredVal - yTrueVal;
                    } else {
                        const zLast = cache.layerZs[lastIdx];
                        const actDer = NeuralNetwork.activationDerivative(outputActivation, zLast);
                        for (let ii = 0; ii < deltas[lastIdx].length; ii++) {
                            const dLossDa = Array.isArray(batchY[j]) ? (prediction[ii] - batchY[j][ii]) : (yPredVal - yTrueVal);
                            deltas[lastIdx][ii] = dLossDa * actDer[ii];
                        }
                    }

                    for (let li = lastIdx - 1; li >= 0; li--) {
                        const currentWeights = this.weights[li + 1];
                        const currentDelta = deltas[li + 1];
                        const prevZ = cache.layerZs[li];
                        const prevActDer = NeuralNetwork.activationDerivative(this.layers[li + 1].activation, prevZ);
                        for (let k = 0; k < prevActDer.length; k++) {
                            let sumVal = 0;
                            for (let m = 0; m < currentWeights.length; m++) {
                                sumVal += currentWeights[m][k] * currentDelta[m];
                            }
                            deltas[li][k] = sumVal * prevActDer[k];
                        }
                    }

                    for (let gi = 0; gi < this.weights.length; gi++) {
                        const aPrev = (gi === 0) ? cache.layerInputs[0] : cache.layerActivations[gi - 1];
                        for (let r = 0; r < this.weights[gi].length; r++) {
                            for (let c = 0; c < this.weights[gi][r].length; c++) {
                                gradWeights[gi][r][c] += deltas[gi][r] * aPrev[c];
                            }
                            gradBiases[gi][r] += deltas[gi][r];
                        }
                    }
                }

                const invBatch = batchX.length > 0 ? (1 / batchX.length) : 1;
                this.applyAdamUpdate(gradWeights, gradBiases, learningRate, invBatch, adamBeta1, adamBeta2, adamEpsilon);

                epochLoss += batchLoss / (batchX.length > 0 ? batchX.length : 1);
                epochAccuracy += batchAccuracy / (batchX.length > 0 ? batchX.length : 1);
                batchCount++;
            }

            const avgLoss = epochLoss / batchCount;
            const avgAccuracy = epochAccuracy / batchCount;

            let valLoss = null;
            let valAccuracy = null;
            const hasValidation = Array.isArray(xVal) && Array.isArray(yVal) && xVal.length > 0;
            if (hasValidation) {
                let vLossSum = 0;
                let vAccSum = 0;
                for (let i = 0; i < xVal.length; i++) {
                    const prediction = this.forward(xVal[i]);
                    vLossSum += this.calculateLoss(yVal[i], prediction);
                    vAccSum += this.calculateAccuracy(yVal[i], prediction);
                }
                valLoss = vLossSum / xVal.length;
                valAccuracy = vAccSum / xVal.length;
            }

            history.loss.push(avgLoss);
            history.accuracy.push(avgAccuracy);
            history.valLoss.push(valLoss);
            history.valAccuracy.push(valAccuracy);

            if (earlyStopping) {
                const metricLoss = hasValidation ? valLoss : avgLoss;
                if (metricLoss < bestLoss) {
                    bestLoss = metricLoss;
                    patienceCounter = 0;
                } else {
                    patienceCounter++;
                    if (patienceCounter >= patience) {
                        console.log(`Early stopping at epoch ${epoch + 1}`);
                        break;
                    }
                }
            }

            if (onEpochEnd) {
                await onEpochEnd({
                    epoch: epoch + 1,
                    loss: avgLoss,
                    accuracy: avgAccuracy,
                    valLoss,
                    valAccuracy
                });
            }

            await new Promise(resolve => setTimeout(resolve, 10));
        }

        return history;
    }

    // ── Utilities ───────────────────────────────────────────────────
    shuffleArray(array) {
        if (!Array.isArray(array)) throw new Error('shuffleArray requires an array input');
        const shuffled = array.slice();
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    predict(x) {
        if (Array.isArray(x[0])) {
            return x.map(sample => this.forward(sample));
        }
        return this.forward(x);
    }

    save() {
        if (this.useWasm) this._syncWeightsFromWasm();
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

        if (network.useWasm) {
            network._pushWeightsToWasm();
        }
        return network;
    }
}

window.NeuralNetwork = NeuralNetwork;
