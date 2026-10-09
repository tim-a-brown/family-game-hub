// ═══════════════════════════════════════════════════════════════════════════
// Pinball 3D engine. createGame(tableDef, opts) builds a real-time 3D pinball
// machine from a table definition (see README.md): renderer + camera +
// lighting + materials, physics world (physics.js), component library
// (components.js), lamps, display, audio, rules framework and game flow.
//
// Headless use (simulations): createGame(def, { headless: true }) builds the
// physics and rules only; drive it with game.sim(seconds).
// ═══════════════════════════════════════════════════════════════════════════
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { World, BR, DT, TILT, clamp, spline, arcPts, deg, MAT } from './physics.js';
import { Materials, Batch, canvas, canvasTex, painter, wallGeo, slabGeo, cylGeo, boxGeo, sphereGeo, torusGeo, latheGeo, rgba, shade, woodCanvas, glowCanvas, rng, planarUV } from './gfx.js';
import { Display, smallText, bigText, smallW } from './display.js';
import { Audio } from './audio.js';
import { COMPONENTS, lower, shooter } from './components.js';

const PI = Math.PI, TAU = PI * 2;
export const fmt = n => Math.round(n).toLocaleString('en-US');
let sharedAudio = null;
export function audio() { return sharedAudio || (sharedAudio = new Audio()); }

// ── Lamp states ─────────────────────────────────────────────────────────────
// A rules lamps() hook returns { id: state } every frame. state: 0/false off,
// 1/true on, 'blink' (2.5 Hz), 'fast' (8 Hz), 'slow' (1 Hz), 'pulse' (soft),
// or a number 0..1 for a dim level.
function lampValue(s, t, ph) {
  if (s === true) return 1; if (!s) return 0;
  if (typeof s === 'number') return s;
  switch (s) {
    case 'blink': return (t * 2.5 + ph) % 1 < 0.55 ? 1 : 0;
    case 'fast': return (t * 8 + ph) % 1 < 0.5 ? 1 : 0;
    case 'slow': return (t * 1 + ph) % 1 < 0.6 ? 1 : 0;
    case 'pulse': return 0.25 + 0.75 * (0.5 + 0.5 * Math.sin((t * 2 + ph) * TAU));
    case 'on': return 1;
  }
  return 0;
}

