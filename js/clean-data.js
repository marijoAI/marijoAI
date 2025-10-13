/**
 * Clean Data Module
 * Handles CSV file upload, parsing, and data cleaning
 */

class CleanDataManager {
    constructor() {
        this.data = null;
        this.cleanedData = null;
        this.previewData = null;
        this.delimiter = 'auto';
        this.detectedDelimiter = ',';
        this.hasHeader = null;
        this.downloadOption = 'full';
        this.validationSplit = 0.2;
        this.cleaningOptions = {
            removeDuplicates: true,
            handleMissingValues: 'remove',
            normalizeData: false
        };
        
        this.init();
    }

    init() {
        // Header selection
        const headerRadios = document.querySelectorAll('input[name="hasHeader"]');
        headerRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.hasHeader = e.target.value === 'yes';
                this.toggleFileUpload();
            });
        });

        // Delimiter selection
        const delimiterSelect = document.getElementById('delimiter-select');
        const customDelimiterInput = document.getElementById('custom-delimiter');
        
        if (delimiterSelect) {
            delimiterSelect.addEventListener('change', (e) => {
                const value = e.target.value;
                if (value === 'custom') {
                    if (customDelimiterInput) {
                        customDelimiterInput.style.display = 'block';
                    }
                } else {
                    if (customDelimiterInput) {
                        customDelimiterInput.style.display = 'none';
                    }
                    this.delimiter = value;
                }
            });
        }

        if (customDelimiterInput) {
            customDelimiterInput.addEventListener('input', (e) => {
                this.delimiter = e.target.value || ',';
            });
        }

        // File upload
        const fileInput = document.getElementById('file-upload');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                this.handleFileUpload(e);
            });
        }

        // Cleaning options
        const removeDuplicatesCheckbox = document.getElementById('remove-duplicates');
        if (removeDuplicatesCheckbox) {
            // Initialize from DOM state
            this.cleaningOptions.removeDuplicates = removeDuplicatesCheckbox.checked;
            removeDuplicatesCheckbox.addEventListener('change', (e) => {
                this.cleaningOptions.removeDuplicates = e.target.checked;
            });
        }

        const missingValuesSelect = document.getElementById('missing-values');
        if (missingValuesSelect) {
            // Initialize from DOM state
            this.cleaningOptions.handleMissingValues = missingValuesSelect.value;
            missingValuesSelect.addEventListener('change', (e) => {
                this.cleaningOptions.handleMissingValues = e.target.value;
            });
        }

        const normalizeDataCheckbox = document.getElementById('normalize-data');
        if (normalizeDataCheckbox) {
            // Initialize from DOM state
            this.cleaningOptions.normalizeData = normalizeDataCheckbox.checked;
            normalizeDataCheckbox.addEventListener('change', (e) => {
                this.cleaningOptions.normalizeData = e.target.checked;
            });
        }

        // Download options
        const downloadRadios = document.querySelectorAll('input[name="downloadOption"]');
        downloadRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.downloadOption = e.target.value;
                this.toggleValidationSplit();
                this.updateDownloadButton();
            });
        });

        const validationSplitInput = document.getElementById('validation-split');
        if (validationSplitInput) {
            validationSplitInput.addEventListener('change', (e) => {
                this.validationSplit = parseFloat(e.target.value) || 0.2;
                this.updateSplitPreview();
            });
        }

        // Buttons
        const cleanDataBtn = document.getElementById('clean-data-btn');
        if (cleanDataBtn) {
            cleanDataBtn.addEventListener('click', () => {
                this.cleanData();
            });
        }

        const resetBtn = document.getElementById('reset-data-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.resetData();
            });
        }

        const downloadBtn = document.getElementById('download-btn');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', () => {
                this.downloadCleanedData();
            });
        }
    }

    toggleFileUpload() {
        const fileInput = document.getElementById('file-upload');
        if (fileInput) {
            fileInput.style.display = this.hasHeader !== null ? 'block' : 'none';
        }
    }

    handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (this.hasHeader === null) {
            this.showError('Please first select whether your file has a header row');
            return;
        }

        this.showLoading(true);
        this.hideMessages();

        // Determine which delimiter to use
        let delimiterToUse;
        
        if (this.delimiter === 'auto') {
            // Auto-detect delimiter
            const reader = new FileReader();
            reader.onload = (e) => {
                const text = e.target.result;
                const lines = text.split('\n').slice(0, 5);
                
                const delimiters = [',', ';', '\t', '|'];
                let bestDelimiter = ',';
                let maxFields = 0;
                
                for (const delimiter of delimiters) {
                    const fieldCounts = lines.map(line => line.split(delimiter).length);
                    const avgFields = fieldCounts.reduce((sum, count) => sum + count, 0) / fieldCounts.length;
                    
                    if (avgFields > maxFields && avgFields > 1) {
                        maxFields = avgFields;
                        bestDelimiter = delimiter;
                    }
                }

                this.detectedDelimiter = bestDelimiter;
                this.parseFile(file, bestDelimiter);
            };
            
            const blob = file.slice(0, 1024);
            reader.readAsText(blob);
        } else {
            // Use user-specified delimiter
            delimiterToUse = this.delimiter === '\\t' ? '\t' : this.delimiter;
            this.detectedDelimiter = delimiterToUse;
            this.parseFile(file, delimiterToUse);
        }
    }

    parseFile(file, delimiter) {
        // Parse CSV with better error handling
        Papa.parse(file, {
            header: this.hasHeader,
            delimiter: delimiter,
            skipEmptyLines: 'greedy',
            transformHeader: this.hasHeader ? (header) => header.trim() : undefined,
            transform: (value) => value.trim(),
            complete: (results) => {
                this.handleParseComplete(results, delimiter);
            },
            error: (error) => {
                this.showLoading(false);
                this.showError('Error reading file: ' + error.message);
            }
        });
    }

    handleParseComplete(results, delimiter) {
        this.showLoading(false);
        
        // Filter out field count errors (too common with CSV files that have trailing commas)
        const criticalErrors = results.errors.filter(err => 
            !err.message.includes('Too few fields') && 
            !err.message.includes('Too many fields')
        );
        
        if (criticalErrors.length > 0) {
            const errorMessages = criticalErrors.map(err => err.message).join(', ');
            this.showError(`Error parsing CSV file: ${errorMessages}. Detected delimiter: "${delimiter}". Please check your file format.`);
            return;
        }
        
        if (!results.data || results.data.length === 0) {
            this.showError('No data found in the CSV file. Please check the file format.');
            return;
        }
        
        const filteredData = results.data.filter(row => 
            Object.values(row).some(value => value && value.toString().trim() !== '')
        );
        
        if (filteredData.length === 0) {
            this.showError('No valid data rows found in the CSV file.');
            return;
        }
        
        if (!this.hasHeader && filteredData.length > 0) {
            const numColumns = Object.keys(filteredData[0]).length;
            const genericHeaders = {};
            for (let i = 0; i < numColumns; i++) {
                genericHeaders[i] = `Column_${i + 1}`;
            }
            
            const dataWithHeaders = filteredData.map(row => {
                const newRow = {};
                Object.keys(row).forEach((key, index) => {
                    newRow[genericHeaders[index]] = row[key];
                });
                return newRow;
            });
            
            this.data = dataWithHeaders;
            this.previewData = dataWithHeaders.slice(0, 10);
            this.showSuccess(`Successfully loaded ${dataWithHeaders.length} rows of data (${numColumns} columns). No header row detected - using generic column names. Detected delimiter: "${delimiter}"`);
        } else {
            this.data = filteredData;
            this.previewData = filteredData.slice(0, 10);
            this.showSuccess(`Successfully loaded ${filteredData.length} rows of data (${Object.keys(filteredData[0]).length} columns). Detected delimiter: "${delimiter}"`);
        }
        
        this.updateDataInfo();
        this.showDataPreview();
    }

    cleanData() {
        if (!this.data) {
            this.showError('Please upload a file first');
            return;
        }

        this.showLoading(true);
        this.hideMessages();

        try {
            let cleaned = [...this.data];
            let stats = {
                originalRows: this.data.length,
                removedDuplicates: 0,
                removedMissing: 0,
                removedOutliers: 0,
                normalizedColumns: [],
                encodedColumns: []
            };

            // Remove duplicates
            if (this.cleaningOptions.removeDuplicates) {
                const uniqueRows = [];
                const seen = new Set();
                
                cleaned.forEach(row => {
                    const key = JSON.stringify(row);
                    if (!seen.has(key)) {
                        seen.add(key);
                        uniqueRows.push(row);
                    }
                });
                
                stats.removedDuplicates = cleaned.length - uniqueRows.length;
                cleaned = uniqueRows;
            }

            // Handle missing values
            if (this.cleaningOptions.handleMissingValues !== 'none') {
                const columns = Object.keys(cleaned[0] || {});
                const numericColumns = columns.filter(col => 
                    cleaned.some(row => !isNaN(parseFloat(row[col])) && row[col] !== '')
                );

                if (this.cleaningOptions.handleMissingValues === 'remove') {
                    cleaned = cleaned.filter(row => 
                        Object.values(row).every(value => value !== '' && value !== null && value !== undefined)
                    );
                    stats.removedMissing = this.data.length - cleaned.length;
                } else {
                    numericColumns.forEach(col => {
                        const values = cleaned
                            .map(row => parseFloat(row[col]))
                            .filter(val => !isNaN(val));
                        
                        if (values.length === 0) return;

                        let fillValue;
                        if (this.cleaningOptions.handleMissingValues === 'mean') {
                            fillValue = values.reduce((a, b) => a + b, 0) / values.length;
                        } else if (this.cleaningOptions.handleMissingValues === 'median') {
                            const sorted = values.sort((a, b) => a - b);
                            fillValue = sorted[Math.floor(sorted.length / 2)];
                        } else if (this.cleaningOptions.handleMissingValues === 'mode') {
                            const frequency = {};
                            values.forEach(val => frequency[val] = (frequency[val] || 0) + 1);
                            fillValue = Object.keys(frequency).reduce((a, b) => 
                                frequency[a] > frequency[b] ? a : b
                            );
                        }

                        cleaned.forEach(row => {
                            if (row[col] === '' || row[col] === null || row[col] === undefined) {
                                row[col] = fillValue;
                            }
                        });
                    });
                }
            }

            // Detect column types before encoding/normalization
            const allColumns = Object.keys(cleaned[0] || {});
            const isNumericColumn = (col) => {
                for (let i = 0; i < cleaned.length; i++) {
                    const v = cleaned[i][col];
                    if (v === '' || v === null || v === undefined) continue;
                    const n = parseFloat(v);
                    if (isNaN(n) || !isFinite(n)) return false;
                }
                return true;
            };
            const numericColumnsOriginal = allColumns.filter(col => isNumericColumn(col));
            const categoricalColumnsOriginal = allColumns.filter(col => !numericColumnsOriginal.includes(col));

            // Encode categorical/string columns to numeric labels
            if (categoricalColumnsOriginal.length > 0) {
                categoricalColumnsOriginal.forEach(col => {
                    // Build label map for distinct non-empty values
                    const labelMap = {};
                    let nextCode = 0;
                    for (let i = 0; i < cleaned.length; i++) {
                        const raw = cleaned[i][col];
                        if (raw === '' || raw === null || raw === undefined) continue;
                        const key = String(raw).trim();
                        if (!(key in labelMap)) {
                            labelMap[key] = nextCode++;
                        }
                    }
                    // Apply encoding
                    for (let i = 0; i < cleaned.length; i++) {
                        const raw = cleaned[i][col];
                        if (raw === '' || raw === null || raw === undefined) continue;
                        const key = String(raw).trim();
                        cleaned[i][col] = labelMap[key];
                    }
                    if (Object.keys(labelMap).length > 0) {
                        stats.encodedColumns.push(col);
                    }
                });
            }

            // Normalize numeric columns to 0-1 (only original numeric columns)
            if (this.cleaningOptions.normalizeData && numericColumnsOriginal.length > 0) {
                numericColumnsOriginal.forEach(col => {
                    const values = [];
                    for (let i = 0; i < cleaned.length; i++) {
                        const n = parseFloat(cleaned[i][col]);
                        if (!isNaN(n) && isFinite(n)) values.push(n);
                    }
                    if (values.length === 0) return;
                    const min = Math.min(...values);
                    const max = Math.max(...values);
                    if (max === min) return;

                    for (let i = 0; i < cleaned.length; i++) {
                        const n = parseFloat(cleaned[i][col]);
                        if (isNaN(n) || !isFinite(n)) continue;
                        let scaled = (n - min) / (max - min);
                        if (scaled < 0) scaled = 0;
                        if (scaled > 1) scaled = 1;
                        cleaned[i][col] = scaled;
                    }
                    stats.normalizedColumns.push(col);
                });
            }

            this.cleanedData = cleaned;
            this.previewData = cleaned.slice(0, 10);
            const parts = [`Final dataset: ${cleaned.length} rows`];
            if (stats.normalizedColumns.length > 0) parts.push(`normalized: ${stats.normalizedColumns.join(', ')}`);
            if (stats.encodedColumns.length > 0) parts.push(`encoded: ${stats.encodedColumns.join(', ')}`);
            this.showSuccess(`Data cleaned successfully! ${parts.join(' • ')}`);
            
            this.showDataPreview();
            this.showDownloadOptions();
            
            // Scroll to download section
            setTimeout(() => {
                const downloadCard = document.getElementById('download-card');
                if (downloadCard) {
                    downloadCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, 300);
            
        } catch (err) {
            this.showError('Error cleaning data: ' + err.message);
        } finally {
            this.showLoading(false);
        }
    }

    downloadCleanedData() {
        if (!this.cleanedData) {
            this.showError('No cleaned data to download');
            return;
        }

        if (this.downloadOption === 'full') {
            const csv = Papa.unparse(this.cleanedData);
            this.downloadCSV(csv, 'cleaned_data.csv');
            this.showSuccess('Full cleaned dataset downloaded successfully!');
        } else {
            const splitIndex = Math.floor(this.cleanedData.length * (1 - this.validationSplit));
            
            const trainingData = this.cleanedData.slice(0, splitIndex);
            const validationData = this.cleanedData.slice(splitIndex);
            
            const trainingCsv = Papa.unparse(trainingData);
            const validationCsv = Papa.unparse(validationData);
            
            this.downloadCSV(trainingCsv, 'training_data.csv');
            this.downloadCSV(validationCsv, 'validation_data.csv');
            
            this.showSuccess(`Training and validation datasets downloaded successfully! Training: ${trainingData.length} rows, Validation: ${validationData.length} rows`);
        }
    }

    downloadCSV(csv, filename) {
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    resetData() {
        this.data = null;
        this.cleanedData = null;
        this.previewData = null;
        this.hideMessages();
        this.hideDataInfo();
        this.hideDataPreview();
        this.hideDownloadOptions();
        
        const fileInput = document.getElementById('file-upload');
        if (fileInput) {
            fileInput.value = '';
        }
        
        const headerRadios = document.querySelectorAll('input[name="hasHeader"]');
        headerRadios.forEach(radio => {
            radio.checked = false;
        });
        this.hasHeader = null;
        this.toggleFileUpload();
    }

    // UI Helper methods
    showLoading(show) {
        const loadingContainer = document.getElementById('loading-container');
        if (loadingContainer) {
            loadingContainer.style.display = show ? 'flex' : 'none';
        }
    }

    showError(message) {
        const errorElement = document.getElementById('error-message');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        }
    }

    showSuccess(message) {
        const successElement = document.getElementById('success-message');
        if (successElement) {
            successElement.textContent = message;
            successElement.style.display = 'block';
        }
    }

    hideMessages() {
        const errorElement = document.getElementById('error-message');
        const successElement = document.getElementById('success-message');
        if (errorElement) errorElement.style.display = 'none';
        if (successElement) successElement.style.display = 'none';
    }

    updateDataInfo() {
        if (!this.data) return;
        
        const dataInfo = document.getElementById('data-info');
        const dataRows = document.getElementById('data-rows');
        const dataColumns = document.getElementById('data-columns');
        const dataColumnNames = document.getElementById('data-column-names');
        
        if (dataInfo && dataRows && dataColumns && dataColumnNames) {
            dataRows.textContent = this.data.length;
            dataColumns.textContent = Object.keys(this.data[0] || {}).length;
            dataColumnNames.textContent = Object.keys(this.data[0] || {}).join(', ');
            dataInfo.style.display = 'block';
        }
    }

    hideDataInfo() {
        const dataInfo = document.getElementById('data-info');
        if (dataInfo) {
            dataInfo.style.display = 'none';
        }
    }

    showDataPreview() {
        if (!this.previewData) return;
        
        const previewCard = document.getElementById('data-preview-card');
        const previewTable = document.getElementById('preview-table');
        const previewNote = document.getElementById('preview-note');
        
        if (previewCard && previewTable && previewNote) {
            const thead = previewTable.querySelector('thead');
            const tbody = previewTable.querySelector('tbody');
            
            // Clear existing content
            thead.innerHTML = '';
            tbody.innerHTML = '';
            
            // Add headers
            const headerRow = document.createElement('tr');
            Object.keys(this.previewData[0] || {}).forEach(col => {
                const th = document.createElement('th');
                th.textContent = col;
                headerRow.appendChild(th);
            });
            thead.appendChild(headerRow);
            
            // Add data rows
            this.previewData.forEach(row => {
                const tr = document.createElement('tr');
                Object.values(row).forEach(value => {
                    const td = document.createElement('td');
                    td.textContent = value;
                    tr.appendChild(td);
                });
                tbody.appendChild(tr);
            });
            
            previewNote.textContent = `Showing first 10 rows of ${this.cleanedData ? 'cleaned' : 'original'} data`;
            previewCard.style.display = 'block';
        }
    }

    hideDataPreview() {
        const previewCard = document.getElementById('data-preview-card');
        if (previewCard) {
            previewCard.style.display = 'none';
        }
    }

    showDownloadOptions() {
        const downloadCard = document.getElementById('download-card');
        if (downloadCard) {
            downloadCard.style.display = 'block';
        }
    }

    hideDownloadOptions() {
        const downloadCard = document.getElementById('download-card');
        if (downloadCard) {
            downloadCard.style.display = 'none';
        }
    }

    toggleValidationSplit() {
        const validationSplitGroup = document.getElementById('validation-split-group');
        if (validationSplitGroup) {
            validationSplitGroup.style.display = this.downloadOption === 'split' ? 'block' : 'none';
        }
    }

    updateDownloadButton() {
        const downloadBtn = document.getElementById('download-btn');
        if (downloadBtn) {
            downloadBtn.textContent = this.downloadOption === 'full' ? 
                'Download Full Dataset' : 
                'Download Training & Validation Datasets';
        }
    }

    updateSplitPreview() {
        if (!this.cleanedData) return;
        
        const trainingRows = document.getElementById('training-rows');
        const validationRows = document.getElementById('validation-rows');
        const trainingPercent = document.getElementById('training-percent');
        const validationPercent = document.getElementById('validation-percent');
        
        if (trainingRows && validationRows && trainingPercent && validationPercent) {
            const trainingCount = Math.floor(this.cleanedData.length * (1 - this.validationSplit));
            const validationCount = Math.ceil(this.cleanedData.length * this.validationSplit);
            
            trainingRows.textContent = trainingCount;
            validationRows.textContent = validationCount;
            trainingPercent.textContent = ((1 - this.validationSplit) * 100).toFixed(0);
            validationPercent.textContent = (this.validationSplit * 100).toFixed(0);
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.cleanDataManager = new CleanDataManager();
});
