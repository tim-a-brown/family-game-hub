// Goblin Defenders: the 3D models behind every sprite. Chunky goblin-tech built from wood, iron and brass, and the
// enemies who march on the village. Rendered to sprite sheets by render.html (see build.mjs); the game itself never
// loads three.js. Units: one grid cell is 1 x 1. Towers face +x (the game turns the head sprite toward its target).
import * as THREE from 'three';

// ── Textures painted on a canvas ───────────────────────────────────────────
function cnv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function rnd(a, b) { return a + Math.random() * (b - a); }
function tex(c, rx, ry) { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx || 1, ry || 1); t.anisotropy = 4; return t; }
// Warm orange planks with grain, knots and dark seams (the original's goblin wood)
function woodCanvas(base, dark, planks) {
  const c = cnv(256, 256), g = c.getContext('2d'), n = planks || 4, ph = 256 / n;
  for (let i = 0; i < n; i++) {
    const l = rnd(-14, 14); g.fillStyle = shade(base, l); g.fillRect(0, i * ph, 256, ph);
    for (let k = 0; k < 26; k++) {   // grain lines
      g.strokeStyle = 'rgba(' + hexRgb(dark).join(',') + ',' + rnd(.12, .35) + ')'; g.lineWidth = rnd(.6, 1.8);
      const y = i * ph + rnd(2, ph - 2); g.beginPath(); g.moveTo(0, y);
      for (let x = 0; x <= 256; x += 32) g.lineTo(x, y + Math.sin(x / rnd(20, 50) + k) * rnd(.5, 2.5));
      g.stroke();
    }
    if (Math.random() < .6) { const kx = rnd(30, 226), ky = i * ph + ph / 2; g.fillStyle = 'rgba(' + hexRgb(dark).join(',') + ',.5)'; g.beginPath(); g.ellipse(kx, ky, rnd(4, 8), rnd(2, 4), 0, 0, 7); g.fill(); }
    g.fillStyle = 'rgba(255,230,180,.18)'; g.fillRect(0, i * ph + 1, 256, 2);   // a lit top edge on each plank
    g.fillStyle = shade(dark, -10); g.fillRect(0, (i + 1) * ph - 3, 256, 3);    // the seam
  }
  return c;
}
function metalCanvas(base, spots) {
  const c = cnv(128, 128), g = c.getContext('2d'); g.fillStyle = base; g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 500; i++) { g.fillStyle = 'rgba(' + (Math.random() < .5 ? '0,0,0' : '255,255,255') + ',' + rnd(.02, .08) + ')'; g.fillRect(rnd(0, 128), rnd(0, 128), rnd(1, 5), rnd(1, 3)); }
  for (let i = 0; i < (spots || 0); i++) { g.fillStyle = 'rgba(120,60,20,' + rnd(.08, .2) + ')'; g.beginPath(); g.arc(rnd(0, 128), rnd(0, 128), rnd(3, 10), 0, 7); g.fill(); }
  return c;
}
function stoneCanvas(base, mortar) {
  const c = cnv(256, 256), g = c.getContext('2d'); g.fillStyle = mortar; g.fillRect(0, 0, 256, 256);
  const rows = 6, rh = 256 / rows;
  for (let r = 0; r < rows; r++) {
    let x = r % 2 ? -rnd(10, 30) : 0;
    while (x < 256) { const w = rnd(34, 60); g.fillStyle = shade(base, rnd(-18, 14)); roundRect(g, x + 2, r * rh + 2, w - 4, rh - 4, 6); g.fill();
      g.fillStyle = 'rgba(255,255,255,.12)'; roundRect(g, x + 4, r * rh + 3, w - 10, 4, 2); g.fill(); x += w; }
  }
  return c;
}
function shingleCanvas(base) {
  const c = cnv(256, 256), g = c.getContext('2d'); g.fillStyle = shade(base, -30); g.fillRect(0, 0, 256, 256);
  for (let r = 0; r < 8; r++) for (let i = -1; i < 9; i++) {
    const x = i * 32 + (r % 2) * 16, y = r * 32; g.fillStyle = shade(base, rnd(-16, 12));
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + 30, y); g.lineTo(x + 30, y + 26); g.quadraticCurveTo(x + 15, y + 36, x, y + 26); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 2; g.stroke();
  }
  return c;
}
function roundRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function hexRgb(h) { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
function shade(h, d) { return 'rgb(' + hexRgb(h).map(v => Math.max(0, Math.min(255, Math.round(v + d)))).join(',') + ')'; }

// ── Materials ──────────────────────────────────────────────────────────────
const M = {};
export function initMaterials() {
  const std = (o) => new THREE.MeshStandardMaterial(o);
  M.wood = std({ map: tex(woodCanvas('#b4602a', '#3e1a06', 5)), roughness: .7 });
  M.woodDark = std({ map: tex(woodCanvas('#7a3e1c', '#2a1004')), roughness: .8 });
  M.woodRed = std({ map: tex(woodCanvas('#b8442e', '#4a140a')), roughness: .7 });
  M.woodPale = std({ map: tex(woodCanvas('#c98a4e', '#5a3010', 3)), roughness: .75 });
  M.iron = std({ map: tex(metalCanvas('#6b7179', 6)), metalness: .75, roughness: .42 });
  M.ironDark = std({ map: tex(metalCanvas('#3d4148', 3)), metalness: .7, roughness: .5 });
  M.black = std({ color: 0x232428, metalness: .6, roughness: .45 });
  M.brass = std({ map: tex(metalCanvas('#e2a63e')), metalness: .95, roughness: .28 });
  M.copper = std({ color: 0xd2733e, metalness: .95, roughness: .3 });
  M.steel = std({ color: 0xc9d1d9, metalness: .9, roughness: .25 });
  M.rope = std({ color: 0x8a6a3a, roughness: .95 });
  M.leather = std({ color: 0x6b3d1f, roughness: .8 });
  M.string = std({ color: 0xf2e6c8, roughness: .9 });
  M.stone = std({ map: tex(stoneCanvas('#a59a8a', '#5d564c'), 2, 1), roughness: .95 });
  M.stoneGrey = std({ map: tex(stoneCanvas('#9fa4ab', '#565b62'), 2, 1), roughness: .95 });
  M.sandstone = std({ map: tex(stoneCanvas('#e1bd7a', '#a17d45'), 2, 1), roughness: .95 });
  M.shingle = std({ map: tex(shingleCanvas('#9a6a3c'), 2, 1), roughness: .9 });
  M.rock = std({ color: 0x8f877b, roughness: 1, flatShading: true });
  M.rockMoss = std({ color: 0x5f7f52, roughness: 1, flatShading: true });
  M.ice = std({ color: 0x8fd8ff, emissive: 0x2a7fd0, emissiveIntensity: .55, metalness: .1, roughness: .12, flatShading: true, transparent: true, opacity: .93 });
  M.iceDeep = std({ color: 0x3f8ff0, emissive: 0x1a4fc0, emissiveIntensity: .6, roughness: .15, flatShading: true });
  M.acid = std({ color: 0x9dff3a, emissive: 0x4fd010, emissiveIntensity: .75, roughness: .15, metalness: .1 });
  M.acidGlass = std({ color: 0x7ae82a, emissive: 0x3a9a0a, emissiveIntensity: .55, roughness: .06, metalness: .1 });
  M.orb = std({ color: 0xffb6f0, emissive: 0xff3fd0, emissiveIntensity: 1.3, roughness: .2 });
  M.orbCore = std({ color: 0xffffff, emissive: 0xffd8f6, emissiveIntensity: 1.6 });
  M.coil = std({ color: 0xb85a2e, metalness: .9, roughness: .35 });
  M.glowRed = std({ color: 0xff6030, emissive: 0xff3a10, emissiveIntensity: 1.2 });
  M.gold = std({ color: 0xffc83a, metalness: 1, roughness: .22 });
  M.white = std({ color: 0xffffff, roughness: .6 });
  M.redCloth = std({ color: 0xd8262e, roughness: .85 });
  M.blueCloth = std({ color: 0x2a5ad0, roughness: .85 });
  M.greenCloth = std({ color: 0x2f9a5a, roughness: .85 });
  M.purpleCloth = std({ color: 0x7a3ac8, roughness: .85 });
  M.skin = std({ color: 0xf0b48a, roughness: .7 });
  M.bone = std({ color: 0xece2c8, roughness: .7 });
  M.eye = std({ color: 0x111111, roughness: .3 });
  M.eyeGlow = std({ color: 0xfff27a, emissive: 0xffd21a, emissiveIntensity: 1.6 });
  M.eyeRed = std({ color: 0xff4a2a, emissive: 0xff2a0a, emissiveIntensity: 1.6 });
  M.boot = std({ color: 0x3a2414, roughness: .85 });
  M.pants = std({ color: 0x5a4a3a, roughness: .9 });
  M.fur = std({ color: 0x6a4428, roughness: 1 });
  M.wool = std({ color: 0xf6f2e8, roughness: 1 });
  M.leaf = std({ color: 0x3fa83a, roughness: .8, flatShading: true });
  M.leafDark = std({ color: 0x23762e, roughness: .85, flatShading: true });
  M.leafLight = std({ color: 0x7ccf3a, roughness: .8, flatShading: true });
  M.pine = std({ color: 0x2c6a48, roughness: .9, flatShading: true });
  M.snow = std({ color: 0xf4f9ff, roughness: .8, flatShading: true });
  M.trunk = std({ color: 0x7a4e2c, roughness: .9 });
  M.cactus = std({ color: 0x4f9a42, roughness: .8 });
  M.flag = std({ color: 0xffffff, roughness: .8, side: THREE.DoubleSide });
  M.heart = std({ color: 0xe0202e, roughness: .6, side: THREE.DoubleSide });
  M.dark = std({ color: 0x0c0806, roughness: 1 });
  M.lava = std({ color: 0xff7a1a, emissive: 0xff4a00, emissiveIntensity: 1.4 });
  return M;
}
export function mats() { return M; }

// ── Shape helpers ──────────────────────────────────────────────────────────
function mesh(geo, mat) { const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; return m; }
function at(o, x, y, z, rx, ry, rz, s) { o.position.set(x || 0, y || 0, z || 0); o.rotation.set(rx || 0, ry || 0, rz || 0); if (s != null) { if (typeof s === 'number') o.scale.setScalar(s); else o.scale.set(s[0], s[1], s[2]); } return o; }
function grp(...kids) { const g = new THREE.Group(); kids.forEach(k => k && g.add(k)); return g; }
function box(w, h, d, mat) { return mesh(new THREE.BoxGeometry(w, h, d), mat); }
// a box with softened edges (an extruded rounded rectangle), for chunky cartoon blocks
function rbox(w, h, d, r, mat) {
  r = Math.min(r, w / 2 - .001, h / 2 - .001);
  const s = new THREE.Shape(), x = -w / 2 + r, y = -h / 2 + r;
  s.moveTo(-w / 2, y); s.lineTo(-w / 2, h / 2 - r); s.quadraticCurveTo(-w / 2, h / 2, x, h / 2); s.lineTo(w / 2 - r, h / 2); s.quadraticCurveTo(w / 2, h / 2, w / 2, h / 2 - r);
  s.lineTo(w / 2, y); s.quadraticCurveTo(w / 2, -h / 2, w / 2 - r, -h / 2); s.lineTo(x, -h / 2); s.quadraticCurveTo(-w / 2, -h / 2, -w / 2, y);
  const b = Math.min(r, d / 3), g = new THREE.ExtrudeGeometry(s, { depth: d - b * 2, bevelEnabled: true, bevelSize: b * .8, bevelThickness: b, bevelSegments: 3, curveSegments: 6 });
  g.translate(0, 0, -(d - b * 2) / 2);
  // planar UVs so wood grain runs along the length
  g.computeVertexNormals();
  // UVs by facing: tops get the grain along x, sides along their length
  const p = g.attributes.position, uv = g.attributes.uv, nm = g.attributes.normal;
  for (let i = 0; i < p.count; i++) { const ny = Math.abs(nm.getY(i)), nx = Math.abs(nm.getX(i)), nz = Math.abs(nm.getZ(i));
    if (ny >= nx && ny >= nz) uv.setXY(i, p.getX(i) * 1.1, p.getZ(i) * 1.1); else if (nz >= nx) uv.setXY(i, p.getX(i) * 1.1, p.getY(i) * 1.1); else uv.setXY(i, p.getZ(i) * 1.1, p.getY(i) * 1.1); }
  return mesh(g, mat);
}
function cyl(rt, rb, h, mat, seg, open) { return mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 24, 1, !!open), mat); }
function sph(r, mat, ws, hs) { return mesh(new THREE.SphereGeometry(r, ws || 24, hs || 16), mat); }
function hemi(r, mat) { return mesh(new THREE.SphereGeometry(r, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat); }
function cap(r, len, mat) { return mesh(new THREE.CapsuleGeometry(r, len, 6, 16), mat); }
function cone(r, h, mat, seg) { return mesh(new THREE.ConeGeometry(r, h, seg || 16), mat); }
function tor(R, r, mat, arc, rs, ts) { return mesh(new THREE.TorusGeometry(R, r, rs || 10, ts || 32, arc || Math.PI * 2), mat); }
function ell(rx, ry, rz, mat) { const m = sph(1, mat); m.scale.set(rx, ry, rz); return m; }
function lathe(pts, mat, seg) { return mesh(new THREE.LatheGeometry(pts.map(p => new THREE.Vector2(p[0], p[1])), seg || 24), mat); }
function rock(r, mat, detail) {
  const g = new THREE.DodecahedronGeometry(r, detail || 1), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const v = new THREE.Vector3().fromBufferAttribute(p, i), k = 1 + (Math.sin(v.x * 9.1) * Math.cos(v.z * 7.3) + Math.sin(v.y * 5.7)) * .09; p.setXYZ(i, v.x * k, v.y * k * .8, v.z * k); }
  g.computeVertexNormals(); return mesh(g, mat);
}
// a ring of rivets (small brass or iron domes) round a circle at height y
function rivets(R, y, n, mat, r) { const g = grp(); for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; g.add(at(sph(r || .022, mat, 8, 6), Math.cos(a) * R, y, Math.sin(a) * R)); } return g; }
function spike(len, r, mat) { const c = cone(r, len, mat, 10); return c; }
// a line between two points as a thin cylinder (bow strings, ropes, spider legs)
function rod(a, b, r, mat, seg) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), d = B.clone().sub(A), m = cyl(r, r, d.length(), mat, seg || 8);
  m.position.copy(A).add(B).multiplyScalar(.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); return m;
}

