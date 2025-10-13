/**
 * Exercises Module
 * Handles exercises page functionality
 */

class ExercisesManager {
    constructor() {
        this.init();
    }

    init() {
        // Initialize basic functionality
        this.initializeExerciseCards();
    }

    initializeExerciseCards() {
        // Remove any click handlers for progress tracking
        // Exercise cards are now just for display
    }


    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // Style the notification
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '12px 20px',
            borderRadius: '8px',
            color: 'white',
            fontWeight: '500',
            zIndex: '10000',
            opacity: '0',
            transform: 'translateX(100%)',
            transition: 'all 0.3s ease',
            maxWidth: '300px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
        });

        // Set background color based on type
        switch (type) {
            case 'success':
                notification.style.background = 'linear-gradient(135deg, #4caf50, #45a049)';
                break;
            case 'error':
                notification.style.background = 'linear-gradient(135deg, #f44336, #d32f2f)';
                break;
            case 'warning':
                notification.style.background = 'linear-gradient(135deg, #ff9800, #f57c00)';
                break;
            default:
                notification.style.background = 'linear-gradient(135deg, #2196f3, #1976d2)';
        }

        // Add to page
        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateX(0)';
        }, 100);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

}

// Initialize exercises manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.exercisesManager = new ExercisesManager();
});

// Export for use in other modules
window.ExercisesManager = ExercisesManager;
