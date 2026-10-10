// Crossy Road: the voxel world in three.js.
// Every model is a handful of boxes merged into one geometry (vertex colours), drawn
// through instanced pools that are refilled from the game state each frame, so a whole
// screen of roads, trees, cars and logs is a couple of dozen draw calls.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { HALF, WRAP, entX, trainAt } from './world.js';

const PI = Math.PI;
const YAW = 0.25, PITCH = 0.92;                   // camera: a little to the right, looking down ~53°
const TOP = { grass: 0, road: -0.05, rail: -0.03, river: -0.34 };
const LOG_TOP = -0.12, PAD_TOP = -0.29;

// ── Geometry helpers ───────────────────────────────────────────────────────
const tmpC = new THREE.Color();
function part(w, h, d, x, y, z, col) {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(x, y, z);
  g.deleteAttribute('uv');
  tmpC.set(col);
  const n = g.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = tmpC.r; a[i * 3 + 1] = tmpC.g; a[i * 3 + 2] = tmpC.b; }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return g;
}
function model(parts) { const gs = parts.map(p => part(...p)); const m = mergeGeometries(gs); gs.forEach(g => g.dispose()); return m; }

// Everything outside the playable columns is shaded darker, like the original's edges
function edgeShade(mat) {
  mat.onBeforeCompile = sh => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying float vCrX;')
      .replace('#include <project_vertex>', '#include <project_vertex>\n vec4 crW = vec4(transformed, 1.0);\n#ifdef USE_INSTANCING\n crW = instanceMatrix * crW;\n#endif\n crW = modelMatrix * crW; vCrX = crW.x;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vCrX;')
      .replace('#include <opaque_fragment>', '#include <opaque_fragment>\n gl_FragColor.rgb *= mix(1.0, 0.36, smoothstep(' + (HALF + 0.47).toFixed(2) + ', ' + (HALF + 0.53).toFixed(2) + ', abs(vCrX)));');
  };
  return mat;
}

// ── Palette ─────────────────────────────────────────────────────────────────
const COL = {
  grassA: '#aee35f', grassB: '#a3d856', road: '#535865', water: '#5fcdf2', gravel: '#9a948e',
  trunk: '#7d4e2b', leaf: '#4caf50', leafHi: '#62c45e', leafDk: '#3d9a46', rock: '#9ea4aa', rockHi: '#b9bec4',
  bark: '#8c5a2f', barkHi: '#a06a37', logEnd: '#d9a766', pad: '#55b33f', padDk: '#3f9131', foam: '#d3f3ff',
  white: '#f7f7f2', red: '#e5383b', orange: '#f5a524', black: '#1c1c1c', glass: '#2f4157', tire: '#232323',
  metal: '#d4dae1', sleeper: '#6b4529', gold: '#ffd23a', goldDk: '#f0a91c', dash: '#e9e9e9'
};
const CAR_COLS = ['#e8473f', '#3f80e2', '#f6c531', '#41b65c', '#f08a2b'];
const TRUCK_COLS = ['#e8473f', '#3f80e2', '#41b65c'];

