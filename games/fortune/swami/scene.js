// The Great Zandor's glass case: a velvet curtain, the swami from the waist up, and his crystal ball,
// drawn on a 2D canvas. Scene units: a 200 x 200 box with the swami centred and the table along the
// bottom. Everything that does not move is painted once per size into sprites; a performing frame is a
// handful of drawImage calls plus the live sleeves, ball and glows, so it stays cheap on a phone.
//
// createScene() -> { build(w, h, dpr), draw(g, pose), pose(t, wake) }
//   build: size the scene to a case opening of w x h CSS pixels (re-run on resize)
//   pose(t, wake): the rig at time t (seconds into a performance) with the machine wake 0..1
//   draw(g, pose): paint one frame onto a canvas context sized w*dpr x h*dpr

const TAU = Math.PI * 2;

function cv(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h));
  return c;
}
// A sprite is a canvas holding local units b = [x0, y0, x1, y1] at k pixels per unit.
function sprite(b, k, draw) {
  const c = cv((b[2] - b[0]) * k, (b[3] - b[1]) * k), g = c.getContext('2d');
  g.setTransform(k, 0, 0, k, -b[0] * k, -b[1] * k);
  draw(g);
  return { c, b };
}
function blit(g, sp) { g.drawImage(sp.c, sp.b[0], sp.b[1], sp.b[2] - sp.b[0], sp.b[3] - sp.b[1]); }
function rng(seed) {
  let a = seed >>> 0;
  return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
function hex(c) { return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]; }
function mix(a, b, t) {
  const A = hex(a), B = hex(b);
  return 'rgb(' + A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',') + ')';
}
function lin(g, x0, y0, x1, y1, stops) { const r = g.createLinearGradient(x0, y0, x1, y1); stops.forEach(s => r.addColorStop(s[0], s[1])); return r; }
function rad(g, x0, y0, r0, x1, y1, r1, stops) { const r = g.createRadialGradient(x0, y0, r0, x1, y1, r1); stops.forEach(s => r.addColorStop(s[0], s[1])); return r; }
const GOLD = [[0, '#5e3d0e'], [0.22, '#c8962f'], [0.42, '#fff0b4'], [0.58, '#dcae45'], [0.8, '#8a6118'], [1, '#3e2707']];
function gold(g, x0, y0, x1, y1) { return lin(g, x0, y0, x1, y1, GOLD); }
function ell(g, x, y, rx, ry, rot) { g.beginPath(); g.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot || 0, 0, TAU); }

// ── Palette ────────────────────────────────────────────────────────────────
const SKIN = { hi: '#f0c595', mid: '#c98b5c', lo: '#8a5233', deep: '#552a17' };
const ROBE = { hi: '#2f9a74', mid: '#17654c', lo: '#0b3a2c', deep: '#041a13' };