// ═══ Towers ═════════════════════════════════════════════════════════════════
// Each returns { base, head, pivot } where head (or null) turns round the y axis at height pivot.
// Level 1 is plain wood and iron, level 2 adds brass and size, level 3 is the full goblin contraption.
function platform(lv, opts) {
  opts = opts || {};
  const g = grp(), w = opts.w || .68, top = opts.h || .2;
  // four stubby legs splayed out, a thick plank deck, iron corner straps
  for (let i = 0; i < 4; i++) {
    const sx = i & 1 ? 1 : -1, sz = i & 2 ? 1 : -1;
    g.add(at(rbox(.13, top + .06, .13, .03, M.woodDark), sx * w * .38, (top + .06) / 2 - .02, sz * w * .38, sz * .18, 0, -sx * .18));
    g.add(at(box(.15, .05, .15, M.ironDark), sx * w * .4, .025, sz * w * .4));
  }
  g.add(at(rbox(w, .1, w, .04, opts.deck || M.wood), 0, top, 0));
  for (let i = 0; i < 4; i++) { const sx = i & 1 ? 1 : -1, sz = i & 2 ? 1 : -1;
    g.add(at(box(.16, .115, .03, M.iron), sx * (w / 2 - .08), top, sz * (w / 2 + .002)));
    g.add(at(sph(.024, M.brass, 8, 6), sx * (w / 2 - .08), top + .01, sz * (w / 2 + .02)));
  }
  if (lv >= 2) g.add(at(rbox(w + .04, .045, w + .04, .02, M.brass), 0, top - .065, 0));
  if (opts.spikes !== false) {   // iron spikes jutting from the front corners, like the reference crossbow carts
    [[-1, 1], [1, 1], [-1, -1], [1, -1]].forEach(([sx, sz], i) => { if (lv < 2 && i > 1) return;
      const s = spike(.2, .04, M.steel); at(s, sx * w * .52, top - .02, sz * w * .52, sz * 1.15, 0, -sx * 1.15); g.add(s); });
  }
  if (lv >= 3) [[-1, 1], [1, 1], [-1, -1], [1, -1]].forEach(([sx, sz]) => g.add(at(cone(.05, .09, M.brass, 12), sx * (w / 2 - .05), top + .09, sz * (w / 2 - .05))));
  return g;
}

function crossbow(lv) {
  const base = platform(lv), head = grp();
  const s = [1, 1.12, 1.24][lv - 1];
  head.add(at(cyl(.12, .15, .1, M.ironDark), 0, 0, 0));           // swivel
  head.add(at(rbox(.62 * s, .11, .14, .04, M.wood), .06, .1, 0)); // stock
  head.add(at(box(.3 * s, .02, .05, M.iron), .12, .16, 0));       // rail
  head.add(at(cyl(.035, .035, .26, M.iron), -.2 * s, .12, 0, Math.PI / 2));   // crank axle
  [-1, 1].forEach(k => head.add(at(rbox(.04, .14, .04, .015, M.woodDark), -.2 * s, .12, k * .15, 0, 0, .5)));
  const nb = lv >= 3 ? 2 : 1;
  for (let b = 0; b < nb; b++) {
    const y = .13 + b * .1, R = .36 * s, front = .36 * s;
    // the bow: two curved limbs (iron at level 1, brass-capped later) swept back from the nose
    const limb = tor(R, .028, lv >= 2 ? M.ironDark : M.woodDark, Math.PI * .62, 8, 24);
    limb.rotation.set(Math.PI / 2, 0, -Math.PI * .31); limb.position.set(front - R, y, 0); head.add(limb);
    const tipA = Math.PI * .31, tx = front - R + Math.cos(tipA) * R, tz = Math.sin(tipA) * R;
    [-1, 1].forEach(k => { head.add(at(sph(.035, lv >= 2 ? M.brass : M.iron, 10, 8), tx, y, k * tz)); head.add(rod([tx, y, k * tz], [-.08 * s, y, 0], .008, M.string)); });
    head.add(at(cyl(.016, .016, .5 * s, M.woodPale, 8), .08 * s, y + .02, 0, 0, 0, Math.PI / 2));     // the bolt
    head.add(at(cone(.04, .1, M.steel, 8), .36 * s, y + .02, 0, 0, 0, -Math.PI / 2));
    if (lv >= 2) [-1, 1].forEach(k => head.add(at(box(.08, .012, .03, M.redCloth), -.14 * s, y + .02, k * .02)));
  }
  if (lv >= 2) head.add(at(rbox(.16, .07, .18, .03, M.brass), -.1 * s, .2, 0));     // brass winch housing
  if (lv >= 3) { head.add(at(cyl(.09, .09, .16, M.brass), -.05, .33, 0, Math.PI / 2)); head.add(rivets(.09, 0, 8, M.ironDark).rotateX(Math.PI / 2).translateY(0)); }
  return { base, head, pivot: .3 };
}

