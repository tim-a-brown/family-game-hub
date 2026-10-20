// Where you're playing, in 3D (three.js r160): every stop on the circuit has its own room, built from simple
// shapes, painted textures and real light (warm lamps, neon, chandeliers, windows onto the city at night), rendered
// once and kept as a picture. poker.html puts it behind the table (softly out of focus) and at the top of a stop's
// info sheet. Loaded on demand:
//   window.VenueScene.render(key) -> Promise<dataURL | null>   (key: one of SCENES, e.g. 'kitchen', 'paris')
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const W = 1280, H = 720;
let seed = 1;
const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const pick = a => a[Math.floor(rnd() * a.length)];

// ── Painted textures ─────────────────────────────────────────────────────────────────────────────────────
function canvas(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); return c; }
function tex(c, rx, ry) {
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  if (rx) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry || rx); }
  return t;
}
function noise(x, w, h, a, n) { for (let i = 0; i < (n || w * h / 40); i++) { x.fillStyle = 'rgba(' + (rnd() < 0.5 ? '0,0,0' : '255,255,255') + ',' + rnd() * a + ')'; x.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 2, 1 + rnd() * 2); } }
const PAINT = {
  plain: (col) => canvas(64, 64, (x, w, h) => { x.fillStyle = col; x.fillRect(0, 0, w, h); noise(x, w, h, 0.05); }),
  stripe: (a, b) => canvas(128, 128, (x, w, h) => { x.fillStyle = a; x.fillRect(0, 0, w, h); x.fillStyle = b; for (let i = 0; i < w; i += 32) x.fillRect(i, 0, 12, h); noise(x, w, h, 0.05); }),
  damask: (a, b) => canvas(128, 128, (x, w, h) => {
    x.fillStyle = a; x.fillRect(0, 0, w, h); x.fillStyle = b;
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { const cx = 32 + i * 64, cy = 32 + j * 64; x.beginPath(); x.ellipse(cx, cy, 12, 22, 0, 0, 7); x.fill(); x.beginPath(); x.ellipse(cx, cy, 22, 8, 0, 0, 7); x.fill(); }
    noise(x, w, h, 0.05);
  }),
  panel: (a, b) => canvas(256, 256, (x, w, h) => {
    const g = x.createLinearGradient(0, 0, w, 0); g.addColorStop(0, a); g.addColorStop(0.5, b); g.addColorStop(1, a);
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    for (let i = 0; i < w; i += 64) { x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(i, 0, 3, h); x.fillStyle = 'rgba(255,255,255,.08)'; x.fillRect(i + 3, 0, 2, h); }
    for (let i = 0; i < 300; i++) { x.strokeStyle = 'rgba(0,0,0,' + rnd() * 0.12 + ')'; x.beginPath(); const xx = rnd() * w; x.moveTo(xx, 0); x.lineTo(xx + rnd() * 6 - 3, h); x.stroke(); }
  }),
  brick: (a, mortar) => canvas(256, 256, (x, w, h) => {
    x.fillStyle = mortar; x.fillRect(0, 0, w, h);
    const bw = 64, bh = 26;
    for (let r = 0; r * bh < h; r++) for (let c = -1; c * bw < w; c++) {
      const ox = (r % 2) * bw / 2, col = new THREE.Color(a).offsetHSL((rnd() - 0.5) * 0.03, 0, (rnd() - 0.5) * 0.12);
      x.fillStyle = '#' + col.getHexString(); x.fillRect(c * bw + ox + 2, r * bh + 2, bw - 4, bh - 4);
    }
    noise(x, w, h, 0.12);
  }),
  wood: (a, b, plank) => canvas(256, 256, (x, w, h) => {
    const ph = plank || 32;
    for (let y = 0; y < h; y += ph) {
      const col = new THREE.Color(a).lerp(new THREE.Color(b), rnd()); x.fillStyle = '#' + col.getHexString(); x.fillRect(0, y, w, ph);
      for (let i = 0; i < 14; i++) { x.strokeStyle = 'rgba(0,0,0,' + rnd() * 0.15 + ')'; x.beginPath(); const yy = y + rnd() * ph; x.moveTo(0, yy); x.bezierCurveTo(w * 0.3, yy + rnd() * 6 - 3, w * 0.6, yy + rnd() * 6 - 3, w, yy); x.stroke(); }
      x.fillStyle = 'rgba(0,0,0,.4)'; x.fillRect(0, y, w, 2);
      x.fillRect(Math.floor(rnd() * w), y, 2, ph);
    }
  }),
  carpet: (a, b, c) => canvas(256, 256, (x, w, h) => {
    x.fillStyle = a; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      const cx = 32 + i * 64, cy = 32 + j * 64;
      x.fillStyle = b; x.beginPath(); for (let k = 0; k < 8; k++) { const an = k / 8 * Math.PI * 2, r = k % 2 ? 10 : 26; x.lineTo(cx + Math.cos(an) * r, cy + Math.sin(an) * r); } x.fill();
      x.fillStyle = c; x.beginPath(); x.arc(cx, cy, 6, 0, 7); x.fill();
      x.strokeStyle = c; x.lineWidth = 2; x.beginPath(); x.arc(cx + 32, cy + 32, 14, 0, 7); x.stroke();
    }
    noise(x, w, h, 0.1, 6000);
  }),
  tile: (a, b, n) => canvas(256, 256, (x, w, h) => {
    const s = w / (n || 8);
    for (let i = 0; i < (n || 8); i++) for (let j = 0; j < (n || 8); j++) { x.fillStyle = (i + j) % 2 ? a : b; x.fillRect(i * s, j * s, s, s); }
    x.strokeStyle = 'rgba(0,0,0,.25)'; for (let i = 0; i <= w; i += s) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, h); x.stroke(); x.beginPath(); x.moveTo(0, i); x.lineTo(w, i); x.stroke(); }
    noise(x, w, h, 0.06);
  }),
  concrete: (a) => canvas(256, 256, (x, w, h) => { x.fillStyle = a; x.fillRect(0, 0, w, h); noise(x, w, h, 0.12, 9000); x.strokeStyle = 'rgba(0,0,0,.2)'; x.beginPath(); x.moveTo(0, 128); x.lineTo(w, 128); x.moveTo(128, 0); x.lineTo(128, h); x.stroke(); }),
  tin: (a) => canvas(128, 128, (x, w, h) => { x.fillStyle = a; x.fillRect(0, 0, w, h); for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { const cx = 32 + i * 64, cy = 32 + j * 64; x.strokeStyle = 'rgba(0,0,0,.25)'; x.lineWidth = 3; x.strokeRect(cx - 26, cy - 26, 52, 52); x.beginPath(); x.arc(cx, cy, 14, 0, 7); x.stroke(); } }),
  acoustic: () => canvas(128, 128, (x, w, h) => { x.fillStyle = '#d8d6cf'; x.fillRect(0, 0, w, h); noise(x, w, h, 0.15, 3000); x.fillStyle = '#9a978e'; x.fillRect(0, 0, w, 2); x.fillRect(0, 0, 2, h); })
};
// views through a window, painted
const VIEW = {
  // a city at night: towers of lit windows, maybe a landmark, a moon, reflections on water
  city: (o) => canvas(1024, 512, (x, w, h) => {
    const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, o.sky0 || '#060a1e'); g.addColorStop(0.7, o.sky1 || '#2a2050'); g.addColorStop(1, o.sky2 || '#ff8a4a');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 160; i++) { x.fillStyle = 'rgba(255,255,255,' + rnd() * 0.7 + ')'; x.fillRect(rnd() * w, rnd() * h * 0.5, 1.5, 1.5); }
    const base = o.water ? h * 0.72 : h * 0.92;
    for (let i = 0; i < (o.towers || 26); i++) {
      const bw = 26 + rnd() * 60, bh = (o.tall || 0.5) * h * (0.3 + rnd() * 0.9), bx = rnd() * w;
      x.fillStyle = o.tower || '#0c0f22'; x.fillRect(bx, base - bh, bw, bh);
      for (let yy = base - bh + 6; yy < base - 4; yy += 9) for (let xx = bx + 4; xx < bx + bw - 4; xx += 8) if (rnd() < 0.42) { x.fillStyle = pick(o.lights || ['#ffd98a', '#ffe9b8', '#fff3d6', '#9ad4ff']); x.fillRect(xx, yy, 4, 5); }
    }
    if (o.landmark) o.landmark(x, w, h, base);
    if (o.water) {
      const wg = x.createLinearGradient(0, base, 0, h); wg.addColorStop(0, o.waterTop || '#101a36'); wg.addColorStop(1, '#03050c'); x.fillStyle = wg; x.fillRect(0, base, w, h - base);
      for (let i = 0; i < 400; i++) { x.fillStyle = 'rgba(255,214,140,' + rnd() * 0.5 + ')'; x.fillRect(rnd() * w, base + rnd() * (h - base), 6 + rnd() * 18, 1.5); }
    }
    if (o.moon) { x.fillStyle = '#fff6dc'; x.shadowColor = '#fff6dc'; x.shadowBlur = 30; x.beginPath(); x.arc(w * 0.8, h * 0.18, 22, 0, 7); x.fill(); x.shadowBlur = 0; }
  }),
  ocean: (o) => canvas(1024, 512, (x, w, h) => {
    const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, o.sky0 || '#0a1030'); g.addColorStop(0.55, o.sky1 || '#3a2a60'); g.addColorStop(0.62, o.sky2 || '#ff9a5a'); g.addColorStop(0.63, '#0b1a35'); g.addColorStop(1, '#02060f');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 600; i++) { x.fillStyle = 'rgba(255,220,160,' + rnd() * 0.45 + ')'; x.fillRect(rnd() * w, h * 0.64 + rnd() * h * 0.36, 8 + rnd() * 24, 1.5); }
    if (o.pier) { x.fillStyle = '#1a1220'; x.fillRect(0, h * 0.6, w * 0.45, 10); for (let i = 0; i < 30; i++) { x.fillStyle = pick(['#ff5a8a', '#ffd84d', '#5ad8ff']); x.beginPath(); x.arc(i * w * 0.015, h * 0.6, 3, 0, 7); x.fill(); } x.strokeStyle = '#ff6ab0'; x.lineWidth = 3; x.beginPath(); x.arc(w * 0.3, h * 0.48, 60, 0, 7); x.stroke(); }
    if (o.palms) for (let i = 0; i < 5; i++) { const px = rnd() * w, py = h * 0.63; x.strokeStyle = '#05060c'; x.lineWidth = 6; x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + 20, py - 80, px + 10, py - 150); x.stroke(); x.fillStyle = '#05060c'; for (let k = 0; k < 7; k++) { x.save(); x.translate(px + 10, py - 150); x.rotate(k * 0.9); x.beginPath(); x.ellipse(40, 0, 44, 7, 0, 0, 7); x.fill(); x.restore(); } }
    if (o.yachts) for (let i = 0; i < 9; i++) { const yx = rnd() * w, yy = h * 0.66 + rnd() * 60; x.fillStyle = '#e8eef8'; x.fillRect(yx, yy, 70, 12); x.fillRect(yx + 14, yy - 10, 36, 10); x.fillStyle = '#ffd98a'; for (let k = 0; k < 6; k++) x.fillRect(yx + 6 + k * 10, yy + 4, 4, 3); }
  }),
  mountains: (o) => canvas(1024, 512, (x, w, h) => {
    const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, o.sky0 || '#0b1430'); g.addColorStop(1, o.sky1 || '#4a5a8a'); x.fillStyle = g; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 200; i++) { x.fillStyle = 'rgba(255,255,255,' + rnd() * 0.8 + ')'; x.fillRect(rnd() * w, rnd() * h * 0.5, 1.5, 1.5); }
    for (let layer = 0; layer < 3; layer++) {
      x.fillStyle = ['#3a4a72', '#26334f', '#151d30'][layer]; x.beginPath(); x.moveTo(0, h);
      for (let px = 0; px <= w; px += 40) x.lineTo(px, h * (0.35 + layer * 0.12) + Math.sin(px / (90 + layer * 40) + layer) * 50 + rnd() * 20);
      x.lineTo(w, h); x.fill();
      if (layer === 0) { x.fillStyle = 'rgba(240,246,255,.7)'; for (let px = 0; px < w; px += 40) { x.beginPath(); const py = h * 0.35 + Math.sin(px / 90) * 50; x.moveTo(px - 18, py + 20); x.lineTo(px, py); x.lineTo(px + 18, py + 20); x.fill(); } }
    }
    if (o.lake) { const wg = x.createLinearGradient(0, h * 0.68, 0, h); wg.addColorStop(0, '#1a2a4a'); wg.addColorStop(1, '#03060c'); x.fillStyle = wg; x.fillRect(0, h * 0.68, w, h * 0.32); for (let i = 0; i < 300; i++) { x.fillStyle = 'rgba(255,220,170,' + rnd() * 0.4 + ')'; x.fillRect(rnd() * w, h * 0.68 + rnd() * h * 0.32, 8 + rnd() * 20, 1.5); } for (let i = 0; i < 30; i++) { x.fillStyle = '#ffd98a'; x.fillRect(rnd() * w, h * 0.665, 3, 3); } }
    if (o.pines) for (let i = 0; i < 40; i++) { const px = rnd() * w, py = o.lake ? h * (0.6 + rnd() * 0.08) : h * (0.75 + rnd() * 0.25), s = 20 + rnd() * 40; x.fillStyle = '#0a1410'; x.beginPath(); x.moveTo(px, py - s * 2.2); x.lineTo(px - s * 0.6, py); x.lineTo(px + s * 0.6, py); x.fill(); x.fillStyle = 'rgba(240,246,255,.6)'; x.beginPath(); x.moveTo(px, py - s * 2.2); x.lineTo(px - s * 0.25, py - s * 1.4); x.lineTo(px + s * 0.25, py - s * 1.4); x.fill(); }
    if (o.snow) for (let i = 0; i < 300; i++) { x.fillStyle = 'rgba(255,255,255,' + rnd() * 0.8 + ')'; x.beginPath(); x.arc(rnd() * w, rnd() * h, rnd() * 2, 0, 7); x.fill(); }
  }),
  desert: (o) => canvas(1024, 512, (x, w, h) => {
    const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#1c1440'); g.addColorStop(0.5, '#a0406a'); g.addColorStop(0.75, '#ff9a4a'); g.addColorStop(1, '#3a1a10'); x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.fillStyle = o.rock || '#5a2a1c'; x.beginPath(); x.moveTo(0, h);
    for (let px = 0; px <= w; px += 30) x.lineTo(px, h * 0.55 + (Math.sin(px / 70) > 0.3 ? -80 : 0) + Math.sin(px / 23) * 10);
    x.lineTo(w, h); x.fill();
    for (let i = 0; i < 6; i++) { const px = rnd() * w, py = h * 0.8; x.strokeStyle = '#120a10'; x.lineWidth = 7; x.beginPath(); x.moveTo(px, h); x.lineTo(px + 6, py - 120); x.stroke(); x.fillStyle = '#120a10'; for (let k = 0; k < 8; k++) { x.save(); x.translate(px + 6, py - 120); x.rotate(k * 0.8); x.beginPath(); x.ellipse(36, 0, 40, 6, 0, 0, 7); x.fill(); x.restore(); } }
    if (o.pool) { x.fillStyle = '#2ad0e8'; x.fillRect(w * 0.2, h * 0.86, w * 0.6, h * 0.1); }
  }),
  river: (o) => canvas(1024, 512, (x, w, h) => {
    const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#060818'); g.addColorStop(0.5, '#1a1840'); g.addColorStop(0.56, '#0c1426'); g.addColorStop(1, '#020408'); x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.fillStyle = '#07090f'; x.fillRect(0, h * 0.5, w, 14);
    for (let i = 0; i < 40; i++) { x.fillStyle = 'rgba(255,210,140,.8)'; x.fillRect(rnd() * w, h * 0.49, 3, 3); }
    for (let i = 0; i < 400; i++) { x.fillStyle = 'rgba(255,200,120,' + rnd() * 0.4 + ')'; x.fillRect(rnd() * w, h * 0.56 + rnd() * h * 0.44, 10 + rnd() * 20, 1.5); }
    if (o.trees) for (let i = 0; i < 20; i++) { x.fillStyle = '#05070a'; x.beginPath(); x.arc(rnd() * w, h * 0.48, 20 + rnd() * 30, Math.PI, 0); x.fill(); }
    if (o.moon) { x.fillStyle = '#fff4d0'; x.shadowColor = '#fff4d0'; x.shadowBlur = 30; x.beginPath(); x.arc(w * 0.2, h * 0.15, 20, 0, 7); x.fill(); x.shadowBlur = 0; }
  }),
  rooftops: (o) => canvas(1024, 512, (x, w, h) => {
    const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#0b0f26'); g.addColorStop(1, '#3a3060'); x.fillStyle = g; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 30; i++) {
      const bx = i * 36 + rnd() * 10, bh = h * (0.25 + rnd() * 0.25);
      x.fillStyle = '#140f1c'; x.fillRect(bx, h - bh, 38, bh);
      x.beginPath(); x.moveTo(bx - 2, h - bh); x.lineTo(bx + 19, h - bh - 26); x.lineTo(bx + 40, h - bh); x.fill();
      for (let yy = h - bh + 10; yy < h; yy += 16) if (rnd() < 0.5) { x.fillStyle = '#ffd38a'; x.fillRect(bx + 8 + rnd() * 18, yy, 6, 8); }
    }
    if (o.spires) for (let i = 0; i < 4; i++) { const sx = 150 + i * 240 + rnd() * 60; x.fillStyle = '#1a1424'; x.fillRect(sx, h * 0.25, 22, h * 0.5); x.beginPath(); x.moveTo(sx - 4, h * 0.25); x.lineTo(sx + 11, h * 0.08); x.lineTo(sx + 26, h * 0.25); x.fill(); x.fillStyle = 'rgba(255,200,120,.45)'; x.fillRect(sx + 6, h * 0.3, 10, h * 0.42); }
    if (o.clock) { x.fillStyle = '#1a1424'; x.fillRect(w * 0.7, h * 0.12, 50, h * 0.7); x.fillStyle = '#ffe6a8'; x.shadowColor = '#ffe6a8'; x.shadowBlur = 20; x.beginPath(); x.arc(w * 0.7 + 25, h * 0.2, 16, 0, 7); x.fill(); x.shadowBlur = 0; }
  })
};
const LANDMARK = {
  eiffel: (x, w, h, base) => {
    const cx = w * 0.5, top = base - h * 0.7;
    x.strokeStyle = '#ffb84a'; x.shadowColor = '#ffb84a'; x.shadowBlur = 18; x.lineWidth = 5;
    x.beginPath(); x.moveTo(cx - 90, base); x.quadraticCurveTo(cx - 20, base - h * 0.3, cx - 5, top); x.moveTo(cx + 90, base); x.quadraticCurveTo(cx + 20, base - h * 0.3, cx + 5, top); x.stroke();
    x.lineWidth = 3; for (let k = 1; k < 9; k++) { const yy = base - k * h * 0.07, hw = 90 * Math.pow(1 - k / 10, 1.6); x.beginPath(); x.moveTo(cx - hw, yy); x.lineTo(cx + hw, yy); x.stroke(); }
    x.shadowBlur = 0;
  },
  needle: (x, w, h, base) => { const cx = w * 0.3; x.strokeStyle = '#d8e8ff'; x.lineWidth = 6; x.beginPath(); x.moveTo(cx - 20, base); x.lineTo(cx, base - h * 0.45); x.lineTo(cx + 20, base); x.stroke(); x.fillStyle = '#ffe6b0'; x.beginPath(); x.ellipse(cx, base - h * 0.47, 46, 10, 0, 0, 7); x.fill(); x.fillRect(cx - 3, base - h * 0.6, 6, h * 0.12); },
  marina: (x, w, h, base) => { x.fillStyle = '#d8e0f0'; for (let k = 0; k < 3; k++) x.fillRect(w * 0.55 + k * 70, base - h * 0.5, 34, h * 0.5); x.fillStyle = '#1a2440'; x.beginPath(); x.moveTo(w * 0.53, base - h * 0.52); x.quadraticCurveTo(w * 0.65, base - h * 0.62, w * 0.78, base - h * 0.52); x.lineTo(w * 0.78, base - h * 0.49); x.lineTo(w * 0.53, base - h * 0.49); x.fill(); x.fillStyle = '#9ad4ff'; x.fillRect(w * 0.53, base - h * 0.5, w * 0.25, 4); },
  tower: (x, w, h, base) => { const cx = w * 0.62; x.fillStyle = '#0e1024'; x.fillRect(cx, base - h * 0.62, 70, h * 0.62); x.fillRect(cx + 20, base - h * 0.78, 30, h * 0.16); x.fillStyle = '#ff3a3a'; x.beginPath(); x.arc(cx + 35, base - h * 0.8, 4, 0, 7); x.fill(); },
  strip: (x, w, h, base) => { for (let i = 0; i < 9; i++) { const bx = i * w / 9 + rnd() * 40, bh = h * (0.3 + rnd() * 0.4); const c = pick(['#ffd84d', '#ff5ab0', '#5ad8ff', '#ffffff', '#ff8a3a']); x.fillStyle = '#0a0a18'; x.fillRect(bx, base - bh, 60, bh); x.fillStyle = c; x.shadowColor = c; x.shadowBlur = 20; x.fillRect(bx + 4, base - bh + 6, 52, 6); x.fillRect(bx + 26, base - bh + 6, 6, bh - 10); x.shadowBlur = 0; } x.fillStyle = '#5ad8ff'; x.beginPath(); x.moveTo(w * 0.85, base - h * 0.55); x.lineTo(w * 0.83, base); x.lineTo(w * 0.87, base); x.fill(); },
  neon: (x, w, h, base) => { for (let i = 0; i < 20; i++) { const c = pick(['#ff3a8a', '#3ad8ff', '#ffd84d', '#a24aff']); x.fillStyle = c; x.shadowColor = c; x.shadowBlur = 16; x.fillRect(rnd() * w, base - h * (0.1 + rnd() * 0.5), 10 + rnd() * 40, 6 + rnd() * 20); x.shadowBlur = 0; } },
  lisboa: (x, w, h, base) => { const cx = w * 0.45; x.fillStyle = '#ffcc5a'; x.shadowColor = '#ffb030'; x.shadowBlur = 30; x.beginPath(); x.moveTo(cx, base - h * 0.7); x.quadraticCurveTo(cx - 60, base - h * 0.4, cx - 40, base - h * 0.2); x.lineTo(cx + 40, base - h * 0.2); x.quadraticCurveTo(cx + 60, base - h * 0.4, cx, base - h * 0.7); x.fill(); x.fillRect(cx - 50, base - h * 0.2, 100, h * 0.2); x.shadowBlur = 0; }
};

