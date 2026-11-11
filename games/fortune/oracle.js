// Oracle Dial: a vintage tabletop "Oracle Fortune Teller" coin-op, drawn as a real object on canvas.
// A dark cabinet with a beaded antique-gold frame, a starry black face with circus lettering and paisley
// flourishes, and a cream paper dial of 30 fortunes printed radially. Drop a coin (tap the slot or drag the
// coin in) and a little motor whirs the dial round; it coasts, ratchets through the pawl and clicks to a stop
// under the black teardrop pointer. The answer window lights up and a printed ticket slides out of the base.
// The dial can also be flicked by hand. Each dial deals 30 of the 300 fortunes in oracle-fortunes.js; once all
// 30 have been told (or on "New dial") the next coin loads a fresh dial.
//
// Battery: nothing animates at rest. The canvas draws only while the dial (or the pointer) is moving, at most
// ~60 times a second, and only the dial's square is redrawn each frame (cabinet, glass and lettering are
// pre-rendered layers). The coin and the ticket are DOM elements moved by CSS / Web Animations.
// Test hook while mounted: window.__oracle = { coin(i?), spin(i?), flick(omega), newDial(), state() }.
import FORTUNES from './oracle-fortunes.js';

const N = 30, TAU = Math.PI * 2, WEDGE = TAU / N;
// Cabinet design units (the whole machine is 1000 x 1320; the canvas scales it to fit)
const CW = 1000, CH = 1320;
const FACE = { x: 146, y: 138, w: 708, h: 976 };
const DIAL = { x: 500, y: 731, r: 290 };
const WIN = { x: FACE.x + 264, y: FACE.y + 30, w: 131, h: 82 };
const COINPLATE = { x: 930, y: 205, w: 60, h: 150 };          // centre, size (on the right bead rail)
const BASE = { y: 1262, h: 54 };                               // the plinth with the ticket slot
const TSLOT_P = { x: 500, y: 1289, w: 780 };                   // ticket slot in the plinth (portrait layout)
const TSLOT_L = { x: 930, y: 845, h: 560 };                    // ticket slot in the right rail (landscape layout)
const RYE = '"Oracle Rye", Rye, Georgia, serif';
const SERIF = '"Oracle Pagella", "TeX Gyre Pagella", "Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif';
const INK = '#26170d';
let PXU = 1;   // device pixels per design unit while the cabinet is drawn (shadow blur is in device pixels)

// Motion (rad, s): motor top speed and ramp, coast friction (a + b*omega), notch speed
const WMAX = 12.5, TRAMP = 0.55, FA = 1.15, FB = 0.5, WS = 1.05, FLICK_MIN = 3.2;

// ── Fonts: Rye (OFL, fonts/rye.woff2) for the circus lettering, Pagella (Palatino) for the printed dial ──
let fontsP = null;
function loadFonts() {
  if (fontsP) return fontsP;
  const list = [['Oracle Rye', '../../fonts/rye.woff2'], ['Oracle Pagella', '../../fonts/pagella-400.woff2']];
  fontsP = Promise.all(list.map(([fam, rel]) => {
    try {
      const f = new FontFace(fam, 'url(' + new URL(rel, import.meta.url).href + ')', { weight: '400', style: 'normal' });
      document.fonts.add(f);
      return f.load().catch(() => null);
    } catch (e) { return null; }
  }));
  return fontsP;
}

// ── Small helpers ──
function rng(seed) {   // mulberry32: the same stars and wear every time the cabinet is redrawn
  let a = seed >>> 0;
  return function () { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function rr(c, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}
function mkCanvas(w, h) { const cv = document.createElement('canvas'); cv.width = Math.max(1, w | 0); cv.height = Math.max(1, h | 0); return cv; }
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function shuffle(a, r) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
function mod(a, n) { return ((a % n) + n) % n; }

// Wear on printed ink: punch tiny holes (destination-out) and blotch it a little darker (source-atop).
function wear(c, x, y, w, h, n, r, sz) {
  c.save();
  c.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < n; i++) {
    c.globalAlpha = 0.25 + r() * 0.7;
    c.beginPath(); c.arc(x + r() * w, y + r() * h, sz * (0.3 + r() * r() * 1.6), 0, TAU); c.fill();
  }
  c.globalCompositeOperation = 'source-atop';
  for (let i = 0; i < n / 25; i++) {
    const px = x + r() * w, py = y + r() * h, rad = sz * (6 + r() * 26);
    const g = c.createRadialGradient(px, py, 0, px, py, rad);
    g.addColorStop(0, 'rgba(40,22,6,' + (0.12 + r() * 0.2) + ')'); g.addColorStop(1, 'rgba(40,22,6,0)');
    c.globalAlpha = 1; c.fillStyle = g; c.fillRect(px - rad, py - rad, rad * 2, rad * 2);
  }
  c.restore();
}
function goldGrad(c, y0, y1, bright) {
  const g = c.createLinearGradient(0, y0, 0, y1);
  if (bright) { g.addColorStop(0, '#f6e2a4'); g.addColorStop(0.42, '#e0b965'); g.addColorStop(0.75, '#b98a3e'); g.addColorStop(1, '#8c6428'); }
  else { g.addColorStop(0, '#e9cf8c'); g.addColorStop(0.5, '#c9a25a'); g.addColorStop(1, '#94703a'); }
  return g;
}
// Cap height of a font, as a fraction of its size
const capCache = {};
function capOf(c, fam) {
  if (capCache[fam]) return capCache[fam];
  c.save(); c.font = '100px ' + fam; const m = c.measureText('HOE'); c.restore();
  const v = (m.actualBoundingBoxAscent || 70) / 100;
  if (document.fonts && document.fonts.check && document.fonts.check('20px ' + fam.split(',')[0])) capCache[fam] = v;
  return v;
}
// Draw text whose capitals are capH tall, top-left at (x, top), squeezed to fit maxW (or condensed by cond).
function capText(c, str, x, top, capH, maxW, fam, mode, cond) {
  const cap = capOf(c, fam), size = capH / cap;
  c.font = size + 'px ' + fam;
  const w = c.measureText(str).width;
  const sx = Math.min(cond || 1, maxW ? maxW / w : 1);
  c.save(); c.translate(x, top + capH); c.scale(sx, 1);
  if (mode === 'stroke') c.strokeText(str, 0, 0); else c.fillText(str, 0, 0);
  c.restore();
  return w * sx;
}

// ── Pointing hand (a manicule), drawn in a 120 x 56 box pointing right ──
const HAND = 'M16,16 C26,10 40,9 50,13 C56,15 60,18 66,19 L111,19 C119,19 119,28 111,28 L71,28 C77,29 78,36 71,37 C77,38 77,45 70,46 C75,47 74,53 67,53 L40,53 C28,53 20,50 16,47 Z';
const CUFF = 'M3,11 L16,14 L16,49 L3,52 C1,40 1,23 3,11 Z';
const HAND_LINES = 'M42,20 C51,18 60,22 67,28 M59,37 L71,37 M58,46 L70,46 M57,28 C55,32 55,48 58,53 M107,21 C110,22 110,25 107,26 M8,13 L8,50 M12,14 L12,49';
// ── Paisley flourish in a 100 x 100 box (top-left corner orientation) ──
const PAISLEY = 'M40,37 C58,37 62,20 74,12 C72,30 66,52 52,66 C44,74 26,74 22,60 C18,46 28,37 40,37 Z';
const PAISLEY_IN = 'M41,45 C51,45 55,35 62,29 C60,40 56,51 48,59 C43,64 33,64 31,57 C29,50 34,45 41,45 Z';
const SCROLLS = 'M22,62 C8,62 2,48 10,40 C16,34 25,40 20,46 C17,49 13,46 15,43 M52,66 C64,82 84,82 92,70 C97,62 88,54 83,61 C81,64 85,67 88,64 M74,12 C82,6 92,8 94,16 C95,21 90,23 88,19 M30,40 C24,28 30,16 40,14 C46,13 48,20 43,22 M60,76 C58,86 50,92 42,90';
let PATHS = null;
function paths() {
  if (!PATHS) PATHS = { hand: new Path2D(HAND), cuff: new Path2D(CUFF), handLines: new Path2D(HAND_LINES), paisley: new Path2D(PAISLEY), paisleyIn: new Path2D(PAISLEY_IN), scrolls: new Path2D(SCROLLS) };
  return PATHS;
}
function handAt(c, x, y, s, rot, part) {
  const P = paths();
  c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s);
  if (part === 'outline') {
    c.lineJoin = 'round'; c.strokeStyle = '#0d0905'; c.lineWidth = 5;
    c.stroke(P.hand); c.stroke(P.cuff);
  } else if (part === 'fill') {
    const g = c.createLinearGradient(0, 10, 0, 54);
    g.addColorStop(0, '#f6e7bd'); g.addColorStop(0.55, '#ddbd78'); g.addColorStop(1, '#a98444');
    c.fillStyle = g; c.fill(P.hand); c.fill(P.cuff);
  } else {
    c.lineCap = 'round'; c.lineJoin = 'round'; c.strokeStyle = 'rgba(30,18,6,.85)'; c.lineWidth = 2;
    c.stroke(P.handLines);
    c.lineWidth = 1.6; c.stroke(P.hand); c.stroke(P.cuff);
  }
  c.restore();
}
function flourishAt(c, x, y, s, fx, fy) {
  const P = paths();
  c.save(); c.translate(x, y); c.scale(s * fx, s * fy);
  c.lineCap = 'round'; c.lineJoin = 'round';
  c.lineWidth = 2.6; c.stroke(P.paisley); c.lineWidth = 1.7; c.stroke(P.paisleyIn); c.lineWidth = 2.2; c.stroke(P.scrolls);
  [[44, 55, 3.4], [8, 74, 2.6], [16, 83, 1.9], [86, 32, 2.3], [56, 24, 1.7], [97, 80, 1.6]].forEach(d => { c.beginPath(); c.arc(d[0], d[1], d[2], 0, TAU); c.fill(); });
  c.restore();
}

