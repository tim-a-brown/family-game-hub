// ═══════════════════════════════════════════════════════════════════════════
// JUNGLE TEMPLE
// A lost temple under the canopy. Stone, moss, gold and torchlight. The toys:
// the IDOL CHAMBER (a raised stone maze the flipper buttons TILT left and
// right to steer the ball into the idol's hole), the ALTAR (a motorised
// elevator block that rises to expose its shots), the SERPENT (a cobra that
// swallows the ball, shakes, and spits it from a cave on the far wall), the
// BOULDER (rolls across the gorge on its track during Boulder Run and knocks
// the ball), the ROPE BRIDGE (a plank-and-rope wireform the ball rides across
// the table), the CLIMB (a VUK up to the chamber), the SACRIFICIAL STONE (a
// spinning disc in the floor) and the TEMPLE (crumbling walls that collapse to
// reveal the idol). Wizard mode: THE LOST CITY.
// ═══════════════════════════════════════════════════════════════════════════
import * as THREE from 'three';
import { BR, spline, deg } from '../physics.js';
import { canvas, rng, shade, rgba, latheGeo, cylGeo, tubeGeo, boxGeo, wallGeo, slabGeo, offsetLine, planarUV } from '../gfx.js';
import { audio } from '../engine.js';

const PI = Math.PI, TAU = PI * 2;
const PAL = { stone: '#6f6a5c', moss: '#3f7a3a', leaf: '#5fd080', gold: '#f2c14e', torch: '#ffb45a', jade: '#5fe0a0', blood: '#d0402a', sky: '#8fd0ff', bone: '#e9dfc4' };
const fmt = n => Math.round(n).toLocaleString('en-US');

// ── Layout constants ───────────────────────────────────────────────────────
const MAZE_Z = 58, MAZE_BOX = [36, 826, 196, 1010];
const MAZE_POLY = [[36, 826], [36, 900], [70, 952], [110, 988], [160, 1006], [196, 1010], [196, 826]];
const IDOL = [120, 846];
const ALTAR = [212, 700, 292, 760], ALTAR_H = [0, 28, 56];
const SAUCER = [252, 680];
const SNAKE = [396, 708], SNAKE_FACE = 245;
const CAVE = [0, 652];                 // the serpent's cave in the left wall
const BOULDER_Y = 470, BOULDER_R = 28, BOULDER_X0 = -46, BOULDER_X1 = 380;
const DISC = [243, 585];
const TEMPLE = [236, 962];
const RELICS = ['JADE MASK', 'SUN DISC', 'SERPENT CROWN', 'OBSIDIAN BLADE', 'EYE OF THE IDOL'];

export default {
  id: 'jungle', name: 'Jungle Temple', short: 'JUNGLE', diff: 2, color: '#f59e0b', wizard: 'the Lost City',
  desc: 'Tilt the idol maze, feed the serpent, dodge the boulder and raise the altar to the Lost City.',
  intro: 'THE TEMPLE AWAITS',
  display: { type: 'lcd', ink: '#ffd98a', ink2: '#8fe08a', bg: lcdBg, font: '"Cinzel", Georgia, serif' },
  msgStyle: 'zoom',
  music: { url: '../sounds/pinball/jungle.mp3', samples: 886154, rate: 32000 },
  speech: { pitch: 0.9, rate: 0.92, voice: 'Daniel|Arthur|Male|Google UK English Male' },
  rulesHtml:
    '<p>A lost temple deep in the jungle. Your guide is an explorer who has seen it all before.</p><ul>' +
    '<li><b>K-E-Y:</b> the three top lanes (flippers move the lit lane). Each K-E-Y wins a key and lights a <b>relic</b> at the altar.</li>' +
    '<li><b>The altar:</b> hit both seals on its front and the altar rises. Then shoot the hole at its foot: with a key you start a relic hunt (shoot the lit shots before time runs out); without one you get an offering.</li>' +
    '<li><b>Five relics:</b> Jade Mask (rope bridges), Sun Disc (orbits), Serpent Crown (the serpent), Obsidian Blade (the temple and its totems), Eye of the Idol (climb to the chamber and find the idol).</li>' +
    '<li><b>The idol chamber:</b> shoot the lane left of the bridge into the climb hole: the ball is fired up to a stone maze. The flipper buttons <b>tilt the maze</b>: steer the ball into the idol\'s hole for the Eye and big points. Fall off and you drop back to the left side.</li>' +
    '<li><b>The serpent:</b> hit the cobra three times and it opens its mouth. Feed it: two balls are locked inside, the third starts <b>Serpent Multiball</b>. The serpent shakes and spits every ball out of the cave on the left. Bridge, orbits and temple are jackpots; the open mouth is the super jackpot.</li>' +
    '<li><b>Boulder Run:</b> knock down the three wall targets on the right and the boulder rolls across the gorge for 25 seconds. Everything scores double; bridges and orbits are Boulder Dodges. Mind the boulder.</li>' +
    '<li><b>The temple:</b> nine hits on its walls and it collapses, revealing the idol: 100,000 and a key.</li>' +
    '<li><b>The rope bridge</b> crosses the table and returns the ball to the right flipper. The <b>vine</b> kickback on the left outlane is armed by K-E-Y.</li>' +
    '<li><b>The Lost City:</b> collect all five relics, play Serpent Multiball and Boulder Run, then shoot the raised altar: four balls, the boulder rolls, every shot is a jackpot and the idol on the altar is worth 500,000.</li></ul>',
  theme: {
    playfield: '#101a12', cabinet: '#1b2418', wood: '#4a3220', rails: 'gold', rubber: '#1a1612', postColor: '#d9cfae', postRubber: '#2a2420',
    flipper: '#e9dfc4', flipperRubber: '#c8732a', flipperStripe: '#7a3a12', popBody: '#3b2a1a', apron: '#1a2418', slingPlastic: '#20301c',
    gi: ['#ffb45a', '#ffb45a', '#ffc070', '#ffb45a', '#ffd090'], giPos: [[22, 300, 150], [500, 300, 150], [30, 660, 160], [492, 720, 160], [243, 980, 150, 0.8]], giLevel: 1.1,
    env: ['#ffb860', '#5fd080', '#f2d06a'], sky: '#9fd0a0', keyColor: '#ffe8c8', key: 1.0, ambient: 0.32, exposure: 1.05, bloom: 0.55,
    spark: '#ffd080', room: '#060a06', darkLight: '#ffe8c0', lampGain: 3.4, button: '#f2b544', knob: '#2a4a2a'
  },
  art: {
    playfield: paintPlayfield, backglass: paintBackglass, apron: paintApron, sides: paintSides, backboard: paintBackboard,
    sling(g, w, h, side) {
      const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#2a4a24'); gr.addColorStop(1, '#0f1a10'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      leaves(g, side === 'L' ? 20 : w - 20, h * 0.3, 60, side === 'L' ? 1 : -1, 3);
      g.fillStyle = 'rgba(242,193,78,.9)'; g.font = '700 30px Cinzel, Georgia'; g.textAlign = 'center'; g.fillText(side === 'L' ? 'GOLD' : 'JADE', w / 2, h * 0.64);
    }
  },
  fit: { top: 120, lookY: 0.47 },
  anims: {
    torch(g, t, W, H) { for (const x of [10, W - 10]) { for (let i = 0; i < 3; i++) { const f = 0.6 + 0.4 * Math.sin(t * 17 + i * 2 + x); g.fillStyle = i ? 'rgba(255,180,80,.7)' : 'rgba(255,230,160,.95)'; g.beginPath(); g.ellipse(x + Math.sin(t * 23 + i) * 1.5, H - 14 - i * 4 * f, 3 - i * 0.6, 7 * f - i, 0, 0, TAU); g.fill(); } g.fillStyle = '#5a3a20'; g.fillRect(x - 2, H - 12, 4, 12); } },
    boulder(g, t, W, H) { const x = (t * 70) % (W + 40) - 20; g.fillStyle = '#8a8070'; g.beginPath(); g.arc(x, H - 10, 9, 0, TAU); g.fill(); g.strokeStyle = '#4a4238'; g.lineWidth = 1.5; g.beginPath(); g.arc(x, H - 10, 5, t * 6, t * 6 + 2); g.stroke(); g.fillStyle = '#3a4a2a'; g.fillRect(0, H - 2, W, 2); },
    snake(g, t, W, H) { g.strokeStyle = '#6fd060'; g.lineWidth = 3; g.lineCap = 'round'; g.beginPath(); for (let x = 0; x < W; x += 3) { const y = H - 8 + Math.sin(x * 0.09 + t * 7) * 4; x ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); g.fillStyle = '#ffd27a'; g.fillRect(W - 6, H - 11, 3, 3); },
    idol(g, t, W, H) { const cx = W - 22, cy = H / 2; g.fillStyle = '#f2c14e'; g.beginPath(); g.moveTo(cx - 10, cy + 14); g.lineTo(cx - 8, cy - 10); g.lineTo(cx, cy - 16); g.lineTo(cx + 8, cy - 10); g.lineTo(cx + 10, cy + 14); g.closePath(); g.fill(); g.fillStyle = Math.sin(t * 9) > 0 ? '#ff5050' : '#8a2020'; g.fillRect(cx - 5, cy - 5, 3, 3); g.fillRect(cx + 2, cy - 5, 3, 3); for (let i = 0; i < 6; i++) { const a = t * 2 + i; g.fillStyle = 'rgba(255,240,180,' + (0.5 + 0.5 * Math.sin(t * 8 + i)) + ')'; g.fillRect(cx + Math.cos(a) * 16, cy + Math.sin(a) * 12, 1.5, 1.5); } },
    temple(g, t, W, H) { const cx = 24, b = H - 4, k = Math.min(1, t / 0.8); g.fillStyle = '#8a7a60'; for (let i = 0; i < 4; i++) { const w = 36 - i * 8, y = b - i * 8 - 8 - (i >= 2 ? (1 - k) * 20 : 0); g.fillRect(cx - w / 2, y, w, 8); } g.fillStyle = '#2a1a10'; g.fillRect(cx - 4, b - 8, 8, 8); },
    vines(g, t, W, H) { g.strokeStyle = '#4fa04a'; g.lineWidth = 1.5; for (let i = 0; i < 5; i++) { const x = 10 + i * (W - 20) / 4; g.beginPath(); g.moveTo(x, 0); for (let y = 0; y < H; y += 4) g.lineTo(x + Math.sin(y * 0.3 + t * 2 + i) * 3, y); g.stroke(); } }
  },
  build,
  rules: makeRules()
};

