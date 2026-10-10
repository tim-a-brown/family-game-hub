// ═══════════════════════════════════════════════════════════════════════════
// MIDWAY MAYHEM — a 1950s boardwalk carnival in cream paint, red-and-white
// stripes, brass and chrome. Signature toys: a FERRIS WHEEL that carries the
// ball up and drops it onto a roller-coaster wireform (or into the GUMBALL
// MACHINE lock when the lock is lit), a talking BARKER head whose eyes follow
// the ball and whose jaw opens to swallow it, a HIGH STRIKER (hit the pad,
// the puck climbs, ring the bell), a DUNK TANK (the clown drops with a
// splash), a RING TOSS magnet, a CAROUSEL spinning disc, a human-cannonball
// kickback, a swinging TILT BOB, a bulb-chase marquee, a backbox monkey that
// rings a bell on big scores, and an electro-mechanical score motor with real
// chimes. Modes: five prize games at the ticket booth, Wheel Multiball,
// Barker, Strongman hurry-up; wizard mode: THE GRAND PRIZE.
// ═══════════════════════════════════════════════════════════════════════════
import * as THREE from 'three';
import { BR, spline, deg } from '../physics.js';
import { canvas, rng, shade, rgba, latheGeo, cylGeo, tubeGeo, boxGeo, torusGeo, sphereGeo, offsetLine, wallGeo, slabGeo } from '../gfx.js';
import { Comp, drawPath, mergeGeo } from '../components.js';
import { audio } from '../engine.js';
import { smallText, smallW } from '../display.js';

const PI = Math.PI, TAU = PI * 2;
const PAL = { cream: '#f3e6c4', ivory: '#f8f1dc', red: '#c8302c', red2: '#e8463c', yellow: '#ffcc3a', gold: '#e0a63a', blue: '#1d4e9a', teal: '#2a8c8c', navy: '#1a2250', wood: '#9a6a3a', ink: '#2a1a14', bulb: '#ffe29a', pink: '#ff7aa8' };
const fmt = n => Math.round(n).toLocaleString('en-US');
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const angDiff = (a, b) => { let d = (a - b) % TAU; if (d > PI) d -= TAU; if (d < -PI) d += TAU; return d; };

// ── Layout constants (mm; x across, y up the table) ────────────────────────
const WHEEL = { x: 130, y: 742, r: 60, hub: 94 };        // hub height above the playfield (gondolas hang 18 below the rim)
const DOCK = [130, 742];                                 // where the gondola picks the ball up
const BARKER = [290, 700];
const STRIKER = [407, 630], TOWER = [407, 662];
const BOOTH = [378, 800];
const DUNK_T = [81, 604], DUNK = [84, 652];
const DUCKS = [68, 455];
const GUMBALL = [104, 905];
const CAROUSEL = [243, 470], CAR_R = 44;
const RING = [243, 604];
const MONKEY = [186, 972];
const CANNON = [26, 205];
const POPS = [[262, 866], [342, 870], [302, 938]];
const LANES = [262, 302, 342];
const PRIZES = ['DUCK', 'BEAR', 'FISH', 'ELEPHANT', 'LION'];
const PRIZE_MODES = ['ducks', 'bumpers', 'ring', 'dunk', 'coaster'];
const PRIZE_X = [171, 207, 243, 279, 315], PRIZE_Y = 395;
// the left block (dead zone behind the wheel: gumball machine, monkey) and its arc round the top-left
const BLOCK_ARC = (() => { const out = []; for (let a = 106; a <= 156; a += 5) out.push([260 + Math.cos(deg(a)) * 210, 802 + Math.sin(deg(a)) * 210]); return out; })();
const BLOCK = [[68, 622], [106, 622], [106, 764], [154, 764], [154, 718], [208, 718], [208, 1004]].concat(BLOCK_ARC).concat([[68, 886]]);
// roller coaster: from the top of the wheel, a dip and a hump across the back, then down the right side to the right inlane
const COASTER = [[130, 742, 123], [166, 748, 121], [206, 758, 109], [246, 772, 98], [284, 790, 107], [322, 808, 96], [360, 822, 84], [400, 823, 74], [436, 802, 64], [452, 752, 56], [457, 690, 48], [456, 620, 40], [452, 540, 31], [446, 460, 23], [438, 392, 16], [432, 362, 10], [426, 346, 5]];
// gumball chute: from the top of the wheel back to the globe
const CHUTE = [[130, 742, 123], [126, 768, 120], [117, 806, 114], [109, 846, 106], [105, 876, 99], [104, 888, 97]];

export default {
  id: 'midway', name: 'Midway Mayhem', short: 'MIDWAY', diff: 2, color: '#ef4444', wizard: 'the Grand Prize',
  desc: 'Step right up: ride the wheel, ring the bell, dunk the clown and win the Grand Prize.',
  intro: 'STEP RIGHT UP',
  display: { type: 'dmd', color: '#ffa030' },
  msgStyle: 'zoom',
  music: { url: '../sounds/pinball/midway.mp3', samples: 1152000, rate: 32000 },
  speech: { pitch: 1.15, rate: 1.08, voice: 'Fred|Daniel|Male|Google UK English Male' },
  rulesHtml:
    '<p>A boardwalk carnival. The barker wants your money; the prizes are plush.</p><ul>' +
    '<li><b>The Ferris wheel:</b> shoot the lane under the wheel. A gondola carries the ball up and drops it onto the roller coaster, which runs across the back and down to your right flipper. Rides and coasters score and count for the Coaster prize.</li>' +
    '<li><b>Wheel Multiball:</b> the MIDWAY spinner in the left orbit lights the lock. Ride the wheel with the lock lit and the ball is tipped into the gumball machine. Two in the gumball and the third ride starts a 3-ball multiball: coaster rides are jackpots, the ticket booth is the double jackpot and the barker\'s open mouth is the super jackpot.</li>' +
    '<li><b>The ticket booth</b> (the scoop up the alley on the right) starts a prize game when STEP RIGHT UP is lit (spell W-I-N in the top lanes). Five games, 30 seconds each: Duck Shoot (the drop targets on the left), Bumper Cars (the pop bumpers), Ring Toss (the hanging ring catches the ball in the middle), Dunk Tank (the target on the left under the clown) and Coaster (two wheel rides). Finish one to win its plush prize.</li>' +
    '<li><b>The barker:</b> hit his face three times and his mouth opens. Feed him the ball for Barker mode: he calls a shot every few seconds, each one worth 50,000 and rising.</li>' +
    '<li><b>High striker:</b> the pad on the right under the tower. Hit it hard and the puck climbs; ring the bell to start Strongman, a hurry-up that counts down from 200,000 until you hit the pad again.</li>' +
    '<li><b>Dunk tank:</b> every hit drops the clown. Three dunks arm the human cannonball (the left outlane kicker) and the third set lights extra ball.</li>' +
    '<li><b>Extra ball</b> is lit after two prizes; collect it at the ticket booth.</li>' +
    '<li><b>The Grand Prize:</b> win all five prizes, then shoot the ticket booth: four balls for sixty seconds, every shot 100,000 and wheel rides 300,000.</li></ul>',
  theme: {
    playfield: '#efe2c4', cabinet: '#a8221f', wood: '#6b3a1e', rails: 'chrome', rubber: '#1c1a1a', postColor: '#f4ecd8', postRubber: '#c8302c', wallColor: '#f0e0bc',
    flipper: '#f6efe0', flipperRubber: '#c8302c', flipperStripe: '#1d4e9a', popBody: '#f4ecd8', apron: '#b0241f', slingPlastic: '#f4e6c0',
    gi: ['#ffe2b0', '#ffe2b0', '#ffd9a0', '#ffe2b0', '#ffd080'], giPos: [[34, 250, 150], [440, 250, 150], [40, 620, 160], [440, 700, 160], [243, 900, 150, 0.8]], giLevel: 1.1,
    env: ['#ffe2b0', '#ff6a4a', '#ffd84a'], sky: '#ffd9b0', keyColor: '#fff4e0', key: 1.0, ambient: 0.34, exposure: 1.05, bloom: 0.5,
    spark: '#ffe08a', room: '#0a0608', darkLight: '#fff0d0', lampGain: 3.4, button: '#ffd84a', knob: '#c8302c'
  },
  art: { playfield: paintPlayfield, overlay: paintOverlay, backglass: paintBackglass, apron: paintApron, sides: paintSides, backboard: paintBackboard, sling: paintSling },
  fit: { top: 130, lookY: 0.47 },
  anims: {
    wheel(g, t, W, H) { for (const [cx, dir] of [[16, 1], [W - 16, -1]]) { g.strokeStyle = '#aaa'; g.lineWidth = 1; g.beginPath(); g.arc(cx, 16, 12, 0, TAU); g.stroke(); for (let i = 0; i < 6; i++) { const a = dir * t * 2 + i * PI / 3; g.beginPath(); g.moveTo(cx, 16); g.lineTo(cx + Math.cos(a) * 12, 16 + Math.sin(a) * 12); g.stroke(); g.fillStyle = '#fff'; g.fillRect(cx + Math.cos(a) * 12 - 1, 16 + Math.sin(a) * 12 - 1, 3, 3); } } },
    bell(g, t, W, H) { const x = W - 22, k = Math.sin(t * 14) * (t < 1 ? 1 : 0.2); g.fillStyle = '#ddd'; g.save(); g.translate(x, 8); g.rotate(k * 0.25); g.beginPath(); g.moveTo(-7, 14); g.quadraticCurveTo(-8, 2, 0, 0); g.quadraticCurveTo(8, 2, 7, 14); g.closePath(); g.fill(); g.fillRect(-9, 14, 18, 2); g.fillRect(-1, 16, 2, 3); g.restore(); if ((t * 8 | 0) % 2 === 0) { g.strokeStyle = '#fff'; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(x - 14 - i * 3, 6 + i * 4); g.lineTo(x - 18 - i * 3, 4 + i * 4); g.stroke(); g.beginPath(); g.moveTo(x + 14 + i * 3, 6 + i * 4); g.lineTo(x + 18 + i * 3, 4 + i * 4); g.stroke(); } } },
    ducks(g, t, W, H) { g.fillStyle = '#ccc'; for (let i = 0; i < 4; i++) { const x = ((i * 42 + t * 30) % (W + 20)) - 10, y = 22 + Math.sin(t * 6 + i) * 1.5; g.fillRect(x, y, 10, 5); g.fillRect(x + 7, y - 4, 5, 5); g.fillRect(x + 12, y - 2, 3, 2); g.fillStyle = '#000'; g.fillRect(x + 9, y - 3, 1, 1); g.fillStyle = '#ccc'; } },
    clown(g, t, W, H) { const d = Math.min(1, t / 0.6), x = W - 24, y = 2 + d * 18; g.fillStyle = '#eee'; g.fillRect(x - 2, y, 5, 5); g.fillRect(x - 3, y + 5, 7, 6); g.fillRect(x - 5, y + 6, 2, 4); g.fillRect(x + 4, y + 6, 2, 4); g.strokeStyle = '#999'; g.beginPath(); for (let i = 0; i <= 20; i++) { const xx = x - 14 + i * 1.5, yy = 26 + Math.sin(i * 1.2 + t * 9) * (d > 0.9 ? 2 : 0.6); i ? g.lineTo(xx, yy) : g.moveTo(xx, yy); } g.stroke(); if (d > 0.95 && t < 1.4) { g.fillStyle = '#fff'; for (let i = 0; i < 6; i++) g.fillRect(x - 10 + i * 4, 20 - (t - 0.6) * 12 - (i % 2) * 3, 1, 2); } },
    marquee(g, t, W, H) { for (let i = 0; i < W / 4; i++) { const on = ((i + (t * 10 | 0)) % 3) === 0; g.fillStyle = on ? '#fff' : '#444'; g.fillRect(i * 4 + 1, 0, 2, 2); g.fillRect(i * 4 + 1, H - 2, 2, 2); } for (let j = 0; j < H / 4; j++) { const on = ((j + (t * 10 | 0)) % 3) === 0; g.fillStyle = on ? '#fff' : '#444'; g.fillRect(0, j * 4 + 1, 2, 2); g.fillRect(W - 2, j * 4 + 1, 2, 2); } },
    barker(g, t, W, H) { const x = 18, open = (Math.sin(t * 9) > 0 ? 3 : 0); g.fillStyle = '#ddd'; g.fillRect(x - 8, 6, 16, 14); g.fillRect(x - 10, 3, 20, 3); g.fillRect(x - 6, 0, 12, 4); g.fillStyle = '#000'; g.fillRect(x - 5, 9, 3, 2); g.fillRect(x + 2, 9, 3, 2); g.fillRect(x - 4, 15, 8, 1 + open); g.fillStyle = '#ddd'; g.fillRect(x - 8, 20 + open, 16, 3); g.fillStyle = '#000'; g.fillRect(x - 6, 13, 12, 1); },
    gumball(g, t, W, H) { const x = W - 20; g.strokeStyle = '#ccc'; g.beginPath(); g.arc(x, 11, 9, 0, TAU); g.stroke(); g.fillStyle = '#ccc'; g.fillRect(x - 6, 20, 12, 9); for (let i = 0; i < 7; i++) { const a = i * 0.9 + t * 0.4, r = 2 + (i % 3) * 2; g.fillStyle = i % 2 ? '#fff' : '#888'; g.fillRect(x + Math.cos(a) * r - 1, 12 + Math.sin(a) * r * 0.6 - 1, 2, 2); } }
  },
  dmdIdle: dmdReels,
  build,
  rules: makeRules()
};

