// Centipede Chaos in real 3D: every mushroom, centipede segment and boss is a model built from lit cubes,
// seen through a tilted camera like the cabinet's, with a glow on the bright parts. The game itself (rules,
// positions, online play) lives in centipede.html and doesn't change: each frame it hands this the state, and
// every object is drawn exactly where the game says it is on the screen (the camera only decides how it looks).
// The 2D overlay on top keeps the light effects, the text and the HUD.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const PI = Math.PI, TAU = PI * 2;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
function hash2(i, j) { let h = (i * 374761393 + j * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
function hash3(i, j, k) { return hash2(i * 31 + k * 977, j * 57 - k * 13); }
function hex(c) { return typeof c === 'string' ? parseInt(c.slice(1), 16) : c; }
function shadeHex(c, amt) {
  c = hex(c); let r = c >> 16, g = (c >> 8) & 255, b = c & 255;
  const f = v => Math.round(amt > 0 ? v + (255 - v) * amt : v * (1 + amt));
  return (f(r) << 16) | (f(g) << 8) | f(b);
}
function hexA(h, a) { const n = hex(h); return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')'; }

// ═══ Voxel models ════════════════════════════════════════════════════════════
// A model is a set of cubes on a grid (vs game units per cube). Shapes are given in game units: x across,
// y up, z toward the bottom of the screen. Each cube has a colour and may glow (drawn unlit and bright, so the
// glow pass picks it up). Building one makes a mesh of only the cube faces that show, each face lit flat with a
// thin seam round it (the cabinet's look) and darkened a little in corners.
const SEAM = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 32; const x = c.getContext('2d');
  x.fillStyle = '#ffffff'; x.fillRect(0, 0, 32, 32);
  x.fillStyle = '#d6d6d6'; x.fillRect(28, 0, 4, 32); x.fillRect(0, 28, 32, 4);
  x.fillStyle = '#ffffff'; x.fillRect(0, 0, 32, 3); x.fillRect(0, 0, 3, 32);
  x.strokeStyle = '#5c5c5c'; x.lineWidth = 2; x.strokeRect(1, 1, 30, 30);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter;
  return t;
})();

class Vox {
  constructor(vs) { this.vs = vs; this.m = new Map(); }
  key(i, j, k) { return (i + 512) + (j + 512) * 1024 + (k + 512) * 1048576; }
  set(i, j, k, c, e) { this.m.set(this.key(i, j, k), [i, j, k, hex(c), e ? 1 : 0]); }
  del(i, j, k) { this.m.delete(this.key(i, j, k)); }
  has(i, j, k) { return this.m.has(this.key(i, j, k)); }
  // fill every cube whose centre passes test(x, y, z) (game units) inside the box; col(x, y, z, i, j, k) -> colour
  fill(x0, y0, z0, x1, y1, z1, test, col, em) {
    const v = this.vs;
    for (let k = Math.floor(z0 / v); k <= Math.ceil(z1 / v); k++) for (let j = Math.floor(y0 / v); j <= Math.ceil(y1 / v); j++) for (let i = Math.floor(x0 / v); i <= Math.ceil(x1 / v); i++) {
      const x = (i + 0.5) * v, y = (j + 0.5) * v, z = (k + 0.5) * v;
      if (!test(x, y, z)) continue;
      const c = typeof col === 'function' ? col(x, y, z, i, j, k) : col; if (c == null) continue;
      const e = typeof em === 'function' ? em(x, y, z, c) : em;
      this.set(i, j, k, c, e);
    }
    return this;
  }
  ell(cx, cy, cz, rx, ry, rz, col, em) {
    return this.fill(cx - rx, cy - ry, cz - rz, cx + rx, cy + ry, cz + rz, (x, y, z) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 + ((z - cz) / rz) ** 2 <= 1, col, em);
  }
  // a rounded rod from a to b (r: radius at a, r2 at b)
  rod(a, b, r, col, em, r2) {
    r2 = r2 == null ? r : r2;
    const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], L2 = dx * dx + dy * dy + dz * dz || 1, R = Math.max(r, r2);
    return this.fill(Math.min(a[0], b[0]) - R, Math.min(a[1], b[1]) - R, Math.min(a[2], b[2]) - R, Math.max(a[0], b[0]) + R, Math.max(a[1], b[1]) + R, Math.max(a[2], b[2]) + R, (x, y, z) => {
      const t = clamp(((x - a[0]) * dx + (y - a[1]) * dy + (z - a[2]) * dz) / L2, 0, 1), px = a[0] + dx * t - x, py = a[1] + dy * t - y, pz = a[2] + dz * t - z, rr = r + (r2 - r) * t;
      return px * px + py * py + pz * pz <= rr * rr;
    }, typeof col === 'function' ? (x, y, z, i, j, k) => col(x, y, z, i, j, k, clamp(((x - a[0]) * dx + (y - a[1]) * dy + (z - a[2]) * dz) / L2, 0, 1)) : col, em);
  }
  box(x0, y0, z0, x1, y1, z1, col, em) { return this.fill(x0, y0, z0, x1 - 0.001, y1 - 0.001, z1 - 0.001, () => true, col, em); }
  mirrorX() { const out = []; this.m.forEach(q => out.push(q)); out.forEach(q => this.set(-q[0] - 1, q[1], q[2], q[3], q[4])); return this; }
  // the mesh: faces that show, in two parts (lit, and glowing)
  build(mats, anchor) {
    const v = this.vs, ax = anchor ? anchor[0] : 0, ay = anchor ? anchor[1] : 0, az = anchor ? anchor[2] : 0;
    const L = { p: [], n: [], c: [], u: [], idx: [] }, E = { p: [], n: [], c: [], u: [], idx: [] }, col = new THREE.Color();
    const F = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
    const CORN = {
      '1,0,0': [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]], '-1,0,0': [[0, 0, 1], [0, 1, 1], [0, 1, 0], [0, 0, 0]],
      '0,1,0': [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]], '0,-1,0': [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]],
      '0,0,1': [[1, 0, 1], [1, 1, 1], [0, 1, 1], [0, 0, 1]], '0,0,-1': [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]]
    };
    this.m.forEach(q => {
      const [i, j, k, c, e] = q, B = e ? E : L;
      for (const f of F) {
        if (this.has(i + f[0], j + f[1], k + f[2])) continue;
        // corner shade: cubes standing over this face darken it a little
        let occ = 0;
        if (!e) for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
          if (!a && !b) continue;
          const o = f[0] ? [f[0], a, b] : f[1] ? [a, f[1], b] : [a, b, f[2]];
          if (this.has(i + o[0], j + o[1], k + o[2])) occ++;
        }
        const ao = e ? 1.55 : 1 - occ * 0.045 + (hash3(i, j, k) - 0.5) * 0.06;
        col.setHex(c); const r = col.r * ao, g = col.g * ao, bl = col.b * ao;
        const base = B.p.length / 3, cs = CORN[f.join(',')];
        cs.forEach((cc, n) => {
          B.p.push((i + cc[0]) * v - ax, (j + cc[1]) * v - ay, (k + cc[2]) * v - az);
          B.n.push(f[0], f[1], f[2]); B.c.push(r, g, bl);
          B.u.push(n === 0 || n === 3 ? 0 : 1, n < 2 ? 0 : 1);
        });
        B.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
      }
    });
    const grp = new THREE.Group();
    [[L, mats.lit], [E, mats.glow]].forEach(([B, m]) => {
      if (!B.idx.length) return;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(B.p, 3));
      geo.setAttribute('normal', new THREE.Float32BufferAttribute(B.n, 3));
      geo.setAttribute('color', new THREE.Float32BufferAttribute(B.c, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(B.u, 2));
      geo.setIndex(B.idx); geo.computeBoundingSphere();
      const mesh = new THREE.Mesh(geo, m); mesh.frustumCulled = false; grp.add(mesh);
    });
    return grp;
  }
}
function mats(opts) {
  opts = opts || {};
  return {
    lit: new THREE.MeshLambertMaterial({ vertexColors: true, map: SEAM, emissive: 0x000000, transparent: !!opts.fade }),
    glow: new THREE.MeshBasicMaterial({ vertexColors: true, map: SEAM, transparent: !!opts.fade })
  };
}
// a soft round shadow on the floor
const SHADOW_TEX = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(0,0,0,.75)'); g.addColorStop(0.5, 'rgba(0,0,0,.5)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); return t;
})();
const SHADOW_GEO = new THREE.PlaneGeometry(1, 1).rotateX(-PI / 2);
const SHADOW_MAT = new THREE.MeshBasicMaterial({ map: SHADOW_TEX, transparent: true, depthWrite: false });
function shadowMesh() { const m = new THREE.Mesh(SHADOW_GEO, SHADOW_MAT); m.renderOrder = 1; return m; }

