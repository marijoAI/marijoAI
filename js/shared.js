/**
 * Shared JavaScript Module
 * Common functionality used across all pages
 */

class SharedUtils {
    constructor() {
        this.init();
    }

    init() {
        document.addEventListener('DOMContentLoaded', () => {
            this.initializeGlobalEventListeners();
            this.setInitialStyles();
        });
    }

    initializeGlobalEventListeners() {
        document.addEventListener('click', (e) => {
            if (e.target.matches('.btn')) {
                e.target.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    e.target.style.transform = '';
                }, 150);
            }

            const toggle = e.target.closest && e.target.closest('.nav-toggle');
            if (toggle) {
                const header = document.querySelector('.header');
                if (header) {
                    const open = !header.classList.contains('nav-open');
                    header.classList.toggle('nav-open', open);
                    toggle.setAttribute('aria-expanded', String(open));
                }
            }

            if (e.target.matches('.nav-link')) {
                const header = document.querySelector('.header');
                const toggleBtn = document.querySelector('.nav-toggle');
                if (header && header.classList.contains('nav-open')) {
                    header.classList.remove('nav-open');
                    if (toggleBtn) toggleBtn.setAttribute('aria-expanded', 'false');
                }
            }
        });
    }

    setInitialStyles() {
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.style.paddingTop = '80px';
            mainContent.style.minHeight = 'calc(100vh - 80px)';
        }
    }
}

const sharedUtils = new SharedUtils();
window.sharedUtils = sharedUtils;