// ═══════════════════════════════════════════════════════════════════════════
// BUILD
// ═══════════════════════════════════════════════════════════════════════════
function build(T) {
  const W = T.W, L = T.L, G = T.G;
  if (!T.headless) defineSounds();

  // ── Shooter lane, arch, standard lower third ──
  T.shooter({ min: 700, max: 3900 });
  T.lower({ flipColor: '#f6efe0', flipRubber: '#c8302c', bxColor: '#ffcc3a', saveColor: '#e8463c', extraColor: '#ff9a40', bxY: 302, slingArt: paintSling });

  // ── Left side: the MIDWAY orbit lane, the human cannonball, the shooting gallery ──
  T.wall([[2, 612], [6, 588], [16, 570], [32, 558], [52, 552]], { style: 'wood', r: 4, h: 34 });
  T.post(54, 552, { style: 'rubber', r: 5 });
  T.post(62, 618, { style: 'rubber', r: 5 });   // bottom of the lane guide (the block's wall); the lane mouth is 54 mm wide
  T.spinner({ id: 'spinner', x: 31, y: 690, w: 46, angle: 90, label: 'MIDWAY', color: '#f4ecd8', art: spinArt });
  T.orbit({ id: 'orbitL', a: [8, 660, 60, 660], dirA: [0, 1], b: [434, 660, 478, 660], dirB: [0, -1] });
  T.orbit({ id: 'orbitR', a: [434, 660, 478, 660], dirA: [0, 1], b: [8, 660, 60, 660], dirB: [0, -1] });
  T.wall([[54, 404], [54, 548]], { style: 'wood', r: 4, h: 34 });
  T.dropTargetBank({ id: 'ducks', x: DUCKS[0], y: DUCKS[1], angle: 8, n: 3, w: 24, gap: 3, labels: ['', '', ''], art: duckArt, color: '#ffd23a' });
  ['d0', 'd1', 'd2'].forEach((id, i) => T.insert(id, 100, 427 + i * 28, { shape: 'circle', r: 6.5, color: '#ffd23a' }));
  T.kickback({ id: 'cannon', x: CANNON[0], y: CANNON[1], power: 2300, label: 'CANNONBALL', color: '#e8463c' });

  // ── The left block: dock walls, dunk pocket, the dead zone behind the wheel ──
  T.wall([[106, 592], [106, 624]], { style: 'metal', h: 26 }); T.post(106, 590, { style: 'rubber', r: 5 });
  T.wall([[154, 592], [154, 720]], { style: 'metal', h: 26 }); T.post(154, 590, { style: 'rubber', r: 5 });
  T.wall(BLOCK, { style: 'wood', r: 6, h: 30, closed: true, color: '#f0e0bc' });
  T.wall([[66, 620], [108, 620]], { style: 'invisible', mat: 'wood', r: 3 });
  T.standupTarget({ id: 'dunk', x: DUNK_T[0], y: DUNK_T[1], angle: 300, w: 22, label: '', color: '#e8463c', art: bullseyeArt });
  T.ao({ kind: 'poly', pts: BLOCK, a: 0.55, blur: 10 });

  // ── The Ferris wheel, the roller coaster and the gumball chute ──
  const wheel = T.comp(new Wheel(T, { id: 'wheel', x: WHEEL.x, y: WHEEL.y, r: WHEEL.r, hub: WHEEL.hub, speed: 1.25, n: 6 }));
  const coasterPts = spline(COASTER, 6), chutePts = spline(CHUTE, 6);
  const coaster = T.world.path({ pts: coasterPts, style: 'wire', fric: 55, exitLvl: 'main', minExit: 320, lvl: 'main',
    onExit(b, u, e, w) { const h = Math.hypot(e[3], e[4]) || 1, sp = Math.max(u, 320) * 0.9; w.airborne(b, e[0], e[1], Math.max(e[2], 0), e[3] / h * sp, e[4] / h * sp, 0, 'main'); b.noPath = 0.4; G.sfx('wireEnd', { x: e[0], vol: 0.5 }); G.emit('coaster', 'coaster', b, { speed: u }); },
    onFail(b) { b.path.s = 1; b.path.u = 380; } });
  const chute = T.world.path({ pts: chutePts, style: 'wire', fric: 55, lvl: 'main',
    onExit(b, u, e, w) { b.mode = 'free'; b.path = null; G.comps.gumball.receive(b); G.emit('chuteIn', 'chute', b); },
    onFail(b) { b.path.s = 1; b.path.u = 300; } });
  wheel.paths = { coaster, chute };
  wheel.route = () => (G.b.lockLit && G.comps.gumball.balls.length < 2 && !G.mb) ? 'chute' : 'coaster';
  T.statics.push({ kind: 'model', fn: RC => { drawPath(RC, coasterPts, 'wire', { w: 40, wireMat: 'chrome', supports: false, lvl: 'main' }); drawPath(RC, chutePts, 'wire', { w: 40, wireMat: 'chrome', supports: false, lvl: 'main' }); coasterSupports(RC, coasterPts); return null; } });
  T.gumballMachine({ id: 'gumball', x: GUMBALL[0], y: GUMBALL[1], color: '#c8302c', exit: { x: 32, y: 866, vx: -40, vy: -220 } });
  G.comps.gumball.mesh = function (RC) { gumballModel(RC, this); };

  // ── Centre: carousel disc, ring toss, the barker ──
  T.spinningDisc({ id: 'carousel', x: CAROUSEL[0], y: CAROUSEL[1], r: CAR_R, speed: 2.2, grip: 4, color: '#f4ecd8', art: carouselArt });
  [[243, 516], [205, 448], [281, 448]].forEach(p => T.post(p[0], p[1], { style: 'metal', r: 3, h: 40 }));
  T.ringCatch({ id: 'ring', x: RING[0], y: RING[1], r: 30, strength: 7000, hold: 1.6, active: false, toy: ringModel, animate: ringAnimate, releaseAngle: 268, releaseSpeed: 650 });
  T.mouthToy({ id: 'barker', x: BARKER[0], y: BARKER[1], facing: 268, w: 44, hold: 1.5, model: barkerModel });
  T.wall([[266, 704], [266, 750], [314, 750], [314, 704]], { style: 'invisible', mat: 'toy', r: 2 });
  T.ao({ kind: 'poly', pts: [[262, 696], [318, 696], [318, 752], [262, 752]], a: 0.6, blur: 12 });

  // ── Right side: right orbit lane, the high striker, the alley and the ticket booth ──
  T.wall([[478, 612], [474, 588], [464, 572], [448, 562], [432, 558]], { style: 'wood', r: 4, h: 34 });
  T.wall([[432, 620], [432, 800]], { style: 'metal', h: 26 });
  T.post(432, 617, { style: 'rubber', r: 5 }); T.post(432, 556, { style: 'rubber', r: 5 });
  const striker = T.standupTarget({ id: 'striker', x: STRIKER[0], y: STRIKER[1], angle: 250, w: 24, label: '', color: '#e8463c', art: strikerPadArt });
  { const orig = striker.onContact.bind(striker); striker.onContact = (b, c, imp, nx, ny, w) => { striker.lastImp = imp; orig(b, c, imp, nx, ny, w); }; }
  T.wall([[395, 638], [419, 638], [419, 684], [395, 670]], { style: 'invisible', mat: 'toy', r: 3, closed: true });   // the back slopes so balls roll off into the alley
  // a ball coming down off the arch slides along the lane gate: this wedge drops it into the right lane instead of onto the lane wall's end
  T.wall([[483, 789], [474, 806]], { style: 'metal', h: 24 });
  T.ao({ kind: 'poly', pts: [[392, 634], [422, 634], [422, 688], [392, 688]], a: 0.6, blur: 10 });
  T.scoop({ id: 'booth', x: BOOTH[0], y: BOOTH[1], r: 12, eject: { angle: 252, speed: 1450 }, hold: 1.0 });

  // ── Upper right: pop bumpers (bumper cars) and the W-I-N top lanes ──
  POPS.forEach(([x, y], i) => T.popBumper({ id: 'pop' + (i + 1), x, y, r: 23, color: ['#e8463c', '#ffcc3a', '#2a8c8c'][i], skirt: ['#c8302c', '#e0a63a', '#1f6f6f'][i], body: '#f4ecd8', capArt: (g, w, h) => bumperCarCap(g, w, h, i) }));
  LANES.forEach((x, i) => T.rolloverLane({ id: 'lane' + 'WIN'[i], x, y: 992, r: 11, color: '#ffcc3a', lampDy: -30, shape: 'circle', lampR: 8, text: 'WIN'[i], textSize: 9 }));
  [242, 282, 322, 362].forEach(x => { T.wall([[x, 972], [x, 1018]], { style: 'metal', h: 22 }); T.post(x, 972, { style: 'metal', r: 3 }); });

  // ── Inserts ──
  const ins = (id, x, y, o) => T.insert(id, x, y, o);
  ins('arrOrbL', 31, 760, { shape: 'arrow', w: 16, h: 28, color: '#ffcc3a', label: 'MIDWAY', ly: -22, labelSize: 5.5, labelColor: '#2a1a14' });
  ins('arrDunk', 83, 560, { shape: 'arrow', w: 15, h: 24, rot: 10, color: '#2a8c8c', label: 'DUNK', ly: -20, labelSize: 5.5, labelColor: '#2a1a14' });
  ins('arrWheel', 130, 562, { shape: 'arrow', w: 18, h: 30, color: '#e8463c', label: 'WHEEL', ly: -24, labelSize: 6, labelColor: '#2a1a14' });
  ins('lockL', 130, 526, { shape: 'diamond', w: 15, h: 15, color: '#ff4a6a', text: 'LOCK', size: 4.6 });
  ['ride0', 'ride1', 'ride2'].forEach((id, i) => ins(id, 174, 582 + i * 20, { shape: 'circle', r: 6, color: '#ffcc3a' }));
  ins('arrPops', 236, 652, { shape: 'arrow', w: 15, h: 26, rot: -4, color: '#2a8c8c', label: 'BUMPER CARS', ly: -22, labelSize: 5, labelColor: '#2a1a14' });
  ins('barkerL', 290, 650, { shape: 'oval', w: 30, h: 15, color: '#ff7aa8', text: 'FEED ME', size: 5.2 });
  ins('arrBooth', 348, 620, { shape: 'arrow', w: 16, h: 28, rot: -10, color: '#ffcc3a', label: 'STEP RIGHT UP', ly: -22, labelSize: 5, labelColor: '#2a1a14' });
  ins('boothL', 360, 680, { shape: 'oval', w: 30, h: 15, rot: -10, color: '#ffcc3a', text: 'TICKETS', size: 5.2 });
  ins('arrStrike', 404, 572, { shape: 'arrow', w: 16, h: 28, rot: -20, color: '#e8463c', label: 'HIGH STRIKER', ly: -22, labelSize: 5, labelColor: '#2a1a14' });
  ins('strongL', 396, 530, { shape: 'oval', w: 32, h: 15, rot: -20, color: '#ff9a40', text: 'STRONGMAN', size: 4.8 });
  ins('arrOrbR', 455, 600, { shape: 'arrow', w: 16, h: 26, color: '#ffcc3a', label: 'MIDWAY', ly: -21, labelSize: 5.5, labelColor: '#2a1a14' });
  ins('ringL', RING[0], RING[1], { shape: 'ring', r: 21, ring: 4, color: '#ff7aa8' });
  ins('gpL', 243, 548, { shape: 'star', w: 24, h: 24, color: '#ffcc3a' });
  PRIZES.forEach((p, i) => ins('prize' + i, PRIZE_X[i], PRIZE_Y, { shape: 'circle', r: 10, color: ['#ffd23a', '#c8824a', '#ff9a40', '#8ab0e0', '#e8a030'][i] }));
  ins('ebL', 243, 360, { shape: 'diamond', w: 13, h: 13, color: '#ff9a40' });
  T.flasher('flL', 62, 1002, { color: '#ffd040', r: 10, z0: 30 });
  T.flasher('flR', 470, 985, { color: '#ff5030', r: 10, z0: 0 });
  T.flasher('flC', 350, 760, { color: '#ffd040', r: 9, z0: 0 });
  // GI bulbs round the sides and under the arch
  [[14, 360], [14, 520], [470, 360], [470, 520], [20, 820], [235, 1030], [440, 1010], [120, 1012]].forEach((p, i) => T.bulb('gi' + i, p[0], p[1], 12, { color: '#ffe2b0', r: 3, k: 3, on: 1 }));
  // marquee bulbs on the backboard sign (chase)
  for (let i = 0; i < 26; i++) { const p = marqueeBulb(i); T.bulb('mq' + i, p[0], L - 9, p[1], { color: '#ffe29a', r: 2.6, k: 5 }); }
  // bulbs on the high striker tower (light up as the puck climbs)
  for (let i = 0; i < 6; i++) T.bulb('tw' + i, TOWER[0] - 12, TOWER[1] - 2, 36 + i * 22, { color: i < 4 ? '#ffd040' : '#ff4030', r: 2.2, k: 5 });

  // ── Score motor (chimes) ──
  T.scoreMotor({ id: 'motor', x: 243, y: 60 });

  // ── The ticket booth kiosk (3D, see tentModel) needs walls; the gallery sign is a printed plastic ──
  T.wall([[362, 822], [418, 822], [418, 834], [362, 856]], { style: 'invisible', mat: 'wood', r: 2, closed: true });   // the roof slopes down to the right: nothing rests on it
  T.ao({ kind: 'poly', pts: [[360, 820], [420, 820], [420, 850], [360, 850]], a: 0.55, blur: 10 });
  T.plastic([[56, 406], [120, 400], [122, 506], [56, 510]], { z: 36, art: galleryPlastic });

  // ── Scenery models ──
  T.model(RC => strikerModel(RC));
  T.model(RC => dunkModel(RC));
  T.model(RC => carouselModel(RC));
  T.model(RC => marqueeModel(RC));
  T.model(RC => monkeyModel(RC));
  T.model(RC => tiltBobModel(RC));
  T.model(RC => cannonModel(RC));
  T.model(RC => tentModel(RC));
}
function marqueeBulb(i) {   // positions [x, z] round the marquee sign on the backboard
  const x0 = 110, x1 = 410, z0 = 52, z1 = 136;
  if (i < 10) return [x0 + (x1 - x0) * i / 9, z1 + 6];
  if (i < 13) return [x1 + 6, z1 - (z1 - z0) * (i - 9) / 4];
  if (i < 23) return [x1 - (x1 - x0) * (i - 13) / 9, z0 - 6];
  return [x0 - 6, z0 + (z1 - z0) * (i - 22) / 4];
}

