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
const SAUCER = [330, 1006];                                  // the flying saucer, top centre
const SHIP = [300, 733];                                     // the mothership drop-target bank
const TPIN = [222, 596], TPOUT = [455, 556];                 // teleporter pads
const SCOOP = [344, 516];                                    // Mission Control scoop
const CANL = [30, 596], CANR = [458, 992];                   // the two cannons
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
  T.wall([[62, 620], [46, 600]], { style: 'metal', h: 26 });                         // funnel to the hole
  T.wall([[62, 620], [62, by0], [bx0, by0]], { style: 'metal', h: 26 });            // lane's inner guide
  T.post(46, 598, { style: 'rubber', r: 5 });
  T.cannon({ id: 'cannonL', x: 24, y: 548, load: [CANL[0], CANL[1], 14], rest: 32, min: 10, max: 50, power: 2900, barrel: 44, autoFire: 7, barrelMat: 'brass' });
  T.kickback({ id: 'kickback', x: 28, y: 205, power: 2300, label: 'THRUSTER', color: PAL.cyan });
  // ── The Gravity Well block: a housing on the main floor; the vertical field sits on top ──
  const foot = [[bx0, by0], [bx1, by0], [bx1, by1], [110, by1], [bx0, by1 - 18]];
  T.wall(foot, { style: 'wood', r: 4, h: 44, color: '#141a30', closed: true });
  T.powerfield({ id: 'well', lvlId: 'well', z: WELL_Z, box: WELL_BOX, magnets: [[102, 892, 'L'], [168, 930, 'R']], win: { comp: 'wellTop' }, lose: { x: 166, y: 812, vy: -220 }, floor: '#060a1a', color: PAL.cyan });
  // top gate: a hidden pocket that either locks the ball (lock lit) or drops it into the warp lane
  T.subway({ id: 'wellTop', hole: false, delay: 0.55, to: b => { const G = T.G, lk = G.comps.warpLock; return (G.b.lockLit && lk.count() < 3) ? { comp: 'warpLock' } : { x: 218, y: 980, vx: 12, vy: -320, lvl: 'main' }; } });
  T.ballLock({ id: 'warpLock', slots: [[106, 1032, 72], [136, 1032, 72], [166, 1032, 72]], hidden: false, exit: { x: 220, y: 972, vx: 8, vy: -300 } });
  // ── Gravity ramp: a chrome wireform from the left-centre up into the well ──
  T.ramp({ id: 'gravity', style: 'wire', w: 40, exitLvl: 'main', entryMin: 160, to: 'well', supportEvery: 120,
    pts: [[118, 600, 0], [122, 640, 4], [130, 700, 22], [138, 760, 42], [142, 800, 54], [142, 822, WELL_Z - 1], [140, 836, WELL_Z]] });
  T.post(92, 606, { style: 'rubber', r: 5 }); T.post(146, 604, { style: 'rubber', r: 5 });
  // lock targets: two flank the ramp mouth, one on the well's corner
  T.standupTarget({ id: 'lk0', x: 80, y: 632, angle: 270, w: 20, label: 'W', color: PAL.violet });
  T.standupTarget({ id: 'lk1', x: 160, y: 632, angle: 275, w: 20, label: 'E', color: PAL.violet });
  T.standupTarget({ id: 'lk2', x: 196, y: 820, angle: 300, w: 22, label: 'LL', color: PAL.violet });
  T.wall([[62, 640], [66, 640]], { style: 'invisible', mat: 'metal' });
  // ── Warp lane: between the well and the pops; the loop's exit and the orbit both drop into it ──
  T.wall([[246, 1000], [246, 866]], { style: 'metal', h: 26 });
  T.post(246, 863, { style: 'rubber', r: 5 });
  T.rolloverLane({ id: 'laneWarp', x: 218, y: 900, r: 11, color: PAL.cyan, lampDy: -30, shape: 'circle', lampR: 8, text: 'W', textSize: 9 });
}
function buildRight(T) {}
function buildCentre(T) {
  [['pop1', 312, 826], ['pop2', 388, 828], ['pop3', 350, 896]].forEach(([id, x, y]) => T.popBumper({ id, x, y, r: 22, color: '#5fe9ff', skirt: '#22d3ee', body: '#161c34', kick: 1250 }));
}
function buildInserts(T) {}
function buildModels(T) {}

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