// ── The cabinet (static layer): frame, face, lettering, window frame, coin plate, ticket slot ──
function bead(c, x, y, w, h, r) {
  const rad = Math.min(w, h) / 2;
  c.fillStyle = 'rgba(0,0,0,.6)'; rr(c, x + 1.5, y + 3, w, h, rad); c.fill();
  const wearAmt = 0.45 + r() * 0.4;
  const g = c.createRadialGradient(x + w * 0.34, y + h * 0.3, 0.5, x + w * 0.5, y + h * 0.55, Math.max(w, h) * 0.72);
  g.addColorStop(0, 'rgba(250,228,160,' + wearAmt + ')');
  g.addColorStop(0.24, '#b48b45'); g.addColorStop(0.55, '#6a4f22'); g.addColorStop(0.82, '#30230f'); g.addColorStop(1, '#17110a');
  c.fillStyle = g; rr(c, x, y, w, h, rad); c.fill();
  // black paint left in the low spots
  c.save(); rr(c, x, y, w, h, rad); c.clip();
  c.fillStyle = 'rgba(14,10,6,' + (0.15 + r() * 0.3) + ')';
  c.beginPath(); c.ellipse(x + w * (0.6 + r() * 0.2), y + h * (0.75 + r() * 0.2), w * 0.5, h * 0.35, 0, 0, TAU); c.fill();
  c.restore();
}
function railV(c, x, y, w, h, r) {
  const g = c.createLinearGradient(x, 0, x + w, 0);
  g.addColorStop(0, '#2a2117'); g.addColorStop(0.08, '#6b5530'); g.addColorStop(0.12, '#18130d'); g.addColorStop(0.88, '#120e09'); g.addColorStop(0.93, '#4c3c22'); g.addColorStop(1, '#16110b');
  c.fillStyle = g; c.fillRect(x, y, w, h);
  const bw = w * 0.76, bh = 40, pitch = 45, n = Math.floor((h - 8) / pitch), off = (h - n * pitch) / 2;
  for (let i = 0; i < n; i++) bead(c, x + (w - bw) / 2, y + off + i * pitch + (pitch - bh) / 2, bw, bh, r);
}
function railH(c, x, y, w, h, r) {
  const g = c.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, '#2a2117'); g.addColorStop(0.08, '#6b5530'); g.addColorStop(0.12, '#18130d'); g.addColorStop(0.88, '#120e09'); g.addColorStop(0.93, '#4c3c22'); g.addColorStop(1, '#16110b');
  c.fillStyle = g; c.fillRect(x, y, w, h);
  const bh = h * 0.76, bw = 40, pitch = 45, n = Math.floor((w - 8) / pitch), off = (w - n * pitch) / 2;
  for (let i = 0; i < n; i++) bead(c, x + off + i * pitch + (pitch - bw) / 2, y + (h - bh) / 2, bw, bh, r);
}
function screw(c, x, y, rad, a) {
  const g = c.createRadialGradient(x - rad * 0.3, y - rad * 0.4, 0, x, y, rad);
  g.addColorStop(0, '#fbe9b0'); g.addColorStop(0.5, '#b38c45'); g.addColorStop(1, '#4a3615');
  c.fillStyle = g; c.beginPath(); c.arc(x, y, rad, 0, TAU); c.fill();
  c.strokeStyle = 'rgba(30,18,4,.85)'; c.lineWidth = rad * 0.28; c.beginPath();
  c.moveTo(x - Math.cos(a) * rad * 0.75, y - Math.sin(a) * rad * 0.75); c.lineTo(x + Math.cos(a) * rad * 0.75, y + Math.sin(a) * rad * 0.75); c.stroke();
}
function brassPlate(c, x, y, w, h, rad) {
  c.save();
  c.shadowColor = 'rgba(0,0,0,.65)'; c.shadowBlur = 8 * PXU; c.shadowOffsetY = 4 * PXU;
  const g = c.createLinearGradient(x, y, x + w * 0.6, y + h);
  g.addColorStop(0, '#f2d892'); g.addColorStop(0.35, '#c39a4c'); g.addColorStop(0.7, '#8d6a2c'); g.addColorStop(1, '#5a4119');
  c.fillStyle = g; rr(c, x, y, w, h, rad); c.fill();
  c.restore();
  c.strokeStyle = 'rgba(255,240,190,.55)'; c.lineWidth = 1.5; rr(c, x + 3, y + 3, w - 6, h - 6, Math.max(1, rad - 3)); c.stroke();
  c.strokeStyle = 'rgba(40,24,6,.6)'; c.lineWidth = 1.2; rr(c, x + 0.5, y + 0.5, w - 1, h - 1, rad); c.stroke();
}
function slotHole(c, x, y, w, h) {
  c.fillStyle = '#050403'; rr(c, x, y, w, h, Math.min(w, h) / 2); c.fill();
  const g = c.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, 'rgba(0,0,0,.9)'); g.addColorStop(1, 'rgba(60,45,25,.5)');
  c.strokeStyle = g; c.lineWidth = 2; rr(c, x - 1.5, y - 1.5, w + 3, h + 3, Math.min(w, h) / 2 + 1.5); c.stroke();
}

// Gold printing on the face: border, lettering, hands, flourishes. Drawn into its own layer so it can be
// worn as a whole (tiny holes, darker blotches) before it is laid on the black face.
function faceGold(c, g, r) {
  const F = FACE;
  // ornate border band
  const ins = 13, bw = 12;
  g.strokeStyle = '#c9a259'; g.lineWidth = 2;
  g.strokeRect(F.x + ins, F.y + ins, F.w - ins * 2, F.h - ins * 2);
  g.lineWidth = 1.4;
  g.strokeRect(F.x + ins + bw, F.y + ins + bw, F.w - (ins + bw) * 2, F.h - (ins + bw) * 2);
  g.fillStyle = '#c9a259';
  const mid = ins + bw / 2;
  function band(x0, y0, x1, y1) {
    const len = Math.hypot(x1 - x0, y1 - y0), n = Math.floor(len / 8), dx = (x1 - x0) / len, dy = (y1 - y0) / len;
    for (let i = 1; i < n; i++) {
      const px = x0 + dx * i * 8, py = y0 + dy * i * 8;
      if (i % 2) { g.beginPath(); g.arc(px, py, 1.5, 0, TAU); g.fill(); }
      else { g.save(); g.translate(px, py); g.rotate(Math.atan2(dy, dx) + Math.PI / 4); g.fillRect(-1.6, -1.6, 3.2, 3.2); g.restore(); }
    }
  }
  band(F.x + mid, F.y + mid, F.x + F.w - mid, F.y + mid);
  band(F.x + mid, F.y + F.h - mid, F.x + F.w - mid, F.y + F.h - mid);
  band(F.x + mid, F.y + mid, F.x + mid, F.y + F.h - mid);
  band(F.x + F.w - mid, F.y + mid, F.x + F.w - mid, F.y + F.h - mid);
  [[F.x + mid, F.y + mid], [F.x + F.w - mid, F.y + mid], [F.x + mid, F.y + F.h - mid], [F.x + F.w - mid, F.y + F.h - mid]].forEach(p => {
    g.fillRect(p[0] - 5, p[1] - 5, 10, 10);
  });

  // small lettering, outlined in dark first (on the face), then gold
  const small = [
    ['LOOK FOR', F.x + 33, F.y + 36, 33, 140], ['ANSWER HERE', F.x + 33, F.y + 80, 31, 196],
    ['DROP COIN', F.x + 405, F.y + 34, 33, 180], ['IN SLOT', F.x + 420, F.y + 78, 31, 124]
  ];
  c.lineJoin = 'round'; c.strokeStyle = '#0b0805'; c.lineWidth = 5;
  small.forEach(t => capText(c, t[0], t[1], t[2], t[3], t[4], RYE, 'stroke', 0.9));
  small.forEach(t => { g.fillStyle = goldGrad(g, t[2], t[2] + t[3], false); capText(g, t[0], t[1], t[2], t[3], t[4], RYE, 'fill', 0.9); });

  // hands
  handAt(c, F.x + 174, F.y + 34, 0.74, 0, 'outline');
  handAt(g, F.x + 174, F.y + 34, 0.74, 0, 'fill');
  handAt(c, F.x + 596, F.y + 22, 0.62, 0.72, 'outline');
  handAt(g, F.x + 596, F.y + 22, 0.62, 0.72, 'fill');

  // ORACLE: circus capitals, first and last letters larger and dropped, all hung from one top line
  const top = F.y + 116, capS = 118, capB = 154, left = F.x + 40, right = F.x + F.w - 40;
  const cap = capOf(c, RYE);
  const letters = 'ORACLE'.split('').map((ch, i) => ({ ch, h: (i === 0 || i === 5) ? capB : capS }));
  let total = 0;
  letters.forEach(L => { g.font = (L.h / cap) + 'px ' + RYE; L.w = g.measureText(L.ch).width; total += L.w; });
  const gap = 4, sx = (right - left - gap * 5) / total;
  let x = left;
  letters.forEach(L => { L.x = x; x += L.w * sx + gap; });
  function oracle(cc, mode) {
    letters.forEach(L => {
      cc.font = (L.h / cap) + 'px ' + RYE;
      cc.save(); cc.translate(L.x, top + L.h); cc.scale(sx, 1);
      if (mode === 'stroke') cc.strokeText(L.ch, 0, 0); else cc.fillText(L.ch, 0, 0);
      cc.restore();
    });
  }
  // drop shadow + heavy dark outline on the face
  c.save(); c.translate(3, 5); c.fillStyle = 'rgba(0,0,0,.55)'; oracle(c, 'fill'); c.restore();
  c.lineJoin = 'round'; c.strokeStyle = '#0a0704'; c.lineWidth = 9; oracle(c, 'stroke');
  c.strokeStyle = '#4a3416'; c.lineWidth = 3.5; oracle(c, 'stroke');
  g.fillStyle = goldGrad(g, top, top + capB, true); oracle(g, 'fill');

  // FORTUNE TELLER tucked under R A C L, between the big O and E
  const ftL = letters[1].x + 4, ftR = letters[5].x - 8, ftTop = top + capS + 6, ftH = 58;
  c.strokeStyle = '#0a0704'; c.lineWidth = 6;
  capText(c, 'FORTUNE TELLER', ftL, ftTop, ftH, ftR - ftL, RYE, 'stroke', 0.8);
  g.fillStyle = goldGrad(g, ftTop, ftTop + ftH, true);
  capText(g, 'FORTUNE TELLER', ftL, ftTop, ftH, ftR - ftL, RYE, 'fill', 0.8);

  // paisley flourishes beside the dial
  g.strokeStyle = '#c7a05a'; g.fillStyle = '#c7a05a';
  flourishAt(g, F.x + 42, F.y + 286, 0.78, 1, 1);
  flourishAt(g, F.x + F.w - 42, F.y + 286, 0.78, -1, 1);
  flourishAt(g, F.x + 42, F.y + 880, 0.78, 1, -1);
  flourishAt(g, F.x + F.w - 42, F.y + 880, 0.78, -1, -1);
}