// ═══════════════════════════════════════════════════════════════════════════
// RULES
// ═══════════════════════════════════════════════════════════════════════════
function makeRules() {
  const LINES = {
    start: ['Step right up! Step right up!', 'Three balls, one dollar. Everybody wins!', 'Try your luck, friend.'],
    wheel: ['Round and round she goes.', 'Enjoy the ride!', 'Hold on tight!'],
    coaster: ['Wheee!', 'What a ride!'],
    booth: ['Step right up!', 'Pick a game, any game.', 'Tickets please.'],
    prize: ['We have a winner!', 'Give the man a prize!', 'Everybody look! A winner!'],
    face: ['Ow! Watch the nose!', 'Hey! Hands off the merchandise!', 'You call that a shot?'],
    open: ['Feed me!', 'Come on, right in here.'],
    eat: ['Mmm. Tasty.', 'Delicious.', 'Yuck. Needs salt.'],
    bell: ['Ding ding ding! A strongman!', 'Ring that bell!'],
    puny: ['Puny.', 'Is that all you got?', 'My grandmother hits harder.'],
    dunk: ['Splash!', 'Into the drink!', 'Somebody get a towel.'],
    mb: ['Everybody rides free!', 'Mayhem on the midway!'],
    lock: ['One for the gumball machine.', 'Saving that one for later.'],
    jackpot: ['Jackpot!', 'Big winner!'],
    drain: ['Better luck next time, pal.', 'Thanks for playing.', 'Come back soon.'],
    grand: ['The grand prize! Nobody has ever won the grand prize!'],
    extra: ['One more ride, on the house.'],
    hurry: ['Hurry hurry hurry!', 'Hit it again, quick!']
  };
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const BARKER_SHOTS = ['wheel', 'striker', 'booth', 'ducks', 'dunk', 'orbitL', 'orbitR'];
  const R = {
    modes: {
      ducks: G => R.startPrize(G, 'ducks'), bumpers: G => R.startPrize(G, 'bumpers'), ring: G => R.startPrize(G, 'ring'), dunk: G => R.startPrize(G, 'dunk'), coaster: G => R.startPrize(G, 'coaster'),
      barker: G => R.startBarker(G), strongman: G => R.startStrong(G), wheelmb: G => R.startWheelMB(G), grand: G => R.startGrand(G),
      feed: G => { G.b.barkerHits = 3; R.openMouth(G); }, lock: G => { G.b.lockLit = true; }, booth: G => { G.b.boothLit = true; }
    },
    init(G) {
      G.b = { prizes: [0, 0, 0, 0, 0], mode: null, need: 0, have: 0, boothLit: true, win: [0, 0, 0], winLit: 0, tickets: 0,
        spins: 0, spinsNeed: 25, lockLit: false, locks: 0, wheelMB: false, rides: 0, rideN: 0, jp: {}, jpV: 100000, superLit: false,
        puck: 0, puckT: 0, bell: 0, strong: false, hurry: 0, strongDone: 0,
        barkerHits: 0, mouthOpen: false, barker: false, bShot: 0, bShotT: 0, bVal: 50000, fed: 0,
        ducksBanks: 0, dunks: 0, dunkAt: -9, monkeyT: -9, grandLit: false, grand: false, saidT: -9, tauntT: 0, chimeT: 0, bellAt: -9, hornT: 8 };
      G.say(pick(LINES.start));
    },
    say(G, k, force) { if (G.time - G.b.saidT < 3.5 && !force) return; if (G.say(pick(LINES[k]), { force })) G.b.saidT = G.time; },
    ballStart(G) {
      const B = G.b; B.winLit = Math.floor(Math.random() * 3); B.rideN = 0;
      G.comp('cannon').arm();
      G.comp('ring').active = false;
      G.comp('carousel').w = 2.2;
    },
    ballEnd(G) {
      const B = G.b; B.wheelMB = false; B.barker = false; B.grand = false; B.jp = {}; B.superLit = false; B.strong = false; B.hurry = 0; B.mode = null;
      B.mouthOpen = false; G.comp('barker').close(); G.comp('ring').active = false;
      if (!G.tilted) R.say(G, 'drain');
    },
    serve(G) { G.b.winLit = (G.b.winLit + 1) % 3; },
    skill(G, type, id) { if (type === 'lane') return id === ['laneW', 'laneI', 'laneN'][G.b.winLit]; if (type === 'pop' || type === 'orbit' || type === 'wheelIn') return false; },
    flip(G, side, on) {
      if (!on || G.state !== 'play' && G.state !== 'serve') return;
      const B = G.b; B.winLit = (B.winLit + (side === 'R' ? 1 : 2)) % 3;
      const r = B.win; B.win = side === 'R' ? [r[2], r[0], r[1]] : [r[1], r[2], r[0]];
    },
    spinValue(G) { return G.b.wheelMB ? 1000 : 400; },
    event(G, type, id, b, d) {
      const B = G.b;
      switch (type) {
        case 'spin':
          if (!B.lockLit && !B.wheelMB) { B.spins++; if (B.spins >= B.spinsNeed) { B.spins = 0; B.lockLit = true; G.msg('MIDWAY SPINNER', 'LOCK IS LIT', { anim: 'gumball' }); G.sfx('award'); } }
          break;
        case 'pop':
          if (B.mode === 'bumpers') { G.add(6000); B.have++; R.progress(G, 'BUMPER CARS'); }
          if (B.grand) G.add(5000);
          break;
        case 'drop': G.pulse('d' + d.i, 0.3); if (B.mode === 'ducks') G.add(25000); else G.add(4000); break;
        case 'bank':
          B.ducksBanks++; G.cnt('duckBank'); B.monkeyT = G.time;
          if (B.mode === 'ducks') { G.add(100000); B.have++; R.progress(G, 'DUCK SHOOT'); }
          else { G.add(15000); G.msg('DUCKS DOWN', fmt(30000 * G.mult), { anim: 'ducks' }); }
          R.barkerShot(G, 'ducks');
          break;
        case 'target':
          if (id === 'dunk') R.dunk(G);
          else if (id === 'striker') R.strike(G);
          break;
        case 'lane':
          if (/^lane[WIN]$/.test(id)) {
            const i = 'WIN'.indexOf(id[4]); B.win[i] = 1;
            if (B.win.every(Boolean)) { B.win = [0, 0, 0]; B.tickets++; G.cnt('tickets'); G.bxUp(); if (!B.boothLit && !B.mode) { B.boothLit = true; G.msg('W-I-N', 'STEP RIGHT UP IS LIT', { anim: 'marquee' }); } else G.add(10000); G.sfx('chimeHi', { vol: 0.5 }); }
          }
          break;
        case 'orbit':
          G.combo(id); G.add(5000);
          if (B.grand) R.grandShot(G, id); else if (!R.barkerShot(G, id)) G.msg('MIDWAY', fmt(8000 * G.mult), {});
          break;
        case 'wheelIn':
          G.cnt('ride'); B.rides++; B.rideN++; G.add(10000); G.combo('wheel');
          if (B.grand) { G.add(300000, { x: WHEEL.x, y: WHEEL.y, color: '#ffcc3a' }); G.msg('GRAND PRIZE RIDE', '300,000', { anim: 'wheel' }); }
          else if (B.wheelMB) G.msg('WHEEL RIDE', 'COASTER IS A JACKPOT', { anim: 'wheel', dur: 1.2 });
          else if (B.lockLit && B.locks < 2) G.msg('LOCK IS LIT', 'HOLD ON TIGHT', { anim: 'wheel', dur: 1.4 });
          else { G.msg('WHEEL RIDE', fmt(10000 * G.mult), { anim: 'wheel' }); R.say(G, 'wheel'); }
          if (B.mode === 'coaster') { B.have++; G.add(50000); R.progress(G, 'COASTER'); }
          R.barkerShot(G, 'wheel');
          break;
        case 'wheelOut':
          if (d && d.route === 'chute') { G.msg('INTO THE GUMBALL', '', { anim: 'gumball', dur: 1.2 }); }
          else if (B.lockLit && B.locks >= 2 && !B.wheelMB && !G.mb) R.startWheelMB(G);
          break;
        case 'chuteIn':
          B.locks = G.comp('gumball').balls.length; G.cnt('lock'); R.say(G, 'lock');
          G.msg('BALL ' + B.locks + ' LOCKED', B.locks === 2 ? 'RIDE AGAIN FOR MULTIBALL' : 'IN THE GUMBALL MACHINE', { anim: 'gumball' }); G.sfx('ratchet', { vol: 0.6 });
          break;
        case 'coaster':
          G.cnt('coaster'); G.combo('coaster'); G.sfx('ratchet', { vol: 0.3, x: 440 });
          if (B.grand) G.add(100000);
          else if (B.wheelMB && B.jp.coaster) { R.jackpot(G, 'coaster'); }
          else { G.add(25000); G.msg('ROLLER COASTER', fmt(25000 * G.mult), { anim: 'wheel' }); R.say(G, 'coaster'); }
          break;
        case 'scoop': if (id === 'booth') R.booth(G); break;
        case 'mouthHit':
          B.barkerHits++; G.add(2500);
          if (!B.mouthOpen && !B.barker && B.barkerHits >= 3) R.openMouth(G);
          else if (!B.mouthOpen) { G.msg('THE BARKER', (3 - B.barkerHits) + ' MORE TO OPEN HIS MOUTH', { anim: 'barker', dur: 1.2 }); if (G.time - B.tauntT > 6) { B.tauntT = G.time; R.say(G, 'face'); } }
          break;
        case 'mouth':
          G.cnt('barker'); B.mouthOpen = false; G.sfx('gulp', { vol: 0.8 }); R.say(G, 'eat', true); B.monkeyT = G.time;
          if (B.superLit) { B.superLit = false; G.jackpot(250000, 'SUPER JACKPOT', { color: '#ff7aa8' }); B.jp = { coaster: 1, booth: 1 }; }
          else if (B.grand) G.add(100000);
          else if (!B.barker) { G.add(25000); G.later(1.4, () => R.startBarker(G)); }
          else G.add(25000);
          break;
        case 'mouthOut': G.comp('barker').close(); if (B.wheelMB && !B.superLit) G.comp('barker').close(); break;
        case 'kickback': G.msg('HUMAN CANNONBALL', '', { style: 'flash', dur: 1.2 }); G.sfx('cannon', { vol: 0.9, x: 26 }); G.cnt('cannon'); break;
        case 'ringCatch':
          G.cnt('ring'); B.monkeyT = G.time; G.sfx('chimeHi', { vol: 0.6 });
          if (B.mode === 'ring') { G.add(60000); B.have++; R.progress(G, 'RING TOSS'); }
          else if (B.grand) G.add(100000);
          else { G.add(30000); G.msg('RINGED!', fmt(30000 * G.mult), {}); }
          break;
        case 'ringCatchRelease': if (B.mode !== 'ring' && !B.grand) G.comp('ring').active = false; break;
      }
    },
    // ── the ticket booth ──
    booth(G) {
      const B = G.b, sc = G.comp('booth'); sc.holdT = 1.3; G.add(10000); G.combo('booth');
      if (B.grandLit && !B.grand && !G.mb) { B.grandLit = false; sc.holdT = 3.5; R.startGrand(G); return; }
      if (G.ebLit) { G.collectExtra(); R.say(G, 'extra', true); sc.holdT = 2; return; }
      if (B.grand) { G.add(100000); G.msg('GRAND PRIZE', '100,000', { anim: 'marquee' }); return; }
      if (B.wheelMB && B.jp.booth) { R.jackpot(G, 'booth'); return; }
      if (R.barkerShot(G, 'booth')) return;
      if (B.boothLit && !B.mode && !G.mb) {
        const next = PRIZE_MODES.findIndex((m, i) => !B.prizes[i]);
        if (next >= 0) { B.boothLit = false; sc.holdT = 2.6; R.startPrize(G, PRIZE_MODES[next]); return; }
      }
      const aw = ['BONUS UP', '25,000', 'BALL SAVE', 'ARM CANNONBALL'][Math.floor(Math.random() * 4)];
      if (aw === 'BONUS UP') G.bxUp(); else if (aw === 'BALL SAVE') G.ballSave(10); else if (aw === 'ARM CANNONBALL') G.comp('cannon').arm(); else G.add(25000);
      G.msg('TICKET BOOTH', aw, { anim: 'marquee' }); G.sfx('chimeHi', { vol: 0.5 }); R.say(G, 'booth');
    },
    // ── prize games ──
    startPrize(G, name) {
      const B = G.b; B.mode = name; B.have = 0;
      const info = { ducks: ['DUCK SHOOT', 'KNOCK DOWN 2 ROWS OF DUCKS', 2, 'ducks'], bumpers: ['BUMPER CARS', 'HIT 15 BUMPERS', 15, 'wheel'], ring: ['RING TOSS', 'RING THE BALL TWICE', 2, 'marquee'], dunk: ['DUNK TANK', 'DUNK THE CLOWN 3 TIMES', 3, 'clown'], coaster: ['COASTER', 'RIDE THE WHEEL TWICE', 2, 'wheel'] }[name];
      B.need = info[2]; G.startMode(name, 30); G.ballSave(5);
      G.big(info[0], info[1], '#ffcc3a', { anim: info[3] }); G.sfx('calliope', { vol: 0.5 }); R.say(G, 'booth', true); G.callout(info[0], '#ffcc3a');
      if (name === 'ring') G.comp('ring').active = true;
      if (name === 'bumpers') G.comp('carousel').w = 5;
    },
    progress(G, label) {
      const B = G.b; if (!B.mode) return;
      if (B.have >= B.need) { R.winPrize(G); return; }
      G.msg(label, (B.need - B.have) + ' MORE', { dur: 1.1 });
    },
    winPrize(G) {
      const B = G.b, i = PRIZE_MODES.indexOf(B.mode); if (i < 0) return;
      B.prizes[i] = 1; G.cnt('prize'); const n = B.prizes.filter(Boolean).length;
      G.endMode(B.mode); B.mode = null; B.monkeyT = G.time;
      G.comp('motor').score(50000);
      G.jackpot(100000, 'YOU WIN A ' + PRIZES[i], { color: '#ffcc3a', sound: 'fanfare' }); R.say(G, 'prize', true);
      if (n === 2) G.lightExtra();
      if (n >= 5) { B.grandLit = true; G.later(2.6, () => G.msg('ALL FIVE PRIZES', 'GRAND PRIZE AT THE BOOTH', { anim: 'marquee', dur: 2.5 })); }
      else B.boothLit = true;
    },
    // ── the barker ──
    openMouth(G) { const B = G.b; B.mouthOpen = true; B.barkerHits = 0; G.comp('barker').open(); G.msg('FEED THE BARKER', 'SHOOT HIS MOUTH', { anim: 'barker' }); G.sfx('horn', { vol: 0.5, x: 290 }); R.say(G, 'open', true); },
    startBarker(G) {
      const B = G.b; B.barker = true; B.fed++; B.bVal = 50000; B.bShot = Math.floor(Math.random() * BARKER_SHOTS.length); B.bShotT = G.time;
      G.startMode('barker', 40); G.cnt('barkerMode');
      G.big('BARKER', 'SHOOT WHAT HE CALLS', '#ff7aa8', { anim: 'barker' }); G.sfx('horn', { vol: 0.6, x: 290 }); G.callout('THE BARKER', '#ff7aa8');
    },
    barkerShot(G, id) {
      const B = G.b; if (!B.barker || BARKER_SHOTS[B.bShot] !== id) return false;
      const p = G.add(B.bVal); B.bVal += 10000; B.bShot = (B.bShot + 1 + Math.floor(Math.random() * (BARKER_SHOTS.length - 1))) % BARKER_SHOTS.length; B.bShotT = G.time;
      G.jackpot(0, 'THE BARKER PAYS', { color: '#ff7aa8', sound: 'chimeHi' }); G.msg('BARKER', fmt(p), { anim: 'barker' }); B.monkeyT = G.time;
      G.later(0.4, () => R.callShot(G)); return true;
    },
    callShot(G) { const B = G.b; if (!B.barker) return; const s = BARKER_SHOTS[B.bShot]; const txt = { wheel: 'Ride the wheel!', striker: 'Ring my bell!', booth: 'Buy a ticket!', ducks: 'Shoot the ducks!', dunk: 'Dunk the clown!', orbitL: 'Round the midway!', orbitR: 'Round the midway!' }[s]; G.say(txt, { force: true }); G.msg('THE BARKER SAYS', txt.toUpperCase(), { anim: 'barker', dur: 1.6 }); },
    // ── the high striker ──
    strike(G) {
      const B = G.b, st = G.comp('striker'), imp = st.lastImp || 600;
      const k = clamp(imp / 1500, 0.15, 1.0);
      if (B.strong && B.hurry > 0) { const p = G.add(B.hurry); B.hurry = 0; B.strong = false; G.endMode('strongman'); B.strongDone++; G.cnt('strong'); G.jackpot(0, 'STRONGMAN', { color: '#ff9a40', sound: 'fanfare' }); G.msg('STRONGMAN', fmt(p), { anim: 'bell' }); B.monkeyT = G.time; G.comp('motor').score(20000); return; }
      B.puck = Math.min(1, B.puck + k * 0.62); B.puckT = G.time; G.add(5000);
      if (B.grand) G.add(100000);
      if (B.puck >= 0.99) {
        B.puck = 1; B.bell++; B.bellAt = G.time; G.cnt('bell'); G.sfx('bigBell', { vol: 0.9, x: 407 }); G.shake(0.5); B.monkeyT = G.time;
        if (!B.strong && !G.mb) R.startStrong(G); else { G.add(50000); G.msg('DING!', fmt(50000 * G.mult), { anim: 'bell' }); }
        R.barkerShot(G, 'striker');
      } else {
        const names = ['PUNY', 'WEAKLING', 'FAIR', 'STRONG', 'MIGHTY'], n = names[Math.min(4, Math.floor(B.puck * 5))];
        G.msg('HIGH STRIKER', n, { anim: 'bell', dur: 1.0 }); G.sfx('puck', { vol: 0.5, x: 407 }); if (B.puck < 0.4 && G.time - B.tauntT > 7) { B.tauntT = G.time; R.say(G, 'puny'); }
      }
    },
    startStrong(G) {
      const B = G.b; B.strong = true; B.hurry = 200000; G.startMode('strongman', 25); G.cnt('mode');
      G.big('STRONGMAN', 'HIT THE PAD AGAIN: 200,000', '#ff9a40', { anim: 'bell' }); G.callout('STRONGMAN', '#ff9a40'); R.say(G, 'bell', true);
    },
    // ── the dunk tank ──
    dunk(G) {
      const B = G.b; B.dunks++; B.dunkAt = G.time; G.cnt('dunk'); G.sfx('splash', { vol: 0.8, x: 84 }); G.shake(0.3);
      if (B.mode === 'dunk') { G.add(30000); B.have++; R.progress(G, 'DUNK TANK'); }
      else if (B.grand) G.add(100000);
      else { G.add(7500); G.msg('DUNKED!', fmt(7500 * G.mult), { anim: 'clown' }); }
      if (B.dunks % 3 === 0) { G.comp('cannon').arm(); G.add(20000); if (B.dunks === 9) G.lightExtra(); else G.msg('THREE DUNKS', 'CANNONBALL ARMED', { anim: 'clown' }); }
      if (G.time - B.tauntT > 6) { B.tauntT = G.time; R.say(G, 'dunk'); }
      R.barkerShot(G, 'dunk');
    },
    // ── multiball and the wizard ──
    startWheelMB(G) {
      const B = G.b; B.wheelMB = true; B.lockLit = false; B.locks = 0; B.spinsNeed += 10; G.cnt('wheelmb');
      const gb = G.comp('gumball');
      G.multiball(3, { label: 'WHEEL MULTIBALL', color: '#e8463c', save: 15, from: i => gb.dispense() });
      B.jp = { coaster: 1, booth: 1 }; B.jpV = 100000; B.superLit = false; R.say(G, 'mb', true); G.sfx('calliope', { vol: 0.6 });
    },
    jackpot(G, id) {
      const B = G.b; delete B.jp[id];
      const v = id === 'booth' ? B.jpV * 2 : B.jpV; B.jpV += 25000;
      G.jackpot(v, id === 'booth' ? 'DOUBLE JACKPOT' : 'JACKPOT', { color: '#e8463c' }); R.say(G, 'jackpot'); B.monkeyT = G.time;
      if (!Object.keys(B.jp).length) { B.superLit = true; G.comp('barker').open(); G.msg('SUPER JACKPOT', 'FEED THE BARKER', { anim: 'barker' }); }
    },
    startGrand(G) {
      const B = G.b; B.grand = true; G.cnt('wiz'); B.prizes = [0, 0, 0, 0, 0];
      G.multiball(4, { label: 'THE GRAND PRIZE', color: '#ffcc3a', save: 25 });
      G.startMode('grand', 60); G.comp('ring').active = true; G.comp('barker').open(); G.comp('carousel').w = 5;
      G.sfx('fanfare', { vol: 0.9 }); G.later(0.8, () => G.sfx('calliope', { vol: 0.7 })); R.say(G, 'grand', true); G.callout('THE GRAND PRIZE', '#ffcc3a');
      B.monkeyT = G.time + 1;
    },
    grandShot(G, id) { G.add(100000); G.msg('GRAND PRIZE', '100,000', { anim: 'marquee', dur: 1.0 }); },
    modeEnd(G, name) {
      const B = G.b;
      if (PRIZE_MODES.includes(name)) { if (B.mode === name) { B.mode = null; B.boothLit = true; G.msg('TIME IS UP', 'TRY AGAIN AT THE BOOTH', {}); G.sfx('horn', { vol: 0.4, rate: 0.7 }); } G.comp('ring').active = B.grand; G.comp('carousel').w = B.grand ? 5 : 2.2; }
      if (name === 'barker') { B.barker = false; G.msg('THE BARKER', 'HAS NOTHING MORE TO SAY', { anim: 'barker' }); G.comp('barker').close(); }
      if (name === 'strongman') { B.strong = false; B.hurry = 0; G.msg('STRONGMAN', 'TOO SLOW', {}); }
      if (name === 'grand') { B.grand = false; G.comp('ring').active = false; G.comp('barker').close(); G.comp('carousel').w = 2.2; G.msg('THE MIDWAY CLOSES', 'COME AGAIN', { anim: 'marquee' }); }
    },
    mbEnd(G) { const B = G.b; B.wheelMB = false; B.superLit = false; B.jp = {}; if (!B.mouthOpen) G.comp('barker').close(); if (B.grand) { B.grand = false; G.endMode('grand'); } },
    levelDrain() { return false; },
    drain() { return false; },
    update(G, dt) {
      const B = G.b;
      // the high striker puck falls back after a moment
      if (B.puck > 0 && G.time - B.puckT > 2.2 && B.puck < 1) B.puck = Math.max(0, B.puck - dt * 0.35);
      if (B.puck >= 1 && G.time - B.puckT > 3) B.puck = Math.max(0, B.puck - dt * 0.5);
      // strongman hurry-up counts down
      if (B.strong && B.hurry > 50000) B.hurry = Math.max(50000, B.hurry - dt * 6000);
      // the barker changes his mind every few seconds
      if (B.barker && G.time - B.bShotT > 7) { B.bShot = (B.bShot + 1) % BARKER_SHOTS.length; B.bShotT = G.time; R.callShot(G); }
      // the barker's mouth closes after a while if not fed (not during multiball super)
      if (B.mouthOpen && !B.superLit && !B.grand && G.state === 'play' && !G.comp('barker').balls.length && G.time - (B.mouthAt || 0) > 18) { B.mouthOpen = false; G.comp('barker').close(); G.msg('THE BARKER', 'GOT BORED', { anim: 'barker' }); }
      if (!B.mouthOpen) B.mouthAt = G.time;
      // the backbox monkey rings his bell when something big happens (the mallet lands a third of a second in)
      if (B.monkeyT !== B.monkeyLast) { B.monkeyLast = B.monkeyT; G.later(0.36, () => G.sfx('bellRing', { x: MONKEY[0], vol: 0.45 })); }
      // carnival ambience: a distant horn, a chime, sparse and quiet
      if (G.amb && G.state === 'play') { B.hornT -= dt; if (B.hornT <= 0) { B.hornT = 16 + Math.random() * 20; G.sfx(Math.random() < 0.5 ? 'horn' : 'chimeHi', { vol: 0.08, x: Math.random() * 520, rate: 0.8 + Math.random() * 0.3 }); } }
    },
    lamps(G) {
      const B = G.b, L = {}, t = G.time, bs = B.barker ? BARKER_SHOTS[B.bShot] : '';
      L.arrOrbL = bs === 'orbitL' || B.grand ? 'fast' : G.lastShot === 'orbitR' && t - G.lastShotT < 4 ? 'blink' : 0;
      L.arrOrbR = bs === 'orbitR' || B.grand ? 'fast' : G.lastShot === 'orbitL' && t - G.lastShotT < 4 ? 'blink' : 0;
      L.arrDunk = bs === 'dunk' || B.mode === 'dunk' || B.grand ? 'fast' : (B.dunks % 3) / 3 + 0.1;
      L.arrWheel = bs === 'wheel' || B.mode === 'coaster' || B.grand || (B.wheelMB && B.jp.coaster) ? 'fast' : B.lockLit ? 'blink' : 'slow';
      L.lockL = B.lockLit ? 'blink' : B.locks ? 'pulse' : B.spins / B.spinsNeed * 0.8;
      for (let i = 0; i < 3; i++) L['ride' + i] = B.mode === 'coaster' ? (i < B.have ? 1 : 'blink') : (i < B.rideN % 4 ? 1 : 0);
      L.arrPops = B.mode === 'bumpers' ? 'fast' : 0;
      L.barkerL = B.mouthOpen ? 'fast' : B.barker ? 'blink' : B.barkerHits / 3;
      L.arrBooth = bs === 'booth' || B.grandLit || (B.wheelMB && B.jp.booth) ? 'fast' : (B.boothLit && !B.mode) || G.ebLit ? 'blink' : 0;
      L.boothL = B.grandLit ? 'fast' : B.boothLit && !B.mode ? 'blink' : 0;
      L.arrStrike = bs === 'striker' || B.strong || B.grand ? 'fast' : B.puck > 0.05 ? 'blink' : 'slow';
      L.strongL = B.strong ? 'fast' : B.strongDone ? 1 : 0;
      L.ringL = G.comp('ring').active ? (G.comp('ring').held ? 1 : 'blink') : B.mode === 'ring' ? 'fast' : 0;
      L.gpL = B.grand ? 'fast' : B.grandLit ? 'blink' : B.prizes.filter(Boolean).length / 5;
      B.prizes.forEach((p, i) => { L['prize' + i] = p ? 1 : B.mode === PRIZE_MODES[i] ? 'fast' : (B.boothLit && !B.mode && PRIZE_MODES.findIndex((m, k) => !B.prizes[k]) === i) ? 'blink' : 0; });
      L.ebL = G.ebLit ? 'blink' : 0;
      ['laneW', 'laneI', 'laneN'].forEach((id, i) => { L[id] = B.win[i] ? 1 : (G.skill && i === B.winLit) ? 'fast' : 0; });
      const dk = G.comp('ducks'); if (dk) dk.targets.forEach((tg, i) => { L['d' + i] = tg.up ? (B.mode === 'ducks' ? 'blink' : 0) : 1; });
      L.cannon = G.comp('cannon').armed ? 1 : 0;
      L.flL = (B.wheelMB || B.grand) && (t % 1.4) < 0.1 ? 1 : 0; L.flR = B.grand && (t % 1.1) < 0.1 ? 1 : 0; L.flC = (B.barker || B.mouthOpen) && (t % 1.6) < 0.1 ? 1 : 0;
      for (let i = 0; i < 8; i++) L['gi' + i] = 1;
      const fast = G.mb || B.grand || B.mode; const ph = Math.floor(t * (fast ? 9 : 4));
      for (let i = 0; i < 26; i++) L['mq' + i] = ((i + ph) % 3) === 0 ? 1 : 0.12;
      for (let i = 0; i < 6; i++) L['tw' + i] = B.puck * 6 > i + 0.5 ? 1 : B.puck >= 1 && (t * 8 | 0) % 2 ? 1 : 0.05;
      L.pop1 = L.pop2 = L.pop3 = B.mode === 'bumpers' ? 'blink' : 0.25;
      return L;
    },
    status(G) {
      const B = G.b;
      if (B.grand) return 'THE GRAND PRIZE: EVERY SHOT 100,000';
      if (B.wheelMB) return B.superLit ? 'SUPER JACKPOT: FEED THE BARKER' : 'MULTIBALL: COASTER AND BOOTH ARE JACKPOTS';
      if (B.strong) return 'STRONGMAN: HIT THE PAD FOR ' + fmt(B.hurry);
      if (B.mode) return { ducks: 'DUCK SHOOT: KNOCK DOWN THE DUCKS', bumpers: 'BUMPER CARS: HIT THE POP BUMPERS', ring: 'RING TOSS: SHOOT UNDER THE RING', dunk: 'DUNK TANK: HIT THE DUNK TARGET', coaster: 'COASTER: RIDE THE WHEEL' }[B.mode] + '  ' + Math.ceil(G.modes[B.mode] || 0);
      if (B.barker) return 'THE BARKER SAYS: ' + { wheel: 'RIDE THE WHEEL', striker: 'RING THE BELL', booth: 'BUY A TICKET', ducks: 'SHOOT THE DUCKS', dunk: 'DUNK THE CLOWN', orbitL: 'ROUND THE MIDWAY', orbitR: 'ROUND THE MIDWAY' }[BARKER_SHOTS[B.bShot]];
      if (B.grandLit) return 'GRAND PRIZE IS LIT AT THE TICKET BOOTH';
      if (B.mouthOpen) return 'FEED THE BARKER';
      const opts = [];
      if (B.boothLit) opts.push('STEP RIGHT UP: SHOOT THE TICKET BOOTH'); else opts.push('SPELL W-I-N TO LIGHT THE BOOTH');
      if (B.lockLit) opts.unshift('LOCK IS LIT: RIDE THE WHEEL'); else opts.push((B.spinsNeed - B.spins) + ' SPINS TO LIGHT LOCK');
      opts.push('PRIZES WON: ' + B.prizes.filter(Boolean).length + ' OF 5', 'RING THE BELL FOR STRONGMAN');
      return opts[Math.floor(G.time / 4) % opts.length];
    },
    bonus(G) { return [['TICKETS', G.pbn('tickets'), 5000], ['RIDES', G.pbn('ride'), 10000], ['DUCKS', G.pbn('dt'), 2000], ['DUNKS', G.pbn('dunk'), 5000], ['BUMPERS', G.pbn('pop'), 300], ['PRIZES', G.pbn('prize'), 25000]]; }
  };
  return R;
}