function drum(lv, h, r, matBody) {
  const g = grp();
  // three iron feet, a wooden barrel body with iron hoops
  for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2 + .5; g.add(at(rbox(.1, .14, .24, .03, M.ironDark), Math.cos(a) * r * .85, .06, Math.sin(a) * r * .85, 0, -a, 0)); }
  const body = lathe([[0, 0], [r * .92, 0], [r, h * .25], [r * 1.02, h * .5], [r, h * .75], [r * .92, h], [0, h]], matBody || M.wood, 28);
  body.position.y = .08; g.add(body);
  [.1, h * .5, h - .02].forEach((y, i) => g.add(at(tor(r * (i === 1 ? 1.03 : .95), .022, lv >= 2 && i === 1 ? M.brass : M.iron, 0, 8, 32), 0, .08 + y, 0, Math.PI / 2)));
  g.add(rivets(r * 1.04, .08 + h * .5, 12, M.brass, .02));
  return g;
}

function bomb(lv) {
  const s = [1, 1.08, 1.16][lv - 1], base = drum(lv, .3 * s, .3 * s);
  if (lv >= 2) for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; base.add(at(spike(.13, .03, M.steel), Math.cos(a) * .33 * s, .22, Math.sin(a) * .33 * s, Math.sin(a) * 1.4, 0, -Math.cos(a) * 1.4)); }
  const head = grp();
  head.add(at(cyl(.2 * s, .22 * s, .06, M.ironDark), 0, 0, 0));
  [-1, 1].forEach(k => head.add(at(rbox(.16, .2, .05, .02, M.iron), 0, .1, k * .14 * s)));   // the yoke
  head.add(at(cyl(.03, .03, .34 * s, M.brass), 0, .14, 0, Math.PI / 2));
  // the mortar barrel tipped up toward +x
  const bar = grp(), bl = .42 * s, br = .12 * s;
  bar.add(at(cyl(br * 1.05, br * 1.2, bl, M.black, 24), 0, bl / 2 - .06, 0));
  bar.add(at(tor(br * 1.08, .028, lv >= 2 ? M.brass : M.iron), 0, bl - .06, 0, Math.PI / 2));
  bar.add(at(tor(br * 1.2, .03, M.iron), 0, .02, 0, Math.PI / 2));
  bar.add(at(cyl(br * .8, br * .8, .02, M.dark), 0, bl - .05, 0));
  if (lv >= 3) { bar.add(at(tor(br * 1.14, .02, M.brass), 0, bl * .5, 0, Math.PI / 2)); bar.add(at(sph(.05, M.brass), 0, -.08, 0)); }
  bar.position.set(0, .15, 0); bar.rotation.z = -Math.PI / 2 + .6; head.add(bar);
  // a bomb waiting in the rack at the back
  const bm = sph(.07, M.black); bm.position.set(-.18 * s, .1, .12); head.add(bm); head.add(at(cyl(.008, .008, .06, M.rope, 6), -.18 * s, .18, .12, 0, 0, .3));
  return { base, head, pivot: .38 * s + .04 };
}

function crystal(r, h, mat) { const g = new THREE.OctahedronGeometry(r, 0); g.scale(1, h / r, 1); return mesh(g, mat); }
function frost(lv) {
  const s = [1, 1.08, 1.16][lv - 1], base = grp();
  base.add(platform(lv, { spikes: false, deck: M.stoneGrey }));
  // ice crystals growing out of the deck corners
  const n = [3, 5, 7][lv - 1];
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + .3, rr = .3; base.add(at(crystal(.06, .14 + (i % 2) * .06, M.ice), Math.cos(a) * rr, .32, Math.sin(a) * rr, Math.sin(a) * .5, a, -Math.cos(a) * .5)); }
  const head = grp();
  head.add(at(cyl(.13, .16, .08, M.brass), 0, 0, 0));
  head.add(at(rbox(.36 * s, .14, .16, .05, M.blueCloth), -.04, .1, 0));
  head.add(at(rbox(.38 * s, .03, .18, .01, M.iron), -.04, .18, 0));
  // brass barrel ending in a snowflake nozzle, a big crystal in the breech
  head.add(at(cyl(.06, .075, .34 * s, M.brass), .2 * s, .12, 0, 0, 0, -Math.PI / 2));
  head.add(at(tor(.075, .02, M.iron), .36 * s, .12, 0, 0, Math.PI / 2));
  head.add(at(crystal(.06, .09, M.iceDeep), .4 * s, .12, 0, 0, 0, Math.PI / 2));
  head.add(at(crystal(.1 * s, .2 * s, M.ice), -.12, .3, 0, 0, .4, .2));
  if (lv >= 2) [-1, 1].forEach(k => head.add(at(crystal(.06, .12, M.ice), -.18, .24, k * .1, k * .5, 0, .3)));
  if (lv >= 3) { head.add(at(tor(.14, .02, M.brass), -.12, .3, 0, Math.PI / 2)); head.add(at(crystal(.05, .11, M.iceDeep), -.2, .4, 0, 0, 0, .6)); }
  return { base, head, pivot: .36 };
}

function poison(lv) {
  const s = [1, 1.07, 1.14][lv - 1], base = grp();
  base.add(platform(lv, { spikes: lv >= 2, deck: M.woodDark }));
  base.add(at(cyl(.2, .26, .12, M.ironDark), 0, .32, 0));
  // little green puddle drips on the deck
  base.add(at(cyl(.06, .07, .01, M.acid), .22, .275, .2)); if (lv >= 2) base.add(at(cyl(.04, .05, .01, M.acid), -.24, .275, -.15));
  const head = grp(), tl = .5 * s, tr = .14 * s;
  const tanks = lv >= 3 ? [-.09, .09] : [0];
  tanks.forEach(z => {
    const t = grp();
    t.add(at(cap(tr * (lv >= 3 ? .78 : 1), tl * .7, M.acidGlass), 0, 0, 0, 0, 0, Math.PI / 2));
    [-.16, 0, .16].forEach(x => t.add(at(tor(tr * (lv >= 3 ? .8 : 1.03), .022, lv >= 2 ? M.brass : M.iron), x * s, 0, 0, 0, Math.PI / 2)));
    t.add(at(cyl(.035, .05, .14, M.brass), tl * .55, 0, 0, 0, 0, -Math.PI / 2));   // nozzle
    t.add(at(cyl(.045, .045, .03, M.ironDark), tl * .63, 0, 0, 0, 0, -Math.PI / 2));
    t.position.set(0, .2, z); t.rotation.z = .35; head.add(t);
  });
  head.add(at(rbox(.22, .16, .3, .04, M.iron), -.04, .06, 0));
  head.add(at(cyl(.12, .14, .06, M.ironDark), 0, 0, 0));
  head.add(at(cyl(.02, .02, .2, M.copper), -.12, .22, .14));   // a pipe up to a pressure gauge
  head.add(at(cyl(.05, .05, .02, M.brass), -.12, .33, .14, Math.PI / 2)); head.add(at(cyl(.04, .04, .021, M.white), -.12, .33, .145, Math.PI / 2));
  return { base, head, pivot: .38 };
}

function claw(lv) {
  // the heavy catapult: a turntable cart, a long throwing arm with an iron claw bucket and a counterweight
  const s = [1, 1.1, 1.2][lv - 1], base = grp();
  base.add(platform(lv, { spikes: lv >= 3, w: .82 }));
  [-1, 1].forEach(k => [-1, 1].forEach(j => { const w = cyl(.1, .1, .05, M.woodDark, 16); w.rotation.x = Math.PI / 2; w.position.set(j * .3, .1, k * .43); base.add(w);
    base.add(at(tor(.1, .015, M.iron), j * .3, .1, k * .45)); }));
  const head = grp();
  head.add(at(cyl(.24, .26, .06, M.ironDark), 0, 0, 0));
  [-1, 1].forEach(k => head.add(at(rbox(.36, .08, .06, .02, M.woodDark), 0, .14, k * .15, 0, 0, .9 * k * 0)));
  [-1, 1].forEach(k => { head.add(at(rbox(.07, .32, .06, .02, M.wood), -.02, .18, k * .15)); head.add(at(sph(.03, M.brass, 8, 6), -.02, .3, k * .185)); });
  head.add(at(cyl(.03, .03, .36, M.iron), -.02, .3, 0, Math.PI / 2));
  // the arm, cocked back
  const arm = grp(), L = .66 * s;
  arm.add(at(rbox(L, .09, .09, .03, M.wood), L * .25, 0, 0));
  [.0, .3, .5].forEach(t => arm.add(at(box(.03, .1, .1, M.iron), L * t, 0, 0)));
  arm.add(at(box(.06, .09, .09, M.iron), L * .05, 0, 0));
  // the claw bucket holding a boulder at the far end
  const cx = L * .62; arm.add(at(rock(.12, M.rock, 1), cx, .11, 0));
  for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + .78; const f = cone(.025, .16, lv >= 2 ? M.brass : M.ironDark, 8); at(f, cx + Math.cos(a) * .08, .08, Math.sin(a) * .08, Math.sin(a) * .7, 0, -Math.cos(a) * .7); arm.add(f); }
  arm.add(at(cyl(.07, .05, .06, M.iron), cx, .03, 0));
  // counterweight
  arm.add(at(rbox(.14, .16, .16, .03, M.ironDark), -L * .2, -.08, 0));
  if (lv >= 2) arm.add(rivets(.08, 0, 8, M.brass).translateX(-L * .2).translateY(-.08));
  arm.position.set(-.02, .3, 0); arm.rotation.z = .55; head.add(arm);
  if (lv >= 3) head.add(at(cyl(.02, .02, .3, M.rope), -.15, .2, .1, 0, 0, .9));
  return { base, head, pivot: .3, hs: 1.55 };
}

