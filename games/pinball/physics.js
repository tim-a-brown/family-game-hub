// ═══════════════════════════════════════════════════════════════════════════
// Pinball physics (no three.js, no DOM): runs headless for long simulations.
//
// Table space: millimetres. x across the playfield (0 = left wall), y up the
// table (0 = the bottom edge under the apron), z height above the playfield.
// The playfield is tilted 6.5 degrees. A steel ball (27 mm, 80 g) ROLLING on
// it accelerates down the table at 5/7 x g x sin(6.5) = 0.79 m/s2 (the rest
// of gravity's pull spins the ball up). Speeds are mm/s.
//
// The world is a set of LEVELS (main playfield, upper mini-playfields, a
// basement), each a flat 2D field at its own height with its own colliders,
// sensors and force fields. Balls are 'free' on a level, ride a 3D PATH (ramp,
// wireform, tube), fly through the 'air' (falls between levels, ramp drops),
// are 'held' by a component (scoop, magnet, grabber, cannon...) or 'hidden'
// (subway, lock, trough).
// ═══════════════════════════════════════════════════════════════════════════

export const BR = 13.5;                               // ball radius (27 mm ball)
export const TILT = 6.5 * Math.PI / 180;
export const GW = 9810;                               // g, mm/s2
export const G_ALONG = GW * Math.sin(TILT);           // 1111 mm/s2 along the playfield
export const G_NORMAL = GW * Math.cos(TILT);          // into the playfield
export const ROLLK = 5 / 7;                           // rolling solid sphere
export const G_ROLL = ROLLK * G_ALONG;                // 794 mm/s2: what a rolling ball feels
export const ROLL_FRIC = 23;                          // rolling resistance, mm/s2
export const DT = 1 / 1000;                           // fixed physics step
export const VMAX = 6000;                             // speed cap: 6 mm per step, under half the radius
const CELL = 48;
const PI = Math.PI, TAU = PI * 2;

// Contact materials. e: restitution, mu: Coulomb friction, snd: sound family.
export const MAT = {
  rubber:  { e: 0.66, mu: 0.25, snd: 'rubber' },
  sling:   { e: 0.62, mu: 0.25, snd: 'rubber' },
  metal:   { e: 0.45, mu: 0.10, snd: 'metal' },
  wood:    { e: 0.50, mu: 0.12, snd: 'wood' },
  plastic: { e: 0.50, mu: 0.12, snd: 'plastic' },
  flipper: { e: 0.30, mu: 0.22, snd: 'flipper' },
  bumper:  { e: 0.40, mu: 0.10, snd: 'bumper' },
  target:  { e: 0.32, mu: 0.15, snd: 'target' },
  toy:     { e: 0.45, mu: 0.12, snd: 'plastic' },
  ball:    { e: 0.90, mu: 0.05, snd: 'ball' },
  none:    { e: 0.30, mu: 0.10, snd: '' }
};
function matOf(m) { return typeof m === 'string' ? (MAT[m] || MAT.metal) : (m || MAT.metal); }
export const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

// ── Levels ────────────────────────────────────────────────────────────────
class Level {
  constructor(id, z, o = {}) {
    this.id = id; this.z = z;
    this.gx = 0; this.gy = -G_ROLL;      // in-plane gravity (a tilting mini-field changes these)
    this.cols = []; this.dyn = []; this.sensors = []; this.fields = []; this.flips = [];
    this.grid = null; this.bounds = o.bounds || null;   // [x0, y0, x1, y1]: leaving it drains / is clamped
    this.noDrain = !!o.noDrain;
  }
  buildGrid() {
    const g = new Map();
    for (const c of this.cols) {
      const bb = c.bb;
      const x0 = Math.floor((bb[0] - BR) / CELL), x1 = Math.floor((bb[2] + BR) / CELL);
      const y0 = Math.floor((bb[1] - BR) / CELL), y1 = Math.floor((bb[3] + BR) / CELL);
      for (let i = x0; i <= x1; i++) for (let j = y0; j <= y1; j++) {
        const k = i * 4096 + j; let a = g.get(k); if (!a) g.set(k, a = []); a.push(c);
      }
    }
    this.grid = g;
  }
  near(x, y) { return this.grid.get(Math.floor(x / CELL) * 4096 + Math.floor(y / CELL)) || EMPTY; }
}
const EMPTY = [];

