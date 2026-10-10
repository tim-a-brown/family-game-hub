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
const SNAKE = [390, 708], SNAKE_FACE = 245;
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
  T.wall([[64, 610], [64, 890]], { style: 'metal', h: 26 });
  T.wall([[64, 890], [100, 940], [140, 985], [196, 1006]], { style: 'invisible', mat: 'wood', r: 3 });
  T.post(64, 607, { style: 'rubber', r: 5 });
  T.kickback({ id: 'vine', x: 25, y: 205, power: 2400, label: 'VINE', color: PAL.leaf });
  T.orbit({ id: 'orbitL', a: [8, 660, 60, 660], dirA: [0, 1], b: [430, 660, 478, 660], dirB: [0, -1] });
  T.orbit({ id: 'orbitR', a: [430, 660, 478, 660], dirA: [0, 1], b: [8, 660, 60, 660], dirB: [0, -1] });

  // ── The climb: a lane up to the VUK pocket, which fires the ball up to the idol chamber ──
  T.wall([[136, 636], [136, 744]], { style: 'metal', h: 26 });
  T.post(136, 633, { style: 'rubber', r: 5 });
  T.wall([[64, 744], [90, 766], [110, 766], [136, 744]], { style: 'wood', r: 4, h: 30, color: '#4e4a40' });
  T.vuk({ id: 'climb', x: 100, y: 752, r: 13, power: 1750, hold: 0.7, style: 'wire', wireMat: 'brass', exitLvl: 'maze', supportEvery: 90,
    path: [[100, 752, -10], [100, 758, 12], [102, 780, 44], [112, 812, 66], [130, 850, 76], [156, 900, 80], [180, 950, 80], [188, 984, 78], [182, 996, 72], [172, 996, MAZE_Z + 4]] });

  // ── The idol chamber: a raised stone maze the flipper buttons tilt ──
  T.level('maze', { z: MAZE_Z, bounds: MAZE_BOX });
  const shelves = [
    MAZE_POLY,                                   // outer wall, open at the bottom
    [[196, 948], [118, 942]],                    // shelf 1: slopes down to the gap on the left
    [[37, 892], [150, 886]]                      // shelf 2: slopes down to the gap on the right
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
  [[204, 862], [240, 858], [292, 926]].forEach(p => T.post(p[0], p[1], { style: 'peg', r: 3, draw: false }));

  // ── The altar: a motorised stone block with its three shots at the foot ──
  const altar = T.elevator({ id: 'altar', box: ALTAR, heights: ALTAR_H, start: 0, color: '#6a6252' });
  altar.mesh = RC => altarModel(RC, altar); altar.render = () => {};
  T.ao({ kind: 'poly', pts: [[ALTAR[0], ALTAR[1]], [ALTAR[2], ALTAR[1]], [ALTAR[2], ALTAR[3]], [ALTAR[0], ALTAR[3]]], a: 0.6, blur: 12 });
  T.wall([[204, 688], [212, 792], [294, 762]], { style: 'invisible', mat: 'wood', r: 3 });
  T.wall([[212, 792], [204, 900], [196, 1006]], { style: 'invisible', mat: 'wood', r: 3 });   // seals the strip under the chamber
  T.wall([[150, 688], [204, 688]], { style: 'invisible', mat: 'plastic', r: 2 });
  T.standupTarget({ id: 'sealL', x: 226, y: 694, angle: 270, w: 18, label: '', color: '#b89a54', art: sealArt });
  T.standupTarget({ id: 'sealR', x: 278, y: 694, angle: 270, w: 18, label: '', color: '#b89a54', art: sealArt });
  T.scoop({ id: 'altarSaucer', x: SAUCER[0], y: SAUCER[1], r: 11, maxV: 2600, hood: false, hold: 0.7, eject: { angle: 244, speed: 700 }, spread: 10 });
  G.comps.altarSaucer.sens.on = false;

  // ── The sacrificial stone: a spinning disc in the floor ──
  T.spinningDisc({ id: 'disc', x: DISC[0], y: DISC[1], r: 42, speed: 3.5, grip: 0.7, color: '#8a7a58', art: discArt, on: true });

  // ── Right side: the serpent, the temple yard lane, the wall targets, the orbit return ──
  T.wall([[478, 612], [474, 588], [464, 572], [448, 562], [432, 558]], { style: 'wood', r: 4, h: 34, color: '#4e4a40' });
  T.wall([[426, 620], [426, 800]], { style: 'metal', h: 26 });
  T.post(426, 617, { style: 'rubber', r: 5 }); T.post(432, 556, { style: 'rubber', r: 5 });
  T.dropTargetBank({ id: 'walls', x: 456, y: 428, angle: 180, n: 3, w: 22, gap: 3, labels: ['', '', ''], color: '#8a8070', art: wallArt });
  T.wall([[468, 396], [468, 462]], { style: 'wood', r: 3, h: 30, color: '#4e4a40' });
  T.wall([[440, 468], [478, 496]], { style: 'metal', h: 24 });
  ['w0', 'w1', 'w2'].forEach((id, i) => T.insert(id, 424, 404 + i * 24, { shape: 'rect', w: 12, h: 16, round: 3, color: '#ffb45a' }));
  const snake = T.mouthToy({ id: 'snake', x: SNAKE[0], y: SNAKE[1], facing: SNAKE_FACE, w: 44, manual: true, model: snakeModel });
  T.wall([[372, 700], [360, 740], [364, 800], [416, 812], [416, 740], [408, 717]], { style: 'invisible', mat: 'toy', r: 3 });   // the coiled body
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
  T.bulb('eyeL', IDOL[0], IDOL[1] + 18, MAZE_Z + 24, { color: '#ff5050', r: 1.6, k: 6 });
  ins('mbL', 346, 500, { shape: 'oval', w: 32, h: 14, color: PAL.leaf, text: 'SERPENT', size: 5.2 });
  T.flasher('flTemple', 290, 1030, { color: '#ffb45a', r: 10, z0: 0 });
  T.flasher('flCave', 22, 700, { color: PAL.leaf, r: 9, z0: 0 });
  T.flasher('flAltar', 300, 770, { color: PAL.blood, r: 9, z0: 0 });
  // torches: GI bulbs along the sides and on the temple
  [[14, 360], [14, 520], [470, 360], [470, 520], [16, 820], [444, 1020], [216, 1030], [256, 1030]].forEach((p, i) => T.bulb('gi' + i, p[0], p[1], 12, { color: '#ffb45a', r: 3, k: 3, on: 1 }));
  [[8, 760, 50], [477, 800, 50], [204, 1014, 76], [268, 1014, 76], [76, 946, MAZE_Z + 36], [190, 1000, MAZE_Z + 36]].forEach((p, i) => T.bulb('torch' + i, p[0], p[1], p[2], { color: '#ffc070', r: 2.4, k: 7, on: 1 }));

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
      if (B.huntGot >= H.need) { B.relics[B.hunt] = 1; G.cnt('relic'); const v = G.add(75000); G.big(RELICS[B.hunt], 'RELIC FOUND  ' + fmt(v), PAL.gold, { anim: 'idol' }); G.sfx('gong', { vol: 0.9 }); R.say(G, 'relic', true); G.endMode('relic'); R.checkCity(G); }
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
      const want = (B.city || B.serpentMB ? 6 : B.hunt >= 0 || B.boulderRun ? 5 : 3.5) * Math.sign(disc.w || 1); disc.w += (want - disc.w) * Math.min(1, dt * 0.8);
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

// ═══════════════════════════════════════════════════════════════════════════
// SOUNDS (table-specific recipes; see audio.js for the synth helpers)
// ═══════════════════════════════════════════════════════════════════════════
let soundsDefined = false;
function defineSounds() {
  if (soundsDefined) return; soundsDefined = true;
  const A = audio();
  A.define('hiss', 0.7, S => { S.noise(0, 0.6, 0.22, { bp: 3600, bpTo: 2000, q: 2.2, att: 0.04 }); S.noise(0.02, 0.3, 0.08, { hp: 6000, att: 0.02 }); });
  A.define('rumble', 1.0, S => { S.noise(0, 0.9, 0.3, { lp: 140, att: 0.08 }); S.osc('sine', 42, 0, 0.8, 0.3, { to: 30, att: 0.05 }); for (let i = 0; i < 5; i++) S.noise(i * 0.17, 0.05, 0.12, { bp: 420 + i * 60, q: 2 }); });
  A.define('grind', 1.1, S => { for (let i = 0; i < 9; i++) S.noise(i * 0.11, 0.06, 0.16, { bp: 520 + (i % 3) * 140, q: 3 }); S.osc('sawtooth', 52, 0, 1.0, 0.035, { lp: 260, att: 0.05 }); S.osc('sine', 70, 0.95, 0.12, 0.3, { to: 40 }); });
  A.define('crumble', 0.9, S => { S.noise(0, 0.12, 0.45, { lp: 900 }); S.osc('sine', 95, 0, 0.18, 0.5, { to: 45 }); for (let i = 0; i < 7; i++) S.ring(700 + (i * 311) % 900, 0.05 + i * 0.08, 0.1, 0.06, [1, 1.7, 2.9]); S.noise(0.1, 0.6, 0.12, { lp: 400 }); });
  A.define('gong', 3.6, S => { S.bell(164.8, 0, 3.4, 0.2); S.bell(82.4, 0, 3.4, 0.1); S.bell(329.6, 0.02, 2.2, 0.06); S.noise(0, 0.05, 0.25, { bp: 900, q: 1 }); S.osc('sine', 110, 0, 0.1, 0.3, { to: 60 }); });
  A.define('bird', 0.6, S => { S.osc('sine', 1900, 0, 0.12, 0.05, { to: 2700, att: 0.01 }); S.osc('sine', 2100, 0.2, 0.14, 0.05, { to: 2900, att: 0.01 }); S.osc('sine', 1700, 0.42, 0.1, 0.04, { to: 2400, att: 0.01 }); });
  A.define('monkey', 0.9, S => { for (let i = 0; i < 3; i++) S.osc('sine', 480 + i * 40, i * 0.26, 0.18, 0.05, { to: 720, lp: 1500, att: 0.03 }); });
}

// ═══════════════════════════════════════════════════════════════════════════
// LCD background (colour display): torchlit stone
// ═══════════════════════════════════════════════════════════════════════════
function lcdBg(g, W, H, t) {
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#15201a'); gr.addColorStop(1, '#0a110c'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1;
  for (let y = 8; y < H; y += 12) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); for (let x = ((y / 12) % 2) * 14; x < W; x += 28) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 12); g.stroke(); } }
  for (const x of [0, W]) { const k = 0.7 + 0.3 * Math.sin(t * 15 + x) * Math.sin(t * 6.1); const rg = g.createRadialGradient(x, H / 2, 0, x, H / 2, 46 * k); rg.addColorStop(0, 'rgba(255,170,70,.45)'); rg.addColorStop(1, 'rgba(255,170,70,0)'); g.fillStyle = rg; g.fillRect(0, 0, W, H); }
}