// ── Curtain, valance and the back of the case (scene units, bounds = the whole case) ──
function paintCurtain(g, b) {
  const [x0, y0, x1, y1] = b, w = x1 - x0, h = y1 - y0, R = rng(11);
  // velvet folds: a long horizontal gradient of dark troughs and soft crests
  const fold = 15, n = Math.ceil(w / fold) + 1, lg = g.createLinearGradient(x0, 0, x1, 0);
  const prof = [0.04, 0.42, 0.95, 0.5];
  for (let i = 0; i <= n * 4; i++) {
    const v = prof[i % 4] * (0.7 + R() * 0.35);
    lg.addColorStop(Math.min(1, i / (n * 4)), mix('#1a0207', '#8c1a2e', Math.min(1, v)));
  }
  g.fillStyle = lg; g.fillRect(x0, y0, w, h);
  // the folds bunch and sway a little: thin dark seams and sheen strokes
  for (let i = 0; i < n; i++) {
    const x = x0 + i * fold + fold * 0.05 + R() * 2, sway = (R() - 0.5) * 6;
    g.beginPath(); g.moveTo(x, y0); g.bezierCurveTo(x + sway, y0 + h * 0.35, x - sway, y0 + h * 0.7, x + sway * 0.5, y1);
    g.strokeStyle = 'rgba(10,0,3,.35)'; g.lineWidth = 1.6; g.stroke();
    const xs = x + fold * 0.5;
    g.beginPath(); g.moveTo(xs, y0); g.bezierCurveTo(xs + sway, y0 + h * 0.35, xs - sway, y0 + h * 0.7, xs + sway * 0.5, y1);
    g.strokeStyle = 'rgba(255,150,160,.07)'; g.lineWidth = 2.2; g.stroke();
  }
  // a warm lamp in the top of the case, darkness gathering at the sides and floor
  g.fillStyle = rad(g, 100, y0 - 10, 5, 100, y0 + 30, Math.max(w, h) * 0.85, [[0, 'rgba(255,190,130,.30)'], [0.45, 'rgba(255,140,100,.08)'], [1, 'rgba(0,0,0,0)']]);
  g.fillRect(x0, y0, w, h);
  g.fillStyle = lin(g, 0, y0, 0, y1, [[0, 'rgba(0,0,0,.45)'], [0.18, 'rgba(0,0,0,0)'], [0.6, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,.55)']]);
  g.fillRect(x0, y0, w, h);
  g.fillStyle = rad(g, 100, 110, 30, 100, 110, Math.max(w, h) * 0.75, [[0, 'rgba(0,0,0,0)'], [0.6, 'rgba(0,0,0,.25)'], [1, 'rgba(0,0,0,.7)']]);
  g.fillRect(x0, y0, w, h);
}

function paintValance(g, b) {
  const [x0, y0, x1] = b, w = x1 - x0;
  const band = 6, depth = 11, sw = Math.max(40, w / Math.max(3, Math.round(w / 56)));
  const count = Math.ceil(w / sw);
  const start = 100 - (count * sw) / 2;
  // shadow it casts on the curtain
  g.save();
  g.fillStyle = lin(g, 0, y0 + band, 0, y0 + band + depth + 10, [[0, 'rgba(0,0,0,.55)'], [1, 'rgba(0,0,0,0)']]);
  g.fillRect(x0, y0 + band, w, depth + 10);
  g.restore();
  for (let i = 0; i < count; i++) {
    const a = start + i * sw, z = a + sw, m = (a + z) / 2;
    g.beginPath(); g.moveTo(a, y0); g.lineTo(a, y0 + band); g.quadraticCurveTo(m, y0 + band + depth * 2, z, y0 + band); g.lineTo(z, y0); g.closePath();
    g.fillStyle = rad(g, m, y0 + band, 2, m, y0 + band, sw * 0.62, [[0, '#a3253a'], [0.55, '#6c0f1f'], [1, '#2a040b']]);
    g.fill();
    // draped folds following the hem
    for (let k = 1; k <= 3; k++) {
      g.beginPath(); g.moveTo(a + 1, y0 + band * (k / 4)); g.quadraticCurveTo(m, y0 + band + depth * 2 * (k / 4.2), z - 1, y0 + band * (k / 4));
      g.strokeStyle = 'rgba(20,0,5,.35)'; g.lineWidth = 0.9; g.stroke();
      g.beginPath(); g.moveTo(a + 1, y0 + band * (k / 4) - 1.2); g.quadraticCurveTo(m, y0 + band + depth * 2 * (k / 4.2) - 1.2, z - 1, y0 + band * (k / 4) - 1.2);
      g.strokeStyle = 'rgba(255,170,170,.12)'; g.lineWidth = 0.7; g.stroke();
    }
    // gold braid and fringe on the hem
    g.beginPath(); g.moveTo(a, y0 + band); g.quadraticCurveTo(m, y0 + band + depth * 2, z, y0 + band);
    g.strokeStyle = gold(g, 0, y0 + band, 0, y0 + band + depth + 2); g.lineWidth = 1.4; g.stroke();
    for (let t = 0.02; t < 1; t += 0.035) {
      const px = a + (z - a) * t, py = y0 + band + 2 * t * (1 - t) * depth * 2;
      g.beginPath(); g.moveTo(px, py + 0.6); g.lineTo(px + 0.2, py + 3.6);
      g.strokeStyle = t * 100 % 7 < 3.5 ? 'rgba(240,200,110,.9)' : 'rgba(170,120,40,.9)'; g.lineWidth = 0.55; g.stroke();
    }
  }
  // top band
  g.fillStyle = lin(g, 0, y0, 0, y0 + band, [[0, '#2a040b'], [0.5, '#7a1426'], [1, '#3a0610']]);
  g.fillRect(x0, y0, w, band);
  g.fillStyle = gold(g, 0, y0 + band - 1.2, 0, y0 + band + 0.4); g.fillRect(x0, y0 + band - 1.2, w, 1.4);
  // tassels where the swags meet
  for (let i = 0; i <= count; i++) {
    const x = start + i * sw, y = y0 + band;
    g.fillStyle = gold(g, x - 1.5, y, x + 1.5, y + 2); ell(g, x, y + 1.2, 1.4, 1.5); g.fill();
    g.beginPath(); g.moveTo(x - 1.1, y + 2.4); g.lineTo(x - 2.2, y + 10); g.lineTo(x + 2.2, y + 10); g.lineTo(x + 1.1, y + 2.4); g.closePath();
    g.fillStyle = lin(g, x - 2.2, 0, x + 2.2, 0, [[0, '#7a5414'], [0.45, '#f3d27a'], [1, '#6b4810']]); g.fill();
    for (let k = -2; k <= 2; k++) { g.beginPath(); g.moveTo(x + k * 0.45, y + 3); g.lineTo(x + k * 1.0, y + 10); g.strokeStyle = 'rgba(80,50,10,.5)'; g.lineWidth = 0.3; g.stroke(); }
  }
}

// ── The robe (static, part of the back layer) ─────────────────────────────
function paintTorso(g) {
  // neck
  g.beginPath(); g.moveTo(91, 92); g.lineTo(109, 92); g.lineTo(111, 112); g.lineTo(89, 112); g.closePath();
  g.fillStyle = lin(g, 89, 0, 111, 0, [[0, SKIN.deep], [0.35, SKIN.mid], [0.6, '#b07246'], [1, SKIN.deep]]); g.fill();
  g.fillStyle = lin(g, 0, 92, 0, 112, [[0, 'rgba(40,15,5,.75)'], [0.6, 'rgba(40,15,5,.15)'], [1, 'rgba(40,15,5,.35)']]); g.fill();

  // robe body
  g.beginPath();
  g.moveTo(88, 107);
  g.bezierCurveTo(78, 110, 62, 112, 54, 117);
  g.bezierCurveTo(45, 122, 41, 133, 40, 148);
  g.lineTo(38, 205); g.lineTo(162, 205); g.lineTo(160, 148);
  g.bezierCurveTo(159, 133, 155, 122, 146, 117);
  g.bezierCurveTo(138, 112, 122, 110, 112, 107);
  g.closePath();
  g.save();
  g.fillStyle = rad(g, 88, 116, 4, 100, 135, 80, [[0, ROBE.hi], [0.3, ROBE.mid], [0.7, ROBE.lo], [1, ROBE.deep]]);
  g.fill();
  g.clip();
  // velvet folds falling from the shoulders
  const folds = [[60, 120, 54, 200], [70, 116, 66, 200], [82, 114, 80, 200], [130, 116, 136, 200], [142, 120, 148, 200], [118, 114, 120, 200]];
  folds.forEach(([a, b, c, d], i) => {
    g.beginPath(); g.moveTo(a, b); g.bezierCurveTo(a - 3, b + 30, c + 4, d - 40, c, d);
    g.strokeStyle = 'rgba(0,15,8,.45)'; g.lineWidth = 2.4; g.stroke();
    g.beginPath(); g.moveTo(a + 2.2, b); g.bezierCurveTo(a - 0.8, b + 30, c + 6.2, d - 40, c + 2.2, d);
    g.strokeStyle = i < 3 ? 'rgba(140,255,210,.10)' : 'rgba(140,255,210,.06)'; g.lineWidth = 1.2; g.stroke();
  });
  // brocade: small gold paisley dots scattered on the velvet
  const R = rng(5);
  for (let i = 0; i < 70; i++) {
    const x = 42 + R() * 116, y = 112 + R() * 70;
    g.beginPath(); g.arc(x, y, 0.55, 0, TAU); g.fillStyle = 'rgba(230,190,90,' + (0.18 + R() * 0.18) + ')'; g.fill();
    g.beginPath(); g.arc(x + 0.9, y - 0.6, 0.9, Math.PI * 0.6, Math.PI * 1.7); g.strokeStyle = 'rgba(230,190,90,.16)'; g.lineWidth = 0.35; g.stroke();
  }
  // shoulder light from the lamp above
  g.fillStyle = rad(g, 100, 95, 10, 100, 110, 70, [[0, 'rgba(255,210,160,.18)'], [1, 'rgba(255,210,160,0)']]);
  g.fillRect(38, 100, 124, 100);
  g.restore();

  // V opening with an ivory silk shirt
  g.beginPath(); g.moveTo(90.5, 109); g.lineTo(100, 140); g.lineTo(109.5, 109); g.closePath();
  g.fillStyle = lin(g, 90, 0, 110, 0, [[0, '#8f7a58'], [0.4, '#efe2c4'], [0.7, '#d9c7a1'], [1, '#7c6747']]); g.fill();
  // gold trim along the V and the collar
  g.lineJoin = 'round';
  g.beginPath(); g.moveTo(89, 108); g.lineTo(100, 141); g.lineTo(111, 108);
  g.strokeStyle = gold(g, 0, 105, 0, 141); g.lineWidth = 2.6; g.stroke();
  g.strokeStyle = 'rgba(60,35,5,.6)'; g.lineWidth = 0.4; g.stroke();
  // collar band around the neck
  g.beginPath(); g.moveTo(87, 103); g.quadraticCurveTo(100, 109, 113, 103); g.lineTo(113.5, 108.5); g.quadraticCurveTo(100, 114, 86.5, 108.5); g.closePath();
  g.fillStyle = gold(g, 0, 103, 0, 113); g.fill();
  g.strokeStyle = 'rgba(60,35,5,.7)'; g.lineWidth = 0.4; g.stroke();
  for (let i = 0; i < 9; i++) {
    const x = 89 + i * 2.75, y = 106.2 + Math.sin((i / 8) * Math.PI) * 3;
    g.beginPath(); g.arc(x, y, 0.55, 0, TAU); g.fillStyle = i % 2 ? '#b8122e' : '#fff3c4'; g.fill();
  }
  // shoulder trim and jewelled clasps
  for (const sx of [-1, 1]) {
    g.save(); g.translate(100, 0); g.scale(sx, 1); g.translate(-100, 0);
    g.beginPath(); g.moveTo(88, 108); g.bezierCurveTo(78, 111, 63, 113, 55, 118);
    g.strokeStyle = gold(g, 0, 106, 0, 120); g.lineWidth = 1.6; g.stroke();
    for (let t = 0.1; t < 1; t += 0.12) {
      const x = 88 - 33 * t, y = 108 + 10 * t * t;
      g.beginPath(); g.arc(x, y + 1.8, 0.45, 0, TAU); g.fillStyle = 'rgba(240,205,120,.7)'; g.fill();
    }
    const cx = 60, cy = 117;
    g.fillStyle = gold(g, cx - 4, cy - 4, cx + 4, cy + 4); ell(g, cx, cy, 4.2, 4.2); g.fill();
    g.fillStyle = rad(g, cx - 1, cy - 1.2, 0.2, cx, cy, 2.8, [[0, '#ff8a96'], [0.5, '#c0122e'], [1, '#3c0010']]); ell(g, cx, cy, 2.7, 2.7); g.fill();
    g.fillStyle = 'rgba(255,255,255,.75)'; ell(g, cx - 0.9, cy - 1, 0.7, 0.45, -0.5); g.fill();
    g.restore();
  }
}

// ── Head (turban, face, eyes) in head units: (0,0) = centre of the face, chin at y 27 ──
function facePath(g) {
  g.beginPath();
  g.moveTo(0, -27);
  g.bezierCurveTo(12, -27, 19.5, -17, 19, -3);
  g.bezierCurveTo(18.6, 7, 15, 15, 9, 21);
  g.bezierCurveTo(6, 24.5, 3, 26, 0, 26);
  g.bezierCurveTo(-3, 26, -6, 24.5, -9, 21);
  g.bezierCurveTo(-15, 15, -18.6, 7, -19, -3);
  g.bezierCurveTo(-19.5, -17, -12, -27, 0, -27);
  g.closePath();
}
function eyePath(g) {   // right eye (screen right), mirrored for the left
  g.beginPath();
  g.moveTo(3.0, -5.0);
  g.quadraticCurveTo(7.2, -9.4, 12.2, -6.3);
  g.quadraticCurveTo(8.0, -2.4, 3.0, -5.0);
  g.closePath();
}
export const EYE = { x: 7.6, y: -5.6 };
function turbanPath(g) {
  g.beginPath();
  g.moveTo(-23.5, -9);
  g.bezierCurveTo(-34, -22, -34, -47, -19, -58);
  g.bezierCurveTo(-8, -66, 8, -66, 19, -58);
  g.bezierCurveTo(34, -47, 34, -22, 23.5, -9);
  g.bezierCurveTo(14, -16, 6, -20.5, 0, -20.5);
  g.bezierCurveTo(-6, -20.5, -14, -16, -23.5, -9);
  g.closePath();
}

function paintHead(g) {
  // ears with gold hoops
  for (const sx of [-1, 1]) {
    g.save(); g.scale(sx, 1);
    g.fillStyle = rad(g, 18, -1, 0.5, 18.5, 0, 6.5, [[0, '#c48558'], [1, '#6e3a22']]);
    ell(g, 18.4, 0, 3.4, 6.4, 0.18); g.fill();
    g.fillStyle = 'rgba(80,30,15,.55)'; ell(g, 18.8, 0.6, 1.5, 3.6, 0.18); g.fill();
    g.beginPath(); g.arc(19.4, 9.4, 3.1, -0.2, TAU - 0.5); g.strokeStyle = gold(g, 16, 6, 23, 13); g.lineWidth = 1.05; g.stroke();
    g.restore();
  }

  // face
  facePath(g);
  g.fillStyle = rad(g, -5, -9, 1, -2, -2, 30, [[0, SKIN.hi], [0.42, SKIN.mid], [0.82, SKIN.lo], [1, SKIN.deep]]);
  g.fill();
  g.save(); facePath(g); g.clip();
  // shadow under the turban
  g.fillStyle = lin(g, 0, -27, 0, -11, [[0, 'rgba(35,12,4,.75)'], [1, 'rgba(35,12,4,0)']]); g.fillRect(-20, -27, 40, 17);
  // eye sockets
  for (const sx of [-1, 1]) {
    g.fillStyle = rad(g, sx * 7.6, -6, 1, sx * 7.6, -6, 7.5, [[0, 'rgba(70,25,10,.5)'], [1, 'rgba(70,25,10,0)']]);
    g.fillRect(sx * 7.6 - 8, -14, 16, 16);
    // cheekbone shine, hollow below, rouge (a painted mannequin face)
    g.fillStyle = rad(g, sx * 11, 0, 0.5, sx * 11, 0, 5.5, [[0, 'rgba(255,225,190,.32)'], [1, 'rgba(255,225,190,0)']]);
    g.fillRect(sx * 11 - 6, -6, 12, 12);
    g.fillStyle = rad(g, sx * 13, 9, 0.5, sx * 13, 9, 7, [[0, 'rgba(90,35,15,.3)'], [1, 'rgba(90,35,15,0)']]);
    g.fillRect(sx * 13 - 7, 2, 14, 14);
    g.fillStyle = rad(g, sx * 10.5, 5, 0.5, sx * 10.5, 5, 5.5, [[0, 'rgba(205,70,60,.28)'], [1, 'rgba(205,70,60,0)']]);
    g.fillRect(sx * 10.5 - 6, -1, 12, 12);
  }
  // forehead gloss
  g.fillStyle = rad(g, -3, -16, 0.5, -3, -16, 7, [[0, 'rgba(255,238,210,.45)'], [1, 'rgba(255,238,210,0)']]);
  g.fillRect(-11, -23, 16, 14);
  // nose: shadow side, bridge highlight, tip, nostrils
  g.beginPath(); g.moveTo(1.4, -9); g.bezierCurveTo(3.4, -2, 4.6, 4, 4.4, 8.6); g.bezierCurveTo(3.4, 10.8, 1.2, 10.8, 0.6, 9.6); g.bezierCurveTo(1.8, 3, 1.6, -3, 0.6, -9); g.closePath();
  g.fillStyle = 'rgba(95,40,18,.38)'; g.fill();
  g.beginPath(); g.moveTo(-0.6, -9); g.bezierCurveTo(-1, -2, -1.2, 3, -0.9, 6.5);
  g.strokeStyle = 'rgba(255,232,200,.5)'; g.lineWidth = 0.9; g.lineCap = 'round'; g.stroke();
  g.fillStyle = rad(g, -0.5, 7, 0.2, 0, 7.6, 3.6, [[0, 'rgba(250,200,160,.85)'], [0.5, 'rgba(215,145,105,.4)'], [1, 'rgba(215,145,105,0)']]);
  ell(g, 0, 7.6, 3.6, 3.2); g.fill();
  for (const sx of [-1, 1]) {
    g.beginPath(); g.arc(sx * 3.2, 9.3, 1.7, sx > 0 ? -1.2 : Math.PI + 1.2 - Math.PI * 0.6, sx > 0 ? 1.2 : Math.PI - 1.2 + Math.PI * 0.6, sx < 0);
    g.strokeStyle = 'rgba(95,40,18,.5)'; g.lineWidth = 0.55; g.stroke();
    g.fillStyle = 'rgba(40,12,4,.85)'; ell(g, sx * 1.8, 10.2, 1.05, 0.55, sx * 0.3); g.fill();
  }
  g.fillStyle = 'rgba(60,22,8,.35)'; ell(g, 0, 11.6, 4.6, 1.1); g.fill();
  g.restore();

  // eyes
  for (const sx of [-1, 1]) {
    g.save(); g.scale(sx, 1);
    eyePath(g); g.fillStyle = lin(g, 0, -9, 0, -3, [[0, '#a89880'], [0.45, '#ece2cc'], [1, '#d8cbb0']]); g.fill();
    g.save(); eyePath(g); g.clip();
    g.fillStyle = rad(g, EYE.x, EYE.y, 0.3, EYE.x, EYE.y, 2.3, [[0, '#6b4524'], [0.7, '#3a2312'], [1, '#160c05']]);
    ell(g, EYE.x, EYE.y + 0.2, 2.25, 2.25); g.fill();
    g.fillStyle = '#080402'; ell(g, EYE.x, EYE.y + 0.2, 1.0, 1.0); g.fill();
    g.fillStyle = 'rgba(255,255,255,.85)'; ell(g, EYE.x - 0.8, EYE.y - 0.6, 0.45, 0.45); g.fill();
    g.fillStyle = lin(g, 0, -9.5, 0, -5, [[0, 'rgba(30,10,4,.6)'], [1, 'rgba(30,10,4,0)']]); g.fillRect(2, -10, 12, 6);
    g.restore();
    // kohl: heavy upper lid sweeping into a wing
    g.beginPath(); g.moveTo(2.6, -4.8); g.quadraticCurveTo(7.2, -9.8, 12.4, -6.4); g.lineTo(14.6, -8.4); g.lineTo(12.8, -5.6);
    g.strokeStyle = '#120804'; g.lineWidth = 0.95; g.lineJoin = 'round'; g.stroke();
    g.beginPath(); g.moveTo(3.2, -4.6); g.quadraticCurveTo(8.0, -2.2, 12.2, -6.0);
    g.strokeStyle = 'rgba(30,10,4,.7)'; g.lineWidth = 0.45; g.stroke();
    // lid crease
    g.beginPath(); g.moveTo(3.2, -7.8); g.quadraticCurveTo(7.6, -11.4, 12.0, -8.6);
    g.strokeStyle = 'rgba(80,30,12,.45)'; g.lineWidth = 0.5; g.stroke();
    // brow: stern at the nose, flaring up and out
    g.beginPath(); g.moveTo(1.6, -10.4); g.bezierCurveTo(6, -14.2, 11.5, -16.6, 17.2, -15.0);
    g.bezierCurveTo(12.4, -13.8, 6.8, -12.2, 2.2, -8.8); g.closePath();
    g.fillStyle = '#140b07'; g.fill();
    for (let i = 0; i < 6; i++) {
      g.beginPath(); g.moveTo(3 + i * 2.2, -10.4 - i * 0.75); g.lineTo(5 + i * 2.3, -11.8 - i * 0.7);
      g.strokeStyle = 'rgba(160,150,140,.35)'; g.lineWidth = 0.25; g.stroke();
    }
    g.restore();
  }

  // turban
  turbanPath(g);
  g.fillStyle = rad(g, -10, -48, 2, -4, -40, 42, [[0, '#fff8e2'], [0.3, '#f1ddb0'], [0.65, '#c9a465'], [1, '#6e4f20']]);
  g.fill();
  g.save(); turbanPath(g); g.clip();
  // wrapped folds: swaths spiralling up from the left temple, tucked under the brooch
  const wraps = [-8, -15.5, -21, -28.5, -35, -42.5, -49, -56.5];
  wraps.forEach((y, i) => {
    const tilt = 13 + i * 0.6;
    g.beginPath(); g.moveTo(-38, y + tilt); g.bezierCurveTo(-16, y + 2, 8, y - 4, 38, y - tilt * 0.7);
    g.strokeStyle = 'rgba(95,60,18,.5)'; g.lineWidth = 2.6 - (i % 2) * 0.9; g.stroke();
    g.beginPath(); g.moveTo(-38, y + tilt - 2.2); g.bezierCurveTo(-16, y - 0.2, 8, y - 6.2, 38, y - tilt * 0.7 - 2.2);
    g.strokeStyle = 'rgba(255,250,232,.5)'; g.lineWidth = 1.1; g.stroke();
  });
  // a crossing swath over the crown
  g.beginPath(); g.moveTo(-30, -60); g.bezierCurveTo(-14, -50, 2, -40, 10, -30);
  g.strokeStyle = 'rgba(95,60,18,.4)'; g.lineWidth = 3; g.stroke();
  g.beginPath(); g.moveTo(-31, -62.4); g.bezierCurveTo(-15, -52.4, 1, -42.4, 9, -32.4);
  g.strokeStyle = 'rgba(255,250,232,.45)'; g.lineWidth = 1.2; g.stroke();
  g.fillStyle = rad(g, -4, -38, 12, -2, -36, 36, [[0, 'rgba(0,0,0,0)'], [0.75, 'rgba(60,35,5,.15)'], [1, 'rgba(50,25,0,.6)']]);
  g.fillRect(-36, -70, 72, 64);
  g.restore();
  // rolled band along the brow
  g.lineCap = 'round';
  g.beginPath(); g.moveTo(-24.5, -11); g.bezierCurveTo(-14, -18.6, -6, -22.6, 0, -22.6); g.bezierCurveTo(6, -22.6, 14, -18.6, 24.5, -11);
  g.strokeStyle = lin(g, 0, -26, 0, -16, [[0, '#fff2cf'], [0.5, '#d7b26a'], [1, '#6b4a17']]); g.lineWidth = 4.6; g.stroke();
  g.strokeStyle = 'rgba(160,20,40,.75)'; g.lineWidth = 0.8; g.stroke();
  g.beginPath(); g.moveTo(-23.5, -12.6); g.bezierCurveTo(-14, -20.2, -6, -24.2, 0, -24.2); g.bezierCurveTo(6, -24.2, 14, -20.2, 23.5, -12.6);
  g.strokeStyle = 'rgba(255,252,236,.6)'; g.lineWidth = 0.7; g.stroke();

  // plume rising from the brooch
  const sp = (t) => { // spine point
    const u = 1 - t;
    return [u * u * u * 1 + 3 * u * u * t * -2 + 3 * u * t * t * 3 + t * t * t * 13, u * u * u * -36 + 3 * u * u * t * -52 + 3 * u * t * t * -70 + t * t * t * -77];
  };
  for (let t = 0.04; t <= 1; t += 0.018) {
    const [x, y] = sp(t), [x2, y2] = sp(Math.min(1, t + 0.01));
    const a = Math.atan2(y2 - y, x2 - x), L = 6.5 * Math.sin(Math.PI * Math.min(1, t * 1.15)) + 1;
    for (const side of [-1, 1]) {
      const b = a + side * 2.35;
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(b) * L * 0.6, y + Math.sin(b) * L * 0.6 - 1, x + Math.cos(b + side * 0.25) * L, y + Math.sin(b + side * 0.25) * L);
      g.strokeStyle = side < 0 ? 'rgba(255,252,240,.55)' : 'rgba(205,195,175,.55)'; g.lineWidth = 0.45; g.stroke();
    }
  }
  g.beginPath(); for (let t = 0; t <= 1; t += 0.05) { const [x, y] = sp(t); t ? g.lineTo(x, y) : g.moveTo(x, y); }
  g.strokeStyle = 'rgba(240,215,150,.9)'; g.lineWidth = 0.6; g.stroke();

  // brooch: ruby in a beaded gold setting, a pearl drop
  const jx = 0, jy = -31;
  g.fillStyle = rad(g, jx - 2, jy - 2, 0.5, jx, jy, 8, [[0, '#fff1b0'], [0.5, '#c8962f'], [1, '#4a300a']]);
  ell(g, jx, jy, 7.2, 7.8); g.fill();
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * TAU;
    g.fillStyle = rad(g, jx + Math.cos(a) * 7.1 - 0.3, jy + Math.sin(a) * 7.7 - 0.3, 0.1, jx + Math.cos(a) * 7.1, jy + Math.sin(a) * 7.7, 1.1, [[0, '#fff6c8'], [1, '#8a6118']]);
    ell(g, jx + Math.cos(a) * 7.1, jy + Math.sin(a) * 7.7, 1.0, 1.0); g.fill();
  }
  g.fillStyle = rad(g, jx - 1.5, jy - 2, 0.3, jx, jy, 5.6, [[0, '#ff9aa6'], [0.35, '#e0213f'], [0.75, '#8a0620'], [1, '#2c0008']]);
  ell(g, jx, jy, 4.4, 5.2); g.fill();
  g.strokeStyle = 'rgba(255,190,200,.35)'; g.lineWidth = 0.35;
  for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; g.beginPath(); g.moveTo(jx, jy); g.lineTo(jx + Math.cos(a) * 4.2, jy + Math.sin(a) * 5); g.stroke(); }
  g.fillStyle = 'rgba(255,255,255,.9)'; ell(g, jx - 1.6, jy - 2.4, 1.2, 0.7, -0.6); g.fill();
  g.fillStyle = rad(g, -0.5, -22.8, 0.2, 0, -22.2, 2.2, [[0, '#ffffff'], [0.6, '#e8e0d4'], [1, '#9c9282']]);
  g.beginPath(); g.moveTo(0, -24.6); g.quadraticCurveTo(2.2, -21.5, 0, -20.2); g.quadraticCurveTo(-2.2, -21.5, 0, -24.6); g.fill();
}

