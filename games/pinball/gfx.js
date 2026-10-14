// ═══════════════════════════════════════════════════════════════════════════
// Pinball graphics helpers: materials library, procedural textures, geometry
// builders, static-geometry batching. Everything is built in TABLE SPACE
// (millimetres, x across, y up the table, z up from the playfield); the
// engine puts it all in one group that maps table space into the world.
// ═══════════════════════════════════════════════════════════════════════════
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export { THREE };
const PI = Math.PI, TAU = PI * 2;

// ── Canvas helpers ────────────────────────────────────────────────────────
export function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
export function canvasTex(c, o = {}) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = o.linear ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  t.anisotropy = o.aniso || 4;
  if (o.repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(o.repeat[0], o.repeat[1]); }
  if (o.nearest) { t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; }
  return t;
}
export function rng(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
export function hexRgb(h) { const c = new THREE.Color(h); return [c.r * 255 | 0, c.g * 255 | 0, c.b * 255 | 0]; }
export function rgba(h, a) { const c = hexRgb(h); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }
export function shade(h, k) { const c = new THREE.Color(h); if (k > 0) c.lerp(new THREE.Color(1, 1, 1), k); else c.multiplyScalar(1 + k); return '#' + c.getHexString(); }

// Wood grain (cabinet sides, playfield edges)
export function woodCanvas(w, h, base, seed, o = {}) {
  const c = canvas(w, h), g = c.getContext('2d'), r = rng(seed || 7);
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  const dark = shade(base, -0.35), light = shade(base, 0.12);
  for (let i = 0; i < (o.lines || 140); i++) {
    const y = r() * h, a = 0.05 + r() * 0.16, th = 0.6 + r() * 2.4, amp = 2 + r() * 7, f = 0.002 + r() * 0.01, ph = r() * 9;
    g.strokeStyle = rgba(r() < 0.7 ? dark : light, a); g.lineWidth = th; g.beginPath();
    for (let x = 0; x <= w; x += 8) { const yy = y + Math.sin(x * f + ph) * amp + Math.sin(x * f * 3.1 + ph * 2) * amp * 0.3; x ? g.lineTo(x, yy) : g.moveTo(x, yy); }
    g.stroke();
  }
  for (let i = 0; i < (o.knots || 3); i++) {   // knots
    const x = r() * w, y = r() * h, rx = 6 + r() * 14;
    for (let k = 5; k > 0; k--) { g.strokeStyle = rgba(dark, 0.12); g.lineWidth = 1.5; g.beginPath(); g.ellipse(x, y, rx * k / 3, rx * k / 9, 0, 0, TAU); g.stroke(); }
  }
  return c;
}
// fine noise for roughness / scuffs
export function noiseCanvas(w, h, lo, hi, seed, o = {}) {
  const c = canvas(w, h), g = c.getContext('2d'), r = rng(seed || 3), im = g.createImageData(w, h);
  for (let i = 0; i < w * h; i++) { const v = lo + (hi - lo) * r(); im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = v; im.data[i * 4 + 3] = 255; }
  g.putImageData(im, 0, 0);
  if (o.scratches) {
    g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 0.6;
    for (let i = 0; i < o.scratches; i++) { const x = r() * w, y = r() * h, a = r() * TAU, l = 4 + r() * 30; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
  }
  return c;
}
// radial glow sprite
export function glowCanvas(size = 128, stops) {
  const c = canvas(size, size), g = c.getContext('2d'), gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  (stops || [[0, 'rgba(255,255,255,1)'], [0.25, 'rgba(255,255,255,.55)'], [0.6, 'rgba(255,255,255,.12)'], [1, 'rgba(255,255,255,0)']]).forEach(s => gr.addColorStop(s[0], s[1]));
  g.fillStyle = gr; g.fillRect(0, 0, size, size); return c;
}

// Soft radial glow at a point (alpha k at the centre, fading to nothing at r)
export function glowAt(g, x, y, r, color, k = 1) {
  const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, rgba(color, k)); gr.addColorStop(0.4, rgba(color, k * 0.35)); gr.addColorStop(1, rgba(color, 0));
  g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
}
// Fine print grain over a canvas (an airbrushed translite is never perfectly flat): n flecks, alpha a
export function grain(g, w, h, n, a, seed = 5) {
  const r = rng(seed); g.save();
  for (let i = 0; i < n; i++) { g.fillStyle = 'rgba(' + (r() < 0.5 ? '0,0,0' : '255,255,255') + ',' + (a * (0.4 + r() * 0.6)).toFixed(3) + ')'; const s = 0.6 + r() * 1.4; g.fillRect(r() * w, r() * h, s, s); }
  g.restore();
}
// Logo lettering built in layers, the way a backglass title is: an outer glow, a hard drop shadow, a thick
// outline, the face (a colour, or a function (x0, y0, x1, y1) of the text box returning a gradient), an inline
// stroke, and a highlight over the top part of the letters (a bevel or chrome catch-light).
//   textLogo(g, 'TITLE', x, y, { font, align, base, spacing, glow: {color, blur, alpha}, shadow: {dx, dy, color, blur},
//                                outline: {color, w}, fill, inline: {color, w}, top: {color, frac}, scaleX })
// Returns the text box {x0, y0, x1, y1}.
export function textLogo(g, str, x, y, o = {}) {
  g.save();
  g.font = o.font; g.textAlign = o.align || 'center'; g.textBaseline = o.base || 'middle'; g.lineJoin = 'round'; g.lineCap = 'round';
  if (o.spacing) try { g.letterSpacing = o.spacing + 'px'; } catch (e) {}
  if (o.scaleX && o.scaleX !== 1) { g.translate(x, y); g.scale(o.scaleX, 1); g.translate(-x, -y); }
  const m = g.measureText(str), asc = m.actualBoundingBoxAscent || m.fontBoundingBoxAscent || 0, desc = m.actualBoundingBoxDescent || 0;
  const half = m.width / 2, x0 = g.textAlign === 'left' ? x : g.textAlign === 'right' ? x - m.width : x - half, x1 = x0 + m.width;
  const y0 = y - (g.textBaseline === 'middle' ? asc : g.textBaseline === 'alphabetic' ? asc : asc), y1 = y + desc;
  const box = { x0, y0, x1, y1 };
  if (o.glow) { g.save(); g.shadowColor = o.glow.color; g.shadowBlur = o.glow.blur || 24; g.fillStyle = rgba(o.glow.color, o.glow.alpha != null ? o.glow.alpha : 0.9); g.fillText(str, x, y); if (o.glow.twice) g.fillText(str, x, y); g.restore(); }
  if (o.shadow) { g.save(); if (o.shadow.blur) { g.shadowColor = o.shadow.color; g.shadowBlur = o.shadow.blur; g.shadowOffsetX = o.shadow.dx; g.shadowOffsetY = o.shadow.dy; g.fillStyle = '#000'; } else g.fillStyle = o.shadow.color; g.fillText(str, x + (o.shadow.blur ? 0 : o.shadow.dx), y + (o.shadow.blur ? 0 : o.shadow.dy)); if (o.outline && !o.shadow.blur) { g.strokeStyle = o.shadow.color; g.lineWidth = o.outline.w; g.strokeText(str, x + o.shadow.dx, y + o.shadow.dy); } g.restore(); }
  if (o.outline) { g.strokeStyle = o.outline.color; g.lineWidth = o.outline.w; g.strokeText(str, x, y); }
  const fill = typeof o.fill === 'function' ? o.fill(x0, y0, x1, y1) : o.fill || '#fff';
  g.fillStyle = fill; g.fillText(str, x, y);
  if (o.inline) { g.strokeStyle = o.inline.color; g.lineWidth = o.inline.w; g.strokeText(str, x, y); }
  if (o.top) { g.save(); g.beginPath(); g.rect(x0 - 10, y0 - 10, x1 - x0 + 20, (y1 - y0) * (o.top.frac || 0.45) + 10); g.clip(); g.fillStyle = o.top.color; g.fillText(str, x, y); g.restore(); }
  g.restore();
  return box;
}

// ── Materials ────────────────────────────────────────────────────────────
// One shared library per game. Colours come from the table theme.
export class Materials {
  constructor(theme = {}) {
    this.theme = theme; this.cache = {}; this.textures = [];
    const scuff = canvasTex(noiseCanvas(128, 128, 20, 70, 11, { scratches: 40 }), { linear: true, repeat: [2, 2] });
    this.scuff = scuff; this.textures.push(scuff);
  }
  // everything this library made: called when the table is left
  dispose() {
    for (const k in this.cache) { const m = this.cache[k]; if (m && m.dispose) m.dispose(); }
    this.textures.forEach(t => t.dispose()); this.textures.length = 0; this.cache = {};
    if (this._glowTex) { this._glowTex.dispose(); this._glowTex = null; }
  }
  get(key, make) { return this.cache[key] || (this.cache[key] = make()); }
  chrome() { return this.get('chrome', () => new THREE.MeshStandardMaterial({ color: 0xe9ebf0, metalness: 1, roughness: 0.27, envMapIntensity: 0.9 })); }
  steel() { return this.get('steel', () => new THREE.MeshStandardMaterial({ color: 0xd5d8de, metalness: 1, roughness: 0.32, envMapIntensity: 0.9 })); }
  brass() { return this.get('brass', () => new THREE.MeshStandardMaterial({ color: 0xd8b26a, metalness: 1, roughness: 0.28, envMapIntensity: 1 })); }
  iron() { return this.get('iron', () => new THREE.MeshStandardMaterial({ color: 0x3a3438, metalness: 0.85, roughness: 0.45, envMapIntensity: 0.7 })); }
  copper() { return this.get('copper', () => new THREE.MeshStandardMaterial({ color: 0xc8744a, metalness: 1, roughness: 0.3 })); }
  ball(power) {
    return this.get('ball' + (power ? 'P' : ''), () => power
      ? new THREE.MeshPhysicalMaterial({ color: 0xf4f1ea, metalness: 0, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.05 })
      : new THREE.MeshStandardMaterial({ color: 0xf2f4f8, metalness: 1, roughness: 0.06, roughnessMap: this.scuff, envMapIntensity: 1.25 }));
  }
  rubber(color = '#1a1a1c') { return this.get('rub' + color, () => new THREE.MeshStandardMaterial({ color, roughness: 0.82, metalness: 0 })); }
  plastic(color = '#f2f2f2', o = {}) {
    return this.get('pl' + color + JSON.stringify(o), () => new THREE.MeshPhysicalMaterial(Object.assign({ color, roughness: 0.32, metalness: 0, clearcoat: 0.6, clearcoatRoughness: 0.15 }, o)));
  }
  // satin plastic without the clearcoat: the same colour and sheen, half the shading. For posts, target faces,
  // buttons, gondolas and other small parts where a clearcoat's second highlight never shows (keep `plastic` for
  // the playfield-sized things: flippers, bumper bodies, big toys).
  satin(color = '#f2f2f2', o = {}) {
    return this.get('sa' + color + JSON.stringify(o), () => new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.3, metalness: 0 }, o)));
  }
  // translucent coloured plastic (ramps, skirts, caps)
  clear(color = '#ffffff', opacity = 0.4, o = {}) {
    return this.get('cl' + color + opacity + JSON.stringify(o), () => new THREE.MeshPhysicalMaterial(Object.assign({
      color, roughness: 0.08, metalness: 0, transparent: true, opacity, clearcoat: 1, clearcoatRoughness: 0.05, side: THREE.DoubleSide, depthWrite: false, envMapIntensity: 1.2
    }, o)));
  }
  paint(color, o = {}) { return this.get('pa' + color + JSON.stringify(o), () => new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.55, metalness: 0 }, o))); }
  emissive(color, k = 1, o = {}) { return new THREE.MeshStandardMaterial(Object.assign({ color: '#111', emissive: color, emissiveIntensity: k, roughness: 0.4 }, o)); }
  basic(color, o = {}) { return new THREE.MeshBasicMaterial(Object.assign({ color }, o)); }
  wood(base = '#6b4325', key) {
    return this.get('wood' + base + (key || ''), () => {
      const t = canvasTex(woodCanvas(512, 256, base, 5), { repeat: [1, 1] }); this.textures.push(t);
      return new THREE.MeshStandardMaterial({ map: t, roughness: 0.55, metalness: 0 });
    });
  }
  black() { return this.get('black', () => new THREE.MeshBasicMaterial({ color: 0x000000 })); }
  hole() { return this.get('hole', () => new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 1 })); }
  glow(color = '#ffffff') {
    if (!this._glowTex) this._glowTex = canvasTex(glowCanvas(128));
    return new THREE.MeshBasicMaterial({ color, map: this._glowTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  }
}

// ── Geometry builders (table space) ──────────────────────────────────────
// Offset a polyline sideways (positive = left of travel direction), mitred.
export function offsetLine(pts, d) {
  const out = [], n = pts.length;
  for (let i = 0; i < n; i++) {
    const p = pts[i], a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    let tx1 = p[0] - a[0], ty1 = p[1] - a[1], tx2 = b[0] - p[0], ty2 = b[1] - p[1];
    let l1 = Math.hypot(tx1, ty1), l2 = Math.hypot(tx2, ty2);
    if (l1 < 1e-6) { tx1 = tx2; ty1 = ty2; l1 = l2; } if (l2 < 1e-6) { tx2 = tx1; ty2 = ty1; l2 = l1; }
    tx1 /= l1; ty1 /= l1; tx2 /= l2; ty2 /= l2;
    let nx = -(ty1 + ty2), ny = tx1 + tx2; const nl = Math.hypot(nx, ny) || 1; nx /= nl; ny /= nl;
    const cos = nx * -ty1 + ny * tx1, k = d / Math.max(0.35, cos);
    out.push([p[0] + nx * k, p[1] + ny * k]);
  }
  return out;
}
// A wall standing on the playfield along a polyline: thickness th, from z0 to z1. Bevelled edges catch the light.
export function wallGeo(pts, th, z0, z1, o = {}) {
  if (pts.length < 2) return null;
  const L = offsetLine(pts, th / 2), Rr = offsetLine(pts, -th / 2).reverse();
  const shape = new THREE.Shape(); shape.moveTo(L[0][0], L[0][1]);
  for (let i = 1; i < L.length; i++) shape.lineTo(L[i][0], L[i][1]);
  for (let i = 0; i < Rr.length; i++) shape.lineTo(Rr[i][0], Rr[i][1]);
  shape.closePath();
  const bev = o.bevel != null ? o.bevel : Math.min(th * 0.3, 1.2);
  const g = new THREE.ExtrudeGeometry(shape, { depth: Math.max(0.5, z1 - z0 - bev * 2), bevelEnabled: bev > 0, bevelThickness: bev, bevelSize: bev * 0.8, bevelSegments: 1, curveSegments: 4 });
  g.translate(0, 0, z0 + bev);
  return g;
}
// A closed polygon slab (plastics, aprons, platforms)
export function slabGeo(poly, z0, th, o = {}) {
  const s = new THREE.Shape(); s.moveTo(poly[0][0], poly[0][1]); for (let i = 1; i < poly.length; i++) s.lineTo(poly[i][0], poly[i][1]); s.closePath();
  if (o.holes) o.holes.forEach(h => { const p = new THREE.Path(); p.moveTo(h[0][0], h[0][1]); for (let i = 1; i < h.length; i++) p.lineTo(h[i][0], h[i][1]); p.closePath(); s.holes.push(p); });
  const bev = o.bevel != null ? o.bevel : 0.6;
  const g = new THREE.ExtrudeGeometry(s, { depth: Math.max(0.2, th - bev * 2), bevelEnabled: bev > 0, bevelThickness: bev, bevelSize: bev, bevelSegments: o.bevelSegments || 1, curveSegments: 6 });
  g.translate(0, 0, z0 + bev);
  if (o.uvBox) planarUV(g, o.uvBox);
  return g;
}
// planar UVs from table x/y into a box [x0,y0,x1,y1]
export function planarUV(g, box) {
  const p = g.attributes.position, uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) { uv[i * 2] = (p.getX(i) - box[0]) / (box[2] - box[0]); uv[i * 2 + 1] = (p.getY(i) - box[1]) / (box[3] - box[1]); }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); return g;
}
// cylinder standing on the playfield
export function cylGeo(x, y, r, z0, z1, seg = 20, r2) {
  const g = new THREE.CylinderGeometry(r2 != null ? r2 : r, r, z1 - z0, seg, 1);
  g.rotateX(PI / 2); g.translate(x, y, (z0 + z1) / 2); return g;
}
export function torusGeo(x, y, z, R, r, seg = 24) { const g = new THREE.TorusGeometry(R, r, 8, seg); g.translate(x, y, z); return g; }
export function sphereGeo(x, y, z, r, seg = 16) { const g = new THREE.SphereGeometry(r, seg, Math.max(8, seg * 0.6 | 0)); g.translate(x, y, z); return g; }
export function boxGeo(x, y, z, w, d, h, rot = 0) { const g = new THREE.BoxGeometry(w, d, h); if (rot) g.rotateZ(rot); g.translate(x, y, z); return g; }
// lathe profile [[r, z]...] around (x, y)
export function latheGeo(x, y, prof, seg = 24) {
  const g = new THREE.LatheGeometry(prof.map(p => new THREE.Vector2(p[0], p[1])), seg);
  g.rotateX(PI / 2); g.translate(x, y, 0); return g;
}
// tube along 3D points
export function tubeGeo(pts, r, seg, radial = 8, closed = false) {
  const curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(p[0], p[1], p[2] || 0)), closed, 'centripetal');
  return new THREE.TubeGeometry(curve, seg || Math.max(8, Math.round(curve.getLength() / 8)), r, radial, closed);
}
// Convex hull of 2D points (for rubber bands around posts)
export function hull(pts) {
  const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  up.pop(); lo.pop(); return lo.concat(up);
}
function circPts(cs, extra, n = 24) { const out = []; cs.forEach(c => { for (let i = 0; i < n; i++) { const a = i / n * TAU; out.push([c[0] + Math.cos(a) * (c[2] + extra), c[1] + Math.sin(a) * (c[2] + extra)]); } }); return out; }
// rubber band stretched round posts: circles [[x,y,r]...]
export function bandGeo(circles, th, z0, h) {
  const outer = hull(circPts(circles, th)), inner = hull(circPts(circles, 0));
  const s = new THREE.Shape(); s.moveTo(outer[0][0], outer[0][1]); outer.slice(1).forEach(p => s.lineTo(p[0], p[1])); s.closePath();
  const hp = new THREE.Path(); hp.moveTo(inner[0][0], inner[0][1]); inner.slice(1).forEach(p => hp.lineTo(p[0], p[1])); hp.closePath(); s.holes.push(hp);
  const g = new THREE.ExtrudeGeometry(s, { depth: h - 1.6, bevelEnabled: true, bevelThickness: 0.8, bevelSize: 0.7, bevelSegments: 2, curveSegments: 4 });
  g.translate(0, 0, z0 + 0.8); return g;
}
// flipper bat outline (pivot at origin, pointing +x)
export function batShape(len, r1, r2, n = 14) {
  const s = new THREE.Shape(), a = Math.asin((r1 - r2) / len);
  // top tangent from base to tip, round tip, bottom tangent back, round base
  const sa = Math.sin(a), ca = Math.cos(a);
  s.moveTo(r1 * sa, r1 * ca);
  s.lineTo(len + r2 * sa, r2 * ca);
  s.absarc(len, 0, r2, PI / 2 - a, -(PI / 2 - a), true);
  s.lineTo(r1 * sa, -r1 * ca);
  s.absarc(0, 0, r1, -(PI / 2 - a), -(3 * PI / 2 + a), true);
  return s;
}

