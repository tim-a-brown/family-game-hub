// ═══════════════════════════════════════════════════════════════════════════
// PIRATE'S COVE
// A sunset cove: weathered deck planks, teal water, brass and rope. A galleon
// sits at anchor on the right with a SHIP'S CANNON on its deck: ride the plank
// ramp aboard, hold a flipper to swing the gun, let go to fire the ball across
// the water at the FORT on the island (drawbridge, pop-up palisade targets,
// and after enough hits the whole fort collapses). The KRAKEN rises from the
// lagoon, wraps the ball in a tentacle and drags it under to the treasure
// chest (lock). A WHIRLPOOL disc under the top lanes, a SHIP'S-WHEEL spinner,
// a rigging wireform across the top, a talking captain and his parrot, and a
// STORM with rain on the glass. Wizard mode: DAVY JONES.
// ═══════════════════════════════════════════════════════════════════════════
import * as THREE from 'three';
import { BR, spline, deg } from '../physics.js';
import { canvas, rng, shade, rgba, latheGeo, cylGeo, tubeGeo, boxGeo, offsetLine, wallGeo, slabGeo } from '../gfx.js';
import { audio } from '../engine.js';

const PI = Math.PI, TAU = PI * 2;
const PAL = { teal: '#1f8f9a', deep: '#0d3c48', foam: '#cfeef0', sand: '#d8b57a', wood: '#5a3a1e', plank: '#8a6238', brass: '#e2b45a', rope: '#b89463', sunset: '#ff9a4a', red: '#c8352e', ink: '#1e1208', gold: '#ffd166', storm: '#9fd8ff' };
const fmt = n => Math.round(n).toLocaleString('en-US');
const pick = a => a[Math.floor(Math.random() * a.length)];

// ── Layout anchors ─────────────────────────────────────────────────────────
const DECK_Z = 46;
const HULL = [[330, 662], [330, 700], [332, 790], [342, 840], [360, 868], [392, 878], [418, 862], [426, 840], [426, 662]];
const DECK_POLY = [[337, 670], [337, 700], [339, 788], [348, 834], [364, 860], [392, 870], [414, 856], [420, 836], [420, 670]];
const CANNON = [376, 768];
const FORT = { x: 158, y: 912, face: 290 };          // centre and the way it faces
const KRAKEN = { mx: 292, my: 588, rx: 314, ry: 606 }; // magnet and the head (the rock the ball bounces off)
const CHEST = { x: 138, y: 760, w: 60, d: 44 };
const WHIRL = [262, 880];
const HARBOUR = [58, 452];
const PORTS = ['PORT MARROW', 'SKULL BAY', 'SALT HARBOUR', 'BLACKREEF'];
const PORT_SHOTS = [['orbitL', 'orbitR', 'spinner'], ['plank', 'fort', 'rigging'], ['rigging', 'orbitL', 'kegs'], ['whirl', 'fort', 'orbitR']];
const rot = (cx, cy, a, x, y) => [cx + Math.cos(a) * x - Math.sin(a) * y, cy + Math.sin(a) * x + Math.cos(a) * y];
// the fort in world space: local (x right, y forward = towards the player) rotated so local -y faces FORT.face
const FORT_ROT = deg(FORT.face) + PI / 2;
const fortPt = (x, y) => rot(FORT.x, FORT.y, FORT_ROT, x, y);
const FORT_BLOCK = [fortPt(-52, 46), fortPt(38, 40), fortPt(52, -26), fortPt(-52, -26)];
const CHEST_BOX = [[CHEST.x - CHEST.w / 2, CHEST.y - CHEST.d / 2], [CHEST.x - CHEST.w / 2, CHEST.y + CHEST.d / 2], [CHEST.x, CHEST.y + CHEST.d / 2 + 12], [CHEST.x + CHEST.w / 2, CHEST.y + CHEST.d / 2], [CHEST.x + CHEST.w / 2, CHEST.y - CHEST.d / 2]];   // peaked back: nothing rests on the lid
const NO_LAND = [HULL, FORT_BLOCK, CHEST_BOX];

export default {
  id: 'pirate', name: "Pirate's Cove", short: 'PIRATE', diff: 3, color: '#fbbf24', wizard: 'Davy Jones',
  desc: 'Fire the galleon\'s cannon at the fort, feed the Kraken, ride out the storm.',
  intro: 'ALL HANDS ON DECK',
  display: { type: 'lcd', ink: '#2a1608', ink2: '#8a4a18', bg: lcdBg, font: 'Cinzel, Georgia, serif' },
  msgStyle: 'zoom',
  music: { url: '../sounds/pinball/pirate.mp3', samples: 983040, rate: 32000 },
  speech: { pitch: 0.7, rate: 0.92, voice: 'Daniel|Fred|Male|Google UK English Male' },
  rulesHtml:
    '<p>A sunset cove with a galleon at anchor, a fort on the island and something large in the lagoon.</p><ul>' +
    '<li><b>The cannon:</b> shoot the plank ramp on the right to roll aboard the galleon. The ball loads the ship\'s cannon: <b>hold a flipper button</b> to swing the gun, <b>let go to fire</b> (or tap FIRE). Aim at the fort.</li>' +
    '<li><b>The fort:</b> three hits lower the drawbridge and raise the palisade targets. Knock the palisade down and the keep opens: shoot inside to start <b>Broadside</b>. Every fort hit in Broadside is worth a cannon jackpot, and three cannon hits bring the fort down for 300,000 and an extra ball.</li>' +
    '<li><b>The Kraken:</b> spell S-E-A on the lagoon targets and the Kraken wakes. Roll past the rock and a tentacle grabs the ball and drags it under to the treasure chest. Three balls in the chest start <b>Kraken Multiball</b>: ramps and orbits are jackpots, then the Kraken itself is the super jackpot.</li>' +
    '<li><b>Plunder ports:</b> knock down the M-A-P drop targets to light Plunder at the harbour scoop (bottom left). Each port lights three shots for 35 seconds; make all three to plunder it. Four ports on the map.</li>' +
    '<li><b>The storm:</b> roll through the whirlpool under the top lanes five times and the sky breaks: rain, lightning, the whirlpool spins and everything scores double for 30 seconds.</li>' +
    '<li><b>Top lanes:</b> A-R-R raises the bonus multiplier; the flippers move the lit lane. Lighting all three the second time lights the lifeboat kickback on the right outlane. The ship\'s wheel spinner on the right orbit pays doubloons.</li>' +
    '<li><b>Davy Jones:</b> plunder all four ports, win Kraken Multiball, take the fort and survive the storm to light the compass, then shoot the harbour: four balls, sixty seconds, every shot a jackpot and the Kraken a 300,000 super.</li></ul>',
  theme: {
    playfield: '#163b44', cabinet: '#2a1a10', wood: '#4a2e18', rails: 'gold', rubber: '#1a1414', postColor: '#d9c8a0', postRubber: '#2a1a14',
    flipper: '#e8dcc0', flipperRubber: '#b3302a', flipperStripe: '#6a1a16', popBody: '#4a2e18', apron: '#3a2416', slingPlastic: '#2a1810',
    gi: ['#ffc070', '#ffb860', '#ffc070', '#ffb860', '#ffd090', '#ff9a4a'], giPos: [[34, 250, 150], [440, 250, 150], [30, 640, 160], [470, 720, 160, 0.8], [243, 900, 150, 0.9], [380, 880, 120, 0.6]], giLevel: 1.1,
    env: ['#ffb070', '#2fc0c8', '#ff7a40'], sky: '#9ad0d8', keyColor: '#fff0da', key: 1.0, ambient: 0.34, exposure: 1.05, bloom: 0.55,
    spark: '#ffd090', room: '#07060a', darkLight: '#fff0d0', lampGain: 3.4, button: '#e2b45a', knob: '#d9c8a0'
  },
  art: { playfield: paintPlayfield, backglass: paintBackglass, apron: paintApron, sides: paintSides, backboard: paintBackboard, sling: slingArt },
  fit: { top: 125, lookY: 0.47 },
  anims: lcdAnims(),
  build,
  rules: makeRules()
};

// ═══════════════════════════════════════════════════════════════════════════
// BUILD
// ═══════════════════════════════════════════════════════════════════════════
function build(T) {
  const W = T.W, L = T.L, G = T.G;
  defineSounds();
  T.shooter({ min: 700, max: 3900 });
  T.lower({ flipColor: '#e8dcc0', flipRubber: '#b3302a', bxColor: '#ffc83d', saveColor: '#ff4058', extraColor: '#ff9a40', bxY: 302 });

  // ── Left side: orbit lane, harbour scoop, lifeboat kickback ──
  T.wall([[2, 612], [6, 588], [16, 570], [32, 558], [52, 552]], { style: 'wood', r: 4, h: 34, color: '#5a3a1e' });
  T.post(54, 552, { style: 'rubber', r: 5 });
  T.wall([[64, 604], [64, 840]], { style: 'metal', h: 26 });
  T.post(64, 601, { style: 'rubber', r: 5 });
  T.orbit({ id: 'orbitL', a: [8, 660, 62, 660], dirA: [0, 1], b: [430, 660, 478, 660], dirB: [0, -1] });
  T.orbit({ id: 'orbitR', a: [430, 660, 478, 660], dirA: [0, 1], b: [8, 660, 62, 660], dirB: [0, -1] });
  T.scoop({ id: 'harbour', x: HARBOUR[0], y: HARBOUR[1], r: 12, eject: { angle: 300, speed: 1300 }, hold: 1.0 });
  T.wall([[75, 462], [40, 500], [2, 548]], { style: 'wood', r: 4, h: 30, color: '#5a3a1e' });   // the quay walls seal the chute behind the scoop
  T.wall([[41, 442], [60, 396], [96, 372]], { style: 'wood', r: 4, h: 30, color: '#5a3a1e' });
  T.kickback({ id: 'lifeboat', x: 458, y: 205, power: 2300, label: 'LIFEBOAT', color: '#7fd4ff' });

  // ── Right side: ship's wheel orbit lane, the galleon, the plank ramp, M-A-P drops ──
  T.wall([[478, 612], [474, 588], [464, 572], [448, 562], [432, 558]], { style: 'wood', r: 4, h: 34, color: '#5a3a1e' });
  T.post(432, 556, { style: 'rubber', r: 5 });
  T.spinner({ id: 'spinner', x: 452, y: 612, w: 44, angle: 90, label: '', color: '#d8b26a', art: wheelArt });
  T.wall([[468, 404], [468, 548]], { style: 'wood', r: 4, h: 34, color: '#5a3a1e' });
  T.dropTargetBank({ id: 'map', x: 454, y: 470, angle: 180, n: 3, w: 22, gap: 4, labels: ['M', 'A', 'P'], color: '#e8d6a8', ink: '#3a2010' });
  ['m0', 'm1', 'm2'].forEach((id, i) => T.insert(id, 428, 444 + i * 26, { shape: 'rect', w: 11, h: 16, round: 3, color: '#ffd27a' }));
  // hull: a solid toy on the main floor (the deck is raised on top of it)
  const hullOwner = { onContact(b, c, imp) { if (imp > 250) G.emit('hullHit', 'hull', b, { imp }); } };
  T.wall(HULL, { style: 'invisible', mat: 'wood', r: 3, owner: hullOwner, id: 'hull' });
  T.wall([[330, 662], [368, 662]], { style: 'invisible', mat: 'wood', r: 3 });
  T.wall([[416, 662], [426, 662]], { style: 'invisible', mat: 'wood', r: 3 });
  T.ao({ kind: 'poly', pts: HULL, a: 0.6, blur: 12 });
  T.miniField({ id: 'deck', z: DECK_Z, box: [336, 668, 422, 872], poly: DECK_POLY, floor: '#6a4826', paint: paintDeck, legs: [], walls: false });
  T.world.levels.deck.noDrain = true;
  // the plank ramp: a wooden gangway climbing into the stern, hands the ball to the cannon
  T.ramp({ id: 'plank', style: 'plastic', w: 44, color: '#8a6238', opacity: 0.92, edge: '#c89a5a', wallH: 16, entryMin: 160, to: 'cannon', lvl: 'main', supports: false,
    pts: [[392, 612, 0], [392, 640, 4], [391, 680, 18], [388, 722, 36], [384, 752, DECK_Z], [380, 764, DECK_Z]] });
  T.post(368, 634, { style: 'rubber', r: 5 }); T.post(416, 626, { style: 'rubber', r: 5 });
  T.wall([[416, 626], [426, 619]], { style: 'metal', h: 24 });
  T.wall([[426, 619], [426, 662]], { style: 'metal', h: 26 });
  T.comp(new ShipCannon(T, { id: 'cannon', x: CANNON[0], y: CANNON[1], lvl: 'deck', rest: 150, min: 126, max: 176, power: 900, range: 180, flight: 0.5, barrel: 42 }));

  // ── Centre: the lagoon (Kraken), the whirlpool under the top lanes ──
  const rock = { onContact(b, c, imp) { if (imp > 150) { G.sfx('splash', { vol: 0.35 + 0.4 * Math.min(1, imp / 1500), x: b.x }); G.emit('rockHit', 'rock', b, { imp }); } } };
  T.world.circ(KRAKEN.rx, KRAKEN.ry, 15, { mat: 'toy', owner: rock, id: 'rock' });
  T.ao({ kind: 'dot', x: KRAKEN.rx, y: KRAKEN.ry, r: 22, a: 0.6, blur: 10 });
  T.magnet({ id: 'kraken', x: KRAKEN.mx, y: KRAKEN.my, r: 42, strength: 7500, active: false, manual: true, event: 'kraken' });
  ['S', 'E', 'A'].forEach((ch, i) => T.standupTarget({ id: 'sea' + i, x: 258 + i * 30, y: 672 + (i === 1 ? 8 : 0), angle: 270, w: 20, label: ch, color: '#2fc0c8' }));
  T.wall([[244, 690], [290, 704], [330, 716]], { style: 'wood', r: 4, h: 26, color: '#3a5a58' });   // the reef behind the targets, sealed to the hull (nothing rests on their backs)
  [0, 1, 2].forEach(i => T.insert('seal' + i, 258 + i * 30, 648 + (i === 1 ? 8 : 0), { shape: 'circle', r: 6.5, color: '#7fe8f0', text: 'SEA'[i], size: 7 }));
  T.spinningDisc({ id: 'whirl', x: WHIRL[0], y: WHIRL[1], r: 46, speed: 9, grip: 4.5, on: false, art: whirlArt, color: '#1a6a74' });
  T.world.sensor({ kind: 'circle', x: WHIRL[0], y: WHIRL[1], r: 28, owner: { onSensor(b) { G.emit('whirl', 'whirl', b); } }, id: 'whirl' });
  T.subway({ id: 'deep', hole: false, delay: 1.1, to: { comp: 'chest' }, event: 'deep' });

  // ── The treasure chest (ball lock) ──
  T.wall(CHEST_BOX, { style: 'invisible', mat: 'wood', r: 3, closed: true });
  [CHEST_BOX[0], CHEST_BOX[1], CHEST_BOX[3], CHEST_BOX[4]].forEach(p => T.post(p[0], p[1], { style: 'rubber', r: 5 }));
  T.ao({ kind: 'poly', pts: CHEST_BOX.slice(0, 2).concat(CHEST_BOX.slice(3)), a: 0.55, blur: 10 });
  T.ballLock({ id: 'chest', slots: [[CHEST.x - 14, CHEST.y - 6, 3], [CHEST.x + 14, CHEST.y - 6, 3], [CHEST.x, CHEST.y + 8, 20]], hidden: false, exit: { x: CHEST.x, y: CHEST.y - 44, vx: 0, vy: -380 } });

  // ── The fort on its island (upper left) ──
  T.wall([FORT_BLOCK[0], FORT_BLOCK[1], FORT_BLOCK[2]], { style: 'invisible', mat: 'wood', r: 3 });   // back and right side
  T.wall([FORT_BLOCK[3], FORT_BLOCK[0]], { style: 'invisible', mat: 'wood', r: 3 });                  // left side
  T.wall([FORT_BLOCK[2], fortPt(36, -26)], { style: 'invisible', mat: 'wood', r: 3 });               // front corners
  T.wall([fortPt(-36, -26), FORT_BLOCK[3]], { style: 'invisible', mat: 'wood', r: 3 });
  T.ao({ kind: 'poly', pts: FORT_BLOCK, a: 0.6, blur: 12 });
  T.post(FORT_BLOCK[1][0], FORT_BLOCK[1][1], { style: 'rubber', r: 5, draw: false });
  T.comp(new Fort(T, { id: 'fort' }));
  T.scoop({ id: 'keep', x: FORT.x, y: FORT.y + 2, r: 11, hood: false, hold: 1.2, eject: { angle: 290, speed: 1250 }, spread: 4 });
  T.popUpTargets({ id: 'palisade', color: '#7a5a34', targets: [0, 1, 2].map(i => { const p = fortPt(-30 + i * 30, -58); return { x: p[0], y: p[1], angle: FORT.face, w: 22 }; }) });
  [0, 1, 2].forEach(i => { const p = fortPt(-30 + i * 30, -82); T.insert('pal' + i, p[0], p[1], { shape: 'triangle', w: 11, h: 11, rot: FORT.face - 270, color: '#ffb060' }); });

  // ── Top: powder kegs (pops) upper right, A-R-R lanes ──
  [['keg1', 362, 908], ['keg2', 412, 950]].forEach(([id, x, y]) => T.popBumper({ id, x, y, r: 21, color: '#ffb060', skirt: '#c8743a', body: '#4a2e18', capArt: kegCap, kick: 1200 }));
  [['laneA', 244], ['laneR1', 284], ['laneR2', 324]].forEach(([id, x], i) => T.rolloverLane({ id, x, y: 992, r: 11, color: '#ffb060', lampDy: -30, shape: 'circle', lampR: 8, text: 'ARR'[i], textSize: 9 }));
  [224, 264, 304, 344].forEach(x => { T.wall([[x, 976], [x, 1012]], { style: 'metal', h: 22 }); T.post(x, 976, { style: 'metal', r: 3 }); });

  // ── The rigging: an iron wireform from the left, over the top, down to the right inlane ──
  T.ramp({ id: 'rigging', style: 'wire', wireMat: 'iron', w: 40, exitLvl: 'main', entryMin: 150, minExit: 300, supports: false,
    pts: [[100, 598, 0], [100, 624, 4], [97, 654, 16], [90, 684, 30], [68, 724, 42], [44, 770, 50], [34, 830, 58], [34, 900, 68], [50, 970, 78], [100, 1020, 84], [200, 1040, 88], [320, 1038, 86], [420, 1012, 80], [466, 960, 72], [472, 880, 64], [468, 760, 56], [462, 640, 46], [456, 520, 38], [444, 430, 28], [430, 370, 16], [424, 346, 10]] });
  T.wall([[64, 604], [80, 598]], { style: 'metal', h: 24 });
  T.post(122, 592, { style: 'rubber', r: 5 });

  // ── Inserts ──
  const ins = (id, x, y, o) => T.insert(id, x, y, o);
  ins('arrOrbL', 34, 740, { shape: 'arrow', w: 16, h: 28, color: '#7fe8f0', label: 'THE COVE', ly: -22, labelSize: 5.5 });
  ins('arrRig', 100, 560, { shape: 'arrow', w: 18, h: 30, rot: 2, color: '#ffb060', label: 'RIGGING', ly: -24, labelSize: 6 });
  ins('arrPlank', 392, 576, { shape: 'arrow', w: 18, h: 30, color: '#ffd166', label: 'PLANK', ly: -24, labelSize: 6 });
  ins('arrOrbR', 452, 560, { shape: 'arrow', w: 16, h: 26, color: '#7fe8f0', label: 'THE WHEEL', ly: -21, labelSize: 5.5 });
  ins('arrFort', fortPt(0, -104)[0], fortPt(0, -104)[1], { shape: 'arrow', w: 18, h: 30, rot: FORT.face - 270, color: '#ff8a40' });
  ins('krakenL', KRAKEN.mx, KRAKEN.my, { shape: 'ring', r: 20, ring: 4, color: '#5fe8d0' });
  ins('harbourL', 96, 424, { shape: 'oval', w: 32, h: 16, rot: -30, color: '#ffd166', text: 'HARBOUR', size: 5.2 });
  ins('plunderL', 118, 456, { shape: 'oval', w: 30, h: 14, rot: -30, color: '#ff8a40', text: 'PLUNDER', size: 5 });
  PORTS.forEach((p, i) => ins('port' + i, 150 + i * 62, 300 + (i === 1 || i === 2 ? 8 : 0) + 42, { shape: 'circle', r: 7, color: ['#ffb060', '#7fe8f0', '#ffd166', '#ff6a6a'][i], label: p, ly: 11, labelSize: 4.6 }));
  ins('stormL', 262, 826, { shape: 'oval', w: 30, h: 14, color: '#9fd8ff', text: 'STORM', size: 6 });
  [0, 1, 2, 3, 4].forEach(i => ins('whirl' + i, 262 + Math.cos(deg(90 + i * 72)) * 56, 880 + Math.sin(deg(90 + i * 72)) * 56, { shape: 'circle', r: 5, color: '#9fd8ff' }));
  ins('broadL', 300, 735, { shape: 'oval', w: 34, h: 15, rot: 12, color: '#ff8a40', text: 'BROADSIDE', size: 5 });
  ins('mbL', 186, 735, { shape: 'diamond', w: 14, h: 14, color: '#ff4058' });
  ins('ebL', 162, 520, { shape: 'diamond', w: 14, h: 14, color: '#ff9a40' });
  ['PORTS', 'KRAKEN', 'FORT', 'STORM'].forEach((n, i) => { const a = deg(90 - i * 90); ins('comp' + i, 243 + Math.cos(a) * 30, 426 + Math.sin(a) * 30, { shape: 'diamond', w: 11, h: 15, rot: -i * 90, color: '#ffd166', label: n, labelSize: 4.5, ly: i === 0 ? 12 : i === 2 ? -12 : 0, lx: i === 1 ? 20 : i === 3 ? -22 : 0 }); });
  ins('davyL', 243, 426, { shape: 'star', w: 18, h: 18, color: '#ff6a6a' });
  T.flasher('flFort', fortPt(-40, 30)[0], fortPt(-40, 30)[1], { color: '#ff8a40', r: 9, z0: 6 });
  T.flasher('flShip', 400, 690, { color: '#ffd090', r: 9, z0: DECK_Z });
  T.bulb('flKrak', 232, 548, 14, { color: '#5fe8d0', r: 3, k: 6 });
  T.flasher('flTop', 110, 1030, { color: '#9fd8ff', r: 10, z0: 40 });
  // lanterns (GI bulbs) on posts round the cove
  [[14, 360], [14, 520], [470, 360], [470, 530], [18, 860], [120, 1040], [300, 1042], [470, 1000], [300, 560]].forEach((p, i) => T.bulb('lant' + i, p[0], p[1], 30, { color: '#ffc070', r: 3, k: 3.2, on: 1 }));
  T.bulb('sternLamp', 338, 668, DECK_Z + 30, { color: '#ffb860', r: 2.6, k: 5, on: 1 });
  T.bulb('lighthouse', 470, 1050, 150, { color: '#fff4d0', r: 4, k: 7, on: 1 });

  // ── Scenery ──
  T.model(RC => galleonModel(RC));
  T.model(RC => chestModel(RC));
  T.model(RC => krakenModel(RC));
  T.model(RC => sceneryModel(RC));
  T.model(RC => rainModel(RC));
}

