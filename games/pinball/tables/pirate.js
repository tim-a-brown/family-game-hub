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
const FORT = { x: 130, y: 930, face: 300 };          // centre and the way it faces
const KRAKEN = { mx: 243, my: 585, rx: 243, ry: 628 }; // magnet and the rock
const CHEST = { x: 125, y: 760, w: 60, d: 44 };
const WHIRL = [262, 880];
const HARBOUR = [54, 482];
const PORTS = ['PORT MARROW', 'SKULL BAY', 'SALT HARBOUR', 'BLACKREEF'];
const PORT_SHOTS = [['orbitL', 'orbitR', 'spinner'], ['plank', 'fort', 'rigging'], ['rigging', 'orbitL', 'kegs'], ['whirl', 'fort', 'orbitR']];
const rot = (cx, cy, a, x, y) => [cx + Math.cos(a) * x - Math.sin(a) * y, cy + Math.sin(a) * x + Math.cos(a) * y];
// the fort in world space: local (x right, y forward = towards the player) rotated so local -y faces FORT.face
const FORT_ROT = deg(FORT.face) + PI / 2;
const fortPt = (x, y) => rot(FORT.x, FORT.y, FORT_ROT, x, y);
const FORT_BLOCK = [fortPt(-52, 46), fortPt(52, 46), fortPt(52, -26), fortPt(-52, -26)];
const CHEST_BOX = [[CHEST.x - CHEST.w / 2, CHEST.y - CHEST.d / 2], [CHEST.x - CHEST.w / 2, CHEST.y + CHEST.d / 2], [CHEST.x + CHEST.w / 2, CHEST.y + CHEST.d / 2], [CHEST.x + CHEST.w / 2, CHEST.y - CHEST.d / 2]];
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
    '<li><b>The fort:</b> three hits lower the drawbridge and raise the palisade targets. Knock the palisade down and the keep opens: shoot inside to start <b>Broadside</b>. Every fort hit in Broadside is worth a cannon jackpot, and three cannon hits bring the fort down for 250,000 and an extra ball.</li>' +
    '<li><b>The Kraken:</b> spell S-E-A on the lagoon targets and the Kraken wakes. Roll past the rock and a tentacle grabs the ball and drags it under to the treasure chest. Three balls in the chest start <b>Kraken Multiball</b>: ramps and orbits are jackpots, then the Kraken itself is the super jackpot.</li>' +
    '<li><b>Plunder ports:</b> knock down the M-A-P drop targets to light Plunder at the harbour scoop (bottom left). Each port lights three shots for 35 seconds; make all three to plunder it. Four ports on the map.</li>' +
    '<li><b>The storm:</b> roll through the whirlpool under the top lanes five times and the sky breaks: rain, lightning, the whirlpool spins and everything scores double for 30 seconds.</li>' +
    '<li><b>Top lanes:</b> A-R-R raises the bonus multiplier; the flippers move the lit lane. Lighting all three the second time lights the lifeboat kickback on the left outlane. The ship\'s wheel spinner on the right orbit pays doubloons.</li>' +
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
  T.scoop({ id: 'harbour', x: HARBOUR[0], y: HARBOUR[1], r: 12, eject: { angle: 318, speed: 1450 }, hold: 1.0 });
  T.wall([[52, 404], [52, 440]], { style: 'wood', r: 4, h: 30, color: '#5a3a1e' });
  T.kickback({ id: 'lifeboat', x: 24, y: 205, power: 2300, label: 'LIFEBOAT', color: '#7fd4ff' });

  // ── Right side: ship's wheel orbit lane, the galleon, the plank ramp, M-A-P drops ──
  T.wall([[478, 612], [474, 588], [464, 572], [448, 562], [432, 558]], { style: 'wood', r: 4, h: 34, color: '#5a3a1e' });
  T.post(432, 556, { style: 'rubber', r: 5 });
  T.spinner({ id: 'spinner', x: 452, y: 612, w: 44, angle: 90, label: '', color: '#d8b26a', art: wheelArt });
  T.dropTargetBank({ id: 'map', x: 455, y: 470, angle: 180, n: 3, w: 22, gap: 4, labels: ['M', 'A', 'P'], color: '#e8d6a8', ink: '#3a2010' });
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
  T.comp(new ShipCannon(T, { id: 'cannon', x: CANNON[0], y: CANNON[1], lvl: 'deck', rest: 150, min: 124, max: 174, power: 2000, barrel: 42 }));

  // ── Centre: the lagoon (Kraken), the whirlpool under the top lanes ──
  const rock = { onContact(b, c, imp) { if (imp > 150) { G.sfx('splash', { vol: 0.35 + 0.4 * Math.min(1, imp / 1500), x: b.x }); G.emit('rockHit', 'rock', b, { imp }); } } };
  T.world.circ(KRAKEN.rx, KRAKEN.ry, 16, { mat: 'toy', owner: rock, id: 'rock' });
  T.ao({ kind: 'dot', x: KRAKEN.rx, y: KRAKEN.ry, r: 22, a: 0.6, blur: 10 });
  T.magnet({ id: 'kraken', x: KRAKEN.mx, y: KRAKEN.my, r: 42, strength: 7500, active: false, manual: true, event: 'kraken' });
  ['S', 'E', 'A'].forEach((ch, i) => T.standupTarget({ id: 'sea' + i, x: 211 + i * 32, y: 672 + (i === 1 ? 8 : 0), angle: 270, w: 20, label: ch, color: '#2fc0c8' }));
  [0, 1, 2].forEach(i => T.insert('seal' + i, 211 + i * 32, 648 + (i === 1 ? 8 : 0), { shape: 'circle', r: 6.5, color: '#7fe8f0', text: 'SEA'[i], size: 7 }));
  T.spinningDisc({ id: 'whirl', x: WHIRL[0], y: WHIRL[1], r: 46, speed: 9, grip: 4.5, on: false, art: whirlArt, color: '#1a6a74' });
  T.world.sensor({ kind: 'circle', x: WHIRL[0], y: WHIRL[1], r: 20, owner: { onSensor(b) { G.emit('whirl', 'whirl', b); } }, id: 'whirl' });
  T.subway({ id: 'deep', hole: false, delay: 1.1, to: { comp: 'chest' }, event: 'deep' });

  // ── The treasure chest (ball lock) ──
  T.wall(CHEST_BOX, { style: 'invisible', mat: 'wood', r: 3, closed: true });
  CHEST_BOX.forEach(p => T.post(p[0], p[1], { style: 'rubber', r: 5 }));
  T.ao({ kind: 'poly', pts: CHEST_BOX, a: 0.55, blur: 10 });
  T.ballLock({ id: 'chest', slots: [[CHEST.x - 14, CHEST.y - 6, 3], [CHEST.x + 14, CHEST.y - 6, 3], [CHEST.x, CHEST.y + 8, 20]], hidden: false, exit: { x: CHEST.x, y: CHEST.y - 44, vx: 0, vy: -380 } });

  // ── The fort on its island (upper left) ──
  T.wall([FORT_BLOCK[0], FORT_BLOCK[1], FORT_BLOCK[2]], { style: 'invisible', mat: 'wood', r: 3 });   // back and right side
  T.wall([FORT_BLOCK[3], FORT_BLOCK[0]], { style: 'invisible', mat: 'wood', r: 3 });                  // left side
  T.wall([FORT_BLOCK[2], fortPt(36, -26)], { style: 'invisible', mat: 'wood', r: 3 });               // front corners
  T.wall([fortPt(-36, -26), FORT_BLOCK[3]], { style: 'invisible', mat: 'wood', r: 3 });
  T.ao({ kind: 'poly', pts: FORT_BLOCK, a: 0.6, blur: 12 });
  T.comp(new Fort(T, { id: 'fort' }));
  T.scoop({ id: 'keep', x: FORT.x, y: FORT.y + 2, r: 11, hood: false, hold: 1.2, eject: { angle: 290, speed: 1250 }, spread: 4 });
  T.popUpTargets({ id: 'palisade', color: '#7a5a34', targets: [0, 1, 2].map(i => { const p = fortPt(-30 + i * 30, -58); return { x: p[0], y: p[1], angle: FORT.face, w: 22 }; }) });
  [0, 1, 2].forEach(i => { const p = fortPt(-30 + i * 30, -82); T.insert('pal' + i, p[0], p[1], { shape: 'triangle', w: 11, h: 11, rot: FORT.face - 270, color: '#ffb060' }); });

  // ── Top: powder kegs (pops) upper right, A-R-R lanes ──
  [['keg1', 366, 902], ['keg2', 410, 940], ['keg3', 352, 956]].forEach(([id, x, y]) => T.popBumper({ id, x, y, r: 21, color: '#ffb060', skirt: '#c8743a', body: '#4a2e18', capArt: kegCap, kick: 1250 }));
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
  ins('harbourL', 86, 452, { shape: 'oval', w: 32, h: 16, rot: -26, color: '#ffd166', text: 'HARBOUR', size: 5.2 });
  ins('plunderL', 110, 494, { shape: 'oval', w: 30, h: 14, rot: -26, color: '#ff8a40', text: 'PLUNDER', size: 5 });
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
  T.flasher('flKrak', 300, 600, { color: '#5fe8d0', r: 9, z0: 0 });
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
    if (this.ball) { this.world.airborne(b, 326, 700, this.z0, -500, -300, 0, 'main'); b.noPath = 0.4; return; }
    this.ball = b; this.world.hold(b, this, {}); b.hidden = false; this.loadT = 0; this.a = deg(this.o.rest);
    this.G.sfx('clank', { vol: 0.7, x: this.x }); this.G.sfx('creak', { vol: 0.35, x: this.x }); this.G.cannon = this; this.G.emit('cannonLoad', this.id, b);
  }
  stepHeld(b) { const L = this.o.barrel - 14; b.x = this.x + Math.cos(this.a) * L * 0.4; b.y = this.y + Math.sin(this.a) * L * 0.4; b.z = this.z0 + 8; }
  onFlip(side, on) {
    if (!this.ball) return;
    if (on) { this.heldSide = side; this.rot = side === 'L' ? 1 : -1; }
    else if (side === this.heldSide) { this.heldSide = null; this.rot = 0; if (this.loadT > 0.35) this.fire(); }
  }
  onFire() { if (!this.ball) return false; this.fire(); return true; }
  landing(sp, vz) {
    // where an airborne ball starting at the muzzle lands (z0 + 20 above the main floor)
    const h = this.z0 + 20, g = 9810 * Math.cos(6.5 * PI / 180);
    const t = (vz + Math.sqrt(vz * vz + 2 * g * h)) / g;
    const mx = this.x + Math.cos(this.a) * this.o.barrel, my = this.y + Math.sin(this.a) * this.o.barrel;
    return [mx + Math.cos(this.a) * sp * t, my + Math.sin(this.a) * sp * t - 0.5 * 1111 * t * t, t];
  }
  fire() {
    const b = this.ball; if (!b) return; this.ball = null; this.rot = 0; this.heldSide = null; if (this.G.cannon === this) this.G.cannon = null;
    const sp = this.o.power, mx = this.x + Math.cos(this.a) * this.o.barrel, my = this.y + Math.sin(this.a) * this.o.barrel;
    let vz = 0;
    for (const tryVz of [0, -500, -900, -1400]) { vz = tryVz; const p = this.landing(sp, vz); if (!NO_LAND.some(poly => inPoly(p[0], p[1], poly))) break; }
    this.world.airborne(b, mx, my, this.z0 + 20, Math.cos(this.a) * sp, Math.sin(this.a) * sp, vz, 'main'); b.hidden = false; b.noPath = 0.5; b.noCap.plank = this.world.time + 1;
    this.recoil = 1; this.smoke = 1;
    this.G.sfx('cannon', { vol: 1, x: this.x }); this.G.shake(1.6); this.G.haptic('heavy'); this.G.flash('#ffd090', 0.35);
    if (this.T.R) { this.T.R.burst(mx, my, this.z0 + 24, 30, 600, '#ffd090'); this.T.R.flashLight(mx, my, this.z0 + 40, '#ffb060', 2.2); }
    this.G.emit('cannonFire', this.id, b, { angle: this.a * 180 / PI });
  }
  trigger() { const b = this.world.addBall(this.x, this.y, { lvl: this.lvl }); this.receive(b); }
  onTilt() { if (this.ball) this.fire(); }
  update(dt) {
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
    const L = this.o.barrel;
    [-7, 7].forEach(y => { const ch = new THREE.Mesh(new THREE.BoxGeometry(L * 0.55, 3.5, 11), wood); ch.position.set(L * 0.1, y, 7.5); ch.castShadow = true; turret.add(ch); });
    [[-4, -9], [-4, 9], [L * 0.28, -9], [L * 0.28, 9]].forEach(([x, y]) => { const w = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 2.4, 14), wood); w.position.set(x, y, 4); w.castShadow = true; turret.add(w); });
    const barrelG = latheGeo(0, 0, [[0, -L * 0.45], [6.5, -L * 0.45], [6.8, -L * 0.3], [5.6, -L * 0.05], [5.2, L * 0.3], [6.2, L * 0.46], [6.2, L * 0.55], [3.6, L * 0.55], [3.6, L * 0.4], [0, L * 0.4]], 18);
    barrelG.rotateX(-PI / 2); barrelG.rotateZ(-PI / 2);   // lathe runs along +x after this
    const barrel = new THREE.Mesh(barrelG, brass); barrel.position.set(L * 0.35, 0, 14); barrel.castShadow = true; turret.add(barrel);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(3.4, 10, 8), brass); knob.position.set(-L * 0.12, 0, 14); turret.add(knob);
    [-5, 5].forEach(y => { const tr = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 4, 8), iron); tr.rotation.x = PI / 2; tr.position.set(L * 0.1, y * 1.6, 14); turret.add(tr); });
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
          if (id === 'plank') { G.cnt('plank'); G.add(10000); if (!R.jp(G, 'plank')) { R.shot(G, 'plank'); } }
          if (id === 'rigging') { G.cnt('rig'); G.add(15000); if (!R.jp(G, 'rigging')) { if (!R.shot(G, 'rigging')) G.msg('THE RIGGING', fmt(20000 * G.mult), {}); } }
          break;
        case 'orbit': G.combo(id); if (!R.jp(G, id)) { if (!R.shot(G, id)) G.msg(id === 'orbitL' ? 'THE COVE' : "THE SHIP'S WHEEL", fmt(G.add(B.storm ? 50000 : 5000)), {}); else G.add(5000); } break;
        case 'cannonLoad': G.msg('CANNON LOADED', 'HOLD A FLIPPER TO AIM, LET GO TO FIRE', { anim: 'cannon', dur: 2.4 }); R.say(G, 'load'); G.pulse('flShip', 0.4); break;
        case 'cannonFire': G.cnt('cannon'); B.cannonBallT = G.time; G.msg('FIRE!', '', { style: 'flash', dur: 0.9, now: true, anim: 'cannon' }); R.say(G, 'fire', true); G.pulse('flShip', 0.3); break;
        case 'fortHit': R.fortHit(G, b, d); break;
        case 'popupHit':
          B.palDown++; G.add(10000); G.pulse('pal' + d.i, 0.3); G.sfx('woodBreak', { vol: 0.7, x: b ? b.x : FORT.x });
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
          else if (!B.stormLitShown || B.whirls < 5) { G.add(3000); G.msg('WHIRLPOOL', (5 - (B.whirls % 5 || (B.whirls >= 5 ? 5 : 0))) + ' MORE FOR THE STORM', { dur: 1 }); }
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
        B.ports[B.port] = 1; G.cnt('port'); G.jackpot(120000, 'PORT PLUNDERED', { color: '#ffd166', sound: 'jackpot' }); R.say(G, 'plundered');
        G.endMode('port'); R.checkCompass(G);
      } else { G.add(30000); G.msg(PORTS[B.port], fmt(30000 * G.mult) + '  ' + left + ' TO GO', { anim: 'ship' }); G.sfx('coins', { vol: 0.5 }); }
      return true;
    },
    jp(G, id) {
      const B = G.b; if (!(B.jpLit[id] || B.davy)) return false;
      const v = B.davy ? 100000 : 60000;
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
        G.add(25000); G.msg('DIRECT HIT', fmt(25000 * G.mult), { anim: 'cannon' });
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
      G.jackpot(250000, 'THE FORT IS TAKEN', { color: '#ff8a40', sound: 'jackpot' }); G.lightExtra(); R.say(G, 'taken', true); G.callout('FORT TAKEN', '#ffb060');
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
      if (B.davy || (B.krakenMB && B.superLit)) { B.grab = { b, t: 0, mode: 'super' }; B.superLit = false; G.jackpot(B.davy ? 300000 : 200000, 'KRAKEN SUPER JACKPOT', { color: '#5fe8d0' }); if (B.krakenMB) B.jpLit = { orbitL: 1, orbitR: 1, rigging: 1, plank: 1 }; }
      else { B.grab = { b, t: 0, mode: 'lock' }; B.krakenLit = false; B.sea = [0, 0, 0]; G.msg('THE KRAKEN', 'HAS YOUR BALL', { anim: 'kraken', now: true }); R.say(G, 'grab', true); }
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
        const g = B.grab; g.t += dt;
        if (g.b.removed || (mag.held !== g.b && g.t < 0.2)) { B.grab = null; }
        else if (g.mode === 'lock' && g.t > 1.6 && mag.held === g.b) { mag.held = null; G.comp('deep').take(g.b, 1.1); G.sfx('splash', { vol: 0.9, x: KRAKEN.mx }); if (G.T.R) G.T.R.burst(KRAKEN.rx, KRAKEN.ry, 6, 24, 450, '#8fe8f0'); }
        else if (g.mode === 'super' && g.t > 1.0 && mag.held === g.b) { mag.fling(80 + Math.random() * 20, 1100); }
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
      L.keg1 = L.keg2 = L.keg3 = B.davy ? 'blink' : lit('kegs') ? 'blink' : 0.15;
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