// ── Static batching: merge everything that never moves, one draw per material ──
export class Batch {
  constructor() { this.groups = new Map(); }
  add(mat, geo, o = {}) {
    if (!geo) return;
    if (!this.groups.has(mat)) this.groups.set(mat, { mat, geos: [], cast: false, receive: false });
    const g = this.groups.get(mat);
    // normalise attributes so merges never fail
    if (geo.index) geo = geo.toNonIndexed();
    if (!geo.attributes.uv) geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2));
    if (!geo.attributes.normal) geo.computeVertexNormals();
    for (const k of Object.keys(geo.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv') geo.deleteAttribute(k);
    geo.morphAttributes = {}; geo.clearGroups();
    g.geos.push(geo); if (o.cast !== false) g.cast = true; if (o.receive !== false) g.receive = true;
  }
  build(parent) {
    const out = [];
    for (const g of this.groups.values()) {
      if (!g.geos.length) continue;
      const geo = g.geos.length === 1 ? g.geos[0] : mergeGeometries(g.geos, false);
      if (!geo) continue;
      const m = new THREE.Mesh(geo, g.mat); m.castShadow = g.cast; m.receiveShadow = g.receive; m.matrixAutoUpdate = false; m.updateMatrix();
      parent.add(m); out.push(m);
      g.geos.forEach(x => x !== geo && x.dispose());
    }
    this.groups.clear(); return out;
  }
}

