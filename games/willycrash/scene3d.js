// Willy Crash in 3D, the way the cabinet shows it (three.js r160, the copy in /vendor/three).
//
// The page (willycrash.html) keeps all the game: the 2D ragdoll, the collisions, the scoring. This module
// only draws that same 2D world extruded into depth. Every collider sits in the plane z = 0; the brick
// buildings are boxes centred on that plane, so Willy flies, lands and tumbles through the middle of them.
// World (x, y) from the game maps to three.js (x, -y, z): y up, units unchanged.
//
// window.WillyCrash3D(api, host) -> null without WebGL, or
//   { tick(dt), draw(), resize(W, H, dpr), project(x, y, z) -> {x, y, s, ok}, rebuild(), info(), destroy() }
// api.get() hands over the live game state every frame (see the page).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const DEPTH = 96;          // how deep the buildings are (z)
const FOV = 38;            // vertical field of view
const STREET_Z = DEPTH / 2 + 26;   // street furniture that stands in front of a building goes out here
const TANH = Math.tan(FOV / 2 * Math.PI / 180);

function supported() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; }
}
function cv2d(w, h) { const c = document.createElement('canvas'); c.width = Math.max(2, Math.round(w)); c.height = Math.max(2, Math.round(h)); return [c, c.getContext('2d')]; }
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function lerp(a, b, k) { return a + (b - a) * k; }
function approach(cur, want, rate, dt) { return cur + (want - cur) * (1 - Math.exp(-rate * dt)); }
function nonIndexed(g) { if (g.index) { const n = g.toNonIndexed(); g.dispose(); return n; } return g; }
function merge(list) { const g = mergeGeometries(list.map(nonIndexed), false); list.forEach(x => x.dispose()); return g; }
function at(geo, x, y, z, rz, ry, rx) {
  const m = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rx || 0, ry || 0, rz || 0));
  m.setPosition(x, y, z); geo.applyMatrix4(m); return geo;
}
function starPath(c, x, y, r) {
  c.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  c.closePath();
}

