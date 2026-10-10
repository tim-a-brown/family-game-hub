// The Big Wheel as a real prop: a 3D drum of raised number plates between two checkered pillars
// lined with marquee bulbs, on a black lacquered plinth, under studio lights (three.js r160).
//
// Loaded as a module by plinko.html, which keeps all the game logic and physics. The page's classic
// BigWheel(host, hooks) hands over to window.BigWheel3D(host, hooks, api) when WebGL is there, and
// the object returned here keeps exactly the 2D renderer's contract: cv, layout, spin, busy, angle,
// setAngle, index, setMode, panelRect, redraw, destroy. api = { WHEEL, WA, WN, makeWheelSim, WSIM_H,
// WSIM_CAP, flapTick }. The physics loop below is the same loop the 2D renderer runs.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { AfterimagePass } from 'three/addons/postprocessing/AfterimagePass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// ── The prop, in world units (drum radius = 1) ──────────────────────────────
const R = 1, DW = 0.8;                 // drum radius and width (along x)
const PLATE = 0.014, BEV = 0.014;      // raised number plate: height and bevel width
const BOX = { x: 0.15, y: 0.11, w: 0.70, h: 0.78, r: 0.14 };   // the plate on its panel (fractions of w / h)
const PW = 0.44, PX = 0.6, PZ0 = 0.14, PZ1 = 0.56;             // pillars: width, inner x, back and front z
const PY0 = -1.12, PYA = 0.18;         // pillar bottom (base top) and where the arch starts
const ARCH = PW / 2;                   // arch radius
const BASE = { w: 2.24, h: 0.12, d: 1.5, z: 0.32 };
const FLOOR_Y = PY0 - BASE.h;
const POINTER = { x: 0.73, z: 1.03, len: 0.32, hh: 0.08 };
const READ = { x: PX + PW / 2, y: PYA - 0.03, w: 0.35, h: 0.18, d: 0.075 };
const FOV = 26;

let shared = null;        // renderer, canvas, environment, textures (built once per page)
const scratch = { v: new THREE.Vector3(), m: new THREE.Matrix4(), q: new THREE.Quaternion(), c: new THREE.Color(), s: new THREE.Vector3(1, 1, 1), p: new THREE.Vector3() };

function supported() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; }
}
function cv2d(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function tex(canvas, srgb) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = srgb === false ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  t.anisotropy = Math.min(8, shared.renderer.capabilities.getMaxAnisotropy());
  return t;
}
function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
function star(c, x, y, r) {
  c.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr2 = i % 2 ? r * 0.45 : r; c.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2); }
  c.closePath();
}
function nonIndexed(g) { if (g.index) { const n = g.toNonIndexed(); g.dispose(); return n; } return g; }
function merge(list) { const g = mergeGeometries(list.map(nonIndexed), false); list.forEach(x => x.dispose()); return g; }
function place(geo, x, y, z, rot, scale) {
  const m = scratch.m;
  if (rot) m.makeRotationFromEuler(new THREE.Euler(rot[0] || 0, rot[1] || 0, rot[2] || 0)); else m.identity();
  if (scale) m.scale(new THREE.Vector3(scale[0], scale[1], scale[2]));
  m.setPosition(x, y, z); geo.applyMatrix4(m); return geo;
}
function smooth(e0, e1, x) { const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); }
function noise2(x, y) { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); }