// ═══ The models ══════════════════════════════════════════════════════════════
// Mushroom: a dome with blocky white patches; damaged ones are smaller, bitten clumps
function mushModel(cap, spot, hp, po, M) {
  const V = new Vox(0.8), k = hp >= 3 ? 1 : hp === 2 ? 0.8 : 0.58, rx = 5.2 * k, ry = 6.2 * k;
  V.fill(-rx, 0, -rx, rx, ry, rx, (x, y, z) => (x * x + z * z) / (rx * rx) + (y * y) / (ry * ry) <= 1 &&
    !(hp < 3 && hash2(Math.floor(x / 2.4) + 40, Math.floor(z / 2.4) + hp * 17 + Math.floor(y / 2.4) * 7) < (hp === 2 ? 0.2 : 0.3) && (x * x + z * z) > rx * rx * 0.3),
    (x, y, z, i, j, kk) => hash2(Math.floor((i + 20) / 3) * 7 + Math.floor((j + 1) / 3) * 13, Math.floor((kk + 21) / 3) * 5 + 3) < 0.42 ? spot : cap,
    (x, y, z, c) => po && hex(c) === hex(spot));
  return V.build(M, [0, 0, 0]);
}
// Centipede segment: a ball with stubby legs front and back (two steps); the head adds a face and antennae
function segModel(body, legs, face, head, fr, M) {
  const V = new Vox(0.8), low = shadeHex(body, -0.35), r = 4.6;
  V.ell(0, 4.6, 0, r, r * 0.95, r, (x, y, z) => y < 2.2 ? low : head && x > 2 && y > 2.2 ? face : body);
  [-2.6, 0, 2.6].forEach((lx, n) => {
    const sh = (n + fr) % 2 ? 0.9 : -0.9;
    V.rod([lx, 1.6, -3.4], [lx + sh, 0.6, -6], 0.55, legs); V.rod([lx, 1.6, 3.4], [lx + sh, 0.6, 6], 0.55, legs);
  });
  if (head) {
    V.box(3.6, 5.2, -2.6, 4.4, 6.0, -1.8, 0x120a0a); V.box(3.6, 5.2, 1.6, 4.4, 6.0, 2.4, 0x120a0a);
    V.box(3.6, 6.0, -2.6, 4.4, 6.8, -1.8, 0xffffff, true); V.box(3.6, 6.0, 1.6, 4.4, 6.8, 2.4, 0xffffff, true);
    V.rod([4.2, 2.2, -1.2], [6, 1.8, -1.6], 0.5, legs); V.rod([4.2, 2.2, 1.2], [6, 1.8, 1.6], 0.5, legs);
    const sw = fr ? 0.6 : -0.6;
    V.rod([3.4, 7.6, -1.6], [8.5, 8.6, -3.6 + sw], 0.42, legs); V.rod([3.4, 7.6, 1.6], [8.5, 8.6, 3.6 + sw], 0.42, legs);
  }
  return V.build(M, [0, 0, 0]);
}