// ── Text on canvases in TABLE orientation (y up) ─────────────────────────
// Painter context: ctx is set up so 1 unit = 1 mm and y points up the table.
export function painter(ctx, W, L, pxPerMM) {
  const P = {
    ctx, W, L, k: pxPerMM,
    // text upright on the playfield (reads from the player's side). rot in degrees (CCW).
    text(str, x, y, o = {}) {
      ctx.save(); ctx.translate(x, y); ctx.scale(1, -1); if (o.rot) ctx.rotate(-o.rot * PI / 180);
      ctx.font = (o.weight || '700') + ' ' + (o.size || 12) + 'px ' + (o.font || '"Cinzel", Georgia, serif');
      ctx.textAlign = o.align || 'center'; ctx.textBaseline = o.base || 'middle';
      if (o.spacing) try { ctx.letterSpacing = o.spacing + 'px'; } catch (e) {}
      if (o.glow) { ctx.shadowColor = o.glow; ctx.shadowBlur = (o.glowR || 6) * pxPerMM; }
      if (o.stroke) { ctx.lineJoin = 'round'; ctx.strokeStyle = o.stroke; ctx.lineWidth = o.strokeW || 2; ctx.strokeText(str, 0, 0); }
      ctx.fillStyle = o.color || '#fff';
      if (o.maxW) { const w = ctx.measureText(str).width; if (w > o.maxW) ctx.scale(o.maxW / w, 1); }
      ctx.fillText(str, 0, 0);
      ctx.restore();
    },
    // text along an arc (centre cx,cy radius r, centred at angle a deg)
    arcText(str, cx, cy, r, a, o = {}) {
      ctx.save(); ctx.font = (o.weight || '700') + ' ' + (o.size || 12) + 'px ' + (o.font || '"Cinzel", Georgia, serif');
      const w = ctx.measureText(str).width, span = w / r, dir = o.inside ? 1 : -1;
      let ang = a * PI / 180 - dir * span / 2;
      for (const ch of str) {
        const cw = ctx.measureText(ch).width; ang += dir * cw / r / 2;
        ctx.save(); ctx.translate(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r); ctx.scale(1, -1); ctx.rotate(-(ang - PI / 2 * (o.inside ? -1 : 1)) + (o.inside ? PI : 0));
        ctx.fillStyle = o.color || '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; if (o.glow) { ctx.shadowColor = o.glow; ctx.shadowBlur = 6; } ctx.fillText(ch, 0, 0); ctx.restore();
        ang += dir * cw / r / 2;
      }
      ctx.restore();
    },
    poly(pts) { ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); return ctx; },
    line(pts) { ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); return ctx; },
    circle(x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); return ctx; },
    glow(x, y, r, color, a = 1) { const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, rgba(color, a)); g.addColorStop(1, rgba(color, 0)); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); },
    lin(x0, y0, x1, y1, stops) { const g = ctx.createLinearGradient(x0, y0, x1, y1); stops.forEach(s => g.addColorStop(s[0], s[1])); return g; },
    rad(x, y, r0, r1, stops, x1, y1) { const g = ctx.createRadialGradient(x, y, r0, x1 != null ? x1 : x, y1 != null ? y1 : y, r1); stops.forEach(s => g.addColorStop(s[0], s[1])); return g; },
    // draw an image/canvas upright at a table rectangle
    image(img, x, y, w, h) { ctx.save(); ctx.translate(x, y + h); ctx.scale(1, -1); ctx.drawImage(img, 0, 0, w, h); ctx.restore(); },
    rng
  };
  return P;
}

