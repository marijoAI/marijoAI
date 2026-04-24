// ============================================================================
// Car Game Raycaster — AssemblyScript source (compiled to wasm/car-game.wasm)
// ----------------------------------------------------------------------------
// Minimalistic first-person raycaster:
//   - Ceiling = light blue, floor = dark blue
//   - Player drives a red car (rendered as a HUD at the bottom of the screen)
//   - Yellow 5-point stars spawn at random positions/distances; pick them up
//     by driving close. Stars that pass behind the player respawn elsewhere.
//   - The game never ends — the player just keeps collecting stars.
// The JS layer owns the DOM (canvas + ImageData); this module writes an RGBA
// pixel buffer at a pointer exposed to JS.
// ============================================================================

const MAX_STARS: i32 = 3;
const PICKUP_RADIUS: f64 = 0.6;
const MAX_STAR_LIFE: f64 = 25.0; // seconds
const PI: f64 = 3.141592653589793;

// Packed RGBA colors (little-endian byte order = R, G, B, A,
// so u32 = (A<<24)|(B<<16)|(G<<8)|R).
const COLOR_CEILING:   u32 = 0xFFFACE87;   // 135,206,250  (light blue sky)
const COLOR_FLOOR:     u32 = 0xFF5A1E0A;   //  10, 30, 90  (dark blue road)
const COLOR_STAR_OUT:  u32 = 0xFF1DB9F6;   // 246,185, 29  (golden yellow)
const COLOR_STAR_IN:   u32 = 0xFF78FFFF;   // 255,255,120  (bright yellow core)

// Red ramp used to fake curvature on the engine cover — four shades from
// deep shadow to bright highlight, plus a white specular tip for polished
// paint highlights on the bulges.
const COLOR_CAR_DARK:  u32 = 0xFF1414A0;   // 160, 20, 20  (shadow red)
const COLOR_CAR_MID:   u32 = 0xFF1919C8;   // 200, 25, 25  (mid red)
const COLOR_CAR_BODY:  u32 = 0xFF1E1EDC;   // 220, 30, 30  (body red)
const COLOR_CAR_HIGH:  u32 = 0xFF5050FF;   // 255, 80, 80  (highlight red)
const COLOR_SPECULAR:  u32 = 0xFFFFFFFF;   // 255,255,255  (specular white)
const COLOR_CHROME:    u32 = 0xFFE0E0E0;   // 224,224,224  (chrome / silver)

// Pixel buffer pointer + dimensions
let pixelPtr: usize = 0;
let screenW: i32 = 1;
let screenH: i32 = 1;

// Player
let px: f64 = 0.0;
let py: f64 = 0.0;
let dirX: f64 = 1.0;
let dirY: f64 = 0.0;
let planeX: f64 = 0.0;
let planeY: f64 = 0.66;

// Input (1 = pressed, 0 = released)
let kUp: i32 = 0;
let kDown: i32 = 0;
let kLeft: i32 = 0;
let kRight: i32 = 0;

// Stars (flat arrays at pointers, indexed 0..MAX_STARS-1)
let starXPtr: usize = 0;
let starYPtr: usize = 0;
let starAgePtr: usize = 0;
let starActivePtr: usize = 0;

// Scratch buffers for 5-point-star polygon vertices (10 vertices × f64).
let starVxPtr: usize = 0;
let starVyPtr: usize = 0;

// Game state
let score: i32 = 0;

// PRNG
let rngState: u32 = 0x12345678;

// ---------------------------------------------------------------------------
function xorshift32(): u32 {
  let x = rngState;
  x ^= x << 13;
  x ^= x >> 17;
  x ^= x << 5;
  rngState = x;
  return x;
}

@inline function rand01(): f64 {
  return <f64>xorshift32() / 4294967295.0;
}

// ---------------------------------------------------------------------------
export function cg_init(width: i32, height: i32): void {
  screenW = width > 1 ? width : 1;
  screenH = height > 1 ? height : 1;

  pixelPtr = heap.alloc(<usize>(screenW * screenH) << 2);
  starXPtr = heap.alloc(<usize>MAX_STARS << 3);
  starYPtr = heap.alloc(<usize>MAX_STARS << 3);
  starAgePtr = heap.alloc(<usize>MAX_STARS << 3);
  starActivePtr = heap.alloc(<usize>MAX_STARS << 2);
  starVxPtr = heap.alloc(10 << 3);
  starVyPtr = heap.alloc(10 << 3);

  px = 0.0; py = 0.0;
  dirX = 1.0; dirY = 0.0;
  planeX = 0.0; planeY = 0.66;
  kUp = 0; kDown = 0; kLeft = 0; kRight = 0;
  score = 0;

  for (let i: i32 = 0; i < MAX_STARS; i++) {
    store<i32>(starActivePtr + (<usize>i << 2), 0);
  }
}