function segBB(c) { const r = c.r; c.bb = [Math.min(c.x1, c.x2) - r, Math.min(c.y1, c.y2) - r, Math.max(c.x1, c.x2) + r, Math.max(c.y1, c.y2) + r]; }
function prepSeg(c) {
  c.dx = c.x2 - c.x1; c.dy = c.y2 - c.y1; c.len2 = c.dx * c.dx + c.dy * c.dy || 1e-9; c.len = Math.sqrt(c.len2); segBB(c);
}

// ── Flipper ───────────────────────────────────────────────────────────────
// Dual-coil model: the power winding drives the bat up hard until the
// end-of-stroke switch, then a weak hold winding keeps it up (a hard hit can
// knock it down a little; the hold coil brings it back). Released, a spring
// returns it. The ball sees the bat's real surface velocity (omega x r).
export class Flipper {
  constructor(o) {
    this.x = o.x; this.y = o.y; this.side = o.side || 'L';
    this.len = o.len || 80; this.r1 = o.r1 || 11.5; this.r2 = o.r2 || 6.5;
    const dir = this.side === 'L' ? 1 : -1; this.dir = dir;
    const rest = (o.rest != null ? o.rest : -30) * PI / 180, up = (o.up != null ? o.up : 28) * PI / 180;
    this.aRest = this.side === 'L' ? rest : PI - rest; this.aUp = this.side === 'L' ? up : PI - up;
    if (o.angle != null) { const base = o.angle * PI / 180; this.aRest = base; this.aUp = base + dir * ((o.stroke || 58) * PI / 180); }
    this.a = this.aRest; this.w = 0; this.pressed = false; this.eos = false;
    this.acc = o.acc || 1500; this.wMax = o.wMax || 25; this.ret = o.ret || 900; this.retMax = o.retMax || 18;
    this.hold = o.hold || 260;           // hold winding: weak
    this.key = o.key || this.side; this.lvl = o.lvl || 'main'; this.mat = MAT.flipper; this.id = o.id || 'flip' + this.side;
    this.k = 'flip'; this.on = true; this.dead = false; this.owner = null;
  }
  step(dt) {
    const d = this.dir, want = this.pressed && !this.dead;
    if (want) {
      if (!this.eos) {
        this.w += d * this.acc * dt; if (this.w * d > this.wMax) this.w = d * this.wMax;
        this.a += this.w * dt;
        if ((this.a - this.aUp) * d >= 0) { this.a = this.aUp; this.w = 0; this.eos = true; }
      } else {
        // hold: drift back up if a ball knocked it down
        if ((this.aUp - this.a) * d > 1e-4) {
          this.w += d * this.hold * dt * (1 + 6 * Math.min(1, (this.aUp - this.a) * d / 0.12));
          this.a += this.w * dt;
          if ((this.a - this.aUp) * d >= 0) { this.a = this.aUp; this.w = 0; }
          if ((this.aUp - this.a) * d > 0.16) this.eos = false;   // knocked well down: the power coil re-engages
        } else { this.a = this.aUp; this.w = 0; }
      }
    } else {
      this.eos = false;
      this.w -= d * this.ret * dt; if (-this.w * d > this.retMax) this.w = -d * this.retMax;
      this.a += this.w * dt;
      if ((this.a - this.aRest) * d <= 0) { this.a = this.aRest; this.w = this.w * d < -2 ? -this.w * 0.12 : 0; }
    }
    // never past the stops
    if ((this.a - this.aUp) * d > 0) { this.a = this.aUp; if (this.w * d > 0) this.w = 0; }
    if ((this.a - this.aRest) * d < 0) { this.a = this.aRest; if (this.w * d < 0) this.w = 0; }
  }
  // the bat's tip, for drawing and aiming
  tip() { return [this.x + Math.cos(this.a) * this.len, this.y + Math.sin(this.a) * this.len]; }
}