// Moustache: a waxed handlebar, curled at the tips (head units)
function stachePath(g, sx) {
  g.moveTo(0, 10.6);
  g.bezierCurveTo(sx * 4, 9.4, sx * 10, 10, sx * 15, 12.4);
  g.bezierCurveTo(sx * 20, 14.4, sx * 24.5, 11.5, sx * 25.6, 6.6);
  g.bezierCurveTo(sx * 26.4, 3, sx * 24, 1.6, sx * 22.6, 3.6);
  g.bezierCurveTo(sx * 23.8, 4.4, sx * 23.6, 6.6, sx * 22, 8.4);
  g.bezierCurveTo(sx * 20, 11, sx * 16.5, 14.4, sx * 12, 16.4);
  g.bezierCurveTo(sx * 7.5, 18, sx * 3, 16.4, 0, 14.6);
}
function paintStache(g) {
  for (const sx of [-1, 1]) {
    g.beginPath(); stachePath(g, sx); g.closePath();
    g.fillStyle = lin(g, 0, 8, 0, 18, [[0, '#2b211b'], [0.4, '#16100c'], [1, '#0a0705']]); g.fill();
    g.save(); g.beginPath(); stachePath(g, sx); g.closePath(); g.clip();
    for (let i = 0; i < 9; i++) {
      const o = i * 0.62;
      g.beginPath(); g.moveTo(sx * 1, 10.8 + o); g.bezierCurveTo(sx * 8, 10 + o, sx * 15, 13.6 + o * 0.5, sx * (22.5 - o * 0.4), 9 - o * 0.4);
      g.strokeStyle = i % 3 === 0 ? 'rgba(190,180,170,.42)' : 'rgba(110,100,92,.35)'; g.lineWidth = 0.32; g.stroke();
    }
    g.beginPath(); g.moveTo(sx * 2, 11.4); g.bezierCurveTo(sx * 8, 10.6, sx * 14, 12.4, sx * 19, 12.2);
    g.strokeStyle = 'rgba(255,240,220,.22)'; g.lineWidth = 0.8; g.stroke();
    g.restore();
  }
}
// Jaw: lower lip and the pointed beard (moves with the jaw)
function beardPath(g) {
  g.beginPath();
  g.moveTo(-17.6, 2);
  g.bezierCurveTo(-18, 18, -9, 31, 0.6, 48);
  g.bezierCurveTo(9, 31, 18, 18, 17.6, 2);
  g.bezierCurveTo(16.4, 8, 13, 13.6, 8.6, 15.8);
  g.bezierCurveTo(5.6, 18, 2.4, 18.4, 0, 18.4);
  g.bezierCurveTo(-2.4, 18.4, -5.6, 18, -8.6, 15.8);
  g.bezierCurveTo(-13, 13.6, -16.4, 8, -17.6, 2);
  g.closePath();
}
function paintJaw(g) {
  g.fillStyle = lin(g, 0, 14, 0, 18.5, [[0, '#a8483a'], [1, '#6e2a20']]);
  ell(g, 0, 16.6, 4.6, 1.9); g.fill();
  g.fillStyle = 'rgba(255,200,180,.35)'; ell(g, -0.6, 16.0, 2.2, 0.5); g.fill();
  beardPath(g);
  g.fillStyle = lin(g, 0, 2, 0, 48, [[0, '#211913'], [0.5, '#130d09'], [1, '#2a2420']]); g.fill();
  g.save(); beardPath(g); g.clip();
  const R = rng(3);
  for (let i = 0; i < 46; i++) {
    const x = -17 + R() * 34, y = 4 + R() * 20, tx = x * 0.12 + (R() - 0.5) * 2, ty = 30 + R() * 18;
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo((x + tx) / 2 + x * 0.15, (y + ty) / 2, tx, ty);
    g.strokeStyle = R() < 0.35 ? 'rgba(205,198,190,.38)' : 'rgba(95,85,78,.4)'; g.lineWidth = 0.3 + R() * 0.25; g.stroke();
  }
  g.fillStyle = rad(g, -4, 14, 1, 0, 22, 22, [[0, 'rgba(255,230,200,.12)'], [1, 'rgba(0,0,0,.25)']]);
  g.fillRect(-18, 0, 36, 50);
  g.restore();
}