// ═══════════════════════════════════════════════════════════════════════════
// ART (canvas painters; table space, y up)
// ═══════════════════════════════════════════════════════════════════════════
function stoneFloor(g, r, x0, y0, x1, y1, size, tint, a) {
  // flagstones: offset rows of rounded blocks with mortar, each a slightly different stone
  for (let y = y0; y < y1; y += size) {
    const off = ((y - y0) / size % 2) * size * 0.5;
    for (let x = x0 - size + off; x < x1; x += size) {
      const w = size * (0.82 + r() * 0.16), h = size * (0.78 + r() * 0.18), k = 0.75 + r() * 0.5;
      g.fillStyle = 'rgba(' + Math.round(tint[0] * k) + ',' + Math.round(tint[1] * k) + ',' + Math.round(tint[2] * k) + ',' + a + ')';
      g.beginPath(); g.roundRect ? g.roundRect(x + 1.5, y + 1.5, w - 3, h - 3, 2.5) : g.rect(x + 1.5, y + 1.5, w - 3, h - 3); g.fill();
      g.fillStyle = 'rgba(255,255,255,' + (0.05 * a) + ')'; g.fillRect(x + 2.5, y + h - 4, w - 5, 1.2);
    }
  }
}
function glyphRow(g, x0, y, x1, size, color, r) {
  g.save(); g.strokeStyle = color; g.fillStyle = color; g.lineWidth = Math.max(0.8, size * 0.12);
  for (let x = x0; x < x1 - size; x += size * 1.5) {
    const k = Math.floor(r() * 5);
    g.beginPath();
    if (k === 0) { g.rect(x, y - size / 2, size, size); g.stroke(); g.beginPath(); g.arc(x + size / 2, y, size * 0.22, 0, TAU); g.fill(); }
    else if (k === 1) { g.moveTo(x, y + size / 2); g.lineTo(x + size / 2, y - size / 2); g.lineTo(x + size, y + size / 2); g.closePath(); g.stroke(); }
    else if (k === 2) { for (let i = 0; i < 3; i++) { g.rect(x + i * size * 0.36, y - size / 2, size * 0.25, size); } g.fill(); }
    else if (k === 3) { g.arc(x + size / 2, y, size / 2, 0, TAU); g.stroke(); g.beginPath(); g.moveTo(x, y); g.lineTo(x + size, y); g.stroke(); }
    else { g.moveTo(x, y - size / 2); g.lineTo(x + size, y - size / 2); g.lineTo(x, y + size / 2); g.lineTo(x + size, y + size / 2); g.stroke(); }
  }
  g.restore();
}
function leaves(g, x, y, s, dir, n, seed) {
  const r = rng(seed || 3);
  for (let i = 0; i < n; i++) {
    const a = (r() - 0.5) * 1.6 + (dir > 0 ? 0 : PI), len = s * (0.6 + r() * 0.6), w = len * 0.34;
    g.save(); g.translate(x + (r() - 0.5) * s * 0.6, y + (r() - 0.5) * s * 0.8); g.rotate(a);
    const gr = g.createLinearGradient(0, 0, len, 0); gr.addColorStop(0, 'rgba(40,110,50,.85)'); gr.addColorStop(1, 'rgba(110,200,90,.8)');
    g.fillStyle = gr; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(len * 0.5, -w, len, 0); g.quadraticCurveTo(len * 0.5, w, 0, 0); g.fill();
    g.strokeStyle = 'rgba(20,60,30,.6)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(0, 0); g.lineTo(len * 0.95, 0); g.stroke();
    for (let k = 1; k < 5; k++) { g.beginPath(); g.moveTo(len * k / 5, 0); g.lineTo(len * (k / 5 + 0.1), -w * 0.5); g.moveTo(len * k / 5, 0); g.lineTo(len * (k / 5 + 0.1), w * 0.5); g.stroke(); }
    g.restore();
  }
}
function vine(g, pts, w, r) {
  g.save(); g.strokeStyle = '#3b6a2e'; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.stroke();
  g.strokeStyle = 'rgba(120,200,100,.45)'; g.lineWidth = w * 0.35; g.stroke();
  for (let i = 1; i < pts.length; i += 2) leaves(g, pts[i][0], pts[i][1], w * 5, i % 4 < 2 ? 1 : -1, 2, i * 7);
  g.restore();
}
function paintPlayfield(P) {
  const g = P.ctx, W = P.W, L = P.L, r = rng(17);
  // jungle floor: deep green-black, lighter mossy stone up the middle
  g.fillStyle = P.lin(0, 0, 0, L, [[0, '#0b130d'], [0.3, '#16241a'], [0.7, '#182a1a'], [1, '#0a120c']]); g.fillRect(0, 0, W, L);
  // the paved temple way: flagstones from the apron to the altar, mossy at the edges
  stoneFloor(g, rng(3), 40, 100, 480, 1060, 44, [120, 114, 96], 0.55);
  // moss and damp patches
  for (let i = 0; i < 26; i++) { P.glow(r() * W, 120 + r() * 900, 30 + r() * 70, '#2f7a3a', 0.1 + r() * 0.12); }
  for (let i = 0; i < 18; i++) { P.glow(r() * W, 120 + r() * 900, 20 + r() * 40, '#8fd070', 0.05 + r() * 0.06); }
  // the gorge: both orbit lanes are a deep chasm with mist, and the boulder's track across the middle
  const chasm = (x0, x1) => { g.fillStyle = P.lin(x0, 0, x1, 0, [[0, 'rgba(6,10,14,.95)'], [0.5, 'rgba(14,22,30,.9)'], [1, 'rgba(6,10,14,.95)']]); g.fillRect(x0, 560, x1 - x0, 440); g.fillStyle = P.lin(0, 560, 0, 1000, [[0, 'rgba(160,200,210,0)'], [0.3, 'rgba(160,200,210,.12)'], [0.7, 'rgba(160,200,210,.1)'], [1, 'rgba(160,200,210,0)']]); g.fillRect(x0, 560, x1 - x0, 440); };
  chasm(4, 64); chasm(428, 478);
  for (let i = 0; i < 12; i++) { const y = 580 + i * 36; g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1; g.beginPath(); g.moveTo(8, y); g.lineTo(60, y + 8 + r() * 6); g.moveTo(432, y); g.lineTo(476, y + 8 + r() * 6); g.stroke(); }
  // the boulder track: a worn groove with stone edging and the cave mouth on the left
  g.fillStyle = 'rgba(8,8,6,.55)'; g.fillRect(0, BOULDER_Y - 31, 430, 62);
  g.fillStyle = P.lin(0, BOULDER_Y - 31, 0, BOULDER_Y + 31, [[0, 'rgba(0,0,0,.4)'], [0.5, 'rgba(90,84,70,.25)'], [1, 'rgba(0,0,0,.4)']]); g.fillRect(0, BOULDER_Y - 31, 430, 62);
  g.strokeStyle = 'rgba(190,180,150,.45)'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(0, BOULDER_Y - 31); g.lineTo(430, BOULDER_Y - 31); g.moveTo(0, BOULDER_Y + 31); g.lineTo(430, BOULDER_Y + 31); g.stroke();
  for (let i = 0; i < 40; i++) { g.strokeStyle = 'rgba(0,0,0,' + (0.1 + r() * 0.2) + ')'; g.lineWidth = 1 + r() * 2; g.beginPath(); const x = r() * 420; g.moveTo(x, BOULDER_Y - 20 + r() * 40); g.lineTo(x + 10 + r() * 30, BOULDER_Y - 20 + r() * 40); g.stroke(); }
  glyphRow(g, 44, BOULDER_Y - 37, 420, 5, 'rgba(242,193,78,.35)', rng(9));
  P.text('THE GORGE', 36, 760, { size: 7, color: 'rgba(160,220,200,.55)', rot: 90, spacing: 2 });
  P.text('THE GORGE', 452, 760, { size: 7, color: 'rgba(160,220,200,.55)', rot: -90, spacing: 2 });
  // the sun stone: a carved gold ring under the spinning disc, with rays
  for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; g.strokeStyle = 'rgba(242,193,78,.3)'; g.lineWidth = 3; g.beginPath(); g.moveTo(DISC[0] + Math.cos(a) * 46, DISC[1] + Math.sin(a) * 46); g.lineTo(DISC[0] + Math.cos(a) * 66, DISC[1] + Math.sin(a) * 66); g.stroke(); }
  g.strokeStyle = 'rgba(242,193,78,.5)'; g.lineWidth = 2; P.circle(DISC[0], DISC[1], 47).stroke(); P.circle(DISC[0], DISC[1], 70).stroke();
  P.arcText('SACRIFICIAL STONE', DISC[0], DISC[1], 78, 270, { size: 6, color: 'rgba(242,193,78,.7)', inside: true });
  // relic names round the arc
  RELICS.forEach((n, i) => { const a = deg(200 + i * 35); P.text(n, DISC[0] + Math.cos(a) * 86, DISC[1] + Math.sin(a) * 86, { size: 4.4, color: 'rgba(243,230,200,.8)', rot: 0 }); });
  // the climb lane and the temple yard: carved steps up to the altar
  for (let i = 0; i < 7; i++) { g.fillStyle = 'rgba(0,0,0,' + (0.18 + i * 0.03) + ')'; g.fillRect(70, 640 + i * 14, 60, 3); }
  P.text('THE CLIMB', 100, 690, { size: 6, color: 'rgba(242,193,78,.7)', rot: 90 });
  P.text('K-E-Y', 243, 392, { size: 7, color: 'rgba(255,210,122,.8)' });
  P.text('KEYS TO THE TEMPLE', 243, 356, { size: 5, color: 'rgba(243,230,200,.6)' });
  P.text('LOST CITY', 243, 440, { size: 6, color: 'rgba(242,193,78,.75)' });
  P.text('WALLS', 420, 476, { size: 5.5, color: 'rgba(255,180,90,.8)' });
  P.text('BOULDER RUN', 140, 512, { size: 5, color: 'rgba(255,180,90,.7)' });
  P.text('SERPENT LOCKS', 362, 648, { size: 4.6, color: 'rgba(160,230,140,.8)', rot: -22 });
  P.text('TEMPLE OF THE IDOL', 236, 948, { size: 6, color: 'rgba(242,193,78,.75)' });
  // carved glyph borders along the way
  glyphRow(g, 150, 212, 340, 7, 'rgba(242,193,78,.4)', rng(5));
  glyphRow(g, 150, 196, 340, 7, 'rgba(242,193,78,.25)', rng(6));
  P.text('JUNGLE TEMPLE', 243, 204, { size: 12, color: 'rgba(242,193,78,.6)', spacing: 3 });
  // vines over the stone, hanging from the corners and along the gorge
  vine(g, [[0, 1040], [30, 1010], [26, 960], [40, 900], [34, 840]], 3.5, r);
  vine(g, [[520, 1040], [490, 1020], [496, 960], [486, 900], [492, 850], [484, 790]], 3.5, r);
  vine(g, [[180, 130], [150, 150], [120, 140], [96, 160], [70, 150]], 2.5, r);
  vine(g, [[400, 120], [420, 150], [445, 140], [470, 165]], 2.5, r);
  leaves(g, 60, 1020, 60, 1, 5, 11); leaves(g, 470, 1030, 60, -1, 5, 12); leaves(g, 24, 160, 40, 1, 4, 13); leaves(g, 470, 160, 40, -1, 4, 14);
  // the temple yard: packed earth and roots
  g.fillStyle = 'rgba(60,44,28,.35)'; g.fillRect(200, 780, 230, 180);
  for (let i = 0; i < 8; i++) { g.strokeStyle = 'rgba(40,28,16,.5)'; g.lineWidth = 2 + r() * 2; g.beginPath(); const x = 200 + r() * 230, y = 790 + r() * 150; g.moveTo(x, y); g.quadraticCurveTo(x + 20 - r() * 40, y + 20, x + 40 - r() * 80, y + 10 - r() * 20); g.stroke(); }
}
function paintBackglass(g, w, h) {
  // sunset over the canopy, a stepped temple, and the gold idol's face
  const sky = g.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#2a1240'); sky.addColorStop(0.35, '#b0402a'); sky.addColorStop(0.55, '#f2a040'); sky.addColorStop(0.7, '#2a3a20'); sky.addColorStop(1, '#06100a'); g.fillStyle = sky; g.fillRect(0, 0, w, h);
  const sun = g.createRadialGradient(w * 0.5, h * 0.5, 0, w * 0.5, h * 0.5, 120); sun.addColorStop(0, 'rgba(255,240,200,1)'); sun.addColorStop(0.3, 'rgba(255,200,120,.9)'); sun.addColorStop(1, 'rgba(255,160,80,0)'); g.fillStyle = sun; g.fillRect(0, 0, w, h);
  // canopy layers
  const r = rng(23);
  for (let L = 0; L < 3; L++) { g.fillStyle = ['#1e3a22', '#132a18', '#0a1a0e'][L]; g.beginPath(); g.moveTo(0, h); for (let x = 0; x <= w; x += 18) g.lineTo(x, h * (0.56 + L * 0.1) + Math.sin(x * 0.05 + L) * 14 + r() * 10); g.lineTo(w, h); g.fill(); }
  // the temple: stepped pyramid with a glowing doorway
  g.fillStyle = '#2a2a24'; const cx = w / 2, b = h * 0.78;
  for (let i = 0; i < 5; i++) { const ww = 300 - i * 52, hh = 26; g.fillStyle = i % 2 ? '#3a3a30' : '#2c2c24'; g.fillRect(cx - ww / 2, b - (i + 1) * hh, ww, hh); g.fillStyle = 'rgba(255,200,120,.12)'; g.fillRect(cx - ww / 2, b - (i + 1) * hh, ww, 3); }
  g.fillStyle = '#6a5a3a'; for (let i = 0; i < 9; i++) g.fillRect(cx - 22, b - i * 14 - 14, 44, 3);
  const dg = g.createRadialGradient(cx, b - 150, 0, cx, b - 150, 40); dg.addColorStop(0, 'rgba(255,220,140,1)'); dg.addColorStop(1, 'rgba(255,160,60,0)'); g.fillStyle = dg; g.fillRect(cx - 40, b - 190, 80, 80);
  // the idol's face in gold, big, over the sun
  g.save(); g.translate(cx, h * 0.3); g.shadowColor = '#ffd27a'; g.shadowBlur = 30;
  const gold = g.createLinearGradient(-80, -90, 80, 90); gold.addColorStop(0, '#fff0b0'); gold.addColorStop(0.5, '#f2c14e'); gold.addColorStop(1, '#9a6a1a'); g.fillStyle = gold;
  g.beginPath(); g.moveTo(-70, 80); g.lineTo(-60, -40); g.lineTo(-30, -90); g.lineTo(30, -90); g.lineTo(60, -40); g.lineTo(70, 80); g.closePath(); g.fill();
  g.shadowBlur = 0; g.fillStyle = '#3a2a10'; g.beginPath(); g.ellipse(-26, -10, 16, 9, 0, 0, TAU); g.ellipse(26, -10, 16, 9, 0, 0, TAU); g.fill();
  g.fillStyle = '#ff4040'; g.beginPath(); g.arc(-26, -10, 6, 0, TAU); g.arc(26, -10, 6, 0, TAU); g.fill();
  g.fillStyle = '#3a2a10'; g.fillRect(-34, 40, 68, 8); for (let i = 0; i < 6; i++) g.fillRect(-30 + i * 11, 40, 4, 16); g.fillRect(-6, 10, 12, 20);
  for (let i = 0; i < 7; i++) { g.fillStyle = '#5fe0a0'; g.beginPath(); g.arc(-54 + i * 18, -70, 4, 0, TAU); g.fill(); }
  g.restore();
  // vines and leaves in the corners
  g.save(); g.scale(1, 1); leaves(g, 30, 40, 90, 1, 7, 31); leaves(g, w - 30, 50, 90, -1, 7, 32); leaves(g, 20, h - 60, 70, 1, 5, 33); leaves(g, w - 20, h - 60, 70, -1, 5, 34); g.restore();
  // title
  g.save(); g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '700 60px Cinzel, Georgia, serif';
  g.shadowColor = '#ffb45a'; g.shadowBlur = 22; g.fillStyle = '#ffe6a8'; g.fillText('JUNGLE', w / 2, h * 0.86); g.font = '700 44px Cinzel, Georgia, serif'; g.fillText('TEMPLE', w / 2, h * 0.95); g.restore();
}
function paintApron(g, w, h) {
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#5a5648'); gr.addColorStop(0.5, '#3e3a30'); gr.addColorStop(1, '#22201a'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  const r = rng(8); for (let i = 0; i < 400; i++) { g.fillStyle = 'rgba(' + (r() < 0.5 ? '0,0,0' : '255,255,255') + ',' + (0.03 + r() * 0.06) + ')'; g.beginPath(); g.arc(r() * w, r() * h, 1 + r() * 6, 0, TAU); g.fill(); }
  g.strokeStyle = 'rgba(242,193,78,.7)'; g.lineWidth = 4; g.strokeRect(12, 12, w - 24, h - 24);
  glyphRow(g, 30, 36, w - 30, 14, 'rgba(242,193,78,.55)', rng(4));
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '700 50px Cinzel, Georgia'; g.fillStyle = '#ffe6a8'; g.shadowColor = '#ffb45a'; g.shadowBlur = 14; g.fillText('JUNGLE TEMPLE', w / 2, h * 0.5); g.shadowBlur = 0;
  g.font = '700 17px Georgia'; g.fillStyle = 'rgba(243,230,200,.85)';
  g.fillText('K-E-Y LIGHTS A RELIC  ·  THE SEALS RAISE THE ALTAR  ·  FEED THE SERPENT  ·  TILT THE IDOL CHAMBER', w / 2, h * 0.8);
  leaves(g, 40, h * 0.5, 60, 1, 4, 41); leaves(g, w - 40, h * 0.5, 60, -1, 4, 42);
}
function paintSides(g, w, h) {
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#2a3a24'); gr.addColorStop(1, '#0c140e'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  const r = rng(12);
  vine(g, [[0, 20], [120, 60], [260, 30], [400, 70], [560, 40], [720, 80], [880, 40], [1024, 70]], 5, r);
  for (let i = 0; i < 10; i++) leaves(g, 40 + i * 100, 90, 44, i % 2 ? 1 : -1, 3, 50 + i);
  g.fillStyle = 'rgba(242,193,78,.7)'; g.fillRect(0, 8, w, 2); g.fillStyle = '#3b6a2e'; g.fillRect(0, h - 8, w, 3);
}
function paintBackboard(g, w, h) {
  // the canopy: layered leaves with shafts of light, a stone frieze along the bottom
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#0a1a10'); gr.addColorStop(1, '#1a3020'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  const r = rng(27);
  for (let i = 0; i < 90; i++) { const x = r() * w, y = r() * h * 0.7, s = 20 + r() * 40; g.fillStyle = 'rgba(' + (40 + r() * 60 | 0) + ',' + (110 + r() * 90 | 0) + ',' + (50 + r() * 40 | 0) + ',' + (0.25 + r() * 0.3) + ')'; g.beginPath(); g.ellipse(x, y, s, s * 0.5, r() * PI, 0, TAU); g.fill(); }
  for (let i = 0; i < 5; i++) { const x = 100 + i * 210; const sg = g.createLinearGradient(x, 0, x + 60, h); sg.addColorStop(0, 'rgba(255,230,160,.22)'); sg.addColorStop(1, 'rgba(255,230,160,0)'); g.fillStyle = sg; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 40, 0); g.lineTo(x + 140, h); g.lineTo(x + 60, h); g.fill(); }
  for (let i = 0; i < 12; i++) leaves(g, 40 + i * 90, 30 + (i % 3) * 40, 70, i % 2 ? 1 : -1, 4, 60 + i);
  g.fillStyle = '#3e3a30'; g.fillRect(0, h - 70, w, 70); g.fillStyle = 'rgba(0,0,0,.3)'; for (let x = 0; x < w; x += 64) g.fillRect(x, h - 70, 2, 70);
  glyphRow(g, 20, h - 36, w - 20, 22, 'rgba(242,193,78,.6)', rng(14));
  g.fillStyle = 'rgba(242,193,78,.6)'; g.fillRect(0, h - 72, w, 3);
}
function sealArt(g, w, h) { g.fillStyle = '#b89a54'; g.fillRect(0, 0, w, h); g.strokeStyle = '#4a3a14'; g.lineWidth = 6; g.beginPath(); g.arc(w / 2, h / 2, w * 0.3, 0, TAU); g.stroke(); g.fillStyle = '#4a3a14'; g.beginPath(); g.arc(w / 2, h / 2, w * 0.12, 0, TAU); g.fill(); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; g.beginPath(); g.moveTo(w / 2 + Math.cos(a) * w * 0.34, h / 2 + Math.sin(a) * w * 0.34); g.lineTo(w / 2 + Math.cos(a) * w * 0.44, h / 2 + Math.sin(a) * w * 0.44); g.stroke(); } }
function wallArt(g, w, h, i) { g.fillStyle = ['#8a8070', '#7a7260', '#8f8674'][i]; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, h * 0.3, w, 5); g.fillRect(0, h * 0.65, w, 5); g.fillRect(w * 0.45, 0, 5, h * 0.3); g.fillRect(w * 0.2, h * 0.3, 5, h * 0.35); g.fillRect(w * 0.7, h * 0.65, 5, h * 0.35); g.fillStyle = 'rgba(80,140,70,.5)'; g.beginPath(); g.ellipse(w * 0.3, h * 0.85, 18, 10, 0, 0, TAU); g.fill(); }
function discArt(g, w, h) {
  const c = w / 2; g.fillStyle = '#8a7a58'; g.beginPath(); g.arc(c, c, c, 0, TAU); g.fill();
  const r = rng(19); for (let i = 0; i < 300; i++) { g.fillStyle = 'rgba(0,0,0,' + (0.05 + r() * 0.15) + ')'; g.beginPath(); g.arc(r() * w, r() * h, 1 + r() * 4, 0, TAU); g.fill(); }
  g.strokeStyle = '#3a2a10'; g.lineWidth = 5; g.beginPath(); g.arc(c, c, c * 0.82, 0, TAU); g.stroke(); g.beginPath(); g.arc(c, c, c * 0.25, 0, TAU); g.stroke();
  for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; g.beginPath(); g.moveTo(c + Math.cos(a) * c * 0.25, c + Math.sin(a) * c * 0.25); g.lineTo(c + Math.cos(a) * c * 0.82, c + Math.sin(a) * c * 0.82); g.stroke(); }
  g.fillStyle = '#f2c14e'; g.beginPath(); g.arc(c, c, c * 0.14, 0, TAU); g.fill();
  g.fillStyle = 'rgba(120,20,10,.6)'; g.beginPath(); g.arc(c + c * 0.5, c - c * 0.3, c * 0.09, 0, TAU); g.fill();
}
function totemCap(g, w, h) {
  const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); gr.addColorStop(0, '#ffe6a0'); gr.addColorStop(0.6, '#e0a040'); gr.addColorStop(1, '#6a3a14'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(60,30,10,.9)'; g.beginPath(); g.ellipse(w * 0.36, h * 0.4, 16, 12, 0, 0, TAU); g.ellipse(w * 0.64, h * 0.4, 16, 12, 0, 0, TAU); g.fill();
  g.beginPath(); g.moveTo(w * 0.3, h * 0.66); g.lineTo(w * 0.7, h * 0.66); g.lineTo(w * 0.5, h * 0.84); g.closePath(); g.fill();
  g.strokeStyle = 'rgba(60,30,10,.7)'; g.lineWidth = 6; g.beginPath(); g.arc(w / 2, h / 2, w * 0.44, 0, TAU); g.stroke();
}