// ═══════════════════════════════════════════════════════════════════════════
// BUILD
// ═══════════════════════════════════════════════════════════════════════════
function build(T) {
  const W = T.W, L = T.L, G = T.G;
  defineSounds();
  // ── Shooter lane, arch, lower playfield ──
  T.shooter({ min: 700, max: 3900 });
  T.lower({ flipColor: PAL.bone, flipRubber: '#c8732a', bxColor: '#ffc83d', saveColor: '#ff5a3a', extraColor: '#ffa040', bxY: 302, slingColor: '#ffd27a' });

  // ── Left side: the gorge orbit lane, its turn to the flipper, the vine kickback ──
  T.wall([[2, 612], [6, 588], [16, 570], [32, 558], [52, 552]], { style: 'wood', r: 4, h: 34, color: '#4e4a40' });
  T.post(54, 552, { style: 'rubber', r: 5 });
  T.wall([[64, 610], [64, 744]], { style: 'metal', h: 26 });
  T.post(64, 607, { style: 'rubber', r: 5 });
  T.kickback({ id: 'vine', x: 25, y: 205, power: 2400, label: 'VINE', color: PAL.leaf });
  T.orbit({ id: 'orbitL', a: [8, 660, 60, 660], dirA: [0, 1], b: [430, 660, 478, 660], dirB: [0, -1] });
  T.orbit({ id: 'orbitR', a: [430, 660, 478, 660], dirA: [0, 1], b: [8, 660, 60, 660], dirB: [0, -1] });

  // ── The climb: a lane up to the VUK pocket, which fires the ball up to the idol chamber ──
  T.wall([[136, 636], [136, 744]], { style: 'metal', h: 26 });
  T.post(136, 633, { style: 'rubber', r: 5 });
  T.wall([[64, 744], [90, 766], [110, 766], [136, 744]], { style: 'wood', r: 4, h: 30, color: '#4e4a40' });
  T.vuk({ id: 'climb', x: 100, y: 752, r: 13, power: 2400, hold: 0.7, style: 'wire', wireMat: 'brass', exitLvl: 'maze', supportEvery: 90,
    path: [[100, 752, -10], [100, 758, 12], [102, 780, 44], [112, 812, 66], [130, 850, 74], [156, 900, 76], [180, 950, 76], [192, 988, 70], [190, 1004, MAZE_Z + 4]] });

  // ── The idol chamber: a raised stone maze the flipper buttons tilt ──
  T.level('maze', { z: MAZE_Z, bounds: MAZE_BOX });
  const shelves = [
    MAZE_POLY,                                   // outer wall, open at the bottom
    [[196, 972], [122, 964]],                    // shelf 1: gap on the left
    [[57, 930], [150, 922]],                     // shelf 2: gap on the right
    [[196, 890], [110, 884]]                     // shelf 3: gap on the left
  ];
  const maze = T.tiltingMiniField({ id: 'maze', lvl: 'maze', box: MAZE_BOX, walls: shelves, max: 1150 });
  maze.mesh = () => {}; maze.render = () => {};     // the chamber draws itself (chamberModel)
  T.post(92, 850, { style: 'rubber', r: 4, lvl: 'maze', draw: false }); T.post(148, 850, { style: 'rubber', r: 4, lvl: 'maze', draw: false });
  T.subway({ id: 'idol', x: IDOL[0], y: IDOL[1], r: 13, lvl: 'maze', delay: 1.1, to: { comp: 'altarSaucer' } });

  // ── The rope bridge: a wireform of planks and rope from the centre-left across the table to the right inlane ──
  const bridge = T.ramp({ id: 'bridge', style: 'wire', wireMat: 'iron', w: 40, exitLvl: 'main', entryMin: 150, minExit: 300, supports: false,
    pts: [[172, 600, 0], [176, 640, 4], [182, 690, 22], [190, 750, 46], [200, 810, 68], [222, 860, 84], [262, 900, 92], [310, 930, 94], [360, 940, 92], [404, 920, 86], [436, 880, 78], [452, 820, 68], [456, 740, 56], [454, 640, 44], [448, 540, 32], [438, 440, 20], [428, 370, 10], [424, 346, 6]] });
  bridge.mesh = RC => { bridgeModel(RC, bridge.pts); };
  T.post(148, 598, { style: 'rubber', r: 5 }); T.post(198, 598, { style: 'rubber', r: 5 });

  // ── The altar: a motorised stone block with its three shots at the foot ──
  const altar = T.elevator({ id: 'altar', box: ALTAR, heights: ALTAR_H, start: 0, color: '#6a6252' });
  altar.mesh = RC => altarModel(RC, altar); altar.render = () => {};
  T.ao({ kind: 'poly', pts: [[ALTAR[0], ALTAR[1]], [ALTAR[2], ALTAR[1]], [ALTAR[2], ALTAR[3]], [ALTAR[0], ALTAR[3]]], a: 0.6, blur: 12 });
  T.standupTarget({ id: 'sealL', x: 226, y: 694, angle: 270, w: 18, label: '', color: '#b89a54', art: sealArt });
  T.standupTarget({ id: 'sealR', x: 278, y: 694, angle: 270, w: 18, label: '', color: '#b89a54', art: sealArt });
  T.scoop({ id: 'altarSaucer', x: SAUCER[0], y: SAUCER[1], r: 11, maxV: 2600, hood: false, hold: 0.7, eject: { angle: 270, speed: 650 } });
  G.comps.altarSaucer.sens.on = false;

  // ── The sacrificial stone: a spinning disc in the floor ──
  T.spinningDisc({ id: 'disc', x: DISC[0], y: DISC[1], r: 42, speed: 4.5, grip: 4, color: '#8a7a58', art: discArt, on: true });

  // ── Right side: the serpent, the temple yard lane, the wall targets, the orbit return ──
  T.wall([[478, 612], [474, 588], [464, 572], [448, 562], [432, 558]], { style: 'wood', r: 4, h: 34, color: '#4e4a40' });
  T.wall([[426, 620], [426, 800]], { style: 'metal', h: 26 });
  T.post(426, 617, { style: 'rubber', r: 5 }); T.post(432, 556, { style: 'rubber', r: 5 });
  T.dropTargetBank({ id: 'walls', x: 456, y: 428, angle: 180, n: 3, w: 22, gap: 3, labels: ['', '', ''], color: '#8a8070', art: wallArt });
  T.wall([[468, 396], [468, 462]], { style: 'wood', r: 3, h: 30, color: '#4e4a40' });
  T.wall([[440, 468], [478, 496]], { style: 'metal', h: 24 });
  ['w0', 'w1', 'w2'].forEach((id, i) => T.insert(id, 424, 404 + i * 24, { shape: 'rect', w: 12, h: 16, round: 3, color: '#ffb45a' }));
  const snake = T.mouthToy({ id: 'snake', x: SNAKE[0], y: SNAKE[1], facing: SNAKE_FACE, w: 44, manual: true, model: snakeModel });
  T.wall([[368, 736], [374, 800], [420, 812], [420, 736]], { style: 'invisible', mat: 'toy', r: 3 });   // the coiled body
  T.subway({ id: 'cave', hole: false, delay: 1.3, to: { x: 34, y: CAVE[1], vx: 240, vy: -260 } });

  // ── The temple yard: totem bumpers, K-E-Y lanes and the crumbling temple ──
  [['tot1', 318, 876], ['tot2', 392, 880], ['tot3', 356, 938]].forEach(([id, x, y]) => T.popBumper({ id, x, y, r: 23, color: '#f2c14e', skirt: '#c8732a', body: '#3b2a1a', capArt: totemCap, spark: '#ffd080' }));
  [['laneK', 306], ['laneE', 346], ['laneY', 386]].forEach(([id, x], i) => T.rolloverLane({ id, x, y: 996, r: 11, color: '#ffb45a', lampDy: -30, shape: 'circle', lampR: 8, text: 'KEY'[i], textSize: 9 }));
  [286, 326, 366, 406].forEach(x => { T.wall([[x, 980], [x, 1010]], { style: 'metal', h: 22 }); T.post(x, 980, { style: 'metal', r: 3 }); });
  const temple = T.crumblingToy({ id: 'temple', x: TEMPLE[0], y: TEMPLE[1], w: 60, facing: 270, hits: [3, 3, 3], model: templeModel });
  T.wall([[206, 962], [206, 1004], [266, 1004], [266, 962]], { style: 'invisible', mat: 'wood', r: 3 });
  T.ao({ kind: 'poly', pts: [[206, 962], [266, 962], [266, 1004], [206, 1004]], a: 0.6, blur: 10 });

  // ── The boulder: rolls along its track across the gorge during Boulder Run ──
  T.comp(makeBoulder(T));

  // ── Inserts ──
  const ins = (id, x, y, o) => T.insert(id, x, y, o);
  ins('aOrbL', 34, 640, { shape: 'arrow', w: 16, h: 28, color: PAL.jade, label: 'GORGE', ly: -22, labelSize: 5.5 });
  ins('aClimb', 100, 640, { shape: 'arrow', w: 16, h: 28, color: PAL.gold, label: 'CLIMB', ly: -22, labelSize: 5.5 });
  ins('aBridge', 172, 556, { shape: 'arrow', w: 18, h: 30, color: '#ffb45a', label: 'BRIDGE', ly: -24, labelSize: 5.5 });
  ins('aSealL', 226, 656, { shape: 'arrow', w: 14, h: 22, color: '#f2c14e' });
  ins('aAltar', 252, 648, { shape: 'arrow', w: 16, h: 26, color: PAL.blood, label: 'ALTAR', ly: -22, labelSize: 5.5 });
  ins('aSealR', 278, 656, { shape: 'arrow', w: 14, h: 22, color: '#f2c14e' });
  ins('aTemple', 332, 640, { shape: 'arrow', w: 16, h: 28, color: '#ffb45a', label: 'TEMPLE', ly: -22, labelSize: 5.5 });
  ins('aSnake', 398, 646, { shape: 'arrow', w: 16, h: 26, rot: -22, color: PAL.leaf, label: 'SERPENT', ly: -22, labelSize: 5.5 });
  ins('aOrbR', 452, 640, { shape: 'arrow', w: 16, h: 28, color: PAL.jade, label: 'GORGE', ly: -22, labelSize: 5.5 });
  RELICS.forEach((n, i) => { const a = deg(200 + i * 35), r = 60; ins('relic' + i, DISC[0] + Math.cos(a) * r, DISC[1] + Math.sin(a) * r, { shape: 'circle', r: 8, color: ['#5fe0a0', '#ffd27a', '#6fd060', '#b0a0ff', '#ff5050'][i], text: ['M', 'S', 'C', 'B', 'E'][i], size: 7 }); });
  for (let i = 0; i < 5; i++) ins('key' + i, 203 + i * 20, 372, { shape: 'diamond', w: 12, h: 16, color: '#ffd27a' });
  ins('lock1', 370, 672, { shape: 'circle', r: 6.5, color: PAL.leaf }); ins('lock2', 384, 660, { shape: 'circle', r: 6.5, color: PAL.leaf });
  ins('boulderL', 140, 500, { shape: 'oval', w: 32, h: 14, color: '#ffb45a', text: 'BOULDER', size: 5.2 });
  ins('cityL', 243, 412, { shape: 'ring', r: 20, ring: 4, color: PAL.gold });
  ins('eyeL', IDOL[0], IDOL[1] + 24, { shape: 'diamond', w: 12, h: 16, color: '#ff5050', lvl: 'maze' });
  ins('mbL', 346, 500, { shape: 'oval', w: 32, h: 14, color: PAL.leaf, text: 'SERPENT', size: 5.2 });
  T.flasher('flTemple', 290, 1030, { color: '#ffb45a', r: 10, z0: 0 });
  T.flasher('flCave', 22, 700, { color: PAL.leaf, r: 9, z0: 0 });
  T.flasher('flAltar', 300, 770, { color: PAL.blood, r: 9, z0: 0 });
  // torches: GI bulbs along the sides and on the temple
  [[14, 360], [14, 520], [470, 360], [470, 520], [16, 820], [444, 1020], [216, 1030], [256, 1030]].forEach((p, i) => T.bulb('gi' + i, p[0], p[1], 12, { color: '#ffb45a', r: 3, k: 3, on: 1 }));
  [[22, 760, 44], [470, 800, 44], [204, 1014, 70], [268, 1014, 70], [44, 1000, 86], [194, 1000, 86]].forEach((p, i) => T.bulb('torch' + i, p[0], p[1], p[2], { color: '#ffc070', r: 2.4, k: 7, on: 1 }));

  // ── Scenery models ──
  T.model(RC => chamberModel(RC, maze));
  T.model(RC => sceneryModel(RC));
  T.model(RC => { RC.anim.push((dt, t) => torchFlicker(RC, t)); return null; });
}