export function WillyCrash3D(api, host) {
  if (!supported()) return null;
  const C = api.C;
  const canvas = document.createElement('canvas'); canvas.className = 'wc-gl';
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance', stencil: false }); }
  catch (e) { return null; }
  host.insertBefore(canvas, host.firstChild);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x8cc4ee, 1);
  renderer.info.autoReset = false;
  const maxAniso = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  function tex(c, repeat) {
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = maxAniso;
    if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
    return t;
  }

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, 1, 4, 12000);
  scene.add(new THREE.HemisphereLight(0xf2f6ff, 0x9a8a78, 2.2));
  const sun = new THREE.DirectionalLight(0xfff1dc, 2.1); sun.position.set(-0.55, 1, 0.75); scene.add(sun);
  scene.fog = new THREE.Fog(0xbfdcf0, 2600, 9000);

  const MATS = {};
  function lam(col, extra) { const k = col + (extra ? JSON.stringify(Object.keys(extra)) : ''); if (!extra && MATS[k]) return MATS[k]; const m = new THREE.MeshLambertMaterial(Object.assign({ color: col }, extra || {})); if (!extra) MATS[k] = m; return m; }
  function basic(col) { return new THREE.MeshBasicMaterial({ color: col }); }

  // ── Sky: a painted gradient with the sun glow and the rainbow (screen-fixed background) ──
  (function sky() {
    const [c, x] = cv2d(16, 512);
    const g = x.createLinearGradient(0, 0, 0, 512);
    g.addColorStop(0, '#2f78cf'); g.addColorStop(.45, '#5fa6e6'); g.addColorStop(.74, '#a8d2f0'); g.addColorStop(.9, '#f6e9b8'); g.addColorStop(1, '#ffd98a');
    x.fillStyle = g; x.fillRect(0, 0, 16, 512);
    scene.background = tex(c);
  })();
  // far scenery: the bay, the white skyline across the water, a rainbow and clouds
  const backdrop = new THREE.Group(); scene.add(backdrop);
  function seaTex() {
    const [c, x] = cv2d(256, 256); x.fillStyle = '#4a90cf'; x.fillRect(0, 0, 256, 256);
    x.fillStyle = 'rgba(255,255,255,.35)'; for (let i = 0; i < 70; i++) x.fillRect((i * 73) % 256, (i * 41) % 256, 10 + (i % 4) * 4, 2);
    x.fillStyle = 'rgba(20,60,120,.18)'; for (let i = 0; i < 50; i++) x.fillRect((i * 29) % 256, (i * 97) % 256, 16, 3);
    const t = tex(c, true); t.repeat.set(60, 18); return t;
  }
  const bay = new THREE.Mesh(new THREE.PlaneGeometry(40000, 12000), new THREE.MeshLambertMaterial({ map: seaTex() }));
  bay.rotation.x = -Math.PI / 2; bay.position.set(1000, -3, -6300); backdrop.add(bay);
  // the rest of the city behind the row of seven: white towers, as in the cabinet (one instanced draw)
  (function townBehind() {
    const [c, x] = cv2d(64, 128); x.fillStyle = '#eef2f7'; x.fillRect(0, 0, 64, 128);
    x.fillStyle = 'rgba(110,130,160,.4)'; for (let y = 6; y < 128; y += 10) for (let k = 5; k < 64; k += 10) x.fillRect(k, y, 5, 6);
    const t = tex(c, true);
    const n = 220, geo = new THREE.BoxGeometry(1, 1, 1); geo.translate(0, .5, 0);
    const towers = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ map: t }), n);
    const m = new THREE.Matrix4(), col = new THREE.Color();
    let seed = 7; const R = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    for (let i = 0; i < n; i++) {
      const z = -DEPTH / 2 - 420 - R() * 2600, far = (-z - 460) / 2600, w = 50 + R() * 80, h = 50 + R() * (150 + far * 260) * (R() < .12 ? 1.8 : 1);
      m.makeScale(w, h, 50 + R() * 80); m.setPosition(-900 + R() * 3800, 0, z); towers.setMatrixAt(i, m);
      towers.setColorAt(i, col.setHSL(.6, .18, .8 + R() * .12));
    }
    backdrop.add(towers);
  })();
  function rainbowTex() {
    const [c, x] = cv2d(512, 256);
    ['#ff5a5a', '#ffa53a', '#ffe14a', '#59d36a', '#4aa8ff', '#7a5cff'].forEach((col, i) => {
      x.strokeStyle = col; x.globalAlpha = .55; x.lineWidth = 12; x.beginPath(); x.arc(256, 256, 230 - i * 12, Math.PI, 0); x.stroke();
    });
    return tex(c);
  }
  const rainbow = new THREE.Mesh(new THREE.PlaneGeometry(5200, 2600), new THREE.MeshBasicMaterial({ map: rainbowTex(), transparent: true, opacity: .45, depthWrite: false, fog: false }));
  rainbow.position.set(1700, 0, -5200); backdrop.add(rainbow);
  function cloudTex() {
    const [c, x] = cv2d(256, 128);
    x.fillStyle = '#fff';
    [[70, 76, 40], [118, 58, 46], [168, 74, 40], [118, 84, 40], [40, 90, 26], [210, 92, 24]].forEach(p => { x.beginPath(); x.arc(p[0], p[1], p[2], 0, Math.PI * 2); x.fill(); });
    x.fillStyle = 'rgba(170,195,225,.45)'; x.fillRect(20, 104, 216, 10);
    return tex(c);
  }
  const cloudMat = new THREE.SpriteMaterial({ map: cloudTex(), transparent: true, depthWrite: false, fog: false });
  [[-200, 900, -2600], [600, 1300, -3000], [1400, 1000, -2800], [2100, 1500, -3200], [300, 1900, -3400], [1800, 2300, -3600], [900, 600, -2400], [2600, 800, -2700]].forEach(p => {
    const s = new THREE.Sprite(cloudMat); s.position.set(p[0], p[1], p[2]); s.scale.set(520, 260, 1); backdrop.add(s);
  });
  let skyline = null, shops = null;
  function buildBackdropStrips() {
    const st = api.strips();
    if (!st) return;
    if (skyline) { backdrop.remove(skyline); skyline.material.map.dispose(); }
    if (shops) { backdrop.remove(shops); shops.material.map.dispose(); }
    // the white skyline across the bay: 5 copies of the 2D strip, kept at its own proportions
    const ft = tex(st.far.c, true); ft.repeat.set(5, 1);
    const SW = 18000, SH = SW / 5 * st.far.h / st.far.w;
    skyline = new THREE.Mesh(new THREE.PlaneGeometry(SW, SH), new THREE.MeshBasicMaterial({ map: ft, transparent: true, depthWrite: false, fog: false }));
    skyline.position.set(1000, SH / 2 - 30, -5200); backdrop.add(skyline);
    const mt = tex(st.mid.c, true); mt.repeat.set(5, 1);
    shops = new THREE.Mesh(new THREE.PlaneGeometry(900 * 5 * 1.4, 84 * 1.9), new THREE.MeshLambertMaterial({ map: mt, transparent: true }));
    shops.position.set(900, 84 * 1.9 / 2, -DEPTH / 2 - 150); backdrop.add(shops);
  }

  // ── Shared textures ──
  function brickTex(c1, c2, withWindows) {
    const [c, x] = cv2d(128, 256);
    x.fillStyle = c1; x.fillRect(0, 0, 128, 256);
    x.fillStyle = 'rgba(255,225,200,.22)';
    for (let y = 0; y < 256; y += 8) { x.fillRect(0, y, 128, 1.4); for (let k = (y / 8) % 2 ? 0 : 12; k < 128; k += 24) x.fillRect(k, y, 1.4, 8); }
    x.fillStyle = 'rgba(60,15,0,.12)'; for (let i = 0; i < 60; i++) x.fillRect((i * 53) % 128, (i * 97) % 256, 9, 5);
    if (withWindows) {
      for (let y = 18; y < 256; y += 52) for (let k = 14; k < 128; k += 34) {
        x.fillStyle = '#d9cfc2'; x.fillRect(k - 4, y - 5, 30, 5); x.fillRect(k - 3, y + 30, 28, 5);
        x.fillStyle = '#efe8dc'; x.fillRect(k - 2, y - 2, 26, 34);
        x.fillStyle = '#8fb4c9'; x.fillRect(k, y, 22, 30);
        x.fillStyle = 'rgba(255,255,255,.3)'; x.fillRect(k + 2, y + 2, 5, 26);
        x.fillStyle = '#efe8dc'; x.fillRect(k, y + 14, 22, 2); x.fillRect(k + 10, y, 2, 30);
      }
    }
    return tex(c, true);
  }
  function roofTex() {
    const [c, x] = cv2d(128, 128);
    x.fillStyle = '#9d9aa2'; x.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 700; i++) { x.fillStyle = i % 3 ? 'rgba(60,55,70,.25)' : 'rgba(255,255,255,.25)'; x.fillRect((i * 37) % 128, (i * 61 + (i >> 3)) % 128, 2, 2); }
    return tex(c, true);
  }
  function stripeTex(a, b, n, diag) {
    const [c, x] = cv2d(128, 64);
    x.fillStyle = b; x.fillRect(0, 0, 128, 64);
    x.fillStyle = a;
    for (let i = -n; i < n * 2; i++) {
      const w = 128 / n;
      if (diag) { x.beginPath(); x.moveTo(i * w, 64); x.lineTo(i * w + w / 2, 64); x.lineTo(i * w + w, 0); x.lineTo(i * w + w / 2, 0); x.closePath(); x.fill(); }
      else if (i % 2 === 0) x.fillRect(i * w, 0, w, 64);
    }
    return tex(c, true);
  }
  const T = {
    roof: roofTex(),
    sideA: brickTex('#a4563c', '#7e3f2b', true), sideB: brickTex('#94503a', '#6e3a29', true),
    chim: brickTex('#a04a33', '#7a3a28', false),
    awnRed: stripeTex('#e5263f', '#fff3e0', 8), awnBlue: stripeTex('#2f7dff', '#fff3e0', 8), awnGreen: stripeTex('#22a866', '#fff3e0', 8),
    barrel: stripeTex('#e5263f', '#fff6ea', 6, true)
  };
  T.roof.repeat.set(2, 2);
  T.barrel.repeat.set(2, 1);

  const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const cyl = (r0, r1, h, n) => new THREE.CylinderGeometry(r0, r1, h, n || 12);

  // ── The city: rebuilt whenever the page builds a new one ──
  let city = null, built = null, facades = [], dyn = { ants: [], lamps: [], cans: [], cars: [], bills: [], acs: [], tanks: [], solars: [], awns: [], pads: [] };
  function facadeTexture(b) {
    const s = 2, [c, x] = cv2d(b.w * s, b.h * s);
    api.paintFacade(b, x, s);
    const t = tex(c); return { t, c, x, s };
  }
  function brokenKey(b) { let n = 0; b.wins.forEach(w => { if (w.broken) n++; }); return n + '/' + b.cracks.length + '/' + b.val; }
  function buildCity(st) {
    if (city) { scene.remove(city); city.traverse(o => { if (o.geometry) o.geometry.dispose(); }); facades.forEach(f => f.t.dispose()); }
    city = new THREE.Group(); scene.add(city); facades = [];
    dyn = { ants: [], lamps: [], cans: [], cars: [], bills: [], acs: [], tanks: [], solars: [], awns: [], pads: [] };
    built = st.B;
    const parapetMat = lam('#bdb5aa'), corniceMat = lam('#cfc8be'), ink = lam('#2a2430'), roofMat = new THREE.MeshLambertMaterial({ map: T.roof });
    st.B.forEach((b, i) => {
      const f = facadeTexture(b); f.key = brokenKey(b); f.b = b; facades.push(f);
      const side = i % 2 ? T.sideB : T.sideA;
      const sideT = side.clone(); sideT.needsUpdate = true; sideT.repeat.set(DEPTH / 64, b.h / 128);
      const sideMat = new THREE.MeshLambertMaterial({ map: sideT });
      const front = new THREE.MeshLambertMaterial({ map: f.t });
      const body = new THREE.Mesh(box(b.w, b.h, DEPTH), [sideMat, sideMat, roofMat, sideMat, front, sideMat]);
      body.position.set(b.x0 + b.w / 2, b.h / 2, 0); city.add(body);
      // cornice slab, then the parapet curbs (the jackpot roof has none)
      const cor = new THREE.Mesh(box(b.w + 6, 8, DEPTH + 6), corniceMat); cor.position.set(b.x0 + b.w / 2, b.h - 3, 0); city.add(cor);
      const par = [];
      par.push(at(box(6, 5, DEPTH), b.x0 + 3, b.h + 2.5, 0), at(box(6, 5, DEPTH), b.x1 - 3, b.h + 2.5, 0));
      par.push(at(box(b.w, 5, 4), b.x0 + b.w / 2, b.h + 2.5, DEPTH / 2 - 2), at(box(b.w, 5, 4), b.x0 + b.w / 2, b.h + 2.5, -DEPTH / 2 + 2));
      const parM = new THREE.Mesh(merge(par), parapetMat); city.add(parM); b._par3 = parM;
      // the fire escape's landings stick out of the facade
      if (b.fe) {
        const fx = b.fe < 0 ? b.x0 + 12 : b.x1 - 12, parts = [];
        for (let py = b.y0 + 64; py < -50; py += 52) {
          parts.push(at(box(20, 1.6, 9), fx, -py, DEPTH / 2 + 4.5));
          parts.push(at(box(20, 1, 1), fx, -py + 8, DEPTH / 2 + 9));
          for (let k = -9; k <= 9; k += 6) parts.push(at(box(.8, 8, .8), fx + k, -py + 4, DEPTH / 2 + 9));
        }
        if (parts.length) city.add(new THREE.Mesh(merge(parts), ink));
      }
      // street-level awning on the left wall (the bouncy one)
      if (b.awn) {
        const a = b.awn, aw = a.x1 - a.x0, tm = a.col[0] === '#2f7dff' ? T.awnBlue : a.col[0] === '#22a866' ? T.awnGreen : T.awnRed;
        const m = new THREE.Mesh(box(aw + 2, 2, DEPTH * .55), new THREE.MeshLambertMaterial({ map: tm }));
        const grp = new THREE.Group(); grp.position.set(a.x1, -a.y0 + 2, 0); m.position.set(-aw / 2, 0, 0); grp.add(m); grp.rotation.z = .28; city.add(grp);
        dyn.awns.push({ a, grp });
      }
      b.props.forEach(p => addProp(p, b));
      // the bullseye pad and its ring of bulbs (moved when the jackpot moves)
      const pad = new THREE.Group(); pad.visible = false;
      const pt = (() => { const [c, x] = cv2d(256, 256); [[1, '#e5263f'], [.78, '#fff6ea'], [.56, '#e5263f'], [.34, '#fff6ea'], [.16, '#e5263f']].forEach(r => { x.fillStyle = r[1]; x.beginPath(); x.arc(128, 128, 124 * r[0], 0, Math.PI * 2); x.fill(); }); return tex(c); })();
      const disc = new THREE.Mesh(new THREE.CircleGeometry(1, 40), new THREE.MeshLambertMaterial({ map: pt, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }));
      disc.rotation.x = -Math.PI / 2; disc.scale.set(b.hw, b.hw, 1); pad.add(disc);
      const bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(1.6, 6, 4), new THREE.MeshBasicMaterial({ color: 0xffffff }), 16);
      for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2; bulbs.setMatrixAt(k, new THREE.Matrix4().makeTranslation(Math.cos(a) * (b.hw + 4), 1, Math.sin(a) * (b.hw + 4))); bulbs.setColorAt(k, new THREE.Color(0xffd36a)); }
      pad.add(bulbs); pad.position.set(b.padX, b.h + 1, 0); city.add(pad);
      dyn.pads.push({ b, pad, bulbs });
    });
    // TV antennas and dishes (they bend)
    st.ants.forEach(a => {
      const grp = new THREE.Group(); grp.position.set(a.x, -a.y, 0); city.add(grp);
      const mast = new THREE.Group(); grp.add(mast);
      if (a.dish) {
        const post = new THREE.Mesh(cyl(1, 1.2, a.h, 6), ink); post.position.y = a.h / 2; mast.add(post);
        const dish = new THREE.Mesh(new THREE.SphereGeometry(11, 14, 6, 0, Math.PI * 2, 0, 0.9), new THREE.MeshLambertMaterial({ color: '#e4e6ec', side: THREE.DoubleSide }));
        dish.position.y = a.h; dish.rotation.z = -.7 * a.face + Math.PI; dish.scale.y = .5; mast.add(dish);
      } else {
        const post = new THREE.Mesh(cyl(.9, 1.1, a.h, 6), ink); post.position.y = a.h / 2; mast.add(post);
        [[.55, 24], [.72, 18], [.88, 12]].forEach(cb => { const bar = new THREE.Mesh(box(cb[1], 1.2, 1.2), ink); bar.position.y = a.h * cb[0]; mast.add(bar); const bar2 = bar.clone(); bar2.rotation.y = Math.PI / 2; mast.add(bar2); });
        const tip = new THREE.Mesh(new THREE.SphereGeometry(2, 6, 4), basic('#ff5a5a')); tip.position.y = a.h; mast.add(tip); a._tip3 = tip;
      }
      dyn.ants.push({ a, mast });
    });
    // street lamps: on the open street and in the gaps they stand where Willy can hit them (z 0), in front of buildings out by the kerb
    st.lamps.forEach(l => {
      const z = overBuilding(st, l.x - 4, l.x + 20) ? STREET_Z : 0;
      const grp = new THREE.Group(); grp.position.set(l.x, 0, z); city.add(grp);
      const pole = new THREE.Mesh(cyl(1.6, 2, 84, 8), lam('#3a3150')); pole.position.y = 42; grp.add(pole);
      const arm = new THREE.Mesh(box(14, 2, 2), lam('#3a3150')); arm.position.set(6, 86, 0); grp.add(arm);
      const head = new THREE.Mesh(box(12, 4, 8), lam('#3a3150')); head.position.set(12, 84, 0); grp.add(head);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(3.6, 10, 6), basic('#fff1b8')); bulb.position.set(12, 80.5, 0); grp.add(bulb);
      dyn.lamps.push({ l, grp, bulb });
    });
    st.cars.forEach(car => {
      const z = overBuilding(st, car.x, car.x + 60) ? STREET_Z + 14 : 0;
      const grp = new THREE.Group(); grp.position.set(car.x + 30, 0, z); city.add(grp);
      const paint = lam(car.c);
      const bodyM = new THREE.Mesh(box(60, 13, 28), paint); bodyM.position.y = 14.5; grp.add(bodyM);
      const cab = new THREE.Mesh(box(30, 11, 24), paint); cab.position.y = 26; grp.add(cab);
      const glass = new THREE.Mesh(box(31, 8, 25), lam('#bfe3ff')); glass.position.y = 26.5; grp.add(glass);
      const wheelG = cyl(6.5, 6.5, 4, 12); wheelG.rotateX(Math.PI / 2);
      [[-16, 12], [16, 12], [-16, -12], [16, -12]].forEach(w => { const wh = new THREE.Mesh(wheelG, lam('#2b1e3f')); wh.position.set(w[0], 6.5, w[1]); grp.add(wh); });
      dyn.cars.push({ car, grp, cab, glass });
    });
    st.cans.forEach(can => {
      const z = overBuilding(st, can.x, can.x + 15) ? STREET_Z : 0;
      const grp = new THREE.Group(); grp.position.set(can.x + 7.5, 0, z); city.add(grp);
      const body = new THREE.Mesh(cyl(7, 6, 20, 10), lam('#7d8aa0')); body.position.y = 10; grp.add(body);
      const lid = new THREE.Mesh(cyl(8.5, 8.5, 3, 10), lam('#9aa6bc')); lid.position.y = 21.5; grp.add(lid);
      dyn.cans.push({ can, grp, lid });
    });
    // the street, the pavement, the cannon's grass, and the water past the pier
    const sea = st.SEA_X;
    const road = new THREE.Mesh(new THREE.PlaneGeometry(sea + 3000, 900), lam('#5c5966')); road.rotation.x = -Math.PI / 2; road.position.set((sea - 3000) / 2, 0, 0); city.add(road);
    const pave = new THREE.Mesh(new THREE.PlaneGeometry(sea + 3000, 22), new THREE.MeshLambertMaterial({ color: '#cfc9cf', polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })); pave.rotation.x = -Math.PI / 2; pave.position.set((sea - 3000) / 2, .4, DEPTH / 2 + 11); city.add(pave);
    const lines = []; for (let x = -400; x < sea - 30; x += 60) lines.push(at(new THREE.PlaneGeometry(30, 3).rotateX(-Math.PI / 2), x + 15, .5, DEPTH / 2 + 70));
    city.add(new THREE.Mesh(merge(lines), new THREE.MeshBasicMaterial({ color: '#fff1b0', polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })));
    const grass = new THREE.Mesh(new THREE.PlaneGeometry(3000 + 150, 900), new THREE.MeshLambertMaterial({ color: '#5fbf4a', polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 })); grass.rotation.x = -Math.PI / 2; grass.position.set((150 - 3000) / 2, .6, 0); city.add(grass);
    const water = new THREE.Mesh(new THREE.PlaneGeometry(6000, 900), lam('#3d86c8')); water.rotation.x = -Math.PI / 2; water.position.set(sea + 3000, -6, 0); city.add(water);
    const pier = new THREE.Mesh(box(8, 46, 900), lam('#6b4a3a')); pier.position.set(sea - 2, -18, 0); city.add(pier);
    buildBackdropStrips();
  }
  function overBuilding(st, x0, x1) { return st.B.some(b => x1 > b.x0 - 4 && x0 < b.x1 + 4); }
  function addProp(p, b) {
    const ink = lam('#2a2430');
    if (p.k === 'chim') {
      const m = new THREE.Mesh(box(p.x1 - p.x0, p.y1 - p.y0 - 3, 14), new THREE.MeshLambertMaterial({ map: T.chim }));
      m.position.set((p.x0 + p.x1) / 2, -(p.y0 + p.y1) / 2 - 1.5, -8); city.add(m);
      const cap = new THREE.Mesh(box(p.x1 - p.x0 + 4, 4, 18), lam('#bdb5aa')); cap.position.set((p.x0 + p.x1) / 2, -p.y0 - 2, -8); city.add(cap);
    } else if (p.k === 'solar') {
      const grp = new THREE.Group(); grp.position.set((p.x0 + p.x1) / 2, -p.y1 + 6, 0); grp.rotation.z = .22 * p.tilt; city.add(grp);
      const panel = new THREE.Mesh(box(30, 2, 26), lam('#2b4f9e')); grp.add(panel);
      const grid = new THREE.Mesh(box(30.4, .4, 26.4), new THREE.MeshBasicMaterial({ color: '#b4d7ff', wireframe: true })); grid.position.y = 1.2; grp.add(grid);
      const legs = new THREE.Mesh(merge([at(box(1.4, 8, 1.4), -11, -4, -10), at(box(1.4, 8, 1.4), 11, -4, -10), at(box(1.4, 8, 1.4), -11, -4, 10), at(box(1.4, 8, 1.4), 11, -4, 10)]), ink); grp.add(legs);
      dyn.solars.push({ p, grp, panel });
    } else if (p.k === 'ac') {
      const grp = new THREE.Group(); grp.position.set((p.x0 + p.x1) / 2, -(p.y0 + p.y1) / 2, 6); city.add(grp);
      const m = new THREE.Mesh(box(p.x1 - p.x0, p.y1 - p.y0, 20), lam('#d8d6de')); grp.add(m);
      const fan = new THREE.Mesh(new THREE.CircleGeometry(4, 12), lam('#8a84a0')); fan.position.set(0, 0, 10.1); grp.add(fan);
      dyn.acs.push({ p, grp });
    } else if (p.k === 'tank') {
      const grp = new THREE.Group(); grp.position.set((p.x0 + p.x1) / 2, -p.y1 - 20, 0); city.add(grp);
      const legs = []; [[-12, -12], [12, -12], [-12, 12], [12, 12]].forEach(l => legs.push(at(cyl(1.3, 1.3, 20, 6), l[0], 10, l[1])));
      grp.add(new THREE.Mesh(merge(legs), lam('#4a3328')));
      const tank = new THREE.Mesh(cyl(16, 16, 30, 16), lam('#b5764a')); tank.position.y = 35; grp.add(tank);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(19, 15, 16), lam('#8a5236')); roof.position.y = 57.5; grp.add(roof);
      const hoops = new THREE.Mesh(merge([at(cyl(16.4, 16.4, 2, 16), 0, 28, 0), at(cyl(16.4, 16.4, 2, 16), 0, 42, 0)]), lam('#3a3a48')); grp.add(hoops);
      dyn.tanks.push({ p, grp });
    } else if (p.k === 'bill') {
      const bw = p.x1 - p.x0, bh = p.y1 - p.y0;
      const legs = new THREE.Mesh(merge([at(box(2, 18, 2), p.x0 + 8, -p.y1 - 9 + 18, 0), at(box(2, 18, 2), p.x1 - 8, -p.y1 - 9 + 18, 0)]), lam('#3a3a48'));
      legs.position.y = -18; city.add(legs);
      const grp = new THREE.Group(); grp.position.set((p.x0 + p.x1) / 2, -p.y1 - 18, 0); city.add(grp);
      const [c, x] = cv2d(bw * 4, bh * 4); x.fillStyle = p.ad[1]; x.fillRect(0, 0, c.width, c.height); x.fillStyle = 'rgba(255,255,255,.18)'; x.fillRect(8, 8, c.width - 16, 16);
      x.fillStyle = p.ad[2]; x.font = '400 ' + Math.min(52, c.width / (p.ad[0].length * .6)) + 'px ' + C.FONT; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(p.ad[0], c.width / 2, c.height / 2);
      const board = new THREE.Mesh(box(bw, bh, 3), [lam('#3a3a48'), lam('#3a3a48'), lam('#3a3a48'), lam('#3a3a48'), new THREE.MeshLambertMaterial({ map: tex(c) }), lam('#3a3a48')]);
      board.position.y = 18 + bh / 2; grp.add(board);
      dyn.bills.push({ p, grp });
    }
  }

  // ── Willy: rounded limbs on the 11 ragdoll points, in his colours ──
  const W3 = new THREE.Group(); scene.add(W3);
  const unitCyl = cyl(1, 1, 1, 10), unitSph = new THREE.SphereGeometry(1, 14, 10);
  const COL = { suit: '#f3f5fa', suit2: '#cdd3de', slv: '#2c52c0', slv2: '#213f98', glv: '#da2b2b', boot: '#f2642f', skin: '#ffcf9f', hair: '#8f5b2c', blue: '#2a56c6', red: '#e5263f', gold: '#ffc22e' };
  function sleeveTex(base) {
    const [c, x] = cv2d(128, 64); x.fillStyle = base; x.fillRect(0, 0, 128, 64);
    x.fillStyle = '#fff'; for (let i = 0; i < 4; i++) { starPath(x, 16 + i * 32, 18 + (i % 2) * 26, 8); x.fill(); }
    return tex(c, true);
  }
  function torsoTex() {
    // wraps around the torso cylinder; u = 0.5 faces the camera
    // (the canvas top is the hip end of the torso, the bottom the collar)
    const [c, x] = cv2d(256, 128); x.fillStyle = COL.suit; x.fillRect(0, 0, 256, 128);
    x.fillStyle = 'rgba(80,90,110,.5)'; x.fillRect(127, 16, 2, 112);
    x.fillStyle = COL.red; starPath(x, 150, 86, 22); x.fill(); x.strokeStyle = '#2b1e3f'; x.lineWidth = 3; x.stroke();
    x.fillStyle = COL.blue; x.fillRect(0, 0, 256, 22); x.fillRect(0, 118, 256, 10);
    x.fillStyle = '#fff'; for (let k = 6; k < 256; k += 24) { starPath(x, k, 11, 5); x.fill(); }
    x.fillStyle = COL.gold; x.beginPath(); x.ellipse(128, 11, 14, 11, 0, 0, Math.PI * 2); x.fill(); x.strokeStyle = '#2b1e3f'; x.lineWidth = 2; x.stroke();
    return tex(c);
  }
  function helmetTex() {
    const [c, x] = cv2d(256, 128); x.fillStyle = '#eef1f6'; x.fillRect(0, 0, 256, 128);
    x.fillStyle = COL.blue; x.fillRect(0, 0, 256, 128); x.fillStyle = '#eef1f6'; x.fillRect(0, 0, 100, 128); x.fillRect(156, 0, 100, 128);
    x.fillStyle = COL.red; x.fillRect(96, 0, 6, 128); x.fillRect(154, 0, 6, 128);
    x.fillStyle = '#fff'; for (let k = 0; k < 4; k++) { starPath(x, 128, 20 + k * 26, 7); x.fill(); }
    x.fillStyle = COL.red; starPath(x, 40, 70, 14); x.fill(); starPath(x, 216, 70, 14); x.fill();
    return tex(c);
  }
  const M = {
    suit: lam(COL.suit), suit2: lam(COL.suit2), skin: lam(COL.skin), hair: lam(COL.hair), glove: lam(COL.glv), glove2: lam('#b8262a'), boot: lam(COL.boot), boot2: lam('#cf5226'),
    slv: new THREE.MeshLambertMaterial({ map: sleeveTex(COL.slv) }), slv2: new THREE.MeshLambertMaterial({ map: sleeveTex(COL.slv2) }),
    torso: new THREE.MeshLambertMaterial({ map: torsoTex() }), helmet: new THREE.MeshLambertMaterial({ map: helmetTex() }),
    lens: new THREE.MeshLambertMaterial({ color: '#3d8fd0', emissive: '#103050' }), frame: lam('#c9cfd9'), nose: lam('#ffb987'), mouth: lam('#7a1020'), teeth: lam('#ffffff'), star: lam('#ffd84a')
  };
  function mesh(geo, mat, parent) { const m = new THREE.Mesh(geo, mat); (parent || W3).add(m); return m; }
  // limb pieces: [from point, to point, radius, material, z]
  const LIMBS = [
    [C.PEL, C.LK, 2.6, M.suit2, -3.5], [C.LK, C.LF, 2.4, M.suit2, -3.5], [C.NECK, C.LE, 2.1, M.slv2, -4], [C.LE, C.LH, 1.9, M.slv2, -4],
    [C.PEL, C.RK, 2.6, M.suit, 3.5], [C.RK, C.RF, 2.4, M.suit, 3.5], [C.NECK, C.RE, 2.1, M.slv, 4], [C.RE, C.RH, 1.9, M.slv, 4]
  ];
  const limbMeshes = LIMBS.map(L => ({ L, m: mesh(unitCyl, L[3]), j: mesh(unitSph, L[3]) }));
  // torso: a tapered cylinder, +y towards the hips (narrow) and the broad end at the shoulders; u = 0.5 faces the camera
  const torso = mesh(new THREE.CylinderGeometry(.8, 1, 1, 16, 1, false, -Math.PI, Math.PI * 2), M.torso);
  const hips = mesh(unitSph, M.suit), shoulders = mesh(unitSph, M.torso);
  const gloves = [mesh(unitSph, M.glove2), mesh(unitSph, M.glove)], cuffs = [mesh(new THREE.ConeGeometry(1, 1, 10, 1, true), M.glove2), mesh(new THREE.ConeGeometry(1, 1, 10, 1, true), M.glove)];
  const boots = [mesh(unitSph, M.boot2), mesh(unitSph, M.boot)];
  const hairBits = [0, 1, 2, 3].map(() => mesh(unitSph, M.hair));
  // the head: a group that faces +x (flipped by scale.x when he faces left)
  const head = new THREE.Group(); W3.add(head);
  const HR = 7.4;
  mesh(unitSph, M.skin, head).scale.set(HR, HR, HR);
  const jaw = mesh(unitSph, M.skin, head); jaw.scale.set(HR * .66, HR * .5, HR * .72); jaw.position.set(HR * .32, -HR * .62, 0);
  const nose = mesh(unitSph, M.nose, head); nose.scale.set(HR * .56, HR * .34, HR * .36); nose.position.set(HR * 1.06, -HR * .32, 0); nose.rotation.z = -.45;
  const mouth = mesh(unitSph, M.mouth, head); mouth.scale.set(HR * .5, HR * .3, HR * .5); mouth.position.set(HR * .55, -HR * .72, 0);
  const teeth = mesh(box(1, 1, 1), M.teeth, head); teeth.scale.set(HR * .7, HR * .18, HR * .62); teeth.position.set(HR * .62, -HR * .62, 0);
  const helmet = mesh(new THREE.SphereGeometry(1, 18, 10, 0, Math.PI * 2, 0, Math.PI * .56), M.helmet, head); helmet.scale.set(HR * 1.08, HR * 1.08, HR * 1.08); helmet.rotation.z = .15;
  const backHair = mesh(unitSph, M.hair, head); backHair.scale.set(HR * .6, HR * .95, HR * .85); backHair.position.set(-HR * .55, -HR * .4, 0);
  const lens = mesh(new THREE.CylinderGeometry(1, 1, 1, 18), M.lens, head); lens.rotation.z = Math.PI / 2; lens.scale.set(HR * .42, HR * .3, HR * .62); lens.position.set(HR * .86, HR * .02, 0);
  const frame = mesh(new THREE.TorusGeometry(1, .16, 6, 18), M.frame, head); frame.rotation.y = Math.PI / 2; frame.scale.set(HR * .62, HR * .46, HR * .62); frame.position.set(HR * 1.0, HR * .02, 0);
  const strap = mesh(new THREE.TorusGeometry(HR * 1.02, HR * .1, 6, 20), lam('#2b1e3f'), head); strap.rotation.y = Math.PI / 2; strap.rotation.x = Math.PI / 2; strap.position.y = HR * .02;
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(1, 20), new THREE.MeshBasicMaterial({ color: 0x1a1020, transparent: true, opacity: .28, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.material.polygonOffset = true; shadow.material.polygonOffsetFactor = -6; shadow.material.polygonOffsetUnits = -6; scene.add(shadow);
  const _v = new THREE.Vector3(), _a = new THREE.Vector3(), _b = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0), _q = new THREE.Quaternion();
  function seg(m, ax, ay, az, bx, by, bz, r) {
    _a.set(ax, ay, az); _b.set(bx, by, bz); _v.subVectors(_b, _a); const len = _v.length() || .001;
    m.position.copy(_a).addScaledVector(_v, .5); _q.setFromUnitVectors(_up, _v.multiplyScalar(1 / len)); m.quaternion.copy(_q); m.scale.set(r, len, r);
  }
  function placeHead(hx, hy, ang, face, mood, s) {
    head.position.set(hx, hy, 0); head.rotation.set(0, 0, -ang); head.scale.set(face * s, s, s);
    const open = mood === 'yell' ? 1.4 : mood === 'splat' ? .5 : 1;
    mouth.scale.y = HR * .3 * open; teeth.visible = mood !== 'splat' && mood !== 'dizzy';
  }
  function drawWilly(R) {
    const P = R.P, s = C.WS, p = i => P[i];
    W3.visible = true;
    limbMeshes.forEach(o => {
      const a = p(o.L[0]), b = p(o.L[1]), r = o.L[2] * s, z = o.L[4];
      seg(o.m, a.x, -a.y, z, b.x, -b.y, z, r);
      o.j.position.set(b.x, -b.y, z); o.j.scale.set(r, r, r);
    });
    const n = p(C.NECK), pl = p(C.PEL), h = p(C.HEAD);
    seg(torso, n.x, -n.y + 2 * s, 0, pl.x, -pl.y - 2 * s, 0, 5.4 * s);
    hips.position.set(pl.x, -pl.y, 0); hips.scale.set(4.6 * s, 4 * s, 4.8 * s);
    shoulders.position.set(n.x, -n.y, 0); shoulders.scale.set(5.6 * s, 3.4 * s, 5.4 * s);
    [[C.LE, C.LH, -4], [C.RE, C.RH, 4]].forEach((L, k) => {
      const e = p(L[0]), hd = p(L[1]);
      gloves[k].position.set(hd.x, -hd.y, L[2]); gloves[k].scale.set(3.3 * s, 3.3 * s, 3.3 * s);
      seg(cuffs[k], lerp(e.x, hd.x, .45), -lerp(e.y, hd.y, .45), L[2], hd.x, -hd.y, L[2], 3.1 * s);
    });
    [[C.LK, C.LF, -3.5], [C.RK, C.RF, 3.5]].forEach((L, k) => {
      const kn = p(L[0]), f = p(L[1]), dx = f.x - kn.x, dy = f.y - kn.y, l = Math.hypot(dx, dy) || 1;
      boots[k].position.set(f.x + dx / l * 1.5, -(f.y + dy / l * 1.5), L[2]); boots[k].scale.set(5 * s, 3.6 * s, 3.6 * s);
      boots[k].rotation.z = -Math.atan2(dy, dx);
    });
    R.sc.forEach((q, i) => { const m = hairBits[i]; if (!m) return; m.position.set(q.x, -q.y, -1); const r = (3.6 - i * .5) * s; m.scale.set(r, r, r); });
    const ang = Math.atan2(h.y - n.y, h.x - n.x) + Math.PI / 2;
    placeHead(h.x, -h.y, ang, R.face, R.mood, s);
  }

  // ── The cannon: candy-striped barrel on a blue carriage with big spoked wheels ──
  const cannon = new THREE.Group(); scene.add(cannon);
  const pivot = new THREE.Group(); cannon.add(pivot);
  const barrel = new THREE.Group(); pivot.add(barrel);
  {
    const blue = lam('#2c52c0'), white = lam('#ffffff');
    const bg = new THREE.CylinderGeometry(15, 13, C.BARREL + 6, 20, 1, true); bg.rotateZ(-Math.PI / 2);
    const tube = new THREE.Mesh(bg, new THREE.MeshLambertMaterial({ map: T.barrel, side: THREE.DoubleSide })); tube.position.x = (C.BARREL + 6) / 2 - 14; barrel.add(tube);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(19, 19, 14, 20).rotateZ(-Math.PI / 2), blue); band.position.x = C.BARREL - 6; barrel.add(band);
    const breech = new THREE.Mesh(new THREE.SphereGeometry(15, 16, 12), blue); breech.position.x = -14; barrel.add(breech);
    const starsG = []; for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; starsG.push(at(new THREE.SphereGeometry(2.4, 6, 4), C.BARREL - 6, Math.cos(a) * 19, Math.sin(a) * 19)); }
    barrel.add(new THREE.Mesh(merge(starsG), white));
    // carriage and wheels (either side of the barrel)
    const trail = new THREE.Mesh(box(60, 8, 22), blue); trail.position.set(-24, -16, 0); trail.rotation.z = .42; cannon.add(trail);
    const spokes = []; for (let k = 0; k < 12; k++) spokes.push(at(box(2.4, 40, 1.6), 0, 0, 0, k / 12 * Math.PI));
    const spokeG = merge(spokes);
    [-22, 22].forEach(z => {
      const w = new THREE.Group(); w.position.set(0, 2, z); cannon.add(w);
      w.add(new THREE.Mesh(new THREE.TorusGeometry(22.5, 3, 8, 28), blue));
      const disc = new THREE.Mesh(new THREE.CircleGeometry(20, 24), white); disc.position.z = z > 0 ? -.4 : .4; if (z < 0) disc.rotation.y = Math.PI; w.add(disc);
      w.add(new THREE.Mesh(spokeG, blue));
      const hub = new THREE.Mesh(cyl(6, 6, 8, 12).rotateX(Math.PI / 2), blue); w.add(hub);
    });
  }
  const peek = new THREE.Group(); barrel.add(peek);   // Willy's head poking out while aiming

  // ── Birds ──
  const birdGeo = merge([at(new THREE.SphereGeometry(5.5, 8, 6).scale(1, .75, .8), 0, 4, 0), at(new THREE.SphereGeometry(3, 8, 6), 5, 8, 0)]);
  const birdMat = lam('#9b97b4');
  let birds = null, birdsFor = null, flockFor = null;
  function syncBirds(st) {
    if (birdsFor === st.pigeons && flockFor === st.flock) return;
    if (birds) { scene.remove(birds); birds.dispose(); }
    birdsFor = st.pigeons; flockFor = st.flock;
    birds = new THREE.InstancedMesh(birdGeo, birdMat, Math.max(1, st.pigeons.length + st.flock.length)); birds.frustumCulled = false; scene.add(birds);
  }
  const _m = new THREE.Matrix4(), _s = new THREE.Vector3(), _p = new THREE.Vector3(), _e = new THREE.Euler();
  function updateBirds(st) {
    syncBirds(st);
    let k = 0;
    const put = (x, y, z, f, flap) => { _e.set(0, f < 0 ? Math.PI : 0, flap ? Math.sin(st.t * 26) * .3 : 0); _q.setFromEuler(_e); _p.set(x, -y, z); _s.set(1, 1, 1); _m.compose(_p, _q, _s); birds.setMatrixAt(k++, _m); };
    st.pigeons.forEach(b => put(b.x, b.y, DEPTH * .3, b.f, b.st));
    st.flock.forEach(f => { if (!f.hit) put(f.x, f.y, -40, 1, 1); else put(0, 99999, 0, 1, 0); });
    birds.count = k; birds.instanceMatrix.needsUpdate = true;
  }

  // ── Particles: debris, dust, smoke, glass, water, confetti as camera-facing round points ──
  const MAXP = 520;
  const pPos = new Float32Array(MAXP * 3), pCol = new Float32Array(MAXP * 4), pSize = new Float32Array(MAXP);
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3).setUsage(THREE.DynamicDrawUsage));
  pGeo.setAttribute('pcol', new THREE.BufferAttribute(pCol, 4).setUsage(THREE.DynamicDrawUsage));
  pGeo.setAttribute('size', new THREE.BufferAttribute(pSize, 1).setUsage(THREE.DynamicDrawUsage));
  const pMat = new THREE.ShaderMaterial({
    uniforms: { scale: { value: 600 } }, transparent: true, depthWrite: false,
    vertexShader: 'attribute float size; attribute vec4 pcol; varying vec4 vC; uniform float scale; void main(){ vC = pcol; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = max(1.5, size * scale / -mv.z); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'varying vec4 vC; void main(){ vec2 d = gl_PointCoord - 0.5; float r = dot(d, d); if (r > 0.25) discard; gl_FragColor = vec4(vC.rgb, vC.a * smoothstep(0.25, 0.12, r)); }'
  });
  const points = new THREE.Points(pGeo, pMat); points.frustumCulled = false; scene.add(points);
  const pc = new THREE.Color();
  const PCOL = { smoke: '#d8cfe0', dust: '#e6d2bf', spark: '#ffe9a0', glass: '#cfefff', drop: '#8fd6ff', feather: '#f2f0ff', lid: '#9aa6bc' };
  function updateParticles(st) {
    const ps = st.parts; let n = 0;
    for (let i = 0; i < ps.length && n < MAXP; i++) {
      const q = ps[i], a = Math.min(1, q.life / q.max * 1.6);
      const grow = q.k === 'smoke' || q.k === 'dust' ? 1 + (1 - q.life / q.max) * 1.8 : 1;
      const sz = (q.k === 'smoke' || q.k === 'dust' ? q.s * 2 * grow : q.k === 'spark' ? 3 : q.k === 'lid' ? 12 : q.k === 'chip' || q.k === 'conf' ? 5 : q.k === 'glass' ? q.s * 1.6 : q.s * 2);
      pPos[n * 3] = q.x; pPos[n * 3 + 1] = -q.y; pPos[n * 3 + 2] = q.k === 'smoke' && q.c ? -8 : 0;
      let col = q.c || PCOL[q.k] || '#ffffff', alpha = a * (q.k === 'smoke' ? .75 : 1);
      if (col.indexOf('rgba') === 0) { const m = col.match(/[\d.]+/g); pc.setRGB(m[0] / 255, m[1] / 255, m[2] / 255, THREE.SRGBColorSpace); alpha *= +m[3]; } else pc.setStyle(col, THREE.SRGBColorSpace);
      pCol[n * 4] = pc.r; pCol[n * 4 + 1] = pc.g; pCol[n * 4 + 2] = pc.b; pCol[n * 4 + 3] = alpha;
      pSize[n] = sz; n++;
    }
    pGeo.setDrawRange(0, n);
    pGeo.attributes.position.needsUpdate = true; pGeo.attributes.pcol.needsUpdate = true; pGeo.attributes.size.needsUpdate = true;
  }

  // ── Camera direction, like the cabinet ──
  // Aiming: side-on, as the 2D view. In flight: follow him, a little ahead, tilting up and over to look down
  // onto the roofs. Coming in to land: push in close and low, swung round a little. Settled: a framing shot.
  const rig = { x: 0, y: 0, d: 2000, pitch: .08, yaw: .06, init: false, mode: 'aim' };
  let W = 300, H = 500, dpr = 1, maxDpr = 2;
  function distFor(zoom) { return (C.VW0 * H / (W * zoom)) / (2 * TANH); }
  function surfaceBelow(st, x, y) {
    let top = 0;   // the street
    for (let i = 0; i < st.COL.length; i++) { const c = st.COL[i]; if (c.k === 'ground' || c.off) continue; if (x >= c.x0 && x <= c.x1 && c.y0 >= y - 2 && -c.y0 > top) top = -c.y0; }
    if (x > st.SEA_X) top = -6;
    return top;
  }
  function wantCam(st) {
    const R = st.rag, cam = st.cam;
    if (st.state === 'intro' || st.state === 'aim' || st.state === 'idle' || !R) return { x: cam.x, y: -cam.y, d: distFor(cam.z), pitch: .07, yaw: .07, mode: 'aim' };
    const P = R.P, pl = P[C.PEL], vx = (pl.x - pl.px) / C.HS, vy = (pl.y - pl.py) / C.HS;
    const ground = surfaceBelow(st, pl.x, pl.y), above = -pl.y - ground;
    if (st.state === 'result') return { x: pl.x + 10, y: -pl.y + 26, d: distFor(R.dance ? 1.55 : 1.7), pitch: .3, yaw: .32, mode: 'result' };
    const descending = vy > -60, close = R.landed || R.airT < .3 || (descending && above < 230);
    if (close) return { x: pl.x + clamp(vx * .08, -30, 30), y: -pl.y + 10, d: distFor(2.8), pitch: .34, yaw: .42, mode: 'land' };
    // in the air: lead him, and pitch over once he is past the top of his arc
    const k = descending ? 1 : clamp((vy + 500) / 500, 0, 1);
    return { x: pl.x + clamp(vx * .5, -220, 220), y: -pl.y + clamp(-vy * .28, -220, 160), d: distFor(lerp(1, 1.15, k)), pitch: lerp(.14, .66, k), yaw: lerp(.06, .2, k), mode: 'fly' };
  }
  function tick(dt) {
    const st = api.get(), w = wantCam(st);
    if (!rig.init) { Object.assign(rig, w); rig.init = true; }
    const fast = w.mode === 'aim' ? 9 : w.mode === 'land' ? 3.2 : 2.6;
    rig.x = approach(rig.x, w.x, fast, dt); rig.y = approach(rig.y, w.y, fast, dt);
    rig.d = approach(rig.d, w.d, w.mode === 'land' ? 2.2 : 2.6, dt);
    rig.pitch = approach(rig.pitch, w.pitch, w.mode === 'aim' ? 4 : 1.5, dt);
    rig.yaw = approach(rig.yaw, w.yaw, w.mode === 'aim' ? 4 : 1.3, dt);
    rig.mode = w.mode;
  }
  function placeCamera(st) {
    const cp = Math.cos(rig.pitch), sp = Math.sin(rig.pitch), shx = (Math.random() - .5) * st.shake * .8, shy = (Math.random() - .5) * st.shake * .8;
    let cy = rig.y + rig.d * sp;
    camera.position.set(rig.x + rig.d * cp * Math.sin(rig.yaw) + shx, Math.max(14, cy) + shy, rig.d * cp * Math.cos(rig.yaw));
    camera.lookAt(rig.x + shx, rig.y + shy, 0);
    camera.near = Math.max(4, rig.d * .08); camera.far = 14000; camera.updateProjectionMatrix();
  }

  // ── Per frame ──
  let frames = 0, lastMs = 0, slowT = 0, level = 0, lastDraw = 0;
  function draw() {
    const st = api.get();
    if (st.B !== built) buildCity(st);
    // repaint any facade whose windows broke or got a splat crack, or whose value changed (jackpot moves)
    facades.forEach(f => { const k = brokenKey(f.b); if (k !== f.key) { f.key = k; api.paintFacade(f.b, f.x, f.s); f.t.needsUpdate = true; } });
    const t = st.t;
    dyn.pads.forEach(o => { o.pad.visible = o.b === st.jpB; if (o.pad.visible) { for (let k = 0; k < 16; k++) o.bulbs.setColorAt(k, pc.set((Math.floor(t * 9) + k) % 4 === 0 ? 0xfffbe0 : 0xffb84a)); o.bulbs.instanceColor.needsUpdate = true; } });
    dyn.pads.forEach(o => { o.b._par3.visible = o.b !== st.jpB; });
    dyn.ants.forEach(o => { o.mast.rotation.z = -(o.a.ang + o.a.bent); if (o.a._tip3) o.a._tip3.material.color.set(Math.floor(t * 1.5 + o.a.ph) % 2 ? '#ff5a5a' : '#8a2a3a'); });
    dyn.lamps.forEach(o => { o.grp.rotation.z = -o.l.ang; o.bulb.material.color.set(o.l.out ? '#5a5068' : '#fff1b8'); });
    dyn.cans.forEach(o => { const k = o.can.knocked; o.grp.rotation.z = k ? -k * Math.PI / 2 : 0; o.grp.position.y = k ? 7 : 0; o.lid.visible = !k; });
    dyn.cars.forEach(o => { const c = o.car; o.grp.position.y = Math.sin(c.bob * 20) * c.bob * 2.5; o.cab.scale.y = 1 - (c.dent || 0) * .35; o.glass.scale.y = 1 - (c.dent || 0) * .35; o.glass.material.color.set(c.crack ? '#9fc6e6' : '#bfe3ff'); });
    dyn.bills.forEach(o => { o.grp.rotation.z = -o.p.ang; });
    dyn.acs.forEach(o => { o.grp.position.x = (o.p.x0 + o.p.x1) / 2 + Math.sin(t * 47) * (o.p.wob || 0) * 1.6; o.grp.scale.y = 1 - (o.p.dent || 0) * .25; });
    dyn.tanks.forEach(o => { o.grp.rotation.z = -((o.p.lean || 0) + Math.sin(t * 30) * (o.p.wob || 0) * .06); });
    dyn.awns.forEach(o => { o.grp.rotation.z = .28 + Math.sin((o.a.sq || 0) * Math.PI) * .25; });
    // cannon
    const aimNow = st.state === 'aim' || st.state === 'intro', a = (aimNow ? st.angle : st.lastAng >= 0 ? st.lastAng : 87) * Math.PI / 180;
    cannon.position.set(C.PIV.x, -C.PIV.y, 0); pivot.rotation.z = a; barrel.position.x = -st.recoil * 9;
    // Willy, or his head peeking out of the muzzle while aiming
    if (st.rag) {
      drawWilly(st.rag); peek.visible = false;
      const pl = st.rag.P[C.PEL], gy = surfaceBelow(st, pl.x, pl.y), h = Math.max(0, -pl.y - gy);
      shadow.visible = true; shadow.position.set(pl.x, gy + .8, 0); const r = 16 * (1 + h / 300); shadow.scale.set(r, r * .6, 1); shadow.material.opacity = .3 / (1 + h / 160);
    } else {
      W3.visible = false; shadow.visible = false;
      peek.visible = aimNow; if (peek.visible) { if (head.parent !== peek) peek.add(head); }
    }
    if (st.rag && head.parent !== W3) W3.add(head);
    if (peek.visible && head.parent === peek) { head.position.set(C.BARREL - 2, 0, 0); head.rotation.set(0, 0, -Math.PI / 2); head.scale.set(C.WS, C.WS, C.WS); mouth.scale.y = HR * .3; teeth.visible = true; }
    updateBirds(st);
    updateParticles(st);
    placeCamera(st);
    pMat.uniforms.scale.value = H * dpr / (2 * TANH);
    const t0 = performance.now();
    renderer.info.reset();
    renderer.render(scene, camera);
    frames++; lastMs = performance.now() - t0;
    adapt(st);
  }
  // slow device: lower the resolution in steps (frame gaps over ~24 ms for most of a second during a flight)
  function adapt(st) {
    const now = performance.now(), gap = lastDraw ? now - lastDraw : 0; lastDraw = now;
    if (st.state !== 'flight' || gap > 400 || window.__wcFixedQ) return;
    slowT = gap > 24 ? slowT + gap / 1000 : Math.max(0, slowT - gap / 3000);
    if (slowT > .9 && level < 2) { slowT = 0; level++; maxDpr = level === 1 ? 1.5 : 1.1; resize(W, H, window.devicePixelRatio || 1); }
  }
  function resize(w, h, devDpr) {
    W = w; H = h; dpr = Math.min(maxDpr, devDpr || 1);
    renderer.setPixelRatio(dpr); renderer.setSize(W, H, false);
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    camera.aspect = W / H; camera.updateProjectionMatrix();
  }
  const _pr = new THREE.Vector3();
  function project(x, y, z) {
    _pr.set(x, -y, z || 0).project(camera);
    const ok = _pr.z < 1 && _pr.z > -1;
    const sx = (_pr.x + 1) / 2 * W, sy = (1 - _pr.y) / 2 * H;
    // pixels per world unit at that spot (for sizing labels)
    _a.set(x, -y, z || 0); const dist = _a.distanceTo(camera.position);
    return { x: sx, y: sy, s: H / (2 * TANH * dist), ok };
  }
  if (document.fonts && document.fonts.load) document.fonts.load('40px "Lilita One"').then(() => { built = null; }, () => {});
  return {
    tick, draw, resize, project, canvas,
    rebuild: () => { built = null; },
    info: () => ({ calls: renderer.info.render.calls, tris: renderer.info.render.triangles, ms: +lastMs.toFixed(2), frames, dpr, level, rig: { x: Math.round(rig.x), y: Math.round(rig.y), d: Math.round(rig.d), pitch: +rig.pitch.toFixed(2), yaw: +rig.yaw.toFixed(2), mode: rig.mode } }),
    destroy: () => { renderer.dispose(); canvas.remove(); }
  };
}
window.WillyCrash3D = WillyCrash3D;
window.dispatchEvent(new Event('wc3d-ready'));