// ═══════════════════════════════════════════════════════════════════════════
// CUSTOM COMPONENTS (table-local; engine gaps noted in the report)
// ═══════════════════════════════════════════════════════════════════════════
// Ship's cannon on the raised deck: a ramp hands it the ball; HOLD a flipper to swing the gun (L = left, R = right),
// RELEASE to fire; FIRE button / launch also fires. The ball leaves airborne and lands on the main floor; the flight
// is shortened when it would land inside a solid block (hull, fort, chest).
class ShipCannon {
  constructor(T, o) {
    this.T = T; this.G = T.G; this.world = T.world; this.o = o; this.id = o.id; this.lvl = o.lvl || 'main'; this.z0 = T.levels[this.lvl].z;
    this.x = o.x; this.y = o.y; this.a = deg(o.rest); this.aMin = deg(o.min); this.aMax = deg(o.max);
    this.ball = null; this.loadT = 0; this.rot = 0; this.recoil = 0; this.heldSide = null; this.smoke = 0; this.lit = 0;
  }
  receive(b) {
    if (this.ball || this.flight) { this.world.airborne(b, 326, 700, this.z0, -500, -300, 0, 'main'); b.noPath = 0.4; return; }
    this.ball = b; this.world.hold(b, this, {}); b.hidden = false; this.loadT = 0; this.a = deg(this.o.rest);
    this.G.sfx('clank', { vol: 0.7, x: this.x }); this.G.sfx('creak', { vol: 0.35, x: this.x }); this.G.cannon = this; this.G.emit('cannonLoad', this.id, b);
  }
  stepHeld(b, dt, h) {
    const F = this.flight;
    if (F && F.b === b) {
      F.t += dt; const k = Math.min(1, F.t / F.T);
      b.x = F.x0 + (F.x1 - F.x0) * k; b.y = F.y0 + (F.y1 - F.y0) * k; b.z = F.z0 * (1 - k) + F.apex * 4 * k * (1 - k);
      if (k >= 1) { this.flight = null; this.world.release(b, F.x1, F.y1, Math.cos(F.a) * F.sp, Math.sin(F.a) * F.sp, 'main'); b.noPath = 0.3; b.noCap.plank = this.world.time + 1; this.G.sfx('land', { vol: 0.8, x: F.x1 }); this.G.sfx('splash', { vol: 0.5, x: F.x1 }); if (this.T.R) this.T.R.burst(F.x1, F.y1, 4, 12, 300, '#bfe8f0'); this.G.emit('cannonLand', this.id, b); }
      return;
    }
    const L = this.o.barrel - 14; b.x = this.x + Math.cos(this.a) * L * 0.4; b.y = this.y + Math.sin(this.a) * L * 0.4; b.z = this.z0 + 8;
  }
  onFlip(side, on) {
    if (!this.ball) return;
    if (on) { this.heldSide = side; this.rot = side === 'L' ? 1 : -1; }
    else if (side === this.heldSide) { this.heldSide = null; this.rot = 0; if (this.loadT > 0.35) this.fire(); }
  }
  onFire() { if (!this.ball) return false; this.fire(); return true; }
  landing(sp, vz) {
    // where an airborne ball starting at the muzzle comes to rest on the floor: the first landing plus the one
    // bounce the engine gives a hard landing (0.28 of the vertical speed)
    const h = this.z0 + 20, g = 9810 * Math.cos(6.5 * PI / 180);
    const t1 = (vz + Math.sqrt(vz * vz + 2 * g * h)) / g, vl = vz - g * t1;
    const t = t1 + (vl < -350 ? 2 * (-vl * 0.28) / g : 0);
    const mx = this.x + Math.cos(this.a) * this.o.barrel, my = this.y + Math.sin(this.a) * this.o.barrel;
    return [mx + Math.cos(this.a) * sp * t, my + Math.sin(this.a) * sp * t - 0.5 * 1111 * t * t, t];
  }
  fire() {
    const b = this.ball; if (!b) return; this.ball = null; this.rot = 0; this.heldSide = null; if (this.G.cannon === this) this.G.cannon = null;
    const sp = this.o.power, mx = this.x + Math.cos(this.a) * this.o.barrel, my = this.y + Math.sin(this.a) * this.o.barrel;
    // the landing point: `range` along the aim, pulled back until it is clear of every solid block and the walls
    let D = this.o.range, x1, y1;
    for (let i = 0; i < 8; i++) { x1 = mx + Math.cos(this.a) * D; y1 = my + Math.sin(this.a) * D; if (D < 70 || !NO_LAND.some(poly => inPoly(x1, y1, poly)) && Math.hypot(x1 - 260, y1 - 802) < 236 && x1 > 24 && x1 < 410) break; D -= 18; }
    this.flight = { b, t: 0, T: this.o.flight || 0.5, x0: mx, y0: my, z0: this.z0 + 20, x1, y1, apex: 40, a: this.a, sp };
    this.world.hold(b, this, {}); b.hidden = false;
    this.recoil = 1; this.smoke = 1;
    this.G.sfx('cannon', { vol: 1, x: this.x }); this.G.shake(1.6); this.G.haptic('heavy'); this.G.flash('#ffd090', 0.35);
    if (this.T.R) { this.T.R.burst(mx, my, this.z0 + 24, 30, 600, '#ffd090'); this.T.R.flashLight(mx, my, this.z0 + 40, '#ffb060', 2.2); }
    this.G.emit('cannonFire', this.id, b, { angle: this.a * 180 / PI });
  }
  trigger() { const b = this.world.addBall(this.x, this.y, { lvl: this.lvl }); this.receive(b); }
  onTilt() { if (this.ball) this.fire(); }
  get busy() { return !!(this.ball || this.flight); }
  update(dt) {
    if (this.flight && this.flight.b.removed) this.flight = null;
    if (this.ball) {
      if (this.ball.removed) { this.ball = null; if (this.G.cannon === this) this.G.cannon = null; }
      else { this.loadT += dt; this.a = Math.max(this.aMin, Math.min(this.aMax, this.a + this.rot * 1.5 * dt)); if (this.loadT > 5.5) this.fire(); }
    }
    this.recoil = Math.max(0, this.recoil - dt * 3); this.smoke = Math.max(0, this.smoke - dt * 0.8);
    this.lit += ((this.ball ? 1 : 0) - this.lit) * Math.min(1, dt * 5);
  }
  mesh(RC) {
    const z = this.z0, g = new THREE.Group(); g.position.set(this.x, this.y, z);
    const brass = RC.mats.brass(), wood = RC.mats.wood('#4a2c14', 'carriage'), iron = RC.mats.iron();
    // carriage: two cheeks, an axle and four wheels, all turning with the gun
    const turret = new THREE.Group(); turret.position.z = 1; g.add(turret);
    const L = this.o.barrel, woodG = [], brassG = [];
    [-7, 7].forEach(y => woodG.push(new THREE.BoxGeometry(L * 0.55, 3.5, 11).translate(L * 0.1, y, 7.5)));
    [[-4, -9], [-4, 9], [L * 0.28, -9], [L * 0.28, 9]].forEach(([x, y]) => woodG.push(new THREE.CylinderGeometry(4, 4, 2.4, 14).translate(x, y, 4)));
    const barrelG = latheGeo(0, 0, [[0, -L * 0.45], [6.5, -L * 0.45], [6.8, -L * 0.3], [5.6, -L * 0.05], [5.2, L * 0.3], [6.2, L * 0.46], [6.2, L * 0.55], [3.6, L * 0.55], [3.6, L * 0.4], [0, L * 0.4]], 18);
    barrelG.rotateX(-PI / 2); barrelG.rotateZ(-PI / 2); barrelG.translate(L * 0.35, 0, 14);   // lathe runs along +x after this
    brassG.push(barrelG, new THREE.SphereGeometry(3.4, 10, 8).translate(-L * 0.12, 0, 14));
    [-5, 5].forEach(y => brassG.push(new THREE.CylinderGeometry(1.6, 1.6, 4, 8).rotateX(PI / 2).translate(L * 0.1, y * 1.6, 14)));
    turret.add(mesh(mergeGeos(woodG), wood)); turret.add(mesh(mergeGeos(brassG), brass)); void iron;
    // muzzle glow (a plane that flares on fire)
    const gl = new THREE.Mesh(new THREE.PlaneGeometry(26, 26), RC.mats.glow('#ffc070')); gl.position.set(L * 0.95, 0, 14); gl.rotation.y = PI / 2; gl.renderOrder = 8; gl.material.opacity = 0; turret.add(gl);
    // the loaded ball glows a little so the player sees the gun is live
    RC.root.add(g); this.turret = turret; this.gl = gl;
  }
  render(dt) {
    if (!this.turret) return;
    this.turret.rotation.z = this.a; const k = this.recoil * this.recoil * 7;
    this.turret.position.x = -Math.cos(this.a) * k; this.turret.position.y = -Math.sin(this.a) * k;
    this.gl.material.opacity = this.smoke * this.smoke * 0.9;
  }
}
function inPoly(x, y, poly) { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; }

// The fort: a stone wall with a drawbridge gate (its face is a target). Stages: 0 closed, 1 bridge down + palisade up,
// 2 keep open (the gate is off: the ball rolls into the keep scoop), 3 collapsed. reset() rebuilds it.
class Fort {
  constructor(T, o) {
    this.T = T; this.G = T.G; this.world = T.world; this.o = o; this.id = o.id; this.lvl = 'main'; this.z0 = 0;
    this.x = FORT.x; this.y = FORT.y;
    const a = fortPt(-36, -26), b = fortPt(36, -26);
    this.face = T.world.seg(a[0], a[1], b[0], b[1], { mat: 'toy', r: 4, owner: this, id: 'fortFace' });
    this.stage = 0; this.hits = 0; this.last = -9; this.wob = 0; this.fall = 0; this.gate = 0; this.flagT = 0;
  }
  onContact(b, c, imp) {
    if (imp < 120 || this.G.time - this.last < 0.25) return; this.last = this.G.time; this.wob = 1;
    this.G.sfx('stoneHit', { vol: 0.5 + 0.4 * Math.min(1, imp / 1500), x: this.x }); this.G.shake(0.3);
    this.G.emit('fortHit', this.id, b, { imp, stage: this.stage });
  }
  setStage(s) {
    this.stage = s; this.face.on = s < 2;
    if (s === 3) { this.G.sfx('collapse', { vol: 1, x: this.x }); this.G.shake(1.5); if (this.T.R) { this.T.R.burst(this.x, this.y - 20, 20, 40, 500, '#d8c8a8'); } }
  }
  reset() { this.stage = 0; this.hits = 0; this.face.on = true; }
  trigger() { this.onContact(null, this.face, 1500); }
  update(dt) {
    this.wob *= Math.exp(-dt * 4);
    this.fall += ((this.stage >= 3 ? 1 : 0) - this.fall) * Math.min(1, dt * 1.6);
    this.gate += ((this.stage >= 1 && this.stage < 3 ? 1 : 0) - this.gate) * Math.min(1, dt * 2.2);
    // while a ball sits in the keep (or just left it), the gate stays open
    const keep = this.G.comps.keep; if (keep && keep.balls.length) this.face.on = false; else if (this.stage < 2) this.face.on = true; else this.face.on = false;
  }
  mesh(RC) { this.m = fortModel(RC, this); RC.root.add(this.m); }
  render(dt) { if (this.m && this.m.userData.pose) this.m.userData.pose(this, this.G.time); }
}

