// ═══════════════════════════════════════════════════════════════════════════
// NEBULA RUN — deep space in chrome and black glass.
// Signature pieces: the GRAVITY WELL (a vertical powerfield with no flippers:
// the flipper buttons fire two magnets that fling the ball up to the top
// gate), the WARP LOOP (a supercharger: three coils speed the ball up each
// lap, with a speed readout), two PLAYER-AIMED BALL CANNONS, a CLEAR TUBE
// ramp across the playfield, a TELEPORTER (vanish here, flash out there),
// a shaking FLYING SAUCER, and the ANTIMATTER BALL (a light ceramic ball the
// magnets cannot touch). Modes: four planets, Warp Multiball, Saucer Attack,
// wizard mode EVENT HORIZON. The ship's computer talks, calmly.
// ═══════════════════════════════════════════════════════════════════════════
import * as THREE from 'three';
import { BR, spline, deg } from '../physics.js';
import { canvas, rng, shade, rgba, latheGeo, cylGeo, tubeGeo, boxGeo, torusGeo, sphereGeo, offsetLine } from '../gfx.js';
import { drawPath } from '../components.js';

const PI = Math.PI, TAU = PI * 2;
const PAL = { space: '#050816', deep: '#0a1030', ink: '#101a3c', cyan: '#22d3ee', ice: '#bff6ff', violet: '#8b7cff', magenta: '#ff5fd2', amber: '#ffb347', white: '#eef4ff', red: '#ff4d6d', green: '#5dffb0' };
const fmt = n => Math.round(n).toLocaleString('en-US');

// ── Layout constants ───────────────────────────────────────────────────────
const WELL_Z = 62, WELL_BOX = [58, 852, 194, 1008];          // the Gravity Well (vertical powerfield), top left
const LOOP_C = [348, 852], LOOP_R = 92, LOOP_Z = 66;         // the Warp Loop: a raised wire circle over the pops
const SAUCER = [300, 980];                                  // the flying saucer, top centre
const SHIP = [300, 733];                                     // the mothership drop-target bank
const TPIN = [222, 596], TPOUT = [455, 556];                 // teleporter pads
const SCOOP = [344, 516];                                    // Mission Control scoop
const CANL = [30, 618], CANR = [470, 1000];                   // the two cannons
const PLANETS = [['CINDER', PAL.red], ['VEIL', PAL.violet], ['HALO', PAL.amber], ['FROST', PAL.ice]];

