// ═══════════════════════════════════════════════════════════════════════════
// Pinball component library. Every component: physics (colliders, sensors,
// fields, paths in physics.js), 3D meshes (mesh(RC), only when rendering),
// switch events for the rules (G.emit(type, id, ball, data)), lamps, sounds,
// and test hooks (each has trigger() or equivalent methods).
//
// Tables create components through the builder: T.popBumper({...}) etc.
// See README.md for every option.
// ═══════════════════════════════════════════════════════════════════════════
import * as THREE from 'three';
import { BR, DT, ROLLK, G_ALONG, G_NORMAL, clamp, spline, deg } from './physics.js';
import { canvas, canvasTex, wallGeo, slabGeo, cylGeo, boxGeo, sphereGeo, torusGeo, latheGeo, tubeGeo, batShape, offsetLine, shade, rgba, glowCanvas } from './gfx.js';

const PI = Math.PI, TAU = PI * 2;
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

class Comp {
  constructor(T, o) {
    this.T = T; this.G = T.G; this.world = T.world; this.o = o; this.id = o.id || '';
    this.lvl = o.lvl || 'main'; this.z0 = (T.levels[this.lvl] || { z: 0 }).z;
    this.x = o.x != null ? o.x : 0; this.y = o.y != null ? o.y : 0;
  }
  emit(type, ball, data) { this.G.emit(type, this.id, ball, data); }
  sfx(name, o = {}) { this.G.sfx(name, Object.assign({ x: this.x }, o)); }
  get RC() { return this.T.R; }
  add(obj) { this.T.R.root.add(obj); return obj; }
}
function dirv(a) { return [Math.cos(deg(a)), Math.sin(deg(a))]; }
function grp(x, y, z) { const g = new THREE.Group(); g.position.set(x || 0, y || 0, z || 0); return g; }
function decalTex(RC, w, h, fn) { const c = canvas(w, h), g = c.getContext('2d'); fn(g, w, h); return RC.tex(c); }

// ── Flipper ────────────────────────────────────────────────────────────────
class Flipper extends Comp {
  constructor(T, o) {
    super(T, o);
    this.f = T.world.flipper(Object.assign({ r1: 12, r2: 7, len: 80 }, o, { lvl: this.lvl, id: o.id || 'flip' + (o.side || 'L') }));
    this.f.owner = this;
    T.ao({ kind: 'dot', x: o.x, y: o.y, r: 14, a: 0.5 });
  }
  mesh(RC) {
    const f = this.f, th = RC.theme, z = this.z0;
    const g = grp(f.x, f.y, z);
    const body = new THREE.ExtrudeGeometry(batShape(f.len, f.r1 - 2.6, f.r2 - 2.4), { depth: 20, bevelEnabled: true, bevelThickness: 1.5, bevelSize: 1.2, bevelSegments: 2 });
    body.translate(0, 0, 2.5);
    const rub = new THREE.ExtrudeGeometry(batShape(f.len, f.r1, f.r2), { depth: 8, bevelEnabled: true, bevelThickness: 1.4, bevelSize: 0.9, bevelSegments: 3 });
    rub.translate(0, 0, 8.5);
    const bm = RC.mats.plastic(this.o.color || th.flipper, { roughness: 0.28, clearcoat: 1 });
    this.rubMat = new THREE.MeshStandardMaterial({ color: this.o.rubber || th.flipperRubber, roughness: 0.7, emissive: this.o.rubber || th.flipperRubber, emissiveIntensity: 0 });
    const m1 = new THREE.Mesh(body, bm), m2 = new THREE.Mesh(rub, this.rubMat);
    const cap = new THREE.Mesh(cylGeo(0, 0, 5.5, 23, 26, 16), RC.mats.chrome());
    // logo stripe on top
    const stripe = new THREE.Mesh(new THREE.PlaneGeometry(f.len * 0.55, 4), new THREE.MeshStandardMaterial({ color: this.o.stripe || th.flipperStripe || th.flipperRubber, roughness: 0.4 }));
    stripe.position.set(f.len * 0.48, 0, 25.3);
    [m1, m2, cap].forEach(m => { m.castShadow = true; m.receiveShadow = true; g.add(m); }); g.add(stripe);
    this.g = g; RC.root.add(g);
    // the pivot bushing under it
    RC.batch.add(RC.mats.steel(), cylGeo(f.x, f.y, 7, z, z + 2.5, 16));
  }
  render() {
    if (!this.g) return;
    this.g.rotation.z = this.f.a;
    // flippers glow faintly in the dark (Lights Out)
    this.rubMat.emissiveIntensity = this.G.dark * 0.6;
  }
}

// ── Pop bumper ─────────────────────────────────────────────────────────────
class PopBumper extends Comp {
  constructor(T, o) {
    super(T, o);
    this.r = o.r || 24;
    this.c = T.world.circ(o.x, o.y, this.r, { mat: 'bumper', kick: o.kick || 1250, kickMin: o.kickMin || 60, kickCool: 0.07, lvl: this.lvl, owner: this, id: this.id });
    this.lamp = T.bulb(o.lamp || this.id, o.x, o.y, this.z0 + 36, { color: o.color || '#ffd27a', r: 0.01, k: 0 });
    this.ring = 0; this.fireT = 0;
    T.ao({ kind: 'dot', x: o.x, y: o.y, r: this.r + 6, a: 0.65, blur: 10 });
  }
  onContact(b, c, imp) {
    if (!c.kicked) return;
    this.fireT = 0.09; this.G.pulse(this.lamp.id, 0.18);
    this.sfx('pop', { vol: 0.9 }); this.G.haptic('light'); this.G.shake(0.15);
    if (this.RC) this.RC.burst(b.x, b.y, this.z0 + 14, 8, 380, this.o.spark);
    this.emit('pop', b, { x: this.x, y: this.y });
  }
  trigger() { this.onContact({ x: this.x, y: this.y + this.r }, { kicked: true }, 1000); }
  mesh(RC) {
    const { x, y } = this.o, z = this.z0, r = this.r, col = this.o.color || '#ffd27a', th = RC.theme;
    // base and skirt
    RC.batch.add(RC.mats.plastic('#121214', { roughness: 0.5 }), cylGeo(x, y, r + 7, z, z + 1.5, 28));
    const skirt = latheGeo(x, y, [[r + 10, 0], [r + 10, 1.2], [r + 2, 5], [r - 2, 5.5]], 28); skirt.translate(0, 0, z + 1.5);
    RC.batch.add(RC.mats.clear(this.o.skirt || col, 0.7, { depthWrite: true }), skirt);
    // body
    const body = latheGeo(x, y, [[r - 4, 0], [r - 4, 22], [r - 1, 24], [r - 1, 27]], 28); body.translate(0, 0, z + 5);
    RC.batch.add(RC.mats.plastic(this.o.body || th.popBody || '#eae6dc', { roughness: 0.35 }), body);
    // ring (moves)
    const ring = new THREE.Mesh(latheGeo(0, 0, [[r - 2.5, 0], [r, 0], [r, 3], [r - 2.5, 3]], 28), RC.mats.chrome());
    ring.position.set(x, y, z + 17); ring.castShadow = true; RC.root.add(ring); this.ringM = ring;
    // rods holding the ring
    for (let i = 0; i < 3; i++) { const a = i / 3 * TAU + 0.5; RC.batch.add(RC.mats.chrome(), cylGeo(x + Math.cos(a) * (r - 1), y + Math.sin(a) * (r - 1), 0.9, z + 5, z + 20, 6)); }
    // cap: printed top under a clear dome, lit from inside
    const capT = decalTex(RC, 256, 256, (g, w, h) => {
      const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); gr.addColorStop(0, shade(col, 0.6)); gr.addColorStop(0.7, col); gr.addColorStop(1, shade(col, -0.4));
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      if (this.o.capArt) this.o.capArt(g, w, h);
      else { g.fillStyle = 'rgba(0,0,0,.75)'; g.font = '900 54px "Arial Narrow",Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(this.o.label || '100', w / 2, h / 2); }
    });
    this.capMat = new THREE.MeshStandardMaterial({ map: capT, emissiveMap: capT, emissive: '#ffffff', emissiveIntensity: 0.15, roughness: 0.3 });
    const capG = new THREE.CylinderGeometry(r - 1, r - 1, 3, 28); capG.rotateX(PI / 2);
    const capTop = new THREE.Mesh(capG, this.capMat); capTop.position.set(x, y, z + 33.5); RC.root.add(capTop);
    const dome = latheGeo(x, y, [[r + 0.5, 0], [r + 0.5, 3], [r - 2, 7.5], [r * 0.55, 10.5], [0, 11.5]], 28); dome.translate(0, 0, z + 32);
    RC.root.add(new THREE.Mesh(dome, RC.mats.clear('#ffffff', 0.18, { depthWrite: false })));
  }
  update(dt) { if (this.fireT > 0) this.fireT -= dt; }
  render(dt) {
    if (!this.ringM) return;
    const down = this.fireT > 0 ? 1 : 0; this.ring += (down - this.ring) * Math.min(1, dt * (down ? 60 : 14));
    this.ringM.position.z = this.z0 + 17 - this.ring * 12;
    this.capMat.emissiveIntensity = 0.15 + this.lamp.level * 2.6;
  }
}

// ── Slingshot ──────────────────────────────────────────────────────────────
// posts: [top, bottom (lane side), bottom (flipper side)] for either side.
class Slingshot extends Comp {
  constructor(T, o) {
    super(T, o);
    const [A, B, C] = o.posts; this.P = o.posts; this.x = (A[0] + B[0] + C[0]) / 3; this.y = (A[1] + B[1] + C[1]) / 3;
    const pr = 5.5, th = 3.2, w = this.world, lvl = this.lvl;
    [A, B, C].forEach(p => w.circ(p[0], p[1], pr + th, { mat: 'rubber', lvl }));
    // outward normal of each edge (away from the triangle's centre)
    const edge = (p, q, kick) => {
      const dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy); let nx = dy / l, ny = -dx / l;
      const mx = (p[0] + q[0]) / 2 - this.x, my = (p[1] + q[1]) / 2 - this.y; if (nx * mx + ny * my < 0) { nx = -nx; ny = -ny; }
      const off = pr + th / 2;
      return w.seg(p[0] + nx * off, p[1] + ny * off, q[0] + nx * off, q[1] + ny * off, kick ? { mat: 'sling', r: th / 2 + 0.3, kick: o.kick || 1150, kickMin: o.kickMin || 220, kickCool: 0.14, owner: this, lvl, id: this.id } : { mat: 'rubber', r: th / 2 + 0.3, lvl });
    };
    this.face = edge(A, C, true); edge(A, B); edge(B, C);
    this.lamp = T.bulb(o.lamp || this.id, this.x, this.y, this.z0 + 20, { color: o.color || '#ffffff', r: 0.01, k: 0 });
    this.kickT = 0;
    T.ao({ kind: 'poly', pts: [A, B, C], a: 0.5 });
    T.statics.push({ kind: 'rubber', posts: [A, B, C], pr: pr - 0.5, th, lvl, color: o.rubber });
  }
  onContact(b, c) {
    if (!c.kicked) return;
    this.kickT = 0.08; this.G.pulse(this.lamp.id, 0.15);
    this.sfx('sling', { vol: 0.85 }); this.G.haptic('light');
    this.emit('sling', b);
  }
  trigger() { this.onContact(null, { kicked: true }); }
  mesh(RC) {
    const [A, B, C] = this.P, z = this.z0;
    // printed plastic over the triangle
    const cx = this.x, cy = this.y, grow = p => { const dx = p[0] - cx, dy = p[1] - cy, l = Math.hypot(dx, dy); return [p[0] + dx / l * 9, p[1] + dy / l * 9]; };
    const poly = [grow(A), grow(B), grow(C)];
    const xs = poly.map(p => p[0]), ys = poly.map(p => p[1]), box = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
    const t = decalTex(RC, 256, 256, (g, w, h) => {
      g.fillStyle = this.o.plastic || RC.theme.slingPlastic || '#3a2a50'; g.fillRect(0, 0, w, h);
      if (this.o.art) this.o.art(g, w, h, this.o.side);
      else if (RC.T.def.art && RC.T.def.art.sling) RC.T.def.art.sling(g, w, h, this.o.side);
    });
    const geo = slabGeo(poly, z + 34, 3, { bevel: 0.8, uvBox: box });
    const m = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ map: t, roughness: 0.25, clearcoat: 1, transparent: true, opacity: 0.92, emissiveMap: t, emissive: '#ffffff', emissiveIntensity: 0.0 }));
    m.castShadow = true; RC.root.add(m); this.plMat = m.material;
    [A, B, C].forEach(p => { RC.batch.add(RC.mats.plastic(RC.theme.postColor || '#f2efe6'), cylGeo(p[0], p[1], 4.5, z, z + 34, 14)); RC.batch.add(RC.mats.chrome(), cylGeo(p[0], p[1], 2.2, z + 37, z + 41, 8)); });
    // kicker arm behind the rubber face
    const dx = C[0] - A[0], dy = C[1] - A[1], l = Math.hypot(dx, dy), mx = (A[0] + C[0]) / 2, my = (A[1] + C[1]) / 2;
    let nx = dy / l, ny = -dx / l; if (nx * (mx - cx) + ny * (my - cy) < 0) { nx = -nx; ny = -ny; }
    this.n = [nx, ny];
    const arm = new THREE.Mesh(new THREE.BoxGeometry(l * 0.45, 3, 10), RC.mats.steel()); arm.rotation.z = Math.atan2(dy, dx);
    arm.position.set(mx - nx * 3, my - ny * 3, z + 12); RC.root.add(arm); this.arm = arm; this.armBase = [mx - nx * 3, my - ny * 3];
  }
  update(dt) { if (this.kickT > 0) this.kickT -= dt; }
  render() {
    if (!this.arm) return;
    const k = this.kickT > 0 ? 5 : 0; this.arm.position.x = this.armBase[0] + this.n[0] * k; this.arm.position.y = this.armBase[1] + this.n[1] * k;
    this.plMat.emissiveIntensity = this.lamp.level * 0.5;
  }
}

