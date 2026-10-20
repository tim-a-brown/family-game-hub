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
  const closed = !o.mine && (STAGE === 'final' || (STAGE === 'thin' && rnd() < 0.45));
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
// END DECOR
// the room: floor, back wall, side walls, ceiling, a skirting board and a cornice. The camera sits near the front.
function room(g, o) {
  const w = o.w || 12, d = o.d || 10, h = o.h || 3.2;
  const fl = tex(o.floor, w / 2, d / 2);
  const flat = [];
  flat.push(plane(g, w, d, M({ map: fl, bumpMap: fl, bumpScale: 0.6, roughness: o.floorRough || 0.75 }), 0, 0, -d / 2 + 2, 0, -Math.PI / 2));
  const wm = M({ map: tex(o.wall, w / 2.4, h / 2.4), roughness: 0.85 }), sm = M({ map: tex(o.side || o.wall, d / 2.4, h / 2.4), roughness: 0.85 });
  flat.push(plane(g, w, h, wm, 0, h / 2, -d + 2));
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
  // a card room: a dealer in every box, the brush's podium with the waiting list on a screen, the cage, the tournament
  // clock and the ballgames on the TVs. Each club is its own place: its own shape of room, ceiling, way the tables sit,
  // what's in the way of the camera and where the light comes from (o.theme)
  cardroom(g, o) {
    const T = o.theme || 'prairie', P2 = Math.PI / 2;
    const D = {
      // a low ranch house of a room: timber beams, wood floor, the tables scattered, a half-wall rail round the big game in the corner
      prairie: { w: 14, d: 11, h: 2.8, floor: PAINT.wood('#8a5a32', '#6e4426', 22), wall: PAINT.planks('#8a6a4a', '#6e5034'), wains: PAINT.planks('#4a3020', '#3a2416'), ceil: PAINT.wood('#7a5a3a', '#6a4a2e', 30), felt: 0x1f6b45, rail: 0x2a1408, trim: 0x2a1408, cornice: 0x3a2414, name: 'PRAIRIE ROSE CARD CLUB', bg: '#2a1410', fg: '#e8c070', fix: 'wheel',
        tables: [[-4.3, -5.0, 0.35], [0.8, -6.6, -0.25], [4.6, -4.8, 0.55]], mine: [1.6, -1.9], cam: [[-4.8, 1.6, 1.3], [1.2, 1.05, -5.0]], expo: 1.15 },
      // a long low room along the river, one row of tables by the glass; you look down its length
      river: { w: 20, d: 9, h: 3.0, floor: PAINT.carpet('#14303a', '#1c4250', '#4a8a8a', 'diamond'), wall: PAINT.panel('#3e4e4a', '#4a5c58'), ceil: PAINT.dropceil(), felt: 0x1f6b45, rail: 0x1a1210, trim: 0x2a2a2a, cornice: 0xd8d8d0, name: 'RIVERSIDE CARD ROOM', bg: '#10202a', fg: '#d8e8f0', fix: 'bar', view: VIEW.river({ moon: true, trees: true }),
        tables: [[-7.2, -4.4, 0], [-2.4, -4.6, 0], [6.6, -4.4, 0], [-5.0, -1.6, 0]], mine: [2.2, -1.9], cam: [[7.4, 1.55, 1.1], [-3.5, 1.05, -5.0]], expo: 1.0 },
      // upstairs from the sports bar: a black ceiling of ducts, brick, the bar in the near corner, tables staggered
      club: { w: 14, d: 12, h: 3.2, floor: PAINT.carpet('#26262a', '#1c1c20', '#8a2a2a', 'check'), wall: PAINT.brick('#7a3a28', '#4a3a34'), ceil: PAINT.plain('#18181a'), felt: 0x2f5a8a, rail: 0x111111, trim: 0x111111, cornice: 0x1a1a1a, name: 'NORTHSIDE CARD ROOM', bg: '#111111', fg: '#ffd84d', fix: 'bar',
        tables: [[-4.4, -5.4, 0.25], [1.0, -7.2, 0], [5.0, -5.0, -0.3]], mine: [1.4, -2.2], cam: [[4.2, 1.3, 1.5], [-1.8, 1.1, -6.2]], expo: 1.25 },
      // a bright white boathouse of a room: posts down both sides, the back tables up on a step, lamps on chains
      harbor: { w: 16, d: 12, h: 3.6, floor: PAINT.carpet('#0e1c34', '#1e3658', '#c8a050', 'wave'), wall: PAINT.beadboard('#dcdfd8'), wains: PAINT.beadboard('#1e3a5a'), ceil: PAINT.beadboard('#ecebe4'), felt: 0x1a4a7a, rail: 0x1a1210, trim: 0x1e3a5a, cornice: 0xf0f0e8, name: 'HARBOR LIGHTS', bg: '#0e2240', fg: '#f0e8d0', fix: 'lamps', view: VIEW.ocean({ yachts: true, sky1: '#2a3a6a', sky2: '#e88a5a' }),
        tables: [[-3.6, -7.4, 0, 0.3], [3.6, -7.4, 0, 0.3], [-5.0, -3.8, 0.2], [5.2, -3.6, -0.2]], mine: [0.8, -1.9], cam: [[-5.8, 1.75, 1.2], [1.0, 1.0, -6.0]], expo: 1.0 },
      // a wide western hall, the tables all turned the same way like a dance floor, the slots a wall of light on your right
      west: { w: 18, d: 10, h: 3.0, floor: PAINT.carpet('#4a2a14', '#7a3a1a', '#d8a040', 'navajo'), wall: PAINT.wood('#6a4424', '#54361c', 30), ceil: PAINT.tin('#4a3a2a'), felt: 0x7a3a1f, rail: 0x1a0e06, trim: 0x2a1a0a, cornice: 0x2a1a0a, name: 'LUCKY HORSESHOE', bg: '#1a0e06', fg: '#ffd070', fix: 'iron',
        tables: [[-6.0, -4.6, 0.45], [-1.0, -5.6, 0.45], [4.0, -4.6, 0.45], [-3.4, -1.3, 0.45]], mine: [2.4, -1.9], cam: [[5.8, 1.5, 1.9], [-3.2, 1.05, -5.0]], expo: 1.4 },
      // the old gold-rush club: a low pressed-tin ceiling, red flock, booths down one wall, the tables packed close
      nugget: { w: 12, d: 10, h: 2.6, floor: PAINT.carpet('#3a0e0e', '#5a1a14', '#c89a40', 'scroll'), wall: PAINT.wallpaper('#5e0e12', '#7e1a1c', 'floral'), wains: PAINT.panel('#3a1e0e', '#4a2a14'), ceil: PAINT.tin('#b89858'), felt: 0x7a3a1f, rail: 0x1a0a04, trim: 0x2a1408, cornice: 0xc8a050, name: 'GOLD NUGGET', bg: '#1a0a04', fg: '#e8c050', fix: 'tiffany',
        tables: [[-2.6, -5.6, 0.2], [2.4, -6.6, -0.1], [4.0, -3.8, -0.4]], mine: [0.0, -2.1], cam: [[-4.6, 1.5, 1.5], [1.6, 1.05, -5.6]], expo: 1.3 },
      // a lake casino's card room: tall glass on the sunset, the tables turned end-on to it, a lounge by the window
      lake: { w: 16, d: 12, h: 3.4, floor: PAINT.carpet('#2a2a4a', '#3a3a64', '#e8a040', 'diamond'), wall: PAINT.panel('#d8ccb4', '#e6dcc6'), ceil: PAINT.plain('#f0ebe0'), felt: 0x1f6b45, rail: 0x1a1210, trim: 0x5a4030, cornice: 0xf0ebe0, name: 'LAKEVIEW CASINO', bg: '#2a2a4a', fg: '#ffd8a0', fix: 'bar', view: VIEW.ocean({ sky0: '#1a1440', sky1: '#8a4a7a', sky2: '#ff7a3a' }),
        tables: [[-5.2, -5.0, P2], [-1.2, -6.8, P2], [3.2, -6.4, P2]], mine: [2.2, -1.9], cam: [[-1.6, 1.5, 1.6], [0.6, 1.05, -6.4]], expo: 1.0 },
      // the racetrack club: a half-wall splits it, the race book glowing on the far side, the poker tables on this one
      dollar: { w: 16, d: 14, h: 3.0, floor: PAINT.carpet('#2a0c0c', '#4a1616', '#a8acb4', 'deco'), wall: PAINT.panel('#2a2e34', '#33383f'), ceil: PAINT.dropceil(), felt: 0x7a3a1f, rail: 0x111111, trim: 0x111111, cornice: 0xc8ccd4, name: 'SILVER DOLLAR CARD CLUB', bg: '#14161a', fg: '#e0e4ec', fix: 'bar',
        tables: [[-5.2, -4.8, 0], [-1.4, -7.4, 0.3], [-5.6, -9.0, 0]], mine: [-1.2, -2.0], cam: [[4.4, 1.6, 1.4], [-3.4, 1.0, -6.4]], expo: 1.15 }
    }[T];
    const W2 = D.w / 2, r = room(g, { w: D.w, d: D.d, h: D.h, floor: D.floor, wall: D.wall, wainscot: D.wains, ceil: D.ceil, trim: D.trim, cornice: D.cornice, fillI: 0.8 });
    const B = r.back, felt = o.felt || D.felt, H = D.h, L = -W2 + 0.03, Rr = W2 - 0.03;
    if (D.wains) for (const s of [-1, 1]) plane(g, D.d, 1.0, M({ map: tex(D.wains, D.d / 2.4, 0.5) }), s * (W2 - 0.01), 0.5, B / 2 + 1, -s * P2);
    const brass = M({ color: 0xc8a050, metalness: 0.9, roughness: 0.28, envMapIntensity: 1.1 }), iron = M({ color: 0x1a1a1a, metalness: 0.6, roughness: 0.45 });
    const wd = M({ map: tex(PAINT.wood('#5a3418', '#4a2a12', 18), 2, 1), roughness: 0.45 });
    // the light over each table, in the club's own style
    const fixture = (x, z, y) => {
      y = (y || 0) + H;
      if (D.fix === 'wheel') {
        const w = new THREE.Group(); w.position.set(x, y - 0.55, z); g.add(w); const wm = M({ color: 0x4a2e16, roughness: 0.8 });
        const rim = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.035, 8, 40), wm); rim.rotation.x = P2; w.add(rim); cyl(w, 0.07, 0.07, 0.1, wm, 0, 0, 0, 12);
        for (let i = 0; i < 6; i++) { const s = box(w, 1.06, 0.03, 0.03, wm, 0, 0, 0); s.rotation.y = i / 6 * Math.PI; }
        for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; sph(w, 0.04, glow(0xffd8a0, 3), Math.cos(a) * 0.55, -0.06, Math.sin(a) * 0.55, 8); }
        for (let i = 0; i < 3; i++) cyl(w, 0.005, 0.005, 0.5, iron, Math.cos(i * 2.1) * 0.3, 0.25, Math.sin(i * 2.1) * 0.3, 4);
      } else if (D.fix === 'lamps') {
        for (const s of [-1, 1]) { cyl(g, 0.005, 0.005, 0.9, brass, x + s * 0.6, y - 0.45, z, 4); cyl(g, 0.11, 0.11, 0.05, brass, x + s * 0.6, y - 0.9, z, 16); cyl(g, 0.09, 0.09, 0.22, M({ color: 0xfff4e0, emissive: 0xffd8a0, emissiveIntensity: 1.4, roughness: 0.2 }), x + s * 0.6, y - 1.05, z, 16); for (let k = 0; k < 4; k++) cyl(g, 0.006, 0.006, 0.24, brass, x + s * 0.6 + Math.cos(k * 1.57) * 0.095, y - 1.05, z + Math.sin(k * 1.57) * 0.095, 4); cyl(g, 0.11, 0.08, 0.05, brass, x + s * 0.6, y - 1.18, z, 16); }
      } else {
        const tf = D.fix === 'tiffany', fm = tf ? M({ color: 0x2a6a3a, emissive: 0xc8a050, emissiveIntensity: 0.35, roughness: 0.3 }) : D.fix === 'iron' ? iron : M({ color: 0x1c1c1e, metalness: 0.5, roughness: 0.35 });
        if (tf) for (let i = -1; i <= 1; i++) { const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.28, 0.2, 6, 1, true), M({ color: 0x8a3a1a, emissive: 0xffa040, emissiveIntensity: 0.9, side: THREE.DoubleSide, roughness: 0.3 })); sh.position.set(x + i * 0.62, y - 0.32, z); g.add(sh); sph(g, 0.05, glow(0xffd8a0, 3), x + i * 0.62, y - 0.38, z, 8); box(g, 1.4, 0.03, 0.03, brass, x, y - 0.18, z); }
        else { rbox(g, 1.9, 0.1, 0.5, 0.03, fm, x, y - 0.55, z); plane(g, 1.78, 0.4, glow(0xfff2dc, 1.5), x, y - 0.605, z, 0, P2); }
        for (const s of [-1, 1]) cyl(g, 0.005, 0.005, 0.5, tf ? brass : fm, x + s * 0.7, y - 0.27, z, 4);
      }
    };
    D.tables.forEach(([x, z, ry, y]) => { pokerTable(g, x, z, { felt, rail: D.rail, seats: 9, rx: 1.4, rz: 0.8, full: 0.85, lamp: false, ceil: H - 0.5, ry, y: y || 0 }); fixture(x, z, y); });
    pokerTable(g, D.mine[0], D.mine[1], { mine: true, felt, rail: D.rail, seats: 9, rx: 1.4, rz: 0.8, lamp: false, ceil: H - 0.5 });
    fixture(D.mine[0], D.mine[1]);
    for (let i = 0; i < Math.round(D.w / 3); i++) for (let j = 0; j < Math.round(D.d / 4); j++) { const d = new THREE.Mesh(new THREE.CircleGeometry(0.08, 16), glow(0xfff4e0, 2.2)); d.rotation.x = P2; d.position.set(-W2 + 1.5 + i * 3, H - 0.005, -0.6 - j * 3.6); g.add(d); }
    // the back wall: the name, the window where there's a view, the TVs and the clock
    const clockTV = (x, y, z, w, ry) => { const c = canvas(512, 288, (cx, cw, ch) => { const g2 = cx.createLinearGradient(0, 0, 0, ch); g2.addColorStop(0, '#0a1a3a'); g2.addColorStop(1, '#020610'); cx.fillStyle = g2; cx.fillRect(0, 0, cw, ch); cx.textAlign = 'center'; cx.fillStyle = '#8ad8ff'; cx.font = '700 26px sans-serif'; cx.fillText('LEVEL 6', cw / 2, 44); cx.fillStyle = '#fff'; cx.font = '700 92px sans-serif'; cx.fillText('11:06', cw / 2, 146); cx.fillStyle = '#ffd84d'; cx.font = '700 30px sans-serif'; cx.fillText('150 / 300   ante 300', cw / 2, 200); cx.fillStyle = '#c8d0e0'; cx.font = '600 20px sans-serif'; cx.fillText('PLAYERS 29 OF 36    BREAK IN 0:51', cw / 2, 250); }); const t = new THREE.Group(); t.position.set(x, y, z); t.rotation.y = ry || 0; g.add(t); rbox(t, w + 0.05, w * 9 / 16 + 0.05, 0.06, 0.01, M({ color: 0x0a0a0c, roughness: 0.25 }), 0, 0, 0); plane(t, w, w * 9 / 16, new THREE.MeshBasicMaterial({ map: tex(c) }), 0, 0, 0.032); };
    const yS = H - 0.4;
    if (D.view) {
      const vw = Math.min(D.w - 4, 9); windowOn(g, D.view, 0, 1.5, B + 0.02, vw, 1.7, 0, D.trim); sign(g, D.name, D.bg, D.fg, 0, yS, B + 0.04, 3.8, 0.38);
      tvSet(g, -vw / 2 - 1.3, 1.9, B + 0.05, 1.5, 0, 'football'); clockTV(vw / 2 + 1.3, 1.9, B + 0.05, 1.5);
    } else {
      sign(g, D.name, D.bg, D.fg, 0, yS, B + 0.04, 4.6, 0.6);
      tvSet(g, -2.6, 1.55, B + 0.05, 1.5, 0, T === 'dollar' ? 'horses' : 'football'); tvSet(g, 0, 1.55, B + 0.05, 1.5, 0, T === 'dollar' ? 'horses' : 'baseball'); clockTV(2.6, 1.55, B + 0.05, 1.5);
    }
    // the brush's podium by the door with the waiting list up on the wall, players waiting for a seat; the house rules; the cage
    const pS = D.cam[0][0] < 0 ? -1 : 1, pX = pS < 0 ? Rr : L;   // the door and the brush's podium on the side away from the camera
    podium(g, pX - pS * 1.6, -1.0, -pS * 0.7); tvSet(g, pX, 1.95, -1.6, -pS * P2, 'board');
    if (STAGE === 'busy') for (let i = 0; i < 3; i++) stander(g, pX - pS * (2.4 + i * 0.5), -0.2 + (i % 2) * 0.3, pS * (0.6 + i * 0.3), { lod: 1 });
    const rules = canvas(256, 320, (x, w, h) => { x.fillStyle = '#f4efe2'; x.fillRect(0, 0, w, h); x.fillStyle = '#1a1a1a'; x.textAlign = 'center'; x.font = '800 28px Georgia'; x.fillText('HOUSE RULES', w / 2, 44); x.font = '600 17px Georgia'; ['One player to a hand', 'English only at the table', 'No phones during a hand', 'Cards speak', 'Dealer\'s decision is final', 'Tip your dealer'].forEach((l, i) => x.fillText(l, w / 2, 92 + i * 36)); x.strokeStyle = '#1a1a1a'; x.lineWidth = 4; x.strokeRect(8, 8, w - 16, h - 16); });
    rbox(g, 0.62, 0.76, 0.03, 0.01, M({ color: 0x1a1210 }), pX, 1.6, -3.2, P2); plane(g, 0.55, 0.69, M({ map: tex(rules), roughness: 0.6 }), pX - pS * 0.02, 1.6, -3.2, -pS * P2);
    if (T !== 'dollar') cage(g, L + 0.85, B + 1.6, P2, 2.6, 'CAGE');
    // the structure that makes each club its own: beams and a railed corner, a long soffit, ducts and the bar, posts and
    // a step, slots, booths, a lounge, the half-wall and the race book
    if (T === 'prairie') {
      for (let i = 0; i < 4; i++) box(g, D.w, 0.22, 0.26, M({ map: tex(PAINT.wood('#4a3020', '#3a2416', 8), 4, 1), roughness: 0.8 }), 0, H - 0.12, 0.6 - i * 2.8);
      for (const x of [-5.4, 5.4]) mountedHead(g, x, 2.1, B + 0.05, 0); mountedHead(g, Rr, 2.05, -5.0, -P2);
      // the big game's corner: a knee-wall with a brass rail, a step up
      const kw = M({ map: tex(PAINT.planks('#4a3020', '#3a2416'), 2, 1), roughness: 0.8 });
      box(g, 0.1, 0.95, 4.2, kw, -2.0, 0.475, B + 2.1); box(g, 5.0, 0.95, 0.1, kw, -4.5, 0.475, B + 4.2); box(g, 0.16, 0.05, 4.3, wd, -2.0, 0.97, B + 2.1); box(g, 5.1, 0.05, 0.16, wd, -4.5, 0.97, B + 4.2);
      for (let i = 0; i < 4; i++) { cyl(g, 0.02, 0.02, 0.5, brass, -2.0, 1.22, B + 0.4 + i * 1.2, 8); cyl(g, 0.02, 0.02, 0.5, brass, -6.6 + i * 1.5, 1.22, B + 4.2, 8); } box(g, 0.04, 0.04, 4.2, brass, -2.0, 1.47, B + 2.1); box(g, 5.0, 0.04, 0.04, brass, -4.5, 1.47, B + 4.2);
      for (let i = 0; i < 3; i++) photo(g, Rr, 1.55, -1.2 - i * 1.6, 0.9, 0.6, -P2, 'land', 0x3a2414); wagonWheel(g, Rr - 0.05, 1.2, B + 1.0, -P2);
      const rose = canvas(128, 128, (x, w, h) => { x.fillStyle = D.bg; x.fillRect(0, 0, w, h); x.strokeStyle = D.fg; x.lineWidth = 4; x.beginPath(); x.arc(64, 64, 58, 0, 7); x.stroke(); x.fillStyle = '#c02a3a'; for (let k = 0; k < 9; k++) { x.beginPath(); x.ellipse(64 + Math.cos(k * 0.7) * k * 2.4, 56 + Math.sin(k * 0.7) * k * 2.4, 14 - k * 0.6, 9, k * 0.7, 0, 7); x.fill(); } x.fillStyle = '#3a7a3a'; x.fillRect(61, 80, 6, 36); x.beginPath(); x.ellipse(52, 96, 12, 5, -0.5, 0, 7); x.fill(); });
      for (const s of [-1, 1]) { const rc = cyl(g, 0.3, 0.3, 0.04, M({ map: tex(rose), roughness: 0.5 }), s * 2.75, yS, B + 0.05, 32); rc.rotation.x = P2; }
    } else if (T === 'river') {
      // a soffit the length of the glass with downlights, the window the whole wall, plants, the TVs on the end wall
      windowOn(g, D.view, 0, 1.5, B + 0.03, D.w - 2, 1.7, 0, 'none'); for (let i = 1; i < 6; i++) box(g, 0.08, 1.7, 0.08, M({ color: 0x2a2a2a }), -W2 + 1 + i * (D.w - 2) / 6, 1.5, B + 0.06);
      box(g, D.w, 0.4, 1.4, M({ color: 0xe8e8e2, roughness: 0.9 }), 0, H - 0.2, B + 0.7); for (let i = 0; i < 7; i++) { const d = new THREE.Mesh(new THREE.CircleGeometry(0.09, 16), glow(0xfff4e0, 2.4)); d.rotation.x = P2; d.position.set(-W2 + 1.4 + i * (D.w - 2.8) / 6, H - 0.405, B + 0.7); g.add(d); light(g, 0xfff4e0, 0.6, -W2 + 1.4 + i * (D.w - 2.8) / 6, H - 0.7, B + 0.9, 4); }
      for (let i = 0; i < 3; i++) tvSet(g, L, 1.9, -2.4 - i * 2.0, 1.3, P2, ['baseball', 'football', 'golf'][i]);
      plant(g, L + 0.8, B + 0.9, 1.1); plant(g, Rr - 0.8, B + 0.9, 1.1); plant(g, Rr - 0.8, 0.6, 1.0);
    } else if (T === 'club') {
      for (const z of [-2.0, -6.0, -9.5]) { const dc = cyl(g, 0.24, 0.24, D.w, M({ color: 0x3a3a3c, metalness: 0.7, roughness: 0.4 }), 0, H - 0.3, z, 16); dc.rotation.z = P2; } for (const x of [-4.5, 4.5]) { const dc = cyl(g, 0.18, 0.18, D.d, M({ color: 0x3a3a3c, metalness: 0.7, roughness: 0.4 }), x, H - 0.6, B / 2 + 1, 16); dc.rotation.x = P2; }
      bar(g, Rr - 0.7, -2.0, 5.0, { wood: '#2a1a10', crowd: 0.6, stool: 0x1a1a1a, ry: -P2 });   // the bar along the right, close
      for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) tvSet(g, Rr, 1.6 + j * 0.78, -5.6 - i * 1.4, 1.2, -P2, ['football', 'baseball', 'football', 'golf', 'baseball', 'football'][i * 2 + j]);
      for (let i = 0; i < 7; i++) { const c = ['#1a3a8a', '#c81a1a', '#1a6a3a', '#e8a020', '#5a1a7a', '#1a1a1a', '#c86a1a'][i]; const pn = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(0, 0.14), new THREE.Vector2(0.75, 0), new THREE.Vector2(0, -0.14)])), M({ color: c, side: THREE.DoubleSide, roughness: 0.8 })); pn.position.set(-6.4 + i * 0.95, yS + 0.2, B + 0.03); pn.rotation.z = -0.12; g.add(pn); }
      neon(g, 'Cold Beer', '#ff3a3a', -4.8, 1.7, B + 0.05, 72); neon(g, 'Game Day', '#3ad8ff', Rr - 0.06, 2.6, -3.4, 64, -P2);
    } else if (T === 'harbor') {
      // posts, the step up at the back, a ship's wheel, a life ring, charts, the rope rail, the model ship
      const post = M({ color: 0xf4f0e6, roughness: 0.5 }); for (const x of [-3.2, 3.2]) for (const z of [-3.2, -6.4]) { box(g, 0.26, H, 0.26, post, x, H / 2, z); box(g, 0.4, 0.12, 0.4, M({ color: 0x1e3a5a }), x, 0.06, z); }
      rbox(g, D.w - 0.4, 0.3, 4.2, 0.02, M({ map: tex(PAINT.wood('#9a7a52', '#86683f', 20), 6, 2), roughness: 0.5 }), 0, 0.15, B + 2.1); box(g, D.w - 0.4, 0.04, 0.04, brass, 0, 0.31, B + 4.2);
      const wh = new THREE.Group(); wh.position.set(Rr - 0.1, 1.8, -3.0); wh.rotation.y = -P2; g.add(wh); const wm = M({ color: 0x6a3a1a, roughness: 0.35 });
      const wr = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.04, 8, 40), wm); wh.add(wr); cyl(wh, 0.1, 0.1, 0.1, brass, 0, 0, 0, 16).rotation.x = P2;
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; const sp = cyl(wh, 0.022, 0.022, 0.62, wm, Math.cos(a) * 0.31, Math.sin(a) * 0.31, 0, 8); sp.rotation.z = a - P2; }
      const lr = new THREE.Group(); lr.position.set(Rr - 0.08, 1.8, -6.0); lr.rotation.y = -P2; g.add(lr); for (let k = 0; k < 8; k++) { const sg = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.08, 10, 12, Math.PI / 4), M({ color: k % 2 ? 0xffffff : 0xd8281e, roughness: 0.6 })); sg.rotation.z = k * Math.PI / 4; lr.add(sg); }
      frameArt(g, L, 1.75, -4.6, 1.0, 0.7, P2, ['#c8d8e0', '#1e3a5a', '#e8dcc0', '#5a7a8a']); frameArt(g, L, 1.75, -7.4, 1.0, 0.7, P2, ['#c8d8e0', '#1e3a5a', '#e8dcc0']);
      const sh = new THREE.Group(); sh.position.set(L + 0.5, 0, -9.2); g.add(sh); rbox(sh, 0.5, 0.9, 0.5, 0.02, wd, 0, 0.45, 0); rbox(sh, 0.42, 0.1, 0.12, 0.04, M({ color: 0x1a2a4a }), 0, 0.98, 0); for (let i = -1; i <= 1; i++) cyl(sh, 0.006, 0.006, 0.36, wd, i * 0.12, 1.2, 0, 4); for (let i = -1; i <= 1; i++) plane(sh, 0.1, 0.14, M({ color: 0xf4efe2, side: THREE.DoubleSide }), i * 0.12, 1.22, 0.01);
    } else if (T === 'west') {
      slots(g, Rr - 0.65, -1.6, 6, -P2, { colors: [0xffd84d, 0xff3a3a, 0x3ad8ff] });   // the bank of slots down the right, in the way of the shot
      const hs = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.04, 8, 40, Math.PI * 1.5), glow(0xffd84d, 3)); hs.position.set(0, 1.62, B + 0.06); hs.rotation.z = Math.PI / 4 + Math.PI; g.add(hs); light(g, 0xffd84d, 1.2, 0, 1.6, B + 0.5, 3);
      for (let i = 0; i < 4; i++) { const hx = -4.6 + i * 0.6; cyl(g, 0.012, 0.012, 0.12, wd, hx, 2.05, B + 0.08, 6).rotation.x = P2; const hc = pick([0x3a2414, 0xc8a878, 0x1a1a1a, 0x6a4a2a]); const br = cyl(g, 0.22, 0.22, 0.02, M({ color: hc, roughness: 0.9 }), hx, 1.9, B + 0.14, 20); br.rotation.x = P2 - 0.25; const cr = cyl(g, 0.1, 0.12, 0.14, M({ color: hc, roughness: 0.9 }), hx, 1.93, B + 0.2, 16); cr.rotation.x = P2 - 0.25; }
      const sk = new THREE.Group(); sk.position.set(4.2, 1.85, B + 0.08); g.add(sk); const bone = M({ color: 0xe8e0cc, roughness: 0.8 }); rbox(sk, 0.2, 0.32, 0.12, 0.05, bone, 0, 0, 0); for (const s of [-1, 1]) seg(sk, [s * 0.08, 0.1, 0], [s * 0.7, 0.24, 0.05], 0.045, 0.012, bone);
      for (let i = 0; i < 3; i++) box(g, D.w, 0.2, 0.2, M({ map: tex(PAINT.wood('#4a3020', '#3a2416', 8), 4, 1), roughness: 0.8 }), 0, H - 0.1, -0.5 - i * 3.0);
      for (const z of [-2.5, -6.5]) sconce(g, L, 2.1, z, P2, 0xffc070);
    } else if (T === 'nugget') {
      for (let i = 0; i < 4; i++) booth(g, L + 0.95, -2.2 - i * 1.9, P2, 0x7a1a14, 0x3a1e0e);   // booths down the left wall
      frameArt(g, 4.4, 1.75, B + 0.04, 1.8, 1.1, 0, ['#2a1a0a', '#c89a40', '#6a4a2a', '#e8c878', '#3a2a1a']); frameArt(g, -4.6, 1.75, B + 0.04, 1.2, 0.9, 0, ['#3a2a1a', '#8a6a3a', '#d8b878']);
      for (let i = 0; i < 4; i++) { const c = canvas(96, 72, (x, w, h) => { const g2 = x.createLinearGradient(0, 0, 0, h); g2.addColorStop(0, '#d8c8a0'); g2.addColorStop(1, '#8a7050'); x.fillStyle = g2; x.fillRect(0, 0, w, h); x.fillStyle = '#4a3820'; for (let k = 0; k < 5; k++) x.fillRect(8 + k * 17, h * 0.45 - (k % 2) * 6, 8, h * 0.4); x.fillRect(0, h * 0.82, w, h * 0.18); x.fillStyle = '#6a5434'; x.beginPath(); x.moveTo(0, h * 0.5); x.lineTo(w * 0.4, h * 0.15); x.lineTo(w, h * 0.45); x.lineTo(w, h * 0.5); x.fill(); }); rbox(g, 0.05, 0.56, 0.72, 0.01, M({ color: 0x2a1408 }), Rr, 1.75, -1.6 - i * 1.6); plane(g, 0.6, 0.45, M({ map: tex(c), roughness: 0.7 }), Rr - 0.03, 1.75, -1.6 - i * 1.6, -P2); }
      const tool = (x, y, z, rz, pick2) => { const t = new THREE.Group(); t.position.set(x, y, z); t.rotation.z = rz; g.add(t); box(t, 0.04, 1.0, 0.04, M({ color: 0x8a6a3a, roughness: 0.8 }), 0, 0, 0); if (pick2) box(t, 0.5, 0.05, 0.04, iron, 0, 0.5, 0); else box(t, 0.2, 0.26, 0.02, iron, 0, -0.55, 0); };
      tool(-3.0, 1.8, B + 0.06, 0.5, true); tool(-3.0, 1.8, B + 0.08, -0.5, false);
      for (let i = 0; i < 10; i++) sph(g, 0.07 + rnd() * 0.04, M({ color: pick([0xd8b040, 0x8a7a6a, 0xc8a030]), metalness: 0.6, roughness: 0.4 }), Rr - 1.0 + (rnd() - 0.5) * 0.5, 0.62, B + 1.2 + (rnd() - 0.5) * 0.3, 6); const cart = new THREE.Group(); cart.position.set(Rr - 1.0, 0, B + 1.2); cart.rotation.y = -0.6; g.add(cart); const cm = M({ color: 0x4a3a2a, metalness: 0.5, roughness: 0.6 }); const bin = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.45, 0.5, 4, 1), cm); bin.rotation.y = Math.PI / 4; bin.position.y = 0.35; bin.scale.set(1, 1, 0.7); cart.add(bin);
      for (const z of [-2.4, -5.4]) sconce(g, Rr, 2.0, z, -P2, 0xffc070); for (const x of [-4.5, 4.5]) sconce(g, x, 2.0, B + 0.02, 0, 0xffc070);
    } else if (T === 'lake') {
      windowOn(g, D.view, 0, 1.7, B + 0.03, D.w - 3, 2.6, 0, 'none'); for (let i = 1; i < 5; i++) box(g, 0.1, 2.6, 0.1, M({ color: 0x5a4030 }), -W2 + 1.5 + i * (D.w - 3) / 5, 1.7, B + 0.06);
      slots(g, Rr - 0.65, -5.0, 6, -P2, { colors: [0xff8a3a, 0x3ad8ff, 0xffd84d] });
      sofa(g, 5.6, B + 1.2, 0, 0x4a3a5a, 2.2); sofa(g, 7.0, B + 2.6, -P2, 0x4a3a5a, 1.6); rbox(g, 0.9, 0.05, 0.5, 0.02, wd, 5.8, 0.42, B + 2.3); cyl(g, 0.02, 0.02, 0.4, wd, 5.8, 0.2, B + 2.3, 6);
      for (let i = 0; i < 2; i++) { const pd = new THREE.Group(); pd.position.set(L + 0.08, 1.9, -5.4 + i * 0.4); pd.rotation.z = (i ? -1 : 1) * 0.35; pd.rotation.y = P2; g.add(pd); box(pd, 0.04, 1.1, 0.03, M({ color: 0xc89a5a, roughness: 0.5 }), 0, 0.25, 0); rbox(pd, 0.18, 0.5, 0.02, 0.02, M({ color: i ? 0x2a5a8a : 0xb8302a, roughness: 0.5 }), 0, -0.45, 0); }
      plant(g, L + 0.8, B + 0.9, 1.1); plant(g, L + 0.8, 0.8, 1.0);
    } else if (T === 'dollar') {
      // the half-wall: the race book beyond it, the betting windows and the tote, screens of racing
      const hw = M({ map: tex(PAINT.panel('#2a2e34', '#33383f'), 4, 1), roughness: 0.6 });
      box(g, 0.14, 1.15, D.d - 3.6, hw, 2.6, 0.575, B / 2 - 0.8); box(g, 0.3, 0.06, D.d - 3.6, M({ color: 0xc8ccd4, metalness: 0.8, roughness: 0.3 }), 2.6, 1.18, B / 2 - 0.8);
      for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) tvSet(g, Rr, 1.5 + j * 0.72, -2.6 - i * 1.6, 1.2, -P2, j ? 'horses' : (i % 2 ? 'horses' : 'clock'));
      const tote = canvas(512, 160, (x, w, h) => { x.fillStyle = '#05070a'; x.fillRect(0, 0, w, h); x.font = '700 22px monospace'; x.fillStyle = '#ffd84d'; x.fillText('RACE 7   POST 9:42', 14, 30); for (let k = 0; k < 8; k++) { x.fillStyle = ['#c81a1a', '#f4f4f4', '#1a4aa8', '#e8d020', '#1a8a3a', '#111', '#e86a1a', '#e84aa8'][k]; x.fillRect(14 + k * 62, 50, 26, 26); x.fillStyle = '#fff'; x.fillText(String(k + 1), 20 + k * 62, 72); x.fillStyle = '#8ad8ff'; x.fillText(pick(['5-2', '3-1', '8-1', '12-1', '9-5', '20-1', '6-1', '4-1']), 10 + k * 62, 110); } });
      plane(g, 3.2, 1.0, new THREE.MeshBasicMaterial({ map: tex(tote) }), 5.2, 2.35, B + 0.05);
      cage(g, 5.6, B + 1.0, 0, 3.6, 'RACE BOOK'); cage(g, L + 0.85, B + 2.0, P2, 2.6, 'CAGE');
      for (let i = 0; i < 6; i++) { const sx = 4.0 + (i % 3) * 1.4, sz = -4.0 - Math.floor(i / 3) * 2.2; rbox(g, 0.8, 0.05, 0.6, 0.02, M({ color: 0x1a1a1e }), sx, 0.72, sz); cyl(g, 0.04, 0.06, 0.7, iron, sx, 0.36, sz, 10); for (const s of [-1, 1]) { chair(g, sx + s * 0.55, sz, -s * P2, 0x2a2a30); if (rnd() < occ() * 0.7) person(g, sx + s * 0.5, sz, -s * P2, { lod: 1 }); } }
      const coin = canvas(256, 256, (x, w, h) => { const g2 = x.createRadialGradient(100, 90, 10, 128, 128, 128); g2.addColorStop(0, '#f4f6fa'); g2.addColorStop(1, '#8a909a'); x.fillStyle = g2; x.beginPath(); x.arc(128, 128, 126, 0, 7); x.fill(); x.strokeStyle = '#6a707a'; x.lineWidth = 6; x.beginPath(); x.arc(128, 128, 110, 0, 7); x.stroke(); x.fillStyle = '#6a707a'; x.font = '900 34px Georgia'; x.textAlign = 'center'; x.fillText('ONE DOLLAR', 128, 214); x.font = '900 60px Georgia'; x.fillText('$1', 128, 140); });
      for (const s of [-1, 1]) { const cn = cyl(g, 0.3, 0.3, 0.04, M({ map: tex(coin), metalness: 0.85, roughness: 0.3, envMapIntensity: 1.3 }), s * 2.75, yS, B + 0.05, 40); cn.rotation.x = P2; }
      neon(g, 'Open 24 Hours', '#ff3a3a', -4.9, 1.65, B + 0.05, 60);
    }
    return { exposure: D.expo, cam: D.cam };
  },
  // a casino's poker room: the tables inside a brass rail, the casino floor beyond it (the table-games pit, banks of
  // slots, the cage), a window or a feature wall at the back, and each house's own style of ceiling, carpet and light
  casino(g, o) {
    const T = o.theme || 'gulf';
    const terrazzo = (a) => canvas(256, 256, (x, w, h) => { x.fillStyle = a; x.fillRect(0, 0, w, h); for (let i = 0; i < 2600; i++) { x.fillStyle = pick(['#c8b8a0', '#8a7a6a', '#e8d8c0', '#d88a5a', '#5a8a8a', '#f4f0e8']); x.beginPath(); x.ellipse(rnd() * w, rnd() * h, 1 + rnd() * 3, 1 + rnd() * 2, rnd() * 3, 0, 7); x.fill(); } x.fillStyle = '#b8a888'; x.fillRect(0, 0, w, 3); x.fillRect(0, 0, 3, h); });
    const breeze = (a) => canvas(256, 256, (x, w, h) => { x.fillStyle = a; x.fillRect(0, 0, w, h); x.fillStyle = 'rgba(0,0,0,.28)'; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { const cx = i * 64 + 32, cy = j * 64 + 32; x.beginPath(); x.arc(cx, cy, 22, 0, 7); x.fill(); } x.fillStyle = a; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { const cx = i * 64 + 32, cy = j * 64 + 32; x.beginPath(); for (let k = 0; k < 4; k++) { const an = k * Math.PI / 2 + Math.PI / 4; x.lineTo(cx + Math.cos(an) * 16, cy + Math.sin(an) * 16); x.lineTo(cx + Math.cos(an + Math.PI / 4) * 6, cy + Math.sin(an + Math.PI / 4) * 6); } x.fill(); } x.strokeStyle = 'rgba(0,0,0,.15)'; x.lineWidth = 2; for (let i = 0; i <= 4; i++) { x.beginPath(); x.moveTo(i * 64, 0); x.lineTo(i * 64, h); x.moveTo(0, i * 64); x.lineTo(w, i * 64); x.stroke(); } });
    const slats = (a, b) => canvas(256, 64, (x, w, h) => { x.fillStyle = b; x.fillRect(0, 0, w, h); for (let i = 0; i < w; i += 16) { const c = new THREE.Color(a).offsetHSL(0, 0, (rnd() - 0.5) * 0.06); x.fillStyle = '#' + c.getHexString(); x.fillRect(i + 2, 0, 11, h); } });
    const D = {
      gulf: { floor: PAINT.carpet('#0e4556', '#1a6a7a', '#e8d8a8', 'wave'), wall: PAINT.panel('#e8e0cc', '#f2ecdc'), ceil: PAINT.coffer('#f2ecdc', '#d8ccb0'), felt: 0x155e75, view: VIEW.ocean({ sky1: '#2a3a6a', yachts: true }), col: 'white', fix: 'fans', sign: ['GULF COAST POKER', '#0e4556', '#f4ead0'], palms: true, chand: 0xfff0d8 },
      reno: { floor: PAINT.carpet('#3a2412', '#6a3a1a', '#d8a040', 'navajo'), wall: PAINT.wood('#6a4424', '#54361c', 30), ceil: PAINT.wood('#4a3020', '#3a2416', 40), felt: 0x6b4a1f, col: 'wood', fix: 'wheels', beams: true, sign: ['POKER', '#1a0e06', '#e8e8f0'], neon: ['Silver Spur', '#d8e8ff'], slotsBack: true },
      boardwalk: { floor: PAINT.carpet('#2a1d5a', '#4a2a8a', '#e8b030', 'deco'), wall: PAINT.damask('#3a1a3a', '#4a2448'), ceil: PAINT.coffer('#2a1a2a', '#1a0e1a'), felt: 0x3b2a7a, view: VIEW.ocean({ pier: true }), col: 'brass', fix: 'chand', marquee: 'BOARDWALK', chand: 0xffe0b0 },
      chicago: { floor: PAINT.carpet('#143a44', '#1d4f5c', '#c8a050', 'deco'), wall: PAINT.panel('#2a1e18', '#34261e'), ceil: PAINT.coffer('#3a2a20', '#241812'), felt: 0x1d4f5c, view: VIEW.city({ water: true, tall: 0.8, landmark: LANDMARK.tower }), col: 'marble', fix: 'deco', sign: ['POKER ROOM', '#0e0c0a', '#d8b060'] },
      tahoe: { floor: PAINT.carpet('#14303a', '#24485e', '#d8c8a0', 'diamond'), wall: PAINT.logs('#7a5030', '#5a3a20'), ceil: PAINT.wood('#6a4628', '#5a3a20', 40), felt: 0x24485e, view: VIEW.mountains({ lake: true, pines: true, sky0: '#060c22', sky1: '#2a3a6a' }), col: 'stone', fix: 'antler', trusses: true, sign: ['HIGH SIERRA POKER', '#1a1410', '#e8d8b0'] },
      pinewood: { floor: PAINT.carpet('#1f3a24', '#2e5232', '#c8a050', 'scroll'), wall: PAINT.wood('#7a5a3a', '#6a4a2e', 24), ceil: PAINT.wood('#5a3e24', '#4a3220', 40), felt: 0x2a5a3a, view: VIEW.mountains({ pines: true, sky0: '#081020', sky1: '#24304a' }), col: 'tree', fix: 'lantern', trusses: true, sign: ['POKER ROOM', '#1a2a1a', '#e8d8a8'], pines: true },
      twincities: { floor: PAINT.carpet('#1a2a3a', '#24384a', '#6a8aa8', 'check'), wall: slats('#c8a070', '#3a2a1a'), ceil: PAINT.dropceil(), felt: 0x24485e, view: VIEW.city({ water: true, tall: 0.55, sky2: '#6a7aa0', waterTop: '#d8e4f0' }), col: 'steel', fix: 'linear', sign: ['POKER', '#14202a', '#e8eef4'] },
      palmsprings: { floor: terrazzo('#e8dcc8'), wall: breeze('#f0e6d4'), ceil: PAINT.plain('#f4ecdc'), felt: 0x2a6a6a, view: VIEW.desert({ pool: true }), col: 'white', fix: 'starburst', sign: ['POKER', '#2a6a6a', '#ffd8a0'], palms: true },
      miami: { floor: PAINT.carpet('#1a5a6a', '#ff8ab0', '#f4f0e8', 'deco'), wall: PAINT.stripe('#f4e4dc', '#f8d8d0'), ceil: PAINT.plain('#f8f0ea'), felt: 0x1a6a8a, view: VIEW.ocean({ palms: true, sky1: '#6a2a8a', sky2: '#ff6ab0' }), col: 'white', fix: 'cove', neon: ['Ocean Drive', '#ff6ab0'], palms: true, slotColors: [0xff6ab0, 0x3ad8ff, 0xffd84d] },
      seattle: { floor: PAINT.carpet('#14303a', '#1d4050', '#8ab8c8', 'diamond'), wall: slats('#8a6040', '#2a1a10'), ceil: PAINT.wood('#4a3424', '#3a2818', 30), felt: 0x1d4f5c, view: VIEW.city({ landmark: LANDMARK.needle, water: true, tall: 0.55, sky2: '#4a5a8a' }), col: 'steel', fix: 'linear', trusses: true, sign: ['POKER ROOM', '#14202a', '#e8eef4'] },
      seoul: { floor: PAINT.carpet('#1a0a2a', '#3a1a5a', '#3ad8ff', 'diamond'), wall: PAINT.panel('#14121a', '#1c1a24'), ceil: PAINT.plain('#0a0a10'), felt: 0x3a1a5a, view: VIEW.city({ landmark: LANDMARK.neon, tall: 0.75, lights: ['#ff3a8a', '#3ad8ff', '#ffffff', '#ffd84d'] }), col: 'gold', fix: 'led', neon: ['SEOUL CUP', '#3ad8ff'], lattice: true }
    }[T];
    // each house's own shape of room, how its tables sit, where the rail to the casino floor runs, and the shot
    const LAY = {
      gulf: { w: 18, d: 14, h: 4.2, tables: [[-4.6, -4.3, 0], [0.3, -4.6, 0.3], [5.0, -4.2, 0]], mine: [2.2, -1.9], rail: -6.2, cam: [[-6.2, 1.5, 1.4], [1.5, 1.1, -6.0]] },
      reno: { w: 16, d: 12, h: 3.6, tables: [[-4.4, -4.6, 0.5], [0.6, -5.2, 0.5], [5.0, -4.4, 0.5]], mine: [1.8, -1.9], rail: -7.0, cam: [[5.6, 1.45, 1.5], [-2.2, 1.05, -6.0]] },
      boardwalk: { w: 20, d: 16, h: 4.8, tables: [[-5.2, -4.3, 0], [0, -4.3, 0], [5.2, -4.3, 0], [-2.6, -7.4, 0], [2.6, -7.4, 0]], mine: [2.2, -1.9], rail: -9.6, cam: [[0.4, 2.5, 1.8], [0, 1.0, -8.5]] },
      chicago: { w: 16, d: 16, h: 4.0, tables: [[-4.5, -4.6, 0], [4.5, -4.6, 0], [-4.5, -8.4, 0], [4.5, -8.4, 0]], mine: [0, -1.9], rail: -11.0, cam: [[-5.6, 1.6, 1.2], [2.0, 1.1, -7.5]] },
      tahoe: { w: 18, d: 12, h: 5.0, tables: [[-5.0, -4.4, 0.3], [0, -5.4, 0], [5.0, -4.4, -0.3]], mine: [2.0, -1.9], rail: -7.4, cam: [[6.2, 1.7, 1.6], [-2.5, 1.4, -5.5]] },
      pinewood: { w: 18, d: 14, h: 4.4, tables: [[-5.5, -4.5, 0.2], [-0.5, -4.8, 0], [4.6, -4.4, -0.2]], mine: [2.2, -1.9], rail: -7.0, cam: [[-6.6, 1.5, 1.0], [1.2, 1.1, -6.0]] },
      twincities: { w: 16, d: 14, h: 3.4, tables: [[-4.5, -4.2, 0], [0.2, -6.0, 0], [4.8, -4.2, 0]], mine: [1.6, -1.9], rail: -8.0, cam: [[5.0, 1.4, 1.6], [-2.0, 1.1, -7.0]] },
      palmsprings: { w: 18, d: 12, h: 3.4, tables: [[-5.0, -4.6, Math.PI / 2], [-1.0, -5.6, Math.PI / 2], [4.6, -4.6, Math.PI / 2]], mine: [2.2, -1.9], rail: -7.4, cam: [[-3.2, 1.5, 1.7], [1.0, 1.1, -6.5]] },
      miami: { w: 18, d: 14, h: 4.0, tables: [[-4.6, -4.3, 0.2], [0, -5.2, 0], [4.6, -4.3, -0.2]], mine: [2.2, -1.9], rail: -6.8, cam: [[6.6, 1.5, 1.3], [-1.5, 1.1, -6.5]] },
      seattle: { w: 16, d: 14, h: 4.2, tables: [[-4.4, -4.8, 0.3], [1.0, -6.4, 0], [5.0, -4.4, -0.3]], mine: [1.6, -2.0], rail: -8.2, cam: [[-5.8, 1.6, 1.4], [1.5, 1.1, -6.5]] },
      seoul: { w: 18, d: 14, h: 4.0, tables: [[-5.0, -4.4, 0], [0, -4.4, 0], [5.0, -4.4, 0]], mine: [2.2, -1.9], rail: -6.4, cam: [[0, 1.35, 2.0], [0, 1.2, -7.0]] }
    }[T], W2 = LAY.w / 2, RL = LAY.rail, PI2 = Math.PI / 2;
    const r = room(g, { w: LAY.w, d: LAY.d, h: LAY.h, floor: D.floor, wall: D.wall, ceil: D.ceil, trim: 0x1a120c, cornice: D.col === 'white' ? 0xf4ecdc : 0x2a1a10, fillI: 0.9, floorRough: T === 'palmsprings' ? 0.3 : 0.75 });
    const B = r.back, felt = o.felt || D.felt;
    const brass = M({ color: 0xc8a050, metalness: 0.9, roughness: 0.25, envMapIntensity: 1.1 });
    // columns down each side
    const colM = { white: M({ color: 0xf4ecdc, roughness: 0.45 }), wood: M({ map: tex(PAINT.wood('#6a4424', '#54361c', 8), 1, 2), roughness: 0.6 }), brass, marble: M({ map: tex(PAINT.marble('#1a1a1c', '#8a8a8a'), 1, 2), roughness: 0.15, envMapIntensity: 1.1 }), stone: M({ map: tex(PAINT.brick('#8a8478', '#5a564e'), 1, 2), roughness: 0.9 }), tree: M({ map: tex(PAINT.wood('#7a5230', '#5a3a1e', 4), 1, 3), roughness: 0.85 }), steel: M({ color: 0x8a8e94, metalness: 0.8, roughness: 0.35 }), gold: M({ color: 0xd8b050, metalness: 0.95, roughness: 0.2, envMapIntensity: 1.3 }) }[D.col];
    for (const s of [-1, 1]) for (const z of [-2.0, RL - 1.3]) { const cx = s * (W2 - 1.4), H = LAY.h; if (D.col === 'tree') { cyl(g, 0.32, 0.42, H, colM, cx, H / 2, z, 14); for (let k = 0; k < 4; k++) seg(g, [cx, H - 0.7, z], [cx + Math.cos(k * 1.57) * 1.0, H - 0.02, z + Math.sin(k * 1.57) * 1.0], 0.12, 0.06, colM); } else column(g, cx, z, H, colM, D.col === 'marble' || D.col === 'gold' ? brass : null); }
    // the back: the window on the city or the view, or a feature wall
    if (D.view) windowOn(g, D.view, 0, Math.min(2.2, LAY.h - 1.8), B + 0.02, Math.min(9, LAY.w - 8), Math.min(3.0, LAY.h - 0.8), 0, D.col === 'white' ? 0xf4ecdc : 0x1a1210);
    if (D.lattice) for (const s of [-1, 1]) { const lt = canvas(128, 256, (x, w, h) => { x.fillStyle = '#d8b050'; x.fillRect(0, 0, w, h); x.fillStyle = '#1a0a14'; for (let i = 0; i < 4; i++) for (let j = 0; j < 8; j++) { x.fillRect(i * 32 + 4, j * 32 + 4, 24, 24); } x.fillStyle = '#d8b050'; for (let i = 0; i < 4; i++) for (let j = 0; j < 8; j++) { x.fillRect(i * 32 + 14, j * 32 + 4, 4, 24); x.fillRect(i * 32 + 4, j * 32 + 14, 24, 4); } }); plane(g, 1.6, 3.4, M({ map: tex(lt), metalness: 0.5, roughness: 0.35, emissive: 0x3a2a10, emissiveIntensity: 0.4 }), s * 5.8, 2.0, B + 0.03); }
    // the ceiling
    if (D.beams || D.trusses) for (let i = 0; i < Math.round(LAY.d / 3); i++) { const z = 0.8 - i * 3.0; box(g, LAY.w, 0.32, 0.3, M({ map: tex(PAINT.wood('#4a3020', '#3a2416', 8), 4, 1), roughness: 0.8 }), 0, LAY.h - 0.2, z); if (D.trusses) for (const s of [-1, 1]) { const kb = box(g, 0.18, 2.6, 0.2, M({ map: tex(PAINT.wood('#4a3020', '#3a2416', 8), 1, 2), roughness: 0.8 }), s * 4.4, LAY.h - 0.7, z); kb.rotation.z = s * 1.1; } }
    if (D.fix === 'led') for (let i = 0; i < Math.round(LAY.d / 1.5); i++) { box(g, LAY.w - 2, 0.03, 0.08, glow(i % 3 === 1 ? 0xff3a8a : 0x3ad8ff, 2.2), 0, LAY.h - 0.03, 1.0 - i * 1.5); }
    if (D.fix === 'cove') { for (const s of [-1, 1]) box(g, 0.04, 0.04, LAY.d, glow(0xff6ab0, 2.2), s * (W2 - 0.4), LAY.h - 0.35, B / 2 + 1); box(g, LAY.w - 1, 0.04, 0.04, glow(0x3ad8ff, 2.2), 0, LAY.h - 0.35, B + 0.5); }
    // the poker room: its rail, its sign, its tables (each with its light)
    const HY = LAY.h - 4.2;   // the fixtures hang from whatever ceiling the house has
    const tableLight = (x, z) => {
      if (D.fix === 'chand') chandelier(g, x, 3.4 + HY, z, 0.7, D.chand);
      else if (D.fix === 'deco') { const fm = M({ color: 0x1a1410, metalness: 0.6, roughness: 0.3 }); rbox(g, 2.0, 0.14, 0.7, 0.03, fm, x, 3.1 + HY, z); plane(g, 1.9, 0.6, glow(0xfff0d0, 1.4), x, 3.03 + HY, z, 0, Math.PI / 2); for (let k = -2; k <= 2; k++) box(g, 0.02, 0.16, 0.72, brass, x + k * 0.4, 3.1 + HY, z); for (const s of [-1, 1]) cyl(g, 0.006, 0.006, 1.0, brass, x + s * 0.8, 3.7 + HY, z, 4); }
      else if (D.fix === 'wheels' || D.fix === 'antler') { const w = new THREE.Group(); w.position.set(x, 3.0 + HY, z); g.add(w); const wm = M({ color: D.fix === 'antler' ? 0xe0d4bc : 0x4a2e16, roughness: 0.7 });
        if (D.fix === 'wheels') { const rim = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.04, 8, 40), wm); rim.rotation.x = Math.PI / 2; w.add(rim); for (let i = 0; i < 6; i++) { const s = box(w, 1.36, 0.035, 0.035, wm, 0, 0, 0); s.rotation.y = i / 6 * Math.PI; } }
        else for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; seg(w, [0, 0, 0], [Math.cos(a) * 0.6, 0.2 + (i % 2) * 0.15, Math.sin(a) * 0.6], 0.035, 0.015, wm); seg(w, [Math.cos(a) * 0.35, 0.1, Math.sin(a) * 0.35], [Math.cos(a + 0.4) * 0.5, 0.4, Math.sin(a + 0.4) * 0.5], 0.02, 0.01, wm); }
        for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; sph(w, 0.045, glow(0xffd8a0, 3), Math.cos(a) * 0.62, -0.05, Math.sin(a) * 0.62, 8); }
        for (let i = 0; i < 3; i++) cyl(w, 0.006, 0.006, 1.2, M({ color: 0x1a1a1a }), Math.cos(i * 2.1) * 0.4, 0.6, Math.sin(i * 2.1) * 0.4, 4); }
      else if (D.fix === 'lantern') { for (const s of [-1, 1]) { cyl(g, 0.006, 0.006, 1.2, M({ color: 0x1a1a1a }), x + s * 0.6, 3.6 + HY, z, 4); const lb = M({ color: 0x1a1a1a, metalness: 0.6, roughness: 0.4 }); box(g, 0.32, 0.04, 0.32, lb, x + s * 0.6, 3.0 + HY, z); box(g, 0.26, 0.38, 0.26, M({ color: 0xfff0d0, emissive: 0xffc070, emissiveIntensity: 1.3, transparent: true, opacity: 0.9 }), x + s * 0.6, 2.8 + HY, z); for (const a of [-1, 1]) for (const b of [-1, 1]) box(g, 0.025, 0.4, 0.025, lb, x + s * 0.6 + a * 0.14, 2.8 + HY, z + b * 0.14); box(g, 0.3, 0.03, 0.3, lb, x + s * 0.6, 2.6 + HY, z); } }
      else if (D.fix === 'starburst') { const sb = new THREE.Group(); sb.position.set(x, 3.2 + HY, z); g.add(sb); sph(sb, 0.08, brass, 0, 0, 0); for (let i = 0; i < 14; i++) { const v = new THREE.Vector3().randomDirection().multiplyScalar(0.6); seg(sb, [0, 0, 0], [v.x, v.y * 0.6, v.z], 0.008, 0.008, brass); sph(sb, 0.035, glow(0xffe0b0, 3), v.x, v.y * 0.6, v.z, 8); } cyl(g, 0.006, 0.006, 1.0, brass, x, 3.7 + HY, z, 4); }
      else if (D.fix === 'fans') { const f = new THREE.Group(); f.position.set(x, 3.7 + HY, z); g.add(f); const wd2 = M({ color: 0x8a6a4a, roughness: 0.5 }); cyl(f, 0.12, 0.1, 0.16, brass, 0, 0, 0, 16); cyl(f, 0.015, 0.015, 0.5, brass, 0, 0.3, 0, 6); for (let i = 0; i < 5; i++) { const bl = box(f, 0.7, 0.012, 0.14, wd2, 0, -0.04, 0); bl.geometry.translate(0.42, 0, 0); bl.rotation.y = i / 5 * Math.PI * 2 + 0.3; } const gl = sph(f, 0.11, M({ color: 0xfff4e0, emissive: 0xffe0b0, emissiveIntensity: 1.2 }), 0, -0.14, 0, 14); gl.scale.y = 0.7; }
      else if (D.fix === 'linear' || D.fix === 'led' || D.fix === 'cove') { const fm = M({ color: 0x1c1c1e, metalness: 0.5, roughness: 0.35 }); rbox(g, 2.2, 0.08, 0.3, 0.02, fm, x, 3.1 + HY, z); plane(g, 2.1, 0.22, glow(0xfff4e8, 1.6), x, 3.055 + HY, z, 0, Math.PI / 2); for (const s of [-1, 1]) cyl(g, 0.005, 0.005, 1.0, fm, x + s * 0.9, 3.65 + HY, z, 4); }
    };
    LAY.tables.forEach(([x, z, ry]) => { pokerTable(g, x, z, { felt, rail: 0x1a0a0a, seats: 9, rx: 1.4, rz: 0.8, full: 0.85, lamp: false, ceil: 3.0, ry }); tableLight(x, z); });
    pokerTable(g, LAY.mine[0], LAY.mine[1], { mine: true, felt, rail: 0x1a0a0a, seats: 9, rx: 1.4, rz: 0.8, lamp: false, ceil: 3.0 }); tableLight(LAY.mine[0], LAY.mine[1]);
    // the rail between the poker room and the casino floor, with a gap to walk through
    for (const [x0, x1] of [[-W2 + 0.4, -1.0], [1.0, W2 - 0.4]]) { box(g, x1 - x0, 0.06, 0.06, brass, (x0 + x1) / 2, 0.95, RL); box(g, x1 - x0, 0.03, 0.03, brass, (x0 + x1) / 2, 0.5, RL); for (let x = x0; x <= x1 + 0.01; x += 1.2) cyl(g, 0.025, 0.025, 0.95, brass, x, 0.47, RL, 8); }
    if (D.sign) hangBanner(g, D.sign[0], 0, LAY.h - 0.6, RL, 3.6, 0.45, D.sign[1], D.sign[2]);
    if (D.neon) neon(g, D.neon[0], D.neon[1], 0, LAY.h - 0.75, B + 0.06, 80);
    if (D.marquee) { const mq = new THREE.Group(); mq.position.set(0, LAY.h - 0.75, RL); g.add(mq); for (const s of [-1, 1]) cyl(mq, 0.005, 0.005, 1.0, M({ color: 0x111111 }), s * 1.6, 0.8, 0, 4); sign(mq, D.marquee, '#1a0a1a', '#ffd84d', 0, 0, 0, 3.8, 0.6); for (let i = 0; i < 22; i++) for (const s of [-1, 1]) sph(mq, 0.03, glow(0xffe0a0, 4), -1.85 + i * 3.7 / 21, s * 0.27, 0.04, 6); for (let i = 0; i < 4; i++) for (const s of [-1, 1]) sph(mq, 0.03, glow(0xffe0a0, 4), s * 1.88, -0.2 + i * 0.13, 0.04, 6); light(mq, 0xffe0a0, 1.5, 0, 0, 0.6, 4); }
    // the casino floor beyond the rail: the pit, the slots, the cage, people walking through
    const pz = RL - 2.4, deep = B < RL - 4.5;   // the pit just past the rail; a deeper floor gets a second row
    tableGame(g, -4.2, pz, 0, 'blackjack', felt); tableGame(g, 0, pz - 0.2, 0, 'roulette', 0x1a5a2a); tableGame(g, 4.2, pz, 0, 'blackjack', felt);
    if (deep) { tableGame(g, -2.2, pz - 2.6, 0.3, 'blackjack', felt); tableGame(g, 2.2, pz - 2.6, -0.3, 'blackjack', felt); }
    const ns = Math.max(3, Math.round((W2 - (D.view ? 5.5 : 1.6)) / 0.78)); slots(g, -W2 + 0.4 + ns * 0.37, B + 1.0, ns, 0, { colors: D.slotColors }); slots(g, W2 - 0.4 - ns * 0.37, B + 1.0, ns, 0, { colors: D.slotColors });
    slots(g, -W2 + 0.6, RL - 3.2, 4, Math.PI / 2, { colors: D.slotColors }); cage(g, W2 - 0.6, RL - 3.4, -Math.PI / 2, 2.6, 'CASHIER');
    if (STAGE !== 'final') for (let i = 0; i < Math.round(6 * occ()); i++) stander(g, -6 + rnd() * 12, RL - 0.6 - rnd() * 0.8, rnd() * 6.28, { lod: 1 });
    // the house's touches
    if (D.palms) { plant(g, -W2 + 0.8, -0.8, 1.5, true); plant(g, W2 - 0.8, -0.8, 1.5, true); plant(g, -W2 + 0.8, B + 0.6, 1.6, true); plant(g, W2 - 0.8, B + 0.6, 1.6, true); }
    if (D.pines) for (const s of [-1, 1]) { const p = new THREE.Group(); p.position.set(s * (W2 - 0.8), 0, RL + 1.0); g.add(p); cyl(p, 0.08, 0.12, 0.6, M({ color: 0x4a3020 }), 0, 0.3, 0, 8); for (let k = 0; k < 4; k++) cyl(p, 0.05, 0.75 - k * 0.15, 0.9, M({ color: 0x1a3a22, roughness: 0.9 }), 0, 0.9 + k * 0.55, 0, 12); }
    if (T === 'reno') { const hat = canvas(256, 128, (x, w, h) => { x.fillStyle = '#d8e8ff'; x.shadowColor = '#d8e8ff'; x.shadowBlur = 16; x.beginPath(); x.ellipse(w / 2, h * 0.75, 110, 20, 0, 0, 7); x.fill(); x.beginPath(); x.moveTo(w / 2 - 50, h * 0.72); x.quadraticCurveTo(w / 2 - 54, h * 0.15, w / 2, h * 0.28); x.quadraticCurveTo(w / 2 + 54, h * 0.15, w / 2 + 50, h * 0.72); x.fill(); }); plane(g, 1.6, 0.8, new THREE.MeshBasicMaterial({ map: tex(hat), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }), 0, LAY.h - 1.1, B + 0.06); for (const s of [-1, 1]) wagonWheel(g, s * 3.2, LAY.h - 1.2, B + 0.08, 0); }
    if (T === 'chicago') for (const s of [-1, 1]) for (const z of [-3.6, -8.6]) sconce(g, s * (W2 - 0.03), 2.4, z, -s * Math.PI / 2, 0xffe0b0);
    if (T === 'boardwalk') for (const s of [-1, 1]) photo(g, s * (W2 - 0.04), 2.2, -4.6, 1.4, 0.9, -s * Math.PI / 2, 'land', 0xc8a050);
    if (T === 'palmsprings') for (const s of [-1, 1]) for (const z of [-3.6, -8.6]) { const sb = new THREE.Group(); sb.position.set(s * (W2 - 0.1), 2.6, z); g.add(sb); sph(sb, 0.06, brass, 0, 0, 0); for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; seg(sb, [0, 0, 0], [0, Math.sin(a) * 0.35, Math.cos(a) * 0.35], 0.006, 0.006, brass); sph(sb, 0.025, glow(0xffe0b0, 3), 0, Math.sin(a) * 0.35, Math.cos(a) * 0.35, 6); } }
    if (T === 'seoul') for (const s of [-1, 1]) for (let i = 0; i < 3; i++) box(g, 0.04, 3.2, 0.04, glow(i === 1 ? 0xff3a8a : 0x3ad8ff, 2.2), s * (W2 - 0.04), 2.0, -2.5 - i * 3.0);
    light(g, 0xffe8c8, 2.6, -4, LAY.h - 0.6, RL - 2.3, 10); light(g, 0xffe8c8, 2.6, 4, LAY.h - 0.6, RL - 2.3, 10);
    return { exposure: 1.1, cam: LAY.cam };
  },
  // the championship ballroom, made over for TV: an LED wall behind the stage with the event's name, the feature table on its
  // lit riser under a lighting truss, bleachers either side, the clock screens hanging, the ballroom's own chandeliers over
  // dozens of tables, sponsor banners down the walls
  ballroom(g, o) {
    const r = room(g, { w: 26, d: 20, h: 7, floor: PAINT.carpet(o.carpet || '#1a1030', o.carpet2 || '#2a1a50', o.carpet3 || '#c8a050', 'scroll'), wall: PAINT.panel('#1a1424', '#221a2e'), ceil: PAINT.coffer('#1a1424', '#120e1a'), trim: 0x0a0a0a, cornice: 0x2a2234, fillI: 0.6 });
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
    for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) chandelier(g, -8 + i * 8, 6.2, -1.5 - j * 4.5, 1.1, 0xffe8c8);
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) hangBanner(g, o.banner || 'MAIN EVENT', s * 12.9, 4.6, -1.5 - i * 4.0, 2.6, 1.4, o.bannerBg || '#7a0f1c', '#ffd84d', -s * Math.PI / 2);
    const mp = o.mine || [2.6, -1.4];
    for (let i = 0; i < 5; i++) for (let j = 0; j < 2; j++) { const x = -10 + i * 5, z = -3.0 - j * 3.4; if (Math.abs(x - mp[0]) < 3 && j === 0) continue; pokerTable(g, x, z, { felt: o.felt2 || 0x1f6b45, rail: 0x0a0a0a, seats: 9, rx: 1.4, rz: 0.8, full: 0.95, lamp: false, ceil: 6 }); }
    pokerTable(g, mp[0], mp[1], { mine: STAGE !== 'final', felt: o.felt2 || 0x1f6b45, rail: 0x0a0a0a, seats: 9, rx: 1.4, rz: 0.8, lamp: false, ceil: 6 });
    light(g, 0xfff0dc, 3, -6, 5, -3, 14); light(g, 0xfff0dc, 3, 6, 5, -3, 14);
    return { exposure: 1.05, fog: [0x0e0a18, 12, 34], cam: o.cam || [[-4.6, 1.6, 1.8], [2.0, 1.2, -9.0]] };
  },
  // a private salon for the big games: tall windows on the city, a few tables far apart, and each city's own grand style
  // (Belle Époque Paris, frescoed Monte Carlo, red-and-gold Macau, a black-glass sky box over the Strip, old French Quarter
  // brick, a London gentlemen's club, white-and-gold Vienna, Marina Bay glass, colonial Nassau, baroque Prague, Maltese stone)
  salon(g, o) {
    const T = o.theme || 'paris', P2 = Math.PI / 2;
    const fresco = (sky, border) => canvas(512, 512, (x, w, h) => { const g2 = x.createRadialGradient(w / 2, h / 2, 20, w / 2, h / 2, w * 0.6); g2.addColorStop(0, '#f4e8c8'); g2.addColorStop(0.5, sky); g2.addColorStop(1, '#3a5a8a'); x.fillStyle = g2; x.fillRect(0, 0, w, h); for (let i = 0; i < 40; i++) { x.fillStyle = 'rgba(255,248,236,' + (0.2 + rnd() * 0.4) + ')'; x.beginPath(); x.ellipse(rnd() * w, rnd() * h, 30 + rnd() * 70, 14 + rnd() * 30, rnd() * 3, 0, 7); x.fill(); } for (let i = 0; i < 6; i++) { x.fillStyle = 'rgba(232,190,150,.7)'; const fx = 80 + rnd() * 350, fy = 80 + rnd() * 350; x.beginPath(); x.ellipse(fx, fy, 14, 30, rnd() * 3, 0, 7); x.fill(); x.fillStyle = 'rgba(200,60,60,.6)'; x.beginPath(); x.ellipse(fx + 10, fy + 14, 22, 12, rnd() * 3, 0, 7); x.fill(); } x.strokeStyle = border; x.lineWidth = 26; x.strokeRect(0, 0, w, h); x.lineWidth = 4; x.strokeRect(30, 30, w - 60, h - 60); noise(x, w, h, 0.06, 4000); });
    const parquet = (a, b) => canvas(256, 256, (x, w, h) => { for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { const c = new THREE.Color((i + j) % 2 ? a : b).offsetHSL(0, 0, (rnd() - 0.5) * 0.05); x.fillStyle = '#' + c.getHexString(); x.fillRect(i * 32, j * 32, 32, 32); x.strokeStyle = 'rgba(0,0,0,.25)'; for (let k = 1; k < 4; k++) { x.beginPath(); if ((i + j) % 2) { x.moveTo(i * 32 + k * 8, j * 32); x.lineTo(i * 32 + k * 8, j * 32 + 32); } else { x.moveTo(i * 32, j * 32 + k * 8); x.lineTo(i * 32 + 32, j * 32 + k * 8); } x.stroke(); } } });
    const D = {
      paris: { floor: parquet('#8a5a30', '#7a4c26'), wall: PAINT.panel('#ece2cc', '#f4ecd8'), ceil: PAINT.coffer('#f4ecd8', '#e0d0b0'), felt: 0x4a1f4f, curtain: 0x7a0f1c, view: VIEW.city({ landmark: LANDMARK.eiffel, towers: 12, tall: 0.25, sky2: '#4a3060' }), view2: VIEW.rooftops({}), mould: 'gold', fix: 'crystal', arch: true, mirrors: true, rug: '#6a1a2a' },
      monaco: { floor: PAINT.marble('#efe8dc', '#b8a890'), wall: PAINT.damask('#e8dcc0', '#f4ead4'), ceil: fresco('#9ac0e0', '#c8a050'), felt: 0x0f3d2e, curtain: 0x1f3a2a, view: VIEW.ocean({ yachts: true, sky2: '#ff8a5a' }), mould: 'gold', fix: 'crystal', cols: 'gold', arch: true, palms: true, rug: '#1f3a2a' },
      macau: { floor: PAINT.carpet('#4f130d', '#6b1a12', '#e8b030', 'scroll'), wall: PAINT.damask('#6b1a12', '#7a2418'), ceil: PAINT.coffer('#7a1a10', '#c8a050'), felt: 0x6b1a12, curtain: 0xc8a050, view: VIEW.city({ landmark: LANDMARK.lisboa, water: true, tall: 0.7, lights: ['#ffd84d', '#ff5a3a', '#ff3ad8', '#ffffff'] }), mould: 'gold', fix: 'lantern', cols: 'red', chand: 0xffd070 },
      vegasvip: { floor: PAINT.carpet('#14161c', '#1e222a', '#c8a050', 'diamond'), wall: PAINT.panel('#14161a', '#1c1e24'), ceil: PAINT.plain('#0c0c10'), felt: 0x22262e, curtain: 0x111111, view: VIEW.city({ landmark: LANDMARK.strip, tall: 0.6, sky2: '#6a2a8a' }), wide: true, fix: 'linear', cove: 0xc8a050, sofa: 0x1a1a1a },
      bayou: { floor: PAINT.wood('#5a3418', '#4a2a12', 22), wall: PAINT.brick('#8a4a3a', '#4a3a34'), ceil: PAINT.wood('#3a2416', '#2e1c10', 30), felt: 0x155e75, curtain: 0x2a4a3a, view: VIEW.rooftops({}), fix: 'fans', gas: true, iron: true, piano: true },
      london: { floor: PAINT.carpet('#1a2a1a', '#24381e', '#c8a050', 'diamond'), wall: PAINT.panel('#2a1a10', '#3a2416'), ceil: PAINT.coffer('#3a2416', '#24160c'), felt: 0x1a3a2a, curtain: 0x2a3a2a, view: VIEW.rooftops({ clock: true }), fix: 'crystal', chand: 0xffc890, books: true, fire: true, portraits: true, sofa: 0x5a1a12 },
      vienna: { floor: parquet('#9a6a3a', '#8a5a30'), wall: PAINT.damask('#f4f0e8', '#e8e0d4'), ceil: PAINT.coffer('#f8f4ec', '#e8d8b0'), felt: 0x4a1f4f, curtain: 0xc8a050, view: VIEW.rooftops({ spires: true }), mould: 'gold', fix: 'crystal', arch: true, mirrors: true, big: true, rug: '#4a1f4f' },
      singapore: { floor: PAINT.marble('#e8e4dc', '#a8a49c'), wall: PAINT.panel('#5a4430', '#6a5038'), ceil: PAINT.wood('#6a5038', '#5a4430', 40), felt: 0x0e4a4a, curtain: 0x14303a, view: VIEW.city({ landmark: LANDMARK.marina, water: true, tall: 0.6 }), wide: true, fix: 'pendants', orchids: true },
      nassau: { floor: PAINT.tile('#efe8d8', '#d8ccb0', 8), wall: PAINT.beadboard('#f4f0e6'), ceil: PAINT.beadboard('#f8f4ec'), felt: 0x1a6a8a, curtain: 0x2a8a9a, view: VIEW.ocean({ palms: true, sky2: '#ff9a5a' }), fix: 'fans', shutters: true, palms: true, rattan: true },
      prague: { floor: parquet('#6a3a1a', '#5a2e14'), wall: PAINT.damask('#3a1424', '#4a1a2e'), ceil: fresco('#c8a888', '#c8a050'), felt: 0x4a1f4f, curtain: 0x6a1a2a, view: VIEW.rooftops({ spires: true }), mould: 'gold', fix: 'candle', arch: true, portraits: true },
      malta: { floor: PAINT.tile('#d8c4a0', '#c0aa84', 8), wall: PAINT.stucco('#e0c898'), ceil: PAINT.stucco('#e8d4a8'), felt: 0x0f3d2e, curtain: 0x2a4a6a, view: VIEW.ocean({ yachts: true, sky1: '#5a3a6a', sky2: '#ffb06a' }), fix: 'ironlamp', arches: true, palms: true }
    }[T];
    // each city's own plan: Paris a wide Belle Époque ballroom, Monte Carlo the grandest and tallest, Macau a long
    // red corridor of tables, the Strip a low wide black sky box along the glass, the Quarter a small brick parlour,
    // London a snug club room, Vienna a tall white hall, Marina Bay wide glass, Nassau a veranda, Prague a tall narrow
    // baroque room, Malta a vaulted stone hall
    const LAY = {
      paris: { w: 16, d: 12, h: 5.2, tables: [[-4.4, -5.4, 0.3], [4.0, -5.8, -0.3]], mine: [0.4, -1.9], cam: [[-5.8, 1.6, 1.4], [1.4, 1.15, -5.6]], expo: 1.0 },
      monaco: { w: 20, d: 14, h: 6.5, tables: [[-6.2, -5.2, 0.4], [0.6, -8.4, 0], [6.4, -5.4, -0.4]], mine: [2.6, -1.9], cam: [[-7.2, 1.3, 1.6], [2.2, 2.0, -7.5]], expo: 1.0 },
      macau: { w: 12, d: 18, h: 4.6, tables: [[-2.9, -6.2, P2], [2.7, -9.6, P2], [-2.7, -13.0, P2]], mine: [2.1, -2.0], cam: [[-3.9, 1.5, 1.6], [0.8, 1.1, -12.0]], expo: 1.05 },
      vegasvip: { w: 22, d: 10, h: 3.6, tables: [[-7.2, -4.8, 0.2], [-1.2, -5.4, 0], [5.8, -4.8, -0.2]], mine: [2.0, -1.9], cam: [[8.8, 1.45, 1.3], [-3.0, 1.1, -5.8]], expo: 1.1 },
      bayou: { w: 10, d: 12, h: 3.8, tables: [[-2.0, -6.4, 0.5]], mine: [1.2, -2.2], cam: [[-3.4, 1.5, 1.6], [1.2, 1.1, -6.6]], expo: 1.05 },
      london: { w: 12, d: 11, h: 4.2, tables: [[-3.0, -5.6, 0.6]], mine: [1.6, -2.2], cam: [[4.4, 1.5, 1.5], [-1.6, 1.1, -5.8]], expo: 1.05 },
      vienna: { w: 18, d: 10, h: 5.6, tables: [[-5.6, -4.4, 0.25], [5.4, -4.6, -0.25]], mine: [0, -1.9], cam: [[7.0, 1.5, 1.5], [-1.6, 1.5, -5.6]], expo: 1.0 },
      singapore: { w: 18, d: 12, h: 4.0, tables: [[-5.4, -5.2, 0.3], [5.4, -6.0, -0.3], [0.2, -8.2, 0]], mine: [1.4, -2.2], cam: [[-6.6, 1.5, 1.4], [1.4, 1.1, -6.2]], expo: 1.05 },
      nassau: { w: 13, d: 10, h: 3.6, tables: [[-3.4, -5.2, 0.4]], mine: [1.8, -2.1], cam: [[4.8, 1.45, 1.6], [-1.0, 1.05, -5.6]], expo: 1.05 },
      prague: { w: 12, d: 15, h: 5.4, tables: [[0, -7.6, 0], [0, -11.2, 0]], mine: [0.6, -2.4], cam: [[-3.8, 1.5, 1.6], [0.6, 1.4, -10.0]], expo: 1.0 },
      malta: { w: 12, d: 10, h: 4.4, tables: [[-3.2, -5.4, 0.5]], mine: [1.6, -2.1], cam: [[-4.2, 1.5, 1.5], [1.6, 1.1, -5.6]], expo: 1.05 }
    }[T], W2 = LAY.w / 2, Zc = 2 - LAY.d / 2, HY = LAY.h - 5;   // HY: how far the ceiling fixtures move from the 5 m plan
    const r = room(g, { w: LAY.w, d: LAY.d, h: LAY.h, floor: D.floor, wall: D.wall, ceil: D.ceil, trim: D.mould === 'gold' ? 0xc8a050 : 0x2a1a10, cornice: D.mould === 'gold' ? 0xd8b868 : 0x2a1a10, fillI: 0.9, floorRough: T === 'monaco' || T === 'singapore' ? 0.2 : 0.6 });
    r.g = g; const B = r.back, felt = o.felt || D.felt, gold = M({ color: 0xc8a050, metalness: 0.95, roughness: 0.25, envMapIntensity: 1.2 });
    const frameC = D.mould === 'gold' ? 0xc8a050 : T === 'vegasvip' ? 0x0a0a0c : T === 'nassau' ? 0xf4f0e6 : T === 'singapore' ? 0x2a2a2a : 0x2a1a10;
    // the windows: one great one in the middle, a tall one each side (floor to ceiling where it's modern)
    if (D.wide) { const wh = LAY.h - 0.4; windowOn(g, D.view, 0, wh / 2 + 0.2, B + 0.02, LAY.w - 2, wh, 0, frameC); for (let i = -Math.floor((W2 - 1) / 2); i * 2 <= W2 - 1; i++) box(g, 0.06, wh, 0.08, M({ color: frameC, metalness: 0.6, roughness: 0.3 }), i * 2, wh / 2 + 0.2, B + 0.06); }
    else {
      const SX = Math.min(5, W2 - 2.6), wh = Math.min(3.2, LAY.h - 1.4), wy = wh / 2 + 0.8;
      windowOn(g, D.view, 0, wy, B + 0.02, 4, wh, 0, frameC); windowOn(g, D.view2 || D.view, -SX, wy, B + 0.02, 2.2, wh, 0, frameC); windowOn(g, D.view2 || D.view, SX, wy, B + 0.02, 2.2, wh, 0, frameC);
      if (D.arch) for (const [x, w] of [[0, 4], [-SX, 2.2], [SX, 2.2]]) { const ar = new THREE.Mesh(new THREE.TorusGeometry(w / 2 + 0.05, 0.07, 8, 32, Math.PI), M({ color: frameC, metalness: D.mould === 'gold' ? 0.8 : 0, roughness: 0.35 })); ar.position.set(x, wy + wh / 2, B + 0.05); ar.scale.y = 0.45; g.add(ar); const fan = new THREE.Mesh(new THREE.CircleGeometry(w / 2, 32, 0, Math.PI), new THREE.MeshBasicMaterial({ map: tex(D.view2 || D.view) })); fan.position.set(x, wy + wh / 2, B + 0.02); fan.scale.y = 0.45; g.add(fan); }
      curtain(g, -2.4, (wy + wh / 2 + 0.3) / 2, B + 0.06, 0.6, wy + wh / 2 + 0.3, D.curtain); curtain(g, 2.4, (wy + wh / 2 + 0.3) / 2, B + 0.06, 0.6, wy + wh / 2 + 0.3, D.curtain);
      if (D.shutters) for (const x of [-SX - 1.45, -SX + 1.45, SX - 1.45, SX + 1.45]) { const sh = canvas(64, 256, (cx, w, h) => { cx.fillStyle = '#f4f0e6'; cx.fillRect(0, 0, w, h); for (let i = 6; i < h; i += 8) { cx.fillStyle = 'rgba(0,0,0,.16)'; cx.fillRect(4, i, w - 8, 3); } cx.strokeStyle = 'rgba(0,0,0,.2)'; cx.strokeRect(2, 2, w - 4, h - 4); }); plane(g, 0.6, wh, M({ map: tex(sh), roughness: 0.6 }), x, wy, B + 0.05); }
    }
    // the walls: gilt mouldings, mirrors, portraits, bookcases, iron, columns
    if (D.mould === 'gold') for (const s of [-1, 1]) { const wp = new THREE.Group(); wp.position.set(s * (W2 - 0.02), 0, Zc); wp.rotation.y = -s * Math.PI / 2; g.add(wp); const pn = Math.round(LAY.d / 2.5); wallPanels(wp, 1 - LAY.d / 2, LAY.d / 2 - 1, 0, 1.3, LAY.h - 0.7, gold, pn); wallPanels(wp, 1 - LAY.d / 2, LAY.d / 2 - 1, 0, 0.2, 1.0, gold, pn + 2); }
    if (D.mirrors) for (const s of [-1, 1]) mirrorAt(g, s * (W2 - 0.05), 2.8, Zc, 1.6, 2.4, -s * Math.PI / 2, 0xc8a050);
    if (D.portraits) for (const s of [-1, 1]) for (const z of [Zc + 2, Zc - 2]) photo(g, s * (W2 - 0.05), 2.6, z, 1.0, 1.3, -s * Math.PI / 2, 'portrait', 0xb08a40);
    if (D.books) for (const s of [-1, 1]) for (const z of [Zc + 1.6, Zc - 1.6]) shelves(g, s * (W2 - 0.25), z, 2.6, Math.min(3.4, LAY.h - 0.6), -s * Math.PI / 2);
    if (D.fire) { fireplace(g, W2 - 0.4, B + 3.0, -Math.PI / 2); }
    if (D.cols) for (const s of [-1, 1]) for (const z of [Zc + 2.9, Zc - 2.9]) column(g, s * (W2 - 0.8), z, LAY.h, D.cols === 'gold' ? M({ map: tex(PAINT.marble('#f4ecdc', '#c8b090'), 1, 2), roughness: 0.15 }) : M({ color: 0x8a1410, roughness: 0.25, envMapIntensity: 0.8 }), gold);
    if (D.arches) for (const s of [-1, 1]) for (const z of [Zc + 2, Zc - 2]) { const ar = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.18, 8, 24, Math.PI), M({ map: tex(PAINT.stucco('#d4b888'), 1, 1), roughness: 0.9 })); ar.position.set(s * (W2 - 0.1), 3.2, z); ar.rotation.y = Math.PI / 2; g.add(ar); for (const t of [-1, 1]) box(g, 0.4, 3.2, 0.36, M({ map: tex(PAINT.stucco('#d4b888'), 1, 2), roughness: 0.9 }), s * (W2 - 0.15), 1.6, z + t * 1.4); }
    if (D.gas) for (const s of [-1, 1]) for (const z of [Zc + 1.75, Zc - 1.75]) { const gl = new THREE.Group(); gl.position.set(s * (W2 - 0.15), 2.4, z); g.add(gl); const ir = M({ color: 0x1a1a1a, metalness: 0.6 }); box(gl, 0.04, 0.04, 0.3, ir, -s * 0.1, 0, 0, Math.PI / 2); cyl(gl, 0.12, 0.08, 0.32, M({ color: 0xfff0d0, emissive: 0xffa040, emissiveIntensity: 1.4, transparent: true, opacity: 0.85 }), -s * 0.25, 0.1, 0, 6); cyl(gl, 0.14, 0.02, 0.1, ir, -s * 0.25, 0.3, 0, 6); light(gl, 0xffa050, 0.8, -s * 0.3, 0.1, 0, 3.5); }
    if (D.iron) { const ir = M({ color: 0x141414, metalness: 0.6, roughness: 0.5 }); box(g, 4.2, 0.05, 0.05, ir, 0, 1.6, B + 0.25); for (let i = 0; i < 28; i++) { cyl(g, 0.01, 0.01, 0.8, ir, -2.05 + i * 0.152, 1.2, B + 0.25, 4); if (i % 4 === 0) { const sc = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.01, 4, 16), ir); sc.position.set(-2.05 + i * 0.152 + 0.076, 1.45, B + 0.25); g.add(sc); } } }
    if (D.piano) { pianoUpright(g, -(W2 - 1.4), B + 1.4, 0.5, 0x1a0e08); const tp = new THREE.Group(); tp.position.set(-(W2 - 0.05), 2.6, Zc - 1); tp.rotation.y = Math.PI / 2; g.add(tp); const br2 = M({ color: 0xd8b050, metalness: 0.95, roughness: 0.2 }); cyl(tp, 0.012, 0.012, 0.55, br2, 0, 0, 0, 8).rotation.z = Math.PI / 2; cyl(tp, 0.012, 0.09, 0.2, br2, 0.36, 0, 0, 16).rotation.z = -Math.PI / 2; }
    // a rug under the tables, sofas, plants, orchids, rattan
    if (D.rug) rugAt(g, 0, Zc - 0.4, LAY.w - 4, LAY.d - 6.2, canvas(512, 256, (x, w, h) => { x.fillStyle = D.rug; x.fillRect(0, 0, w, h); x.strokeStyle = '#c8a050'; x.lineWidth = 6; x.strokeRect(10, 10, w - 20, h - 20); x.lineWidth = 2; x.strokeRect(22, 22, w - 44, h - 44); for (let i = 0; i < 6; i++) { x.strokeStyle = 'rgba(200,160,80,.5)'; x.beginPath(); x.ellipse(w / 2, h / 2, 40 + i * 30, 20 + i * 14, 0, 0, 7); x.stroke(); } noise(x, w, h, 0.08, 4000); }));
    if (D.sofa) for (const s of [-1, 1]) sofa(g, s * (W2 - 1.4), -1.4, -s * Math.PI / 2, D.sofa, 2.0);
    if (D.palms) { plant(g, -(W2 - 0.8), -1.2, 1.5, true); plant(g, W2 - 0.8, -1.2, 1.5, true); }
    if (D.orchids) for (const [x, z] of [[-(W2 - 1.2), -1.2], [W2 - 1.2, -1.2], [-(W2 - 1.2), B + 1.4], [W2 - 1.2, B + 1.4]]) { cyl(g, 0.16, 0.12, 0.5, M({ color: 0xf4f0e8, roughness: 0.2 }), x, 0.25, z, 16); for (let k = 0; k < 3; k++) { seg(g, [x, 0.5, z], [x + (k - 1) * 0.15, 1.2, z + 0.1], 0.008, 0.006, M({ color: 0x3a5a2a })); for (let f = 0; f < 4; f++) sph(g, 0.04, M({ color: pick([0xf4e8f4, 0xe8a8d8, 0xf8f4f8]), roughness: 0.5 }), x + (k - 1) * 0.15 + f * 0.04, 1.2 - f * 0.06, z + 0.12, 8); } }
    if (D.rattan) for (const s of [-1, 1]) { const rc = new THREE.Group(); rc.position.set(s * (W2 - 1.2), 0, B + 2.6); rc.rotation.y = -s * 0.6; g.add(rc); const rt = M({ map: tex(PAINT.wallpaper('#c89a5a', '#8a6a3a', 'diamond'), 2, 2), roughness: 0.8 }); rbox(rc, 0.9, 0.45, 0.8, 0.08, rt, 0, 0.3, 0); rbox(rc, 0.9, 0.7, 0.12, 0.06, rt, 0, 0.75, -0.36); rbox(rc, 0.8, 0.12, 0.7, 0.05, cloth(0xf4f0e6), 0, 0.58, 0.03); }
    if (D.cove) { box(g, LAY.w - 0.4, 0.04, 0.04, glow(D.cove, 2.2), 0, LAY.h - 0.15, B + 0.3); for (const s of [-1, 1]) box(g, 0.04, 0.04, LAY.d - 1, glow(D.cove, 2.2), s * (W2 - 0.2), LAY.h - 0.15, Zc); }
    // the lights: chandeliers, lanterns, fans, banker's lamps, candles, pendants
    const hang = (x, z, s) => {
      const g = new THREE.Group(); g.position.y = HY; r.g.add(g);
      if (D.fix === 'crystal') chandelier(g, x, 4.25, z, (D.big ? 1.6 : 1.3) * s, D.chand);
      else if (D.fix === 'lantern') { lantern(g, x, 3.7, z, 0xff2a1a); for (let k = -1; k <= 1; k += 2) lantern(g, x + k * 1.2, 3.9, z + 0.6, 0xff3a1a); }
      else if (D.fix === 'fans') { const f = new THREE.Group(); f.position.set(x, 4.5, z); g.add(f); const wd2 = M({ color: T === 'nassau' ? 0xc89a5a : 0x3a2414, roughness: 0.5 }); cyl(f, 0.14, 0.12, 0.18, gold, 0, 0, 0, 16); cyl(f, 0.015, 0.015, 0.5, gold, 0, 0.3, 0, 6); for (let i = 0; i < 5; i++) { const bl = box(f, 0.8, 0.012, 0.16, wd2, 0, -0.05, 0); bl.geometry.translate(0.48, 0, 0); bl.rotation.y = i / 5 * Math.PI * 2 + 0.3; } const gl2 = sph(f, 0.13, M({ color: 0xfff4e0, emissive: 0xffe0b0, emissiveIntensity: 1.2 }), 0, -0.16, 0, 14); gl2.scale.y = 0.7; }
      else if (D.fix === 'banker') { for (const k of [-1, 1]) { const bx = x + k * 0.7; cyl(g, 0.006, 0.006, 1.6, gold, bx, 4.2, z, 4); const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.6, 16, 1, true, 0, Math.PI), M({ color: 0x1a5a2a, emissive: 0x1a5a2a, emissiveIntensity: 0.4, side: THREE.DoubleSide, roughness: 0.2 })); sh.rotation.z = Math.PI / 2; sh.position.set(bx, 3.4, z); g.add(sh); sph(g, 0.05, glow(0xffe8c0, 3), bx, 3.36, z, 8); } }
      else if (D.fix === 'candle') { const c = new THREE.Group(); c.position.set(x, 3.9, z); g.add(c); const ir = M({ color: 0x2a2a2a, metalness: 0.5 }); for (const rr of [0.8, 0.5]) { const ring = new THREE.Mesh(new THREE.TorusGeometry(rr, 0.025, 6, 40), gold); ring.rotation.x = Math.PI / 2; ring.position.y = rr === 0.8 ? 0 : 0.35; c.add(ring); for (let i = 0; i < (rr === 0.8 ? 12 : 8); i++) { const a = i / (rr === 0.8 ? 12 : 8) * Math.PI * 2; cyl(c, 0.018, 0.018, 0.14, M({ color: 0xf4ecd8 }), Math.cos(a) * rr, (rr === 0.8 ? 0 : 0.35) + 0.08, Math.sin(a) * rr, 8); sph(c, 0.018, glow(0xffb050, 4), Math.cos(a) * rr, (rr === 0.8 ? 0 : 0.35) + 0.17, Math.sin(a) * rr, 6); } } cyl(c, 0.01, 0.01, 1.2, ir, 0, 0.9, 0, 4); light(c, 0xffb860, 3.5, 0, 0.1, 0, 8); }
      else if (D.fix === 'ironlamp') { const ir = M({ color: 0x1a1a1a, metalness: 0.6 }); cyl(g, 0.008, 0.008, 1.3, ir, x, 4.35, z, 4); const lb = cyl(g, 0.24, 0.16, 0.42, M({ color: 0xfff0d0, emissive: 0xffb060, emissiveIntensity: 1.2, transparent: true, opacity: 0.85 }), x, 3.5, z, 8); cyl(g, 0.3, 0.05, 0.16, ir, x, 3.78, z, 8); for (let k = 0; k < 8; k++) cyl(g, 0.01, 0.01, 0.44, ir, x + Math.cos(k * 0.785) * 0.2, 3.5, z + Math.sin(k * 0.785) * 0.2, 4); light(g, 0xffb060, 2, x, 3.4, z, 7); }
      else if (D.fix === 'pendants') { for (let k = -2; k <= 2; k++) { const px = x + k * 0.45; cyl(g, 0.004, 0.004, 1.4 + (k % 2) * 0.3, M({ color: 0x1a1a1a }), px, 4.3, z, 4); const gb = sph(g, 0.12, M({ color: 0xc8a050, metalness: 0.9, roughness: 0.2, emissive: 0xffc070, emissiveIntensity: 0.3 }), px, 3.55 - (k % 2) * 0.3, z, 16); sph(g, 0.06, glow(0xffe0b0, 3), px, 3.46 - (k % 2) * 0.3, z, 8); } }
      else if (D.fix === 'linear') { const fm = M({ color: 0x0c0c0e, metalness: 0.7, roughness: 0.25 }); rbox(g, 2.6, 0.08, 0.12, 0.02, fm, x, 3.6, z); box(g, 2.5, 0.02, 0.06, glow(0xfff0d8, 3), x, 3.55, z); for (const k of [-1, 1]) cyl(g, 0.004, 0.004, 1.4, fm, x + k * 1.2, 4.3, z, 4); }
    };
    LAY.tables.forEach(([x, z]) => hang(x, z, 1)); hang(LAY.mine[0], LAY.mine[1], 0.8);
    // the tables
    LAY.tables.forEach(([x, z, ry]) => pokerTable(g, x, z, { felt, rail: 0x1a0a04, seats: 8, rx: 1.4, rz: 0.8, ry, lamp: false, full: 0.9, ceil: LAY.h - 0.8 }));
    pokerTable(g, LAY.mine[0], LAY.mine[1], { mine: true, felt, rail: 0x1a0a04, seats: 8, rx: 1.4, rz: 0.8, lamp: false, ceil: LAY.h - 0.8 });
    // a waiter with a tray, a guard at the door
    if (STAGE !== 'final') { stander(g, -(W2 - 2.2), Zc + 1.0, 0.6, { look: 'smart', arms: 'down', lod: 1 }); stander(g, W2 - 1.4, B + 1.0, -0.4, { look: 'smart', arms: 'crossed', lod: 1 }); }
    return { exposure: LAY.expo, cam: LAY.cam };
  },
  // a mountain lodge's card room. Aspen: log walls, a river-stone fireplace to the rafters, antler chandeliers, skis, snow
  // falling past the big window. Sedona: adobe, vigas and latillas overhead, a kiva fireplace, red rock out the window
  lodge(g, o) {
    const T = o.theme || (o.snow ? 'aspen' : 'sedona'), A = T === 'aspen';
    const latilla = canvas(256, 256, (x, w, h) => { for (let i = 0; i < w; i += 8) { const c = new THREE.Color('#b8956a').offsetHSL(0, 0, (rnd() - 0.5) * 0.12); x.fillStyle = '#' + c.getHexString(); x.fillRect(i, 0, 7, h); x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(i + 7, 0, 1, h); } });
    const r = room(g, { w: 14, d: 10, h: 4.4, floor: A ? PAINT.wood('#6a4020', '#4a2a14', 30) : PAINT.terracotta('#b8603a'), wall: A ? PAINT.logs('#8a5a30', '#6a4020') : PAINT.adobe('#d89a68'), ceil: A ? PAINT.wood('#5a3a20', '#3a2410', 50) : latilla, trim: A ? 0x3a2410 : 0x8a5030, cornice: A ? 0x3a2410 : 0xc8885a, fillI: 0.8 });
    const B = r.back, logM = M({ map: tex(PAINT.wood('#6a4424', '#4a2e16', 6), 1, 4), roughness: 0.85 });
    // the view: snowy peaks with snow falling, or red rock at dusk
    const view = A ? VIEW.mountains({ pines: true, snow: true, sky0: '#06102a', sky1: '#3a4a7a' }) : VIEW.desert({ rock: '#6a2a14', palms: false, buttes: true });
    if (A) { const x = view.getContext('2d'); for (let i = 0; i < 500; i++) { x.fillStyle = 'rgba(255,255,255,' + (0.4 + rnd() * 0.5) + ')'; x.beginPath(); x.arc(rnd() * view.width, rnd() * view.height, 1 + rnd() * 2.5, 0, 7); x.fill(); } }
    windowOn(g, view, -2.4, 2.2, B + 0.02, 6.2, 3.2, 0, A ? 0x3a2410 : 0x5a3018);
    // the beams: log trusses, or round vigas running wall to wall
    if (A) for (let i = 0; i < 4; i++) { const z = 0.6 - i * 2.4; const tb = cyl(g, 0.16, 0.16, 14, logM, 0, 4.1, z, 12); tb.rotation.z = Math.PI / 2; for (const s of [-1, 1]) { const kb = cyl(g, 0.11, 0.11, 2.4, logM, s * 3.2, 3.6, z, 10); kb.rotation.z = s * 1.05; } }
    else for (let i = 0; i < 8; i++) { const z = 1.6 - i * 1.2; const v = cyl(g, 0.13, 0.13, 14.6, M({ map: tex(PAINT.wood('#5a3418', '#4a2a12', 4), 1, 6), roughness: 0.9 }), 0, 4.25, z, 12); v.rotation.z = Math.PI / 2; for (const s of [-1, 1]) cyl(g, 0.13, 0.13, 0.04, M({ color: 0x3a2010 }), s * 7.0, 4.25, z, 12).rotation.z = Math.PI / 2; }
    // the fireplace: river stone to the ceiling, or a white kiva in the corner
    if (A) { const st = M({ map: tex(canvas(256, 256, (x, w, h) => { x.fillStyle = '#4a4440'; x.fillRect(0, 0, w, h); for (let i = 0; i < 90; i++) { x.fillStyle = pick(['#8a8478', '#a09a8c', '#6a6458', '#b8b0a0', '#7a7060']); x.beginPath(); x.ellipse(rnd() * w, rnd() * h, 10 + rnd() * 18, 7 + rnd() * 10, rnd() * 3, 0, 7); x.fill(); } }), 1, 2), roughness: 0.95 }); box(g, 2.6, 4.4, 0.9, st, 4.4, 2.2, B + 0.45); fireplace(g, 4.4, B + 0.92); box(g, 2.8, 0.18, 0.4, logM, 4.4, 1.55, B + 1.0); mountedHead(g, 4.4, 2.9, B + 0.92, 0, true);
      for (const [x, rz] of [[-6.6, 0.15], [-6.2, -0.15]]) { const sk = box(g, 0.09, 1.8, 0.02, M({ color: x < -6.4 ? 0xc81a1a : 0x1a3a8a, roughness: 0.4 }), x, 2.3, B + 0.05); sk.rotation.z = rz; } }
    else { const kiva = new THREE.Group(); kiva.position.set(5.6, 0, B + 0.9); kiva.rotation.y = -Math.PI / 4; g.add(kiva); const pl = M({ map: tex(PAINT.adobe('#f0e4d0')), roughness: 0.95 }); const body = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.9, 2.2, 24, 1, false, -Math.PI / 2, Math.PI), pl); body.position.y = 1.1; kiva.add(body); const hood = cyl(kiva, 0.25, 0.4, 2.2, pl, 0, 3.3, -0.2, 16); const mouth = new THREE.Mesh(new THREE.CircleGeometry(0.42, 24, 0, Math.PI), M({ color: 0x0a0604 })); mouth.position.set(0, 0.1, 0.62); kiva.add(mouth); plane(kiva, 0.7, 0.4, new THREE.MeshBasicMaterial({ map: tex(canvas(128, 64, (x, w, h) => { const g2 = x.createRadialGradient(w / 2, h, 4, w / 2, h, h); g2.addColorStop(0, '#fff2a0'); g2.addColorStop(0.5, '#ff8a20'); g2.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g2; x.fillRect(0, 0, w, h); })), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }), 0, 0.3, 0.64); light(kiva, 0xff9a40, 2.2, 0, 0.4, 1.0, 5);
      // pottery in a nicho, a Navajo blanket on the wall, cacti, a ristra of chiles
      for (let i = 0; i < 3; i++) { const p = new THREE.Mesh(new THREE.LatheGeometry([[0.001, 0], [0.12, 0.02], [0.18, 0.15], [0.12, 0.32], [0.07, 0.36]].map(q => new THREE.Vector2(q[0], q[1])), 20), M({ map: tex(canvas(64, 32, (x, w, h) => { x.fillStyle = pick(['#c8703a', '#e8d8b8', '#2a1a10']); x.fillRect(0, 0, w, h); x.fillStyle = '#1a1210'; for (let k = 0; k < 8; k++) { x.beginPath(); x.moveTo(k * 8, 12); x.lineTo(k * 8 + 4, 20); x.lineTo(k * 8 + 8, 12); x.fill(); } })), roughness: 0.6 })); p.position.set(-6.6 + i * 0.5, 0, -1.0 - i * 0.3); p.scale.setScalar(1.4 + i * 0.3); g.add(p); }
      const rist = new THREE.Group(); rist.position.set(1.4, 2.6, B + 0.08); g.add(rist); for (let i = 0; i < 18; i++) { const ch = sph(rist, 0.05, M({ color: 0xa81a10, roughness: 0.4 }), (rnd() - 0.5) * 0.12, -i * 0.05, 0.02, 8); ch.scale.set(0.6, 1.4, 0.6); }
      for (const [cx, cz] of [[-6.4, -6.6], [3.0, B + 0.5]]) { cyl(g, 0.22, 0.17, 0.36, M({ color: 0xb8603a }), cx, 0.18, cz, 14); cyl(g, 0.1, 0.1, 1.0, M({ color: 0x3a6a3a, roughness: 0.7 }), cx, 0.85, cz, 10); for (const s of [-1, 1]) seg(g, [cx, 0.9, cz], [cx + s * 0.25, 1.25, cz], 0.07, 0.06, M({ color: 0x3a6a3a, roughness: 0.7 })); } }
    // a woven blanket on the side wall either way
    const nav = canvas(128, 192, (x, w, h) => { const cs = A ? ['#8a1a1a', '#f0e4c8', '#1a1a1a', '#c8a050'] : ['#c8501a', '#f0e4c8', '#1a1a1a', '#2a8a8a']; x.fillStyle = cs[1]; x.fillRect(0, 0, w, h); for (let j = 0; j < 6; j++) { x.fillStyle = cs[j % 3 === 0 ? 0 : j % 3 === 1 ? 2 : 3]; x.fillRect(0, j * 32 + 4, w, 8); for (let i = 0; i < 4; i++) { x.beginPath(); x.moveTo(i * 32 + 16, j * 32 + 14); x.lineTo(i * 32 + 28, j * 32 + 22); x.lineTo(i * 32 + 16, j * 32 + 30); x.lineTo(i * 32 + 4, j * 32 + 22); x.fill(); } } });
    plane(g, 1.3, 1.9, M({ map: tex(nav), roughness: 0.95, side: THREE.DoubleSide }), -6.98, 2.2, -4.0, Math.PI / 2);
    rugAt(g, 1.2, -3.0, 5.2, 3.6, nav);
    // lights: antler chandeliers, or punched-tin lanterns
    for (const [x, z] of [[-2.6, -3.8], [1.6, -2.2]]) { if (A) { const w = new THREE.Group(); w.position.set(x, 3.2, z); g.add(w); const wm = M({ color: 0xe0d4bc, roughness: 0.7 }); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; seg(w, [0, 0, 0], [Math.cos(a) * 0.65, 0.2 + (i % 2) * 0.15, Math.sin(a) * 0.65], 0.04, 0.015, wm); seg(w, [Math.cos(a) * 0.4, 0.1, Math.sin(a) * 0.4], [Math.cos(a + 0.4) * 0.55, 0.45, Math.sin(a + 0.4) * 0.55], 0.022, 0.01, wm); sph(w, 0.045, glow(0xffd8a0, 3), Math.cos(a) * 0.66, 0.0, Math.sin(a) * 0.66, 8); } for (let i = 0; i < 3; i++) cyl(w, 0.006, 0.006, 1.0, M({ color: 0x1a1a1a }), Math.cos(i * 2.1) * 0.3, 0.6, Math.sin(i * 2.1) * 0.3, 4); light(w, 0xffc890, 2.2, 0, -0.2, 0, 7); }
      else { const tin = M({ color: 0x9a8a70, metalness: 0.8, roughness: 0.4, emissive: 0x6a3a10, emissiveIntensity: 0.4 }); cyl(g, 0.006, 0.006, 0.9, M({ color: 0x1a1a1a }), x, 3.9, z, 4); const lt = cyl(g, 0.2, 0.2, 0.5, tin, x, 3.2, z, 8); cyl(g, 0.02, 0.24, 0.22, tin, x, 3.55, z, 8); light(g, 0xffb060, 2.2, x, 3.0, z, 7); } }
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
    const r = room(g, { w: 14, d: 10, h: 3.8, floor: PAINT.planks('#8a6a44', '#6e5234'), wall: MT ? PAINT.brick('#8a4a30', '#5a4a40') : PAINT.planks('#8a5a30', '#6a4020'), wainscot: PAINT.panel('#4a2a14', '#5a3418'), ceil: PAINT.tin(MT ? '#8a7a5a' : '#3a3028'), trim: 0x2a1408, cornice: 0x3a2010, fillI: 0.7 });
    const B = r.back, brass = M({ color: 0xc8a050, metalness: 0.9, roughness: 0.3 });
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
      windowOn(g, o.view, 4.0, 2.0, B + 0.02, 2.6, 1.7, 0, 0x2a1a0c);
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
    const r = room(g, { w: 32, d: 26, h: 10, floor: PAINT.carpet(o.carpet || '#1a2a4a', o.carpet2 || '#22345a', o.carpet3 || '#c8a050', 'check'), wall: PAINT.concrete('#4a4a50'), ceil: PAINT.plain('#1a1a20'), trim: 0x222222, cornice: 0x2a2a2e, fillI: 0.7 });
    const B = r.back, tm = M({ color: 0x5a5e66, metalness: 0.7, roughness: 0.4 });
    // the roof trusses and the high-bay lights
    for (let j = 0; j < 5; j++) { const z = 0 - j * 5.2; box(g, 32, 0.4, 0.25, tm, 0, 9.4, z); box(g, 32, 0.1, 0.1, tm, 0, 8.6, z); for (let i = 0; i < 16; i++) { const d = box(g, 0.06, 1.0, 0.06, tm, -15 + i * 2, 9.0, z); d.rotation.z = i % 2 ? 0.8 : -0.8; } for (let i = 0; i < 6; i++) { const x = -12.5 + i * 5; cyl(g, 0.3, 0.45, 0.4, M({ color: 0x8a8e94, metalness: 0.8, roughness: 0.3 }), x, 8.3, z, 16); const d2 = new THREE.Mesh(new THREE.CircleGeometry(0.4, 16), glow(0xf4f8ff, 2.6)); d2.rotation.x = Math.PI / 2; d2.position.set(x, 8.09, z); g.add(d2); } }
    light(g, 0xf4f8ff, 5, -8, 8, -4, 20); light(g, 0xf4f8ff, 5, 8, 8, -4, 20); light(g, 0xf4f8ff, 5, 0, 8, -14, 20);
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
    return { exposure: 1.05, fog: [0x1a1a22, 14, 40], cam: o.cam || [[-5.2, 1.8, 1.9], [2.0, 1.3, -12.0]] };
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
  }
};
// which room each place uses, and how it's dressed (the key is what poker.html asks for)
const PLACES = {
  kitchen: ['kitchen'], basement: ['basement'], garage: ['garage'], dining: ['dining'], porch: ['porch'],
  lodge: ['lodgehall'], vfw: ['vfw'],
  firehouse: ['firehouse'], rec: ['gym'],
  countryclub: ['countryclub'], cellar: ['cellar'], backroom: ['backroom'], dragon: ['dragon'], cantina: ['cantina'], diner: ['diner'],
  cardroom: ['cardroom', { theme: 'prairie' }], cardriver: ['cardroom', { theme: 'river' }], cardharbor: ['cardroom', { theme: 'harbor' }],
  cardwest: ['cardroom', { theme: 'west' }], cardlake: ['cardroom', { theme: 'lake' }], cardclub: ['cardroom', { theme: 'club' }],
  cardnugget: ['cardroom', { theme: 'nugget' }], carddollar: ['cardroom', { theme: 'dollar' }],
  gulf: ['casino', { theme: 'gulf' }],
  reno: ['casino', { theme: 'reno' }],
  boardwalk: ['casino', { theme: 'boardwalk' }],
  chicago: ['casino', { theme: 'chicago' }],
  tahoe: ['casino', { theme: 'tahoe' }], aspen: ['lodge', { snow: true }],
  paris: ['salon', { theme: 'paris' }],
  monaco: ['salon', { theme: 'monaco' }],
  macau: ['salon', { theme: 'macau' }],
  vegasvip: ['salon', { theme: 'vegasvip' }],
  mainevent: ['ballroom', {}], omahachamp: ['ballroom', { mine: [-7.6, -1.6], cam: [[-11.6, 1.7, 1.0], [-2.0, 1.3, -9.0]], title: 'OMAHA WORLD CHAMPIONSHIP', banner: 'OMAHA CHAMPIONSHIP', bannerBg: '#1c133e', screen: ['#3b2a7a', '#100a2a'], felt: 0x3b2a7a, carpet: '#1c133e', carpet2: '#2a1d5a' }],
  playerschamp: ['ballroom', { mine: [7.4, -1.6], cam: [[11.2, 1.5, 1.4], [-1.0, 1.4, -8.5]], title: 'PLAYERS\' CHAMPIONSHIP', banner: 'PLAYERS\' CHAMPIONSHIP', bannerBg: '#0f3d2e', screen: ['#0f3d2e', '#04140e'], felt: 0x0f3d2e, carpet: '#0a2a1e', carpet2: '#0f3d2e' }],
  bayou: ['salon', { theme: 'bayou' }],
  minetown: ['saloon', { view: VIEW.mountains({ pines: true, sky0: '#081020', sky1: '#30406a' }) }], deadwood: ['saloon'],
  pinewood: ['casino', { theme: 'pinewood' }],
  twincities: ['casino', { theme: 'twincities' }],
  palmsprings: ['casino', { theme: 'palmsprings' }],
  london: ['salon', { theme: 'london' }],
  vienna: ['salon', { theme: 'vienna' }],
  singapore: ['salon', { theme: 'singapore' }],
  nassau: ['salon', { theme: 'nassau' }],
  tunica: ['riverboat', { felt: 0x155e75 }],
  miami: ['casino', { theme: 'miami' }],
  seattle: ['casino', { theme: 'seattle' }],
  sedona: ['lodge', { view: VIEW.desert({ rock: '#8a3a1c' }) }],
  prague: ['salon', { theme: 'prague' }],
  malta: ['salon', { theme: 'malta' }],
  seoul: ['casino', { theme: 'seoul' }],
  cruise: ['cruise'], series: ['expo', {}], seriesspring: ['expo', { mine: [-7.2, -1.4], cam: [[-12.2, 1.6, 0.8], [-1.0, 1.4, -12.0]], banner: 'SPRING SERIES', bannerBg: '#1f6b45', carpet: '#2a1a3a', carpet2: '#3a2a4a' }], seriesfall: ['expo', { mine: [8.4, -1.4], cam: [[13.6, 1.7, 1.0], [0, 1.4, -12.0]], banner: 'FALL SERIES', bannerBg: '#c0561e', carpet: '#3a1a10', carpet2: '#4a2414' }]
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