// ── The bugs (each built facing +x, turned to the way it's going; two frames for legs and wings) ──
function bugModel(type, fr, T, M, lit) {
  const V = new Vox(0.75), sg = fr ? 1 : -1;
  if (type === 'spider' || type === 'mini') {
    // a round purple body with orange spots on top and red eyes, eight gold legs splayed out
    const k = type === 'mini' ? 0.6 : 1, B = hex(type === 'mini' ? 0xff5c9a : T.spider[0]), Lc = hex(T.spider[1]);
    // (it faces you, its legs out to the sides)
    V.ell(0, 4.5 * k, 0, 5.5 * k, 4.2 * k, 5 * k, (x, y, z, i, j, kk) => y > 6 * k && hash2(i + 9, kk + 3) < 0.22 ? 0xff7a2a : B);
    V.box(-1.8 * k, 4.5 * k, 4.5 * k, -0.6 * k, 5.6 * k, 5.6 * k, 0xff2a2a, true); V.box(0.6 * k, 4.5 * k, 4.5 * k, 1.8 * k, 5.6 * k, 5.6 * k, 0xff2a2a, true);
    [-1, 1].forEach(s => [-3, -1, 1, 3].forEach((lz, n) => {
      const up = (n + (s > 0 ? 1 : 0) + fr) % 2 ? 1.5 : 0;
      V.rod([s * 4 * k, 4 * k, lz * k], [s * 9 * k, (6 + up) * k, lz * 1.7 * k], 0.8 * k, Lc); V.rod([s * 9 * k, (6 + up) * k, lz * 1.7 * k], [s * 13 * k, 0, lz * 2.4 * k], 0.7 * k, Lc);
    }));
  } else if (type === 'flea') {
    // a green dome shell with a pink face and red legs
    V.ell(0, 3.5, 0, 5, 4.5, 4.6, (x, y) => y > 5 ? 0x7cff6a : 0x3ad048);
    V.ell(4, 2.8, 0, 2, 2, 2.6, 0xff6a8a); V.box(5.2, 3, -1.4, 6, 4, -0.4, 0xffffff, true); V.box(5.2, 3, 0.4, 6, 4, 1.4, 0xffffff, true);
    [-1, 1].forEach(s => [-2, 1].forEach(lx => V.rod([lx, 1.5, s * 3.5], [lx + sg, 0, s * 5.5], 0.6, 0xff3a3a)));
  } else if (type === 'wasp' || type === 'bwasp') {
    // a striped body (yellow and black, or black with neon bands), red eyes, white wings beating
    const bl = type === 'bwasp', A = bl ? 0x16101e : 0xffd23d, Bc = bl ? 0xffe23d : 0x1a1206;
    V.ell(-4, 5, 0, 5, 3.4, 3.4, (x) => Math.floor((x + 20) / 2) % 2 ? A : Bc, (x, y, z, c) => bl && c === 0xffe23d);
    V.rod([-9, 5, 0], [-11, 5, 0], 0.8, 0xffffff, false, 0.3);
    V.ell(1.5, 5.5, 0, 2.6, 2.6, 2.6, A); V.ell(4.3, 5.5, 0, 2.2, 2.2, 2.4, A);
    V.box(4.6, 5.8, -2.4, 6.2, 7.2, -0.6, 0xff3a5a, true); V.box(4.6, 5.8, 0.6, 6.2, 7.2, 2.4, 0xff3a5a, true);
    [-1, 1].forEach(s => { const lift = fr ? 5 : 1.5; V.fill(-3, 7, s > 0 ? 1 : -11, 3, 8.2, s > 0 ? 11 : -1, (x, y, z) => { const zz = Math.abs(z); return y < 7.5 + (zz - 1) * lift / 10 + 0.8 && y > 7 + (zz - 1) * lift / 10 - 0.2 && (x + 0.5) ** 2 / 9 + ((zz - 6) ** 2) / 25 <= 1; }, (x, y, z, i, j, k) => (i + k) % 2 ? 0xe8f4ff : 0xb8d0e8, bl); });
  } else if (type === 'ant') {
    // three purple segments, black legs
    const A = 0xb03dff, A2 = 0x7a1ad0;
    V.ell(-4.5, 3, 0, 3.4, 2.6, 2.8, A); V.ell(0, 3, 0, 2.2, 2, 2, A2); V.ell(3.8, 3.2, 0, 2.4, 2.2, 2.3, A);
    V.rod([5, 4.5, -1], [7.5, 5.5, -2.5], 0.4, 0x1a0a20); V.rod([5, 4.5, 1], [7.5, 5.5, 2.5], 0.4, 0x1a0a20);
    [-1, 1].forEach(s => [-1.5, 0, 1.5].forEach((lx, n) => { const sh = (n + fr) % 2 ? 1 : -1; V.rod([lx, 2.5, s * 1.5], [lx + sh * 1.5, 0, s * 5], 0.45, 0x1a0a20); }));
  } else if (type === 'ffly') {
    // a dark thorax, a green abdomen that glows, blue-white wings
    V.ell(-4, 4, 0, 4.4, 3.4, 3.4, lit ? 0xb8ff5a : 0x6aa830, lit);
    V.ell(1.5, 4.5, 0, 2.6, 2.6, 2.6, 0x3a3a1a); V.ell(4, 4.5, 0, 1.8, 1.8, 2, 0xff6b3d);
    V.rod([5, 5, -1], [8, 7, -2.5], 0.35, 0xc8e0ff); V.rod([5, 5, 1], [8, 7, 2.5], 0.35, 0xc8e0ff);
    [-1, 1].forEach(s => { const a = fr ? 0.5 : 0.15; V.rod([1, 6.5, s * 1.5], [-5, 6.5 + 8 * a, s * 9], 1.6, (x, y, z, i, j, k) => (i + k) % 2 ? 0xd8ecff : 0x9ac0f0); });
  } else if (type === 'beetle') {
    // a grey-pink shell with a white head plate and an orange bomb on its back end
    V.ell(0, 3.5, 0, 6, 4, 4.8, (x, y, z, i, j, k) => x < -3 ? ((i + k) % 2 ? 0xff7a2a : 0xff4a1a) : (i + j + k) % 2 ? 0xc8b0c8 : 0x9a8aa8, (x, y, z, c) => c === 0xff7a2a || c === 0xff4a1a);
    V.ell(4.5, 4, 0, 2.6, 2.4, 2.8, 0xfff0f8, true);
    [-1, 1].forEach(s => [-2, 0.5, 3].forEach((lx, n) => { const sh = (n + fr) % 2 ? 0.8 : -0.8; V.rod([lx, 2, s * 3.5], [lx + sh, 0, s * 6.5], 0.5, 0x3a2a40); }));
  } else {
    V.ell(0, 4, 0, 5, 4, 5, (x, y, z, i, j, k) => hash3(i, j, k) < 0.2 ? 0x5a6070 : 0x9aa0b4);
  }
  return V.build(M);
}
// The player's ship: a long crystal gem pointing up the screen (the cabinet's): a narrow nose, widest a little
// past the middle, a short tail; stepped glowing edges, a white-hot core inside a darker diamond
function shipW(z) {
  if (z < -12) return 0.7; if (z < -9) return 1.2;
  if (z < 1) return 1.4 + (z + 9) / 10 * 3.8;
  if (z < 5) return 5.2 - (z - 1) / 4 * 3.2;
  return z < 7 ? 1.3 : 0;
}
function shipModel(col, M) {
  const V = new Vox(0.6), c = hex(col), hi = shadeHex(col, 0.55), dk = shadeHex(col, -0.45);
  V.fill(-6, 0, -14, 6, 6, 8, (x, y, z) => { const w = shipW(z); return w > 0 && Math.abs(x) <= w && Math.abs(y - 3) <= Math.max(0.6, w * 0.6); },
    (x, y, z) => {
      const w = shipW(z), d = Math.abs(x) / 2.6 + Math.abs(z + 1) / 5.2;
      if (Math.abs(x) > w - 0.9) return c;                     // the glowing stepped edge
      if (y > 3.4 && d < 1) return 0xffffff;                   // the core
      if (y > 3.4 && d < 1.3) return dk;                       // its dark diamond outline
      return hi;
    },
    (x, y, z, cc) => cc === 0xffffff || cc === c);
  return V.build(M);
}

// ── Bosses: rigs of parts that move ──
// Each rig: { root (Group), parts, anim(B, t, st, stT, dt) }. Built facing the camera's way: z toward the bottom.
function part(V, M, pivot) { const g = new THREE.Group(), mesh = V.build(M, [0, 0, 0]); g.add(mesh); if (pivot) g.position.set(pivot[0], pivot[1], pivot[2]); return g; }