// ── EM-style score reels on the DMD (idle scene) ────────────────────────────
const REEL = { last: null, dig: [], t: [] };
function dmdReels(g, W, H, t, G) {
  const s = String(Math.round(G.shownScore || 0)).padStart(8, '0');
  if (REEL.last == null) { REEL.dig = s.split(''); REEL.t = REEL.dig.map(() => -9); REEL.last = s; }
  for (let i = 0; i < 8; i++) if (s[i] !== REEL.dig[i]) { REEL.prev = REEL.prev || []; REEL.prev[i] = REEL.dig[i]; REEL.dig[i] = s[i]; REEL.t[i] = t; }
  const cw = 13, ch = 15, x0 = Math.round(W / 2 - 8 * (cw + 1) / 2), y0 = 8;
  g.fillStyle = '#666'; g.fillRect(x0 - 2, y0 - 1, 8 * (cw + 1) + 3, ch + 2);
  g.fillStyle = '#000'; g.fillRect(x0 - 1, y0, 8 * (cw + 1) + 1, ch);
  let lead = true;
  for (let i = 0; i < 8; i++) {
    const x = x0 + i * (cw + 1), d = REEL.dig[i], k = clamp((t - REEL.t[i]) / 0.14, 0, 1);
    if (d !== '0' || i === 7) lead = false;
    g.fillStyle = '#1c1c1c'; g.fillRect(x, y0, cw, ch);
    g.save(); g.beginPath(); g.rect(x, y0, cw, ch); g.clip();
    g.fillStyle = lead ? '#3a3a3a' : '#fff'; g.font = '900 14px "Arial Narrow",Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
    if (k < 1 && REEL.prev && REEL.prev[i] != null) { g.fillText(REEL.prev[i], x + cw / 2, y0 + ch / 2 - k * ch); g.fillText(d, x + cw / 2, y0 + ch / 2 + (1 - k) * ch); }
    else g.fillText(d, x + cw / 2, y0 + ch / 2 + 0.5);
    g.restore();
    g.fillStyle = '#000'; g.fillRect(x, y0 + ch / 2, cw, 1);   // the reel's split line
  }
  // the engine's furniture: ball number, multiplier, status line
  g.fillStyle = '#fff';
  smallText(g, 'BALL ' + Math.min(G.ballNo, G.balls0), 1, 0);
  smallText(g, G.mult > 1 ? 'SCORE x' + G.mult : G.bx > 1 ? 'BONUS ' + G.bx + 'x' : 'MIDWAY', W - 1, 0, 'right');
  const touch = typeof window !== 'undefined' && (('ontouchstart' in window) || navigator.maxTouchPoints > 0);
  let st = G.waitPlunge ? (Math.floor(t / 2.2) % 2 ? (G.call('status') || '') : (touch ? 'PULL DOWN ON THE RIGHT TO LAUNCH' : 'HOLD SPACE TO LAUNCH')) : (G.call('status') || '');
  if (G.tiltM >= 1.9 && !G.tilted) st = 'CAREFUL: TILT WARNING';
  st = String(st).toUpperCase(); const w = smallW(st);
  if (w <= W - 2) smallText(g, st, W / 2, 25, 'center'); else { const off = (t * 32) % (w + 60); smallText(g, st, W - off, 25); smallText(g, st, W - off + w + 60, 25); }
  return true;
}

