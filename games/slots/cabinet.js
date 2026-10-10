// Slots: the machines as rendered 3D objects (three.js r160, vendored).
// One shared WebGL renderer on a page-sized transparent canvas. A Cabinet is
// built per machine from real geometry (body, projecting top box, recessed
// reel window with glass, drums or an LCD, sloped button deck, coin tray,
// pull handle), physically based materials with an environment map for
// reflections, a key light with soft shadows and coloured rim light from the
// room. It renders only when something changes or is animating.
//
// The game keeps all logic; it drives this through a small API (setReel,
// setMsg, setMeters, setCaps, setHandle, ...) and reads screen rectangles
// (rects()) to place its HTML overlay (paylines, hit boxes, banners).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import * as Art from './art.js';

const FOV = 30;
const THEME = {
  classic: { kind: 'mech', W: 0.66, D: 0.5, baseH: 0.5, mainH: 0.5, topH: 0.4, ratio: 0.72, sw: 0.84, led: ['#ff5a3c', '#ffd45a'], msg: '#ffd45a', tabs: true,
    spin: ['#ffb0b0', '#e01e2e', '#7a0410', '#fff'], btn: ['#fff3c0', '#f0b030', '#8a5a08', '#2b1a00'], reflect: 0 },
  buffalo: { kind: 'video', W: 0.7, D: 0.5, baseH: 0.52, mainH: 0.68, topH: 0.18, ratio: 0.8, sw: 0.9, body: 0x3a1a0a, trim: 'brass', edge: '#ff9a5a', led: ['#ff7a2e', '#ffd45a'], msg: '#ffd45a',
    spin: ['#fff3c0', '#ffc83d', '#b45f05', '#3a1600'], btn: ['#ffd9b0', '#c86a2a', '#5a2a08', '#fff'], hud: '#ffe7b0', reflect: 0.12 },
  cleo: { kind: 'video', W: 0.7, D: 0.5, baseH: 0.52, mainH: 0.68, topH: 0.18, ratio: 0.88, sw: 0.88, body: 0x10307a, trim: 'gold', edge: '#ffd890', led: ['#47d6ff', '#ffd76a'], msg: '#ffd76a',
    spin: ['#fffbe0', '#ffd76a', '#c08a1a', '#2b1a00'], btn: ['#b8c8ff', '#2c4aa0', '#0f1f52', '#fff'], hud: '#ffd76a', reflect: 0.2 },
  dragon: { kind: 'video', W: 0.7, D: 0.5, baseH: 0.52, mainH: 0.68, topH: 0.18, ratio: 0.88, sw: 0.88, body: 0x5a0808, trim: 'gold', edge: '#ff4a2a', led: ['#ff4a3a', '#ffd45a'], msg: '#ffd45a',
    spin: ['#fff3c0', '#ffc83d', '#b45f05', '#3a1600'], btn: ['#ff9a9a', '#9a1a1a', '#3a0606', '#fff'], hud: '#ffd45a', reflect: 0.22 }
};

let renderer = null, envTex = null, glowTex = null, fadeTex = null, canvasEl = null;
const atlasCache = {}, woodCache = {};
function tex(canvas, srgb) { const t = new THREE.CanvasTexture(canvas); if (srgb !== false) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = Math.min(8, renderer ? renderer.capabilities.getMaxAnisotropy() : 1); return t; }

export function supported() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; }
}
export function getRenderer(canvas) {
  if (renderer) return renderer;
  canvasEl = canvas;
  renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, powerPreference: 'high-performance', stencil: false });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.localClippingEnabled = true;
  const pm = new THREE.PMREMGenerator(renderer); envTex = pm.fromScene(new RoomEnvironment(renderer), 0.04).texture; pm.dispose();
  glowTex = tex(Art.glowCanvas(128));
  const [fc, fx] = Art.cv(256, 256); fx.fillStyle = Art.rg(fx, 128, 128, 10, 128, [[0, 'rgba(0,0,0,.9)'], [0.35, 'rgba(0,0,0,.55)'], [1, 'rgba(0,0,0,0)']]); fx.fillRect(0, 0, 256, 256); fadeTex = tex(fc);
  return renderer;
}
export async function atlasFor(mode, M, spriteEl) {
  if (!atlasCache[mode]) {
    const keys = []; M.reels.forEach(st => st.forEach(k => { if (k !== '_' && keys.indexOf(k) < 0) keys.push(k); }));
    atlasCache[mode] = Art.buildAtlas(spriteEl, mode, keys, THEME[mode].ratio, THEME[mode].sw);
  }
  return atlasCache[mode];
}

// ── Materials ─────────────────────────────────────────────────────────────
function makeMats(T) {
  const env = envTex;
  if (!woodCache.walnut) {
    const w = tex(Art.woodCanvas(512, [[104, 62, 30], [84, 48, 22], [30, 14, 5]], 7)); w.wrapS = w.wrapT = THREE.RepeatWrapping; w.repeat.set(1.6, 1.6); woodCache.walnut = w;
    const b = tex(Art.brushedCanvas(256, '#9a9a9a', 11), false); b.wrapS = b.wrapT = THREE.RepeatWrapping; b.repeat.set(3, 3); woodCache.brushed = b;
  }
  const m = {
    chrome: new THREE.MeshPhysicalMaterial({ color: 0xc9cdd3, metalness: 1, roughness: 0.32, roughnessMap: woodCache.brushed, envMap: env, envMapIntensity: 0.85 }),
    gold: new THREE.MeshPhysicalMaterial({ color: T.trim === 'brass' ? 0xc89a4a : 0xe0b24e, metalness: 1, roughness: 0.3, roughnessMap: woodCache.brushed, envMap: env, envMapIntensity: 1.1 }),
    walnut: new THREE.MeshPhysicalMaterial({ map: woodCache.walnut, roughness: 0.42, metalness: 0, clearcoat: 0.55, clearcoatRoughness: 0.32, envMap: env, envMapIntensity: 0.5 }),
    lacquer: new THREE.MeshPhysicalMaterial({ color: T.body || 0x222222, roughness: 0.26, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.1, envMap: env, envMapIntensity: 0.9 }),
    black: new THREE.MeshStandardMaterial({ color: 0x141418, roughness: 0.62, metalness: 0.1, envMap: env, envMapIntensity: 0.4 }),
    gloss: new THREE.MeshPhysicalMaterial({ color: 0x050507, roughness: 0.18, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.08, envMap: env, envMapIntensity: 0.45 }),
    inner: new THREE.MeshStandardMaterial({ color: 0x07060a, roughness: 0.95, metalness: 0 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0, roughness: 0.03, transparent: true, opacity: 0.2, envMap: env, envMapIntensity: 2.0, clearcoat: 1, clearcoatRoughness: 0.02, depthWrite: false, side: THREE.FrontSide }),
    red: new THREE.MeshPhysicalMaterial({ color: 0xa50f1d, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.12, envMap: env, envMapIntensity: 0.8 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x0c0c0e, roughness: 0.92 })
  };
  m.trim = T.kind === 'mech' ? m.chrome : m.gold;
  m.body = T.kind === 'mech' ? m.walnut : m.lacquer;
  return m;
}
function unlit(canvas, o) { const t = tex(canvas); const mat = new THREE.MeshBasicMaterial(Object.assign({ map: t, toneMapped: false }, o || {})); mat.tex = t; return mat; }