// Killer Wasp: faces down at you: head with big glowing pink eyes at the bottom, a grey-plated thorax, a long
// yellow abdomen with dark stripes and pink glowing side panels at the top ending in a stinger, glowing pink
// grid wings rising from the thorax, orange legs.
function waspRig(M) {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const V = new Vox(1);
  const Y = 0xffc21f, Y2 = 0xffe05a, BR = 0x6a2a0a, GR = 0x6a6878, OR = 0xff8a1f;
  // abdomen (top of screen), tapering to the stinger
  V.fill(-11, 0, -34, 11, 18, -2, (x, y, z) => { const t = clamp((-z - 2) / 32, 0, 1), rr = 10.5 * Math.pow(Math.sin(PI * (0.12 + 0.88 * t)), 0.6); return rr > 0.3 && (x * x) / (rr * rr) + ((y - 8) ** 2) / ((rr * 0.85) ** 2) <= 1; },
    (x, y, z) => { const band = Math.floor((-z + 1) / 3.2) % 3; if (y > 13 && z > -20 && z < -4 && Math.floor(-z / 5) % 2 === 0) return GR; return band === 0 ? BR : band === 1 ? Y : Y2; });
  // glowing pink panels on its sides
  [-1, 1].forEach(s => V.box(s > 0 ? 8 : -12, 3, -15, s > 0 ? 12 : -8, 12, -3, (x, y, z, i, j, k) => (j + k) % 2 ? 0xff3da8 : 0xff7ac8, true));
  V.rod([0, 8, -32], [0, 8, -40], 1.6, Y2, false, 0.5);
  // waist, thorax with grey plates, head
  V.ell(0, 8, 0, 3.5, 3.5, 3, BR);
  V.ell(0, 8, 7, 9, 8, 7.5, (x, y, z) => y > 13 && z < 6 ? GR : (Math.floor(z) % 4 === 0 ? BR : Y));
  V.ell(0, 7, 17, 7.5, 6.5, 6, (x, y) => y > 10 ? Y2 : Y);
  [-1, 1].forEach(s => { V.ell(s * 4.2, 9, 20, 3.2, 3, 2.6, 0xff4fd8, true); });
  V.rod([-2.5, 4, 22], [-3.5, 3, 26], 1.1, OR); V.rod([2.5, 4, 22], [3.5, 3, 26], 1.1, OR);
  body.add(V.build(M));
  // legs: three pairs, orange with dark joints
  const legs = [];
  [[-1, 4], [1, 4], [-1, 8], [1, 8], [-1, 12], [1, 12]].forEach(([s, z0], n) => {
    const L = new Vox(1); const kz = z0 + (n < 2 ? -2 : n < 4 ? 2 : 6);
    L.rod([0, 0, 0], [s * 9, -2, kz - z0], 1.8, OR); L.box(s * 9 - 1.5, -3.5, kz - z0 - 1.5, s * 9 + 1.5, -0.5, kz - z0 + 1.5, 0x4a4250); L.rod([s * 9, -2, kz - z0], [s * 12, -9, kz - z0 + 5], 1.6, OR, false, 0.9);
    const g = part(L, M, [s * 6, 5, z0]); body.add(g); legs.push(g);
  });
  // wings: glowing pink grid panels, hinged at the thorax
  const wings = [-1, 1].map(s => {
    const W = new Vox(1);
    W.fill(0, -0.5, -20, 36, 0.5, 4, (x, y, z) => { const u = x / 36, half = 10 * Math.sin(PI * clamp(u * 0.95 + 0.05, 0, 1)) ** 0.6; return z < 2 - u * 8 && z > 2 - u * 8 - 2 * half; },
      (x, y, z, i, j, k) => (i + k) % 2 ? 0xd8309a : 0xff6ac8, true);
    const g = new THREE.Group(), m = W.build(M); m.scale.x = s; g.add(m); g.position.set(s * 5, 14, 6); body.add(g); return g;
  });
  return {
    root, body, legs, wings, mats: M,
    anim(B, t, st, stT) {
      const flap = Math.sin(t * TAU * 6);
      // wings raised in a V and beating; swept right back along the body for the dive
      let rise = 0.55 + 0.25 * flap, sweep = 0.25;
      if (st === 'wind' || st === 'dive') { rise = 0.12; sweep = 1.2; }
      else if (st === 'ground') { const k = clamp(stT / 0.22, 0, 1); rise = 0.12 + 0.43 * k; sweep = 1.2 - 0.95 * k; }
      wings.forEach((w, n) => { const s = n ? 1 : -1; w.rotation.set(0, s * sweep, s * rise); });
      legs.forEach((g, n) => { g.rotation.x = Math.sin(t * 9 + n) * 0.15; });
      body.rotation.x = st === 'dive' ? -0.35 : st === 'hold' ? 0.25 : 0;
      M.glow.color.setScalar(st === 'wind' || st === 'dive' ? 0.35 : 1);
    }
  };
}

// Night Flyer: a moth facing up the screen: a big cyan dome head, a striped green body, two thin pink tail legs,
// tall lavender-white wing panels with violet blotches angled up and out, small hind wings under them
function flyerRig(M, Mblue) {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const V = new Vox(1);
  V.ell(0, 9, -12, 9.5, 8, 8, (x, y, z, i, j, k) => (i + k) % 2 ? 0x20e8f0 : 0x10c8e0, true);
  V.rod([0, 8, -6], [0, 7, 15], 5, (x, y, z) => (Math.floor(z + 20) % 4 === 0 ? 0x14301e : (Math.floor((z + 20) / 2) % 2 ? 0x5af07a : 0x2a9a50)), false, 3.5);
  [-1, 1].forEach(s => { V.rod([s * 1.8, 6, 17], [s * 4, 4, 27], 0.8, 0xffd0e8); V.rod([s * 2, 13, -15], [s * 5, 16, -20], 0.6, 0xa8ffff, true); });
  body.add(V.build(M));
  function wingVox(front, blue) {
    const W = new Vox(1), L = front ? 34 : 21;
    W.fill(0, -0.5, -14, L, 0.5, 14, (x, y, z) => {
      const u = x / L;
      if (front) { const lo = -2 - u * 10, hi = 6 - u * 4; return z > lo - 3 * Math.sin(PI * u) && z < hi; }
      return z > 2 + u * 2 && z < 10 + u * 3 - 4 * u * u;
    }, (x, y, z, i, j, k) => blue ? ((i + k) % 2 ? 0x3a50d0 : 0x5a70f0) : front ? (hash2(i >> 2, k >> 2) < 0.3 ? 0x8b5ce8 : (i + k) % 5 ? 0xece4ff : 0xcfc0f4) : (hash2(i >> 2, k >> 2) < 0.3 ? 0x9af0b0 : 0xdccdfa), false);
    return W;
  }
  const wings = [];
  [-1, 1].forEach(s => {
    [true, false].forEach(front => {
      const g = new THREE.Group(), n = wingVox(front, false).build(M), b = wingVox(front, true).build(Mblue);
      n.scale.x = s; b.scale.x = s; b.visible = false; g.add(n); g.add(b);
      g.position.set(s * 4, 10, front ? -4 : 4); body.add(g); wings.push({ g, s, front, n, b });
    });
  });
  return {
    root, body, wings, mats: M,
    anim(B, t, st, stT) {
      const fl = Math.sin(t * TAU * 2.75);
      let a = 0.75 + 0.22 * fl, blue = false;
      if (st === 'charge') { if (stT < 0.15) a = 0.55; else if (stT < 0.3) a = 1.25; else { a = 1.45; blue = true; } }
      if (st === 'rest' && stT < 0.15) a = 0.15;
      wings.forEach(w => { w.g.rotation.z = w.s * (w.front ? a : a * 0.8); w.g.rotation.y = w.s * (w.front ? 0.25 : -0.2); w.n.visible = !blue; w.b.visible = blue; });
      root.rotation.y = -(B.yaw || 0);
    }
  };
}