export default {
  id: 'nebula', name: 'Nebula Run', short: 'NEBULA', diff: 2, color: '#22d3ee', wizard: 'the Event Horizon',
  desc: 'A deep-space run: a gravity well, a warp loop, two ball cannons and a saucer with a grudge.',
  intro: 'ALL SYSTEMS NOMINAL',
  display: { type: 'lcd', ink: '#e6fbff', ink2: '#22d3ee', bg: lcdBg, font: '"Bungee", "Arial Narrow", Arial' },
  music: { url: '../sounds/pinball/nebula.mp3', samples: 1024000, rate: 32000 },
  speech: { pitch: 1.05, rate: 0.92, voice: 'Samantha|Karen|Female|Google UK English Female' },
  rulesHtml:
    '<p>A run through deep space. The ship\'s computer keeps you posted.</p><ul>' +
    '<li><b>The Gravity Well:</b> the left ramp lifts the ball into a vertical field with no flippers. Tap the flipper buttons: each fires a magnet that flings the ball upward. Reach the top gate for an award, or to lock a ball when LOCK is lit (light it at the W-E-L-L targets). Three locks start <b>Warp Multiball</b>.</li>' +
    '<li><b>The Warp Loop:</b> the right ramp feeds a raised loop with three coils that speed the ball up every lap. Three laps and it fires out the far side: the display shows your warp speed, and faster laps score more. Six warp runs light the <b>antimatter ball</b>.</li>' +
    '<li><b>Ball cannons:</b> the far-left lane and the top of the right orbit load a turret. It sweeps; hold a flipper button to steer it and let go (or press FIRE) to shoot. Hit the mothership targets for a cannon jackpot.</li>' +
    '<li><b>Teleporter:</b> the pad left of centre swallows the ball; it reappears with a flash in the right orbit. Teleports count towards the planets.</li>' +
    '<li><b>Planets:</b> drop the three mothership targets to light a planet at Mission Control (the scoop on the right). Each planet is a timed mode with its own shots. Visit all four for Event Horizon.</li>' +
    '<li><b>The saucer:</b> hit it from the orbit or a cannon. Six hits start <b>Saucer Attack</b>: knock it off the table for a jackpot that grows.</li>' +
    '<li><b>Antimatter ball:</b> a white ceramic ball that the magnets cannot grab. Everything scores double while it is in play, but the Gravity Well will not hold it.</li>' +
    '<li><b>Skill shot:</b> a soft launch that stops on the lit LAUNCH PAD lane.</li>' +
    '<li><b>Event Horizon:</b> visit all four planets, play Warp Multiball and Saucer Attack, then shoot Mission Control: four balls, every shot a jackpot, the loop a super jackpot.</li></ul>',
  theme: {
    playfield: '#070b1c', cabinet: '#0b0f22', wood: '#1a1f36', rails: 'chrome', rubber: '#101418', postColor: '#1c2440', postRubber: '#0e1216',
    flipper: '#e9eef8', flipperRubber: '#1fb6d6', flipperStripe: '#0d6f88', popBody: '#161c34', apron: '#0a0e24', slingPlastic: '#0e1636',
    gi: ['#9ad8ff', '#7cc8ff', '#b0e4ff', '#8fd0ff', '#c8f0ff'], giPos: [[34, 250, 150], [440, 250, 150], [40, 640, 160], [446, 700, 160], [243, 900, 160, 0.8]], giLevel: 1.05,
    env: ['#9ad8ff', '#22d3ee', '#8b7cff'], sky: '#8aa8ff', keyColor: '#dde8ff', key: 1.0, ambient: 0.32, exposure: 1.05, bloom: 0.62, bloomThreshold: 1.0,
    spark: '#bff6ff', room: '#04050c', darkLight: '#cfe8ff', lampGain: 3.4, button: '#22d3ee', knob: '#dfe8f4', wallColor: '#1a2140'
  },
  art: { playfield: paintPlayfield, backglass: paintBackglass, apron: paintApron, sides: paintSides, backboard: paintBackboard, sling: slingArt },
  fit: { top: 120, lookY: 0.47 },
  anims: {},
  build,
  rules: makeRules()
};