function buildModels() {
  const M = {};
  M.chicken = model([
    [0.07, 0.16, 0.07, -0.1, 0.08, 0.03, COL.orange], [0.07, 0.16, 0.07, 0.1, 0.08, 0.03, COL.orange],
    [0.11, 0.035, 0.17, -0.1, 0.018, -0.02, COL.orange], [0.11, 0.035, 0.17, 0.1, 0.018, -0.02, COL.orange],
    [0.5, 0.48, 0.56, 0, 0.4, 0.04, COL.white],
    [0.42, 0.3, 0.42, 0, 0.78, -0.05, COL.white],
    [0.1, 0.13, 0.26, 0, 0.995, -0.05, COL.red],
    [0.14, 0.09, 0.15, 0, 0.76, -0.33, COL.orange],
    [0.08, 0.11, 0.06, 0, 0.655, -0.29, COL.red],
    [0.445, 0.075, 0.075, 0, 0.845, -0.15, COL.black],
    [0.06, 0.22, 0.3, -0.28, 0.44, 0.05, '#e6e6de'], [0.06, 0.22, 0.3, 0.28, 0.44, 0.05, '#e6e6de'],
    [0.32, 0.17, 0.1, 0, 0.62, 0.35, COL.white]
  ]);
  M.eagle = model([
    [0.62, 0.5, 1.1, 0, 0, 0, '#5b3a22'], [0.48, 0.46, 0.48, 0, 0.16, -0.7, '#f4f4ee'],
    [0.16, 0.14, 0.24, 0, 0.08, -1.04, '#f6c02c'], [0.1, 0.06, 0.1, 0, -0.01, -1.1, '#f6c02c'],
    [0.5, 0.42, 0.06, 0, 0.2, -0.95, '#f4f4ee'], [0.5, 0.08, 0.07, 0, 0.24, -0.94, '#1c1c1c'],
    [0.54, 0.12, 0.44, 0, 0.04, 0.72, '#f4f4ee'], [0.12, 0.28, 0.12, -0.16, -0.36, 0.05, '#f6c02c'], [0.12, 0.28, 0.12, 0.16, -0.36, 0.05, '#f6c02c']
  ]);
  M.wing = model([[1.2, 0.1, 0.72, 0.6, 0, 0, '#6b4528'], [0.55, 0.08, 0.6, 1.45, 0, 0.04, '#3e2716']]);
  M.tree1 = model([[0.26, 0.3, 0.26, 0, 0.15, 0, COL.trunk], [0.78, 0.5, 0.78, 0, 0.55, 0, COL.leaf], [0.6, 0.12, 0.6, 0, 0.86, 0, COL.leafHi]]);
  M.tree2 = model([[0.26, 0.32, 0.26, 0, 0.16, 0, COL.trunk], [0.8, 0.95, 0.8, 0, 0.79, 0, COL.leaf], [0.62, 0.12, 0.62, 0, 1.31, 0, COL.leafHi], [0.82, 0.08, 0.82, 0, 0.36, 0, COL.leafDk]]);
  M.tree3 = model([[0.28, 0.34, 0.28, 0, 0.17, 0, COL.trunk], [0.82, 1.45, 0.82, 0, 1.06, 0, COL.leaf], [0.64, 0.14, 0.64, 0, 1.85, 0, COL.leafHi], [0.84, 0.08, 0.84, 0, 0.38, 0, COL.leafDk]]);
  M.rock = model([[0.72, 0.42, 0.62, 0, 0.21, 0, COL.rock], [0.52, 0.12, 0.44, -0.04, 0.47, -0.02, COL.rockHi]]);
  M.stump = model([[0.46, 0.24, 0.46, 0, 0.12, 0, COL.trunk], [0.38, 0.02, 0.38, 0, 0.245, 0, '#c99a5b']]);
  M.coin = model([[0.4, 0.4, 0.08, 0, 0, 0, COL.gold], [0.22, 0.22, 0.1, 0, 0, 0, COL.goldDk], [0.08, 0.3, 0.11, 0, 0, 0, COL.gold]]);
  M.cars = CAR_COLS.map(c => model([
    [1.4, 0.42, 0.86, 0, 0.36, 0, c], [0.8, 0.3, 0.8, -0.1, 0.72, 0, COL.glass], [0.74, 0.07, 0.84, -0.1, 0.9, 0, c],
    [0.05, 0.12, 0.16, 0.71, 0.42, -0.27, '#fff3b0'], [0.05, 0.12, 0.16, 0.71, 0.42, 0.27, '#fff3b0'],
    [0.05, 0.1, 0.14, -0.71, 0.42, -0.28, '#c81e1e'], [0.05, 0.1, 0.14, -0.71, 0.42, 0.28, '#c81e1e'],
    [0.3, 0.3, 0.12, 0.42, 0.15, 0.44, COL.tire], [0.3, 0.3, 0.12, -0.42, 0.15, 0.44, COL.tire],
    [0.3, 0.3, 0.12, 0.42, 0.15, -0.44, COL.tire], [0.3, 0.3, 0.12, -0.42, 0.15, -0.44, COL.tire]
  ]));
  M.trucks = TRUCK_COLS.map(c => model([
    [0.7, 0.82, 0.86, 0.88, 0.57, 0, c], [0.06, 0.3, 0.72, 1.24, 0.78, 0, COL.glass], [0.6, 0.3, 0.88, 0.86, 0.78, 0, COL.glass],
    [1.78, 1.02, 0.92, -0.36, 0.7, 0, '#efefe9'], [1.79, 0.16, 0.94, -0.36, 0.42, 0, c],
    [2.4, 0.14, 0.7, 0, 0.2, 0, '#333'],
    [0.32, 0.32, 0.12, 0.88, 0.16, 0.45, COL.tire], [0.32, 0.32, 0.12, -0.25, 0.16, 0.45, COL.tire], [0.32, 0.32, 0.12, -0.9, 0.16, 0.45, COL.tire],
    [0.32, 0.32, 0.12, 0.88, 0.16, -0.45, COL.tire], [0.32, 0.32, 0.12, -0.25, 0.16, -0.45, COL.tire], [0.32, 0.32, 0.12, -0.9, 0.16, -0.45, COL.tire],
    [0.05, 0.12, 0.18, 1.24, 0.42, -0.3, '#fff3b0'], [0.05, 0.12, 0.18, 1.24, 0.42, 0.3, '#fff3b0']
  ]));
  M.logs = {};
  [2, 3, 4].forEach(L => {
    const p = [[L - 0.08, 0.32, 0.74, 0, 0, 0, COL.bark], [L - 0.08, 0.04, 0.46, 0, 0.17, 0, COL.barkHi],
      [0.05, 0.28, 0.66, L / 2 - 0.04, 0, 0, COL.logEnd], [0.05, 0.28, 0.66, -L / 2 + 0.04, 0, 0, COL.logEnd]];
    for (let k = 0; k < L - 1; k++) p.push([0.1, 0.05, 0.12, -L / 2 + 1 + k + (k % 2 ? 0.2 : -0.15), 0.17, (k % 2 ? 0.18 : -0.2), '#6d4422']);
    M.logs[L] = model(p);
  });
  M.foam = {};
  [2, 3, 4].forEach(L => { M.foam[L] = model([[L + 0.24, 0.02, 0.9, 0, 0, 0, COL.foam]]); });
  M.pad = model([[0.78, 0.05, 0.78, 0, 0, 0, COL.pad], [0.22, 0.06, 0.22, 0.24, 0.002, -0.24, COL.padDk], [0.12, 0.08, 0.12, -0.18, 0.04, 0.14, '#7cd15f']]);
  M.engine = model([
    [2.9, 1.08, 0.94, 0, 0.78, 0, '#d93a3f'], [2.7, 0.14, 0.82, -0.05, 1.39, 0, '#a72b30'], [0.5, 0.32, 0.96, 0.62, 1.02, 0, COL.glass],
    [2.8, 0.24, 0.96, 0, 0.2, 0, '#2b2b2b'], [0.05, 0.2, 0.34, 1.46, 0.96, 0, '#fff3b0'], [0.12, 0.36, 0.86, 1.43, 0.42, 0, '#3a3a3a'],
    [2.92, 0.12, 0.96, 0, 0.56, 0, '#f2d34a']
  ]);
  M.tcar = [model([[2.55, 1.0, 0.9, 0, 0.74, 0, '#efefe9'], [2.2, 0.26, 0.92, 0, 0.94, 0, COL.glass], [2.56, 0.12, 0.92, 0, 0.52, 0, '#d93a3f'], [2.5, 0.22, 0.94, 0, 0.18, 0, '#2b2b2b'], [2.45, 0.08, 0.8, 0, 1.28, 0, '#c9c9c3']]),
    model([[2.55, 1.0, 0.9, 0, 0.74, 0, '#3f80e2'], [2.2, 0.26, 0.92, 0, 0.94, 0, COL.glass], [2.56, 0.12, 0.92, 0, 0.52, 0, '#f2d34a'], [2.5, 0.22, 0.94, 0, 0.18, 0, '#2b2b2b'], [2.45, 0.08, 0.8, 0, 1.28, 0, '#2f66b8']])];
  M.signal = model([[0.1, 1.36, 0.1, 0, 0.68, 0, '#8a9097'], [0.16, 0.44, 0.38, 0, 1.46, 0, '#2a2a2a'], [0.5, 0.08, 0.04, 0, 1.08, 0.06, '#f4f4ee'], [0.08, 0.5, 0.04, 0, 1.08, 0.06, '#f4f4ee'], [0.34, 0.06, 0.34, 0, 0.03, 0, '#8a9097']]);
  M.lampOff = model([[0.04, 0.13, 0.13, 0, 0, 0, '#5a1515']]);
  M.lamp = new THREE.BoxGeometry(0.05, 0.15, 0.15);
  M.rail = model([[1, 0.07, 0.08, 0, 0, 0, COL.metal]]);
  M.sleeper = model([[0.22, 0.06, 0.9, 0, 0, 0, COL.sleeper]]);
  M.dash = model([[0.7, 0.02, 0.09, 0, 0, 0, COL.dash]]);
  M.cube = new THREE.BoxGeometry(1, 1, 1);
  return M;
}

