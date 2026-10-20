// Where you're playing, in 3D (three.js r160): every stop on the circuit has its own room, built from simple
// shapes, painted textures and real light (warm lamps, neon, chandeliers, windows onto the city at night), rendered
// once and kept as a picture: casino tables with a dealer, chips and cards, people with faces and hair and hats,
// shadows and soft contact shading. Two views: the wide shot (a stop's info sheet) and the one from your chair (behind
// the table while you play), each at three stages of an event: busy, thinning out, and the final table. Loaded on demand:
//   window.VenueScene.render(key, { view: 'room' | 'seat', stage: 'busy' | 'thin' | 'final', w, h }) -> Promise<dataURL | null>
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';

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


// ── How the place looks right now ────────────────────────────────────────────────────────────────────────
// V: 'room' (the wide shot on a stop's info sheet) or 'seat' (from your chair at your table: what's behind the table
// while you play; your own table isn't drawn, the game draws that). STAGE: 'busy' (every table going), 'thin' (the
// field has thinned: tables closing), 'final' (the final table: the rest of the room shut down, a rope line and a
// crowd round your table, TV cameras at the big events). TIER: 'local', 'known' or 'big'.
let V = 'room', STAGE = 'busy', TIER = 'local';
let SEAT = null, SPOTS = [], LIGHTS = [], FEAT = null, CHAIRS = 'casino', DEALER = true;
const occ = () => (STAGE === 'busy' ? 0.92 : STAGE === 'thin' ? 0.5 : 0);

// ── Materials and props ──────────────────────────────────────────────────────────────────────────────────
let FABRIC = null;
function fabric() { if (!FABRIC) FABRIC = tex(canvas(64, 64, (x, w, h) => { x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); noise(x, w, h, 0.14, 900); }), 4, 4); return FABRIC; }
function M(o) { return new THREE.MeshStandardMaterial(Object.assign({ roughness: 0.75, metalness: 0, envMapIntensity: 0.4 }, o)); }
function cloth(color, r) { return M({ color, map: fabric(), roughness: r || 0.95 }); }
function glow(color, i) { return new THREE.MeshStandardMaterial({ color: 0x000000, emissive: new THREE.Color(color), emissiveIntensity: i || 2.2 }); }
function box(g, w, h, d, mat, x, y, z, ry) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); if (ry) m.rotation.y = ry; g.add(m); return m; }
function rbox(g, w, h, d, r, mat, x, y, z, ry) { const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, r), mat); m.position.set(x, y, z); if (ry) m.rotation.y = ry; g.add(m); return m; }
function cyl(g, rt, rb, h, mat, x, y, z, seg) { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 20), mat); m.position.set(x, y, z); g.add(m); return m; }
function sph(g, r, mat, x, y, z, seg) { const m = new THREE.Mesh(new THREE.SphereGeometry(r, seg || 18, seg ? Math.max(6, seg * 0.7 | 0) : 12), mat); m.position.set(x, y, z); g.add(m); return m; }
function plane(g, w, h, mat, x, y, z, ry, rx) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(x, y, z); if (ry) m.rotation.y = ry; if (rx) m.rotation.x = rx; g.add(m); return m; }
function light(g, color, intensity, x, y, z, dist) { const l = new THREE.PointLight(color, intensity, dist || 9, 1.6); l.position.set(x, y, z); g.add(l); LIGHTS.push(l); return l; }
// a light straight down onto something (the ones nearest the camera cast shadows)
function spot(g, color, intensity, x, y, z, tx, tz, angle) {
  const s = new THREE.SpotLight(color, intensity, 9, angle || 0.75, 0.55, 1.4);
  s.position.set(x, y, z); s.target.position.set(tx == null ? x : tx, 0, tz == null ? z : tz); g.add(s, s.target); SPOTS.push(s); return s;
}
// a limb: a capsule from point a to point b
const _up = new THREE.Vector3(0, 1, 0);
function limb(g, a, b, r, mat) {
  const A = new THREE.Vector3(a[0], a[1], a[2]), B = new THREE.Vector3(b[0], b[1], b[2]), d = B.clone().sub(A), len = d.length();
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, Math.max(0.001, len), 4, 10), mat);
  m.position.copy(A).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(_up, d.normalize()); g.add(m); return m;
}
// the casino oval: a superellipse (flat sides, round ends)
function ovalPt(rx, rz, a) { const c = Math.cos(a), s = Math.sin(a); return [rx * Math.sign(c) * Math.pow(Math.abs(c), 0.4), rz * Math.sign(s) * Math.pow(Math.abs(s), 0.4)]; }
function ovalShape(rx, rz) { const s = new THREE.Shape(); for (let i = 0; i <= 72; i++) { const p = ovalPt(rx, rz, i / 72 * Math.PI * 2); if (i) s.lineTo(p[0], p[1]); else s.moveTo(p[0], p[1]); } return s; }

// felt, printed with the betting line and the room's name
const FELTS = {};
function feltTex(col, rx, rz, word) {
  const k = col + rx + rz + (word || '');
  if (FELTS[k]) return FELTS[k];
  const W2 = 512, H2 = Math.round(512 * rz / rx), c = canvas(W2, H2, (x, w, h) => {
    const base = new THREE.Color(col);
    const g = x.createRadialGradient(w / 2, h / 2, h * 0.1, w / 2, h / 2, w * 0.6);
    g.addColorStop(0, '#' + base.clone().offsetHSL(0, 0, 0.06).getHexString()); g.addColorStop(1, '#' + base.clone().offsetHSL(0, 0, -0.08).getHexString());
    x.fillStyle = g; x.fillRect(0, 0, w, h); noise(x, w, h, 0.06, 7000);
    x.strokeStyle = 'rgba(255,240,200,.28)'; x.lineWidth = 3; x.beginPath();
    for (let i = 0; i <= 72; i++) { const p = ovalPt(w * 0.36, h * 0.33, i / 72 * Math.PI * 2); if (i) x.lineTo(w / 2 + p[0], h / 2 + p[1]); else x.moveTo(w / 2 + p[0], h / 2 + p[1]); }
    x.stroke();
    if (word) { x.fillStyle = 'rgba(255,240,200,.16)'; x.font = '700 ' + Math.round(h * 0.09) + 'px Georgia, serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(word, w / 2, h * 0.68); }
  });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.repeat.set(1 / (2 * rx), 1 / (2 * rz)); t.offset.set(0.5, 0.5);
  return (FELTS[k] = t);
}
// chips: an edge of coloured spots, a printed top
const CHIPC = [0xb3122b, 0x1d6fa3, 0xf2f2f2, 0x161616, 0x2f7d4f, 0x7a3fb0, 0xe0a020];
const CHIPM = {};
function chipMats(c) {
  if (CHIPM[c]) return CHIPM[c];
  const hex = '#' + new THREE.Color(c).getHexString(), edge = c === 0xf2f2f2 ? '#1d6fa3' : '#ffffff';
  const side = tex(canvas(128, 8, (x, w, h) => { x.fillStyle = hex; x.fillRect(0, 0, w, h); x.fillStyle = edge; for (let i = 0; i < 6; i++) x.fillRect(i * w / 6 + 4, 0, 9, h); }));
  const top = tex(canvas(64, 64, (x, w, h) => { x.fillStyle = hex; x.fillRect(0, 0, w, h); x.strokeStyle = edge; x.lineWidth = 5; x.setLineDash([7, 7]); x.beginPath(); x.arc(32, 32, 28, 0, 7); x.stroke(); x.setLineDash([]); x.lineWidth = 2; x.beginPath(); x.arc(32, 32, 17, 0, 7); x.stroke(); }));
  return (CHIPM[c] = [M({ map: side, roughness: 0.5 }), M({ map: top, roughness: 0.5 }), M({ map: top, roughness: 0.5 })]);
}
function chips(g, x, y, z, n, c) { const h = 0.0034 * n, m = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, h, 18), chipMats(c)); m.position.set(x, y + h / 2, z); g.add(m); return m; }
// cards: a red back with a white border, or a face with a big pip
let CARDB = null; const CARDF = {};
function cardBack() { if (!CARDB) CARDB = M({ map: tex(canvas(64, 90, (x, w, h) => { x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); x.fillStyle = '#a3172a'; x.fillRect(5, 5, w - 10, h - 10); x.strokeStyle = 'rgba(255,255,255,.35)'; x.lineWidth = 1; for (let i = -h; i < w; i += 6) { x.beginPath(); x.moveTo(i, 5); x.lineTo(i + h, h - 5); x.stroke(); } })), roughness: 0.4 }); return CARDB; }
function cardFace(k) {
  if (CARDF[k]) return CARDF[k];
  const suit = '♠♥♦♣'[k % 4], red = k % 4 === 1 || k % 4 === 2, rank = 'A23456789TJQK'[k % 13].replace('T', '10');
  return (CARDF[k] = M({ map: tex(canvas(64, 90, (x, w, h) => { x.fillStyle = '#fbfaf6'; x.fillRect(0, 0, w, h); x.fillStyle = red ? '#c0182c' : '#141414'; x.font = '700 20px Georgia, serif'; x.fillText(rank, 5, 22); x.font = '44px serif'; x.textAlign = 'center'; x.fillText(suit, w / 2, h * 0.75); })), roughness: 0.4 }));
}
function card(g, x, y, z, ry, face) { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.063, 0.088), face == null ? cardBack() : cardFace(face)); m.rotation.set(-Math.PI / 2, 0, ry || 0); m.position.set(x, y, z); g.add(m); return m; }