// ═══════════════════════════════════════════════════════════════════════════
export function createGame(def, opts = {}) {
  const headless = !!opts.headless, thumb = !!opts.thumb;
  const W = def.W || 520, L = def.L || 1060;
  const world = new World({ W, L });
  const AU = headless || thumb ? null : (opts.audio || audio());
  const theme = Object.assign({
    rails: 'chrome', cabinet: '#1b1320', wood: '#5a3a22', rubber: '#141414', flipper: '#f4f1ea', flipperRubber: '#c8202a',
    post: 'chrome', gi: ['#ffd9a8', '#ffd9a8', '#ffcf96', '#ffcf96'], giLevel: 1, ambient: 0.35, key: 1.1, bloom: 0.55, exposure: 1.0,
    env: ['#ffd9a8', '#9ab0ff', '#ff9ad6'], glass: true, lampGain: 3.2, pfRough: 0.55, apron: '#1c1a22', apronText: '#e8dcc0', felt: '#000'
  }, def.theme || {});

  // ── Game state (rules-facing API lives on G) ──────────────────────────────
  const G = {
    def, id: def.id, world, W, L, theme, headless, time: 0, score: 0, shownScore: 0, ballNo: 1, balls0: opts.balls || 3, extra: 0,
    who: opts.who || 'Player', amb: opts.amb !== false, state: 'serve', waitPlunge: false, pull: 0, pulling: false, pullT0: 0, pullDrag: 0, autoT: 0,
    bx: 1, bxMax: 1, ebLit: false, ebGot: 0, mult: 1, multBase: 1, multT: 0, saveT: 0, saveStarted: false,
    tilted: false, tiltM: 0, nudgeT: -9, mb: false, comboN: 0, lastShot: '', lastShotT: -9, skill: null,
    st: {}, pb: {}, b: {}, ballScores: [], drains: [], ballStart: 0, laters: [], dq: [], dm: null,
    flashA: 0, flashC: '#fff', shakeA: 0, bonus: null, overT: 0, started: Date.now(), finished: false, pending: 0,
    stats: { stuck: 0, esc: 0, maxStill: 0, at: [], drains: 0, saves: 0 }, comps: {}, compList: [], lamps: {}, lampList: [], show: null,
    dark: 0, darkT: 0, lightning: 0, giLevel: 1, rules: def.rules || {}, input: { L: false, R: false, magna: false, fire: false },
    plunger: null, trough: 0, paused: false, frameMs: [], quality: 2
  };
  const RL = G.rules;
  function R(name, ...a) { const f = RL[name]; return f ? f.call(RL, G, ...a) : undefined; }
  G.call = R;

  // ── Table builder (T) ────────────────────────────────────────────────────
  const T = {
    W, L, world, G, def, theme, headless: headless, R: null,
    statics: [],       // static scenery for the renderer: {kind, ...}
    aos: [],           // contact-shadow shapes for the playfield art
    holes: [],         // cut-outs in the playfield texture
    windows: [],       // see-through windows (basement)
    inserts: [], bulbs: [], flashers: [], arts: [], levels: { main: { z: 0 } },
    lane: { x0: W - 36, x1: W - 4 },
    comp(c) { G.compList.push(c); if (c.id) G.comps[c.id] = c; world.comps.push(c); return c; },
    level(id, o = {}) {
      const lv = world.level(id, o.z || 0, o); T.levels[id] = Object.assign({ z: o.z || 0 }, o);
      return lv;
    },
    // walls: style 'metal' (chrome guide rail), 'wood' (painted wooden wall), 'rubber', 'plastic', 'wire', 'invisible'
    wall(pts, o = {}) {
      const style = o.style || 'metal', lvl = o.lvl || 'main';
      const mat = o.mat || (style === 'rubber' ? 'rubber' : style === 'wood' ? 'wood' : style === 'plastic' ? 'plastic' : 'metal');
      const r = o.r != null ? o.r : style === 'wood' ? 6 : style === 'rubber' ? 3.5 : 1.6;
      const segs = world.wall(pts, { mat, r, lvl, one: o.one, id: o.id, owner: o.owner, closed: o.closed, mute: o.mute });
      if (style !== 'invisible') {
        T.statics.push({ kind: 'wall', pts: o.closed ? pts.concat([pts[0]]) : pts, style, r, h: o.h, lvl, color: o.color, z0: o.z0 });
        if (lvl === 'main' && o.ao !== false) T.aos.push({ kind: 'line', pts: o.closed ? pts.concat([pts[0]]) : pts, w: r * 2 + (style === 'wood' ? 6 : 3), a: style === 'wire' ? 0.25 : 0.5 });
      }
      return segs;
    },
    post(x, y, o = {}) {
      const style = o.style || 'rubber', lvl = o.lvl || 'main';
      const r = o.r != null ? o.r : style === 'metal' ? 4 : style === 'peg' ? 3 : 5.5;
      const c = world.circ(x, y, r, { mat: style === 'metal' || style === 'peg' ? 'metal' : 'rubber', lvl, id: o.id, owner: o.owner });
      if (o.draw !== false) T.statics.push({ kind: 'post', x, y, r, style, lvl, color: o.color, h: o.h });
      if (lvl === 'main') T.aos.push({ kind: 'dot', x, y, r: r + 3, a: 0.55 });
      return c;
    },
    // a rubber band round posts [[x,y],...] (physics: segments between posts, outside)
    rubber(posts, o = {}) {
      const lvl = o.lvl || 'main', pr = o.postR || 4.5, th = o.th || 3.2;
      posts.forEach(p => world.circ(p[0], p[1], pr + th, { mat: 'rubber', lvl, id: o.id }));
      const hullPts = posts.length > 2 ? convex(posts) : posts;
      const loop = posts.length > 2 ? hullPts.concat([hullPts[0]]) : hullPts;
      for (let i = 0; i < loop.length - 1; i++) {
        const a = loop[i], b = loop[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = dy / l, ny = -dx / l;
        const s = posts.length > 2 ? 1 : 0;
        if (posts.length > 2) world.seg(a[0] + nx * (pr + th / 2), a[1] + ny * (pr + th / 2), b[0] + nx * (pr + th / 2), b[1] + ny * (pr + th / 2), { mat: 'rubber', r: th / 2 + 0.3, lvl, id: o.id });
        else { world.seg(a[0] + nx * (pr + th / 2), a[1] + ny * (pr + th / 2), b[0] + nx * (pr + th / 2), b[1] + ny * (pr + th / 2), { mat: 'rubber', r: th / 2 + 0.3, lvl, id: o.id }); world.seg(a[0] - nx * (pr + th / 2), a[1] - ny * (pr + th / 2), b[0] - nx * (pr + th / 2), b[1] - ny * (pr + th / 2), { mat: 'rubber', r: th / 2 + 0.3, lvl, id: o.id }); }
      }
      T.statics.push({ kind: 'rubber', posts, pr, th, lvl, color: o.color, postStyle: o.postStyle });
      if (lvl === 'main') posts.forEach(p => T.aos.push({ kind: 'dot', x: p[0], y: p[1], r: pr + th + 4, a: 0.5 }));
    },
    // decorative printed plastic on posts at height z (no physics)
    plastic(poly, o = {}) { T.statics.push({ kind: 'plastic', poly, z: o.z || 34, color: o.color, art: o.art, lvl: o.lvl || 'main', opacity: o.opacity }); },
    // insert lamp in the playfield. shape: circle|oval|rect|arrow|triangle|star|diamond|shield|ring|text
    insert(id, x, y, o = {}) {
      const lamp = addLamp(id, Object.assign({ kind: 'insert', x, y }, o));
      T.inserts.push(lamp); return lamp;
    },
    // a small 3D bulb (toys, GI): lit by its lamp state
    bulb(id, x, y, z, o = {}) { const lamp = addLamp(id, Object.assign({ kind: 'bulb', x, y, z }, o)); T.bulbs.push(lamp); return lamp; },
    flasher(id, x, y, o = {}) { const lamp = addLamp(id, Object.assign({ kind: 'flasher', x, y, z: o.z || 40, color: o.color || '#fff' }, o)); T.flashers.push(lamp); return lamp; },
    // extra painting on the playfield: fn(P) after the inserts (layer 'over') or before (default)
    art(fn, layer) { T.arts.push({ fn, layer: layer || 'under' }); },
    hole(x, y, r, o = {}) { T.holes.push(Object.assign({ x, y, r }, o)); },
    window(poly, o = {}) { T.windows.push(Object.assign({ poly }, o)); },
    // a 3D model: fn(Rctx) returns an Object3D in table space (called only when rendering)
    model(fn, o = {}) { T.statics.push({ kind: 'model', fn, o }); },
    ao(shape) { T.aos.push(shape); },
    spline, arcPts, deg, BR, MAT
  };
  for (const name in COMPONENTS) T[name] = (o = {}) => T.comp(new COMPONENTS[name](T, o));
  T.lower = o => lower(T, o); T.shooter = o => shooter(T, o);
  G.T = T;

  function addLamp(id, o) {
    const lamp = Object.assign({ id, idx: G.lampList.length + 1, level: 0, target: 0, flashT: 0, ph: Math.random(), color: o.color || '#ffd27a', fade: o.led ? 40 : 14 }, o);
    if (G.lamps[id]) { lamp.idx = G.lamps[id].idx; lamp.twin = G.lamps[id]; }  // same id twice: share the state
    G.lamps[id] = G.lamps[id] || lamp; G.lampList.push(lamp); return lamp;
  }

  // ── Build the table ─────────────────────────────────────────────────────
  def.build(T);
  world.levels.main.bounds = [0, -60, W, L];

  // ── Rendering ───────────────────────────────────────────────────────────
  let RC = null;
  if (!headless) RC = buildScene(G, T, opts);
  T.R = RC;

  // ── Display ─────────────────────────────────────────────────────────────
  const disp = (opts.dmdCanvas && !headless) ? new Display(opts.dmdCanvas, def.display || {}) : null;

  // ── Sound helpers ─────────────────────────────────────────────────────────
  // sfx(name, {x, vol, rate, gap}) pans by table x and randomises pitch a little
  G.sfx = function (name, o = {}) {
    if (!AU || G.paused) return;
    const pan = o.x != null ? clamp((o.x / W) * 2 - 1, -1, 1) * 0.55 : (o.pan || 0);
    const rate = o.rate || (1 + (Math.random() - 0.5) * (o.vary != null ? o.vary : 0.12));
    AU.play(name, { vol: o.vol == null ? 0.8 : o.vol, rate, pan, gap: o.gap, verb: o.verb, when: o.when });
  };
  G.say = function (text, o = {}) { if (!AU || !G.amb || G.paused) return false; const sp = def.speech || {}; return AU.say(text, Object.assign({ pitch: sp.pitch, rate: sp.rate, voice: sp.voice }, o)); };
  G.haptic = function (k) { if (!headless && !thumb && window.Kit) try { Kit.haptic(k); } catch (e) {} };
  G.callout = function (text, col) { if (!headless && !thumb && window.Kit) try { Kit.callout(text, col); } catch (e) {} };

  // physics sounds: contact by material and impact speed
  world.onHit = function (b, c, imp) {
    if (!AU || imp < 90) return;
    const m = c.mat.snd, k = clamp(imp / 2500, 0, 1), x = b.x;
    if (m === 'metal') G.sfx(Math.random() < 0.5 ? 'metal' : 'metal2', { x, vol: 0.12 + 0.75 * k, vary: 0.35, gap: 0.035 });
    else if (m === 'rubber') G.sfx('rubber', { x, vol: 0.15 + 0.7 * k, vary: 0.3, gap: 0.05 });
    else if (m === 'wood') G.sfx('wood', { x, vol: 0.15 + 0.7 * k, vary: 0.25, gap: 0.05 });
    else if (m === 'plastic') G.sfx('plastic', { x, vol: 0.12 + 0.6 * k, vary: 0.25, gap: 0.05 });
    else if (m === 'flipper' && imp > 250) G.sfx('flipHit', { x, vol: 0.12 + 0.5 * k, vary: 0.2, gap: 0.06 });
  };
  world.onBallHit = function (a, b, imp) { if (imp > 120) G.sfx('clack', { x: (a.x + b.x) / 2, vol: clamp(imp / 1800, 0.08, 0.9), vary: 0.3, gap: 0.04 }); };
  world.onLand = function (b, vz) { if (vz > 150) G.sfx('land', { x: b.x, vol: clamp(vz / 1500, 0.15, 0.9) }); };
  world.onDrain = function (b, lv) { if (lv && lv.id !== 'main' && R('levelDrain', lv.id, b) === true) return; drainBall(b, lv); };

  // ── Rules API ─────────────────────────────────────────────────────────────
  G.comp = id => G.comps[id];
  G.cnt = function (k, n = 1) { G.st[k] = (G.st[k] || 0) + n; G.pb[k] = (G.pb[k] || 0) + n; };
  G.pbn = k => G.pb[k] || 0;
  G.add = function (pts, o = {}) {
    if (G.tilted || G.state === 'over' || thumb) return 0;
    pts = Math.round(pts * (o.raw ? 1 : G.mult) / 10) * 10;
    G.score += pts;
    if (RC && o.x != null && pts >= (o.min || 1000)) RC.popText('+' + fmt(pts), o.x, o.y, o.z || 30, o.color);
    return pts;
  };
  G.later = function (t, fn) { G.laters.push({ t, fn }); };
  G.msg = function (text, sub, o = {}) {
    const m = { text, sub: sub || '', t: 0, dur: o.dur || 1.7, style: o.style || def.msgStyle || 'zoom', anim: o.anim || null };
    if (o.now) { G.dq = [m]; G.dm = null; } else { G.dq.push(m); if (G.dq.length > 4) G.dq.splice(0, G.dq.length - 4); }
  };
  G.flash = function (col, a = 0.5) { G.flashC = col || '#fff'; G.flashA = Math.max(G.flashA, a); };
  G.shake = function (a = 0.6) { G.shakeA = Math.max(G.shakeA, a); };
  G.big = function (text, sub, col, o = {}) {
    G.msg(text, sub, Object.assign({ style: 'jackpot', dur: 2.3, now: true }, o)); G.flash(col || '#fff', 0.45); G.shake(0.8);
    G.lightShow('flash', 1.2); G.haptic('success');
  };
  // light shows over every insert: 'flash' (all blink), 'sweep' (bottom to top), 'chase' (circles), 'out' (all off)
  G.lightShow = function (kind, dur = 1.2, color) { G.show = { kind, t: 0, dur, color }; };
  G.bxUp = function () {
    if (G.bx < 5) { G.bx++; G.bxMax = Math.max(G.bxMax, G.bx); G.msg('BONUS ' + G.bx + 'X', 'MULTIPLIER', { style: 'slide' }); G.sfx('award'); }
    else { G.add(50000); G.msg('BONUS MAX', '50,000', { style: 'slide' }); }
  };
  G.lightExtra = function () { if (G.ebLit || G.ebGot >= 2) return; G.ebLit = true; G.msg('EXTRA BALL', 'IS LIT', { style: 'slide' }); G.sfx('award'); };
  G.collectExtra = function () {
    if (!G.ebLit) return false;
    G.ebLit = false; G.ebGot++; G.extra++; G.cnt('eb');
    G.big('EXTRA BALL', 'SHOOT AGAIN', '#ff4058'); G.sfx('knocker', { vol: 1 }); G.sfx('extra'); G.callout('EXTRA BALL', '#ff6b7a');
    return true;
  };
  G.jackpot = function (val, label, o = {}) {
    const p = G.add(val); G.cnt('jp');
    G.big(label || 'JACKPOT', fmt(p), o.color, o); G.sfx(o.sound || 'jackpot', { vol: 0.9 });
    if (/SUPER|WIZARD|MEGA/.test(label || '') && !headless && !thumb && window.Kit) try { Kit.confetti({ count: 120 }); } catch (e) {}
    return p;
  };
  G.combo = function (id) {
    const n = (G.time - G.lastShotT < 4.5 && G.lastShot !== id) ? G.comboN + 1 : 1;
    G.comboN = n; G.lastShot = id; G.lastShotT = G.time;
    if (n >= 2) { G.cnt('cb'); const p = G.add(20000 * (n - 1)); G.msg(n + '-WAY COMBO', fmt(p), { style: 'slide', now: true }); G.sfx('combo', { rate: 1 + n * 0.06, vary: 0 }); G.lightShow('chase', 0.8); }
    return n;
  };
  G.ballSave = function (sec) { if (!G.tilted) G.saveT = Math.max(G.saveT, sec); };
  G.activeBalls = () => world.balls.filter(b => !b.locked && !b.mist).length + G.pending + (G.plunger ? G.plunger.queue.length : 0);
  G.liveBalls = () => world.balls.filter(b => !b.locked && !b.mist);
  // put a ball in the shooter lane (auto: fire it automatically)
  G.serve = function (auto, o = {}) {
    if (!G.plunger) return null;
    G.plunger.load(Object.assign({ auto: !!auto }, o));
    return null;
  };
  // more balls into play. o: {label, from: fn(i) -> ball placed (return true) or null for the shooter lane, save}
  G.multiball = function (n, o = {}) {
    G.mb = true; G.cnt('mb');
    G.big(o.label || 'MULTIBALL', n + ' BALLS', o.color || '#8fe8ff'); G.sfx('multi'); G.callout(o.label || 'MULTIBALL', o.color || '#8fe8ff');
    G.ballSave(o.save != null ? o.save : 12);
    const need = n - G.activeBalls();
    for (let i = 0; i < need; i++) {
      G.pending++;
      G.later(0.6 + i * 0.8, () => {
        G.pending--; if (G.state === 'over') return;
        const r = o.from ? o.from(i) : null;
        if (!r) G.serve(true);
      });
    }
  };
  // a ball leaves play into a lock (the component keeps it); serve another if none left
  G.lockBall = function (b) {
    b.locked = true; G.sfx('lock'); G.haptic('medium');
    if (G.activeBalls() === 0 && G.state === 'play') G.serve(false);
  };
  G.unlockBall = function (b) { b.locked = false; };
  // modes: G.mode(name, seconds) runs a timed mode; rules see G.modes[name] (seconds left)
  G.modes = {};
  G.startMode = function (name, sec, o = {}) { G.modes[name] = sec; G.cnt('mode'); if (o.mult) { G.mult = o.mult; G.multT = sec; } R('modeStart', name); };
  G.endMode = function (name) { if (G.modes[name] == null) return; delete G.modes[name]; R('modeEnd', name); };
  G.lightsOut = function (on) { G.darkT = on ? (typeof on === 'number' ? on : 9999) : 0; };
  G.strike = function (k = 1) { G.lightning = Math.max(G.lightning, k); G.sfx('thunder', { vol: 0.7 }); };
  G.lamp = function (id, state) { G.lampOverride[id] = state; };
  G.lampOverride = {};
  G.pulse = function (id, t = 0.25) { const l = G.lamps[id]; if (l) l.flashT = Math.max(l.flashT, t); };

  // ── Events from components ───────────────────────────────────────────────
  G.emit = function (type, id, ball, data) {
    if (G.state === 'over' || thumb) return;
    if (ball) ball.lastHit = id;
    // defaults every table gets
    switch (type) {
      case 'pop': G.cnt('pop'); G.add(500, data && data.pts ? { x: data.x, y: data.y, z: 70 } : {}); break;
      case 'sling': G.cnt('sl'); G.add(110); break;
      case 'target': G.cnt('su'); G.add(1000, ball ? { x: ball.x, y: ball.y } : {}); break;
      case 'drop': G.cnt('dt'); G.add(750); break;
      case 'bank': G.cnt('bank'); G.add(15000); G.lightShow('sweep', 0.9); break;
      case 'spin': G.cnt('spin'); G.add(R('spinValue', id) || 100); break;
      case 'lane':
        if (/^(out|in)[LR]$/.test(id)) { if (id[0] === 'o') { G.add(2000); G.cnt('out'); } else { G.add(500); G.cnt('in'); } }
        else G.add(1000);
        break;
      case 'ramp': G.cnt('rp'); G.add(5000); G.lightShow('sweep', 0.7); break;
      case 'orbit': G.cnt('orb'); G.add(3000); break;
      case 'scoop': G.add(2500); break;
      case 'kickback': G.cnt('kick'); break;
    }
    R('event', type, id, ball, data);
    if (G.skill && type !== 'spin' && type !== 'rampEnter') skillCheck(type, id);
  };
  function skillCheck(type, id) {
    if (G.time > G.skill.until) { G.skill = null; return; }
    const r = R('skill', type, id);
    if (r === true) { G.skill = null; G.cnt('sk'); const p = G.add(50000); G.big('SKILL SHOT', fmt(p), '#ffd45a'); G.sfx('skill'); G.callout('SKILL SHOT', '#ffd45a'); }
    else if (r === false) G.skill = null;
  }

  // ── Ball flow ────────────────────────────────────────────────────────────
  function launch(p) {
    if (!G.plunger) return;
    const ok = G.plunger.fire(clamp(p, 0.05, 1));
    if (!ok) return;
    if (G.waitPlunge) {
      G.waitPlunge = false; G.pull = 0;
      if (!G.saveStarted) { G.saveStarted = true; G.ballSave(def.ballSave || 10); }
      if (G.state === 'serve') G.state = 'play';
      if (RL.skill) G.skill = { until: G.time + 7 };
      R('launch', p);
    }
  }
  G.launch = launch;
  function drainBall(b, lv) {
    world.removeBall(b);
    if (RC) RC.dropBall(b);
    if (b.mist) { R('event', 'mistLost', 'mist', b); return; }
    G.sfx('drain', { x: b.x, vol: 0.6 }); G.sfx('trough', { x: b.x, vol: 0.5, when: 0.35 });
    const side = b.x < W * 0.22 ? 'L' : b.x > W * 0.7 ? 'R' : 'C';
    if (G.state !== 'play' && G.state !== 'serve') return;
    if (R('drain', b) === true) return;
    if (!G.tilted && G.saveT > 0) {
      G.cnt('save'); G.stats.saves++; G.msg('BALL SAVED', '', { style: 'flash', now: true }); G.sfx('save');
      G.serve(true); return;
    }
    if (G.activeBalls() > 0) {
      if (G.mb && G.activeBalls() === 1) { G.mb = false; R('mbEnd'); G.msg('MULTIBALL', 'OVER', { style: 'slide' }); }
      return;
    }
    endBall(G.tilted ? 'T' : side);
  }
  function endBall(side) {
    G.mb = false; G.saveT = 0; G.skill = null; G.stats.drains++;
    G.state = 'bonus'; G.darkT = 0;
    for (const id in G.modes) G.endMode(id);
    R('ballEnd');
    const lines = []; let total = 0;
    if (!G.tilted) { (R('bonus') || []).forEach(l => { if (l[1] > 0) { lines.push(l); total += l[1] * l[2]; } }); total *= G.bx; }
    G.bonus = { lines, i: -1, t: 0.5, total, bx: G.bx, side, phase: G.tilted ? 'tilt' : 'lines' };
    G.haptic('error');
  }
  function bonusDone() {
    const bn = G.bonus;
    G.ballScores.push(G.score - G.ballStart); G.drains.push(bn.side);
    G.bonus = null; G.tilted = false; world.tilted = false; G.tiltM = 0;
    if (G.extra > 0) { G.extra--; G.msg('SHOOT AGAIN', 'SAME PLAYER', { style: 'flash' }); startBall(); return; }
    G.ballNo++;
    if (G.ballNo > G.balls0) { gameOver(); return; }
    startBall();
  }
  function startBall() {
    G.state = 'serve'; G.bx = 1; G.saveStarted = false; G.saveT = 0; G.mult = G.multBase || 1; G.multT = 0; G.ballStart = G.score; G.comboN = 0; G.lastShot = '';
    G.pending = 0; G.pb = {}; G.waitPlunge = false; if (G.plunger) G.plunger.queue.length = 0;
    world.balls.filter(b => !b.locked).forEach(b => { world.removeBall(b); if (RC) RC.dropBall(b); });
    R('ballStart');
    G.serve(false);
    if (G.ballNo > 1) G.msg('BALL ' + G.ballNo, G.ballNo === G.balls0 ? 'LAST BALL' : '', { style: 'slide' });
  }
  function nudge(dir) {
    if ((G.state !== 'play' && G.state !== 'serve') || G.tilted || G.time - G.nudgeT < 0.35) return;
    G.nudgeT = G.time; G.shake(0.9); G.cnt('nudge');
    dir = dir || (Math.random() < 0.5 ? -1 : 1);
    world.nudge(dir * 110, 160);
    G.sfx('wood', { vol: 0.9, rate: 0.7 }); G.haptic('heavy');
    G.tiltM += 1;
    if (G.tiltM >= 3.1) tilt();
    else if (G.tiltM >= 1.9) { G.cnt('warn'); G.msg('DANGER', 'TILT WARNING', { style: 'flash', now: true, dur: 1.2 }); G.sfx('warn'); }
  }
  G.nudge = nudge;
  function tilt() {
    G.tilted = true; world.tilted = true; G.cnt('tilt');
    G.msg('TILT', '', { style: 'flash', now: true, dur: 3 }); G.sfx('tilt'); G.haptic('error');
    G.compList.forEach(c => c.onTilt && c.onTilt());
    G.saveT = 0; G.darkT = 0;
  }
  function gameOver() {
    G.state = 'over'; G.overT = 0;
    world.balls.slice().forEach(b => { world.removeBall(b); if (RC) RC.dropBall(b); });
    G.msg('GAME OVER', '', { now: true, dur: 9 });
    G.sfx('over', { vol: 0.6 });
    if (AU) { AU.rollStop(); AU.musicStop(); }
  }
  function finish() { if (G.finished) return; G.finished = true; if (opts.onOver) opts.onOver(G); }

  // ── Per-frame bookkeeping ────────────────────────────────────────────────
  function update(dt) {
    G.time = world.time;
    for (let i = G.laters.length - 1; i >= 0; i--) { const l = G.laters[i]; l.t -= dt; if (l.t <= 0) { G.laters.splice(i, 1); l.fn(); } }
    if (G.saveT > 0) G.saveT -= dt;
    if (G.multT > 0) { G.multT -= dt; if (G.multT <= 0) { G.mult = G.multBase; R('multEnd'); } }
    for (const id in G.modes) { G.modes[id] -= dt; if (G.modes[id] <= 0) G.endMode(id); }
    if (G.darkT > 0) G.darkT -= dt;
    G.dark += ((G.darkT > 0 ? 1 : 0) - G.dark) * Math.min(1, dt * 2.5);
    G.lightning = Math.max(0, G.lightning - dt * 3.2);
    G.tiltM = Math.max(0, G.tiltM - dt * 0.4);
    G.shakeA = Math.max(0, G.shakeA - dt * 3); G.flashA = Math.max(0, G.flashA - dt * 2.2);
    if (G.show) { G.show.t += dt; if (G.show.t > G.show.dur) G.show = null; }
    if (G.dm) { G.dm.t += dt; if (G.dm.t >= G.dm.dur) G.dm = null; }
    if (!G.dm && G.dq.length) G.dm = G.dq.shift();
    if (G.waitPlunge && G.pulling) G.pull = Math.min(1, Math.max(G.pull, G.pullDrag || 0, (G.time - G.pullT0) / 1.1));
    if (G.plunger) G.plunger.pullTo(G.waitPlunge && G.pulling ? G.pull : 0);
    for (const c of G.compList) if (c.update) c.update(dt);
    // ball safety: stuck balls get a search kick; balls off the table go back to the shooter lane
    for (const b of world.balls.slice()) {
      if (!isFinite(b.x) || !isFinite(b.y) || b.x < -40 || b.x > W + 40 || b.y > L + 60) {
        G.stats.esc++; if (G.stats.at.length < 40) G.stats.at.push('esc:' + b.lvl + ':' + b.mode + ':' + Math.round(b.x) + ',' + Math.round(b.y)); world.removeBall(b); if (RC) RC.dropBall(b); if (!b.locked) { if (G.activeBalls() === 0 && G.state === 'play') G.serve(true); else if (G.state === 'play') G.serve(true); } continue;
      }
      if (b.mode !== 'free' || b.locked || b.mist) { b.stillT = 0; b.ax = b.x; b.ay = b.y; continue; }
      if (Math.hypot(b.x - b.ax, b.y - b.ay) > 12) { b.ax = b.x; b.ay = b.y; b.stillT = 0; }
      else {
        b.stillT += dt;
        const cradled = b.onFlip && b.onFlip.pressed;
        if (cradled || (G.plunger && G.plunger.holds(b))) b.stillT = Math.min(b.stillT, 1);
        if (!cradled && b.stillT > G.stats.maxStill) G.stats.maxStill = b.stillT;
        if (b.stillT > 2.8) {
          G.stats.stuck++; b.stillT = 0; if (G.stats.at.length < 40) G.stats.at.push(b.lvl + ':' + Math.round(b.x) + ',' + Math.round(b.y));
          b.vx = (b.x < W / 2 ? 1 : -1) * (200 + Math.random() * 200); b.vy = 700 + Math.random() * 400;
          G.shake(0.4); G.sfx('kick', { x: b.x, vol: 0.5 });
        }
      }
    }
    R('update', dt);
    lampsUpdate(dt);
    // bonus count
    if (G.bonus) {
      const bn = G.bonus; bn.t -= dt * ((G.input.L || G.input.R) ? 4 : 1);
      if (bn.t <= 0) {
        if (bn.phase === 'tilt') { bn.phase = 'end'; bn.t = 1.4; }
        else if (bn.phase === 'lines') { bn.i++; if (bn.i < bn.lines.length) { bn.t = 0.62; G.sfx('bonus', { rate: 1 + bn.i * 0.06, vary: 0 }); } else if (bn.bx > 1) { bn.phase = 'mult'; bn.t = 0.9; G.sfx('bonus', { rate: 1.5, vary: 0 }); } else { bn.phase = 'total'; bn.t = 1.3; G.score += bn.total; G.sfx('award'); } }
        else if (bn.phase === 'mult') { bn.phase = 'total'; bn.t = 1.3; G.score += bn.total; G.sfx('award'); }
        else if (bn.phase === 'total') { bn.phase = 'end'; bn.t = 0.25; }
        else bonusDone();
      }
    }
    if (G.state === 'over') { G.overT += dt; if (G.overT > 1.8 && !G.finished) finish(); }
    const tot = G.score; if (tot > G.shownScore) G.shownScore += Math.max(10, Math.ceil((tot - G.shownScore) * Math.min(1, dt * 12)));
    if (G.shownScore > tot) G.shownScore = tot;
  }
  // lamps: rules state -> smoothed level (incandescent fade)
  function lampsUpdate(dt) {
    const want = R('lamps') || {}, ov = G.lampOverride, t = G.time, show = G.show;
    for (const lp of G.lampList) {
      const id = lp.id;
      let s = ov[id] != null ? ov[id] : want[id] != null ? want[id] : (lp.on || 0);
      if (id === '_save') s = G.saveT > 0 ? (G.saveT < 2 ? 'fast' : 'blink') : 0;
      if (id === '_extra') s = G.ebLit ? 'blink' : G.extra > 0 ? 1 : 0;
      if (/^_bx\d$/.test(id)) s = G.bx >= +id[3] ? 1 : 0;
      let v = lampValue(s, t, lp.ph);
      if (lp.flashT > 0) { lp.flashT -= dt; v = 1; }
      if (show && lp.kind === 'insert') {
        const k = show.t / show.dur;
        if (show.kind === 'flash') v = (show.t * 8) % 1 < 0.5 ? 1 : 0.05;
        else if (show.kind === 'sweep') { const y = k * (L + 300) - 150; v = Math.max(v, Math.exp(-Math.pow((lp.y - y) / 70, 2))); }
        else if (show.kind === 'chase') { const a = Math.atan2(lp.y - L / 2, lp.x - W / 2), ph = (a / TAU + k * 3) % 1; v = Math.max(v, ph < 0.18 ? 1 : 0); }
        else if (show.kind === 'out') v = 0;
      }
      if (G.tilted) v = 0;
      if (G.dark > 0.01 && lp.kind === 'insert') v *= 1 - G.dark * 0.92;
      lp.target = v;
      const rate = v > lp.level ? lp.fade * 2.2 : lp.fade;
      lp.level += (v - lp.level) * Math.min(1, dt * rate);
    }
  }

  // ── Input ────────────────────────────────────────────────────────────────
  G.setFlip = function (side, on) {
    const live = (G.state === 'play' || G.state === 'serve') && !G.tilted && !G.paused;
    const was = G.input[side]; G.input[side] = on;
    if (was !== on && live) {
      const fl = world.flips.filter(f => f.key === side);
      if (fl.length) {
        const fx = fl[0].x;
        if (on) { G.sfx('flipUp', { x: fx, vol: 0.85, vary: 0.08, gap: 0.02 }); G.haptic('light'); } else G.sfx('flipDn', { x: fx, vol: 0.6, gap: 0.02 });
      }
      for (const c of G.compList) if (c.onFlip) c.onFlip(side, on);
      R('flip', side, on);
      if (G.bonus) G.bonus.t = Math.min(G.bonus.t, 0.12);
    }
    for (const f of world.flips) if (f.key === side) f.pressed = live && on;
  };
  G.pullStart = function () {
    if (!G.waitPlunge || G.pulling) return false;
    G.pulling = true; G.pullT0 = G.time; G.pullDrag = 0; G.pull = 0; G.sfx('pull', { vol: 0.5, x: G.plunger ? G.plunger.x : W }); return true;
  };
  G.pullEnd = function () { if (G.pulling) { G.pulling = false; launch(G.pull); } };
  G.setMagna = function (on) { G.input.magna = on; for (const c of G.compList) if (c.onMagna) c.onMagna(on); };
  G.fire = function () { for (const c of G.compList) if (c.onFire && c.onFire()) return true; return false; };

  // ── Autopilot (tests and attract) ────────────────────────────────────────
  const auto = { on: false, skill: 1, t: 0, hold: { L: 0, R: 0 } };
  function autopilot(dt) {
    if (!auto.on) return;
    if (G.waitPlunge) { auto.t += dt; if (auto.t > 0.4) { auto.t = 0; launch(0.35 + Math.random() * 0.65); } return; }
    for (const side of ['L', 'R']) {
      if (auto.hold[side] > 0) { auto.hold[side] -= dt; if (auto.hold[side] <= 0) { G.setFlip(side, false); auto.hold[side] = -0.2; } continue; }
      if (auto.hold[side] < 0) { auto.hold[side] += dt; if (auto.hold[side] > 0) auto.hold[side] = 0; continue; }
      for (const f of world.flips) {
        if (f.key !== side) continue;
        for (const b of world.balls) {
          if (b.mode !== 'free' || b.lvl !== f.lvl) continue;
          const c = Math.cos(f.aRest), s = Math.sin(f.aRest), dx = b.x - f.x, dy = b.y - f.y, t = clamp(dx * c + dy * s, 0, f.len);
          const d = Math.hypot(dx - c * t, dy - s * t);
          if (d < 34 && b.vy < 150 && t > f.len * 0.2) {
            if ((b.autoSkip || 0) > G.time) continue;
            if (Math.random() > auto.skill) { b.autoSkip = G.time + 0.7; continue; }
            G.setFlip(side, true); auto.hold[side] = 0.12 + Math.random() * 0.08;
          }
        }
      }
    }
    if (G.input.magna === false && world.balls.some(b => b.mode === 'free' && b.y < 300 && (b.x < 50) && b.vy < -200) && Math.random() < 0.02 * auto.skill) { G.setMagna(true); G.later(0.8, () => G.setMagna(false)); }
  }

  // ── Main loop ─────────────────────────────────────────────────────────────
  let acc = 0, raf = 0, last = 0, speedMul = 1;
  function physics(dt) {
    acc += dt; let n = 0; const maxN = Math.ceil(0.06 / DT) * Math.max(1, speedMul);
    while (acc >= DT && n < maxN) { autopilot(DT); world.step(DT); acc -= DT; n++; }
    if (n >= maxN) acc = 0;
  }
  function frame(now) {
    raf = 0;
    if (G.paused || G.destroyed) return;
    const t0 = performance.now();
    const rdt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60; last = now;
    const dt = rdt * speedMul;
    if (G.state !== 'over') physics(dt);
    update(dt);
    if (G.destroyed) return;
    if (AU) {
      let v = 0, rv = 0, rs = '';
      for (const b of world.balls) { if (b.mode === 'free') v = Math.max(v, Math.hypot(b.vx, b.vy)); else if (b.mode === 'path') { const u = Math.abs(b.path.u); if (u > rv) { rv = u; rs = b.path.p.style === 'wire' ? 'wire' : 'plastic'; } } }
      AU.rollUpdate({ v, rv, rs }, G.paused || G.state === 'over');
      const mus = def.music || {}, modeOn = Object.keys(G.modes).length > 0;
      AU.musicTick(G.amb && AU.soundOn() && G.state !== 'over', def.id, mus.url, mus.samples, mus.rate, (G.mb || modeOn || G.bonus || (G.dm && G.dm.style === 'jackpot')) ? 0.5 : 1);
    }
    if (RC) RC.render(rdt);
    if (disp) disp.render((g, w, h) => dmdScene(g, w, h));
    const ms = performance.now() - t0; G.frameMs.push(ms); if (G.frameMs.length > 240) G.frameMs.shift();
    if (RC) RC.adapt(ms);
    if (G.finished) return;
    raf = requestAnimationFrame(frame);
  }
  G.kick = function () { if (!raf && !G.paused && !G.destroyed && !headless) { last = 0; raf = requestAnimationFrame(frame); } };
  G.pause = function () {
    if (G.paused) return; G.paused = true;
    for (const s of ['L', 'R']) G.setFlip(s, false); G.pulling = false;
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    if (AU) AU.suspend();
  };
  G.resume = function () { if (!G.paused) return; G.paused = false; if (AU) AU.resume(); G.kick(); };
  G.destroy = function () {
    G.destroyed = true; if (raf) cancelAnimationFrame(raf); raf = 0;
    if (AU) { AU.rollStop(); AU.musicStop(true); AU.hush(); }
    if (RC) RC.dispose();
  };
  G.renderOnce = function () { if (RC) RC.render(1 / 60); if (disp) disp.render((g, w, h) => dmdScene(g, w, h)); };
  G.resize = function () { if (RC) RC.resize(); if (disp) disp.render((g, w, h) => dmdScene(g, w, h)); };

  // ── Start ────────────────────────────────────────────────────────────────
  G.start = function () {
    G.time = 0; R('init');
    for (const c of G.compList) if (c.reset) c.reset();
    if (AU) AU.ctx();
    G.sfx('start', { vol: 0.7 });
    G.msg(def.name.toUpperCase(), def.intro || 'BALL 1 OF ' + G.balls0, { style: 'zoom', dur: 2.4 });
    startBall();
    if (!headless) G.kick();
  };
  if (thumb) { R('init'); for (const c of G.compList) if (c.reset) c.reset(); }

  // ── Headless simulation and test hooks ───────────────────────────────────
  G.autopilot = function (on, skill) { auto.on = !!on; auto.skill = skill == null ? 1 : skill; };
  G.speed = function (k) { speedMul = k; };
  G.sim = function (sec, skill, onStep) {
    const was = auto.on; auto.on = true; if (skill != null) auto.skill = skill;
    const n = Math.round(sec / DT); let fr = 0;
    for (let i = 0; i < n && G.state !== 'over'; i++) {
      autopilot(DT); world.step(DT); if (onStep) onStep(i);
      if (++fr >= 8) { update(DT * 8); fr = 0; }
    }
    if (G.state === 'over') { update(2); }
    auto.on = was; return G.snapshot();
  };
  G.run = function (sec) { const n = Math.round(sec / DT); let fr = 0; for (let i = 0; i < n && G.state !== 'over'; i++) { world.step(DT); if (++fr >= 8) { update(DT * 8); fr = 0; } } return G.snapshot(); };
  G.snapshot = function () {
    const fm = G.frameMs.slice().sort((a, b) => a - b);
    return {
      board: def.id, state: G.state, score: G.score, ballNo: G.ballNo, balls0: G.balls0, waitPlunge: G.waitPlunge, time: G.time, mb: G.mb, bx: G.bx, extra: G.extra, tilted: G.tilted,
      balls: world.balls.map(b => ({ x: +b.x.toFixed(1), y: +b.y.toFixed(1), z: +b.z.toFixed(1), vx: +b.vx.toFixed(0), vy: +b.vy.toFixed(0), lvl: b.lvl, mode: b.mode, locked: !!b.locked, mist: !!b.mist, still: +b.stillT.toFixed(2) })),
      st: G.st, stats: G.stats, b: JSON.parse(JSON.stringify(G.b, (k, v) => (v && typeof v === 'object' && v.isObject3D) ? undefined : v)), modes: Object.assign({}, G.modes), ballScores: G.ballScores.slice(), drains: G.drains.slice(), finished: G.finished, paused: G.paused,
      frame: fm.length ? { avg: +(fm.reduce((a, b) => a + b, 0) / fm.length).toFixed(2), p95: +fm[Math.floor(fm.length * 0.95)].toFixed(2), max: +fm[fm.length - 1].toFixed(2), n: fm.length } : null,
      render: RC ? RC.info() : null
    };
  };
  G.place = function (x, y, vx = 0, vy = 0, lvl = 'main') {
    let b = world.balls.find(x => !x.locked && !x.mist);
    if (!b) b = world.addBall(x, y, { lvl });
    world.place(b, x, y, lvl, vx, vy);
    G.waitPlunge = false; if (G.state === 'serve') G.state = 'play';
    return b;
  };
  G.addBallAt = function (x, y, vx = 0, vy = 0, lvl = 'main') { const b = world.addBall(x, y, { lvl, vx, vy }); return b; };
  G.updateFrame = update;

  // ── DMD scenes ─────────────────────────────────────────────────────────
  const touchUI = typeof window !== 'undefined' && (('ontouchstart' in window) || navigator.maxTouchPoints > 0);
  function dmdScene(g, Wd, Hd) {
    const cx = Wd / 2, lcd = disp && disp.type === 'lcd', t = performance.now() / 1000;
    const big = (s, y, size, x = cx) => bigText(g, s, x, y, size * Hd / 32, 'center', Wd - 4, def.display && def.display.font);
    const small = (s, x, y, a) => smallText(g, s, x, y * Hd / 32, a);
    const ink = lcd ? (def.display.ink || '#fff') : '#fff', ink2 = lcd ? (def.display.ink2 || '#9cf') : '#888';
    g.fillStyle = ink;
    if (lcd && def.display.bg) { def.display.bg(g, Wd, Hd, t, G); g.fillStyle = ink; }
    if (G.state === 'over') {
      if (Math.floor(G.overT * 3) % 2 === 0 || G.overT > 1.2) big('GAME OVER', 11, 17);
      small(fmt(G.score), cx, 23, 'center'); return;
    }
    const bn = G.bonus;
    if (bn) {
      if (bn.phase === 'tilt' || (bn.phase === 'end' && G.tilted)) { big('TILT', 13, 22); small('NO BONUS', cx, 24, 'center'); return; }
      if (bn.phase === 'lines' && bn.i < 0) { big('BONUS', 16, 22); return; }
      if (bn.phase === 'lines') { const l = bn.lines[bn.i]; small(l[0], cx, 2, 'center'); big(l[1] + ' x ' + fmt(l[2]), 20, 16); return; }
      if (bn.phase === 'mult') { small('BONUS MULTIPLIER', cx, 2, 'center'); big(bn.bx + 'X', 20, 20); return; }
      small('TOTAL BONUS', cx, 2, 'center'); big(fmt(bn.total), 20, 18); return;
    }
    const m = G.dm;
    if (m) {
      if (m.anim && def.anims && def.anims[m.anim]) { g.save(); def.anims[m.anim](g, m.t, Wd, Hd, m); g.restore(); g.fillStyle = ink; }
      if (m.style === 'flash' && Math.floor(m.t * 8) % 2) { g.fillRect(0, 0, Wd, Hd); g.fillStyle = '#000'; }
      if (m.style === 'jackpot') {
        g.strokeStyle = lcd ? ink2 : '#777'; g.lineWidth = 1;
        for (let i = 0; i < 3; i++) { const rr = ((m.t * 90 + i * 40) % 120) * Wd / 160; g.beginPath(); g.ellipse(cx, Hd / 2, rr, rr * 0.3, 0, 0, TAU); g.stroke(); }
        for (let s = 0; s < 18; s++) { g.fillStyle = Math.random() < 0.5 ? ink : ink2; g.fillRect(Math.random() * Wd | 0, Math.random() * Hd | 0, 1, 1); }
        g.fillStyle = Math.floor(m.t * 10) % 2 ? ink : (lcd ? ink2 : '#bbb');
      }
      let x = cx; const y = m.sub ? 11 : 16, sz = m.sub ? 17 : 21;
      if (m.style === 'slide') x = cx + Math.max(0, 1 - m.t / 0.18) * Wd;
      if (m.style === 'creep') {
        for (let d = 0; d < 10; d++) { const dx2 = (d * 37 + 11) % (Wd - 10) + 5, dl = ((m.t * 14 + d * 3) % 9); g.fillStyle = lcd ? ink2 : '#999'; g.fillRect(dx2, (m.sub ? 18 : 25) * Hd / 32 + dl, 1, 1); }
        g.fillStyle = Math.random() < 0.1 ? '#555' : ink;
      }
      if (m.style === 'zoom' || m.style === 'jackpot') { const z = Math.min(1, 0.25 + m.t / 0.22 * 0.75); g.save(); g.translate(cx, y * Hd / 32); g.scale(z, z); bigText(g, m.text, 0, 0, sz * Hd / 32, 'center', Wd - 4, def.display && def.display.font); g.restore(); }
      else big(m.text, y, sz, x);
      if (m.sub) { if (m.style === 'jackpot') g.fillStyle = ink; small(m.sub, x, 23, 'center'); }
      return;
    }
    if (def.dmdIdle && def.dmdIdle(g, Wd, Hd, t, G)) return;
    small('BALL ' + Math.min(G.ballNo, G.balls0), 1, 0);
    const right = G.mult > 1 ? 'SCORE x' + G.mult : G.bx > 1 ? 'BONUS ' + G.bx + 'x' : (def.short || '').toUpperCase();
    small(right, Wd - 1, 0, 'right');
    big(fmt(G.shownScore || 0), 15.5, 17);
    let st = G.waitPlunge ? (Math.floor(t / 2.2) % 2 ? (R('status') || '') : (touchUI ? 'PULL DOWN ON THE RIGHT TO LAUNCH' : 'HOLD SPACE TO LAUNCH')) : (R('status') || '');
    if (G.tiltM >= 1.9 && !G.tilted) st = 'CAREFUL: TILT WARNING';
    st = String(st).toUpperCase();
    const w = smallW(st);
    if (w <= Wd - 2) small(st, cx, 25, 'center');
    else { const off = (t * 32) % (w + 60); small(st, Wd - off, 25); small(st, Wd - off + w + 60, 25); }
  }
  G.dmdScene = dmdScene;
  return G;
}

// small convex hull for rubber bands
function convex(pts) {
  const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  up.pop(); lo.pop(); return lo.concat(up);   // counter-clockwise
}

// ═══════════════════════════════════════════════════════════════════════════
// Scene: renderer, camera, lights, playfield, cabinet, balls, effects
// ═══════════════════════════════════════════════════════════════════════════
function buildScene(G, T, opts) {
  const { W, L, theme, def, world } = G;
  const renderer = opts.renderer;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(theme.room || '#07060b');
  const mats = new Materials(theme);
  const root = new THREE.Group();
  root.rotation.x = -PI / 2 + TILT; root.scale.setScalar(0.001);
  scene.add(root);
  // centre the table on the world origin
  const cvec = new THREE.Vector3(W / 2, L / 2, 0).applyEuler(root.rotation).multiplyScalar(0.001);
  root.position.copy(cvec).multiplyScalar(-1);
  root.updateMatrixWorld(true);
  const RC = { THREE, scene, root, mats, batch: new Batch(), theme, W, L, G, T, renderer, disposables: [], lights: {}, anim: [] };
  const tex = (c, o) => { const t = canvasTex(c, o); RC.disposables.push(t); return t; };
  RC.tex = tex;
  const thumb = !!opts.thumb, quality = opts.quality != null ? opts.quality : 2;
  RC.quality = quality;

  // ── Environment for reflections: a dark arcade with a few warm and coloured light panels ──
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  envScene.background = new THREE.Color('#050407');
  const panel = (col, k, w, h, x, y, z, ry = 0, rx = 0) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(k), side: THREE.DoubleSide })); m.position.set(x, y, z); m.rotation.set(rx, ry, 0); envScene.add(m); };
  panel('#fff4e0', 1.3, 5, 0.6, 0, 4, -1, 0, PI / 2);      // ceiling strip
  panel('#ffe6c8', 0.5, 3, 1.4, 0, 1.6, 5);               // softbox behind the player
  panel(theme.env[0], 0.45, 1.6, 1.6, -5, 1.5, 0, PI / 2);
  panel(theme.env[1], 0.4, 1.6, 1.6, 5, 1.5, -1, -PI / 2);
  panel(theme.env[2] || theme.env[0], 0.35, 3, 0.6, 0, 1.2, -6);
  const envRT = pmrem.fromScene(envScene, 0.035);
  scene.environment = envRT.texture; RC.disposables.push(envRT);
  envScene.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
  pmrem.dispose();

  // ── Playfield textures: art, insert glow colours, lamp ids ──
  const big = quality >= 2 && !thumb;
  const k = thumb ? 1 : big ? 2.6 : 2;   // px per mm
  const cw = Math.round(W * k), ch = Math.round(L * k);
  const artC = canvas(cw, ch), glowC = canvas(cw, ch), idC = canvas(Math.round(W * k / 2), Math.round(L * k / 2));
  const setup = (c, kk) => { const g = c.getContext('2d'); g.setTransform(kk, 0, 0, -kk, 0, L * kk); return g; };
  const ag = setup(artC, k), gg = setup(glowC, k), ig = setup(idC, k / 2);
  const P = painter(ag, W, L, k);
  P.theme = theme; P.T = T; P.G = G;
  // base
  ag.fillStyle = theme.playfield || '#2a2230'; ag.fillRect(0, 0, W, L);
  if (def.art && def.art.playfield) def.art.playfield(P);
  T.arts.filter(a => a.layer === 'under').forEach(a => a.fn(P));
  // contact shadows (baked AO) under walls, posts and toys
  ag.save(); ag.globalCompositeOperation = 'multiply';
  for (const s of T.aos) {
    ag.shadowColor = 'rgba(0,0,0,' + (s.a || 0.5) + ')'; ag.shadowBlur = (s.blur || 7) * k; ag.shadowOffsetX = 2 * k; ag.shadowOffsetY = 3 * k;
    ag.fillStyle = 'rgba(0,0,0,' + ((s.a || 0.5) * 0.6) + ')'; ag.strokeStyle = ag.fillStyle;
    if (s.kind === 'line') { ag.lineWidth = s.w; ag.lineCap = 'round'; ag.lineJoin = 'round'; P.line(s.pts).stroke(); }
    else if (s.kind === 'dot') { P.circle(s.x, s.y, s.r).fill(); }
    else if (s.kind === 'poly') { P.poly(s.pts).fill(); }
  }
  ag.restore();
  // inserts: unlit look in the art, lit colour in the glow map, lamp index in the id map
  for (const lp of T.inserts) drawInsert(lp, ag, gg, ig, P);
  T.arts.filter(a => a.layer === 'over').forEach(a => a.fn(P));
  if (def.art && def.art.overlay) def.art.overlay(P);
  // holes and windows: transparent
  ag.save(); ag.globalCompositeOperation = 'destination-out';
  for (const h of T.holes) if (!h.lvl || h.lvl === 'main') { P.circle(h.x, h.y, h.r).fill(); }
  for (const w of T.windows) { P.poly(w.poly).fill(); }
  ag.restore();
  // dark rims round holes
  for (const h of T.holes) if (!h.lvl || h.lvl === 'main') { ag.strokeStyle = h.rim || 'rgba(20,20,24,.9)'; ag.lineWidth = 2.2; P.circle(h.x, h.y, h.r + 1).stroke(); ag.strokeStyle = 'rgba(200,200,210,.35)'; ag.lineWidth = 0.8; P.circle(h.x, h.y, h.r + 2.4).stroke(); }
  // lamp id texture: snap partially covered pixels
  { const g = idC.getContext('2d'), im = g.getImageData(0, 0, idC.width, idC.height), d = im.data;
    for (let i = 0; i < d.length; i += 4) { if (d[i + 3] >= 200) { d[i] = Math.round(d[i]); d[i + 3] = 255; } else { d[i] = d[i + 1] = d[i + 2] = d[i + 3] = 0; } }
    g.putImageData(im, 0, 0); }
  const artT = tex(artC, { aniso: 8 }), glowT = tex(glowC), idT = tex(idC, { linear: true, nearest: true });
  const lampData = new Uint8Array(256 * 4), lampTex = new THREE.DataTexture(lampData, 256, 1, THREE.RGBAFormat);
  lampTex.needsUpdate = true; RC.disposables.push(lampTex);
  const pfMat = new THREE.MeshPhysicalMaterial({ map: artT, roughness: theme.pfRough, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.07, alphaTest: 0.5, transparent: false, envMapIntensity: 0.6 });
  const lampU = { lampIdMap: { value: idT }, lampLevels: { value: lampTex }, insertMap: { value: glowT }, lampGain: { value: theme.lampGain } };
  RC.lampU = lampU;
  pfMat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, lampU);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D lampIdMap; uniform sampler2D lampLevels; uniform sampler2D insertMap; uniform float lampGain;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n{ float lid = floor(texture2D(lampIdMap, vMapUv).r * 255.0 + 0.5); float lv = texture2D(lampLevels, vec2((lid + 0.5) / 256.0, 0.5)).r; vec3 ic = texture2D(insertMap, vMapUv).rgb; totalEmissiveRadiance += ic * ic * lv * lampGain; }');
  };
  pfMat.customProgramCacheKey = () => 'pf-lamps';
  const pfGeo = new THREE.PlaneGeometry(W, L); pfGeo.translate(W / 2, L / 2, 0);
  const pf = new THREE.Mesh(pfGeo, pfMat); pf.receiveShadow = true; root.add(pf);
  // shadow pass must respect the cut-outs
  pf.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: artT, alphaTest: 0.5 });
  RC.pf = pf; RC.pfMat = pfMat; RC.artCanvas = artC;
  // under the playfield: dark wood, so holes look deep
  const under = new THREE.Mesh(new THREE.PlaneGeometry(W, L), mats.paint('#0b0a0c', { roughness: 1 })); under.position.set(W / 2, L / 2, -70); root.add(under);

  // ── Cabinet: side boards, rails, apron, lockdown bar, backboard, backbox ──
  buildCabinet(RC);

  // ── Static scenery (walls, posts, rubbers, plastics, models) ──
  for (const s of T.statics) buildStatic(RC, s);

  // ── Components' meshes ──
  for (const c of G.compList) if (c.mesh) c.mesh(RC);

  // ── Insert bulbs, flashers ──
  for (const lp of T.bulbs) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(lp.r || 3.2, 12, 8), new THREE.MeshStandardMaterial({ color: '#222', emissive: lp.color, emissiveIntensity: 0, roughness: 0.3, transparent: true, opacity: 0.95 }));
    m.position.set(lp.x, lp.y, lp.z || 8); root.add(m); lp.mesh = m; lp.k = lp.k || 4;
  }
  for (const lp of T.flashers) {
    const g = latheGeo(lp.x, lp.y, [[0, 0], [lp.r || 11, 0], [lp.r || 11, 4], [(lp.r || 11) * 0.95, 9], [(lp.r || 11) * 0.7, 15], [(lp.r || 11) * 0.35, 18.5], [0, 19.5]], 20);
    g.translate(0, 0, lp.z0 || 0);
    const m = new THREE.Mesh(g, new THREE.MeshPhysicalMaterial({ color: shade(lp.color, -0.2), emissive: lp.color, emissiveIntensity: 0.05, roughness: 0.15, transmission: 0, transparent: true, opacity: 0.85, clearcoat: 1 }));
    root.add(m); lp.mesh = m; lp.k = 9;
    const base = new THREE.Mesh(cylGeo(lp.x, lp.y, (lp.r || 11) + 2, (lp.z0 || 0) - 1, (lp.z0 || 0) + 1.5, 20), mats.plastic('#1b1b1f')); root.add(base);
  }

  // ── Lights ──
  const hemi = new THREE.HemisphereLight(theme.sky || '#c8c0ff', '#1a120c', theme.ambient); scene.add(hemi);
  const key = new THREE.DirectionalLight(theme.keyColor || '#fff1dc', theme.key);
  const toWorld = (x, y, z) => new THREE.Vector3(x, y, z).applyMatrix4(root.matrixWorld);
  key.position.copy(toWorld(W * 0.42, L * 1.25, 900)); key.target.position.copy(toWorld(W / 2, L * 0.45, 0));
  scene.add(key); scene.add(key.target);
  if (!thumb) {
    key.castShadow = true; key.shadow.mapSize.set(quality >= 2 ? 2048 : 1024, quality >= 2 ? 2048 : 1024);
    const sc = key.shadow.camera; sc.left = -0.42; sc.right = 0.42; sc.top = 0.72; sc.bottom = -0.72; sc.near = 0.2; sc.far = 2.6;
    key.shadow.bias = -0.0004; key.shadow.normalBias = 0.0015; key.shadow.radius = 3;
  }
  RC.lights = { hemi, key };
  // general illumination: warm point lights along the sides
  const giPos = theme.giPos || [[30, 260], [W - 70, 260], [40, 700], [W - 60, 700]];
  RC.lights.gi = giPos.map((p, i) => { const l = new THREE.PointLight(theme.gi[i % theme.gi.length], 0.03, 0.6, 2); l.position.set(p[0], p[1], p[2] || 90); root.add(l); l.userData.base = 0.03 * theme.giLevel * (p[3] || 1); return l; });
  // flasher pool
  RC.lights.flash = [0, 1].map(() => { const l = new THREE.PointLight('#fff', 0, 0.5, 2); root.add(l); return l; });
  // lights-out ball lamps
  RC.lights.ball = [0, 1].map(() => { const l = new THREE.PointLight(theme.darkLight || '#fff2d8', 0, 0.22, 2); root.add(l); return l; });
  // lightning: a cold directional flash
  const bolt = new THREE.DirectionalLight('#cfe0ff', 0); bolt.position.copy(toWorld(W * 0.2, L * 0.9, 700)); bolt.target.position.copy(toWorld(W / 2, L / 2, 0)); scene.add(bolt); scene.add(bolt.target);
  RC.lights.bolt = bolt;

  // ── Balls ──
  const ballGeo = new THREE.SphereGeometry(BR, 32, 20);
  const shadowMat = new THREE.MeshBasicMaterial({ map: tex(glowCanvas(64, [[0, 'rgba(0,0,0,.75)'], [0.5, 'rgba(0,0,0,.35)'], [1, 'rgba(0,0,0,0)']])), transparent: true, depthWrite: false, toneMapped: false });
  const ballMeshes = new Map();
  RC.ballMesh = function (b) {
    let m = ballMeshes.get(b);
    if (!m) {
      const mesh = new THREE.Mesh(ballGeo, mats.ball(b.power)); mesh.castShadow = true;
      const sh = new THREE.Mesh(new THREE.PlaneGeometry(BR * 3.2, BR * 3.2), shadowMat); sh.renderOrder = 1;
      root.add(mesh); root.add(sh);
      m = { mesh, sh, q: new THREE.Quaternion() };
      if (b.mist) { mesh.material = new THREE.MeshStandardMaterial({ color: '#cfffe8', emissive: '#7dffc0', emissiveIntensity: 1.6, transparent: true, opacity: 0.85, roughness: 0.2 }); const glow = new THREE.Mesh(new THREE.PlaneGeometry(BR * 6, BR * 6), mats.glow('#8dffc8')); glow.renderOrder = 3; mesh.add(glow); m.glow = glow; }
      ballMeshes.set(b, m);
    }
    return m;
  };
  RC.dropBall = function (b) { const m = ballMeshes.get(b); if (!m) return; root.remove(m.mesh); root.remove(m.sh); if (m.glow) m.glow.material.dispose(); ballMeshes.delete(b); };
  const axis = new THREE.Vector3(), dq = new THREE.Quaternion();
  function updateBalls(dt) {
    const live = new Set();
    for (const b of world.balls) {
      live.add(b);
      const m = RC.ballMesh(b);
      const vis = !b.hidden;
      m.mesh.visible = vis; m.sh.visible = vis && b.mode !== 'air';
      if (!vis) continue;
      m.mesh.position.set(b.x, b.y, b.z + BR);
      const sp = Math.hypot(b.vx, b.vy);
      if (sp > 1 && b.mode !== 'held') { axis.set(-b.vy / sp, b.vx / sp, 0); dq.setFromAxisAngle(axis, sp * dt / BR); m.q.premultiply(dq); m.mesh.quaternion.copy(m.q); }
      let floor = (world.levels[b.lvl] || world.levels.main).z;
      if (b.mode === 'path') floor = b.path.p.style === 'wire' || b.path.p.style === 'tube' ? b.z - 30 : b.z;
      if (b.mode === 'air') floor = (world.levels[b.air.to] || world.levels.main).z;
      m.sh.position.set(b.x + 2, b.y - 3, floor + 0.4);
      const hgt = Math.max(0, b.z - floor);
      m.sh.material.opacity = 1; m.sh.scale.setScalar(1 + hgt / 60);
      if (b.mist && m.glow) { m.glow.quaternion.copy(m.q).invert(); m.mesh.material.opacity = 0.6 + 0.3 * Math.sin(G.time * 6); }
    }
    for (const b of Array.from(ballMeshes.keys())) if (!live.has(b)) RC.dropBall(b);
  }

  // ── Glass ──
  if (theme.glass !== false && !thumb) {
    const gc = canvas(256, 512), g = gc.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 256, 512);
    gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.32, 'rgba(255,255,255,0)'); gr.addColorStop(0.36, 'rgba(255,255,255,.5)'); gr.addColorStop(0.42, 'rgba(255,255,255,.1)'); gr.addColorStop(0.62, 'rgba(255,255,255,0)'); gr.addColorStop(0.7, 'rgba(255,255,255,.25)'); gr.addColorStop(0.73, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 256, 512);
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(W + 30, L + 30), new THREE.MeshBasicMaterial({ color: '#cfd8ff', map: tex(gc), transparent: true, opacity: 0.05, depthWrite: false, blending: THREE.AdditiveBlending }));
    glass.position.set(W / 2, L / 2, 96); glass.renderOrder = 10; root.add(glass); RC.glass = glass;
  }

  // ── Floating score text, sparks ──
  const pops = [];
  RC.popText = function (text, x, y, z, color) {
    if (thumb || pops.length > 8) return;
    const c = canvas(256, 64), g = c.getContext('2d');
    g.font = '900 40px "Arial Narrow", Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 6; g.strokeStyle = 'rgba(0,0,0,.7)'; g.strokeText(text, 128, 32); g.fillStyle = color || '#fff6d8'; g.fillText(text, 128, 32);
    const t = canvasTex(c); const m = new THREE.Mesh(new THREE.PlaneGeometry(64, 16), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, depthTest: false, toneMapped: false }));
    m.position.set(x, y, z || 30); m.rotation.x = PI / 2 - TILT - 0.5; m.renderOrder = 20; root.add(m);
    pops.push({ m, t, life: 1.1 });
  };
  const sparkGeo = new THREE.BufferGeometry(), SPN = 160, sp = new Float32Array(SPN * 3), sv = [];
  sparkGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  for (let i = 0; i < SPN; i++) { sv.push({ x: 0, y: 0, z: -999, vx: 0, vy: 0, vz: 0, life: 0 }); sp[i * 3 + 2] = -999; }
  const sparkMat = new THREE.PointsMaterial({ color: theme.spark || '#ffe2a8', size: 4, map: tex(glowCanvas(32)), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  const sparks = new THREE.Points(sparkGeo, sparkMat); sparks.frustumCulled = false; root.add(sparks);
  let spI = 0;
  RC.burst = function (x, y, z, n = 10, speed = 400, color) {
    if (thumb) return;
    if (color) sparkMat.color.set(color);
    for (let i = 0; i < n; i++) { const s = sv[spI = (spI + 1) % SPN], a = Math.random() * TAU, v = speed * (0.4 + Math.random() * 0.8); s.x = x; s.y = y; s.z = z; s.vx = Math.cos(a) * v; s.vy = Math.sin(a) * v; s.vz = 150 + Math.random() * 300; s.life = 0.3 + Math.random() * 0.35; }
  };
  function updateFx(dt) {
    for (let i = pops.length - 1; i >= 0; i--) { const p = pops[i]; p.life -= dt; p.m.position.z += dt * 28; p.m.material.opacity = Math.min(1, p.life * 2); if (p.life <= 0) { root.remove(p.m); p.m.geometry.dispose(); p.m.material.dispose(); p.t.dispose(); pops.splice(i, 1); } }
    for (let i = 0; i < SPN; i++) { const s = sv[i]; if (s.life <= 0) { sp[i * 3 + 2] = -999; continue; } s.life -= dt; s.vz -= 1800 * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.z = Math.max(1, s.z + s.vz * dt); sp[i * 3] = s.x; sp[i * 3 + 1] = s.y; sp[i * 3 + 2] = s.life > 0 ? s.z : -999; }
    sparkGeo.attributes.position.needsUpdate = true;
  }

  // ── Camera ──
  const camera = new THREE.PerspectiveCamera(40, 1, 0.05, 20);
  RC.camera = camera;
  const camBase = { pos: new THREE.Vector3(), look: new THREE.Vector3() };
  function fitCamera(aspect) {
    camera.aspect = aspect;
    const pts = [];
    const add = (x, y, z) => pts.push(new THREE.Vector3(x, y, z).applyMatrix4(root.matrixWorld));
    const fit = def.fit || {}, top = fit.top != null ? fit.top : 60, bot = fit.bottom != null ? fit.bottom : -40;
    add(-12, bot, 0); add(W + 12, bot, 0); add(-12, L + top * 0.2, 0); add(W + 12, L + top * 0.2, 0); add(W / 2, L + 4, top); add(-12, bot - 10, 105); add(W + 12, bot - 10, 105);
    const look = new THREE.Vector3(W / 2, L * (fit.lookY || 0.47), 0).applyMatrix4(root.matrixWorld);
    const portrait = aspect < 0.8;
    camera.fov = portrait ? 34 : 30;
    let best = null;
    const tmp = new THREE.Vector3();
    for (let phi = 26; phi <= 72; phi += 2) {
      const pr = phi * PI / 180, dir = new THREE.Vector3(0, Math.sin(pr), Math.cos(pr));
      let lo = 0.3, hi = 6;
      for (let it = 0; it < 26; it++) {
        const d = (lo + hi) / 2; camera.position.copy(look).addScaledVector(dir, d); camera.lookAt(look); camera.updateMatrixWorld(); camera.updateProjectionMatrix();
        let ok = true; for (const p of pts) { tmp.copy(p).project(camera); if (Math.abs(tmp.x) > 0.985 || Math.abs(tmp.y) > 0.985 || tmp.z > 1) { ok = false; break; } }
        if (ok) hi = d; else lo = d;
      }
      camera.position.copy(look).addScaledVector(dir, hi); camera.lookAt(look); camera.updateMatrixWorld(); camera.updateProjectionMatrix();
      let x0 = 9, x1 = -9, y0 = 9, y1 = -9;
      for (const p of pts) { tmp.copy(p).project(camera); x0 = Math.min(x0, tmp.x); x1 = Math.max(x1, tmp.x); y0 = Math.min(y0, tmp.y); y1 = Math.max(y1, tmp.y); }
      const area = (x1 - x0) * (y1 - y0);
      const score = area * (1 - (phi - 26) * (portrait ? 0.0028 : 0.006));
      if (!best || score > best.score) best = { score, phi, d: hi, dir };
    }
    if (fit.phi) { best.phi = fit.phi; }
    const pr = best.phi * PI / 180, dir = new THREE.Vector3(0, Math.sin(pr), Math.cos(pr));
    let lo = 0.3, hi = 6;
    for (let it = 0; it < 26; it++) {
      const d = (lo + hi) / 2; camera.position.copy(look).addScaledVector(dir, d); camera.lookAt(look); camera.updateMatrixWorld(); camera.updateProjectionMatrix();
      let ok = true; for (const p of pts) { tmp.copy(p).project(camera); if (Math.abs(tmp.x) > 0.985 || Math.abs(tmp.y) > 0.985 || tmp.z > 1) { ok = false; break; } }
      if (ok) hi = d; else lo = d;
    }
    camera.position.copy(look).addScaledVector(dir, hi); camera.lookAt(look);
    camBase.pos.copy(camera.position); camBase.look.copy(look); RC.phi = best.phi;
    camera.updateProjectionMatrix();
  }
  RC.fitCamera = fitCamera;

  // ── Post-processing ──
  let composer = null, bloom = null, size = new THREE.Vector2();
  function makeComposer(w, h) {
    if (composer) { composer.dispose(); composer = null; }
    if (thumb || quality < 1) return;
    const rt = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, samples: quality >= 2 ? 4 : 0 });
    composer = new EffectComposer(renderer, rt);
    composer.addPass(new RenderPass(scene, camera));
    bloom = new UnrealBloomPass(new THREE.Vector2(w / 2, h / 2), theme.bloom, 0.35, theme.bloomThreshold || 1.0);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
  }
  RC.resize = function () {
    const c = renderer.domElement, w = c.clientWidth || c.width, h = c.clientHeight || c.height;
    if (!w || !h) return;
    renderer.getSize(size);
    const dpr = Math.min(window.devicePixelRatio || 1, RC.maxDpr || 2);
    renderer.setPixelRatio(dpr); renderer.setSize(w, h, false);
    fitCamera(w / h);
    makeComposer(Math.round(w * dpr), Math.round(h * dpr));
  };
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = theme.exposure;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = !thumb; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  RC.resize();

  // ── Adaptive quality: drop bloom, then shadows, then resolution when frames run long ──
  let slowT = 0, level = 0;
  RC.adapt = function (ms) {
    if (thumb || opts.fixedQuality || window.__pinFixedQ) return;
    slowT = ms > 20 ? slowT + ms / 1000 : Math.max(0, slowT - ms / 3000);
    if (slowT > 1 && level < 3) {
      slowT = 0; level++;
      if (level === 1 && bloom) { bloom.enabled = false; }
      else if (level === 2) { renderer.shadowMap.enabled = false; scene.traverse(o => { if (o.material) o.material.needsUpdate = true; }); }
      else if (level === 3) { RC.maxDpr = 1.25; RC.resize(); }
    }
  };
  RC.info = () => ({ calls: renderer.info.render.calls, tris: renderer.info.render.triangles, geos: renderer.info.memory.geometries, texs: renderer.info.memory.textures, level, phi: RC.phi, bloom: !!(bloom && bloom.enabled) });

  // ── Per-frame render ──
  const flashPool = RC.lights.flash; let flashI = 0;
  RC.flashLight = function (x, y, z, color, k = 1) {
    const l = flashPool[flashI = (flashI + 1) % flashPool.length];
    l.position.set(x, y, z); l.color.set(color); l.userData.k = k;
  };
  const shakeV = new THREE.Vector3();
  RC.render = function (dt) {
    const t = G.time;
    // lamp levels -> texture (lamps sharing an id share an index: brightest wins)
    for (const lp of G.lampList) lampData[lp.idx * 4] = 0;
    for (const lp of G.lampList) {
      const v = Math.round(clamp(lp.level, 0, 1) * 255);
      if (v > lampData[lp.idx * 4]) lampData[lp.idx * 4] = v;
      if (lp.mesh) {
        const mat = lp.mesh.material; mat.emissiveIntensity = (lp.kind === 'flasher' ? 0.05 : 0) + lp.level * lp.k;
        if (lp.kind === 'flasher' && lp.level > 0.3 && !lp._lit) { RC.flashLight(lp.x, lp.y, (lp.z0 || 0) + 25, lp.color, lp.level); lp._lit = true; }
        if (lp.level < 0.3) lp._lit = false;
      }
    }
    lampTex.needsUpdate = true;
    for (const l of flashPool) { const k = l.userData.k || 0; l.intensity = k * 0.12; l.userData.k = k * Math.exp(-dt * 7); }
    // darkness (Lights Out), lightning, GI
    const dark = G.dark, light = G.lightning;
    const gi = (G.tilted ? 0.15 : G.giLevel) * (1 - dark * 0.97);
    for (const l of RC.lights.gi) l.intensity = l.userData.base * gi;
    RC.lights.key.intensity = theme.key * (1 - dark * 0.985) * (G.tilted ? 0.5 : 1);
    RC.lights.hemi.intensity = theme.ambient * (1 - dark * 0.92);
    RC.lights.bolt.intensity = light * 4.5;
    RC.lampU.lampGain.value = theme.lampGain * (1 - dark * 0.6);
    const live = world.balls.filter(b => !b.hidden);
    RC.lights.ball.forEach((l, i) => { const b = live[i]; if (b && dark > 0.02) { l.position.set(b.x, b.y - 10, b.z + 70); l.intensity = dark * 0.09; } else l.intensity = 0; });
    renderer.toneMappingExposure = theme.exposure * (1 - dark * 0.35) + light * 0.6;
    updateBalls(dt); updateFx(dt);
    for (const c of G.compList) if (c.render) c.render(dt, RC);
    for (const a of RC.anim) a(dt, t);
    // camera shake
    camera.position.copy(camBase.pos);
    if (G.shakeA > 0.01) { shakeV.set((Math.random() - 0.5), (Math.random() - 0.5), (Math.random() - 0.5)).multiplyScalar(G.shakeA * 0.0035); camera.position.add(shakeV); }
    camera.lookAt(camBase.look);
    if (composer && (!bloom || bloom.enabled)) composer.render(dt); else renderer.render(scene, camera);
  };
  RC.dispose = function () {
    scene.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) { (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { for (const k in m) if (m[k] && m[k].isTexture) m[k].dispose(); m.dispose(); }); } });
    RC.disposables.forEach(d => d.dispose && d.dispose());
    if (composer) composer.dispose();
    renderer.renderLists.dispose();
  };
  RC.toWorld = toWorld;
  // finally merge the static batch
  RC.batch.build(root);
  return RC;
}