// ═══════════════════════════════════════════════════════════════════════════
// RULES
// ═══════════════════════════════════════════════════════════════════════════
function makeRules() {
  const LINES = {
    start: ['Welcome aboard, matey.', 'All hands on deck!', 'Hoist the colours!'],
    load: ['Cannon loaded. Take aim.', 'Run out the guns!'],
    fire: ['Fire!', 'Broadside!', 'Give them a volley!'],
    fort: ['The gate is down!', 'Storm the fort!'],
    taken: ['The fort is ours! Ha har!'],
    kraken: ['Release the Kraken!', 'Something stirs in the deep.'],
    grab: ['It has the ball!', 'Down to the depths.'],
    lock: ['Into the chest it goes.', 'Treasure for the hold.'],
    mb: ['Kraken multiball! Save yer ball!'],
    port: ['Plunder the port!', 'Land ho!'],
    plundered: ['Port plundered. Pieces of eight!'],
    storm: ["Storm's a-brewing. Batten down!", 'Thunder on the horizon.'],
    drain: ['Lost at sea.', 'Walk the plank!', 'Davy Jones be waiting.', 'Arr, the sea takes another.'],
    jackpot: ['Jackpot, me hearties!', 'Pieces of eight!'],
    davy: ['Davy Jones has come for ye!'],
    extra: ['Shoot again, sailor.'],
    parrot: ['Squawk! Pieces of eight!', 'Squawk! Pretty ball!']
  };
  const R = {
    modes: {
      port: G => R.startPort(G), kraken: G => { G.b.sea = [1, 1, 1]; G.b.krakenLit = true; G.b.locks = 2; },
      krakenmb: G => R.startKraken(G), broadside: G => R.startBroadside(G), storm: G => R.startStorm(G), davy: G => R.startDavy(G),
      fort: G => { G.comp('fort').setStage(1); G.comp('palisade').up(); }, collapse: G => R.takeFort(G),
      cannon: G => { const b = G.liveBalls()[0]; if (b) { G.world.hide(b, G.comp('cannon'), {}); G.comp('cannon').receive(b); } }
    },
    init(G) {
      G.b = { arr: [0, 0, 0], arrLit: 0, arrDone: 0, plunderLit: true, portI: 0, port: -1, portShots: {}, ports: [0, 0, 0, 0],
        sea: [0, 0, 0], krakenLit: false, locks: 0, krakenMB: false, jpLit: {}, jp: 0, superLit: false, krakenDone: false, grab: null,
        palDown: 0, broadside: false, cannonHits: 0, fortTaken: false, cannonBallT: -9, fortHits: 0,
        whirls: 0, storm: false, stormDone: false, nextStrike: 2, rain: 0, davyLit: false, davy: false, saidT: -9, gullT: 8, lastKrakenT: -9 };
      G.say(pick(LINES.start));
    },
    say(G, k, force) { if (G.time - G.b.saidT < 3.5 && !force) return; if (G.say(pick(LINES[k]), { force })) G.b.saidT = G.time; },
    ballStart(G) {
      const B = G.b; B.arrLit = Math.floor(Math.random() * 3); B.grab = null; B.cannonBallT = -9;
      const fort = G.comp('fort'); if (fort.stage >= 3) { fort.reset(); B.fortHits = 0; B.palDown = 0; G.comp('palisade').down(); }
    },
    ballEnd(G) {
      const B = G.b; B.krakenMB = false; B.davy = false; B.jpLit = {}; B.superLit = false; B.broadside = false; B.storm = false; B.port = -1; B.portShots = {}; B.grab = null;
      G.comp('kraken').active = false; G.comp('whirl').on = false; G.giLevel = 1;
      if (!G.tilted) R.say(G, 'drain');
    },
    serve(G) { G.b.arrLit = (G.b.arrLit + 1) % 3; },
    skill(G, type, id) { if (type === 'lane') return id === ['laneA', 'laneR1', 'laneR2'][G.b.arrLit]; if (type === 'pop' || type === 'orbit' || type === 'ramp' || type === 'whirl') return false; },
    flip(G, side, on) {
      if (!on || G.state !== 'play' && G.state !== 'serve') return;
      const B = G.b; B.arrLit = (B.arrLit + (side === 'R' ? 1 : 2)) % 3;
      const r = B.arr; B.arr = side === 'R' ? [r[2], r[0], r[1]] : [r[1], r[2], r[0]];
    },
    spinValue() { return 120; },
    event(G, type, id, b, d) {
      const B = G.b;
      switch (type) {
        case 'pop': G.cnt('keg'); R.shot(G, 'kegs', 0); if (B.davy) G.add(5000); break;
        case 'spinStart': G.cnt('dbl'); R.shot(G, 'spinner'); break;
        case 'spin': if (B.storm || B.davy) G.add(200); break;
        case 'drop': G.pulse('m' + d.i, 0.3); break;
        case 'bank':
          G.cnt('map');
          if (B.port < 0 && !B.plunderLit && B.portI < 4) { B.plunderLit = true; G.msg('MAP COMPLETE', 'PLUNDER IS LIT AT THE HARBOUR', { anim: 'map' }); G.sfx('coins', { vol: 0.6 }); }
          else { G.add(25000); G.msg('TREASURE MAP', '25,000', { anim: 'map' }); }
          break;
        case 'target':
          if (/^sea\d$/.test(id)) {
            B.sea[+id[3]] = 1; G.pulse('seal' + id[3], 0.3);
            if (B.sea.every(Boolean) && !B.krakenLit && !B.krakenMB && !B.davy) { B.krakenLit = true; G.cnt('kraken'); G.add(15000); G.msg('THE KRAKEN STIRS', 'SHOOT THE LAGOON', { anim: 'kraken' }); G.sfx('krakenRoar', { vol: 0.7 }); R.say(G, 'kraken'); }
            else if (B.sea.every(Boolean)) { B.sea = [0, 0, 0]; G.add(10000); }
          }
          break;
        case 'lane':
          if (/^lane/.test(id)) {
            const i = ['laneA', 'laneR1', 'laneR2'].indexOf(id); B.arr[i] = 1; G.cnt('dbl');
            if (B.arr.every(Boolean)) { B.arr = [0, 0, 0]; B.arrDone++; G.bxUp(); G.sfx('bell', { vol: 0.5 }); if (B.arrDone === 2) { G.comp('lifeboat').arm(); G.msg('A-R-R', 'LIFEBOAT IS LIT', {}); } }
          }
          break;
        case 'ramp':
          G.combo(id);
          if (id === 'plank') { G.cnt('plank'); G.add(15000); if (!R.jp(G, 'plank')) { R.shot(G, 'plank'); } }
          if (id === 'rigging') { G.cnt('rig'); G.add(15000); if (!R.jp(G, 'rigging')) { if (!R.shot(G, 'rigging')) G.msg('THE RIGGING', fmt(20000 * G.mult), {}); } }
          break;
        case 'orbit': G.combo(id); if (!R.jp(G, id)) { if (!R.shot(G, id)) G.msg(id === 'orbitL' ? 'THE COVE' : "THE SHIP'S WHEEL", fmt(G.add(B.storm ? 50000 : 8000)), {}); else G.add(8000); } break;
        case 'cannonLoad': G.msg('CANNON LOADED', 'FLIPPER AIMS, RELEASE FIRES', { anim: 'cannon', dur: 2.4 }); R.say(G, 'load'); G.pulse('flShip', 0.4); break;
        case 'cannonFire': G.cnt('cannon'); B.cannonBallT = G.time; G.msg('FIRE!', '', { style: 'flash', dur: 0.9, now: true, anim: 'cannon' }); R.say(G, 'fire', true); G.pulse('flShip', 0.3); break;
        case 'fortHit': R.fortHit(G, b, d); break;
        case 'popupHit':
          B.palDown++; G.add(10000); G.pulse('pal' + d.i, 0.3); G.sfx('woodBreak', { vol: 0.7, x: b ? b.x : FORT.x });
          if (G.time - B.cannonBallT < 3.2) { R.fortHit(G, b, { imp: 999, stage: 1 }); }
          if (B.palDown >= 3) { B.palDown = 0; G.comp('fort').setStage(2); G.msg('THE KEEP IS OPEN', 'SHOOT INSIDE THE FORT', { anim: 'fort' }); G.pulse('flFort', 0.5); }
          else G.msg('PALISADE', (3 - B.palDown) + ' MORE', {});
          break;
        case 'scoop':
          if (id === 'keep') R.keep(G, b); else if (id === 'harbour') R.harbour(G, b);
          break;
        case 'kraken': R.grabbed(G, b); break;
        case 'lock': {
          B.locks = d.n; G.cnt('lock'); G.sfx('coins', { vol: 0.7, x: CHEST.x }); G.pulse('mbL', 0.5);
          if (B.locks >= 3) G.later(0.9, () => R.startKraken(G));
          else { G.msg('BALL ' + B.locks + ' IN THE CHEST', B.locks === 2 ? 'ONE MORE FOR MULTIBALL' : 'SPELL S-E-A AGAIN', { anim: 'chest' }); R.say(G, 'lock'); }
          break;
        }
        case 'whirl':
          if (b && b.noCap.whirlEv > G.time) return; if (b) b.noCap.whirlEv = G.time + 1.2;
          B.whirls++; G.cnt('whirl'); G.sfx('splash', { vol: 0.3, x: WHIRL[0] });
          if (B.storm) { G.add(25000); G.msg('WHIRLPOOL', fmt(25000 * G.mult), { dur: 0.9 }); }
          else if (B.davy) G.add(25000);
          else if (B.whirls >= 5 && !Object.keys(G.modes).length && !G.mb) R.startStorm(G);
          else if (!B.stormLitShown || B.whirls < 5) { G.add(5000); G.msg('WHIRLPOOL', (5 - (B.whirls % 5 || (B.whirls >= 5 ? 5 : 0))) + ' MORE FOR THE STORM', { dur: 1 }); }
          R.shot(G, 'whirl');
          break;
        case 'kickback': G.msg('LIFEBOAT', 'BACK IN PLAY', { style: 'flash', dur: 1.1 }); G.sfx('bell', { vol: 0.4 }); break;
        case 'hullHit': if (d.imp > 900 && G.time - (B.hullT || -9) > 2) { B.hullT = G.time; G.sfx('creak', { vol: 0.3, x: 380 }); } break;
      }
    },
    // a lit port shot
    shot(G, key) {
      const B = G.b; if (B.port < 0 || !B.portShots[key]) return false;
      delete B.portShots[key]; G.cnt('portShot'); const left = Object.keys(B.portShots).length;
      if (left === 0) {
        B.ports[B.port] = 1; G.cnt('port'); G.jackpot(150000, 'PORT PLUNDERED', { color: '#ffd166', sound: 'jackpot' }); R.say(G, 'plundered');
        G.endMode('port'); R.checkCompass(G);
      } else { G.add(40000); G.msg(PORTS[B.port], fmt(40000 * G.mult) + '  ' + left + ' TO GO', { anim: 'ship' }); G.sfx('coins', { vol: 0.5 }); }
      return true;
    },
    jp(G, id) {
      const B = G.b; if (!(B.jpLit[id] || B.davy)) return false;
      const v = B.davy ? 100000 : 75000;
      if (!B.davy) delete B.jpLit[id];
      B.jp++; G.jackpot(v, B.davy ? 'DAVY JONES JACKPOT' : 'KRAKEN JACKPOT', { color: '#5fe8d0' }); R.say(G, 'jackpot');
      if (B.krakenMB && !Object.keys(B.jpLit).length && !B.superLit) { B.superLit = true; G.msg('SUPER JACKPOT', 'AT THE KRAKEN', {}); }
      return true;
    },
    fortHit(G, b, d) {
      const B = G.b, fort = G.comp('fort'), cannon = G.time - B.cannonBallT < 3.2;
      G.cnt('fortHit');
      if (cannon) {
        B.cannonBallT = -9; G.cnt('direct'); G.pulse('flFort', 0.5); if (G.T.R) G.T.R.burst(b ? b.x : FORT.x, b ? b.y : FORT.y, 20, 24, 500, '#ffb060');
        if (B.broadside) {
          B.cannonHits++; G.jackpot(75000, 'CANNON JACKPOT', { color: '#ff8a40', sound: 'jackpot' });
          if (B.cannonHits >= 3) R.takeFort(G); else G.msg('BROADSIDE', (3 - B.cannonHits) + ' MORE HITS TO TAKE THE FORT', { anim: 'cannon' });
          return;
        }
        G.add(40000); G.msg('DIRECT HIT', fmt(40000 * G.mult), { anim: 'cannon' });
        if (fort.stage === 0) B.fortHits += 2;
      }
      if (fort.stage === 0) {
        if (!cannon) { B.fortHits++; G.add(3000); }
        if (B.fortHits >= 3) { B.fortHits = 0; fort.setStage(1); G.comp('palisade').up(); G.msg('DRAWBRIDGE DOWN', 'KNOCK DOWN THE PALISADE', { anim: 'fort' }); G.sfx('creak', { vol: 0.8, x: FORT.x }); G.sfx('dropReset', { vol: 0.6, x: FORT.x }); R.say(G, 'fort'); }
        else if (!cannon) G.msg('THE FORT', (3 - B.fortHits) + ' MORE TO LOWER THE GATE', { dur: 1 });
      } else if (!cannon) { G.add(5000); }
    },
    takeFort(G) {
      const B = G.b; B.fortTaken = true; B.cannonHits = 0; G.cnt('fort'); G.comp('fort').setStage(3); G.comp('palisade').down();
      G.jackpot(300000, 'THE FORT IS TAKEN', { color: '#ff8a40', sound: 'jackpot' }); G.lightExtra(); R.say(G, 'taken', true); G.callout('FORT TAKEN', '#ffb060');
      if (B.broadside) { B.broadside = false; G.endMode('broadside'); }
      R.checkCompass(G);
    },
    keep(G, b) {
      const B = G.b, sc = G.comp('keep'), fort = G.comp('fort'); sc.holdT = 1.2; G.add(10000);
      if (fort.stage >= 2 && !B.broadside && !G.mb) { sc.holdT = 2.2; R.startBroadside(G); return; }
      G.msg('THE KEEP', fmt(10000 * G.mult), {});
    },
    harbour(G, b) {
      const B = G.b, sc = G.comp('harbour'); sc.holdT = 1.2; G.add(5000);
      if (B.davyLit && !B.davy && !G.mb) { B.davyLit = false; sc.holdT = 3.2; R.startDavy(G); return; }
      if (G.ebLit) { G.collectExtra(); R.say(G, 'extra', true); return; }
      if (B.plunderLit && B.port < 0 && !G.mb && B.portI < 4) { B.plunderLit = false; sc.holdT = 2.0; R.startPort(G); return; }
      const aw = ['DOUBLOONS', 'BALL SAVE', 'LIGHT KICKBACK', 'BONUS UP'][Math.floor(Math.random() * 4)];
      if (aw === 'DOUBLOONS') G.add(20000); else if (aw === 'BALL SAVE') G.ballSave(10); else if (aw === 'LIGHT KICKBACK') G.comp('lifeboat').arm(); else G.bxUp();
      G.msg('THE HARBOUR', aw, { anim: 'ship' }); G.sfx('bell', { vol: 0.5 });
    },
    grabbed(G, b) {
      const B = G.b, mag = G.comp('kraken'); G.cnt('grab');
      if (B.davy || (B.krakenMB && B.superLit)) { B.grab = { id: b.id, t: 0, mode: 'super' }; B.superLit = false; G.jackpot(B.davy ? 300000 : 200000, 'KRAKEN SUPER JACKPOT', { color: '#5fe8d0' }); if (B.krakenMB) B.jpLit = { orbitL: 1, orbitR: 1, rigging: 1, plank: 1 }; }
      else { B.grab = { id: b.id, t: 0, mode: 'lock' }; B.krakenLit = false; B.sea = [0, 0, 0]; G.msg('THE KRAKEN', 'HAS YOUR BALL', { anim: 'kraken', now: true }); R.say(G, 'grab', true); }
      G.sfx('krakenRoar', { vol: 0.8, x: KRAKEN.mx }); G.sfx('splash', { vol: 0.8, x: KRAKEN.mx }); G.pulse('flKrak', 0.6); G.shake(0.6);
      if (G.T.R) G.T.R.burst(KRAKEN.rx, KRAKEN.ry, 10, 20, 400, '#8fe8f0');
    },
    startPort(G) {
      const B = G.b; B.port = B.portI; B.portI++; B.portShots = {}; PORT_SHOTS[B.port].forEach(s => B.portShots[s] = 1);
      G.startMode('port', 35); G.big(PORTS[B.port], 'SHOOT THE THREE LIT SHOTS', '#ffd166', { anim: 'ship' }); G.sfx('bell', { vol: 0.6 }); R.say(G, 'port', true);
    },
    startKraken(G) {
      const B = G.b; B.krakenMB = true; B.locks = 0; B.krakenLit = false; G.cnt('krakenmb');
      G.comp('chest').release();
      G.multiball(3, { label: 'KRAKEN MULTIBALL', color: '#5fe8d0', save: 15 });
      B.jpLit = { orbitL: 1, orbitR: 1, rigging: 1, plank: 1 }; G.sfx('krakenRoar', { vol: 0.9 }); R.say(G, 'mb', true);
      if (!B.krakenDone) { B.krakenDone = true; R.checkCompass(G); }
    },
    startBroadside(G) {
      const B = G.b; B.broadside = true; B.cannonHits = 0; G.cnt('broadside');
      G.startMode('broadside', 45); G.big('BROADSIDE', 'LOAD THE CANNON, HIT THE FORT', '#ff8a40', { anim: 'cannon' }); G.sfx('cannon', { vol: 0.6 }); R.say(G, 'fire', true); G.callout('BROADSIDE', '#ffb060');
    },
    startStorm(G) {
      const B = G.b; B.storm = true; B.whirls = 0; G.cnt('storm');
      G.startMode('storm', 30, { mult: 2 }); G.comp('whirl').on = true; B.nextStrike = 0.8;
      G.big('THE STORM', 'EVERYTHING SCORES 2X', '#9fd8ff', { anim: 'storm' }); G.strike(1); G.sfx('rain', { vol: 0.5 }); R.say(G, 'storm', true); G.callout('STORM', '#9fd8ff');
      if (!B.stormDone) { B.stormDone = true; R.checkCompass(G); }
    },
    startDavy(G) {
      const B = G.b; B.davy = true; G.cnt('wiz'); G.comp('chest').release();
      G.multiball(4, { label: 'DAVY JONES', color: '#ff6a6a', save: 25 });
      G.startMode('davy', 60); G.comp('whirl').on = true; B.nextStrike = 1;
      G.sfx('krakenRoar', { vol: 1 }); G.later(1.2, () => G.sfx('bellToll', { vol: 0.7 })); R.say(G, 'davy', true); G.callout('DAVY JONES', '#ff6a6a');
      B.ports = [0, 0, 0, 0]; B.portI = 0; B.plunderLit = true; B.krakenDone = false; B.fortTaken = false; B.stormDone = false;
    },
    checkCompass(G) {
      const B = G.b; if (B.davyLit || B.davy) return;
      if (B.ports.every(Boolean) && B.krakenDone && B.fortTaken && B.stormDone) { B.davyLit = true; G.msg('THE COMPASS SPINS', 'DAVY JONES AT THE HARBOUR', { anim: 'skull', dur: 2.6 }); G.sfx('bellToll', { vol: 0.6 }); }
      else { const n = B.ports.filter(Boolean).length === 4 ? 1 : 0; G.msg('COMPASS', (n + (B.krakenDone ? 1 : 0) + (B.fortTaken ? 1 : 0) + (B.stormDone ? 1 : 0)) + ' OF 4 POINTS', { anim: 'compass' }); }
    },
    modeEnd(G, name) {
      const B = G.b;
      if (name === 'port') { B.port = -1; B.portShots = {}; if (B.portI >= 4 && !B.ports.every(Boolean)) { B.portI = 0; } }
      if (name === 'storm') { B.storm = false; G.comp('whirl').on = B.davy; G.msg('THE STORM PASSES', '', {}); }
      if (name === 'broadside') { B.broadside = false; }
      if (name === 'davy') { B.davy = false; G.comp('whirl').on = B.storm; G.msg('DAVY JONES', 'RETURNS TO THE DEEP', {}); }
    },
    mbEnd(G) { const B = G.b; B.krakenMB = false; B.superLit = false; B.jpLit = {}; if (B.davy) { B.davy = false; G.endMode('davy'); } },
    levelDrain(G, lvl, b) {
      if (lvl === 'deck') { G.world.airborne(b, 326, 690, DECK_Z, -400, -200, 0, 'main'); return true; }
      return false;
    },
    drain(G, b) { return false; },
    update(G, dt) {
      const B = G.b, mag = G.comp('kraken');
      // the Kraken's magnet is live when it is lit (or during its super jackpot / Davy Jones), never mid-grab
      mag.active = !B.grab && !G.tilted && (B.krakenLit || (B.krakenMB && B.superLit) || B.davy) && G.state === 'play';
      if (B.grab) {
        const g = B.grab, gb = mag.held && mag.held.id === g.id ? mag.held : null; g.t += dt;
        if (!gb && g.t < 0.2) { B.grab = null; }
        else if (g.mode === 'lock' && g.t > 1.6 && gb) { mag.held = null; G.comp('deep').take(gb, 1.1); G.sfx('splash', { vol: 0.9, x: KRAKEN.mx }); if (G.T.R) G.T.R.burst(KRAKEN.rx, KRAKEN.ry, 6, 24, 450, '#8fe8f0'); }
        else if (g.mode === 'super' && g.t > 1.0 && gb) { mag.fling(80 + Math.random() * 20, 1100); }
        if (g.t > 2.6) B.grab = null;
      }
      // storm: lightning, rain, dim GI
      const stormy = B.storm || B.davy;
      B.rain += ((stormy ? 1 : 0) - B.rain) * Math.min(1, dt * 1.2);
      G.giLevel = 1 - B.rain * 0.45;
      if (stormy) { B.nextStrike -= dt; if (B.nextStrike <= 0) { B.nextStrike = 2.5 + Math.random() * 4; G.strike(0.7 + Math.random() * 0.5); } B.rainT = (B.rainT || 0) - dt; if (B.rainT <= 0) { B.rainT = 1.7; if (G.amb) G.sfx('rain', { vol: 0.22, vary: 0.05 }); } }
      // quiet harbour ambience: a gull, the ship's bell, a creak; rare
      B.gullT -= dt; if (B.gullT <= 0) { B.gullT = 16 + Math.random() * 20; if (G.amb && G.state === 'play') G.sfx(['gull', 'bell', 'creak'][Math.floor(Math.random() * 3)], { vol: 0.1, x: Math.random() * 520 }); }
      // broadside: the cannon lamp pulses
      if (B.broadside && !G.cannon && Math.random() < dt * 0.3) G.pulse('arrPlank', 0.3);
    },
    lamps(G) {
      const B = G.b, L = {}, t = G.time, fort = G.comp('fort');
      const lit = k => B.port >= 0 && B.portShots[k];
      L.arrOrbL = B.jpLit.orbitL || B.davy ? 'fast' : lit('orbitL') ? 'blink' : G.lastShot === 'orbitR' && t - G.lastShotT < 4 ? 'blink' : 0;
      L.arrOrbR = B.jpLit.orbitR || B.davy ? 'fast' : lit('orbitR') || lit('spinner') ? 'blink' : G.lastShot === 'orbitL' && t - G.lastShotT < 4 ? 'blink' : 0;
      L.arrRig = B.jpLit.rigging || B.davy ? 'fast' : lit('rigging') ? 'blink' : 'slow';
      L.arrPlank = B.jpLit.plank || B.davy ? 'fast' : B.broadside ? 'blink' : lit('plank') ? 'blink' : 0.3;
      L.arrFort = B.broadside ? 'fast' : lit('fort') ? 'blink' : fort.stage === 2 ? 'blink' : fort.stage === 3 ? 0 : 'pulse';
      L.krakenL = B.grab ? 'fast' : B.krakenLit || (B.krakenMB && B.superLit) || B.davy ? 'blink' : 0;
      L.harbourL = B.davyLit || G.ebLit ? 'fast' : B.plunderLit && B.port < 0 ? 'blink' : 0;
      L.plunderL = B.plunderLit && B.port < 0 ? 'blink' : 0;
      B.ports.forEach((p, i) => { L['port' + i] = B.port === i ? 'fast' : p ? 1 : 0; });
      L.stormL = B.storm ? 'fast' : B.whirls >= 5 ? 'blink' : 0;
      for (let i = 0; i < 5; i++) L['whirl' + i] = B.storm ? 'blink' : B.whirls % 5 > i || B.whirls >= 5 ? 1 : 0;
      L.broadL = B.broadside ? 'fast' : fort.stage === 2 ? 'blink' : 0;
      L.mbL = B.krakenMB ? 'fast' : B.locks ? 'pulse' : 0; L.ebL = G.ebLit ? 'blink' : 0;
      [B.ports.every(Boolean), B.krakenDone, B.fortTaken, B.stormDone].forEach((v, i) => { L['comp' + i] = B.davyLit ? 'fast' : v ? 1 : 0; });
      L.davyL = B.davy ? 'fast' : B.davyLit ? 'blink' : 0;
      B.sea.forEach((h, i) => { L['seal' + i] = h ? 1 : B.krakenLit ? 'blink' : 0; });
      ['laneA', 'laneR1', 'laneR2'].forEach((id, i) => { L[id] = B.arr[i] ? 1 : (G.skill && i === B.arrLit) ? 'fast' : 0; });
      const mp = G.comp('map'); mp.targets.forEach((tg, i) => { L['m' + i] = tg.up ? 0 : 1; });
      const pal = G.comp('palisade'); pal.ts.forEach((tg, i) => { L['pal' + i] = tg.up ? 'blink' : 0; });
      L.lifeboat = G.comp('lifeboat').armed ? 1 : 0;
      L.flFort = (B.broadside && (t % 1.5) < 0.1) ? 1 : 0; L.flShip = G.cannon ? ((t % 0.8) < 0.1 ? 1 : 0) : 0; L.flKrak = 0;
      L.flTop = (B.storm || B.davy) && G.lightning > 0.5 ? 1 : 0;
      const stormDim = 1 - B.rain * 0.5;
      for (let i = 0; i < 9; i++) L['lant' + i] = stormDim * (0.85 + 0.15 * Math.sin(t * 9 + i * 2.1) * Math.sin(t * 3.3 + i));
      L.sternLamp = 0.8 + 0.2 * Math.sin(t * 7); L.lighthouse = 1;
      L.keg1 = L.keg2 = B.davy ? 'blink' : lit('kegs') ? 'blink' : 0.15;
      return L;
    },
    status(G) {
      const B = G.b, fort = G.comp('fort');
      if (B.davy) return 'DAVY JONES: EVERY SHOT IS A JACKPOT';
      if (B.krakenMB) return B.superLit ? 'SUPER JACKPOT: SHOOT THE KRAKEN' : 'KRAKEN MULTIBALL: SHOOT THE LIT JACKPOTS';
      if (B.broadside) return G.cannon ? 'HOLD A FLIPPER TO AIM, LET GO TO FIRE' : 'BROADSIDE: SHOOT THE PLANK TO LOAD THE CANNON';
      if (G.cannon) return 'HOLD A FLIPPER TO AIM, LET GO TO FIRE';
      if (B.port >= 0) return PORTS[B.port] + ': ' + Object.keys(B.portShots).map(k => ({ orbitL: 'LEFT ORBIT', orbitR: 'RIGHT ORBIT', spinner: 'THE WHEEL', plank: 'THE PLANK', fort: 'THE FORT', rigging: 'THE RIGGING', kegs: 'THE KEGS', whirl: 'THE WHIRLPOOL' }[k])).join(', ');
      if (B.storm) return 'STORM: EVERYTHING 2X, ORBITS 50,000';
      if (B.davyLit) return 'DAVY JONES IS LIT AT THE HARBOUR';
      if (B.grab) return 'THE KRAKEN HAS YOUR BALL';
      const opts = [];
      if (B.krakenLit) opts.push('THE KRAKEN IS AWAKE: SHOOT THE LAGOON'); else opts.push('SPELL S-E-A TO WAKE THE KRAKEN');
      if (fort.stage === 2) opts.push('THE KEEP IS OPEN: SHOOT INTO THE FORT'); else if (fort.stage === 1) opts.push('KNOCK DOWN THE PALISADE'); else if (fort.stage === 0) opts.push('HIT THE FORT ' + (3 - B.fortHits) + ' MORE TIMES');
      if (B.plunderLit) opts.push('PLUNDER IS LIT AT THE HARBOUR'); else if (B.portI < 4) opts.push('KNOCK DOWN M-A-P TO LIGHT PLUNDER');
      opts.push('SHOOT THE PLANK TO LOAD THE CANNON');
      opts.push((5 - Math.min(5, B.whirls)) + ' WHIRLPOOLS TO THE STORM');
      return opts[Math.floor(G.time / 4) % opts.length];
    },
    bonus(G) { return [['DOUBLOONS', G.pbn('dbl'), 1000], ['POWDER KEGS', G.pbn('keg'), 300], ['PORT SHOTS', G.pbn('portShot'), 5000], ['CANNON SHOTS', G.pbn('cannon'), 10000], ['FORT HITS', G.pbn('fortHit'), 2000], ['KRAKEN LOCKS', G.pbn('lock'), 10000]]; }
  };
  return R;
}

