// Neural Network Training in WebAssembly (AssemblyScript)
// Implements: forward pass, backpropagation, Adam optimizer, epoch-level training
// Designed for binary classification with one hidden layer (ReLU -> Sigmoid)

// ── Network dimensions ──────────────────────────────────────────────
let _inputSize: i32 = 0;
let _hiddenSize: i32 = 0;
let _outputSize: i32 = 0;
let _nSamples: i32 = 0;

// ── Memory pointers (byte offsets in WASM linear memory) ────────────
// Weights & biases
let w0Ptr: usize = 0;   // [hiddenSize × inputSize] f64
let b0Ptr: usize = 0;   // [hiddenSize] f64
let w1Ptr: usize = 0;   // [outputSize × hiddenSize] f64
let b1Ptr: usize = 0;   // [outputSize] f64

// Adam first-moment estimates
let mw0Ptr: usize = 0;
let mb0Ptr: usize = 0;
let mw1Ptr: usize = 0;
let mb1Ptr: usize = 0;

// Adam second-moment estimates
let vw0Ptr: usize = 0;
let vb0Ptr: usize = 0;
let vw1Ptr: usize = 0;
let vb1Ptr: usize = 0;

// Gradient accumulators (zeroed per batch)
let gw0Ptr: usize = 0;
let gb0Ptr: usize = 0;
let gw1Ptr: usize = 0;
let gb1Ptr: usize = 0;

// Training data
let xDataPtr: usize = 0;   // [nSamples × inputSize] f64
let yDataPtr: usize = 0;   // [nSamples] f64

// Shuffle indices
let indicesPtr: usize = 0; // [nSamples] i32

// Scratch buffers for forward/backward pass
let zHiddenPtr: usize = 0; // pre-activation hidden [hiddenSize] f64
let aHiddenPtr: usize = 0; // post-activation hidden [hiddenSize] f64

// Prediction input buffer (separate from training data)
let predInputPtr: usize = 0; // [inputSize] f64

// ── State ───────────────────────────────────────────────────────────
let adamT: i32 = 0;
let _epochLoss: f64 = 0;
let _epochAccuracy: f64 = 0;
let rngState: u32 = 42;

// ── Inline helpers for raw memory access ────────────────────────────
@inline function getF64(ptr: usize, idx: i32): f64 {
  return load<f64>(ptr + (<usize>idx << 3));
}

@inline function setF64(ptr: usize, idx: i32, val: f64): void {
  store<f64>(ptr + (<usize>idx << 3), val);
}

@inline function addF64(ptr: usize, idx: i32, val: f64): void {
  store<f64>(ptr + (<usize>idx << 3), load<f64>(ptr + (<usize>idx << 3)) + val);
}

@inline function getI32(ptr: usize, idx: i32): i32 {
  return load<i32>(ptr + (<usize>idx << 2));
}

@inline function setI32(ptr: usize, idx: i32, val: i32): void {
  store<i32>(ptr + (<usize>idx << 2), val);
}

function allocF64(count: i32): usize {
  return heap.alloc(<usize>count << 3);
}

function allocI32(count: i32): usize {
  return heap.alloc(<usize>count << 2);
}

function zeroF64(ptr: usize, count: i32): void {
  memory.fill(ptr, 0, <usize>count << 3);
}

// ── PRNG (xorshift32) ──────────────────────────────────────────────
function xorshift32(): u32 {
  let x = rngState;
  x ^= x << 13;
  x ^= x >> 17;
  x ^= x << 5;
  rngState = x;
  return x;
}

@inline function randomFloat(): f64 {
  return <f64>xorshift32() / 4294967295.0;
}

// ── Activation functions ────────────────────────────────────────────
@inline function relu(x: f64): f64 {
  return x > 0.0 ? x : 0.0;
}

@inline function sigmoid(x: f64): f64 {
  return 1.0 / (1.0 + Math.exp(-x));
}

