/**
 * Custom Neural Network Library
 * A lightweight implementation to replace TensorFlow.js
 */

class NeuralNetwork {
    constructor(config) {
        this.config = config;
        this.layers = [];
        this.weights = [];
        this.biases = [];
        this.optimizerState = null; // Adam/RMSProp moment buffers
        this.initializeNetwork();
    }

    initializeNetwork() {
        const { architecture } = this.config;
        
        // Initialize input layer
        this.layers.push({
            type: 'input',
            units: architecture.inputLayer.units,
            activation: 'linear'
        });

        // Initialize hidden layers
        architecture.hiddenLayers.forEach(layer => {
            this.layers.push({
                type: 'hidden',
                units: layer.units,
                activation: layer.activation
            });
        });

        // Initialize output layer
        this.layers.push({
            type: 'output',
            units: architecture.outputLayer.units,
            activation: architecture.outputLayer.activation
        });

        // Initialize weights and biases
        for (let i = 0; i < this.layers.length - 1; i++) {
            const currentLayer = this.layers[i];
            const nextLayer = this.layers[i + 1];
            
            // Xavier/Glorot initialization
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

    // Activation functions
    static relu(x) {
        return Math.max(0, x);
    }

    static sigmoid(x) {
        return 1 / (1 + Math.exp(-x));
    }

    static tanh(x) {
        return Math.tanh(x);
    }

    static softmax(x) {
        if (!Array.isArray(x) || x.length === 0) {
            return x;
        }
        let max = x[0];
        for (let i = 1; i < x.length; i++) {
            if (x[i] > max) max = x[i];
        }
        const exp = x.map(val => Math.exp(val - max));
        const sum = exp.reduce((a, b) => a + b, 0);
        return exp.map(val => val / sum);
    }

    static linear(x) {
        return x;
    }

    static elu(x, alpha = 1.0) {
        return x > 0 ? x : alpha * (Math.exp(x) - 1);
    }

    static selu(x, alpha = 1.67326, scale = 1.0507) {
        return scale * (x > 0 ? x : alpha * (Math.exp(x) - 1));
    }

    static swish(x) {
        return x * this.sigmoid(x);
    }

    // Activation derivatives (z is pre-activation)
    static activationDerivative(activation, z) {
        if (activation === 'relu') {
            // d/dz relu(z) = 1 if z>0 else 0
            if (Array.isArray(z)) {
                const out = [];
                for (let i = 0; i < z.length; i++) {
                    out.push(z[i] > 0 ? 1 : 0);
                }
                return out;
            }
            return z > 0 ? 1 : 0;
        }
        if (activation === 'sigmoid') {
            // sigmoid'(z) = s*(1-s)
            if (Array.isArray(z)) {
                const out = [];
                for (let i = 0; i < z.length; i++) {
                    const s = NeuralNetwork.sigmoid(z[i]);
                    out.push(s * (1 - s));
                }
                return out;
            }
            const s = NeuralNetwork.sigmoid(z);
            return s * (1 - s);
        }
        if (activation === 'tanh') {
            // tanh'(z) = 1 - tanh(z)^2
            if (Array.isArray(z)) {
                const out = [];
                for (let i = 0; i < z.length; i++) {
                    const t = Math.tanh(z[i]);
                    out.push(1 - t * t);
                }
                return out;
            }
            const t = Math.tanh(z);
            return 1 - t * t;
        }
        // linear and others default to 1
        if (Array.isArray(z)) {
            const out = [];
            for (let i = 0; i < z.length; i++) out.push(1);
            return out;
        }
        return 1;
    }

    // Apply activation function
    applyActivation(x, activation) {
        switch (activation) {
            case 'relu':
                return Array.isArray(x) ? x.map(val => NeuralNetwork.relu(val)) : NeuralNetwork.relu(x);
            case 'sigmoid':
                return Array.isArray(x) ? x.map(val => NeuralNetwork.sigmoid(val)) : NeuralNetwork.sigmoid(x);
            case 'tanh':
                return Array.isArray(x) ? x.map(val => NeuralNetwork.tanh(val)) : NeuralNetwork.tanh(x);
            case 'softmax':
                return NeuralNetwork.softmax(x);
            case 'linear':
                return x;
            case 'elu':
                return Array.isArray(x) ? x.map(val => NeuralNetwork.elu(val)) : NeuralNetwork.elu(x);
            case 'selu':
                return Array.isArray(x) ? x.map(val => NeuralNetwork.selu(val)) : NeuralNetwork.selu(x);
            case 'swish':
                return Array.isArray(x) ? x.map(val => NeuralNetwork.swish(val)) : NeuralNetwork.swish(x);
            default:
                return x;
        }
    }

    // Forward pass
    forward(input) {
        // Ensure input is an array
        if (!input || !Array.isArray(input)) {
            throw new Error('Input must be an array');
        }
        
        // Copy input array without spread operator
        let activations = [];
        for (let i = 0; i < input.length; i++) {
            activations.push(input[i]);
        }
        
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

    // Forward pass that caches intermediates for backprop
    forwardWithCache(input) {
        if (!input || !Array.isArray(input)) {
            throw new Error('Input must be an array');
        }

        const layerInputs = []; // a^l
        const layerZs = [];     // z^{l+1}
        const layerActivations = []; // a^{l+1}

        // a^0 is input
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
            if (i < this.weights.length - 1) {
                layerInputs.push(activations);
            }
        }
        return { output: activations, layerInputs, layerZs, layerActivations };
    }

    // Initialize optimizer moment buffers matching weights/biases shape
    initializeOptimizerState() {
        const mW = [];
        const vW = [];
        const mB = [];
        const vB = [];
        for (let wi = 0; wi < this.weights.length; wi++) {
            const layerW = this.weights[wi];
            const mWLayer = [];
            const vWLayer = [];
            const mBLayer = [];
            const vBLayer = [];
            for (let r = 0; r < layerW.length; r++) {
                const row = layerW[r];
                const mWRow = [];
                const vWRow = [];
                for (let c = 0; c < row.length; c++) {
                    mWRow.push(0);
                    vWRow.push(0);
                }
                mWLayer.push(mWRow);
                vWLayer.push(vWRow);
                mBLayer.push(0);
                vBLayer.push(0);
            }
            mW.push(mWLayer);
            vW.push(vWLayer);
            mB.push(mBLayer);
            vB.push(vBLayer);
        }
        this.optimizerState = { t: 0, mW, vW, mB, vB };
    }

    // Apply Adam optimizer update to weights and biases
    applyAdamUpdate(gradWeights, gradBiases, learningRate, invBatch, beta1, beta2, epsilon) {
        if (!this.optimizerState) {
            this.initializeOptimizerState();
        }

        // Increment time step
        this.optimizerState.t += 1;
        const t = this.optimizerState.t;
        const biasCorr1 = 1 - Math.pow(beta1, t);
        const biasCorr2 = 1 - Math.pow(beta2, t);
        const lrT = learningRate * Math.sqrt(biasCorr2) / (biasCorr1 || 1e-12);

        for (let wi = 0; wi < this.weights.length; wi++) {
            for (let r = 0; r < this.weights[wi].length; r++) {
                for (let c = 0; c < this.weights[wi][r].length; c++) {
                    const g = gradWeights[wi][r][c] * invBatch;
                    // First moment
                    this.optimizerState.mW[wi][r][c] = beta1 * this.optimizerState.mW[wi][r][c] + (1 - beta1) * g;
                    // Second moment
                    this.optimizerState.vW[wi][r][c] = beta2 * this.optimizerState.vW[wi][r][c] + (1 - beta2) * (g * g);
                    const mHat = this.optimizerState.mW[wi][r][c];
                    const vHat = this.optimizerState.vW[wi][r][c];
                    this.weights[wi][r][c] -= lrT * (mHat / (Math.sqrt(vHat) + epsilon));
                }
                const gb = gradBiases[wi][r] * invBatch;
                this.optimizerState.mB[wi][r] = beta1 * this.optimizerState.mB[wi][r] + (1 - beta1) * gb;
                this.optimizerState.vB[wi][r] = beta2 * this.optimizerState.vB[wi][r] + (1 - beta2) * (gb * gb);
                const mHatB = this.optimizerState.mB[wi][r];
                const vHatB = this.optimizerState.vB[wi][r];
                this.biases[wi][r] -= lrT * (mHatB / (Math.sqrt(vHatB) + epsilon));
            }
        }
    }

    // Loss functions
    static binaryCrossentropy(yTrue, yPred) {
        // Validate inputs
        if (typeof yTrue !== 'number' || typeof yPred !== 'number') {
            console.error('Invalid loss inputs - yTrue:', yTrue, 'yPred:', yPred);
            return NaN;
        }
        
        if (isNaN(yTrue) || isNaN(yPred)) {
            console.error('NaN detected in loss calculation - yTrue:', yTrue, 'yPred:', yPred);
            return NaN;
        }
        
        const epsilon = 1e-15;
        const clippedPred = Math.max(epsilon, Math.min(1 - epsilon, yPred));
        const loss = -(yTrue * Math.log(clippedPred) + (1 - yTrue) * Math.log(1 - clippedPred));
        
        if (isNaN(loss)) {
            console.error('NaN loss calculated - yTrue:', yTrue, 'yPred:', yPred, 'clippedPred:', clippedPred);
        }
        
        return loss;
    }

    static categoricalCrossentropy(yTrue, yPred) {
        const epsilon = 1e-15;
        let loss = 0;
        for (let i = 0; i < yTrue.length; i++) {
            const pred = Math.max(epsilon, Math.min(1 - epsilon, yPred[i]));
            loss -= yTrue[i] * Math.log(pred);
        }
        return loss;
    }

    static meanSquaredError(yTrue, yPred) {
        return Math.pow(yTrue - yPred, 2);
    }

    // Calculate loss
    calculateLoss(yTrue, yPred) {
        const { trainingConfig } = this.config;
        
        // Extract single value from array if needed
        const predValue = Array.isArray(yPred) ? yPred[0] : yPred;
        const trueValue = Array.isArray(yTrue) ? yTrue[0] : yTrue;
        
        if (trainingConfig.loss === 'binaryCrossentropy') {
            return NeuralNetwork.binaryCrossentropy(trueValue, predValue);
        } else if (trainingConfig.loss === 'categoricalCrossentropy') {
            return NeuralNetwork.categoricalCrossentropy(yTrue, yPred);
        } else if (trainingConfig.loss === 'meanSquaredError') {
            return NeuralNetwork.meanSquaredError(trueValue, predValue);
        }
        
        return NeuralNetwork.meanSquaredError(trueValue, predValue);
    }

    // Calculate accuracy
    calculateAccuracy(yTrue, yPred) {
        // Extract values from arrays if needed
        const predValue = Array.isArray(yPred) ? yPred[0] : yPred;
        const trueValue = Array.isArray(yTrue) ? yTrue[0] : yTrue;
        
        // Check if multi-class (array with length > 1) or binary
        if (Array.isArray(yPred) && yPred.length > 1) {
            // Multi-class classification
            let maxPred = yPred[0];
            let maxPredIdx = 0;
            for (let i = 1; i < yPred.length; i++) {
                if (yPred[i] > maxPred) {
                    maxPred = yPred[i];
                    maxPredIdx = i;
                }
            }
            
            let maxTrue = yTrue[0];
            let maxTrueIdx = 0;
            for (let i = 1; i < yTrue.length; i++) {
                if (yTrue[i] > maxTrue) {
                    maxTrue = yTrue[i];
                    maxTrueIdx = i;
                }
            }
            
            return maxPredIdx === maxTrueIdx ? 1 : 0;
        } else {
            // Binary classification (single output)
            const predicted = predValue > 0.5 ? 1 : 0;
            return predicted === trueValue ? 1 : 0;
        }
    }

    // Training function
    async train(xTrain, yTrain, xVal, yVal, config) {
        // Validate inputs
        if (!Array.isArray(xTrain) || !Array.isArray(yTrain)) {
            throw new Error('Training data must be arrays');
        }
        
        if (xTrain.length === 0 || yTrain.length === 0) {
            throw new Error('Training data cannot be empty');
        }
        
        if (xTrain.length !== yTrain.length) {
            throw new Error('xTrain and yTrain must have the same length');
        }
        
        const {
            epochs = 100,
            batchSize = 32,
            learningRate = 0.001,
            validationSplit = 0.2,
            earlyStopping = false,
            patience = 10,
            onEpochEnd = null,
            adamBeta1 = 0.9,
            adamBeta2 = 0.999,
            adamEpsilon = 1e-8
        } = config;
        
        // Always use Adam optimizer regardless of provided config
        const optimizerName = 'adam';

        const history = {
            loss: [],
            accuracy: [],
            valLoss: [],
            valAccuracy: []
        };

        // Track the best loss for early stopping. Prefer validation loss when available; otherwise use training loss.
        let bestEarlyStoppingLoss = Infinity;
        let patienceCounter = 0;

        for (let epoch = 0; epoch < epochs; epoch++) {
            // Shuffle training data
            const indices = [];
            for (let i = 0; i < xTrain.length; i++) {
                indices.push(i);
            }
            const shuffledIndices = this.shuffleArray(indices);
            
            let epochLoss = 0;
            let epochAccuracy = 0;
            let batchCount = 0;

            // Process in batches
            for (let i = 0; i < xTrain.length; i += batchSize) {
                const batchIndices = shuffledIndices.slice(i, i + batchSize);
                const batchX = batchIndices.map(idx => xTrain[idx]);
                const batchY = batchIndices.map(idx => yTrain[idx]);

                let batchLoss = 0;
                let batchAccuracy = 0;

                // Initialize batch gradients (zeros like weights/biases)
                const gradWeights = [];
                const gradBiases = [];
                for (let wi = 0; wi < this.weights.length; wi++) {
                    const layerW = this.weights[wi];
                    const gwLayer = [];
                    const gbLayer = [];
                    for (let r = 0; r < layerW.length; r++) {
                        const row = layerW[r];
                        const gwRow = [];
                        for (let c = 0; c < row.length; c++) {
                            gwRow.push(0);
                        }
                        gwLayer.push(gwRow);
                        gbLayer.push(0);
                    }
                    gradWeights.push(gwLayer);
                    gradBiases.push(gbLayer);
                }

                for (let j = 0; j < batchX.length; j++) {
                    const cache = this.forwardWithCache(batchX[j]);
                    const prediction = cache.output;
                    const loss = this.calculateLoss(batchY[j], prediction);
                    const accuracy = this.calculateAccuracy(batchY[j], prediction);
                    
                    // Debug first batch of first epoch
                    if (epoch === 0 && i === 0 && j === 0) {
                        console.log('First prediction - Input:', batchX[j]);
                        console.log('First prediction - Output:', prediction);
                        console.log('First prediction - True label:', batchY[j]);
                        console.log('First prediction - Loss:', loss);
                        console.log('First prediction - Accuracy:', accuracy);
                    }
                    
                    batchLoss += loss;
                    batchAccuracy += accuracy;

                    // Backpropagation
                    // Compute output layer delta
                    const numLayers = this.weights.length; // number of weight layers
                    const deltas = [];
                    // Initialize arrays for deltas corresponding to each weight layer
                    for (let di = 0; di < numLayers; di++) {
                        const layerW = this.weights[di];
                        const d = [];
                        for (let rr = 0; rr < layerW.length; rr++) d.push(0);
                        deltas.push(d);
                    }

                    const lastIdx = numLayers - 1;
                    const outputActivation = this.layers[this.layers.length - 1].activation;
                    // yTrue and yPred as scalars for binary case
                    const yTrueVal = Array.isArray(batchY[j]) ? batchY[j][0] : batchY[j];
                    const yPredVal = Array.isArray(prediction) ? prediction[0] : prediction;

                    if (outputActivation === 'sigmoid' && (config.loss === 'binaryCrossentropy' || this.config.trainingConfig.loss === 'binaryCrossentropy')) {
                        // Simplified delta: y_pred - y_true for BCE with sigmoid
                        deltas[lastIdx][0] = (yPredVal - yTrueVal);
                    } else {
                        // General: delta = dL/da * da/dz
                        const zLast = cache.layerZs[lastIdx];
                        const actDer = NeuralNetwork.activationDerivative(outputActivation, zLast);
                        for (let ii = 0; ii < deltas[lastIdx].length; ii++) {
                            const dLossDa = (Array.isArray(batchY[j]) ? (prediction[ii] - batchY[j][ii]) : (yPredVal - yTrueVal));
                            deltas[lastIdx][ii] = dLossDa * actDer[ii];
                        }
                    }

                    // Backpropagate deltas through hidden layers
                    for (let li = lastIdx - 1; li >= 0; li--) {
                        const currentWeights = this.weights[li + 1]; // maps from layer li+1 to li+2
                        const currentDelta = deltas[li + 1];
                        // Compute weighted sum for previous layer delta
                        const prevZ = cache.layerZs[li]; // z for layer li+1 (since z index 0 corresponds to first hidden layer)
                        const prevActDer = NeuralNetwork.activationDerivative(this.layers[li + 1].activation, prevZ);

                        // deltas[li] length equals number of neurons in layer li+1's input (i.e., size of weights columns)
                        for (let k = 0; k < prevActDer.length; k++) {
                            let sumVal = 0;
                            for (let m = 0; m < currentWeights.length; m++) {
                                // currentWeights[m][k] contributes
                                sumVal += currentWeights[m][k] * currentDelta[m];
                            }
                            deltas[li][k] = sumVal * prevActDer[k];
                        }
                    }

                    // Accumulate gradients for weights and biases
                    // For each layer i: gradW[i][j][k] += delta_{i}[j] * a^{i}_k
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

                // Apply optimizer step (average gradients over batch)
                const invBatch = batchX.length > 0 ? (1 / batchX.length) : 1;
                if (optimizerName === 'adam') {
                    this.applyAdamUpdate(gradWeights, gradBiases, learningRate, invBatch, adamBeta1, adamBeta2, adamEpsilon);
                } else {
                    // Fallback to SGD
                    for (let wi = 0; wi < this.weights.length; wi++) {
                        for (let r = 0; r < this.weights[wi].length; r++) {
                            for (let c = 0; c < this.weights[wi][r].length; c++) {
                                this.weights[wi][r][c] -= learningRate * gradWeights[wi][r][c] * invBatch;
                            }
                            this.biases[wi][r] -= learningRate * gradBiases[wi][r] * invBatch;
                        }
                    }
                }

                epochLoss += batchLoss / (batchX.length > 0 ? batchX.length : 1);
                epochAccuracy += batchAccuracy / (batchX.length > 0 ? batchX.length : 1);
                batchCount++;
            }

            const avgLoss = epochLoss / batchCount;
            const avgAccuracy = epochAccuracy / batchCount;

            // Validation (only if non-empty arrays provided)
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

            // Early stopping: use validation loss if available; otherwise, fall back to training loss
            if (earlyStopping) {
                const metricLoss = hasValidation ? valLoss : avgLoss;
                if (metricLoss < bestEarlyStoppingLoss) {
                    bestEarlyStoppingLoss = metricLoss;
                    patienceCounter = 0;
                } else {
                    patienceCounter++;
                    if (patienceCounter >= patience) {
                        console.log(`Early stopping at epoch ${epoch + 1}`);
                        break;
                    }
                }
            }

            // Callback for progress updates
            if (onEpochEnd) {
                await onEpochEnd({
                    epoch: epoch + 1,
                    loss: avgLoss,
                    accuracy: avgAccuracy,
                    valLoss: valLoss,
                    valAccuracy: valAccuracy
                });
            }

            // Small delay to allow UI updates
            await new Promise(resolve => setTimeout(resolve, 10));
        }

        return history;
    }

    // Utility function to shuffle array
    shuffleArray(array) {
        if (!Array.isArray(array)) {
            throw new Error('shuffleArray requires an array input');
        }
        
        const shuffled = [];
        for (let i = 0; i < array.length; i++) {
            shuffled.push(array[i]);
        }
        
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    // Predict function
    predict(x) {
        if (Array.isArray(x[0])) {
            // Multiple samples
            return x.map(sample => this.forward(sample));
        } else {
            // Single sample
            return this.forward(x);
        }
    }

    // Save model
    save() {
        return {
            config: this.config,
            weights: this.weights,
            biases: this.biases,
            layers: this.layers
        };
    }

    // Load model
    static load(modelData) {
        const network = new NeuralNetwork(modelData.config);
        network.weights = modelData.weights;
        network.biases = modelData.biases;
        network.layers = modelData.layers;
        return network;
    }
}

// Export for use in other modules
window.NeuralNetwork = NeuralNetwork;