// ═══════════════════════════════════════════════════════════════════════════
// BUILD
// ═══════════════════════════════════════════════════════════════════════════
function build(T) {
  const W = T.W, L = T.L;
  T.shooter({ min: 700, max: 3900 });
  T.lower({ flipColor: '#e9eef8', flipRubber: '#1fb6d6', bxColor: '#ffd166', saveColor: '#ff4d6d', extraColor: '#ffb347', bxY: 302 });
  buildLeft(T);
  buildRight(T);
  buildCentre(T);
  buildInserts(T);
  buildModels(T);
}
function buildLeft(T) {
  const [bx0, by0, bx1, by1] = WELL_BOX;
  // ── Far-left lane (the port side): comes round the top, funnels into the left cannon's hole ──
  T.wall([[2, 640], [4, 612], [14, 594], [30, 582], [50, 576]], { style: 'wood', r: 4, h: 34 });   // the lane's foot curves inward
  T.post(52, 576, { style: 'rubber', r: 5 });
  T.wall([[62, 700], [62, by0], [bx0, by0]], { style: 'metal', h: 26 });            // lane's inner guide
  T.post(62, 697, { style: 'rubber', r: 5 });
  const canL = T.cannon({ id: 'cannonL', x: 26, y: 604, load: [CANL[0], CANL[1], 14], rest: 30, min: 14, max: 58, power: 2900, barrel: 44, autoFire: 7, barrelMat: 'brass' });
  canL.z0 = 44; canL.sens.on = false;                                              // the hole is live only when lit; the turret sits on a pedestal over it
  T.kickback({ id: 'kickback', x: 28, y: 205, power: 2300, label: 'THRUSTER', color: PAL.cyan });
  // ── The Gravity Well block: a housing on the main floor; the vertical field sits on top ──
  // the housing's top follows the arch so no pocket is left above it
  const foot = [[bx0, by0], [bx1, by0], [bx1, 992], [bx0, 890]];
  T.wall(foot, { style: 'wood', r: 4, h: 44, color: '#141a30', closed: true });
  T.wall([[479, 794], [466, 772]], { style: 'metal', h: 24 });                      // a ball coming back down off the gate slides into the orbit lane
  T.powerfield({ id: 'well', lvlId: 'well', z: WELL_Z, box: WELL_BOX, magnets: [[102, 892, 'L'], [168, 930, 'R']], win: { comp: 'wellTop' }, lose: { x: 166, y: 812, vy: -220 }, floor: '#060a1a', color: PAL.cyan });
  // top gate: a hidden pocket that either locks the ball (lock lit) or drops it into the warp lane
  T.subway({ id: 'wellTop', hole: false, delay: 0.55, to: b => { const G = T.G, lk = G.comps.warpLock; return (G.b.lockLit && lk.count() < 3) ? { comp: 'warpLock' } : { x: 218, y: 980, vx: 12, vy: -320, lvl: 'main' }; } });
  T.ballLock({ id: 'warpLock', slots: [[106, 1032, 72], [136, 1032, 72], [166, 1032, 72]], hidden: false, exit: { x: 220, y: 972, vx: 8, vy: -300 } });
  // ── Gravity ramp: a chrome wireform from the left-centre up into the well ──
  T.ramp({ id: 'gravity', style: 'wire', w: 40, exitLvl: 'main', entryMin: 160, to: 'well', supportEvery: 120,
    pts: [[118, 600, 0], [122, 640, 4], [130, 700, 22], [138, 760, 42], [142, 800, 54], [142, 822, WELL_Z - 1], [140, 836, WELL_Z]] });
  T.post(97, 598, { style: 'rubber', r: 4.5 }); T.post(146, 604, { style: 'rubber', r: 5 });
  // lock targets: two flank the ramp mouth, one on the well's corner
  T.standupTarget({ id: 'lk0', x: 84, y: 816, angle: 270, w: 20, label: 'W', color: PAL.violet });
  T.standupTarget({ id: 'lk1', x: 160, y: 632, angle: 275, w: 20, label: 'E', color: PAL.violet });
  T.standupTarget({ id: 'lk2', x: 196, y: 820, angle: 300, w: 22, label: 'LL', color: PAL.violet });
  T.wall([[62, 640], [66, 640]], { style: 'invisible', mat: 'metal' });
  // ── Warp lane: between the well and the pops; the loop's exit and the orbit both drop into it ──
  T.wall([[246, 1000], [246, 866]], { style: 'metal', h: 26 });
  T.post(246, 863, { style: 'rubber', r: 5 });
  T.rolloverLane({ id: 'laneWarp', x: 218, y: 900, r: 11, color: PAL.cyan, lampDy: -30, shape: 'circle', lampR: 8, text: 'W', textSize: 9 });
}
function buildRight(T) {
  // ── Right orbit lane: up the starboard side, round the top past the saucer, down the warp lane ──
  T.wall([[432, 620], [432, 818]], { style: 'metal', h: 26 });
  T.post(432, 617, { style: 'rubber', r: 5 });
  T.orbit({ id: 'orbit', a: [434, 700, 478, 700], dirA: [0, 1], b: [192, 905, 246, 905], dirB: [0, -1], within: 4 });
  T.rolloverLane({ id: 'laneSkill', x: 455, y: 866, r: 11, color: PAL.amber, lampDy: 0, lampR: 0.1, insert: false });
  T.insert('laneSkill', 455, 836, { shape: 'oval', w: 26, h: 13, color: PAL.amber, text: 'PAD', size: 6 });
  // ── Top-right cannon: a hole at the top of the orbit (live when lit), the turret up on the corner ──
  const canR = T.cannon({ id: 'cannonR', x: CANR[0], y: CANR[1], rest: 230, min: 206, max: 250, power: 2900, barrel: 60, autoFire: 7, barrelMat: 'brass' });
  canR.z0 = 42;
  T.hole(455, 930, 18);
  canR.sens = T.world.sensor({ kind: 'circle', x: 455, y: 930, r: 13, on: false, id: 'cannonR', owner: canR });
  // ── Mission Control scoop (right of centre), hooded, kicks out towards the left flipper ──
  T.scoop({ id: 'mission', x: SCOOP[0], y: SCOOP[1], r: 12, eject: { angle: 238, speed: 1500 }, hold: 1.0 });
  // ── The Warp Loop ──
  makeWarpLoop(T);
  T.post(378, 636, { style: 'rubber', r: 5 }); T.post(424, 630, { style: 'rubber', r: 5 });
  T.wall([[424, 630], [432, 620]], { style: 'metal', h: 24 });
}
// A supercharger with an exit spur: climb to a raised circle, loop it `laps` times (three coils each lap add
// speed), then fly off down the spur into the warp lane. Built here because the engine's supercharger exits
// from the loop's closing point; ours needs the ball to come off somewhere useful.
function makeWarpLoop(T) {
  const climb = [[400, 628, 0], [404, 662, 4], [412, 702, 22], [422, 746, 50], [432, 792, 76], [439, 830, 92], [440, 852, LOOP_Z]];
  const circ = []; for (let i = 1; i <= 12; i++) { const a = i / 12 * TAU; circ.push([LOOP_C[0] + Math.cos(a) * LOOP_R, LOOP_C[1] + Math.sin(a) * LOOP_R, LOOP_Z]); }
  const spur = [[448, 884, 94], [458, 924, 90], [448, 968, 82], [404, 1012, 70], [330, 1036, 64], [258, 1030, 48], [220, 1000, 28], [211, 950, 8], [212, 906, 0]];
  const ctrl = climb.concat(circ, spur), pts = spline(ctrl, 6);
  const near = p => { let bi = 0, bd = 1e9; pts.forEach((q, i) => { const d = Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]); if (d < bd) { bd = d; bi = i; } }); return bi; };
  const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1], pts[i][2] - pts[i - 1][2]));
  const sA = cum[near(climb[6])], sB = cum[near(circ[11])], LAPS = 3, BOOST = 520;
  const comp = { id: 'warp', T, G: T.G, x: 400, y: 628, laps: LAPS, lapsDone: 0, speed: 0, best: 0, mags: [0.25, 0.58, 0.9].map((f, i) => ({ i, s: sA + (sB - sA) * f, glow: 0 })), glowAll: 0, active: 0 };
  const path = T.world.path({
    pts, style: 'wire', fric: 35, exitLvl: 'main', lvl: 'main',
    accel(P, w) {
      const b = P.ball || {};
      for (const m of comp.mags) { const k = 'm' + m.i + '_' + (P.lap || 0); if (P.s >= m.s - 6 && P.s < m.s + 40 && !P[k]) { P[k] = 1; if (!b.power) { P.u = Math.min(4600, P.u + BOOST * ((P.lap || 0) + 1)); m.glow = 1; comp.G.sfx('magClick', { x: 420, vol: 0.5 }); comp.G.sfx('coil', { x: 420, vol: 0.55, rate: 0.9 + (P.lap || 0) * 0.25 }); } else comp.G.sfx('metal', { x: 420, vol: 0.3 }); } }
      if (P.s >= sB && (P.lap || 0) < LAPS - 1) { P.lap = (P.lap || 0) + 1; P.s -= (sB - sA); comp.speed = P.u; comp.G.emit('superLap', 'warp', b, { lap: P.lap, speed: P.u }); }
      return 0;
    },
    onExit(b, u, e, w) { comp.active = 0; comp.speed = u; w.place(b, e[0], e[1] - 2, 'main', e[3] * u * 0.55, e[4] * u * 0.55); b.noPath = 0.5; comp.G.sfx('wireEnd', { x: 212, vol: 0.8 }); comp.G.emit('supercharger', 'warp', b, { speed: u, laps: (b.path && b.path.lap) || LAPS }); },
    onFail(b, u, e, w) { comp.active = 0; w.place(b, e[0] - e[3] * 3, e[1] - e[4] * 3, 'main', -e[3] * u, -e[4] * u); b.noPath = 0.4; comp.G.emit('rampFail', 'warp', b); }
  });
  comp.path = path;
  const t0 = [pts[3][0] - pts[0][0], pts[3][1] - pts[0][1]], tl = Math.hypot(t0[0], t0[1]); t0[0] /= tl; t0[1] /= tl;
  const n0 = [-t0[1], t0[0]];
  comp.onSensor = function (b) {
    if (b.noPath > 0) return; const u = b.vx * t0[0] + b.vy * t0[1]; if (u < 170) return;
    T.world.enterPath(b, path, u); b.path.lap = 0; b.path.ball = b; comp.active = 1; comp.lapsDone = 0;
    comp.G.sfx('gate', { x: 400, vol: 0.5 }); comp.G.emit('rampEnter', 'warp', b);
  };
  comp.sens = T.world.sensor({ kind: 'line', x1: pts[0][0] + n0[0] * 17, y1: pts[0][1] + n0[1] * 17, x2: pts[0][0] - n0[0] * 17, y2: pts[0][1] - n0[1] * 17, dir: t0, owner: comp, id: 'warp' });
  // invisible walls either side of the low part of the climb
  const low = pts.filter((p, i) => p[2] < 30 && i < pts.length / 2).map(p => [p[0], p[1]]);
  for (const d of [21, -21]) T.wall(offsetLine(low, d), { style: 'invisible', mat: 'metal', r: 2.5 });
  comp.trigger = function (speed = 2100) { const b = T.world.addBall(pts[0][0], pts[0][1], {}); T.world.enterPath(b, path, speed); b.path.lap = 0; b.path.ball = b; comp.active = 1; return b; };
  comp.update = function (dt) { comp.mags.forEach(m => m.glow = Math.max(0, m.glow - dt * 2.5)); if (!T.world.balls.some(b => b.mode === 'path' && b.path.p === path)) comp.active = 0; };
  comp.mesh = function (RC) {
    drawPath(RC, pts, 'wire', { w: 40, supportEvery: 95 });
    const copper = new THREE.MeshStandardMaterial({ color: '#c8794a', metalness: 1, roughness: 0.32 });
    comp.coils = comp.mags.map(m => {
      const p = T.world.pathAt(path, m.s), g = new THREE.Group(); g.position.set(p[0], p[1], p[2] - 11);
      const coil = new THREE.Mesh(new THREE.CylinderGeometry(9.5, 9.5, 14, 18), copper); coil.rotation.x = PI / 2; g.add(coil);
      const core = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 16, 12), RC.mats.iron()); core.rotation.x = PI / 2; g.add(core);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(11, 1.4, 8, 24), RC.mats.emissive(PAL.cyan, 0.2)); ring.position.z = 8; g.add(ring);
      g.traverse(o => { if (o.isMesh) o.castShadow = true; }); RC.root.add(g); return { g, ring };
    });
  };
  comp.render = function () { if (comp.coils) comp.coils.forEach((c, i) => { c.ring.material.emissiveIntensity = 0.2 + comp.mags[i].glow * 5; }); };
  comp.pts = pts; comp.sA = sA; comp.sB = sB;
  T.comp(comp);
  return comp;
}
function buildCentre(T) {
  // ── Pop bumpers ('asteroids') under the warp loop ──
  [['pop1', 312, 826], ['pop2', 388, 828], ['pop3', 350, 896]].forEach(([id, x, y]) => T.popBumper({ id, x, y, r: 22, color: '#5fe9ff', skirt: '#22d3ee', body: '#161c34', kick: 1250, capArt: popCap }));
  // ── The mothership: three drop targets facing the flippers; the hull is a model behind them ──
  T.dropTargetBank({ id: 'ship', x: SHIP[0], y: SHIP[1], angle: 270, n: 3, w: 24, gap: 4, labels: ['', '', ''], color: '#dfe8f4', art: shipTargetArt, resetDelay: 2.2 });
  // ── Teleporter: in-pad left of centre, out-pad in the right orbit ──
  T.subway({ id: 'tpIn', x: TPIN[0], y: TPIN[1], r: 12, style: 'teleport', color: PAL.cyan, delay: 0.9, maxV: 1600, to: { x: TPOUT[0], y: TPOUT[1], vx: 0, vy: 950, lvl: 'main' } });
  T.hole(TPOUT[0], TPOUT[1], 0.1);
  // ── Clear tube ramp: up the centre, over the mothership, across to the right and down to the right inlane ──
  T.ramp({ id: 'tube', style: 'tube', w: 40, tubeR: 17.5, color: '#dff6ff', opacity: 0.2, exitLvl: 'main', entryMin: 170, minExit: 320, supports: false,
    pts: [[262, 612, 0], [266, 648, 6], [276, 696, 30], [296, 742, 54], [328, 764, 66], [372, 752, 70], [410, 722, 70], [446, 692, 66], [462, 640, 58], [464, 570, 48], [454, 460, 32], [440, 386, 18], [427, 348, 8]] });
  T.post(238, 616, { style: 'rubber', r: 5 }); T.post(288, 614, { style: 'rubber', r: 5 });
  // ── The flying saucer: a shaking toy at the top of the arch; balls coming round the top hit it ──
  T.shakingToy({ id: 'saucer', x: SAUCER[0], y: SAUCER[1], r: 30, model: saucerModel });
  T.ao({ kind: 'dot', x: SAUCER[0], y: SAUCER[1], r: 38, a: 0.6, blur: 12 });
  // ── Centre standups: two 'ANTIMATTER' targets under the mothership's wings ──
  T.standupTarget({ id: 'am0', x: 296, y: 544, angle: 245, w: 20, label: '', color: PAL.white, art: amArt });
  T.standupTarget({ id: 'am1', x: 314, y: 574, angle: 245, w: 20, label: '', color: PAL.white, art: amArt });
  T.flasher('flShip', 318, 790, { color: PAL.cyan, r: 9, z0: 0 });
  T.flasher('flL', 110, 1000, { color: PAL.violet, r: 10, z0: 44 });
  T.flasher('flR', 470, 700, { color: PAL.magenta, r: 9, z0: 0 });
  T.flasher('flWell', 136, 790, { color: PAL.cyan, r: 8, z0: 0 });
  // GI bulbs down the sides and along the back
  [[14, 360], [14, 520], [470, 360], [470, 480], [16, 720], [250, 1040], [410, 1040], [470, 1020]].forEach((p, i) => T.bulb('gi' + i, p[0], p[1], 12, { color: '#9ad8ff', r: 3, k: 3, on: 1 }));
}
function popCap(g, w, h) {
  const gr = g.createRadialGradient(w * 0.42, h * 0.4, 0, w / 2, h / 2, w / 2); gr.addColorStop(0, '#f2ffff'); gr.addColorStop(0.45, '#5fe9ff'); gr.addColorStop(1, '#0b3a5c'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.strokeStyle = 'rgba(0,20,40,.55)'; g.lineWidth = 5; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(w / 2, h / 2, 36 + i * 30, 0, TAU); g.stroke(); }
  g.fillStyle = 'rgba(6,20,40,.85)'; g.font = '900 56px "Bungee", Impact'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('100', w / 2, h / 2 + 4);
}
function shipTargetArt(g, w, h, i) {
  g.fillStyle = '#dfe8f4'; g.fillRect(0, 0, w, h);
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#f6fbff'); gr.addColorStop(1, '#8aa0b8'); g.fillStyle = gr; g.fillRect(6, 6, w - 12, h - 12);
  g.fillStyle = '#0b1a33'; g.beginPath(); g.arc(w / 2, h * 0.46, 30, 0, TAU); g.fill();
  g.fillStyle = ['#ff4d6d', '#22d3ee', '#ffb347'][i]; g.beginPath(); g.arc(w / 2, h * 0.46, 18, 0, TAU); g.fill();
  g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.arc(w / 2 - 6, h * 0.46 - 6, 6, 0, TAU); g.fill();
}
function amArt(g, w, h) {
  g.fillStyle = '#eef4ff'; g.fillRect(0, 0, w, h); g.strokeStyle = '#0b1a33'; g.lineWidth = 6; g.strokeRect(8, 8, w - 16, h - 16);
  g.fillStyle = '#0b1a33'; g.beginPath(); g.arc(w / 2, h / 2, 28, 0, TAU); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(w / 2, h / 2, 14, 0, TAU); g.fill();
}
function buildInserts(T) {}
function buildModels(T) {}
function saucerModel(RC, toy) { const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.SphereGeometry(28, 20, 12), RC.mats.chrome())); return g; }

