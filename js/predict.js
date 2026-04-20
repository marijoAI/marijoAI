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
        this.labelMappings = null;
        this.labelKey = null;
        this.savedIdColumn = null;
        this.predictionsPage = 1;
        this.predictionsPageSize = 20;
        this.predictionsSortMode = 'dataset-asc';
        
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
                const cols = this.testData ? Object.keys(this.testData[0] || {}) : [];
                if (cols.length) this.populatePredictIdColumnOptions(cols);
                this.updateDataInfo();
            });
        }

        const predictHasIdEl = document.getElementById('predict-has-id-column');
        const predictIdGroup = document.getElementById('predict-id-column-group');
        const predictIdSelect = document.getElementById('predict-id-column');
        if (predictHasIdEl) {
            predictHasIdEl.addEventListener('change', (e) => {
                if (predictIdGroup) predictIdGroup.style.display = e.target.checked ? 'block' : 'none';
                if (!e.target.checked && predictIdSelect) predictIdSelect.value = '';
                this.updateDataInfo();
            });
        }
        if (predictIdSelect) {
            predictIdSelect.addEventListener('change', () => this.updateDataInfo());
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

        const sortOrderSelect = document.getElementById('predictions-sort-order');
        if (sortOrderSelect) {
            sortOrderSelect.addEventListener('change', (e) => {
                const v = e.target.value;
                const allowed = ['dataset-asc', 'dataset-desc', 'score-desc', 'score-asc'];
                this.predictionsSortMode = allowed.includes(v) ? v : 'dataset-asc';
                this.predictionsPage = 1;
                this.renderPredictionsTablePage();
            });
        }
        const pageSizeSelect = document.getElementById('predictions-page-size');
        if (pageSizeSelect) {
            pageSizeSelect.addEventListener('change', (e) => {
                const n = parseInt(e.target.value, 10);
                this.predictionsPageSize = n === 50 ? 50 : 20;
                this.predictionsPage = 1;
                this.renderPredictionsTablePage();
            });
        }
        const pagePrev = document.getElementById('predictions-page-prev');
        const pageNext = document.getElementById('predictions-page-next');
        if (pagePrev) {
            pagePrev.addEventListener('click', () => {
                if (this.predictionsPage > 1) {
                    this.predictionsPage--;
                    this.renderPredictionsTablePage();
                }
            });
        }
        if (pageNext) {
            pageNext.addEventListener('click', () => {
                const total = this.predictions ? this.getOrderedPredictions().length : 0;
                const pages = Math.max(1, Math.ceil(total / this.predictionsPageSize));
                if (this.predictionsPage < pages) {
                    this.predictionsPage++;
                    this.renderPredictionsTablePage();
                }
            });
        }

        const filterModeEl = document.getElementById('predictions-filter-mode');
        const filterThresholdEl = document.getElementById('predictions-filter-threshold');
        const onScoreFilterChange = () => {
            this.updateScoreFilterThresholdDisabled();
            if (!this.predictions || !this.predictions.length) return;
            this.predictionsPage = 1;
            this.renderPredictionsTablePage();
        };
        if (filterModeEl) {
            filterModeEl.addEventListener('change', onScoreFilterChange);
        }
        if (filterThresholdEl) {
            filterThresholdEl.addEventListener('change', onScoreFilterChange);
            filterThresholdEl.addEventListener('input', onScoreFilterChange);
        }
        this.updateScoreFilterThresholdDisabled();
    }

    updateScoreFilterThresholdDisabled() {
        const modeEl = document.getElementById('predictions-filter-mode');
        const thEl = document.getElementById('predictions-filter-threshold');
        if (!thEl) return;
        const on = modeEl && (modeEl.value === 'gt' || modeEl.value === 'lt');
        thEl.disabled = !on;
    }

    parseScoreFilterThreshold() {
        const thEl = document.getElementById('predictions-filter-threshold');
        let x = thEl ? parseFloat(String(thEl.value).replace(',', '.')) : NaN;
        if (Number.isNaN(x)) x = 0.5;
        return Math.max(0, Math.min(1, x));
    }

    isScoreFilterActive() {
        const modeEl = document.getElementById('predictions-filter-mode');
        return modeEl && (modeEl.value === 'gt' || modeEl.value === 'lt');
    }

    getFilteredPredictions() {
        if (!this.predictions || !this.predictions.length) return [];
        const modeEl = document.getElementById('predictions-filter-mode');
        const mode = modeEl ? modeEl.value : 'none';
        if (mode !== 'gt' && mode !== 'lt') return this.predictions.slice();
        const x = this.parseScoreFilterThreshold();
        if (mode === 'gt') return this.predictions.filter(r => r.prediction > x);
        return this.predictions.filter(r => r.prediction < x);
    }

    handleModelFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        this.showLoading(true);
        this.hideMessages();

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                // Ensure WASM is ready before loading the model
                if (window._wasmNNReady) await window._wasmNNReady;

                const modelData = JSON.parse(e.target.result);
                this.trainedModel = NeuralNetwork.load(modelData);
                
                this.modelInfo = {
                    inputShape: [modelData.config.architecture.inputLayer.units],
                    outputShape: [modelData.config.architecture.outputLayer.units],
                    layers: modelData.config.architecture.hiddenLayers.length + 2
                };
                
                // Extract label mappings from preprocessing if available
                if (modelData.config.preprocessing && modelData.config.preprocessing.labelMappings) {
                    this.labelMappings = modelData.config.preprocessing.labelMappings;
                    this.labelKey = modelData.config.preprocessing.labelKey || null;
                } else {
                    this.labelMappings = null;
                    this.labelKey = null;
                }
                this.savedIdColumn = (modelData.config.preprocessing && modelData.config.preprocessing.idColumn) || null;
                
                this.showSuccess('Trained model loaded successfully!');
                this.updateModelInfo();
                this.displayLabelMappings();
                if (this.testData && this.testData.length) {
                    const cols = Object.keys(this.testData[0] || {});
                    this.populatePredictIdColumnOptions(cols);
                    this.applySavedIdColumnPreference(cols);
                    this.updateDataInfo();
                }
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
                    const cols = Object.keys(this.testData[0] || {});
                    this.populateTargetOptions(cols);
                    this.populatePredictIdColumnOptions(cols);
                    this.applySavedIdColumnPreference(cols);
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
        const common = ['churned', 'churn', 'target', 'label', 'class', 'status', 'y'];
        for (let i = 0; i < common.length; i++) {
            const idx = lower.indexOf(common[i]);
            if (idx !== -1) {
                targetSelect.value = columns[idx];
                this.targetColumn = columns[idx];
                break;
            }
        }
    }

    populatePredictIdColumnOptions(columns) {
        const idSelect = document.getElementById('predict-id-column');
        if (!idSelect) return;
        const prev = idSelect.value;
        let excludeTarget = null;
        if (this.hasTargetColumn && this.targetColumn && columns.includes(this.targetColumn)) {
            excludeTarget = this.targetColumn;
        }
        const opts = columns.filter(c => c !== excludeTarget);
        idSelect.innerHTML = '';
        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = '-- Select ID column --';
        idSelect.appendChild(placeholder);
        opts.forEach(col => {
            const opt = document.createElement('option');
            opt.value = col;
            opt.textContent = col;
            idSelect.appendChild(opt);
        });
        if (prev && opts.includes(prev)) idSelect.value = prev;
    }

    applySavedIdColumnPreference(columns) {
        if (!this.savedIdColumn || !columns.includes(this.savedIdColumn)) return;
        const cb = document.getElementById('predict-has-id-column');
        const idGroup = document.getElementById('predict-id-column-group');
        const sel = document.getElementById('predict-id-column');
        if (cb) cb.checked = true;
        if (idGroup) idGroup.style.display = 'block';
        if (sel) {
            const optVals = Array.from(sel.options).map(o => o.value);
            if (optVals.includes(this.savedIdColumn)) sel.value = this.savedIdColumn;
        }
    }

    getPredictIdKey(columns, targetKey) {
        const cb = document.getElementById('predict-has-id-column');
        if (!cb || !cb.checked) return { key: null };
        const sel = document.getElementById('predict-id-column');
        const v = sel ? sel.value : '';
        if (!v || !columns.includes(v)) {
            return { key: null, error: 'Please select which column is the ID column.' };
        }
        if (targetKey && v === targetKey) {
            return { key: null, error: 'The ID column cannot be the same as the churn column.' };
        }
        return { key: v };
    }

    makePredictions() {
        if (!this.trainedModel || !this.testData) {
            this.showError('Please upload both trained model and test data');
            return;
        }

        this.showLoading(true);
        this.hideMessages();

        try {
            const cols = Object.keys(this.testData[0] || {});
            let targetKey = null;
            if (this.hasTargetColumn) {
                if (this.targetColumn && cols.includes(this.targetColumn)) targetKey = this.targetColumn;
            }

            const idResolved = this.getPredictIdKey(cols, targetKey);
            if (idResolved.error) {
                this.showError(idResolved.error);
                return;
            }
            const idKey = idResolved.key;

            // Determine feature keys
            let featureKeys = [];
            const preprocessing = this.trainedModel && this.trainedModel.config ? this.trainedModel.config.preprocessing : null;
            if (preprocessing && Array.isArray(preprocessing.featureKeys)) {
                // Exact order from training (ID was already excluded at train time)
                featureKeys = preprocessing.featureKeys.slice();
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
            
            // Get label mappings from model preprocessing if available
            const labelMappings = preprocessing && preprocessing.labelMappings ? preprocessing.labelMappings : null;
            const reverseMappings = labelMappings ? this.createReverseMappings(labelMappings) : null;
            
            // Process predictions
            const results = this.testData.map((row, index) => {
                const rawPred = predictions[index];
                const prediction = Array.isArray(rawPred) ? rawPred[0] : rawPred;
                const predVal = (typeof prediction === 'number' && !isNaN(prediction)) ? prediction : 0.5;
                const confidence = Math.abs(predVal - 0.5) * 2; // Convert to 0-1 confidence
                const predictedNumeric = predVal > 0.5 ? 1 : 0;
                
                // Use label mappings to show meaningful class names
                let predictedClass;
                if (reverseMappings && reverseMappings[predictedNumeric]) {
                    predictedClass = reverseMappings[predictedNumeric][0];
                } else {
                    predictedClass = predictedNumeric === 1 ? 'At Risk' : 'Safe';
                }
                
                const riskTier = this.getRiskTier(predVal);

                return {
                    datasetRow: index + 1,
                    input: featureKeys.map(k => row[k]),
                    prediction: predVal,
                    confidence: confidence,
                    predictedClass: predictedClass,
                    predictedNumeric: predictedNumeric,
                    riskTierKey: riskTier.key,
                    riskTierLabel: riskTier.label
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

        const ordered = this.getOrderedPredictions();
        if (!ordered.length) {
            this.showError('No rows match the current churn score filter. Adjust the threshold or choose Show all customers.');
            return;
        }

        const csvData = ordered.map((result) => ({
            'Customer': result.datasetRow,
            'Churn Score': result.prediction.toFixed(4),
            'Confidence': result.confidence.toFixed(4),
            'Risk Level': result.predictedClass,
            'Risk Tier': result.riskTierLabel || this.getRiskTier(result.prediction).label
        }));

        const csv = Papa.unparse(csvData);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'churn_predictions.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showSuccess(`Downloaded ${ordered.length} row${ordered.length === 1 ? '' : 's'} (current sort and filter).`);
    }

    resetPredictions() {
        this.trainedModel = null;
        this.testData = null;
        this.predictions = null;
        this.modelInfo = null;
        this.labelMappings = null;
        this.labelKey = null;
        this.savedIdColumn = null;
        this.predictionsPage = 1;
        this.predictionsPageSize = 20;
        this.predictionsSortMode = 'dataset-asc';
        const pageSizeSelect = document.getElementById('predictions-page-size');
        if (pageSizeSelect) pageSizeSelect.value = '20';
        const sortOrderSelect = document.getElementById('predictions-sort-order');
        if (sortOrderSelect) sortOrderSelect.value = 'dataset-asc';
        const filterModeEl = document.getElementById('predictions-filter-mode');
        const filterThEl = document.getElementById('predictions-filter-threshold');
        if (filterModeEl) filterModeEl.value = 'none';
        if (filterThEl) {
            filterThEl.value = '0.5';
            filterThEl.disabled = true;
        }
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
        const predictHasIdEl = document.getElementById('predict-has-id-column');
        const predictIdGroup = document.getElementById('predict-id-column-group');
        const predictIdSelect = document.getElementById('predict-id-column');
        if (predictHasIdEl) predictHasIdEl.checked = false;
        if (predictIdGroup) predictIdGroup.style.display = 'none';
        if (predictIdSelect) {
            predictIdSelect.innerHTML = '';
            const ph = document.createElement('option');
            ph.value = '';
            ph.textContent = '-- Upload CSV first --';
            predictIdSelect.appendChild(ph);
        }
        this.updateScoreFilterThresholdDisabled();
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
			if (val === '1' || val === 'true' || val === 'yes' || val === 'churned' || val === 'churn' || val === 'left' || val === 'inactive') return 1;
			if (val === '0' || val === 'false' || val === 'no' || val === 'retained' || val === 'stayed' || val === 'active') return 0;
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

    // Risk tier bucketing based on churn score (0 = will stay, 1 = will churn).
    // Tiers are inclusive of the lower bound and exclusive of the upper bound,
    // except for the top tier which includes 1.0.
    getRiskTier(score) {
        const s = (typeof score === 'number' && !isNaN(score)) ? score : 0;
        if (s < 0.20) {
            return { key: 'safe', label: 'Safe', range: '0.00 – 0.20' };
        }
        if (s < 0.50) {
            return { key: 'watch', label: 'Watch', range: '0.20 – 0.50' };
        }
        if (s < 0.80) {
            return { key: 'atrisk', label: 'At risk', range: '0.50 – 0.80' };
        }
        return { key: 'critical', label: 'Critical', range: '0.80 – 1.00' };
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
            let targetKey = null;
            if (this.hasTargetColumn) {
                if (this.targetColumn && cols.includes(this.targetColumn)) targetKey = this.targetColumn;
            }
            const idResolved = this.getPredictIdKey(cols, targetKey);
            const idKey = idResolved.key;
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
        
        const atRisk = this.predictions.filter(p => p.predictedNumeric === 1);
        const summaryEl = document.getElementById('churn-risk-summary');
        const headlineEl = document.getElementById('churn-risk-headline');
        const detailEl = document.getElementById('churn-risk-detail');
        
        if (summaryEl && headlineEl && detailEl) {
            const total = this.predictions.length;
            const riskCount = atRisk.length;
            const pct = ((riskCount / total) * 100).toFixed(0);
            headlineEl.textContent = `${riskCount} of ${total} customers (${pct}%) are at risk of churning`;
            detailEl.textContent = riskCount > 0
                ? 'Review the table below to identify which accounts need immediate attention.'
                : 'No customers were flagged as high churn risk by the model.';
            summaryEl.style.display = riskCount > 0 ? 'block' : 'none';
        }

        this.renderRiskTiersSummary();
    }

    renderRiskTiersSummary() {
        const container = document.getElementById('risk-tiers-summary');
        if (!container) return;
        if (!this.predictions || !this.predictions.length) {
            container.style.display = 'none';
            return;
        }

        const counts = { safe: 0, watch: 0, atrisk: 0, critical: 0 };
        for (let i = 0; i < this.predictions.length; i++) {
            const key = this.predictions[i].riskTierKey || this.getRiskTier(this.predictions[i].prediction).key;
            if (counts[key] !== undefined) counts[key]++;
        }

        const total = this.predictions.length;
        const formatPct = (n) => total > 0 ? `${((n / total) * 100).toFixed(0)}%` : '0%';

        const tierKeys = ['safe', 'watch', 'atrisk', 'critical'];
        tierKeys.forEach((key) => {
            const countEl = document.getElementById(`risk-tier-count-${key}`);
            const pctEl = document.getElementById(`risk-tier-pct-${key}`);
            if (countEl) countEl.textContent = String(counts[key]);
            if (pctEl) pctEl.textContent = formatPct(counts[key]);
        });

        container.style.display = 'block';
    }

    hidePredictionSummary() {
        const summary = document.getElementById('churn-risk-summary');
        if (summary) {
            summary.style.display = 'none';
        }
        const tiers = document.getElementById('risk-tiers-summary');
        if (tiers) {
            tiers.style.display = 'none';
        }
    }

    getOrderedPredictions() {
        const base = this.getFilteredPredictions();
        if (!base.length) return [];
        const mode = this.predictionsSortMode || 'dataset-asc';
        const arr = base.slice();
        if (mode === 'dataset-desc') {
            arr.reverse();
            return arr;
        }
        if (mode === 'score-desc') {
            arr.sort((a, b) => b.prediction - a.prediction || a.datasetRow - b.datasetRow);
            return arr;
        }
        if (mode === 'score-asc') {
            arr.sort((a, b) => a.prediction - b.prediction || a.datasetRow - b.datasetRow);
            return arr;
        }
        return arr;
    }

    renderPredictionsTablePage() {
        if (!this.predictions || !this.predictions.length) return;

        const predictionsTable = document.getElementById('predictions-table');
        const tableNote = document.getElementById('table-note');
        const pageSizeSelect = document.getElementById('predictions-page-size');
        const sortOrderSelect = document.getElementById('predictions-sort-order');
        const pageInfo = document.getElementById('predictions-page-info');
        const pagePrev = document.getElementById('predictions-page-prev');
        const pageNext = document.getElementById('predictions-page-next');

        const allCount = this.predictions.length;
        const ordered = this.getOrderedPredictions();
        const total = ordered.length;
        const size = this.predictionsPageSize;
        const pageCount = Math.max(1, Math.ceil(total / size));
        if (this.predictionsPage > pageCount) this.predictionsPage = pageCount;
        if (this.predictionsPage < 1) this.predictionsPage = 1;

        const start = (this.predictionsPage - 1) * size;
        const end = Math.min(start + size, total);
        const slice = ordered.slice(start, end);

        if (pageSizeSelect) pageSizeSelect.value = String(size);
        if (sortOrderSelect) sortOrderSelect.value = this.predictionsSortMode || 'dataset-asc';

        if (predictionsTable) {
            const tbody = predictionsTable.querySelector('tbody');
            tbody.innerHTML = '';
            if (total === 0) {
                const tr = document.createElement('tr');
                tr.innerHTML = `<td colspan="5" class="predictions-table-empty">No rows match the current churn score filter. Try another threshold or choose Show all customers.</td>`;
                tbody.appendChild(tr);
            } else {
                slice.forEach((result) => {
                    const rowNum = result.datasetRow;
                    const tierKey = result.riskTierKey || this.getRiskTier(result.prediction).key;
                    const tierLabel = result.riskTierLabel || this.getRiskTier(result.prediction).label;
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                    <td>${rowNum}</td>
                    <td>${result.prediction.toFixed(4)}</td>
                    <td>
                        <span class="confidence-badge" style="background-color: ${this.getConfidenceColor(result.confidence)}">
                            ${(result.confidence * 100).toFixed(1)}%
                        </span>
                    </td>
                    <td>${this.escapeHtml(String(result.predictedClass))}</td>
                    <td>
                        <span class="risk-tier-badge risk-tier-badge-${tierKey}">
                            ${this.escapeHtml(tierLabel)}
                        </span>
                    </td>
                `;
                    tbody.appendChild(tr);
                });
            }
        }

        if (pageInfo) {
            if (total === 0) {
                pageInfo.textContent = `No matches (${allCount} scored)`;
            } else {
                pageInfo.textContent = `Page ${this.predictionsPage} of ${pageCount} (${start + 1}–${end} of ${total})`;
            }
        }
        if (pagePrev) pagePrev.disabled = this.predictionsPage <= 1 || total === 0;
        if (pageNext) pageNext.disabled = this.predictionsPage >= pageCount || total === 0;

        if (tableNote) {
            const parts = [];
            if (this.isScoreFilterActive() && total < allCount) {
                parts.push(`Showing ${total} of ${allCount} customers after the score filter.`);
            }
            if (total > size) {
                parts.push('Use Previous / Next to browse.');
            }
            if (total === 0 && allCount > 0) {
                parts.push('Adjust or clear the filter to export rows.');
            } else {
                parts.push('Download Results exports only the rows selected by the applied filters, and in the sorting order selected.');
            }
            tableNote.textContent = parts.join(' ');
        }
    }

    showPredictionResults() {
        if (!this.predictions) return;
        
        const resultsCard = document.getElementById('predictions-results-card');
        
        if (resultsCard) {
            this.predictionsPage = 1;
            this.predictionsSortMode = 'dataset-asc';
            const sortSel = document.getElementById('predictions-sort-order');
            if (sortSel) sortSel.value = 'dataset-asc';
            const filterModeEl = document.getElementById('predictions-filter-mode');
            const filterThEl = document.getElementById('predictions-filter-threshold');
            if (filterModeEl) filterModeEl.value = 'none';
            if (filterThEl) {
                filterThEl.value = '0.5';
                filterThEl.disabled = true;
            }
            this.updateScoreFilterThresholdDisabled();
            this.renderPredictionsTablePage();
            
            resultsCard.style.display = 'block';

            setTimeout(() => {
                const headerOffset = 100;
                const rect = resultsCard.getBoundingClientRect();
                const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                const targetY = rect.top + scrollTop - headerOffset;
                try {
                    window.scrollTo({ top: targetY, behavior: 'smooth' });
                } catch (e) {
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
    
    createReverseMappings(labelMappings) {
        // Create reverse mapping: numeric value -> array of original string values
        const reverse = {};
        Object.entries(labelMappings).forEach(([original, numeric]) => {
            if (!reverse[numeric]) {
                reverse[numeric] = [];
            }
            reverse[numeric].push(original);
        });
        // Sort each array to have most common/representative values first
        Object.keys(reverse).forEach(key => {
            reverse[key].sort();
        });
        return reverse;
    }
    
    displayLabelMappings() {
        const labelMappingsContainer = document.getElementById('predict-label-mappings');
        if (!labelMappingsContainer) return;
        
        if (this.labelMappings && Object.keys(this.labelMappings).length > 0) {
            const mappingsHtml = this.formatLabelMappings(this.labelMappings, this.labelKey);
            labelMappingsContainer.innerHTML = mappingsHtml;
            labelMappingsContainer.style.display = 'block';
        } else {
            labelMappingsContainer.style.display = 'none';
        }
    }
    
    formatLabelMappings(mappings, labelKey) {
        if (!mappings || Object.keys(mappings).length === 0) return '';
        
        const hasNonNumeric = Object.keys(mappings).some(key => {
            const num = parseFloat(key);
            return isNaN(num) || String(num) !== String(key).trim();
        });
        
        if (!hasNonNumeric) {
            // All values are numeric, no need to show mappings
            return '';
        }
        
        let html = '<div style="margin-top: 1em; padding: 0.75em; background: #f8f9fa; border-radius: 4px; border-left: 3px solid #007bff;">';
        html += `<strong>Label Mappings${labelKey ? ` (${labelKey})` : ''}:</strong><br>`;
        html += '<span style="font-size: 0.9em; color: #666;">These mappings show how original values were converted to numbers during training.</span><br>';
        html += '<table style="margin-top: 0.5em; width: 100%; font-size: 0.9em;">';
        html += '<thead><tr style="border-bottom: 1px solid #ddd;"><th style="text-align: left; padding: 4px;">Original Value</th><th style="text-align: left; padding: 4px;">Mapped To</th></tr></thead>';
        html += '<tbody>';
        
        // Sort by mapped value, then by original value
        const sortedEntries = Object.entries(mappings).sort((a, b) => {
            if (a[1] !== b[1]) return a[1] - b[1];
            return a[0].localeCompare(b[0]);
        });
        
        sortedEntries.forEach(([original, mapped]) => {
            html += `<tr><td style="padding: 4px;"><code>${this.escapeHtml(original)}</code></td><td style="padding: 4px;"><strong>${mapped}</strong></td></tr>`;
        });
        
        html += '</tbody></table>';
        html += '<p style="margin-top: 0.5em; font-size: 0.85em; color: #666;">Predictions will use these mappings to show meaningful class names.</p>';
        html += '</div>';
        
        return html;
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize when DOM is loaded
// Initialization is performed by the SPA router via `initPredictPage`.
// Do not create a manager on DOMContentLoaded to avoid stale bindings.

// Expose for SPA router
window.initPredictPage = function() {
    // Always create a fresh manager for the newly-inserted predict page
    // so event listeners bind to the current DOM nodes.
    window.predictManager = new PredictManager();
};