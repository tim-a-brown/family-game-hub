// ═══════════════════════════════════════════════════════════════════════════
// Fortune Cookie teller: a lacquered restaurant table scattered with real-looking
// fortune cookies (three.js). Tap one: it lifts toward you, snaps in two along the
// crease, crumbs fly, and the paper slip slides out and unrolls with your fortune,
// lucky numbers and a word of Chinese. Tap the table to put it away; the table restocks.
//
// Shared teller interface (see games/fortune.html):
//   export default { id, name, blurb, rules, mount(stage, api) -> { unmount() } }
// The returned handle also carries `test` (open/close/state) for automated checks.
//
// Battery: the scene renders only while something moves (at most ~60 draws a second),
// stops while the app is hidden, and everything is disposed on unmount.
// ═══════════════════════════════════════════════════════════════════════════
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import FORTUNES from './cookie-fortunes.js';

// "Learn Chinese", as on real slips: characters, pinyin (with tone marks) and meaning.
const WORDS = [
  ['你好', 'nǐ hǎo', 'hello'], ['谢谢', 'xièxie', 'thank you'], ['朋友', 'péngyou', 'friend'],
  ['家', 'jiā', 'home, family'], ['水', 'shuǐ', 'water'], ['茶', 'chá', 'tea'],
  ['米饭', 'mǐfàn', 'cooked rice'], ['面条', 'miàntiáo', 'noodles'], ['饺子', 'jiǎozi', 'dumplings'],
  ['筷子', 'kuàizi', 'chopsticks'], ['月亮', 'yuèliang', 'moon'], ['太阳', 'tàiyáng', 'sun'],
  ['星星', 'xīngxing', 'star'], ['山', 'shān', 'mountain'], ['河', 'hé', 'river'],
  ['花', 'huā', 'flower'], ['树', 'shù', 'tree'], ['猫', 'māo', 'cat'],
  ['狗', 'gǒu', 'dog'], ['鱼', 'yú', 'fish'], ['龙', 'lóng', 'dragon'],
  ['书', 'shū', 'book'], ['老师', 'lǎoshī', 'teacher'], ['学生', 'xuésheng', 'student'],
  ['爱', 'ài', 'love'], ['快乐', 'kuàilè', 'happy'], ['幸运', 'xìngyùn', 'lucky'],
  ['早上好', 'zǎoshang hǎo', 'good morning'], ['再见', 'zàijiàn', 'goodbye'], ['对不起', 'duìbuqǐ', 'sorry'],
  ['请', 'qǐng', 'please'], ['大', 'dà', 'big'], ['小', 'xiǎo', 'small'],
  ['红色', 'hóngsè', 'red'], ['今天', 'jīntiān', 'today'], ['明天', 'míngtiān', 'tomorrow'],
  ['苹果', 'píngguǒ', 'apple'], ['雨', 'yǔ', 'rain'], ['风', 'fēng', 'wind'],
  ['心', 'xīn', 'heart'], ['梦', 'mèng', 'dream'], ['生日快乐', 'shēngrì kuàilè', 'happy birthday']
];

const DECK_KEY = 'fortune_cookie_deck';
function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

// Shuffled deck of fortune indexes; its place is kept so nothing repeats until most of
// the list has been read. A fresh shuffle keeps the last few fortunes away from its start.
function nextFortune() {
  const n = FORTUNES.length;
  let d = null;
  try { d = JSON.parse(lsGet(DECK_KEY) || 'null'); } catch (e) {}
  const ok = d && d.n === n && Array.isArray(d.order) && d.order.length === n && d.i >= 0;
  if (!ok || d.i >= n) {
    const recent = ok ? d.order.slice(Math.max(0, n - 30)) : [];
    const order = [];
    for (let i = 0; i < n; i++) order.push(i);
    for (let i = n - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = order[i]; order[i] = order[j]; order[j] = t; }
    // push recently read fortunes to the back half
    if (recent.length) {
      const set = new Set(recent);
      const fresh = order.filter((x) => !set.has(x)), old = order.filter((x) => set.has(x));
      const cut = Math.floor(fresh.length / 2);
      order.length = 0; order.push(...fresh.slice(0, cut), ...old, ...fresh.slice(cut));
    }
    d = { n, order, i: 0 };
  }
  const idx = d.order[d.i++];
  lsSet(DECK_KEY, JSON.stringify(d));
  return FORTUNES[idx];
}
function luckyNumbers() {
  const s = new Set();
  while (s.size < 6) s.add(1 + Math.floor(Math.random() * 49));
  return Array.from(s).sort((a, b) => a - b);
}

