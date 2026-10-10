// The Great Zandor's cabinet: carved and painted wood in deep red, black lacquer and gold leaf, a marquee
// sign, the glass case, a coin plate and a card slot, standing in a dark carnival tent. Painted once per
// size onto one canvas; the case opening is cut out so the swami's canvas (underneath) shows through, and
// the glass reflections are painted over it. The marquee bulbs are DOM elements (see swami.js).
//
// layout(w, h) -> rects in CSS px for the stage size; paint(g, L, dpr, fonts) paints the whole stage.

const TAU = Math.PI * 2;
function lin(g, x0, y0, x1, y1, stops) { const r = g.createLinearGradient(x0, y0, x1, y1); stops.forEach(s => r.addColorStop(s[0], s[1])); return r; }
function rad(g, x0, y0, r0, x1, y1, r1, stops) { const r = g.createRadialGradient(x0, y0, r0, x1, y1, r1); stops.forEach(s => r.addColorStop(s[0], s[1])); return r; }
function rng(seed) {
  let a = seed >>> 0;
  return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
const GOLD = [[0, '#5e3d0e'], [0.2, '#c8962f'], [0.4, '#fff0b4'], [0.56, '#dcae45'], [0.8, '#8a6118'], [1, '#3e2707']];
function gold(g, x0, y0, x1, y1) { return lin(g, x0, y0, x1, y1, GOLD); }
function rr(g, x, y, w, h, r) { g.beginPath(); g.roundRect ? g.roundRect(x, y, w, h, r) : g.rect(x, y, w, h); }

// ── Layout ─────────────────────────────────────────────────────────────────
export function layout(w, h) {
  const wide = w / h > 1.05;
  const m = Math.max(8, Math.min(w, h) * 0.025);
  const L = { w, h, wide, bulbs: [] };
  if (!wide) {
    // fixed parts, in cabinet widths: crest, case frame, shelf, lower panel, plinth
    const CR = 0.34, FR = 0.07, SH = 0.04, LOW = 0.42, BASE = 0.07, F = CR + FR + SH + LOW + BASE;
    let W = Math.min(w - 2 * m, 680);
    let caseH = (h - 2 * m) - W * F;
    const minH = 0.82 * 0.76 * W, maxH = 1.0 * 0.76 * W;
    if (caseH < minH) { W = (h - 2 * m) / (F + 0.82 * 0.76); caseH = 0.82 * 0.76 * W; }
    caseH = Math.min(caseH, maxH);
    const H = W * F + caseH, x0 = (w - W) / 2, y0 = Math.max(m, (h - H) / 2);
    L.W = W; L.H = H; L.x0 = x0; L.y0 = y0;
    L.crest = { x: x0, y: y0, w: W, h: CR * W };
    L.body = { x: x0, y: y0 + CR * W, w: W, h: caseH + FR * W };
    L.open = { x: x0 + 0.12 * W, y: y0 + CR * W + FR * W / 2, w: 0.76 * W, h: caseH };
    L.shelf = { x: x0 - 0.02 * W, y: L.body.y + L.body.h, w: W * 1.04, h: SH * W };
    L.low = { x: x0, y: L.shelf.y + L.shelf.h, w: W, h: LOW * W };
    L.base = { x: x0 - 0.025 * W, y: L.low.y + L.low.h, w: W * 1.05, h: BASE * W };
    L.coin = { cx: x0 + 0.27 * W, cy: L.low.y + 0.17 * W, w: 0.16 * W, h: 0.24 * W };
    L.slot = { cx: x0 + 0.70 * W, y: L.low.y + 0.115 * W, w: 0.30 * W, h: 0.02 * W, bh: 0.11 * W };
    L.card = { w: 0.255 * W, hang: Math.min(L.low.h - 0.115 * W - 0.03 * W, 0.255 * W * 1.4 * 0.88) };
    L.token = { cx: x0 + 0.27 * W, cy: L.low.y + 0.345 * W, r: 0.042 * W };
    L.u = W / 100;
    // marquee bulbs: around the arch, then down both pillars
    const bs = 0.034 * W;
    L.bulbR = bs / 2;
    const arch = archPts(L, 0.03 * W);
    arch.forEach(p => L.bulbs.push(p));
    const n = Math.max(4, Math.round(L.body.h / (0.085 * W)));
    for (let i = 0; i < n; i++) {
      const y = L.body.y + (i + 0.5) * L.body.h / n;
      L.bulbs.push({ x: x0 + 0.06 * W, y, side: 0 });
    }
    for (let i = 0; i < n; i++) {
      const y = L.body.y + (i + 0.5) * L.body.h / n;
      L.bulbs.push({ x: x0 + 0.94 * W, y, side: 1 });
    }
  } else {
    let H = h - 2 * m, W = Math.min(w - 2 * Math.max(m, 54), H * 1.95, 1300);
    if (W < H * 1.5) H = W / 1.5;
    const x0 = (w - W) / 2, y0 = (h - H) / 2;
    const CR = 0.25, BASE = 0.06, FR = 0.06;
    L.W = W; L.H = H; L.x0 = x0; L.y0 = y0;
    L.crest = { x: x0, y: y0, w: W, h: CR * H };
    const bodyY = y0 + CR * H, bodyH = H - CR * H - BASE * H;
    L.body = { x: x0, y: bodyY, w: W, h: bodyH };
    const oh = bodyH - FR * H, ow = Math.min(oh * 1.12, W * 0.5);
    L.open = { x: x0 + (W - ow) / 2, y: bodyY + FR * H / 2, w: ow, h: oh };
    L.base = { x: x0 - 0.012 * W, y: bodyY + bodyH, w: W * 1.024, h: BASE * H };
    const pw = (W - ow) / 2 - FR * H * 0.6;          // pillar (side panel) width
    L.pillL = { x: x0, y: bodyY, w: pw, h: bodyH };
    L.pillR = { x: x0 + W - pw, y: bodyY, w: pw, h: bodyH };
    const cw = Math.min(pw * 0.5, H * 0.28);
    L.coin = { cx: x0 + pw * 0.5, cy: bodyY + bodyH * 0.36, w: Math.min(pw * 0.42, H * 0.17), h: Math.min(pw * 0.62, H * 0.25) };
    const sy = bodyY + bodyH * 0.06 + H * 0.085;
    L.slot = { cx: L.pillR.x + pw * 0.5, y: sy, w: cw * 1.12, h: H * 0.018, bh: H * 0.13 };
    L.card = { w: cw, hang: Math.min(bodyY + bodyH - sy - H * 0.04, cw * 1.4 * 0.88) };
    L.token = { cx: x0 + pw * 0.5, cy: bodyY + bodyH * 0.8, r: Math.min(H * 0.055, pw * 0.16) };
    L.u = H / 60;
    const bs = Math.min(0.045 * H, 0.03 * W);
    L.bulbR = bs / 2;
    const arch = archPts(L, bs * 0.9);
    arch.forEach(p => L.bulbs.push(p));
    const n = Math.max(3, Math.round(bodyH / (bs * 2.6)));
    for (let i = 0; i < n; i++) L.bulbs.push({ x: x0 + bs * 0.9, y: bodyY + (i + 0.5) * bodyH / n, side: 0 });
    for (let i = 0; i < n; i++) L.bulbs.push({ x: x0 + W - bs * 0.9, y: bodyY + (i + 0.5) * bodyH / n, side: 1 });
  }
  return L;
}

// The crest outline: an ogee arch (tall) or a band with a raised centre (wide)
function crestPath(g, L, inset) {
  const c = L.crest, i = inset || 0;
  g.beginPath();
  if (!L.wide) {
    const sh = c.y + 0.15 * c.w + i * 0.6, top = c.y + 0.02 * c.w + i;
    g.moveTo(c.x + i, c.y + c.h);
    g.lineTo(c.x + i, sh);
    g.bezierCurveTo(c.x + 0.17 * c.w, sh, c.x + 0.22 * c.w, top, c.x + 0.5 * c.w, top);
    g.bezierCurveTo(c.x + 0.78 * c.w, top, c.x + 0.83 * c.w, sh, c.x + c.w - i, sh);
    g.lineTo(c.x + c.w - i, c.y + c.h);
  } else {
    const sh = c.y + c.h * 0.32 + i * 0.6, top = c.y + i;
    g.moveTo(c.x + i, c.y + c.h);
    g.lineTo(c.x + i, sh);
    g.lineTo(c.x + c.w * 0.22, sh);
    g.bezierCurveTo(c.x + c.w * 0.3, sh, c.x + c.w * 0.31, top, c.x + c.w * 0.4, top);
    g.lineTo(c.x + c.w * 0.6, top);
    g.bezierCurveTo(c.x + c.w * 0.69, top, c.x + c.w * 0.7, sh, c.x + c.w * 0.78, sh);
    g.lineTo(c.x + c.w - i, sh);
    g.lineTo(c.x + c.w - i, c.y + c.h);
  }
  g.closePath();
}
// Bulb positions evenly spaced along the crest's top edge, inset from it
function archPts(L, inset) {
  const c = document.createElement('canvas').getContext('2d');
  // sample the crest top edge by walking the path numerically
  const pts = [];
  const c0 = L.crest, i = inset;
  const seg = [];
  if (!L.wide) {
    const sh = c0.y + 0.15 * c0.w + i * 0.6, top = c0.y + 0.02 * c0.w + i;
    seg.push([[c0.x + i, c0.y + c0.h * 0.92], [c0.x + i, sh]]);
    seg.push([[c0.x + i, sh], [c0.x + 0.17 * c0.w, sh], [c0.x + 0.22 * c0.w, top], [c0.x + 0.5 * c0.w, top]]);
    seg.push([[c0.x + 0.5 * c0.w, top], [c0.x + 0.78 * c0.w, top], [c0.x + 0.83 * c0.w, sh], [c0.x + c0.w - i, sh]]);
    seg.push([[c0.x + c0.w - i, sh], [c0.x + c0.w - i, c0.y + c0.h * 0.92]]);
  } else {
    const sh = c0.y + c0.h * 0.32 + i * 0.6, top = c0.y + i;
    seg.push([[c0.x + i, c0.y + c0.h * 0.85], [c0.x + i, sh]]);
    seg.push([[c0.x + i, sh], [c0.x + c0.w * 0.22, sh]]);
    seg.push([[c0.x + c0.w * 0.22, sh], [c0.x + c0.w * 0.3, sh], [c0.x + c0.w * 0.31, top], [c0.x + c0.w * 0.4, top]]);
    seg.push([[c0.x + c0.w * 0.4, top], [c0.x + c0.w * 0.6, top]]);
    seg.push([[c0.x + c0.w * 0.6, top], [c0.x + c0.w * 0.69, top], [c0.x + c0.w * 0.7, sh], [c0.x + c0.w * 0.78, sh]]);
    seg.push([[c0.x + c0.w * 0.78, sh], [c0.x + c0.w - i, sh]]);
    seg.push([[c0.x + c0.w - i, sh], [c0.x + c0.w - i, c0.y + c0.h * 0.85]]);
  }
  void c;
  const dense = [];
  seg.forEach(s => {
    for (let k = 0; k <= 60; k++) {
      const t = k / 60;
      if (s.length === 2) dense.push([s[0][0] + (s[1][0] - s[0][0]) * t, s[0][1] + (s[1][1] - s[0][1]) * t]);
      else { const u = 1 - t; dense.push([0, 1].map(d => u * u * u * s[0][d] + 3 * u * u * t * s[1][d] + 3 * u * t * t * s[2][d] + t * t * t * s[3][d])); }
    }
  });
  let len = 0; const acc = [0];
  for (let k = 1; k < dense.length; k++) { len += Math.hypot(dense[k][0] - dense[k - 1][0], dense[k][1] - dense[k - 1][1]); acc.push(len); }
  const step = L.bulbR * 2 * 2.05, n = Math.max(6, Math.round(len / step));
  for (let b = 0; b <= n; b++) {
    const d = (b / n) * len;
    let k = 1; while (k < acc.length - 1 && acc[k] < d) k++;
    const f = (d - acc[k - 1]) / Math.max(1e-6, acc[k] - acc[k - 1]);
    pts.push({ x: dense[k - 1][0] + (dense[k][0] - dense[k - 1][0]) * f, y: dense[k - 1][1] + (dense[k][1] - dense[k - 1][1]) * f, arch: 1 });
  }
  return pts;
}

// ── Materials ──────────────────────────────────────────────────────────────
function redLacquer(g, x, y, w, h, seed) {
  g.fillStyle = lin(g, x, y, x, y + h, [[0, '#8e1720'], [0.5, '#6e0f18'], [1, '#4a0910']]);
  g.fillRect(x, y, w, h);
  const R = rng(seed || 1);
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
  for (let i = 0; i < Math.max(20, w / 4); i++) {
    const yy = y + R() * h, amp = 1 + R() * 3;
    g.beginPath(); g.moveTo(x, yy);
    for (let xx = 0; xx <= w; xx += w / 8) g.lineTo(x + xx, yy + Math.sin(xx * 0.02 + i) * amp);
    g.strokeStyle = R() < 0.5 ? 'rgba(30,0,4,.12)' : 'rgba(255,120,110,.05)'; g.lineWidth = 0.6 + R(); g.stroke();
  }
  g.fillStyle = lin(g, x, y, x, y + h, [[0, 'rgba(255,220,200,.12)'], [0.12, 'rgba(255,220,200,0)'], [0.85, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,.25)']]);
  g.fillRect(x, y, w, h);
  g.restore();
}
function blackLacquer(g, x, y, w, h) {
  g.fillStyle = lin(g, x, 0, x + w, 0, [[0, '#050304'], [0.3, '#2b2124'], [0.45, '#3a2d31'], [0.65, '#140e10'], [1, '#040203']]);
  g.fillRect(x, y, w, h);
}
// A gold frame of thickness t around rect r (drawn outside it), with bevels and a row of beads
function goldFrame(g, r, t, beads) {
  const { x, y, w, h } = r;
  g.save();
  g.beginPath(); g.rect(x - t, y - t, w + 2 * t, h + 2 * t); g.rect(x, y, w, h);
  g.fillStyle = gold(g, x - t, y - t, x + w * 0.3, y + h + t); g.fill('evenodd');
  // bevel: light top-left outer edge, dark inner edge
  g.lineWidth = Math.max(0.6, t * 0.12);
  g.strokeStyle = 'rgba(255,248,210,.7)'; g.strokeRect(x - t + g.lineWidth / 2, y - t + g.lineWidth / 2, w + 2 * t - g.lineWidth, h + 2 * t - g.lineWidth);
  g.strokeStyle = 'rgba(50,30,5,.8)'; g.strokeRect(x - g.lineWidth / 2, y - g.lineWidth / 2, w + g.lineWidth, h + g.lineWidth);
  g.strokeStyle = 'rgba(70,45,8,.6)'; g.lineWidth = Math.max(0.5, t * 0.08);
  g.strokeRect(x - t * 0.5, y - t * 0.5, w + t, h + t);
  if (beads) {
    const step = t * 0.95, br = t * 0.2;
    const bead = (bx, by) => { g.fillStyle = rad(g, bx - br * 0.3, by - br * 0.3, br * 0.1, bx, by, br, [[0, '#fff6c8'], [0.6, '#c8962f'], [1, '#5e3d0e']]); g.beginPath(); g.arc(bx, by, br, 0, TAU); g.fill(); };
    for (let bx = x - t * 0.5; bx <= x + w + t * 0.5; bx += step) { bead(bx, y - t * 0.5); bead(bx, y + h + t * 0.5); }
    for (let by = y - t * 0.5 + step; by < y + h + t * 0.5; by += step) { bead(x - t * 0.5, by); bead(x + w + t * 0.5, by); }
  }
  g.restore();
}
// Carved C-scroll in gold leaf
function scroll(g, x, y, s, dir, rot) {
  g.save(); g.translate(x, y); g.scale(dir, 1); g.rotate(rot || 0);
  const draw = (off, col, wmul) => {
    g.beginPath();
    for (let t = 0; t <= 1; t += 0.02) {
      const a = t * 4.2, r = s * (1 - t * 0.78);
      const px = Math.cos(a) * r + off, py = Math.sin(a) * r * 0.9 + off;
      t ? g.lineTo(px, py) : g.moveTo(px, py);
    }
    g.strokeStyle = col; g.lineWidth = s * 0.2 * wmul; g.lineCap = 'round'; g.stroke();
  };
  draw(s * 0.06, 'rgba(20,5,0,.6)', 1.05);
  draw(0, gold(g, -s, -s, s, s), 1);
  draw(-s * 0.04, 'rgba(255,245,200,.55)', 0.3);
  // leaf trailing off the scroll
  g.beginPath(); g.moveTo(s, 0); g.bezierCurveTo(s * 1.6, -s * 0.2, s * 2.0, s * 0.3, s * 2.6, -s * 0.15);
  g.bezierCurveTo(s * 2.0, s * 0.55, s * 1.4, s * 0.45, s * 0.8, s * 0.25); g.closePath();
  g.fillStyle = gold(g, s, -s * 0.3, s * 2.6, s * 0.5); g.fill();
  g.strokeStyle = 'rgba(40,20,0,.5)'; g.lineWidth = s * 0.04; g.stroke();
  g.restore();
}
function screw(g, x, y, r) {
  g.fillStyle = rad(g, x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r, [[0, '#ffffff'], [0.5, '#a8a8b0'], [1, '#3a3a44']]);
  g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(30,30,40,.8)'; g.lineWidth = r * 0.3;
  g.beginPath(); g.moveTo(x - r * 0.7, y - r * 0.2); g.lineTo(x + r * 0.7, y + r * 0.2); g.stroke();
}
// Gilded lettering with a dark carved edge and a red 3D drop
function giltText(g, text, x, y, size, font, opt) {
  opt = opt || {};
  g.save();
  g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle';
  if (opt.spacing && 'letterSpacing' in g) g.letterSpacing = opt.spacing + 'px';
  if (opt.maxW) { const m = g.measureText(text).width; if (m > opt.maxW) { g.translate(x, y); g.scale(opt.maxW / m, opt.maxW / m); g.translate(-x, -y); } }
  const depth = opt.depth == null ? size * 0.07 : opt.depth;
  for (let d = depth; d > 0; d -= Math.max(0.5, depth / 6)) { g.fillStyle = opt.drop || '#3a0408'; g.fillText(text, x + d * 0.5, y + d); }
  g.lineJoin = 'round'; g.strokeStyle = '#1a0a00'; g.lineWidth = size * 0.09; g.strokeText(text, x, y);
  g.fillStyle = lin(g, 0, y - size * 0.5, 0, y + size * 0.5, opt.fill || [[0, '#fff6c8'], [0.35, '#f3cd63'], [0.55, '#b9821f'], [0.7, '#e9bb4c'], [1, '#7a5110']]);
  g.fillText(text, x, y);
  g.restore();
}
function engraved(g, text, x, y, size, font, color, maxW) {
  g.save(); g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle';
  if ('letterSpacing' in g) g.letterSpacing = (size * 0.12) + 'px';
  if (maxW) { const m = g.measureText(text).width; if (m > maxW) { g.translate(x, y); g.scale(maxW / m, maxW / m); g.translate(-x, -y); } }
  g.fillStyle = 'rgba(255,255,255,.55)'; g.fillText(text, x, y + size * 0.06);
  g.fillStyle = color || 'rgba(30,22,10,.85)'; g.fillText(text, x, y);
  g.restore();
}

// ── Painting ───────────────────────────────────────────────────────────────
export function paint(g, L, dpr, F) {
  const { w, h, W } = L;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, w, h);
  background(g, L);
  // cabinet's shadow on the floor
  const fy = L.wide ? L.base.y + L.base.h : L.base.y + L.base.h;
  g.fillStyle = rad(g, w / 2, fy, 2, w / 2, fy, W * 0.62, [[0, 'rgba(0,0,0,.75)'], [1, 'rgba(0,0,0,0)']]);
  g.save(); g.translate(w / 2, fy); g.scale(1, 0.12); g.beginPath(); g.arc(0, 0, W * 0.62, 0, TAU); g.restore(); g.fill();
  if (!L.wide) tall(g, L, F); else wideCab(g, L, F);
  glass(g, L);
  // carnival light washing over the front from above
  g.save();
  g.globalCompositeOperation = 'soft-light';
  g.fillStyle = rad(g, w / 2, L.y0 - L.W * 0.2, 10, w / 2, L.y0, Math.max(L.W, L.H) * 1.1, [[0, 'rgba(255,220,150,.5)'], [1, 'rgba(0,0,0,.35)']]);
  g.fillRect(L.x0 - 20, L.y0 - 20, L.W + 40, L.H + 40);
  g.restore();
}

function background(g, L) {
  const { w, h } = L;
  // big-top canvas: dark red and cream stripes, barely lit
  const sw = Math.max(26, Math.min(w, h) * 0.09);
  for (let x = -sw, i = 0; x < w + sw; x += sw, i++) {
    g.fillStyle = i % 2 ? '#1d080c' : '#2a1a17';
    g.beginPath(); g.moveTo(x, 0); g.lineTo(x + sw, 0); g.lineTo(x + sw * 1.15 + (x - w / 2) * 0.05, h); g.lineTo(x + (x - w / 2) * 0.05 - sw * 0.15, h); g.closePath(); g.fill();
  }
  const floorY = L.wide ? L.base.y + L.base.h * 0.85 : L.base.y + L.base.h * 0.85;
  // floorboards
  g.fillStyle = lin(g, 0, floorY, 0, h, [[0, '#1c0f08'], [1, '#0a0503']]);
  g.fillRect(0, floorY, w, h - floorY);
  g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = 1;
  for (let k = 1; k < 8; k++) { const y = floorY + (h - floorY) * Math.pow(k / 8, 1.6); g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
  // a warm glow around the machine, darkness at the edges
  g.fillStyle = rad(g, w / 2, L.y0 + L.H * 0.35, 10, w / 2, L.y0 + L.H * 0.4, Math.max(w, h) * 0.7, [[0, 'rgba(255,150,80,.22)'], [0.5, 'rgba(120,40,20,.08)'], [1, 'rgba(0,0,0,.55)']]);
  g.fillRect(0, 0, w, h);
  // distant string lights, out of focus
  const R = rng(9);
  const n = Math.round(w / 34);
  for (let i = 0; i < n; i++) {
    const x = (i + 0.5) * w / n + (R() - 0.5) * 8, y = h * 0.05 + Math.sin(i / n * Math.PI) * h * 0.05 + R() * 6;
    const r = 3 + R() * 6, hue = [38, 45, 10, 330, 190][i % 5];
    g.fillStyle = rad(g, x, y, 0, x, y, r * 2.4, [[0, 'hsla(' + hue + ',95%,70%,.32)'], [0.4, 'hsla(' + hue + ',95%,60%,.12)'], [1, 'hsla(' + hue + ',95%,60%,0)']]);
    g.beginPath(); g.arc(x, y, r * 2.4, 0, TAU); g.fill();
  }
}

function tall(g, L, F) {
  const { W, x0, crest, body, open, shelf, low, base } = L, u = W / 100;
  // body: red lacquer with black pillars
  redLacquer(g, x0, body.y, W, body.h, 3);
  blackLacquer(g, x0, body.y, 0.12 * W, body.h);
  blackLacquer(g, x0 + 0.88 * W, body.y, 0.12 * W, body.h);
  // fluting on the pillars
  for (const px of [x0, x0 + 0.88 * W]) {
    for (let k = 1; k < 4; k++) {
      const fx = px + k * 0.03 * W;
      if (Math.abs(fx - (px + 0.06 * W)) < 0.01 * W) continue;
      g.fillStyle = gold(g, fx - 0.3 * u, 0, fx + 0.3 * u, 0); g.fillRect(fx - 0.25 * u, body.y + 2 * u, 0.5 * u, body.h - 4 * u);
    }
    g.fillStyle = gold(g, 0, body.y, 0, body.y + 2 * u); g.fillRect(px, body.y, 0.12 * W, 1.6 * u);
  }
  // the crest
  g.save();
  crestPath(g, L, 0); g.fillStyle = '#100607'; g.fill();
  crestPath(g, L, 0); g.clip();
  redLacquer(g, crest.x, crest.y, crest.w, crest.h, 7);
  g.restore();
  crestPath(g, L, 0.012 * W); g.strokeStyle = gold(g, 0, crest.y, 0, crest.y + crest.h); g.lineWidth = 1.6 * u; g.stroke();
  crestPath(g, L, 0.012 * W); g.strokeStyle = 'rgba(40,20,0,.6)'; g.lineWidth = 0.25 * u; g.stroke();
  // the sign panel, black lacquer inside the arch
  g.save();
  crestPath(g, L, 0.065 * W);
  g.fillStyle = lin(g, 0, crest.y, 0, crest.y + crest.h, [[0, '#24161a'], [0.5, '#0b0507'], [1, '#160b0d']]); g.fill();
  g.strokeStyle = gold(g, 0, crest.y, 0, crest.y + crest.h); g.lineWidth = 0.9 * u; g.stroke();
  crestPath(g, L, 0.078 * W); g.strokeStyle = 'rgba(220,170,70,.55)'; g.lineWidth = 0.25 * u; g.stroke();
  g.restore();
  // finial: a little gilded crystal ball on the apex
  const fx = x0 + W / 2, fyy = crest.y + 0.035 * W;
  g.fillStyle = rad(g, fx - u, fyy - u, 0.2 * u, fx, fyy, 3.4 * u, [[0, '#d9d2ff'], [0.5, '#6a54d8'], [1, '#1a0c48']]);
  g.beginPath(); g.arc(fx, fyy, 3.2 * u, 0, TAU); g.fill();
  g.strokeStyle = gold(g, fx - 3 * u, 0, fx + 3 * u, 0); g.lineWidth = 0.8 * u; g.stroke();
  // lettering
  const cx = x0 + W / 2, cy = crest.y;
  giltText(g, 'THE GREAT', cx, cy + 0.125 * W, 0.048 * W, '700 ' + (0.048 * W) + 'px ' + F.cinzel, { spacing: 0.012 * W, depth: 0.004 * W });
  giltText(g, 'ZANDOR', cx, cy + 0.205 * W, 0.105 * W, (0.105 * W) + 'px ' + F.bungee, { spacing: 0.006 * W, depth: 0.009 * W, maxW: 0.62 * W });
  // ribbon banner
  ribbon(g, cx, cy + 0.292 * W, 0.56 * W, 0.05 * W);
  giltText(g, 'HE SEES ALL', cx, cy + 0.293 * W, 0.034 * W, '700 ' + (0.034 * W) + 'px ' + F.cinzel, { spacing: 0.01 * W, depth: 0.002 * W, fill: [[0, '#fff8de'], [1, '#e8c77a']], shine: false });
  // carved scrolls flanking the sign
  scroll(g, x0 + 0.13 * W, cy + 0.255 * W, 0.045 * W, 1, -0.3);
  scroll(g, x0 + 0.87 * W, cy + 0.255 * W, 0.045 * W, -1, -0.3);

  // case frame: layered gold molding
  goldFrame(g, open, 0.035 * W, true);
  // shelf
  g.fillStyle = gold(g, 0, shelf.y, 0, shelf.y + shelf.h); g.fillRect(shelf.x, shelf.y, shelf.w, shelf.h);
  g.fillStyle = 'rgba(40,20,0,.45)'; g.fillRect(shelf.x, shelf.y + shelf.h * 0.62, shelf.w, shelf.h * 0.12);
  g.fillStyle = 'rgba(255,250,220,.5)'; g.fillRect(shelf.x, shelf.y + shelf.h * 0.08, shelf.w, shelf.h * 0.1);
  g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(x0, shelf.y + shelf.h, W, 0.8 * u);
  // lower panel
  redLacquer(g, low.x, low.y, low.w, low.h, 5);
  blackLacquer(g, low.x, low.y, 0.06 * W, low.h);
  blackLacquer(g, low.x + 0.94 * W, low.y, 0.06 * W, low.h);
  const ip = { x: x0 + 0.1 * W, y: low.y + 0.035 * W, w: 0.8 * W, h: low.h - 0.07 * W };
  g.fillStyle = 'rgba(30,0,4,.35)'; g.fillRect(ip.x, ip.y, ip.w, ip.h);
  goldFrame(g, ip, 0.012 * W, false);
  cornerFans(g, ip, 0.05 * W);
  // centre medallion: a painted eye in a sunburst
  medallion(g, x0 + 0.5 * W, low.y + 0.31 * W, 0.045 * W, F);
  coinPlate(g, L, F);
  cardSlot(g, L, F);
  tokenDish(g, L);
  // plinth
  g.fillStyle = lin(g, 0, base.y, 0, base.y + base.h, [[0, '#2a1d20'], [0.5, '#0c0607'], [1, '#050203']]);
  g.fillRect(base.x, base.y, base.w, base.h);
  g.fillStyle = gold(g, 0, base.y, 0, base.y + 1.4 * u); g.fillRect(base.x, base.y, base.w, 1.2 * u);
  g.fillStyle = gold(g, 0, base.y + base.h - 1.6 * u, 0, base.y + base.h); g.fillRect(base.x + 2 * u, base.y + base.h - 1.2 * u, base.w - 4 * u, 1.2 * u);
  // a sliver of side panel shows the cabinet's depth
  g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x0 + W - 0.5 * u, body.y, 0.5 * u, base.y - body.y);
}

function wideCab(g, L, F) {
  const { W, H, x0, crest, body, open, base, pillL, pillR } = L, u = L.u;
  redLacquer(g, x0, body.y, W, body.h, 3);
  for (const p of [pillL, pillR]) {
    const ip = { x: p.x + p.w * 0.12, y: p.y + p.h * 0.05, w: p.w * 0.76, h: p.h * 0.9 };
    g.fillStyle = 'rgba(30,0,4,.35)'; g.fillRect(ip.x, ip.y, ip.w, ip.h);
    goldFrame(g, ip, Math.max(1.5, H * 0.008), false);
    cornerFans(g, ip, Math.min(ip.w, ip.h) * 0.16);
  }
  blackLacquer(g, x0, body.y, H * 0.05, body.h);
  blackLacquer(g, x0 + W - H * 0.05, body.y, H * 0.05, body.h);
  // crest band
  g.save();
  crestPath(g, L, 0); g.fillStyle = '#100607'; g.fill();
  crestPath(g, L, 0); g.clip();
  redLacquer(g, crest.x, crest.y, crest.w, crest.h, 7);
  g.restore();
  crestPath(g, L, H * 0.008); g.strokeStyle = gold(g, 0, crest.y, 0, crest.y + crest.h); g.lineWidth = H * 0.012; g.stroke();
  // sign panel
  const sp = { x: x0 + W * 0.3, y: crest.y + crest.h * 0.3, w: W * 0.4, h: crest.h * 0.62 };
  g.fillStyle = lin(g, 0, sp.y, 0, sp.y + sp.h, [[0, '#24161a'], [0.5, '#0b0507'], [1, '#160b0d']]);
  rr(g, sp.x, sp.y, sp.w, sp.h, sp.h * 0.2); g.fill();
  g.strokeStyle = gold(g, 0, sp.y, 0, sp.y + sp.h); g.lineWidth = H * 0.008; g.stroke();
  const cx = x0 + W / 2;
  const fs = Math.min(sp.h * 0.5, sp.w / 9);
  giltText(g, 'THE GREAT ZANDOR', cx, sp.y + sp.h * 0.42, fs, fs + 'px ' + F.bungee, { spacing: fs * 0.04, depth: fs * 0.08, maxW: sp.w * 0.88 });
  giltText(g, '·  HE SEES ALL  ·', cx, sp.y + sp.h * 0.8, fs * 0.36, '700 ' + (fs * 0.36) + 'px ' + F.cinzel, { spacing: fs * 0.08, depth: 0, fill: [[0, '#fff8de'], [1, '#e8c77a']], shine: false });
  scroll(g, sp.x - H * 0.03, crest.y + crest.h * 0.7, H * 0.026, -1, -0.2);
  scroll(g, sp.x + sp.w + H * 0.03, crest.y + crest.h * 0.7, H * 0.026, 1, -0.2);
  goldFrame(g, open, H * 0.026, true);
  coinPlate(g, L, F);
  cardSlot(g, L, F);
  tokenDish(g, L);
  g.fillStyle = lin(g, 0, base.y, 0, base.y + base.h, [[0, '#2a1d20'], [0.5, '#0c0607'], [1, '#050203']]);
  g.fillRect(base.x, base.y, base.w, base.h);
  g.fillStyle = gold(g, 0, base.y, 0, base.y + H * 0.012); g.fillRect(base.x, base.y, base.w, H * 0.01);
  void u;
}

function ribbon(g, cx, cy, w, h) {
  const x = cx - w / 2;
  for (const sx of [-1, 1]) {   // folded tails
    const ex = cx + sx * w / 2;
    g.beginPath(); g.moveTo(ex - sx * h * 0.2, cy - h * 0.3); g.lineTo(ex + sx * h * 0.9, cy - h * 0.2); g.lineTo(ex + sx * h * 0.55, cy + h * 0.25); g.lineTo(ex + sx * h * 0.9, cy + h * 0.7); g.lineTo(ex - sx * h * 0.2, cy + h * 0.65); g.closePath();
    g.fillStyle = '#5a0a12'; g.fill(); g.strokeStyle = 'rgba(230,180,80,.6)'; g.lineWidth = h * 0.05; g.stroke();
  }
  g.beginPath(); g.moveTo(x, cy - h / 2); g.quadraticCurveTo(cx, cy - h * 0.75, x + w, cy - h / 2); g.lineTo(x + w, cy + h / 2); g.quadraticCurveTo(cx, cy + h * 0.25, x, cy + h / 2); g.closePath();
  g.fillStyle = lin(g, 0, cy - h / 2, 0, cy + h / 2, [[0, '#c0283a'], [0.5, '#8e1424'], [1, '#5a0a14']]); g.fill();
  g.strokeStyle = gold(g, 0, cy - h / 2, 0, cy + h / 2); g.lineWidth = h * 0.08; g.stroke();
}
function cornerFans(g, r, s) {
  const corners = [[r.x, r.y, 0], [r.x + r.w, r.y, Math.PI / 2], [r.x + r.w, r.y + r.h, Math.PI], [r.x, r.y + r.h, Math.PI * 1.5]];
  corners.forEach(([x, y, a]) => {
    g.save(); g.translate(x, y); g.rotate(a);
    g.strokeStyle = 'rgba(230,185,90,.75)'; g.lineWidth = Math.max(0.6, s * 0.04);
    g.beginPath(); g.arc(0, 0, s, 0, Math.PI / 2); g.stroke();
    g.beginPath(); g.arc(0, 0, s * 0.62, 0, Math.PI / 2); g.stroke();
    for (let k = 0; k <= 6; k++) { const t = (k / 6) * Math.PI / 2; g.beginPath(); g.moveTo(Math.cos(t) * s * 0.62, Math.sin(t) * s * 0.62); g.lineTo(Math.cos(t) * s, Math.sin(t) * s); g.stroke(); }
    g.restore();
  });
}
function medallion(g, x, y, r, F) {
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * TAU, r2 = i % 2 ? r * 1.35 : r * 1.7;
    g.beginPath(); g.moveTo(x + Math.cos(a - 0.06) * r * 0.8, y + Math.sin(a - 0.06) * r * 0.8); g.lineTo(x + Math.cos(a) * r2, y + Math.sin(a) * r2); g.lineTo(x + Math.cos(a + 0.06) * r * 0.8, y + Math.sin(a + 0.06) * r * 0.8);
    g.fillStyle = 'rgba(232,186,90,.85)'; g.fill();
  }
  g.fillStyle = gold(g, x - r, y - r, x + r, y + r); g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  g.fillStyle = '#120607'; g.beginPath(); g.arc(x, y, r * 0.82, 0, TAU); g.fill();
  // the all-seeing eye, painted
  g.beginPath(); g.moveTo(x - r * 0.62, y); g.quadraticCurveTo(x, y - r * 0.55, x + r * 0.62, y); g.quadraticCurveTo(x, y + r * 0.55, x - r * 0.62, y); g.closePath();
  g.fillStyle = '#f2e3bf'; g.fill();
  g.fillStyle = rad(g, x, y, 0, x, y, r * 0.26, [[0, '#2a1505'], [0.5, '#7a3cc8'], [1, '#2a1060']]); g.beginPath(); g.arc(x, y, r * 0.24, 0, TAU); g.fill();
  g.fillStyle = '#000'; g.beginPath(); g.arc(x, y, r * 0.1, 0, TAU); g.fill();
  g.strokeStyle = '#d7a640'; g.lineWidth = r * 0.06; g.beginPath(); g.moveTo(x - r * 0.62, y); g.quadraticCurveTo(x, y - r * 0.55, x + r * 0.62, y); g.quadraticCurveTo(x, y + r * 0.55, x - r * 0.62, y); g.stroke();
  void F;
}
function coinPlate(g, L, F) {
  const c = L.coin, x = c.cx - c.w / 2, y = c.cy - c.h / 2;
  // chrome plate
  g.save();
  g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = c.w * 0.1; g.shadowOffsetY = c.w * 0.04;
  rr(g, x, y, c.w, c.h, c.w * 0.12);
  g.fillStyle = lin(g, x, y, x + c.w, y + c.h, [[0, '#f4f4f8'], [0.25, '#9a9aa6'], [0.5, '#e6e6ee'], [0.75, '#6e6e7a'], [1, '#c8c8d2']]); g.fill();
  g.restore();
  rr(g, x + c.w * 0.06, y + c.w * 0.06, c.w * 0.88, c.h - c.w * 0.12, c.w * 0.08);
  g.strokeStyle = 'rgba(40,40,50,.5)'; g.lineWidth = Math.max(0.6, c.w * 0.015); g.stroke();
  // red enamel field with the slot
  const fx = x + c.w * 0.16, fy = y + c.h * 0.08, fw = c.w * 0.68, fh = c.h * 0.84;
  rr(g, fx, fy, fw, fh, c.w * 0.06);
  g.fillStyle = lin(g, 0, fy, 0, fy + fh, [[0, '#a3162a'], [1, '#5a0712']]); g.fill();
  engraved(g, 'INSERT', c.cx, fy + fh * 0.13, c.w * 0.13, '700 ' + (c.w * 0.13) + 'px ' + F.cinzel, '#f6d98a', fw * 0.86);
  // slot (vertical, coin-edge shaped), recessed
  const sw = c.w * 0.1, sh = fh * 0.4, sx = c.cx - sw / 2, sy = fy + fh * 0.24;
  rr(g, sx - c.w * 0.05, sy - c.w * 0.05, sw + c.w * 0.1, sh + c.w * 0.1, c.w * 0.06);
  g.fillStyle = lin(g, sx, 0, sx + sw, 0, [[0, '#5a5a66'], [0.5, '#f0f0f6'], [1, '#4a4a56']]); g.fill();
  rr(g, sx, sy, sw, sh, sw * 0.4);
  g.fillStyle = lin(g, sx, 0, sx + sw, 0, [[0, '#000'], [0.7, '#14100c'], [1, '#2a2622']]); g.fill();
  // stamped plate: 1 TOKEN
  const py = fy + fh * 0.82, ph = fh * 0.2;
  rr(g, fx + fw * 0.08, py - ph / 2, fw * 0.84, ph, ph * 0.2);
  g.fillStyle = lin(g, 0, py - ph / 2, 0, py + ph / 2, [[0, '#f3d888'], [1, '#a77a22']]); g.fill();
  engraved(g, '1 TOKEN', c.cx, py + ph * 0.04, ph * 0.5, (ph * 0.5) + 'px ' + F.bungee, '#3a1a04', fw * 0.74);
  // screws
  const sr = c.w * 0.045;
  [[x + c.w * 0.09, y + c.w * 0.09], [x + c.w * 0.91, y + c.w * 0.09], [x + c.w * 0.09, y + c.h - c.w * 0.09], [x + c.w * 0.91, y + c.h - c.w * 0.09]].forEach(p => screw(g, p[0], p[1], sr));
}
function cardSlot(g, L, F) {
  const s = L.slot, bw = s.w * 1.18, bh = s.bh, bx = s.cx - bw / 2, by = s.y - bh * 0.66;
  // brass bezel
  g.save();
  g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = bh * 0.25; g.shadowOffsetY = bh * 0.08;
  rr(g, bx, by, bw, bh, bh * 0.22);
  g.fillStyle = lin(g, 0, by, 0, by + bh, [[0, '#fff1b8'], [0.25, '#d7a940'], [0.55, '#a87a24'], [0.8, '#7a5414'], [1, '#e2b85a']]); g.fill();
  g.restore();
  rr(g, bx, by, bw, bh, bh * 0.22); g.strokeStyle = 'rgba(50,30,5,.8)'; g.lineWidth = Math.max(0.6, bh * 0.03); g.stroke();
  rr(g, bx + bh * 0.08, by + bh * 0.08, bw - bh * 0.16, bh * 0.84, bh * 0.16); g.strokeStyle = 'rgba(255,240,190,.45)'; g.lineWidth = Math.max(0.5, bh * 0.02); g.stroke();
  const fs = bh * 0.2;
  engraved(g, 'YOUR FORTUNE', s.cx, by + bh * 0.3, fs, '700 ' + fs + 'px ' + F.cinzel, '#3a1a04', bw * 0.62);
  // the slot mouth
  rr(g, s.cx - s.w / 2, s.y - s.h / 2, s.w, s.h, s.h / 2);
  g.fillStyle = '#050202'; g.fill();
  g.strokeStyle = 'rgba(255,240,200,.6)'; g.lineWidth = Math.max(0.5, s.h * 0.15);
  g.beginPath(); g.moveTo(s.cx - s.w / 2 + s.h / 2, s.y + s.h / 2 + g.lineWidth); g.lineTo(s.cx + s.w / 2 - s.h / 2, s.y + s.h / 2 + g.lineWidth); g.stroke();
  // rivets
  const r2 = bh * 0.06;
  [[bx + bh * 0.2, by + bh * 0.3], [bx + bw - bh * 0.2, by + bh * 0.3]].forEach(p => screw(g, p[0], p[1], r2));
}
function tokenDish(g, L) {
  const t = L.token, r = t.r * 1.5;
  g.save(); g.translate(t.cx, t.cy + t.r * 0.25); g.scale(1, 0.45);
  g.fillStyle = lin(g, -r, -r, r, r, [[0, '#fff1b8'], [0.4, '#b8862b'], [1, '#4a300a']]);
  g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
  g.fillStyle = rad(g, 0, -r * 0.2, r * 0.1, 0, 0, r * 0.82, [[0, '#2a1a06'], [1, '#6a4a14']]);
  g.beginPath(); g.arc(0, 0, r * 0.82, 0, TAU); g.fill();
  g.restore();
}

function glass(g, L) {
  const o = L.open;
  // cut the case open so the swami's canvas shows through
  g.save();
  g.globalCompositeOperation = 'destination-out';
  g.fillStyle = '#000'; g.fillRect(o.x, o.y, o.w, o.h);
  g.restore();
  g.save();
  g.beginPath(); g.rect(o.x, o.y, o.w, o.h); g.clip();
  // the frame's shadow falling into the case
  const d = Math.min(o.w, o.h) * 0.07;
  g.fillStyle = lin(g, 0, o.y, 0, o.y + d, [[0, 'rgba(0,0,0,.65)'], [1, 'rgba(0,0,0,0)']]); g.fillRect(o.x, o.y, o.w, d);
  g.fillStyle = lin(g, o.x, 0, o.x + d * 0.6, 0, [[0, 'rgba(0,0,0,.5)'], [1, 'rgba(0,0,0,0)']]); g.fillRect(o.x, o.y, d, o.h);
  g.fillStyle = lin(g, o.x + o.w, 0, o.x + o.w - d * 0.6, 0, [[0, 'rgba(0,0,0,.5)'], [1, 'rgba(0,0,0,0)']]); g.fillRect(o.x + o.w - d, o.y, d, o.h);
  // reflections on the glass: a broad diagonal sheen and two sharp streaks
  const sweep = (a, b, alpha) => {
    g.beginPath();
    g.moveTo(o.x + o.w * a, o.y); g.lineTo(o.x + o.w * b, o.y); g.lineTo(o.x + o.w * b - o.h * 0.55, o.y + o.h); g.lineTo(o.x + o.w * a - o.h * 0.55, o.y + o.h); g.closePath();
    g.fillStyle = lin(g, o.x + o.w * a, 0, o.x + o.w * b, 0, [[0, 'rgba(255,255,255,0)'], [0.5, 'rgba(255,245,235,' + alpha + ')'], [1, 'rgba(255,255,255,0)']]);
    g.fill();
  };
  sweep(0.04, 0.38, 0.1); sweep(0.46, 0.5, 0.12); sweep(0.53, 0.545, 0.16); sweep(0.86, 1.08, 0.06);
  // reflected marquee bulbs, faint smudges near the top
  for (let i = 0; i < 7; i++) {
    const x = o.x + o.w * (0.15 + i * 0.12), y = o.y + o.h * 0.09;
    g.fillStyle = rad(g, x, y, 0, x, y, o.w * 0.025, [[0, 'rgba(255,220,150,.22)'], [1, 'rgba(255,220,150,0)']]);
    g.beginPath(); g.arc(x, y, o.w * 0.025, 0, TAU); g.fill();
  }
  g.strokeStyle = 'rgba(255,255,255,.22)'; g.lineWidth = 1;
  g.beginPath(); g.moveTo(o.x + 1.5, o.y + o.h - 2); g.lineTo(o.x + 1.5, o.y + 1.5); g.lineTo(o.x + o.w - 2, o.y + 1.5); g.stroke();
  g.restore();
}

// ── Token ──────────────────────────────────────────────────────────────────
export function paintToken(c, px, F) {
  const g = c.getContext('2d'), r = px / 2;
  c.width = c.height = Math.ceil(px);
  g.translate(r, r);
  // reeded rim
  g.fillStyle = lin(g, -r, -r, r, r, [[0, '#fff3c0'], [0.35, '#d3a13a'], [0.7, '#7a5414'], [1, '#c99a3c']]);
  g.beginPath(); g.arc(0, 0, r * 0.98, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(70,45,8,.6)'; g.lineWidth = Math.max(0.5, r * 0.025);
  for (let i = 0; i < 60; i++) { const a = (i / 60) * TAU; g.beginPath(); g.moveTo(Math.cos(a) * r * 0.86, Math.sin(a) * r * 0.86); g.lineTo(Math.cos(a) * r * 0.97, Math.sin(a) * r * 0.97); g.stroke(); }
  g.fillStyle = rad(g, -r * 0.3, -r * 0.35, r * 0.05, 0, 0, r * 0.85, [[0, '#fff6d0'], [0.45, '#e2b456'], [1, '#8a6118']]);
  g.beginPath(); g.arc(0, 0, r * 0.84, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(90,60,10,.6)'; g.lineWidth = r * 0.04; g.beginPath(); g.arc(0, 0, r * 0.72, 0, TAU); g.stroke();
  // stars and a struck Z
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU - Math.PI / 2;
    g.fillStyle = 'rgba(110,75,15,.7)'; g.beginPath(); g.arc(Math.cos(a) * r * 0.78, Math.sin(a) * r * 0.78, r * 0.035, 0, TAU); g.fill();
  }
  g.font = (r * 0.95) + 'px ' + F.bungee; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = 'rgba(255,250,225,.75)'; g.fillText('Z', -r * 0.03, r * 0.06 - r * 0.03);
  g.fillStyle = 'rgba(95,60,10,.85)'; g.fillText('Z', r * 0.03, r * 0.06 + r * 0.03);
  g.fillStyle = '#d9a645'; g.fillText('Z', 0, r * 0.06);
}