// ── Hands (back of the hand, fingers pointing down +y, wrist at 0,0, thumb on +x) ──
const FINGERS = [ // knuckle x, angle (+ leans to +x), length, width, curl
  [-5.4, -0.24, 10.0, 2.9, 0.10],
  [-1.8, -0.08, 12.4, 3.25, 0.08],
  [1.9, 0.06, 13.0, 3.35, 0.06],
  [5.4, 0.2, 11.6, 3.25, 0.05]
];
function fingerPts(x, y, a, L, curl) {
  const segs = [0.44, 0.32, 0.24], pts = [[x, y]];
  let ang = a, px = x, py = y;
  for (const f of segs) { px += Math.sin(ang) * L * f; py += Math.cos(ang) * L * f; pts.push([px, py]); ang += curl * (a >= 0 ? -1 : 1); }
  return pts;
}
function paintFinger(g, pts, w, nail, ring) {
  const path = () => { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); };
  g.lineCap = 'round'; g.lineJoin = 'round';
  path(); g.strokeStyle = '#6a361f'; g.lineWidth = w + 0.55; g.stroke();
  path(); g.strokeStyle = SKIN.mid; g.lineWidth = w; g.stroke();
  g.save(); g.translate(-w * 0.18, -0.2); path(); g.strokeStyle = 'rgba(245,200,160,.75)'; g.lineWidth = w * 0.38; g.stroke(); g.restore();
  // knuckle creases
  for (let i = 1; i < pts.length - 1; i++) {
    const [x, y] = pts[i], a = Math.atan2(pts[i + 1][1] - pts[i - 1][1], pts[i + 1][0] - pts[i - 1][0]) + Math.PI / 2;
    g.beginPath(); g.moveTo(x + Math.cos(a) * w * 0.3, y + Math.sin(a) * w * 0.3); g.lineTo(x - Math.cos(a) * w * 0.3, y - Math.sin(a) * w * 0.3);
    g.strokeStyle = 'rgba(110,55,30,.5)'; g.lineWidth = 0.3; g.stroke();
  }
  // long lacquered nail at the tip
  const [tx, ty] = pts[pts.length - 1], [bx, by] = pts[pts.length - 2], na = Math.atan2(ty - by, tx - bx);
  g.save(); g.translate(tx, ty); g.rotate(na);
  g.beginPath(); g.moveTo(-w * 0.55, -w * 0.32); g.quadraticCurveTo(w * 0.9, -w * 0.3, w * 1.05, 0); g.quadraticCurveTo(w * 0.9, w * 0.3, -w * 0.55, w * 0.32); g.closePath();
  g.fillStyle = lin(g, 0, -w * 0.3, 0, w * 0.3, [[0, '#a3182c'], [0.5, '#5a0613'], [1, '#2a0208']]); g.fill();
  g.fillStyle = 'rgba(255,200,210,.55)'; ell(g, w * 0.1, -w * 0.12, w * 0.4, w * 0.07); g.fill();
  g.restore();
  if (ring) {
    const [x0, y0] = pts[0], [x1, y1] = pts[1], t = 0.62, rx = x0 + (x1 - x0) * t, ry = y0 + (y1 - y0) * t, a = Math.atan2(y1 - y0, x1 - x0);
    g.save(); g.translate(rx, ry); g.rotate(a);
    g.fillStyle = gold(g, -1, -w * 0.6, 1, w * 0.6); g.fillRect(-0.75, -w * 0.62, 1.5, w * 1.24);
    g.fillStyle = rad(g, -0.4, -0.4, 0.1, 0, 0, 1.6, [[0, ring[0]], [0.6, ring[1]], [1, ring[2]]]); ell(g, 0, 0, 1.55, 1.45); g.fill();
    g.strokeStyle = gold(g, -1.6, -1.6, 1.6, 1.6); g.lineWidth = 0.45; g.stroke();
    g.fillStyle = 'rgba(255,255,255,.85)'; ell(g, -0.5, -0.55, 0.45, 0.3); g.fill();
    g.restore();
  }
}
function paintHand(g) {
  const RUBY = ['#ff9aa6', '#d0183a', '#3c0010'], EMERALD = ['#b6ffd8', '#14a060', '#043018'];
  // thumb (behind the back of the hand), then the four fingers
  paintFinger(g, fingerPts(5.4, 2.6, 0.95, 10.4, 0.2), 3.9, true, null);
  FINGERS.forEach((f, i) => paintFinger(g, fingerPts(f[0], 10.4, f[1], f[2], f[4]), f[3], true, i === 1 ? RUBY : i === 3 ? EMERALD : null));
  // back of the hand
  g.beginPath(); g.moveTo(-5.4, -1); g.bezierCurveTo(-6.6, 4, -7.8, 8, -7.2, 11.6); g.bezierCurveTo(-4, 13.3, 4, 13.3, 7.2, 11.4);
  g.bezierCurveTo(7.8, 7, 7, 3, 5.6, -1); g.closePath();
  g.fillStyle = lin(g, -7, 0, 7, 12, [[0, '#9a5d37'], [0.45, '#dba06f'], [1, '#b0714a']]); g.fill();
  g.strokeStyle = 'rgba(100,50,25,.55)'; g.lineWidth = 0.35; g.stroke();
  // tendons and knuckles
  FINGERS.forEach(f => {
    g.beginPath(); g.moveTo(f[0] * 0.45, 1.5); g.quadraticCurveTo(f[0] * 0.8, 6, f[0], 10);
    g.strokeStyle = 'rgba(255,215,175,.22)'; g.lineWidth = 0.55; g.stroke();
    g.fillStyle = rad(g, f[0] - 0.3, 10.5, 0.1, f[0], 10.8, 1.8, [[0, 'rgba(255,220,185,.55)'], [1, 'rgba(255,220,185,0)']]);
    ell(g, f[0], 10.8, 1.8, 1.4); g.fill();
  });
  // lace ruffle and gold cuff
  for (let i = -3; i <= 3; i++) {
    g.beginPath(); g.arc(i * 2.05, 0.6, 1.25, 0, Math.PI);
    g.fillStyle = 'rgba(245,236,215,.95)'; g.fill(); g.strokeStyle = 'rgba(150,130,100,.6)'; g.lineWidth = 0.25; g.stroke();
  }
  g.beginPath(); g.moveTo(-7.6, -5.4); g.lineTo(7.6, -5.4); g.lineTo(7.2, 0.4); g.lineTo(-7.2, 0.4); g.closePath();
  g.fillStyle = gold(g, 0, -5.4, 0, 0.4); g.fill();
  g.strokeStyle = 'rgba(60,35,5,.7)'; g.lineWidth = 0.35; g.stroke();
  for (let i = -3; i <= 3; i++) { g.beginPath(); g.arc(i * 2.1, -2.5, 0.55, 0, TAU); g.fillStyle = i % 2 ? '#c0122e' : '#fff3c8'; g.fill(); }
}