// ═══════════════════════════════════════════════════════════════════════════
// SOUNDS (table-specific recipes: iron, wood, water, brass)
// ═══════════════════════════════════════════════════════════════════════════
function defineSounds() {
  let AU = null; try { AU = audio(); } catch (e) { return; }
  if (!AU || !AU.define) return;
  // cannon: a deep coil-like thump, a muzzle crack, a long low rumble
  AU.define('cannon', 2.2, S => { S.noise(0, 0.03, 0.9, { hp: 1800 }); S.osc('sine', 62, 0, 0.5, 0.95, { to: 28 }); S.noise(0.01, 0.35, 0.7, { lp: 420 }); S.noise(0.08, 1.9, 0.35, { lp: 140, att: 0.05 }); S.osc('sine', 40, 0.05, 1.6, 0.3, { to: 24 }); S.ring(2100, 0.004, 0.25, 0.05); });
  // splash: a burst of water, bubbles after
  AU.define('splash', 0.9, S => { S.noise(0, 0.12, 0.5, { bp: 1600, bpTo: 500, q: 1.2 }); S.noise(0.02, 0.6, 0.18, { lp: 900, att: 0.02 }); for (let i = 0; i < 6; i++) S.osc('sine', 700 + i * 160, 0.15 + i * 0.07, 0.05, 0.05, { to: 1400 + i * 100 }); });
  // the kraken: a low wet groan
  AU.define('krakenRoar', 1.8, S => { S.osc('sawtooth', 58, 0, 1.4, 0.16, { to: 38, lp: 260, att: 0.12 }); S.osc('sawtooth', 61, 0, 1.4, 0.12, { to: 40, lp: 300, att: 0.15 }); S.noise(0, 1.2, 0.12, { bp: 220, q: 3, att: 0.2 }); S.osc('sine', 29, 0.1, 1.5, 0.25, { att: 0.1 }); });
  // ship's bell: two bright dings
  AU.define('bell', 1.4, S => { S.bell(1318.5, 0, 1.2, 0.18); S.bell(1318.5, 0.28, 1.1, 0.16); S.noise(0, 0.01, 0.2, { hp: 5000 }); S.noise(0.28, 0.01, 0.2, { hp: 5000 }); });
  AU.define('bellToll', 3.5, S => { S.bell(220, 0, 3.3, 0.22); S.bell(110, 0, 3.3, 0.12); S.bell(221.5, 1.2, 2.2, 0.16); });
  // coins: a handful of small bright clinks
  AU.define('coins', 0.7, S => { for (let i = 0; i < 7; i++) S.ring(3800 + (i * 731 % 2200), i * 0.055 + (i % 2) * 0.01, 0.16, 0.05, [1, 2.5, 4.1]); S.noise(0, 0.02, 0.2, { hp: 6000 }); });
  // stone: a dull knock on masonry
  AU.define('stoneHit', 0.3, S => { S.osc('sine', 210, 0, 0.1, 0.5, { to: 95 }); S.noise(0, 0.05, 0.35, { bp: 900, q: 1.1 }); S.noise(0.01, 0.12, 0.12, { lp: 500 }); });
  // the fort falling: rumble and a clatter of blocks
  AU.define('collapse', 2.4, S => { S.noise(0, 1.6, 0.5, { lp: 220, att: 0.03 }); S.osc('sine', 48, 0, 1.8, 0.35, { to: 26 }); for (let i = 0; i < 14; i++) S.noise(0.08 + i * 0.09 + (i % 3) * 0.02, 0.05, 0.3 - i * 0.012, { bp: 700 + (i * 173 % 900), q: 1.4 }); });
  AU.define('woodBreak', 0.35, S => { S.noise(0, 0.03, 0.5, { bp: 1300, q: 1.5 }); S.osc('sine', 150, 0, 0.1, 0.45, { to: 70 }); S.noise(0.04, 0.12, 0.25, { bp: 600, q: 2 }); S.noise(0.1, 0.06, 0.15, { bp: 1800, q: 2 }); });
  // rain on the glass (looped by the rules every 1.7 s, quiet)
  AU.define('rain', 2.0, S => { S.noise(0, 1.9, 0.12, { lp: 5200, att: 0.4 }); S.noise(0, 1.9, 0.06, { hp: 7000, att: 0.4 }); for (let i = 0; i < 24; i++) S.noise(Math.random() * 1.8, 0.008, 0.08, { bp: 3000 + Math.random() * 4000, q: 4 }); });
  AU.define('gull', 1.1, S => { S.osc('sine', 1180, 0, 0.22, 0.05, { to: 1500, att: 0.03 }); S.osc('sine', 1500, 0.22, 0.3, 0.04, { to: 980, att: 0.02 }); S.osc('sine', 1350, 0.6, 0.25, 0.035, { to: 900, att: 0.02 }); });
}