// ── People ───────────────────────────────────────────────────────────────────────────────────────────────
const SHIRTS = [0x2b3a67, 0x7a2a2a, 0x2f5a3a, 0x444444, 0x8a6a3a, 0x5a3a7a, 0x1f1f24, 0xb0a28a, 0x3a5a8a, 0xc4beb2, 0x6a8aa0, 0x8a2a4a, 0x2a2a2a];
const SKIN = [0xf2c9a8, 0xe0b090, 0xc8946a, 0xa06a44, 0x7a4a2c, 0x5a3420];
const HAIR = [0x1a120c, 0x2a1a10, 0x3a2414, 0x6a4a2a, 0x9a9a9a, 0xc8a060, 0xd8d0c0, 0x5a2a14];
const PANTS = [0x1a1c24, 0x2a3040, 0x3a3a3a, 0x4a3a2a, 0x2a3a5a, 0x5a5a50];
let TORSO = null;
function torsoGeo() { if (!TORSO) TORSO = new THREE.LatheGeometry([[0.001, 0], [0.14, 0.01], [0.155, 0.08], [0.165, 0.22], [0.185, 0.36], [0.2, 0.45], [0.18, 0.51], [0.11, 0.55], [0.05, 0.57]].map(p => new THREE.Vector2(p[0], p[1])), 22); return TORSO; }
// o: { sit (default true), hip (seat height), look: 'casual' | 'pro' | 'smart' | 'dealer' | 'bartender', arms: 'table' | 'down' | 'crossed' | 'bar', lod }
function person(g, x, z, face, o) {
  o = o || {};
  const sit = o.sit !== false, lod = o.lod || 0, look = o.look || pick(['casual', 'casual', 'smart', TIER === 'local' ? 'casual' : 'pro']);
  const p = new THREE.Group(); p.position.set(x, sit ? (o.hip || 0.5) - 0.5 : 0, z); p.rotation.y = face; g.add(p);
  const skin = M({ color: pick(SKIN), roughness: 0.6 }), pants = cloth(pick(PANTS));
  let top = cloth(look === 'dealer' || look === 'bartender' ? 0xd8d4cc : pick(SHIRTS)), arm = top;
  const hipY = sit ? 0.5 : 0.92;
  // legs
  if (sit) {
    for (const sx of [-0.095, 0.095]) { limb(p, [sx, 0.5, 0.02], [sx, 0.5, 0.4], 0.068, pants); if (!lod) { limb(p, [sx, 0.5, 0.42], [sx, 0.1, 0.46], 0.055, pants); rbox(p, 0.1, 0.07, 0.24, 0.03, M({ color: 0x1a1412, roughness: 0.5 }), sx, 0.035, 0.52); } }
  } else for (const sx of [-0.09, 0.09]) { limb(p, [sx, 0.92, 0], [sx, 0.08, 0], 0.065, pants); if (!lod) rbox(p, 0.1, 0.07, 0.25, 0.03, M({ color: 0x1a1412, roughness: 0.5 }), sx, 0.035, 0.05); }
  // body (a lean toward the table when seated)
  const body = new THREE.Group(); body.position.y = hipY; body.rotation.x = sit ? 0.14 : 0; p.add(body);
  const t = new THREE.Mesh(torsoGeo(), top); t.scale.set(1, 1, 0.64); body.add(t);
  if (look === 'dealer' || look === 'bartender') {   // a black vest over the white shirt, and a bow tie
    const vest = new THREE.Mesh(torsoGeo(), cloth(0x15151a, 0.7)); vest.scale.set(1.04, 0.9, 0.67); body.add(vest);
    if (!lod) box(body, 0.06, 0.025, 0.02, M({ color: 0x111111 }), 0, 0.53, 0.115);
  } else if (look === 'smart' && rnd() < 0.6) {      // a jacket
    const jk = new THREE.Mesh(torsoGeo(), cloth(pick([0x23232a, 0x2a3040, 0x4a3a2a, 0x3a3a40]), 0.8)); jk.scale.set(1.05, 0.95, 0.68); body.add(jk); arm = jk.material;
  } else if (look === 'pro' && rnd() < 0.55) {       // a hoodie, hood down
    top = cloth(pick([0x1f1f24, 0x2a2a30, 0x3a4a5a, 0x5a1a1a, 0x2a3a2a])); t.material = top; arm = top;
    const hood = sph(body, 0.11, top, 0, 0.55, -0.1); hood.scale.set(1.2, 0.7, 0.8);
  }
  // arms
  const sh = [0.205, 0.49, 0.0];
  for (const s of [-1, 1]) {
    let el, hd;
    if (!sit) { el = [s * 0.23, 0.22, 0.02]; hd = [s * 0.22, -0.05, 0.05]; if (o.arms === 'crossed') { el = [s * 0.2, 0.25, 0.1]; hd = [-s * 0.08, 0.32, 0.14]; } if (o.arms === 'table') { el = [s * 0.22, 0.25, 0.12]; hd = [s * 0.14, 0.0, 0.42]; } }
    else if (o.arms === 'bar') { el = [s * 0.22, 0.22, 0.14]; hd = [s * 0.12, 0.33, 0.36]; }
    else { el = [s * 0.21, 0.27, 0.18]; hd = [s * (0.1 + rnd() * 0.05), 0.33, 0.4]; }
    limb(body, [s * sh[0], sh[1], sh[2]], el, 0.052, arm);
    limb(body, el, hd, 0.044, arm);
    if (!lod) sph(body, 0.038, skin, hd[0], hd[1], hd[2], 10);
  }
  if (sit && !lod && rnd() < 0.5 && o.arms !== 'bar') { const c1 = new THREE.Mesh(new THREE.PlaneGeometry(0.063, 0.088), cardBack()); c1.position.set(0, 0.36, 0.42); c1.rotation.set(-1.1, 0, 0.1); body.add(c1); }
  // head
  const hy = 0.66;
  cyl(body, 0.048, 0.055, 0.1, skin, 0, 0.6, 0.0, 12);
  const head = sph(body, 0.1, skin, 0, hy, 0.02, 20); head.scale.set(0.88, 1.1, 0.98);
  if (!lod) {
    for (const s of [-1, 1]) { const ear = sph(body, 0.022, skin, s * 0.087, hy, 0.01, 8); ear.scale.set(0.5, 1, 0.8); }
    const nose = sph(body, 0.02, skin, 0, hy - 0.01, 0.115, 8); nose.scale.set(0.8, 1, 1.2);
    const eye = M({ color: 0x15100c, roughness: 0.3 });
    if (look === 'pro' && rnd() < 0.4) rbox(body, 0.15, 0.035, 0.02, 0.01, M({ color: 0x0a0a0c, roughness: 0.1, metalness: 0.6 }), 0, hy + 0.02, 0.105);   // sunglasses
    else for (const s of [-1, 1]) sph(body, 0.012, eye, s * 0.032, hy + 0.02, 0.1, 8);
  }
  // hair, hats, headphones
  const hc = M({ color: pick(HAIR), roughness: 0.85 }), r = rnd();
  if (r < 0.62) { const hr = sph(body, 0.104, hc, 0, hy + 0.035, 0.0, 16); hr.scale.set(0.92, 0.72, 1.0); if (r < 0.22) { const lg = rbox(body, 0.17, 0.2, 0.07, 0.03, hc, 0, hy - 0.07, -0.07); lg.rotation.x = 0.1; } }
  else if (r < 0.8 || (look === 'pro' && r < 0.9)) {
    const cap = M({ color: pick([0x1a3a6a, 0x6a1a1a, 0x222222, 0xd8d0c0, 0x2a4a2a]), roughness: 0.8 });
    const c = sph(body, 0.106, cap, 0, hy + 0.04, 0.0, 16); c.scale.set(0.95, 0.68, 1.02);
    const back = rnd() < 0.3; const brim = cyl(body, 0.08, 0.08, 0.012, cap, 0, hy + 0.03, back ? -0.13 : 0.13, 16); brim.scale.z = 0.7;
  }
  if (look === 'pro' && rnd() < 0.35) { const hp = M({ color: 0x111114, roughness: 0.4 }); const band = new THREE.Mesh(new THREE.TorusGeometry(0.105, 0.012, 6, 20, Math.PI), hp); band.position.set(0, hy, 0.01); band.rotation.y = Math.PI / 2; body.add(band); for (const s of [-1, 1]) { const cup = cyl(body, 0.04, 0.04, 0.03, hp, s * 0.1, hy - 0.005, 0.01, 14); cup.rotation.z = Math.PI / 2; } }
  return p;
}
// a casino chair: padded seat and back, arms, a chrome base
function chair(g, x, z, ry, col, pushed) {
  const c = new THREE.Group(); c.position.set(x, 0, z); c.rotation.y = ry; g.add(c);
  if (CHAIRS === 'wood') {   // a wooden chair: spindle back, a seat pad
    const wd = M({ map: tex(PAINT.wood('#6a4020', '#4a2a14', 10), 1, 1), roughness: 0.5 });
    rbox(c, 0.44, 0.05, 0.42, 0.015, wd, 0, 0.46, 0); rbox(c, 0.4, 0.04, 0.38, 0.02, cloth(col || 0x6a1a1a, 0.8), 0, 0.5, 0.01);
    for (const sx of [-0.19, 0.19]) for (const sz of [-0.18, 0.18]) cyl(c, 0.018, 0.016, 0.46, wd, sx, 0.23, sz, 8);
    for (const sx of [-0.19, 0.19]) cyl(c, 0.02, 0.02, 0.52, wd, sx, 0.74, -0.19, 8);
    rbox(c, 0.42, 0.08, 0.03, 0.01, wd, 0, 0.97, -0.19); for (let i = -1; i <= 1; i++) cyl(c, 0.01, 0.01, 0.42, wd, i * 0.1, 0.72, -0.19, 6);
    return c;
  }
  if (CHAIRS === 'folding') {   // a metal folding chair
    const mt = M({ color: col || 0x4a4c52, metalness: 0.7, roughness: 0.35 });
    rbox(c, 0.42, 0.04, 0.4, 0.015, mt, 0, 0.45, 0); rbox(c, 0.4, 0.2, 0.025, 0.01, mt, 0, 0.8, -0.2);
    for (const sx of [-0.19, 0.19]) { const a = cyl(c, 0.012, 0.012, 0.95, mt, sx, 0.46, -0.06, 6); a.rotation.x = 0.28; const b = cyl(c, 0.012, 0.012, 0.6, mt, sx, 0.3, 0.06, 6); b.rotation.x = -0.35; }
    return c;
  }
  const up = M({ color: col || 0x2a1a14, roughness: 0.55, map: fabric() }), chrome = M({ color: 0xb8bcc4, metalness: 0.9, roughness: 0.25 });
  rbox(c, 0.46, 0.1, 0.44, 0.04, up, 0, 0.47, 0);
  const back = rbox(c, 0.44, 0.44, 0.08, 0.04, up, 0, 0.77, -0.21); back.rotation.x = -0.12;
  for (const s of [-1, 1]) { rbox(c, 0.06, 0.05, 0.32, 0.02, up, s * 0.25, 0.66, -0.02); cyl(c, 0.012, 0.012, 0.16, chrome, s * 0.25, 0.58, 0.08, 6); }
  cyl(c, 0.03, 0.03, 0.36, chrome, 0, 0.24, 0, 8);
  for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; const leg = box(c, 0.03, 0.025, 0.26, chrome, Math.sin(a) * 0.12, 0.04, Math.cos(a) * 0.12); leg.rotation.y = a; }
  return c;
}
// a person standing to watch (on the rail, at the bar)
function stander(g, x, z, face, o) { return person(g, x, z, face, Object.assign({ sit: false, arms: rnd() < 0.4 ? 'crossed' : 'down' }, o)); }