// ═══════════════════════════════════════════════════════════════════════════
// 3D MODELS
// ═══════════════════════════════════════════════════════════════════════════
function mesh(geo, mat, cast = true) { const m = new THREE.Mesh(geo, mat); m.castShadow = cast; m.receiveShadow = true; return m; }
function mergeGeos(list) {
  const out = []; let n = 0;
  for (const g0 of list) { const g = g0.index ? g0.toNonIndexed() : g0; out.push(g); n += g.attributes.position.count; }
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2); let o = 0;
  for (const g of out) { pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); if (g.attributes.uv) uv.set(g.attributes.uv.array, o * 2); o += g.attributes.position.count; }
  const m = new THREE.BufferGeometry(); m.setAttribute('position', new THREE.BufferAttribute(pos, 3)); m.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); m.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); return m;
}
// carved stone texture (shared look for the altar, the temple and the chamber walls)
function stoneTex(RC, w, h, base, seed, o = {}) {
  const c = canvas(w, h), g = c.getContext('2d'), r = rng(seed);
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  for (let i = 0; i < w * h / 60; i++) { g.fillStyle = 'rgba(' + (r() < 0.5 ? '0,0,0' : '255,255,255') + ',' + (0.03 + r() * 0.08) + ')'; g.beginPath(); g.arc(r() * w, r() * h, 1 + r() * 4, 0, TAU); g.fill(); }
  if (o.blocks) { g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = 2; const bh = o.blocks; for (let y = 0; y < h; y += bh) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); for (let x = ((y / bh) % 2) * bh; x < w; x += bh * 2) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + bh); g.stroke(); } } }
  if (o.glyphs) glyphRow(g, 8, h * 0.5, w - 8, o.glyphs, 'rgba(30,22,10,.7)', r);
  if (o.moss) for (let i = 0; i < o.moss; i++) { g.fillStyle = 'rgba(70,130,60,' + (0.2 + r() * 0.3) + ')'; g.beginPath(); g.ellipse(r() * w, h * 0.7 + r() * h * 0.3, 6 + r() * 14, 3 + r() * 6, 0, 0, TAU); g.fill(); }
  return RC.tex(c);
}
function stoneMat(RC, tex, o = {}) { return RC.mats.get('stone' + tex.id + JSON.stringify(o), () => new THREE.MeshStandardMaterial(Object.assign({ map: tex, roughness: 0.88, metalness: 0 }, o))); }
function goldMat(RC) { return RC.mats.get('goldIdol', () => new THREE.MeshStandardMaterial({ color: 0xf2c14e, metalness: 1, roughness: 0.3, emissive: 0xf2c14e, emissiveIntensity: 0, envMapIntensity: 1.2 })); }
// a small gold idol: squat body, big head, headdress, red eyes. Returns a group (origin at its feet).
function idolModel(RC, s = 1) {
  const g = new THREE.Group(), gold = goldMat(RC), parts = [latheGeo(0, 0, [[0, 0], [7, 0], [8, 3], [6, 9], [7, 13], [5, 16], [0, 17]], 14)];
  parts.push(new THREE.BoxGeometry(11, 9, 10).translate(0, 0, 22), new THREE.ConeGeometry(8, 8, 6).rotateX(PI / 2).translate(0, 0, 31));
  [-3, 3].forEach(x => parts.push(new THREE.BoxGeometry(3, 3, 10).translate(x * 3.2, -2, 10)));
  g.add(mesh(mergeGeos(parts), gold));
  const eyes = new THREE.Mesh(mergeGeos([new THREE.SphereGeometry(1.4, 8, 6).translate(-2.8, -4.6, 23), new THREE.SphereGeometry(1.4, 8, 6).translate(2.8, -4.6, 23)]), new THREE.MeshStandardMaterial({ color: '#300', emissive: '#ff3030', emissiveIntensity: 1.5 }));
  g.add(eyes); g.userData.eyes = eyes; g.scale.setScalar(s);
  return g;
}