// ── Drop target bank ───────────────────────────────────────────────────────
// x, y: centre; angle: the way the targets FACE (towards the ball); n targets of width w.
class DropTargetBank extends Comp {
  constructor(T, o) {
    super(T, o);
    const n = o.n || 3, w = o.w || 24, gap = o.gap != null ? o.gap : 3, fa = deg(o.angle != null ? o.angle : 270);
    const fx = Math.cos(fa), fy = Math.sin(fa), sx = -fy, sy = fx;   // facing and side vectors
    this.targets = [];
    for (let i = 0; i < n; i++) {
      const off = (i - (n - 1) / 2) * (w + gap), cx = o.x + sx * off, cy = o.y + sy * off;
      const c = T.world.seg(cx - sx * (w / 2 - 1), cy - sy * (w / 2 - 1), cx + sx * (w / 2 - 1), cy + sy * (w / 2 - 1), { mat: 'target', r: 3, lvl: this.lvl, owner: this, id: this.id + i });
      this.targets.push({ i, c, x: cx, y: cy, up: true, h: 0, label: o.labels ? o.labels[i] : '' });
    }
    this.f = [fx, fy]; this.s = [sx, sy]; this.w = w; this.resetT = 0;
    T.art(P => {   // slots in the playfield
      const g = P.ctx; g.save(); g.fillStyle = 'rgba(5,4,6,.92)';
      for (const t of this.targets) { g.save(); g.translate(t.x, t.y); g.rotate(fa + PI / 2); g.fillRect(-w / 2 - 1, -3.5, w + 2, 7); g.restore(); }
      g.restore();
    }, 'over');
  }
  onContact(b, c, imp) {
    const t = this.targets.find(t => t.c === c); if (!t || !t.up || imp < 40) return;
    t.up = false; t.c.on = false; this.sfx('drop', { vol: 0.85 }); this.G.haptic('light');
    this.emit('drop', b, { i: t.i });
    if (this.targets.every(t => !t.up)) { this.emit('bank', b); if (!this.hold) this.resetT = this.o.resetDelay || 1.8; }
  }
  reset() {
    // wait until no ball sits on a target slot
    const blocked = this.world.balls.some(b => b.mode === 'free' && b.lvl === this.lvl && this.targets.some(t => Math.hypot(b.x - t.x, b.y - t.y) < this.w / 2 + BR + 4));
    if (blocked) { this.resetT = 0.5; return; }
    let any = false; for (const t of this.targets) { if (!t.up) any = true; t.up = true; t.c.on = true; }
    if (any && this.G.state !== 'over') this.sfx('dropReset', { vol: 0.8 });
  }
  trigger(i = 0) { const t = this.targets[i]; if (t && t.up) this.onContact(null, t.c, 999); }
  allDown() { return this.targets.every(t => !t.up); }
  update(dt) { if (this.resetT > 0) { this.resetT -= dt; if (this.resetT <= 0) this.reset(); } }
  mesh(RC) {
    const z = this.z0, fa = Math.atan2(this.f[1], this.f[0]);
    this.meshes = this.targets.map(t => {
      const tex = decalTex(RC, 128, 160, (g, w, h) => {
        g.fillStyle = this.o.color || '#e8e0c8'; g.fillRect(0, 0, w, h);
        if (this.o.art) this.o.art(g, w, h, t.i); else if (t.label) { g.fillStyle = this.o.ink || '#1a1020'; g.font = '900 86px "Arial Narrow",Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t.label, w / 2, h / 2 + 4); }
      });
      const m = new THREE.Mesh(new THREE.BoxGeometry(this.w - 1, 4, 30), [RC.mats.plastic(this.o.color || '#e8e0c8'), RC.mats.plastic(this.o.color || '#e8e0c8'), RC.mats.plastic(this.o.color || '#e8e0c8'), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.4 }), RC.mats.plastic(this.o.color || '#e8e0c8'), RC.mats.plastic(this.o.color || '#e8e0c8')]);
      m.rotation.z = fa + PI / 2; m.position.set(t.x, t.y, z + 15); m.castShadow = true; RC.root.add(m); return m;
    });
  }
  render(dt) {
    if (!this.meshes) return;
    this.targets.forEach((t, i) => { t.h += ((t.up ? 1 : 0) - t.h) * Math.min(1, dt * (t.up ? 18 : 30)); this.meshes[i].position.z = this.z0 + 15 - (1 - t.h) * 31; this.meshes[i].visible = t.h > 0.02; });
  }
}

// ── Standup target ─────────────────────────────────────────────────────────
class StandupTarget extends Comp {
  constructor(T, o) {
    super(T, o);
    const fa = deg(o.angle != null ? o.angle : 270), w = o.w || 20, sx = -Math.sin(fa), sy = Math.cos(fa);
    this.f = [Math.cos(fa), Math.sin(fa)]; this.w = w;
    this.c = T.world.seg(o.x - sx * w / 2, o.y - sy * w / 2, o.x + sx * w / 2, o.y + sy * w / 2, { mat: 'target', r: 3, lvl: this.lvl, owner: this, id: this.id });
    this.last = -9; this.wob = 0;
  }
  onContact(b, c, imp) {
    if (imp < 60 || this.G.time - this.last < 0.15) return; this.last = this.G.time; this.wob = Math.min(1, imp / 1200);
    this.sfx('target', { vol: 0.25 + 0.6 * Math.min(1, imp / 1500) }); this.emit('target', b);
  }
  trigger() { this.onContact(null, this.c, 900); }
  mesh(RC) {
    const z = this.z0, fa = Math.atan2(this.f[1], this.f[0]);
    const tex = decalTex(RC, 128, 128, (g, w, h) => {
      g.fillStyle = this.o.color || '#f0c040'; g.fillRect(0, 0, w, h);
      if (this.o.art) this.o.art(g, w, h);
      else { g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = 6; g.strokeRect(8, 8, w - 16, h - 16); if (this.o.label) { g.fillStyle = 'rgba(0,0,0,.85)'; g.font = '900 64px "Arial Narrow",Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(this.o.label, w / 2, h / 2 + 3); } }
    });
    const g = grp(this.o.x - this.f[0] * 3, this.o.y - this.f[1] * 3, z);
    const face = new THREE.Mesh(new THREE.BoxGeometry(this.w, 3, 24), [RC.mats.plastic(this.o.color || '#f0c040'), RC.mats.plastic(this.o.color || '#f0c040'), RC.mats.plastic(this.o.color || '#f0c040'), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.4 }), RC.mats.plastic('#222'), RC.mats.plastic('#222')]);
    face.position.z = 16; face.castShadow = true; g.add(face);
    RC.batch.add(RC.mats.plastic('#18181a'), boxGeo(this.o.x - this.f[0] * 7, this.o.y - this.f[1] * 7, z + 3, 6, 6, 6, fa));
    g.rotation.z = fa + PI / 2; RC.root.add(g); this.g = g; this.face = face;
  }
  update(dt) { this.wob *= Math.exp(-dt * 6); }
  render() { if (this.face) this.face.rotation.x = Math.sin(this.G.time * 40) * this.wob * 0.25; }
}

// ── Rollover lane switch ─────────────────────────────────────────────────────
class RolloverLane extends Comp {
  constructor(T, o) {
    super(T, o);
    this.s = T.world.sensor({ kind: 'circle', x: o.x, y: o.y, r: o.r || 11, lvl: this.lvl, owner: this, id: this.id });
    this.press = 0;
    if (o.insert !== false && o.lamp !== false) this.lamp = T.insert(o.lamp || this.id, o.x, o.y + (o.lampDy != null ? o.lampDy : 26), { shape: o.shape || 'circle', r: o.lampR || 7, color: o.color || '#ffd27a', text: o.text, size: o.textSize });
  }
  onSensor(b) { this.press = 1; this.sfx('rollover', { vol: 0.6 }); this.emit('lane', b); }
  trigger() { this.onSensor(null); }
  mesh(RC) {
    const z = this.z0, { x, y } = this.o;
    if ((this.o.style || 'wire') === 'wire') {
      const geo = tubeGeo([[x, y - 13, z - 1], [x, y - 6, z + 3.5], [x, y + 6, z + 3.5], [x, y + 13, z - 1]], 0.9, 12, 6);
      this.m = new THREE.Mesh(geo, RC.mats.chrome()); RC.root.add(this.m);
      RC.T && 0;
    } else {
      this.m = new THREE.Mesh(latheGeo(x, y, [[0, 0], [7, 0], [6, 3], [0, 4]], 12), RC.mats.plastic(this.o.buttonColor || '#f4e9c8')); this.m.position.z = z; RC.root.add(this.m);
    }
  }
  update(dt) { this.press = Math.max(0, this.press - dt * 6); }
  render() { if (this.m) this.m.position.z = -this.press * 3; }
}

// ── Spinner ──────────────────────────────────────────────────────────────────
class Spinner extends Comp {
  constructor(T, o) {
    super(T, o);
    const w = o.w || 36, a = deg(o.angle != null ? o.angle : 90), tx = Math.cos(a), ty = Math.sin(a), sx = -ty, sy = tx;
    this.t = [tx, ty]; this.s = [sx, sy]; this.w = w;
    this.sens = T.world.sensor({ kind: 'line', x1: o.x - sx * w / 2, y1: o.y - sy * w / 2, x2: o.x + sx * w / 2, y2: o.y + sy * w / 2, lvl: this.lvl, owner: this, id: this.id });
    this.ang = 0; this.spin = 0; this.half = 0;
  }
  onSensor(b) {
    const v = Math.abs(b.vx * this.t[0] + b.vy * this.t[1]);
    this.spin = clamp(Math.max(this.spin, v / 70), 0, 34) * (b.vx * this.t[0] + b.vy * this.t[1] >= 0 ? 1 : 1);
    this.emit('spinStart', b);
  }
  trigger(sp = 20) { this.spin = sp; }
  update(dt) {
    if (this.spin <= 0) return;
    this.ang += this.spin * dt * TAU;
    while (this.ang >= (this.half + 1) * PI) { this.half++; this.sfx('spin', { vol: 0.45, vary: 0.05, gap: 0.01 }); this.emit('spin', null); }
    this.spin *= Math.exp(-1.3 * dt); this.spin -= dt * 0.8;
    if (this.spin < 0.4) { this.spin = 0; this.ang = this.half * PI; }
  }
  mesh(RC) {
    const z = this.z0, { x, y } = this.o, s = this.s, w = this.w;
    [-1, 1].forEach(k => { const px = x + s[0] * (w / 2 + 3) * k, py = y + s[1] * (w / 2 + 3) * k; RC.batch.add(RC.mats.steel(), boxGeo(px, py, z + 18, 3, 6, 36, Math.atan2(s[1], s[0]))); });
    RC.batch.add(RC.mats.steel(), tubeGeo([[x - s[0] * (w / 2 + 4), y - s[1] * (w / 2 + 4), z + 31], [x + s[0] * (w / 2 + 4), y + s[1] * (w / 2 + 4), z + 31]], 1, 2, 6));
    const tex = decalTex(RC, 256, 128, (g, W, H) => { g.fillStyle = this.o.color || '#d0d4dc'; g.fillRect(0, 0, W, H); if (this.o.art) this.o.art(g, W, H); else { g.fillStyle = '#222'; g.font = '900 60px "Arial Narrow",Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(this.o.label || 'SPINNER', W / 2, H / 2); } });
    const plate = new THREE.Mesh(new THREE.BoxGeometry(w - 4, 1.2, 22), [RC.mats.steel(), RC.mats.steel(), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.35, metalness: 0.5 }), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.35, metalness: 0.5 }), RC.mats.steel(), RC.mats.steel()]);
    plate.geometry.rotateX(PI / 2); plate.geometry.translate(0, 0, -11); plate.geometry.rotateX(-PI / 2);
    const g = grp(x, y, z + 31); g.rotation.z = Math.atan2(s[1], s[0]); const pivot = new THREE.Group(); pivot.add(plate); g.add(pivot); plate.castShadow = true;
    RC.root.add(g); this.pivot = pivot;
  }
  render() { if (this.pivot) this.pivot.rotation.x = this.ang; }
}

// ── Scoop / saucer / kickout hole ────────────────────────────────────────────
// eject: {angle (deg), speed}. hold: seconds. maxV: only slower balls (saucer). Rules may set
// comp.holdT during the 'scoop' event, call comp.keep(ball) to lock it, or comp.eject() later.
class Scoop extends Comp {
  constructor(T, o) {
    super(T, o);
    this.r = o.r || 12;
    this.sens = T.world.sensor({ kind: 'circle', x: o.x, y: o.y, r: this.r, maxV: o.maxV || 0, lvl: this.lvl, owner: this, id: this.id });
    T.hole(o.x, o.y, this.r + 4, { lvl: this.lvl });
    this.balls = []; this.holdT = 0; this.ej = o.eject || { angle: 270, speed: 1600 }; this.kickT = 0;
    if (o.wall !== false && o.hood !== false) {   // a metal hood round the back of the scoop
      const a = deg(this.ej.angle), hood = [];
      for (let i = 0; i <= 8; i++) { const t = a + PI / 2 + i / 8 * PI; hood.push([o.x + Math.cos(t) * (this.r + 8), o.y + Math.sin(t) * (this.r + 8)]); }
      this.hood = hood; if (o.hoodWall !== false) T.wall(hood, { style: 'invisible', mat: 'metal', r: 2, lvl: this.lvl });
    }
  }
  onSensor(b) {
    if (b.noCap[this.id] > this.world.time) return;
    this.world.hold(b, this, { x0: b.x, y0: b.y });
    this.balls.push(b); this.holdT = this.o.hold != null ? this.o.hold : 0.9;
    this.sfx('scoop', { vol: 0.85 }); this.G.haptic('medium');
    this.emit(this.o.event || 'scoop', b);
  }
  stepHeld(b, dt, h) {
    const k = Math.min(1, h.t / 0.12);
    b.x = h.x0 + (this.o.x - h.x0) * k; b.y = h.y0 + (this.o.y - h.y0) * k; b.z = this.z0 - Math.min(1, h.t / 0.2) * 9;
    b.vx = b.vy = 0;
  }
  keep(b) { b.kept = true; }
  drop(b) { const i = this.balls.indexOf(b); if (i >= 0) this.balls.splice(i, 1); }
  eject(speed) {
    const b = this.balls.find(b => !b.kept) || this.balls[0]; if (!b) return;
    this.balls.splice(this.balls.indexOf(b), 1); b.kept = false;
    const a = deg(this.ej.angle + (Math.random() - 0.5) * (this.o.spread || 6)), sp = speed || this.ej.speed;
    this.world.release(b, this.o.x + Math.cos(a) * 4, this.o.y + Math.sin(a) * 4, Math.cos(a) * sp, Math.sin(a) * sp, this.lvl);
    b.noCap[this.id] = this.world.time + 0.6;
    this.sfx('kick', { vol: 0.85 }); this.G.shake(0.25); this.kickT = 0.12; this.emit('scoopEject', b);
  }
  // another component hands a ball over (subway, VUK chain)
  receive(b, hold) { this.world.hold(b, this, { x0: this.o.x, y0: this.o.y }); b.hidden = false; this.balls.push(b); this.holdT = hold != null ? hold : 0.6; }
  trigger() { const b = this.world.addBall(this.o.x, this.o.y, { lvl: this.lvl }); this.onSensor(b); }
  update(dt) {
    if (this.kickT > 0) this.kickT -= dt;
    if (this.balls.some(b => !b.kept) && this.holdT > 0) { this.holdT -= dt; if (this.holdT <= 0) this.eject(); }
    // drop balls that left (drained or removed)
    this.balls = this.balls.filter(b => !b.removed);
  }
  onTilt() { this.holdT = Math.min(this.holdT, 0.3); }
  mesh(RC) {
    const z = this.z0, { x, y } = this.o;
    const cup = latheGeo(x, y, [[this.r + 4, 0], [this.r + 2, -4], [this.r - 1, -14], [0, -16]], 20); cup.translate(0, 0, z);
    RC.batch.add(RC.mats.steel(), cup);
    if (this.hood) RC.batch.add(RC.mats.chrome(), wallGeo(this.hood, 2.2, z, z + 24, { bevel: 0.6 }));
  }
}

// ── VUK (vertical up-kicker): a hole that fires the ball up a shaft and along a path ──
class VUK extends Comp {
  constructor(T, o) {
    super(T, o);
    this.r = o.r || 12;
    if (o.hole !== false) { this.sens = T.world.sensor({ kind: 'circle', x: o.x, y: o.y, r: this.r, maxV: o.maxV || 0, lvl: this.lvl, owner: this, id: this.id }); T.hole(o.x, o.y, this.r + 4, { lvl: this.lvl }); }
    const pts = spline(o.path, 6);
    this.path = T.world.path({ pts, style: o.style || 'wire', fric: 50, exitLvl: o.exitLvl || 'main', onExit: o.onExit ? (b, u, e, w) => o.onExit(b, u, e, w) : null });
    this.path.owner = this; this.balls = []; this.holdT = 0; this.style = o.style || 'wire';
    if (o.draw !== false && o.style !== 'hidden') T.statics.push({ kind: 'model', fn: RC => drawPath(RC, pts, this.style, o) });
  }
  onSensor(b) { this.world.hold(b, this, { x0: b.x, y0: b.y }); this.balls.push(b); this.holdT = this.o.hold != null ? this.o.hold : 0.5; this.sfx('scoop', { vol: 0.7 }); this.emit(this.o.event || 'vuk', b); }
  receive(b, hold) { this.world.hold(b, this, { x0: this.o.x, y0: this.o.y }); b.hidden = false; this.balls.push(b); this.holdT = hold != null ? hold : 0.4; }
  stepHeld(b, dt, h) { b.x = this.o.x; b.y = this.o.y; b.z = this.z0 - 10; }
  fire() {
    const b = this.balls.find(b => !b.kept); if (!b) return;
    this.balls.splice(this.balls.indexOf(b), 1);
    b.mode = 'free'; b.held = null; this.world.enterPath(b, this.path, this.o.power || 2600);
    this.sfx('vuk', { vol: 0.95 }); this.G.shake(0.35); this.emit('vukFire', b);
  }
  trigger() { const b = this.world.addBall(this.o.x, this.o.y, { lvl: this.lvl }); this.onSensor(b); }
  update(dt) { if (this.balls.some(b => !b.kept) && this.holdT > 0) { this.holdT -= dt; if (this.holdT <= 0) this.fire(); } this.balls = this.balls.filter(b => !b.removed); }
}