// ── Panel artwork: the printed vinyl (the plate's shading and bevel come from the geometry and the lights) ──
function paintPanel(c, v, x, y, w, h) {
  const kind = v === 7 ? 'star' : v === 1 ? 'green' : 'black';
  const body = c.createLinearGradient(0, y, 0, y + h);
  if (kind === 'green') { body.addColorStop(0, '#5cc95f'); body.addColorStop(1, '#3aa746'); }
  else { body.addColorStop(0, '#141417'); body.addColorStop(1, '#0b0b0d'); }
  c.fillStyle = body; c.fillRect(x, y, w, h);
  // fine print grain
  c.fillStyle = kind === 'green' ? 'rgba(0,0,0,.05)' : 'rgba(255,255,255,.03)';
  for (let i = 0; i < 120; i++) c.fillRect(x + noise2(i, v) * w, y + noise2(v + 9, i) * h, 1.5, 1.5);
  // the seam between panels: a dark groove with a thin bright lip above it
  const sm = h * 0.028;
  c.fillStyle = '#050506'; c.fillRect(x, y, w, sm); c.fillRect(x, y + h - sm, w, sm);
  c.fillStyle = 'rgba(255,255,255,.22)'; c.fillRect(x, y + sm, w, Math.max(1, h * 0.006));
  // the raised plate: gold (or dark green) bevel ring, then the plate face
  const bx = x + BOX.x * w, by = y + BOX.y * h, bw = BOX.w * w, bh = BOX.h * h, r = BOX.r * h, bev = BEV / (2 * Math.PI * R / 20) * h;
  const fr = c.createLinearGradient(0, by, 0, by + bh);
  if (kind === 'green') { fr.addColorStop(0, '#2f8a3a'); fr.addColorStop(1, '#17601f'); }
  else { fr.addColorStop(0, '#fff0b0'); fr.addColorStop(0.35, '#e0b84e'); fr.addColorStop(0.7, '#b8871f'); fr.addColorStop(1, '#f0d27a'); }
  rr(c, bx, by, bw, bh, r); c.fillStyle = fr; c.fill();
  const fill = c.createLinearGradient(0, by, 0, by + bh);
  if (kind === 'star') { fill.addColorStop(0, '#ef3139'); fill.addColorStop(0.55, '#c3121d'); fill.addColorStop(1, '#8f0a13'); }
  else if (kind === 'green') { fill.addColorStop(0, '#62d05f'); fill.addColorStop(1, '#3aa943'); }
  else { fill.addColorStop(0, '#1f1f24'); fill.addColorStop(1, '#0c0c0f'); }
  rr(c, bx + bev, by + bev, bw - 2 * bev, bh - 2 * bev, Math.max(2, r - bev)); c.fillStyle = fill; c.fill();
  // a thin pinstripe inside the bevel
  rr(c, bx + bev * 1.6, by + bev * 1.6, bw - 3.2 * bev, bh - 3.2 * bev, Math.max(1, r - bev * 1.6));
  c.lineWidth = Math.max(1, h * 0.008); c.strokeStyle = kind === 'green' ? 'rgba(255,255,255,.35)' : kind === 'star' ? 'rgba(255,220,140,.55)' : 'rgba(224,184,78,.4)'; c.stroke();
  // number + CHIPS
  const fs = h * 0.5, tx = x + w / 2, ty = by + bh * 0.43;
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.font = fs + 'px "Lilita One", system-ui, sans-serif';
  const ink = kind === 'green' ? '#14501d' : kind === 'star' ? '#fff4cc' : '#f6f3ea';
  c.fillStyle = kind === 'green' ? 'rgba(255,255,255,.4)' : 'rgba(0,0,0,.7)';
  c.fillText(String(v), tx, ty + (kind === 'green' ? -fs * 0.03 : fs * 0.05));
  if (kind === 'star') { c.lineWidth = fs * 0.08; c.strokeStyle = '#7a4a05'; c.strokeText(String(v), tx, ty); }
  const dg = c.createLinearGradient(0, ty - fs / 2, 0, ty + fs / 2);
  if (kind === 'black') { dg.addColorStop(0, '#ffffff'); dg.addColorStop(0.55, '#e9e6dd'); dg.addColorStop(1, '#b9b5aa'); }
  else if (kind === 'star') { dg.addColorStop(0, '#fffbe8'); dg.addColorStop(0.5, '#ffe07a'); dg.addColorStop(1, '#e8a51a'); }
  else { dg.addColorStop(0, '#1d6a28'); dg.addColorStop(1, ink); }
  c.fillStyle = dg; c.fillText(String(v), tx, ty);
  c.font = '900 ' + (h * 0.12) + 'px system-ui, -apple-system, "Segoe UI", sans-serif';
  if (c.letterSpacing !== undefined) c.letterSpacing = (h * 0.025) + 'px';
  c.fillStyle = kind === 'green' ? '#1a5d24' : kind === 'star' ? '#ffe7a0' : '#e0b84e';
  c.fillText(v === 1 ? 'CHIP' : 'CHIPS', tx + (c.letterSpacing !== undefined ? h * 0.0125 : 0), by + bh * 0.84);
  if (c.letterSpacing !== undefined) c.letterSpacing = '0px';
  if (kind === 'star') {
    const gs = c.createLinearGradient(0, ty - h * 0.1, 0, ty + h * 0.1); gs.addColorStop(0, '#fff3b8'); gs.addColorStop(1, '#d99a1a');
    c.fillStyle = gs; c.strokeStyle = '#7a4a05'; c.lineWidth = Math.max(1, h * 0.012);
    [-1, 1].forEach(sd => { star(c, tx + sd * bw * 0.34, ty, h * 0.1); c.fill(); c.stroke(); });
  }
}
// 20 panels in a 4 x 5 atlas (one texture, <= 2048 px)
function buildAtlas(WHEEL) {
  const A = DW / (2 * Math.PI * R / WHEEL.length), CW = 512, CH = Math.round(CW / A);
  const AW = 2048, AH = shared.renderer.capabilities.isWebGL2 ? CH * 5 : 2048;
  const [cn, c] = cv2d(AW, AH);
  c.fillStyle = '#0a0a0c'; c.fillRect(0, 0, AW, AH);
  WHEEL.forEach((v, j) => paintPanel(c, v, (j % 4) * CW, Math.floor(j / 4) * CH, CW, CH));
  const t = tex(cn); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return { tex: t, cell: j => [(j % 4) * CW / AW, Math.floor(j / 4) * CH / AH, CW / AW, CH / AH] };
}
// tileable grain normal map for the vinyl
function grainNormal() {
  const N = 256, data = new Uint8Array(N * N * 4), h = new Float32Array(N * N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    let v = 0; for (let o = 0; o < 3; o++) { const k = 4 << o, cx = Math.floor(x / (N / k)), cy = Math.floor(y / (N / k)), fx = (x % (N / k)) / (N / k), fy = (y % (N / k)) / (N / k);
      const n00 = noise2(cx, cy + o * 7), n10 = noise2((cx + 1) % k, cy + o * 7), n01 = noise2(cx, (cy + 1) % k + o * 7), n11 = noise2((cx + 1) % k, (cy + 1) % k + o * 7), sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
      v += ((n00 * (1 - sx) + n10 * sx) * (1 - sy) + (n01 * (1 - sx) + n11 * sx) * sy) / (o + 1); }
    h[y * N + x] = v;
  }
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const dx = h[y * N + (x + 1) % N] - h[y * N + (x + N - 1) % N], dy = h[((y + 1) % N) * N + x] - h[((y + N - 1) % N) * N + x];
    const nx = -dx * 4, ny = -dy * 4, nz = 1, l = Math.hypot(nx, ny, nz), i = (y * N + x) * 4;
    data[i] = 128 + 127 * nx / l; data[i + 1] = 128 + 127 * ny / l; data[i + 2] = 128 + 127 * nz / l; data[i + 3] = 255;
  }
  const t = new THREE.DataTexture(data, N, N); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(5, 4); t.needsUpdate = true; return t;
}
function brushed(n, dark, light, k) {
  const [cn, c] = cv2d(n, n); c.fillStyle = dark; c.fillRect(0, 0, n, n);
  for (let i = 0; i < n * k; i++) { c.fillStyle = 'rgba(' + light + ',' + (0.05 + Math.random() * 0.25).toFixed(2) + ')'; c.fillRect(Math.random() * n, Math.random() * n, 1 + Math.random() * 18, 1); }
  const t = tex(cn, false); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
function plywood() {
  const n = 256, [cn, c] = cv2d(n, n); c.fillStyle = '#808080'; c.fillRect(0, 0, n, n);
  for (let y = 0; y < n; y += 2) { const s = 118 + 20 * Math.sin(y * 0.11) + 10 * noise2(y, 3); c.fillStyle = 'rgb(' + s + ',' + s + ',' + s + ')'; c.fillRect(0, y, n, 2); }
  for (let i = 0; i < 1500; i++) { const s = 90 + Math.random() * 70; c.fillStyle = 'rgba(' + s + ',' + s + ',' + s + ',.5)'; c.fillRect(Math.random() * n, Math.random() * n, 1, 1); }
  const t = tex(cn, false); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 3); return t;
}
function glowCanvas(n) {
  const [cn, c] = cv2d(n, n), g = c.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,.45)'); g.addColorStop(0.6, 'rgba(255,255,255,.1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g; c.fillRect(0, 0, n, n); return tex(cn, false);
}
function softRect(w, h) {
  const [cn, c] = cv2d(w, h); c.clearRect(0, 0, w, h);
  c.shadowColor = 'rgba(255,255,255,1)'; c.shadowBlur = w * 0.05; c.strokeStyle = 'rgba(255,255,255,.95)'; c.lineWidth = w * 0.03;
  rr(c, w * 0.12, h * 0.13, w * 0.76, h * 0.74, h * 0.16); c.stroke(); c.stroke();
  c.shadowBlur = 0; c.fillStyle = 'rgba(255,255,255,.12)'; rr(c, w * 0.14, h * 0.16, w * 0.72, h * 0.68, h * 0.14); c.fill();
  return tex(cn, false);
}
function velvet() {
  const W = 1024, H = 512, [cn, c] = cv2d(W, H);
  const vg = c.createLinearGradient(0, 0, 0, H); vg.addColorStop(0, '#6a1a2c'); vg.addColorStop(0.5, '#4a1020'); vg.addColorStop(1, '#2a0812');
  c.fillStyle = vg; c.fillRect(0, 0, W, H);
  for (let x = 0; x < W; x++) {
    const f = 0.5 + 0.5 * Math.sin(x * 0.085) * (0.7 + 0.3 * Math.sin(x * 0.011)), g2 = 0.5 + 0.5 * Math.sin(x * 0.31 + 1.3);
    c.fillStyle = 'rgba(0,0,0,' + (0.42 * (1 - f) + 0.06 * g2).toFixed(3) + ')'; c.fillRect(x, 0, 1, H);
    if (f > 0.85) { c.fillStyle = 'rgba(255,150,150,' + (0.12 * (f - 0.85) / 0.15).toFixed(3) + ')'; c.fillRect(x, 0, 1, H); }
  }
  const t = tex(cn); t.wrapS = THREE.RepeatWrapping; t.repeat.set(2.4, 1); return t;
}
function floorTex() {
  const n = 1024, [cn, c] = cv2d(n, n);
  c.fillStyle = '#16111f'; c.fillRect(0, 0, n, n);
  c.fillStyle = 'rgba(255,255,255,.035)'; for (let x = 0; x < n; x += 46) c.fillRect(x, 0, 2, n);
  c.fillStyle = 'rgba(0,0,0,.25)'; for (let i = 0; i < 2600; i++) c.fillRect(Math.random() * n, Math.random() * n, 1 + Math.random() * 3, 1);
  const t = tex(cn); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 3); return t;
}
function poolTex() {
  const n = 512, [cn, c] = cv2d(n, n), g = c.createRadialGradient(n / 2, n * 0.45, 0, n / 2, n * 0.45, n * 0.5);
  g.addColorStop(0, 'rgba(255,205,140,.55)'); g.addColorStop(0.45, 'rgba(255,190,120,.22)'); g.addColorStop(1, 'rgba(255,180,100,0)');
  c.fillStyle = g; c.fillRect(0, 0, n, n); return tex(cn);
}
// the silver "$": a plate cut from the Lilita One glyph, its bevel and knurl as a heightfield
function dollarMaps() {
  const W = 384, H = 480, [cn, c] = cv2d(W, H), fs = H * 0.84;
  c.clearRect(0, 0, W, H); c.font = fs + 'px "Lilita One", system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.save(); c.translate(W / 2, H / 2 + fs * 0.03); c.scale(1.05, 1); c.fillStyle = '#fff'; c.fillText('$', 0, 0); c.restore();
  const a = c.getImageData(0, 0, W, H).data, alpha = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) alpha[i] = a[i * 4 + 3] / 255;
  // distance inward from the edge (a cheap erosion by repeated 3x3 min), 1 px per round
  const ROUNDS = 14, dist = new Float32Array(W * H); let cur = Float32Array.from(alpha.map(v => v > 0.5 ? 1 : 0));
  for (let r = 0; r < ROUNDS; r++) {
    const nxt = new Float32Array(W * H);
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const i = y * W + x; if (cur[i] < 0.5) continue;
      nxt[i] = (cur[i - 1] > 0.5 && cur[i + 1] > 0.5 && cur[i - W] > 0.5 && cur[i + W] > 0.5) ? 1 : 0;
    }
    for (let i = 0; i < W * H; i++) if (nxt[i] > 0.5) dist[i] = r + 1;
    cur = nxt;
  }
  const height = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x; if (alpha[i] < 0.5) continue;
    const u = Math.min(1, dist[i] / ROUNDS), bev = Math.sqrt(1 - (1 - u) * (1 - u));
    const kx = ((x + y) % 9) / 9, ky = ((x - y + 9000) % 9) / 9, kn = 0.5 + 0.5 * Math.sin(kx * 6.283) * Math.sin(ky * 6.283);   // knurled diamonds
    height[i] = bev * (1 - 0.12 * kn * u);
  }
  const nd = new Uint8Array(W * H * 4), K = 2.8;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, x0 = Math.max(0, x - 1), x1 = Math.min(W - 1, x + 1), y0 = Math.max(0, y - 1), y1 = Math.min(H - 1, y + 1);
    const dx = (height[y * W + x1] - height[y * W + x0]) * K, dy = (height[y0 * W + x] - height[y1 * W + x]) * K;
    const nx = -dx, ny = -dy, nz = 1, l = Math.hypot(nx, ny, nz);
    nd[i * 4] = 128 + 127 * nx / l; nd[i * 4 + 1] = 128 + 127 * ny / l; nd[i * 4 + 2] = 128 + 127 * nz / l; nd[i * 4 + 3] = 255;
  }
  const normal = new THREE.DataTexture(nd, W, H); normal.needsUpdate = true; normal.flipY = true;
  return { W, H, alpha: tex(cn, false), normal, height, alphaData: alpha };
}
function dollarGeometry(D, size) {
  // a displaced grid over the glyph; triangles fully outside the glyph are dropped
  const NX = 96, NY = 120, w = size * D.W / D.H, h = size, pos = [], nor = [], uv = [], idx = [], keep = new Uint8Array((NX + 1) * (NY + 1));
  const hAt = (fx, fy) => { const x = Math.max(0, Math.min(D.W - 1, Math.round(fx * (D.W - 1)))), y = Math.max(0, Math.min(D.H - 1, Math.round((1 - fy) * (D.H - 1)))); return D.height[y * D.W + x]; };
  const aAt = (fx, fy) => { const x = Math.max(0, Math.min(D.W - 1, Math.round(fx * (D.W - 1)))), y = Math.max(0, Math.min(D.H - 1, Math.round((1 - fy) * (D.H - 1)))); return D.alphaData[y * D.W + x]; };
  for (let j = 0; j <= NY; j++) for (let i = 0; i <= NX; i++) {
    const fx = i / NX, fy = j / NY, hh = hAt(fx, fy);
    pos.push((fx - 0.5) * w, (fy - 0.5) * h, hh * 0.028); nor.push(0, 0, 1); uv.push(fx, fy);
    let k = aAt(fx, fy) > 0.3 ? 1 : 0;
    if (!k) for (let dj = -1; dj <= 1 && !k; dj++) for (let di = -1; di <= 1 && !k; di++) if (aAt(fx + di / NX, fy + dj / NY) > 0.3) k = 1;
    keep[j * (NX + 1) + i] = k;
  }
  for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
    const a = j * (NX + 1) + i, b = a + 1, c = a + NX + 1, d = c + 1;
    if (!(keep[a] || keep[b] || keep[c] || keep[d])) continue;
    idx.push(a, b, c, b, d, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals(); return g;
}

// ── The drum: 20 curved panels with their raised plates as a heightfield on the cylinder ──
function samples(n, edges, bev) {
  const s = []; for (let i = 0; i <= n; i++) s.push(i / n);
  edges.forEach(e => { for (let k = -5; k <= 5; k++) s.push(e + k * bev / 4); });
  const out = s.filter(v => v >= 0 && v <= 1).sort((a, b) => a - b), u = [];
  out.forEach(v => { if (!u.length || v - u[u.length - 1] > 1e-4) u.push(v); });
  return u;
}
function panelGeometry(j, WN, atlas) {
  const WA = 2 * Math.PI / WN, PH = WA * R, cell = atlas.cell(j), phi0 = -j * WA;
  const bs = BEV / DW, bt = BEV / PH;
  const S = samples(20, [BOX.x, BOX.x + BOX.w], bs), T = samples(16, [BOX.y, BOX.y + BOX.h], bt);
  T.push(0.012, 0.024, 0.976, 0.988); T.sort((a, b) => a - b);
  const hx = BOX.w * DW / 2, hy = BOX.h * PH / 2, rad = BOX.r * PH, cx = (BOX.x + BOX.w / 2 - 0.5) * DW, cy = (0.5 - BOX.y - BOX.h / 2) * PH;
  const pos = [], uv = [], idx = [];
  for (let b = 0; b < T.length; b++) for (let a = 0; a < S.length; a++) {
    const s = S[a], t = T[b], u = (s - 0.5) * DW, v = (0.5 - t) * PH;
    // rounded-rect signed distance (negative inside), quarter-round bevel at the edge
    const qx = Math.abs(u - cx) - (hx - rad), qy = Math.abs(v - cy) - (hy - rad);
    const d = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - rad;
    let h = d <= -BEV ? PLATE : d >= 0 ? 0 : PLATE * Math.sqrt(Math.max(0, 1 - Math.pow((d + BEV) / BEV, 2)));
    const e = Math.min(t, 1 - t); if (e < 0.024) h -= 0.007 * (1 - e / 0.024);   // the seam groove
    const phi = phi0 - t * WA, rr2 = R + h;
    pos.push(u, rr2 * Math.sin(phi), rr2 * Math.cos(phi));
    uv.push(cell[0] + s * cell[2], 1 - (cell[1] + t * cell[3]));
  }
  for (let b = 0; b < T.length - 1; b++) for (let a = 0; a < S.length - 1; a++) {
    const p = b * S.length + a, q = p + S.length;
    idx.push(p, q, p + 1, p + 1, q, q + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals(); return g;
}

function ensureShared(canvas) {
  if (shared) return shared;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance', stencil: false });
  renderer.setClearColor(0x0c0618, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.shadowMap.autoUpdate = false;
  renderer.info.autoReset = false;
  shared = { renderer, canvas };
  const pm = new THREE.PMREMGenerator(renderer); shared.env = pm.fromScene(new RoomEnvironment(renderer), 0.04).texture; pm.dispose();
  shared.grain = grainNormal(); shared.brushed = brushed(256, '#8a8a8a', '255,255,255', 14); shared.brushed.repeat.set(4, 4);
  shared.ply = plywood(); shared.glow = glowCanvas(128); shared.soft = softRect(256, 160); shared.velvet = velvet(); shared.floor = floorTex(); shared.pool = poolTex();
  return shared;
}

// ── The renderer the page talks to ─────────────────────────────────────────
export function BigWheel3D(host, hooks, api) {
  if (!supported()) return null;
  const WHEEL = api.WHEEL, WN = api.WN, WA = api.WA, WSIM_H = api.WSIM_H, WSIM_CAP = api.WSIM_CAP, flapTick = api.flapTick;
  const PH = WA * R;
  const sh = ensureShared(shared ? shared.canvas : document.createElement('canvas'));
  const renderer = sh.renderer, cv = sh.canvas;
  cv.setAttribute('tabindex', '0'); cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', 'The Big Wheel. Swipe down on it to spin, or press Space.');
  host.appendChild(cv);
  const sim = api.makeWheelSim(), st = sim.s;
  const ac = new AbortController(), sig = { signal: ac.signal };
  let W = 300, H = 480, dpr = 1, maxDpr = 2, raf = 0, last = 0, acc = 0, spinning = null, drag = null, dead = false, lastDraw = 0, needDraw = true;
  let mode = 'idle', modeT0 = 0, glowIdx = -1, readout = null, readKey = '', level = 0, slowT = 0, frames = 0, lastMs = 0;
  const par = { x: 0, y: 0, tx: 0, ty: 0 };

  // scene
  const scene = new THREE.Scene(); scene.environment = sh.env;
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.5, 40);
  const E = 0.3;
  const M = {
    vinyl: new THREE.MeshPhysicalMaterial({ map: null, roughness: 0.34, metalness: 0, clearcoat: 0.6, clearcoatRoughness: 0.18, normalMap: sh.grain, normalScale: new THREE.Vector2(0.07, 0.07), envMapIntensity: 0.3 }),
    chrome: new THREE.MeshPhysicalMaterial({ color: 0xcfd3d8, metalness: 1, roughness: 0.2, roughnessMap: sh.brushed, envMapIntensity: 0.45 }),
    steel: new THREE.MeshStandardMaterial({ color: 0x24262b, metalness: 0.85, roughness: 0.42, envMapIntensity: 0.5 }),
    black: new THREE.MeshStandardMaterial({ color: 0x0e0e10, metalness: 0.45, roughness: 0.5, envMapIntensity: 0.3 }),
    inner: new THREE.MeshStandardMaterial({ color: 0x060608, roughness: 0.95, side: THREE.BackSide }),
    lacquer: new THREE.MeshPhysicalMaterial({ color: 0x07070a, roughness: 0.16, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.1, envMapIntensity: 0.25 }),
    orange: new THREE.MeshPhysicalMaterial({ color: 0xf2912a, roughness: 0.5, metalness: 0, clearcoat: 0.45, clearcoatRoughness: 0.35, bumpMap: sh.ply, bumpScale: 0.008, envMapIntensity: E }),
    red: new THREE.MeshPhysicalMaterial({ color: 0xc62f18, roughness: 0.4, clearcoat: 0.55, clearcoatRoughness: 0.3, envMapIntensity: E }),
    cream: new THREE.MeshPhysicalMaterial({ color: 0xf2e7d3, roughness: 0.5, clearcoat: 0.3, clearcoatRoughness: 0.4, envMapIntensity: E }),
    brass: new THREE.MeshPhysicalMaterial({ color: 0xcfa34e, metalness: 1, roughness: 0.32, roughnessMap: sh.brushed, envMapIntensity: 0.5 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0xb8a890, metalness: 0, roughness: 0.08, transparent: true, opacity: 0.22, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 0.25, depthWrite: false }),
    silver: null, pointer: new THREE.MeshPhysicalMaterial({ color: 0xc81e16, roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.15, envMapIntensity: 0.3 }),
    velvet: new THREE.MeshStandardMaterial({ map: sh.velvet, roughness: 0.96, metalness: 0, envMapIntensity: 0.08 }),
    floor: new THREE.MeshPhysicalMaterial({ map: sh.floor, emissiveMap: sh.pool, emissive: 0xffffff, emissiveIntensity: 0.22, roughness: 0.3, metalness: 0, clearcoat: 0.7, clearcoatRoughness: 0.18, envMapIntensity: 0.18 }),
    display: new THREE.MeshBasicMaterial({ map: null, toneMapped: false, color: new THREE.Color(2.4, 2.4, 2.4) }),
    glassFlat: new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0, roughness: 0.03, transparent: true, opacity: 0.12, clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 0.1, depthWrite: false }),
    core: new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }),
    pool: new THREE.MeshBasicMaterial({ map: sh.glow, color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
    glowQ: new THREE.MeshBasicMaterial({ map: sh.soft, color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, opacity: 0 })
  };
  const world = new THREE.Group(); scene.add(world);
  const drum = new THREE.Group(); world.add(drum);
  let atlas = null, dollar = null, dmesh = [], readCanvas = null, readCtx = null, readTex = null;
  const bulbs = [];   // {x,y,z, i (chain index), on, k}
  let cores = null, pools = null, pointer = null, ptrShadow = null, glowQ = null, key = null, keyFill = null, rimL = null, bulbLights = [], floor = null;
  const dyn = [];     // meshes to dispose on destroy

  function buildTextures() {
    if (atlas) atlas.tex.dispose();
    atlas = buildAtlas(WHEEL); M.vinyl.map = atlas.tex; M.vinyl.needsUpdate = true;
    if (dollar) { dollar.alpha.dispose(); dollar.normal.dispose(); }
    dollar = dollarMaps();
    if (!M.silver) M.silver = new THREE.MeshPhysicalMaterial({ color: 0xd9dde4, metalness: 0.92, roughness: 0.36, roughnessMap: sh.brushed, envMapIntensity: 0.6, alphaTest: 0.5 });
    M.silver.alphaMap = dollar.alpha; M.silver.normalMap = dollar.normal; M.silver.normalScale = new THREE.Vector2(1, 1); M.silver.needsUpdate = true;
  }
  function addMesh(geo, mat, parent, cast, recv) { const m = new THREE.Mesh(geo, mat); m.castShadow = !!cast; m.receiveShadow = recv !== false; (parent || world).add(m); dyn.push(m); return m; }

  function buildDrum() {
    const shells = []; for (let j = 0; j < WN; j++) shells.push(panelGeometry(j, WN, atlas));
    const shell = addMesh(merge(shells), M.vinyl, drum, true, true); shell.name = 'shell';
    // the inside of the drum, the dark steel side plates, the chrome rims, pegs and axle
    addMesh(place(new THREE.CylinderGeometry(R - 0.004, R - 0.004, DW, 64, 1, true), 0, 0, 0, [0, 0, Math.PI / 2]), M.inner, drum, false, false);
    const plates = [];
    [-1, 1].forEach(sd => plates.push(place(new THREE.CylinderGeometry(R - 0.035, R - 0.035, 0.02, 64), sd * (DW / 2 - 0.07), 0, 0, [0, 0, Math.PI / 2])));
    addMesh(merge(plates), M.steel, drum, false, true);
    const chrome = [];
    [-1, 1].forEach(sd => chrome.push(place(new THREE.TorusGeometry(R - 0.002, 0.016, 8, 96), sd * DW / 2, 0, 0, [0, Math.PI / 2, 0])));
    for (let k = 0; k < WN; k++) {
      const phi = -k * WA, rp = R - 0.03;
      chrome.push(place(new THREE.CapsuleGeometry(0.017, DW + 0.17, 3, 10), 0, rp * Math.sin(phi), rp * Math.cos(phi), [0, 0, Math.PI / 2]));
    }
    chrome.push(place(new THREE.CylinderGeometry(0.045, 0.045, 1.3, 20), 0, 0, 0, [0, 0, Math.PI / 2]));
    addMesh(merge(chrome), M.chrome, drum, true, true);
    // the glow on the winning panel (a soft quad just above the plate, turned to the panel)
    glowQ = new THREE.Mesh(new THREE.PlaneGeometry(DW * BOX.w + 0.12, PH * BOX.h + 0.1), M.glowQ); glowQ.visible = false; glowQ.renderOrder = 5; drum.add(glowQ); dyn.push(glowQ);
  }
  function buildStands() {
    // black steel: the back arch, bearing blocks on both sides of the drum, the base plinth on top of the floor
    const blk = [];
    const arch = new THREE.Shape(); arch.absarc(0, 0, R + 0.25, 0, Math.PI, false); arch.absarc(0, 0, R + 0.09, Math.PI, 0, true);
    blk.push(place(new THREE.ExtrudeGeometry(arch, { depth: 0.12, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 2 }), 0, 0, -0.62));
    [-1, 1].forEach(sd => {
      blk.push(place(new THREE.BoxGeometry(0.16, -PY0, 0.12), sd * (R + 0.17), PY0 / 2, -0.56));                 // arch legs
      blk.push(place(new RoundedBoxGeometry(0.26, 0.05, 0.36, 2, 0.01), sd * (R + 0.17), PY0 + 0.025, -0.5));    // arch feet
      blk.push(place(new THREE.BoxGeometry(0.1, -PY0 - 0.02, 0.16), sd * (DW / 2 + 0.17), PY0 + (-PY0 - 0.02) / 2, 0));   // bearing uprights
      blk.push(place(new THREE.CylinderGeometry(0.1, 0.1, 0.1, 24), sd * (DW / 2 + 0.17), 0, 0, [0, 0, Math.PI / 2]));
    });
    addMesh(merge(blk), M.black, world, true, true);
    const bolts = [];
    [-1, 1].forEach(sd => { for (let b = 0; b < 4; b++) { const a = b * Math.PI / 2 + Math.PI / 4; bolts.push(place(new THREE.CylinderGeometry(0.011, 0.011, 0.014, 6), sd * (DW / 2 + 0.17 + 0.057), 0.062 * Math.sin(a), 0.062 * Math.cos(a), [0, 0, Math.PI / 2])); } });
    addMesh(merge(bolts), M.chrome, world, false, true);
    addMesh(new RoundedBoxGeometry(BASE.w, BASE.h, BASE.d, 3, 0.022), M.lacquer, world, true, true).position.set(0, PY0 - BASE.h / 2, BASE.z);
    // stage: a glossy floor and the velvet curtain
    floor = addMesh(new THREE.PlaneGeometry(9, 7), M.floor, world, false, true); floor.rotation.x = -Math.PI / 2; floor.position.set(0, FLOOR_Y, 0.4);
    setupReflection();
    const cu = addMesh(new THREE.PlaneGeometry(9, 7), M.velvet, world, false, true); cu.position.set(0, 1.5, -1.5);
  }
  function pillarShape() {
    const s = new THREE.Shape(); s.moveTo(-PW / 2, PY0); s.lineTo(PW / 2, PY0); s.lineTo(PW / 2, PYA); s.absarc(0, PYA, PW / 2, 0, Math.PI, false); s.lineTo(-PW / 2, PY0); return s;
  }
  function buildPillars() {
    const bodies = [], tiles = [], rails = [], sockets = [], glassG = [];
    const shape = pillarShape();
    [-1, 1].forEach(sd => {
      const xc = sd * (PX + PW / 2);
      bodies.push(place(new THREE.ExtrudeGeometry(shape, { depth: PZ1 - PZ0, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 3, curveSegments: 24 }), xc, 0, PZ0));
      // raised red tiles in a checker (none under the bulb rail)
      const cs = PW / 5, tw = cs * 0.78, inset = 0.062, xi = -sd * PW / 2 + sd * inset, ra = PW / 2 - inset;
      const nearRail = (x, y) => {
        const dLine = y <= PYA ? Math.abs(x - xi) : Math.hypot(x - xi, y - PYA);
        const dArc = y >= PYA ? Math.abs(Math.hypot(x, y - PYA) - ra) : Math.min(Math.hypot(x - ra, y - PYA), Math.hypot(x + ra, y - PYA));
        return Math.min(dLine, dArc) < tw / 2 + 0.03;
      };
      for (let row = 0; row < 14; row++) for (let col = 0; col < 5; col++) {
        if ((row + col) % 2) continue;
        const x = -PW / 2 + (col + 0.5) * cs, y = PY0 + (row + 0.5) * cs;
        // inside the arch shape with margin?
        const top = y + tw / 2, inArch = top <= PYA || Math.hypot(Math.abs(x) + tw / 2, Math.max(0, top - PYA)) <= PW / 2 - 0.01;
        if (!inArch || nearRail(x, y)) continue;
        tiles.push(place(new RoundedBoxGeometry(tw, tw, 0.022, 2, 0.006), xc + x, y, PZ1 + 0.011));
      }
      // the cream bulb rail: up the side next to the drum, then over the arch
      const pts = [], zr = PZ1 + 0.014;
      for (let y = PY0 + 0.03; y < PYA; y += 0.04) pts.push(new THREE.Vector3(xc + xi, y, zr));
      const n = 30;
      for (let i = 0; i <= n; i++) { const t = i / n, a = sd < 0 ? t * Math.PI : Math.PI - t * Math.PI; pts.push(new THREE.Vector3(xc + Math.cos(a) * ra, PYA + Math.sin(a) * ra, zr)); }
      const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.5);
      rails.push(new THREE.TubeGeometry(curve, 110, 0.02, 10, false));
      // bulbs along the rail, every 0.052
      const len = curve.getLength(), nb = Math.round(len / 0.052), chain = [];
      for (let i = 0; i <= nb; i++) {
        const p = curve.getPointAt(i / nb); chain.push(p);
        sockets.push(place(new THREE.CylinderGeometry(0.014, 0.017, 0.016, 10), p.x, p.y, zr + 0.016, [Math.PI / 2, 0, 0]));
        glassG.push(place(new THREE.SphereGeometry(0.022, 12, 8), p.x, p.y, zr + 0.038));
        bulbs.push({ x: p.x, y: p.y, z: zr + 0.038, i: i, on: 0, k: 0 });
      }
      // one warm point light per pillar, in front of the arch, for the glow the bulbs throw on the paint
      const pl = new THREE.PointLight(0xffb45a, 0, 1.6, 2); pl.position.set(xc, PYA + 0.05, PZ1 + 0.3); world.add(pl); bulbLights.push(pl);
    });
    addMesh(merge(bodies), M.orange, world, true, true);
    addMesh(merge(tiles), M.red, world, true, true);
    addMesh(merge(rails), M.cream, world, true, true);
    addMesh(merge(sockets), M.brass, world, false, true);
    const gl = addMesh(merge(glassG), M.glass, world, false, false); gl.renderOrder = 4;
    // filament cores and the light pools on the paint, instanced so a chase costs one draw call each
    const n = bulbs.length;
    cores = new THREE.InstancedMesh(new THREE.SphereGeometry(0.0145, 10, 7), M.core, n);
    pools = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.26, 0.26), M.pool, n); pools.renderOrder = 3;
    const m4 = scratch.m, col = scratch.c;
    bulbs.forEach((b, i) => {
      m4.identity(); m4.setPosition(b.x, b.y, b.z); cores.setMatrixAt(i, m4);
      m4.setPosition(b.x, b.y, PZ1 + 0.026); pools.setMatrixAt(i, m4);
      cores.setColorAt(i, col.setRGB(0.3, 0.22, 0.14)); pools.setColorAt(i, col.setRGB(0, 0, 0));
    });
    world.add(cores); world.add(pools); dyn.push(cores, pools);
  }
  function buildDollars() {
    dmesh.forEach(m => { world.remove(m); m.geometry.dispose(); }); dmesh = [];
    const size = 0.66, g = dollarGeometry(dollar, size);
    [[-1, PY0 + (PYA - PY0) * 0.52 + 0.05], [1, PY0 + (PYA - PY0) * 0.42 - 0.02]].forEach(([sd, y]) => {
      const m = new THREE.Mesh(g, M.silver); m.position.set(sd * (PX + PW / 2), y, PZ1 + 0.026); m.castShadow = true; m.receiveShadow = true; world.add(m); dmesh.push(m);
    });
  }
  function buildPointer() {
    pointer = new THREE.Group(); pointer.position.set(POINTER.x, 0, POINTER.z); world.add(pointer);
    const L = POINTER.len, hh = POINTER.hh, s = new THREE.Shape();
    s.moveTo(-L, 0); s.lineTo(-L * 0.1, -hh); s.lineTo(L * 0.12, -hh * 0.45); s.lineTo(L * 0.12, hh * 0.45); s.lineTo(-L * 0.1, hh); s.closePath();
    const arrow = new THREE.Mesh(place(new THREE.ExtrudeGeometry(s, { depth: 0.022, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 2 }), 0, 0, -0.011), M.pointer);
    arrow.castShadow = true; arrow.receiveShadow = true; pointer.add(arrow); dyn.push(arrow);
    const pv = merge([
      place(new THREE.CylinderGeometry(0.03, 0.03, 0.05, 20), 0, 0, 0, [Math.PI / 2, 0, 0]),
      place(new THREE.SphereGeometry(0.03, 16, 10), 0, 0, 0.025, null, [1, 1, 0.45])
    ]);
    const pivot = new THREE.Mesh(pv, M.brass); pivot.castShadow = true; pointer.add(pivot); dyn.push(pivot);
    // the brass bracket back to the pillar
    const rod = merge([
      place(new THREE.CylinderGeometry(0.014, 0.014, POINTER.z - PZ1, 12), POINTER.x, 0, (POINTER.z + PZ1) / 2, [Math.PI / 2, 0, 0]),
      place(new THREE.CylinderGeometry(0.05, 0.05, 0.02, 20), POINTER.x, 0, PZ1 + 0.01, [Math.PI / 2, 0, 0])
    ]);
    addMesh(rod, M.brass, world, true, true);
    ptrShadow = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.09), new THREE.MeshBasicMaterial({ map: sh.glow, color: 0x000000, transparent: true, opacity: 0.5, depthWrite: false }));
    ptrShadow.renderOrder = 2; world.add(ptrShadow); dyn.push(ptrShadow);
  }
  function buildReadout() {
    const box = new THREE.Group(); box.position.set(READ.x, READ.y, PZ1 + 0.012); world.add(box);
    addMesh(new RoundedBoxGeometry(READ.w, READ.h, READ.d, 2, 0.012), M.lacquer, box, true, true).position.set(0, 0, READ.d / 2);
    const bez = new THREE.Shape(); bez.moveTo(-READ.w / 2, -READ.h / 2); bez.lineTo(READ.w / 2, -READ.h / 2); bez.lineTo(READ.w / 2, READ.h / 2); bez.lineTo(-READ.w / 2, READ.h / 2); bez.closePath();
    const hole = new THREE.Path(); const iw = READ.w - 0.05, ih = READ.h - 0.05;
    hole.moveTo(-iw / 2, -ih / 2); hole.lineTo(-iw / 2, ih / 2); hole.lineTo(iw / 2, ih / 2); hole.lineTo(iw / 2, -ih / 2); hole.closePath(); bez.holes.push(hole);
    addMesh(place(new THREE.ExtrudeGeometry(bez, { depth: 0.022, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 2 }), 0, 0, READ.d), M.black, box, true, true);
    readCanvas = document.createElement('canvas'); readCanvas.width = 320; readCanvas.height = 160; readCtx = readCanvas.getContext('2d');
    readTex = tex(readCanvas); M.display.map = readTex; M.display.needsUpdate = true;
    const disp = addMesh(new THREE.PlaneGeometry(iw, ih), M.display, box, false, false); disp.position.set(0, 0, READ.d + 0.001);
    const gls = addMesh(new THREE.PlaneGeometry(iw, ih), M.glassFlat, box, false, false); gls.position.set(0, 0, READ.d + 0.024); gls.renderOrder = 6;
  }

  // ── A soft reflection of the prop in the glossy floor: the scene from a camera mirrored in the floor
  // plane, drawn into a small texture the floor's shader samples projectively ──
  const refl = { cam: new THREE.PerspectiveCamera(), rt: new THREE.WebGLRenderTarget(2, 2, { type: THREE.HalfFloatType }), tm: new THREE.Matrix4(), on: true,
    plane: new THREE.Plane(), n: new THREE.Vector3(), v: new THREE.Vector3(), t: new THREE.Vector3(), la: new THREE.Vector3(), rm: new THREE.Matrix4(), q: new THREE.Vector4(), cp: new THREE.Vector4(), cw: new THREE.Vector3(), fw: new THREE.Vector3() };
  function setupReflection() {
    refl.rt.texture.minFilter = THREE.LinearFilter; refl.rt.texture.magFilter = THREE.LinearFilter;
    M.floor.customProgramCacheKey = () => 'bwFloorRefl';
    M.floor.onBeforeCompile = (sh2) => {
      sh2.uniforms.tRefl = { value: refl.rt.texture }; sh2.uniforms.reflMatrix = { value: refl.tm }; sh2.uniforms.reflK = { value: 0.0 };
      M.floor.userData.u = sh2.uniforms;
      sh2.vertexShader = sh2.vertexShader.replace('#include <common>', '#include <common>\nuniform mat4 reflMatrix; varying vec4 vReflUv; varying vec3 vReflW;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvReflUv = reflMatrix * vec4(position, 1.0); vReflW = (modelMatrix * vec4(position, 1.0)).xyz;');
      sh2.fragmentShader = sh2.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D tRefl; uniform float reflK; varying vec4 vReflUv; varying vec3 vReflW;')
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n{ vec2 ruv = vReflUv.xy / vReflUv.w; vec3 rc = texture2D(tRefl, ruv).rgb + texture2D(tRefl, ruv + vec2(0.005, 0.0)).rgb + texture2D(tRefl, ruv - vec2(0.005, 0.0)).rgb + texture2D(tRefl, ruv + vec2(0.0, 0.008)).rgb;\n  float fr = pow(1.0 - clamp(dot(normalize(vViewPosition), normal), 0.0, 1.0), 2.0); float fade = 1.0 - smoothstep(1.0, 2.3, vReflW.z); totalEmissiveRadiance += rc * 0.25 * reflK * (0.06 + 0.2 * fr) * fade; }');
    };
  }
  function renderReflection() {
    if (!refl.on || !floor) { if (M.floor.userData.u) M.floor.userData.u.reflK.value = 0; return; }
    const R2 = refl, vc = R2.cam;
    R2.fw.setFromMatrixPosition(floor.matrixWorld); R2.cw.setFromMatrixPosition(camera.matrixWorld);
    R2.rm.extractRotation(floor.matrixWorld); R2.n.set(0, 0, 1).applyMatrix4(R2.rm);
    R2.v.subVectors(R2.fw, R2.cw); if (R2.v.dot(R2.n) > 0) return;
    R2.v.reflect(R2.n).negate().add(R2.fw);
    R2.rm.extractRotation(camera.matrixWorld);
    R2.la.set(0, 0, -1).applyMatrix4(R2.rm).add(R2.cw);
    R2.t.subVectors(R2.fw, R2.la).reflect(R2.n).negate().add(R2.fw);
    vc.position.copy(R2.v); vc.up.set(0, 1, 0).applyMatrix4(R2.rm).reflect(R2.n); vc.lookAt(R2.t);
    vc.far = camera.far; vc.updateMatrixWorld(); vc.projectionMatrix.copy(camera.projectionMatrix);
    R2.tm.set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
    R2.tm.multiply(vc.projectionMatrix).multiply(vc.matrixWorldInverse).multiply(floor.matrixWorld);
    R2.plane.setFromNormalAndCoplanarPoint(R2.n, R2.fw).applyMatrix4(vc.matrixWorldInverse);
    R2.cp.set(R2.plane.normal.x, R2.plane.normal.y, R2.plane.normal.z, R2.plane.constant);
    const pm = vc.projectionMatrix, q = R2.q;
    q.x = (Math.sign(R2.cp.x) + pm.elements[8]) / pm.elements[0]; q.y = (Math.sign(R2.cp.y) + pm.elements[9]) / pm.elements[5]; q.z = -1; q.w = (1 + pm.elements[10]) / pm.elements[14];
    R2.cp.multiplyScalar(2 / R2.cp.dot(q));
    pm.elements[2] = R2.cp.x; pm.elements[6] = R2.cp.y; pm.elements[10] = R2.cp.z + 1 - 0.003; pm.elements[14] = R2.cp.w;
    floor.visible = false; pools.visible = false;
    renderer.setRenderTarget(R2.rt); renderer.clear(); renderer.render(scene, vc); renderer.setRenderTarget(null);
    floor.visible = true; pools.visible = true;
    if (M.floor.userData.u) M.floor.userData.u.reflK.value = 1;
  }
  function buildLights() {
    key = new THREE.SpotLight(0xffdcb4, 60, 0, 0.62, 0.55, 2); key.position.set(-2.6, 3.0, 5.6); key.target.position.set(0.1, -0.3, 0.3); world.add(key); world.add(key.target);
    key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.camera.near = 2; key.shadow.camera.far = 12; key.shadow.bias = -0.00015; key.shadow.normalBias = 0.005;
    keyFill = new THREE.DirectionalLight(0x9fb8ff, 0.4); keyFill.position.set(3.5, 1.2, 3); world.add(keyFill);
    rimL = new THREE.DirectionalLight(0xffe6c8, 0.9); rimL.position.set(1.5, 3.5, -3); world.add(rimL);
    const amb = new THREE.HemisphereLight(0x6a5a8a, 0x1a0a14, 0.2); world.add(amb);
    // the pool of the key light on the floor and a little bounce from below
    const under = new THREE.PointLight(0xffc890, 0.5, 3, 2); under.position.set(0, FLOOR_Y + 0.5, 1.6); world.add(under);
    const back = new THREE.PointLight(0xffb090, 2.2, 5, 2); back.position.set(0.4, 2.3, -0.5); world.add(back);
  }

  function build() {
    buildTextures(); buildDrum(); buildStands(); buildPillars(); buildDollars(); buildPointer(); buildReadout(); buildLights();
  }
  build();
  if (document.fonts && document.fonts.load) document.fonts.load('40px "Lilita One"').then(() => { if (!dead) rebuildTextures(); }, () => {});
  function rebuildTextures() { buildTextures(); buildDollars(); needDraw = true; kick(); }

  // ── Post: bloom for the bulbs and the readout, a trail while the drum is fast ──
  const rt = new THREE.WebGLRenderTarget(2, 2, { type: THREE.HalfFloatType, samples: renderer.capabilities.isWebGL2 ? 4 : 0 });
  const composer = new EffectComposer(renderer, rt);
  const renderPass = new RenderPass(scene, camera); composer.addPass(renderPass);
  const trail = new AfterimagePass(0.6); trail.enabled = false; composer.addPass(trail);
  const bloom = new UnrealBloomPass(new THREE.Vector2(2, 2), 0.4, 0.3, 1.45); composer.addPass(bloom);
  composer.addPass(new OutputPass());

  function layout(w, h) {
    W = w; H = h; dpr = Math.min(maxDpr, window.devicePixelRatio || 1);
    renderer.setPixelRatio(dpr); renderer.setSize(W, H, false); cv.style.width = W + 'px'; cv.style.height = H + 'px';
    composer.setPixelRatio(dpr); composer.setSize(W, H);
    refl.rt.setSize(Math.max(2, Math.round(W * dpr / 3)), Math.max(2, Math.round(H * dpr / 3)));
    camera.aspect = W / H;
    // fit the prop: wide enough for both pillars, tall enough for the drum, the floor and some curtain
    const t = Math.tan(FOV / 2 * Math.PI / 180), dW = 1.04 / (t * camera.aspect), dH = 1.36 / t;
    const d = Math.max(dW, dH);
    camera.position.set(0, 0.3, d + 0.9); camera.lookAt(0, -0.06, 0.3);
    camera.near = Math.max(0.5, d * 0.3); camera.far = d + 12; camera.updateProjectionMatrix();
    camBase.copy(camera.position);
    needDraw = true; draw(performance.now());
  }
  const camBase = new THREE.Vector3();

  // ── Per frame ──
  function paintReadout(now) {
    const txt = readout == null ? '--' : (String(readout).length < 2 ? ' ' + readout : String(readout));
    const blink = mode === 'result' || mode === 'jack' ? (Math.floor((now - modeT0) / 260) % 2 === 0 || now - modeT0 > 2200) : true;
    const k = txt + (blink ? 1 : 0); if (k === readKey) return; readKey = k;
    const c = readCtx, w = readCanvas.width, h = readCanvas.height;
    c.fillStyle = '#0a0705'; c.fillRect(0, 0, w, h);
    const SEG = { '0': 'abcdef', '1': 'bc', '2': 'abged', '3': 'abgcd', '4': 'fgbc', '5': 'afgcd', '6': 'afgedc', '7': 'abc', '8': 'abcdefg', '9': 'abcdfg', '-': 'g', ' ': '' };
    function seg7(x, y, dw, dh, ch, on) {
      const t = dw * 0.2, sk = dw * 0.12, m = SEG[ch] || '';
      function bar(id, x0, y0, x1, y1) {
        const lit = m.indexOf(id) >= 0, dx = x1 - x0, dy = y1 - y0, ln = Math.hypot(dx, dy), ux = dx / ln, uy = dy / ln, nx = -uy * t / 2, ny = ux * t / 2, e = t * 0.55;
        c.beginPath(); c.moveTo(x0 + ux * e * 0.1, y0 + uy * e * 0.1); c.lineTo(x0 + ux * e + nx, y0 + uy * e + ny); c.lineTo(x1 - ux * e + nx, y1 - uy * e + ny);
        c.lineTo(x1 - ux * e * 0.1, y1 - uy * e * 0.1); c.lineTo(x1 - ux * e - nx, y1 - uy * e - ny); c.lineTo(x0 + ux * e - nx, y0 + uy * e - ny); c.closePath();
        if (lit && on) { c.shadowColor = 'rgba(255,170,40,.9)'; c.shadowBlur = 10; c.fillStyle = '#ffb52e'; } else { c.shadowBlur = 0; c.fillStyle = 'rgba(255,160,40,.07)'; }
        c.fill();
      }
      const P = (px, py2) => [x + px * dw + (1 - py2) * sk, y + py2 * dh];
      const A0 = P(0, 0), A1 = P(1, 0), M0 = P(0, 0.5), M1 = P(1, 0.5), B0 = P(0, 1), B1 = P(1, 1);
      c.save();
      bar('a', A0[0], A0[1], A1[0], A1[1]); bar('g', M0[0], M0[1], M1[0], M1[1]); bar('d', B0[0], B0[1], B1[0], B1[1]);
      bar('f', A0[0], A0[1], M0[0], M0[1]); bar('b', A1[0], A1[1], M1[0], M1[1]); bar('e', M0[0], M0[1], B0[0], B0[1]); bar('c', M1[0], M1[1], B1[0], B1[1]);
      c.restore();
    }
    const dw = w * 0.3, dh = h * 0.7;
    seg7(w * 0.12, h * 0.15, dw, dh, txt[0], blink); seg7(w * 0.12 + dw * 1.38, h * 0.15, dw, dh, txt[1], blink);
    readTex.needsUpdate = true;
  }
  function stepBulbs(now, dt, snap) {
    const t = (now - modeT0) / 1000, rate = mode === 'spin' ? 6 + Math.min(18, Math.abs(st.om) * 3) : mode === 'result' ? 16 : 4.5, ph = Math.floor(t * rate);
    const col = scratch.c; let lit = 0, changed = false;
    for (let i = 0; i < bulbs.length; i++) {
      const b = bulbs[i]; let on;
      if (mode === 'jack') on = ((b.i * 7 + Math.floor(t * 14) * 3) % 5) < 2 || (Math.floor(t * 5) % 2 === 0 && t < 2.5);
      else on = ((b.i + 3000 - ph) % 3) === 0;
      const target = on ? 1 : 0, k0 = b.k;
      b.k = snap ? target : b.k + (target - b.k) * Math.min(1, dt * (on ? 28 : 14));
      if (Math.abs(b.k - k0) > 0.002) changed = true;
      lit += b.k;
      const k = b.k;
      cores.setColorAt(i, col.setRGB(0.2 + 3.4 * k, 0.14 + 2.4 * k, 0.08 + 1.0 * k));
      pools.setColorAt(i, col.setRGB(0.55 * k, 0.34 * k, 0.12 * k));
    }
    if (changed) { cores.instanceColor.needsUpdate = true; pools.instanceColor.needsUpdate = true; }
    const share = lit / bulbs.length;
    bulbLights.forEach(l => { l.intensity = 0.08 + 0.6 * share; });
    return changed;
  }
  function stepGlow(now) {
    if (glowIdx < 0 || (mode !== 'result' && mode !== 'jack')) { glowQ.visible = false; return; }
    const t = (now - modeT0) / 1000, pulse = 0.6 + 0.4 * Math.sin(t * 8), v = WHEEL[glowIdx];
    const phi = -(glowIdx + 0.5) * WA, rr2 = R + PLATE + 0.012;
    glowQ.position.set(0, rr2 * Math.sin(phi), rr2 * Math.cos(phi)); glowQ.rotation.set(-phi, 0, 0);
    glowQ.visible = true;
    const c = v === 7 ? [1, 0.84, 0.35] : v === 1 ? [0.6, 1, 0.55] : [1, 0.9, 0.62];
    M.glowQ.color.setRGB(c[0] * 1.8, c[1] * 1.8, c[2] * 1.8); M.glowQ.opacity = 0.25 + 0.45 * pulse;
  }
  function draw(now) {
    if (dead) return;
    lastDraw = now; needDraw = false;
    if (window.PlinkoWheel.noRender) return;   // test hook: run the loop without presenting frames
    drum.rotation.x = st.th;
    pointer.rotation.z = st.b * 0.6;
    { const a = st.b * 0.6, tx = POINTER.x - POINTER.len * Math.cos(a) + 0.045, ty = -POINTER.len * Math.sin(a) - 0.03;
      ptrShadow.position.set(tx, ty, R + PLATE + 0.004); ptrShadow.rotation.set(0, 0, a); ptrShadow.visible = tx < DW / 2 + 0.06; }
    paintReadout(now);
    stepGlow(now);
    // subtle parallax
    camera.position.set(camBase.x + par.x * 0.12, camBase.y + par.y * 0.08, camBase.z); camera.lookAt(par.x * 0.03, -0.06 + par.y * 0.02, 0.3);
    const fast = Math.abs(st.om) > 1.5 && level < 1;
    if (fast !== trail.enabled) { trail.enabled = fast; if (fast) { renderer.setRenderTarget(trail.textureOld); renderer.clear(); renderer.setRenderTarget(null); } }
    trail.uniforms.damp.value = Math.min(0.8, 0.35 + Math.abs(st.om) * 0.06);
    renderer.info.reset();
    const t0 = performance.now();
    renderer.shadowMap.needsUpdate = true;
    renderReflection();
    composer.render();
    frames++; lastMs = performance.now() - t0;
  }
  // slow device: drop the trail and bloom, then shadows and the reflection, then resolution
  function adapt(ms) {
    if (!spinning || window.PlinkoWheel.fixedQ) return;
    slowT = ms > 22 ? slowT + ms / 1000 : Math.max(0, slowT - ms / 3000);
    if (slowT > 0.8 && level < 3) {
      slowT = 0; level++;
      if (level === 1) { bloom.enabled = false; trail.enabled = false; }
      else if (level === 2) { refl.on = false; renderer.shadowMap.enabled = false; key.castShadow = false; scene.traverse(o => { if (o.material) o.material.needsUpdate = true; }); }
      else if (level === 3) { maxDpr = 1.25; layout(W, H); }
    }
  }

  // ── Loop: physics while spinning, the flapper settling, and the bulbs (same loop as the 2D renderer) ──
  function loop(now) {
    raf = 0; if (dead) return;
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); if (spinning && last) adapt(now - last); last = now;
    let k, j, active = false;
    if (spinning) {
      acc += dt; let stopped = false;
      while (acc >= WSIM_H) { acc -= WSIM_H; if (sim.step(WSIM_H, flapTick) || st.t > WSIM_CAP) { stopped = true; break; } }
      readout = WHEEL[sim.index()];
      if (stopped) { st.om = 0; acc = 0; const res = spinning; spinning = null; res(sim.index()); }
      active = true;
    } else if (drag) {
      k = Math.max(1, Math.min(60, Math.round(dt / WSIM_H)));
      st.om = Math.max(-30, Math.min(30, (drag.th - st.th) / (k * WSIM_H)));
      for (j = 0; j < k; j++) sim.step(WSIM_H, flapTick, true);
      st.om = 0; active = true;
    } else {
      st.om = 0; k = Math.min(60, Math.round(dt / WSIM_H));
      for (j = 0; j < k; j++) sim.step(WSIM_H, flapTick, true);
      active = Math.abs(st.b) > 0.002 || Math.abs(st.bv) > 0.02 || mode === 'result' || mode === 'jack';
    }
    if (Math.abs(par.tx - par.x) > 0.002 || Math.abs(par.ty - par.y) > 0.002) { par.x += (par.tx - par.x) * Math.min(1, dt * 6); par.y += (par.ty - par.y) * Math.min(1, dt * 6); active = true; }
    // idle: the bulbs only need a few frames a second
    const idleTick = now - lastDraw > 110;
    if (active) { stepBulbs(now, dt, false); draw(now); }
    else if (idleTick || needDraw) { stepBulbs(now, dt, true); draw(now); }
    if (document.visibilityState === 'visible') raf = requestAnimationFrame(loop);
  }
  function kick() { if (!raf && !dead) { last = performance.now(); raf = requestAnimationFrame(loop); } }
  document.addEventListener('visibilitychange', kick, sig);

  // ── Pull it down: the front panel follows the finger, the release speed sets the spin ──
  function pxPerUnit() { const d = camera.position.distanceTo(new THREE.Vector3(0, 0, R)); return H / (2 * d * Math.tan(FOV / 2 * Math.PI / 180)); }
  function yOf(e) { const r = cv.getBoundingClientRect(); return (e.clientY - r.top) / (r.height || 1) * H; }
  cv.addEventListener('pointerdown', function (e) {
    if (spinning || !hooks.canSpin()) return;
    e.preventDefault();
    drag = { y: yOf(e), th: st.th, s: [[e.timeStamp || performance.now(), st.th]] };
    try { cv.setPointerCapture(e.pointerId); } catch (x) {}
    kick();
  }, sig);
  cv.addEventListener('pointermove', function (e) {
    if (!drag) {
      if (e.pointerType === 'mouse') { const r = cv.getBoundingClientRect(); par.tx = ((e.clientX - r.left) / r.width - 0.5) * 2; par.ty = (0.5 - (e.clientY - r.top) / r.height) * 2; kick(); }
      return;
    }
    const y = yOf(e), dy = y - drag.y; drag.y = y;
    drag.th += dy / (R * pxPerUnit());
    const now = e.timeStamp || performance.now(); drag.s.push([now, drag.th]);
    while (drag.s.length > 2 && now - drag.s[0][0] > 110) drag.s.shift();
  }, sig);
  cv.addEventListener('pointerleave', function () { par.tx = 0; par.ty = 0; kick(); }, sig);
  function up(e) {
    if (!drag) return;
    const s = drag.s, now = (e && e.timeStamp) || performance.now(); drag = null;
    const a = s[0], b = s[s.length - 1], dt = (b[0] - a[0]) / 1000;
    const om = dt > 0.008 && now - b[0] < 150 ? (b[1] - a[1]) / dt : 0;
    window.PlinkoWheel.lastDrag = { now: now, s: s.map(x => [Math.round(x[0]), +x[1].toFixed(3)]), th: st.th };
    hooks.onPull(om);
  }
  cv.addEventListener('pointerup', up, sig);
  cv.addEventListener('pointercancel', function () { drag = null; }, sig);
  cv.addEventListener('keydown', function (e) {
    if (e.key === ' ' || e.key === 'ArrowDown' || e.key === 'Enter') { e.preventDefault(); hooks.onKey(); }
  }, sig);
  if (window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission !== 'function') {
    let base = null;
    window.addEventListener('deviceorientation', function (e) {
      if (e.gamma == null || e.beta == null) return;
      if (base == null) base = [e.gamma, e.beta];
      par.tx = Math.max(-1, Math.min(1, (e.gamma - base[0]) / 25)); par.ty = Math.max(-1, Math.min(1, -(e.beta - base[1]) / 25)); kick();
    }, sig);
  }

  const self = {
    is3D: true, cv: cv, layout: layout,
    spin: function (w0) { return new Promise(function (res) { st.om = w0; st.t = 0; st.rest = 0; acc = 0; glowIdx = -1; spinning = res; mode = 'spin'; modeT0 = performance.now(); slowT = 0; kick(); }); },
    busy: function () { return !!spinning || !!drag; },
    angle: function () { return st.th; },
    setAngle: function (a) {
      const x = ((a % WA) + WA) % WA, m = 0.06;
      if (x < m) a += m - x; else if (x > WA - m) a -= x - (WA - m);
      st.th = a; st.om = 0; st.b = 0; st.bv = 0; st.touch = false; needDraw = true; kick();
    },
    index: function () { return sim.index(); },
    setMode: function (m, idx) { mode = m; modeT0 = performance.now(); glowIdx = idx == null ? -1 : idx; if (m === 'idle') readout = null; else if (idx != null) readout = WHEEL[idx]; needDraw = true; kick(); },
    // the panel facing you, in page coordinates (chips fly from here)
    panelRect: function () {
      const r = cv.getBoundingClientRect(), v = scratch.v;
      const proj = (x, y, z) => { v.set(x, y, z).project(camera); return [r.left + (v.x + 1) / 2 * r.width, r.top + (1 - v.y) / 2 * r.height]; };
      const c = proj(0, 0, R + PLATE), l = proj(-DW / 2, 0, R), rgt = proj(DW / 2, 0, R), t = proj(0, R * Math.sin(WA / 2), R * Math.cos(WA / 2)), b = proj(0, -R * Math.sin(WA / 2), R * Math.cos(WA / 2));
      return { x: c[0], y: c[1], w: rgt[0] - l[0], h: b[1] - t[1] };
    },
    redraw: function () { if (!dead) rebuildTextures(); },
    info: function () { return { refl: refl.on, calls: renderer.info.render.calls, tris: renderer.info.render.triangles, level: level, frames: frames, bloom: bloom.enabled, shadows: renderer.shadowMap.enabled, dpr: dpr, bulbs: bulbs.length, trail: trail.enabled, lit: bulbs.filter(b => b.k > 0.5).length, c0: Array.from(cores.instanceColor.array.slice(0, 6)).map(x => +x.toFixed(2)), vis: document.visibilityState, raf: !!raf, ms: lastMs }; },
    destroy: function () {
      dead = true; if (raf) cancelAnimationFrame(raf); raf = 0; ac.abort();
      dyn.forEach(m => { if (m.geometry) m.geometry.dispose(); if (m.isInstancedMesh) m.dispose(); }); dmesh.forEach(m => m.geometry.dispose());
      if (atlas) atlas.tex.dispose(); if (dollar) { dollar.alpha.dispose(); dollar.normal.dispose(); } if (readTex) readTex.dispose();
      Object.keys(M).forEach(k => { if (M[k]) M[k].dispose(); });
      composer.dispose(); rt.dispose(); refl.rt.dispose(); key.shadow.dispose();
      if (cv.parentNode) cv.parentNode.removeChild(cv);
      // the shared renderer stays for the next wheel; leave the canvas tidy
      renderer.shadowMap.enabled = true;
    }
  };
  kick();
  return self;
}
window.BigWheel3D = BigWheel3D;
window.dispatchEvent(new Event('bw3d-ready'));