// ── Inserts ─────────────────────────────────────────────────────────────────
function insertPath(P, lp, grow = 0) {
  const g = P.ctx, x = lp.x, y = lp.y, rot = (lp.rot || 0) * PI / 180, s = lp.shape || 'circle';
  const w = (lp.w || (lp.r || 7) * 2) + grow * 2, h = (lp.h || (lp.r || 7) * 2) + grow * 2;
  g.save(); g.translate(x, y); g.rotate(rot); g.beginPath();
  if (s === 'circle' || s === 'ring') g.arc(0, 0, w / 2, 0, TAU);
  else if (s === 'oval') g.ellipse(0, 0, w / 2, h / 2, 0, 0, TAU);
  else if (s === 'rect') { const r = Math.min(lp.round != null ? lp.round : 3, w / 2, h / 2); g.roundRect ? g.roundRect(-w / 2, -h / 2, w, h, r) : g.rect(-w / 2, -h / 2, w, h); }
  else if (s === 'arrow') { g.moveTo(0, h / 2); g.lineTo(w / 2, h / 2 - w * 0.55); g.lineTo(w / 2, -h / 2); g.lineTo(0, -h / 2 + w * 0.35); g.lineTo(-w / 2, -h / 2); g.lineTo(-w / 2, h / 2 - w * 0.55); g.closePath(); }
  else if (s === 'triangle') { g.moveTo(0, h / 2); g.lineTo(w / 2, -h / 2); g.lineTo(-w / 2, -h / 2); g.closePath(); }
  else if (s === 'diamond') { g.moveTo(0, h / 2); g.lineTo(w / 2, 0); g.lineTo(0, -h / 2); g.lineTo(-w / 2, 0); g.closePath(); }
  else if (s === 'shield') { g.moveTo(-w / 2, h / 2); g.lineTo(w / 2, h / 2); g.lineTo(w / 2, 0); g.quadraticCurveTo(w / 2, -h / 2, 0, -h / 2); g.quadraticCurveTo(-w / 2, -h / 2, -w / 2, 0); g.closePath(); }
  else if (s === 'star') { for (let i = 0; i < 10; i++) { const a = PI / 2 + i * PI / 5, r = (i % 2 ? 0.42 : 1) * w / 2; i ? g.lineTo(Math.cos(a) * r, Math.sin(a) * r) : g.moveTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); }
  else if (s === 'bar') { g.rect(-w / 2, -h / 2, w, h); }
  g.restore();
}
function drawInsert(lp, ag, gg, ig, P) {
  const col = lp.color, dark = shade(col, -0.62), mid = shade(col, -0.35), lit = shade(col, 0.35);
  const w = lp.w || (lp.r || 7) * 2;
  // art: recessed translucent plastic, dark when off
  ag.save();
  insertPath(P, lp, 1.4); ag.fillStyle = 'rgba(8,6,10,.85)'; ag.fill();
  insertPath(P, lp); const gr = ag.createRadialGradient(lp.x - w * 0.12, lp.y + w * 0.15, 0, lp.x, lp.y, w * 0.7);
  gr.addColorStop(0, mid); gr.addColorStop(1, dark); ag.fillStyle = gr; ag.fill();
  ag.lineWidth = 0.7; ag.strokeStyle = 'rgba(255,255,255,.28)'; ag.stroke();
  if (lp.shape === 'ring') { ag.beginPath(); ag.arc(lp.x, lp.y, w / 2 - (lp.ring || 4), 0, TAU); ag.fillStyle = P.theme.playfield || '#222'; ag.fill(); }
  ag.restore();
  // glow colour
  gg.save(); insertPath(P, lp, 0.2);
  const g2 = gg.createRadialGradient(lp.x, lp.y, 0, lp.x, lp.y, w * 0.75); g2.addColorStop(0, '#ffffff'); g2.addColorStop(0.35, lit); g2.addColorStop(1, col);
  gg.fillStyle = g2; gg.fill(); gg.restore();
  if (lp.shape === 'ring') { gg.save(); gg.beginPath(); gg.arc(lp.x, lp.y, w / 2 - (lp.ring || 4), 0, TAU); gg.fillStyle = '#000'; gg.fill(); gg.restore(); }
  // printed ink on the insert (stays dark when lit)
  if (lp.text) {
    const o = { size: lp.size || Math.min(w, lp.h || w) * 0.55, rot: (lp.rot || 0) + (lp.textRot || 0), font: lp.font || '"Arial Narrow", Arial, sans-serif', weight: '900', color: lp.ink || 'rgba(10,8,12,.92)', maxW: (lp.w || w) * 0.9 };
    P.text(lp.text, lp.x + (lp.tx || 0), lp.y + (lp.ty || 0), o);
    const gp = { ctx: gg }; const save = P.ctx; P.ctx = gg; Object.assign(o, { color: '#000' }); P.text(lp.text, lp.x + (lp.tx || 0), lp.y + (lp.ty || 0), o); P.ctx = save;
  }
  // id map (shape grown so the glow edge is covered)
  ig.save(); const save = P.ctx; P.ctx = ig; insertPath(P, lp, 2.2); P.ctx = save; ig.fillStyle = 'rgb(' + lp.idx + ',0,0)'; ig.fill(); ig.restore();
  // label printed beside (on the playfield)
  if (lp.label) P.text(lp.label, lp.x + (lp.lx || 0), lp.y + (lp.ly != null ? lp.ly : -(lp.h || w) / 2 - 6), { size: lp.labelSize || 7, color: lp.labelColor || '#f3e6c8', font: lp.labelFont, weight: '700', rot: lp.labelRot || 0 });
}