// ── The idol chamber: a tilting stone deck with its maze, idol, torches and columns ──
function chamberModel(RC, maze) {
  const cx = maze.cx, cy = maze.cy, g = new THREE.Group(); g.position.set(cx, cy, MAZE_Z);
  const local = p => [p[0] - cx, p[1] - cy];
  const [x0, y0, x1, y1] = MAZE_BOX, w = x1 - x0, h = y1 - y0, k = 3;
  // the floor: painted flagstones, the idol's hole, carved channel lines, lettering
  const c = canvas(Math.round(w * k), Math.round(h * k)), gc = c.getContext('2d');
  gc.setTransform(k, 0, 0, -k, -x0 * k, y1 * k);
  gc.fillStyle = '#5c584a'; gc.fillRect(x0, y0, w, h);
  stoneFloor(gc, rng(7), x0, y0, x1, y1, 18, [120, 112, 92], 0.8);
  gc.fillStyle = 'rgba(70,130,60,.35)'; const rr = rng(9); for (let i = 0; i < 12; i++) { gc.beginPath(); gc.ellipse(x0 + rr() * w, y0 + rr() * h, 6 + rr() * 10, 3 + rr() * 5, 0, 0, TAU); gc.fill(); }
  const hole = gc.createRadialGradient(IDOL[0], IDOL[1], 0, IDOL[0], IDOL[1], 18); hole.addColorStop(0, '#000'); hole.addColorStop(0.75, '#050505'); hole.addColorStop(0.85, 'rgba(242,193,78,.8)'); hole.addColorStop(1, 'rgba(242,193,78,0)'); gc.fillStyle = hole; gc.beginPath(); gc.arc(IDOL[0], IDOL[1], 18, 0, TAU); gc.fill();
  const P = { ctx: gc, text(str, x, y, o = {}) { gc.save(); gc.translate(x, y); gc.scale(1, -1); gc.font = '700 ' + (o.size || 8) + 'px Cinzel, Georgia, serif'; gc.textAlign = 'center'; gc.textBaseline = 'middle'; gc.fillStyle = o.color || '#fff'; gc.fillText(str, 0, 0); gc.restore(); } };
  P.text('IDOL CHAMBER', 118, 990, { size: 8, color: 'rgba(242,193,78,.9)' });
  P.text('TILT WITH THE FLIPPERS', 118, 978, { size: 4.6, color: 'rgba(243,230,200,.75)' });
  glyphRow(gc, 44, 836, 196, 5, 'rgba(242,193,78,.5)', rng(21));
  const fg = new THREE.ShapeGeometry(shapeOf(MAZE_POLY.map(local))); const fp = fg.attributes.position, uv = new Float32Array(fp.count * 2);
  for (let i = 0; i < fp.count; i++) { uv[i * 2] = (fp.getX(i) + cx - x0) / w; uv[i * 2 + 1] = (fp.getY(i) + cy - y0) / h; } fg.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  const floor = new THREE.Mesh(fg, new THREE.MeshPhysicalMaterial({ map: RC.tex(c), roughness: 0.7, clearcoat: 0.25, clearcoatRoughness: 0.5 })); floor.receiveShadow = true; g.add(floor);
  // the slab under it and the carved walls (one stone mesh)
  const stoneT = stoneTex(RC, 512, 128, '#6a6456', 31, { blocks: 32, moss: 20 });
  const sm = stoneMat(RC, stoneT);
  const parts = [slabGeo(MAZE_POLY.map(local), -10, 10, { bevel: 1.5 }), latheGeo(IDOL[0] - cx, IDOL[1] - cy + 24, [[12, 0], [12, 36], [0, 44]], 10)];
  const walls = maze.walls.map(wp => wp.map(local));
  walls.forEach((wp, i) => { const geo = wallGeo(wp, i ? 6 : 7, 0, 16, { bevel: 1 }); if (geo) parts.push(geo); });
  const sw = mesh(mergeGeos(parts), sm); g.add(sw);
  // the hole's steel cup
  const cup = latheGeo(IDOL[0] - cx, IDOL[1] - cy, [[17, 0.3], [16, -4], [13, -18], [0, -20]], 20); g.add(mesh(cup, RC.mats.steel(), false));
  // the idol behind its hole, eyes glowing; a stone niche round it
  const idol = idolModel(RC, 1); idol.position.set(IDOL[0] - cx, IDOL[1] - cy + 22, 0); g.add(idol);
  // torches on the deck (bulbs do the light; these are the sticks and flames)
  const flames = [], sticks = [];
  [[76, 946], [190, 1000]].forEach(([x, y]) => { sticks.push(cylGeo(x - cx, y - cy, 2.2, 0, 24, 8), cylGeo(x - cx, y - cy, 3.4, 22, 27, 8)); const f = new THREE.PlaneGeometry(10, 18); f.rotateX(PI / 2); f.translate(x - cx, y - cy - 1, 34); flames.push(f); });
  g.add(mesh(mergeGeos(sticks), RC.mats.iron()));
  const fm = new THREE.Mesh(mergeGeos(flames), RC.mats.glow('#ffb45a')); fm.renderOrder = 8; g.add(fm);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  RC.root.add(g);
  // stone columns from the main floor up to the deck (static)
  const colT = stoneTex(RC, 128, 256, '#6a6456', 32, { blocks: 40 });
  [[80, 840], [190, 836], [150, 962], [186, 992]].forEach(([x, y]) => { RC.batch.add(stoneMat(RC, colT), cylGeo(x, y, 7, 0, MAZE_Z - 10, 10)); RC.batch.add(stoneMat(RC, colT), boxGeo(x, y, MAZE_Z - 9, 18, 18, 3)); RC.batch.add(stoneMat(RC, colT), boxGeo(x, y, 1.5, 18, 18, 3)); });
  RC.anim.push((dt, t) => {
    g.rotation.y = maze.tilt * 0.07;
    fm.material.opacity = (0.75 + 0.25 * Math.sin(t * 17) * Math.sin(t * 5.3)) * (1 - RC.G.dark * 0.3);
    const B = RC.G.b; idol.userData.eyes.material.emissiveIntensity = B && B.hunt === 4 ? 2 + 2 * Math.abs(Math.sin(t * 8)) : 1.2;
  });
  return null;
}
function shapeOf(poly) { const s = new THREE.Shape(); s.moveTo(poly[0][0], poly[0][1]); poly.slice(1).forEach(p => s.lineTo(p[0], p[1])); s.closePath(); return s; }