// ── Exported: initialize network ────────────────────────────────────
export function nn_init(inputSize: i32, hiddenSize: i32, outputSize: i32): void {
  _inputSize = inputSize;
  _hiddenSize = hiddenSize;
  _outputSize = outputSize;
  adamT = 0;

  const w0Size = hiddenSize * inputSize;
  const w1Size = outputSize * hiddenSize;

  // Allocate all buffers
  w0Ptr = allocF64(w0Size);
  b0Ptr = allocF64(hiddenSize);
  w1Ptr = allocF64(w1Size);
  b1Ptr = allocF64(outputSize);

  mw0Ptr = allocF64(w0Size);
  vw0Ptr = allocF64(w0Size);
  mb0Ptr = allocF64(hiddenSize);
  vb0Ptr = allocF64(hiddenSize);
  mw1Ptr = allocF64(w1Size);
  vw1Ptr = allocF64(w1Size);
  mb1Ptr = allocF64(outputSize);
  vb1Ptr = allocF64(outputSize);

  gw0Ptr = allocF64(w0Size);
  gb0Ptr = allocF64(hiddenSize);
  gw1Ptr = allocF64(w1Size);
  gb1Ptr = allocF64(outputSize);

  zHiddenPtr = allocF64(hiddenSize);
  aHiddenPtr = allocF64(hiddenSize);
  predInputPtr = allocF64(inputSize);

  // Zero Adam state
  zeroF64(mw0Ptr, w0Size);
  zeroF64(vw0Ptr, w0Size);
  zeroF64(mb0Ptr, hiddenSize);
  zeroF64(vb0Ptr, hiddenSize);
  zeroF64(mw1Ptr, w1Size);
  zeroF64(vw1Ptr, w1Size);
  zeroF64(mb1Ptr, outputSize);
  zeroF64(vb1Ptr, outputSize);

  // Xavier/Glorot uniform initialization
  const limit0 = Math.sqrt(6.0 / <f64>(inputSize + hiddenSize));
  for (let i: i32 = 0; i < w0Size; i++) {
    setF64(w0Ptr, i, (randomFloat() * 2.0 - 1.0) * limit0);
  }
  zeroF64(b0Ptr, hiddenSize);

  const limit1 = Math.sqrt(6.0 / <f64>(hiddenSize + outputSize));
  for (let i: i32 = 0; i < w1Size; i++) {
    setF64(w1Ptr, i, (randomFloat() * 2.0 - 1.0) * limit1);
  }
  zeroF64(b1Ptr, outputSize);
}

// ── Exported: allocate training data buffers ─────────────────────────
export function nn_alloc_training_data(nSamples: i32): void {
  _nSamples = nSamples;
  xDataPtr = allocF64(nSamples * _inputSize);
  yDataPtr = allocF64(nSamples);
  indicesPtr = allocI32(nSamples);
  for (let i: i32 = 0; i < nSamples; i++) {
    setI32(indicesPtr, i, i);
  }
}

// ── Exported: pointers for JS bulk data transfer ────────────────────
export function nn_get_x_ptr(): usize { return xDataPtr; }
export function nn_get_y_ptr(): usize { return yDataPtr; }
export function nn_get_pred_input_ptr(): usize { return predInputPtr; }

// ── Exported: weight/bias access (for model save/load) ──────────────
export function nn_get_weight(layer: i32, row: i32, col: i32): f64 {
  if (layer == 0) return getF64(w0Ptr, row * _inputSize + col);
  return getF64(w1Ptr, row * _hiddenSize + col);
}

export function nn_set_weight(layer: i32, row: i32, col: i32, val: f64): void {
  if (layer == 0) setF64(w0Ptr, row * _inputSize + col, val);
  else setF64(w1Ptr, row * _hiddenSize + col, val);
}

export function nn_get_bias(layer: i32, idx: i32): f64 {
  if (layer == 0) return getF64(b0Ptr, idx);
  return getF64(b1Ptr, idx);
}

export function nn_set_bias(layer: i32, idx: i32, val: f64): void {
  if (layer == 0) setF64(b0Ptr, idx, val);
  else setF64(b1Ptr, idx, val);
}

// ── Exported: getters ───────────────────────────────────────────────
export function nn_get_epoch_loss(): f64 { return _epochLoss; }
export function nn_get_epoch_accuracy(): f64 { return _epochAccuracy; }
export function nn_get_input_size(): i32 { return _inputSize; }
export function nn_get_hidden_size(): i32 { return _hiddenSize; }
export function nn_get_output_size(): i32 { return _outputSize; }
export function nn_set_seed(seed: u32): void { rngState = seed > 0 ? seed : 42; }

// ── Fisher-Yates shuffle ────────────────────────────────────────────
function shuffleIndices(): void {
  for (let i: i32 = _nSamples - 1; i > 0; i--) {
    const j = <i32>(xorshift32() % <u32>(i + 1));
    const a = getI32(indicesPtr, i);
    const b = getI32(indicesPtr, j);
    setI32(indicesPtr, i, b);
    setI32(indicesPtr, j, a);
  }
}