// ── World ─────────────────────────────────────────────────────────────────
export class World {
  constructor(o = {}) {
    this.W = o.W || 520; this.L = o.L || 1060;
    this.levels = {}; this.level('main', 0);
    this.balls = []; this.paths = []; this.comps = []; this.flips = [];
    this.time = 0; this.seq = 0; this.stamp = 0;
    this.tilted = false;                 // kickers and flippers go dead
    // callbacks the game wires up
    this.onHit = null;                   // (ball, collider, impulse, nx, ny)
    this.onDrain = null;                 // (ball)
    this.onLand = null;                  // (ball, vz)
    this.onBallHit = null;               // (a, b, impulse)
  }
  level(id, z, o) { if (!this.levels[id]) this.levels[id] = new Level(id, z || 0, o); else if (z != null) this.levels[id].z = z; return this.levels[id]; }
  L_(id) { return this.levels[id || 'main'] || this.levels.main; }

  // Colliders. o: {mat, r (half thickness), lvl, one: [nx, ny] (one-way: ball passes travelling along n), id, owner, kick, kickMin, kickCool}
  seg(x1, y1, x2, y2, o = {}) {
    const c = { k: 'seg', x1, y1, x2, y2, r: o.r != null ? o.r : 2, mat: matOf(o.mat), on: o.on !== false, one: o.one || null, id: o.id || '', owner: o.owner || null,
      kick: o.kick || 0, kickMin: o.kickMin || 0, kickCool: o.kickCool || 0.1, cool: 0, lvl: o.lvl || 'main', vx: 0, vy: 0, dynamic: !!o.dynamic, zTop: o.zTop || 0, mute: !!o.mute };
    prepSeg(c); this.addCol(c); return c;
  }
  wall(pts, o = {}) { const out = []; for (let i = 0; i < pts.length - 1; i++) out.push(this.seg(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], o)); if (o.closed && pts.length > 2) out.push(this.seg(pts[pts.length - 1][0], pts[pts.length - 1][1], pts[0][0], pts[0][1], o)); return out; }
  circ(x, y, r, o = {}) {
    const c = { k: 'circ', x, y, r, mat: matOf(o.mat || 'rubber'), on: o.on !== false, id: o.id || '', owner: o.owner || null, kick: o.kick || 0, kickMin: o.kickMin || 0,
      kickCool: o.kickCool || 0.08, cool: 0, lvl: o.lvl || 'main', vx: 0, vy: 0, dynamic: !!o.dynamic, mute: !!o.mute };
    c.bb = [x - r, y - r, x + r, y + r]; this.addCol(c); return c;
  }
  addCol(c) { const L = this.L_(c.lvl); if (c.dynamic) L.dyn.push(c); else { L.cols.push(c); L.grid = null; } }
  removeCol(c) { const L = this.L_(c.lvl); for (const a of [L.cols, L.dyn]) { const i = a.indexOf(c); if (i >= 0) a.splice(i, 1); } L.grid = null; }
  // move a dynamic segment / circle (surface velocity from the motion)
  moveSeg(c, x1, y1, x2, y2, dt) {
    if (dt > 0) { c.vx = ((x1 + x2) - (c.x1 + c.x2)) / 2 / dt; c.vy = ((y1 + y2) - (c.y1 + c.y2)) / 2 / dt; }
    c.x1 = x1; c.y1 = y1; c.x2 = x2; c.y2 = y2; prepSeg(c);
  }
  moveCirc(c, x, y, dt) { if (dt > 0) { c.vx = (x - c.x) / dt; c.vy = (y - c.y) / dt; } c.x = x; c.y = y; c.bb = [x - c.r, y - c.r, x + c.r, y + c.r]; }

  flipper(o) { const f = new Flipper(o); this.flips.push(f); this.L_(f.lvl).flips.push(f); return f; }

  // Sensors. kind 'line': fires when a ball crosses it (dir: only when moving along [dx,dy]).
  // kind 'circle': fires on enter (and leave); maxV: only slower balls (for holes).
  sensor(o) {
    const s = Object.assign({ on: true, lvl: 'main', id: '', owner: null }, o);
    if (s.kind === 'line') { s.bb = [Math.min(s.x1, s.x2), Math.min(s.y1, s.y2), Math.max(s.x1, s.x2), Math.max(s.y1, s.y2)]; }
    else { s.kind = 'circle'; s.bb = [s.x - s.r, s.y - s.r, s.x + s.r, s.y + s.r]; }
    this.L_(s.lvl).sensors.push(s); return s;
  }
  // Force fields: fn(ball, dt, field) adds to ball velocity. r: reach (cheap reject).
  field(o) { const f = Object.assign({ on: true, lvl: 'main' }, o); this.L_(f.lvl).fields.push(f); return f; }

  // 3D paths (ramps, wireforms, tubes, VUK shafts). pts: [[x,y,z]...] (already smooth).
  path(o) {
    const p = Object.assign({ fric: 60, k: ROLLK, minExit: 0, entryMin: 0, mat: 'plastic' }, o);
    const pts = p.pts, cum = [0];
    for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i]; cum.push(cum[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2])); }
    p.cum = cum; p.L = cum[cum.length - 1];
    this.paths.push(p); return p;
  }
  pathAt(p, s, out) {
    const c = p.cum, pts = p.pts; s = clamp(s, 0, p.L);
    let lo = 0, hi = c.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (c[m] <= s) lo = m; else hi = m; }
    const k = (s - c[lo]) / ((c[hi] - c[lo]) || 1), a = pts[lo], b = pts[hi], l = (c[hi] - c[lo]) || 1;
    out = out || [0, 0, 0, 0, 0, 0];
    out[0] = a[0] + (b[0] - a[0]) * k; out[1] = a[1] + (b[1] - a[1]) * k; out[2] = a[2] + (b[2] - a[2]) * k;
    out[3] = (b[0] - a[0]) / l; out[4] = (b[1] - a[1]) / l; out[5] = (b[2] - a[2]) / l;
    return out;
  }

  // ── Balls ──
  addBall(x, y, o = {}) {
    const L = this.L_(o.lvl);
    const b = { id: ++this.seq, x, y, z: L.z, vx: o.vx || 0, vy: o.vy || 0, vz: 0, lvl: L.id, mode: o.mode || 'free',
      path: null, held: null, air: null, spin: 0, mass: o.mass || 1, power: !!o.power, ax: x, ay: y, stillT: 0,
      noCap: {}, sIn: {}, lastHit: '', born: this.time, onFlip: null, rx: 0, ry: 0, contactT: 0, lastPath: null, noPath: 0, hidden: false, tag: o.tag || '' };
    this.balls.push(b); return b;
  }
  removeBall(b) { const i = this.balls.indexOf(b); if (i >= 0) this.balls.splice(i, 1); b.removed = true; }
  // put a ball somewhere and make it free
  place(b, x, y, lvl, vx = 0, vy = 0) {
    const L = this.L_(lvl || b.lvl); b.x = x; b.y = y; b.z = L.z; b.lvl = L.id; b.vx = vx; b.vy = vy; b.vz = 0;
    b.mode = 'free'; b.path = null; b.held = null; b.air = null; b.hidden = false; b.stillT = 0; b.ax = x; b.ay = y; b.sIn = {};
  }
  hold(b, owner, data) { b.mode = 'held'; b.held = Object.assign({ owner, t: 0 }, data || {}); b.path = null; b.air = null; b.vx = b.vy = 0; b.spin = 0; }
  hide(b, owner, data) { b.mode = 'hidden'; b.hidden = true; b.held = Object.assign({ owner, t: 0 }, data || {}); b.path = null; b.air = null; }
  // release a held / hidden ball onto a level with a velocity
  release(b, x, y, vx, vy, lvl, noCapFor) {
    this.place(b, x, y, lvl || b.lvl, vx, vy);
    if (noCapFor) for (const k in noCapFor) b.noCap[k] = noCapFor[k];
  }
  // launch into the air (a ramp drop, a jump, a trap door). Lands on level `to`.
  airborne(b, x, y, z, vx, vy, vz, to) {
    b.mode = 'air'; b.x = x; b.y = y; b.z = z; b.vx = vx; b.vy = vy; b.vz = vz; b.air = { to: to || b.lvl }; b.path = null; b.held = null;
  }
  enterPath(b, p, u, s = 0) {
    b.mode = 'path'; b.path = { p, s, u, top: false }; b.held = null; b.air = null; b.lastPath = p;
  }

  // ── Step ──
  step(dt) {
    this.time += dt; this.stamp++;
    const comps = this.comps;
    for (let i = 0; i < comps.length; i++) if (comps[i].step) comps[i].step(dt);
    for (let i = 0; i < this.flips.length; i++) { const f = this.flips[i]; f.dead = this.tilted; f.step(dt); }
    for (const id in this.levels) { const L = this.levels[id]; if (!L.grid) L.buildGrid(); for (const c of L.cols) if (c.cool > 0) c.cool -= dt; for (const c of L.dyn) if (c.cool > 0) c.cool -= dt; }
    const balls = this.balls;
    for (let k = balls.length - 1; k >= 0; k--) {
      const b = balls[k];
      if (b.noPath > 0) b.noPath -= dt;
      switch (b.mode) {
        case 'free': this.stepFree(b, dt); break;
        case 'path': this.stepPath(b, dt); break;
        case 'air': this.stepAir(b, dt); break;
        case 'held': case 'hidden': { const h = b.held; h.t += dt; if (h.owner && h.owner.stepHeld) h.owner.stepHeld(b, dt, h); break; }
      }
    }
    if (balls.length > 1) this.ballBall();
  }

  stepFree(b, dt) {
    const L = this.levels[b.lvl];
    b.vx += L.gx * dt; b.vy += L.gy * dt;
    const sp0 = Math.hypot(b.vx, b.vy);
    if (sp0 > 1e-3) {
      const dec = Math.min(sp0, ROLL_FRIC * dt) / sp0; b.vx -= b.vx * dec; b.vy -= b.vy * dec;
      if (b.spin) {   // side spin from a rubbing contact bends the path, then fades
        const sa = b.spin * 340 * dt * Math.min(1, sp0 / 400);
        const nvx = b.vx - b.vy / sp0 * sa, nvy = b.vy + b.vx / sp0 * sa; b.vx = nvx; b.vy = nvy;
        b.spin *= Math.exp(-3 * dt); if (Math.abs(b.spin) < 0.01) b.spin = 0;
      }
    }
    const F = L.fields;
    for (let i = 0; i < F.length; i++) {
      const f = F[i]; if (!f.on) continue;
      if (f.r && (Math.abs(b.x - f.x) > f.r || Math.abs(b.y - f.y) > f.r)) continue;
      f.fn(b, dt, f); if (b.mode !== 'free') return;
    }
    let sp = Math.hypot(b.vx, b.vy);
    if (sp > VMAX) { b.vx *= VMAX / sp; b.vy *= VMAX / sp; }
    const px = b.x, py = b.y;
    b.x += b.vx * dt; b.y += b.vy * dt; b.z = L.z;
    b.onFlip = null;
    // static colliders near the ball
    const st = this.stamp, near = L.near(b.x, b.y);
    for (let i = 0; i < near.length; i++) { const c = near[i]; if (c.st === st && c.stb === b.id) continue; c.st = st; c.stb = b.id; if (c.on) this.collide(b, c); }
    const dyn = L.dyn; for (let i = 0; i < dyn.length; i++) if (dyn[i].on) this.collide(b, dyn[i]);
    const fl = L.flips; for (let i = 0; i < fl.length; i++) this.collideFlip(b, fl[i]);
    // sensors
    const S = L.sensors;
    for (let i = 0; i < S.length; i++) {
      const s = S[i]; if (!s.on) continue;
      if (s.kind === 'line') {
        if (b.x + BR < s.bb[0] && px + BR < s.bb[0] || b.x - BR > s.bb[2] && px - BR > s.bb[2] || b.y + BR < s.bb[1] && py + BR < s.bb[1] || b.y - BR > s.bb[3] && py - BR > s.bb[3]) continue;
        if (crosses(px, py, b.x, b.y, s)) {
          if (s.dir && b.vx * s.dir[0] + b.vy * s.dir[1] <= 0) continue;
          if (s.owner && s.owner.onSensor) s.owner.onSensor(b, s, this); if (b.mode !== 'free') return;
        }
      } else {
        const dx = b.x - s.x, dy = b.y - s.y, d2 = dx * dx + dy * dy, inside = d2 < s.r * s.r, key = s.uid || (s.uid = 's' + (++this.seq));
        if (inside && !b.sIn[key]) {
          if (b.noCap[s.id] > this.time) continue;
          if (s.maxV && Math.hypot(b.vx, b.vy) > s.maxV) continue;
          b.sIn[key] = 1; if (s.owner && s.owner.onSensor) s.owner.onSensor(b, s, this); if (b.mode !== 'free') return;
        } else if (!inside && b.sIn[key] && d2 > (s.r + 4) * (s.r + 4)) { b.sIn[key] = 0; if (s.owner && s.owner.onLeave) s.owner.onLeave(b, s, this); }
      }
    }
    // paths start from line sensors owned by ramp components (see components.js)
    // off the bottom: drained (or off a level's edge)
    if (b.lvl === 'main' ? b.y < -BR * 2 : (L.bounds && !L.noDrain && b.y < L.bounds[1] - BR)) { if (this.onDrain) this.onDrain(b, L); }
  }

  collide(b, c) {
    if (c.k === 'seg') {
      if (b.x < c.bb[0] - BR || b.x > c.bb[2] + BR || b.y < c.bb[1] - BR || b.y > c.bb[3] + BR) return;
      let t = ((b.x - c.x1) * c.dx + (b.y - c.y1) * c.dy) / c.len2; t = t < 0 ? 0 : t > 1 ? 1 : t;
      const qx = c.x1 + c.dx * t, qy = c.y1 + c.dy * t, ex = b.x - qx, ey = b.y - qy, d2 = ex * ex + ey * ey, R = BR + c.r;
      if (d2 >= R * R) return;
      if (c.one) {   // one-way: no collision when on the far side or moving through the open way
        if ((b.x - c.x1) * c.one[0] + (b.y - c.y1) * c.one[1] > 0) { /* in front: collide */ } else return;
        if (b.vx * c.one[0] + b.vy * c.one[1] > 0) return;
      }
      const d = Math.sqrt(d2); let nx, ny;
      if (d < 1e-6) { nx = -c.dy / c.len; ny = c.dx / c.len; } else { nx = ex / d; ny = ey / d; }
      b.x += nx * (R - d); b.y += ny * (R - d);
      this.contact(b, c, nx, ny, c.vx, c.vy);
    } else {
      const ex = b.x - c.x, ey = b.y - c.y, R = BR + c.r, d2 = ex * ex + ey * ey;
      if (d2 >= R * R) return;
      const d = Math.sqrt(d2) || 1e-6, nx = ex / d, ny = ey / d;
      b.x = c.x + nx * R; b.y = c.y + ny * R;
      this.contact(b, c, nx, ny, c.vx, c.vy);
    }
  }
  contact(b, c, nx, ny, svx, svy) {
    let rvx = b.vx - svx, rvy = b.vy - svy;
    const vn = rvx * nx + rvy * ny;
    if (vn >= 0) return;
    const imp = -vn, m = c.mat, e = imp < 60 ? 0 : m.e;
    const jn = (1 + e) * imp;
    rvx += jn * nx; rvy += jn * ny;
    const tx = -ny, ty = nx, vt = rvx * tx + rvy * ty, f = imp < 80 ? 0 : m.mu * jn, dv = clamp(-vt, -f, f);   // resting contacts roll freely
    rvx += dv * tx; rvy += dv * ty;
    b.vx = rvx + svx; b.vy = rvy + svy;
    if (imp > 150) b.spin = clamp(b.spin + dv * 0.003, -1.5, 1.5);
    if (c.kick && c.cool <= 0 && imp > c.kickMin && !this.tilted) {
      const vn2 = b.vx * nx + b.vy * ny;
      if (vn2 < c.kick) { b.vx += nx * (c.kick - vn2); b.vy += ny * (c.kick - vn2); }
      c.cool = c.kickCool; c.kicked = true;
    }
    b.contactT = this.time;
    if (c.owner && c.owner.onContact) c.owner.onContact(b, c, imp, nx, ny, this);
    if (this.onHit && !c.mute) this.onHit(b, c, imp, nx, ny);
    c.kicked = false;
  }
  collideFlip(b, f) {
    const c = Math.cos(f.a), s = Math.sin(f.a), dx = b.x - f.x, dy = b.y - f.y;
    if (dx * dx + dy * dy > (f.len + f.r1 + BR + 4) ** 2) return;
    let t = dx * c + dy * s; t = t < 0 ? 0 : t > f.len ? f.len : t;
    const qx = f.x + c * t, qy = f.y + s * t, rr = f.r1 + (f.r2 - f.r1) * (t / f.len);
    const ex = b.x - qx, ey = b.y - qy, d2 = ex * ex + ey * ey, R = BR + rr;
    if (d2 >= R * R) return;
    const d = Math.sqrt(d2) || 1e-6, nx = ex / d, ny = ey / d;
    b.x = qx + nx * R; b.y = qy + ny * R;
    const px = qx + nx * rr - f.x, py = qy + ny * rr - f.y;
    const svx = -f.w * py, svy = f.w * px;
    const vn = (b.vx - svx) * nx + (b.vy - svy) * ny;
    this.contact(b, f, nx, ny, svx, svy);
    b.onFlip = f;
    // a hard hit on a held-up bat knocks it down a little (only the weak hold coil resists)
    if (f.eos && f.pressed && vn < -500) {
      const arm = Math.hypot(px, py) / f.len;
      f.w -= f.dir * Math.min(14, (-vn - 500) * 0.012 * arm);
    }
  }

  stepPath(b, dt) {
    const P = b.path, p = P.p;
    const q = this.pathAt(p, P.s, b._pq || (b._pq = [0, 0, 0, 0, 0, 0]));
    // gravity along the path: table-space g is (0, -g sin(tilt), -g cos(tilt))
    let a = p.k * (-G_ALONG * q[4] - G_NORMAL * q[5]);
    a -= Math.sign(P.u) * p.fric;
    if (p.accel) a += p.accel(P, this) || 0;            // boosters (supercharger, VUK coil)
    P.u = clamp(P.u + a * dt, -VMAX, VMAX); P.s += P.u * dt;
    if (P.s >= p.L) {
      const e = this.pathAt(p, p.L), u = Math.max(P.u, p.minExit);
      b.x = e[0]; b.y = e[1]; b.z = e[2];
      if (p.onExit) { p.onExit(b, u, e, this); return; }
      // default: carry on into the air towards the exit level
      const L = this.L_(p.exitLvl || 'main');
      b.lvl = L.id;
      this.airborne(b, e[0], e[1], Math.max(e[2], L.z), e[3] * u, e[4] * u, Math.max(0, e[5] * u), L.id);
      b.noPath = 0.4; return;
    }
    if (P.s <= 0) {   // rolled back out of the mouth
      const e = this.pathAt(p, 0), u = Math.max(Math.abs(P.u), 80);
      if (p.onFail) { p.onFail(b, u, e, this); return; }
      const L = this.L_(p.lvl || 'main');
      this.place(b, e[0] - e[3] * 2, e[1] - e[4] * 2, L.id, -e[3] * u, -e[4] * u);
      b.noPath = 0.35; return;
    }
    if (P.s > p.L * 0.5) P.top = true;
    const r = this.pathAt(p, P.s, q);
    b.x = r[0]; b.y = r[1]; b.z = r[2]; b.vx = r[3] * P.u; b.vy = r[4] * P.u; b.vz = r[5] * P.u;
  }

  stepAir(b, dt) {
    const A = b.air, L = this.L_(A.to);
    b.vy -= G_ALONG * dt; b.vz -= G_NORMAL * dt;
    b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
    A.t = (A.t || 0) + dt;
    if (b.z <= L.z) {
      b.z = L.z; const vz = b.vz;
      if (vz < -350 && !A.bounced) { b.vz = -vz * 0.28; A.bounced = true; if (this.onLand) this.onLand(b, -vz); return; }
      if (this.onLand && !A.bounced) this.onLand(b, -vz);
      b.mode = 'free'; b.lvl = L.id; b.air = null; b.vz = 0;
      b.vx *= 0.92; b.vy *= 0.92;   // a little lost in the landing
    }
    if (A.t > 3) { b.mode = 'free'; b.lvl = L.id; b.z = L.z; b.air = null; }
  }

  ballBall() {
    const B = this.balls;
    for (let i = 0; i < B.length; i++) {
      const a = B[i]; if (a.mode === 'hidden' || a.mode === 'path' || a.mode === 'air') continue;
      for (let j = i + 1; j < B.length; j++) {
        const b = B[j]; if (b.mode === 'hidden' || b.mode === 'path' || b.mode === 'air' || a.lvl !== b.lvl) continue;
        const aFree = a.mode === 'free', bFree = b.mode === 'free';
        if (!aFree && !bFree) continue;
        const ex = b.x - a.x, ey = b.y - a.y, d2 = ex * ex + ey * ey, R = 2 * BR;
        if (d2 >= R * R || d2 < 1e-9) continue;
        const d = Math.sqrt(d2), nx = ex / d, ny = ey / d, pen = R - d;
        const ia = aFree ? 1 / a.mass : 0, ib = bFree ? 1 / b.mass : 0, sum = ia + ib;
        a.x -= nx * pen * ia / sum; a.y -= ny * pen * ia / sum; b.x += nx * pen * ib / sum; b.y += ny * pen * ib / sum;
        const vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny; if (vn >= 0) continue;
        const e = -vn < 60 ? 0.2 : MAT.ball.e, jn = -(1 + e) * vn / sum;
        a.vx -= jn * ia * nx; a.vy -= jn * ia * ny; b.vx += jn * ib * nx; b.vy += jn * ib * ny;
        if (this.onBallHit) this.onBallHit(a, b, -vn);
        if (!aFree && a.held && a.held.owner && a.held.owner.onHeldHit) a.held.owner.onHeldHit(a, b, -vn);
        if (!bFree && b.held && b.held.owner && b.held.owner.onHeldHit) b.held.owner.onHeldHit(b, a, -vn);
      }
    }
  }

  // nudge: every free ball gets the same shove
  nudge(dx, dy) { for (const b of this.balls) if (b.mode === 'free') { b.vx += dx; b.vy += dy; b.stillT = 0; } }
}