// ── The poker table ──────────────────────────────────────────────────────────────────────────────────────
// a casino oval: wood apron, a padded rail, printed felt, a dealer, players with chips and cards. o.mine: your table
// (in the seat view it isn't drawn; at the final table it gets the crowd). Closed tables (fewer players left, or the
// final table elsewhere): empty chairs pushed in, a cover over the felt, its light off.
function pokerTable(g, x, z, o) {
  o = o || {};
  const t = new THREE.Group(); t.position.set(x, o.y || 0, z); t.rotation.y = o.ry || 0;
  const rx = o.rx || 1.25, rz = o.rz || 0.7, n = o.seats || 8;
  if (o.mine) {
    SEAT = { x, z, rx, rz, y: o.y || 0, face: o.y ? 1 : -1 }; FEAT = t;
    if (V === 'seat') {   // your table is the game's: just its light (and lamp) over you
      g.add(t);
      if (o.lamp !== false) { const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.48, 0.28, 32, 1, true), M({ color: o.shade || 0x1d3a24, side: THREE.DoubleSide, roughness: 0.5, metalness: 0.2 })); shade.position.y = 2.1; t.add(shade); }
      const s = spot(t, o.lampColor || 0xfff0d8, STAGE === 'final' ? 11 : 6.5, 0, o.lamp !== false ? 1.95 : (o.ceil || 3.2) - 0.1, 0, 0, 0, 0.8); s.target.position.set(x, 0, z); g.add(s.target);
      return t;
    }
  }
  g.add(t);
  const closed = !o.mine && (STAGE === 'final' || (STAGE === 'thin' && rnd() < 0.45));
  const full = o.mine ? (STAGE === 'final' ? 1 : 0.85) : (o.full || 0.85) * occ() / 0.92;
  const wood = M({ map: tex(PAINT.wood(o.wood || '#5a3418', o.wood2 || '#3a200c', 14), 2, 1), roughness: 0.35, envMapIntensity: 0.8 });
  const ap = new THREE.Mesh(new THREE.ExtrudeGeometry(ovalShape(rx + 0.22, rz + 0.22), { depth: 0.1, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 2, curveSegments: 6 }), wood);
  ap.rotation.x = Math.PI / 2; ap.position.y = 0.76; t.add(ap);
  const felt = new THREE.Mesh(new THREE.ShapeGeometry(ovalShape(rx, rz), 6), M({ map: feltTex(o.felt || 0x1f6b45, rx, rz, o.word), roughness: 0.95, envMapIntensity: 0.15 }));
  felt.rotation.x = -Math.PI / 2; felt.position.y = 0.785; t.add(felt);
  const rail = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(Array.from({ length: 64 }, (_, i) => { const p = ovalPt(rx + 0.12, rz + 0.12, i / 64 * Math.PI * 2); return new THREE.Vector3(p[0], 0.8, p[1]); }), true), 128, 0.075, 10, true),
    M({ color: o.rail || 0x15100e, roughness: 0.42, envMapIntensity: 0.6 }));
  t.add(rail);
  const legs = rx > 1 ? [-rx * 0.45, rx * 0.45] : [0];
  legs.forEach(lx => { cyl(t, 0.1, 0.12, 0.66, M({ color: 0x141012, roughness: 0.5 }), lx, 0.36, 0, 16); cyl(t, 0.3, 0.32, 0.04, M({ color: 0x141012, roughness: 0.5 }), lx, 0.02, 0, 24); });
  if (closed) {   // a cover over the felt
    const cov = new THREE.Mesh(new THREE.ExtrudeGeometry(ovalShape(rx + 0.3, rz + 0.3), { depth: 0.03, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.03, bevelSegments: 3 }), cloth(0x3a3f3c, 0.9));
    cov.rotation.x = Math.PI / 2; cov.position.y = 0.9; t.add(cov);
  }
  // seats round the oval, leaving the dealer's place in the middle of the far side
  const gap = 0.95, chairC = o.chair || 0x2a1a14;
  for (let i = 0; i < n; i++) {
    const a = Math.PI * 1.5 + gap / 2 + i * (Math.PI * 2 - gap) / (n - 1);
    const sp = ovalPt(rx + 0.55, rz + 0.55, a), face = Math.atan2(-sp[0], -sp[1]);
    const on = !closed && rnd() < full;
    const push = on ? 0 : 0.12, cp = ovalPt(rx + 0.62 - push, rz + 0.62 - push, a);
    chair(t, cp[0], cp[1], face, chairC);
    if (!on) continue;
    person(t, sp[0], sp[1], face, { lod: Math.abs(z) > 9 ? 1 : 0, look: o.look });
    const cpt = ovalPt(rx - 0.2, rz - 0.18, a), ct = ovalPt(rx - 0.42, rz - 0.36, a);
    for (let k = 0; k < 1 + (rnd() * 3 | 0); k++) chips(t, cpt[0] + (k - 1) * 0.045, 0.787, cpt[1], 4 + (rnd() * 16 | 0), pick(CHIPC));
    if (rnd() < 0.7) { card(t, ct[0] - 0.02, 0.788, ct[1], face, null); card(t, ct[0] + 0.02, 0.789, ct[1], face + 0.15, null); }
  }
  if (!closed && (o.dealer != null ? o.dealer : DEALER)) {
    const dp = ovalPt(rx + 0.4, rz + 0.4, Math.PI * 1.5);
    person(t, dp[0], dp[1], Math.atan2(-dp[0], -dp[1]), { sit: false, look: 'dealer', arms: 'table', lod: Math.abs(z) > 9 ? 1 : 0 });
    rbox(t, 0.5, 0.04, 0.14, 0.01, M({ color: 0x0a0a0a, roughness: 0.3 }), 0, 0.8, -rz + 0.12);
    for (let k = 0; k < 8; k++) chips(t, -0.21 + k * 0.06, 0.79, -rz + 0.12, 12 + (rnd() * 8 | 0), CHIPC[k % CHIPC.length]);
    const nb = rnd() < 0.5 ? 3 : 5; for (let k = 0; k < nb; k++) card(t, -0.16 + k * 0.075, 0.789, -0.05, 0, (rnd() * 52) | 0);
    for (let k = 0; k < 4; k++) chips(t, 0.03 * (k - 1.5), 0.787, 0.12 + (k % 2) * 0.03, 3 + (rnd() * 12 | 0), pick(CHIPC));
  }
  // its light: a lamp over it, or a spot from the ceiling
  const lit = !closed;
  if (o.lamp !== false) {
    const lc = o.lampColor || 0xffd9a0, shadeM = M({ color: o.shade || 0x1d3a24, side: THREE.DoubleSide, roughness: 0.5, metalness: 0.2 });
    const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.48, 0.28, 32, 1, true), shadeM); shade.position.y = 2.1; t.add(shade);
    cyl(t, 0.005, 0.005, 1.2, M({ color: 0x111111 }), 0, 2.8, 0, 4);
    if (lit) { const d = new THREE.Mesh(new THREE.CircleGeometry(0.46, 32), glow(lc, 1.6)); d.rotation.x = Math.PI / 2; d.position.y = 1.97; t.add(d); }
  }
  if (lit) { const s = spot(t, o.lampColor || 0xfff0d8, (o.lampI || 1) * (o.mine && STAGE === 'final' ? 11 : 6.5), 0, o.lamp !== false ? 1.95 : (o.ceil || 3.2) - 0.1, 0, 0, 0, 0.8); s.target.position.set(x, 0, z); g.add(s.target); }
  return t;
}
// a bar: counter, stools, a lit back bar of bottles and glasses, beer taps, a bartender
let BOTTLE = null;
function bottleGeo() { if (!BOTTLE) BOTTLE = new THREE.LatheGeometry([[0.001, 0], [0.038, 0.002], [0.04, 0.02], [0.04, 0.2], [0.03, 0.24], [0.014, 0.27], [0.013, 0.33], [0.016, 0.335], [0.001, 0.34]].map(p => new THREE.Vector2(p[0], p[1])), 12); return BOTTLE; }
function bar(g, x, z, len, o) {
  o = o || {};
  const b = new THREE.Group(); b.position.set(x, 0, z); b.rotation.y = o.ry || 0; g.add(b);
  const wood = M({ map: tex(PAINT.wood(o.wood || '#5a2e16', o.wood2 || '#3a1a0c', 18), 2, 1), roughness: 0.4 });
  rbox(b, len, 1.05, 0.6, 0.03, wood, 0, 0.52, 0); rbox(b, len + 0.1, 0.06, 0.78, 0.02, M({ color: o.top || 0x2a140a, roughness: 0.18, metalness: 0.1, envMapIntensity: 1 }), 0, 1.08, 0);
  box(b, len, 0.04, 0.04, M({ color: 0xc8a050, metalness: 0.9, roughness: 0.25 }), 0, 0.22, 0.38);
  // back bar: cabinet, shelves lit from below, bottles, a mirror
  box(b, len, 1.0, 0.45, wood, 0, 0.5, -1.15); box(b, len + 0.1, 0.05, 0.5, M({ color: 0x1a0f08, roughness: 0.3 }), 0, 1.02, -1.15);
  if (o.mirror !== false) plane(b, len - 0.2, 1.3, M({ color: 0x8090a0, metalness: 0.95, roughness: 0.08, envMapIntensity: 1.2 }), 0, 1.8, -1.36);
  const bm = [0x3a7a3a, 0x8a4a1a, 0xc8a050, 0x2a4a8a, 0xd8d8d0, 0x6a1a1a, 0x1a1a1a, 0x5a8a2a].map(c => new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.08, metalness: 0, transmission: 0.25, thickness: 0.02, emissive: new THREE.Color(c), emissiveIntensity: 0.12, envMapIntensity: 1.2 }));
  for (let s = 0; s < 3; s++) {
    const y = 1.12 + s * 0.42;
    box(b, len - 0.2, 0.03, 0.3, M({ color: 0x3a2414, roughness: 0.4 }), 0, y, -1.2);
    box(b, len - 0.25, 0.012, 0.02, glow(0xffc070, 1.4), 0, y - 0.02, -1.06);
    for (let i = 0; i < (len - 0.3) / 0.1; i++) { const bt = new THREE.Mesh(bottleGeo(), pick(bm)); const sc = 0.85 + rnd() * 0.4; bt.scale.set(1, sc, 1); bt.position.set(-len / 2 + 0.2 + i * 0.1, y + 0.015, -1.2 + (rnd() - 0.5) * 0.08); b.add(bt); }
  }
  for (let i = 0; i < len / 1.4; i++) light(b, 0xffc880, 0.8, -len / 2 + 0.7 + i * 1.4, 2.3, -0.9, 2.6);
  // taps, glasses on the counter
  for (let i = 0; i < 6; i++) { cyl(b, 0.016, 0.016, 0.3, M({ color: 0xc0c0c8, metalness: 0.9, roughness: 0.2 }), -0.75 + i * 0.3, 1.25, -0.12, 8); rbox(b, 0.04, 0.12, 0.04, 0.01, M({ color: pick([0x1a1a1a, 0x6a1a1a, 0x2a4a2a, 0xc8a050]) }), -0.75 + i * 0.3, 1.45, -0.1); }
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.05, transmission: 0.9, thickness: 0.01, transparent: true, opacity: 0.5 });
  const beer = M({ color: 0xd88a1a, roughness: 0.2, emissive: 0x5a2a00, emissiveIntensity: 0.3 });
  // the bartender, the stools and who's on them
  stander(b, rnd() * len * 0.5 - len * 0.25, -0.55, 0, { look: 'bartender', arms: 'table' });
  for (let i = 0; i < len / 0.85; i++) {
    const sx = -len / 2 + 0.45 + i * 0.85;
    cyl(b, 0.2, 0.18, 0.08, cloth(o.stool || 0x6a1a1a, 0.6), sx, 0.8, 0.72, 20); cyl(b, 0.025, 0.03, 0.76, M({ color: 0x2a2a2a, metalness: 0.7, roughness: 0.3 }), sx, 0.4, 0.72, 8);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.012, 6, 20), M({ color: 0x2a2a2a, metalness: 0.7 })); ring.rotation.x = Math.PI / 2; ring.position.set(sx, 0.3, 0.72); b.add(ring);
    if (rnd() < (o.crowd || 0.45) * (STAGE === 'final' ? 0.5 : 1)) {
      person(b, sx, 0.72, Math.PI, { hip: 0.86, arms: 'bar' });
      cyl(b, 0.035, 0.03, 0.14, glass, sx + 0.1, 1.18, 0.25, 12); cyl(b, 0.03, 0.026, 0.1, beer, sx + 0.1, 1.16, 0.25, 12);
    }
  }
  return b;
}
function neon(g, text, color, x, y, z, size, ry) {
  const wide = text.length > 8, c = canvas(wide ? 1024 : 512, 128, (cx, w, h) => { let fs = size || 72; do { cx.font = '900 ' + fs + 'px "Brush Script MT", "Segoe Script", Georgia, serif'; fs -= 3; } while (cx.measureText(text).width > w - 50 && fs > 16); cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.shadowColor = color; cx.shadowBlur = 20; cx.fillStyle = color; cx.fillText(text, w / 2, h / 2); cx.fillStyle = '#fff'; cx.shadowBlur = 0; cx.globalAlpha = 0.6; cx.fillText(text, w / 2, h / 2); });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(wide ? 4 : 2, 0.5), new THREE.MeshBasicMaterial({ map: tex(c), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  m.position.set(x, y, z); if (ry) m.rotation.y = ry; g.add(m); light(g, color, 1.2, x, y, z + 0.4, 3); return m;
}
function sign(g, text, bg, fg, x, y, z, w, h, ry) {
  const c = canvas(512, Math.round(512 * h / w), (cx, cw, ch) => { cx.fillStyle = bg; cx.fillRect(0, 0, cw, ch); cx.strokeStyle = fg; cx.globalAlpha = 0.5; cx.lineWidth = 3; cx.strokeRect(6, 6, cw - 12, ch - 12); cx.globalAlpha = 1; cx.fillStyle = fg; let fs = Math.round(ch * 0.42); do { cx.font = '800 ' + fs + 'px Georgia, serif'; fs -= 2; } while (cx.measureText(text).width > cw * 0.86 && fs > 8); cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillText(text, cw / 2, ch / 2); });
  const m = box(g, w, h, 0.05, [M({ color: bg }), M({ color: bg }), M({ color: bg }), M({ color: bg }), M({ map: tex(c), roughness: 0.5 }), M({ color: bg })], x, y, z, ry);
  return m;
}
function frameArt(g, x, y, z, w, h, ry, palette) {
  const c = canvas(256, Math.round(256 * h / w), (cx, cw, ch) => {
    const p = palette || ['#2a3a5a', '#c8a050', '#7a2a2a', '#3a6a4a', '#e8dcc0'];
    const gg = cx.createLinearGradient(0, 0, 0, ch); gg.addColorStop(0, p[0]); gg.addColorStop(1, p[p.length - 1]); cx.fillStyle = gg; cx.fillRect(0, 0, cw, ch);
    for (let i = 0; i < 26; i++) { cx.fillStyle = pick(p); cx.globalAlpha = 0.35 + rnd() * 0.3; cx.beginPath(); cx.ellipse(rnd() * cw, rnd() * ch, 6 + rnd() * 50, 6 + rnd() * 30, rnd() * 3, 0, 7); cx.fill(); }
    cx.globalAlpha = 1; noise(cx, cw, ch, 0.1, 2500);
  });
  const fm = M({ color: 0x8a6a2a, metalness: 0.7, roughness: 0.35, envMapIntensity: 1 });
  const grp = new THREE.Group(); grp.position.set(x, y, z); if (ry) grp.rotation.y = ry; g.add(grp);
  rbox(grp, w + 0.14, h + 0.14, 0.05, 0.015, fm, 0, 0, 0); plane(grp, w, h, M({ map: tex(c), roughness: 0.6 }), 0, 0, 0.03);
  const sc = new THREE.Group(); sc.position.set(0, h / 2 + 0.12, 0.08); grp.add(sc); cyl(sc, 0.02, 0.04, 0.06, fm, 0, 0, 0, 8);   // a picture light
  light(grp, 0xffe0b0, 0.35, 0, h / 2, 0.3, 1.4);
}
function chandelier(g, x, y, z, s, color) {
  const c = new THREE.Group(); c.position.set(x, y, z); c.scale.setScalar(s || 1); g.add(c);
  const gold = M({ color: 0xc8a050, metalness: 0.95, roughness: 0.2, envMapIntensity: 1.2 });
  const crystal = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0, transmission: 0.85, thickness: 0.02, emissive: 0xfff4d0, emissiveIntensity: 0.5, envMapIntensity: 1.5 });
  cyl(c, 0.02, 0.02, 0.6, gold, 0, 0.3, 0, 6); sph(c, 0.08, gold, 0, -0.05, 0);
  for (let ring = 0; ring < 3; ring++) {
    const r = 0.62 - ring * 0.2, n = 14 - ring * 4;
    const tor = new THREE.Mesh(new THREE.TorusGeometry(r, 0.016, 8, 48), gold); tor.rotation.x = Math.PI / 2; tor.position.y = -ring * 0.2; c.add(tor);
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; cyl(c, 0.012, 0.012, 0.08, M({ color: 0xf8f2e0 }), Math.cos(a) * r, -ring * 0.2 + 0.05, Math.sin(a) * r, 6); sph(c, 0.028, glow(color || 0xfff0c8, 3.4), Math.cos(a) * r, -ring * 0.2 + 0.11, Math.sin(a) * r, 8); for (let k = 0; k < 3; k++) { const d = new THREE.Mesh(new THREE.OctahedronGeometry(0.018), crystal); d.position.set(Math.cos(a) * r, -ring * 0.2 - 0.05 - k * 0.06, Math.sin(a) * r); d.scale.y = 1.6; c.add(d); } }
  }
  light(c, color || 0xffe8c0, 4, 0, -0.2, 0, 7);
}
function pendant(g, x, y, z, color, shadeColor) { cyl(g, 0.006, 0.006, 3, M({ color: 0x111111 }), x, y + 1.5, z, 4); const s = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.28, 0.24, 24, 1, true), M({ color: shadeColor || 0x2a2a2a, side: THREE.DoubleSide, metalness: 0.4, roughness: 0.4 })); s.position.set(x, y, z); g.add(s); sph(g, 0.06, glow(color || 0xffd9a0, 3), x, y - 0.08, z); light(g, color || 0xffd9a0, 2, x, y - 0.2, z, 4); return s; }
function stringLights(g, x0, x1, y, z, sag, color) { const n = 26, pts = []; for (let i = 0; i <= n; i++) { const t = i / n, x = x0 + (x1 - x0) * t, yy = y - Math.sin(t * Math.PI) * sag; pts.push(new THREE.Vector3(x, yy + 0.04, z)); sph(g, 0.045, glow(color || pick([0xffd38a, 0xfff0c0]), 3.5), x, yy, z); if (i % 6 === 0) light(g, 0xffd38a, 0.7, x, yy - 0.1, z, 2.5); } g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.006, 4), M({ color: 0x111111 }))); }
function slots(g, x, z, n, ry, o) {
  o = o || {};
  const grp = new THREE.Group(); grp.position.set(x, 0, z); grp.rotation.y = ry || 0; g.add(grp);
  for (let i = 0; i < n; i++) {
    const sx = (i - (n - 1) / 2) * 0.74, col = pick(o.colors || [0xff3a6a, 0x3ad8ff, 0xffd84d, 0xa24aff, 0x3aff8a]);
    rbox(grp, 0.64, 1.0, 0.56, 0.05, M({ color: 0x1a1a24, metalness: 0.6, roughness: 0.3 }), sx, 0.5, 0);
    rbox(grp, 0.6, 0.9, 0.36, 0.05, M({ color: 0x22222e, metalness: 0.5, roughness: 0.3 }), sx, 1.4, -0.08);
    const scr = canvas(128, 160, (cx, w, h) => { const gg = cx.createLinearGradient(0, 0, 0, h); gg.addColorStop(0, '#' + new THREE.Color(col).getHexString()); gg.addColorStop(1, '#10101a'); cx.fillStyle = gg; cx.fillRect(0, 0, w, h); cx.fillStyle = '#fff'; cx.font = '900 30px sans-serif'; cx.textAlign = 'center'; cx.fillText(pick(['777', 'BAR', '$$$', 'WIN', '★★★']), w / 2, h * 0.55); });
    plane(grp, 0.5, 0.62, new THREE.MeshBasicMaterial({ map: tex(scr) }), sx, 1.42, 0.105);
    box(grp, 0.5, 0.14, 0.04, glow(col, 2.5), sx, 1.95, -0.06);
    rbox(grp, 0.5, 0.05, 0.22, 0.02, M({ color: 0x0a0a10, roughness: 0.3 }), sx, 1.0, 0.26);
    const stool = cyl(grp, 0.18, 0.18, 0.07, cloth(0x6a1a1a, 0.6), sx, 0.68, 0.62, 18); cyl(grp, 0.025, 0.03, 0.66, M({ color: 0x2a2a2a, metalness: 0.7 }), sx, 0.33, 0.62, 8);
    if (rnd() < 0.45 * occ() / 0.92 + 0.1) person(grp, sx, 0.62, Math.PI, { hip: 0.72, arms: 'bar', lod: 1 });
  }
  light(grp, 0xff8ad8, 1.4, 0, 1.8, 0.8, 4);
}
function fireplace(g, x, z, ry) {
  const f = new THREE.Group(); f.position.set(x, 0, z); f.rotation.y = ry || 0; g.add(f);
  const stone = M({ map: tex(PAINT.brick('#7a7068', '#3a3430'), 1, 1), roughness: 0.9 });
  box(f, 2.2, 3.2, 0.6, stone, 0, 1.6, 0); box(f, 1.2, 0.9, 0.62, M({ color: 0x0a0806 }), 0, 0.6, 0.02);
  for (let i = 0; i < 3; i++) { const lg = cyl(f, 0.07, 0.07, 0.8, M({ color: 0x3a2414, roughness: 0.9 }), 0, 0.22 + i * 0.07, 0.15 - i * 0.05, 10); lg.rotation.z = Math.PI / 2; lg.rotation.y = (i - 1) * 0.3; }
  plane(f, 1.0, 0.6, new THREE.MeshBasicMaterial({ map: tex(canvas(128, 96, (cx, w, h) => { const gg = cx.createRadialGradient(w / 2, h, 4, w / 2, h, h); gg.addColorStop(0, '#fff2a0'); gg.addColorStop(0.4, '#ff9a20'); gg.addColorStop(1, 'rgba(120,20,0,0)'); cx.fillStyle = '#000'; cx.fillRect(0, 0, w, h); cx.fillStyle = gg; for (let i = 0; i < 7; i++) { cx.beginPath(); const fx = 20 + i * 14; cx.moveTo(fx - 12, h); cx.quadraticCurveTo(fx, h * 0.1 + rnd() * 30, fx + 12, h); cx.fill(); } })), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }), 0, 0.45, 0.34);
  light(f, 0xff8a30, 3.5, 0, 0.6, 0.8, 6);
  rbox(f, 2.4, 0.12, 0.8, 0.02, M({ color: 0x3a2414, roughness: 0.5 }), 0, 1.15, 0.1);
  for (let i = 0; i < 3; i++) cyl(f, 0.05, 0.06, 0.2 + rnd() * 0.15, M({ color: pick([0xc8a050, 0xe8e0d0, 0x2a4a6a]), metalness: 0.4, roughness: 0.4 }), -0.7 + i * 0.7, 1.3, 0.15, 12);
}
function shelves(g, x, z, w, h, ry, kind) {
  const s = new THREE.Group(); s.position.set(x, 0, z); s.rotation.y = ry || 0; g.add(s);
  box(s, w, h, 0.4, M({ color: 0x2a1a10 }), 0, h / 2, -0.05);
  const rows = Math.floor(h / 0.38);
  for (let r = 0; r < rows; r++) {
    box(s, w - 0.04, 0.025, 0.36, M({ color: 0x3a2414 }), 0, 0.04 + r * 0.38, 0.02);
    for (let i = 0; i < w / 0.06; i++) {
      if (kind === 'wine') { const b = cyl(s, 0.035, 0.035, 0.3, M({ color: pick([0x1a2a12, 0x3a0a10, 0x1a1a1a]), roughness: 0.15, envMapIntensity: 1 }), -w / 2 + 0.06 + i * 0.075, 0.12 + r * 0.38, 0.1, 10); b.rotation.x = Math.PI / 2; i += 0.25; }
      else box(s, 0.045, 0.22 + rnd() * 0.1, 0.24, cloth(pick([0x6a1a1a, 0x1a3a6a, 0x2a4a2a, 0x8a6a3a, 0x3a2a4a, 0xc8b890]), 0.8), -w / 2 + 0.05 + i * 0.055, 0.17 + r * 0.38, 0.05);
    }
  }
}
function lantern(g, x, y, z, color) { cyl(g, 0.005, 0.005, 1, M({ color: 0x111111 }), x, y + 0.6, z, 4); const l = sph(g, 0.22, glow(color || 0xff2a1a, 1.8), x, y, z); l.scale.set(1, 1.2, 1); for (let i = 0; i < 6; i++) { const rib = new THREE.Mesh(new THREE.TorusGeometry(0.222, 0.004, 4, 24), M({ color: 0x5a1a10 })); rib.position.set(x, y, z); rib.rotation.y = i / 6 * Math.PI; rib.scale.y = 1.2; g.add(rib); } cyl(g, 0.1, 0.1, 0.06, M({ color: 0xc8a050, metalness: 0.8 }), x, y + 0.28, z); cyl(g, 0.1, 0.1, 0.06, M({ color: 0xc8a050, metalness: 0.8 }), x, y - 0.28, z); light(g, color || 0xff4a2a, 1.2, x, y - 0.2, z, 3); }
function plant(g, x, z, s, palm) {
  const p = new THREE.Group(); p.position.set(x, 0, z); p.scale.setScalar(s || 1); g.add(p);
  const pot = new THREE.Mesh(new THREE.LatheGeometry([[0.001, 0], [0.17, 0], [0.22, 0.38], [0.24, 0.42], [0.001, 0.42]].map(q => new THREE.Vector2(q[0], q[1])), 20), M({ color: 0x5a3a2a, roughness: 0.6 })); p.add(pot);
  const leaf = M({ color: 0x2a5a2a, side: THREE.DoubleSide, roughness: 0.7 });
  if (palm) { cyl(p, 0.05, 0.07, 1.8, M({ color: 0x6a5030, roughness: 0.9 }), 0, 1.3, 0, 8); for (let i = 0; i < 10; i++) { const lf = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.22, 6, 1), leaf); const pos = lf.geometry.attributes.position; for (let k = 0; k < pos.count; k++) pos.setZ(k, -Math.pow(pos.getX(k) + 0.55, 2) * 0.25); lf.position.set(0, 2.2, 0); lf.rotation.set(-0.3, i / 10 * Math.PI * 2, 0); lf.translateX(0.5); p.add(lf); } }
  else for (let i = 0; i < 14; i++) { const lf = sph(p, 0.2, M({ color: pick([0x2a5a2a, 0x3a6a2a, 0x1f4a24]), roughness: 0.8 }), (rnd() - 0.5) * 0.45, 0.6 + rnd() * 0.8, (rnd() - 0.5) * 0.45, 10); lf.scale.set(1, 1.4, 0.5); lf.rotation.set(rnd(), rnd() * 3, rnd()); }
}
function curtain(g, x, y, z, w, h, color, ry) {
  const geo = new THREE.PlaneGeometry(w, h, 24, 1), pos = geo.attributes.position;
  for (let k = 0; k < pos.count; k++) pos.setZ(k, Math.sin(pos.getX(k) / w * Math.PI * 9) * 0.05);
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, M({ color, map: fabric(), roughness: 0.9, side: THREE.DoubleSide, emissive: new THREE.Color(color), emissiveIntensity: 0.12 }));
  m.position.set(x, y, z); if (ry) m.rotation.y = ry; g.add(m); return m;
}
function flag(g, x, y, z, ry) { const c = canvas(190, 100, (cx, w, h) => { for (let i = 0; i < 13; i++) { cx.fillStyle = i % 2 ? '#fff' : '#b22234'; cx.fillRect(0, i * h / 13, w, h / 13 + 1); } cx.fillStyle = '#3c3b6e'; cx.fillRect(0, 0, w * 0.4, h * 7 / 13); cx.fillStyle = '#fff'; for (let i = 0; i < 30; i++) cx.fillRect(4 + (i % 6) * 12, 4 + Math.floor(i / 6) * 10, 3, 3); }); cyl(g, 0.02, 0.02, 2.4, M({ color: 0xc8a050, metalness: 0.8 }), x, 1.2, z, 6); sph(g, 0.04, M({ color: 0xc8a050, metalness: 0.8 }), x, 2.42, z); const geo = new THREE.PlaneGeometry(0.9, 0.5, 12, 1), pos = geo.attributes.position; for (let k = 0; k < pos.count; k++) pos.setZ(k, Math.sin(pos.getX(k) * 7) * 0.04); geo.computeVertexNormals(); const f = new THREE.Mesh(geo, cloth(0xffffff)); f.material.map = tex(c); f.material.side = THREE.DoubleSide; f.position.set(x + 0.46, y, z); if (ry) f.rotation.y = ry; g.add(f); }
function banner(g, text, bg, fg, x, y, z, w, h) { return sign(g, text, bg, fg, x, y, z, w, h); }
function tvRig(g, w, y, z) { box(g, w, 0.12, 0.12, M({ color: 0x1a1a1a, metalness: 0.7 }), 0, y, z); for (let i = 0; i < 9; i++) { const x = -w / 2 + 0.5 + i * (w - 1) / 8; cyl(g, 0.12, 0.18, 0.3, M({ color: 0x111111, metalness: 0.5 }), x, y - 0.25, z); sph(g, 0.1, glow(0xfff6e0, 4), x, y - 0.42, z); const sp = new THREE.SpotLight(0xfff0dc, 18, 14, 0.5, 0.6, 1.4); sp.position.set(x, y - 0.4, z); sp.target.position.set(x * 0.4, 0, z + 4); g.add(sp, sp.target); LIGHTS.push(sp); } }
function screen(g, x, y, z, w, h, palette, text) {
  const c = canvas(512, Math.round(512 * h / w), (cx, cw, ch) => { const gg = cx.createLinearGradient(0, 0, cw, ch); gg.addColorStop(0, palette[0]); gg.addColorStop(1, palette[1]); cx.fillStyle = gg; cx.fillRect(0, 0, cw, ch); if (text) { cx.fillStyle = '#fff'; let fs = Math.round(ch * 0.2); do { cx.font = '900 ' + fs + 'px Georgia, serif'; fs -= 2; } while (cx.measureText(text).width > cw * 0.88 && fs > 8); cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillText(text, cw / 2, ch / 2); } });
  rbox(g, w + 0.1, h + 0.1, 0.08, 0.02, M({ color: 0x0a0a0c, roughness: 0.3 }), x, y, z - 0.03);
  const m = plane(g, w, h, new THREE.MeshBasicMaterial({ map: tex(c) }), x, y, z + 0.015); light(g, 0x9ab8ff, 1, x, y, z + 1, 5); return m;
}
// a window onto a painted view, with its frame and a little glass reflection
function windowOn(g, view, x, y, z, w, h, ry, frame) {
  const t = tex(view); const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t })); m.position.set(x, y, z); if (ry) m.rotation.y = ry; g.add(m);
  const fm = M({ color: frame || 0x1a1410, roughness: 0.45 });
  const fr = new THREE.Group(); fr.position.set(x, y, z); if (ry) fr.rotation.y = ry; g.add(fr);
  rbox(fr, w + 0.16, 0.1, 0.12, 0.02, fm, 0, h / 2, 0.03); rbox(fr, w + 0.24, 0.08, 0.22, 0.02, fm, 0, -h / 2 - 0.02, 0.07); rbox(fr, 0.1, h, 0.12, 0.02, fm, -w / 2, 0, 0.03); rbox(fr, 0.1, h, 0.12, 0.02, fm, w / 2, 0, 0.03);
  if (frame !== 'none') { box(fr, 0.05, h, 0.06, fm, 0, 0, 0.03); if (h > 1.4) box(fr, w, 0.04, 0.05, fm, 0, h * 0.18, 0.03); }
  plane(fr, w, h, M({ color: 0x9ab0c8, metalness: 1, roughness: 0.04, transparent: true, opacity: 0.1, envMapIntensity: 1.5 }), 0, 0, 0.02);
  return m;
}
// the final table: the rest of the room goes quiet; a rope line round your table and the crowd behind it; at the
// known stops TV cameras and lights, at the big ones a lighting truss too
function finalDress(g, o) {
  if (STAGE === 'thin' && TIER === 'local' && SEAT) {   // the ones already out hang around to watch
    for (let i = 0; i < 3; i++) { const a = Math.PI * 1.2 + i * 0.3 + rnd() * 0.2, p = ovalPt(SEAT.rx + 1.5, SEAT.rz + 1.3, a); stander(g, SEAT.x + p[0], SEAT.z + p[1], Math.atan2(-p[0], -p[1]), {}); }
    return;
  }
  if (STAGE !== 'final' || !SEAT) return;
  LIGHTS.forEach(l => { l.intensity *= 0.45; });
  const c = new THREE.Group(); c.position.set(SEAT.x, SEAT.y || 0, SEAT.z); g.add(c);
  const R = [SEAT.rx + 1.55, SEAT.rz + 1.45], brass = M({ color: 0xc8a050, metalness: 0.9, roughness: 0.25 }), rope = cloth(0x8a1020, 0.6);
  const posts = [];
  if (TIER !== 'local') for (let i = 0; i < 14; i++) { const a = (SEAT.face > 0 ? 0 : Math.PI) + 0.35 + i / 13 * (Math.PI - 0.7); const p = ovalPt(R[0], R[1], a); posts.push(p); cyl(c, 0.025, 0.025, 0.95, brass, p[0], 0.48, p[1], 10); sph(c, 0.04, brass, p[0], 0.97, p[1], 10); cyl(c, 0.14, 0.16, 0.03, brass, p[0], 0.015, p[1], 16); }
  for (let i = 0; i < posts.length - 1; i++) { const a = posts[i], b = posts[i + 1], mid = new THREE.Vector3((a[0] + b[0]) / 2, 0.82, (a[1] + b[1]) / 2); c.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(new THREE.Vector3(a[0], 0.92, a[1]), mid, new THREE.Vector3(b[0], 0.92, b[1])), 10, 0.02, 6), rope)); }
  const crowd = TIER === 'local' ? 6 : TIER === 'known' ? 20 : 34;
  for (let i = 0; i < crowd; i++) {
    const a = (SEAT.face > 0 ? 0 : Math.PI) + 0.3 + rnd() * (Math.PI - 0.6), d = 0.35 + rnd() * (TIER === 'local' ? 0.4 : 1.4), p = ovalPt(R[0] + d, R[1] + d, a);
    stander(c, p[0], p[1], Math.atan2(-p[0], -p[1]) + (rnd() - 0.5) * 0.4, { lod: TIER === 'big' && d > 1 ? 1 : 0 });
  }
  if (TIER !== 'local') {
    for (const s of [-1, 1]) {   // TV cameras on tripods
      const k = new THREE.Group(); k.position.set(s * (SEAT.rx + 0.9), 0, SEAT.face * (SEAT.rz + 0.9)); k.rotation.y = SEAT.face > 0 ? Math.PI - s * 0.6 : s * 0.6; c.add(k);
      for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2; const leg = cyl(k, 0.015, 0.015, 1.5, M({ color: 0x222222, metalness: 0.6 }), Math.sin(a) * 0.25, 0.72, Math.cos(a) * 0.25, 6); leg.rotation.set(Math.cos(a) * 0.3, 0, -Math.sin(a) * 0.3); }
      rbox(k, 0.24, 0.26, 0.5, 0.03, M({ color: 0x1a1a1e, roughness: 0.4 }), 0, 1.55, 0); cyl(k, 0.07, 0.09, 0.2, M({ color: 0x0a0a0a, roughness: 0.2, metalness: 0.5 }), 0, 1.55, 0.33, 16).rotation.x = Math.PI / 2;
      sph(k, 0.02, glow(0xff2020, 3), 0.08, 1.7, 0.2, 8);
      stander(k, 0, -0.45, 0, { arms: 'table' });
    }
    if (TIER === 'big') {   // a lighting truss over the table
      const tm = M({ color: 0x2a2a2e, metalness: 0.8, roughness: 0.35 });
      box(c, SEAT.rx * 2 + 1.6, 0.12, 0.12, tm, 0, 3.2, -SEAT.rz - 0.4); box(c, SEAT.rx * 2 + 1.6, 0.12, 0.12, tm, 0, 3.2, SEAT.rz + 0.4);
      for (let i = 0; i < 4; i++) { const x = -SEAT.rx + i * SEAT.rx * 2 / 3; cyl(c, 0.08, 0.12, 0.22, tm, x, 3.05, -SEAT.rz - 0.4, 12); sph(c, 0.07, glow(0xfff4e0, 4), x, 2.95, -SEAT.rz - 0.4, 10); }
    }
  }
  const s = spot(g, 0xfff4e4, TIER === 'local' ? 6 : 12, SEAT.x, 3.6, SEAT.z + 0.4, SEAT.x, SEAT.z, SEAT.face > 0 ? 0.42 : 0.6);
  s.penumbra = 0.4;
  if (SEAT.face > 0) {   // on a stage: light on the crowd and the hall beyond it
    spot(g, 0xffe8d0, 22, SEAT.x, 5, SEAT.z + 2, SEAT.x, SEAT.z + 4.5, 0.9);
    for (const sx of [-6, 0, 6]) light(g, 0xfff0dc, 6, SEAT.x + sx, 4.5, SEAT.z + 9, 16);
  }
}