// ── Cabinet ────────────────────────────────────────────────────────────────
function buildCabinet(RC) {
  const { root, mats, theme, W, L, G, T, batch } = RC, def = G.def, art = def.art || {};
  // side boards (inside faces have art)
  const sideH = 110, sideZ0 = -40;
  const sideC = canvas(1024, 128), sg = sideC.getContext('2d');
  if (art.sides) art.sides(sg, 1024, 128);
  else { const gr = sg.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, shade(theme.cabinet, 0.15)); gr.addColorStop(1, shade(theme.cabinet, -0.4)); sg.fillStyle = gr; sg.fillRect(0, 0, 1024, 128); }
  const sideT = RC.tex(sideC);
  const sideMat = new THREE.MeshStandardMaterial({ map: sideT, roughness: 0.6 });
  [-1, 1].forEach(sd => {
    const x = sd < 0 ? -9 : W + 9;
    const g = new THREE.BoxGeometry(18, L + 220, sideH); g.translate(x, L / 2 - 60, sideZ0 + sideH / 2);
    // map the inside face uv along the length
    const m = new THREE.Mesh(g, [mats.wood(theme.wood), mats.wood(theme.wood), mats.paint(theme.cabinet), mats.paint(theme.cabinet), mats.paint(theme.cabinet), mats.paint(theme.cabinet)]);
    // inner face: a plane with the art
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(L + 220, sideH), sideMat);
    pl.rotation.set(PI / 2, sd < 0 ? PI / 2 : -PI / 2, 0); pl.position.set(sd < 0 ? 0.2 : W - 0.2, L / 2 - 60, sideZ0 + sideH / 2);
    if (sd > 0) pl.scale.x = -1;
    root.add(m); root.add(pl); m.receiveShadow = true; pl.receiveShadow = true;
    // side rail (metal channel on top)
    const rail = new THREE.Mesh(new THREE.BoxGeometry(26, L + 220, 8), theme.rails === 'black' ? mats.plastic('#1a1a1c', { roughness: 0.3 }) : theme.rails === 'gold' ? mats.brass() : mats.chrome());
    rail.position.set(sd < 0 ? -6 : W + 6, L / 2 - 60, sideZ0 + sideH + 4); root.add(rail);
  });
  // backboard: vertical panel behind the playfield
  const bbH = 150, bbC = canvas(1024, 300), bg = bbC.getContext('2d');
  if (art.backboard) art.backboard(bg, 1024, 300); else { bg.fillStyle = shade(theme.cabinet, -0.2); bg.fillRect(0, 0, 1024, 300); }
  const bb = new THREE.Mesh(new THREE.PlaneGeometry(W, bbH), new THREE.MeshStandardMaterial({ map: RC.tex(bbC), roughness: 0.5 }));
  bb.rotation.x = PI / 2; bb.position.set(W / 2, L + 0.5, bbH / 2 - 2); root.add(bb); bb.receiveShadow = true;
  // backbox: a cabinet head with the lit backglass
  const bxW = W + 60, bxH = 560, bxD = 200, bx = new THREE.Group();
  const box = new THREE.Mesh(new THREE.BoxGeometry(bxW, bxD, bxH), mats.paint(theme.cabinet, { roughness: 0.5 }));
  box.position.set(W / 2, L + 40 + bxD / 2, bbH + bxH / 2 + 10); bx.add(box);
  const bgC = canvas(512, 512), bgg = bgC.getContext('2d');
  if (art.backglass) art.backglass(bgg, 512, 512); else { bgg.fillStyle = '#222'; bgg.fillRect(0, 0, 512, 512); bgg.fillStyle = '#fff'; bgg.font = '900 60px sans-serif'; bgg.textAlign = 'center'; bgg.fillText(def.name, 256, 256); }
  const bgT = RC.tex(bgC);
  const glassM = new THREE.MeshStandardMaterial({ map: bgT, emissiveMap: bgT, emissive: '#ffffff', emissiveIntensity: 0.9, roughness: 0.15 });
  const bgl = new THREE.Mesh(new THREE.PlaneGeometry(bxW - 50, bxH - 140), glassM);
  bgl.rotation.x = PI / 2; bgl.position.set(W / 2, L + 39, bbH + 10 + 70 + (bxH - 140) / 2); bx.add(bgl);
  RC.backglass = { mesh: bgl, canvas: bgC, tex: bgT, mat: glassM };
  root.add(bx);
  // apron
  const ap = def.apron || { y: 108 };
  const apC = canvas(1024, 256), apg = apC.getContext('2d');
  const apGr = apg.createLinearGradient(0, 0, 0, 256); apGr.addColorStop(0, shade(theme.apron, 0.12)); apGr.addColorStop(1, shade(theme.apron, -0.3)); apg.fillStyle = apGr; apg.fillRect(0, 0, 1024, 256);
  if (art.apron) art.apron(apg, 1024, 256);
  const apT = RC.tex(apC);
  const acx = def.cx || 243, apronPoly = ap.poly || [[-2, -60], [T.lane.x0 - 2, -60], [T.lane.x0 - 2, ap.y + 4], [acx + 78, ap.y - 6], [acx + 44, ap.y - 42], [acx - 44, ap.y - 42], [acx - 78, ap.y - 6], [-2, ap.y + 4]];
  const apG = slabGeo(apronPoly, 28, 7, { bevel: 2, bevelSegments: 2 });
  planarUV(apG, [0, -60, T.lane.x0, ap.y + 10]);
  const apM = new THREE.Mesh(apG, new THREE.MeshStandardMaterial({ map: apT, roughness: 0.4, metalness: 0.2 }));
  apM.castShadow = true; apM.receiveShadow = true; root.add(apM);
  // lockdown bar and front
  const lock = new THREE.Mesh(new THREE.BoxGeometry(W + 60, 40, 14), theme.rails === 'black' ? mats.plastic('#18181a', { roughness: 0.3 }) : mats.chrome());
  lock.position.set(W / 2, -80, 72); root.add(lock);
  const front = new THREE.Mesh(new THREE.BoxGeometry(W + 36, 18, 160), mats.paint(theme.cabinet)); front.position.set(W / 2, -96, -10); root.add(front);
  // flipper buttons on the cabinet sides
  RC.buttons = [-1, 1].map(sd => { const m = new THREE.Mesh(new THREE.CylinderGeometry(9, 9, 10, 20), new THREE.MeshStandardMaterial({ color: theme.button || '#e8e2d8', roughness: 0.3, emissive: theme.button || '#e8e2d8', emissiveIntensity: 0.05 })); m.rotation.z = PI / 2; m.position.set(sd < 0 ? -22 : W + 22, 40, 20); root.add(m); return m; });
  RC.anim.push(() => { RC.buttons[0].position.x = G.input.L ? -20 : -23; RC.buttons[1].position.x = G.input.R ? W + 20 : W + 23; });
}