// ═══════════════════════════════════════════════════════════════════════════
// ART (canvas painters; the playfield is in table space, y up)
// ═══════════════════════════════════════════════════════════════════════════
function planks(g, x0, y0, x1, y1, w, base, seed, vertical) {
  const r = rng(seed), dark = shade(base, -0.4), light = shade(base, 0.18);
  for (let p = vertical ? x0 : y0; p < (vertical ? x1 : y1); p += w) {
    const t = 0.85 + r() * 0.3; g.fillStyle = shade(base, (t - 1) * 0.6);
    if (vertical) g.fillRect(p, y0, w - 0.8, y1 - y0); else g.fillRect(x0, p, x1 - x0, w - 0.8);
    g.strokeStyle = rgba(dark, 0.35); g.lineWidth = 0.5;
    for (let k = 0; k < 7; k++) { g.beginPath(); if (vertical) { const x = p + 1 + r() * (w - 2); g.moveTo(x, y0); g.bezierCurveTo(x + (r() - 0.5) * 3, y0 + (y1 - y0) * 0.3, x + (r() - 0.5) * 3, y0 + (y1 - y0) * 0.7, x + (r() - 0.5) * 2, y1); } else { const y = p + 1 + r() * (w - 2); g.moveTo(x0, y); g.bezierCurveTo(x0 + (x1 - x0) * 0.3, y + (r() - 0.5) * 3, x0 + (x1 - x0) * 0.7, y + (r() - 0.5) * 3, x1, y + (r() - 0.5) * 2); } g.stroke(); }
    g.strokeStyle = rgba(light, 0.25); g.lineWidth = 0.6; g.beginPath(); if (vertical) { g.moveTo(p + 0.6, y0); g.lineTo(p + 0.6, y1); } else { g.moveTo(x0, p + 0.6); g.lineTo(x1, p + 0.6); } g.stroke();
    // nails
    g.fillStyle = 'rgba(40,30,22,.7)';
    for (let k = 0; k < 3; k++) { const q = (vertical ? y0 : x0) + 20 + k * ((vertical ? y1 - y0 : x1 - x0) - 40) / 2 + (r() - 0.5) * 8; g.beginPath(); if (vertical) g.arc(p + w / 2, q, 1, 0, TAU); else g.arc(q, p + w / 2, 1, 0, TAU); g.fill(); }
  }
}
function water(g, P, x0, y0, x1, y1, seed) {
  const r = rng(seed);
  g.fillStyle = P.lin(0, y0, 0, y1, [[0, '#1a6a74'], [0.5, '#1f8f9a'], [1, '#27a3a8']]); g.fillRect(x0, y0, x1 - x0, y1 - y0);
  // depth: darker pools
  for (let i = 0; i < 14; i++) P.glow(x0 + r() * (x1 - x0), y0 + r() * (y1 - y0), 40 + r() * 90, '#0d3c48', 0.22);
  // caustic ripples: pale wavy lines
  g.lineWidth = 0.9;
  for (let i = 0; i < 90; i++) {
    const x = x0 + r() * (x1 - x0), y = y0 + r() * (y1 - y0), len = 14 + r() * 40, a = 0.08 + r() * 0.18;
    g.strokeStyle = 'rgba(210,245,245,' + a + ')'; g.beginPath(); g.moveTo(x, y);
    for (let k = 1; k <= 4; k++) g.quadraticCurveTo(x + len * (k - 0.5) / 4, y + (k % 2 ? 2.5 : -2.5), x + len * k / 4, y); g.stroke();
  }
  // sun glints
  for (let i = 0; i < 30; i++) { const x = x0 + r() * (x1 - x0), y = y0 + r() * (y1 - y0); g.fillStyle = 'rgba(255,250,230,' + (0.15 + r() * 0.3) + ')'; g.fillRect(x, y, 2 + r() * 5, 0.9); }
}
function rope(g, pts, w, col) {
  g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
  g.strokeStyle = shade(col, -0.45); g.lineWidth = w + 1.4; g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.stroke();
  g.strokeStyle = col; g.lineWidth = w; g.stroke();
  // twist marks
  g.strokeStyle = rgba(shade(col, -0.5), 0.6); g.lineWidth = 0.8;
  let acc = 0;
  for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i], l = Math.hypot(b[0] - a[0], b[1] - a[1]); const nx = -(b[1] - a[1]) / l, ny = (b[0] - a[0]) / l; for (let s = acc; s < l; s += w * 0.9) { const t = s / l, x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t; g.beginPath(); g.moveTo(x - nx * w / 2 + (b[0] - a[0]) / l * w * 0.3, y - ny * w / 2 + (b[1] - a[1]) / l * w * 0.3); g.lineTo(x + nx * w / 2 - (b[0] - a[0]) / l * w * 0.3, y + ny * w / 2 - (b[1] - a[1]) / l * w * 0.3); g.stroke(); } acc = (acc + l) % (w * 0.9); }
  g.restore();
}
function compassRose(g, P, x, y, r, col, col2) {
  g.save(); g.translate(x, y);
  for (let i = 0; i < 8; i++) { const a = i * PI / 4, R = i % 2 ? r * 0.55 : r; g.fillStyle = i % 2 ? col2 : col; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a - 0.14) * R * 0.3, Math.sin(a - 0.14) * R * 0.3); g.lineTo(Math.cos(a) * R, Math.sin(a) * R); g.lineTo(Math.cos(a + 0.14) * R * 0.3, Math.sin(a + 0.14) * R * 0.3); g.closePath(); g.fill(); g.fillStyle = rgba('#000', 0.3); g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * R, Math.sin(a) * R); g.lineTo(Math.cos(a + 0.14) * R * 0.3, Math.sin(a + 0.14) * R * 0.3); g.closePath(); g.fill(); }
  g.strokeStyle = col; g.lineWidth = 1; g.beginPath(); g.arc(0, 0, r * 0.72, 0, TAU); g.stroke(); g.beginPath(); g.arc(0, 0, r * 0.2, 0, TAU); g.stroke();
  g.restore();
  P.text('N', x, y + r + 7, { size: 7, color: col, font: 'Cinzel, Georgia' });
}
function paintPlayfield(P) {
  const g = P.ctx, W = P.W, L = P.L, r = rng(31);
  // base: the sea everywhere, then the deck planks round the lower third and the island at the fort
  water(g, P, 0, 0, W, L, 7);
  // sunset light from the top: warm glow on the water near the horizon
  g.fillStyle = P.lin(0, 700, 0, L, [[0, 'rgba(255,150,70,0)'], [1, 'rgba(255,160,80,.28)']]); g.fillRect(0, 700, W, L - 700);
  P.glow(260, 1040, 220, '#ffb070', 0.3);
  // foam lines along the wood edges
  // the lower deck: planks across the lower third, a curved shoreline
  g.save(); g.beginPath(); g.moveTo(0, 0); g.lineTo(W, 0); g.lineTo(W, 395); g.quadraticCurveTo(W * 0.78, 420, W * 0.66, 392); g.quadraticCurveTo(W * 0.5, 370, W * 0.34, 392); g.quadraticCurveTo(W * 0.2, 418, 0, 398); g.closePath(); g.clip();
  planks(g, 0, 0, W, 430, 26, '#7a5430', 3, false);
  g.fillStyle = P.lin(0, 0, 0, 430, [[0, 'rgba(0,0,0,.35)'], [0.4, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,.25)']]); g.fillRect(0, 0, W, 430);
  g.restore();
  // foam at the shoreline
  g.strokeStyle = 'rgba(230,250,250,.55)'; g.lineWidth = 2.4; g.beginPath(); g.moveTo(W, 397); g.quadraticCurveTo(W * 0.78, 422, W * 0.66, 394); g.quadraticCurveTo(W * 0.5, 372, W * 0.34, 394); g.quadraticCurveTo(W * 0.2, 420, 0, 400); g.stroke();
  g.strokeStyle = 'rgba(230,250,250,.25)'; g.lineWidth = 5; g.stroke();
  // side quays: planks up both sides (under the lanes and orbit walls)
  g.save(); g.beginPath(); g.rect(0, 395, 62, 240); g.rect(W - 42, 395, 42, 240); g.clip(); planks(g, 0, 380, W, 640, 22, '#6a4828', 9, false); g.restore();
  // the island: sand and rock round the fort
  const isl = [fortPt(-78, 70), fortPt(40, 76), fortPt(86, 40), fortPt(84, -40), fortPt(50, -70), fortPt(-20, -78), fortPt(-74, -50), fortPt(-90, 10)];
  g.fillStyle = 'rgba(230,245,245,.5)'; P.poly(isl.map(p => [p[0] + (p[0] - FORT.x) * 0.08, p[1] + (p[1] - FORT.y) * 0.08])).fill();
  g.fillStyle = P.rad(FORT.x, FORT.y, 10, 110, [[0, '#e8c890'], [0.7, '#d8b57a'], [1, '#b89050']]); P.poly(isl).fill();
  for (let i = 0; i < 120; i++) { const p = isl[Math.floor(r() * isl.length)], k = r(); const x = FORT.x + (p[0] - FORT.x) * k, y = FORT.y + (p[1] - FORT.y) * k; g.fillStyle = 'rgba(90,60,30,' + (0.1 + r() * 0.25) + ')'; g.fillRect(x, y, 1.4, 1.4); }
  // the whirlpool: a dark spiral under the top lanes
  g.save(); g.translate(WHIRL[0], WHIRL[1]); g.fillStyle = P.rad(0, 0, 4, 62, [[0, '#0a2a34'], [0.5, '#145a66'], [1, 'rgba(31,143,154,0)']]); g.fillRect(-62, -62, 124, 124);
  g.strokeStyle = 'rgba(220,245,245,.35)'; g.lineWidth = 1.2; g.beginPath(); for (let a = 0; a < 18; a += 0.1) { const R = 4 + a * 3.2; a ? g.lineTo(Math.cos(a) * R, Math.sin(a) * R) : g.moveTo(4, 0); } g.stroke(); g.restore();
  // the lagoon round the Kraken: deeper, darker water with a ring of foam
  P.glow(KRAKEN.mx, KRAKEN.my + 20, 90, '#0a2e3a', 0.6);
  g.strokeStyle = 'rgba(210,245,245,.28)'; g.lineWidth = 1.5; for (let i = 1; i <= 3; i++) { g.beginPath(); g.ellipse(KRAKEN.mx, KRAKEN.my + 16, 30 + i * 18, 22 + i * 14, 0, 0, TAU); g.stroke(); }
  // rope border round the lower deck and along the sides
  rope(g, [[6, 404], [14, 300], [10, 150]], 3.2, PAL.rope); rope(g, [[W - 8, 404], [W - 14, 300], [W - 10, 150]], 3.2, PAL.rope);
  // compass rose and the title on the deck
  compassRose(g, P, 243, 426, 36, '#e2b45a', '#8a5a2a');
  P.text("PIRATE'S COVE", 243, 205, { size: 15, color: 'rgba(255,214,120,.9)', spacing: 2, glow: '#ff9a4a', glowR: 3 });
  P.text('HOLD A FLIPPER TO AIM THE CANNON', 243, 190, { size: 5, color: 'rgba(255,230,190,.7)', font: 'Georgia, serif' });
  // labels
  P.text('THE LAGOON', KRAKEN.mx, KRAKEN.my - 34, { size: 6, color: '#bff4f0' });
  P.text('TREASURE', CHEST.x, CHEST.y - 36, { size: 5.5, color: '#ffd166' });
  P.text('THE FORT', fortPt(0, -96)[0] - 32, fortPt(0, -96)[1] + 10, { size: 6, color: '#ffd9b0', rot: FORT.face - 270 });
  P.text('POWDER KEGS', 380, 880, { size: 5.5, color: '#ffd9b0' });
  P.text('WHIRLPOOL', WHIRL[0], WHIRL[1] - 60, { size: 5.5, color: '#bff4f0' });
  P.text('THE COMPASS', 243, 380, { size: 5.5, color: '#e2b45a' });
  P.text('M-A-P', 426, 520, { size: 6, color: '#ffd166', rot: 90 });
  // a few gulls far away on the water and an anchor decal on the deck
  g.strokeStyle = 'rgba(255,245,230,.5)'; g.lineWidth = 0.8; [[150, 560], [330, 540], [200, 820]].forEach(([x, y]) => { g.beginPath(); g.moveTo(x - 5, y); g.quadraticCurveTo(x - 2.5, y + 3, x, y); g.quadraticCurveTo(x + 2.5, y + 3, x + 5, y); g.stroke(); });
  anchor(g, 90, 330, 16, 'rgba(60,40,20,.55)'); anchor(g, 400, 330, 16, 'rgba(60,40,20,.55)');
  // wear: scuffs round the flippers and the pops
  for (let i = 0; i < 160; i++) { const x = r() * W, y = r() * 440; g.fillStyle = 'rgba(0,0,0,' + (0.03 + r() * 0.08) + ')'; g.fillRect(x, y, 1 + r() * 3, 0.8); }
}
function anchor(g, x, y, s, col) {
  g.save(); g.translate(x, y); g.strokeStyle = col; g.lineWidth = s * 0.14; g.lineCap = 'round';
  g.beginPath(); g.moveTo(0, s); g.lineTo(0, -s * 0.6); g.stroke(); g.beginPath(); g.arc(0, -s * 0.75, s * 0.16, 0, TAU); g.stroke();
  g.beginPath(); g.moveTo(-s * 0.5, s * 0.2); g.lineTo(s * 0.5, s * 0.2); g.stroke();
  g.beginPath(); g.arc(0, 0, s * 0.8, PI * 0.15, PI * 0.85, false); g.stroke(); g.restore();
}
function paintDeck(P, box) {
  const g = P.ctx;
  planks(g, box[0], box[1], box[2], box[3], 9, '#8a6238', 21, true);
  g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(box[0], box[1], box[2] - box[0], 6);
  // hatch grating and a coil of rope
  g.fillStyle = 'rgba(30,18,8,.8)'; g.fillRect(366, 800, 24, 18); g.strokeStyle = 'rgba(150,110,70,.6)'; g.lineWidth = 0.8; for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(366, 802 + i * 4); g.lineTo(390, 802 + i * 4); g.stroke(); } for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(368 + i * 4, 800); g.lineTo(368 + i * 4, 818); g.stroke(); }
  g.strokeStyle = PAL.rope; g.lineWidth = 2.2; for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(404, 688, 2 + i * 2.2, 0, TAU); g.stroke(); }
  P.text('THE GALLEON', 378, 845, { size: 6, color: 'rgba(255,230,190,.8)' });
}
function paintBackglass(g, w, h) {
  // sunset over the sea, a galleon in silhouette, the title in brass
  const sky = g.createLinearGradient(0, 0, 0, h * 0.62); sky.addColorStop(0, '#2a1240'); sky.addColorStop(0.35, '#8a3050'); sky.addColorStop(0.7, '#ff8a3a'); sky.addColorStop(1, '#ffd080'); g.fillStyle = sky; g.fillRect(0, 0, w, h);
  const sun = g.createRadialGradient(w * 0.62, h * 0.56, 0, w * 0.62, h * 0.56, 110); sun.addColorStop(0, 'rgba(255,250,220,1)'); sun.addColorStop(0.3, 'rgba(255,220,150,.9)'); sun.addColorStop(1, 'rgba(255,160,80,0)'); g.fillStyle = sun; g.fillRect(0, 0, w, h);
  // clouds
  g.fillStyle = 'rgba(90,30,60,.55)'; [[80, 90, 120, 14], [300, 120, 180, 16], [160, 170, 90, 10], [360, 200, 140, 12]].forEach(([x, y, cw, ch]) => { g.beginPath(); g.ellipse(x, y, cw, ch, 0, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,170,120,.35)'; g.beginPath(); g.ellipse(x, y + ch * 0.9, cw * 0.9, ch * 0.4, 0, 0, TAU); g.fill(); g.fillStyle = 'rgba(90,30,60,.55)'; });
  // sea
  const sea = g.createLinearGradient(0, h * 0.6, 0, h); sea.addColorStop(0, '#ff9a60'); sea.addColorStop(0.15, '#2a8a94'); sea.addColorStop(1, '#0b2a36'); g.fillStyle = sea; g.fillRect(0, h * 0.6, w, h * 0.4);
  const rr = rng(4); for (let i = 0; i < 160; i++) { const y = h * 0.6 + rr() * h * 0.4, x = rr() * w; g.fillStyle = 'rgba(255,220,170,' + (0.1 + rr() * 0.35 * (1 - (y - h * 0.6) / (h * 0.4))) + ')'; g.fillRect(x, y, 4 + rr() * 14, 1.2); }
  // galleon silhouette
  g.fillStyle = '#1a0c10'; g.save(); g.translate(w * 0.32, h * 0.6);
  g.beginPath(); g.moveTo(-70, 0); g.quadraticCurveTo(-60, 22, -30, 24); g.lineTo(60, 24); g.quadraticCurveTo(84, 18, 90, -6); g.lineTo(60, 0); g.closePath(); g.fill();
  [[-20, 1.0], [25, 1.15], [60, 0.8]].forEach(([x, k]) => { g.fillRect(x - 1.5, -80 * k, 3, 82 * k); g.beginPath(); g.moveTo(x - 22 * k, -70 * k); g.quadraticCurveTo(x, -40 * k, x - 22 * k, -16 * k); g.lineTo(x + 22 * k, -16 * k); g.quadraticCurveTo(x, -40 * k, x + 22 * k, -70 * k); g.closePath(); g.fill(); });
  g.beginPath(); g.moveTo(-70, -2); g.lineTo(-110, -14); g.lineTo(-74, 2); g.fill(); g.restore();
  // a parrot's feather flourish and the title
  g.save(); g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '700 64px Cinzel, Georgia, serif';
  g.shadowColor = '#ff9a4a'; g.shadowBlur = 22; g.fillStyle = '#ffe2a0'; g.fillText("PIRATE'S", w / 2, h * 0.8); g.font = '700 50px Cinzel, Georgia, serif'; g.fillText('COVE', w / 2, h * 0.92);
  g.shadowBlur = 0; g.strokeStyle = 'rgba(80,40,10,.8)'; g.lineWidth = 1.5; g.font = '700 64px Cinzel, Georgia, serif'; g.strokeText("PIRATE'S", w / 2, h * 0.8); g.font = '700 50px Cinzel, Georgia, serif'; g.strokeText('COVE', w / 2, h * 0.92); g.restore();
}
function paintApron(g, w, h) {
  planks(g, 0, 0, w, h, 34, '#5a3a1e', 13, false);
  g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(0, 0, w, h);
  // brass plate
  const pg = g.createLinearGradient(0, h * 0.3, 0, h * 0.95); pg.addColorStop(0, '#f0d080'); pg.addColorStop(0.5, '#c89a40'); pg.addColorStop(1, '#8a6020'); g.fillStyle = pg;
  g.beginPath(); g.roundRect ? g.roundRect(w * 0.2, h * 0.32, w * 0.6, h * 0.58, 14) : g.rect(w * 0.2, h * 0.32, w * 0.6, h * 0.58); g.fill();
  g.strokeStyle = 'rgba(60,35,10,.7)'; g.lineWidth = 3; g.stroke();
  [[w * 0.22, h * 0.36], [w * 0.78, h * 0.36], [w * 0.22, h * 0.86], [w * 0.78, h * 0.86]].forEach(([x, y]) => { g.fillStyle = '#6a4a18'; g.beginPath(); g.arc(x, y, 6, 0, TAU); g.fill(); g.fillStyle = '#ffe0a0'; g.beginPath(); g.arc(x - 1.5, y - 1.5, 2.5, 0, TAU); g.fill(); });
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '700 50px Cinzel, Georgia'; g.fillStyle = '#3a2008'; g.fillText("PIRATE'S COVE", w / 2 + 2, h * 0.56 + 2); g.fillStyle = '#fff0c0'; g.fillText("PIRATE'S COVE", w / 2, h * 0.56);
  g.font = '700 15px Georgia'; g.fillStyle = 'rgba(60,35,10,.9)';
  g.fillText('BOARD THE GALLEON  ·  FIRE THE CANNON AT THE FORT  ·  FEED THE KRAKEN  ·  RIDE OUT THE STORM', w / 2, h * 0.8);
}
function paintSides(g, w, h) {
  planks(g, 0, 0, w, h, 32, '#4a3018', 17, false);
  g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(0, 0, w, h);
  g.strokeStyle = '#b89463'; g.lineWidth = 5; g.setLineDash([]); g.beginPath(); g.moveTo(0, h - 22); for (let x = 0; x <= w; x += 64) g.quadraticCurveTo(x + 32, h - 4, x + 64, h - 22); g.stroke();
  g.strokeStyle = 'rgba(0,0,0,.4)'; g.lineWidth = 1; g.stroke();
  g.fillStyle = '#e2b45a'; g.fillRect(0, 8, w, 3);
}
function paintBackboard(g, w, h) {
  // the harbour town at sunset behind the fort and the galleon
  const sky = g.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#3a1a40'); sky.addColorStop(0.5, '#c8502a'); sky.addColorStop(0.85, '#ff9a50'); sky.addColorStop(1, '#ffc080'); g.fillStyle = sky; g.fillRect(0, 0, w, h);
  const sun = g.createRadialGradient(w * 0.4, h * 0.78, 0, w * 0.4, h * 0.78, 160); sun.addColorStop(0, 'rgba(255,245,210,.95)'); sun.addColorStop(0.25, 'rgba(255,210,140,.8)'); sun.addColorStop(1, 'rgba(255,160,80,0)'); g.fillStyle = sun; g.fillRect(0, 0, w, h);
  // distant headland and a lighthouse on the right, a town on the left
  g.fillStyle = '#2a1418'; g.beginPath(); g.moveTo(0, h); g.lineTo(0, h * 0.72); g.quadraticCurveTo(w * 0.15, h * 0.6, w * 0.3, h * 0.74); g.quadraticCurveTo(w * 0.5, h * 0.84, w * 0.7, h * 0.7); g.quadraticCurveTo(w * 0.85, h * 0.58, w, h * 0.66); g.lineTo(w, h); g.fill();
  const rr = rng(8);
  for (let i = 0; i < 14; i++) { const x = 30 + i * 22 + rr() * 8, hh = 20 + rr() * 30, ww = 12 + rr() * 10; g.fillStyle = '#1e0e14'; g.fillRect(x, h * 0.7 - hh + 10, ww, hh); g.fillStyle = '#ffcf7a'; if (rr() < 0.7) g.fillRect(x + 3, h * 0.7 - hh + 16, 3, 4); if (rr() < 0.5) g.fillRect(x + ww - 6, h * 0.7 - hh + 24, 3, 4); }
  g.fillStyle = '#ffd9a0'; g.fillRect(0, h - 40, w, 40);
  const sea = g.createLinearGradient(0, h - 40, 0, h); sea.addColorStop(0, '#ff9a60'); sea.addColorStop(0.3, '#2a8a94'); sea.addColorStop(1, '#0b2a36'); g.fillStyle = sea; g.fillRect(0, h - 40, w, 40);
}
function slingArt(g, w, h, side) {
  const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#3a2414'); gr.addColorStop(1, '#1a0e08'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.save(); g.translate(side === 'L' ? w * 0.3 : w * 0.7, h * 0.52);
  g.strokeStyle = '#e2b45a'; g.lineWidth = 5; g.lineCap = 'round';
  g.beginPath(); g.moveTo(0, 60); g.lineTo(0, -40); g.stroke(); g.beginPath(); g.arc(0, -50, 10, 0, TAU); g.stroke(); g.beginPath(); g.moveTo(-26, 0); g.lineTo(26, 0); g.stroke(); g.beginPath(); g.arc(0, 10, 44, PI * 0.15, PI * 0.85); g.stroke();
  g.restore();
}
function wheelArt(g, w, h) {
  g.fillStyle = '#5a3a1e'; g.fillRect(0, 0, w, h);
  g.save(); g.translate(w / 2, h / 2); const R = h * 0.42;
  g.strokeStyle = '#d8b26a'; g.lineWidth = 7; g.beginPath(); g.arc(0, 0, R, 0, TAU); g.stroke(); g.strokeStyle = '#8a6238'; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, R * 0.78, 0, TAU); g.stroke();
  for (let i = 0; i < 8; i++) { const a = i * PI / 4; g.strokeStyle = '#d8b26a'; g.lineWidth = 5; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * R * 1.3, Math.sin(a) * R * 1.3); g.stroke(); g.fillStyle = '#e8c890'; g.beginPath(); g.arc(Math.cos(a) * R * 1.3, Math.sin(a) * R * 1.3, 4.5, 0, TAU); g.fill(); }
  g.fillStyle = '#e2b45a'; g.beginPath(); g.arc(0, 0, 9, 0, TAU); g.fill(); g.restore();
}
function whirlArt(g, w, h) {
  g.save(); g.translate(w / 2, h / 2);
  const gr = g.createRadialGradient(0, 0, 0, 0, 0, w / 2); gr.addColorStop(0, '#061e26'); gr.addColorStop(0.6, '#145a66'); gr.addColorStop(1, '#1f8f9a'); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, w / 2, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(220,245,245,.5)'; g.lineWidth = 3;
  for (let s = 0; s < 3; s++) { g.beginPath(); for (let a = 0; a < 12; a += 0.08) { const R = 4 + a * 10; const t = a + s * TAU / 3; a ? g.lineTo(Math.cos(t) * R, Math.sin(t) * R) : g.moveTo(Math.cos(t) * 4, Math.sin(t) * 4); } g.stroke(); }
  g.restore();
}
function kegCap(g, w, h) {
  // a powder keg lid: wooden top with a brass band and a skull mark
  g.fillStyle = '#6a4828'; g.fillRect(0, 0, w, h);
  g.save(); g.translate(w / 2, h / 2);
  for (let i = -5; i <= 5; i++) { g.strokeStyle = i % 2 ? 'rgba(0,0,0,.25)' : 'rgba(255,220,170,.12)'; g.lineWidth = 2; g.beginPath(); g.moveTo(i * 12, -w / 2); g.lineTo(i * 12, w / 2); g.stroke(); }
  g.strokeStyle = '#e2b45a'; g.lineWidth = 9; g.beginPath(); g.arc(0, 0, w * 0.4, 0, TAU); g.stroke();
  g.fillStyle = '#ffd9b0'; g.beginPath(); g.arc(0, -6, 26, 0, TAU); g.fill(); g.fillRect(-16, 8, 32, 14);
  g.fillStyle = '#2a1408'; g.beginPath(); g.arc(-10, -8, 7, 0, TAU); g.arc(10, -8, 7, 0, TAU); g.fill(); g.fillRect(-12, 12, 4, 8); g.fillRect(-2, 12, 4, 8); g.fillRect(8, 12, 4, 8);
  g.restore();
}