function tesla(lv) {
  const s = [1, 1.08, 1.16][lv - 1], base = grp();
  base.add(platform(lv, { spikes: false, deck: M.stoneGrey }));
  base.add(at(cyl(.15, .22, .3 * s, M.ironDark), 0, .42, 0));
  for (let i = 0; i < 6 + lv * 2; i++) base.add(at(tor(.13 - i * .004, .022, M.coil), 0, .6 + i * .045, 0, Math.PI / 2));
  const top = .6 + (6 + lv * 2) * .045;
  base.add(at(cyl(.05, .06, .1, M.brass), 0, top, 0));
  [0, 1, 2].forEach(i => { const a = i / 3 * Math.PI * 2; base.add(at(cyl(.015, .015, .4, M.copper), Math.cos(a) * .16, .4, Math.sin(a) * .16, Math.sin(a) * .2, 0, -Math.cos(a) * .2)); });
  base.add(at(sph(.13 * s, M.orb), 0, top + .14 * s, 0));
  base.add(at(sph(.06 * s, M.orbCore), 0, top + .14 * s, 0));
  base.add(at(tor(.17 * s, .018, M.brass), 0, top + .1 * s, 0, Math.PI / 2));
  if (lv >= 3) [-1, 1].forEach(k => { base.add(at(cyl(.02, .02, .3, M.brass), k * .28, .45, 0)); base.add(at(sph(.05, M.orb), k * .28, .62, 0)); });
  base.userData.orb = top + .14 * s;
  return { base, head: null, pivot: top + .14 * s };
}

function mortar(lv) {
  const s = [1, 1.08, 1.16][lv - 1], base = grp();
  base.add(at(rbox(.8, .2, .8, .06, M.woodRed), 0, .1, 0));
  base.add(at(rbox(.84, .05, .84, .02, M.ironDark), 0, .2, 0));
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([x, z]) => base.add(at(cone(.06, .12, lv >= 2 ? M.brass : M.iron, 10), x * .34, .27, z * .34)));
  base.add(rivets(.4, .2, 16, M.brass, .022));
  const head = grp();
  head.add(at(cyl(.28 * s, .3 * s, .1, M.ironDark), 0, 0, 0));
  const bar = grp(), br = .19 * s;
  bar.add(lathe([[0, 0], [br * 1.1, 0], [br * 1.25, .1], [br * 1.1, .26 * s], [br * 1.25, .32 * s], [br * .85, .34 * s], [br * .8, .1], [0, .1]], M.black, 28));
  bar.add(at(tor(br * 1.25, .03, lv >= 2 ? M.brass : M.iron), 0, .32 * s, 0, Math.PI / 2));
  bar.add(at(cyl(br * .78, br * .78, .01, M.dark), 0, .335 * s, 0));
  bar.position.set(0, .05, 0); bar.rotation.z = -.5; head.add(bar);
  [-1, 1].forEach(k => head.add(at(rbox(.12, .26, .05, .02, M.woodRed), 0, .1, k * .26 * s)));
  if (lv >= 3) for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; head.add(at(spike(.1, .03, M.steel), Math.cos(a) * .3 * s, .05, Math.sin(a) * .3 * s, Math.sin(a) * 1.5, 0, -Math.cos(a) * 1.5)); }
  return { base, head, pivot: .26 };
}

function dome(lv) {
  // the spiked dome: an iron dome bristling with spikes on a wooden ring; it spins up and slams the ground
  const s = [1, 1.08, 1.16][lv - 1], base = grp();
  base.add(at(cyl(.38, .42, .14, M.wood), 0, .07, 0));
  base.add(at(tor(.4, .025, M.iron), 0, .14, 0, Math.PI / 2));
  base.add(rivets(.41, .08, 14, M.brass, .02));
  const head = grp();
  head.add(at(hemi(.3 * s, M.ironDark), 0, 0, 0));
  head.add(at(tor(.3 * s, .03, lv >= 2 ? M.brass : M.iron), 0, .01, 0, Math.PI / 2));
  const rows = [[.25, 8], [.7, 7], [1.1, 5]];
  rows.forEach(([el, n], ri) => { for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + ri * .3, dir = new THREE.Vector3(Math.cos(a) * Math.cos(el), Math.sin(el), Math.sin(a) * Math.cos(el));
    const sp = cone(.04, .16 * s, M.steel, 8); sp.position.copy(dir.clone().multiplyScalar(.3 * s + .06)); sp.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir); head.add(sp); } });
  head.add(at(cone(.05, .2 * s, lv >= 3 ? M.gold : M.steel, 10), 0, .38 * s, 0));
  // glowing vents
  for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + .4; head.add(at(sph(.035, M.glowRed, 10, 8), Math.cos(a) * .2 * s, .2 * s, Math.sin(a) * .2 * s)); }
  return { base, head, pivot: .14 };
}

export const TOWERS = { crossbow, bomb, frost, poison, claw, tesla, mortar, dome };

// ═══ Enemies ════════════════════════════════════════════════════════════════
// Each returns { root, pose(phase) } facing +x (walking right); phase 0..1 through one walk cycle.
function humanoid(o) {
  // a chunky little soldier: big head, stubby legs, arms that swing
  const root = grp(), body = grp(), s = o.s || 1;
  const hip = .22 * s, legL = .16 * s;
  const legs = [-1, 1].map(k => { const l = grp(); l.add(at(cap(.05 * s, legL * .7, o.pants || M.pants), 0, -legL / 2, 0)); l.add(at(rbox(.12 * s, .06 * s, .08 * s, .025, o.boot || M.boot), .025 * s, -legL - .02, 0)); l.position.set(0, hip, k * .07 * s); root.add(l); return l; });
  body.add(at(cap(.12 * s, .12 * s, o.torso || M.redCloth), 0, .1 * s, 0, 0, 0, 0, [1, 1, 1.05]));
  if (o.belt !== false) body.add(at(tor(.115 * s, .02 * s, M.leather), 0, .04 * s, 0, Math.PI / 2));
  const head = grp(); head.position.set(0, .32 * s, 0); body.add(head);
  head.add(at(sph(.12 * s, o.skin || M.skin), 0, 0, 0));
  if (o.eyes !== false) [-1, 1].forEach(k => head.add(at(sph(.022 * s, o.eyeMat || M.eye, 8, 6), .105 * s, .02 * s, k * .045 * s)));
  const arms = [-1, 1].map(k => { const a = grp(); a.add(at(cap(.04 * s, .1 * s, o.sleeve || o.torso || M.redCloth), 0, -.07 * s, 0)); a.add(at(sph(.045 * s, o.hand || o.skin || M.skin, 10, 8), 0, -.15 * s, 0)); a.position.set(0, .2 * s, k * .15 * s); body.add(a); return a; });
  body.position.y = hip; root.add(body);
  return { root, body, head, legs, arms, s };
}
function walkPose(h, ph, amp) {
  const a = Math.sin(ph * Math.PI * 2) * (amp || .55);
  h.legs[0].rotation.z = a; h.legs[1].rotation.z = -a;
  h.arms[0].rotation.z = -a * .8; h.arms[1].rotation.z = a * .8 * (h.shieldArm ? .2 : 1);
  h.body.position.y = .22 * h.s + Math.abs(Math.cos(ph * Math.PI * 2)) * .025 * h.s;
  h.body.rotation.z = -.06;
}
function shieldRound(r, face, rim) { const g = grp(); g.add(at(cyl(r, r, .03, face, 24), 0, 0, 0, Math.PI / 2)); g.add(at(tor(r, .015, rim || M.iron), 0, 0, 0)); g.add(at(sph(r * .28, M.iron, 10, 8), 0, 0, .02)); return g; }
function sword(len, mat) { const g = grp(); g.add(at(box(.025, len, .05, mat || M.steel), 0, len / 2 + .04, 0)); g.add(at(box(.03, .02, .14, M.brass), 0, .04, 0)); g.add(at(cyl(.015, .015, .06, M.leather), 0, 0, 0)); return g; }

