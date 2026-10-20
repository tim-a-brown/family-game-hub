// The championship bracelet as a real 3D piece (three.js r160): a band of polished gold links in a ring, and an
// oval champion's plate curved to the wrist and set with a ring of diamonds. On the plate: the event's name engraved
// round the top, the event's emblem raised in the middle, the winner's portrait (a cameo of their avatar) and name
// under it, the event and year round the bottom. Studio light reflects off the gold; the stones flash as the piece
// turns, and it follows the device's tilt (or your finger / pointer). Loaded on demand by poker.html:
//   window.Bracelet3D(host, {venue, style, year, mark, name, avatar, rain}) -> {dispose(), askMotion()}   (null: no WebGL)
//   ring: true for the Summer Series ring instead (silver, a coloured stone: gem '#rrggbb'; venue = the event).
//   Behind it, stacks of banded $100 bills on the velvet; rain: true (a win) and bills rain down too.
//   mark: the event's emblem ('spade' | 'cards' | 'suits'); avatar: {photo: dataURL} | {svg: '<svg…>'} | null
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const LINKS = 44;            // links around the band
const R = 1;                 // band radius
const PA = 0.6, PB = 0.43;   // the plate: half its width and half its height (an oval)
const PD = 0.07, BEV = 0.03; // its thickness and the rounded edge
const RP = R + 0.045;        // the plate curves round the wrist at this radius

function supported() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; }
}

// bend a flat piece (x across, z out) round the wrist: x becomes an angle, z a radius
function bend(geo, base) {
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), r = base + pos.getZ(i), th = x / RP;
    pos.setXYZ(i, r * Math.sin(th), pos.getY(i), r * Math.cos(th));
  }
  pos.needsUpdate = true; geo.computeVertexNormals();
  return geo;
}

