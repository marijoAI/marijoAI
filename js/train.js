/**
 * Train Model Module
 * Handles neural network training with custom implementation
 */

class TrainModelManager {
    constructor() {
        this.data = null;
        this.modelConfig = null;
        this.trainedModel = null;
        this.hasIdColumn = false;
        this.targetColumn = '';
        this.trainingConfig = {
            epochs: 100,
            batchSize: 32,
            learningRate: 0.001,
            earlyStopping: false,
            patience: 10
        };
        this.trainingProgress = {
            isTraining: false,
            currentEpoch: 0,
            totalEpochs: 0,
            loss: 0,
            accuracy: 0,
            valLoss: 0,
            valAccuracy: 0,
            history: []
        };
        
        this.init();
    }

    init() {
        // File upload handlers
        const dataFileInput = document.getElementById('data-file');
        if (dataFileInput) {
            dataFileInput.addEventListener('change', (e) => {
                this.handleDataFileUpload(e);
            });
        }

        // Dataset options
        const hasIdCheckbox = document.getElementById('has-id-column');
        if (hasIdCheckbox) {
            hasIdCheckbox.addEventListener('change', (e) => {
                this.hasIdColumn = e.target.checked;
                this.updateDataInfo();
            });
        }

        const targetSelect = document.getElementById('target-column');
        if (targetSelect) {
            targetSelect.addEventListener('change', (e) => {
                this.targetColumn = e.target.value;
                this.updateDataInfo();
            });
        }

        const modelFileInput = document.getElementById('model-file');
        if (modelFileInput) {
            modelFileInput.addEventListener('change', (e) => {
                this.handleModelFileUpload(e);
            });
        }

        // Training configuration
        const epochsInput = document.getElementById('epochs');
        if (epochsInput) {
            epochsInput.addEventListener('change', (e) => {
                this.trainingConfig.epochs = parseInt(e.target.value) || 100;
            });
        }

        const batchSizeInput = document.getElementById('batch-size');
        if (batchSizeInput) {
            batchSizeInput.addEventListener('change', (e) => {
                this.trainingConfig.batchSize = parseInt(e.target.value) || 32;
            });
        }

        const learningRateInput = document.getElementById('learning-rate');
        if (learningRateInput) {
            learningRateInput.addEventListener('change', (e) => {
                this.trainingConfig.learningRate = parseFloat(e.target.value) || 0.001;
            });
        }

        const earlyStoppingCheckbox = document.getElementById('early-stopping');
        if (earlyStoppingCheckbox) {
            earlyStoppingCheckbox.addEventListener('change', (e) => {
                this.trainingConfig.earlyStopping = e.target.checked;
                this.togglePatienceInput();
            });
        }

        const patienceInput = document.getElementById('patience');
        if (patienceInput) {
            patienceInput.addEventListener('change', (e) => {
                this.trainingConfig.patience = parseInt(e.target.value) || 10;
            });
        }

        // Buttons
        const startTrainingBtn = document.getElementById('start-training-btn');
        if (startTrainingBtn) {
            startTrainingBtn.addEventListener('click', () => {
                this.startTraining();
            });
        }

        const resetTrainingBtn = document.getElementById('reset-training-btn');
        if (resetTrainingBtn) {
            resetTrainingBtn.addEventListener('click', () => {
                this.resetTraining();
            });
        }

        const downloadTrainedModelBtn = document.getElementById('download-trained-model-btn');
        if (downloadTrainedModelBtn) {
            downloadTrainedModelBtn.addEventListener('click', () => {
                this.downloadTrainedModel();
            });
        }
    }

    togglePatienceInput() {
        const patienceGroup = document.getElementById('patience-group');
        if (patienceGroup) {
            patienceGroup.style.display = this.trainingConfig.earlyStopping ? 'block' : 'none';
        }
    }

    handleDataFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        this.hideMessages();

