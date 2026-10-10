// Slots: every piece of 2D artwork the 3D cabinets use, drawn in code.
// Symbol atlases (from the SVG sprite in slots.html, rasterised with print
// effects), card ranks as metallic lettering, printed glass, LED displays,
// button caps, and the procedural material textures (walnut, brushed metal,
// paper). No images are loaded from anywhere.

const FONTS = ['400 40px Bungee', '700 40px Cinzel', '400 40px "Great Vibes"', '400 40px "Lilita One"'];
let fontsP = null;
export function fontsReady() {
  if (!fontsP) {
    fontsP = new Promise(function (res) {
      let done = false; const fin = () => { if (!done) { done = true; res(); } };
      setTimeout(fin, 2500);
      try { Promise.all(FONTS.map(f => document.fonts.load(f))).then(fin, fin); } catch (e) { fin(); }
    });
  }
  return fontsP;
}

export function cv(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return [c, c.getContext('2d')]; }
export function rr(x, a, b, w, h, r) { r = Math.min(r, w / 2, h / 2); x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r); x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath(); }
export function lg(x, x0, y0, x1, y1, stops) { const g = x.createLinearGradient(x0, y0, x1, y1); stops.forEach(s => g.addColorStop(s[0], s[1])); return g; }
export function rg(x, cx, cy, r0, r1, stops) { const g = x.createRadialGradient(cx, cy, r0, cx, cy, r1); stops.forEach(s => g.addColorStop(s[0], s[1])); return g; }
function seeded(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
// smooth value noise on a grid, tiling at n
function noise2(n, seed) {
  const r = seeded(seed), g = new Float32Array(n * n); for (let i = 0; i < n * n; i++) g[i] = r();
  return function (x, y) {
    x = ((x % n) + n) % n; y = ((y % n) + n) % n;
    const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0, x1 = (x0 + 1) % n, y1 = (y0 + 1) % n;
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const a = g[y0 * n + x0], b = g[y0 * n + x1], c = g[y1 * n + x0], d = g[y1 * n + x1];
    return (a * (1 - sx) + b * sx) * (1 - sy) + (c * (1 - sx) + d * sx) * sy;
  };
}
// text with letter spacing, centred at x
export function spaced(x, text, cx, y, sp, mode) {
  let w = 0; const ws = [];
  for (const ch of text) { const m = x.measureText(ch).width; ws.push(m); w += m + sp; }
  w -= sp; let px = cx - w / 2; const al = x.textAlign; x.textAlign = 'left';
  [...text].forEach((ch, i) => { if (mode !== 'fill') x.strokeText(ch, px, y); if (mode !== 'stroke') x.fillText(ch, px, y); px += ws[i] + sp; });
  x.textAlign = al;
}

// ── Symbols ───────────────────────────────────────────────────────────────
// Text inside the SVG symbols is drawn here instead (web fonts are not
// available to an SVG rendered as an image).
const TEXT = {
  B1: [{ t: 'BAR', x: 50, y: 57.5, s: 20, sp: 3, f: '900 {s}px "Arial Black",Arial,Helvetica,sans-serif', fill: '#fff' }],
  B2: [{ t: 'BAR', x: 50, y: 40, s: 18, sp: 3, f: '900 {s}px "Arial Black",Arial,Helvetica,sans-serif', fill: '#fff' }, { t: 'BAR', x: 50, y: 73, s: 18, sp: 3, f: '900 {s}px "Arial Black",Arial,Helvetica,sans-serif', fill: '#fff' }],
  B3: [26.5, 56.5, 86.5].map(y => ({ t: 'BAR', x: 50, y: y, s: 16, sp: 3, f: '900 {s}px "Arial Black",Arial,Helvetica,sans-serif', fill: '#fff' })),
  SU: [{ t: 'WILD', x: 50, y: 87, s: 21, sp: 1, f: '400 {s}px Bungee,Impact,sans-serif', fill: '#fff4cf', stroke: '#5a0f22', sw: 3.2 }],
  QN: [{ t: 'WILD', x: 75, y: 88.5, s: 11, sp: 0, f: '700 {s}px Cinzel,Georgia,serif', fill: '#ffd76a' }],
  DR: [{ t: 'WILD', x: 50, y: 90, s: 11.5, sp: 1, f: '400 {s}px Bungee,Impact,sans-serif', fill: '#ffe28a' }]
};
const RANK_TXT = { A: 'A', K: 'K', Q: 'Q', J: 'J', T: '10', N: '9' };
const RANK_STYLE = {
  b: { font: 'Georgia,"Times New Roman",serif', w: 900, line: '#fff1cf', dark: '#1a0802', size: 72, edge: '#4a2208',
    metal: [[0, '#fff0d0'], [0.28, '#e8a868'], [0.5, '#8a4a1a'], [0.58, '#b8703a'], [0.78, '#f0b878'], [1, '#5a2a0a']],
    c: { A: ['#7ff7ea', '#0c7a76'], K: ['#ff8a72', '#a3150c'], Q: ['#ffe07a', '#c46a00'], J: ['#b6f27e', '#2f7d1a'], T: ['#dcb6ff', '#5b2aa8'], N: ['#9ad0ff', '#1d58b0'] } },
  c: { font: 'Cinzel,Georgia,serif', w: 700, line: '#ffd76a', dark: '#08133a', size: 70,
    c: { A: ['#7fa8ff', '#173a96'], K: ['#7ff0d8', '#0f7f74'], Q: ['#ff8a8a', '#a3150c'], J: ['#a6ee72', '#2f7d1a'], T: ['#d2a8ff', '#5b2aa8'], N: ['#ffc070', '#b45a00'] } },
  d: { font: 'Bungee,Impact,sans-serif', w: 400, line: '#ffe08a', dark: '#2a0202', size: 62, edge: '#6a3a00',
    metal: [[0, '#fffbe6'], [0.3, '#ffd45a'], [0.52, '#a86a08'], [0.6, '#d8a02a'], [0.8, '#fff0a8'], [1, '#7a4a00']],
    c: { A: ['#9ff2c3', '#0b6b3f'], K: ['#ff8a72', '#a3150c'], Q: ['#8cc8ff', '#1d58b0'], J: ['#d2a8ff', '#5b2aa8'], T: ['#ffc070', '#b45a00'] } }
};
// A card rank as engraved metallic lettering (same look as the old SVG, drawn with real fonts)
function drawRank(x, S, mode, k) {
  const st = RANK_STYLE[mode.charAt(0)], t = RANK_TXT[k], two = t.length > 1, fs = two ? st.size * 0.8 : st.size, u = S / 100;
  x.save(); x.scale(u, u);
  x.font = st.w + ' ' + fs + 'px ' + st.font; x.textAlign = 'center'; x.textBaseline = 'alphabetic'; x.lineJoin = 'round';
  const y = 50 + fs * 0.36, mw = x.measureText(t).width, kx = two && mw > 80 ? 80 / mw : 1;
  function T(dx, dy, fill, stroke, sw) { x.save(); x.translate(50 + dx, dy); x.scale(kx, 1); if (stroke) { x.strokeStyle = stroke; x.lineWidth = sw; x.strokeText(t, 0, y); } if (fill) { x.fillStyle = fill; x.fillText(t, 0, y); } x.restore(); }
  x.globalAlpha = 0.55; T(1.5, 4, '#000', '#000', 11); x.globalAlpha = 1;
  T(0, 0, st.dark, st.dark, 11);
  T(0, 2.2, st.edge || st.c[k][1], st.edge || st.c[k][1], 3.5);
  const g = lg(x, 0, y - fs * 0.78, 0, y + fs * 0.04, st.metal || [[0, '#fff'], [0.22, st.c[k][0]], [1, st.c[k][1]]]);
  T(0, 0, null, st.metal ? st.c[k][0] : st.line, st.metal ? 3.2 : 2.6); T(0, 0, g, null, 0);
  if (st.metal) { x.globalAlpha = 0.55; T(-0.6, -0.8, null, '#fff', 0.8); x.globalAlpha = 1; }
  x.save(); x.beginPath(); x.rect(0, 0, 100, 50 - fs * 0.05); x.clip(); x.globalAlpha = 0.33; T(0, 0, '#fff', null, 0); x.restore();
  x.restore();
}
function svgDoc(defs, id, S) {
  return '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 100 100" width="' + S + '" height="' + S + '">' + defs + '<use href="#' + id + '" xlink:href="#' + id + '"/></svg>';
}
function loadImg(src) { return new Promise(function (res, rej) { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; }); }

// Rasterise one symbol at S px with print effects: a soft shadow under the ink and a gloss on top
async function symbolCanvas(defs, mode, k, S) {
  const [c, x] = cv(S, S), u = S / 100;
  const [ink, ix] = cv(S, S);
  if (RANK_TXT[k] && mode !== 'classic') drawRank(ix, S, mode, k);
  else {
    const img = await loadImg('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgDoc(defs, 'sy-' + k, S)));
    ix.drawImage(img, 0, 0, S, S);
    (TEXT[k] || []).forEach(function (t) {
      ix.save(); ix.scale(u, u); ix.font = t.f.replace('{s}', t.s); ix.textBaseline = 'alphabetic'; ix.lineJoin = 'round';
      ix.fillStyle = t.fill; if (t.stroke) { ix.strokeStyle = t.stroke; ix.lineWidth = t.sw; }
      spaced(ix, t.t, t.x, t.y, t.sp, t.stroke ? 'both' : 'fill'); ix.restore();
    });
  }
  // gloss: light from the top left, kept inside the ink
  ix.save(); ix.globalCompositeOperation = 'source-atop';
  ix.fillStyle = lg(ix, 0, 0, S * 0.3, S, [[0, 'rgba(255,255,255,.26)'], [0.42, 'rgba(255,255,255,.04)'], [0.6, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,.14)']]); ix.fillRect(0, 0, S, S);
  ix.restore();
  // shadow under the print
  x.save(); x.shadowColor = 'rgba(0,0,0,.42)'; x.shadowBlur = S * 0.035; x.shadowOffsetY = S * 0.02; x.drawImage(ink, 0, 0); x.restore();
  return c;
}

// The cell backgrounds each machine prints its symbols on
const CELL_BG = {
  classic: function (x, w, h) { x.fillStyle = lg(x, 0, 0, w, 0, [[0, '#ece6d6'], [0.08, '#fffdf4'], [0.92, '#fffdf4'], [1, '#ece6d6']]); x.fillRect(0, 0, w, h); x.fillStyle = 'rgba(0,0,0,.08)'; x.fillRect(0, h - 1, w, 1); },
  buffalo: function (x, w, h) { x.fillStyle = lg(x, 0, 0, 0, h, [[0, '#2b1408'], [0.5, '#3d1d0c'], [1, '#2b1408']]); x.fillRect(0, 0, w, h); x.strokeStyle = 'rgba(255,190,110,.22)'; x.lineWidth = 2; rr(x, 2, 2, w - 4, h - 4, 10); x.stroke(); },
  cleo: function (x, w, h) { x.fillStyle = lg(x, 0, 0, 0, h, [[0, '#f3e2b6'], [0.5, '#fbf0d2'], [1, '#e9d29a']]); x.fillRect(0, 0, w, h); x.strokeStyle = 'rgba(120,80,10,.28)'; x.lineWidth = 2; rr(x, 2, 2, w - 4, h - 4, 10); x.stroke(); },
  dragon: function (x, w, h) { x.fillStyle = rg(x, w / 2, h / 2, 4, w * 0.7, [[0, '#3a0808'], [1, '#1c0303']]); x.fillRect(0, 0, w, h); x.strokeStyle = 'rgba(255,200,90,.22)'; x.lineWidth = 2; rr(x, 2, 2, w - 4, h - 4, 10); x.stroke(); }
};
const FEAT_BG = {
  buffalo: function (x, w, h) { x.fillStyle = lg(x, 0, 0, 0, h, [[0, '#6e1d12'], [0.55, '#9a3a14'], [1, '#3a0c08']]); x.fillRect(0, 0, w, h); x.strokeStyle = 'rgba(255,220,120,.3)'; x.lineWidth = 2; rr(x, 2, 2, w - 4, h - 4, 10); x.stroke(); },
  cleo: function (x, w, h) { x.fillStyle = lg(x, 0, 0, 0, h, [[0, '#ffe9a0'], [0.5, '#fff6d6'], [1, '#f0cc6a']]); x.fillRect(0, 0, w, h); x.strokeStyle = 'rgba(120,80,10,.3)'; x.lineWidth = 2; rr(x, 2, 2, w - 4, h - 4, 10); x.stroke(); }
};

// Build the symbol atlas for one machine. cells: symbol keys (no blanks). ratio: cell height / width.
// Returns {canvas, blur, uv(k), cw, ch, cols, sym(k) canvas, drawSym(ctx,k,x,y,w,h)}
export async function buildAtlas(spriteEl, mode, keys, ratio, sw) {
  await fontsReady();
  let defs = spriteEl.innerHTML.replace(/<text[\s\S]*?<\/text>/g, '');
  const S = 256, cw = 256, ch = Math.round(256 * ratio);
  const all = keys.slice(); if (mode === 'classic') all.push('_');
  const cols = 4, rows = Math.ceil(all.length / cols);
  const [c, x] = cv(cols * cw, rows * ch), [bc, bx] = cv(cols * cw, rows * ch);
  const syms = {}, uv = {};
  const variants = { base: [c, x, CELL_BG[mode]], blur: [bc, bx, CELL_BG[mode]] };
  if (FEAT_BG[mode]) { const [fc, fx] = cv(cols * cw, rows * ch); variants.feat = [fc, fx, FEAT_BG[mode]]; }
  const imgs = await Promise.all(all.map(k => k === '_' ? null : symbolCanvas(defs, mode, k, S)));
  all.forEach(function (k, i) {
    const col = i % cols, row = Math.floor(i / cols), ox = col * cw, oy = row * ch;
    uv[k] = { u0: col / cols, u1: (col + 1) / cols, v0: 1 - (row + 1) / rows, v1: 1 - row / rows };
    const img = imgs[i]; if (img) syms[k] = img;
    const sz = Math.min(cw, ch) * (sw || 0.86);
    Object.keys(variants).forEach(function (vn) {
      const v = variants[vn], vx = v[1];
      vx.save(); vx.translate(ox, oy); vx.beginPath(); vx.rect(0, 0, cw, ch); vx.clip(); v[2](vx, cw, ch);
      if (img) {
        if (vn === 'blur') { vx.globalAlpha = 0.16; for (let d = -3; d <= 3; d++) vx.drawImage(img, (cw - sz) / 2, (ch - sz) / 2 + d * ch * 0.06, sz, sz); vx.globalAlpha = 1; }
        else vx.drawImage(img, (cw - sz) / 2, (ch - sz) / 2, sz, sz);
      }
      vx.restore();
    });
  });
  return { canvas: c, blur: bc, feat: variants.feat ? variants.feat[0] : null, uv: k => uv[k], cw, ch, cols, rows, sym: k => syms[k],
    drawSym: function (ctx, k, x0, y0, w, h) { const s = syms[k]; if (s) ctx.drawImage(s, x0, y0, w, h); } };
}

// ── Material textures ─────────────────────────────────────────────────────
export function woodCanvas(size, pal, seed) {
  const [c, x] = cv(size, size), n1 = noise2(8, seed || 7), n2 = noise2(32, (seed || 7) * 3), img = x.createImageData(size, size), d = img.data;
  const A = pal[0], B = pal[1], C = pal[2];
  for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
    const u = i / size, v = j / size;
    const warp = n1(u * 8, v * 8) * 0.5 + n2(u * 32, v * 32) * 0.08;
    const ring = Math.sin((u * 13 + warp * 1.2 + v * 0.25) * Math.PI * 2);
    let t = 0.5 + 0.5 * ring; t = Math.pow(t, 1.3) * (0.55 + 0.45 * n2(u * 32, v * 32 * 3));
    const fine = n2(u * 32 * 4, v * 32) * 0.22 - 0.11;
    const k = Math.min(1, Math.max(0, t + fine)), o = (j * size + i) * 4;
    const dark = Math.pow(n2(u * 32, v * 32 * 6), 6) * 0.5;   // pores
    d[o] = (A[0] * (1 - k) + B[0] * k) * (1 - dark) + C[0] * dark * 0.2;
    d[o + 1] = (A[1] * (1 - k) + B[1] * k) * (1 - dark) + C[1] * dark * 0.2;
    d[o + 2] = (A[2] * (1 - k) + B[2] * k) * (1 - dark) + C[2] * dark * 0.2;
    d[o + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  return c;
}
export function brushedCanvas(size, base, seed) {
  const [c, x] = cv(size, size), r = seeded(seed || 11);
  x.fillStyle = base; x.fillRect(0, 0, size, size);
  for (let i = 0; i < size * 6; i++) { const y = r() * size, a = (r() - 0.5) * 0.22; x.fillStyle = a > 0 ? 'rgba(255,255,255,' + a + ')' : 'rgba(0,0,0,' + (-a) + ')'; x.fillRect(0, y, size, 1); }
  return c;
}
export function paperCanvas(size, seed) {
  const [c, x] = cv(size, size), r = seeded(seed || 5);
  x.fillStyle = lg(x, 0, 0, 0, size, [[0, '#fbf3dc'], [1, '#eadcb4']]); x.fillRect(0, 0, size, size);
  for (let i = 0; i < size * 40; i++) { x.fillStyle = r() < 0.5 ? 'rgba(120,80,20,.06)' : 'rgba(255,255,255,.12)'; x.fillRect(r() * size, r() * size, 1.5, 1.5); }
  return c;
}
export function glowCanvas(size) {
  const [c, x] = cv(size, size), h = size / 2;
  x.fillStyle = rg(x, h, h, 0, h, [[0, 'rgba(255,255,255,1)'], [0.12, 'rgba(255,255,255,.85)'], [0.35, 'rgba(255,255,255,.22)'], [1, 'rgba(255,255,255,0)']]); x.fillRect(0, 0, size, size);
  return c;
}
export function speckleCanvas(size, base, seed, amt) {
  const [c, x] = cv(size, size), r = seeded(seed || 3);
  x.fillStyle = base; x.fillRect(0, 0, size, size);
  for (let i = 0; i < size * (amt || 20); i++) { x.fillStyle = r() < 0.5 ? 'rgba(0,0,0,.08)' : 'rgba(255,255,255,.06)'; x.fillRect(r() * size, r() * size, 2, 2); }
  return c;
}

// ── Printed glass and signs ───────────────────────────────────────────────
const GOLD = [[0, '#fff7d6'], [0.45, '#ffd45a'], [0.52, '#c4860f'], [1, '#ffe28f']];
function goldText(x, t, cx, cy, size, font, sp, shadow) {
  x.font = font.replace('{s}', size); x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round';
  if (shadow) { x.fillStyle = shadow; spaced(x, t, cx, cy + size * 0.06, sp, 'fill'); }
  x.fillStyle = lg(x, 0, cy - size * 0.5, 0, cy + size * 0.5, GOLD);
  spaced(x, t, cx, cy, sp, 'fill');
}
// Diamond Sevens: the top glass, a printed card behind glass with the pay table
export function paintTopGlass(ctx, W, H, o) {
  const x = ctx;
  x.clearRect(0, 0, W, H);
  // marquee band: deep red enamel, title in gold script, "SEVENS" in gold block letters
  const mh = H * 0.3;
  x.fillStyle = rg(x, W / 2, 0, 10, W * 0.8, [[0, '#e8283a'], [0.55, '#a50f1d'], [1, '#5c0610']]); x.fillRect(0, 0, W, mh);
  x.fillStyle = lg(x, 0, 0, 0, mh, [[0, 'rgba(255,255,255,.18)'], [0.3, 'rgba(255,255,255,0)'], [1, 'rgba(0,0,0,.25)']]); x.fillRect(0, 0, W, mh);
  x.font = '400 ' + (mh * 0.46) + 'px "Great Vibes",cursive'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillStyle = 'rgba(60,0,8,.7)'; x.fillText('Diamond', W / 2 + 3, mh * 0.36 + 4);
  x.fillStyle = '#ffe9a0'; x.shadowColor = 'rgba(255,220,120,.6)'; x.shadowBlur = 14; x.fillText('Diamond', W / 2, mh * 0.36); x.shadowBlur = 0;
  goldText(x, 'SEVENS', W / 2, mh * 0.76, mh * 0.26, '400 {s}px Bungee,Impact,sans-serif', mh * 0.05, 'rgba(0,0,0,.6)');
  // the card
  const pad = W * 0.03, cy = mh + pad * 0.6, chh = H - cy - pad * 0.6;
  x.save(); rr(x, pad, cy, W - pad * 2, chh, 10); x.clip();
  x.drawImage(o.paper, pad, cy, W - pad * 2, chh);
  x.fillStyle = lg(x, 0, cy, W, cy + chh, [[0, 'rgba(255,255,255,.25)'], [0.3, 'rgba(255,255,255,0)'], [0.7, 'rgba(255,255,255,0)'], [1, 'rgba(255,255,255,.12)']]); x.fillRect(pad, cy, W - pad * 2, chh);
  x.restore();
  x.strokeStyle = '#b88a2a'; x.lineWidth = 3; rr(x, pad + 4, cy + 4, W - pad * 2 - 8, chh - 8, 8); x.stroke();
  x.lineWidth = 1.2; rr(x, pad + 9, cy + 9, W - pad * 2 - 18, chh - 18, 6); x.stroke();
  // pay rows in two columns
  const rows = o.rows, n = Math.ceil(rows.length / 2), rh = (chh - 48) / n, colW = (W - pad * 2 - 36) / 2, sy = Math.min(rh * 0.82, colW * 0.13);
  x.font = '800 ' + (rh * 0.56) + 'px ' + o.font; x.textBaseline = 'middle';
  rows.forEach(function (r, i) {
    const col = i < n ? 0 : 1, row = i < n ? i : i - n, rx = pad + 18 + col * (colW + 8), ry = cy + 16 + row * rh + rh / 2;
    if (o.hit === r[2]) { x.fillStyle = 'rgba(232,40,58,.26)'; rr(x, rx - 6, ry - rh / 2 + 1, colW + 4, rh - 2, 6); x.fill(); }
    let sx = rx; r[0].forEach(function (k) { o.atlas.drawSym(x, k, sx, ry - sy / 2, sy, sy); sx += sy * 0.98; });
    if (r[3]) { x.textAlign = 'left'; x.fillStyle = '#7a0a12'; x.font = '800 ' + (rh * 0.46) + 'px ' + o.font; x.fillText(r[3], sx + 4, ry); x.font = '800 ' + (rh * 0.56) + 'px ' + o.font; }
    if (r[1] != null) { x.textAlign = 'right'; x.fillStyle = '#7a0a12'; x.fillText(o.money(r[1] * o.bet), rx + colW - 10, ry); }
    else if (r[4]) { x.textAlign = 'left'; x.fillStyle = '#7a0a12'; x.font = '800 ' + (rh * 0.46) + 'px ' + o.font; x.fillText(r[4], sx + 4, ry); }
  });
  x.textAlign = 'center'; x.fillStyle = '#8a5a1a'; x.font = '800 ' + (rh * 0.42) + 'px ' + o.font;
  x.fillText(o.foot, W / 2, cy + chh - 20);
}
// Video cabinets: topper sign art with the title
export function paintTopper(mode, ctx, W, H, name, sub) {
  const x = ctx; x.clearRect(0, 0, W, H);
  if (mode === 'buffalo') {
    x.fillStyle = lg(x, 0, 0, 0, H, [[0, '#ffd76a'], [0.3, '#ff9a3c'], [0.62, '#e3402a'], [1, '#5e0f2c']]); x.fillRect(0, 0, W, H);
    x.fillStyle = rg(x, W / 2, H * 0.3, 4, W * 0.2, [[0, '#fff9d8'], [0.5, '#ffd257'], [1, 'rgba(255,176,46,0)']]); x.fillRect(0, 0, W, H);
    x.fillStyle = '#2e0f1c'; x.beginPath(); x.moveTo(0, H * 0.72); [[0, 0.72], [0.09, 0.72], [0.12, 0.5], [0.26, 0.5], [0.29, 0.72], [0.47, 0.72], [0.51, 0.4], [0.68, 0.4], [0.72, 0.72], [0.86, 0.72], [0.89, 0.56], [0.97, 0.56], [1, 0.72]].forEach(p => x.lineTo(p[0] * W, p[1] * H)); x.lineTo(W, H); x.lineTo(0, H); x.fill();
    x.font = '400 ' + H * 0.34 + 'px Bungee,Impact,sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round';
    x.strokeStyle = '#6a2a08'; x.lineWidth = H * 0.06; x.strokeText(name, W / 2, H * 0.5); x.fillStyle = '#5a1a06'; x.fillText(name, W / 2, H * 0.5 + H * 0.03);
    x.fillStyle = '#fff4cf'; x.shadowColor = 'rgba(255,200,90,.7)'; x.shadowBlur = 16; x.fillText(name, W / 2, H * 0.5); x.shadowBlur = 0;
    x.font = '900 ' + H * 0.1 + 'px ' + SANS; x.fillStyle = '#ffe7b0'; spaced(x, sub.toUpperCase(), W / 2, H * 0.84, H * 0.03, 'fill');
  } else if (mode === 'cleo') {
    x.fillStyle = lg(x, 0, 0, 0, H, [[0, '#0b1d55'], [1, '#173a96']]); x.fillRect(0, 0, W, H);
    for (let i = 0; i < W; i += 18) { x.fillStyle = 'rgba(255,215,106,.07)'; x.fillRect(i, 0, 2, H); }
    x.fillStyle = lg(x, 0, 0, W, H, [[0, 'rgba(255,233,160,.35)'], [0.6, 'rgba(196,144,15,.25)'], [1, 'rgba(138,93,0,.3)']]); x.beginPath(); x.moveTo(W / 2, 0); x.lineTo(W * 0.78, H); x.lineTo(W * 0.22, H); x.fill();
    goldText(x, name, W / 2, H * 0.46, H * 0.36, '700 {s}px Cinzel,Georgia,serif', H * 0.02, 'rgba(0,0,0,.6)');
    x.font = '900 ' + H * 0.1 + 'px ' + SANS; x.fillStyle = '#ffd76a'; spaced(x, sub.toUpperCase(), W / 2, H * 0.82, H * 0.03, 'fill');
  } else {
    x.fillStyle = lg(x, 0, 0, 0, H, [[0, '#1a0202'], [1, '#3a0505']]); x.fillRect(0, 0, W, H);
    x.strokeStyle = 'rgba(201,151,31,.55)'; x.lineWidth = 2; for (let g = 8; g < W; g += 40) x.strokeRect(g, 8, 28, H - 16);
    x.fillStyle = rg(x, W / 2, H / 2, 4, W * 0.5, [[0, 'rgba(255,60,40,.45)'], [1, 'rgba(255,60,40,0)']]); x.fillRect(0, 0, W, H);
    goldText(x, name, W / 2, H * 0.46, H * 0.34, '400 {s}px Bungee,Impact,sans-serif', H * 0.02, 'rgba(0,0,0,.7)');
    x.font = '900 ' + H * 0.1 + 'px ' + SANS; x.fillStyle = '#ffd45a'; spaced(x, sub.toUpperCase(), W / 2, H * 0.82, H * 0.03, 'fill');
  }
  x.fillStyle = lg(x, 0, 0, 0, H, [[0, 'rgba(255,255,255,.16)'], [0.25, 'rgba(255,255,255,0)'], [1, 'rgba(0,0,0,.25)']]); x.fillRect(0, 0, W, H);
}
const SANS = 'ui-rounded,"SF Pro Rounded",Nunito,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif';
export function paintBelly(mode, ctx, W, H, name, atlas, keys) {
  const x = ctx; x.clearRect(0, 0, W, H);
  const pal = { buffalo: ['#3b1d0b', '#1f0e05', '#ffd77a'], cleo: ['#173a96', '#081640', '#ffe28f'], dragon: ['#5a0808', '#240202', '#ffe9a0'] }[mode];
  x.fillStyle = lg(x, 0, 0, 0, H, [[0, pal[0]], [1, pal[1]]]); x.fillRect(0, 0, W, H);
  x.fillStyle = rg(x, W / 2, H * 0.4, 4, W * 0.5, [[0, 'rgba(255,255,255,.1)'], [1, 'rgba(255,255,255,0)']]); x.fillRect(0, 0, W, H);
  const s = H * 0.5; let sx = W / 2 - (keys.length * s * 0.9) / 2;
  keys.forEach(function (k) { atlas.drawSym(x, k, sx, H * 0.1, s, s); sx += s * 0.9; });
  x.font = (mode === 'cleo' ? '700 ' + H * 0.17 + 'px Cinzel,Georgia,serif' : '400 ' + H * 0.17 + 'px Bungee,Impact,sans-serif'); x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillStyle = pal[2]; x.globalAlpha = 0.85; spaced(x, name.toUpperCase(), W / 2, H * 0.8, H * 0.04, 'fill'); x.globalAlpha = 1;
}
// the screen behind the reels, and its feature mood
export function paintScreenBg(mode, ctx, W, H, feat) {
  const x = ctx;
  if (mode === 'buffalo') {
    x.fillStyle = feat ? lg(x, 0, 0, 0, H, [[0, '#5a1406'], [0.6, '#2a0704'], [1, '#3a0c05']]) : lg(x, 0, 0, 0, H, [[0, '#3b1d0b'], [0.6, '#1f0e05'], [1, '#2a1407']]); x.fillRect(0, 0, W, H);
    x.fillStyle = rg(x, W / 2, 0, 4, W * 0.7, [[0, feat ? 'rgba(255,80,40,.45)' : 'rgba(255,140,40,.25)'], [1, 'rgba(0,0,0,0)']]); x.fillRect(0, 0, W, H);
  } else if (mode === 'cleo') {
    x.fillStyle = feat ? lg(x, 0, 0, 0, H, [[0, '#3a2a6a'], [0.6, '#14103a'], [1, '#0b0a24']]) : lg(x, 0, 0, 0, H, [[0, '#173a96'], [0.6, '#0b1d55'], [1, '#081640']]); x.fillRect(0, 0, W, H);
    for (let i = 0; i < W; i += 18) { x.fillStyle = 'rgba(255,215,106,.07)'; x.fillRect(i, 0, 2, H); }
    if (feat) { x.fillStyle = rg(x, W / 2, 0, 4, W * 0.6, [[0, 'rgba(255,215,106,.35)'], [1, 'rgba(0,0,0,0)']]); x.fillRect(0, 0, W, H); }
  } else {
    x.fillStyle = lg(x, 0, 0, 0, H, [[0, '#5a0808'], [0.55, '#260303'], [1, '#3a0505']]); x.fillRect(0, 0, W, H);
    x.fillStyle = rg(x, W / 2, 0, 4, W * 0.65, [[0, 'rgba(255,60,40,.3)'], [1, 'rgba(0,0,0,0)']]); x.fillRect(0, 0, W, H);
  }
}
// LED / VFD displays
export function paintMsg(ctx, W, H, text, good, col) {
  const x = ctx; x.clearRect(0, 0, W, H);
  x.fillStyle = lg(x, 0, 0, 0, H, [[0, '#07060b'], [1, '#111018']]); x.fillRect(0, 0, W, H);
  x.fillStyle = lg(x, 0, 0, 0, H * 0.5, [[0, 'rgba(255,255,255,.07)'], [1, 'rgba(255,255,255,0)']]); x.fillRect(0, 0, W, H * 0.5);
  x.font = '700 ' + (H * 0.5) + 'px ui-monospace,"SF Mono",Menlo,monospace'; x.textAlign = 'center'; x.textBaseline = 'middle';
  const t = String(text || '').toUpperCase(); let w = x.measureText(t).width + t.length * H * 0.08;
  x.save(); if (w > W * 0.94) { x.translate(W / 2, 0); x.scale(W * 0.94 / w, 1); x.translate(-W / 2, 0); }
  x.fillStyle = good ? '#fff2a8' : col; x.shadowColor = good ? '#ffd45a' : col; x.shadowBlur = H * 0.25; spaced(x, t, W / 2, H * 0.53, H * 0.08, 'fill');
  x.shadowBlur = 0; x.restore();
}
export function paintMeters(ctx, W, H, v, cols, labels) {
  const x = ctx; x.clearRect(0, 0, W, H);
  x.fillStyle = '#0b0a0e'; x.fillRect(0, 0, W, H);
  const n = 3, gap = W * 0.02, mw = (W - gap * 2) / n;
  ['CREDIT', 'BET', 'WIN'].forEach(function (lab, i) {
    const mx = i * (mw + gap);
    x.fillStyle = lg(x, 0, 0, 0, H, [[0, '#07060b'], [1, '#121019']]); rr(x, mx, 0, mw, H, H * 0.12); x.fill();
    x.fillStyle = 'rgba(255,255,255,.06)'; rr(x, mx, 0, mw, H * 0.5, H * 0.12); x.fill();
    x.font = '900 ' + (H * 0.16) + 'px ' + SANS; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = 'rgba(255,255,255,.5)';
    spaced(x, lab, mx + mw / 2, H * 0.2, H * 0.03, 'fill');
    const val = [v.credit, v.bet, v.win][i], col = i === 2 ? cols[1] : cols[0];
    x.font = '700 ' + (H * 0.42) + 'px ui-monospace,"SF Mono",Menlo,monospace';
    let tw = x.measureText(val).width; x.save(); if (tw > mw * 0.9) { x.translate(mx + mw / 2, 0); x.scale(mw * 0.9 / tw, 1); x.translate(-(mx + mw / 2), 0); }
    x.fillStyle = col; x.shadowColor = col; x.shadowBlur = H * 0.18; x.fillText(val, mx + mw / 2, H * 0.62); x.shadowBlur = 0; x.restore();
  });
}
// the band above the reels on the video screens: machine line, jackpots, or the feature meter
export function paintHud(mode, ctx, W, H, st) {
  const x = ctx; x.clearRect(0, 0, W, H);
  if (st.feat) {
    x.fillStyle = lg(x, 0, 0, W, 0, [[0, 'rgba(0,0,0,0)'], [0.5, 'rgba(0,0,0,.55)'], [1, 'rgba(0,0,0,0)']]); x.fillRect(0, 0, W, H);
    x.textBaseline = 'middle'; x.textAlign = 'center';
    const parts = st.feat.kind === 'fs' ? [['Free game', st.feat.a], ['Won', st.feat.b]] : [['Respins', null], ['Fireballs', st.feat.b]];
    let cx = W * 0.26;
    parts.forEach(function (p, i) {
      x.font = '900 ' + H * 0.3 + 'px ' + SANS; x.fillStyle = '#fff7d6'; x.textAlign = 'right'; x.fillText(p[0].toUpperCase(), cx, H / 2);
      if (p[1] != null) { x.font = '400 ' + H * 0.42 + 'px Bungee,Impact,sans-serif'; x.fillStyle = '#ffe27a'; x.textAlign = 'left'; x.fillText(p[1], cx + H * 0.2, H / 2); }
      else { for (let k = 0; k < 3; k++) { const on = k < st.feat.a, lx = cx + H * 0.35 + k * H * 0.42; x.fillStyle = on ? rg(x, lx, H / 2, 1, H * 0.16, [[0, '#fffbe0'], [0.5, '#ffcf4a'], [1, '#c26a00']]) : '#3a0a0a'; x.beginPath(); x.arc(lx, H / 2, H * 0.16, 0, 7); x.fill(); if (on) { x.shadowColor = '#ffb52e'; x.shadowBlur = 12; x.fill(); x.shadowBlur = 0; } x.strokeStyle = 'rgba(255,200,80,.5)'; x.lineWidth = 2; x.stroke(); } }
      cx = W * 0.72;
    });
    return;
  }
  if (mode === 'dragon' && st.jp) {
    const names = ['GRAND', 'MAJOR', 'MINOR', 'MINI'], cols = { GRAND: ['#ffe27a', '#b8860b', '#3a1800'], MAJOR: ['#e2342a', '#7a0a0a', '#fff'], MINOR: ['#8a4ad8', '#3a1470', '#fff'], MINI: ['#1fae6a', '#0b5a32', '#fff'] };
    const gap = W * 0.012, ws = [1.25, 1, 1, 1], tot = ws.reduce((a, b) => a + b), unit = (W - gap * 5) / tot; let px = gap;
    names.forEach(function (k, i) {
      const w = unit * ws[i], c = cols[k];
      x.fillStyle = lg(x, 0, 2, 0, H - 2, [[0, c[0]], [1, c[1]]]); rr(x, px, H * 0.08, w, H * 0.84, H * 0.16); x.fill();
      x.strokeStyle = 'rgba(255,230,150,.6)'; x.lineWidth = 2; x.stroke();
      if (st.flash === k) { x.fillStyle = 'rgba(255,255,255,.55)'; x.fill(); }
      x.textAlign = 'center'; x.textBaseline = 'middle';
      x.font = '400 ' + H * 0.22 + 'px Bungee,Impact,sans-serif'; x.fillStyle = c[2]; x.globalAlpha = 0.9; x.fillText(k, px + w / 2, H * 0.32); x.globalAlpha = 1;
      x.font = '800 ' + H * 0.3 + 'px ui-monospace,"SF Mono",Menlo,monospace'; x.fillStyle = c[2]; x.fillText(st.jp[k], px + w / 2, H * 0.68);
      px += w + gap;
    });
    return;
  }
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = '900 ' + H * 0.34 + 'px ' + SANS; x.fillStyle = st.col || '#ffe7b0'; x.globalAlpha = 0.9;
  spaced(x, (st.text || '').toUpperCase(), W / 2, H / 2, H * 0.06, 'fill'); x.globalAlpha = 1;
}
// the button deck surface: brushed dark panel with printed labels and the two small readouts
export function paintDeck(mode, ctx, W, H, o) {
  const x = ctx; x.clearRect(0, 0, W, H);
  const pal = { classic: ['#3a3f46', '#1c1f24'], buffalo: ['#4a2c14', '#1c0e05'], cleo: ['#1a3070', '#0a1540'], dragon: ['#4a0a0a', '#1a0202'] }[mode];
  x.fillStyle = lg(x, 0, 0, 0, H, [[0, pal[0]], [1, pal[1]]]); x.fillRect(0, 0, W, H);
  for (let i = 0; i < W; i += 3) { x.fillStyle = 'rgba(255,255,255,' + (i % 6 ? 0.025 : 0.05) + ')'; x.fillRect(i, 0, 1, H); }
  x.fillStyle = lg(x, 0, 0, 0, H * 0.3, [[0, 'rgba(255,255,255,.14)'], [1, 'rgba(255,255,255,0)']]); x.fillRect(0, 0, W, H * 0.3);
  x.textAlign = 'center'; x.textBaseline = 'middle';
  o.readouts.forEach(function (r) {
    // a small LCD readout with its printed label just under it
    x.fillStyle = '#0a0c10'; rr(x, (r.x - r.w / 2) * W, (r.y - 0.12) * H, r.w * W, 0.22 * H, H * 0.04); x.fill();
    x.strokeStyle = 'rgba(255,255,255,.14)'; x.lineWidth = 2; x.stroke();
    x.font = '800 ' + H * 0.15 + 'px ui-monospace,"SF Mono",Menlo,monospace'; x.fillStyle = '#9ff2c3'; x.shadowColor = '#9ff2c3'; x.shadowBlur = 8; x.fillText(r.value, r.x * W, (r.y - 0.01) * H); x.shadowBlur = 0;
    x.font = '900 ' + H * 0.05 + 'px ' + SANS; x.fillStyle = 'rgba(255,255,255,.6)'; spaced(x, r.label.toUpperCase(), r.x * W, (r.y + 0.165) * H, H * 0.006, 'fill');
  });
  (o.marks || []).forEach(function (m) { x.font = '900 ' + H * 0.1 + 'px ' + SANS; x.fillStyle = 'rgba(255,255,255,.5)'; spaced(x, m.t.toUpperCase(), m.x * W, m.y * H, H * 0.02, 'fill'); });
}
// a lit button cap
export function paintCap(ctx, W, H, o) {
  const x = ctx; x.clearRect(0, 0, W, H);
  x.fillStyle = rg(x, W * 0.5, H * 0.35, 2, W * 0.75, [[0, o.hi], [0.5, o.col], [1, o.lo]]); x.fillRect(0, 0, W, H);
  if (o.off) { x.fillStyle = 'rgba(0,0,0,.45)'; x.fillRect(0, 0, W, H); }
  x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round';
  const main = o.sub ? H * 0.36 : H * (o.text.length > 3 ? 0.32 : 0.5);
  x.font = (o.font || '400 {s}px "Lilita One",' + SANS).replace('{s}', main);
  let tw = x.measureText(o.text).width; x.save(); if (tw > W * 0.86) { x.translate(W / 2, 0); x.scale(W * 0.86 / tw, 1); x.translate(-W / 2, 0); }
  const ty = o.sub ? H * 0.4 : H * 0.5;
  x.strokeStyle = 'rgba(0,0,0,.35)'; x.lineWidth = main * 0.14; x.strokeText(o.text, W / 2, ty + main * 0.04);
  x.fillStyle = o.ink; x.fillText(o.text, W / 2, ty); x.restore();
  if (o.sub) { x.font = '900 ' + H * 0.2 + 'px ' + SANS; x.fillStyle = o.ink; x.globalAlpha = 0.9; const sw = x.measureText(o.sub).width; x.save(); if (sw > W * 0.8) { x.translate(W / 2, 0); x.scale(W * 0.8 / sw, 1); x.translate(-W / 2, 0); } x.fillText(o.sub, W / 2, H * 0.72); x.restore(); x.globalAlpha = 1; }
  x.fillStyle = lg(x, 0, 0, 0, H, [[0, 'rgba(255,255,255,.45)'], [0.35, 'rgba(255,255,255,.05)'], [0.5, 'rgba(255,255,255,0)'], [1, 'rgba(0,0,0,.15)']]); x.fillRect(0, 0, W, H);
}
export function paintTab(ctx, S, n, col, on) {
  const x = ctx; x.clearRect(0, 0, S, S);
  x.fillStyle = on ? rg(x, S * 0.38, S * 0.32, 1, S * 0.5, [[0, '#fff'], [0.45, col], [1, '#000']]) : '#1a1a20'; x.beginPath(); x.arc(S / 2, S / 2, S / 2 - 1, 0, 7); x.fill();
  x.font = '900 ' + S * 0.5 + 'px ' + SANS; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = on ? '#1a1033' : 'rgba(255,255,255,.4)'; x.fillText(String(n), S / 2, S * 0.54);
}
