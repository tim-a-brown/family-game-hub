// ═══════════════════════════════════════════════════════════════════════════
// Fortune Cookie teller: a lacquered restaurant table scattered with real-looking
// fortune cookies (three.js), each in a clear cellophane wrapper. Tap one: it lifts toward
// you and the wrapper tears across the middle, its halves pulled off to the sides. Tap the
// cookie again: it snaps in two along the crease, crumbs fly, and the paper slip slides out
// and unrolls with your fortune, lucky numbers and a word of Chinese. Tap the table to put
// it away; the table restocks.
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
    let bake = Math.pow(Math.max(0, (r - 0.6) / 0.4), 1.8) * 0.72 + Math.pow(Math.abs(p), 6) * 0.2 + (1 - Math.min(1, Math.abs(q) / 0.12)) * 0.08;
    bake += (m - 0.5) * 0.35;
    bake = Math.max(0, Math.min(1, bake));
    // pale gold -> amber -> toasted brown
    const t1 = Math.min(1, bake * 1.6), t2 = Math.max(0, bake * 1.6 - 0.6);
    let R = 240 + (214 - 240) * t1 + (150 - 214) * t2;
    let G = 190 + (138 - 190) * t1 + (80 - 138) * t2;
    let Bc = 104 + (56 - 104) * t1 + (28 - 56) * t2;
    const k = 0.94 + (fine - 0.5) * 0.12 + (m - 0.5) * 0.08;
    const i = (y * S + x) * 4;
    D[i] = Math.min(255, R * k); D[i + 1] = Math.min(255, G * k); D[i + 2] = Math.min(255, Bc * k); D[i + 3] = 255;
    const h = 128 + (fine - 0.5) * 120 + (m - 0.5) * 60;
    B[i] = B[i + 1] = B[i + 2] = h; B[i + 3] = 255;
  }
  g.putImageData(img, 0, 0); gb.putImageData(bi, 0, 0);
  const R = rng(seed * 7 + 3);
  // caramel speckles and pin-prick bubbles
  for (let k = 0; k < 420; k++) {
    const x = R() * S, y = R() * S, rad = 0.5 + R() * 1.3;
    g.fillStyle = R() < 0.8 ? `rgba(150,82,24,${0.1 + R() * 0.2})` : `rgba(255,236,190,${0.12 + R() * 0.18})`;
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

// ── Tablecloth: red silk damask with a gold Chinese key-fret (回纹) border ──
// The field is one small tile repeated: tone-on-tone medallions (a ring with a
// four-petal lattice) on a fine silk weave. Returns colour + bump canvases.
function damaskCanvas() {
  const S = 512, cv = document.createElement('canvas'); cv.width = cv.height = S;
  const g = cv.getContext('2d');
  const bump = document.createElement('canvas'); bump.width = bump.height = S;
  const gb = bump.getContext('2d');
  g.fillStyle = '#8f1419'; g.fillRect(0, 0, S, S);
  gb.fillStyle = '#808080'; gb.fillRect(0, 0, S, S);
  // fine weave: alternating faint warp and weft lines
  const R = rng(808);
  for (let i = 0; i < S; i += 2) {
    g.fillStyle = `rgba(255,${120 + R() * 40},${110 + R() * 30},${0.025 + R() * 0.03})`; g.fillRect(0, i, S, 1);
    g.fillStyle = `rgba(40,0,0,${0.03 + R() * 0.03})`; g.fillRect(i, 0, 1, S);
    gb.fillStyle = `rgba(255,255,255,${0.05 + R() * 0.05})`; gb.fillRect(0, i, S, 1);
  }
  // medallions on a half-drop grid (centre + corners), drawn in a slightly lighter, glossier red
  function medallion(cx, cy, r) {
    for (const [ctx, col, w] of [[g, 'rgba(196,52,48,.55)', 1], [gb, 'rgba(255,255,255,.55)', 1]]) {
      ctx.save(); ctx.translate(cx, cy); ctx.strokeStyle = col; ctx.lineCap = 'round';
      ctx.lineWidth = 5 * w; ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.283); ctx.stroke();
      ctx.lineWidth = 2.2 * w; ctx.beginPath(); ctx.arc(0, 0, r * 0.82, 0, 6.283); ctx.stroke();
      // four petals meeting in the middle
      for (let k = 0; k < 4; k++) {
        ctx.rotate(Math.PI / 2);
        ctx.beginPath(); ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(r * 0.42, -r * 0.18, r * 0.68, 0); ctx.quadraticCurveTo(r * 0.42, r * 0.18, 0, 0);
        ctx.stroke();
      }
      ctx.lineWidth = 2 * w; ctx.beginPath(); ctx.arc(0, 0, r * 0.14, 0, 6.283); ctx.stroke();
      ctx.restore();
    }
  }
  // a small four-petal blossom between medallions
  function bud(cx, cy) {
    for (const [ctx, col] of [[g, 'rgba(190,48,44,.45)'], [gb, 'rgba(255,255,255,.4)']]) {
      ctx.fillStyle = col;
      for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + Math.PI / 4; ctx.beginPath(); ctx.ellipse(cx + Math.cos(a) * 8, cy + Math.sin(a) * 8, 7, 4, a, 0, 6.283); ctx.fill(); }
      ctx.beginPath(); ctx.arc(cx, cy, 3, 0, 6.283); ctx.fill();
    }
  }
  medallion(S / 2, S / 2, 92);
  for (const [x, y] of [[0, 0], [S, 0], [0, S], [S, S]]) medallion(x, y, 92);
  for (const [x, y] of [[S / 2, 0], [0, S / 2], [S, S / 2], [S / 2, S]]) bud(x, y);
  return { map: cv, bump };
}
// Border band tile (repeats along its length): gold rules either side of a running
// key fret. Outer edge at the top of the canvas. Also a metal/roughness map so only
// the gold catches the light like metal thread.
const BAND_W = 512, BAND_H = 128;
function bandCanvases() {
  const cv = document.createElement('canvas'); cv.width = BAND_W; cv.height = BAND_H;
  const mr = document.createElement('canvas'); mr.width = BAND_W; mr.height = BAND_H;
  const g = cv.getContext('2d'), gm = mr.getContext('2d');
  g.fillStyle = '#6e0c10'; g.fillRect(0, 0, BAND_W, BAND_H);
  gm.fillStyle = 'rgb(0,170,0)'; gm.fillRect(0, 0, BAND_W, BAND_H);   // G = roughness, B = metalness
  const gold = (ctx, metal) => { ctx.strokeStyle = ctx.fillStyle = metal ? 'rgb(0,80,255)' : '#e2b54c'; };
  for (const [ctx, metal] of [[g, false], [gm, true]]) {
    gold(ctx, metal);
    ctx.fillRect(0, 6, BAND_W, 5); ctx.fillRect(0, 15, BAND_W, 2);
    ctx.fillRect(0, BAND_H - 17, BAND_W, 2); ctx.fillRect(0, BAND_H - 11, BAND_W, 5);
    // running key: each 64 px unit is a squared spiral rising off a baseline
    ctx.lineWidth = 6; ctx.lineJoin = 'miter'; ctx.lineCap = 'butt';
    const T = 28, B = BAND_H - 28, u = 64;
    for (let x0 = 0; x0 < BAND_W; x0 += u) {
      ctx.beginPath();
      ctx.moveTo(x0 - 1, B); ctx.lineTo(x0 + u + 1, B);
      ctx.moveTo(x0 + 8, B); ctx.lineTo(x0 + 8, T); ctx.lineTo(x0 + 56, T); ctx.lineTo(x0 + 56, B - 18);
      ctx.lineTo(x0 + 24, B - 18); ctx.lineTo(x0 + 24, T + 18); ctx.lineTo(x0 + 40, T + 18); ctx.lineTo(x0 + 40, B - 34);
      ctx.stroke();
    }
  }
  // a little shading so the gold looks embroidered rather than printed
  const sh = g.createLinearGradient(0, 0, 0, BAND_H);
  sh.addColorStop(0, 'rgba(0,0,0,.18)'); sh.addColorStop(0.5, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,.12)');
  g.fillStyle = sh; g.fillRect(0, 0, BAND_W, BAND_H);
  return { map: cv, mr };
}
// The square where the two border bands meet: a double gold frame around a 回 spiral.
function cornerCanvases() {
  const S = BAND_H, cv = document.createElement('canvas'); cv.width = cv.height = S;
  const mr = document.createElement('canvas'); mr.width = mr.height = S;
  const g = cv.getContext('2d'), gm = mr.getContext('2d');
  g.fillStyle = '#6e0c10'; g.fillRect(0, 0, S, S);
  gm.fillStyle = 'rgb(0,170,0)'; gm.fillRect(0, 0, S, S);
  for (const [ctx, metal] of [[g, false], [gm, true]]) {
    ctx.strokeStyle = ctx.fillStyle = metal ? 'rgb(0,80,255)' : '#e2b54c';
    // outer rules continue round the corner (outer edges are top and left)
    ctx.fillRect(6, 6, S - 6, 5); ctx.fillRect(6, 6, 5, S - 6);
    ctx.fillRect(15, 15, S - 15, 2); ctx.fillRect(15, 15, 2, S - 15);
    ctx.fillRect(S - 17, S - 17, 17, 2); ctx.fillRect(S - 17, S - 17, 2, 17);
    ctx.fillRect(S - 11, S - 11, 11, 5); ctx.fillRect(S - 11, S - 11, 5, 11);
    // square spiral
    ctx.lineWidth = 6; ctx.lineJoin = 'miter';
    const a = 30, b = S - 30;
    ctx.beginPath();
    ctx.moveTo(a, b); ctx.lineTo(a, a); ctx.lineTo(b, a); ctx.lineTo(b, b); ctx.lineTo(a + 16, b);
    ctx.lineTo(a + 16, a + 16); ctx.lineTo(b - 16, a + 16); ctx.lineTo(b - 16, b - 16); ctx.lineTo(a + 32, b - 16); ctx.lineTo(a + 32, a + 32); ctx.lineTo(b - 32, a + 32);
    ctx.stroke();
  }
  return { map: cv, mr };
}
// Soft contact shadow along a cloth edge (dark at the edge, fading outward = canvas top).
function edgeShadowCanvas() {
  const cv = document.createElement('canvas'); cv.width = 4; cv.height = 64;
  const g = cv.getContext('2d'), gr = g.createLinearGradient(0, 64, 0, 0);
  gr.addColorStop(0, 'rgba(0,0,0,.55)'); gr.addColorStop(0.35, 'rgba(0,0,0,.2)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 4, 64);
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

// ── Cellophane wrapper ──────────────────────────────────────────────────
// Every cookie on the table comes in a clear flow-wrap pack: a puffy pillow of film with a
// heat-crimped seal at each end (ribbed, frosted, cut in a zigzag). The film is crumpled:
// one shared tile of creases (normal map) plus a frost map that makes the creases a little
// milkier, rougher and more rainbow-tinted (it drives roughness, opacity and film thickness).

// A tile of crumpled film: the sheet breaks into small flat facets, each tipped a little its
// own way, so light glints off them in patches with sharp crease lines between (two sizes of
// jittered-grid Voronoi cells, a big and a small), plus a few long straight folds. Returns the
// normal map and the frost map (G channel: about 0.22 for clear film, up to 1 on a hard crease).
function crinkleCanvases(seed) {
  const S = 512, R = rng(seed);
  // a layer of facets: one jittered point per grid cell, each with a random tilt (slope)
  function layer(G, tilt) {
    const pts = [];
    for (let j = 0; j < G; j++) for (let i = 0; i < G; i++) {
      const a = R() * 6.283, m = tilt * (0.25 + R() * 0.75);
      pts.push({ x: (i + 0.1 + R() * 0.8) / G, y: (j + 0.1 + R() * 0.8) / G, sx: Math.cos(a) * m, sy: Math.sin(a) * m });
    }
    return { G, pts };
  }
  const L1 = layer(6, 0.3), L2 = layer(14, 0.16);
  const out = { sx: 0, sy: 0, edge: 0 };
  function facet(Lr, u, v, edgeW) {
    const G = Lr.G, gi = Math.floor(u * G), gj = Math.floor(v * G);
    let d1 = 9, d2 = 9, p1 = null, p2 = null;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      const ii = gi + di, jj = gj + dj, p = Lr.pts[((jj + G) % G) * G + ((ii + G) % G)];
      const px = p.x + Math.floor(ii / G), py = p.y + Math.floor(jj / G);
      const d = (u - px) * (u - px) + (v - py) * (v - py);
      if (d < d1) { d2 = d1; p2 = p1; d1 = d; p1 = p; } else if (d < d2) { d2 = d; p2 = p; }
    }
    // distance to the crease between the two nearest facets, in tile units
    const e = (Math.sqrt(d2) - Math.sqrt(d1)) / 2;
    const w = Math.min(1, e / edgeW), k = 0.5 + 0.5 * w * w * (3 - 2 * w);
    out.sx = p1.sx * k + p2.sx * (1 - k); out.sy = p1.sy * k + p2.sy * (1 - k);
    out.edge = Math.exp(-e * e / (edgeW * edgeW * 0.5));
    return out;
  }
  // long straight folds (tent-shaped, sharp spine), tiled
  const folds = [];
  for (let i = 0; i < 9; i++) { const a = R() * Math.PI; folds.push({ x: R(), y: R(), tx: Math.cos(a), ty: Math.sin(a), half: 0.25 + R() * 0.3, w: 0.03 + R() * 0.05, k: (R() < 0.5 ? -1 : 1) * (0.15 + R() * 0.2) }); }
  const n = noise2(seed + 5);
  const nc = document.createElement('canvas'); nc.width = nc.height = S;
  const fc = document.createElement('canvas'); fc.width = fc.height = S;
  const ni = nc.getContext('2d').createImageData(S, S), fi = fc.getContext('2d').createImageData(S, S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const u = (x + 0.5) / S, v = (y + 0.5) / S;
    facet(L1, u, v, 2.2 / S); let sx = out.sx, sy = out.sy, fr = out.edge * 0.22;
    facet(L2, u, v, 1.6 / S); sx += out.sx; sy += out.sy; fr += out.edge * 0.08;
    for (const f of folds) {
      let dx = u - f.x, dy = v - f.y; dx -= Math.round(dx); dy -= Math.round(dy);
      const dt = dx * f.tx + dy * f.ty, dn = -dx * f.ty + dy * f.tx;
      const an = Math.abs(dn) / f.w, at = Math.abs(dt) / f.half;
      if (an >= 1 || at >= 1) continue;
      const win = at < 0.6 ? 1 : 1 - (at - 0.6) / 0.4;
      const sl = f.k * 2 * (1 - an) * Math.sign(dn) * win;   // d/dn of k*w*(1-|n|/w)^2 / w
      sx += -f.ty * sl; sy += f.tx * sl;
      fr += Math.abs(f.k) * 1.6 * Math.exp(-an * an * 40) * win;
    }
    const l = Math.hypot(sx, sy, 1), o = (y * S + x) * 4;
    ni.data[o] = 128 + (-sx / l) * 127; ni.data[o + 1] = 128 + (sy / l) * 127; ni.data[o + 2] = 128 + (1 / l) * 127; ni.data[o + 3] = 255;
    const haze = (fbm(n, x / 40, y / 40, 3) - 0.5) * 0.1;
    const f = Math.max(0, Math.min(1, 0.22 + haze + Math.min(0.78, fr)));
    fi.data[o] = fi.data[o + 1] = fi.data[o + 2] = f * 255; fi.data[o + 3] = 255;
  }
  nc.getContext('2d').putImageData(ni, 0, 0); fc.getContext('2d').putImageData(fi, 0, 0);
  return { normal: nc, frost: fc };
}

// The pack's shape, in its own units: body 2 long (x -1..1), 2 wide (z -1..1), 1 tall (y 0..1),
// a crimped fin past each end. Around the tube, sg runs 0..1: 0..0.5 the top sheet (z +1 -> -1),
// 0.5..1 the bottom sheet back again, so in the flat seal both sheets land on the same z
// and the zigzag teeth line up. Each pack is split along a jagged tear line near x = 0 into
// a left and a right half (shared geometries, a few variants).
const WR = { M: 64, ROWS: 46, TOOTH: 0.05, NT: 2.5, NB: 5 };
function wrapperShape(R) {
  const V = {
    Lb: 0.42 + R() * 0.1,        // where the pillow starts to taper toward the seal
    Wf: 1.05 + R() * 0.07,        // half-width of the flattened seal (wider than the pack)
    hs: 0.36 + R() * 0.08,       // seal height
    Lf: 0.15 + R() * 0.04,       // crimped fin length
    droop: 0.04 + R() * 0.1, flop: (R() - 0.5) * 0.12,
    pl: [], cr: [], tear: []
  };
  // pleats where the film gathers into the seal, and soft crinkles everywhere (periodic around the tube)
  for (let i = 0; i < 4; i++) V.pl.push({ k: [7, 11, 16, 23][i] + Math.floor(R() * 3), a: [0.5, 0.32, 0.22, 0.12][i], ph: R() * 6.283, w: 2 + R() * 3, wp: R() * 6.283 });
  for (let i = 0; i < 5; i++) V.cr.push({ fx: 1 + R() * 3, k: 1 + Math.floor(R() * 3), a: 0.002 + R() * 0.004, ph: R() * 6.283 });
  for (let j = 0; j < WR.M * 2; j++) V.tear.push((R() - 0.5) * 0.07 + 0.025 * Math.sin(j * 0.7 + V.Lb * 40));
  return V;
}
// Base surface point (before pleats/crinkles) at x and around-the-tube parameter sg.
function wrapBase(V, x, sg, o) {
  const top = sg < 0.5, zf = top ? 1 - 4 * sg : -1 + 4 * (sg - 0.5);
  const c = Math.max(-1, Math.min(1, zf)), s = (top ? 1 : -1) * Math.sqrt(Math.max(0, 1 - c * c));
  const n = s >= 0 ? WR.NT : WR.NB;
  const ax = Math.abs(x);
  if (ax <= 1) {
    const zb = Math.sign(c) * Math.pow(Math.abs(c), 2 / n), yb = 0.5 + 0.5 * Math.sign(s) * Math.pow(Math.abs(s), 2 / n);
    let t = Math.max(0, Math.min(1, (ax - V.Lb) / (1 - V.Lb))); t = t * t * (3 - 2 * t);
    const zF = V.Wf * c, yF = V.hs + 0.012 * s;
    o.x = x; o.y = yb + (yF - yb) * t; o.z = zb + (zF - zb) * t;
  } else {
    const u = (ax - 1) / V.Lf;
    o.x = x; o.z = V.Wf * c * (1 + 0.03 * u);
    o.y = V.hs + 0.012 * s * (1 - 0.5 * u) - V.droop * u * u + V.flop * u * c;
  }
  return o;
}
function wrapperGeometries(V) {
  const M = WR.M, NC = M * 2, ROWS = WR.ROWS;
  const P0 = { x: 0, y: 0, z: 0 }, Pa = { x: 0, y: 0, z: 0 }, Pb = { x: 0, y: 0, z: 0 }, Pc = { x: 0, y: 0, z: 0 }, Pd = { x: 0, y: 0, z: 0 };
  // normal of the base surface by finite differences (outward)
  function baseN(x, sg, out) {
    const e = 1e-3;
    wrapBase(V, x + e, sg, Pa); wrapBase(V, x - e, sg, Pb); wrapBase(V, x, (sg + e) % 1, Pc); wrapBase(V, x, (sg - e + 1) % 1, Pd);
    const ux = Pa.x - Pb.x, uy = Pa.y - Pb.y, uz = Pa.z - Pb.z, vx = Pc.x - Pd.x, vy = Pc.y - Pd.y, vz = Pc.z - Pd.z;
    // sg runs over the top from +z to -z, so (d/dx) x (d/dsg) points out of the pack
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz) || 1; out.x = nx / l; out.y = ny / l; out.z = nz / l;
    return out;
  }
  const N0 = { x: 0, y: 0, z: 0 };
  function surf(x, sg, o) {
    wrapBase(V, x, sg, o);
    const ax = Math.abs(x);
    if (ax >= 1) return o;
    baseN(x, sg, N0);
    let tt = Math.max(0, Math.min(1, (ax - V.Lb) / (1 - V.Lb)));
    const amp = 0.03 * Math.pow(Math.sin(Math.PI * Math.pow(tt, 0.7)), 1.3);
    let d = 0;
    if (amp > 0) {
      let p = 0;
      for (const q of V.pl) p += q.a * Math.sin(6.2832 * q.k * sg + q.ph + 0.7 * Math.sin(q.w * ax + q.wp));
      d += amp * Math.sign(p) * Math.pow(Math.abs(p), 0.7);
    }
    for (const q of V.cr) d += q.a * Math.sin(q.fx * x + 6.2832 * q.k * sg + q.ph) * (1 - 0.6 * tt);
    o.x += N0.x * d; o.y += N0.y * d; o.z += N0.z * d;
    if (o.y < 0.002) o.y = 0.002;
    return o;
  }
  function half(side) {
    const pos = [], nrm = [], uv = [], film = [], idx = [];
    for (let r = 0; r <= ROWS; r++) {
      for (let j = 0; j < NC; j++) {
        const sg = j / NC, tear = V.tear[j], tip = 1 + V.Lf - (j % 2 ? WR.TOOTH : 0);
        // rows: 8 across the body, 26 through the taper, the rest across the crimp
        let ax;
        if (r <= 8) ax = tear * side + (V.Lb - tear * side) * (r / 8);
        else if (r <= 34) { const u = (r - 8) / 26; ax = V.Lb + (1 - V.Lb) * u; }
        else ax = 1 + (tip - 1) * ((r - 34) / (ROWS - 34));
        const x = side * ax;
        surf(x, sg, P0);
        // normal from the displaced surface
        const e = 1.5e-3;
        surf(x + e, sg, Pa); surf(x - e, sg, Pb); surf(x, (sg + e) % 1, Pc); surf(x, (sg - e + 1) % 1, Pd);
        const ux = Pa.x - Pb.x, uy = Pa.y - Pb.y, uz = Pa.z - Pb.z, vx = Pc.x - Pd.x, vy = Pc.y - Pd.y, vz = Pc.z - Pd.z;
        let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
        const l = Math.hypot(nx, ny, nz) || 1;
        pos.push(P0.x, P0.y, P0.z); nrm.push(nx / l, ny / l, nz / l);
        uv.push(P0.x * 0.55, sg * 2.4);
        const fin = Math.max(0, Math.min(1, (ax - 0.985) / 0.03));
        // ribs: one per zigzag tooth, ridge running out to each tooth's point
        film.push(fin, P0.z / (4 * V.Wf / M) * 6.2832 + 1.5708);
      }
    }
    for (let r = 0; r < ROWS; r++) for (let j = 0; j < NC; j++) {
      const a = r * NC + j, b = r * NC + (j + 1) % NC, c = a + NC, d = b + NC;
      if (side > 0) idx.push(a, c, b, b, c, d); else idx.push(a, b, c, b, d, c);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setAttribute('film', new THREE.Float32BufferAttribute(film, 2));
    g.setIndex(idx);
    g.computeBoundingSphere(); g.computeBoundingBox();
    return g;
  }
  return [half(-1), half(1)];
}
// The top of the pack at (x, z) in pack units, for fitting a pack around a cookie.
function wrapTop(V, x, z) {
  const ax = Math.min(1, Math.abs(x));
  let t = Math.max(0, Math.min(1, (ax - V.Lb) / (1 - V.Lb))); t = t * t * (3 - 2 * t);
  const zb = Math.min(1, Math.abs(z));
  const yb = 0.5 + 0.5 * Math.pow(Math.max(0, 1 - Math.pow(zb, WR.NT)), 1 / WR.NT);
  return yb + (V.hs - yb) * t;
}

// Clear film: physically it's a thin clear sheet, so its reflections must not fade with its
// (very low) opacity the way three.js's standard alpha blending would. The shader is patched
// to write premultiplied colour: the faint milky body * alpha, plus the reflections at full
// strength; and grazing angles block more of what's behind (Fresnel), like real film.
function filmMaterial(normalTex, frostTex) {
  const m = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, metalness: 0, roughness: 0.42, roughnessMap: frostTex,
    normalMap: normalTex, normalScale: new THREE.Vector2(1, 1),
    alphaMap: frostTex, opacity: 0.1, transparent: true, depthWrite: false, side: THREE.DoubleSide, premultipliedAlpha: true,
    ior: 1.45, specularIntensity: 0.6, envMapIntensity: 0.2,
    iridescence: 0.55, iridescenceIOR: 1.33, iridescenceThicknessRange: [260, 700], iridescenceThicknessMap: frostTex
  });
  const U = m.userData.u = { uFres: { value: 0.35 }, uGeoFres: { value: 1 }, uDbg: { value: 0 } };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = 'attribute vec2 film;\nvarying vec2 vFilm;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n\tvFilm = film;');
    sh.fragmentShader = 'varying vec2 vFilm;\nuniform float uFres, uGeoFres, uDbg;\n' + sh.fragmentShader
      .replace('#include <alphamap_fragment>', '#include <alphamap_fragment>\n\tdiffuseColor.a = mix(diffuseColor.a, 0.2, vFilm.x);')
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n\troughnessFactor = mix(roughnessFactor, 0.3, vFilm.x);')
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
	{ // crimp ribs on the seals, as a bump
		float rh = vFilm.x * 0.0035 * sin(vFilm.y) * clamp(1.6 - fwidth(vFilm.y) * 0.5, 0.0, 1.0);
		vec3 sp = - vViewPosition, sx = dFdx(sp), sy = dFdy(sp);
		vec3 r1 = cross(sy, normal), r2 = cross(normal, sx);
		float det = dot(sx, r1) * faceDirection;
		vec3 gr = sign(det) * (dFdx(rh) * r1 + dFdy(rh) * r2);
		normal = normalize(abs(det) * normal - gr);
	}`)
      .replace('#include <opaque_fragment>', `
	float fA = diffuseColor.a;
	float fNV = saturate(dot(mix(normal, nonPerturbedNormal, uGeoFres), geometryViewDir));
	float fFr = 0.04 + 0.96 * pow(1.0 - fNV, 5.0);
	gl_FragColor = vec4(totalDiffuse * fA + totalSpecular, clamp(fA + (1.0 - fA) * fFr * uFres, 0.0, 1.0));
	if (uDbg > 0.5) gl_FragColor = vec4(vec3(gl_FragColor.a), 1.0);
	if (uDbg > 1.5) gl_FragColor = vec4(vFilm.x, fA, fFr, 1.0);`)
      .replace('#include <premultiplied_alpha_fragment>', '');
  };
  m.customProgramCacheKey = () => 'ck-film-1';
  return m;
}

// ── Styles for the overlay (slip, hint, button). The table keeps its own colours in every theme.
const CSS = `
.ck{position:absolute;inset:0;overflow:hidden;background:#24100a;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;}
.ck canvas{position:absolute;inset:0;display:block;width:100%;height:100%;outline:none;touch-action:none;cursor:default;}
.ck canvas.hot{cursor:pointer;}
.ck{--ck-gold:#ecc66d;--ck-gold-2:#b98a35;}
/* Controls are red lacquer plaques with a gold rule, like the restaurant's menu boards and the cloth's trim */
.ck-plq{position:relative;border:0;border-radius:10px;color:var(--ck-gold);
  background:linear-gradient(180deg,#6a1014 0%,#4a080b 48%,#330507 100%);
  box-shadow:inset 0 0 0 1.5px var(--ck-gold-2),inset 0 0 0 4px #3d0608,inset 0 0 0 5px rgba(236,198,109,.45),
    0 10px 20px rgba(0,0,0,.42),0 2px 3px rgba(0,0,0,.5);
  font-family:"Iowan Old Style","Palatino Linotype",Palatino,"Book Antiqua",Georgia,"Times New Roman",serif;}
.ck-plq::before{content:"";position:absolute;inset:5px 5px 50% 5px;border-radius:6px 6px 2px 2px;pointer-events:none;
  background:linear-gradient(180deg,rgba(255,226,200,.14),rgba(255,226,200,0));}
.ck-hint{position:absolute;left:50%;top:12px;z-index:2;transform:translateX(-50%);padding:8px 20px 9px;white-space:nowrap;pointer-events:none;
  font-style:italic;font-size:1.02rem;letter-spacing:.02em;text-shadow:0 1px 0 rgba(0,0,0,.5);transition:opacity .3s,transform .3s;}
.ck-hint.off{opacity:0;transform:translate(-50%,-8px);}
.ck-bar{position:absolute;left:0;right:0;bottom:calc(var(--safe-b,0px) + 14px);z-index:4;display:flex;justify-content:center;padding:0 16px;
  pointer-events:none;transition:opacity .3s,transform .35s var(--spring,ease);}
.ck-bar.off{opacity:0;transform:translateY(14px);}
.ck-bar.off *{pointer-events:none !important;}
.ck-bar .ck-plq{display:flex;align-items:stretch;pointer-events:auto;}
.ck-b{position:relative;display:flex;align-items:center;justify-content:center;gap:10px;min-height:54px;padding:6px 22px;border:0;background:none;color:inherit;
  font:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent;touch-action:manipulation;border-radius:8px;transition:transform .12s;}
.ck-b:active{transform:scale(.96);}
.ck-b:disabled{cursor:default;opacity:.55;}
.ck-b:focus-visible{outline:2px solid var(--ck-gold);outline-offset:-6px;}
.ck-b svg{width:19px;height:19px;flex:none;}
.ck-b .t{display:flex;flex-direction:column;align-items:flex-start;line-height:1.1;}
.ck-b .l{font-weight:700;font-size:.86rem;letter-spacing:.16em;text-transform:uppercase;text-shadow:0 1px 0 rgba(0,0,0,.55);}
.ck-b .s{margin-top:3px;font-style:italic;font-size:.8rem;letter-spacing:.02em;color:#e3c88f;opacity:.85;font-variant-numeric:oldstyle-nums tabular-nums;}
.ck-b + .ck-b::before{content:"";position:absolute;left:0;top:12px;bottom:12px;width:1px;background:linear-gradient(180deg,transparent,var(--ck-gold-2),transparent);}
.ck-b.rs{min-width:54px;padding:0 16px;}
.ck-b[hidden]{display:none;}
.ck-slipbox{position:absolute;left:0;top:0;z-index:3;pointer-events:none;transform-origin:50% 50%;will-change:transform;
  filter:drop-shadow(0 12px 14px rgba(0,0,0,.42)) drop-shadow(0 2px 2px rgba(0,0,0,.35));}
.ck-curl{transform:perspective(700px) rotateX(9deg);transform-origin:50% 50%;}
.ck-slip{position:relative;padding:.75em 2.1em .6em;color:var(--ck-ink,#c3262d);text-align:center;
  font-family:"Times New Roman",Times,"Liberation Serif",Georgia,serif;
  background:
    linear-gradient(180deg,rgba(0,0,0,.07),rgba(0,0,0,0) 16%,rgba(255,255,255,0) 70%,rgba(0,0,0,.09)),
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 .45 0 0 0 0 .4 0 0 0 0 .32 0 0 0 .5 0'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='.35'/%3E%3C/svg%3E"),
    linear-gradient(90deg,#f6f1e4,#fdfbf4 30%,#fbf8ef 70%,#f3eddd);
  -webkit-mask:var(--ck-edge) 0 0/100% 100% no-repeat;mask:var(--ck-edge) 0 0/100% 100% no-repeat;}
.ck-f{display:flex;align-items:center;justify-content:center;gap:.6em;font-size:var(--ck-fs,18px);line-height:1.22;letter-spacing:.01em;text-wrap:balance;}
.ck-f svg{flex:none;width:.85em;height:.85em;opacity:.9;}
.ck-rule{height:1px;margin:.55em 12% .4em;background:currentColor;opacity:.3;}
.ck-s{font-family:Arial,Helvetica,"Liberation Sans",sans-serif;font-size:calc(var(--ck-fs,18px) * .6);letter-spacing:.05em;line-height:1.45;white-space:nowrap;}
.ck-s b{font-weight:700;letter-spacing:.14em;text-transform:uppercase;margin-right:.5em;}
.ck-s .zh{font-family:"PingFang SC","Hiragino Sans GB","Noto Sans CJK SC","Noto Sans SC","Microsoft YaHei",sans-serif;letter-spacing:.1em;margin-right:.35em;}
.ck-roll{position:absolute;top:-3px;bottom:-3px;left:0;width:16px;margin-left:-8px;border-radius:8px;pointer-events:none;
  background:linear-gradient(90deg,#c9c0ad 0%,#f2ecdd 28%,#fffdf7 48%,#ece4d2 70%,#b9af9b 100%);box-shadow:2px 0 4px rgba(0,0,0,.25);}
`;

// Coin with a square hole: the little mark printed at each end of the fortune.
const MARK = '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="8.2" fill="none" stroke="currentColor" stroke-width="1.6"/><rect x="7.2" y="7.2" width="5.6" height="5.6" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M10 2.5v3M10 14.5v3M2.5 10h3M14.5 10h3" stroke="currentColor" stroke-width="1.2"/></svg>';

// A cut paper edge: straight-ish on top and bottom, a little ragged at the scissor ends.
function edgeMask(R) {
  const pts = [];
  const N = 26;
  for (let i = 0; i <= N; i++) pts.push([i / N * 100, 0.6 + R() * 1.4]);
  for (let i = 1; i < 10; i++) pts.push([99.2 + R() * 0.8 - (i % 2) * 0.5, i / 10 * 100]);
  for (let i = N; i >= 0; i--) pts.push([i / N * 100, 99.4 - R() * 1.4]);
  for (let i = 9; i >= 1; i--) pts.push([R() * 0.8 + (i % 2) * 0.5, i / 10 * 100]);
  const d = 'M' + pts.map((p) => p[0].toFixed(2) + ' ' + p[1].toFixed(2)).join('L') + 'Z';
  return 'url("data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none"><path d="' + d + '"/></svg>') + '")';
}

// ── The crinkle of cellophane (Kit has no sound for it): a burst of tiny, sharp, high
// crackles in little clusters, made fresh each time so no two tears sound the same.
let cctx = null;
function crinkleCtx() {
  try {
    if (localStorage.getItem('gn_sound') === '0') return null;
    if (!cctx) { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null; cctx = new AC(); }
    if (cctx.state === 'suspended') cctx.resume().catch(() => {});
    return cctx;
  } catch (e) { return null; }
}
function crinkle(dur, vol) {
  const a = crinkleCtx(); if (!a) return;
  try {
    const sr = a.sampleRate, n = Math.floor(sr * dur), buf = a.createBuffer(1, n, sr), d = buf.getChannelData(0);
    const groups = Math.max(3, Math.round(dur * 22));
    for (let gi = 0; gi < groups; gi++) {
      const gt = Math.pow(Math.random(), 1.3), gs = Math.floor(gt * n), clicks = 3 + Math.floor(Math.random() * 9);
      const ga = (0.25 + Math.random() * 0.75) * (1 - 0.55 * gt);
      for (let i = 0; i < clicks; i++) {
        const s0 = gs + Math.floor(Math.random() * sr * 0.03), len = Math.floor(sr * (0.0005 + Math.random() * 0.0035));
        const amp = ga * (0.15 + Math.pow(Math.random(), 2.5) * 0.85), tau = len * (0.15 + Math.random() * 0.3);
        for (let j = 0; j < len && s0 + j < n; j++) d[s0 + j] += amp * (Math.random() * 2 - 1) * Math.exp(-j / tau);
      }
    }
    const src = a.createBufferSource(); src.buffer = buf;
    const hp = a.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1700;
    const pk = a.createBiquadFilter(); pk.type = 'peaking'; pk.frequency.value = 4600; pk.Q.value = 0.9; pk.gain.value = 5;
    const lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 10500;
    const g = a.createGain(); g.gain.value = 0.3 * (vol == null ? 1 : vol);
    src.connect(hp); hp.connect(pk); pk.connect(lp); lp.connect(g); g.connect(a.destination); src.start();
  } catch (e) {}
}

const ease = {
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outBack: (t) => { const c = 1.6; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
  inCubic: (t) => t * t * t
};
const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);

export default {
  id: 'cookie',
  name: 'Fortune Cookie',
  blurb: 'Pick a cookie, unwrap it, crack it open',
  rules: '<h3>Fortune Cookie</h3>' +
    '<p>A table full of fresh fortune cookies, each in its own cellophane wrapper. <b>Tap one</b> to pick it up: the wrapper tears open and comes off. <b>Tap the cookie again</b> to crack it. It snaps in two and the paper slip unrolls with your fortune.</p>' +
    '<ul><li>Every slip has a fortune, six <b>lucky numbers</b> and a <b>Learn Chinese</b> word with how to say it.</li>' +
    '<li>Tap the table or <b>Another cookie</b> to put the slip away. The table restocks itself.</li>' +
    '<li><b>Add a cookie</b> drops another cookie on the table. Hold it to keep pouring, up to 40. The arrow button sets the table back to a dozen.</li>' +
    '<li>You won’t see the same fortune twice until you’ve read most of them.</li></ul>',
  mount
};

function mount(stage, api) {
  const Kit = (api && api.Kit) || window.Kit;
  const sfx = (n, v) => { try { Kit && Kit.sfx(n, v); } catch (e) {} };
  const haptic = (k) => { try { Kit && Kit.haptic(k); } catch (e) {} };
  const disposables = [];
  const keep = (x) => { disposables.push(x); return x; };

  // ── DOM ──────────────────────────────────────────────────────────────
  let styleEl = document.getElementById('ck-style');
  if (!styleEl) { styleEl = document.createElement('style'); styleEl.id = 'ck-style'; styleEl.textContent = CSS; document.head.appendChild(styleEl); }
  const root = document.createElement('div'); root.className = 'ck';
  const hint = document.createElement('div'); hint.className = 'ck-hint ck-plq'; hint.textContent = 'Choose a cookie';
  // after a cookie is opened: one plaque with "Another cookie"
  const acts = document.createElement('div'); acts.className = 'ck-bar off';
  const newBtn = document.createElement('button'); newBtn.type = 'button'; newBtn.className = 'ck-b';
  newBtn.innerHTML = (Kit ? Kit.icon('sync') : '') + '<span class="t"><span class="l">Another cookie</span></span>';
  const actsPlq = document.createElement('div'); actsPlq.className = 'ck-plq'; actsPlq.appendChild(newBtn); acts.appendChild(actsPlq);
  // at the table: "Add a cookie" (hold to keep pouring) and, once there are extras, back to a dozen
  const more = document.createElement('div'); more.className = 'ck-bar';
  const moreBtn = document.createElement('button'); moreBtn.type = 'button'; moreBtn.className = 'ck-b';
  const resetBtn = document.createElement('button'); resetBtn.type = 'button'; resetBtn.className = 'ck-b rs';
  resetBtn.setAttribute('aria-label', 'Back to a dozen cookies'); resetBtn.title = 'Back to a dozen cookies';
  resetBtn.innerHTML = Kit ? Kit.icon('undo') : '';
  const morePlq = document.createElement('div'); morePlq.className = 'ck-plq'; morePlq.appendChild(moreBtn); morePlq.appendChild(resetBtn); more.appendChild(morePlq);
  const live = document.createElement('div'); live.className = 'sr-only'; live.setAttribute('aria-live', 'polite');
  stage.appendChild(root);

  // ── Renderer and scene ───────────────────────────────────────────────
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' }); }
  catch (e) { root.remove(); throw e; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const canvas = renderer.domElement;
  canvas.setAttribute('tabindex', '0');
  canvas.setAttribute('role', 'application');
  canvas.setAttribute('aria-label', 'A table of fortune cookies, each in a cellophane wrapper. Tap one, or press Enter, to unwrap it; tap again to crack it open.');
  root.appendChild(canvas); root.appendChild(hint); root.appendChild(more); root.appendChild(acts); root.appendChild(live);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#1a0905');
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envRT = pmrem.fromScene(new RoomEnvironment(renderer), 0.04);
  pmrem.dispose();
  scene.environment = envRT.texture;
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 200);
  const ELEV = 56 * Math.PI / 180;

  // Warm pendant light above the table, plus a soft fill
  const hemi = new THREE.HemisphereLight('#ffeedd', '#2a120a', 0.35); scene.add(hemi);
  const key = new THREE.SpotLight('#ffe6c4', 260, 0, 0.62, 0.85, 1.6);
  key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02; key.shadow.radius = 5;
  key.shadow.camera.near = 4; key.shadow.camera.far = 40;
  scene.add(key); scene.add(key.target);
  const fill = new THREE.DirectionalLight('#ffd9b0', 0.25); fill.position.set(6, 5, 8); scene.add(fill);

  // The table
  const woodTex = keep(new THREE.CanvasTexture(woodCanvas()));
  woodTex.colorSpace = THREE.SRGBColorSpace; woodTex.wrapS = woodTex.wrapT = THREE.RepeatWrapping;
  woodTex.repeat.set(5, 5); woodTex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const tableMat = keep(new THREE.MeshPhysicalMaterial({ map: woodTex, roughness: 0.56, clearcoat: 0.18, clearcoatRoughness: 0.35, envMapIntensity: 0.06 }));
  const table = new THREE.Mesh(keep(new THREE.PlaneGeometry(60, 60)), tableMat);
  table.rotation.x = -Math.PI / 2; table.receiveShadow = true; scene.add(table);

  // The tablecloth: laid a little askew so one corner of the wood shows (top left of the view).
  // Built in its own frame: the cloth's corner at the origin, the cloth running off along +x and +z.
  const CLOTH = 60, BW = 0.95, aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const dm = damaskCanvas();
  const silkTex = keep(new THREE.CanvasTexture(dm.map)), silkBump = keep(new THREE.CanvasTexture(dm.bump));
  silkTex.colorSpace = THREE.SRGBColorSpace;
  for (const t of [silkTex, silkBump]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(CLOTH / 3.2, CLOTH / 3.2); t.anisotropy = aniso; }
  const silkMat = keep(new THREE.MeshPhysicalMaterial({ map: silkTex, bumpMap: silkBump, bumpScale: 0.6, roughness: 0.62,
    sheen: 0.8, sheenColor: new THREE.Color('#ff9c86'), sheenRoughness: 0.42, envMapIntensity: 0.12 }));
  const cloth = new THREE.Group();
  const field = new THREE.Mesh(keep(new THREE.PlaneGeometry(CLOTH, CLOTH)), silkMat);
  field.rotation.x = -Math.PI / 2; field.position.set(CLOTH / 2, 0.006, CLOTH / 2); field.receiveShadow = true;
  cloth.add(field);
  const bd = bandCanvases(), cn = cornerCanvases();
  function trimMat(c, len) {
    const map = keep(new THREE.CanvasTexture(c.map)), mr = keep(new THREE.CanvasTexture(c.mr));
    map.colorSpace = THREE.SRGBColorSpace;
    for (const t of [map, mr]) { t.anisotropy = aniso; if (len) { t.wrapS = THREE.RepeatWrapping; t.repeat.set(len, 1); } }
    return keep(new THREE.MeshPhysicalMaterial({ map, roughnessMap: mr, metalnessMap: mr, roughness: 1, metalness: 1,
      sheen: 0.5, sheenColor: new THREE.Color('#ff9c86'), sheenRoughness: 0.5, envMapIntensity: 0.9, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  }
  const L = CLOTH - BW, reps = L / (BW * BAND_W / BAND_H);
  const bandGeo = keep(new THREE.PlaneGeometry(L, BW));
  const topBand = new THREE.Mesh(bandGeo, trimMat(bd, reps));
  topBand.rotation.x = -Math.PI / 2; topBand.position.set(BW + L / 2, 0.009, BW / 2); topBand.receiveShadow = true;
  const leftBand = new THREE.Mesh(bandGeo, topBand.material);
  leftBand.rotation.set(-Math.PI / 2, Math.PI / 2, 0, 'YXZ'); leftBand.position.set(BW / 2, 0.009, BW + L / 2); leftBand.receiveShadow = true;
  const corner = new THREE.Mesh(keep(new THREE.PlaneGeometry(BW, BW)), trimMat(cn, 0));
  corner.rotation.x = -Math.PI / 2; corner.position.set(BW / 2, 0.009, BW / 2); corner.receiveShadow = true;
  cloth.add(topBand, leftBand, corner);
  // a soft shadow on the wood where the cloth's edge lies, so it sits on the table
  const edgeTex = keep(new THREE.CanvasTexture(edgeShadowCanvas()));
  const edgeMat = keep(new THREE.MeshBasicMaterial({ map: edgeTex, transparent: true, depthWrite: false, opacity: 0.6 }));
  const SW = 0.32, edgeGeo = keep(new THREE.PlaneGeometry(CLOTH, SW));
  const topShadow = new THREE.Mesh(edgeGeo, edgeMat);
  topShadow.rotation.x = -Math.PI / 2; topShadow.position.set(CLOTH / 2, 0.003, -SW / 2);
  const leftShadow = new THREE.Mesh(edgeGeo, edgeMat);
  leftShadow.rotation.set(-Math.PI / 2, Math.PI / 2, 0, 'YXZ'); leftShadow.position.set(-SW / 2, 0.003, CLOTH / 2);
  cloth.add(topShadow, leftShadow);
  cloth.rotation.y = -0.16;
  scene.add(cloth);

  const blobTex = keep(new THREE.CanvasTexture(blobCanvas()));
  const blobGeo = keep(new THREE.PlaneGeometry(1, 1));
  const slipTex = keep(new THREE.CanvasTexture(slipCanvas())); slipTex.colorSpace = THREE.SRGBColorSpace;
  const slipGeo = keep(new THREE.PlaneGeometry(1, 0.2, 8, 1));
  const crumbGeo = keep(new THREE.IcosahedronGeometry(1, 0));

  // Three cookie skins, shared out among the cookies
  const skins = [11, 23, 37].map((s) => {
    const c = cookieCanvas(s);
    const map = keep(new THREE.CanvasTexture(c.map)); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 4;
    const bump = keep(new THREE.CanvasTexture(c.bump));
    return { map, bump };
  });

  // Cellophane: one crumpled-film tile and one material shared by every pack; four pack shapes
  const crk = crinkleCanvases(4242);
  const filmN = keep(new THREE.CanvasTexture(crk.normal)), filmF = keep(new THREE.CanvasTexture(crk.frost));
  for (const t of [filmN, filmF]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; }
  const filmMat = keep(filmMaterial(filmN, filmF));
  const WRAPS = [101, 202, 303, 404].map((sd) => { const V = wrapperShape(rng(sd)); const g = wrapperGeometries(V); g.forEach(keep); return { V, g }; });

  // ── Cookies ──────────────────────────────────────────────────────────
  let seedN = (Date.now() & 0xffff) + 1;
  const cookies = [];
  const pickables = [];

  function makeCookie(x, z, scale) {
    const R = rng(seedN++ * 2654435761);
    const P = { B: 1.2 + R() * 0.25, A: 0.25 + R() * 0.08, lp: 0.66 + R() * 0.1, lq: 0.8, cf: 0.05 + R() * 0.05, bf: 0.3 + R() * 0.12, wf: 0.3 + R() * 0.1, H: 0.86 + R() * 0.14, T: 0.036 };
    const F = cookieShape(P);
    const j1 = R() * 10, j2 = R() * 10;
    const jag = (w) => 0.045 * Math.sin(w * 7.3 + j1) + 0.022 * Math.sin(w * 19.7 + j2) + 0.01 * Math.sin(w * 41 + j1 * 2);
    const skin = skins[Math.floor(R() * skins.length)];
    // bake colour: some paler, some more golden
    const base = new THREE.Color().setHSL(0.1 + (R() - 0.5) * 0.025, 0.5 + R() * 0.3, 0.84 + R() * 0.12);
    const mat = new THREE.MeshPhysicalMaterial({ map: skin.map, bumpMap: skin.bump, bumpScale: 1.2, color: base.clone(),
      roughness: 0.52, clearcoat: 0.2, clearcoatRoughness: 0.45, sheen: 0.3, sheenColor: new THREE.Color('#e8a250'), sheenRoughness: 0.6,
      side: THREE.DoubleSide, envMapIntensity: 0.32 });
    const body = new THREE.Group();
    const halves = [];
    for (const side of [-1, 1]) {
      const geo = halfGeometry(F, side, P, jag);
      const m = new THREE.Mesh(geo, mat);
      m.castShadow = true; m.receiveShadow = true;
      const hinge = new THREE.Group(); hinge.add(m);   // the crease is the hinge each half swings on
      body.add(hinge);
      halves.push({ mesh: m, hinge });
    }
    // the slip, tucked inside with one end poking out of a horn
    const sideS = R() < 0.5 ? -1 : 1;
    const slipMat = new THREE.MeshStandardMaterial({ map: slipTex, roughness: 0.8, side: THREE.DoubleSide });
    const slip = new THREE.Mesh(slipGeo, slipMat);
    const a = { x: 0, y: 0, z: 0 }, b = { x: 0, y: 0, z: 0 };
    F(sideS * 0.86, -0.3, a); F(sideS * 0.86, 0.3, b);
    const th = sideS * 0.86 * P.B;
    slip.position.set((a.x + b.x) / 2 + Math.cos(th) * sideS * 0.12, (a.y + b.y) / 2 + Math.sin(th) * sideS * 0.12, 0.24 * P.H);
    slip.rotation.set(Math.PI / 2, 0, th + (R() - 0.5) * 0.2);
    slip.scale.set(0.42, 0.42, 1);
    slip.castShadow = true;
    slip.visible = R() < 0.6;
    body.add(slip);
    // stand the cookie up (its fold height becomes "up") and centre it
    body.rotation.x = -Math.PI / 2;
    const pose = new THREE.Group(); pose.add(body);
    const rootG = new THREE.Group(); rootG.add(pose);
    body.updateMatrixWorld(true);
    const bb = new THREE.Box3().setFromObject(body, true), ctr = bb.getCenter(new THREE.Vector3());
    body.position.sub(ctr);
    // resting pose: mostly showing the creased front to the room, some leaning back, a few face down
    const r = R();
    const tilt = r < 0.6 ? 0.95 + R() * 0.45 : r < 0.85 ? 0.3 + R() * 0.5 : -0.1 + R() * 0.3;
    const yaw = Math.PI + (R() - 0.5) * 2.6 + (R() < 0.2 ? Math.PI : 0);
    pose.rotation.set(tilt, yaw, (R() - 0.5) * 0.35, 'YXZ');
    pose.updateMatrixWorld(true);
    const wrap = wrapCookie(R, pose, halves, slip);
    // turn the cookie (in its pack) so the pack overlaps its neighbours' packs as little as possible
    const turn = bestTurn(wrap.pk, x, z, scale);
    pose.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), turn));
    pose.updateMatrixWorld(true);
    const pack = packAt(wrap.pk, x, z, scale, turn);
    rootG.scale.setScalar(scale);
    rootG.updateMatrixWorld(true);
    const bb2 = new THREE.Box3().setFromObject(pose, true);
    rootG.position.set(x, -bb2.min.y, z);
    const blob = new THREE.Mesh(blobGeo, new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false, opacity: 0.85 }));
    blob.rotation.x = -Math.PI / 2;
    const fw = (bb2.max.x - bb2.min.x), fd = (bb2.max.z - bb2.min.z);
    blob.scale.set(fw * 1.15, fd * 1.15, 1);
    blob.position.set(x, 0.004, z);
    blob.renderOrder = 1;
    scene.add(blob); scene.add(rootG);
    const c = { root: rootG, pose, body, halves, slip, mat, blob, base, x, z, scale, restY: rootG.position.y,
      restQ: pose.quaternion.clone(), w: (bb.max.x - bb.min.x) * scale, blobS: blob.scale.clone(), wob: null, hop: null, drop: null, dim: 1, alive: true, P, wrap, pack };
    halves.forEach((h) => { h.mesh.userData.cookie = c; pickables.push(h.mesh); });
    wrap.meshes.forEach((m) => { m.userData.cookie = c; pickables.push(m); });
    return c;
  }
  // Fit a cellophane pack around a cookie lying in its resting pose. The pack lies flat on the
  // table, its long axis along the cookie's horns; it is sized so the cookie sits inside with
  // a little slack (checked against the pack's top at every vertex). The pack hangs off the
  // cookie's pose group, so it moves with every wobble, hop and drop.
  const _v = new THREE.Vector3();
  function wrapCookie(R, pose, halves, slip) {
    const hx = _v.set(1, 0, 0).applyQuaternion(pose.quaternion);
    const phi = Math.atan2(-hx.z, hx.x) + (R() < 0.5 ? Math.PI : 0);
    const cs = Math.cos(phi), sn = Math.sin(phi);
    const pts = [];
    const add = (p) => pts.push(p.x * cs - p.z * sn, p.y, p.x * sn + p.z * cs);
    for (const h of halves) {
      const pa = h.mesh.geometry.attributes.position, mw = h.mesh.matrixWorld;
      for (let k = 0; k < pa.count; k += 2) add(_v.fromBufferAttribute(pa, k).applyMatrix4(mw));
    }
    if (slip.visible) for (const [a, b] of [[-0.5, -0.1], [0.5, -0.1], [-0.5, 0.1], [0.5, 0.1]]) add(_v.set(a, b, 0).applyMatrix4(slip.matrixWorld));
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, z0 = 1e9, z1 = -1e9;
    for (let k = 0; k < pts.length; k += 3) {
      x0 = Math.min(x0, pts[k]); x1 = Math.max(x1, pts[k]); y0 = Math.min(y0, pts[k + 1]); y1 = Math.max(y1, pts[k + 1]); z0 = Math.min(z0, pts[k + 2]); z1 = Math.max(z1, pts[k + 2]);
    }
    const W = WRAPS[Math.floor(R() * WRAPS.length)], V = W.V;
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    const Sx = (x1 - x0) / 2 / 0.9 * (1 + R() * 0.05), Sz = (z1 - z0) / 2 / 0.9 * (1 + R() * 0.06);
    let Sy = (y1 - y0) * 1.05;
    for (let k = 0; k < pts.length; k += 3) {
      const top = Math.max(0.2, wrapTop(V, (pts[k] - cx) / Sx, (pts[k + 2] - cz) / Sz));
      Sy = Math.max(Sy, (pts[k + 1] - y0) / (0.9 * top));
    }
    Sy = Math.min(Sy, (y1 - y0) * 1.9) * (1.03 + R() * 0.06);
    const g = new THREE.Group();
    const inv = pose.quaternion.clone().invert();
    g.position.set(cx * cs + cz * sn, y0, -cx * sn + cz * cs).applyQuaternion(inv);
    g.quaternion.copy(inv).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), phi));
    const meshes = W.g.map((geo) => { const m = new THREE.Mesh(geo, filmMat); m.scale.set(Sx, Sy, Sz); m.renderOrder = 2; g.add(m); return m; });
    pose.add(g);
    // footprint on the table (before the cookie's scale and place): centre, long-axis angle, half sizes
    const pk = { cx: cx * cs + cz * sn, cz: -cx * sn + cz * cs, ang: phi, hl: Sx * (1 + V.Lf), hw: Sz * V.Wf };
    return { g, meshes, S: new THREE.Vector3(Sx, Sy, Sz), pk, on: true };
  }
  function packAt(pk, x, z, scale, turn) {
    const c = Math.cos(turn), s = Math.sin(turn);
    return { x: x + (pk.cx * c + pk.cz * s) * scale, z: z + (-pk.cx * s + pk.cz * c) * scale, ang: pk.ang + turn, hl: pk.hl * scale, hw: pk.hw * scale };
  }
  // packs as capsules (a segment along the long axis, the half-width as radius)
  function capsule(p) {
    const dx = Math.cos(p.ang), dz = -Math.sin(p.ang), h = Math.max(0, p.hl - p.hw * 0.7);
    return [p.x - dx * h, p.z - dz * h, p.x + dx * h, p.z + dz * h, p.hw];
  }
  function ptSeg(px, pz, ax, az, bx, bz) {
    const vx = bx - ax, vz = bz - az, l2 = vx * vx + vz * vz;
    const t = l2 ? Math.max(0, Math.min(1, ((px - ax) * vx + (pz - az) * vz) / l2)) : 0;
    return Math.hypot(px - ax - vx * t, pz - az - vz * t);
  }
  function segSeg(a, b) {
    const cr = (ax, az, bx, bz, cx, cz) => (bx - ax) * (cz - az) - (bz - az) * (cx - ax);
    const d1 = cr(a[0], a[1], a[2], a[3], b[0], b[1]), d2 = cr(a[0], a[1], a[2], a[3], b[2], b[3]);
    const d3 = cr(b[0], b[1], b[2], b[3], a[0], a[1]), d4 = cr(b[0], b[1], b[2], b[3], a[2], a[3]);
    if (d1 * d2 < 0 && d3 * d4 < 0) return 0;
    return Math.min(ptSeg(a[0], a[1], b[0], b[1], b[2], b[3]), ptSeg(a[2], a[3], b[0], b[1], b[2], b[3]),
      ptSeg(b[0], b[1], a[0], a[1], a[2], a[3]), ptSeg(b[2], b[3], a[0], a[1], a[2], a[3]));
  }
  function overlap(p, q) { const a = capsule(p), b = capsule(q); return Math.max(0, a[4] + b[4] - segSeg(a, b)); }
  function bestTurn(pk, x, z, scale) {
    const near = cookies.filter((k) => k.alive && k.pack && Math.hypot(k.pack.x - x, k.pack.z - z) < (pk.hl * scale + k.pack.hl) * 1.1);
    if (!near.length) return 0;
    let best = 0, bp = 1e9;
    for (let i = 0; i <= 20; i++) {
      const t = (i % 2 ? 1 : -1) * Math.ceil(i / 2) * 0.1;   // 0, -0.1, 0.1, -0.2 ... within +-1 rad
      const p = packAt(pk, x, z, scale, t);
      let pen = Math.abs(t) * 0.02;
      for (const k of near) pen += overlap(p, k.pack);
      if (pen < bp - 1e-6) { bp = pen; best = t; }
    }
    return best;
  }
  function freeCookie(c) {
    c.alive = false;
    scene.remove(c.root); scene.remove(c.blob);
    c.wrap.meshes.forEach((m) => { if (m.parent) m.parent.remove(m); const i = pickables.indexOf(m); if (i >= 0) pickables.splice(i, 1); });
    c.halves.forEach((h) => { h.mesh.geometry.dispose(); const i = pickables.indexOf(h.mesh); if (i >= 0) pickables.splice(i, 1); });
    c.mat.dispose(); c.slip.material.dispose(); c.blob.material.dispose();
    const i = cookies.indexOf(c); if (i >= 0) cookies.splice(i, 1);
  }

  // ── Camera and layout ────────────────────────────────────────────────
  let W = 1, H = 1, layoutKey = '', dead = false;
  const tanV = () => Math.tan(camera.fov / 2 * Math.PI / 180);
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const tablePlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  // The camera backs off until the visible table holds about a dozen cookies, whatever the screen shape.
  // "More cookies" adds up to MAX; the camera eases back a little to make room for each one.
  const COUNT = 11, PER = 4.4, PER_MORE = 3.6, MAX = 40, MORE_KEY = 'fortune_cookie_more';
  let baseD = 10, baseN = COUNT, camD = 0, camTo = 0;
  let extra = Math.max(0, Math.min(MAX, parseInt(lsGet(MORE_KEY), 10) || 0));
  const total = () => Math.min(MAX, baseN + extra);
  const distFor = (n) => baseD * Math.sqrt((baseN * PER + Math.max(0, n - baseN) * PER_MORE) / (baseN * PER));
  function placeCamera(d) {
    camera.position.set(0, d * Math.sin(ELEV), d * Math.cos(ELEV));
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix(); camera.updateMatrixWorld();
  }
  function setCam(d) {
    camD = d; placeCamera(d);
    key.position.set(-0.22 * d, 1.25 * d, -0.1 * d); key.target.position.set(0, 0, -0.04 * d);
    key.shadow.camera.far = d * 3; key.shadow.camera.updateProjectionMatrix();
  }
  // A point on the table under the screen point (x, y) as seen from camera distance d. The camera
  // always looks at the origin from the same angle, so the visible table simply scales with d.
  function onTableAt(x, y, d) {
    const p = onTable(x, y); if (!p) return null;
    return p.multiplyScalar(d / camD);
  }
  function tableArea() {
    const c = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map((q) => onTable(q[0] * 0.9, q[1] < 0 ? -0.84 : 0.74));
    let a = 0;
    for (let i = 0; i < 4; i++) { const p = c[i], q = c[(i + 1) % 4]; a += p.x * q.z - q.x * p.z; }
    return Math.abs(a) / 2;
  }
  function fitCamera() {
    camera.aspect = W / H;
    placeCamera(10); camD = 10;
    // enough table for the cookies, and at least ~4 cookies across the middle of the screen
    const a = onTable(-1, 0), b = onTable(1, 0);
    const across = a && b ? a.distanceTo(b) : 10;
    baseD = Math.max(10 * Math.sqrt(COUNT * PER / tableArea()), 10 * 6.6 / across);
    setCam(baseD);
    baseN = Math.max(9, Math.min(12, Math.round(tableArea() / PER)));
    key.angle = 0.62; key.distance = 0; key.decay = 0; key.intensity = 2.7;
    // the cloth's corner sits toward the top left of the starting view
    const cc = onTable(-0.6, 0.56);
    if (cc) cloth.position.set(cc.x, 0, cc.z);
    camTo = distFor(total());
    setCam(camTo);
  }
  function onTable(x, y, out) {
    ndc.set(x, y); ray.setFromCamera(ndc, camera);
    return ray.ray.intersectPlane(tablePlane, out || new THREE.Vector3());
  }
  // The most open spot on the visible table (as seen from camera distance d), away from `pts`.
  function freeSpot(pts, d, tries) {
    let best = null, bestD = -1;
    for (let t = 0; t < tries; t++) {
      const p = onTableAt(-0.86 + Math.random() * 1.72, -0.8 + Math.random() * 1.5, d);
      if (!p) continue;
      let dmin = 1e9;
      for (const q of pts) dmin = Math.min(dmin, Math.hypot(p.x - q.x, p.z - q.z));
      if (dmin > bestD) { bestD = dmin; best = { x: p.x, z: p.z }; }
    }
    return best;
  }
  function placeAll() {
    cookies.slice().forEach(freeCookie);
    const n = total(), sc = 1, pts = [];
    for (let k = 0; k < n; k++) { const p = freeSpot(pts, camTo, 40); if (p) pts.push(p); }
    pts.sort((a, b) => a.z - b.z);   // far ones first, so near ones draw over them
    pts.forEach((p) => cookies.push(makeCookie(p.x, p.z, sc * (0.82 + Math.random() * 0.12))));
  }
  // "More cookies": one more drops onto the table each time (up to MAX); the camera eases back to make room.
  function addCookie() {
    if (state !== 'idle' || C || total() >= MAX) return false;
    extra = Math.min(MAX - baseN, extra + 1); lsSet(MORE_KEY, String(extra));
    camTo = distFor(total());
    const p = freeSpot(cookies.map((c) => ({ x: c.x, z: c.z })), camTo, 160);
    if (!p) return false;
    const nc = makeCookie(p.x, p.z, 0.82 + Math.random() * 0.12);
    nc.drop = { t0: T };
    cookies.push(nc);
    for (const k of cookies) if (k !== nc) { const d = Math.hypot(k.x - p.x, k.z - p.z); if (d < 6) k.hop = { t0: T + 0.42 + d * 0.06 }; }
    sfx('whoosh', 0.35);
    moreLabel(); kick();
    return true;
  }
  // Back to the usual dozen: the extras are cleared and the table is set again.
  function resetTable() {
    if (state !== 'idle' || C) return;
    extra = 0; lsSet(MORE_KEY, '0');
    camTo = distFor(total());
    clearCrumbs();
    placeAll(); cookies.forEach((k, i) => { k.drop = { t0: T + 0.25 + i * 0.05 }; });
    sfx('whoosh'); haptic('medium');
    moreLabel(); kick();
  }

  // ── Render loop: only while something moves ──────────────────────────
  let raf = 0, last = 0, T = 0, hold = false;
  function kick() {
    if (raf || dead || document.hidden || hold) return;
    last = performance.now() - 16;
    raf = requestAnimationFrame(frame);
  }
  function frame(now) {
    raf = 0;
    if (dead || document.hidden) return;
    if (now - last < 12) { raf = requestAnimationFrame(frame); return; }
    const dt = Math.min(0.05, (now - last) / 1000); last = now; T += dt;
    const busy = update(dt);
    renderer.render(scene, camera);
    if (busy) raf = requestAnimationFrame(frame);
  }

  // ── Per-cookie motion: wobble, hop, drop-in ──────────────────────────
  const tq = new THREE.Quaternion(), te = new THREE.Euler(), yAxis = new THREE.Vector3(0, 1, 0);
  function bounce(t) {
    const n = 7.5625, d = 2.75;
    if (t < 1 / d) return n * t * t;
    if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
    if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
    return n * (t -= 2.625 / d) * t + 0.984375;
  }
  function wobble(c, amp) { if (c && c !== openC) { c.wob = { t0: T, amp }; kick(); } }
  function idleMotion(c) {
    let busy = false, y = c.restY, ax = 0, az = 0, spin = 0;
    if (c.wob) {
      const t = T - c.wob.t0;
      if (t > 1.3) c.wob = null;
      else { const a = c.wob.amp * Math.exp(-t * 4.2) * Math.sin(t * 24); az += a; ax += a * 0.45; y += Math.max(0, c.wob.amp * 0.8 * Math.exp(-t * 7) * Math.sin(t * 24)) * 0.6; busy = true; }
    }
    if (c.hop) {
      const t = T - c.hop.t0;
      if (t > 0.34) { c.hop = null; c.wob = { t0: T, amp: 0.05 }; busy = true; }
      else if (t > 0) { const u = t / 0.34; y += 0.22 * c.scale * Math.sin(Math.PI * u); az += 0.08 * Math.sin(Math.PI * u); busy = true; }
      else busy = true;
    }
    if (c.drop) {
      const t = T - c.drop.t0, D = 0.75;
      if (t >= D) { c.drop = null; c.wob = { t0: T, amp: 0.09 }; sfx('tap'); haptic('light'); busy = true; }
      else if (t > 0) { const e = bounce(t / D); y += 4.2 * (1 - e); spin = 2.8 * (1 - ease.outCubic(t / D)); busy = true; }
      else { y += 4.2; busy = true; }
      const hgt = y - c.restY;
      c.blob.material.opacity = 0.85 * Math.max(0.15, 1 - hgt / 4);
      c.blob.scale.copy(c.blobS).multiplyScalar(1 + hgt * 0.15);
    }
    c.root.position.y = y;
    te.set(ax, spin, az, 'XYZ'); tq.setFromEuler(te);
    c.pose.quaternion.copy(tq).multiply(c.restQ);
    return busy;
  }

  // ── Dimming the rest of the table while a cookie is open ─────────────
  let dimNow = 1, dimTo = 1;
  // a dark veil hovering just above the table: everything under it dims, the lifted cookie rises above it
  const veilMat = keep(new THREE.MeshBasicMaterial({ color: '#0c0402', transparent: true, opacity: 0, depthWrite: false }));
  const veil = new THREE.Mesh(keep(new THREE.PlaneGeometry(200, 200)), veilMat);
  veil.rotation.x = -Math.PI / 2; veil.position.y = 1.6; veil.renderOrder = 5; veil.visible = false;
  scene.add(veil);
  function applyDim() {
    veilMat.opacity = (1 - dimNow) * 0.95;
    veil.visible = veilMat.opacity > 0.004;
  }

  // ── Crumbs ───────────────────────────────────────────────────────────
  const crumbs = [];
  function spawnCrumbs(c, origin, right) {
    const n = 14 + Math.floor(Math.random() * 6);
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(crumbGeo, c.mat);
      const s = (0.016 + Math.random() * 0.032) * c.scale;
      m.scale.set(s * (0.7 + Math.random() * 0.8), s * (0.5 + Math.random() * 0.6), s * (0.7 + Math.random() * 0.8));
      m.position.copy(origin).addScaledVector(right, (Math.random() - 0.5) * 0.25).add(new THREE.Vector3(0, (Math.random() - 0.3) * 0.5 * c.scale, 0));
      const side = Math.random() < 0.5 ? -1 : 1;
      const vel = right.clone().multiplyScalar(side * (0.8 + Math.random() * 2.4)).add(new THREE.Vector3(0, 1.2 + Math.random() * 2.6, 0));
      vel.add(camera.position.clone().sub(origin).normalize().multiplyScalar(Math.random() * 1.6));
      m.castShadow = true;
      scene.add(m);
      crumbs.push({ m, vel, spin: new THREE.Vector3(Math.random() * 14 - 7, Math.random() * 14 - 7, Math.random() * 14 - 7), rest: false, s: m.scale.clone(), fade: null });
    }
  }
  function updateCrumbs(dt) {
    let busy = false;
    for (let i = crumbs.length - 1; i >= 0; i--) {
      const k = crumbs[i];
      if (k.fade != null) {
        k.fade -= dt * 3;
        if (k.fade <= 0) { scene.remove(k.m); crumbs.splice(i, 1); continue; }
        k.m.scale.copy(k.s).multiplyScalar(k.fade); busy = true;
      }
      if (k.rest) continue;
      busy = true;
      k.vel.y -= 9.8 * 1.1 * dt;
      k.m.position.addScaledVector(k.vel, dt);
      k.m.rotation.x += k.spin.x * dt; k.m.rotation.y += k.spin.y * dt; k.m.rotation.z += k.spin.z * dt;
      const floor = k.m.scale.y * 0.8;
      if (k.m.position.y < floor) {
        k.m.position.y = floor;
        if (Math.abs(k.vel.y) < 0.6) { k.rest = true; continue; }
        k.vel.y = -k.vel.y * 0.32; k.vel.x *= 0.55; k.vel.z *= 0.55; k.spin.multiplyScalar(0.5);
      }
    }
    return busy;
  }
  function clearCrumbs() { crumbs.forEach((k) => { if (k.fade == null) k.fade = 1; }); }

  // ── Opening a cookie: two taps ───────────────────────────────────────
  // Tap 1 (unwrapCookie): it lifts toward you, the cellophane splits across the middle and the
  // two halves are pulled off to the sides and fall away; the bare cookie hovers ('ready').
  // Tap 2 (crackCookie): it snaps in two and the slip slides out ('opening', then 'open').
  let state = 'idle', openC = null, O = null, slipBox = null, needLayout = false;
  const LIFT = 0.6, SPLIT = 0.64, TEAR = 0.84, PULL = 0.42, READY = 1.3;   // unwrap, from tap 1
  const CRACK = 0.32, HANDOFF = 0.9, DONE = 1.75;                         // crack, from tap 2
  function presentTarget(c) {
    const a = W / H, tv = tanV(), cw = c.w;
    const portrait = a < 1;
    let D = cw / Math.min((portrait ? 0.56 : 0.34) * 2 * tv * a, (portrait ? 0.3 : 0.3) * 2 * tv);
    ndc.set(0, portrait ? 0.34 : 0.44); ray.setFromCamera(ndc, camera);
    // never further than halfway to the table, so it always clearly rises off it
    const toTable = ray.ray.distanceToPlane(tablePlane);
    if (toTable) D = Math.min(D, 0.52 * toTable);
    const pos = ray.ray.origin.clone().addScaledVector(ray.ray.direction, D);
    // creased front toward you, tipped back a little so you see over the top
    const q = camera.quaternion.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0.42, Math.PI + 0.18, 0.05, 'XYZ')));
    return { pos, q, D };
  }
  // auto: crack it as soon as it's unwrapped (automation only)
  function unwrapCookie(c, auto) {
    if (state !== 'idle' || !c || !c.alive || c.drop) return;
    state = 'unwrapping'; openC = c; c.wob = null; c.hop = null;
    const tgt = presentTarget(c);
    O = { c, t0: T, p0: c.root.position.clone(), q0: c.pose.quaternion.clone(), tgt, auto: !!auto, t1: null,
      split: false, torn: false, fl: null, nudge: -9, cracked: false, handed: false, done: false,
      fortune: nextFortune(), nums: luckyNumbers(), word: WORDS[Math.floor(Math.random() * WORDS.length)],
      slip0: { p: c.slip.position.clone(), q: c.slip.quaternion.clone(), s: c.slip.scale.x } };
    c.wrap.meshes.forEach((m) => { m.renderOrder = 6; });   // drawn after the veil, which it rises above
    dimTo = 0.4;
    hint.classList.add('off'); more.classList.add('off');
    crinkleCtx();   // wake the audio inside the tap, so the tear can be heard on iPhone
    sfx('whoosh', 0.6); haptic('light');
    kick();
  }
  function crackCookie() {
    if (state !== 'ready' || !O) return;
    state = 'opening'; O.t1 = T;
    hint.classList.add('off');
    sfx('tick', 0.6); haptic('light');
    buildSlip();
    kick();
  }
  // a tap beside the hovering cookie: it gives a little jiggle, as if to say "me!"
  function nudge() { if (state === 'ready' && O) { O.nudge = T; sfx('tick', 0.5); kick(); } }
  const v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), q1 = new THREE.Quaternion();
  const camRight = new THREE.Vector3();
  function updateOpen(dt) {
    const c = O.c, t = T - O.t0;
    let busy = t < READY + 0.1;
    // lift toward you
    const e = ease.outCubic(clamp01(t / LIFT));
    c.root.position.lerpVectors(O.p0, O.tgt.pos, e);
    c.root.position.y += Math.sin(Math.PI * clamp01(t / LIFT)) * 0.35;
    c.pose.quaternion.slerpQuaternions(O.q0, O.tgt.q, e);
    const hgt = c.root.position.y;
    c.blob.material.opacity = 0.85 * Math.max(0, 1 - hgt / 5);
    c.blob.scale.copy(c.blobS).multiplyScalar(1 + Math.min(1.6, hgt * 0.35));
    busy = updateWrap(t, dt) || busy;
    // the cookie jolts a little as the film lets go of it, and jiggles when nudged
    for (const [t0, a] of [[O.torn ? O.tornAt : -9, 1], [O.nudge, 0.7]]) {
      const k = T - t0;
      if (k >= 0 && k < 0.7) {
        const d = Math.exp(-k * 6) * a;
        q1.setFromEuler(te.set(Math.sin(k * 31) * 0.06 * d, Math.sin(k * 19) * 0.04 * d, Math.sin(k * 25) * 0.08 * d));
        c.pose.quaternion.multiply(q1); busy = true;
      }
    }
    if (state === 'unwrapping' && t >= READY) {
      state = 'ready';
      hint.textContent = 'Tap the cookie to crack it open'; hint.classList.remove('off');
      live.textContent = 'Unwrapped. Tap the cookie, or press Enter, to crack it open.';
      if (O.auto) crackCookie();
    }
    if (O.t1 == null) return busy;
    const k = T - O.t1;
    // a moment of tension: thumbs on the crease
    if (k < CRACK) {
      q1.setFromEuler(te.set(0, 0, Math.sin(k * 70) * 0.025 * (k / CRACK)));
      c.pose.quaternion.multiply(q1);
    }
    // snap!
    if (!O.cracked && k >= CRACK) {
      O.cracked = true;
      sfx('flip'); sfx('chip', 0.7); haptic('medium');
      c.body.updateMatrixWorld(true);
      const origin = c.body.localToWorld(v1.set(0, 0.05, 0.45 * c.P.H));
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
      spawnCrumbs(c, origin, right);
      // where the slip goes: out of the break, toward you, facing you
      const bodyQ = c.body.getWorldQuaternion(new THREE.Quaternion());
      O.slipQ1 = bodyQ.clone().invert().multiply(camera.quaternion.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, -0.08))));
      O.slipP1 = c.body.worldToLocal(origin.clone().addScaledVector(new THREE.Vector3(0, -1, 0).applyQuaternion(camera.quaternion), 0.55 * c.scale)
        .addScaledVector(camera.position.clone().sub(origin).normalize(), 0.5 * c.scale));
    }
    if (O.cracked) {
      const u = clamp01((k - CRACK) / 0.55), eb = ease.outBack(u), drift = ease.outCubic(clamp01((k - CRACK - 0.3) / 1.2));
      c.halves.forEach((h, i) => {
        const side = i === 0 ? -1 : 1;
        h.hinge.position.x = side * (0.14 * eb + (W > H ? 1.9 : 0.22) * drift);
        h.hinge.position.z = -0.12 * drift;
        h.hinge.rotation.set(0, side * (0.3 * eb + 0.12 * drift), side * -0.55 * eb);
      });
      const us = ease.inOut(clamp01((k - CRACK - 0.06) / (HANDOFF - CRACK - 0.06)));
      c.slip.position.lerpVectors(O.slip0.p, O.slipP1, us);
      c.slip.quaternion.slerpQuaternions(O.slip0.q, O.slipQ1, us);
      c.slip.scale.setScalar(O.slip0.s + (1.25 - O.slip0.s) * us);
    }
    if (!O.handed && k >= HANDOFF) { O.handed = true; handOff(); }
    if (!O.done && k >= DONE) { O.done = true; state = 'open'; acts.classList.remove('off'); hint.textContent = 'Tap the table to put it away'; hint.classList.remove('off'); }
    return busy || !O.done || k < DONE + 0.1;
  }
  // The cellophane coming off: a tug (the film trembles), it tears across the middle, the two
  // halves slide off the ends of the cookie, crumpling as they go, then fly off to either side.
  function updateWrap(t, dt) {
    const c = O.c, Wp = c.wrap;
    if (!Wp.on || t < SPLIT) return false;
    const S = Wp.S;
    if (!O.split) { O.split = true; crinkle(0.3, 0.45); haptic('tick'); }
    if (t < TEAR) {
      const u = (t - SPLIT) / (TEAR - SPLIT), j = 0.012 * u * Math.sin(t * 95);
      Wp.meshes.forEach((m, i) => {
        const side = i ? 1 : -1;
        m.position.x = side * (0.025 * u + j) * S.x;
        m.scale.set(S.x * (1 + 0.02 * u), S.y * (1 - 0.03 * u), S.z * (1 - 0.03 * u));
      });
      return true;
    }
    if (!O.torn) {
      O.torn = true; O.tornAt = T;
      crinkle(0.6, 1); sfx('flip', 0.5); haptic('medium');
      Wp.meshes.forEach((m) => { const i = pickables.indexOf(m); if (i >= 0) pickables.splice(i, 1); });
    }
    const k = t - TEAR;
    if (k < PULL) {
      const u = k / PULL, d = ease.inOut(u);
      Wp.meshes.forEach((m, i) => {
        const side = i ? 1 : -1;
        m.position.x = side * (0.025 + 1.15 * d) * S.x;
        m.position.y = -0.08 * d * S.y;
        m.rotation.set(0, side * 0.2 * d, side * -0.3 * d);
        m.scale.set(S.x * (1.02 - 0.12 * d), S.y * (0.97 - 0.4 * d), S.z * (0.97 - 0.22 * d));
      });
      return true;
    }
    if (!O.fl) {
      // let go: off they fly to either side of the screen and drop away
      camRight.set(1, 0, 0).applyQuaternion(camera.quaternion);
      const ctr = c.root.getWorldPosition(v1), span = 2 * tanV() * camera.aspect * O.tgt.D;
      O.fl = Wp.meshes.map((m, i) => {
        scene.attach(m);
        const side = m.position.clone().sub(ctr).dot(camRight) >= 0 ? 1 : -1;
        const v = camRight.clone().multiplyScalar(side * span * (1.1 + Math.random() * 0.3)).add(v2.set(0, span * (0.25 + Math.random() * 0.2), 0));
        return { m, v, w: new THREE.Vector3((Math.random() - 0.5) * 6, side * (2 + Math.random() * 3), side * -(3 + Math.random() * 4)), g: span * 2.6, s: m.scale.clone() };
      });
      sfx('whoosh', 0.5);
    }
    let alive = false;
    const age = k - PULL;
    for (const f of O.fl) {
      if (!f.m.visible) continue;
      f.v.y -= f.g * dt;
      f.m.position.addScaledVector(f.v, dt);
      f.m.rotation.x += f.w.x * dt; f.m.rotation.y += f.w.y * dt; f.m.rotation.z += f.w.z * dt;
      const sq = Math.max(0.45, 1 - age * 0.6);
      f.m.scale.set(f.s.x * (0.6 + 0.4 * sq), f.s.y * sq, f.s.z * sq);
      if (age > 1.6) f.m.visible = false; else alive = true;
    }
    if (!alive) Wp.on = false;
    return alive;
  }

  // ── The paper slip (DOM, so the print is crisp) ─────────────────────
  function buildSlip() {
    const R = rng((Math.random() * 1e9) | 0);
    slipBox = document.createElement('div'); slipBox.className = 'ck-slipbox';
    const ink = R() < 0.72 ? '#c3262d' : '#2550a6';
    const w = O.word;
    slipBox.innerHTML = '<div class="ck-curl"><div class="ck-slip" role="note">' +
      '<div class="ck-f">' + MARK + '<span></span>' + MARK + '</div>' +
      '<div class="ck-rule"></div>' +
      '<div class="ck-s"><b>Lucky numbers</b>' + O.nums.join('&ensp;') + '</div>' +
      '<div class="ck-s"><b>Learn Chinese</b><span class="zh" lang="zh-Hans">' + w[0] + '</span><i lang="zh-Latn-pinyin"></i> · <span class="en"></span></div>' +
      '</div><div class="ck-roll"></div></div>';
    slipBox.querySelector('.ck-f span').textContent = O.fortune;
    slipBox.querySelector('.ck-s i').textContent = w[1];
    slipBox.querySelector('.ck-s .en').textContent = w[2];
    const paper = slipBox.querySelector('.ck-slip');
    paper.style.setProperty('--ck-ink', ink);
    paper.style.setProperty('--ck-edge', edgeMask(R));
    slipBox.style.visibility = 'hidden';
    root.appendChild(slipBox);
    O.rot = (R() - 0.5) * 2.4;
    layoutSlip();
  }
  function layoutSlip() {
    if (!slipBox) return;
    const sw = Math.min(W - 28, 560), fs = Math.max(14, Math.min(22, sw / 21.5));
    slipBox.style.width = sw + 'px';
    slipBox.querySelector('.ck-slip').style.setProperty('--ck-fs', fs + 'px');
    const h = slipBox.offsetHeight || 110;
    const portrait = W < H;
    const btnRoom = 86;
    let cy = H * (portrait ? 0.63 : 0.66);
    cy = Math.min(cy, H - btnRoom - h / 2 - 8);
    slipBox.style.left = ((W - sw) / 2) + 'px';
    slipBox.style.top = (cy - h / 2) + 'px';
    O.slipRect = { x: W / 2, y: cy, w: sw, h };
  }
  function handOff() {
    const c = O.c;
    c.slip.updateMatrixWorld(true);
    const a = c.slip.localToWorld(v1.set(-0.5, 0, 0)).project(camera), b = c.slip.localToWorld(v2.set(0.5, 0, 0)).project(camera);
    const ax = (a.x + 1) / 2 * W, ay = (1 - a.y) / 2 * H, bx = (b.x + 1) / 2 * W, by = (1 - b.y) / 2 * H;
    const pw = Math.max(20, Math.hypot(bx - ax, by - ay)), r = O.slipRect;
    const s0 = pw / r.w, dx = (ax + bx) / 2 - r.x, dy = (ay + by) / 2 - r.y;
    c.slip.visible = false;
    slipBox.style.visibility = '';
    const paper = slipBox.querySelector('.ck-slip'), roll = slipBox.querySelector('.ck-roll');
    const dur = 760;
    slipBox.animate([
      { transform: `translate(${dx}px,${dy}px) scale(${s0}) rotate(-7deg)` },
      { transform: `translate(0px,0px) scale(1) rotate(${O.rot}deg)` }
    ], { duration: 560, easing: 'cubic-bezier(.2,.85,.25,1)', fill: 'both' });
    paper.animate([{ clipPath: 'inset(-20px 86% -20px -20px)' }, { clipPath: 'inset(-20px -20px -20px -20px)' }],
      { duration: dur, delay: 140, easing: 'cubic-bezier(.35,.6,.3,1)', fill: 'both' });
    roll.animate([{ left: '14%', opacity: 1 }, { left: '100%', opacity: 1, offset: 0.9 }, { left: '100%', opacity: 0 }],
      { duration: dur, delay: 140, easing: 'cubic-bezier(.35,.6,.3,1)', fill: 'both' });
    setTimeout(() => { if (!dead) sfx('deal'); }, 150);
    setTimeout(() => { if (!dead) { sfx('slide'); haptic('light'); } }, 520);
    live.textContent = O.fortune + ' Lucky numbers ' + O.nums.join(', ') + '. Learn Chinese: ' + O.word[2] + ', ' + O.word[1] + '.';
  }

  // ── Putting it away; the table restocks ──────────────────────────────
  let C = null;
  function closeCookie() {
    if (state !== 'open' && state !== 'opening') return;
    if (state === 'opening' && (!O || !O.handed)) return;
    state = 'closing';
    const c = O.c;
    C = { c, t0: T, freed: false, stocked: false, p0: c.root.position.clone() };
    acts.classList.add('off'); hint.classList.add('off');
    if (slipBox) {
      const sb = slipBox; slipBox = null;
      sb.getAnimations().forEach((a) => a.finish && a.commitStyles && (a.commitStyles(), a.cancel()));
      sb.animate([{ transform: getComputedStyle(sb).transform === 'none' ? 'none' : getComputedStyle(sb).transform, opacity: 1 },
        { transform: `translate(0px,${Math.round(H * 0.25)}px) rotate(${O.rot * 2}deg) scale(.92)`, opacity: 0 }],
        { duration: 340, easing: 'cubic-bezier(.5,0,.75,0)', fill: 'forwards' }).onfinish = () => sb.remove();
    }
    c.mat.transparent = true;
    sfx('slide'); haptic('light');
    dimTo = 1;
    clearCrumbs();
    kick();
  }
  function updateClose() {
    const c = C.c, t = T - C.t0;
    if (!C.freed) {
      const u = clamp01(t / 0.34);
      c.mat.opacity = 1 - ease.inCubic(u);
      c.root.position.copy(C.p0).add(v1.set(0, -0.6 * ease.inCubic(u), 0));
      c.root.scale.setScalar(c.scale * (1 - 0.25 * u));
      c.blob.material.opacity = 0;
      if (u >= 1) { C.freed = true; freeCookie(c); openC = null; }
    }
    if (!C.stocked && t >= 0.3) {
      C.stocked = true;
      if (needLayout) { needLayout = false; placeAll(); cookies.forEach((k, i) => { k.drop = { t0: T + i * 0.05 }; }); }
      else {
        const nc = makeCookie(c.x, c.z, c.scale);
        nc.drop = { t0: T };
        cookies.push(nc);
        // the rest of the table hops in a ripple as the new cookie lands
        for (const k of cookies) if (k !== nc) { const d = Math.hypot(k.x - c.x, k.z - c.z); k.hop = { t0: T + 0.42 + d * 0.06 }; }
      }
      state = 'idle'; O = null;
      hint.textContent = 'Choose a cookie'; hint.classList.remove('off'); more.classList.remove('off');
    }
    return !C.stocked || !C.freed;
  }

  // ── Frame update ─────────────────────────────────────────────────────
  function update(dt) {
    let busy = false;
    if (Math.abs(dimNow - dimTo) > 0.002) { dimNow += (dimTo - dimNow) * Math.min(1, dt * 7); busy = true; } else dimNow = dimTo;
    applyDim();
    if (Math.abs(camD - camTo) > 0.002) {
      setCam(Math.abs(camD - camTo) < 0.01 ? camTo : camD + (camTo - camD) * Math.min(1, dt * 2.6));
      if (O && state !== 'open' && state !== 'closing') O.tgt = presentTarget(O.c);
      busy = true;
    }
    for (const c of cookies) if (c !== openC) busy = idleMotion(c) || busy;
    if (O && state !== 'closing') busy = updateOpen(dt) || busy;
    if (C) { const b = updateClose(); if (!b) C = null; busy = b || busy; }
    busy = updateCrumbs(dt) || busy;
    return busy;
  }

  // ── Input ────────────────────────────────────────────────────────────
  function pick(e) {
    const r = canvas.getBoundingClientRect();
    ndc.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(pickables, false)[0];
    return hit ? hit.object.userData.cookie : null;
  }
  let press = null, hover = null;
  function onDown(e) {
    if (e.button > 0) return;
    try { canvas.focus({ preventScroll: true }); } catch (x) {}
    if (state === 'open') { press = { table: true, x: e.clientX, y: e.clientY }; return; }
    if (state === 'ready') { press = { ready: true, x: e.clientX, y: e.clientY }; return; }
    if (state !== 'idle') return;
    const c = pick(e);
    press = { c, x: e.clientX, y: e.clientY };
    if (c) { wobble(c, 0.11); sfx('tick', 0.6); haptic('tick'); }
  }
  function onUp(e) {
    const p = press; press = null;
    if (!p) return;
    const moved = Math.hypot(e.clientX - p.x, e.clientY - p.y) > 14;
    if (p.table) { if (!moved) closeCookie(); return; }
    if (p.ready) { if (!moved && state === 'ready') { if (nearOpen(e)) crackCookie(); else nudge(); } return; }
    if (!p.c || moved || state !== 'idle') return;
    if (pick(e) === p.c) unwrapCookie(p.c);
  }
  // on the hovering cookie, or close enough to it (it's the only thing to tap)
  function nearOpen(e) {
    if (!openC) return false;
    if (pick(e) === openC) return true;
    const r = canvas.getBoundingClientRect();
    const p = openC.root.getWorldPosition(v1).project(camera);
    const q = v2.copy(openC.root.position).addScaledVector(camRight.set(1, 0, 0).applyQuaternion(camera.quaternion), openC.w / 2).project(camera);
    const half = Math.abs(q.x - p.x) / 2 * r.width;
    const dx = e.clientX - r.left - (p.x + 1) / 2 * r.width, dy = e.clientY - r.top - (1 - p.y) / 2 * r.height;
    return Math.hypot(dx, dy) < Math.max(80, half * 1.5);
  }
  function onMove(e) {
    if (e.pointerType !== 'mouse') return;
    if (state === 'ready') { canvas.classList.toggle('hot', nearOpen(e)); return; }
    if (state !== 'idle') return;
    const c = pick(e);
    canvas.classList.toggle('hot', !!c);
    if (c !== hover) { hover = c; if (c) wobble(c, 0.05); }
  }
  function onKey(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (state === 'idle') { const live = cookies.filter((c) => !c.drop); unwrapCookie(live[Math.floor(Math.random() * live.length)]); }
      else if (state === 'ready') crackCookie();
      else if (state === 'open') closeCookie();
    } else if (e.key === 'Escape' && state === 'open') closeCookie();
  }
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', () => { press = null; });
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerleave', () => { hover = null; canvas.classList.remove('hot'); });
  canvas.addEventListener('keydown', onKey);
  newBtn.addEventListener('click', () => { sfx('tap'); closeCookie(); });
  // More cookies: a tap adds one; keep holding to keep pouring them on
  let pour = 0;
  function stopPour() { if (pour) { clearTimeout(pour); pour = 0; } }
  function pourStep(delay) { pour = setTimeout(() => { pour = 0; if (addCookie()) { haptic('tick'); pourStep(150); } }, delay); }
  moreBtn.addEventListener('pointerdown', (e) => { if (e.button > 0) return; stopPour(); if (addCookie()) { haptic('light'); pourStep(420); } });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach((ev) => moreBtn.addEventListener(ev, stopPour));
  moreBtn.addEventListener('click', (e) => { if (e.detail === 0) addCookie(); });   // keyboard
  moreBtn.addEventListener('contextmenu', (e) => e.preventDefault());
  resetBtn.addEventListener('click', () => { stopPour(); resetTable(); });
  function moreLabel() {
    const n = total(), full = n >= MAX;
    moreBtn.innerHTML = (Kit ? Kit.icon('plus') : '') + '<span class="t"><span class="l">' + (full ? 'Table is full' : 'Add a cookie') + '</span><span class="s">' + n + ' of ' + MAX + ' on the table' + (full ? '' : ' · hold for more') + '</span></span>';
    moreBtn.disabled = full;
    moreBtn.setAttribute('aria-label', full ? 'The table is full: ' + n + ' cookies' : 'Add a cookie. ' + n + ' of ' + MAX + ' on the table');
    resetBtn.hidden = extra <= 0;
  }
  const onVis = () => { if (!document.hidden) kick(); else if (raf) { cancelAnimationFrame(raf); raf = 0; } };
  document.addEventListener('visibilitychange', onVis);

  // ── Size ─────────────────────────────────────────────────────────────
  function resize() {
    const w = Math.max(1, root.clientWidth), h = Math.max(1, root.clientHeight);
    if (w === W && h === H) return;
    W = w; H = h;
    renderer.setSize(W, H, false);
    fitCamera();
    moreLabel();
    const lk = (W > H ? 'L' : 'P') + Math.round(W / H * 5);
    if (lk !== layoutKey) {
      layoutKey = lk;
      if (state === 'idle' && !C) placeAll(); else needLayout = true;
    }
    if (O) { O.tgt = presentTarget(O.c); if (state === 'open' || state === 'ready') { O.c.root.position.copy(O.tgt.pos); O.c.pose.quaternion.copy(O.tgt.q); } layoutSlip(); }
    renderer.render(scene, camera);
    kick();
  }
  const ro = new ResizeObserver(() => resize());
  ro.observe(root);
  resize();

  // ── Clean up ─────────────────────────────────────────────────────────
  function unmount() {
    if (dead) return;
    dead = true;
    if (raf) cancelAnimationFrame(raf); raf = 0;
    stopPour();
    ro.disconnect();
    document.removeEventListener('visibilitychange', onVis);
    cookies.slice().forEach(freeCookie);
    crumbs.forEach((k) => scene.remove(k.m)); crumbs.length = 0;
    disposables.forEach((d) => { try { d.dispose(); } catch (e) {} });
    envRT.dispose();
    renderer.dispose();
    try { renderer.forceContextLoss(); } catch (e) {}
    root.remove();
    if (styleEl && styleEl.parentNode) styleEl.remove();
    stage.innerHTML = '';
  }

  return {
    unmount,
    // automated checks
    test: {
      state: () => state,
      count: () => cookies.length,
      more: (n) => { let k = 0; for (let i = 0; i < (n || 1); i++) if (addCookie()) k++; return k; },
      reset: () => resetTable(),
      // open: both steps (unwrap, then crack as soon as it's unwrapped). unwrap: step 1 only; crack: step 2.
      open: (i) => { const list = cookies.filter((c) => !c.drop); unwrapCookie(list[i == null ? Math.floor(Math.random() * list.length) : Math.min(i, list.length - 1)], true); return state; },
      unwrap: (i) => { const list = cookies.filter((c) => !c.drop); unwrapCookie(list[i == null ? Math.floor(Math.random() * list.length) : Math.min(i, list.length - 1)], false); return state; },
      crack: () => { crackCookie(); return state; },
      wrapped: () => cookies.filter((c) => c.wrap.on).length,
      // a tap at (x, y) in canvas pixels (as screen() and openScreen() report them)
      tap: (x, y) => { const r = canvas.getBoundingClientRect(), ev = { clientX: r.left + x, clientY: r.top + y, button: 0, pointerType: 'touch' }; onDown(ev); onUp(ev); return state; },
      close: () => { closeCookie(); return state; },
      wobble: (i) => wobble(cookies[i || 0], 0.11),
      fortune: () => (O ? O.fortune : null),
      busy: () => !!raf,
      time: () => T,
      openScreen: () => { if (!openC) return null; const p = openC.root.getWorldPosition(new THREE.Vector3()).project(camera); return { x: (p.x + 1) / 2 * W, y: (1 - p.y) / 2 * H }; },
      hero: () => { if (!O) return null; const p = O.c.root.position.clone().project(camera); return { ndc: [p.x, p.y, p.z], pos: O.c.root.position.toArray(), cam: camera.position.toArray() }; },
      hold: (on) => { hold = !!on; if (hold && raf) { cancelAnimationFrame(raf); raf = 0; } else kick(); },
      step: (sec) => { const n = Math.round(sec / 0.016); for (let i = 0; i < n; i++) { T += 0.016; update(0.016); } renderer.render(scene, camera); return state; },
      // average ms to draw one frame (GPU included), over n draws
      perf: (n) => { const gl = renderer.getContext(), px = new Uint8Array(4), sync = () => gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); n = n || 10; renderer.render(scene, camera); sync(); const a = performance.now(); for (let i = 0; i < n; i++) { renderer.render(scene, camera); sync(); } return +((performance.now() - a) / n).toFixed(2); },
      crinkle: () => crk,
      film: (o) => { for (const k in o) { if (k in filmMat.userData.u) filmMat.userData.u[k].value = o[k]; else if (k === 'normalScale') filmMat.normalScale.setScalar(o[k]); else if (k === 'thick') filmMat.iridescenceThicknessRange = o[k]; else filmMat[k] = o[k]; } filmMat.needsUpdate = true; },
      calls: () => { renderer.render(scene, camera); return renderer.info.render.calls; },
      screen: (i) => { const c = cookies[i || 0]; const p = c.root.position.clone().project(camera); return { x: (p.x + 1) / 2 * W, y: (1 - p.y) / 2 * H }; }
    }
  };
}