// Blast Beetle: a tall pink-white capsule shell facing down at you, a glowing yellow grid panel on its back,
// a dark face band with red eye slits, short dark legs with red tips and two glowing red pincers round its mouth
function beetleRig(M) {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const V = new Vox(0.9);
  V.fill(-9, 0, -23, 9, 16, 12, (x, y, z) => { const zc = clamp(z, -15, 5), dz = z - zc; return (x * x) / 64 + ((y - 7.5) ** 2) / 64 + (dz * dz) / 56 <= 1; },
    (x, y, z, i, j, k) => {
      if (z > 6.5 && z < 10) return y > 8.5 && y < 11 && Math.abs(Math.abs(x) - 3.2) < 1.6 ? 0xff2a2a : 0x2a1030;
      if (y > 11.5 && z < -1 && z > -21 && Math.abs(x) < 6.2) return Math.abs(x) > 5 || z > -2.5 || z < -19.5 ? 0xd81f08 : (i + k) % 2 ? 0xffc35a : 0xff8a1f;
      return (i + j + k) % 2 ? 0xf6d0f2 : 0xdca0dc;
    },
    (x, y, z, c) => c === 0xffc35a || c === 0xff8a1f || c === 0xff2a2a || c === 0xd81f08);
  body.add(V.build(M));
  const pinc = [-1, 1].map(s => {
    const P = new Vox(0.9);
    P.rod([0, 0, 0], [s * 3.5, 0, 4.5], 1.9, 0xff4a2a, true); P.rod([s * 3.5, 0, 4.5], [s * 1.5, 0, 10], 1.6, 0xffb03d, true, 0.9);
    const g = part(P, M, [s * 3.5, 4, 11]); body.add(g); return g;
  });
  const orb = new Vox(0.9); orb.ell(0, 0, 0, 2, 2, 2, 0xffd060, true); const orbG = part(orb, M, [0, 4, 15]); body.add(orbG);
  const legs = [];
  [-1, 1].forEach(s => [-4, 0, 4].forEach(z0 => {
    const L = new Vox(0.9); L.rod([0, 0, 0], [s * 6, -2, z0 * 0.2], 1, 0x3a1030); L.rod([s * 6, -2, z0 * 0.2], [s * 8, -5, z0 * 0.4], 0.9, 0xff3d2a, true);
    const g = part(L, M, [s * 7.5, 5, z0]); body.add(g); legs.push(g);
  }));
  return {
    root, body, mats: M,
    anim(B, t, st, stT) {
      legs.forEach((g, n) => { g.rotation.y = Math.sin(t * 10 + n * 1.7) * 0.35; });
      const pause = st === 'pause', open = pause ? 0.6 : 0.1;
      pinc.forEach((g, n) => { g.rotation.y = (n ? -1 : 1) * open; });
      const orbS = st === 'patrol' ? 0.7 + 0.6 * clamp((B.orb || 0) / 0.25, 0, 1) : 0.01;
      orbG.scale.setScalar(orbS);
      body.rotation.x = pause ? -0.3 * clamp((stT - 0.3) / 0.4, 0, 1) : st === 'lunge' ? 0.15 : 0;
      let yaw = 0; if (pause && B.anchor === 'L') yaw = -0.35 * clamp(stT / 0.4, 0, 1); if (pause && B.anchor === 'R') yaw = 0.35 * clamp(stT / 0.4, 0, 1);
      body.rotation.y = yaw;
    }
  };
}

// Mega Spider: head toward you: a huge abdomen patterned in red and pink, a dark body speckled pink, a dark face
// with glowing peach eyes and pink fangs, eight legs raised high: dark segments spotted pink with chunky pink knees
function megaRig(M) {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const V = new Vox(1.2), DK = 0x2c2160, DK2 = 0x3c2e80, PK = 0xff3d7a, RD = 0xe8203a;
  V.ell(0, 16, -26, 23, 17, 27, (x, y, z, i, j, k) => {
    const ax = Math.abs(x);
    if (ax < 3 && y > 20) return 0xff5a3a;
    if (y > 14 && ((ax * 0.8 - z * 0.5 + 60) % 10) < 3.4) return RD;
    if (y > 26 && ax > 6 && ((ax - z * 0.3 + 50) % 7) < 2.2) return 0xff7a4a;
    return (i + j + k) % 3 ? DK : DK2;
  }, (x, y, z, c) => c === RD || c === 0xff5a3a || c === 0xff7a4a);
  V.ell(0, 11, 5, 16, 11, 14, (x, y, z, i, j, k) => hash3(i, j, k) < 0.07 ? PK : (i + k) % 2 ? DK : DK2, (x, y, z, c) => c === PK);
  V.ell(0, 9, 21, 11, 9, 7.5, (x, y, z, i, j, k) => (i + j) % 2 ? DK : DK2);
  [[-4, 13, 26.5, 2.4], [4, 13, 26.5, 2.4], [-4, 9, 27.5, 1.9], [4, 9, 27.5, 1.9], [-2, 5.5, 27.5, 1.5], [2, 5.5, 27.5, 1.5]].forEach(e => V.ell(e[0], e[1], e[2], e[3], e[3], 1.4, 0xffb080, true));
  [-1, 1].forEach(s => V.rod([s * 3, 4, 26], [s * 2, 0, 31], 1.6, PK, true, 0.8));
  body.add(V.build(M));
  // legs: hip on the body, femur up and out to a big knee, tibia down to the floor
  const legs = [];
  const HIPS = [[11, 9, 12, 0.9], [14, 10, 6, 0.35], [14, 10, 0, -0.25], [11, 9, -5, -0.8]];
  [-1, 1].forEach(s => HIPS.forEach((h, n) => {
    const L = new Vox(1.2), spot = (x, y, z, i, j, k) => hash3(i, j, k) < 0.18 ? PK : (i + j) % 2 ? DK : DK2;
    const fem = new THREE.Group(), tib = new THREE.Group();
    L.rod([0, 0, 0], [s * 20, 15, 0], 3.2, spot, (x, y, z, c) => c === PK, 2.6);
    fem.add(L.build(M));
    const K = new Vox(1.2); K.box(-3.6, -3.6, -3.6, 3.6, 3.6, 3.6, (x, y, z, i, j, k) => hash3(i, j, k) < 0.25 ? 0xff9ac0 : 0xff4f8a, true); const knee = K.build(M); knee.position.set(s * 20, 15, 0); fem.add(knee);
    const T2 = new Vox(1.2); T2.rod([0, 0, 0], [s * 14, -25, 0], 2.8, spot, (x, y, z, c) => c === PK, 1.6); T2.box(s * 14 - 2, -28, -2, s * 14 + 2, -24, 2, PK, true);
    tib.add(T2.build(M)); tib.position.set(s * 20, 15, 0); fem.add(tib);
    fem.position.set(s * h[0], h[1], h[2]); fem.rotation.y = s * -h[3]; body.add(fem);
    legs.push({ fem, tib, s, n });
  }));
  return {
    root, body, mats: M,
    anim(B, t, st, stT) {
      const walk = st === 'walk' || st === 'stalk' || st === 'enter' || st === 'die';
      legs.forEach(L => {
        const ph = t * 7 + L.n * 1.6 + (L.s > 0 ? PI : 0), lift = walk ? Math.max(0, Math.sin(ph)) * 0.22 : 0;
        // a raised leg rotates its knee up; rearing up lifts the front legs high; at the bottom of a drop they splay
        let fz = L.s * (-0.1 + lift), tz = L.s * 0.1;
        if (st === 'wind') { fz = L.s * (L.n < 2 ? 0.6 : 0.2); tz = L.s * (L.n < 2 ? 0.5 : 0.1); }
        if (st === 'lunge' || st === 'ground' || st === 'sweep') { fz = L.s * -0.25; tz = L.s * -0.15; }
        L.fem.rotation.z = fz; L.tib.rotation.z = tz;
        L.fem.rotation.x = walk ? Math.sin(ph) * 0.12 : 0;
      });
      body.rotation.x = st === 'wind' ? -0.35 * clamp(stT / 0.28, 0, 1) : st === 'lunge' ? 0.1 : 0;
      body.position.y = walk ? Math.abs(Math.sin(t * 7)) * 0.6 : 0;
    }
  };
}