function drawCabinet(c, k, dpr, mode) {
  const r = rng(1931);
  PXU = k * dpr;
  // cast shadow on the table / wall
  c.save();
  c.shadowColor = 'rgba(0,0,0,.55)'; c.shadowBlur = 40 * k * dpr; c.shadowOffsetY = 14 * k * dpr;
  c.fillStyle = '#16120d'; rr(c, 0, 0, CW, CH, 22); c.fill();
  c.restore();
  // cabinet body: very dark wood
  const body = c.createLinearGradient(0, 0, CW, CH);
  body.addColorStop(0, '#2b241b'); body.addColorStop(0.5, '#1a1510'); body.addColorStop(1, '#0e0b08');
  c.fillStyle = body; rr(c, 0, 0, CW, CH, 22); c.fill();
  // faint grain
  c.save(); rr(c, 0, 0, CW, CH, 22); c.clip();
  for (let i = 0; i < 160; i++) {
    const y = r() * CH;
    c.strokeStyle = 'rgba(' + (r() < 0.5 ? '90,70,45' : '0,0,0') + ',' + (0.05 + r() * 0.08) + ')';
    c.lineWidth = 0.6 + r() * 1.6;
    c.beginPath(); c.moveTo(0, y); c.bezierCurveTo(CW * 0.3, y + (r() - 0.5) * 18, CW * 0.7, y + (r() - 0.5) * 18, CW, y + (r() - 0.5) * 10); c.stroke();
  }
  c.restore();
  c.strokeStyle = 'rgba(255,225,160,.12)'; c.lineWidth = 2; rr(c, 1.5, 1.5, CW - 3, CH - 3, 21); c.stroke();

  // plinth with the ticket slot
  const pg = c.createLinearGradient(0, BASE.y, 0, BASE.y + BASE.h);
  pg.addColorStop(0, '#3a2f22'); pg.addColorStop(0.15, '#1d1711'); pg.addColorStop(1, '#0b0906');
  c.fillStyle = pg; c.fillRect(8, BASE.y, CW - 16, BASE.h);

  // top rail: a plain half-round moulding
  const tg = c.createLinearGradient(0, 22, 0, 112);
  tg.addColorStop(0, '#120e0a'); tg.addColorStop(0.3, '#5c4a2c'); tg.addColorStop(0.42, '#a88a4c'); tg.addColorStop(0.55, '#3c3020'); tg.addColorStop(1, '#0f0c08');
  c.fillStyle = tg; c.fillRect(118, 22, 764, 90);
  // bead rails: left, right, bottom
  railV(c, 22, 22, 96, 1218, r);
  railV(c, 882, 22, 96, 1218, r);
  railH(c, 118, 1144, 764, 96, r);

  // the recess around the face, with a bevelled lip catching the light at top-left
  c.fillStyle = '#0d0b08'; c.fillRect(118, 112, 764, 1032);
  const lip = 16, fx0 = FACE.x - lip, fy0 = FACE.y - lip, fx1 = FACE.x + FACE.w + lip, fy1 = FACE.y + FACE.h + lip;
  function quad(pts, fill) { c.fillStyle = fill; c.beginPath(); c.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]); c.closePath(); c.fill(); }
  quad([fx0, fy0, fx1, fy0, fx1 - lip, fy0 + lip, fx0 + lip, fy0 + lip], '#5a4a30');
  quad([fx0, fy0, fx0 + lip, fy0 + lip, fx0 + lip, fy1 - lip, fx0, fy1], '#3e3222');
  quad([fx1, fy0, fx1, fy1, fx1 - lip, fy1 - lip, fx1 - lip, fy0 + lip], '#1c160f');
  quad([fx0, fy1, fx0 + lip, fy1 - lip, fx1 - lip, fy1 - lip, fx1, fy1], '#120e0a');
  c.strokeStyle = 'rgba(220,180,100,.35)'; c.lineWidth = 1.5; c.strokeRect(fx0 + 1, fy0 + 1, fx1 - fx0 - 2, fy1 - fy0 - 2);

  // the face: a black print with a faint olive cast, speckled with stars
  const F = FACE;
  const fg = c.createRadialGradient(F.x + F.w * 0.4, F.y + F.h * 0.3, 40, F.x + F.w / 2, F.y + F.h / 2, F.h * 0.75);
  fg.addColorStop(0, '#22231d'); fg.addColorStop(1, '#0e0f0c');
  c.fillStyle = fg; c.fillRect(F.x, F.y, F.w, F.h);
  c.save(); c.beginPath(); c.rect(F.x, F.y, F.w, F.h); c.clip();
  for (let i = 0; i < 420; i++) {
    const sx = F.x + r() * F.w, sy = F.y + r() * F.h, big = r() < 0.06;
    c.fillStyle = 'rgba(' + (r() < 0.3 ? '235,215,160' : '225,228,222') + ',' + (big ? 0.85 : 0.18 + r() * 0.55) + ')';
    c.beginPath(); c.arc(sx, sy, big ? 1.6 + r() * 1.2 : 0.5 + r() * 1.1, 0, TAU); c.fill();
    if (big) { c.fillStyle = 'rgba(230,230,220,.08)'; c.beginPath(); c.arc(sx, sy, 6, 0, TAU); c.fill(); }
  }
  // print grain
  for (let i = 0; i < 1600; i++) { c.fillStyle = 'rgba(' + (r() < 0.5 ? '255,255,255' : '0,0,0') + ',' + (0.02 + r() * 0.05) + ')'; c.fillRect(F.x + r() * F.w, F.y + r() * F.h, 1.4, 1.4); }
  c.restore();
  c.strokeStyle = 'rgba(160,160,150,.45)'; c.lineWidth = 1.2; c.strokeRect(F.x + 0.5, F.y + 0.5, F.w - 1, F.h - 1);

  // window: a grey bezel around dark glass (its glow is drawn live)
  c.save();
  c.shadowColor = 'rgba(0,0,0,.7)'; c.shadowBlur = 6; c.shadowOffsetY = 2;
  const wg = c.createLinearGradient(WIN.x, WIN.y, WIN.x, WIN.y + WIN.h);
  wg.addColorStop(0, '#a3a6a5'); wg.addColorStop(0.5, '#7c8080'); wg.addColorStop(1, '#5b5f5f');
  c.fillStyle = wg; rr(c, WIN.x, WIN.y, WIN.w, WIN.h, 14); c.fill();
  c.restore();
  c.fillStyle = '#141615'; rr(c, WIN.x + 11, WIN.y + 10, WIN.w - 22, WIN.h - 20, 8); c.fill();
  c.strokeStyle = 'rgba(0,0,0,.6)'; c.lineWidth = 2; rr(c, WIN.x + 11, WIN.y + 10, WIN.w - 22, WIN.h - 20, 8); c.stroke();

  // gold printing, worn, then the hands' engraved detail on top
  const gl = mkCanvas(c.canvas.width, c.canvas.height), g = gl.getContext('2d');
  g.setTransform(c.getTransform());
  faceGold(c, g, r);
  g.setTransform(1, 0, 0, 1, 0, 0);
  const t = c.getTransform();
  g.setTransform(t);
  wear(g, F.x, F.y, F.w, F.h, 2600, r, 1.1);
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(gl, 0, 0); c.restore();
  gl.width = gl.height = 1;
  handAt(c, F.x + 174, F.y + 34, 0.74, 0, 'detail');
  handAt(c, F.x + 596, F.y + 22, 0.62, 0.72, 'detail');

  // dial: the paper disc sits slightly proud of the face
  c.save();
  c.shadowColor = 'rgba(0,0,0,.75)'; c.shadowBlur = 22 * k * dpr; c.shadowOffsetY = 7 * k * dpr; c.shadowOffsetX = 3 * k * dpr;
  c.fillStyle = '#100d09'; c.beginPath(); c.arc(DIAL.x, DIAL.y, DIAL.r - 2, 0, TAU); c.fill();
  c.restore();
  // what shows when the disc is lifted off: a worn recess, a felt ring and the brass spindle
  const rg = c.createRadialGradient(DIAL.x - 60, DIAL.y - 80, 20, DIAL.x, DIAL.y, DIAL.r);
  rg.addColorStop(0, '#2a241b'); rg.addColorStop(0.75, '#16120d'); rg.addColorStop(1, '#070504');
  c.fillStyle = rg; c.beginPath(); c.arc(DIAL.x, DIAL.y, DIAL.r - 4, 0, TAU); c.fill();
  c.strokeStyle = 'rgba(120,30,30,.35)'; c.lineWidth = 26; c.beginPath(); c.arc(DIAL.x, DIAL.y, DIAL.r * 0.55, 0, TAU); c.stroke();
  c.strokeStyle = 'rgba(200,170,110,.12)'; c.lineWidth = 1.5; c.beginPath(); c.arc(DIAL.x, DIAL.y, DIAL.r - 6, 0, TAU); c.stroke();
  screw(c, DIAL.x, DIAL.y, 16, 0.8);

  // coin plate on the right rail
  const cp = COINPLATE;
  brassPlate(c, cp.x - cp.w / 2, cp.y - cp.h / 2, cp.w, cp.h, 12);
  slotHole(c, cp.x - 5, cp.y - 42, 10, 84);
  screw(c, cp.x, cp.y - cp.h / 2 + 11, 5, 0.4); screw(c, cp.x, cp.y + cp.h / 2 - 11, 5, 1.9);
  // ticket slot
  if (mode === 'l') {
    const ts = TSLOT_L;
    brassPlate(c, ts.x - 26, ts.y - ts.h / 2 - 22, 52, ts.h + 44, 12);
    slotHole(c, ts.x - 4, ts.y - ts.h / 2, 8, ts.h);
    screw(c, ts.x, ts.y - ts.h / 2 - 12, 5, 1.1); screw(c, ts.x, ts.y + ts.h / 2 + 12, 5, 2.6);
  } else {
    const ts = TSLOT_P;
    brassPlate(c, ts.x - ts.w / 2 - 24, BASE.y + 9, ts.w + 48, BASE.h - 18, 10);
    slotHole(c, ts.x - ts.w / 2, ts.y - 4, ts.w, 8);
    screw(c, ts.x - ts.w / 2 - 12, ts.y, 4.5, 0.3); screw(c, ts.x + ts.w / 2 + 12, ts.y, 4.5, 2.2);
  }
}