// ── The rope bridge: planks on two ropes, rope handrails with ties, anchor posts and wall brackets ──
function bridgeModel(RC, pts) {
  const n = pts.length, frames = [];
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    const t = V3(b[0] - a[0], b[1] - a[1], b[2] - a[2]).normalize();
    let side = V3(-t.y, t.x, 0); if (side.lengthSq() < 1e-6) side = V3(1, 0, 0); side.normalize();
    const up = V3().crossVectors(t, side).normalize(); if (up.z < 0) up.multiplyScalar(-1);
    frames.push({ p: V3(pts[i][0], pts[i][1], pts[i][2]), t, side, up });
  }
  const at = (i, lat, vert) => frames[i].p.clone().addScaledVector(frames[i].side, lat).addScaledVector(frames[i].up, vert);
  // planks
  const planks = [], m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), mrot = new THREE.Matrix4();
  let acc = 99;
  for (let i = 1; i < n; i++) {
    acc += frames[i].p.distanceTo(frames[i - 1].p); if (acc < 11) continue; acc = 0;
    const f = frames[i], geo = new THREE.BoxGeometry(34, 8.5, 2.2);
    mrot.makeBasis(f.side, f.t, f.up); q.setFromRotationMatrix(mrot); m4.compose(f.p.clone().addScaledVector(f.up, -0.4), q, new THREE.Vector3(1, 1, 1)); geo.applyMatrix4(m4); planks.push(geo);
  }
  const plankC = canvas(128, 64), pg = plankC.getContext('2d'); pg.fillStyle = '#6b4a2a'; pg.fillRect(0, 0, 128, 64); const pr = rng(44); for (let i = 0; i < 40; i++) { pg.strokeStyle = 'rgba(' + (pr() < 0.6 ? '30,18,8' : '140,100,60') + ',' + (0.2 + pr() * 0.4) + ')'; pg.lineWidth = 1 + pr() * 2; pg.beginPath(); pg.moveTo(0, pr() * 64); pg.lineTo(128, pr() * 64); pg.stroke(); }
  const pm = mesh(mergeGeos(planks), new THREE.MeshStandardMaterial({ map: RC.tex(plankC), roughness: 0.8 })); RC.root.add(pm);
  // ropes: two under the planks, two handrails; ties between them
  const ropeMat = RC.mats.get('rope', () => new THREE.MeshStandardMaterial({ color: '#a8865a', roughness: 0.95 }));
  const ropes = [], ties = [];
  for (const [lat, vert, r] of [[-14, -1.2, 1.4], [14, -1.2, 1.4], [-17, 13, 1.1], [17, 13, 1.1]]) { const ep = []; for (let i = 0; i < n; i++) { const v = at(i, lat, vert); ep.push([v.x, v.y, v.z]); } ropes.push(tubeGeo(ep, r, Math.max(12, n * 2), 6)); }
  acc = 99;
  for (let i = 1; i < n; i++) {
    acc += frames[i].p.distanceTo(frames[i - 1].p); if (acc < 24) continue; acc = 0;
    for (const s of [-1, 1]) { const a = at(i, s * 14, -1), b = at(i, s * 17, 13); const geo = new THREE.CylinderGeometry(0.55, 0.55, a.distanceTo(b), 5); const mid = a.clone().lerp(b, 0.5); const dir = b.clone().sub(a).normalize(); q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir); m4.compose(mid, q, new THREE.Vector3(1, 1, 1)); geo.applyMatrix4(m4); ties.push(geo); }
  }
  RC.root.add(mesh(mergeGeos(ropes.concat(ties)), ropeMat));
  // anchor posts at the mouth, a steel entry plate, and iron brackets from the right wall
  const B = RC.batch, wood = RC.mats.wood('#5a3a20', 'post');
  [[148, 598], [198, 598]].forEach(([x, y]) => { B.add(wood, cylGeo(x, y, 3.2, 30, 52, 8)); B.add(RC.mats.iron(), cylGeo(x, y, 3.8, 50, 53, 8)); });
  const f0 = frames[0], fp = at(0, 0, 0).addScaledVector(f0.t, -5);
  B.add(RC.mats.steel(), boxGeo(fp.x, fp.y, 0.4, 36, 12, 0.8, Math.atan2(f0.t.y, f0.t.x) - PI / 2));
  // stone pillars under the high part (they are physics pegs too, added in build)
  const colT = stoneTex(RC, 64, 128, '#6a6456', 33, { blocks: 30 });
  for (const [x, y] of [[204, 862], [240, 858], [292, 926]]) { let best = 0, bd = 1e9; for (let i = 0; i < n; i++) { const d = Math.hypot(pts[i][0] - x, pts[i][1] - y); if (d < bd) { bd = d; best = i; } } const z = pts[best][2] - 2; B.add(stoneMat(RC, colT), cylGeo(x, y, 3.2, 0, z, 8)); B.add(stoneMat(RC, colT), boxGeo(x, y, 1.5, 10, 10, 3)); }
  for (const y of [820, 640, 460]) { let best = 0, bd = 1e9; for (let i = 0; i < n; i++) { const d = Math.abs(pts[i][1] - y); if (d < bd) { bd = d; best = i; } } const p = pts[best]; B.add(RC.mats.iron(), tubeGeo([[478, y, 36], [470, y, p[2] - 4], [p[0] + 12, p[1], p[2] - 2]], 2, 6, 6)); }
  return null;
}