// ── Table, ball stand, and the swirl inside the ball ───────────────────────
export const BALL = { x: 100, y: 149, r: 22 };
function paintTable(g, b) {
  const [x0, , x1, y1] = b, top = 171, edge = 180;
  g.fillStyle = lin(g, 0, top, 0, edge, [[0, '#14040a'], [0.4, '#3c0e18'], [1, '#2a0911']]);
  g.fillRect(x0, top, x1 - x0, edge - top);
  g.fillStyle = lin(g, 0, edge, 0, y1, [[0, '#1a0509'], [1, '#050102']]);
  g.fillRect(x0, edge, x1 - x0, y1 - edge);
  g.fillStyle = gold(g, 0, edge - 0.8, 0, edge + 1.6); g.fillRect(x0, edge - 0.8, x1 - x0, 2.2);
  for (let x = x0; x < x1; x += 1.3) {
    g.beginPath(); g.moveTo(x, edge + 1.4); g.lineTo(x + 0.25, edge + 6 + (Math.round(x * 7) % 3) * 0.4);
    g.strokeStyle = Math.round(x) % 3 ? 'rgba(200,150,60,.75)' : 'rgba(250,215,130,.85)'; g.lineWidth = 0.45; g.stroke();
  }
  // ball shadow and the stand's base and stem
  const { x, y, r } = BALL;
  g.fillStyle = rad(g, x, 177.5, 1, x, 177.5, 24, [[0, 'rgba(0,0,0,.65)'], [1, 'rgba(0,0,0,0)']]);
  ell(g, x, 177.5, 25, 4.6); g.fill();
  g.fillStyle = lin(g, x - 17, 0, x + 17, 0, GOLD); ell(g, x, 176.6, 16, 3.4); g.fill();
  g.fillStyle = lin(g, 0, 172, 0, 177, [[0, 'rgba(255,240,190,.5)'], [1, 'rgba(60,35,5,.5)']]); ell(g, x, 175.4, 13.5, 2.4); g.fill();
  g.beginPath(); g.moveTo(x - 5, 175.4); g.bezierCurveTo(x - 3, 172, x - 6, 170, x - 9, 168.6); g.lineTo(x + 9, 168.6); g.bezierCurveTo(x + 6, 170, x + 3, 172, x + 5, 175.4); g.closePath();
  g.fillStyle = lin(g, x - 9, 0, x + 9, 0, GOLD); g.fill();
  g.fillStyle = '#2a1805'; ell(g, x, y + r - 3.5, 12.5, 2.8); g.fill();
}
function paintLip(g) {
  const { x, y, r } = BALL, cy = y + r - 3.5;
  g.beginPath(); g.ellipse(x, cy, 13, 3, 0, 0, Math.PI); g.ellipse(x, cy + 1.6, 13.6, 3.6, 0, Math.PI, 0, true); g.closePath();
  g.fillStyle = lin(g, x - 14, 0, x + 14, 0, GOLD); g.fill();
  // claws gripping the ball
  for (const sx of [-1, 1]) {
    g.beginPath(); g.moveTo(x + sx * 7.5, cy + 2.6); g.bezierCurveTo(x + sx * 11, cy - 1, x + sx * 14, cy - 6, x + sx * 13.2, cy - 10.5);
    g.bezierCurveTo(x + sx * 12, cy - 6.5, x + sx * 9, cy - 2, x + sx * 4.4, cy + 2.6); g.closePath();
    g.fillStyle = gold(g, x + sx * 4, cy - 10, x + sx * 14, cy + 2); g.fill();
    g.strokeStyle = 'rgba(60,35,5,.6)'; g.lineWidth = 0.3; g.stroke();
  }
  g.fillStyle = rad(g, x - 0.6, cy + 1.6, 0.2, x, cy + 2.2, 2.2, [[0, '#fff3c4'], [1, '#8a6118']]); ell(g, x, cy + 2.2, 2.1, 1.7); g.fill();
}
function paintSmoke(g) {
  g.globalCompositeOperation = 'lighter';
  const R = rng(21);
  for (let arm = 0; arm < 3; arm++) {
    for (let j = 0; j < 46; j++) {
      const t = j / 46, a = arm * TAU / 3 + t * 4.4, rr = 2 + t * 17;
      const x = Math.cos(a) * rr, y = Math.sin(a) * rr * 0.86, br = 2.4 + t * 4.2;
      const hue = arm === 1 ? 300 : 210 + t * 70;
      g.fillStyle = rad(g, x, y, 0, x, y, br, [[0, 'hsla(' + hue + ',95%,72%,' + (0.16 + R() * 0.1) + ')'], [1, 'hsla(' + hue + ',95%,60%,0)']]);
      ell(g, x, y, br, br); g.fill();
    }
  }
  for (let i = 0; i < 26; i++) {
    const a = R() * TAU, rr = R() * 18;
    const x = Math.cos(a) * rr, y = Math.sin(a) * rr;
    g.fillStyle = 'rgba(230,240,255,' + (0.25 + R() * 0.5) + ')'; ell(g, x, y, 0.35, 0.35); g.fill();
  }
}