// ── Small seeded random and value noise ─────────────────────────────────
function rng(seed) {
  let s = (seed >>> 0) || 0x9e3779b9;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}
function noise2(seed) {
  const R = rng(seed), P = new Float32Array(256 * 256);
  for (let i = 0; i < P.length; i++) P[i] = R();
  const at = (x, y) => P[((y & 255) << 8) | (x & 255)];
  const sm = (t) => t * t * (3 - 2 * t);
  return (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), fx = sm(x - xi), fy = sm(y - yi);
    const a = at(xi, yi), b = at(xi + 1, yi), c = at(xi, yi + 1), d = at(xi + 1, yi + 1);
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  };
}
function fbm(n, x, y, oct) {
  let v = 0, a = 0.5, f = 1;
  for (let i = 0; i < oct; i++) { v += a * n(x * f, y * f); f *= 2.03; a *= 0.5; }
  return v;
}

// ── Textures (drawn once per mount) ─────────────────────────────────────
// Cookie skin in disc space (u = along the fold, v = across it): pale gold in the
// middle, browner and more caramel toward the thin rim and the folded tips, with
// mottling, sugar speckles and tiny bubbles.
function cookieCanvas(seed) {
  const S = 512, cv = document.createElement('canvas'); cv.width = cv.height = S;
  const g = cv.getContext('2d'), img = g.createImageData(S, S), D = img.data;
  const n = noise2(seed), n2 = noise2(seed + 77);
  const bump = document.createElement('canvas'); bump.width = bump.height = S;
  const gb = bump.getContext('2d'), bi = gb.createImageData(S, S), B = bi.data;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const p = x / S * 2 - 1, q = y / S * 2 - 1, r = Math.min(1, Math.hypot(p, q));
    const m = fbm(n, x / 34, y / 34, 4), fine = fbm(n2, x / 6, y / 6, 2);
    // how baked: rim and tips most, a little along the fold
    let bake = Math.pow(Math.max(0, (r - 0.55) / 0.45), 1.6) * 0.85 + Math.pow(Math.abs(p), 6) * 0.35 + (1 - Math.min(1, Math.abs(q) / 0.12)) * 0.08;
    bake += (m - 0.5) * 0.35;
    bake = Math.max(0, Math.min(1, bake));
    // pale gold -> amber -> toasted brown
    const t1 = Math.min(1, bake * 1.6), t2 = Math.max(0, bake * 1.6 - 0.6);
    let R = 246 + (222 - 246) * t1 + (168 - 222) * t2;
    let G = 205 + (160 - 205) * t1 + (98 - 160) * t2;
    let Bc = 128 + (72 - 128) * t1 + (36 - 72) * t2;
    const k = 0.94 + (fine - 0.5) * 0.12 + (m - 0.5) * 0.08;
    const i = (y * S + x) * 4;
    D[i] = Math.min(255, R * k); D[i + 1] = Math.min(255, G * k); D[i + 2] = Math.min(255, Bc * k); D[i + 3] = 255;
    const h = 128 + (fine - 0.5) * 120 + (m - 0.5) * 60;
    B[i] = B[i + 1] = B[i + 2] = h; B[i + 3] = 255;
  }
  g.putImageData(img, 0, 0); gb.putImageData(bi, 0, 0);
  const R = rng(seed * 7 + 3);
  // caramel speckles and pin-prick bubbles
  for (let k = 0; k < 520; k++) {
    const x = R() * S, y = R() * S, rad = 0.6 + R() * 1.6;
    g.fillStyle = R() < 0.65 ? `rgba(150,82,24,${0.12 + R() * 0.22})` : `rgba(255,240,200,${0.25 + R() * 0.3})`;
    g.beginPath(); g.arc(x, y, rad, 0, 6.283); g.fill();
    gb.fillStyle = `rgba(${R() < 0.5 ? 60 : 220},${R() < 0.5 ? 60 : 220},${R() < 0.5 ? 60 : 220},.5)`;
    gb.beginPath(); gb.arc(x, y, rad, 0, 6.283); gb.fill();
  }
  return { map: cv, bump };
}