export function cg_resize(width: i32, height: i32): void {
  if (width == screenW && height == screenH) return;
  screenW = width > 1 ? width : 1;
  screenH = height > 1 ? height : 1;
  pixelPtr = heap.alloc(<usize>(screenW * screenH) << 2);
}

export function cg_get_pixel_ptr(): usize { return pixelPtr; }
export function cg_get_width(): i32 { return screenW; }
export function cg_get_height(): i32 { return screenH; }
export function cg_get_score(): i32 { return score; }

export function cg_set_key(key: i32, state: i32): void {
  const v = state != 0 ? 1 : 0;
  if (key == 0) kUp = v;
  else if (key == 1) kDown = v;
  else if (key == 2) kLeft = v;
  else if (key == 3) kRight = v;
}

export function cg_seed(s: u32): void {
  rngState = s != 0 ? s : 0x12345678;
}

export function cg_reset(): void {
  px = 0.0; py = 0.0;
  dirX = 1.0; dirY = 0.0;
  planeX = 0.0; planeY = 0.66;
  kUp = 0; kDown = 0; kLeft = 0; kRight = 0;
  score = 0;
  for (let i: i32 = 0; i < MAX_STARS; i++) {
    store<i32>(starActivePtr + (<usize>i << 2), 0);
  }
}

// ---------------------------------------------------------------------------
function spawnStar(idx: i32): void {
  // Random angle within ±85° of player forward, distance in [6, 18].
  const playerAngle: f64 = Math.atan2(dirY, dirX);
  const angle: f64 = playerAngle + (rand01() - 0.5) * PI * 0.95;
  const dist: f64 = 6.0 + rand01() * 12.0;
  store<f64>(starXPtr + (<usize>idx << 3), px + Math.cos(angle) * dist);
  store<f64>(starYPtr + (<usize>idx << 3), py + Math.sin(angle) * dist);
  store<f64>(starAgePtr + (<usize>idx << 3), 0.0);
  store<i32>(starActivePtr + (<usize>idx << 2), 1);
}

function maybeSpawnStars(): void {
  for (let i: i32 = 0; i < MAX_STARS; i++) {
    if (load<i32>(starActivePtr + (<usize>i << 2)) == 0) {
      spawnStar(i);
    }
  }
}

// ---------------------------------------------------------------------------
export function cg_update(dt: f64): void {
  const rotSpeed: f64 = 2.3;
  const moveSpeed: f64 = 4.5;

  // In screen space the camera plane points to the right of the forward
  // vector, so a POSITIVE rotation swings the view clockwise (i.e. to the
  // right). Left arrow → negative, right arrow → positive.
  if (kLeft != 0) rotate(-rotSpeed * dt);
  if (kRight != 0) rotate(rotSpeed * dt);
  if (kUp != 0) { px += dirX * moveSpeed * dt; py += dirY * moveSpeed * dt; }
  if (kDown != 0) { px -= dirX * moveSpeed * dt * 0.7; py -= dirY * moveSpeed * dt * 0.7; }

  // Evaluate each active star for pickup or respawn.
  for (let i: i32 = 0; i < MAX_STARS; i++) {
    const activeOff: usize = <usize>i << 2;
    if (load<i32>(starActivePtr + activeOff) == 0) continue;
    const sx: f64 = load<f64>(starXPtr + (<usize>i << 3));
    const sy: f64 = load<f64>(starYPtr + (<usize>i << 3));
    const dx: f64 = sx - px;
    const dy: f64 = sy - py;
    const dist2: f64 = dx * dx + dy * dy;
    if (dist2 < PICKUP_RADIUS * PICKUP_RADIUS) {
      score++;
      store<i32>(starActivePtr + activeOff, 0);
      continue;
    }

    // Transform to camera space to detect "behind player" (silent respawn).
    const invDet: f64 = 1.0 / (planeX * dirY - dirX * planeY);
    const transformY: f64 = invDet * (-planeY * dx + planeX * dy);

    const age: f64 = load<f64>(starAgePtr + (<usize>i << 3)) + dt;
    store<f64>(starAgePtr + (<usize>i << 3), age);

    if (transformY < -0.5 || age > MAX_STAR_LIFE) {
      store<i32>(starActivePtr + activeOff, 0);
    }
  }

  maybeSpawnStars();
}