// Glass and light (static layer drawn over everything): a soft lamp from the upper left, a darker lower
// right, and a diagonal sheen across the glass over the face.
function drawGlass(c) {
  c.save(); rr(c, 0, 0, CW, CH, 22); c.clip();
  const lg = c.createLinearGradient(0, 0, CW, CH);
  lg.addColorStop(0, 'rgba(255,236,190,.07)'); lg.addColorStop(0.5, 'rgba(0,0,0,0)'); lg.addColorStop(1, 'rgba(0,0,0,.28)');
  c.fillStyle = lg; c.fillRect(0, 0, CW, CH);
  c.restore();
  const F = FACE;
  c.save(); c.beginPath(); c.rect(F.x, F.y, F.w, F.h); c.clip();
  // inner shadow from the frame lip
  c.strokeStyle = 'rgba(0,0,0,.55)'; c.lineWidth = 18; c.filter = 'none';
  const ig = c.createLinearGradient(F.x, F.y, F.x, F.y + 26);
  ig.addColorStop(0, 'rgba(0,0,0,.55)'); ig.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = ig; c.fillRect(F.x, F.y, F.w, 26);
  const il = c.createLinearGradient(F.x, 0, F.x + 22, 0);
  il.addColorStop(0, 'rgba(0,0,0,.45)'); il.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = il; c.fillRect(F.x, F.y, 22, F.h);
  // sheen
  c.translate(F.x + F.w / 2, F.y + F.h / 2); c.rotate(-0.62);
  const sg = c.createLinearGradient(0, -F.h * 0.62, 0, -F.h * 0.12);
  sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(0.45, 'rgba(255,255,255,.075)'); sg.addColorStop(0.6, 'rgba(255,255,255,.11)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = sg; c.fillRect(-F.w * 1.2, -F.h * 0.62, F.w * 2.4, F.h * 0.5);
  const sg2 = c.createLinearGradient(0, F.h * 0.18, 0, F.h * 0.3);
  sg2.addColorStop(0, 'rgba(255,255,255,0)'); sg2.addColorStop(0.5, 'rgba(255,255,255,.045)'); sg2.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = sg2; c.fillRect(-F.w * 1.2, F.h * 0.18, F.w * 2.4, F.h * 0.12);
  c.restore();
  // a glint on the glass edge
  c.strokeStyle = 'rgba(255,255,255,.14)'; c.lineWidth = 2;
  c.beginPath(); c.moveTo(F.x + 3, F.y + F.h * 0.35); c.lineTo(F.x + 3, F.y + 3); c.lineTo(F.x + F.w * 0.45, F.y + 3); c.stroke();
}

// ── The dial: aged paper disc (made once per size) and the printed wedges (made per deal) ──
function makePaper(px, seed) {
  const cv = mkCanvas(px, px), c = cv.getContext('2d'), r = rng(seed), h = px / 2;
  // fibrous card edge
  c.fillStyle = '#7d4f35'; c.beginPath(); c.arc(h, h, h, 0, TAU); c.fill();
  for (let i = 0; i < 900; i++) {
    const a = r() * TAU, d = h * (0.965 + r() * 0.035);
    c.fillStyle = r() < 0.5 ? 'rgba(170,110,75,.6)' : 'rgba(60,32,18,.6)';
    c.fillRect(h + Math.cos(a) * d, h + Math.sin(a) * d, 1 + r() * 1.5, 1 + r() * 1.5);
  }
  // paper
  const pg = c.createRadialGradient(h * 0.9, h * 0.85, h * 0.1, h, h, h * 0.98);
  pg.addColorStop(0, '#f5ecd3'); pg.addColorStop(0.6, '#eee2c2'); pg.addColorStop(0.9, '#e2d0a6'); pg.addColorStop(1, '#cdb282');
  c.fillStyle = pg; c.beginPath(); c.arc(h, h, h * 0.972, 0, TAU); c.fill();
  // grain
  const img = c.getImageData(0, 0, px, px), d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    if (!d[i + 3]) continue;
    const n = (r() - 0.5) * 16;
    d[i] = clamp(d[i] + n, 0, 255); d[i + 1] = clamp(d[i + 1] + n, 0, 255); d[i + 2] = clamp(d[i + 2] + n * 0.8, 0, 255);
  }
  c.putImageData(img, 0, 0);
  // foxing and age spots
  c.save(); c.beginPath(); c.arc(h, h, h * 0.972, 0, TAU); c.clip();
  for (let i = 0; i < 22; i++) {
    const a = r() * TAU, dd = h * Math.sqrt(r()) * 0.95, x = h + Math.cos(a) * dd, y = h + Math.sin(a) * dd, rad = h * (0.015 + r() * 0.07);
    const g = c.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, 'rgba(150,95,40,' + (0.05 + r() * 0.1) + ')'); g.addColorStop(1, 'rgba(150,95,40,0)');
    c.fillStyle = g; c.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  const eg = c.createRadialGradient(h, h, h * 0.7, h, h, h * 0.975);
  eg.addColorStop(0, 'rgba(120,80,35,0)'); eg.addColorStop(1, 'rgba(120,80,35,.32)');
  c.fillStyle = eg; c.fillRect(0, 0, px, px);
  c.restore();
  return cv;
}

// Fit one fortune into a wedge, printed along the radius from the rim inward (like the real dial):
// one or two lines of condensed capitals, as large as the wedge allows.
const COND = 0.7, LH = 0.92;
function layoutWedge(c, text, R) {
  const words = text.split(' '), opts = [[text]];
  for (let i = 1; i < words.length; i++) opts.push([words.slice(0, i).join(' '), words.slice(i).join(' ')]);
  const rOut = 0.885 * R, rHub = 0.13 * R, tanH = Math.tan(WEDGE / 2) * 0.93, cap = capOf(c, SERIF);
  c.font = '100px ' + SERIF;
  let best = null;
  opts.forEach(lines => {
    const ws = lines.map(l => c.measureText(l).width / 100 * COND), n = lines.length;
    function fits(s) {
      for (let j = 0; j < n; j++) {
        const rin = rOut - ws[j] * s;
        if (rin < rHub) return false;
        const off = n === 1 ? 0 : LH * s / 2;
        if (off + cap * s / 2 > rin * tanH) return false;
      }
      return true;
    }
    let lo = 0, hi = 0.082 * R;
    for (let it = 0; it < 22; it++) { const m = (lo + hi) / 2; if (fits(m)) lo = m; else hi = m; }
    // prefer balanced two-line splits slightly over cramped one-liners of the same size
    const score = lo * (n === 2 ? 1 - Math.abs(ws[0] - ws[1]) / (ws[0] + ws[1]) * 0.08 : 1);
    if (!best || score > best.score) best = { lines, s: lo, score };
  });
  return best;
}
function makeInk(px, R, fortunes, seed) {
  const cv = mkCanvas(px, px), c = cv.getContext('2d'), r = rng(seed), sc = px / (2 * R);
  c.setTransform(sc, 0, 0, sc, px / 2, px / 2);
  c.fillStyle = INK; c.strokeStyle = INK;
  // rings
  c.lineWidth = 0.013 * R; c.beginPath(); c.arc(0, 0, 0.928 * R, 0, TAU); c.stroke();
  c.lineWidth = 0.004 * R; c.globalAlpha = 0.7; c.beginPath(); c.arc(0, 0, 0.955 * R, 0, TAU); c.stroke();
  // wedge rules
  c.globalAlpha = 0.5; c.lineWidth = 0.0035 * R;
  for (let i = 0; i < N; i++) {
    const a = -Math.PI / 2 - WEDGE / 2 + i * WEDGE;
    c.beginPath(); c.moveTo(Math.cos(a) * 0.05 * R, Math.sin(a) * 0.05 * R); c.lineTo(Math.cos(a) * 0.922 * R, Math.sin(a) * 0.922 * R); c.stroke();
  }
  // text
  const cap = capOf(c, SERIF);
  fortunes.forEach((f, i) => {
    const L = layoutWedge(c, f, R), phi = -Math.PI / 2 + i * WEDGE, s = L.s;
    c.save();
    c.globalAlpha = 0.84 + r() * 0.16;
    c.rotate(phi + Math.PI + (r() - 0.5) * 0.008);
    c.font = s + 'px ' + SERIF;
    const n = L.lines.length, jx = (r() - 0.5) * 0.004 * R;
    L.lines.forEach((ln, j) => {
      const yc = n === 1 ? 0 : (j === 0 ? -LH * s / 2 : LH * s / 2);
      c.save(); c.translate(-0.885 * R + jx, yc + cap * s / 2); c.scale(COND, 1);
      c.fillText(ln, 0, 0);
      c.lineWidth = s * 0.025; c.strokeText(ln, 0, 0);   // a touch of ink spread
      c.restore();
    });
    c.restore();
  });
  c.globalAlpha = 1;
  // misprints: worn type and dropouts
  c.setTransform(1, 0, 0, 1, 0, 0);
  wear(c, 0, 0, px, px, Math.round(px * px / 260), r, Math.max(0.6, px / 900));
  return cv;
}
function composeDial(paper, ink) {
  const px = paper.width, cv = mkCanvas(px, px), c = cv.getContext('2d');
  c.drawImage(paper, 0, 0);
  c.globalCompositeOperation = 'multiply'; c.drawImage(ink, 0, 0);
  c.globalCompositeOperation = 'source-over';
  return cv;
}