// ── Instanced pool ─────────────────────────────────────────────────────────
class Pool {
  constructor(scene, geo, mat, max, o) {
    o = o || {};
    const m = new THREE.InstancedMesh(geo, mat, max);
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    if (o.color) { m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3); m.instanceColor.setUsage(THREE.DynamicDrawUsage); }
    m.castShadow = o.cast !== false; m.receiveShadow = !!o.receive; m.frustumCulled = false; m.count = 0;
    scene.add(m);
    this.m = m; this.max = max; this.n = 0; this.a = m.instanceMatrix.array; this.c = m.instanceColor ? m.instanceColor.array : null;
  }
  add(x, y, z, ry, sx, sy, sz, col) {
    if (this.n >= this.max) return;
    const a = this.a, o = this.n * 16, c = ry ? Math.cos(ry) : 1, s = ry ? Math.sin(ry) : 0;
    sx = sx == null ? 1 : sx; sy = sy == null ? 1 : sy; sz = sz == null ? 1 : sz;
    a[o] = sx * c; a[o + 1] = 0; a[o + 2] = -sx * s; a[o + 3] = 0;
    a[o + 4] = 0; a[o + 5] = sy; a[o + 6] = 0; a[o + 7] = 0;
    a[o + 8] = sz * s; a[o + 9] = 0; a[o + 10] = sz * c; a[o + 11] = 0;
    a[o + 12] = x; a[o + 13] = y; a[o + 14] = z; a[o + 15] = 1;
    if (col && this.c) { const k = this.n * 3; this.c[k] = col.r; this.c[k + 1] = col.g; this.c[k + 2] = col.b; }
    this.n++;
  }
  // a box rotated about x and y (particles, the chicken in a spin)
  addRot(x, y, z, rx, ry, s, col) {
    if (this.n >= this.max) return;
    const cx = Math.cos(rx), sx = Math.sin(rx), cy = Math.cos(ry), sy = Math.sin(ry), a = this.a, o = this.n * 16;
    // R = Ry * Rx, scaled
    a[o] = s * cy; a[o + 1] = 0; a[o + 2] = -s * sy; a[o + 3] = 0;
    a[o + 4] = s * sy * sx; a[o + 5] = s * cx; a[o + 6] = s * cy * sx; a[o + 7] = 0;
    a[o + 8] = s * sy * cx; a[o + 9] = -s * sx; a[o + 10] = s * cy * cx; a[o + 11] = 0;
    a[o + 12] = x; a[o + 13] = y; a[o + 14] = z; a[o + 15] = 1;
    if (col && this.c) { const k = this.n * 3; this.c[k] = col.r; this.c[k + 1] = col.g; this.c[k + 2] = col.b; }
    this.n++;
  }
  end() { this.m.count = this.n; this.m.instanceMatrix.needsUpdate = true; if (this.m.instanceColor) this.m.instanceColor.needsUpdate = true; this.n = 0; }
}