// ── The altar: a carved stone block on a column that rises, with the gold idol on top ──
function altarModel(RC, altar) {
  const [x0, y0, x1, y1] = ALTAR, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, w = x1 - x0, d = y1 - y0, H = 44;
  const g = new THREE.Group(); g.position.set(cx, cy, 0);
  const side = stoneTex(RC, 256, 128, '#6e6858', 51, { glyphs: 12, moss: 8 }), top = stoneTex(RC, 256, 256, '#7a7462', 52, { blocks: 64 });
  const block = mesh(mergeGeos([new THREE.BoxGeometry(w, d, H).translate(0, 0, H / 2), new THREE.BoxGeometry(w + 4, d + 4, 3).translate(0, 0, H - 1)]), stoneMat(RC, side));
  g.add(block);
  const sun = mesh(new THREE.TorusGeometry(12, 1.6, 6, 24), goldMat(RC)); sun.position.z = H + 0.8; g.add(sun);
  const idol = idolModel(RC, 0.9); idol.position.set(0, 2, H + 0.5); g.add(idol);
  // offering bowl at the front edge
  g.add(mesh(latheGeo(0, -d / 2 + 9, [[0, 0], [6, 0], [7, 3], [5, 4], [0, 4.5]], 12), RC.mats.brass()).translateZ(H));
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  RC.root.add(g);
  // the column it rides on (stretched with height) and the stone frame in the floor
  const col = mesh(new THREE.BoxGeometry(w - 8, d - 8, 1), stoneMat(RC, side)); col.position.set(cx, cy, 0); RC.root.add(col);
  RC.batch.add(stoneMat(RC, top), slabGeo([[x0 - 6, y0 - 6], [x1 + 6, y0 - 6], [x1 + 6, y1 + 6], [x0 - 6, y1 + 6]], 0, 2.5, { bevel: 0.8 }));
  RC.anim.push((dt, t) => {
    const z = altar.z; g.position.z = z; col.scale.z = Math.max(1, z); col.position.z = z / 2;
    const B = RC.G.b, hot = B && (B.city || B.cityLit);
    idol.userData.eyes.material.emissiveIntensity = hot ? 2.5 + 2 * Math.abs(Math.sin(t * 6)) : 1.2;
    goldMat(RC).emissiveIntensity = hot ? 0.25 + 0.2 * Math.sin(t * 6) : 0;
  });
  return null;
}

