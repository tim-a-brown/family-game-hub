// ═══════════════════════════════════════════════════════════════════════════
// Score display: classic orange dot-matrix (DMD, 128x32 style at 160x32) or a
// modern full-colour LCD. Scenes draw on a small canvas: for the DMD in
// white/grey (quantised to 4 orange levels, then shown under a round-dot
// mask); for the LCD in colour (shown smooth with a fine pixel grid).
// ═══════════════════════════════════════════════════════════════════════════
const TAU = Math.PI * 2;
const F5 = {
  '0': [14, 17, 19, 21, 25, 17, 14], '1': [4, 12, 4, 4, 4, 4, 14], '2': [14, 17, 1, 2, 4, 8, 31], '3': [31, 2, 4, 2, 1, 17, 14],
  '4': [2, 6, 10, 18, 31, 2, 2], '5': [31, 16, 30, 1, 1, 17, 14], '6': [6, 8, 16, 30, 17, 17, 14], '7': [31, 1, 2, 4, 8, 8, 8],
  '8': [14, 17, 17, 14, 17, 17, 14], '9': [14, 17, 17, 15, 1, 2, 12],
  A: [14, 17, 17, 31, 17, 17, 17], B: [30, 17, 17, 30, 17, 17, 30], C: [14, 17, 16, 16, 16, 17, 14], D: [28, 18, 17, 17, 17, 18, 28],
  E: [31, 16, 16, 30, 16, 16, 31], F: [31, 16, 16, 30, 16, 16, 16], G: [14, 17, 16, 23, 17, 17, 15], H: [17, 17, 17, 31, 17, 17, 17],
  I: [14, 4, 4, 4, 4, 4, 14], J: [7, 2, 2, 2, 2, 18, 12], K: [17, 18, 20, 24, 20, 18, 17], L: [16, 16, 16, 16, 16, 16, 31],
  M: [17, 27, 21, 21, 17, 17, 17], N: [17, 17, 25, 21, 19, 17, 17], O: [14, 17, 17, 17, 17, 17, 14], P: [30, 17, 17, 30, 16, 16, 16],
  Q: [14, 17, 17, 17, 21, 18, 13], R: [30, 17, 17, 30, 20, 18, 17], S: [15, 16, 16, 14, 1, 1, 30], T: [31, 4, 4, 4, 4, 4, 4],
  U: [17, 17, 17, 17, 17, 17, 14], V: [17, 17, 17, 17, 17, 10, 4], W: [17, 17, 17, 21, 21, 21, 10], X: [17, 17, 10, 4, 10, 17, 17],
  Y: [17, 17, 17, 10, 4, 4, 4], Z: [31, 1, 2, 4, 8, 16, 31],
  '.': [0, 0, 0, 0, 0, 0, 4], ',': [0, 0, 0, 0, 0, 4, 8], '!': [4, 4, 4, 4, 4, 0, 4], '?': [14, 17, 1, 2, 4, 0, 4],
  '-': [0, 0, 0, 31, 0, 0, 0], ':': [0, 0, 4, 0, 0, 4, 0], "'": [4, 4, 8, 0, 0, 0, 0], '+': [0, 4, 4, 31, 4, 4, 0], '/': [1, 1, 2, 4, 8, 16, 16],
  x: [0, 0, 17, 10, 4, 10, 17], '<': [2, 4, 8, 16, 8, 4, 2], '>': [8, 4, 2, 1, 2, 4, 8], '=': [0, 0, 31, 0, 31, 0, 0], '%': [24, 25, 2, 4, 8, 19, 3], '&': [12, 18, 20, 8, 21, 18, 13]
};
const F5W = {};
Object.keys(F5).forEach(c => {
  if (/[A-Z0-9x%&]/.test(c)) { F5W[c] = [0, 5]; return; }
  let lo = 5, hi = -1; F5[c].forEach(r => { for (let b = 0; b < 5; b++) if (r & (16 >> b)) { lo = Math.min(lo, b); hi = Math.max(hi, b); } });
  F5W[c] = hi < 0 ? [0, 3] : [lo, hi - lo + 1];
});
export function smallW(s) { let w = 0; for (const ch of String(s)) { const m = F5W[ch] || F5W[ch.toUpperCase()] || [0, 3]; w += m[1] + 1; } return Math.max(0, w - 1); }
export function smallText(g, s, x, y, align) {
  s = String(s); const w = smallW(s);
  if (align === 'center') x = Math.round(x - w / 2); else if (align === 'right') x = x - w;
  for (let ch of s) {
    if (!F5[ch]) ch = ch.toUpperCase();
    const gl = F5[ch], m = F5W[ch] || [0, 3];
    if (gl) for (let r = 0; r < 7; r++) { const row = gl[r]; if (!row) continue; for (let b = m[0]; b < m[0] + m[1]; b++) if (row & (16 >> b)) g.fillRect(x + b - m[0], y + r, 1, 1); }
    x += m[1] + 1;
  }
  return w;
}
const FONT = '"Arial Narrow","Helvetica Neue",Arial,sans-serif';
export function bigText(g, s, x, y, size, align, maxW, font) {
  g.font = '900 ' + size + 'px ' + (font || FONT); g.textBaseline = 'middle'; g.textAlign = align || 'center';
  const w = g.measureText(s).width, mw = maxW || g.canvas.width - 4;
  if (w > mw) { g.save(); g.translate(x, y); g.scale(mw / w, 1); g.fillText(s, 0, 0); g.restore(); } else g.fillText(s, x, y);
}