// ── Static scenery ────────────────────────────────────────────────────────────
function buildStatic(RC, s) {
  const { root, mats, theme, batch, T } = RC;
  const z0 = (s.lvl && T.levels[s.lvl]) ? T.levels[s.lvl].z : 0;
  const railMat = theme.rails === 'gold' ? mats.brass() : mats.chrome();
  switch (s.kind) {
    case 'wall': {
      const h = s.h || (s.style === 'wood' ? 34 : s.style === 'rubber' ? 12 : s.style === 'wire' ? 18 : 24);
      const zb = z0 + (s.z0 || 0);
      if (s.style === 'metal') { batch.add(railMat, wallGeo(s.pts, Math.max(2, s.r * 2), zb, zb + h)); }
      else if (s.style === 'wood') {
        batch.add(mats.paint(s.color || theme.wallColor || shade(theme.cabinet, 0.08), { roughness: 0.45 }), wallGeo(s.pts, s.r * 2, zb, zb + h, { bevel: 1.5 }));
        batch.add(railMat, wallGeo(s.pts, s.r * 2 + 0.6, zb + h, zb + h + 2.2, { bevel: 0.5 }));
      }
      else if (s.style === 'rubber') batch.add(mats.rubber(s.color || theme.rubber), wallGeo(s.pts, s.r * 2, zb + 4, zb + 4 + h, { bevel: 1 }));
      else if (s.style === 'plastic') batch.add(mats.clear(s.color || '#bfe6ff', 0.45), wallGeo(s.pts, s.r * 2, zb, zb + h, { bevel: 0.6 }));
      else if (s.style === 'wire') { const m = mats.chrome(); for (const zz of [6, 16]) batch.add(m, wallGeo(s.pts, 2.2, zb + zz, zb + zz + 2.2, { bevel: 0.6 })); }
      break;
    }
    case 'post': {
      const h = s.h || (s.style === 'peg' ? 18 : 26);
      if (s.style === 'metal') { batch.add(railMat, cylGeo(s.x, s.y, s.r, z0, z0 + h, 16)); batch.add(railMat, sphereGeo(s.x, s.y, z0 + h, s.r * 0.9, 12)); }
      else if (s.style === 'peg') { batch.add(railMat, cylGeo(s.x, s.y, s.r, z0, z0 + h, 12)); }
      else if (s.style === 'star') { batch.add(mats.plastic(s.color || theme.postColor || '#e8d080'), cylGeo(s.x, s.y, s.r + 2, z0, z0 + 22, 10)); batch.add(railMat, cylGeo(s.x, s.y, 2, z0 + 22, z0 + 32, 8)); }
      else {   // rubber post: plastic post with a rubber ring
        batch.add(mats.plastic(s.color || theme.postColor || '#f2efe6'), cylGeo(s.x, s.y, s.r - 2.5, z0, z0 + 30, 14));
        batch.add(mats.plastic(s.color || theme.postColor || '#f2efe6'), cylGeo(s.x, s.y, s.r - 0.5, z0 + 22, z0 + 30, 14));
        batch.add(railMat, cylGeo(s.x, s.y, 2.2, z0 + 30, z0 + 35, 8));
        batch.add(mats.rubber(theme.postRubber || theme.rubber), torusGeo(s.x, s.y, z0 + 11, s.r - 1.5, 2.6, 22));
      }
      break;
    }
    case 'rubber': {
      const pm = mats.plastic(theme.postColor || '#f2efe6');
      s.posts.forEach(p => { batch.add(pm, cylGeo(p[0], p[1], s.pr - 1, z0, z0 + 30, 14)); batch.add(railMat, cylGeo(p[0], p[1], 2.2, z0 + 30, z0 + 35, 8)); });
      const circles = s.posts.map(p => [p[0], p[1], s.pr]);
      import_band(batch, mats.rubber(s.color || theme.rubber), circles, s.th, z0 + 7, 9);
      break;
    }
    case 'plastic': {
      const th = 3, z = z0 + s.z;
      let mat;
      if (s.art) {
        const xs = s.poly.map(p => p[0]), ys = s.poly.map(p => p[1]), box = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
        const c = canvas(256, 256), g = c.getContext('2d'); g.translate(0, 256); g.scale(256 / (box[2] - box[0]), -256 / (box[3] - box[1])); g.translate(-box[0], -box[1]);
        s.art(g, box);
        mat = new THREE.MeshPhysicalMaterial({ map: RC.tex(c), roughness: 0.25, clearcoat: 1, transparent: true, opacity: s.opacity || 0.95 });
        const geo = slabGeo(s.poly, z, th, { bevel: 0.6, uvBox: box });
        const m = new THREE.Mesh(geo, mat); m.castShadow = true; root.add(m);
      } else batch.add(mats.clear(s.color || '#cfe6ff', s.opacity || 0.55, { depthWrite: true }), slabGeo(s.poly, z, th, { bevel: 0.6 }));
      break;
    }
    case 'model': { const o = s.fn(RC); if (o) root.add(o); break; }
  }
}
function import_band(batch, mat, circles, th, z, h) { batch.add(mat, bandGeoLocal(circles, th, z, h)); }
function bandGeoLocal(circles, th, z0, h) {
  const circ = (cs, extra) => { const out = []; cs.forEach(c => { for (let i = 0; i < 24; i++) { const a = i / 24 * TAU; out.push([c[0] + Math.cos(a) * (c[2] + extra), c[1] + Math.sin(a) * (c[2] + extra)]); } }); return out; };
  if (circles.length === 2) circles = circles.concat([[(circles[0][0] + circles[1][0]) / 2 + 0.01, (circles[0][1] + circles[1][1]) / 2 + 0.01, circles[0][2]]]);
  const outer = convex(circ(circles, th)), inner = convex(circ(circles, 0));
  const s = new THREE.Shape(); s.moveTo(outer[0][0], outer[0][1]); outer.slice(1).forEach(p => s.lineTo(p[0], p[1])); s.closePath();
  const hp = new THREE.Path(); hp.moveTo(inner[0][0], inner[0][1]); inner.slice(1).forEach(p => hp.lineTo(p[0], p[1])); hp.closePath(); s.holes.push(hp);
  const g = new THREE.ExtrudeGeometry(s, { depth: h - 1.6, bevelEnabled: true, bevelThickness: 0.8, bevelSize: 0.7, bevelSegments: 2, curveSegments: 4 });
  g.translate(0, 0, z0 + 0.8); return g;
}

// ═══════════════════════════════════════════════════════════════════════════
// Thumbnail: render a table once into a 2D canvas (setup screen cards)
// ═══════════════════════════════════════════════════════════════════════════
export function renderThumb(def, renderer, out) {
  const w = out.width, h = out.height;
  renderer.setPixelRatio(1); renderer.setSize(w, h, false);
  const G = createGame(def, { thumb: true, renderer, quality: 1 });
  const RC = G.T.R;
  RC.fitCamera(w / h);
  G.time = 0.5;
  RC.render(1 / 60);
  out.getContext('2d').drawImage(renderer.domElement, 0, 0, w, h);
  G.destroy();
}
