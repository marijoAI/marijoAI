/**
 * Car Game — WebAssembly raycaster launcher.
 *
 * Runs as a full-viewport SPA route (`#/car-game`, template `tmpl-car-game`).
 * The banner on the Train page is an `<a target="_blank" href="#/car-game">`,
 * so the game opens in a new browser tab without interrupting training.
 *
 * Cross-tab coordination uses `localStorage` (+ the `storage` event) under the
 * key `marijoai.training_state`:
 *   - 'training'  : training just started
 *   - 'complete'  : training finished → game tab shows the "Training complete"
 *                   overlay
 *   - (removed)   : training was reset → game tab hides the overlay
 *
 * This file exposes `window.initCarGamePage` (called by the router) and a tiny
 * `window.carGame` helper used by `train.js` to publish training state.
 */
(function () {
    'use strict';

    // Fixed render resolution (CSS-scaled to fit the viewport).
    const RENDER_W = 480;
    const RENDER_H = 300;
    const WASM_PATH = 'wasm/car-game.wasm';
    const CAR_IMAGE_PATH = 'car_game_assets/image_red_car.png';
    // Player car sprite occupies this fraction of the canvas height; width is
    // derived from the image's natural aspect ratio.
    const CAR_HEIGHT_FRAC = 0.55;
    const STORAGE_KEY = 'marijoai.training_state';

    // Decode a base64 string into a Uint8Array (browser-compatible).
    function base64ToBytes(b64) {
        const bin = atob(b64);
        const len = bin.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
        return bytes;
    }

    function _t(key, params) {
        if (window.i18n && typeof window.i18n.t === 'function') return window.i18n.t(key, params);
        return key;
    }

    // ---- WASM module (shared across open/close cycles) --------------------
    const state = {
        wasm: null,
        wasmReady: null,
        pixelView: null,
        imageData: null,
        carImage: null,        // HTMLImageElement once loaded
        carImageReady: false,  // true after the image successfully decoded
    };

    function ensureCarImage() {
        if (state.carImage) return;
        const img = new Image();
        img.onload = () => { state.carImageReady = true; };
        img.onerror = () => {
            console.warn('[CarGame] Failed to load car sprite:', CAR_IMAGE_PATH);
        };
        img.src = CAR_IMAGE_PATH;
        state.carImage = img;
    }

    async function loadWasm() {
        if (typeof WebAssembly === 'undefined') return null;
        const imports = { env: { abort: () => { throw new Error('CarGame WASM abort'); } } };

        // 1. Preferred path: the build step embeds the wasm bytes as base64
        // so the game works even when index.html is opened via file:// (where
        // fetch() of local .wasm binaries is blocked by browsers).
        if (typeof window._carGameWasmBase64 === 'string' && window._carGameWasmBase64.length > 0) {
            try {
                const bytes = base64ToBytes(window._carGameWasmBase64);
                const mod = await WebAssembly.instantiate(bytes, imports);
                return mod.instance.exports;
            } catch (err) {
                console.warn('[CarGame] Embedded wasm failed:', err && err.message);
            }
        }

        // 2. Fallback: fetch the binary (works when served over http(s)).
        try {
            let mod;
            if (typeof WebAssembly.instantiateStreaming === 'function') {
                mod = await WebAssembly.instantiateStreaming(fetch(WASM_PATH), imports);
            } else {
                const resp = await fetch(WASM_PATH);
                const bytes = await resp.arrayBuffer();
                mod = await WebAssembly.instantiate(bytes, imports);
            }
            return mod.instance.exports;
        } catch (err) {
            console.warn('[CarGame] Failed to load wasm via fetch:', err && err.message);
            return null;
        }
    }

    function ensureWasmReady() {
        if (!state.wasmReady) {
            state.wasmReady = loadWasm().then((exports) => {
                state.wasm = exports;
                if (exports) {
                    exports.cg_seed((Date.now() & 0x7fffffff) >>> 0);
                    exports.cg_init(RENDER_W, RENDER_H);
                    refreshPixelView();
                }
                return !!exports;
            });
        }
        return state.wasmReady;
    }

    function refreshPixelView() {
        const w = state.wasm;
        if (!w) return;
        const ptr = w.cg_get_pixel_ptr();
        state.pixelView = new Uint8ClampedArray(w.memory.buffer, ptr, RENDER_W * RENDER_H * 4);
        state.imageData = new ImageData(state.pixelView, RENDER_W, RENDER_H);
    }

    function keyToIndex(code) {
        switch (code) {
            case 'ArrowUp':
            case 'KeyW':    return 0;
            case 'ArrowDown':
            case 'KeyS':    return 1;
            case 'ArrowLeft':
            case 'KeyA':    return 2;
            case 'ArrowRight':
            case 'KeyD':    return 3;
            default:        return -1;
        }
    }

    // ---- Page controller --------------------------------------------------
    // Holds everything bound to the currently-mounted #/car-game DOM.
    let page = null;

    function cleanupPage() {
        if (!page) return;
        page.running = false;
        if (page.rafId) cancelAnimationFrame(page.rafId);
        if (page.keyDown) window.removeEventListener('keydown', page.keyDown);
        if (page.keyUp) window.removeEventListener('keyup', page.keyUp);
        if (page.storageHandler) window.removeEventListener('storage', page.storageHandler);
        if (page.langHandler) document.removeEventListener('marijoai:language-changed', page.langHandler);
        if (page.visHandler) document.removeEventListener('visibilitychange', page.visHandler);
        page = null;
    }

    function showTrainingDoneIfFlagged() {
        if (!page) return;
        let stateValue = null;
        try { stateValue = localStorage.getItem(STORAGE_KEY); } catch (e) { /* ignore */ }
        if (stateValue === 'complete') {
            page.trainingDone.textContent = _t('car_game.training_complete');
            page.trainingDone.style.display = 'block';
        } else {
            page.trainingDone.style.display = 'none';
            page.trainingDone.textContent = '';
        }
    }

    function startLoop() {
        if (!page || !state.wasm) return;
        page.lastTime = performance.now();
        page.running = true;
        page.rafId = requestAnimationFrame(frame);
    }

    function stopLoop() {
        if (!page) return;
        page.running = false;
        if (page.rafId) cancelAnimationFrame(page.rafId);
        page.rafId = 0;
    }

    function frame(now) {
        if (!page || !page.running) return;
        const w = state.wasm;
        if (!w) return;

        const dt = Math.min(0.1, (now - page.lastTime) / 1000) || 0.016;
        page.lastTime = now;

        w.cg_update(dt);
        w.cg_render();

        // WASM memory may have grown; refresh view if so.
        if (!state.pixelView || state.pixelView.buffer !== w.memory.buffer) {
            refreshPixelView();
        }
        page.ctx.putImageData(state.imageData, 0, 0);

        // Player's car sprite, drawn on top of the raycaster scene at the
        // bottom-centre of the canvas (anchored to the bottom edge).
        if (state.carImageReady && state.carImage) {
            const img = state.carImage;
            const aspect = (img.naturalWidth && img.naturalHeight)
                ? (img.naturalWidth / img.naturalHeight)
                : 1;
            const drawH = Math.round(RENDER_H * CAR_HEIGHT_FRAC);
            const drawW = Math.round(drawH * aspect);
            const drawX = Math.round((RENDER_W - drawW) / 2);
            const drawY = RENDER_H - drawH;
            page.ctx.drawImage(img, drawX, drawY, drawW, drawH);
        }

        page.scoreEl.textContent = _t('car_game.hud.stars', { n: w.cg_get_score() });

        page.rafId = requestAnimationFrame(frame);
    }

    // Called by the SPA router after `tmpl-car-game` is mounted into DOM.
    window.initCarGamePage = async function () {
        cleanupPage(); // just in case

        const root = document.querySelector('.car-game-page');
        if (!root) return;

        page = {
            root: root,
            canvas: root.querySelector('.car-game-canvas'),
            scoreEl: root.querySelector('.car-game-score'),
            trainingDone: root.querySelector('.car-game-training-done'),
            hintEl: root.querySelector('.car-game-hint'),
            errorEl: root.querySelector('.car-game-error'),
            ctx: null,
            running: false,
            rafId: 0,
            lastTime: 0,
            keysDown: new Set(),
            keyDown: null,
            keyUp: null,
            storageHandler: null,
            langHandler: null,
            visHandler: null,
        };
        page.ctx = page.canvas.getContext('2d');
        // Make sure scaled drawImage stays crisp on the low-res canvas, then
        // kick off the car sprite decode as early as possible.
        page.ctx.imageSmoothingEnabled = true;
        ensureCarImage();

        // Keyboard handlers — multiple arrows can be held simultaneously.
        page.keyDown = (e) => {
            const idx = keyToIndex(e.code);
            if (idx < 0) return;
            e.preventDefault();
            page.keysDown.add(idx);
            if (state.wasm) state.wasm.cg_set_key(idx, 1);
        };
        page.keyUp = (e) => {
            const idx = keyToIndex(e.code);
            if (idx < 0) return;
            e.preventDefault();
            page.keysDown.delete(idx);
            if (state.wasm) state.wasm.cg_set_key(idx, 0);
        };
        window.addEventListener('keydown', page.keyDown, { passive: false });
        window.addEventListener('keyup', page.keyUp, { passive: false });

        // Cross-tab "training complete" notifier.
        page.storageHandler = (e) => {
            if (e.key && e.key !== STORAGE_KEY) return;
            showTrainingDoneIfFlagged();
        };
        window.addEventListener('storage', page.storageHandler);

        // Re-translate dynamic HUD bits on language change.
        page.langHandler = () => {
            if (page.hintEl) page.hintEl.textContent = _t('car_game.hint');
            showTrainingDoneIfFlagged();
        };
        document.addEventListener('marijoai:language-changed', page.langHandler);

        // Pause/resume on tab-visibility to save CPU.
        page.visHandler = () => {
            if (!page) return;
            if (document.hidden) {
                stopLoop();
            } else if (state.wasm) {
                startLoop();
            }
        };
        document.addEventListener('visibilitychange', page.visHandler);

        // Re-translate once at mount (router already applied translations to
        // static data-i18n nodes; dynamic HUD text needs initialisation).
        if (page.hintEl) page.hintEl.textContent = _t('car_game.hint');

        const ready = await ensureWasmReady();
        if (!ready) {
            if (page.errorEl) {
                page.errorEl.textContent = 'WebAssembly unavailable.';
                page.errorEl.style.display = 'block';
            }
            return;
        }

        // Always start fresh when the page mounts.
        state.wasm.cg_reset();
        showTrainingDoneIfFlagged();
        startLoop();
    };

    // Clean up when the user navigates away from the car-game route.
    window.addEventListener('hashchange', () => {
        const hash = window.location.hash || '#/';
        if (hash !== '#/car-game' && page) cleanupPage();
    });

    // ---- Public helper used by train.js to publish training state --------
    window.carGame = {
        notifyTrainingStarted: function () {
            try { localStorage.setItem(STORAGE_KEY, 'training'); } catch (e) { /* ignore */ }
        },
        notifyTrainingComplete: function () {
            try { localStorage.setItem(STORAGE_KEY, 'complete'); } catch (e) { /* ignore */ }
        },
        notifyTrainingReset: function () {
            try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignore */ }
        },
    };
})();
