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
