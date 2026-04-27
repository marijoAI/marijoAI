/*
 * Bundle binary + source artifacts into browser-loadable JS globals.
 *
 *   .wasm → base64 string on `window.<global>` (used to instantiate WASM
 *           without a fetch() call, which matters under file://).
 *   .js  → base64-encoded JS source on `window.<global>`, to be decoded and
 *          wrapped in a Blob by the main thread to spawn a Web Worker. This
 *          lets us ship a Worker that works identically under http(s):// and
 *          file:// — `new Worker('js/...')` fails under file:// in Chrome,
 *          but Blob workers always work.
 *
 * Run after each AssemblyScript build via:
 *   npm run asembed:wasm
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const WASM_TARGETS = [
    {
        src: path.join(ROOT, 'wasm', 'nn.wasm'),
        out: path.join(ROOT, 'js', 'nn-wasm-embed.js'),
        global: '_nnWasmBase64',
        label: 'wasm/nn.wasm',
    },
];

const SOURCE_TARGETS = [
    {
        src: path.join(ROOT, 'js', 'nn-worker.js'),
        out: path.join(ROOT, 'js', 'nn-worker-embed.js'),
        global: '_nnWorkerSource',
        label: 'js/nn-worker.js',
    },
];

function embedBinaryAsBase64(target) {
    if (!fs.existsSync(target.src)) {
        console.warn('Skipping (not found): ' + target.label);
        return;
    }
    const bytes = fs.readFileSync(target.src);
    const b64 = bytes.toString('base64');
    const output =
        '/**\n' +
        ' * Auto-generated: base64-encoded contents of ' + target.label + '.\n' +
        ' * Regenerate with: npm run asembed:wasm\n' +
        ' * This embedding lets the app run when index.html is opened via file://,\n' +
        ' * where fetch() of local .wasm binaries is blocked by browsers.\n' +
        ' */\n' +
        'window.' + target.global + ' = "' + b64 + '";\n';
    fs.writeFileSync(target.out, output);
    console.log(
        'Wrote ' + target.out + ' (' + bytes.length + ' bytes → ' +
        b64.length + ' bytes base64)'
    );
}

function embedSourceAsString(target) {
    if (!fs.existsSync(target.src)) {
        console.warn('Skipping (not found): ' + target.label);
        return;
    }
    const source = fs.readFileSync(target.src, 'utf-8');
    // JSON.stringify handles all escaping (quotes, newlines, unicode).
    const literal = JSON.stringify(source);
    const output =
        '/**\n' +
        ' * Auto-generated: string-embedded copy of ' + target.label + '.\n' +
        ' * Regenerate with: npm run asembed:wasm\n' +
        ' * The main thread wraps this source in a Blob to create a Web Worker\n' +
        ' * (works identically over http(s):// and file://).\n' +
        ' */\n' +
        'window.' + target.global + ' = ' + literal + ';\n';
    fs.writeFileSync(target.out, output);
    console.log(
        'Wrote ' + target.out + ' (' + source.length + ' chars of source)'
    );
}

for (const t of WASM_TARGETS) embedBinaryAsBase64(t);
for (const t of SOURCE_TARGETS) embedSourceAsString(t);