// ── Materials and props ──────────────────────────────────────────────────────────────────────────────────
function M(o) { return new THREE.MeshStandardMaterial(Object.assign({ roughness: 0.75, metalness: 0, envMapIntensity: 0.4 }, o)); }
function glow(color, i) { return new THREE.MeshStandardMaterial({ color: 0x000000, emissive: new THREE.Color(color), emissiveIntensity: i || 2.2 }); }
function box(g, w, h, d, mat, x, y, z, ry) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); if (ry) m.rotation.y = ry; g.add(m); return m; }
function rbox(g, w, h, d, r, mat, x, y, z, ry) { const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, r), mat); m.position.set(x, y, z); if (ry) m.rotation.y = ry; g.add(m); return m; }
function cyl(g, rt, rb, h, mat, x, y, z, seg) { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 20), mat); m.position.set(x, y, z); g.add(m); return m; }
function sph(g, r, mat, x, y, z) { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 12), mat); m.position.set(x, y, z); g.add(m); return m; }
function plane(g, w, h, mat, x, y, z, ry, rx) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(x, y, z); if (ry) m.rotation.y = ry; if (rx) m.rotation.x = rx; g.add(m); return m; }
function light(g, color, intensity, x, y, z, dist) { const l = new THREE.PointLight(color, intensity, dist || 9, 1.6); l.position.set(x, y, z); g.add(l); return l; }