// Dark cherry lacquer planks, the kind of table you find in a family restaurant.
function woodCanvas() {
  const W = 1024, H = 1024, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d'), img = g.createImageData(W, H), D = img.data;
  const n = noise2(1234), n2 = noise2(4321), R = rng(99);
  const PL = 4, ph = H / PL, plank = [];
  for (let k = 0; k < PL; k++) plank.push({ tone: 0.85 + R() * 0.3, off: R() * 1000, f: 0.8 + R() * 0.5, shift: Math.floor(R() * W) });
  for (let y = 0; y < H; y++) {
    const pk = plank[Math.floor(y / ph)], yy = (y % ph) / ph;
    for (let x = 0; x < W; x++) {
      const xx = (x + pk.shift) % W;
      const warp = fbm(n, xx / 220, (y + pk.off) / 60, 3) * 9;
      const ring = Math.sin((yy * 26 * pk.f + warp) * Math.PI);
      const grain = Math.pow(Math.abs(ring), 7);
      const fib = fbm(n2, xx / 3, y / 90, 2);
      let v = pk.tone * (0.78 + 0.22 * fbm(n, xx / 400, y / 40 + pk.off, 2)) - grain * 0.22 - (fib - 0.5) * 0.12;
      // seam shadow between planks
      const e = Math.min(yy, 1 - yy) * ph;
      if (e < 2.5) v *= 0.45 + 0.2 * e;
      const i = (y * W + x) * 4;
      D[i] = Math.max(0, Math.min(255, 118 * v)); D[i + 1] = Math.max(0, Math.min(255, 46 * v)); D[i + 2] = Math.max(0, Math.min(255, 26 * v)); D[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  return cv;
}

// Soft round shadow for under each cookie (grows as a cookie lifts).
function blobCanvas() {
  const S = 128, cv = document.createElement('canvas'); cv.width = cv.height = S;
  const g = cv.getContext('2d'), gr = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  gr.addColorStop(0, 'rgba(0,0,0,.55)'); gr.addColorStop(0.45, 'rgba(0,0,0,.32)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, S, S);
  return cv;
}

// The little slip inside a cookie (in 3D): white paper, faint red print.
function slipCanvas() {
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 48;
  const g = cv.getContext('2d');
  g.fillStyle = '#fbf8f0'; g.fillRect(0, 0, 256, 48);
  g.fillStyle = 'rgba(190,40,45,.75)';
  g.fillRect(40, 17, 150, 5); g.fillRect(64, 28, 104, 4);
  g.fillStyle = 'rgba(0,0,0,.06)'; g.fillRect(0, 44, 256, 4);
  return cv;
}

// ── Cookie geometry ─────────────────────────────────────────────────────
// A fortune cookie is a disc folded in half, then bent over a cup rim so the two ends
// of the fold (the horns) come forward. Disc coordinates: p runs along the fold (-1..1),
// q across it (q < 0 the back layer, q > 0 the front). The back layer keeps a smooth
// lens-shaped hollow behind the fold; the front layer is squeezed by the bend, so it
// folds into a valley at the middle (the crease) and runs nearly straight to the sides.
function cookieShape(P) {
  const Rb = 1 / P.B;
  function outer(p, h, o) {
    const g = P.A * Math.pow(Math.sin(Math.PI * Math.pow(Math.min(1, h), P.lp)), P.lq);
    const y = -g;
    const th = p * P.B, r = Rb - y;
    o.x = r * Math.sin(th); o.y = Rb - r * Math.cos(th); o.z = h * P.H;
    return o;
  }
  const C = { x: 0, y: 0, z: 0 }, E = { x: 0, y: 0, z: 0 }, B0 = { x: 0, y: 0, z: 0 };
  return function (p, q, out) {
    const h = Math.abs(q);
    if (q <= 0) return outer(p, h, out);
    const xm = Math.sqrt(Math.max(1e-6, 1 - h * h)), u = Math.min(1, Math.abs(p) / xm), sg = p < 0 ? -1 : 1;
    outer(0, h, C); C.y += P.cf * h;
    outer(sg * xm, h, E);
    const bulge = P.bf * Math.sin(Math.PI * Math.pow(u, 0.8)) * Math.sin(Math.PI * Math.min(1, h));
    const cx = C.x + (E.x - C.x) * u, cy = C.y + (E.y - C.y) * u + bulge, cz = C.z + (E.z - C.z) * u;
    outer(p, h, B0);
    const w = Math.min(1, h / P.wf), ws = w * w * (3 - 2 * w);
    out.x = B0.x + (cx - B0.x) * ws; out.y = B0.y + (cy - B0.y) * ws; out.z = B0.z + (cz - B0.z) * ws;
    return out;
  };
}

// One half of a cookie as a thin solid: outer sheet, inner sheet (offset by the shell
// thickness), and strips along the rim and the jagged break line. side -1: p from the
// left horn to the break; +1: from the break to the right horn.
function halfGeometry(F, side, P, jag) {
  const NI = 30, NJ = 40, T = P.T, V = (NI + 1) * (NJ + 1);
  const pos = [], uv = [], idxO = [], tmp = { x: 0, y: 0, z: 0 };
  for (let j = 0; j <= NJ; j++) {
    const t = j / NJ * 2 - 1, w = Math.sign(t) * Math.pow(Math.abs(t), 1.5);   // rows crowd the fold
    for (let i = 0; i <= NI; i++) {
      const f = i / NI, b = jag(w);
      const p = side < 0 ? -1 + (b + 1) * Math.pow(f, 0.8) : b + (1 - b) * (1 - Math.pow(1 - f, 0.8));
      const q = w * Math.sqrt(Math.max(0, 1 - p * p));
      F(p, q, tmp);
      pos.push(tmp.x, tmp.y, tmp.z);
      uv.push(p * 0.5 + 0.5, q * 0.5 + 0.5);
    }
  }
  const at = (i, j) => j * (NI + 1) + i;
  for (let j = 0; j < NJ; j++) for (let i = 0; i < NI; i++) {
    const a = at(i, j), b = at(i + 1, j), c = at(i + 1, j + 1), d = at(i, j + 1);
    if (side < 0) idxO.push(a, b, d, b, c, d); else idxO.push(a, d, b, b, d, c);
  }
  const g0 = new THREE.BufferGeometry();
  g0.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g0.setIndex(idxO); g0.computeVertexNormals();
  const nrm = g0.getAttribute('normal').array;
  const all = pos.slice(), allUv = uv.slice(), idx = idxO.slice();
  for (let k = 0; k < V; k++) {
    all.push(pos[k * 3] - nrm[k * 3] * T, pos[k * 3 + 1] - nrm[k * 3 + 1] * T, pos[k * 3 + 2] - nrm[k * 3 + 2] * T);
    allUv.push(uv[k * 2], uv[k * 2 + 1]);
  }
  for (let k = 0; k < idxO.length; k += 3) idx.push(V + idxO[k], V + idxO[k + 2], V + idxO[k + 1]);
  function strip(list) {
    for (let k = 0; k < list.length - 1; k++) {
      const a = list[k], b = list[k + 1], base = all.length / 3;
      for (const v of [a, b, a + V, b + V]) { all.push(all[v * 3], all[v * 3 + 1], all[v * 3 + 2]); allUv.push(allUv[v * 2], allUv[v * 2 + 1]); }
      idx.push(base, base + 2, base + 1, base + 1, base + 2, base + 3);
    }
  }
  const r0 = [], r1 = [], br = [];
  for (let i = 0; i <= NI; i++) { r0.push(at(i, 0)); r1.push(at(i, NJ)); }
  const bi = side < 0 ? NI : 0;
  for (let j = 0; j <= NJ; j++) br.push(at(bi, j));
  strip(r0); strip(r1); strip(br);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(all, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(allUv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  g0.dispose();
  return g;
}