// The pointer: a black felt teardrop, tip up towards the answer window
function drawPointer(c, R, kick, px) {
  const tip = 0.21 * R, rb = 0.072 * R;
  c.save(); c.rotate(kick);
  c.save();
  c.shadowColor = 'rgba(0,0,0,.6)'; c.shadowBlur = 10 * px; c.shadowOffsetX = 4 * px; c.shadowOffsetY = 7 * px;
  c.beginPath(); c.moveTo(0, -tip);
  c.bezierCurveTo(rb * 0.4, -tip * 0.62, rb * 1.05, -rb * 1.0, rb, 0);
  c.arc(0, 0, rb, 0, Math.PI);
  c.bezierCurveTo(-rb * 1.05, -rb * 1.0, -rb * 0.4, -tip * 0.62, 0, -tip);
  c.closePath();
  const g = c.createRadialGradient(-rb * 0.35, -rb * 0.6, 1, 0, -rb * 0.4, tip);
  g.addColorStop(0, '#3b3835'); g.addColorStop(0.4, '#151413'); g.addColorStop(1, '#050505');
  c.fillStyle = g; c.fill();
  c.restore();
  // felt texture
  c.save(); c.clip();
  c.fillStyle = 'rgba(255,255,255,.05)';
  for (let i = 0; i < 40; i++) { const a = i * 2.4, d = (i % 9) / 9 * tip * 0.9; c.fillRect(Math.cos(a) * d * 0.4, -Math.abs(Math.sin(a)) * d + rb * 0.6, 1.5, 1.5); }
  c.restore();
  // pivot
  const pg = c.createRadialGradient(-2, -2, 0, 0, 0, rb * 0.32);
  pg.addColorStop(0, '#6d6a66'); pg.addColorStop(1, '#141312');
  c.fillStyle = pg; c.beginPath(); c.arc(0, 0, rb * 0.3, 0, TAU); c.fill();
  c.restore();
}

// The brass token you drop in the slot
function drawCoin(cv, cssR, dpr) {
  const px = Math.ceil(cssR * 2 * dpr) + 2;
  cv.width = cv.height = px;
  const c = cv.getContext('2d'), h = px / 2, R = h - 1;
  const g = c.createRadialGradient(h - R * 0.35, h - R * 0.4, R * 0.05, h, h, R);
  g.addColorStop(0, '#fff1bf'); g.addColorStop(0.35, '#d9b25e'); g.addColorStop(0.8, '#9a7330'); g.addColorStop(1, '#5d4317');
  c.fillStyle = g; c.beginPath(); c.arc(h, h, R, 0, TAU); c.fill();
  // reeded rim
  c.strokeStyle = 'rgba(70,45,10,.55)'; c.lineWidth = Math.max(1, R * 0.03);
  for (let i = 0; i < 72; i++) { const a = i / 72 * TAU; c.beginPath(); c.moveTo(h + Math.cos(a) * R * 0.9, h + Math.sin(a) * R * 0.9); c.lineTo(h + Math.cos(a) * R, h + Math.sin(a) * R); c.stroke(); }
  c.strokeStyle = 'rgba(90,60,15,.7)'; c.lineWidth = R * 0.04; c.beginPath(); c.arc(h, h, R * 0.84, 0, TAU); c.stroke();
  c.strokeStyle = 'rgba(255,240,190,.5)'; c.lineWidth = R * 0.025; c.beginPath(); c.arc(h, h, R * 0.8, Math.PI * 0.9, Math.PI * 1.6); c.stroke();
  // dots ring and a star
  c.fillStyle = 'rgba(90,60,15,.75)';
  for (let i = 0; i < 24; i++) { const a = i / 24 * TAU; c.beginPath(); c.arc(h + Math.cos(a) * R * 0.7, h + Math.sin(a) * R * 0.7, R * 0.035, 0, TAU); c.fill(); }
  c.save(); c.translate(h, h); c.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, d = i % 2 ? R * 0.22 : R * 0.52; c.lineTo(Math.cos(a) * d, Math.sin(a) * d); }
  c.closePath();
  const sg = c.createLinearGradient(-R * 0.5, -R * 0.5, R * 0.5, R * 0.5);
  sg.addColorStop(0, '#ffeeb8'); sg.addColorStop(1, '#a07a33');
  c.fillStyle = sg; c.fill(); c.strokeStyle = 'rgba(80,50,10,.8)'; c.lineWidth = R * 0.035; c.stroke();
  c.restore();
}

// Paper texture for the ticket (a small tile, made once)
let paperURL = null;
function paperTile() {
  if (paperURL) return paperURL;
  try {
    const cv = mkCanvas(160, 160), c = cv.getContext('2d'), r = rng(77), img = c.createImageData(160, 160), d = img.data;
    for (let i = 0; i < d.length; i += 4) { const v = r(); d[i] = 120; d[i + 1] = 85; d[i + 2] = 40; d[i + 3] = Math.round(v * v * 34); }
    c.putImageData(img, 0, 0);
    paperURL = cv.toDataURL('image/png');
  } catch (e) { paperURL = ''; }
  return paperURL;
}

// ── Motion: closed-form phases, so a coin spin can be aimed at a wedge and lands exactly on it ──
const AB = FA / FB;
function S3(u) { return u * u * u - u * u * u * u / 2; }          // integral of smoothstep
function SM(u) { return u * u * (3 - 2 * u); }
function coastTime(w0) { return w0 <= WS ? 0 : Math.log((w0 + AB) / (WS + AB)) / FB; }
function coastDist(w0, t) { return (w0 + AB) * (1 - Math.exp(-FB * t)) / FB - AB * t; }

const CSS = `
.orc{position:absolute;inset:0;overflow:hidden;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none}
.orc-cv{position:absolute;display:block;max-width:none;max-height:none;opacity:0;transition:opacity .35s ease}
.orc-cv.on{opacity:1}
.orc-clip{position:absolute;overflow:hidden;pointer-events:none}
.orc-card{position:absolute;inset:0 14px 20px 14px;transform:translateY(-104%);transition:transform .75s cubic-bezier(.2,.85,.25,1);pointer-events:auto;cursor:pointer;
  color:#2a180c;background-color:#efe2c0;border-radius:2px 2px 5px 5px;
  box-shadow:0 5px 10px rgba(0,0,0,.38),inset 0 0 22px rgba(130,85,30,.32),inset 0 -2px 0 rgba(120,80,30,.25)}
.orc.l .orc-card{inset:16px 20px 16px 0;transform:translateX(-104%);border-radius:2px 5px 5px 2px}
.orc-card.out,.orc.l .orc-card.out{transform:none}
.orc-card-in{position:absolute;inset:7px;border:1.5px solid rgba(70,40,15,.6);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;text-align:center;padding:6px 12px;box-sizing:border-box}
.orc-card-in:before{content:"";position:absolute;inset:3px;border:1px solid rgba(70,40,15,.35);pointer-events:none}
.orc-head,.orc-foot{font-family:"Oracle Rye",Georgia,serif;color:#7a461a;letter-spacing:.14em;font-size:11px;line-height:1.1;white-space:nowrap}
.orc-text{font-family:"Oracle Pagella","Palatino Linotype",Palatino,Georgia,serif;font-size:24px;line-height:1.12;letter-spacing:.03em;color:#22130a;text-wrap:balance}
.orc-rule{width:46%;height:1px;background:linear-gradient(90deg,transparent,rgba(110,60,20,.6),transparent)}
.orc-coin{position:absolute;left:0;top:0;max-width:none;cursor:grab;touch-action:none;filter:drop-shadow(0 4px 5px rgba(0,0,0,.45));outline:none;border-radius:50%}
.orc-coin:focus-visible{box-shadow:0 0 0 3px var(--accent,#ffc83d)}
.orc-cap{position:absolute;font:600 .78rem/1.2 var(--font,system-ui);color:var(--text-2,#bbb);text-align:center;white-space:nowrap;pointer-events:none;transform:translateX(-50%);transition:opacity .3s}
.orc-new{position:absolute}
.orc-new svg{width:18px;height:18px}
`;