// ── Sleeves: shoulder -> elbow -> wrist, a bell sleeve drawn live each frame ──
function sleeve(g, S, E, W, ws, we, ww, sx) {
  const pts = [S, E, W], wid = [ws, we, ww], L = [], Rr = [];
  for (let i = 0; i < 3; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(2, i + 1)];
    let nx = -(b[1] - a[1]), ny = b[0] - a[0];
    const n = Math.hypot(nx, ny) || 1; nx /= n; ny /= n;
    L.push([pts[i][0] + nx * wid[i] / 2, pts[i][1] + ny * wid[i] / 2]);
    Rr.push([pts[i][0] - nx * wid[i] / 2, pts[i][1] - ny * wid[i] / 2]);
  }
  const outline = () => {
    g.beginPath();
    g.moveTo(L[0][0], L[0][1]); g.quadraticCurveTo(L[1][0], L[1][1], L[2][0], L[2][1]);
    g.lineTo(Rr[2][0], Rr[2][1]); g.quadraticCurveTo(Rr[1][0], Rr[1][1], Rr[0][0], Rr[0][1]);
    g.closePath();
  };
  // shadow the arm casts on the robe
  g.save(); g.translate(-sx * 1.2, 2.4); outline(); g.fillStyle = 'rgba(0,8,4,.45)'; g.fill(); g.restore();
  outline();
  g.fillStyle = lin(g, E[0] + sx * 6, E[1] + 6, E[0] - sx * 4, E[1] - 12, [[0, ROBE.deep], [0.45, ROBE.lo], [0.8, ROBE.mid], [1, ROBE.hi]]);
  g.fill();
  g.strokeStyle = 'rgba(0,8,4,.75)'; g.lineWidth = 0.8; g.stroke();
  g.save(); outline(); g.clip();
  // light from the lamp above falls on the top of the forearm
  g.beginPath(); g.moveTo(E[0], E[1] - 9); g.quadraticCurveTo(E[0] + (W[0] - E[0]) * 0.5, E[1] + (W[1] - E[1]) * 0.5 - 10, W[0], W[1] - 10);
  g.strokeStyle = 'rgba(160,255,215,.16)'; g.lineWidth = 6; g.stroke();
  // fold along the forearm and a sheen
  g.beginPath(); g.moveTo((E[0] * 2 + W[0]) / 3, (E[1] * 2 + W[1]) / 3 + 2); g.quadraticCurveTo(E[0] + (W[0] - E[0]) * 0.6, E[1] + (W[1] - E[1]) * 0.55, W[0] - sx * 2, W[1] + 3);
  g.strokeStyle = 'rgba(0,15,8,.45)'; g.lineWidth = 1.6; g.stroke();
  g.beginPath(); g.moveTo(E[0] + sx * 3, E[1] - 4); g.quadraticCurveTo(E[0] + (W[0] - E[0]) * 0.5 + sx * 1, E[1] + (W[1] - E[1]) * 0.5 - 4, W[0] - sx * 4, W[1] - 4);
  g.strokeStyle = 'rgba(150,255,215,.12)'; g.lineWidth = 1.4; g.stroke();
  g.restore();
  // gold hem at the sleeve's end
  g.beginPath(); g.moveTo(L[2][0], L[2][1]); g.lineTo(Rr[2][0], Rr[2][1]);
  g.strokeStyle = gold(g, L[2][0], L[2][1], Rr[2][0], Rr[2][1]); g.lineWidth = 2.2; g.lineCap = 'round'; g.stroke();
}