// ── Backglass painting (translite art) ───────────────────────────────────
// A translite is painted the way a matte painter works: big shapes back to front, then light, then atmosphere,
// then detail, then grain. These are the brushes, all in canvas px on a plain 2D context: soft puffs (fog, cloud,
// haze, light pools), cloud banks with lit rims, star fields, light rays, glints, lens flares, surface texture,
// water reflections, bulbs and a vignette. Colours are hex strings (rgba() parses them).
// A soft-edged ellipse of colour: alpha a at the centre fading to nothing at the edge. rot in radians; mid is
// where the fall-off reaches half (0.45 = a soft airbrush dab, 0.7 = a denser puff).
export function bgPuff(g, x, y, rx, ry, color, a, rot = 0, mid = 0.45) {
  if (rx <= 0 || ry <= 0 || a <= 0) return;
  g.save(); g.translate(x, y); if (rot) g.rotate(rot); g.scale(1, ry / rx);
  const q = g.createRadialGradient(0, 0, 0, 0, 0, rx); q.addColorStop(0, rgba(color, a)); q.addColorStop(mid, rgba(color, a * 0.5)); q.addColorStop(1, rgba(color, 0));
  g.fillStyle = q; g.fillRect(-rx, -rx, rx * 2, rx * 2); g.restore();
}
// A cloud bank centred at (x, y), size s: a row of overlapping puffs in the body colour, their edges towards a
// light at (lx, ly) picked out in the lit colour (litA alpha). spread widens the bank; n is the number of puffs.
export function bgCloud(g, x, y, s, o = {}) {
  const r = rng(o.seed || 1), n = o.n || 7, body = o.body || '#101020', a = o.a != null ? o.a : 0.9, spread = o.spread || 1.2, flat = o.flat || 0.72;
  const parts = [];
  for (let i = 0; i < n; i++) { const t = n > 1 ? (i / (n - 1)) * 2 - 1 : 0; parts.push([x + t * s * spread + (r() - 0.5) * s * 0.3, y + Math.abs(t) * s * 0.22 + (r() - 0.5) * s * 0.25, s * (0.5 + r() * 0.3) * (1 - Math.abs(t) * 0.4)]); }
  for (const [px, py, pr] of parts) bgPuff(g, px, py, pr, pr * flat, body, a, 0, o.mid || 0.62);
  if (o.lit) {
    const lx = o.lx != null ? o.lx : x, ly = o.ly != null ? o.ly : y - s * 4;
    for (const [px, py, pr] of parts) { const dx = lx - px, dy = ly - py, d = Math.hypot(dx, dy) || 1; bgPuff(g, px + dx / d * pr * 0.62, py + dy / d * pr * 0.62 * flat, pr * 0.62, pr * 0.3, o.lit, o.litA != null ? o.litA : 0.3, Math.atan2(dy, dx) + PI / 2, 0.5); }
  }
}
// A field of n stars over w x yMax (seeded): mostly faint white, a few bigger and warmer.
export function bgStars(g, w, h, n, seed = 1, o = {}) {
  const r = rng(seed), yMax = o.yMax || h, k = o.a || 1;
  for (let i = 0; i < n; i++) {
    const x = r() * w, y = r() * yMax, b = r(), s = b > 0.965 ? 2.4 : b > 0.82 ? 1.6 : 1.1, c = r();
    g.fillStyle = 'rgba(' + (c < 0.78 ? '226,232,255' : c < 0.9 ? '255,238,205' : '190,225,255') + ',' + ((0.22 + r() * 0.7) * k).toFixed(2) + ')';
    g.fillRect(x, y, s, s);
  }
}
// A star glint: a core, a soft glow and diffraction arms (horizontal longest), drawn additively.
export function bgGlint(g, x, y, r, color, a = 1, o = {}) {
  glowAt(g, x, y, r * (o.glowR || 4), color, a * 0.5);
  g.save(); g.globalCompositeOperation = 'lighter';
  const arm = (len, wd, ang) => { g.save(); g.translate(x, y); g.rotate(ang); const q = g.createLinearGradient(-len, 0, len, 0); q.addColorStop(0, rgba(color, 0)); q.addColorStop(0.5, rgba(color, a)); q.addColorStop(1, rgba(color, 0)); g.fillStyle = q; g.beginPath(); g.moveTo(-len, 0); g.lineTo(0, -wd); g.lineTo(len, 0); g.lineTo(0, wd); g.closePath(); g.fill(); g.restore(); };
  arm(r * (o.armX || 5), r * 0.45, 0); arm(r * (o.armY || 3.5), r * 0.45, PI / 2);
  if (o.diag) { arm(r * 2.2, r * 0.3, PI / 4); arm(r * 2.2, r * 0.3, -PI / 4); }
  g.fillStyle = rgba('#ffffff', Math.min(1, a)); g.beginPath(); g.arc(x, y, r * 0.55, 0, TAU); g.fill(); g.restore();
}
// Rays of light from (x, y): n wedges between angles a0..a1 (radians), length len, fading out along their length
// and additive, so they read as light in haze. width is the half-angle of a ray; r0 keeps the source clear.
export function bgRays(g, x, y, len, a0, a1, n, color, a, seed = 1, o = {}) {
  const r = rng(seed); g.save(); g.globalCompositeOperation = o.mode || 'lighter';
  const q = g.createRadialGradient(x, y, o.r0 || 0, x, y, len); q.addColorStop(0, rgba(color, a)); q.addColorStop(0.45, rgba(color, a * 0.4)); q.addColorStop(1, rgba(color, 0)); g.fillStyle = q;
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n, ang = a0 + (a1 - a0) * t + (r() - 0.5) * (a1 - a0) / n, wd = (o.width || 0.03) * (0.4 + r() * 1.2);
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(ang - wd) * len, y + Math.sin(ang - wd) * len); g.lineTo(x + Math.cos(ang + wd) * len, y + Math.sin(ang + wd) * len); g.closePath(); g.fill();
  }
  g.restore();
}
// A band of haze across the full width, alpha a0 at y0 to a1 at y1 (atmospheric perspective, ground mist).
export function bgHaze(g, w, y0, y1, color, a0, a1) {
  const q = g.createLinearGradient(0, y0, 0, y1); q.addColorStop(0, rgba(color, a0)); q.addColorStop(1, rgba(color, a1)); g.fillStyle = q; g.fillRect(0, Math.min(y0, y1), w, Math.abs(y1 - y0));
}
// Surface texture over a rectangle (clip to a shape first): a tile of seeded noise multiplied in at strength a.
// scale enlarges the grain; mode 'overlay' or 'screen' for lighter materials.
const _bgNoise = {};
export function bgTexture(g, x, y, w, h, a = 0.3, o = {}) {
  const key = (o.seed || 1) + ':' + (o.lo || 0) + ':' + (o.hi || 0), c = _bgNoise[key] || (_bgNoise[key] = noiseCanvas(96, 96, o.lo != null ? o.lo : 110, o.hi != null ? o.hi : 255, o.seed || 1));
  const s = o.scale || 1;
  g.save(); g.globalCompositeOperation = o.mode || 'multiply'; g.globalAlpha = a; g.beginPath(); g.rect(x, y, w, h); g.clip();
  g.translate(x, y); g.scale(s, s); g.fillStyle = g.createPattern(c, 'repeat'); g.fillRect(0, 0, w / s + 1, h / s + 1); g.restore();
}
// Water reflection: the painting above the waterline y0 (sh px of it) mirrored below it over dh px, in slices
// offset sideways by a ripple that grows towards the viewer. Paint the water's own colour over it afterwards.
// Works in canvas px (reset any transform first); the source rows must already be painted.
export function bgReflect(g, y0, sh, dh, o = {}) {
  const w = g.canvas.width, r = rng(o.seed || 1), n = o.slices || 44, a = o.alpha != null ? o.alpha : 0.5, rip = o.ripple != null ? o.ripple : 3;
  // one copy of the band above the waterline (drawing a canvas onto itself snapshots it every call)
  const top = Math.max(0, y0 - sh), bh = Math.ceil(y0 - top), band = canvas(w, bh); band.getContext('2d').drawImage(g.canvas, 0, top, w, bh, 0, 0, w, bh);
  g.save(); g.globalAlpha = a; g.beginPath(); g.rect(0, y0, w, dh); g.clip();
  const ssh = bh / n, dsh = dh / n;
  for (let i = 0; i < n; i++) {
    const t = i / n, sy = bh - (i + 1) * ssh, dy = y0 + i * dsh, off = Math.sin(i * 1.7 + r() * 0.8) * rip * (0.2 + t * 1.2);
    g.drawImage(band, 0, sy, w, ssh, off, dy, w, dsh + 1);
  }
  g.restore();
}
// Lens flare for a bright light at (x, y) seen through a lens centred on (cx, cy): ghosts along the axis through
// the centre, and a thin anamorphic streak across the light.
export function bgFlare(g, x, y, cx, cy, color, k = 1, o = {}) {
  g.save(); g.globalCompositeOperation = 'lighter';
  for (const [t, rad, a] of (o.ghosts || [[0.22, 12, 0.16], [0.4, 26, 0.09], [0.55, 7, 0.22], [0.8, 40, 0.07], [1.25, 16, 0.12], [1.55, 58, 0.05]])) {
    const gx = x + (cx - x) * 2 * t, gy = y + (cy - y) * 2 * t;
    g.fillStyle = rgba(color, a * k); g.beginPath(); g.arc(gx, gy, rad, 0, TAU); g.fill(); g.strokeStyle = rgba(color, a * 1.5 * k); g.lineWidth = 1.4; g.stroke();
  }
  const len = o.streak || 420, s = g.createLinearGradient(x - len, y, x + len, y); s.addColorStop(0, rgba(color, 0)); s.addColorStop(0.5, rgba('#ffffff', 0.55 * k)); s.addColorStop(1, rgba(color, 0)); g.fillStyle = s; g.fillRect(x - len, y - 1.6, len * 2, 3.2);
  const s2 = g.createLinearGradient(x - len * 0.6, y, x + len * 0.6, y); s2.addColorStop(0, rgba(color, 0)); s2.addColorStop(0.5, rgba(color, 0.35 * k)); s2.addColorStop(1, rgba(color, 0)); g.fillStyle = s2; g.fillRect(x - len * 0.6, y - 5, len * 1.2, 10);
  g.restore();
}
// Darkened corners (alpha a at the very edge), the way a backlit translite falls off and a painting is framed.
export function bgVignette(g, w, h, a = 0.4, color = '#000000') {
  const q = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.hypot(w, h) * 0.58); q.addColorStop(0, rgba(color, 0)); q.addColorStop(1, rgba(color, a));
  g.fillStyle = q; g.fillRect(0, 0, w, h);
}
// A bulb: a point light with its bloom (k scales the glow) and a bright core with a highlight.
export function bgBulb(g, x, y, r, color, k = 1) {
  if (k > 0.05) glowAt(g, x, y, r * 6, color, 0.55 * k);
  const q = g.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r); q.addColorStop(0, '#ffffff'); q.addColorStop(0.45, rgba(color, 1)); q.addColorStop(1, rgba(color, 0.35)); g.fillStyle = q; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
}