// the room: floor, back wall, side walls, ceiling, a skirting board and a cornice. The camera sits near the front.
function room(g, o) {
  const w = o.w || 12, d = o.d || 10, h = o.h || 3.2;
  const fl = tex(o.floor, w / 2, d / 2);
  const flat = [];
  flat.push(plane(g, w, d, M({ map: fl, bumpMap: fl, bumpScale: 0.6, roughness: o.floorRough || 0.75 }), 0, 0, -d / 2 + 2, 0, -Math.PI / 2));
  const wm = M({ map: tex(o.wall, w / 2.4, h / 2.4), roughness: 0.85 }), sm = M({ map: tex(o.side || o.wall, d / 2.4, h / 2.4), roughness: 0.85 });
  flat.push(plane(g, w, h, wm, 0, h / 2, -d + 2));
  flat.push(plane(g, d, h, sm, -w / 2, h / 2, -d / 2 + 2, Math.PI / 2));
  flat.push(plane(g, d, h, sm, w / 2, h / 2, -d / 2 + 2, -Math.PI / 2));
  flat.push(plane(g, w, d, M({ map: tex(o.ceil || PAINT.plain('#2a2420'), w / 2, d / 2), roughness: 0.9 }), 0, h, -d / 2 + 2, 0, Math.PI / 2));
  if (o.wainscot) { flat.push(plane(g, w, 1.0, M({ map: tex(o.wainscot, w / 2, 0.5) }), 0, 0.5, -d + 2.01)); box(g, w, 0.05, 0.05, M({ color: 0x3a2414, roughness: 0.5 }), 0, 1.0, -d + 2.03); }
  const trim = M({ color: o.trim || 0x2a1a10, roughness: 0.5 });
  box(g, w, 0.12, 0.03, trim, 0, 0.06, -d + 2.015); box(g, 0.03, 0.12, d, trim, -w / 2 + 0.015, 0.06, -d / 2 + 2); box(g, 0.03, 0.12, d, trim, w / 2 - 0.015, 0.06, -d / 2 + 2);
  const cor = M({ color: o.cornice || 0xe8e0d0, roughness: 0.6 });
  box(g, w, 0.1, 0.1, cor, 0, h - 0.05, -d + 2.05); box(g, 0.1, 0.1, d, cor, -w / 2 + 0.05, h - 0.05, -d / 2 + 2); box(g, 0.1, 0.1, d, cor, w / 2 - 0.05, h - 0.05, -d / 2 + 2);
  flat.forEach(m => { m.userData.flat = 1; });
  if (o.fill !== false) light(g, 0xfff0dc, o.fillI || 1.4, 0, h - 0.3, -d / 2 + 1.5, Math.max(w, d) * 1.2);
  return { w, d, h, back: -d + 2 };
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
    // pizza boxes, a fruit bowl, a toaster, the kettle, beer bottles; magnets on the fridge
    for (let i = 0; i < 3; i++) rbox(g, 0.42, 0.05, 0.42, 0.01, M({ color: 0xd8c8a0, roughness: 0.8 }), -0.5, 0.97 + i * 0.05, r.back + 0.36, rnd() * 0.3);
    const bowl = sph(g, 0.14, M({ color: 0xf4f0e8, roughness: 0.3 }), -2.2, 0.98, r.back + 0.36); bowl.scale.y = 0.45; for (let i = 0; i < 5; i++) sph(g, 0.045, M({ color: pick([0xd82a1a, 0xf0c020, 0x6ab020, 0xff8a20]), roughness: 0.4 }), -2.25 + rnd() * 0.12, 1.03, r.back + 0.3 + rnd() * 0.12);
    rbox(g, 0.26, 0.18, 0.16, 0.03, M({ color: 0xc8ccd2, metalness: 0.8, roughness: 0.3 }), 0.3, 1.04, r.back + 0.3);
    cyl(g, 0.08, 0.1, 0.2, M({ color: 0x2a2a2e, metalness: 0.6, roughness: 0.3 }), 0.8, 1.05, r.back + 0.3, 16);
    for (let i = 0; i < 4; i++) { const bt = new THREE.Mesh(bottleGeo(), M({ color: 0x5a3010, roughness: 0.1, envMapIntensity: 1.2 })); bt.scale.set(0.8, 0.75, 0.8); bt.position.set(0.95 + i * 0.1, 0.95, r.back + 0.45 + (rnd() - 0.5) * 0.1); g.add(bt); }
    for (let i = 0; i < 6; i++) box(g, 0.06, 0.06, 0.01, M({ color: pick([0xd82a1a, 0x2a6ad8, 0xf0c020, 0x2a9a4a]) }), 1.65 + rnd() * 0.4, 1.2 + rnd() * 0.6, r.back + 0.76);
    pokerTable(g, 1.0, -2.2, { mine: true, rx: 0.9, rz: 0.55, felt: 0x2e7d4f, rail: 0x7c5530, seats: 5, shade: 0xe8dcc0, lampColor: 0xffe0b0 });
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
    pokerTable(g, 0.3, -2.4, { mine: true, felt: 0x1f5c39, seats: 6, lampColor: 0xfff0d0, shade: 0x1a3a24 });
    return { exposure: 0.95 };
  },
  garage(g) {
    const r = room(g, { w: 10, d: 8, h: 3, floor: PAINT.concrete('#7a7874'), wall: PAINT.plain('#b8b2a4'), ceil: PAINT.plain('#9a958a') });
    const door = canvas(256, 256, (x, w, h) => { x.fillStyle = '#d8d4c8'; x.fillRect(0, 0, w, h); for (let i = 0; i < h; i += 32) { x.fillStyle = 'rgba(0,0,0,.2)'; x.fillRect(0, i, w, 3); } });
    plane(g, 4.5, 2.4, M({ map: tex(door), roughness: 0.6, metalness: 0.3 }), -1.5, 1.2, r.back + 0.02);
    shelves(g, 3.4, r.back + 0.3, 2.2, 2.2, 0); box(g, 2.4, 0.9, 0.7, M({ color: 0xb02a1a, metalness: 0.4, roughness: 0.4 }), 3.4, 0.45, r.back + 1.2);
    for (let i = 0; i < 3; i++) { box(g, 1.4, 0.04, 0.12, glow(0xf0f6ff, 3), -3 + i * 3, 2.95, -3); light(g, 0xe8f0ff, 1.6, -3 + i * 3, 2.7, -3, 6); }
    sign(g, 'ROUTE 66', '#1a1a1a', '#f0f0f0', -4.95, 1.9, -2, 1.1, 0.5, Math.PI / 2);
    pokerTable(g, 0.6, -2.3, { mine: true, felt: 0x2e7d4f, rail: 0x5a3a20, seats: 6, lamp: false });
    return { exposure: 1.0 };
  },
  dining(g) {
    const r = room(g, { w: 9, d: 7, h: 2.8, floor: PAINT.wood('#8a5a32', '#6a4024', 26), wall: PAINT.damask('#5a2a2a', '#6a3434'), wainscot: PAINT.panel('#e8e0d0', '#f4ece0'), ceil: PAINT.plain('#f0e8dc') });
    shelves(g, -2.6, r.back + 0.25, 1.8, 2.0, 0); for (let i = 0; i < 9; i++) sph(g, 0.08, M({ color: 0xf4f0e8, roughness: 0.2 }), -3.3 + i * 0.18, 1.95, r.back + 0.3);
    windowOn(g, VIEW.city({ towers: 16, tall: 0.3, moon: true }), 1.6, 1.6, r.back + 0.02, 1.6, 1.2, 0, 0xf0e8dc);
    curtain(g, 0.55, 1.5, r.back + 0.06, 0.5, 2.2, 0x6a1a1a); curtain(g, 2.65, 1.5, r.back + 0.06, 0.5, 2.2, 0x6a1a1a);
    chandelier(g, 0.6, 2.35, -2.3, 0.7);
    frameArt(g, -4.45, 1.6, -1.8, 1.1, 0.8, Math.PI / 2);
    pokerTable(g, 0.6, -2.3, { mine: true, rx: 1.2, rz: 0.65, felt: 0x2e7d4f, rail: 0x3a1a0c, lamp: false, seats: 6 });
    return { exposure: 1.05 };
  },
  porch(g) {
    const r = room(g, { w: 11, d: 8, h: 2.8, floor: PAINT.wood('#9a7a5a', '#7a5a3a', 22), wall: PAINT.panel('#e8e4da', '#f4f0e6'), ceil: PAINT.wood('#a08060', '#806040', 30) });
    windowOn(g, VIEW.river({ trees: true, moon: true }), 0, 1.35, r.back + 0.02, 7, 2.4, 0, 0xf4f0e6);
    for (let i = 0; i < 6; i++) box(g, 0.12, 2.8, 0.12, M({ color: 0xf4f0e6 }), -3.5 + i * 1.4, 1.4, r.back + 0.1);
    box(g, 8, 0.08, 0.1, M({ color: 0xf4f0e6 }), 0, 0.9, r.back + 0.12);
    stringLights(g, -4.5, 4.5, 2.6, -2.5, 0.5); stringLights(g, -4.5, 4.5, 2.6, -4.2, 0.4);
    plant(g, -4.2, r.back + 0.6, 1.1); plant(g, 4.2, r.back + 0.6, 1.0);
    pokerTable(g, 0.5, -2.3, { mine: true, felt: 0x2e7d4f, rail: 0x7c5530, lamp: false, seats: 6 });
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
    pokerTable(g, 1.5, -2.6, { mine: true, felt: 0x7a1f2a, rail: 0x2a160a, seats: 6, shade: 0x2a4a2a });
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
    pokerTable(g, 1.2, -1.9, { mine: true, felt: o.felt || 0x1f3c6b, rail: 0x3a2a1a, lamp: false, seats: 6 });
    if (o.truck) { const red = M({ color: 0xb01a1a, metalness: 0.5, roughness: 0.35 }); rbox(g, 4, 1.8, 2, 0.15, red, -4, 1.2, r.back + 1.4); for (let i = 0; i < 2; i++) cyl(g, 0.45, 0.45, 2.1, M({ color: 0x111111 }), -5.2 + i * 2.4, 0.45, r.back + 1.4).rotation.x = Math.PI / 2; }
    return { exposure: 1.0 };
  },
  countryclub(g) {
    const r = room(g, { w: 13, d: 10, h: 3.4, floor: PAINT.carpet('#1f3a2a', '#2a4a34', '#c8a050'), wall: PAINT.panel('#5a3a20', '#6a4426'), ceil: PAINT.plain('#e8dcc4') });
    windowOn(g, VIEW.mountains({ sky0: '#081428', sky1: '#30406a' }), -2, 1.7, r.back + 0.02, 3.6, 1.8, 0, 0xe8dcc4);
    fireplace(g, 3.6, r.back + 0.32); frameArt(g, 3.6, 2.3, r.back + 0.64, 1.2, 0.8);
    shelves(g, -6.45, -2.5, 2.2, 2.6, Math.PI / 2);
    chandelier(g, -1.5, 3.0, -3, 0.8); chandelier(g, 2.5, 3.0, -2.5, 0.7);
    pokerTable(g, -2, -3.2, { felt: 0x1f3c6b, lamp: false }); pokerTable(g, 1.6, -2.1, { mine: true, felt: 0x1f3c6b, lamp: false });
    return { exposure: 1.0 };
  },
  cellar(g) {
    const r = room(g, { w: 10, d: 8, h: 2.7, floor: PAINT.tile('#5a3a2a', '#4a2e20', 8), wall: PAINT.brick('#8a4a2e', '#4a3a30'), ceil: PAINT.wood('#3a2414', '#2a180c', 40) });
    shelves(g, -2.6, r.back + 0.25, 3.6, 2.4, 0, 'wine'); shelves(g, 2.6, r.back + 0.25, 2.6, 2.4, 0, 'wine');
    for (let i = 0; i < 8; i++) { const bx = (i < 4 ? -4.3 : 4.3), bz = -1.6 - (i % 4) * 1.0, by = 0.36; cyl(g, 0.35, 0.35, 0.8, M({ map: tex(PAINT.wood('#6a4020', '#4a2a14', 12), 2, 1) }), bx, by, bz).rotation.z = Math.PI / 2; }
    stringLights(g, -4.5, 4.5, 2.5, -2, 0.35, 0xffc070);
    for (let i = 0; i < 3; i++) { sph(g, 0.08, glow(0xffb050, 3), -3 + i * 3, 1.1, -3.4); light(g, 0xffb050, 1, -3 + i * 3, 1.2, -3.2, 3); }
    pokerTable(g, 0.6, -2.4, { mine: true, felt: 0x2f3a2c, rail: 0x3a2616, seats: 6, shade: 0x6a3a1a, lampColor: 0xffc880 });
    return { exposure: 0.9 };
  },
  backroom(g) {
    const r = room(g, { w: 9, d: 7, h: 2.7, floor: PAINT.tile('#e8e0d0', '#2a2a2a', 10), wall: PAINT.damask('#4a1a14', '#5a221a'), ceil: PAINT.tin('#4a3a30') });
    frameArt(g, -1.6, 1.7, r.back + 0.03, 1.0, 0.7, 0, ['#2a4a2a', '#e8dcc0', '#8a2a1a']); frameArt(g, 0.6, 1.7, r.back + 0.03, 0.7, 0.9, 0);
    box(g, 0.9, 2.1, 0.06, M({ color: 0x3a2014 }), 3, 1.05, r.back + 0.03); sign(g, 'KITCHEN', '#3a2014', '#e8dcc0', 3, 2.25, r.back + 0.04, 0.8, 0.2);
    // stacked crates and a sack of flour
    for (let i = 0; i < 3; i++) box(g, 0.6, 0.4, 0.5, M({ color: 0x8a6a40 }), -3.6, 0.2 + i * 0.4, r.back + 0.5);
    pokerTable(g, 0.4, -2.2, { mine: true, felt: 0x2f3a2c, rail: 0x3a2616, seats: 6, shade: 0x2a2a2a, lampColor: 0xffd090, lampI: 3 });
    return { exposure: 0.85 };
  },
  dragon(g) {
    const r = room(g, { w: 10, d: 8, h: 2.8, floor: PAINT.carpet('#6a0a0a', '#8a1a1a', '#c8a050'), wall: PAINT.panel('#5a0a0a', '#7a1414'), ceil: PAINT.plain('#3a0a08') });
    for (let i = 0; i < 6; i++) lantern(g, -4 + i * 1.6, 2.2 + (i % 2) * 0.15, -2.8 - (i % 3) * 0.6);
    const scroll = canvas(128, 384, (x, w, h) => { x.fillStyle = '#e8d8b0'; x.fillRect(0, 0, w, h); x.fillStyle = '#1a1a1a'; x.font = '900 60px serif'; x.textAlign = 'center'; ['福', '龍', '運'].forEach((c, i) => x.fillText(c, w / 2, 90 + i * 110)); });
    plane(g, 0.5, 1.5, M({ map: tex(scroll) }), -2, 1.6, r.back + 0.03); plane(g, 0.5, 1.5, M({ map: tex(scroll) }), 2, 1.6, r.back + 0.03);
    box(g, 2.2, 1.3, 0.5, M({ color: 0x1a2a3a, roughness: 0.1, transparent: true, opacity: 0.6 }), 0, 1.2, r.back + 0.3); for (let i = 0; i < 5; i++) { const f = sph(g, 0.08, glow(0xff9a2a, 1.5), -0.8 + i * 0.4, 1.1 + rnd() * 0.4, r.back + 0.3); f.scale.set(1.6, 0.6, 0.6); }
    light(g, 0x5ab8ff, 0.8, 0, 1.2, r.back + 0.6, 2);
    pokerTable(g, 0.5, -2.3, { mine: true, felt: 0x2f3a2c, rail: 0x3a0a0a, seats: 6, lamp: false });
    light(g, 0xffb070, 2, 0.5, 2.2, -2.3, 5);
    return { exposure: 0.95 };
  },
  cantina(g) {
    const r = room(g, { w: 10, d: 8, h: 2.8, floor: PAINT.tile('#b8603a', '#9a4a2a', 8), wall: PAINT.plain('#d89a5a'), ceil: PAINT.wood('#5a3a20', '#3a2410', 34) });
    for (let i = 0; i < 12; i++) { const c = pick(['#ff3a6a', '#3ad8ff', '#ffd84d', '#3aff8a', '#ff8a3a']); plane(g, 0.35, 0.28, M({ color: c, side: THREE.DoubleSide, emissive: new THREE.Color(c), emissiveIntensity: 0.25 }), -4 + i * 0.75, 2.5 - Math.sin(i / 11 * Math.PI) * 0.3, -2.2); }
    bar(g, -1.5, r.back + 1.25, 4, { wood: '#7a4a24', crowd: 0.4, mirror: false });
    neon(g, 'Tequila', '#3aff8a', 2.8, 2.2, r.back + 0.04, 72);
    for (let i = 0; i < 3; i++) plant(g, 3 + i * 0.7, r.back + 0.4, 0.8);
    pokerTable(g, 0.8, -2.4, { mine: true, felt: 0x2f3a2c, rail: 0x5a3a20, seats: 6, shade: 0x8a3a1a });
    return { exposure: 1.0 };
  },
  diner(g) {
    const r = room(g, { w: 11, d: 8, h: 2.8, floor: PAINT.tile('#f0f0f0', '#1a1a1a', 10), wall: PAINT.stripe('#e8f4f2', '#d8ece8'), ceil: PAINT.plain('#e8ece8') });
    box(g, 6, 1.0, 0.7, M({ color: 0xc8ccd4, metalness: 0.8, roughness: 0.25 }), -1.5, 0.5, r.back + 1.4); box(g, 6.1, 0.06, 0.85, M({ color: 0xe84a5a, roughness: 0.3 }), -1.5, 1.03, r.back + 1.4);
    for (let i = 0; i < 6; i++) { cyl(g, 0.2, 0.2, 0.08, M({ color: 0xe84a5a, roughness: 0.3 }), -4 + i * 1, 0.78, r.back + 2.1); cyl(g, 0.03, 0.03, 0.75, M({ color: 0xc8c8d0, metalness: 0.9 }), -4 + i * 1, 0.38, r.back + 2.1, 8); }
    windowOn(g, VIEW.city({ towers: 14, tall: 0.25, water: false }), -1.5, 1.85, r.back + 0.02, 5, 1.0, 0, 0xc8ccd4);
    neon(g, 'EAT', '#ff3a3a', 3.6, 2.2, r.back + 0.04, 90); neon(g, 'PIE', '#3ad8ff', 3.6, 1.6, r.back + 0.04, 80);
    for (let i = 0; i < 3; i++) { box(g, 1.4, 0.04, 0.3, glow(0xf4f8ff, 2.2), -3 + i * 3, 2.78, -2.5); light(g, 0xf4f8ff, 1.5, -3 + i * 3, 2.5, -2.5, 6); }
    pokerTable(g, 1.3, -2.5, { mine: true, felt: 0x2f3a2c, seats: 6, lamp: false });
    return { exposure: 1.0 };
  },
  cardroom(g, o) {
    const r = room(g, { w: 16, d: 13, h: 3.4, floor: PAINT.carpet(o.carpet || '#1a2a4a', o.carpet2 || '#2a3a6a', o.carpet3 || '#c8a050'), wall: o.wall || PAINT.panel('#3a2a20', '#4a3426'), ceil: PAINT.plain('#2a2420') });
    if (o.view) windowOn(g, o.view, 0, 1.8, r.back + 0.02, 7, 2.2, 0);
    else { sign(g, o.name || 'POKER ROOM', '#14100c', '#d8b060', 0, 2.6, r.back + 0.03, 4, 0.6); screen(g, -4, 1.9, r.back + 0.03, 2.4, 1.2, ['#0a2a5a', '#04102a'], 'NLH 1/2 · 2/5 · PLO'); screen(g, 4, 1.9, r.back + 0.03, 2.4, 1.2, ['#5a0a2a', '#2a0410'], 'TOURNAMENT · 7PM'); }
    for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) pokerTable(g, -5 + i * 5, -4.2 - j * 3.2, { felt: o.felt || 0x1f6b45, rail: 0x1a1210, seats: 9, rx: 1.4, rz: 0.8, full: 0.85, shade: 0x1a1a1a, lampColor: 0xfff0d8, lampI: 2 });
    pokerTable(g, 2.2, -1.9, { mine: true, felt: o.felt || 0x1f6b45, rail: 0x1a1210, seats: 9, rx: 1.4, rz: 0.8, shade: 0x1a1a1a });
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
    pokerTable(g, 2.2, -1.9, { mine: true, felt: o.felt || 0x1f6b45, rail: 0x1a0a0a, seats: 9, rx: 1.4, rz: 0.8, lamp: false });
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
    rbox(g, 7, 0.4, 4, 0.05, M({ color: 0x14101c, roughness: 0.4 }), 0, 0.2, -9); pokerTable(g, 0, -9, { y: 0.4, mine: STAGE === 'final', felt: o.felt || 0x7a0f1c, rail: 0x0a0a0a, seats: 9, rx: 1.6, rz: 0.9, lamp: false, full: 1, ceil: 4.5 });
    for (let i = 0; i < 4; i++) for (let j = 0; j < 14; j++) { const p = person(g, -8 + j * 1.2 + (i % 2) * 0.6, -12 - i * 0.9, 0); p.position.y = i * 0.5; }
    for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) pokerTable(g, -8 + i * 5.3, -3.2 - j * 3.2, { felt: o.felt2 || 0x1f6b45, rail: 0x0a0a0a, seats: 9, rx: 1.4, rz: 0.8, full: 0.95, lamp: false });
    pokerTable(g, 2.6, -1.4, { mine: STAGE !== 'final', felt: o.felt2 || 0x1f6b45, rail: 0x0a0a0a, seats: 9, rx: 1.4, rz: 0.8, lamp: false });
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
    pokerTable(g, 1.6, -2, { mine: true, felt: o.felt || 0x0e5a43, rail: 0x1a0a04, seats: 8, rx: 1.4, rz: 0.8, lamp: false });
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
    pokerTable(g, 1.6, -2.2, { mine: true, felt: 0x24485e, rail: 0x3a2414, seats: 8, rx: 1.3, rz: 0.75, lamp: false });
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
    pokerTable(g, 1.4, -2.6, { mine: true, felt: 0x6b4a1f, rail: 0x3a2010, seats: 7, shade: 0x3a2010, lampColor: 0xffb860 });
    return { exposure: 0.95 };
  },
  riverboat(g, o) {
    const r = room(g, { w: 14, d: 9, h: 3.2, floor: PAINT.carpet('#5a0a14', '#7a1a24', '#c8a050'), wall: PAINT.damask('#3a0a10', '#4a1018'), ceil: PAINT.tin('#e8d8b0') });
    for (let i = 0; i < 4; i++) { windowOn(g, VIEW.river({ moon: i === 1, trees: true }), -4.8 + i * 3.2, 1.7, r.back + 0.02, 1.2, 1.5, 0, 0xc8a050); }
    for (let i = 0; i < 2; i++) chandelier(g, -2.5 + i * 5, 2.8, -3, 0.8);
    pokerTable(g, -3, -3.6, { felt: o.felt || 0x155e75, rail: 0x2a0a0a, seats: 8, rx: 1.3, rz: 0.75, lamp: false, full: 0.85 });
    pokerTable(g, 1.6, -2.1, { mine: true, felt: o.felt || 0x155e75, rail: 0x2a0a0a, seats: 8, rx: 1.3, rz: 0.75, lamp: false });
    slots(g, 5.6, r.back + 1.4, 3, 0);
    return { exposure: 1.0 };
  },
  // a cruise ship's card room: a wall of windows on the ocean, portholes down the sides, brass rails, a life ring
  cruise(g) {
    const r = room(g, { w: 14, d: 10, h: 2.9, floor: PAINT.carpet('#0e2348', '#163266', '#d8b050'), wall: PAINT.panel('#e9e2d2', '#f6f1e6'), wainscot: PAINT.wood('#5a3018', '#3e200e', 24), ceil: PAINT.plain('#f2eee6') });
    const brass = M({ color: 0xc8a050, metalness: 0.9, roughness: 0.25 });
    const sea = VIEW.ocean({ sky0: '#0a1640', sky1: '#5a3a7a', sky2: '#ffb070' });
    for (let i = 0; i < 4; i++) windowOn(g, sea, -4.95 + i * 3.3, 1.7, r.back + 0.02, 2.8, 1.5, 0, 0xf6f1e6);
    box(g, 14, 0.06, 0.06, brass, 0, 1.0, r.back + 0.25); for (let i = 0; i < 12; i++) cyl(g, 0.02, 0.02, 1.0, brass, -6.5 + i * 1.2, 0.5, r.back + 0.25, 6);
    // portholes along both sides
    for (const side of [-1, 1]) for (let i = 0; i < 4; i++) {
      const z = -1 - i * 1.9, x = side * 6.98, ry = -side * Math.PI / 2;
      const ph = new THREE.Mesh(new THREE.CircleGeometry(0.34, 32), new THREE.MeshBasicMaterial({ map: tex(sea) })); ph.position.set(x, 1.7, z); ph.rotation.y = ry; g.add(ph);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.05, 10, 32), brass); ring.position.set(x - side * 0.01, 1.7, z); ring.rotation.y = ry; g.add(ring);
    }
    // a life ring on the back wall, the ship's name over the bar
    const lr = new THREE.Group(); lr.position.set(5.9, 1.9, r.back + 0.06); g.add(lr);
    for (let k = 0; k < 8; k++) { const seg = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.08, 10, 12, Math.PI / 4), M({ color: k % 2 ? 0xffffff : 0xd8281e, roughness: 0.6 })); seg.rotation.z = k * Math.PI / 4; lr.add(seg); }
    sign(g, 'OCEAN MAJESTY', '#0e2348', '#e8c868', 0, 2.6, r.back + 0.03, 3.6, 0.42);
    // recessed lights in a curved ceiling band
    for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) { sph(g, 0.07, glow(0xfff2d8, 3), -5 + i * 2, 2.88, -1.2 - j * 2.6); }
    light(g, 0xfff0d8, 3, -3, 2.6, -2.5, 8); light(g, 0xfff0d8, 3, 3, 2.6, -2.5, 8); light(g, 0xffd0a0, 2, 0, 2.4, -6, 8);
    slots(g, -5.2, r.back + 1.6, 3, 0, { colors: [0x3ad8ff, 0xffd84d, 0xff6ab0] });
    pokerTable(g, -2.6, -4.6, { felt: 0x1f3c6b, rail: 0x3a1e0c, seats: 8, rx: 1.3, rz: 0.75, lamp: false, full: 0.85 });
    pokerTable(g, 2.8, -4.4, { felt: 0x1f3c6b, rail: 0x3a1e0c, seats: 8, rx: 1.3, rz: 0.75, lamp: false, full: 0.85 });
    pokerTable(g, 1.6, -2.0, { mine: true, felt: 0x1f3c6b, rail: 0x3a1e0c, seats: 8, rx: 1.3, rz: 0.75, lamp: false });
    plant(g, -6.4, -1.2, 1.2, true);
    return { exposure: 1.0 };
  },
  expo(g, o) {
    const r = room(g, { w: 30, d: 22, h: 8, floor: PAINT.carpet(o.carpet || '#1a2a4a', o.carpet2 || '#22345a', o.carpet3 || '#c8a050'), wall: PAINT.plain('#14141c'), ceil: PAINT.plain('#0e0e14') });
    for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) { box(g, 1.2, 0.05, 1.2, glow(0xf4f8ff, 1.8), -12 + i * 5, 7.9, -2 - j * 5); }
    light(g, 0xf4f8ff, 5, -6, 7, -4, 18); light(g, 0xf4f8ff, 5, 6, 7, -4, 18); light(g, 0xf4f8ff, 5, 0, 7, -12, 18);
    banner(g, o.banner || 'SUMMER SERIES', o.bannerBg || '#c8102e', '#fff', 0, 6, r.back + 0.05, 12, 1.6);
    screen(g, -9, 4, r.back + 0.05, 6, 3.4, ['#0a2a5a', '#04102a'], 'LEVEL 7 · 400/800');
    screen(g, 9, 4, r.back + 0.05, 6, 3.4, ['#1a5a2a', '#04200a'], o.screen || 'PLAYERS LEFT 4,812');
    rbox(g, 8, 0.4, 4.4, 0.05, M({ color: 0x14141c, roughness: 0.4 }), 0, 0.2, -15.2); pokerTable(g, 0, -15.2, { y: 0.4, mine: STAGE === 'final', felt: 0x7a0f1c, rail: 0x0a0a0a, seats: 9, rx: 1.6, rz: 0.9, lamp: false, full: 1, ceil: 5 });
    for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) pokerTable(g, -12.5 + i * 5, -3.5 - j * 3.6, { felt: 0x1f6b45, rail: 0x0a0a0a, seats: 9, rx: 1.4, rz: 0.8, full: 0.95, lamp: false });
    pokerTable(g, 2.4, -1.4, { mine: STAGE !== 'final', felt: 0x1f6b45, rail: 0x0a0a0a, seats: 9, rx: 1.4, rz: 0.8, lamp: false });
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
  cruise: ['cruise'], series: ['expo', {}], seriesspring: ['expo', { banner: 'SPRING SERIES', bannerBg: '#1f6b45', carpet: '#2a1a3a', carpet2: '#3a2a4a' }], seriesfall: ['expo', { banner: 'FALL SERIES', bannerBg: '#c0561e', carpet: '#3a1a10', carpet2: '#4a2414' }]
};

