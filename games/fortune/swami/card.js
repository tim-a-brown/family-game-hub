// The printed fortune card: cream card stock, a two-colour print (brick red and navy) that is a little
// crooked and slightly out of register, worn in places, with an ornate border, the machine's name and a
// crystal ball emblem. paintCard(canvas, pxWidth, {text, num, day, no}, fonts). Design units: 500 x 700.

const TAU = Math.PI * 2;
export const CARD_RATIO = 1.4;
const RED = '#b0301f', NAVY = '#1c2846';
function rng(seed) {
  let a = seed >>> 0;
  return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
function layer(w, h, k) { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.setTransform(k, 0, 0, k, 0, 0); return [c, g]; }
function rrect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

function wrap(g, text, maxW) {
  const words = text.split(/\s+/), lines = []; let line = '';
  for (const w of words) {
    const t = line ? line + ' ' + w : w;
    if (g.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t;
  }
  if (line) lines.push(line);
  return lines;
}

// corner ornament: an L bracket ending in curls, with a diamond in the corner
function flourish(g, x, y, s, rot) {
  g.save(); g.translate(x, y); g.rotate(rot);
  g.lineCap = 'round';
  g.beginPath(); g.moveTo(s * 0.18, s * 0.06); g.lineTo(s * 0.78, s * 0.06);
  g.bezierCurveTo(s * 0.98, s * 0.06, s * 1.02, s * 0.3, s * 0.86, s * 0.32); g.bezierCurveTo(s * 0.76, s * 0.33, s * 0.74, s * 0.2, s * 0.84, s * 0.18); g.stroke();
  g.beginPath(); g.moveTo(s * 0.06, s * 0.18); g.lineTo(s * 0.06, s * 0.78);
  g.bezierCurveTo(s * 0.06, s * 0.98, s * 0.3, s * 1.02, s * 0.32, s * 0.86); g.bezierCurveTo(s * 0.33, s * 0.76, s * 0.2, s * 0.74, s * 0.18, s * 0.84); g.stroke();
  g.beginPath(); g.moveTo(s * 0.2, s * 0.2); g.bezierCurveTo(s * 0.45, s * 0.2, s * 0.5, s * 0.42, s * 0.36, s * 0.44); g.bezierCurveTo(s * 0.28, s * 0.45, s * 0.27, s * 0.34, s * 0.34, s * 0.33); g.stroke();
  g.beginPath(); g.moveTo(s * 0.2, s * 0.2); g.bezierCurveTo(s * 0.2, s * 0.45, s * 0.42, s * 0.5, s * 0.44, s * 0.36); g.stroke();
  g.beginPath(); g.moveTo(s * 0.13, s * 0.04); g.lineTo(s * 0.22, s * 0.13); g.lineTo(s * 0.13, s * 0.22); g.lineTo(s * 0.04, s * 0.13); g.closePath(); g.fill();
  g.restore();
}
function diamondRule(g, cx, y, half) {
  g.beginPath(); g.moveTo(cx - half, y); g.lineTo(cx - 14, y); g.moveTo(cx + 14, y); g.lineTo(cx + half, y); g.stroke();
  g.beginPath(); g.moveTo(cx, y - 7); g.lineTo(cx + 9, y); g.lineTo(cx, y + 7); g.lineTo(cx - 9, y); g.closePath(); g.fill();
  g.beginPath(); g.arc(cx - half - 6, y, 2.6, 0, TAU); g.arc(cx + half + 6, y, 2.6, 0, TAU); g.fill();
}

export function paintCard(c, px, f, F) {
  const W = 500, H = 700, k = px / W, pw = Math.round(W * k), ph = Math.round(H * k);
  c.width = pw; c.height = ph;
  const g = c.getContext('2d');
  const R = rng(f.no * 7919 + 13);
  g.setTransform(k, 0, 0, k, 0, 0);

  // card stock
  g.save(); rrect(g, 0, 0, W, H, 16); g.clip();
  g.fillStyle = '#efe0bd'; g.fillRect(0, 0, W, H);
  const fib = layer(pw, ph, k)[0], fg = fib.getContext('2d');
  for (let i = 0; i < 2600; i++) {
    const x = R() * W, y = R() * H, l = 2 + R() * 7, a = R() * TAU;
    fg.strokeStyle = R() < 0.5 ? 'rgba(120,90,40,.08)' : 'rgba(255,250,235,.22)'; fg.lineWidth = 0.6;
    fg.beginPath(); fg.moveTo(x, y); fg.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); fg.stroke();
  }
  for (let i = 0; i < 260; i++) { fg.fillStyle = 'rgba(90,60,20,' + (0.05 + R() * 0.12) + ')'; fg.fillRect(R() * W, R() * H, 0.9, 0.9); }
  g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(fib, 0, 0); g.setTransform(k, 0, 0, k, 0, 0);
  // age: warm edges and a faint stain
  let gr = g.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.72);
  gr.addColorStop(0, 'rgba(160,110,40,0)'); gr.addColorStop(1, 'rgba(150,95,30,.32)');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  const sx = 80 + R() * 340, sy = 120 + R() * 460;
  gr = g.createRadialGradient(sx, sy, 10, sx, sy, 60); gr.addColorStop(0, 'rgba(170,120,50,0)'); gr.addColorStop(0.85, 'rgba(170,120,50,.045)'); gr.addColorStop(1, 'rgba(170,120,50,0)');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  g.restore();

  // two ink layers, printed separately
  const [rc, rg] = layer(pw, ph, k), [nc, ng] = layer(pw, ph, k);
  [rg, ng].forEach(x => { x.fillStyle = x === rg ? RED : NAVY; x.strokeStyle = x.fillStyle; x.textAlign = 'center'; x.textBaseline = 'alphabetic'; });

  // border: heavy red rule, fine navy rule, navy corner flourishes
  rg.lineWidth = 6; rrect(rg, 22, 22, W - 44, H - 44, 10); rg.stroke();
  rg.lineWidth = 1.6; rrect(rg, 33, 33, W - 66, H - 66, 6); rg.stroke();
  ng.lineWidth = 1.2; rrect(ng, 40, 40, W - 80, H - 80, 4); ng.stroke();
  ng.lineWidth = 2.4;
  flourish(ng, 46, 46, 50, 0); flourish(ng, W - 46, 46, 50, Math.PI / 2); flourish(ng, W - 46, H - 46, 50, Math.PI); flourish(ng, 46, H - 46, 50, -Math.PI / 2);
  // little dotted chain along the sides
  for (let y = 110; y < H - 110; y += 14) { ng.beginPath(); ng.arc(28, y, 1.6, 0, TAU); ng.arc(W - 28, y, 1.6, 0, TAU); ng.fill(); }

  // crystal ball emblem: red sunburst, navy engraved ball on a stand
  const ex = W / 2, ey = 104;
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * TAU, r1 = 30, r2 = i % 2 ? 46 : 56;
    rg.beginPath(); rg.moveTo(ex + Math.cos(a - 0.05) * r1, ey + Math.sin(a - 0.05) * r1); rg.lineTo(ex + Math.cos(a) * r2, ey + Math.sin(a) * r2); rg.lineTo(ex + Math.cos(a + 0.05) * r1, ey + Math.sin(a + 0.05) * r1); rg.fill();
  }
  ng.lineWidth = 2.6; ng.beginPath(); ng.arc(ex, ey, 27, 0, TAU); ng.stroke();
  ng.save(); ng.beginPath(); ng.arc(ex, ey, 26, 0, TAU); ng.clip();
  ng.lineWidth = 1.1;
  for (let i = -30; i < 30; i += 4.2) { ng.beginPath(); ng.moveTo(ex + i + 10, ey - 30); ng.lineTo(ex + i - 8, ey + 30); ng.globalAlpha = i > 0 ? 0.9 : 0.25; ng.stroke(); }
  ng.globalAlpha = 1; ng.restore();
  ng.fillStyle = '#efe0bd'; ng.beginPath(); ng.ellipse(ex - 9, ey - 10, 7, 4, -0.6, 0, TAU); ng.fill(); ng.fillStyle = NAVY;
  ng.lineWidth = 1.6; ng.beginPath(); ng.moveTo(ex - 9, ey + 2); ng.quadraticCurveTo(ex, ey - 9, ex + 10, ey + 3); ng.stroke();
  ng.beginPath(); ng.moveTo(ex - 16, ey + 24); ng.lineTo(ex + 16, ey + 24); ng.lineTo(ex + 22, ey + 36); ng.lineTo(ex - 22, ey + 36); ng.closePath(); ng.fill();
  rg.beginPath(); rg.arc(ex, ey, 6, 0, TAU); rg.fill();

  // masthead
  ng.font = '700 15px ' + F.cinzel; if ('letterSpacing' in ng) ng.letterSpacing = '5px';
  ng.fillText('THE GREAT', W / 2 + 2.5, 170);
  rg.font = '46px ' + F.bungee; if ('letterSpacing' in rg) rg.letterSpacing = '3px';
  rg.fillText('ZANDOR', W / 2 + 1.5, 216);
  if ('letterSpacing' in rg) rg.letterSpacing = '0px';
  ng.font = '700 13px ' + F.cinzel; if ('letterSpacing' in ng) ng.letterSpacing = '4px';
  ng.fillText('HE SEES ALL  ·  HE KNOWS ALL', W / 2 + 2, 242);
  if ('letterSpacing' in ng) ng.letterSpacing = '0px';
  ng.lineWidth = 1.4; diamondRule(ng, W / 2, 262, 150);

  // the fortune, set as large as fits
  const top = 292, bottom = 556, maxW = 372;
  let size = 34, lines, lh;
  for (; size >= 17; size -= 1) {
    ng.font = size + 'px ' + F.pagella; lh = size * 1.28;
    lines = wrap(ng, f.text, maxW);
    if (lines.length * lh <= bottom - top) break;
  }
  ng.font = size + 'px ' + F.pagella;
  const y0 = top + (bottom - top - lines.length * lh) / 2 + size * 0.95;
  lines.forEach((ln, i) => ng.fillText(ln, W / 2, y0 + i * lh));

  rg.lineWidth = 1.4; diamondRule(rg, W / 2, 576, 150);
  // lucky number and day
  ng.font = '700 13px ' + F.cinzel; if ('letterSpacing' in ng) ng.letterSpacing = '3px';
  ng.fillText('LUCKY NUMBER', 172, 597); ng.fillText('LUCKY DAY', 330, 597);
  if ('letterSpacing' in ng) ng.letterSpacing = '0px';
  rg.font = '40px ' + F.bungee; rg.fillText(String(f.num), 172, 636);
  rg.font = 'italic 30px ' + F.pagella; rg.fillText(f.day, 330, 632);
  rg.fillRect(249, 584, 2, 44);
  ng.font = '700 11px ' + F.cinzel; if ('letterSpacing' in ng) ng.letterSpacing = '2px';
  ng.fillText('No. ' + String(f.no).padStart(4, '0'), W / 2, H - 49);
  if ('letterSpacing' in ng) ng.letterSpacing = '0px';

  // wear: the ink skips in specks and thins in patches
  [rg, ng].forEach((x, li) => {
    x.save(); x.setTransform(1, 0, 0, 1, 0, 0);
    x.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 900; i++) { x.fillStyle = 'rgba(0,0,0,' + (0.4 + R() * 0.6) + ')'; x.beginPath(); x.arc(R() * pw, R() * ph, (0.3 + R() * 1.1) * k, 0, TAU); x.fill(); }
    for (let i = 0; i < 7; i++) {
      const px2 = R() * pw, py2 = R() * ph, rr = (30 + R() * 80) * k;
      const gg = x.createRadialGradient(px2, py2, 0, px2, py2, rr); gg.addColorStop(0, 'rgba(0,0,0,' + (0.12 + li * 0.05 + R() * 0.12) + ')'); gg.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = gg; x.fillRect(px2 - rr, py2 - rr, rr * 2, rr * 2);
    }
    x.restore();
  });

  // print both layers a little crooked and out of register
  g.save(); rrect(g, 0, 0, W, H, 16); g.clip();
  g.globalCompositeOperation = 'multiply';
  const tilt = (R() - 0.5) * 0.022, dx = (R() - 0.5) * 8, dy = (R() - 0.5) * 6;
  g.save(); g.translate(W / 2 + dx, H / 2 + dy); g.rotate(tilt); g.translate(-W / 2, -H / 2);
  g.globalAlpha = 0.93; g.drawImage(nc, 0, 0, W, H);
  g.translate(2.2 + R() * 1.5, -1.6 + R()); g.rotate(0.004 + R() * 0.004);
  g.globalAlpha = 0.9; g.drawImage(rc, 0, 0, W, H);
  g.restore();
  g.restore();
  // edge: a hairline darker rim where the card was cut
  g.save(); rrect(g, 0.75, 0.75, W - 1.5, H - 1.5, 16); g.strokeStyle = 'rgba(120,85,35,.45)'; g.lineWidth = 1.5; g.stroke(); g.restore();
}