// ── Kickback (outlane) ───────────────────────────────────────────────────────
class Kickback extends Comp {
  constructor(T, o) {
    super(T, o);
    this.sens = T.world.sensor({ kind: 'circle', x: o.x, y: o.y, r: o.r || 12, lvl: this.lvl, owner: this, id: this.id });
    this.armed = o.armed !== false; this.fireT = 0;
    this.lamp = T.insert(o.lamp || this.id, o.x, o.y + 42, { shape: 'arrow', w: 14, h: 26, color: o.color || '#ff5040', text: '', label: o.label || 'KICKBACK', labelSize: 5.5, ly: -20 });
  }
  onSensor(b) {
    if (!this.armed || this.G.tilted || b.vy > 0) return;
    if (!this.o.keepArmed) this.armed = false;
    this.world.place(b, this.o.x, this.o.y + 2, this.lvl, (Math.random() - 0.5) * 40, this.o.power || 2300);
    this.fireT = 0.15; this.sfx('vuk', { vol: 0.9 }); this.G.shake(0.4); this.emit('kickback', b);
  }
  arm() { this.armed = true; }
  trigger() { const b = this.world.addBall(this.o.x, this.o.y + 30, { vy: -300 }); this.armed = true; this.onSensor(b); }
  update(dt) { if (this.fireT > 0) this.fireT -= dt; }
  mesh(RC) { this.rod = new THREE.Mesh(cylGeo(0, 0, 4, 0, 26, 12), RC.mats.chrome()); this.rod.rotation.x = -PI / 2; this.rod.position.set(this.o.x, this.o.y - 26, this.z0 + 6); RC.root.add(this.rod); }
  render() { if (this.rod) this.rod.position.y = this.o.y - 26 + (this.fireT > 0 ? 12 : 0); }
}

// ── Magnets ──────────────────────────────────────────────────────────────────
// Generic magnet under the playfield: pull (attract), catch (hold dead centre), release/fling.
class Magnet extends Comp {
  constructor(T, o) {
    super(T, o);
    this.r = o.r || 45; this.strength = o.strength || 5200; this.active = !!o.active; this.catching = o.catching != null ? !!o.catching : true;
    this.field = T.world.field({ x: o.x, y: o.y, r: this.r, lvl: this.lvl, fn: (b, dt) => this.pull(b, dt) });
    this.held = null; this.holdT = 0; this.cool = 0; this.glow = 0;
  }
  pull(b, dt) {
    if (!this.active || b.power || b.mist || this.cool > 0 || this.G.tilted) return;
    const dx = this.o.x - b.x, dy = this.o.y - b.y, d = Math.hypot(dx, dy);
    if (d > this.r || d < 1e-3) return;
    const f = this.strength * (1 - d / this.r) * (this.o.falloff === false ? 1 : 1);
    b.vx += dx / d * f * dt; b.vy += dy / d * f * dt;
    // damping near the centre so a caught ball settles instead of orbiting
    if (d < 18) { const k = Math.exp(-dt * 9); b.vx *= k; b.vy *= k; }
    if (this.catching && !this.held && d < 5 && Math.hypot(b.vx, b.vy) < 700) this.grab(b);
  }
  grab(b) {
    this.held = b; this.world.hold(b, this, { x0: b.x, y0: b.y }); this.holdT = this.o.hold != null ? this.o.hold : 1.2;
    this.sfx('magClick'); this.sfx('magnet', { vol: 0.6 }); this.G.haptic('heavy');
    this.emit(this.o.event || 'magnet', b);
  }
  stepHeld(b, dt, h) { const k = Math.min(1, h.t / 0.1); b.x = h.x0 + (this.o.x - h.x0) * k + Math.sin(h.t * 50) * 0.3; b.y = h.y0 + (this.o.y - h.y0) * k; b.z = this.z0; }
  release(vx, vy) {
    const b = this.held; if (!b) return; this.held = null;
    if (vx == null) { const a = deg(this.o.releaseAngle != null ? this.o.releaseAngle : 90 + (Math.random() - 0.5) * 70), s = this.o.releaseSpeed || 1100; vx = Math.cos(a) * s; vy = Math.sin(a) * s; }
    this.world.release(b, this.o.x, this.o.y, vx, vy, this.lvl); this.cool = 0.8; this.sfx('kick', { vol: 0.6 }); this.emit((this.o.event || 'magnet') + 'Release', b);
  }
  fling(angle, speed) { const a = deg(angle); this.release(Math.cos(a) * speed, Math.sin(a) * speed); }
  on() { this.active = true; } off() { this.active = false; }
  onTilt() { this.active = false; if (this.held) this.release(0, -200); }
  trigger() { this.active = true; const b = this.world.addBall(this.o.x, this.o.y - 2, {}); this.grab(b); }
  update(dt) {
    if (this.cool > 0) this.cool -= dt;
    if (this.held) { if (this.held.removed) this.held = null; else if (this.holdT > 0 && !this.o.manual) { this.holdT -= dt; if (this.holdT <= 0) this.release(); } }
    this.glow += ((this.active ? 1 : 0) - this.glow) * Math.min(1, dt * 6);
  }
}
// Magna-Save: the player's magnet beside an outlane (magna button / key A)
class MagnaSave extends Magnet {
  constructor(T, o) {
    super(T, Object.assign({ r: 46, strength: 9000, hold: 9, manual: true, releaseAngle: 60, releaseSpeed: 1000, event: 'magna' }, o));
    this.enabled = o.enabled !== false; this.charges = o.charges != null ? o.charges : Infinity; this.onT = 0;
    T.insert(o.lamp || this.id, o.x, o.y, { shape: 'ring', r: 13, ring: 3.5, color: o.color || '#5fd0ff' });
    T.G.hasMagna = true;
  }
  onMagna(on) {
    if (on && this.enabled && this.charges > 0 && !this.G.tilted) { this.active = true; this.onT = 1.8; this.sfx('magnet', { vol: 0.45 }); }
    else if (!on) { this.active = false; if (this.held) { this.release(); this.charges--; } }
  }
  update(dt) { super.update(dt); if (this.onT > 0) { this.onT -= dt; if (this.onT <= 0) { this.active = false; if (this.held) { this.release(); this.charges--; } } } }
}
// Ring catch: a magnet under a hanging toy that catches a passing ball and holds it dead centre
class RingCatch extends Magnet {
  constructor(T, o) { super(T, Object.assign({ r: 34, strength: 7000, hold: 2.2, event: 'ringCatch' }, o)); this.spinA = 0; }
  mesh(RC) { if (this.o.toy) { this.toy = this.o.toy(RC, this); if (this.toy) RC.root.add(this.toy); } }
  render(dt) { if (this.o.animate && this.toy) this.o.animate(this.toy, dt, this); }
}
// Mist magnet: drags a ball (or a glowing spectral 'mist ball') slowly along a path. Hit it to knock it free.
class MistMagnet extends Comp {
  constructor(T, o) {
    super(T, o);
    this.pts = spline(o.path.map(p => [p[0], p[1], 0]), 6); let L = 0; this.cum = [0];
    for (let i = 1; i < this.pts.length; i++) { L += Math.hypot(this.pts[i][0] - this.pts[i - 1][0], this.pts[i][1] - this.pts[i - 1][1]); this.cum.push(L); }
    this.L = L; this.ball = null; this.s = 0; this.speed = o.speed || 45; this.x = this.pts[0][0]; this.y = this.pts[0][1];
  }
  at(s) { const c = this.cum; let i = 1; while (i < c.length - 1 && c[i] < s) i++; const k = (s - c[i - 1]) / ((c[i] - c[i - 1]) || 1), a = this.pts[i - 1], b = this.pts[i]; return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]; }
  // start dragging: a given ball, or a new mist ball
  start(b) {
    if (this.ball) return this.ball;
    if (!b) { b = this.world.addBall(this.pts[0][0], this.pts[0][1], { lvl: this.lvl }); b.mist = true; }
    this.ball = b; this.s = 0; this.world.hold(b, this, {}); this.sfx('magnet', { vol: 0.4 }); this.emit('mistStart', b); return b;
  }
  stepHeld(b, dt) { this.s = Math.min(this.L, this.s + this.speed * dt); const p = this.at(this.s); b.x = p[0]; b.y = p[1]; b.z = this.z0; b.vx = this.speed * 0.3; b.vy = 0; if (this.s >= this.L && !this.ended) { this.ended = true; } }
  onHeldHit(b, other, imp) {
    if (imp < (this.o.breakSpeed || 350)) { this.sfx('clack', { vol: 0.5 }); this.emit('mistHit', other); return; }
    this.ball = null; b.mist = false;
    this.world.release(b, b.x, b.y, -other.vx * 0.6, -other.vy * 0.6 + 200, this.lvl);
    b.vx = (b.x - other.x) / BR * imp * 0.5; b.vy = (b.y - other.y) / BR * imp * 0.5;
    this.sfx('clack', { vol: 1 }); this.G.shake(0.5); this.emit('mistFree', b);
  }
  stop() { const b = this.ball; this.ball = null; if (b) { if (b.mist) { this.world.removeBall(b); if (this.RC) this.RC.dropBall(b); } else this.world.release(b, b.x, b.y, 0, -300, this.lvl); } }
  trigger() { this.start(); }
  update() { if (this.ball && this.ended) { this.ended = false; const b = this.ball; this.emit('mistEnd', b); if (this.ball === b) this.stop(); } if (this.ball && this.ball.removed) this.ball = null; }
  onTilt() { this.stop(); }
}

// ── Ramp / wireform / clear tube ─────────────────────────────────────────────
// pts: control points [x, y, z] from the mouth (on the playfield) to the end.
// style: 'plastic' (lofted translucent ramp), 'wire' (habitrail), 'tube' (clear tube).
// Events: rampEnter, ramp (made it), rampFail (rolled back). o.to: component to hand the ball to.
class Ramp extends Comp {
  constructor(T, o) {
    super(T, o);
    const pts = spline(o.pts, 6); this.pts = pts; this.style = o.style || 'plastic'; this.w = o.w || 46;
    this.x = pts[0][0]; this.y = pts[0][1];
    const self = this;
    this.path = T.world.path({
      pts, style: this.style, fric: o.fric || (this.style === 'wire' ? 70 : 55), exitLvl: o.exitLvl || 'main', minExit: o.minExit || 0, lvl: this.lvl,
      onExit: (b, u, e, w) => self.exit(b, u, e),
      onFail: o.noFail ? null : (b, u, e, w) => { w.place(b, e[0] - e[3] * 3, e[1] - e[4] * 3, self.lvl, -e[3] * u, -e[4] * u); b.noPath = 0.4; self.emit('rampFail', b); }
    });
    // entry: a line across the mouth, crossed going in
    const t0 = norm2(pts[3][0] - pts[0][0], pts[3][1] - pts[0][1]); this.t0 = t0;
    const n0 = [-t0[1], t0[0]], hw = this.w / 2 - 4;
    this.sens = T.world.sensor({ kind: 'line', x1: pts[0][0] + n0[0] * hw, y1: pts[0][1] + n0[1] * hw, x2: pts[0][0] - n0[0] * hw, y2: pts[0][1] - n0[1] * hw, dir: t0, lvl: this.lvl, owner: this, id: this.id });
    // side walls where the ramp is still low (so balls go in straight, and nothing passes under a low ramp)
    if (o.mouthWalls !== false) {
      const L = offsetLine(pts.map(p => [p[0], p[1]]), this.w / 2 + 1), R = offsetLine(pts.map(p => [p[0], p[1]]), -this.w / 2 - 1);
      const lowEnd = i => pts[i][2] < 30;
      for (const side of [L, R]) {
        let run = [];
        for (let i = 0; i < pts.length; i++) { if (lowEnd(i) && (i < pts.length * 0.5 || o.endWalls)) run.push(side[i]); else { if (run.length > 1) T.wall(run, { style: 'invisible', mat: this.style === 'wire' ? 'metal' : 'plastic', r: 2.5, lvl: this.lvl }); run = []; } }
        if (run.length > 1) T.wall(run, { style: 'invisible', mat: 'plastic', r: 2.5, lvl: this.lvl });
      }
    }
    this.lit = 0;
  }
  onSensor(b) {
    if (b.noPath > 0) return;
    const u = b.vx * this.t0[0] + b.vy * this.t0[1];
    if (u < (this.o.entryMin || 120)) return;
    this.world.enterPath(b, this.path, u);
    this.sfx(this.style === 'wire' ? 'gate' : 'flap', { vol: 0.5 }); this.emit('rampEnter', b);
  }
  exit(b, u, e) {
    this.sfx(this.style === 'wire' ? 'wireEnd' : 'flap', { vol: 0.5 });
    if (this.o.to) { const c = typeof this.o.to === 'string' ? this.G.comps[this.o.to] : this.o.to; this.emit('ramp', b); if (c && c.receive) { c.receive(b); return; } }
    const L = this.world.L_(this.o.exitLvl || 'main');
    const ux = e[3], uy = e[4], h = Math.hypot(ux, uy) || 1, sp = Math.max(u, this.o.minExit || 0) * (this.o.exitDamp || 0.9);
    b.lvl = L.id;
    this.world.airborne(b, e[0], e[1], Math.max(e[2], L.z), ux / h * sp, uy / h * sp, 0, L.id); b.noPath = 0.4;
    this.emit('ramp', b);
  }
  trigger(speed = 2200) { const b = this.world.addBall(this.pts[0][0], this.pts[0][1], { lvl: this.lvl }); this.world.enterPath(b, this.path, speed); this.emit('rampEnter', b); return b; }
  mesh(RC) { drawPath(RC, this.pts, this.style, this.o); }
}
function norm2(x, y) { const l = Math.hypot(x, y) || 1; return [x / l, y / l]; }
// draw a ramp / wireform / tube along floor points
function drawPath(RC, pts, style, o = {}) {
  const grpM = new THREE.Group(), n = pts.length, w = o.w || 46, mats = RC.mats;
  const frames = [];
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    const t = V3(b[0] - a[0], b[1] - a[1], b[2] - a[2]).normalize();
    let side = V3(-t.y, t.x, 0); if (side.lengthSq() < 1e-6) side = V3(1, 0, 0); side.normalize();
    const up = V3().crossVectors(t, side).normalize().multiplyScalar(-1); if (up.z < 0) up.multiplyScalar(-1);
    frames.push({ p: V3(a === b ? pts[i][0] : pts[i][0], pts[i][1], pts[i][2]), t, side, up });
  }
  const at = (i, lat, vert) => frames[i].p.clone().addScaledVector(frames[i].side, lat).addScaledVector(frames[i].up, vert);
  if (style === 'plastic') {
    const hw = w / 2, wallH = o.wallH || 24, floorT = 2.2;
    const pos = [], idx = [];
    // cross-section: outer-left-top, left-bottom outer, floor bottom..., right
    const prof = [[-hw, wallH], [-hw, -floorT], [hw, -floorT], [hw, wallH], [hw - 2.4, wallH], [hw - 2.4, 0], [-hw + 2.4, 0], [-hw + 2.4, wallH]];
    for (let i = 0; i < n; i++) for (const p of prof) { const v = at(i, p[0], p[1]); pos.push(v.x, v.y, v.z); }
    const m = prof.length;
    for (let i = 0; i < n - 1; i++) for (let j = 0; j < m; j++) { const a = i * m + j, b = i * m + (j + 1) % m, c = (i + 1) * m + j, d = (i + 1) * m + (j + 1) % m; idx.push(a, c, b, b, c, d); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    const mat = RC.mats.clear(o.color || '#a8e0ff', o.opacity || 0.42, { depthWrite: false, roughness: 0.06 });
    const mesh = new THREE.Mesh(g, mat); mesh.castShadow = true; mesh.renderOrder = 2; grpM.add(mesh);
    // rolled top edges, slightly more opaque
    const edge = RC.mats.clear(o.edge || o.color || '#d8f2ff', 0.75, { depthWrite: true }), edges = [];
    for (const lat of [-hw + 1.2, hw - 1.2]) { const ep = []; for (let i = 0; i < n; i += 2) { const v = at(i, lat, wallH); ep.push([v.x, v.y, v.z]); } edges.push(tubeGeo(ep, 1.6, ep.length * 2, 6)); }
    const em = new THREE.Mesh(mergeGeo(edges), edge); em.castShadow = true; grpM.add(em);
    // metal flap at the mouth
    const f0 = frames[0], fp = at(0, 0, 0).addScaledVector(f0.t, -6);
    RC.batch.add(RC.mats.steel(), boxGeo(fp.x, fp.y, RC.T.levels[o.lvl || 'main'].z + 0.4, w - 4, 14, 0.8, Math.atan2(f0.t.y, f0.t.x) - PI / 2));
    supports(RC, grpM, pts, frames, hw + 4, o);
  } else if (style === 'wire') {
    const rails = o.rails || [[-7.5, 2.4], [7.5, 2.4], [-14.5, 15], [14.5, 15]];
    const m = o.wireMat === 'iron' ? mats.iron() : o.wireMat === 'brass' ? mats.brass() : mats.chrome(), parts = [];
    for (const r of rails) { const ep = []; for (let i = 0; i < n; i++) { const v = at(i, r[0], r[1]); ep.push([v.x, v.y, v.z]); } parts.push(tubeGeo(ep, o.wireR || 1.3, Math.max(8, ep.length * 2), 6)); }
    // clips (hoops) every ~45 mm
    let acc = 0;
    for (let i = 1; i < n; i++) {
      acc += frames[i].p.distanceTo(frames[i - 1].p); if (acc < 45) continue; acc = 0;
      const hp = []; for (let k = 0; k <= 10; k++) { const a = PI + k / 10 * PI; hp.push(at(i, Math.cos(a) * 15, 15 + Math.sin(a) * 13)); }
      parts.push(tubeGeo(hp.map(v => [v.x, v.y, v.z]), 0.9, 12, 5));
    }
    const wm = new THREE.Mesh(mergeGeo(parts), m); wm.castShadow = true; grpM.add(wm);
    supports(RC, grpM, pts, frames, 17, o);
  } else if (style === 'tube') {
    const ep = pts.map(p => [p[0], p[1], p[2] + BR]);
    const t = new THREE.Mesh(tubeGeo(ep, o.tubeR || 18, Math.max(16, ep.length), 16), RC.mats.clear(o.color || '#d8f4ff', o.opacity || 0.22, { depthWrite: false, roughness: 0.03, side: THREE.DoubleSide }));
    t.renderOrder = 3; grpM.add(t);
    supports(RC, grpM, pts, frames, 20, o);
  }
  RC.root.add(grpM); return grpM;
}
function supports(RC, g, pts, frames, half, o) {
  if (o.supports === false) return;
  const base = RC.T.levels[o.lvl || 'main'].z, m = RC.mats.steel(); let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    acc += frames[i].p.distanceTo(frames[i - 1].p);
    if (acc < (o.supportEvery || 160) || pts[i][2] - base < 40) continue; acc = 0;
    for (const k of [-1, 1]) { const p = frames[i].p.clone().addScaledVector(frames[i].side, half * k); RC.batch.add(m, cylGeo(p.x, p.y, 1.6, base, p.z - 1, 8)); RC.batch.add(m, cylGeo(p.x, p.y, 4, base, base + 1.5, 8)); }
  }
}
function mergeGeo(list) {
  const out = []; let n = 0;
  for (const g0 of list) { const g = g0.index ? g0.toNonIndexed() : g0; out.push(g); n += g.attributes.position.count; }
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2); let o = 0;
  for (const g of out) { pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); if (g.attributes.uv) uv.set(g.attributes.uv.array, o * 2); o += g.attributes.position.count; }
  const m = new THREE.BufferGeometry(); m.setAttribute('position', new THREE.BufferAttribute(pos, 3)); m.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); m.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); return m;
}