// ── The boulder: a custom component (dynamic circle on a track) ─────────────
function makeBoulder(T) {
  const w = T.world, G = T.G;
  const B = { id: 'boulder', x: BOULDER_X0, y: BOULDER_Y, lvl: 'main', dir: 0, run: 0, spin: 0, rumbleT: 0, last: -9, home: true };
  B.c = w.circ(B.x, B.y, BOULDER_R, { mat: 'toy', dynamic: true, kick: 760, kickMin: 0, kickCool: 0.25, owner: B, id: 'boulder', on: false, mute: true });
  B.onContact = (b, c, imp) => { if (G.time - B.last < 0.3) return; B.last = G.time; G.sfx('wood', { vol: 0.9, rate: 0.6, x: B.x }); G.sfx('rumble', { vol: 0.5, x: B.x }); G.shake(0.5); G.haptic('heavy'); G.emit('boulderHit', 'boulder', b, {}); };
  B.start = () => { if (B.run <= 0) { B.dir = 1; B.c.on = true; B.home = false; } B.run = 1; G.sfx('rumble', { vol: 0.9, x: 0 }); };
  B.stop = () => { B.run = 0; };
  B.trigger = () => { B.start(); G.later(12, () => B.stop()); };
  B.step = dt => {
    if (!B.dir) return;
    const v = 230;
    let x = B.x + B.dir * v * dt;
    if (B.dir > 0 && x >= BOULDER_X1) { x = BOULDER_X1; B.dir = -1; }
    if (B.dir < 0 && x <= BOULDER_X0) { x = BOULDER_X0; if (B.run) B.dir = 1; else { B.dir = 0; B.c.on = false; B.home = true; } }
    B.spin += (x - B.x) / 30; B.x = x; w.moveCirc(B.c, x, B.y, dt);
  };
  B.update = dt => { if (B.dir) { B.rumbleT -= dt; if (B.rumbleT <= 0) { B.rumbleT = 0.9; G.sfx('rumble', { vol: 0.35, x: B.x, vary: 0.2 }); G.shake(0.12); } } };
  B.onTilt = () => { B.run = 0; };
  B.mesh = RC => {
    const c = canvas(256, 256), g = c.getContext('2d'), r = rng(41);
    g.fillStyle = '#7a7262'; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 900; i++) { g.fillStyle = 'rgba(' + (r() < 0.5 ? '30,26,20' : '160,150,130') + ',' + (0.08 + r() * 0.2) + ')'; g.beginPath(); g.arc(r() * 256, r() * 256, 1 + r() * 5, 0, TAU); g.fill(); }
    g.strokeStyle = 'rgba(20,16,12,.5)'; g.lineWidth = 2; for (let i = 0; i < 14; i++) { g.beginPath(); let x = r() * 256, y = r() * 256; g.moveTo(x, y); for (let k = 0; k < 5; k++) { x += (r() - 0.5) * 40; y += (r() - 0.5) * 40; g.lineTo(x, y); } g.stroke(); }
    const m = new THREE.Mesh(new THREE.SphereGeometry(30, 28, 20), new THREE.MeshStandardMaterial({ map: RC.tex(c), roughness: 0.9, metalness: 0, bumpMap: RC.tex(c), bumpScale: 1.2 }));
    m.castShadow = true; m.receiveShadow = true; RC.root.add(m); B.m = m;
  };
  B.render = () => { if (!B.m) return; B.m.visible = B.x > BOULDER_X0 + 2; B.m.position.set(B.x, B.y, 30); B.m.rotation.set(0, B.spin, 0); };
  return B;
}