// the room: floor, back wall, side walls, ceiling. The camera sits near the front, at the table, looking back.
function room(g, o) {
  const w = o.w || 12, d = o.d || 10, h = o.h || 3.2;
  const floor = plane(g, w, d, M({ map: tex(o.floor, w / 2, d / 2), roughness: o.floorRough || 0.6 }), 0, 0, -d / 2 + 2, 0, -Math.PI / 2);
  plane(g, w, h, M({ map: tex(o.wall, w / 2.4, h / 2.4) }), 0, h / 2, -d + 2);
  plane(g, d, h, M({ map: tex(o.side || o.wall, d / 2.4, h / 2.4) }), -w / 2, h / 2, -d / 2 + 2, Math.PI / 2);
  plane(g, d, h, M({ map: tex(o.side || o.wall, d / 2.4, h / 2.4) }), w / 2, h / 2, -d / 2 + 2, -Math.PI / 2);
  plane(g, w, d, M({ map: tex(o.ceil || PAINT.plain('#2a2420'), w / 2, d / 2) }), 0, h, -d / 2 + 2, 0, Math.PI / 2);
  if (o.wainscot) { plane(g, w, 1.0, M({ map: tex(o.wainscot, w / 2, 0.5) }), 0, 0.5, -d + 2.01); }
  return { w, d, h, back: -d + 2 };
}
// a window onto a painted view (lit from outside)
function windowOn(g, view, x, y, z, w, h, ry, frame) {
  const t = tex(view); const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t })); m.position.set(x, y, z); if (ry) m.rotation.y = ry; g.add(m);
  const fm = M({ color: frame || 0x1a1410, roughness: 0.5 });
  const fr = new THREE.Group(); fr.position.set(x, y, z + (ry ? 0 : 0.02)); if (ry) fr.rotation.y = ry; g.add(fr);
  box(fr, w + 0.12, 0.08, 0.08, fm, 0, h / 2, 0); box(fr, w + 0.12, 0.08, 0.08, fm, 0, -h / 2, 0); box(fr, 0.08, h, 0.08, fm, -w / 2, 0, 0); box(fr, 0.08, h, 0.08, fm, w / 2, 0, 0);
  if (frame !== 'none') { box(fr, 0.05, h, 0.05, fm, 0, 0, 0); }
  return m;
}
// a table with chairs and people round it (the other games going on in the room)
const SHIRTS = [0x2b3a67, 0x7a2a2a, 0x2f5a3a, 0x444444, 0x8a6a3a, 0x5a3a7a, 0x1f1f24, 0xb0a28a, 0x3a5a8a];
const SKIN = [0xe0b090, 0xc08a60, 0x8a5a3a, 0xf0c8a8, 0x6a4028];
function person(g, x, z, face) {
  const p = new THREE.Group(); p.position.set(x, 0, z); p.rotation.y = face; g.add(p);
  const shirt = M({ color: pick(SHIRTS), roughness: 0.92 }), skin = M({ color: pick(SKIN), roughness: 0.65 });
  // seated: legs under the table, torso tapering up to shoulders, arms reaching forward to the rail
  const legs = M({ color: pick([0x1a1c24, 0x2a3040, 0x3a3a3a, 0x4a3a2a]) });
  for (const sx of [-0.1, 0.1]) { const th = cyl(p, 0.075, 0.07, 0.42, legs, sx, 0.5, 0.14, 10); th.rotation.x = Math.PI / 2; cyl(p, 0.06, 0.055, 0.46, legs, sx, 0.25, 0.34, 10); }
  const torso = cyl(p, 0.2, 0.17, 0.52, shirt, 0, 0.84, 0, 18); torso.scale.z = 0.62;
  const sh = sph(p, 0.21, shirt, 0, 1.07, 0); sh.scale.set(1.12, 0.42, 0.66);
  for (const sx of [-1, 1]) {
    const up = new THREE.Mesh(new THREE.CapsuleGeometry(0.058, 0.24, 4, 10), shirt); up.position.set(sx * 0.22, 0.95, 0.06); up.rotation.set(0.5, 0, sx * 0.12); p.add(up);
    const fo = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.24, 4, 10), shirt); fo.position.set(sx * 0.17, 0.82, 0.27); fo.rotation.set(1.45, 0, -sx * 0.35); p.add(fo);
    sph(p, 0.045, skin, sx * 0.1, 0.81, 0.42);
  }
  cyl(p, 0.05, 0.055, 0.1, skin, 0, 1.15, 0.01, 10);
  const head = sph(p, 0.105, skin, 0, 1.29, 0.03); head.scale.set(0.92, 1.12, 1);
  const hc = pick([0x1a120c, 0x3a2414, 0x6a4a2a, 0x9a9a9a, 0xc8a060, 0x2a1a10]);
  const r = rnd();
  if (r < 0.7) { const hair = sph(p, 0.11, M({ color: hc, roughness: 0.9 }), 0, 1.32, 0.0); hair.scale.set(0.96, r < 0.25 ? 1.25 : 0.95, 1.02); if (r < 0.25) hair.position.y = 1.27; }
  else if (r < 0.85) { const cap = M({ color: pick([0x1a3a6a, 0x6a1a1a, 0x222222, 0xd8d0c0]) }); const c = sph(p, 0.112, cap, 0, 1.33, 0.02); c.scale.set(1, 0.7, 1); const bill = cyl(p, 0.1, 0.1, 0.015, cap, 0, 1.33, 0.13, 16); bill.scale.z = 0.6; }
  return p;
}
function chair(g, x, z, ry, col) {
  const c = new THREE.Group(); c.position.set(x, 0, z); c.rotation.y = ry; g.add(c);
  const m = M({ color: col || 0x2a1a14, roughness: 0.6 });
  rbox(c, 0.44, 0.08, 0.42, 0.03, m, 0, 0.47, 0); rbox(c, 0.42, 0.5, 0.06, 0.03, m, 0, 0.76, -0.2);
  for (const [lx, lz] of [[-0.18, -0.17], [0.18, -0.17], [-0.18, 0.17], [0.18, 0.17]]) cyl(c, 0.018, 0.018, 0.46, m, lx, 0.23, lz, 6);
  return c;
}
function pokerTable(g, x, z, o) {
  o = o || {};
  const t = new THREE.Group(); t.position.set(x, 0, z); t.rotation.y = o.ry || 0; g.add(t);
  const rx = o.rx || 1.1, rz = o.rz || 0.6;
  const top = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.08, 40), M({ color: o.felt || 0x1f6b45, roughness: 0.95 })); top.scale.set(rx, 1, rz); top.position.y = 0.76; t.add(top);
  const rail = new THREE.Mesh(new THREE.TorusGeometry(1, 0.06, 10, 48), M({ color: o.rail || 0x2a1a10, roughness: 0.4 })); rail.rotation.x = Math.PI / 2; rail.scale.set(rx, rz, 1); rail.position.y = 0.8; t.add(rail);
  cyl(t, 0.12, 0.3, 0.72, M({ color: 0x1a1210 }), 0, 0.36, 0);
  const seats = o.seats || 6;
  for (let i = 0; i < seats; i++) {
    const a = i / seats * Math.PI * 2, sx = Math.cos(a) * (rx + 0.42), sz = Math.sin(a) * (rz + 0.42);
    const face = -a - Math.PI / 2;
    chair(t, sx * 1.06, sz * 1.06, face, o.chair);
    if (rnd() < (o.full || 0.75)) person(t, sx, sz, face);
  }
  if (o.lamp !== false) { const lc = o.lampColor || 0xffd9a0; const shade = cyl(t, 0.18, 0.45, 0.3, M({ color: o.shade || 0x1d3a24, side: THREE.DoubleSide, roughness: 0.5 }), 0, 2.15, 0, 24); shade.material.side = THREE.DoubleSide; sph(t, 0.07, glow(lc, 3), 0, 2.05, 0); light(t, lc, o.lampI || 2.4, 0, 1.95, 0, 4); }
  // chips on the felt
  for (let i = 0; i < 6; i++) { const a = rnd() * 7; cyl(t, 0.035, 0.035, 0.04 + rnd() * 0.08, M({ color: pick([0xb3122b, 0x1d6fa3, 0xeeeeee, 0x111111, 0x2f7d4f]) }), Math.cos(a) * rx * 0.6, 0.84, Math.sin(a) * rz * 0.6, 10); }
  return t;
}
// a bar: counter, stools, a back bar of bottles under warm light, beer taps
function bar(g, x, z, len, o) {
  o = o || {};
  const b = new THREE.Group(); b.position.set(x, 0, z); b.rotation.y = o.ry || 0; g.add(b);
  const wood = M({ map: tex(PAINT.wood(o.wood || '#5a2e16', o.wood2 || '#3a1a0c', 18), 2, 1), roughness: 0.4 });
  box(b, len, 1.05, 0.6, wood, 0, 0.52, 0); box(b, len + 0.1, 0.06, 0.75, M({ color: o.top || 0x2a140a, roughness: 0.25, metalness: 0.1 }), 0, 1.07, 0);
  box(b, len, 0.08, 0.06, M({ color: 0xb08a40, metalness: 0.8, roughness: 0.3 }), 0, 0.2, 0.36);
  // back bar
  box(b, len, 2.2, 0.35, M({ color: 0x1a0f08 }), 0, 1.1 + 0.4, -1.1);
  for (let s = 0; s < 3; s++) {
    box(b, len - 0.2, 0.04, 0.32, M({ color: 0x3a2414 }), 0, 1.3 + s * 0.45, -0.92);
    for (let i = 0; i < len * 7; i++) {
      const col = pick([0x3a7a3a, 0x8a4a1a, 0xc8a050, 0x2a4a8a, 0xd8d8d0, 0x6a1a1a, 0x1a1a1a]);
      const btl = cyl(b, 0.035, 0.045, 0.24 + rnd() * 0.12, new THREE.MeshPhysicalMaterial({ color: col, roughness: 0.1, transmission: 0.3, emissive: new THREE.Color(col), emissiveIntensity: 0.15 }), -len / 2 + 0.15 + i * 0.143, 1.45 + s * 0.45, -0.92, 10);
    }
  }
  if (o.mirror !== false) plane(b, len - 0.2, 1.3, new THREE.MeshStandardMaterial({ color: 0x8090a0, metalness: 0.9, roughness: 0.15 }), 0, 1.75, -1.07);
  for (let i = 0; i < len / 1.5; i++) light(b, 0xffc880, 0.9, -len / 2 + 0.75 + i * 1.5, 2.4, -0.8, 2.5);
  // taps
  for (let i = 0; i < 5; i++) { cyl(b, 0.02, 0.02, 0.3, M({ color: 0xc0c0c8, metalness: 0.9, roughness: 0.2 }), -0.6 + i * 0.3, 1.25, -0.1, 8); cyl(b, 0.03, 0.03, 0.12, M({ color: pick([0x1a1a1a, 0x6a1a1a, 0x2a4a2a]) }), -0.6 + i * 0.3, 1.45, -0.1, 8); }
  // stools and people at the bar
  for (let i = 0; i < len / 0.9; i++) {
    const sx = -len / 2 + 0.45 + i * 0.9;
    cyl(b, 0.2, 0.2, 0.06, M({ color: o.stool || 0x6a1a1a }), sx, 0.8, 0.75); cyl(b, 0.03, 0.03, 0.78, M({ color: 0x2a2a2a, metalness: 0.7 }), sx, 0.4, 0.75, 8);
    if (rnd() < (o.crowd || 0.45)) { const p = person(b, sx, 0.8, Math.PI); p.position.y = 0.05; }
  }
  return b;
}
function neon(g, text, color, x, y, z, size, ry) {
  const wide = text.length > 8, c = canvas(wide ? 1024 : 512, 128, (cx, w, h) => { let fs = size || 72; do { cx.font = '900 ' + fs + 'px "Brush Script MT", "Segoe Script", Georgia, serif'; fs -= 3; } while (cx.measureText(text).width > w - 50 && fs > 16); cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.shadowColor = color; cx.shadowBlur = 20; cx.fillStyle = color; cx.fillText(text, w / 2, h / 2); cx.fillStyle = '#fff'; cx.shadowBlur = 0; cx.globalAlpha = 0.6; cx.fillText(text, w / 2, h / 2); });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(wide ? 4 : 2, 0.5), new THREE.MeshBasicMaterial({ map: tex(c), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  m.position.set(x, y, z); if (ry) m.rotation.y = ry; g.add(m); light(g, color, 1.2, x, y, z + 0.4, 3); return m;
}
function sign(g, text, bg, fg, x, y, z, w, h, ry) {
  const c = canvas(512, Math.round(512 * h / w), (cx, cw, ch) => { cx.fillStyle = bg; cx.fillRect(0, 0, cw, ch); cx.fillStyle = fg; let fs = Math.round(ch * 0.42); do { cx.font = '800 ' + fs + 'px Georgia, serif'; fs -= 2; } while (cx.measureText(text).width > cw * 0.9 && fs > 8); cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillText(text, cw / 2, ch / 2); });
  return plane(g, w, h, M({ map: tex(c), roughness: 0.6 }), x, y, z, ry);
}
function frameArt(g, x, y, z, w, h, ry, palette) {
  const c = canvas(256, Math.round(256 * h / w), (cx, cw, ch) => {
    const p = palette || ['#2a3a5a', '#c8a050', '#7a2a2a', '#3a6a4a', '#e8dcc0'];
    cx.fillStyle = p[0]; cx.fillRect(0, 0, cw, ch);
    for (let i = 0; i < 18; i++) { cx.fillStyle = pick(p); cx.globalAlpha = 0.5; cx.beginPath(); cx.ellipse(rnd() * cw, rnd() * ch, 10 + rnd() * 60, 10 + rnd() * 40, rnd() * 3, 0, 7); cx.fill(); }
  });
  const fm = M({ color: 0x8a6a2a, metalness: 0.6, roughness: 0.4 });
  const grp = new THREE.Group(); grp.position.set(x, y, z); if (ry) grp.rotation.y = ry; g.add(grp);
  box(grp, w + 0.12, h + 0.12, 0.05, fm, 0, 0, 0); plane(grp, w, h, M({ map: tex(c) }), 0, 0, 0.03);
}
function chandelier(g, x, y, z, s, color) {
  const c = new THREE.Group(); c.position.set(x, y, z); c.scale.setScalar(s || 1); g.add(c);
  const gold = M({ color: 0xc8a050, metalness: 0.9, roughness: 0.25 });
  cyl(c, 0.02, 0.02, 0.6, gold, 0, 0.3, 0, 6);
  for (let ring = 0; ring < 2; ring++) {
    const r = 0.55 - ring * 0.22, n = 12 - ring * 4;
    const tor = new THREE.Mesh(new THREE.TorusGeometry(r, 0.02, 8, 40), gold); tor.rotation.x = Math.PI / 2; tor.position.y = -ring * 0.25; c.add(tor);
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; sph(c, 0.05, glow(color || 0xfff0c8, 3.2), Math.cos(a) * r, -ring * 0.25 + 0.06, Math.sin(a) * r); for (let k = 0; k < 3; k++) sph(c, 0.018, new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0, transmission: 0.8, emissive: 0xfff4d0, emissiveIntensity: 0.6 }), Math.cos(a) * r, -ring * 0.25 - 0.08 - k * 0.07, Math.sin(a) * r); }
  }
  light(c, color || 0xffe8c0, 4, 0, -0.2, 0, 7);
}
function pendant(g, x, y, z, color, shadeColor) { cyl(g, 0.006, 0.006, 3, M({ color: 0x111111 }), x, y + 1.5, z, 4); const s = cyl(g, 0.05, 0.28, 0.24, M({ color: shadeColor || 0x2a2a2a, side: THREE.DoubleSide, metalness: 0.4, roughness: 0.4 }), x, y, z, 24); sph(g, 0.06, glow(color || 0xffd9a0, 3), x, y - 0.08, z); light(g, color || 0xffd9a0, 2, x, y - 0.2, z, 4); return s; }
function stringLights(g, x0, x1, y, z, sag, color) { const n = 26; for (let i = 0; i <= n; i++) { const t = i / n, x = x0 + (x1 - x0) * t, yy = y - Math.sin(t * Math.PI) * sag; sph(g, 0.045, glow(color || pick([0xffd38a, 0xfff0c0]), 3.5), x, yy, z); if (i % 6 === 0) light(g, 0xffd38a, 0.7, x, yy - 0.1, z, 2.5); } }
function slots(g, x, z, n, ry, o) {
  o = o || {};
  const grp = new THREE.Group(); grp.position.set(x, 0, z); grp.rotation.y = ry || 0; g.add(grp);
  for (let i = 0; i < n; i++) {
    const sx = (i - (n - 1) / 2) * 0.72, col = pick(o.colors || [0xff3a6a, 0x3ad8ff, 0xffd84d, 0xa24aff, 0x3aff8a]);
    rbox(grp, 0.62, 1.55, 0.5, 0.05, M({ color: 0x1a1a24, metalness: 0.5, roughness: 0.35 }), sx, 0.78, 0);
    const scr = canvas(128, 160, (cx, w, h) => { const gg = cx.createLinearGradient(0, 0, 0, h); gg.addColorStop(0, '#' + new THREE.Color(col).getHexString()); gg.addColorStop(1, '#10101a'); cx.fillStyle = gg; cx.fillRect(0, 0, w, h); cx.fillStyle = '#fff'; cx.font = '900 30px sans-serif'; cx.textAlign = 'center'; cx.fillText(pick(['777', 'BAR', '$$$', 'WIN', '★★★']), w / 2, h * 0.55); });
    plane(grp, 0.5, 0.62, new THREE.MeshBasicMaterial({ map: tex(scr) }), sx, 1.12, 0.26);
    box(grp, 0.62, 0.12, 0.52, glow(col, 2.5), sx, 1.62, 0);
    if (rnd() < 0.4) { const p = person(grp, sx, 0.7, Math.PI); p.position.y = -0.12; }
  }
  light(grp, 0xff8ad8, 1.4, 0, 1.8, 0.8, 4);
}
function fireplace(g, x, z, ry) {
  const f = new THREE.Group(); f.position.set(x, 0, z); f.rotation.y = ry || 0; g.add(f);
  const stone = M({ map: tex(PAINT.brick('#7a7068', '#3a3430'), 1, 1), roughness: 0.9 });
  box(f, 2.2, 3.2, 0.6, stone, 0, 1.6, 0); box(f, 1.2, 0.9, 0.62, M({ color: 0x0a0806 }), 0, 0.6, 0.02);
  plane(f, 1.0, 0.6, new THREE.MeshBasicMaterial({ map: tex(canvas(128, 96, (cx, w, h) => { const gg = cx.createRadialGradient(w / 2, h, 4, w / 2, h, h); gg.addColorStop(0, '#fff2a0'); gg.addColorStop(0.4, '#ff9a20'); gg.addColorStop(1, 'rgba(120,20,0,0)'); cx.fillStyle = '#000'; cx.fillRect(0, 0, w, h); cx.fillStyle = gg; for (let i = 0; i < 7; i++) { cx.beginPath(); const fx = 20 + i * 14; cx.moveTo(fx - 12, h); cx.quadraticCurveTo(fx, h * 0.1 + rnd() * 30, fx + 12, h); cx.fill(); } })), blending: THREE.AdditiveBlending }), 0, 0.45, 0.34);
  light(f, 0xff8a30, 3.5, 0, 0.6, 0.8, 6);
  box(f, 2.4, 0.12, 0.8, M({ color: 0x3a2414 }), 0, 1.15, 0.1);
}
function shelves(g, x, z, w, h, ry, kind) {
  const s = new THREE.Group(); s.position.set(x, 0, z); s.rotation.y = ry || 0; g.add(s);
  box(s, w, h, 0.4, M({ color: 0x2a1a10 }), 0, h / 2, -0.05);
  const rows = Math.floor(h / 0.38);
  for (let r = 0; r < rows; r++) for (let i = 0; i < w / 0.06; i++) {
    if (kind === 'wine') { const b = cyl(s, 0.035, 0.035, 0.3, M({ color: pick([0x1a2a12, 0x3a0a10, 0x1a1a1a]), roughness: 0.2 }), -w / 2 + 0.06 + i * 0.07, 0.2 + r * 0.38, 0.12, 8); b.rotation.x = Math.PI / 2; if (i % 1 === 0) i += 0.3; }
    else box(s, 0.05, 0.22 + rnd() * 0.1, 0.25, M({ color: pick([0x6a1a1a, 0x1a3a6a, 0x2a4a2a, 0x8a6a3a, 0x3a2a4a, 0xc8b890]) }), -w / 2 + 0.05 + i * 0.06, 0.16 + r * 0.38, 0.05);
  }
}
function lantern(g, x, y, z, color) { cyl(g, 0.005, 0.005, 1, M({ color: 0x111111 }), x, y + 0.6, z, 4); const l = sph(g, 0.22, glow(color || 0xff2a1a, 1.8), x, y, z); l.scale.set(1, 1.2, 1); cyl(g, 0.1, 0.1, 0.06, M({ color: 0xc8a050, metalness: 0.8 }), x, y + 0.28, z); cyl(g, 0.1, 0.1, 0.06, M({ color: 0xc8a050, metalness: 0.8 }), x, y - 0.28, z); light(g, color || 0xff4a2a, 1.2, x, y - 0.2, z, 3); }
function plant(g, x, z, s, palm) {
  const p = new THREE.Group(); p.position.set(x, 0, z); p.scale.setScalar(s || 1); g.add(p);
  cyl(p, 0.22, 0.17, 0.4, M({ color: 0x5a3a2a }), 0, 0.2, 0);
  if (palm) { cyl(p, 0.05, 0.07, 1.8, M({ color: 0x6a5030 }), 0, 1.3, 0, 8); for (let i = 0; i < 8; i++) { const lf = plane(p, 1.1, 0.25, M({ color: 0x2a5a2a, side: THREE.DoubleSide }), 0, 2.15, 0); lf.rotation.set(-0.5, i / 8 * Math.PI * 2, 0); lf.translateX(0.5); } }
  else for (let i = 0; i < 9; i++) { const lf = sph(p, 0.22, M({ color: pick([0x2a5a2a, 0x3a6a2a, 0x1f4a24]) }), (rnd() - 0.5) * 0.4, 0.6 + rnd() * 0.7, (rnd() - 0.5) * 0.4); lf.scale.set(1, 1.4, 0.6); }
}
function curtain(g, x, y, z, w, h, color, ry) {
  const c = canvas(256, 64, (cx, cw, ch) => { for (let i = 0; i < cw; i++) { const v = 0.55 + 0.45 * Math.sin(i / 8); cx.fillStyle = 'rgba(0,0,0,' + (1 - v) * 0.7 + ')'; cx.fillRect(i, 0, 1, ch); } });
  const m = plane(g, w, h, M({ color, map: tex(c), roughness: 0.95, emissive: new THREE.Color(color), emissiveIntensity: 0.35 }), x, y, z, ry); return m;
}
function flag(g, x, y, z, ry) { const c = canvas(190, 100, (cx, w, h) => { for (let i = 0; i < 13; i++) { cx.fillStyle = i % 2 ? '#fff' : '#b22234'; cx.fillRect(0, i * h / 13, w, h / 13 + 1); } cx.fillStyle = '#3c3b6e'; cx.fillRect(0, 0, w * 0.4, h * 7 / 13); cx.fillStyle = '#fff'; for (let i = 0; i < 30; i++) cx.fillRect(4 + (i % 6) * 12, 4 + Math.floor(i / 6) * 10, 3, 3); }); cyl(g, 0.02, 0.02, 2.4, M({ color: 0xc8a050, metalness: 0.8 }), x, 1.2, z, 6); plane(g, 0.9, 0.5, M({ map: tex(c), side: THREE.DoubleSide }), x + 0.45, y, z, ry); }
function banner(g, text, bg, fg, x, y, z, w, h) { return sign(g, text, bg, fg, x, y, z, w, h); }
function tvRig(g, w, y, z) { box(g, w, 0.12, 0.12, M({ color: 0x1a1a1a, metalness: 0.7 }), 0, y, z); for (let i = 0; i < 9; i++) { const x = -w / 2 + 0.5 + i * (w - 1) / 8; const c = cyl(g, 0.12, 0.18, 0.3, M({ color: 0x111111, metalness: 0.5 }), x, y - 0.25, z); sph(g, 0.1, glow(0xfff6e0, 4), x, y - 0.42, z); const sp = new THREE.SpotLight(0xfff0dc, 18, 14, 0.5, 0.6, 1.4); sp.position.set(x, y - 0.4, z); sp.target.position.set(x * 0.4, 0, z + 4); g.add(sp, sp.target); } }
function screen(g, x, y, z, w, h, palette, text) {
  const c = canvas(512, Math.round(512 * h / w), (cx, cw, ch) => { const gg = cx.createLinearGradient(0, 0, cw, ch); gg.addColorStop(0, palette[0]); gg.addColorStop(1, palette[1]); cx.fillStyle = gg; cx.fillRect(0, 0, cw, ch); if (text) { cx.fillStyle = '#fff'; let fs = Math.round(ch * 0.2); do { cx.font = '900 ' + fs + 'px Georgia, serif'; fs -= 2; } while (cx.measureText(text).width > cw * 0.88 && fs > 8); cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillText(text, cw / 2, ch / 2); } });
  const m = plane(g, w, h, new THREE.MeshBasicMaterial({ map: tex(c) }), x, y, z); light(g, 0x9ab8ff, 1, x, y, z + 1, 5); return m;
}