function footman() {
  const h = humanoid({ torso: M.redCloth });
  h.head.add(at(hemi(.13, M.iron), 0, .02, 0)); h.head.add(at(tor(.14, .02, M.iron), 0, .03, 0, Math.PI / 2));
  const sh = shieldRound(.13, M.woodRed); sh.position.set(0, -.12, -.05); sh.rotation.y = 0; h.arms[0].add(sh);
  const sw = sword(.2); sw.position.set(0, -.15, 0); sw.rotation.z = -.4; h.arms[1].add(sw); h.shieldArm = true;
  return { root: h.root, pose: p => walkPose(h, p) };
}
function knight() {
  const h = humanoid({ torso: M.steel, sleeve: M.steel, hand: M.iron, pants: M.iron, boot: M.ironDark, eyes: false, s: 1.08 });
  h.head.add(at(cyl(.125, .13, .2, M.steel), 0, 0, 0));
  h.head.add(at(box(.02, .025, .16, M.dark), .126, .02, 0));
  h.head.add(at(cone(.04, .2, M.redCloth, 8), -.02, .16, 0, 0, 0, .5));
  h.body.add(at(tor(.12, .025, M.brass), 0, .2, 0, Math.PI / 2));
  // kite shield in the knight's colours
  const sh = grp(); sh.add(at(rbox(.04, .3, .22, .02, M.blueCloth), 0, 0, 0)); sh.add(at(box(.045, .26, .04, M.gold), 0, 0, 0)); sh.add(at(box(.045, .04, .18, M.gold), 0, .04, 0));
  sh.position.set(.04, -.12, -.06); h.arms[0].add(sh); h.shieldArm = true;
  const sw = sword(.26); sw.position.set(0, -.15, 0); sw.rotation.z = -.3; h.arms[1].add(sw);
  return { root: h.root, pose: p => walkPose(h, p, .45) };
}
function skeleton() {
  const root = grp(), body = grp();
  const legs = [-1, 1].map(k => { const l = grp(); l.add(at(cyl(.022, .022, .18, M.bone, 8), 0, -.09, 0)); l.add(at(sph(.03, M.bone, 8, 6), 0, -.1, 0)); l.add(at(rbox(.09, .03, .05, .01, M.bone), .02, -.19, 0)); l.position.set(0, .2, k * .06); root.add(l); return l; });
  body.add(at(cyl(.02, .02, .2, M.bone, 8), 0, .1, 0));
  for (let i = 0; i < 4; i++) body.add(at(tor(.08 - i * .008, .014, M.bone, Math.PI * 1.5), 0, .1 + i * .045, 0, Math.PI / 2, 0, -Math.PI * .75 + Math.PI));
  body.add(at(tor(.07, .02, M.bone), 0, 0, 0, Math.PI / 2));
  const head = grp(); head.position.y = .32; body.add(head);
  head.add(at(sph(.11, M.bone), 0, 0, 0, 0, 0, 0, [1, .95, .9])); head.add(at(rbox(.09, .06, .12, .02, M.bone), .04, -.07, 0));
  [-1, 1].forEach(k => head.add(at(sph(.032, M.dark, 8, 6), .085, .01, k * .045)));
  head.add(at(sph(.03, M.eyeRed, 8, 6), .09, .01, .045)); head.add(at(sph(.03, M.eyeRed, 8, 6), .09, .01, -.045));
  head.add(at(hemi(.115, M.ironDark), -.01, .02, 0, 0, 0, -.15));
  const arms = [-1, 1].map(k => { const a = grp(); a.add(at(cyl(.018, .018, .17, M.bone, 8), 0, -.08, 0)); a.add(at(sph(.03, M.bone, 8, 6), 0, -.17, 0)); a.position.set(0, .2, k * .11); body.add(a); return a; });
  const sh = shieldRound(.11, M.woodRed, M.ironDark); sh.position.set(0, -.12, -.04); arms[0].add(sh);
  const sw = sword(.2, M.iron); sw.position.set(0, -.17, 0); sw.rotation.z = -.4; arms[1].add(sw);
  body.position.y = .2; root.add(body);
  const h = { root, body, legs, arms, head, s: .9, shieldArm: true };
  return { root, pose: p => { walkPose(h, p, .6); h.body.position.y = .2 + Math.abs(Math.cos(p * Math.PI * 2)) * .03; } };
}
function rider() {
  // a scout riding a big tusked boar: fast
  const root = grp(), boar = grp();
  boar.add(at(ell(.26, .16, .15, M.fur), 0, .26, 0));
  boar.add(at(ell(.14, .12, .12, M.fur), .24, .26, 0));
  boar.add(at(cyl(.06, .07, .08, M.skin), .37, .23, 0, 0, 0, Math.PI / 2));
  [-1, 1].forEach(k => { boar.add(at(cone(.02, .1, M.bone, 8), .34, .18, k * .06, 0, 0, -2.4)); boar.add(at(sph(.022, M.eyeRed, 8, 6), .31, .31, k * .07)); boar.add(at(cone(.04, .08, M.fur, 6), .2, .38, k * .07, k * .3, 0, 0)); });
  for (let i = 0; i < 8; i++) boar.add(at(cone(.03, .1, M.boot, 6), -.1 + i * .045, .42 - Math.abs(i - 3) * .006, 0, 0, 0, .1));
  boar.add(at(cyl(.012, .006, .12, M.fur, 6), -.27, .3, 0, 0, 0, 1.1));
  const legs = [[-.15, -1], [-.15, 1], [.15, -1], [.15, 1]].map(([x, k]) => { const l = grp(); l.add(at(cyl(.04, .035, .14, M.fur, 10), 0, -.07, 0)); l.add(at(cyl(.04, .04, .03, M.boot, 10), 0, -.15, 0)); l.position.set(x, .18, k * .09); boar.add(l); return l; });
  root.add(boar);
  const h = humanoid({ torso: M.greenCloth, s: .8 });
  h.legs.forEach(l => { l.rotation.x = 0; l.position.z *= 2.2; l.rotation.z = .9; });
  h.root.position.set(-.04, .22, 0); root.add(h.root);
  h.head.add(at(cone(.12, .16, M.leather, 12), 0, .1, 0)); h.head.add(at(tor(.12, .02, M.leather), 0, .04, 0, Math.PI / 2));
  const lance = grp(); lance.add(at(cyl(.015, .015, .6, M.woodPale, 8), 0, .2, 0)); lance.add(at(cone(.03, .1, M.steel, 8), 0, .52, 0)); lance.add(at(box(.005, .07, .08, M.redCloth), 0, .4, .04));
  lance.position.set(0, -.12, 0); lance.rotation.z = -1.2; h.arms[1].add(lance);
  return { root, pose: p => {
    const a = Math.sin(p * Math.PI * 2);
    legs[0].rotation.z = a * .7; legs[3].rotation.z = a * .7; legs[1].rotation.z = -a * .7; legs[2].rotation.z = -a * .7;
    boar.position.y = Math.abs(Math.cos(p * Math.PI * 2)) * .04; boar.rotation.z = a * .06;
    h.root.position.y = .22 + boar.position.y * 1.2; h.arms[0].rotation.z = -.6 + a * .1; h.arms[1].rotation.z = .3;
    h.body.position.y = .22 * h.s;
  } };
}
function spiderModel(body, belly, scale, crown) {
  const root = grp(), s = scale || 1, bodyG = grp();
  bodyG.add(at(ell(.2 * s, .15 * s, .17 * s, body), -.14 * s, .2 * s, 0));
  for (let i = 0; i < 5; i++) bodyG.add(at(sph(.03 * s, belly, 8, 6), -.14 * s + Math.cos(i) * .1 * s, .32 * s, Math.sin(i * 2.1) * .09 * s));
  bodyG.add(at(ell(.11 * s, .09 * s, .1 * s, body), .06 * s, .17 * s, 0));
  bodyG.add(at(ell(.07 * s, .06 * s, .07 * s, body), .16 * s, .16 * s, 0));
  [-1, 1].forEach(k => { bodyG.add(at(cone(.018 * s, .07 * s, M.bone, 6), .21 * s, .1 * s, k * .03 * s, 0, 0, Math.PI * .85)); bodyG.add(at(sph(.022 * s, M.eyeRed, 8, 6), .21 * s, .19 * s, k * .03 * s)); bodyG.add(at(sph(.014 * s, M.eyeRed, 8, 6), .2 * s, .22 * s, k * .055 * s)); });
  if (crown) { for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; bodyG.add(at(cone(.025 * s, .07 * s, M.gold, 6), .16 * s + Math.cos(a) * .04 * s, .25 * s, Math.sin(a) * .04 * s)); } bodyG.add(at(tor(.045 * s, .012 * s, M.gold), .16 * s, .22 * s, 0, Math.PI / 2)); }
  root.add(bodyG);
  const legs = [];
  for (let i = 0; i < 8; i++) {
    const side = i < 4 ? -1 : 1, j = i % 4, x0 = .1 * s - j * .06 * s, leg = grp();
    const kx = (.04 - j * .045) * s, kz = side * .2 * s, fx = (.08 - j * .09) * s, fz = side * .32 * s;
    leg.add(rod([0, 0, 0], [kx, .14 * s, kz], .018 * s, body)); leg.add(rod([kx, .14 * s, kz], [fx, -.17 * s, fz], .014 * s, body));
    leg.add(at(sph(.022 * s, body, 8, 6), kx, .14 * s, kz));
    leg.position.set(x0, .17 * s, side * .05 * s); bodyG.add(leg); legs.push({ leg, j, side });
  }
  return { root, pose: p => {
    legs.forEach(({ leg, j, side }) => { const ph = p * Math.PI * 2 + (j % 2 ? Math.PI : 0) + (side > 0 ? Math.PI : 0); leg.rotation.y = Math.sin(ph) * .35; leg.rotation.x = Math.max(0, Math.cos(ph)) * .25 * side; });
    bodyG.position.y = Math.abs(Math.sin(p * Math.PI * 4)) * .015 * s;
  } };
}
function spider() { const M2 = mats(); return spiderModel(new THREE.MeshStandardMaterial({ color: 0xb8361e, roughness: .55 }), M2.gold, 1); }
function ogreModel(skin, cloth, s, extra) {
  const h = humanoid({ torso: skin, sleeve: skin, skin: skin, pants: cloth, boot: M.fur, s: s, eyeMat: M.eyeRed });
  // big round belly, small head, tusks, loincloth, heavy club
  h.body.add(at(ell(.2 * s, .2 * s, .2 * s, skin), .04 * s, .1 * s, 0));
  h.body.add(at(cyl(.21 * s, .2 * s, .08 * s, cloth), 0, -.02 * s, 0));
  h.head.scale.setScalar(1.05); h.head.position.set(.06 * s, .36 * s, 0);
  [-1, 1].forEach(k => { h.head.add(at(cone(.02 * s, .07 * s, M.bone, 8), .1 * s, -.06 * s, k * .05 * s, 0, 0, -.3)); h.head.add(at(cone(.04 * s, .07 * s, skin, 8), 0, .02 * s, k * .12 * s, k * 1.3, 0, 0)); });
  h.head.add(at(ell(.05 * s, .03 * s, .1 * s, skin), .09 * s, .07 * s, 0));
  const club = grp(); club.add(at(cyl(.05 * s, .025 * s, .36 * s, M.woodDark, 10), 0, .18 * s, 0));
  for (let i = 0; i < 5; i++) club.add(at(cone(.018 * s, .05 * s, M.iron, 6), Math.cos(i * 1.3) * .045 * s, .26 * s + i * .02 * s, Math.sin(i * 1.3) * .045 * s, Math.sin(i * 1.3) * 1.4, 0, -Math.cos(i * 1.3) * 1.4));
  club.position.set(0, -.15 * s, 0); club.rotation.z = -1.0; h.arms[1].add(club);
  h.arms.forEach(a => a.scale.set(1.5, 1.2, 1.5));
  if (extra) extra(h, s);
  return { root: h.root, pose: p => { walkPose(h, p, .35); h.body.rotation.z = -.12; h.body.position.y = .22 * s + Math.abs(Math.cos(p * Math.PI * 2)) * .035 * s; } };
}
function ogre() { return ogreModel(new THREE.MeshStandardMaterial({ color: 0x7aa84a, roughness: .7 }), M.leather, 1.45); }
function wraithModel(robe, s, crown) {
  // a spindly hooded spirit: narrow robe trailing into ragged wisps, long arms reaching ahead with bony claws
  s = s || 1;
  const root = grp(), body = grp();
  const r = lathe([[0, .0], [.03, .04], [.07, .14], [.1, .26], [.11, .36], [.09, .44], [.05, .48], [0, .49]].map(([x, y]) => [x * s, y * s]), robe, 18);
  r.rotation.z = -.35; body.add(r);
  const wisps = [];
  for (let i = 0; i < 4; i++) { const w = cone(.035 * s, .26 * s, robe, 8); w.position.set((-.08 - i * .03) * s, .02 * s, (i - 1.5) * .045 * s); w.rotation.set((i - 1.5) * .2, 0, Math.PI * .72); body.add(w); wisps.push(w); }
  const hood = grp(); hood.add(at(sph(.1 * s, robe, 18, 14), 0, 0, 0, 0, 0, 0, [1.1, 1, .95])); hood.add(at(cone(.07 * s, .14 * s, robe, 12), -.07 * s, .07 * s, 0, 0, 0, .9));
  hood.add(at(sph(.075 * s, M.dark, 14, 10), .045 * s, -.01 * s, 0, 0, 0, 0, [.8, 1, .9]));
  [-1, 1].forEach(k => hood.add(at(sph(.02 * s, crown ? M.eyeGlow : M.eyeRed, 8, 6), .1 * s, 0, k * .032 * s)));
  hood.position.set(.14 * s, .44 * s, 0); body.add(hood);
  const arms = [-1, 1].map(k => { const a = grp(); a.add(at(cyl(.022 * s, .04 * s, .3 * s, robe, 8), 0, -.14 * s, 0)); for (let i = 0; i < 3; i++) a.add(at(cone(.012 * s, .12 * s, M.bone, 6), .015 * s, -.33 * s, (i - 1) * .03 * s, (i - 1) * .3, 0, Math.PI * .8)); a.position.set(.1 * s, .36 * s, k * .1 * s); a.rotation.z = -1.4; a.rotation.x = k * .25; body.add(a); return a; });
  if (crown) { for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; hood.add(at(cone(.022 * s, .09 * s, M.gold, 6), Math.cos(a) * .07 * s, .1 * s, Math.sin(a) * .07 * s)); } hood.add(at(tor(.075 * s, .016 * s, M.gold), 0, .07 * s, 0, Math.PI / 2)); }
  body.position.y = .1 * s; root.add(body);
  return { root, fly: true, pose: p => { const a = p * Math.PI * 2; body.position.y = .1 * s + Math.sin(a) * .04 * s; arms[0].rotation.z = -1.4 + Math.sin(a) * .2; arms[1].rotation.z = -1.4 - Math.sin(a) * .2;
    wisps.forEach((w, i) => { w.rotation.y = Math.sin(a + i) * .35; }); } };
}
function wraith() { return wraithModel(new THREE.MeshStandardMaterial({ color: 0x9446e0, emissive: 0x4a128a, emissiveIntensity: .45, roughness: .5 }), .9); }
function shaman() {
  const h = humanoid({ torso: M.purpleCloth, sleeve: M.purpleCloth, skin: M.skin });
  h.body.add(at(cone(.17, .28, M.purpleCloth, 16), 0, -.06, 0));
  h.head.add(at(cone(.13, .26, M.purpleCloth, 16), -.02, .12, 0, 0, 0, .25)); h.head.add(at(tor(.12, .025, M.gold), 0, .02, 0, Math.PI / 2));
  h.head.add(at(ell(.06, .08, .08, M.white), .07, -.1, 0));   // a white beard
  const st = grp(); st.add(at(cyl(.015, .015, .55, M.woodDark, 8), 0, .1, 0)); st.add(at(sph(.055, M.acid), 0, .4, 0)); st.add(at(tor(.06, .012, M.gold), 0, .4, 0, Math.PI / 2));
  st.position.set(0, -.15, 0); h.arms[1].add(st);
  return { root: h.root, pose: p => { walkPose(h, p, .3); h.arms[1].rotation.z = .25; } };
}
function gargoyle(scale) {
  // a stone winged gargoyle: flies over the maze, hard to hurt
  const s = scale || 1, root = grp(), body = grp(), stoneM = new THREE.MeshStandardMaterial({ color: 0x8a8f99, roughness: .9, flatShading: true });
  body.add(at(ell(.15 * s, .13 * s, .12 * s, stoneM), 0, .25 * s, 0));
  body.add(at(sph(.09 * s, stoneM), .14 * s, .33 * s, 0));
  [-1, 1].forEach(k => { body.add(at(cone(.025 * s, .1 * s, M.bone, 6), .12 * s, .43 * s, k * .05 * s, k * .3, 0, -.3)); body.add(at(sph(.02 * s, M.eyeGlow, 8, 6), .22 * s, .35 * s, k * .035 * s)); });
  body.add(at(cone(.02 * s, .2 * s, stoneM, 6), -.2 * s, .2 * s, 0, 0, 0, 1.9));
  const wings = [-1, 1].map(k => {
    const w = grp(), sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(.16, .42); sh.lineTo(-.06, .34); sh.lineTo(-.14, .44); sh.lineTo(-.24, .28); sh.lineTo(-.34, .32); sh.lineTo(-.26, .06); sh.closePath();
    const g = new THREE.ExtrudeGeometry(sh, { depth: .015, bevelEnabled: false }); g.scale(s, s, s);
    const m = mesh(g, new THREE.MeshStandardMaterial({ color: 0x4a4f5a, roughness: .9, side: THREE.DoubleSide })); m.rotation.x = -Math.PI / 2 * k; w.add(m);
    w.position.set(0, .3 * s, k * .08 * s); body.add(w); return { w, k };
  });
  root.add(body);
  return { root, fly: true, pose: p => { const a = Math.sin(p * Math.PI * 2); wings.forEach(({ w, k }) => { w.rotation.x = k * (a * .7 - .1); }); body.position.y = .12 * s + a * .03 * s; } };
}
function sheep() {
  const root = grp(), body = grp();
  for (let i = 0; i < 9; i++) body.add(at(sph(.09, M.wool, 12, 10), -.08 + (i % 3) * .08, .28 + Math.floor(i / 3) % 2 * .05, (Math.floor(i / 3) - 1) * .07));
  body.add(at(ell(.16, .12, .12, M.wool), 0, .26, 0));
  const hd = grp(); hd.add(at(ell(.08, .065, .06, M.dark), 0, 0, 0)); [-1, 1].forEach(k => { hd.add(at(ell(.04, .015, .025, M.dark), -.02, .02, k * .07, k * .4)); hd.add(at(sph(.014, M.white, 8, 6), .05, .02, k * .03)); });
  hd.add(at(sph(.05, M.wool, 10, 8), -.02, .05, 0)); hd.position.set(.18, .3, 0); body.add(hd);
  const legs = [[-.08, -1], [-.08, 1], [.08, -1], [.08, 1]].map(([x, k]) => { const l = grp(); l.add(at(cyl(.022, .02, .16, M.dark, 8), 0, -.08, 0)); l.position.set(x, .2, k * .06); body.add(l); return l; });
  root.add(body);
  return { root, pose: p => { const a = Math.sin(p * Math.PI * 2) * .5; legs[0].rotation.z = a; legs[3].rotation.z = a; legs[1].rotation.z = -a; legs[2].rotation.z = -a; body.position.y = Math.abs(Math.cos(p * Math.PI * 2)) * .02; hd.rotation.z = Math.sin(p * Math.PI * 2) * .1; } };
}
// Bosses: bigger, meaner versions with crowns, horns and armour
function blackKnight() {
  const dark = new THREE.MeshStandardMaterial({ color: 0x2a2c34, metalness: .85, roughness: .3 });
  const h = humanoid({ torso: dark, sleeve: dark, hand: dark, pants: dark, boot: M.black, eyes: false, s: 1.7 });
  const s = 1.7;
  h.head.add(at(cyl(.125 * s, .13 * s, .2 * s, dark), 0, 0, 0)); h.head.add(at(box(.02 * s, .025 * s, .16 * s, M.eyeRed), .126 * s, .02 * s, 0));
  [-1, 1].forEach(k => h.head.add(at(cone(.04 * s, .2 * s, M.bone, 10), 0, .14 * s, k * .1 * s, k * -.5, 0, 0)));
  for (let i = 0; i < 5; i++) h.head.add(at(cone(.02 * s, .06 * s, M.gold, 6), -.02 * s + Math.cos(i * 1.25) * .1 * s, .12 * s, Math.sin(i * 1.25) * .1 * s));
  const cape = mesh(new THREE.PlaneGeometry(.34 * s, .44 * s), new THREE.MeshStandardMaterial({ color: 0x8a1020, roughness: .8, side: THREE.DoubleSide })); cape.position.set(-.13 * s, .05 * s, 0); cape.rotation.set(0, Math.PI / 2, .15); h.body.add(cape);
  [-1, 1].forEach(k => h.body.add(at(hemi(.07 * s, dark), 0, .22 * s, k * .14 * s, k * .5)));
  const sw = sword(.42 * s, M.steel); sw.scale.setScalar(1.3); sw.position.set(0, -.15 * s, 0); sw.rotation.z = -.5; h.arms[1].add(sw);
  const sh = grp(); sh.scale.setScalar(.7); sh.add(at(rbox(.04 * s, .3 * s, .22 * s, .02, new THREE.MeshStandardMaterial({ color: 0x8a1020, roughness: .6 })), 0, 0, 0)); sh.add(at(sph(.05 * s, M.gold), .02 * s, .02 * s, 0));
  sh.position.set(.04 * s, -.12 * s, -.06 * s); h.arms[0].add(sh); h.shieldArm = true;
  return { root: h.root, pose: p => walkPose(h, p, .4) };
}
function frostTroll() {
  return ogreModel(new THREE.MeshStandardMaterial({ color: 0x8fb8e0, roughness: .6 }), new THREE.MeshStandardMaterial({ color: 0x3a4a6a, roughness: .9 }), 2.1, (h, s) => {
    for (let i = 0; i < 6; i++) h.body.add(at(crystal(.04 * s, .1 * s, M.ice), -.12 * s + i * .03 * s, .3 * s - Math.abs(i - 2.5) * .02 * s, (i % 2 - .5) * .12 * s, 0, 0, .5 - i * .1));
    h.head.add(at(ell(.09 * s, .05 * s, .1 * s, M.white), .07 * s, -.08 * s, 0));
  });
}
function spiderQueen() { return spiderModel(new THREE.MeshStandardMaterial({ color: 0x6a2aa8, roughness: .45 }), M.acid, 2.0, true); }
function ogreWarlord() {
  return ogreModel(new THREE.MeshStandardMaterial({ color: 0x5a8a3a, roughness: .7 }), M.redCloth, 2.15, (h, s) => {
    h.body.add(at(cyl(.16 * s, .2 * s, .1 * s, M.ironDark), .03 * s, .14 * s, 0));
    h.body.add(rivets(.17 * s, .16 * s, 12, M.brass, .016 * s));
    [-1, 1].forEach(k => { h.body.add(at(hemi(.08 * s, M.ironDark), 0, .26 * s, k * .17 * s, k * .6)); h.body.add(at(cone(.02 * s, .07 * s, M.steel, 6), 0, .33 * s, k * .2 * s, k * .5)); });
    h.head.add(at(hemi(.13 * s, M.ironDark), 0, .02 * s, 0));
    [-1, 1].forEach(k => h.head.add(at(cone(.035 * s, .16 * s, M.bone, 10), 0, .1 * s, k * .13 * s, k * -.9, 0, 0)));
  });
}
function wraithLord() { return wraithModel(new THREE.MeshStandardMaterial({ color: 0x5a2a9a, emissive: 0x3a0a7a, emissiveIntensity: .5, roughness: .45 }), 1.55, true); }