// ── Forward pass (from training data) ───────────────────────────────
// Populates zHidden, aHidden scratch buffers; returns sigmoid output
function forwardFromTrainingData(sampleIdx: i32): f64 {
  const xBase: usize = xDataPtr + (<usize>(sampleIdx * _inputSize) << 3);

  // Hidden layer: z = W0·x + b0, a = relu(z)
  for (let j: i32 = 0; j < _hiddenSize; j++) {
    let sum: f64 = getF64(b0Ptr, j);
    const wBase: usize = w0Ptr + (<usize>(j * _inputSize) << 3);
    for (let k: i32 = 0; k < _inputSize; k++) {
      sum += load<f64>(wBase + (<usize>k << 3)) * load<f64>(xBase + (<usize>k << 3));
    }
    setF64(zHiddenPtr, j, sum);
    setF64(aHiddenPtr, j, relu(sum));
  }

  // Output layer: z = W1·a_hidden + b1, output = sigmoid(z)
  let outSum: f64 = getF64(b1Ptr, 0);
  for (let k: i32 = 0; k < _hiddenSize; k++) {
    outSum += getF64(w1Ptr, k) * getF64(aHiddenPtr, k);
  }
  return sigmoid(outSum);
}

// ── Forward pass (from prediction input buffer) ─────────────────────
function forwardFromPredInput(): f64 {
  for (let j: i32 = 0; j < _hiddenSize; j++) {
    let sum: f64 = getF64(b0Ptr, j);
    const wBase: usize = w0Ptr + (<usize>(j * _inputSize) << 3);
    for (let k: i32 = 0; k < _inputSize; k++) {
      sum += load<f64>(wBase + (<usize>k << 3)) * load<f64>(predInputPtr + (<usize>k << 3));
    }
    setF64(aHiddenPtr, j, relu(sum));
  }

  let outSum: f64 = getF64(b1Ptr, 0);
  for (let k: i32 = 0; k < _hiddenSize; k++) {
    outSum += getF64(w1Ptr, k) * getF64(aHiddenPtr, k);
  }
  return sigmoid(outSum);
}

// ── Backpropagation (accumulates gradients) ─────────────────────────
function backpropSample(sampleIdx: i32, yTrue: f64, yPred: f64): void {
  const xBase: usize = xDataPtr + (<usize>(sampleIdx * _inputSize) << 3);

  // Output delta: BCE + sigmoid simplification → delta = yPred - yTrue
  const deltaOut: f64 = yPred - yTrue;

  // Accumulate gradients for W1, B1
  for (let k: i32 = 0; k < _hiddenSize; k++) {
    addF64(gw1Ptr, k, deltaOut * getF64(aHiddenPtr, k));
  }
  addF64(gb1Ptr, 0, deltaOut);

  // Hidden layer deltas + gradient accumulation for W0, B0
  for (let k: i32 = 0; k < _hiddenSize; k++) {
    // delta_hidden[k] = (W1[k] * deltaOut) * relu'(z_hidden[k])
    const z: f64 = getF64(zHiddenPtr, k);
    if (z <= 0.0) continue; // relu derivative = 0
    const dh: f64 = getF64(w1Ptr, k) * deltaOut;

    const gwBase: usize = gw0Ptr + (<usize>(k * _inputSize) << 3);
    for (let i: i32 = 0; i < _inputSize; i++) {
      store<f64>(
        gwBase + (<usize>i << 3),
        load<f64>(gwBase + (<usize>i << 3)) + dh * load<f64>(xBase + (<usize>i << 3))
      );
    }
    addF64(gb0Ptr, k, dh);
  }
}

// ── Adam optimizer step ─────────────────────────────────────────────
function applyAdam(batchSz: i32, lr: f64, beta1: f64, beta2: f64, eps: f64): void {
  adamT++;
  const invBatch: f64 = 1.0 / <f64>batchSz;
  const bc1: f64 = 1.0 - Math.pow(beta1, <f64>adamT);
  const bc2: f64 = 1.0 - Math.pow(beta2, <f64>adamT);
  const lrT: f64 = lr * Math.sqrt(bc2) / (bc1 > 1e-12 ? bc1 : 1e-12);
  const ob1: f64 = 1.0 - beta1;
  const ob2: f64 = 1.0 - beta2;

  // W0 update
  const w0Size: i32 = _hiddenSize * _inputSize;
  for (let i: i32 = 0; i < w0Size; i++) {
    const g: f64 = getF64(gw0Ptr, i) * invBatch;
    const m: f64 = beta1 * getF64(mw0Ptr, i) + ob1 * g;
    const v: f64 = beta2 * getF64(vw0Ptr, i) + ob2 * g * g;
    setF64(mw0Ptr, i, m);
    setF64(vw0Ptr, i, v);
    setF64(w0Ptr, i, getF64(w0Ptr, i) - lrT * (m / (Math.sqrt(v) + eps)));
  }

  // B0 update
  for (let i: i32 = 0; i < _hiddenSize; i++) {
    const g: f64 = getF64(gb0Ptr, i) * invBatch;
    const m: f64 = beta1 * getF64(mb0Ptr, i) + ob1 * g;
    const v: f64 = beta2 * getF64(vb0Ptr, i) + ob2 * g * g;
    setF64(mb0Ptr, i, m);
    setF64(vb0Ptr, i, v);
    setF64(b0Ptr, i, getF64(b0Ptr, i) - lrT * (m / (Math.sqrt(v) + eps)));
  }

  // W1 update
  const w1Size: i32 = _outputSize * _hiddenSize;
  for (let i: i32 = 0; i < w1Size; i++) {
    const g: f64 = getF64(gw1Ptr, i) * invBatch;
    const m: f64 = beta1 * getF64(mw1Ptr, i) + ob1 * g;
    const v: f64 = beta2 * getF64(vw1Ptr, i) + ob2 * g * g;
    setF64(mw1Ptr, i, m);
    setF64(vw1Ptr, i, v);
    setF64(w1Ptr, i, getF64(w1Ptr, i) - lrT * (m / (Math.sqrt(v) + eps)));
  }

  // B1 update
  for (let i: i32 = 0; i < _outputSize; i++) {
    const g: f64 = getF64(gb1Ptr, i) * invBatch;
    const m: f64 = beta1 * getF64(mb1Ptr, i) + ob1 * g;
    const v: f64 = beta2 * getF64(vb1Ptr, i) + ob2 * g * g;
    setF64(mb1Ptr, i, m);
    setF64(vb1Ptr, i, v);
    setF64(b1Ptr, i, getF64(b1Ptr, i) - lrT * (m / (Math.sqrt(v) + eps)));
  }
}

