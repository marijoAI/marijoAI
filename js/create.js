/**
 * Create Model Module
 * Handles neural network model creation and configuration
 */

class CreateModelManager {
    constructor() {
        this.modelConfig = {
            inputLayer: {
				units: 10
            },
            hiddenLayers: [
                {
                    id: 1,
                    units: 64,
					activation: 'relu'
                }
            ],
            outputLayer: {
				units: 1
            }
        };
        this.nextLayerId = 2;
        this.activationFunctions = [
            { value: 'relu', label: 'ReLU' },
            { value: 'sigmoid', label: 'Sigmoid' },
            { value: 'tanh', label: 'Tanh' },
            { value: 'softmax', label: 'Softmax' },
            { value: 'linear', label: 'Linear' },
            { value: 'elu', label: 'ELU' },
            { value: 'selu', label: 'SELU' },
            { value: 'swish', label: 'Swish' }
        ];
        
        this.init();
    }

    init() {
        // Input layer controls
        const inputUnits = document.getElementById('input-units');
        if (inputUnits) {
            inputUnits.addEventListener('input', (e) => {
                this.modelConfig.inputLayer.units = parseInt(e.target.value) || 1;
                this.updateModelPreview();
                this.updateModelStats();
                this.updateJSONPreview();
            });
        }

        // Output layer controls
        const outputUnits = document.getElementById('output-units');
        if (outputUnits) {
            outputUnits.addEventListener('input', (e) => {
                this.modelConfig.outputLayer.units = parseInt(e.target.value) || 1;
                this.updateModelPreview();
                this.updateModelStats();
                this.updateJSONPreview();
            });
        }

        // Add layer button
        const addLayerBtn = document.getElementById('add-layer-btn');
        if (addLayerBtn) {
            addLayerBtn.addEventListener('click', () => {
                this.addHiddenLayer();
            });
        }

        // Download model button
        const downloadModelBtn = document.getElementById('download-model-btn');
        if (downloadModelBtn) {
            downloadModelBtn.addEventListener('click', () => {
                this.downloadModel();
            });
        }

        // Ensure hidden layers UI is rendered and event listeners are attached
        // so changes (e.g., units) apply immediately without needing to add a new layer.
        this.renderHiddenLayers();

        // Initialize the UI
        this.updateModelPreview();
        this.updateModelStats();
        this.updateJSONPreview();
    }

    addHiddenLayer() {
        // Persist any in-progress edits from the DOM before re-rendering
        this.syncHiddenLayersFromDOM();

        const newLayer = {
            id: this.nextLayerId,
            units: 32,
			activation: 'relu'
        };
        
        this.modelConfig.hiddenLayers.push(newLayer);
        this.nextLayerId++;
        
        this.renderHiddenLayers();
        this.updateModelPreview();
        this.updateModelStats();
        this.updateJSONPreview();
    }

    removeHiddenLayer(layerId) {
        // Persist any in-progress edits from the DOM before re-rendering
        this.syncHiddenLayersFromDOM();

        this.modelConfig.hiddenLayers = this.modelConfig.hiddenLayers.filter(layer => layer.id !== layerId);
        
        this.renderHiddenLayers();
        this.updateModelPreview();
        this.updateModelStats();
        this.updateJSONPreview();
    }

    updateHiddenLayer(layerId, field, value) {
        const layer = this.modelConfig.hiddenLayers.find(l => l.id === layerId);
        if (layer) {
            layer[field] = field === 'units' ? parseInt(value) || 1 : value;
            this.updateModelPreview();
            this.updateModelStats();
            this.updateJSONPreview();
        }
    }

    // Syncs current values from the DOM into modelConfig to avoid losing unsaved edits
    syncHiddenLayersFromDOM() {
        const container = document.getElementById('hidden-layers-container');
        if (!container) return;

        this.modelConfig.hiddenLayers = this.modelConfig.hiddenLayers.map(layer => {
            const unitsInput = container.querySelector(`#units-${layer.id}`);
            const activationSelect = container.querySelector(`#activation-${layer.id}`);

            return {
                ...layer,
                units: unitsInput ? (parseInt(unitsInput.value) || 1) : layer.units,
				activation: activationSelect ? activationSelect.value : layer.activation
            };
        });
    }