// ═══ Floor ═══════════════════════════════════════════════════════════════════
// Painted in floor coordinates (so its lines run off into the distance with the camera), in the stage's colours:
// pixel-noise ground with glowing grid and circuit traces; hexagons for the hive arenas; a great web for the spider
function paintFloor(T, rect, ppu, seed0) {
  const wU = rect[2] - rect[0], hU = rect[3] - rect[1], w = Math.min(4096, Math.ceil(wU * ppu)), h = Math.min(4096, Math.ceil(hU * ppu)), k = w / wU;
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
  let seed = seed0;
  const R = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const X = u => (u - rect[0]) * k, Z = v => (v - rect[1]) * k;
  const gr = x.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, T.deep); gr.addColorStop(0.55, hexA(shadeHex(T.base, -0.3), 1)); gr.addColorStop(1, T.base);
  x.fillStyle = gr; x.fillRect(0, 0, w, h);
  const q = 5 * k;
  for (let v = rect[1]; v < rect[3]; v += 5) for (let u = rect[0]; u < rect[2]; u += 5) {
    const r = R(); if (r < 0.3) { x.fillStyle = hexA(T.hi, 0.025 + R() * 0.06); x.fillRect(X(u), Z(v), q - 1, q - 1); } else if (r > 0.84) { x.fillStyle = 'rgba(0,0,0,' + (0.08 + R() * 0.14).toFixed(3) + ')'; x.fillRect(X(u), Z(v), q, q); }
  }
  x.lineCap = 'round';
  if (T.kind === 'grid' || T.kind === 'web') {
    const sp = 20;
    [[3 * k, 0.05], [Math.max(1, 0.5 * k), 0.2]].forEach(pass => {
      x.lineWidth = pass[0];
      for (let u = Math.ceil(rect[0] / sp) * sp; u < rect[2]; u += sp) { x.strokeStyle = hexA(T.line, pass[1] * (Math.round(u / sp) % 4 === 0 ? 1.6 : 1)); x.beginPath(); x.moveTo(X(u), 0); x.lineTo(X(u), h); x.stroke(); }
      for (let v = Math.ceil(rect[1] / sp) * sp; v < rect[3]; v += sp) { x.strokeStyle = hexA(T.line, pass[1] * (Math.round(v / sp) % 4 === 0 ? 1.6 : 1)); x.beginPath(); x.moveTo(0, Z(v)); x.lineTo(w, Z(v)); x.stroke(); }
    });
    const nT = T.kind === 'web' ? 0 : Math.round(wU * hU / 2600);
    for (let t = 0; t < nT; t++) {
      let pu = rect[0] + Math.round(R() * wU / 10) * 10, pv = rect[1] + Math.round(R() * hU / 10) * 10, horiz = R() < 0.5;
      const ta = 0.3 + R() * 0.3, pts = [[pu, pv]];
      for (let s2 = 0, st = 2 + Math.floor(R() * 4); s2 < st; s2++) { const Ln = (1 + Math.floor(R() * 5)) * 10 * (R() < 0.5 ? -1 : 1); if (horiz) pu += Ln; else pv += Ln; horiz = !horiz; pts.push([pu, pv]); }
      [[4 * k, 0.12], [Math.max(1, 0.8 * k), ta]].forEach(ps => { x.strokeStyle = hexA(ps[1] > 0.2 ? T.hi : T.line, ps[1]); x.lineWidth = ps[0]; x.beginPath(); pts.forEach((p, i) => x[i ? 'lineTo' : 'moveTo'](X(p[0]), Z(p[1]))); x.stroke(); });
      x.fillStyle = hexA(T.hi, 0.75); x.fillRect(X(pu) - 1.5 * k, Z(pv) - 1.5 * k, 3 * k, 3 * k);
    }
    if (T.kind === 'web') {
      const wx = X(0), wy = Z(-40), spokes = 14, far = Math.hypot(w, h), ring = 32 * k, ang = [];
      for (let s = 0; s < spokes; s++) ang.push(s / spokes * TAU + (R() - 0.5) * 0.15);
      [[5 * k, 0.1], [Math.max(1, 0.9 * k), 0.55]].forEach(ps => {
        x.lineWidth = ps[0]; x.strokeStyle = hexA(T.line, ps[1]);
        ang.forEach(a => { x.beginPath(); x.moveTo(wx, wy); x.lineTo(wx + Math.cos(a) * far, wy + Math.sin(a) * far); x.stroke(); });
        for (let rr = ring; rr < far; rr += ring * (1 + rr / far)) {
          x.beginPath();
          for (let q2 = 0; q2 <= spokes; q2++) {
            const a0 = ang[q2 % spokes], a1 = ang[(q2 + 1) % spokes] + (q2 + 1 >= spokes ? TAU : 0);
            if (!q2) x.moveTo(wx + Math.cos(a0) * rr, wy + Math.sin(a0) * rr);
            if (q2 < spokes) { const am = (a0 + a1) / 2, sag = rr * 0.86; x.quadraticCurveTo(wx + Math.cos(am) * sag, wy + Math.sin(am) * sag, wx + Math.cos(a1) * rr, wy + Math.sin(a1) * rr); }
          }
          x.stroke();
        }
      });
    }
  } else {
    const hr = 11.5, hw = hr * Math.sqrt(3);
    const hexPath = (cx2, cy2, r) => { x.beginPath(); for (let i = 0; i < 6; i++) { const a = PI / 6 + i * PI / 3; x[i ? 'lineTo' : 'moveTo'](cx2 + Math.cos(a) * r, cy2 + Math.sin(a) * r); } x.closePath(); };
    x.lineWidth = Math.max(1, 0.45 * k);
    for (let row = 0, v = rect[1]; v < rect[3] + hr; row++, v += hr * 1.5) for (let u = rect[0] + (row % 2) * hw / 2; u < rect[2] + hw; u += hw) {
      hexPath(X(u), Z(v), hr * 0.94 * k); const rr = R();
      if (rr < 0.32) { x.fillStyle = 'rgba(0,0,0,.2)'; x.fill(); } else if (rr > 0.86) { x.fillStyle = hexA(T.line, 0.07); x.fill(); }
      x.strokeStyle = hexA(T.hi, 0.07); x.stroke();
    }
    const bigN = Math.round(wU * hU / 2200);
    for (let b = 0; b < bigN; b++) {
      const bu = X(rect[0] + R() * wU), bv = Z(rect[1] + R() * hU), br = (18 + R() * 36) * k, colB = R() < 0.62 ? T.line : T.line2, al = 0.18 + R() * 0.5, lw = Math.max(1, (0.7 + R() * 1.1) * k);
      hexPath(bu, bv, br); x.strokeStyle = hexA(colB, al * 0.18); x.lineWidth = lw * 5; x.stroke();
      x.strokeStyle = hexA(colB, al); x.lineWidth = lw; x.stroke();
      if (R() < 0.35) { hexPath(bu, bv, br * 0.8); x.lineWidth = Math.max(1, 0.5 * k); x.stroke(); }
    }
  }
  // the centre is lit, the edges fall into shadow
  const cg = x.createRadialGradient(X(0), Z(0), 0, X(0), Z(0), Math.max(w, h) * 0.6); cg.addColorStop(0, hexA(T.line, 0.14)); cg.addColorStop(0.5, 'rgba(0,0,0,0)'); cg.addColorStop(1, 'rgba(0,0,0,.55)');
  x.fillStyle = cg; x.fillRect(0, 0, w, h);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8; return tex;
}