// ── Exported: train one epoch ───────────────────────────────────────
export function nn_train_epoch(
  batchSize: i32, lr: f64, beta1: f64, beta2: f64, eps: f64
): void {
  shuffleIndices();

  let totalLoss: f64 = 0.0;
  let totalCorrect: f64 = 0.0;
  let batchCount: i32 = 0;

  for (let batchStart: i32 = 0; batchStart < _nSamples; batchStart += batchSize) {
    let batchEnd: i32 = batchStart + batchSize;
    if (batchEnd > _nSamples) batchEnd = _nSamples;
    const curBatchSize: i32 = batchEnd - batchStart;

    // Zero gradient accumulators
    zeroF64(gw0Ptr, _hiddenSize * _inputSize);
    zeroF64(gb0Ptr, _hiddenSize);
    zeroF64(gw1Ptr, _outputSize * _hiddenSize);
    zeroF64(gb1Ptr, _outputSize);

    let batchLoss: f64 = 0.0;
    let batchCorrect: f64 = 0.0;

    for (let bi: i32 = batchStart; bi < batchEnd; bi++) {
      const sIdx: i32 = getI32(indicesPtr, bi);
      const yTrue: f64 = getF64(yDataPtr, sIdx);

      // Forward
      const yPred: f64 = forwardFromTrainingData(sIdx);

      // Binary cross-entropy loss
      const clipEps: f64 = 1e-15;
      const clipped: f64 = Math.max(clipEps, Math.min(1.0 - clipEps, yPred));
      batchLoss -= yTrue * Math.log(clipped) + (1.0 - yTrue) * Math.log(1.0 - clipped);

      // Accuracy
      if ((yPred > 0.5 ? 1.0 : 0.0) == yTrue) batchCorrect += 1.0;

      // Backprop
      backpropSample(sIdx, yTrue, yPred);
    }

    // Adam step
    applyAdam(curBatchSize, lr, beta1, beta2, eps);

    totalLoss += batchLoss / <f64>curBatchSize;
    totalCorrect += batchCorrect / <f64>curBatchSize;
    batchCount++;
  }

  _epochLoss = totalLoss / <f64>batchCount;
  _epochAccuracy = totalCorrect / <f64>batchCount;
}

// ── Exported: single-sample prediction ──────────────────────────────
export function nn_predict(): f64 {
  return forwardFromPredInput();
}

// ── Exported: set prediction input feature ──────────────────────────
export function nn_set_predict_feature(idx: i32, val: f64): void {
  setF64(predInputPtr, idx, val);
}

// ── Exported: reset Adam state (for re-training) ────────────────────
export function nn_reset_adam(): void {
  adamT = 0;
  const w0Size = _hiddenSize * _inputSize;
  const w1Size = _outputSize * _hiddenSize;
  zeroF64(mw0Ptr, w0Size);
  zeroF64(vw0Ptr, w0Size);
  zeroF64(mb0Ptr, _hiddenSize);
  zeroF64(vb0Ptr, _hiddenSize);
  zeroF64(mw1Ptr, w1Size);
  zeroF64(vw1Ptr, w1Size);
  zeroF64(mb1Ptr, _outputSize);
  zeroF64(vb1Ptr, _outputSize);
}

// Required by --exportStart
export function _start(): void {}