// ═══════════════════════════════════════════════════════════════════════════
// ART (canvas painters; the playfield is in table space, y up)
// ═══════════════════════════════════════════════════════════════════════════
const BUNGEE = '"Bungee", Impact, "Arial Black", sans-serif', SERIF = '"Cinzel", Georgia, serif';
function paintPlayfield(P) {
  const g = P.ctx, W = P.W, L = P.L, r = rng(31);
  // aged cream paint with a faint paper grain
  g.fillStyle = P.lin(0, 0, 0, L, [[0, '#ecd9b4'], [0.35, '#f3e6c6'], [0.62, '#f1e2c0'], [1, '#e8d6b0']]); g.fillRect(0, 0, W, L);
  for (let i = 0; i < 900; i++) { const x = r() * W, y = r() * L, s = 2 + r() * 9; g.fillStyle = 'rgba(' + (r() < 0.5 ? '120,80,40' : '255,250,235') + ',' + (0.025 + r() * 0.05) + ')'; g.beginPath(); g.ellipse(x, y, s, s * (0.4 + r()), r() * PI, 0, TAU); g.fill(); }
  // ── night sky over the back half, a sunset band, tents on the horizon ──
  g.save(); g.beginPath(); g.rect(0, 640, W, L - 640); g.clip();
  g.fillStyle = P.lin(0, 640, 0, L, [[0, '#ff9a4a'], [0.1, '#e8607a'], [0.28, '#5a3a86'], [0.55, '#1f2a5c'], [1, '#0d1232']]); g.fillRect(0, 640, W, L - 640);
  for (let i = 0; i < 160; i++) { const x = r() * W, y = 760 + r() * 300, s = 0.6 + r() * 1.3; g.fillStyle = 'rgba(255,245,210,' + (0.35 + r() * 0.6) + ')'; g.beginPath(); g.arc(x, y, s, 0, TAU); g.fill(); }
  P.glow(260, 660, 240, '#ffb060', 0.35);
  // distant tents and a coaster hill in silhouette along the sunset
  g.fillStyle = '#3a1020';
  for (const [x, w, h] of [[20, 70, 40], [110, 90, 52], [230, 60, 34], [330, 110, 60], [440, 80, 44]]) { g.beginPath(); g.moveTo(x, 660); g.lineTo(x + w / 2, 660 + h); g.lineTo(x + w, 660); g.closePath(); g.fill(); g.fillRect(x + w / 2 - 1, 660 + h, 2, 12); }
  g.strokeStyle = 'rgba(40,10,20,.85)'; g.lineWidth = 2.2; g.beginPath(); for (let x = 0; x <= W; x += 10) { const y = 700 + 26 * Math.sin(x / 48) + 18 * Math.sin(x / 19 + 1); x ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
  g.lineWidth = 0.8; for (let x = 0; x <= W; x += 14) { const y = 700 + 26 * Math.sin(x / 48) + 18 * Math.sin(x / 19 + 1); g.beginPath(); g.moveTo(x, y); g.lineTo(x, 672); g.stroke(); }
  // lit tent doors
  g.fillStyle = '#ffd27a'; for (const x of [55, 155, 260, 385, 480]) g.fillRect(x - 3, 661, 6, 9);
  g.restore();
  // ── the big top: the left block's top is a striped tent roof seen from above ──
  g.save(); P.poly(BLOCK).clip();
  const tc = [138, 880];
  for (let i = 0; i < 22; i++) { const a0 = i / 22 * TAU, a1 = (i + 1) / 22 * TAU; g.fillStyle = i % 2 ? '#c8302c' : '#f3e6c4'; g.beginPath(); g.moveTo(tc[0], tc[1]); g.arc(tc[0], tc[1], 300, a0, a1); g.closePath(); g.fill(); }
  g.fillStyle = P.rad(tc[0], tc[1], 0, 240, [[0, 'rgba(0,0,0,0)'], [0.6, 'rgba(0,0,0,.08)'], [1, 'rgba(0,0,0,.35)']]); g.fillRect(0, 600, 300, 460);
  g.restore();
  // ── the midway ground: a sunburst behind the carousel ──
  g.save(); g.beginPath(); g.rect(0, 340, W, 300); g.clip();
  for (let i = 0; i < 28; i++) { const a0 = i / 28 * TAU, a1 = (i + 0.5) / 28 * TAU; g.fillStyle = i % 2 ? 'rgba(200,48,44,.16)' : 'rgba(255,204,58,.16)'; g.beginPath(); g.moveTo(243, 470); g.arc(243, 470, 420, a0, a1); g.closePath(); g.fill(); }
  g.restore();
  // ── boardwalk planks across the lower third ──
  g.save(); g.beginPath(); g.rect(0, 100, W, 242); g.clip();
  for (let y = 100; y < 342; y += 16) { const k = r(); g.fillStyle = 'rgb(' + (150 + k * 30 | 0) + ',' + (104 + k * 22 | 0) + ',' + (60 + k * 16 | 0) + ')'; g.fillRect(0, y, W, 15); g.fillStyle = 'rgba(60,30,10,.55)'; g.fillRect(0, y + 15, W, 1.2);
    for (let k2 = 0; k2 < 5; k2++) { const x = r() * W; g.strokeStyle = 'rgba(70,40,15,.25)'; g.lineWidth = 0.5; g.beginPath(); g.moveTo(x, y + 1); g.lineTo(x + 40 + r() * 80, y + 2 + r() * 10); g.stroke(); }
    for (const x of [60, 180, 340, 460]) { g.fillStyle = 'rgba(40,30,30,.6)'; g.beginPath(); g.arc(x + (y % 32 ? 30 : 0), y + 7, 1.1, 0, TAU); g.fill(); } }
  g.restore();
  g.fillStyle = 'rgba(60,30,10,.35)'; g.fillRect(0, 340, W, 3);
  // ── lane and feature lettering ──
  P.text('MIDWAY', 31, 840, { size: 10, color: 'rgba(255,230,170,.85)', font: BUNGEE, weight: '400', rot: 90 });
  P.text('MIDWAY', 455, 760, { size: 10, color: 'rgba(255,230,170,.85)', font: BUNGEE, weight: '400', rot: 90 });
  P.text('DUNK TANK', 83, 584, { size: 5.5, color: '#2a1a14', font: BUNGEE, weight: '400' });
  P.text('ALL ABOARD', 130, 596, { size: 5, color: '#2a1a14', font: BUNGEE, weight: '400' });
  P.text('THE ALLEY', 352, 700, { size: 6, color: 'rgba(255,230,170,.9)', font: BUNGEE, weight: '400', rot: -72 });
  P.text('TEST YOUR', 404, 602, { size: 5, color: '#2a1a14', font: BUNGEE, weight: '400', rot: -20 }); P.text('STRENGTH', 398, 594, { size: 5, color: '#2a1a14', font: BUNGEE, weight: '400', rot: -20 });
  P.text('RING TOSS', RING[0], RING[1] - 32, { size: 6, color: '#2a1a14', font: BUNGEE, weight: '400' });
  P.text('GRAND PRIZE', 243, 530, { size: 5.5, color: '#8a1a14', font: BUNGEE, weight: '400' });
  P.text('BUMPER CARS', 302, 830, { size: 7, color: 'rgba(255,230,170,.85)', font: BUNGEE, weight: '400' });
  // title on the boardwalk
  P.text('MIDWAY MAYHEM', 243, 352, { size: 17, color: '#c8302c', font: BUNGEE, weight: '400', stroke: '#f8f1dc', strokeW: 3.5, spacing: 1 });
  P.text('BOARDWALK CARNIVAL  ·  EST. 1958', 243, 334, { size: 5, color: '#4a2a14', font: SERIF });
  // ticket booth sign on the ground and a few scattered tickets
  for (let i = 0; i < 14; i++) { const x = 80 + r() * 360, y = 120 + r() * 200; g.save(); g.translate(x, y); g.rotate(r() * TAU); g.fillStyle = r() < 0.5 ? 'rgba(232,70,60,.8)' : 'rgba(255,204,58,.85)'; g.fillRect(-7, -3.5, 14, 7); g.fillStyle = 'rgba(60,30,20,.5)'; for (let k = -5; k <= 5; k += 2.5) { g.fillRect(k - 0.4, -3.5, 0.8, 1.2); g.fillRect(k - 0.4, 2.3, 0.8, 1.2); } g.fillRect(-5, -0.5, 10, 1); g.restore(); }
  // pennant string along the arch
  g.lineWidth = 0.9; g.strokeStyle = 'rgba(40,30,30,.8)'; g.beginPath(); for (let a = 8; a <= 172; a += 2) { const x = 260 + Math.cos(deg(a)) * 232, y = 802 + Math.sin(deg(a)) * 232; a === 8 ? g.moveTo(x, y) : g.lineTo(x, y); } g.stroke();
  for (let a = 12; a <= 168; a += 7) { const x = 260 + Math.cos(deg(a)) * 232, y = 802 + Math.sin(deg(a)) * 232, nx = -Math.cos(deg(a)), ny = -Math.sin(deg(a)); g.fillStyle = ['#c8302c', '#ffcc3a', '#f3e6c4', '#1d4e9a'][(a / 7 | 0) % 4]; g.beginPath(); g.moveTo(x - ny * 5, y + nx * 5); g.lineTo(x + ny * 5, y - nx * 5); g.lineTo(x + nx * 13, y + ny * 13); g.closePath(); g.fill(); }
  // balloons low on the sides
  for (const [x, y, c] of [[112, 372, '#e8463c'], [124, 388, '#1d4e9a'], [370, 374, '#ffcc3a'], [384, 390, '#2a8c8c']]) { g.fillStyle = c; g.beginPath(); g.ellipse(x, y, 7, 9, 0, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,255,255,.45)'; g.beginPath(); g.ellipse(x - 2.5, y + 3, 2, 3, 0.4, 0, TAU); g.fill(); g.strokeStyle = 'rgba(40,30,30,.6)'; g.lineWidth = 0.5; g.beginPath(); g.moveTo(x, y - 9); g.quadraticCurveTo(x + 3, y - 20, x - 2, y - 30); g.stroke(); }
  // wear round the flippers and slings
  P.glow(152, 165, 60, '#6a4a2a', 0.18); P.glow(334, 165, 60, '#6a4a2a', 0.18); P.glow(243, 120, 90, '#4a3018', 0.22);
}
function paintOverlay(P) {
  // plush prizes printed on the inserts (dark ink stays dark when lit) and the EM-style lettering under them
  const g = P.ctx;
  PRIZES.forEach((p, i) => {
    const x = PRIZE_X[i], y = PRIZE_Y; g.save(); g.translate(x, y); g.fillStyle = 'rgba(20,12,10,.9)'; g.strokeStyle = g.fillStyle; g.lineWidth = 1.1; g.lineCap = 'round';
    if (i === 0) { g.beginPath(); g.ellipse(0, -1.5, 5.5, 4, 0, 0, TAU); g.fill(); g.beginPath(); g.arc(3.5, 3, 3, 0, TAU); g.fill(); g.beginPath(); g.moveTo(6, 3); g.lineTo(9, 2.2); g.lineTo(6.2, 1.4); g.fill(); }   // duck
    else if (i === 1) { g.beginPath(); g.arc(0, -2.5, 5, 0, TAU); g.fill(); g.beginPath(); g.arc(0, 3.5, 3.6, 0, TAU); g.fill(); g.beginPath(); g.arc(-3.2, 6.4, 1.7, 0, TAU); g.arc(3.2, 6.4, 1.7, 0, TAU); g.fill(); g.beginPath(); g.arc(-5.5, -4, 1.5, 0, TAU); g.arc(5.5, -4, 1.5, 0, TAU); g.fill(); }   // bear
    else if (i === 2) { g.beginPath(); g.ellipse(-1, 0, 5.5, 3.6, 0, 0, TAU); g.fill(); g.beginPath(); g.moveTo(4, 0); g.lineTo(8, 3.5); g.lineTo(8, -3.5); g.closePath(); g.fill(); }   // fish
    else if (i === 3) { g.beginPath(); g.ellipse(0, 0, 6, 4.5, 0, 0, TAU); g.fill(); g.beginPath(); g.arc(-4.5, 3, 3, 0, TAU); g.fill(); g.beginPath(); g.moveTo(-7, 2); g.quadraticCurveTo(-9, -3, -6, -6); g.stroke(); g.fillRect(-4, -6, 2, 4); g.fillRect(2, -6, 2, 4); }   // elephant
    else { g.beginPath(); g.arc(0, 0, 6.5, 0, TAU); g.fill(); g.fillStyle = 'rgba(243,230,196,.9)'; g.beginPath(); g.arc(0, -0.5, 3.6, 0, TAU); g.fill(); g.fillStyle = 'rgba(20,12,10,.9)'; g.beginPath(); g.arc(-1.4, -1, 0.7, 0, TAU); g.arc(1.4, -1, 0.7, 0, TAU); g.fill(); g.fillRect(-0.6, 0.2, 1.2, 1.6); }   // lion
    g.restore();
    P.text(p, x, y - 15, { size: 4.2, color: '#2a1a14', font: BUNGEE, weight: '400' });
  });
}
function paintBackglass(g, w, h) {
  // a boardwalk at dusk: sunset sky, the wheel and the coaster in silhouette with their bulbs lit, poster lettering
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#141a44'); gr.addColorStop(0.42, '#6a3a7a'); gr.addColorStop(0.62, '#f06a5a'); gr.addColorStop(0.74, '#ffb060'); gr.addColorStop(0.78, '#2a1a24'); gr.addColorStop(1, '#120a12'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  const r = rng(4); for (let i = 0; i < 90; i++) { g.fillStyle = 'rgba(255,245,220,' + (0.3 + r() * 0.6) + ')'; g.beginPath(); g.arc(r() * w, r() * h * 0.4, 0.6 + r() * 1.2, 0, TAU); g.fill(); }
  const sun = g.createRadialGradient(w * 0.5, h * 0.72, 0, w * 0.5, h * 0.72, 150); sun.addColorStop(0, 'rgba(255,240,180,.9)'); sun.addColorStop(0.25, 'rgba(255,200,120,.5)'); sun.addColorStop(1, 'rgba(255,160,80,0)'); g.fillStyle = sun; g.fillRect(0, 0, w, h);
  // the wheel
  const wx = w * 0.27, wy = h * 0.5, wr = 96;
  g.strokeStyle = '#1a0c14'; g.lineWidth = 5; g.beginPath(); g.arc(wx, wy, wr, 0, TAU); g.stroke(); g.lineWidth = 2.2; for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; g.beginPath(); g.moveTo(wx, wy); g.lineTo(wx + Math.cos(a) * wr, wy + Math.sin(a) * wr); g.stroke(); }
  g.beginPath(); g.moveTo(wx - 40, h * 0.78); g.lineTo(wx, wy); g.lineTo(wx + 40, h * 0.78); g.stroke();
  for (let i = 0; i < 12; i++) { const a = i / 12 * TAU, x = wx + Math.cos(a) * wr, y = wy + Math.sin(a) * wr; g.fillStyle = i % 2 ? '#e8463c' : '#ffcc3a'; g.fillRect(x - 6, y, 12, 9); g.fillStyle = '#1a0c14'; g.fillRect(x - 1, y - 6, 2, 7); }
  for (let i = 0; i < 36; i++) { const a = i / 36 * TAU, x = wx + Math.cos(a) * (wr + 7), y = wy + Math.sin(a) * (wr + 7); g.fillStyle = i % 3 ? 'rgba(255,230,160,.9)' : '#fff'; g.shadowColor = '#ffd080'; g.shadowBlur = 8; g.beginPath(); g.arc(x, y, 2.2, 0, TAU); g.fill(); } g.shadowBlur = 0;
  // the coaster
  g.strokeStyle = '#1a0c14'; g.lineWidth = 4; g.beginPath(); for (let x = w * 0.42; x <= w; x += 6) { const y = h * 0.6 - 60 * Math.pow(Math.sin((x - w * 0.42) / 90), 2) + 14 * Math.sin(x / 23); x === w * 0.42 ? g.moveTo(x, y) : g.lineTo(x, y); } g.stroke();
  g.lineWidth = 1.5; for (let x = w * 0.42; x <= w; x += 14) { const y = h * 0.6 - 60 * Math.pow(Math.sin((x - w * 0.42) / 90), 2) + 14 * Math.sin(x / 23); g.beginPath(); g.moveTo(x, y); g.lineTo(x, h * 0.78); g.stroke(); }
  // boardwalk and tents
  g.fillStyle = '#1a0c14'; g.fillRect(0, h * 0.78, w, h * 0.22);
  for (const [x, ww, hh] of [[w * 0.5, 60, 46], [w * 0.62, 80, 60], [w * 0.8, 56, 40]]) { g.fillStyle = '#2a1018'; g.beginPath(); g.moveTo(x - ww / 2, h * 0.78); g.lineTo(x, h * 0.78 - hh); g.lineTo(x + ww / 2, h * 0.78); g.fill(); g.fillStyle = '#ffd27a'; g.fillRect(x - 5, h * 0.78 - 14, 10, 14); }
  // title in carnival poster lettering
  g.save(); g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
  const title = (s, y, size) => { g.font = '400 ' + size + 'px ' + BUNGEE; g.lineWidth = 12; g.strokeStyle = '#1a0c14'; g.strokeText(s, w / 2 + 3, y + 5); g.lineWidth = 9; g.strokeStyle = '#f8f1dc'; g.strokeText(s, w / 2, y); g.fillStyle = '#e8463c'; g.fillText(s, w / 2, y); g.lineWidth = 1.5; g.strokeStyle = '#ffcc3a'; g.strokeText(s, w / 2, y); };
  title('MIDWAY', h * 0.19, 86); title('MAYHEM', h * 0.36, 86);
  g.font = '700 22px ' + SERIF; g.fillStyle = '#ffe6a0'; g.shadowColor = '#000'; g.shadowBlur = 6; g.fillText('STEP RIGHT UP', w / 2, h * 0.47); g.restore();
  // bulb border
  for (let i = 0; i < 44; i++) { const t = i / 44, p = t * 4, s = Math.floor(p), f = p - s; let x, y; if (s === 0) { x = f * w; y = 8; } else if (s === 1) { x = w - 8; y = f * h; } else if (s === 2) { x = w - f * w; y = h - 8; } else { x = 8; y = h - f * h; } g.fillStyle = i % 2 ? '#fff6d0' : '#ffcc3a'; g.shadowColor = '#ffd080'; g.shadowBlur = 10; g.beginPath(); g.arc(x, y, 4, 0, TAU); g.fill(); }
  g.shadowBlur = 0;
}
function paintApron(g, w, h) {
  for (let i = 0; i < w / 40; i++) { g.fillStyle = i % 2 ? '#c8302c' : '#f3e6c4'; g.fillRect(i * 40, 0, 40, h); }
  g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#f6ecd0'; g.fillRect(90, 34, w - 180, h - 68); g.strokeStyle = '#c8302c'; g.lineWidth = 4; g.strokeRect(100, 44, w - 200, h - 88); g.strokeStyle = '#e0a63a'; g.lineWidth = 1.5; g.strokeRect(108, 52, w - 216, h - 104);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '400 54px ' + BUNGEE; g.fillStyle = '#c8302c'; g.fillText('MIDWAY MAYHEM', w / 2, h * 0.42);
  g.font = '700 17px ' + SERIF; g.fillStyle = '#3a2214';
  g.fillText('RIDE THE WHEEL  ·  RING THE BELL  ·  DUNK THE CLOWN  ·  WIN A PRIZE', w / 2, h * 0.66);
  g.font = '700 13px ' + SERIF; g.fillStyle = '#6a4a2a'; g.fillText('3 BALLS PER GAME  ·  SPELL W-I-N TO LIGHT THE TICKET BOOTH  ·  ALL FIVE PRIZES LIGHT THE GRAND PRIZE', w / 2, h * 0.8);
  for (let i = 0; i < 14; i++) { g.fillStyle = i % 2 ? '#ffe29a' : '#fff6d0'; g.shadowColor = '#ffd080'; g.shadowBlur = 8; g.beginPath(); g.arc(120 + i * (w - 240) / 13, 22, 5, 0, TAU); g.fill(); } g.shadowBlur = 0;
}
function paintSides(g, w, h) {
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#c8302c'); gr.addColorStop(1, '#7a1612'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.fillStyle = '#f3e6c4'; g.fillRect(0, 10, w, 3); g.fillRect(0, h - 14, w, 3);
  g.fillStyle = '#e0a63a'; g.fillRect(0, 16, w, 1.5); g.fillRect(0, h - 18, w, 1.5);
  for (let x = 24; x < w; x += 48) { g.fillStyle = '#ffe6a8'; g.shadowColor = '#ffd080'; g.shadowBlur = 6; g.beginPath(); g.arc(x, h / 2, 4, 0, TAU); g.fill(); } g.shadowBlur = 0;
  g.font = '400 40px ' + BUNGEE; g.fillStyle = 'rgba(255,230,170,.18)'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('MIDWAY  MAYHEM  MIDWAY  MAYHEM', w / 2, h / 2);
}
function paintBackboard(g, w, h) {
  // a striped canvas awning with a scalloped edge, cream wall below (the marquee sign is 3D in front of it)
  g.fillStyle = '#efe0bc'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < w / 48; i++) { g.fillStyle = i % 2 ? '#c8302c' : '#f6ecd0'; g.fillRect(i * 48, 0, 48, 118); }
  g.fillStyle = '#efe0bc'; for (let i = 0; i <= w / 48; i++) { g.beginPath(); g.arc(i * 48 + 24, 118, 24, 0, PI); g.fill(); }
  g.fillStyle = 'rgba(0,0,0,.15)'; g.fillRect(0, 118, w, 6);
  const gr = g.createLinearGradient(0, 118, 0, h); gr.addColorStop(0, 'rgba(0,0,0,.25)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 118, w, h - 118);
  g.fillStyle = '#e0a63a'; g.fillRect(0, 150, w, 3);
}
function paintSling(g, w, h, side) {
  g.fillStyle = '#f4e6c0'; g.fillRect(0, 0, w, h);
  for (let i = -2; i < 6; i++) { g.fillStyle = 'rgba(200,48,44,.9)'; g.save(); g.translate(0, 0); g.beginPath(); g.moveTo(i * 60, 0); g.lineTo(i * 60 + 26, 0); g.lineTo(i * 60 + 26 + 60, h); g.lineTo(i * 60 + 60, h); g.closePath(); g.fill(); g.restore(); }
  g.fillStyle = '#ffcc3a'; g.beginPath(); for (let i = 0; i < 10; i++) { const a = -PI / 2 + i * PI / 5, rr = i % 2 ? 22 : 48; i ? g.lineTo(w / 2 + Math.cos(a) * rr, h * 0.5 + Math.sin(a) * rr) : g.moveTo(w / 2 + Math.cos(a) * rr, h * 0.5 + Math.sin(a) * rr); } g.closePath(); g.fill();
  g.strokeStyle = '#2a1a14'; g.lineWidth = 3; g.stroke();
  g.fillStyle = '#2a1a14'; g.font = '400 30px ' + BUNGEE; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(side === 'L' ? 'FUN' : 'WIN', w / 2, h * 0.5 + 2);
}
function spinArt(g, w, h) { g.fillStyle = '#f4ecd8'; g.fillRect(0, 0, w, h); g.fillStyle = '#c8302c'; g.fillRect(0, 0, w, 14); g.fillRect(0, h - 14, w, 14); g.font = '400 50px ' + BUNGEE; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('MIDWAY', w / 2, h / 2 + 2); }
function duckArt(g, w, h, i) {
  // a yellow tin duck on a cream gallery plate
  g.fillStyle = '#f4ecd8'; g.fillRect(0, 0, w, h); g.fillStyle = '#1d4e9a'; g.fillRect(0, h - 22, w, 22); g.fillStyle = '#2a8c8c'; g.fillRect(0, h - 30, w, 8);
  g.fillStyle = '#ffd23a'; g.beginPath(); g.ellipse(w * 0.5, h * 0.6, 44, 28, 0, 0, TAU); g.fill(); g.beginPath(); g.arc(w * 0.68, h * 0.36, 22, 0, TAU); g.fill();
  g.fillStyle = '#ff8a2a'; g.beginPath(); g.moveTo(w * 0.84, h * 0.38); g.lineTo(w * 0.99, h * 0.33); g.lineTo(w * 0.86, h * 0.47); g.closePath(); g.fill();
  g.fillStyle = '#2a1a14'; g.beginPath(); g.arc(w * 0.72, h * 0.32, 3.5, 0, TAU); g.fill();
  g.strokeStyle = '#e0a63a'; g.lineWidth = 3; g.beginPath(); g.moveTo(w * 0.22, h * 0.62); g.quadraticCurveTo(w * 0.4, h * 0.5, w * 0.58, h * 0.66); g.stroke();
  g.fillStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.ellipse(w * 0.4, h * 0.5, 10, 5, -0.4, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 4; g.strokeRect(2, 2, w - 4, h - 4);
}
function bullseyeArt(g, w, h) { g.fillStyle = '#f4ecd8'; g.fillRect(0, 0, w, h); [[52, '#c8302c'], [38, '#f4ecd8'], [24, '#c8302c'], [10, '#f4ecd8']].forEach(([r, c]) => { g.fillStyle = c; g.beginPath(); g.arc(w / 2, h / 2, r, 0, TAU); g.fill(); }); g.fillStyle = '#2a1a14'; g.font = '400 20px ' + BUNGEE; g.textAlign = 'center'; g.fillText('DUNK', w / 2, h - 8); }
function strikerPadArt(g, w, h) { g.fillStyle = '#c8302c'; g.fillRect(0, 0, w, h); g.fillStyle = '#ffcc3a'; g.beginPath(); for (let i = 0; i < 16; i++) { const a = i * PI / 8, rr = i % 2 ? 30 : 52; i ? g.lineTo(w / 2 + Math.cos(a) * rr, h / 2 + Math.sin(a) * rr) : g.moveTo(w / 2 + Math.cos(a) * rr, h / 2 + Math.sin(a) * rr); } g.closePath(); g.fill(); g.fillStyle = '#2a1a14'; g.font = '400 34px ' + BUNGEE; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('HIT', w / 2, h / 2 + 2); }
function carouselArt(g, w, h) {
  const c = w / 2;
  for (let i = 0; i < 12; i++) { g.fillStyle = i % 2 ? '#c8302c' : '#f4ecd8'; g.beginPath(); g.moveTo(c, c); g.arc(c, c, c, i * PI / 6, (i + 1) * PI / 6); g.closePath(); g.fill(); }
  g.strokeStyle = '#e0a63a'; g.lineWidth = 7; g.beginPath(); g.arc(c, c, c - 8, 0, TAU); g.stroke(); g.lineWidth = 3; g.beginPath(); g.arc(c, c, c * 0.62, 0, TAU); g.stroke();
  g.fillStyle = '#1d4e9a'; g.beginPath(); g.arc(c, c, c * 0.28, 0, TAU); g.fill(); g.fillStyle = '#ffcc3a'; g.beginPath(); for (let i = 0; i < 10; i++) { const a = -PI / 2 + i * PI / 5, rr = i % 2 ? 10 : 24; i ? g.lineTo(c + Math.cos(a) * rr, c + Math.sin(a) * rr) : g.moveTo(c + Math.cos(a) * rr, c + Math.sin(a) * rr); } g.closePath(); g.fill();
  for (let i = 0; i < 12; i++) { const a = (i + 0.5) * PI / 6; g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.arc(c + Math.cos(a) * c * 0.8, c + Math.sin(a) * c * 0.8, 5, 0, TAU); g.fill(); }
}
function bumperCarCap(g, w, h, i) {
  // a bumper car seen from above, in the pop's colour
  const col = ['#e8463c', '#ffcc3a', '#2a8c8c'][i];
  const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); gr.addColorStop(0, shade(col, 0.5)); gr.addColorStop(0.75, col); gr.addColorStop(1, shade(col, -0.4)); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.fillStyle = '#1a1a1c'; g.beginPath(); g.ellipse(w / 2, h / 2, 64, 78, 0, 0, TAU); g.fill();   // rubber bumper
  g.fillStyle = shade(col, 0.15); g.beginPath(); g.ellipse(w / 2, h / 2, 52, 66, 0, 0, TAU); g.fill();
  g.fillStyle = '#2a1a14'; g.beginPath(); g.ellipse(w / 2, h / 2 + 10, 30, 28, 0, 0, TAU); g.fill();   // seat
  g.fillStyle = '#d8d8e0'; g.beginPath(); g.arc(w / 2, h / 2 - 28, 11, 0, TAU); g.fill();   // steering wheel
  g.fillStyle = '#f4ecd8'; g.font = '400 36px ' + BUNGEE; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(i + 1), w / 2, h / 2 + 12);
}
function galleryPlastic(g, box) {
  const w = box[2] - box[0], h = box[3] - box[1];
  for (let i = 0; i < 6; i++) { g.fillStyle = i % 2 ? '#c8302c' : '#f3e6c4'; g.fillRect(box[0], box[1] + i * h / 6, w, h / 6); }
  g.save(); g.translate(box[0] + w / 2, box[1] + h / 2); g.scale(1, -1); g.rotate(-PI / 2); g.fillStyle = '#f8f1dc'; g.font = '400 11px ' + BUNGEE; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 3; g.strokeStyle = '#2a1a14'; g.strokeText('SHOOTING GALLERY', 0, 0); g.fillText('SHOOTING GALLERY', 0, 0); g.restore();
}
function boothPlastic(g, box) {
  const w = box[2] - box[0], h = box[3] - box[1];
  g.fillStyle = '#ffcc3a'; g.fillRect(box[0], box[1], w, h); g.fillStyle = '#c8302c'; g.fillRect(box[0], box[1], w, 5); g.fillRect(box[0], box[3] - 5, w, 5);
  g.save(); g.translate(box[0] + w / 2, box[1] + h / 2); g.scale(1, -1); g.fillStyle = '#2a1a14'; g.font = '400 12px ' + BUNGEE; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('TICKETS', 0, 0); g.restore();
}

// ═══════════════════════════════════════════════════════════════════════════
// THE FERRIS WHEEL (custom component)
// A gondola sweeps the waiting ball up the left side and tips it out at the
// top onto the roller coaster, or into the gumball chute when the lock is lit.
// Gondolas hang 18 mm below their pivot; the ball sits in the gondola.
// ═══════════════════════════════════════════════════════════════════════════
const HANG = 18;
class Wheel extends Comp {
  constructor(T, o) {
    super(T, o);
    this.r = o.r; this.hub = o.hub; this.n = o.n || 6; this.a = 0; this.w = -(o.speed || 1.2);
    this.sens = T.world.sensor({ kind: 'circle', x: o.x, y: o.y, r: 15, lvl: this.lvl, owner: this, id: this.id });
    this.wait = []; this.occ = {}; this.riders = []; this.route = null; this.lastDump = -9; this.flap = -1; this.jolt = 0;
    T.ao({ kind: 'dot', x: o.x, y: o.y, r: 22, a: 0.4 });
  }
  gondola(k) { return this.a + k / this.n * TAU; }
  pos(k) { const a = this.gondola(k); return [this.o.x + Math.cos(a) * this.r, this.o.y, this.z0 + this.hub + Math.sin(a) * this.r - HANG]; }
  onSensor(b) {
    if (b.noCap[this.id] > this.world.time || this.wait.length + this.riders.length >= this.n) return;
    this.world.hold(b, this, { phase: 'wait' }); this.wait.push(b);
    this.sfx('clank', { vol: 0.55 }); this.emit('wheelIn', b);
  }
  stepHeld(b, dt, h) {
    if (h.phase === 'wait') {
      const i = this.wait.indexOf(b), tx = this.o.x, ty = this.o.y - Math.max(0, i) * 28;
      b.x += (tx - b.x) * Math.min(1, dt * 10); b.y += (ty - b.y) * Math.min(1, dt * 10); b.z = this.z0; b.vx = b.vy = 0;
      if (i === 0 && h.t > 0.12) for (let k = 0; k < this.n; k++) {
        if (this.occ[k]) continue;
        if (Math.abs(angDiff(this.gondola(k), PI * 1.5)) < 0.1) { h.phase = 'ride'; h.k = k; this.occ[k] = b; this.wait.shift(); this.riders.push(b); this.sfx('ratchet', { vol: 0.55 }); this.G.haptic('light'); this.jolt = 1; break; }
      }
    } else {
      const p = this.pos(h.k); b.x = p[0]; b.y = p[1]; b.z = p[2] - BR; b.vx = b.vy = 0;
      if (h.t > 0.6 && Math.abs(angDiff(this.gondola(h.k), PI / 2)) < 0.07) this.dump(b, h.k);
    }
  }
  dump(b, k) {
    delete this.occ[k]; const i = this.riders.indexOf(b); if (i >= 0) this.riders.splice(i, 1);
    const route = this.route ? this.route(b) : 'coaster', p = this.paths[route] || this.paths.coaster;
    this.world.enterPath(b, p, 320); b.noCap[this.id] = this.world.time + 1.5; this.lastDump = this.G.time; this.flap = route === 'chute' ? 1 : -1;
    this.sfx('clank', { vol: 0.7 }); this.emit('wheelOut', b, { route });
  }
  step(dt) { this.a += this.w * dt; }
  update(dt) { this.wait = this.wait.filter(b => !b.removed); for (const k in this.occ) if (this.occ[k].removed) delete this.occ[k]; this.riders = this.riders.filter(b => !b.removed); this.jolt *= Math.exp(-dt * 3); }
  trigger() { const b = this.world.addBall(this.o.x, this.o.y - 30, { vy: 400 }); this.onSensor(b); }
  mesh(RC) {
    const { x, y } = this.o, r = this.r, z0 = this.z0, M = RC.mats, B = RC.batch;
    const red = M.plastic('#c8302c', { roughness: 0.35, clearcoat: 0.8 }), cream = M.plastic('#f4ecd8', { roughness: 0.3 }), steel = M.steel(), chrome = M.chrome(), brass = M.brass();
    const g = new THREE.Group(); g.position.set(x, y, z0 + this.hub); RC.root.add(g);
    const wheel = new THREE.Group(); g.add(wheel); this.wheel = wheel;
    // two red rims with chrome spokes and cross braces, all merged into two meshes
    const redG = [], steelG = [];
    for (const dy of [-10, 10]) {
      const rim = new THREE.TorusGeometry(r, 2.4, 10, 48); rim.rotateX(PI / 2); rim.translate(0, dy, 0); redG.push(rim);
      for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; const sp = new THREE.CylinderGeometry(1.1, 1.1, r - 6, 6); sp.translate(0, (r - 6) / 2 + 5, 0); sp.rotateX(PI / 2); sp.rotateY(a); sp.translate(0, dy, 0); steelG.push(sp); }
    }
    for (let i = 0; i < this.n; i++) { const a = i / this.n * TAU; const br = new THREE.CylinderGeometry(1.4, 1.4, 20, 6); br.translate(Math.cos(a) * r, 0, Math.sin(a) * r); steelG.push(br); }
    const hubG = new THREE.CylinderGeometry(9, 9, 26, 20); steelG.push(hubG);
    const faceG = new THREE.CylinderGeometry(14, 14, 3, 24); faceG.translate(0, -13.5, 0); redG.push(faceG);
    const rimM = new THREE.Mesh(mergeGeo(redG), red), spM = new THREE.Mesh(mergeGeo(steelG), chrome); rimM.castShadow = spM.castShadow = true; wheel.add(rimM, spM);
    // bulbs round the rim: one instanced mesh, colours chase in render()
    const nb = 24; const bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(2, 10, 8), new THREE.MeshBasicMaterial({ toneMapped: false }), nb);
    const mm = new THREE.Matrix4();
    for (let i = 0; i < nb; i++) { const a = i / nb * TAU; mm.makeTranslation(Math.cos(a) * (r + 3.5), 0, Math.sin(a) * (r + 3.5)); bulbs.setMatrixAt(i, mm); bulbs.setColorAt(i, new THREE.Color('#332211')); }
    wheel.add(bulbs); this.bulbs = bulbs; this.bulbC = new THREE.Color();
    // gondolas: hang from the rim pivots, stay upright
    this.gond = [];
    const cols = ['#c8302c', '#f4ecd8', '#ffcc3a'];
    for (let i = 0; i < this.n; i++) {
      const a = i / this.n * TAU, piv = new THREE.Group(); piv.position.set(Math.cos(a) * r, 0, Math.sin(a) * r); wheel.add(piv);
      const car = new THREE.Group(); piv.add(car);
      const cup = new THREE.Mesh(latheGeo(0, 0, [[0, -HANG - BR - 2], [13, -HANG - BR - 1.5], [16.5, -HANG - 6], [17, -HANG + 2], [15.5, -HANG + 2], [15, -HANG - 5], [12, -HANG - BR + 1], [0, -HANG - BR + 1]], 20), M.plastic(cols[i % 3], { roughness: 0.3, clearcoat: 0.8 }));
      cup.castShadow = true; car.add(cup);
      const band = new THREE.Mesh(latheGeo(0, 0, [[17.2, -HANG - 1], [17.2, -HANG + 1.5]], 20), M.plastic(cols[(i + 1) % 3])); car.add(band);
      for (const dy of [-11, 11]) { const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, HANG + 4, 6), chrome); arm.rotation.x = PI / 2; arm.position.set(0, dy, -(HANG + 4) / 2 + 1); car.add(arm); }
      this.gond.push(car);
    }
    // the diverter flap at the top: points to the coaster or the gumball chute
    const flap = new THREE.Mesh(new THREE.BoxGeometry(22, 14, 1.2), chrome); flap.position.set(0, 0, r + HANG + 4); wheel.parent.add(flap); flap.castShadow = true; this.flapM = flap;
    // A-frame legs either side, feet on the wheel's plinths, plus the motor house behind the hub
    for (const sy of [-1, 1]) for (const sx of [-1, 1]) B.add(steel, tubeGeo([[x + sx * 48, y + sy * 17, z0], [x + sx * 10, y + sy * 15, z0 + this.hub]], 2.2, 2, 8));
    for (const sy of [-1, 1]) B.add(steel, tubeGeo([[x - 48, y + sy * 17, z0 + 36], [x + 48, y + sy * 17, z0 + 36]], 1.6, 2, 8));
    B.add(cream, boxGeo(x, y + 26, z0 + this.hub, 26, 16, 22)); B.add(red, boxGeo(x, y + 26, z0 + this.hub, 27, 17, 5));
    B.add(cream, boxGeo(x - 40, y, z0 + 4, 32, 36, 8)); B.add(cream, boxGeo(x + 40, y, z0 + 4, 32, 36, 8));
    B.add(red, boxGeo(x - 40, y, z0 + 8.5, 32, 36, 1.4)); B.add(red, boxGeo(x + 40, y, z0 + 8.5, 32, 36, 1.4));
    // the sign over the hub face
    const sc = canvas(128, 64), sg = sc.getContext('2d'); sg.fillStyle = '#f4ecd8'; sg.beginPath(); sg.arc(64, 32, 30, 0, TAU); sg.fill(); sg.fillStyle = '#c8302c'; sg.beginPath(); for (let i = 0; i < 10; i++) { const a2 = -PI / 2 + i * PI / 5, rr = i % 2 ? 11 : 26; i ? sg.lineTo(64 + Math.cos(a2) * rr, 32 + Math.sin(a2) * rr) : sg.moveTo(64 + Math.cos(a2) * rr, 32 + Math.sin(a2) * rr); } sg.closePath(); sg.fill();
    const sign = new THREE.Mesh(new THREE.CircleGeometry(13, 24), new THREE.MeshStandardMaterial({ map: RC.tex(sc), roughness: 0.35 })); sign.rotation.x = PI / 2; sign.position.set(0, -15.2, 0); g.add(sign);
  }
  render(dt) {
    if (!this.wheel) return;
    const t = this.G.time; this.wheel.rotation.y = -this.a;
    this.gond.forEach((car, i) => { car.rotation.y = this.a + Math.sin(t * 2.1 + i * 1.3) * 0.06 + this.jolt * Math.sin(t * 14 + i) * 0.1; });
    const B = this.G.b, fast = this.G.mb || (B && B.grand), ph = Math.floor(t * (fast ? 12 : 5));
    for (let i = 0; i < 24; i++) { const on = (i + ph) % 3 === 0 || (fast && (i + ph) % 2 === 0); this.bulbC.set(on ? '#ffe29a' : '#5a3a1a').multiplyScalar(on ? 3.2 : 0.35); this.bulbs.setColorAt(i, this.bulbC); }
    this.bulbs.instanceColor.needsUpdate = true;
    const want = (B && B.lockLit && this.G.comps.gumball.balls.length < 2 && !this.G.mb) ? 1 : -1;
    this.flapM.rotation.z += ((want * 0.55) - this.flapM.rotation.z) * Math.min(1, dt * 6);
  }
}
function coasterSupports(RC, pts) {
  // legs for the coaster: steel A-frames over the right lane (from both wall tops), posts elsewhere
  const B = RC.batch, steel = RC.mats.steel();
  const at = y => { let best = pts[0]; for (const p of pts) if (Math.abs(p[1] - y) < Math.abs(best[1] - y)) best = p; return best; };
  for (const y of [752, 690, 620]) { const p = at(y); B.add(steel, tubeGeo([[432, p[1], 26], [432, p[1], p[2] - 10], [p[0] - 8, p[1], p[2] - 3]], 1.6, 6, 8)); B.add(steel, tubeGeo([[479, p[1], 34], [479, p[1], p[2] - 8], [p[0] + 8, p[1], p[2] - 3]], 1.6, 6, 8)); }
  for (const [lx, ly] of [[322, 808], [460, 462], [466, 542], [178, 752], [212, 762]]) { const p = at(ly); const px = lx, py = ly; B.add(steel, tubeGeo([[px, py, 0], [px, py, p[2] - 6], [p[0], p[1], p[2] - 3]], 1.8, 4, 8)); B.add(steel, cylGeo(px, py, 4.5, 0, 1.6, 10)); }
  // the kiosk roof carries one leg
  const p = at(823); B.add(steel, tubeGeo([[398, 834, 50], [p[0], p[1], p[2] - 3]], 1.8, 2, 8));
}

// ═══════════════════════════════════════════════════════════════════════════
// TOYS AND SCENERY (3D)
// ═══════════════════════════════════════════════════════════════════════════
function mesh(geo, mat, cast = true) { const m = new THREE.Mesh(geo, mat); m.castShadow = cast; m.receiveShadow = true; return m; }
function stripeTex(RC, n, c1, c2, w = 256, h = 64) { const c = canvas(w, h), g = c.getContext('2d'); for (let i = 0; i < n; i++) { g.fillStyle = i % 2 ? c1 : c2; g.fillRect(i * w / n, 0, w / n + 1, h); } return RC.tex(c); }

// the gumball machine: cast-iron base, coin plate and knob, glass globe full of coloured gumballs, chrome lid with the chute's hopper
function gumballModel(RC, comp) {
  const M = RC.mats, g = new THREE.Group(); g.position.set(comp.o.x, comp.o.y, comp.z0); RC.root.add(g);
  const red = M.plastic('#b8241f', { roughness: 0.3, clearcoat: 0.9 });
  g.add(mesh(latheGeo(0, 0, [[0, 0], [22, 0], [24, 3], [20, 8], [19, 22], [22, 26], [23, 30], [19, 34], [0, 34]], 28), red));
  g.add(mesh(latheGeo(0, 0, [[0, 34], [20, 34], [20, 37], [0, 37]], 28), M.chrome()));
  const plate = mesh(new THREE.BoxGeometry(18, 2, 12), M.chrome()); plate.position.set(0, -20, 18); g.add(plate);
  const knob = mesh(new THREE.CylinderGeometry(5, 5, 4, 16), M.chrome()); knob.rotation.x = PI / 2; knob.position.set(0, -22.5, 18); g.add(knob); comp.knob = knob;
  const slot = mesh(new THREE.BoxGeometry(8, 1, 2), M.plastic('#111')); slot.position.set(0, -21.2, 24); g.add(slot);
  const globe = new THREE.Mesh(new THREE.SphereGeometry(32, 32, 24), M.clear('#eef6ff', 0.16, { depthWrite: false, roughness: 0.02 })); globe.position.z = 62; globe.renderOrder = 4; g.add(globe);
  // coloured gumballs piled inside
  const r = rng(77), gum = [], gumCols = ['#e8463c', '#ffcc3a', '#2a8c8c', '#1d4e9a', '#ff7aa8', '#f4ecd8', '#7ac043'];
  const gumGeos = gumCols.map(() => []);
  for (let i = 0; i < 46; i++) { const a = r() * TAU, rr = r() * 24, z = 36 + r() * 22; const x = Math.cos(a) * rr, y = Math.sin(a) * rr; if (Math.hypot(x, y, z - 62) > 27) continue; const s = new THREE.SphereGeometry(4.6, 10, 8); s.translate(x, y, z); gumGeos[i % gumCols.length].push(s); }
  gumGeos.forEach((gs, i) => { if (gs.length) g.add(mesh(mergeGeo(gs), M.plastic(gumCols[i], { roughness: 0.2, clearcoat: 1 }), false)); });
  // the steel balls (the lock), shown by the component's render()
  comp.inner = []; for (let i = 0; i < 6; i++) { const m = mesh(new THREE.SphereGeometry(BR, 16, 12), M.ball()); g.add(m); comp.inner.push(m); }
  // lid and hopper
  g.add(mesh(latheGeo(0, 0, [[0, 94], [12, 94], [16, 96], [16, 100], [8, 103], [0, 104]], 24), M.chrome()));
  g.add(mesh(latheGeo(0, 0, [[9, 96], [12, 102], [14, 108]], 20), M.steel()));
  // the exit chute down to the left lane (wire trough)
  const chute = [[-10, -6, 24], [-30, -18, 34], [-44, -28, 30], [-58, -36, 14], [-70, -39, 3]];
  for (const lat of [-6, 6]) RC.batch.add(M.chrome(), tubeGeo(chute.map(p => [comp.o.x + p[0], comp.o.y + p[1] + lat, comp.z0 + p[2] + 2]), 1.1, 16, 6));
  RC.batch.add(M.chrome(), tubeGeo(chute.map(p => [comp.o.x + p[0], comp.o.y + p[1], comp.z0 + p[2]]), 1.1, 16, 6));
  // a "1 CENT" style plate on the base
  const pc = canvas(128, 64), pg = pc.getContext('2d'); pg.fillStyle = '#f4ecd8'; pg.fillRect(0, 0, 128, 64); pg.fillStyle = '#b8241f'; pg.font = '400 30px ' + BUNGEE; pg.textAlign = 'center'; pg.textBaseline = 'middle'; pg.fillText('GUMBALL', 64, 32);
  const pl = new THREE.Mesh(new THREE.PlaneGeometry(24, 10), new THREE.MeshStandardMaterial({ map: RC.tex(pc), roughness: 0.4 })); pl.rotation.x = PI / 2; pl.position.set(0, -23.6, 8); g.add(pl);
  g.traverse(o => { if (o.isMesh && o !== globe) o.castShadow = true; });
}

// the ring toss: a red-and-white ring hanging from a chrome gooseneck over the magnet; it drops round a caught ball
function ringModel(RC, comp) {
  const M = RC.mats, g = new THREE.Group(); g.position.set(comp.o.x, comp.o.y, 0);
  RC.batch.add(M.chrome(), tubeGeo([[208, 640, 30], [214, 640, 62], [230, 622, 76], [243, 606, 78]], 2.2, 12, 8));
  const hang = new THREE.Group(); hang.position.z = 78; g.add(hang);
  const wire = mesh(new THREE.CylinderGeometry(0.5, 0.5, 28, 5), M.steel(), false); wire.rotation.x = PI / 2; wire.position.z = -14; hang.add(wire);
  const ringG = new THREE.Group(); ringG.position.z = -28; hang.add(ringG);
  const tor = new THREE.TorusGeometry(16, 2.6, 10, 36);
  const red = mesh(tor, M.plastic('#c8302c', { roughness: 0.3, clearcoat: 0.9 })); ringG.add(red);
  const stripes = []; for (let i = 0; i < 6; i++) { const s = new THREE.TorusGeometry(16, 2.9, 8, 6, PI / 6); s.rotateZ(i * PI / 3); stripes.push(s); }
  ringG.add(mesh(mergeGeo(stripes), M.plastic('#f4ecd8', { roughness: 0.3 })));
  g.userData = { hang, ringG, wire };
  return g;
}
function ringAnimate(g, dt, comp) {
  const u = g.userData, t = comp.G.time, held = !!comp.held, act = comp.active;
  const dropZ = held ? 22 : act ? 44 : 50;
  u.ringG.position.z += (dropZ - 78 - u.ringG.position.z) * Math.min(1, dt * (held ? 10 : 3));
  u.wire.scale.y = Math.max(0.1, -u.ringG.position.z / 28); u.wire.position.z = u.ringG.position.z / 2;
  u.hang.rotation.x = Math.sin(t * 1.3) * 0.05 * (act ? 2 : 1); u.hang.rotation.y = Math.cos(t * 0.9) * 0.04;
  u.ringG.rotation.z += dt * (held ? 4 : act ? 1.2 : 0.3);
}

// the barker: a straw-hatted carnival caller with a handlebar moustache; eyes follow the ball, the jaw swings open
function barkerModel(RC, toy) {
  const M = RC.mats, g = new THREE.Group();
  const skinC = canvas(256, 128), sg = skinC.getContext('2d');
  { const gr = sg.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, '#f1c9a4'); gr.addColorStop(0.55, '#e8b690'); gr.addColorStop(1, '#c98f6a'); sg.fillStyle = gr; sg.fillRect(0, 0, 256, 128);
    for (const x of [92, 164]) { const b = sg.createRadialGradient(x, 82, 2, x, 82, 22); b.addColorStop(0, 'rgba(230,90,90,.45)'); b.addColorStop(1, 'rgba(230,90,90,0)'); sg.fillStyle = b; sg.fillRect(x - 24, 58, 48, 48); }
    const r = rng(9); sg.fillStyle = 'rgba(150,90,60,.35)'; for (let i = 0; i < 40; i++) sg.fillRect(60 + r() * 136, 60 + r() * 40, 1.5, 1.5); }
  const skin = new THREE.MeshPhysicalMaterial({ map: RC.tex(skinC), roughness: 0.55, clearcoat: 0.25, clearcoatRoughness: 0.4 });
  const head = mesh(new THREE.SphereGeometry(34, 32, 24), skin); head.rotation.x = PI / 2; head.position.set(0, -4, 40); g.add(head);
  // ears
  [-1, 1].forEach(s => { const e = mesh(new THREE.SphereGeometry(7, 12, 10), skin); e.scale.set(0.5, 1, 1.2); e.position.set(s * 33, -6, 40); g.add(e); });
  // nose: a big round one
  const nose = mesh(new THREE.SphereGeometry(7.5, 14, 12), M.plastic('#e08a78', { roughness: 0.4, clearcoat: 0.6 })); nose.position.set(0, 30, 38); g.add(nose);
  // eyes, brows
  const eyes = [], whites = [];
  [-12, 12].forEach(x => {
    const w = mesh(new THREE.SphereGeometry(6.5, 16, 12), M.plastic('#fbf8f0', { roughness: 0.15, clearcoat: 1 })); w.position.set(x, 26, 50); g.add(w); whites.push(w);
    const iris = mesh(new THREE.SphereGeometry(3.2, 12, 10), M.plastic('#2a4a8a', { roughness: 0.2 })); iris.position.set(0, 5.2, 0); w.add(iris);
    const pupil = mesh(new THREE.SphereGeometry(1.6, 10, 8), M.plastic('#0a0a0a')); pupil.position.set(0, 2.4, 0); iris.add(pupil);
    eyes.push(iris);
    const brow = mesh(new THREE.BoxGeometry(12, 3, 2.6), M.plastic('#3a2416', { roughness: 0.7 })); brow.position.set(x, 29, 59); brow.rotation.y = x < 0 ? 0.35 : -0.35; g.add(brow);
  });
  // moustache: two curling tubes
  const mo = M.plastic('#3a2416', { roughness: 0.7 });
  [-1, 1].forEach(s => { const m = mesh(tubeGeo([[0, 32, 30], [s * 8, 33, 28], [s * 16, 31, 29], [s * 22, 28, 34]], 2.6, 12, 8), mo); g.add(m); });
  // jaw (hinged at the back), with a dark mouth cavity behind it
  const jp = new THREE.Group(); jp.position.set(0, -6, 22); g.add(jp);
  const jaw = mesh(new THREE.SphereGeometry(24, 24, 12, 0, TAU, PI / 2, PI / 2), skin); jaw.rotation.x = -PI / 2; jaw.scale.set(1.05, 1.2, 0.75); jaw.position.set(0, 14, 2); jp.add(jaw);
  const teeth = mesh(new THREE.BoxGeometry(24, 6, 3), M.plastic('#fbf8f0')); teeth.position.set(0, 28, 3); jp.add(teeth);
  const cav = mesh(new THREE.SphereGeometry(21, 16, 12), M.paint('#1a0608', { roughness: 1 }), false); cav.scale.set(1, 1, 0.6); cav.position.set(0, 6, 22); g.add(cav);
  const upperTeeth = mesh(new THREE.BoxGeometry(26, 7, 3.5), M.plastic('#fbf8f0')); upperTeeth.position.set(0, 24, 22); g.add(upperTeeth);
  // straw boater with a red band
  const straw = M.plastic('#e9d79a', { roughness: 0.75 });
  const brim = mesh(new THREE.CylinderGeometry(42, 42, 1.6, 36), straw); brim.rotation.x = PI / 2; brim.position.set(0, -6, 69); g.add(brim);
  const crown = mesh(new THREE.CylinderGeometry(27, 28, 12, 32), straw); crown.rotation.x = PI / 2; crown.position.set(0, -6, 76); g.add(crown);
  const band = mesh(new THREE.CylinderGeometry(28.3, 28.3, 5, 32), M.plastic('#c8302c', { roughness: 0.5 })); band.rotation.x = PI / 2; band.position.set(0, -6, 73); g.add(band);
  // bow tie and collar at the base
  const collar = mesh(new THREE.CylinderGeometry(26, 30, 6, 24), M.plastic('#f4ecd8')); collar.rotation.x = PI / 2; collar.position.set(0, -10, 3); g.add(collar);
  [-1, 1].forEach(s => { const bt = mesh(new THREE.ConeGeometry(5, 10, 3), M.plastic('#1d4e9a', { roughness: 0.4 })); bt.rotation.z = s * PI / 2; bt.position.set(s * 6, 18, 6); g.add(bt); });
  const knot = mesh(new THREE.SphereGeometry(2.6, 10, 8), M.plastic('#1d4e9a')); knot.position.set(0, 19, 6); g.add(knot);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  const rz = Math.atan2(toy.f[1], toy.f[0]) - PI / 2, c = Math.cos(-rz), s = Math.sin(-rz);
  let blinkT = 2;
  g.userData.pose = (k, look, t) => {
    jp.rotation.x = -k * 0.95; jp.position.z = 22 - k * 3;
    const lx = look[0] * c - look[1] * s, ly = look[0] * s + look[1] * c;   // world -> local
    eyes.forEach(ir => { ir.position.x = lx * 3.2; ir.position.z = ly > 0 ? -1.6 : 0.6; });
    const bl = ((t + 1.3) % 4.7) < 0.14; whites.forEach(w => { w.scale.z = bl ? 0.15 : 1; });
    head.rotation.z = Math.sin(t * 0.7) * 0.03 + k * Math.sin(t * 9) * 0.02;
  };
  return g;
}

// the high striker: a graduated tower behind the pad, a puck that climbs on a hard hit, a brass bell on top
function strikerModel(RC) {
  const M = RC.mats, B = RC.batch, [x, y] = TOWER, G = RC.G;
  const red = M.plastic('#c8302c', { roughness: 0.35 }), cream = M.plastic('#f4ecd8', { roughness: 0.3 });
  B.add(cream, boxGeo(x, y, 3, 26, 40, 6)); B.add(red, boxGeo(x, y, 6.6, 26, 40, 1.2));
  const sc = canvas(96, 512), g = sc.getContext('2d');
  { const gr = g.createLinearGradient(0, 512, 0, 0); gr.addColorStop(0, '#f6ecd0'); gr.addColorStop(0.6, '#ffd27a'); gr.addColorStop(1, '#e8463c'); g.fillStyle = gr; g.fillRect(0, 0, 96, 512);
    g.fillStyle = '#2a1a14'; for (let i = 0; i <= 24; i++) { g.fillRect(6, 500 - i * 20, i % 4 === 0 ? 24 : 12, 2); g.fillRect(96 - 6 - (i % 4 === 0 ? 24 : 12), 500 - i * 20, i % 4 === 0 ? 24 : 12, 2); }
    g.font = '400 17px ' + BUNGEE; g.textAlign = 'center'; g.textBaseline = 'middle'; g.save(); g.translate(48, 0); g.rotate(-PI / 2); ['PUNY', 'WEAKLING', 'FAIR', 'STRONG', 'MIGHTY', 'CHAMP'].forEach((w, i) => { g.fillStyle = i >= 4 ? '#f8f1dc' : '#2a1a14'; g.fillText(w, -(470 - i * 84), 0); }); g.restore(); }
  const board = new THREE.Mesh(new THREE.BoxGeometry(24, 4, 150), [cream, cream, cream, new THREE.MeshStandardMaterial({ map: RC.tex(sc), roughness: 0.45 }), cream, cream]);
  board.position.set(x, y + 8, 81); board.castShadow = true; RC.root.add(board);
  B.add(red, boxGeo(x, y + 8, 157, 26, 6, 3));
  for (const sx of [-1, 1]) B.add(M.steel(), tubeGeo([[x + sx * 12, y + 16, 0], [x + sx * 12, y + 16, 150]], 1.6, 2, 8));
  // puck
  const puck = mesh(new THREE.CylinderGeometry(7.5, 7.5, 4, 20), M.plastic('#e8463c', { roughness: 0.25, clearcoat: 1 })); puck.rotation.x = PI / 2; puck.position.set(x, y + 3.5, 14); RC.root.add(puck);
  const puckRing = mesh(new THREE.TorusGeometry(7.5, 1, 8, 20), M.chrome()); puckRing.rotation.x = PI / 2; puck.add(puckRing); puckRing.rotation.x = 0; puckRing.position.y = 0;
  // the bell on a yoke
  const yoke = new THREE.Group(); yoke.position.set(x, y + 8, 160); RC.root.add(yoke);
  const bell = mesh(latheGeo(0, 0, [[0, 0], [11, 0], [11.5, 1.5], [9, 5], [7, 10], [5, 14], [2.5, 17], [0, 18]], 24), M.brass()); bell.position.z = 2; yoke.add(bell);
  const clap = mesh(new THREE.SphereGeometry(2.4, 10, 8), M.iron()); clap.position.set(0, 0, 3); yoke.add(clap);
  B.add(M.brass(), tubeGeo([[x - 12, y + 8, 158], [x - 12, y + 8, 182], [x + 12, y + 8, 182], [x + 12, y + 8, 158]], 1.4, 8, 8));
  B.add(M.brass(), sphereGeo(x, y + 8, 184, 3, 10));
  let bellK = 0;
  RC.anim.push((dt, t) => {
    const Bb = G.b || {}, p = Bb.puck || 0;
    puck.position.z += ((14 + p * 140) - puck.position.z) * Math.min(1, dt * (p > 0.05 && t - (Bb.puckT || -9) < 1 ? 14 : 3));
    const since = t - (Bb.bellAt || -9); bellK = since < 1.6 ? Math.sin(since * 26) * Math.exp(-since * 2.2) : 0;
    yoke.rotation.y = bellK * 0.35; clap.position.x = -bellK * 6;
  });
  return null;
}

// the dunk tank: a glass tank of water, a seat on a frame, a clown who drops in with a splash
function dunkModel(RC) {
  const M = RC.mats, B = RC.batch, [x, y] = DUNK, G = RC.G;
  const g = new THREE.Group(); g.position.set(x, y, 0); RC.root.add(g);
  const steel = M.steel();
  B.add(M.plastic('#f4ecd8'), boxGeo(x, y, 1.5, 36, 36, 3));
  const tank = new THREE.Mesh(new THREE.BoxGeometry(30, 28, 32), M.clear('#dff2ff', 0.22, { depthWrite: false, roughness: 0.03 })); tank.position.z = 17; tank.renderOrder = 3; g.add(tank);
  const water = new THREE.Mesh(new THREE.BoxGeometry(28.5, 26.5, 20), M.clear('#2a9ac8', 0.55, { depthWrite: false, roughness: 0.1 })); water.position.z = 12; water.renderOrder = 2; g.add(water);
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) B.add(steel, cylGeo(x + sx * 14, y + sy * 13, 1.6, 0, 70, 8));
  B.add(steel, tubeGeo([[x - 14, y + 13, 70], [x + 14, y + 13, 70]], 1.6, 2, 8)); B.add(steel, tubeGeo([[x - 14, y - 13, 70], [x + 14, y - 13, 70]], 1.6, 2, 8));
  B.add(steel, tubeGeo([[x - 14, y - 13, 70], [x - 14, y + 13, 70]], 1.6, 2, 8)); B.add(steel, tubeGeo([[x + 14, y - 13, 70], [x + 14, y + 13, 70]], 1.6, 2, 8));
  // seat hinged at the back, the clown on it
  const hinge = new THREE.Group(); hinge.position.set(0, 12, 56); g.add(hinge);
  const seat = mesh(new THREE.BoxGeometry(20, 14, 2), M.wood('#9a6a3a', 'seat')); seat.position.set(0, -8, 0); hinge.add(seat);
  const clown = new THREE.Group(); g.add(clown); clown.position.set(0, 2, 57);
  const body = mesh(new THREE.CylinderGeometry(5, 6.5, 13, 14), M.plastic('#ffcc3a', { roughness: 0.4 })); body.rotation.x = PI / 2; body.position.z = 7; clown.add(body);
  const dots = []; for (let i = 0; i < 8; i++) { const d = new THREE.SphereGeometry(1.3, 6, 5); const a = i * 0.8; d.translate(Math.cos(a) * 6, Math.sin(a) * 6, 4 + (i % 3) * 3); dots.push(d); } clown.add(mesh(mergeGeo(dots), M.plastic('#1d4e9a'), false));
  const headC = mesh(new THREE.SphereGeometry(6.5, 16, 12), M.plastic('#fbf3ea', { roughness: 0.35 })); headC.position.z = 19; clown.add(headC);
  const noseC = mesh(new THREE.SphereGeometry(2.2, 10, 8), M.plastic('#e8463c', { clearcoat: 1 })); noseC.position.set(0, -6, 19); clown.add(noseC);
  const hat = mesh(new THREE.ConeGeometry(4.5, 11, 14), M.plastic('#c8302c')); hat.rotation.x = PI / 2; hat.position.z = 29; clown.add(hat);
  const pom = mesh(new THREE.SphereGeometry(2, 8, 6), M.plastic('#f4ecd8')); pom.position.z = 35; clown.add(pom);
  const hair = []; [-1, 1].forEach(s => { const h = new THREE.SphereGeometry(3.4, 8, 6); h.translate(s * 6.5, 1, 20); hair.push(h); }); clown.add(mesh(mergeGeo(hair), M.plastic('#ff8a2a', { roughness: 0.8 })));
  const arms = []; [-1, 1].forEach(s => { const a = new THREE.CylinderGeometry(1.6, 1.6, 12, 8); a.rotateZ(s * 0.9); a.translate(s * 9, 0, 10); arms.push(a); }); clown.add(mesh(mergeGeo(arms), M.plastic('#ffcc3a')));
  const legs = []; [-1, 1].forEach(s => { const l = new THREE.CylinderGeometry(1.8, 1.8, 14, 8); l.rotateX(PI / 2); l.translate(s * 3, -8, -5); legs.push(l); const sh = new THREE.SphereGeometry(2.8, 8, 6); sh.translate(s * 3, -12, -12); legs.push(sh); }); clown.add(mesh(mergeGeo(legs), M.plastic('#c8302c')));
  // splash ring
  const splash = new THREE.Mesh(new THREE.TorusGeometry(8, 1.2, 6, 24), M.clear('#ffffff', 0.7)); splash.position.z = 23; splash.visible = false; g.add(splash);
  const sign = canvas(192, 64), sgx = sign.getContext('2d'); sgx.fillStyle = '#ffcc3a'; sgx.fillRect(0, 0, 192, 64); sgx.fillStyle = '#c8302c'; sgx.fillRect(0, 0, 192, 8); sgx.fillRect(0, 56, 192, 8); sgx.fillStyle = '#2a1a14'; sgx.font = '400 28px ' + BUNGEE; sgx.textAlign = 'center'; sgx.textBaseline = 'middle'; sgx.fillText('DUNK TANK', 96, 32);
  const sm = new THREE.Mesh(new THREE.PlaneGeometry(36, 12), new THREE.MeshStandardMaterial({ map: RC.tex(sign), roughness: 0.4, side: THREE.DoubleSide })); sm.rotation.x = PI / 2; sm.position.set(0, -14, 78); g.add(sm);
  g.traverse(o => { if (o.isMesh && o !== tank && o !== water && o !== splash) o.castShadow = true; });
  let splashed = false;
  RC.anim.push((dt, t) => {
    const since = t - ((G.b && G.b.dunkAt) || -9);
    let z = 57, tilt = 0, bob = 0;
    if (since < 0.5) { const k = since / 0.5; tilt = k * 1.3; z = 57 - 45 * k * k; if (since > 0.4 && !splashed) { splashed = true; RC.burst(x, y, 24, 18, 260, '#cfeeff'); splash.visible = true; splash.scale.setScalar(0.6); } }
    else if (since < 2.6) { z = 10 + Math.sin(since * 6) * 1.5; tilt = 1.3; bob = Math.sin(since * 5) * 0.2; splash.scale.addScalar(dt * 1.6); splash.material.opacity = Math.max(0, 0.7 - (since - 0.5) * 0.6); }
    else if (since < 3.6) { const k = (since - 2.6); z = 10 + 47 * k; tilt = 1.3 * (1 - k); splash.visible = false; splashed = false; }
    else { splashed = false; splash.visible = false; }
    clown.position.z = z; clown.rotation.x = bob; clown.rotation.z = since < 2.6 && since > 0.5 ? Math.sin(since * 3) * 0.3 : 0; hinge.rotation.x = -tilt;
    water.position.z = 12 + Math.sin(t * 2.3) * 0.25 + (since > 0.4 && since < 1.4 ? Math.sin(since * 30) * 0.8 * (1.4 - since) : 0);
  });
  return null;
}

// the carousel: a striped canopy with brass poles and horses turns over the spinning disc; three chrome legs hold the outer ring
function carouselModel(RC) {
  const M = RC.mats, B = RC.batch, [x, y] = CAROUSEL, G = RC.G;
  const ring = new THREE.TorusGeometry(48, 1.4, 8, 48); ring.translate(x, y, 72); B.add(M.chrome(), ring);
  for (const [px, py] of [[243, 516], [205, 448], [281, 448]]) { const a = Math.atan2(py - y, px - x); B.add(M.chrome(), tubeGeo([[px, py, 40], [x + Math.cos(a) * 48, y + Math.sin(a) * 48, 71]], 1.8, 2, 8)); }
  const g = new THREE.Group(); g.position.set(x, y, 74); RC.root.add(g);
  const tex = stripeTex(RC, 16, '#c8302c', '#f4ecd8'); tex.wrapS = THREE.RepeatWrapping;
  const canopy = mesh(latheGeo(0, 0, [[46, 0], [44, 1], [34, 5], [20, 10], [8, 15], [0, 18]], 32), new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.5, clearcoat: 0.3, side: THREE.DoubleSide })); g.add(canopy);
  const scal = []; for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; const s = new THREE.SphereGeometry(4.2, 8, 6); s.scale(1, 1, 0.5); s.translate(Math.cos(a) * 44, Math.sin(a) * 44, 0); scal.push(s); }
  g.add(mesh(mergeGeo(scal), M.plastic('#ffcc3a', { roughness: 0.3 })));
  const fin = mesh(latheGeo(0, 0, [[0, 17], [4, 18], [3, 22], [1.5, 26], [0, 30]], 12), M.brass()); g.add(fin);
  const brassG = [], creamG = [], redG = [];
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * TAU, px = Math.cos(a) * 30, py = Math.sin(a) * 30;
    const pole = new THREE.CylinderGeometry(0.9, 0.9, 36, 6); pole.rotateX(PI / 2); pole.translate(px, py, -18 + 2); brassG.push(pole);
    // a little horse: body, neck, head, legs, saddle
    const hz = -24 + (i % 2) * 3, ca = Math.cos(a + PI / 2), sa = Math.sin(a + PI / 2);
    const body = new THREE.BoxGeometry(8, 3.2, 3.6); body.rotateZ(a + PI / 2); body.translate(px, py, hz); creamG.push(body);
    const neck = new THREE.BoxGeometry(2.6, 2.4, 4); neck.rotateZ(a + PI / 2); neck.translate(px + ca * 4.2, py + sa * 4.2, hz + 2.6); creamG.push(neck);
    const headH = new THREE.BoxGeometry(4, 2.2, 2.4); headH.rotateZ(a + PI / 2); headH.translate(px + ca * 6, py + sa * 6, hz + 4.4); creamG.push(headH);
    for (const k of [-2.8, 2.8]) for (const s of [-1.2, 1.2]) { const leg = new THREE.BoxGeometry(1, 1, 4); leg.translate(px + ca * k - sa * s, py + sa * k + ca * s, hz - 3.5); creamG.push(leg); }
    const saddle = new THREE.BoxGeometry(3, 3.6, 1.2); saddle.rotateZ(a + PI / 2); saddle.translate(px, py, hz + 2.2); redG.push(saddle);
  }
  g.add(mesh(mergeGeo(brassG), M.brass())); g.add(mesh(mergeGeo(creamG), M.plastic('#f6efe0', { roughness: 0.35 }))); g.add(mesh(mergeGeo(redG), M.plastic('#c8302c')));
  RC.anim.push((dt, t) => { const c = G.comps.carousel; if (c) g.rotation.z = c.a; });
  return null;
}

