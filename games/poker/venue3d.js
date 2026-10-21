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
  if (c.__kind) t.userData.kind = c.__kind;
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
  carpet: (a, b, c, kind) => canvas(256, 256, (x, w, h) => {
    x.fillStyle = a; x.fillRect(0, 0, w, h);
    if (kind === 'diamond') { x.strokeStyle = b; x.lineWidth = 5; for (let i = -4; i <= 4; i++) { x.beginPath(); x.moveTo(i * 64, 0); x.lineTo(i * 64 + 256, 256); x.stroke(); x.beginPath(); x.moveTo(i * 64 + 256, 0); x.lineTo(i * 64, 256); x.stroke(); } x.fillStyle = c; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { x.beginPath(); x.arc(i * 64 + 32, j * 64, 4, 0, 7); x.fill(); } }
    else if (kind === 'scroll') { for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { const cx = 64 + i * 128, cy = 64 + j * 128; x.strokeStyle = b; x.lineWidth = 7; for (let k = 0; k < 4; k++) { x.beginPath(); x.arc(cx + Math.cos(k * 1.571) * 30, cy + Math.sin(k * 1.571) * 30, 24, k * 1.571, k * 1.571 + 3.6); x.stroke(); } x.fillStyle = c; for (let k = 0; k < 8; k++) { x.save(); x.translate(cx, cy); x.rotate(k * 0.785); x.beginPath(); x.ellipse(52, 0, 10, 4, 0, 0, 7); x.fill(); x.restore(); } x.beginPath(); x.arc(cx, cy, 8, 0, 7); x.fill(); x.fillStyle = b; x.beginPath(); x.arc(cx + 64, cy + 64, 10, 0, 7); x.fill(); } }
    else if (kind === 'wave') { x.strokeStyle = b; x.lineWidth = 6; for (let j = 0; j < 8; j++) for (let i = -1; i < 5; i++) { x.beginPath(); x.arc(i * 64 + (j % 2) * 32 + 32, j * 32 + 32, 28, Math.PI, Math.PI * 2); x.stroke(); } x.fillStyle = c; for (let j = 0; j < 8; j++) for (let i = 0; i < 4; i++) { x.beginPath(); x.arc(i * 64 + (j % 2) * 32 + 32, j * 32 + 26, 3, 0, 7); x.fill(); } }
    else if (kind === 'deco') { for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) { const cx = i * 64 + (j % 2) * 32, cy = j * 64 + 64; for (let k = 3; k > 0; k--) { x.fillStyle = k % 2 ? b : a; x.beginPath(); x.arc(cx, cy, k * 10 + 2, Math.PI, Math.PI * 2); x.fill(); } x.strokeStyle = c; x.lineWidth = 2; x.beginPath(); x.arc(cx, cy, 31, Math.PI, Math.PI * 2); x.stroke(); } }
    else if (kind === 'navajo') { for (let j = 0; j < 4; j++) { const y = j * 64; x.fillStyle = b; x.fillRect(0, y + 26, w, 12); x.fillStyle = c; for (let i = 0; i < 8; i++) { const cx = i * 32 + 16; x.beginPath(); x.moveTo(cx, y + 6); x.lineTo(cx + 12, y + 20); x.lineTo(cx, y + 34); x.lineTo(cx - 12, y + 20); x.fill(); } x.fillStyle = a; for (let i = 0; i < 8; i++) { const cx = i * 32 + 16; x.fillRect(cx - 3, y + 17, 6, 6); } x.fillStyle = b; for (let i = 0; i < 16; i++) x.fillRect(i * 16, y + 50 + (i % 2) * 4, 10, 4); } }
    else if (kind === 'check') { for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) if ((i + j) % 2) { x.fillStyle = b; x.fillRect(i * 16, j * 16, 16, 16); } x.fillStyle = c; x.globalAlpha = 0.5; for (let i = 0; i < 4; i++) { x.fillRect(i * 64, 0, 2, h); x.fillRect(0, i * 64, w, 2); } x.globalAlpha = 1; }
    else for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
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
    if (o.buttes) for (const [bx, bw, bh] of [[0.12, 0.16, 0.42], [0.42, 0.1, 0.5], [0.58, 0.07, 0.36], [0.82, 0.2, 0.3]]) { const x0 = bx * w, ww = bw * w, top = h * (0.85 - bh); x.fillStyle = '#9a3a1a'; x.beginPath(); x.moveTo(x0 - ww * 0.4, h * 0.86); x.lineTo(x0, top + 20); x.lineTo(x0 + ww * 0.2, top); x.lineTo(x0 + ww * 0.8, top + 6); x.lineTo(x0 + ww, top + 30); x.lineTo(x0 + ww * 1.4, h * 0.86); x.fill(); for (let k = 1; k < 6; k++) { x.fillStyle = k % 2 ? 'rgba(255,150,90,.18)' : 'rgba(60,10,0,.2)'; x.fillRect(x0 - ww * 0.2, top + k * (h * 0.86 - top) / 6, ww * 1.4, 6); } }
    if (o.buttes) for (let i = 0; i < 40; i++) { x.fillStyle = '#1a2014'; x.beginPath(); x.ellipse(rnd() * w, h * (0.88 + rnd() * 0.1), 8 + rnd() * 14, 6 + rnd() * 8, 0, 0, 7); x.fill(); }
    if (o.palms !== false) for (let i = 0; i < 6; i++) { const px = rnd() * w, py = h * 0.8; x.strokeStyle = '#120a10'; x.lineWidth = 7; x.beginPath(); x.moveTo(px, h); x.lineTo(px + 6, py - 120); x.stroke(); x.fillStyle = '#120a10'; for (let k = 0; k < 8; k++) { x.save(); x.translate(px + 6, py - 120); x.rotate(k * 0.8); x.beginPath(); x.ellipse(36, 0, 40, 6, 0, 0, 7); x.fill(); x.restore(); } }
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
let SEAT = null, SPOTS = [], LIGHTS = [], FEAT = null, CHAIRS = 'casino', DEALER = true, EXPORT = false, PN = 0;
const occ = () => (STAGE === 'busy' ? 0.92 : STAGE === 'thin' ? 0.5 : 0);
let OTHERS = 0;   // other tables built so far: the first one never closes when the field thins, so no room is ever empty

// ── Materials and props ──────────────────────────────────────────────────────────────────────────────────
let FABRIC = null;
function fabric() { if (!FABRIC) FABRIC = tex(canvas(64, 64, (x, w, h) => { x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); noise(x, w, h, 0.14, 900); }), 4, 4); return FABRIC; }
function M(o) { const m = new THREE.MeshStandardMaterial(Object.assign({ roughness: 0.75, metalness: 0, envMapIntensity: 0.4 }, o)); if (o && o.map && o.map.userData.kind) m.userData.kind = o.map.userData.kind; return m; }
function cloth(color, r) { const m = M({ color, map: fabric(), roughness: r || 0.95 }); m.userData.kind = 'fabric'; return m; }
function glow(color, i) { const m = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: new THREE.Color(color), emissiveIntensity: i || 2.2 }); m.userData.kind = 'glow'; return m; }
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
// a tapered limb from a (radius r1) to b (radius r2), rounded at b
const _a = new THREE.Vector3(), _b = new THREE.Vector3();
function seg(g, a, b, r1, r2, mat, capA) {
  _a.set(a[0], a[1], a[2]); _b.set(b[0], b[1], b[2]);
  const d = _b.clone().sub(_a), len = d.length();
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r2, r1, len, 14), mat);
  m.position.copy(_a).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(_up, d.normalize()); g.add(m);
  sph(g, r2, mat, b[0], b[1], b[2], 12); if (capA) sph(g, r1, mat, a[0], a[1], a[2], 12);
  return m;
}
// a body: hips, waist, chest, shoulders (a lathe, flattened front to back); w: build, fem: a woman's shape
function torsoGeo(fem) {
  const pts = fem ? [[0.001, 0], [0.175, 0], [0.18, 0.06], [0.16, 0.16], [0.14, 0.25], [0.16, 0.33], [0.175, 0.4], [0.175, 0.46], [0.16, 0.52], [0.1, 0.56], [0.05, 0.575]]
    : [[0.001, 0], [0.165, 0], [0.17, 0.07], [0.16, 0.17], [0.158, 0.25], [0.175, 0.34], [0.195, 0.42], [0.205, 0.48], [0.185, 0.535], [0.11, 0.57], [0.055, 0.585]];
  return new THREE.LatheGeometry(pts.map(p => new THREE.Vector2(p[0], p[1])), 24);
}
// o: { sit (default true), hip (seat height), look: 'casual' | 'pro' | 'smart' | 'dealer' | 'bartender', arms: 'table' | 'down' | 'crossed' | 'pockets' | 'bar', lod }
function person(g, x, z, face, o) {
  o = o || {};
  const sit = o.sit !== false, lod = o.lod || 0, look = o.look || pick(['casual', 'casual', 'smart', TIER === 'local' ? 'casual' : 'pro']);
  const fem = rnd() < (look === 'pro' ? 0.25 : 0.4), H = (fem ? 0.93 : 0.98) + rnd() * 0.09, Wd = 0.94 + rnd() * (fem ? 0.14 : 0.3);
  const p = new THREE.Group(); p.position.set(x, sit ? (o.hip || 0.5) - 0.5 : 0, z); p.rotation.y = face; g.add(p);
  if (EXPORT) { p.name = 'PERSON_' + (PN++); p.position.y = 0; p.userData.person = { sit, hip: o.hip || 0.5, arms: o.arms || (sit ? 'table' : 'down'), look, fem, lod }; return p; }   // a marker for the offline renderer
  if (!sit) p.scale.setScalar(H);
  const skinC = pick(SKIN), skin = M({ color: skinC, roughness: 0.62 }), pants = cloth(pick(fem ? PANTS.concat([0x6a2a3a, 0x2a2a2a]) : PANTS));
  let top = cloth(look === 'dealer' || look === 'bartender' ? 0xd8d4cc : pick(SHIRTS)), arm = top;
  const shoe = M({ color: pick([0x1a1412, 0x3a2414, 0x2a2a2e, 0xd8d8d8]), roughness: 0.5 });
  const hipY = sit ? 0.5 : 0.92, lx = 0.095 * Wd;
  // legs: thighs, knees, shins, shoes
  if (sit) {
    for (const s of [-1, 1]) {
      seg(p, [s * lx, 0.5, 0.0], [s * lx, 0.49, 0.42], 0.085 * Wd, 0.064 * Wd, pants, true);
      if (!lod) { seg(p, [s * lx, 0.49, 0.43], [s * lx, 0.09, 0.47], 0.058 * Wd, 0.043, pants); rbox(p, 0.1, 0.07, 0.25, 0.03, shoe, s * lx, 0.035, 0.53); }
    }
  } else {
    const kn = rnd() < 0.5 ? -1 : 1;   // weight on one leg
    for (const s of [-1, 1]) {
      const bend = s === kn ? 0.05 : 0;
      seg(p, [s * lx, 0.92, 0], [s * lx * 1.02, 0.49, 0.02 + bend], 0.088 * Wd, 0.064 * Wd, pants, true);
      if (!lod) { seg(p, [s * lx * 1.02, 0.49, 0.02 + bend], [s * lx, 0.08, -0.01], 0.06 * Wd, 0.044, pants); rbox(p, 0.1, 0.075, 0.26, 0.03, shoe, s * lx, 0.037, 0.06); }
    }
  }
  // the body (seated: leaning in toward the table)
  const body = new THREE.Group(); body.position.y = hipY; body.rotation.x = sit ? 0.12 : 0; p.add(body);
  if (sit) body.scale.setScalar(H);
  const tg = torsoGeo(fem), t = new THREE.Mesh(tg, top); t.scale.set(Wd, 1, 0.64 * Wd); body.add(t);
  const shX = (fem ? 0.165 : 0.19) * Wd, shY = fem ? 0.5 : 0.5;
  if (look === 'dealer' || look === 'bartender') {   // a black vest over the white shirt, a bow tie
    const vest = new THREE.Mesh(tg, cloth(0x15151a, 0.7)); vest.scale.set(Wd * 1.04, 0.92, 0.67 * Wd); body.add(vest);
    if (!lod) { box(body, 0.07, 0.03, 0.02, M({ color: 0x111111 }), 0, 0.545, 0.115 * Wd); }
  } else if (look === 'smart' && rnd() < 0.6) {      // a jacket, open at the front
    const jk = new THREE.Mesh(tg, cloth(pick([0x23232a, 0x2a3040, 0x4a3a2a, 0x3a3a40, 0x5a2a2a]), 0.8)); jk.scale.set(Wd * 1.05, 0.97, 0.68 * Wd); body.add(jk); arm = jk.material;
    if (!lod) { const sh = M({ color: pick([0xe8e4dc, 0x9ab8d8, 0xf0e0e0]), roughness: 0.8 }); const v = rbox(body, 0.1, 0.22, 0.02, 0.01, sh, 0, 0.42, 0.125 * Wd); v.rotation.x = -0.12; }
  } else if (look === 'pro' && rnd() < 0.55) {       // a hoodie, hood down
    top = cloth(pick([0x1f1f24, 0x2a2a30, 0x3a4a5a, 0x5a1a1a, 0x2a3a2a, 0x6a6a70])); t.material = top; arm = top;
    const hood = sph(body, 0.12, top, 0, 0.55, -0.1 * Wd); hood.scale.set(1.25 * Wd, 0.6, 0.75);
  } else if (!lod && rnd() < 0.5) {                  // a collar
    const col = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.016, 6, 16), top); col.rotation.x = Math.PI / 2 - 0.2; col.position.set(0, 0.575, 0.01); col.scale.z = 0.8; body.add(col);
  }
  // shoulders and arms
  for (const s of [-1, 1]) {
    const S = [s * shX, shY, 0];
    let el, hd, hand = true;
    if (!sit) {
      const pose = o.arms || 'down';
      if (pose === 'crossed') { el = [s * 0.21 * Wd, 0.26, 0.1]; hd = [-s * 0.07, 0.33, 0.15 * Wd]; hand = false; }
      else if (pose === 'table') { el = [s * 0.22 * Wd, 0.26, 0.12]; hd = [s * 0.14, 0.04, 0.4]; }
      else if (pose === 'pockets') { el = [s * 0.23 * Wd, 0.25, -0.04]; hd = [s * 0.15 * Wd, 0.04, 0.09 * Wd]; hand = false; }
      else { el = [s * 0.225 * Wd, 0.23, -0.02]; hd = [s * 0.2 * Wd, -0.02, 0.06]; }
    } else if (o.arms === 'bar') { el = [s * 0.22 * Wd, 0.24, 0.14]; hd = [s * 0.12, 0.34, 0.36]; }
    else { el = [s * 0.21 * Wd, 0.28, 0.18]; hd = [s * (0.1 + rnd() * 0.04), 0.33, 0.4]; }
    sph(body, 0.056 * Wd, arm, S[0] * 0.96, S[1] - 0.015, S[2], 14);
    seg(body, S, el, 0.054 * Wd, 0.044 * Wd, arm);
    seg(body, el, hd, 0.043 * Wd, 0.033, arm);
    if (hand && !lod) { const h = rbox(body, 0.055, 0.03, 0.09, 0.014, skin, hd[0], hd[1] - 0.005, hd[2] + 0.03); h.rotation.y = -s * 0.2; }
  }
  if (sit && !lod && rnd() < 0.5 && o.arms !== 'bar') { const c1 = new THREE.Mesh(new THREE.PlaneGeometry(0.063, 0.088), cardBack()); c1.position.set(0, 0.36, 0.43); c1.rotation.set(-1.1, 0, 0.1); body.add(c1); }
  // neck and head: a skull, a jaw, ears, nose, brows, eyes, mouth
  const hy = 0.68;
  seg(body, [0, 0.55, 0], [0, 0.62, 0.01], 0.056, 0.05, skin);
  const skull = sph(body, 0.1, skin, 0, hy, 0.0, 20); skull.scale.set(0.86, 1.04, 0.98);
  const jaw = sph(body, 0.075, skin, 0, hy - 0.055, 0.03, 16); jaw.scale.set(fem ? 0.88 : 0.98, 0.8, 0.95);
  if (!lod) {
    for (const s of [-1, 1]) { const ear = sph(body, 0.024, skin, s * 0.085, hy - 0.01, 0.0, 8); ear.scale.set(0.45, 1, 0.8); }
    const nose = sph(body, 0.02, skin, 0, hy - 0.025, 0.1, 8); nose.scale.set(0.8, 1.2, 1.1);
    const dark = M({ color: 0x15100c, roughness: 0.4 }), brow = M({ color: pick(HAIR), roughness: 0.9 });
    if (look === 'pro' && rnd() < 0.35) rbox(body, 0.15, 0.035, 0.02, 0.01, M({ color: 0x0a0a0c, roughness: 0.1, metalness: 0.6 }), 0, hy + 0.008, 0.093);   // sunglasses
    else for (const s of [-1, 1]) { sph(body, 0.013, M({ color: 0xf0ece4, roughness: 0.3 }), s * 0.032, hy + 0.008, 0.083, 8); sph(body, 0.008, dark, s * 0.032, hy + 0.008, 0.094, 6); }
    for (const s of [-1, 1]) { const b = box(body, 0.034, 0.008, 0.012, brow, s * 0.033, hy + 0.032, 0.09); b.rotation.z = -s * 0.1; }
    box(body, 0.04, 0.007, 0.01, M({ color: fem ? 0x9a3a3a : 0x6a3a30, roughness: 0.6 }), 0, hy - 0.07, 0.093);
  }
  // hair, hats, headphones
  const hc = M({ color: pick(HAIR), roughness: 0.85 }), r = rnd();
  if (fem && r < 0.75) {   // longer hair: a cap of hair and a fall down the back (or a ponytail)
    const hr = sph(body, 0.106, hc, 0, hy + 0.025, -0.01, 16); hr.scale.set(0.92, 0.9, 1.02);
    if (r < 0.45) { const lg = rbox(body, 0.19, 0.26, 0.08, 0.035, hc, 0, hy - 0.1, -0.07); lg.rotation.x = 0.12; }
    else { const pt = sph(body, 0.04, hc, 0, hy - 0.02, -0.11, 10); pt.scale.set(0.8, 1.6, 0.8); }
  } else if (r < 0.6) { const hr = sph(body, 0.104, hc, 0, hy + 0.03, -0.012, 16); hr.scale.set(0.92, 0.72, 1.0); }
  else if (r < 0.8 || (look === 'pro' && r < 0.9)) {
    const cap = M({ color: pick([0x1a3a6a, 0x6a1a1a, 0x222222, 0xd8d0c0, 0x2a4a2a]), roughness: 0.8 });
    const c = sph(body, 0.106, cap, 0, hy + 0.035, -0.005, 16); c.scale.set(0.95, 0.68, 1.02);
    const back = rnd() < 0.3; const brim = cyl(body, 0.08, 0.08, 0.012, cap, 0, hy + 0.025, back ? -0.13 : 0.13, 16); brim.scale.z = 0.7;
  }
  if (look === 'pro' && rnd() < 0.3) { const hp = M({ color: 0x111114, roughness: 0.4 }); const band = new THREE.Mesh(new THREE.TorusGeometry(0.105, 0.012, 6, 20, Math.PI), hp); band.position.set(0, hy, 0.0); band.rotation.y = Math.PI / 2; body.add(band); for (const s of [-1, 1]) { const cup = cyl(body, 0.04, 0.04, 0.03, hp, s * 0.1, hy - 0.01, 0.0, 14); cup.rotation.z = Math.PI / 2; } }
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
function stander(g, x, z, face, o) { const r = rnd(); return person(g, x, z, face, Object.assign({ sit: false, arms: r < 0.3 ? 'crossed' : r < 0.55 ? 'pockets' : 'down' }, o)); }

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
      if (o.lamp !== false) { const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.38, 0.24, 32, 1, true), M({ color: o.shade || 0x1d3a24, side: THREE.DoubleSide, roughness: 0.5, metalness: 0.2 })); shade.position.y = 2.2; t.add(shade); }
      const s = spot(t, o.lampColor || 0xfff0d8, STAGE === 'final' ? 11 : 6.5, 0, o.lamp !== false ? 2.05 : (o.ceil || 3.2) - 0.1, 0, 0, 0, 0.8); s.target.position.set(x, 0, z); g.add(s.target);
      return t;
    }
  }
  g.add(t);
  const closed = !o.mine && (STAGE === 'final' || (STAGE === 'thin' && OTHERS++ > 0 && rnd() < 0.45));
  const full = o.mine ? (STAGE === 'final' || TIER === 'local' ? 1 : 0.85) : (o.full || 0.85) * occ() / 0.92;
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
    const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.38, 0.24, 32, 1, true), shadeM); shade.position.y = 2.2; t.add(shade);
    cyl(t, 0.005, 0.005, 1.2, M({ color: 0x111111 }), 0, 2.9, 0, 4);
    if (lit) { const d = new THREE.Mesh(new THREE.CircleGeometry(0.36, 32), glow(lc, 1.6)); d.rotation.x = Math.PI / 2; d.position.y = 2.09; t.add(d); }
  }
  if (lit) { const s = spot(t, o.lampColor || 0xfff0d8, (o.lampI || 1) * (o.mine && STAGE === 'final' ? 11 : 6.5), 0, o.lamp !== false ? 2.05 : (o.ceil || 3.2) - 0.1, 0, 0, 0, 0.8); s.target.position.set(x, 0, z); g.add(s.target); }
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
  const bm = [0x8a4a1a, 0x8a4a1a, 0x5a2a0a, 0x5a2a0a, 0xc8a050, 0xd8d8d0, 0xd8d8d0, 0x2a5a2a, 0x3a2010, 0x3a6aa8, 0x1a1a1a].map(c => new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.08, metalness: 0, transmission: 0.25, thickness: 0.02, emissive: new THREE.Color(c), emissiveIntensity: 0.06, envMapIntensity: 1.2 }));
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
  m.name = 'NEON'; m.position.set(x, y, z); if (ry) m.rotation.y = ry; g.add(m); light(g, color, 1.2, x, y, z + 0.4, 3); return m;
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
  if (frame === 'none') return m;
  const fm = M({ color: frame || 0x1a1410, roughness: 0.45 });
  const fr = new THREE.Group(); fr.position.set(x, y, z); if (ry) fr.rotation.y = ry; g.add(fr);
  rbox(fr, w + 0.16, 0.1, 0.12, 0.02, fm, 0, h / 2, 0.03); rbox(fr, w + 0.24, 0.08, 0.22, 0.02, fm, 0, -h / 2 - 0.02, 0.07); rbox(fr, 0.1, h, 0.12, 0.02, fm, -w / 2, 0, 0.03); rbox(fr, 0.1, h, 0.12, 0.02, fm, w / 2, 0, 0.03);
  if (frame !== 'none') { box(fr, 0.05, h, 0.06, fm, 0, 0, 0.03); if (h > 1.4) box(fr, w, 0.04, 0.05, fm, 0, h * 0.18, 0.03); }
  plane(fr, w, h, M({ color: 0x9ab0c8, metalness: 1, roughness: 0.3, transparent: true, opacity: 0.08, envMapIntensity: 1.5 }), 0, 0, 0.02);
  return m;
}
// the final table: the rest of the room goes quiet; a rope line round your table and the crowd behind it; at the
// known stops TV cameras and lights, at the big ones a lighting truss too
function finalDress(g, o) {
  // at home the ones already out stand at the ends of the table (the sides are counters, walls and the way through)
  const endSpot = (i) => { const a = [-0.3, 0.3, Math.PI, Math.PI - 0.4, 0, Math.PI + 0.4][i % 6] + (rnd() - 0.5) * 0.15; return ovalPt(SEAT.rx + 0.95 + (i > 2 ? 0.5 : 0), SEAT.rz + 0.9, a); };
  if (STAGE === 'thin' && TIER === 'local' && SEAT) {
    for (let i = 0; i < 3; i++) { const p = endSpot(i); stander(g, SEAT.x + p[0], SEAT.z + p[1], Math.atan2(-p[0], -p[1]), {}); }
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
    if (TIER === 'local') { const p = endSpot(i); stander(c, p[0], p[1], Math.atan2(-p[0], -p[1]) + (rnd() - 0.5) * 0.3, {}); continue; }
    const a = (SEAT.face > 0 ? 0 : Math.PI) + 0.3 + rnd() * (Math.PI - 0.6), d = 0.35 + rnd() * 1.4, p = ovalPt(R[0] + d, R[1] + d, a);
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

// ── More surfaces ────────────────────────────────────────────────────────────────────────────────────────
Object.assign(PAINT, {
  berber: (a) => canvas(256, 256, (x, w, h) => { x.fillStyle = a; x.fillRect(0, 0, w, h); for (let i = 0; i < 14000; i++) { x.fillStyle = 'rgba(' + (rnd() < 0.5 ? '0,0,0' : '255,255,255') + ',' + rnd() * 0.14 + ')'; x.fillRect(rnd() * w, rnd() * h, 2, 1); } }),
  marble: (a, vein) => canvas(512, 512, (x, w, h) => {
    x.fillStyle = a; x.fillRect(0, 0, w, h); noise(x, w, h, 0.04, 6000);
    for (let k = 0; k < 14; k++) { x.strokeStyle = vein; x.globalAlpha = 0.15 + rnd() * 0.3; x.lineWidth = 0.6 + rnd() * 1.6; x.beginPath(); let px = rnd() * w, py = 0; x.moveTo(px, py); while (py < h) { px += (rnd() - 0.5) * 40; py += 10 + rnd() * 30; x.lineTo(px, py); } x.stroke(); }
    x.globalAlpha = 1; x.strokeStyle = 'rgba(0,0,0,.18)'; x.lineWidth = 2; x.strokeRect(0, 0, w, h);
  }),
  stucco: (a) => canvas(256, 256, (x, w, h) => { x.fillStyle = a; x.fillRect(0, 0, w, h); for (let i = 0; i < 9000; i++) { x.fillStyle = 'rgba(' + (rnd() < 0.5 ? '60,40,20' : '255,250,240') + ',' + rnd() * 0.08 + ')'; x.beginPath(); x.arc(rnd() * w, rnd() * h, rnd() * 3, 0, 7); x.fill(); } }),
  logs: (a, b) => canvas(256, 256, (x, w, h) => {
    const lh = 32; for (let y = 0; y < h; y += lh) {
      const g2 = x.createLinearGradient(0, y, 0, y + lh); const c = new THREE.Color(a).lerp(new THREE.Color(b), rnd() * 0.6);
      g2.addColorStop(0, '#' + c.clone().offsetHSL(0, 0, -0.12).getHexString()); g2.addColorStop(0.35, '#' + c.clone().offsetHSL(0, 0, 0.06).getHexString()); g2.addColorStop(1, '#' + c.clone().offsetHSL(0, 0, -0.18).getHexString());
      x.fillStyle = g2; x.fillRect(0, y, w, lh); x.fillStyle = 'rgba(230,220,200,.5)'; x.fillRect(0, y + lh - 3, w, 3);
      for (let i = 0; i < 8; i++) { x.strokeStyle = 'rgba(0,0,0,' + rnd() * 0.18 + ')'; x.beginPath(); const yy = y + 4 + rnd() * (lh - 8); x.moveTo(0, yy); x.lineTo(w, yy + rnd() * 4 - 2); x.stroke(); }
    }
  }),
  cinder: (a) => canvas(256, 256, (x, w, h) => { x.fillStyle = '#8a8680'; x.fillRect(0, 0, w, h); const bw = 128, bh = 64; for (let r = 0; r * bh < h; r++) for (let c = -1; c * bw < w; c++) { x.fillStyle = '#' + new THREE.Color(a).offsetHSL(0, 0, (rnd() - 0.5) * 0.05).getHexString(); x.fillRect(c * bw + (r % 2) * bw / 2 + 3, r * bh + 3, bw - 6, bh - 6); } noise(x, w, h, 0.12, 8000); }),
  beadboard: (a) => canvas(256, 64, (x, w, h) => { x.fillStyle = a; x.fillRect(0, 0, w, h); for (let i = 0; i < w; i += 16) { x.fillStyle = 'rgba(0,0,0,.18)'; x.fillRect(i, 0, 2, h); x.fillStyle = 'rgba(255,255,255,.25)'; x.fillRect(i + 2, 0, 1, h); } }),
  terracotta: (a) => canvas(256, 256, (x, w, h) => { x.fillStyle = '#d8c8b0'; x.fillRect(0, 0, w, h); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { x.fillStyle = '#' + new THREE.Color(a).offsetHSL((rnd() - 0.5) * 0.02, 0, (rnd() - 0.5) * 0.12).getHexString(); x.fillRect(i * 64 + 3, j * 64 + 3, 58, 58); } noise(x, w, h, 0.1, 5000); }),
  adobe: (a) => canvas(256, 256, (x, w, h) => { x.fillStyle = a; x.fillRect(0, 0, w, h); for (let i = 0; i < 400; i++) { x.fillStyle = 'rgba(120,60,30,' + rnd() * 0.08 + ')'; x.beginPath(); x.ellipse(rnd() * w, rnd() * h, 10 + rnd() * 30, 4 + rnd() * 12, rnd() * 3, 0, 7); x.fill(); } noise(x, w, h, 0.06, 6000); }),
  wallpaper: (a, b, kind) => canvas(128, 128, (x, w, h) => {
    x.fillStyle = a; x.fillRect(0, 0, w, h); x.fillStyle = b; x.strokeStyle = b;
    if (kind === 'stripe') { for (let i = 0; i < w; i += 32) { x.fillRect(i, 0, 10, h); x.fillRect(i + 16, 0, 2, h); } }
    else if (kind === 'floral') { for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { const cx = 32 + i * 64 + (j % 2) * 32, cy = 32 + j * 64; for (let k = 0; k < 5; k++) { x.beginPath(); x.ellipse(cx + Math.cos(k * 1.256) * 9, cy + Math.sin(k * 1.256) * 9, 7, 4, k * 1.256, 0, 7); x.fill(); } } }
    else { x.lineWidth = 2; for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { const cx = 32 + i * 64, cy = 32 + j * 64; x.beginPath(); x.moveTo(cx, cy - 26); x.lineTo(cx + 20, cy); x.lineTo(cx, cy + 26); x.lineTo(cx - 20, cy); x.closePath(); x.stroke(); } }
    noise(x, w, h, 0.04);
  }),
  planks: (a, b) => canvas(256, 256, (x, w, h) => { const pw = 32; for (let i = 0; i < w; i += pw) { const c = new THREE.Color(a).lerp(new THREE.Color(b), rnd()); x.fillStyle = '#' + c.getHexString(); x.fillRect(i, 0, pw, h); for (let k = 0; k < 10; k++) { x.strokeStyle = 'rgba(0,0,0,' + rnd() * 0.2 + ')'; x.beginPath(); const xx = i + rnd() * pw; x.moveTo(xx, 0); x.bezierCurveTo(xx + rnd() * 6 - 3, h * 0.3, xx + rnd() * 6 - 3, h * 0.7, xx, h); x.stroke(); } x.fillStyle = 'rgba(0,0,0,.45)'; x.fillRect(i, 0, 2, h); for (let k = 0; k < 2; k++) { x.fillStyle = 'rgba(30,20,10,.6)'; x.beginPath(); x.arc(i + 6, rnd() * h, 1.5, 0, 7); x.fill(); } } }),
  coffer: (a, b) => canvas(256, 256, (x, w, h) => { x.fillStyle = b; x.fillRect(0, 0, w, h); for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { const g2 = x.createLinearGradient(i * 128, j * 128, i * 128 + 128, j * 128 + 128); g2.addColorStop(0, a); g2.addColorStop(1, '#' + new THREE.Color(a).offsetHSL(0, 0, -0.12).getHexString()); x.fillStyle = g2; x.fillRect(i * 128 + 14, j * 128 + 14, 100, 100); x.strokeStyle = 'rgba(255,230,160,.4)'; x.lineWidth = 3; x.strokeRect(i * 128 + 20, j * 128 + 20, 88, 88); } }),
  dropceil: () => canvas(256, 256, (x, w, h) => { x.fillStyle = '#e4e2dc'; x.fillRect(0, 0, w, h); noise(x, w, h, 0.12, 6000); x.fillStyle = '#c8c6c0'; for (let i = 0; i <= w; i += 128) { x.fillRect(i - 2, 0, 4, h); x.fillRect(0, i - 2, w, 4); } })
});

// ── What's on the TVs ────────────────────────────────────────────────────────────────────────────────────
const SHOW = {
  football: (x, w, h) => {
    const g2 = x.createLinearGradient(0, 0, 0, h); g2.addColorStop(0, '#1a3a1a'); g2.addColorStop(0.25, '#2a6a2a'); g2.addColorStop(1, '#3a8a32'); x.fillStyle = g2; x.fillRect(0, 0, w, h);
    x.fillStyle = '#121a2a'; x.fillRect(0, 0, w, h * 0.22); for (let i = 0; i < 300; i++) { x.fillStyle = pick(['#c84a2a', '#2a4ac8', '#e8e0d0', '#f0c030']); x.fillRect(rnd() * w, rnd() * h * 0.2, 2, 2); }
    x.strokeStyle = 'rgba(255,255,255,.8)'; x.lineWidth = 2; for (let i = 0; i < 11; i++) { const xx = w * 0.05 + i * w * 0.09; x.beginPath(); x.moveTo(xx + (i - 5) * 8, h * 0.25); x.lineTo(xx + (i - 5) * 20, h); x.stroke(); }
    for (let i = 0; i < 22; i++) { x.fillStyle = i < 11 ? '#e8e8f0' : '#a01a1a'; x.beginPath(); x.arc(w * 0.38 + (i % 11) * w * 0.022 + (i < 11 ? 0 : 6), h * 0.55 + (i < 11 ? 0 : 14) + rnd() * 10, 4, 0, 7); x.fill(); }
    x.fillStyle = 'rgba(10,10,20,.88)'; x.fillRect(w * 0.1, h * 0.86, w * 0.8, h * 0.1); x.fillStyle = '#fff'; x.font = '700 ' + (h * 0.07 | 0) + 'px sans-serif'; x.fillText('DEN 21   KC 17   4TH  2:14', w * 0.13, h * 0.935);
  },
  baseball: (x, w, h) => {
    x.fillStyle = '#2a6a2a'; x.fillRect(0, 0, w, h); x.fillStyle = '#b07a4a'; x.beginPath(); x.moveTo(w / 2, h * 0.95); x.lineTo(w * 0.2, h * 0.5); x.lineTo(w / 2, h * 0.25); x.lineTo(w * 0.8, h * 0.5); x.closePath(); x.fill();
    x.fillStyle = '#3a8a32'; x.beginPath(); x.moveTo(w / 2, h * 0.82); x.lineTo(w * 0.32, h * 0.52); x.lineTo(w / 2, h * 0.36); x.lineTo(w * 0.68, h * 0.52); x.closePath(); x.fill();
    x.fillStyle = '#fff'; [[0.5, 0.92], [0.24, 0.5], [0.5, 0.27], [0.76, 0.5]].forEach(p => x.fillRect(w * p[0] - 4, h * p[1] - 4, 8, 8));
    x.fillStyle = 'rgba(10,10,20,.88)'; x.fillRect(w * 0.05, h * 0.05, w * 0.3, h * 0.12); x.fillStyle = '#fff'; x.font = '700 ' + (h * 0.06 | 0) + 'px sans-serif'; x.fillText('COL 3  LAD 2  7th', w * 0.07, h * 0.13);
  },
  horses: (x, w, h) => {
    x.fillStyle = '#2a5a2a'; x.fillRect(0, 0, w, h); x.fillStyle = '#9a6a3a'; x.fillRect(0, h * 0.4, w, h * 0.42); x.fillStyle = '#fff'; x.fillRect(0, h * 0.4, w, 3); x.fillRect(0, h * 0.82, w, 3);
    for (let i = 0; i < 8; i++) { const hx = w * 0.3 + i * w * 0.07 + rnd() * 20, hy = h * 0.45 + (i % 4) * h * 0.09; x.fillStyle = '#3a2010'; x.beginPath(); x.ellipse(hx, hy, 18, 8, 0, 0, 7); x.fill(); x.fillStyle = pick(['#e02020', '#2040e0', '#f0d020', '#20a040', '#fff']); x.fillRect(hx - 4, hy - 14, 8, 8); }
    x.fillStyle = 'rgba(0,0,0,.85)'; x.fillRect(0, 0, w, h * 0.14); x.fillStyle = '#ffd84d'; x.font = '700 ' + (h * 0.07 | 0) + 'px sans-serif'; x.fillText('RACE 6   1/2 MILE   :46.2', w * 0.04, h * 0.095);
  },
  poker: (x, w, h) => {
    x.fillStyle = '#0a1830'; x.fillRect(0, 0, w, h); x.fillStyle = '#1a5a8a'; x.beginPath(); x.ellipse(w / 2, h * 0.55, w * 0.38, h * 0.3, 0, 0, 7); x.fill(); x.strokeStyle = '#2a1a10'; x.lineWidth = 10; x.stroke();
    for (let i = 0; i < 5; i++) { x.fillStyle = '#fff'; x.fillRect(w * 0.36 + i * w * 0.058, h * 0.5, w * 0.048, h * 0.13); x.fillStyle = i % 2 ? '#c01a2a' : '#111'; x.font = '700 ' + (h * 0.07 | 0) + 'px serif'; x.fillText('AKQJ9'[i], w * 0.365 + i * w * 0.058, h * 0.59); }
    for (let i = 0; i < 3; i++) { x.fillStyle = 'rgba(0,0,0,.8)'; x.fillRect(w * 0.03, h * 0.08 + i * h * 0.12, w * 0.28, h * 0.1); x.fillStyle = '#fff'; x.font = '700 ' + (h * 0.05 | 0) + 'px sans-serif'; x.fillText(pick(['NEGREANU', 'IVEY', 'HELLMUTH', 'KENNEY', 'SEIDEL']) + '  ' + (20 + rnd() * 70 | 0) + '%', w * 0.045, h * 0.145 + i * h * 0.12); }
  },
  board: (x, w, h) => {
    x.fillStyle = '#05070c'; x.fillRect(0, 0, w, h); x.fillStyle = '#ffd84d'; x.font = '700 ' + (h * 0.09 | 0) + 'px sans-serif'; x.fillText('NOW PLAYING', w * 0.05, h * 0.14);
    const rows = [['1/2 NLH', '6', '14'], ['2/5 NLH', '3', '9'], ['1/2 PLO', '2', '5'], ['4/8 LIMIT', '1', '2'], ['5/10 NLH', '1', '6']];
    x.font = '700 ' + (h * 0.075 | 0) + 'px monospace'; rows.forEach((r, i) => { x.fillStyle = i % 2 ? '#8ad8ff' : '#ffffff'; x.fillText(r[0], w * 0.05, h * (0.3 + i * 0.14)); x.fillText(r[1] + ' TBL', w * 0.5, h * (0.3 + i * 0.14)); x.fillText(r[2] + ' WAIT', w * 0.72, h * (0.3 + i * 0.14)); });
  },
  clock: (x, w, h) => {
    const g2 = x.createLinearGradient(0, 0, 0, h); g2.addColorStop(0, '#0a1a3a'); g2.addColorStop(1, '#020610'); x.fillStyle = g2; x.fillRect(0, 0, w, h);
    x.textAlign = 'center'; x.fillStyle = '#8ad8ff'; x.font = '700 ' + (h * 0.09 | 0) + 'px sans-serif'; x.fillText('LEVEL 14', w / 2, h * 0.16);
    x.fillStyle = '#fff'; x.font = '700 ' + (h * 0.3 | 0) + 'px sans-serif'; x.fillText('17:42', w / 2, h * 0.5);
    x.fillStyle = '#ffd84d'; x.font = '700 ' + (h * 0.1 | 0) + 'px sans-serif'; x.fillText('4,000 / 8,000  ante 8,000', w / 2, h * 0.7);
    x.fillStyle = '#c8d0e0'; x.font = '600 ' + (h * 0.065 | 0) + 'px sans-serif'; x.fillText('PLAYERS LEFT 412   AVG STACK 214,000', w / 2, h * 0.88); x.textAlign = 'left';
  },
  slotad: (x, w, h) => { const g2 = x.createLinearGradient(0, 0, w, h); g2.addColorStop(0, '#5a0a6a'); g2.addColorStop(1, '#ff3a8a'); x.fillStyle = g2; x.fillRect(0, 0, w, h); x.fillStyle = '#ffd84d'; x.textAlign = 'center'; x.font = '900 ' + (h * 0.2 | 0) + 'px sans-serif'; x.fillText('JACKPOT', w / 2, h * 0.45); x.fillStyle = '#fff'; x.font = '900 ' + (h * 0.16 | 0) + 'px sans-serif'; x.fillText('$1,284,612', w / 2, h * 0.72); x.textAlign = 'left'; }
};
// a flat-screen TV (on the wall, or hung from the ceiling with o.pole)
function tvSet(g, x, y, z, w, ry, show, o) {
  o = o || {};
  const h = w * 9 / 16, t = new THREE.Group(); t.position.set(x, y, z); t.rotation.y = ry || 0; g.add(t);
  rbox(t, w + 0.05, h + 0.05, 0.06, 0.01, M({ color: 0x0a0a0c, roughness: 0.25, metalness: 0.3 }), 0, 0, 0);
  plane(t, w, h, new THREE.MeshBasicMaterial({ map: tex(canvas(512, 288, (x2, cw, ch) => (SHOW[show] || SHOW.football)(x2, cw, ch))) }), 0, 0, 0.032);
  if (o.pole) cyl(t, 0.025, 0.025, o.pole, M({ color: 0x1a1a1a, metalness: 0.6 }), 0, h / 2 + o.pole / 2, -0.02, 8);
  light(t, 0xa8c8ff, 0.5 * w, 0, 0, 0.6, 3);
  return t;
}
// a restaurant booth: two high-backed benches and a table
function booth(g, x, z, ry, col, wood) {
  const b = new THREE.Group(); b.position.set(x, 0, z); b.rotation.y = ry || 0; g.add(b);
  const up = M({ color: col || 0x7a1a1a, roughness: 0.4, envMapIntensity: 0.6 }), wd = M({ color: wood || 0x3a2414, roughness: 0.5 });
  for (const s of [-1, 1]) { rbox(b, 1.3, 0.45, 0.5, 0.04, wd, 0, 0.22, s * 0.62); rbox(b, 1.28, 0.12, 0.48, 0.05, up, 0, 0.5, s * 0.6); rbox(b, 1.28, 0.62, 0.14, 0.05, up, 0, 0.92, s * 0.83); rbox(b, 1.3, 0.06, 0.18, 0.02, wd, 0, 1.25, s * 0.84); }
  rbox(b, 1.2, 0.05, 0.7, 0.02, M({ color: 0x2a1a10, roughness: 0.3 }), 0, 0.76, 0); cyl(b, 0.05, 0.05, 0.72, M({ color: 0x222222, metalness: 0.6 }), 0, 0.38, 0, 10); cyl(b, 0.25, 0.25, 0.03, M({ color: 0x222222, metalness: 0.6 }), 0, 0.015, 0, 18);
  return b;
}
function poolTable(g, x, z, ry, felt) {
  const p = new THREE.Group(); p.position.set(x, 0, z); p.rotation.y = ry || 0; g.add(p);
  const wd = M({ map: tex(PAINT.wood('#4a2410', '#3a1a08', 16), 2, 1), roughness: 0.35 });
  rbox(p, 2.6, 0.22, 1.5, 0.04, wd, 0, 0.7, 0); rbox(p, 2.36, 0.04, 1.26, 0.02, cloth(felt || 0x1a5a8a, 0.95), 0, 0.81, 0);
  for (const s of [-1, 1]) { rbox(p, 2.3, 0.06, 0.08, 0.02, cloth(felt || 0x1a5a8a, 0.9), 0, 0.84, s * 0.64); rbox(p, 0.08, 0.06, 1.2, 0.02, cloth(felt || 0x1a5a8a, 0.9), s * 1.18, 0.84, 0); }
  for (const [px, pz] of [[-1.2, -0.66], [0, -0.68], [1.2, -0.66], [-1.2, 0.66], [0, 0.68], [1.2, 0.66]]) sph(p, 0.06, M({ color: 0x050505 }), px, 0.83, pz, 10);
  for (const [lx, lz] of [[-1.1, -0.6], [1.1, -0.6], [-1.1, 0.6], [1.1, 0.6]]) rbox(p, 0.16, 0.6, 0.16, 0.03, wd, lx, 0.3, lz);
  const bc = [0xf0d020, 0x2040c0, 0xd02020, 0x5a1a8a, 0xf07020, 0x20803a, 0x7a1a1a, 0x111111];
  let k = 0; for (let r = 0; r < 4; r++) for (let i = 0; i <= r; i++) sph(p, 0.028, M({ color: bc[k++ % 8], roughness: 0.15, envMapIntensity: 1.2 }), 0.55 + r * 0.05, 0.86, (i - r / 2) * 0.058, 10);
  sph(p, 0.028, M({ color: 0xf8f6f0, roughness: 0.15 }), -0.6, 0.86, 0.1, 10);
  const cue = cyl(p, 0.008, 0.014, 1.45, M({ color: 0xc89a60, roughness: 0.4 }), -0.2, 0.87, 0.25, 8); cue.rotation.z = Math.PI / 2 - 0.02; cue.rotation.y = 0.2;
  // the billiard lamp: three shades on a bar
  box(p, 1.8, 0.05, 0.12, M({ color: 0x2a1a0a, roughness: 0.4 }), 0, 1.75, 0);
  for (let i = -1; i <= 1; i++) { const s = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.2, 0.16, 20, 1, true), M({ color: 0x1a4a2a, side: THREE.DoubleSide, roughness: 0.4 })); s.position.set(i * 0.6, 1.66, 0); p.add(s); const d = new THREE.Mesh(new THREE.CircleGeometry(0.19, 20), glow(0xffe0b0, 1.6)); d.rotation.x = Math.PI / 2; d.position.set(i * 0.6, 1.585, 0); p.add(d); }
  for (const s of [-1, 1]) cyl(p, 0.004, 0.004, 1.2, M({ color: 0x111111 }), s * 0.8, 2.35, 0, 4);
  spot(p, 0xffe8c0, 5, 0, 1.6, 0, 0, 0, 0.9).target.position.set(x, 0, z);
  return p;
}
function dartboard(g, x, y, z, ry) {
  const d = new THREE.Group(); d.position.set(x, y, z); d.rotation.y = ry || 0; g.add(d);
  rbox(d, 0.75, 0.75, 0.06, 0.02, M({ color: 0x2a1a0a, roughness: 0.5 }), 0, 0, -0.03);
  const face = cyl(d, 0.23, 0.23, 0.04, M({ map: tex(canvas(128, 128, (x2, w, h) => { for (let i = 0; i < 20; i++) { x2.fillStyle = i % 2 ? '#141414' : '#e8dcc0'; x2.beginPath(); x2.moveTo(64, 64); x2.arc(64, 64, 64, i / 20 * 6.283, (i + 1) / 20 * 6.283); x2.fill(); } for (const [r1, r2] of [[60, 54], [36, 31]]) for (let i = 0; i < 20; i++) { x2.fillStyle = i % 2 ? '#1a7a2a' : '#c01a1a'; x2.beginPath(); x2.arc(64, 64, r1, i / 20 * 6.283, (i + 1) / 20 * 6.283); x2.arc(64, 64, r2, (i + 1) / 20 * 6.283, i / 20 * 6.283, true); x2.fill(); } x2.fillStyle = '#1a7a2a'; x2.beginPath(); x2.arc(64, 64, 7, 0, 7); x2.fill(); x2.fillStyle = '#c01a1a'; x2.beginPath(); x2.arc(64, 64, 3, 0, 7); x2.fill(); })), roughness: 0.8 }), 0, 0, 0.01, 32);
  face.rotation.x = Math.PI / 2;
  for (let i = 0; i < 3; i++) { const dt = cyl(d, 0.004, 0.004, 0.12, M({ color: 0xc0c0c8, metalness: 0.8 }), (rnd() - 0.5) * 0.2, (rnd() - 0.5) * 0.2, 0.08, 6); dt.rotation.x = Math.PI / 2; }
  plane(d, 0.3, 0.42, M({ color: 0x1a1a1a, roughness: 0.9 }), 0.58, 0, -0.02);
}
function jukebox(g, x, z, ry) {
  const j = new THREE.Group(); j.position.set(x, 0, z); j.rotation.y = ry || 0; g.add(j);
  rbox(j, 0.8, 1.2, 0.55, 0.06, M({ color: 0x5a2a10, roughness: 0.3, envMapIntensity: 0.8 }), 0, 0.6, 0);
  const arch = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.55, 24, 1, false, -Math.PI / 2, Math.PI), M({ color: 0x5a2a10, roughness: 0.3 })); arch.rotation.x = Math.PI / 2; arch.rotation.z = Math.PI / 2; arch.position.set(0, 1.2, 0); j.add(arch);
  const tube = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.03, 8, 24, Math.PI), glow(0xff8a20, 2.4)); tube.position.set(0, 1.2, 0.28); j.add(tube);
  const tube2 = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.025, 8, 24, Math.PI), glow(0x3ad8ff, 2.2)); tube2.position.set(0, 1.2, 0.29); j.add(tube2);
  for (const s of [-1, 1]) box(j, 0.05, 0.9, 0.03, glow(s < 0 ? 0xff3a6a : 0xffd84d, 2), s * 0.34, 0.65, 0.28);
  plane(j, 0.5, 0.32, M({ color: 0xf0e0c0, emissive: 0xffe0a0, emissiveIntensity: 0.5 }), 0, 0.85, 0.28); box(j, 0.6, 0.3, 0.02, M({ color: 0xc0c0c8, metalness: 0.9, roughness: 0.2 }), 0, 0.4, 0.28);
  light(j, 0xff9a40, 1.2, 0, 1.0, 0.6, 3);
}
function chalkboard(g, x, y, z, w, h, ry, lines, frame) {
  const c = canvas(512, Math.round(512 * h / w), (x2, cw, ch) => { x2.fillStyle = '#1e2420'; x2.fillRect(0, 0, cw, ch); noise(x2, cw, ch, 0.06, 4000); x2.textAlign = 'center'; lines.forEach((l, i) => { x2.fillStyle = i ? pick(['#f4f0e8', '#ffd84d', '#9ad8ff', '#ff9a9a']) : '#f4f0e8'; x2.font = (i ? '600 ' : '700 ') + Math.round(ch / (lines.length + 1.5) * (i ? 0.62 : 0.9)) + 'px "Chalkboard SE", "Comic Sans MS", sans-serif'; x2.fillText(l, cw / 2, (i + 1.1) * ch / (lines.length + 0.7)); }); });
  const grp = new THREE.Group(); grp.position.set(x, y, z); if (ry) grp.rotation.y = ry; g.add(grp);
  rbox(grp, w + 0.1, h + 0.1, 0.04, 0.01, M({ color: frame || 0x5a3a1a, roughness: 0.6 }), 0, 0, -0.01); plane(grp, w, h, M({ map: tex(c), roughness: 0.95 }), 0, 0, 0.015);
}
function sofa(g, x, z, ry, col, len) {
  len = len || 2; const s = new THREE.Group(); s.position.set(x, 0, z); s.rotation.y = ry || 0; g.add(s);
  const up = cloth(col || 0x5a4a3a, 0.9);
  rbox(s, len, 0.32, 0.9, 0.06, up, 0, 0.22, 0); rbox(s, len, 0.5, 0.22, 0.08, up, 0, 0.58, -0.36);
  for (const sx of [-1, 1]) rbox(s, 0.2, 0.55, 0.9, 0.08, up, sx * (len / 2 - 0.1), 0.38, 0);
  const n = Math.max(2, Math.round(len / 0.75)); for (let i = 0; i < n; i++) rbox(s, (len - 0.4) / n - 0.02, 0.14, 0.62, 0.06, up, -len / 2 + 0.2 + (i + 0.5) * (len - 0.4) / n, 0.45, 0.06);
  for (const sx of [-1, 1]) { const p = rbox(s, 0.38, 0.32, 0.12, 0.06, cloth(pick([0xc8a050, 0x8a2a2a, 0x2a4a6a, 0xe8e0d0])), sx * (len / 2 - 0.42), 0.66, -0.2); p.rotation.set(-0.3, sx * 0.3, 0); }
  for (const [lx, lz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) cyl(s, 0.025, 0.02, 0.06, M({ color: 0x1a1a1a }), lx * (len / 2 - 0.08), 0.03, lz * 0.38, 8);
  return s;
}
// a car parked in the garage: body, cabin with glass, wheels, lights
function car(g, x, z, ry, col, pickup) {
  const c = new THREE.Group(); c.position.set(x, 0, z); c.rotation.y = ry || 0; g.add(c);
  const paint = new THREE.MeshPhysicalMaterial({ color: col || 0x2a4a7a, roughness: 0.25, metalness: 0.6, clearcoat: 1, clearcoatRoughness: 0.1, envMapIntensity: 1.2 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x1a2028, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.75, envMapIntensity: 1.5 });
  rbox(c, 1.82, 0.62, 4.6, 0.14, paint, 0, 0.62, 0);
  if (pickup) { rbox(c, 1.78, 0.62, 1.8, 0.12, paint, 0, 1.18, 0.7); rbox(c, 1.6, 0.48, 1.7, 0.08, glass, 0, 1.2, 0.72); box(c, 1.7, 0.4, 0.06, paint, 0, 1.05, -2.25); for (const s of [-1, 1]) box(c, 0.06, 0.4, 2.3, paint, s * 0.88, 1.05, -1.1); }
  else {   // the cabin: pillars and roof in the paint, glass in the windows
    rbox(c, 1.62, 0.08, 1.9, 0.04, paint, 0, 1.46, -0.15);
    for (const s2 of [-1, 1]) { for (const pz of [0.75, -0.15, -1.05]) { const p2 = box(c, 0.06, 0.52, 0.08, paint, s2 * 0.78, 1.18, pz); p2.rotation.x = pz > 0.5 ? -0.5 : pz < -0.5 ? 0.45 : 0; } plane(c, 1.8, 0.46, glass, s2 * 0.8, 1.18, -0.15, s2 * Math.PI / 2); }
    const ws = plane(c, 1.5, 0.6, glass, 0, 1.18, 0.95); ws.rotation.x = -0.9; const rw = plane(c, 1.5, 0.55, glass, 0, 1.18, -1.28, Math.PI); rw.rotation.x = 0.8;
    for (let i = 0; i < 2; i++) rbox(c, 0.6, 0.5, 0.5, 0.08, M({ color: 0x2a2a2e, roughness: 0.7 }), (i - 0.5) * 0.75, 0.98, 0.2);
  }
  const tire = M({ color: 0x111111, roughness: 0.8 }), rim = M({ color: 0xb8bcc4, metalness: 0.9, roughness: 0.25 });
  for (const [wx, wz] of [[-0.86, 1.45], [0.86, 1.45], [-0.86, -1.5], [0.86, -1.5]]) { const t = cyl(c, 0.34, 0.34, 0.24, tire, wx, 0.34, wz, 24); t.rotation.z = Math.PI / 2; const r = cyl(c, 0.2, 0.2, 0.25, rim, wx, 0.34, wz, 16); r.rotation.z = Math.PI / 2; }
  for (const s of [-1, 1]) { box(c, 0.36, 0.1, 0.04, glow(0xfff4e0, 0.6), s * 0.6, 0.72, 2.3); box(c, 0.36, 0.1, 0.04, glow(0xc01010, 0.8), s * 0.62, 0.78, -2.3); }
  box(c, 1.5, 0.1, 0.04, M({ color: 0x1a1a1a, roughness: 0.4 }), 0, 0.45, 2.3);
  return c;
}
function workbench(g, x, z, ry) {
  const w = new THREE.Group(); w.position.set(x, 0, z); w.rotation.y = ry || 0; g.add(w);
  const wd = M({ map: tex(PAINT.wood('#b88a50', '#9a7040', 12), 2, 1), roughness: 0.7 });
  box(w, 2.2, 0.06, 0.7, wd, 0, 0.9, 0); box(w, 2.1, 0.04, 0.6, wd, 0, 0.25, 0); for (const [lx, lz] of [[-1, -0.3], [1, -0.3], [-1, 0.3], [1, 0.3]]) box(w, 0.07, 0.9, 0.07, wd, lx, 0.45, lz);
  const peg = canvas(256, 128, (x2, cw, ch) => { x2.fillStyle = '#b89a70'; x2.fillRect(0, 0, cw, ch); x2.fillStyle = '#5a4a30'; for (let i = 4; i < cw; i += 8) for (let j = 4; j < ch; j += 8) x2.fillRect(i, j, 2, 2); });
  plane(w, 2.2, 1.0, M({ map: tex(peg), roughness: 0.9 }), 0, 1.5, -0.34);
  const tool = M({ color: 0x8a8e94, metalness: 0.8, roughness: 0.35 }), handle = M({ color: 0xc01a1a, roughness: 0.5 });
  for (let i = 0; i < 9; i++) { const tx = -0.95 + i * 0.24; if (i % 3 === 0) { box(w, 0.03, 0.26, 0.02, tool, tx, 1.55, -0.32); box(w, 0.06, 0.1, 0.03, handle, tx, 1.4, -0.32); } else if (i % 3 === 1) { box(w, 0.14, 0.05, 0.02, tool, tx, 1.7, -0.32); box(w, 0.03, 0.2, 0.03, M({ color: 0x8a5a2a }), tx, 1.58, -0.32); } else { const r = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.012, 6, 16), M({ color: 0xd8a020 })); r.position.set(tx, 1.4, -0.32); w.add(r); } }
  rbox(w, 0.5, 0.25, 0.3, 0.03, M({ color: 0xc01a1a, metalness: 0.5, roughness: 0.4 }), 0.6, 1.06, 0.05);
  box(w, 0.18, 0.12, 0.12, M({ color: 0x3a4a5a, metalness: 0.7 }), -0.8, 0.99, 0.2);
  cyl(w, 0.08, 0.08, 0.12, M({ color: 0x2a5aa0, metalness: 0.3 }), -0.2, 0.99, 0.1, 14);
  box(w, 1.6, 0.04, 0.1, glow(0xe8f0ff, 2), 0, 2.05, -0.25); light(w, 0xe8f0ff, 1.5, 0, 1.95, 0.1, 3);
}
function metalShelf(g, x, z, ry, w, h) {
  const s = new THREE.Group(); s.position.set(x, 0, z); s.rotation.y = ry || 0; g.add(s);
  const mt = M({ color: 0x5a5e64, metalness: 0.7, roughness: 0.4 });
  for (const [px, pz] of [[-w / 2, -0.22], [w / 2, -0.22], [-w / 2, 0.22], [w / 2, 0.22]]) box(s, 0.04, h, 0.04, mt, px, h / 2, pz);
  const rows = Math.floor(h / 0.45);
  for (let r = 0; r < rows; r++) { const y = 0.1 + r * 0.45; box(s, w, 0.03, 0.46, mt, 0, y, 0); for (let i = 0; i < w / 0.5; i++) { const c = pick([0x2a5aa0, 0x2a8a3a, 0xd8d0c0, 0xc0401a, 0x1a1a1a]); rbox(s, 0.44, 0.3, 0.4, 0.03, M({ color: c, roughness: 0.6, transparent: c === 0xd8d0c0, opacity: 0.85 }), -w / 2 + 0.27 + i * 0.5, y + 0.17, 0); } }
}
function ceilingFan(g, x, y, z) {
  const f = new THREE.Group(); f.position.set(x, y, z); g.add(f);
  const br = M({ color: 0x5a4a30, metalness: 0.7, roughness: 0.35 }), bl = M({ map: tex(PAINT.wood('#6a4020', '#5a3418', 12)), roughness: 0.6 });
  cyl(f, 0.015, 0.015, 0.3, br, 0, -0.15, 0, 6); cyl(f, 0.12, 0.14, 0.12, br, 0, -0.35, 0, 18);
  for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; const b = rbox(f, 0.62, 0.012, 0.14, 0.005, bl, Math.cos(a) * 0.42, -0.36, Math.sin(a) * 0.42); b.rotation.y = -a; }
  sph(f, 0.09, glow(0xffe8c0, 1.4), 0, -0.45, 0, 12); light(f, 0xffe8c0, 1.2, 0, -0.55, 0, 5);
}
function rugAt(g, x, z, w, d, painter, ry) { const r = plane(g, w, d, M({ map: tex(painter), roughness: 0.95 }), x, 0.006, z, 0, -Math.PI / 2); if (ry) r.rotation.z = ry; r.userData.flat = 1; return r; }
function sconce(g, x, y, z, ry, color) {
  const s = new THREE.Group(); s.position.set(x, y, z); s.rotation.y = ry || 0; g.add(s);
  const br = M({ color: 0xb08a40, metalness: 0.9, roughness: 0.3 });
  cyl(s, 0.05, 0.05, 0.02, br, 0, 0, 0.01, 12).rotation.x = Math.PI / 2; box(s, 0.02, 0.02, 0.12, br, 0, 0, 0.07);
  const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 0.14, 16, 1, true), M({ color: 0xf4e8d0, emissive: color || 0xffd8a0, emissiveIntensity: 0.9, side: THREE.DoubleSide })); sh.position.set(0, 0.06, 0.14); s.add(sh);
  light(s, color || 0xffd8a0, 0.6, 0, 0.1, 0.25, 2.2);
}
function mirrorAt(g, x, y, z, w, h, ry, frameCol) {
  const m = new THREE.Group(); m.position.set(x, y, z); m.rotation.y = ry || 0; g.add(m);
  rbox(m, w + 0.12, h + 0.12, 0.05, 0.02, M({ color: frameCol || 0xb08a40, metalness: 0.8, roughness: 0.3 }), 0, 0, 0);
  plane(m, w, h, M({ color: 0xa8b0b8, metalness: 1, roughness: 0.04, envMapIntensity: 1.4 }), 0, 0, 0.03);
}
function column(g, x, z, h, mat, cap) {
  cyl(g, 0.2, 0.22, h - 0.5, mat, x, h / 2, z, 24);
  box(g, 0.56, 0.22, 0.56, cap || mat, x, 0.11, z); box(g, 0.5, 0.06, 0.5, cap || mat, x, 0.25, z);
  box(g, 0.56, 0.16, 0.56, cap || mat, x, h - 0.08, z); const c = cyl(g, 0.25, 0.2, 0.16, cap || mat, x, h - 0.24, z, 24);
}
// picture-frame moulding panels along a wall (z: the wall's plane, facing +z)
function wallPanels(g, x0, x1, z, y0, y1, mat, n) {
  n = n || Math.max(1, Math.round((x1 - x0) / 1.4)); const pw = (x1 - x0) / n;
  for (let i = 0; i < n; i++) { const cx = x0 + (i + 0.5) * pw, w = pw - 0.3, h = y1 - y0; box(g, w, 0.035, 0.025, mat, cx, y1, z); box(g, w, 0.035, 0.025, mat, cx, y0, z); box(g, 0.035, h, 0.025, mat, cx - w / 2, (y0 + y1) / 2, z); box(g, 0.035, h, 0.025, mat, cx + w / 2, (y0 + y1) / 2, z); }
}
function pianoUpright(g, x, z, ry, col) {
  const p = new THREE.Group(); p.position.set(x, 0, z); p.rotation.y = ry || 0; g.add(p);
  const wd = M({ color: col || 0x2a1408, roughness: 0.25, envMapIntensity: 0.9 });
  rbox(p, 1.5, 1.25, 0.6, 0.03, wd, 0, 0.62, 0); rbox(p, 1.5, 0.08, 0.3, 0.02, wd, 0, 0.74, 0.42);
  box(p, 1.36, 0.02, 0.16, M({ color: 0xf4f0e6, roughness: 0.3 }), 0, 0.79, 0.4); for (let i = 0; i < 36; i++) if (i % 7 !== 2 && i % 7 !== 6) box(p, 0.016, 0.02, 0.09, M({ color: 0x111111 }), -0.65 + i * 0.037 + 0.018, 0.81, 0.36);
  for (const s of [-1, 1]) cyl(p, 0.035, 0.035, 0.6, wd, s * 0.62, 0.3, 0.45, 10);
  for (let i = 0; i < 2; i++) { cyl(p, 0.035, 0.04, 0.1, M({ color: 0xc8a050, metalness: 0.8 }), -0.4 + i * 0.8, 1.3, 0.1, 10); sph(p, 0.025, glow(0xffc070, 2.5), -0.4 + i * 0.8, 1.38, 0.1, 8); }
}
let BARREL = null;
function barrelGeo() { if (!BARREL) BARREL = new THREE.LatheGeometry([[0.001, 0], [0.26, 0], [0.31, 0.2], [0.33, 0.4], [0.31, 0.6], [0.26, 0.8], [0.001, 0.8]].map(p => new THREE.Vector2(p[0], p[1])), 24); return BARREL; }
function barrel(g, x, y, z, side, ry) {
  const b = new THREE.Group(); b.position.set(x, y, z); b.rotation.y = ry || 0; g.add(b);
  const m = new THREE.Mesh(barrelGeo(), M({ map: tex(PAINT.planks('#7a4a24', '#5a3418'), 3, 1), roughness: 0.7 })); b.add(m);
  for (const hy of [0.1, 0.3, 0.5, 0.7]) { const r = 0.26 + Math.sin(hy / 0.8 * Math.PI) * 0.072; const t = new THREE.Mesh(new THREE.TorusGeometry(r, 0.012, 6, 32), M({ color: 0x2a2a2a, metalness: 0.7, roughness: 0.5 })); t.rotation.x = Math.PI / 2; t.position.y = hy; b.add(t); }
  if (side) { b.rotation.z = Math.PI / 2; b.position.y = y + 0.33; }
  return b;
}
// a mounted head: a plaque, a neck, a head, antlers (deer) or palms (moose)
function mountedHead(g, x, y, z, ry, moose) {
  const h = new THREE.Group(); h.position.set(x, y, z); h.rotation.y = ry || 0; g.add(h);
  const fur = M({ color: moose ? 0x3a2414 : 0x8a6a44, roughness: 0.95 }), ant = M({ color: 0xd8c8a8, roughness: 0.7 });
  rbox(h, 0.5, 0.6, 0.05, 0.03, M({ map: tex(PAINT.wood('#6a4020', '#4a2a14', 12)), roughness: 0.4 }), 0, 0, 0);
  const neck = cyl(h, 0.16, 0.2, 0.35, fur, 0, -0.05, 0.18, 16); neck.rotation.x = Math.PI / 2 - 0.4;
  const head = sph(h, 0.15, fur, 0, 0.05, 0.36, 16); head.scale.set(0.85, 0.9, 1.3);
  const snout = sph(h, 0.09, fur, 0, -0.02, 0.52, 12); snout.scale.set(0.9, 0.8, 1.4);
  for (const s of [-1, 1]) { sph(h, 0.02, M({ color: 0x0a0a0a, roughness: 0.2 }), s * 0.1, 0.1, 0.44, 8); const ear = sph(h, 0.05, fur, s * 0.15, 0.17, 0.3, 8); ear.scale.set(0.5, 1.4, 0.6); }
  for (const s of [-1, 1]) {
    if (moose) { seg(h, [s * 0.1, 0.15, 0.32], [s * 0.3, 0.22, 0.3], 0.03, 0.025, ant); const palm = rbox(h, 0.3, 0.04, 0.2, 0.02, ant, s * 0.42, 0.3, 0.3); palm.rotation.z = s * 0.5; }
    else { seg(h, [s * 0.08, 0.17, 0.32], [s * 0.2, 0.42, 0.28], 0.018, 0.014, ant); for (let k = 0; k < 3; k++) seg(h, [s * (0.11 + k * 0.03), 0.24 + k * 0.06, 0.3], [s * (0.07 + k * 0.05), 0.36 + k * 0.08, 0.36], 0.011, 0.008, ant); }
  }
}
// casino pit: a blackjack table (half moon) or a roulette table
function tableGame(g, x, z, ry, kind, felt) {
  const t = new THREE.Group(); t.position.set(x, 0, z); t.rotation.y = ry || 0; g.add(t);
  const fm = M({ color: felt || 0x1a5a2a, roughness: 0.95 }), wd = M({ color: 0x3a1a0a, roughness: 0.3 });
  if (kind === 'roulette') {
    rbox(t, 2.4, 0.08, 1.0, 0.03, wd, 0, 0.82, 0); box(t, 1.5, 0.02, 0.8, M({ map: tex(canvas(256, 128, (x2, w, h) => { x2.fillStyle = '#1a5a2a'; x2.fillRect(0, 0, w, h); for (let i = 0; i < 12; i++) for (let j = 0; j < 3; j++) { x2.fillStyle = (i + j) % 2 ? '#a01a1a' : '#111'; x2.fillRect(8 + i * 20, 8 + j * 30, 18, 28); } x2.strokeStyle = '#ddd'; x2.strokeRect(8, 8, 240, 90); })), roughness: 0.9 }), 0.35, 0.87, 0);
    cyl(t, 0.42, 0.45, 0.12, wd, -0.85, 0.9, 0, 32); const wh = cyl(t, 0.36, 0.36, 0.02, M({ map: tex(canvas(128, 128, (x2, w, h) => { for (let i = 0; i < 37; i++) { x2.fillStyle = i === 0 ? '#1a8a2a' : i % 2 ? '#a01a1a' : '#111'; x2.beginPath(); x2.moveTo(64, 64); x2.arc(64, 64, 64, i / 37 * 6.283, (i + 1) / 37 * 6.283); x2.fill(); } x2.fillStyle = '#c8a050'; x2.beginPath(); x2.arc(64, 64, 30, 0, 7); x2.fill(); })), roughness: 0.3, metalness: 0.3 }), -0.85, 0.97, 0, 37);
    cyl(t, 0.03, 0.03, 0.12, M({ color: 0xc8a050, metalness: 0.9 }), -0.85, 1.04, 0, 8);
  } else {
    const sh = new THREE.Shape(); sh.absarc(0, 0, 1.0, Math.PI, 0, true); sh.lineTo(1.0, 0.12); sh.lineTo(-1.0, 0.12); sh.closePath();
    const top = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.06, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.03 }), wd); top.rotation.x = Math.PI / 2; top.position.y = 0.86; t.add(top);
    const fl = new THREE.Mesh(new THREE.ShapeGeometry(sh), fm); fl.rotation.x = -Math.PI / 2; fl.position.y = 0.865; fl.scale.set(0.9, 0.9, 1); t.add(fl);
    box(t, 0.5, 0.06, 0.14, M({ color: 0x0a0a0a, roughness: 0.3 }), 0, 0.9, -0.05); rbox(t, 0.16, 0.12, 0.1, 0.02, M({ color: 0xb03030 }), 0.4, 0.92, 0);
  }
  cyl(t, 0.1, 0.14, 0.82, M({ color: 0x141012 }), 0, 0.41, 0.3, 12);
  if (STAGE !== 'final' && DEALER) person(t, 0, -0.35, 0, { sit: false, look: 'dealer', arms: 'table', lod: 1 });
  for (let i = 0; i < 5; i++) { const a = Math.PI * 0.15 + i / 4 * Math.PI * 0.7, px = Math.cos(a) * 1.25, pz = Math.sin(a) * 1.0 + 0.1; cyl(t, 0.17, 0.17, 0.06, cloth(0x7a1a1a, 0.6), px, 0.72, pz, 16); cyl(t, 0.025, 0.03, 0.7, M({ color: 0x2a2a2a, metalness: 0.7 }), px, 0.35, pz, 8); if (rnd() < occ() * 0.6) person(t, px, pz, Math.atan2(-px, -pz + 0.1), { hip: 0.75, arms: 'bar', lod: 1 }); }
  if (STAGE !== 'final') spot(t, 0xfff0d8, 4, 0, 2.8, 0.2, 0, 0, 0.8).target.position.set(x, 0, z);
}
// the cashier's cage: a counter, brass bars, a sign
function cage(g, x, z, ry, w, label) {
  const c = new THREE.Group(); c.position.set(x, 0, z); c.rotation.y = ry || 0; g.add(c);
  rbox(c, w, 1.1, 0.6, 0.03, M({ map: tex(PAINT.wood('#5a2e16', '#3a1a0c', 18), 2, 1), roughness: 0.4 }), 0, 0.55, 0); box(c, w + 0.05, 0.05, 0.66, M({ map: tex(PAINT.marble('#e8e0d0', '#8a7a6a')), roughness: 0.2 }), 0, 1.12, 0);
  for (let i = 0; i < w / 0.09; i++) cyl(c, 0.008, 0.008, 1.0, M({ color: 0xc8a050, metalness: 0.9, roughness: 0.25 }), -w / 2 + 0.05 + i * 0.09, 1.65, -0.1, 6);
  box(c, w, 0.06, 0.06, M({ color: 0xc8a050, metalness: 0.9 }), 0, 2.15, -0.1); box(c, w, 0.6, 0.1, M({ color: 0x1a1210 }), 0, 2.5, -0.1);
  sign(c, label || 'CASHIER', '#1a1210', '#e8c868', 0, 2.5, -0.04, Math.min(w * 0.6, 2.2), 0.4);
  for (let i = 0; i < Math.floor(w / 1.4); i++) stander(c, -w / 2 + 0.7 + i * 1.4, -0.6, 0, { look: 'smart', arms: 'table', lod: 1 });
  light(c, 0xfff0d8, 2, 0, 1.8, 0.5, 4);
}
// a brush podium: a desk, a lamp, a screen with the list
function podium(g, x, z, ry) {
  const p = new THREE.Group(); p.position.set(x, 0, z); p.rotation.y = ry || 0; g.add(p);
  rbox(p, 1.2, 1.1, 0.6, 0.04, M({ color: 0x1a1210, roughness: 0.3 }), 0, 0.55, 0); box(p, 1.25, 0.04, 0.65, M({ color: 0xc8a050, metalness: 0.8, roughness: 0.3 }), 0, 1.12, 0);
  tvSet(p, 0, 1.55, -0.1, 0.8, 0, 'board');
  if (STAGE !== 'final') stander(p, 0.2, -0.55, 0, { look: 'smart', arms: 'table', lod: 1 });
}
function bleachers(g, x, z, w, rows, ry, crowd) {
  const b = new THREE.Group(); b.position.set(x, 0, z); b.rotation.y = ry || 0; g.add(b);
  const mt = M({ color: 0x6a6e74, metalness: 0.6, roughness: 0.4 }), wd = M({ color: 0xb8945a, roughness: 0.6 });
  for (let r = 0; r < rows; r++) { box(b, w, 0.06, 0.32, wd, 0, 0.42 + r * 0.42, -r * 0.6); box(b, w, 0.42 + r * 0.42, 0.04, mt, 0, (0.42 + r * 0.42) / 2, -r * 0.6 + 0.18); for (let i = 0; i < w / 0.6; i++) if (rnd() < (crowd || 0)) person(b, -w / 2 + 0.3 + i * 0.6 + (rnd() - 0.5) * 0.2, -r * 0.6 - 0.05, 0, { hip: 0.42 + r * 0.42 + 0.06, arms: 'bar', lod: 1 }); }
}
function hangBanner(g, text, x, y, z, w, h, bg, fg, ry) {
  const b = sign(g, text, bg, fg, x, y, z, w, h, ry);
  for (const s of [-1, 1]) cyl(g, 0.004, 0.004, 3, M({ color: 0x111111 }), x + s * w * 0.4, y + h / 2 + 1.5, z, 4);
  return b;
}
function lockers(g, x, z, ry, n, col) {
  const l = new THREE.Group(); l.position.set(x, 0, z); l.rotation.y = ry || 0; g.add(l);
  for (let i = 0; i < n; i++) {
    const lx = (i - (n - 1) / 2) * 0.62; box(l, 0.6, 2.0, 0.5, M({ color: col || 0x8a1a1a, metalness: 0.4, roughness: 0.5 }), lx, 1.0, 0);
    // turnout gear on a hook: a coat with reflective stripes, a helmet on the shelf, boots below
    const coat = rbox(l, 0.42, 0.85, 0.2, 0.06, cloth(0xa8884a, 0.9), lx, 1.2, 0.2); box(l, 0.43, 0.05, 0.21, M({ color: 0xd8e840, emissive: 0x3a4010, emissiveIntensity: 0.4 }), lx, 0.95, 0.2); box(l, 0.43, 0.05, 0.21, M({ color: 0xd8e840, emissive: 0x3a4010, emissiveIntensity: 0.4 }), lx, 1.35, 0.2);
    const hm = sph(l, 0.15, M({ color: pick([0x1a1a1a, 0xd8c020, 0xb01a1a]), roughness: 0.3 }), lx, 1.85, 0.12, 14); hm.scale.y = 0.75; const brim = cyl(l, 0.2, 0.2, 0.02, hm.material, lx, 1.8, 0.14, 18); brim.scale.z = 1.3;
    for (const s of [-1, 1]) rbox(l, 0.12, 0.35, 0.22, 0.04, M({ color: 0x1a1a1a, roughness: 0.6 }), lx + s * 0.09, 0.18, 0.22);
  }
}
function fireTruck(g, x, z, ry) {
  const t = new THREE.Group(); t.position.set(x, 0, z); t.rotation.y = ry || 0; g.add(t);
  const red = new THREE.MeshPhysicalMaterial({ color: 0xb8141a, roughness: 0.25, metalness: 0.5, clearcoat: 1, envMapIntensity: 1.2 }), chrome = M({ color: 0xd0d4dc, metalness: 1, roughness: 0.15, envMapIntensity: 1.4 });
  rbox(t, 2.4, 1.6, 2.4, 0.15, red, 0, 1.25, 3.0); rbox(t, 2.2, 0.8, 1.6, 0.12, M({ color: 0x1a2028, roughness: 0.05, transparent: true, opacity: 0.8 }), 0, 1.7, 3.5);
  rbox(t, 2.4, 1.9, 5.6, 0.12, red, 0, 1.4, -1.0); for (let i = 0; i < 5; i++) box(t, 0.02, 1.2, 1.0, chrome, 1.21, 1.3, -3.2 + i * 1.1);
  box(t, 2.5, 0.12, 8.2, chrome, 0, 2.4, 0); for (const s of [-1, 1]) box(t, 0.08, 0.08, 7.8, chrome, s * 1.1, 2.62, -0.3);
  const lad = M({ color: 0xd0d4dc, metalness: 0.9, roughness: 0.3 }); for (const s of [-1, 1]) box(t, 0.06, 0.08, 6.5, lad, s * 0.5, 2.6, -0.8); for (let i = 0; i < 16; i++) box(t, 1.0, 0.03, 0.03, lad, 0, 2.6, -3.9 + i * 0.4);
  for (const [wx, wz] of [[-1.15, 2.6], [1.15, 2.6], [-1.15, -1.6], [1.15, -1.6], [-1.15, -3.0], [1.15, -3.0]]) { const w = cyl(t, 0.5, 0.5, 0.36, M({ color: 0x111111, roughness: 0.8 }), wx, 0.5, wz, 24); w.rotation.z = Math.PI / 2; const r = cyl(t, 0.28, 0.28, 0.38, chrome, wx, 0.5, wz, 16); r.rotation.z = Math.PI / 2; }
  box(t, 2.2, 0.12, 0.08, glow(0xff2020, 1.5), 0, 2.15, 4.2); box(t, 2.3, 0.4, 0.15, chrome, 0, 0.5, 4.25);
  for (const s of [-1, 1]) box(t, 0.3, 0.2, 0.05, glow(0xfff4e0, 0.8), s * 0.8, 0.95, 4.21);
}
function hoop(g, x, y, z, ry) {
  const h = new THREE.Group(); h.position.set(x, y, z); h.rotation.y = ry || 0; g.add(h);
  box(h, 1.8, 1.05, 0.04, M({ color: 0xf4f6f8, roughness: 0.2, transparent: true, opacity: 0.85 }), 0, 0, 0.6); box(h, 0.6, 0.45, 0.045, M({ color: 0xd84a1a }), 0, -0.15, 0.62);
  box(h, 0.08, 0.08, 0.6, M({ color: 0x3a3a3e, metalness: 0.7 }), 0, 0, 0.3);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.012, 8, 28), M({ color: 0xe0501a, metalness: 0.5 })); rim.rotation.x = Math.PI / 2; rim.position.set(0, -0.45, 0.88); h.add(rim);
  const net = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.15, 0.4, 12, 3, true), M({ color: 0xf4f4f4, wireframe: true })); net.position.set(0, -0.65, 0.88); h.add(net);
}
function trophyCase(g, x, z, ry, w) {
  const t = new THREE.Group(); t.position.set(x, 0, z); t.rotation.y = ry || 0; g.add(t);
  rbox(t, w, 2.0, 0.45, 0.02, M({ map: tex(PAINT.wood('#5a3418', '#3a2010', 14)), roughness: 0.4 }), 0, 1.0, 0);
  const gold = M({ color: 0xd8b040, metalness: 0.95, roughness: 0.2, envMapIntensity: 1.4 }), silver = M({ color: 0xc8ccd4, metalness: 0.95, roughness: 0.2, envMapIntensity: 1.4 });
  for (let r = 0; r < 3; r++) { box(t, w - 0.1, 0.02, 0.38, M({ color: 0xe8f0f4, transparent: true, opacity: 0.4 }), 0, 0.5 + r * 0.5, 0.02); for (let i = 0; i < w / 0.3; i++) { const m = rnd() < 0.6 ? gold : silver, tx = -w / 2 + 0.2 + i * 0.3; cyl(t, 0.05, 0.06, 0.04, M({ color: 0x1a1a1a }), tx, 0.53 + r * 0.5, 0.05, 10); const cup = cyl(t, 0.07, 0.03, 0.14, m, tx, 0.65 + r * 0.5, 0.05, 14); if (rnd() < 0.5) sph(t, 0.04, m, tx, 0.78 + r * 0.5, 0.05, 8); } }
  plane(t, w - 0.06, 1.9, M({ color: 0xc8d8e0, metalness: 0.9, roughness: 0.05, transparent: true, opacity: 0.18 }), 0, 1.0, 0.23);
  light(t, 0xfff0d8, 0.8, 0, 1.6, 0.4, 2);
}
// paper flags strung across (papel picado)
function papelPicado(g, x0, x1, y, z) { const n = Math.round((x1 - x0) / 0.38); for (let i = 0; i < n; i++) { const c = pick(['#ff3a6a', '#3ad8ff', '#ffd84d', '#3aff8a', '#ff8a3a', '#b04aff']); const f = plane(g, 0.32, 0.26, M({ map: tex(canvas(32, 26, (x2, w, h) => { x2.fillStyle = c; x2.fillRect(0, 0, w, h); x2.fillStyle = 'rgba(0,0,0,1)'; x2.globalCompositeOperation = 'destination-out'; for (let k = 0; k < 6; k++) { x2.beginPath(); x2.arc(4 + rnd() * 24, 4 + rnd() * 16, 2, 0, 7); x2.fill(); } x2.globalCompositeOperation = 'source-over'; })), transparent: true, side: THREE.DoubleSide, emissive: new THREE.Color(c), emissiveIntensity: 0.2 }), x0 + (i + 0.5) * (x1 - x0) / n, y - Math.sin((i + 0.5) / n * Math.PI) * 0.25, z); f.rotation.x = 0.1; } }
function wagonWheel(g, x, y, z, ry) { const w = new THREE.Group(); w.position.set(x, y, z); w.rotation.y = ry || 0; g.add(w); const wd = M({ color: 0x5a3a1a, roughness: 0.8 }); const rim = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.04, 8, 32), wd); w.add(rim); cyl(w, 0.08, 0.08, 0.1, wd, 0, 0, 0, 12).rotation.x = Math.PI / 2; for (let i = 0; i < 12; i++) { const s = box(w, 0.03, 0.88, 0.03, wd, 0, 0, 0); s.rotation.z = i / 12 * Math.PI; } }
function oilLamp(g, x, y, z) { cyl(g, 0.05, 0.07, 0.08, M({ color: 0xb08a40, metalness: 0.8 }), x, y, z, 12); const gl = cyl(g, 0.035, 0.05, 0.16, M({ color: 0xfff0d0, emissive: 0xffa040, emissiveIntensity: 1.2, transparent: true, opacity: 0.8 }), x, y + 0.12, z, 12); light(g, 0xffa050, 0.7, x, y + 0.15, z, 2.5); }
function aquarium(g, x, y, z, w, ry) {
  const a = new THREE.Group(); a.position.set(x, y, z); a.rotation.y = ry || 0; g.add(a);
  rbox(a, w + 0.08, 0.1, 0.48, 0.02, M({ color: 0x111111 }), 0, -0.36, 0); rbox(a, w + 0.08, 0.06, 0.48, 0.02, M({ color: 0x111111 }), 0, 0.33, 0);
  box(a, w, 0.66, 0.42, new THREE.MeshPhysicalMaterial({ color: 0x3a8ac8, transparent: true, opacity: 0.45, roughness: 0.05, emissive: 0x0a3a6a, emissiveIntensity: 0.6 }), 0, 0, 0);
  for (let i = 0; i < 6; i++) { const f = sph(a, 0.05, glow(pick([0xff8a20, 0xffd84d, 0xff3a3a]), 1.4), (rnd() - 0.5) * w * 0.8, (rnd() - 0.5) * 0.4, (rnd() - 0.5) * 0.2, 8); f.scale.set(1.6, 0.8, 0.5); }
  for (let i = 0; i < 5; i++) { const pl = cyl(a, 0.02, 0.01, 0.3 + rnd() * 0.2, M({ color: 0x2a8a3a }), (rnd() - 0.5) * w * 0.9, -0.2, (rnd() - 0.5) * 0.25, 6); }
  light(a, 0x6ab8ff, 1.0, 0, 0.2, 0.5, 2.5);
}
// a framed photo or print with a real picture-like composition (a portrait, a landscape, a team photo)
function photo(g, x, y, z, w, h, ry, kind, frameCol) {
  const c = canvas(128, Math.round(128 * h / w), (x2, cw, ch) => {
    if (kind === 'portrait') { const g2 = x2.createLinearGradient(0, 0, 0, ch); g2.addColorStop(0, '#3a2a1a'); g2.addColorStop(1, '#1a120a'); x2.fillStyle = g2; x2.fillRect(0, 0, cw, ch); x2.fillStyle = '#c89a70'; x2.beginPath(); x2.ellipse(cw / 2, ch * 0.38, cw * 0.17, ch * 0.16, 0, 0, 7); x2.fill(); x2.fillStyle = '#1a1a22'; x2.beginPath(); x2.ellipse(cw / 2, ch * 0.92, cw * 0.38, ch * 0.32, 0, 0, 7); x2.fill(); x2.fillStyle = '#e8e0d0'; x2.fillRect(cw * 0.46, ch * 0.62, cw * 0.08, ch * 0.12); }
    else if (kind === 'team') { x2.fillStyle = '#6a7a8a'; x2.fillRect(0, 0, cw, ch); for (let r = 0; r < 2; r++) for (let i = 0; i < 6; i++) { x2.fillStyle = '#d8b090'; x2.beginPath(); x2.arc(14 + i * 20 + r * 10, ch * (0.35 + r * 0.3), 5, 0, 7); x2.fill(); x2.fillStyle = r ? '#2a3a6a' : '#8a1a1a'; x2.fillRect(9 + i * 20 + r * 10, ch * (0.4 + r * 0.3), 10, 14); } }
    else { const g2 = x2.createLinearGradient(0, 0, 0, ch); g2.addColorStop(0, '#8ab8e8'); g2.addColorStop(0.55, '#e8d8b8'); g2.addColorStop(0.56, '#5a7a3a'); g2.addColorStop(1, '#3a5a2a'); x2.fillStyle = g2; x2.fillRect(0, 0, cw, ch); x2.fillStyle = '#6a7a8a'; x2.beginPath(); x2.moveTo(0, ch * 0.56); x2.lineTo(cw * 0.3, ch * 0.3); x2.lineTo(cw * 0.55, ch * 0.5); x2.lineTo(cw * 0.75, ch * 0.25); x2.lineTo(cw, ch * 0.56); x2.fill(); }
    noise(x2, cw, ch, 0.08, 1500);
  });
  const grp = new THREE.Group(); grp.position.set(x, y, z); if (ry) grp.rotation.y = ry; g.add(grp);
  rbox(grp, w + 0.08, h + 0.08, 0.03, 0.01, M({ color: frameCol || 0x2a1a10, roughness: 0.4 }), 0, 0, 0); plane(grp, w - 0.04, h - 0.04, M({ color: 0xf4f0e6 }), 0, 0, 0.017); plane(grp, w - 0.1, h - 0.1, M({ map: tex(c), roughness: 0.5 }), 0, 0, 0.019);
}
// a back yard at night: the neighbours' houses with lit windows, trees, a privacy fence, the lawn, fireflies
VIEW.yard = (o) => canvas(1024, 512, (x, w, h) => {
  const g2 = x.createLinearGradient(0, 0, 0, h * 0.6); g2.addColorStop(0, '#060a1c'); g2.addColorStop(1, '#1e2a4a'); x.fillStyle = g2; x.fillRect(0, 0, w, h);
  for (let i = 0; i < 160; i++) { x.fillStyle = 'rgba(255,255,255,' + rnd() * 0.7 + ')'; x.fillRect(rnd() * w, rnd() * h * 0.4, 1.5, 1.5); }
  if (o.moon) { x.fillStyle = '#fff6dc'; x.shadowColor = '#fff6dc'; x.shadowBlur = 30; x.beginPath(); x.arc(w * 0.78, h * 0.14, 20, 0, 7); x.fill(); x.shadowBlur = 0; }
  // trees
  for (let i = 0; i < 18; i++) { const tx = rnd() * w, ty = h * (0.3 + rnd() * 0.12), tr = 30 + rnd() * 50; x.fillStyle = '#060a08'; x.beginPath(); x.arc(tx, ty, tr, 0, 7); x.fill(); x.beginPath(); x.arc(tx + tr * 0.6, ty + tr * 0.3, tr * 0.8, 0, 7); x.fill(); }
  // the neighbours' houses
  for (let i = 0; i < 3; i++) { const hx = 80 + i * 330 + rnd() * 60, hy = h * 0.4, hw = 180; x.fillStyle = '#12141c'; x.fillRect(hx, hy, hw, h * 0.18); x.beginPath(); x.moveTo(hx - 10, hy); x.lineTo(hx + hw / 2, hy - 60); x.lineTo(hx + hw + 10, hy); x.fill(); for (let k = 0; k < 3; k++) if (rnd() < 0.7) { x.fillStyle = pick(['#ffd88a', '#ffe6b0', '#9ab8ff']); x.fillRect(hx + 20 + k * 55, hy + 20, 28, 24); } }
  x.fillStyle = '#081008'; x.fillRect(0, h * 0.56, w, h * 0.44);
  // the fence
  const fy = h * 0.5; x.fillStyle = '#3a2a1a'; for (let i = 0; i < w; i += 18) x.fillRect(i, fy, 16, h * 0.12); x.fillStyle = 'rgba(0,0,0,.4)'; x.fillRect(0, fy + h * 0.03, w, 4);
  const lg = x.createLinearGradient(0, h * 0.62, 0, h); lg.addColorStop(0, '#0a1a0a'); lg.addColorStop(1, '#122a12'); x.fillStyle = lg; x.fillRect(0, h * 0.62, w, h * 0.38);
  if (o.grill) { x.fillStyle = '#0a0a0a'; x.beginPath(); x.arc(w * 0.62, h * 0.72, 30, Math.PI, 0); x.fill(); x.fillRect(w * 0.62 - 3, h * 0.72, 6, 50); x.fillStyle = 'rgba(255,90,20,.6)'; x.fillRect(w * 0.62 - 20, h * 0.715, 40, 3); }
  for (let i = 0; i < 26; i++) { x.fillStyle = 'rgba(220,255,120,' + (0.4 + rnd() * 0.5) + ')'; x.shadowColor = '#d8ff80'; x.shadowBlur = 8; x.beginPath(); x.arc(rnd() * w, h * (0.5 + rnd() * 0.45), 1.6, 0, 7); x.fill(); } x.shadowBlur = 0;
});
SHOW.golf = (x, w, h) => { const g2 = x.createLinearGradient(0, 0, 0, h); g2.addColorStop(0, '#8ab8e8'); g2.addColorStop(0.35, '#d8e8f0'); g2.addColorStop(0.36, '#2a5a2a'); g2.addColorStop(1, '#4a9a3a'); x.fillStyle = g2; x.fillRect(0, 0, w, h); x.fillStyle = '#5aba4a'; x.beginPath(); x.ellipse(w * 0.6, h * 0.6, w * 0.25, h * 0.12, 0, 0, 7); x.fill(); x.fillStyle = '#fff'; x.fillRect(w * 0.62, h * 0.42, 2, h * 0.16); x.fillStyle = '#e02020'; x.fillRect(w * 0.622, h * 0.42, 14, 8); x.fillStyle = 'rgba(10,30,10,.85)'; x.fillRect(w * 0.05, h * 0.82, w * 0.5, h * 0.11); x.fillStyle = '#fff'; x.font = '700 ' + (h * 0.06 | 0) + 'px sans-serif'; x.fillText('LEADER  -12   HOLE 16', w * 0.07, h * 0.9); };
SHOW.karaoke = (x, w, h) => { const g2 = x.createLinearGradient(0, 0, w, h); g2.addColorStop(0, '#1a0a4a'); g2.addColorStop(1, '#4a0a5a'); x.fillStyle = g2; x.fillRect(0, 0, w, h); x.textAlign = 'center'; x.font = '700 ' + (h * 0.11 | 0) + 'px sans-serif'; x.fillStyle = '#4ad8ff'; x.fillText("DON'T STOP BELIEVIN'", w / 2, h * 0.42); x.fillStyle = '#ffffff'; x.fillText('just a small town girl', w / 2, h * 0.62); x.textAlign = 'left'; };
// a motorcycle on display
function motorcycle(g, x, z, ry) {
  const m = new THREE.Group(); m.position.set(x, 0, z); m.rotation.y = ry || 0; g.add(m);
  const chrome = M({ color: 0xd0d4dc, metalness: 1, roughness: 0.15, envMapIntensity: 1.4 }), black = M({ color: 0x0a0a0c, roughness: 0.35, metalness: 0.4 }), paint = new THREE.MeshPhysicalMaterial({ color: 0x1a1a1e, roughness: 0.2, metalness: 0.6, clearcoat: 1 });
  for (const wz of [-0.75, 0.78]) { const t = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.09, 12, 32), M({ color: 0x111111, roughness: 0.8 })); t.position.set(0, 0.36, wz); t.rotation.y = Math.PI / 2; m.add(t); const r = cyl(m, 0.2, 0.2, 0.08, chrome, 0, 0.36, wz, 20); r.rotation.z = Math.PI / 2; }
  const tank = sph(m, 0.22, paint, 0, 0.82, 0.25, 16); tank.scale.set(0.7, 0.55, 1.2);
  rbox(m, 0.3, 0.1, 0.6, 0.05, M({ color: 0x2a1a10, roughness: 0.5 }), 0, 0.78, -0.25);
  rbox(m, 0.3, 0.32, 0.4, 0.06, chrome, 0, 0.5, 0.05); for (const s of [-1, 1]) seg(m, [s * 0.18, 0.4, -0.1], [s * 0.18, 0.45, -0.85], 0.04, 0.04, chrome);
  seg(m, [0, 0.36, 0.78], [0, 0.95, 0.55], 0.03, 0.03, chrome); seg(m, [-0.38, 1.0, 0.5], [0.38, 1.0, 0.5], 0.015, 0.015, chrome);
  sph(m, 0.09, M({ color: 0xfff4e0, emissive: 0xfff0d0, emissiveIntensity: 0.4 }), 0, 0.9, 0.68, 12);
}
// a wall of old license plates
function plateWall(g, x, y, z, w, h, ry) {
  const c = canvas(512, Math.round(512 * h / w), (x2, cw, ch) => { x2.fillStyle = '#2a2420'; x2.fillRect(0, 0, cw, ch); for (let j = 0; j < ch; j += 30) for (let i = 0; i < cw; i += 58) { const bg = pick(['#f4f0e0', '#e8d040', '#2a4a8a', '#f4f4f4', '#8a1a1a', '#e8e0c8']); x2.fillStyle = bg; x2.fillRect(i + 2, j + 2, 54, 26); x2.fillStyle = bg === '#2a4a8a' || bg === '#8a1a1a' ? '#fff' : pick(['#1a2a6a', '#8a1a1a', '#1a1a1a']); x2.font = '700 13px monospace'; x2.fillText(String.fromCharCode(65 + rnd() * 26 | 0, 65 + rnd() * 26 | 0) + ' ' + (100 + rnd() * 900 | 0), i + 6, j + 20); } });
  return plane(g, w, h, M({ map: tex(c), roughness: 0.4, metalness: 0.4 }), x, y, z, ry);
}
function discoBall(g, x, y, z) {
  const b = sph(g, 0.22, M({ map: tex(canvas(128, 64, (x2, w, h) => { for (let i = 0; i < w; i += 6) for (let j = 0; j < h; j += 6) { x2.fillStyle = 'rgb(' + (150 + rnd() * 105 | 0) + ',' + (150 + rnd() * 105 | 0) + ',' + (170 + rnd() * 85 | 0) + ')'; x2.fillRect(i, j, 5, 5); } })), metalness: 1, roughness: 0.15, envMapIntensity: 2 }), x, y, z, 24);
  cyl(g, 0.006, 0.006, 0.6, M({ color: 0x111111 }), x, y + 0.5, z, 4);
  for (const c of [0xff3ad8, 0x3ad8ff, 0xffd84d]) { const s = spot(g, c, 6, x + (rnd() - 0.5) * 2, y + 0.2, z + 1, x + (rnd() - 0.5) * 3, z + (rnd() - 0.5) * 2, 0.35); }
}
// a golf course at night: the fairway, a pond with the moon in it, the flag, tree lines
VIEW.course = (o) => canvas(1024, 512, (x, w, h) => {
  const g2 = x.createLinearGradient(0, 0, 0, h * 0.5); g2.addColorStop(0, '#060c20'); g2.addColorStop(1, '#22305a'); x.fillStyle = g2; x.fillRect(0, 0, w, h);
  for (let i = 0; i < 150; i++) { x.fillStyle = 'rgba(255,255,255,' + rnd() * 0.7 + ')'; x.fillRect(rnd() * w, rnd() * h * 0.4, 1.5, 1.5); }
  x.fillStyle = '#fff6dc'; x.shadowColor = '#fff6dc'; x.shadowBlur = 30; x.beginPath(); x.arc(w * 0.25, h * 0.15, 18, 0, 7); x.fill(); x.shadowBlur = 0;
  for (let i = 0; i < 26; i++) { const tx = rnd() * w, tr = 26 + rnd() * 40; x.fillStyle = '#05080a'; x.beginPath(); x.arc(tx, h * 0.47, tr, Math.PI, 0); x.fill(); x.beginPath(); x.moveTo(tx - tr * 0.5, h * 0.47); x.lineTo(tx, h * 0.47 - tr * 2); x.lineTo(tx + tr * 0.5, h * 0.47); x.fill(); }
  const fg = x.createLinearGradient(0, h * 0.47, 0, h); fg.addColorStop(0, '#0e2214'); fg.addColorStop(1, '#1a3a1e'); x.fillStyle = fg; x.fillRect(0, h * 0.47, w, h * 0.53);
  x.fillStyle = '#1e4a24'; x.beginPath(); x.ellipse(w * 0.6, h * 0.62, w * 0.3, h * 0.08, 0, 0, 7); x.fill();
  x.fillStyle = '#0a1426'; x.beginPath(); x.ellipse(w * 0.25, h * 0.8, w * 0.2, h * 0.07, 0, 0, 7); x.fill(); x.fillStyle = 'rgba(255,246,220,.5)'; x.beginPath(); x.ellipse(w * 0.25, h * 0.8, 14, 5, 0, 0, 7); x.fill();
  x.fillStyle = '#e8e8e8'; x.fillRect(w * 0.66, h * 0.5, 2, h * 0.11); x.fillStyle = '#c81a1a'; x.fillRect(w * 0.662, h * 0.5, 16, 10);
});
// ── Skylines true to their cities ─────────────────────────────────────────────────────────────────────────
// each paints a 1024x512 (or wider) view: the sky, the landmarks you'd know the place by, the water with its lights
const SKY = {
  grad: (x, w, h, stops) => { const g2 = x.createLinearGradient(0, 0, 0, h); stops.forEach(([p, c]) => g2.addColorStop(p, c)); x.fillStyle = g2; x.fillRect(0, 0, w, h); },
  stars: (x, w, h, n, top) => { for (let i = 0; i < n; i++) { x.fillStyle = 'rgba(255,255,255,' + rnd() * 0.7 + ')'; x.fillRect(rnd() * w, rnd() * h * (top || 0.4), 1.5, 1.5); } },
  moon: (x, cx, cy, r) => { x.fillStyle = '#fff6dc'; x.shadowColor = '#fff6dc'; x.shadowBlur = r * 1.6; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill(); x.shadowBlur = 0; },
  // a block of lit windows on a dark facade
  bldg: (x, bx, by, bw, bh, col, cols, pitch, p) => { x.fillStyle = col || '#0c0f22'; x.fillRect(bx, by, bw, bh); const px = pitch || 8; for (let yy = by + 5; yy < by + bh - 4; yy += px + 1) for (let xx = bx + 3; xx < bx + bw - 3; xx += px) if (rnd() < (p || 0.45)) { x.fillStyle = pick(cols || ['#ffd98a', '#ffe9b8', '#fff3d6']); x.fillRect(xx, yy, px * 0.5, px * 0.6); } },
  // water from y0 down, with the lights above streaking into it
  water: (x, w, h, y0, top, bottom, streak, n) => { const wg = x.createLinearGradient(0, y0, 0, h); wg.addColorStop(0, top || '#101a36'); wg.addColorStop(1, bottom || '#03050c'); x.fillStyle = wg; x.fillRect(0, y0, w, h - y0); for (let i = 0; i < (n || 400); i++) { x.fillStyle = 'rgba(' + (streak || '255,214,140') + ',' + rnd() * 0.45 + ')'; x.fillRect(rnd() * w, y0 + rnd() * (h - y0), 6 + rnd() * 22, 1.5); } },
  glow: (x, col, b, f) => { x.shadowColor = col; x.shadowBlur = b; f(); x.shadowBlur = 0; },
  // trees in silhouette along a line
  trees: (x, w, y, n, col, s) => { for (let i = 0; i < n; i++) { const tx = rnd() * w, r = (s || 1) * (14 + rnd() * 22); x.fillStyle = col || '#05070a'; x.beginPath(); x.arc(tx, y - r * 0.6, r, 0, 7); x.fill(); x.fillRect(tx - 3, y - r, 6, r); } },
  // a palm in silhouette
  palm: (x, px, py, s, col) => { x.strokeStyle = col || '#05060c'; x.lineWidth = 5 * s; x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + 16 * s, py - 60 * s, px + 8 * s, py - 120 * s); x.stroke(); x.fillStyle = col || '#05060c'; for (let k = 0; k < 9; k++) { x.save(); x.translate(px + 8 * s, py - 120 * s); x.rotate(k * 0.7 - 0.2); x.beginPath(); x.ellipse(28 * s, 4 * s, 32 * s, 5 * s, 0.12, 0, 7); x.fill(); x.restore(); } }
};
// the Eiffel Tower, lit gold from inside the way it is after dark: the curve of the legs, the two platforms, the arch
LANDMARK.eiffel = (x, w, h, base, o) => {
  o = o || {}; const cx = o.cx || w * 0.5, H = o.H || h * 0.82, top = base - H;
  const half = (t) => H * (0.19 * Math.pow(1 - t, 2.2) + 0.012) * (t > 0.94 ? 0.5 : 1);   // half-width at height fraction t
  const pts = []; for (let t = 0; t <= 1.0001; t += 0.04) pts.push([half(t), base - t * H]);
  const path = () => { x.beginPath(); x.moveTo(cx - pts[0][0], pts[0][1]); pts.forEach(p => x.lineTo(cx - p[0], p[1])); pts.slice().reverse().forEach(p => x.lineTo(cx + p[0], p[1])); x.closePath(); };
  SKY.glow(x, '#ffb040', 12, () => { x.fillStyle = '#e0a640'; path(); x.fill(); });
  // the lattice: a hint of the dark sky through the ironwork (kept faint, so from across the river it reads as one
  // solid gold shape, not a sparkle of dots)
  x.save(); path(); x.clip();
  x.strokeStyle = 'rgba(20,14,30,.22)'; x.lineWidth = 1;
  for (let t = 0.02; t < 1; t += 0.035) { const y = base - t * H, hw = half(t); const n = Math.max(2, Math.round(hw / 7)); for (let k = 0; k <= n; k++) { const xx = cx - hw + k * 2 * hw / n; x.beginPath(); x.moveTo(xx, y); x.lineTo(xx + 5, y - H * 0.035); x.moveTo(xx, y); x.lineTo(xx - 5, y - H * 0.035); x.stroke(); } }
  // the arch under the first floor, the two platforms, the pillars' feet apart
  x.fillStyle = 'rgba(20,14,30,.85)'; x.beginPath(); x.ellipse(cx, base - H * 0.02, H * 0.12, H * 0.14, 0, Math.PI, 0); x.fill();
  x.fillStyle = 'rgba(20,14,30,.5)'; x.fillRect(cx - H * 0.19, base - H * 0.1, H * 0.1, H * 0.1); x.fillRect(cx + H * 0.09, base - H * 0.1, H * 0.1, H * 0.1);
  x.fillStyle = '#ffd890'; x.fillRect(cx - half(0.17) - 4, base - H * 0.17, half(0.17) * 2 + 8, 5); x.fillRect(cx - half(0.35) - 3, base - H * 0.35, half(0.35) * 2 + 6, 4); x.fillRect(cx - half(0.85) - 4, base - H * 0.85, half(0.85) * 2 + 8, 4);
  x.restore();
  x.fillStyle = '#ffe0a0'; x.fillRect(cx - 1.5, top - H * 0.07, 3, H * 0.07);   // the antenna
  SKY.glow(x, '#ffffff', 14, () => { x.fillStyle = '#ffffff'; x.beginPath(); x.arc(cx, top - H * 0.06, 3, 0, 7); x.fill(); });   // the beacon
};
// Haussmann's Paris: six storeys of cream stone, zinc mansards, chimney pots, the tower gold over the river
VIEW.paris = (o) => canvas(1024, 512, (x, w, h) => {
  SKY.grad(x, w, h, [[0, '#070a22'], [0.45, '#1c1a48'], [0.68, '#4a2a4e'], [0.78, '#8a4a3a']]); SKY.stars(x, w, h, 140, 0.45);
  // far rooftops in violet haze, Sacré-Cœur's white domes on the hill to the right
  x.fillStyle = '#2a2240'; for (let i = 0; i < 60; i++) x.fillRect(i * 18, h * (0.62 + rnd() * 0.05), 20, h * 0.1);
  x.fillStyle = '#e8e0d8'; SKY.glow(x, '#fff0d8', 18, () => { x.beginPath(); x.ellipse(w * 0.86, h * 0.6, 22, 30, 0, 0, 7); x.fill(); x.beginPath(); x.ellipse(w * 0.83, h * 0.63, 9, 14, 0, 0, 7); x.fill(); x.beginPath(); x.ellipse(w * 0.89, h * 0.63, 9, 14, 0, 0, 7); x.fill(); });
  LANDMARK.eiffel(x, w, h, h * 0.7, { cx: w * 0.5, H: h * 0.74 });
  // the Haussmann blocks along the quai, their mansards and dormers
  for (let i = 0; i < 9; i++) {
    const bx = i * w / 9 + rnd() * 8, bw = w / 9 - 10 - rnd() * 20, by = h * 0.66 - 44 - rnd() * 40, bh = h * 0.3;
    x.fillStyle = pick(['#9a8a6a', '#a89878', '#8e7e60']); x.fillRect(bx, by + 14, bw, bh);
    x.fillStyle = '#2e3440'; x.fillRect(bx - 2, by, bw + 4, 16); x.beginPath(); x.moveTo(bx - 2, by); x.lineTo(bx + 6, by - 10); x.lineTo(bx + bw - 6, by - 10); x.lineTo(bx + bw + 2, by); x.fill();
    for (let k = 0; k < 4; k++) { x.fillStyle = '#1c2028'; x.fillRect(bx + 8 + k * 24, by - 20, 4, 12); }
    for (let r = 0; r < 6; r++) for (let c = 0; c < Math.floor(bw / 14); c++) { x.fillStyle = rnd() < 0.4 ? pick(['#e8b860', '#d8a050', '#ffd090']) : '#241e1a'; x.fillRect(bx + 5 + c * 14, by + 20 + r * 18, 6, 10); } x.fillStyle = 'rgba(0,0,0,.3)'; x.fillRect(bx, by + 50, bw, 3); x.fillStyle = 'rgba(255,255,255,.12)'; x.fillRect(bx, by + 48, bw, 2);
  }
  // the Seine: the quai wall, a lit bateau-mouche, the tower's gold in the water
  x.fillStyle = '#4a4238'; x.fillRect(0, h * 0.7, w, 8); for (let i = 0; i < 34; i++) { x.fillStyle = '#ffe6b0'; SKY.glow(x, '#ffe6b0', 8, () => { x.beginPath(); x.arc(i * 30 + 10, h * 0.69, 2.2, 0, 7); x.fill(); }); }
  SKY.water(x, w, h, h * 0.715, '#141a30', '#04060c', '255,200,110', 500);
  x.fillStyle = 'rgba(216,154,58,.35)'; for (let i = 0; i < 40; i++) x.fillRect(w * 0.5 - 60 + rnd() * 120, h * 0.72 + rnd() * h * 0.26, 20 + rnd() * 50, 2);
  x.fillStyle = '#1a1a22'; x.fillRect(w * 0.18, h * 0.8, 150, 12); x.fillStyle = '#ffe0a0'; for (let k = 0; k < 10; k++) x.fillRect(w * 0.18 + 8 + k * 14, h * 0.803, 8, 6);
});
// Monte Carlo: Port Hercule packed with yachts, the Rock with the Prince's Palace, the hill of apartments, the Casino's green copper towers
VIEW.monaco = (o) => canvas(2048, 512, (x, w, h) => {
  SKY.grad(x, w, h, [[0, '#0a1034'], [0.4, '#2a2a64'], [0.56, '#7a4a6a'], [0.62, '#ff9a5a']]); SKY.stars(x, w, h, 200, 0.4);
  // the hills behind, built up to the ridge with lit apartment blocks
  x.fillStyle = '#1a1830'; x.beginPath(); x.moveTo(0, h * 0.62); for (let px = 0; px <= w; px += 60) x.lineTo(px, h * 0.44 + Math.sin(px / 300) * 30 + Math.cos(px / 130) * 14); x.lineTo(w, h * 0.62); x.fill();
  for (let i = 0; i < 90; i++) { const bx = rnd() * w, by = h * (0.44 + rnd() * 0.14) + Math.sin(bx / 300) * 30; SKY.bldg(x, bx, by, 18 + rnd() * 40, 20 + rnd() * 50, '#14122a', ['#ffe0a8', '#fff0cc', '#ffc880'], 7, 0.5); }
  // the Casino de Monte-Carlo: cream facade, two green copper lantern towers, lit gold
  // (big enough to read from inside the salon: the facade, its arched windows, the two lantern towers, and the Hôtel de
  // Paris's dome beside it)
  const cxx = w * 0.62, cy = h * 0.6; x.fillStyle = '#f0e2c0'; SKY.glow(x, '#ffe8b0', 24, () => { x.fillRect(cxx - 150, cy - 56, 300, 72); });
  x.fillStyle = '#5a8a6a'; for (const s of [-1, 1]) { x.fillRect(cxx + s * 100 - 20, cy - 106, 40, 52); x.beginPath(); x.moveTo(cxx + s * 100 - 24, cy - 106); x.lineTo(cxx + s * 100, cy - 146); x.lineTo(cxx + s * 100 + 24, cy - 106); x.fill(); }
  x.fillStyle = '#4a7a5a'; x.beginPath(); x.moveTo(cxx - 40, cy - 56); x.lineTo(cxx, cy - 86); x.lineTo(cxx + 40, cy - 56); x.fill();
  x.fillStyle = '#ffd890'; for (let k = 0; k < 9; k++) { x.beginPath(); x.moveTo(cxx - 136 + k * 32, cy + 10); x.lineTo(cxx - 136 + k * 32, cy - 26); x.arc(cxx - 128 + k * 32, cy - 26, 8, Math.PI, 0); x.lineTo(cxx - 120 + k * 32, cy + 10); x.fill(); }
  x.fillStyle = '#e8d8b8'; SKY.glow(x, '#ffe8b0', 16, () => { x.fillRect(cxx + 170, cy - 40, 120, 56); }); x.fillStyle = '#5a7a7a'; x.beginPath(); x.ellipse(cxx + 230, cy - 44, 36, 26, 0, Math.PI, 0); x.fill(); x.fillStyle = '#ffd890'; for (let k = 0; k < 5; k++) x.fillRect(cxx + 180 + k * 22, cy - 28, 8, 30);
  // the Rock: the old town on its headland to the left, the Palace floodlit on top
  x.fillStyle = '#2a2436'; x.beginPath(); x.moveTo(0, h * 0.72); x.lineTo(0, h * 0.5); x.lineTo(w * 0.1, h * 0.46); x.lineTo(w * 0.24, h * 0.47); x.lineTo(w * 0.3, h * 0.56); x.lineTo(w * 0.33, h * 0.72); x.fill();
  x.fillStyle = '#e8dcc8'; SKY.glow(x, '#ffe8c0', 16, () => { x.fillRect(w * 0.08, h * 0.42, 120, 24); x.fillRect(w * 0.1, h * 0.38, 16, 10); x.fillRect(w * 0.18, h * 0.38, 16, 10); });
  for (let i = 0; i < 60; i++) { x.fillStyle = pick(['#ffd98a', '#ffe9b8']); x.fillRect(w * 0.02 + rnd() * w * 0.26, h * (0.48 + rnd() * 0.2), 3, 3); }
  for (let i = 0; i < w / 44; i++) SKY.bldg(x, i * 44 + rnd() * 6, h * 0.58 + rnd() * 10, 40, h * 0.14, '#1a1626', ['#ffe0a8', '#fff0cc'], 7, 0.55);
  // the harbour: a quay wall, then yachts rafted along the pontoons, white hulls and lit decks, the big ones moored out
  x.fillStyle = '#3a3630'; x.fillRect(0, h * 0.72, w, 6); for (let i = 0; i < 70; i++) { x.fillStyle = '#ffe6b0'; x.fillRect(i * 30 + 6, h * 0.71, 3, 3); }
  SKY.water(x, w, h, h * 0.73, '#0e1a30', '#03060c', '255,220,170', 900);
  for (let i = 0; i < 48; i++) { const yx = rnd() * w, yy = h * (0.735 + rnd() * 0.09), yl = 50 + rnd() * 110; x.fillStyle = '#eef2f8'; x.fillRect(yx, yy, yl, 7 + yl * 0.08); x.fillRect(yx + yl * 0.25, yy - yl * 0.12, yl * 0.45, yl * 0.12); x.fillStyle = '#ffd98a'; for (let k = 0; k < yl / 10; k++) x.fillRect(yx + 4 + k * 10, yy + 2, 4, 3); x.fillStyle = 'rgba(255,230,180,.25)'; x.fillRect(yx, yy + 10, yl, 18); }
});
// Macau from the Praia Grande: the Grand Lisboa's golden lotus bud, the round Lisboa, the Macau Tower, neon on the water
VIEW.macau = (o) => canvas(1024, 512, (x, w, h) => {
  SKY.grad(x, w, h, [[0, '#06081a'], [0.5, '#1a1440'], [0.68, '#4a1a3a']]); SKY.stars(x, w, h, 100, 0.45);
  for (let i = 0; i < 30; i++) SKY.bldg(x, rnd() * w, h * (0.44 + rnd() * 0.16), 22 + rnd() * 40, 60 + rnd() * 90, '#0e0c22', ['#ffd98a', '#9ad4ff', '#ff8ad8'], 7, 0.4);
  // the Macau Tower: a needle with its disc and antenna, far left
  x.fillStyle = '#c8d0e0'; x.beginPath(); x.moveTo(w * 0.12 - 7, h * 0.7); x.lineTo(w * 0.12, h * 0.18); x.lineTo(w * 0.12 + 7, h * 0.7); x.fill(); SKY.glow(x, '#ffe8c0', 14, () => { x.fillStyle = '#ffe8c0'; x.beginPath(); x.ellipse(w * 0.12, h * 0.3, 26, 9, 0, 0, 7); x.fill(); }); x.fillRect(w * 0.12 - 1.5, h * 0.1, 3, h * 0.1);
  // the Grand Lisboa: a lotus bud of gold rising from a podium, its facade scrolling LEDs; Casino Lisboa's round drum beside it
  const gx = w * 0.56, gb = h * 0.7;
  SKY.glow(x, '#ffb030', 40, () => { x.fillStyle = '#ffcc5a'; x.beginPath(); x.moveTo(gx, gb - h * 0.6); x.bezierCurveTo(gx - 20, gb - h * 0.5, gx - 90, gb - h * 0.4, gx - 60, gb - h * 0.22); x.lineTo(gx - 40, gb - h * 0.14); x.lineTo(gx + 40, gb - h * 0.14); x.lineTo(gx + 60, gb - h * 0.22); x.bezierCurveTo(gx + 90, gb - h * 0.4, gx + 20, gb - h * 0.5, gx, gb - h * 0.6); x.fill(); });
  x.fillStyle = 'rgba(120,40,10,.45)'; for (let k = 0; k < 14; k++) { x.beginPath(); x.moveTo(gx, gb - h * 0.6); x.lineTo(gx - 60 + k * 9, gb - h * 0.14); x.lineTo(gx - 56 + k * 9, gb - h * 0.14); x.fill(); }
  x.fillStyle = '#e8b040'; x.fillRect(gx - 48, gb - h * 0.14, 96, h * 0.14); x.fillStyle = '#ff5ad8'; for (let k = 0; k < 6; k++) x.fillRect(gx - 44 + k * 16, gb - h * 0.1, 8, 3);
  x.fillStyle = '#8a1a4a'; SKY.glow(x, '#ff5ad8', 16, () => { x.fillRect(gx + 70, gb - h * 0.22, 60, h * 0.22); x.fillStyle = '#ffd84d'; for (let r = 0; r < 5; r++) x.fillRect(gx + 70, gb - h * 0.2 + r * 18, 60, 3); });
  // the Wynn's curved wall of lit glass, the bridge lights across the bay
  x.fillStyle = '#2a1a1a'; x.beginPath(); x.moveTo(w * 0.72, gb); x.quadraticCurveTo(w * 0.8, gb - h * 0.42, w * 0.92, gb); x.fill(); x.fillStyle = '#ffd890'; for (let r = 0; r < 12; r++) for (let c = 0; c < 10; c++) if (rnd() < 0.7) x.fillRect(w * 0.74 + c * 18 + (r % 2) * 4, gb - h * 0.3 + r * 11, 6, 5);
  x.fillStyle = '#9ad4ff'; for (let i = 0; i < 40; i++) x.fillRect(w * 0.0 + i * 26, gb - 6, 3, 3);
  SKY.water(x, w, h, gb, '#0a0a1e', '#02020a', '255,180,80', 500); x.fillStyle = 'rgba(255,200,60,.4)'; for (let i = 0; i < 50; i++) x.fillRect(gx - 70 + rnd() * 140, gb + rnd() * (h - gb), 20 + rnd() * 50, 2); x.fillStyle = 'rgba(255,90,216,.3)'; for (let i = 0; i < 30; i++) x.fillRect(gx + 60 + rnd() * 80, gb + rnd() * (h - gb), 10 + rnd() * 40, 2);
});
// Las Vegas from the top of the Strip: the Sphere lit, the Stratosphere, Luxor's beam, a Bellagio fountain show, the valley's lights to the mountains
VIEW.vegas = (o) => canvas(2048, 512, (x, w, h) => {
  SKY.grad(x, w, h, [[0, '#04040e'], [0.3, '#101030'], [0.36, '#2a1a3a']]); SKY.stars(x, w, h, 120, 0.3);
  x.fillStyle = '#0c0a18'; x.beginPath(); x.moveTo(0, h * 0.4); for (let px = 0; px <= w; px += 50) x.lineTo(px, h * 0.36 + Math.sin(px / 170) * 12 + Math.sin(px / 61) * 5); x.lineTo(w, h * 0.4); x.fill();
  // the valley below: a grid of streetlights thinning to the horizon
  for (let r = 0; r < 26; r++) { const y = h * 0.38 + r * r * 0.9, n = 60 + r * 6; for (let i = 0; i < n; i++) { x.fillStyle = 'rgba(255,' + (190 + rnd() * 50 | 0) + ',120,' + (0.3 + rnd() * 0.5) + ')'; x.fillRect(rnd() * w, y + rnd() * 4, 1.5 + r * 0.1, 1.5 + r * 0.1); } }
  // the Strip's towers, lit, closer and bigger toward the bottom
  for (let i = 0; i < 22; i++) { const bx = rnd() * w, by = h * (0.4 + rnd() * 0.25), bw = 30 + rnd() * 70, bh = 50 + rnd() * 120; SKY.bldg(x, bx, by, bw, bh, '#0a0a16', ['#ffd98a', '#fff3d6', '#9ad4ff', '#ff8ad8'], 8, 0.5); x.fillStyle = pick(['#ffd84d', '#ff5ab0', '#5ad8ff', '#ff8a3a']); SKY.glow(x, x.fillStyle, 18, () => x.fillRect(bx + 4, by, bw - 8, 7)); }
  // the Stratosphere's needle, far right; Luxor's pyramid and its beam, far left; the Sphere, big and lit, centre-right
  x.fillStyle = '#c8d0e0'; x.beginPath(); x.moveTo(w * 0.85 - 8, h * 0.62); x.lineTo(w * 0.85, h * 0.06); x.lineTo(w * 0.85 + 8, h * 0.62); x.fill(); SKY.glow(x, '#ffe8c0', 14, () => { x.fillStyle = '#fff0d0'; x.beginPath(); x.ellipse(w * 0.85, h * 0.2, 30, 12, 0, 0, 7); x.fill(); });
  x.fillStyle = '#0a0a12'; x.beginPath(); x.moveTo(w * 0.1 - 90, h * 0.74); x.lineTo(w * 0.1, h * 0.5); x.lineTo(w * 0.1 + 90, h * 0.74); x.fill(); x.fillStyle = 'rgba(255,255,255,.75)'; x.fillRect(w * 0.1 - 3, 0, 6, h * 0.5); x.fillStyle = 'rgba(255,255,255,.2)'; x.fillRect(w * 0.1 - 10, 0, 20, h * 0.5);
  SKY.glow(x, '#ff9a3a', 60, () => { const sg = x.createRadialGradient(w * 0.66 - 20, h * 0.5 - 20, 10, w * 0.66, h * 0.5, 80); sg.addColorStop(0, '#ffe0a0'); sg.addColorStop(0.5, '#ff7a30'); sg.addColorStop(1, '#8a1a60'); x.fillStyle = sg; x.beginPath(); x.arc(w * 0.66, h * 0.5, 78, 0, 7); x.fill(); });
  x.fillStyle = 'rgba(0,0,0,.35)'; for (let k = 0; k < 10; k++) x.fillRect(w * 0.66 - 78, h * 0.5 - 78 + k * 16, 156, 2);
  // a half-size Eiffel Tower and the Bellagio's fountains arcing white in their lake
  LANDMARK.eiffel(x, w, h, h * 0.76, { cx: w * 0.38, H: h * 0.3 });
  x.fillStyle = '#0a1420'; x.fillRect(w * 0.46, h * 0.78, 300, 40); for (let k = 0; k < 14; k++) { x.strokeStyle = 'rgba(240,250,255,.85)'; x.lineWidth = 3; SKY.glow(x, '#fff', 10, () => { x.beginPath(); x.moveTo(w * 0.46 + 20 + k * 20, h * 0.78 + 30); x.quadraticCurveTo(w * 0.46 + 20 + k * 20 + 10, h * 0.78 - 60 - (k % 3) * 25, w * 0.46 + 20 + k * 20 + 20, h * 0.78 + 30); x.stroke(); }); }
  // the street itself below, taillights and palms along the median
  x.fillStyle = '#141018'; x.fillRect(0, h * 0.82, w, h * 0.18); for (let i = 0; i < 200; i++) { x.fillStyle = rnd() < 0.5 ? '#ff2a2a' : '#fff0c0'; x.fillRect(rnd() * w, h * 0.84 + rnd() * h * 0.14, 3, 2); }
});
// the French Quarter from a courtyard: the cathedral's three spires white over the roofs, slate and chimneys, a moon in the haze
VIEW.quarter = (o) => canvas(1024, 512, (x, w, h) => {
  SKY.grad(x, w, h, [[0, '#0a0e2a'], [0.6, '#2a2050'], [1, '#5a3a50']]); SKY.stars(x, w, h, 80, 0.5); SKY.moon(x, w * 0.76, h * 0.2, 18);
  // St. Louis Cathedral: the tall central spire, the two flanking, the clock, floodlit white
  const cx = w * 0.42, by = h * 0.86; x.fillStyle = '#e8e4dc'; SKY.glow(x, '#fff0d8', 24, () => {
    x.fillRect(cx - 110, by - 90, 220, 90); for (const s of [-1, 1]) { x.fillRect(cx + s * 80 - 18, by - 170, 36, 80); x.beginPath(); x.moveTo(cx + s * 80 - 22, by - 170); x.lineTo(cx + s * 80, by - 250); x.lineTo(cx + s * 80 + 22, by - 170); x.fill(); }
    x.fillRect(cx - 22, by - 200, 44, 110); x.beginPath(); x.moveTo(cx - 28, by - 200); x.lineTo(cx, by - 320); x.lineTo(cx + 28, by - 200); x.fill(); });
  x.fillStyle = '#2a2a30'; x.beginPath(); x.arc(cx, by - 120, 14, 0, 7); x.fill(); x.fillStyle = '#fff'; x.beginPath(); x.arc(cx, by - 120, 11, 0, 7); x.fill(); x.fillStyle = '#1a1a1a'; x.fillRect(cx - 1, by - 130, 2, 10); x.fillRect(cx, by - 121, 7, 2);
  x.fillStyle = '#3a3030'; for (let k = 0; k < 5; k++) x.fillRect(cx - 90 + k * 40, by - 70, 14, 40); x.fillStyle = '#ffd890'; x.fillRect(cx - 12, by - 60, 24, 36);
  // the Cabildo and Presbytère's mansards either side, slate roofs and chimneys along the block
  for (let i = 0; i < 12; i++) { const bx = i * 90 - 20, bh = 40 + rnd() * 30; if (Math.abs(bx + 45 - cx) < 140) continue; x.fillStyle = '#1a1620'; x.fillRect(bx, by - bh, 86, bh); x.fillStyle = '#2a2430'; x.beginPath(); x.moveTo(bx - 4, by - bh); x.lineTo(bx + 14, by - bh - 22); x.lineTo(bx + 72, by - bh - 22); x.lineTo(bx + 90, by - bh); x.fill(); x.fillStyle = '#1a1620'; x.fillRect(bx + 20, by - bh - 34, 8, 14); x.fillRect(bx + 60, by - bh - 34, 8, 14); for (let k = 0; k < 3; k++) if (rnd() < 0.6) { x.fillStyle = '#ffd890'; x.fillRect(bx + 12 + k * 26, by - bh + 10, 10, 14); } }
  x.fillStyle = '#0c0a10'; x.fillRect(0, by, w, h - by);
});
// Westminster across the river: the Elizabeth Tower's lit clock, Parliament's long gothic front, the Eye, the Shard
VIEW.london = (o) => canvas(1024, 512, (x, w, h) => {
  SKY.grad(x, w, h, [[0, '#0a0e24'], [0.5, '#262a4e'], [0.66, '#4a4060']]); SKY.stars(x, w, h, 60, 0.4); x.fillStyle = 'rgba(80,70,100,.5)'; x.fillRect(0, h * 0.5, w, h * 0.16);
  const base = h * 0.68;
  // the London Eye, lit, left
  x.strokeStyle = 'rgba(120,200,255,.9)'; x.lineWidth = 4; SKY.glow(x, '#8ad0ff', 14, () => { x.beginPath(); x.arc(w * 0.14, base - 92, 92, 0, 7); x.stroke(); x.lineWidth = 1.5; for (let k = 0; k < 24; k++) { x.beginPath(); x.moveTo(w * 0.14, base - 92); x.lineTo(w * 0.14 + Math.cos(k / 24 * 6.283) * 92, base - 92 + Math.sin(k / 24 * 6.283) * 92); x.stroke(); } });
  x.fillStyle = '#e8f0ff'; for (let k = 0; k < 24; k++) { x.beginPath(); x.ellipse(w * 0.14 + Math.cos(k / 24 * 6.283) * 92, base - 92 + Math.sin(k / 24 * 6.283) * 92, 5, 3.5, 0, 0, 7); x.fill(); }
  x.fillStyle = '#4a4a5a'; x.beginPath(); x.moveTo(w * 0.14 - 50, base); x.lineTo(w * 0.14, base - 92); x.lineTo(w * 0.14 + 50, base); x.fill();
  // the Houses of Parliament: the long floodlit front, pinnacles, the Victoria Tower right, the Elizabeth Tower left
  const px0 = w * 0.3, pw = w * 0.5; x.fillStyle = '#c8b088'; SKY.glow(x, '#ffd8a0', 20, () => { x.fillRect(px0, base - 70, pw, 70); });
  x.fillStyle = '#6a5a40'; for (let k = 0; k < pw / 14; k++) { x.fillRect(px0 + k * 14 + 3, base - 60, 4, 50); x.fillRect(px0 + k * 14 + 2, base - 82, 6, 12); }
  x.fillStyle = '#ffd890'; for (let k = 0; k < pw / 14; k++) if (rnd() < 0.7) x.fillRect(px0 + k * 14 + 8, base - 40, 3, 12);
  x.fillStyle = '#b8a078'; x.fillRect(px0 + pw - 60, base - 170, 60, 170); x.fillStyle = '#6a5a40'; for (const k of [0, 1, 2, 3]) x.fillRect(px0 + pw - 60 + k * 16 + 2, base - 184, 6, 16); x.fillStyle = '#4a6a6a'; x.fillRect(px0 + pw - 54, base - 150, 48, 100);
  const bx = px0 + 30; x.fillStyle = '#b8a078'; x.fillRect(bx - 18, base - 220, 36, 220); x.fillStyle = '#3a4a5a'; x.beginPath(); x.moveTo(bx - 22, base - 236); x.lineTo(bx, base - 300); x.lineTo(bx + 22, base - 236); x.fill(); x.fillStyle = '#c8a050'; x.fillRect(bx - 3, base - 316, 6, 18);
  SKY.glow(x, '#fff0b0', 20, () => { x.fillStyle = '#fff4c8'; x.beginPath(); x.arc(bx, base - 215, 16, 0, 7); x.fill(); }); x.strokeStyle = '#1a1a1a'; x.lineWidth = 2; x.beginPath(); x.moveTo(bx, base - 215); x.lineTo(bx, base - 227); x.moveTo(bx, base - 215); x.lineTo(bx + 8, base - 210); x.stroke(); x.fillStyle = '#6a5a40'; x.fillRect(bx - 22, base - 236, 44, 8);
  // the Shard, a lit spike far right; the bridge's lamps across the front; the river
  x.fillStyle = '#2a3448'; x.beginPath(); x.moveTo(w * 0.9 - 26, base); x.lineTo(w * 0.9, base - 260); x.lineTo(w * 0.9 + 26, base); x.fill(); x.fillStyle = 'rgba(200,220,255,.5)'; for (let k = 0; k < 18; k++) x.fillRect(w * 0.9 - 20 + k * 0.8, base - 20 - k * 13, 40 - k * 1.6, 1.5);
  x.fillStyle = '#1a1a22'; x.fillRect(0, base, w, 10); for (let i = 0; i < 20; i++) { SKY.glow(x, '#ffe0a0', 10, () => { x.fillStyle = '#ffe8b0'; x.beginPath(); x.arc(i * 52 + 20, base - 8, 3, 0, 7); x.fill(); }); x.fillStyle = '#2a2a30'; x.fillRect(i * 52 + 19, base - 6, 2, 8); }
  SKY.water(x, w, h, base + 10, '#141a2a', '#04060c', '255,210,150', 500); x.fillStyle = 'rgba(120,200,255,.3)'; for (let i = 0; i < 30; i++) x.fillRect(w * 0.14 - 60 + rnd() * 120, base + 10 + rnd() * (h - base - 10), 10 + rnd() * 40, 2);
});
// Vienna across the Ring: the Stephansdom's tall tower and chevron roof, Baroque domes, the Riesenrad far off
VIEW.vienna = (o) => canvas(1024, 512, (x, w, h) => {
  SKY.grad(x, w, h, [[0, '#0c1030'], [0.5, '#2a2a58'], [0.7, '#5a4a6a']]); SKY.stars(x, w, h, 80, 0.4);
  const base = h * 0.78;
  for (let i = 0; i < 14; i++) { const bx = i * 76, bh = 60 + rnd() * 30; x.fillStyle = '#1e1c2e'; x.fillRect(bx, base - bh, 72, bh); x.fillStyle = '#2a2838'; x.fillRect(bx - 2, base - bh - 10, 76, 12); for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) if (rnd() < 0.55) { x.fillStyle = '#ffd890'; x.fillRect(bx + 8 + c * 16, base - bh + 12 + r * 16, 6, 9); } }
  // the Stephansdom: the nave with its zigzag tiles, the great south tower, the stumpy north tower with its cap
  const cx = w * 0.5; x.fillStyle = '#3a3238'; x.fillRect(cx - 120, base - 120, 240, 120);
  x.fillStyle = '#2a4a3a'; x.beginPath(); x.moveTo(cx - 130, base - 120); x.lineTo(cx, base - 200); x.lineTo(cx + 130, base - 120); x.fill();
  x.fillStyle = '#c8a040'; for (let k = 0; k < 10; k++) { x.beginPath(); x.moveTo(cx - 120 + k * 26, base - 124); x.lineTo(cx - 107 + k * 26, base - 150); x.lineTo(cx - 94 + k * 26, base - 124); x.fill(); }
  x.fillStyle = '#4a4248'; SKY.glow(x, '#ffe0b0', 14, () => { x.fillRect(cx + 70 - 16, base - 300, 32, 300); }); x.beginPath(); x.moveTo(cx + 70 - 20, base - 300); x.lineTo(cx + 70, base - 400); x.lineTo(cx + 70 + 20, base - 300); x.fill();
  x.fillStyle = '#ffd890'; for (let k = 0; k < 8; k++) x.fillRect(cx + 70 - 4, base - 280 + k * 30, 8, 14);
  x.fillStyle = '#4a4248'; x.fillRect(cx - 80 - 14, base - 190, 28, 190); x.fillStyle = '#5a8a6a'; x.beginPath(); x.arc(cx - 80, base - 192, 18, Math.PI, 0); x.fill(); x.fillRect(cx - 80 - 2, base - 220, 4, 14);
  // the Karlskirche's green dome and twin columns, right; the Riesenrad's wheel, far left
  x.fillStyle = '#2a6a5a'; x.beginPath(); x.ellipse(w * 0.8, base - 110, 44, 50, 0, Math.PI, 0); x.fill(); x.fillStyle = '#d8d0c0'; x.fillRect(w * 0.8 - 60, base - 110, 120, 110); for (const s of [-1, 1]) x.fillRect(w * 0.8 + s * 80 - 6, base - 150, 12, 150);
  x.strokeStyle = 'rgba(255,230,170,.8)'; x.lineWidth = 3; SKY.glow(x, '#ffe0a0', 10, () => { x.beginPath(); x.arc(w * 0.1, base - 70, 60, 0, 7); x.stroke(); for (let k = 0; k < 12; k++) { x.beginPath(); x.moveTo(w * 0.1, base - 70); x.lineTo(w * 0.1 + Math.cos(k / 12 * 6.283) * 60, base - 70 + Math.sin(k / 12 * 6.283) * 60); x.stroke(); } });
  // the Ring below: a tram's lit windows, horse chestnuts in a row
  x.fillStyle = '#0c0c14'; x.fillRect(0, base, w, h - base); SKY.trees(x, w, base + 8, 30, '#0a120c', 0.9);
  x.fillStyle = '#c81a1a'; x.fillRect(w * 0.6, base + 30, 160, 22); x.fillStyle = '#ffe8b0'; for (let k = 0; k < 8; k++) x.fillRect(w * 0.6 + 8 + k * 19, base + 34, 12, 10);
  for (let i = 0; i < 24; i++) { SKY.glow(x, '#ffe0a0', 8, () => { x.fillStyle = '#fff0c0'; x.beginPath(); x.arc(i * 44 + 20, base + 16, 2.5, 0, 7); x.fill(); }); }
});
// Marina Bay from a tower: the Sands' three towers under the SkyPark, the ArtScience lotus, the Supertrees lit violet, the Flyer
VIEW.singapore = (o) => canvas(1024, 512, (x, w, h) => {
  SKY.grad(x, w, h, [[0, '#060a20'], [0.45, '#1c2050'], [0.6, '#4a3060']]); SKY.stars(x, w, h, 80, 0.4);
  const base = h * 0.66;
  for (let i = 0; i < 26; i++) SKY.bldg(x, rnd() * w, base - 60 - rnd() * 120, 20 + rnd() * 36, 80 + rnd() * 140, '#0c1226', ['#ffe0a8', '#9ad4ff', '#fff'], 7, 0.45);
  // the Sands: three towers leaning in, the SkyPark laid across their tops like a hull
  const sx = w * 0.42; x.fillStyle = '#1a2440'; for (let k = 0; k < 3; k++) { const tx = sx + k * 74; x.beginPath(); x.moveTo(tx - 20, base); x.lineTo(tx - 8, base - 230); x.lineTo(tx + 22, base - 230); x.lineTo(tx + 24, base); x.fill(); x.fillStyle = '#ffd890'; for (let r = 0; r < 22; r++) for (let c = 0; c < 4; c++) if (rnd() < 0.6) x.fillRect(tx - 12 + c * 9 + r * 0.3, base - 220 + r * 10, 5, 5); x.fillStyle = '#1a2440'; }
  SKY.glow(x, '#ffe8c0', 16, () => { x.fillStyle = '#e8e4d8'; x.beginPath(); x.moveTo(sx - 60, base - 236); x.quadraticCurveTo(sx + 80, base - 262, sx + 240, base - 232); x.lineTo(sx + 230, base - 226); x.lineTo(sx - 40, base - 228); x.fill(); });
  x.fillStyle = '#3ad8c8'; x.fillRect(sx + 100, base - 240, 80, 3);
  // the ArtScience Museum's lotus, the Flyer's wheel, the Supertrees in the gardens behind
  x.fillStyle = '#d8dce8'; for (let k = 0; k < 7; k++) { x.beginPath(); x.ellipse(w * 0.2 + k * 10, base - 20, 10, 36 + (k % 2) * 10, (k - 3) * 0.22, 0, 7); x.fill(); }
  x.strokeStyle = 'rgba(160,210,255,.8)'; x.lineWidth = 3; SKY.glow(x, '#9ad4ff', 10, () => { x.beginPath(); x.arc(w * 0.9, base - 80, 70, 0, 7); x.stroke(); for (let k = 0; k < 16; k++) { x.beginPath(); x.moveTo(w * 0.9, base - 80); x.lineTo(w * 0.9 + Math.cos(k / 16 * 6.283) * 70, base - 80 + Math.sin(k / 16 * 6.283) * 70); x.stroke(); } });
  for (let k = 0; k < 7; k++) { const tx = w * 0.62 + k * 36 + (k % 2) * 10, th = 60 + (k % 3) * 24; x.fillStyle = '#3a1a5a'; x.fillRect(tx - 3, base - th, 6, th); SKY.glow(x, '#c060ff', 22, () => { x.fillStyle = '#b060ff'; x.beginPath(); x.moveTo(tx - 24, base - th); x.lineTo(tx - 6, base - th - 18); x.lineTo(tx + 6, base - th - 18); x.lineTo(tx + 24, base - th); x.fill(); }); }
  SKY.water(x, w, h, base, '#0a1428', '#02040a', '255,220,170', 400); x.fillStyle = 'rgba(180,120,255,.3)'; for (let i = 0; i < 40; i++) x.fillRect(w * 0.6 + rnd() * 260, base + rnd() * (h - base), 10 + rnd() * 40, 2);
});
// Nassau at sunset, from the beach: the sea to the horizon, Atlantis's pink towers and arch far across the water, a sail, palms either side
VIEW.nassau = (o) => canvas(2048, 512, (x, w, h) => {
  SKY.grad(x, w, h, [[0, '#1a1a5a'], [0.3, '#6a3a7a'], [0.5, '#ff8a5a'], [0.58, '#ffc070'], [0.6, '#2a6a8a'], [0.62, '#1a7a9a'], [0.85, '#0a4a6a'], [1, '#0a3a5a']]); SKY.stars(x, w, h, 60, 0.25);
  x.fillStyle = 'rgba(255,170,100,.35)'; for (let k = 0; k < 6; k++) { x.beginPath(); x.ellipse(w * (0.2 + k * 0.13), h * (0.36 + (k % 2) * 0.08), 90 + k * 20, 9, 0, 0, 7); x.fill(); }
  SKY.glow(x, '#ffe0a0', 60, () => { x.fillStyle = '#fff0c0'; x.beginPath(); x.arc(w * 0.62, h * 0.57, 26, Math.PI, 0); x.fill(); });
  // Atlantis on Paradise Island: the Royal Towers joined by their bridge, coral pink, far on the horizon to the left
  const ax = w * 0.22, ab = h * 0.6; x.fillStyle = '#c8807a'; for (const s of [-1, 1]) { x.fillRect(ax + s * 40 - 16, ab - 70, 32, 70); x.fillRect(ax + s * 40 - 10, ab - 82, 20, 12); } x.fillRect(ax - 30, ab - 56, 60, 10); x.fillStyle = '#ffe0a0'; for (let k = 0; k < 12; k++) for (const s of [-1, 1]) if (rnd() < 0.5) x.fillRect(ax + s * 40 - 12 + (k % 3) * 9, ab - 66 + Math.floor(k / 3) * 14, 4, 6);
  x.fillStyle = '#6a4a5a'; x.fillRect(ax - 120, ab - 14, 240, 14); x.fillStyle = '#ffd890'; for (let k = 0; k < 20; k++) x.fillRect(ax - 116 + k * 12, ab - 10, 3, 3);
  // the water: swells catching the sunset, a sail, the shallows going turquoise toward the sand
  for (let i = 0; i < 900; i++) { const yy = h * 0.61 + rnd() * h * 0.39; x.fillStyle = 'rgba(' + (yy < h * 0.7 ? '255,200,140' : '180,240,255') + ',' + rnd() * 0.35 + ')'; x.fillRect(rnd() * w, yy, 10 + rnd() * 40, 1.5 + (yy - h * 0.6) / 80); }
  x.fillStyle = '#fff4e0'; x.beginPath(); x.moveTo(w * 0.72, h * 0.6); x.lineTo(w * 0.72, h * 0.5); x.lineTo(w * 0.745, h * 0.6); x.fill(); x.fillStyle = '#2a1a1a'; x.fillRect(w * 0.712, h * 0.6, 40, 4);
  const wg = x.createLinearGradient(0, h * 0.86, 0, h); wg.addColorStop(0, 'rgba(60,200,220,0)'); wg.addColorStop(1, 'rgba(120,230,230,.6)'); x.fillStyle = wg; x.fillRect(0, h * 0.86, w, h * 0.14);
  for (const [px, s] of [[w * 0.05, 1.3], [w * 0.1, 1.0], [w * 0.92, 1.2], [w * 0.97, 0.9], [w * 0.86, 0.8]]) SKY.palm(x, px, h * 0.92, s, '#0a1a16');
});
// Prague from the Old Town: the Castle and St. Vitus's spires lit gold on the hill, the Charles Bridge and its tower, red roofs, the Vltava
VIEW.prague = (o) => canvas(1024, 512, (x, w, h) => {
  SKY.grad(x, w, h, [[0, '#0a0c28'], [0.45, '#2a2250'], [0.6, '#5a3a58']]); SKY.stars(x, w, h, 100, 0.4);
  // the hill, the long palace front floodlit, the cathedral's two needle spires and the great tower behind
  x.fillStyle = '#1a1830'; x.beginPath(); x.moveTo(0, h * 0.6); x.lineTo(w * 0.2, h * 0.46); x.lineTo(w * 0.7, h * 0.42); x.lineTo(w, h * 0.5); x.lineTo(w, h * 0.6); x.fill();
  const px0 = w * 0.26, pb = h * 0.47; x.fillStyle = '#d8c8a0'; SKY.glow(x, '#ffd890', 24, () => { x.fillRect(px0, pb - 40, w * 0.42, 40); }); x.fillStyle = '#4a3a30'; x.fillRect(px0 - 4, pb - 52, w * 0.42 + 8, 12); x.fillStyle = '#5a4a40'; for (let k = 0; k < 30; k++) x.fillRect(px0 + 8 + k * 14, pb - 30, 5, 10);
  const vx = px0 + w * 0.16; x.fillStyle = '#4a4050'; x.fillRect(vx - 60, pb - 120, 120, 80); for (const s of [-1, 1]) { x.fillRect(vx + s * 30 - 8, pb - 170, 16, 60); x.fillStyle = '#6a6070'; x.beginPath(); x.moveTo(vx + s * 30 - 10, pb - 170); x.lineTo(vx + s * 30, pb - 240); x.lineTo(vx + s * 30 + 10, pb - 170); x.fill(); x.fillStyle = '#4a4050'; }
  x.fillRect(vx + 70, pb - 150, 26, 110); x.fillStyle = '#2a6a5a'; x.beginPath(); x.ellipse(vx + 83, pb - 152, 16, 14, 0, Math.PI, 0); x.fill(); x.fillRect(vx + 81, pb - 180, 4, 16);
  x.fillStyle = '#ffd890'; for (let k = 0; k < 6; k++) x.fillRect(vx - 50 + k * 20, pb - 100, 6, 30);
  // the Lesser Town's red roofs tumbling down to the river, St. Nicholas's green dome
  for (let i = 0; i < 70; i++) { const bx = rnd() * w, by = pb + 10 + rnd() * h * 0.16, bw = 16 + rnd() * 30; x.fillStyle = '#2a1a1a'; x.fillRect(bx, by, bw, 24); x.fillStyle = pick(['#7a3020', '#8a3a24', '#6a2a1c']); x.beginPath(); x.moveTo(bx - 2, by); x.lineTo(bx + bw / 2, by - 12); x.lineTo(bx + bw + 2, by); x.fill(); if (rnd() < 0.5) { x.fillStyle = '#ffd890'; x.fillRect(bx + 4, by + 6, 4, 6); } }
  x.fillStyle = '#2a6a5a'; x.beginPath(); x.ellipse(w * 0.2, h * 0.6, 30, 26, 0, Math.PI, 0); x.fill(); x.fillStyle = '#3a3030'; x.fillRect(w * 0.2 - 30, h * 0.6, 60, 30); x.fillRect(w * 0.2 + 40, h * 0.5, 12, 40);
  x.fillStyle = '#1a1420'; x.fillRect(0, h * 0.66, w, h * 0.09); for (let i = 0; i < 40; i++) { x.fillStyle = '#ffd890'; x.fillRect(rnd() * w, h * 0.67 + rnd() * h * 0.06, 3, 4); }
  // the Charles Bridge: its arches, the statues along the parapet, the Old Town tower at our end, lamps
  const by = h * 0.74; x.fillStyle = '#3a3230'; x.fillRect(0, by, w, 14); for (let k = 0; k < 9; k++) { x.fillStyle = '#0c0c18'; x.beginPath(); x.ellipse(60 + k * 112, by + 14, 42, 28, 0, Math.PI, 0); x.fill(); }
  x.fillStyle = '#1a1620'; for (let k = 0; k < 17; k++) x.fillRect(30 + k * 58, by - 22, 7, 22); for (let k = 0; k < 9; k++) SKY.glow(x, '#ffd890', 10, () => { x.fillStyle = '#ffe8b0'; x.beginPath(); x.arc(70 + k * 112, by - 16, 3, 0, 7); x.fill(); });
  x.fillStyle = '#3a3030'; x.fillRect(w * 0.88, by - 150, 50, 150); x.beginPath(); x.moveTo(w * 0.88 - 6, by - 150); x.lineTo(w * 0.88 + 25, by - 210); x.lineTo(w * 0.88 + 56, by - 150); x.fill(); x.fillStyle = '#ffd890'; x.fillRect(w * 0.88 + 20, by - 110, 10, 18);
  SKY.water(x, w, h, by + 14, '#0e1426', '#03050c', '255,210,150', 400);
});
// Valletta across the Grand Harbour at dusk: the bastions floodlit honey, the Carmelite dome and St. Paul's spire, boats
VIEW.malta = (o) => canvas(2048, 512, (x, w, h) => {
  SKY.grad(x, w, h, [[0, '#1a1a4a'], [0.35, '#5a3a6a'], [0.52, '#ff9a5a'], [0.58, '#ffc890']]); SKY.stars(x, w, h, 60, 0.3);
  const base = h * 0.6;
  // the city on its ridge: tight stone houses with their closed wooden balconies, church domes, the spire
  x.fillStyle = '#5a4a3a'; x.beginPath(); x.moveTo(0, base + 20); x.lineTo(w * 0.1, base - 40); x.lineTo(w * 0.5, base - 70); x.lineTo(w * 0.8, base - 50); x.lineTo(w, base + 10); x.lineTo(w, base + 30); x.lineTo(0, base + 30); x.fill();
  for (let i = 0; i < 110; i++) { const bx = rnd() * w, bh = 26 + rnd() * 40, by = base - 40 - (0.5 - Math.abs(bx / w - 0.5)) * 60 + rnd() * 30; x.fillStyle = pick(['#c8a878', '#b89868', '#d8b888']); x.fillRect(bx, by, 22 + rnd() * 20, bh); x.fillStyle = pick(['#2a5a3a', '#7a2a1a', '#2a3a6a']); x.fillRect(bx + 4, by + 8, 10, 12); if (rnd() < 0.5) { x.fillStyle = '#ffe0a0'; x.fillRect(bx + 6, by + 10, 5, 7); } }
  SKY.glow(x, '#ffd8a0', 26, () => { x.fillStyle = '#9ab0b8'; x.beginPath(); x.ellipse(w * 0.5, base - 90, 54, 44, 0, Math.PI, 0); x.fill(); x.fillStyle = '#d8b888'; x.fillRect(w * 0.5 - 60, base - 90, 120, 60); x.fillRect(w * 0.5 - 4, base - 150, 8, 18); });
  x.fillStyle = '#d8c8a0'; x.fillRect(w * 0.58 - 10, base - 170, 20, 120); x.beginPath(); x.moveTo(w * 0.58 - 12, base - 170); x.lineTo(w * 0.58, base - 250); x.lineTo(w * 0.58 + 12, base - 170); x.fill();
  // the bastions: long walls of stone floodlit amber, stepping down to the water; Fort St. Elmo's low fort at the point
  x.fillStyle = '#b8905a'; SKY.glow(x, '#ffb060', 30, () => { x.fillRect(0, base - 10, w, 26); x.fillRect(w * 0.1, base - 30, w * 0.75, 22); }); x.fillStyle = 'rgba(0,0,0,.25)'; for (let k = 0; k < 40; k++) x.fillRect(k * 52, base - 30, 3, 46);
  x.fillStyle = '#6a5a44'; x.fillRect(0, base + 16, w, 10);
  // the harbour: the water catching the sunset, luzzus and a ferry, their lights
  SKY.water(x, w, h, base + 26, '#1a2a44', '#06101e', '255,200,120', 900);
  for (let i = 0; i < 9; i++) { const yx = rnd() * w, yy = base + 50 + rnd() * h * 0.3; x.fillStyle = pick(['#d8282a', '#2a5ad8', '#f0d040']); x.fillRect(yx, yy, 26, 7); x.fillStyle = '#fff'; x.fillRect(yx + 4, yy + 2, 4, 3); x.fillStyle = '#f0f0f0'; x.fillRect(yx + 10, yy - 4, 3, 4); }
  x.fillStyle = '#e8e8f0'; x.fillRect(w * 0.7, base + 40, 90, 10); x.fillRect(w * 0.72, base + 32, 60, 8); x.fillStyle = '#ffe0a0'; for (let k = 0; k < 9; k++) x.fillRect(w * 0.7 + 6 + k * 9, base + 43, 4, 3);
});

// ── Outdoors and big architecture ──────────────────────────────────────────────────────────────────────────
// a painted view as light, for the big backdrops (the offline renderer keeps these dim, see 'sky')
function unlit(c, k) { const m = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: tex(c), emissiveIntensity: k || 1, roughness: 1 }); m.userData.kind = 'sky'; return m; }
// the world beyond an open side: a curved backdrop round the room (the view painted on it) under a sky dome
function backdrop(g, view, cx, cz, r, h, y, a0, a1) {
  const geo = new THREE.CylinderGeometry(r, r, h, 64, 1, true, a0, a1 - a0);
  const m = new THREE.Mesh(geo, unlit(view)); m.material.side = THREE.BackSide; m.position.set(cx, y + h / 2, cz); g.add(m); m.userData.flat = 1; return m;
}
function skyDome(g, cx, cz, r, stops) {
  const c = canvas(8, 256, (x, w, h) => { const g2 = x.createLinearGradient(0, 0, 0, h); stops.forEach(([p, col]) => g2.addColorStop(p, col)); x.fillStyle = g2; x.fillRect(0, 0, w, h); });
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.52), unlit(c, 0.9)); m.material.side = THREE.BackSide; m.position.set(cx, -r * 0.03, cz); g.add(m); m.userData.flat = 1; return m;
}
// ground that goes on past the room's floor: sand, grass, flagstones (subdivided so the renderer doesn't take it for the floor)
function ground(g, w, d, mat, x, z, y) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d, 6, 6), mat); m.rotation.x = -Math.PI / 2; m.position.set(x, y == null ? -0.02 : y, z); g.add(m); m.userData.flat = 1; return m; }
// still water: a pool, a harbour, the sea by the deck
function water(g, w, d, x, z, y, col) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d, 4, 4), new THREE.MeshPhysicalMaterial({ color: col || 0x1a6a8a, roughness: 0.04, metalness: 0.1, transmission: 0.3, thickness: 1, envMapIntensity: 1.6, emissive: col || 0x1a6a8a, emissiveIntensity: 0.15 })); m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); g.add(m); m.userData.flat = 1; m.material.userData.kind = 'water'; return m; }
// a window with a round top: the plane shaped to the arch, the view mapped across it, a frame round the edge
function archShape(w, h, pointed) {
  const s = new THREE.Shape(), r = w / 2; s.moveTo(-r, -h / 2); s.lineTo(r, -h / 2); s.lineTo(r, h / 2 - r);
  if (pointed) { s.quadraticCurveTo(r, h / 2 + r * 0.1, 0, h / 2 + r * 0.6); s.quadraticCurveTo(-r, h / 2 + r * 0.1, -r, h / 2 - r); } else s.absarc(0, h / 2 - r, r, 0, Math.PI, false);
  s.lineTo(-r, -h / 2); return s;
}
function archWindow(g, view, x, y, z, w, h, ry, frame, pointed) {
  const geo = new THREE.ShapeGeometry(archShape(w, h, pointed), 24); geo.computeBoundingBox(); const bb = geo.boundingBox, uv = geo.attributes.uv, pos = geo.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (pos.getX(i) - bb.min.x) / (bb.max.x - bb.min.x), (pos.getY(i) - bb.min.y) / (bb.max.y - bb.min.y));
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex(view) })); m.position.set(x, y, z); if (ry) m.rotation.y = ry; g.add(m);
  const fr = new THREE.Group(); fr.position.set(x, y, z); if (ry) fr.rotation.y = ry; g.add(fr);
  const fm = M({ color: frame || 0x1a1410, roughness: 0.45 }), r = w / 2;
  const pts = []; for (let i = 0; i <= 24; i++) { const a = Math.PI * i / 24; pts.push(new THREE.Vector3(Math.cos(a) * r, h / 2 - r + Math.sin(a) * r * (pointed ? 1.5 : 1), 0.04)); }
  fr.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 32, 0.06, 8), fm));
  box(fr, 0.1, h - r + 0.2, 0.12, fm, -r, (-h / 2 + h / 2 - r) / 2 - 0.1, 0.04); box(fr, 0.1, h - r + 0.2, 0.12, fm, r, (-h / 2 + h / 2 - r) / 2 - 0.1, 0.04); box(fr, w + 0.24, 0.08, 0.22, fm, 0, -h / 2 - 0.02, 0.07);
  box(fr, 0.05, h - r, 0.05, fm, 0, -r / 2, 0.04); box(fr, w, 0.04, 0.05, fm, 0, h / 2 - r, 0.04);
  const gl = new THREE.Mesh(geo.clone(), M({ color: 0x9ab0c8, metalness: 1, roughness: 0.3, transparent: true, opacity: 0.08, envMapIntensity: 1.5 })); gl.position.z = 0.02; fr.add(gl);
  return m;
}
// a bay window: n panes on an arc, framed, the view on each
function bayWindow(g, view, x, y, z, r, h, n, span, frame) {
  const b = new THREE.Group(); b.position.set(x, y, z); g.add(b);
  const fm = M({ color: frame || 0xf0ebe0, roughness: 0.5 }), pw = 2 * r * Math.sin(span / n / 2) - 0.14;
  const base = tex(view); for (let i = 0; i < n; i++) { const a = -span / 2 + (i + 0.5) * span / n; const px = Math.sin(a) * r, pz = -Math.cos(a) * r; const t = base.clone(); t.wrapS = THREE.ClampToEdgeWrapping; t.repeat.set(0.6 / n, 1); t.offset.set(0.2 + 0.6 * i / n, 0); t.needsUpdate = true; const pane = plane(b, pw, h, new THREE.MeshBasicMaterial({ map: t }), px, 0, pz, -a); plane(b, pw, h, M({ color: 0x9ab0c8, metalness: 1, roughness: 0.3, transparent: true, opacity: 0.08, envMapIntensity: 1.5 }), px + Math.sin(a) * 0.02, 0, pz - Math.cos(a) * 0.02, -a); box(b, pw, 0.04, 0.05, M({ color: frame || 0xf0ebe0, roughness: 0.5 }), px, h * 0.1, pz, -a); }
  for (let i = 0; i <= n; i++) { const a = -span / 2 + i * span / n; box(b, 0.16, h + 0.3, 0.16, fm, Math.sin(a) * r, 0, -Math.cos(a) * r); }
  // the seat round the bay
  const pts = []; for (let i = 0; i <= 16; i++) { const a = -span / 2 + i * span / 16; pts.push(new THREE.Vector2(Math.sin(a) * (r - 0.3), -Math.cos(a) * (r - 0.3))); }
  return b;
}
// a railing between two points: iron (thin balusters), wood, or a stone balustrade
function railing(g, x0, z0, x1, z1, h, style, col) {
  const dx = x1 - x0, dz = z1 - z0, len = Math.hypot(dx, dz), ry = Math.atan2(dx, dz) + Math.PI / 2;
  const r = new THREE.Group(); r.position.set((x0 + x1) / 2, 0, (z0 + z1) / 2); r.rotation.y = ry; g.add(r);
  if (style === 'stone') {
    const st = M({ map: tex(PAINT.stucco(col || '#d8c8a0'), 2, 1), roughness: 0.9 });
    box(r, len, 0.08, 0.3, st, 0, h, 0); box(r, len, 0.1, 0.34, st, 0, 0.05, 0);
    const n = Math.floor(len / 0.3); for (let i = 0; i < n; i++) { const bl = new THREE.Mesh(new THREE.LatheGeometry([[0.06, 0], [0.1, 0.06], [0.05, 0.3], [0.09, 0.5], [0.11, 0.6], [0.05, 0.7], [0.1, 0.8], [0.06, 0.85]].map(q => new THREE.Vector2(q[0] * h / 0.9, q[1] * h / 0.9)), 10), st); bl.position.set(-len / 2 + (i + 0.5) * len / n, 0.1, 0); r.add(bl); }
  } else {
    const m = M({ color: col || (style === 'wood' ? 0xf0ebe0 : 0x141414), metalness: style === 'wood' ? 0 : 0.6, roughness: 0.5 });
    box(r, len, 0.05, 0.08, m, 0, h, 0); box(r, len, 0.03, 0.03, m, 0, 0.12, 0);
    const n = Math.floor(len / (style === 'wood' ? 0.16 : 0.13)); for (let i = 0; i <= n; i++) { const bx = -len / 2 + i * len / n; cyl(r, 0.012, 0.012, h, m, bx, h / 2, 0, 6); if (style === 'iron' && i % 2) { const sc = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.008, 4, 12), m); sc.position.set(bx + len / n / 2, h * 0.6, 0); r.add(sc); } }
    for (let i = 0; i <= Math.floor(len / 2); i++) box(r, 0.05, h + 0.02, 0.05, m, -len / 2 + i * Math.min(2, len), h / 2, 0);
  }
  return r;
}
// a tiered fountain: stone basin, water, a bowl above spilling into it, lit from below
function fountain(g, x, z, r) {
  const f = new THREE.Group(); f.position.set(x, 0, z); g.add(f); r = r || 1.6;
  const st = M({ map: tex(PAINT.stucco('#b8b0a0'), 2, 1), roughness: 0.85 });
  cyl(f, r, r + 0.1, 0.5, st, 0, 0.25, 0, 32); cyl(f, r - 0.12, r - 0.12, 0.02, M({ color: 0x1a3a4a, roughness: 0.03, metalness: 0.3, envMapIntensity: 1.6 }), 0, 0.46, 0, 32);
  cyl(f, 0.12, 0.16, 0.9, st, 0, 0.9, 0, 12); const bowl = new THREE.Mesh(new THREE.LatheGeometry([[0.001, 0], [0.5, 0.02], [0.62, 0.14], [0.6, 0.2], [0.001, 0.2]].map(q => new THREE.Vector2(q[0], q[1])), 24), st); bowl.position.y = 1.32; f.add(bowl);
  cyl(f, 0.06, 0.09, 0.5, st, 0, 1.7, 0, 10); const top = new THREE.Mesh(new THREE.LatheGeometry([[0.001, 0], [0.26, 0.02], [0.32, 0.1], [0.3, 0.14], [0.001, 0.14]].map(q => new THREE.Vector2(q[0], q[1])), 20), st); top.position.y = 1.95; f.add(top);
  const wm = M({ color: 0xcce8ff, transparent: true, opacity: 0.55, roughness: 0.05 }); for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; seg(f, [Math.cos(a) * 0.3, 2.06, Math.sin(a) * 0.3], [Math.cos(a) * 0.34, 1.52, Math.sin(a) * 0.34], 0.01, 0.014, wm); seg(f, [Math.cos(a + 0.3) * 0.6, 1.48, Math.sin(a + 0.3) * 0.6], [Math.cos(a + 0.3) * 0.66, 0.5, Math.sin(a + 0.3) * 0.66], 0.012, 0.02, wm); } sph(f, 0.06, wm, 0, 2.2, 0, 8).scale.y = 2.5;
  light(f, 0x8ad0ff, 1.6, 0, 0.6, 0, 4); return f;
}
// a pool at night: turquoise water lit from under, pale coping, the far edge spilling over
function pool(g, x, z, w, d) {
  const cop = M({ map: tex(PAINT.stucco('#e8e0d0'), 4, 1), roughness: 0.7 });
  box(g, w + 0.6, 0.12, 0.3, cop, x, 0.06, z + d / 2 + 0.15); for (const s of [-1, 1]) box(g, 0.3, 0.12, d + 0.6, cop, x + s * (w / 2 + 0.15), 0.06, z);
  box(g, w, 0.6, d, M({ color: 0x1a7a9a, roughness: 0.3 }), x, -0.32, z);
  const wt = water(g, w, d, x, z, 0.08, 0x2ad0d8); wt.material.emissiveIntensity = 0.5;
  for (let i = 0; i < 4; i++) light(g, 0x40e0e8, 1.2, x - w / 2 + (i + 0.5) * w / 4, 0.0, z, 3);
  return wt;
}
// a real palm: a tapered, slightly leaning trunk with ring scars, fronds that droop, for outside
let FROND = null;
function frondTex() { if (!FROND) FROND = tex(canvas(256, 64, (x, w, h) => { x.clearRect(0, 0, w, h); x.strokeStyle = '#2a5a24'; x.lineWidth = 3; x.beginPath(); x.moveTo(0, h / 2); x.lineTo(w, h / 2); x.stroke(); for (let i = 4; i < w; i += 6) { x.strokeStyle = pick(['#2f6a2a', '#3a7a30', '#245a22', '#4a8a3a']); x.lineWidth = 7; x.lineCap = 'round'; x.beginPath(); x.moveTo(i, h / 2); x.lineTo(i + 16, 4 + (i % 5)); x.moveTo(i, h / 2); x.lineTo(i + 16, h - 4 - (i % 5)); x.stroke(); } })); return FROND; }
function palmTree(g, x, z, hgt, lean) {
  const p = new THREE.Group(); p.position.set(x, 0, z); p.rotation.y = rnd() * 6.28; g.add(p); hgt = hgt || 5;
  const bark = M({ map: tex(PAINT.wood('#8a7050', '#6a5038', 6), 1, 6), roughness: 0.95 });
  const pts = []; for (let i = 0; i <= 8; i++) { const t = i / 8; pts.push(new THREE.Vector3(Math.sin(t * 1.2) * (lean || 0.5) * t, t * hgt, 0)); }
  const trunk = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.16, 10), bark); p.add(trunk);
  for (let i = 1; i < 12; i++) { const t = i / 12, q = pts[0].clone().lerp(pts[8], t); const ring = cyl(p, 0.17 + 0.03 * (1 - t), 0.19 + 0.03 * (1 - t), 0.05, M({ color: 0x5a4030, roughness: 0.95 }), Math.sin(t * 1.2) * (lean || 0.5) * t, t * hgt, 0, 10); }
  const top = pts[8]; const leaf = new THREE.MeshStandardMaterial({ map: frondTex(), transparent: true, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.7, color: 0xffffff });
  for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2 + rnd() * 0.3, tilt = 0.2 + rnd() * 0.6; const geo = new THREE.PlaneGeometry(2.8, 0.75, 12, 1), ps = geo.attributes.position; for (let k = 0; k < ps.count; k++) { const u = (ps.getX(k) + 1.3) / 2.6; ps.setY(k, ps.getY(k) - u * u * 1.2); } geo.translate(1.4, 0, 0); const f = new THREE.Mesh(geo, leaf); f.position.set(top.x, top.y + 0.1, top.z); f.rotation.set(0, -a, tilt - 0.1); f.rotateX(0.2); p.add(f); }
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; sph(p, 0.05, M({ color: 0x6a4a1a }), top.x + Math.cos(a) * 0.2, top.y - 0.15, top.z + Math.sin(a) * 0.2, 6); }
  return p;
}
// a banana plant: a cluster of big paddle leaves (the courtyard kind)
function banana(g, x, z, s) {
  const p = new THREE.Group(); p.position.set(x, 0, z); p.scale.setScalar(s || 1); p.rotation.y = rnd() * 6; g.add(p);
  cyl(p, 0.1, 0.14, 1.4, M({ color: 0x5a7a3a, roughness: 0.8 }), 0, 0.7, 0, 10);
  for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283, geo = new THREE.PlaneGeometry(0.5, 1.6, 2, 8), ps = geo.attributes.position; for (let k = 0; k < ps.count; k++) { const v = (ps.getY(k) + 0.8) / 1.6; ps.setZ(k, -v * v * 0.6); } geo.translate(0, 0.8, 0); const lf = new THREE.Mesh(geo, M({ color: pick([0x2f6a2a, 0x3a7a30, 0x4a8a3a]), side: THREE.DoubleSide, roughness: 0.6 })); lf.position.set(0, 1.3, 0); lf.rotation.set(-0.5 - rnd() * 0.5, a, 0); lf.rotation.order = 'YXZ'; p.add(lf); }
  return p;
}
// a dome overhead: the inside of a half sphere, a ring of ribs, a ring at the spring line
function dome(g, x, y, z, r, mat, ribs, ribMat) {
  const d = new THREE.Mesh(new THREE.SphereGeometry(r, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), mat); d.material.side = THREE.BackSide; d.position.set(x, y, z); g.add(d); d.userData.flat = 1;
  for (let i = 0; i < (ribs || 0); i++) { const rb = new THREE.Mesh(new THREE.TorusGeometry(r - 0.05, 0.06, 6, 32, Math.PI / 2), ribMat); rb.position.set(x, y, z); rb.rotation.y = i / ribs * Math.PI * 2; g.add(rb); }
  const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.12, 8, 64), ribMat || mat); ring.rotation.x = Math.PI / 2; ring.position.set(x, y, z); g.add(ring);
  return d;
}
// a barrel vault: a half-cylinder ceiling along z, its ridge over x, springing at y (pointed: taller, like a gothic vault)
function vault(g, x, y, z, w, len, mat, pointed, squash) {
  const geo = new THREE.CylinderGeometry(w / 2, w / 2, len, 36, 1, true, 0, Math.PI); geo.rotateZ(Math.PI / 2); geo.rotateY(Math.PI / 2); if (pointed || squash) geo.scale(1, squash || 1.3, 1);
  const m = new THREE.Mesh(geo, mat); m.material.side = THREE.BackSide; m.position.set(x, y, z); g.add(m); m.userData.flat = 1; return m;
}
// a gothic rib: a pointed arch of stone across a bay
function ribArch(g, x0, z0, x1, z1, y0, rise, r, mat) {
  const mid = new THREE.Vector3((x0 + x1) / 2, y0 + rise, (z0 + z1) / 2);
  const c = new THREE.QuadraticBezierCurve3(new THREE.Vector3(x0, y0, z0), new THREE.Vector3(mid.x, y0 + rise * 1.5, mid.z), new THREE.Vector3(x1, y0, z1));
  const m = new THREE.Mesh(new THREE.TubeGeometry(c, 24, r || 0.09, 8), mat); g.add(m); return m;
}
// an open arch in a wall (a loggia's arcade): piers either side, the arch over, the wall above it filled
function arcade(g, x0, x1, z, y, h, n, mat, ry) {
  const a = new THREE.Group(); a.position.set(0, 0, 0); g.add(a); const len = x1 - x0, pw = len / n;
  for (let i = 0; i <= n; i++) box(a, 0.5, h, 0.6, mat, x0 + i * pw, h / 2, z);
  for (let i = 0; i < n; i++) { const cx = x0 + (i + 0.5) * pw, r = pw / 2 - 0.25; const ar = new THREE.Mesh(new THREE.TorusGeometry(r, 0.22, 8, 24, Math.PI), mat); ar.position.set(cx, h, z); ar.scale.y = 0.75; a.add(ar); box(a, pw, y - h - r * 0.75 + 0.3, 0.6, mat, cx, (y + h + r * 0.75) / 2 - 0.1, z); }
  if (ry) { a.rotation.y = ry; }
  return a;
}
// a gas lamp on a post
function lampPost(g, x, z, h, col) {
  const ir = M({ color: 0x141414, metalness: 0.6, roughness: 0.5 }); h = h || 2.6;
  cyl(g, 0.04, 0.07, h, ir, x, h / 2, z, 8); cyl(g, 0.14, 0.18, 0.06, ir, x, 0.03, z, 12);
  cyl(g, 0.12, 0.16, 0.3, M({ color: 0xfff0d0, emissive: col || 0xffb050, emissiveIntensity: 1.6, transparent: true, opacity: 0.85 }), x, h + 0.15, z, 6); cyl(g, 0.02, 0.2, 0.1, ir, x, h + 0.34, z, 6);
  light(g, col || 0xffb050, 2.2, x, h + 0.1, z, 7);
}
// a living wall: ferns and leaves packed over a frame
function greenWall(g, x, y, z, w, h, ry) {
  const gw = new THREE.Group(); gw.position.set(x, y, z); gw.rotation.y = ry || 0; g.add(gw);
  box(gw, w, h, 0.1, M({ color: 0x1a2a1a }), 0, 0, 0);
  for (let i = 0; i < w * h * 22; i++) { const lf = sph(gw, 0.06 + rnd() * 0.07, M({ color: pick([0x2f6a2a, 0x3a7a30, 0x1f5a24, 0x4a8a3a, 0x6a9a4a]), roughness: 0.7 }), (rnd() - 0.5) * w, (rnd() - 0.5) * h, 0.08 + rnd() * 0.12, 6); lf.scale.set(1.6, 1, 0.5); lf.rotation.z = rnd() * 3; }
  return gw;
}
// a marble-topped bistro table with bentwood chairs
function bistro(g, x, z, people) {
  const t = new THREE.Group(); t.position.set(x, 0, z); t.rotation.y = rnd() * 6; g.add(t);
  cyl(t, 0.38, 0.38, 0.03, M({ map: tex(PAINT.marble('#f0ece4', '#b8b0a0'), 1, 1), roughness: 0.15 }), 0, 0.74, 0, 24); cyl(t, 0.03, 0.03, 0.72, M({ color: 0x1a1a1a, metalness: 0.6 }), 0, 0.37, 0, 8); cyl(t, 0.24, 0.26, 0.03, M({ color: 0x1a1a1a, metalness: 0.6 }), 0, 0.015, 0, 20);
  for (let i = 0; i < 2; i++) { const a = i * Math.PI + 0.4; chair(t, Math.cos(a) * 0.62, Math.sin(a) * 0.62, Math.atan2(-Math.cos(a), -Math.sin(a)), 0x5a3a1a); if (people && rnd() < 0.7) person(t, Math.cos(a) * 0.56, Math.sin(a) * 0.56, Math.atan2(-Math.cos(a), -Math.sin(a)), { arms: 'table', lod: 1 }); }
  cyl(t, 0.035, 0.03, 0.08, M({ color: 0xffffff, roughness: 0.3 }), 0.12, 0.79, 0.08, 10); cyl(t, 0.02, 0.02, 0.14, M({ color: 0xd8e8f0, transparent: true, opacity: 0.5, roughness: 0.05 }), -0.1, 0.81, -0.1, 10);
  return t;
}
// a pastry case: a lit glass vitrine with cakes on shelves
function vitrine(g, x, z, len, ry) {
  const v = new THREE.Group(); v.position.set(x, 0, z); v.rotation.y = ry || 0; g.add(v);
  box(v, len, 0.9, 0.7, M({ map: tex(PAINT.wood('#4a2a14', '#3a2010', 20), 2, 1), roughness: 0.4 }), 0, 0.45, 0);
  box(v, len, 0.6, 0.7, new THREE.MeshPhysicalMaterial({ color: 0xffffff, transmission: 0.9, roughness: 0.05, thickness: 0.01, transparent: true, opacity: 0.3 }), 0, 1.2, 0);
  for (let s = 0; s < 2; s++) { box(v, len - 0.1, 0.02, 0.6, M({ color: 0xf0f0f0, roughness: 0.2 }), 0, 0.92 + s * 0.28, 0); for (let i = 0; i < len / 0.3; i++) { const cx = -len / 2 + 0.2 + i * 0.3; cyl(v, 0.1, 0.1, 0.07, M({ color: pick([0x8a3a2a, 0xf0e0c0, 0x4a2a1a, 0xe8c8d0, 0xd8a040]), roughness: 0.6 }), cx, 0.97 + s * 0.28, (rnd() - 0.5) * 0.2, 14); if (rnd() < 0.5) sph(v, 0.03, M({ color: 0xd82a2a }), cx, 1.03 + s * 0.28, 0, 6); } }
  box(v, len - 0.1, 0.02, 0.05, glow(0xfff0d0, 2.5), 0, 1.49, 0.3); light(v, 0xfff0d0, 1.2, 0, 1.2, 0.2, 2.5);
  return v;
}
// a newspaper rack with papers on their holders
function paperRack(g, x, z, ry) {
  const r = new THREE.Group(); r.position.set(x, 0, z); r.rotation.y = ry || 0; g.add(r);
  const wd = M({ color: 0x3a2010, roughness: 0.5 }); box(r, 0.7, 0.04, 0.3, wd, 0, 1.2, 0); for (const s of [-1, 1]) cyl(r, 0.02, 0.025, 1.2, wd, s * 0.33, 0.6, 0, 8);
  for (let i = 0; i < 5; i++) { cyl(r, 0.012, 0.012, 0.7, M({ color: 0xc8a050, metalness: 0.8 }), -0.26 + i * 0.13, 0.84, 0, 6); plane(r, 0.09, 0.56, M({ color: pick([0xf4f0e6, 0xe8e0d0, 0xf0e8d8]), roughness: 0.9, side: THREE.DoubleSide }), -0.26 + i * 0.13, 0.86, 0.02, 0.4 + i * 0.1); }
  return r;
}
// a thatched roof on posts: a hip of palm thatch over a deck
function thatchRoof(g, x, z, w, d, h0, h1) {
  const th = M({ map: tex(canvas(256, 256, (cx, cw, ch) => { cx.fillStyle = '#9a7a4a'; cx.fillRect(0, 0, cw, ch); for (let i = 0; i < 9000; i++) { cx.fillStyle = 'rgba(' + (rnd() < 0.5 ? '40,25,10' : '220,190,130') + ',' + rnd() * 0.35 + ')'; cx.fillRect(rnd() * cw, rnd() * ch, 1.5, 4 + rnd() * 8); } for (let y = 0; y < ch; y += 32) { cx.fillStyle = 'rgba(0,0,0,.3)'; cx.fillRect(0, y, cw, 3); } }), 4, 4), roughness: 1, side: THREE.DoubleSide });
  const geo = new THREE.BufferGeometry(); const hw = w / 2 + 1.2, hd = d / 2 + 1.2, rw = w * 0.2, rd = d * 0.1;
  const v = [[-hw, h0, hd], [hw, h0, hd], [hw, h0, -hd], [-hw, h0, -hd], [-rw, h1, rd], [rw, h1, rd], [rw, h1, -rd], [-rw, h1, -rd]];
  const faces = [[0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7], [4, 5, 6, 7]]; const pos = [], uv = [];
  faces.forEach(f => { const q = f.map(i => v[i]); for (const tri of [[0, 1, 2], [0, 2, 3]]) tri.forEach(k => { pos.push(...q[k]); uv.push(q[k][0] / 3, q[k][2] / 3); }); });
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, th); m.position.set(x, 0, z); g.add(m);
  const pm = M({ color: 0xf0ebe0, roughness: 0.6 }); for (const [px, pz] of [[-w / 2, d / 2], [w / 2, d / 2], [w / 2, -d / 2], [-w / 2, -d / 2], [0, d / 2], [0, -d / 2], [-w / 2, 0], [w / 2, 0]]) { cyl(g, 0.09, 0.1, h0, pm, x + px, h0 / 2, z + pz, 12); for (const s of [-1, 1]) { const br = box(g, 0.06, 0.9, 0.06, pm, x + px + s * 0.3, h0 - 0.35, z + pz); br.rotation.z = -s * 0.8; } }
  for (const s of [-1, 1]) box(g, w + 0.2, 0.12, 0.12, pm, x, h0 - 0.06, z + s * d / 2); for (const s of [-1, 1]) box(g, 0.12, 0.12, d, pm, x + s * w / 2, h0 - 0.06, z);
  return m;
}
// a tiki torch: a bamboo pole with a flame
function torch(g, x, z) { cyl(g, 0.03, 0.035, 1.8, M({ color: 0x8a6a3a, roughness: 0.9 }), x, 0.9, z, 8); cyl(g, 0.07, 0.05, 0.2, M({ color: 0x2a2a2a, metalness: 0.5 }), x, 1.88, z, 8); const f = sph(g, 0.08, glow(0xff8a20, 4), x, 2.05, z, 8); f.scale.y = 1.8; light(g, 0xff9a30, 2.2, x, 2.1, z, 5); }
// an Adirondack chair
function adirondack(g, x, z, ry, col) { const c = new THREE.Group(); c.position.set(x, 0, z); c.rotation.y = ry || 0; g.add(c); const m = M({ color: col || 0xf0ebe0, roughness: 0.7 }); for (let i = 0; i < 5; i++) { const s = box(c, 0.1, 0.02, 0.8, m, -0.24 + i * 0.12, 0.34 + i * 0.0, 0); s.rotation.x = -0.15; const bk = box(c, 0.1, 0.9, 0.02, m, -0.24 + i * 0.12, 0.7, -0.38); bk.rotation.x = -0.35; } for (const s of [-1, 1]) { box(c, 0.16, 0.03, 0.9, m, s * 0.36, 0.58, -0.05); box(c, 0.04, 0.55, 0.04, m, s * 0.33, 0.28, 0.32); box(c, 0.04, 0.4, 0.04, m, s * 0.33, 0.2, -0.3); } return c; }
// a mezzanine edge: a gallery floor with its balustrade, round a tall room
function gallery(g, x0, z0, x1, z1, y, depth, floorMat, railStyle, railCol) {
  const dx = x1 - x0, dz = z1 - z0, len = Math.hypot(dx, dz), ry = Math.atan2(dx, dz) + Math.PI / 2;
  const m = new THREE.Group(); m.position.set((x0 + x1) / 2, y, (z0 + z1) / 2); m.rotation.y = ry; g.add(m);
  box(m, len, 0.3, depth, floorMat, 0, -0.15, depth / 2); box(m, len, 0.08, 0.1, M({ color: 0xc8a050, metalness: 0.9, roughness: 0.3 }), 0, -0.04, 0.05);
  railing(m, -len / 2, 0, len / 2, 0, 1.0, railStyle, railCol);
  return m;
}
// a room's shell without the assumptions: any wall can be left out (open to the outside, or to a vault above)
function shell(g, o) {
  const w = o.w, d = o.d, h = o.h, Zc = 2 - d / 2, B = 2 - d, flat = [];
  const wm = (c, rx, ry) => M({ map: tex(c, rx, ry), roughness: o.wallRough || 0.85 });
  if (o.floor) { const fl = tex(o.floor, w / 2, d / 2); flat.push(plane(g, w, d, M({ map: fl, bumpMap: fl, bumpScale: 0.6, roughness: o.floorRough || 0.75 }), 0, 0, Zc, 0, -Math.PI / 2)); }
  if (o.back !== false) flat.push(plane(g, w, h, wm(o.wall, w / 2.4, h / 2.4), 0, h / 2, B));
  if (o.front !== false) flat.push(plane(g, w, h, wm(o.side || o.wall, w / 2.4, h / 2.4), 0, h / 2, 2, Math.PI));
  if (o.left !== false) flat.push(plane(g, d, h, wm(o.side || o.wall, d / 2.4, h / 2.4), -w / 2, h / 2, Zc, Math.PI / 2));
  if (o.right !== false) flat.push(plane(g, d, h, wm(o.side || o.wall, d / 2.4, h / 2.4), w / 2, h / 2, Zc, -Math.PI / 2));
  if (o.ceil) flat.push(plane(g, w, d, M({ map: tex(o.ceil, w / 2, d / 2), roughness: 0.9 }), 0, h, Zc, 0, Math.PI / 2));
  if (o.trim) { const tm = M({ color: o.trim, roughness: 0.5 }); if (o.back !== false) box(g, w, 0.12, 0.03, tm, 0, 0.06, B + 0.015); if (o.left !== false) box(g, 0.03, 0.12, d, tm, -w / 2 + 0.015, 0.06, Zc); if (o.right !== false) box(g, 0.03, 0.12, d, tm, w / 2 - 0.015, 0.06, Zc); }
  if (o.cornice) { const cm = M({ color: o.cornice, roughness: 0.6 }); if (o.back !== false) box(g, w, 0.1, 0.1, cm, 0, h - 0.05, B + 0.05); if (o.left !== false) box(g, 0.1, 0.1, d, cm, -w / 2 + 0.05, h - 0.05, Zc); if (o.right !== false) box(g, 0.1, 0.1, d, cm, w / 2 - 0.05, h - 0.05, Zc); }
  flat.forEach(m => { m.userData.flat = 1; });
  if (o.fill !== false) light(g, o.fillC || 0xfff0dc, o.fillI || 1.4, 0, Math.min(h, 6) - 0.3, Zc + 0.5, Math.max(w, d) * 1.2);
  return { w, d, h, back: B, Zc };
}
// a wall with a round top (the end of a barrel vault)
function tympanum(g, w, h, r, mat, x, z, ry) { const t = new THREE.Group(); t.position.set(x, 0, z); t.rotation.y = ry || 0; g.add(t); plane(t, w, h, mat, 0, h / 2, 0); const c = new THREE.Mesh(new THREE.CircleGeometry(r, 48, 0, Math.PI), mat); c.position.set(0, h, 0); t.add(c); c.userData.flat = 1; return t; }
// Biloxi after dark from the beach: the Gulf, shrimp boats with their rigging lit, the lighthouse, a pier
VIEW.biloxi = (o) => canvas(2048, 512, (x, w, h) => {
  SKY.grad(x, w, h, [[0, '#070a24'], [0.45, '#1c2050'], [0.58, '#5a3a5a'], [0.61, '#0e2a40'], [1, '#04101c']]); SKY.stars(x, w, h, 200, 0.5); SKY.moon(x, w * 0.68, h * 0.16, 16);
  for (let i = 0; i < 700; i++) { x.fillStyle = 'rgba(255,230,190,' + rnd() * 0.35 + ')'; x.fillRect(rnd() * w, h * 0.62 + rnd() * h * 0.38, 8 + rnd() * 24, 1.5); }
  // the lighthouse, white and floodlit, its lamp turning
  x.fillStyle = '#f0ece0'; SKY.glow(x, '#fff0d0', 18, () => { x.beginPath(); x.moveTo(w * 0.18 - 14, h * 0.6); x.lineTo(w * 0.18 - 8, h * 0.3); x.lineTo(w * 0.18 + 8, h * 0.3); x.lineTo(w * 0.18 + 14, h * 0.6); x.fill(); }); x.fillStyle = '#1a1a1a'; x.fillRect(w * 0.18 - 10, h * 0.28, 20, 6); SKY.glow(x, '#ffffff', 30, () => { x.fillStyle = '#fff'; x.beginPath(); x.arc(w * 0.18, h * 0.25, 6, 0, 7); x.fill(); });
  // shrimp boats riding at anchor, booms out, deck lights on
  for (let i = 0; i < 6; i++) { const bx = w * 0.3 + i * w * 0.11 + rnd() * 40, by = h * (0.64 + rnd() * 0.08); x.fillStyle = '#1a1a22'; x.fillRect(bx, by, 70, 10); x.fillRect(bx + 20, by - 12, 24, 12); x.strokeStyle = '#2a2a30'; x.lineWidth = 2; x.beginPath(); x.moveTo(bx + 34, by - 12); x.lineTo(bx + 34, by - 50); x.moveTo(bx + 34, by - 40); x.lineTo(bx - 10, by - 14); x.moveTo(bx + 34, by - 40); x.lineTo(bx + 80, by - 14); x.stroke(); x.fillStyle = '#ffd890'; for (let k = 0; k < 5; k++) x.fillRect(bx + 6 + k * 13, by + 3, 4, 3); SKY.glow(x, '#ffe0a0', 8, () => { x.fillStyle = '#fff0c0'; x.beginPath(); x.arc(bx + 34, by - 50, 2.5, 0, 7); x.fill(); }); }
  // the pier running out from the right, lamps along it
  x.fillStyle = '#1a1612'; x.fillRect(w * 0.7, h * 0.62, w * 0.3, 8); for (let i = 0; i < 12; i++) { x.fillRect(w * 0.7 + i * 50, h * 0.63, 4, 30); SKY.glow(x, '#ffe0a0', 10, () => { x.fillStyle = '#ffe8b0'; x.beginPath(); x.arc(w * 0.72 + i * 50, h * 0.6, 3, 0, 7); x.fill(); }); }
  const wg = x.createLinearGradient(0, h * 0.88, 0, h); wg.addColorStop(0, 'rgba(232,216,184,0)'); wg.addColorStop(1, 'rgba(232,216,184,.7)'); x.fillStyle = wg; x.fillRect(0, h * 0.88, w, h * 0.12);
});
// downtown Reno at night, from a casino window: the Arch's neon over the street, the signs down the block
VIEW.reno = (o) => canvas(1024, 512, (x, w, h) => {
  SKY.grad(x, w, h, [[0, '#06081a'], [0.5, '#1a1636'], [0.7, '#2a2040']]); SKY.stars(x, w, h, 100, 0.4);
  for (let i = 0; i < 12; i++) SKY.bldg(x, i * 90 - 20, h * (0.3 + rnd() * 0.15), 80, h * 0.45, '#0e0c1a', ['#ffd98a', '#ff8ad8', '#8ad8ff'], 8, 0.35);
  // the signs: tall neon panels on the casinos either side
  for (const [bx, col, t] of [[60, '#ff3a3a', 'HAROLDS'], [w - 220, '#3ad8ff', 'CAL NEVA'], [w * 0.3, '#ffd84d', 'EL DORADO']]) { x.fillStyle = '#1a1020'; x.fillRect(bx, h * 0.28, 160, h * 0.4); SKY.glow(x, col, 18, () => { x.fillStyle = col; x.font = '900 34px sans-serif'; x.textAlign = 'center'; x.fillText(t, bx + 80, h * 0.42); x.fillRect(bx + 8, h * 0.46, 144, 4); }); for (let k = 0; k < 20; k++) { x.fillStyle = pick([col, '#fff']); x.fillRect(bx + 10 + (k % 10) * 14, h * 0.52 + Math.floor(k / 10) * 20, 6, 10); } }
  // the Arch across the street
  x.fillStyle = '#2a2a34'; for (const s of [-1, 1]) x.fillRect(w / 2 + s * 300 - 10, h * 0.3, 20, h * 0.5); x.fillRect(w / 2 - 310, h * 0.3, 620, 40);
  SKY.glow(x, '#ff5a2a', 24, () => { x.fillStyle = '#ff6a3a'; x.font = '900 48px sans-serif'; x.textAlign = 'center'; x.fillText('RENO', w / 2, h * 0.3 + 32); }); x.fillStyle = '#1a1a24'; x.fillRect(w / 2 - 250, h * 0.3 + 40, 500, 30); SKY.glow(x, '#ffe060', 12, () => { x.fillStyle = '#ffe060'; x.font = '700 16px sans-serif'; x.fillText('THE BIGGEST LITTLE CITY IN THE WORLD', w / 2, h * 0.3 + 61); });
  for (let k = 0; k < 60; k++) { x.fillStyle = pick(['#ffd84d', '#ff5a8a', '#5ad8ff', '#fff']); x.fillRect(w / 2 - 300 + k * 10, h * 0.3 + 2, 4, 4); x.fillRect(w / 2 - 300 + k * 10, h * 0.3 + 34, 4, 4); }
  // the street below: taillights, a crowd on the sidewalk
  x.fillStyle = '#141018'; x.fillRect(0, h * 0.8, w, h * 0.2); for (let i = 0; i < 60; i++) { x.fillStyle = rnd() < 0.5 ? '#ff2a2a' : '#fff0c0'; x.fillRect(rnd() * w, h * 0.82 + rnd() * h * 0.15, 4, 2); } x.fillStyle = '#0a0a10'; for (let i = 0; i < 40; i++) x.fillRect(rnd() * w, h * 0.74, 6, 18);
});
// Atlantic City from the Boardwalk: the boards and the rail, the beach, Steel Pier's wheel lit, the ocean, the strollers
VIEW.atlantic = (o) => canvas(2048, 512, (x, w, h) => {
  SKY.grad(x, w, h, [[0, '#06081c'], [0.4, '#1a1a44'], [0.52, '#4a2a5a'], [0.55, '#0c1e34'], [0.72, '#06101e']]); SKY.stars(x, w, h, 150, 0.4); SKY.moon(x, w * 0.3, h * 0.14, 16);
  for (let i = 0; i < 500; i++) { x.fillStyle = 'rgba(255,230,200,' + rnd() * 0.3 + ')'; x.fillRect(rnd() * w, h * 0.56 + rnd() * h * 0.16, 8 + rnd() * 24, 1.5); }
  // Steel Pier: the wheel, lit, and the rides along the pier
  x.fillStyle = '#1a1620'; x.fillRect(w * 0.6, h * 0.55, w * 0.4, 10); for (let i = 0; i < 16; i++) x.fillRect(w * 0.6 + i * 50, h * 0.56, 4, 20);
  x.strokeStyle = 'rgba(255,120,200,.9)'; x.lineWidth = 4; SKY.glow(x, '#ff6ab0', 16, () => { x.beginPath(); x.arc(w * 0.82, h * 0.34, 90, 0, 7); x.stroke(); x.lineWidth = 1.5; for (let k = 0; k < 20; k++) { x.beginPath(); x.moveTo(w * 0.82, h * 0.34); x.lineTo(w * 0.82 + Math.cos(k / 20 * 6.283) * 90, h * 0.34 + Math.sin(k / 20 * 6.283) * 90); x.stroke(); } });
  for (let k = 0; k < 20; k++) { x.fillStyle = pick(['#ffd84d', '#5ad8ff', '#fff']); x.beginPath(); x.arc(w * 0.82 + Math.cos(k / 20 * 6.283) * 90, h * 0.34 + Math.sin(k / 20 * 6.283) * 90, 4, 0, 7); x.fill(); }
  x.fillStyle = '#2a2a34'; x.beginPath(); x.moveTo(w * 0.82 - 40, h * 0.55); x.lineTo(w * 0.82, h * 0.34); x.lineTo(w * 0.82 + 40, h * 0.55); x.fill();
  for (let i = 0; i < 6; i++) { const rx = w * 0.62 + i * 60; x.fillStyle = pick(['#ff3a6a', '#3ad8ff', '#ffd84d']); SKY.glow(x, x.fillStyle, 10, () => x.fillRect(rx, h * 0.44 + (i % 2) * 20, 30, h * 0.11 - (i % 2) * 20)); }
  // the beach, pale, then the Boardwalk's rail and the boards, lamps along it, people strolling
  const bg = x.createLinearGradient(0, h * 0.72, 0, h * 0.8); bg.addColorStop(0, '#2a2820'); bg.addColorStop(1, '#4a4638'); x.fillStyle = bg; x.fillRect(0, h * 0.72, w, h * 0.08);
  x.fillStyle = '#3a2a1a'; x.fillRect(0, h * 0.8, w, h * 0.2); for (let i = 0; i < w; i += 14) { x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(i, h * 0.8, 2, h * 0.2); } for (let j = 0; j < 6; j++) { x.fillStyle = 'rgba(255,220,170,.08)'; x.fillRect(0, h * 0.8 + j * 16, w, 2); }
  x.fillStyle = '#1a1612'; x.fillRect(0, h * 0.77, w, 4); for (let i = 0; i < w; i += 40) x.fillRect(i, h * 0.77, 3, 12);
  for (let i = 0; i < 20; i++) { const lx = i * 108 + 30; x.fillStyle = '#1a1a1e'; x.fillRect(lx - 2, h * 0.5, 4, h * 0.3); SKY.glow(x, '#ffe0a0', 14, () => { x.fillStyle = '#fff0c8'; x.beginPath(); x.arc(lx, h * 0.49, 7, 0, 7); x.fill(); }); }
  for (let i = 0; i < 26; i++) { const px = rnd() * w, py = h * (0.84 + rnd() * 0.1), s = 0.6 + rnd() * 0.5; x.fillStyle = pick(['#0a0a10', '#14101a', '#1a1414']); x.fillRect(px - 4 * s, py - 30 * s, 8 * s, 30 * s); x.beginPath(); x.arc(px, py - 34 * s, 5 * s, 0, 7); x.fill(); }
});
// Chicago from the river: the Willis Tower's twin antennas, the Hancock's black X-braced slab, the river bridges and their lights
VIEW.chicago = (o) => canvas(1024, 512, (x, w, h) => {
  SKY.grad(x, w, h, [[0, '#06081c'], [0.45, '#1a1c44'], [0.62, '#3a2a4a']]); SKY.stars(x, w, h, 120, 0.4);
  const base = h * 0.7;
  for (let i = 0; i < 40; i++) SKY.bldg(x, rnd() * w, base - 80 - rnd() * 140, 22 + rnd() * 40, 100 + rnd() * 200, '#0c0e20', ['#ffd98a', '#fff3d6', '#9ad4ff'], 7, 0.42);
  // the Willis Tower: stepped black tubes, two white antennas; the Hancock: a tapered black slab with its X braces and antennas
  const wx = w * 0.3; x.fillStyle = '#0a0a14'; x.fillRect(wx - 44, base - 300, 88, 300); x.fillRect(wx - 30, base - 360, 60, 60); x.fillRect(wx - 16, base - 420, 32, 60); x.fillStyle = '#ffd890'; for (let r = 0; r < 40; r++) for (let c = 0; c < 8; c++) if (rnd() < 0.5 && (r > 12 || Math.abs(c - 3.5) < (r > 6 ? 2.5 : 1.5))) x.fillRect(wx - 40 + c * 11, base - 410 + r * 10, 5, 5); x.fillStyle = '#f0f0f0'; x.fillRect(wx - 12, base - 500, 3, 80); x.fillRect(wx + 9, base - 500, 3, 80); SKY.glow(x, '#ff3a3a', 10, () => { x.fillStyle = '#ff3a3a'; x.fillRect(wx - 13, base - 504, 5, 5); x.fillRect(wx + 8, base - 504, 5, 5); });
  const hx = w * 0.72; x.fillStyle = '#0a0a12'; x.beginPath(); x.moveTo(hx - 50, base); x.lineTo(hx - 30, base - 380); x.lineTo(hx + 30, base - 380); x.lineTo(hx + 50, base); x.fill(); x.strokeStyle = 'rgba(200,200,220,.5)'; x.lineWidth = 2; for (let k = 0; k < 5; k++) { const y0 = base - k * 76, y1 = base - (k + 1) * 76; x.beginPath(); x.moveTo(hx - 48 + k * 4, y0); x.lineTo(hx + 48 - (k + 1) * 4, y1); x.moveTo(hx + 48 - k * 4, y0); x.lineTo(hx - 48 + (k + 1) * 4, y1); x.stroke(); } x.fillStyle = '#ffd890'; for (let r = 0; r < 36; r++) for (let c = 0; c < 7; c++) if (rnd() < 0.45) x.fillRect(hx - 36 + c * 11 + r * 0.3, base - 370 + r * 10, 4, 5); x.fillStyle = '#f0f0f0'; x.fillRect(hx - 18, base - 440, 3, 60); x.fillRect(hx + 15, base - 440, 3, 60);
  // the river and its bascule bridges with the lamps, the Riverwalk, a tour boat
  x.fillStyle = '#1a1a22'; x.fillRect(0, base - 6, w, 12); for (let i = 0; i < 2; i++) { const bx = i ? w * 0.55 : w * 0.1; x.fillStyle = '#2a2a34'; x.fillRect(bx, base - 44, 18, 44); x.fillRect(bx + 160, base - 44, 18, 44); x.fillStyle = '#3a3a44'; x.fillRect(bx, base - 10, 180, 8); for (let k = 0; k < 8; k++) SKY.glow(x, '#ffe0a0', 8, () => { x.fillStyle = '#ffe8b0'; x.beginPath(); x.arc(bx + 10 + k * 22, base - 14, 2.5, 0, 7); x.fill(); }); }
  SKY.water(x, w, h, base + 6, '#0e1a26', '#03060c', '255,210,150', 500); x.fillStyle = '#e8e8f0'; x.fillRect(w * 0.4, base + 50, 120, 10); x.fillStyle = '#ffd890'; for (let k = 0; k < 10; k++) x.fillRect(w * 0.4 + 6 + k * 12, base + 53, 5, 4);
});
// an elevated train going by outside a window: the trestle and a lit car
function elTrain(g, x, y, z, len, ry) {
  const t = new THREE.Group(); t.position.set(x, y, z); t.rotation.y = ry || 0; g.add(t);
  const steel = M({ color: 0x2a2a30, metalness: 0.7, roughness: 0.5 });
  box(t, len, 0.3, 2.4, steel, 0, -0.15, 0); for (let i = 0; i < len / 4; i++) for (const s of [-1, 1]) { box(t, 0.2, y, 0.2, steel, -len / 2 + 2 + i * 4, -y / 2 - 0.3, s * 1.0); } box(t, len, 0.08, 0.08, steel, 0, 0.04, 0.6); box(t, len, 0.08, 0.08, steel, 0, 0.04, -0.6);
  const car = new THREE.Group(); car.position.set(0, 1.5, 0); t.add(car); rbox(car, len * 0.6, 2.6, 2.4, 0.2, M({ color: 0xd8d8e0, metalness: 0.5, roughness: 0.4 }), 0, 0, 0); box(car, len * 0.6 + 0.02, 0.6, 2.42, M({ color: 0x1a4a8a, roughness: 0.5 }), 0, -0.9, 0);
  for (let i = 0; i < len * 0.6 / 1.2; i++) for (const s of [-1, 1]) plane(car, 0.9, 0.9, glow(0xffe8b0, 1.6), -len * 0.3 + 0.7 + i * 1.2, 0.35, s * 1.21, s > 0 ? 0 : Math.PI);
  light(t, 0xffe8b0, 1.2, 0, 2.0, 0, 8); return t;
}
// the northern lights over black pines and a frozen lake
VIEW.aurora = (o) => canvas(1024, 512, (x, w, h) => {
  SKY.grad(x, w, h, [[0, '#04061a'], [0.6, '#0a1430'], [0.75, '#0e1a2a']]); SKY.stars(x, w, h, 260, 0.6);
  for (let b = 0; b < 3; b++) { for (let i = 0; i < 90; i++) { const px = i / 90 * w, py = h * (0.18 + b * 0.1) + Math.sin(px / 140 + b) * 40 + Math.sin(px / 37) * 10; const gg = x.createLinearGradient(0, py, 0, py + 140 + b * 30); gg.addColorStop(0, 'rgba(60,255,160,0)'); gg.addColorStop(0.35, b === 1 ? 'rgba(120,80,255,.35)' : 'rgba(60,255,160,.38)'); gg.addColorStop(1, 'rgba(60,255,160,0)'); x.fillStyle = gg; x.fillRect(px, py, w / 90 + 2, 140 + b * 30); } }
  x.fillStyle = '#0a1a24'; x.beginPath(); x.moveTo(0, h); x.lineTo(0, h * 0.62); for (let px = 0; px <= w; px += 30) x.lineTo(px, h * 0.6 + Math.sin(px / 200) * 14); x.lineTo(w, h); x.fill();
  for (let i = 0; i < 70; i++) { const px = rnd() * w, py = h * (0.6 + Math.sin(px / 200) * 0.03) + 10, s = 16 + rnd() * 40; x.fillStyle = '#030806'; x.beginPath(); x.moveTo(px, py - s * 2.4); x.lineTo(px - s * 0.5, py); x.lineTo(px + s * 0.5, py); x.fill(); }
  const ig = x.createLinearGradient(0, h * 0.68, 0, h); ig.addColorStop(0, '#1a2a38'); ig.addColorStop(1, '#0a1218'); x.fillStyle = ig; x.fillRect(0, h * 0.68, w, h * 0.32); x.fillStyle = 'rgba(80,255,170,.12)'; for (let i = 0; i < 60; i++) x.fillRect(rnd() * w, h * 0.7 + rnd() * h * 0.28, 20 + rnd() * 60, 2); x.fillStyle = 'rgba(255,255,255,.5)'; for (let i = 0; i < 300; i++) x.fillRect(rnd() * w, h * 0.68 + rnd() * h * 0.32, 2, 1);
  x.fillStyle = '#2a1a10'; x.fillRect(w * 0.2, h * 0.72, 60, 30); x.fillStyle = '#ffd890'; x.fillRect(w * 0.2 + 20, h * 0.78, 10, 10);
});
// Minneapolis from a skyway: the IDS tower and the glass Capella, snow coming down, the lit skyway bridges below
VIEW.minneapolis = (o) => canvas(1024, 512, (x, w, h) => {
  SKY.grad(x, w, h, [[0, '#101428'], [0.5, '#2a2e4a'], [0.7, '#4a4a6a']]);
  for (let i = 0; i < 30; i++) SKY.bldg(x, rnd() * w, h * 0.7 - 80 - rnd() * 120, 30 + rnd() * 50, 80 + rnd() * 160, '#141828', ['#ffe0a8', '#d8e8ff', '#fff'], 8, 0.4);
  // the IDS: a tall glass block with its cut corners, lit in rows; Capella's curved glass spire, the Foshay's obelisk
  x.fillStyle = '#1a2240'; x.fillRect(w * 0.44, h * 0.08, 90, h * 0.62); x.fillStyle = '#8ab0e0'; for (let r = 0; r < 44; r++) x.fillRect(w * 0.44 + 4, h * 0.1 + r * 7, 82, 2);
  x.fillStyle = '#1a2a40'; x.beginPath(); x.moveTo(w * 0.62, h * 0.7); x.lineTo(w * 0.62, h * 0.2); x.quadraticCurveTo(w * 0.66, h * 0.1, w * 0.7, h * 0.14); x.lineTo(w * 0.7, h * 0.7); x.fill(); x.fillStyle = '#a8d0ff'; for (let r = 0; r < 30; r++) x.fillRect(w * 0.625, h * 0.22 + r * 8, 74, 2);
  x.fillStyle = '#5a5a60'; x.beginPath(); x.moveTo(w * 0.3 - 16, h * 0.7); x.lineTo(w * 0.3 - 8, h * 0.28); x.lineTo(w * 0.3 + 8, h * 0.28); x.lineTo(w * 0.3 + 16, h * 0.7); x.fill(); SKY.glow(x, '#ff3a3a', 10, () => { x.fillStyle = '#ff3a3a'; x.fillRect(w * 0.3 - 3, h * 0.26, 6, 4); });
  // the skyways across the street below, lit, people in them; the street with its lamps; snow everywhere
  for (const y of [h * 0.78, h * 0.86]) { x.fillStyle = '#2a3040'; x.fillRect(w * 0.1, y, w * 0.5, 24); x.fillStyle = '#ffe8c0'; x.fillRect(w * 0.1 + 4, y + 4, w * 0.5 - 8, 14); x.fillStyle = '#1a1a20'; for (let k = 0; k < 8; k++) x.fillRect(w * 0.12 + k * 60 + rnd() * 20, y + 6, 5, 12); }
  for (let i = 0; i < 800; i++) { x.fillStyle = 'rgba(255,255,255,' + (0.3 + rnd() * 0.6) + ')'; x.beginPath(); x.arc(rnd() * w, rnd() * h, 0.8 + rnd() * 2.2, 0, 7); x.fill(); }
});
// Palm Springs at dusk: the San Jacinto wall going violet, the wind farm's turbines on the pass with their red lights, palms
VIEW.palmsprings = (o) => canvas(1024, 512, (x, w, h) => {
  SKY.grad(x, w, h, [[0, '#1c1440'], [0.4, '#7a3a6a'], [0.56, '#ff9a4a'], [0.62, '#ffc070']]); SKY.stars(x, w, h, 80, 0.3);
  x.fillStyle = '#2a1a3a'; x.beginPath(); x.moveTo(0, h * 0.7); x.lineTo(0, h * 0.36); x.lineTo(w * 0.15, h * 0.26); x.lineTo(w * 0.3, h * 0.3); x.lineTo(w * 0.42, h * 0.2); x.lineTo(w * 0.55, h * 0.34); x.lineTo(w * 0.7, h * 0.44); x.lineTo(w, h * 0.5); x.lineTo(w, h * 0.7); x.fill();
  x.fillStyle = '#3a2a4a'; x.beginPath(); x.moveTo(0, h * 0.7); x.lineTo(0, h * 0.5); for (let px = 0; px <= w; px += 40) x.lineTo(px, h * 0.52 + Math.sin(px / 150) * 20); x.lineTo(w, h * 0.7); x.fill();
  for (let i = 0; i < 14; i++) { const tx = w * 0.6 + i * 30 + (i % 3) * 8, ty = h * 0.56 + Math.sin(tx / 150) * 20, s = 0.6 + (i % 4) * 0.15; x.fillStyle = '#e8e8f0'; x.fillRect(tx - 1.5 * s, ty - 40 * s, 3 * s, 40 * s); for (let k = 0; k < 3; k++) { x.save(); x.translate(tx, ty - 40 * s); x.rotate(k * 2.094 + i * 0.4); x.fillRect(-1.5 * s, -22 * s, 3 * s, 22 * s); x.restore(); } x.fillStyle = '#ff3a3a'; x.fillRect(tx - 1.5, ty - 42 * s, 3, 3); }
  x.fillStyle = '#5a4a40'; x.fillRect(0, h * 0.7, w, h * 0.3); for (let i = 0; i < 200; i++) { x.fillStyle = pick(['#ffd98a', '#fff0cc']); x.fillRect(rnd() * w, h * 0.72 + rnd() * h * 0.26, 3, 2); }
  for (const [px, s] of [[w * 0.06, 1.2], [w * 0.14, 0.9], [w * 0.86, 1.1], [w * 0.95, 1.3], [w * 0.5, 0.7]]) SKY.palm(x, px, h * 0.8, s, '#120a10');
});
// a canoe to hang from the rafters
function canoe(g, x, y, z, ry) {
  const c = new THREE.Group(); c.position.set(x, y, z); c.rotation.y = ry || 0; g.add(c);
  const hull = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), M({ map: tex(PAINT.wood('#c8a060', '#a88040', 12), 2, 1), roughness: 0.6, side: THREE.DoubleSide })); hull.scale.set(2.4, 0.42, 0.42); c.add(hull);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1, 0.03, 6, 40), M({ color: 0x5a3a1a, roughness: 0.6 })); rim.rotation.x = Math.PI / 2; rim.scale.set(2.4, 0.42, 1); c.add(rim);
  for (let i = -2; i <= 2; i++) box(c, 0.04, 0.03, 0.8 * Math.sqrt(1 - (i / 2.6) ** 2), M({ color: 0x5a3a1a }), i * 0.9, 0, 0);
  for (const s of [-1, 1]) cyl(c, 0.008, 0.008, 2.0, M({ color: 0x3a2a1a }), s * 1.4, 1.0, 0, 4);
  return c;
}
// an agave: a rosette of stiff grey-green blades
function agave(g, x, z, s) { const p = new THREE.Group(); p.position.set(x, 0, z); p.scale.setScalar(s || 1); g.add(p); for (let i = 0; i < 18; i++) { const a = i / 18 * 6.283, t = (i % 3) * 0.25; const bl = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.9, 4), M({ color: pick([0x7a9a8a, 0x6a8a7a, 0x8aaa9a]), roughness: 0.7 })); bl.position.set(Math.cos(a) * 0.12, 0.4, Math.sin(a) * 0.12); bl.rotation.set(Math.sin(a) * (0.5 + t), 0, -Math.cos(a) * (0.5 + t)); p.add(bl); } return p; }
// a round fire hearth under a copper hood, open all round
function hearth(g, x, z) {
  const h = new THREE.Group(); h.position.set(x, 0, z); g.add(h);
  cyl(h, 1.1, 1.2, 0.5, M({ map: tex(PAINT.brick('#7a7068', '#3a3430'), 3, 1), roughness: 0.9 }), 0, 0.25, 0, 24); cyl(h, 0.9, 0.9, 0.08, M({ color: 0x0a0806 }), 0, 0.54, 0, 24);
  for (let i = 0; i < 3; i++) { const lg = cyl(h, 0.07, 0.07, 0.8, M({ color: 0x3a2414, roughness: 0.9 }), 0, 0.62 + i * 0.06, 0, 10); lg.rotation.z = Math.PI / 2; lg.rotation.y = i * 1.0; }
  const fl = sph(h, 0.3, glow(0xff8a20, 3), 0, 0.85, 0, 10); fl.scale.y = 1.6; light(h, 0xff8a30, 4, 0, 1.0, 0, 7);
  const hood = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 1.3, 1.2, 28, 1, true), M({ color: 0xb87333, metalness: 0.9, roughness: 0.35, side: THREE.DoubleSide })); hood.position.y = 2.2; h.add(hood); cyl(h, 0.3, 0.3, 3.0, M({ color: 0xb87333, metalness: 0.9, roughness: 0.35 }), 0, 4.3, 0, 20);
  return h;
}
// a glass skyway crossing outside a window, people walking through it
function skyway(g, x, y, z, len, ry) {
  const s = new THREE.Group(); s.position.set(x, y, z); s.rotation.y = ry || 0; g.add(s);
  box(s, len, 0.4, 3.0, M({ color: 0x3a3a44, metalness: 0.6, roughness: 0.4 }), 0, -0.2, 0); box(s, len, 0.3, 3.0, M({ color: 0x3a3a44, metalness: 0.6, roughness: 0.4 }), 0, 2.9, 0);
  for (const t of [-1, 1]) plane(s, len, 2.6, M({ color: 0xa8c8e0, metalness: 0.3, roughness: 0.05, transparent: true, opacity: 0.25 }), 0, 1.4, t * 1.5, t > 0 ? 0 : Math.PI);
  for (let i = 0; i < len / 3; i++) for (const t of [-1, 1]) box(s, 0.08, 2.8, 0.08, M({ color: 0x2a2a30, metalness: 0.6 }), -len / 2 + 1.5 + i * 3, 1.4, t * 1.5);
  plane(s, len - 0.2, 2.8, glow(0xfff0d8, 1.2), 0, 1.4, 0, 0, Math.PI / 2).position.y = 2.72;
  if (STAGE !== 'final') for (let i = 0; i < len / 4; i++) stander(s, -len / 2 + 2 + i * 4 + rnd() * 2, (rnd() - 0.5) * 1.4, Math.PI / 2 * (rnd() < 0.5 ? 1 : -1), { lod: 1 });
  light(s, 0xfff0d8, 1.4, 0, 2.2, 0, 8); return s;
}
// Ocean Drive from above: the Deco hotels in neon, the palms along Lummus Park, the beach and the Atlantic
VIEW.oceandrive = (o) => canvas(2048, 512, (x, w, h) => {
  SKY.grad(x, w, h, [[0, '#1a0a3a'], [0.4, '#6a2a8a'], [0.52, '#ff6ab0'], [0.56, '#ffb070'], [0.58, '#0e2a44'], [1, '#04101c']]); SKY.stars(x, w, h, 80, 0.3);
  for (let i = 0; i < 500; i++) { x.fillStyle = 'rgba(255,200,220,' + rnd() * 0.3 + ')'; x.fillRect(rnd() * w, h * 0.58 + rnd() * h * 0.12, 8 + rnd() * 24, 1.5); }
  const bg = x.createLinearGradient(0, h * 0.7, 0, h * 0.78); bg.addColorStop(0, '#3a3028'); bg.addColorStop(1, '#6a5a44'); x.fillStyle = bg; x.fillRect(0, h * 0.7, w, h * 0.08);
  x.fillStyle = '#0a1a0a'; x.fillRect(0, h * 0.78, w, h * 0.05); for (let i = 0; i < 30; i++) SKY.palm(x, i * 70 + rnd() * 30, h * 0.84, 0.8 + rnd() * 0.5, '#06100a');
  x.fillStyle = '#1a1418'; x.fillRect(0, h * 0.84, w, h * 0.16); for (let i = 0; i < 80; i++) { x.fillStyle = rnd() < 0.5 ? '#ff2a2a' : '#fff0c0'; x.fillRect(rnd() * w, h * 0.87 + rnd() * h * 0.1, 5, 3); }
  // the hotels: pastel Deco fronts, neon names, eyebrows and fins, each lit its own colour
  const names = [['COLONY', '#3ad8ff'], ['BREAKWATER', '#ff6ab0'], ['AVALON', '#ffd84d'], ['CARLYLE', '#3aff8a'], ['CAVALIER', '#ff8a3a'], ['LESLIE', '#ffd84d'], ['CARDOZO', '#3ad8ff'], ['STARLITE', '#ff6ab0']];
  for (let i = 0; i < 8; i++) { const bx = i * 256 + 10, bw = 236, bh = h * (0.3 + (i % 3) * 0.06), by = h * 0.98 - bh, col = names[i][1]; x.fillStyle = pick(['#f4e8dc', '#e8f0ec', '#f8e0e8', '#fff4d8']); x.fillRect(bx, by, bw, bh); x.fillStyle = 'rgba(0,0,0,.12)'; for (let k = 0; k < 4; k++) x.fillRect(bx, by + 30 + k * 36, bw, 6); x.fillStyle = col; x.fillRect(bx + bw / 2 - 6, by - 20, 12, bh + 20); SKY.glow(x, col, 22, () => { x.fillStyle = col; x.font = '900 26px sans-serif'; x.textAlign = 'center'; x.save(); x.translate(bx + bw / 2 - 30, by + 40); x.rotate(-Math.PI / 2); x.fillText(names[i][0], -60, 0); x.restore(); x.fillRect(bx + 10, by + 8, bw - 20, 4); }); x.fillStyle = '#ffe8c0'; for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) if (rnd() < 0.6) x.fillRect(bx + 20 + c * 44, by + 40 + r * 36, 16, 20); x.fillStyle = 'rgba(255,255,255,.5)'; x.fillRect(bx + 4, by + bh - 40, bw - 8, 36); }
});
// Elliott Bay in the rain: the Great Wheel lit, the Space Needle, a ferry crossing with its lights, the Olympics behind
VIEW.seattle = (o) => canvas(1024, 512, (x, w, h) => {
  SKY.grad(x, w, h, [[0, '#0c1020'], [0.5, '#24304a'], [0.62, '#3a4a5a']]);
  x.fillStyle = '#1c2838'; x.beginPath(); x.moveTo(0, h * 0.64); for (let px = 0; px <= w; px += 40) x.lineTo(px, h * 0.5 + Math.sin(px / 170) * 24 + Math.sin(px / 53) * 8); x.lineTo(w, h * 0.64); x.fill();
  for (let i = 0; i < 20; i++) SKY.bldg(x, w * 0.55 + rnd() * w * 0.45, h * 0.64 - 60 - rnd() * 100, 24 + rnd() * 40, 70 + rnd() * 130, '#0e1424', ['#ffe0a8', '#d8e8ff'], 7, 0.4);
  // the Space Needle on its hill to the right
  const nx = w * 0.8; x.fillStyle = '#d8e8ff'; x.beginPath(); x.moveTo(nx - 22, h * 0.64); x.lineTo(nx - 4, h * 0.28); x.lineTo(nx + 4, h * 0.28); x.lineTo(nx + 22, h * 0.64); x.fill(); x.fillStyle = '#1a2030'; x.fillRect(nx - 10, h * 0.4, 20, h * 0.24); SKY.glow(x, '#ffe6b0', 16, () => { x.fillStyle = '#ffe6b0'; x.beginPath(); x.ellipse(nx, h * 0.28, 50, 12, 0, 0, 7); x.fill(); }); x.fillStyle = '#d8e8ff'; x.beginPath(); x.ellipse(nx, h * 0.25, 42, 8, 0, 0, 7); x.fill(); x.fillRect(nx - 2, h * 0.14, 4, h * 0.11); SKY.glow(x, '#ff3a3a', 10, () => { x.fillStyle = '#ff3a3a'; x.fillRect(nx - 3, h * 0.13, 6, 4); });
  // the Great Wheel on its pier, lit; the ferry crossing, lit stem to stern; the bay
  x.fillStyle = '#1a1a22'; x.fillRect(0, h * 0.64, w * 0.3, 8); x.strokeStyle = 'rgba(120,200,255,.9)'; x.lineWidth = 4; SKY.glow(x, '#8ad0ff', 14, () => { x.beginPath(); x.arc(w * 0.16, h * 0.46, 76, 0, 7); x.stroke(); x.lineWidth = 1.5; for (let k = 0; k < 20; k++) { x.beginPath(); x.moveTo(w * 0.16, h * 0.46); x.lineTo(w * 0.16 + Math.cos(k / 20 * 6.283) * 76, h * 0.46 + Math.sin(k / 20 * 6.283) * 76); x.stroke(); } }); x.fillStyle = '#e8f0ff'; for (let k = 0; k < 20; k++) { x.beginPath(); x.arc(w * 0.16 + Math.cos(k / 20 * 6.283) * 76, h * 0.46 + Math.sin(k / 20 * 6.283) * 76, 4, 0, 7); x.fill(); } x.fillStyle = '#4a4a5a'; x.beginPath(); x.moveTo(w * 0.16 - 40, h * 0.64); x.lineTo(w * 0.16, h * 0.46); x.lineTo(w * 0.16 + 40, h * 0.64); x.fill();
  SKY.water(x, w, h, h * 0.65, '#101a28', '#04080e', '220,230,255', 400);
  x.fillStyle = '#e8ecf4'; x.fillRect(w * 0.45, h * 0.74, 200, 16); x.fillRect(w * 0.47, h * 0.7, 160, 6); x.fillStyle = '#2a5a3a'; x.fillRect(w * 0.45, h * 0.77, 200, 4); x.fillStyle = '#ffe0a0'; for (let k = 0; k < 16; k++) { x.fillRect(w * 0.45 + 8 + k * 12, h * 0.745, 6, 4); x.fillRect(w * 0.47 + 10 + k * 9, h * 0.71, 4, 3); } x.fillStyle = 'rgba(255,224,160,.25)'; x.fillRect(w * 0.45, h * 0.79, 200, 30);
  for (let i = 0; i < 400; i++) { x.strokeStyle = 'rgba(200,220,255,' + rnd() * 0.25 + ')'; x.lineWidth = 1; x.beginPath(); const rx = rnd() * w, ry = rnd() * h; x.moveTo(rx, ry); x.lineTo(rx - 3, ry + 14 + rnd() * 10); x.stroke(); }
});
// Seoul across the Han: the Lotte Tower's spike, N Seoul Tower on Namsan, the bridges, the rainbow fountain off Banpo Bridge
VIEW.seoul = (o) => canvas(1024, 512, (x, w, h) => {
  SKY.grad(x, w, h, [[0, '#06081a'], [0.5, '#1a1440'], [0.64, '#3a1a4a']]); SKY.stars(x, w, h, 100, 0.4);
  x.fillStyle = '#121428'; x.beginPath(); x.moveTo(0, h * 0.66); x.lineTo(w * 0.1, h * 0.5); x.lineTo(w * 0.3, h * 0.42); x.lineTo(w * 0.5, h * 0.52); x.lineTo(w * 0.7, h * 0.48); x.lineTo(w, h * 0.56); x.lineTo(w, h * 0.66); x.fill();
  for (let i = 0; i < 44; i++) SKY.bldg(x, rnd() * w, h * 0.66 - 40 - rnd() * 90, 18 + rnd() * 30, 50 + rnd() * 110, '#0e1024', ['#ffd98a', '#9ad4ff', '#ff8ad8', '#fff'], 6, 0.45);
  // the Lotte World Tower: a tall tapering spike of glass, lit in lines; N Seoul Tower on its hill with the ring of light
  x.fillStyle = '#1a2240'; x.beginPath(); x.moveTo(w * 0.72 - 30, h * 0.66); x.lineTo(w * 0.72 - 8, h * 0.06); x.lineTo(w * 0.72 + 8, h * 0.06); x.lineTo(w * 0.72 + 30, h * 0.66); x.fill(); x.fillStyle = 'rgba(180,210,255,.7)'; for (let k = 0; k < 50; k++) { const t = k / 50; x.fillRect(w * 0.72 - 28 + t * 20, h * 0.65 - t * h * 0.58, 56 - t * 40, 1.5); } SKY.glow(x, '#ffffff', 12, () => { x.fillStyle = '#fff'; x.fillRect(w * 0.72 - 2, h * 0.05, 4, 4); });
  const sx = w * 0.3; x.fillStyle = '#2a2a3a'; x.fillRect(sx - 6, h * 0.2, 12, h * 0.22); SKY.glow(x, '#8ad0ff', 20, () => { x.fillStyle = '#8ad0ff'; x.beginPath(); x.ellipse(sx, h * 0.24, 24, 8, 0, 0, 7); x.fill(); x.fillRect(sx - 2, h * 0.08, 4, h * 0.14); }); x.fillStyle = '#2a2a3a'; x.beginPath(); x.ellipse(sx, h * 0.2, 16, 6, 0, 0, 7); x.fill();
  // the bridge with the fountain arcing in colour off its side, the river
  const by = h * 0.72; x.fillStyle = '#2a2a34'; x.fillRect(0, by - 8, w, 10); for (let k = 0; k < 14; k++) x.fillRect(40 + k * 70, by, 10, 30); for (let k = 0; k < 40; k++) SKY.glow(x, '#9ad4ff', 8, () => { x.fillStyle = '#d8f0ff'; x.fillRect(12 + k * 25, by - 12, 3, 3); });
  for (let k = 0; k < 60; k++) { const col = ['#ff5a8a', '#ffd84d', '#3aff8a', '#3ad8ff', '#a24aff'][k % 5]; x.strokeStyle = col; x.lineWidth = 2; SKY.glow(x, col, 10, () => { x.beginPath(); x.moveTo(40 + k * 16, by); x.quadraticCurveTo(40 + k * 16 + 10, by + 24, 40 + k * 16 + 22, by + 50); x.stroke(); }); }
  SKY.water(x, w, h, by + 2, '#0a1020', '#02040a', '255,200,220', 500); x.fillStyle = 'rgba(160,210,255,.25)'; for (let i = 0; i < 60; i++) x.fillRect(rnd() * w, by + 50 + rnd() * (h - by - 50), 10 + rnd() * 30, 2);
});
// a porthole: a round brass-rimmed window with a view
function porthole(g, view, x, y, z, r, ry) {
  const p = new THREE.Group(); p.position.set(x, y, z); p.rotation.y = ry || 0; g.add(p);
  const t = tex(view); t.repeat.set(0.25, 0.5); t.offset.set(0.4, 0.3); const m = new THREE.Mesh(new THREE.CircleGeometry(r, 32), new THREE.MeshBasicMaterial({ map: t })); p.add(m);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(r + 0.03, 0.05, 8, 40), M({ color: 0xc8a050, metalness: 0.9, roughness: 0.3 })); rim.position.z = 0.03; p.add(rim); for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283; sph(p, 0.02, M({ color: 0xc8a050, metalness: 0.9 }), Math.cos(a) * (r + 0.03), Math.sin(a) * (r + 0.03), 0.07, 6); }
  return p;
}
// rain on a window: a sheet of streaks and drops over the glass
function rainOn(g, x, y, z, w, h, ry) { const c = canvas(256, 512, (cx, cw, ch) => { cx.clearRect(0, 0, cw, ch); for (let i = 0; i < 90; i++) { cx.fillStyle = 'rgba(220,235,255,' + (0.12 + rnd() * 0.22) + ')'; const rx = rnd() * cw, ry2 = rnd() * ch; cx.beginPath(); cx.ellipse(rx, ry2, 1 + rnd() * 1.5, 3 + rnd() * 16, 0, 0, 7); cx.fill(); } }); const m = plane(g, w, h, new THREE.MeshStandardMaterial({ map: tex(c), transparent: true, roughness: 0.1, metalness: 0.3, depthWrite: false }), x, y, z, ry); return m; }
// the prairie at night: a grain elevator lit on the horizon, wheat to the edge of the world, a big sky, a farm light
VIEW.prairie = (o) => canvas(2048, 512, (x, w, h) => {
  SKY.grad(x, w, h, [[0, '#04061c'], [0.45, '#141a44'], [0.6, '#3a3a6a'], [0.66, '#6a5a6a']]); SKY.stars(x, w, h, 500, 0.6); SKY.moon(x, w * 0.75, h * 0.14, 18);
  x.fillStyle = '#1a1a2a'; x.fillRect(0, h * 0.66, w, h * 0.34);
  x.fillStyle = '#2a2a34'; x.fillRect(w * 0.3, h * 0.36, 70, h * 0.3); x.fillRect(w * 0.3 + 70, h * 0.46, 90, h * 0.2); for (let k = 0; k < 6; k++) x.fillRect(w * 0.3 + 76 + k * 14, h * 0.42, 10, h * 0.24); x.fillStyle = '#ffd890'; x.fillRect(w * 0.3 + 30, h * 0.4, 10, 12); SKY.glow(x, '#ff3a3a', 12, () => { x.fillStyle = '#ff3a3a'; x.fillRect(w * 0.3 + 32, h * 0.34, 6, 6); }); x.fillStyle = '#ffe0a0'; x.fillRect(w * 0.3 + 80, h * 0.6, 60, 4);
  const wg = x.createLinearGradient(0, h * 0.66, 0, h); wg.addColorStop(0, '#3a3220'); wg.addColorStop(1, '#6a5a30'); x.fillStyle = wg; x.fillRect(0, h * 0.68, w, h * 0.32); for (let i = 0; i < 1200; i++) { x.fillStyle = 'rgba(' + (rnd() < 0.5 ? '255,230,160' : '40,30,10') + ',' + rnd() * 0.25 + ')'; x.fillRect(rnd() * w, h * 0.68 + rnd() * h * 0.32, 2, 4 + rnd() * 8); }
  x.fillStyle = '#1a1a1e'; for (let k = 0; k < 12; k++) { const px = k * 180 + 40; x.fillRect(px, h * 0.6, 4, h * 0.08); x.fillRect(px - 20, h * 0.61, 44, 3); } x.strokeStyle = 'rgba(0,0,0,.5)'; x.lineWidth = 2; for (let k = 0; k < 11; k++) { x.beginPath(); x.moveTo(k * 180 + 40, h * 0.615); x.quadraticCurveTo(k * 180 + 130, h * 0.64, k * 180 + 220, h * 0.615); x.stroke(); }
  SKY.glow(x, '#ffe0a0', 16, () => { x.fillStyle = '#fff0c0'; x.beginPath(); x.arc(w * 0.82, h * 0.63, 4, 0, 7); x.fill(); }); x.fillStyle = '#141420'; x.fillRect(w * 0.84, h * 0.6, 60, h * 0.06); x.beginPath(); x.moveTo(w * 0.84 - 4, h * 0.6); x.lineTo(w * 0.84 + 30, h * 0.55); x.lineTo(w * 0.84 + 64, h * 0.6); x.fill();
  x.fillStyle = '#2a1a1a'; x.fillRect(w * 0.08, h * 0.63, 90, 24); x.fillRect(w * 0.08 + 10, h * 0.6, 40, 14); x.fillStyle = '#ffe8c0'; x.fillRect(w * 0.08 + 82, h * 0.66, 6, 4);
});
// a river at night from the bank: a towboat pushing barges, running lights, cottonwoods, a bridge upstream
VIEW.riverbarge = (o) => canvas(2048, 512, (x, w, h) => {
  SKY.grad(x, w, h, [[0, '#06081c'], [0.5, '#1a1a44'], [0.56, '#3a2a4a'], [0.58, '#0c1420'], [1, '#02060a']]); SKY.stars(x, w, h, 220, 0.5); SKY.moon(x, w * 0.2, h * 0.12, 18);
  x.fillStyle = '#060a08'; x.fillRect(0, h * 0.54, w, h * 0.04); for (let i = 0; i < 50; i++) { const tx = rnd() * w, r = 22 + rnd() * 40; x.fillStyle = '#05080a'; x.beginPath(); x.arc(tx, h * 0.54 - r * 0.5, r, 0, 7); x.fill(); }
  x.fillStyle = '#2a2a34'; x.fillRect(w * 0.7, h * 0.44, w * 0.3, 10); for (let k = 0; k < 4; k++) x.fillRect(w * 0.7 + k * 150, h * 0.45, 12, h * 0.14); x.strokeStyle = '#3a3a44'; x.lineWidth = 3; x.beginPath(); x.moveTo(w * 0.7, h * 0.44); x.quadraticCurveTo(w * 0.85, h * 0.2, w, h * 0.44); x.stroke(); for (let k = 0; k < 14; k++) SKY.glow(x, '#ffe0a0', 8, () => { x.fillStyle = '#ffe8b0'; x.beginPath(); x.arc(w * 0.7 + k * 44, h * 0.43, 2.5, 0, 7); x.fill(); });
  for (let i = 0; i < 700; i++) { x.fillStyle = 'rgba(255,230,190,' + rnd() * 0.3 + ')'; x.fillRect(rnd() * w, h * 0.6 + rnd() * h * 0.4, 8 + rnd() * 24, 1.5); }
  // the tow: three barges in a line, low and dark, the towboat behind with its lit pilothouse and searchlight
  const by = h * 0.72; x.fillStyle = '#1a1a1e'; for (let k = 0; k < 3; k++) x.fillRect(w * 0.3 + k * 190, by - 10, 180, 22); x.fillStyle = '#2a2a30'; for (let k = 0; k < 3; k++) x.fillRect(w * 0.3 + k * 190 + 10, by - 18, 160, 8);
  x.fillStyle = '#2a2a30'; x.fillRect(w * 0.3 + 570, by - 14, 120, 28); x.fillStyle = '#e8e8f0'; x.fillRect(w * 0.3 + 600, by - 40, 60, 26); x.fillStyle = '#ffe0a0'; for (let k = 0; k < 4; k++) x.fillRect(w * 0.3 + 606 + k * 14, by - 36, 8, 10); SKY.glow(x, '#ff3a3a', 10, () => { x.fillStyle = '#ff3a3a'; x.fillRect(w * 0.3 + 2, by - 14, 5, 5); }); SKY.glow(x, '#3aff3a', 10, () => { x.fillStyle = '#3aff6a'; x.fillRect(w * 0.3 + 683, by - 14, 5, 5); }); x.fillStyle = 'rgba(255,240,200,.18)'; x.beginPath(); x.moveTo(w * 0.3 + 620, by - 40); x.lineTo(w * 0.1, by - 150); x.lineTo(w * 0.05, by - 100); x.fill();
  x.fillStyle = 'rgba(255,224,160,.2)'; x.fillRect(w * 0.3 + 580, by + 14, 110, 30);
});
// the street below an upstairs card room: the sports bar's neon, the awning, cars at the curb, the row across the street
VIEW.street = (o) => canvas(1024, 512, (x, w, h) => {
  SKY.grad(x, w, h, [[0, '#0a0c22'], [0.3, '#1c1a40'], [0.4, '#2a2048']]); SKY.stars(x, w, h, 60, 0.25);
  for (let i = 0; i < 7; i++) { const bx = i * 150 - 20, bh = h * (0.4 + (i % 3) * 0.08); x.fillStyle = pick(['#3a2a24', '#2a2a30', '#4a3a2a']); x.fillRect(bx, h * 0.76 - bh, 146, bh); for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) { x.fillStyle = rnd() < 0.5 ? '#ffd890' : '#1a1a20'; x.fillRect(bx + 14 + c * 34, h * 0.76 - bh + 20 + r * 36, 18, 24); } x.fillStyle = '#1a1a1e'; x.fillRect(bx, h * 0.76 - bh - 8, 146, 8); }
  x.fillStyle = '#2a1a1a'; x.fillRect(w * 0.3, h * 0.6, 300, h * 0.16); x.fillStyle = '#8a1a1a'; x.fillRect(w * 0.3 - 10, h * 0.6, 320, 18); SKY.glow(x, '#3ad8ff', 18, () => { x.fillStyle = '#3ad8ff'; x.font = '900 30px sans-serif'; x.textAlign = 'center'; x.fillText('NORTHSIDE TAP', w * 0.3 + 150, h * 0.56); }); SKY.glow(x, '#ff3a6a', 14, () => { x.fillStyle = '#ff3a6a'; x.font = '700 18px sans-serif'; x.fillText('OPEN', w * 0.3 + 40, h * 0.68); }); x.fillStyle = '#ffd890'; x.fillRect(w * 0.3 + 90, h * 0.63, 180, 50);
  x.fillStyle = '#1a1a1e'; x.fillRect(0, h * 0.76, w, h * 0.24); x.fillStyle = '#3a3a40'; x.fillRect(0, h * 0.76, w, 6); for (let k = 0; k < 6; k++) { x.fillStyle = pick(['#2a2a3a', '#4a2a2a', '#2a3a4a', '#e8e8e8']); x.fillRect(k * 180 + 20, h * 0.8, 120, 36); x.fillStyle = '#ff3a3a'; x.fillRect(k * 180 + 22, h * 0.81, 8, 6); x.fillStyle = '#9ad4ff'; x.fillRect(k * 180 + 40, h * 0.78, 80, 10); }
  for (let k = 0; k < 6; k++) { x.fillStyle = '#2a2a30'; x.fillRect(k * 200 + 60, h * 0.5, 4, h * 0.26); SKY.glow(x, '#ffe0a0', 12, () => { x.fillStyle = '#fff0c8'; x.beginPath(); x.arc(k * 200 + 62, h * 0.5, 6, 0, 7); x.fill(); }); }
});
// a working harbour: trawlers rafted at the dock, masts and booms, the cannery's lights, buoys, the breakwater's beacon
VIEW.harbor = (o) => canvas(2048, 512, (x, w, h) => {
  SKY.grad(x, w, h, [[0, '#06081c'], [0.5, '#1a2040'], [0.6, '#3a3a5a'], [0.62, '#0c1a28'], [1, '#02060c']]); SKY.stars(x, w, h, 200, 0.5);
  x.fillStyle = '#1a1e2a'; x.beginPath(); x.moveTo(0, h * 0.62); for (let px = 0; px <= w; px += 60) x.lineTo(px, h * 0.5 + Math.sin(px / 220) * 20); x.lineTo(w, h * 0.62); x.fill();
  x.fillStyle = '#2a2a30'; x.fillRect(w * 0.1, h * 0.5, 160, h * 0.12); x.fillStyle = '#ffd890'; for (let k = 0; k < 6; k++) x.fillRect(w * 0.1 + 10 + k * 26, h * 0.54, 10, 12); x.fillStyle = '#e8e0c0'; x.font = '700 16px sans-serif'; x.textAlign = 'center'; x.fillText('PACIFIC SEAFOOD', w * 0.1 + 80, h * 0.52);
  SKY.glow(x, '#3aff6a', 16, () => { x.fillStyle = '#3aff6a'; x.beginPath(); x.arc(w * 0.9, h * 0.52, 4, 0, 7); x.fill(); }); x.fillStyle = '#3a3a44'; x.fillRect(w * 0.88, h * 0.54, w * 0.12, 12);
  for (let i = 0; i < 700; i++) { x.fillStyle = 'rgba(255,220,170,' + rnd() * 0.3 + ')'; x.fillRect(rnd() * w, h * 0.63 + rnd() * h * 0.37, 8 + rnd() * 24, 1.5); }
  for (let i = 0; i < 7; i++) { const bx = w * 0.2 + i * 240 + rnd() * 30, by = h * (0.66 + (i % 2) * 0.06), bl = 120 + rnd() * 60; x.fillStyle = pick(['#1a2a3a', '#2a1a1a', '#1a1a1a']); x.fillRect(bx, by, bl, 20); x.fillStyle = '#e8e8e0'; x.fillRect(bx + bl * 0.5, by - 22, bl * 0.25, 22); x.strokeStyle = '#2a2a2a'; x.lineWidth = 3; x.beginPath(); x.moveTo(bx + bl * 0.4, by); x.lineTo(bx + bl * 0.4, by - 90); x.moveTo(bx + bl * 0.4, by - 70); x.lineTo(bx + bl * 0.05, by - 20); x.moveTo(bx + bl * 0.4, by - 70); x.lineTo(bx + bl * 0.75, by - 20); x.stroke(); x.fillStyle = '#ffd890'; x.fillRect(bx + bl * 0.55, by - 16, 8, 8); SKY.glow(x, '#ffe0a0', 8, () => { x.fillStyle = '#fff0c0'; x.beginPath(); x.arc(bx + bl * 0.4, by - 90, 2.5, 0, 7); x.fill(); }); x.fillStyle = '#ff6a2a'; x.beginPath(); x.arc(bx + bl + 14, by + 10, 5, 0, 7); x.fill(); }
  x.fillStyle = '#3a3028'; x.fillRect(0, h * 0.9, w, 10); for (let k = 0; k < w / 60; k++) x.fillRect(k * 60, h * 0.9, 6, h * 0.1);
});
// a desert highway at night: the big neon horseshoe on its pole, a semi going by, the ridge, a thousand stars
VIEW.highway = (o) => canvas(2048, 512, (x, w, h) => {
  SKY.grad(x, w, h, [[0, '#04061a'], [0.5, '#1a1440'], [0.62, '#4a2a4a']]); SKY.stars(x, w, h, 600, 0.6);
  x.fillStyle = '#1a1428'; x.beginPath(); x.moveTo(0, h * 0.7); for (let px = 0; px <= w; px += 50) x.lineTo(px, h * 0.6 + Math.sin(px / 300) * 24 + Math.sin(px / 90) * 8); x.lineTo(w, h * 0.7); x.fill(); x.fillStyle = '#2a1e2a'; x.fillRect(0, h * 0.7, w, h * 0.3);
  x.fillStyle = '#3a3a3a'; x.fillRect(0, h * 0.78, w, h * 0.1); x.fillStyle = '#e8d060'; for (let k = 0; k < w / 50; k++) x.fillRect(k * 50, h * 0.83, 24, 3);
  const hx = w * 0.6; x.fillStyle = '#2a2a30'; x.fillRect(hx - 8, h * 0.3, 16, h * 0.48); SKY.glow(x, '#ff5a2a', 30, () => { x.strokeStyle = '#ff7a3a'; x.lineWidth = 14; x.beginPath(); x.arc(hx, h * 0.26, 70, Math.PI * 0.75, Math.PI * 2.25); x.stroke(); }); for (let k = 0; k < 7; k++) { x.fillStyle = '#ffe060'; x.beginPath(); x.arc(hx + Math.cos(k / 7 * 4.7 + 2.3) * 70, h * 0.26 + Math.sin(k / 7 * 4.7 + 2.3) * 70, 5, 0, 7); x.fill(); }
  SKY.glow(x, '#ffd84d', 18, () => { x.fillStyle = '#ffd84d'; x.font = '900 34px sans-serif'; x.textAlign = 'center'; x.fillText('HORSESHOE', hx, h * 0.46); x.font = '700 18px sans-serif'; x.fillText('CASINO  •  CARD ROOM', hx, h * 0.52); });
  x.fillStyle = '#1a1a22'; x.fillRect(w * 0.15, h * 0.72, 260, 50); x.fillRect(w * 0.15 + 260, h * 0.74, 70, 48); x.fillStyle = '#ffd890'; x.fillRect(w * 0.15 + 300, h * 0.76, 24, 14); x.fillStyle = '#ff3a3a'; for (let k = 0; k < 8; k++) x.fillRect(w * 0.15 + 10 + k * 32, h * 0.72, 6, 3); SKY.glow(x, '#fff', 20, () => { x.fillStyle = '#fff'; x.fillRect(w * 0.15 + 330, h * 0.8, 8, 6); });
  for (let i = 0; i < 20; i++) { const cx = rnd() * w, cy = h * 0.7 + rnd() * h * 0.06; x.fillStyle = '#0a0a10'; x.fillRect(cx - 3, cy - 20, 6, 20); x.fillRect(cx - 12, cy - 14, 8, 4); x.fillRect(cx - 12, cy - 14, 3, 8); x.fillRect(cx + 4, cy - 10, 8, 4); x.fillRect(cx + 9, cy - 14, 3, 8); }
});
// a mining town's hill at night: the headframe lit, the tailings, the old brick town below with its lamps
VIEW.headframe = (o) => canvas(1024, 512, (x, w, h) => {
  SKY.grad(x, w, h, [[0, '#06081c'], [0.5, '#1a1a40'], [0.62, '#3a2a4a']]); SKY.stars(x, w, h, 260, 0.5); SKY.moon(x, w * 0.15, h * 0.14, 16);
  x.fillStyle = '#1a1620'; x.beginPath(); x.moveTo(0, h * 0.7); x.lineTo(w * 0.2, h * 0.5); x.lineTo(w * 0.5, h * 0.34); x.lineTo(w * 0.8, h * 0.46); x.lineTo(w, h * 0.6); x.lineTo(w, h * 0.7); x.fill();
  const fx = w * 0.56, fy = h * 0.38; x.strokeStyle = '#3a3a44'; x.lineWidth = 6; x.beginPath(); x.moveTo(fx - 40, fy); x.lineTo(fx - 12, fy - 120); x.lineTo(fx + 12, fy - 120); x.lineTo(fx + 40, fy); x.moveTo(fx - 30, fy - 40); x.lineTo(fx + 30, fy - 40); x.moveTo(fx - 20, fy - 80); x.lineTo(fx + 20, fy - 80); x.moveTo(fx + 12, fy - 120); x.lineTo(fx + 90, fy - 20); x.stroke(); x.fillStyle = '#3a3a44'; x.beginPath(); x.arc(fx, fy - 124, 14, 0, 7); x.fill(); x.fillStyle = '#2a2a30'; x.fillRect(fx + 60, fy - 40, 80, 40); x.fillStyle = '#ffd890'; x.fillRect(fx + 70, fy - 30, 12, 14); x.fillRect(fx + 100, fy - 30, 12, 14); SKY.glow(x, '#ff3a3a', 10, () => { x.fillStyle = '#ff3a3a'; x.fillRect(fx - 3, fy - 140, 6, 5); }); SKY.glow(x, '#ffe0a0', 14, () => { x.fillStyle = '#fff0c0'; x.fillRect(fx - 30, fy - 46, 60, 3); });
  x.fillStyle = '#2a2420'; x.beginPath(); x.moveTo(fx - 120, fy + 60); x.lineTo(fx, fy + 10); x.lineTo(fx + 150, fy + 60); x.fill();
  for (let i = 0; i < 24; i++) { const bx = i * 44, bh = 30 + rnd() * 30, by = h * 0.7 - bh + (i % 3) * 6; x.fillStyle = pick(['#4a2a1a', '#3a2418', '#5a3020']); x.fillRect(bx, by, 40, bh); x.fillStyle = '#2a1a10'; x.fillRect(bx - 2, by - 6, 44, 6); for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) if (rnd() < 0.55) { x.fillStyle = '#ffd890'; x.fillRect(bx + 8 + c * 16, by + 8 + r * 14, 8, 10); } } x.fillStyle = '#1a1414'; x.fillRect(0, h * 0.7, w, h * 0.3); for (let k = 0; k < 10; k++) SKY.glow(x, '#ffd0a0', 10, () => { x.fillStyle = '#ffe0b0'; x.beginPath(); x.arc(k * 110 + 30, h * 0.68, 3, 0, 7); x.fill(); });
});
// a lake at sunset: the sun going down behind the far shore, sails, a dock, the water on fire
VIEW.lakesunset = (o) => canvas(2048, 512, (x, w, h) => {
  SKY.grad(x, w, h, [[0, '#2a1a5a'], [0.3, '#8a3a6a'], [0.5, '#ff7a3a'], [0.58, '#ffc060'], [0.6, '#5a3a4a'], [0.62, '#8a4a3a'], [1, '#2a1a30']]);
  SKY.glow(x, '#ffe080', 80, () => { x.fillStyle = '#fff0b0'; x.beginPath(); x.arc(w * 0.55, h * 0.59, 34, Math.PI, 0); x.fill(); });
  x.fillStyle = '#2a1a30'; x.beginPath(); x.moveTo(0, h * 0.62); for (let px = 0; px <= w; px += 60) x.lineTo(px, h * 0.56 + Math.sin(px / 260) * 14 + Math.sin(px / 70) * 4); x.lineTo(w, h * 0.62); x.fill(); for (let i = 0; i < 120; i++) { const tx = rnd() * w, py = h * 0.57 + Math.sin(tx / 260) * 14, s = 10 + rnd() * 18; x.fillStyle = '#1a1020'; x.beginPath(); x.moveTo(tx, py - s * 2); x.lineTo(tx - s * 0.45, py + 4); x.lineTo(tx + s * 0.45, py + 4); x.fill(); }
  for (let i = 0; i < 900; i++) { const yy = h * 0.62 + rnd() * h * 0.38; x.fillStyle = 'rgba(255,' + (160 + rnd() * 80 | 0) + ',80,' + rnd() * 0.5 + ')'; x.fillRect(rnd() * w, yy, 8 + rnd() * 30, 1.5 + (yy - h * 0.62) / 90); } x.fillStyle = 'rgba(255,230,140,.5)'; for (let i = 0; i < 60; i++) x.fillRect(w * 0.55 - 40 + rnd() * 80, h * 0.62 + rnd() * h * 0.36, 20 + rnd() * 40, 2);
  for (const [sx, s] of [[w * 0.3, 1], [w * 0.72, 0.7], [w * 0.8, 1.2]]) { x.fillStyle = '#1a1020'; x.beginPath(); x.moveTo(sx, h * 0.7); x.lineTo(sx, h * 0.7 - 60 * s); x.lineTo(sx + 26 * s, h * 0.7); x.fill(); x.fillRect(sx - 14 * s, h * 0.7, 44 * s, 5 * s); }
  x.fillStyle = '#1a1210'; x.fillRect(0, h * 0.82, w * 0.22, 8); for (let k = 0; k < 6; k++) x.fillRect(k * 70, h * 0.82, 5, 30); for (let k = 0; k < 3; k++) SKY.glow(x, '#ffe0a0', 10, () => { x.fillStyle = '#fff0c0'; x.beginPath(); x.arc(k * 140 + 20, h * 0.8, 3, 0, 7); x.fill(); });
});
// the racetrack under lights: the home stretch, the tote board, the grandstand, a field of horses on the turn
VIEW.racetrack = (o) => canvas(2048, 512, (x, w, h) => {
  SKY.grad(x, w, h, [[0, '#04061a'], [0.5, '#141840'], [0.6, '#2a2a4a']]); SKY.stars(x, w, h, 200, 0.5);
  x.fillStyle = '#2a2a34'; x.fillRect(w * 0.55, h * 0.36, w * 0.45, h * 0.24); x.fillStyle = '#1a1a22'; x.fillRect(w * 0.55, h * 0.36, w * 0.45, 12); for (let r = 0; r < 3; r++) for (let c = 0; c < 30; c++) { x.fillStyle = rnd() < 0.7 ? '#ffd890' : '#2a2a30'; x.fillRect(w * 0.55 + 10 + c * 30, h * 0.4 + r * 28, 20, 18); } for (let k = 0; k < 40; k++) { x.fillStyle = '#0a0a10'; x.fillRect(w * 0.55 + 8 + k * 23, h * 0.4 + 60, 8, 20); }
  for (const lx of [w * 0.1, w * 0.3, w * 0.5, w * 0.75, w * 0.95]) { x.fillStyle = '#2a2a30'; x.fillRect(lx - 3, h * 0.2, 6, h * 0.5); SKY.glow(x, '#f0f4ff', 40, () => { x.fillStyle = '#ffffff'; x.fillRect(lx - 30, h * 0.18, 60, 10); }); }
  x.fillStyle = '#0a0a12'; x.fillRect(w * 0.06, h * 0.3, 260, h * 0.3); for (let r = 0; r < 8; r++) { x.fillStyle = '#ffd84d'; x.font = '700 14px monospace'; x.textAlign = 'left'; x.fillText((r + 1) + '   ' + (3 + (r * 7) % 20) + '-1   ' + (10 + (r * 13) % 40) + '.' + (r * 3) % 10 + '0', w * 0.06 + 14, h * 0.33 + r * 16); } x.fillStyle = '#ff3a3a'; x.font = '900 18px sans-serif'; x.fillText('RACE 9   OFF 9:42', w * 0.06 + 14, h * 0.3 - 4);
  x.fillStyle = '#2a4a2a'; x.fillRect(0, h * 0.6, w, h * 0.1); x.fillStyle = '#7a5a3a'; x.fillRect(0, h * 0.7, w, h * 0.3); x.fillStyle = '#f4f4f4'; x.fillRect(0, h * 0.7, w, 4); for (let k = 0; k < w / 30; k++) x.fillRect(k * 30, h * 0.7, 3, 16); x.fillStyle = 'rgba(255,255,255,.12)'; for (let i = 0; i < 300; i++) x.fillRect(rnd() * w, h * 0.72 + rnd() * h * 0.26, 30, 1);
  for (let i = 0; i < 6; i++) { const hx = w * 0.3 + i * 90 + rnd() * 30, hy = h * 0.8 + (i % 2) * 10, s = 1 + (i % 2) * 0.1; x.fillStyle = pick(['#3a2414', '#5a3a1a', '#1a1a1a', '#6a4a2a']); x.fillRect(hx, hy - 30 * s, 70 * s, 28 * s); x.fillRect(hx + 60 * s, hy - 46 * s, 14 * s, 30 * s); for (let k = 0; k < 4; k++) x.fillRect(hx + 6 * s + k * 18 * s, hy - 4 * s, 6 * s, 26 * s); x.fillStyle = pick(['#ff3a3a', '#3ad8ff', '#ffd84d', '#3aff8a', '#ff8ad8', '#ffffff']); x.fillRect(hx + 20 * s, hy - 56 * s, 22 * s, 26 * s); x.fillStyle = '#f4e8d8'; x.beginPath(); x.arc(hx + 31 * s, hy - 60 * s, 7 * s, 0, 7); x.fill(); }
});
// a fishing trawler tied up at a dock, the bow right by the window
function trawler(g, x, z, ry) {
  // sits in the water (hull bottom at the waterline, -1.4), the deck a little below a pier-level floor
  const t = new THREE.Group(); t.position.set(x, -0.7, z); t.rotation.y = ry || 0; g.add(t);
  const hull = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 10, 0, Math.PI * 2, 0, Math.PI * 0.6), M({ color: 0x1a3a5a, roughness: 0.6, side: THREE.DoubleSide })); hull.scale.set(5.5, 1.6, 1.8); hull.rotation.x = Math.PI; hull.position.y = 0.9; t.add(hull);
  box(t, 9, 0.12, 3.2, M({ map: tex(PAINT.planks('#8a7a5a', '#6a5a40'), 6, 2), roughness: 0.8 }), 0, 0.95, 0); box(t, 9.2, 0.5, 0.1, M({ color: 0x1a3a5a, roughness: 0.6 }), 0, 1.2, 1.6); box(t, 9.2, 0.5, 0.1, M({ color: 0x1a3a5a, roughness: 0.6 }), 0, 1.2, -1.6);
  // the wheelhouse: cream above a dark band, a dark roof with a radar bar, a stack behind, the windows one strip
  const dk = M({ color: 0x1e2228, roughness: 0.6 });
  rbox(t, 2.4, 1.8, 2.6, 0.1, M({ color: 0xf0ece0, roughness: 0.5 }), 1.8, 1.9, 0); box(t, 2.44, 0.42, 2.64, M({ color: 0x1a3a5a, roughness: 0.6 }), 1.8, 1.22, 0); box(t, 2.7, 0.1, 2.9, dk, 1.8, 2.84, 0);
  box(t, 0.06, 0.7, 2.5, dk, 3.0, 2.15, 0); for (let k = -1; k <= 1; k++) plane(t, 0.64, 0.46, glow(0xffe8b0, 1.0), 3.04, 2.15, k * 0.78, Math.PI / 2);
  cyl(t, 0.03, 0.03, 0.5, dk, 1.8, 3.1, 0, 6); const rad = box(t, 0.9, 0.06, 0.12, M({ color: 0xd0d0d0 }), 1.8, 3.36, 0); rad.rotation.y = 0.6; cyl(t, 0.14, 0.18, 1.2, M({ color: 0x8a2a1a, roughness: 0.6 }), 0.3, 2.9, -0.6, 10); cyl(t, 0.15, 0.15, 0.1, dk, 0.3, 3.5, -0.6, 10);
  cyl(t, 0.08, 0.1, 7, M({ color: 0x3a2a1a }), -1.0, 4.4, 0, 8); const boom = cyl(t, 0.05, 0.06, 5, M({ color: 0x3a2a1a }), -3.0, 5.0, 0, 8); boom.rotation.z = 1.1; sph(t, 0.08, glow(0xfff0c0, 3), -1.0, 8.0, 0, 8); light(t, 0xfff0c0, 1.2, -1.0, 7.8, 0, 8);
  for (let i = 0; i < 6; i++) sph(t, 0.18, M({ color: pick([0xff6a2a, 0xffd84d, 0xf0f0f0]), roughness: 0.6 }), -4.2 + i * 1.5, 1.05, 1.72, 10);
  const net = new THREE.Mesh(new THREE.SphereGeometry(1.0, 10, 8), M({ color: 0x2a5a4a, roughness: 0.9, wireframe: true })); net.scale.set(1.4, 0.6, 1.0); net.position.set(-2.4, 1.4, -0.4); t.add(net);
  return t;
}
// plain glass: a pane you see the world through (the scene outside must be built)
function glassWall(g, x, y, z, w, h, ry) { return plane(g, w, h, M({ color: 0x9ab0c8, metalness: 1, roughness: 0.22, transparent: true, opacity: 0.07, envMapIntensity: 1.5 }), x, y, z, ry); }
// Omaha from the convention centre: the Bob Kerrey bridge's S-curve lit over the Missouri, the First National tower
VIEW.omaha = (o) => canvas(2048, 512, (x, w, h) => {
  SKY.grad(x, w, h, [[0, '#06081c'], [0.5, '#1a1c44'], [0.6, '#3a2a4a'], [0.62, '#0c1424'], [1, '#03060c']]); SKY.stars(x, w, h, 200, 0.5);
  for (let i = 0; i < 26; i++) SKY.bldg(x, w * 0.5 + rnd() * w * 0.5, h * 0.62 - 40 - rnd() * 80, 24 + rnd() * 40, 50 + rnd() * 100, '#0e1024', ['#ffd98a', '#fff3d6'], 7, 0.4);
  x.fillStyle = '#1a2440'; x.fillRect(w * 0.72, h * 0.14, 70, h * 0.48); x.fillStyle = '#ffe0a8'; for (let r = 0; r < 28; r++) for (let c = 0; c < 5; c++) if (rnd() < 0.5) x.fillRect(w * 0.72 + 6 + c * 13, h * 0.16 + r * 8, 6, 4); x.fillStyle = '#d8d8e0'; x.fillRect(w * 0.72 + 33, h * 0.06, 4, h * 0.08);
  x.fillStyle = '#2a2a34'; x.fillRect(w * 0.62, h * 0.3, 40, h * 0.32); x.fillStyle = '#ffd890'; for (let r = 0; r < 14; r++) x.fillRect(w * 0.62 + 6, h * 0.32 + r * 11, 28, 4);
  for (let i = 0; i < 600; i++) { x.fillStyle = 'rgba(255,220,170,' + rnd() * 0.3 + ')'; x.fillRect(rnd() * w, h * 0.63 + rnd() * h * 0.37, 8 + rnd() * 24, 1.5); }
  x.strokeStyle = 'rgba(120,200,255,.95)'; x.lineWidth = 5; SKY.glow(x, '#8ad0ff', 18, () => { x.beginPath(); x.moveTo(0, h * 0.62); x.bezierCurveTo(w * 0.15, h * 0.52, w * 0.25, h * 0.72, w * 0.4, h * 0.6); x.quadraticCurveTo(w * 0.5, h * 0.52, w * 0.58, h * 0.6); x.stroke(); }); for (const px of [w * 0.18, w * 0.42]) { x.fillStyle = '#d8e0f0'; x.fillRect(px - 5, h * 0.3, 10, h * 0.32); SKY.glow(x, '#8ad0ff', 10, () => { x.strokeStyle = 'rgba(200,230,255,.8)'; x.lineWidth = 1.5; for (let k = 0; k < 8; k++) { x.beginPath(); x.moveTo(px, h * 0.32); x.lineTo(px - 120 + k * 36, h * 0.6); x.stroke(); } }); }
  x.fillStyle = 'rgba(120,200,255,.3)'; for (let i = 0; i < 50; i++) x.fillRect(rnd() * w * 0.6, h * 0.64 + rnd() * h * 0.3, 10 + rnd() * 40, 2);
});
// Toronto from a ballroom window: the CN Tower lit, the Rogers Centre dome, the bank towers, the lake
VIEW.toronto = (o) => canvas(1024, 512, (x, w, h) => {
  SKY.grad(x, w, h, [[0, '#06081c'], [0.5, '#1a1c44'], [0.66, '#3a2a4a']]); SKY.stars(x, w, h, 120, 0.4);
  for (let i = 0; i < 30; i++) SKY.bldg(x, rnd() * w, h * 0.7 - 80 - rnd() * 140, 26 + rnd() * 44, 90 + rnd() * 180, '#0e1024', ['#ffd98a', '#fff3d6', '#9ad4ff'], 7, 0.45);
  x.fillStyle = '#1a1a2a'; x.fillRect(w * 0.55, h * 0.7 - 230, 44, 230); x.fillStyle = '#c8a050'; for (let r = 0; r < 26; r++) x.fillRect(w * 0.55 + 4, h * 0.7 - 224 + r * 8.5, 36, 2);
  const cx = w * 0.32; x.fillStyle = '#d8dce8'; x.beginPath(); x.moveTo(cx - 16, h * 0.7); x.lineTo(cx - 6, h * 0.22); x.lineTo(cx + 6, h * 0.22); x.lineTo(cx + 16, h * 0.7); x.fill(); SKY.glow(x, '#ff6ab0', 22, () => { x.fillStyle = '#ff8ac0'; x.fillRect(cx - 7, h * 0.3, 14, h * 0.4); }); x.fillStyle = '#e8ecf4'; x.beginPath(); x.ellipse(cx, h * 0.34, 40, 16, 0, 0, 7); x.fill(); x.fillStyle = '#1a1a2a'; x.fillRect(cx - 40, h * 0.33, 80, 8); x.fillStyle = '#e8ecf4'; x.beginPath(); x.ellipse(cx, h * 0.26, 16, 7, 0, 0, 7); x.fill(); x.fillRect(cx - 2, h * 0.06, 4, h * 0.16); SKY.glow(x, '#ff3a3a', 10, () => { x.fillStyle = '#ff3a3a'; x.fillRect(cx - 3, h * 0.05, 6, 4); });
  x.fillStyle = '#e8e8f0'; x.beginPath(); x.ellipse(cx + 90, h * 0.7, 90, 36, 0, Math.PI, 0); x.fill(); x.fillStyle = '#d8d8e0'; x.fillRect(cx, h * 0.68, 180, 10);
  SKY.water(x, w, h, h * 0.76, '#101a30', '#04060c', '255,210,150', 400); x.fillStyle = '#1a1a22'; x.fillRect(0, h * 0.72, w, 10); for (let k = 0; k < 24; k++) SKY.glow(x, '#ffe0a0', 8, () => { x.fillStyle = '#ffe8b0'; x.beginPath(); x.arc(k * 44 + 20, h * 0.71, 2.5, 0, 7); x.fill(); });
});
// Philadelphia from a clerestory: City Hall's tower with Penn on top, the Comcast towers, Liberty Place's spire, the Ben Franklin Bridge lit blue
VIEW.philly = (o) => canvas(2048, 512, (x, w, h) => {
  SKY.grad(x, w, h, [[0, '#06081c'], [0.5, '#1a1c44'], [0.7, '#4a2a3a']]); SKY.stars(x, w, h, 200, 0.5);
  for (let i = 0; i < 40; i++) SKY.bldg(x, rnd() * w, h * 0.78 - 60 - rnd() * 120, 24 + rnd() * 50, 70 + rnd() * 160, '#0e0e22', ['#ffd98a', '#fff3d6'], 7, 0.42);
  x.fillStyle = '#1c2440'; x.fillRect(w * 0.6, h * 0.1, 56, h * 0.68); x.fillRect(w * 0.6 + 70, h * 0.2, 44, h * 0.58); x.fillStyle = '#c8d8ff'; for (let r = 0; r < 60; r++) { x.fillRect(w * 0.6 + 4, h * 0.12 + r * 5.5, 48, 1.5); if (r < 50) x.fillRect(w * 0.6 + 74, h * 0.22 + r * 5.5, 36, 1.5); }
  x.fillStyle = '#1a2a40'; x.beginPath(); x.moveTo(w * 0.42 - 30, h * 0.78); x.lineTo(w * 0.42 - 30, h * 0.3); x.lineTo(w * 0.42, h * 0.14); x.lineTo(w * 0.42 + 30, h * 0.3); x.lineTo(w * 0.42 + 30, h * 0.78); x.fill(); x.fillStyle = '#9ad4ff'; for (let r = 0; r < 40; r++) x.fillRect(w * 0.42 - 26, h * 0.32 + r * 5.5, 52, 1.5); SKY.glow(x, '#fff', 10, () => { x.fillStyle = '#fff'; x.fillRect(w * 0.42 - 1, h * 0.08, 2, h * 0.06); });
  const ch = w * 0.25; x.fillStyle = '#b8a888'; SKY.glow(x, '#ffe8c0', 20, () => { x.fillRect(ch - 30, h * 0.36, 60, h * 0.42); x.fillRect(ch - 16, h * 0.22, 32, h * 0.14); }); x.fillStyle = '#6a6a6a'; x.fillRect(ch - 10, h * 0.16, 20, h * 0.06); x.fillStyle = '#c8b090'; x.fillRect(ch - 4, h * 0.08, 8, h * 0.08); x.beginPath(); x.arc(ch, h * 0.08, 5, 0, 7); x.fill(); x.fillStyle = '#2a2a2a'; x.beginPath(); x.arc(ch, h * 0.3, 10, 0, 7); x.fill(); x.fillStyle = '#fff4c8'; x.beginPath(); x.arc(ch, h * 0.3, 8, 0, 7); x.fill(); x.fillStyle = '#ffd890'; for (let r = 0; r < 6; r++) for (let c = 0; c < 3; c++) x.fillRect(ch - 22 + c * 18, h * 0.4 + r * 30, 8, 14);
  x.strokeStyle = 'rgba(80,140,255,.95)'; x.lineWidth = 5; SKY.glow(x, '#3a8aff', 18, () => { x.beginPath(); x.moveTo(w * 0.75, h * 0.6); x.quadraticCurveTo(w * 0.87, h * 0.3, w, h * 0.6); x.stroke(); x.beginPath(); x.moveTo(w * 0.75, h * 0.62); x.lineTo(w, h * 0.62); x.stroke(); }); x.fillStyle = '#2a2a34'; x.fillRect(w * 0.8, h * 0.4, 14, h * 0.38); x.fillRect(w * 0.94, h * 0.4, 14, h * 0.38);
  x.fillStyle = '#0a0a12'; x.fillRect(0, h * 0.78, w, h * 0.22); for (let i = 0; i < 100; i++) { x.fillStyle = pick(['#ffd98a', '#ff2a2a', '#fff0c0']); x.fillRect(rnd() * w, h * 0.8 + rnd() * h * 0.18, 3, 2); }
});
// Los Angeles at dusk past a tent's open side: palms against the orange, the hills with their lights, the Hollywood sign far off
VIEW.la = (o) => canvas(2048, 512, (x, w, h) => {
  SKY.grad(x, w, h, [[0, '#1c1440'], [0.4, '#6a3a6a'], [0.56, '#ff8a4a'], [0.64, '#ffc070']]); SKY.stars(x, w, h, 60, 0.3);
  x.fillStyle = '#2a1a3a'; x.beginPath(); x.moveTo(0, h * 0.7); for (let px = 0; px <= w; px += 50) x.lineTo(px, h * 0.52 + Math.sin(px / 400) * 30 + Math.sin(px / 110) * 8); x.lineTo(w, h * 0.7); x.fill(); for (let i = 0; i < 300; i++) { x.fillStyle = 'rgba(255,220,160,' + (0.3 + rnd() * 0.5) + ')'; x.fillRect(rnd() * w, h * 0.55 + rnd() * h * 0.14, 2, 2); }
  SKY.glow(x, '#fff', 8, () => { x.fillStyle = '#f0f0f0'; x.font = '900 22px sans-serif'; x.textAlign = 'center'; x.fillText('HOLLYWOOD', w * 0.78, h * 0.5); });
  x.fillStyle = '#1a1420'; x.fillRect(0, h * 0.7, w, h * 0.3); for (let i = 0; i < 40; i++) SKY.palm(x, rnd() * w, h * 0.74, 1.0 + rnd() * 0.8, '#0a0810');
  for (let i = 0; i < 160; i++) { x.fillStyle = rnd() < 0.5 ? '#ff2a2a' : '#fff0c0'; x.fillRect(rnd() * w, h * 0.78 + rnd() * h * 0.2, 4, 2); }
});
// ── Land out past the glass: real hills, peaks and mesas, forests on them, lit by the moon ────────────────────────
// a heightfield: the ground as a mesh, painted by its own height and slope, so the renderer lights it like land
function landscape(g, o) {
  const w = o.w || 120, d = o.d || 90, seg = o.seg || 96, cx = o.x || 0, cz = o.z || -60, kind = o.kind || 'alpine', S = o.scale || 1;
  const ph = []; for (let i = 0; i < 12; i++) ph.push(rnd() * 6.283);
  const n2 = (x, y, f) => (Math.sin(x * f + ph[0]) * Math.cos(y * f * 0.8 + ph[1]) + Math.sin((x + y) * f * 1.7 + ph[2]) * 0.5 + Math.cos((x - y * 0.6) * f * 2.9 + ph[3]) * 0.25) / 1.75;
  const far = (ly) => Math.max(0, Math.min(1, (ly / d + 0.5 - (o.near || 0.18)) / (1 - (o.near || 0.18))));
  const hf = (lx, ly) => {
    const v = far(ly), rim = Math.min(1, Math.max(0, (0.5 - Math.abs(lx / w)) * 6));
    if (kind === 'alpine') { const ridge = 1 - Math.abs(n2(lx, ly, 0.045)); return S * (Math.pow(v, 1.3) * 26 * (0.55 + 0.45 * ridge) + Math.max(0, n2(lx, ly, 0.13)) * 4 * v + Math.abs(n2(lx, ly, 0.4)) * 0.6 * v) * rim; }
    if (kind === 'mesa') { const n = n2(lx, ly, 0.05), b = Math.max(0, n - 0.1) * 6; const crag = Math.min(1, b) * (1 - Math.min(1, b)) * 4 * Math.abs(n2(lx, ly, 0.35)) + Math.min(1, b) * Math.abs(n2(lx, ly, 0.22)) * 1.6; const mesa = Math.min(1, b) * 14 * (0.5 + v * 0.7) + crag; const ground = Math.max(0, n2(lx, ly, 0.2)) * 1.2 + Math.abs(n2(lx, ly, 0.5)) * 0.3; return S * (Math.max(mesa, 0) + ground + v * 6) * rim; }
    if (kind === 'hills') return S * (Math.pow(v, 1.4) * 9 * (0.6 + 0.4 * n2(lx, ly, 0.06)) + Math.abs(n2(lx, ly, 0.2)) * 1.5 * v) * rim;
    return S * Math.pow(v, 1.5) * 18 * (0.6 + 0.4 * n2(lx, ly, 0.05)) * rim;   // a long wall of mountains
  };
  const geo = new THREE.PlaneGeometry(w, d, seg, seg), pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setZ(i, hf(pos.getX(i), pos.getY(i)));
  geo.computeVertexNormals();
  const snow = o.snow == null ? (kind === 'alpine' ? 11 * S : 1e9) : o.snow, tree = o.treeline == null ? 9 * S : o.treeline;
  const paint = canvas(1024, 1024, (x, cw, ch) => {
    const img = x.createImageData(cw, ch), px = img.data, e = 0.8;
    for (let py = 0; py < ch; py++) for (let qx = 0; qx < cw; qx++) {
      const lx = (qx / (cw - 1) - 0.5) * w, ly = (0.5 - py / (ch - 1)) * d, h = hf(lx, ly);
      const sl = Math.min(1, (Math.abs(hf(lx + e, ly) - hf(lx - e, ly)) + Math.abs(hf(lx, ly + e) - hf(lx, ly - e))) / (4 * e) * 1.2);
      let r, gg, b;
      if (kind === 'mesa') { const band = Math.floor(h / 1.1) % 3, t = 0.5 + band * 0.11 + Math.sin(h * 4.1) * 0.07 + (Math.abs(h / 1.1 - Math.round(h / 1.1)) < 0.08 ? -0.18 : 0); if (h < 1.2) { r = 150 + Math.sin(lx * 0.3) * 10; gg = 110; b = 80; if (sl < 0.2 && rnd() < 0.08) { r = 60; gg = 80; b = 50; } } else { r = 190 * t + 20; gg = 80 * t + 10; b = 55 * t; if (sl < 0.25 && h > 3) { r *= 0.9; gg *= 0.95; } if (sl > 0.6) { r *= 0.72; gg *= 0.68; b *= 0.68; } } }
      else if (kind === 'hills') { const t = sl; r = 30 + t * 50; gg = 60 + t * 30; b = 30 + t * 20; if (h < 0.3) { r = 40; gg = 70; b = 40; } }
      else { if (h > snow && sl < 0.75) { const k = 1 - sl * 0.4; r = 230 * k; gg = 236 * k; b = 250 * k; } else if (h > tree) { const k = 0.7 + sl * 0.3; r = 92 * k; gg = 86 * k; b = 84 * k; } else if (o.dust) { const k = 0.85 + sl * 0.15, p = n2(lx * 2.3, ly * 2.3, 0.9) > 0.25 && sl < 0.4; r = (p ? 226 : 112) * k; gg = (p ? 232 : 96) * k; b = (p ? 240 : 58) * k; } else { const k = 0.8 + sl * 0.2; r = 34 * k; gg = 54 * k; b = 34 * k; } }
      const i = (py * cw + qx) * 4; const dn = (rnd() - 0.5) * 14; px[i] = r + dn; px[i + 1] = gg + dn; px[i + 2] = b + dn; px[i + 3] = 255;
    }
    x.putImageData(img, 0, 0);
  });
  paint.__kind = kind === 'mesa' ? 'stucco' : 'concrete';
  const m = new THREE.Mesh(geo, M({ map: tex(paint), roughness: 0.95 })); m.rotation.x = -Math.PI / 2; m.position.set(cx, o.y == null ? -0.1 : o.y, cz); g.add(m); m.userData.flat = 1;
  return { mesh: m, hf, w, d, cx, cz, y: o.y == null ? -0.1 : o.y, snow, tree, at: (wx, wz) => hf(wx - cx, cz - wz) + (o.y == null ? -0.1 : o.y) };
}
// a forest on the land: fir trees as stacked cones, one merged mesh so the renderer takes them in one go
function forest(g, land, n, o) {
  o = o || {}; const parts = [], col = o.color || 0x183a22, dark = new THREE.Color(col), tri = (geo, tx, ty, tz, s) => { const q = geo.clone(); q.scale(s, s, s); q.translate(tx, ty, tz); parts.push(q); };
  const cone = o.round ? new THREE.SphereGeometry(1, 7, 5).toNonIndexed() : new THREE.ConeGeometry(1, 2.2, 6).toNonIndexed();
  for (let i = 0; i < n; i++) {
    const wx = land.cx + (rnd() - 0.5) * land.w * (o.spread || 0.9), wz = land.cz + (rnd() - 0.5) * land.d * (o.spread || 0.9), h = land.at(wx, wz) - land.y;
    if (h > land.tree || h < (o.low == null ? 0.05 : o.low)) continue; if (o.ok && !o.ok(wx, wz, h)) continue;
    const s = (o.size || 1) * (0.6 + rnd() * 0.7); if (o.round) { for (let k = 0; k < 4; k++) { const q = cone.clone(); const cs = s * (0.6 + rnd() * 0.5); q.scale(cs * 1.3, cs, cs * 1.3); q.translate(wx + (rnd() - 0.5) * s * 1.2, land.y + h + cs * 0.8 + rnd() * s * 0.6, wz + (rnd() - 0.5) * s * 1.2); parts.push(q); } } else for (let k = 0; k < 3; k++) tri(cone, wx, land.y + h + (0.9 + k * 0.9) * s, wz, s * (1 - k * 0.22));
  }
  if (!parts.length) return null;
  let cnt = 0; parts.forEach(p => { cnt += p.attributes.position.count; });
  const P = new Float32Array(cnt * 3), N = new Float32Array(cnt * 3); let off = 0;
  parts.forEach(p => { P.set(p.attributes.position.array, off); N.set(p.attributes.normal.array, off); off += p.attributes.position.array.length; });
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(P, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(N, 3));
  const m = new THREE.Mesh(geo, M({ color: col, roughness: 0.9 })); g.add(m); m.userData.flat = 1; return m;
}
// moonlight (or the last of the sun): one far light over the land, so the slopes have light and shadow
function moon(g, color, intensity, from, at) {
  const l = new THREE.DirectionalLight(color || 0xb8c8ff, intensity == null ? 0.6 : intensity); l.position.set(...from); at = at || [0, 0, -40];
  l.target.position.set(at[0] - from[0], at[1] - from[1], at[2] - from[2]); l.add(l.target); g.add(l); LIGHTS.push(l);   // the target rides with the light, so its place is the direction
  l.userData.dir = [at[0] - from[0], at[1] - from[1], at[2] - from[2]]; return l;
}
// a wall with a hole in it for a real window (four planes round the opening)
function wallWithHole(g, w, h, mat, z, hx, hy, hw, hh, ry) {
  const t = new THREE.Group(); t.position.set(0, 0, z); t.rotation.y = ry || 0; g.add(t); const x0 = hx - hw / 2, x1 = hx + hw / 2, y0 = hy - hh / 2, y1 = hy + hh / 2;
  const ps = []; if (x0 > -w / 2) ps.push(plane(t, x0 + w / 2, h, mat, (x0 - w / 2) / 2, h / 2, 0)); if (x1 < w / 2) ps.push(plane(t, w / 2 - x1, h, mat, (x1 + w / 2) / 2, h / 2, 0));
  if (y0 > 0) ps.push(plane(t, hw, y0, mat, hx, y0 / 2, 0)); if (y1 < h) ps.push(plane(t, hw, h - y1, mat, hx, (y1 + h) / 2, 0)); ps.forEach(p => { p.userData.flat = 1; }); return t;
}
// a night sky with stars for the dome
function starDome(g, cx, cz, r, stops, n) {
  const c = canvas(1024, 512, (x, w, h) => { const g2 = x.createLinearGradient(0, 0, 0, h); stops.forEach(([p, col]) => g2.addColorStop(p, col)); x.fillStyle = g2; x.fillRect(0, 0, w, h); for (let i = 0; i < (n || 900); i++) { x.fillStyle = 'rgba(255,255,255,' + (0.3 + rnd() * 0.7) + ')'; const s = 0.8 + rnd() * 1.6; x.fillRect(rnd() * w, rnd() * h * 0.75, s, s); } });
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 48, 24, 0, Math.PI * 2, 0, Math.PI * 0.52), unlit(c, 0.9)); m.material.side = THREE.BackSide; m.position.set(cx, -r * 0.03, cz); g.add(m); m.userData.flat = 1; return m;
}
// an aspen grove in its autumn colour: white trunks, gold and orange crowns, one mesh per colour
function aspenGrove(g, land, n, o) {
  o = o || {}; const groups = { trunk: [], gold: [], orange: [], lime: [], green: [] };
  const trunk = new THREE.CylinderGeometry(0.045, 0.085, 1, 6, 1).toNonIndexed(), crown = new THREE.SphereGeometry(1, 6, 4).toNonIndexed();
  const put = (k, geo, sx, sy, sz, tx, ty, tz) => { const q = geo.clone(); q.scale(sx, sy, sz); q.translate(tx, ty, tz); groups[k].push(q); };
  for (let i = 0; i < n; i++) {
    const wx = land.cx + (rnd() - 0.5) * land.w * (o.spread || 0.9), wz = land.cz + (rnd() - 0.5) * land.d * (o.spread || 0.9), h = land.at(wx, wz) - land.y;
    if (h > land.tree || h < (o.low == null ? 0.02 : o.low)) continue; if (o.ok && !o.ok(wx, wz, h)) continue;
    // a slender white trunk and a narrow crown of many small leaf clusters, like a real aspen, not one round blob
    const s = (o.size || 1) * (0.7 + rnd() * 0.6), th = (7 + rnd() * 3) * s, y0 = land.y + h; put('trunk', trunk, s, th, s, wx, y0 + th / 2, wz);
    const col = pick(['gold', 'gold', 'gold', 'orange', 'lime', 'green']); for (let k = 0; k < 11; k++) { const f = k / 11, cs = (0.34 + rnd() * 0.26) * s * (1 - f * 0.4), r = (0.2 + rnd() * 0.5) * s * (1 - f * 0.5), a = rnd() * Math.PI * 2; put(col, crown, cs, cs * 1.35, cs, wx + Math.cos(a) * r, y0 + th * (0.42 + f * 0.58), wz + Math.sin(a) * r); }
  }
  const cols = { trunk: 0xe8e4dc, gold: 0xe0a828, orange: 0xcc6a20, lime: 0xa8b038, green: 0x6a8a30 };
  for (const k in groups) { const parts = groups[k]; if (!parts.length) continue; let cnt = 0; parts.forEach(p => { cnt += p.attributes.position.count; }); const P = new Float32Array(cnt * 3), N = new Float32Array(cnt * 3); let off = 0; parts.forEach(p => { P.set(p.attributes.position.array, off); N.set(p.attributes.normal.array, off); off += p.attributes.position.array.length; }); const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(P, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(N, 3)); const m = new THREE.Mesh(geo, M({ color: cols[k], roughness: k === 'trunk' ? 0.7 : 0.85 })); g.add(m); m.userData.flat = 1; }
}
// END DECOR
// the room: floor, back wall, side walls, ceiling, a skirting board and a cornice. The camera sits near the front.
function room(g, o) {
  const w = o.w || 12, d = o.d || 10, h = o.h || 3.2;
  const fl = tex(o.floor, w / 2, d / 2);
  const flat = [];
  flat.push(plane(g, w, d, M({ map: fl, bumpMap: fl, bumpScale: 0.6, roughness: o.floorRough || 0.75 }), 0, 0, -d / 2 + 2, 0, -Math.PI / 2));
  const wm = M({ map: tex(o.wall, w / 2.4, h / 2.4), roughness: 0.85 }), sm = M({ map: tex(o.side || o.wall, d / 2.4, h / 2.4), roughness: 0.85 });
  if (o.back !== false) flat.push(plane(g, w, h, wm, 0, h / 2, -d + 2));
  flat.push(plane(g, w, h, M({ map: tex(o.side || o.wall, w / 2.4, h / 2.4), roughness: 0.85 }), 0, h / 2, 2, Math.PI));   // the fourth wall, behind the camera
  if (o.doorL) {   // the left wall with a doorway cut in it: [centre z, width, height]
    const [dz, dw, dh] = o.doorL, z0 = 2, z1 = -d + 2, a = dz + dw / 2, b = dz - dw / 2;
    const seg = (za, zb, y0, y1) => { const L = za - zb, H = y1 - y0; if (L <= 0 || H <= 0) return; flat.push(plane(g, L, H, M({ map: tex(o.side || o.wall, L / 2.4, H / 2.4), roughness: 0.85 }), -w / 2, (y0 + y1) / 2, (za + zb) / 2, Math.PI / 2)); };
    seg(z0, a, 0, h); seg(b, z1, 0, h); seg(a, b, dh, h);
  } else flat.push(plane(g, d, h, sm, -w / 2, h / 2, -d / 2 + 2, Math.PI / 2));
  flat.push(plane(g, d, h, sm, w / 2, h / 2, -d / 2 + 2, -Math.PI / 2));
  flat.push(plane(g, w, d, M({ map: tex(o.ceil || PAINT.plain('#2a2420'), w / 2, d / 2), roughness: 0.9 }), 0, h, -d / 2 + 2, 0, Math.PI / 2));
  if (o.wainscot) { flat.push(plane(g, w, 1.0, M({ map: tex(o.wainscot, w / 2, 0.5) }), 0, 0.5, -d + 2.01)); box(g, w, 0.05, 0.05, M({ color: 0x3a2414, roughness: 0.5 }), 0, 1.0, -d + 2.03); }
  const trim = M({ color: o.trim || 0x2a1a10, roughness: 0.5 });
  box(g, w, 0.12, 0.03, trim, 0, 0.06, -d + 2.015); if (o.doorL) { const [dz, dw] = o.doorL, a = dz + dw / 2, b = dz - dw / 2; box(g, 0.03, 0.12, 2 - a, trim, -w / 2 + 0.015, 0.06, (2 + a) / 2); box(g, 0.03, 0.12, b + d - 2, trim, -w / 2 + 0.015, 0.06, (b - d + 2) / 2); } else box(g, 0.03, 0.12, d, trim, -w / 2 + 0.015, 0.06, -d / 2 + 2); box(g, 0.03, 0.12, d, trim, w / 2 - 0.015, 0.06, -d / 2 + 2);
  const cor = M({ color: o.cornice || 0xe8e0d0, roughness: 0.6 });
  box(g, w, 0.1, 0.1, cor, 0, h - 0.05, -d + 2.05); box(g, 0.1, 0.1, d, cor, -w / 2 + 0.05, h - 0.05, -d / 2 + 2); box(g, 0.1, 0.1, d, cor, w / 2 - 0.05, h - 0.05, -d / 2 + 2);
  flat.forEach(m => { m.userData.flat = 1; });
  if (o.fill !== false) light(g, 0xfff0dc, o.fillI || 1.4, 0, h - 0.3, -d / 2 + 1.5, Math.max(w, d) * 1.2);
  return { w, d, h, back: -d + 2 };
}

// each painted surface knows what it is (wood, carpet, brick...), so the offline renderer can give it a real material
for (const k of Object.keys(PAINT)) { const f = PAINT[k]; PAINT[k] = (...a) => { const c = f(...a); c.__kind = k === 'wood' && a[2] >= 48 ? 'veneer' : k; return c; }; }

// ── The places ───────────────────────────────────────────────────────────────────────────────────────────
// each: (g) => { builds the room in group g; returns { exposure, fog, bloom } }
const SCENES = {
  // a family's kitchen: warm wood cabinets, a tiled backsplash, the sink under a curtained window, a stove and its hood,
  // the fridge covered in magnets and the kids' drawings, family photos, a clock; the poker game is on the kitchen table
  kitchen(g) {
    const r = room(g, { w: 9, d: 7, h: 2.6, floor: PAINT.wood('#a87848', '#8a5a30', 20), wall: PAINT.plain('#ddd0b0'), ceil: PAINT.plain('#f4efe6'), trim: 0xf4efe6, cornice: 0xf4efe6, fillI: 1.1, doorL: [-3.3, 0.95, 2.1] });
    const B = r.back, oak = M({ map: tex(PAINT.wood('#8a5a32', '#74482a', 64), 1, 1), roughness: 0.55 }), oakD = M({ map: tex(PAINT.wood('#74482a', '#5e3a20', 64), 1, 1), roughness: 0.5 });
    const brass = M({ color: 0xc8a050, metalness: 0.9, roughness: 0.3 }), steel = M({ color: 0xc8ccd2, metalness: 0.85, roughness: 0.28, envMapIntensity: 1 });
    const granite = M({ map: tex(canvas(256, 64, (x, w, h) => { x.fillStyle = '#3a3430'; x.fillRect(0, 0, w, h); for (let i = 0; i < 1600; i++) { x.fillStyle = pick(['#6a5a4a', '#1a1614', '#8a7a6a', '#2a2420']); x.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 2, 1 + rnd() * 2); } }), 3, 1), roughness: 0.2, envMapIntensity: 1 });
    const door = (x, y, z, w, h) => { box(g, w - 0.02, h - 0.02, 0.02, oak, x, y, z); box(g, w - 0.14, h - 0.16, 0.012, oakD, x, y, z + 0.012); sph(g, 0.014, brass, x + w / 2 - 0.08, y + (y > 1.5 ? -h / 2 + 0.08 : h / 2 - 0.1), z + 0.03, 8); };
    // lower cabinets, the counter, the sink, the stove
    const x0 = -4.5, n = 10;
    for (let i = 0; i < n; i++) { const x = x0 + 0.3 + i * 0.6; if (i === 6) continue; box(g, 0.6, 0.86, 0.58, oak, x, 0.47, B + 0.3); door(x, 0.5, B + 0.6, 0.58, 0.76); }
    box(g, n * 0.6, 0.1, 0.56, M({ color: 0x2a1a10 }), x0 + n * 0.3, 0.05, B + 0.28);
    box(g, 3.52, 0.04, 0.64, granite, -2.74, 0.92, B + 0.32); box(g, 2.0, 0.04, 0.64, granite, x0 + 4.4, 0.92, B + 0.32);
    // the sink and faucet under the window
    box(g, 0.6, 0.05, 0.4, M({ color: 0x8a8e94, metalness: 0.8, roughness: 0.3 }), -1.8, 0.905, B + 0.32);
    cyl(g, 0.014, 0.018, 0.3, steel, -1.8, 1.07, B + 0.1, 10); const arc = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.013, 8, 16, Math.PI), steel); arc.position.set(-1.8, 1.22, B + 0.19); arc.rotation.y = Math.PI / 2; g.add(arc);
    // the range: steel body, black glass top with burners, an oven door; its hood
    const sx = -0.6;
    box(g, 0.76, 0.9, 0.62, steel, sx, 0.45, B + 0.32); box(g, 0.76, 0.02, 0.62, M({ color: 0x0a0a0c, roughness: 0.1, envMapIntensity: 1.2 }), sx, 0.91, B + 0.32);
    for (const [bx, bz] of [[-0.17, -0.12], [0.17, -0.12], [-0.17, 0.14], [0.17, 0.14]]) { const ring = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.008, 6, 24), M({ color: 0x3a3a3e, roughness: 0.4 })); ring.rotation.x = Math.PI / 2; ring.position.set(sx + bx, 0.925, B + 0.32 + bz); g.add(ring); }
    box(g, 0.66, 0.42, 0.01, M({ color: 0x141418, roughness: 0.1, envMapIntensity: 1 }), sx, 0.42, B + 0.635); cyl(g, 0.012, 0.012, 0.6, steel, sx, 0.7, B + 0.66, 8).rotation.z = Math.PI / 2;
    for (let k = 0; k < 4; k++) cyl(g, 0.02, 0.02, 0.03, M({ color: 0x1a1a1a }), sx - 0.24 + k * 0.16, 0.82, B + 0.64, 10).rotation.x = Math.PI / 2;
    const hood = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.5, 0.35, 4, 1), steel); hood.rotation.y = Math.PI / 4; hood.scale.set(1.05, 1, 0.75); hood.position.set(sx, 1.72, B + 0.26); g.add(hood); box(g, 0.28, 0.7, 0.22, steel, sx, 2.25, B + 0.12);
    // the backsplash: white subway tile
    plane(g, 5.6, 0.62, M({ map: tex(canvas(256, 64, (x, w, h) => { x.fillStyle = '#b8b2a8'; x.fillRect(0, 0, w, h); for (let r2 = 0; r2 < 4; r2++) for (let c = -1; c < 9; c++) { x.fillStyle = '#f2efe8'; x.fillRect(c * 32 + (r2 % 2) * 16 + 1, r2 * 16 + 1, 30, 14); } }), 6, 1), roughness: 0.25, envMapIntensity: 0.9 }), x0 + 2.8, 1.25, B + 0.01);
    // upper cabinets either side of the window and the hood, a light strip under them
    for (const [ux, un] of [[-4.2, 3], [0.0, 2]]) for (let i = 0; i < un; i++) { const x = ux + i * 0.6; box(g, 0.6, 0.72, 0.34, oak, x, 1.95, B + 0.17); door(x, 1.95, B + 0.35, 0.58, 0.7); box(g, 0.56, 0.012, 0.02, glow(0xffe2b0, 1.2), x, 1.585, B + 0.3); }
    light(g, 0xffe2b0, 0.9, -3.3, 1.5, B + 0.4, 2.5); light(g, 0xffe2b0, 0.9, 0.3, 1.5, B + 0.4, 2.5);
    // the window over the sink, café curtains and a valance, herbs on the sill
    windowOn(g, VIEW.rooftops({}), -1.8, 1.72, B + 0.02, 1.2, 0.9, 0, 0xf4efe6);
    curtain(g, -2.15, 1.5, B + 0.07, 0.5, 0.42, 0xe8d8b8); curtain(g, -1.45, 1.5, B + 0.07, 0.5, 0.42, 0xe8d8b8); curtain(g, -1.8, 2.12, B + 0.08, 1.4, 0.22, 0xa04a3a);
    for (let i = 0; i < 3; i++) { const pt = cyl(g, 0.05, 0.04, 0.09, M({ color: 0xb8603a, roughness: 0.7 }), -2.1 + i * 0.3, 1.33, B + 0.1, 12); for (let k = 0; k < 5; k++) sph(g, 0.03, M({ color: 0x3a7a2a }), -2.1 + i * 0.3 + (rnd() - 0.5) * 0.06, 1.42 + rnd() * 0.06, B + 0.1, 8); }
    // the fridge: magnets, the kids' drawings, a calendar
    rbox(g, 0.86, 1.92, 0.72, 0.04, steel, 2.0, 0.96, B + 0.38); box(g, 0.02, 0.5, 0.03, M({ color: 0x8a8e94, metalness: 0.9 }), 1.62, 1.2, B + 0.76);
    for (let i = 0; i < 5; i++) {
      const dr = canvas(64, 80, (x, w, h) => { x.fillStyle = '#fbfaf4'; x.fillRect(0, 0, w, h); x.lineWidth = 3; for (let k = 0; k < 6; k++) { x.strokeStyle = pick(['#e8402a', '#2a6ad8', '#f0c020', '#2a9a4a', '#8a3ac8']); x.beginPath(); x.moveTo(rnd() * w, rnd() * h); x.quadraticCurveTo(rnd() * w, rnd() * h, rnd() * w, rnd() * h); x.stroke(); } x.fillStyle = '#f0c020'; x.beginPath(); x.arc(w * 0.75, h * 0.2, 7, 0, 7); x.fill(); });
      const d = plane(g, 0.2, 0.25, M({ map: tex(dr), roughness: 0.9 }), 1.78 + (i % 3) * 0.22, 1.2 + Math.floor(i / 3) * 0.32 + rnd() * 0.04, B + 0.745); d.rotation.z = (rnd() - 0.5) * 0.15;
      sph(g, 0.014, M({ color: pick([0xd82a1a, 0x2a6ad8, 0xf0c020]) }), d.position.x, d.position.y + 0.11, B + 0.75, 8);
    }
    // the counter: coffee maker, knife block, cutting board, fruit, paper towels, pizza boxes and chips for the game
    rbox(g, 0.22, 0.34, 0.24, 0.03, M({ color: 0x1a1a1c, roughness: 0.3 }), -3.5, 1.11, B + 0.2); cyl(g, 0.06, 0.05, 0.12, M({ color: 0x2a1a10, roughness: 0.1, transparent: true, opacity: 0.85 }), -3.5, 1.0, B + 0.3, 12);
    rbox(g, 0.12, 0.2, 0.16, 0.02, oakD, -3.1, 1.04, B + 0.2); for (let k = 0; k < 4; k++) cyl(g, 0.008, 0.008, 0.08, M({ color: 0x111111 }), -3.12 + k * 0.012, 1.17, B + 0.2, 6);
    rbox(g, 0.4, 0.02, 0.28, 0.01, M({ map: tex(PAINT.wood('#c89a60', '#b0844c', 20)), roughness: 0.6 }), -2.7, 0.95, B + 0.36);
    const bowl = sph(g, 0.14, M({ color: 0x3a5a7a, roughness: 0.3 }), 0.4, 0.98, B + 0.36); bowl.scale.y = 0.45; for (let i = 0; i < 6; i++) sph(g, 0.042, M({ color: pick([0xd82a1a, 0xf0c020, 0x6ab020, 0xff8a20]), roughness: 0.4 }), 0.35 + rnd() * 0.12, 1.03, B + 0.3 + rnd() * 0.12);
    cyl(g, 0.06, 0.06, 0.26, M({ color: 0xf8f6f0, roughness: 0.9 }), 1.0, 1.07, B + 0.2, 16);
    for (let i = 0; i < 3; i++) rbox(g, 0.42, 0.05, 0.42, 0.01, M({ color: 0xd8c8a0, roughness: 0.8 }), -0.2 + 0.9, 0.97 + i * 0.05, B + 0.36, (rnd() - 0.5) * 0.4);
    for (let i = 0; i < 4; i++) { const bt = new THREE.Mesh(bottleGeo(), M({ color: 0x5a3010, roughness: 0.1, envMapIntensity: 1.2 })); bt.scale.set(0.8, 0.75, 0.8); bt.position.set(-2.4 + i * 0.1, 0.94, B + 0.5); g.add(bt); }
    // the cabinets wrap the corner: a return along the left wall with its counter and an upper, then the doorway
    box(g, 0.58, 0.86, 0.58, oak, -4.21, 0.47, -4.13); { const dg = new THREE.Group(); dg.position.set(-3.92, 0, -4.13); dg.rotation.y = Math.PI / 2; g.add(dg); box(dg, 0.56, 0.74, 0.02, oak, 0, 0.5, 0); box(dg, 0.44, 0.6, 0.012, oakD, 0, 0.5, 0.012); sph(dg, 0.014, brass, -0.2, 0.78, 0.03, 8); }
    box(g, 0.58, 0.1, 0.56, M({ color: 0x2a1a10 }), -4.22, 0.05, -4.13); box(g, 0.64, 0.04, 0.6, granite, -4.18, 0.92, -4.14);
    box(g, 0.34, 0.72, 0.58, oak, -4.33, 1.95, -4.13); { const dg = new THREE.Group(); dg.position.set(-4.15, 0, -4.13); dg.rotation.y = Math.PI / 2; g.add(dg); box(dg, 0.56, 0.7, 0.02, oak, 0, 1.95, 0); box(dg, 0.44, 0.56, 0.012, oakD, 0, 1.95, 0.012); sph(dg, 0.014, brass, -0.2, 1.72, 0.03, 8); }
    plane(g, 0.58, 0.62, M({ map: tex(canvas(256, 64, (x, w, h) => { x.fillStyle = '#b8b2a8'; x.fillRect(0, 0, w, h); for (let r2 = 0; r2 < 4; r2++) for (let c = -1; c < 9; c++) { x.fillStyle = '#f2efe8'; x.fillRect(c * 32 + (r2 % 2) * 16 + 1, r2 * 16 + 1, 30, 14); } }), 1, 1), roughness: 0.15 }), -4.49, 1.25, -4.13, Math.PI / 2);
    // on the return: the mail pile, a bowl of keys, a phone charging
    for (let i = 0; i < 5; i++) { const ml = box(g, 0.22, 0.004, 0.11, M({ color: pick([0xf4f0e8, 0xe8e0c8, 0xd8e0f0]), roughness: 0.9 }), -4.2, 0.943 + i * 0.004, -3.98, (rnd() - 0.5) * 0.5); }
    const kb = sph(g, 0.07, M({ color: 0x6a8aa0, roughness: 0.3 }), -4.25, 0.96, -4.3); kb.scale.y = 0.35; for (let i = 0; i < 3; i++) cyl(g, 0.012, 0.012, 0.04, brass, -4.25 + i * 0.02, 0.97, -4.3, 6).rotation.z = 1.2;
    rbox(g, 0.075, 0.008, 0.15, 0.006, M({ color: 0x111111, roughness: 0.2 }), -4.1, 0.946, -4.32, 0.3);
    // the doorway's casing, and the living room through it: a lamp on, the sofa, the TV's glow, family photos, a bookcase
    const trimM = M({ color: 0xf4efe6, roughness: 0.5 });
    for (const dz of [-3.3 + 0.475 + 0.04, -3.3 - 0.475 - 0.04]) box(g, 0.14, 2.18, 0.08, trimM, -4.47, 1.09, dz); box(g, 0.14, 0.1, 1.11, trimM, -4.47, 2.15, -3.3);
    { const L = new THREE.Group(); L.position.set(-4.5, 0, 0); g.add(L);
      plane(L, 4.6, 7, M({ map: tex(PAINT.wood('#8a6038', '#74502e', 18), 2.3, 3.5), roughness: 0.55 }), -2.3, 0.002, -2.8, 0, -Math.PI / 2);
      plane(L, 4.6, 2.6, M({ map: tex(PAINT.plain('#c8b898'), 2, 1), roughness: 0.9 }), -2.3, 1.3, -6.2);
      plane(L, 7, 2.6, M({ map: tex(PAINT.plain('#c8b898'), 3, 1), roughness: 0.9 }), -4.6, 1.3, -2.8, Math.PI / 2);
      plane(L, 4.6, 7, M({ color: 0xf0ebe0, roughness: 0.9 }), -2.3, 2.6, -2.8, 0, Math.PI / 2);
      rugAt(L, -2.3, -4.2, 2.6, 1.8, canvas(256, 160, (x, w, h) => { x.fillStyle = '#7a8a9a'; x.fillRect(0, 0, w, h); x.strokeStyle = '#e8e0d0'; x.lineWidth = 6; x.strokeRect(12, 12, w - 24, h - 24); for (let i = 0; i < 2000; i++) { x.fillStyle = 'rgba(0,0,0,' + rnd() * 0.08 + ')'; x.fillRect(rnd() * w, rnd() * h, 2, 2); } }));
      sofa(L, -1.5, -5.75, 0, 0x5a6a5a, 2.2); for (let i = 0; i < 2; i++) { const pw = rbox(L, 0.4, 0.4, 0.14, 0.06, cloth(pick([0xc8a050, 0xe8e0d0, 0x8a3a2a]), 0.9), -2.0 + i * 1.0, 0.68, -5.9, (rnd() - 0.5) * 0.4); pw.rotation.z = 0.15; }
      const throwB = rbox(L, 0.7, 0.05, 0.5, 0.03, cloth(0xb8a080, 0.95), -0.9, 0.52, -5.5, 0.3);
      rbox(L, 0.5, 0.55, 0.5, 0.02, M({ map: tex(PAINT.wood('#4a3020', '#3a2416', 10)), roughness: 0.5 }), -0.1, 0.275, -5.75); cyl(L, 0.09, 0.07, 0.3, M({ color: 0x2a4a6a, roughness: 0.3 }), -0.1, 0.7, -5.75, 16);
      // a floor lamp, on
      cyl(L, 0.15, 0.17, 0.03, M({ color: 0x1a1a1a, metalness: 0.6 }), -3.1, 0.015, -5.9, 16); cyl(L, 0.012, 0.012, 1.5, M({ color: 0x8a6a3a, metalness: 0.8, roughness: 0.3 }), -3.1, 0.76, -5.9, 8);
      const shd = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.24, 0.3, 24, 1, true), M({ color: 0xf4e8d0, emissive: 0xffd8a0, emissiveIntensity: 0.9, side: THREE.DoubleSide, roughness: 0.9 })); shd.position.set(-3.1, 1.62, -5.9); L.add(shd); light(L, 0xffc890, 2.2, -3.1, 1.5, -5.8, 6);
      // the TV on its stand against the near wall, glowing; a coffee table with a bowl and remotes
      rbox(L, 1.4, 0.5, 0.4, 0.02, M({ map: tex(PAINT.wood('#4a3020', '#3a2416', 10)), roughness: 0.5 }), -2.3, 0.25, 0.3); tvSet(L, -2.3, 0.95, 0.3, 1.2, Math.PI, 'football');
      rbox(L, 1.0, 0.06, 0.55, 0.02, M({ map: tex(PAINT.wood('#6a4428', '#5a3820', 10)), roughness: 0.4 }), -1.5, 0.42, -4.6); for (const t of [-1, 1]) for (const u of [-1, 1]) cyl(L, 0.02, 0.02, 0.4, M({ color: 0x3a2416 }), -1.5 + t * 0.42, 0.2, -4.6 + u * 0.22, 6);
      rbox(L, 0.05, 0.02, 0.17, 0.01, M({ color: 0x111111 }), -1.3, 0.46, -4.5, 0.3);
      // family photos on the far wall, a bookcase in the corner, a window with the blinds down
      for (let i = 0; i < 5; i++) photo(L, -0.9 - (i % 3) * 0.5, 1.5 + Math.floor(i / 3) * 0.45, -6.18, 0.34, 0.26, 0, pick(['team', 'land', 'portrait']), pick([0x2a1a10, 0xc8a050, 0xf4f0e8]));
      shelves(L, -4.0, -6.0, 1.1, 2.0, 0);
      light(L, 0xffe0b0, 0.6, -2.3, 2.3, -3.5, 6);
      plant(L, -4.2, -1.6, 1.0, false);
    }
    // coats on hooks by the doorway, a dog's bowl and a pair of sneakers by the wall
    box(g, 0.04, 0.08, 0.9, oakD, -4.48, 1.62, -1.6); for (let i = 0; i < 3; i++) cyl(g, 0.01, 0.01, 0.07, brass, -4.44, 1.6, -1.9 + i * 0.3, 6).rotation.z = Math.PI / 2;
    { const bp = rbox(g, 0.14, 0.4, 0.3, 0.05, cloth(0x2a4a8a, 0.9), -4.4, 1.32, -1.6); bp.rotation.x = 0.05; rbox(g, 0.06, 0.18, 0.22, 0.03, cloth(0x1a2a5a, 0.9), -4.33, 1.24, -1.6); }   // a kid's backpack on a hook
    const db = cyl(g, 0.11, 0.09, 0.06, M({ color: 0xc81a2a, roughness: 0.4 }), -3.9, 0.03, -2.2, 20); cyl(g, 0.08, 0.08, 0.005, M({ color: 0x5a3a20, roughness: 0.9 }), -3.9, 0.055, -2.2, 16);
    for (const s of [-1, 1]) rbox(g, 0.11, 0.08, 0.28, 0.03, M({ color: s > 0 ? 0xf4f4f0 : 0xe8e8e4, roughness: 0.6 }), -4.2 + s * 0.07, 0.04, -2.6, s * 0.15);
    // more of a family's things: a dish rack by the sink, a toaster, the utensil crock, mugs, cereal, a clock over the doorway
    { const wire = M({ color: 0xd8dcdf, metalness: 0.7, roughness: 0.35 }); box(g, 0.38, 0.02, 0.3, wire, -1.27, 0.95, B + 0.34); for (let i = 0; i < 6; i++) { const pl = cyl(g, 0.11, 0.11, 0.012, M({ color: pick([0xf4f2ec, 0xe8e4d8, 0x5a7a9a]), roughness: 0.15 }), -1.42 + i * 0.05, 1.06, B + 0.32, 24); pl.rotation.z = Math.PI / 2 - 0.15; } for (let i = 0; i < 2; i++) { const cp = cyl(g, 0.04, 0.035, 0.09, M({ color: pick([0xf4f2ec, 0xc8402a, 0x2a5a8a]), roughness: 0.2 }), -1.16, 0.99 + i * 0.002, B + 0.24 + i * 0.12, 16); cp.rotation.x = Math.PI; } }
    rbox(g, 0.28, 0.18, 0.16, 0.03, M({ color: 0xc8ccd2, metalness: 0.85, roughness: 0.25 }), 1.28, 1.03, B + 0.3); for (const t of [-1, 1]) box(g, 0.2, 0.004, 0.03, M({ color: 0x111111 }), 1.28, 1.122, B + 0.3 + t * 0.035);
    cyl(g, 0.065, 0.06, 0.16, M({ color: 0xe8dcc8, roughness: 0.3 }), -0.1, 1.02, B + 0.22, 18); for (let i = 0; i < 4; i++) { const sp = cyl(g, 0.008, 0.01, 0.3, M({ color: i % 2 ? 0x8a5a30 : 0x2a2a2a, roughness: 0.5 }), -0.1 + (i - 1.5) * 0.02, 1.15, B + 0.22, 6); sp.rotation.z = (i - 1.5) * 0.12; }
    for (let i = 0; i < 2; i++) { cyl(g, 0.04, 0.038, 0.095, M({ color: pick([0x2a4a7a, 0xf4f0e8, 0x8a2a2a]), roughness: 0.2 }), -3.95 + i * 0.12, 0.99, -4.42 + i * 0.1, 16); }
    rbox(g, 0.2, 0.3, 0.07, 0.01, M({ map: tex(canvas(64, 96, (x, w, h) => { x.fillStyle = '#e8b830'; x.fillRect(0, 0, w, h); x.fillStyle = '#c8302a'; x.fillRect(4, 8, w - 8, 26); x.fillStyle = '#fff'; x.font = '900 13px sans-serif'; x.fillText('OATS', 14, 26); x.fillStyle = '#d88a3a'; x.beginPath(); x.ellipse(32, 64, 20, 14, 0, 0, 7); x.fill(); })), roughness: 0.6 }), -4.3, 1.09, B + 0.2, 0.3);
    { const ck = cyl(g, 0.14, 0.14, 0.035, M({ color: 0xf8f4ea, roughness: 0.4 }), -4.47, 2.32, -3.3, 32); ck.rotation.z = Math.PI / 2; const rr = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.018, 8, 32), M({ color: 0x2a2a2a })); rr.position.set(-4.46, 2.32, -3.3); rr.rotation.y = Math.PI / 2; g.add(rr); box(g, 0.01, 0.085, 0.01, M({ color: 0x111111 }), -4.44, 2.35, -3.3); box(g, 0.01, 0.01, 0.065, M({ color: 0x111111 }), -4.44, 2.32, -3.27); }
    // a runner in front of the sink, the dog asleep on the floor by the door
    rugAt(g, -1.8, B + 0.95, 1.6, 0.7, canvas(256, 112, (x, w, h) => { x.fillStyle = '#5a6a7a'; x.fillRect(0, 0, w, h); x.fillStyle = '#e8e0d0'; x.fillRect(10, 10, w - 20, h - 20); x.fillStyle = '#5a6a7a'; x.fillRect(20, 20, w - 40, h - 40); x.strokeStyle = '#e8e0d0'; x.lineWidth = 3; for (let i = 0; i < 6; i++) { x.beginPath(); x.moveTo(40 + i * 32, 32); x.lineTo(56 + i * 32, h / 2); x.lineTo(40 + i * 32, h - 32); x.lineTo(24 + i * 32, h / 2); x.closePath(); x.stroke(); } for (let i = 0; i < 1500; i++) { x.fillStyle = 'rgba(0,0,0,' + rnd() * 0.1 + ')'; x.fillRect(rnd() * w, rnd() * h, 2, 2); } }));
    if (EXPORT) { const dg = new THREE.Group(); dg.name = 'PROP_dog'; dg.position.set(-2.5, 0, -2.1); dg.rotation.y = 0.9; g.add(dg); }
    // the wall by the fridge: a cork board of school papers and a calendar, a little shelf of cookbooks, a framed photo
    { rbox(g, 0.9, 0.6, 0.03, 0.01, M({ color: 0x5a3a20, roughness: 0.5 }), 3.4, 1.55, B + 0.02); plane(g, 0.84, 0.54, M({ map: tex(canvas(128, 80, (x, w, h) => { x.fillStyle = '#b8905a'; x.fillRect(0, 0, w, h); for (let i = 0; i < 900; i++) { x.fillStyle = 'rgba(80,50,20,' + rnd() * 0.3 + ')'; x.fillRect(rnd() * w, rnd() * h, 1, 1); } })), roughness: 0.95 }), 3.4, 1.55, B + 0.04);
      for (let i = 0; i < 6; i++) { const pp = plane(g, 0.16 + rnd() * 0.06, 0.2, M({ map: tex(canvas(32, 40, (x, w, h) => { x.fillStyle = pick(['#fbfaf4', '#f8f0c8', '#e8f0f8']); x.fillRect(0, 0, w, h); x.strokeStyle = '#8a8aa8'; for (let k = 0; k < 6; k++) { x.beginPath(); x.moveTo(3, 6 + k * 5); x.lineTo(w - 3, 6 + k * 5); x.stroke(); } x.strokeStyle = pick(['#e8402a', '#2a6ad8', '#2a9a4a']); x.lineWidth = 2; x.beginPath(); x.moveTo(5, 30); x.lineTo(14, 22); x.lineTo(24, 33); x.stroke(); })), roughness: 0.9 }), 3.08 + (i % 3) * 0.3, 1.66 - Math.floor(i / 3) * 0.24, B + 0.045 + i * 0.001); pp.rotation.z = (rnd() - 0.5) * 0.18; sph(g, 0.012, M({ color: pick([0xd82a1a, 0x2a6ad8, 0xf0c020]) }), pp.position.x, pp.position.y + 0.09, B + 0.06, 8); }
      plane(g, 0.34, 0.48, M({ map: tex(canvas(68, 96, (x, w, h) => { x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); x.fillStyle = '#3a6a9a'; x.fillRect(0, 0, w, 40); x.strokeStyle = '#bbb'; for (let i = 0; i < 6; i++) { x.beginPath(); x.moveTo(0, 44 + i * 9); x.lineTo(w, 44 + i * 9); x.stroke(); } for (let i = 0; i < 7; i++) { x.beginPath(); x.moveTo(i * 10, 44); x.lineTo(i * 10, h); x.stroke(); } x.fillStyle = '#c8402a'; x.fillRect(22, 56, 8, 6); x.fillRect(42, 74, 8, 6); })), roughness: 0.9 }), 4.15, 1.5, B + 0.02);
      box(g, 0.8, 0.025, 0.2, oakD, 3.45, 2.05, B + 0.1); for (let i = 0; i < 7; i++) box(g, 0.05, 0.2 + rnd() * 0.05, 0.15, M({ color: pick([0x8a2a1a, 0x2a4a6a, 0xe8d8b0, 0x3a5a3a, 0xc8a050]), roughness: 0.7 }), 3.15 + i * 0.065, 2.17, B + 0.1);
      photo(g, 3.8, 2.22, B + 0.11, 0.22, 0.18, 0, 'team', 0xf4f0e8); }
    // a dish towel over the oven handle
    { const tw = plane(g, 0.24, 0.4, M({ map: tex(canvas(32, 64, (x, w, h) => { x.fillStyle = '#f4f0e6'; x.fillRect(0, 0, w, h); x.fillStyle = '#b02a2a'; x.fillRect(0, 8, w, 4); x.fillRect(0, h - 12, w, 4); })), roughness: 0.95, side: THREE.DoubleSide }), -0.6, 0.52, B + 0.68); tw.rotation.x = -0.05; }
    box(g, 0.05, 2.1, 0.95, M({ color: 0xf4efe6 }), 4.48, 1.05, -2.8); plane(g, 0.85, 2.0, M({ color: 0x000000, emissive: 0xffb870, emissiveIntensity: 0.35 }), 4.47, 1.0, -2.8, -Math.PI / 2);
    light(g, 0xffc890, 1.4, 3.9, 1.6, -2.8, 3.5);
    // a rug under the table, recessed lights in the ceiling
    const rug = plane(g, 3.2, 2.2, M({ map: tex(PAINT.carpet('#6a3a2e', '#8a5a40', '#c8b090', 'diamond'), 2, 1.4), roughness: 0.95 }), 1.0, 0.006, -2.2, 0, -Math.PI / 2); rug.userData.flat = 1;
    for (const [lx, lz] of [[-2.5, -3.6], [-0.5, -3.6], [2.6, -1.0], [-2.5, -1.0]]) { const d = new THREE.Mesh(new THREE.CircleGeometry(0.07, 20), glow(0xfff0d8, 2)); d.rotation.x = Math.PI / 2; d.position.set(lx, 2.595, lz); g.add(d); }
    pokerTable(g, 1.0, -2.2, { mine: true, rx: 0.9, rz: 0.55, felt: 0x2e7d4f, rail: 0x7c5530, seats: 5, shade: 0xf0e6d0, lampColor: 0xffe0b0, wood: '#8a5a32', wood2: '#6a4224' });
    return { exposure: 1.05, cam: [[0.4, 1.5, 1.4], [-1.3, 1.2, -5]] };
  },
  // a finished basement: low drop ceiling, a steel beam and post, carpet, the big TV with the game on and the sectional
  // facing it, a little bar with a neon beer sign, a dartboard, sports things on the walls
  basement(g) {
    const r = room(g, { w: 10, d: 8, h: 2.35, floor: PAINT.berber('#8a8070'), wall: PAINT.plain('#c8bca0'), ceil: PAINT.dropceil(), trim: 0x6a4a2a, cornice: 0xd8d4cc, fillI: 0.8 });
    const B = r.back;
    plane(g, 10, 1.0, M({ map: tex(PAINT.panel('#6a4a2a', '#7a5636'), 4, 1) }), 0, 0.5, B + 0.01); box(g, 10, 0.05, 0.04, M({ color: 0x3a2414 }), 0, 1.0, B + 0.03);
    box(g, 10, 0.24, 0.12, M({ color: 0x5a5e64, metalness: 0.7, roughness: 0.4 }), 0, 2.23, -2.6); cyl(g, 0.05, 0.05, 2.35, M({ color: 0x5a5e64, metalness: 0.7, roughness: 0.4 }), -1.6, 1.17, -2.6, 12);
    for (const [lx, lz] of [[-3, -1.2], [0, -1.2], [3, -1.2], [-3, -4], [0, -4], [3, -4]]) { const d = new THREE.Mesh(new THREE.CircleGeometry(0.08, 20), glow(0xfff0d8, 2)); d.rotation.x = Math.PI / 2; d.position.set(lx, 2.345, lz); g.add(d); }
    // the TV wall: a media console, the big TV with the game on, speakers; the sectional in front of it
    rbox(g, 2.4, 0.5, 0.45, 0.03, M({ color: 0x1a1612, roughness: 0.4 }), -1.8, 0.25, B + 0.25); tvSet(g, -1.8, 1.4, B + 0.06, 1.9, 0, 'football');
    for (const s of [-1, 1]) rbox(g, 0.22, 1.0, 0.25, 0.03, M({ color: 0x111111, roughness: 0.6 }), -1.8 + s * 1.35, 0.5, B + 0.2);
    sofa(g, -2.6, -3.6, Math.PI, 0x4a4038, 2.6); sofa(g, -4.2, -2.6, Math.PI / 2, 0x4a4038, 1.6);
    rbox(g, 1.0, 0.4, 0.6, 0.03, M({ color: 0x3a2a1a, roughness: 0.4 }), -2.6, 0.2, -2.7); for (let i = 0; i < 3; i++) { const bt = new THREE.Mesh(bottleGeo(), M({ color: 0x5a3010, roughness: 0.1 })); bt.scale.set(0.8, 0.7, 0.8); bt.position.set(-2.9 + i * 0.2, 0.4, -2.7); g.add(bt); }
    // the bar in the corner, its neon sign, a mini fridge; the dartboard
    bar(g, 3.0, B + 1.3, 2.6, { crowd: 0.35, mirror: false, wood: '#5a3a1e' }); neon(g, 'Cold Beer', '#ff3a3a', 3.0, 2.0, B + 0.05, 70);
    rbox(g, 0.6, 0.85, 0.6, 0.03, M({ color: 0x2a2a2a, metalness: 0.4, roughness: 0.4 }), 4.55, 0.43, B + 0.4);
    dartboard(g, 4.94, 1.6, -1.6, -Math.PI / 2);
    // pennants, a framed jersey, a signed football on a shelf
    for (let i = 0; i < 4; i++) { const pc = pick(['#c84a1a', '#1a3a8a', '#f0c030', '#2a7a2a']); const pn = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(0, 0.12), new THREE.Vector2(0.6, 0), new THREE.Vector2(0, -0.12)])), M({ color: pc, side: THREE.DoubleSide })); pn.position.set(-4.95, 1.85 - i * 0.02, -3.6 + i * 0.75); pn.rotation.y = Math.PI / 2; g.add(pn); }
    const jersey = canvas(128, 140, (x, w, h) => { x.fillStyle = '#1a1a1a'; x.fillRect(0, 0, w, h); x.fillStyle = '#e8641a'; x.beginPath(); x.moveTo(30, 20); x.lineTo(98, 20); x.lineTo(118, 50); x.lineTo(100, 60); x.lineTo(98, 130); x.lineTo(30, 130); x.lineTo(28, 60); x.lineTo(10, 50); x.closePath(); x.fill(); x.fillStyle = '#fff'; x.font = '900 46px sans-serif'; x.textAlign = 'center'; x.fillText('7', 64, 105); });
    photo(g, 4.95, 1.45, -3.6, 0.7, 0.8, -Math.PI / 2, 'team'); plane(g, 0.62, 0.7, M({ map: tex(jersey) }), 4.92, 1.45, -3.6, -Math.PI / 2);
    windowOn(g, VIEW.yard({}), 2.4, 2.05, B + 0.02, 1.0, 0.36, 0, 0xe8e4dc);
    pokerTable(g, 0.6, -2.0, { mine: true, rx: 1.1, rz: 0.62, felt: 0x1f5c39, seats: 6, lampColor: 0xfff0d0, shade: 0x1a4a2a, wood: '#2a1a10', wood2: '#1a100a' });
    return { exposure: 1.0 };
  },
  // a two-car garage: one side for the game, the other still has the car in it; the door, the workbench and pegboard,
  // shelving with bins, bikes on the wall, shop lights, the old fridge full of beer, a space heater
  garage(g) {
    const r = room(g, { w: 8, d: 7.5, h: 2.8, floor: PAINT.concrete('#8a8680'), wall: PAINT.plain('#d0cbc0'), ceil: PAINT.plain('#d8d4cc'), trim: 0x9a968e, cornice: 0xd8d4cc, fillI: 0.6 });
    const B = r.back;
    const stain = plane(g, 1.4, 2.2, M({ color: 0x3a3632, transparent: true, opacity: 0.35, roughness: 0.9 }), -2.0, 0.004, -3.0, 0, -Math.PI / 2); stain.userData.flat = 1;
    // the sectional door with its row of windows
    const door = canvas(256, 256, (x, w, h) => { x.fillStyle = '#d6d2c8'; x.fillRect(0, 0, w, h); for (let i = 0; i < 400; i++) { x.fillStyle = 'rgba(60,50,40,' + rnd() * 0.12 + ')'; x.fillRect(rnd() * w, h - 40 + rnd() * 40, 3 + rnd() * 10, 2); } for (let i = 0; i < 4; i++) { x.fillStyle = 'rgba(0,0,0,.22)'; x.fillRect(0, i * 64, w, 3); for (let k = 0; k < 4; k++) { x.strokeStyle = 'rgba(0,0,0,.12)'; x.lineWidth = 2; x.strokeRect(k * 64 + 8, i * 64 + 10, 48, 44); } } x.fillStyle = '#10141e'; for (let k = 0; k < 4; k++) x.fillRect(k * 64 + 10, 12, 44, 30); });
    plane(g, 2.6, 2.2, M({ map: tex(door), roughness: 0.5, metalness: 0.2 }), -2.0, 1.1, B + 0.02); plane(g, 2.6, 2.2, M({ map: tex(door), roughness: 0.5, metalness: 0.2 }), 1.6, 1.1, B + 0.02);
    box(g, 6.0, 0.1, 0.12, M({ color: 0x8a8680 }), -0.2, 2.25, B + 0.06);
    car(g, -2.1, -3.15, Math.PI, 0x3a5a7a);
    // the workbench, shelving, the water heater, bikes on hooks
    workbench(g, 3.85, -3.4, -Math.PI / 2);
    metalShelf(g, 3.75, -0.9, -Math.PI / 2, 1.6, 1.9);
    cyl(g, 0.28, 0.28, 1.5, M({ color: 0xd8d8d4, roughness: 0.5 }), 3.6, 0.75, B + 0.4, 20); cyl(g, 0.04, 0.04, 0.6, M({ color: 0xb87a3a, metalness: 0.8 }), 3.6, 1.8, B + 0.4, 8);
    for (let i = 0; i < 2; i++) { const bk = new THREE.Group(); bk.position.set(-3.95, 1.6, -1.0 - i * 0.8); bk.rotation.y = Math.PI / 2; g.add(bk); for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.025, 8, 28), M({ color: 0x111111, roughness: 0.7 })); w.position.set(s * 0.5, 0, 0.1); bk.add(w); } box(bk, 1.0, 0.04, 0.04, M({ color: pick([0xc01a1a, 0x1a5ac0]), metalness: 0.5 }), 0, 0.15, 0.1); }
    // shop lights, the old fridge, a space heater glowing by the table, a cooler, a trash can of cans
    for (const [lx, lz] of [[-2, -4.5], [2.6, -4.5]]) { box(g, 1.2, 0.05, 0.18, M({ color: 0xd8d8d8 }), lx, 2.76, lz); box(g, 1.15, 0.03, 0.12, glow(0xf0f6ff, 1.3), lx, 2.735, lz); light(g, 0xe8f0ff, 0.7, lx, 2.6, lz, 6); }
    rbox(g, 0.75, 1.7, 0.7, 0.06, M({ color: 0xf0eee6, roughness: 0.4 }), 0.0, 0.85, B + 0.45); box(g, 0.02, 0.4, 0.04, M({ color: 0xa8a8a8, metalness: 0.8 }), 0.32, 1.1, B + 0.81);
    const ht = rbox(g, 0.35, 0.5, 0.25, 0.04, M({ color: 0x3a3a3e, roughness: 0.5 }), 2.6, 0.25, -1.0); plane(g, 0.25, 0.25, M({ color: 0x000000, emissive: 0xff5a10, emissiveIntensity: 1.2 }), 2.6, 0.3, -0.87); light(g, 0xff6a20, 0.35, 2.6, 0.35, -0.6, 1.6);
    rbox(g, 0.6, 0.4, 0.4, 0.05, M({ color: 0x2a6ac8, roughness: 0.4 }), 2.9, 0.2, -2.0); rbox(g, 0.62, 0.06, 0.42, 0.03, M({ color: 0xf4f4f4 }), 2.9, 0.42, -2.0);
    cyl(g, 0.25, 0.22, 0.7, M({ color: 0x2a5a2a, roughness: 0.6 }), 3.5, 0.35, -5.0 + 7.5 - 2.4, 16);
    sign(g, 'ROUTE 66', '#1a1a1a', '#f0f0f0', -3.97, 2.05, -3.0, 0.9, 0.42, Math.PI / 2);
    // the stuff of a garage: a pegboard of tools over the bench, paint cans, a bike against the door, bins, the mower,
    // a rake and a shovel, a basketball, old plates and a dartboard on the wall, stickers on the fridge, a radio
    const peg = plane(g, 2.0, 1.0, M({ map: tex(canvas(256, 128, (x, w, h) => { x.fillStyle = '#c8a870'; x.fillRect(0, 0, w, h); x.fillStyle = '#5a4a30'; for (let i = 8; i < w; i += 16) for (let j = 8; j < h; j += 16) { x.beginPath(); x.arc(i, j, 2, 0, 7); x.fill(); } })), roughness: 0.8 }), 3.97, 1.75, -3.4, -Math.PI / 2);
    const steelM = M({ color: 0x9a9ea4, metalness: 0.9, roughness: 0.35 }), handle = M({ color: 0xc83a1a, roughness: 0.5 });
    for (let i = 0; i < 5; i++) { const z = -4.2 + i * 0.4; box(g, 0.03, 0.42, 0.025, i % 2 ? steelM : M({ color: 0x8a6a3a }), 3.95, 1.75, z); box(g, 0.03, 0.08, i % 2 ? 0.12 : 0.1, i % 2 ? steelM : steelM, 3.95, 1.98, z); }
    box(g, 0.03, 0.12, 0.5, steelM, 3.95, 1.55, -2.0); box(g, 0.03, 0.06, 0.2, handle, 3.95, 1.52, -1.7);   // a saw
    for (let i = 0; i < 4; i++) { cyl(g, 0.09, 0.09, 0.2, M({ color: pick([0xe8e8e0, 0xd8d8d0, 0x6a7a8a]), metalness: 0.5, roughness: 0.4 }), 3.75, 2.35 + 0.1, -4.4 + i * 0.25, 16); const drip = plane(g, 0.1, 0.08, M({ color: pick([0x2a4a8a, 0xf0e8c0, 0xb03a2a]) }), 3.66, 2.4, -4.4 + i * 0.25, -Math.PI / 2); } box(g, 0.3, 0.03, 1.2, M({ color: 0x8a6a3a }), 3.8, 2.33, -4.05);
    { const bk = new THREE.Group(); bk.position.set(2.4, 0, B + 0.55); bk.rotation.y = 0.15; bk.rotation.x = 0.12; g.add(bk); for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.028, 8, 28), M({ color: 0x111111, roughness: 0.7 })); w.position.set(s * 0.52, 0.34, 0); w.rotation.y = Math.PI / 2; bk.add(w); for (let k = 0; k < 10; k++) { const sp = box(bk, 0.6, 0.004, 0.004, steelM, s * 0.52, 0.34, 0); sp.rotation.x = k * Math.PI / 10; } } box(bk, 0.9, 0.03, 0.03, handle, 0, 0.78, 0); seg(bk, [-0.45, 0.78, 0], [-0.52, 0.34, 0], 0.015, 0.012, handle); seg(bk, [0.45, 0.78, 0], [0.52, 0.34, 0], 0.015, 0.012, handle); seg(bk, [-0.1, 0.34, 0], [-0.45, 0.78, 0], 0.015, 0.012, handle); box(bk, 0.26, 0.05, 0.1, M({ color: 0x1a1a1a }), -0.3, 0.98, 0); box(bk, 0.45, 0.02, 0.02, steelM, 0.5, 1.0, 0, 0); }
    for (let i = 0; i < 3; i++) { rbox(g, 0.55, 0.35, 0.4, 0.02, M({ color: 0x8a8e94, roughness: 0.5 }), -3.4, 0.18 + i * 0.37, B + 0.5 + (i % 2) * 0.03); rbox(g, 0.57, 0.04, 0.42, 0.01, M({ color: pick([0x2a6ac8, 0xd82a1a, 0xe8c020]), roughness: 0.4 }), -3.4, 0.37 + i * 0.37, B + 0.5 + (i % 2) * 0.03); }
    { const mw = new THREE.Group(); mw.position.set(-3.3, 0, -1.6); mw.rotation.y = -0.5; g.add(mw); rbox(mw, 0.55, 0.22, 0.5, 0.05, M({ color: 0xc81a1a, roughness: 0.45 }), 0, 0.24, 0); box(mw, 0.3, 0.2, 0.3, M({ color: 0x1a1a1a }), 0, 0.45, 0.05); for (const a of [-1, 1]) for (const b of [-1, 1]) cyl(mw, 0.1, 0.1, 0.06, M({ color: 0x111111 }), a * 0.3, 0.1, b * 0.22, 14).rotation.z = Math.PI / 2; seg(mw, [0, 0.4, -0.25], [0, 1.0, -0.75], 0.015, 0.015, steelM); box(mw, 0.45, 0.03, 0.03, M({ color: 0x1a1a1a }), 0, 1.0, -0.75); }
    { const rk = cyl(g, 0.012, 0.012, 1.5, M({ color: 0x8a6a3a }), -3.85, 0.78, -0.3, 6); rk.rotation.x = 0.12; for (let k = 0; k < 7; k++) box(g, 0.01, 0.12, 0.01, steelM, -3.85, 0.08, -0.45 + k * 0.05); const sh = cyl(g, 0.012, 0.012, 1.4, M({ color: 0x8a6a3a }), -3.85, 0.72, 0.0, 6); sh.rotation.x = 0.1; box(g, 0.2, 0.26, 0.01, steelM, -3.85, 0.12, 0.08); }
    sph(g, 0.12, M({ map: tex(canvas(64, 32, (x, w, h) => { x.fillStyle = '#d86a20'; x.fillRect(0, 0, w, h); x.strokeStyle = '#111'; x.lineWidth = 2; x.beginPath(); x.moveTo(0, 16); x.lineTo(w, 16); x.moveTo(32, 0); x.lineTo(32, h); x.stroke(); })), roughness: 0.8 }), -2.9, 0.12, -0.6, 16);
    plateWall(g, -3.97, 1.4, -0.9, 1.1, 0.5, Math.PI / 2); dartboard(g, -3.97, 1.65, -4.6, Math.PI / 2);
    for (let i = 0; i < 4; i++) plane(g, 0.12, 0.12, M({ map: tex(canvas(16, 16, (x, w, h) => { x.fillStyle = pick(['#d82a1a', '#2a6ac8', '#e8c020', '#2a9a4a']); x.beginPath(); x.arc(8, 8, 7, 0, 7); x.fill(); x.fillStyle = '#fff'; x.fillRect(4, 7, 8, 2); })), transparent: true }), -0.15 + (i % 2) * 0.3, 1.0 + Math.floor(i / 2) * 0.35, B + 0.81);
    rbox(g, 0.28, 0.14, 0.1, 0.02, M({ color: 0x1a1a1a, roughness: 0.3 }), 3.6, 0.98, -2.6); cyl(g, 0.004, 0.004, 0.3, steelM, 3.5, 1.2, -2.6, 4);
    { const cord = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(3.96, 2.1, -1.2), new THREE.Vector3(3.9, 1.6, -1.15), new THREE.Vector3(3.96, 1.2, -1.1), new THREE.Vector3(3.9, 1.7, -1.05)]), 24, 0.008, 6), M({ color: 0xd86a20, roughness: 0.5 })); g.add(cord); }
    pokerTable(g, 1.0, -2.2, { mine: true, felt: 0x2e7d4f, rail: 0x3a2a1a, seats: 6, shade: 0x3a3a3e, lampColor: 0xfff0d8, ceil: 2.8, wood: '#5a3a20' });
    return { exposure: 0.85 };
  },
  // the formal dining room: wainscoting and wallpaper, a crystal chandelier over the table, a china cabinet full of
  // plates, the sideboard with candlesticks, a mirror, drapes at the big window, the kitchen glowing through the door
  dining(g) {
    const r = room(g, { w: 8, d: 6.5, h: 2.75, floor: PAINT.wood('#5a3418', '#4a2a12', 18), wall: PAINT.wallpaper('#5a2a2a', '#6a3434', 'floral'), wainscot: PAINT.beadboard('#ece6da'), ceil: PAINT.plain('#f2ece0'), trim: 0xece6da, cornice: 0xece6da, fillI: 0.7 });
    const B = r.back, white = M({ color: 0xece6da, roughness: 0.5 });
    wallPanels(g, -4, 4, B + 0.02, 0.15, 0.85, white, 5);
    // the china cabinet: a hutch with glass doors, plates on display, a light inside
    const hx = -2.4, wd = M({ map: tex(PAINT.wood('#4a2410', '#3a1a08', 22)), roughness: 0.35 });
    rbox(g, 1.6, 0.9, 0.5, 0.02, wd, hx, 0.45, B + 0.27); rbox(g, 1.5, 1.4, 0.35, 0.02, wd, hx, 1.62, B + 0.2); rbox(g, 1.7, 0.12, 0.42, 0.02, wd, hx, 2.38, B + 0.22);
    for (let s = 0; s < 2; s++) for (let i = 0; i < 5; i++) { const pl = cyl(g, 0.11, 0.11, 0.015, M({ color: 0xf8f6f0, roughness: 0.2, envMapIntensity: 1 }), hx - 0.56 + i * 0.28, 1.35 + s * 0.5, B + 0.15, 24); pl.rotation.x = Math.PI / 2 - 0.25; const rim = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.006, 4, 24), M({ color: 0x2a4a8a })); rim.position.copy(pl.position); rim.position.z += 0.012; rim.rotation.x = -0.25; g.add(rim); }
    plane(g, 1.4, 1.3, M({ color: 0xd8e4ec, metalness: 0.9, roughness: 0.05, transparent: true, opacity: 0.15 }), hx, 1.62, B + 0.38); light(g, 0xffe0b0, 1.6, hx, 1.95, B + 0.3, 1.8); spot(g, 0xffe8c8, 3, hx, 2.6, -1.5, hx, B + 0.3, 0.6);
    // the window with drapes and sheers
    windowOn(g, VIEW.yard({ moon: true }), 1.2, 1.5, B + 0.02, 1.5, 1.5, 0, 0xece6da);
    curtain(g, 0.25, 1.45, B + 0.08, 0.5, 2.5, 0x6a1a1a); curtain(g, 2.15, 1.45, B + 0.08, 0.5, 2.5, 0x6a1a1a); curtain(g, 1.2, 2.55, B + 0.09, 2.4, 0.3, 0x6a1a1a);
    plane(g, 0.5, 1.4, M({ color: 0xf8f4ea, transparent: true, opacity: 0.35, side: THREE.DoubleSide }), 0.7, 1.5, B + 0.06); plane(g, 0.5, 1.4, M({ color: 0xf8f4ea, transparent: true, opacity: 0.35, side: THREE.DoubleSide }), 1.7, 1.5, B + 0.06);
    // the sideboard with candlesticks and a bowl; a gilt mirror over it
    rbox(g, 1.8, 0.85, 0.5, 0.02, wd, -3.73, 0.43, -2.6, Math.PI / 2);
    for (const dz of [-0.6, 0.6]) { cyl(g, 0.04, 0.06, 0.3, M({ color: 0xd8c8a0, metalness: 0.9, roughness: 0.25 }), -3.73, 1.0, -2.6 + dz, 12); cyl(g, 0.018, 0.018, 0.2, M({ color: 0xf8f4e8 }), -3.73, 1.25, -2.6 + dz, 8); sph(g, 0.02, glow(0xffb050, 3), -3.73, 1.37, -2.6 + dz, 8); light(g, 0xffb050, 0.4, -3.6, 1.4, -2.6 + dz, 2); }
    const bowl = sph(g, 0.16, M({ color: 0xc8d4dc, metalness: 0.9, roughness: 0.15 }), -3.73, 0.95, -2.6); bowl.scale.y = 0.4;
    mirrorAt(g, -3.97, 1.7, -2.6, 1.1, 0.8, Math.PI / 2, 0xc8a050);
    // the doorway to the kitchen, lit
    box(g, 0.05, 2.15, 1.0, white, 3.97, 1.08, -2.0); plane(g, 0.9, 2.05, M({ color: 0x000000, emissive: 0xffd8a0, emissiveIntensity: 0.5 }), 3.96, 1.03, -2.0, -Math.PI / 2); light(g, 0xffd8a0, 1.2, 3.5, 1.5, -2.0, 3);
    photo(g, 3.97, 1.6, -3.7, 0.7, 0.5, -Math.PI / 2, 'land', 0xc8a050);
    rugAt(g, 0.6, -2.3, 3.6, 2.6, PAINT.carpet('#5a1a1a', '#7a2a24', '#c8a060'));
    chandelier(g, 0.6, 2.3, -2.3, 0.6, 0xfff0c8);
    pokerTable(g, 0.6, -2.3, { mine: true, rx: 1.25, rz: 0.68, felt: 0x2e5a3f, rail: 0x3a1a0c, lamp: false, seats: 6, ceil: 2.75, chair: 0x6a1a1a, wood: '#4a2410', wood2: '#3a1a08' });
    return { exposure: 1.0 };
  },
  // a screened back porch at night: painted floorboards, a blue beadboard ceiling, a fan, string lights, screens onto
  // the yard (the grill out there, the neighbors' lights), wicker furniture, a cooler, citronella candles, ferns
  porch(g) {
    const r = room(g, { w: 9, d: 6, h: 2.7, floor: PAINT.planks('#7a7e80', '#6a6e72'), wall: PAINT.beadboard('#f0ece4'), ceil: PAINT.beadboard('#a8c8d0'), trim: 0xf0ece4, cornice: 0xf0ece4, fill: false });
    const B = r.back, white = M({ color: 0xf0ece4, roughness: 0.5 });
    // the screens: big openings onto the yard with posts and a rail
    windowOn(g, VIEW.yard({ grill: true, moon: true }), 0, 1.35, B + 0.02, 8.6, 2.5, 0, 'none');
    plane(g, 8.6, 2.5, M({ color: 0x1a1a1a, transparent: true, opacity: 0.25, roughness: 1 }), 0, 1.35, B + 0.06);
    for (let i = 0; i < 6; i++) box(g, 0.12, 2.7, 0.12, white, -4.2 + i * 1.68, 1.35, B + 0.1);
    box(g, 8.6, 0.08, 0.12, white, 0, 0.85, B + 0.1); box(g, 8.6, 0.25, 0.14, white, 0, 0.12, B + 0.1);
    windowOn(g, VIEW.yard({}), -4.48, 1.35, -2.0, 4.6, 2.5, Math.PI / 2, 'none');
    for (let i = 0; i < 4; i++) box(g, 0.12, 2.7, 0.12, white, -4.4, 1.35, -4.0 + i * 1.5);
    ceilingFan(g, 0.6, 2.7, -2.2);
    stringLights(g, -4.3, 4.3, 2.62, -3.6, 0.35); stringLights(g, -4.3, 4.3, 2.62, -1.0, 0.3);
    // wicker sofa and chairs with cushions, a side table, a cooler, citronella buckets, hanging ferns
    const wick = M({ map: tex(canvas(64, 64, (x, w, h) => { x.fillStyle = '#8a6a44'; x.fillRect(0, 0, w, h); x.strokeStyle = '#6a4a28'; for (let i = 0; i < w; i += 6) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 6, h); x.stroke(); x.beginPath(); x.moveTo(0, i); x.lineTo(w, i + 6); x.stroke(); } }), 3, 2), roughness: 0.85 });
    rbox(g, 2.0, 0.45, 0.8, 0.06, wick, -2.6, 0.25, -4.2); rbox(g, 2.0, 0.55, 0.15, 0.06, wick, -2.6, 0.7, -4.55); for (let i = 0; i < 3; i++) rbox(g, 0.6, 0.12, 0.65, 0.05, cloth(0x2a6a7a), -3.25 + i * 0.65, 0.53, -4.15);
    for (const s of [-1, 1]) rbox(g, 0.15, 0.55, 0.8, 0.05, wick, -2.6 + s * 1.0, 0.45, -4.2);
    rbox(g, 0.7, 0.45, 0.45, 0.06, M({ color: 0xc01a1a, roughness: 0.4 }), 3.6, 0.23, -4.3); rbox(g, 0.72, 0.07, 0.47, 0.03, M({ color: 0xf4f4f4 }), 3.6, 0.48, -4.3);
    for (const [cx, cz] of [[-4.0, -1.0], [4.0, -2.0]]) { cyl(g, 0.14, 0.12, 0.2, M({ color: 0x8a8e94, metalness: 0.7 }), cx, 0.1, cz, 16); sph(g, 0.025, glow(0xffa040, 3), cx, 0.24, cz, 8); light(g, 0xffa040, 0.6, cx, 0.35, cz, 2.5); }
    for (const fx of [-3.0, 3.0]) { cyl(g, 0.004, 0.004, 0.6, M({ color: 0x111111 }), fx, 2.4, B + 0.5, 4); cyl(g, 0.16, 0.12, 0.18, M({ color: 0x8a5a3a }), fx, 2.05, B + 0.5, 14); for (let i = 0; i < 9; i++) { const lf = sph(g, 0.12, M({ color: 0x3a7a2a, roughness: 0.8 }), fx + (rnd() - 0.5) * 0.3, 1.9 - rnd() * 0.25, B + 0.5 + (rnd() - 0.5) * 0.3, 8); lf.scale.set(1, 0.5, 1); } }
    rugAt(g, 0.6, -2.2, 3.4, 2.4, PAINT.stripe('#2a5a6a', '#e8e0d0'));
    light(g, 0xffd090, 1.6, 0.6, 2.2, -2.2, 5);
    pokerTable(g, 0.6, -2.2, { mine: true, felt: 0x2e7d4f, rail: 0x7c5530, lamp: false, seats: 6, ceil: 2.7, chair: 0x2a6a7a, wood: '#8a6a44' });
    return { exposure: 1.05 };
  },
  // a neighbourhood bar on league night: the bar and its lit back bar under TVs with the game on, booths down one
  // wall, the dartboard, the specials board and the jukebox down the other; then each bar is its own place (o.theme)
  pub(g, o) {
    const th = o.theme || 'dog';
    const T = {
      anchor: { wall: PAINT.planks('#6a5a48', '#5a4a3a'), floor: PAINT.wood('#5a3a1e', '#4a2e16', 26), ceil: PAINT.wood('#3a2a1a', '#2a1e12', 40), felt: 0x1f3c6b, booth: 0x1a3a6a },
      kettle: { wall: PAINT.brick('#8a4a2e', '#4a3a30'), floor: PAINT.wood('#4a2a14', '#3a1e0c', 24), ceil: PAINT.tin('#3a3028'), felt: 0x7a1f2a, booth: 0x5a2a14 },
      tap: { wall: PAINT.brick('#6a3a2a', '#3a3230'), floor: PAINT.concrete('#6a6660'), ceil: PAINT.plain('#1a1a1c'), felt: 0x2a2a2e, booth: 0x2a2a2e },
      lion: { wall: PAINT.plain('#1f3a2a'), floor: PAINT.wood('#3a2010', '#2a1608', 24), ceil: PAINT.tin('#2a2420'), wainscot: PAINT.panel('#3a2010', '#4a2a14'), felt: 0x7a1f2a, booth: 0x7a1414 },
      dog: { wall: PAINT.plain('#1a1618'), floor: PAINT.concrete('#3a3634'), ceil: PAINT.plain('#121012'), felt: 0x7a1f2a, booth: 0x1a1a1a },
      shamrock: { wall: PAINT.plain('#1f4a2a'), floor: PAINT.wood('#4a2a14', '#3a1e0c', 24), ceil: PAINT.wood('#2a1a0e', '#1e1208', 40), wainscot: PAINT.panel('#3a2010', '#4a2a14'), felt: 0x1f5c39, booth: 0x2a4a2a },
      tincup: { wall: PAINT.plain('#d8ccaa'), floor: PAINT.carpet('#1f4a2a', '#2a5a34', '#d8c890'), ceil: PAINT.plain('#e8e0cc'), wainscot: PAINT.panel('#5a3a1e', '#6a4424'), felt: 0x1f5c39, booth: 0x2a4a2a },
      iron: { wall: PAINT.brick('#5a3a2a', '#2a2420'), floor: PAINT.concrete('#4a4642'), ceil: PAINT.plain('#141416'), felt: 0x2a2a2e, booth: 0x1a1a1a },
      moose: { wall: PAINT.logs('#9a6a3a', '#7a4a24'), floor: PAINT.wood('#6a4020', '#5a3418', 28), ceil: PAINT.wood('#5a3a20', '#3a2410', 50), felt: 0x24485e, booth: 0x6a1a1a },
      penny: { wall: PAINT.plain('#2a1a3a'), floor: PAINT.wood('#3a2416', '#2a1a10', 24), ceil: PAINT.plain('#120a1a'), felt: 0x5a1a6a, booth: 0x5a1a6a }
    }[th];
    const r = room(g, { w: 12, d: 9, h: 3.1, floor: T.floor, wall: T.wall, ceil: T.ceil, wainscot: T.wainscot, trim: 0x1a120a, cornice: 0x2a1a10, fillI: 0.5 });
    const B = r.back;
    bar(g, -1.8, B + 1.25, 6, { crowd: 0.6, stool: th === 'lion' || th === 'moose' ? 0x6a1a1a : 0x2a1a10, wood: th === 'tap' || th === 'iron' ? '#2a2a2e' : '#5a2e16', top: th === 'penny' || th === 'kettle' ? 0xb8703a : 0x2a140a });
    tvSet(g, -3.9, 2.55, B + 0.3, 1.3, 0, th === 'tincup' ? 'golf' : 'football'); tvSet(g, 0.3, 2.55, B + 0.3, 1.3, 0, th === 'tincup' ? 'golf' : th === 'kettle' ? 'baseball' : 'football');
    if (th !== 'lion') neon(g, o.neon || 'Cold Beer', o.neonColor || '#ff3a3a', 3.6, 2.3, B + 0.04, 72);
    sign(g, o.name || 'THE PUB', '#1a0f08', '#d8b060', 3.6, 1.6, B + 0.04, 1.8, 0.5);
    // booths down the left wall
    for (let i = 0; i < 3; i++) booth(g, -5.25, -0.8 - i * 1.9, Math.PI / 2, T.booth);
    for (let i = 0; i < 3; i++) pendant(g, -5.0, 2.1, -0.8 - i * 1.9, 0xffc070, 0x3a2a1a);
    // the right wall: dartboard, the specials, the jukebox
    dartboard(g, 5.95, 1.7, -2.6, -Math.PI / 2);
    chalkboard(g, 5.95, 1.8, -4.4, 1.1, 1.3, -Math.PI / 2, th === 'tap' ? ['ON TAP', 'Hazy IPA 6.8', 'Pilsner 4.9', 'Stout 7.2', 'Sour 5.5'] : ['TONIGHT', 'POKER LEAGUE 7PM', 'Wings 50c', '$3 Drafts'], th === 'tap' ? 0x1a1a1a : 0x5a3a1a);
    if (th !== 'penny') jukebox(g, 5.55, -0.6, -Math.PI / 2);
    // and what makes each bar itself
    if (th === 'anchor') {
      wagonWheel(g, -5.97, 2.1, -3.3, Math.PI / 2);
      const lr = new THREE.Group(); lr.position.set(5.96, 2.5, -1.4); lr.rotation.y = -Math.PI / 2; g.add(lr); for (let k = 0; k < 8; k++) { const sg = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.08, 10, 12, Math.PI / 4), M({ color: k % 2 ? 0xffffff : 0xd8281e, roughness: 0.6 })); sg.rotation.z = k * Math.PI / 4; lr.add(sg); }
      const net = plane(g, 3.0, 1.0, M({ map: tex(canvas(128, 64, (x, w, h) => { x.strokeStyle = '#c8b890'; x.lineWidth = 1.2; for (let i = 0; i < w; i += 8) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 8, h); x.stroke(); x.beginPath(); x.moveTo(i + 8, 0); x.lineTo(i, h); x.stroke(); } }), 2, 1), transparent: true, alphaTest: 0.2, side: THREE.DoubleSide }), 3.4, 2.75, B + 0.08);
      for (let k = 0; k < 6; k++) sph(g, 0.08, new THREE.MeshPhysicalMaterial({ color: pick([0x3a8a5a, 0x3a6ac8, 0xc8a03a]), roughness: 0.05, transmission: 0.4, emissive: 0x0a1a10, emissiveIntensity: 0.4 }), 2.2 + k * 0.5, 2.5 - (k % 2) * 0.2, B + 0.15, 12);
      for (let k = 0; k < 2; k++) lantern(g, -3.5 + k * 7, 2.55, -4.3, 0xffb040);
    } else if (th === 'kettle') {
      box(g, 4.4, 0.05, 0.05, M({ color: 0x2a2a2a, metalness: 0.7 }), -1.8, 2.75, B + 1.2);
      for (let k = 0; k < 9; k++) { const cp = M({ color: 0xc87a3a, metalness: 0.95, roughness: 0.25, envMapIntensity: 1.3 }); const pot = cyl(g, 0.11 + rnd() * 0.06, 0.09 + rnd() * 0.05, 0.16 + rnd() * 0.1, cp, -3.8 + k * 0.5, 2.5, B + 1.2, 18); cyl(g, 0.004, 0.004, 0.2, M({ color: 0x111111 }), -3.8 + k * 0.5, 2.68, B + 1.2, 4); }
      stringLights(g, -5.5, 5.5, 2.95, -1.5, 0.25, 0xffb050);
    } else if (th === 'tap') {
      box(g, 3.2, 1.3, 0.08, M({ color: 0x141414, roughness: 0.4 }), 3.6, 1.35, B + 0.05);
      for (let k = 0; k < 16; k++) { const tx = 2.15 + (k % 8) * 0.4, ty = 1.15 + Math.floor(k / 8) * 0.5; cyl(g, 0.015, 0.015, 0.12, M({ color: 0xc8ccd2, metalness: 0.9, roughness: 0.2 }), tx, ty, B + 0.14, 8).rotation.x = Math.PI / 2; rbox(g, 0.05, 0.22, 0.05, 0.015, M({ color: pick([0xd8a020, 0x1a1a1a, 0xc01a1a, 0x2a6a2a, 0xe8e0d0, 0x2a4a8a]) }), tx, ty + 0.15, B + 0.19); }
      chalkboard(g, 3.6, 2.55, B + 0.06, 3.0, 0.7, 0, ['16 ON TAP', 'IPA  LAGER  STOUT  SOUR'], 0x1a1a1a);
      for (let k = 0; k < 2; k++) { const d = cyl(g, 0.3, 0.3, 11.5, M({ color: 0xa8acb2, metalness: 0.9, roughness: 0.35 }), 0, 2.75, -2 - k * 2.5, 20); d.rotation.z = Math.PI / 2; }
      stringLights(g, -5.5, 5.5, 2.6, -1.2, 0.3, 0xffb050);
    } else if (th === 'lion') {
      fireplace(g, 3.6, B + 0.32); for (const fx of [2.4, 4.8]) photo(g, fx, 2.0, B + 0.03, 0.6, 0.75, 0, 'portrait', 0xb08a40);
      const uj = canvas(190, 100, (x, w, h) => { x.fillStyle = '#012169'; x.fillRect(0, 0, w, h); x.strokeStyle = '#fff'; x.lineWidth = 20; x.beginPath(); x.moveTo(0, 0); x.lineTo(w, h); x.moveTo(w, 0); x.lineTo(0, h); x.stroke(); x.strokeStyle = '#c8102e'; x.lineWidth = 7; x.stroke(); x.fillStyle = '#fff'; x.fillRect(w / 2 - 16, 0, 32, h); x.fillRect(0, h / 2 - 16, w, 32); x.fillStyle = '#c8102e'; x.fillRect(w / 2 - 9, 0, 18, h); x.fillRect(0, h / 2 - 9, w, 18); });
      plane(g, 1.4, 0.75, M({ map: tex(uj), side: THREE.DoubleSide }), -5.97, 2.4, -3.0, Math.PI / 2);
      for (let k = 0; k < 4; k++) sconce(g, -5.98, 1.9, -0.3 - k * 1.9, Math.PI / 2, 0xffc070);
    } else if (th === 'dog') {
      poolTable(g, 3.3, -4.6, 0, 0x1a5a8a);
      for (let k = 0; k < 4; k++) { const c = pick(['#ff3a3a', '#3ad8ff', '#ffd84d', '#3aff8a']); neon(g, pick(['Lager', 'Miller Time', 'Bud', 'Coors', 'Beer']), c, -5.95, 2.3 - (k % 2) * 0.5, -0.6 - k * 1.5, 50, Math.PI / 2); }
      const bills = canvas(256, 128, (x, w, h) => { x.fillStyle = '#2a2a2a'; x.fillRect(0, 0, w, h); for (let k = 0; k < 120; k++) { x.save(); x.translate(rnd() * w, rnd() * h); x.rotate((rnd() - 0.5) * 0.8); x.fillStyle = pick(['#c8d0a8', '#b8c098', '#d0d8b0']); x.fillRect(-14, -6, 28, 12); x.fillStyle = 'rgba(40,60,40,.6)'; x.fillRect(-4, -4, 8, 8); x.restore(); } });
      plane(g, 4.0, 0.9, M({ map: tex(bills), roughness: 0.9 }), -1.8, 2.75, B + 0.04);
      stringLights(g, -5.5, 5.5, 3.0, -1.0, 0.2, 0xff4a4a);
    } else if (th === 'shamrock') {
      const ir = canvas(150, 100, (x, w, h) => { x.fillStyle = '#169b62'; x.fillRect(0, 0, w / 3, h); x.fillStyle = '#fff'; x.fillRect(w / 3, 0, w / 3, h); x.fillStyle = '#ff883e'; x.fillRect(w * 2 / 3, 0, w / 3, h); });
      plane(g, 1.2, 0.8, M({ map: tex(ir), side: THREE.DoubleSide }), -5.97, 2.4, -2.8, Math.PI / 2);
      const sh = canvas(128, 128, (x, w, h) => { x.fillStyle = '#1a3a1a'; x.fillRect(0, 0, w, h); x.fillStyle = '#3aaa4a'; for (let k = 0; k < 3; k++) { x.beginPath(); x.arc(64 + Math.cos(k * 2.09 - 1.57) * 22, 58 + Math.sin(k * 2.09 - 1.57) * 22, 22, 0, 7); x.fill(); } x.fillRect(60, 64, 8, 46); });
      plane(g, 0.7, 0.7, M({ map: tex(sh) }), 3.6, 2.6, B + 0.03);
      sign(g, 'IRISH STOUT', '#0a0a0a', '#e8d8a0', 0.3, 1.95, B + 0.4, 1.6, 0.3);
      for (let k = 0; k < 4; k++) sconce(g, -5.98, 1.9, -0.3 - k * 1.9, Math.PI / 2, 0xffc070);
    } else if (th === 'tincup') {
      for (let k = 0; k < 4; k++) photo(g, -5.97, 2.0, -0.6 - k * 1.5, 0.8, 0.55, Math.PI / 2, 'land', 0x2a1a10);
      const bag = cyl(g, 0.14, 0.14, 0.9, M({ color: 0x1a3a6a, roughness: 0.5 }), 5.6, 0.45, -3.6, 16); for (let k = 0; k < 6; k++) { cyl(g, 0.008, 0.008, 0.5, M({ color: 0xc0c4cc, metalness: 0.9 }), 5.6 + (rnd() - 0.5) * 0.15, 1.1, -3.6 + (rnd() - 0.5) * 0.15, 6); rbox(g, 0.06, 0.06, 0.1, 0.02, M({ color: pick([0xc0c4cc, 0x1a1a1a]), metalness: 0.7 }), 5.6 + (rnd() - 0.5) * 0.15, 1.38, -3.6 + (rnd() - 0.5) * 0.15); }
      cyl(g, 0.01, 0.01, 2.0, M({ color: 0xf4f4f4 }), 4.9, 1.0, B + 0.6, 6); plane(g, 0.4, 0.28, M({ color: 0xd81a1a, side: THREE.DoubleSide }), 5.1, 1.85, B + 0.6);
      const green = plane(g, 3.0, 1.0, M({ color: 0x3a8a3a, roughness: 0.9 }), 3.6, 0.01, -0.6, 0, -Math.PI / 2); green.userData.flat = 1;
    } else if (th === 'iron') {
      plateWall(g, -5.97, 2.0, -2.8, 4.6, 1.6, Math.PI / 2);
      motorcycle(g, 4.2, -4.6, -0.6);
      const xs = new THREE.Group(); xs.position.set(5.9, 2.2, -1.4); xs.rotation.y = -Math.PI / 2; g.add(xs); for (const a of [0.6, -0.6]) { const b2 = box(xs, 1.1, 0.18, 0.03, M({ color: 0xf4f4f4 }), 0, 0, 0); b2.rotation.z = a; }
      plane(g, 12, 1.0, M({ map: tex(canvas(128, 32, (x, w, h) => { const g3 = x.createLinearGradient(0, 0, w, 0); for (let i = 0; i <= 16; i++) g3.addColorStop(i / 16, i % 2 ? '#8a8e94' : '#5a5e64'); x.fillStyle = g3; x.fillRect(0, 0, w, h); }), 8, 1), metalness: 0.7, roughness: 0.4 }), 0, 0.5, B + 0.02);
      stringLights(g, -5.5, 5.5, 2.95, -1.5, 0.2, 0xffb050);
    } else if (th === 'moose') {
      mountedHead(g, 5.3, 2.15, B + 0.05, 0, true); fireplace(g, -4.0, B + 0.32);
      for (const s of [-1, 1]) { const sk = box(g, 0.08, 1.7, 0.03, M({ color: s < 0 ? 0xc01a1a : 0x1a4ac0, roughness: 0.4 }), 5.95, 1.8, -2.4 + s * 0.12); sk.rotation.x = s * 0.25; }
      for (let k = 0; k < 2; k++) { const ss = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.02, 6, 20), M({ color: 0x6a4a24 })); ss.scale.set(1, 1.8, 1); ss.position.set(5.96, 1.6, -3.4 - k * 0.5); ss.rotation.y = Math.PI / 2; g.add(ss); }
    } else if (th === 'penny') {
      rbox(g, 3.0, 0.3, 2.2, 0.03, M({ color: 0x1a1a1e, roughness: 0.5 }), 3.8, 0.15, B + 1.3);
      cyl(g, 0.012, 0.012, 1.4, M({ color: 0x2a2a2a, metalness: 0.7 }), 3.6, 1.0, B + 1.6, 8); cyl(g, 0.18, 0.2, 0.03, M({ color: 0x2a2a2a, metalness: 0.7 }), 3.6, 0.32, B + 1.6, 16); sph(g, 0.04, M({ color: 0x3a3a3a, metalness: 0.8 }), 3.6, 1.72, B + 1.65, 10);
      for (const s of [-1, 1]) rbox(g, 0.5, 1.0, 0.45, 0.03, M({ color: 0x0a0a0a, roughness: 0.6 }), 3.8 + s * 1.2, 0.8, B + 0.6);
      tvSet(g, 3.8, 2.0, B + 0.06, 1.8, 0, 'karaoke'); discoBall(g, 2.0, 2.7, -2.5);
      if (rnd() < 0.8) stander(g, 3.5, B + 1.6, 0.3, { arms: 'down' });
    }
    pokerTable(g, -2.6, -3.0, { felt: T.felt, rail: 0x2a160a, seats: 6, shade: th === 'tap' || th === 'iron' ? 0x1a1a1a : 0x2a4a2a, dealer: false });
    pokerTable(g, 1.8, -2.2, { mine: true, felt: T.felt, rail: 0x2a160a, seats: 6, shade: th === 'tap' || th === 'iron' ? 0x1a1a1a : 0x2a4a2a });
    return { exposure: th === 'dog' || th === 'penny' ? 0.95 : 1.0 };
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
  // the country club's card room: rich panelling, a coffered ceiling, the fireplace with the founder's portrait,
  // bookcases, leather wingbacks, the trophy case, tall windows onto the course at night, chandeliers
  countryclub(g) {
    const r = room(g, { w: 13, d: 10, h: 3.4, floor: PAINT.carpet('#1f3a2a', '#24402e', '#8a7a4a'), wall: PAINT.panel('#5a3418', '#6a4020'), ceil: PAINT.coffer('#e8dcc0', '#c8b890'), trim: 0x2a1608, cornice: 0xc8a060, fillI: 0.6 });
    const B = r.back, gold = M({ color: 0xc8a060, roughness: 0.4, metalness: 0.4 });
    wallPanels(g, -6.5, 6.5, B + 0.02, 0.3, 2.9, M({ color: 0x3a2010, roughness: 0.4 }), 6);
    for (let i = 0; i < 2; i++) { windowOn(g, VIEW.course({}), -4.2 + i * 2.6, 1.75, B + 0.02, 1.6, 2.2, 0, 0x3a2010); curtain(g, -5.15 + i * 2.6, 1.7, B + 0.07, 0.4, 2.8, 0x2a4a2a); curtain(g, -3.25 + i * 2.6, 1.7, B + 0.07, 0.4, 2.8, 0x2a4a2a); }
    fireplace(g, 3.6, B + 0.32); photo(g, 3.6, 2.4, B + 0.64, 0.8, 1.0, 0, 'portrait', 0xc8a060);
    shelves(g, -6.3, -3.0, 2.6, 2.6, Math.PI / 2); shelves(g, 6.3, -3.0, 2.6, 2.6, -Math.PI / 2);
    trophyCase(g, 6.25, -6.3, -Math.PI / 2, 1.6);
    // wingback chairs and a side table by the fire
    for (const s of [-1, 1]) { const wb = new THREE.Group(); wb.position.set(3.6 + s * 1.5, 0, B + 1.5); wb.rotation.y = -s * 0.5 + Math.PI; g.add(wb); const lth = M({ color: 0x5a1a12, roughness: 0.45, envMapIntensity: 0.6 }); rbox(wb, 0.8, 0.45, 0.8, 0.06, lth, 0, 0.32, 0); rbox(wb, 0.8, 0.8, 0.18, 0.08, lth, 0, 0.85, -0.32); for (const t of [-1, 1]) rbox(wb, 0.16, 0.38, 0.8, 0.06, lth, t * 0.36, 0.6, 0); }
    for (let i = 0; i < 4; i++) sconce(g, -6.48, 2.0, -1.2 - i * 2.0, Math.PI / 2);
    chandelier(g, -2.0, 3.05, -4.0, 0.8, 0xfff0c8); chandelier(g, 1.6, 3.05, -2.2, 0.7, 0xfff0c8);
    pokerTable(g, -2.2, -4.3, { felt: 0x1f3c6b, rail: 0x2a1608, lamp: false, seats: 8, rx: 1.3, rz: 0.72, full: 0.85, ceil: 3.4, chair: 0x5a1a12 });
    pokerTable(g, 1.6, -2.0, { mine: true, felt: 0x1f3c6b, rail: 0x2a1608, lamp: false, seats: 8, rx: 1.3, rz: 0.72, ceil: 3.4, chair: 0x5a1a12 });
    return { exposure: 1.0 };
  },
  // the cellar under Bellini's: a brick barrel vault, stone floor, wine racks full to the ceiling, barrels on their sides
  // in cradles, candles, an iron chandelier, the tasting table
  cellar(g) {
    const r = room(g, { w: 7, d: 8, h: 3.6, floor: PAINT.terracotta('#6a5a4a'), wall: PAINT.brick('#8a4a2e', '#5a4a40'), ceil: PAINT.brick('#7a4028', '#4a3a30'), trim: 0x3a2a1a, cornice: 0x3a2a1a, fill: false });
    const B = r.back;
    const vault = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 3.5, 8, 32, 1, true, -Math.PI / 2, Math.PI), M({ map: tex(PAINT.brick('#7a4028', '#4a3a30'), 6, 3), roughness: 0.9, side: THREE.BackSide }));
    vault.rotation.x = -Math.PI / 2; vault.scale.set(1, 1, 0.35); vault.position.set(0, 2.4, -2.0); g.add(vault); vault.userData.flat = 1;
    for (let i = 0; i < 3; i++) { const arch = new THREE.Mesh(new THREE.TorusGeometry(3.45, 0.12, 8, 32, Math.PI), M({ map: tex(PAINT.brick('#9a5a3a', '#5a4a40'), 4, 1), roughness: 0.9 })); arch.position.set(0, 2.4, -0.5 - i * 2.4); arch.scale.y = 0.35; g.add(arch); }
    // wine racks: diamond bins along the walls, bottles' ends showing
    const rackM = M({ map: tex(PAINT.wood('#5a3a1e', '#4a2e16', 10), 1, 1), roughness: 0.7 });
    for (const s of [-1, 1]) { box(g, 0.4, 2.2, 5.0, rackM, s * 3.25, 1.1, -3.0); for (let i = 0; i < 26; i++) for (let j = 0; j < 9; j++) { const b = cyl(g, 0.035, 0.035, 0.08, M({ color: pick([0x1a2a12, 0x3a0a10, 0x1a1a1a, 0x2a1a0a]), roughness: 0.15, envMapIntensity: 1.2 }), s * 3.02, 0.2 + j * 0.23, -5.3 + i * 0.18, 10); b.rotation.z = Math.PI / 2; } }
    // the back wall: a diamond-bin rack, bottle ends packed into each bin
    const dk = M({ color: 0x140c08, roughness: 0.9 }); box(g, 3.2, 2.3, 0.05, dk, 0, 1.15, B + 0.04);
    for (const fx of [-1.6, 1.6]) box(g, 0.08, 2.3, 0.4, rackM, fx, 1.15, B + 0.22); box(g, 3.28, 0.08, 0.4, rackM, 0, 2.3, B + 0.22); box(g, 3.28, 0.08, 0.4, rackM, 0, 0.04, B + 0.22);
    { const X0 = -1.56, X1 = 1.56, Y0 = 0.08, Y1 = 2.26; // diagonal slats, each clipped to the frame
      for (const s of [-1, 1]) for (let c = -4.0; c <= 4.0; c += 0.4) { const pts = []; // line: y - 1.17 = s * (x - c)
        for (const x of [X0, X1]) { const y = 1.17 + s * (x - c); if (y >= Y0 && y <= Y1) pts.push([x, y]); }
        for (const y of [Y0, Y1]) { const x = c + s * (y - 1.17); if (x > X0 && x < X1) pts.push([x, y]); }
        if (pts.length < 2) continue; const [a, b] = pts, len = Math.hypot(b[0] - a[0], b[1] - a[1]); if (len < 0.05) continue;
        const sl = box(g, 0.03, len, 0.36, rackM, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, B + 0.22); sl.rotation.z = -s * Math.PI / 4; } }
    for (let i = -7; i <= 7; i++) for (let j = 0; j < 10; j++) { if (rnd() < 0.12) continue; const bx = i * 0.2 + (j % 2) * 0.1, by = 0.18 + j * 0.2; if (Math.abs(bx) > 1.5) continue; const b = cyl(g, 0.034, 0.034, 0.06, M({ color: pick([0x1a2a12, 0x3a0a10, 0x141414, 0x2a1a0a]), roughness: 0.12, envMapIntensity: 1.3 }), bx, by, B + 0.38, 10); b.rotation.x = Math.PI / 2; }
    // barrels on cradles, an iron chandelier with candles, candles on the barrels
    for (let i = 0; i < 4; i++) { barrel(g, -2.2, 0.08, -4.7 + i * 0.75, true, 0); for (const cx of [-2.4, -2.8]) box(g, 0.1, 0.1, 0.66, rackM, cx, 0.05, -4.7 + i * 0.75); }
    for (let i = 0; i < 3; i++) barrel(g, -2.2, 0.72, -4.32 + i * 0.75, true, 0);
    const ch = new THREE.Group(); ch.position.set(0.8, 2.05, -2.4); g.add(ch); const iron = M({ color: 0x1a1a1a, metalness: 0.7, roughness: 0.5 }); const ring = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.02, 6, 32), iron); ring.rotation.x = Math.PI / 2; ch.add(ring); for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; cyl(ch, 0.02, 0.02, 0.12, M({ color: 0xf4ecd8 }), Math.cos(a) * 0.45, 0.07, Math.sin(a) * 0.45, 8); sph(ch, 0.015, glow(0xffb050, 4), Math.cos(a) * 0.45, 0.15, Math.sin(a) * 0.45, 6); } for (let i = 0; i < 3; i++) cyl(ch, 0.004, 0.004, 0.6, iron, Math.cos(i * 2.1) * 0.3, 0.3, Math.sin(i * 2.1) * 0.3, 4); light(ch, 0xffb050, 2.2, 0, 0.1, 0, 5);
    for (let i = 0; i < 3; i++) { cyl(g, 0.03, 0.03, 0.1 + rnd() * 0.08, M({ color: 0xf4ecd8 }), -1.7, 0.78, -4.0 + i * 0.6, 8); sph(g, 0.015, glow(0xffb050, 4), -1.7, 0.9, -4.0 + i * 0.6, 6); }
    box(g, 0.5, 0.75, 1.6, rackM, -1.7, 0.375, -3.4); light(g, 0xffb050, 1, -2.0, 1.0, -3.6, 3);
    pokerTable(g, 0.6, -2.4, { mine: true, rx: 1.1, rz: 0.62, felt: 0x2f3a2c, rail: 0x3a2616, seats: 6, lamp: false, ceil: 2.2, lampI: 0.8, lampColor: 0xffc070, chair: 0x5a1a12, wood: '#3a2616' });
    return { exposure: 1.15, fog: [0x1a120c, 7, 20] };
  },
  // the back room at Sal's: through the kitchen, a storeroom with one table under a bare bulb; shelves of tomato cans and
  // olive oil, flour sacks, stacked chairs, the kitchen door with its porthole glowing, an old photo of the old man,
  // cigar smoke hanging in the air
  backroom(g) {
    const r = room(g, { w: 8, d: 6.5, h: 2.8, floor: PAINT.tile('#e8e0d0', '#1e1e1e', 12), wall: PAINT.stucco('#cdb898'), ceil: PAINT.tin('#5a4a3a'), trim: 0x3a2a1a, cornice: 0x8a7a6a, fill: false });
    const B = r.back;
    // the kitchen door, its porthole window lit
    rbox(g, 1.0, 2.1, 0.08, 0.02, M({ color: 0x8a6a4a, roughness: 0.5 }), 2.4, 1.05, B + 0.05); const ph = new THREE.Mesh(new THREE.CircleGeometry(0.17, 24), M({ color: 0x000000, emissive: 0xffe0b0, emissiveIntensity: 1.6 })); ph.position.set(2.4, 1.5, B + 0.1); g.add(ph); const pr = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.025, 8, 24), M({ color: 0xc0c4cc, metalness: 0.9, roughness: 0.25 })); pr.position.set(2.4, 1.5, B + 0.1); g.add(pr); box(g, 0.3, 0.08, 0.04, M({ color: 0xc0c4cc, metalness: 0.9 }), 2.4, 1.0, B + 0.11); light(g, 0xffe0b0, 0.8, 2.4, 1.5, B + 0.5, 2.5);
    // steel shelving: tomato cans, olive oil tins, pasta boxes, jars
    const steel = M({ color: 0xb8bcc4, metalness: 0.8, roughness: 0.3 });
    for (const sx of [-2.4, -0.6]) { for (const [px, pz] of [[-0.8, -0.2], [0.8, -0.2], [-0.8, 0.2], [0.8, 0.2]]) box(g, 0.03, 2.0, 0.03, steel, sx + px, 1.0, B + 0.3 + pz); for (let k = 0; k < 4; k++) { const y = 0.15 + k * 0.55; box(g, 1.65, 0.02, 0.44, steel, sx, y, B + 0.3); for (let i = 0; i < 11; i++) { const kind = (k + i) % 4; if (kind === 0) cyl(g, 0.06, 0.06, 0.16, M({ map: tex(canvas(64, 32, (x, w, h) => { x.fillStyle = '#c81a1a'; x.fillRect(0, 0, w, h); x.fillStyle = '#2a8a3a'; x.fillRect(0, 0, w, 6); x.fillStyle = '#f4e8c8'; x.fillRect(10, 10, 44, 14); })), metalness: 0.4, roughness: 0.4 }), sx - 0.7 + i * 0.14, y + 0.09, B + 0.3, 14); else if (kind === 1) box(g, 0.1, 0.24, 0.1, M({ color: 0x2a6a3a, metalness: 0.5, roughness: 0.4 }), sx - 0.7 + i * 0.14, y + 0.13, B + 0.3); else if (kind === 2) box(g, 0.12, 0.2, 0.06, M({ color: 0x1a3a8a, roughness: 0.6 }), sx - 0.7 + i * 0.14, y + 0.11, B + 0.3); else cyl(g, 0.05, 0.05, 0.14, new THREE.MeshPhysicalMaterial({ color: 0x9a6a2a, roughness: 0.1, transmission: 0.3 }), sx - 0.7 + i * 0.14, y + 0.08, B + 0.3, 12); } } }
    // flour sacks, stacked chairs, a wine crate, the wall phone, the old man's photo, a calendar
    for (let i = 0; i < 3; i++) { const sk = rbox(g, 0.5, 0.3, 0.75, 0.12, cloth(0xe8e0cc, 0.95), -3.4, 0.15 + i * 0.28, -3.6 + (i % 2) * 0.05); sk.rotation.y = (rnd() - 0.5) * 0.2; }
    rbox(g, 1.0, 0.72, 0.8, 0.02, M({ color: 0x5a3a20, roughness: 0.6 }), 3.3, 0.36, -2.4); for (let i = 0; i < 2; i++) { const c = chair(g, 3.3, -2.4, 0, 0x6a1a1a); c.position.y = 0.75 + i * 0.05; c.rotation.x = Math.PI; c.position.y += 0.95; }
    for (let i = 0; i < 2; i++) rbox(g, 0.5, 0.3, 0.35, 0.02, M({ map: tex(PAINT.wood('#b88a50', '#9a7040', 8)), roughness: 0.7 }), 3.3, 0.15 + i * 0.3, -3.6);
    photo(g, -0.9, 2.25, B + 0.03, 0.4, 0.5, 0, 'portrait', 0x2a1a10); plane(g, 0.35, 0.5, M({ map: tex(canvas(64, 90, (x, w, h) => { x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); x.fillStyle = '#2a8a3a'; x.fillRect(0, 0, w / 3, 26); x.fillStyle = '#f4f4f4'; x.fillRect(w / 3, 0, w / 3, 26); x.fillStyle = '#c81a1a'; x.fillRect(w * 2 / 3, 0, w / 3, 26); x.strokeStyle = '#ccc'; for (let i = 0; i < 5; i++) { x.beginPath(); x.moveTo(0, 32 + i * 11); x.lineTo(w, 32 + i * 11); x.stroke(); } })) }), 1.3, 1.7, B + 0.02);
    rbox(g, 0.18, 0.28, 0.08, 0.02, M({ color: 0xe8e0c8 }), -3.97, 1.5, -1.2, Math.PI / 2);
    // the bare bulb over the table, the haze
    cyl(g, 0.005, 0.005, 0.9, M({ color: 0x111111 }), 0.6, 2.35, -2.2, 4); const shd = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.14, 24, 1, true), M({ color: 0x2a3a2a, metalness: 0.6, roughness: 0.4, side: THREE.DoubleSide })); shd.position.set(0.6, 1.88, -2.2); g.add(shd); sph(g, 0.05, glow(0xffd080, 4), 0.6, 1.8, -2.2, 10);
    pokerTable(g, 0.6, -2.2, { mine: true, rx: 1.0, rz: 0.6, felt: 0x2f3a2c, rail: 0x3a2616, seats: 6, lamp: false, ceil: 1.9, lampI: 2.0, lampColor: 0xffd080, chair: 0x5a1a12, wood: '#3a2616' });
    return { exposure: 1.3, fog: [0x2a2420, 3, 16] };
  },
  // upstairs at the Golden Dragon: red lacquer and gold, lanterns, a gilt dragon on a black screen, round banquet tables
  // with lazy susans, the aunties playing mahjong in the corner, the fish tank, a lucky cat waving
  dragon(g) {
    const r = room(g, { w: 10, d: 8, h: 2.9, floor: PAINT.carpet('#6a0a0a', '#7a1414', '#c8a050'), wall: PAINT.panel('#7a1410', '#8a1a14'), ceil: PAINT.plain('#3a0a08'), trim: 0xc8a050, cornice: 0xc8a050, fillI: 0.7 });
    const B = r.back, gold = M({ color: 0xd8b050, metalness: 0.9, roughness: 0.3, envMapIntensity: 1.2 });
    // the dragon screen
    const dr = canvas(512, 256, (x, w, h) => { x.fillStyle = '#0a0606'; x.fillRect(0, 0, w, h); x.strokeStyle = '#d8b050'; x.lineWidth = 3; x.strokeRect(8, 8, w - 16, h - 16); x.fillStyle = '#d8b050'; x.strokeStyle = '#d8b050'; x.lineWidth = 16; x.lineCap = 'round'; x.beginPath(); x.moveTo(60, 180); x.bezierCurveTo(140, 40, 220, 220, 300, 100); x.bezierCurveTo(360, 20, 420, 140, 460, 80); x.stroke(); x.lineWidth = 3; for (let i = 0; i < 30; i++) { const t = i / 30; const px = 60 + t * 400, py = 140 + Math.sin(t * 9) * 50; x.beginPath(); x.moveTo(px, py - 10); x.lineTo(px + 8, py - 26); x.stroke(); } x.beginPath(); x.arc(462, 76, 18, 0, 7); x.fill(); x.fillStyle = '#c8102e'; x.beginPath(); x.arc(470, 70, 4, 0, 7); x.fill(); x.fillStyle = '#e8c060'; for (let i = 0; i < 5; i++) { x.beginPath(); x.arc(100 + i * 80, 50 + (i % 2) * 150, 10, 0, 7); x.fill(); } });
    rbox(g, 4.2, 2.0, 0.08, 0.02, gold, 0, 1.55, B + 0.05); plane(g, 4.0, 1.85, M({ map: tex(dr), roughness: 0.3, metalness: 0.3 }), 0, 1.55, B + 0.1);
    for (let i = 0; i < 6; i++) lantern(g, -3.8 + i * 1.5, 2.4 + (i % 2) * 0.12, -2.4 - (i % 3) * 0.9);
    aquarium(g, 3.9, 1.1, B + 0.35, 1.4);
    // the round tables (one set for a late supper, teapot and lazy susan), the mahjong table
    const roundT = (x, z, n, mahjong) => { cyl(g, 0.7, 0.7, 0.04, M({ color: 0xf4ece0, roughness: 0.8 }), x, 0.76, z, 32); cyl(g, 0.72, 0.72, 0.25, M({ color: 0xf4ece0, roughness: 0.9 }), x, 0.64, z, 32); cyl(g, 0.08, 0.1, 0.6, M({ color: 0x3a1a0a }), x, 0.3, z, 12);
      if (mahjong) { for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; for (let i = 0; i < 9; i++) rbox(g, 0.035, 0.05, 0.026, 0.005, M({ color: 0xf8f4e8, roughness: 0.3 }), x + Math.cos(a) * 0.32 + Math.sin(a) * (i - 4) * 0.04, 0.81, z + Math.sin(a) * 0.32 - Math.cos(a) * (i - 4) * 0.04); } }
      else { cyl(g, 0.3, 0.3, 0.02, new THREE.MeshPhysicalMaterial({ color: 0xffffff, transmission: 0.8, roughness: 0.05 }), x, 0.8, z, 24); const tp = sph(g, 0.08, M({ color: 0xf4f0e8, roughness: 0.2 }), x, 0.88, z, 12); tp.scale.y = 0.8; for (let k = 0; k < 4; k++) { const bw = sph(g, 0.06, M({ color: 0xf4f0e8, roughness: 0.2 }), x + Math.cos(k) * 0.5, 0.8, z + Math.sin(k) * 0.5, 10); bw.scale.y = 0.5; } }
      for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2, px = x + Math.cos(a) * 1.0, pz = z + Math.sin(a) * 1.0, f = Math.atan2(x - px, z - pz); chair(g, px, pz, f, 0x7a1a14); if (rnd() < (mahjong ? 1 : 0.5 * occ())) person(g, px - Math.cos(a) * 0.05, pz - Math.sin(a) * 0.05, f, { lod: 0 }); } };
    roundT(-3.3, -4.4, 4, true); roundT(3.2, -3.6, 6, false);
    // the lucky cat, red envelopes, a calligraphy scroll
    const cat = sph(g, 0.1, gold, -4.6, 1.42, B + 0.25, 14); cat.scale.set(1, 1.2, 0.9); sph(g, 0.08, gold, -4.6, 1.6, B + 0.27, 12); seg(g, [-4.53, 1.5, B + 0.3], [-4.5, 1.66, B + 0.32], 0.025, 0.022, gold); box(g, 0.5, 0.03, 0.3, M({ color: 0x3a1a0a }), -4.6, 1.31, B + 0.2);
    const scroll = canvas(96, 320, (x, w, h) => { x.fillStyle = '#efe4c8'; x.fillRect(0, 0, w, h); x.fillStyle = '#1a1a1a'; x.font = '900 52px serif'; x.textAlign = 'center'; ['福', '龍', '運', '財'].forEach((c, i) => x.fillText(c, w / 2, 70 + i * 72)); x.fillStyle = '#c8102e'; x.fillRect(w / 2 - 10, h - 30, 20, 20); });
    plane(g, 0.45, 1.5, M({ map: tex(scroll) }), -4.97, 1.7, -2.4, Math.PI / 2); plane(g, 0.45, 1.5, M({ map: tex(scroll) }), 4.97, 1.7, -2.4, -Math.PI / 2);
    pokerTable(g, 0.4, -2.2, { mine: true, felt: 0x2f3a2c, rail: 0x3a0a0a, seats: 6, lamp: false, ceil: 2.9, chair: 0x7a1a14, wood: '#3a0a06' });
    light(g, 0xffb070, 2.2, 0.4, 2.5, -2.2, 5);
    return { exposure: 1.0 };
  },
  // behind Rosa's Cantina: warm stucco with a band of painted tile, terracotta floor, wooden beams, paper flags and
  // string lights, a little bar of tequila, stacked beer crates, a guitar on the wall, devotional candles, cacti
  cantina(g) {
    const r = room(g, { w: 10, d: 8, h: 2.9, floor: PAINT.terracotta('#b8603a'), wall: PAINT.stucco('#e0a050'), ceil: PAINT.plain('#e8d0a8'), trim: 0x5a3a20, cornice: 0x5a3a20, fillI: 0.7 });
    const B = r.back;
    const talavera = canvas(256, 64, (x, w, h) => { for (let i = 0; i < 8; i++) { x.fillStyle = '#f4f0e6'; x.fillRect(i * 32, 0, 32, 32); x.fillRect(i * 32, 32, 32, 32); for (let j = 0; j < 2; j++) { const cx = i * 32 + 16, cy = j * 32 + 16; x.fillStyle = (i + j) % 2 ? '#1a4a9a' : '#e8a020'; x.beginPath(); for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4, rr = k % 2 ? 6 : 13; x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } x.fill(); x.fillStyle = '#c81a1a'; x.beginPath(); x.arc(cx, cy, 3, 0, 7); x.fill(); } } });
    plane(g, 10, 0.9, M({ map: tex(talavera, 5, 1), roughness: 0.25 }), 0, 0.45, B + 0.01); plane(g, 8, 0.9, M({ map: tex(talavera, 4, 1), roughness: 0.25 }), -4.99, 0.45, -2, Math.PI / 2); plane(g, 8, 0.9, M({ map: tex(talavera, 4, 1), roughness: 0.25 }), 4.99, 0.45, -2, -Math.PI / 2);
    for (let i = 0; i < 7; i++) box(g, 10, 0.18, 0.2, M({ map: tex(PAINT.wood('#5a3a20', '#4a2a14', 8), 3, 1), roughness: 0.8 }), 0, 2.8, 1.5 - i * 1.2);
    papelPicado(g, -4.8, 4.8, 2.6, -1.6); papelPicado(g, -4.8, 4.8, 2.55, -3.6);
    stringLights(g, -4.8, 4.8, 2.7, -2.6, 0.3, 0xffc070);
    bar(g, -2.2, B + 1.25, 3.4, { wood: '#7a4a24', crowd: 0.4, mirror: false, stool: 0x2a6ac8 });
    neon(g, 'Tequila', '#3aff8a', 2.6, 2.3, B + 0.04, 72);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) { const cr = rbox(g, 0.55, 0.3, 0.38, 0.02, M({ map: tex(canvas(64, 32, (x, w, h) => { x.fillStyle = pick(['#e8c020', '#2a5aa8', '#c81a1a']); x.fillRect(0, 0, w, h); x.fillStyle = '#fff'; x.font = '700 10px sans-serif'; x.fillText('CERVEZA', 8, 20); })), roughness: 0.6 }), 4.2, 0.15 + i * 0.3, B + 0.4 + j * 0.42); }
    // the guitar on the wall, a sombrero and serape, devotional candles on a shelf, cacti in pots
    const gt = new THREE.Group(); gt.position.set(-4.95, 1.7, -3.4); gt.rotation.y = Math.PI / 2; g.add(gt); const body = sph(gt, 0.2, M({ color: 0xc88a4a, roughness: 0.4 }), 0, -0.1, 0, 16); body.scale.set(1, 1.2, 0.3); const b2 = sph(gt, 0.16, body.material, 0, 0.18, 0, 16); b2.scale.set(1, 1, 0.3); box(gt, 0.06, 0.6, 0.03, M({ color: 0x3a2010 }), 0, 0.55, 0.03); sph(gt, 0.05, M({ color: 0x1a1a1a }), 0, -0.02, 0.06, 10);
    const sombrero = cyl(g, 0.4, 0.4, 0.03, M({ color: 0xd8b878, roughness: 0.9 }), -4.95, 2.2, -1.8, 24); sombrero.rotation.z = Math.PI / 2; const crown = cyl(g, 0.14, 0.18, 0.2, M({ color: 0xd8b878, roughness: 0.9 }), -4.88, 2.2, -1.8, 16); crown.rotation.z = Math.PI / 2;
    plane(g, 0.7, 1.4, M({ map: tex(canvas(64, 128, (x, w, h) => { const cs = ['#c81a1a', '#e8a020', '#2a8a3a', '#1a4a9a', '#e84a8a', '#1a1a1a']; for (let i = 0; i < h; i += 6) { x.fillStyle = cs[(i / 6 | 0) % 6]; x.fillRect(0, i, w, 6); } })), side: THREE.DoubleSide }), -4.96, 1.4, -1.0, Math.PI / 2);
    box(g, 1.2, 0.04, 0.2, M({ color: 0x5a3a20 }), 4.9, 1.5, -1.5, -Math.PI / 2); for (let i = 0; i < 5; i++) { cyl(g, 0.035, 0.035, 0.18, M({ color: pick([0xc81a1a, 0xe8c020, 0xf4f4f4]), emissive: 0xff8a20, emissiveIntensity: 0.25 }), 4.9, 1.62, -2.0 + i * 0.25, 10); sph(g, 0.012, glow(0xffa040, 3), 4.9, 1.74, -2.0 + i * 0.25, 6); } light(g, 0xffa040, 0.6, 4.6, 1.8, -1.5, 2.5);
    for (const [cx, cz] of [[-4.4, -5.4], [3.0, -5.4]]) { cyl(g, 0.18, 0.14, 0.3, M({ color: 0xb8603a }), cx, 0.15, cz, 14); cyl(g, 0.08, 0.08, 0.7, M({ color: 0x3a7a3a, roughness: 0.7 }), cx, 0.65, cz, 10); for (const s of [-1, 1]) seg(g, [cx, 0.7, cz], [cx + s * 0.18, 0.95, cz], 0.05, 0.045, M({ color: 0x3a7a3a, roughness: 0.7 })); }
    pokerTable(g, 0.8, -2.3, { mine: true, felt: 0x2f3a2c, rail: 0x5a3a20, seats: 6, shade: 0x8a3a1a, chair: 0x2a6ac8, wood: '#7a4a24' });
    return { exposure: 1.0 };
  },
  // the back of Lucky's Diner after closing: the counter and its stools, pie under glass domes, coffee on the burners,
  // the menu board, booths along the window onto the empty street, a neon clock, chrome and checkerboard
  diner(g) {
    const r = room(g, { w: 11, d: 8, h: 2.8, floor: PAINT.tile('#f2f0ea', '#1a1a1a', 12), wall: PAINT.plain('#9ad8c8'), ceil: PAINT.plain('#f0eee8'), trim: 0xc8ccd4, cornice: 0xc8ccd4, fillI: 0.8 });
    const B = r.back, chrome = M({ color: 0xd0d4dc, metalness: 0.95, roughness: 0.15, envMapIntensity: 1.3 }), red = M({ color: 0xc81a2a, roughness: 0.35, envMapIntensity: 0.6 });
    plane(g, 11, 1.1, M({ map: tex(canvas(256, 64, (x, w, h) => { x.fillStyle = '#b8bcc4'; x.fillRect(0, 0, w, h); for (let i = 0; i < 4; i++) for (let j = -1; j < 9; j++) { x.fillStyle = '#fbfaf6'; x.fillRect(j * 32 + (i % 2) * 16 + 1, i * 16 + 1, 30, 14); } }), 6, 1), roughness: 0.2 }), 0, 0.55, B + 0.01); box(g, 11, 0.1, 0.04, red, 0, 1.12, B + 0.02);
    // the counter: chrome trim, a red top, stools; behind it the pie case, coffee pots, the menu board, the neon clock
    rbox(g, 6.4, 1.0, 0.65, 0.03, M({ color: 0xe8e4dc, roughness: 0.4 }), -1.2, 0.5, B + 1.6); box(g, 6.4, 0.06, 0.04, chrome, -1.2, 0.3, B + 1.94); box(g, 6.5, 0.05, 0.8, red, -1.2, 1.03, B + 1.6);
    for (let i = 0; i < 7; i++) { const sx = -4.0 + i * 0.9; cyl(g, 0.2, 0.2, 0.09, red, sx, 0.78, B + 2.25, 20); cyl(g, 0.21, 0.21, 0.03, chrome, sx, 0.73, B + 2.25, 20); cyl(g, 0.035, 0.035, 0.74, chrome, sx, 0.37, B + 2.25, 10); cyl(g, 0.2, 0.22, 0.03, chrome, sx, 0.015, B + 2.25, 16); if (rnd() < 0.25 * occ() + 0.1) person(g, sx, B + 2.25, Math.PI, { hip: 0.83, arms: 'bar', lod: 1 }); }
    box(g, 6.4, 0.9, 0.5, M({ color: 0xc8ccd4, metalness: 0.8, roughness: 0.25 }), -1.2, 0.45, B + 0.3); box(g, 6.4, 0.04, 0.55, M({ color: 0x8a8e94, metalness: 0.8 }), -1.2, 0.92, B + 0.3);
    for (let i = 0; i < 3; i++) { const dome = sph(g, 0.17, new THREE.MeshPhysicalMaterial({ color: 0xffffff, transmission: 0.85, roughness: 0.05, transparent: true, opacity: 0.4 }), -3.6 + i * 0.55, 1.08, B + 1.6, 16); dome.scale.y = 0.85; const pie = cyl(g, 0.14, 0.12, 0.06, M({ color: pick([0xc87a3a, 0xa01a2a, 0xe8d090]), roughness: 0.6 }), -3.6 + i * 0.55, 1.09, B + 1.6, 16); cyl(g, 0.17, 0.17, 0.02, chrome, -3.6 + i * 0.55, 1.06, B + 1.6, 18); }
    for (let i = 0; i < 2; i++) { rbox(g, 0.3, 0.35, 0.25, 0.03, M({ color: 0x1a1a1a }), 0.8 + i * 0.4, 1.12, B + 0.3); const pot = sph(g, 0.08, new THREE.MeshPhysicalMaterial({ color: 0x3a1a0a, transmission: 0.3, roughness: 0.05 }), 0.8 + i * 0.4, 1.02, B + 0.4, 12); pot.scale.y = 1.2; }
    const menu = canvas(512, 160, (x, w, h) => { x.fillStyle = '#111'; x.fillRect(0, 0, w, h); x.fillStyle = '#f4f0e8'; x.font = '700 18px monospace'; [['EGGS ANY STYLE', '4.95'], ['PANCAKES', '5.50'], ['PATTY MELT', '7.25'], ['CHEESEBURGER', '6.95'], ['PIE A LA MODE', '3.75'], ['COFFEE', '.95']].forEach((l, i) => { x.fillText(l[0], 14 + (i % 2) * 256, 34 + Math.floor(i / 2) * 44); x.fillText(l[1], 180 + (i % 2) * 256, 34 + Math.floor(i / 2) * 44); }); });
    plane(g, 3.6, 1.1, M({ map: tex(menu), emissive: 0xffffff, emissiveMap: tex(menu), emissiveIntensity: 0.4 }), -1.6, 2.15, B + 0.02);
    const clk = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.025, 8, 32), glow(0x3ad8ff, 2.5)); clk.position.set(2.6, 2.15, B + 0.06); g.add(clk); cyl(g, 0.28, 0.28, 0.03, M({ color: 0xf4f0e8 }), 2.6, 2.15, B + 0.04, 32).rotation.x = Math.PI / 2; box(g, 0.012, 0.18, 0.01, M({ color: 0x111111 }), 2.6, 2.2, B + 0.07); box(g, 0.13, 0.012, 0.01, M({ color: 0x111111 }), 2.65, 2.15, B + 0.07);
    neon(g, 'EAT', '#ff3a3a', 4.1, 2.2, B + 0.04, 90); neon(g, 'PIE', '#3ad8ff', 4.1, 1.55, B + 0.04, 80);
    // booths along the window onto the street, a jukebox at the end
    windowOn(g, VIEW.city({ towers: 14, tall: 0.25, water: false, sky2: '#3a2a5a' }), -5.47, 1.55, -2.6, 5.0, 1.4, Math.PI / 2, 0xc8ccd4);
    for (let i = 0; i < 3; i++) booth(g, -4.7, -0.8 - i * 1.8, Math.PI / 2, 0xc81a2a, 0xc8ccd4);
    for (let i = 0; i < 3; i++) pendant(g, -4.5, 2.1, -0.8 - i * 1.8, 0xfff0d8, 0xc81a2a);
    jukebox(g, 5.0, -2.0, -Math.PI / 2);
    for (let i = 0; i < 3; i++) { const d = new THREE.Mesh(new THREE.CircleGeometry(0.22, 24), glow(0xfff8ec, 1.8)); d.rotation.x = Math.PI / 2; d.position.set(-1.5 + i * 2.5, 2.795, -2.5); g.add(d); light(g, 0xfff8ec, 1.2, -1.5 + i * 2.5, 2.6, -2.5, 6); }
    pokerTable(g, 1.6, -2.3, { mine: true, felt: 0x2f3a2c, rail: 0xc8ccd4, seats: 6, lamp: false, ceil: 2.8, chair: 0xc81a2a, wood: '#c8ccd4', wood2: '#a8acb4' });
    return { exposure: 1.0 };
  },
  // the Prairie Card Club: a Quonset hut off the county road, corrugated steel arching overhead, a lunch counter with pie,
  // barn lights over the tables, pickups under the yard light, the grain elevator and the whole sky out the end window
  cardroom(g, o) {
    const W = 12, D = 18, H = 1.4, R = W / 2, Zc = 2 - D / 2, B = 2 - D, P2 = Math.PI / 2;
    const corr = canvas(256, 256, (x, w, h) => { x.fillStyle = '#9a9ca0'; x.fillRect(0, 0, w, h); for (let i = 0; i < w; i += 16) { x.fillStyle = 'rgba(255,255,255,.18)'; x.fillRect(i, 0, 6, h); x.fillStyle = 'rgba(0,0,0,.28)'; x.fillRect(i + 9, 0, 5, h); } noise(x, w, h, 0.1, 5000); }); corr.__kind = 'concrete';
    shell(g, { w: W, d: D, h: H, floor: PAINT.concrete('#8a8a86'), wall: corr, ceil: null, back: false, front: false, trim: 0x5a5a5a, fillI: 1.0, fillC: 0xffe0c0 });
    const steel = M({ map: tex(corr, 6, 1), roughness: 0.55, metalness: 0.3 }); vault(g, 0, H, Zc, W, D, M({ map: tex(corr, 12, 8), roughness: 0.55, metalness: 0.3 }));
    for (let i = 0; i <= 9; i++) { const rb = new THREE.Mesh(new THREE.TorusGeometry(R - 0.05, 0.06, 6, 36, Math.PI), M({ color: 0x5a5a60, metalness: 0.6, roughness: 0.5 })); rb.position.set(0, H, 2 - i * 2); g.add(rb); }
    const endM = M({ map: tex(corr, 4, 3), roughness: 0.55, metalness: 0.3 }); tympanum(g, W, H, R, endM, 0, B, 0); tympanum(g, W, H, R, endM, 0, 2, Math.PI);
    // the end window on the prairie, the yard light and the pickups, the road
    const view = VIEW.prairie(); glassWall(g, 0, 2.6, B + 0.03, 7.6, 2.6, 0); for (let i = -2; i <= 2; i++) box(g, 0.08, 2.6, 0.1, M({ color: 0x3a3a3a }), i * 1.9, 2.6, B + 0.08); box(g, 7.8, 0.1, 0.12, M({ color: 0x3a3a3a }), 0, 3.95, B + 0.08); box(g, 8, 0.1, 0.3, M({ color: 0x5a5a5a, metalness: 0.5 }), 0, 1.25, B + 0.1);
    ground(g, 40, 20, M({ map: tex(canvas(128, 128, (x, w, h) => { x.fillStyle = '#5a5248'; x.fillRect(0, 0, w, h); noise(x, w, h, 0.2, 4000); }), 12, 6), roughness: 0.95 }), 0, B - 10, -0.02);
    for (const [x, z, ry, c, pk] of [[-4.6, B - 4.5, 0.4, 0x8a1a1a, true], [1.0, B - 5.5, -0.3, 0xd8d8d8, true], [6.0, B - 4.0, 0.2, 0x1a3a6a, false]]) car(g, x, z, ry, c, pk);
    const yl = new THREE.Group(); yl.position.set(-1.5, 0, B - 3.0); g.add(yl); cyl(yl, 0.1, 0.12, 7, M({ color: 0x3a3a3a }), 0, 3.5, 0, 8); box(yl, 1.0, 0.08, 0.08, M({ color: 0x3a3a3a }), 0.5, 6.9, 0); sph(yl, 0.2, glow(0xd8e8ff, 3), 1.0, 6.8, 0, 10); light(yl, 0xd8e8ff, 3.5, 1.0, 6.4, 0, 14);
    backdrop(g, view, 0, Zc, 40, 16, -5, Math.PI * 0.45, Math.PI * 1.55); skyDome(g, 0, Zc, 70, [[0, '#04061c'], [0.6, '#141a44'], [1, '#3a3a6a']]);
    // the lunch counter and its pie case, stools, the jukebox, the posters, the flag, a potbelly stove
    bar(g, -W / 2 + 1.6, -4.0, 5.5, { ry: P2, wood: '#e8dcc8', wood2: '#d8ccb8', top: 0xc8a050, mirror: false, crowd: 0.5 }); vitrine(g, -W / 2 + 1.6, -7.6, 1.6, P2);
    jukebox(g, W / 2 - 0.7, -2.0, -P2); flag(g, W / 2 - 0.08, 2.8, -6.0, -P2);
    for (let i = 0; i < 3; i++) plane(g, 0.7, 1.0, M({ map: tex(canvas(70, 100, (x, w, h) => { x.fillStyle = pick(['#f4e8c0', '#e8d8b0']); x.fillRect(0, 0, w, h); x.fillStyle = pick(['#8a1a1a', '#1a3a8a', '#2a6a2a']); x.font = '900 14px sans-serif'; x.textAlign = 'center'; x.fillText(pick(['COUNTY FAIR', 'RODEO', 'TRACTOR PULL']), w / 2, 24); x.fillRect(10, 36, w - 20, 40); x.fillStyle = '#f4e8c0'; x.font = '700 9px sans-serif'; x.fillText(pick(['AUG 14-17', 'JULY 4TH', 'SEPT 2']), w / 2, 90); })), roughness: 0.9 }), W / 2 - 0.04, 2.0, -8.0 - i * 1.6, -P2);
    const stove = new THREE.Group(); stove.position.set(W / 2 - 1.0, 0, -13.0); g.add(stove); cyl(stove, 0.35, 0.4, 0.9, M({ color: 0x1a1a1a, roughness: 0.5 }), 0, 0.6, 0, 16); cyl(stove, 0.1, 0.1, 5, M({ color: 0x1a1a1a }), 0, 3.4, 0, 10); plane(stove, 0.25, 0.18, glow(0xff8a20, 2.5), 0, 0.5, 0.41); light(stove, 0xff9a30, 1.4, 0, 0.7, 0.6, 5);
    sign(g, 'PRAIRIE CARD CLUB', '#8a1a1a', '#f4e8c0', 0, 3.2, 1.95, 4.2, 0.6, Math.PI);
    // barn lights over the tables
    const barn = (x, z) => { for (const s of [-1, 1]) { cyl(g, 0.006, 0.006, H + R - 2.6 - 1.0, M({ color: 0x1a1a1a }), x + s * 0.7, (H + R - 1.0 + 2.6) / 2, z, 4); const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.3, 0.2, 20, 1, true), M({ color: 0x2a5a2a, side: THREE.DoubleSide, roughness: 0.4 })); sh.position.set(x + s * 0.7, 2.6, z); g.add(sh); sph(g, 0.06, glow(0xfff0d0, 3), x + s * 0.7, 2.52, z, 8); } light(g, 0xfff0d0, 2.4, x, 2.4, z, 7); };
    pokerTable(g, 0.8, -2.8, { mine: true, felt: 0x1f6b45, rail: 0x1a0a0a, seats: 9, rx: 1.4, rz: 0.8, lamp: false, ceil: 2.6 }); barn(0.8, -2.8);
    for (const [x, z, ry] of [[-0.8, -7.4, 0.2], [1.0, -11.6, -0.2]]) { pokerTable(g, x, z, { felt: 0x1f6b45, rail: 0x1a0a0a, seats: 9, rx: 1.4, rz: 0.8, ry, lamp: false, full: 0.85, ceil: 2.6 }); barn(x, z); }
    if (STAGE !== 'final') { stander(g, -3.4, -11.0, 0.8, { arms: 'crossed', lod: 1 }); stander(g, 3.6, -0.4, -2.4, { arms: 'pockets', lod: 1 }); }
    return { exposure: 1.05, cam: [[-3.8, 1.5, 1.2], [1.0, 1.8, -12]] };
  },
  // the championship ballroom, made over for TV: an LED wall behind the stage with the event's name, the feature table on its
  // lit riser under a lighting truss, bleachers either side, the clock screens hanging, the ballroom's own chandeliers over
  // dozens of tables, sponsor banners down the walls
  ballroom(g, o) {
    const HALL = o.hall || 'vegas', P2 = Math.PI / 2;
    const r = room(g, { w: 26, d: 20, h: 7, floor: PAINT.carpet(o.carpet || '#1a1030', o.carpet2 || '#2a1a50', o.carpet3 || '#c8a050', 'scroll'), wall: HALL === 'omaha' ? PAINT.concrete('#4a4a52') : HALL === 'toronto' ? PAINT.damask('#e8dcc0', '#f4ead4') : PAINT.panel('#1a1424', '#221a2e'), ceil: HALL === 'omaha' ? PAINT.plain('#22222a') : HALL === 'toronto' ? PAINT.coffer('#f4ecd8', '#c8a050') : PAINT.coffer('#1a1424', '#120e1a'), trim: 0x0a0a0a, cornice: HALL === 'toronto' ? 0xc8a050 : 0x2a2234, fillI: HALL === 'toronto' ? 0.9 : 0.6 });
    const B = r.back, tm = M({ color: 0x2a2a2e, metalness: 0.8, roughness: 0.35 });
    // the LED wall and the stage
    const led = canvas(1024, 384, (x, w, h) => { const g2 = x.createLinearGradient(0, 0, w, h); g2.addColorStop(0, (o.screen || ['#7a0f1c', '#2a0408'])[0]); g2.addColorStop(1, (o.screen || ['#7a0f1c', '#2a0408'])[1]); x.fillStyle = g2; x.fillRect(0, 0, w, h); x.strokeStyle = 'rgba(255,255,255,.08)'; for (let i = 0; i < 30; i++) { x.beginPath(); x.arc(w / 2, h * 1.6, 200 + i * 40, 0, 7); x.stroke(); } x.fillStyle = '#ffd84d'; x.textAlign = 'center'; x.font = '900 72px Georgia'; let fs = 72; while (x.measureText(o.title || 'WORLD CHAMPIONSHIP').width > w * 0.85 && fs > 30) { fs -= 4; x.font = '900 ' + fs + 'px Georgia'; } x.fillText(o.title || 'WORLD CHAMPIONSHIP', w / 2, h * 0.6); x.fillStyle = '#fff'; x.font = '700 34px sans-serif'; x.fillText('FINAL TABLE', w / 2, h * 0.8); for (let i = 0; i < w; i += 6) { x.fillStyle = 'rgba(0,0,0,.15)'; x.fillRect(i, 0, 1, h); } });
    plane(g, 14, 4.6, new THREE.MeshBasicMaterial({ map: tex(led) }), 0, 2.9, B + 0.05); light(g, 0xffd8c0, 3, 0, 3, B + 2.5, 10);
    const sy = 0.5, sz = -11.5; rbox(g, 8, sy, 5, 0.05, M({ color: 0x0c0a12, roughness: 0.6 }), 0, sy / 2 - 0.01, sz); plane(g, 7.9, 4.9, M({ map: tex(PAINT.carpet('#14101c', '#1c1428', '#3a2a50', 'check'), 4, 2), roughness: 0.95 }), 0, sy + 0.002, sz, 0, -Math.PI / 2); box(g, 8.04, 0.04, 0.04, glow(0x3ad8ff, 2.5), 0, sy - 0.02, sz + 2.5); for (const s of [-1, 1]) box(g, 0.04, 0.04, 5, glow(0x3ad8ff, 2.5), s * 4.0, sy - 0.02, sz);
    pokerTable(g, 0, sz, { y: sy, mine: STAGE === 'final', felt: o.felt || 0x7a0f1c, rail: 0x0a0a0a, seats: 9, rx: 1.6, rz: 0.9, lamp: false, full: 1, ceil: 5.5 });
    // the truss over the stage, its lamps; the hanging clocks
    box(g, 10, 0.3, 0.3, tm, 0, 5.6, sz - 2.2); box(g, 10, 0.3, 0.3, tm, 0, 5.6, sz + 2.2); for (const s of [-1, 1]) box(g, 0.3, 0.3, 4.7, tm, s * 5, 5.6, sz);
    for (let i = 0; i < 6; i++) for (const t of [-1, 1]) { const x = -4 + i * 1.6; cyl(g, 0.1, 0.14, 0.26, M({ color: 0x111111, metalness: 0.5 }), x, 5.35, sz + t * 2.2, 12); sph(g, 0.08, glow(0xfff4e0, 4), x, 5.2, sz + t * 2.2, 8); }
    for (const s of [-1, 1]) { tvSet(g, s * 6.2, 3.7, -7.5, 2.4, 0, 'clock'); for (const k of [-1, 1]) cyl(g, 0.01, 0.01, 2.8, M({ color: 0x111111 }), s * 6.2 + k * 0.9, 5.7, -7.5, 4); }
    // bleachers either side of the stage, full of people watching
    for (const s of [-1, 1]) bleachers(g, s * 8.2, sz + 0.5, 6, 6, -s * Math.PI / 2, STAGE === 'final' ? 0.92 : 0.6);
    // the ballroom: chandeliers, sponsor banners, rows of tables
    if (HALL === 'omaha') {   // the convention centre: white trusses, high-bays, a glass wall on the river and the lit bridge
      const wt = M({ color: 0xe8e8ec, metalness: 0.4, roughness: 0.5 }); for (let j = 0; j < 4; j++) { const z = 0.5 - j * 5; box(g, 26, 0.3, 0.2, wt, 0, 6.6, z); box(g, 26, 0.1, 0.1, wt, 0, 5.8, z); for (let i = 0; i < 13; i++) { const d = box(g, 0.06, 1.0, 0.06, wt, -12 + i * 2, 6.2, z); d.rotation.z = i % 2 ? 0.8 : -0.8; } for (let i = 0; i < 5; i++) { const x = -10 + i * 5; cyl(g, 0.3, 0.45, 0.4, M({ color: 0x8a8e94, metalness: 0.8, roughness: 0.3 }), x, 5.5, z, 16); const d2 = new THREE.Mesh(new THREE.CircleGeometry(0.4, 16), glow(0xf4f8ff, 2.4)); d2.rotation.x = P2; d2.position.set(x, 5.29, z); g.add(d2); } }
      const view = VIEW.omaha(); windowOn(g, view, -12.98, 3.2, -8, 18, 5.6, P2, 'none'); for (let i = 0; i < 10; i++) box(g, 0.1, 6.0, 0.1, M({ color: 0x1a1a1e, metalness: 0.6 }), -12.9, 3.0, 0.5 - i * 2); box(g, 0.1, 0.16, 20, M({ color: 0x1a1a1e, metalness: 0.6 }), -12.9, 6.0, -8); for (let i = 0; i < 4; i++) light(g, 0x3a8aff, 0.9, -12.0, 0.3, -2 - i * 4.5, 5);
      for (let i = 0; i < 3; i++) light(g, 0xf4f8ff, 4, -6 + i * 6, 5.5, -3, 16);
    } else if (HALL === 'toronto') {   // the hotel ballroom: crystal, gilt panels, tall arched windows on the tower, drapes
      for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) chandelier(g, -8 + i * 8, 6.0, -1.5 - j * 4.5, 1.5, 0xffe8c8);
      const gold = M({ color: 0xc8a050, metalness: 0.95, roughness: 0.25 }), view = VIEW.toronto();
      for (let i = 0; i < 4; i++) { const z = -0.5 - i * 4.4; archWindow(g, view, 12.97, 3.0, z, 2.2, 4.4, -P2, 0xc8a050); curtain(g, 12.9, 2.6, z - 1.5, 0.7, 5.0, 0x7a0f1c, -P2); curtain(g, 12.9, 2.6, z + 1.5, 0.7, 5.0, 0x7a0f1c, -P2); }
      const wp = new THREE.Group(); wp.position.set(-12.97, 0, -8); wp.rotation.y = P2; g.add(wp); wallPanels(wp, -9.5, 9.5, 0, 1.4, 5.6, gold, 7); wallPanels(wp, -9.5, 9.5, 0, 0.2, 1.1, gold, 9); for (let i = 0; i < 6; i++) sconce(g, -12.95, 3.4, -0.5 - i * 3.2, P2, 0xffe0b0);
      light(g, 0xfff0dc, 3, -6, 5.5, -5, 16); light(g, 0xfff0dc, 3, 6, 5.5, -5, 16);
    } else for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) chandelier(g, -8 + i * 8, 6.2, -1.5 - j * 4.5, 1.1, 0xffe8c8);
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) hangBanner(g, o.banner || 'MAIN EVENT', s * 12.9, 4.6, -1.5 - i * 4.0, 2.6, 1.4, o.bannerBg || '#7a0f1c', '#ffd84d', -s * Math.PI / 2);
    const mp = o.mine || [2.6, -1.4];
    for (let i = 0; i < 5; i++) for (let j = 0; j < 2; j++) { const x = -10 + i * 5, z = -3.0 - j * 3.4; if (Math.abs(x - mp[0]) < 3 && j === 0) continue; pokerTable(g, x, z, { felt: o.felt2 || 0x1f6b45, rail: 0x0a0a0a, seats: 9, rx: 1.4, rz: 0.8, full: 0.95, lamp: false, ceil: 6 }); }
    pokerTable(g, mp[0], mp[1], { mine: STAGE !== 'final', felt: o.felt2 || 0x1f6b45, rail: 0x0a0a0a, seats: 9, rx: 1.4, rz: 0.8, lamp: false, ceil: 6 });
    light(g, 0xfff0dc, 3, -6, 5, -3, 14); light(g, 0xfff0dc, 3, 6, 5, -3, 14);
    return { exposure: HALL === 'toronto' ? 1.0 : 1.05, fog: HALL === 'omaha' ? [0x14161e, 14, 40] : HALL === 'toronto' ? null : [0x0e0a18, 12, 34], cam: o.cam || [[-4.6, 1.6, 1.8], [2.0, 1.2, -9.0]] };
  },
  // a mountain lodge's card room. Aspen: log walls, a river-stone fireplace to the rafters, antler chandeliers, skis, snow
  // falling past the big window. Sedona: adobe, vigas and latillas overhead, a kiva fireplace, red rock out the window
  lodge(g, o) {
    const T = o.theme || (o.snow ? 'aspen' : 'sedona'), A = T === 'aspen';
    const latilla = canvas(256, 256, (x, w, h) => { for (let i = 0; i < w; i += 8) { const c = new THREE.Color('#b8956a').offsetHSL(0, 0, (rnd() - 0.5) * 0.12); x.fillStyle = '#' + c.getHexString(); x.fillRect(i, 0, 7, h); x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(i + 7, 0, 1, h); } });
    const r = room(g, { w: 14, d: 10, h: 4.4, floor: A ? PAINT.wood('#6a4020', '#4a2a14', 30) : PAINT.terracotta('#b8603a'), wall: A ? PAINT.logs('#8a5a30', '#6a4020') : PAINT.adobe('#d89a68'), ceil: A ? PAINT.wood('#5a3a20', '#3a2410', 50) : latilla, trim: A ? 0x3a2410 : 0x8a5030, cornice: A ? 0x3a2410 : 0xc8885a, fillI: A ? 1.0 : 1.3, back: false });
    const B = r.back, logM = M({ map: tex(PAINT.wood('#6a4424', '#4a2e16', 6), 1, 4), roughness: 0.85 });
    // the view: snowy peaks with snow falling, or red rock at dusk
    const view = A ? VIEW.mountains({ pines: true, snow: true, sky0: '#06102a', sky1: '#3a4a7a' }) : VIEW.desert({ rock: '#6a2a14', palms: false, buttes: true });
    if (A) { const x = view.getContext('2d'); for (let i = 0; i < 500; i++) { x.fillStyle = 'rgba(255,255,255,' + (0.4 + rnd() * 0.5) + ')'; x.beginPath(); x.arc(rnd() * view.width, rnd() * view.height, 1 + rnd() * 2.5, 0, 7); x.fill(); } }
    wallWithHole(g, 14, 4.4, M({ map: tex(A ? PAINT.logs('#8a5a30', '#6a4020') : PAINT.adobe('#d89a68'), 14 / 2.4, 4.4 / 2.4), roughness: 0.85 }), B, -2.4, 2.2, 6.2, 3.2);
    glassWall(g, -2.4, 2.2, B + 0.02, 6.2, 3.2, 0); { const fm = M({ color: A ? 0x3a2410 : 0x5a3018, roughness: 0.5 }); for (let i = -2; i <= 2; i++) box(g, 0.08, 3.2, 0.12, fm, -2.4 + i * 1.55, 2.2, B + 0.06); box(g, 6.4, 0.1, 0.14, fm, -2.4, 3.85, B + 0.06); box(g, 6.4, 0.12, 0.3, fm, -2.4, 0.55, B + 0.1); box(g, 6.4, 0.06, 0.12, fm, -2.4, 2.2, B + 0.06); }
    // the land outside: Aspen's peaks under snow with the firs coming down to the lodge; Sedona's red rock in the last of the sun
    if (A) { const land = landscape(g, { x: -2.4, z: B - 56, w: 160, d: 110, kind: 'alpine', snow: 10, treeline: 9, near: 0.16, scale: 1.5, dust: true }); aspenGrove(g, land, 600, { size: 0.85, ok: (x, z, h) => z < B - 12 && !(Math.abs(x + 2.4) < 3 + (B - z) * 0.3 && z > B - 70) }); forest(g, land, 160, { size: 1.2, low: 2, ok: (x, z, h) => z < B - 20 }); moon(g, 0xffc890, 0.85, [-70, 26, B + 10], [0, 0, B - 50]); starDome(g, 0, B - 20, 160, [[0, '#101a48'], [0.5, '#3a3a78'], [0.8, '#b86a4a'], [1, '#ffb070']], 160); }
    else { const land = landscape(g, { x: -2.4, z: B - 46, w: 150, d: 90, kind: 'mesa', near: 0.24, scale: 0.6 }); forest(g, land, 320, { size: 1.0, round: true, color: 0x3a5a34, low: 0.02, ok: (x, z, h) => h < 2.5 }); for (const [x, z, sz] of [[-6.5, B - 5, 1.1], [-1.0, B - 7, 0.9], [-4.2, B - 10, 1.3], [2.5, B - 6, 0.8]]) agave(g, x, z, sz); moon(g, 0xffb880, 1.1, [-60, 20, B + 20], [0, 0, B - 40]); moon(g, 0xc8d0ff, 0.5, [-30, 40, B - 100], [0, 0, B - 20]); sph(g, 2.6, glow(0xfff4e0, 6), -30, 34, B - 110, 16); starDome(g, 0, B - 20, 160, [[0, '#04061a'], [0.5, '#101640'], [0.82, '#3a2240'], [1, '#b85a30']], 600); }
    // the beams: log trusses, or round vigas running wall to wall
    if (A) for (let i = 0; i < 4; i++) { const z = 0.6 - i * 2.4; const tb = cyl(g, 0.16, 0.16, 14, logM, 0, 4.1, z, 12); tb.rotation.z = Math.PI / 2; for (const s of [-1, 1]) { const kb = cyl(g, 0.11, 0.11, 2.4, logM, s * 3.2, 3.6, z, 10); kb.rotation.z = s * 1.05; } }
    else for (let i = 0; i < 8; i++) { const z = 1.6 - i * 1.2; const v = cyl(g, 0.13, 0.13, 14.6, M({ map: tex(PAINT.wood('#5a3418', '#4a2a12', 4), 1, 6), roughness: 0.9 }), 0, 4.25, z, 12); v.rotation.z = Math.PI / 2; for (const s of [-1, 1]) cyl(g, 0.13, 0.13, 0.04, M({ color: 0x3a2010 }), s * 7.0, 4.25, z, 12).rotation.z = Math.PI / 2; }
    // the fireplace: river stone to the ceiling, or a white kiva in the corner
    if (A) { const st = M({ map: tex(canvas(256, 256, (x, w, h) => { x.fillStyle = '#4a4440'; x.fillRect(0, 0, w, h); for (let i = 0; i < 320; i++) { x.fillStyle = pick(['#8a8478', '#a09a8c', '#6a6458', '#b8b0a0', '#7a7060', '#948a7a']); x.beginPath(); x.ellipse(rnd() * w, rnd() * h, 6 + rnd() * 9, 4 + rnd() * 6, rnd() * 3, 0, 7); x.fill(); } }), 2, 4), roughness: 0.95 }); box(g, 2.6, 4.4, 0.9, st, 4.4, 2.2, B + 0.45); fireplace(g, 4.4, B + 0.92); box(g, 2.8, 0.18, 0.4, logM, 4.4, 1.55, B + 1.0); mountedHead(g, 4.4, 2.9, B + 0.92, 0, true);
      for (const [x, rz] of [[-6.6, 0.15], [-6.2, -0.15]]) { const sk = box(g, 0.09, 1.8, 0.02, M({ color: x < -6.4 ? 0xc81a1a : 0x1a3a8a, roughness: 0.4 }), x, 2.3, B + 0.05); sk.rotation.z = rz; } }
    else { const kiva = new THREE.Group(); kiva.position.set(5.6, 0, B + 0.9); kiva.rotation.y = -Math.PI / 4; g.add(kiva); const pl = M({ map: tex(PAINT.adobe('#f0e4d0')), roughness: 0.95 }); const body = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.9, 2.2, 24, 1, false, -Math.PI / 2, Math.PI), pl); body.position.y = 1.1; kiva.add(body); const hood = cyl(kiva, 0.25, 0.4, 2.2, pl, 0, 3.3, -0.2, 16); const mouth = new THREE.Mesh(new THREE.CircleGeometry(0.42, 24, 0, Math.PI), M({ color: 0x0a0604 })); mouth.position.set(0, 0.1, 0.62); kiva.add(mouth); plane(kiva, 0.7, 0.4, new THREE.MeshBasicMaterial({ map: tex(canvas(128, 64, (x, w, h) => { const g2 = x.createRadialGradient(w / 2, h, 4, w / 2, h, h); g2.addColorStop(0, '#fff2a0'); g2.addColorStop(0.5, '#ff8a20'); g2.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g2; x.fillRect(0, 0, w, h); })), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }), 0, 0.3, 0.64); light(kiva, 0xff9a40, 2.2, 0, 0.4, 1.0, 5);
      // pottery in a nicho, a Navajo blanket on the wall, cacti, a ristra of chiles
      for (let i = 0; i < 3; i++) { const p = new THREE.Mesh(new THREE.LatheGeometry([[0.001, 0], [0.12, 0.02], [0.18, 0.15], [0.12, 0.32], [0.07, 0.36]].map(q => new THREE.Vector2(q[0], q[1])), 20), M({ map: tex(canvas(64, 32, (x, w, h) => { x.fillStyle = pick(['#c8703a', '#e8d8b8', '#2a1a10']); x.fillRect(0, 0, w, h); x.fillStyle = '#1a1210'; for (let k = 0; k < 8; k++) { x.beginPath(); x.moveTo(k * 8, 12); x.lineTo(k * 8 + 4, 20); x.lineTo(k * 8 + 8, 12); x.fill(); } })), roughness: 0.6 })); p.position.set(-6.6 + i * 0.5, 0, -1.0 - i * 0.3); p.scale.setScalar(1.4 + i * 0.3); g.add(p); }
      const rist = new THREE.Group(); rist.position.set(1.4, 2.6, B + 0.08); g.add(rist); for (let i = 0; i < 18; i++) { const ch = sph(rist, 0.05, M({ color: 0xa81a10, roughness: 0.4 }), (rnd() - 0.5) * 0.12, -i * 0.05, 0.02, 8); ch.scale.set(0.6, 1.4, 0.6); }
      for (const [cx, cz] of [[-6.4, -6.6], [3.0, B + 0.5]]) { cyl(g, 0.3, 0.24, 0.42, M({ color: 0xb8603a, roughness: 0.8 }), cx, 0.21, cz, 14); const ag = agave(g, cx, cz, 0.7); ag.position.y = 0.4; }
      // a kokopelli, cut from iron, on the wall by the kiva
      const koko = canvas(256, 256, (x, w, h) => { x.clearRect(0, 0, w, h); x.strokeStyle = '#1a1210'; x.fillStyle = '#1a1210'; x.lineCap = 'round'; x.lineWidth = 22; x.beginPath(); x.moveTo(120, 70); x.quadraticCurveTo(150, 90, 150, 150); x.stroke(); x.beginPath(); x.moveTo(150, 150); x.lineTo(118, 200); x.lineTo(126, 236); x.moveTo(150, 150); x.lineTo(176, 196); x.lineTo(206, 212); x.stroke(); x.lineWidth = 14; x.beginPath(); x.moveTo(130, 72); x.lineTo(66, 120); x.stroke(); x.beginPath(); x.moveTo(116, 64); x.quadraticCurveTo(190, 20, 200, 130); x.quadraticCurveTo(190, 70, 130, 72); x.fill(); x.beginPath(); x.arc(112, 56, 22, 0, 7); x.fill(); x.lineWidth = 6; for (let k = 0; k < 4; k++) { x.beginPath(); x.moveTo(112, 40); x.lineTo(80 + k * 22, 8 + (k % 2) * 6); x.stroke(); } });
      plane(g, 1.0, 1.0, new THREE.MeshStandardMaterial({ map: tex(koko), transparent: true, alphaTest: 0.5, roughness: 0.6, metalness: 0.4 }), 3.4, 2.5, B + 0.05); }
    // a woven blanket on the side wall either way
    const nav = canvas(128, 192, (x, w, h) => { const cs = A ? ['#8a1a1a', '#f0e4c8', '#1a1a1a', '#c8a050'] : ['#c8501a', '#f0e4c8', '#1a1a1a', '#2a8a8a']; x.fillStyle = cs[1]; x.fillRect(0, 0, w, h); for (let j = 0; j < 6; j++) { x.fillStyle = cs[j % 3 === 0 ? 0 : j % 3 === 1 ? 2 : 3]; x.fillRect(0, j * 32 + 4, w, 8); for (let i = 0; i < 4; i++) { x.beginPath(); x.moveTo(i * 32 + 16, j * 32 + 14); x.lineTo(i * 32 + 28, j * 32 + 22); x.lineTo(i * 32 + 16, j * 32 + 30); x.lineTo(i * 32 + 4, j * 32 + 22); x.fill(); } } });
    plane(g, 1.3, 1.9, M({ map: tex(nav), roughness: 0.95, side: THREE.DoubleSide }), -6.98, 2.2, -4.0, Math.PI / 2);
    rugAt(g, 1.2, -3.0, 5.2, 3.6, nav);
    // lights: antler chandeliers, or punched-tin lanterns
    for (const [x, z] of [[-2.6, -3.8], [1.6, -2.2]]) { if (A) { const w = new THREE.Group(); w.position.set(x, 3.2, z); g.add(w); const wm = M({ color: 0xe0d4bc, roughness: 0.7 }); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; seg(w, [0, 0, 0], [Math.cos(a) * 0.65, 0.2 + (i % 2) * 0.15, Math.sin(a) * 0.65], 0.04, 0.015, wm); seg(w, [Math.cos(a) * 0.4, 0.1, Math.sin(a) * 0.4], [Math.cos(a + 0.4) * 0.55, 0.45, Math.sin(a + 0.4) * 0.55], 0.022, 0.01, wm); sph(w, 0.045, glow(0xffd8a0, 3), Math.cos(a) * 0.66, 0.0, Math.sin(a) * 0.66, 8); } for (let i = 0; i < 3; i++) cyl(w, 0.006, 0.006, 1.0, M({ color: 0x1a1a1a }), Math.cos(i * 2.1) * 0.3, 0.6, Math.sin(i * 2.1) * 0.3, 4); light(w, 0xffc890, 2.2, 0, -0.2, 0, 7); }
      else { const tin = M({ color: 0x9a8a70, metalness: 0.8, roughness: 0.4, emissive: 0x6a3a10, emissiveIntensity: 0.4 }); cyl(g, 0.006, 0.006, 0.9, M({ color: 0x1a1a1a }), x, 3.9, z, 4); const lt = cyl(g, 0.2, 0.2, 0.5, tin, x, 3.2, z, 8); cyl(g, 0.02, 0.24, 0.22, tin, x, 3.55, z, 8); light(g, 0xffb060, 3.4, x, 3.0, z, 8); } }
    // a leather sofa by the fire, the tables
    sofa(g, 2.8, B + 2.6, Math.PI, A ? 0x5a2a14 : 0x7a4a2a, 2.2);
    pokerTable(g, A ? -3.4 : -3.2, A ? -4.2 : -5.0, { felt: A ? 0x24485e : 0x7a3a1f, rail: 0x3a2414, seats: 8, rx: 1.3, rz: 0.75, ry: A ? 0.5 : -0.4, lamp: false, full: 0.85, ceil: 3.2 });
    pokerTable(g, A ? 2.0 : 1.6, A ? -2.4 : -2.0, { mine: true, felt: A ? 0x24485e : 0x7a3a1f, rail: 0x3a2414, seats: 8, rx: 1.3, rz: 0.75, lamp: false, ceil: 3.2 });
    return { exposure: 1.0, cam: A ? [[5.2, 1.6, 1.5], [-1.4, 1.2, -5.5]] : [[-4.8, 1.4, 1.4], [1.6, 1.05, -5.0]] };
  },
  // an old saloon. Deadwood: sawdust on the planks, the long bar with its brass rail and back-bar mirror, the piano, kerosene
  // lamps, wanted posters, Wild Bill's dead man's hand in a frame. The mining town: Victorian brick, the old saloon gone casino,
  // slots by the bar, ore carts, picks and lanterns, the peaks out the window
  saloon(g, o) {
    const MT = !!o.view;
    const r = room(g, { w: 14, d: 10, h: 3.8, floor: PAINT.planks('#8a6a44', '#6e5234'), wall: MT ? PAINT.brick('#8a4a30', '#5a4a40') : PAINT.planks('#8a5a30', '#6a4020'), wainscot: PAINT.panel('#4a2a14', '#5a3418'), ceil: PAINT.tin(MT ? '#8a7a5a' : '#3a3028'), trim: 0x2a1408, cornice: 0x3a2010, fillI: 0.7, back: MT ? false : true });
    const B = r.back, brass = M({ color: 0xc8a050, metalness: 0.9, roughness: 0.3 });
    if (MT) wallWithHole(g, 14, 3.8, M({ map: tex(PAINT.brick('#8a4a30', '#5a4a40'), 14 / 2.4, 3.8 / 2.4), roughness: 0.85 }), B, 4.0, 2.0, 2.6, 1.7);
    bar(g, -2.6, B + 1.3, 7, { wood: '#4a2410', crowd: 0.6 });
    box(g, 7, 0.04, 0.04, brass, -2.6, 0.2, B + 1.9);   // the foot rail
    for (let i = 0; i < 3; i++) { const sp = new THREE.Mesh(new THREE.LatheGeometry([[0.001, 0], [0.12, 0.02], [0.14, 0.12], [0.08, 0.2], [0.13, 0.26]].map(q => new THREE.Vector2(q[0], q[1])), 16), brass); sp.position.set(-5.6 + i * 2.8, 0, B + 2.1); g.add(sp); }
    // kerosene lamps on brackets, a wagon-wheel lamp over the table
    for (const s of [-1, 1]) for (const z of [-1.5, -4.5]) oilLamp(g, s * 6.85, 2.0, z);
    for (let i = 0; i < 3; i++) chandelier(g, -4 + i * 4, 3.2, -3.5, 0.5, 0xffb860);
    // the piano and its player, posters, the dead man's hand
    pianoUpright(g, 5.4, -1.6, -Math.PI / 2, 0x2a1408);
    const wanted = (n) => canvas(128, 170, (x, w, h) => { x.fillStyle = '#e8d8a8'; x.fillRect(0, 0, w, h); noise(x, w, h, 0.15, 1500); x.fillStyle = '#3a2410'; x.font = '900 24px serif'; x.textAlign = 'center'; x.fillText('WANTED', w / 2, 28); x.font = '700 11px serif'; x.fillText('DEAD OR ALIVE', w / 2, 44); x.fillStyle = '#6a5030'; x.fillRect(30, 52, 68, 70); x.fillStyle = '#c8a878'; x.beginPath(); x.ellipse(64, 80, 16, 20, 0, 0, 7); x.fill(); x.fillStyle = '#3a2410'; x.font = '900 20px serif'; x.fillText('$' + n, w / 2, 150); });
    if (!MT) { [500, 1000, 250].forEach((n, i) => plane(g, 0.45, 0.6, M({ map: tex(wanted(n)) }), 3.0 + i * 0.6, 1.9, B + 0.03)); plane(g, 0.45, 0.6, M({ map: tex(wanted(2000)) }), 6.98, 1.9, -6.0, -Math.PI / 2); }
    const dmh = canvas(256, 160, (x, w, h) => { x.fillStyle = '#1a3a22'; x.fillRect(0, 0, w, h); ['A♠', 'A♣', '8♠', '8♣', '?'].forEach((c, i) => { x.save(); x.translate(40 + i * 44, 84); x.rotate((i - 2) * 0.08); x.fillStyle = '#f4efe2'; x.fillRect(-18, -30, 36, 54); x.fillStyle = '#111'; x.font = '700 15px serif'; x.fillText(c, -14, -12); x.restore(); }); x.fillStyle = '#e8c868'; x.font = '700 13px Georgia'; x.textAlign = 'center'; x.fillText("DEAD MAN'S HAND · 1876", w / 2, h - 12); });
    rbox(g, 1.0, 0.68, 0.04, 0.01, M({ color: 0xc8a050, metalness: 0.7, roughness: 0.35 }), 4.4, 2.6, B + 0.03); plane(g, 0.9, 0.56, M({ map: tex(dmh) }), 4.4, 2.6, B + 0.06);
    mountedHead(g, -6.95, 2.6, -3.0, Math.PI / 2);
    if (MT) {
      glassWall(g, 4.0, 2.0, B + 0.02, 2.6, 1.7, 0); { const fm = M({ color: 0x2a1a0c, roughness: 0.5 }); box(g, 0.06, 1.7, 0.1, fm, 4.0, 2.0, B + 0.06); box(g, 2.6, 0.06, 0.1, fm, 4.0, 2.0, B + 0.06); box(g, 2.8, 0.1, 0.12, fm, 4.0, 2.9, B + 0.06); box(g, 2.8, 0.1, 0.3, fm, 4.0, 1.1, B + 0.1); }
      { const land = landscape(g, { x: 4, z: B - 50, w: 130, d: 95, kind: 'alpine', snow: 9, treeline: 8, near: 0.18, scale: 1.5 }); forest(g, land, 520, { size: 1.1, ok: (x, z, h) => z < B - 16 && !(Math.abs(x - 4) < 2 + (B - z) * 0.25 && z > B - 60) }); moon(g, 0xb8c8ff, 1.0, [30, 55, B - 10], [0, 0, B - 45]); starDome(g, 0, B - 20, 150, [[0, '#03061a'], [0.6, '#0e1838'], [1, '#2a3a6a']]); }
      slots(g, 6.4, -4.0, 4, -Math.PI / 2, { colors: [0xffd84d, 0xff3a3a, 0x3ad8ff] });
      const cart = new THREE.Group(); cart.position.set(-6.0, 0, -1.2); cart.rotation.y = 0.5; g.add(cart); const cm = M({ color: 0x4a3a2a, metalness: 0.5, roughness: 0.6 }), ir = M({ color: 0x1a1a1a, metalness: 0.6 });
      const bin = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.45, 0.5, 4, 1), cm); bin.rotation.y = Math.PI / 4; bin.position.y = 0.55; bin.scale.set(1, 1, 0.7); cart.add(bin); for (const sx of [-0.3, 0.3]) for (const sz of [-0.28, 0.28]) cyl(cart, 0.14, 0.14, 0.05, ir, sx, 0.14, sz, 16).rotation.x = Math.PI / 2;
      for (let i = 0; i < 2; i++) { const t = new THREE.Group(); t.position.set(-1.0, 2.7, B + 0.07 + i * 0.02); t.rotation.z = i ? -0.5 : 0.5; g.add(t); box(t, 0.04, 1.0, 0.04, M({ color: 0x8a6a3a, roughness: 0.8 }), 0, 0, 0); box(t, 0.5, 0.05, 0.04, ir, 0, 0.5, 0); }
      for (let i = 0; i < 4; i++) { const lx = -5 + i * 3; cyl(g, 0.006, 0.006, 0.6, ir, lx, 3.5, -6.2, 4); const lb = cyl(g, 0.09, 0.09, 0.22, M({ color: 0xfff0d0, emissive: 0xffa040, emissiveIntensity: 1.3, transparent: true, opacity: 0.85 }), lx, 3.1, -6.2, 10); cyl(g, 0.1, 0.06, 0.06, ir, lx, 3.24, -6.2, 10); }
    } else { for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) { const lx = 3.2 + i * 1.2, lz = -6.4 - j * 1.4; cyl(g, 0.5, 0.5, 0.04, M({ color: 0x5a3418, roughness: 0.5 }), lx, 0.75, lz, 20); cyl(g, 0.06, 0.08, 0.72, M({ color: 0x3a2010 }), lx, 0.36, lz, 10); } }
    // the tables: green baize on old wood
    pokerTable(g, MT ? -2.8 : -3.6, MT ? -4.0 : -5.2, { felt: 0x1f5a2e, rail: 0x3a2010, seats: 7, shade: 0x3a2010, lampColor: 0xffb860, ry: MT ? -0.5 : 0.6, full: 0.85 });
    pokerTable(g, MT ? 2.2 : 1.2, MT ? -2.8 : -2.4, { mine: true, felt: 0x1f5a2e, rail: 0x3a2010, seats: 7, shade: 0x3a2010, lampColor: 0xffb860 });
    return { exposure: 0.95, fog: MT ? null : [0x2a2018, 6, 20], cam: MT ? [[-4.6, 1.5, 1.6], [1.4, 1.1, -5.6]] : [[4.6, 1.5, 1.4], [-1.8, 1.1, -6.0]] };
  },
  // a Mississippi riverboat's gaming saloon: arched windows on the river down both sides, white-and-gold gingerbread trim,
  // red flocked walls, carved posts, a clerestory overhead, brass everywhere, the paddlewheel churning past the stern windows
  riverboat(g, o) {
    const r = room(g, { w: 14, d: 10, h: 3.4, floor: PAINT.carpet('#4a0a12', '#6a1420', '#c8a050', 'scroll'), wall: PAINT.wallpaper('#5a0e14', '#7a1a20', 'floral'), wainscot: PAINT.panel('#f0e8dc', '#e4dccc'), ceil: PAINT.tin('#f0e6d0'), trim: 0xc8a050, cornice: 0xf0e8dc, fillI: 0.8 });
    const B = r.back, gold = M({ color: 0xc8a050, metalness: 0.9, roughness: 0.25 }), white = M({ color: 0xf4ecdc, roughness: 0.45 });
    for (const s of [-1, 1]) plane(g, 10, 1.0, M({ map: tex(PAINT.panel('#f0e8dc', '#e4dccc'), 4, 0.5) }), s * 6.99, 0.5, -3, -s * Math.PI / 2);
    // the stern windows look onto the wake and the turning wheel; side windows on the river
    const stern = VIEW.river({ moon: true, trees: true }); { const x = stern.getContext('2d'), w = stern.width, h = stern.height; x.fillStyle = '#7a1a14'; for (let i = 0; i < 12; i++) { x.save(); x.translate(w / 2, h * 1.05); x.rotate(i / 12 * Math.PI - Math.PI); x.fillRect(0, -10, h * 0.55, 20); x.restore(); } x.strokeStyle = '#7a1a14'; x.lineWidth = 16; x.beginPath(); x.arc(w / 2, h * 1.05, h * 0.55, Math.PI, 0); x.stroke(); x.fillStyle = 'rgba(255,255,255,.5)'; for (let i = 0; i < 80; i++) { x.beginPath(); x.ellipse(w / 2 + (rnd() - 0.5) * w * 0.5, h * 0.92 + rnd() * h * 0.08, 10 + rnd() * 20, 3, 0, 0, 7); x.fill(); } }
    for (let i = 0; i < 4; i++) { const x = -4.8 + i * 3.2; windowOn(g, i === 1 || i === 2 ? stern : VIEW.river({ moon: false, trees: true }), x, 1.75, B + 0.02, 1.3, 1.6, 0, 0xf4ecdc); const ar = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.06, 8, 24, Math.PI), gold); ar.position.set(x, 2.55, B + 0.06); ar.scale.y = 0.5; g.add(ar); }
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) windowOn(g, VIEW.river({ moon: false, trees: true }), s * 6.98, 1.75, -1.2 - i * 2.6, 1.2, 1.5, -s * Math.PI / 2, 0xf4ecdc);
    // gingerbread: carved posts and scrolled brackets under the clerestory, a gilt rail, gaslit chandeliers
    for (const s of [-1, 1]) for (let i = 0; i < 4; i++) { const z = -0.2 - i * 2.6; cyl(g, 0.09, 0.09, 3.4, white, s * 4.2, 1.7, z, 12); for (const y of [0.9, 2.2]) cyl(g, 0.12, 0.12, 0.08, gold, s * 4.2, y, z, 12); for (const t of [-1, 1]) { const br = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.03, 6, 16, Math.PI / 2), white); br.position.set(s * 4.2 + t * 0.35, 3.05, z); br.rotation.z = t > 0 ? Math.PI / 2 : 0; g.add(br); } }
    for (const s of [-1, 1]) box(g, 0.2, 0.2, 10, white, s * 4.2, 3.3, -3);
    for (let i = 0; i < 2; i++) chandelier(g, -2.5 + i * 5, 2.85, -3.4, 0.7, 0xffd8a0);
    slots(g, 5.6, B + 1.4, 3, 0);
    const lr = new THREE.Group(); lr.position.set(-6.95, 2.4, -6.6); lr.rotation.y = Math.PI / 2; g.add(lr); for (let k = 0; k < 8; k++) { const sg = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.08, 10, 12, Math.PI / 4), M({ color: k % 2 ? 0xffffff : 0xd8281e, roughness: 0.6 })); sg.rotation.z = k * Math.PI / 4; lr.add(sg); }
    sign(g, 'DELTA QUEEN SALOON', '#3a0a10', '#e8c868', 0, 3.0, B + 0.04, 3.2, 0.34);
    pokerTable(g, -3.2, -5.6, { felt: o.felt || 0x155e75, rail: 0x2a0a0a, seats: 8, rx: 1.3, rz: 0.75, ry: 0.3, lamp: false, full: 0.85, ceil: 3.2 });
    pokerTable(g, 1.6, -2.1, { mine: true, felt: o.felt || 0x155e75, rail: 0x2a0a0a, seats: 8, rx: 1.3, rz: 0.75, lamp: false, ceil: 3.2 });
    return { exposure: 1.0, cam: [[-3.0, 1.4, 1.6], [1.0, 1.1, -6.4]] };
  },
  // a cruise ship's card room, two days out: floor-to-ceiling windows on the open sea and the promenade deck, brass rails,
  // a coved ceiling with its strip of blue light, wave-pattern carpet, polished wood columns, the slots chiming down one
  // side, the casino cashier, the sea-day tournament on an easel by the door
  cruise(g) {
    const r = room(g, { w: 14, d: 10, h: 2.9, floor: PAINT.carpet('#0e2348', '#1c3c74', '#d8b050', 'wave'), wall: PAINT.panel('#e9e2d2', '#f6f1e6'), ceil: PAINT.plain('#f2eee6'), trim: 0x3e200e, cornice: 0xf6f1e6, fillI: 0.9 });
    const B = r.back, brass = M({ color: 0xc8a050, metalness: 0.9, roughness: 0.25, envMapIntensity: 1.1 }), teak = M({ map: tex(PAINT.wood('#7a4a24', '#5a3418', 20), 2, 1), roughness: 0.3, envMapIntensity: 0.8 });
    // the windows: the sea at sunset past the deck rail, the deck's lights
    const sea = VIEW.ocean({ sky0: '#0a1640', sky1: '#5a3a7a', sky2: '#ffb070' }); { const x = sea.getContext('2d'), w = sea.width, h = sea.height; x.fillStyle = '#2a1a10'; x.fillRect(0, h * 0.86, w, h * 0.14); for (let i = 0; i < w; i += 22) { x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(i, h * 0.86, 2, h * 0.14); } x.fillStyle = '#f4f2ee'; x.fillRect(0, h * 0.7, w, 7); x.fillRect(0, h * 0.78, w, 4); for (let i = 0; i < w; i += 64) x.fillRect(i, h * 0.7, 6, h * 0.16); x.fillStyle = '#ffe8b0'; for (let i = 30; i < w; i += 128) { x.shadowColor = '#ffd080'; x.shadowBlur = 14; x.fillRect(i, h * 0.84, 10, 6); } x.shadowBlur = 0; }
    for (let i = 0; i < 4; i++) windowOn(g, sea, -4.95 + i * 3.3, 1.45, B + 0.02, 3.0, 2.2, 0, 0xc8a050);
    box(g, 14, 0.05, 0.05, brass, 0, 0.95, B + 0.3); for (let i = 0; i < 15; i++) cyl(g, 0.018, 0.018, 0.95, brass, -7 + i, 0.47, B + 0.3, 6);
    // the cove: a dropped soffit round the room, its edge lit in blue; a modern crystal fixture in the middle
    const sof = M({ color: 0xf6f1e6, roughness: 0.8 });
    box(g, 14, 0.25, 0.9, sof, 0, 2.77, B + 0.45); for (const s of [-1, 1]) box(g, 0.9, 0.25, 10, sof, s * 6.55, 2.77, -3);
    box(g, 12.2, 0.03, 0.03, glow(0x3a8aff, 2.5), 0, 2.64, B + 0.92); for (const s of [-1, 1]) box(g, 0.03, 0.03, 9.1, glow(0x3a8aff, 2.5), s * 6.08, 2.64, -3.4);
    chandelier(g, -2.6, 2.55, -2.6, 0.6, 0xfff0d8);
    for (let i = 0; i < 5; i++) for (let j = 0; j < 2; j++) { const d = new THREE.Mesh(new THREE.CircleGeometry(0.07, 16), glow(0xfff4e0, 2.4)); d.rotation.x = Math.PI / 2; d.position.set(-4 + i * 2, 2.895, -1.6 - j * 4.6); g.add(d); }
    light(g, 0xfff0d8, 2.2, -3, 2.5, -2.5, 8); light(g, 0xfff0d8, 2.2, 3, 2.5, -2.5, 8); light(g, 0xffd0a0, 1.6, 0, 2.3, -6, 8);
    // polished wood columns with brass collars
    for (const [cx, cz] of [[-3.3, -3.0], [3.3, -6.2]]) { cyl(g, 0.2, 0.2, 2.9, teak, cx, 1.45, cz, 24); for (const y of [0.1, 2.6]) cyl(g, 0.24, 0.24, 0.12, brass, cx, y, cz, 24); }
    // the slots down the left side, the cashier on the right, the tournament easel
    slots(g, -6.4, -4.6, 6, Math.PI / 2, { colors: [0x3ad8ff, 0xffd84d, 0xff6ab0] });
    neon(g, 'Casino', '#ffd84d', -6.94, 2.35, -4.6, 72, Math.PI / 2);
    cage(g, 6.2, -6.6, -Math.PI / 2, 2.2, 'CASINO CASHIER');
    const ez = new THREE.Group(); ez.position.set(-4.4, 0, -8.0); ez.rotation.y = 0.45; g.add(ez); for (const s of [-1, 1]) { const lg = box(ez, 0.04, 1.6, 0.04, brass, s * 0.3, 0.8, 0); lg.rotation.z = s * 0.06; } const bl = box(ez, 0.04, 1.7, 0.04, brass, 0, 0.8, -0.3); bl.rotation.x = -0.2;
    const pst = canvas(256, 340, (x, w, h) => { const g2 = x.createLinearGradient(0, 0, 0, h); g2.addColorStop(0, '#0e2348'); g2.addColorStop(1, '#1a4a8a'); x.fillStyle = g2; x.fillRect(0, 0, w, h); x.fillStyle = '#e8c868'; x.textAlign = 'center'; x.font = '800 22px Georgia'; x.fillText('SEA DAY', w / 2, 52); x.font = '900 38px Georgia'; x.fillText('POKER', w / 2, 104); x.fillText('TOURNAMENT', w / 2, 146); x.fillStyle = '#fff'; x.font = '600 22px Georgia'; x.fillText('Today  2 PM', w / 2, 210); x.fillText('Card Room, Deck 5', w / 2, 246); x.strokeStyle = '#e8c868'; x.lineWidth = 3; x.strokeRect(10, 10, w - 20, h - 20); });
    rbox(ez, 0.66, 0.86, 0.03, 0.01, brass, 0, 1.3, 0.04); plane(ez, 0.6, 0.8, M({ map: tex(pst), roughness: 0.5 }), 0, 1.3, 0.06);
    sign(g, 'OCEAN MAJESTY', '#0e2348', '#e8c868', 0, 2.58, B + 0.95, 3.4, 0.3);
    // the tables, a dealer in every box (the ship's crew in their vests)
    pokerTable(g, -3.0, -5.0, { felt: 0x1f3c6b, rail: 0x3a1e0c, seats: 8, rx: 1.3, rz: 0.75, ry: 0.4, lamp: false, full: 0.85, ceil: 2.9 });
    pokerTable(g, 2.6, -5.4, { felt: 0x1f3c6b, rail: 0x3a1e0c, seats: 8, rx: 1.3, rz: 0.75, lamp: false, full: 0.85, ceil: 2.9 });
    pokerTable(g, 1.4, -1.8, { mine: true, felt: 0x1f3c6b, rail: 0x3a1e0c, seats: 8, rx: 1.3, rz: 0.75, lamp: false, ceil: 2.9 });
    if (STAGE === 'busy') { stander(g, -1.0, B + 0.9, 0, { lod: 1 }); stander(g, -0.5, B + 1.1, -0.4, { lod: 1 }); }
    plant(g, -6.3, -0.9, 1.1, true);
    return { exposure: 1.0, cam: [[4.8, 1.4, 1.4], [-2.0, 1.1, -6.4]] };
  },
  // a convention-center tournament hall: concrete and steel trusses high overhead, hundreds of tables in numbered rows under
  // hanging banners, clocks on poles, the cashier line roped off, the LED wall and the TV stage at the far end
  expo(g, o) {
    const HALL = o.hall || 'vegas', P2 = Math.PI / 2;
    const r = room(g, { w: 32, d: 26, h: 10, floor: PAINT.carpet(o.carpet || '#1a2a4a', o.carpet2 || '#22345a', o.carpet3 || '#c8a050', 'check'), wall: HALL === 'tent' ? PAINT.plain('#f4f2ea') : HALL === 'shed' ? PAINT.brick('#7a4a3a', '#4a3a34') : PAINT.concrete('#4a4a50'), ceil: HALL === 'tent' ? PAINT.plain('#f8f6f0') : HALL === 'shed' ? PAINT.plain('#2a2a30') : PAINT.plain('#1a1a20'), trim: 0x222222, cornice: HALL === 'tent' ? 0xf4f2ea : 0x2a2a2e, fillI: HALL === 'tent' ? 1.2 : 0.7, fillC: HALL === 'tent' ? 0xffe8c8 : 0xfff0dc });
    const B = r.back, tm = M({ color: 0x5a5e66, metalness: 0.7, roughness: 0.4 });
    // the roof trusses and the high-bay lights
    if (HALL === 'tent') {   // the pavilion: peaked fabric overhead on white poles, the sides rolled up on the palms and the dusk, strings of bulbs
      const fab = M({ color: 0xf8f6f0, roughness: 0.9, side: THREE.DoubleSide, emissive: 0xffe8d0, emissiveIntensity: 0.12 }), pole = M({ color: 0xf4f2ea, roughness: 0.5 });
      for (let j = 0; j < 5; j++) { const z = 0 - j * 5.2; for (const s of [-1, 1]) { const pk = box(g, 16.6, 0.04, 5.2, fab, s * 8, 8.4, z); pk.rotation.z = -s * 0.2; pk.userData.flat = 1; } cyl(g, 0.12, 0.12, 10.5, pole, 0, 5.25, z, 10); for (const s of [-1, 1]) cyl(g, 0.1, 0.1, 7, pole, s * 15.6, 3.5, z, 10); stringLights(g, -15, 15, 6.4, z - 2.6, 0.6, 0xffd38a); }
      const view = VIEW.la(); for (const s of [-1, 1]) { windowOn(g, view, s * 15.95, 2.2, -11, 24, 3.6, -s * P2, 'none'); box(g, 0.06, 0.6, 26, fab, s * 15.9, 4.3, -11); }
      for (let i = 0; i < 3; i++) light(g, 0xffe0c0, 4, -8 + i * 8, 7, -8, 20); light(g, 0xff9a60, 2, 0, 3, -24, 22);
    } else if (HALL === 'shed') {   // the old train shed: arched iron trusses, brick, the clerestory on the skyline, orange in the lamps
      const ir = M({ color: 0x3a3a40, metalness: 0.7, roughness: 0.5 });
      for (let j = 0; j < 6; j++) { const z = 0 - j * 4.6; const ar = new THREE.Mesh(new THREE.TorusGeometry(15.5, 0.18, 8, 48, Math.PI), ir); ar.position.set(0, 2.5, z); ar.scale.y = 0.48; g.add(ar); const ar2 = new THREE.Mesh(new THREE.TorusGeometry(14.6, 0.1, 8, 48, Math.PI), ir); ar2.position.set(0, 2.5, z); ar2.scale.y = 0.48; g.add(ar2); for (let k = 0; k < 14; k++) { const a = Math.PI * (k + 0.5) / 14; const d = box(g, 0.06, 0.9, 0.06, ir, Math.cos(a) * 15.05, 2.5 + Math.sin(a) * 15.05 * 0.48, z); d.rotation.z = a - P2; } }
      for (let i = -3; i <= 3; i++) box(g, 0.14, 0.14, 26, ir, i * 4, 2.5 + Math.sqrt(Math.max(0, 1 - (i * 4 / 15.5) ** 2)) * 15.5 * 0.48 - 0.1, -11);
      const view = VIEW.philly(); for (const s of [-1, 1]) { windowOn(g, view, s * 15.95, 8.2, -11, 24, 2.4, -s * P2, 0x2a2a30); for (let k = 0; k < 11; k++) box(g, 0.08, 2.4, 0.1, ir, s * 15.9, 8.2, 1 - k * 2.4); }
      for (let j = 0; j < 5; j++) for (let i = 0; i < 4; i++) { const x = -12 + i * 8, z = -1 - j * 5; cyl(g, 0.006, 0.006, 2.5, ir, x, 8.5, z, 4); const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.5, 0.4, 20, 1, true), M({ color: 0x2a3a2a, side: THREE.DoubleSide, roughness: 0.4, metalness: 0.4 })); sh.position.set(x, 7.2, z); g.add(sh); sph(g, 0.1, glow(0xffd8a0, 3), x, 7.05, z, 8); light(g, 0xffd0a0, 3, x, 6.8, z, 12); }
    } else {
  for (let j = 0; j < 5; j++) { const z = 0 - j * 5.2; box(g, 32, 0.4, 0.25, tm, 0, 9.4, z); box(g, 32, 0.1, 0.1, tm, 0, 8.6, z); for (let i = 0; i < 16; i++) { const d = box(g, 0.06, 1.0, 0.06, tm, -15 + i * 2, 9.0, z); d.rotation.z = i % 2 ? 0.8 : -0.8; } for (let i = 0; i < 6; i++) { const x = -12.5 + i * 5; cyl(g, 0.3, 0.45, 0.4, M({ color: 0x8a8e94, metalness: 0.8, roughness: 0.3 }), x, 8.3, z, 16); const d2 = new THREE.Mesh(new THREE.CircleGeometry(0.4, 16), glow(0xf4f8ff, 2.6)); d2.rotation.x = Math.PI / 2; d2.position.set(x, 8.09, z); g.add(d2); } }
    }
    if (HALL === 'vegas') { light(g, 0xf4f8ff, 5, -8, 8, -4, 20); light(g, 0xf4f8ff, 5, 8, 8, -4, 20); light(g, 0xf4f8ff, 5, 0, 8, -14, 20); }
    // the LED wall and stage at the far end
    const led = canvas(1024, 320, (x, w, h) => { x.fillStyle = o.bannerBg || '#c8102e'; x.fillRect(0, 0, w, h); x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(0, h * 0.7, w, h * 0.3); x.fillStyle = '#fff'; x.textAlign = 'center'; x.font = '900 96px sans-serif'; x.fillText(o.banner || 'SUMMER SERIES', w / 2, h * 0.68); x.font = '700 34px sans-serif'; x.fillText('EVENT 42 · DAY 2', w / 2, h * 0.9); for (let i = 0; i < w; i += 6) { x.fillStyle = 'rgba(0,0,0,.12)'; x.fillRect(i, 0, 1, h); } });
    plane(g, 18, 5.0, new THREE.MeshBasicMaterial({ map: tex(led) }), 0, 3.6, B + 0.05);
    rbox(g, 8, 0.4, 4.4, 0.05, M({ color: 0x0c0c12, roughness: 0.6 }), 0, 0.19, -18.5); plane(g, 7.9, 4.3, M({ map: tex(PAINT.carpet('#14141c', '#1c1c26', '#2a2a3a', 'check'), 4, 2), roughness: 0.95 }), 0, 0.402, -18.5, 0, -Math.PI / 2); box(g, 8.04, 0.04, 0.04, glow(0xffffff, 2), 0, 0.38, -16.3);
    pokerTable(g, 0, -18.5, { y: 0.4, mine: STAGE === 'final', felt: 0x7a0f1c, rail: 0x0a0a0a, seats: 9, rx: 1.6, rz: 0.9, lamp: false, full: 1, ceil: 6 });
    for (const s of [-1, 1]) bleachers(g, s * 7.5, -18.0, 5, 5, -s * Math.PI / 2, STAGE === 'final' ? 0.9 : 0.5);
    // the tables in rows, their numbers on poles; banners naming each section
    let n = 1;
    const mp = o.mine || [2.4, -1.4];
    for (let j = 0; j < 4; j++) for (let i = 0; i < 7; i++) { const x = -13.5 + i * 4.5, z = -3.4 - j * 3.4; if (j === 0 && Math.abs(x - mp[0]) < 3) continue; pokerTable(g, x, z, { felt: 0x1f6b45, rail: 0x0a0a0a, seats: 9, rx: 1.4, rz: 0.8, full: 0.95, lamp: false, ceil: 8 }); if (j < 2) { cyl(g, 0.02, 0.02, 2.2, M({ color: 0x8a8e94, metalness: 0.7 }), x - 1.5, 1.1, z + 0.6, 6); sign(g, String(100 + n), '#14141c', '#ffffff', x - 1.5, 2.3, z + 0.6, 0.5, 0.3); } n++; }
    pokerTable(g, mp[0], mp[1], { mine: STAGE !== 'final', felt: 0x1f6b45, rail: 0x0a0a0a, seats: 9, rx: 1.4, rz: 0.8, lamp: false, ceil: 8 });
    ['RED SECTION', 'BLUE SECTION', 'GOLD SECTION'].forEach((t, i) => hangBanner(g, t, -10 + i * 10, 6.6, -9.0, 4.4, 0.9, ['#a01a2a', '#1a3a8a', '#b8901a'][i], '#ffffff'));
    for (const s of [-1, 1]) { const cp = new THREE.Group(); cp.position.set(s * 9.5, 0, -14.5); g.add(cp); cyl(cp, 0.06, 0.06, 3.2, tm, 0, 1.6, 0, 8); cyl(cp, 0.4, 0.4, 0.05, tm, 0, 0.03, 0, 16); tvSet(cp, 0, 3.6, 0, 2.4, 0, 'clock'); }
    // the cashier windows down the left wall with the line roped off, registration on the right
    cage(g, -15.2, -6, Math.PI / 2, 6, 'TOURNAMENT CASHIER');
    const brass = M({ color: 0xc8a050, metalness: 0.9, roughness: 0.3 }), rope = cloth(0x1a2a6a, 0.6);
    for (let k = 0; k < 2; k++) for (let i = 0; i < 6; i++) { const x = -13.6 + k * 1.2, z = -3.2 - i * 1.3; cyl(g, 0.03, 0.03, 0.95, brass, x, 0.48, z, 8); cyl(g, 0.14, 0.16, 0.04, brass, x, 0.02, z, 12); if (i < 5) { const rp = cyl(g, 0.018, 0.018, 1.3, rope, x, 0.88, z - 0.65, 6); rp.rotation.x = Math.PI / 2; } if (k === 0 && STAGE === 'busy') stander(g, x + 0.6, z - 0.3, -Math.PI / 2 + 0.3, { lod: 1 }); }
    hangBanner(g, 'REGISTRATION', 13, 4.2, -6, 4, 0.8, '#14141c', '#ffd84d', -Math.PI / 2);
    for (const s of [-1, 1]) for (let i = 0; i < 2; i++) hangBanner(g, o.banner || 'SUMMER SERIES', s * 15.9, 6.4, -4 - i * 8, 3.6, 1.6, o.bannerBg || '#c8102e', '#ffffff', -s * Math.PI / 2);
    return { exposure: 1.05, fog: HALL === 'tent' ? null : HALL === 'shed' ? [0x1a1410, 14, 44] : [0x1a1a22, 14, 40], cam: o.cam || [[-5.2, 1.8, 1.9], [2.0, 1.3, -12.0]] };
  },
  // a fraternal lodge's social hall: wood panelling, a dais with the lectern and the lodge's crest, portraits of past
  // masters down the walls, flags, the coffee urn and cookies, the raffle table, folding tables for the charity night
  lodgehall(g) {
    const r = room(g, { w: 14, d: 11, h: 3.4, floor: PAINT.wood('#8a5a32', '#7a4a28', 22), wall: PAINT.plain('#e4d8bc'), wainscot: PAINT.panel('#5a3418', '#6a4020'), ceil: PAINT.dropceil(), trim: 0x3a2010, cornice: 0xd8d0c0, fillI: 1.0 });
    const B = r.back, wd = M({ map: tex(PAINT.wood('#5a3418', '#4a2a12', 18), 2, 1), roughness: 0.4 });
    plane(g, 11, 1.0, M({ map: tex(PAINT.panel('#5a3418', '#6a4020'), 5, 1) }), -7 + 0.01, 0.5, -3.5, Math.PI / 2); plane(g, 11, 1.0, M({ map: tex(PAINT.panel('#5a3418', '#6a4020'), 5, 1) }), 7 - 0.01, 0.5, -3.5, -Math.PI / 2);
    rbox(g, 6, 0.35, 2.0, 0.03, wd, 0, 0.17, B + 1.0); rbox(g, 0.7, 1.2, 0.5, 0.03, wd, 0, 0.95, B + 1.0); for (const s of [-1, 1]) { const ch = chair(g, s * 1.6, B + 0.6, 0, 0x5a1a1a); ch.position.y = 0.35; }
    const crest = canvas(256, 256, (x, w, h) => { x.fillStyle = '#1a2a5a'; x.beginPath(); x.arc(128, 128, 124, 0, 7); x.fill(); x.strokeStyle = '#e8c868'; x.lineWidth = 8; x.stroke(); x.lineWidth = 3; x.beginPath(); x.arc(128, 128, 100, 0, 7); x.stroke(); x.fillStyle = '#e8c868'; x.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? 30 : 70; x.lineTo(128 + Math.cos(a) * rr, 128 + Math.sin(a) * rr); } x.fill(); x.font = '700 18px Georgia'; x.textAlign = 'center'; x.fillText('FRIENDSHIP  CHARITY', 128, 222); });
    const cr = cyl(g, 0.7, 0.7, 0.05, M({ map: tex(crest), roughness: 0.4, metalness: 0.2 }), 0, 2.45, B + 0.04, 40); cr.rotation.x = Math.PI / 2;
    flag(g, -2.6, 2.0, B + 0.6); flag(g, 2.3, 2.0, B + 0.6);
    for (const s of [-1, 1]) for (let i = 0; i < 5; i++) photo(g, s * 6.97, 1.75, -1.2 - i * 1.4, 0.5, 0.64, -s * Math.PI / 2, 'portrait', 0xb08a40);
    hangBanner(g, 'CHARITY POKER NIGHT', 0, 3.05, -1.4, 5.0, 0.5, '#1a2a5a', '#e8c868');
    // the coffee and cookies, the raffle prizes
    rbox(g, 2.2, 0.76, 0.8, 0.02, M({ color: 0xf4f0e8, roughness: 0.8 }), -5.5, 0.38, -5.4); cyl(g, 0.17, 0.17, 0.48, M({ color: 0xc8ccd2, metalness: 0.9, roughness: 0.2 }), -6.0, 1.0, -5.4, 18); for (let i = 0; i < 8; i++) cyl(g, 0.04, 0.035, 0.1, M({ color: 0xf8f8f4 }), -5.6 + (i % 4) * 0.12, 0.81, -5.2 - Math.floor(i / 4) * 0.12, 10); const tray = cyl(g, 0.22, 0.22, 0.02, M({ color: 0xd8d8d8, metalness: 0.7 }), -5.0, 0.78, -5.4, 20); for (let i = 0; i < 9; i++) cyl(g, 0.035, 0.035, 0.015, M({ color: 0x9a6a3a }), -5.0 + (rnd() - 0.5) * 0.3, 0.8, -5.4 + (rnd() - 0.5) * 0.3, 10);
    rbox(g, 2.2, 0.76, 0.8, 0.02, M({ color: 0xf4f0e8, roughness: 0.8 }), 5.5, 0.38, -5.4); for (let i = 0; i < 5; i++) { rbox(g, 0.3, 0.25 + rnd() * 0.2, 0.3, 0.03, M({ color: pick([0xc8a050, 0xc01a1a, 0x2a6ac8, 0x2a8a3a]), roughness: 0.4 }), 4.7 + i * 0.4, 0.92, -5.4); } sign(g, 'RAFFLE', '#f4f0e8', '#1a2a5a', 5.5, 1.5, -5.75, 1.0, 0.3);
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) pokerTable(g, -3.4 + i * 3.6, -3.7 - j * 2.7, { felt: 0x1f3c6b, rail: 0x3a2a1a, lamp: false, seats: 6, full: 0.85, ceil: 3.4 });
    pokerTable(g, 1.2, -1.7, { mine: true, felt: 0x1f3c6b, rail: 0x3a2a1a, lamp: false, seats: 6, ceil: 3.4 });
    return { exposure: 1.0 };
  },
  // a veterans' post: the flags of the services, a memorial wall, photos of members in uniform, the canteen bar, a bingo
  // board, a drop ceiling and linoleum
  vfw(g) {
    const r = room(g, { w: 14, d: 11, h: 3.1, floor: PAINT.tile('#c8c0b0', '#9a9284', 12), wall: PAINT.cinder('#d8d0bc'), wainscot: PAINT.panel('#6a4a2a', '#7a5636'), ceil: PAINT.dropceil(), trim: 0x5a4a3a, cornice: 0xd8d4cc, fillI: 1.0 });
    const B = r.back;
    const colors = [['#b22234', '#ffffff'], ['#4b5320', '#f0c020'], ['#0a2a6a', '#f0c020'], ['#0a1a4a', '#ffffff'], ['#5a7aa8', '#ffffff'], ['#c8102e', '#f0c020']];
    for (let i = 0; i < 6; i++) { if (i === 0) { flag(g, -3.2, 2.1, B + 0.5); continue; } const c = canvas(150, 90, (x, w, h) => { x.fillStyle = colors[i][0]; x.fillRect(0, 0, w, h); x.fillStyle = colors[i][1]; x.beginPath(); x.arc(w / 2, h / 2, 26, 0, 7); x.fill(); x.fillStyle = colors[i][0]; x.beginPath(); x.arc(w / 2, h / 2, 18, 0, 7); x.fill(); }); cyl(g, 0.02, 0.02, 2.4, M({ color: 0xc8a050, metalness: 0.8 }), -3.2 + i * 0.75, 1.2, B + 0.5, 6); sph(g, 0.04, M({ color: 0xc8a050, metalness: 0.8 }), -3.2 + i * 0.75, 2.42, B + 0.5); const f = plane(g, 0.6, 0.38, cloth(0xffffff), -3.2 + i * 0.75 + 0.3, 2.05, B + 0.5); f.material.map = tex(c); f.material.side = THREE.DoubleSide; }
    // the memorial wall: brass plaques on a dark board, a wreath
    rbox(g, 2.6, 1.6, 0.06, 0.02, M({ color: 0x2a1a10, roughness: 0.4 }), 3.6, 1.7, B + 0.04); for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) rbox(g, 0.5, 0.28, 0.02, 0.01, M({ color: 0xc8a050, metalness: 0.9, roughness: 0.3 }), 2.8 + i * 0.55, 2.2 - j * 0.42, B + 0.08);
    const wr = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.07, 8, 24), M({ color: 0x1a4a1a, roughness: 0.9 })); wr.position.set(3.6, 0.75, B + 0.1); g.add(wr); sph(g, 0.06, M({ color: 0xa01a1a }), 3.6, 0.48, B + 0.15);
    for (let i = 0; i < 6; i++) photo(g, -6.97, 1.8, -0.8 - i * 1.1, 0.45, 0.58, Math.PI / 2, 'portrait', 0x2a1a10);
    // the canteen: a short bar along the right wall
    bar(g, 6.2, -4.2, 3.6, { ry: -Math.PI / 2, crowd: 0.5, mirror: false, wood: '#6a4a2a' }); neon(g, 'Canteen', '#ff3a3a', 6.95, 2.45, -4.2, 64, -Math.PI / 2);
    // the bingo board
    rbox(g, 2.0, 0.9, 0.08, 0.02, M({ color: 0x1a1a1a }), -5.0, 2.2, B + 0.05);
    const bingo = canvas(256, 115, (x, w, h) => { x.fillStyle = '#111'; x.fillRect(0, 0, w, h); 'BINGO'.split('').forEach((l, j) => { x.fillStyle = '#e8c868'; x.font = '700 16px sans-serif'; x.fillText(l, 4, 20 + j * 21); for (let i = 0; i < 15; i++) { x.fillStyle = rnd() < 0.3 ? '#ffd84d' : '#3a3a3a'; x.fillText(String(j * 15 + i + 1), 22 + i * 15.5, 20 + j * 21); } }); });
    plane(g, 1.9, 0.85, M({ map: tex(bingo), emissive: 0xffffff, emissiveMap: tex(bingo), emissiveIntensity: 0.6 }), -5.0, 2.2, B + 0.1);
    hangBanner(g, 'POST POKER TOURNAMENT', 0, 2.7, -6.2, 4.4, 0.45, '#2a3a2a', '#f4e8c8');
    for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) { box(g, 1.2, 0.04, 0.3, glow(0xf4f8ff, 2.4), -4.5 + i * 3, 3.08, -1.5 - j * 4); light(g, 0xf0f4ff, 1.8, -4.5 + i * 3, 2.9, -1.5 - j * 4, 7); }
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) pokerTable(g, -3.4 + i * 3.6, -3.7 - j * 2.7, { felt: 0x2a3a2a, rail: 0x3a2a1a, lamp: false, seats: 6, full: 0.85, ceil: 3.1 });
    pokerTable(g, 1.2, -1.7, { mine: true, felt: 0x2a3a2a, rail: 0x3a2a1a, lamp: false, seats: 6, ceil: 3.1 });
    return { exposure: 1.0 };
  },
  // the firehouse engine bay: the engine parked behind the tables, painted lines on the concrete, the roll-up doors,
  // lockers of turnout gear, hose on a rack, the bell, the fundraiser banner
  firehouse(g) {
    const r = room(g, { w: 16, d: 13, h: 5.0, floor: PAINT.concrete('#9a968e'), wall: PAINT.cinder('#d8d2c4'), ceil: PAINT.plain('#a8a49c'), trim: 0x5a5650, cornice: 0x8a8680, fillI: 1.2 });
    const B = r.back;
    for (const lx of [-5.4, -1.6]) { const l2 = plane(g, 0.12, 11, M({ color: 0xe8c020, roughness: 0.6 }), lx, 0.005, -4.5, 0, -Math.PI / 2); l2.userData.flat = 1; }
    fireTruck(g, -3.5, -6.6, Math.PI);
    // the roll-up doors in the back wall, windows across
    for (const dx of [-3.5, 3.0]) { const door = canvas(256, 256, (x, w, h) => { x.fillStyle = '#e4e2dc'; x.fillRect(0, 0, w, h); for (let i = 0; i < h; i += 16) { x.fillStyle = 'rgba(0,0,0,.18)'; x.fillRect(0, i, w, 2); } x.fillStyle = '#121828'; for (let k = 0; k < 6; k++) x.fillRect(8 + k * 41, 70, 34, 26); }); plane(g, 4.0, 4.2, M({ map: tex(door), roughness: 0.5, metalness: 0.3 }), dx, 2.1, B + 0.02); box(g, 4.3, 0.15, 0.2, M({ color: 0xb01a1a }), dx, 4.3, B + 0.08); }
    lockers(g, -7.65, -4.0, Math.PI / 2, 8, 0x8a1a1a);
    // the hose rack, the bell, a memorial board, the banner, high-bay lights
    rbox(g, 1.6, 1.2, 0.3, 0.03, M({ color: 0x5a5e64, metalness: 0.6 }), 7.8, 1.3, -2.0, -Math.PI / 2); for (let i = 0; i < 4; i++) { const hs = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.07, 8, 24), M({ color: 0xc8b890, roughness: 0.8 })); hs.position.set(7.6, 1.0 + (i % 2) * 0.5, -2.5 + Math.floor(i / 2) * 0.9); hs.rotation.y = Math.PI / 2; g.add(hs); }
    const bell = new THREE.Mesh(new THREE.LatheGeometry([[0.001, 0.5], [0.12, 0.48], [0.18, 0.3], [0.25, 0.02], [0.28, 0]].map(p => new THREE.Vector2(p[0], p[1])), 24), M({ color: 0xc8a050, metalness: 0.95, roughness: 0.2, side: THREE.DoubleSide })); bell.position.set(5.5, 0.9, -1.0); g.add(bell); rbox(g, 0.9, 0.9, 0.9, 0.03, M({ color: 0x5a3418 }), 5.5, 0.45, -1.0);
    hangBanner(g, 'FIREFIGHTERS FUNDRAISER', 2.0, 4.0, -3.0, 5.0, 0.6, '#8a1a1a', '#ffffff');
    for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) { cyl(g, 0.3, 0.42, 0.3, M({ color: 0x5a5e64, metalness: 0.7, roughness: 0.4 }), -5 + i * 5, 4.6, -2 - j * 5, 18); sph(g, 0.22, glow(0xfff4e0, 3), -5 + i * 5, 4.45, -2 - j * 5, 12); light(g, 0xfff4e0, 3.5, -5 + i * 5, 4.2, -2 - j * 5, 10); }
    for (let i = 0; i < 2; i++) pokerTable(g, 0.4 + i * 3.6, -4.6, { felt: 0x8a1a1a, rail: 0x3a2a1a, lamp: false, seats: 6, full: 0.85, ceil: 4.4 });
    pokerTable(g, 2.6, -1.9, { mine: true, felt: 0x8a1a1a, rail: 0x3a2a1a, lamp: false, seats: 6, ceil: 4.4 });
    return { exposure: 1.0 };
  },
  // the rec center gym: a maple court with its lines, the hoop, bleachers pulled out, painted block walls with a stripe,
  // the scoreboard, championship banners, high windows and high-bay lights; folding tables on the court
  gym(g) {
    const r = room(g, { w: 18, d: 14, h: 6.5, floor: PAINT.planks('#d8a868', '#c8985a'), wall: PAINT.cinder('#e8e2d4'), ceil: PAINT.plain('#8a8680'), trim: 0x2a4a8a, cornice: 0x5a5650, fillI: 1.4, floorRough: 0.35 });
    const B = r.back, line = M({ color: 0x1a3a8a, roughness: 0.4 });
    plane(g, 18, 0.5, M({ color: 0x2a4a8a }), 0, 1.6, B + 0.02); plane(g, 14, 0.5, M({ color: 0x2a4a8a }), -8.98, 1.6, -5, Math.PI / 2); plane(g, 14, 0.5, M({ color: 0x2a4a8a }), 8.98, 1.6, -5, -Math.PI / 2);
    // the court: the key and the arc at the back, the center circle near us
    const court = canvas(512, 512, (x, w, h) => { x.clearRect(0, 0, w, h); x.strokeStyle = '#1a2a6a'; x.lineWidth = 5; x.strokeRect(6, 6, w - 12, h - 12); x.fillStyle = 'rgba(30,60,140,.6)'; x.fillRect(w / 2 - 70, 6, 140, 180); x.beginPath(); x.arc(w / 2, 186, 70, 0, Math.PI); x.stroke(); x.beginPath(); x.arc(w / 2, 6, 230, 0, Math.PI); x.stroke(); x.beginPath(); x.arc(w / 2, h - 6, 70, Math.PI, 0); x.stroke(); });
    const cp = plane(g, 15, 13.5, M({ map: tex(court), transparent: true, roughness: 0.35 }), 0, 0.004, -5.25, 0, -Math.PI / 2); cp.userData.flat = 1;
    hoop(g, 0, 3.4, B, 0);
    // bleachers pulled out along the left wall, a few people watching
    bleachers(g, -7.4, -6.0, 8, 5, Math.PI / 2, 0.15);
    // the scoreboard, banners, high windows, lights
    rbox(g, 3.2, 1.5, 0.2, 0.03, M({ color: 0x1a1a1a }), 4.8, 4.6, B + 0.12); const sb = canvas(256, 120, (x, w, h) => { x.fillStyle = '#0a0a0a'; x.fillRect(0, 0, w, h); x.fillStyle = '#ff3a2a'; x.font = '700 40px monospace'; x.fillText('00', 18, 60); x.fillText('00', 190, 60); x.fillStyle = '#ffd84d'; x.fillText('0:00', 88, 60); x.fillStyle = '#fff'; x.font = '700 16px sans-serif'; x.fillText('HOME', 22, 100); x.fillText('GUEST', 186, 100); });
    plane(g, 3.0, 1.35, M({ map: tex(sb), emissive: 0xffffff, emissiveMap: tex(sb), emissiveIntensity: 0.7 }), 4.8, 4.6, B + 0.23);
    for (let i = 0; i < 4; i++) { const ban = canvas(64, 96, (x, w, h) => { x.fillStyle = '#2a4a8a'; x.fillRect(0, 0, w, h); x.fillStyle = '#e8c868'; x.font = '700 12px sans-serif'; x.textAlign = 'center'; x.fillText('LEAGUE', 32, 30); x.fillText('CHAMPS', 32, 46); x.font = '700 16px sans-serif'; x.fillText(String(2009 + i * 4), 32, 72); }); plane(g, 0.8, 1.2, M({ map: tex(ban), side: THREE.DoubleSide }), -6 + i * 1.2, 4.9, B + 0.05); }
    for (let i = 0; i < 6; i++) windowOn(g, VIEW.yard({}), -7.5 + i * 3, 5.6, B + 0.02, 2.0, 0.7, 0, 0x8a8680);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) { cyl(g, 0.3, 0.45, 0.35, M({ color: 0x5a5e64, metalness: 0.7, roughness: 0.4 }), -5 + i * 5, 5.9, -2 - j * 5, 18); sph(g, 0.24, glow(0xfff8e8, 3), -5 + i * 5, 5.75, -2 - j * 5, 12); light(g, 0xfff8e8, 4.5, -5 + i * 5, 5.4, -2 - j * 5, 12); }
    hangBanner(g, 'REC CENTER POKER', 0, 4.4, -2.0, 4.0, 0.5, '#2a4a8a', '#ffffff');
    for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) if (!(i === 2 && j === 0)) pokerTable(g, -3.6 + i * 3.6, -3.9 - j * 2.8, { felt: 0x1a5a6a, rail: 0x3a2a1a, lamp: false, seats: 6, full: 0.85, ceil: 5.5 });
    pokerTable(g, 1.6, -1.6, { mine: true, felt: 0x1a5a6a, rail: 0x3a2a1a, lamp: false, seats: 6, ceil: 5.5 });
    return { exposure: 1.0 };
  },
  // Paris: a Belle Époque gallery under an iron-and-glass barrel vault, twenty-two metres long, the Eiffel Tower lit gold
  // through the great arched window at the end; pilasters and tall mirrors down both sides, red velvet banquettes, two
  // crystal chandeliers the size of carriages
  paris(g, o) {
    const W = 12, D = 22, H = 4.6, R = W / 2, Zc = 2 - D / 2, B = 2 - D, P2 = Math.PI / 2;
    const vers = canvas(256, 256, (x, w, h) => { x.fillStyle = '#8a5a30'; x.fillRect(0, 0, w, h); for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { x.save(); x.translate(i * 128 + 64, j * 128 + 64); x.rotate(Math.PI / 4); for (let k = 0; k < 3; k++) { x.strokeStyle = 'rgba(40,20,5,' + (0.5 - k * 0.12) + ')'; x.lineWidth = 3; x.strokeRect(-76 + k * 18, -76 + k * 18, 152 - k * 36, 152 - k * 36); } x.restore(); } for (let i = 0; i < 300; i++) { x.strokeStyle = 'rgba(0,0,0,' + rnd() * 0.12 + ')'; x.beginPath(); const xx = rnd() * w, yy = rnd() * h; x.moveTo(xx, yy); x.lineTo(xx + 30 * (rnd() < 0.5 ? 1 : -1), yy + 30); x.stroke(); } }); vers.__kind = 'wood';
    const stone = PAINT.stucco('#e8e0d0');
    shell(g, { w: W, d: D, h: H, floor: vers, wall: stone, back: false, front: false, trim: 0x3a2a1a, cornice: 0xc8a050, fillI: 1.0 });
    const wm = M({ map: tex(stone, W / 2.4, H / 2.4), roughness: 0.85 }), gold = M({ color: 0xc8a050, metalness: 0.95, roughness: 0.25, envMapIntensity: 1.2 });
    tympanum(g, W, H, R, wm, 0, B, 0); tympanum(g, W, H, R, wm, 0, 2, Math.PI);
    // the great window on the tower, the Seine below it
    archWindow(g, VIEW.paris(), 0, 4.8, B + 0.04, 8.6, 7.6, 0, 0x2a3a30); curtain(g, -4.1, 2.6, B + 0.1, 0.8, 5.2, 0x7a0f1c); curtain(g, 4.1, 2.6, B + 0.1, 0.8, 5.2, 0x7a0f1c);
    mirrorAt(g, 0, 3.2, 1.95, 3.6, 4.2, Math.PI, 0xc8a050);
    // the vault: night sky through the glass, green iron ribs every two metres, a ridge beam
    const glass = canvas(512, 1024, (x, w, h) => { const g2 = x.createLinearGradient(0, 0, w, 0); g2.addColorStop(0, '#0a1030'); g2.addColorStop(0.5, '#04061a'); g2.addColorStop(1, '#0a1030'); x.fillStyle = g2; x.fillRect(0, 0, w, h); for (let i = 0; i < 260; i++) { x.fillStyle = 'rgba(255,255,255,' + rnd() * 0.6 + ')'; x.fillRect(rnd() * w, rnd() * h, 1.5, 1.5); } x.fillStyle = 'rgba(120,140,170,.18)'; for (let i = 0; i < w; i += 64) x.fillRect(i, 0, 3, h); for (let j = 0; j < h; j += 48) x.fillRect(0, j, w, 2); });
    const vm = unlit(glass, 0.7); vault(g, 0, H, Zc, W, D, vm);
    const iron = M({ color: 0x2a4a3a, metalness: 0.5, roughness: 0.5 });
    for (let i = 0; i <= 11; i++) { const z = 2 - i * 2; const rb = new THREE.Mesh(new THREE.TorusGeometry(R - 0.06, 0.07, 8, 40, Math.PI), iron); rb.position.set(0, H, z); g.add(rb); }
    box(g, 0.16, 0.16, D, iron, 0, H + R - 0.1, Zc); for (const s of [-1, 1]) box(g, 0.1, 0.1, D, iron, s * R * 0.7, H + R * 0.7, Zc);
    // pilasters, mirrors between them, sconces on each, banquettes and gueridons under the mirrors
    for (const s of [-1, 1]) for (let i = 0; i < 8; i++) {
      const z = 0.6 - i * 2.75, px = s * (R - 0.25);
      box(g, 0.5, H, 0.5, M({ map: tex(stone, 0.5, 2), roughness: 0.8 }), px, H / 2, z); box(g, 0.6, 0.18, 0.6, gold, px, H - 0.09, z); box(g, 0.56, 0.04, 0.56, gold, px, H - 0.24, z); box(g, 0.6, 0.12, 0.6, gold, px, 0.06, z);
      if (i < 7) { const mz = z - 1.375; mirrorAt(g, s * (R - 0.05), 2.4, mz, 1.5, 3.0, -s * P2, 0xc8a050); sconce(g, s * (R - 0.08), 3.3, mz + 0.95, -s * P2, 0xffe0b0);
        if (i % 2 === 0) sofa(g, s * (R - 0.55), mz, -s * P2, 0x7a0f1c, 1.9); else { const t = bistro(g, s * (R - 0.75), mz, false); cyl(g, 0.05, 0.05, 0.3, M({ color: 0x1a4a2a, roughness: 0.2 }), s * (R - 0.75), 0.9, mz, 10); } }
    }
    // the chandeliers down the vault, lanterns on the pilasters' line, the light of the room
    for (const z of [-1.5, -8.0, -14.5]) { chandelier(g, 0, H + 2.6, z, 2.2, 0xffe8c0); light(g, 0xfff0dc, 2.6, 0, H + 1.0, z, 13); }
    // the tables down the gallery, yours first
    pokerTable(g, 0.3, -2.0, { mine: true, felt: 0x4a1f4f, rail: 0x1a0a04, seats: 8, rx: 1.4, rz: 0.8, lamp: false, ceil: 6 });
    pokerTable(g, -2.4, -8.0, { felt: 0x4a1f4f, rail: 0x1a0a04, seats: 8, rx: 1.4, rz: 0.8, ry: 0.35, lamp: false, full: 0.9, ceil: 6 });
    pokerTable(g, 2.5, -13.6, { felt: 0x4a1f4f, rail: 0x1a0a04, seats: 8, rx: 1.4, rz: 0.8, ry: -0.3, lamp: false, full: 0.9, ceil: 6 });
    if (STAGE !== 'final') { stander(g, -3.6, -5.2, 0.8, { look: 'smart', arms: 'down', lod: 1 }); stander(g, 3.2, -17.6, -0.3, { look: 'smart', arms: 'crossed', lod: 1 }); stander(g, -2.0, -17.0, 0.4, { look: 'smart', lod: 1 }); }
    return { exposure: 1.0, cam: [[-4.5, 1.7, 1.0], [0.8, 2.6, -14]] };
  },
  // Monte Carlo: a rotunda under a painted dome, twelve gilded piers, the arches on the harbour side open to a stone terrace
  // over Port Hercule and its yachts, mirrors in the arches on the other side; a compass rose in the marble underfoot
  monaco(g, o) {
    const R = 8, Hs = 5.4, Zc = -5.5, P2 = Math.PI / 2, N = 12;
    const rose = canvas(1024, 1024, (x, w, h) => { const c = w / 2; x.fillStyle = '#ece4d4'; x.fillRect(0, 0, w, h); for (let i = 0; i < 1400; i++) { x.strokeStyle = 'rgba(120,100,80,' + rnd() * 0.25 + ')'; x.lineWidth = 1; x.beginPath(); const xx = rnd() * w, yy = rnd() * h; x.moveTo(xx, yy); x.bezierCurveTo(xx + 40, yy + 20, xx + 60, yy - 30, xx + 110, yy + 10); x.stroke(); } for (let k = 0; k < 16; k++) { x.fillStyle = k % 2 ? '#8a3a2a' : '#2a2a2a'; x.beginPath(); x.moveTo(c, c); x.lineTo(c + Math.cos(k / 16 * 6.283 - 0.08) * (k % 2 ? 300 : 420), c + Math.sin(k / 16 * 6.283 - 0.08) * (k % 2 ? 300 : 420)); x.lineTo(c + Math.cos(k / 16 * 6.283 + 0.08) * (k % 2 ? 300 : 420), c + Math.sin(k / 16 * 6.283 + 0.08) * (k % 2 ? 300 : 420)); x.fill(); } x.strokeStyle = '#8a3a2a'; x.lineWidth = 14; x.beginPath(); x.arc(c, c, 470, 0, 7); x.stroke(); x.strokeStyle = '#2a2a2a'; x.lineWidth = 4; x.beginPath(); x.arc(c, c, 440, 0, 7); x.stroke(); x.fillStyle = '#c8a050'; x.beginPath(); x.arc(c, c, 40, 0, 7); x.fill(); }); rose.__kind = 'marble';
    const fl = new THREE.Mesh(new THREE.CircleGeometry(R, 64), M({ map: tex(rose), roughness: 0.12 })); fl.rotation.x = -P2; fl.position.set(0, 0, Zc); g.add(fl); fl.userData.flat = 1;
    const gold = M({ color: 0xc8a050, metalness: 0.95, roughness: 0.25, envMapIntensity: 1.2 }), cream = M({ map: tex(PAINT.damask('#ece2cc', '#f4ecd8'), 2, 2), roughness: 0.8 });
    const fresco = canvas(1024, 512, (x, w, h) => { const g2 = x.createLinearGradient(0, 0, 0, h); g2.addColorStop(0, '#f4e8c8'); g2.addColorStop(0.5, '#9ac0e0'); g2.addColorStop(1, '#5a86b8'); x.fillStyle = g2; x.fillRect(0, 0, w, h); for (let i = 0; i < 70; i++) { x.fillStyle = 'rgba(255,250,240,' + (0.25 + rnd() * 0.5) + ')'; x.beginPath(); x.ellipse(rnd() * w, h * 0.3 + rnd() * h * 0.6, 40 + rnd() * 90, 14 + rnd() * 30, 0, 0, 7); x.fill(); } for (let i = 0; i < 12; i++) { x.fillStyle = 'rgba(200,160,80,.6)'; x.fillRect(i * w / 12, 0, 3, h); } x.strokeStyle = '#c8a050'; x.lineWidth = 10; x.strokeRect(0, h * 0.86, w, h * 0.14); for (let i = 0; i < 40; i++) { x.fillStyle = '#c8a050'; x.beginPath(); x.arc(i * w / 40 + 12, h * 0.93, 6, 0, 7); x.fill(); } });
    dome(g, 0, Hs, Zc, R, M({ map: tex(fresco), roughness: 0.9 }), 16, gold);
    // the ring of piers and arches: open to the terrace at the back, mirrored at the front
    const view = VIEW.monaco();
    for (let i = 0; i < N; i++) {
      const a = i / N * Math.PI * 2, px = Math.sin(a) * R, pz = Zc + Math.cos(a) * R;
      const pier = box(g, 0.7, Hs, 0.7, cream, px, Hs / 2, pz, a); box(g, 0.9, 0.2, 0.9, gold, px, Hs - 0.1, pz, a); box(g, 0.9, 0.12, 0.9, gold, px, 0.06, pz, a);
      const am = a + Math.PI / N, ax = Math.sin(am) * R, az = Zc + Math.cos(am) * R, ry = am + Math.PI;
      // the wall above and beside each arch
      const sg = new THREE.Group(); sg.position.set(ax, 0, az); sg.rotation.y = ry; g.add(sg);
      box(sg, 4.2, Hs - 4.3, 0.3, cream, 0, Hs - (Hs - 4.3) / 2, -0.1); for (const s of [-1, 1]) box(sg, 0.4, 4.3, 0.3, cream, s * 1.75, 2.15, -0.1);
      const arch = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.14, 8, 32, Math.PI), gold); arch.position.set(0, 2.9, 0.04); sg.add(arch);
      if (Math.cos(am) < -0.05) { if (STAGE !== 'final' && rnd() < 0.5) stander(sg, (rnd() - 0.5) * 1.6, -0.9, Math.PI + (rnd() - 0.5), { look: 'smart', lod: 1 }); }
      else if (Math.cos(am) > 0.05) { mirrorAt(sg, 0, 2.2, -0.02, 2.9, 4.2, 0, 0xc8a050); } else archWindow(sg, view, 0, 2.2, -0.02, 3.0, 4.4, 0, 0xc8a050);
      sconce(g, Math.sin(a) * (R - 0.4), 3.4, Zc + Math.cos(a) * (R - 0.4), a + Math.PI, 0xffe0b0);
    }
    // the terrace beyond the open arches: stone floor, a balustrade, lamps, the harbour and the Rock all round
    ground(g, 40, 24, M({ map: tex(PAINT.tile('#d8ccb0', '#c4b89c', 6), 10, 6), roughness: 0.8 }), 0, Zc - 10, -0.01);
    for (let i = 0; i < 14; i++) { const a0 = Math.PI * 0.52 + i / 14 * Math.PI * 0.96, a1 = Math.PI * 0.52 + (i + 1) / 14 * Math.PI * 0.96; railing(g, Math.sin(a0) * 11.5, Zc + Math.cos(a0) * 11.5, Math.sin(a1) * 11.5, Zc + Math.cos(a1) * 11.5, 1.0, 'stone', '#d8c8a0'); }
    for (const a of [Math.PI * 0.62, Math.PI * 0.85, Math.PI * 1.15, Math.PI * 1.38]) lampPost(g, Math.sin(a) * 11.0, Zc + Math.cos(a) * 11.0, 2.8, 0xffd890);
    backdrop(g, view, 0, Zc, 26, 20, -4, Math.PI * 0.45, Math.PI * 1.55); skyDome(g, 0, Zc, 60, [[0, '#06081c'], [0.5, '#1a1a48'], [0.9, '#5a3a5a'], [1, '#ff9a5a']]);
    // the chandelier under the dome, the light of the room
    chandelier(g, 0, Hs + R * 0.55, Zc, 2.6, 0xffe8c0); light(g, 0xfff0dc, 3.0, 0, Hs + 1, Zc, 16); light(g, 0xfff0dc, 1.6, 0, 4, Zc + 5, 12);
    for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283 + 0.3; chandelier(g, Math.sin(a) * 5.2, Hs - 0.6, Zc + Math.cos(a) * 5.2, 0.9, 0xffe8c0); }
    // the tables, set wide apart on the rose
    pokerTable(g, 1.6, -3.0, { mine: true, felt: 0x0f3d2e, rail: 0x1a0a04, seats: 8, rx: 1.4, rz: 0.8, lamp: false, ceil: 5 });
    pokerTable(g, -3.8, -6.6, { felt: 0x0f3d2e, rail: 0x1a0a04, seats: 8, rx: 1.4, rz: 0.8, ry: 0.5, lamp: false, full: 0.9, ceil: 5 });
    pokerTable(g, 3.6, -8.8, { felt: 0x0f3d2e, rail: 0x1a0a04, seats: 8, rx: 1.4, rz: 0.8, ry: -0.4, lamp: false, full: 0.9, ceil: 5 });
    if (STAGE !== 'final') { stander(g, -1.2, -10.4, 0.2, { look: 'smart', arms: 'down', lod: 1 }); stander(g, 5.4, -2.6, -0.9, { look: 'smart', arms: 'crossed', lod: 1 }); }
    return { exposure: 1.0, cam: [[-4.6, 1.5, -0.2], [1.4, 2.8, -9.5]] };
  },
  // Macau: a two-storey atrium in red lacquer and gold, a gallery round three sides, red lanterns hung down through the
  // void, a lotus pond under the glass wall and the Grand Lisboa's golden bud filling it
  macau(g, o) {
    const W = 14, D = 18, H = 9, Zc = 2 - D / 2, B = 2 - D, P2 = Math.PI / 2, GY = 4.6;
    shell(g, { w: W, d: D, h: H, floor: PAINT.carpet('#4f130d', '#6b1a12', '#e8b030', 'scroll'), wall: PAINT.damask('#6b1a12', '#7a2418'), ceil: PAINT.coffer('#5a1410', '#c8a050'), back: false, trim: 0xc8a050, cornice: 0xc8a050, fillI: 1.2, fillC: 0xffd0a0 });
    const gold = M({ color: 0xd8b050, metalness: 0.95, roughness: 0.25, envMapIntensity: 1.2 }), lacq = M({ color: 0x120808, roughness: 0.12, envMapIntensity: 1.0 }), red = M({ color: 0x8a1010, roughness: 0.3 });
    // the glass wall: two storeys of it, black mullions, the bay beyond
    const view = VIEW.macau(); windowOn(g, view, 0, H / 2, B + 0.02, W - 0.2, H - 0.2, 0, 0x0a0a0a);
    for (let i = -2; i <= 2; i++) box(g, 0.1, H, 0.14, lacq, i * 2.9, H / 2, B + 0.1); box(g, W, 0.16, 0.16, lacq, 0, GY, B + 0.1); box(g, W, 0.16, 0.16, lacq, 0, H - 0.08, B + 0.1);
    // the lotus pond along the glass: stepping stones, floating candles
    box(g, W - 1.2, 0.3, 2.0, M({ map: tex(PAINT.stucco('#3a3a3a'), 6, 1), roughness: 0.8 }), 0, 0.15, B + 1.3); water(g, W - 1.6, 1.7, 0, B + 1.3, 0.28, 0x0e3a3a);
    for (let i = 0; i < 16; i++) { const px = -5.6 + i * 0.75 + (rnd() - 0.5) * 0.3, pz = B + 0.7 + rnd() * 1.2; cyl(g, 0.12, 0.1, 0.03, M({ color: 0xf4e8d8, roughness: 0.4 }), px, 0.31, pz, 12); sph(g, 0.025, glow(0xffb040, 4), px, 0.35, pz, 6); if (i % 3 === 0) { const lf = cyl(g, 0.22, 0.22, 0.01, M({ color: 0x2a6a3a, roughness: 0.6 }), px + 0.3, 0.3, pz, 12); } }
    box(g, W - 1.2, 0.05, 0.05, gold, 0, 0.6, B + 2.35); for (let i = 0; i < 8; i++) cyl(g, 0.015, 0.015, 0.6, gold, -5.6 + i * 1.6, 0.3, B + 2.35, 6);
    // the gallery round three sides on black lacquer columns, people at the rail looking down
    const galFloor = M({ map: tex(PAINT.wood('#2a1208', '#1a0a04', 60), 4, 1), roughness: 0.35 });
    gallery(g, -W / 2 + 2.4, 2, -W / 2 + 2.4, B + 2.4, GY, 2.4, galFloor, 'wood', 0x8a1010); gallery(g, W / 2 - 2.4, B + 2.4, W / 2 - 2.4, 2, GY, 2.4, galFloor, 'wood', 0x8a1010); gallery(g, W / 2 - 2.4, 2, -W / 2 + 2.4, 2, GY, 2.4, galFloor, 'wood', 0x8a1010);
    for (const s of [-1, 1]) for (let i = 0; i < 4; i++) column(g, s * (W / 2 - 2.4), 0.2 - i * 4.6, GY, lacq, gold);
    const up = new THREE.Group(); up.position.y = GY; g.add(up);
    if (STAGE !== 'final') for (let i = 0; i < 6; i++) { const s = i % 2 ? 1 : -1, z = -1 - Math.floor(i / 2) * 4.5 - rnd(); stander(up, s * (W / 2 - 2.0), z, -s * P2 + (rnd() - 0.5) * 0.4, { arms: 'crossed', lod: 1 }); }
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) { lantern(g, s * (W / 2 - 1.2), GY + 1.4, -1.5 - i * 5, 0xff3a1a); }
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) photo(g, s * (W / 2 - 0.05), GY + 2.2, -2.0 - i * 5, 1.2, 1.8, -s * P2, 'portrait', 0xd8b050);
    // the lanterns through the void, each on its cord from the coffers
    for (let i = 0; i < 5; i++) for (let j = 0; j < 4; j++) { const x = -4 + i * 2 + (j % 2) * 0.8, z = -2.5 - j * 3.6, y = 3.4 + ((i * 3 + j * 5) % 7) * 0.5; cyl(g, 0.006, 0.006, H - y, M({ color: 0x3a0a0a }), x, (H + y) / 2, z, 4); lantern(g, x, y, z, 0xff2a1a); if ((i + j) % 2 === 0) light(g, 0xff6a30, 1.4, x, y - 0.3, z, 6); }
    // dragon-scale gold screens either side of the glass, a gong, the cage of the cashier at the front
    for (const s of [-1, 1]) { plane(g, 2.6, 4.2, M({ map: tex(PAINT.wallpaper('#c8a050', '#8a6a20', 'scale'), 3, 5), roughness: 0.4, metalness: 0.4 }), s * 5.6, 2.2, B + 0.3); }
    const gong = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.06, 32), M({ color: 0xc8a050, metalness: 0.9, roughness: 0.35 })); gong.rotation.x = P2; gong.position.set(W / 2 - 0.5, 2.0, -3); g.add(gong); box(g, 0.1, 2.9, 0.1, lacq, W / 2 - 0.5, 1.45, -1.9); box(g, 0.1, 2.9, 0.1, lacq, W / 2 - 0.5, 1.45, -4.1); box(g, 0.1, 0.1, 2.3, lacq, W / 2 - 0.5, 2.95, -3);
    for (const s of [-1, 1]) sofa(g, s * 5.4, -14.6, -s * P2, 0x8a1010, 2.2);
    // the tables on the atrium floor, yours nearest
    pokerTable(g, 1.2, -3.0, { mine: true, felt: 0x6b1a12, rail: 0x1a0a04, seats: 8, rx: 1.4, rz: 0.8, lamp: false, ceil: 5 });
    pokerTable(g, -3.4, -6.8, { felt: 0x6b1a12, rail: 0x1a0a04, seats: 8, rx: 1.4, rz: 0.8, ry: 0.4, lamp: false, full: 0.9, ceil: 5 });
    pokerTable(g, 3.2, -9.8, { felt: 0x6b1a12, rail: 0x1a0a04, seats: 8, rx: 1.4, rz: 0.8, ry: -0.3, lamp: false, full: 0.9, ceil: 5 });
    pokerTable(g, -2.4, -12.4, { felt: 0x6b1a12, rail: 0x1a0a04, seats: 8, rx: 1.4, rz: 0.8, ry: 0.2, lamp: false, full: 0.9, ceil: 5 });
    light(g, 0xffd0a0, 2.2, 0, 7.5, -4, 14); light(g, 0xffd0a0, 2.2, 0, 7.5, -11, 14);
    if (STAGE !== 'final') { stander(g, -4.8, -3.4, 0.9, { look: 'smart', arms: 'down', lod: 1 }); stander(g, 5.2, -13.0, -0.6, { look: 'smart', arms: 'crossed', lod: 1 }); }
    return { exposure: 1.05, cam: [[2.7, 1.5, 0.9], [-1.4, 2.8, -11]] };
  },
  // the Strip's sky suite: a corner of black glass fifty floors up, the whole valley of lights below, a star-field ceiling,
  // a backlit onyx bar, low and wide and dark
  vegasvip(g, o) {
    const W = 20, D = 14, H = 3.6, Zc = 2 - D / 2, B = 2 - D, P2 = Math.PI / 2;
    shell(g, { w: W, d: D, h: H, floor: PAINT.carpet('#14161c', '#1e222a', '#c8a050', 'diamond'), wall: PAINT.panel('#14161a', '#1c1e24'), ceil: PAINT.plain('#08080c'), back: false, right: false, trim: 0x0a0a0c, fillI: 0.7, fillC: 0xffe0c0 });
    const black = M({ color: 0x0a0a0c, metalness: 0.7, roughness: 0.25 }), view = VIEW.vegas();
    // the glass on two sides, meeting at the corner; the lights go on below the sill, so the view hangs low
    windowOn(g, view, 0, H / 2, B + 0.02, W - 0.3, H - 0.1, 0, 'none'); windowOn(g, view, W / 2 - 0.02, H / 2, Zc, D - 0.3, H - 0.1, -P2, 'none');
    for (let i = -3; i <= 3; i++) box(g, 0.08, H, 0.12, black, i * 2.8, H / 2, B + 0.08); for (let i = -2; i <= 2; i++) box(g, 0.12, H, 0.08, black, W / 2 - 0.08, H / 2, Zc + i * 2.8); box(g, 0.18, H, 0.18, black, W / 2 - 0.1, H / 2, B + 0.1);
    box(g, W, 0.1, 0.14, black, 0, 0.05, B + 0.08); box(g, 0.14, 0.1, D, black, W / 2 - 0.08, 0.05, Zc);
    // the stars overhead: hundreds of fibre points in the black ceiling
    for (let i = 0; i < 260; i++) { const s = sph(g, 0.012 + rnd() * 0.012, glow(pick([0xffffff, 0xd8e8ff, 0xffe8c0]), 6), (rnd() - 0.5) * (W - 1), H - 0.02, Zc + (rnd() - 0.5) * (D - 1), 6); }
    // linear fixtures over the tables, soft amber coves along the solid walls
    const lin = (x, z, len, ry) => { const f = new THREE.Group(); f.position.set(x, 0, z); f.rotation.y = ry || 0; g.add(f); rbox(f, len, 0.08, 0.12, 0.02, black, 0, 2.95, 0); box(f, len - 0.1, 0.02, 0.06, glow(0xfff0d8, 3), 0, 2.9, 0); for (const k of [-1, 1]) cyl(f, 0.004, 0.004, 0.6, black, k * len * 0.4, 3.3, 0, 4); light(f, 0xfff0d8, 2.0, 0, 2.7, 0, 7); };
    box(g, W - 0.4, 0.04, 0.04, glow(0xc8a050, 2.2), 0, H - 0.15, 2 - 0.3); box(g, 0.04, 0.04, D - 0.4, glow(0xc8a050, 2.2), -W / 2 + 0.3, H - 0.15, Zc);
    // the onyx bar along the left wall, lit from inside, bottles up the wall behind it
    bar(g, -W / 2 + 1.6, -5.0, 7, { ry: P2, wood: '#0c0c10', wood2: '#141418', top: 0x1a1410, crowd: 0.5 }); box(g, 0.06, 0.9, 6.9, glow(0xffb060, 1.3), -W / 2 + 1.95, 0.55, -5.0); light(g, 0xffb060, 1.6, -W / 2 + 2.4, 0.9, -5.0, 6);
    // a lounge by the front wall: a round of black leather, a low table, an ice bucket
    for (const [x, z, ry] of [[-4.6, 0.3, Math.PI], [-6.8, -1.2, P2], [-2.4, -1.2, -P2]]) sofa(g, x, z, ry, 0x101014, 2.0);
    cyl(g, 0.6, 0.6, 0.04, M({ color: 0x0a0a0a, roughness: 0.1, envMapIntensity: 1.5 }), -4.6, 0.42, -1.2, 32); cyl(g, 0.08, 0.1, 0.4, black, -4.6, 0.2, -1.2, 12); cyl(g, 0.14, 0.11, 0.2, M({ color: 0xd8d8e0, metalness: 0.9, roughness: 0.2 }), -4.4, 0.54, -1.3, 14); cyl(g, 0.03, 0.03, 0.3, M({ color: 0x1a3a1a, roughness: 0.2 }), -4.4, 0.72, -1.3, 8);
    // the private lift, a VIP plate beside it; a view-side ledge with a few stools
    box(g, 2.0, 2.4, 0.08, M({ color: 0x8a8a90, metalness: 0.9, roughness: 0.25 }), 5.6, 1.2, 1.96); box(g, 0.02, 2.4, 0.06, black, 5.6, 1.2, 1.92); sign(g, 'SKY SUITE', '#0a0a0c', '#d8b050', 7.4, 1.9, 1.96, 1.2, 0.3);
    box(g, 0.5, 0.05, D - 2, M({ color: 0x0a0a0a, roughness: 0.1, envMapIntensity: 1.5 }), W / 2 - 0.5, 1.05, Zc); for (let i = 0; i < 4; i++) { const z = -2 - i * 2.6; cyl(g, 0.17, 0.17, 0.06, cloth(0x101014, 0.5), W / 2 - 1.2, 0.72, z, 16); cyl(g, 0.02, 0.03, 0.7, black, W / 2 - 1.2, 0.35, z, 8); if (STAGE !== 'final' && rnd() < 0.6) person(g, W / 2 - 1.2, z, -P2, { hip: 0.76, arms: 'bar', lod: 1 }); }
    // the tables
    pokerTable(g, 1.6, -2.6, { mine: true, felt: 0x22262e, rail: 0x0a0a0c, seats: 8, rx: 1.4, rz: 0.8, lamp: false, ceil: 3.0 }); lin(1.6, -2.6, 2.8);
    pokerTable(g, 6.2, -7.2, { felt: 0x22262e, rail: 0x0a0a0c, seats: 8, rx: 1.4, rz: 0.8, ry: -0.35, lamp: false, full: 0.9, ceil: 3.0 }); lin(6.2, -7.2, 2.8, -0.35);
    pokerTable(g, -3.2, -8.4, { felt: 0x22262e, rail: 0x0a0a0c, seats: 8, rx: 1.4, rz: 0.8, ry: 0.25, lamp: false, full: 0.9, ceil: 3.0 }); lin(-3.2, -8.4, 2.8, 0.25);
    for (let i = 0; i < 4; i++) light(g, pick([0xff6ab0, 0x8a4aff]), 0.6, -8 + i * 5.3, 0.3, B + 0.6, 4);
    if (STAGE !== 'final') { stander(g, -0.6, -11.0, 0.3, { look: 'smart', arms: 'down', lod: 1 }); stander(g, 3.6, 0.6, -2.4, { look: 'smart', arms: 'crossed', lod: 1 }); }
    return { exposure: 1.1, cam: [[-6.6, 1.45, 1.2], [3.2, 1.3, -7.6]] };
  },
  // the French Quarter: an open courtyard between old brick walls, iron-lace galleries hung with ferns on two floors,
  // a cast-iron fountain, bananas in the corners, gas lamps and strings of bulbs, the cathedral's spires over the back wall
  bayou(g, o) {
    const W = 12, D = 14, H = 7.6, Zc = 2 - D / 2, B = 2 - D, P2 = Math.PI / 2;
    const flag = PAINT.tile('#6a6660', '#4a4640', 5), brick = PAINT.brick('#8a4a3a', '#4a3a34');
    shell(g, { w: W, d: D, h: H, floor: flag, wall: brick, back: false, fillI: 0.9, fillC: 0xffd0a0 });
    const bm = M({ map: tex(brick, W / 2.4, 2), roughness: 0.9 }), iron = M({ color: 0x141414, metalness: 0.6, roughness: 0.5 }), green = M({ color: 0x1a3a2a, roughness: 0.6 });
    // the back wall is lower, a carriage gate in it, and the city and sky beyond
    plane(g, W, 5.0, bm, 0, 2.5, B); box(g, W, 0.3, 0.5, M({ map: tex(PAINT.stucco('#b8a888'), 6, 1), roughness: 0.9 }), 0, 5.1, B + 0.05);
    const gate = new THREE.Group(); gate.position.set(0, 0, B + 0.1); g.add(gate); const ga = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.2, 8, 24, Math.PI), M({ map: tex(PAINT.stucco('#b8a888'), 1, 1), roughness: 0.9 })); ga.position.y = 2.6; gate.add(ga); for (const s of [-1, 1]) box(gate, 0.4, 2.6, 0.4, M({ map: tex(PAINT.stucco('#b8a888'), 1, 2), roughness: 0.9 }), s * 1.45, 1.3, 0);
    for (let i = 0; i < 12; i++) cyl(gate, 0.015, 0.015, 3.4, iron, -1.1 + i * 0.2, 1.7, 0, 6); box(gate, 2.3, 0.04, 0.04, iron, 0, 1.0, 0); box(gate, 2.3, 0.04, 0.04, iron, 0, 2.4, 0);
    plane(g, 2.4, 3.4, unlit(canvas(64, 64, (x, w, h) => { x.fillStyle = '#0a0a14'; x.fillRect(0, 0, w, h); x.fillStyle = '#ffd890'; x.fillRect(20, 30, 6, 6); x.fillRect(40, 20, 5, 7); }), 0.6), 0, 1.7, B - 0.3);
    backdrop(g, VIEW.quarter(), 0, Zc, 18, 18, -3, Math.PI * 0.5, Math.PI * 1.5); skyDome(g, 0, Zc, 50, [[0, '#06081c'], [0.6, '#141a44'], [1, '#3a2a50']]);
    // the galleries down both sides and across the front, on iron posts, ferns over the rails, lit windows behind
    const gf = M({ map: tex(PAINT.wood('#5a4028', '#4a3018', 30), 4, 1), roughness: 0.6 });
    for (const y of [3.4, 6.4]) {
      gallery(g, -W / 2 + 1.7, 2, -W / 2 + 1.7, B + 0.3, y, 1.7, gf, 'iron', 0x141414); gallery(g, W / 2 - 1.7, B + 0.3, W / 2 - 1.7, 2, y, 1.7, gf, 'iron', 0x141414); gallery(g, W / 2 - 1.7, 2, -W / 2 + 1.7, 2, y, 1.7, gf, 'iron', 0x141414);
      for (const s of [-1, 1]) for (let i = 0; i < 4; i++) { const z = -0.6 - i * 3.6; windowOn(g, canvas(64, 96, (x, w, h) => { x.fillStyle = '#3a2a1a'; x.fillRect(0, 0, w, h); const gg = x.createLinearGradient(0, 0, 0, h); gg.addColorStop(0, '#ffe0a0'); gg.addColorStop(1, '#c88a40'); x.fillStyle = gg; x.fillRect(6, 6, w - 12, h - 12); x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(w / 2 - 2, 6, 4, h - 12); x.fillRect(6, h / 2 - 2, w - 12, 4); }), s * (W / 2 - 0.02), y + 1.5, z, 1.0, 2.0, -s * P2, 0x1a2a1a); for (const t of [-1, 1]) box(g, 0.04, 2.1, 0.5, green, s * (W / 2 - 0.05), y + 1.5, z + t * 0.78); light(g, 0xffd090, 0.9, s * (W / 2 - 0.6), y + 1.6, z, 4); }
      for (const s of [-1, 1]) for (let i = 0; i < 7; i++) { const z = 1.5 - i * 2.1; const fern = new THREE.Group(); fern.position.set(s * (W / 2 - 1.7), y + 0.6, z); g.add(fern); for (let k = 0; k < 12; k++) { const lf = box(fern, 0.5, 0.05, 0.08, M({ color: pick([0x2f6a2a, 0x3a7a30, 0x4a8a3a]), roughness: 0.7 }), 0, 0, 0); lf.rotation.set(0, k / 12 * 6.283, -0.4 - rnd() * 0.5); lf.geometry.translate(0.25, 0, 0); } }
    }
    for (const s of [-1, 1]) for (let i = 0; i < 5; i++) cyl(g, 0.04, 0.04, H, iron, s * (W / 2 - 1.7), H / 2, 2 - i * 3.5, 8);
    // the walls above the galleries, the gas lamps on brackets, the strings of bulbs criss-crossing overhead
    for (const s of [-1, 1]) for (const z of [-2.0, -6.0, -10.0]) { const gl = new THREE.Group(); gl.position.set(s * (W / 2 - 0.1), 2.4, z); g.add(gl); box(gl, 0.04, 0.04, 0.3, iron, -s * 0.1, 0, 0, P2); cyl(gl, 0.12, 0.08, 0.32, M({ color: 0xfff0d0, emissive: 0xffa040, emissiveIntensity: 1.4, transparent: true, opacity: 0.85 }), -s * 0.25, 0.1, 0, 6); cyl(gl, 0.14, 0.02, 0.1, iron, -s * 0.25, 0.3, 0, 6); light(gl, 0xffa050, 1.2, -s * 0.35, 0.1, 0, 5); }
    for (let i = 0; i < 4; i++) stringLights(g, -W / 2 + 1.7, W / 2 - 1.7, 4.4 + (i % 2) * 0.3, -1.0 - i * 3.0, 0.5, 0xffd38a);
    for (const s of [-1, 1]) lampPost(g, s * 1.9, B + 1.0, 2.4, 0xffb050);
    // the fountain, the bananas, a few café tables, the piano under the gallery and the trio at it
    fountain(g, 0, -8.6, 1.5);
    for (const [x, z, s] of [[-4.6, -11.4, 1.1], [4.6, -11.4, 1.0], [-4.8, 0.8, 0.9], [4.8, 0.6, 1.0], [2.6, -10.8, 0.8]]) banana(g, x, z, s);
    for (const [x, z] of [[-3.8, -0.4], [3.9, -1.2], [-4.0, -4.2], [4.2, -5.6]]) bistro(g, x, z, STAGE !== 'final');
    pianoUpright(g, -4.2, -9.4, P2 + 0.3, 0x1a0e08); if (STAGE !== 'final') { stander(g, -3.5, -8.4, 2.2, { look: 'smart', arms: 'down', lod: 1 }); stander(g, -2.8, -9.6, 1.4, { look: 'smart', arms: 'crossed', lod: 1 }); stander(g, 3.6, -8.6, -1.2, { look: 'smart', lod: 1 }); }
    // the tables on the flagstones
    pokerTable(g, 1.4, -3.4, { mine: true, felt: 0x155e75, rail: 0x1a0a04, seats: 8, rx: 1.4, rz: 0.8, lamp: false, ceil: 4.2 });
    pokerTable(g, -2.6, -6.6, { felt: 0x155e75, rail: 0x1a0a04, seats: 8, rx: 1.4, rz: 0.8, ry: 0.45, lamp: false, full: 0.9, ceil: 4.2 });
    light(g, 0xffd0a0, 2.4, 1.4, 3.6, -3.4, 9); light(g, 0xffd0a0, 2.2, -2.6, 3.6, -6.6, 9);
    return { exposure: 1.05, cam: [[-4.0, 1.6, 1.0], [1.2, 2.4, -9.0]] };
  },
  // a St. James's club: oak and leather, a deep bay window on the river with Westminster across it, the fire and its club
  // fender, the library wall with its ladder, a snooker table under a long brass light, decanters on the tray
  london(g, o) {
    const W = 11, D = 13, H = 4.4, Zc = 2 - D / 2, B = 2 - D, P2 = Math.PI / 2;
    const panel = PAINT.panel('#2a1a10', '#3a2416');
    shell(g, { w: W, d: D, h: H, floor: PAINT.carpet('#1a2a1a', '#24381e', '#c8a050', 'diamond'), wall: panel, ceil: PAINT.coffer('#3a2416', '#24160c'), back: false, trim: 0x1a0e08, cornice: 0x3a2416, fillI: 0.9, fillC: 0xffd8b0 });
    const oak = M({ map: tex(panel, 2, 1), roughness: 0.5 }), brass = M({ color: 0xc8a050, metalness: 0.9, roughness: 0.3 }), view = VIEW.london();
    // the back wall either side of the bay, the lintel, then the bay itself: five sashes on the arc, a cushioned seat round it
    for (const s of [-1, 1]) plane(g, (W - 5.6) / 2, H, M({ map: tex(panel, 1.2, 1.8), roughness: 0.5 }), s * (W / 2 - (W - 5.6) / 4), H / 2, B); plane(g, 5.6, H - 3.6, M({ map: tex(panel, 2.3, 0.4), roughness: 0.5 }), 0, H - (H - 3.6) / 2, B);
    const bay = new THREE.Group(); bay.position.set(0, 0, B); g.add(bay);
    bayWindow(bay, view, 0, 2.0, 0, 3.0, 2.8, 5, Math.PI * 0.78, 0xf0ebe0);
    const cap = new THREE.Mesh(new THREE.CircleGeometry(3.3, 32, Math.PI, Math.PI), M({ color: 0x2a1a10, roughness: 0.7 })); cap.rotation.x = P2; cap.position.set(0, 3.6, 0); bay.add(cap); cap.userData.flat = 1;
    const fl2 = new THREE.Mesh(new THREE.CircleGeometry(3.3, 32, Math.PI, Math.PI), M({ map: tex(PAINT.wood('#4a2a14', '#3a2010', 20), 2, 2), roughness: 0.4 })); fl2.rotation.x = -P2; fl2.position.set(0, 0.16, 0); bay.add(fl2); fl2.userData.flat = 1;
    box(bay, 5.6, 0.16, 0.3, oak, 0, 0.08, 0.15);
    for (let i = 0; i < 5; i++) { const a = -Math.PI * 0.39 + (i + 0.5) * Math.PI * 0.78 / 5, r = 2.5; const st = rbox(bay, 1.5, 0.12, 0.6, 0.04, cloth(0x5a1a12, 0.8), Math.sin(a) * r, 0.56, -Math.cos(a) * r, -a); box(bay, 1.5, 0.4, 0.6, oak, Math.sin(a) * r, 0.3, -Math.cos(a) * r, -a); }
    for (const s of [-1, 1]) curtain(g, s * 2.5, 2.0, B + 0.4, 0.7, 3.4, 0x2a3a2a);
    // the fire on the right with its club fender and two wing chairs; the library wall on the left with its ladder
    fireplace(g, W / 2 - 0.3, -5.5, -P2); box(g, 0.06, 0.4, 2.6, brass, W / 2 - 1.3, 0.2, -5.5); rbox(g, 0.4, 0.1, 2.6, 0.03, cloth(0x5a1a12, 0.7), W / 2 - 1.3, 0.45, -5.5);
    for (const t of [-1, 1]) sofa(g, W / 2 - 2.0, -5.5 + t * 1.6, -P2 + t * 0.9, 0x4a2a14, 1.0);
    for (let i = 0; i < 3; i++) shelves(g, -W / 2 + 0.25, -2.2 - i * 3.0, 2.8, 3.9, P2);
    const lad = new THREE.Group(); lad.position.set(-W / 2 + 0.75, 0, -4.6); lad.rotation.z = 0.18; g.add(lad); for (const s of [-1, 1]) box(lad, 0.05, 3.6, 0.05, oak, s * 0.22, 1.8, 0); for (let i = 0; i < 9; i++) box(lad, 0.44, 0.04, 0.04, oak, 0, 0.3 + i * 0.4, 0);
    box(g, 0.04, 0.04, 9, brass, -W / 2 + 0.6, 3.95, -5.5);
    // the snooker table under its long light, at the front on the left
    poolTable(g, -2.6, -1.0, P2, 0x1f6b45); for (let i = -1; i <= 1; i++) { const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.3, 0.26, 24, 1, true), M({ color: 0x1a5a2a, side: THREE.DoubleSide, roughness: 0.3, metalness: 0.2 })); sh.position.set(-2.6, 2.0, -1.0 + i * 0.9); g.add(sh); sph(g, 0.06, glow(0xffe8c0, 3), -2.6, 1.9, -1.0 + i * 0.9, 8); cyl(g, 0.006, 0.006, 2.3, brass, -2.6, 3.2, -1.0 + i * 0.9, 4); } light(g, 0xffe8c0, 1.8, -2.6, 1.8, -1.0, 5);
    // decanters on a tray, a grandfather clock, portraits of the members, the chesterfields, the chandeliers
    rbox(g, 0.9, 0.04, 0.5, 0.01, brass, 3.4, 0.76, -9.6); cyl(g, 0.05, 0.05, 0.74, oak, 3.4, 0.37, -9.6, 10); for (let i = 0; i < 3; i++) { const dc = new THREE.Mesh(new THREE.LatheGeometry([[0.001, 0], [0.07, 0], [0.09, 0.1], [0.06, 0.2], [0.025, 0.24], [0.025, 0.3], [0.04, 0.33], [0.001, 0.33]].map(q => new THREE.Vector2(q[0], q[1])), 12), new THREE.MeshPhysicalMaterial({ color: pick([0xc87a30, 0x8a3a1a, 0xd8d8c0]), roughness: 0.05, transmission: 0.5, thickness: 0.05 })); dc.position.set(3.15 + i * 0.26, 0.78, -9.6); g.add(dc); }
    box(g, 0.5, 2.3, 0.35, oak, 4.0, 1.15, 1.75); cyl(g, 0.16, 0.16, 0.02, M({ color: 0xf4ecd8 }), 4.0, 1.9, 1.56, 24).rotation.x = P2; box(g, 0.36, 1.2, 0.02, M({ color: 0xc8a050, metalness: 0.9, roughness: 0.3, transparent: true, opacity: 0.4 }), 4.0, 1.0, 1.56);
    for (let i = 0; i < 3; i++) photo(g, -3.6 + i * 2.8, 2.5, 1.96, 0.9, 1.2, Math.PI, 'portrait', 0xb08a40); photo(g, W / 2 - 0.03, 2.6, -8.6, 1.0, 1.3, -P2, 'portrait', 0xb08a40);
    sofa(g, 3.0, 1.2, Math.PI, 0x5a1a12, 2.2); sofa(g, -4.6, -8.2, P2, 0x5a1a12, 2.0);
    for (const [x, z] of [[1.8, -3.6], [-2.6, -7.6]]) { chandelier(g, x, 3.5, z, 0.9, 0xffc890); }
    for (const [x, z] of [[-4.2, -10.2], [4.2, 0.4]]) { cyl(g, 0.04, 0.05, 0.9, brass, x, 0.45, z, 8); const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.5, 16, 1, true, 0, Math.PI), M({ color: 0x1a5a2a, emissive: 0x1a5a2a, emissiveIntensity: 0.4, side: THREE.DoubleSide, roughness: 0.2 })); sh.rotation.z = P2; sh.position.set(x, 1.0, z); g.add(sh); sph(g, 0.04, glow(0xffe8c0, 3), x, 0.97, z, 8); light(g, 0xffe8c0, 0.7, x, 1.0, z, 3); }
    // the tables
    pokerTable(g, 1.8, -3.6, { mine: true, felt: 0x1a3a2a, rail: 0x1a0a04, seats: 8, rx: 1.4, rz: 0.8, lamp: false, ceil: 3.6 });
    pokerTable(g, -2.6, -7.6, { felt: 0x1a3a2a, rail: 0x1a0a04, seats: 8, rx: 1.4, rz: 0.8, ry: 0.5, lamp: false, full: 0.9, ceil: 3.6 });
    if (STAGE !== 'final') { stander(g, 2.4, -8.8, 0.6, { look: 'smart', arms: 'down', lod: 1 }); stander(g, -1.0, 0.4, 2.6, { look: 'smart', arms: 'crossed', lod: 1 }); }
    return { exposure: 1.05, cam: [[4.3, 1.5, 1.3], [-1.6, 1.5, -7.8]] };
  },
  // a Viennese Kaffeehaus: a long high room, round-topped windows down one side on the Ring and the Stephansdom, red velvet
  // banquettes under tall mirrors down the other, marble bistro tables between, globe lamps on brass stems, the pastry case
  vienna(g, o) {
    const W = 9, D = 20, H = 5.9, Zc = 2 - D / 2, B = 2 - D, P2 = Math.PI / 2;
    const herring = canvas(256, 256, (x, w, h) => { x.fillStyle = '#9a6a3a'; x.fillRect(0, 0, w, h); for (let i = -8; i < 16; i++) for (let j = 0; j < 8; j++) { x.save(); x.translate(j * 32, i * 32); x.rotate(j % 2 ? Math.PI / 4 : -Math.PI / 4); x.fillStyle = '#' + new THREE.Color('#a0703e').offsetHSL(0, 0, (rnd() - 0.5) * 0.1).getHexString(); x.fillRect(-4, -14, 40, 12); x.fillStyle = 'rgba(0,0,0,.3)'; x.fillRect(-4, -14, 40, 1); x.restore(); } }); herring.__kind = 'wood';
    shell(g, { w: W, d: D, h: H, floor: herring, wall: PAINT.damask('#f4f0e8', '#e8e0d4'), ceil: null, trim: 0x3a2010, fillI: 1.2 });
    const cream = M({ map: tex(PAINT.plain('#f6f2ea'), 4, 4), roughness: 0.9 }), oak = M({ map: tex(PAINT.wood('#4a2a14', '#3a2010', 20), 2, 1), roughness: 0.4 }), brass = M({ color: 0xc8a050, metalness: 0.9, roughness: 0.3 });
    vault(g, 0, H - 2.1, Zc, W, D, cream, false, 0.42); box(g, W, 0.12, 0.12, M({ color: 0xe0d8c8, roughness: 0.7 }), 0, H - 2.1, B + 0.06); for (const s of [-1, 1]) box(g, 0.12, 0.12, D, M({ color: 0xe0d8c8, roughness: 0.7 }), s * (W / 2 - 0.06), H - 2.1, Zc);
    for (let i = 0; i <= 5; i++) { const rb = new THREE.Mesh(new THREE.TorusGeometry(W / 2 - 0.04, 0.08, 6, 36, Math.PI), M({ color: 0xe8e0d0, roughness: 0.8 })); rb.position.set(0, H - 2.1, 1.6 - i * 3.8); rb.scale.y = 0.42; g.add(rb); }
    // the dark wainscot round the room, the windows down the left on the Ring, the mirrors and banquettes down the right
    for (const s of [-1, 1]) plane(g, D, 1.1, M({ map: tex(PAINT.panel('#3a2010', '#4a2a16'), 10, 0.5), roughness: 0.5 }), s * (W / 2 - 0.01), 0.55, Zc, -s * P2);
    plane(g, W, 1.1, M({ map: tex(PAINT.panel('#3a2010', '#4a2a16'), 4, 0.5), roughness: 0.5 }), 0, 0.55, B + 0.01);
    const view = VIEW.vienna();
    for (let i = 0; i < 5; i++) { const z = -0.6 - i * 3.8; archWindow(g, view, -W / 2 + 0.02, 2.6, z, 2.0, 3.6, P2, 0xf0ebe0); box(g, 0.02, 0.02, 2.2, brass, -W / 2 + 0.12, 2.1, z); curtain(g, -W / 2 + 0.1, 1.5, z, 2.1, 1.2, 0xfaf6ee, P2); light(g, 0xd8e0ff, 0.5, -W / 2 + 0.6, 2.6, z, 4); }
    for (let i = 0; i < 5; i++) { const z = -0.6 - i * 3.8; mirrorAt(g, W / 2 - 0.05, 2.5, z, 2.2, 2.2, -P2, 0xc8a050); sconce(g, W / 2 - 0.08, 3.0, z + 1.5, -P2, 0xffe0b0); sofa(g, W / 2 - 0.5, z, -P2, 0x8a1a1a, 3.4); }
    // globe lamps on brass stems, down the middle and over the banquettes
    const globe = (x, z, y) => { cyl(g, 0.012, 0.012, H - 2.3 - y, brass, x, (H - 2.3 + y) / 2, z, 6); sph(g, 0.17, glow(0xfff0d8, 2.2), x, y, z, 14); light(g, 0xfff0d8, 1.6, x, y - 0.1, z, 6); };
    for (let i = 0; i < 5; i++) { globe(W / 2 - 1.5, -0.6 - i * 3.8, 2.4); globe(-W / 2 + 1.5, -2.5 - i * 3.8, 2.4); }
    // the café: bistro tables by the windows and the banquettes, the papers, the coat stand, the pastry case and the espresso machine at the back
    for (let i = 0; i < 5; i++) { bistro(g, -W / 2 + 1.3, -2.5 - i * 3.8, STAGE !== 'final'); bistro(g, W / 2 - 1.5, -2.5 - i * 3.8 + 0.3, STAGE !== 'final'); }
    paperRack(g, -W / 2 + 0.6, 1.2, P2 + 0.3); cyl(g, 0.02, 0.02, 1.8, oak, W / 2 - 0.6, 0.9, 1.3, 8); cyl(g, 0.22, 0.22, 0.03, oak, W / 2 - 0.6, 0.015, 1.3, 16); for (let k = 0; k < 4; k++) { const hk = box(g, 0.02, 0.02, 0.22, oak, W / 2 - 0.6, 1.7, 1.3, k * P2 / 2); } rbox(g, 0.4, 0.5, 0.1, 0.05, cloth(0x2a2a30), W / 2 - 0.75, 1.45, 1.3);
    vitrine(g, 0.6, B + 0.8, 3.4, 0); box(g, 2.2, 1.0, 0.7, oak, -2.9, 0.5, B + 0.8); rbox(g, 0.7, 0.5, 0.5, 0.04, M({ color: 0xd8d8e0, metalness: 0.95, roughness: 0.2 }), -2.9, 1.27, B + 0.8); cyl(g, 0.04, 0.04, 0.3, M({ color: 0xd8d8e0, metalness: 0.95, roughness: 0.2 }), -2.6, 1.6, B + 0.8, 10); for (let k = 0; k < 6; k++) cyl(g, 0.035, 0.03, 0.06, M({ color: 0xffffff, roughness: 0.3 }), -3.6 + k * 0.14, 1.03, B + 1.0, 10);
    shelves(g, -2.9, B + 0.25, 2.2, 3.0, 0, 'bottles'); box(g, 0.02, 0.02, 1.2, brass, 2.3, 1.0, B + 0.5);
    if (STAGE !== 'final') { stander(g, -0.8, B + 1.9, 0.2, { look: 'smart', arms: 'down', lod: 1 }); stander(g, 1.6, -7.4, 2.4, { look: 'smart', arms: 'table', lod: 1 }); }
    // the card tables down the middle
    pokerTable(g, 0.3, -3.8, { mine: true, felt: 0x4a1f4f, rail: 0x1a0a04, seats: 8, rx: 1.4, rz: 0.8, lamp: false, ceil: 3.6 });
    pokerTable(g, -0.3, -10.0, { felt: 0x4a1f4f, rail: 0x1a0a04, seats: 8, rx: 1.4, rz: 0.8, ry: 0.15, lamp: false, full: 0.9, ceil: 3.6 });
    pokerTable(g, 0.4, -15.6, { felt: 0x4a1f4f, rail: 0x1a0a04, seats: 8, rx: 1.4, rz: 0.8, ry: -0.15, lamp: false, full: 0.9, ceil: 3.6 });
    for (const z of [-3.8, -10.0, -15.6]) { globe(0.3, z, 2.7); }
    return { exposure: 1.0, cam: [[3.3, 1.5, 1.3], [-0.6, 1.7, -14]] };
  },
  // Marina Bay from fifty-seven floors up: a glass corner, a terrace with an infinity pool past it, the Sands and the
  // Supertrees below; teak overhead, white terrazzo, a living wall of ferns and orchids
  singapore(g, o) {
    const W = 16, D = 14, H = 4.0, Zc = 2 - D / 2, B = 2 - D, P2 = Math.PI / 2;
    shell(g, { w: W, d: D, h: H, floor: PAINT.marble('#e8e4dc', '#a8a49c'), wall: PAINT.panel('#5a4430', '#6a5038'), ceil: PAINT.wood('#6a5038', '#5a4430', 40), back: false, left: false, trim: 0x2a2a2a, fillI: 1.1, floorRough: 0.2 });
    const steel = M({ color: 0x2a2a2e, metalness: 0.8, roughness: 0.3 }), view = VIEW.singapore(), teak = M({ map: tex(PAINT.wood('#7a5a38', '#5a4028', 30), 6, 1), roughness: 0.5 });
    // the glass on two sides, floor to ceiling, slim black mullions
    const glassM = () => M({ color: 0x9ab0c8, metalness: 1, roughness: 0.25, transparent: true, opacity: 0.07, envMapIntensity: 1.5 }); plane(g, W - 0.2, H - 0.1, glassM(), 0, H / 2, B + 0.02); plane(g, D - 0.2, H - 0.1, glassM(), -W / 2 + 0.02, H / 2, Zc, P2);
    for (let i = -3; i <= 3; i++) box(g, 0.06, H, 0.1, steel, i * 2.6, H / 2, B + 0.06); for (let i = -2; i <= 2; i++) box(g, 0.1, H, 0.06, steel, -W / 2 + 0.06, H / 2, Zc + i * 2.6); box(g, 0.14, H, 0.14, steel, -W / 2 + 0.07, H / 2, B + 0.07);
    box(g, W, 0.08, 0.1, steel, 0, 0.04, B + 0.06); box(g, 0.1, 0.08, D, steel, -W / 2 + 0.06, 0.04, Zc); box(g, W, 0.12, 0.12, steel, 0, H - 0.06, B + 0.06);
    // the terrace past the glass: a teak deck, the pool lit from under, loungers, a glass rail, the bay beyond
    ground(g, 26, 9, teak, -2, B - 4.6, -0.02); pool(g, 0, B - 5.0, 11, 3.4);
    for (let i = 0; i < 5; i++) adirondack(g, -5.5 + i * 2.6, B - 2.2, Math.PI, 0xf0ebe0);
    for (let i = 0; i < 3; i++) { cyl(g, 0.3, 0.26, 0.5, M({ color: 0xf0ebe0, roughness: 0.5 }), -9.6, 0.25, B - 1.5 - i * 2.6, 16); plant(g, -9.6, B - 1.5 - i * 2.6, 1.3, false); }
    for (let i = 0; i < 6; i++) box(g, 0.06, 1.1, 0.06, steel, -11 + i * 4.4, 0.55, B - 8.8); plane(g, 22, 1.0, M({ color: 0xa8c8d8, metalness: 0.2, roughness: 0.05, transparent: true, opacity: 0.25 }), -0.2, 0.55, B - 8.8); box(g, 22.2, 0.05, 0.05, steel, -0.2, 1.1, B - 8.8);
    for (let i = 0; i < 4; i++) { cyl(g, 0.02, 0.02, 0.5, steel, -8 + i * 5, 0.25, B - 8.4, 6); sph(g, 0.06, glow(0xffd890, 3), -8 + i * 5, 0.52, B - 8.4, 8); light(g, 0xffd890, 0.6, -8 + i * 5, 0.5, B - 8.4, 3); }
    backdrop(g, view, 0, Zc, 26, 20, -6, Math.PI * 0.35, Math.PI * 1.75); skyDome(g, 0, Zc, 60, [[0, '#06081c'], [0.55, '#1a1e4a'], [1, '#4a3060']]);
    // the teak ceiling's recessed strips, the living wall down the right, orchids on their plinths
    for (let i = 0; i < 4; i++) { box(g, W - 2, 0.03, 0.08, glow(0xfff0d8, 2.6), 0, H - 0.03, -1.0 - i * 3.0); light(g, 0xfff0d8, 1.4, 0, H - 0.4, -1.0 - i * 3.0, 9); }
    greenWall(g, W / 2 - 0.1, 2.0, Zc, D - 1.0, 3.4, -P2);
    for (const z of [-1.5, -5.5, -9.5]) { box(g, 0.5, 0.9, 0.5, M({ color: 0xf4f0e8, roughness: 0.3 }), W / 2 - 0.9, 0.45, z); cyl(g, 0.14, 0.11, 0.3, M({ color: 0xf4f0e8, roughness: 0.2 }), W / 2 - 0.9, 1.05, z, 14); for (let k = 0; k < 3; k++) { seg(g, [W / 2 - 0.9, 1.2, z], [W / 2 - 0.9 + (k - 1) * 0.15, 1.7, z + 0.1], 0.008, 0.006, M({ color: 0x3a5a2a })); for (let f = 0; f < 4; f++) sph(g, 0.04, M({ color: pick([0xf4e8f4, 0xe8a8d8, 0xf8f4f8]), roughness: 0.5 }), W / 2 - 0.9 + (k - 1) * 0.15 + f * 0.04, 1.7 - f * 0.06, z + 0.12, 8); } }
    // a low teak console by the front wall, a lounge corner, the tables
    box(g, 3.2, 0.7, 0.5, teak, 2.0, 0.35, 1.7); cyl(g, 0.16, 0.16, 0.5, M({ color: 0xffffff, emissive: 0xfff0d8, emissiveIntensity: 0.8, roughness: 0.5 }), 0.8, 0.95, 1.7, 16); cyl(g, 0.16, 0.16, 0.5, M({ color: 0xffffff, emissive: 0xfff0d8, emissiveIntensity: 0.8, roughness: 0.5 }), 3.2, 0.95, 1.7, 16);
    sofa(g, -4.8, 1.3, Math.PI, 0xe8e4dc, 2.4); sofa(g, -6.8, -0.6, P2, 0xe8e4dc, 2.0);
    const pend = (x, z) => { for (let k = -1; k <= 1; k++) { const px = x + k * 0.5; cyl(g, 0.004, 0.004, 1.4 + (k % 2) * 0.3, steel, px, 3.3, z, 4); sph(g, 0.12, M({ color: 0xc8a050, metalness: 0.9, roughness: 0.2, emissive: 0xffc070, emissiveIntensity: 0.3 }), px, 2.55 - (k % 2) * 0.3, z, 16); sph(g, 0.06, glow(0xffe0b0, 3), px, 2.46 - (k % 2) * 0.3, z, 8); } light(g, 0xffe0b0, 1.4, x, 2.4, z, 6); };
    pokerTable(g, 1.4, -2.8, { mine: true, felt: 0x0e4a4a, rail: 0x1a0a04, seats: 8, rx: 1.4, rz: 0.8, lamp: false, ceil: 3.4 }); pend(1.4, -2.8);
    pokerTable(g, -4.4, -6.0, { felt: 0x0e4a4a, rail: 0x1a0a04, seats: 8, rx: 1.4, rz: 0.8, ry: 0.3, lamp: false, full: 0.9, ceil: 3.4 }); pend(-4.4, -6.0);
    pokerTable(g, 4.2, -7.8, { felt: 0x0e4a4a, rail: 0x1a0a04, seats: 8, rx: 1.4, rz: 0.8, ry: -0.3, lamp: false, full: 0.9, ceil: 3.4 }); pend(4.2, -7.8);
    if (STAGE !== 'final') { stander(g, -1.6, -9.6, 0.4, { look: 'smart', arms: 'down', lod: 1 }); stander(g, 5.6, -1.2, -1.8, { look: 'smart', arms: 'crossed', lod: 1 }); const outside = new THREE.Group(); g.add(outside); stander(outside, 3.0, B - 3.4, 0.4, { arms: 'crossed', lod: 1 }); stander(outside, -6.8, B - 7.4, 2.8, { arms: 'pockets', lod: 1 }); }
    return { exposure: 1.05, cam: [[6.4, 1.5, 1.3], [-1.8, 1.6, -9.0]] };
  },
  // Nassau: no walls at all. A thatched pavilion on a deck in the sand, the sea twenty yards off at sunset, palms leaning
  // over the roof, tiki torches round the edge, a beach bar, Atlantis's towers across the water
  nassau(g, o) {
    const W = 14, D = 12, Zc = 2 - D / 2, B = 2 - D, P2 = Math.PI / 2;
    const deck = PAINT.planks('#c8a878', '#a88858'); const fl = tex(deck, W / 2, D / 2);
    const floor = plane(g, W, D, M({ map: fl, bumpMap: fl, bumpScale: 0.6, roughness: 0.7 }), 0, 0.02, Zc, 0, -P2); floor.userData.flat = 1;
    box(g, W + 0.3, 0.16, D + 0.3, M({ map: tex(deck, 8, 1), roughness: 0.8 }), 0, -0.08, Zc);
    const sand = canvas(256, 256, (x, w, h) => { x.fillStyle = '#e8d8b8'; x.fillRect(0, 0, w, h); noise(x, w, h, 0.18, 14000); for (let i = 0; i < 40; i++) { x.fillStyle = 'rgba(120,100,70,.12)'; x.beginPath(); x.ellipse(rnd() * w, rnd() * h, 10 + rnd() * 30, 3 + rnd() * 6, rnd() * 3, 0, 7); x.fill(); } }); sand.__kind = 'stucco';
    ground(g, 90, 50, M({ map: tex(sand, 30, 16), roughness: 0.95 }), 0, Zc - 6, -0.04);
    water(g, 100, 50, 0, B - 30, -0.03, 0x1a7a8a); for (let i = 0; i < 3; i++) { const foam = plane(g, 90, 0.6, M({ color: 0xf4f8f8, transparent: true, opacity: 0.5 - i * 0.12, roughness: 0.9 }), 0, -0.02, B - 5.6 - i * 0.9, 0, -P2); foam.userData.flat = 1; }
    const view = VIEW.nassau(); backdrop(g, view, 0, Zc, 38, 15, -4.5, Math.PI * 0.15, Math.PI * 1.85); skyDome(g, 0, Zc, 70, [[0, '#101040'], [0.45, '#4a2a6a'], [0.75, '#c86a5a'], [1, '#ffb070']]);
    // the pavilion: a hip of thatch on white posts, string lights under the eaves, lanterns over the tables
    thatchRoof(g, 0, Zc, W, D, 3.2, 5.6);
    for (const s of [-1, 1]) stringLights(g, -W / 2, W / 2, 3.0, Zc + s * D / 2, 0.35, 0xffd38a); for (const s of [-1, 1]) for (let i = 0; i < 6; i++) { sph(g, 0.05, glow(0xffd38a, 3.5), s * W / 2, 2.9 - Math.sin(i / 5 * Math.PI) * 0.3, Zc - D / 2 + 1 + i * 2, 8); }
    const lant = (x, z) => { cyl(g, 0.005, 0.005, 1.2, M({ color: 0x3a2a1a }), x, 3.4, z, 4); const l = cyl(g, 0.16, 0.2, 0.3, M({ color: 0xd8c0a0, emissive: 0xffb050, emissiveIntensity: 1.0, roughness: 0.9 }), x, 2.7, z, 8); cyl(g, 0.22, 0.05, 0.12, M({ color: 0x6a5030 }), x, 2.9, z, 8); light(g, 0xffc070, 2.2, x, 2.5, z, 7); };
    lant(1.4, -3.0); lant(-3.2, -6.4); lant(4.6, -7.6);
    // the beach bar on the left: rum bottles, a thatch brim, a sign; stools and a few at them
    bar(g, -5.4, -2.6, 4.2, { ry: P2, wood: '#8a6a3a', wood2: '#6a4a24', top: 0x5a3a1a, crowd: 0.5 }); sign(g, 'CONCH SHACK', '#1a6a8a', '#ffe8b0', -6.6, 2.4, -2.6, 2.2, 0.4, P2);
    // tiki torches round the deck, Adirondacks on the sand facing the water, a fire pit, a surfboard against a post
    for (const [x, z] of [[-8.0, 1.6], [8.0, 1.6], [-8.0, -5.0], [8.0, -5.0], [-8.0, -11.6], [8.0, -11.6], [-3, -13.0], [3, -13.0]]) torch(g, x, z);
    for (let i = 0; i < 4; i++) adirondack(g, -4.5 + i * 3.0, B - 3.2 - (i % 2) * 0.6, Math.PI + (rnd() - 0.5) * 0.3, pick([0xf0ebe0, 0x3ab8c8, 0xf0d060]));
    cyl(g, 0.7, 0.8, 0.3, M({ map: tex(PAINT.brick('#8a8078', '#4a4640'), 2, 1), roughness: 0.9 }), 6.0, 0.1, B - 4.0, 16); sph(g, 0.25, glow(0xff7a20, 4), 6.0, 0.35, B - 4.0, 8).scale.y = 1.5; light(g, 0xff8a30, 2.6, 6.0, 0.6, B - 4.0, 6);
    const sb = rbox(g, 0.5, 2.4, 0.06, 0.2, M({ color: 0xf0d060, roughness: 0.4 }), W / 2 + 0.2, 1.1, Zc - D / 2 + 0.6); sb.rotation.z = -0.25; sb.rotation.y = 0.3;
    // the palms, leaning over the roof and down the beach
    for (const [x, z, h, l] of [[-9.2, -1.0, 6.5, 0.9], [9.4, -3.6, 5.8, -0.8], [-8.6, -9.0, 7.0, 0.7], [10.0, -10.5, 6.2, -1.0], [-13, -14, 5.5, 0.5], [13.5, -15, 6.0, -0.6], [-10, 4, 5.0, 0.8], [11, 5, 5.4, -0.5], [-16, -6, 6.4, 0.9], [16, -7, 5.8, -0.7]]) palmTree(g, x, z, h, l);
    // the tables on the deck
    pokerTable(g, 1.4, -3.0, { mine: true, felt: 0x1a6a8a, rail: 0x3a2414, seats: 8, rx: 1.4, rz: 0.8, lamp: false, ceil: 2.9 });
    pokerTable(g, -3.2, -6.4, { felt: 0x1a6a8a, rail: 0x3a2414, seats: 8, rx: 1.4, rz: 0.8, ry: 0.4, lamp: false, full: 0.9, ceil: 2.9 });
    pokerTable(g, 4.6, -7.6, { felt: 0x1a6a8a, rail: 0x3a2414, seats: 8, rx: 1.4, rz: 0.8, ry: -0.5, lamp: false, full: 0.9, ceil: 2.9 });
    light(g, 0xffd0a0, 1.8, 0, 2.8, Zc, 12); light(g, 0xff9a60, 1.2, 0, 3, B - 8, 20);
    if (STAGE !== 'final') { stander(g, -1.2, -9.8, 0.3, { arms: 'crossed', lod: 1 }); stander(g, 6.2, -1.2, -1.6, { look: 'smart', arms: 'down', lod: 1 }); stander(g, 2.0, B - 2.4, Math.PI, { arms: 'pockets', lod: 1 }); }
    return { exposure: 1.05, cam: [[-6.9, 1.6, 2.0], [1.4, 1.7, -9.0]] };
  },
  // Prague: a gothic hall in an Old Town palace, ribbed vaults on two rows of stone columns, pointed windows on the Castle
  // across the river, tapestries and torches on the walls, iron candle-rings, a fireplace you could stand in
  prague(g, o) {
    const W = 10, D = 16, H = 4.2, Zc = 2 - D / 2, B = 2 - D, P2 = Math.PI / 2;
    const stone = PAINT.stucco('#b8a888'), flags = PAINT.tile('#8a8078', '#6a6058', 6);
    shell(g, { w: W, d: D, h: 8.2, floor: flags, wall: stone, ceil: null, trim: 0x5a5048, fillI: 0.8, fillC: 0xffc080 });
    const st = M({ map: tex(stone, 1, 2), roughness: 0.9 }), iron = M({ color: 0x141414, metalness: 0.6, roughness: 0.5 });
    vault(g, 0, H, Zc, W, D, M({ map: tex(stone, 4, 6), roughness: 0.9 }), false, 0.78);
    for (let i = 0; i <= 4; i++) { const z = 2 - i * 4; for (const s of [-1, 1]) column(g, s * 3.0, z, H, st, st); ribArch(g, -3.0, z, 3.0, z, H, 2.2, 0.1, st); for (const s of [-1, 1]) ribArch(g, s * 3.0, z, s * (W / 2), z, H, 1.2, 0.08, st); if (i < 4) { ribArch(g, -3.0, z, 3.0, z - 4, H, 2.4, 0.07, st); ribArch(g, 3.0, z, -3.0, z - 4, H, 2.4, 0.07, st); for (const s of [-1, 1]) ribArch(g, s * 3.0, z, s * 3.0, z - 4, H, 1.6, 0.08, st); } }
    // the pointed windows on the Castle, lead lines across them
    const view = VIEW.prague(); for (let i = -1; i <= 1; i++) { archWindow(g, view, i * 3.0, 3.8, B + 0.03, 2.0, 5.0, 0, 0x3a3028, true); for (let k = 0; k < 6; k++) box(g, 2.0, 0.015, 0.03, iron, i * 3.0, 1.6 + k * 0.7, B + 0.09); for (let k = -1; k <= 1; k++) box(g, 0.015, 4.6, 0.03, iron, i * 3.0 + k * 0.6, 3.6, B + 0.09); }
    // tapestries and torches down the side walls, the great fireplace, a shield over it
    const tap = canvas(256, 384, (x, w, h) => { x.fillStyle = '#5a1a1a'; x.fillRect(0, 0, w, h); x.fillStyle = '#c8a050'; x.fillRect(12, 12, w - 24, 6); x.fillRect(12, h - 18, w - 24, 6); for (let i = 0; i < 3; i++) for (let j = 0; j < 4; j++) { x.save(); x.translate(50 + i * 78, 70 + j * 80); x.fillStyle = (i + j) % 2 ? '#c8a050' : '#e8d8b0'; x.beginPath(); x.moveTo(0, -22); x.lineTo(16, 0); x.lineTo(0, 22); x.lineTo(-16, 0); x.fill(); x.fillStyle = '#1a1a2a'; x.beginPath(); x.arc(0, 0, 7, 0, 7); x.fill(); x.restore(); } noise(x, w, h, 0.2, 9000); });
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) { const z = -2 - i * 4.4; plane(g, 1.6, 2.4, M({ map: tex(tap), roughness: 1 }), s * (W / 2 - 0.04), 2.6, z, -s * P2); box(g, 1.7, 0.04, 0.04, iron, s * (W / 2 - 0.06), 3.84, z, 0); for (const t of [-1, 1]) { const tz = z + t * 1.6; box(g, 0.05, 0.05, 0.3, iron, s * (W / 2 - 0.15), 2.3, tz, 0); cyl(g, 0.05, 0.03, 0.35, M({ color: 0x3a2a1a }), s * (W / 2 - 0.3), 2.42, tz, 8); const fl = sph(g, 0.09, glow(0xff8a20, 4), s * (W / 2 - 0.3), 2.7, tz, 8); fl.scale.y = 1.8; light(g, 0xff9a30, 1.4, s * (W / 2 - 0.4), 2.7, tz, 6); } }
    fireplace(g, W / 2 - 0.3, -7.0, -P2); plane(g, 0.8, 1.0, M({ map: tex(canvas(64, 80, (x, w, h) => { x.fillStyle = '#c8a050'; x.beginPath(); x.moveTo(4, 4); x.lineTo(w - 4, 4); x.lineTo(w - 4, h * 0.6); x.quadraticCurveTo(w / 2, h, w / 2, h - 4); x.quadraticCurveTo(w / 2, h, 4, h * 0.6); x.fill(); x.fillStyle = '#8a1010'; x.fillRect(10, 10, w - 20, h * 0.45); x.fillStyle = '#fff'; x.beginPath(); x.arc(w / 2, 26, 9, 0, 7); x.fill(); })), roughness: 0.6 }), W / 2 - 0.62, 3.8, -7.0, -P2);
    // the iron candle-rings down the nave, a long oak board with pewter and a barrel by the wall
    const ring = (x, z) => { const c = new THREE.Group(); c.position.set(x, 3.4, z); g.add(c); const tor = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.03, 6, 36), iron); tor.rotation.x = P2; c.add(tor); for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; cyl(c, 0.018, 0.018, 0.16, M({ color: 0xf4ecd8 }), Math.cos(a) * 0.75, 0.1, Math.sin(a) * 0.75, 8); sph(c, 0.025, glow(0xffb050, 4), Math.cos(a) * 0.75, 0.2, Math.sin(a) * 0.75, 6); } for (let k = 0; k < 3; k++) { const ch = seg(c, [Math.cos(k * 2.09) * 0.75, 0, Math.sin(k * 2.09) * 0.75], [0, 1.6, 0], 0.01, 0.01, iron); } cyl(c, 0.01, 0.01, H + 3.0 - 5.0, iron, 0, 1.6 + (H + 3.0 - 5.0) / 2, 0, 4); light(c, 0xffb860, 3.0, 0, 0.1, 0, 8); };
    ring(0.8, -3.4); ring(-0.6, -8.4); ring(0.6, -12.6);
    box(g, 0.9, 0.06, 3.2, M({ map: tex(PAINT.wood('#5a3a1a', '#3a2410', 10), 1, 4), roughness: 0.6 }), -W / 2 + 0.9, 0.78, -10.4); for (const s of [-1, 1]) box(g, 0.7, 0.72, 0.1, M({ color: 0x3a2410 }), -W / 2 + 0.9, 0.36, -10.4 + s * 1.4); for (let i = 0; i < 5; i++) cyl(g, 0.05, 0.04, 0.16, M({ color: 0x8a8a90, metalness: 0.8, roughness: 0.35 }), -W / 2 + 0.7 + (i % 2) * 0.4, 0.89, -11.6 + i * 0.6, 10);
    barrel(g, -W / 2 + 0.7, 0.45, 1.0, true); barrel(g, -W / 2 + 0.7, 0.45, -14.2, true);
    // the tables down the nave between the columns
    pokerTable(g, 0.8, -3.4, { mine: true, felt: 0x4a1f4f, rail: 0x1a0a04, seats: 8, rx: 1.4, rz: 0.8, lamp: false, ceil: 3.4 });
    pokerTable(g, -0.6, -8.4, { felt: 0x4a1f4f, rail: 0x1a0a04, seats: 8, rx: 1.4, rz: 0.8, ry: 0.2, lamp: false, full: 0.9, ceil: 3.4 });
    pokerTable(g, 0.6, -12.6, { felt: 0x4a1f4f, rail: 0x1a0a04, seats: 8, rx: 1.4, rz: 0.8, ry: -0.2, lamp: false, full: 0.9, ceil: 3.4 });
    light(g, 0xffc080, 1.6, 0, 5.5, -3, 12); light(g, 0xffc080, 1.6, 0, 5.5, -11, 12);
    if (STAGE !== 'final') { stander(g, 3.9, -1.4, -1.0, { look: 'smart', arms: 'down', lod: 1 }); stander(g, -3.8, -14.2, 0.6, { look: 'smart', arms: 'crossed', lod: 1 }); }
    return { exposure: 1.0, cam: [[-3.6, 1.5, 1.4], [0.8, 2.8, -12]] };
  },
  // Malta: the loggia of a Knights' palazzo, honey limestone, a vaulted stone ceiling, an arcade open to a terrace over the
  // Grand Harbour with Valletta floodlit across the water, closed wooden balconies on the walls, oleanders, iron lanterns
  malta(g, o) {
    const W = 12, D = 10, H = 3.4, Zc = 2 - D / 2, B = 2 - D, P2 = Math.PI / 2;
    const lime = PAINT.stucco('#e0c898'), tile = PAINT.tile('#d8c4a0', '#c0aa84', 8);
    shell(g, { w: W, d: D, h: 5.6, floor: tile, wall: lime, ceil: null, back: false, trim: 0xb89860, fillI: 1.0, fillC: 0xffd8a0 });
    const st = M({ map: tex(lime, 1, 1), roughness: 0.9 }), iron = M({ color: 0x1a1a1a, metalness: 0.6, roughness: 0.5 });
    vault(g, 0, H, Zc, W, D, M({ map: tex(lime, 4, 4), roughness: 0.9 }), false, 0.4);
    rugAt(g, 0, -3.6, 5, 5, canvas(256, 256, (x, w, h) => { x.fillStyle = '#c8b088'; x.fillRect(0, 0, w, h); x.fillStyle = '#f0e4c8'; x.beginPath(); x.arc(w / 2, h / 2, 100, 0, 7); x.fill(); x.fillStyle = '#8a1a1a'; for (let k = 0; k < 4; k++) { x.save(); x.translate(w / 2, h / 2); x.rotate(k * P2); x.beginPath(); x.moveTo(0, -6); x.lineTo(-28, -88); x.lineTo(0, -70); x.lineTo(28, -88); x.closePath(); x.fill(); x.restore(); } x.strokeStyle = '#8a1a1a'; x.lineWidth = 4; x.beginPath(); x.arc(w / 2, h / 2, 108, 0, 7); x.stroke(); }));
    // the arcade on the harbour side, the terrace past it with its balustrade, the palms and the harbour and the city
    arcade(g, -W / 2, W / 2, B, 5.6, 3.3, 3, st);
    const view = VIEW.malta(); ground(g, 30, 12, M({ map: tex(tile, 14, 6), roughness: 0.85 }), 0, B - 5, -0.01);
    for (let i = 0; i < 4; i++) railing(g, -11 + i * 5.5, B - 7.5, -5.5 + i * 5.5, B - 7.5, 1.0, 'stone', '#d8c8a0'); for (const s of [-1, 1]) railing(g, s * 11, B - 7.5, s * 11, B - 1, 1.0, 'stone', '#d8c8a0');
    for (const [x, z, h, l] of [[-9.0, B - 10.5, 6.5, 0.6], [8.4, B - 11, 6.0, -0.7], [13, B - 5, 5.6, -0.5]]) palmTree(g, x, z, h, l);
    for (const s of [-1, 1]) { cyl(g, 0.34, 0.28, 0.6, M({ color: 0xb86a4a, roughness: 0.8 }), s * 4.2, 0.3, B - 1.2, 14); plant(g, s * 4.2, B - 1.2, 1.4, false); for (let k = 0; k < 10; k++) sph(g, 0.05, M({ color: pick([0xf06a8a, 0xf8a0b8, 0xffffff]), roughness: 0.6 }), s * 4.2 + (rnd() - 0.5) * 0.8, 1.3 + rnd() * 0.7, B - 1.2 + (rnd() - 0.5) * 0.8, 6); }
    for (const x of [-6, -2, 2, 6]) { cyl(g, 0.02, 0.02, 0.9, iron, x, 3.6, B + 0.3, 4); const lb = cyl(g, 0.16, 0.12, 0.34, M({ color: 0xfff0d0, emissive: 0xffb060, emissiveIntensity: 1.2, transparent: true, opacity: 0.85 }), x, 3.0, B + 0.3, 6); cyl(g, 0.2, 0.04, 0.12, iron, x, 3.22, B + 0.3, 6); light(g, 0xffb060, 1.6, x, 2.9, B + 0.3, 7); }
    for (const x of [-9, 9]) lampPost(g, x, B - 6.8, 2.6, 0xffc070);
    backdrop(g, view, 0, Zc, 30, 14, -4.2, Math.PI * 0.4, Math.PI * 1.6); skyDome(g, 0, Zc, 70, [[0, '#101040'], [0.5, '#4a2a5a'], [0.8, '#c87a5a'], [1, '#ffc890']]);
    // the gallariji: closed wooden balconies high on the side walls, their little windows lit; a lion-head fountain on the left
    for (const s of [-1, 1]) for (const z of [-1.4, -5.2]) { const col = s > 0 ? 0x2a5a3a : 0x7a2a1a; const b = new THREE.Group(); b.position.set(s * (W / 2 - 0.35), 3.4, z); g.add(b); box(b, 0.7, 1.7, 2.2, M({ color: col, roughness: 0.5 }), 0, 0, 0); box(b, 0.8, 0.1, 2.4, M({ color: col, roughness: 0.5 }), 0, 0.9, 0); for (let k = -1; k <= 1; k++) plane(b, 0.5, 0.7, unlit(canvas(32, 48, (x, w, h) => { x.fillStyle = '#ffd890'; x.fillRect(0, 0, w, h); x.fillStyle = 'rgba(0,0,0,.4)'; x.fillRect(w / 2 - 1, 0, 2, h); x.fillRect(0, h / 2 - 1, w, 2); }), 0.5), -s * 0.36, 0.1, k * 0.7, -s * P2); const cb = box(b, 0.5, 0.5, 2.0, st, s * 0.1, -1.1, 0); cb.rotation.z = 0; }
    const lion = new THREE.Group(); lion.position.set(-W / 2 + 0.3, 0, -3.3); g.add(lion); box(lion, 0.3, 0.6, 1.2, st, 0, 0.3, 0); water(lion, 0.2, 1.0, 0.0, 0, 0.55, 0x1a5a6a); sph(lion, 0.14, M({ map: tex(lime), roughness: 0.9 }), 0.05, 1.2, 0, 10); seg(lion, [0.1, 1.1, 0], [0.1, 0.6, 0], 0.008, 0.012, M({ color: 0xcce8ff, transparent: true, opacity: 0.6 }));
    for (const s of [-1, 1]) photo(g, s * (W / 2 - 0.03), 1.9, 0.4, 0.9, 1.1, -s * P2, 'portrait', 0x8a6a30);
    // the tables
    pokerTable(g, 1.6, -2.6, { mine: true, felt: 0x0f3d2e, rail: 0x3a2414, seats: 8, rx: 1.4, rz: 0.8, lamp: false, ceil: 3.0 });
    pokerTable(g, -3.0, -5.8, { felt: 0x0f3d2e, rail: 0x3a2414, seats: 8, rx: 1.4, rz: 0.8, ry: 0.5, lamp: false, full: 0.9, ceil: 3.0 });
    for (const [x, z] of [[1.6, -2.6], [-3.0, -5.8]]) { cyl(g, 0.01, 0.01, 1.0, iron, x, 3.2, z, 4); const lb = cyl(g, 0.26, 0.18, 0.44, M({ color: 0xfff0d0, emissive: 0xffb060, emissiveIntensity: 1.2, transparent: true, opacity: 0.85 }), x, 2.5, z, 8); cyl(g, 0.32, 0.05, 0.16, iron, x, 2.78, z, 8); for (let k = 0; k < 8; k++) cyl(g, 0.01, 0.01, 0.46, iron, x + Math.cos(k * 0.785) * 0.22, 2.5, z + Math.sin(k * 0.785) * 0.22, 4); light(g, 0xffb060, 2.4, x, 2.4, z, 7); }
    if (STAGE !== 'final') { stander(g, 4.4, -7.2, -0.6, { look: 'smart', arms: 'down', lod: 1 }); stander(g, -2.2, B - 2.8, 2.8, { arms: 'crossed', lod: 1 }); stander(g, 3.0, B - 4.0, 3.4, { arms: 'pockets', lod: 1 }); }
    return { exposure: 1.05, cam: [[-4.6, 1.5, 1.3], [1.4, 1.9, -8.5]] };
  },
  // the Gulf Coast: a white veranda room on the beach, French doors thrown open to a columned porch, ceiling fans,
  // shrimp boats and the lighthouse out on the water, the slots glowing through an arch to the casino floor
  gulf(g, o) {
    const W = 18, D = 12, H = 4.4, Zc = 2 - D / 2, B = 2 - D, P2 = Math.PI / 2;
    const white = PAINT.beadboard('#f4f0e6');
    shell(g, { w: W, d: D, h: H, floor: PAINT.carpet('#0e4556', '#1a6a7a', '#e8d8a8', 'wave'), wall: PAINT.panel('#e8e0cc', '#f2ecdc'), ceil: white, back: false, trim: 0xf4f0e6, cornice: 0xf4f0e6, fillI: 1.2 });
    const wm = M({ color: 0xf4f0e6, roughness: 0.5 }), view = VIEW.biloxi();
    // the back: a row of French doors, open, onto the porch; the porch's columns, rail and rockers; the beach and the Gulf
    for (let i = -3; i <= 3; i++) { const x = i * 2.6; box(g, 0.3, H, 0.3, wm, x, H / 2, B); }
    box(g, W, H - 3.4, 0.3, wm, 0, H - (H - 3.4) / 2, B);
    for (let i = -3; i < 3; i++) { const x = i * 2.6 + 1.3; for (const s of [-1, 1]) { const d = box(g, 0.9, 3.2, 0.06, wm, x + s * 1.0, 1.6, B - 0.5, s * 0.9); for (let k = 0; k < 4; k++) plane(d, 0.6, 0.6, M({ color: 0x9ab0c8, metalness: 1, roughness: 0.3, transparent: true, opacity: 0.1 }), 0, -1.1 + k * 0.72, 0.035); } }
    ground(g, 30, 4.4, M({ map: tex(PAINT.planks('#d8cdb8', '#c0b49c'), 10, 1.5), roughness: 0.7 }), 0, B - 2.2, 0.0); box(g, 30, 0.3, 4.4, M({ color: 0xd8cdb8, roughness: 0.7 }), 0, -0.17, B - 2.2);
    for (let i = -4; i <= 4; i++) { cyl(g, 0.16, 0.18, H, wm, i * 3.4, H / 2, B - 4.2, 14); box(g, 0.5, 0.2, 0.5, wm, i * 3.4, H - 0.1, B - 4.2); }
    box(g, 30, 0.3, 0.6, wm, 0, H - 0.15, B - 4.2); plane(g, 30, 4.4, M({ map: tex(white, 14, 2), roughness: 0.8 }), 0, H - 0.02, B - 2.2, 0, P2);
    for (let i = 0; i < 8; i++) if (i !== 4) railing(g, -14 + i * 3.4, B - 4.4, -14 + (i + 1) * 3.4, B - 4.4, 0.95, 'wood', 0xf4f0e6);
    for (const [x, ry] of [[-5.6, 0.4], [-4.4, 0.2], [5.0, -0.3], [6.4, -0.5]]) adirondack(g, x, B - 2.6, Math.PI + ry, 0xf4f0e6);
    for (const x of [-11, -4, 4, 11]) { cyl(g, 0.005, 0.005, 0.5, M({ color: 0x3a3a3a }), x, H - 0.3, B - 2.2, 4); const l = sph(g, 0.14, glow(0xffe0a0, 2.2), x, H - 0.6, B - 2.2, 12); light(g, 0xffe0a0, 1.2, x, H - 0.8, B - 2.2, 7); }
    ground(g, 60, 36, M({ map: tex(canvas(256, 256, (x, w, h) => { x.fillStyle = '#e4d6b8'; x.fillRect(0, 0, w, h); noise(x, w, h, 0.16, 12000); }), 20, 12), roughness: 0.95 }), 0, B - 20, -0.05); water(g, 80, 30, 0, B - 36, -0.04, 0x0e3a4a);
    for (const [x, z, h, l] of [[-10, B - 7, 5.5, 0.8], [11, B - 8, 6, -0.7], [-15, B - 12, 5, 0.6]]) palmTree(g, x, z, h, l);
    backdrop(g, view, 0, Zc, 40, 15, -4.5, Math.PI * 0.3, Math.PI * 1.7); skyDome(g, 0, Zc, 70, [[0, '#06081c'], [0.5, '#141a44'], [0.85, '#3a2a4a'], [1, '#5a3a4a']]);
    // fans turning overhead, a hurricane-lamp bar on the left, the arch on the right into the casino with the slots beyond it
    for (const [x, z] of [[-5, -2.5], [1, -2.5], [6.5, -2.5], [-5, -7], [1, -7], [6.5, -7]]) ceilingFan(g, x, H - 0.45, z);
    bar(g, -W / 2 + 1.6, -5.0, 6.5, { ry: P2, wood: '#f0ebe0', wood2: '#d8d0c0', top: 0x3a2414, crowd: 0.5 }); for (let i = 0; i < 4; i++) { const x = -W / 2 + 1.6, z = -7.4 + i * 1.6; cyl(g, 0.08, 0.1, 0.06, M({ color: 0xb08a40, metalness: 0.8 }), x, 1.14, z, 10); cyl(g, 0.07, 0.05, 0.22, M({ color: 0xfff0d0, emissive: 0xffb050, emissiveIntensity: 1.6, transparent: true, opacity: 0.8 }), x, 1.28, z, 8); light(g, 0xffb050, 0.6, x, 1.3, z, 3); }
    const arch = new THREE.Group(); arch.position.set(W / 2 - 0.02, 0, -5.0); arch.rotation.y = -P2; g.add(arch); const ar = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.2, 8, 24, Math.PI), wm); ar.position.y = 2.4; arch.add(ar); for (const s of [-1, 1]) box(arch, 0.4, 2.4, 0.4, wm, s * 1.55, 1.2, 0);
    plane(arch, 2.8, 3.8, unlit(canvas(128, 160, (x, w, h) => { const gg = x.createLinearGradient(0, 0, 0, h); gg.addColorStop(0, '#1a0a2a'); gg.addColorStop(1, '#4a1a5a'); x.fillStyle = gg; x.fillRect(0, 0, w, h); for (let i = 0; i < 40; i++) { x.fillStyle = pick(['#ff3a6a', '#3ad8ff', '#ffd84d', '#a24aff']); x.fillRect(rnd() * w, h * 0.3 + rnd() * h * 0.5, 4 + rnd() * 10, 3 + rnd() * 8); } }), 0.8), 0, 1.9, -0.4);
    slots(g, W / 2 - 0.1, -5.0, 3, -P2, { colors: [0xff3a6a, 0x3ad8ff, 0xffd84d] }); light(g, 0xff6ab0, 1.4, W / 2 - 0.6, 1.6, -5.0, 5);
    for (const s of [-1, 1]) for (let i = 0; i < 2; i++) photo(g, s * (W / 2 - 0.03), 2.2, -1.5 - i * 7.0, 1.0, 0.8, -s * P2, 'land', 0xf4f0e6);
    sign(g, 'GULF COAST POKER', '#0e4556', '#f4ecd0', 0, 1.96, 3.0, 3.6, 0.5, Math.PI);
    // the tables
    pokerTable(g, 1.8, -2.4, { mine: true, felt: 0x155e75, rail: 0x1a0a0a, seats: 9, rx: 1.4, rz: 0.8, lamp: false, ceil: 3.4 });
    pokerTable(g, -3.4, -5.6, { felt: 0x155e75, rail: 0x1a0a0a, seats: 9, rx: 1.4, rz: 0.8, ry: 0.4, lamp: false, full: 0.85, ceil: 3.4 });
    pokerTable(g, 5.0, -7.0, { felt: 0x155e75, rail: 0x1a0a0a, seats: 9, rx: 1.4, rz: 0.8, ry: -0.4, lamp: false, full: 0.85, ceil: 3.4 });
    for (const [x, z] of [[1.8, -2.4], [-3.4, -5.6], [5.0, -7.0]]) { for (const s of [-1, 1]) { cyl(g, 0.006, 0.006, 0.9, M({ color: 0x3a3a3a }), x + s * 0.7, H - 0.45, z, 4); const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.3, 0.26, 24, 1, true), M({ color: 0xf4f0e6, side: THREE.DoubleSide, roughness: 0.5 })); sh.position.set(x + s * 0.7, H - 0.95, z); g.add(sh); sph(g, 0.06, glow(0xffe8c0, 3), x + s * 0.7, H - 1.02, z, 8); } light(g, 0xffe8c0, 2.2, x, H - 1.2, z, 7); }
    if (STAGE !== 'final') { stander(g, -0.4, B - 2.8, Math.PI, { arms: 'crossed', lod: 1 }); stander(g, 2.4, B - 3.2, 2.6, { lod: 1 }); stander(g, 7.2, -1.0, -1.8, { look: 'smart', arms: 'down', lod: 1 }); }
    return { exposure: 1.1, cam: [[-6.4, 1.5, 1.3], [1.6, 1.5, -8.0]] };
  },
  // the Silver Spur, downtown Reno: a low 1970s room under a mirrored ceiling, red flock on the walls, a slot carousel,
  // the keno board, red leather booths, and the Arch's neon through the windows on Virginia Street
  reno(g, o) {
    const W = 16, D = 12, H = 3.1, Zc = 2 - D / 2, B = 2 - D, P2 = Math.PI / 2;
    shell(g, { w: W, d: D, h: H, floor: PAINT.carpet('#3a2412', '#6a3a1a', '#d8a040', 'navajo'), wall: PAINT.damask('#6a1414', '#7a1c1c'), ceil: null, trim: 0x2a1408, fillI: 1.0, fillC: 0xffd0a0 });
    const mirror = plane(g, W - 0.6, D - 0.6, M({ color: 0xb8b8c0, metalness: 1, roughness: 0.03, envMapIntensity: 1.5 }), 0, H - 0.01, Zc, 0, P2); mirror.userData.flat = 1;
    const brass = M({ color: 0xc8a050, metalness: 0.9, roughness: 0.3 }), wood = M({ map: tex(PAINT.wood('#4a2a14', '#3a2010', 20), 2, 1), roughness: 0.5 });
    for (let i = 0; i <= 4; i++) { box(g, W, 0.32, 0.3, M({ map: tex(PAINT.wood('#4a3020', '#3a2416', 8), 4, 1), roughness: 0.8 }), 0, H - 0.14, 2 - i * 3); }
    for (const s of [-1, 1]) box(g, 0.3, 0.32, D, M({ map: tex(PAINT.wood('#4a3020', '#3a2416', 8), 4, 1), roughness: 0.8 }), s * (W / 2 - 0.15), H - 0.14, Zc);
    // the windows on Virginia Street down the left, brass rails and tiebacks, the Arch out there
    const view = VIEW.reno(); for (let i = 0; i < 3; i++) { const z = -1.4 - i * 3.6; windowOn(g, view, -W / 2 + 0.02, 1.7, z, 2.6, 1.9, P2, 0x2a1408); curtain(g, -W / 2 + 0.1, 1.6, z - 1.5, 0.5, 2.4, 0x8a1010, P2); curtain(g, -W / 2 + 0.1, 1.6, z + 1.5, 0.5, 2.4, 0x8a1010, P2); light(g, 0xff6a3a, 0.5, -W / 2 + 0.8, 1.6, z, 4); }
    // the booths down the right, the keno board over them, wagon-wheel lamps, a brass-railed step up to the room
    for (let i = 0; i < 3; i++) booth(g, W / 2 - 1.0, -1.6 - i * 3.4, -P2, 0x8a1a1a, '#3a2010');
    tvSet(g, W / 2 - 0.05, 2.2, -5.0, 1.6, -P2, 'board'); sign(g, 'KENO', '#1a0e06', '#ffd84d', W / 2 - 0.05, 2.85, -5.0, 1.2, 0.3, -P2);
    for (const [x, z] of [[1.6, -2.4], [-3.2, -5.8], [3.6, -7.6], [-1.0, -9.6]]) { const w = new THREE.Group(); w.position.set(x, 2.3, z); g.add(w); const wm = M({ color: 0x4a2e16, roughness: 0.7 }); const rim = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.04, 8, 40), wm); rim.rotation.x = P2; w.add(rim); for (let i = 0; i < 6; i++) { const sp = box(w, 1.36, 0.035, 0.035, wm, 0, 0, 0); sp.rotation.y = i / 6 * Math.PI; } for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; cyl(w, 0.02, 0.02, 0.16, M({ color: 0xf4ecd8 }), Math.cos(a) * 0.62, 0.1, Math.sin(a) * 0.62, 6); sph(w, 0.045, glow(0xffd8a0, 3), Math.cos(a) * 0.62, 0.22, Math.sin(a) * 0.62, 8); } for (let i = 0; i < 3; i++) seg(w, [Math.cos(i * 2.1) * 0.5, 0, Math.sin(i * 2.1) * 0.5], [0, 0.7, 0], 0.006, 0.006, M({ color: 0x1a1a1a })); light(w, 0xffd0a0, 2.4, 0, -0.1, 0, 7); }
    // the slot carousel at the back under its crown, the cage beside it, the cocktail waitress and a cowboy at the bar
    const car = new THREE.Group(); car.position.set(-3.2, 0, B + 2.2); g.add(car); cyl(car, 1.9, 1.9, 0.2, M({ color: 0x8a1a1a, roughness: 0.5 }), 0, 0.1, 0, 32); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; const sg = new THREE.Group(); sg.position.set(Math.sin(a) * 1.2, 0.2, Math.cos(a) * 1.2); sg.rotation.y = a; car.add(sg); slots(sg, 0, 0, 1, 0, { colors: [0xffd84d, 0xff3a3a, 0x3ad8ff] }); }
    cyl(car, 0.3, 0.3, 2.9, brass, 0, 1.45, 0, 12); const crown = cyl(car, 1.2, 1.0, 0.5, M({ color: 0x8a1a1a, roughness: 0.4 }), 0, 3.0, 0, 24); for (let i = 0; i < 24; i++) { const a = i / 24 * 6.283; sph(car, 0.04, glow(pick([0xffd84d, 0xffffff]), 3), Math.sin(a) * 1.2, 3.0, Math.cos(a) * 1.2, 6); } light(car, 0xffd84d, 1.6, 0, 2.6, 0, 6);
    cage(g, 3.6, B + 0.6, 0, 3.0, 'CASHIER'); slots(g, W / 2 - 2.6, B + 1.2, 4, 0, { colors: [0xffd84d, 0xff3a3a, 0x3ad8ff] });
    for (const s of [-1, 1]) for (const z of [-2.0, -7.0]) sconce(g, s * (W / 2 - 0.05), 2.1, z, -s * P2, 0xffc080);
    neon(g, 'Silver Spur', '#ffd84d', 0, 2.5, B + 0.06, 90); const hat = canvas(256, 128, (x, w, h) => { x.fillStyle = '#d8e8ff'; x.shadowColor = '#d8e8ff'; x.shadowBlur = 16; x.beginPath(); x.ellipse(w / 2, h * 0.75, 110, 20, 0, 0, 7); x.fill(); x.beginPath(); x.moveTo(w / 2 - 50, h * 0.72); x.quadraticCurveTo(w / 2 - 60, h * 0.15, w / 2, h * 0.12); x.quadraticCurveTo(w / 2 + 60, h * 0.15, w / 2 + 50, h * 0.72); x.fill(); }); plane(g, 1.6, 0.8, new THREE.MeshBasicMaterial({ map: tex(hat), transparent: true }), 0, 1.7, B + 0.07).name = 'NEON';
    // the tables
    pokerTable(g, 1.6, -2.4, { mine: true, felt: 0x6b4a1f, rail: 0x1a0a0a, seats: 9, rx: 1.4, rz: 0.8, lamp: false, ceil: 2.2 });
    pokerTable(g, -3.2, -5.8, { felt: 0x6b4a1f, rail: 0x1a0a0a, seats: 9, rx: 1.4, rz: 0.8, ry: 0.5, lamp: false, full: 0.85, ceil: 2.2 });
    pokerTable(g, 3.6, -7.6, { felt: 0x6b4a1f, rail: 0x1a0a0a, seats: 9, rx: 1.4, rz: 0.8, ry: -0.3, lamp: false, full: 0.85, ceil: 2.2 });
    if (STAGE !== 'final') { stander(g, -0.6, -8.0, 0.4, { look: 'smart', arms: 'down', lod: 1 }); stander(g, 5.8, -3.6, -2.2, { arms: 'crossed', lod: 1 }); stander(g, -5.6, -0.6, 1.6, { arms: 'pockets', lod: 1 }); }
    return { exposure: 1.05, cam: [[5.8, 1.45, 1.4], [-2.4, 1.3, -7.0]] };
  },
  // Atlantic City: a Victorian pavilion off the Boardwalk, white iron trusses and a skylight ridge, the long window at
  // boardwalk level with the strollers going by, the beach and Steel Pier's wheel, purple and gold inside
  boardwalk(g, o) {
    const W = 20, D = 14, H = 6.0, Zc = 2 - D / 2, B = 2 - D, P2 = Math.PI / 2;
    shell(g, { w: W, d: D, h: H, floor: PAINT.carpet('#2a1d5a', '#4a2a8a', '#e8b030', 'deco'), wall: PAINT.damask('#3a1a3a', '#4a2448'), ceil: PAINT.plain('#1a1222'), back: false, trim: 0x1a0e1a, cornice: 0xf0ebe0, fillI: 1.1 });
    const white = M({ color: 0xf0ebe0, roughness: 0.5 }), gold = M({ color: 0xc8a050, metalness: 0.9, roughness: 0.3 }), view = VIEW.atlantic();
    // the iron trusses and the skylight ridge: night sky through it
    for (let i = 0; i <= 4; i++) { const z = 2 - i * 3.5; box(g, W, 0.2, 0.2, white, 0, H - 1.6, z); for (let k = -4; k <= 4; k++) { const d = box(g, 0.08, 1.4, 0.08, white, k * 2.2, H - 0.9, z); d.rotation.z = k % 2 ? 0.6 : -0.6; } box(g, W, 0.12, 0.12, white, 0, H - 0.2, z); }
    for (const s of [-1, 1]) box(g, 0.14, 0.14, D, white, s * 4.0, H - 0.3, Zc);
    plane(g, 7.6, D - 0.4, unlit(canvas(256, 512, (x, w, h) => { x.fillStyle = '#060a1e'; x.fillRect(0, 0, w, h); for (let i = 0; i < 150; i++) { x.fillStyle = 'rgba(255,255,255,' + rnd() * 0.6 + ')'; x.fillRect(rnd() * w, rnd() * h, 1.5, 1.5); } x.fillStyle = 'rgba(200,210,230,.25)'; for (let i = 0; i < w; i += 64) x.fillRect(i, 0, 3, h); for (let j = 0; j < h; j += 64) x.fillRect(0, j, w, 3); }), 0.8), 0, H - 0.02, Zc, 0, P2);
    // the window on the Boardwalk, the whole width, the boards running past it and the rail; a rolling chair parked outside
    windowOn(g, view, 0, 2.2, B + 0.02, W - 1.0, 3.6, 0, 0xf0ebe0); for (let i = -4; i <= 4; i++) box(g, 0.1, 3.6, 0.12, white, i * 2.3, 2.2, B + 0.08); box(g, W, H - 4.0, 0.3, M({ map: tex(PAINT.damask('#3a1a3a', '#4a2448'), 8, 1), roughness: 0.8 }), 0, H - (H - 4.0) / 2, B);
    const rc = new THREE.Group(); rc.position.set(5.6, 0, B - 1.2); rc.rotation.y = 0.4; g.add(rc); const wick = M({ map: tex(PAINT.wallpaper('#c8a060', '#8a6a30', 'diamond'), 4, 4), roughness: 0.8 }); rbox(rc, 1.0, 0.9, 1.1, 0.1, wick, 0, 0.75, 0); rbox(rc, 1.0, 0.5, 0.2, 0.08, wick, 0, 1.4, -0.45); for (const s of [-1, 1]) cyl(rc, 0.3, 0.3, 0.06, M({ color: 0x1a1a1a }), s * 0.55, 0.3, 0.2, 16).rotation.z = P2;
    ground(g, 30, 3, M({ map: tex(PAINT.planks('#5a4a30', '#4a3a24'), 20, 1), roughness: 0.8 }), 0, B - 1.5, -0.01);
    // chandeliers, the taffy and the street sign, a brass rail at the front, a sea-horse carousel horse on a pole
    for (const [x, z] of [[-5, -4], [5, -4], [0, -8.5]]) chandelier(g, x, H - 1.9, z, 1.2, 0xffe8c8);
    sign(g, 'SALT WATER TAFFY', '#f4ecd0', '#8a1a3a', -W / 2 + 0.05, 2.6, -3.0, 2.8, 0.5, P2); sign(g, 'BOARDWALK', '#1a3a8a', '#ffffff', W / 2 - 0.05, 2.8, -4.0, 2.2, 0.45, -P2); box(g, 0.06, 2.8, 0.06, M({ color: 0x2a2a2a }), W / 2 - 0.4, 1.4, -4.0);
    for (const s of [-1, 1]) photo(g, s * (W / 2 - 0.04), 2.2, -8.0, 1.4, 0.9, -s * P2, 'land', 0xc8a050);
    const horse = new THREE.Group(); horse.position.set(-W / 2 + 1.4, 0, -9.0); g.add(horse); cyl(horse, 0.03, 0.03, 2.6, gold, 0, 1.3, 0, 8); rbox(horse, 0.5, 0.5, 1.2, 0.15, M({ color: 0xf0e8d8, roughness: 0.4 }), 0, 1.3, 0); rbox(horse, 0.3, 0.6, 0.5, 0.1, M({ color: 0xf0e8d8, roughness: 0.4 }), 0, 1.75, 0.55); rbox(horse, 0.5, 0.2, 0.6, 0.05, M({ color: 0x8a1a3a, roughness: 0.5 }), 0, 1.58, 0); for (const s of [-1, 1]) for (const t of [-1, 1]) cyl(horse, 0.06, 0.05, 0.6, M({ color: 0xf0e8d8 }), s * 0.16, 0.8, t * 0.4, 8);
    slots(g, -W / 2 + 0.6, -5.2, 5, P2, { colors: [0xff3a6a, 0x3ad8ff, 0xffd84d] }); cage(g, W / 2 - 0.6, -9.6, -P2, 2.8, 'CASHIER');
    // the tables, five of them, with their lights
    const tl = (x, z) => { const fm = M({ color: 0x1a1410, metalness: 0.6, roughness: 0.3 }); rbox(g, 2.0, 0.14, 0.7, 0.03, fm, x, 3.3, z); plane(g, 1.9, 0.6, glow(0xfff0d0, 1.4), x, 3.23, z, 0, P2); for (const k of [-1, 1]) cyl(g, 0.006, 0.006, H - 3.4 - 1.6, M({ color: 0x1a1a1a }), x + k * 0.8, (H - 1.6 + 3.37) / 2, z, 4); light(g, 0xfff0d0, 2.4, x, 3.0, z, 7); };
    pokerTable(g, 2.2, -2.2, { mine: true, felt: 0x3b2a7a, rail: 0x1a0a0a, seats: 9, rx: 1.4, rz: 0.8, lamp: false, ceil: 3.2 }); tl(2.2, -2.2);
    for (const [x, z, ry] of [[-5.2, -4.3, 0.2], [-1.4, -6.8, 0], [4.6, -6.4, -0.2], [7.2, -2.6, -0.6]]) { pokerTable(g, x, z, { felt: 0x3b2a7a, rail: 0x1a0a0a, seats: 9, rx: 1.4, rz: 0.8, ry, lamp: false, full: 0.85, ceil: 3.2 }); tl(x, z); }
    if (STAGE !== 'final') { stander(g, -3.0, -9.6, 0.4, { look: 'smart', arms: 'down', lod: 1 }); stander(g, 0.4, B - 1.3, -1.4, { lod: 1 }); stander(g, -4.0, B - 1.6, 1.6, { arms: 'pockets', lod: 1 }); stander(g, 8.2, -9.6, -0.8, { look: 'smart', lod: 1 }); }
    return { exposure: 1.1, cam: [[6.8, 1.6, 1.4], [-1.8, 1.5, -8.5]] };
  },
  // Chicago: a brick warehouse on the river made a card room, timber columns and steel, Edison bulbs on wires, the tall
  // steel-sash windows on the skyline and the river, and the L going by on its trestle right outside
  chicago(g, o) {
    const W = 16, D = 14, H = 5.0, Zc = 2 - D / 2, B = 2 - D, P2 = Math.PI / 2;
    const brick = PAINT.brick('#7a4a3a', '#4a3a34');
    shell(g, { w: W, d: D, h: H, floor: PAINT.planks('#6a4a2a', '#4a3418'), wall: brick, ceil: PAINT.wood('#4a3424', '#3a2818', 50), back: false, trim: 0x2a1a10, fillI: 0.8, fillC: 0xffd0a0 });
    const timber = M({ map: tex(PAINT.wood('#5a3a1a', '#3a2410', 10), 1, 4), roughness: 0.8 }), steel = M({ color: 0x2a2a30, metalness: 0.7, roughness: 0.5 }), view = VIEW.chicago();
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) { const z = -1 - i * 4.5; box(g, 0.4, H, 0.4, timber, s * 4.0, H / 2, z); box(g, 0.6, 0.3, 1.6, timber, s * 4.0, H - 0.15, z); }
    for (let i = 0; i < 3; i++) box(g, W, 0.4, 0.3, timber, 0, H - 0.2, -1 - i * 4.5); for (let i = 0; i < 6; i++) box(g, 0.2, 0.25, D, timber, -6 + i * 2.4, H - 0.12, Zc);
    // the steel-sash windows: three tall ones on the river, gridded; the river, the skyline, and the L outside
    box(g, W, H - 4.2, 0.3, M({ map: tex(brick, 6, 1), roughness: 0.9 }), 0, H - (H - 4.2) / 2, B); for (let i = -2; i <= 2; i++) box(g, i % 2 ? 1.2 : 0.6, 4.2, 0.3, M({ map: tex(brick, 0.5, 2), roughness: 0.9 }), i * 3.6, 2.1, B);
    for (const x of [-5.4, -1.8, 1.8, 5.4]) { glassWall(g, x, 2.2, B + 0.02, 2.4, 3.6, 0); for (let k = 0; k < 7; k++) box(g, 2.4, 0.03, 0.06, steel, x, 0.5 + k * 0.6, B + 0.1); for (let k = -2; k <= 2; k++) box(g, 0.03, 3.6, 0.06, steel, x + k * 0.6, 2.2, B + 0.1); box(g, 2.6, 0.08, 0.12, steel, x, 0.36, B + 0.1); box(g, 2.6, 0.08, 0.12, steel, x, 4.04, B + 0.1); }
    elTrain(g, 0, 1.6, B - 3.4, 22, 0); backdrop(g, view, 0, Zc, 30, 16, -5, Math.PI * 0.4, Math.PI * 1.6); skyDome(g, 0, Zc, 60, [[0, '#06081c'], [0.6, '#1a1c44'], [1, '#3a2a4a']]);
    // Edison bulbs strung between the columns, a whisky bar with a brick back, leather club chairs, a few old signs
    for (let i = 0; i < 4; i++) stringLights(g, -W / 2 + 0.5, W / 2 - 0.5, 3.6, 0.2 - i * 3.6, 0.45, 0xffb860);
    bar(g, -W / 2 + 1.6, -6.0, 7, { ry: P2, wood: '#2a1a0c', wood2: '#1a0e06', top: 0x1a1410, mirror: false, crowd: 0.5 }); shelves(g, -W / 2 + 0.25, -6.0, 6.0, 2.6, P2, 'bottles');
    for (const [x, z, ry] of [[6.4, -0.4, Math.PI + 0.4], [6.9, -2.2, -P2]]) sofa(g, x, z, ry, 0x4a2a14, 1.0); cyl(g, 0.4, 0.4, 0.04, M({ color: 0x2a2a30, metalness: 0.7, roughness: 0.3 }), 6.2, 0.44, -1.4, 20); cyl(g, 0.04, 0.06, 0.42, steel, 6.2, 0.22, -1.4, 8);
    sign(g, 'RIVER NORTH CARD ROOM', '#1a1a1e', '#e8c868', 0, 1.9, 1.96, 4.2, 0.5, Math.PI); for (const s of [-1, 1]) photo(g, s * (W / 2 - 0.03), 2.6, -2.5, 1.2, 0.9, -s * P2, 'land', 0x1a1a1e);
    for (const z of [-3.6, -8.6]) sconce(g, W / 2 - 0.05, 2.4, z, -P2, 0xffe0b0);
    slots(g, W / 2 - 0.6, -7.6, 4, -P2, { colors: [0xffd84d, 0x3ad8ff, 0xff3a6a] }); cage(g, W / 2 - 0.6, -11.0, -P2, 2.4, 'CAGE');
    // the tables under black pendants
    const pend = (x, z) => { for (let k = -1; k <= 1; k++) { pendant(g, x + k * 0.9, 2.5, z, 0xffd9a0, 0x1a1a1a); } };
    pokerTable(g, 0.2, -2.6, { mine: true, felt: 0x1d4f5c, rail: 0x1a0a0a, seats: 9, rx: 1.4, rz: 0.8, lamp: false, ceil: 3.0 }); pend(0.2, -2.6);
    for (const [x, z, ry] of [[-4.6, -6.0, 0.3], [4.6, -6.4, -0.3], [0, -9.4, 0.1]]) { pokerTable(g, x, z, { felt: 0x1d4f5c, rail: 0x1a0a0a, seats: 9, rx: 1.4, rz: 0.8, ry, lamp: false, full: 0.85, ceil: 3.0 }); pend(x, z); }
    if (STAGE !== 'final') { stander(g, -2.2, -11.0, 0.3, { look: 'smart', arms: 'down', lod: 1 }); stander(g, 3.0, 0.6, -2.4, { arms: 'crossed', lod: 1 }); }
    return { exposure: 1.05, cam: [[-2.0, 1.6, 1.3], [0.8, 1.8, -9.0]] };
  },
  // Lake Tahoe: a mid-century lakeside casino lodge, glulam beams to a high ridge, a round hearth under a copper hood,
  // two storeys of glass on the lake, the moon on the water and the snow on the peaks, fire pits out on the deck
  tahoe(g, o) {
    const W = 18, D = 13, H = 6.4, Zc = 2 - D / 2, B = 2 - D, P2 = Math.PI / 2;
    shell(g, { w: W, d: D, h: H, floor: PAINT.carpet('#14303a', '#24485e', '#d8c8a0', 'diamond'), wall: PAINT.wood('#6a4628', '#5a3a20', 40), ceil: PAINT.wood('#8a6a44', '#7a5a38', 60), back: false, trim: 0x3a2410, fillI: 1.0, fillC: 0xffd8b0 });
    const glulam = M({ map: tex(PAINT.wood('#a07a4a', '#8a6838', 6), 1, 6), roughness: 0.6 }), stone = M({ map: tex(PAINT.brick('#7a7068', '#3a3430'), 2, 2), roughness: 0.9 }), steel = M({ color: 0x2a2a30, metalness: 0.7, roughness: 0.4 });
    for (let i = 0; i <= 4; i++) { const z = 2 - i * 3.25; for (const s of [-1, 1]) { const bm = box(g, 9.6, 0.6, 0.3, glulam, s * 4.5, H - 1.2, z); bm.rotation.z = s * 0.42; } }
    box(g, 0.4, 0.6, D, glulam, 0, H + 0.6, Zc); for (const s of [-1, 1]) box(g, 0.3, 0.5, D, glulam, s * 8.6, H - 2.6, Zc);
    // the glass on the lake, two storeys, slim steel; the deck with its fire pits; the lake and the peaks
    const view = VIEW.mountains({ lake: true, pines: true, snow: false, sky0: '#060c22', sky1: '#2a3a6a' });
    plane(g, W - 0.4, H - 0.2, M({ color: 0x9ab0c8, metalness: 1, roughness: 0.25, transparent: true, opacity: 0.07 }), 0, H / 2, B + 0.02); for (let i = -4; i <= 4; i++) box(g, 0.1, H, 0.12, steel, i * 2.2, H / 2, B + 0.06); box(g, W, 0.2, 0.2, steel, 0, 3.3, B + 0.06); box(g, W, 0.12, 0.2, steel, 0, 0.06, B + 0.06);
    ground(g, 26, 8, M({ map: tex(PAINT.planks('#8a6a44', '#6a4e30'), 16, 2), roughness: 0.7 }), 0, B - 4, -0.01); railing(g, -13, B - 8, 13, B - 8, 1.0, 'wood', 0x3a2a1a);
    for (const x of [-6, 0, 6]) { cyl(g, 0.6, 0.7, 0.4, stone, x, 0.2, B - 5.5, 16); sph(g, 0.22, glow(0xff8a20, 4), x, 0.55, B - 5.5, 8).scale.y = 1.5; light(g, 0xff9a30, 2.4, x, 0.8, B - 5.5, 7); for (let k = 0; k < 4; k++) adirondack(g, x + Math.cos(k * 1.57 + 0.8) * 1.6, B - 5.5 + Math.sin(k * 1.57 + 0.8) * 1.6, Math.atan2(-Math.cos(k * 1.57 + 0.8), -Math.sin(k * 1.57 + 0.8)), 0x3a2a1a); }
    ground(g, 60, 40, M({ map: tex(canvas(128, 128, (x, w, h) => { x.fillStyle = '#e8ecf4'; x.fillRect(0, 0, w, h); noise(x, w, h, 0.08, 3000); }), 10, 8), roughness: 0.95 }), 0, B - 24, -0.05); water(g, 80, 30, 0, B - 30, -0.04, 0x0e2a44);
    for (let i = 0; i < 14; i++) { const px = -24 + i * 3.6 + (i % 3), pz = B - 9 - (i % 4) * 2.2; const p = new THREE.Group(); p.position.set(px, 0, pz); g.add(p); cyl(p, 0.08, 0.12, 1.2, M({ color: 0x3a2a1a }), 0, 0.6, 0, 8); for (let k = 0; k < 5; k++) cyl(p, 0.05, 1.3 - k * 0.22, 1.4, M({ color: k % 2 ? 0x0e2a18 : 0x123420, roughness: 0.9 }), 0, 1.6 + k * 1.0, 0, 8); }
    box(g, 1.2, 0.3, 10, M({ map: tex(PAINT.planks('#5a4a30', '#4a3a24'), 2, 10), roughness: 0.8 }), 4, 0.0, B - 14); for (let i = 0; i < 5; i++) { cyl(g, 0.03, 0.03, 0.9, steel, 4.5, 0.6, B - 10 - i * 2, 6); sph(g, 0.06, glow(0xffe0a0, 3), 4.5, 1.05, B - 10 - i * 2, 8); }
    { const land = landscape(g, { x: 0, z: B - 78, w: 190, d: 90, kind: 'alpine', snow: 12, treeline: 10, near: 0.32, scale: 1.4 }); forest(g, land, 700, { size: 1.2 }); moon(g, 0xb8c8ff, 0.7, [50, 60, B - 20], [0, 0, B - 60]); } starDome(g, 0, Zc, 170, [[0, '#04061a'], [0.6, '#101a3a'], [1, '#2a3a6a']]);
    // the hearth in the middle of the room, its copper hood up to the ridge; the round bar; cone pendants
    hearth(g, -4.0, -3.0);
    bar(g, 5.8, -8.4, 4.4, { ry: 0, wood: '#4a3018', wood2: '#3a2410', top: 0x1a1410, crowd: 0.5 }); cyl(g, 0.02, 0.02, 2.4, steel, 5.8, 3.6, -8.4, 6);
    for (const [x, z] of [[1.6, -3.0], [-3.6, -7.2], [3.4, -7.0], [-6.4, -3.4]]) { for (let k = -1; k <= 1; k++) { cyl(g, 0.006, 0.006, 2.2, steel, x + k * 0.8, 3.8, z, 4); const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.22, 0.3, 20, 1, true), M({ color: pick([0xc8502a, 0xd8a040, 0xf0ebe0]), side: THREE.DoubleSide, roughness: 0.5 })); cone.position.set(x + k * 0.8, 2.65, z); g.add(cone); sph(g, 0.05, glow(0xffe0b0, 3), x + k * 0.8, 2.56, z, 8); } light(g, 0xffe0b0, 2.2, x, 2.4, z, 7); }
    sign(g, 'HIGH SIERRA POKER', '#14303a', '#f0e8d0', 0, 2.0, 1.96, 3.8, 0.5, Math.PI); for (const s of [-1, 1]) photo(g, s * (W / 2 - 0.03), 2.4, -6.5, 1.3, 0.9, -s * P2, 'land', 0x3a2a1a);
    for (const z of [-3.0, -9.0]) { const sk = box(g, 0.1, 1.8, 0.02, M({ color: 0xc81a1a, roughness: 0.4 }), -W / 2 + 0.08, 2.0, z); sk.rotation.z = 0.12; const sk2 = box(g, 0.1, 1.8, 0.02, M({ color: 0x1a3a8a, roughness: 0.4 }), -W / 2 + 0.08, 2.0, z + 0.3); sk2.rotation.z = -0.12; }
    slots(g, W / 2 - 0.6, -3.0, 4, -P2, { colors: [0x3ad8ff, 0xffd84d, 0xff6ab0] });
    // the tables
    pokerTable(g, 1.6, -3.0, { mine: true, felt: 0x24485e, rail: 0x1a0a0a, seats: 9, rx: 1.4, rz: 0.8, lamp: false, ceil: 2.6 });
    for (const [x, z, ry] of [[-3.6, -7.2, 0.4], [3.4, -7.0, -0.3], [-6.4, -3.4, 0.9]]) pokerTable(g, x, z, { felt: 0x24485e, rail: 0x1a0a0a, seats: 9, rx: 1.4, rz: 0.8, ry, lamp: false, full: 0.85, ceil: 2.6 });
    if (STAGE !== 'final') { stander(g, -0.8, -9.8, 0.3, { look: 'smart', arms: 'down', lod: 1 }); stander(g, -1.4, B - 4.6, 2.8, { arms: 'pockets', lod: 1 }); stander(g, 7.4, -1.2, -2.0, { arms: 'crossed', lod: 1 }); }
    return { exposure: 1.05, cam: [[6.6, 1.7, 1.4], [-2.4, 2.2, -7.5]] };
  },
  // the Northwoods: knotty pine and fieldstone, a birch canoe hung from the rafters, snowshoes and a moose over the bar,
  // a wood stove ticking, antler lamps, and the northern lights over the pines and the frozen lake out the windows
  pinewood(g, o) {
    const W = 16, D = 13, H = 4.6, Zc = 2 - D / 2, B = 2 - D, P2 = Math.PI / 2;
    const pine = PAINT.wood('#c8a060', '#a8824a', 24);
    shell(g, { w: W, d: D, h: H, floor: PAINT.planks('#8a6a44', '#6e5234'), wall: pine, ceil: PAINT.wood('#a8824a', '#8a6a3a', 40), back: false, trim: 0x5a3a1a, cornice: 0x5a3a1a, fillI: 0.9, fillC: 0xffd0a0 });
    { const wm = M({ map: tex(pine, W / 2.4, H / 2.4), roughness: 0.85 }); for (const [x0, x1] of [[-W / 2, -7.3], [-3.1, -2.1], [2.1, 3.1], [7.3, W / 2]]) plane(g, x1 - x0, H, wm, (x0 + x1) / 2, H / 2, B).userData.flat = 1; for (const x of [-5.2, 0, 5.2]) { plane(g, 4.2, 1.1, wm, x, 0.55, B).userData.flat = 1; plane(g, 4.2, H - 3.5, wm, x, (H + 3.5) / 2, B).userData.flat = 1; } }
    const log = M({ map: tex(PAINT.wood('#8a6a3a', '#6a4a24', 6), 1, 4), roughness: 0.85 }), stone = M({ map: tex(PAINT.brick('#8a8078', '#4a4640'), 2, 2), roughness: 0.9 });
    for (let i = 0; i <= 4; i++) { const z = 2 - i * 3.25; const bm = cyl(g, 0.16, 0.16, W, log, 0, H - 0.2, z, 12); bm.rotation.z = P2; } for (const s of [-1, 1]) cyl(g, 0.14, 0.14, D, log, s * 5.5, H - 0.36, Zc, 12).rotation.x = P2;
    // the windows on the lights: three wide ones on the back, each with a snow sill
    const view = VIEW.aurora(); for (const x of [-5.2, 0, 5.2]) { glassWall(g, x, 2.3, B + 0.02, 4.2, 2.4, 0); const fm = M({ color: 0x5a3a1a, roughness: 0.5 }); box(g, 0.06, 2.4, 0.1, fm, x, 2.3, B + 0.06); box(g, 4.2, 0.06, 0.1, fm, x, 2.3, B + 0.06); box(g, 4.4, 0.1, 0.12, fm, x, 3.55, B + 0.06); box(g, 4.6, 0.08, 0.3, M({ color: 0xf0f4f8, roughness: 0.9 }), x, 1.06, B + 0.2); }
    ground(g, 70, 40, M({ color: 0xe8ecf4, roughness: 0.95 }), 0, B - 12, -0.08); { const land = landscape(g, { x: 0, z: B - 60, w: 170, d: 90, kind: 'hills', near: 0.3, scale: 1.3 }); forest(g, land, 1100, { size: 1.0, low: -1, color: 0x0e2a18 }); moon(g, 0x9affc0, 0.35, [-30, 50, B - 30], [0, 0, B - 50]); } backdrop(g, view, 0, Zc, 150, 60, -12, Math.PI * 0.4, Math.PI * 1.6); starDome(g, 0, Zc, 220, [[0, '#04061a'], [0.6, '#0a1430'], [1, '#0e1a2a']], 400);
    // the canoe overhead, snowshoes crossed, the moose over the bar, a mounted muskie, the fieldstone chimney and its stove
    canoe(g, 0.8, H - 1.6, -5.0, 0.3);
    for (const s of [-1, 1]) { const ss = new THREE.Group(); ss.position.set(-W / 2 + 0.08, 2.6, -3.0 + s * 0.3); ss.rotation.z = s * 0.4; ss.rotation.y = P2; g.add(ss); const fr = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.02, 6, 20), M({ color: 0xc8a060 })); fr.scale.y = 2.6; ss.add(fr); for (let k = 0; k < 6; k++) box(ss, 0.46, 0.01, 0.01, M({ color: 0xe8d8b8 }), 0, -0.45 + k * 0.18, 0); }
    mountedHead(g, W / 2 - 0.05, 2.8, -4.8, -P2, true); photo(g, -W / 2 + 0.03, 2.2, -8.0, 1.6, 0.6, P2, 'land', 0x5a3a1a);
    box(g, 1.6, H, 1.2, stone, -W / 2 + 0.8, H / 2, -9.6); const stove = new THREE.Group(); stove.position.set(-W / 2 + 1.9, 0, -9.6); g.add(stove); rbox(stove, 0.7, 0.7, 0.6, 0.05, M({ color: 0x1a1a1a, roughness: 0.5 }), 0, 0.6, 0); for (let k = 0; k < 4; k++) cyl(stove, 0.03, 0.03, 0.25, M({ color: 0x1a1a1a }), (k % 2 ? 0.25 : -0.25), 0.12, (k < 2 ? 0.2 : -0.2), 6); cyl(stove, 0.08, 0.08, H - 1.0, M({ color: 0x1a1a1a }), 0, 0.95 + (H - 1.0) / 2, 0, 10); plane(stove, 0.3, 0.2, glow(0xff8a20, 2.5), 0, 0.5, 0.31); light(stove, 0xff9a30, 1.6, 0, 0.6, 0.6, 5);
    bar(g, W / 2 - 1.6, -4.8, 5.5, { ry: -P2, wood: '#8a6a3a', wood2: '#6a4a24', top: 0x3a2410, crowd: 0.55 });
    for (const [x, z] of [[-4.6, 0.4], [-6.2, -0.4]]) { const ch = new THREE.Group(); ch.position.set(x, 0, z); ch.rotation.y = 0.6; g.add(ch); rbox(ch, 0.8, 0.5, 0.8, 0.06, cloth(0x8a1a1a), 0, 0.3, 0); rbox(ch, 0.8, 0.7, 0.2, 0.06, cloth(0x1a3a2a), 0, 0.75, -0.3); for (let k = 0; k < 4; k++) box(ch, 0.1, 0.06, 0.8, cloth(k % 2 ? 0x8a1a1a : 0x1a3a2a), -0.3 + k * 0.2, 0.57, 0); }
    for (let i = 0; i < 2; i++) sign(g, i ? 'WALLEYE FRY FRIDAY' : 'PINEWOOD CARD ROOM', '#2a4a2a', '#f0e8c0', -W / 2 + 0.05, 2.9 - i * 0.6, -1.0, 2.6, 0.4, P2);
    slots(g, W / 2 - 0.6, -9.6, 3, -P2, { colors: [0xffd84d, 0x3aff8a, 0x3ad8ff] });
    // antler chandeliers over the tables
    const antler = (x, z) => { const w = new THREE.Group(); w.position.set(x, 3.0, z); g.add(w); const wm = M({ color: 0xe0d4bc, roughness: 0.7 }); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; seg(w, [0, 0, 0], [Math.cos(a) * 0.6, 0.2 + (i % 2) * 0.15, Math.sin(a) * 0.6], 0.035, 0.015, wm); seg(w, [Math.cos(a) * 0.35, 0.1, Math.sin(a) * 0.35], [Math.cos(a + 0.4) * 0.5, 0.4, Math.sin(a + 0.4) * 0.5], 0.02, 0.01, wm); } for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; sph(w, 0.045, glow(0xffd8a0, 3), Math.cos(a) * 0.62, -0.05, Math.sin(a) * 0.62, 8); } for (let i = 0; i < 3; i++) cyl(w, 0.006, 0.006, 1.4, M({ color: 0x1a1a1a }), Math.cos(i * 2.1) * 0.4, 0.7, Math.sin(i * 2.1) * 0.4, 4); light(w, 0xffd0a0, 2.4, 0, -0.1, 0, 7); };
    pokerTable(g, 1.8, -2.6, { mine: true, felt: 0x2a5a3a, rail: 0x1a0a0a, seats: 9, rx: 1.4, rz: 0.8, lamp: false, ceil: 2.9 }); antler(1.8, -2.6);
    for (const [x, z, ry] of [[-3.4, -6.0, 0.3], [3.0, -7.6, -0.3]]) { pokerTable(g, x, z, { felt: 0x2a5a3a, rail: 0x1a0a0a, seats: 9, rx: 1.4, rz: 0.8, ry, lamp: false, full: 0.85, ceil: 2.9 }); antler(x, z); }
    if (STAGE !== 'final') { stander(g, -1.0, -9.4, 0.4, { look: 'smart', arms: 'down', lod: 1 }); stander(g, 5.0, -1.0, -2.0, { arms: 'crossed', lod: 1 }); }
    return { exposure: 1.05, cam: [[-6.4, 1.5, 1.1], [1.6, 1.6, -7.6]] };
  },
  // the Twin Cities: a skyway lounge, white and pale oak, the glass skyway crossing right outside the window with people
  // going by, snow coming down past the IDS tower, a hanging fire, hygge in the corner
  twincities(g, o) {
    const W = 16, D = 13, H = 3.8, Zc = 2 - D / 2, B = 2 - D, P2 = Math.PI / 2;
    const slats = canvas(256, 64, (x, w, h) => { x.fillStyle = '#1a1a1e'; x.fillRect(0, 0, w, h); for (let i = 0; i < w; i += 16) { x.fillStyle = '#' + new THREE.Color('#d8b888').offsetHSL(0, 0, (rnd() - 0.5) * 0.06).getHexString(); x.fillRect(i + 2, 0, 10, h); } });
    shell(g, { w: W, d: D, h: H, floor: PAINT.carpet('#2a3040', '#3a4256', '#8aa0b8', 'check'), wall: PAINT.plain('#f4f2ee'), side: slats, ceil: slats, back: false, trim: 0xd8b888, fillI: 1.4, fillC: 0xfff4ea });
    const oak = M({ map: tex(PAINT.wood('#d8b888', '#c0a070', 30), 4, 1), roughness: 0.5 }), steel = M({ color: 0x2a2a30, metalness: 0.7, roughness: 0.4 }), view = VIEW.minneapolis();
    // the glass wall, the skyway bridge crossing outside it, the snow and the towers
    plane(g, W - 0.2, H - 0.1, M({ color: 0xa8c0d8, metalness: 1, roughness: 0.25, transparent: true, opacity: 0.08 }), 0, H / 2, B + 0.02); for (let i = -3; i <= 3; i++) box(g, 0.08, H, 0.1, steel, i * 2.6, H / 2, B + 0.06); box(g, W, 0.1, 0.12, steel, 0, 0.05, B + 0.06); box(g, W, 0.14, 0.14, steel, 0, H - 0.07, B + 0.06);
    skyway(g, 0, 0.6, B - 4.5, 24, 0.12);
    backdrop(g, view, 0, Zc, 30, 16, -5, Math.PI * 0.4, Math.PI * 1.6); skyDome(g, 0, Zc, 60, [[0, '#101428'], [0.6, '#2a2e4a'], [1, '#4a4a6a']]);
    for (let i = 0; i < 400; i++) { const fl = sph(g, 0.012, M({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.6 }), (rnd() - 0.5) * 30, rnd() * 9, B - 2 - rnd() * 8, 4); }
    // the ceiling's oak slats with light between, the hanging fire in the corner, sheepskin chairs round it, a long oak counter
    for (let i = 0; i < 5; i++) { box(g, W - 1, 0.03, 0.06, glow(0xfff0e0, 2.4), 0, H - 0.03, -0.4 - i * 2.6); light(g, 0xfff0e0, 1.4, 0, H - 0.4, -0.4 - i * 2.6, 9); }
    const fire = new THREE.Group(); fire.position.set(-5.8, 0, -8.8); g.add(fire); cyl(fire, 0.12, 0.12, H - 1.5, steel, 0, H - 0.75, 0, 12); const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.3, 0.7, 24, 1, true), M({ color: 0x1a1a1e, metalness: 0.6, roughness: 0.4, side: THREE.DoubleSide })); bowl.position.y = 1.2; fire.add(bowl); cyl(fire, 0.3, 0.3, 0.04, M({ color: 0x0a0806 }), 0, 0.88, 0, 20); sph(fire, 0.18, glow(0xff8a20, 3), 0, 1.0, 0, 8).scale.y = 1.6; light(fire, 0xff9a30, 2.2, 0, 1.2, 0, 6); cyl(fire, 0.9, 0.9, 0.06, M({ color: 0x3a3a3a, roughness: 0.6 }), 0, 0.03, 0, 24);
    for (let k = 0; k < 3; k++) { const a = 1.0 + k * 1.2; const ch = new THREE.Group(); ch.position.set(-5.8 + Math.cos(a) * 1.7, 0, -8.8 + Math.sin(a) * 1.7); ch.rotation.y = -a - P2; g.add(ch); rbox(ch, 0.7, 0.45, 0.7, 0.1, cloth(0xf4f0e8), 0, 0.3, 0); rbox(ch, 0.7, 0.6, 0.16, 0.08, cloth(0xf4f0e8), 0, 0.7, -0.28); for (let i = 0; i < 4; i++) cyl(ch, 0.02, 0.02, 0.3, oak, (i % 2 ? 0.28 : -0.28), 0.15, (i < 2 ? 0.28 : -0.28), 6); if (STAGE !== 'final' && rnd() < 0.6) person(ch, 0, 0.05, 0, { hip: 0.5, arms: 'lap', lod: 1 }); }
    rbox(g, 0.9, 0.3, 0.9, 0.1, oak, -5.8, 0.15, -6.6); for (let k = 0; k < 3; k++) cyl(g, 0.04, 0.04, 0.12 + k * 0.05, M({ color: 0xf4f0e8 }), -6.0 + k * 0.2, 0.36 + k * 0.025, -6.6, 10);
    bar(g, W / 2 - 1.6, -5.0, 6, { ry: -P2, wood: '#d8b888', wood2: '#c0a070', top: 0xf4f2ee, mirror: false, crowd: 0.5 }); for (let i = 0; i < 4; i++) { cyl(g, 0.004, 0.004, 1.2, steel, W / 2 - 1.6, H - 0.6, -7.2 + i * 1.5, 4); sph(g, 0.1, glow(0xfff0e0, 2.2), W / 2 - 1.6, H - 1.25, -7.2 + i * 1.5, 12); }
    sign(g, 'SKYWAY CARD ROOM', '#f4f2ee', '#2a3040', 0, 2.0, 1.96, 3.6, 0.5, Math.PI); plane(g, 2.4, 1.4, M({ map: tex(canvas(240, 140, (x, w, h) => { x.fillStyle = '#f4f2ee'; x.fillRect(0, 0, w, h); x.strokeStyle = '#2a3040'; x.lineWidth = 3; for (let i = 0; i < 12; i++) { x.beginPath(); x.moveTo(20 + i * 18, 20); x.lineTo(20 + i * 18, h - 20); x.stroke(); } x.strokeStyle = '#c84a2a'; x.lineWidth = 5; x.beginPath(); x.moveTo(30, 40); x.lineTo(90, 60); x.lineTo(150, 50); x.lineTo(210, 90); x.stroke(); })), roughness: 0.8 }), -W / 2 + 0.03, 2.2, -3.0, P2);
    for (const z of [-1.4, -4.4]) { const rg = rugAt(g, -5.5, z, 2.4, 1.8, canvas(128, 96, (x, w, h) => { x.fillStyle = '#e8e0d0'; x.fillRect(0, 0, w, h); x.fillStyle = '#2a3040'; for (let i = 0; i < 6; i++) x.fillRect(0, i * 16 + 4, w, 4); })); }
    slots(g, W / 2 - 0.6, -10.4, 3, -P2, { colors: [0x3ad8ff, 0xffd84d, 0xff6ab0] });
    // the tables under oak-and-brass pendants
    const pend = (x, z) => { for (let k = -1; k <= 1; k++) { cyl(g, 0.004, 0.004, 1.0, steel, x + k * 0.8, H - 0.5, z, 4); const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.2, 0.22, 20, 1, true), M({ map: tex(PAINT.wood('#d8b888', '#c0a070', 12), 1, 1), side: THREE.DoubleSide, roughness: 0.5 })); sh.position.set(x + k * 0.8, H - 1.1, z); g.add(sh); sph(g, 0.05, glow(0xfff0e0, 3), x + k * 0.8, H - 1.18, z, 8); } light(g, 0xfff0e0, 2.0, x, H - 1.3, z, 7); };
    pokerTable(g, 1.4, -2.6, { mine: true, felt: 0x24485e, rail: 0x1a0a0a, seats: 9, rx: 1.4, rz: 0.8, lamp: false, ceil: 2.6 }); pend(1.4, -2.6);
    for (const [x, z, ry] of [[-2.6, -6.2, 0.3], [3.8, -7.4, -0.3]]) { pokerTable(g, x, z, { felt: 0x24485e, rail: 0x1a0a0a, seats: 9, rx: 1.4, rz: 0.8, ry, lamp: false, full: 0.85, ceil: 2.6 }); pend(x, z); }
    if (STAGE !== 'final') { stander(g, -0.6, -9.8, 0.3, { look: 'smart', arms: 'down', lod: 1 }); stander(g, -1.0, 0.6, 2.4, { arms: 'crossed', lod: 1 }); }
    return { exposure: 1.0, cam: [[5.6, 1.5, 1.3], [-2.2, 1.7, -8.0]] };
  },
  // Palm Springs: desert modernism. A butterfly roof with a clerestory, breeze-block and terrazzo, a wall of glass sliding
  // open to a lit pool and the San Jacinto wall going violet, the wind farm's turbines blinking on the pass, agaves, sputniks
  palmsprings(g, o) {
    const W = 18, D = 12, H = 3.2, Zc = 2 - D / 2, B = 2 - D, P2 = Math.PI / 2;
    const terrazzo = canvas(256, 256, (x, w, h) => { x.fillStyle = '#e8dcc8'; x.fillRect(0, 0, w, h); for (let i = 0; i < 2600; i++) { x.fillStyle = pick(['#c8b8a0', '#8a7a6a', '#e8d8c0', '#d88a5a', '#5a8a8a', '#f4f0e8']); x.beginPath(); x.ellipse(rnd() * w, rnd() * h, 2 + rnd() * 4, 1.5 + rnd() * 3, rnd() * 3, 0, 7); x.fill(); } }); terrazzo.__kind = 'marble';
    const breeze = canvas(256, 256, (x, w, h) => { x.fillStyle = '#f0e6d4'; x.fillRect(0, 0, w, h); x.fillStyle = 'rgba(0,0,0,.28)'; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { const cx = i * 64 + 32, cy = j * 64 + 32; x.beginPath(); x.arc(cx, cy, 22, 0, 7); x.fill(); x.fillStyle = '#f0e6d4'; x.beginPath(); x.arc(cx, cy, 12, 0, 7); x.fill(); x.fillStyle = 'rgba(0,0,0,.28)'; } }); breeze.__kind = 'concrete';
    shell(g, { w: W, d: D, h: H, floor: terrazzo, wall: PAINT.plain('#f4ecdc'), side: breeze, ceil: null, back: false, trim: 0xd8c8a8, fillI: 1.2, floorRough: 0.25 });
    const white = M({ color: 0xf4ecdc, roughness: 0.6 }), steel = M({ color: 0x2a2a30, metalness: 0.7, roughness: 0.4 }), orange = M({ color: 0xe8702a, roughness: 0.5 }), teal = M({ color: 0x2a8a8a, roughness: 0.5 });
    // the butterfly roof: two planes dipping to a valley down the middle, a clerestory of glass under the high edges
    for (const s of [-1, 1]) { const rf = box(g, W / 2 + 0.4, 0.08, D, M({ map: tex(PAINT.wood('#d8c0a0', '#c8b090', 30), 4, 4), roughness: 0.8 }), s * W / 4, H + 0.9, Zc); rf.rotation.z = -s * 0.2; rf.userData.flat = 1; const sk = plane(g, D, 0.9, unlit(canvas(256, 32, (x, w, h) => { const g2 = x.createLinearGradient(0, 0, 0, h); g2.addColorStop(0, '#2a1a50'); g2.addColorStop(1, '#ff9a5a'); x.fillStyle = g2; x.fillRect(0, 0, w, h); }), 0.8), s * (W / 2 - 0.02), H + 0.45 + 0.9, Zc, -s * P2); for (let i = 0; i < 6; i++) box(g, 0.04, 0.9, 0.08, steel, s * (W / 2 - 0.04), H + 1.35, 2 - i * 2.4); }
    box(g, 0.3, 0.3, D, M({ color: 0x5a4a3a, roughness: 0.7 }), 0, H - 0.05, Zc); for (let i = 0; i <= 5; i++) { for (const s of [-1, 1]) { const bm = box(g, W / 2 + 0.5, 0.3, 0.2, M({ color: 0x5a4a3a, roughness: 0.7 }), s * W / 4, H + 0.75, 2 - i * 2.4); bm.rotation.z = -s * 0.2; } }
    // the glass on the pool: sliding doors, two of them stood open; the pool deck, the pool lit, loungers, agaves, the mountains
    const view = VIEW.palmsprings();
    for (let i = -4; i < 4; i++) { const x = i * 2.25 + 1.125; if (i === 0 || i === -1) continue; plane(g, 2.1, H - 0.15, M({ color: 0x9ab0c8, metalness: 1, roughness: 0.25, transparent: true, opacity: 0.08 }), x, H / 2, B + 0.02); box(g, 0.08, H, 0.1, steel, x - 1.125, H / 2, B + 0.06); }
    box(g, 0.08, H, 0.1, steel, 4.5, H / 2, B + 0.06); box(g, W, 0.1, 0.12, steel, 0, 0.05, B + 0.06); box(g, W, 0.12, 0.12, steel, 0, H - 0.06, B + 0.06); plane(g, 2.1, H - 0.15, M({ color: 0x9ab0c8, metalness: 1, roughness: 0.25, transparent: true, opacity: 0.08 }), -3.4, H / 2, B - 0.1); plane(g, 2.1, H - 0.15, M({ color: 0x9ab0c8, metalness: 1, roughness: 0.25, transparent: true, opacity: 0.08 }), 3.4, H / 2, B - 0.1);
    ground(g, 26, 10, M({ map: tex(PAINT.tile('#e8dcc8', '#d8ccb8', 6), 12, 5), roughness: 0.6 }), 0, B - 5, -0.01); pool(g, 0, B - 5.5, 9, 3.6);
    for (let i = 0; i < 4; i++) adirondack(g, -4.6 + i * 3.0, B - 2.6, Math.PI, pick([0xf4ecdc, 0xe8702a, 0x2a8a8a]));
    for (const [x, z, s] of [[-9, B - 2, 1.2], [-10, B - 7, 1.0], [9.4, B - 3, 1.1], [10, B - 8, 1.3], [7, B - 9.5, 0.9]]) agave(g, x, z, s);
    for (const [x, z, h, l] of [[-12, B - 10, 7, 0.5], [12.5, B - 11, 7.5, -0.6], [-6, B - 12, 6.5, 0.3]]) palmTree(g, x, z, h, l);
    ground(g, 60, 36, M({ map: tex(canvas(128, 128, (x, w, h) => { x.fillStyle = '#b89a78'; x.fillRect(0, 0, w, h); noise(x, w, h, 0.14, 4000); }), 16, 10), roughness: 0.95 }), 0, B - 24, -0.05);
    for (const x of [-10, 10]) { cyl(g, 0.04, 0.04, 2.2, steel, x, 1.1, B - 9.5, 6); sph(g, 0.12, glow(0xffd090, 2.6), x, 2.3, B - 9.5, 10); light(g, 0xffd090, 1.2, x, 2.2, B - 9.5, 6); }
    { const land = landscape(g, { x: -10, z: B - 70, w: 220, d: 90, kind: 'wall', snow: 1e9, treeline: -1, near: 0.3, scale: 1.8 }); moon(g, 0xff8a50, 1.2, [-80, 14, B - 20], [0, 0, B - 40]); } backdrop(g, view, 0, Zc, 150, 50, -12, Math.PI * 0.4, Math.PI * 1.6); starDome(g, 0, Zc, 220, [[0, '#1c1440'], [0.5, '#5a2a6a'], [0.85, '#c86a4a'], [1, '#ffb070']], 150);
    // sputnik lamps over the tables, a long white bar with a breeze-block front, orange and teal chairs by the glass
    const sput = (x, z) => { const sb = new THREE.Group(); sb.position.set(x, 2.5, z); g.add(sb); const br = M({ color: 0xc8a050, metalness: 0.9, roughness: 0.3 }); sph(sb, 0.08, br, 0, 0, 0); for (let i = 0; i < 14; i++) { const v = new THREE.Vector3().randomDirection().multiplyScalar(0.6); seg(sb, [0, 0, 0], [v.x, v.y, v.z], 0.012, 0.012, br); sph(sb, 0.05, glow(0xffe8c0, 3), v.x, v.y, v.z, 8); } cyl(sb, 0.006, 0.006, H - 2.5, M({ color: 0x1a1a1a }), 0, (H - 2.5) / 2, 0, 4); light(sb, 0xffe8c0, 2.2, 0, -0.2, 0, 7); };
    bar(g, -W / 2 + 1.6, -5.0, 6, { ry: P2, wood: '#f4ecdc', wood2: '#e8dcc8', top: 0x2a8a8a, mirror: false, crowd: 0.5 }); plane(g, 6, 1.0, M({ map: tex(breeze, 3, 0.5), roughness: 0.8 }), -W / 2 + 1.91, 0.52, -5.0, P2);
    for (const [x, z, c] of [[5.6, -0.2, orange], [7.0, -0.8, teal], [-6.0, -9.0, teal]]) { const ch = new THREE.Group(); ch.position.set(x, 0, z); ch.rotation.y = rnd() * 2; g.add(ch); const sh = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.6), c); sh.rotation.x = -0.6; sh.position.y = 0.65; sh.material.side = THREE.DoubleSide; ch.add(sh); cyl(ch, 0.03, 0.03, 0.5, steel, 0, 0.25, 0, 8); cyl(ch, 0.3, 0.3, 0.02, steel, 0, 0.01, 0, 20); }
    sign(g, 'POKER', '#2a6a6a', '#ffd8a0', 0, 2.3, 1.96, 2.2, 0.5, Math.PI); for (const s of [-1, 1]) photo(g, s * (W / 2 - 0.03), 1.9, -2.0, 1.2, 0.9, -s * P2, 'land', 0xe8702a);
    slots(g, W / 2 - 0.6, -8.0, 4, -P2, { colors: [0xe8702a, 0x2a8a8a, 0xffd84d] });
    // the tables, set sideways to the pool
    pokerTable(g, 2.0, -2.6, { mine: true, felt: 0x2a6a6a, rail: 0x1a0a0a, seats: 9, rx: 1.4, rz: 0.8, lamp: false, ceil: 2.4 }); sput(2.0, -2.6);
    for (const [x, z, ry] of [[-3.8, -5.4, P2], [5.2, -6.6, P2 + 0.3], [-0.6, -8.2, 0.2]]) { pokerTable(g, x, z, { felt: 0x2a6a6a, rail: 0x1a0a0a, seats: 9, rx: 1.4, rz: 0.8, ry, lamp: false, full: 0.85, ceil: 2.4 }); sput(x, z); }
    if (STAGE !== 'final') { stander(g, 7.4, -3.4, -1.6, { look: 'smart', arms: 'down', lod: 1 }); stander(g, 1.2, B - 2.2, 2.9, { arms: 'crossed', lod: 1 }); stander(g, -3.0, B - 3.6, 0.6, { arms: 'pockets', lod: 1 }); }
    return { exposure: 1.05, cam: [[-6.2, 1.5, 1.4], [1.6, 1.6, -8.0]] };
  },
  // Miami Beach: an Art Deco room like the salon of a liner, a curved glass balcony hanging over Ocean Drive's neon, portholes
  // on the sea, pink and teal and chrome, a stepped frosted chandelier, cove light in two colours
  miami(g, o) {
    const W = 18, D = 13, H = 4.2, Zc = 2 - D / 2, B = 2 - D, P2 = Math.PI / 2;
    const terr = canvas(256, 256, (x, w, h) => { x.fillStyle = '#f0e4e0'; x.fillRect(0, 0, w, h); for (let i = 0; i < 2400; i++) { x.fillStyle = pick(['#ff9ab8', '#3aa8a8', '#e8d8c0', '#f4f0e8', '#c8b8b0']); x.beginPath(); x.ellipse(rnd() * w, rnd() * h, 2 + rnd() * 4, 1.5 + rnd() * 3, rnd() * 3, 0, 7); x.fill(); } }); terr.__kind = 'marble';
    shell(g, { w: W, d: D, h: H, floor: terr, wall: PAINT.stripe('#f4e4dc', '#f8d8d0'), ceil: PAINT.plain('#f8f0ea'), back: false, trim: 0x2a8a8a, cornice: 0xf8f0ea, fillI: 1.3, floorRough: 0.25 });
    const chrome = M({ color: 0xd8d8e0, metalness: 0.95, roughness: 0.15, envMapIntensity: 1.4 }), teal = M({ color: 0x2a9a9a, roughness: 0.5 }), pink = M({ color: 0xff8ab0, roughness: 0.5 }), view = VIEW.oceandrive();
    // the curved balcony: nine panes of glass on the arc, a chrome rail, Ocean Drive below
    for (const s of [-1, 1]) plane(g, (W - 9) / 2, H, M({ map: tex(PAINT.stripe('#f4e4dc', '#f8d8d0'), 2, 2), roughness: 0.85 }), s * (W / 2 - (W - 9) / 4), H / 2, B); plane(g, 9, H - 3.4, M({ map: tex(PAINT.stripe('#f4e4dc', '#f8d8d0'), 4, 0.4), roughness: 0.85 }), 0, H - (H - 3.4) / 2, B);
    const bay = new THREE.Group(); bay.position.set(0, 0, B); g.add(bay); bayWindow(bay, view, 0, 1.9, 0, 6.0, 3.2, 9, Math.PI * 0.95, 0xf8f0ea);
    const cap = new THREE.Mesh(new THREE.CircleGeometry(6.3, 48, Math.PI, Math.PI), M({ color: 0xf8f0ea, roughness: 0.7 })); cap.rotation.x = P2; cap.position.set(0, 3.5, 0); bay.add(cap); cap.userData.flat = 1;
    const fl2 = new THREE.Mesh(new THREE.CircleGeometry(6.3, 48, Math.PI, Math.PI), M({ map: tex(terr, 3, 3), roughness: 0.25 })); fl2.rotation.x = -P2; fl2.position.set(0, 0.01, 0); bay.add(fl2); fl2.userData.flat = 1;
    for (let i = 0; i < 12; i++) { const a = -Math.PI * 0.475 + (i + 0.5) * Math.PI * 0.95 / 12; cyl(bay, 0.03, 0.03, 0.9, chrome, Math.sin(a) * 5.6, 0.45, -Math.cos(a) * 5.6, 8); } for (let i = 0; i < 12; i++) { const a0 = -Math.PI * 0.475 + i * Math.PI * 0.95 / 12, a1 = a0 + Math.PI * 0.95 / 12; seg(bay, [Math.sin(a0) * 5.6, 0.92, -Math.cos(a0) * 5.6], [Math.sin(a1) * 5.6, 0.92, -Math.cos(a1) * 5.6], 0.03, 0.03, chrome); }
    box(g, 0.1, 0.03, 0.03, chrome, 0, 0, 0);
    // portholes down both sides on the sea, deco fins between them in teal, the cove in pink and teal
    for (const s of [-1, 1]) for (let i = 0; i < 4; i++) { const z = -0.8 - i * 3.0; porthole(g, VIEW.ocean({ palms: false, sky1: '#6a2a8a', sky2: '#ff6ab0' }), s * (W / 2 - 0.02), 2.2, z, 0.5, -s * P2); box(g, 0.12, H - 0.4, 0.3, teal, s * (W / 2 - 0.08), H / 2 - 0.1, z - 1.5); }
    for (const s of [-1, 1]) box(g, 0.05, 0.05, D - 1, glow(s > 0 ? 0xff6ab0 : 0x3ad8ff, 2.4), s * (W / 2 - 0.5), H - 0.35, Zc); box(g, W - 1, 0.05, 0.05, glow(0xff6ab0, 2.4), 0, H - 0.35, 1.5);
    for (let k = 0; k < 3; k++) { const d = new THREE.Mesh(new THREE.CylinderGeometry(1.2 - k * 0.35, 1.2 - k * 0.35, 0.22, 32), M({ color: 0xffffff, emissive: 0xfff0e0, emissiveIntensity: 0.9, roughness: 0.4, transparent: true, opacity: 0.85 })); d.position.set(0, H - 0.4 - k * 0.25, -5.2); g.add(d); } light(g, 0xfff0e0, 3, 0, H - 1.2, -5.2, 10);
    // the streamline bar in chrome and teal, a neon name over it, stools; deco armchairs by the glass
    bar(g, -W / 2 + 1.6, -5.0, 6.5, { ry: P2, wood: '#2a9a9a', wood2: '#1a7a7a', top: 0xf8f0ea, crowd: 0.55 }); for (let k = 0; k < 3; k++) box(g, 0.02, 0.9, 6.3, chrome, -W / 2 + 1.92, 0.3 + k * 0.3, -5.0);
    neon(g, 'The Colony', '#ff6ab0', -W / 2 + 0.06, 3.1, -5.0, 90, P2); neon(g, 'OCEAN DRIVE POKER', '#3ad8ff', 0, 3.3, 1.94, 80, Math.PI);
    for (const [x, z, ry] of [[-6.2, -9.6, 0.8], [-4.8, -10.6, 1.6], [-5.4, -1.2, 0.6]]) { const ch = new THREE.Group(); ch.position.set(x, 0, z); ch.rotation.y = ry; g.add(ch); rbox(ch, 0.8, 0.5, 0.8, 0.15, cloth(0xff8ab0, 0.7), 0, 0.3, 0); const bk = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.7, 24, 1, true, 0, Math.PI), cloth(0xff8ab0, 0.7)); bk.material.side = THREE.DoubleSide; bk.position.set(0, 0.8, 0); bk.rotation.y = P2; ch.add(bk); }
    for (const s of [-1, 1]) photo(g, s * (W / 2 - 0.03), 2.0, -9.2, 1.0, 1.3, -s * P2, 'portrait', 0xd8d8e0);
    slots(g, W / 2 - 0.6, -8.0, 4, -P2, { colors: [0xff6ab0, 0x3ad8ff, 0xffd84d] }); cage(g, -W / 2 + 0.6, -9.8, P2, 2.4, 'CASHIER');
    // the tables
    pokerTable(g, 1.8, -2.6, { mine: true, felt: 0x1a6a8a, rail: 0x1a0a0a, seats: 9, rx: 1.4, rz: 0.8, lamp: false, ceil: 3.6 });
    for (const [x, z, ry] of [[-3.6, -5.8, 0.4], [4.8, -6.8, -0.4], [-0.2, -9.0, 0.1]]) pokerTable(g, x, z, { felt: 0x1a6a8a, rail: 0x1a0a0a, seats: 9, rx: 1.4, rz: 0.8, ry, lamp: false, full: 0.85, ceil: 3.6 });
    for (const [x, z] of [[1.8, -2.6], [-3.6, -5.8], [4.8, -6.8], [-0.2, -9.0]]) { const fm = M({ color: 0xf8f0ea, roughness: 0.4 }); rbox(g, 1.6, 0.1, 0.5, 0.05, fm, x, H - 0.2, z); plane(g, 1.5, 0.4, glow(0xfff0e0, 1.6), x, H - 0.26, z, 0, P2); light(g, 0xfff0e0, 2.2, x, H - 0.6, z, 7); }
    if (STAGE !== 'final') { stander(g, -1.6, B - 0.6, 2.8, { arms: 'crossed', lod: 1 }); stander(g, 2.2, B - 1.0, 0.4, { lod: 1 }); stander(g, 6.4, -3.6, -1.8, { look: 'smart', arms: 'down', lod: 1 }); }
    return { exposure: 1.05, cam: [[6.6, 1.5, 1.3], [-1.4, 1.6, -8.5]] };
  },
  // Seattle: a pier shed on Elliott Bay, fir trusses and corrugated tin, rain on the big windows, the Great Wheel and a
  // ferry going by, the coffee bar in the corner with its chalkboard, a rowing shell overhead
  seattle(g, o) {
    const W = 16, D = 14, H = 5.6, Zc = 2 - D / 2, B = 2 - D, P2 = Math.PI / 2;
    shell(g, { w: W, d: D, h: H, floor: PAINT.planks('#6a5438', '#4a3a26'), wall: PAINT.planks('#5a4a3a', '#3a2e22'), ceil: PAINT.tin('#4a4a50'), back: false, trim: 0x2a1a10, fillI: 0.9, fillC: 0xffe0c0 });
    const fir = M({ map: tex(PAINT.wood('#8a6a44', '#6a4e30', 8), 1, 4), roughness: 0.8 }), steel = M({ color: 0x2a2a30, metalness: 0.7, roughness: 0.5 }), view = VIEW.seattle();
    for (let i = 0; i <= 4; i++) { const z = 2 - i * 3.5; box(g, W, 0.3, 0.3, fir, 0, H - 1.5, z); for (const s of [-1, 1]) { const r = box(g, 8.6, 0.3, 0.25, fir, s * 4.0, H - 0.6, z); r.rotation.z = -s * 0.2; } for (let k = -3; k <= 3; k++) { const d = box(g, 0.12, 1.1 + Math.abs(k) * 0.1, 0.12, fir, k * 2.2, H - 1.0, z); } }
    for (const s of [-1, 1]) box(g, 0.4, H, 0.4, fir, s * 7.2, H / 2, -3.0); for (const s of [-1, 1]) box(g, 0.4, H, 0.4, fir, s * 7.2, H / 2, -9.0);
    // the windows on the bay, steel-sashed, the rain running down them; the pier outside with its bollards, the bay
    box(g, W, H - 3.8, 0.3, M({ map: tex(PAINT.planks('#5a4a3a', '#3a2e22'), 6, 1), roughness: 0.9 }), 0, H - (H - 3.8) / 2, B); for (let i = -2; i <= 2; i++) box(g, 0.5, 3.8, 0.3, M({ map: tex(PAINT.planks('#5a4a3a', '#3a2e22'), 0.5, 2), roughness: 0.9 }), i * 3.9, 1.9, B);
    for (const x of [-5.85, -1.95, 1.95, 5.85]) { glassWall(g, x, 2.1, B + 0.02, 3.3, 3.4, 0); rainOn(g, x, 2.1, B + 0.07, 3.3, 3.4, 0); for (let k = 0; k < 5; k++) box(g, 3.3, 0.03, 0.06, steel, x, 0.5 + k * 0.8, B + 0.1); for (let k = -1; k <= 1; k++) box(g, 0.03, 3.4, 0.06, steel, x + k * 1.1, 2.1, B + 0.1); box(g, 3.5, 0.08, 0.14, steel, x, 0.36, B + 0.1); box(g, 3.5, 0.08, 0.14, steel, x, 3.84, B + 0.1); }
    ground(g, 24, 6, M({ map: tex(PAINT.planks('#4a3a28', '#3a2a1c'), 12, 2), roughness: 0.9 }), 0, B - 3, -0.01); for (let i = 0; i < 6; i++) { cyl(g, 0.16, 0.18, 0.5, steel, -10 + i * 4, 0.25, B - 5.6, 10); } for (let i = 0; i < 4; i++) { cyl(g, 0.04, 0.04, 2.6, steel, -8 + i * 5.3, 1.3, B - 4.8, 6); sph(g, 0.14, glow(0xffe0a0, 2.4), -8 + i * 5.3, 2.7, B - 4.8, 10); light(g, 0xffe0a0, 1.0, -8 + i * 5.3, 2.5, B - 4.8, 6); }
    water(g, 80, 40, 0, B - 26, -0.3, 0x0e2030); backdrop(g, view, 0, Zc, 36, 18, -5.5, Math.PI * 0.4, Math.PI * 1.6); skyDome(g, 0, Zc, 60, [[0, '#0c1020'], [0.6, '#24304a'], [1, '#3a4a5a']]);
    // the rowing shell overhead, oars crossed on the wall, the coffee bar and its chalkboard, flannel on the chairs
    const shell2 = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), M({ color: 0xf0e8d8, roughness: 0.3, side: THREE.DoubleSide })); shell2.scale.set(4.2, 0.22, 0.3); shell2.position.set(0, H - 1.9, -6.0); shell2.rotation.y = 0.25; g.add(shell2); for (const s of [-1, 1]) cyl(g, 0.008, 0.008, 1.2, M({ color: 0x1a1a1a }), s * 2.0, H - 1.2, -6.0 + s * 0.5, 4);
    for (const s of [-1, 1]) { const oar = box(g, 0.05, 2.6, 0.05, M({ color: 0xc8a060, roughness: 0.6 }), -W / 2 + 0.1, 2.6, -2.0 + s * 0.2); oar.rotation.x = s * 0.35; box(g, 0.02, 0.5, 0.16, M({ color: 0xc81a1a, roughness: 0.5 }), -W / 2 + 0.1, 3.9, -2.0 + s * 0.6); }
    bar(g, W / 2 - 1.6, -3.4, 4.6, { ry: -P2, wood: '#4a3018', wood2: '#3a2410', top: 0x2a1a10, mirror: false, crowd: 0.5 }); rbox(g, 0.7, 0.5, 0.5, 0.04, M({ color: 0xd8d8e0, metalness: 0.95, roughness: 0.2 }), W / 2 - 2.4, 1.36, -4.6); chalkboard(g, W / 2 - 0.05, 2.6, -3.4, 2.4, 1.2, -P2, ['DRIP  3', 'AMERICANO  4', 'POUR OVER  5', 'SMOKED SALMON CHOWDER'], 0x3a2a1a);
    for (let i = 0; i < 3; i++) { const z = -1.4 - i * 1.3; cyl(g, 0.16, 0.16, 0.06, cloth(0x8a1a1a, 0.6), W / 2 - 2.5, 0.72, z, 16); cyl(g, 0.02, 0.03, 0.7, steel, W / 2 - 2.5, 0.35, z, 8); }
    for (const [x, z] of [[-5.2, 0.4], [-6.4, -1.0]]) { const ch = new THREE.Group(); ch.position.set(x, 0, z); ch.rotation.y = rnd() * 2; g.add(ch); rbox(ch, 0.8, 0.5, 0.8, 0.08, cloth(0x4a2a14), 0, 0.3, 0); rbox(ch, 0.8, 0.7, 0.2, 0.08, cloth(0x4a2a14), 0, 0.75, -0.3); rbox(ch, 0.7, 0.04, 0.6, 0.02, M({ map: tex(PAINT.wallpaper('#8a1a1a', '#1a1a1a', 'check'), 3, 3), roughness: 0.9 }), 0, 0.57, 0.05); }
    sign(g, 'PIER 57 CARD ROOM', '#1a2a3a', '#e8e0c0', 0, 2.2, 1.96, 3.8, 0.5, Math.PI); for (const s of [-1, 1]) photo(g, s * (W / 2 - 0.03), 2.4, -7.0, 1.3, 0.9, -s * P2, 'land', 0x3a2a1a);
    slots(g, -W / 2 + 0.6, -7.6, 4, P2, { colors: [0x3ad8ff, 0xffd84d, 0x3aff8a] }); cage(g, -W / 2 + 0.6, -11.0, P2, 2.4, 'CAGE');
    // industrial pendants over the tables
    const pend = (x, z) => { for (let k = -1; k <= 1; k++) pendant(g, x + k * 0.9, 2.6, z, 0xffd9a0, 0x2a3a2a); };
    pokerTable(g, 1.6, -2.8, { mine: true, felt: 0x1d4f5c, rail: 0x1a0a0a, seats: 9, rx: 1.4, rz: 0.8, lamp: false, ceil: 3.0 }); pend(1.6, -2.8);
    for (const [x, z, ry] of [[-3.6, -6.2, 0.3], [3.8, -7.4, -0.3], [-1.0, -10.0, 0.1]]) { pokerTable(g, x, z, { felt: 0x1d4f5c, rail: 0x1a0a0a, seats: 9, rx: 1.4, rz: 0.8, ry, lamp: false, full: 0.85, ceil: 3.0 }); pend(x, z); }
    if (STAGE !== 'final') { stander(g, -4.6, -11.2, 0.6, { arms: 'crossed', lod: 1 }); stander(g, 6.0, -9.8, -0.8, { look: 'smart', arms: 'down', lod: 1 }); }
    return { exposure: 1.05, cam: [[-6.0, 1.6, 1.3], [1.8, 1.8, -8.5]] };
  },
  // the Seoul Cup: a room from the future, a glossy black floor, LED panels for a ceiling shading pink to blue, light
  // ribbons up the walls, white cube seats, the Han and the Lotte Tower's spike through the glass, the rainbow fountain
  seoul(g, o) {
    const W = 18, D = 14, H = 4.2, Zc = 2 - D / 2, B = 2 - D, P2 = Math.PI / 2;
    const black = canvas(64, 64, (x, w, h) => { x.fillStyle = '#0a0a10'; x.fillRect(0, 0, w, h); noise(x, w, h, 0.03); }); black.__kind = 'marble';
    shell(g, { w: W, d: D, h: H, floor: black, wall: PAINT.panel('#14121a', '#1c1a24'), ceil: null, back: false, trim: 0x0a0a0c, fillI: 0.8, fillC: 0xd8c0ff, floorRough: 0.05 });
    const steel = M({ color: 0x1a1a22, metalness: 0.8, roughness: 0.25 }), white = M({ color: 0xf4f4f8, roughness: 0.3 }), view = VIEW.seoul();
    // the LED ceiling: a grid of panels shading from pink at the front to blue at the back, a black grid between
    for (let i = 0; i < 9; i++) for (let j = 0; j < 7; j++) { const t = j / 6; const c = new THREE.Color().setHSL(0.92 - t * 0.35, 0.8, 0.6); const p = plane(g, 1.8, 1.8, glow(c.getHex(), 0.9), -8 + i * 2, H - 0.02, 1.0 - j * 2, 0, P2); } for (let i = 0; i <= 9; i++) box(g, 0.1, 0.06, D, steel, -9 + i * 2, H - 0.02, Zc); for (let j = 0; j <= 7; j++) box(g, W, 0.06, 0.1, steel, 0, H - 0.02, 2 - j * 2);
    light(g, 0xff8ad8, 1.8, 0, H - 0.5, -1, 12); light(g, 0x8ad0ff, 1.8, 0, H - 0.5, -9, 12);
    // the glass on the river, the city and the tower beyond; light ribbons up the side walls
    windowOn(g, view, 0, H / 2, B + 0.02, W - 0.2, H - 0.1, 0, 'none'); for (let i = -4; i <= 4; i++) box(g, 0.06, H, 0.1, steel, i * 2.2, H / 2, B + 0.06); box(g, W, 0.1, 0.12, steel, 0, 0.05, B + 0.06);
    for (const s of [-1, 1]) for (let i = 0; i < 5; i++) { const z = -0.5 - i * 2.6; box(g, 0.04, H - 0.4, 0.06, glow(i % 2 ? 0xff3a8a : 0x3ad8ff, 2.2), s * (W / 2 - 0.03), H / 2, z); }
    // the emblem over the entrance, the taegeuk in light; cube seats, a white bar with a glowing front, a DJ's deck of screens
    const tg = canvas(256, 256, (x, w, h) => { x.clearRect(0, 0, w, h); x.fillStyle = '#d8283a'; x.beginPath(); x.arc(128, 128, 100, Math.PI, 0); x.fill(); x.fillStyle = '#2a4ad8'; x.beginPath(); x.arc(128, 128, 100, 0, Math.PI); x.fill(); x.fillStyle = '#d8283a'; x.beginPath(); x.arc(78, 128, 50, 0, 7); x.fill(); x.fillStyle = '#2a4ad8'; x.beginPath(); x.arc(178, 128, 50, 0, 7); x.fill(); }); const em = plane(g, 1.6, 1.6, new THREE.MeshBasicMaterial({ map: tex(tg), transparent: true }), 0, 2.6, 1.95, Math.PI); em.name = 'NEON'; neon(g, 'SEOUL CUP', '#ffffff', 0, 1.5, 1.95, 90, Math.PI);
    for (const [x, z] of [[-6.4, -5.0], [-7.2, -6.4], [-5.4, -6.6], [7.0, -10.2], [6.0, -11.4]]) { rbox(g, 0.6, 0.5, 0.6, 0.06, M({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.25, roughness: 0.4 }), x, 0.25, z); if (STAGE !== 'final' && rnd() < 0.5) person(g, x, z, rnd() * 6, { hip: 0.5, arms: 'lap', lod: 1 }); }
    bar(g, W / 2 - 1.6, -5.0, 6, { ry: -P2, wood: '#f4f4f8', wood2: '#e8e8f0', top: 0x0a0a10, mirror: false, crowd: 0.5 }); box(g, 0.04, 0.9, 5.9, glow(0x3ad8ff, 1.6), W / 2 - 1.92, 0.55, -5.0);
    const dj = new THREE.Group(); dj.position.set(-W / 2 + 1.4, 0, -8.6); dj.rotation.y = P2; g.add(dj); rbox(dj, 2.4, 1.1, 0.7, 0.04, M({ color: 0x0a0a10, roughness: 0.3 }), 0, 0.55, 0); box(dj, 2.4, 0.04, 0.7, glow(0xff3a8a, 2), 0, 1.12, 0); for (let k = -1; k <= 1; k++) tvSet(dj, k * 0.8, 1.9, -0.5, 0.8, 0, 'clock'); if (STAGE !== 'final') stander(dj, 0, -0.6, 0, { look: 'smart', arms: 'table', lod: 1 });
    slots(g, -W / 2 + 0.6, -3.6, 4, P2, { colors: [0xff3a8a, 0x3ad8ff, 0xffffff] }); cage(g, W / 2 - 0.6, -11.0, -P2, 2.4, 'CAGE');
    // the tables under rings of light
    const ring = (x, z) => { const r = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.03, 8, 48), glow(0xffffff, 2.6)); r.rotation.x = P2; r.position.set(x, 2.7, z); g.add(r); const r2 = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.06, 8, 48), steel); r2.rotation.x = P2; r2.position.set(x, 2.73, z); g.add(r2); for (let k = 0; k < 3; k++) cyl(g, 0.004, 0.004, H - 2.7, steel, x + Math.cos(k * 2.09) * 0.9, (H + 2.7) / 2, z + Math.sin(k * 2.09) * 0.9, 4); light(g, 0xffffff, 2.4, x, 2.5, z, 7); };
    pokerTable(g, 2.0, -2.6, { mine: true, felt: 0x3a1a5a, rail: 0x0a0a0c, seats: 9, rx: 1.4, rz: 0.8, lamp: false, ceil: 2.6 }); ring(2.0, -2.6);
    for (const [x, z, ry] of [[-3.2, -5.8, 0.3], [4.6, -6.8, -0.3], [-0.6, -9.6, 0]]) { pokerTable(g, x, z, { felt: 0x3a1a5a, rail: 0x0a0a0c, seats: 9, rx: 1.4, rz: 0.8, ry, lamp: false, full: 0.85, ceil: 2.6 }); ring(x, z); }
    if (STAGE !== 'final') { stander(g, 7.6, -1.4, -1.8, { look: 'smart', arms: 'down', lod: 1 }); stander(g, 1.4, B + 1.2, Math.PI, { arms: 'crossed', lod: 1 }); }
    return { exposure: 1.05, cam: [[-6.6, 1.5, 1.3], [1.8, 1.6, -8.5]] };
  },
  // Riverside: a boathouse on the bank, a glass strip in the floor over the water by the window, the river going by with a
  // tow of barges, cottonwoods, oars and life rings on the walls, lanterns over the tables
  cardriver(g, o) {
    const W = 14, D = 12, H = 4.0, Zc = 2 - D / 2, B = 2 - D, P2 = Math.PI / 2;
    const planks = PAINT.planks('#8a6a44', '#6e5234');
    shell(g, { w: W, d: D, h: H, floor: null, wall: PAINT.planks('#a08058', '#86683e'), ceil: PAINT.wood('#6a4a2a', '#5a3e22', 40), back: false, trim: 0x3a2410, fillI: 1.0, fillC: 0xffe0c0 });
    const fl = tex(planks, W / 2, (D - 1.4) / 2); const f1 = plane(g, W, D - 1.4, M({ map: fl, bumpMap: fl, bumpScale: 0.6, roughness: 0.7 }), 0, 0, Zc + 0.7, 0, -P2); f1.userData.flat = 1;
    const steel = M({ color: 0x2a2a30, metalness: 0.7, roughness: 0.4 }); plane(g, W, 1.4, M({ color: 0x9ab0c8, metalness: 0.9, roughness: 0.1, transparent: true, opacity: 0.18 }), 0, 0.01, B + 0.7, 0, -P2); for (let i = -3; i <= 3; i++) box(g, 0.06, 0.03, 1.4, steel, i * 2.3, 0.02, B + 0.7); box(g, W, 0.04, 0.06, steel, 0, 0.02, B + 1.4);
    // the river under the glass and out past the window: the water, the dock, the bank with its cottonwoods
    water(g, 60, 30, 0, B - 8, -1.2, 0x14303a); box(g, W + 2, 1.3, 0.3, M({ map: tex(PAINT.brick('#6a6a62', '#3a3a34'), 6, 1), roughness: 0.9 }), 0, -0.65, 2.1);
    const view = VIEW.riverbarge(); glassWall(g, 0, 2.2, B + 0.02, W - 0.6, 2.8, 0); box(g, W - 0.4, 0.1, 0.14, M({ color: 0x3a2410 }), 0, 0.78, B + 0.08); box(g, W - 0.4, 0.1, 0.14, M({ color: 0x3a2410 }), 0, 3.62, B + 0.08); for (let i = -2; i <= 2; i++) box(g, 0.08, 2.8, 0.1, M({ color: 0x3a2410 }), i * 2.7, 2.2, B + 0.08);
    box(g, 2.0, 0.12, 8, M({ map: tex(planks, 1, 8), roughness: 0.8 }), 4.5, -0.3, B - 4); for (let i = 0; i < 4; i++) cyl(g, 0.08, 0.08, 1.6, M({ color: 0x3a2a1a }), 4.5 + (i % 2 ? 0.9 : -0.9), -1.0, B - 1 - i * 2.2, 8); for (let i = 0; i < 3; i++) { cyl(g, 0.03, 0.03, 1.4, steel, 5.5, 0.4, B - 2 - i * 2.5, 6); sph(g, 0.1, glow(0xffe0a0, 2.6), 5.5, 1.15, B - 2 - i * 2.5, 8); light(g, 0xffe0a0, 1.0, 5.5, 1.1, B - 2 - i * 2.5, 6); }
    for (const [x, z, s] of [[-7, B - 4, 1.3], [-11, B - 8, 1.6], [9, B - 7, 1.4], [12, B - 3, 1.1]]) { const t = new THREE.Group(); t.position.set(x, 0, z); t.scale.setScalar(s); g.add(t); cyl(t, 0.18, 0.25, 3.2, M({ map: tex(PAINT.wood('#5a4a3a', '#3a2e22', 6), 1, 4), roughness: 0.95 }), 0, 1.6, 0, 10); for (let k = 0; k < 9; k++) sph(t, 1.0 + rnd() * 0.6, M({ color: pick([0x2a4a24, 0x3a5a2a, 0x1f3a1e]), roughness: 0.9 }), (rnd() - 0.5) * 2.2, 3.6 + rnd() * 1.8, (rnd() - 0.5) * 2.2, 8); }
    backdrop(g, view, 0, Zc, 34, 16, -5, Math.PI * 0.4, Math.PI * 1.6); skyDome(g, 0, Zc, 60, [[0, '#06081c'], [0.6, '#1a1a44'], [1, '#3a2a4a']]);
    // oars and life rings, a bait cooler and the bell, a bar of beer and bait, the tide board
    for (const s of [-1, 1]) { for (let k = 0; k < 2; k++) { const oar = box(g, 0.05, 2.4, 0.05, M({ color: 0xc8a060, roughness: 0.6 }), s * (W / 2 - 0.1), 2.4, -3.0 + k * 0.4 - s * 0.2); oar.rotation.x = (k ? 1 : -1) * 0.5; box(g, 0.02, 0.5, 0.16, M({ color: 0xc81a1a, roughness: 0.5 }), s * (W / 2 - 0.1), 3.6, -3.0 + k * 0.4 - s * 0.2 + (k ? 0.5 : -0.5)); } const lr = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.08, 10, 24), M({ color: 0xf0f0f0, roughness: 0.6 })); lr.position.set(s * (W / 2 - 0.1), 2.4, -7.5); lr.rotation.y = P2; g.add(lr); for (let k = 0; k < 4; k++) { const sg = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.082, 10, 24, Math.PI / 4), M({ color: 0xd8281e, roughness: 0.6 })); sg.position.set(s * (W / 2 - 0.1), 2.4, -7.5); sg.rotation.y = P2; sg.rotation.z = k * P2; g.add(sg); } }
    bar(g, -W / 2 + 1.6, -4.8, 5, { ry: P2, wood: '#6a4a2a', wood2: '#5a3e22', top: 0x3a2410, crowd: 0.5 }); chalkboard(g, -W / 2 + 0.05, 2.7, -4.8, 2.0, 1.1, P2, ['RIVER 14.2 ft', 'MINNOWS  NIGHTCRAWLERS', 'CATFISH FRY SAT'], 0x3a2a1a);
    rbox(g, 0.8, 0.7, 0.5, 0.04, M({ color: 0xf0f0f0, roughness: 0.4 }), W / 2 - 0.6, 0.35, 1.2); box(g, 0.8, 0.06, 0.5, M({ color: 0xd82a2a, roughness: 0.4 }), W / 2 - 0.6, 0.72, 1.2); cyl(g, 0.15, 0.2, 0.22, M({ color: 0xc8a050, metalness: 0.9, roughness: 0.3 }), W / 2 - 0.3, 2.6, -1.0, 16); box(g, 0.3, 0.04, 0.04, M({ color: 0x3a2a1a }), W / 2 - 0.2, 2.76, -1.0);
    sign(g, 'RIVERSIDE CARD ROOM', '#1a3a4a', '#f0e8c0', 0, 2.6, 1.96, 4.0, 0.55, Math.PI);
    // lanterns over the tables
    const lant = (x, z) => { cyl(g, 0.006, 0.006, 1.2, M({ color: 0x1a1a1a }), x, H - 0.6, z, 4); const lb = M({ color: 0x1a1a1a, metalness: 0.6, roughness: 0.4 }); box(g, 0.32, 0.04, 0.32, lb, x, H - 1.2, z); box(g, 0.26, 0.4, 0.26, M({ color: 0xfff0d0, emissive: 0xffc070, emissiveIntensity: 1.2, transparent: true, opacity: 0.8 }), x, H - 1.42, z); box(g, 0.34, 0.04, 0.34, lb, x, H - 1.64, z); light(g, 0xffc070, 2.4, x, H - 1.5, z, 7); };
    pokerTable(g, 1.6, -3.0, { mine: true, felt: 0x155e75, rail: 0x1a0a0a, seats: 9, rx: 1.4, rz: 0.8, lamp: false, ceil: 2.6 }); lant(1.6, -3.0);
    for (const [x, z, ry] of [[-3.4, -6.2, 0.35], [3.6, -7.0, -0.3]]) { pokerTable(g, x, z, { felt: 0x155e75, rail: 0x1a0a0a, seats: 9, rx: 1.4, rz: 0.8, ry, lamp: false, full: 0.85, ceil: 2.6 }); lant(x, z); }
    if (STAGE !== 'final') { stander(g, 0.2, B + 0.9, Math.PI + 0.3, { arms: 'crossed', lod: 1 }); stander(g, -2.0, B + 1.1, Math.PI - 0.4, { arms: 'pockets', lod: 1 }); stander(g, 5.8, -9.4, -0.8, { lod: 1 }); }
    return { exposure: 1.05, cam: [[5.4, 1.5, 1.3], [-1.6, 1.3, -8.0]] };
  },
  // Northside: the card room upstairs from the sports bar. An attic with the rafters showing, dormers over the street, the
  // bar's neon coming up the stairwell, jerseys and pennants on the knee walls, the game on, a hatch to the kitchen
  cardclub(g, o) {
    const W = 10, D = 16, H = 1.5, Zc = 2 - D / 2, B = 2 - D, P2 = Math.PI / 2, RISE = 3.2;
    const planks = PAINT.planks('#7a6244', '#5e4a30');
    shell(g, { w: W, d: D, h: H, floor: planks, wall: PAINT.panel('#5a4a3a', '#6a5a48'), ceil: null, trim: 0x3a2a1a, fillI: 0.9, fillC: 0xffd8b0 });
    const raft = M({ map: tex(PAINT.wood('#6a5038', '#4a3424', 6), 1, 6), roughness: 0.8 }), slope = M({ map: tex(PAINT.wood('#4a3a2a', '#3a2e22', 30), 6, 4), roughness: 0.85 });
    const L = Math.hypot(W / 2, RISE), ang = Math.atan2(RISE, W / 2);
    for (const s of [-1, 1]) { const r = box(g, L, 0.06, D, slope, s * W / 4, H + RISE / 2, Zc); r.rotation.z = -s * ang; r.userData.flat = 1; for (let i = 0; i <= 8; i++) { const rf = box(g, L, 0.14, 0.1, raft, s * W / 4, H + RISE / 2 - 0.1, 2 - i * 2); rf.rotation.z = -s * ang; } }
    box(g, 0.2, 0.2, D, raft, 0, H + RISE - 0.1, Zc); for (let i = 0; i <= 8; i++) box(g, W * 0.5, 0.12, 0.1, raft, 0, H + RISE * 0.55, 2 - i * 2);
    for (const z of [B, 2]) { const t = new THREE.Group(); t.position.set(0, 0, z); t.rotation.y = z > 0 ? Math.PI : 0; g.add(t); const sh = new THREE.Shape(); sh.moveTo(-W / 2, H); sh.lineTo(0, H + RISE); sh.lineTo(W / 2, H); sh.closePath(); const gm = new THREE.Mesh(new THREE.ShapeGeometry(sh), M({ map: tex(PAINT.panel('#5a4a3a', '#6a5a48'), 2, 1), roughness: 0.85 })); t.add(gm); gm.userData.flat = 1; }
    // the dormers down the left slope on the street, the round window in the gable on the sign
    const view = VIEW.street(); for (let i = 0; i < 3; i++) { const z = -1.5 - i * 4.5; const d = new THREE.Group(); d.position.set(-W / 2 + 1.1, H + 0.6, z); g.add(d); box(d, 1.4, 1.5, 1.6, slope, 0, 0.75, 0); windowOn(d, view, -0.72, 0.8, 0, 1.0, 1.1, P2, 0xf0ebe0); const rf = box(d, 1.6, 0.06, 1.8, slope, 0, 1.55, 0); light(g, 0xffd0a0, 0.5, -W / 2 + 1.6, H + 1.4, z, 4); }
    const oc = new THREE.Mesh(new THREE.CircleGeometry(0.8, 32), new THREE.MeshBasicMaterial({ map: tex(view) })); oc.position.set(0, H + 1.8, B + 0.03); g.add(oc); const rim = new THREE.Mesh(new THREE.TorusGeometry(0.82, 0.05, 8, 40), M({ color: 0xf0ebe0, roughness: 0.5 })); rim.position.set(0, H + 1.8, B + 0.05); g.add(rim); box(g, 1.7, 0.04, 0.05, M({ color: 0xf0ebe0 }), 0, H + 1.8, B + 0.06); box(g, 0.04, 1.7, 0.05, M({ color: 0xf0ebe0 }), 0, H + 1.8, B + 0.06);
    // the stairwell at the front left: a rail round the hole, the bar's neon glowing up it, the noise of the game below
    plane(g, 2.4, 3.6, glow(0x3ad8ff, 0.9), -W / 2 + 1.6, 0.01, 0.0, 0, -P2); light(g, 0x3ad8ff, 2.0, -W / 2 + 1.6, 0.6, 0, 6); light(g, 0xff3a6a, 1.2, -W / 2 + 1.0, 0.4, -1.2, 5);
    railing(g, -W / 2 + 2.8, 1.8, -W / 2 + 2.8, -1.8, 0.95, 'wood', 0x3a2a1a); railing(g, -W / 2 + 0.4, -1.8, -W / 2 + 2.8, -1.8, 0.95, 'wood', 0x3a2a1a); sign(g, 'CARD ROOM  ↑', '#1a1a1e', '#ffd84d', -W / 2 + 1.6, 1.3, -1.85, 1.2, 0.3);
    // the knee walls: jerseys in frames, pennants, the dartboard, the TV with the game, the hatch to the kitchen with its bell
    for (let i = 0; i < 4; i++) { const z = -3.5 - i * 3.0; plane(g, 0.7, 0.8, M({ map: tex(canvas(70, 80, (x, w, h) => { x.fillStyle = '#1a1a1e'; x.fillRect(0, 0, w, h); const c = pick(['#c8102e', '#1a3a8a', '#2a6a2a', '#ffd84d']); x.fillStyle = c; x.beginPath(); x.moveTo(12, 14); x.lineTo(58, 14); x.lineTo(62, 30); x.lineTo(52, 32); x.lineTo(52, 70); x.lineTo(18, 70); x.lineTo(18, 32); x.lineTo(8, 30); x.fill(); x.fillStyle = '#fff'; x.font = '900 22px sans-serif'; x.textAlign = 'center'; x.fillText(String(7 + i * 11), 35, 58); })), roughness: 0.6 }), W / 2 - 0.03, 1.0, z, -P2); }
    for (let i = 0; i < 6; i++) { const pn = new THREE.Mesh(new THREE.ShapeGeometry((() => { const s = new THREE.Shape(); s.moveTo(0, 0.12); s.lineTo(0.7, 0); s.lineTo(0, -0.12); s.closePath(); return s; })()), M({ color: pick([0xc8102e, 0x1a3a8a, 0x2a6a2a, 0xffd84d, 0xf0f0f0]), side: THREE.DoubleSide, roughness: 0.8 })); pn.position.set(-W / 2 + 0.05, 1.1, -3.6 - i * 1.6); pn.rotation.y = P2; g.add(pn); }
    dartboard(g, 0, H + 0.9, B + 0.05, 0); tvSet(g, W / 2 - 0.05, 1.1, -11.0, 1.1, -P2, 'football');
    box(g, 1.4, 0.9, 0.1, M({ color: 0x2a1a10 }), W / 2 - 0.08, 1.6, -7.8); plane(g, 1.2, 0.7, unlit(canvas(96, 56, (x, w, h) => { x.fillStyle = '#f0e0c0'; x.fillRect(0, 0, w, h); x.fillStyle = '#c8c0b0'; x.fillRect(10, 10, 30, 20); x.fillStyle = '#8a8a8a'; x.fillRect(50, 8, 36, 30); }), 0.6), W / 2 - 0.12, 1.6, -7.8, -P2); cyl(g, 0.06, 0.08, 0.1, M({ color: 0xc8a050, metalness: 0.9 }), W / 2 - 0.3, 1.2, -7.1, 12); sign(g, 'ORDER UP', '#8a1a1a', '#fff', W / 2 - 0.12, 2.15, -7.8, 0.9, 0.22, -P2);
    for (let i = 0; i < 3; i++) { const c = pick(['#1a3a8a', '#c8102e', '#2a2a2a']); plane(g, 0.5, 0.3, M({ map: tex(canvas(50, 30, (x, w, h) => { x.fillStyle = c; x.fillRect(0, 0, w, h); x.fillStyle = '#fff'; x.font = '900 12px sans-serif'; x.textAlign = 'center'; x.fillText(pick(['LAGER', 'ALE', 'IPA']), w / 2, 20); })), emissive: 0xffffff, emissiveMap: tex(canvas(2, 2, (x) => { x.fillStyle = '#444'; x.fillRect(0, 0, 2, 2); })), emissiveIntensity: 0.6 }), -W / 2 + 0.05, 1.3, -9.0 - i * 1.2, P2); }
    for (const [x, z] of [[-3.6, -8.0], [3.6, -5.0]]) { cyl(g, 0.3, 0.3, 0.04, M({ color: 0x3a2a1a, roughness: 0.6 }), x, 1.05, z, 16); cyl(g, 0.04, 0.05, 1.0, M({ color: 0x2a2a2a }), x, 0.5, z, 8); for (let k = 0; k < 3; k++) cyl(g, 0.035, 0.035, 0.14, new THREE.MeshPhysicalMaterial({ color: 0xd8a040, transmission: 0.5, roughness: 0.1, thickness: 0.02 }), x + (k - 1) * 0.14, 1.14, z, 10); }
    sign(g, 'NORTHSIDE CARD ROOM', '#1a1a1e', '#3ad8ff', 0, H + 0.6, 1.96, 3.2, 0.5, Math.PI);
    // caged bulbs under the rafters over the tables
    const bulb = (x, z) => { for (const s of [-1, 1]) { cyl(g, 0.006, 0.006, 1.4, M({ color: 0x1a1a1a }), x + s * 0.7, H + RISE * 0.55 - 0.7, z, 4); sph(g, 0.07, glow(0xffd8a0, 3), x + s * 0.7, H + RISE * 0.55 - 1.45, z, 10); const cg = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), M({ color: 0x1a1a1a, wireframe: true })); cg.position.set(x + s * 0.7, H + RISE * 0.55 - 1.45, z); g.add(cg); } light(g, 0xffd8a0, 2.4, x, H + RISE * 0.55 - 1.6, z, 7); };
    pokerTable(g, 0.6, -3.4, { mine: true, felt: 0x1f6b45, rail: 0x1a0a0a, seats: 9, rx: 1.4, rz: 0.8, lamp: false, ceil: 2.6 }); bulb(0.6, -3.4);
    for (const [x, z, ry] of [[-0.4, -8.2, 0.15], [0.6, -12.4, -0.15]]) { pokerTable(g, x, z, { felt: 0x1f6b45, rail: 0x1a0a0a, seats: 9, rx: 1.4, rz: 0.8, ry, lamp: false, full: 0.85, ceil: 2.6 }); bulb(x, z); }
    if (STAGE !== 'final') { stander(g, -3.4, -10.6, 1.2, { arms: 'crossed', lod: 1 }); stander(g, 3.4, -14.4, -0.6, { arms: 'pockets', lod: 1 }); }
    return { exposure: 1.05, cam: [[3.4, 1.4, 1.2], [-0.8, 1.7, -12]] };
  },
  // Harbor: the card room in the old cannery, a sawtooth roof with its north glass, steel columns, the trawlers tied up
  // right outside the window, crab pots and buoys on the dock, nets and foul-weather gear on the walls
  cardharbor(g, o) {
    const W = 16, D = 12, H = 4.6, Zc = 2 - D / 2, B = 2 - D, P2 = Math.PI / 2;
    shell(g, { w: W, d: D, h: H, floor: PAINT.concrete('#7a7a78'), wall: PAINT.brick('#8a6a5a', '#4a3a34'), ceil: null, back: false, trim: 0x3a3a3a, fillI: 1.0, fillC: 0xe8f0ff });
    const steel = M({ color: 0x3a3a44, metalness: 0.7, roughness: 0.5 }), tin = M({ map: tex(PAINT.tin('#5a5a60'), 6, 3), roughness: 0.6, metalness: 0.4 });
    for (let i = 0; i < 3; i++) { const z0 = 2 - i * 4; const r = box(g, W, 0.06, 4.6, tin, 0, H + 1.0, z0 - 2.3); r.rotation.x = 0.46; r.userData.flat = 1; const gl = plane(g, W, 2.0, unlit(canvas(64, 64, (x, w, h) => { x.fillStyle = '#0c1226'; x.fillRect(0, 0, w, h); for (let k = 0; k < 20; k++) { x.fillStyle = 'rgba(255,255,255,.6)'; x.fillRect(rnd() * w, rnd() * h, 1.5, 1.5); } }), 0.7), 0, H + 1.0, z0 - 4.0 + 0.02, 0); for (let k = -3; k <= 3; k++) box(g, 0.05, 2.0, 0.08, steel, k * 2.3, H + 1.0, z0 - 4.0 + 0.06); box(g, W, 0.2, 0.2, steel, 0, H, z0); }
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) { cyl(g, 0.14, 0.14, H, steel, s * 4.5, H / 2, -1 - i * 4, 12); }
    // the window on the dock, the trawler's bow right there, pots and buoys, the harbour beyond
    const view = VIEW.harbor(); glassWall(g, 0, 2.3, B + 0.02, W - 0.4, 3.0, 0); box(g, W, 0.1, 0.14, steel, 0, 3.82, B + 0.08); for (let i = -3; i <= 3; i++) box(g, 0.06, 3.0, 0.1, steel, i * 2.3, 2.3, B + 0.08); box(g, W, 0.12, 0.3, M({ color: 0x5a5a5a, roughness: 0.6 }), 0, 0.8, B + 0.1);
    ground(g, 30, 8, M({ map: tex(PAINT.planks('#6a5a40', '#4a3e2a'), 16, 3), roughness: 0.9 }), 0, B - 4, -0.01); water(g, 80, 40, 0, B - 28, -1.4, 0x0e2a34);
    trawler(g, 2.0, B - 10.8, 0.12); trawler(g, -8.0, B - 14.5, -0.25);
    for (let i = 0; i < 5; i++) { const px = -6 + i * 1.3, pz = B - 1.6 - (i % 2) * 1.0; const pot = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.4, 0.9), M({ color: 0x3a3a3a, wireframe: true })); pot.position.set(px, 0.2 + (i % 2) * 0.4, pz); g.add(pot); box(g, 0.9, 0.4, 0.9, M({ color: 0x2a3a3a, transparent: true, opacity: 0.25 }), px, 0.2 + (i % 2) * 0.4, pz); }
    for (let i = 0; i < 6; i++) sph(g, 0.2, M({ color: pick([0xff6a2a, 0xffd84d, 0xf0f0f0, 0x3ad8ff]), roughness: 0.6 }), 4 + (i % 3) * 0.5, 0.2 + Math.floor(i / 3) * 0.4, B - 1.8, 10);
    for (let i = 0; i < 4; i++) { cyl(g, 0.16, 0.18, 0.5, steel, -7 + i * 4.6, 0.25, B - 7.5, 10); } for (const x of [-6, 6]) { cyl(g, 0.04, 0.04, 3.0, steel, x, 1.5, B - 6.5, 6); sph(g, 0.14, glow(0xffe0a0, 2.6), x, 3.1, B - 6.5, 10); light(g, 0xffe0a0, 1.4, x, 3.0, B - 6.5, 8); }
    backdrop(g, view, 0, Zc, 40, 18, -5.5, Math.PI * 0.4, Math.PI * 1.6); skyDome(g, 0, Zc, 60, [[0, '#06081c'], [0.6, '#1a2040'], [1, '#3a3a5a']]);
    // the fish counter with its chalkboard and scale, the nets, jackets on hooks, a life ring, the fish box seats
    bar(g, -W / 2 + 1.6, -4.0, 5, { ry: P2, wood: '#e8e4dc', wood2: '#d8d4cc', top: 0x3a3a3a, mirror: false, crowd: 0.5 }); chalkboard(g, -W / 2 + 0.05, 2.6, -4.0, 2.2, 1.2, P2, ["TODAY'S CATCH", 'DUNGENESS  12/lb', 'LING COD  9/lb', 'HALIBUT  16/lb'], 0x3a2a1a); cyl(g, 0.2, 0.2, 0.05, steel, -W / 2 + 1.6, 1.14, -6.0, 16); cyl(g, 0.02, 0.02, 0.5, steel, -W / 2 + 1.6, 1.4, -6.0, 6); cyl(g, 0.18, 0.18, 0.08, M({ color: 0xf0f0f0, roughness: 0.4 }), -W / 2 + 1.6, 1.7, -6.0, 16);
    const netM = M({ color: 0x3a6a5a, wireframe: true }); for (let i = 0; i < 2; i++) { const nt = new THREE.Mesh(new THREE.SphereGeometry(1.2, 10, 8), netM); nt.scale.set(1.6, 0.5, 0.3); nt.position.set(W / 2 - 0.4, 3.2, -3 - i * 4); g.add(nt); }
    for (let i = 0; i < 4; i++) { const jk = rbox(g, 0.5, 0.9, 0.2, 0.06, M({ color: i % 2 ? 0xe8a020 : 0x1a3a6a, roughness: 0.5 }), W / 2 - 0.2, 1.8, -8.6 - i * 0.7, -P2); cyl(g, 0.02, 0.02, 0.12, steel, W / 2 - 0.1, 2.32, -8.6 - i * 0.7, 6); }
    const lr = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.08, 10, 24), M({ color: 0xf0f0f0, roughness: 0.6 })); lr.position.set(W / 2 - 0.1, 2.6, -1.2); lr.rotation.y = P2; g.add(lr); for (let k = 0; k < 4; k++) { const sg = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.082, 10, 24, Math.PI / 4), M({ color: 0xd8281e, roughness: 0.6 })); sg.position.set(W / 2 - 0.1, 2.6, -1.2); sg.rotation.y = P2; sg.rotation.z = k * P2; g.add(sg); }
    sign(g, 'HARBOR CARD ROOM', '#1a2a3a', '#f0e8c0', 0, 2.8, 1.96, 3.8, 0.55, Math.PI); sign(g, 'EST. 1947', '#1a2a3a', '#f0e8c0', 0, 2.2, 1.96, 1.6, 0.3, Math.PI);
    // caged work lights over the tables
    const work = (x, z) => { for (const s of [-1, 1]) { cyl(g, 0.006, 0.006, 1.2, M({ color: 0x1a1a1a }), x + s * 0.7, H - 0.6, z, 4); const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.26, 0.2, 20, 1, true), M({ color: 0x3a3a3a, side: THREE.DoubleSide, roughness: 0.4, metalness: 0.5 })); sh.position.set(x + s * 0.7, H - 1.2, z); g.add(sh); sph(g, 0.06, glow(0xfff4e0, 3), x + s * 0.7, H - 1.28, z, 8); } light(g, 0xfff4e0, 2.4, x, H - 1.4, z, 7); };
    pokerTable(g, 1.8, -2.8, { mine: true, felt: 0x1f6b45, rail: 0x1a0a0a, seats: 9, rx: 1.4, rz: 0.8, lamp: false, ceil: 2.6 }); work(1.8, -2.8);
    for (const [x, z, ry] of [[-3.4, -6.4, 0.3], [4.4, -7.2, -0.3]]) { pokerTable(g, x, z, { felt: 0x1f6b45, rail: 0x1a0a0a, seats: 9, rx: 1.4, rz: 0.8, ry, lamp: false, full: 0.85, ceil: 2.6 }); work(x, z); }
    if (STAGE !== 'final') { stander(g, 0.4, B - 1.2, Math.PI, { arms: 'crossed', lod: 1 }); stander(g, -5.6, -9.2, 0.8, { arms: 'pockets', lod: 1 }); stander(g, 6.4, -1.4, -1.8, { lod: 1 }); }
    return { exposure: 1.05, cam: [[-2.6, 1.5, 1.4], [1.0, 1.9, -9.0]] };
  },
  // the Horseshoe: a Western card room off the highway, a horseshoe bar, slots down one wall, a saddle on the rail,
  // wagon-wheel lamps, the big neon horseshoe out on its pole over the road, a semi going by
  cardwest(g, o) {
    const W = 16, D = 12, H = 3.8, Zc = 2 - D / 2, B = 2 - D, P2 = Math.PI / 2;
    const barn = PAINT.planks('#6a4a30', '#4a3420');
    shell(g, { w: W, d: D, h: H, floor: PAINT.planks('#8a6a44', '#6e5234'), wall: barn, ceil: PAINT.wood('#4a3020', '#3a2416', 40), trim: 0x2a1408, cornice: 0x3a2410, fillI: 0.9, fillC: 0xffd0a0 });
    const brass = M({ color: 0xc8a050, metalness: 0.9, roughness: 0.3 }), wm = M({ color: 0x4a2e16, roughness: 0.7 });
    for (let i = 0; i <= 4; i++) box(g, W, 0.3, 0.3, M({ map: tex(PAINT.wood('#4a3020', '#3a2416', 8), 4, 1), roughness: 0.8 }), 0, H - 0.15, 2 - i * 3);
    // the window on the highway and the sign, the road's lights, the semi
    const view = VIEW.highway(); windowOn(g, view, 0, 2.0, B + 0.02, 7.0, 2.2, 0, 0x2a1408); for (const s of [-1, 1]) curtain(g, s * 3.9, 2.0, B + 0.08, 0.6, 2.6, 0x8a2a1a);
    for (const s of [-1, 1]) { const sk = new THREE.Group(); sk.position.set(s * 6.0, 2.6, B + 0.1); g.add(sk); const bone = M({ color: 0xe8e0d0, roughness: 0.7 }); rbox(sk, 0.4, 0.6, 0.25, 0.1, bone, 0, 0, 0); for (const t of [-1, 1]) { const hn = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.05, 8, 24, Math.PI * 0.6), bone); hn.position.set(t * 0.2, 0.2, 0); hn.rotation.z = t > 0 ? -0.3 : Math.PI - 1.6; sk.add(hn); } }
    // the horseshoe bar: three runs of bar in a U, brass rail, the saddle on the rail beside it, the neon horseshoe over it
    bar(g, -W / 2 + 3.4, -5.0, 4.4, { ry: P2, wood: '#4a2410', wood2: '#3a1a0c', top: 0x2a140a, crowd: 0.5 }); bar(g, -W / 2 + 1.6, -7.4, 3.2, { ry: 0, wood: '#4a2410', wood2: '#3a1a0c', top: 0x2a140a, mirror: false, crowd: 0.4 }); bar(g, -W / 2 + 1.6, -2.6, 3.2, { ry: Math.PI, wood: '#4a2410', wood2: '#3a1a0c', top: 0x2a140a, mirror: false, crowd: 0.4 });
    const hs = canvas(256, 256, (x, w, h) => { x.clearRect(0, 0, w, h); x.strokeStyle = '#ff7a3a'; x.lineWidth = 22; x.shadowColor = '#ff5a2a'; x.shadowBlur = 24; x.beginPath(); x.arc(128, 120, 80, Math.PI * 0.75, Math.PI * 2.25); x.stroke(); x.fillStyle = '#ffe060'; for (let k = 0; k < 7; k++) { x.beginPath(); x.arc(128 + Math.cos(k / 7 * 4.7 + 2.3) * 80, 120 + Math.sin(k / 7 * 4.7 + 2.3) * 80, 7, 0, 7); x.fill(); } }); const hp = plane(g, 1.6, 1.6, new THREE.MeshBasicMaterial({ map: tex(hs), transparent: true }), -W / 2 + 0.08, 2.6, -5.0, P2); hp.name = 'NEON'; light(g, 0xff6a2a, 1.6, -W / 2 + 1.0, 2.4, -5.0, 6);
    const sad = new THREE.Group(); sad.position.set(-2.4, 1.1, 0.8); g.add(sad); box(g, 0.08, 0.08, 2.0, wm, -2.4, 1.0, 0.8); for (const s of [-1, 1]) box(g, 0.08, 1.0, 0.08, wm, -2.4, 0.5, 0.8 + s * 0.9); rbox(sad, 0.5, 0.2, 0.6, 0.08, M({ color: 0x5a3018, roughness: 0.5 }), 0, 0.08, 0); rbox(sad, 0.3, 0.25, 0.16, 0.06, M({ color: 0x5a3018, roughness: 0.5 }), 0, 0.22, -0.25); for (const s of [-1, 1]) rbox(sad, 0.08, 0.5, 0.3, 0.03, M({ color: 0x5a3018, roughness: 0.5 }), s * 0.26, -0.15, 0);
    // the slots down the right wall, the swinging doors, the hat rack, the wanted poster, a cactus in a pot? no: a wagon wheel
    slots(g, W / 2 - 0.6, -4.5, 8, -P2, { colors: [0xffd84d, 0xff3a3a, 0x3ad8ff] }); light(g, 0xff6ab0, 1.2, W / 2 - 1.2, 1.8, -4.5, 6);
    for (const s of [-1, 1]) { const dr = box(g, 0.7, 1.1, 0.04, M({ map: tex(barn, 1, 1), roughness: 0.8 }), W / 2 - 1.6 + s * 0.38, 1.3, 1.9, s * 0.5); } wagonWheel(g, W / 2 - 1.6, 2.6, 1.9);
    for (let i = 0; i < 4; i++) { cyl(g, 0.02, 0.02, 0.1, brass, -5.0 + i * 0.5, 2.1, 1.95, 6); const ht = new THREE.Group(); ht.position.set(-5.0 + i * 0.5, 2.0, 1.8); g.add(ht); cyl(ht, 0.2, 0.2, 0.03, M({ color: pick([0x3a2a1a, 0xe8d8b8, 0x1a1a1a]), roughness: 0.8 }), 0, 0, 0, 20); cyl(ht, 0.1, 0.11, 0.12, M({ color: pick([0x3a2a1a, 0xe8d8b8, 0x1a1a1a]), roughness: 0.8 }), 0, 0.07, 0, 16); }
    sign(g, 'HORSESHOE CARD ROOM', '#2a1408', '#ffd84d', 0, 2.9, 1.96, 4.0, 0.55, Math.PI); photo(g, W / 2 - 0.03, 2.4, -9.6, 1.2, 0.9, -P2, 'land', 0x3a2410);
    // wagon-wheel lamps over the tables
    const wheel = (x, z) => { const w = new THREE.Group(); w.position.set(x, 2.5, z); g.add(w); const rim = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.04, 8, 40), wm); rim.rotation.x = P2; w.add(rim); for (let i = 0; i < 6; i++) { const sp = box(w, 1.36, 0.035, 0.035, wm, 0, 0, 0); sp.rotation.y = i / 6 * Math.PI; } for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; cyl(w, 0.02, 0.02, 0.16, M({ color: 0xf4ecd8 }), Math.cos(a) * 0.62, 0.1, Math.sin(a) * 0.62, 6); sph(w, 0.045, glow(0xffd8a0, 3), Math.cos(a) * 0.62, 0.22, Math.sin(a) * 0.62, 8); } for (let i = 0; i < 3; i++) seg(w, [Math.cos(i * 2.1) * 0.5, 0, Math.sin(i * 2.1) * 0.5], [0, 1.0, 0], 0.006, 0.006, M({ color: 0x1a1a1a })); light(w, 0xffd0a0, 2.4, 0, -0.1, 0, 7); };
    pokerTable(g, 1.8, -2.8, { mine: true, felt: 0x7a3a1f, rail: 0x1a0a0a, seats: 9, rx: 1.4, rz: 0.8, lamp: false, ceil: 2.3 }); wheel(1.8, -2.8);
    for (const [x, z, ry] of [[-1.4, -6.8, 0.3], [4.0, -7.4, -0.3]]) { pokerTable(g, x, z, { felt: 0x7a3a1f, rail: 0x1a0a0a, seats: 9, rx: 1.4, rz: 0.8, ry, lamp: false, full: 0.85, ceil: 2.3 }); wheel(x, z); }
    if (STAGE !== 'final') { stander(g, 0.8, -9.6, 0.3, { arms: 'crossed', lod: 1 }); stander(g, -4.6, -9.6, 0.8, { arms: 'pockets', lod: 1 }); }
    return { exposure: 1.05, cam: [[6.2, 1.5, 1.2], [-1.8, 1.5, -8.0]] };
  },
  // the Nugget: a gold-rush hall, pressed tin overhead, a mezzanine on turned posts with a brass rail, oil-lamp rings, the
  // nugget itself in its case, the wall of old photographs, the headframe lit up on the hill out the window
  cardnugget(g, o) {
    const W = 14, D = 14, H = 5.6, Zc = 2 - D / 2, B = 2 - D, P2 = Math.PI / 2, GY = 3.0;
    shell(g, { w: W, d: D, h: H, floor: PAINT.planks('#7a5a3a', '#5e4428'), wall: PAINT.wallpaper('#6a2a1a', '#8a4a2a', 'floral'), ceil: PAINT.tin('#8a7a5a'), trim: 0x3a2410, cornice: 0x5a3a1a, fillI: 0.9, fillC: 0xffd0a0 });
    const brass = M({ color: 0xc8a050, metalness: 0.9, roughness: 0.3 }), wood = M({ map: tex(PAINT.wood('#5a3a1a', '#3a2410', 8), 1, 3), roughness: 0.6 });
    // the mezzanine on three sides at the back, turned posts, a brass rail, people at it; the stair up on the left
    const galF = M({ map: tex(PAINT.planks('#5a3a1a', '#4a2e14'), 4, 1), roughness: 0.6 });
    gallery(g, W / 2 - 2.6, B + 2.6, -W / 2 + 2.6, B + 2.6, GY, 2.6, galF, 'wood', 0x3a2410); gallery(g, -W / 2 + 2.6, B + 2.6, -W / 2 + 2.6, -3.0, GY, 2.6, galF, 'wood', 0x3a2410); gallery(g, W / 2 - 2.6, -3.0, W / 2 - 2.6, B + 2.6, GY, 2.6, galF, 'wood', 0x3a2410);
    for (const [x, z] of [[-W / 2 + 2.6, -3.0], [W / 2 - 2.6, -3.0], [-W / 2 + 2.6, B + 2.6], [W / 2 - 2.6, B + 2.6], [0, B + 2.6]]) { cyl(g, 0.14, 0.16, GY, wood, x, GY / 2, z, 12); cyl(g, 0.2, 0.14, 0.2, wood, x, GY - 0.1, z, 12); }
    for (let i = 0; i < 8; i++) { const st = box(g, 1.2, 0.08, 0.3, galF, -W / 2 + 0.7, 0.2 + i * 0.36, -3.4 - i * 0.3); } railing(g, -W / 2 + 1.3, -3.2, -W / 2 + 1.3, -5.8, 0.9, 'wood', 0x3a2410);
    const up = new THREE.Group(); up.position.y = GY; g.add(up); if (STAGE !== 'final') for (let i = 0; i < 4; i++) stander(up, -4 + i * 2.6 + rnd(), B + 2.3, Math.PI * 0 + (rnd() - 0.5) * 0.6, { arms: 'crossed', lod: 1 });
    // the window on the hill and the headframe, the photo wall, the nugget in its case, the copper bar
    const view = VIEW.headframe(); windowOn(g, view, 0, GY + 1.3, B + 0.02, 5.0, 1.8, 0, 0x3a2410); for (const s of [-1, 1]) windowOn(g, view, s * 4.6, GY + 1.3, B + 0.02, 1.6, 1.8, 0, 0x3a2410);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) photo(g, W / 2 - 0.03, 1.4 + j * 1.0, -0.4 - i * 1.3, 0.8, 0.6, -P2, j ? 'land' : 'portrait', 0x5a3a1a);
    const cs = new THREE.Group(); cs.position.set(-4.0, 0, 0.6); g.add(cs); box(cs, 0.8, 0.9, 0.8, wood, 0, 0.45, 0); box(cs, 0.7, 0.6, 0.7, new THREE.MeshPhysicalMaterial({ color: 0xffffff, transmission: 0.9, roughness: 0.05, thickness: 0.01, transparent: true, opacity: 0.3 }), 0, 1.2, 0); const ng = sph(cs, 0.14, M({ color: 0xd8a020, metalness: 0.95, roughness: 0.35, emissive: 0xc88a10, emissiveIntensity: 0.35 }), 0, 1.06, 0, 10); ng.scale.set(1.3, 0.8, 1); sph(cs, 0.03, glow(0xffe8c0, 3), 0, 1.45, 0, 6); light(cs, 0xffe8c0, 0.8, 0, 1.4, 0, 2.5); sign(cs, '1898  •  41 oz', '#1a1a1a', '#ffd84d', 0, 0.75, 0.41, 0.7, 0.14);
    bar(g, -W / 2 + 1.6, -1.0, 4.0, { ry: P2, wood: '#5a3a1a', wood2: '#3a2410', top: 0xb87333, crowd: 0.5 });
    for (const s of [-1, 1]) for (const z of [-1.0, -5.0, -9.0]) sconce(g, s * (W / 2 - 0.05), 2.2, z, -s * P2, 0xffb860);
    sign(g, 'THE NUGGET', '#2a1408', '#ffd84d', 0, 2.8, 1.96, 3.0, 0.6, Math.PI); sign(g, 'CARD ROOM SINCE 1898', '#2a1408', '#f0e0c0', 0, 2.2, 1.96, 3.0, 0.3, Math.PI);
    // oil-lamp rings over the tables
    const ring = (x, z) => { const c = new THREE.Group(); c.position.set(x, 2.6, z); g.add(c); const tor = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.03, 6, 36), brass); tor.rotation.x = P2; c.add(tor); for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283; oilLamp(c, Math.cos(a) * 0.7, 0.02, Math.sin(a) * 0.7); } for (let k = 0; k < 3; k++) seg(c, [Math.cos(k * 2.09) * 0.7, 0, Math.sin(k * 2.09) * 0.7], [0, 1.2, 0], 0.006, 0.006, brass); cyl(c, 0.008, 0.008, H - 3.8, M({ color: 0x1a1a1a }), 0, 1.2 + (H - 3.8) / 2, 0, 4); light(c, 0xffb860, 2.6, 0, 0.1, 0, 7); };
    pokerTable(g, 1.6, -2.4, { mine: true, felt: 0x5a3a1a, rail: 0x1a0a0a, seats: 9, rx: 1.4, rz: 0.8, lamp: false, ceil: 2.4 }); ring(1.6, -2.4);
    for (const [x, z, ry] of [[-2.4, -6.2, 0.3], [3.2, -8.0, -0.3]]) { pokerTable(g, x, z, { felt: 0x5a3a1a, rail: 0x1a0a0a, seats: 9, rx: 1.4, rz: 0.8, ry, lamp: false, full: 0.85, ceil: 2.4 }); ring(x, z); }
    if (STAGE !== 'final') { stander(g, -1.0, -10.2, 0.4, { arms: 'crossed', lod: 1 }); stander(g, -4.6, -8.6, 0.8, { arms: 'pockets', lod: 1 }); }
    return { exposure: 1.05, cam: [[5.4, 1.5, 1.4], [-1.8, 1.8, -8.5]] };
  },
  // Lakeview: a small casino on the lake, the card room in a glass prow pointed at the sunset, a deck round it, a stone
  // fire on one side, white beadboard and blue, paddles on the wall, the whole room lit orange from the water
  cardlake(g, o) {
    const W = 14, D = 11, H = 3.8, Zc = 2 - D / 2, B = 2 - D, P2 = Math.PI / 2, PR = 3.5;
    shell(g, { w: W, d: D, h: H, floor: PAINT.planks('#a08058', '#86683e'), wall: PAINT.beadboard('#f4f0e6'), ceil: PAINT.beadboard('#f8f4ec'), back: false, trim: 0x1a3a6a, cornice: 0xf4f0e6, fillI: 1.0, fillC: 0xffc090 });
    const white = M({ color: 0xf4f0e6, roughness: 0.5 }), view = VIEW.lakesunset();
    // the prow: two glass walls meeting at a point past the back, framed in white; the deck round it; the lake and the sun
    const pl = Math.hypot(W / 2, PR), pa = Math.atan2(W / 2, PR);
    for (const s of [-1, 1]) { const gw = new THREE.Group(); gw.position.set(s * W / 4, 0, B - PR / 2); gw.rotation.y = s * pa; g.add(gw); plane(gw, pl, H - 0.2, M({ color: 0x9ab0c8, metalness: 1, roughness: 0.2, transparent: true, opacity: 0.07 }), 0, H / 2, 0); for (let i = -3; i <= 3; i++) box(gw, 0.1, H, 0.12, white, i * pl / 7, H / 2, 0.06); box(gw, pl, 0.14, 0.2, white, 0, 0.07, 0.06); box(gw, pl, 0.16, 0.2, white, 0, H - 0.08, 0.06); box(gw, pl, 0.06, 0.1, white, 0, 1.0, 0.06); }
    const pf = new THREE.Mesh(new THREE.ShapeGeometry((() => { const s = new THREE.Shape(); s.moveTo(-W / 2, 0); s.lineTo(W / 2, 0); s.lineTo(0, -PR); s.closePath(); return s; })()), M({ map: tex(PAINT.planks('#a08058', '#86683e'), 4, 2), roughness: 0.7 })); pf.rotation.x = -P2; pf.position.set(0, 0, B); g.add(pf); pf.userData.flat = 1;
    const pc = new THREE.Mesh(new THREE.ShapeGeometry((() => { const s = new THREE.Shape(); s.moveTo(-W / 2, 0); s.lineTo(W / 2, 0); s.lineTo(0, -PR); s.closePath(); return s; })()), M({ map: tex(PAINT.beadboard('#f8f4ec'), 4, 2), roughness: 0.8 })); pc.rotation.x = P2; pc.position.set(0, H, B); g.add(pc); pc.userData.flat = 1;
    ground(g, 30, 10, M({ map: tex(PAINT.planks('#8a6a44', '#6e5234'), 14, 4), roughness: 0.8 }), 0, B - PR - 4, -0.01); for (let i = 0; i < 6; i++) railing(g, -14 + i * 4.7, B - PR - 8, -14 + (i + 1) * 4.7, B - PR - 8, 1.0, 'wood', 0xf4f0e6);
    for (let i = 0; i < 5; i++) adirondack(g, -6 + i * 3, B - PR - 5.6, Math.PI + (rnd() - 0.5) * 0.3, pick([0xf4f0e6, 0x1a3a6a, 0xff8a3a]));
    for (const x of [-10, 10]) { cyl(g, 0.04, 0.04, 2.4, white, x, 1.2, B - PR - 7.5, 6); sph(g, 0.14, glow(0xffe0a0, 2.4), x, 2.5, B - PR - 7.5, 10); light(g, 0xffe0a0, 1.0, x, 2.4, B - PR - 7.5, 6); }
    water(g, 80, 40, 0, B - 30, -0.3, 0x3a2a30); const wt = water(g, 80, 40, 0, B - 30, -0.28, 0x8a4a3a); wt.material.emissiveIntensity = 0.3;
    backdrop(g, view, 0, Zc, 40, 15, -4.5, Math.PI * 0.3, Math.PI * 1.7); skyDome(g, 0, Zc, 70, [[0, '#2a1a5a'], [0.4, '#8a3a6a'], [0.7, '#ff7a3a'], [1, '#ffc060']]); light(g, 0xff9a50, 3.0, 0, 2.5, B - 2, 20);
    // the stone fire on the left, paddles and a mounted bass? no, a paddle and a burgee, the lake map, the blue sofa
    fireplace(g, -W / 2 + 0.3, -5.0, P2); for (let k = 0; k < 2; k++) { const pd = box(g, 0.05, 1.6, 0.05, M({ color: 0xc8a060, roughness: 0.6 }), -W / 2 + 0.1, 2.6, -1.4 + k * 0.5); pd.rotation.x = (k ? 1 : -1) * 0.4; box(g, 0.02, 0.45, 0.16, M({ color: k ? 0x1a3a6a : 0xff8a3a, roughness: 0.5 }), -W / 2 + 0.1, 3.4, -1.4 + k * 0.5 + (k ? 0.35 : -0.35)); }
    plane(g, 1.6, 1.0, M({ map: tex(canvas(160, 100, (x, w, h) => { x.fillStyle = '#e8e0c8'; x.fillRect(0, 0, w, h); x.fillStyle = '#6a9ab8'; x.beginPath(); x.ellipse(80, 50, 60, 30, 0.3, 0, 7); x.fill(); x.strokeStyle = '#3a3a3a'; x.lineWidth = 1; for (let k = 0; k < 6; k++) { x.beginPath(); x.ellipse(80, 50, 60 + k * 4, 30 + k * 3, 0.3, 0, 7); x.stroke(); } x.fillStyle = '#1a1a1a'; x.font = '700 10px sans-serif'; x.fillText('LAKE', 68, 54); })), roughness: 0.8 }), W / 2 - 0.03, 2.2, -4.0, -P2);
    sofa(g, W / 2 - 0.6, -1.0, -P2, 0x1a3a6a, 2.2); sign(g, 'LAKEVIEW CARD ROOM', '#1a3a6a', '#f4f0e6', 0, 2.6, 1.96, 3.8, 0.55, Math.PI);
    slots(g, W / 2 - 0.6, -7.6, 4, -P2, { colors: [0x3ad8ff, 0xffd84d, 0xff8a3a] });
    // white pendants over the tables
    const pend = (x, z) => { for (const s of [-1, 1]) { cyl(g, 0.006, 0.006, 1.0, white, x + s * 0.7, H - 0.5, z, 4); const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.26, 0.22, 20, 1, true), M({ color: 0xf4f0e6, side: THREE.DoubleSide, roughness: 0.5 })); sh.position.set(x + s * 0.7, H - 1.1, z); g.add(sh); sph(g, 0.06, glow(0xfff0d0, 3), x + s * 0.7, H - 1.18, z, 8); } light(g, 0xfff0d0, 2.0, x, H - 1.3, z, 7); };
    pokerTable(g, 1.6, -2.6, { mine: true, felt: 0x1a6a8a, rail: 0x1a0a0a, seats: 9, rx: 1.4, rz: 0.8, lamp: false, ceil: 2.6 }); pend(1.6, -2.6);
    for (const [x, z, ry] of [[-3.2, -5.8, 0.35], [3.4, -6.8, -0.35]]) { pokerTable(g, x, z, { felt: 0x1a6a8a, rail: 0x1a0a0a, seats: 9, rx: 1.4, rz: 0.8, ry, lamp: false, full: 0.85, ceil: 2.6 }); pend(x, z); }
    if (STAGE !== 'final') { stander(g, 0.4, B - 1.6, Math.PI, { arms: 'crossed', lod: 1 }); stander(g, -2.2, B - 2.4, 2.6, { arms: 'pockets', lod: 1 }); stander(g, 5.2, -4.0, -1.6, { lod: 1 }); }
    return { exposure: 1.05, cam: [[-5.6, 1.5, 1.4], [1.4, 1.5, -9.0]] };
  },
  // the Silver Dollar: the card club by the track, open all night. A race book down one wall, a dozen screens and the
  // carrels under them, the mutuel windows, the tote board, the home stretch under floodlights out the window
  carddollar(g, o) {
    const W = 16, D = 12, H = 3.6, Zc = 2 - D / 2, B = 2 - D, P2 = Math.PI / 2;
    const coins = canvas(256, 256, (x, w, h) => { x.fillStyle = '#2a1a3a'; x.fillRect(0, 0, w, h); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { x.strokeStyle = 'rgba(200,200,220,.6)'; x.lineWidth = 3; x.beginPath(); x.arc(i * 64 + 32 + (j % 2) * 32, j * 64 + 32, 16, 0, 7); x.stroke(); x.fillStyle = 'rgba(200,200,220,.18)'; x.beginPath(); x.arc(i * 64 + 32 + (j % 2) * 32, j * 64 + 32, 14, 0, 7); x.fill(); } noise(x, w, h, 0.05); }); coins.__kind = 'carpet';
    shell(g, { w: W, d: D, h: H, floor: coins, wall: PAINT.panel('#3a2a3a', '#4a3448'), ceil: PAINT.dropceil(), trim: 0x1a1a1e, fillI: 1.1, fillC: 0xffe8d0 });
    const steel = M({ color: 0x2a2a30, metalness: 0.7, roughness: 0.4 }), view = VIEW.racetrack();
    // the window on the track, the floodlights blazing, the tote board inside over it
    windowOn(g, view, 0, 1.9, B + 0.02, 10, 2.2, 0, 0x1a1a1e); for (let i = -2; i <= 2; i++) box(g, 0.06, 2.2, 0.1, steel, i * 2.5, 1.9, B + 0.08); light(g, 0xf0f4ff, 2.0, 0, 2.4, B + 1.5, 10);
    tvSet(g, 0, 3.2, B + 0.08, 3.6, 0, 'board'); sign(g, 'RACE 9  •  POST 9:42', '#1a1a1e', '#ff3a3a', 0, 3.52, B + 0.1, 2.6, 0.18);
    // the race book down the left: a grid of screens, carrels with their lamps and pencils, the mutuel windows at the back
    for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) tvSet(g, -W / 2 + 0.05, 1.5 + j * 0.78, -1.2 - i * 1.5, 1.3, P2, j === 1 ? 'horses' : (i % 2 ? 'horses' : 'clock'));
    for (let i = 0; i < 5; i++) { const z = -0.8 - i * 1.2; box(g, 0.9, 0.04, 0.6, M({ color: 0x3a2a1a, roughness: 0.5 }), -W / 2 + 1.6, 0.76, z); box(g, 0.04, 0.5, 0.6, M({ color: 0x3a2a1a, roughness: 0.5 }), -W / 2 + 1.15, 1.0, z); cyl(g, 0.03, 0.04, 0.3, steel, -W / 2 + 1.3, 0.92, z - 0.2, 8); const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.4, 14, 1, true, 0, Math.PI), M({ color: 0x1a5a2a, emissive: 0x1a5a2a, emissiveIntensity: 0.4, side: THREE.DoubleSide, roughness: 0.2 })); sh.rotation.z = P2; sh.position.set(-W / 2 + 1.3, 1.1, z - 0.2); g.add(sh); sph(g, 0.03, glow(0xffe8c0, 3), -W / 2 + 1.3, 1.08, z - 0.2, 6); plane(g, 0.3, 0.2, M({ color: 0xf4f0e6, roughness: 0.9 }), -W / 2 + 1.7, 0.785, z + 0.1, 0, -P2); chair(g, -W / 2 + 2.3, z, P2, 0x2a1a14); if (STAGE !== 'final' && rnd() < 0.7) person(g, -W / 2 + 2.2, z, P2, { arms: 'table', lod: 1 }); }
    cage(g, -5.0, B + 0.6, 0, 2.8, 'MUTUELS'); cage(g, 5.6, B + 0.6, 0, 2.8, 'MUTUELS'); for (let i = 0; i < 4; i++) { cyl(g, 0.03, 0.03, 0.95, M({ color: 0xc8a050, metalness: 0.9 }), -6.2 + i * 0.8, 0.48, B + 2.2, 8); }
    // the all-night coffee urn and the doughnuts, the clock, the neon, the slots by the door
    box(g, 2.0, 0.9, 0.6, M({ color: 0x3a2a1a, roughness: 0.5 }), W / 2 - 1.2, 0.45, -1.0); cyl(g, 0.2, 0.2, 0.5, M({ color: 0xd8d8e0, metalness: 0.95, roughness: 0.2 }), W / 2 - 1.6, 1.15, -1.0, 16); cyl(g, 0.3, 0.3, 0.1, M({ color: 0xf0e8d8, roughness: 0.6 }), W / 2 - 0.9, 0.95, -1.0, 16); for (let k = 0; k < 5; k++) { const dn = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.022, 8, 16), M({ color: pick([0xd8a060, 0x5a3a1a, 0xf0c0d0]), roughness: 0.6 })); dn.rotation.x = P2; dn.position.set(W / 2 - 1.0 + (k % 3) * 0.09, 1.02 + Math.floor(k / 3) * 0.05, -1.0 + (k % 2) * 0.09); g.add(dn); }
    neon(g, 'RACE & SPORTS BOOK', '#ff3a6a', -W / 2 + 0.06, 3.3, -3.4, 70, P2); neon(g, 'OPEN 24 HRS', '#3ad8ff', W / 2 - 0.06, 3.2, -3.0, 70, -P2);
    const clk = new THREE.Mesh(new THREE.CircleGeometry(0.3, 32), M({ color: 0xf4f0e6, roughness: 0.4 })); clk.position.set(0, 3.2, 1.95); clk.rotation.y = Math.PI; g.add(clk); box(g, 0.02, 0.2, 0.02, M({ color: 0x1a1a1a }), 0, 3.3, 1.93); box(g, 0.14, 0.02, 0.02, M({ color: 0x1a1a1a }), 0.07, 3.2, 1.93);
    slots(g, W / 2 - 0.6, -7.0, 5, -P2, { colors: [0xffd84d, 0xd8d8e0, 0xff3a3a] });
    for (let i = 0; i < 5; i++) for (let j = 0; j < 3; j++) { const fl = plane(g, 1.1, 0.5, glow(0xfff4e8, 1.3), -6 + i * 3, H - 0.01, -1 - j * 4, 0, P2); } light(g, 0xfff4e8, 1.4, -4, H - 0.4, -5, 10); light(g, 0xfff4e8, 1.4, 4, H - 0.4, -5, 10);
    // the tables under their own lights, a little smoke in the air
    pokerTable(g, 1.6, -2.8, { mine: true, felt: 0x1f6b45, rail: 0x1a0a0a, seats: 9, rx: 1.4, rz: 0.8, lamp: true, shade: 0x1a1a1e, lampColor: 0xfff0d8, ceil: 2.6 });
    for (const [x, z, ry] of [[-2.6, -6.6, 0.3], [3.6, -7.4, -0.3]]) pokerTable(g, x, z, { felt: 0x1f6b45, rail: 0x1a0a0a, seats: 9, rx: 1.4, rz: 0.8, ry, lamp: true, shade: 0x1a1a1e, lampColor: 0xfff0d8, full: 0.85, ceil: 2.6 });
    if (STAGE !== 'final') { stander(g, -3.2, B + 1.8, Math.PI + 0.3, { arms: 'crossed', lod: 1 }); stander(g, 5.2, -4.0, -1.6, { arms: 'pockets', lod: 1 }); stander(g, 0.6, B + 1.6, Math.PI - 0.2, { lod: 1 }); }
    return { exposure: 1.05, fog: [0x2a2030, 8, 30], cam: [[6.0, 1.5, 1.3], [-2.0, 1.5, -7.5]] };
  }
};
// which room each place uses, and how it's dressed (the key is what poker.html asks for)
const PLACES = {
  carddollar: ['carddollar'],
  cardnugget: ['cardnugget'],
  cardclub: ['cardclub'],
  cardlake: ['cardlake'],
  cardwest: ['cardwest'],
  cardharbor: ['cardharbor'],
  cardriver: ['cardriver'],
  cardroom: ['cardroom'],
  seoul: ['seoul'],
  seattle: ['seattle'],
  miami: ['miami'],
  palmsprings: ['palmsprings'],
  twincities: ['twincities'],
  pinewood: ['pinewood'],
  tahoe: ['tahoe'],
  chicago: ['chicago'],
  boardwalk: ['boardwalk'],
  reno: ['reno'],
  gulf: ['gulf'],
  malta: ['malta'],
  prague: ['prague'],
  nassau: ['nassau'],
  singapore: ['singapore'],
  vienna: ['vienna'],
  london: ['london'],
  bayou: ['bayou'],
  vegasvip: ['vegasvip'],
  macau: ['macau'],
  monaco: ['monaco'],
  paris: ['paris'],
  kitchen: ['kitchen'], basement: ['basement'], garage: ['garage'], dining: ['dining'], porch: ['porch'],
  lodge: ['lodgehall'], vfw: ['vfw'],
  firehouse: ['firehouse'], rec: ['gym'],
  countryclub: ['countryclub'], cellar: ['cellar'], backroom: ['backroom'], dragon: ['dragon'], cantina: ['cantina'], diner: ['diner'],
  aspen: ['lodge', { snow: true }],
  mainevent: ['ballroom', {}], omahachamp: ['ballroom', { hall: 'omaha', mine: [6.0, -1.6], cam: [[10.8, 1.7, 1.0], [-5.0, 1.6, -9.0]], title: 'OMAHA WORLD CHAMPIONSHIP', banner: 'OMAHA CHAMPIONSHIP', bannerBg: '#1c133e', screen: ['#3b2a7a', '#100a2a'], felt: 0x3b2a7a, carpet: '#1c133e', carpet2: '#2a1d5a' }],
  playerschamp: ['ballroom', { hall: 'toronto', mine: [-7.4, -1.6], cam: [[-11.4, 1.6, 1.2], [3.0, 1.6, -8.5]], title: 'PLAYERS\' CHAMPIONSHIP', banner: 'PLAYERS\' CHAMPIONSHIP', bannerBg: '#0f3d2e', screen: ['#0f3d2e', '#04140e'], felt: 0x0f3d2e, carpet: '#0a2a1e', carpet2: '#0f3d2e' }],
  minetown: ['saloon', { view: VIEW.mountains({ pines: true, sky0: '#081020', sky1: '#30406a' }) }], deadwood: ['saloon'],
  tunica: ['riverboat', { felt: 0x155e75 }],
  sedona: ['lodge', { view: VIEW.desert({ rock: '#8a3a1c' }) }],
  cruise: ['cruise'], series: ['expo', {}], seriesspring: ['expo', { hall: 'tent', mine: [-7.2, -1.4], cam: [[-12.2, 1.6, 0.8], [-1.0, 1.4, -12.0]], banner: 'SPRING SERIES', bannerBg: '#1f6b45', carpet: '#2a1a3a', carpet2: '#3a2a4a' }], seriesfall: ['expo', { hall: 'shed', mine: [8.4, -1.4], cam: [[13.6, 1.7, 1.0], [0, 1.4, -12.0]], banner: 'FALL SERIES', bannerBg: '#c0561e', carpet: '#3a1a10', carpet2: '#4a2414' }]
};

// the bars: each one its own sign, neon and walls
[['RUSTY ANCHOR', 'Cold Beer', '#3ad8ff', 'anchor'], ['COPPER KETTLE', 'Pints', '#ffb030', 'kettle'], ['BRASS TAP', 'On Tap', '#ffd84d', 'tap'], ['RED LION', 'Ales', '#ff3a3a', 'lion'],
  ['BLACK DOG', 'Cold Beer', '#ff4ad8', 'dog'], ['SHAMROCK', 'Irish Pub', '#3aff8a', 'shamrock'], ['TIN CUP', '19th Hole', '#3ad8ff', 'tincup'], ['IRON HORSE', 'Whiskey', '#ff8a3a', 'iron'],
  ['BLUE MOOSE', 'Ski Bar', '#3a9aff', 'moose'], ['LUCKY PENNY', 'Karaoke', '#ff4ad8', 'penny']].forEach((p, i) => { PLACES['pub' + i] = ['pub', { name: p[0], neon: p[1], neonColor: p[2], theme: p[3] }]; });


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
  V = o.view === 'seat' ? 'seat' : 'room'; STAGE = o.stage === 'final' ? 'final' : o.stage === 'thin' ? 'thin' : 'busy'; OTHERS = 0;
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
  else if (res.cam) { cam.position.set(...res.cam[0]); cam.lookAt(...res.cam[1]); }
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
  FABRIC = null; BOTTLE = null; CARDB = null; for (const k in CARDF) delete CARDF[k]; for (const k in CHIPM) delete CHIPM[k]; for (const k in FELTS) delete FELTS[k];
  cache[ck] = url;
  return url;
}
let queue = Promise.resolve();
window.VenueScene = {
  keys: Object.keys(PLACES),
  // one at a time (they share the renderer), each in its own turn so the page keeps moving
  render(key, o) { const p = queue.then(() => new Promise(r => setTimeout(r, 0))).then(() => render(key, o)).catch(e => { console.warn('venue', key, e); return null; }); queue = p; return p; },
  // the scene itself, with people as markers, for the offline (path-traced) renderer
  build(key, o) { EXPORT = true; PN = 0; try { const b = build(key, Object.assign({ view: 'room', stage: 'busy', w: 1280, h: 720 }, o)); b.scene.add(b.cam); return b; } finally { EXPORT = false; } }
};
