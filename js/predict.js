/**
 * Predict Module
 * Handles model loading and making predictions
 */

class PredictManager {
    constructor() {
        this.trainedModel = null;
        this.testData = null;
        this.predictions = null;
        this.modelInfo = null;
        this.hasTargetColumn = false;
        this.targetColumn = '';
        this.csvFormat = { hasHeader: true, delimiter: ',' };
        
        this.init();
    }

    init() {
        // File upload handlers
        const modelFileInput = document.getElementById('predict-model-file');
        if (modelFileInput) {
            modelFileInput.addEventListener('change', (e) => {
                this.handleModelFileUpload(e);
            });
        }

        const testDataInput = document.getElementById('test-data');
        if (testDataInput) {
            testDataInput.addEventListener('change', (e) => {
                this.handleTestDataUpload(e);
            });
        }

        const hasTargetCheckbox = document.getElementById('predict-has-target-column');
        const targetGroup = document.getElementById('predict-target-group');
        const targetSelect = document.getElementById('predict-target-column');
        if (hasTargetCheckbox) {
            hasTargetCheckbox.addEventListener('change', (e) => {
                this.hasTargetColumn = e.target.checked;
                if (targetGroup) targetGroup.style.display = this.hasTargetColumn ? 'block' : 'none';
                this.updateDataInfo();
            });
        }
        if (targetSelect) {
            targetSelect.addEventListener('change', (e) => {
                this.targetColumn = e.target.value;
                this.updateDataInfo();
            });
        }

        // Buttons
        const makePredictionsBtn = document.getElementById('make-predictions-btn');
        if (makePredictionsBtn) {
            makePredictionsBtn.addEventListener('click', () => {
                this.makePredictions();
            });
        }

        const resetPredictionsBtn = document.getElementById('reset-predictions-btn');
        if (resetPredictionsBtn) {
            resetPredictionsBtn.addEventListener('click', () => {
                this.resetPredictions();
            });
        }

        const downloadPredictionsBtn = document.getElementById('download-predictions-btn');
        if (downloadPredictionsBtn) {
            downloadPredictionsBtn.addEventListener('click', () => {
                this.downloadPredictions();
            });
        }
    }

    handleModelFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        this.showLoading(true);
        this.hideMessages();

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const modelData = JSON.parse(e.target.result);
                this.trainedModel = NeuralNetwork.load(modelData);
                
                this.modelInfo = {
                    inputShape: [modelData.config.architecture.inputLayer.units],
                    outputShape: [modelData.config.architecture.outputLayer.units],
                    layers: modelData.config.architecture.hiddenLayers.length + 2
                };
                