// ── Orbit (a pair of switches: crossing A then B within a few seconds) ──────────
class Orbit extends Comp {
  constructor(T, o) {
    super(T, o);
    const mk = (L, k) => T.world.sensor({ kind: 'line', x1: L[0], y1: L[1], x2: L[2], y2: L[3], dir: o['dir' + k] || null, lvl: this.lvl, owner: this, id: this.id + k });
    this.a = mk(o.a, 'A'); this.b = mk(o.b, 'B'); this.seen = new Map(); this.x = (o.a[0] + o.a[2]) / 2; this.y = (o.a[1] + o.a[3]) / 2;
  }
  onSensor(b, s) {
    if (s === this.a) this.seen.set(b, this.world.time);
    else if (this.seen.has(b) && this.world.time - this.seen.get(b) < (this.o.within || 3)) { this.seen.delete(b); this.emit('orbit', b); }
    else if (this.o.both) this.seen.set(b, -99);
  }
  trigger() { this.emit('orbit', null); }
}

// ── Gate (one way) and diverter ─────────────────────────────────────────────
class Gate extends Comp {
  constructor(T, o) {
    super(T, o);
    const [x1, y1, x2, y2] = o.line; this.line = o.line; this.x = (x1 + x2) / 2; this.y = (y1 + y2) / 2;
    const d = o.dir || [0, 1];
    this.c = T.world.seg(x1, y1, x2, y2, { mat: 'metal', r: 1.5, one: d, lvl: this.lvl, owner: this, id: this.id });
    this.sens = T.world.sensor({ kind: 'line', x1, y1, x2, y2, dir: d, lvl: this.lvl, owner: this, id: this.id });
    this.swing = 0; this.open = 0;
  }
  onSensor(b) { this.swing = 1; this.sfx('gate', { vol: 0.5 }); this.emit('gate', b); }
  onContact() {}
  update(dt) { this.swing = Math.max(0, this.swing - dt * 3); }
  mesh(RC) {
    const [x1, y1, x2, y2] = this.line, z = this.z0;
    const len = Math.hypot(x2 - x1, y2 - y1), a = Math.atan2(y2 - y1, x2 - x1);
    const g = grp(this.x, this.y, z + 30); g.rotation.z = a;
    const piv = new THREE.Group(); g.add(piv);
    const wire = new THREE.Mesh(tubeGeo([[-len / 2 + 2, 0, 0], [-len / 2 + 2, 0, -26], [len / 2 - 2, 0, -26], [len / 2 - 2, 0, 0]], 1, 10, 6), RC.mats.chrome()); piv.add(wire);
    RC.batch.add(RC.mats.steel(), tubeGeo([[x1 - 2 * Math.cos(a), y1 - 2 * Math.sin(a), z + 30], [x2 + 2 * Math.cos(a), y2 + 2 * Math.sin(a), z + 30]], 1.2, 2, 6));
    RC.root.add(g); this.piv = piv;
  }
  render() { if (this.piv) this.piv.rotation.x = -this.swing * 1.1; }
}
class Diverter extends Comp {
  constructor(T, o) {
    super(T, o);
    this.len = o.len || 50; this.aOpen = deg(o.open != null ? o.open : 0); this.aClosed = deg(o.closed != null ? o.closed : 30);
    this.a = o.isOpen ? this.aOpen : this.aClosed; this.target = this.a;
    const p = this.tip(this.a); this.c = T.world.seg(o.x, o.y, p[0], p[1], { mat: 'metal', r: 3, dynamic: true, lvl: this.lvl, id: this.id });
  }
  tip(a) { return [this.o.x + Math.cos(a) * this.len, this.o.y + Math.sin(a) * this.len]; }
  open() { this.target = this.aOpen; } close() { this.target = this.aClosed; } isOpen() { return Math.abs(this.a - this.aOpen) < 0.05; }
  step(dt) {
    if (Math.abs(this.target - this.a) < 1e-4) { this.c.vx = this.c.vy = 0; return; }
    const da = clamp(this.target - this.a, -12 * dt, 12 * dt); this.a += da;
    const p = this.tip(this.a); this.world.moveSeg(this.c, this.o.x, this.o.y, p[0], p[1], dt);
  }
  mesh(RC) { const m = new THREE.Mesh(boxGeo(this.len / 2, 0, 12, this.len, 5, 22), RC.mats.plastic(this.o.color || '#d8d8e0')); this.g = grp(this.o.x, this.o.y, this.z0); this.g.add(m); m.castShadow = true; RC.root.add(this.g); }
  render() { if (this.g) this.g.rotation.z = this.a; }
}

// ── Subway / teleporter: disappear here, reappear there ─────────────────────────
// to: {x, y, lvl, vx, vy} or {comp: 'id'} (a scoop / VUK / cannon that receives the ball)
class Subway extends Comp {
  constructor(T, o) {
    super(T, o);
    this.r = o.r || 12;
    if (o.hole !== false) { this.sens = T.world.sensor({ kind: 'circle', x: o.x, y: o.y, r: this.r, maxV: o.maxV || 0, lvl: this.lvl, owner: this, id: this.id }); if (o.cut !== false) T.hole(o.x, o.y, this.r + 4, { lvl: this.lvl }); }
    this.q = []; this.flashA = 0;
  }
  onSensor(b) { this.take(b); }
  take(b, delay) {
    if (b.noCap[this.id] > this.world.time) return;
    this.world.hide(b, this, {}); this.q.push({ b, t: delay != null ? delay : (this.o.delay || 0.9) });
    this.sfx(this.o.style === 'teleport' ? 'whoosh' : 'scoop', { vol: 0.7 }); this.flashA = 1; this.emit(this.o.event || 'subway', b);
  }
  receive(b) { this.take(b, 0.3); }
  update(dt) {
    this.flashA = Math.max(0, this.flashA - dt * 2);
    for (let i = this.q.length - 1; i >= 0; i--) {
      const e = this.q[i]; if (e.b.removed) { this.q.splice(i, 1); continue; }
      if (e.hold) continue;
      e.t -= dt; if (e.t > 0) continue;
      this.q.splice(i, 1);
      const to = typeof this.o.to === 'function' ? this.o.to(e.b) : this.o.to;
      if (!to) continue;
      if (to.comp) { const c = this.G.comps[to.comp]; if (c && c.receive) { e.b.hidden = false; c.receive(e.b); continue; } }
      this.world.release(e.b, to.x, to.y, to.vx || 0, to.vy || 0, to.lvl || this.lvl); e.b.noCap[this.id] = this.world.time + 1;
      this.sfx(this.o.style === 'teleport' ? 'whoosh' : 'kick', { vol: 0.8, x: to.x }); this.emit((this.o.event || 'subway') + 'Out', e.b);
      if (this.RC && this.o.style === 'teleport') this.RC.burst(to.x, to.y, 10, 14, 300, this.o.color);
    }
  }
  trigger() { const b = this.world.addBall(this.o.x, this.o.y, { lvl: this.lvl }); this.take(b); }
  mesh(RC) {
    if (this.o.hole === false) return;
    const z = this.z0, { x, y } = this.o;
    const cup = latheGeo(x, y, [[this.r + 4, 0], [this.r + 2, -4], [this.r, -20], [0, -22]], 20); cup.translate(0, 0, z); RC.batch.add(RC.mats.steel(), cup);
    if (this.o.style === 'teleport') { this.ring = new THREE.Mesh(torusGeo(x, y, z + 1, this.r + 6, 2.2, 32), RC.mats.emissive(this.o.color || '#7cf', 1.5)); RC.root.add(this.ring); }
  }
  render() { if (this.ring) this.ring.material.emissiveIntensity = 0.6 + this.flashA * 4 + 0.4 * Math.sin(this.G.time * 4); }
}

// ── Ball lock (visible): balls sit in slots until released ───────────────────────
class BallLock extends Comp {
  constructor(T, o) { super(T, o); this.slots = o.slots || [[o.x, o.y, 0]]; this.balls = []; }
  lock(b) {
    if (this.balls.length >= this.slots.length) return false;
    const s = this.slots[this.balls.length]; this.world.hold(b, this, { slot: s }); this.balls.push(b); b.locked = true; b.hidden = !!this.o.hidden;
    this.G.lockBall(b); this.emit('lock', b, { n: this.balls.length }); return true;
  }
  receive(b) { if (!this.lock(b)) { const e = this.o.exit; this.world.release(b, e.x, e.y, e.vx || 0, e.vy || 0, e.lvl || this.lvl); } }
  stepHeld(b, dt, h) { const s = h.slot; b.x += (s[0] - b.x) * Math.min(1, dt * 12); b.y += (s[1] - b.y) * Math.min(1, dt * 12); b.z = (s[2] || 0) + this.z0; b.vx = b.vy = 0; }
  release(n) {
    n = n == null ? this.balls.length : n; let k = 0;
    while (n-- > 0 && this.balls.length) {
      const b = this.balls.shift(); b.locked = false; b.hidden = true;
      this.G.later(0.15 + k++ * 0.7, () => { if (b.removed) return; const e = this.o.exit; this.world.release(b, e.x, e.y, e.vx || 0, e.vy || 0, e.lvl || this.lvl); this.sfx('kick', { vol: 0.8, x: e.x }); this.emit('lockOut', b); });
    }
  }
  count() { return this.balls.length; }
  trigger() { const b = this.world.addBall(this.slots[0][0], this.slots[0][1], { lvl: this.lvl }); this.lock(b); }
}

// ── Trap door: a lit hole that drops the ball to a lower level ───────────────────
class TrapDoor extends Comp {
  constructor(T, o) {
    super(T, o);
    this.r = o.r || 16; this.isOpen = !!o.open; this.k = this.isOpen ? 1 : 0;
    this.sens = T.world.sensor({ kind: 'circle', x: o.x, y: o.y, r: this.r - 3, lvl: this.lvl, owner: this, id: this.id, on: this.isOpen });
    T.hole(o.x, o.y, this.r, { lvl: this.lvl, rim: 'rgba(30,24,20,.95)' });
  }
  open() { this.isOpen = true; this.sens.on = true; } close() { this.isOpen = false; this.sens.on = false; }
  onSensor(b) {
    if (!this.isOpen) return;
    const to = this.o.to || {}; const L = this.world.L_(to.lvl || 'main');
    const k = to.x != null ? 0.05 : 0.25;
    this.world.airborne(b, to.x != null ? to.x : b.x, to.y != null ? to.y : b.y, this.z0, b.vx * k + (Math.random() - 0.5) * 120, b.vy * k, -200, L.id);
    this.sfx('scoop', { vol: 0.8 }); this.emit('trapdoor', b);
    if (this.o.autoClose !== false) this.close();
  }
  trigger() { this.open(); const b = this.world.addBall(this.o.x, this.o.y, { lvl: this.lvl }); this.onSensor(b); }
  mesh(RC) {
    const z = this.z0, { x, y } = this.o, r = this.r;
    const tex = decalTex(RC, 128, 128, (g, w, h) => { g.fillStyle = this.o.color || '#3a2a20'; g.fillRect(0, 0, w, h); if (this.o.art) this.o.art(g, w, h); else { g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = 4; for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(i * w / 4, 0); g.lineTo(i * w / 4, h); g.stroke(); } } });
    const door = new THREE.Mesh(new THREE.CircleGeometry(r, 24), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5 }));
    door.geometry.translate(0, -r, 0);
    const hinge = grp(x, y + r, z + 0.3); hinge.add(door); RC.root.add(hinge); this.hinge = hinge;
  }
  update(dt) { this.k += ((this.isOpen ? 1 : 0) - this.k) * Math.min(1, dt * 8); }
  render() { if (this.hinge) this.hinge.rotation.x = this.k * 1.9; }
}