// ═══ The engine ══════════════════════════════════════════════════════════════
export function create(canvas, F) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1); renderer.setClearColor(0x02040e, 1);
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(30, 1, 1, 4000), base = new THREE.PerspectiveCamera(30, 1, 1, 4000);
  const ELEV = 63 * PI / 180;
  scene.add(new THREE.HemisphereLight(0xdfe6ff, 0x3a2050, 1.25));
  const sun = new THREE.DirectionalLight(0xffffff, 2.1); sun.position.set(-0.55, 1.25, 0.7); scene.add(sun);
  const fill = new THREE.DirectionalLight(0xb8c8ff, 0.45); fill.position.set(0.6, 0.4, -0.5); scene.add(fill);
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, cam));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.7, 0.4, 0.66); composer.addPass(bloom);
  composer.addPass(new OutputPass());

  const floorMat = new THREE.MeshBasicMaterial({ depthWrite: false }), floor = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-PI / 2), floorMat);
  floor.renderOrder = -1; scene.add(floor);
  let view = { cw: 0, ch: 0, S: 1 }, floorKey = '', cx0 = 0, cy0 = 0;
  const ndc = new THREE.Vector3(), tmp = new THREE.Vector3();

  function resize(cw, ch, S) {
    if (cw === view.cw && ch === view.ch && S === view.S) return;
    view = { cw, ch, S }; renderer.setSize(cw, ch, false); composer.setSize(cw, ch);
    [cam, base].forEach(c => { c.aspect = cw / ch; c.fov = 30; c.updateProjectionMatrix(); });
    const D = (ch / 2) / Math.tan(15 * PI / 180) / S;
    [cam, base].forEach(c => { c.position.set(0, D * Math.sin(ELEV), D * Math.cos(ELEV)); c.lookAt(0, 0, 0); c.updateMatrixWorld(); });
    // the game point at the middle of the screen sits at the origin
    cx0 = F.W / 2; cy0 = ch / (2 * S) - F.HB;
    floorKey = '';
  }
  // the floor point under a game position (x, y): straight through the screen pixel the game puts it at
  function at(gx, gy, out) {
    const sx = gx * view.S, sy = (gy + F.HB) * view.S;
    ndc.set(sx / view.cw * 2 - 1, 1 - sy / view.ch * 2, 0.5).unproject(base);
    tmp.copy(ndc).sub(base.position);
    const t = -base.position.y / tmp.y;
    return (out || new THREE.Vector3()).set(base.position.x + tmp.x * t, 0, base.position.z + tmp.z * t);
  }
  function setFloor(tk, T) {
    const key = tk + view.cw + 'x' + view.ch; if (key === floorKey) return; floorKey = key;
    const pts = [at(-30, -F.HB - 30), at(F.W + 30, -F.HB - 30), at(-30, F.H + 30), at(F.W + 30, F.H + 30)];
    const rect = [Math.min(...pts.map(p => p.x)), Math.min(...pts.map(p => p.z)), Math.max(...pts.map(p => p.x)), Math.max(...pts.map(p => p.z))];
    if (floorMat.map) floorMat.map.dispose();
    floorMat.map = paintFloor(T, rect, Math.min(view.S * 1.3, 3800 / (rect[2] - rect[0])), 11 + tk.length * 977); floorMat.needsUpdate = true;
    floor.scale.set(rect[2] - rect[0], 1, rect[3] - rect[1]); floor.position.set((rect[0] + rect[2]) / 2, 0, (rect[1] + rect[3]) / 2);
  }

  // ── Instancing: each kind of model is made once, and every copy of it on the field is drawn in one go ──
  const geoCache = {}, ipools = {}, dummy = new THREE.Object3D();
  const M0 = mats();
  function model(key, make) { return geoCache[key] || (geoCache[key] = make()); }
  function place(key, make, cap, pos, ry, rz, sc) {
    let P = ipools[key];
    if (!P) {
      const src = model(key, make); P = ipools[key] = { list: [], n: 0, cap };
      src.children.forEach(ch => { const im = new THREE.InstancedMesh(ch.geometry, ch.material, cap); im.frustumCulled = false; im.count = 0; scene.add(im); P.list.push(im); });
    }
    if (P.n >= P.cap) return;
    dummy.position.copy(pos); dummy.rotation.set(0, ry || 0, rz || 0); dummy.scale.setScalar(sc || 1); dummy.updateMatrix();
    for (const im of P.list) im.setMatrixAt(P.n, dummy.matrix);
    P.n++;
  }
  // soft shadows on the floor, all in one go too
  const shadowIM = new THREE.InstancedMesh(SHADOW_GEO, SHADOW_MAT, 1600); shadowIM.frustumCulled = false; shadowIM.renderOrder = 1; shadowIM.count = 0; scene.add(shadowIM);
  let shN = 0;
  function shadow(p, r) {
    if (shN >= 1600) return;
    dummy.position.set(p.x + r * 0.25, 0.05, p.z + r * 0.35); dummy.rotation.set(0, 0, 0); dummy.scale.set(r * 2, 1, r * 1.6); dummy.updateMatrix();
    shadowIM.setMatrixAt(shN++, dummy.matrix);
  }
  function flush() {
    for (const k in ipools) { const P = ipools[k]; for (const im of P.list) { im.count = P.n; im.instanceMatrix.needsUpdate = true; } P.n = 0; }
    shadowIM.count = shN; shadowIM.instanceMatrix.needsUpdate = true;
  }
  const pos = new THREE.Vector3();

  // ── bosses ──
  let rig = null, rigType = null, rigSt = null, rigT0 = 0;
  const bossMats = mats(), blueMats = mats();
  function makeRig(type) {
    if (rig) { scene.remove(rig.root); }
    rig = type === 'wasp' ? waspRig(bossMats) : type === 'firefly' ? flyerRig(bossMats, blueMats) : type === 'beetle' ? beetleRig(bossMats) : megaRig(bossMats);
    rigType = type; scene.add(rig.root);
  }

  const segPrev = new Map(), P = new THREE.Vector3();
  function frame(R, o) {
    resize(o.cw, o.ch, o.S);
    const T = o.THEMES[o.tk]; setFloor(o.tk, T);
    // screen shake moves the whole picture by whole pixels, like the overlay
    cam.setViewOffset(view.cw, view.ch, -o.sx, -o.sy, view.cw, view.ch);
    shN = 0;
    // mushrooms
    const grid = R.grid, pois = R.pois;
    for (let r = 0; r < F.ROWS; r++) for (let c = 0; c < F.COLS; c++) {
      const hp = grid[r * F.COLS + c]; if (!hp) continue;
      const po = pois && pois[r * F.COLS + c] ? 1 : 0, h = Math.min(3, hp), key = 'm' + o.tk + h + po;
      at(c * F.CELL + F.CELL / 2, r * F.CELL + F.CELL / 2 + 2, pos);
      place(key, () => mushModel(po ? 0xa34dff : T.mush[0], po ? 0x7dff5a : T.mush[1], h, po, M0), F.COLS * F.ROWS, pos, (hash2(c, r) - 0.5) * 0.6);
      shadow(pos, 5.5);
    }
    // centipede: each segment faces the way it's going
    const seen = new Set();
    R.segs.forEach(s => {
      if (s.y < -8) return;
      const fr = Math.floor(o.t * 8 + (s.id & 1)) % 2, key = 's' + o.tk + (s.head ? 1 : 0) + fr + (s.frz ? 1 : 0);
      const body = s.frz ? 0x8fe8ff : hex(T.centi[0]), legs = s.frz ? 0xe0fbff : hex(T.centi[1]), face = s.frz ? 0xc8f8ff : hex(T.centi[2]);
      at(s.x, s.y + 2, pos);
      const pv = segPrev.get(s.id); let yaw = s.dx < 0 ? PI : 0;
      if (pv) { const dx = s.x - pv.x, dy = s.y - pv.y; if (dx * dx + dy * dy > 0.01) yaw = Math.atan2(dy, dx); yaw = pv.yaw + Math.atan2(Math.sin(yaw - pv.yaw), Math.cos(yaw - pv.yaw)) * 0.35; }
      segPrev.set(s.id, { x: s.x, y: s.y, yaw }); seen.add(s.id);
      shadow(pos, 5); pos.y = Math.abs(Math.sin(o.t * 12 + s.id)) * 0.5;
      place(key, () => segModel(body, legs, face, s.head, fr, M0), 200, pos, -yaw);
    });
    // the bugs, each turned the way it's going
    (R.foes || []).forEach(f => {
      if (f.type === 'scorp' || f.type === 'ball') return;
      const fast = f.type === 'wasp' || f.type === 'bwasp' || f.type === 'ffly', fr = Math.floor(o.t * (fast ? 22 : 8) + f.id) % 2, lit = f.type === 'ffly' && (f.glow || 0) > 0.4;
      const key = 'f' + f.type + fr + (lit ? 1 : 0) + (f.type === 'spider' || f.type === 'mini' ? o.tk : '');
      at(f.x, f.y + 2, pos);
      const pv = segPrev.get('f' + f.id); let yaw = pv ? pv.yaw : (f.vx || 0) < 0 ? PI : 0;
      if (pv) { const dx = f.x - pv.x, dy = f.y - pv.y; if (dx * dx + dy * dy > 0.04) { const want = Math.atan2(dy, dx); yaw = pv.yaw + Math.atan2(Math.sin(want - pv.yaw), Math.cos(want - pv.yaw)) * 0.3; } }
      if (f.type === 'spider' || f.type === 'mini') yaw = 0; else if (f.type === 'flea') yaw = (f.vx || 0) < 0 ? PI : 0;
      segPrev.set('f' + f.id, { x: f.x, y: f.y, yaw }); seen.add('f' + f.id);
      const fly = f.type === 'wasp' || f.type === 'bwasp' || f.type === 'ffly';
      shadow(pos, fly ? 4.5 : 5.5); pos.y = fly ? 3 + Math.sin(o.t * 6 + f.id) : 0;
      place(key, () => bugModel(f.type, fr, T, M0, lit), 60, pos, -yaw);
    });
    // ships
    (o.ships || []).forEach(sp => {
      if (!sp.alive || sp.a < 0.5) return;
      at(sp.x, sp.y, pos); shadow(pos, 5); pos.y = 2 + Math.sin(o.t * 3 + sp.ci) * 0.6;
      place('ship' + sp.ci, () => shipModel(o.PCOL[sp.ci % 3], M0), 4, pos, 0);
    });
    segPrev.forEach((v, k) => { if (!seen.has(k)) segPrev.delete(k); });
    // the boss
    const B = R.boss;
    if (B) {
      if (rigType !== B.type || !rig) makeRig(B.type);
      if (rigSt !== B.st) { rigSt = B.st; rigT0 = o.t; }
      const stT = B.stT != null ? B.stT : o.t - rigT0;
      rig.root.visible = true;
      at(B.x, B.y, rig.root.position);
      rig.anim(B, o.t, B.st, stT);
      // light on it: white when hit, pulsing white as the wasp holds back, red as it winds up, white-hot dying
      let em = 0, emC = 0xffffff;
      if (B.type === 'wasp') { if (B.flash > 0 || B.hitf) em = 0.9; else if (B.st === 'hold' && stT > 0.3) em = 0.85 * (0.5 - 0.5 * Math.cos(TAU * 5 * (stT - 0.3))); if (B.st === 'wind') { em = 0.8; emC = 0xff3a1a; } }
      if (B.type === 'firefly' && (B.flash > 0 || B.hitf)) { em = 0.5; emC = 0xff8ccf; }
      if (B.st === 'die') em = 0.4 + 0.3 * Math.sin(o.t * 30);
      bossMats.lit.emissive.setHex(emC).multiplyScalar(em);
      // coming in: it grows out of its cloud of cubes
      const sc = B.st === 'enter' && B.type !== 'mega' ? clamp((stT - 0.45) / 0.65, 0.02, 1) : 1;
      rig.root.scale.setScalar(sc);
      if (sc > 0.3) shadow(rig.root.position, B.type === 'mega' ? 40 : 26);
    } else if (rig) rig.root.visible = false;
    flush();
    composer.render();
  }
  return { frame, at, ok: true, renderer };
}
// for the model viewer used while tuning the art
export const _test = { waspRig, flyerRig, beetleRig, megaRig, mats, mushModel, segModel };