function h2(a, b) { let h = Math.imul(a | 0, 0x2c1b3c6d) ^ Math.imul(b | 0, 0x297a2d39); h ^= h >>> 15; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; return (h >>> 0) / 4294967296; }

// ── The scene ──────────────────────────────────────────────────────────────
export function createScene(renderer) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#78cff0');
  const M = buildModels();
  const matV = edgeShade(new THREE.MeshLambertMaterial({ vertexColors: true }));
  const matI = edgeShade(new THREE.MeshLambertMaterial({ color: '#ffffff' }));
  const matLamp = new THREE.MeshBasicMaterial({ color: '#ff3b2f' });

  const hemi = new THREE.HemisphereLight('#ffffff', '#9fb6cc', 1.75);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight('#fff6e8', 2.5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera; sc.left = -21; sc.right = 21; sc.top = 21; sc.bottom = -21; sc.near = 1; sc.far = 70;
  sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.02;
  scene.add(sun); scene.add(sun.target);
  const SUN_OFF = new THREE.Vector3(-7, 14, 4);

  const P = {
    ground: new Pool(scene, M.cube, matI, 90, { color: true, cast: false, receive: true }),
    tree1: new Pool(scene, M.tree1, matV, 420, { receive: true }), tree2: new Pool(scene, M.tree2, matV, 420, { receive: true }), tree3: new Pool(scene, M.tree3, matV, 320, { receive: true }),
    rock: new Pool(scene, M.rock, matV, 200, { receive: true }), stump: new Pool(scene, M.stump, matV, 200, { receive: true }),
    coin: new Pool(scene, M.coin, matV, 24),
    cars: M.cars.map(g => new Pool(scene, g, matV, 70, { receive: true })), trucks: M.trucks.map(g => new Pool(scene, g, matV, 40, { receive: true })),
    logs: { 2: new Pool(scene, M.logs[2], matV, 70, { receive: true }), 3: new Pool(scene, M.logs[3], matV, 70, { receive: true }), 4: new Pool(scene, M.logs[4], matV, 60, { receive: true }) },
    foam: { 2: new Pool(scene, M.foam[2], matV, 70, { cast: false, receive: true }), 3: new Pool(scene, M.foam[3], matV, 70, { cast: false, receive: true }), 4: new Pool(scene, M.foam[4], matV, 60, { cast: false, receive: true }) },
    pad: new Pool(scene, M.pad, matV, 80, { cast: false, receive: true }),
    engine: new Pool(scene, M.engine, matV, 12, { receive: true }), tcar: M.tcar.map(g => new Pool(scene, g, matV, 60, { receive: true })),
    signal: new Pool(scene, M.signal, matV, 24, { receive: true }), lampOff: new Pool(scene, M.lampOff, matV, 48, { cast: false }), lamp: new Pool(scene, M.lamp, matLamp, 48, { cast: false }),
    rail: new Pool(scene, M.rail, matV, 40, { cast: false, receive: true }), sleeper: new Pool(scene, M.sleeper, matV, 1400, { cast: false, receive: true }),
    dash: new Pool(scene, M.dash, matV, 700, { cast: false, receive: true }),
    bits: new Pool(scene, M.cube, matI, 360, { color: true, cast: false })
  };
  const pools = [];
  (function collect(o) { for (const k in o) { const v = o[k]; if (v instanceof Pool) pools.push(v); else if (v && typeof v === 'object') collect(v); } })(P);

  const chick = new THREE.Mesh(M.chicken, matV); chick.castShadow = true; chick.receiveShadow = true; scene.add(chick);
  const eagle = new THREE.Group();
  const eBody = new THREE.Mesh(M.eagle, matV); eBody.castShadow = true;
  const wl = new THREE.Mesh(M.wing, matV), wr = new THREE.Mesh(M.wing, matV); wl.castShadow = wr.castShadow = true;
  wl.position.set(-0.3, 0.1, 0); wl.rotation.y = PI; wr.position.set(0.3, 0.1, 0);
  const wlP = new THREE.Group(), wrP = new THREE.Group(); wlP.add(wl); wrP.add(wr);
  eagle.add(eBody, wlP, wrP); eagle.visible = false; scene.add(eagle);

  const cam = new THREE.OrthographicCamera(-5, 5, 10, -10, 0.1, 200);
  const OFF = new THREE.Vector3(Math.sin(YAW) * Math.cos(PITCH), Math.sin(PITCH), Math.cos(YAW) * Math.cos(PITCH));
  const viewDir = OFF.clone().negate();
  const RIGHT = new THREE.Vector3().crossVectors(viewDir, new THREE.Vector3(0, 1, 0)).normalize();
  const UP = new THREE.Vector3().crossVectors(RIGHT, viewDir).normalize();
  let hw = 5, hh = 10, W = 1, H = 1;

  const colors = { grassA: new THREE.Color(COL.grassA), grassB: new THREE.Color(COL.grassB), road: new THREE.Color(COL.road), water: new THREE.Color(COL.water), gravel: new THREE.Color(COL.gravel), bed: new THREE.Color('#3f9fc4') };
  const bitCols = {}; function bc(hex) { return bitCols[hex] || (bitCols[hex] = new THREE.Color(hex)); }

  // visual-only state
  const bob = new Map();       // log / pad bounce: key -> time it was landed on
  const parts = [];            // particles
  let shake = 0, face = 0, crouch = 0, crouchWant = false, lastT = 0;

  function resize(w, h) {
    W = Math.max(1, w); H = Math.max(1, h);
    const dpr = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(1.5e6 / (W * H)));
    renderer.setPixelRatio(dpr); renderer.setSize(W, H, false);
    const asp = W / H;
    // about 10 tiles across a phone held upright; a little more on wider screens
    const across = asp < 0.62 ? 10.4 : Math.min(13, 10.4 + (asp - 0.62) * 9);
    hw = across / 2; hh = hw / asp;
    cam.left = -hw; cam.right = hw; cam.top = hh; cam.bottom = -hh; cam.updateProjectionMatrix();
  }

  // ── Particles ──
  function spawn(n, x, y, z, o) {
    for (let i = 0; i < n && parts.length < 340; i++) {
      const a = Math.random() * PI * 2, sp = (o.sp || 2) * (0.4 + Math.random() * 0.8);
      parts.push({ x: x + (Math.random() - 0.5) * (o.spread || 0.3), y, z: z + (Math.random() - 0.5) * (o.spread || 0.3),
        vx: Math.cos(a) * sp + (o.vx || 0), vy: (o.up || 3) * (0.6 + Math.random() * 0.7), vz: Math.sin(a) * sp,
        g: o.g == null ? 12 : o.g, life: (o.life || 0.8) * (0.7 + Math.random() * 0.6), t: 0, s: (o.size || 0.1) * (0.7 + Math.random() * 0.6),
        rx: Math.random() * 6, ry: Math.random() * 6, spin: (Math.random() - 0.5) * 14, drag: o.drag || 0.5, floor: o.floor == null ? -0.3 : o.floor,
        col: bc(o.cols[(Math.random() * o.cols.length) | 0]) });
    }
  }
  function fx(e, G) {
    if (e.type === 'log' || e.type === 'pad') bob.set(e.row * 64 + (e.type === 'log' ? e.idx : 50 + e.col), G.t);
    else if (e.type === 'coin') spawn(14, e.col, 0.6, -e.row, { cols: [COL.gold, '#fff6b0', COL.goldDk], up: 4, sp: 1.6, size: 0.09, life: 0.6, g: 10, floor: 0 });
    else if (e.type === 'die') {
      const z = -e.row;
      if (e.cause === 'water' || e.cause === 'edge') {
        spawn(26, e.x, -0.3, z, { cols: ['#ffffff', '#d8f6ff', '#9be3fb'], up: 5.2, sp: 1.4, size: 0.11, life: 0.75, g: 16, floor: -0.36 });
        spawn(10, e.x, -0.3, z, { cols: ['#ffffff'], up: 1.2, sp: 3.2, size: 0.08, life: 0.5, g: 8, floor: -0.36 });
      } else if (e.cause === 'car' || e.cause === 'train') {
        spawn(e.cause === 'train' ? 26 : 18, e.x, 0.45, z, { cols: ['#ffffff', '#f2f2ea', '#e5e5dc', COL.red], up: 3.5, sp: 2.4, vx: (e.dir || 0) * (e.cause === 'train' ? 6 : 1.5), size: 0.1, life: 1.1, g: 4, drag: 2.2, floor: 0 });
        shake = e.cause === 'train' ? 0.5 : 0.32;
      }
    }
  }
  function stepParts(dt) {
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i]; p.t += dt;
      if (p.t >= p.life) { parts.splice(i, 1); continue; }
      const k = Math.exp(-p.drag * dt);
      p.vx *= k; p.vz *= k; p.vy -= p.g * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      if (p.y < p.floor) { p.y = p.floor; p.vy *= -0.2; p.vx *= 0.6; p.vz *= 0.6; }
      p.rx += p.spin * dt; p.ry += p.spin * 0.7 * dt;
    }
  }

  function bobY(key, t) {
    const t0 = bob.get(key); if (t0 == null) return 0;
    const u = t - t0; if (u > 0.6 || u < 0) { if (u > 0.6) bob.delete(key); return 0; }
    return -0.11 * Math.exp(-u * 7) * Math.cos(u * 16);
  }
  function groundTop(row) { return TOP[row.type]; }

  // ── Frame ──
  function render(G, dt) {
    dt = Math.max(0, Math.min(0.1, dt || 0));
    stepParts(dt);
    shake = Math.max(0, shake - dt * 1.4);
    const t = G.t, Pl = G.p, D = G.death;
    // camera framing: the chicken's row sits about a quarter of the way up the screen
    const ahead = (0.5 * hh) / (-UP.z);
    const sx = shake ? (Math.random() - 0.5) * shake * 0.5 : 0, sz = shake ? (Math.random() - 0.5) * shake * 0.5 : 0;
    // the look point is ahead of the chicken; shift it so the chicken's column stays centred on screen
    const T = new THREE.Vector3(G.cam.x + ahead * RIGHT.z / RIGHT.x + sx, 0, -(G.cam.focus + ahead) + sz);
    cam.position.copy(T).addScaledVector(OFF, 60); cam.lookAt(T); cam.updateMatrixWorld();
    // light follows, snapped to the shadow map's texel grid so shadows don't shimmer
    const snap = 42 / 2048, lx = Math.round(T.x / snap) * snap, lz = Math.round(T.z / snap) * snap;
    sun.position.set(lx + SUN_OFF.x, SUN_OFF.y, lz + SUN_OFF.z); sun.target.position.set(lx, 0, lz); sun.target.updateMatrixWorld();

    const back = hh / (-UP.z) + 2.5, fwd = hh / (-UP.z) + 1.5;
    const rLo = Math.floor(G.cam.focus + ahead - back), rHi = Math.ceil(G.cam.focus + ahead + fwd);
    for (let r = rLo; r <= rHi; r++) drawRow(G, G.row(r), r, t, T);
    drawChicken(G, t, dt);
    for (const p of parts) P.bits.addRot(p.x, p.y, p.z, p.rx, p.ry, p.s * Math.min(1, (p.life - p.t) / 0.25 + 0.2), p.col);
    for (const pl of pools) pl.end();
    renderer.render(scene, cam);
    lastT = t;
  }

  function xRange(z, T, m) {
    // world x where row z is on screen (orthographic: screen x is linear in world x and z)
    const a = (-hw - m - (z - T.z) * RIGHT.z) / RIGHT.x, b = (hw + m - (z - T.z) * RIGHT.z) / RIGHT.x;
    return [T.x + Math.min(a, b), T.x + Math.max(a, b)];
  }

  function drawRow(G, row, r, t, T) {
    const z = -r, [x0, x1] = xRange(z, T, 1.6);
    const top = groundTop(row);
    const gx = (x0 + x1) / 2, gw = Math.max(4, x1 - x0 + 6);
    if (row.type === 'grass') {
      P.ground.add(gx, top - 0.4, z, 0, gw, 0.8, 1, row.shade ? colors.grassA : colors.grassB);
      const c0 = Math.max(-26, Math.floor(x0)), c1 = Math.min(26, Math.ceil(x1));
      for (let c = c0; c <= c1; c++) {
        let k = Math.abs(c) <= 12 ? row.obs[c + 12] : (h2(r, c) < 0.6 ? ['tree1', 'tree2', 'tree3', 'rock'][(h2(c, r) * 4) | 0] : null);
        if (k) P[k].add(c, top, z, ((h2(r * 3, c) * 4) | 0) * PI / 2);
      }
      if (row.coin != null && !row.coinTaken) P.coin.add(row.coin, 0.42 + Math.sin(t * 3 + r) * 0.05, z, t * 2.6 + r);
    } else if (row.type === 'road') {
      P.ground.add(gx, top - 0.4, z, 0, gw, 0.8, 1, colors.road);
      const nx = G.row(r + 1);
      if (nx.type === 'road') for (let x = Math.floor(x0 / 1.5) * 1.5; x <= x1; x += 1.5) P.dash.add(x + 0.4, top + 0.01, z - 0.5);
      for (const e of row.ents) {
        const x = entX(row, e, t);
        if (x < x0 - 1.5 || x > x1 + 1.5) continue;
        const pool = e.kind === 'truck' ? P.trucks[e.color % P.trucks.length] : P.cars[e.color % P.cars.length];
        pool.add(x, top, z, row.dir > 0 ? 0 : PI);
      }
      if (row.coin != null && !row.coinTaken) P.coin.add(row.coin, top + 0.42 + Math.sin(t * 3 + r) * 0.05, z, t * 2.6 + r);
    } else if (row.type === 'river') {
      P.ground.add(gx, top - 0.3, z, 0, gw, 0.6, 1, colors.water);
      if (row.pads) {
        for (const c of row.pads) P.pad.add(c, PAD_TOP - 0.03 + bobY(r * 64 + 50 + c, t), z, ((h2(r, c) * 4) | 0) * PI / 2);
      } else {
        for (let k = 0; k < row.ents.length; k++) {
          const e = row.ents[k], x = entX(row, e, t);
          if (x < x0 - 2.5 || x > x1 + 2.5) continue;
          const by = bobY(r * 64 + k, t);
          P.logs[e.len].add(x, LOG_TOP - 0.16 + by, z);
          P.foam[e.len].add(x, top + 0.012, z);
        }
      }
    } else if (row.type === 'rail') {
      P.ground.add(gx, top - 0.4, z, 0, gw, 0.8, 1, colors.gravel);
      for (let x = Math.floor(x0 / 0.6) * 0.6; x <= x1; x += 0.6) P.sleeper.add(x, top + 0.03, z);
      P.rail.add(gx, top + 0.09, z - 0.24, 0, gw, 1, 1); P.rail.add(gx, top + 0.09, z + 0.24, 0, gw, 1, 1);
      const tr = trainAt(row, t);
      // the crossing signal at the right-hand edge, lamps flashing while a train is due
      const sxp = HALF + 0.9, szp = z + 0.42;
      P.signal.add(sxp, top, szp);
      const on = tr && tr.warn, ph = Math.floor(t * 5) % 2;
      [-0.1, 0.1].forEach((dz, i) => {
        if (on && ph === i) P.lamp.add(sxp + 0.07, top + 1.48, szp + dz); else P.lampOff.add(sxp + 0.07, top + 1.48, szp + dz);
      });
      if (tr && tr.active) {
        const d = row.dir, rot = d > 0 ? 0 : PI;
        const ex = tr.front - d * 1.5;
        if (ex > x0 - 3 && ex < x1 + 3) P.engine.add(ex, top, z, rot);
        for (let k = 0; k < row.cars; k++) {
          const cx = tr.front - d * (3.05 + k * 2.7 + 1.3);
          if (cx < x0 - 3 || cx > x1 + 3) continue;
          P.tcar[k % 2].add(cx, top, z, rot);
        }
      }
    }
  }

  function rowTopAt(G, r) { const row = G.row(r); return groundTop(row); }
  function standY(G, r, onLog, pad, t) {
    const row = G.row(r);
    if (row.type === 'river') {
      if (onLog) return LOG_TOP + bobY(r * 64 + onLog.idx, t);
      if (pad != null) return PAD_TOP + 0.02 + bobY(r * 64 + 50 + pad, t);
      return LOG_TOP;
    }
    return groundTop(row);
  }
  const FACE = { u: 0, d: PI, l: PI / 2, r: -PI / 2 };
  function drawChicken(G, t, dt) {
    const Pl = G.p, D = G.death;
    crouch += ((crouchWant && !D && !Pl.hop ? 1 : 0) - crouch) * Math.min(1, dt * 22);
    eagle.visible = false; chick.visible = true;
    let tf = FACE[Pl.face] || 0, dfa = tf - face;
    while (dfa > PI) dfa -= 2 * PI; while (dfa < -PI) dfa += 2 * PI;
    face += dfa * Math.min(1, dt * 26);
    chick.rotation.set(0, face, 0);
    if (!D) {
      let x = Pl.vx + Pl.snap, rr = Pl.vrow, y, sy = 1, sxz = 1;
      const h = Pl.hop;
      if (h) {
        const k = Math.min(1, h.t / h.dur);
        const y0 = standY(G, h.r0, null, null, t), r1 = G.row(h.r1);
        const y1 = r1.type === 'river' ? (r1.pads ? PAD_TOP + 0.02 : LOG_TOP) : groundTop(r1);
        y = y0 + (y1 - y0) * k + 0.44 * Math.sin(PI * k);
        const s = Math.sin(PI * k); sy = 1 + 0.2 * s; sxz = 1 - 0.1 * s;
      } else {
        y = standY(G, Pl.row, Pl.log, Pl.pad, t);
        const u = t - Pl.landAt;
        if (u >= 0 && u < 0.12) { const s = Math.sin(PI * u / 0.12); sy = 1 - 0.2 * s; sxz = 1 + 0.12 * s; }
      }
      sy *= 1 - 0.24 * crouch; sxz *= 1 + 0.14 * crouch;
      const bu = t - Pl.bumpAt;
      if (bu >= 0 && bu < 0.16) { const s = Math.sin(PI * bu / 0.16) * 0.12; x += -Math.sin(face) * s; rr += Math.cos(face) * s; }
      chick.position.set(x, y, -rr); chick.scale.set(sxz, sy, sxz);
      return;
    }
    const u = D.t, z = -D.row;
    if (D.cause === 'car') {
      const k = Math.min(1, u / 0.06);
      chick.position.set(D.x, rowTopAt(G, Math.round(D.row)) + 0.01, z);
      chick.scale.set(1 + 0.45 * k, 1 - 0.9 * k, 1 + 0.45 * k);
    } else if (D.cause === 'train') {
      chick.position.set(D.x + (D.dir || 1) * 20 * u, 0.4 + 7 * u - 5 * u * u, z - u * 2);
      chick.rotation.set(u * 14, face, u * 9); chick.scale.set(1, 1, 1);
      if (u > 1) chick.visible = false;
    } else if (D.cause === 'water' || D.cause === 'edge') {
      chick.position.set(D.x, -0.15 - u * 2.6, z); chick.scale.set(1, 1, 1);
      if (u > 0.3) chick.visible = false;
    } else if (D.cause === 'eagle') {
      eagle.visible = true;
      let ex, ey, ez;
      if (u < 0.6) { const k = u / 0.6, e = k * k; ex = D.x; ey = 7.5 + (0.95 - 7.5) * e; ez = z - 13 * (1 - e); }
      else { const k = (u - 0.6) / 1.4, e = k * k * 0.6 + k * 0.4; ex = D.x; ey = 0.95 + 9 * e; ez = z + 18 * e; }
      eagle.position.set(ex, ey, ez); eagle.rotation.set(u < 0.6 ? -0.35 : 0.25, PI, 0);
      const fl = u < 0.5 ? 0.25 : Math.sin(u * 22) * 0.7;
      wlP.rotation.z = -fl; wrP.rotation.z = fl;
      if (u < 0.6) chick.position.set(D.x, rowTopAt(G, Math.round(D.row)), z);
      else chick.position.set(ex, ey - 0.95, ez + 0.05);
      chick.scale.set(1, 1, 1);
    }
  }

  return {
    resize, render, fx,
    setCrouch(v) { crouchWant = !!v; },
    reset() { parts.length = 0; bob.clear(); shake = 0; face = 0; crouch = 0; },
    info: () => renderer.info.render,
    camera: cam
  };
}
