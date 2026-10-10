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

// ── Styles for the overlay (slip, hint, button). The table keeps its own colours in every theme.
const CSS = `
.ck{position:absolute;inset:0;overflow:hidden;background:#24100a;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;}
.ck canvas{position:absolute;inset:0;display:block;width:100%;height:100%;outline:none;touch-action:none;cursor:default;}
.ck canvas.hot{cursor:pointer;}
.ck-hint{position:absolute;left:50%;top:12px;z-index:2;transform:translateX(-50%);padding:7px 15px;border-radius:999px;white-space:nowrap;
  background:rgba(22,9,4,.55);color:#fbe7c8;font-weight:800;font-size:.92rem;letter-spacing:.02em;pointer-events:none;
  -webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);box-shadow:0 0 0 1px rgba(255,220,170,.12);transition:opacity .3s,transform .3s;}
.ck-hint.off{opacity:0;transform:translate(-50%,-8px);}
.ck-acts{position:absolute;left:0;right:0;bottom:calc(var(--safe-b,0px) + 14px);z-index:4;display:flex;justify-content:center;padding:0 16px;
  pointer-events:none;opacity:0;transform:translateY(14px);transition:opacity .3s,transform .35s var(--spring,ease);}
.ck-acts.on{opacity:1;transform:none;}
.ck-acts.on .btn{pointer-events:auto;}
.ck-acts .btn{min-width:210px;}
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
  blurb: 'Pick a cookie, crack it open',
  rules: '<h3>Fortune Cookie</h3>' +
    '<p>A table full of fresh fortune cookies. <b>Tap one</b> to pick it up. It snaps in two and the paper slip unrolls with your fortune.</p>' +
    '<ul><li>Every slip has a fortune, six <b>lucky numbers</b> and a <b>Learn Chinese</b> word with how to say it.</li>' +
    '<li>Tap the table or <b>New cookie</b> to put the slip away. The table restocks itself.</li>' +
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
  const hint = document.createElement('div'); hint.className = 'ck-hint'; hint.textContent = 'Pick a cookie';
  const acts = document.createElement('div'); acts.className = 'ck-acts';
  const newBtn = document.createElement('button'); newBtn.type = 'button'; newBtn.className = 'btn btn-primary';
  newBtn.innerHTML = (Kit ? Kit.icon('sync') : '') + '<span>New cookie</span>';
  acts.appendChild(newBtn);
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
  canvas.setAttribute('aria-label', 'A table of fortune cookies. Tap one, or press Enter, to open it.');
  root.appendChild(canvas); root.appendChild(hint); root.appendChild(acts); root.appendChild(live);

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
      restQ: pose.quaternion.clone(), w: (bb.max.x - bb.min.x) * scale, blobS: blob.scale.clone(), wob: null, hop: null, drop: null, dim: 1, alive: true, P };
    halves.forEach((h) => { h.mesh.userData.cookie = c; pickables.push(h.mesh); });
    return c;
  }
  function freeCookie(c) {
    c.alive = false;
    scene.remove(c.root); scene.remove(c.blob);
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
  const COUNT = 11, PER = 4.4;
  function placeCamera(d) {
    camera.position.set(0, d * Math.sin(ELEV), d * Math.cos(ELEV));
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix(); camera.updateMatrixWorld();
  }
  function tableArea() {
    const c = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map((q) => onTable(q[0] * 0.9, q[1] < 0 ? -0.84 : 0.74));
    let a = 0;
    for (let i = 0; i < 4; i++) { const p = c[i], q = c[(i + 1) % 4]; a += p.x * q.z - q.x * p.z; }
    return Math.abs(a) / 2;
  }
  function fitCamera() {
    camera.aspect = W / H;
    placeCamera(10);
    // enough table for the cookies, and at least ~4 cookies across the middle of the screen
    const a = onTable(-1, 0), b = onTable(1, 0);
    const across = a && b ? a.distanceTo(b) : 10;
    const d = Math.max(10 * Math.sqrt(COUNT * PER / tableArea()), 10 * 6.6 / across);
    placeCamera(d);
    key.position.set(-0.22 * d, 1.25 * d, -0.1 * d); key.target.position.set(0, 0, -0.04 * d);
    key.angle = 0.62; key.distance = 0; key.decay = 0; key.intensity = 2.7;
    key.shadow.camera.far = d * 3; key.shadow.camera.updateProjectionMatrix();
  }
  function onTable(x, y, out) {
    ndc.set(x, y); ray.setFromCamera(ndc, camera);
    return ray.ray.intersectPlane(tablePlane, out || new THREE.Vector3());
  }
  function placeAll() {
    cookies.slice().forEach(freeCookie);
    const n = Math.max(9, Math.min(12, Math.round(tableArea() / PER))), sc = 1;
    const pts = [], v = new THREE.Vector3();
    for (let k = 0; k < n; k++) {
      let best = null, bestD = -1;
      for (let t = 0; t < 40; t++) {
        const p = onTable(-0.86 + Math.random() * 1.72, -0.8 + Math.random() * 1.5, v);
        if (!p) continue;
        let dmin = 1e9;
        for (const q of pts) dmin = Math.min(dmin, Math.hypot(p.x - q.x, p.z - q.z));
        if (dmin > bestD) { bestD = dmin; best = { x: p.x, z: p.z }; }
      }
      if (best) pts.push(best);
    }
    pts.sort((a, b) => a.z - b.z);   // far ones first, so near ones draw over them
    pts.forEach((p) => cookies.push(makeCookie(p.x, p.z, sc * (0.92 + Math.random() * 0.14))));
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

  // ── Opening a cookie ─────────────────────────────────────────────────
  let state = 'idle', openC = null, O = null, slipBox = null, needLayout = false;
  const LIFT = 0.6, CRACK = 0.92, HANDOFF = 1.5, DONE = 2.35;
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
    return { pos, q };
  }
  function openCookie(c) {
    if (state !== 'idle' || !c || !c.alive || c.drop) return;
    state = 'opening'; openC = c; c.wob = null; c.hop = null;
    const tgt = presentTarget(c);
    O = { c, t0: T, p0: c.root.position.clone(), q0: c.pose.quaternion.clone(), tgt, cracked: false, handed: false, done: false,
      fortune: nextFortune(), nums: luckyNumbers(), word: WORDS[Math.floor(Math.random() * WORDS.length)],
      slip0: { p: c.slip.position.clone(), q: c.slip.quaternion.clone(), s: c.slip.scale.x } };
    dimTo = 0.4;
    hint.classList.add('off');
    sfx('whoosh', 0.6); haptic('light');
    buildSlip();
    kick();
  }
  const v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), q1 = new THREE.Quaternion();
  function updateOpen() {
    const c = O.c, t = T - O.t0;
    // lift toward you
    const e = ease.outCubic(clamp01(t / LIFT));
    c.root.position.lerpVectors(O.p0, O.tgt.pos, e);
    c.root.position.y += Math.sin(Math.PI * clamp01(t / LIFT)) * 0.35;
    c.pose.quaternion.slerpQuaternions(O.q0, O.tgt.q, e);
    const hgt = c.root.position.y;
    c.blob.material.opacity = 0.85 * Math.max(0, 1 - hgt / 5);
    c.blob.scale.copy(c.blobS).multiplyScalar(1 + Math.min(1.6, hgt * 0.35));
    // a moment of tension: thumbs on the crease
    if (t > LIFT && t < CRACK) {
      const u = (t - LIFT) / (CRACK - LIFT);
      q1.setFromEuler(te.set(0, 0, Math.sin(t * 70) * 0.025 * u));
      c.pose.quaternion.multiply(q1);
    }
    // snap!
    if (!O.cracked && t >= CRACK) {
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
      const u = clamp01((t - CRACK) / 0.55), eb = ease.outBack(u), drift = ease.outCubic(clamp01((t - CRACK - 0.3) / 1.2));
      c.halves.forEach((h, i) => {
        const side = i === 0 ? -1 : 1;
        h.hinge.position.x = side * (0.14 * eb + (W > H ? 1.9 : 0.22) * drift);
        h.hinge.position.z = -0.12 * drift;
        h.hinge.rotation.set(0, side * (0.3 * eb + 0.12 * drift), side * -0.55 * eb);
      });
      const us = ease.inOut(clamp01((t - CRACK - 0.06) / (HANDOFF - CRACK - 0.06)));
      c.slip.position.lerpVectors(O.slip0.p, O.slipP1, us);
      c.slip.quaternion.slerpQuaternions(O.slip0.q, O.slipQ1, us);
      c.slip.scale.setScalar(O.slip0.s + (1.25 - O.slip0.s) * us);
    }
    if (!O.handed && t >= HANDOFF) { O.handed = true; handOff(); }
    if (!O.done && t >= DONE) { O.done = true; state = 'open'; acts.classList.add('on'); hint.textContent = 'Tap the table for a new cookie'; hint.classList.remove('off'); }
    return !O.done || t < DONE + 0.1;
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
    acts.classList.remove('on'); hint.classList.add('off');
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
      hint.textContent = 'Pick a cookie'; hint.classList.remove('off');
    }
    return !C.stocked || !C.freed;
  }

  // ── Frame update ─────────────────────────────────────────────────────
  function update(dt) {
    let busy = false;
    if (Math.abs(dimNow - dimTo) > 0.002) { dimNow += (dimTo - dimNow) * Math.min(1, dt * 7); busy = true; } else dimNow = dimTo;
    applyDim();
    for (const c of cookies) if (c !== openC) busy = idleMotion(c) || busy;
    if (O && state !== 'closing') busy = updateOpen() || busy;
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
    if (!p.c || moved || state !== 'idle') return;
    if (pick(e) === p.c) openCookie(p.c);
  }
  function onMove(e) {
    if (e.pointerType !== 'mouse' || state !== 'idle') return;
    const c = pick(e);
    canvas.classList.toggle('hot', !!c);
    if (c !== hover) { hover = c; if (c) wobble(c, 0.05); }
  }
  function onKey(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (state === 'idle') { const live = cookies.filter((c) => !c.drop); openCookie(live[Math.floor(Math.random() * live.length)]); }
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
  const onVis = () => { if (!document.hidden) kick(); else if (raf) { cancelAnimationFrame(raf); raf = 0; } };
  document.addEventListener('visibilitychange', onVis);

  // ── Size ─────────────────────────────────────────────────────────────
  function resize() {
    const w = Math.max(1, root.clientWidth), h = Math.max(1, root.clientHeight);
    if (w === W && h === H) return;
    W = w; H = h;
    renderer.setSize(W, H, false);
    fitCamera();
    const lk = (W > H ? 'L' : 'P') + Math.round(W / H * 5);
    if (lk !== layoutKey) {
      layoutKey = lk;
      if (state === 'idle' && !C) placeAll(); else needLayout = true;
    }
    if (O) { O.tgt = presentTarget(O.c); if (state === 'open') { O.c.root.position.copy(O.tgt.pos); O.c.pose.quaternion.copy(O.tgt.q); } layoutSlip(); }
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
      open: (i) => { const list = cookies.filter((c) => !c.drop); openCookie(list[i == null ? Math.floor(Math.random() * list.length) : Math.min(i, list.length - 1)]); return state; },
      close: () => { closeCookie(); return state; },
      wobble: (i) => wobble(cookies[i || 0], 0.11),
      fortune: () => (O ? O.fortune : null),
      busy: () => !!raf,
      time: () => T,
      hero: () => { if (!O) return null; const p = O.c.root.position.clone().project(camera); return { ndc: [p.x, p.y, p.z], pos: O.c.root.position.toArray(), cam: camera.position.toArray() }; },
      hold: (on) => { hold = !!on; if (hold && raf) { cancelAnimationFrame(raf); raf = 0; } else kick(); },
      step: (sec) => { const n = Math.round(sec / 0.016); for (let i = 0; i < n; i++) { T += 0.016; update(0.016); } renderer.render(scene, camera); return state; },
      screen: (i) => { const c = cookies[i || 0]; const p = c.root.position.clone().project(camera); return { x: (p.x + 1) / 2 * W, y: (1 - p.y) / 2 * H }; }
    }
  };
}