// ── Mini-field: an extra playfield level (basement below, attic above) ────────────
// box: [x0,y0,x1,y1]; z: height (negative = below the main playfield, seen through o.window).
class MiniField extends Comp {
  constructor(T, o) {
    super(T, o);
    this.lv = T.level(o.id, { z: o.z, bounds: o.box });
    this.z0 = o.z; this.box = o.box;
    this.poly = o.poly || [[o.box[0], o.box[1]], [o.box[0], o.box[3]], [o.box[2], o.box[3]], [o.box[2], o.box[1]]];
    if (o.window) T.window(o.window);
    if (o.walls === true || o.walls == null) T.wall(this.poly, { style: o.wallStyle || 'wood', lvl: o.id, h: o.wallH || 26, color: o.wallColor, r: 4, closed: true });
    else if (Array.isArray(o.walls)) o.walls.forEach(w => T.wall(w, { style: o.wallStyle || 'wood', lvl: o.id, h: o.wallH || 26, color: o.wallColor, r: 4 }));
  }
  mesh(RC) {
    const [x0, y0, x1, y1] = this.box, z = this.o.z, w = x1 - x0, h = y1 - y0, k = 2;
    const c = canvas(Math.round(w * k), Math.round(h * k)), g = c.getContext('2d');
    g.setTransform(k, 0, 0, -k, -x0 * k, y1 * k);
    g.fillStyle = this.o.floor || '#2a2420'; g.fillRect(x0, y0, w, h);
    if (this.o.paint) { const P = paintFor(g, k); this.o.paint(P, this.box); }
    // holes on this level
    for (const ho of RC.T.holes) if (ho.lvl === this.o.id) { const gr = g.createRadialGradient(ho.x, ho.y, 0, ho.x, ho.y, ho.r + 2); gr.addColorStop(0, '#000'); gr.addColorStop(0.8, '#050505'); gr.addColorStop(1, 'rgba(160,160,170,.6)'); g.fillStyle = gr; g.beginPath(); g.arc(ho.x, ho.y, ho.r + 2, 0, TAU); g.fill(); }
    const t = RC.tex(c);
    const fg = new THREE.ShapeGeometry(shapeOf(this.poly)); const fp = fg.attributes.position, uv = new Float32Array(fp.count * 2);
    for (let i = 0; i < fp.count; i++) { uv[i * 2] = (fp.getX(i) - x0) / w; uv[i * 2 + 1] = (fp.getY(i) - y0) / h; } fg.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    const floor = new THREE.Mesh(fg, new THREE.MeshPhysicalMaterial({ map: t, roughness: 0.55, clearcoat: 0.4, clearcoatRoughness: 0.45 }));
    floor.position.z = z; floor.receiveShadow = true; RC.root.add(floor);
    if (z > 0) {   // a raised deck: plywood edge and posts
      RC.batch.add(RC.mats.wood(RC.theme.wood), slabGeo(this.poly, z - 9, 8.6, { bevel: 1 }));
      for (const p of (this.o.legs || [[x0 + 8, y0 + 8], [x1 - 8, y0 + 8]])) RC.batch.add(RC.mats.chrome(), cylGeo(p[0], p[1], 3, 0, z - 9, 10));
    } else {
      if (this.o.light) { const l = new THREE.PointLight(this.o.light, this.o.lightK || 0.12, 0.35, 2); l.position.set((x0 + x1) / 2, (y0 + y1) / 2, z + 40); RC.root.add(l); this.light = l; }
      if (this.o.window) {   // the glass in the main playfield above
        const gl = new THREE.Mesh(new THREE.ShapeGeometry(shapeOf(this.o.window)), new THREE.MeshPhysicalMaterial({ color: '#cfe8ff', transparent: true, opacity: 0.1, roughness: 0.3, clearcoat: 0.4, clearcoatRoughness: 0.4, depthWrite: false, envMapIntensity: 0.35 }));
        gl.position.z = 0.15; gl.renderOrder = 4; RC.root.add(gl);
        if (this.o.glassArt) { const gc = canvas(512, 512), gg = gc.getContext('2d'); this.o.glassArt(gg, 512, 512); const xs = this.o.window.map(p => p[0]), ys = this.o.window.map(p => p[1]); const gt = RC.tex(gc); const pm = new THREE.Mesh(new THREE.PlaneGeometry(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)), new THREE.MeshBasicMaterial({ map: gt, transparent: true, depthWrite: false, opacity: 0.9 })); pm.position.set((Math.max(...xs) + Math.min(...xs)) / 2, (Math.max(...ys) + Math.min(...ys)) / 2, 0.3); pm.renderOrder = 5; RC.root.add(pm); }
        // dark walls of the pit
        const wpts = this.o.window.concat([this.o.window[0]]);
        for (let i = 0; i < wpts.length - 1; i++) { const a = wpts[i], b = wpts[i + 1]; const len = Math.hypot(b[0] - a[0], b[1] - a[1]); const m = new THREE.Mesh(new THREE.PlaneGeometry(len, -z), RC.mats.paint('#0d0a0c', { side: THREE.DoubleSide, roughness: 0.9 })); m.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, z / 2); m.rotation.set(PI / 2, Math.atan2(b[1] - a[1], b[0] - a[0]), 0, 'ZXY'); m.rotation.order = 'ZXY'; m.rotation.z = Math.atan2(b[1] - a[1], b[0] - a[0]); m.rotation.x = PI / 2; RC.root.add(m); }
      }
    }
  }
}
function shapeOf(poly) { const s = new THREE.Shape(); s.moveTo(poly[0][0], poly[0][1]); poly.slice(1).forEach(p => s.lineTo(p[0], p[1])); s.closePath(); return s; }
function paintFor(g, k) {
  return {
    ctx: g, k,
    text(str, x, y, o = {}) { g.save(); g.translate(x, y); g.scale(1, -1); if (o.rot) g.rotate(-o.rot * PI / 180); g.font = (o.weight || '700') + ' ' + (o.size || 12) + 'px ' + (o.font || '"Cinzel", Georgia, serif'); g.textAlign = o.align || 'center'; g.textBaseline = 'middle'; if (o.glow) { g.shadowColor = o.glow; g.shadowBlur = 8; } g.fillStyle = o.color || '#fff'; g.fillText(str, 0, 0); g.restore(); },
    circle(x, y, r) { g.beginPath(); g.arc(x, y, r, 0, TAU); return g; },
    poly(pts) { g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); return g; }
  };
}

// ── Elevator / time expander: a platform with stops; each stop enables its own shots ─
class Elevator extends Comp {
  constructor(T, o) {
    super(T, o);
    this.box = o.box; this.heights = o.heights || [0, 40, 80]; this.i = o.start || 0; this.z = this.heights[this.i]; this.groups = [];
    const [x0, y0, x1, y1] = o.box;
    T.wall([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], { style: 'invisible', mat: 'wood', r: 3, closed: true });
  }
  // register components (targets/scoops/sensors) active at stop i
  group(i, comps) { this.groups[i] = comps; this.apply(); }
  apply() { this.groups.forEach((cs, i) => (cs || []).forEach(c => setOn(c, i === this.i))); }
  goTo(i) { if (i === this.i) return; this.i = clamp(i, 0, this.heights.length - 1); this.apply(); this.sfx('motorRun', { vol: 0.6 }); this.emit('elevator', null, { stop: this.i }); }
  trigger() { this.goTo((this.i + 1) % this.heights.length); }
  update(dt) { const t = this.heights[this.i]; this.z += clamp(t - this.z, -60 * dt, 60 * dt); }
  mesh(RC) {
    const [x0, y0, x1, y1] = this.box;
    const tex = decalTex(RC, 256, 256, (g, w, h) => { g.fillStyle = this.o.color || '#334'; g.fillRect(0, 0, w, h); if (this.o.art) this.o.art(g, w, h); });
    const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, 12), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5 }));
    m.castShadow = true; this.g = grp((x0 + x1) / 2, (y0 + y1) / 2, 0); this.g.add(m); RC.root.add(this.g);
    const col = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0 - 6, y1 - y0 - 6, 1), RC.mats.paint('#151518')); col.scale.z = 1; this.col = col; RC.root.add(col); col.position.set((x0 + x1) / 2, (y0 + y1) / 2, 0);
  }
  render() { if (this.g) { this.g.position.z = this.z + 26; this.col.scale.z = Math.max(1, this.z + 20); this.col.position.z = (this.z + 20) / 2; } }
}
function setOn(c, on) {
  if (!c) return;
  if (c.c) c.c.on = on;
  if (c.sens) c.sens.on = on;
  if (c.targets) c.targets.forEach(t => { t.c.on = on && t.up; });
  if (c.on === true || c.on === false) c.on = on;
  c.enabled = on;
}

// ── Tilting mini-field: flipper buttons tilt a small maze level ─────────────────
class TiltingMiniField extends Comp {
  constructor(T, o) {
    super(T, o);
    this.lv = T.world.L_(o.lvl); this.max = o.max || 1200; this.tilt = 0; this.want = 0; this.walls = o.walls || [];
    this.walls.forEach(w => T.world.wall(w, { mat: 'wood', r: 3, lvl: o.lvl }));
    this.cx = (o.box[0] + o.box[2]) / 2; this.cy = (o.box[1] + o.box[3]) / 2;
  }
  onFlip(side, on) { const L = this.G.input.L, R = this.G.input.R; this.want = (R ? 1 : 0) - (L ? 1 : 0); }
  step(dt) { this.tilt += clamp(this.want - this.tilt, -5 * dt, 5 * dt); this.lv.gx = this.tilt * this.max; }
  trigger() { this.want = 1; }
  mesh(RC) {
    const g = grp(this.cx, this.cy, this.lv.z); const m = RC.mats.paint(this.o.wallColor || '#6a4a2a');
    this.walls.forEach(w => { const geo = wallGeo(w, 6, 0, 18); geo.translate(-this.cx, -this.cy, 0); const mm = new THREE.Mesh(geo, m); mm.castShadow = true; g.add(mm); });
    const [x0, y0, x1, y1] = this.o.box; const fl = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, 4), RC.mats.paint(this.o.floor || '#3a2a1a')); fl.position.z = -2; g.add(fl);
    RC.root.add(g); this.g = g;
  }
  render() { if (this.g) this.g.rotation.y = this.tilt * 0.08; }
}

// ── Cannon: loads a ball, rotate with the flipper buttons, fire with the launch button ─
class Cannon extends Comp {
  constructor(T, o) {
    super(T, o);
    this.a = deg(o.rest != null ? o.rest : 90); this.aMin = deg(o.min != null ? o.min : 30); this.aMax = deg(o.max != null ? o.max : 150);
    this.ball = null; this.loadT = 0; this.rot = 0; this.recoil = 0; this.auto = o.autoFire || 6;
    if (o.load) this.sens = T.world.sensor({ kind: 'circle', x: o.load[0], y: o.load[1], r: o.load[2] || 12, lvl: this.lvl, owner: this, id: this.id });
    if (o.load) T.hole(o.load[0], o.load[1], (o.load[2] || 12) + 4);
  }
  onSensor(b) { this.receive(b); }
  receive(b) { if (this.ball) { this.world.release(b, this.o.x, this.o.y - 30, 0, -600, this.lvl); return; } this.ball = b; this.world.hold(b, this, {}); b.hidden = true; this.loadT = 0; this.sfx('scoop'); this.emit('cannonLoad', b); this.G.cannon = this; }
  stepHeld(b) { b.x = this.o.x; b.y = this.o.y; b.z = this.z0 + 20; }
  onFlip(side, on) { this.rot = (this.G.input.L ? 1 : 0) - (this.G.input.R ? 1 : 0); }
  onFire() { if (!this.ball) return false; this.fire(); return true; }
  fire() {
    const b = this.ball; if (!b) return; this.ball = null; if (this.G.cannon === this) this.G.cannon = null;
    const sp = this.o.power || 3000, L = this.o.barrel || 40;
    this.world.release(b, this.o.x + Math.cos(this.a) * L, this.o.y + Math.sin(this.a) * L, Math.cos(this.a) * sp, Math.sin(this.a) * sp, this.lvl);
    this.recoil = 1; this.sfx('vuk', { vol: 1, rate: 0.7 }); this.sfx('thunder', { vol: 0.3, rate: 1.6 }); this.G.shake(1); this.G.haptic('heavy');
    if (this.RC) this.RC.burst(this.o.x + Math.cos(this.a) * L, this.o.y + Math.sin(this.a) * L, this.z0 + 24, 24, 500, '#ffd090');
    this.emit('cannonFire', b, { angle: this.a * 180 / PI });
  }
  trigger() { const b = this.world.addBall(this.o.x, this.o.y, {}); this.receive(b); }
  update(dt) {
    if (this.ball) { if (this.ball.removed) { this.ball = null; return; } this.loadT += dt; this.a = clamp(this.a + this.rot * 1.6 * dt, this.aMin, this.aMax); if (!this.rot && this.o.sweep !== false) this.a = this.aMin + (this.aMax - this.aMin) * (0.5 + 0.5 * Math.sin(this.loadT * 1.4)); if (this.loadT > this.auto) this.fire(); }
    this.recoil = Math.max(0, this.recoil - dt * 4);
  }
  mesh(RC) {
    const z = this.z0, g = grp(this.o.x, this.o.y, z);
    const base = new THREE.Mesh(cylGeo(0, 0, 22, 0, 14, 24), RC.mats.iron()); g.add(base);
    const turret = new THREE.Group(); turret.position.z = 20; g.add(turret);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(9, 12, this.o.barrel || 46, 20), this.o.barrelMat === 'brass' ? RC.mats.brass() : RC.mats.iron()); barrel.rotation.z = -PI / 2; barrel.position.x = (this.o.barrel || 46) / 2 - 6; turret.add(barrel);
    const muzzle = new THREE.Mesh(new THREE.TorusGeometry(10, 2.5, 8, 20), RC.mats.brass()); muzzle.rotation.y = PI / 2; muzzle.position.x = (this.o.barrel || 46) - 6; turret.add(muzzle);
    [base, barrel].forEach(m => m.castShadow = true);
    RC.root.add(g); this.turret = turret;
  }
  render() { if (this.turret) { this.turret.rotation.z = this.a; this.turret.position.x = -Math.cos(this.a) * this.recoil * 6; this.turret.position.y = -Math.sin(this.a) * this.recoil * 6; } }
}