// ── The cabinet ───────────────────────────────────────────────────────────
export class Cabinet {
  constructor(mode, M, atlas, o) {
    this.mode = mode; this.M = M; this.T = THEME[mode]; this.atlas = atlas; this.o = o || {};
    this.scene = new THREE.Scene();
    this.scene.environment = envTex;
    this.camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 30);
    this.root = new THREE.Group(); this.scene.add(this.root);
    this.mats = makeMats(this.T);
    this.statics = new Map(); this.dyn = []; this.anims = []; this.dirty = true; this.camDirty = true;
    this.tilt = { x: 0, y: 0, tx: 0, ty: 0 };
    this.reels = []; this.caps = {}; this.bulbOn = true; this.wonUntil = 0; this.flashUntil = 0; this.flashCol = new THREE.Color(1, 0.9, 0.6);
    this.layout = {}; this.last = {};
    this.L = this.T.kind === 'mech' ? this.buildClassic() : this.buildVideo();
    this.finishStatics();
    this.buildLights();
    this.buildFloor();
    this.frameTop = 0; this.frameBottom = 100; this.W = 100; this.H = 100;
  }
  // geometry helpers: statics are merged per material into one mesh each
  add(geo, mat, x, y, z, rot) {
    const m4 = new THREE.Matrix4();
    if (rot) m4.makeRotationFromEuler(new THREE.Euler(rot[0] || 0, rot[1] || 0, rot[2] || 0));
    m4.setPosition(x, y, z); geo.applyMatrix4(m4);
    if (geo.index) { const ni = geo.toNonIndexed(); geo.dispose(); geo = ni; }
    if (!this.statics.has(mat)) this.statics.set(mat, []);
    this.statics.get(mat).push(geo);
  }
  box(w, h, d, r, mat, x, y, z, rot, seg) { this.add(new RoundedBoxGeometry(w, h, d, seg || 2, r == null ? 0.006 : r), mat, x, y, z, rot); }
  finishStatics() {
    this.body = new THREE.Group(); this.root.add(this.body);
    this.statics.forEach((list, mat) => {
      const g = mergeGeometries(list, false); list.forEach(x => x.dispose());
      const mesh = new THREE.Mesh(g, mat); mesh.castShadow = true; mesh.receiveShadow = true; this.body.add(mesh);
    });
    this.statics = null;
    if (this.T.reflect > 0) {
      // a faint mirror image on the polished floor
      this.mirror = new THREE.Group(); this.mirror.scale.y = -1; this.root.add(this.mirror);
      this.body.children.forEach(mesh => {
        const mm = mesh.material.clone(); mm.transparent = true; mm.opacity = this.T.reflect; mm.depthWrite = false; mm.side = THREE.BackSide; mm.envMapIntensity = (mm.envMapIntensity || 1) * 0.5;
        const c = new THREE.Mesh(mesh.geometry, mm); c.renderOrder = -2; this.mirror.add(c);
      });
      (this.mirrorExtra || []).forEach(m => { const c = m.clone(); c.material = m.material.clone(); c.material.transparent = true; c.material.opacity = this.T.reflect * 1.5; c.material.depthWrite = false; c.material.side = THREE.BackSide; c.renderOrder = -2; this.mirror.add(c); });
    }
  }
  // a faint glare sheet over glass that slides with the parallax
  glare(w, h, x, y, z) {
    const t = tex(Art.glareCanvas(256, 256)); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    const g = this.plane(w, h, new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: 0.16, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }), x, y, z);
    g.renderOrder = 7; (this.glares = this.glares || []).push(g); return g;
  }
  plane(w, h, mat, x, y, z, rot) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(x, y, z); if (rot) m.rotation.set(rot[0] || 0, rot[1] || 0, rot[2] || 0); this.root.add(m); return m; }
  display(w, h, pw, ph, paint) {
    const [c, x] = Art.cv(pw, ph); const mat = unlit(c); mat.transparent = true;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.renderOrder = 2;
    const d = { mesh: m, c: c, x: x, W: pw, H: ph, mat: mat, paint: (st) => { paint(x, pw, ph, st); mat.tex.needsUpdate = true; this.invalidate(); } };
    this.root.add(m); return d;
  }
  bulbRing(pts) {
    const n = pts.length, o = new THREE.Object3D();
    // filament core (lit), glass envelope, brass socket, and a tight glow
    const im = new THREE.InstancedMesh(new THREE.SphereGeometry(0.0045, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), n);
    const glassM = new THREE.MeshPhysicalMaterial({ color: 0xfff3d6, metalness: 0, roughness: 0.05, transparent: true, opacity: 0.35, envMap: envTex, envMapIntensity: 1.4, clearcoat: 1, depthWrite: false });
    const env = new THREE.InstancedMesh(new THREE.SphereGeometry(0.011, 16, 12), glassM, n);
    const sock = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.0055, 0.0065, 0.01, 12), this.mats.gold, n);
    const gm = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.05, 0.05), new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }), n);
    pts.forEach((p, i) => {
      o.position.set(p[0], p[1], p[2]); o.rotation.set(0, 0, 0); o.updateMatrix(); im.setMatrixAt(i, o.matrix); env.setMatrixAt(i, o.matrix);
      o.position.z += 0.006; o.updateMatrix(); gm.setMatrixAt(i, o.matrix);
      o.position.set(p[0], p[1], p[2] - 0.012); o.rotation.set(Math.PI / 2, 0, 0); o.updateMatrix(); sock.setMatrixAt(i, o.matrix);
      im.setColorAt(i, new THREE.Color(1, 0.8, 0.4)); gm.setColorAt(i, new THREE.Color(0.4, 0.3, 0.1));
    });
    im.renderOrder = 3; env.renderOrder = 5; gm.renderOrder = 6; sock.castShadow = true;
    this.root.add(im); this.root.add(env); this.root.add(sock); this.root.add(gm);
    this.bulbs = { im: im, gm: gm, n: n, pts: pts }; this.paintBulbs(0);
  }
  paintBulbs(t) {
    const b = this.bulbs; if (!b) return;
    const won = t < this.wonUntil, c1 = new THREE.Color(), c2 = new THREE.Color();
    for (let i = 0; i < b.n; i++) {
      let on;
      if (won) on = ((Math.floor(t / 110) + i) % 3 === 0) ? 1 : 0.18;
      else on = this.T.kind === 'mech' ? 0.55 + 0.45 * ((Math.floor(t / 650) + i) % 2) : (((Math.floor(t / 400) + i) % 6) < 4 ? 0.9 : 0.25);
      c1.setRGB(1, 0.72 + 0.26 * on, 0.3 + 0.55 * on).multiplyScalar(0.5 + 0.5 * on); c2.copy(c1).multiplyScalar(0.18 + 0.5 * on);
      b.im.setColorAt(i, c1); b.gm.setColorAt(i, c2);
    }
    b.im.instanceColor.needsUpdate = true; b.gm.instanceColor.needsUpdate = true;
  }

  // ── Diamond Sevens: chrome and walnut upright with three drums and a handle ──
  buildClassic() {
    const T = this.T, m = this.mats, W = T.W, D = T.D, F = D / 2, L = {};
    // kick plate and base
    this.box(W - 0.05, 0.06, D - 0.05, 0.004, m.rubber, 0, 0.03, 0);
    this.box(W, 0.44, D, 0.01, m.walnut, 0, 0.28, 0);
    this.box(W + 0.012, 0.016, D + 0.012, 0.007, m.chrome, 0, 0.5, 0, null, 4);
    this.box(W + 0.012, 0.016, D + 0.012, 0.007, m.chrome, 0, 0.065, 0, null, 4);
    // coin tray: a well cut into the body, sloped floor, rounded chrome lip along the edge
    const trw = 0.4, trh = 0.1, trd = 0.09, tray_y = 0.2;
    this.add(new THREE.PlaneGeometry(trw, trh), m.inner, 0, tray_y, F - trd);
    this.add(new THREE.PlaneGeometry(trd, trh), m.inner, -trw / 2, tray_y, F - trd / 2, [0, Math.PI / 2, 0]);
    this.add(new THREE.PlaneGeometry(trd, trh), m.inner, trw / 2, tray_y, F - trd / 2, [0, -Math.PI / 2, 0]);
    this.add(new THREE.PlaneGeometry(trw, trd), m.inner, 0, tray_y + trh / 2, F - trd / 2, [Math.PI / 2, 0, 0]);
    this.add(new THREE.PlaneGeometry(trw, trd * 1.05), m.black, 0, tray_y - trh / 2 + 0.012, F - trd / 2, [-Math.PI / 2 + 0.25, 0, 0]);
    this.box(trw + 0.05, 0.024, 0.024, 0.011, m.chrome, 0, tray_y + trh / 2 + 0.012, F + 0.006, null, 4);
    this.box(trw + 0.05, 0.024, 0.05, 0.011, m.chrome, 0, tray_y - trh / 2 - 0.012, F + 0.02, null, 4);
    this.box(0.024, trh + 0.048, 0.024, 0.011, m.chrome, -trw / 2 - 0.012, tray_y, F + 0.006, null, 4);
    this.box(0.024, trh + 0.048, 0.024, 0.011, m.chrome, trw / 2 + 0.012, tray_y, F + 0.006, null, 4);
    const [tsc, tsx] = Art.cv(16, 128); tsx.fillStray_yle = Art.lg(tsx, 0, 0, 0, 128, [[0, 'rgba(0,0,0,.85)'], [0.5, 'rgba(0,0,0,.35)'], [1, 'rgba(0,0,0,0)']]); tsx.fillRect(0, 0, 16, 128);
    const tsh = this.plane(trw, trh, unlit(tsc, { transparent: true, depthWrite: false }), 0, tray_y, F - trd + 0.001); tsh.renderOrder = 1;
    L.tray = { x: 0, y: tray_y, z: F - trd / 2, w: trw, h: trh };
    // name plate on the belly
    const plate = this.display(0.34, 0.06, 512, 96, (x, w, h) => { x.fillStyle = Art.lg(x, 0, 0, 0, h, [[0, '#2a2a30'], [1, '#08080a']]); Art.rr(x, 0, 0, w, h, 14); x.fill(); x.strokeStyle = '#c9d0d7'; x.lineWidth = 4; Art.rr(x, 3, 3, w - 6, h - 6, 12); x.stroke(); x.font = '400 ' + h * 0.5 + 'px "Great Vibes",cursive'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = Art.lg(x, 0, h * 0.2, 0, h * 0.8, [[0, '#fff7d6'], [0.5, '#ffd45a'], [1, '#c4860f']]); x.fillText('Diamond Sevens', w / 2, h * 0.54); });
    plate.mesh.position.set(0, 0.35, F + 0.002); plate.paint();
    // button deck: a sloped slab with a chrome lip
    L.deck = this.buildDeck(0.575, F, 0.26, 0.06, m.black, m.chrome);
    // main body, recessed 0.09 so the window has depth; wood plates frame the window
    const win = { x0: -0.25, x1: 0.25, y0: 0.73, y1: 1.05 }, rec = 0.09, wh = win.y1 - win.y0, wc = (win.y0 + win.y1) / 2;
    this.box(W, 0.5, D - rec, 0.01, m.walnut, 0, 0.83, -rec / 2);
    this.box(W, 0.03, rec, 0.004, m.walnut, 0, win.y1 + 0.015, F - rec / 2);
    this.box(W, 0.15, rec, 0.004, m.walnut, 0, 0.655, F - rec / 2);
    this.box((W - 0.5) / 2, wh, rec, 0.004, m.walnut, -(0.25 + (W - 0.5) / 4), wc, F - rec / 2);
    this.box((W - 0.5) / 2, wh, rec, 0.004, m.walnut, (0.25 + (W - 0.5) / 4), wc, F - rec / 2);
    // dark liner inside the window
    this.add(new THREE.PlaneGeometry(0.5, wh), m.inner, 0, wc, F - rec + 0.001);
    this.add(new THREE.PlaneGeometry(rec, wh), m.inner, win.x0 + 0.001, wc, F - rec / 2, [0, Math.PI / 2, 0]);
    this.add(new THREE.PlaneGeometry(rec, wh), m.inner, win.x1 - 0.001, wc, F - rec / 2, [0, -Math.PI / 2, 0]);
    this.add(new THREE.PlaneGeometry(0.5, rec), m.inner, 0, win.y1 - 0.001, F - rec / 2, [Math.PI / 2, 0, 0]);
    this.add(new THREE.PlaneGeometry(0.5, rec), m.inner, 0, win.y0 + 0.001, F - rec / 2, [-Math.PI / 2, 0, 0]);
    // chrome bezel and reel dividers
    const bz = 0.022;
    this.box(0.5 + bz * 2, bz, bz, 0.01, m.chrome, 0, win.y1 + bz / 2, F + 0.005, null, 4);
    this.box(0.5 + bz * 2, bz, bz, 0.01, m.chrome, 0, win.y0 - bz / 2, F + 0.005, null, 4);
    this.box(bz, wh, bz, 0.01, m.chrome, win.x0 - bz / 2, wc, F + 0.005, null, 4);
    this.box(bz, wh, bz, 0.01, m.chrome, win.x1 + bz / 2, wc, F + 0.005, null, 4);
    const n = this.M.reels.length, cw = 0.5 / n, gap = 0.018;
    for (let i = 1; i < n; i++) this.box(gap, wh, 0.016, 0.008, m.chrome, win.x0 + i * cw, wc, F + 0.003, null, 4);
    // corner trims on the body
    [-1, 1].forEach(s => { this.box(0.018, 0.5, 0.018, 0.008, m.chrome, s * (W / 2 - 0.008), 0.83, F - 0.008, null, 4); this.box(0.018, 0.44, 0.018, 0.008, m.chrome, s * (W / 2 - 0.008), 0.28, F - 0.008, null, 4); });
    // reels: drums inside the recess
    const ch = wh / this.M.rows, R = ch * 16 / (2 * Math.PI);
    L.reel = { kind: 'mech', top: win.y1, cy: wc, ch: ch, cw: cw - gap, R: R, zc: F - 0.028 - R, xs: [] };
    for (let i = 0; i < n; i++) L.reel.xs.push(win.x0 + cw * (i + 0.5));
    L.win = { x0: win.x0, x1: win.x1, y0: win.y0, y1: win.y1, z: F + 0.004 };
    this.buildReels(L.reel, [new THREE.Plane(new THREE.Vector3(0, -1, 0), win.y1), new THREE.Plane(new THREE.Vector3(0, 1, 0), -win.y0)]);
    // the window's shade: the drums fall into darkness at the top and bottom of the opening
    const [shc, shx] = Art.cv(16, 256); shx.fillStyle = Art.lg(shx, 0, 0, 0, 256, [[0, 'rgba(10,5,0,.92)'], [0.12, 'rgba(10,5,0,.5)'], [0.3, 'rgba(10,5,0,.08)'], [0.4, 'rgba(255,255,255,.13)'], [0.47, 'rgba(255,255,255,.2)'], [0.56, 'rgba(255,255,255,.04)'], [0.72, 'rgba(10,5,0,.1)'], [0.9, 'rgba(10,5,0,.55)'], [1, 'rgba(10,5,0,.92)']]); shx.fillRect(0, 0, 16, 256);
    const shade = this.plane(0.5, wh, unlit(shc, { transparent: true, depthWrite: false }), 0, wc, F + 0.0005); shade.renderOrder = 4;
    // glass over the window
    this.glass = this.plane(0.5, wh, m.glass, 0, wc, F + 0.0015); this.glass.renderOrder = 5;
    this.glare(0.5, wh, 0, wc, F + 0.002);
    // message strip and meters set into the wood below the window
    this.msgD = this.display(0.46, 0.04, 1024, 90, (x, w, h, st) => Art.paintMsg(x, w, h, st.text, st.good, T.msg)); this.msgD.mesh.position.set(0, 0.692, F + 0.002);
    this.metD = this.display(0.5, 0.066, 1024, 136, (x, w, h, st) => Art.paintMeters(x, w, h, st, T.led)); this.metD.mesh.position.set(0, 0.628, F + 0.002);
    this.box(0.47, 0.05, 0.01, 0.004, m.chrome, 0, 0.692, F - 0.007);
    this.box(0.51, 0.076, 0.01, 0.004, m.chrome, 0, 0.628, F - 0.007);
    // top box: chrome-crowned, holds the printed glass with the marquee and the pay card
    const tc = 1.28, th = 0.4;
    this.box(W + 0.02, th, D, 0.035, m.walnut, 0, tc, 0, null, 3);
    this.box(W + 0.03, 0.03, D + 0.01, 0.014, m.chrome, 0, tc + th / 2 - 0.005, 0, null, 4);
    const gl = { w: 0.6, h: 0.35 };
    this.add(new THREE.PlaneGeometry(gl.w + 0.03, gl.h + 0.03), m.inner, 0, tc, F - 0.002);
    this.box(gl.w + 0.05, 0.022, 0.022, 0.01, m.chrome, 0, tc + gl.h / 2 + 0.011, F + 0.006, null, 4);
    this.box(gl.w + 0.05, 0.022, 0.022, 0.01, m.chrome, 0, tc - gl.h / 2 - 0.011, F + 0.006, null, 4);
    this.box(0.022, gl.h + 0.05, 0.022, 0.01, m.chrome, -gl.w / 2 - 0.011, tc, F + 0.006, null, 4);
    this.box(0.022, gl.h + 0.05, 0.022, 0.01, m.chrome, gl.w / 2 + 0.011, tc, F + 0.006, null, 4);
    this.topD = this.display(gl.w, gl.h, 1024, Math.round(1024 * gl.h / gl.w), (x, w, h, st) => Art.paintTopGlass(x, w, h, st)); this.topD.mesh.position.set(0, tc, F + 0.0005);
    this.topGlass = this.plane(gl.w, gl.h, m.glass, 0, tc, F + 0.0025); this.topGlass.renderOrder = 5;
    L.glass = { x0: -gl.w / 2, x1: gl.w / 2, y0: tc - gl.h / 2, y1: tc + gl.h / 2, z: F };
    // bulbs around the top glass
    const pts = [], nb = 26, bx = gl.w / 2 + 0.034, by = gl.h / 2 + 0.034;
    for (let i = 0; i < nb; i++) { const u = i / nb; let px, py; if (u < 0.34) { px = -bx + (u / 0.34) * 2 * bx; py = by; } else if (u < 0.5) { px = bx; py = by - ((u - 0.34) / 0.16) * 2 * by; } else if (u < 0.84) { px = bx - ((u - 0.5) / 0.34) * 2 * bx; py = -by; } else { px = -bx; py = -by + ((u - 0.84) / 0.16) * 2 * by; } pts.push([px, tc + py, F + 0.018]); }
    this.bulbRing(pts);
    // the pull handle on the right
    this.box(0.05, 0.18, 0.11, 0.012, m.chrome, W / 2 + 0.024, wc, 0.06);
    const hg = new THREE.Group(); hg.position.set(W / 2 + 0.065, wc, 0.06); this.root.add(hg);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.032, 24), m.chrome); hub.rotation.z = Math.PI / 2; hub.castShadow = true; hg.add(hub);
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.012, 0.32, 16), m.chrome); rod.position.y = 0.16; rod.castShadow = true; hg.add(rod);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.046, 32, 24), m.red); ball.position.y = 0.34; ball.castShadow = true; hg.add(ball);
    this.handle = { g: hg, p: 0, len: 0.39 };
    this.mirrorExtra = [this.glass, this.topGlass];
    L.height = 1.5; L.width = W + 0.18;
    return L;
  }
  // ── Video cabinets: lacquered upright with an LCD, lit topper and LED edges ──
  buildVideo() {
    const T = this.T, m = this.mats, W = T.W, D = T.D, F = D / 2, L = {};
    this.box(W - 0.05, 0.07, D - 0.05, 0.004, m.rubber, 0, 0.035, 0);
    this.box(W, 0.45, D, 0.012, m.lacquer, 0, 0.295, 0);
    this.box(W + 0.012, 0.012, D + 0.012, 0.004, m.trim, 0, 0.52, 0);
    this.box(W + 0.012, 0.012, D + 0.012, 0.004, m.trim, 0, 0.075, 0);
    // belly glass
    this.bellyD = this.display(0.56, 0.24, 1024, 440, (x, w, h, st) => Art.paintBelly(this.mode, x, w, h, st.name, this.atlas, st.keys)); this.bellyD.mesh.position.set(0, 0.3, F + 0.001);
    this.box(0.58, 0.012, 0.012, 0.004, m.trim, 0, 0.3 + 0.126, F + 0.004); this.box(0.58, 0.012, 0.012, 0.004, m.trim, 0, 0.3 - 0.126, F + 0.004);
    this.box(0.012, 0.26, 0.012, 0.004, m.trim, -0.286, 0.3, F + 0.004); this.box(0.012, 0.26, 0.012, 0.004, m.trim, 0.286, 0.3, F + 0.004);
    L.deck = this.buildDeck(0.595, F, 0.24, 0.06, m.black, m.trim);
    // main box with the screen
    this.box(W, 0.68, D, 0.012, m.lacquer, 0, 0.6 + 0.34, 0);
    const sc = { w: 0.6, h: 0.58, y: 0.94 }, bz = 0.03;
    // bezel: a rounded gloss-black frame standing proud of the body, with a thin inner step
    this.box(sc.w + bz * 2, bz, 0.03, 0.013, m.gloss, 0, sc.y + sc.h / 2 + bz / 2, F + 0.008, null, 4);
    this.box(sc.w + bz * 2, bz, 0.03, 0.013, m.gloss, 0, sc.y - sc.h / 2 - bz / 2, F + 0.008, null, 4);
    this.box(bz, sc.h, 0.03, 0.013, m.gloss, -sc.w / 2 - bz / 2, sc.y, F + 0.008, null, 4);
    this.box(bz, sc.h, 0.03, 0.013, m.gloss, sc.w / 2 + bz / 2, sc.y, F + 0.008, null, 4);
    const st = 0.008;
    this.box(sc.w + st * 2, st, 0.012, 0.003, m.black, 0, sc.y + sc.h / 2 + st / 2, F + 0.002);
    this.box(sc.w + st * 2, st, 0.012, 0.003, m.black, 0, sc.y - sc.h / 2 - st / 2, F + 0.002);
    this.box(st, sc.h, 0.012, 0.003, m.black, -sc.w / 2 - st / 2, sc.y, F + 0.002);
    this.box(st, sc.h, 0.012, 0.003, m.black, sc.w / 2 + st / 2, sc.y, F + 0.002);
    // LED edge strips
    const ledMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(T.edge), toneMapped: false });
    [-1, 1].forEach(s => { const e = new THREE.Mesh(new RoundedBoxGeometry(0.01, 0.6, 0.01, 2, 0.004), ledMat); e.position.set(s * (W / 2 - 0.016), sc.y, F + 0.004); this.root.add(e);
      const g = new THREE.Mesh(new THREE.PlaneGeometry(0.09, 0.66), new THREE.MeshBasicMaterial({ map: glowTex, color: new THREE.Color(T.edge), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, opacity: 0.55 })); g.position.set(s * (W / 2 - 0.016), sc.y, F + 0.012); this.root.add(g); });
    // the LCD: background, then the reels, hud, message and meters on it
    const [bg, bx] = Art.cv(1024, Math.round(1024 * sc.h / sc.w)); Art.paintScreenBg(this.mode, bx, bg.width, bg.height, false);
    this.screenBg = { c: bg, x: bx }; this.screenMat = unlit(bg);
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(sc.w, sc.h), this.screenMat); scr.position.set(0, sc.y, F + 0.0005); scr.renderOrder = 1; this.root.add(scr); this.screen = scr;
    const top = sc.y + sc.h / 2, hudH = 0.07, msgH = 0.044, metH = 0.07, rows = this.M.rows;
    const n = this.M.reels.length, cw = 0.58 / n, ch = cw * T.ratio;
    const used = hudH + rows * ch + msgH + metH, g = Math.max(0.006, (sc.h - used) / 4);
    let y = top - g;
    this.hudD = this.display(0.58, hudH, 1024, Math.round(1024 * hudH / 0.58), (x, w, h, st) => Art.paintHud(this.mode, x, w, h, st)); this.hudD.mesh.position.set(0, y - hudH / 2, F + 0.0012); L.hud = { x0: -0.29, x1: 0.29, y0: y - hudH, y1: y, z: F }; y -= hudH + g;
    L.reel = { kind: 'flat', top: y, ch: ch, cw: cw - 0.006, z: F + 0.0012, xs: [] };
    for (let i = 0; i < n; i++) L.reel.xs.push(-0.29 + cw * (i + 0.5));
    L.win = { x0: -0.29, x1: 0.29, y0: y - rows * ch, y1: y, z: F + 0.0012 };
    this.buildReels(L.reel, [new THREE.Plane(new THREE.Vector3(0, -1, 0), y), new THREE.Plane(new THREE.Vector3(0, 1, 0), -(y - rows * ch))]);
    y -= rows * ch + g;
    this.msgD = this.display(0.56, msgH, 1024, Math.round(1024 * msgH / 0.56), (x, w, h, st) => Art.paintMsg(x, w, h, st.text, st.good, T.msg)); this.msgD.mesh.position.set(0, y - msgH / 2, F + 0.0012); y -= msgH + g;
    this.metD = this.display(0.56, metH, 1024, Math.round(1024 * metH / 0.56), (x, w, h, st) => Art.paintMeters(x, w, h, st, T.led)); this.metD.mesh.position.set(0, y - metH / 2, F + 0.0012);
    this.glass = this.plane(sc.w, sc.h, m.glass, 0, sc.y, F + 0.0035); this.glass.renderOrder = 5;
    // topper sign
    const tcy = 1.39;
    this.box(0.62, 0.18, D - 0.02, 0.02, m.lacquer, 0, tcy, -0.01, null, 3);
    this.box(0.64, 0.016, D, 0.007, m.trim, 0, tcy + 0.09, -0.01, null, 4);
    this.topD = this.display(0.58, 0.15, 1024, Math.round(1024 * 0.15 / 0.58), (x, w, h, st) => Art.paintTopper(this.mode, x, w, h, st.name, st.sub)); this.topD.mesh.position.set(0, tcy, F + 0.001);
    this.box(0.6, 0.014, 0.014, 0.006, m.trim, 0, tcy + 0.081, F + 0.004, null, 4); this.box(0.6, 0.014, 0.014, 0.006, m.trim, 0, tcy - 0.081, F + 0.004, null, 4);
    this.box(0.014, 0.17, 0.014, 0.006, m.trim, -0.296, tcy, F + 0.004, null, 4); this.box(0.014, 0.17, 0.014, 0.006, m.trim, 0.296, tcy, F + 0.004, null, 4);
    const pts = [], nb = 18; for (let i = 0; i < nb; i++) { const u = (i + 0.5) / nb; pts.push([-0.29 + u * 0.58, tcy + 0.081, F + 0.016]); }
    this.bulbRing(pts);
    this.glare(sc.w, sc.h, 0, sc.y, F + 0.004);
    this.mirrorExtra = [scr, this.glass];
    L.height = 1.49; L.width = W + 0.04;
    return L;
  }
  // the sloped button deck: slab, lip, buttons with lit caps, two readouts printed on the surface
  buildDeck(backTop, F, depth, thick, slabMat, lipMat) {
    const T = this.T, g = new THREE.Group(), tilt = 0.5, cs = Math.cos(tilt), sn = Math.sin(tilt);
    // the slab's top-back edge sits exactly on the body's front face at backTop
    const offY = (thick / 2) * cs + (depth / 2) * sn, offZ = (thick / 2) * sn - (depth / 2) * cs, y = backTop;
    g.position.set(0, backTop - offY, F - offZ); g.rotation.x = tilt; this.root.add(g);
    const W = T.W + 0.02;
    const slab = new THREE.Mesh(new RoundedBoxGeometry(W, thick, depth, 2, 0.012), slabMat); slab.castShadow = true; slab.receiveShadow = true; g.add(slab);
    const lip = new THREE.Mesh(new RoundedBoxGeometry(W + 0.01, 0.018, 0.03, 2, 0.006), lipMat); lip.position.set(0, -0.01, depth / 2 - 0.005); g.add(lip);
    // a block under the slab back to the body
    const blk = new THREE.Mesh(new RoundedBoxGeometry(T.W - 0.02, 0.08, 0.14, 2, 0.01), this.mats.black); blk.position.set(0, y - 0.1, F + 0.04); blk.castShadow = true; this.root.add(blk);
    // surface print
    const [sc, sx] = Art.cv(1024, Math.round(1024 * depth / W)); this.deckC = { c: sc, x: sx };
    const surf = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.02, depth - 0.02), unlit(sc, { transparent: true })); surf.rotation.x = -Math.PI / 2; surf.position.y = thick / 2 + 0.0008; surf.renderOrder = 1; g.add(surf); this.deckSurf = surf;
    // buttons
    const hasLines = this.M.lineOpts.length > 1, zb = -0.066, zf = 0.062, spec = [];
    if (hasLines) spec.push(['lm', -0.27, zb, 'round', 0.026], ['lp', -0.09, zb, 'round', 0.026], ['bm', 0.09, zb, 'round', 0.026], ['bp', 0.27, zb, 'round', 0.026]);
    else spec.push(['bm', -0.12, zb, 'round', 0.026], ['bp', 0.12, zb, 'round', 0.026]);
    spec.push(['max', -0.17, zf, 'rect', 0.16, 0.056], ['spin', 0.15, zf, 'round', 0.052]);
    this.deckReadouts = hasLines ? [{ key: 'lines', x: 0.5 - 0.18 / W, y: 0.5 + zb / depth, w: 0.11, label: 'Lines' }, { key: 'bet', x: 0.5 + 0.18 / W, y: 0.5 + zb / depth, w: 0.11, label: 'Per line' }] : [{ key: 'bet', x: 0.5, y: 0.5 + zb / depth, w: 0.13, label: this.mode === 'buffalo' ? 'Credits a spin' : 'Bet a spin' }];
    spec.forEach(s => {
      const key = s[0], bg = new THREE.Group(); bg.position.set(s[1], thick / 2, s[2]); g.add(bg);
      let ring, cap, cw, chh;
      if (s[3] === 'round') {
        ring = new THREE.Mesh(new THREE.CylinderGeometry(s[4] + 0.008, s[4] + 0.01, 0.012, 32), this.mats.gloss); ring.position.y = 0.006; bg.add(ring);
        cap = new THREE.Mesh(new THREE.CylinderGeometry(s[4], s[4] * 0.96, 0.016, 32), null); cap.position.y = 0.02; cw = chh = s[4] * 2;
      } else {
        ring = new THREE.Mesh(new RoundedBoxGeometry(s[4] + 0.016, 0.012, s[5] + 0.016, 2, 0.006), this.mats.gloss); ring.position.y = 0.006; bg.add(ring);
        cap = new THREE.Mesh(new RoundedBoxGeometry(s[4], 0.016, s[5], 2, 0.008), null); cap.position.y = 0.02; cw = s[4]; chh = s[5];
      }
      const px = 256, py = Math.round(256 * chh / cw), [cc, cx] = Art.cv(px, py);
      const capMat = unlit(cc); capMat.tex.wrapS = capMat.tex.wrapT = THREE.ClampToEdgeWrapping;
      // the cap face shows the label; sides are plain
      const side = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(T[key === 'spin' ? 'spin' : 'btn'][1]), roughness: 0.3, clearcoat: 1, envMap: envTex, envMapIntensity: 0.8 });
      cap.material = s[3] === 'round' ? [side, capMat, side] : [side, side, capMat, side, side, side];
      if (s[3] === 'round') { cap.geometry.rotateY(Math.PI / 2); }
      cap.castShadow = true; bg.add(cap);
      ring.castShadow = true;
      const glow = new THREE.Mesh(new THREE.PlaneGeometry(cw * 1.9, chh * 1.9), new THREE.MeshBasicMaterial({ map: glowTex, color: new THREE.Color(T[key === 'spin' ? 'spin' : 'btn'][1]), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, opacity: 0.35 }));
      glow.rotation.x = -Math.PI / 2; glow.position.y = 0.03; glow.renderOrder = 6; bg.add(glow);
      this.caps[key] = { g: bg, cap: cap, c: cc, x: cx, W: px, H: py, mat: capMat, glow: glow, w: cw, d: chh, pressT: 0, st: { text: '', off: false } };
    });
    return { g: g, W: W, depth: depth };
  }
  // reels: a strip of quads per reel, repositioned every frame from the scroll position
  buildReels(RL, clips) {
    const rows = this.M.rows, sub = RL.kind === 'mech' ? 6 : 1, cells = rows + 2, quads = cells * sub;
    this.baseTex = tex(this.atlas.canvas); this.blurTex = tex(this.atlas.blur); this.featTex = this.atlas.feat ? tex(this.atlas.feat) : null;
    [this.baseTex, this.blurTex, this.featTex].forEach(t => { if (t) { t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; } });
    this.RL = RL;
    this.M.reels.forEach((strip, i) => {
      const geo = new THREE.BufferGeometry();
      const pos = new Float32Array(quads * 12), uv = new Float32Array(quads * 8), col = new Float32Array(quads * 12), nor = new Float32Array(quads * 12), idx = [];
      for (let q = 0; q < quads; q++) idx.push(q * 4, q * 4 + 3, q * 4 + 2, q * 4, q * 4 + 2, q * 4 + 1);
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
      geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2).setUsage(THREE.DynamicDrawUsage));
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3).setUsage(THREE.DynamicDrawUsage));
      geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
      geo.setIndex(idx);
      const mat = RL.kind === 'mech'
        ? new THREE.MeshStandardMaterial({ map: this.baseTex, vertexColors: true, roughness: 0.42, metalness: 0, emissive: 0xffffff, emissiveMap: this.baseTex, emissiveIntensity: 0.16, clippingPlanes: clips, envMap: envTex, envMapIntensity: 0.35 })
        : new THREE.MeshBasicMaterial({ map: this.baseTex, vertexColors: true, clippingPlanes: clips, toneMapped: false });
      const mesh = new THREE.Mesh(geo, mat); mesh.frustumCulled = false; mesh.renderOrder = 2; this.root.add(mesh);
      // anticipation glow around the reel
      const gw = RL.kind === 'mech' ? RL.cw * 1.5 : RL.cw * 1.45, gh = rows * RL.ch * (RL.kind === 'mech' ? 1.3 : 1.2);
      const glow = new THREE.Mesh(new THREE.PlaneGeometry(gw, gh), new THREE.MeshBasicMaterial({ map: glowTex, color: 0xffd45a, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, opacity: 0 }));
      glow.position.set(RL.xs[i], RL.kind === 'mech' ? RL.cy : RL.top - rows * RL.ch / 2, (RL.kind === 'mech' ? this.L_winZ(RL) : RL.z) + 0.0025); glow.renderOrder = 6; glow.visible = false; this.root.add(glow);
      this.reels.push({ strip: strip, L: strip.length, mesh: mesh, mat: mat, geo: geo, p: 0, fast: false, dim: null, pop: {}, antic: false, glow: glow, sub: sub, cells: cells, i: i });
      this.setReel(i, 0);
    });
  }
  L_winZ(RL) { return RL.zc + RL.R + 0.004; }
  setReel(i, p) {
    const r = this.reels[i], RL = this.RL, rows = this.M.rows, L = r.L, atlas = this.atlas, pos = r.geo.attributes.position.array, uv = r.geo.attributes.uv.array, col = r.geo.attributes.color.array, nor = r.geo.attributes.normal.array;
    r.p = p; const base = Math.floor(p + 1e-6), stopped = Math.abs(p - Math.round(p)) < 1e-4;
    let q = 0; const sub = r.sub, x0 = RL.xs[i] - RL.cw / 2, x1 = RL.xs[i] + RL.cw / 2, now = performance.now();
    for (let k = base - 1; k <= base + rows; k++) {
      const sym = r.strip[((k % L) + L) % L], U = atlas.uv(sym) || atlas.uv('_'), row = k - base;
      let s = 1, dim = 1;
      if (stopped && row >= 0 && row < rows) {
        if (r.dim && !r.dim[row]) dim = 0.42;
        const pt = r.pop[row]; if (pt) { const u = (now - pt) / 550; if (u >= 1) delete r.pop[row]; else s = u < 0.6 ? 0.6 + (1.22 - 0.6) * (u / 0.6) : 1.22 - 0.22 * ((u - 0.6) / 0.4); }
        if (!stopped) Object.keys(r.pop).forEach(k => { if (now - r.pop[k] > 600) delete r.pop[k]; });
      }
      for (let j = 0; j < sub; j++) {
        const t0 = k - p + j / sub, t1 = k - p + (j + 1) / sub, vt = U.v1 - (U.v1 - U.v0) * j / sub, vb = U.v1 - (U.v1 - U.v0) * (j + 1) / sub;
        const cxm = RL.xs[i], tc = k - p + 0.5;   // cell centre in cells from the top
        let xa = x0, xb = x1; if (s !== 1) { xa = cxm + (x0 - cxm) * s; xb = cxm + (x1 - cxm) * s; }
        const ta = s === 1 ? t0 : tc + (t0 - tc) * s, tb = s === 1 ? t1 : tc + (t1 - tc) * s;
        const o = q * 12, ou = q * 8;
        if (RL.kind === 'mech') {
          const th0 = (ta * RL.ch - rows * RL.ch / 2) / RL.R, th1 = (tb * RL.ch - rows * RL.ch / 2) / RL.R;
          const ya = RL.cy - RL.R * Math.sin(th0), za = RL.zc + RL.R * Math.cos(th0), yb = RL.cy - RL.R * Math.sin(th1), zb = RL.zc + RL.R * Math.cos(th1);
          pos[o] = xa; pos[o + 1] = ya; pos[o + 2] = za; pos[o + 3] = xb; pos[o + 4] = ya; pos[o + 5] = za;
          pos[o + 6] = xb; pos[o + 7] = yb; pos[o + 8] = zb; pos[o + 9] = xa; pos[o + 10] = yb; pos[o + 11] = zb;
          const n0y = -Math.sin(th0), n0z = Math.cos(th0), n1y = -Math.sin(th1), n1z = Math.cos(th1);
          nor[o] = 0; nor[o + 1] = n0y; nor[o + 2] = n0z; nor[o + 3] = 0; nor[o + 4] = n0y; nor[o + 5] = n0z; nor[o + 6] = 0; nor[o + 7] = n1y; nor[o + 8] = n1z; nor[o + 9] = 0; nor[o + 10] = n1y; nor[o + 11] = n1z;
        } else {
          const ya = RL.top - ta * RL.ch, yb = RL.top - tb * RL.ch, z = RL.z;
          pos[o] = xa; pos[o + 1] = ya; pos[o + 2] = z; pos[o + 3] = xb; pos[o + 4] = ya; pos[o + 5] = z;
          pos[o + 6] = xb; pos[o + 7] = yb; pos[o + 8] = z; pos[o + 9] = xa; pos[o + 10] = yb; pos[o + 11] = z;
          for (let v = 0; v < 4; v++) { nor[o + v * 3] = 0; nor[o + v * 3 + 1] = 0; nor[o + v * 3 + 2] = 1; }
        }
        uv[ou] = U.u0; uv[ou + 1] = vt; uv[ou + 2] = U.u1; uv[ou + 3] = vt; uv[ou + 4] = U.u1; uv[ou + 5] = vb; uv[ou + 6] = U.u0; uv[ou + 7] = vb;
        for (let v = 0; v < 4; v++) { col[o + v * 3] = dim; col[o + v * 3 + 1] = dim; col[o + v * 3 + 2] = dim; }
        q++;
      }
    }
    r.geo.attributes.position.needsUpdate = true; r.geo.attributes.uv.needsUpdate = true; r.geo.attributes.color.needsUpdate = true; r.geo.attributes.normal.needsUpdate = true;
    this.invalidate();
    if (Object.keys(r.pop).length) this.anim('pop' + i, () => { this.setReel(i, r.p); return Object.keys(r.pop).length > 0; });
  }
  setFast(i, on) { const r = this.reels[i]; if (r.fast === on) return; r.fast = on; const t = on ? this.blurTex : (this.feat && this.featTex ? this.featTex : this.baseTex); r.mat.map = t; if (r.mat.emissiveMap) r.mat.emissiveMap = t; r.mat.needsUpdate = false; this.invalidate(); }
  setDim(i, rowsLit) { const r = this.reels[i]; r.dim = rowsLit; this.setReel(i, r.p); }
  pop(i, row) { const r = this.reels[i]; r.pop[row] = performance.now(); this.setReel(i, r.p); }
  setAntic(i, on) { const r = this.reels[i]; r.antic = on; r.glow.visible = on; if (on) this.anim('antic' + i, (t) => { r.glow.material.opacity = 0.45 + 0.4 * Math.sin(t / 90); return r.antic; }); else r.glow.material.opacity = 0; this.invalidate(); }
  setFeature(kind) {
    this.feat = kind;
    if (this.T.kind === 'video') { Art.paintScreenBg(this.mode, this.screenBg.x, this.screenBg.c.width, this.screenBg.c.height, kind === 'fs'); this.screenMat.tex.needsUpdate = true; }
    this.reels.forEach(r => { if (!r.fast) { const t = kind === 'fs' && this.featTex ? this.featTex : this.baseTex; r.mat.map = t; if (r.mat.emissiveMap) r.mat.emissiveMap = t; } r.mesh.visible = kind !== 'hs'; });
    this.invalidate();
  }

  // ── Lights, floor, camera ──
  buildLights() {
    const a = this.o.amb || { l: '#ffb35a', r: '#ff6a3a', t: '#ffd9a0', floor: '#2a0c0c' };
    this.scene.add(new THREE.HemisphereLight(new THREE.Color(a.t), new THREE.Color(a.floor), 0.22));
    const key = new THREE.DirectionalLight(0xfff1dc, 4.2); key.position.set(-2.6, 3.4, 1.4); key.target.position.set(0, 0.8, 0); this.scene.add(key); this.scene.add(key.target);
    key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.camera.near = 1; key.shadow.camera.far = 8;
    key.shadow.camera.left = -1.1; key.shadow.camera.right = 1.1; key.shadow.camera.top = 1.6; key.shadow.camera.bottom = -0.6; key.shadow.bias = -0.0003; key.shadow.normalBias = 0.012; key.shadow.radius = 5;
    const fill = new THREE.DirectionalLight(0xe8ecff, 0.35); fill.position.set(1.6, 1.2, 2.6); this.scene.add(fill);
    const rimL = new THREE.PointLight(new THREE.Color(a.l), 4, 5, 2); rimL.position.set(-1.4, 1.5, -0.6); this.scene.add(rimL);
    const rimR = new THREE.PointLight(new THREE.Color(a.r), 16, 5, 2); rimR.position.set(1.1, 1.4, -0.7); this.scene.add(rimR);
    this.flashL = new THREE.PointLight(0xffe9b0, 0, 4, 2); this.flashL.position.set(0, 1.1, 1.3); this.scene.add(this.flashL);
    this.key = key;
  }
  buildFloor() {
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(5, 5), new THREE.ShadowMaterial({ opacity: 0.55, depthWrite: false })); sh.rotation.x = -Math.PI / 2; sh.receiveShadow = true; sh.renderOrder = -3; this.scene.add(sh);
    const ao = new THREE.Mesh(new THREE.PlaneGeometry(this.T.W * 1.9, this.T.D * 1.9), new THREE.MeshBasicMaterial({ map: fadeTex, transparent: true, depthWrite: false, opacity: 0.85, toneMapped: false }));
    ao.rotation.x = -Math.PI / 2; ao.position.set(0, 0.0015, 0.02); ao.renderOrder = -3; this.scene.add(ao);
  }
  // frame the cabinet into the free area of the viewport (CSS px); the horizon sits at eye level
  resize(W, H, top, bottom) {
    this.W = W; this.H = H; this.frameTop = top; this.frameBottom = bottom;
    const r = getRenderer(canvasEl); r.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); r.setSize(W, H, false);
    this.camera.aspect = W / H;
    const L = this.L, span = bottom - top, cabTop = L.height + 0.05, floorY = -0.2;
    let k = (span - 14) / (cabTop - floorY);                        // px per metre, height-bound
    const kw = (W - 24) / (L.width + 0.1); if (kw < k) k = kw;        // or width-bound
    this.kpm = k;
    const Fh = (H / 2) / k, d = Fh / Math.tan(FOV / 2 * Math.PI / 180);
    const E = cabTop - ((H / 2) - (top + 7)) / k;                     // eye height: the point at the screen centre
    this.cam0 = { d: d, E: Math.max(0.5, E), ox: 0.26 };
    this.camera.updateProjectionMatrix(); this.camDirty = true; this.invalidate();
  }
  setTilt(x, y) { if (x === this.tilt.tx && y === this.tilt.ty) return; this.tilt.tx = x; this.tilt.ty = y; this.anim('tilt', () => { const t = this.tilt; t.x += (t.tx - t.x) * 0.12; t.y += (t.ty - t.y) * 0.12; this.camDirty = true; return Math.abs(t.tx - t.x) > 0.002 || Math.abs(t.ty - t.y) > 0.002; }); }
  placeCamera() {
    const c = this.cam0; if (!c) return;
    const ox = c.ox + this.tilt.x * 0.22, oy = this.tilt.y * 0.07;
    this.camera.position.set(ox, c.E + oy, c.d); this.camera.lookAt(0.02, c.E + oy * 0.6, 0);
    this.camera.updateMatrixWorld();
    (this.glares || []).forEach(g => { g.material.map.offset.set(-this.tilt.x * 0.18, this.tilt.y * 0.08); });
  }
  // ── Rendering on demand ──
  invalidate() { if (this.raf || this.disposed) return; this.raf = requestAnimationFrame(t => this.frame(t)); }
  anim(key, fn) { if (!this.anims.some(a => a.key === key)) this.anims.push({ key: key, fn: fn }); this.invalidate(); }
  frame(t) {
    this.raf = 0; if (this.disposed) return;
    if (document.visibilityState === 'hidden') { this.pending = true; return; }
    this.anims = this.anims.filter(a => a.fn(t));
    if (t < this.wonUntil || this.bulbAnim) this.paintBulbs(t);
    if (t < this.wonUntil) this.anim('won', () => performance.now() < this.wonUntil);
    if (this.camDirty) { this.placeCamera(); this.camDirty = false; this.rectsDirty = true; }
    if (this.handle && this.handle.g.rotation.x !== this.handle.p * 1.45) this.handle.g.rotation.x = this.handle.p * 1.45;
    const r = getRenderer(canvasEl), dpr = Math.min(2, window.devicePixelRatio || 1);
    if (canvasEl.width !== Math.floor(this.W * dpr) || canvasEl.height !== Math.floor(this.H * dpr)) { r.setPixelRatio(dpr); r.setSize(this.W, this.H, false); }
    r.render(this.scene, this.camera);
    if (this.onFrame) this.onFrame(this.rectsDirty); this.rectsDirty = false;
    if (this.anims.length) this.invalidate();
  }
  resume() { if (this.pending) { this.pending = false; this.invalidate(); } }
  stats() { const i = getRenderer(canvasEl).info; return { calls: i.render.calls, tris: i.render.triangles }; }

  // ── Projection helpers for the HTML overlay ──
  project(x, y, z) { const v = new THREE.Vector3(x, y, z).project(this.camera); return [(v.x + 1) / 2 * this.W, (1 - v.y) / 2 * this.H]; }
  bbox(pts) { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; pts.forEach(p => { const q = this.project(p[0], p[1], p[2]); x0 = Math.min(x0, q[0]); y0 = Math.min(y0, q[1]); x1 = Math.max(x1, q[0]); y1 = Math.max(y1, q[1]); }); return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }; }
  objBox(obj, pad) {
    obj.updateWorldMatrix(true, true); const b = new THREE.Box3().setFromObject(obj), pts = [];
    [b.min.x, b.max.x].forEach(x => [b.min.y, b.max.y].forEach(y => [b.min.z, b.max.z].forEach(z => pts.push([x, y, z]))));
    const r = this.bbox(pts); if (pad) { r.x -= pad; r.y -= pad; r.w += pad * 2; r.h += pad * 2; } return r;
  }
  cellCorners(c, row) {
    const RL = this.RL, x0 = RL.xs[c] - RL.cw / 2, x1 = RL.xs[c] + RL.cw / 2, rows = this.M.rows;
    if (RL.kind === 'mech') { const f = t => { const th = (t * RL.ch - rows * RL.ch / 2) / RL.R; return [RL.cy - RL.R * Math.sin(th), RL.zc + RL.R * Math.cos(th)]; }, a = f(row), b = f(row + 1); return [[x0, a[0], a[1]], [x1, a[0], a[1]], [x1, b[0], b[1]], [x0, b[0], b[1]]]; }
    const ya = RL.top - row * RL.ch, yb = RL.top - (row + 1) * RL.ch; return [[x0, ya, RL.z], [x1, ya, RL.z], [x1, yb, RL.z], [x0, yb, RL.z]];
  }
  rects() {
    const L = this.L, w = L.win, out = { cells: [] };
    out.win = this.bbox([[w.x0, w.y1, w.z], [w.x1, w.y1, w.z], [w.x1, w.y0, w.z], [w.x0, w.y0, w.z]]);
    for (let c = 0; c < this.M.reels.length; c++) { out.cells[c] = []; for (let r = 0; r < this.M.rows; r++) out.cells[c][r] = this.bbox(this.cellCorners(c, r)); }
    Object.keys(this.caps).forEach(k => { out[k] = this.objBox(this.caps[k].cap, 2); });
    if (this.handle) out.handle = this.objBox(this.handle.g, 10);
    if (L.hud) out.hud = this.bbox([[L.hud.x0, L.hud.y1, L.hud.z], [L.hud.x1, L.hud.y1, L.hud.z], [L.hud.x1, L.hud.y0, L.hud.z], [L.hud.x0, L.hud.y0, L.hud.z]]);
    if (L.tray) out.tray = this.bbox([[L.tray.x - L.tray.w / 2, L.tray.y + L.tray.h / 2, L.tray.z + 0.04], [L.tray.x + L.tray.w / 2, L.tray.y + L.tray.h / 2, L.tray.z + 0.04], [L.tray.x + L.tray.w / 2, L.tray.y - L.tray.h / 2, L.tray.z + 0.04], [L.tray.x - L.tray.w / 2, L.tray.y - L.tray.h / 2, L.tray.z + 0.04]]);
    if (L.glass) out.glass = this.bbox([[L.glass.x0, L.glass.y1, L.glass.z], [L.glass.x1, L.glass.y1, L.glass.z], [L.glass.x1, L.glass.y0, L.glass.z], [L.glass.x0, L.glass.y0, L.glass.z]]);
    out.kpm = this.kpm;
    return out;
  }

  // ── Game-facing API ──
  same(key, st) { const j = JSON.stringify(st); if (this.last[key] === j) return true; this.last[key] = j; return false; }
  setMsg(text, good) { if (!this.same('msg', [text, good])) this.msgD.paint({ text: text, good: good }); }
  setMeters(v) { if (!this.same('met', v)) this.metD.paint(v); }
  setHud(st) { if (this.hudD && !this.same('hud', st)) this.hudD.paint(st); }
  setTop(st) { if (this.T.kind === 'mech') this.topD.paint(Object.assign({ atlas: this.atlas, paper: this.paper || (this.paper = Art.paperCanvas(512, 5)) }, st)); else { this.topD.paint(st); if (this.bellyD) this.bellyD.paint(st); } }
  setDeck(vals) {
    if (this.same('deck', vals)) return;
    const d = this.deckC, ro = this.deckReadouts.map(r => Object.assign({}, r, { value: vals[r.key] || '' }));
    Art.paintDeck(this.mode, d.x, d.c.width, d.c.height, { readouts: ro }); this.deckSurf.material.tex.needsUpdate = true; this.invalidate();
  }
  setCaps(st) {
    Object.keys(st).forEach(k => {
      const cp = this.caps[k]; if (!cp) return; const s = st[k]; if (this.same('cap' + k, s)) return; cp.st = s;
      const pal = this.T[k === 'spin' ? 'spin' : 'btn'], stop = k === 'spin' && s.stop;
      Art.paintCap(cp.x, cp.W, cp.H, { text: s.text, sub: s.sub, hi: stop ? '#ffd0d0' : pal[0], col: stop ? '#ff5c6a' : pal[1], lo: stop ? '#c41f2f' : pal[2], ink: stop ? '#fff' : pal[3], off: !!s.off, font: s.font });
      cp.mat.tex.needsUpdate = true; cp.glow.material.opacity = s.off ? 0.06 : (k === 'spin' ? 0.5 : 0.3);
      if (stop) cp.glow.material.color.set('#ff5c6a'); else cp.glow.material.color.set(pal[1]);
    });
    this.invalidate();
  }
  press(k) { const cp = this.caps[k]; if (!cp) return; const t0 = performance.now(); this.anim('press' + k, (t) => { const u = Math.min(1, (t - t0) / 160); cp.cap.position.y = 0.02 - 0.009 * Math.sin(u * Math.PI); return u < 1; }); }
  setHandle(p) { if (!this.handle) return; this.handle.p = p; this.invalidate(); }
  won(ms) { this.wonUntil = performance.now() + (ms || 2500); this.anim('won', () => performance.now() < this.wonUntil); }
  flash(col, ms) {
    const t0 = performance.now(), dur = ms || 1800; this.flashL.color.set(col || '#ffe9b0');
    this.anim('flash', (t) => { const u = (t - t0) / dur; if (u >= 1) { this.flashL.intensity = 0; return false; } const pulse = Math.max(0, Math.sin(u * Math.PI * 3)) * (1 - u); this.flashL.intensity = 18 * pulse; return true; });
    this.won(dur);
  }
  jolt() { const t0 = performance.now(); this.anim('jolt', (t) => { const u = Math.min(1, (t - t0) / 140); this.root.position.y = -0.0025 * Math.sin(u * Math.PI); return u < 1; }); }
  setBulbIdle(on) { this.bulbAnim = on; if (on) this.anim('bulbs', () => this.bulbAnim); }
  dispose() {
    this.disposed = true; if (this.raf) cancelAnimationFrame(this.raf);
    this.scene.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) { const ms = Array.isArray(o.material) ? o.material : [o.material]; ms.forEach(mm => { if (mm.map && mm.map !== woodCache.walnut && mm.map !== glowTex && mm.map !== fadeTex) mm.map.dispose(); mm.dispose(); }); } });
    [this.baseTex, this.blurTex, this.featTex].forEach(t => { if (t) t.dispose(); });
  }
}