export class Display {
  constructor(el, o = {}) {
    this.el = el; this.type = o.type || 'dmd'; this.color = o.color || '#ff8a1e';
    this.W = this.type === 'lcd' ? 192 : 160; this.H = this.type === 'lcd' ? 48 : 32;
    this.c = document.createElement('canvas'); this.c.width = this.W; this.c.height = this.H;
    this.g = this.c.getContext('2d', { willReadFrequently: this.type === 'dmd' });
    this.o = document.createElement('canvas'); this.o.width = this.W; this.o.height = this.H; this.og = this.o.getContext('2d');
    this.img = this.og.createImageData(this.W, this.H);
    const c = hex(this.color);
    this.levels = [[c[0] * 0.13, c[1] * 0.08, c[2] * 0.06], [c[0] * 0.45, c[1] * 0.32, c[2] * 0.3], [c[0] * 0.77, c[1] * 0.62, c[2] * 0.55], c].map(a => a.map(v => Math.round(v)));
    this.ctx = el.getContext('2d'); this.mask = null; this.maskKey = '';
  }
  // draw a scene: fn(g, W, H). Then present it on the visible canvas.
  render(fn) {
    const g = this.g; g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.fillStyle = '#000'; g.fillRect(0, 0, this.W, this.H);
    g.fillStyle = '#fff'; g.strokeStyle = '#fff';
    fn(g, this.W, this.H, this);
    const out = this.el, x = this.ctx, W = out.width, H = out.height;
    if (!W || !H) return;
    if (this.type === 'dmd') {
      const src = g.getImageData(0, 0, this.W, this.H).data, d = this.img.data, L = this.levels;
      const prev = this.prev || (this.prev = new Uint8Array(this.W * this.H).fill(255)); let changed = false;
      for (let i = 0, n = this.W * this.H; i < n; i++) {
        const v = Math.max(src[i * 4], src[i * 4 + 1], src[i * 4 + 2]), lv = v > 185 ? 3 : v > 105 ? 2 : v > 38 ? 1 : 0;
        if (prev[i] === lv) continue;
        prev[i] = lv; changed = true;
        const col = L[lv], j = i * 4; d[j] = col[0]; d[j + 1] = col[1]; d[j + 2] = col[2]; d[j + 3] = 255;
      }
      // same dots as last time on a canvas of the same size: nothing to present
      const key = W + 'x' + H;
      if (!changed && this.shownKey === key) return;
      this.shownKey = key;
      this.og.putImageData(this.img, 0, 0);
      x.imageSmoothingEnabled = false; x.drawImage(this.o, 0, 0, W, H); x.imageSmoothingEnabled = true;
      x.drawImage(this.dotMask(W, H), 0, 0);
    } else {
      x.imageSmoothingEnabled = true; x.fillStyle = '#000'; x.fillRect(0, 0, W, H); x.drawImage(this.c, 0, 0, W, H);
      x.drawImage(this.dotMask(W, H), 0, 0);
    }
  }
  dotMask(w, h) {
    const key = w + 'x' + h; if (this.maskKey === key) return this.mask;
    const m = document.createElement('canvas'); m.width = w; m.height = h;
    const g = m.getContext('2d'), p = w / this.W;
    if (this.type === 'dmd') {
      g.fillStyle = '#060302'; g.fillRect(0, 0, w, h);
      g.globalCompositeOperation = 'destination-out'; g.fillStyle = '#000';
      for (let y = 0; y < this.H; y++) for (let xx = 0; xx < this.W; xx++) { g.beginPath(); g.arc((xx + 0.5) * p, (y + 0.5) * p, p * 0.41, 0, TAU); g.fill(); }
      g.globalCompositeOperation = 'source-over';
    } else {
      g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = Math.max(1, p * 0.18);
      for (let y = 0; y <= this.H; y++) { g.beginPath(); g.moveTo(0, y * p); g.lineTo(w, y * p); g.stroke(); }
      for (let xx = 0; xx <= this.W; xx++) { g.beginPath(); g.moveTo(xx * p, 0); g.lineTo(xx * p, h); g.stroke(); }
    }
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(255,255,255,.06)'); gr.addColorStop(0.5, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    this.mask = m; this.maskKey = key; return m;
  }
}
function hex(h) { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }
