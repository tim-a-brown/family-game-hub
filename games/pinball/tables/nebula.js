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
import { audio } from '../engine.js';

const PI = Math.PI, TAU = PI * 2;
const PAL = { space: '#050816', deep: '#0a1030', ink: '#101a3c', cyan: '#22d3ee', ice: '#bff6ff', violet: '#8b7cff', magenta: '#ff5fd2', amber: '#ffb347', white: '#eef4ff', red: '#ff4d6d', green: '#5dffb0' };
const fmt = n => Math.round(n).toLocaleString('en-US');

// ── Layout constants ───────────────────────────────────────────────────────
const WELL_Z = 62, WELL_BOX = [58, 852, 194, 1008];          // the Gravity Well (vertical powerfield), top left
const LOOP_C = [348, 852], LOOP_R = 92, LOOP_Z = 66;         // the Warp Loop: a raised wire circle over the pops
const SAUCER = [300, 992];                                  // the flying saucer, top centre
const SHIP = [300, 733];                                     // the mothership drop-target bank
const TPIN = [222, 596], TPOUT = [456, 668];                 // teleporter pads
const SCOOP = [344, 516];                                    // Mission Control scoop
const CANL = [30, 618], CANR = [470, 1000];                   // the two cannons
const PLANETS = [['CINDER', PAL.red], ['VEIL', PAL.violet], ['HALO', PAL.amber], ['FROST', PAL.ice]];