export function crosses(px, py, x, y, L) {
  const ax = L.x2 - L.x1, ay = L.y2 - L.y1;
  const d1 = ax * (py - L.y1) - ay * (px - L.x1), d2 = ax * (y - L.y1) - ay * (x - L.x1);
  if ((d1 > 0) === (d2 > 0)) return false;
  const mx = x - px, my = y - py;
  const d3 = mx * (L.y1 - py) - my * (L.x1 - px), d4 = mx * (L.y2 - py) - my * (L.x2 - px);
  return (d3 > 0) !== (d4 > 0);
}

// ── Curves ────────────────────────────────────────────────────────────────
// Catmull-Rom through control points ([x,y] or [x,y,z]), sampled every `step` mm.
export function spline(ctrl, step = 8, closed = false) {
  const P = ctrl.map(p => [p[0], p[1], p[2] || 0]), n = P.length, out = [];
  if (n < 2) return P;
  const get = i => closed ? P[(i + n) % n] : P[clamp(i, 0, n - 1)];
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
    const len = Math.hypot(p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2]), m = Math.max(2, Math.ceil(len / step));
    for (let j = 0; j < m; j++) {
      const t = j / m, t2 = t * t, t3 = t2 * t;
      const f = k => 0.5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3);
      out.push([f(0), f(1), f(2)]);
    }
  }
  if (!closed) out.push(P[n - 1].slice()); else out.push(out[0].slice());
  return out;
}
export function arcPts(cx, cy, r, a0, a1, n, rz) {   // degrees
  const out = []; n = n || Math.max(3, Math.ceil(Math.abs(a1 - a0) / 8));
  for (let i = 0; i <= n; i++) { const a = (a0 + (a1 - a0) * i / n) * PI / 180; out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * (rz || r)]); }
  return out;
}
export const deg = d => d * PI / 180;