// ── The serpent: a cobra with a spread hood, a jaw that opens, eyes that follow the ball, a flicking tongue ──
function snakeModel(RC, toy) {
  const g = new THREE.Group();
  // scale texture: a diamond lattice of greens with a pale belly stripe
  const c = canvas(256, 256), gc = c.getContext('2d'), r = rng(61);
  gc.fillStyle = '#3f8a3a'; gc.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 14) for (let x = ((y / 14) % 2) * 9; x < 256; x += 18) { gc.fillStyle = 'rgba(' + (20 + r() * 40 | 0) + ',' + (90 + r() * 70 | 0) + ',' + (30 + r() * 30 | 0) + ',.9)'; gc.beginPath(); gc.moveTo(x, y); gc.lineTo(x + 9, y + 7); gc.lineTo(x, y + 14); gc.lineTo(x - 9, y + 7); gc.closePath(); gc.fill(); gc.strokeStyle = 'rgba(0,0,0,.35)'; gc.lineWidth = 1; gc.stroke(); }
  gc.fillStyle = 'rgba(230,220,150,.8)'; gc.fillRect(0, 200, 256, 56);
  const scaleT = RC.tex(c);
  const skin = new THREE.MeshPhysicalMaterial({ map: scaleT, bumpMap: scaleT, bumpScale: 0.6, roughness: 0.45, clearcoat: 0.5, clearcoatRoughness: 0.3 });
  // body: coiled behind the head (local -y), tail tip tucked
  const body = tubeGeo([[0, 10, 24], [0, -4, 22], [4, -22, 16], [14, -36, 10], [28, -46, 8], [36, -62, 8], [24, -80, 8], [8, -82, 8], [-2, -70, 8], [6, -58, 8]], 8.5, 70, 10);
  g.add(mesh(mergeGeos([body, tubeGeo([[0, -4, 22], [0, 2, 30], [0, 6, 38]], 7.5, 10, 10)]), skin));
  // hood: a flat spread shape behind the head, tilted back a little
  const hs = new THREE.Shape(); hs.moveTo(0, -4); hs.bezierCurveTo(-26, 0, -30, 26, -16, 40); hs.bezierCurveTo(-8, 46, 8, 46, 16, 40); hs.bezierCurveTo(30, 26, 26, 0, 0, -4);
  const hoodG = new THREE.ExtrudeGeometry(hs, { depth: 3, bevelEnabled: true, bevelThickness: 1, bevelSize: 1, bevelSegments: 2 });
  hoodG.rotateX(PI / 2 - 0.25); hoodG.translate(0, 1, 26);
  const hc = canvas(256, 256), hg = hc.getContext('2d'); hg.fillStyle = '#3a7a34'; hg.fillRect(0, 0, 256, 256); hg.fillStyle = '#e8d890'; hg.beginPath(); hg.ellipse(90, 130, 34, 40, 0, 0, TAU); hg.ellipse(166, 130, 34, 40, 0, 0, TAU); hg.fill(); hg.fillStyle = '#1a3a18'; hg.beginPath(); hg.ellipse(90, 130, 18, 24, 0, 0, TAU); hg.ellipse(166, 130, 18, 24, 0, 0, TAU); hg.fill(); hg.fillStyle = '#e8d890'; hg.fillRect(110, 110, 36, 8);
  const hood = mesh(hoodG, new THREE.MeshPhysicalMaterial({ map: RC.tex(hc), roughness: 0.5, clearcoat: 0.4, side: THREE.DoubleSide })); g.add(hood);
  // head and jaw
  const headG = new THREE.SphereGeometry(13, 20, 14); headG.scale(1, 1.35, 0.8);
  const head = mesh(headG, skin); head.position.set(0, 10, 40); g.add(head);
  const jp = new THREE.Group(); jp.position.set(0, 2, 32); g.add(jp);
  const jaw = mesh(new THREE.BoxGeometry(20, 24, 5), new THREE.MeshPhysicalMaterial({ color: '#c86060', roughness: 0.5, clearcoat: 0.6 })); jaw.position.set(0, 12, 0); jp.add(jaw);
  const fangs = mesh(mergeGeos([new THREE.ConeGeometry(1.4, 7, 6).rotateX(PI).translate(-6, 20, 32), new THREE.ConeGeometry(1.4, 7, 6).rotateX(PI).translate(6, 20, 32)]), RC.mats.plastic('#f4f0e0')); g.add(fangs);
  const tongue = mesh(new THREE.BoxGeometry(2, 14, 0.8), new THREE.MeshStandardMaterial({ color: '#c02030' })); tongue.position.set(0, 24, 36); g.add(tongue);
  // eyes: amber with slit pupils
  const eyes = [-6.5, 6.5].map(x => { const e = mesh(new THREE.SphereGeometry(3.4, 12, 8), new THREE.MeshStandardMaterial({ color: '#f2b544', emissive: '#f2b544', emissiveIntensity: 0.5, roughness: 0.25 })); e.position.set(x, 18, 46); g.add(e); const p = mesh(new THREE.BoxGeometry(1.2, 2, 3.6), RC.mats.plastic('#111')); p.position.set(0, 3, 0); e.add(p); return { e, p }; });
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  g.userData.pose = (k, look, t) => {
    const sh = toy.shake || 0; toy.shake = Math.max(0, sh - 0.016 * 0.9);
    jp.rotation.x = k * 0.85; tongue.visible = (t * 2.3) % 1 < 0.18 && k < 0.3; tongue.scale.y = 0.6 + 0.4 * Math.sin(t * 40);
    g.rotation.z = Math.sin(t * 38) * sh * 0.08; g.rotation.x = Math.sin(t * 30 + 1) * sh * 0.05;
    head.position.z = 40 + Math.sin(t * 1.3) * 1.2 + k * 2;
    const lx = look[0], ly = look[1], ang = Math.atan2(ly, lx) - (deg(SNAKE_FACE));   // look relative to the facing
    eyes.forEach(({ p }) => { p.position.x = Math.sin(ang) * -1.5; p.position.z = Math.cos(ang) * 1.2; });
  };
  return g;
}