const LCD_STARS = []; { const r = rng(77); for (let i = 0; i < 70; i++) LCD_STARS.push([r() * 192, r() * 48, 0.3 + r() * 0.7]); }
function lcdBg(g, W, H, t, G) {
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#02030c'); gr.addColorStop(0.6, '#07102a'); gr.addColorStop(1, '#030514'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  const B = G && G.b || {}, warp = B.warpOn ? 1 : 0, sp = 6 + warp * 60;
  const n1 = g.createRadialGradient(W * 0.75, H * 0.7, 0, W * 0.75, H * 0.7, 70); n1.addColorStop(0, 'rgba(139,124,255,.28)'); n1.addColorStop(1, 'rgba(139,124,255,0)'); g.fillStyle = n1; g.fillRect(0, 0, W, H);
  const n2 = g.createRadialGradient(W * 0.2, H * 0.3, 0, W * 0.2, H * 0.3, 60); n2.addColorStop(0, 'rgba(34,211,238,.22)'); n2.addColorStop(1, 'rgba(34,211,238,0)'); g.fillStyle = n2; g.fillRect(0, 0, W, H);
  for (const s of LCD_STARS) { const x = ((s[0] - t * sp * s[2]) % W + W) % W; g.fillStyle = 'rgba(210,235,255,' + (0.25 + 0.5 * s[2]) + ')'; if (warp) g.fillRect(x, s[1], 2 + 10 * s[2], 1); else g.fillRect(x, s[1], 1, 1); }
}
const ANIMS = {
  warp(g, t, W, H) { for (let i = 0; i < 40; i++) { const r = ((i * 7919) % 100) / 100, y = (i * 13) % H, x = ((r * W + t * 260 * (0.4 + r)) % (W + 40)) - 20; g.fillStyle = 'rgba(160,240,255,' + (0.3 + r * 0.6) + ')'; g.fillRect(x, y, 6 + r * 22, 1); } },
  saucer(g, t, W, H) { const x = W - ((t * 90) % (W + 60)) + 30, y = 8 + Math.sin(t * 5) * 3; g.fillStyle = '#9ad8ff'; g.beginPath(); g.ellipse(x, y + 6, 16, 4, 0, 0, TAU); g.fill(); g.fillStyle = '#e6fbff'; g.beginPath(); g.ellipse(x, y + 2, 8, 5, 0, PI, TAU); g.fill(); g.fillStyle = Math.floor(t * 10) % 2 ? '#ff5fd2' : '#22d3ee'; for (let i = -1; i <= 1; i++) g.fillRect(x + i * 9 - 1, y + 7, 2, 2); },
  planet(g, t, W, H, m) { const col = (m && m.color) || '#ffb347', y = H + 30 - Math.min(1, t / 0.8) * 42; const gr = g.createRadialGradient(W - 34, y - 8, 4, W - 30, y, 28); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.4, col); gr.addColorStop(1, '#101010'); g.fillStyle = gr; g.beginPath(); g.arc(W - 30, y, 26, 0, TAU); g.fill(); },
  well(g, t, W, H) { g.strokeStyle = 'rgba(139,124,255,.8)'; g.lineWidth = 1; for (let i = 0; i < 5; i++) { const k = ((t * 0.8 + i / 5) % 1); g.beginPath(); g.ellipse(W - 28, H / 2, 4 + k * 26, 2 + k * 12, 0, 0, TAU); g.stroke(); } g.fillStyle = '#fff'; g.beginPath(); g.arc(W - 28, H / 2 - Math.min(1, t / 0.9) * 16 + 10, 3, 0, TAU); g.fill(); },
  cannon(g, t, W, H) { g.fillStyle = '#9ad8ff'; g.save(); g.translate(20, H - 8); g.rotate(-0.5 - Math.sin(t * 2) * 0.3); g.fillRect(0, -3, 24, 6); g.restore(); g.beginPath(); g.arc(20, H - 8, 7, 0, TAU); g.fill(); if (Math.floor(t * 6) % 3 === 0) { g.fillStyle = '#fff'; g.beginPath(); g.arc(44 + ((t * 300) % 60), H - 22, 2, 0, TAU); g.fill(); } },
  horizon(g, t, W, H) { g.strokeStyle = 'rgba(139,124,255,.9)'; g.lineWidth = 1.2; for (let i = 0; i < 4; i++) { const k = (t * 0.5 + i / 4) % 1; g.beginPath(); g.ellipse(W / 2, H / 2, 10 + k * 110, 3 + k * 30, 0, 0, TAU); g.stroke(); } g.fillStyle = '#000'; g.beginPath(); g.arc(W / 2, H / 2, 9, 0, TAU); g.fill(); g.strokeStyle = '#fff'; g.beginPath(); g.arc(W / 2, H / 2, 10, 0, TAU); g.stroke(); },
  teleport(g, t, W, H) { const k = Math.min(1, t / 0.5); g.fillStyle = 'rgba(34,211,238,' + (0.9 - k * 0.9) + ')'; g.fillRect(0, 0, W, H); for (let i = 0; i < 12; i++) { const a = i / 12 * TAU + t * 3; g.strokeStyle = 'rgba(200,255,255,.7)'; g.beginPath(); g.moveTo(W - 30 + Math.cos(a) * 6, H / 2 + Math.sin(a) * 6); g.lineTo(W - 30 + Math.cos(a) * 18, H / 2 + Math.sin(a) * 18); g.stroke(); } }
};

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
  anims: ANIMS,
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
  defineSounds(T);
}
// Table sounds: coils, the warp exit, the teleporter shimmer, the saucer's hull, the computer's soft beeps
function defineSounds(T) {
  if (T.headless) return;
  const A = audio();
  A.define('coil', 0.5, S => { S.osc('sine', 55, 0, 0.4, 0.35, { att: 0.01, to: 110 }); S.osc('sawtooth', 110, 0, 0.35, 0.05, { lp: 500, att: 0.02 }); S.noise(0, 0.03, 0.3, { bp: 1800, q: 3 }); S.ring(2600, 0.002, 0.2, 0.05); });
  A.define('warpOut', 1.2, S => { S.noise(0, 1.0, 0.3, { bp: 500, bpTo: 3200, q: 1.4, att: 0.05 }); S.osc('sine', 80, 0, 0.9, 0.3, { to: 240, att: 0.05 }); S.ring(3200, 0.05, 0.4, 0.08); S.bell(1046, 0.4, 0.7, 0.05); });
  A.define('teleport', 1.1, S => { for (let i = 0; i < 10; i++) S.bell(1400 + i * 180, i * 0.05, 0.5, 0.035); S.noise(0, 0.6, 0.12, { bp: 4000, bpTo: 9000, q: 4, att: 0.1 }); S.osc('sine', 200, 0, 0.8, 0.12, { to: 900, att: 0.1 }); });
  A.define('saucerHit', 0.7, S => { S.noise(0, 0.01, 0.5, { hp: 4000 }); S.ring(1900, 0, 0.6, 0.2, [1, 1.9, 3.1, 4.7]); S.osc('sine', 300, 0.02, 0.5, 0.08, { to: 180 }); S.osc('sine', 420, 0.1, 0.4, 0.05, { to: 390 }); });
  A.define('beep', 0.35, S => { S.bell(1568, 0, 0.12, 0.09); S.bell(2093, 0.12, 0.18, 0.08); });
  A.define('alarm', 1.4, S => { for (let i = 0; i < 3; i++) { S.bell(660, i * 0.45, 0.3, 0.12); S.bell(880, i * 0.45 + 0.15, 0.3, 0.1); } S.pad(110, 0, 1.3, 0.06, { lp: 700 }); });
}
function buildLeft(T) {
  const [bx0, by0, bx1, by1] = WELL_BOX;
  // ── Far-left lane (the port side): comes round the top, funnels into the left cannon's hole ──
  T.wall([[2, 640], [4, 612], [14, 594], [30, 582], [50, 576]], { style: 'wood', r: 4, h: 34 });   // the lane's foot curves inward
  T.wall([[62, 700], [62, by0], [bx0, by0]], { style: 'metal', h: 26 });            // lane's inner guide
  T.post(62, 697, { style: 'rubber', r: 5 });
  const canL = T.cannon({ id: 'cannonL', x: 26, y: 604, load: [CANL[0], CANL[1], 14], rest: 30, min: 14, max: 58, power: 2900, barrel: 44, autoFire: 7, barrelMat: 'brass' });
  canL.z0 = 44; canL.sens.on = false;                                              // the hole is live only when lit; the turret sits on a pedestal over it
  T.kickback({ id: 'kickback', x: 28, y: 205, power: 2300, label: 'THRUSTER', color: PAL.cyan });
  T.kickback({ id: 'kickbackR', x: 458, y: 205, power: 2300, label: 'THRUSTER', color: PAL.cyan });
  // ── The Gravity Well block: a housing on the main floor; the vertical field sits on top ──
  // the housing's top follows the arch so no pocket is left above it
  const foot = [[bx0, by0], [bx1, by0], [bx1, 992], [bx0, 890]];
  T.wall(foot, { style: 'wood', r: 4, h: 44, color: '#141a30', closed: true });
  T.wall([[479, 794], [466, 772]], { style: 'metal', h: 24 });                      // a ball coming back down off the gate slides into the orbit lane
  const well = T.powerfield({ id: 'well', lvlId: 'well', z: WELL_Z, box: WELL_BOX, magnets: [[102, 892, 'L'], [168, 930, 'R']], win: { comp: 'wellTop' }, lose: { x: 166, y: 812, vy: -220 }, floor: '#060a1a', color: PAL.cyan });
  // gentler magnets than the engine's: two or three well-timed taps to reach the gate, not one
  well.onFlip = function (side, on) {
    if (!on) return;
    for (const m of this.mags) if (m.side === side) { m.glow = 1; this.sfx('magClick');
      for (const b of this.world.balls) if (b.lvl === this.lvl && b.mode === 'free' && !b.power) { const dx = m.x - b.x, dy = m.y - b.y, d = Math.hypot(dx, dy); if (d < 80) { b.vx += dx / d * 380; b.vy = Math.max(b.vy, 0) * 0.5 + 520 + Math.random() * 160; T.G.sfx('coil', { vol: 0.5, x: m.x, rate: 1.2 }); if (T.R) T.R.burst(b.x, b.y, WELL_Z + 10, 8, 250, PAL.cyan); } } }
  };
  // top gate: a hidden pocket that either locks the ball (lock lit) or drops it into the warp lane
  T.subway({ id: 'wellTop', hole: false, delay: 0.55, to: b => { const G = T.G, lk = G.comps.warpLock; return (G.b.lockLit && lk.count() < 3) ? { comp: 'warpLock' } : { x: 218, y: 980, vx: 12, vy: -320, lvl: 'main' }; } });
  T.ballLock({ id: 'warpLock', slots: [[106, 1032, 72], [136, 1032, 72], [166, 1032, 72]], hidden: false, exit: { x: 220, y: 972, vx: 8, vy: -300 } });
  // ── Gravity ramp: a chrome wireform from the left-centre up into the well ──
  T.ramp({ id: 'gravity', style: 'wire', w: 40, exitLvl: 'main', entryMin: 160, to: 'well', supportEvery: 120,
    pts: [[118, 600, 0], [122, 640, 4], [130, 700, 22], [138, 760, 42], [142, 800, 54], [142, 822, WELL_Z - 1], [140, 836, WELL_Z]] });
  T.post(97, 598, { style: 'rubber', r: 4.5 }); T.post(146, 604, { style: 'rubber', r: 5 });
  // lock targets: two flank the ramp mouth, one on the well's corner
  T.standupTarget({ id: 'lk0', x: 84, y: 816, angle: 270, w: 20, label: 'W', color: PAL.violet });
  T.standupTarget({ id: 'lk1', x: 164, y: 630, angle: 240, w: 20, label: 'E', color: PAL.violet });
  T.standupTarget({ id: 'lk2', x: 200, y: 818, angle: 240, w: 22, label: 'LL', color: PAL.violet });
  T.wall([[62, 640], [66, 640]], { style: 'invisible', mat: 'metal' });
  // ── Warp lane: between the well and the pops; the loop's exit and the orbit both drop into it ──
  T.wall([[246, 936], [246, 866]], { style: 'metal', h: 26 });
  T.post(246, 863, { style: 'rubber', r: 5 }); T.post(246, 939, { style: 'rubber', r: 5 });
  T.rolloverLane({ id: 'laneWarp', x: 218, y: 900, r: 11, color: PAL.cyan, lampDy: -30, shape: 'circle', lampR: 8, text: 'W', textSize: 9 });
}
function buildRight(T) {
  // ── Right orbit lane: up the starboard side, round the top past the saucer, down the warp lane ──
  T.wall([[432, 640], [432, 818]], { style: 'metal', h: 26 });
  T.post(432, 637, { style: 'rubber', r: 5 });
  T.wall([[478, 646], [474, 614], [462, 596], [446, 586], [428, 580]], { style: 'wood', r: 4, h: 34 });   // the lane's foot curves inward
  T.post(426, 580, { style: 'rubber', r: 5 });
  T.orbit({ id: 'orbit', a: [434, 700, 478, 700], dirA: [0, 1], b: [192, 905, 246, 905], dirB: [0, -1], within: 4 });
  T.rolloverLane({ id: 'laneSkill', x: 455, y: 866, r: 11, color: PAL.amber, lampDy: 0, lampR: 0.1, insert: false });
  T.insert('laneSkill', 455, 836, { shape: 'oval', w: 26, h: 13, color: PAL.amber, text: 'PAD', size: 6 });
  // ── Top-right cannon: a hole at the top of the orbit (live when lit), the turret up on the corner ──
  const canR = T.cannon({ id: 'cannonR', x: CANR[0], y: CANR[1], rest: 230, min: 206, max: 250, power: 2900, barrel: 60, autoFire: 7, barrelMat: 'brass' });
  canR.z0 = 42;
  T.hole(455, 930, 18);
  canR.sens = T.world.sensor({ kind: 'circle', x: 455, y: 930, r: 13, on: false, id: 'cannonR', owner: canR });
  // ── Mission Control scoop (right of centre), hooded, kicks out towards the left flipper ──
  T.scoop({ id: 'mission', x: SCOOP[0], y: SCOOP[1], r: 12, eject: { angle: 232, speed: 1450 }, hold: 1.0 });
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
  const sA = cum[near(climb[6])], sB = cum[near(circ[11])], LAPS = 3, BOOST = 380;
  const comp = { id: 'warp', T, G: T.G, x: 400, y: 628, laps: LAPS, lapsDone: 0, speed: 0, best: 0, mags: [0.25, 0.58, 0.9].map((f, i) => ({ i, s: sA + (sB - sA) * f, glow: 0 })), glowAll: 0, active: 0 };
  const path = T.world.path({
    pts, style: 'wire', fric: 35, exitLvl: 'main', lvl: 'main',
    accel(P, w) {
      const b = P.ball || {};
      for (const m of comp.mags) { const k = 'm' + m.i + '_' + (P.lap || 0); if (P.s >= m.s - 6 && P.s < m.s + 40 && !P[k]) { P[k] = 1; if (!b.power) { const want = 1700 + 450 * (P.lap || 0); P.u = Math.max(P.u, Math.min(want, P.u + BOOST)); m.glow = 1; comp.G.sfx('magClick', { x: 420, vol: 0.5 }); comp.G.sfx('coil', { x: 420, vol: 0.55, rate: 0.9 + (P.lap || 0) * 0.25 }); } else comp.G.sfx('metal', { x: 420, vol: 0.3 }); } }
      if (P.s >= sB && (P.lap || 0) < LAPS - 1) { P.lap = (P.lap || 0) + 1; P.s -= (sB - sA); comp.speed = P.u; comp.G.emit('superLap', 'warp', b, { lap: P.lap, speed: P.u }); }
      return P.u > 2700 ? -(P.u - 2700) * 3 : 0;   // the wires sing but the ball cannot go faster than warp nine
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
      const coil = new THREE.Mesh(mergeGeos([cylGeo(0, 0, 9.5, -7, 7, 18), cylGeo(0, 0, 6, -8, 8, 12)]), copper); g.add(coil);
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
  T.subway({ id: 'tpIn', x: TPIN[0], y: TPIN[1], r: 12, style: 'teleport', color: PAL.cyan, delay: 0.9, maxV: 1600, to: { x: TPOUT[0], y: TPOUT[1], vx: 0, vy: 1100, lvl: 'main' } });
  T.hole(TPOUT[0], TPOUT[1], 0.1);
  // ── Clear tube ramp: up the centre, over the mothership, across to the right and down to the right inlane ──
  T.ramp({ id: 'tube', style: 'tube', w: 40, tubeR: 17.5, color: '#dff6ff', opacity: 0.2, exitLvl: 'main', entryMin: 170, minExit: 320, supports: false,
    pts: [[262, 612, 0], [266, 648, 6], [276, 696, 30], [296, 742, 54], [328, 764, 66], [372, 752, 70], [410, 722, 70], [446, 692, 66], [462, 640, 58], [464, 570, 48], [454, 460, 32], [446, 400, 16], [437, 362, 6], [430, 344, 2]], exitDamp: 0.8 });
  T.post(238, 616, { style: 'rubber', r: 5 }); T.post(288, 614, { style: 'rubber', r: 5 });
  // ── The flying saucer: a shaking toy at the top of the arch; balls coming round the top hit it ──
  T.shakingToy({ id: 'saucer', x: SAUCER[0], y: SAUCER[1], r: 30, model: saucerModel });
  T.ao({ kind: 'dot', x: SAUCER[0], y: SAUCER[1], r: 38, a: 0.6, blur: 12 });
  // ── Centre standups: two 'ANTIMATTER' targets under the mothership's wings ──
  T.standupTarget({ id: 'am0', x: 252, y: 737, angle: 262, w: 20, label: '', color: PAL.white, art: amArt });
  T.standupTarget({ id: 'am1', x: 384, y: 737, angle: 278, w: 20, label: '', color: PAL.white, art: amArt });
  T.wall([[236, 742], [318, 766], [400, 742]], { style: 'invisible', mat: 'plastic', r: 3 });   // ridge behind the bank: nothing rests on its back
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
function buildInserts(T) {
  const ins = (id, x, y, o) => T.insert(id, x, y, o);
  // shot arrows
  ins('arrGrav', 118, 556, { shape: 'arrow', w: 18, h: 30, rot: -6, color: PAL.violet, label: 'GRAVITY WELL', ly: -24, labelSize: 5.5 });
  ins('arrTube', 262, 566, { shape: 'arrow', w: 18, h: 30, rot: -4, color: PAL.ice, label: 'TUBE', ly: -24, labelSize: 6 });
  ins('arrWarp', 398, 580, { shape: 'arrow', w: 18, h: 30, rot: 6, color: PAL.cyan, label: 'WARP LOOP', ly: -24, labelSize: 5.5 });
  ins('arrOrbit', 456, 580, { shape: 'arrow', w: 16, h: 26, color: PAL.green, label: 'ORBIT', ly: -22, labelSize: 5.5 });
  ins('arrShip', 318, 672, { shape: 'arrow', w: 18, h: 28, color: PAL.red, label: 'MOTHERSHIP', ly: -23, labelSize: 5.5 });
  ins('arrPort', 34, 690, { shape: 'arrow', w: 14, h: 24, rot: 180, color: PAL.amber, label: 'CANNON', ly: 20, labelSize: 5 });
  ins('arrStar', 455, 898, { shape: 'arrow', w: 14, h: 24, color: PAL.amber, label: 'CANNON', ly: -20, labelSize: 5 });
  // teleporter rings
  ins('tpL', TPIN[0], TPIN[1], { shape: 'ring', r: 24, ring: 4, color: PAL.cyan });
  ins('tpOutL', TPOUT[0], TPOUT[1], { shape: 'ring', r: 20, ring: 4, color: PAL.cyan });
  // locks under the gravity arrow
  [0, 1, 2].forEach(i => ins('lock' + i, 104 + i * 14, 530 + (i === 1 ? 6 : 0), { shape: 'circle', r: 6, color: PAL.magenta }));
  T.art(P => P.text('LOCK', 118, 516, { size: 5.5, color: '#d8e4ff' }), 'under');
  // lock-target lamps
  ins('lkl0', 84, 798, { shape: 'circle', r: 5.5, color: PAL.violet }); ins('lkl1', 178, 612, { shape: 'circle', r: 5.5, color: PAL.violet }); ins('lkl2', 214, 798, { shape: 'circle', r: 5.5, color: PAL.violet });
  // warp speed meter above the bonus X row
  [0, 1, 2, 3, 4].forEach(i => ins('ws' + i, 203 + i * 20, 352, { shape: 'bar', w: 14, h: 7, color: i < 2 ? PAL.cyan : i < 4 ? PAL.ice : PAL.white }));
  T.art(P => P.text('WARP SPEED', 243, 366, { size: 5.5, color: '#d8e4ff', spacing: 1 }), 'under');
  // planets round Mission Control
  PLANETS.forEach(([name, col], i) => { const a = deg(205 + i * 28), r = 50; ins('pl' + i, SCOOP[0] + Math.cos(a) * r, SCOOP[1] + Math.sin(a) * r, { shape: 'circle', r: 8, color: col, text: name[0], size: 7 }); });
  ins('missionL', 384, 500, { shape: 'oval', w: 32, h: 15, rot: -50, color: PAL.amber, text: 'MISSION', size: 5.2 });
  ins('saucerL', 300, 934, { shape: 'oval', w: 30, h: 14, color: PAL.green, text: 'SAUCER', size: 5.2 });
  ins('aml0', 252, 713, { shape: 'circle', r: 6, color: PAL.white }); ins('aml1', 384, 713, { shape: 'circle', r: 6, color: PAL.white });
  ins('amL', 318, 640, { shape: 'oval', w: 34, h: 14, color: PAL.white, text: 'ANTIMATTER', size: 4.6 });
  ins('ebL', 190, 536, { shape: 'diamond', w: 14, h: 14, color: PAL.amber });
  ins('ehL', 243, 404, { shape: 'ring', r: 18, ring: 4, color: PAL.violet });
  T.art(P => P.text('EVENT HORIZON', 243, 430, { size: 5.5, color: '#d8e4ff', spacing: 1 }), 'under');
  ins('wellL', 136, 806, { shape: 'oval', w: 30, h: 13, color: PAL.cyan, text: 'WELL', size: 6 });
  // light chase round the warp loop (on the hoops) and up the sides of the well
  for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; T.bulb('wl' + i, LOOP_C[0] + Math.cos(a) * (LOOP_R + 16), LOOP_C[1] + Math.sin(a) * (LOOP_R + 16), LOOP_Z + 16, { color: PAL.cyan, r: 2.2, k: 6 }); }
  for (let i = 0; i < 5; i++) { T.bulb('wbL' + i, WELL_BOX[0] + 5, 862 + i * 26, WELL_Z + 22, { color: PAL.cyan, r: 2, k: 6 }); T.bulb('wbR' + i, WELL_BOX[2] - 5, 870 + i * 26, WELL_Z + 22, { color: PAL.magenta, r: 2, k: 6 }); }
  // the containment tube's lamps (one per locked ball)
  [106, 136, 166].forEach((x, i) => T.bulb('ct' + i, x, 1032, 92, { color: PAL.magenta, r: 2.4, k: 5 }));
}
function buildModels(T) {
  T.model(RC => mothershipModel(RC));
  T.model(RC => wellModel(RC));
  T.model(RC => sceneryModel(RC));
  T.model(RC => { RC.anim.push((dt, t) => twinkle(RC, t)); return null; });
}
function mesh(geo, mat, cast = true) { const m = new THREE.Mesh(geo, mat); m.castShadow = cast; m.receiveShadow = true; return m; }
function mergeGeos(list) {
  const out = []; let n = 0;
  for (const g0 of list) { const g = g0.index ? g0.toNonIndexed() : g0; out.push(g); n += g.attributes.position.count; }
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2); let o = 0;
  for (const g of out) { pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); if (g.attributes.uv) uv.set(g.attributes.uv.array, o * 2); o += g.attributes.position.count; }
  const m = new THREE.BufferGeometry(); m.setAttribute('position', new THREE.BufferAttribute(pos, 3)); m.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); m.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); return m;
}
// ── The flying saucer: a chrome hull with a glass dome, a ring of running lights and a thruster glow ──
function saucerModel(RC, toy) {
  const g = new THREE.Group(), chrome = RC.mats.chrome(), dark = RC.mats.plastic('#1a2236', { roughness: 0.4, clearcoat: 0.8 });
  const hull = mesh(latheGeo(0, 0, [[0, 6], [18, 6], [31, 10], [38, 16], [34, 21], [22, 24], [13, 26], [0, 26]], 40), chrome); g.add(hull);
  const under = mesh(latheGeo(0, 0, [[0, 4], [15, 2], [29, 6], [37, 15]], 40), dark); g.add(under);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(12, 24, 14, 0, TAU, 0, PI / 2), RC.mats.clear('#bff6ff', 0.35, { depthWrite: false })); dome.position.z = 25; dome.renderOrder = 4; g.add(dome);
  const pilot = mesh(new THREE.SphereGeometry(4.5, 12, 8), RC.mats.plastic('#5dffb0', { roughness: 0.5 })); pilot.position.z = 28; g.add(pilot);
  const eyes = mesh(new THREE.SphereGeometry(1.4, 8, 6), RC.mats.plastic('#111')); eyes.position.set(-1.6, -3.6, 29.5); g.add(eyes); const eye2 = eyes.clone(); eye2.position.x = 1.6; g.add(eye2);
  const lightMat = new THREE.MeshStandardMaterial({ color: '#223', emissive: PAL.cyan, emissiveIntensity: 1 }), lg = [];
  for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; lg.push(sphereGeo(Math.cos(a) * 35, Math.sin(a) * 35, 17, 2.2, 10)); }
  const lights = new THREE.Mesh(mergeGeos(lg), lightMat); g.add(lights);
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(70, 70), RC.mats.glow('#8ad8ff')); glow.position.z = 2; glow.renderOrder = 3; g.add(glow);
  const legs = []; for (let i = 0; i < 3; i++) { const a = i / 3 * TAU + 0.5; legs.push(cylGeo(Math.cos(a) * 24, Math.sin(a) * 24, 1.2, 0, 8, 8)); legs.push(cylGeo(Math.cos(a) * 24, Math.sin(a) * 24, 4, 0, 1.2, 10)); }
  g.add(mesh(mergeGeos(legs), RC.mats.steel()));
  g.userData = { lights, glow, dome, t: 0 };
  // hover: it bobs gently, lifts when hit, lights chase faster when angry
  RC.anim.push((dt, t) => {
    const u = g.userData, B = RC.G.b || {}, wob = toy.wob, angry = B.saucerMode ? 1 : 0;
    g.position.z = toy.z0 + Math.sin(t * 1.3) * 1.5 + wob * 14 + angry * 4;
    g.rotation.z = t * 0.6 + wob * Math.sin(t * 30) * 0.3;
    const ph = (t * (2 + angry * 6 + wob * 10)) % 1; u.lights.material.emissiveIntensity = 0.6 + (ph < 0.3 ? 3 : 0) + wob * 2; u.lights.material.emissive.set(angry ? PAL.magenta : PAL.cyan); u.lights.rotation.z = -t * 0.6 + Math.floor(t * 5) * (TAU / 10);
    u.glow.material.opacity = 0.35 + wob * 0.6 + angry * 0.25 + 0.1 * Math.sin(t * 7);
  });
  return g;
}
// ── The mothership: a hull hovering over the drop targets, engines lit, a bridge that scans with the ball ──
function mothershipModel(RC) {
  const g = new THREE.Group(); g.position.set(SHIP[0], SHIP[1] + 24, 0);
  const hullM = new THREE.MeshStandardMaterial({ color: '#8f9db4', metalness: 0.9, roughness: 0.3 }), darkM = RC.mats.plastic('#0e1526', { roughness: 0.35, clearcoat: 0.9 });
  // a swept delta wing (bevelled extrusion), a long spine with a raised bridge, two engine nacelles
  const wingS = new THREE.Shape(); wingS.moveTo(0, -42); wingS.lineTo(94, 16); wingS.lineTo(84, 30); wingS.lineTo(30, 22); wingS.lineTo(0, 26); wingS.lineTo(-30, 22); wingS.lineTo(-84, 30); wingS.lineTo(-94, 16); wingS.closePath();
  const wing = new THREE.ExtrudeGeometry(wingS, { depth: 6, bevelEnabled: true, bevelThickness: 2.5, bevelSize: 3, bevelSegments: 3 }); wing.translate(0, 0, 48);
  const spine = new THREE.CapsuleGeometry(10, 84, 6, 16); spine.rotateX(PI / 2); spine.translate(0, -2, 58);
  const parts = [wing, spine];
  for (const x of [-56, 56]) { const nac = new THREE.CapsuleGeometry(7, 34, 6, 12); nac.rotateX(PI / 2); nac.translate(x, 12, 56); parts.push(nac); }
  g.add(mesh(mergeGeos(parts), hullM));
  // dark panels inset into the wing, and a glossy black canopy strip down the spine
  const plates = []; for (let i = -3; i <= 3; i++) { if (!i) continue; const p = new THREE.BoxGeometry(14, 10, 1.2); p.translate(i * 22, 6 + Math.abs(i) * 2, 55.5); plates.push(p); }
  const strip = new THREE.BoxGeometry(5, 60, 1.2); strip.translate(0, -6, 68.4); plates.push(strip);
  g.add(mesh(mergeGeos(plates), darkM));
  const under = new THREE.Mesh(new THREE.PlaneGeometry(190, 80), RC.mats.glow(PAL.cyan)); under.position.set(0, 4, 30); under.renderOrder = 3; g.add(under); under.material.opacity = 0.35;
  const engM = new THREE.MeshStandardMaterial({ color: '#102030', emissive: PAL.cyan, emissiveIntensity: 1.5 });
  g.add(new THREE.Mesh(mergeGeos([-56, 56].map(x => cylGeo(x, 32, 5.5, 54, 57, 16))), engM));
  const bridge = new THREE.Mesh(new THREE.SphereGeometry(7, 16, 12), RC.mats.clear('#9ad8ff', 0.5, { depthWrite: false })); bridge.position.set(0, -28, 64); bridge.scale.set(1, 1.6, 0.7); bridge.renderOrder = 4; g.add(bridge);
  const beam = new THREE.Mesh(new THREE.PlaneGeometry(26, 60), RC.mats.glow(PAL.red)); beam.position.set(0, -34, 20); beam.rotation.x = PI / 2 - 0.3; beam.renderOrder = 6; g.add(beam);
  const lampsM = new THREE.MeshStandardMaterial({ color: '#222', emissive: PAL.red, emissiveIntensity: 1 });
  g.add(new THREE.Mesh(mergeGeos([-90, -36, 36, 90].map(x => sphereGeo(x, 18 + Math.abs(x) * 0.06, 52, 1.8, 8))), lampsM));
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  RC.anim.push((dt, t) => {
    const G = RC.G, B = G.b || {}, bank = G.comps.ship, down = bank ? bank.targets.filter(x => !x.up).length : 0;
    g.position.z = Math.sin(t * 0.9) * 2; g.rotation.x = Math.sin(t * 0.7) * 0.03; g.rotation.y = Math.sin(t * 0.5) * 0.04;
    engM.emissiveIntensity = 1.2 + 0.6 * Math.sin(t * 9) + (B.warpOn ? 1.5 : 0);
    lampsM.emissiveIntensity = (Math.floor(t * 4) % 2 ? 1.6 : 0.2) + down * 0.4;
    const b = G.world.balls.find(b => !b.hidden && b.lvl === 'main'); beam.material.opacity = (B.planetOn || B.cannonLit) ? 0.5 + 0.2 * Math.sin(t * 11) : 0.12;
    if (b) beam.rotation.z = Math.atan2(b.y - (SHIP[1] + 24), b.x - SHIP[0]) + PI / 2;
  });
  RC.root.add(g); return null;
}
// ── The Gravity Well: a black-glass housing, chrome rails, a glass front, magnet coils, a top gate ──
function wellModel(RC) {
  const [x0, y0, x1, y1] = WELL_BOX, B = RC.batch, cx = (x0 + x1) / 2;
  const glassM = new THREE.MeshPhysicalMaterial({ color: '#0a1020', metalness: 0.2, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.08 });
  // the housing under the deck (dark glass), chrome rails at its corners, a lit edge strip
  B.add(glassM, boxGeo(cx, (y0 + y1) / 2, (WELL_Z - 9) / 2, x1 - x0 - 4, y1 - y0 - 4, WELL_Z - 9));
  for (const [x, y] of [[x0 + 3, y0 + 3], [x1 - 3, y0 + 3], [x0 + 3, y1 - 3], [x1 - 3, y1 - 3]]) B.add(RC.mats.chrome(), cylGeo(x, y, 2.6, 0, WELL_Z + 34, 10));
  B.add(RC.mats.chrome(), boxGeo(cx, y0 + 1, WELL_Z + 34, x1 - x0, 3, 3)); B.add(RC.mats.chrome(), boxGeo(cx, y1 - 1, WELL_Z + 34, x1 - x0, 3, 3));
  const strip = new THREE.Mesh(boxGeo(cx, y0 - 0.5, WELL_Z - 12, x1 - x0 - 8, 1.5, 3), RC.mats.emissive(PAL.cyan, 1.2)); RC.root.add(strip);
  // glass front over the field (a clear pane standing on the deck's front edge, tilted back a little)
  const pane = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0 - 6, 34), RC.mats.clear('#cfe8ff', 0.12, { depthWrite: false }));
  pane.position.set(cx, y0 + 2, WELL_Z + 17); pane.rotation.x = PI / 2; pane.renderOrder = 5; RC.root.add(pane);
  // the top gate: a chrome arch with a lit lintel
  B.add(RC.mats.chrome(), tubeGeo([[x0 + 20, y1 - 6, WELL_Z], [x0 + 20, y1 - 6, WELL_Z + 30], [x1 - 20, y1 - 6, WELL_Z + 30], [x1 - 20, y1 - 6, WELL_Z]], 2, 24, 8));
  const lintel = new THREE.Mesh(boxGeo(cx, y1 - 6, WELL_Z + 26, x1 - x0 - 50, 2, 6), RC.mats.emissive(PAL.magenta, 0.8)); RC.root.add(lintel);
  // the containment tube on the backboard: three locked balls sit in a clear tube, lit from behind
  const tube = new THREE.Mesh(tubeGeo([[86, 1032, 72], [186, 1032, 72]], 17, 4, 20), RC.mats.clear('#dff6ff', 0.2, { depthWrite: false })); tube.renderOrder = 4; RC.root.add(tube);
  B.add(RC.mats.chrome(), torusGeo(86, 1032, 72, 17, 2, 24).rotateY(0)); B.add(RC.mats.chrome(), torusGeo(186, 1032, 72, 17, 2, 24));
  for (const x of [86, 186]) { const t = new THREE.TorusGeometry(17.5, 2.2, 8, 24); t.rotateY(PI / 2); t.translate(x, 1032, 72); B.add(RC.mats.chrome(), t); B.add(RC.mats.steel(), cylGeo(x, 1032, 3, 0, 60, 8)); }
  const label = canvas(256, 64), lg = label.getContext('2d'); lg.fillStyle = '#0a1226'; lg.fillRect(0, 0, 256, 64); lg.fillStyle = PAL.magenta; lg.font = '400 30px "Bungee", Impact'; lg.textAlign = 'center'; lg.textBaseline = 'middle'; lg.fillText('CONTAINMENT', 128, 32);
  const lab = new THREE.Mesh(new THREE.PlaneGeometry(90, 22), new THREE.MeshStandardMaterial({ map: RC.tex(label), emissiveMap: RC.tex(label), emissive: '#fff', emissiveIntensity: 0.6 })); lab.position.set(136, 1056, 108); lab.rotation.x = PI / 2; RC.root.add(lab);
  RC.anim.push((dt, t) => { const G = RC.G, inWell = G.world.balls.some(b => b.lvl === 'well' && b.mode === 'free'); strip.material.emissiveIntensity = inWell ? 2.5 + Math.sin(t * 12) : 1.0; lintel.material.emissiveIntensity = (G.b && G.b.lockLit) ? 1.5 + Math.sin(t * 8) : 0.5; });
  return null;
}
// ── Pedestals, teleport pads, tube supports, the backboard station ──
function sceneryModel(RC) {
  const B = RC.batch, chrome = RC.mats.chrome(), steel = RC.mats.steel();
  // the left turret's pedestal over the port lane (two legs hug the wall, a plate carries the base)
  B.add(chrome, cylGeo(11, 592, 2, 0, 44, 8)); B.add(chrome, cylGeo(11, 616, 2, 0, 44, 8)); B.add(RC.mats.plastic('#1a2236', { roughness: 0.4 }), cylGeo(26, 604, 24, 42, 44.5, 24));
  // the right turret's pedestal on the top-right corner
  B.add(RC.mats.plastic('#1a2236', { roughness: 0.4 }), cylGeo(CANR[0], CANR[1], 26, 0, 42, 24)); B.add(chrome, torusGeo(CANR[0], CANR[1], 42, 25, 1.4, 24));
  // teleport arrival pad: a chrome ring with an emissive core (the physics subway only draws the in-pad)
  B.add(chrome, torusGeo(TPOUT[0], TPOUT[1], 0.8, 24, 2, 32));
  const core = new THREE.Mesh(new THREE.CircleGeometry(18, 24), RC.mats.emissive(PAL.cyan, 0.4)); core.position.set(TPOUT[0], TPOUT[1], 0.4); RC.root.add(core);
  // tube ramp legs where they do no harm
  for (const [x, y, z] of [[244, 690, 30], [308, 690, 30], [356, 775, 66], [392, 764, 66], [478, 640, 56], [478, 560, 46]]) { B.add(steel, cylGeo(x, y, 1.6, 0, z + 10, 8)); B.add(steel, cylGeo(x, y, 4, 0, 1.5, 8)); }
  // a small relay station on the backboard shelf (static, batched): dish, mast, lit windows
  B.add(RC.mats.paint('#2a3350', { roughness: 0.7 }), boxGeo(430, 1050, 20, 70, 18, 40));
  B.add(chrome, cylGeo(430, 1046, 1.5, 40, 90, 8)); const dish = latheGeo(430, 1046, [[0, 0], [14, 4], [16, 5]], 20); dish.translate(0, 0, 86); B.add(RC.mats.steel(), dish);
  const win = new THREE.Mesh(mergeGeos([-20, 0, 20].map(x => boxGeo(430 + x, 1040.5, 22, 10, 1, 8))), new THREE.MeshStandardMaterial({ color: '#102030', emissive: PAL.amber, emissiveIntensity: 1.4 })); RC.root.add(win);
  RC.anim.push((dt, t) => { core.material.emissiveIntensity = 0.4 + 0.3 * Math.sin(t * 3) + (RC.G.comps.tpIn.flashA || 0) * 4; win.material.emissiveIntensity = 1.2 + 0.3 * Math.sin(t * 2.3); });
  return null;
}
function twinkle(RC, t) {
  // starfield GI: the back lamp shimmers, the side lamps breathe slowly out of phase
  const gi = RC.lights.gi, d = RC.G.dark;
  gi.forEach((l, i) => { l.intensity = l.userData.base * (0.86 + 0.14 * Math.sin(t * (1.7 + i * 0.6) + i * 2.1) * Math.sin(t * 3.1 + i)) * (1 - d); });
}

// ═══════════════════════════════════════════════════════════════════════════
// RULES
// ═══════════════════════════════════════════════════════════════════════════
function makeRules() {
  const LINES = {
    start: ['All systems nominal.', 'Welcome aboard, captain.', 'Course laid in.'],
    lock: ['Ball contained.', 'Containment field holding.'],
    well: ['Gravity well engaged.', 'Entering the well.'],
    warp: ['Warp speed.', 'Warp drive engaged.', 'Hold on.'],
    warp9: ['Warp factor nine.'],
    cannon: ['Cannon loaded. Awaiting orders.', 'Turret armed.'],
    hit: ['Direct hit.', 'Target destroyed.'],
    tp: ['Transport complete.', 'Energising.'],
    planet: ['Approaching orbit.', 'Entering orbit.'],
    saucer: ['Unidentified craft.', 'It is shooting back.'],
    mb: ['Warp multiball.', 'All balls released.'],
    drain: ['Ball lost. Recovering.', 'Systems recalibrating.', 'Try again, captain.'],
    eh: ['Event horizon reached. Hold on.'],
    am: ['Antimatter ball loaded. Magnets offline.'],
    extra: ['Spare ball authorised.'],
    jackpot: ['Jackpot.', 'Jackpot confirmed.']
  };
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const R = {
    modes: {
      warpmb: G => R.startWarpMB(G), saucer: G => R.startSaucer(G), eh: G => R.startEH(G), antimatter: G => R.startAM(G),
      cinder: G => R.startPlanet(G, 0), veil: G => R.startPlanet(G, 1), halo: G => R.startPlanet(G, 2), frost: G => R.startPlanet(G, 3),
      well: G => { const b = G.liveBalls()[0]; if (b) G.comp('well').receive(b); }, cannon: G => { R.lightCannon(G, 'L'); R.lightCannon(G, 'R'); }
    },
    init(G) {
      G.b = { lk: [0, 0, 0], lockLit: false, locks: 0, warpMB: false, jpLit: {}, jp: 0, superLit: false,
        warps: 0, warpOn: 0, warpSpeed: 0, bestSpeed: 0, laps: 0, visited: [0, 0, 0, 0], planetLit: -1, planetOn: null, planetIdx: -1, planetShots: 0,
        saucerHits: 0, saucerMode: false, saucerJp: 40000, saucerDone: false, cannonLit: { L: false, R: false }, cannonBall: 0, fireT: -9, loadT: -9, flipT: { L: -9, R: -9 },
        am: [0, 0], amLit: false, amOn: false, tps: 0, orbits: 0, ehLit: false, eh: false, ehDone: 0, saidT: -9, chatT: 12, wellBalls: 0 };
      G.say(pick(LINES.start));
    },
    say(G, k, force) { if (G.time - G.b.saidT < 3.5 && !force) return; if (G.say(pick(LINES[k]), { force })) G.b.saidT = G.time; },
    ballStart(G) { const B = G.b; B.warpOn = 0; B.warpSpeed = 0; B.laps = 0; B.cannonBall = 0; G.comp('kickback').arm(); G.comp('kickbackR').arm(); R.syncCannons(G); },
    ballEnd(G) {
      const B = G.b; B.warpMB = false; B.jpLit = {}; B.superLit = false; B.saucerMode = false; B.planetOn = null; B.amOn = false; B.eh = false; B.warpOn = 0;
      G.comp('ship').hold = false; if (!G.tilted) R.say(G, 'drain');
    },
    serve(G) {},
    skill(G, type, id) { if (type === 'lane') return id === 'laneSkill'; if (type === 'pop' || type === 'orbit' || type === 'ramp' || type === 'toy' || type === 'target' || type === 'drop' || type === 'sling') return false; },
    flip(G, side, on) {
      const B = G.b;
      if (on) { B.flipT[side] = G.time; return; }
      // a loaded cannon fires when the steering button is let go (if it was pressed after the load)
      const c = G.cannon; if (c && c.ball && G.time - B.loadT > 0.35 && B.flipT[side] > B.loadT) c.fire();
    },
    spinValue() { return 100; },
    event(G, type, id, b, d) {
      const B = G.b;
      switch (type) {
        case 'pop': G.cnt('ast'); G.add(1500); if (B.planetOn === 'CINDER') R.planetShot(G, 5000, 'ASTEROID'); if (B.eh) G.add(2500); break;
        case 'sling': G.add(200); break;
        case 'lane':
          if (id === 'laneWarp') { G.add(3000); if (B.eh) G.add(10000); }
          if (id === 'laneSkill') { G.add(2000); }
          break;
        case 'target':
          G.add(2000);
          if (/^lk\d$/.test(id)) { const i = +id[2]; if (!B.lk[i]) { B.lk[i] = 1; G.pulse('lkl' + i, 0.4); G.sfx('beep', { vol: 0.35, rate: 1 + i * 0.12 }); } if (B.lk.every(Boolean) && !B.lockLit) { B.lk = [0, 0, 0]; B.lockLit = true; G.msg('W-E-LL', 'LOCK IS LIT AT THE WELL', { anim: 'well' }); G.sfx('award'); } else if (!B.lockLit) G.msg('W-E-LL', B.lk.filter(Boolean).length + ' OF 3', { dur: 1 }); }
          else if (/^am\d$/.test(id)) { const i = +id[2]; B.am[i] = 1; G.pulse('aml' + i, 0.4); if (B.am.every(Boolean) && !B.amLit && !B.amOn) { B.am = [0, 0]; B.amLit = true; G.msg('ANTIMATTER', 'LIT AT MISSION CONTROL', {}); G.sfx('award'); } }
          break;
        case 'drop': G.pulse('arrShip', 0.3); G.add(2000); R.cannonCheck(G, b, 'MOTHERSHIP'); if (B.warpMB) R.jp(G, 'ship'); break;
        case 'bank':
          G.cnt('ship');
          if (B.planetOn === 'CINDER') R.planetShot(G, 50000, 'MOTHERSHIP DOWN');
          else if (B.eh) { G.jackpot(75000, 'HORIZON JACKPOT', { color: PAL.violet }); }
          else if (B.planetLit < 0 && !B.planetOn) { const i = B.visited.indexOf(0); if (i >= 0) { B.planetLit = i; G.msg(PLANETS[i][0] + ' IN RANGE', 'SHOOT MISSION CONTROL', { anim: 'planet', color: PLANETS[i][1] }); G.sfx('beep', { vol: 0.5 }); } else G.add(25000); }
          else { G.add(25000); G.msg('MOTHERSHIP', '25,000 + 15,000', {}); }
          break;
        case 'ramp':
          if (id === 'gravity') { G.combo('gravity'); G.cnt('well'); G.add(10000); if (B.planetOn === 'VEIL') R.planetShot(G, 25000, 'INTO THE WELL'); else if (!R.jp(G, 'gravity')) G.msg('GRAVITY WELL', 'TAP THE FLIPPERS TO CLIMB', { anim: 'well', dur: 1.4 }); R.say(G, 'well'); }
          if (id === 'tube') { G.combo('tube'); G.cnt('tube'); G.add(5000); if (B.planetOn === 'FROST') R.planetShot(G, 30000, 'ICE TUBE'); else if (!R.jp(G, 'tube')) G.msg('THE TUBE', fmt(10000 * G.mult), {}); }
          break;
        case 'rampEnter': if (id === 'warp') { B.warpOn = 1; B.laps = 0; G.sfx('coil', { vol: 0.4, rate: 0.8 }); } break;
        case 'rampFail': if (id === 'warp') { B.warpOn = 0; G.msg('NOT ENOUGH SPEED', '', { dur: 0.9 }); } break;
        case 'superLap': B.laps = d.lap; B.warpSpeed = d.speed; G.add(5000 * d.lap); G.msg('WARP ' + R.wf(d.speed), 'LAP ' + d.lap, { anim: 'warp', dur: 0.9, now: true }); G.sfx('coil', { vol: 0.5, rate: 1 + d.lap * 0.2 }); if (d.lap === 1) R.say(G, 'warp'); break;
        case 'supercharger': R.warpDone(G, b, d); break;
        case 'orbit': G.combo('orbit'); B.orbits++; G.cnt('orb2'); if (B.planetOn === 'HALO') R.planetShot(G, 20000, 'ORBIT'); else if (!R.jp(G, 'orbit')) G.msg('ORBIT', fmt(G.add(7000)), {}); if (B.orbits % 2 === 0 && !B.cannonLit.R) R.lightCannon(G, 'R'); break;
        case 'subway':
          if (id === 'tpIn') { G.cnt('tp'); B.tps++; G.combo('teleport'); G.add(10000); G.msg('TELEPORT', 'ENERGISING', { anim: 'teleport', dur: 1.1, now: true }); G.sfx('teleport', { vol: 0.8 }); R.say(G, 'tp');
            if (G.ebLit) G.collectExtra(); if (B.planetOn === 'FROST') R.planetShot(G, 30000, 'TELEPORT'); else R.jp(G, 'teleport'); if (B.tps % 3 === 0 && !B.cannonLit.L) R.lightCannon(G, 'L'); }
          if (id === 'wellTop') { G.cnt('escape'); if (B.lockLit && G.comp('warpLock').count() < 3) { /* lock follows */ } else { G.add(25000); G.msg('WELL ESCAPE', fmt(25000 * G.mult), {}); if (B.planetOn === 'VEIL') R.planetShot(G, 75000, 'WELL ESCAPE'); else R.jp(G, 'well'); } }
          break;
        case 'subwayOut': if (id === 'tpIn') { G.sfx('teleport', { vol: 0.6, rate: 1.3 }); G.flash(PAL.cyan, 0.25); } break;
        case 'powerfieldIn': B.wellBalls++; G.sfx('magnet', { vol: 0.4, x: 136 }); break;
        case 'powerfield': G.sfx('vuk', { vol: 0.5, x: 136 }); break;
        case 'powerfieldLose': G.add(2000); G.msg('PULLED BACK', '', { dur: 0.8 }); G.sfx('land', { vol: 0.5, x: 160 }); break;
        case 'lock': {
          B.locks = d.n; B.lockLit = false; G.cnt('lock'); G.msg('BALL ' + d.n + ' CONTAINED', d.n === 3 ? 'WARP MULTIBALL' : (3 - d.n) + ' MORE FOR WARP MULTIBALL', { anim: 'well' }); G.sfx('lock'); R.say(G, 'lock');
          if (d.n >= 3) G.later(1.0, () => R.startWarpMB(G));
          break;
        }
        case 'scoop': if (id === 'mission') R.mission(G, b); break;
        case 'cannonLoad': B.loadT = G.time; G.cnt('cannon'); G.msg('CANNON LOADED', 'STEER WITH THE FLIPPERS, LET GO TO FIRE', { anim: 'cannon', dur: 2.5 }); R.say(G, 'cannon'); B.cannonLit[id === 'cannonL' ? 'L' : 'R'] = false; R.syncCannons(G); break;
        case 'cannonFire': B.cannonBall = b ? b.id : 0; B.fireT = G.time; G.add(5000); G.flash(PAL.amber, 0.3); break;
        case 'toy': if (id === 'saucer') R.saucerHit(G, b); break;
        case 'kickback': G.msg('THRUSTER', 'BALL RECOVERED', { style: 'flash', dur: 1 }); G.sfx('vuk', { vol: 0.5 }); break;
      }
    },
    wf(speed) { return Math.min(9.9, speed / 300).toFixed(1); }
  };
  rulesPart2(R, LINES, pick);
  return R;
}