// ── The places ───────────────────────────────────────────────────────────────────────────────────────────
// each: (g) => { builds the room in group g; returns { exposure, fog, bloom } }
const SCENES = {
  kitchen(g) {
    const r = room(g, { w: 9, d: 7, h: 2.7, floor: PAINT.tile('#d8d0c0', '#a89a80', 10), wall: PAINT.stripe('#e8dcc0', '#e0d2b2'), ceil: PAINT.plain('#ece4d4') });
    const cab = M({ color: 0xf2ece0, roughness: 0.5 }), counter = M({ color: 0x3a3a40, roughness: 0.25, metalness: 0.2 });
    for (let i = 0; i < 7; i++) { box(g, 0.6, 0.9, 0.6, cab, -3 + i * 0.62, 0.45, r.back + 0.32); box(g, 0.6, 0.7, 0.35, cab, -3 + i * 0.62, 2.0, r.back + 0.2); }
    box(g, 4.4, 0.05, 0.65, counter, -1.15, 0.92, r.back + 0.34);
    rbox(g, 0.85, 1.9, 0.7, 0.05, M({ color: 0xc8ccd2, metalness: 0.7, roughness: 0.3 }), 1.9, 0.95, r.back + 0.4);
    windowOn(g, VIEW.mountains({ sky0: '#0a1030', sky1: '#2a3a6a', pines: true }), -1.2, 1.75, r.back + 0.02, 1.2, 0.8);
    for (let i = 0; i < 5; i++) cyl(g, 0.05, 0.05, 0.14 + rnd() * 0.1, M({ color: pick([0xff5a2a, 0xffd84d, 0x2a8a3a, 0xffffff]) }), -2.6 + i * 0.35, 1.02, r.back + 0.35, 10);
    frameArt(g, -4.45, 1.6, -0.5, 0.8, 0.6, Math.PI / 2, ['#f0e0c0', '#e07040', '#406080', '#80a060']);
    pokerTable(g, 1.0, -2.2, { rx: 0.9, rz: 0.55, felt: 0x2e7d4f, rail: 0x7c5530, seats: 5, shade: 0xe8dcc0, lampColor: 0xffe0b0 });
    return { exposure: 1.05 };
  },
  basement(g) {
    const r = room(g, { w: 10, d: 8, h: 2.4, floor: PAINT.carpet('#4a3a30', '#3a2c24', '#5a4838'), wall: PAINT.panel('#6a4a2a', '#8a6038'), ceil: PAINT.acoustic() });
    box(g, 3.0, 0.8, 0.9, M({ color: 0x6a2a2a, roughness: 0.9 }), -2.5, 0.4, r.back + 0.6); box(g, 3.0, 0.6, 0.25, M({ color: 0x6a2a2a, roughness: 0.9 }), -2.5, 0.9, r.back + 0.18);
    rbox(g, 1.6, 0.9, 0.08, 0.02, M({ color: 0x0a0a0a, roughness: 0.2 }), -2.5, 1.7, r.back + 0.05);
    screen(g, -2.5, 1.7, r.back + 0.1, 1.5, 0.82, ['#1a5a2a', '#0a2a14'], 'GAME DAY');
    bar(g, 2.8, r.back + 1.4, 2.4, { crowd: 0.3, mirror: false });
    neon(g, 'Man Cave', '#ff4a8a', 2.8, 2.05, r.back + 0.05, 64);
    frameArt(g, -4.95, 1.4, -1.5, 1.0, 0.7, Math.PI / 2);
    pokerTable(g, 0.3, -2.4, { felt: 0x1f5c39, seats: 6, lampColor: 0xfff0d0, shade: 0x1a3a24 });
    return { exposure: 0.95 };
  },
  garage(g) {
    const r = room(g, { w: 10, d: 8, h: 3, floor: PAINT.concrete('#7a7874'), wall: PAINT.plain('#b8b2a4'), ceil: PAINT.plain('#9a958a') });
    const door = canvas(256, 256, (x, w, h) => { x.fillStyle = '#d8d4c8'; x.fillRect(0, 0, w, h); for (let i = 0; i < h; i += 32) { x.fillStyle = 'rgba(0,0,0,.2)'; x.fillRect(0, i, w, 3); } });
    plane(g, 4.5, 2.4, M({ map: tex(door), roughness: 0.6, metalness: 0.3 }), -1.5, 1.2, r.back + 0.02);
    shelves(g, 3.4, r.back + 0.3, 2.2, 2.2, 0); box(g, 2.4, 0.9, 0.7, M({ color: 0xb02a1a, metalness: 0.4, roughness: 0.4 }), 3.4, 0.45, r.back + 1.2);
    for (let i = 0; i < 3; i++) { box(g, 1.4, 0.04, 0.12, glow(0xf0f6ff, 3), -3 + i * 3, 2.95, -3); light(g, 0xe8f0ff, 1.6, -3 + i * 3, 2.7, -3, 6); }
    sign(g, 'ROUTE 66', '#1a1a1a', '#f0f0f0', -4.95, 1.9, -2, 1.1, 0.5, Math.PI / 2);
    pokerTable(g, 0.6, -2.3, { felt: 0x2e7d4f, rail: 0x5a3a20, seats: 6, lamp: false });
    return { exposure: 1.0 };
  },
  dining(g) {
    const r = room(g, { w: 9, d: 7, h: 2.8, floor: PAINT.wood('#8a5a32', '#6a4024', 26), wall: PAINT.damask('#5a2a2a', '#6a3434'), wainscot: PAINT.panel('#e8e0d0', '#f4ece0'), ceil: PAINT.plain('#f0e8dc') });
    shelves(g, -2.6, r.back + 0.25, 1.8, 2.0, 0); for (let i = 0; i < 9; i++) sph(g, 0.08, M({ color: 0xf4f0e8, roughness: 0.2 }), -3.3 + i * 0.18, 1.95, r.back + 0.3);
    windowOn(g, VIEW.city({ towers: 16, tall: 0.3, moon: true }), 1.6, 1.6, r.back + 0.02, 1.6, 1.2, 0, 0xf0e8dc);
    curtain(g, 0.55, 1.5, r.back + 0.06, 0.5, 2.2, 0x6a1a1a); curtain(g, 2.65, 1.5, r.back + 0.06, 0.5, 2.2, 0x6a1a1a);
    chandelier(g, 0.6, 2.35, -2.3, 0.7);
    frameArt(g, -4.45, 1.6, -1.8, 1.1, 0.8, Math.PI / 2);
    pokerTable(g, 0.6, -2.3, { rx: 1.2, rz: 0.65, felt: 0x2e7d4f, rail: 0x3a1a0c, lamp: false, seats: 6 });
    return { exposure: 1.05 };
  },
  porch(g) {
    const r = room(g, { w: 11, d: 8, h: 2.8, floor: PAINT.wood('#9a7a5a', '#7a5a3a', 22), wall: PAINT.panel('#e8e4da', '#f4f0e6'), ceil: PAINT.wood('#a08060', '#806040', 30) });
    windowOn(g, VIEW.river({ trees: true, moon: true }), 0, 1.35, r.back + 0.02, 7, 2.4, 0, 0xf4f0e6);
    for (let i = 0; i < 6; i++) box(g, 0.12, 2.8, 0.12, M({ color: 0xf4f0e6 }), -3.5 + i * 1.4, 1.4, r.back + 0.1);
    box(g, 8, 0.08, 0.1, M({ color: 0xf4f0e6 }), 0, 0.9, r.back + 0.12);
    stringLights(g, -4.5, 4.5, 2.6, -2.5, 0.5); stringLights(g, -4.5, 4.5, 2.6, -4.2, 0.4);
    plant(g, -4.2, r.back + 0.6, 1.1); plant(g, 4.2, r.back + 0.6, 1.0);
    pokerTable(g, 0.5, -2.3, { felt: 0x2e7d4f, rail: 0x7c5530, lamp: false, seats: 6 });
    light(g, 0xffd090, 1.8, 0.5, 2.2, -2.3, 5);
    return { exposure: 1.0 };
  },
  pub(g, o) {
    const r = room(g, { w: 12, d: 9, h: 3, floor: PAINT.wood('#4a2a14', '#3a1e0c', 24), wall: o.brick ? PAINT.brick('#7a3a2a', '#3a2a24') : PAINT.panel('#3a2010', '#4a2a14'), ceil: PAINT.tin('#3a3028'), wainscot: PAINT.panel('#2a160a', '#3a2010') });
    bar(g, -1.5, r.back + 1.25, 6, { crowd: 0.6, stool: 0x3a1a0a });
    neon(g, o.neon || 'Cold Beer', o.neonColor || '#ff3a3a', 3.2, 2.35, r.back + 0.04, 72);
    neon(g, 'OPEN', '#3ad8ff', -4.2, 2.3, r.back + 0.04, 80);
    sign(g, o.name || 'THE PUB', '#1a0f08', '#d8b060', 4.5, 1.6, r.back + 0.5, 1.4, 0.45, 0);
    frameArt(g, -5.95, 1.7, -2, 0.7, 0.9, Math.PI / 2, ['#1a3a1a', '#d8b060', '#e8dcc0']); frameArt(g, -5.95, 1.7, -0.8, 0.7, 0.9, Math.PI / 2);
    // a dart board
    cyl(g, 0.3, 0.3, 0.04, M({ map: tex(canvas(128, 128, (x, w, h) => { for (let i = 0; i < 20; i++) { x.fillStyle = i % 2 ? '#111' : '#e8dcc0'; x.beginPath(); x.moveTo(64, 64); x.arc(64, 64, 64, i / 20 * 6.283, (i + 1) / 20 * 6.283); x.fill(); } x.fillStyle = '#b02020'; x.beginPath(); x.arc(64, 64, 8, 0, 7); x.fill(); })) }), 5.95, 1.7, -2.2).rotation.z = Math.PI / 2;
    for (let i = 0; i < 4; i++) pendant(g, -4 + i * 2.6, 2.3, -3.2, 0xffb860, 0x2a4a2a);
    pokerTable(g, 1.5, -2.6, { felt: 0x7a1f2a, rail: 0x2a160a, seats: 6, shade: 0x2a4a2a });
    return { exposure: 0.95 };
  },
  hall(g, o) {
    const r = room(g, { w: 14, d: 11, h: 3.4, floor: o.floor === 'tile' ? PAINT.tile('#c8c0b0', '#8a8070', 12) : PAINT.wood('#9a6a3a', '#7a4a24', 24), wall: o.wall || PAINT.panel('#8a6a44', '#a07a50'), ceil: PAINT.acoustic() });
    for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) { box(g, 1.6, 0.04, 0.3, glow(0xf4f8ff, 2.6), -4.5 + i * 3, 3.38, -1 - j * 4); }
    light(g, 0xf0f4ff, 3, -3, 3, -2, 9); light(g, 0xf0f4ff, 3, 3, 3, -2, 9); light(g, 0xf0f4ff, 2, 0, 3, -6, 9);
    if (o.flags) { flag(g, -5, 2.2, r.back + 0.3); flag(g, 4.4, 2.2, r.back + 0.3); }
    if (o.banner) banner(g, o.banner, o.bannerBg || '#1f3c6b', '#f4e8c8', 0, 2.6, r.back + 0.03, 5, 0.6);
    if (o.honor) for (let i = 0; i < 8; i++) frameArt(g, -3 + i * 0.85, 1.6, r.back + 0.03, 0.55, 0.7, 0, ['#e8e0c8', '#3a3a3a', '#8a7a5a']);
    // the coffee urn and a buffet table
    box(g, 2.6, 0.75, 0.8, M({ color: 0xe8e8e8 }), 4, 0.38, r.back + 1); cyl(g, 0.18, 0.18, 0.5, M({ color: 0xc8c8d0, metalness: 0.9, roughness: 0.2 }), 3.3, 1.0, r.back + 1);
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) pokerTable(g, -3.5 + i * 3.5, -3.6 - j * 2.6, { felt: o.felt || 0x1f3c6b, rail: 0x3a2a1a, lamp: false, seats: 6, full: 0.85 });
    pokerTable(g, 1.2, -1.9, { felt: o.felt || 0x1f3c6b, rail: 0x3a2a1a, lamp: false, seats: 6 });
    if (o.truck) { const red = M({ color: 0xb01a1a, metalness: 0.5, roughness: 0.35 }); rbox(g, 4, 1.8, 2, 0.15, red, -4, 1.2, r.back + 1.4); for (let i = 0; i < 2; i++) cyl(g, 0.45, 0.45, 2.1, M({ color: 0x111111 }), -5.2 + i * 2.4, 0.45, r.back + 1.4).rotation.x = Math.PI / 2; }
    return { exposure: 1.0 };
  },
  countryclub(g) {
    const r = room(g, { w: 13, d: 10, h: 3.4, floor: PAINT.carpet('#1f3a2a', '#2a4a34', '#c8a050'), wall: PAINT.panel('#5a3a20', '#6a4426'), ceil: PAINT.plain('#e8dcc4') });
    windowOn(g, VIEW.mountains({ sky0: '#081428', sky1: '#30406a' }), -2, 1.7, r.back + 0.02, 3.6, 1.8, 0, 0xe8dcc4);
    fireplace(g, 3.6, r.back + 0.32); frameArt(g, 3.6, 2.3, r.back + 0.64, 1.2, 0.8);
    shelves(g, -6.45, -2.5, 2.2, 2.6, Math.PI / 2);
    chandelier(g, -1.5, 3.0, -3, 0.8); chandelier(g, 2.5, 3.0, -2.5, 0.7);
    pokerTable(g, -2, -3.2, { felt: 0x1f3c6b, lamp: false }); pokerTable(g, 1.6, -2.1, { felt: 0x1f3c6b, lamp: false });
    return { exposure: 1.0 };
  },
  cellar(g) {
    const r = room(g, { w: 10, d: 8, h: 2.7, floor: PAINT.tile('#5a3a2a', '#4a2e20', 8), wall: PAINT.brick('#8a4a2e', '#4a3a30'), ceil: PAINT.wood('#3a2414', '#2a180c', 40) });
    shelves(g, -2.6, r.back + 0.25, 3.6, 2.4, 0, 'wine'); shelves(g, 2.6, r.back + 0.25, 2.6, 2.4, 0, 'wine');
    for (let i = 0; i < 8; i++) { const bx = (i < 4 ? -4.3 : 4.3), bz = -1.6 - (i % 4) * 1.0, by = 0.36; cyl(g, 0.35, 0.35, 0.8, M({ map: tex(PAINT.wood('#6a4020', '#4a2a14', 12), 2, 1) }), bx, by, bz).rotation.z = Math.PI / 2; }
    stringLights(g, -4.5, 4.5, 2.5, -2, 0.35, 0xffc070);
    for (let i = 0; i < 3; i++) { sph(g, 0.08, glow(0xffb050, 3), -3 + i * 3, 1.1, -3.4); light(g, 0xffb050, 1, -3 + i * 3, 1.2, -3.2, 3); }
    pokerTable(g, 0.6, -2.4, { felt: 0x2f3a2c, rail: 0x3a2616, seats: 6, shade: 0x6a3a1a, lampColor: 0xffc880 });
    return { exposure: 0.9 };
  },
  backroom(g) {
    const r = room(g, { w: 9, d: 7, h: 2.7, floor: PAINT.tile('#e8e0d0', '#2a2a2a', 10), wall: PAINT.damask('#4a1a14', '#5a221a'), ceil: PAINT.tin('#4a3a30') });
    frameArt(g, -1.6, 1.7, r.back + 0.03, 1.0, 0.7, 0, ['#2a4a2a', '#e8dcc0', '#8a2a1a']); frameArt(g, 0.6, 1.7, r.back + 0.03, 0.7, 0.9, 0);
    box(g, 0.9, 2.1, 0.06, M({ color: 0x3a2014 }), 3, 1.05, r.back + 0.03); sign(g, 'KITCHEN', '#3a2014', '#e8dcc0', 3, 2.25, r.back + 0.04, 0.8, 0.2);
    // stacked crates and a sack of flour
    for (let i = 0; i < 3; i++) box(g, 0.6, 0.4, 0.5, M({ color: 0x8a6a40 }), -3.6, 0.2 + i * 0.4, r.back + 0.5);
    pokerTable(g, 0.4, -2.2, { felt: 0x2f3a2c, rail: 0x3a2616, seats: 6, shade: 0x2a2a2a, lampColor: 0xffd090, lampI: 3 });
    return { exposure: 0.85 };
  },
  dragon(g) {
    const r = room(g, { w: 10, d: 8, h: 2.8, floor: PAINT.carpet('#6a0a0a', '#8a1a1a', '#c8a050'), wall: PAINT.panel('#5a0a0a', '#7a1414'), ceil: PAINT.plain('#3a0a08') });
    for (let i = 0; i < 6; i++) lantern(g, -4 + i * 1.6, 2.2 + (i % 2) * 0.15, -2.8 - (i % 3) * 0.6);
    const scroll = canvas(128, 384, (x, w, h) => { x.fillStyle = '#e8d8b0'; x.fillRect(0, 0, w, h); x.fillStyle = '#1a1a1a'; x.font = '900 60px serif'; x.textAlign = 'center'; ['福', '龍', '運'].forEach((c, i) => x.fillText(c, w / 2, 90 + i * 110)); });
    plane(g, 0.5, 1.5, M({ map: tex(scroll) }), -2, 1.6, r.back + 0.03); plane(g, 0.5, 1.5, M({ map: tex(scroll) }), 2, 1.6, r.back + 0.03);
    box(g, 2.2, 1.3, 0.5, M({ color: 0x1a2a3a, roughness: 0.1, transparent: true, opacity: 0.6 }), 0, 1.2, r.back + 0.3); for (let i = 0; i < 5; i++) { const f = sph(g, 0.08, glow(0xff9a2a, 1.5), -0.8 + i * 0.4, 1.1 + rnd() * 0.4, r.back + 0.3); f.scale.set(1.6, 0.6, 0.6); }
    light(g, 0x5ab8ff, 0.8, 0, 1.2, r.back + 0.6, 2);
    pokerTable(g, 0.5, -2.3, { felt: 0x2f3a2c, rail: 0x3a0a0a, seats: 6, lamp: false });
    light(g, 0xffb070, 2, 0.5, 2.2, -2.3, 5);
    return { exposure: 0.95 };
  },
  cantina(g) {
    const r = room(g, { w: 10, d: 8, h: 2.8, floor: PAINT.tile('#b8603a', '#9a4a2a', 8), wall: PAINT.plain('#d89a5a'), ceil: PAINT.wood('#5a3a20', '#3a2410', 34) });
    for (let i = 0; i < 12; i++) { const c = pick(['#ff3a6a', '#3ad8ff', '#ffd84d', '#3aff8a', '#ff8a3a']); plane(g, 0.35, 0.28, M({ color: c, side: THREE.DoubleSide, emissive: new THREE.Color(c), emissiveIntensity: 0.25 }), -4 + i * 0.75, 2.5 - Math.sin(i / 11 * Math.PI) * 0.3, -2.2); }
    bar(g, -1.5, r.back + 1.25, 4, { wood: '#7a4a24', crowd: 0.4, mirror: false });
    neon(g, 'Tequila', '#3aff8a', 2.8, 2.2, r.back + 0.04, 72);
    for (let i = 0; i < 3; i++) plant(g, 3 + i * 0.7, r.back + 0.4, 0.8);
    pokerTable(g, 0.8, -2.4, { felt: 0x2f3a2c, rail: 0x5a3a20, seats: 6, shade: 0x8a3a1a });
    return { exposure: 1.0 };
  },
  diner(g) {
    const r = room(g, { w: 11, d: 8, h: 2.8, floor: PAINT.tile('#f0f0f0', '#1a1a1a', 10), wall: PAINT.stripe('#e8f4f2', '#d8ece8'), ceil: PAINT.plain('#e8ece8') });
    box(g, 6, 1.0, 0.7, M({ color: 0xc8ccd4, metalness: 0.8, roughness: 0.25 }), -1.5, 0.5, r.back + 1.4); box(g, 6.1, 0.06, 0.85, M({ color: 0xe84a5a, roughness: 0.3 }), -1.5, 1.03, r.back + 1.4);
    for (let i = 0; i < 6; i++) { cyl(g, 0.2, 0.2, 0.08, M({ color: 0xe84a5a, roughness: 0.3 }), -4 + i * 1, 0.78, r.back + 2.1); cyl(g, 0.03, 0.03, 0.75, M({ color: 0xc8c8d0, metalness: 0.9 }), -4 + i * 1, 0.38, r.back + 2.1, 8); }
    windowOn(g, VIEW.city({ towers: 14, tall: 0.25, water: false }), -1.5, 1.85, r.back + 0.02, 5, 1.0, 0, 0xc8ccd4);
    neon(g, 'EAT', '#ff3a3a', 3.6, 2.2, r.back + 0.04, 90); neon(g, 'PIE', '#3ad8ff', 3.6, 1.6, r.back + 0.04, 80);
    for (let i = 0; i < 3; i++) { box(g, 1.4, 0.04, 0.3, glow(0xf4f8ff, 2.2), -3 + i * 3, 2.78, -2.5); light(g, 0xf4f8ff, 1.5, -3 + i * 3, 2.5, -2.5, 6); }
    pokerTable(g, 1.3, -2.5, { felt: 0x2f3a2c, seats: 6, lamp: false });
    return { exposure: 1.0 };
  },
  cardroom(g, o) {
    const r = room(g, { w: 16, d: 13, h: 3.4, floor: PAINT.carpet(o.carpet || '#1a2a4a', o.carpet2 || '#2a3a6a', o.carpet3 || '#c8a050'), wall: o.wall || PAINT.panel('#3a2a20', '#4a3426'), ceil: PAINT.plain('#2a2420') });
    if (o.view) windowOn(g, o.view, 0, 1.8, r.back + 0.02, 7, 2.2, 0);
    else { sign(g, o.name || 'POKER ROOM', '#14100c', '#d8b060', 0, 2.6, r.back + 0.03, 4, 0.6); screen(g, -4, 1.9, r.back + 0.03, 2.4, 1.2, ['#0a2a5a', '#04102a'], 'NLH 1/2 · 2/5 · PLO'); screen(g, 4, 1.9, r.back + 0.03, 2.4, 1.2, ['#5a0a2a', '#2a0410'], 'TOURNAMENT · 7PM'); }
    for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) pokerTable(g, -5 + i * 5, -4.2 - j * 3.2, { felt: o.felt || 0x1f6b45, rail: 0x1a1210, seats: 9, rx: 1.4, rz: 0.8, full: 0.85, shade: 0x1a1a1a, lampColor: 0xfff0d8, lampI: 2 });
    pokerTable(g, 2.2, -1.9, { felt: o.felt || 0x1f6b45, rail: 0x1a1210, seats: 9, rx: 1.4, rz: 0.8, shade: 0x1a1a1a });
    for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) { box(g, 0.5, 0.03, 0.5, glow(0xfff4e0, 2), -6 + i * 4, 3.38, -1.5 - j * 3.5); }
    light(g, 0xfff0d8, 3, -4, 3.2, -3, 9); light(g, 0xfff0d8, 3, 4, 3.2, -3, 9); light(g, 0xfff0d8, 3, 0, 3.2, -7, 9);
    if (o.slots) { slots(g, -7.6, -5, 6, Math.PI / 2); }
    return { exposure: 1.0 };
  },
  casino(g, o) {
    const r = room(g, { w: 18, d: 14, h: 4.2, floor: PAINT.carpet(o.carpet || '#4a0a2a', o.carpet2 || '#7a1a4a', o.carpet3 || '#e8b030'), wall: o.wall || PAINT.damask('#2a0a14', '#3a1020'), ceil: PAINT.plain('#140810') });
    if (o.view) windowOn(g, o.view, 0, 2.2, r.back + 0.02, 10, 3, 0, 0x1a1210);
    if (o.chand !== false) { chandelier(g, -4, 3.7, -4, 1.1, o.chandColor); chandelier(g, 4, 3.7, -4, 1.1, o.chandColor); chandelier(g, 0, 3.7, -7.5, 1.3, o.chandColor); }
    slots(g, -6.5, r.back + 1.2, 7, 0, { colors: o.slotColors }); slots(g, 6.5, r.back + 1.2, 7, 0, { colors: o.slotColors });
    if (o.neon) neon(g, o.neon, o.neonColor || '#ffd84d', 0, 3.5, r.back + 0.05, 80);
    for (let i = 0; i < 3; i++) pokerTable(g, -4.5 + i * 4.5, -4.3, { felt: o.felt || 0x1f6b45, rail: 0x1a0a0a, seats: 9, rx: 1.4, rz: 0.8, full: 0.85, lamp: false });
    pokerTable(g, 2.2, -1.9, { felt: o.felt || 0x1f6b45, rail: 0x1a0a0a, seats: 9, rx: 1.4, rz: 0.8, lamp: false });
    light(g, o.warm || 0xffd8a0, 3, -3, 3.5, -2, 10); light(g, o.warm || 0xffd8a0, 3, 3, 3.5, -2, 10);
    if (o.plants) { plant(g, -8.4, -2, 1.3, true); plant(g, 8.4, -2, 1.3, true); }
    if (o.cowboy) { neon(g, 'SILVER SPUR', '#d8e8ff', -6.5, 3.3, r.back + 0.05, 64); const hat = canvas(256, 128, (x, w, h) => { x.fillStyle = '#c8a050'; x.beginPath(); x.ellipse(w / 2, h * 0.75, 110, 22, 0, 0, 7); x.fill(); x.fillRect(w / 2 - 50, h * 0.25, 100, h * 0.5); }); plane(g, 1.4, 0.7, new THREE.MeshBasicMaterial({ map: tex(hat), transparent: true }), 6.5, 3.3, r.back + 0.05); }
    return { exposure: 1.0 };
  },
  ballroom(g, o) {
    const r = room(g, { w: 24, d: 18, h: 6, floor: PAINT.carpet(o.carpet || '#1a1030', o.carpet2 || '#2a1a50', o.carpet3 || '#c8a050'), wall: PAINT.plain('#0e0a18'), ceil: PAINT.plain('#08060e') });
    tvRig(g, 16, 5.4, -6);
    screen(g, -6, 3.4, r.back + 0.05, 5, 2.8, o.screen || ['#7a0f1c', '#2a0408'], o.title || 'WORLD CHAMPIONSHIP');
    screen(g, 6, 3.4, r.back + 0.05, 5, 2.8, ['#0a2a5a', '#04102a'], 'FEATURE TABLE');
    banner(g, o.banner || 'MAIN EVENT', o.bannerBg || '#7a0f1c', '#ffd84d', 0, 5.2, r.back + 0.05, 8, 1.0);
    // the feature table on its stage, bleachers of people watching
    box(g, 7, 0.4, 4, M({ color: 0x14101c }), 0, 0.2, -9); pokerTable(g, 0, -9, { felt: o.felt || 0x7a0f1c, rail: 0x0a0a0a, seats: 9, rx: 1.6, rz: 0.9, lamp: false, full: 1 }).position.y = 0.4;
    for (let i = 0; i < 4; i++) for (let j = 0; j < 14; j++) { const p = person(g, -8 + j * 1.2 + (i % 2) * 0.6, -12 - i * 0.9, 0); p.position.y = i * 0.5; }
    for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) pokerTable(g, -8 + i * 5.3, -3.2 - j * 3.2, { felt: o.felt2 || 0x1f6b45, rail: 0x0a0a0a, seats: 9, rx: 1.4, rz: 0.8, full: 0.95, lamp: false });
    pokerTable(g, 2.6, -1.4, { felt: o.felt2 || 0x1f6b45, rail: 0x0a0a0a, seats: 9, rx: 1.4, rz: 0.8, lamp: false });
    light(g, 0xfff0dc, 4, -5, 4, -3, 12); light(g, 0xfff0dc, 4, 5, 4, -3, 12);
    return { exposure: 1.05, fog: [0x0e0a18, 8, 24] };
  },
  salon(g, o) {
    const r = room(g, { w: 16, d: 12, h: 5, floor: o.floor || PAINT.wood('#6a3a1a', '#4a2410', 20), wall: o.wall || PAINT.damask('#e8dcc0', '#f4ead4'), wainscot: PAINT.panel('#c8a060', '#e0bc78'), ceil: PAINT.tin('#e8d8b0') });
    windowOn(g, o.view, 0, 2.4, r.back + 0.02, 4, 3.2, 0, 0xc8a060); windowOn(g, o.view2 || o.view, -5, 2.4, r.back + 0.02, 2.2, 3.2, 0, 0xc8a060); windowOn(g, o.view2 || o.view, 5, 2.4, r.back + 0.02, 2.2, 3.2, 0, 0xc8a060);
    curtain(g, -2.4, 2.6, r.back + 0.06, 0.6, 4.2, o.curtain || 0x7a0f1c); curtain(g, 2.4, 2.6, r.back + 0.06, 0.6, 4.2, o.curtain || 0x7a0f1c);
    for (const i of [-1, 1]) { cyl(g, 0.22, 0.22, 5, M({ color: 0xe8dcc0, roughness: 0.4 }), i * 7.4, 2.5, -3, 20); }
    chandelier(g, -3.5, 4.3, -4, 1.3, o.chand); chandelier(g, 3.5, 4.3, -4, 1.3, o.chand); chandelier(g, 0, 4.3, -1.5, 1.0, o.chand);
    frameArt(g, -7.95, 2.6, -3, 1.6, 1.2, Math.PI / 2, ['#3a2a1a', '#c8a050', '#6a4a2a', '#e8dcc0']); frameArt(g, 7.95, 2.6, -3, 1.6, 1.2, -Math.PI / 2, ['#2a3a2a', '#c8a050', '#6a2a1a']);
    pokerTable(g, -3, -5, { felt: o.felt || 0x0e5a43, rail: 0x1a0a04, seats: 8, rx: 1.4, rz: 0.8, lamp: false, full: 0.9 }); pokerTable(g, 3, -5, { felt: o.felt || 0x0e5a43, rail: 0x1a0a04, seats: 8, rx: 1.4, rz: 0.8, lamp: false, full: 0.9 });
    pokerTable(g, 1.6, -2, { felt: o.felt || 0x0e5a43, rail: 0x1a0a04, seats: 8, rx: 1.4, rz: 0.8, lamp: false });
    if (o.palms) { plant(g, -7, -1.5, 1.4, true); plant(g, 7, -1.5, 1.4, true); }
    if (o.lanterns) for (let i = 0; i < 7; i++) lantern(g, -6 + i * 2, 3.8, -6 + (i % 2), 0xff2a1a);
    return { exposure: 1.0 };
  },
  lodge(g, o) {
    const r = room(g, { w: 14, d: 10, h: 4.2, floor: PAINT.wood('#6a4020', '#4a2a14', 30), wall: PAINT.wood('#7a5030', '#5a3a20', 36), ceil: PAINT.wood('#5a3a20', '#3a2410', 50) });
    for (let i = 0; i < 4; i++) box(g, 14, 0.3, 0.3, M({ color: 0x3a2410 }), 0, 4.0, -1 - i * 2.4);
    windowOn(g, o.view || VIEW.mountains({ pines: true, snow: !!o.snow, sky0: '#06102a', sky1: '#3a4a7a' }), -2.5, 2.2, r.back + 0.02, 5, 3, 0, 0x3a2410);
    fireplace(g, 4.2, r.back + 0.32);
    const antl = M({ color: 0xe8dcc0 }); for (let i = 0; i < 6; i++) { const a = cyl(g, 0.02, 0.03, 0.5, antl, 4.2 - 0.6 + i * 0.24, 3.6, r.back + 0.4, 6); a.rotation.z = (i - 2.5) * 0.3; }
    chandelier(g, -1, 3.6, -3, 1, 0xffc070);
    pokerTable(g, -3, -3.8, { felt: 0x24485e, rail: 0x3a2414, seats: 8, rx: 1.3, rz: 0.75, lamp: false, full: 0.85 });
    pokerTable(g, 1.6, -2.2, { felt: 0x24485e, rail: 0x3a2414, seats: 8, rx: 1.3, rz: 0.75, lamp: false });
    light(g, 0xffc890, 2.5, -1, 3, -3, 9);
    return { exposure: 1.0 };
  },
  saloon(g, o) {
    const r = room(g, { w: 14, d: 10, h: 3.6, floor: PAINT.wood('#7a5030', '#5a3a1a', 22), wall: PAINT.wood('#8a5a30', '#6a4020', 40), ceil: PAINT.tin('#3a3028') });
    bar(g, -2, r.back + 1.25, 7, { wood: '#5a3010', crowd: 0.6 });
    const wanted = canvas(128, 160, (x, w, h) => { x.fillStyle = '#e8d8a8'; x.fillRect(0, 0, w, h); x.fillStyle = '#3a2410'; x.font = '900 24px serif'; x.textAlign = 'center'; x.fillText('WANTED', w / 2, 30); x.fillRect(30, 45, 68, 70); x.font = '900 18px serif'; x.fillText('$500', w / 2, 145); });
    if (o.view) { windowOn(g, o.view, 4.2, 1.9, r.back + 0.02, 2.6, 1.6, 0, 0x2a1a0c); for (let i = 0; i < 4; i++) lantern(g, -4 + i * 2.8, 2.7, -2.4, 0xffb040); }
    else for (let i = 0; i < 3; i++) plane(g, 0.5, 0.62, M({ map: tex(wanted) }), 3.2 + i * 0.75, 1.8, r.back + 0.03);
    for (let i = 0; i < 3; i++) chandelier(g, -4 + i * 4, 3.1, -3.5, 0.6, 0xffb860);
    pokerTable(g, 1.4, -2.6, { felt: 0x6b4a1f, rail: 0x3a2010, seats: 7, shade: 0x3a2010, lampColor: 0xffb860 });
    return { exposure: 0.95 };
  },
  riverboat(g, o) {
    const r = room(g, { w: 14, d: 9, h: 3.2, floor: PAINT.carpet('#5a0a14', '#7a1a24', '#c8a050'), wall: PAINT.damask('#3a0a10', '#4a1018'), ceil: PAINT.tin('#e8d8b0') });
    for (let i = 0; i < 4; i++) { windowOn(g, VIEW.river({ moon: i === 1, trees: true }), -4.8 + i * 3.2, 1.7, r.back + 0.02, 1.2, 1.5, 0, 0xc8a050); }
    for (let i = 0; i < 2; i++) chandelier(g, -2.5 + i * 5, 2.8, -3, 0.8);
    pokerTable(g, -3, -3.6, { felt: o.felt || 0x155e75, rail: 0x2a0a0a, seats: 8, rx: 1.3, rz: 0.75, lamp: false, full: 0.85 });
    pokerTable(g, 1.6, -2.1, { felt: o.felt || 0x155e75, rail: 0x2a0a0a, seats: 8, rx: 1.3, rz: 0.75, lamp: false });
    slots(g, 5.6, r.back + 1.4, 3, 0);
    return { exposure: 1.0 };
  },
  expo(g, o) {
    const r = room(g, { w: 30, d: 22, h: 8, floor: PAINT.carpet(o.carpet || '#1a2a4a', o.carpet2 || '#22345a', o.carpet3 || '#c8a050'), wall: PAINT.plain('#14141c'), ceil: PAINT.plain('#0e0e14') });
    for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) { box(g, 1.2, 0.05, 1.2, glow(0xf4f8ff, 1.8), -12 + i * 5, 7.9, -2 - j * 5); }
    light(g, 0xf4f8ff, 5, -6, 7, -4, 18); light(g, 0xf4f8ff, 5, 6, 7, -4, 18); light(g, 0xf4f8ff, 5, 0, 7, -12, 18);
    banner(g, o.banner || 'SUMMER SERIES', o.bannerBg || '#c8102e', '#fff', 0, 6, r.back + 0.05, 12, 1.6);
    screen(g, -9, 4, r.back + 0.05, 6, 3.4, ['#0a2a5a', '#04102a'], 'LEVEL 7 · 400/800');
    screen(g, 9, 4, r.back + 0.05, 6, 3.4, ['#1a5a2a', '#04200a'], o.screen || 'PLAYERS LEFT 4,812');
    for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) pokerTable(g, -12.5 + i * 5, -3.5 - j * 3.6, { felt: 0x1f6b45, rail: 0x0a0a0a, seats: 9, rx: 1.4, rz: 0.8, full: 0.95, lamp: false });
    pokerTable(g, 2.4, -1.4, { felt: 0x1f6b45, rail: 0x0a0a0a, seats: 9, rx: 1.4, rz: 0.8, lamp: false });
    return { exposure: 1.05, fog: [0x14141c, 10, 30] };
  }
};
// which room each place uses, and how it's dressed (the key is what poker.html asks for)
const PLACES = {
  kitchen: ['kitchen'], basement: ['basement'], garage: ['garage'], dining: ['dining'], porch: ['porch'],
  lodge: ['hall', { banner: 'CHARITY POKER NIGHT', honor: true, felt: 0x1f3c6b }], vfw: ['hall', { flags: true, banner: 'POST TOURNAMENT', bannerBg: '#2a3a2a', felt: 0x1f3c6b, floor: 'tile' }],
  firehouse: ['hall', { truck: true, banner: 'FIREFIGHTERS FUNDRAISER', bannerBg: '#7a1a1a', felt: 0x1f3c6b, floor: 'tile' }], rec: ['hall', { banner: 'REC CENTER POKER', bannerBg: '#1a5a6a', floor: 'tile', felt: 0x1f3c6b, wall: PAINT.brick('#c8b8a0', '#a89a88') }],
  countryclub: ['countryclub'], cellar: ['cellar'], backroom: ['backroom'], dragon: ['dragon'], cantina: ['cantina'], diner: ['diner'],
  cardroom: ['cardroom', { name: 'PRAIRIE ROSE CARD CLUB' }], cardriver: ['cardroom', { view: VIEW.river({ moon: true, trees: true }) }], cardharbor: ['cardroom', { view: VIEW.ocean({ yachts: true }) }],
  cardwest: ['cardroom', { carpet: '#4a2a14', carpet2: '#6a3a1a', felt: 0x7a3a1f, slots: true, name: 'LUCKY HORSESHOE' }], cardlake: ['cardroom', { view: VIEW.ocean({ sky2: '#ff7a3a' }), slots: true }],
  cardclub: ['cardroom', { carpet: '#2a1a3a', carpet2: '#3a2a5a', felt: 0x2f5a8a, name: 'NORTHSIDE CARD ROOM' }], cardnugget: ['cardroom', { carpet: '#3a2a10', carpet2: '#5a4214', carpet3: '#e8c050', name: 'GOLD NUGGET', felt: 0x7a3a1f }],
  carddollar: ['cardroom', { carpet: '#3a1010', carpet2: '#5a1a1a', name: 'SILVER DOLLAR CARD CLUB', felt: 0x7a3a1f, slots: true }],
  gulf: ['casino', { view: VIEW.ocean({ sky1: '#2a3a6a', yachts: true }), carpet: '#0e4556', carpet2: '#155e75', felt: 0x155e75, plants: true, neon: 'GULF COAST CLASSIC', neonColor: '#5ad8ff' }],
  reno: ['casino', { cowboy: true, carpet: '#4c3414', carpet2: '#6b4a1f', felt: 0x6b4a1f, chandColor: 0xffc880 }],
  boardwalk: ['casino', { view: VIEW.ocean({ pier: true }), carpet: '#2a1d5a', carpet2: '#3b2a7a', felt: 0x3b2a7a, neon: 'BOARDWALK', neonColor: '#ff5ab0' }],
  chicago: ['casino', { view: VIEW.city({ water: true, tall: 0.8, landmark: LANDMARK.tower }), carpet: '#143a44', carpet2: '#1d4f5c', felt: 0x1d4f5c, chand: false }],
  tahoe: ['casino', { view: VIEW.mountains({ lake: true, pines: true, sky0: '#060c22', sky1: '#2a3a6a' }), carpet: '#14303a', carpet2: '#1d4050', felt: 0x24485e, chandColor: 0xd8e8ff }], aspen: ['lodge', { snow: true }],
  paris: ['salon', { view: VIEW.city({ landmark: LANDMARK.eiffel, towers: 12, tall: 0.25, sky2: '#4a3060' }), view2: VIEW.rooftops({}), felt: 0x4a1f4f, curtain: 0x36163a }],
  monaco: ['salon', { view: VIEW.ocean({ yachts: true, sky2: '#ff8a5a' }), felt: 0x0f3d2e, palms: true }],
  macau: ['salon', { view: VIEW.city({ landmark: LANDMARK.lisboa, water: true, tall: 0.7, lights: ['#ffd84d', '#ff5a3a', '#ff3ad8', '#ffffff'] }), wall: PAINT.damask('#6b1a12', '#7a2418'), floor: PAINT.carpet('#4f130d', '#6b1a12', '#e8b030'), felt: 0x6b1a12, curtain: 0xc8a050, lanterns: true, chand: 0xffd070 }],
  vegasvip: ['salon', { view: VIEW.city({ landmark: LANDMARK.strip, tall: 0.6, sky2: '#6a2a8a' }), wall: PAINT.panel('#1a1c22', '#24262e'), floor: PAINT.carpet('#181b21', '#22262e', '#c8a050'), felt: 0x22262e, curtain: 0x111111 }],
  mainevent: ['ballroom', {}], omahachamp: ['ballroom', { title: 'OMAHA WORLD CHAMPIONSHIP', banner: 'OMAHA CHAMPIONSHIP', bannerBg: '#1c133e', screen: ['#3b2a7a', '#100a2a'], felt: 0x3b2a7a, carpet: '#1c133e', carpet2: '#2a1d5a' }],
  playerschamp: ['ballroom', { title: 'PLAYERS\' CHAMPIONSHIP', banner: 'PLAYERS\' CHAMPIONSHIP', bannerBg: '#0f3d2e', screen: ['#0f3d2e', '#04140e'], felt: 0x0f3d2e, carpet: '#0a2a1e', carpet2: '#0f3d2e' }],
  bayou: ['salon', { view: VIEW.rooftops({}), wall: PAINT.brick('#8a4a3a', '#4a3a34'), floor: PAINT.wood('#4a2a14', '#3a1e0c', 22), felt: 0x155e75, curtain: 0x2a4a3a, chand: 0xffc070 }],
  minetown: ['saloon', { view: VIEW.mountains({ pines: true, sky0: '#081020', sky1: '#30406a' }) }], deadwood: ['saloon'],
  pinewood: ['casino', { view: VIEW.mountains({ pines: true, sky0: '#081020', sky1: '#24304a' }), carpet: '#1f3a24', carpet2: '#2a4a2e', felt: 0x2a5a3a, plants: true, chandColor: 0xfff0c8 }],
  twincities: ['casino', { view: VIEW.city({ water: true, tall: 0.55, sky2: '#6a7aa0', waterTop: '#d8e4f0' }), carpet: '#1a2a3a', carpet2: '#24384a', felt: 0x24485e, chand: false }],
  palmsprings: ['casino', { view: VIEW.desert({ pool: true }), wall: PAINT.stripe('#e8dcc8', '#d8c8b0'), carpet: '#2a6a6a', carpet2: '#3a8a8a', felt: 0x2a6a6a, plants: true, warm: 0xffe0b0 }],
  london: ['salon', { view: VIEW.rooftops({ clock: true }), wall: PAINT.panel('#2a1a10', '#3a2416'), floor: PAINT.carpet('#1a2a1a', '#2a3a2a', '#c8a050'), felt: 0x1a3a2a, curtain: 0x2a3a2a }],
  vienna: ['salon', { view: VIEW.rooftops({ spires: true }), wall: PAINT.damask('#f4f0e8', '#e8e0d4'), felt: 0x4a1f4f, curtain: 0xc8a050 }],
  singapore: ['salon', { view: VIEW.city({ landmark: LANDMARK.marina, water: true, tall: 0.6 }), wall: PAINT.panel('#1a2a2a', '#223434'), floor: PAINT.carpet('#0e2a2a', '#143a3a', '#c8a050'), felt: 0x0e4a4a, curtain: 0x14303a }],
  nassau: ['salon', { view: VIEW.ocean({ palms: true, sky2: '#ff9a5a' }), wall: PAINT.stripe('#f4ece0', '#e8dcc8'), floor: PAINT.tile('#e8dcc8', '#c8b8a0', 8), felt: 0x1a6a8a, palms: true, curtain: 0x2a8a9a }],
  tunica: ['riverboat', { felt: 0x155e75 }],
  miami: ['casino', { view: VIEW.ocean({ palms: true, sky1: '#6a2a8a', sky2: '#ff6ab0' }), carpet: '#1a5a6a', carpet2: '#2a8a9a', felt: 0x1a6a8a, plants: true, neon: 'OCEAN DRIVE', neonColor: '#ff6ab0', slotColors: [0xff6ab0, 0x3ad8ff, 0xffd84d] }],
  seattle: ['casino', { view: VIEW.city({ landmark: LANDMARK.needle, water: true, tall: 0.55, sky2: '#4a5a8a' }), carpet: '#14303a', carpet2: '#1d4050', felt: 0x1d4f5c, chand: false }],
  sedona: ['lodge', { view: VIEW.desert({ rock: '#8a3a1c' }) }],
  prague: ['salon', { view: VIEW.rooftops({ spires: true }), wall: PAINT.damask('#3a1424', '#4a1a2e'), felt: 0x4a1f4f, curtain: 0x6a1a2a }],
  malta: ['salon', { view: VIEW.ocean({ yachts: true, sky1: '#5a3a6a', sky2: '#ffb06a' }), wall: PAINT.plain('#e8d4b0'), floor: PAINT.tile('#d8c4a0', '#c0aa84', 8), felt: 0x0f3d2e, palms: true, curtain: 0x2a4a6a }],
  seoul: ['casino', { view: VIEW.city({ landmark: LANDMARK.neon, tall: 0.75, lights: ['#ff3a8a', '#3ad8ff', '#ffffff', '#ffd84d'] }), carpet: '#2a0a3a', carpet2: '#3a1a5a', felt: 0x3a1a5a, chandColor: 0xd8e8ff, neon: 'SEOUL CUP', neonColor: '#3ad8ff' }],
  series: ['expo', {}], seriesspring: ['expo', { banner: 'SPRING SERIES', bannerBg: '#1f6b45', carpet: '#2a1a3a', carpet2: '#3a2a4a' }], seriesfall: ['expo', { banner: 'FALL SERIES', bannerBg: '#c0561e', carpet: '#3a1a10', carpet2: '#4a2414' }]
};