function rotate(angle: f64): void {
  const c: f64 = Math.cos(angle);
  const s: f64 = Math.sin(angle);
  const oldDirX: f64 = dirX;
  dirX = dirX * c - dirY * s;
  dirY = oldDirX * s + dirY * c;
  const oldPlaneX: f64 = planeX;
  planeX = planeX * c - planeY * s;
  planeY = oldPlaneX * s + planeY * c;
}

// ---------------------------------------------------------------------------
// Rendering primitives
// ---------------------------------------------------------------------------

@inline function putPixel(x: i32, y: i32, color: u32): void {
  if (x < 0 || x >= screenW || y < 0 || y >= screenH) return;
  store<u32>(pixelPtr + <usize>((y * screenW + x) << 2), color);
}

function fillRect(x0: i32, y0: i32, w: i32, h: i32, color: u32): void {
  let x1: i32 = x0 + w;
  let y1: i32 = y0 + h;
  if (x0 < 0) x0 = 0;
  if (y0 < 0) y0 = 0;
  if (x1 > screenW) x1 = screenW;
  if (y1 > screenH) y1 = screenH;
  for (let y: i32 = y0; y < y1; y++) {
    const rowBase: usize = pixelPtr + <usize>(y * screenW) * 4;
    for (let x: i32 = x0; x < x1; x++) {
      store<u32>(rowBase + (<usize>x << 2), color);
    }
  }
}

function fillCircle(cx: i32, cy: i32, r: i32, color: u32): void {
  if (r < 1) r = 1;
  const r2: i32 = r * r;
  for (let y: i32 = -r; y <= r; y++) {
    const py_: i32 = cy + y;
    if (py_ < 0 || py_ >= screenH) continue;
    for (let x: i32 = -r; x <= r; x++) {
      if (x * x + y * y > r2) continue;
      const px_: i32 = cx + x;
      if (px_ < 0 || px_ >= screenW) continue;
      store<u32>(pixelPtr + <usize>((py_ * screenW + px_) << 2), color);
    }
  }
}

// ---------------------------------------------------------------------------

export function cg_render(): void {
  const halfH: i32 = screenH >> 1;
  // Ceiling (top half)
  fillRect(0, 0, screenW, halfH, COLOR_CEILING);
  // Floor (bottom half)
  fillRect(0, halfH, screenW, screenH - halfH, COLOR_FLOOR);

  drawStars();
  drawCar();
}

// ---------------------------------------------------------------------------
// 5-point star rasterizer (point-in-polygon)
// ---------------------------------------------------------------------------
function pointInStar(pxF: f64, pyF: f64): bool {
  let inside = false;
  let j: i32 = 9; // last vertex
  for (let i: i32 = 0; i < 10; i++) {
    const yi: f64 = load<f64>(starVyPtr + (<usize>i << 3));
    const yj: f64 = load<f64>(starVyPtr + (<usize>j << 3));
    if ((yi > pyF) != (yj > pyF)) {
      const xi: f64 = load<f64>(starVxPtr + (<usize>i << 3));
      const xj: f64 = load<f64>(starVxPtr + (<usize>j << 3));
      const t: f64 = (pyF - yi) / (yj - yi);
      if (pxF < xi + t * (xj - xi)) inside = !inside;
    }
    j = i;
  }
  return inside;
}