// the bars: each one its own sign, neon and walls
[['RUSTY ANCHOR', 'Cold Beer', '#3ad8ff', 1], ['COPPER KETTLE', 'Pints', '#ffb030', 0], ['BRASS TAP', 'On Tap', '#ffd84d', 1], ['RED LION', 'Ales', '#ff3a3a', 0],
  ['BLACK DOG', 'Cold Beer', '#ff4ad8', 1], ['SHAMROCK', 'Irish Pub', '#3aff8a', 0], ['TIN CUP', '19th Hole', '#3ad8ff', 0], ['IRON HORSE', 'Whiskey', '#ff8a3a', 1],
  ['BLUE MOOSE', 'Apres Ski', '#3a9aff', 0], ['LUCKY PENNY', 'Karaoke', '#ff4ad8', 1]].forEach((p, i) => { PLACES['pub' + i] = ['pub', { name: p[0], neon: p[1], neonColor: p[2], brick: !!p[3] }]; });


// how big each place is: its own room in town, a casino, or one of the big ballrooms
const LOCALK = /^(kitchen|basement|garage|dining|porch|pub\d|lodge|vfw|firehouse|rec|countryclub|cellar|backroom|dragon|cantina|diner|card\w*|cruise)$/;
const BIGK = /^(mainevent|omahachamp|playerschamp|series\w*)$/;