function rulesPart2(R, LINES, pick) {
  Object.assign(R, {
    jp(G, id) {
      const B = G.b; if (!(B.jpLit[id] || B.eh)) return false;
      const v = B.eh ? 75000 : 60000;
      if (!B.eh) delete B.jpLit[id];
      B.jp++; G.jackpot(v, B.eh ? 'HORIZON JACKPOT' : 'WARP JACKPOT', { color: B.eh ? PAL.violet : PAL.cyan }); R.say(G, 'jackpot');
      if (B.warpMB && !Object.keys(B.jpLit).length && !B.superLit) { B.superLit = true; G.msg('SUPER JACKPOT', 'AT THE WARP LOOP', {}); }
      return true;
    },
    warpDone(G, b, d) {
      const B = G.b, sp = d.speed, w = R.wf(sp); B.warpOn = 0; B.warps++; B.bestSpeed = Math.max(B.bestSpeed, sp); G.cnt('warp'); G.combo('warp');
      G.sfx('warpOut', { vol: 0.9, x: 212 }); G.flash(PAL.cyan, 0.35); G.shake(0.5);
      if (B.superLit) { B.superLit = false; G.jackpot(150000 + Math.round(sp * 20), 'SUPER JACKPOT', { color: PAL.magenta }); B.jpLit = { gravity: 1, tube: 1, teleport: 1, orbit: 1, well: 1 }; return; }
      if (B.eh) { G.jackpot(200000, 'HORIZON SUPER', { color: PAL.violet }); return; }
      if (B.planetOn === 'HALO') { R.planetShot(G, 60000, 'WARP ' + w); return; }
      if (R.jp(G, 'warp')) return;
      const pts = G.add(20000 + Math.round(Math.max(0, Math.min(1, (sp - 1500) / 1200)) * 4000) * 10);
      G.msg('WARP ' + w, fmt(pts), { anim: 'warp', style: 'jackpot', dur: 1.8 }); if (sp > 2650) R.say(G, 'warp9');
      if (B.warps % 6 === 0 && !B.amOn) { B.amLit = true; G.msg('ANTIMATTER', 'LIT AT MISSION CONTROL', {}); }
      if (B.warps === 3 || B.warps === 9) G.lightExtra();
    },
    lightCannon(G, side) { const B = G.b; B.cannonLit[side] = true; R.syncCannons(G); G.msg((side === 'L' ? 'PORT' : 'STARBOARD') + ' CANNON', side === 'L' ? 'SHOOT THE PORT LANE' : 'SHOOT THE ORBIT', { anim: 'cannon' }); G.sfx('beep', { vol: 0.4, rate: 0.8 }); },
    syncCannons(G) { const B = G.b, cl = G.comp('cannonL'), cr = G.comp('cannonR'); cl.sens.on = B.cannonLit.L && !cl.ball; cr.sens.on = B.cannonLit.R && !cr.ball; },
    cannonCheck(G, b, what) {
      const B = G.b; if (!b || b.id !== B.cannonBall || G.time - B.fireT > 3) return; B.cannonBall = 0; G.cnt('direct');
      G.jackpot(50000, 'DIRECT HIT', { color: PAL.amber, sound: 'award' }); R.say(G, 'hit'); if (G.T.R) G.T.R.burst(b.x, b.y, 20, 30, 600, PAL.amber);
    },
    mission(G, b) {
      const B = G.b, sc = G.comp('mission'); sc.holdT = 1.2; G.add(5000);
      if (B.ehLit && !B.eh && !G.mb) { B.ehLit = false; sc.holdT = 3.5; R.startEH(G); return; }
      if (G.ebLit) { G.collectExtra(); R.say(G, 'extra', true); return; }
      if (B.amLit && !B.amOn && !G.mb) { B.amLit = false; R.startAM(G, b, sc); return; }
      if (B.planetLit >= 0 && !B.planetOn && !G.mb) { const i = B.planetLit; B.planetLit = -1; sc.holdT = 2.4; R.startPlanet(G, i); return; }
      const aw = ['BONUS UP', '25,000', 'BALL SAVE', 'LIGHT PORT CANNON', 'LIGHT STARBOARD CANNON', 'THRUSTERS ARMED'][Math.floor(Math.random() * 6)];
      if (aw === 'BONUS UP') G.bxUp(); else if (aw === 'BALL SAVE') G.ballSave(10); else if (aw === 'THRUSTERS ARMED') { G.comp('kickback').arm(); G.comp('kickbackR').arm(); } else if (aw === 'LIGHT PORT CANNON') R.lightCannon(G, 'L'); else if (aw === 'LIGHT STARBOARD CANNON') R.lightCannon(G, 'R'); else G.add(25000);
      G.msg('MISSION CONTROL', aw, { anim: 'planet' }); G.sfx('beep', { vol: 0.5 });
    },
    startPlanet(G, i) {
      const B = G.b, [name, col] = PLANETS[i]; B.planetOn = name; B.planetIdx = i; B.planetShots = 0; G.cnt('planet');
      G.startMode('planet', 40); G.ballSave(5);
      const what = ['POPS AND THE MOTHERSHIP', 'THE GRAVITY WELL', 'THE WARP LOOP AND ORBIT', 'THE TUBE AND TELEPORTER'][i];
      G.big(name, 'SHOOT ' + what, col, { anim: 'planet', color: col }); G.sfx('beep', { vol: 0.6, rate: 0.7 }); R.say(G, 'planet', true); G.callout(name, col);
    },
    planetShot(G, pts, label) {
      const B = G.b; B.planetShots++; const p = G.add(pts); G.msg(label, fmt(p), { style: 'slide', now: true }); G.sfx('award', { vol: 0.6 }); G.lightShow('sweep', 0.7);
      if (B.planetShots >= 3) { B.visited[B.planetIdx] = 1; G.cnt('visit'); G.jackpot(100000, B.planetOn + ' VISITED', { color: PLANETS[B.planetIdx][1] }); G.endMode('planet'); if (B.visited.filter(Boolean).length === 3) G.lightExtra(); R.checkEH(G); }
    },
    saucerHit(G, b) {
      const B = G.b; G.cnt('saucer'); R.cannonCheck(G, b, 'SAUCER');
      if (B.saucerMode) { B.saucerJp += 10000; G.jackpot(B.saucerJp, 'SAUCER HIT', { color: PAL.green, sound: 'award' }); G.comp('saucer').shake(1.2); return; }
      if (B.eh) { G.jackpot(75000, 'HORIZON JACKPOT', { color: PAL.violet }); return; }
      B.saucerHits++; G.add(7500); G.sfx('saucerHit', { vol: 0.8, x: 300 });
      if (B.saucerHits >= 6 && !G.mb && !B.planetOn) { B.saucerHits = 0; R.startSaucer(G); }
      else { G.msg('SAUCER', Math.max(0, 6 - B.saucerHits) + ' MORE FOR SAUCER ATTACK', { anim: 'saucer', dur: 1.2 }); if (B.saucerHits === 1) R.say(G, 'saucer'); }
    },
    startSaucer(G) {
      const B = G.b; B.saucerMode = true; B.saucerJp = 40000; B.saucerDone = true; G.cnt('attack');
      G.startMode('saucer', 40); G.ballSave(5); G.big('SAUCER ATTACK', 'HIT IT FROM THE ORBIT OR A CANNON', PAL.green, { anim: 'saucer' }); G.sfx('alarm', { vol: 0.6 }); R.say(G, 'saucer', true); G.callout('SAUCER ATTACK', PAL.green);
      R.lightCannon(G, 'R'); G.comp('saucer').shake(1);
    },
    startWarpMB(G) {
      const B = G.b; B.warpMB = true; B.locks = 0; B.lockLit = false; G.cnt('warpmb'); B.warpMBDone = true;
      G.comp('warpLock').release();
      G.multiball(3, { label: 'WARP MULTIBALL', color: PAL.cyan, save: 15 });
      B.jpLit = { gravity: 1, tube: 1, teleport: 1, orbit: 1, well: 1 }; G.sfx('warpOut', { vol: 0.8 }); R.say(G, 'mb', true); R.checkEH(G);
    },
    startAM(G, b, sc) {
      const B = G.b; B.amOn = true; G.cnt('am'); sc.drop(b); G.world.removeBall(b); if (G.T.R) G.T.R.dropBall(b);
      G.serve(true, { power: true }); G.startMode('antimatter', 45, { mult: 2 });
      G.big('ANTIMATTER BALL', 'EVERYTHING SCORES 2X', PAL.white, {}); G.sfx('teleport', { vol: 0.9, rate: 0.7 }); R.say(G, 'am', true); G.callout('ANTIMATTER', '#ffffff');
    },
    checkEH(G) { const B = G.b; if (!B.ehLit && !B.eh && B.visited.every(Boolean) && B.warpMBDone && B.saucerDone) { B.ehLit = true; G.msg('EVENT HORIZON', 'IS LIT AT MISSION CONTROL', { anim: 'horizon', dur: 2.5 }); G.sfx('alarm', { vol: 0.5, rate: 0.7 }); } },
    startEH(G) {
      const B = G.b; B.eh = true; G.cnt('wiz'); B.visited = [0, 0, 0, 0]; B.warpMBDone = false; B.saucerDone = false;
      G.comp('warpLock').release();
      G.multiball(4, { label: 'EVENT HORIZON', color: PAL.violet, save: 25 });
      G.startMode('eh', 60); G.sfx('alarm', { vol: 0.8, rate: 0.6 }); G.later(1.2, () => G.sfx('warpOut', { vol: 0.8 }));
      R.say(G, 'eh', true); G.callout('EVENT HORIZON', '#c4b5fd');
    },
    modeEnd(G, name) {
      const B = G.b;
      if (name === 'planet') { if (B.planetOn && !B.visited[B.planetIdx]) G.msg(B.planetOn, 'OUT OF RANGE', {}); B.planetOn = null; }
      if (name === 'saucer') { B.saucerMode = false; G.msg('SAUCER ESCAPED', '', {}); }
      if (name === 'antimatter') { B.amOn = false; G.msg('ANTIMATTER', 'STABILISED', {}); }
      if (name === 'eh') { B.eh = false; B.ehDone++; G.msg('EVENT HORIZON', 'PASSED', {}); }
    },
    mbEnd(G) { const B = G.b; B.warpMB = false; B.superLit = false; B.jpLit = {}; if (B.eh) { B.eh = false; G.endMode('eh'); } },
    levelDrain(G, lvl, b) { return false; },
    drain(G, b) { return false; },
    update(G, dt) {
      const B = G.b;
      // the ship's computer chatters now and then, quietly
      B.chatT -= dt; if (B.chatT <= 0) { B.chatT = 18 + Math.random() * 20; if (G.amb && G.state === 'play') G.sfx('beep', { vol: 0.08, rate: 0.6 + Math.random() * 0.5 }); }
      if (B.warpOn) { const b = G.world.balls.find(b => b.mode === 'path' && b.path.ball === b); if (b) B.warpSpeed = Math.abs(b.path.u); }
      const sc = G.comp('mission'); sc.sens.on = true;
    },
    lamps(G) {
      const B = G.b, L = {}, t = G.time, lit = id => B.jpLit[id] || B.eh;
      L.arrGrav = lit('gravity') ? 'fast' : B.planetOn === 'VEIL' ? 'blink' : B.lockLit ? 'pulse' : 'slow';
      L.arrTube = lit('tube') ? 'fast' : B.planetOn === 'FROST' ? 'blink' : 0.25;
      L.arrWarp = lit('warp') || B.superLit ? 'fast' : B.planetOn === 'HALO' ? 'blink' : B.warpOn ? 1 : 'slow';
      L.arrOrbit = lit('orbit') ? 'fast' : B.planetOn === 'HALO' ? 'blink' : B.saucerMode ? 'pulse' : 0.3;
      L.arrShip = B.planetOn === 'CINDER' || B.eh ? 'fast' : B.planetLit < 0 ? 'blink' : 0.3;
      L.arrPort = B.cannonLit.L ? 'blink' : 0; L.arrStar = B.cannonLit.R ? 'blink' : 0;
      L.tpL = lit('teleport') ? 'fast' : G.ebLit ? 'blink' : B.planetOn === 'FROST' ? 'blink' : 'pulse'; L.tpOutL = G.comp('tpIn').q.length ? 'fast' : 0.35;
      const n = G.comp('warpLock').count(); for (let i = 0; i < 3; i++) { L['lock' + i] = i < n ? 1 : B.lockLit && i === n ? 'blink' : 0; L['ct' + i] = i < n ? 'pulse' : 0; }
      B.lk.forEach((v, i) => L['lkl' + i] = v ? 1 : B.lockLit ? 0 : 'slow');
      B.am.forEach((v, i) => L['aml' + i] = v ? 1 : 0.2); L.amL = B.amOn ? 'fast' : B.amLit ? 'blink' : 0;
      const sp = B.warpOn ? B.warpSpeed : B.bestSpeed * 0.6; for (let i = 0; i < 5; i++) L['ws' + i] = sp > 1200 + i * 320 ? (B.warpOn ? 1 : 0.5) : 0;
      PLANETS.forEach((p, i) => L['pl' + i] = B.visited[i] ? 1 : B.planetLit === i ? 'blink' : B.planetIdx === i && B.planetOn ? 'fast' : 0);
      L.missionL = B.ehLit || B.planetLit >= 0 || B.amLit || G.ebLit ? 'blink' : 0; L.saucerL = B.saucerMode ? 'fast' : B.saucerHits / 6;
      L.ebL = G.ebLit ? 'blink' : 0; L.ehL = B.eh ? 'fast' : B.ehLit ? 'blink' : (B.visited.filter(Boolean).length + (B.warpMBDone ? 1 : 0) + (B.saucerDone ? 1 : 0)) / 6;
      L.wellL = G.world.balls.some(b => b.lvl === 'well') ? 'fast' : B.lockLit ? 'blink' : 0; L.laneSkill = G.skill ? 'fast' : 0; L.laneWarp = lit('orbit') ? 'fast' : 0.4;
      // light chases: round the loop (faster with speed), up the well's sides while a ball is in it
      const rate = B.warpOn ? 1.5 + B.warpSpeed / 500 : 0.35; for (let i = 0; i < 12; i++) L['wl' + i] = ((i / 12 - t * rate) % 1 + 1) % 1 < 0.18 ? 1 : B.warpOn ? 0.15 : 0.05;
      const inWell = G.world.balls.some(b => b.lvl === 'well'); for (let i = 0; i < 5; i++) { const v = inWell ? (((t * 3 - i / 5) % 1 + 1) % 1 < 0.3 ? 1 : 0.1) : 0.12; L['wbL' + i] = v; L['wbR' + i] = v; }
      for (let i = 0; i < 8; i++) L['gi' + i] = 1;
      L.flShip = (B.planetLit >= 0 || B.eh) && (t % 1.6) < 0.1 ? 1 : 0; L.flL = B.lockLit && (t % 2) < 0.1 ? 1 : 0; L.flR = B.saucerMode && (t % 0.7) < 0.08 ? 1 : 0; L.flWell = inWell && (t % 0.5) < 0.1 ? 1 : 0;
      L.pop1 = L.pop2 = L.pop3 = B.planetOn === 'CINDER' || B.eh ? 'blink' : 0.15; L.kickback = G.comp('kickback').armed ? 1 : 0; L.kickbackR = G.comp('kickbackR').armed ? 1 : 0;
      return L;
    },
    status(G) {
      const B = G.b;
      if (B.eh) return 'EVENT HORIZON: EVERY SHOT IS A JACKPOT';
      if (B.warpMB) return B.superLit ? 'SUPER JACKPOT: RUN THE WARP LOOP' : 'WARP MULTIBALL: SHOOT THE LIT JACKPOTS';
      if (B.planetOn) return B.planetOn + ': ' + ['SHOOT THE POPS AND THE MOTHERSHIP', 'SHOOT THE GRAVITY WELL', 'SHOOT THE WARP LOOP AND ORBIT', 'SHOOT THE TUBE AND TELEPORTER'][B.planetIdx] + ' (' + Math.max(0, 3 - B.planetShots) + ' MORE)';
      if (B.saucerMode) return 'SAUCER ATTACK: HIT THE SAUCER';
      if (G.cannon && G.cannon.ball) return 'STEER THE CANNON, LET GO TO FIRE';
      if (B.ehLit) return 'EVENT HORIZON IS LIT AT MISSION CONTROL';
      const opts = [];
      if (B.lockLit) opts.push('LOCK IS LIT: SHOOT THE GRAVITY WELL'); if (B.planetLit >= 0) opts.push(PLANETS[B.planetLit][0] + ' IS LIT AT MISSION CONTROL'); if (B.amLit) opts.push('ANTIMATTER IS LIT AT MISSION CONTROL');
      if (B.cannonLit.L) opts.push('PORT CANNON: SHOOT THE LEFT LANE'); if (B.cannonLit.R) opts.push('STARBOARD CANNON: SHOOT THE ORBIT');
      opts.push('W-E-LL LIGHTS THE LOCK', 'DROP THE MOTHERSHIP FOR A PLANET', (6 - B.saucerHits) + ' SAUCER HITS FOR SAUCER ATTACK', 'RUN THE WARP LOOP FOR WARP SPEED');
      return opts[Math.floor(G.time / 4) % opts.length];
    },
    bonus(G) { return [['ASTEROIDS', G.pbn('pop'), 200], ['TELEPORTS', G.pbn('tp'), 5000], ['WARP RUNS', G.pbn('warp'), 15000], ['WELL', G.pbn('well'), 10000], ['CANNONS', G.pbn('cannon'), 10000], ['PLANETS', G.pbn('visit'), 50000]]; }
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// ART (canvas painters; table space, y up)
// ═══════════════════════════════════════════════════════════════════════════
function paintPlayfield(P) {
  const g = P.ctx, W = P.W, L = P.L, r = rng(42);
  // deep space: near-black blue, a little lighter towards the top
  g.fillStyle = P.lin(0, 0, 0, L, [[0, '#05081a'], [0.45, '#081030'], [0.8, '#0a1438'], [1, '#060a22']]); g.fillRect(0, 0, W, L);
  // nebula clouds: layered soft radial washes in cyan, violet and magenta
  const cloud = (x, y, rad, col, a) => { for (let k = 0; k < 4; k++) P.glow(x + (r() - 0.5) * rad * 0.8, y + (r() - 0.5) * rad * 0.8, rad * (0.5 + r() * 0.6), col, a * (0.6 + r() * 0.5)); };
  cloud(120, 740, 150, PAL.violet, 0.11); cloud(380, 470, 170, PAL.cyan, 0.09); cloud(250, 960, 160, PAL.magenta, 0.08); cloud(430, 820, 120, PAL.violet, 0.1); cloud(80, 420, 130, PAL.cyan, 0.07); cloud(250, 560, 110, PAL.magenta, 0.05);
  // dust lanes (darker streaks through the clouds)
  g.save(); g.globalAlpha = 0.35; g.strokeStyle = '#03050f'; g.lineCap = 'round';
  for (let i = 0; i < 14; i++) { const x = r() * W, y = 380 + r() * 620, l = 60 + r() * 160, a = -0.5 + r() * 1; g.lineWidth = 6 + r() * 18; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a) * l * 0.5, y + Math.sin(a) * l * 0.5 + 20, x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
  g.restore();
  // stars: many faint, a few bright with a four-point flare
  for (let i = 0; i < 900; i++) { const x = r() * W, y = r() * L, s = r(); g.fillStyle = s < 0.85 ? 'rgba(220,235,255,' + (0.25 + r() * 0.45) + ')' : s < 0.95 ? 'rgba(190,230,255,.9)' : 'rgba(255,225,200,.9)'; g.beginPath(); g.arc(x, y, s < 0.85 ? 0.5 + r() * 0.7 : 1 + r() * 0.9, 0, TAU); g.fill(); }
  for (let i = 0; i < 26; i++) { const x = r() * W, y = 330 + r() * 700, s = 3 + r() * 6; g.strokeStyle = 'rgba(230,245,255,.55)'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(x - s, y); g.lineTo(x + s, y); g.moveTo(x, y - s); g.lineTo(x, y + s); g.stroke(); P.glow(x, y, 6, '#ffffff', 0.5); }
  // a ringed planet low on the right, half hidden by the scoop's glow
  planet(g, P, 452, 455, 46, ['#2f4d7a', '#5a8ec8', '#1b2a4a'], 0.08, true, r);
  planet(g, P, 68, 470, 22, ['#8a2a2a', '#ff7a4a', '#3a0c0c'], 0, false, r);
  // black-glass instrument panels with chrome edges: the lower apron area and the lane sides
  const panel = (x, y, w, h, rad) => { g.save(); g.beginPath(); g.roundRect ? g.roundRect(x, y, w, h, rad) : g.rect(x, y, w, h); g.fillStyle = 'rgba(4,6,14,.72)'; g.fill(); g.strokeStyle = 'rgba(190,210,240,.55)'; g.lineWidth = 1.4; g.stroke(); g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 4; g.stroke(); g.restore(); };
  panel(176, 330, 134, 60, 10); panel(196, 118, 94, 90, 14);
  // panel line-work: fine hairlines and rivet dots along the sides
  g.strokeStyle = 'rgba(160,200,255,.22)'; g.lineWidth = 0.8;
  for (const [x0, x1] of [[10, 40], [480, 512]]) for (let y = 340; y < 760; y += 36) { g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y); g.stroke(); g.fillStyle = 'rgba(220,235,255,.6)'; g.beginPath(); g.arc(x0 + 4, y + 8, 1.2, 0, TAU); g.arc(x1 - 4, y + 8, 1.2, 0, TAU); g.fill(); }
  // hazard chevrons in the port lane and the warp lane, printed warning text at the cannons
  chevrons(g, 32, 640, 760, 36, PAL.amber, 0.35); chevrons(g, 218, 870, 990, 44, PAL.cyan, 0.3);
  P.text('PORT', 32, 790, { size: 6, color: 'rgba(255,220,150,.8)', rot: 90, spacing: 2 });
  P.text('STARBOARD', 456, 760, { size: 6, color: 'rgba(200,255,220,.8)', rot: 90, spacing: 2 });
  P.text('LAUNCH PAD', 455, 850, { size: 4.6, color: 'rgba(255,220,150,.85)', spacing: 1 });
  // orbital arcs around the loop's footprint and a faint grid under the pops
  g.save(); g.strokeStyle = 'rgba(120,220,255,.25)'; g.lineWidth = 1.2; g.setLineDash([6, 8]);
  for (const k of [LOOP_R + 24, LOOP_R + 44]) { g.beginPath(); g.arc(LOOP_C[0], LOOP_C[1], k, 0, TAU); g.stroke(); }
  g.setLineDash([]); g.restore();
  P.glow(LOOP_C[0], LOOP_C[1], LOOP_R + 10, PAL.cyan, 0.1);
  // the mothership's shadow on the playfield (the hull is a model) and its landing-light bars
  g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(SHIP[0], SHIP[1] + 26, 86, 24, 0, 0, TAU); g.fill();
  // teleporter pads: printed targeting rings
  for (const [x, y] of [TPIN, TPOUT]) { g.strokeStyle = 'rgba(120,230,255,.5)'; g.lineWidth = 1; for (let k = 1; k <= 3; k++) { g.beginPath(); g.arc(x, y, 28 + k * 5, 0, TAU); g.stroke(); } for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; g.beginPath(); g.moveTo(x + Math.cos(a) * 30, y + Math.sin(a) * 30); g.lineTo(x + Math.cos(a) * 44, y + Math.sin(a) * 44); g.stroke(); } }
  P.text('TELEPORT', TPIN[0], TPIN[1] - 52, { size: 5.5, color: 'rgba(160,240,255,.85)', spacing: 1.5 });
  P.text('ARRIVAL', TPOUT[0], TPOUT[1] - 50, { size: 5, color: 'rgba(160,240,255,.85)', spacing: 1.5 });
  // Mission Control printed label and the saucer's landing circle
  P.text('MISSION CONTROL', SCOOP[0] + 4, SCOOP[1] - 70, { size: 5.5, color: 'rgba(255,220,150,.9)', spacing: 1 });
  g.strokeStyle = 'rgba(93,255,176,.4)'; g.lineWidth = 1.5; g.setLineDash([4, 6]); g.beginPath(); g.arc(SAUCER[0], SAUCER[1], 42, 0, TAU); g.stroke(); g.setLineDash([]);
  // title block in the lower centre, under the flippers' reach
  P.text('NEBULA', 243, 190, { size: 26, color: '#e8f6ff', font: '"Bungee", Impact, sans-serif', weight: '400', glow: PAL.cyan, glowR: 5, spacing: 2 });
  P.text('RUN', 243, 150, { size: 20, color: PAL.cyan, font: '"Bungee", Impact, sans-serif', weight: '400', glow: PAL.cyan, glowR: 4, spacing: 6 });
  // wear: a few scuffs and a faint ball track up the middle
  g.save(); g.globalAlpha = 0.08; g.strokeStyle = '#ffffff'; g.lineWidth = 14; g.lineCap = 'round'; g.beginPath(); g.moveTo(243, 200); g.quadraticCurveTo(250, 420, 300, 700); g.stroke(); g.restore();
  for (let i = 0; i < 40; i++) { const x = r() * W, y = 100 + r() * 900; g.strokeStyle = 'rgba(255,255,255,' + (0.04 + r() * 0.06) + ')'; g.lineWidth = 0.5; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 20, y + (r() - 0.5) * 20); g.stroke(); }
}
function planet(g, P, x, y, R, cols, ringA, ring, r) {
  P.glow(x, y, R * 1.8, cols[1], 0.18);
  const gr = g.createRadialGradient(x - R * 0.35, y + R * 0.35, R * 0.1, x, y, R); gr.addColorStop(0, cols[1]); gr.addColorStop(0.55, cols[0]); gr.addColorStop(1, cols[2]);
  g.fillStyle = gr; g.beginPath(); g.arc(x, y, R, 0, TAU); g.fill();
  g.save(); g.beginPath(); g.arc(x, y, R, 0, TAU); g.clip(); g.globalAlpha = 0.25; g.strokeStyle = cols[2]; for (let i = 0; i < 9; i++) { g.lineWidth = 1 + r() * 3; g.beginPath(); g.moveTo(x - R, y - R + i * R * 0.25 + r() * 6); g.bezierCurveTo(x - R * 0.3, y - R + i * R * 0.25 - 6, x + R * 0.3, y - R + i * R * 0.25 + 8, x + R, y - R + i * R * 0.25); g.stroke(); } g.restore();
  if (ring) { g.save(); g.translate(x, y); g.rotate(-0.35); g.strokeStyle = 'rgba(220,210,180,.55)'; g.lineWidth = 2.2; g.beginPath(); g.ellipse(0, 0, R * 1.7, R * 0.42, 0, 0, TAU); g.stroke(); g.strokeStyle = 'rgba(220,210,180,.25)'; g.lineWidth = 6; g.beginPath(); g.ellipse(0, 0, R * 1.5, R * 0.36, 0, 0, TAU); g.stroke(); g.restore(); }
  g.fillStyle = 'rgba(255,255,255,.12)'; g.beginPath(); g.arc(x - R * 0.3, y + R * 0.3, R * 0.45, 0, TAU); g.fill();
}
function chevrons(g, x, y0, y1, w, col, a) {
  g.save(); g.globalAlpha = a; g.fillStyle = col;
  for (let y = y0; y < y1; y += 22) { g.beginPath(); g.moveTo(x - w / 2, y); g.lineTo(x, y + 9); g.lineTo(x + w / 2, y); g.lineTo(x + w / 2, y + 5); g.lineTo(x, y + 14); g.lineTo(x - w / 2, y + 5); g.closePath(); g.fill(); }
  g.restore();
}
function stars(g, w, h, n, seed, bright) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) { const x = r() * w, y = r() * h, s = r(); g.fillStyle = 'rgba(' + (s < 0.8 ? '220,235,255' : s < 0.92 ? '160,225,255' : '255,220,190') + ',' + (0.3 + r() * 0.7 * bright) + ')'; g.beginPath(); g.arc(x, y, s < 0.9 ? 0.6 + r() * 1.2 : 1.6 + r() * 1.6, 0, TAU); g.fill(); }
}
function spaceBg(g, w, h, seed) {
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#03050f'); gr.addColorStop(0.55, '#0a1238'); gr.addColorStop(1, '#040616'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  const r = rng(seed);
  for (const [col, n] of [[PAL.cyan, 3], [PAL.violet, 3], [PAL.magenta, 2]]) for (let i = 0; i < n; i++) { const x = r() * w, y = h * 0.2 + r() * h * 0.6, rad = w * (0.18 + r() * 0.22); const gg = g.createRadialGradient(x, y, 0, x, y, rad); gg.addColorStop(0, rgba(col, 0.22)); gg.addColorStop(1, rgba(col, 0)); g.fillStyle = gg; g.fillRect(x - rad, y - rad, rad * 2, rad * 2); }
  stars(g, w, h, Math.round(w * h / 900), seed + 1, 1);
}
function paintBackglass(g, w, h) {
  spaceBg(g, w, h, 7);
  // a ringed gas giant rising on the right, a sun-flare on the left horizon
  const r = rng(3);
  const px = w * 0.72, py = h * 0.4, R = 120;
  const pg = g.createRadialGradient(px - 40, py - 40, 10, px, py, R); pg.addColorStop(0, '#9fd0ff'); pg.addColorStop(0.5, '#3a6fc0'); pg.addColorStop(1, '#0a1a3c'); g.fillStyle = pg; g.beginPath(); g.arc(px, py, R, 0, TAU); g.fill();
  g.save(); g.beginPath(); g.arc(px, py, R, 0, TAU); g.clip(); g.globalAlpha = 0.3; g.strokeStyle = '#061030'; for (let i = 0; i < 12; i++) { g.lineWidth = 2 + r() * 6; g.beginPath(); g.moveTo(px - R, py - R + i * 20); g.bezierCurveTo(px - 40, py - R + i * 20 - 12, px + 40, py - R + i * 20 + 14, px + R, py - R + i * 20); g.stroke(); } g.restore();
  g.save(); g.translate(px, py); g.rotate(-0.3); g.strokeStyle = 'rgba(230,220,190,.7)'; g.lineWidth = 5; g.beginPath(); g.ellipse(0, 0, R * 1.8, R * 0.4, 0, 0, TAU); g.stroke(); g.strokeStyle = 'rgba(230,220,190,.3)'; g.lineWidth = 14; g.beginPath(); g.ellipse(0, 0, R * 1.55, R * 0.34, 0, 0, TAU); g.stroke(); g.restore();
  const sg = g.createRadialGradient(w * 0.12, h * 0.62, 0, w * 0.12, h * 0.62, 180); sg.addColorStop(0, 'rgba(255,245,220,.95)'); sg.addColorStop(0.08, 'rgba(255,200,140,.7)'); sg.addColorStop(0.3, 'rgba(120,200,255,.18)'); sg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = sg; g.fillRect(0, 0, w, h);
  // the ship: a sleek chrome dart crossing the glass, with an engine trail
  g.save(); g.translate(w * 0.42, h * 0.56); g.rotate(-0.28);
  const tg = g.createLinearGradient(-90, 0, 90, 0); tg.addColorStop(0, 'rgba(34,211,238,0)'); tg.addColorStop(1, 'rgba(34,211,238,.9)'); g.fillStyle = tg; g.beginPath(); g.moveTo(-230, -4); g.lineTo(-40, -9); g.lineTo(-40, 9); g.lineTo(-230, 4); g.fill();
  const hg = g.createLinearGradient(0, -20, 0, 20); hg.addColorStop(0, '#ffffff'); hg.addColorStop(0.45, '#c8d4e6'); hg.addColorStop(0.5, '#6a7a94'); hg.addColorStop(1, '#2a3448'); g.fillStyle = hg;
  g.beginPath(); g.moveTo(100, 0); g.lineTo(-40, -22); g.lineTo(-60, -8); g.lineTo(-48, 0); g.lineTo(-60, 8); g.lineTo(-40, 22); g.closePath(); g.fill();
  g.fillStyle = '#0a1a3c'; g.beginPath(); g.ellipse(40, -2, 22, 7, 0, 0, TAU); g.fill(); g.fillStyle = 'rgba(160,230,255,.6)'; g.beginPath(); g.ellipse(44, -4, 12, 3, 0, 0, TAU); g.fill();
  g.restore();
  // title
  g.save(); g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '400 92px "Bungee", Impact, sans-serif';
  g.shadowColor = PAL.cyan; g.shadowBlur = 30; g.fillStyle = '#eafcff'; g.fillText('NEBULA', w / 2, h * 0.2);
  g.font = '400 54px "Bungee", Impact, sans-serif'; g.fillStyle = PAL.cyan; g.shadowBlur = 18; g.fillText('RUN', w / 2, h * 0.33);
  g.shadowBlur = 0; g.font = '700 18px "Arial Narrow", Arial'; g.fillStyle = 'rgba(220,240,255,.8)'; g.fillText('A  DEEP  SPACE  PINBALL  ADVENTURE', w / 2, h * 0.92); g.restore();
}
function paintApron(g, w, h) {
  spaceBg(g, w, h, 11);
  g.strokeStyle = 'rgba(190,220,255,.55)'; g.lineWidth = 3; g.strokeRect(10, 10, w - 20, h - 20); g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 8; g.strokeRect(10, 10, w - 20, h - 20);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '400 56px "Bungee", Impact, sans-serif'; g.fillStyle = '#eafcff'; g.shadowColor = PAL.cyan; g.shadowBlur = 16; g.fillText('NEBULA RUN', w / 2, h * 0.5); g.shadowBlur = 0;
  g.font = '700 17px "Arial Narrow", Arial'; g.fillStyle = 'rgba(220,240,255,.85)';
  g.fillText('GRAVITY WELL  ·  WARP LOOP  ·  BALL CANNONS  ·  TELEPORTER  ·  EVENT HORIZON', w / 2, h * 0.8);
}
function paintSides(g, w, h) {
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#111a3a'); gr.addColorStop(1, '#05081a'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  stars(g, w, h, 160, 5, 0.6);
  g.fillStyle = PAL.cyan; g.fillRect(0, h - 10, w, 3); g.fillStyle = 'rgba(139,124,255,.7)'; g.fillRect(0, 8, w, 2);
  g.strokeStyle = 'rgba(160,200,255,.2)'; g.lineWidth = 1; for (let x = 60; x < w; x += 120) { g.beginPath(); g.moveTo(x, 14); g.lineTo(x + 30, h - 14); g.stroke(); }
}
function paintBackboard(g, w, h) {
  spaceBg(g, w, h, 19);
  // a distant planet's limb along the bottom, a station skyline in silhouette
  const lg = g.createRadialGradient(w * 0.5, h * 1.9, h * 1.2, w * 0.5, h * 1.9, h * 1.75); lg.addColorStop(0, '#1c3a70'); lg.addColorStop(0.5, '#2a5aa0'); lg.addColorStop(0.55, 'rgba(120,200,255,.35)'); lg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = lg; g.fillRect(0, 0, w, h);
  g.fillStyle = '#05070f'; for (let i = 0; i < 16; i++) { const x = i * 64 + 10, hh = 20 + ((i * 37) % 50); g.fillRect(x, h - hh, 40, hh); g.fillStyle = PAL.amber; for (let k = 0; k < 3; k++) g.fillRect(x + 8 + k * 10, h - hh + 8, 3, 3); g.fillStyle = '#05070f'; }
}
function slingArt(g, w, h, side) {
  const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#162a5c'); gr.addColorStop(1, '#070c22'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  stars(g, w, h, 60, side === 'L' ? 21 : 22, 0.8);
  g.save(); g.translate(w / 2, h * 0.55); g.rotate(side === 'L' ? -0.5 : 0.5); g.strokeStyle = 'rgba(34,211,238,.9)'; g.lineWidth = 5; g.beginPath(); g.ellipse(0, 0, 70, 20, 0, 0, TAU); g.stroke(); g.restore();
  g.fillStyle = '#eafcff'; g.font = '400 34px "Bungee", Impact'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(side === 'L' ? 'PORT' : 'STBD', w / 2, h * 0.55);
}
// ── LCD: a scrolling starfield with a nebula glow; scenes draw over it ──