// the marquee sign on the backboard (its bulbs are lamps 'mq0..25' driven by the rules)
function marqueeModel(RC) {
  const M = RC.mats, B = RC.batch, L = RC.L;
  const c = canvas(1024, 288), g = c.getContext('2d');
  g.fillStyle = '#f6ecd0'; g.fillRect(0, 0, 1024, 288);
  for (let i = 0; i < 26; i++) { g.fillStyle = i % 2 ? '#c8302c' : '#f6ecd0'; g.fillRect(i * 40, 0, 40, 36); g.fillRect(i * 40, 252, 40, 36); }
  g.strokeStyle = '#e0a63a'; g.lineWidth = 6; g.strokeRect(14, 44, 996, 200);
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
  g.font = '400 118px ' + BUNGEE; g.lineWidth = 16; g.strokeStyle = '#2a1a14'; g.strokeText('MIDWAY MAYHEM', 516, 150); g.lineWidth = 8; g.strokeStyle = '#ffcc3a'; g.strokeText('MIDWAY MAYHEM', 512, 144); g.fillStyle = '#e8463c'; g.fillText('MIDWAY MAYHEM', 512, 144);
  g.font = '700 30px ' + SERIF; g.fillStyle = '#2a1a14'; g.fillText('STEP RIGHT UP  ·  RIDES  ·  GAMES  ·  PRIZES', 512, 226);
  const sign = new THREE.Mesh(new THREE.BoxGeometry(300, 6, 84), [M.plastic('#c8302c'), M.plastic('#c8302c'), M.plastic('#c8302c'), new THREE.MeshStandardMaterial({ map: RC.tex(c), roughness: 0.4 }), M.plastic('#c8302c'), M.plastic('#c8302c')]);
  sign.position.set(260, L - 4, 94); sign.castShadow = true; RC.root.add(sign);
  B.add(M.steel(), tubeGeo([[140, L - 1, 52], [140, L - 7, 52]], 1.5, 2, 6)); B.add(M.steel(), tubeGeo([[380, L - 1, 52], [380, L - 7, 52]], 1.5, 2, 6));
  // bulb strings from the wheel to the tower, and the tower to the sign
  const bulbG = []; const strings = [[[WHEEL.x, WHEEL.y, 158], [TOWER[0], TOWER[1] + 8, 186]], [[TOWER[0], TOWER[1] + 8, 186], [330, L - 6, 140]]];
  for (const [a, b] of strings) { const pts = []; for (let i = 0; i <= 14; i++) { const k = i / 14; pts.push([a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k - 26 * Math.sin(k * PI)]); } B.add(M.iron(), tubeGeo(pts, 0.7, 20, 5)); for (let i = 1; i < 14; i++) { const s = new THREE.SphereGeometry(2.2, 8, 6); s.translate(pts[i][0], pts[i][1], pts[i][2] - 2.5); bulbG.push(s); } }
  const bulbs = new THREE.Mesh(mergeGeo(bulbG), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffe29a').multiplyScalar(2.2), toneMapped: false })); RC.root.add(bulbs);
  RC.anim.push((dt, t) => { bulbs.material.color.set('#ffe29a').multiplyScalar(1.8 + 0.5 * Math.sin(t * 3)); });
  return null;
}

// the backbox monkey: sits on a drum behind the top-left arch and bangs his bell when something big happens
function monkeyModel(RC) {
  const M = RC.mats, B = RC.batch, [x, y] = MONKEY, G = RC.G;
  const fur = M.plastic('#6a4428', { roughness: 0.85 }), face = M.plastic('#e8c8a8', { roughness: 0.6 });
  B.add(M.plastic('#c8302c', { roughness: 0.35 }), cylGeo(x, y, 13, 0, 16, 20)); B.add(M.plastic('#f4ecd8'), cylGeo(x, y, 13.4, 6, 10, 20)); B.add(M.brass(), cylGeo(x, y, 13.6, 15, 17, 20));
  const g = new THREE.Group(); g.position.set(x, y, 16); RC.root.add(g);
  const body = mesh(new THREE.CylinderGeometry(6, 7.5, 16, 14), fur); body.rotation.x = PI / 2; body.position.z = 8; g.add(body);
  const belly = mesh(new THREE.SphereGeometry(5, 12, 10), face); belly.scale.set(1, 0.6, 1.2); belly.position.set(0, -5, 8); g.add(belly);
  const head = mesh(new THREE.SphereGeometry(7, 16, 12), fur); head.position.z = 22; g.add(head);
  const muzzle = mesh(new THREE.SphereGeometry(4.2, 12, 10), face); muzzle.scale.set(1.1, 0.8, 0.8); muzzle.position.set(0, -5.5, 20.5); g.add(muzzle);
  [-1, 1].forEach(s => { const e = mesh(new THREE.SphereGeometry(2.6, 10, 8), fur); e.position.set(s * 7, 0, 23); g.add(e); const ey = mesh(new THREE.SphereGeometry(1, 8, 6), M.plastic('#0a0a0a')); ey.position.set(s * 2.4, -5.8, 24); g.add(ey); });
  const fez = mesh(new THREE.CylinderGeometry(3.6, 4.4, 5, 14), M.plastic('#c8302c', { roughness: 0.5 })); fez.rotation.x = PI / 2; fez.position.z = 30; g.add(fez);
  const tassel = mesh(new THREE.SphereGeometry(1, 6, 5), M.plastic('#ffcc3a')); tassel.position.set(3, 0, 31); g.add(tassel);
  const armR = new THREE.Group(); armR.position.set(7, -1, 16); g.add(armR);
  const ua = mesh(new THREE.CylinderGeometry(1.8, 1.8, 12, 8), fur); ua.rotation.z = -0.6; ua.position.set(4.5, 0, -3); armR.add(ua);
  const mallet = mesh(new THREE.CylinderGeometry(0.8, 0.8, 16, 6), M.wood('#9a6a3a', 'mallet')); mallet.rotation.x = PI / 2; mallet.position.set(9, 0, 4); armR.add(mallet);
  const mhead = mesh(new THREE.CylinderGeometry(2.6, 2.6, 5, 10), M.plastic('#f4ecd8')); mhead.rotation.z = PI / 2; mhead.position.set(9, 0, 12); armR.add(mhead);
  const armL = mesh(new THREE.CylinderGeometry(1.8, 1.8, 12, 8), fur); armL.rotation.z = 0.5; armL.position.set(-8, -1, 11); g.add(armL);
  const tail = mesh(tubeGeo([[0, 6, 2], [4, 12, 1], [8, 14, 4], [9, 12, 8]], 1, 10, 6), fur); g.add(tail);
  // the bell on a stand beside him
  const bx = x + 24, by = y - 2;
  B.add(M.steel(), cylGeo(bx, by, 1.5, 0, 40, 8)); B.add(M.steel(), cylGeo(bx, by, 6, 0, 2, 12));
  const bellG = new THREE.Group(); bellG.position.set(bx, by, 40); RC.root.add(bellG);
  const bell = mesh(latheGeo(0, 0, [[0, 0], [9, 0], [9.5, 1.2], [7.5, 4], [5.5, 8], [3.5, 11], [1.5, 13.5], [0, 14.5]], 20), M.brass()); bellG.add(bell);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; }); bell.castShadow = true;
  RC.anim.push((dt, t) => {
    const since = t - ((G.b && G.b.monkeyT) || -9);
    let swing = 0.9, bk = 0;
    if (since >= 0 && since < 2.2) { const k = since; swing = k < 0.35 ? 0.9 - k / 0.35 * 1.6 : k < 0.5 ? -0.7 + (k - 0.35) / 0.15 * 0.8 : 0.1 + Math.min(0.8, (k - 0.5) * 1.2); if (k > 0.35 && k < 1.9) bk = Math.sin((k - 0.35) * 28) * Math.exp(-(k - 0.35) * 2.5); }
    armR.rotation.y = -swing; g.position.z = 16 + Math.sin(t * 3) * 0.4 + (since < 2.2 && since > 0 ? Math.abs(Math.sin(since * 12)) * 2 : 0); head.rotation.z = Math.sin(t * 1.1) * 0.15;
    bellG.rotation.x = bk * 0.3; bellG.rotation.y = bk * 0.2;
  });
  return null;
}

// the tilt bob on the apron: a plumb bob in a ring that swings with each nudge
function tiltBobModel(RC) {
  const M = RC.mats, B = RC.batch, G = RC.G, x = 36, y = 66;
  B.add(M.chrome(), cylGeo(x, y + 14, 1.8, 35, 92, 8)); B.add(M.chrome(), tubeGeo([[x, y + 14, 90], [x, y, 90]], 1.4, 2, 8));
  B.add(M.chrome(), cylGeo(x, y + 14, 5, 35, 37, 12));
  const ring = mesh(torusGeo(x, y, 58, 7, 0.9, 24), M.chrome()); RC.root.add(ring);
  B.add(M.chrome(), tubeGeo([[x, y + 14, 58], [x, y + 7, 58]], 1, 2, 6));
  const piv = new THREE.Group(); piv.position.set(x, y, 89); RC.root.add(piv);
  const wire = mesh(new THREE.CylinderGeometry(0.35, 0.35, 32, 5), M.steel(), false); wire.rotation.x = PI / 2; wire.position.z = -16; piv.add(wire);
  const bob = mesh(latheGeo(0, 0, [[0, -46], [3.2, -40], [3.6, -33], [2.4, -30], [2.4, -28], [0, -28]], 14), M.brass()); piv.add(bob);
  RC.anim.push((dt, t) => {
    const since = t - (G.nudgeT || -9), A = Math.min(0.6, (G.tiltM || 0) * 0.26);
    const k = since < 5 ? A * Math.exp(-since * 0.9) : 0;
    piv.rotation.x = Math.sin(since * 7.5) * k + (G.tilted ? 0.22 : 0); piv.rotation.y = Math.cos(since * 6.1) * k * 0.6;
  });
  return null;
}

// the human cannonball: a little circus cannon at the left outlane that fires the kickback
function cannonModel(RC) {
  const M = RC.mats, B = RC.batch, G = RC.G, [x, y] = CANNON;
  B.add(M.plastic('#c8302c', { roughness: 0.4 }), boxGeo(x, y - 24, 6, 18, 20, 12));
  for (const sx of [-1, 1]) { B.add(M.plastic('#ffcc3a'), cylGeo(x + sx * 10, y - 24, 6, 5, 7, 14, 6)); }
  const g = new THREE.Group(); g.position.set(x, y - 26, 12); RC.root.add(g);
  const barrel = mesh(new THREE.CylinderGeometry(5.5, 7, 34, 18), M.iron()); barrel.rotation.x = -0.9; barrel.position.set(0, 10, 10); g.add(barrel);
  const band = mesh(new THREE.CylinderGeometry(7.4, 7.4, 4, 18), M.plastic('#ffcc3a')); band.rotation.x = -0.9; band.position.set(0, 4, 5); g.add(band);
  const muz = mesh(new THREE.TorusGeometry(6, 1.4, 8, 18), M.brass()); muz.rotation.x = -0.9 + PI / 2; muz.position.set(0, 23.5, 20.6); g.add(muz);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  let fired = false;
  RC.anim.push((dt, t) => {
    const c = G.comps.cannon, f = c && c.fireT > 0;
    if (f && !fired) { fired = true; RC.burst(x, y + 4, 26, 24, 420, '#ffd080'); RC.flashLight(x, y, 40, '#ffb060', 1.2); }
    if (!f) fired = false;
    g.position.y = y - 26 - (f ? 6 : 0);
  });
  return null;
}

// scenery: the ticket booth kiosk at the top of the alley and striped awnings on the block walls
function tentModel(RC) {
  const M = RC.mats, B = RC.batch;
  const cream = M.plastic('#f4ecd8', { roughness: 0.3 }), red = M.plastic('#c8302c', { roughness: 0.35 });
  // kiosk
  const kx = 390, ky = 835;
  B.add(cream, boxGeo(kx, ky, 20, 54, 24, 40)); B.add(red, boxGeo(kx, ky, 2, 56, 26, 4));
  const tex = stripeTex(RC, 10, '#c8302c', '#f4ecd8');
  const roof = new THREE.Mesh(new THREE.BoxGeometry(62, 34, 3), [red, red, red, red, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5 }), red]); roof.position.set(kx, ky - 2, 43); roof.castShadow = true; RC.root.add(roof);
  const scal = []; for (let i = 0; i < 8; i++) { const s = new THREE.SphereGeometry(3.6, 8, 6); s.scale(1, 0.6, 1); s.translate(kx - 28 + i * 8, ky - 19, 41.5); scal.push(s); } B.add(red, mergeGeo(scal));
  B.add(M.paint('#1a0e0c', { roughness: 0.9 }), boxGeo(kx, ky - 12.2, 24, 30, 0.6, 18));
  for (let i = -2; i <= 2; i++) B.add(M.brass(), boxGeo(kx + i * 6, ky - 12.6, 24, 0.8, 0.6, 18));
  B.add(cream, boxGeo(kx, ky - 12.6, 14, 34, 1.4, 2));
  const sc = canvas(256, 64), g = sc.getContext('2d'); g.fillStyle = '#ffcc3a'; g.fillRect(0, 0, 256, 64); g.fillStyle = '#2a1a14'; g.font = '400 40px ' + BUNGEE; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('TICKETS', 128, 34);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(44, 11), new THREE.MeshStandardMaterial({ map: RC.tex(sc), roughness: 0.4 })); sign.rotation.x = PI / 2; sign.position.set(kx, ky - 19.5, 50); RC.root.add(sign);
  B.add(M.brass(), cylGeo(kx + 24, ky - 10, 1.2, 40, 58, 6)); B.add(M.brass(), cylGeo(kx - 24, ky - 10, 1.2, 40, 58, 6));
  // awning over the shooting gallery ducks (on the wall behind them)
  const aw = new THREE.Mesh(new THREE.BoxGeometry(14, 100, 2), [red, red, red, red, new THREE.MeshStandardMaterial({ map: stripeTex(RC, 12, '#c8302c', '#f4ecd8'), roughness: 0.5 }), red]);
  aw.rotation.y = 0.5; aw.position.set(58, 476, 40); aw.castShadow = true; RC.root.add(aw);
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// SOUNDS (metal, wood, brass, air; no square-wave tones)
// ═══════════════════════════════════════════════════════════════════════════
function defineSounds() {
  const A = audio();
  A.define('calliope', 2.6, S => { [[523.3, 0], [659.3, 0.12], [784, 0.24], [1046.5, 0.36]].forEach(([f, t]) => { S.organ(f, t, 1.3, 0.05); S.organ(f / 2, t, 1.3, 0.03); }); S.noise(0, 0.08, 0.06, { bp: 3000, q: 2 }); });
  A.define('fanfare', 2.6, S => { [523.3, 659.3, 784, 1046.5].forEach((f, i) => S.bell(f, i * 0.09, 1.4, 0.1)); [261.6, 329.6, 392].forEach(f => S.organ(f, 0.3, 1.8, 0.04)); S.bell(1568, 0.45, 1.6, 0.08); });
  A.define('chimeHi', 1.5, S => { S.bell(1046.5, 0, 1.2, 0.13); S.bell(1318.5, 0.09, 1.1, 0.11); S.bell(1568, 0.18, 1.0, 0.11); });
  A.define('bigBell', 3.2, S => { S.noise(0, 0.012, 0.5, { hp: 3500 }); S.bell(587.3, 0, 3.0, 0.32); S.bell(1174.7, 0, 1.6, 0.1); S.ring(2400, 0, 0.3, 0.06); });
  A.define('bellRing', 1.6, S => { S.noise(0, 0.006, 0.4, { hp: 5000 }); S.bell(1760, 0, 1.4, 0.18); S.bell(2637, 0, 0.6, 0.05); });
  A.define('puck', 0.3, S => { S.noise(0, 0.012, 0.4, { bp: 2600, q: 2 }); S.ring(1900, 0, 0.22, 0.12, [1, 2.2, 3.6]); S.osc('sine', 170, 0, 0.07, 0.3, { to: 90 }); });
  A.define('ratchet', 0.55, S => { for (let i = 0; i < 8; i++) { S.noise(i * 0.055, 0.012, 0.28, { bp: 3200 + (i % 2) * 400, q: 3 }); S.ring(2800, i * 0.055, 0.05, 0.04, [1, 2.4]); } });
  A.define('splash', 1.0, S => { S.noise(0, 0.08, 0.6, { lp: 1800 }); S.noise(0.02, 0.6, 0.35, { bp: 900, bpTo: 300, q: 1.2, att: 0.03 }); S.osc('sine', 220, 0, 0.3, 0.2, { to: 60 }); for (let i = 0; i < 6; i++) S.osc('sine', 600 + i * 90, 0.25 + i * 0.08, 0.06, 0.04, { to: 950 + i * 90 }); });
  A.define('horn', 0.7, S => { S.osc('sawtooth', 330, 0, 0.5, 0.08, { bp: 900, q: 1.4, att: 0.03, to: 300 }); S.osc('sawtooth', 334, 0, 0.5, 0.08, { bp: 950, q: 1.4, att: 0.03, to: 303 }); S.osc('sine', 165, 0, 0.45, 0.08, { att: 0.03, to: 150 }); S.noise(0, 0.5, 0.03, { bp: 1200, q: 2, att: 0.05 }); });
  A.define('gulp', 0.6, S => { S.osc('sine', 320, 0, 0.32, 0.3, { to: 70 }); S.noise(0, 0.15, 0.25, { lp: 700 }); S.noise(0.22, 0.1, 0.2, { bp: 500, q: 2 }); S.osc('sine', 140, 0.3, 0.12, 0.3, { to: 60 }); });
  A.define('cannon', 1.3, S => { S.osc('sine', 95, 0, 0.5, 0.9, { to: 28 }); S.noise(0, 0.25, 0.7, { lp: 600 }); S.noise(0.02, 0.7, 0.3, { lp: 200 }); S.ring(2400, 0.01, 0.2, 0.06); });
}