let renderer = null;
const cache = {};
function setup() {
  const c = document.createElement('canvas');
  try { renderer = new THREE.WebGLRenderer({ canvas: c, antialias: true, preserveDrawingBuffer: true }); } catch (e) { return null; }
  renderer.setPixelRatio(1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  return renderer;
}
function build(key, o) {
  const def = PLACES[key] || PLACES.cardroom;
  V = o.view === 'seat' ? 'seat' : 'room'; STAGE = o.stage === 'final' ? 'final' : o.stage === 'thin' ? 'thin' : 'busy';
  TIER = LOCALK.test(key) ? 'local' : BIGK.test(key) ? 'big' : 'known';
  SEAT = null; FEAT = null; SPOTS = []; LIGHTS = [];
  DEALER = !LOCALK.test(key) || /^(card\w*|cruise)$/.test(key);
  CHAIRS = /^(kitchen|dining|porch|pub\d|backroom|dragon|cantina|cellar|diner|minetown|deadwood)$/.test(key) ? 'wood' : /^(basement|garage|lodge|vfw|firehouse|rec)$/.test(key) ? 'folding' : 'casino';
  seed = 1; for (let i = 0; i < key.length; i++) seed = (seed * 31 + key.charCodeAt(i)) % 2147483647; seed = seed || 7;
  if (STAGE !== 'busy') seed = (seed * 7 + (STAGE === 'thin' ? 3 : 5)) % 2147483647;
  const scene = new THREE.Scene(), g = new THREE.Group(); scene.add(g);
  const res = SCENES[def[0]](g, def[1] || {}) || {};
  finalDress(g, def[1] || {});
  scene.background = new THREE.Color(0x05040a);
  if (res.fog) scene.fog = new THREE.Fog(res.fog[0], res.fog[1], res.fog[2]);
  scene.add(new THREE.AmbientLight(0xffffff, STAGE === 'final' ? 0.1 : 0.16));
  scene.add(new THREE.HemisphereLight(0xfff4e0, 0x201010, STAGE === 'final' ? 0.2 : 0.32));
  // the camera: the wide shot, your chair, or (final table, wide) looking over the crowd at the table
  const cam = new THREE.PerspectiveCamera(V === 'seat' ? 58 : 52, o.w / o.h, 0.05, 80), y0 = SEAT ? SEAT.y || 0 : 0;
  if (V === 'seat' && SEAT) { const f = SEAT.face; cam.position.set(SEAT.x, y0 + 1.2, SEAT.z - f * (SEAT.rz + 0.45)); cam.lookAt(SEAT.x * 0.55, y0 + (f > 0 ? 0.9 : 1.08), SEAT.z + f * 8); }
  else if (STAGE === 'final' && SEAT) { const up = SEAT.face > 0 ? 0.9 : 0; cam.position.set(SEAT.x + 1.1, y0 + 2.15 + up, SEAT.z + SEAT.rz + 3.4 + up * 2); cam.lookAt(SEAT.x, y0 + 0.75, SEAT.z - 0.2); }
  else { cam.position.set(0, 1.45, 1.6); cam.lookAt(0, 1.25, -6); }
  // shadows from the lights nearest what the camera looks at; everything solid casts and catches them
  const look = new THREE.Vector3(); cam.getWorldDirection(look); look.multiplyScalar(4).add(cam.position);
  scene.updateMatrixWorld(true);
  const wp = new THREE.Vector3();
  SPOTS.slice().sort((a, b) => a.getWorldPosition(wp).distanceTo(look) - b.getWorldPosition(new THREE.Vector3()).distanceTo(look)).slice(0, 4).forEach(s => {
    s.castShadow = true; s.shadow.mapSize.set(1024, 1024); s.shadow.bias = -0.0004; s.shadow.normalBias = 0.02; s.shadow.camera.near = 0.3; s.shadow.camera.far = 8;
  });
  scene.traverse(m => {
    if (!m.isMesh) return;
    const mat = Array.isArray(m.material) ? m.material[0] : m.material;
    m.receiveShadow = true;
    m.castShadow = !m.userData.flat && !(mat && (mat.isMeshBasicMaterial || mat.transparent)) && !(mat && mat.emissiveIntensity > 1);
  });
  return { scene, res, cam };
}
// o: { view: 'room' | 'seat', stage: 'busy' | 'thin' | 'final', w, h }
async function render(key, o) {
  o = Object.assign({ view: 'room', stage: 'busy', w: 1280, h: 720 }, o || {});
  const ck = key + '|' + o.view + '|' + o.stage + '|' + o.w + 'x' + o.h;
  if (cache[ck]) return cache[ck];
  if (!renderer && !setup()) return null;
  renderer.setSize(o.w, o.h, false);
  const { scene, res, cam } = build(key, o);
  const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  renderer.toneMappingExposure = (res.exposure || 1) * (STAGE === 'final' ? 0.95 : 1);
  const composer = new EffectComposer(renderer); composer.setSize(o.w, o.h);
  composer.addPass(new RenderPass(scene, cam));
  if (!window.VS_NOAO) try {
    const ao = new GTAOPass(scene, cam, o.w, o.h);
    ao.updateGtaoMaterial({ radius: 0.35, distanceExponent: 1.5, thickness: 1, scale: 1.2, samples: 16, distanceFallOff: 1 });
    ao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 16 });
    ao.blendIntensity = 0.9; composer.addPass(ao);
  } catch (e) {}
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(o.w, o.h), 0.45, 0.45, 1.6)); composer.addPass(new OutputPass());
  composer.render();
  const url = renderer.domElement.toDataURL('image/jpeg', 0.86);
  scene.traverse(m => { if (m.geometry) m.geometry.dispose(); if (m.material) [].concat(m.material).forEach(x => { if (x.map && !x.map.userData.keep) x.map.dispose(); x.dispose(); }); });
  pm.dispose(); composer.passes.forEach(p => p.dispose && p.dispose()); composer.dispose && composer.dispose();
  // (shared textures are rebuilt next time)
  FABRIC = null; BOTTLE = null; TORSO = null; CARDB = null; for (const k in CARDF) delete CARDF[k]; for (const k in CHIPM) delete CHIPM[k]; for (const k in FELTS) delete FELTS[k];
  cache[ck] = url;
  return url;
}
let queue = Promise.resolve();
window.VenueScene = {
  keys: Object.keys(PLACES),
  // one at a time (they share the renderer), each in its own turn so the page keeps moving
  render(key, o) { const p = queue.then(() => new Promise(r => setTimeout(r, 0))).then(() => render(key, o)).catch(e => { console.warn('venue', key, e); return null; }); queue = p; return p; }
};
