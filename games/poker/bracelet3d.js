// The championship bracelet as a real 3D piece (three.js r160): a band of polished gold links in a ring, and an
// oval champion's plate curved to the wrist and set with a ring of diamonds. On the plate: the event's name engraved
// round the top, the event's emblem raised in the middle, the winner's portrait (a cameo of their avatar) and name
// under it, the event and year round the bottom. Studio light reflects off the gold; the stones flash as the piece
// turns, and it follows the device's tilt (or your finger / pointer). Loaded on demand by poker.html:
//   window.Bracelet3D(host, {venue, style, year, mark, name, avatar}) -> {dispose(), askMotion()}   (null: no WebGL)
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
  let nf = 76, ar = Math.min(FH * 0.068, (bot0 - top0) / 2 - 16), gap = 0, nw = 0, ax = 0;
  const fits = () => {
    c.font = '700 ' + nf + 'px Georgia, "Times New Roman", serif';
    nw = c.measureText(name).width; gap = Math.round(ar * 0.32);
    ax = cx - (ar * 2 + gap + nw) / 2 + ar;
    for (let k = 0; k < 24; k++) { const t = k / 24 * Math.PI * 2; if (!inside(ax + Math.cos(t) * (ar + 6), ay + Math.sin(t) * (ar + 6))) return false; }
    const x1 = ax + ar + gap + nw, h = nf * 0.42;
    return inside(x1, ay - h) && inside(x1, ay + h);
  };
  while (!fits() && nf > 50) nf -= 2;
  while (!fits() && ar > FH * 0.045) ar -= 2;
  while (!fits() && nf > 28) nf -= 2;
  engrave(ctx => { ctx.font = '700 ' + nf + 'px Georgia, "Times New Roman", serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(name, ax + ar + gap, ay + 3); });
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

window.Bracelet3D = function (host, opts) {
  if (!supported()) return null;
  opts = opts || {};
  const w = host.clientWidth || 320, h = host.clientHeight || 240;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
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
  const front = RP + PD / 2 + BEV, tan = Math.tan(15 * Math.PI / 180), dist = Math.max(1.22 / (2 * tan), 1.75 / (2 * tan * (w / h)));
  const camEnd = new THREE.Vector3(0, 0.12, front + dist), camStart = new THREE.Vector3(0, 1.1, front + dist + 2.4);
  camera.position.copy(camStart);

  const gold = new THREE.MeshPhysicalMaterial({ color: 0xf2c14e, metalness: 1, roughness: 0.16, clearcoat: 0.7, clearcoatRoughness: 0.12, envMapIntensity: 1.35 });
  const goldSide = new THREE.MeshPhysicalMaterial({ color: 0xd9a63a, metalness: 1, roughness: 0.34, envMapIntensity: 1.1 });
  const stone = new THREE.MeshPhysicalMaterial({ color: 0xdfe9f5, metalness: 0.1, roughness: 0.02, ior: 2.4, reflectivity: 1, clearcoat: 1, envMapIntensity: 1.6, flatShading: true });

  const piece = new THREE.Group(); scene.add(piece);
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
  const t0 = performance.now(), look = new THREE.Vector3(0, -0.01, front - 0.3);
  function frame(now) {
    if (dead) return;
    if (!host.isConnected) return api.dispose();
    const tt = (now - t0) / 1000, idle = now - last > 2500;
    const ax = idle ? Math.sin(tt * 0.45) * 0.45 : gx, ay = idle ? Math.sin(tt * 0.31) * 0.25 : gy;
    tx += (ax - tx) * 0.08; ty += (ay - ty) * 0.08;
    // it comes out of the dark turning, and the camera moves in on the plate
    const intro = Math.min(1, tt / 1.8), ease = 1 - Math.pow(1 - intro, 3);
    piece.rotation.y = tx * 0.42 + (1 - ease) * -2.6;
    piece.rotation.x = 0.05 + ty * 0.16;
    piece.position.y = (1 - ease) * 0.6;
    camera.position.lerpVectors(camStart, camEnd, ease); camera.lookAt(look);
    glint.position.set(Math.sin(tt * 1.3 + tx * 3) * 2.2, 1.2 + Math.cos(tt * 0.9 + ty * 2) * 0.8, 2.6);
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