// A still of one machine for the picker, rendered once at small size on the shared canvas
export async function thumbnail(mode, M, atlas, o, w, h) {
  const r = getRenderer(canvasEl);
  const cab = new Cabinet(mode, M, atlas, o);
  cab.setTop(o.top); if (cab.setDeck) cab.setDeck(o.deck || {}); cab.setCaps(o.caps || {}); cab.setMsg('Good luck', false); cab.setMeters({ credit: '$1,000', bet: '$5', win: '$0' }); if (cab.hudD) cab.setHud(o.hud || {});
  (o.stops || []).forEach((p, i) => cab.setReel(i, p));
  const L = cab.L, k = (h - 10) / (L.height + 0.2), Fh = (h / 2) / k, d = Fh / Math.tan(FOV / 2 * Math.PI / 180);
  cab.camera.aspect = w / h; cab.camera.position.set(0.45, L.height * 0.5 + 0.1, d); cab.camera.lookAt(0, L.height * 0.5 - 0.05, 0); cab.camera.updateProjectionMatrix();
  cab.W = w; cab.H = h; cab.paintBulbs(0);
  r.setPixelRatio(2); r.setSize(w, h, false); r.render(cab.scene, cab.camera);
  const url = canvasEl.toDataURL('image/png');
  cab.dispose();
  return url;
}
