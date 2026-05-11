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
            this.initNoCookiesBanner();
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

            if (e.target.matches('.banner-dismiss')) {
                const banner = document.getElementById('no-cookies-banner');
                if (banner) {
                    banner.style.display = 'none';
                }
                try {
                    localStorage.setItem('noCookiesBannerDismissed', '1');
                } catch (err) {}
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

    initNoCookiesBanner() {
        try {
            const dismissed = localStorage.getItem('noCookiesBannerDismissed') === '1';
            if (dismissed) return;
        } catch (e) {
            // localStorage may be unavailable in some contexts; fail open (show banner)
        }
        const banner = document.getElementById('no-cookies-banner');
        if (banner) {
            banner.style.display = 'block';
        }
    }
}

const sharedUtils = new SharedUtils();
window.sharedUtils = sharedUtils;

/**
 * Feature encoding for the churn NN: min–max numeric columns and one-hot for
 * categorical string columns. Shared by train and predict so saved models match.
 */
(function () {
    const ML = {};

    /**
     * True when every non-empty cell parses to a finite number (strict).
     * Empty cells are ignored.
     */
    ML.isNumericColumn = function (rows, key) {
        for (let r = 0; r < rows.length; r++) {
            const v = rows[r][key];
            if (v === '' || v === null || v === undefined) continue;
            const n = parseFloat(v);
            if (isNaN(n) || !isFinite(n)) return false;
        }
        return true;
    };

    ML.collectCategories = function (rows, key) {
        const set = new Set();
        for (let i = 0; i < rows.length; i++) {
            const v = rows[i][key];
            if (v === '' || v === null || v === undefined) continue;
            set.add(String(v).trim());
        }
        return Array.from(set).sort();
    };

    /**
     * @param {string[]} candidateKeys column order (excludes label and id)
     * @param {object[]} trainRows rows used to learn categories and stats
     * @returns {Array<{kind:'numeric',key:string}|{kind:'onehot',key:string,categories:string[]}>}
     */
    ML.buildFeaturePipeline = function (candidateKeys, trainRows) {
        const pipeline = [];
        for (let i = 0; i < candidateKeys.length; i++) {
            const key = candidateKeys[i];
            if (ML.isNumericColumn(trainRows, key)) {
                pipeline.push({ kind: 'numeric', key });
            } else {
                const categories = ML.collectCategories(trainRows, key);
                if (categories.length === 0) {
                    pipeline.push({ kind: 'numeric', key });
                } else {
                    pipeline.push({ kind: 'onehot', key, categories });
                }
            }
        }
        return pipeline;
    };

    ML.pipelineInputDimension = function (pipeline) {
        let n = 0;
        for (let i = 0; i < pipeline.length; i++) {
            const col = pipeline[i];
            if (col.kind === 'numeric') n += 1;
            else if (col.kind === 'onehot') n += col.categories.length;
        }
        return n;
    };

    /** One label per input dimension (for importance / “biggest driver” UI). */
    ML.pipelineExplainLabels = function (pipeline) {
        const labels = [];
        for (let i = 0; i < pipeline.length; i++) {
            const col = pipeline[i];
            if (col.kind === 'numeric') {
                labels.push(col.key);
            } else {
                for (let j = 0; j < col.categories.length; j++) {
                    labels.push(col.key + '=' + col.categories[j]);
                }
            }
        }
        return labels;
    };

    /**
     * @param {object} mins maxs means keyed by column name (numeric only)
     */
    ML.encodeFeatureRow = function (pipeline, mins, maxs, means, row) {
        const out = [];
        const mn = mins || {};
        const mx = maxs || {};
        const mu = means || {};

        for (let i = 0; i < pipeline.length; i++) {
            const col = pipeline[i];
            if (col.kind === 'numeric') {
                const key = col.key;
                let v = parseFloat(row[key]);
                if (isNaN(v) || !isFinite(v)) {
                    const m = mu[key];
                    v = typeof m === 'number' && isFinite(m) ? m : 0;
                }
                let min = mn[key];
                let max = mx[key];
                if (typeof min !== 'number' || !isFinite(min)) min = 0;
                if (typeof max !== 'number' || !isFinite(max)) max = min + 1;
                const span = max - min;
                let scaled = span === 0 ? 0 : (v - min) / span;
                if (scaled < 0) scaled = 0;
                if (scaled > 1) scaled = 1;
                out.push(scaled);
            } else if (col.kind === 'onehot') {
                const raw = row[col.key];
                const str =
                    raw === '' || raw === null || raw === undefined
                        ? ''
                        : String(raw).trim();
                const cats = col.categories;
                const idx = cats.indexOf(str);
                for (let j = 0; j < cats.length; j++) {
                    out.push(idx === j ? 1 : 0);
                }
            }
        }
        return out;
    };

    window.MLFeatureCodec = ML;
})();