// ═══════════════════════════════════════════════════════════════════════════
// RULES
// ═══════════════════════════════════════════════════════════════════════════
function makeRules() {
  const R = {
    init(G) { G.b = { pops: 0 }; },
    event(G, type, id, b, d) { if (type === 'pop') G.b.pops++; },
    lamps(G) { return {}; },
    status(G) { return 'HIT THE POP BUMPERS'; },
    bonus(G) { return [['POPS', G.pbn('pop'), 200], ['SLINGS', G.pbn('sl'), 100]]; }
  };
  return R;
}

// ═══════════════════════════════════════════════════════════════════════════
// ART (canvas painters; table space, y up)
// ═══════════════════════════════════════════════════════════════════════════
function paintPlayfield(P) {
  const g = P.ctx, W = P.W, L = P.L;
  g.fillStyle = P.lin(0, 0, 0, L, [[0, '#070b1c'], [0.5, '#0a1030'], [1, '#060818']]); g.fillRect(0, 0, W, L);
}
function paintBackglass(g, w, h) { g.fillStyle = '#070b1c'; g.fillRect(0, 0, w, h); }
function paintApron(g, w, h) {}
function paintSides(g, w, h) { g.fillStyle = '#0b0f22'; g.fillRect(0, 0, w, h); }
function paintBackboard(g, w, h) { g.fillStyle = '#070b1c'; g.fillRect(0, 0, w, h); }
function slingArt(g, w, h, side) { g.fillStyle = '#0e1636'; g.fillRect(0, 0, w, h); }
function lcdBg(g, W, H, t, G) { g.fillStyle = '#02040c'; g.fillRect(0, 0, W, H); }