// ── Moving launcher: slide a shooter side to side with the flippers, fire with launch ──
class MovingLauncher extends Comp {
  constructor(T, o) { super(T, o); this.pos = 0.5; this.ball = null; this.dir = 0; this.t = 0; }
  receive(b) { this.ball = b; this.world.hold(b, this, {}); this.t = 0; this.emit('launcherLoad', b); this.G.cannon = this; }
  stepHeld(b) { b.x = this.o.x0 + (this.o.x1 - this.o.x0) * this.pos; b.y = this.o.y; b.z = this.z0; }
  onFlip() { this.dir = (this.G.input.R ? 1 : 0) - (this.G.input.L ? 1 : 0); }
  onFire() { if (!this.ball) return false; this.fire(); return true; }
  fire() { const b = this.ball; if (!b) return; this.ball = null; this.G.cannon = null; this.world.release(b, b.x, b.y + 4, 0, this.o.power || 2200, this.lvl); this.sfx('launch'); this.emit('launcherFire', b, { pos: this.pos }); }
  trigger() { const b = this.world.addBall(this.o.x0, this.o.y, { lvl: this.lvl }); this.receive(b); }
  update(dt) { if (this.ball) { this.t += dt; this.pos = clamp(this.pos + this.dir * 0.9 * dt, 0, 1); if (this.t > 8) this.fire(); } }
  mesh(RC) { this.g = new THREE.Mesh(boxGeo(0, -10, 10, 30, 22, 20), RC.mats.plastic(this.o.color || '#c33')); RC.root.add(this.g); RC.batch.add(RC.mats.chrome(), tubeGeo([[this.o.x0, this.o.y - 16, this.z0 + 4], [this.o.x1, this.o.y - 16, this.z0 + 4]], 2, 2, 8)); }
  render() { if (this.g) this.g.position.set(this.o.x0 + (this.o.x1 - this.o.x0) * this.pos, this.o.y, this.z0); }
}

// ── Grabber / magnetic hand: rises, grabs a ball with its magnet, carries it along a route ──
// route: [[x,y,z]...] from the pickup point to the drop. drop: {x,y,lvl,vx,vy} or 'keep' (into a lock).
class Grabber extends Comp {
  constructor(T, o) {
    super(T, o);
    this.home = o.home || [o.x, o.y, 0]; this.route = spline(o.route || [[o.x, o.y, 30], [o.x, o.y + 40, 30]], 4);
    this.state = 'idle'; this.t = 0; this.ball = null; this.pos = V3(...this.home); this.curl = 0; this.rise = 0; this.s = 0;
    let L = 0; this.cum = [0]; for (let i = 1; i < this.route.length; i++) { L += Math.hypot(this.route[i][0] - this.route[i - 1][0], this.route[i][1] - this.route[i - 1][1], this.route[i][2] - this.route[i - 1][2]); this.cum.push(L); } this.L = L;
  }
  at(s) { const c = this.cum; let i = 1; while (i < c.length - 1 && c[i] < s) i++; const k = (s - c[i - 1]) / ((c[i] - c[i - 1]) || 1), a = this.route[i - 1], b = this.route[i]; return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]; }
  // take a ball (usually one a scoop/saucer is holding)
  grab(b) { if (this.state !== 'idle') return false; this.ball = b; this.world.hold(b, this, {}); this.state = 'rise'; this.t = 0; this.sfx(this.o.riseSound || 'lid', { vol: 0.8 }); this.emit('grab', b); return true; }
  stepHeld(b, dt) { if (this.state === 'carry' || this.state === 'drop') { b.x = this.pos.x; b.y = this.pos.y; b.z = Math.max(this.z0, this.pos.z - BR * 2 - 2); } }
  update(dt) {
    this.t += dt;
    const r0 = this.route[0];
    switch (this.state) {
      case 'idle': this.rise = Math.max(0, this.rise - dt * 1.5); this.curl = Math.max(0, this.curl - dt * 2); this.pos.set(this.home[0], this.home[1], this.home[2] + this.rise * (this.o.riseH || 50)); break;
      case 'rise': this.rise = Math.min(1, this.rise + dt * 1.6); this.pos.set(this.home[0] + (r0[0] - this.home[0]) * this.rise, this.home[1] + (r0[1] - this.home[1]) * this.rise, this.home[2] + this.rise * (this.o.riseH || 50));
        if (this.rise >= 1) { this.state = 'grip'; this.t = 0; this.sfx('magClick', { vol: 0.8 }); } break;
      case 'grip': this.curl = Math.min(1, this.t / 0.35); this.pos.z = r0[2] + BR * 2 + 2 - this.curl * 0; if (this.t > 0.45) { this.state = 'carry'; this.s = 0; this.sfx('creak', { vol: 0.5 }); } if (this.ball) { this.ball.x = r0[0]; this.ball.y = r0[1]; } break;
      case 'carry': this.s += (this.o.speed || 110) * dt; { const p = this.at(Math.min(this.s, this.L)); this.pos.set(p[0], p[1], p[2] + BR * 2 + 2); } if (this.s >= this.L) { this.state = 'drop'; this.t = 0; } break;
      case 'drop': this.curl = Math.max(0, 1 - this.t / 0.25); if (this.t > 0.3) { this.dropBall(); this.state = 'back'; this.t = 0; } break;
      case 'back': this.rise = Math.max(0, this.rise - dt * 1.2); if (this.rise <= 0) this.state = 'idle'; this.pos.lerp(V3(this.home[0], this.home[1], this.home[2]), Math.min(1, dt * 3)); break;
    }
  }
  dropBall() {
    const b = this.ball; this.ball = null; if (!b || b.removed) return;
    const d = this.o.drop;
    if (d === 'keep' || !d) { this.emit('grabDone', b); if (this.o.onDrop) this.o.onDrop(b); return; }
    this.world.release(b, d.x, d.y, d.vx || 0, d.vy || 0, d.lvl || this.lvl); this.emit('grabDone', b);
  }
  trigger() { const b = this.world.addBall(this.route[0][0], this.route[0][1], {}); this.grab(b); }
  mesh(RC) { if (this.o.model) { this.model = this.o.model(RC, this); RC.root.add(this.model); } }
  render(dt) { if (this.model && this.o.animate) this.o.animate(this.model, this, dt); else if (this.model) this.model.position.copy(this.pos); }
}

// ── Mouth toy: a head whose jaw opens to swallow the ball (closed: it's a target) ────
class MouthToy extends Comp {
  constructor(T, o) {
    super(T, o);
    const fa = deg(o.facing != null ? o.facing : 270), w = o.w || 40, sx = -Math.sin(fa), sy = Math.cos(fa);
    this.f = [Math.cos(fa), Math.sin(fa)];
    this.face = T.world.seg(o.x - sx * w / 2, o.y - sy * w / 2, o.x + sx * w / 2, o.y + sy * w / 2, { mat: 'toy', r: 4, lvl: this.lvl, owner: this, id: this.id });
    this.sens = T.world.sensor({ kind: 'circle', x: o.x + this.f[0] * 4, y: o.y + this.f[1] * 4, r: 14, lvl: this.lvl, owner: this, id: this.id, on: false });
    this.isOpen = false; this.jaw = 0; this.look = [0, 0]; this.balls = []; this.holdT = 0; this.last = -9;
  }
  open() { this.isOpen = true; this.face.on = false; this.sens.on = true; } close() { this.isOpen = false; this.face.on = true; this.sens.on = false; }
  onContact(b, c, imp) { if (imp < 80 || this.G.time - this.last < 0.3) return; this.last = this.G.time; this.sfx('plastic', { vol: 0.8 }); this.emit('mouthHit', b); }
  onSensor(b) { this.world.hide(b, this, {}); this.balls.push(b); this.holdT = this.o.hold || 1.5; this.sfx('scoop'); this.emit('mouth', b); }
  stepHeld() {}
  spit(speed = 1400) { const b = this.balls.shift(); if (!b) return; const a = Math.atan2(this.f[1], this.f[0]) + (Math.random() - 0.5) * 0.4; this.world.release(b, this.o.x + this.f[0] * 24, this.o.y + this.f[1] * 24, Math.cos(a) * speed, Math.sin(a) * speed, this.lvl); b.noCap[this.id] = this.world.time + 1; this.sfx('kick'); this.emit('mouthOut', b); }
  trigger() { this.open(); const b = this.world.addBall(this.o.x, this.o.y, {}); this.onSensor(b); }
  update(dt) {
    this.jaw += ((this.isOpen || this.balls.length ? 1 : 0) - this.jaw) * Math.min(1, dt * 6);
    if (this.balls.length && this.holdT > 0 && !this.o.manual) { this.holdT -= dt; if (this.holdT <= 0) this.spit(); }
    const b = this.world.balls.find(b => !b.hidden); if (b) { const dx = b.x - this.o.x, dy = b.y - this.o.y, l = Math.hypot(dx, dy) || 1; this.look = [dx / l, dy / l]; }
  }
  mesh(RC) { const m = (this.o.model || defaultHead)(RC, this); m.position.set(this.o.x, this.o.y, this.z0); m.rotation.z = Math.atan2(this.f[1], this.f[0]) - PI / 2; RC.root.add(m); this.m = m; }
  render() { if (this.m && this.m.userData.pose) this.m.userData.pose(this.jaw, this.look, this.G.time); }
}
function defaultHead(RC, toy) {
  const g = new THREE.Group(), skin = RC.mats.plastic(toy.o.skin || '#e8c8a8', { roughness: 0.5 });
  const head = new THREE.Mesh(new THREE.SphereGeometry(30, 24, 18), skin); head.scale.set(1, 0.9, 1.1); head.position.set(0, 10, 48); g.add(head);
  const jaw = new THREE.Mesh(new THREE.BoxGeometry(40, 30, 12), skin); const jp = new THREE.Group(); jp.position.set(0, 20, 26); jaw.position.set(0, -14, 0); jp.add(jaw); g.add(jp);
  const eyes = [-11, 11].map(x => { const e = new THREE.Mesh(new THREE.SphereGeometry(7, 16, 12), RC.mats.plastic('#fff')); e.position.set(x, -14, 58); g.add(e); const p = new THREE.Mesh(new THREE.SphereGeometry(3.4, 12, 8), RC.mats.plastic('#111')); e.add(p); p.position.set(0, -5.5, 0); return p; });
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  g.userData.pose = (k, look) => { jp.rotation.x = -k * 0.7; eyes.forEach(p => { p.position.x = look[0] * 3; p.position.z = look[1] * 2; }); };
  return g;
}

// ── Shaking toy: rocks and shudders when hit ─────────────────────────────────────
class ShakingToy extends Comp {
  constructor(T, o) {
    super(T, o);
    this.c = o.poly ? T.world.wall(o.poly.concat([o.poly[0]]), { mat: 'toy', r: 3, lvl: this.lvl, owner: this, id: this.id }) : [T.world.circ(o.x, o.y, o.r || 26, { mat: 'toy', lvl: this.lvl, owner: this, id: this.id })];
    this.wob = 0; this.ph = 0; this.last = -9;
  }
  onContact(b, c, imp) { if (imp < 100 || this.G.time - this.last < 0.2) return; this.last = this.G.time; this.wob = Math.min(1, this.wob + imp / 1500); this.sfx('plastic', { vol: 0.8 }); this.sfx('rubber', { vol: 0.4 }); this.emit('toy', b); }
  shake(k = 1) { this.wob = Math.max(this.wob, k); }
  trigger() { this.onContact(null, null, 1500); }
  update(dt) { this.wob *= Math.exp(-dt * 2.2); this.ph += dt * 22; }
  mesh(RC) { if (this.o.model) { this.m = this.o.model(RC, this); this.m.position.set(this.o.x, this.o.y, this.z0); RC.root.add(this.m); } }
  render() { if (this.m) { this.m.rotation.x = Math.sin(this.ph) * this.wob * 0.12; this.m.rotation.y = Math.sin(this.ph * 1.3 + 1) * this.wob * 0.1; } }
}

// ── Ferris wheel: a bucket at the bottom picks the ball up, dumps it at the top ──────
class FerrisWheel extends Comp {
  constructor(T, o) {
    super(T, o);
    this.r = o.r || 60; this.a = 0; this.w = o.speed || 1.2; this.n = o.buckets || 6; this.carry = [];
    this.sens = T.world.sensor({ kind: 'circle', x: o.entry[0], y: o.entry[1], r: 13, lvl: this.lvl, owner: this, id: this.id });
  }
  onSensor(b) { const k = Math.round(((PI * 1.5 - this.a) / TAU * this.n) % this.n + this.n) % this.n; this.world.hold(b, this, { k }); this.carry.push(b); this.sfx('clank'); this.emit('wheelIn', b); }
  bucketPos(k) { const a = this.a + k / this.n * TAU; return [this.o.x + Math.cos(a) * this.r * (this.o.plane === 'x' ? 1 : 0), this.o.y + (this.o.plane === 'x' ? 0 : Math.cos(a) * this.r), this.z0 + this.r + 10 + Math.sin(a) * this.r, a]; }
  stepHeld(b, dt, h) {
    const p = this.bucketPos(h.k); b.x = p[0]; b.y = p[1]; b.z = p[2] - BR;
    const top = ((p[3] % TAU) + TAU) % TAU; if (h.t > 0.6 && Math.abs(top - PI / 2) < 0.08) this.dump(b);
  }
  dump(b) { this.carry.splice(this.carry.indexOf(b), 1); const e = this.o.exit; this.world.airborne(b, e.x, e.y, e.z || 40, e.vx || 0, e.vy || 0, 0, e.lvl || this.lvl); this.sfx('clank', { vol: 0.8 }); this.emit('wheelOut', b); }
  step(dt) { this.a += this.w * dt; }
  trigger() { const b = this.world.addBall(this.o.entry[0], this.o.entry[1], {}); this.onSensor(b); }
  mesh(RC) {
    const g = grp(this.o.x, this.o.y, this.z0 + this.r + 10), wheel = new THREE.Group(); g.add(wheel);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(this.r, 2.5, 8, 48), RC.mats.chrome()); rim.rotation.y = PI / 2; wheel.add(rim);
    for (let i = 0; i < this.n; i++) {
      const a = i / this.n * TAU; const sp = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, this.r, 6), RC.mats.steel()); sp.position.set(0, Math.cos(a) * this.r / 2, Math.sin(a) * this.r / 2); sp.rotation.x = a - PI / 2 + PI / 2; wheel.add(sp);
      const bk = new THREE.Mesh(new THREE.CylinderGeometry(11, 9, 12, 14, 1, true), RC.mats.plastic(this.o.color || '#e33', { side: THREE.DoubleSide })); bk.position.set(0, Math.cos(a) * this.r, Math.sin(a) * this.r); bk.rotation.z = PI / 2; wheel.add(bk);
    }
    if (this.o.plane === 'x') g.rotation.z = PI / 2;
    [-1, 1].forEach(k => { const leg = new THREE.Mesh(new THREE.CylinderGeometry(2, 3, this.r + 14, 8), RC.mats.steel()); leg.position.set(k * 8, 0, -(this.r + 10) / 2); leg.rotation.x = PI / 2; g.add(leg); });
    RC.root.add(g); this.wheel = wheel;
  }
  render() { if (this.wheel) this.wheel.rotation.x = this.a; }
}

// ── Gumball machine: a clear globe that stores balls and dispenses them ───────────────
class GumballMachine extends Comp {
  constructor(T, o) { super(T, o); this.balls = []; this.turn = 0; }
  receive(b) { this.world.hide(b, this, {}); b.locked = true; this.balls.push(b); this.G.lockBall(b); this.sfx('clank'); this.emit('gumballIn', b, { n: this.balls.length }); }
  stepHeld() {}
  dispense() {
    const b = this.balls.shift(); if (!b) return false; b.locked = false; this.turn = 1;
    const e = this.o.exit; this.G.later(0.5, () => { if (b.removed) return; this.world.release(b, e.x, e.y, e.vx || 0, e.vy || 0, e.lvl || this.lvl); this.sfx('kick'); this.emit('gumballOut', b); });
    this.sfx('motorRun', { vol: 0.6 }); return true;
  }
  trigger() { const b = this.world.addBall(this.o.x, this.o.y, {}); this.receive(b); }
  update(dt) { this.turn = Math.max(0, this.turn - dt * 1.5); }
  mesh(RC) {
    const g = grp(this.o.x, this.o.y, this.z0);
    const base = new THREE.Mesh(latheGeo(0, 0, [[0, 0], [26, 0], [24, 20], [18, 34], [0, 34]], 24), RC.mats.plastic(this.o.color || '#c22')); g.add(base);
    const globe = new THREE.Mesh(new THREE.SphereGeometry(32, 32, 24), RC.mats.clear('#ffffff', 0.18, { depthWrite: false })); globe.position.z = 62; globe.renderOrder = 3; g.add(globe);
    this.inner = []; for (let i = 0; i < 6; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(BR, 16, 12), RC.mats.ball()); g.add(m); this.inner.push(m); }
    const knob = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 6, 16), RC.mats.chrome()); knob.rotation.x = PI / 2; knob.position.set(0, -24, 20); g.add(knob); this.knob = knob;
    RC.root.add(g); g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  }
  render() {
    if (!this.inner) return;
    this.inner.forEach((m, i) => { m.visible = i < this.balls.length; const a = i * 2.1 + Math.sin(this.G.time * 3 + i) * 0.05 * (1 + this.turn * 6); m.position.set(Math.cos(a) * 14 * (i % 3) / 2, Math.sin(a) * 14 * (i % 3) / 2, 44 + Math.floor(i / 3) * 24); });
    this.knob.rotation.y += this.turn * 0.3;
  }
}