// ── The temple: a stepped stone pyramid; its tiers crack and fall, revealing the idol inside ──
function templeModel(RC, toy) {
  const g = new THREE.Group(), pieces = [], rubble = [];
  const wallT = stoneTex(RC, 256, 128, '#7a7260', 71, { blocks: 24, glyphs: 10, moss: 10 }), topT = stoneTex(RC, 128, 128, '#8a8270', 72, { blocks: 32 });
  const sm = stoneMat(RC, wallT), tm = stoneMat(RC, topT);
  const tier = (w, d, h, y, z, tag) => { const m = mesh(new THREE.BoxGeometry(w, d, h), sm); m.position.set(0, y, z + h / 2); g.add(m); pieces.push({ m, z: z + h / 2, y, r: (Math.random() - 0.5) * 1.2, tag }); return m; };
  tier(60, 42, 30, 21, 0, 0);
  tier(46, 32, 24, 24, 30, 1);
  tier(30, 20, 20, 25, 54, 2);
  // steps up the front, the doorway, carved lintel
  { const sg = []; for (let i = 0; i < 5; i++) sg.push(new THREE.BoxGeometry(16, 4, 3).translate(0, -2 + i * 4, 3 + i * 5.5)); const s = mesh(mergeGeos(sg), tm); g.add(s); pieces.push({ m: s, z: 0, y: 0, r: 0.4, tag: 0 }); }
  const door = mesh(new THREE.BoxGeometry(14, 6, 18), RC.mats.paint('#050403', { roughness: 1 })); door.position.set(0, -0.5, 9); g.add(door); pieces.push({ m: door, z: 9, y: -0.5, r: 0, tag: 0 });
  const lintel = mesh(new THREE.BoxGeometry(20, 5, 4), goldMat(RC)); lintel.position.set(0, -0.8, 20); g.add(lintel); pieces.push({ m: lintel, z: 20, y: -0.8, r: 0.3, tag: 1 });
  // the idol inside (revealed when the walls fall)
  const idol = idolModel(RC, 1.1); idol.position.set(0, 18, 1); g.add(idol);
  // rubble that appears on collapse
  { const rg = [], rr = rng(73); for (let i = 0; i < 7; i++) rg.push(new THREE.DodecahedronGeometry(3 + rr() * 3).translate((rr() - 0.5) * 70, -8 - rr() * 10, 3)); const s = mesh(mergeGeos(rg), sm); s.scale.z = 0.01; g.add(s); rubble.push(s); }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  g.userData.pose = (stage, fall, wob, t) => {
    pieces.forEach((p, i) => {
      const gone = p.tag >= 1 ? fall : fall * 0.6;
      p.m.position.z = p.z - gone * (p.z + 8); p.m.position.y = p.y + gone * (p.tag === 2 ? 26 : p.tag === 1 ? 14 : 4);
      p.m.rotation.x = gone * p.r; p.m.rotation.y = Math.sin(t * 30 + i) * wob * 0.04;
      p.m.visible = gone < 0.98 || p.tag === 0;
      if (stage >= 2 && p.tag === 2) p.m.rotation.z = 0.08 + Math.sin(t * 2) * 0.02; else if (stage >= 1 && p.tag === 1) p.m.rotation.z = 0.05;
    });
    rubble.forEach(s => { s.scale.z = 0.01 + fall; s.visible = fall > 0.02; });
    idol.userData.eyes.material.emissiveIntensity = 1.2 + fall * 3 * Math.abs(Math.sin(t * 5));
    idol.position.z = 1 + fall * 6;
  };
  return g;
}

// ── Scenery: the caves in the left wall, torches, vines and leaves, the stone rim round the disc ──
function sceneryModel(RC) {
  const B = RC.batch, stoneT = stoneTex(RC, 256, 128, '#6a6456', 81, { blocks: 28, moss: 16 }), sm = stoneMat(RC, stoneT);
  // caves: a dark opening in the left wall with a stone lintel and jambs
  for (const y of [CAVE[1], BOULDER_Y]) {
    B.add(RC.mats.paint('#030302', { roughness: 1 }), boxGeo(3.5, y, 30, 12, 60, 58));
    B.add(sm, boxGeo(4, y, 68, 24, 84, 12));
    [-1, 1].forEach(s => B.add(sm, boxGeo(4, y + s * 38, 31, 18, 10, 62)));
  }
  // the gold rim and stone ring round the sacrificial disc
  B.add(sm, new THREE.TorusGeometry(46, 2.4, 8, 40).translate(DISC[0], DISC[1], 0.6));
  // wall torches: sticks on iron brackets, flame planes merged, flickering
  const flames = [];
  [[8, 760, 46], [477, 800, 46], [204, 1014, 70], [268, 1014, 70]].forEach(([x, y, z]) => {
    B.add(RC.mats.wood('#5a3a20', 'torch'), cylGeo(x, y, 2.4, z - 30, z - 6, 8)); B.add(RC.mats.iron(), cylGeo(x, y, 3.6, z - 8, z - 3, 8));
    if (z > 60) B.add(sm, cylGeo(x, y, 6, 0, z - 30, 10));
    const f = new THREE.PlaneGeometry(10, 18); f.rotateX(PI / 2); f.translate(x, y - 1, z + 5); flames.push(f);
  });
  const fm = new THREE.Mesh(mergeGeos(flames), RC.mats.glow('#ffb45a')); fm.renderOrder = 8; RC.root.add(fm);
  // vines hanging in from the corners and leaves on the rails
  const vineMat = RC.mats.get('vine', () => new THREE.MeshStandardMaterial({ color: '#3b6a2e', roughness: 0.9 }));
  const vines = [[[0, 1060, 120], [20, 1040, 90], [12, 1000, 70], [30, 960, 60]], [[520, 1060, 120], [500, 1040, 95], [506, 990, 75], [490, 950, 60]], [[300, 1060, 130], [312, 1050, 110], [296, 1040, 92]]];
  vines.forEach(v => B.add(vineMat, tubeGeo(v, 1.6, 12, 5)));
  const lc = canvas(128, 128), lg = lc.getContext('2d'); lg.clearRect(0, 0, 128, 128); leaves(lg, 64, 64, 110, 1, 1, 91);
  const leafMat = new THREE.MeshStandardMaterial({ map: RC.tex(lc), transparent: true, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.7 });
  const leafG = [];
  [[6, 1040, 100, 0.3], [22, 1010, 80, -0.6], [514, 1040, 100, 2.8], [498, 1000, 78, 3.6], [300, 1052, 118, 1.2], [320, 1046, 100, 2.1], [-6, 420, 60, 0.5], [526, 420, 60, 2.6], [-6, 880, 70, 0.9], [526, 880, 70, 2.3]].forEach(([x, y, z, a]) => {
    const p = new THREE.PlaneGeometry(28, 28); p.rotateX(PI / 2 - 0.5); p.rotateZ(a); p.translate(x, y, z); leafG.push(p);
  });
  RC.root.add(new THREE.Mesh(mergeGeos(leafG), leafMat));
  RC.anim.push((dt, t) => { fm.material.opacity = (0.75 + 0.25 * Math.sin(t * 17) * Math.sin(t * 5.3)) * (1 - RC.G.dark * 0.3); });
  return null;
}
function torchFlicker(RC, t) {
  const G = RC.G, gi = RC.lights.gi;
  gi.forEach((l, i) => { l.intensity = l.userData.base * (0.82 + 0.18 * Math.sin(t * (11 + i)) * Math.sin(t * 4.7 + i * 2)) * (1 - G.dark) * (G.tilted ? 0.15 : 1); });
}