        Papa.parse(file, {
            header: true,
            skipEmptyLines: 'greedy',
            dynamicTyping: false,
            complete: (results) => {
                // Filter out field count errors
                const criticalErrors = results.errors.filter(err => 
                    !err.message.includes('Too few fields') && 
                    !err.message.includes('Too many fields')
                );
                
                if (criticalErrors.length > 0) {
                    this.showError('Error parsing CSV file: ' + criticalErrors[0].message);
                    return;
                }
                
                // Filter out empty rows
                const validData = results.data.filter(row => {
                    return row && typeof row === 'object' && 
                           Object.keys(row).length > 0 &&
                           Object.values(row).some(val => val !== '' && val !== null && val !== undefined);
                });
                
                if (validData.length === 0) {
                    this.showError('No valid data found in CSV file');
                    return;
                }
                
                this.data = validData;
                console.log('Loaded data:', this.data);
                console.log('First row:', this.data[0]);
                this.populateTargetColumnOptions(Object.keys(this.data[0] || {}));
                this.showSuccess(`Successfully loaded ${validData.length} rows of training data`);
                this.updateDataInfo();
            },
            error: (error) => {
                this.showError('Error reading file: ' + error.message);
            }
        });
    }

    populateTargetColumnOptions(columns) {
        const targetSelect = document.getElementById('target-column');
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
        // preselect common
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

    handleModelFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        this.hideMessages();

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const config = JSON.parse(e.target.result);
                this.modelConfig = config;
                this.showSuccess('Model configuration loaded successfully');
                this.updateModelInfo();
            } catch (err) {
                this.showError('Error parsing model JSON: ' + err.message);
            }
        };
        reader.readAsText(file);
    }

    prepareData() {
		if (!this.data || !this.modelConfig) {
			this.showError('Please upload both data and model files');
			return null;
		}

		try {
			// Filter out empty rows/objects
			const validData = this.data.filter(row => {
				return row && typeof row === 'object' && Object.keys(row).length > 0;
			});

			if (validData.length === 0) {
				this.showError('No valid data found in the CSV file');
				return null;
			}

            // Determine columns & selected label
            const columns = Object.keys(validData[0]);
            let labelKey = this.targetColumn && columns.includes(this.targetColumn) ? this.targetColumn : null;
            if (!labelKey) {
                this.showError('Please select the target column to predict.');
                return null;
            }

            // Determine feature keys: exclude label and optional id, keep numeric columns
            let idKey = null;
            if (this.hasIdColumn) {
                if (columns.includes('id')) idKey = 'id';
                else if (columns[0] !== labelKey) idKey = columns[0];
            }
            const featureKeysPre = columns.filter(k => k !== labelKey && k !== idKey);
			const featureKeys = featureKeysPre.filter(k => {
				// consider numeric if at least one non-empty value parses to number
				for (let i = 0; i < validData.length; i++) {
					const v = validData[i][k];
					if (v !== '' && v !== null && v !== undefined) {
						const n = parseFloat(v);
						if (!isNaN(n)) return true;
					}
				}
				return false;
			});

			// Build features matrix using selected keys
			const features = validData.map(row => {
				const arr = [];
				for (let i = 0; i < featureKeys.length; i++) {
					const v = row[featureKeys[i]];
					const n = parseFloat(v);
					arr.push(isNaN(n) ? 0 : n);
				}
				return arr;
			});

            // Build labels vector, map common string labels to 0/1 for binary
			const labels = validData.map(row => {
				const raw = row[labelKey];
				if (typeof raw === 'string') {
					const val = raw.trim().toLowerCase();
                    if (val === 'm' || val === 'malignant' || val === '1' || val === 'true' || val === 'yes') return 1;
                    if (val === 'b' || val === 'benign' || val === '0' || val === 'false' || val === 'no') return 0;
					const n = parseFloat(raw);
					return isNaN(n) ? 0 : (n > 0 ? 1 : 0);
				}
				const n = parseFloat(raw);
				return isNaN(n) ? 0 : (n > 0 ? 1 : 0);
			});

			// Validate feature vector length vs model input units
			const inputUnits = this.modelConfig.architecture && this.modelConfig.architecture.inputLayer ? this.modelConfig.architecture.inputLayer.units : null;
			if (typeof inputUnits === 'number' && inputUnits > 0 && features.length > 0) {
                if (features[0].length !== inputUnits) {
                    this.showError(`Feature count (${features[0].length}) does not match model input units (${inputUnits}). Excluded columns: ${[labelKey, (this.hasIdColumn ? (columns.includes('id') ? 'id' : columns[0]) : '(none)')].join(', ')}. Using numeric columns: ${featureKeys.join(', ')}`);
					console.error('Feature keys selected:', featureKeys);
					return null;
				}
			}

			// Final validation
			if (!features.every(f => Array.isArray(f) && f.length > 0)) {
				this.showError('Invalid feature data format');
				return null;
			}

            console.log('Label column:', labelKey);
            console.log('ID column:', idKey);
            console.log('Feature keys:', featureKeys);
			return { features, labels };
		} catch (err) {
			this.showError('Error preparing data: ' + err.message);
			return null;
		}
    }

    async startTraining() {
        const preparedData = this.prepareData();
        if (!preparedData) return;

        const { features, labels } = preparedData;

        // Validate data
        console.log('Features:', features);
        console.log('Features length:', features.length);
        console.log('Features[0]:', features[0]);
        console.log('Labels:', labels);
        console.log('Labels length:', labels.length);

        if (!features || !labels || features.length === 0 || labels.length === 0) {
            this.showError('Invalid training data: features or labels are empty');
            return;
        }

        // Create neural network
        const network = new NeuralNetwork(this.modelConfig);
        
        this.hideMessages();
        this.showSuccess('Starting the Neural Network...');
        this.showTrainingProgress();
        this.clearHistoryTable();
        
        this.trainingProgress = {
            isTraining: true,
            currentEpoch: 0,
            totalEpochs: this.trainingConfig.epochs,
            loss: 0,
            accuracy: 0,
            history: []
        };

        try {
            // Train the model (no validation split - assumes data is already split)
            const history = await network.train(features, labels, [], [], {
                epochs: this.trainingConfig.epochs,
                batchSize: this.trainingConfig.batchSize,
                learningRate: this.trainingConfig.learningRate,
                earlyStopping: this.trainingConfig.earlyStopping,
                patience: this.trainingConfig.patience,
                onEpochEnd: (epochData) => {
                    this.updateTrainingProgress(epochData);
                }
            });

            this.trainedModel = network;
            this.trainingProgress.isTraining = false;
            this.showSuccess('Model training completed successfully!');
            this.showTrainingComplete();
            
        } catch (err) {
            this.showError('Training error: ' + err.message);
            this.trainingProgress.isTraining = false;
        }
    }

    updateTrainingProgress(epochData) {
        this.trainingProgress.currentEpoch = epochData.epoch;
        this.trainingProgress.loss = epochData.loss;
        this.trainingProgress.accuracy = epochData.accuracy;
        this.trainingProgress.history.push(epochData);

        // Update UI
        const progressFill = document.getElementById('progress-fill');
        const progressText = document.getElementById('progress-text');

        if (progressFill) {
            const progress = (epochData.epoch / this.trainingConfig.epochs) * 100;
            progressFill.style.width = `${progress}%`;
        }

        if (progressText) {
            progressText.textContent = `Epoch ${epochData.epoch} of ${this.trainingConfig.epochs}`;
        }

        // removed unused current loss/accuracy labels (no matching DOM)

        // Add to history table
        this.addHistoryRow(epochData);
    }

    addHistoryRow(epochData) {
        const historyTableBody = document.getElementById('history-table-body');
        if (!historyTableBody) return;

        // Create new row
        const row = document.createElement('tr');
        row.style.borderBottom = '1px solid #ddd';
        
        // Highlight best epoch (lowest loss)
        const isLowestLoss = this.trainingProgress.history.every(h => 
            h.epoch === epochData.epoch || epochData.loss <= h.loss
        );
        
        if (isLowestLoss && epochData.epoch > 1) {
            row.style.backgroundColor = '#d4edda';
            row.style.fontWeight = 'bold';
        }

        row.innerHTML = `
            <td style="padding: 8px;">${epochData.epoch}</td>
            <td style="padding: 8px;">${epochData.loss.toFixed(4)}</td>
            <td style="padding: 8px;">${(epochData.accuracy * 100).toFixed(2)}%</td>
        `;

        historyTableBody.appendChild(row);

        // Auto-scroll to latest entry
        const historyContainer = document.getElementById('history-container');
        if (historyContainer) {
            historyContainer.scrollTop = historyContainer.scrollHeight;
        }
    }

    clearHistoryTable() {
        const historyTableBody = document.getElementById('history-table-body');
        if (historyTableBody) {
            historyTableBody.innerHTML = '';
        }
    }

    downloadTrainedModel() {
        if (!this.trainedModel) {
            this.showError('No trained model to download');
            return;
        }

        try {
            const modelData = this.trainedModel.save();
            const modelJSON = JSON.stringify(modelData, null, 2);
            const blob = new Blob([modelJSON], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'trained_model.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.showSuccess('Trained model downloaded successfully!');
        } catch (err) {
            this.showError('Error downloading model: ' + err.message);
        }
    }

    resetTraining() {
        this.data = null;
        this.modelConfig = null;
        this.trainedModel = null;
        this.trainingProgress = {
            isTraining: false,
            currentEpoch: 0,
            totalEpochs: 0,
            loss: 0,
            accuracy: 0,
            history: []
        };
        this.clearHistoryTable();
        this.hideMessages();
        this.hideDataInfo();
        this.hideModelInfo();
        this.hideTrainingProgress();
        this.hideTrainingComplete();
        
        const dataFileInput = document.getElementById('data-file');
        const modelFileInput = document.getElementById('model-file');
        if (dataFileInput) dataFileInput.value = '';
        if (modelFileInput) modelFileInput.value = '';
    }

    // UI Helper methods
    showError(message) {
        const errorElement = document.getElementById('train-error');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        }
    }

    showSuccess(message) {
        const successElement = document.getElementById('train-success');
        if (successElement) {
            successElement.textContent = message;
            successElement.style.display = 'block';
        }
    }

    hideMessages() {
        const errorElement = document.getElementById('train-error');
        const successElement = document.getElementById('train-success');
        if (errorElement) errorElement.style.display = 'none';
        if (successElement) successElement.style.display = 'none';
    }

    updateDataInfo() {
        if (!this.data) return;
        
        const dataInfo = document.getElementById('train-data-info');
        const dataRows = document.getElementById('train-data-rows');
        const dataFeatures = document.getElementById('train-data-features');
        
        if (dataInfo && dataRows && dataFeatures) {
            dataRows.textContent = this.data.length;
            const cols = Object.keys(this.data[0] || {});
            let labelKey = this.targetColumn && cols.includes(this.targetColumn) ? this.targetColumn : null;
            let idKey = null;
            if (this.hasIdColumn) {
                if (cols.includes('id')) idKey = 'id';
                else if (cols.length > 0 && cols[0] !== labelKey) idKey = cols[0];
            }
            const featureCandidates = cols.filter(k => k !== labelKey && k !== idKey);
            const numericFeatureKeys = featureCandidates.filter(k => {
                for (let i = 0; i < this.data.length; i++) {
                    const v = this.data[i][k];
                    if (v !== '' && v !== null && v !== undefined) {
                        const n = parseFloat(v);
                        if (!isNaN(n)) return true;
                    }
                }
                return false;
            });
            dataFeatures.textContent = numericFeatureKeys.length;
            dataInfo.style.display = 'block';
        }
    }

    hideDataInfo() {
        const dataInfo = document.getElementById('train-data-info');
        if (dataInfo) {
            dataInfo.style.display = 'none';
        }
    }

    updateModelInfo() {
        if (!this.modelConfig) return;
        
        const modelInfo = document.getElementById('train-model-info');
        const inputUnits = document.getElementById('train-input-units');
        const hiddenLayers = document.getElementById('train-hidden-layers');
        const outputUnits = document.getElementById('train-output-units');
        
        if (modelInfo && inputUnits && hiddenLayers && outputUnits) {
            inputUnits.textContent = this.modelConfig.architecture.inputLayer.units;
            hiddenLayers.textContent = this.modelConfig.architecture.hiddenLayers.length;
            outputUnits.textContent = this.modelConfig.architecture.outputLayer.units;
            modelInfo.style.display = 'block';
        }
    }

    hideModelInfo() {
        const modelInfo = document.getElementById('train-model-info');
        if (modelInfo) {
            modelInfo.style.display = 'none';
        }
    }

    showTrainingProgress() {
        const progressCard = document.getElementById('training-progress-card');
        if (progressCard) {
            progressCard.style.display = 'block';
			requestAnimationFrame(() => {
				requestAnimationFrame(() => {
					// Append a temporary sentinel at the end and scroll it into view
					const container = document.querySelector('.train .container') || document.body;
					const sentinel = document.createElement('div');
					sentinel.setAttribute('aria-hidden', 'true');
					sentinel.style.cssText = 'height:1px;';
					container.appendChild(sentinel);
					sentinel.scrollIntoView({ behavior: 'smooth', block: 'end' });
					// Fallback retries to ensure we hit the absolute bottom even if layout expands
					const forceBottom = () => {
						const se = document.scrollingElement || document.documentElement;
						const max = Math.max(0, (se.scrollHeight || 0) - window.innerHeight);
						window.scrollTo({ top: max, behavior: 'smooth' });
					};
					setTimeout(forceBottom, 60);
					setTimeout(forceBottom, 200);
					setTimeout(() => { if (sentinel.parentNode) sentinel.parentNode.removeChild(sentinel); }, 400);
				});
			});
        }
    }

    hideTrainingProgress() {
        const progressCard = document.getElementById('training-progress-card');
        if (progressCard) {
            progressCard.style.display = 'none';
        }
    }

    showTrainingComplete() {
        const completeCard = document.getElementById('training-complete-card');
        const finalLoss = document.getElementById('final-loss');
        const finalAccuracy = document.getElementById('final-accuracy');
        
        if (completeCard) {
            if (finalLoss) finalLoss.textContent = this.trainingProgress.loss.toFixed(4);
            if (finalAccuracy) finalAccuracy.textContent = (this.trainingProgress.accuracy * 100).toFixed(2) + '%';
            
            completeCard.style.display = 'block';
        }
    }

    hideTrainingComplete() {
        const completeCard = document.getElementById('training-complete-card');
        if (completeCard) {
            completeCard.style.display = 'none';
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.trainModelManager = new TrainModelManager();
});

// Expose for SPA router
window.initTrainPage = function() {
	window.trainModelManager = new TrainModelManager();
};