// ── Spinning disc (motor disc under the surface) and fan ─────────────────────────────
class SpinningDisc extends Comp {
  constructor(T, o) {
    super(T, o);
    this.r = o.r || 50; this.w = o.speed != null ? o.speed : 8; this.a = 0; this.on = o.on !== false;
    T.world.field({ x: o.x, y: o.y, r: this.r, lvl: this.lvl, fn: (b, dt) => this.drag(b, dt) });
    T.hole && 0;
  }
  drag(b, dt) {
    if (!this.on) return;
    const dx = b.x - this.o.x, dy = b.y - this.o.y; if (dx * dx + dy * dy > this.r * this.r) return;
    const svx = -this.w * dy, svy = this.w * dx, k = 1 - Math.exp(-dt * (this.o.grip || 5));
    b.vx += (svx - b.vx) * k; b.vy += (svy - b.vy) * k;
  }
  step(dt) { if (this.on) this.a += this.w * dt; }
  trigger() { this.on = !this.on; }
  mesh(RC) {
    const tex = decalTex(RC, 256, 256, (g, w, h) => { g.fillStyle = this.o.color || '#c8c8d0'; g.beginPath(); g.arc(w / 2, h / 2, w / 2, 0, TAU); g.fill(); if (this.o.art) this.o.art(g, w, h); else { g.strokeStyle = 'rgba(0,0,0,.4)'; g.lineWidth = 8; for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(w / 2, h / 2); g.arc(w / 2, h / 2, w / 2 - 6, i * PI / 3, i * PI / 3 + 0.4); g.stroke(); } } });
    const m = new THREE.Mesh(new THREE.CircleGeometry(this.r, 40), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.3, metalness: 0.6, transparent: true }));
    m.position.set(this.o.x, this.o.y, this.z0 + 0.25); m.receiveShadow = true; RC.root.add(m); this.m = m;
  }
  render() { if (this.m) this.m.rotation.z = this.a; }
}
class Fan extends Comp {
  constructor(T, o) {
    super(T, o);
    this.r = o.r || 160; this.on = !!o.on; this.a = 0; this.spd = 0; const d = deg(o.dir != null ? o.dir : 270); this.d = [Math.cos(d), Math.sin(d)];
    T.world.field({ x: o.x, y: o.y, r: this.r, lvl: this.lvl, fn: (b, dt) => this.push(b, dt) });
  }
  push(b, dt) {
    if (this.spd < 0.1) return;
    const dx = b.x - this.o.x, dy = b.y - this.o.y, d = Math.hypot(dx, dy); if (d > this.r || d < 1) return;
    const along = (dx * this.d[0] + dy * this.d[1]) / d; if (along < 0.6) return;
    const f = (this.o.strength || 900) * this.spd * (1 - d / this.r) * along; b.vx += this.d[0] * f * dt; b.vy += this.d[1] * f * dt;
  }
  start() { this.on = true; } stop() { this.on = false; }
  trigger() { this.on = !this.on; }
  update(dt) { this.spd += ((this.on ? 1 : 0) - this.spd) * Math.min(1, dt * 1.5); this.a += this.spd * dt * 40; }
  mesh(RC) {
    const g = grp(this.o.x, this.o.y, this.z0); const blades = new THREE.Group(); blades.position.z = 50; g.add(blades);
    for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(5, 28, 1.5), RC.mats.plastic(this.o.color || '#ddd')); b.position.y = 14; const p = new THREE.Group(); p.rotation.z = i * PI / 2; p.add(b); blades.add(p); }
    const post = new THREE.Mesh(cylGeo(0, 0, 4, 0, 50, 10), RC.mats.steel()); g.add(post);
    const cage = new THREE.Mesh(new THREE.TorusGeometry(31, 1.2, 6, 32), RC.mats.chrome()); cage.position.z = 50; g.add(cage);
    g.rotation.z = Math.atan2(this.d[1], this.d[0]) - PI / 2; blades.rotation.x = PI / 2; cage.rotation.x = PI / 2;
    RC.root.add(g); this.blades = blades;
  }
  render() { if (this.blades) this.blades.rotation.y = this.a; }
}

// ── Crumbling toy (castle / temple): stages of hits, then it collapses and opens up ───
class CrumblingToy extends Comp {
  constructor(T, o) {
    super(T, o);
    const w = o.w || 60, fa = deg(o.facing != null ? o.facing : 270), sx = -Math.sin(fa), sy = Math.cos(fa);
    this.face = T.world.seg(o.x - sx * w / 2, o.y - sy * w / 2, o.x + sx * w / 2, o.y + sy * w / 2, { mat: 'toy', r: 5, lvl: this.lvl, owner: this, id: this.id });
    this.hp = (o.hits || [3, 3, 3]).slice(); this.stage = 0; this.hitsIn = 0; this.last = -9; this.fall = 0; this.wob = 0;
  }
  onContact(b, c, imp) {
    if (imp < 120 || this.G.time - this.last < 0.25 || this.stage >= this.hp.length) return; this.last = this.G.time;
    this.hitsIn++; this.wob = 1; this.sfx('wood', { vol: 0.9, rate: 0.7 }); this.G.shake(0.3); this.emit('toyHit', b, { stage: this.stage });
    if (this.hitsIn >= this.hp[this.stage]) { this.stage++; this.hitsIn = 0; this.sfx('clank'); this.emit('toyStage', b, { stage: this.stage });
      if (this.stage >= this.hp.length) { this.face.on = false; this.sfx('thunder', { vol: 0.6, rate: 1.4 }); this.G.shake(1.2); this.emit('toyCollapse', b); } }
  }
  reset() { this.stage = 0; this.hitsIn = 0; this.face.on = true; }
  trigger() { this.onContact(null, null, 1500); }
  update(dt) { this.fall += ((this.stage >= this.hp.length ? 1 : 0) - this.fall) * Math.min(1, dt * 2); this.wob *= Math.exp(-dt * 4); }
  mesh(RC) { this.m = (this.o.model || defaultCastle)(RC, this); this.m.position.set(this.o.x, this.o.y, this.z0); RC.root.add(this.m); }
  render() { if (this.m && this.m.userData.pose) this.m.userData.pose(this.stage, this.fall, this.wob, this.G.time); }
}
function defaultCastle(RC, toy) {
  const g = new THREE.Group(), stone = RC.mats.paint(toy.o.color || '#9a9488', { roughness: 0.85 }), pieces = [];
  const add = (geo, x, y, z) => { const m = new THREE.Mesh(geo, stone); m.position.set(x, y, z); m.castShadow = true; g.add(m); pieces.push({ m, z, r: Math.random() - 0.5 }); return m; };
  add(new THREE.BoxGeometry(60, 20, 40), 0, 10, 20); [-30, 30].forEach(x => add(new THREE.CylinderGeometry(11, 12, 60, 12).rotateX(PI / 2), x, 10, 30));
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(26, 30, 3), RC.mats.wood('#6b4a2a')); const bp = new THREE.Group(); bp.position.set(0, -1, 2); bridge.position.set(0, 0, 15); bp.add(bridge); g.add(bp);
  g.userData.pose = (stage, fall, wob, t) => { bp.rotation.x = Math.min(stage, 1) * -1.35; pieces.forEach((p, i) => { p.m.position.z = p.z - fall * (p.z + 10); p.m.rotation.x = fall * p.r; p.m.rotation.y = Math.sin(t * 30 + i) * wob * 0.03; }); };
  return g;
}

// ── Pop-up targets: rise out of the playfield ──────────────────────────────────────
class PopUpTargets extends Comp {
  constructor(T, o) {
    super(T, o);
    this.ts = (o.targets || []).map((t, i) => {
      const fa = deg(t.angle != null ? t.angle : 270), w = t.w || 22, sx = -Math.sin(fa), sy = Math.cos(fa);
      const c = T.world.seg(t.x - sx * w / 2, t.y - sy * w / 2, t.x + sx * w / 2, t.y + sy * w / 2, { mat: 'target', r: 3, lvl: this.lvl, owner: this, id: this.id + i, on: false });
      T.art(P => { const g = P.ctx; g.save(); g.translate(t.x, t.y); g.rotate(fa + PI / 2); g.fillStyle = 'rgba(5,4,6,.9)'; g.fillRect(-w / 2 - 1, -4, w + 2, 8); g.restore(); }, 'over');
      return { i, c, x: t.x, y: t.y, fa, w, up: false, h: 0 };
    });
  }
  up(i) { (i == null ? this.ts : [this.ts[i]]).forEach(t => { if (!t) return; const blocked = this.world.balls.some(b => b.mode === 'free' && Math.hypot(b.x - t.x, b.y - t.y) < t.w / 2 + BR); if (blocked) return; t.up = true; t.c.on = true; }); this.sfx('dropReset', { vol: 0.6 }); }
  down(i) { (i == null ? this.ts : [this.ts[i]]).forEach(t => { if (!t) return; t.up = false; t.c.on = false; }); }
  onContact(b, c, imp) { const t = this.ts.find(t => t.c === c); if (!t || imp < 50) return; t.up = false; t.c.on = false; this.sfx('drop'); this.emit('popupHit', b, { i: t.i }); }
  trigger() { this.up(); }
  mesh(RC) { this.ms = this.ts.map(t => { const m = new THREE.Mesh(new THREE.BoxGeometry(t.w - 1, 5, 28), RC.mats.plastic(this.o.color || '#7c4')); m.rotation.z = t.fa + PI / 2; m.position.set(t.x, t.y, this.z0 - 14); m.castShadow = true; RC.root.add(m); return m; }); }
  render(dt) { if (!this.ms) return; this.ts.forEach((t, i) => { t.h += ((t.up ? 1 : 0) - t.h) * Math.min(1, dt * 14); this.ms[i].position.z = this.z0 - 15 + t.h * 29; this.ms[i].visible = t.h > 0.03; }); }
}

// ── Powerfield: a mini-field where the flipper buttons fire magnets to fling the ball up ──
class Powerfield extends Comp {
  constructor(T, o) {
    super(T, o);
    this.lv = T.level(o.lvlId || this.id || 'pf', { z: o.z || 60, bounds: o.box, noDrain: true });
    this.lvl = this.lv.id; this.z0 = this.lv.z;
    const [x0, y0, x1, y1] = o.box; this.box = o.box;
    T.wall([[x0, y0], [x0, y1], [x1, y1], [x1, y0]], { style: 'plastic', lvl: this.lvl, r: 3, h: 30 });
    this.mags = (o.magnets || [[x0 + 18, (y0 + y1) / 2, 'L'], [x1 - 18, (y0 + y1) / 2 + 30, 'R']]).map(m => ({ x: m[0], y: m[1], side: m[2], glow: 0 }));
    this.top = T.world.sensor({ kind: 'line', x1: x0, y1: y1 - 16, x2: x1, y2: y1 - 16, dir: [0, 1], lvl: this.lvl, owner: this, id: this.id + 'Top' });
    this.bottom = T.world.sensor({ kind: 'line', x1: x0, y1: y0 + 6, x2: x1, y2: y0 + 6, dir: [0, -1], lvl: this.lvl, owner: this, id: this.id + 'Out' });
  }
  receive(b) { this.world.place(b, (this.box[0] + this.box[2]) / 2, this.box[1] + 20, this.lvl, 0, 300); this.emit('powerfieldIn', b); }
  onFlip(side, on) {
    if (!on) return;
    for (const m of this.mags) if (m.side === side) {
      m.glow = 1; this.sfx('magClick');
      for (const b of this.world.balls) if (b.lvl === this.lvl && b.mode === 'free' && !b.power) { const dx = m.x - b.x, dy = m.y - b.y, d = Math.hypot(dx, dy); if (d < 70) { b.vx += dx / d * 500; b.vy += 900 + Math.random() * 300; } }
    }
  }
  onSensor(b, s) {
    if (s === this.top) { this.emit('powerfield', b); const to = this.o.win; if (to && to.comp) { const c = this.G.comps[to.comp]; if (c) return c.receive(b); } if (to) this.world.release(b, to.x, to.y, to.vx || 0, to.vy || 0, to.lvl || 'main'); }
    else { this.emit('powerfieldLose', b); const to = this.o.lose || { x: 60, y: 300, lvl: 'main' }; this.world.airborne(b, to.x, to.y, this.z0, to.vx || 0, to.vy || -100, 0, to.lvl || 'main'); }
  }
  trigger() { const b = this.world.addBall(this.box[0] + 30, this.box[1] + 30, { lvl: this.lvl }); this.receive(b); }
  update(dt) { this.mags.forEach(m => m.glow = Math.max(0, m.glow - dt * 3)); }
  mesh(RC) {
    const [x0, y0, x1, y1] = this.box;
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, y1 - y0), RC.mats.paint(this.o.floor || '#101828', { roughness: 0.3, metalness: 0.2 })); floor.position.set((x0 + x1) / 2, (y0 + y1) / 2, this.z0); floor.receiveShadow = true; RC.root.add(floor);
    RC.batch.add(RC.mats.wood(RC.theme.wood), slabGeo([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], this.z0 - 8, 8));
    this.mm = this.mags.map(m => { const c = new THREE.Mesh(cylGeo(m.x, m.y, 9, this.z0, this.z0 + 0.6, 20), RC.mats.emissive(this.o.color || '#60c0ff', 0.3)); RC.root.add(c); return c; });
  }
  render() { if (this.mm) this.mm.forEach((c, i) => c.material.emissiveIntensity = 0.3 + this.mags[i].glow * 5); }
}