function drawStarShape(cx: i32, cy: i32, r: i32): void {
  if (r < 2) r = 2;
  // Compute 10 polygon vertices (outer, inner, outer, inner, …).
  const outerR: f64 = <f64>r;
  const innerR: f64 = <f64>r * 0.42;
  const startAngle: f64 = -0.5 * PI; // point up
  for (let i: i32 = 0; i < 10; i++) {
    const a: f64 = startAngle + <f64>i * (PI / 5.0);
    const rad: f64 = (i & 1) == 0 ? outerR : innerR;
    store<f64>(starVxPtr + (<usize>i << 3), <f64>cx + Math.cos(a) * rad);
    store<f64>(starVyPtr + (<usize>i << 3), <f64>cy + Math.sin(a) * rad);
  }

  // Rasterize bounding box, test each pixel.
  const bbX0: i32 = cx - r;
  const bbY0: i32 = cy - r;
  const bbX1: i32 = cx + r;
  const bbY1: i32 = cy + r;
  for (let y: i32 = bbY0; y <= bbY1; y++) {
    if (y < 0 || y >= screenH) continue;
    const fy: f64 = <f64>y + 0.5;
    for (let x: i32 = bbX0; x <= bbX1; x++) {
      if (x < 0 || x >= screenW) continue;
      const fx: f64 = <f64>x + 0.5;
      if (pointInStar(fx, fy)) {
        // Core vs outer shade: use squared distance from centre.
        const dx: f64 = fx - <f64>cx;
        const dy: f64 = fy - <f64>cy;
        const dc2: f64 = dx * dx + dy * dy;
        const coreR: f64 = innerR * 0.6;
        const color: u32 = dc2 < coreR * coreR ? COLOR_STAR_IN : COLOR_STAR_OUT;
        store<u32>(pixelPtr + <usize>((y * screenW + x) << 2), color);
      }
    }
  }
}

function drawStars(): void {
  for (let i: i32 = 0; i < MAX_STARS; i++) {
    if (load<i32>(starActivePtr + (<usize>i << 2)) == 0) continue;
    const sx: f64 = load<f64>(starXPtr + (<usize>i << 3)) - px;
    const sy: f64 = load<f64>(starYPtr + (<usize>i << 3)) - py;

    const invDet: f64 = 1.0 / (planeX * dirY - dirX * planeY);
    const transformX: f64 = invDet * (dirY * sx - dirX * sy);
    const transformY: f64 = invDet * (-planeY * sx + planeX * sy);
    if (transformY <= 0.15) continue;

    const spriteScreenX: i32 = <i32>((<f64>screenW * 0.5) * (1.0 + transformX / transformY));
    let size: i32 = <i32>(<f64>screenH * 0.35 / transformY);
    if (size < 4) size = 4;
    const maxSize: i32 = screenH >> 1;
    if (size > maxSize) size = maxSize;

    // Stars float a bit above the horizon line for readability.
    const cy: i32 = (screenH >> 1) - (size >> 2);
    drawStarShape(spriteScreenX, cy, size);
  }
}

