/**
 * Shared JavaScript Module
 * Common functionality used across all pages
 */

class SharedUtils {
    constructor() {
        this.init();
    }

    init() {
        // Wait for DOM to be fully loaded
        document.addEventListener('DOMContentLoaded', () => {
            this.initializeGlobalEventListeners();
            this.setInitialStyles();
        });
    }

    initializeGlobalEventListeners() {
        // Handle file input changes globally
        document.addEventListener('change', (e) => {
            if (e.target.matches('input[type="file"]')) {
                const file = e.target.files[0];
                if (file) {
                    console.log(`File selected: ${file.name} (${file.size} bytes)`);
                }
            }
        });

        // Handle button clicks globally
        document.addEventListener('click', (e) => {
            if (e.target.matches('.btn')) {
                // Add click animation
                e.target.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    e.target.style.transform = '';
                }, 150);
            }
        });

        // Handle form submissions
        document.addEventListener('submit', (e) => {
            e.preventDefault();
        });
    }

    setInitialStyles() {
        // Set the main content padding to account for fixed header
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.style.paddingTop = '80px';
            mainContent.style.minHeight = 'calc(100vh - 80px)';
        }
    }

    // Utility methods
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // Style the notification
        Object.assign(notification.style, {
            position: 'fixed',
            top: '100px',
            right: '20px',
            padding: '15px 20px',
            borderRadius: '8px',
            color: 'white',
            fontWeight: '600',
            zIndex: '10000',
            transform: 'translateX(100%)',
            transition: 'transform 0.3s ease'
        });

        // Set background color based on type
        switch (type) {
            case 'success':
                notification.style.background = 'linear-gradient(45deg, #27ae60, #2ecc71)';
                break;
            case 'error':
                notification.style.background = 'linear-gradient(45deg, #e74c3c, #c0392b)';
                break;
            case 'warning':
                notification.style.background = 'linear-gradient(45deg, #f39c12, #e67e22)';
                break;
            default:
                notification.style.background = 'linear-gradient(45deg, #3498db, #2980b9)';
        }

        // Add to DOM
        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    // Global error handler
    handleError(error, context = '') {
        console.error(`Error in ${context}:`, error);
        this.showNotification(`An error occurred: ${error.message}`, 'error');
    }

    // Global success handler
    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    // Global warning handler
    showWarning(message) {
        this.showNotification(message, 'warning');
    }

    // Utility function to download data as CSV
    downloadCSV(data, filename) {
        const csvContent = this.arrayToCSV(data);
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }

    // Convert array to CSV format
    arrayToCSV(data) {
        if (!data || data.length === 0) return '';
        
        const headers = Object.keys(data[0]);
        const csvRows = [headers.join(',')];
        
        for (const row of data) {
            const values = headers.map(header => {
                const value = row[header];
                // Escape commas and quotes in CSV
                if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                    return `"${value.replace(/"/g, '""')}"`;
                }
                return value;
            });
            csvRows.push(values.join(','));
        }
        
        return csvRows.join('\n');
    }

    // Utility function to download JSON data
    downloadJSON(data, filename) {
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
        const link = document.createElement('a');
        
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }

    // Format file size for display
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Validate CSV file
    validateCSVFile(file) {
        const maxSize = 10 * 1024 * 1024; // 10MB
        const allowedTypes = ['text/csv', 'application/vnd.ms-excel'];
        
        if (!file) {
            throw new Error('No file selected');
        }
        
        if (file.size > maxSize) {
            throw new Error('File size too large. Maximum size is 10MB');
        }
        
        if (!allowedTypes.includes(file.type) && !file.name.toLowerCase().endsWith('.csv')) {
            throw new Error('Please select a CSV file');
        }
        
        return true;
    }

    // Parse CSV file using Papa Parse
    parseCSV(file, hasHeader = true) {
        return new Promise((resolve, reject) => {
            Papa.parse(file, {
                header: hasHeader,
                skipEmptyLines: true,
                complete: (results) => {
                    if (results.errors.length > 0) {
                        reject(new Error(`CSV parsing error: ${results.errors[0].message}`));
                    } else {
                        resolve(results.data);
                    }
                },
                error: (error) => {
                    reject(new Error(`Failed to parse CSV: ${error.message}`));
                }
            });
        });
    }

    // Calculate basic statistics for numerical columns
    calculateStatistics(data) {
        if (!data || data.length === 0) return {};
        
        const stats = {};
        const headers = Object.keys(data[0]);
        
        headers.forEach(header => {
            const values = data.map(row => parseFloat(row[header])).filter(val => !isNaN(val));
            
            if (values.length > 0) {
                stats[header] = {
                    count: values.length,
                    mean: values.reduce((a, b) => a + b, 0) / values.length,
                    min: Math.min(...values),
                    max: Math.max(...values),
                    std: Math.sqrt(values.reduce((sq, n) => sq + Math.pow(n - (values.reduce((a, b) => a + b, 0) / values.length), 2), 0) / values.length)
                };
            }
        });
        
        return stats;
    }

    // Check if column is numerical
    isNumerical(values) {
        return values.every(val => !isNaN(parseFloat(val)) && isFinite(parseFloat(val)));
    }

    // Generate random data for testing
    generateSampleData(rows = 100, features = 5) {
        const data = [];
        const headers = Array.from({length: features}, (_, i) => `feature_${i + 1}`);
        headers.push('target');
        
        for (let i = 0; i < rows; i++) {
            const row = {};
            headers.forEach(header => {
                if (header === 'target') {
                    // Binary classification target
                    row[header] = Math.random() > 0.5 ? 1 : 0;
                } else {
                    // Random feature values
                    row[header] = (Math.random() * 10 - 5).toFixed(3);
                }
            });
            data.push(row);
        }
        
        return data;
    }

    // Debounce function for performance optimization
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Throttle function for performance optimization
    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
}

// Initialize shared utilities
const sharedUtils = new SharedUtils();

// Export for global access
window.sharedUtils = sharedUtils;