// ── Supercharger: a loop with three magnets that speed the ball up every lap ─────────
class Supercharger extends Comp {
  constructor(T, o) {
    super(T, o);
    const pts = spline(o.pts, 6, false); this.pts = pts; this.laps = o.laps || 3; this.boost = o.boost || 600;
    const self = this;
    this.path = T.world.path({
      pts, style: o.style || 'wire', fric: 35, exitLvl: o.exitLvl || 'main',
      accel(P) { const f = P.s / P.p.L; for (const m of self.mags) if (Math.abs(f - m.at) < 0.02) { if (!P['m' + m.i + '_' + P.lap]) { P['m' + m.i + '_' + P.lap] = 1; P.u += self.boost * (P.lap + 1) / self.laps; m.glow = 1; self.sfx('magClick', { vol: 0.6 }); } } return 0; },
      onExit(b, u, e, w) { const P = b.path; P.lap = (P.lap || 0) + 1; self.emit('superLap', b, { lap: P.lap, speed: u }); if (P.lap < self.laps) { P.s -= P.p.L * (o.loopBack || 1); return; } self.emit('supercharger', b, { speed: u }); const L = w.L_(o.exitLvl || 'main'); w.airborne(b, e[0], e[1], Math.max(e[2], L.z), e[3] * u, e[4] * u, 0, L.id); b.noPath = 0.4; },
      onFail(b, u, e, w) { w.place(b, e[0], e[1], o.lvl || 'main', -e[3] * u, -e[4] * u); b.noPath = 0.4; }
    });
    this.mags = (o.magnets || [0.25, 0.5, 0.75]).map((at, i) => ({ at, i, glow: 0 }));
    const t0 = norm2(pts[3][0] - pts[0][0], pts[3][1] - pts[0][1]), n0 = [-t0[1], t0[0]]; this.t0 = t0;
    this.sens = T.world.sensor({ kind: 'line', x1: pts[0][0] + n0[0] * 18, y1: pts[0][1] + n0[1] * 18, x2: pts[0][0] - n0[0] * 18, y2: pts[0][1] - n0[1] * 18, dir: t0, lvl: this.lvl, owner: this, id: this.id });
  }
  onSensor(b) { if (b.noPath > 0) return; const u = b.vx * this.t0[0] + b.vy * this.t0[1]; if (u < 150) return; this.world.enterPath(b, this.path, u); b.path.lap = 0; this.emit('rampEnter', b); }
  trigger() { const b = this.world.addBall(this.pts[0][0], this.pts[0][1], {}); this.world.enterPath(b, this.path, 2000); b.path.lap = 0; }
  update(dt) { this.mags.forEach(m => m.glow = Math.max(0, m.glow - dt * 3)); }
  mesh(RC) {
    drawPath(RC, this.pts, this.o.style || 'wire', this.o);
    const w = this.world;
    this.mm = this.mags.map(m => { const p = w.pathAt(this.path, this.path.L * m.at); const c = new THREE.Mesh(new THREE.CylinderGeometry(9, 9, 16, 16), new THREE.MeshStandardMaterial({ color: '#b86b3a', metalness: 1, roughness: 0.35, emissive: this.o.color || '#ff7030', emissiveIntensity: 0 })); c.rotation.x = PI / 2; c.position.set(p[0], p[1], p[2] - 10); RC.root.add(c); return c; });
  }
  render() { if (this.mm) this.mm.forEach((c, i) => c.material.emissiveIntensity = this.mags[i].glow * 4); }
}

// ── Hologram: a translucent animated character projected over the playfield ──────────
// draw(ctx, w, h, t, holo) paints a frame; path(t) -> [x, y, z]; hit: radius (a ball passing through scores)
class Hologram extends Comp {
  constructor(T, o) { super(T, o); this.size = o.size || [90, 110]; this.p = [o.x || 260, o.y || 600, o.z || 60]; this.vis = o.visible !== false ? 1 : 0; this.want = this.vis; this.last = -9; this.flare = 0; }
  show() { this.want = 1; } hide() { this.want = 0; }
  update(dt) {
    if (this.o.path) this.p = this.o.path(this.G.time, this);
    this.vis += (this.want - this.vis) * Math.min(1, dt * 2); this.flare = Math.max(0, this.flare - dt * 2);
    if (this.o.hit && this.vis > 0.5 && this.G.time - this.last > 1.2) for (const b of this.world.balls) if (b.mode === 'free' && !b.hidden && Math.hypot(b.x - this.p[0], b.y - this.p[1]) < this.o.hit) { this.last = this.G.time; this.flare = 1; this.emit('holoHit', b); break; }
  }
  trigger() { this.flare = 1; this.emit('holoHit', null); }
  mesh(RC) {
    const c = canvas(256, 320); this.c = c; this.g = c.getContext('2d'); this.t = RC.tex(c);
    this.mat = new THREE.MeshBasicMaterial({ map: this.t, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, side: THREE.DoubleSide });
    this.m = new THREE.Mesh(new THREE.PlaneGeometry(this.size[0], this.size[1]), this.mat); this.m.renderOrder = 9; RC.root.add(this.m);
    this.fr = 0;
  }
  render(dt, RC) {
    if (!this.m) return;
    this.m.visible = this.vis > 0.02;
    if (!this.m.visible) return;
    this.m.position.set(this.p[0], this.p[1], this.p[2] + this.size[1] * 0.45);
    // a Pepper's ghost faces the viewer whichever way the camera looks (in table space: undo the table's rotation)
    this.m.quaternion.copy(RC.root.quaternion).invert().multiply(RC.camera.quaternion);
    this.fr += dt; if (this.fr > 1 / 30) { this.fr = 0; const g = this.g, w = 256, h = 320; g.clearRect(0, 0, w, h); this.o.draw(g, w, h, this.G.time, this);
      // scanlines and flicker
      g.globalCompositeOperation = 'destination-out'; g.fillStyle = 'rgba(0,0,0,.35)'; for (let y = (this.G.time * 60 | 0) % 4; y < h; y += 4) g.fillRect(0, y, w, 1.5); g.globalCompositeOperation = 'source-over';
      this.t.needsUpdate = true; }
    this.mat.opacity = this.vis * (0.75 + 0.25 * Math.sin(this.G.time * 23) * Math.sin(this.G.time * 7)) + this.flare * 0.5;
  }
}

// ── Score motor and chimes (electro-mechanical heritage) ─────────────────────────────
// comp.score(points): 10s, 100s and 1000s are paid out one chime at a time with the motor running.
class ScoreMotor extends Comp {
  constructor(T, o) { super(T, o); this.q = []; this.t = 0; }
  score(pts) {
    let n1000 = Math.floor(pts / 1000), n100 = Math.floor((pts % 1000) / 100), n10 = Math.floor((pts % 100) / 10);
    const steps = []; for (let i = 0; i < Math.min(n1000, 5); i++) steps.push([1000, 'chime3']); if (n1000 > 5) steps.push([(n1000 - 5) * 1000, 'chime3']);
    for (let i = 0; i < n100; i++) steps.push([100, 'chime2']); for (let i = 0; i < n10; i++) steps.push([10, 'chime1']);
    this.q.push(...steps); if (steps.length > 1) this.sfx('motorRun', { vol: 0.35 });
  }
  trigger() { this.score(1230); }
  update(dt) { if (!this.q.length) return; this.t -= dt; if (this.t > 0) return; this.t = 0.11; const [p, s] = this.q.shift(); this.G.add(p, { raw: true }); this.sfx(s, { vol: 0.5, vary: 0 }); this.sfx('motor', { vol: 0.25 }); }
}

// ── Shooter lane + plunger (manual pull, auto-plunger for multiball and saves) ─────────
class Plunger extends Comp {
  constructor(T, o) {
    super(T, o);
    this.x = o.x; this.y = o.y; this.rest = [o.x, o.y]; this.queue = []; this.p = 0; this.shown = 0; this.fireT = 0; this.autoT = 0;
    this.tip = T.world.seg(o.x - 13, o.y - BR - 2, o.x + 13, o.y - BR - 2, { mat: 'metal', r: 2, dynamic: true, id: 'plunger' });
    T.G.plunger = this;
  }
  load(o = {}) { this.queue.push(o); return null; }
  holds(b) { return b && Math.abs(b.x - this.x) < 14 && b.y < this.y + 16 && b.y > this.y - 44; }
  ballAt() { return this.world.balls.find(b => b.mode === 'free' && b.lvl === 'main' && this.holds(b)); }
  pullTo(p) { this.p = p; }
  fire(p) {
    const b = this.ballAt(); this.fireT = 0.12; this.shown = 0;
    // the rod snaps to rest faster than the ball leaves: at a deep pull the ball sits below the rest position,
    // so the tip is out of play for the fire window (otherwise it lands on the ball and shoves it back down)
    this.tip.on = false;
    this.sfx('launch', { vol: 0.5 + 0.5 * p });
    if (!b) return false;
    b.vy = (this.o.min || 900) + p * ((this.o.max || 4300) - (this.o.min || 900)); b.vx = 0; b.stillT = 0;
    return true;
  }
  update(dt) {
    const G = this.G;
    if (this.fireT > 0) { this.fireT -= dt; if (this.fireT <= 0) this.tip.on = true; }
    this.shown += (this.p - this.shown) * Math.min(1, dt * 20);
    if (this.queue.length && !this.ballAt() && G.state !== 'over' && G.state !== 'bonus') {
      const o = this.queue.shift();
      const b = this.world.addBall(this.x, this.y, { power: o.power }); b.vy = 0;
      this.sfx('trough', { vol: 0.5 });
      if (o.auto) this.autoT = 0.6; else { G.waitPlunge = true; G.pull = 0; G.call('serve'); }
    }
    if (this.autoT > 0) { this.autoT -= dt; if (this.autoT <= 0) { if (G.waitPlunge) G.launch(0.86 + Math.random() * 0.08); else this.fire(0.86 + Math.random() * 0.08); } }
    // a ball that rolled back down the lane waits for the player (or the auto plunger)
    const b = this.ballAt();
    if (b && !G.waitPlunge && this.autoT <= 0 && Math.abs(b.vy) < 40 && (G.state === 'play' || G.state === 'serve') && b.born < this.world.time - 0.3 && this.fireT <= 0) {
      b._rest = (b._rest || 0) + dt;
      if (b._rest > 0.4) { b._rest = 0; if (G.activeBalls() <= 1 && !G.mb) { G.waitPlunge = true; G.pull = 0; } else this.autoT = 0.5; }
    }
  }
  step(dt) {
    // the plunger tip follows the pull (springs back fast)
    const y = this.y - BR - 2 - this.shown * 30;
    this.world.moveSeg(this.tip, this.x - 13, y, this.x + 13, y, 0);
  }
  mesh(RC) {
    const g = grp(this.x, 0, this.z0 + BR);
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 140, 12), RC.mats.chrome()); rod.position.y = this.y - BR - 2 - 70; g.add(rod);
    const tipM = new THREE.Mesh(new THREE.CylinderGeometry(7, 7, 8, 16), RC.mats.rubber('#222')); tipM.position.y = this.y - BR - 6; g.add(tipM);
    const spring = []; for (let i = 0; i <= 60; i++) { const a = i * 0.9; spring.push([Math.cos(a) * 7, this.y - BR - 12 - i * 0.9, Math.sin(a) * 7]); }
    this.spr = new THREE.Mesh(tubeGeo(spring, 0.8, 120, 5), RC.mats.steel()); g.add(this.spr);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(10, 16, 12), RC.mats.plastic(RC.theme.knob || '#d8d0c0')); knob.position.y = -60; g.add(knob); this.knob = knob;
    RC.root.add(g); this.g = g; this.g.children.forEach(m => m.castShadow = true);
  }
  render() { if (!this.g) return; const k = this.shown * 30 - (this.fireT > 0 ? -6 : 0); this.g.position.y = -k; this.spr.scale.y = 1; }
}

// ── Helpers that build the standard lower playfield and the top arch ────────────────────
// Standard lower third: flippers, slingshots, inlanes, outlanes, their switches.
export function lower(T, o = {}) {
  // flipper tips at rest sit a little over one ball width apart (31 mm): wider and a ball that rolls off a
  // slingshot goes straight down the middle; this was 44 mm and every third plunge drained unaided
  const cx = o.cx || 243, fy = o.flipY || 165, dx = o.flipDx || 86.5, side = o.side || 'both';
  const out = { flippers: {}, slings: {}, lanes: {} };
  const mir = (p, s) => s === 'L' ? p : [2 * cx - p[0], p[1]];
  for (const s of ['L', 'R']) {
    out.flippers[s] = T.flipper({ x: cx + (s === 'L' ? -dx : dx), y: fy, side: s, len: o.flipLen || 82, color: o.flipColor, rubber: o.flipRubber, id: 'flip' + s });
    const top = o.slingTop || 316, bot = o.slingBot || 250, inner = o.slingInner || [140, 232], lx = o.slingX || 88;
    out.slings[s] = T.slingshot({ side: s, id: 'sling' + s, posts: [mir([lx, top], s), mir([lx, bot], s), mir(inner, s)], color: o.slingColor, art: o.slingArt, plastic: o.slingPlastic });
    const sep = o.sepX || 44, gTop = o.sepTop || 330, gEnd = o.guideEnd || [144, 183];
    T.wall([mir([sep, gTop], s), mir([sep, 216], s), mir(gEnd, s)], { style: o.guideStyle || 'metal', h: 22 });
    T.post(...mir([sep, gTop + 2], s), { style: 'rubber', r: 5 });
    // outer wall down to the drain
    // inlane / outlane switches
    out.lanes['out' + s] = T.rolloverLane({ x: mir([(o.wallX || 8) / 2 + sep / 2 + 2, 290], s)[0], y: 290, id: 'out' + s, color: o.outColor || '#ff5a4a', lampDy: -34, shape: 'triangle', lampR: 7 });
    out.lanes['in' + s] = T.rolloverLane({ x: mir([(sep + lx) / 2, 288], s)[0], y: 288, id: 'in' + s, color: o.inColor || '#ffd27a', lampDy: -34, shape: 'triangle', lampR: 7 });
  }
  // bonus multiplier and shoot-again inserts
  if (o.inserts !== false) {
    [2, 3, 4, 5].forEach((n, i) => T.insert('_bx' + n, cx - 54 + i * 36, (o.bxY || 300) + (i === 1 || i === 2 ? 8 : 0), { shape: 'circle', r: 9, color: o.bxColor || '#ffc83d', text: n + 'X', size: 8 }));
    T.insert('_save', cx, o.saveY || 238, { shape: 'shield', w: 34, h: 26, color: o.saveColor || '#ff4058', text: 'SHOOT', size: 6.5, ty: 4 });
    T.insert('_extra', cx, o.extraY || 268, { shape: 'oval', w: 30, h: 16, color: o.extraColor || '#ff9a40', text: 'EXTRA', size: 6.5 });
  }
  return out;
}
// Shooter lane and top arch: the plunged ball runs up the right and round the top.
export function shooter(T, o = {}) {
  const W = T.W, L = T.L, sepX = o.sepX || 480, laneX = o.laneX || 497;
  const ac = o.arch || [260, L - 258, 258], top = o.top || ac[1] - 10;
  T.lane = { x0: sepX - 2, x1: W - 6 };
  T.wall([[sepX, 40], [sepX, top]], { style: 'wood', r: 2, h: 34 });
  T.post(sepX, top, { style: 'metal', r: 3 });
  T.plunger({ x: laneX, y: o.restY || 120, min: o.min, max: o.max });
  // the arch from the lane round the top to the left wall
  const arch = T.arcPts(ac[0], ac[1], ac[2], 0, 180, 36);
  const right = [[W - 2, 20], [W - 2, ac[1]]], left = [[2, ac[1]], [2, o.leftBottom || 20]];
  T.wall(right.concat(arch).concat(left), { style: 'wood', r: 6, h: 40 });
  if (o.gate !== false) T.gate({ id: 'laneGate', line: [sepX + 3, top - 2, W - 8, top + 22], dir: [0, 1] });
  return { arch: ac };
}

export const COMPONENTS = {
  flipper: Flipper, popBumper: PopBumper, slingshot: Slingshot, dropTargetBank: DropTargetBank, standupTarget: StandupTarget,
  rolloverLane: RolloverLane, spinner: Spinner, scoop: Scoop, vuk: VUK, kickback: Kickback, magnet: Magnet, magnaSave: MagnaSave,
  ringCatch: RingCatch, mistMagnet: MistMagnet, ramp: Ramp, orbit: Orbit, gate: Gate, diverter: Diverter, subway: Subway,
  ballLock: BallLock, trapDoor: TrapDoor, miniField: MiniField, elevator: Elevator, tiltingMiniField: TiltingMiniField,
  cannon: Cannon, movingLauncher: MovingLauncher, grabber: Grabber, mouthToy: MouthToy, shakingToy: ShakingToy,
  ferrisWheel: FerrisWheel, gumballMachine: GumballMachine, spinningDisc: SpinningDisc, fan: Fan, crumblingToy: CrumblingToy,
  popUpTargets: PopUpTargets, powerfield: Powerfield, supercharger: Supercharger, hologram: Hologram, scoreMotor: ScoreMotor,
  plunger: Plunger
};
export { drawPath, Comp, mergeGeo };