// ═══════════════════════════════════════════════════════════════════════════
// DISPLAY: a sepia LCD (an old chart) with little animations
// ═══════════════════════════════════════════════════════════════════════════
function lcdBg(g, W, H, t, G) {
  const gr = g.createLinearGradient(0, 0, W, H); gr.addColorStop(0, '#c9a46a'); gr.addColorStop(0.5, '#b8924f'); gr.addColorStop(1, '#8e6a34'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  // stains and a faint compass rose on the right
  g.fillStyle = 'rgba(80,50,20,.12)'; g.beginPath(); g.ellipse(W * 0.2, H * 0.3, 40, 14, 0.3, 0, TAU); g.fill(); g.beginPath(); g.ellipse(W * 0.75, H * 0.8, 50, 10, -0.2, 0, TAU); g.fill();
  g.save(); g.translate(W - 26, H / 2); g.strokeStyle = 'rgba(70,40,10,.35)'; g.lineWidth = 1; g.beginPath(); g.arc(0, 0, 16, 0, TAU); g.stroke();
  for (let i = 0; i < 8; i++) { const a = i * PI / 4, R = i % 2 ? 9 : 16; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * R, Math.sin(a) * R); g.stroke(); } g.restore();
  // wave line along the bottom, vignette
  g.strokeStyle = 'rgba(70,40,10,.3)'; g.lineWidth = 1; g.beginPath(); for (let x = 0; x <= W; x += 6) { const y = H - 3 + Math.sin(x * 0.5 + t * 2) * 1.2; x ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
  const vg = g.createRadialGradient(W / 2, H / 2, H * 0.6, W / 2, H / 2, W * 0.7); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(40,20,0,.45)'); g.fillStyle = vg; g.fillRect(0, 0, W, H);
}
function lcdAnims() {
  const ink = '#2a1608', ink2 = '#8a4a18';
  const ship = (g, x, y, s, flip) => {
    g.save(); g.translate(x, y); if (flip) g.scale(-1, 1); g.scale(s, s); g.fillStyle = ink;
    g.beginPath(); g.moveTo(-14, 0); g.quadraticCurveTo(-12, 5, -6, 6); g.lineTo(12, 6); g.quadraticCurveTo(17, 4, 18, -2); g.lineTo(12, 0); g.closePath(); g.fill();
    [[-4, 1], [5, 1.15]].forEach(([mx, k]) => { g.fillRect(mx - 0.5, -16 * k, 1, 16 * k); g.fillStyle = '#f2e2c0'; g.beginPath(); g.moveTo(mx - 5 * k, -14 * k); g.quadraticCurveTo(mx, -9 * k, mx - 5 * k, -4 * k); g.lineTo(mx + 5 * k, -4 * k); g.quadraticCurveTo(mx, -9 * k, mx + 5 * k, -14 * k); g.closePath(); g.fill(); g.strokeStyle = ink; g.lineWidth = 0.6; g.stroke(); g.fillStyle = ink; });
    g.restore();
  };
  const waves = (g, W, H, t, y0) => { g.strokeStyle = ink2; g.lineWidth = 1; for (let k = 0; k < 2; k++) { g.beginPath(); for (let x = 0; x <= W; x += 4) { const y = y0 + k * 5 + Math.sin(x * 0.25 + t * 3 + k) * 2; x ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); } };
  return {
    ship(g, t, W, H) { waves(g, W, H, t, H - 12); ship(g, 24 + ((t * 26) % (W + 60)) - 30, H - 12 + Math.sin(t * 3) * 1.5, 1, false); },
    cannon(g, t, W, H) {
      // the galleon on the right fires at a fort on the left; the ball arcs across and the fort puffs
      ship(g, W - 30, H - 10, 1.1, true);
      g.fillStyle = ink; g.fillRect(8, H - 24, 26, 16); g.fillRect(6, H - 30, 6, 6); g.fillRect(30, H - 30, 6, 6); g.fillRect(16, H - 30, 10, 3);
      const k = Math.min(1, (t % 1.6) / 1.1), x = W - 46 - k * (W - 80), y = H - 16 - Math.sin(k * PI) * 22;
      g.fillStyle = ink; g.beginPath(); g.arc(x, y, 2.5, 0, TAU); g.fill();
      if (k > 0.95 || (t % 1.6) > 1.1) { const p = (t % 1.6) - 1.1; g.fillStyle = 'rgba(80,50,20,' + Math.max(0, 0.7 - p) + ')'; for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(34 + i * 4 - 8, H - 26 - p * 20 - i * 2, 4 + p * 8, 0, TAU); g.fill(); } }
      if ((t % 1.6) < 0.12) { g.fillStyle = 'rgba(255,230,160,.8)'; g.beginPath(); g.arc(W - 48, H - 18, 8, 0, TAU); g.fill(); }
    },
    fort(g, t, W, H) { g.fillStyle = ink; g.fillRect(W / 2 - 30, H - 26, 60, 20); for (let i = 0; i < 6; i++) g.fillRect(W / 2 - 30 + i * 11, H - 31, 6, 5); g.fillStyle = '#c9a46a'; const d = Math.min(1, t / 0.8); g.fillRect(W / 2 - 6, H - 6 - 14 * d, 12, 14 * d); g.fillStyle = ink; g.fillRect(W / 2 - 8 - 14 * d, H - 7, 14 * d + 2, 2); },
    kraken(g, t, W, H) {
      waves(g, W, H, t, H - 10);
      g.strokeStyle = ink; g.lineWidth = 3; g.lineCap = 'round';
      [[20, 0], [50, 0.9], [W - 40, 0.4], [W - 18, 1.5]].forEach(([x, ph]) => { const up = Math.min(1, t / 0.7); g.beginPath(); g.moveTo(x, H); for (let k = 1; k <= 6; k++) { const yy = H - k * 5 * up, xx = x + Math.sin(k * 0.6 + t * 2 + ph) * 4 * k * 0.3; g.lineTo(xx, yy); } g.stroke(); });
      g.fillStyle = ink; g.beginPath(); g.arc(W / 2, H - 4 + Math.sin(t * 4) * 2, 8, PI, 0); g.fill(); g.fillStyle = '#ffd166'; g.beginPath(); g.arc(W / 2 - 3, H - 8, 1.6, 0, TAU); g.arc(W / 2 + 3, H - 8, 1.6, 0, TAU); g.fill();
    },
    storm(g, t, W, H) {
      g.strokeStyle = 'rgba(40,25,10,.6)'; g.lineWidth = 1; for (let i = 0; i < 40; i++) { const x = (i * 29 + t * 90) % W, y = (i * 17 + t * 160) % H; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 2, y + 6); g.stroke(); }
      if (Math.floor(t * 7) % 5 === 0) { g.fillStyle = 'rgba(255,250,230,.55)'; g.fillRect(0, 0, W, H); g.strokeStyle = '#2a1608'; g.lineWidth = 1.5; g.beginPath(); let x = W * 0.3; g.moveTo(x, 0); for (let y = 5; y < H; y += 5) { x += Math.sin(y * 2.1 + t) * 5; g.lineTo(x, y); } g.stroke(); }
    },
    chest(g, t, W, H) { const o = Math.min(1, t / 0.6); g.fillStyle = ink; g.fillRect(W - 44, H - 18, 30, 14); g.save(); g.translate(W - 44, H - 18); g.rotate(-o * 1.2); g.fillRect(0, -8, 30, 8); g.restore(); g.fillStyle = '#ffd166'; for (let i = 0; i < 6; i++) g.fillRect(W - 40 + i * 4, H - 20 + (i % 2), 3, 2); for (let i = 0; i < 6; i++) { const a = t * 3 + i; g.fillRect(W - 30 + Math.cos(a) * 14, H - 24 + Math.sin(a) * 6 - 6, 1.5, 1.5); } },
    map(g, t, W, H) { g.strokeStyle = ink2; g.lineWidth = 1; g.setLineDash([2, 2]); g.beginPath(); g.moveTo(6, H - 6); g.bezierCurveTo(W * 0.3, H * 0.2, W * 0.5, H * 0.9, W - 14, 10); g.stroke(); g.setLineDash([]); g.strokeStyle = '#8a1a10'; g.lineWidth = 2; const k = Math.min(1, t / 0.5); g.beginPath(); g.moveTo(W - 18, 6); g.lineTo(W - 18 + 8 * k, 6 + 8 * k); g.moveTo(W - 10, 6); g.lineTo(W - 10 - 8 * k, 6 + 8 * k); g.stroke(); },
    compass(g, t, W, H) { g.save(); g.translate(26, H / 2); g.strokeStyle = ink; g.lineWidth = 1; g.beginPath(); g.arc(0, 0, 18, 0, TAU); g.stroke(); g.rotate(t * 6); g.fillStyle = '#8a1a10'; g.beginPath(); g.moveTo(0, -16); g.lineTo(3, 0); g.lineTo(-3, 0); g.fill(); g.fillStyle = ink; g.beginPath(); g.moveTo(0, 16); g.lineTo(3, 0); g.lineTo(-3, 0); g.fill(); g.restore(); },
    skull(g, t, W, H) {
      [[22, 0], [W - 22, 0.5]].forEach(([x, ph]) => { const y = H / 2 + Math.sin(t * 3 + ph) * 2; g.fillStyle = '#f2e2c0'; g.beginPath(); g.arc(x, y - 3, 11, 0, TAU); g.fill(); g.fillRect(x - 6, y + 4, 12, 7); g.fillStyle = ink; g.beginPath(); g.arc(x - 4, y - 4, 3, 0, TAU); g.arc(x + 4, y - 4, 3, 0, TAU); g.fill(); g.fillRect(x - 4, y + 6, 2, 4); g.fillRect(x - 1, y + 6, 2, 4); g.fillRect(x + 2, y + 6, 2, 4); g.strokeStyle = '#f2e2c0'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(x - 14, y + 14); g.lineTo(x + 14, y - 10); g.moveTo(x + 14, y + 14); g.lineTo(x - 14, y - 10); g.stroke(); });
    }
  };
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
// a sail hanging from a yard: a plane bellied towards -y (the wind from the stern), vertical in z
function sailGeo(w, h, belly) {
  const g = new THREE.PlaneGeometry(w, h, 10, 6), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i) / (w / 2), y = p.getY(i) / (h / 2); p.setZ(i, -belly * (1 - x * x) * (1 - y * y * 0.6) - belly * 0.3 * (1 - y)); }
  g.rotateX(PI / 2); g.rotateX(-0.55);   // plane in x/z, leaning back so the player sees the canvas
  g.computeVertexNormals(); return g;
}
function galleonModel(RC) {
  const B = RC.batch, hullMat = RC.mats.wood('#4a2c14', 'hull'), trim = RC.mats.wood('#6a4420', 'trim'), brass = RC.mats.brass(), iron = RC.mats.iron();
  const ropeMat = RC.mats.paint('#9a7a4a', { roughness: 0.9 }), canvasMat = RC.mats.paint('#e6dcc4', { roughness: 0.85, side: THREE.DoubleSide });
  const closed = HULL.concat([HULL[0]]);
  // hull sides up to the gunwale, a brass rail on top, a dark waterline and a keel strake
  B.add(hullMat, wallGeo(closed, 7, 0, DECK_Z + 9, { bevel: 1.2 }));
  B.add(RC.mats.paint('#2a1a10', { roughness: 0.8 }), wallGeo(closed, 8.2, 0, 7, { bevel: 0.6 }));
  B.add(brass, wallGeo(closed, 2.6, DECK_Z + 9, DECK_Z + 11.4, { bevel: 0.5 }));
  B.add(trim, wallGeo(closed, 8.6, 24, 27, { bevel: 0.5 }));
  // gun ports along the sides (dark squares with a brass frame)
  [[332, 720], [333, 760], [335, 800], [425, 720], [425, 760], [425, 800]].forEach(([x, y]) => { B.add(RC.mats.paint('#0a0806'), boxGeo(x, y, 14, 3, 9, 8)); B.add(brass, boxGeo(x, y, 14, 2.2, 11, 10)); });
  // stern castle: a raised cabin at the back with lit windows and the ship's wheel on top
  B.add(trim, boxGeo(378, 684, DECK_Z + 11, 78, 30, 22));
  B.add(brass, boxGeo(378, 684, DECK_Z + 22.5, 80, 32, 1.4));
  const winMat = new THREE.MeshStandardMaterial({ color: '#201008', emissive: '#ffb860', emissiveIntensity: 1.5 });
  const wins = [[352, 668.4], [370, 668.4], [388, 668.4], [406, 668.4]].map(([x, y]) => boxGeo(x, y, DECK_Z + 11, 9, 2, 8));
  const winMesh = new THREE.Mesh(mergeGeos(wins), winMat); RC.root.add(winMesh);
  const wheel = new THREE.Group(); wheel.position.set(378, 702, DECK_Z + 31);
  const wg = [new THREE.TorusGeometry(7, 1, 6, 18)]; for (let i = 0; i < 8; i++) { const a = i * PI / 4; wg.push(tubeGeo([[0, 0, 0], [Math.cos(a) * 9.5, Math.sin(a) * 9.5, 0]], 0.7, 2, 5)); }
  const wm = mesh(mergeGeos(wg), brass); wm.rotation.x = PI / 2; wheel.add(wm); RC.root.add(wheel);
  B.add(iron, cylGeo(378, 704, 1.6, DECK_Z + 22, DECK_Z + 31, 8));
  // masts with yards, sails, a crow's nest and rigging
  const sails = [], flags = [];
  [[378, 790, 118, 60, 42], [378, 838, 94, 46, 32]].forEach(([x, y, h, sw, sh], i) => {
    B.add(trim, cylGeo(x, y, 3, DECK_Z, DECK_Z + h, 10, 2));
    const yz = DECK_Z + h * 0.72; const yard = cylGeo(0, 0, 1.6, -sw / 2 - 4, sw / 2 + 4, 8); yard.rotateY(PI / 2); yard.translate(x, y, yz); B.add(trim, yard);
    const s = sailGeo(sw, sh, 9); s.translate(x, y, yz - sh / 2 - 1); sails.push(s);
    if (i === 0) { const nest = latheGeo(x, y, [[0, 0], [7, 0], [8, 9], [6.5, 9], [5.5, 1], [0, 1]], 12); nest.translate(0, 0, DECK_Z + h * 0.86); B.add(trim, nest); }
    // shrouds: rope from the mast top down to the gunwales
    [[x - 36, y - 10], [x + 36, y - 10], [x - 30, y + 24], [x + 30, y + 24]].forEach(p => B.add(ropeMat, tubeGeo([[x, y, DECK_Z + h - 6], [p[0], p[1], DECK_Z + 12]], 0.55, 2, 4)));
    const fg = new THREE.PlaneGeometry(16, 9); fg.translate(8, 0, 0); fg.rotateX(PI / 2); fg.translate(x, y, DECK_Z + h - 2); flags.push({ g: fg, x, y, z: DECK_Z + h - 2 });
  });
  const sailMesh = mesh(mergeGeos(sails), canvasMat); RC.root.add(sailMesh);
  // the black flag with a skull, one mesh for both flags
  const fc = canvas(128, 72), fgc = fc.getContext('2d'); fgc.fillStyle = '#141216'; fgc.fillRect(0, 0, 128, 72);
  fgc.fillStyle = '#efe6d8'; fgc.beginPath(); fgc.arc(64, 28, 16, 0, TAU); fgc.fill(); fgc.fillRect(54, 40, 20, 9); fgc.fillStyle = '#141216'; fgc.beginPath(); fgc.arc(58, 26, 4.5, 0, TAU); fgc.arc(70, 26, 4.5, 0, TAU); fgc.fill(); [56, 62, 68].forEach(x => fgc.fillRect(x, 43, 2.5, 5));
  fgc.strokeStyle = '#efe6d8'; fgc.lineWidth = 4; fgc.beginPath(); fgc.moveTo(34, 60); fgc.lineTo(94, 14); fgc.moveTo(94, 60); fgc.lineTo(34, 14); fgc.stroke();
  const flagMat = new THREE.MeshStandardMaterial({ map: RC.tex(fc), roughness: 0.8, side: THREE.DoubleSide });
  const flagMesh = new THREE.Mesh(mergeGeos(flags.map(f => f.g)), flagMat); flagMesh.castShadow = true; RC.root.add(flagMesh); const flagMeshes = [flagMesh];
  // bowsprit, anchor and the stern lantern cage
  B.add(trim, tubeGeo([[392, 876, DECK_Z + 6], [394, 905, DECK_Z + 16], [396, 926, DECK_Z + 24]], 2.2, 6, 7));
  B.add(ropeMat, tubeGeo([[396, 926, DECK_Z + 24], [378, 838, DECK_Z + 90]], 0.5, 2, 4));
  B.add(iron, tubeGeo([[426, 850, DECK_Z + 8], [432, 842, 30], [436, 836, 14]], 1, 6, 5));
  const anc = [cylGeo(436, 836, 1.2, 2, 16, 6), new THREE.TorusGeometry(5, 1, 6, 12).translate(436, 836, 4)]; B.add(iron, mergeGeos(anc.map(g => g.index ? g.toNonIndexed() : g)));
  B.add(brass, boxGeo(338, 668, DECK_Z + 30, 7, 7, 10)); B.add(RC.mats.clear('#ffd090', 0.35), boxGeo(338, 668, DECK_Z + 30, 5.6, 5.6, 8));
  B.add(brass, cylGeo(338, 668, 1, DECK_Z + 9, DECK_Z + 25, 6));
  // the wheel turns slowly, the sails breathe, the flags flutter
  RC.anim.push((dt, t) => {
    const G = RC.G, stormy = G.b ? G.b.rain : 0;
    wm.rotation.z = Math.sin(t * 0.5) * 0.4 + (stormy ? Math.sin(t * 6) * 0.3 : 0);
    sailMesh.scale.y = 1 + 0.06 * Math.sin(t * 1.3) * (1 + stormy * 2); sailMesh.position.y = -3 * Math.sin(t * 1.3) * (1 + stormy);
    flagMeshes.forEach((m, i) => { m.scale.x = 0.9 + 0.1 * Math.sin(t * (7 + stormy * 6)); m.scale.y = 0.94 + 0.06 * Math.sin(t * 5 + 1); });
  });
  return null;
}
function chestModel(RC) {
  const B = RC.batch, wood = RC.mats.wood('#5a3416', 'chest'), brass = RC.mats.brass(), { x, y, w, d } = CHEST, h = 26;
  // body: floor and four walls (hollow, the balls sit inside), brass bands and corners
  B.add(wood, boxGeo(x, y, 1.5, w, d, 3));
  B.add(wood, boxGeo(x, y - d / 2 + 1.5, h / 2, w, 3, h)); B.add(wood, boxGeo(x, y + d / 2 - 1.5, h / 2, w, 3, h));
  B.add(wood, boxGeo(x - w / 2 + 1.5, y, h / 2, 3, d, h)); B.add(wood, boxGeo(x + w / 2 - 1.5, y, h / 2, 3, d, h));
  [-16, 16].forEach(dx => { B.add(brass, boxGeo(x + dx, y - d / 2, h / 2, 4, 1.2, h + 1)); B.add(brass, boxGeo(x + dx, y + d / 2, h / 2, 4, 1.2, h + 1)); B.add(brass, boxGeo(x + dx, y, h + 0.6, 4, d + 1.2, 1.2)); });
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => B.add(brass, boxGeo(x + sx * (w / 2 - 1), y + sy * (d / 2 - 1), h / 2, 3.2, 3.2, h + 1)));
  // gold inside, round the ball slots
  const gold = new THREE.MeshStandardMaterial({ color: '#f0c040', metalness: 1, roughness: 0.3, emissive: '#6a4000', emissiveIntensity: 0.3 });
  const coins = []; const r = rng(44);
  for (let i = 0; i < 26; i++) { const cx = x - w / 2 + 5 + r() * (w - 10), cy = y - d / 2 + 5 + r() * (d - 10); const c = new THREE.CylinderGeometry(2.4, 2.4, 0.8, 10); c.rotateX(PI / 2); c.rotateZ(r() * 3); c.translate(cx, cy, 3.4 + (i % 3) * 0.8); coins.push(c); }
  const cm = new THREE.Mesh(mergeGeos(coins), gold); cm.receiveShadow = true; RC.root.add(cm);
  // lid: a domed top hinged at the back
  const lid = new THREE.Group(); lid.position.set(x, y + d / 2 - 1, h); RC.root.add(lid);
  const dome = new THREE.CylinderGeometry(d / 2, d / 2, w, 18, 1, false, 0, PI); dome.rotateZ(PI / 2); dome.translate(0, -d / 2 + 1, 0);
  const lidEnds = new THREE.CircleGeometry(d / 2, 18, 0, PI); const e1 = lidEnds.clone(); e1.rotateY(PI / 2); e1.translate(w / 2, -d / 2 + 1, 0); const e2 = lidEnds.clone(); e2.rotateY(-PI / 2); e2.translate(-w / 2, -d / 2 + 1, 0);
  lid.add(mesh(mergeGeos([dome, e1, e2]), wood));
  const bands = [-16, 16].map(dx => { const bnd = new THREE.CylinderGeometry(d / 2 + 0.6, d / 2 + 0.6, 4, 18, 1, true, 0, PI); bnd.rotateZ(PI / 2); bnd.translate(dx, -d / 2 + 1, 0); return bnd; });
  bands.push(new THREE.BoxGeometry(8, 2, 7).translate(0, -d + 1, 2));
  lid.add(mesh(mergeGeos(bands), brass));
  let openK = 0, lastN = 0, lastT = -9;
  RC.anim.push((dt, t) => {
    const G = RC.G, ch = G.comps.chest, n = ch ? ch.balls.length : 0;
    if (n !== lastN) { lastT = t; lastN = n; }
    const want = n > 0 || t - lastT < 2.5 ? 1 : 0;
    openK += (want - openK) * Math.min(1, dt * 3); lid.rotation.x = -openK * 1.35;
    cm.material.emissiveIntensity = 0.3 + openK * 0.6 + (n ? 0.25 * Math.sin(t * 5) : 0);
  });
  return null;
}
function krakenModel(RC) {
  // the Kraken: a domed head (the rock the ball bounces off) with eyes that glow when it is awake, and a skinned
  // tentacle that rises out of the lagoon behind it, arches over the caught ball and drags it under
  const g = new THREE.Group(); g.position.set(KRAKEN.rx, KRAKEN.ry, 0); RC.root.add(g);
  const skinC = canvas(256, 256), sg = skinC.getContext('2d'), r = rng(19);
  sg.fillStyle = '#4a3a66'; sg.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 400; i++) { sg.fillStyle = 'rgba(' + (r() < 0.5 ? '150,70,130' : '40,120,110') + ',' + (0.1 + r() * 0.3) + ')'; sg.beginPath(); sg.arc(r() * 256, r() * 256, 3 + r() * 14, 0, TAU); sg.fill(); }
  // suckers down one side
  for (let yy = 8; yy < 256; yy += 18) for (let xx = 100; xx <= 156; xx += 28) { sg.fillStyle = '#f0d8c8'; sg.beginPath(); sg.arc(xx, yy + (xx % 56 ? 9 : 0), 7, 0, TAU); sg.fill(); sg.fillStyle = '#5a3040'; sg.beginPath(); sg.arc(xx, yy + (xx % 56 ? 9 : 0), 3.5, 0, TAU); sg.fill(); }
  const skin = new THREE.MeshStandardMaterial({ map: RC.tex(skinC), roughness: 0.45, metalness: 0 });
  const head = mesh(new THREE.SphereGeometry(16.5, 22, 14, 0, TAU, 0, PI / 2), skin); head.scale.set(1, 1.1, 0.75); head.position.z = -1; g.add(head);
  const eyeMat = new THREE.MeshStandardMaterial({ color: '#201808', emissive: '#ffd040', emissiveIntensity: 0.1, roughness: 0.3 });
  const eyes = mesh(mergeGeos([new THREE.SphereGeometry(2.8, 10, 8).translate(-6, -13, 7), new THREE.SphereGeometry(2.8, 10, 8).translate(6, -13, 7)]), eyeMat); g.add(eyes);
  // tentacle: a tapered cylinder along z, skinned to a chain of bones
  const N = 8, H = 112, seg = H / N;
  const geo = new THREE.CylinderGeometry(3, 11, H, 12, 32); geo.translate(0, H / 2, 0); geo.rotateX(PI / 2);
  const pos = geo.attributes.position, si = [], sw = [];
  for (let i = 0; i < pos.count; i++) { const z = Math.max(0, pos.getZ(i)); let b = Math.min(N - 1, Math.floor(z / seg)), t = Math.min(1, (z - b * seg) / seg); const b2 = Math.min(N - 1, b + 1); si.push(b, b2, 0, 0); sw.push(1 - t * 0.5, t * 0.5, 0, 0); }
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4)); geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
  const bones = []; for (let i = 0; i < N; i++) { const b = new THREE.Bone(); b.position.z = i ? seg : 0; if (i) bones[i - 1].add(b); bones.push(b); }
  const tent = new THREE.SkinnedMesh(geo, skin); tent.castShadow = true; tent.add(bones[0]); tent.bind(new THREE.Skeleton(bones));
  const tg = new THREE.Group(); tg.position.set(0, 16, -4); tg.add(tent); g.add(tg);
  let rise = 0.5, curl = 0.3, sink = 0, phase = 0;
  RC.anim.push((dt, t) => {
    const G = RC.G, B = G.b || {}, grab = B.grab, mag = G.comps.kraken, awake = !!(mag && mag.active) || !!grab;
    let wantRise = awake ? 0.9 : 0.55, wantCurl = awake ? 0.36 : 0.26, wantSink = 0;
    if (grab) { const k = Math.min(1, grab.t / 0.7); wantRise = 1; wantCurl = 0.36 + 0.14 * k; if (grab.mode === 'lock' && grab.t > 1.05) wantSink = 1; if (grab.mode === 'super' && grab.t > 0.9) { wantCurl = 0.1; wantRise = 1; } }
    rise += (wantRise - rise) * Math.min(1, dt * (grab ? 4 : 1.2)); curl += (wantCurl - curl) * Math.min(1, dt * (grab ? 5 : 1.5)); sink += (wantSink - sink) * Math.min(1, dt * 3.5);
    phase += dt * (grab ? 5 : 1.1);
    tg.position.z = -4 - (1 - rise) * 60 - sink * 95;
    bones.forEach((b, i) => { if (!i) { b.rotation.x = -0.25 + curl * 0.6; b.rotation.y = Math.sin(t * 0.6) * 0.08; return; } b.rotation.x = curl * (0.75 + 0.25 * Math.sin(phase + i * 0.7)) + Math.sin(phase * 1.3 + i) * 0.04; b.rotation.y = Math.sin(phase * 0.8 + i * 0.9) * 0.05; });
    g.rotation.z = Math.sin(t * 0.4) * 0.05; head.position.z = -1 - sink * 20;
    eyeMat.emissiveIntensity = awake ? 2.2 + Math.sin(t * 6) * 0.8 : 0.1;
  });
  return null;
}
function fortModel(RC, fort) {
  const g = new THREE.Group(); g.position.set(FORT.x, FORT.y, 0); g.rotation.z = FORT_ROT;
  const sc = canvas(256, 256), sg = sc.getContext('2d'), r = rng(23);
  sg.fillStyle = '#8c8276'; sg.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 24) for (let x = ((y / 24) % 2) * 24; x < 256; x += 48) { const k = 0.75 + r() * 0.4; sg.fillStyle = 'rgb(' + (140 * k | 0) + ',' + (128 * k | 0) + ',' + (112 * k | 0) + ')'; sg.fillRect(x + 1.5, y + 1.5, 45, 21); sg.fillStyle = 'rgba(255,245,230,.18)'; sg.fillRect(x + 1.5, y + 1.5, 45, 2); }
  for (let i = 0; i < 300; i++) { sg.fillStyle = 'rgba(40,60,30,' + (r() * 0.25) + ')'; sg.fillRect(r() * 256, r() * 256, 2 + r() * 5, 1 + r() * 3); }
  const stoneTex = RC.tex(sc); stoneTex.wrapS = stoneTex.wrapT = THREE.RepeatWrapping; stoneTex.repeat.set(0.5, 0.5);
  const stone = new THREE.MeshStandardMaterial({ map: stoneTex, roughness: 0.88 }), roof = RC.mats.paint('#8a3a2a', { roughness: 0.7 }), wood = RC.mats.wood('#5a3a1e', 'gate');
  const pieces = [];
  const piece = (geo, x, y, z, mat, tiltDir) => { const m = mesh(geo, mat || stone); m.position.set(x, y, z); g.add(m); pieces.push({ m, x, y, z, dir: tiltDir || [0, 0], r: r() - 0.5 }); return m; };
  // front wall in two halves either side of the gate, crenellated
  for (const s of [-1, 1]) { const parts = [new THREE.BoxGeometry(34, 12, 34).translate(0, 0, 17)]; for (let i = 0; i < 3; i++) parts.push(new THREE.BoxGeometry(7, 12, 6).translate(-12 + i * 12, 0, 37)); piece(mergeGeos(parts), s * 31, -20, 0, stone, [s * 0.6, -1]); }
  // the gate arch (lintel over the opening) and the drawbridge
  piece(new THREE.BoxGeometry(30, 12, 10), 0, -20, 30, stone, [0, -1]);
  const gate = mesh(mergeGeos([new THREE.BoxGeometry(24, 2.6, 27), new THREE.BoxGeometry(2, 3.2, 25).translate(-8, 0, 0), new THREE.BoxGeometry(2, 3.2, 25).translate(8, 0, 0)]), wood); gate.position.set(0, 0, 13.5); const gp = new THREE.Group(); gp.position.set(0, -27, 0.5); gp.add(gate); g.add(gp);
  // side and back walls
  piece(mergeGeos([new THREE.BoxGeometry(12, 60, 30).translate(-46, 12, 15), new THREE.BoxGeometry(12, 60, 30).translate(46, 12, 15), new THREE.BoxGeometry(104, 12, 28).translate(0, 42, 14), ...[0, 1, 2, 3, 4, 5, 6].map(i => new THREE.BoxGeometry(8, 12, 5).translate(-42 + i * 14, 42, 30.5))]), 0, 0, 0, stone, [0, 1]);
  // round towers on the front corners, tiled roofs, a lit window, a flag
  for (const s of [-1, 1]) {
    const tw = new THREE.Group(); tw.position.set(s * 46, -22, 0); g.add(tw); pieces.push({ m: tw, x: s * 46, y: -22, z: 0, dir: [s, -0.6], r: r() - 0.5 });
    const sg2 = [cylGeo(0, 0, 13, 0, 50, 14), new THREE.TorusGeometry(13.5, 1.2, 6, 14).translate(0, 0, 48)]; if (s > 0) sg2.push(cylGeo(0, 0, 0.9, 68, 92, 6));
    tw.add(mesh(mergeGeos(sg2), stone)); tw.add(mesh(new THREE.ConeGeometry(16, 20, 14).rotateX(PI / 2).translate(0, 0, 60), roof));
    if (s > 0) { const fl = new THREE.Mesh(new THREE.PlaneGeometry(14, 8).translate(7, 0, 0).rotateX(PI / 2), RC.mats.paint('#c8352e', { side: THREE.DoubleSide })); fl.position.set(0, 0, 88); tw.add(fl); tw.userData.flag = fl; }
  }
  // the keep floor inside (dark flagstones) so the scoop sits in a courtyard
  g.add(mesh(new THREE.BoxGeometry(70, 46, 1.6).translate(0, 10, 0.8), RC.mats.paint('#3a3630', { roughness: 0.95 }), false));
  g.userData.pose = (f, t) => {
    const fall = f.fall, wob = f.wob;
    gp.rotation.x = f.gate * 1.42;
    pieces.forEach((p, i) => {
      const h = 40; p.m.position.z = p.z - fall * h * (0.6 + 0.4 * Math.abs(p.r)) + Math.sin(t * 40 + i) * wob * 0.8;
      p.m.position.x = p.x + fall * p.dir[0] * 14; p.m.position.y = p.y + fall * p.dir[1] * 10;
      p.m.rotation.x = fall * p.dir[1] * 0.5 + Math.sin(t * 30 + i) * wob * 0.03; p.m.rotation.y = fall * p.dir[0] * 0.55 + p.r * fall * 0.3;
    });
    g.traverse(o => { if (o.userData.flag) o.userData.flag.rotation.z = Math.sin(t * 5) * 0.25; });
  };
  return g;
}
function sceneryModel(RC) {
  const B = RC.batch, brass = RC.mats.brass(), iron = RC.mats.iron(), W = RC.W, L = RC.L;
  // lantern posts: a brass post and a little cage round each GI bulb
  [[14, 360], [14, 520], [470, 360], [470, 530], [18, 860], [120, 1040], [300, 1042], [470, 1000], [300, 560]].forEach(([x, y]) => {
    B.add(brass, cylGeo(x, y, 1.6, 0, 26, 8)); B.add(brass, cylGeo(x, y, 4.5, 25, 26.5, 10)); B.add(brass, cylGeo(x, y, 4.2, 34.5, 36.5, 10, 2.5));
    for (let i = 0; i < 4; i++) { const a = i * PI / 2 + PI / 4; B.add(brass, cylGeo(x + Math.cos(a) * 3.6, y + Math.sin(a) * 3.6, 0.45, 26, 35, 4)); }
  });
  // rigging wireform supports: iron struts from the wall tops to the wire
  [[[8, 770, 40], [44, 770, 48]], [[8, 860, 40], [34, 860, 60]], [[50, 968, 40], [50, 968, 76]], [[420, 1010, 40], [420, 1010, 78]], [[466, 958, 40], [466, 958, 70]], [[476, 880, 34], [472, 880, 62]], [[476, 760, 26], [468, 760, 54]], [[476, 640, 26], [462, 640, 44]], [[476, 520, 26], [456, 520, 36]]].forEach(([a, b]) => B.add(iron, tubeGeo([a, b], 1.3, 2, 6)));
  // barrels and crates in the top corners (outside the play area), a palm on the left
  const barrel = (x, y, rr, h) => { B.add(RC.mats.wood('#5a3a1e', 'barrel'), latheGeo(x, y, [[0, 0], [rr * 0.85, 0], [rr, h * 0.3], [rr, h * 0.7], [rr * 0.85, h], [0, h]], 14)); [0.22, 0.78].forEach(k => B.add(iron, latheGeo(x, y, [[rr * 0.9 + 0.3, h * k - 1.5], [rr + 0.5, h * k - 1.5], [rr + 0.5, h * k + 1.5], [rr * 0.9 + 0.3, h * k + 1.5]], 14))); };
  barrel(22, 1000, 12, 30); barrel(44, 1024, 10, 26); barrel(505, 980, 11, 28);
  B.add(RC.mats.wood('#7a5430', 'crate'), boxGeo(498, 1030, 10, 24, 24, 20)); B.add(RC.mats.wood('#7a5430', 'crate'), boxGeo(498, 1030, 26, 18, 18, 12, 0.4));
  // palm: a leaning trunk with fronds
  const trunk = tubeGeo([[14, 1040, 0], [18, 1046, 40], [28, 1050, 80], [42, 1052, 110]], 4, 10, 8); B.add(RC.mats.wood('#6a4a2a', 'palm'), trunk);
  const fronds = []; for (let i = 0; i < 7; i++) { const a = i / 7 * TAU; const f = new THREE.PlaneGeometry(10, 40, 1, 6); const p = f.attributes.position; for (let k = 0; k < p.count; k++) { const y = p.getY(k); p.setZ(k, -y * y * 0.012 - Math.abs(p.getX(k)) * 0.4); } f.translate(0, 20, 0); f.rotateX(-0.4); f.rotateZ(a); fronds.push(f); }
  const fr = mesh(mergeGeos(fronds), RC.mats.paint('#2f7a3a', { side: THREE.DoubleSide, roughness: 0.8 })); fr.position.set(42, 1052, 112); RC.root.add(fr);
  // the lighthouse on the back right, striped, with a lamp room and a sweeping beam
  const lc = canvas(64, 256), lg = lc.getContext('2d'); for (let i = 0; i < 8; i++) { lg.fillStyle = i % 2 ? '#b83a2a' : '#efe6d8'; lg.fillRect(0, i * 32, 64, 32); }
  const lhMat = new THREE.MeshStandardMaterial({ map: RC.tex(lc), roughness: 0.6 });
  const lh = mesh(cylGeo(470, 1052, 13, 0, 118, 16, 10), lhMat); RC.root.add(lh);
  B.add(iron, cylGeo(470, 1052, 12, 118, 121, 16)); B.add(RC.mats.clear('#fff4d0', 0.3), cylGeo(470, 1052, 8, 121, 140, 12)); B.add(iron, latheGeo(470, 1052, [[0, 140], [11, 140], [0, 154]], 12));
  const beamMat = RC.mats.glow('#fff0c0'); beamMat.opacity = 0.55;
  const beam = new THREE.Mesh(new THREE.PlaneGeometry(130, 14).translate(65, 0, 0), beamMat); beam.position.set(470, 1052, 131); beam.renderOrder = 7; RC.root.add(beam);
  // the parrot on a perch at the back left
  const parrot = parrotModel(RC); parrot.position.set(70, 1046, 62); RC.root.add(parrot);
  B.add(brass, cylGeo(70, 1046, 1.8, 0, 56, 8)); B.add(brass, new THREE.TorusGeometry(10, 1.2, 6, 16).translate(70, 1046, 58));
  RC.anim.push((dt, t) => {
    const G = RC.G; beam.rotation.z = PI * 0.9 + Math.sin(t * 0.45) * 0.9; beam.scale.x = 1 + 0.08 * Math.sin(t * 7);
    beamMat.opacity = 0.3 + (G.b ? G.b.rain * 0.3 : 0);
    fr.rotation.z = Math.sin(t * 0.8) * 0.03 * (1 + (G.b ? G.b.rain * 5 : 0));
  });
  return null;
}
function colGeo(geo, hex) { const g = geo.index ? geo.toNonIndexed() : geo; const c = new THREE.Color(hex), n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; }
function mergeCol(list) {
  const m = mergeGeos(list); let n = 0; list.forEach(g => n += g.attributes.position.count); const col = new Float32Array(n * 3); let o = 0;
  for (const g of list) { col.set(g.attributes.color.array, o * 3); o += g.attributes.position.count; } m.setAttribute('color', new THREE.BufferAttribute(col, 3)); return m;
}
function parrotModel(RC) {
  // a parrot on its perch: four meshes (body, head, two wings) with vertex colours
  const g = new THREE.Group(), mat = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.55, clearcoat: 0.25 });
  const RED = '#d8302a', BLUE = '#2a5ad8', YEL = '#f0c040', DARK = '#3a3030', WHITE = '#ffffff', GREEN = '#2f9a4a';
  const body = mesh(mergeCol([
    colGeo(new THREE.SphereGeometry(7, 14, 10).scale(0.8, 1, 1.25).translate(0, 0, 8), RED),
    colGeo(new THREE.BoxGeometry(4, 16, 1.4).translate(0, 9, 0).rotateX(0.5).translate(0, 5, 2), YEL),
    colGeo(cylGeo(-2, 0, 0.6, -4, 0, 5), DARK), colGeo(cylGeo(2, 0, 0.6, -4, 0, 5), DARK)]), mat);
  g.add(body);
  const headG = new THREE.Group(); headG.position.set(0, -2, 17); g.add(headG);
  headG.add(mesh(mergeCol([
    colGeo(new THREE.SphereGeometry(4.8, 14, 10), RED), colGeo(new THREE.ConeGeometry(2.4, 6, 10).rotateX(-PI / 2).translate(0, -6, -0.5), DARK),
    colGeo(new THREE.SphereGeometry(1.1, 8, 6).translate(-2.6, -3.2, 1.2), WHITE), colGeo(new THREE.SphereGeometry(1.1, 8, 6).translate(2.6, -3.2, 1.2), WHITE),
    colGeo(new THREE.SphereGeometry(0.6, 6, 5).translate(-2.7, -4, 1.3), DARK), colGeo(new THREE.SphereGeometry(0.6, 6, 5).translate(2.7, -4, 1.3), DARK)]), mat));
  const wings = [-1, 1].map(s => { const w = mesh(mergeCol([colGeo(new THREE.SphereGeometry(5, 10, 8).scale(0.35, 1, 0.9).translate(0, 1, -2), s < 0 ? BLUE : GREEN)]), mat); const p = new THREE.Group(); p.position.set(s * 5.5, 0, 10); p.add(w); g.add(p); return p; });
  RC.anim.push((dt, t) => {
    const G = RC.G, B = G.b || {}, talking = G.time - (B.saidT || -9) < 2.2, stormy = B.rain || 0;
    headG.rotation.y = Math.sin(t * 0.7) * 0.5 + (talking ? Math.sin(t * 14) * 0.25 : 0); headG.rotation.x = talking ? Math.abs(Math.sin(t * 12)) * 0.25 : Math.sin(t * 0.3) * 0.1;
    headG.position.z = 17 + (talking ? Math.abs(Math.sin(t * 12)) * 1.5 : 0);
    const flap = talking || stormy > 0.3 ? Math.abs(Math.sin(t * 16)) : 0; wings[0].rotation.y = -flap * 0.9; wings[1].rotation.y = flap * 0.9;
    g.rotation.z = Math.sin(t * 0.5) * 0.08 + 0.4;
  });
  return g;
}
function rainModel(RC) {
  const W = RC.W, L = RC.L, c = canvas(256, 512), g = c.getContext('2d'), r = rng(77);
  for (let i = 0; i < 160; i++) { const x = r() * 256, y = r() * 512, len = 10 + r() * 24; g.strokeStyle = 'rgba(220,240,255,' + (0.25 + r() * 0.5) + ')'; g.lineWidth = 0.8 + r() * 0.8; g.beginPath(); g.moveTo(x, y); g.lineTo(x - len * 0.12, y + len); g.stroke(); }
  const layers = [[2, 4, 1.6], [3, 6, 2.6]].map(([rx, ry, sp]) => {
    const t = RC.tex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(W + 60, L + 60), new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    m.position.set(W / 2, L / 2, 92); m.renderOrder = 9; m.visible = false; RC.root.add(m); return { m, t, sp };
  });
  RC.anim.push((dt, t) => {
    const G = RC.G, k = G.b ? G.b.rain : 0;
    layers.forEach((l, i) => { l.t.offset.y -= dt * l.sp; l.t.offset.x += dt * 0.05 * (i + 1); l.m.material.opacity = k * (0.45 - i * 0.12) * (1 + G.lightning * 0.6); l.m.visible = k > 0.02; });
  });
  return null;
}