const HS = 1.3;   // hand sprite scale (hand units -> scene units)
const REST = {
  L: { S: [55, 124], E: [32, 147], W: [66, 125], r: -0.86 },
  R: { S: [145, 124], E: [168, 147], W: [134, 125], r: -0.86 }
};
const PIVOT = { x: 100, y: 103 }, HEAD_Y = -23;   // head turns about the top of the neck

function ease(t) { return t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t); }

export function createScene() {
  let S = null;

  function build(w, h, dpr) {
    const s = Math.min(w / 190, h / 208);
    const ox = (w - 200 * s) / 2, oy = h - 200 * s;
    const k = s * dpr;
    const B = [-ox / s, -oy / s, (w - ox) / s, (h - oy) / s];
    const back = sprite(B, k, g => { paintCurtain(g, B); paintTorso(g); });
    // the valance belongs in front of the swami; keep it separate so the plume can pass behind it
    const val = sprite([B[0], B[1], B[2], B[1] + 26], k, g => paintValance(g, B));
    S = {
      w, h, dpr, s, ox, oy, B, back, val,
      head: sprite([-37, -80, 37, 22], k, paintHead),
      jaw: sprite([-20, 12, 20, 50], k, paintJaw),
      stache: sprite([-28, 0, 28, 20], k, paintStache),
      hand: sprite([-10, -7, 15, 27], k * HS, paintHand),
      table: sprite([B[0], 165, B[2], B[3]], k, g => paintTable(g, B)),
      lip: sprite([BALL.x - 16, BALL.y + 6, BALL.x + 16, BALL.y + 25], k, paintLip),
      smoke: sprite([-24, -24, 24, 24], k, paintSmoke)
    };
  }

  // t: seconds since the machine woke; wake 0..1
  function pose(t, wake) {
    const w = ease(wake);
    const sw = t * 2.25;   // hand sweep phase
    const talk = Math.max(0, Math.sin(t * 8.5)) * Math.max(0, Math.sin(t * 1.7 + 0.6));
    return {
      t, wake: w,
      tilt: w * (0.075 * Math.sin(t * 1.25 + 0.4) + 0.03 * Math.sin(t * 3.1)),
      nod: w * (0.9 * Math.sin(t * 2.2) - 0.4),
      jaw: w * talk * 2.8,
      eyes: w * (0.86 + 0.14 * Math.sin(t * 7.3)),
      swirl: t * 1.4,
      glow: 0.16 + 0.84 * w,
      L: { dx: w * 8 * Math.cos(sw), dy: w * 5 * Math.sin(sw), r: w * 0.16 * Math.sin(sw + 0.8), spread: w * 0.05 },
      R: { dx: w * 8 * Math.cos(sw + Math.PI * 0.9), dy: w * 5 * Math.sin(sw + Math.PI * 0.9), r: w * 0.16 * Math.sin(sw + 0.8 + Math.PI * 0.9) }
    };
  }

  function arm(g, side, P) {
    const R = REST[side], sx = side === 'L' ? -1 : 1, m = P[side];
    const W = [R.W[0] - sx * m.dx, R.W[1] + m.dy], E = [R.E[0] - sx * m.dx * 0.4, R.E[1] + m.dy * 0.5];
    sleeve(g, R.S, E, W, 19, 19, 22, sx);
    return W;
  }
  function hand(g, side, W, P) {
    const R = REST[side], m = P[side];
    g.save(); g.translate(W[0], W[1]);
    if (side === 'R') g.scale(-1, 1);
    g.rotate(R.r + m.r); g.scale(HS, HS);
    blit(g, S.hand);
    g.restore();
  }

  function draw(g, P) {
    if (!S) return;
    const { dpr, s, ox, oy } = S;
    g.setTransform(dpr * s, 0, 0, dpr * s, dpr * ox, dpr * oy);
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
    blit(g, S.back);
    const WL = arm(g, 'L', P), WR = arm(g, 'R', P);

    // head on its neck pivot
    g.save();
    g.translate(PIVOT.x, PIVOT.y + P.nod); g.rotate(P.tilt); g.translate(0, HEAD_Y);
    blit(g, S.head);
    if (P.jaw > 0.05) { g.fillStyle = '#1a0505'; ell(g, 0, 15.2 + P.jaw / 2, 5.2, 1.2 + P.jaw / 2); g.fill(); }
    g.save(); g.translate(0, P.jaw); blit(g, S.jaw); g.restore();
    blit(g, S.stache);
    if (P.eyes > 0.01) eyes(g, P.eyes);
    if (P.wake > 0.05) sparkle(g, 0, -33, 7 + 3 * Math.sin(P.t * 5), P.wake * 0.8, P.t);
    g.restore();

    blit(g, S.table);
    ball(g, P);
    blit(g, S.lip);
    hand(g, 'L', WL, P); hand(g, 'R', WR, P);

    // the ball lights everything from below
    if (P.glow > 0.2) {
      g.globalCompositeOperation = 'lighter';
      const a = (P.glow - 0.2) / 0.8;
      g.fillStyle = rad(g, BALL.x, BALL.y, 4, BALL.x, BALL.y - 10, 100, [[0, 'rgba(130,110,255,' + 0.22 * a + ')'], [0.4, 'rgba(90,60,220,' + 0.07 * a + ')'], [1, 'rgba(0,0,0,0)']]);
      g.fillRect(S.B[0], S.B[1], S.B[2] - S.B[0], S.B[3] - S.B[1]);
      g.fillStyle = rad(g, BALL.x, 177, 2, BALL.x, 177, 34, [[0, 'rgba(150,140,255,' + 0.4 * a + ')'], [1, 'rgba(0,0,0,0)']]);
      ell(g, BALL.x, 177, 36, 6); g.fill();
      g.globalCompositeOperation = 'source-over';
    }
    blit(g, S.val);
  }

  function eyes(g, e) {
    for (const sx of [-1, 1]) {
      g.save(); g.scale(sx, 1);
      g.save(); eyePath(g); g.clip();
      g.fillStyle = rad(g, EYE.x, EYE.y, 0.2, EYE.x, EYE.y, 5, [[0, 'rgba(255,255,235,' + e + ')'], [0.35, 'rgba(255,214,90,' + e + ')'], [1, 'rgba(255,120,10,' + e * 0.9 + ')']]);
      g.fillRect(2, -10, 12, 8);
      g.restore();
      g.globalCompositeOperation = 'lighter';
      g.fillStyle = rad(g, EYE.x, EYE.y, 0.5, EYE.x, EYE.y, 10, [[0, 'rgba(255,200,80,' + 0.55 * e + ')'], [1, 'rgba(255,120,0,0)']]);
      ell(g, EYE.x, EYE.y, 10, 8); g.fill();
      g.globalCompositeOperation = 'source-over';
      g.restore();
    }
  }

  function ball(g, P) {
    const { x, y, r } = BALL, gl = P.glow;
    // halo
    if (gl > 0.2) {
      g.globalCompositeOperation = 'lighter';
      g.fillStyle = rad(g, x, y, r * 0.8, x, y, r * 2.1, [[0, 'rgba(150,120,255,' + 0.3 * gl + ')'], [1, 'rgba(90,40,200,0)']]);
      ell(g, x, y, r * 2.1, r * 2.1); g.fill();
      g.globalCompositeOperation = 'source-over';
    }
    g.save();
    ell(g, x, y, r, r); g.clip();
    g.fillStyle = rad(g, x - 6, y - 7, 1, x, y, r * 1.05, [[0, mix('#2a2064', '#5a4ad0', gl)], [0.55, mix('#120c34', '#2a1a7a', gl)], [1, '#04020c']]);
    g.fillRect(x - r, y - r, 2 * r, 2 * r);
    // refraction of the red curtain along the bottom
    g.fillStyle = lin(g, 0, y + r * 0.2, 0, y + r, [[0, 'rgba(160,20,40,0)'], [1, 'rgba(160,20,40,.35)']]);
    g.fillRect(x - r, y, 2 * r, r);
    // the swirl
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 2; i++) {
      g.save(); g.translate(x, y); g.rotate(P.swirl * (i ? -0.7 : 1) + i * 1.3);
      g.globalAlpha = Math.min(1, (0.25 + 0.75 * gl) * (i ? 0.55 : 0.9));
      const sc = i ? 0.8 : 1; g.scale(sc, sc);
      blit(g, S.smoke);
      g.restore();
    }
    g.globalAlpha = 1;
    g.fillStyle = rad(g, x, y + 2, 0.5, x, y + 2, r * 0.85, [[0, 'rgba(225,235,255,' + 0.85 * gl + ')'], [0.35, 'rgba(150,120,255,' + 0.4 * gl + ')'], [1, 'rgba(0,0,0,0)']]);
    g.fillRect(x - r, y - r, 2 * r, 2 * r);
    g.globalCompositeOperation = 'source-over';
    // glass: darker rim, reflections
    g.fillStyle = rad(g, x, y, r * 0.7, x, y, r, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,10,.45)']]);
    g.fillRect(x - r, y - r, 2 * r, 2 * r);
    g.restore();
    g.beginPath(); g.arc(x, y, r - 0.4, Math.PI * 1.05, Math.PI * 1.75);
    g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 0.8; g.stroke();
    g.fillStyle = rad(g, x - 8.5, y - 10, 0.2, x - 8.5, y - 10, 6, [[0, 'rgba(255,255,255,.9)'], [1, 'rgba(255,255,255,0)']]);
    ell(g, x - 8.5, y - 10, 6.5, 3.6, -0.6); g.fill();
    g.fillStyle = 'rgba(255,255,255,.85)'; ell(g, x - 9.5, y - 11, 2.2, 1.1, -0.6); g.fill();
    g.fillStyle = 'rgba(255,220,200,.22)'; ell(g, x + 9, y + 11, 4, 1.6, -0.7); g.fill();
  }

  function sparkle(g, x, y, size, a, t) {
    g.save(); g.globalCompositeOperation = 'lighter'; g.translate(x, y); g.rotate(t * 0.8);
    g.fillStyle = rad(g, 0, 0, 0, 0, 0, size * 0.5, [[0, 'rgba(255,240,240,' + a + ')'], [1, 'rgba(255,80,110,0)']]);
    ell(g, 0, 0, size * 0.5, size * 0.5); g.fill();
    g.fillStyle = 'rgba(255,245,235,' + a * 0.9 + ')';
    for (let i = 0; i < 4; i++) { g.rotate(Math.PI / 2); g.beginPath(); g.moveTo(0, -0.5); g.lineTo(size, 0); g.lineTo(0, 0.5); g.fill(); }
    g.restore();
  }

  return { build, pose, draw };
}