// ---------------------------------------------------------------------------
// First-person cockpit view: we're inside the car looking straight ahead,
// and only the engine cover is visible in the foreground. The hood is a
// perspective-shortened trapezoid with three-band lateral shading (fakes
// curvature), a central crease, two domed power-bulges with specular
// highlights, a chrome cowl strip at the windshield base, and a small
// chrome hood ornament centred at the far edge.
// ---------------------------------------------------------------------------
function drawCar(): void {
  const w: i32 = screenW;
  const h: i32 = screenH;

  // Hood geometry: occupies the lower ~38 % of the screen.
  const hoodBottomY: i32 = h;
  const hoodTopY: i32 = (h * 62) / 100;
  const hoodHeight: i32 = hoodBottomY - hoodTopY;

  // Perspective: wider at the bottom (close to viewer), narrower at the top
  // (where it meets the windshield base).
  const bottomHalfW: i32 = (w * 48) / 100; // ≈96 % wide near the driver
  const topHalfW:    i32 = (w * 22) / 100; // ≈44 % wide at the horizon
  const cx: i32 = w >> 1;

  // 1) Trapezoidal fill with a lateral three-band shade (body in the
  //    middle, mid red just outside, deep red on the outer fenders) plus
  //    a top-row darkening for aerial perspective.
  for (let y: i32 = hoodTopY; y < hoodBottomY; y++) {
    const t: f64 = <f64>(y - hoodTopY) / <f64>hoodHeight; // 0 top, 1 bottom
    const halfW: i32 = <i32>(<f64>topHalfW + (<f64>bottomHalfW - <f64>topHalfW) * t);
    const x0: i32 = cx - halfW;
    const x1: i32 = cx + halfW;
    const rowBase: usize = pixelPtr + <usize>(y * screenW) * 4;
    const farRow: bool = t < 0.18; // furthest slice of the hood is a tad darker

    for (let x: i32 = x0; x < x1; x++) {
      const dx: f64 = <f64>(x - cx) / <f64>halfW;
      const absDx: f64 = dx < 0 ? -dx : dx;
      let color: u32;
      if (absDx > 0.88) {
        color = COLOR_CAR_DARK;
      } else if (absDx > 0.62) {
        color = farRow ? COLOR_CAR_DARK : COLOR_CAR_MID;
      } else {
        color = farRow ? COLOR_CAR_MID : COLOR_CAR_BODY;
      }
      store<u32>(rowBase + (<usize>x << 2), color);
    }
  }

  // 2) Central hood crease: one dark pixel column, full length of the hood.
  for (let y: i32 = hoodTopY; y < hoodBottomY; y++) {
    putPixel(cx, y, COLOR_CAR_DARK);
  }

  // 3) Two symmetric power-bulges with shaded highlights.
  const bulgeCY: i32 = hoodTopY + (hoodHeight * 3) / 10;
  const bulgeOffsetX: i32 = w / 10;
  const bulgeRadX: i32 = w / 30;
  const bulgeRadY: i32 = hoodHeight / 10;
  drawHoodBulge(cx - bulgeOffsetX, bulgeCY, bulgeRadX, bulgeRadY);
  drawHoodBulge(cx + bulgeOffsetX, bulgeCY, bulgeRadX, bulgeRadY);

  // 4) Chrome cowl strip: thin silver band at the top of the hood, where a
  //    real car has the gap between hood and windshield.
  const cowlStartX: i32 = cx - topHalfW;
  const cowlEndX: i32 = cx + topHalfW;
  for (let y: i32 = hoodTopY; y < hoodTopY + 2; y++) {
    if (y < 0 || y >= screenH) continue;
    const rowBase: usize = pixelPtr + <usize>(y * screenW) * 4;
    for (let x: i32 = cowlStartX; x < cowlEndX; x++) {
      if (x < 0 || x >= screenW) continue;
      store<u32>(rowBase + (<usize>x << 2), COLOR_CHROME);
    }
  }

  // 5) Small chrome hood ornament: a silver dome with a white specular cap,
  //    centred just below the cowl strip.
  const ornR: i32 = (w / 90) > 2 ? (w / 90) : 2;
  const ornY: i32 = hoodTopY + (hoodHeight / 20) + ornR;
  fillCircle(cx, ornY, ornR, COLOR_CHROME);
  const innerR: i32 = ornR > 2 ? ornR - 1 : 1;
  fillCircle(cx - 1, ornY - 1, innerR, COLOR_SPECULAR);
}

// Filled ellipse with directional shading — used for the hood's power
// bulges. The virtual light source sits above and to the left, producing a
// small white specular highlight at the crest and a deeper-red shadow on
// the lower-right quadrant.
function drawHoodBulge(cx: i32, cy: i32, rx: i32, ry: i32): void {
  if (rx < 2) rx = 2;
  if (ry < 2) ry = 2;
  const rx2f: f64 = <f64>rx * <f64>rx;
  const ry2f: f64 = <f64>ry * <f64>ry;
  for (let y: i32 = -ry; y <= ry; y++) {
    const py: i32 = cy + y;
    if (py < 0 || py >= screenH) continue;
    const fy: f64 = <f64>y;
    const yFrac: f64 = 1.0 - (fy * fy) / ry2f;
    if (yFrac < 0) continue;
    const xExt: i32 = <i32>(Math.sqrt(yFrac * rx2f));
    const rowBase: usize = pixelPtr + <usize>(py * screenW) * 4;
    for (let dx: i32 = -xExt; dx <= xExt; dx++) {
      const px: i32 = cx + dx;
      if (px < 0 || px >= screenW) continue;
      const nx: f64 = <f64>dx / <f64>rx;
      const ny: f64 = fy / <f64>ry;
      // Light coming from upper-left: brighter as nx and ny decrease.
      const lighting: f64 = (-ny - nx) * 0.55;
      let color: u32;
      if (lighting > 0.55) {
        color = COLOR_SPECULAR;
      } else if (lighting > 0.25) {
        color = COLOR_CAR_HIGH;
      } else if (lighting > -0.05) {
        color = COLOR_CAR_BODY;
      } else if (lighting > -0.35) {
        color = COLOR_CAR_MID;
      } else {
        color = COLOR_CAR_DARK;
      }
      store<u32>(rowBase + (<usize>px << 2), color);
    }
  }
}

// Required by --exportStart in some configurations.
export function _start(): void {}