// ── The plate's face: drawn twice, once in colour and once as a height map (light = raised, dark = cut in) ─────
const FW = 1400, FH = Math.round(FW * PB / PA);
function ellipse(ctx, cx, cy, rx, ry) { ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); }
// words round an oval: along the top reading left to right, or along the bottom (letters upright either way)
function arcText(ctx, text, cx, cy, rx, ry, top, size, span, spacing) {
  const pts = [], N = 720;
  for (let i = 0; i <= N; i++) {
    const t = top ? Math.PI + (i / N) * Math.PI : Math.PI - (i / N) * Math.PI;
    pts.push([cx + rx * Math.cos(t), cy + ry * Math.sin(t)]);
  }
  const len = [0]; for (let i = 1; i < pts.length; i++) len.push(len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const total = len[len.length - 1], room = total * span;
  let f = size, w = 0, widths = [];
  do {
    ctx.font = '700 ' + f + 'px Georgia, "Times New Roman", serif';
    widths = Array.from(text).map(ch => ctx.measureText(ch).width + f * spacing);
    w = widths.reduce((a, b) => a + b, 0) - f * spacing;
    if (w <= room) break; f -= 2;
  } while (f > 18);
  const used = f;
  let s = (total - w) / 2;
  const at = d => { let i = 1; while (i < len.length - 1 && len[i] < d) i++; const k = (d - len[i - 1]) / ((len[i] - len[i - 1]) || 1); return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * k, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * k, Math.atan2(pts[i][1] - pts[i - 1][1], pts[i][0] - pts[i - 1][0])]; };
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  Array.from(text).forEach((ch, k) => {
    const mid = s + (widths[k] - f * spacing) / 2, p = at(mid);
    ctx.save(); ctx.translate(p[0], p[1]); ctx.rotate(p[2]); ctx.fillText(ch, 0, 0); ctx.restore();
    s += widths[k];
  });
  return used;
}
// the event's emblem, raised in the middle (drawn in one colour; the caller sets fill and stroke)
const SUITS = {
  spade: 'M0,-1 C0.35,-0.55 1,-0.2 1,0.25 C1,0.6 0.62,0.78 0.32,0.62 C0.22,0.56 0.12,0.48 0.06,0.4 C0.1,0.7 0.2,0.9 0.36,1 L-0.36,1 C-0.2,0.9 -0.1,0.7 -0.06,0.4 C-0.12,0.48 -0.22,0.56 -0.32,0.62 C-0.62,0.78 -1,0.6 -1,0.25 C-1,-0.2 -0.35,-0.55 0,-1 Z',
  heart: 'M0,1 C-0.5,0.55 -1,0.2 -1,-0.3 C-1,-0.75 -0.55,-1 -0.25,-0.85 C-0.12,-0.78 -0.04,-0.68 0,-0.58 C0.04,-0.68 0.12,-0.78 0.25,-0.85 C0.55,-1 1,-0.75 1,-0.3 C1,0.2 0.5,0.55 0,1 Z',
  diamond: 'M0,-1 L0.72,0 L0,1 L-0.72,0 Z',
  club: 'M0,-1 C0.3,-1 0.48,-0.75 0.48,-0.5 C0.48,-0.36 0.42,-0.25 0.34,-0.16 C0.42,-0.22 0.52,-0.25 0.62,-0.25 C0.88,-0.25 1.06,-0.04 1.06,0.22 C1.06,0.5 0.84,0.7 0.58,0.7 C0.36,0.7 0.18,0.56 0.08,0.4 C0.12,0.7 0.22,0.9 0.38,1 L-0.38,1 C-0.22,0.9 -0.12,0.7 -0.08,0.4 C-0.18,0.56 -0.36,0.7 -0.58,0.7 C-0.84,0.7 -1.06,0.5 -1.06,0.22 C-1.06,-0.04 -0.88,-0.25 -0.62,-0.25 C-0.52,-0.25 -0.42,-0.22 -0.34,-0.16 C-0.42,-0.25 -0.48,-0.36 -0.48,-0.5 C-0.48,-0.75 -0.3,-1 0,-1 Z'
};
function suit(ctx, name, x, y, r) { ctx.save(); ctx.translate(x, y); ctx.scale(r, r); ctx.fill(new Path2D(SUITS[name])); ctx.restore(); }
function crown(ctx, x, y, w) {
  const h = w * 0.62; ctx.beginPath();
  ctx.moveTo(x - w / 2, y + h / 2); ctx.lineTo(x - w / 2, y - h * 0.1); ctx.lineTo(x - w * 0.27, y + h * 0.12); ctx.lineTo(x, y - h / 2);
  ctx.lineTo(x + w * 0.27, y + h * 0.12); ctx.lineTo(x + w / 2, y - h * 0.1); ctx.lineTo(x + w / 2, y + h / 2); ctx.closePath(); ctx.fill();
  [[-0.5, -0.1], [0, -0.5], [0.5, -0.1]].forEach(p => { ctx.beginPath(); ctx.arc(x + p[0] * w, y + p[1] * h - w * 0.07, w * 0.07, 0, Math.PI * 2); ctx.fill(); });
}
function emblem(ctx, mark, x, y, r) {
  ctx.lineWidth = r * 0.05; ellipse(ctx, x, y, r, r); ctx.stroke();
  ctx.lineWidth = r * 0.02; ellipse(ctx, x, y, r * 0.86, r * 0.86); ctx.stroke();
  for (let k = 0; k < 24; k++) { const a = k / 24 * Math.PI * 2; ctx.beginPath(); ctx.arc(x + Math.cos(a) * r * 0.93, y + Math.sin(a) * r * 0.93, r * 0.022, 0, Math.PI * 2); ctx.fill(); }
  if (mark === 'cards') {
    // four cards fanned: Omaha's four
    for (let k = 0; k < 4; k++) {
      ctx.save(); ctx.translate(x, y + r * 0.32); ctx.rotate((k - 1.5) * 0.26); ctx.translate(0, -r * 0.42);
      ctx.beginPath(); ctx.roundRect(-r * 0.2, -r * 0.3, r * 0.4, r * 0.58, r * 0.06); ctx.fill(); ctx.stroke(); ctx.restore();
    }
    crown(ctx, x, y - r * 0.6, r * 0.42);
  } else if (mark === 'suits') {
    // the four suits round a star: every game
    suit(ctx, 'spade', x, y - r * 0.4, r * 0.2); suit(ctx, 'heart', x + r * 0.4, y, r * 0.2);
    suit(ctx, 'club', x, y + r * 0.4, r * 0.19); suit(ctx, 'diamond', x - r * 0.4, y, r * 0.22);
    ctx.beginPath();
    for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? r * 0.09 : r * 0.22; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    ctx.closePath(); ctx.fill();
  } else {
    suit(ctx, 'spade', x, y + r * 0.12, r * 0.48);
    crown(ctx, x, y - r * 0.56, r * 0.46);
  }
}
// laurel branches either side of the emblem
function laurel(ctx, x, y, r, side) {
  ctx.save(); ctx.translate(x, y); ctx.scale(side, 1);
  ctx.lineWidth = r * 0.035; ctx.beginPath(); ctx.arc(0, 0, r * 1.2, Math.PI * 0.6, Math.PI * 1.28); ctx.stroke();
  for (let k = 0; k < 8; k++) {
    const a = Math.PI * 0.64 + k * Math.PI * 0.085, px = Math.cos(a) * r * 1.2, py = Math.sin(a) * r * 1.2;
    for (const o of [-1, 1]) {
      ctx.save(); ctx.translate(px, py); ctx.rotate(a + Math.PI / 2 + o * 0.55 + Math.PI);
      ctx.beginPath(); ctx.ellipse(0, -r * 0.1, r * 0.045, r * 0.11, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
  }
  ctx.restore();
}
// a plain head-and-shoulders silhouette, for a player without a picture
function person(ctx, x, y, r) {
  ctx.beginPath(); ctx.arc(x, y - r * 0.22, r * 0.36, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x, y + r * 0.82, r * 0.78, r * 0.62, 0, Math.PI, 0); ctx.fill();
}

function plateFace(o) {
  const make = () => { const c = document.createElement('canvas'); c.width = FW; c.height = FH; return [c, c.getContext('2d')]; };
  const [cc, c] = make(), [bc, b] = make();
  const cx = FW / 2, cy = FH / 2, rx = FW / 2, ry = FH / 2;
  // only the oval shows (the rest is cut away)
  const clip = ctx => { ellipse(ctx, cx, cy, rx - 2, ry - 2); ctx.clip(); };
  c.save(); clip(c); b.save(); clip(b);
  const g = c.createLinearGradient(0, 0, FW, FH);
  g.addColorStop(0, '#fff1b0'); g.addColorStop(0.35, '#e9bd4c'); g.addColorStop(0.6, '#b9861f'); g.addColorStop(1, '#f6d77a');
  c.fillStyle = g; c.fillRect(0, 0, FW, FH);
  for (let y = 0; y < FH; y += 3) { c.fillStyle = 'rgba(255,255,255,' + (Math.random() * 0.06) + ')'; c.fillRect(0, y, FW, 1); }   // brushing
  b.fillStyle = '#808080'; b.fillRect(0, 0, FW, FH);
  // the stones' setting (the stones are real 3D), and the recessed oval panel inside it
  c.lineWidth = 46; c.strokeStyle = 'rgba(110,70,8,.35)'; ellipse(c, cx, cy, rx * 0.905, ry * 0.87); c.stroke();
  b.lineWidth = 46; b.strokeStyle = '#6a6a6a'; ellipse(b, cx, cy, rx * 0.905, ry * 0.87); b.stroke();
  const pr = [rx * 0.83, ry * 0.79];
  c.fillStyle = 'rgba(120,80,10,.32)'; ellipse(c, cx, cy, pr[0], pr[1]); c.fill();
  b.fillStyle = '#5c5c5c'; ellipse(b, cx, cy, pr[0], pr[1]); b.fill();
  c.lineWidth = 5; c.strokeStyle = 'rgba(90,55,4,.8)'; ellipse(c, cx, cy, pr[0] - 16, pr[1] - 16); c.stroke();
  b.lineWidth = 5; b.strokeStyle = '#3a3a3a'; ellipse(b, cx, cy, pr[0] - 16, pr[1] - 16); b.stroke();

  // engraved words: a light edge under a dark cut (colour), cut in (height)
  const engrave = (draw) => {
    c.fillStyle = 'rgba(255,240,190,.7)'; c.save(); c.translate(0, 3); draw(c); c.restore();
    c.fillStyle = '#5a3905'; draw(c);
    b.fillStyle = '#262626'; draw(b);
  };
  // raised work: a shadow, then polished gold (colour), standing up (height)
  const raise = (draw) => {
    c.save(); c.translate(4, 6); c.fillStyle = c.strokeStyle = 'rgba(70,40,0,.45)'; draw(c); c.restore();
    const rg = c.createLinearGradient(0, cy - 260, 0, cy + 120);
    rg.addColorStop(0, '#fff6cf'); rg.addColorStop(0.45, '#f1c95a'); rg.addColorStop(1, '#a87412');
    c.fillStyle = rg; c.strokeStyle = rg; draw(c);
    b.fillStyle = b.strokeStyle = '#c4c4c4'; draw(b);
  };
  const tr = [pr[0] - 74, pr[1] - 70];
  engrave(ctx => arcText(ctx, (o.venue || 'World Championship').toUpperCase(), cx, cy, tr[0], tr[1], true, 84, 0.68, 0.16));
  let fb = 56;
  engrave(ctx => { fb = arcText(ctx, ((o.style || 'Champion') + ' · ' + (o.year || new Date().getFullYear())).toUpperCase(), cx, cy, tr[0], tr[1], false, 50, 0.46, 0.2); });
  // the emblem with its laurels
  const ey = cy - FH * 0.13, er = FH * 0.138;
  raise(ctx => { emblem(ctx, o.mark, cx, ey, er); laurel(ctx, cx, ey, er, 1); laurel(ctx, cx, ey, er, -1); });
  // the winner: portrait and name, side by side under the emblem
  const name = String(o.name || 'Champion');
  // its space: from the laurels' lowest leaves down to the words round the bottom, centred between them, and kept
  // inside the oval those words run along (a long name gets smaller type, then a smaller portrait)
  const top0 = ey + er * 1.16, bot0 = cy + tr[1] - fb * 0.36, ay = (top0 + bot0) / 2;
  const ia = tr[0] - fb * 0.42 - 16, ib = tr[1] - fb * 0.42 - 16;
  const inside = (x, y) => Math.pow((x - cx) / ia, 2) + Math.pow((y - cy) / ib, 2) <= 1;
  // one line if it fits at a good size; otherwise a two-word-or-more name goes on two lines (split where the two
  // halves are most even), and only then does the type get smaller
  const words = name.trim().split(/\s+/), splits = [[name]];
  for (let k = 1; k < words.length; k++) splits.push([words.slice(0, k).join(' '), words.slice(k).join(' ')]);
  let nf = 76, ar = Math.min(FH * 0.068, (bot0 - top0) / 2 - 16), gap = 0, ax = 0, lines = [name];
  const lh = () => nf * 1.04;
  const fits = ls => {
    c.font = '700 ' + nf + 'px Georgia, "Times New Roman", serif';
    const ws = ls.map(l => c.measureText(l).width), nw = Math.max.apply(null, ws);
    gap = Math.round(ar * 0.32); ax = cx - (ar * 2 + gap + nw) / 2 + ar;
    for (let k = 0; k < 24; k++) { const t = k / 24 * Math.PI * 2; if (!inside(ax + Math.cos(t) * (ar + 6), ay + Math.sin(t) * (ar + 6))) return false; }
    return ls.every((l, i) => { const ly = ay + (i - (ls.length - 1) / 2) * lh(), x1 = ax + ar + gap + ws[i], h = nf * 0.42; return inside(x1, ly - h) && inside(x1, ly + h); });
  };
  const best = () => {   // the most even split that fits at this size
    let pick = null, diff = Infinity;
    splits.slice(1).forEach(ls => { c.font = '700 ' + nf + 'px Georgia, "Times New Roman", serif'; const d = Math.abs(c.measureText(ls[0]).width - c.measureText(ls[1]).width); if (d < diff && fits(ls)) { diff = d; pick = ls; } });
    return pick;
  };
  const solve = () => {
    if (fits([name])) return [name];
    return best();
  };
  let got = null;
  for (nf = 76; nf >= 62 && !(got = fits([name]) ? [name] : null); nf -= 2) {}
  if (!got) for (nf = 70; nf >= 46 && !(got = solve()); nf -= 2) {}
  if (!got) for (nf = 46; ar > FH * 0.045 && !(got = solve()); ar -= 2) {}
  if (!got) for (; nf > 28 && !(got = solve()); nf -= 2) {}
  lines = got || [name]; fits(lines);
  engrave(ctx => {
    ctx.font = '700 ' + nf + 'px Georgia, "Times New Roman", serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    lines.forEach((l, i) => ctx.fillText(l, ax + ar + gap, ay + 3 + (i - (lines.length - 1) / 2) * lh()));
  });
  // the cameo's frame, recessed, with the portrait standing up inside it
  c.lineWidth = 6; c.strokeStyle = '#6b4507'; ellipse(c, ax, ay, ar + 6, ar + 6); c.stroke();
  c.fillStyle = 'rgba(80,50,4,.5)'; ellipse(c, ax, ay, ar, ar); c.fill();
  b.fillStyle = '#4a4a4a'; ellipse(b, ax, ay, ar, ar); b.fill();
  const silhouette = () => raise(ctx => { ctx.save(); ellipse(ctx, ax, ay, ar - 4, ar - 4); ctx.clip(); person(ctx, ax, ay, ar * 0.95); ctx.restore(); });
  c.restore(); b.restore();
  const t = new THREE.CanvasTexture(cc); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  const bt = new THREE.CanvasTexture(bc);
  // the portrait: a photo becomes a gold cameo (its light and shade as relief); an icon is cut into the gold;
  // no picture, a silhouette. (Pictures load first, then the plate is redrawn.)
  const cameo = img => {
    const s = Math.round(ar * 2), tc = document.createElement('canvas'); tc.width = tc.height = s;
    const tx = tc.getContext('2d'), k = Math.max(s / img.width, s / img.height);
    tx.drawImage(img, (s - img.width * k) / 2, (s - img.height * k) / 2, img.width * k, img.height * k);
    const d = tx.getImageData(0, 0, s, s), hc = document.createElement('canvas'); hc.width = hc.height = s;
    const hx = hc.getContext('2d'), hd = hx.createImageData(s, s);
    for (let i = 0; i < d.data.length; i += 4) {
      const l = (d.data[i] * 0.3 + d.data[i + 1] * 0.59 + d.data[i + 2] * 0.11) / 255, a = d.data[i + 3] / 255;
      d.data[i] = 70 + l * 185; d.data[i + 1] = 44 + l * 190; d.data[i + 2] = 4 + l * 120; d.data[i + 3] = 255 * a;
      const h = 70 + l * 120; hd.data[i] = hd.data[i + 1] = hd.data[i + 2] = h; hd.data[i + 3] = 255 * a;
    }
    tx.putImageData(d, 0, 0); hx.putImageData(hd, 0, 0);
    [[c, tc], [b, hc]].forEach(([ctx, src]) => { ctx.save(); ellipse(ctx, ax, ay, ar - 4, ar - 4); ctx.clip(); ctx.drawImage(src, ax - ar, ay - ar, ar * 2, ar * 2); ctx.restore(); });
    t.needsUpdate = true; bt.needsUpdate = true;
  };
  const av = o.avatar || null;
  if (av && av.photo) { const img = new Image(); img.onload = () => cameo(img); img.onerror = () => { silhouette(); t.needsUpdate = bt.needsUpdate = true; }; img.src = av.photo; }
  else if (av && av.svg) {
    let src = String(av.svg).replace(/currentColor/g, '#000').replace(/stroke-width="[^"]*"/, 'stroke-width="2.4"');
    if (!/xmlns=/.test(src)) src = src.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
    src = src.replace('<svg', '<svg width="96" height="96"');
    const img = new Image();
    img.onload = () => {
      const s = Math.round(ar * 1.3), x0 = ax - s / 2, y0 = ay - s / 2;
      const ink = (ctx, col) => { const tc = document.createElement('canvas'); tc.width = tc.height = s; const tx = tc.getContext('2d'); tx.drawImage(img, 0, 0, s, s); tx.globalCompositeOperation = 'source-in'; tx.fillStyle = col; tx.fillRect(0, 0, s, s); ctx.drawImage(tc, x0, y0); };
      c.save(); c.translate(0, 3); ink(c, 'rgba(255,240,190,.7)'); c.restore(); ink(c, '#5a3905'); ink(b, '#1e1e1e');
      t.needsUpdate = bt.needsUpdate = true;
    };
    img.onerror = () => { silhouette(); t.needsUpdate = bt.needsUpdate = true; };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(src);
  } else silhouette();
  return [t, bt];
}

// a brilliant-cut stone: a flat table on a cone, faceted (flat shading makes each facet catch light on its own)
function stoneGeo(r) {
  const crown = new THREE.CylinderGeometry(r * 0.62, r, r * 0.38, 12, 1);
  crown.translate(0, r * 0.19, 0);
  const pav = new THREE.ConeGeometry(r, r * 0.85, 12, 1);
  pav.rotateX(Math.PI); pav.translate(0, -r * 0.42, 0);
  const g = new THREE.BufferGeometry();
  const a = crown.toNonIndexed(), p = pav.toNonIndexed();
  const pos = new Float32Array(a.attributes.position.array.length + p.attributes.position.array.length);
  pos.set(a.attributes.position.array, 0); pos.set(p.attributes.position.array, a.attributes.position.array.length);
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.computeVertexNormals();
  g.rotateX(Math.PI / 2);   // table facing +z (out of the plate)
  return g;
}

// ── Cash: $100 bills, banded $10,000 bundles stacked behind the bracelet, and (for a win) bills raining down ──────
const BILL = { w: 0.62, d: 0.264 };   // a bill's size in the scene (a real one is 2.35 to 1)
// the face of a bill: pale green-grey paper, a fine frame, a portrait in an oval, the blue security ribbon, 100s
function billTexture() {
  const W = 720, H = Math.round(W / 2.35), c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#dfe3d0'); g.addColorStop(0.5, '#cfd6c2'); g.addColorStop(1, '#d9dcc8');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  for (let i = 0; i < 2600; i++) { x.fillStyle = 'rgba(' + (Math.random() < 0.5 ? '60,90,70' : '255,255,255') + ',' + (Math.random() * 0.08) + ')'; x.fillRect(Math.random() * W, Math.random() * H, 1 + Math.random() * 2, 1); }
  // fine engraved lines (guilloche) across the paper
  x.strokeStyle = 'rgba(60,95,72,.16)'; x.lineWidth = 1;
  for (let k = 0; k < 26; k++) { x.beginPath(); for (let px = 0; px <= W; px += 6) x.lineTo(px, H * (0.12 + k * 0.03) + Math.sin(px / 23 + k) * 6); x.stroke(); }
  // the frame
  x.strokeStyle = '#3f5c47'; x.lineWidth = 6; x.strokeRect(12, 12, W - 24, H - 24);
  x.lineWidth = 2; x.strokeRect(24, 24, W - 48, H - 48);
  x.fillStyle = 'rgba(63,92,71,.55)'; for (let px = 30; px < W - 30; px += 9) { x.beginPath(); x.arc(px, 19, 2, 0, 7); x.arc(px, H - 19, 2, 0, 7); x.fill(); }
  // the portrait in its oval (a generic figure)
  const ox = W * 0.47, oy = H * 0.5;
  x.fillStyle = 'rgba(70,95,78,.22)'; x.beginPath(); x.ellipse(ox, oy, 74, 96, 0, 0, 7); x.fill();
  x.strokeStyle = '#3f5c47'; x.lineWidth = 4; x.beginPath(); x.ellipse(ox, oy, 74, 96, 0, 0, 7); x.stroke();
  x.save(); x.beginPath(); x.ellipse(ox, oy, 70, 92, 0, 0, 7); x.clip();
  const pg = x.createLinearGradient(ox - 60, oy - 80, ox + 60, oy + 90); pg.addColorStop(0, '#6f8a74'); pg.addColorStop(1, '#2f4636');
  x.fillStyle = pg; x.beginPath(); x.arc(ox, oy - 18, 34, 0, 7); x.fill();
  x.beginPath(); x.ellipse(ox, oy + 78, 66, 52, 0, Math.PI, 0); x.fill();
  x.fillStyle = 'rgba(40,60,46,.6)'; x.beginPath(); x.ellipse(ox - 4, oy - 44, 36, 18, -0.2, Math.PI, 0); x.fill();
  x.restore();
  // the blue security ribbon
  x.fillStyle = '#3d6fd6'; x.fillRect(W * 0.66, 0, 16, H);
  x.fillStyle = 'rgba(255,255,255,.45)'; for (let py = 6; py < H; py += 22) x.fillRect(W * 0.66 + 3, py, 10, 9);
  // the 100s
  x.fillStyle = '#2f4a38'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = '900 46px Georgia, serif';
  [[66, 58], [W - 66, 58], [66, H - 54], [W - 66, H - 54]].forEach(p => x.fillText('100', p[0], p[1]));
  x.font = '900 112px Georgia, serif'; x.fillStyle = '#9a7a3a'; x.fillText('100', W * 0.83, H * 0.6);
  x.font = '700 24px Georgia, serif'; x.fillStyle = '#2f4a38'; x.fillText('ONE HUNDRED DOLLARS', ox, H - 40);
  x.font = '700 20px Georgia, serif'; x.fillText('FEDERAL RESERVE NOTE', ox, 44);
  // a serial number in green
  x.font = '700 22px "Courier New", monospace'; x.fillStyle = '#2f7a4a'; x.fillText('LB 24680135 Q', W * 0.22, H * 0.3); x.fillText('LB 24680135 Q', W * 0.8, H * 0.86);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
// the edge of a bundle: a hundred sheets of paper
function edgeTexture() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64; const x = c.getContext('2d');
  x.fillStyle = '#d6dccb'; x.fillRect(0, 0, 256, 64);
  for (let y = 0; y < 64; y += 1.3) { x.fillStyle = 'rgba(' + (Math.random() < 0.5 ? '90,110,90' : '255,255,250') + ',' + (0.15 + Math.random() * 0.3) + ')'; x.fillRect(0, y, 256, 0.6); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
// the paper band round a bundle: mustard, printed $10,000
function bandTexture() {
  const c = document.createElement('canvas'); c.width = 128; c.height = 256; const x = c.getContext('2d');
  x.fillStyle = '#c9a03e'; x.fillRect(0, 0, 128, 256);
  x.fillStyle = 'rgba(0,0,0,.08)'; for (let i = 0; i < 400; i++) x.fillRect(Math.random() * 128, Math.random() * 256, 2, 1);
  x.save(); x.translate(64, 128); x.rotate(Math.PI / 2); x.fillStyle = '#5a3d0c'; x.font = '900 34px Georgia, serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('$10,000', 0, 0); x.restore();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
// a bill as a slightly bent sheet (paper never lies quite flat)
function billGeo(w, d, bend) {
  const g = new THREE.PlaneGeometry(w, d, 8, 2), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const u = p.getX(i) / w; p.setZ(i, Math.cos(u * Math.PI) * bend + Math.sin(p.getY(i) / d * 3) * bend * 0.3); }
  g.computeVertexNormals(); return g;
}
function cashScene(scene, opts) {
  const FLOOR = -0.8, bill = billTexture(), edge = edgeTexture(), band = bandTexture();
  const billMat = new THREE.MeshStandardMaterial({ map: bill, roughness: 0.78, metalness: 0, envMapIntensity: 0.5 });
  const edgeMat = new THREE.MeshStandardMaterial({ map: edge, roughness: 0.9, envMapIntensity: 0.4 });
  const bandMat = new THREE.MeshStandardMaterial({ map: band, roughness: 0.7, envMapIntensity: 0.5 });
  // a table under it all, the same velvet as the backdrop
  const table = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshStandardMaterial({ color: 0x2a0b12, roughness: 1, metalness: 0 }));
  table.rotation.x = -Math.PI / 2; table.position.y = FLOOR; scene.add(table);
  scene.fog = new THREE.Fog(0x14050a, 4.5, 11);
  // the bundles: piles of them, two side by side, a few layers high, left and right and behind
  const BH = 0.085, bundleGeo = new THREE.BoxGeometry(BILL.w, BH, BILL.d), strapGeo = new THREE.BoxGeometry(0.1, BH + 0.006, BILL.d + 0.006);
  // BoxGeometry faces: +x, -x, +y, -y, +z, -z
  // [x, z, layers, turn]: a wall of tall stacks at the back (their tops show over the bracelet), lower ones in front
  const piles = [];
  [-3.4, -2.6, -1.8, -1.0, -0.3, 0.4, 1.1, 1.9, 2.7, 3.5].forEach((x, i) => piles.push([x + (Math.random() - 0.5) * 0.15, -2.7 - (i % 2) * 0.35, 13 + Math.floor(Math.random() * 9), (Math.random() - 0.5) * 0.5]));
  [[-2.3, -1.6], [-1.45, -1.9], [1.5, -1.85], [2.35, -1.55]].forEach(c => piles.push([c[0], c[1], 6 + Math.floor(Math.random() * 5), (Math.random() - 0.5) * 0.9]));
  [[-1.85, -0.55], [1.9, -0.6], [-2.9, -0.4], [3.0, -0.5]].forEach(c => piles.push([c[0], c[1], 2 + Math.floor(Math.random() * 3), (Math.random() - 0.5) * 1.4]));
  let n = 0; piles.forEach(pl => { n += pl[2] * 2; });
  const bundles = new THREE.InstancedMesh(bundleGeo, [edgeMat, edgeMat, billMat, billMat, edgeMat, edgeMat], n), straps = new THREE.InstancedMesh(strapGeo, bandMat, n);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1), v = new THREE.Vector3();
  let k = 0;
  piles.forEach(pl => {
    for (let layer = 0; layer < pl[2]; layer++) for (let side = 0; side < 2; side++) {
      const yaw = pl[3] + (Math.random() - 0.5) * 0.08;
      v.set((Math.random() - 0.5) * 0.03, 0, (side - 0.5) * (BILL.d + 0.012) + (Math.random() - 0.5) * 0.02).applyAxisAngle(new THREE.Vector3(0, 1, 0), pl[3]);
      p.set(pl[0] + v.x, FLOOR + BH / 2 + layer * (BH + 0.002), pl[1] + v.z);
      e.set((Math.random() - 0.5) * 0.015, yaw, (Math.random() - 0.5) * 0.015); q.setFromEuler(e); m.compose(p, q, one);
      bundles.setMatrixAt(k, m); straps.setMatrixAt(k, m); k++;
    }
  });
  scene.add(bundles, straps);
  // loose bills scattered on the table
  const looseN = 26, loose = new THREE.InstancedMesh(billGeo(BILL.w * 0.6, BILL.d * 0.6, 0.012), new THREE.MeshStandardMaterial({ map: bill, roughness: 0.8, side: THREE.DoubleSide, envMapIntensity: 0.5 }), looseN);
  for (let i = 0; i < looseN; i++) {
    const a = Math.random() * Math.PI * 2, r = 1.3 + Math.random() * 2.4;
    p.set(Math.cos(a) * r * 1.4, FLOOR + 0.004 + i * 0.0006, -Math.abs(Math.sin(a)) * r - 0.3);
    e.set(-Math.PI / 2, 0, Math.random() * Math.PI * 2); q.setFromEuler(e); m.compose(p, q, one); loose.setMatrixAt(i, m);
  }
  scene.add(loose);
  // a warm light from behind, so the stacks stand out from the dark
  const rim = new THREE.PointLight(0xffd9a0, 6, 9); rim.position.set(0, 1.6, -4.2); scene.add(rim);
  const fill = new THREE.PointLight(0xfff0d8, 3, 8); fill.position.set(-2.5, 0.6, 1.2); scene.add(fill);

  // the rain: bills falling, fluttering and turning over, landing on the table and staying there
  if (!opts.rain) return { update() {} };
  const RN = 260, rain = new THREE.InstancedMesh(billGeo(BILL.w * 0.62, BILL.d * 0.62, 0.02), new THREE.MeshStandardMaterial({ map: bill, roughness: 0.75, side: THREE.DoubleSide, envMapIntensity: 0.5 }), RN);
  const st = [];
  for (let i = 0; i < RN; i++) {
    st.push({
      x: (Math.random() - 0.5) * 5.6, z: -2.6 + Math.random() * 3.8, y0: 1.3 + Math.random() * 6.5, vy: 0.42 + Math.random() * 0.4, y: 9,
      sw: 0.2 + Math.random() * 0.35, ph: Math.random() * 7, w: 1.6 + Math.random() * 2.4, yaw: Math.random() * 7, spin: (Math.random() - 0.5) * 2.4, landed: false
    });
  }
  rain.frustumCulled = false; scene.add(rain);
  return {
    update(tt) {
      const ft = Math.max(0, tt - 0.5);   // (worked out from the time, so a slow device shows the same fall)
      st.forEach((b, i) => {
        if (!b.landed) {
          // it drifts slower as it flips flat and faster as it turns on edge
          b.y = b.y0 - b.vy * ft - Math.cos(ft * b.w + b.ph) * 0.06;
          b.cur = b.yaw + b.spin * ft;
          if (b.y <= FLOOR + 0.006) { b.y = FLOOR + 0.006 + (i % 40) * 0.0005; b.landed = true; }
        }
        const sway = b.landed ? 0 : Math.sin(tt * b.w * 0.5 + b.ph) * b.sw;
        p.set(b.x + sway, b.y, b.z);
        if (b.landed) e.set(-Math.PI / 2, 0, b.cur || b.yaw);
        else e.set(-Math.PI / 2 + Math.sin(tt * b.w + b.ph) * 1.1, Math.cos(tt * b.w * 0.7 + b.ph) * 0.7, b.cur || b.yaw);
        q.setFromEuler(e); m.compose(p, q, one); rain.setMatrixAt(i, m);
      });
      rain.instanceMatrix.needsUpdate = true;
    }
  };
}

// ── The Summer Series champion's ring: silver, a round crown set with a coloured stone in a halo of diamonds, the
// event and the winner's name round the crown, CHAMPION and the year on one shank, the series on the other ─────────────────────
const RG = { r0: 0.48, r1: 0.6, w: 0.34 };     // the band: inside and outside radius, width
const CROWN = { r: 0.34, d: 0.2 };            // the round top
const CROWN_Z = RG.r1 + CROWN.d / 2 - 0.05;   // its centre, out from the finger
const RING_FRONT = CROWN_Z + CROWN.d / 2;
// letters round a circle: centred on angle a (radians, canvas: 0 = right, π/2 = down); bottom: read along the bottom
function circText(ctx, text, cx, cy, r, a, size, spacing, bottom, maxSpan) {
  let f = size, ws, tot;
  do {
    ctx.font = '700 ' + f + 'px Georgia, "Times New Roman", serif';
    ws = Array.from(text).map(ch => ctx.measureText(ch).width + f * spacing);
    tot = ws.reduce((x, y) => x + y, 0) - f * spacing;
    if (tot / r <= maxSpan) break; f -= 2;
  } while (f > 16);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  let s = -tot / 2;
  Array.from(text).forEach((ch, k) => {
    const mid = s + (ws[k] - f * spacing) / 2, ang = bottom ? a - mid / r : a + mid / r;
    ctx.save(); ctx.translate(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r); ctx.rotate(bottom ? ang - Math.PI / 2 : ang + Math.PI / 2); ctx.fillText(ch, 0, 0); ctx.restore();
    s += ws[k];
  });
}
function silverCanvas(W, H) {
  const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#f4f6f8'); g.addColorStop(0.45, '#c9ced6'); g.addColorStop(0.7, '#9aa1ab'); g.addColorStop(1, '#e8ebef');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  for (let i = 0; i < H; i += 3) { x.fillStyle = 'rgba(255,255,255,' + Math.random() * 0.07 + ')'; x.fillRect(0, i, W, 1); }
  const b = document.createElement('canvas'); b.width = W; b.height = H; const y = b.getContext('2d'); y.fillStyle = '#808080'; y.fillRect(0, 0, W, H);
  return [c, x, b, y];
}
// the crown's face: a sunburst under the stone, the event round the top, the winner's name round the bottom
function crownFace(o) {
  const N = 1024, [c, x, b, y] = silverCanvas(N, N), C = N / 2, cut = (ctx, col, draw) => { ctx.fillStyle = col; draw(ctx); };
  // the rim and a recessed ring for the words
  [[x, 'rgba(60,66,76,.35)'], [y, '#5c5c5c']].forEach(([ctx, col]) => { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(C, C, N * 0.47, 0, 7); ctx.arc(C, C, N * 0.33, 0, 7, true); ctx.fill(); });
  // a sunburst behind the stone
  for (let k = 0; k < 48; k++) { const a = k / 48 * Math.PI * 2; [[x, k % 2 ? 'rgba(255,255,255,.35)' : 'rgba(70,76,88,.35)'], [y, k % 2 ? '#a8a8a8' : '#6a6a6a']].forEach(([ctx, col]) => { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(C, C); ctx.arc(C, C, N * 0.31, a, a + Math.PI / 48); ctx.fill(); }); }
  const words = (ctx, col, dy) => {
    ctx.fillStyle = col; ctx.save(); ctx.translate(0, dy);
    circText(ctx, String(o.venue || 'Summer Series').toUpperCase(), C, C, N * 0.4, -Math.PI / 2, 70, 0.14, false, 2.6);
    circText(ctx, String(o.name || 'Champion').toUpperCase(), C, C, N * 0.4, Math.PI / 2, 62, 0.16, true, 2.3);
    ctx.restore();
  };
  words(x, 'rgba(255,255,255,.7)', 3); words(x, '#2c3138', 0); words(y, '#262626', 0);
  // stars either side
  [-1, 1].forEach(sd => [[x, '#3a4049'], [y, '#2a2a2a']].forEach(([ctx, col]) => {
    ctx.fillStyle = col; ctx.beginPath(); const sx = C + sd * N * 0.4, sy = C;
    for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? 9 : 22; ctx.lineTo(sx + Math.cos(a) * rr, sy + Math.sin(a) * rr); }
    ctx.closePath(); ctx.fill();
  }));
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return [t, new THREE.CanvasTexture(b)];
}
// a shank's side: words round the band above and below the crown. front: which way the crown is in the picture
function shankFace(top, bottom, front) {
  const N = 1024, [c, x, b, y] = silverCanvas(N, N), C = N / 2, r = (RG.r0 + RG.r1) / 2 / RG.r1 * C;
  // the crown is at the right of the picture (front 1) or the left (-1): the words sit just above and below it
  const up = front > 0 ? -Math.PI * 0.36 : -Math.PI * 0.64, dn = front > 0 ? Math.PI * 0.36 : Math.PI * 0.64;
  const words = (ctx, col, dy) => {
    ctx.fillStyle = col; ctx.save(); ctx.translate(0, dy);
    circText(ctx, top.toUpperCase(), C, C, r, up, 64, 0.12, false, 1.05);
    circText(ctx, bottom.toUpperCase(), C, C, r, dn, 64, 0.12, true, 1.05);
    ctx.restore();
  };
  words(x, 'rgba(255,255,255,.7)', 3); words(x, '#2c3138', 0); words(y, '#222', 0);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return [t, new THREE.CanvasTexture(b)];
}
function buildRing(piece, o, diamond) {
  const silver = new THREE.MeshPhysicalMaterial({ color: 0xdfe4ea, metalness: 1, roughness: 0.2, clearcoat: 0.4, clearcoatRoughness: 0.15, envMapIntensity: 1.05 });
  // the band: a rounded-square profile turned round the finger (the finger runs left to right)
  const pts = [], rr = 0.03, hw = RG.w / 2;
  const corner = (cx, cy, a0) => { for (let k = 0; k <= 6; k++) { const a = a0 + k / 6 * Math.PI / 2; pts.push(new THREE.Vector2(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr)); } };
  corner(RG.r0 + rr, -hw + rr, Math.PI); corner(RG.r1 - rr, -hw + rr, -Math.PI / 2); corner(RG.r1 - rr, hw - rr, 0); corner(RG.r0 + rr, hw - rr, Math.PI / 2);
  pts.push(pts[0].clone());
  const band = new THREE.LatheGeometry(pts, 160); band.rotateZ(Math.PI / 2);
  piece.add(new THREE.Mesh(band, silver));
  // the shanks' words: the winner's name on one side, the series and the year on the other
  const side = (tex, sx) => {
    const g = new THREE.RingGeometry(RG.r0 + 0.012, RG.r1 - 0.012, 160, 1);
    const mt = new THREE.MeshPhysicalMaterial({ map: tex[0], bumpMap: tex[1], bumpScale: 2.4, metalness: 0.85, roughness: 0.25, envMapIntensity: 1.2 });
    const m = new THREE.Mesh(g, mt); m.rotation.y = sx > 0 ? Math.PI / 2 : -Math.PI / 2; m.position.x = sx * (hw + 0.002); piece.add(m);
  };
  side(shankFace('Champion', String(o.year || new Date().getFullYear()), 1), -1);
  side(shankFace('Summer Series', String(o.venue || ''), -1), 1);
  // the crown: a round top with a bevelled rim
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(CROWN.r, CROWN.r * 0.82, CROWN.d, 96, 1), silver);
  crown.rotation.x = Math.PI / 2; crown.position.z = CROWN_Z; piece.add(crown);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(CROWN.r - 0.012, 0.022, 16, 120), silver); rim.position.z = RING_FRONT; piece.add(rim);
  const [ft, fb] = crownFace(o);
  const face = new THREE.Mesh(new THREE.CircleGeometry(CROWN.r - 0.03, 96), new THREE.MeshPhysicalMaterial({ map: ft, bumpMap: fb, bumpScale: 3, metalness: 0.8, roughness: 0.28, envMapIntensity: 1.2, emissive: 0xffffff, emissiveMap: ft, emissiveIntensity: 0.12 }));
  face.position.z = RING_FRONT + 0.002; piece.add(face);
  // the stone, its setting, and the halo of diamonds round it
  const gem = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(o.gem || '#b3122e'), metalness: 0, roughness: 0.02, transmission: 0.55, thickness: 0.4, ior: 1.77, clearcoat: 1, envMapIntensity: 2.2, flatShading: true, attenuationColor: new THREE.Color(o.gem || '#b3122e'), attenuationDistance: 0.3 });
  const center = new THREE.Mesh(stoneGeo(0.13), gem); center.position.z = RING_FRONT + 0.03; piece.add(center);
  const setting = new THREE.Mesh(new THREE.TorusGeometry(0.135, 0.014, 12, 64), silver); setting.position.z = RING_FRONT + 0.02; piece.add(setting);
  const HN = 22, halo = new THREE.InstancedMesh(stoneGeo(0.019), diamond, HN), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3();
  for (let k = 0; k < HN; k++) { const a = k / HN * Math.PI * 2; p.set(Math.cos(a) * 0.178, Math.sin(a) * 0.178, RING_FRONT + 0.012); m4.compose(p, q, one); halo.setMatrixAt(k, m4); }
  piece.add(halo);
  // little diamonds down each side of the crown
  const SN = 9, sides = new THREE.InstancedMesh(stoneGeo(0.016), diamond, SN * 2), up = new THREE.Vector3(0, 1, 0);
  for (let k = 0; k < SN; k++) for (const sx of [-1, 1]) {
    const a = (k - (SN - 1) / 2) * 0.13;   // round the band, centred on the crown
    p.set(sx * (hw - 0.04), Math.sin(a) * (RG.r1 + 0.008), Math.cos(a) * (RG.r1 + 0.008));
    q.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -a); m4.compose(p, q, one); sides.setMatrixAt(k * 2 + (sx > 0 ? 1 : 0), m4);
  }
  piece.add(sides);
}