// the bars: each one its own sign, neon and walls
[['RUSTY ANCHOR', 'Cold Beer', '#3ad8ff', 1], ['COPPER KETTLE', 'Pints', '#ffb030', 0], ['BRASS TAP', 'On Tap', '#ffd84d', 1], ['RED LION', 'Ales', '#ff3a3a', 0],
  ['BLACK DOG', 'Cold Beer', '#ff4ad8', 1], ['SHAMROCK', 'Irish Pub', '#3aff8a', 0], ['TIN CUP', '19th Hole', '#3ad8ff', 0], ['IRON HORSE', 'Whiskey', '#ff8a3a', 1],
  ['BLUE MOOSE', 'Apres Ski', '#3a9aff', 0], ['LUCKY PENNY', 'Karaoke', '#ff4ad8', 1]].forEach((p, i) => { PLACES['pub' + i] = ['pub', { name: p[0], neon: p[1], neonColor: p[2], brick: !!p[3] }]; });

let renderer = null;
const cache = {};
function setup() {
  const c = document.createElement('canvas');
  try { renderer = new THREE.WebGLRenderer({ canvas: c, antialias: true, preserveDrawingBuffer: true }); } catch (e) { return null; }
  renderer.setPixelRatio(1); renderer.setSize(W, H, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.outputColorSpace = THREE.SRGBColorSpace;
  return renderer;
}
function build(key) {
  const def = PLACES[key] || PLACES.cardroom;
  seed = 1; for (let i = 0; i < key.length; i++) seed = (seed * 31 + key.charCodeAt(i)) % 2147483647; seed = seed || 7;
  const scene = new THREE.Scene(), g = new THREE.Group(); scene.add(g);
  const res = SCENES[def[0]](g, def[1] || {}) || {};
  scene.background = new THREE.Color(0x05040a);
  if (res.fog) scene.fog = new THREE.Fog(res.fog[0], res.fog[1], res.fog[2]);
  scene.add(new THREE.AmbientLight(0xffffff, 0.18));
  scene.add(new THREE.HemisphereLight(0xfff4e0, 0x201010, 0.35));
  return { scene, res };
}
async function render(key) {
  if (cache[key]) return cache[key];
  if (!renderer && !setup()) return null;
  const { scene, res } = build(key);
  const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  const cam = new THREE.PerspectiveCamera(52, W / H, 0.05, 60); cam.position.set(0, 1.45, 1.6); cam.lookAt(0, 1.25, -6);
  renderer.toneMappingExposure = res.exposure || 1;
  const composer = new EffectComposer(renderer); composer.addPass(new RenderPass(scene, cam));
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(W, H), 0.42, 0.45, 0.92)); composer.addPass(new OutputPass());
  composer.render();
  const url = renderer.domElement.toDataURL('image/jpeg', 0.86);
  scene.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) [].concat(o.material).forEach(m => { if (m.map) m.map.dispose(); m.dispose(); }); });
  pm.dispose(); composer.dispose && composer.dispose();
  cache[key] = url;
  return url;
}
let queue = Promise.resolve();
window.VenueScene = {
  keys: Object.keys(PLACES),
  // one at a time (they share the renderer), each in its own turn so the page keeps moving
  render(key) { const p = queue.then(() => new Promise(r => setTimeout(r, 0))).then(() => render(key)).catch(() => null); queue = p; return p; }
};