export const ENEMIES = { footman, knight, skeleton, rider, spider, ogre, wraith, shaman, gargoyle, sheep, blackKnight, frostTroll, spiderQueen, ogreWarlord, wraithLord };

// ═══ The goblin hero: an engineer in a blue steam mech (the ability button and its stomp on the map) ═════════
export function hero() {
  const root = grp(), body = grp(), blue = new THREE.MeshStandardMaterial({ color: 0x3a9ad8, metalness: .6, roughness: .35 });
  const legs = [-1, 1].map(k => { const l = grp(); l.add(at(cyl(.05, .04, .2, M.iron, 10), 0, -.1, 0)); l.add(at(rbox(.16, .05, .1, .02, blue), .03, -.21, 0)); l.add(at(sph(.05, M.brass), 0, 0, 0)); l.position.set(0, .25, k * .1); root.add(l); return l; });
  body.add(at(rbox(.3, .26, .3, .08, blue), 0, .14, 0));
  body.add(rivets(.16, .2, 10, M.brass, .018));
  body.add(at(cyl(.11, .11, .04, M.brass), .15, .16, 0, 0, 0, Math.PI / 2)); body.add(at(cyl(.09, .09, .045, M.ice), .155, .16, 0, 0, 0, Math.PI / 2));
  // the goblin pilot: green, big ears, goggles
  const gob = grp(); gob.add(at(sph(.09, new THREE.MeshStandardMaterial({ color: 0x6abf4a, roughness: .6 })), 0, 0, 0));
  [-1, 1].forEach(k => { gob.add(at(cone(.035, .14, new THREE.MeshStandardMaterial({ color: 0x6abf4a, roughness: .6 }), 8), -.01, .02, k * .12, k * 1.5, 0, 0)); gob.add(at(cyl(.03, .03, .03, M.brass), .07, .03, k * .035, 0, 0, Math.PI / 2)); gob.add(at(cyl(.022, .022, .032, M.ice), .072, .03, k * .035, 0, 0, Math.PI / 2)); });
  gob.add(at(tor(.085, .012, M.leather), .0, .03, 0, 0, Math.PI / 2, 0));
  gob.position.set(-.02, .34, 0); body.add(gob);
  body.add(at(cyl(.03, .03, .2, M.ironDark), -.15, .32, -.08)); body.add(at(tor(.03, .01, M.brass), -.15, .43, -.08, Math.PI / 2));
  [-1, 1].forEach(k => { const a = grp(); a.add(at(cyl(.04, .04, .18, M.iron, 10), 0, -.09, 0)); a.add(at(sph(.05, M.brass), 0, 0, 0));
    if (k > 0) { a.add(at(cyl(.06, .06, .14, M.black), .04, -.2, 0, 0, 0, Math.PI / 2)); a.add(at(tor(.06, .015, M.brass), .11, -.2, 0, 0, Math.PI / 2)); }
    else for (let i = 0; i < 3; i++) a.add(at(cone(.02, .1, M.steel, 6), .03, -.22, (i - 1) * .03, 0, 0, Math.PI * .8));
    a.position.set(0, .22, k * .2); body.add(a); });
  body.position.y = .25; root.add(body);
  return { root, pose: p => { const a = Math.sin(p * Math.PI * 2) * .4; legs[0].rotation.z = a; legs[1].rotation.z = -a; body.position.y = .25 + Math.abs(Math.cos(p * Math.PI * 2)) * .02; } };
}

