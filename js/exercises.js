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

    initializeExerciseCards() {}

}

// Initialize exercises manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.exercisesManager = new ExercisesManager();
});

// Export for use in other modules
window.ExercisesManager = ExercisesManager;

// Expose for SPA router
window.initExercisesPage = function() {
	window.exercisesManager = new ExercisesManager();
};