// ═══════════════════════════════════════════════════════════════════════════
// RULES
// ═══════════════════════════════════════════════════════════════════════════
function makeRules() {
  const LINES = {
    start: ['Mind your step. The temple is old.', 'Ah. Another expedition.', 'Do try not to wake the serpent.'],
    climb: ['Up we go.', 'Mind the drop.'],
    idol: ['The idol. Splendid.', 'Careful. It is heavier than it looks.'],
    snake: ['That is a very large snake.', 'It is only a serpent. A big one.'],
    feed: ['It seems hungry.', 'Feed it, then.'],
    mb: ['Run.', 'Everybody out of the temple.'],
    boulder: ['Boulder. Run.', 'I did say mind the boulder.'],
    relic: ['One for the museum.', 'Relic recovered.'],
    temple: ['The walls are coming down.', 'I was fond of that wall.'],
    drain: ['Lost, then. Like the city.', 'The jungle keeps what it takes.', 'Another one for the gorge.'],
    jackpot: ['Jackpot.', 'Treasure.'],
    city: ['The Lost City. We found it.'],
    extra: ['One more ball. Use it wisely.'],
    key: ['A key. Good.']
  };
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const HUNT = [
    { need: 3, shots: { bridge: 1 }, sub: 'CROSS THE BRIDGE 3 TIMES' },
    { need: 3, shots: { orbitL: 1, orbitR: 1 }, sub: 'RIDE THE GORGE 3 TIMES' },
    { need: 2, shots: { snake: 1 }, sub: 'FEED THE SERPENT TWICE' },
    { need: 6, shots: { temple: 1, tot1: 1, tot2: 1, tot3: 1 }, sub: 'TEMPLE AND TOTEMS: 6 HITS' },
    { need: 1, shots: { climb: 1 }, sub: 'CLIMB AND FIND THE IDOL' }
  ];
  const R = {
    modes: {
      boulder: G => R.startBoulder(G),
      serpent: G => { const B = G.b; B.locks = 2; B.feedLit = true; B.snakeHits = 9; G.comp('snake').open(); },
      relic: G => { G.b.keys = Math.max(1, G.b.keys); G.b.relicLit = G.b.relics.indexOf(0); R.startHunt(G, Math.max(0, G.b.relicLit)); },
      city: G => R.startCity(G),
      climb: G => { const b = G.liveBalls()[0]; if (b) G.world.place(b, 186, 1000, 'maze', -100, -100); },
      temple: G => { const t = G.comp('temple'); for (let i = 0; i < 9; i++) t.onContact(null, null, 1500); },
      altar: G => R.raiseAltar(G)
    },
    init(G) {
      G.b = { key: [0, 0, 0], keyLit: 0, keys: 0, seals: [0, 0], altarUp: false, relics: [0, 0, 0, 0, 0], relicLit: -1, hunt: -1, huntGot: 0,
        snakeHits: 0, snakeNeed: 3, feedLit: false, locks: 0, serpentMB: false, serpentDone: false, jpLit: {}, superLit: false,
        boulderRun: false, boulderDone: false, climbs: 0, idols: 0, templeHits: 0, templeDone: false, cityLit: false, city: false,
        saidT: -9, altarT: 0, discT: 8, birdT: 6, offerings: 0, jp: 0 };
      G.say(pick(LINES.start));
    },
    say(G, k, force) { if (G.time - G.b.saidT < 3.5 && !force) return; if (G.say(pick(LINES[k]), { force })) G.b.saidT = G.time; },
    ballStart(G) {
      const B = G.b; B.keyLit = Math.floor(Math.random() * 3); B.key = [0, 0, 0];
      const t = G.comp('temple'); if (t.stage >= 3) { t.reset(); B.templeDone = false; }
      B.seals = [0, 0]; R.lowerAltar(G);
      if (B.cityLit) R.raiseAltar(G);
      G.comp('snake').close(); if (B.feedLit && !B.serpentMB) G.comp('snake').open();
    },
    ballEnd(G) {
      const B = G.b; B.serpentMB = false; B.city = false; B.jpLit = {}; B.superLit = false; B.boulderRun = false; B.hunt = -1;
      G.comp('boulder').stop(); G.comp('snake').close();
      if (!G.tilted) R.say(G, 'drain');
    },
    serve(G) { G.b.keyLit = (G.b.keyLit + 1) % 3; },
    skill(G, type, id) { if (type === 'lane') return id === ['laneK', 'laneE', 'laneY'][G.b.keyLit]; if (type === 'pop' || type === 'orbit' || type === 'ramp' || type === 'vuk') return false; },
    flip(G, side, on) {
      if (!on || G.state !== 'play' && G.state !== 'serve') return;
      const B = G.b; B.keyLit = (B.keyLit + (side === 'R' ? 1 : 2)) % 3;
      const k = B.key; if (side === 'R') B.key = [k[2], k[0], k[1]]; else B.key = [k[1], k[2], k[0]];
    },
    event(G, type, id, b, d) {
      const B = G.b;
      switch (type) {
        case 'pop': R.hunt(G, id); if (B.city) G.add(5000); break;
        case 'lane':
          if (/^lane[KEY]$/.test(id)) {
            B.key[['laneK', 'laneE', 'laneY'].indexOf(id)] = 1;
            if (B.key.every(Boolean)) { B.key = [0, 0, 0]; R.giveKey(G, 'K-E-Y'); }
          }
          break;
        case 'target':
          if (id === 'sealL' || id === 'sealR') {
            B.seals[id === 'sealL' ? 0 : 1] = 1; G.add(2500);
            if (B.seals.every(Boolean) && !B.altarUp) R.raiseAltar(G);
            else if (!B.altarUp) G.msg('SEAL BROKEN', 'ONE MORE RAISES THE ALTAR', {});
          }
          break;
        case 'scoop': if (id === 'altarSaucer') R.altar(G, b); break;
        case 'ramp':
          if (id === 'bridge') {
            G.combo(id); G.cnt('bridge'); R.say(G, 'climb');
            if (R.jp(G, id)) break;
            if (R.hunt(G, id)) break;
            if (B.boulderRun) { G.add(30000); G.msg('BOULDER DODGE', fmt(30000 * G.mult), { anim: 'boulder' }); }
            else G.msg('ROPE BRIDGE', fmt(G.add(10000)), { anim: 'vines' });
          }
          break;
        case 'rampFail': if (id === 'bridge') G.msg('THE BRIDGE SWAYS', 'SHOOT IT HARDER', { dur: 1 }); break;
        case 'orbit':
          G.combo(id);
          if (R.jp(G, id)) break;
          if (R.hunt(G, id)) break;
          if (B.boulderRun) { G.add(30000); G.msg('BOULDER DODGE', fmt(30000 * G.mult), { anim: 'boulder' }); }
          else G.msg('THE GORGE', fmt(G.add(5000)), {});
          break;
        case 'vuk':
          if (id === 'climb') { B.climbs++; G.cnt('climb'); G.add(10000); G.msg('THE CLIMB', 'TILT THE CHAMBER WITH THE FLIPPERS', { anim: 'vines' }); R.say(G, 'climb'); }
          break;
        case 'subway':
          if (id === 'idol') {
            B.idols++; G.cnt('idol'); G.comp('altarSaucer').holdT = 1.4;
            G.sfx('gong', { vol: 0.8 }); G.lightShow('chase', 1.5); G.pulse('eyeL', 1.5);
            if (B.hunt === 4) { R.huntProgress(G, 'climb'); }
            else { G.jackpot(50000, 'THE IDOL', { color: PAL.gold, sound: 'gong' }); }
            if (B.idols === 2 && !G.ebLit && G.ebGot < 1) { G.lightExtra(); }
            R.say(G, 'idol', true);
          }
          break;
        case 'subwayOut': if (id === 'cave') { G.sfx('hiss', { vol: 0.7, x: 20 }); G.pulse('flCave', 0.6); if (G.T.R) G.T.R.burst(34, CAVE[1], 14, 10, 300, PAL.leaf); } break;
        case 'mouthHit':
          G.add(5000); G.sfx('hiss', { vol: 0.35, x: SNAKE[0] });
          if (B.feedLit || B.serpentMB) break;
          B.snakeHits++;
          if (B.snakeHits >= B.snakeNeed) { B.feedLit = true; G.comp('snake').open(); G.msg('THE SERPENT STIRS', 'FEED IT', { anim: 'snake' }); G.sfx('hiss', { vol: 0.9, x: SNAKE[0] }); R.say(G, 'feed'); }
          else { G.msg('THE SERPENT', (B.snakeNeed - B.snakeHits) + ' MORE TO WAKE IT', { anim: 'snake', dur: 1.1 }); if (B.snakeHits === 1) R.say(G, 'snake'); }
          break;
        case 'mouth': R.swallow(G, b); break;
        case 'drop': G.pulse('w' + d.i, 0.3); break;
        case 'bank':
          G.cnt('walls');
          if (!B.boulderRun && !B.city) R.startBoulder(G);
          else { G.add(25000); G.msg('THE WALLS', '25,000', {}); }
          break;
        case 'boulderHit': G.cnt('boulder'); G.msg('THE BOULDER', fmt(G.add(7500)), { anim: 'boulder', dur: 1 }); break;
        case 'toyHit': B.templeHits++; G.add(5000); if (!R.hunt(G, 'temple')) G.msg('THE TEMPLE', (9 - B.templeHits) + ' HITS TO BRING IT DOWN', { anim: 'temple', dur: 1 }); break;
        case 'toyStage': G.add(15000); G.msg('THE WALL CRACKS', fmt(15000 * G.mult), { anim: 'temple' }); G.sfx('crumble', { vol: 0.8, x: TEMPLE[0] }); G.pulse('flTemple', 0.5); break;
        case 'toyCollapse':
          B.templeDone = true; B.templeHits = 0; G.cnt('temple');
          G.jackpot(100000, 'THE TEMPLE FALLS', { color: '#ffb45a', sound: 'crumble' }); G.sfx('thunder', { vol: 0.5, rate: 1.3 }); G.pulse('flTemple', 1.2);
          R.giveKey(G, 'THE IDOL REVEALED'); R.say(G, 'temple', true);
          break;
        case 'kickback': G.msg('VINE SWING', '', { style: 'flash', dur: 1 }); break;
      }
    },
    // the lit jackpots (Serpent Multiball, the Lost City)
    jp(G, id) {
      const B = G.b; if (!(B.jpLit[id] || B.city)) return false;
      const v = B.city ? 100000 : 60000;
      if (!B.city) delete B.jpLit[id];
      B.jp++; G.jackpot(v, B.city ? 'LOST CITY JACKPOT' : 'JACKPOT', { color: PAL.jade }); R.say(G, 'jackpot');
      if (B.serpentMB && !Object.keys(B.jpLit).length && !B.superLit) { B.superLit = true; G.comp('snake').open(); G.msg('SUPER JACKPOT', 'IN THE SERPENT\'S MOUTH', { anim: 'snake' }); }
      return true;
    },
    // relic hunts: a shot on the hunt's list advances it
    hunt(G, id) {
      const B = G.b; if (B.hunt < 0) return false;
      const H = HUNT[B.hunt]; if (!H.shots[id]) return false;
      R.huntProgress(G, id); return true;
    },
    huntProgress(G, id) {
      const B = G.b, H = HUNT[B.hunt]; B.huntGot++;
      const p = G.add(30000);
      if (B.huntGot >= H.need) { B.relics[B.hunt] = 1; G.cnt('relic'); G.add(75000); G.jackpot(0, RELICS[B.hunt], { color: PAL.gold, sound: 'gong' }); G.msg('RELIC FOUND', fmt(105000 * G.mult), { anim: 'idol' }); R.say(G, 'relic', true); G.endMode('relic'); R.checkCity(G); }
      else G.msg(RELICS[B.hunt], (H.need - B.huntGot) + ' MORE  ' + fmt(p), { anim: 'idol', dur: 1.3 });
    },
    startHunt(G, i) {
      const B = G.b; B.hunt = i; B.huntGot = 0; B.keys = Math.max(0, B.keys - 1); G.cnt('mode');
      G.startMode('relic', 35); G.big(RELICS[i], HUNT[i].sub, PAL.gold, { anim: 'idol' }); G.sfx('gong', { vol: 0.6 });
      if (i === 2) G.comp('snake').open();
      B.relicLit = B.keys > 0 ? B.relics.indexOf(0) : -1;
    },
    giveKey(G, why) {
      const B = G.b; B.keys = Math.min(5, B.keys + 1); G.cnt('key'); G.bxUp(); G.comp('vine').arm();
      const next = B.relics.indexOf(0);
      if (next >= 0 && B.hunt < 0) { B.relicLit = next; G.msg(why, RELICS[next] + ' IS LIT AT THE ALTAR', { anim: 'idol' }); }
      else G.msg(why, 'A KEY TO THE TEMPLE', { anim: 'idol' });
      G.sfx('award'); R.say(G, 'key');
    },
    raiseAltar(G) { const B = G.b; if (B.altarUp) return; B.altarUp = true; G.comp('altar').goTo(B.city ? 2 : 1); G.comp('altarSaucer').sens.on = true; G.sfx('grind', { vol: 0.8, x: 252 }); G.msg('THE ALTAR RISES', B.cityLit ? 'THE LOST CITY AWAITS' : B.relicLit >= 0 && B.keys ? 'SHOOT IT FOR ' + RELICS[B.relicLit] : 'SHOOT THE ALTAR', { anim: 'idol' }); G.pulse('flAltar', 0.8); },
    lowerAltar(G) { const B = G.b; B.altarUp = false; B.seals = [0, 0]; G.comp('altar').goTo(0); G.comp('altarSaucer').sens.on = false; },
    altar(G, b) {
      const B = G.b, sc = G.comp('altarSaucer'); sc.holdT = 1.3; G.add(10000); G.pulse('flAltar', 0.6);
      if (B.city && B.altarUp) { sc.holdT = 1.6; G.jackpot(500000, 'SUPER JACKPOT', { color: PAL.gold }); G.sfx('gong', { vol: 1 }); return; }
      if (B.cityLit && !G.mb) { B.cityLit = false; sc.holdT = 3.5; R.startCity(G); return; }
      if (G.ebLit) { G.collectExtra(); R.say(G, 'extra', true); B.altarT = 1.5; return; }
      if (B.hunt < 0 && B.keys > 0 && B.relicLit >= 0 && !G.mb) { sc.holdT = 2.2; R.startHunt(G, B.relicLit); B.altarT = 2.4; return; }
      // an offering
      B.offerings++;
      const opts = ['25,000', 'BONUS UP', 'BALL SAVE', 'LIGHT THE VINE']; if (B.idols && !G.ebLit && G.ebGot < 1) opts.push('EXTRA BALL');
      const aw = opts[Math.floor(Math.random() * opts.length)];
      if (aw === 'BONUS UP') G.bxUp(); else if (aw === 'BALL SAVE') G.ballSave(12); else if (aw === 'LIGHT THE VINE') G.comp('vine').arm(); else if (aw === 'EXTRA BALL') G.lightExtra(); else G.add(25000);
      G.msg('THE OFFERING', aw, { anim: 'torch' }); G.sfx('gong', { vol: 0.5 }); B.altarT = 1.6;
    },
    swallow(G, b) {
      const B = G.b, snake = G.comp('snake'), cave = G.comp('cave');
      snake.shake = 1; G.cnt('feed'); G.sfx('hiss', { vol: 0.9, x: SNAKE[0] }); G.shake(0.5);
      const spit = (delay) => { const i = snake.balls.indexOf(b); if (i >= 0) snake.balls.splice(i, 1); cave.take(b, delay); };
      if (B.serpentMB && B.superLit) { B.superLit = false; G.jackpot(150000, 'SUPER JACKPOT', { color: PAL.leaf }); snake.close(); spit(1.6); B.jpLit = { bridge: 1, orbitL: 1, orbitR: 1, temple: 1 }; return; }
      if (B.serpentMB || B.city) { G.add(20000); G.msg('SNAKE BITE', '20,000', { anim: 'snake' }); spit(1.2); return; }
      if (B.hunt === 2) { R.huntProgress(G, 'snake'); if (B.hunt < 0) snake.close(); spit(1.2); return; }
      if (!B.feedLit) { G.add(15000); G.msg('SNAKE BITE', '15,000', { anim: 'snake' }); snake.close(); spit(1.2); return; }
      // a lock
      B.locks++; G.cnt('lock'); B.feedLit = false; B.snakeHits = 0; B.snakeNeed = 2;
      if (B.locks >= 3) { G.later(0.9, () => R.startSerpent(G)); return; }
      G.lockBall(b); snake.close();
      G.msg('BALL ' + B.locks + ' LOCKED', B.locks === 2 ? 'FEED IT ONCE MORE' : 'IN THE SERPENT', { anim: 'snake' });
    },
    startSerpent(G) {
      const B = G.b, snake = G.comp('snake'), cave = G.comp('cave'); B.serpentMB = true; B.serpentDone = true; B.locks = 0; B.snakeNeed = 3; B.snakeHits = 0; G.cnt('serpent');
      snake.shake = 1.5; snake.close();
      const balls = snake.balls.slice(); snake.balls.length = 0;
      balls.forEach((b, i) => { b.locked = false; cave.take(b, 0.6 + i * 0.9); });
      G.multiball(3, { label: 'SERPENT MULTIBALL', color: PAL.leaf, save: 15 });
      B.jpLit = { bridge: 1, orbitL: 1, orbitR: 1, temple: 1 }; G.sfx('hiss', { vol: 1, x: 40 }); R.say(G, 'mb', true);
      R.checkCity(G);
    },
    startBoulder(G) {
      const B = G.b; B.boulderRun = true; G.cnt('run');
      G.comp('boulder').start(); G.startMode('boulder', 25, { mult: 2 }); G.ballSave(6);
      G.big('BOULDER RUN', 'EVERYTHING SCORES 2X', '#ffb45a', { anim: 'boulder' }); G.sfx('rumble', { vol: 1 }); G.callout('BOULDER RUN', '#ffb45a'); R.say(G, 'boulder', true);
    },
    checkCity(G) {
      const B = G.b;
      if (!B.cityLit && !B.city && B.relics.every(Boolean) && B.serpentDone && B.boulderDone) { B.cityLit = true; G.msg('THE LOST CITY', 'IS LIT AT THE ALTAR', { anim: 'idol', dur: 2.5 }); G.sfx('gong', { vol: 0.9 }); if (!B.altarUp) R.raiseAltar(G); }
    },
    startCity(G) {
      const B = G.b; B.city = true; G.cnt('wiz'); B.relics = [0, 0, 0, 0, 0]; B.serpentDone = false; B.boulderDone = false;
      G.multiball(4, { label: 'THE LOST CITY', color: PAL.gold, save: 25 });
      G.startMode('city', 60); G.comp('altar').goTo(2); B.altarUp = true; G.comp('altarSaucer').sens.on = true; G.comp('boulder').start(); G.comp('snake').open();
      G.sfx('gong', { vol: 1 }); G.later(1, () => G.sfx('gong', { vol: 0.8, rate: 1.2 })); G.strike(0.6);
      R.say(G, 'city', true); G.callout('THE LOST CITY', PAL.gold);
    },
    modeEnd(G, name) {
      const B = G.b;
      if (name === 'boulder') { B.boulderRun = false; B.boulderDone = true; G.comp('boulder').stop(); G.msg('THE BOULDER RESTS', 'FOR NOW', { anim: 'boulder' }); R.checkCity(G); }
      if (name === 'relic') { if (B.hunt >= 0 && !B.relics[B.hunt]) G.msg('THE RELIC IS LOST', 'TRY AGAIN', {}); B.hunt = -1; if (!B.feedLit && !B.serpentMB) G.comp('snake').close(); B.relicLit = B.keys > 0 ? B.relics.indexOf(0) : -1; }
      if (name === 'city') { B.city = false; G.comp('boulder').stop(); R.lowerAltar(G); G.comp('snake').close(); G.msg('THE CITY SLEEPS', 'AGAIN', {}); }
    },
    mbEnd(G) { const B = G.b; B.serpentMB = false; B.superLit = false; B.jpLit = {}; if (!B.feedLit) G.comp('snake').close(); if (B.city) { B.city = false; G.endMode('city'); } },
    levelDrain(G, lvl, b) {
      if (lvl === 'maze') { G.world.airborne(b, 40, 806, MAZE_Z, 0, -120, 0, 'main'); G.add(5000); G.msg('THE DROP', '5,000', { dur: 0.9 }); G.sfx('land', { vol: 0.5, x: 40 }); return true; }
      return false;
    },
    drain() { return false; },
    update(G, dt) {
      const B = G.b, disc = G.comp('disc');
      if (B.altarT > 0) { B.altarT -= dt; if (B.altarT <= 0 && !B.city && !B.cityLit) R.lowerAltar(G); }
      // the sacrificial stone turns one way, then the other; faster in modes
      B.discT -= dt; if (B.discT <= 0) { B.discT = 9 + Math.random() * 6; disc.w = -disc.w; G.sfx('grind', { vol: 0.25, x: DISC[0], rate: 0.8 }); }
      const want = (B.city || B.serpentMB ? 8 : B.hunt >= 0 || B.boulderRun ? 6.5 : 4.5) * Math.sign(disc.w || 1); disc.w += (want - disc.w) * Math.min(1, dt * 0.8);
      // the jungle: birds and insects, sparse and quiet
      B.birdT -= dt; if (B.birdT <= 0) { B.birdT = 12 + Math.random() * 16; if (G.amb && G.state === 'play') G.sfx(['bird', 'bird', 'monkey'][Math.floor(Math.random() * 3)], { vol: 0.1, x: Math.random() * 520, vary: 0.2 }); }
    },
    lamps(G) {
      const B = G.b, L = {}, t = G.time, H = B.hunt >= 0 ? HUNT[B.hunt].shots : null;
      const shot = (lampId, compId, idle) => { L[lampId] = B.jpLit[compId] || B.city ? 'fast' : H && H[compId] ? 'blink' : idle; };
      shot('aOrbL', 'orbitL', B.boulderRun ? 'blink' : G.lastShot === 'orbitR' && t - G.lastShotT < 4 ? 'blink' : 0);
      shot('aOrbR', 'orbitR', B.boulderRun ? 'blink' : G.lastShot === 'orbitL' && t - G.lastShotT < 4 ? 'blink' : 0);
      shot('aBridge', 'bridge', B.boulderRun ? 'blink' : 'slow');
      shot('aTemple', 'temple', B.templeDone ? 1 : 0.15);
      shot('aSnake', 'snake', B.feedLit ? 'blink' : B.snakeHits / B.snakeNeed);
      shot('aClimb', 'climb', B.idols ? 1 : 'slow');
      L.aSealL = B.altarUp ? 0 : B.seals[0] ? 1 : 'slow'; L.aSealR = B.altarUp ? 0 : B.seals[1] ? 1 : 'slow';
      L.aAltar = B.altarUp ? (B.cityLit || B.city ? 'fast' : 'blink') : 0;
      B.relics.forEach((r, i) => { L['relic' + i] = r ? 1 : B.hunt === i ? 'fast' : B.relicLit === i && B.keys ? 'blink' : 0; });
      for (let i = 0; i < 5; i++) L['key' + i] = i < B.keys ? 1 : 0;
      ['laneK', 'laneE', 'laneY'].forEach((id, i) => { L[id] = B.key[i] ? 1 : (G.skill && i === B.keyLit) ? 'fast' : 0; });
      L.lock1 = B.locks >= 1 ? 1 : B.feedLit ? 'blink' : 0; L.lock2 = B.locks >= 2 ? 1 : B.feedLit && B.locks === 1 ? 'blink' : 0;
      L.mbL = B.serpentMB ? 'fast' : B.locks ? 'pulse' : 0;
      L.boulderL = B.boulderRun ? 'fast' : B.boulderDone ? 1 : 0;
      L.cityL = B.city ? 'fast' : B.cityLit ? 'blink' : 0;
      L.eyeL = B.hunt === 4 ? 'fast' : B.climbs ? 'blink' : 'slow';
      const wb = G.comp('walls'); if (wb) wb.targets.forEach((tg, i) => { L['w' + i] = tg.up ? 'slow' : 1; });
      L.vine = G.comp('vine').armed ? 1 : 0;
      L.flTemple = B.city && Math.random() < 0.05 ? 1 : 0; L.flCave = B.serpentMB && (t % 1.5) < 0.1 ? 1 : 0; L.flAltar = B.altarUp && (t % 2) < 0.1 ? 1 : 0;
      for (let i = 0; i < 8; i++) L['gi' + i] = 1;
      for (let i = 0; i < 6; i++) L['torch' + i] = 0.7 + 0.3 * Math.sin(t * 13 + i * 2.1) * Math.sin(t * 7.3 + i);
      L.tot1 = L.tot2 = L.tot3 = B.city ? 'blink' : H && H.tot1 ? 'blink' : 0.15;
      return L;
    },
    status(G) {
      const B = G.b;
      if (B.city) return 'THE LOST CITY: EVERY SHOT IS A JACKPOT, THE ALTAR IS 500,000';
      if (B.serpentMB) return B.superLit ? 'SUPER JACKPOT IN THE SERPENT\'S MOUTH' : 'SERPENT MULTIBALL: SHOOT THE LIT JACKPOTS';
      if (B.hunt >= 0) return RELICS[B.hunt] + ': ' + HUNT[B.hunt].sub + ' (' + Math.ceil(G.modes.relic || 0) + ')';
      if (B.boulderRun) return 'BOULDER RUN: BRIDGES AND ORBITS DODGE THE BOULDER';
      if (B.cityLit) return B.altarUp ? 'THE LOST CITY IS LIT: SHOOT THE ALTAR' : 'BREAK BOTH SEALS TO RAISE THE ALTAR';
      if (B.altarUp) return B.keys && B.relicLit >= 0 ? 'SHOOT THE ALTAR FOR ' + RELICS[B.relicLit] : 'SHOOT THE ALTAR FOR AN OFFERING';
      if (B.feedLit) return 'FEED THE SERPENT TO LOCK A BALL';
      const opts = ['BREAK THE TWO SEALS TO RAISE THE ALTAR', 'SPELL K-E-Y FOR A KEY', 'HIT THE SERPENT ' + Math.max(0, B.snakeNeed - B.snakeHits) + ' MORE TIMES', 'KNOCK DOWN THE WALLS FOR BOULDER RUN', 'CLIMB TO THE IDOL CHAMBER', 'RELICS: ' + B.relics.filter(Boolean).length + ' OF 5'];
      return opts[Math.floor(G.time / 4) % opts.length];
    },
    bonus(G) { return [['TOTEMS', G.pbn('pop'), 200], ['BRIDGES', G.pbn('bridge'), 5000], ['KEYS', G.pbn('key'), 5000], ['CLIMBS', G.pbn('climb'), 10000], ['SERPENT', G.pbn('feed'), 10000], ['RELICS', G.pbn('relic'), 25000]]; }
  };
  return R;
}