// ═══ Props for the maps ═════════════════════════════════════════════════════
function village() {
  // the goblin village: a round stone keep under shingled cone roofs, wooden lean-tos and the heart flag
  const g = grp();
  g.add(at(cyl(.55, .62, .5, M.stone, 28), 0, .25, 0));
  g.add(at(cone(.72, .55, M.shingle, 28), 0, .78, 0));
  g.add(at(cyl(.06, .06, .5, M.woodDark, 8), 0, 1.2, 0));
  const fl = new THREE.Shape(); fl.moveTo(0, 0); fl.lineTo(.42, 0); fl.lineTo(.36, -.12); fl.lineTo(.42, -.24); fl.lineTo(0, -.24); fl.closePath();
  const flag = mesh(new THREE.ShapeGeometry(fl), M.flag); flag.position.set(.03, 1.42, .01); g.add(flag);
  const hs = new THREE.Shape(); hs.moveTo(0, -.07); hs.bezierCurveTo(-.11, .0, -.08, .09, 0, .05); hs.bezierCurveTo(.08, .09, .11, 0, 0, -.07);
  const ht = mesh(new THREE.ShapeGeometry(hs), M.heart); ht.position.set(.2, 1.3, .02); g.add(ht);
  [[-.7, .25, .3, .38], [.68, -.2, .28, .34], [.15, .62, .26, .3]].forEach(([x, z, r, hh]) => {
    g.add(at(cyl(r, r * 1.1, hh, M.stone, 20), x, hh / 2, z)); g.add(at(cone(r * 1.35, r * 1.2, M.shingle, 20), x, hh + r * .55, z));
    g.add(at(cyl(.02, .02, .2, M.woodDark, 6), x, hh + r * 1.2 + .06, z));
  });
  // a wooden door and a stair of planks
  g.add(at(rbox(.22, .3, .06, .04, M.woodDark), .1, .15, .6));
  g.add(at(tor(.04, .01, M.iron), .16, .16, .64));
  for (let i = 0; i < 3; i++) g.add(at(box(.3, .03, .1, M.wood), .1, .015 + i * .0, .72 + i * .1, 0, 0, 0));
  g.add(at(rbox(.5, .05, .3, .02, M.wood), -.5, .03, .62, 0, .3, 0));
  for (let i = 0; i < 5; i++) g.add(at(cyl(.025, .03, .3, M.woodDark, 6), -.95 + i * .1, .15, -.45 + i * .02));
  g.add(at(box(.8, .025, .35, M.woodPale), .92, .02, .55, 0, -.25, 0));
  return g;
}
function cave(mat, dark) {
  // a cave mouth in a heap of boulders, enemies come out of the dark
  const g = grp(); mat = mat || M.rockMoss;
  g.add(at(ell(.5, .4, .38, dark || M.dark), 0, .22, .05));
  [[-.42, .1, .15, .32], [.4, .08, .12, .3], [-.25, .45, -.05, .3], [.22, .48, -.06, .32], [0, .62, -.12, .28], [-.55, .05, -.25, .3], [.55, .06, -.25, .28], [-.1, .2, -.35, .35], [.3, .2, -.4, .3]].forEach(([x, y, z, r], i) =>
    g.add(at(rock(r, i % 3 ? mat : M.rock, 1), x, y, z, i, i * 2, 0)));
  return g;
}
function bush(scale) { const g = grp(); for (let i = 0; i < 7; i++) { const a = i * 2.4, r = .14 + (i % 3) * .04; g.add(at(sph(r, [M.leaf, M.leafDark, M.leafLight][i % 3], 10, 8), Math.cos(a) * .17, .14 + (i % 2) * .08, Math.sin(a) * .13)); } g.scale.setScalar(scale || 1); return g; }
function palm(lean) {
  const g = grp(); let x = 0, y = 0;
  for (let i = 0; i < 7; i++) { const s = cyl(.06 - i * .004, .065 - i * .004, .16, M.trunk, 10); s.position.set(x, y + .08, 0); s.rotation.z = -(lean || .2) * i * .15; g.add(s); x += Math.sin((lean || .2) * i * .15) * .16; y += .15; }
  for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2, f = grp(); const lf = mesh(new THREE.ConeGeometry(.09, .55, 4), i % 2 ? M.leaf : M.leafDark); lf.scale.set(1, 1, .25); lf.rotation.z = -Math.PI / 2; lf.position.x = .26; f.add(lf); f.position.set(x, y, 0); f.rotation.set(0, a, -.35); g.add(f); }
  [0, 1, 2].forEach(i => g.add(at(sph(.045, M.trunk, 8, 6), x + Math.cos(i * 2) * .05, y - .05, Math.sin(i * 2) * .05)));
  return g;
}
function pine(snowy, s) {
  const g = grp(); g.add(at(cyl(.05, .07, .3, M.trunk, 8), 0, .15, 0));
  for (let i = 0; i < 3; i++) { const r = .38 - i * .1, y = .32 + i * .2; g.add(at(cone(r, .36, M.pine, 9), 0, y, 0)); if (snowy) g.add(at(cone(r * .82, .2, M.snow, 9), 0, y + .09, 0)); }
  g.scale.setScalar(s || 1); return g;
}
function cactus() { const g = grp(); g.add(at(cap(.08, .4, M.cactus), 0, .28, 0)); [-1, 1].forEach(k => { g.add(at(cap(.05, .14, M.cactus), k * .14, .32 + k * .05, 0)); g.add(at(cyl(.05, .05, .12, M.cactus, 10), k * .08, .22 + k * .05, 0, 0, 0, Math.PI / 2)); }); g.add(at(sph(.04, M.heart, 8, 6), 0, .54, 0)); return g; }
function deadTree() { const g = grp(); g.add(at(cyl(.04, .08, .5, M.trunk, 7), 0, .25, 0)); [[.3, .1, .6], [-.4, .2, .5], [.5, -.1, .3]].forEach(([z, ry, h]) => g.add(at(cyl(.015, .035, .3, M.trunk, 6), Math.sin(z) * .1, h, 0, 0, ry, z))); return g; }
function rocks(mat) { const g = grp(); [[0, 0, .22], [.25, .05, .15], [-.2, .08, .13], [.05, -.2, .12]].forEach(([x, z, r], i) => g.add(at(rock(r, mat || M.rock, 1), x, r * .6, z, i, i, 0))); return g; }
function pyramid() {
  const g = grp(), st = cone(.85, .95, M.sandstone, 4); st.rotation.y = Math.PI / 4; st.position.y = .475; g.add(st);
  g.add(at(box(.28, .3, .1, M.dark), 0, .15, .6)); g.add(at(box(.36, .06, .14, M.sandstone), 0, .32, .6));
  for (let i = 0; i < 5; i++) g.add(at(rock(.08, M.sandstone, 0), -.8 + i * .4, .04, .7 - (i % 2) * .1));
  return g;
}
function gate() {
  // a snowy stone castle gate (the snow map's entrance)
  const g = grp();
  [-1, 1].forEach(k => { g.add(at(cyl(.24, .26, .9, M.stoneGrey, 16), k * .55, .45, 0)); for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; g.add(at(box(.09, .1, .09, M.stoneGrey), k * .55 + Math.cos(a) * .22, .95, Math.sin(a) * .22)); } g.add(at(cone(.27, .06, M.snow, 16), k * .55, .93, 0)); });
  g.add(at(box(.9, .6, .3, M.stoneGrey), 0, .3, 0)); g.add(at(box(.94, .06, .34, M.snow), 0, .63, 0));
  for (let i = 0; i < 4; i++) g.add(at(box(.12, .1, .3, M.stoneGrey), -.33 + i * .22, .69, 0));
  g.add(at(box(.42, .42, .32, M.dark), 0, .21, .02)); g.add(at(cyl(.21, .21, .32, M.dark, 16, false), 0, .42, .02, Math.PI / 2));
  for (let i = 0; i < 4; i++) g.add(at(box(.025, .5, .02, M.ironDark), -.15 + i * .1, .26, .18));
  return g;
}
function skullPile() { const g = grp(); [[0, 0], [.12, .06], [-.1, .08], [.03, .14]].forEach(([x, z], i) => { const s = grp(); s.add(at(sph(.08, M.bone), 0, .07, 0)); s.add(at(sph(.022, M.dark, 6, 6), .06, .08, .03)); s.add(at(sph(.022, M.dark, 6, 6), .06, .08, -.03)); s.position.set(x, i === 3 ? .1 : 0, z); s.rotation.y = i; g.add(s); }); return g; }
function ribs() { const g = grp(); for (let i = 0; i < 6; i++) g.add(at(tor(.3 - i * .025, .025, M.bone, Math.PI * .9), -.4 + i * .16, 0, 0, 0, Math.PI / 2 + .2, 0)); g.add(at(cyl(.03, .03, 1.0, M.bone, 8), -.0, .05, 0, 0, 0, Math.PI / 2)); return g; }
function volcanoRock() { const g = grp(); [[0, 0, .3], [.25, .1, .18], [-.22, .05, .2]].forEach(([x, z, r], i) => g.add(at(rock(r, new THREE.MeshStandardMaterial({ color: 0x3a2f2c, roughness: 1, flatShading: true }), 1), x, r * .6, z, i, i, 0))); g.add(at(sph(.08, M.lava, 10, 8), .05, .36, .1)); return g; }
function lilyPad() { const g = grp(); const p = mesh(new THREE.CylinderGeometry(.12, .12, .01, 20, 1, false, .3, Math.PI * 1.8), M.leaf); g.add(p); g.add(at(sph(.04, M.white, 8, 6), .03, .03, .02, 0, 0, 0, [1, .6, 1])); return g; }
function mushroom() { const g = grp(); g.add(at(cyl(.04, .05, .14, M.white, 10), 0, .07, 0)); g.add(at(hemi(.1, M.redCloth), 0, .13, 0)); for (let i = 0; i < 4; i++) g.add(at(sph(.018, M.white, 6, 6), Math.cos(i * 1.6) * .06, .2, Math.sin(i * 1.6) * .06)); return g; }
function iceRock() { const g = grp(); for (let i = 0; i < 5; i++) g.add(at(crystal(.08, .18 + (i % 3) * .06, M.ice), (i - 2) * .07, .1, (i % 2) * .06, 0, i, (i - 2) * .2)); return g; }

export const PROPS = { village, cave, caveSnow: () => cave(M.stoneGrey), caveSand: () => cave(M.sandstone), caveLava: () => cave(new THREE.MeshStandardMaterial({ color: 0x3a2f2c, roughness: 1, flatShading: true }), M.lava),
  bush, bushBig: () => bush(1.5), palm: () => palm(.25), palmLeft: () => palm(-.3), pine: () => pine(false), pineSnow: () => pine(true), pineSnowBig: () => pine(true, 1.4), cactus, deadTree, rocks, rocksSand: () => rocks(M.sandstone),
  rocksGrey: () => rocks(M.stoneGrey), pyramid, gate, skulls: skullPile, ribs, volcanoRock, lilyPad, mushroom, iceRock };