    renderHiddenLayers() {
        const container = document.getElementById('hidden-layers-container');
        if (!container) return;

        container.innerHTML = '';

        this.modelConfig.hiddenLayers.forEach((layer, index) => {
            const layerDiv = document.createElement('div');
            layerDiv.className = 'hidden-layer';
            layerDiv.setAttribute('data-layer-id', layer.id);
            
            layerDiv.innerHTML = `
                <div class="layer-title">
                    <span>Hidden Layer ${index + 1}</span>
                    <button class="btn btn-secondary btn-small remove-layer-btn">Remove</button>
                </div>
                
                <div class="form-group">
                    <label for="units-${layer.id}">Units:</label>
                    <input type="number" id="units-${layer.id}" value="${layer.units}" min="1" />
                </div>
                
                <div class="form-group">
                    <label for="activation-${layer.id}">Activation function:</label>
                    <select id="activation-${layer.id}">
                        ${this.activationFunctions.map(func => 
                            `<option value="${func.value}" ${func.value === layer.activation ? 'selected' : ''}>${func.label}</option>`
                        ).join('')}
                    </select>
                </div>
            `;
            
            container.appendChild(layerDiv);

            // Add event listeners
            const unitsInput = layerDiv.querySelector(`#units-${layer.id}`);
            const activationSelect = layerDiv.querySelector(`#activation-${layer.id}`);
            const removeBtn = layerDiv.querySelector('.remove-layer-btn');

            unitsInput.addEventListener('input', (e) => {
                this.updateHiddenLayer(layer.id, 'units', e.target.value);
            });

            activationSelect.addEventListener('change', (e) => {
                this.updateHiddenLayer(layer.id, 'activation', e.target.value);
            });

            removeBtn.addEventListener('click', () => {
                this.removeHiddenLayer(layer.id);
            });
        });
    }

    updateModelPreview() {
        // Update input layer details
        const inputDetails = document.getElementById('input-details');
        if (inputDetails) {
            inputDetails.textContent = `${this.modelConfig.inputLayer.units} features`;
        }

        // Update hidden layers visualization
        const hiddenLayersVisual = document.getElementById('hidden-layers-visual');
        if (hiddenLayersVisual) {
            hiddenLayersVisual.innerHTML = '';
            
            this.modelConfig.hiddenLayers.forEach((layer, index) => {
                const layerDiv = document.createElement('div');
                layerDiv.className = 'layer-visual hidden-layer-visual';
                layerDiv.innerHTML = `
                    <div class="layer-box">
						<div class="layer-name">Hidden Layer ${index + 1}</div>
                        <div class="layer-details">${layer.units} units • ${layer.activation}</div>
                    </div>
                `;
                hiddenLayersVisual.appendChild(layerDiv);
            });
        }

        // Update output layer details
        const outputDetails = document.getElementById('output-details');
        if (outputDetails) {
			outputDetails.textContent = `${this.modelConfig.outputLayer.units} outputs • ${this.getOutputActivation()}`;
        }
    }

    updateModelStats() {
        const totalParameters = this.getTotalParameters();
        const hiddenLayersCount = this.modelConfig.hiddenLayers.length;
        const totalLayers = hiddenLayersCount + 2;

        const totalParametersEl = document.getElementById('total-parameters');
        const hiddenLayersCountEl = document.getElementById('hidden-layers-count');
        const totalLayersEl = document.getElementById('total-layers');

        if (totalParametersEl) {
            totalParametersEl.textContent = totalParameters.toLocaleString();
        }
        if (hiddenLayersCountEl) {
            hiddenLayersCountEl.textContent = hiddenLayersCount;
        }
        if (totalLayersEl) {
            totalLayersEl.textContent = totalLayers;
        }
    }

    getTotalParameters() {
        let total = 0;
        let prevUnits = this.modelConfig.inputLayer.units;
        
        // Input layer parameters
        total += prevUnits;
        
        // Hidden layers parameters
        this.modelConfig.hiddenLayers.forEach(layer => {
            total += prevUnits * layer.units + layer.units; // weights + biases
            prevUnits = layer.units;
        });
        
        // Output layer parameters
        total += prevUnits * this.modelConfig.outputLayer.units + this.modelConfig.outputLayer.units;
        
        return total;
    }

    generateModelJSON() {
        const modelStructure = {
            name: 'Custom Neural Network',
            version: '1.0',
            created: new Date().toISOString(),
            architecture: {
                inputLayer: {
                    type: 'dense',
					units: parseInt(this.modelConfig.inputLayer.units)
                },
                hiddenLayers: this.modelConfig.hiddenLayers.map(layer => ({
                    type: 'dense',
                    units: parseInt(layer.units),
					activation: layer.activation
                })),
                outputLayer: {
                    type: 'dense',
                    units: parseInt(this.modelConfig.outputLayer.units),
					activation: this.getOutputActivation()
                }
            },
            trainingConfig: {
                optimizer: 'adam',
                loss: this.modelConfig.outputLayer.units === 1 ? 'binaryCrossentropy' : 'categoricalCrossentropy',
                metrics: ['accuracy']
            }
        };

        return JSON.stringify(modelStructure, null, 2);
    }

	getOutputActivation() {
		return (this.modelConfig.outputLayer.units === 1) ? 'sigmoid' : 'softmax';
	}

    updateJSONPreview() {
        const jsonPreview = document.getElementById('json-preview');
        if (jsonPreview) {
            jsonPreview.textContent = this.generateModelJSON();
        }
    }

    downloadModel() {
        const modelJSON = this.generateModelJSON();
        const blob = new Blob([modelJSON], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'neural_network_model.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.createModelManager = new CreateModelManager();
});

// Expose for SPA router
window.initCreatePage = function() {
	window.createModelManager = new CreateModelManager();
};