                this.showSuccess('Trained model loaded successfully!');
                this.updateModelInfo();
            } catch (err) {
                this.showError('Error loading model: ' + err.message);
            } finally {
                this.showLoading(false);
            }
        };
        reader.readAsText(file);
    }

    handleTestDataUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        this.hideMessages();

        this.detectCsvFormat(file).then((fmt) => {
            this.csvFormat = fmt;
            Papa.parse(file, {
                header: fmt.hasHeader,
                delimiter: fmt.delimiter,
                skipEmptyLines: 'greedy',
                dynamicTyping: false,
                transformHeader: fmt.hasHeader ? (h) => (h || '').trim() : undefined,
                transform: (v) => (v || '').toString().trim(),
                complete: (results) => {
                    if (results.errors.length > 0) {
                        this.showError('Error parsing CSV file: ' + results.errors[0].message);
                        return;
                    }
                    const valid = results.data.filter(row => row && typeof row === 'object' && Object.values(row).some(v => v !== '' && v !== null && v !== undefined));
                    this.testData = valid;
                    this.showSuccess(`Successfully loaded ${valid.length} rows of test data (delimiter "${fmt.delimiter}", header: ${fmt.hasHeader ? 'yes' : 'no'})`);
                    this.populateTargetOptions(Object.keys(this.testData[0] || {}));
                    this.updateDataInfo();
                },
                error: (error) => {
                    this.showError('Error reading file: ' + error.message);
                }
            });
        }).catch((e) => {
            this.showError('Failed to detect CSV format: ' + (e && e.message ? e.message : e));
        });
    }

    populateTargetOptions(columns) {
        const targetSelect = document.getElementById('predict-target-column');
        if (!targetSelect) return;
        targetSelect.innerHTML = '';
        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = '-- Select target column --';
        targetSelect.appendChild(placeholder);
        columns.forEach(col => {
            const opt = document.createElement('option');
            opt.value = col;
            opt.textContent = col;
            targetSelect.appendChild(opt);
        });
        // Preselect common names
        const lower = columns.map(c => c.toLowerCase());
        const common = ['target', 'label', 'class', 'diagnosis', 'y'];
        for (let i = 0; i < common.length; i++) {
            const idx = lower.indexOf(common[i]);
            if (idx !== -1) {
                targetSelect.value = columns[idx];
                this.targetColumn = columns[idx];
                break;
            }
        }
    }

    makePredictions() {
        if (!this.trainedModel || !this.testData) {
            this.showError('Please upload both trained model and test data');
            return;
        }

        this.showLoading(true);
        this.hideMessages();

        try {
            // Prepare test data: optionally exclude ID column, and ensure numeric features
            const cols = Object.keys(this.testData[0] || {});
            let idKey = cols.includes('id') ? 'id' : null;
            let targetKey = null;
            if (this.hasTargetColumn) {
                if (this.targetColumn && cols.includes(this.targetColumn)) targetKey = this.targetColumn;
            }

            // Determine feature keys
            let featureKeys = [];
            const preprocessing = this.trainedModel && this.trainedModel.config ? this.trainedModel.config.preprocessing : null;
            if (preprocessing && Array.isArray(preprocessing.featureKeys)) {
                // Use the exact order from training
                featureKeys = preprocessing.featureKeys.filter(k => k !== idKey && k !== targetKey);
            } else {
                const featureCandidates = cols.filter(k => k !== idKey && k !== targetKey);
                featureKeys = featureCandidates.filter(k => {
                    for (let i = 0; i < this.testData.length; i++) {
                        const v = this.testData[i][k];
                        if (v !== '' && v !== null && v !== undefined) {
                            const n = parseFloat(v);
                            if (!isNaN(n)) return true;
                        }
                    }
                    return false;
                });
            }

            // Build feature matrix
            let features = this.testData.map(row => featureKeys.map(k => {
                const n = parseFloat(row[k]);
                return isNaN(n) ? 0 : n;
            }));

            // Apply training-time normalization if available
            if (preprocessing && preprocessing.mins && preprocessing.maxs) {
                const mins = preprocessing.mins;
                const maxs = preprocessing.maxs;
                features = features.map(arr => {
                    return arr.map((val, idx) => {
                        const key = featureKeys[idx];
                        const min = typeof mins[key] === 'number' ? mins[key] : 0;
                        const max = typeof maxs[key] === 'number' ? maxs[key] : 1;
                        let scaled = (val - min) / (max - min || 1);
                        if (scaled < 0) scaled = 0;
                        if (scaled > 1) scaled = 1;
                        return scaled;
                    });
                });
            }

            // Match model input size by trimming/padding
            const expected = this.trainedModel.config.architecture.inputLayer.units;
            features = features.map(arr => {
                if (arr.length > expected) return arr.slice(0, expected);
                if (arr.length < expected) {
                    const padded = arr.slice();
                    while (padded.length < expected) padded.push(0);
                    return padded;
                }
                return arr;
            });

			// Make predictions
			const predictions = this.trainedModel.predict(features);
            
            // Process predictions
            const results = this.testData.map((row, index) => {
                const rawPred = predictions[index];
                const prediction = Array.isArray(rawPred) ? rawPred[0] : rawPred;
                const predVal = (typeof prediction === 'number' && !isNaN(prediction)) ? prediction : 0.5;
                const confidence = Math.abs(predVal - 0.5) * 2; // Convert to 0-1 confidence
                
                return {
                    input: featureKeys.map(k => row[k]),
                    prediction: predVal,
                    confidence: confidence,
                    predictedClass: predVal > 0.5 ? 'Class 1' : 'Class 0'
                };
            });

			this.predictions = results;
            this.showSuccess(`Predictions completed for ${results.length} samples`);
            this.showPredictionSummary();
            this.showPredictionResults();

			// If target column is provided, compute and show evaluation metrics
			if (targetKey) {
				this.computeAndShowMetrics(targetKey, predictions);
			} else {
				this.hideEvaluationMetrics();
			}
            
        } catch (err) {
            this.showError('Prediction error: ' + err.message);
        } finally {
            this.showLoading(false);
        }
    }

    downloadPredictions() {
        if (!this.predictions) {
            this.showError('No predictions to download');
            return;
        }

        const csvData = this.predictions.map((result, index) => ({
            'Sample': index + 1,
            'Prediction': result.prediction.toFixed(4),
            'Confidence': result.confidence.toFixed(4),
            'Predicted Class': result.predictedClass
        }));

        const csv = Papa.unparse(csvData);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'predictions.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showSuccess('Predictions downloaded successfully!');
    }

    resetPredictions() {
        this.trainedModel = null;
        this.testData = null;
        this.predictions = null;
        this.modelInfo = null;
        this.hideMessages();
        this.hideModelInfo();
        this.hideDataInfo();
        this.hidePredictionSummary();
        this.hidePredictionResults();
		this.hideEvaluationMetrics();
        
        const modelFileInput = document.getElementById('predict-model-file');
        const testDataInput = document.getElementById('test-data');
        if (modelFileInput) modelFileInput.value = '';
        if (testDataInput) testDataInput.value = '';
    }

	// Metrics computation and display
	computeAndShowMetrics(targetKey, predictions) {
		try {
			if (!this.testData || !Array.isArray(predictions)) return;
			let tp = 0, tn = 0, fp = 0, fn = 0;
			let validCount = 0;
			for (let i = 0; i < this.testData.length; i++) {
				const row = this.testData[i];
				const raw = row[targetKey];
				if (raw === '' || raw === null || raw === undefined) continue;
				const yTrue = this.toBinaryLabel(raw);
				const rawPred = predictions[i];
				const pred = Array.isArray(rawPred) ? rawPred[0] : rawPred;
				const yPred = (typeof pred === 'number' && !isNaN(pred)) ? (pred > 0.5 ? 1 : 0) : 0;
				if (yTrue === 1 && yPred === 1) tp++;
				else if (yTrue === 0 && yPred === 0) tn++;
				else if (yTrue === 0 && yPred === 1) fp++;
				else if (yTrue === 1 && yPred === 0) fn++;
				validCount++;
			}

			if (validCount === 0) {
				this.hideEvaluationMetrics();
				return;
			}

			const accuracy = (tp + tn) / (tp + tn + fp + fn);
			const precision = (tp + fp) > 0 ? tp / (tp + fp) : 0;
			const recall = (tp + fn) > 0 ? tp / (tp + fn) : 0;
			const f1 = (precision + recall) > 0 ? (2 * precision * recall) / (precision + recall) : 0;

			this.showEvaluationMetrics({ accuracy, precision, recall, f1, tp, tn, fp, fn });
		} catch (e) {
			console.error('Error computing metrics:', e);
			this.hideEvaluationMetrics();
		}
	}

	toBinaryLabel(raw) {
		if (typeof raw === 'string') {
			const val = raw.trim().toLowerCase();
			if (val === 'm' || val === 'malignant' || val === '1' || val === 'true' || val === 'yes') return 1;
			if (val === 'b' || val === 'benign' || val === '0' || val === 'false' || val === 'no') return 0;
			const n = parseFloat(raw);
			return isNaN(n) ? 0 : (n > 0 ? 1 : 0);
		}
		const n = parseFloat(raw);
		return isNaN(n) ? 0 : (n > 0 ? 1 : 0);
	}

	showEvaluationMetrics(metrics) {
        const container = document.getElementById('evaluation-metrics');
        const accEl = document.getElementById('metric-accuracy');
        const tnEl = document.getElementById('cm-tn');
        const fpEl = document.getElementById('cm-fp');
        const fnEl = document.getElementById('cm-fn');
        const tpEl = document.getElementById('cm-tp');
		if (!container) return;
		if (accEl) accEl.textContent = (metrics.accuracy * 100).toFixed(2) + '%';
		if (tnEl) tnEl.textContent = metrics.tn;
		if (fpEl) fpEl.textContent = metrics.fp;
		if (fnEl) fnEl.textContent = metrics.fn;
		if (tpEl) tpEl.textContent = metrics.tp;
		container.style.display = 'block';
	}

	hideEvaluationMetrics() {
		const container = document.getElementById('evaluation-metrics');
		if (container) container.style.display = 'none';
	}

    detectCsvFormat(file) {
        return new Promise((resolve, reject) => {
            try {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const text = (e.target && e.target.result) ? e.target.result.toString() : '';
                    const sample = text.split('\n').slice(0, 5).map(l => l.replace(/\r/g, ''));
                    const candidates = [',', ';', '\t', '|'];
                    let best = { delimiter: ',', score: -1 };
                    for (let d = 0; d < candidates.length; d++) {
                        const delim = candidates[d];
                        const counts = sample.map(line => line.split(delim).length);
                        const avg = counts.reduce((a,b)=>a+b,0) / (counts.length || 1);
                        if (avg > best.score) {
                            best = { delimiter: delim, score: avg };
                        }
                    }
                    // Header heuristic
                    let hasHeader = true;
                    if (sample.length >= 2) {
                        const first = sample[0].split(best.delimiter);
                        const second = sample[1].split(best.delimiter);
                        const isNumeric = (arr) => {
                            let numericCount = 0, total = 0;
                            for (let i = 0; i < arr.length; i++) {
                                const v = arr[i].trim();
                                if (v === '') continue;
                                total++;
                                const n = parseFloat(v);
                                if (!isNaN(n) && isFinite(n)) numericCount++;
                            }
                            return total > 0 && numericCount / total > 0.6;
                        };
                        const firstNumeric = isNumeric(first);
                        const secondNumeric = isNumeric(second);
                        hasHeader = !firstNumeric && secondNumeric;
                    }
                    resolve({ delimiter: best.delimiter, hasHeader });
                };
                const blob = file.slice(0, 2048);
                reader.readAsText(blob);
            } catch (err) {
                reject(err);
            }
        });
    }

    getConfidenceColor(confidence) {
        if (confidence > 0.8) return '#27ae60'; // Green
        if (confidence > 0.6) return '#f39c12'; // Orange
        return '#e74c3c'; // Red
    }

    // UI Helper methods
    showLoading(show) {
        const loadingContainer = document.getElementById('predict-loading');
        if (loadingContainer) {
            loadingContainer.style.display = show ? 'flex' : 'none';
        }
    }

    showError(message) {
        const errorElement = document.getElementById('predict-error');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        }
    }

    showSuccess(message) {
        const successElement = document.getElementById('predict-success');
        if (successElement) {
            successElement.textContent = message;
            successElement.style.display = 'block';
        }
    }

    hideMessages() {
        const errorElement = document.getElementById('predict-error');
        const successElement = document.getElementById('predict-success');
        if (errorElement) errorElement.style.display = 'none';
        if (successElement) successElement.style.display = 'none';
    }

    updateModelInfo() {
        if (!this.modelInfo) return;
        
        const modelInfo = document.getElementById('predict-model-info');
        const inputShape = document.getElementById('predict-input-shape');
        const outputShape = document.getElementById('predict-output-shape');
        const layers = document.getElementById('predict-layers');
        
        if (modelInfo && inputShape && outputShape && layers) {
            inputShape.textContent = this.modelInfo.inputShape.join(' × ');
            outputShape.textContent = this.modelInfo.outputShape.join(' × ');
            layers.textContent = this.modelInfo.layers;
            modelInfo.style.display = 'block';
        }
    }

    hideModelInfo() {
        const modelInfo = document.getElementById('predict-model-info');
        if (modelInfo) {
            modelInfo.style.display = 'none';
        }
    }

    updateDataInfo() {
        if (!this.testData) return;
        
        const dataInfo = document.getElementById('predict-data-info');
        const samples = document.getElementById('predict-samples');
        const features = document.getElementById('predict-features');
        
        if (dataInfo && samples && features) {
            samples.textContent = this.testData.length;
            const cols = Object.keys(this.testData[0] || {});
            let idKey = cols.includes('id') ? 'id' : null;
            let targetKey = null;
            if (this.hasTargetColumn) {
                if (this.targetColumn && cols.includes(this.targetColumn)) targetKey = this.targetColumn;
            }
            const featureCandidates = cols.filter(k => k !== idKey && k !== targetKey);
            const numericFeatureKeys = featureCandidates.filter(k => {
                for (let i = 0; i < this.testData.length; i++) {
                    const v = this.testData[i][k];
                    if (v !== '' && v !== null && v !== undefined) {
                        const n = parseFloat(v);
                        if (!isNaN(n)) return true;
                    }
                }
                return false;
            });
            features.textContent = numericFeatureKeys.length;
            dataInfo.style.display = 'block';
        }
    }

    hideDataInfo() {
        const dataInfo = document.getElementById('predict-data-info');
        if (dataInfo) {
            dataInfo.style.display = 'none';
        }
    }

    showPredictionSummary() {
        if (!this.predictions) return;
        
        const summary = document.getElementById('prediction-summary');
        const totalPredictions = document.getElementById('total-predictions');
        const highConfidence = document.getElementById('high-confidence');
        const avgConfidence = document.getElementById('avg-confidence');
        
        if (summary && totalPredictions && highConfidence && avgConfidence) {
            const highConfCount = this.predictions.filter(p => p.confidence > 0.8).length;
            const avgConf = this.predictions.reduce((sum, p) => sum + p.confidence, 0) / this.predictions.length;
            
            totalPredictions.textContent = this.predictions.length;
            highConfidence.textContent = highConfCount;
            avgConfidence.textContent = (avgConf * 100).toFixed(1) + '%';
            
            summary.style.display = 'block';
        }
    }

    hidePredictionSummary() {
        const summary = document.getElementById('prediction-summary');
        if (summary) {
            summary.style.display = 'none';
        }
    }

    showPredictionResults() {
        if (!this.predictions) return;
        
        const resultsCard = document.getElementById('predictions-results-card');
        const predictionsTable = document.getElementById('predictions-table');
        const tableNote = document.getElementById('table-note');
        
        if (resultsCard && predictionsTable && tableNote) {
            const tbody = predictionsTable.querySelector('tbody');
            tbody.innerHTML = '';
            
            // Show first 20 predictions
            const displayPredictions = this.predictions.slice(0, 20);
            
            displayPredictions.forEach((result, index) => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${index + 1}</td>
                    <td>${result.prediction.toFixed(4)}</td>
                    <td>
                        <span class="confidence-badge" style="background-color: ${this.getConfidenceColor(result.confidence)}">
                            ${(result.confidence * 100).toFixed(1)}%
                        </span>
                    </td>
                    <td>${result.predictedClass}</td>
                `;
                tbody.appendChild(tr);
            });
            
            tableNote.textContent = this.predictions.length > 20 ? 
                'Showing first 20 predictions. Download full results above.' : 
                '';
            
            resultsCard.style.display = 'block';

            // Smoothly scroll to the results card after it becomes visible, with header offset
            setTimeout(() => {
                const headerOffset = 100; // leave space for fixed header and section title
                const rect = resultsCard.getBoundingClientRect();
                const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                const targetY = rect.top + scrollTop - headerOffset;
                try {
                    window.scrollTo({ top: targetY, behavior: 'smooth' });
                } catch (e) {
                    // Fallback for older browsers
                    window.scrollTo(0, targetY);
                }
            }, 80);
        }
    }

    hidePredictionResults() {
        const resultsCard = document.getElementById('predictions-results-card');
        if (resultsCard) {
            resultsCard.style.display = 'none';
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.predictManager = new PredictManager();
});

// Expose for SPA router
window.initPredictPage = function() {
	window.predictManager = new PredictManager();
};