function mount(stage, api) {
  const K = (api && api.Kit) || window.Kit;
  const sfx = (n, v) => { try { K && K.sfx(n, v); } catch (e) {} };
  const haptic = n => { try { K && K.haptic(n); } catch (e) {} };
  let alive = true;

  // ── DOM ──
  const root = document.createElement('div'); root.className = 'orc';
  const style = document.createElement('style'); style.textContent = CSS; root.appendChild(style);
  const cv = document.createElement('canvas'); cv.className = 'orc-cv'; cv.setAttribute('role', 'img');
  cv.setAttribute('aria-label', 'Oracle Fortune Teller machine. Drag the dial to spin it.');
  root.appendChild(cv);
  const clip = document.createElement('div'); clip.className = 'orc-clip';
  const card = document.createElement('div'); card.className = 'orc-card'; card.setAttribute('role', 'status'); card.setAttribute('aria-live', 'polite');
  const tile = paperTile();
  if (tile) card.style.backgroundImage = 'radial-gradient(ellipse at 50% 40%,rgba(255,252,240,.6),rgba(255,252,240,0) 70%),url(' + tile + ')';
  card.innerHTML = '<div class="orc-card-in"><div class="orc-head">THE ORACLE READS</div><div class="orc-rule"></div><div class="orc-text"></div><div class="orc-rule"></div><div class="orc-foot"></div></div>';
  clip.appendChild(card); root.appendChild(clip);
  const cardText = card.querySelector('.orc-text'), cardFoot = card.querySelector('.orc-foot');
  const coinEl = document.createElement('canvas'); coinEl.className = 'orc-coin'; coinEl.tabIndex = 0;
  coinEl.setAttribute('role', 'button'); coinEl.setAttribute('aria-label', 'Drop a coin in the slot');
  root.appendChild(coinEl);
  const cap = document.createElement('div'); cap.className = 'orc-cap'; cap.textContent = 'Drop a coin'; root.appendChild(cap);
  const newBtn = document.createElement('button'); newBtn.type = 'button'; newBtn.className = 'btn btn-ghost btn-sm orc-new';
  newBtn.innerHTML = ((K && K.icon) ? K.icon('shuffle') : '') + '<span>New dial</span>';
  root.appendChild(newBtn);
  stage.appendChild(root);

  // ── State ──
  let L = null;                       // layout
  let bg = null, fg = null, paper = null, ink = null, dialTex = null, nextTex = null;
  let theta = 0, omega = 0, kick = 0, spin = null, drag = null, flip = null, result = null, coinBusy = false;
  let dialSet = [], revealed = new Set(), prevSet = new Set();
  let simT = 0, raf = 0, lastTick = 0, lastDraw = 0, needFull = true;
  let lastB = 0, lastSnd = 0, lastHap = 0;
  const timers = new Set(), anims = new Set();
  function later(fn, ms) { const t = setTimeout(() => { timers.delete(t); if (alive) fn(); }, ms); timers.add(t); return t; }
  function anim(el, kf, opt) { const a = el.animate(kf, opt); anims.add(a); a.finished.catch(() => {}).then(() => anims.delete(a)); return a; }

  function deal() {
    const all = shuffle(FORTUNES.map((_, i) => i), Math.random);
    all.sort((a, b) => (prevSet.has(a) ? 1 : 0) - (prevSet.has(b) ? 1 : 0));
    dialSet = all.slice(0, N);
    prevSet = new Set(dialSet); revealed = new Set();
  }
  deal();

  // ── Layout ──
  function layout() {
    const w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return false;
    const pad = 12;
    const B = clamp(h * 0.3, 200, 330), kP = Math.min((w - 2 * pad) / CW, (h - B - 2 * pad) / CH);
    const Rr = clamp(w * 0.36, 250, 400), kL = Math.min((w - Rr - 2 * pad) / CW, (h - 2 * pad) / CH);
    const mode = kL > kP * 1.05 ? 'l' : 'p';
    const k = Math.max(0.05, Math.min(mode === 'l' ? kL : kP, 0.8));
    const cw = CW * k, ch = CH * k;
    let x0, y0;
    if (mode === 'p') { x0 = (w - cw) / 2; y0 = pad + Math.max(0, (h - 2 * pad - ch - B) * 0.35); }
    else { x0 = pad + Math.max(0, (w - 2 * pad - cw - Rr) * 0.4); y0 = (h - ch) / 2; }
    const M = 30;
    let dpr = Math.min(window.devicePixelRatio || 1, 3);
    const cssW = cw + 2 * M, cssH = ch + 2 * M;
    if (cssW * cssH * dpr * dpr > 4.5e6) dpr = Math.sqrt(4.5e6 / (cssW * cssH));
    L = { w, h, pad, mode, k, x0, y0, M, dpr, cssW, cssH, pxW: Math.round(cssW * dpr), pxH: Math.round(cssH * dpr) };
    root.classList.toggle('l', mode === 'l');
    cv.style.left = (x0 - M) + 'px'; cv.style.top = (y0 - M) + 'px'; cv.style.width = cssW + 'px'; cv.style.height = cssH + 'px';
    cv.width = L.pxW; cv.height = L.pxH;
    // ticket
    if (mode === 'p') {
      const sy = y0 + TSLOT_P.y * k, cwid = Math.min(TSLOT_P.w * k * 0.98, 400);
      const chgt = clamp(h - sy - 74 - pad, 96, 240);
      L.clipH = chgt + 20;
      Object.assign(clip.style, { left: (x0 + cw / 2 - cwid / 2 - 14) + 'px', top: sy + 'px', width: (cwid + 28) + 'px', height: L.clipH + 'px' });
    } else {
      const sx = x0 + TSLOT_L.x * k, ht = Math.min(TSLOT_L.h * k * 0.98, 300) + 32, wd = Math.min(w - pad - sx, 380);
      L.clipH = ht;
      Object.assign(clip.style, { left: sx + 'px', top: (y0 + TSLOT_L.y * k - ht / 2) + 'px', width: wd + 'px', height: ht + 'px' });
    }
    // coin, caption, button
    const cr = clamp(Math.round(k * 64), 22, 34);
    L.coinR = cr;
    if (mode === 'p') { L.coinX = w - pad - cr - 10; L.coinY = h - pad - cr - 20; }
    else { L.coinX = Math.min(x0 + cw + cr + 46, w - pad - cr - 140); L.coinY = y0 + COINPLATE.y * k + 10; }
    drawCoin(coinEl, cr, Math.min(window.devicePixelRatio || 1, 3));
    coinEl.style.width = coinEl.style.height = (cr * 2) + 'px';
    if (!coinBusy) placeCoin(L.coinX, L.coinY);
    cap.style.left = L.coinX + 'px'; cap.style.top = (L.coinY + cr + 4) + 'px';
    if (mode === 'p') Object.assign(newBtn.style, { left: pad + 'px', top: 'auto', right: 'auto', bottom: pad + 'px' });
    else Object.assign(newBtn.style, { left: 'auto', top: pad + 'px', right: pad + 'px', bottom: 'auto' });
    L.slotX = x0 + COINPLATE.x * k; L.slotY = y0 + COINPLATE.y * k;
    if (card.classList.contains('out')) fitCard();
    return true;
  }
  function placeCoin(x, y) { coinEl.style.transform = 'translate(' + (x - L.coinR) + 'px,' + (y - L.coinR) + 'px)'; }

  // ── Layers ──
  function unitT(c) { c.setTransform(L.k * L.dpr, 0, 0, L.k * L.dpr, L.M * L.dpr, L.M * L.dpr); }
  function buildLayers() {
    if (!L) return;
    bg = mkCanvas(L.pxW, L.pxH); const b = bg.getContext('2d'); unitT(b); drawCabinet(b, L.k, L.dpr, L.mode);
    fg = mkCanvas(L.pxW, L.pxH); const f = fg.getContext('2d'); unitT(f); drawGlass(f);
    const px = Math.max(64, Math.round(2 * DIAL.r * L.k * L.dpr));
    if (!paper || paper.width !== px) paper = makePaper(px, 1897);
    buildDial();
  }
  function buildDial() {
    const px = paper.width;
    ink = makeInk(px, DIAL.r, dialSet.map(i => FORTUNES[i]), (dialSet[0] + 1) * 7919);
    dialTex = composeDial(paper, ink); ink = null;
  }
  function dialRect() {
    const pad = 16, u = L.k * L.dpr;
    const x = Math.floor((L.M + (DIAL.x - DIAL.r - pad) * L.k) * L.dpr), y = Math.floor((L.M + (DIAL.y - DIAL.r - pad) * L.k) * L.dpr);
    const s = Math.ceil((2 * DIAL.r + 2 * pad) * u) + 2;
    return [x, y, s, s];
  }

  // ── Drawing ──
  function drawWindow(c) {
    const x = WIN.x + 11, y = WIN.y + 10, w = WIN.w - 22, h = WIN.h - 20;
    c.save(); rr(c, x, y, w, h, 8); c.clip();
    if (result) {
      const g = c.createRadialGradient(x + w / 2, y + h / 2, 2, x + w / 2, y + h / 2, w * 0.7);
      g.addColorStop(0, '#fff2c4'); g.addColorStop(0.45, '#f2bf62'); g.addColorStop(1, '#8a4a12');
      c.fillStyle = g; c.fillRect(x, y, w, h);
      c.fillStyle = '#3a1c06'; c.textAlign = 'center';
      const capR = capOf(c, RYE);
      c.font = (12 / capR) + 'px ' + RYE; c.fillText('No.', x + w / 2, y + 19);
      const num = String(result.num), sz = 27;
      c.font = (sz / capR) + 'px ' + RYE;
      const tw = c.measureText(num).width, sx = Math.min(1, (w - 14) / tw);
      c.save(); c.translate(x + w / 2, y + h - 9); c.scale(sx, 1); c.fillText(num, 0, 0); c.restore();
      c.textAlign = 'start';
    } else {
      const g = c.createLinearGradient(x, y, x + w, y + h);
      g.addColorStop(0, 'rgba(255,255,255,.1)'); g.addColorStop(0.35, 'rgba(255,255,255,.02)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g; c.fillRect(x, y, w, h);
    }
    c.restore();
    if (result) {   // the lamp's glow on the face around the window
      c.save(); c.globalCompositeOperation = 'lighter';
      const g = c.createRadialGradient(WIN.x + WIN.w / 2, WIN.y + WIN.h / 2, WIN.h * 0.4, WIN.x + WIN.w / 2, WIN.y + WIN.h / 2, WIN.w * 0.95);
      g.addColorStop(0, 'rgba(255,170,60,.22)'); g.addColorStop(1, 'rgba(255,170,60,0)');
      c.fillStyle = g; c.fillRect(WIN.x - WIN.w, WIN.y - WIN.h, WIN.w * 3, WIN.h * 3);
      c.restore();
    }
  }
  function render(full) {
    if (!L || !bg || !dialTex) return;
    const c = cv.getContext('2d');
    const r = full ? [0, 0, L.pxW, L.pxH] : dialRect();
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(r[0], r[1], r[2], r[3]);
    c.drawImage(bg, r[0], r[1], r[2], r[3], r[0], r[1], r[2], r[3]);
    c.save();
    c.beginPath(); c.rect(r[0], r[1], r[2], r[3]); c.clip();
    unitT(c);
    if (full) drawWindow(c);
    const R = DIAL.r;
    c.save(); c.translate(DIAL.x, DIAL.y);
    let sx = 1;
    if (flip) sx = Math.max(0.02, Math.abs(Math.cos(Math.PI * flip.u)));
    c.scale(sx, 1);
    // motion blur while it whirs: a few faint copies spread over one frame's turn
    const span = spin ? Math.abs(omega) / 60 : 0, n = span > 0.012 ? Math.min(6, Math.ceil(span / 0.012)) : 1;
    for (let j = 0; j < n; j++) {
      c.save(); c.globalAlpha = 1 / (j + 1); c.rotate(theta - Math.sign(omega) * span * j / n);
      c.drawImage(dialTex, -R, -R, 2 * R, 2 * R); c.restore();
    }
    c.restore();
    if (flip) {
      c.save(); c.translate(DIAL.x, DIAL.y); c.scale(sx, 1);
      c.fillStyle = 'rgba(0,0,0,' + ((1 - sx) * 0.45) + ')'; c.beginPath(); c.arc(0, 0, R, 0, TAU); c.fill();
      c.restore();
    }
    if (result && !flip) {
      c.save(); c.translate(DIAL.x, DIAL.y);
      const a0 = -Math.PI / 2 - WEDGE / 2, a1 = -Math.PI / 2 + WEDGE / 2;
      c.beginPath(); c.arc(0, 0, 0.926 * R, a0, a1); c.arc(0, 0, 0.1 * R, a1, a0, true); c.closePath();
      c.globalCompositeOperation = 'multiply'; c.fillStyle = 'rgba(246,186,92,.75)'; c.fill();
      c.globalCompositeOperation = 'source-over';
      c.strokeStyle = 'rgba(140,40,12,.85)'; c.lineWidth = 3; c.lineJoin = 'round'; c.stroke();
      c.restore();
    }
    c.save(); c.translate(DIAL.x, DIAL.y); drawPointer(c, R, kick, L.k * L.dpr); c.restore();
    c.restore();
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.drawImage(fg, r[0], r[1], r[2], r[3], r[0], r[1], r[2], r[3]);
  }

  // ── Loop: runs only while something moves; at most ~60 draws a second; stops when hidden ──
  function moving() { return !!(spin || flip || Math.abs(kick) > 0.002); }
  function frame(now) {
    raf = 0;
    if (!alive || document.hidden) return;
    if (now - lastDraw < 12) { raf = requestAnimationFrame(frame); return; }
    const dt = Math.min(0.05, Math.max(0, (now - lastTick) / 1000));
    lastTick = now; lastDraw = now;
    step(dt);
    render(needFull); needFull = false;
    if (moving()) raf = requestAnimationFrame(frame);
  }
  function wake(full) {
    if (full) needFull = true;
    if (!raf && alive && !document.hidden) { lastTick = performance.now(); raf = requestAnimationFrame(frame); }
  }

  // ── Physics ──
  function topWedge(th) { return mod(Math.round(-th / WEDGE), N); }
  function ratchet(dir, speed) {
    const b = Math.floor(theta / WEDGE - 0.5);
    if (b === lastB) return;
    lastB = b;
    const now = performance.now();
    kick = clamp(dir * (0.05 + Math.min(speed, 6) * 0.006), -0.11, 0.11);
    if (now - lastSnd > 32) { lastSnd = now; sfx('tick', speed > 6 ? 0.55 : 0.85); }
    if (now - lastHap > 70 && speed < 9) { lastHap = now; haptic('tick'); }
  }
  function enterCoast(th, w0, dir, counts) {
    spin = { phase: 'coast', t0: simT, th0: th, w0, dir, counts, ts: coastTime(w0) };
    if (spin.ts <= 0) enterNotch(th, w0, dir, counts);
  }
  function enterNotch(th, v, dir, counts) {
    const q = th / WEDGE;
    let c = (dir > 0 ? Math.ceil(q - 1e-9) : Math.floor(q + 1e-9)) * WEDGE;
    const d = Math.abs(c - th);
    const vv = Math.max(0, v);
    const T = d < 1e-6 ? 0 : Math.min(vv >= 0.35 ? 2 * d / vv : 4 * d / Math.max(vv, 0.05), 1.6);
    spin = { phase: 'notch', t0: simT, th0: th, c, d, v: vv, T, dir, counts };
  }
  function step(dt) {
    const th0 = theta;
    stepInner(dt);
    if (dt > 0) omega = drag ? 0 : (theta - th0) / dt;
  }
  function stepInner(dt) {
    simT += dt;
    kick *= Math.exp(-dt * 16);
    if (Math.abs(kick) <= 0.002) kick = 0;
    if (flip) {
      const was = flip.u;
      flip.u = Math.min(1, (simT - flip.t0) / 0.7);
      if (was < 0.5 && flip.u >= 0.5) { dialTex = nextTex; nextTex = null; sfx('deal'); }
      if (flip.u >= 1) { const done = flip.done; flip = null; if (done) done(); }
    }
    if (!spin) return;
    const s = spin, t = simT - s.t0;
    if (s.phase === 'motor') {
      let speed;
      if (t < s.Tr) { theta = s.th0 + s.dir * s.wmax * s.Tr * S3(t / s.Tr); speed = s.wmax * SM(t / s.Tr); }
      else if (t < s.Tr + s.Th) { theta = s.th0 + s.dir * (s.wmax * s.Tr / 2 + s.wmax * (t - s.Tr)); speed = s.wmax; }
      else {
        const th = s.th0 + s.dir * (s.wmax * s.Tr / 2 + s.wmax * s.Th);
        spin = null; enterCoast(th, s.wmax, s.dir, s.counts); spin.t0 = s.t0 + s.Tr + s.Th;
        return stepInner(0);
      }
      ratchet(s.dir, speed);
    } else if (s.phase === 'coast') {
      if (t < s.ts) {
        theta = s.th0 + s.dir * coastDist(s.w0, t);
        ratchet(s.dir, (s.w0 + AB) * Math.exp(-FB * t) - AB);
      } else {
        const th = s.th0 + s.dir * coastDist(s.w0, s.ts);
        const t0 = s.t0 + s.ts;
        enterNotch(th, WS, s.dir, s.counts); spin.t0 = t0;
        return stepInner(0);
      }
    } else if (s.phase === 'notch') {
      const u = s.T > 0 ? Math.min(1, t / s.T) : 1;
      const p = (u * u * u - 2 * u * u + u) * s.T * s.v + (-2 * u * u * u + 3 * u * u) * s.d;
      theta = s.th0 + s.dir * Math.min(p, s.d);
      ratchet(s.dir, s.v * (1 - u));
      if (u >= 1) {
        theta = s.c; spin = null;
        sfx('pop', 0.6); haptic('light');
        kick = -s.dir * 0.04;
        if (s.counts) land();
      }
    }
  }
  // Aim a motor spin so it coasts to a stop on wedge i
  function motorSpin(i) {
    const wmax = WMAX * (0.94 + Math.random() * 0.12), Tr = TRAMP;
    const Dfix = wmax * Tr / 2 + coastDist(wmax, coastTime(wmax));
    const thc = -i * WEDGE, frac = 0.2 + Math.random() * 0.6;
    const want = thc - frac * WEDGE;                 // where the coast should hand over to the notch
    const base = mod(want - theta - Dfix, TAU) / wmax, turn = TAU / wmax;
    const ks = []; for (let k = 0; k < 6; k++) { const Th = base + k * turn; if (Th >= 0.55 && Th <= 1.5) ks.push(Th); }
    const Th = ks.length ? ks[Math.floor(Math.random() * ks.length)] : base + turn;
    spin = { phase: 'motor', t0: simT, th0: theta, dir: 1, wmax, Tr, Th, counts: true, target: i };
    lastB = Math.floor(theta / WEDGE - 0.5);
    sfx('whoosh', 0.7); haptic('medium');
    wake();
  }
  function pickTarget() {
    const left = []; for (let i = 0; i < N; i++) if (!revealed.has(i)) left.push(i);
    return left.length ? left[Math.floor(Math.random() * left.length)] : Math.floor(Math.random() * N);
  }
  function busy() { return !!(spin || flip || drag); }

  // ── Result ──
  function land() {
    const i = topWedge(theta), fi = dialSet[i], text = FORTUNES[fi];
    revealed.add(i);
    result = { i, fi, num: fi + 1, text };
    wake(true);
    later(() => { sfx('sparkle', 0.8); haptic('success'); }, 160);
    later(() => showCard(), 420);
    try { api && api.onAnswer && api.onAnswer(text); } catch (e) {}
  }
  function clearResult() {
    if (!result) return;
    result = null; hideCard(); wake(true);
  }
  function fitCard() {
    const box = card.querySelector('.orc-card-in');
    if (L) clip.style.height = L.clipH + 'px';
    let fs = L && L.mode === 'l' ? 30 : 32;
    cardText.style.fontSize = fs + 'px';
    for (let n = 0; n < 30 && fs > 13 && (box.scrollHeight > box.clientHeight + 1 || cardText.scrollWidth > cardText.clientWidth + 1); n++) {
      fs -= 1; cardText.style.fontSize = fs + 'px';
    }
    // then shrink the ticket to its print (portrait: it hangs from the slot)
    if (L && L.mode === 'p') {
      box.style.bottom = 'auto'; const need = box.offsetHeight + 40; box.style.bottom = '';
      clip.style.height = Math.min(L.clipH, Math.max(need, 110)) + 'px';
    }
  }
  function showCard() {
    if (!result) return;
    cardText.textContent = result.text;
    cardFoot.textContent = 'No. ' + result.num;
    fitCard();
    card.classList.add('out');
    sfx('deal'); later(() => sfx('flip', 0.7), 260);
  }
  function hideCard() { if (card.classList.contains('out')) { card.classList.remove('out'); sfx('slide'); } }

  // ── Reload: the dial flips over and comes back with a fresh 30 ──
  function reload(done) {
    if (flip) return;
    clearResult();
    deal();
    const keep = dialTex;
    buildDial(); nextTex = dialTex; dialTex = keep;
    flip = { t0: simT, u: 0, done };
    sfx('flip'); haptic('light');
    wake();
  }

  // ── Coin ──
  function coinPos() {
    const m = /translate\(([-\d.]+)px,\s*([-\d.]+)px\)/.exec(coinEl.style.transform || '');
    return m ? [parseFloat(m[1]) + L.coinR, parseFloat(m[2]) + L.coinR] : [L.coinX, L.coinY];
  }
  function refuseCoin(from) {
    sfx('tap'); haptic('error');
    const p = from || coinPos();
    const a = anim(coinEl, [
      { transform: 'translate(' + (p[0] - L.coinR) + 'px,' + (p[1] - L.coinR) + 'px)' },
      { transform: 'translate(' + (L.coinX - L.coinR) + 'px,' + (L.coinY - L.coinR) + 'px)' }], { duration: 320, easing: 'cubic-bezier(.3,1.4,.5,1)' });
    a.finished.then(() => { if (alive) placeCoin(L.coinX, L.coinY); }).catch(() => {});
  }
  function insertCoin(target) {
    if (!L) return false;
    if (coinBusy || busy()) { refuseCoin(); return false; }
    coinBusy = true;
    clearResult();
    cap.style.opacity = '0';
    const p = coinPos(), r = L.coinR, sx = L.slotX, sy = L.slotY;
    const tf = (x, y, s) => 'translate(' + (x - r) + 'px,' + (y - r) + 'px) ' + (s || '');
    const a = anim(coinEl, [
      { transform: tf(p[0], p[1], 'scale(1)'), opacity: 1 },
      { transform: tf(sx, sy - r * 0.2, 'scale(.82)'), opacity: 1, offset: 0.62 },
      { transform: tf(sx, sy, 'scale(.14,.7)'), opacity: 1, offset: 0.84 },
      { transform: tf(sx, sy + r * 0.1, 'scale(.06,.55)'), opacity: 0 }], { duration: 560, easing: 'cubic-bezier(.4,0,.3,1)', fill: 'forwards' });
    a.finished.then(() => {
      if (!alive) return;
      coinEl.style.visibility = 'hidden'; a.cancel(); placeCoin(L.coinX, L.coinY);
      sfx('chip'); haptic('medium');
      later(() => sfx('tick', 0.8), 110); later(() => sfx('tick', 0.6), 210); later(() => sfx('tick', 0.5), 290);
      later(() => {
        coinBusy = false;
        const go = () => motorSpin(target != null ? target : pickTarget());
        if (revealed.size >= N) reload(go); else go();
        later(respawnCoin, 700);
      }, 420);
    }).catch(() => {});
    return true;
  }
  function respawnCoin() {
    placeCoin(L.coinX, L.coinY);
    coinEl.style.visibility = '';
    anim(coinEl, [{ opacity: 0, transform: coinEl.style.transform + ' scale(.6)' }, { opacity: 1, transform: coinEl.style.transform + ' scale(1)' }], { duration: 280, easing: 'ease-out' });
  }
  let coinDrag = null;
  function onCoinDown(e) {
    if (coinBusy || !L) return;
    e.preventDefault(); e.stopPropagation();
    try { coinEl.setPointerCapture(e.pointerId); } catch (er) {}
    const p = coinPos();
    coinDrag = { id: e.pointerId, ox: e.clientX - p[0], oy: e.clientY - p[1], sx: e.clientX, sy: e.clientY, moved: 0 };
    coinEl.style.cursor = 'grabbing';
  }
  function onCoinMove(e) {
    if (!coinDrag || e.pointerId !== coinDrag.id) return;
    coinDrag.moved = Math.max(coinDrag.moved, Math.hypot(e.clientX - coinDrag.sx, e.clientY - coinDrag.sy));
    placeCoin(e.clientX - coinDrag.ox, e.clientY - coinDrag.oy);
  }
  function onCoinUp(e) {
    if (!coinDrag || e.pointerId !== coinDrag.id) return;
    const d = coinDrag; coinDrag = null; coinEl.style.cursor = '';
    const p = coinPos(), near = Math.hypot(p[0] - L.slotX, p[1] - L.slotY) < Math.max(44, 110 * L.k);
    if (e.type === 'pointercancel') { refuseCoin(p); return; }
    if (near || d.moved < 8) insertCoin();
    else refuseCoin(p);
  }
  function onCoinKey(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); insertCoin(); } }

  // ── The dial by hand, the slot and the window ──
  function toUnits(e) {
    const b = cv.getBoundingClientRect();
    return [(e.clientX - b.left - L.M) / L.k, (e.clientY - b.top - L.M) / L.k];
  }
  function onDown(e) {
    if (!L || drag) return;
    const u = toUnits(e), cp = COINPLATE;
    if (Math.abs(u[0] - cp.x) < cp.w / 2 + 26 && Math.abs(u[1] - cp.y) < cp.h / 2 + 20) { e.preventDefault(); insertCoin(); return; }
    if (result && u[0] > WIN.x - 10 && u[0] < WIN.x + WIN.w + 10 && u[1] > WIN.y - 10 && u[1] < WIN.y + WIN.h + 10) {
      if (!card.classList.contains('out')) showCard();
      return;
    }
    const dx = u[0] - DIAL.x, dy = u[1] - DIAL.y;
    if (dx * dx + dy * dy > DIAL.r * DIAL.r || flip) return;
    e.preventDefault();
    try { cv.setPointerCapture(e.pointerId); } catch (er) {}
    spin = null; clearResult();
    const a = Math.atan2(dy, dx), now = performance.now();
    drag = { id: e.pointerId, a, samples: [[now, theta]] };
    lastB = Math.floor(theta / WEDGE - 0.5);
    haptic('light');
  }
  function onMove(e) {
    if (!drag || e.pointerId !== drag.id) return;
    const u = toUnits(e), a = Math.atan2(u[1] - DIAL.y, u[0] - DIAL.x);
    let da = a - drag.a; if (da > Math.PI) da -= TAU; else if (da < -Math.PI) da += TAU;
    drag.a = a; theta += da;
    const now = performance.now();
    drag.samples.push([now, theta]);
    while (drag.samples.length > 2 && now - drag.samples[0][0] > 110) drag.samples.shift();
    const s = drag.samples, dtv = (now - s[0][0]) / 1000;
    ratchet(da >= 0 ? 1 : -1, dtv > 0 ? Math.abs(theta - s[0][1]) / dtv : 0);
    wake();
  }
  function onUp(e) {
    if (!drag || e.pointerId !== drag.id) return;
    const s = drag.samples, now = performance.now(); drag = null;
    let w = 0;
    const recent = s.filter(p => now - p[0] < 110);
    if (recent.length >= 2) { const a = recent[0], b = recent[recent.length - 1], dts = (b[0] - a[0]) / 1000; if (dts > 0.01 && now - b[0] < 80) w = (b[1] - a[1]) / dts; }
    w = clamp(w, -30, 30);
    const dir = w >= 0 ? 1 : -1, sp = Math.abs(w);
    if (sp >= FLICK_MIN) { sfx('whoosh', 0.5); enterCoast(theta, sp, dir, true); }
    else enterNotch(theta, sp, sp > 0.05 ? dir : (mod(theta, WEDGE) < WEDGE / 2 ? -1 : 1), false);
    wake();
  }

  // ── Wiring ──
  cv.addEventListener('pointerdown', onDown);
  cv.addEventListener('pointermove', onMove);
  cv.addEventListener('pointerup', onUp);
  cv.addEventListener('pointercancel', onUp);
  coinEl.addEventListener('pointerdown', onCoinDown);
  coinEl.addEventListener('pointermove', onCoinMove);
  coinEl.addEventListener('pointerup', onCoinUp);
  coinEl.addEventListener('pointercancel', onCoinUp);
  coinEl.addEventListener('keydown', onCoinKey);
  card.addEventListener('click', () => hideCard());
  function onNew() { if (busy() || coinBusy) { sfx('tap'); return; } reload(); }
  newBtn.addEventListener('click', onNew);
  function onVis() { if (document.hidden) { if (raf) cancelAnimationFrame(raf); raf = 0; } else if (moving()) wake(true); else { needFull = true; wake(true); } }
  document.addEventListener('visibilitychange', onVis);
  let roT = 0;
  function relayout() { if (!alive) return; if (layout()) { buildLayers(); wake(true); } }
  const ro = new ResizeObserver(() => { clearTimeout(roT); roT = setTimeout(relayout, 60); });
  ro.observe(stage);

  relayout();
  let shown = false;
  function showCanvas() { if (shown || !alive) return; shown = true; cv.classList.add('on'); }
  const fontTimer = later(showCanvas, 1500);
  loadFonts().then(() => {
    if (!alive) return;
    for (const k in capCache) delete capCache[k];
    relayout(); showCanvas(); clearTimeout(fontTimer);
  });

  // Test hook
  const hook = {
    coin: i => insertCoin(i),
    spin: i => { if (busy()) return false; clearResult(); motorSpin(i != null ? i : pickTarget()); return true; },
    flick: w => { if (busy()) return false; clearResult(); enterCoast(theta, Math.abs(w), w >= 0 ? 1 : -1, true); wake(); return true; },
    newDial: () => { if (busy()) return false; reload(); return true; },
    state: () => ({ phase: spin ? spin.phase : (flip ? 'flip' : drag ? 'drag' : 'idle'), theta, top: topWedge(theta), target: spin && spin.target, result: result && { ...result }, revealed: revealed.size, dial: dialSet.map(i => FORTUNES[i]), mode: L && L.mode, k: L && L.k, cardOut: card.classList.contains('out'), drawing: !!raf })
  };
  window.__oracle = hook;

  return {
    test: hook,
    unmount() {
      alive = false;
      if (raf) cancelAnimationFrame(raf); raf = 0;
      timers.forEach(t => clearTimeout(t)); timers.clear(); clearTimeout(roT);
      anims.forEach(a => { try { a.cancel(); } catch (e) {} }); anims.clear();
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      cv.removeEventListener('pointerdown', onDown); cv.removeEventListener('pointermove', onMove);
      cv.removeEventListener('pointerup', onUp); cv.removeEventListener('pointercancel', onUp);
      coinEl.removeEventListener('pointerdown', onCoinDown); coinEl.removeEventListener('pointermove', onCoinMove);
      coinEl.removeEventListener('pointerup', onCoinUp); coinEl.removeEventListener('pointercancel', onCoinUp);
      coinEl.removeEventListener('keydown', onCoinKey); newBtn.removeEventListener('click', onNew);
      [cv, bg, fg, paper, dialTex, nextTex, coinEl].forEach(c => { if (c) { c.width = c.height = 0; } });
      bg = fg = paper = dialTex = nextTex = null;
      if (window.__oracle === hook) delete window.__oracle;
      stage.innerHTML = '';
    }
  };
}

export default {
  id: 'oracle',
  name: 'Oracle Dial',
  blurb: 'Drop a coin, spin the dial',
  rules: '<h3>Oracle Dial</h3>' +
    '<p>An old penny-arcade fortune machine that reads your character. Drop a coin and the dial whirs round, ' +
    'slows down and clicks to a stop. The fortune under the black pointer is yours. The answer window lights up ' +
    'and a printed ticket slides out of the machine.</p>' +
    '<p><b>Drop a coin:</b> tap the brass coin slot on the right of the machine, or drag the coin into it.</p>' +
    '<p><b>Spin it by hand:</b> grab the dial and flick it. A good hard flick tells a fortune too. A gentle push just turns it.</p>' +
    '<p><b>The ticket:</b> tap it to put it away. Tap the answer window to see it again.</p>' +
    '<p><b>New dial:</b> each dial holds 30 readings from a book of 300. Coins pick readings you have not had yet. ' +
    'When you have had all 30, the next coin loads a fresh dial. Tap New dial to change it any time.</p>',
  mount
};