window.Bracelet3D = function (host, opts) {
  if (!supported()) return null;
  opts = opts || {};
  const w = host.clientWidth || 320, h = host.clientHeight || 240;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(w, h);
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.95;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  host.appendChild(renderer.domElement);
  renderer.domElement.style.cssText = 'width:100%;height:100%;display:block;';

  const scene = new THREE.Scene();
  // a jeweller's velvet behind it
  const bg = document.createElement('canvas'); bg.width = 512; bg.height = 512;
  const bx = bg.getContext('2d'), rg = bx.createRadialGradient(256, 230, 20, 256, 256, 360);
  rg.addColorStop(0, '#4a1420'); rg.addColorStop(0.55, '#24080e'); rg.addColorStop(1, '#0b0306');
  bx.fillStyle = rg; bx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 9000; i++) { bx.fillStyle = 'rgba(255,255,255,' + (Math.random() * 0.025) + ')'; bx.fillRect(Math.random() * 512, Math.random() * 512, 1, 1); }
  const bgT = new THREE.CanvasTexture(bg); bgT.colorSpace = THREE.SRGBColorSpace; scene.background = bgT;
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  const camera = new THREE.PerspectiveCamera(30, w / h, 0.1, 50);
  // close on the plate: it fills most of the height, with some band either side (further back on a narrow screen)
  const front = opts.ring ? RING_FRONT : RP + PD / 2 + BEV, tan = Math.tan(15 * Math.PI / 180), dist = opts.ring ? Math.max(1.6 / (2 * tan), 1.6 / (2 * tan * (w / h))) : Math.max(1.22 / (2 * tan), 1.75 / (2 * tan * (w / h)));
  const camEnd = new THREE.Vector3(0, 0.12, front + dist), camStart = new THREE.Vector3(0, 1.1, front + dist + 2.4);
  camera.position.copy(camStart);

  const gold = new THREE.MeshPhysicalMaterial({ color: 0xf2c14e, metalness: 1, roughness: 0.16, clearcoat: 0.7, clearcoatRoughness: 0.12, envMapIntensity: 1.35 });
  const goldSide = new THREE.MeshPhysicalMaterial({ color: 0xd9a63a, metalness: 1, roughness: 0.34, envMapIntensity: 1.1 });
  const stone = new THREE.MeshPhysicalMaterial({ color: 0xdfe9f5, metalness: 0.1, roughness: 0.02, ior: 2.4, reflectivity: 1, clearcoat: 1, envMapIntensity: 1.6, flatShading: true });

  const piece = new THREE.Group(); scene.add(piece);
  if (opts.ring) buildRing(piece, opts, stone);
  else {
  // the band: centre links (polished) between side links (brushed), each a little rounded block on the ring
  const centreGeo = new RoundedBoxGeometry(0.15, 0.2, 0.07, 3, 0.03);
  const sideGeo = new RoundedBoxGeometry(0.13, 0.09, 0.06, 2, 0.025);
  const plateGap = 2 * (PA / RP) - 0.16;   // the part of the ring (radians, at the front) the plate covers
  const centres = new THREE.InstancedMesh(centreGeo, gold, LINKS), sides = new THREE.InstancedMesh(sideGeo, goldSide, LINKS * 2);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  let nc = 0, ns = 0;
  for (let i = 0; i < LINKS; i++) {
    const a = (i + 0.5) / LINKS * Math.PI * 2;   // a = 0 is the front (facing the camera, +z)
    const d = Math.atan2(Math.sin(a), Math.cos(a));
    if (Math.abs(d) < plateGap / 2) continue;
    q.setFromAxisAngle(up, a);
    p.set(Math.sin(a) * R, 0, Math.cos(a) * R); m.compose(p, q, s); centres.setMatrixAt(nc++, m);
    for (const dy of [-0.15, 0.15]) {
      const a2 = a + Math.PI / LINKS;
      q.setFromAxisAngle(up, a2); p.set(Math.sin(a2) * R * 0.995, dy, Math.cos(a2) * R * 0.995); m.compose(p, q, s); sides.setMatrixAt(ns++, m);
    }
  }
  centres.count = nc; sides.count = ns;
  piece.add(centres, sides);

  // the plate: an oval of gold, curved round the wrist, with its face and its ring of stones
  const plate = new THREE.Group(); piece.add(plate);
  const shape = new THREE.Shape(); shape.absellipse(0, 0, PA - BEV, PB - BEV, 0, Math.PI * 2, false, 0);
  const body = bend(new THREE.ExtrudeGeometry(shape, { depth: PD, bevelEnabled: true, bevelThickness: BEV, bevelSize: BEV, bevelSegments: 5, curveSegments: 96 }), RP - PD / 2);
  plate.add(new THREE.Mesh(body, gold));
  const top = RP + PD / 2 + BEV;   // the radius of the plate's front
  const [faceT, faceB] = plateFace(opts);
  const face = new THREE.Mesh(bend(new THREE.PlaneGeometry(2 * (PA - BEV), 2 * (PB - BEV), 80, 40), top + 0.003),
    new THREE.MeshPhysicalMaterial({ map: faceT, bumpMap: faceB, bumpScale: 3.2, metalness: 0.7, roughness: 0.34, envMapIntensity: 1, emissive: 0xffffff, emissiveMap: faceT, emissiveIntensity: 0.2, alphaTest: 0.5 }));
  plate.add(face);
  // a stone on the curved face: where it sits, turned to face out
  const seat = (x, y, lift, k, mesh) => { const th = x / RP, r = top + lift; p.set(Math.sin(th) * r, y, Math.cos(th) * r); q.setFromAxisAngle(up, th); m.compose(p, q, s); mesh.setMatrixAt(k, m); };
  const SN = 52, big = [0, SN / 4, SN / 2, 3 * SN / 4], sx = (PA - BEV) * 0.905, sy = (PB - BEV) * 0.87;
  const stones = new THREE.InstancedMesh(stoneGeo(0.022), stone, SN - big.length), corners = new THREE.InstancedMesh(stoneGeo(0.034), stone, big.length);
  let ks = 0, kb = 0;
  for (let k = 0; k < SN; k++) {
    const t = k / SN * Math.PI * 2, x = Math.cos(t) * sx, y = Math.sin(t) * sy;
    if (big.indexOf(k) >= 0) seat(x, y, 0.016, kb++, corners); else seat(x, y, 0.01, ks++, stones);
  }
  plate.add(stones, corners);
  }

  const cash = cashScene(scene, opts);
  // lights that move: they make the stones flash as the piece turns
  const key = new THREE.PointLight(0xffffff, 9, 12); key.position.set(2.2, 2.6, 3.4); scene.add(key);
  const glint = new THREE.PointLight(0xfff4d6, 7, 10); scene.add(glint);
  scene.add(new THREE.AmbientLight(0xffffff, 0.12));

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(w, h), 0.3, 0.25, 0.93); composer.addPass(bloom);
  composer.addPass(new OutputPass());

  // the light follows the device's tilt or your finger; while nothing moves, the piece turns gently on its own
  let gx = 0, gy = 0, tx = 0, ty = 0, last = 0, dead = false;
  const onTilt = e => { if (e.gamma == null) return; gx = Math.max(-1, Math.min(1, e.gamma / 35)); gy = Math.max(-1, Math.min(1, ((e.beta || 45) - 45) / 35)); last = performance.now(); };
  const onMove = e => { const pt = e.touches ? e.touches[0] : e; if (!pt) return; gx = (pt.clientX / innerWidth - 0.5) * 2; gy = (pt.clientY / innerHeight - 0.5) * 2; last = performance.now(); };
  window.addEventListener('deviceorientation', onTilt);
  window.addEventListener('pointermove', onMove);
  window.addEventListener('touchmove', onMove, { passive: true });
  const t0 = performance.now(), look = opts.ring ? new THREE.Vector3(0, 0.16, 0.2) : new THREE.Vector3(0, -0.01, front - 0.3);
  function frame(now) {
    if (dead) return;
    if (!host.isConnected) return api.dispose();
    const tt = (now - t0) / 1000, idle = now - last > 2500;
    const ax = idle ? Math.sin(tt * (opts.ring ? 0.32 : 0.45)) * (opts.ring ? 1 : 0.45) : gx, ay = idle ? Math.sin(tt * 0.31) * 0.25 : gy;
    tx += (ax - tx) * 0.08; ty += (ay - ty) * 0.08;
    // it comes out of the dark turning, and the camera moves in on the plate
    const intro = Math.min(1, tt / 1.8), ease = 1 - Math.pow(1 - intro, 3);
    // (the ring turns further, so each shank's words come round in turn)
    piece.rotation.y = tx * (opts.ring ? 0.85 : 0.42) + (1 - ease) * -2.6;
    piece.rotation.x = (opts.ring ? 0.32 : 0.05) + ty * 0.16;
    piece.position.y = (1 - ease) * 0.6;
    camera.position.lerpVectors(camStart, camEnd, ease); camera.lookAt(look);
    glint.position.set(Math.sin(tt * 1.3 + tx * 3) * 2.2, 1.2 + Math.cos(tt * 0.9 + ty * 2) * 0.8, 2.6);
    cash.update(tt);
    composer.render();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  const api = {
    askMotion() { try { if (window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === 'function') DeviceOrientationEvent.requestPermission().catch(() => {}); } catch (e) {} },
    dispose() {
      if (dead) return; dead = true;
      window.removeEventListener('deviceorientation', onTilt); window.removeEventListener('pointermove', onMove); window.removeEventListener('touchmove', onMove);
      scene.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) [].concat(o.material).forEach(mt => { if (mt.map) mt.map.dispose(); if (mt.bumpMap) mt.bumpMap.dispose(); mt.dispose(); }); });
      pmrem.dispose(); composer.dispose && composer.dispose(); renderer.dispose();
      if (renderer.domElement.parentNode) renderer.domElement.remove();
    }
  };
  return api;
};
