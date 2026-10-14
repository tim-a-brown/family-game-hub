// ═══════════════════════════════════════════════════════════════════════════
// HAUNTED MANOR — the reference table.
// A Victorian manor at midnight on three levels: the main floor, the ATTIC
// (a raised mini-playfield up the Attic Stairs ramp, with its own flipper) and
// the CELLAR (a basement playfield seen through the cracked floor, reached by
// the trap door, with its own flippers). Signature toys: a skeletal hand that
// rises from a coffin and drags the ball in (lock), Mist Multiball (a magnet
// drags a glowing spectral ball across the floor: hit it to free it), a
// chandelier ring-catch, Lights Out, a hologram ghost and a talking host.
// Wizard mode: THE WITCHING HOUR.
// ═══════════════════════════════════════════════════════════════════════════
import * as THREE from 'three';
import { BR, spline, deg } from '../physics.js';
import { canvas, rng, shade, rgba, hexRgb, latheGeo, cylGeo, tubeGeo, boxGeo, offsetLine, glowAt, grain, textLogo, bgPuff, bgCloud, bgStars, bgRays, bgHaze, bgTexture, bgVignette } from '../gfx.js';

const PI = Math.PI, TAU = PI * 2;
const PAL = { night: '#0b0918', plum: '#2a1838', moss: '#7fd4a4', spirit: '#9fffd0', candle: '#ffb45a', blood: '#c0283a', violet: '#b48cff', bone: '#efe6cf', gold: '#e8c070' };
const fmt = n => Math.round(n).toLocaleString('en-US');

// ── Layout constants ───────────────────────────────────────────────────────
const ATTIC_Z = 56, CELLAR_Z = -46;
const ATTIC_POLY = [[70, 830], [70, 900], [100, 944], [150, 982], [200, 1000], [200, 830]];
const CELLAR_BOX = [136, 318, 350, 528];
const WINDOW = [[156, 334], [196, 330], [238, 338], [286, 330], [330, 338], [338, 372], [332, 410], [340, 446], [326, 478], [282, 482], [244, 474], [200, 483], [158, 476], [150, 440], [158, 402], [148, 368]];
const COFFIN = [[240, 646], [284, 646], [292, 690], [287, 762], [262, 780], [237, 762], [232, 690]];
const SAUCER = [262, 624];
const CHAND = [243, 576];
const TRAP = [243, 505];

export default {
  id: 'haunted', name: 'Haunted Manor', short: 'MANOR', diff: 3, color: '#7fd4a4', wizard: 'the Witching Hour',
  desc: 'Three floors of ghosts: the attic, the cellar, a grasping hand and the Witching Hour.',
  intro: 'ENTER IF YOU DARE',
  display: { type: 'dmd', color: '#ff8a1e' },
  msgStyle: 'creep',
  music: { url: '../sounds/pinball/haunted.mp3', samples: 1280000, rate: 32000 },
  speech: { pitch: 0.35, rate: 0.82, voice: 'Daniel|Fred|Male|Google UK English Male' },
  rulesHtml:
    '<p>A Victorian manor at midnight, on three floors. Your host is not friendly.</p><ul>' +
    '<li><b>The coffin:</b> knock on its foot three times to light the lock. Then shoot the lit hole in front of it: a skeletal hand rises, grabs the ball and drags it into the coffin. Three balls in the coffin start <b>Grave Robber multiball</b>: ramps and orbits are jackpots, then the coffin is the super jackpot.</li>' +
    '<li><b>The attic:</b> the left ramp climbs the stairs to a little playfield with its own flipper. Hit W-I-L to read the will (extra ball, then big points). The drain hole sends you down the bannister to your left flipper.</li>' +
    '<li><b>The cellar:</b> spell R-I-P in the top lanes (the flippers move the lit lane) and the trap door opens. Fall through and play the cellar under the cracked floor with its own flippers. Hit both bones and the secret stairs for the crypt jackpot; the stairs take you up to the attic.</li>' +
    '<li><b>Mist multiball:</b> three Spirit Walk wire ramps light it at the séance scoop on the right. A glowing ball drifts across the floor: hit it with yours to set it free.</li>' +
    '<li><b>Lights Out:</b> knock down the three portraits to light it at the séance scoop. Everything goes dark but your ball\'s glow and the flippers, lightning shows the way, scores are doubled, and the ghost is worth a jackpot.</li>' +
    '<li><b>B-O-O</b> on the side of the coffin lights the chandelier: it catches the ball with a magnet for a séance award, and adds a magnet charge.</li>' +
    '<li><b>Magnet:</b> one Magna-Save per ball on the left outlane (MAGNET button or A). The right outlane has a kickback.</li>' +
    '<li><b>The Witching Hour:</b> play Lights Out, Mist, Grave Robber, the attic will and the crypt to fill the clock, then shoot the séance scoop: four balls, every shot a jackpot.</li></ul>',
  theme: {
    playfield: '#120d1e', cabinet: '#1a1024', wood: '#3a2416', rails: 'chrome', rubber: '#121212', postColor: '#2a2236', postRubber: '#151515',
    flipper: '#ece6d6', flipperRubber: '#2d8a5c', flipperStripe: '#1c5c3c', popBody: '#2b2238', apron: '#1a1226', slingPlastic: '#20142c',
    gi: ['#ffc98a', '#ffc98a', '#ffd9a8', '#ffc98a', '#ffb45a'], giPos: [[34, 250, 150], [440, 250, 150], [40, 640, 160], [440, 700, 160], [243, 900, 150, 0.8]], giLevel: 1.1,
    env: ['#ffc98a', '#9fffd0', '#b48cff'], sky: '#9a90d0', keyColor: '#dfe6ff', key: 1.0, ambient: 0.32, exposure: 1.05, bloom: 0.6,
    spark: '#b8ffd8', room: '#06050a', darkLight: '#fff0d0', lampGain: 3.4, button: '#7fd4a4', knob: '#e8dcc0'
  },
  art: {
    playfield: paintPlayfield, overlay: paintOverlay, backglass: paintBackglass, apron: paintApron, sides: paintSides, backboard: paintBackboard,
    sling(g, w, h, side) { const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#2a1838'); gr.addColorStop(1, '#120a1c'); g.fillStyle = gr; g.fillRect(0, 0, w, h); web(g, side === 'L' ? 0 : w, 0, w * 0.9, side === 'L' ? 1 : -1); g.fillStyle = 'rgba(159,255,208,.85)'; g.font = '700 30px Cinzel, Georgia'; g.textAlign = 'center'; g.fillText('BOO', w / 2, h * 0.62); }
  },
  fit: { top: 120, lookY: 0.47 },
  anims: {
    ghost(g, t, W, H) { pixGhost(g, 20 + ((t * 40) % (W + 40)) - 20, 8 + Math.sin(t * 6) * 2); pixGhost(g, W - ((t * 32) % (W + 40)), 14 + Math.sin(t * 5 + 1) * 2); },
    bats(g, t, W, H) { g.fillStyle = '#888'; for (let i = 0; i < 6; i++) { const x = (i * 31 + t * 60) % W, y = 4 + (i * 7) % 20 + Math.sin(t * 9 + i) * 2, f = Math.sin(t * 20 + i) > 0; g.fillRect(x, y, 1, 1); g.fillRect(x - 2, y - (f ? 1 : 0), 2, 1); g.fillRect(x + 1, y - (f ? 1 : 0), 2, 1); } },
    hand(g, t, W, H) { const up = Math.min(1, t / 0.6); g.fillStyle = '#777'; const x = W - 30, y = H - up * 22; g.fillRect(x, y, 10, 30); for (let i = 0; i < 4; i++) g.fillRect(x - 1 + i * 3, y - 7 + (i === 0 || i === 3 ? 2 : 0), 2, 8); g.fillRect(x - 4, y + 2, 4, 2); },
    lightning(g, t, W, H) { if (Math.floor(t * 10) % 3 === 0) { g.fillStyle = '#666'; g.fillRect(0, 0, W, H); } g.strokeStyle = '#fff'; g.lineWidth = 1; g.beginPath(); let x = W * 0.7; g.moveTo(x, 0); for (let y = 4; y < H; y += 4) { x += (Math.sin(y * 3.1 + t) * 6); g.lineTo(x, y); } g.stroke(); },
    clock(g, t, W, H) { g.strokeStyle = '#888'; g.beginPath(); g.arc(18, 16, 13, 0, TAU); g.stroke(); const a = -PI / 2 + t * 2; g.strokeStyle = '#fff'; g.beginPath(); g.moveTo(18, 16); g.lineTo(18 + Math.cos(a) * 10, 16 + Math.sin(a) * 10); g.stroke(); g.beginPath(); g.moveTo(18, 16); g.lineTo(18, 7); g.stroke(); }
  },
  build,
  rules: makeRules(),
  explain: makeExplain(),
  cardFont: '"Cinzel", Georgia, serif'
};

// ═══════════════════════════════════════════════════════════════════════════
// BUILD
// ═══════════════════════════════════════════════════════════════════════════
function build(T) {
  const W = T.W, L = T.L;
  // ── Shooter lane, arch, lower playfield ──
  T.shooter({ min: 700, max: 3900 });
  const low = T.lower({ flipColor: '#ece6d6', flipRubber: '#2d8a5c', bxColor: '#ffc83d', saveColor: '#ff4058', extraColor: '#ff9a40', bxY: 302 });

  // ── Left side: orbit lane with its curved return, portraits, magna-save ──
  // left wall below the arch (the arch already reaches x=2 at y=L-258)
  T.wall([[2, 612], [6, 588], [16, 570], [32, 558], [52, 552]], { style: 'wood', r: 4, h: 34 });
  T.post(54, 552, { style: 'rubber', r: 5 });
  // orbit inner wall: the attic block's left side
  T.wall([[64, 610], [64, 830]], { style: 'metal', h: 26 });
  T.post(64, 607, { style: 'rubber', r: 5 });
  // attic block on the main floor (stone foundation; the attic deck sits on top)
  const atticArc = T.arcPts(260, 802, 216, 156, 103, 10);
  T.wall([[64, 830], [66, 888]].concat(atticArc).concat([[204, 1008], [204, 830], [120, 830], [64, 830]]), { style: 'wood', r: 4, h: 40, color: '#2a2030' });
  T.spinner({ id: 'spinner', x: 33, y: 700, w: 46, angle: 90, label: 'HALL', color: '#cfc4e8', art: spinArt });
  T.orbit({ id: 'orbitL', a: [8, 660, 60, 660], dirA: [0, 1], b: [430, 660, 478, 660], dirB: [0, -1] });
  T.orbit({ id: 'orbitR', a: [430, 660, 478, 660], dirA: [0, 1], b: [8, 660, 60, 660], dirB: [0, -1] });
  // portraits: three drop targets on the left facing right
  T.wall([[52, 404], [52, 548]], { style: 'wood', r: 4, h: 34 });
  T.dropTargetBank({ id: 'portraits', x: 66, y: 448, angle: 0, n: 3, w: 25, gap: 3, labels: ['', '', ''], art: portraitArt, color: '#d8c8a0' });
  ['p0', 'p1', 'p2'].forEach((id, i) => T.insert(id, 96, 420 + i * 28, { shape: 'rect', w: 12, h: 18, round: 3, color: '#ffd27a' }));
  T.magnaSave({ id: 'magna', x: 24, y: 262, r: 28, color: '#5fd0ff' });

  // ── Right side: orbit lane with curved return, séance scoop, kickback ──
  T.wall([[478, 612], [474, 588], [464, 572], [448, 562], [432, 558]], { style: 'wood', r: 4, h: 34 });
  T.wall([[426, 620], [426, 800]], { style: 'metal', h: 26 });
  T.post(426, 617, { style: 'rubber', r: 5 });
  T.post(432, 556, { style: 'rubber', r: 5 });
  T.scoop({ id: 'seance', x: 458, y: 452, r: 12, eject: { angle: 206, speed: 1500 }, hold: 1.0 });
  T.wall([[444, 490], [478, 518]], { style: 'metal', h: 24 });
  T.kickback({ id: 'kickback', x: 461, y: 205, power: 2400, label: 'RESURRECT', color: '#7fd4a4' });

  // ── Centre: the coffin with the grasping hand, B-O-O on its side ──
  const coffinTgt = { onContact(b, c, imp) { T.G.emit('coffinHit', 'coffin', b, { imp }); } };
  T.world.seg(COFFIN[6][0], COFFIN[6][1], COFFIN[0][0], COFFIN[0][1], { mat: 'toy', r: 3, mute: true });
  T.world.seg(COFFIN[0][0], COFFIN[0][1], COFFIN[1][0], COFFIN[1][1], { mat: 'wood', r: 3, owner: coffinTgt, id: 'coffin' });
  T.wall(COFFIN.slice(1).concat([COFFIN[0]]), { style: 'invisible', mat: 'wood', r: 3 });
  T.ao({ kind: 'poly', pts: COFFIN, a: 0.6, blur: 12 });
  T.scoop({ id: 'coffinSaucer', x: SAUCER[0], y: SAUCER[1], r: 11, maxV: 2600, hood: false, hold: 0.5, eject: { angle: 270, speed: 900 } });
  T.G.comps.coffinSaucer.sens.on = false;
  ['B', 'O', 'O'].forEach((ch, i) => T.standupTarget({ id: 'boo' + i, x: 226, y: 688 + i * 26, angle: 180, w: 20, label: ch, color: '#9fffd0' }));
  ['boo0', 'boo1', 'boo2'].forEach((id, i) => T.insert('bool' + i, 206, 688 + i * 26, { shape: 'circle', r: 6.5, color: '#9fffd0', text: 'BOO'[i], size: 7 }));
  T.ballLock({ id: 'coffinLock', slots: [[262, 700, -30], [262, 724, -30], [262, 748, -30]], hidden: true, exit: { x: SAUCER[0], y: SAUCER[1] + 2, vx: 0, vy: -900 } });
  T.grabber({ id: 'hand', home: [262, 700, -34], riseH: 52, route: [[SAUCER[0], SAUCER[1], 0], [262, 636, 20], [262, 660, 40], [262, 684, 30], [262, 704, -6]], speed: 90, drop: 'keep',
    onDrop: b => T.G.call('event', 'handDone', 'hand', b), model: handModel, animate: handAnimate });

  // ── Chandelier ring-catch, mist path, trap door to the cellar ──
  T.ringCatch({ id: 'chandelier', x: CHAND[0], y: CHAND[1], r: 30, strength: 8000, hold: 2.4, active: false, toy: chandelierModel, animate: chandelierAnimate, releaseAngle: 270, releaseSpeed: 500 });
  T.mistMagnet({ id: 'mist', path: [[74, 568], [150, 572], [243, 576], [320, 580], [372, 600], [400, 636]], speed: 32, breakSpeed: 300 });
  T.trapDoor({ id: 'cellarDoor', x: TRAP[0], y: TRAP[1], r: 17, to: { lvl: 'cellar', x: 243, y: 500 }, art: doorArt });

  // ── The cellar (basement): seen through the cracked floor ──
  T.miniField({ id: 'cellar', z: CELLAR_Z, box: CELLAR_BOX, window: WINDOW, floor: '#1c1820', paint: paintCellar, light: '#8a6aff', lightK: 0.05,
    walls: [[[140, 528], [140, 392], [166, 366]], [[346, 528], [346, 392], [320, 366]], [[140, 528], [346, 528]]], wallStyle: 'wood', wallColor: '#2a2028' });
  T.flipper({ id: 'cflipL', x: 181, y: 352, side: 'L', len: 48, r1: 9, r2: 5.5, lvl: 'cellar', key: 'L', color: '#cfc6b0', rubber: '#5a2a7a' });
  T.flipper({ id: 'cflipR', x: 305, y: 352, side: 'R', len: 48, r1: 9, r2: 5.5, lvl: 'cellar', key: 'R', color: '#cfc6b0', rubber: '#5a2a7a' });
  T.popBumper({ id: 'furnace', x: 243, y: 428, r: 17, lvl: 'cellar', color: '#ff7a3a', kick: 1100, capArt: skullCap });
  T.standupTarget({ id: 'boneL', x: 162, y: 430, angle: -30, w: 22, lvl: 'cellar', label: '', color: '#efe6cf', art: boneArt });
  T.standupTarget({ id: 'boneR', x: 324, y: 430, angle: 210, w: 22, lvl: 'cellar', label: '', color: '#efe6cf', art: boneArt });
  T.wall([[140, 446], [162, 410]], { style: 'invisible', lvl: 'cellar', mat: 'wood' });
  T.wall([[346, 446], [324, 410]], { style: 'invisible', lvl: 'cellar', mat: 'wood' });
  T.subway({ id: 'stairs', x: 306, y: 462, r: 12, lvl: 'cellar', delay: 1.4, cut: false, to: { x: 96, y: 920, lvl: 'attic', vx: 260, vy: -60 } });
  T.subway({ id: 'cellarReturn', hole: false, delay: 0.9, to: { x: 62, y: 352, vx: 10, vy: -300 } });

  // ── The attic (upper playfield) ──
  T.miniField({ id: 'attic', z: ATTIC_Z, box: [70, 830, 200, 1000], poly: ATTIC_POLY, floor: '#3a2618', paint: paintAttic, legs: [[78, 838], [194, 838]], wallStyle: 'wood', wallColor: '#4a3020', wallH: 24 });
  T.flipper({ id: 'aflip', x: 86, y: 874, side: 'L', len: 54, r1: 9.5, r2: 5.5, lvl: 'attic', key: 'L', color: '#cfc6b0', rubber: '#8a2a3a' });
  T.wall([[200, 902], [176, 866]], { style: 'metal', lvl: 'attic', h: 20 });
  [['W', 132, 966, -70], ['I', 160, 978, -80], ['L', 188, 988, -88]].forEach(([ch, x, y, a], i) => T.standupTarget({ id: 'will' + i, x, y, angle: a, w: 20, lvl: 'attic', label: ch, color: '#e8c070' }));
  T.scoop({ id: 'mirror', x: 96, y: 924, r: 11, lvl: 'attic', hood: false, hold: 0.8, eject: { angle: 300, speed: 600 } });
  // attic drain: down the bannister (a long wireform) to the left inlane
  T.vuk({ id: 'bannister', x: 160, y: 848, r: 12, lvl: 'attic', power: 260, hold: 0.25, style: 'wire', wireMat: 'iron', exitLvl: 'main', supportEvery: 140,
    path: [[160, 848, ATTIC_Z - 14], [150, 822, ATTIC_Z - 16], [116, 800, 48], [70, 770, 48], [36, 720, 46], [28, 640, 44], [30, 540, 40], [40, 450, 34], [54, 390, 24], [62, 352, 12]] });

  // ── Ramps ──
  // Attic Stairs: a clear plastic ramp from the left up to the attic
  T.ramp({ id: 'stairs', style: 'plastic', w: 44, color: '#c8a8ff', opacity: 0.38, exitLvl: 'attic', entryMin: 150, minExit: 260,
    pts: [[116, 600, 0], [124, 640, 3], [140, 688, 18], [158, 740, 38], [172, 790, 52], [178, 832, ATTIC_Z + 1], [180, 846, ATTIC_Z]] });
  // Spirit Walk: an iron wireform up the right side, round the top and down to the right inlane
  T.ramp({ id: 'spirit', style: 'wire', wireMat: 'iron', w: 40, exitLvl: 'main', entryMin: 150, minExit: 300,
    pts: [[392, 660, 0], [396, 700, 8], [404, 760, 30], [412, 830, 54], [420, 900, 70], [436, 948, 78], [462, 956, 78], [474, 920, 74], [462, 840, 66], [456, 740, 58], [454, 620, 48], [452, 520, 40], [444, 430, 30], [430, 370, 18], [424, 346, 12]] });
  // posts flanking the ramp mouths
  T.post(90, 604, { style: 'rubber', r: 5 }); T.post(142, 596, { style: 'rubber', r: 5 });
  T.post(370, 664, { style: 'rubber', r: 5 }); T.post(416, 656, { style: 'rubber', r: 5 });
  // the space under the Attic Stairs is closed (a staircase): wall along the ramp's right edge up to the attic
  { const sp = spline([[116, 600, 0], [124, 640, 3], [140, 688, 18], [158, 740, 38], [172, 790, 52], [178, 832, ATTIC_Z]], 6).map(p => [p[0], p[1]]);
    T.wall(offsetLine(sp, -23).filter(p => p[1] < 830).concat([[184, 830]]), { style: 'invisible', mat: 'plastic', r: 2.5 }); }
  // close the slots between the orbit lanes and the ramp mouths
  T.wall([[64, 609], [90, 604]], { style: 'metal', h: 24 }); T.wall([[416, 656], [426, 619]], { style: 'metal', h: 24 });

  // ── Upper right: pop bumpers ('spirits') and the R-I-P top lanes ──
  [['pop1', 296, 846], ['pop2', 382, 848], ['pop3', 340, 922]].forEach(([id, x, y]) => T.popBumper({ id, x, y, r: 23, color: '#7dffbf', skirt: '#4ad89a', body: '#2b2238', capArt: ghostCap }));
  [['laneR', 244], ['laneI', 284], ['laneP', 324]].forEach(([id, x], i) => T.rolloverLane({ id, x, y: 992, r: 11, color: '#ff8a40', lampDy: -30, shape: 'circle', lampR: 8, text: 'RIP'[i], textSize: 9 }));
  [224, 264, 304, 344].forEach(x => { T.wall([[x, 976], [x, 1012]], { style: 'metal', h: 22 }); T.post(x, 976, { style: 'metal', r: 3 }); });

  // ── Inserts ──
  const ins = (id, x, y, o) => T.insert(id, x, y, o);
  ins('arrOrbL', 36, 744, { shape: 'arrow', w: 16, h: 28, color: '#9fffd0', label: 'HALL', ly: -22, labelSize: 5.5 });
  ins('arrStairs', 112, 562, { shape: 'arrow', w: 18, h: 30, rot: -14, color: '#c8a8ff', label: 'ATTIC', ly: -24, labelSize: 6 });
  ins('lock', 274, 600, { shape: 'arrow', w: 16, h: 24, rot: -18, color: '#ff4058' });
  ins('arrSpirit', 392, 612, { shape: 'arrow', w: 18, h: 30, rot: 4, color: '#9fffd0', label: 'SPIRIT WALK', ly: -24, labelSize: 5.5 });
  ins('arrOrbR', 452, 600, { shape: 'arrow', w: 16, h: 26, color: '#9fffd0', label: 'HALL', ly: -21, labelSize: 5.5 });
  ins('seanceL', 432, 420, { shape: 'oval', w: 30, h: 16, rot: 26, color: '#b48cff', text: 'SEANCE', size: 5.5 });
  ins('chandL', CHAND[0], CHAND[1], { shape: 'ring', r: 19, ring: 4, color: '#ffd27a' });
  ins('cellarL', TRAP[0], TRAP[1], { shape: 'ring', r: 21, ring: 4, color: '#ff8a40' });
  ['VIII', 'IX', 'X', 'XI', 'XII'].forEach((n, i) => { const a = deg(160 - i * 35), r = 35; ins('hour' + i, TRAP[0] + Math.cos(a) * r, TRAP[1] + Math.sin(a) * r, { shape: 'circle', r: 7, color: i === 4 ? '#ff4058' : '#ffd27a', text: n, size: 5.2 }); });
  ins('mistL', 172, 540, { shape: 'oval', w: 28, h: 14, rot: 10, color: '#9fffd0', text: 'MIST', size: 6 });
  ins('darkL', 314, 540, { shape: 'oval', w: 30, h: 14, rot: -10, color: '#b48cff', text: 'LIGHTS', size: 5.2 });
  ins('mbL', 196, 610, { shape: 'diamond', w: 14, h: 14, color: '#ff4058' });
  ins('ebL', 318, 612, { shape: 'diamond', w: 14, h: 14, color: '#ff9a40' });
  T.flasher('fl1', 110, 990, { color: '#9fffd0', r: 10, z0: 40 });
  T.flasher('fl2', 470, 990, { color: '#ff7040', r: 10, z0: 40 });
  T.flasher('flC', 300, 790, { color: '#ff4058', r: 9, z0: 0 });
  // GI bulbs along the sides
  [[14, 360], [14, 520], [470, 360], [470, 520], [20, 820], [235, 1030], [440, 1010]].forEach((p, i) => T.bulb('gi' + i, p[0], p[1], 12, { color: '#ffc98a', r: 3, k: 3, on: 1 }));
  // candles on the backboard ledge and by the coffin
  [[40, 1046], [212, 1046], [470, 1046], [302, 650]].forEach((p, i) => T.bulb('candle' + i, p[0], p[1], p[2] || 34, { color: '#ffb45a', r: 2.2, k: 6, on: 1 }));

  // ── The hologram ghost (Pepper's ghost) ──
  T.hologram({ id: 'ghost', size: [80, 100], hit: 30, draw: drawGhost,
    path: t => [243 + 120 * Math.sin(t * 0.21) * Math.cos(t * 0.13), 690 + 150 * Math.sin(t * 0.17 + 1), 30 + 8 * Math.sin(t * 0.9)] });

  // ── Scenery models ──
  T.model(RC => coffinModel(RC));
  T.model(RC => manorModel(RC));
  T.model(RC => portraitsModel(RC));
  T.model(RC => sceneryModel(RC));
  T.model(RC => { RC.anim.push((dt, t) => candleFlicker(RC, t)); return null; });
}

// ═══════════════════════════════════════════════════════════════════════════
// RULES
// ═══════════════════════════════════════════════════════════════════════════
function makeRules() {
  const LINES = {
    start: ['Welcome to my manor.', 'Enter... if you dare.', 'Another guest. How delightful.'],
    lock: ['The hand has you.', 'Into the coffin.', 'One more for my collection.'],
    mb: ['Grave robbers! Get them!', 'The dead are rising!'],
    dark: ['Lights out.', 'Who turned out the lights?', 'Now you see me...'],
    mist: ['The mist is rising.', 'Catch it, if you can.'],
    attic: ['Up to the attic.', 'Mind the cobwebs.'],
    cellar: ['Do not go down to the cellar.', 'The cellar welcomes you.'],
    ghost: ['Boo!', 'You cannot catch me.', 'Ha ha ha ha.'],
    drain: ['You cannot escape.', 'Stay a while. Stay forever.', 'Ha ha ha.'],
    jackpot: ['Jackpot.', 'Grave robber jackpot!'],
    witch: ['The clock strikes twelve. The witching hour has come!'],
    extra: ['Shoot again, if you dare.']
  };
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const R = {
    modes: {
      lightsout: G => R.startDark(G), mist: G => R.startMist(G), grave: G => { G.b.locks = 2; G.b.lockLit = true; }, witch: G => R.startWitch(G),
      attic: G => { const b = G.liveBalls()[0]; if (b) G.world.place(b, 120, 900, 'attic', 0, -200); }, cellar: G => { G.comp('cellarDoor').open(); }
    },
    init(G) {
      G.b = { coffinHits: 0, coffinNeed: 3, lockLit: false, locks: 0, rip: [0, 0, 0], ripLit: 0, boo: [0, 0, 0], will: [0, 0, 0], willDone: 0,
        bones: [0, 0], stairsHit: 0, walks: 0, mistLit: false, darkLit: false, hours: [0, 0, 0, 0, 0], witchLit: false,
        jp: 0, jpLit: {}, superLit: false, darkJp: 50000, saidT: -9, lastTaunt: -9, cellarT: 0, wailT: 0, organT: 0, nextStrike: 2, grave: false, mistOn: false, witch: false };
      G.say(pick(LINES.start));
    },
    say(G, k, force) { if (G.time - G.b.saidT < 3.5 && !force) return; if (G.say(pick(LINES[k]), { force })) G.b.saidT = G.time; },
    ballStart(G) {
      const B = G.b; B.ripLit = Math.floor(Math.random() * 3);
      G.comp('magna').charges = 1; G.comp('magna').enabled = true;
      if (B.locks && !B.grave) B.lockLit = B.coffinHits >= B.coffinNeed;
    },
    ballEnd(G) {
      const B = G.b; G.comp('mist').stop(); B.mistOn = false; B.grave = false; B.witch = false; B.jpLit = {}; B.superLit = false;
      G.comp('chandelier').active = false;
      if (!G.tilted) R.say(G, 'drain');
    },
    serve(G) { G.b.ripLit = (G.b.ripLit + 1) % 3; },
    skill(G, type, id) { if (type === 'lane') return id === ['laneR', 'laneI', 'laneP'][G.b.ripLit]; if (type === 'pop' || type === 'orbit' || type === 'ramp') return false; },
    flip(G, side, on) {
      if (!on || G.state !== 'play' && G.state !== 'serve') return;
      const B = G.b; B.ripLit = (B.ripLit + (side === 'R' ? 1 : 2)) % 3;   // lane change
      const r = B.rip; if (side === 'R') B.rip = [r[2], r[0], r[1]]; else B.rip = [r[1], r[2], r[0]];
    },
    spinValue() { return 150; },
    event(G, type, id, b, d) {
      const B = G.b, T = G.T, dark = G.darkT > 0;
      switch (type) {
        case 'pop': if (B.witch) G.add(5000); if (id === 'furnace') G.add(1500); break;
        case 'drop': G.pulse('p' + d.i, 0.3); break;
        case 'bank':
          G.cnt('portraits');
          if (!B.darkLit && G.darkT <= 0) { B.darkLit = true; G.msg('THE PORTRAITS STARE', 'LIGHTS OUT IS LIT', { anim: 'bats' }); G.sfx('organHit', { vol: 0.5 }); }
          else G.msg('PORTRAIT GALLERY', '25,000'), G.add(25000);
          break;
        case 'target':
          if (/^boo\d$/.test(id)) {
            B.boo[+id[3]] = 1; G.pulse('bool' + id[3], 0.3);
            if (B.boo.every(Boolean)) { B.boo = [0, 0, 0]; G.cnt('boo'); G.add(20000); G.comp('magna').charges++; const ch = G.comp('chandelier'); ch.active = true; G.msg('B-O-O', 'THE CHANDELIER STIRS', {}); G.sfx('chains', { vol: 0.7 }); }
          } else if (/^will\d$/.test(id)) {
            B.will[+id[4]] = 1;
            if (B.will.every(Boolean)) { B.will = [0, 0, 0]; B.willDone++; G.cnt('attic'); R.hour(G, 3);
              if (B.willDone === 1) { G.lightExtra(); G.msg('THE WILL IS READ', 'EXTRA BALL IS LIT'); } else { G.add(75000); G.msg('THE WILL', '75,000'); } G.sfx('organHit', { vol: 0.6 }); }
          } else if (id === 'boneL' || id === 'boneR') {
            B.bones[id === 'boneL' ? 0 : 1] = 1; G.add(5000); R.checkCrypt(G);
          }
          break;
        case 'coffinHit':
          if (d.imp < 250 || G.time - (B.knockT || -9) < 0.4) return; B.knockT = G.time;
          G.sfx('knockDoor', { vol: 0.9, x: 262 }); G.add(2500);
          if (B.grave && B.superLit) return;
          if (B.lockLit || B.grave) return;
          B.coffinHits++;
          if (B.coffinHits >= B.coffinNeed) { B.lockLit = true; G.msg('THE COFFIN CREAKS', 'LOCK IS LIT', { anim: 'hand' }); G.sfx('creak', { vol: 0.7 }); }
          else G.msg('KNOCK ' + B.coffinHits, B.coffinHits === B.coffinNeed - 1 ? 'ONCE MORE...' : 'SOMETHING STIRS', {});
          break;
        case 'scoop':
          if (id === 'coffinSaucer') R.coffinSaucer(G, b);
          else if (id === 'seance') R.seance(G, b);
          else if (id === 'mirror') { G.add(15000); G.bxUp(); G.sfx('spook', { vol: 0.6 }); G.msg('THE MIRROR', 'BONUS UP', {}); }
          break;
        case 'handDone': {
          const lock = G.comp('coffinLock'); lock.lock(b); B.locks++; G.cnt('lock'); G.cnt('hand');
          G.comp('coffinSaucer').sens.on = false;
          if (B.locks >= 3) { G.later(0.8, () => R.startGrave(G)); }
          else { G.msg('BALL ' + B.locks + ' LOCKED', B.locks === 2 ? 'ONE MORE...' : 'IN THE COFFIN', { anim: 'hand' }); R.say(G, 'lock'); B.coffinNeed++; B.coffinHits = 0; }
          break;
        }
        case 'ramp':
          G.combo(id);
          if (id === 'stairs') { G.cnt('attic'); G.add(10000); R.say(G, 'attic'); if (!R.jp(G, 'stairs')) G.msg('THE ATTIC', fmt(10000 * G.mult), {}); }
          if (id === 'spirit') {
            B.walks++; G.add(15000 * (B.walks % 3 === 0 ? 2 : 1));
            if (!R.jp(G, 'spirit')) {
              if (!B.mistLit && !B.mistOn && B.walks % 3 === 0) { B.mistLit = true; G.msg('SPIRIT WALK', 'MIST IS LIT', { anim: 'ghost' }); }
              else G.msg('SPIRIT WALK', (3 - B.walks % 3) % 3 ? (3 - B.walks % 3) + ' MORE FOR MIST' : fmt(30000), {});
            }
          }
          break;
        case 'orbit': G.combo(id); if (!R.jp(G, id)) G.msg('HAUNTED HALL', fmt(G.add(5000)), {}); break;
        case 'lane':
          if (/^lane[RIP]$/.test(id)) {
            const i = ['laneR', 'laneI', 'laneP'].indexOf(id); B.rip[i] = 1;
            if (B.rip.every(Boolean)) { B.rip = [0, 0, 0]; G.bxUp(); G.comp('cellarDoor').open(); B.cellarT = 20; G.msg('R-I-P', 'THE CELLAR DOOR OPENS', {}); G.sfx('creak', { vol: 0.8 }); R.say(G, 'cellar'); }
          }
          break;
        case 'trapdoor': G.cnt('cellar'); G.add(25000); G.msg('THE CELLAR', 'MIND THE STAIRS', {}); G.sfx('spook', { vol: 0.6 }); B.cellarT = 0; break;
        case 'subway': if (id === 'stairs') { B.stairsHit = 1; G.add(20000); G.msg('SECRET STAIRS', 'UP TO THE ATTIC', {}); R.checkCrypt(G); } break;
        case 'subwayOut': if (id === 'stairs') G.sfx('vuk', { vol: 0.8, x: 96 }); break;
        case 'vuk': if (id === 'bannister') { G.add(5000); G.sfx('chains', { vol: 0.4 }); } break;
        case 'ringCatch': { G.cnt('mag'); G.add(25000); G.sfx('organHit', { vol: 0.5 }); G.lightShow('chase', 2); R.chandelierAward(G); break; }
        case 'ringCatchRelease': G.comp('chandelier').active = false; break;
        case 'magna': G.cnt('magna'); G.msg('MAGNA SAVE', '', { style: 'flash', dur: 1 }); break;
        case 'kickback': G.msg('RESURRECTED', '', { style: 'flash', dur: 1.2 }); G.sfx('organHit', { vol: 0.4 }); break;
        case 'holoHit':
          G.cnt('holo'); G.cnt('ghost');
          if (dark || B.witch) { G.jackpot(B.darkJp, 'GHOST CATCH', { color: '#9fffd0', sound: 'jackpot' }); B.darkJp += 25000; }
          else { G.add(5000); G.sfx('wail', { vol: 0.5 }); if (G.time - B.lastTaunt > 8) { B.lastTaunt = G.time; R.say(G, 'ghost'); } G.msg('BOO!', 'YOU WALKED THROUGH A GHOST', { anim: 'ghost', dur: 1.2 }); }
          break;
        case 'mistFree':
          G.cnt('mist'); B.mistOn = false; R.hour(G, 1);
          G.multiball(2, { label: 'MIST MULTIBALL', color: '#9fffd0', save: 10 }); B.jpLit = { orbitL: 1, orbitR: 1, spirit: 1, stairs: 1 }; B.mistMB = true;
          break;
        case 'mistHit': G.add(10000); G.msg('THE MIST', 'HIT IT HARDER', { dur: 0.9 }); break;
        case 'mistEnd': B.mistOn = false; G.msg('THE MIST', 'FADES AWAY', {}); G.sfx('wail', { vol: 0.4 }); break;
      }
    },
    jp(G, id) {
      const B = G.b; if (!(B.jpLit[id] || B.witch)) return false;
      const v = B.witch ? 100000 : B.grave ? 75000 : 50000;
      if (!B.witch) delete B.jpLit[id];
      B.jp++; G.jackpot(v, B.witch ? 'WITCHING JACKPOT' : 'JACKPOT', { color: '#9fffd0' }); R.say(G, 'jackpot');
      if (B.grave && !Object.keys(B.jpLit).length && !B.superLit) { B.superLit = true; G.comp('coffinSaucer').sens.on = true; G.msg('SUPER JACKPOT', 'AT THE COFFIN', {}); }
      if (B.mistMB && !Object.keys(B.jpLit).length) B.jpLit = { orbitL: 1, orbitR: 1, spirit: 1, stairs: 1 };
      return true;
    },
    coffinSaucer(G, b) {
      const B = G.b, sc = G.comp('coffinSaucer');
      if (B.superLit) { B.superLit = false; G.jackpot(250000, 'SUPER JACKPOT', { color: '#ff4058' }); G.sfx('toll', { vol: 0.7 }); sc.holdT = 1.2; sc.sens.on = false; B.jpLit = { orbitL: 1, orbitR: 1, spirit: 1, stairs: 1 }; return; }
      if (B.lockLit && !B.grave && G.comp('hand').state === 'idle') {
        B.lockLit = false; sc.drop(b); G.comp('hand').grab(b); G.sfx('lid', { vol: 0.8 });
        G.msg('THE HAND!', 'IT HAS YOUR BALL', { anim: 'hand', now: true });
        return;
      }
      sc.holdT = 0.3;
    },
    seance(G, b) {
      const B = G.b, sc = G.comp('seance'); sc.holdT = 1.2;
      G.add(10000);
      if (B.witchLit && !B.witch && !G.mb) { B.witchLit = false; sc.holdT = 3.5; R.startWitch(G); return; }
      if (G.ebLit) { G.collectExtra(); R.say(G, 'extra', true); return; }
      if (B.darkLit && G.darkT <= 0 && !G.mb) { B.darkLit = false; sc.holdT = 2.4; R.startDark(G); return; }
      if (B.mistLit && !B.mistOn && !G.mb) { B.mistLit = false; sc.holdT = 1.6; R.startMist(G); return; }
      const aw = ['LIGHT KICKBACK', 'BONUS UP', '25,000', 'BALL SAVE', 'MAGNET CHARGE'][Math.floor(Math.random() * 5)];
      if (aw === 'LIGHT KICKBACK') G.comp('kickback').arm(); else if (aw === 'BONUS UP') G.bxUp(); else if (aw === 'BALL SAVE') G.ballSave(10); else if (aw === 'MAGNET CHARGE') G.comp('magna').charges++; else G.add(25000);
      G.msg('THE SEANCE', aw, { anim: 'ghost' }); G.sfx('spook', { vol: 0.6 });
    },
    chandelierAward(G) {
      const opts = ['BONUS UP', 'LIGHT CELLAR', '50,000', 'BALL SAVE']; if (!G.ebLit && G.ebGot < 1) opts.push('EXTRA BALL');
      const a = opts[Math.floor(Math.random() * opts.length)];
      if (a === 'BONUS UP') G.bxUp(); else if (a === 'LIGHT CELLAR') { G.comp('cellarDoor').open(); G.b.cellarT = 20; } else if (a === 'BALL SAVE') G.ballSave(12); else if (a === 'EXTRA BALL') G.lightExtra(); else G.add(50000);
      G.big('THE CHANDELIER', a, '#ffd27a', { style: 'creep' });
    },
    checkCrypt(G) {
      const B = G.b;
      if (B.bones[0] && B.bones[1] && B.stairsHit) { B.bones = [0, 0]; B.stairsHit = 0; G.cnt('crypt'); R.hour(G, 4); G.jackpot(100000, 'CRYPT JACKPOT', { color: '#ff8a40' }); G.comp('kickback').arm(); }
    },
    hour(G, i) {
      const B = G.b; if (B.hours[i]) return; B.hours[i] = 1;
      G.sfx('toll', { vol: 0.5 });
      if (B.hours.every(Boolean)) { B.witchLit = true; G.msg('THE CLOCK STRIKES', 'WITCHING HOUR AT THE SEANCE', { anim: 'clock', dur: 2.5 }); }
      else G.msg('THE CLOCK TICKS', B.hours.filter(Boolean).length + ' OF 5 HOURS', { anim: 'clock' });
    },
    startDark(G) {
      const B = G.b; G.cnt('dark'); R.hour(G, 0);
      G.lightsOut(30); G.startMode('lightsout', 30, { mult: 2 }); G.ballSave(6);
      G.big('LIGHTS OUT', 'EVERYTHING SCORES 2X', '#b48cff', { anim: 'lightning' }); G.sfx('dark', { vol: 0.8 }); G.callout('LIGHTS OUT', '#c4b5fd');
      R.say(G, 'dark', true); B.nextStrike = 1.2; G.comp('ghost').show();
    },
    startMist(G) {
      const B = G.b; B.mistOn = true; G.cnt('mode');
      G.comp('mist').start(); G.big('MIST MULTIBALL', 'FREE THE SPECTRAL BALL', '#9fffd0', { anim: 'ghost' }); G.sfx('organ', { vol: 0.5 }); R.say(G, 'mist', true);
    },
    startGrave(G) {
      const B = G.b; B.grave = true; B.locks = 0; B.coffinNeed = 4; B.coffinHits = 0; G.cnt('grave'); R.hour(G, 2);
      G.comp('coffinLock').release();
      G.multiball(3, { label: 'GRAVE ROBBER', color: '#ff4058', save: 15 });
      B.jpLit = { orbitL: 1, orbitR: 1, spirit: 1, stairs: 1 }; G.sfx('organHit', { vol: 0.8 }); G.strike(1); R.say(G, 'mb', true);
    },
    startWitch(G) {
      const B = G.b; B.witch = true; G.cnt('wiz'); B.hours = [0, 0, 0, 0, 0];
      G.comp('coffinLock').release();
      G.multiball(4, { label: 'WITCHING HOUR', color: '#ff4058', save: 25 });
      G.startMode('witch', 60); G.lightsOut(60); G.comp('ghost').show(); G.sfx('toll', { vol: 0.9 }); G.later(1.2, () => G.sfx('toll', { vol: 0.8 })); G.later(2.4, () => G.sfx('organ', { vol: 0.7 }));
      R.say(G, 'witch', true); G.callout('THE WITCHING HOUR', '#ff6b7a');
    },
    modeEnd(G, name) {
      const B = G.b;
      if (name === 'lightsout') { G.msg('LIGHTS ON', 'YOU SURVIVED', {}); G.sfx('award'); }
      if (name === 'witch') { B.witch = false; G.lightsOut(false); G.msg('DAWN BREAKS', 'THE WITCHING HOUR ENDS', {}); }
    },
    mbEnd(G) { const B = G.b; B.grave = false; B.mistMB = false; B.superLit = false; B.jpLit = {}; G.comp('coffinSaucer').sens.on = B.lockLit; if (B.witch) { B.witch = false; G.endMode('witch'); G.lightsOut(false); } },
    levelDrain(G, lvl, b) {
      if (lvl === 'cellar') { G.comp('cellarReturn').take(b, 0.8); G.sfx('scoop', { vol: 0.5, x: 243 }); return true; }
      if (lvl === 'attic') { G.comp('bannister').receive(b, 0.2); return true; }
      return false;
    },
    drain(G, b) { return false; },
    update(G, dt) {
      const B = G.b, T = G.T;
      // cellar door closes after a while
      if (B.cellarT > 0) { B.cellarT -= dt; if (B.cellarT <= 0) G.comp('cellarDoor').close(); }
      // the coffin saucer is live when the lock is lit (or the super jackpot)
      const sc = G.comp('coffinSaucer'); sc.sens.on = !!((B.lockLit && !B.grave) || B.superLit);
      // lights out: lightning now and then, the ghost is always there
      if (G.darkT > 0) { B.nextStrike -= dt; if (B.nextStrike <= 0) { B.nextStrike = 3 + Math.random() * 4; G.strike(0.9 + Math.random() * 0.4); } }
      const gh = G.comp('ghost'); if (G.darkT > 0 || B.witch) gh.show(); else if (gh) { gh.want = 0.85; }
      // ambient touches: an owl, a creak, wind... sparse and quiet
      B.wailT -= dt; if (B.wailT <= 0) { B.wailT = 14 + Math.random() * 18; if (G.amb && G.state === 'play') G.sfx(['owl', 'creak', 'chains'][Math.floor(Math.random() * 3)], { vol: 0.12, x: Math.random() * 520 }); }
      if (B.witch) { B.organT -= dt; if (B.organT <= 0) { B.organT = 6; G.strike(0.6); } }
    },
    lamps(G) {
      const B = G.b, L = {}, t = G.time, mb = G.mb;
      L.lock = B.lockLit ? 'blink' : 0; L.arrCoffin = B.superLit ? 'fast' : 0;
      L.arrOrbL = B.jpLit.orbitL || B.witch ? 'fast' : G.lastShot === 'orbitR' && t - G.lastShotT < 4 ? 'blink' : 0;
      L.arrOrbR = B.jpLit.orbitR || B.witch ? 'fast' : G.lastShot === 'orbitL' && t - G.lastShotT < 4 ? 'blink' : 0;
      L.arrStairs = B.jpLit.stairs || B.witch ? 'fast' : 'slow';
      L.arrSpirit = B.jpLit.spirit || B.witch ? 'fast' : B.mistLit ? 'blink' : (B.walks % 3) / 3;
      L.seanceL = B.witchLit || G.ebLit || B.darkLit || B.mistLit ? 'blink' : 0;
      L.chandL = G.comp('chandelier').active ? 'blink' : 0;
      L.cellarL = G.comp('cellarDoor').isOpen ? (B.cellarT < 5 ? 'fast' : 'blink') : 0;
      L.mistL = B.mistOn ? 'fast' : B.mistLit ? 'blink' : B.hours[1] ? 1 : 0;
      L.darkL = G.darkT > 0 ? 'fast' : B.darkLit ? 'blink' : B.hours[0] ? 1 : 0;
      L.mbL = B.grave ? 'fast' : B.locks ? 'pulse' : 0; L.ebL = G.ebLit ? 'blink' : 0;
      B.hours.forEach((h, i) => { L['hour' + i] = B.witchLit ? 'fast' : h ? 1 : 0; });
      B.boo.forEach((h, i) => { L['bool' + i] = h ? 1 : 0; });
      ['laneR', 'laneI', 'laneP'].forEach((id, i) => { L[id] = B.rip[i] ? 1 : (G.skill && i === B.ripLit) ? 'fast' : 0; });
      const pt = G.comp('portraits'); if (pt) pt.targets.forEach((tg, i) => { L['p' + i] = tg.up ? (B.darkLit ? 0 : 'slow') : 1; });
      L.kickback = G.comp('kickback').armed ? 1 : 0; L.magna = G.comp('magna').charges > 0 ? (G.input.magna ? 'fast' : 1) : 0;
      L.fl1 = B.witch && Math.random() < 0.05 ? 1 : 0; L.fl2 = 0; L.flC = (B.lockLit || B.superLit) && (t % 2) < 0.12 ? 1 : 0;
      for (let i = 0; i < 7; i++) L['gi' + i] = 1;
      for (let i = 0; i < 4; i++) L['candle' + i] = 0.75 + 0.25 * Math.sin(t * 13 + i * 3) * Math.sin(t * 7.3 + i);
      L.pop1 = L.pop2 = L.pop3 = B.witch ? 'blink' : 0.15; L.furnace = 0.4;
      return L;
    },
    status(G) {
      const B = G.b;
      if (B.witch) return 'THE WITCHING HOUR: EVERY SHOT IS A JACKPOT';
      if (B.grave) return B.superLit ? 'SUPER JACKPOT AT THE COFFIN' : 'GRAVE ROBBER: SHOOT THE LIT JACKPOTS';
      if (B.mistOn) return 'HIT THE MIST BALL TO FREE IT';
      if (G.darkT > 0) return 'LIGHTS OUT: CATCH THE GHOST';
      if (B.witchLit) return 'THE WITCHING HOUR IS LIT AT THE SEANCE';
      if (B.lockLit) return 'SHOOT THE COFFIN TO LOCK A BALL';
      const opts = ['KNOCK ON THE COFFIN ' + Math.max(0, B.coffinNeed - B.coffinHits) + ' MORE TIMES', 'SPELL R-I-P TO OPEN THE CELLAR', (3 - B.walks % 3) + ' SPIRIT WALKS FOR MIST', 'HOURS ON THE CLOCK: ' + B.hours.filter(Boolean).length + ' OF 5'];
      if (B.darkLit) opts.unshift('LIGHTS OUT IS LIT AT THE SEANCE'); if (B.mistLit) opts.unshift('MIST IS LIT AT THE SEANCE');
      return opts[Math.floor(G.time / 4) % opts.length];
    },
    bonus(G) { return [['SPIRITS', G.pbn('pop'), 200], ['PORTRAITS', G.pbn('dt'), 1000], ['GHOSTS', G.pbn('holo'), 5000], ['RAMPS', G.pbn('rp'), 5000], ['ATTIC', G.pbn('attic'), 10000], ['CELLAR', G.pbn('cellar'), 10000]]; }
  };
  return R;
}

// ═══════════════════════════════════════════════════════════════════════════
// ART (canvas painters; table space, y up)
// ═══════════════════════════════════════════════════════════════════════════
function paintPlayfield(P) {
  const g = P.ctx, W = P.W, L = P.L, r = rng(13);
  // night sky to stone floor
  g.fillStyle = P.lin(0, 0, 0, L, [[0, '#0d0a16'], [0.32, '#1a1228'], [0.62, '#1c1430'], [1, '#0a0812']]); g.fillRect(0, 0, W, L);
  // moon and its halo (top left, behind the attic)
  P.glow(150, 880, 260, '#bfc8ff', 0.16); P.glow(150, 880, 90, '#eef0ff', 0.25);
  // damask wallpaper pattern, very faint
  g.save(); g.globalAlpha = 0.07; g.strokeStyle = '#c9a8ff'; g.lineWidth = 1.2;
  for (let y = 380; y < 1040; y += 46) for (let x = (y / 46 % 2) * 23; x < W; x += 46) { g.beginPath(); g.ellipse(x, y, 9, 15, 0, 0, TAU); g.stroke(); g.beginPath(); g.moveTo(x, y - 15); g.lineTo(x, y + 15); g.stroke(); }
  g.restore();
  // checker marble floor in the lower half (perspective-less, worn)
  g.save(); g.beginPath(); g.rect(0, 100, W, 280); g.clip();
  for (let y = 100; y < 380; y += 30) for (let x = 0; x < W; x += 30) { g.fillStyle = ((x + y) / 30) % 2 ? 'rgba(220,210,240,.07)' : 'rgba(0,0,0,.18)'; g.fillRect(x, y, 30, 30); }
  g.restore();
  // fog bands
  for (let i = 0; i < 9; i++) { const y = 360 + i * 80 + r() * 40; g.fillStyle = P.lin(0, y - 30, 0, y + 30, [[0, 'rgba(180,200,210,0)'], [0.5, 'rgba(180,200,210,.06)'], [1, 'rgba(180,200,210,0)']]); g.fillRect(0, y - 30, W, 60); }
  // graveyard silhouettes along the lower sides
  for (const [x, y, s] of [[20, 560, 1], [470, 560, 1.1], [100, 380, 0.8], [395, 380, 0.85], [30, 400, 0.9]]) tomb(g, x, y, 16 * s, 24 * s);
  // bare trees up the sides
  tree(g, 8, 330, 260, 0.25, r); tree(g, 476, 330, 250, -0.2, r);
  // cracked floor round the window: radiating cracks
  g.strokeStyle = 'rgba(0,0,0,.55)'; g.lineWidth = 1.2;
  for (let i = 0; i < 18; i++) { const a = i / 18 * TAU + r() * 0.3, x0 = 243 + Math.cos(a) * 92, y0 = 406 + Math.sin(a) * 70; let x = x0, y = y0; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 4; k++) { x += Math.cos(a + (r() - 0.5)) * 12; y += Math.sin(a + (r() - 0.5)) * 12; g.lineTo(x, y); } g.stroke(); }
  // stone rim round the window
  g.strokeStyle = '#3a3040'; g.lineWidth = 7; P.poly(WINDOW).stroke(); g.strokeStyle = 'rgba(200,190,220,.35)'; g.lineWidth = 1.5; P.poly(WINDOW).stroke();
  // rug under the coffin (deep red with gold edge)
  g.save(); g.translate(262, 706); g.fillStyle = '#4a0f1c'; g.fillRect(-48, -78, 96, 158); g.strokeStyle = '#c8a050'; g.lineWidth = 2; g.strokeRect(-44, -74, 88, 150); g.strokeStyle = 'rgba(200,160,80,.4)'; g.strokeRect(-38, -68, 76, 138); g.restore();
  // the stairs (left ramp) printed treads
  g.fillStyle = 'rgba(0,0,0,.25)'; for (let i = 0; i < 6; i++) { g.save(); g.translate(120 + i * 10, 610 + i * 34); g.rotate(-0.2); g.fillRect(-24, -2, 48, 4); g.restore(); }
  // pop bumper area: a dark pool with green spirit glow
  P.glow(340, 870, 120, '#3aff9a', 0.08);
  // top lanes area: manor stone
  g.fillStyle = 'rgba(40,30,50,.7)'; g.fillRect(214, 960, 140, 70);
  // lane guides: bonus X and save area decoration
  g.strokeStyle = 'rgba(159,255,208,.35)'; g.lineWidth = 1.5; P.circle(243, 262, 40).stroke();
  // printed text
  P.text('HAUNTED', 243, 205, { size: 13, color: 'rgba(159,255,208,.55)', spacing: 3 });
  P.text('CELLAR', TRAP[0], TRAP[1] - 27, { size: 6, color: '#ffb070' });
  P.text('THE CLOCK', TRAP[0], TRAP[1] + 52, { size: 5.5, color: '#ffd27a' });
  P.text('PORTRAITS', 100, 500, { size: 6, color: '#ffd27a', rot: 90 });
  // cobwebs in the corners
  webP(g, 8, 1040, 70, 1); webP(g, 512, 1040, 60, -1);
}
function paintOverlay(P) { /* after inserts: nothing */ }
function tomb(g, x, y, w, h) {
  g.fillStyle = 'rgba(8,6,12,.85)'; g.beginPath(); g.moveTo(x - w / 2, y); g.lineTo(x - w / 2, y + h * 0.7); g.arc(x, y + h * 0.7, w / 2, PI, 0, true); g.lineTo(x + w / 2, y); g.closePath(); g.fill();
  g.strokeStyle = 'rgba(140,130,170,.25)'; g.lineWidth = 1; g.stroke();
}
function tree(g, x, y, h, lean, r) {
  g.strokeStyle = 'rgba(6,4,10,.9)'; g.lineCap = 'round';
  const br = (x, y, len, a, w, d) => { if (d > 5 || len < 6) return; const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len; g.lineWidth = w; g.beginPath(); g.moveTo(x, y); g.lineTo(x2, y2); g.stroke(); br(x2, y2, len * 0.72, a + 0.45 + r() * 0.3, w * 0.65, d + 1); br(x2, y2, len * 0.68, a - 0.45 - r() * 0.3, w * 0.65, d + 1); };
  br(x, y, h * 0.35, PI / 2 + lean, 7, 0);
}
function webP(g, x, y, s, dir) {
  g.save(); g.translate(x, y); g.scale(dir, -1); g.strokeStyle = 'rgba(220,220,235,.35)'; g.lineWidth = 0.6;
  for (let i = 0; i <= 6; i++) { const a = i / 6 * PI / 2; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * s, Math.sin(a) * s); g.stroke(); }
  for (let k = 1; k <= 5; k++) { g.beginPath(); for (let i = 0; i <= 6; i++) { const a = i / 6 * PI / 2, rr = s * k / 5.5; i ? g.quadraticCurveTo(Math.cos(a - 0.13) * rr * 0.86, Math.sin(a - 0.13) * rr * 0.86, Math.cos(a) * rr, Math.sin(a) * rr) : g.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); } g.stroke(); }
  g.restore();
}
function web(g, x, y, s, dir) { g.save(); g.translate(x, y); g.scale(dir, 1); g.strokeStyle = 'rgba(230,230,240,.4)'; g.lineWidth = 1.2; for (let i = 0; i <= 6; i++) { const a = i / 6 * PI / 2; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * s, Math.sin(a) * s); g.stroke(); } for (let k = 1; k <= 5; k++) { g.beginPath(); g.arc(0, 0, s * k / 5.5, 0, PI / 2); g.stroke(); } g.restore(); }
function paintCellar(P, box) {
  const g = P.ctx, r = rng(5);
  g.fillStyle = '#1a1518'; g.fillRect(box[0], box[1], box[2] - box[0], box[3] - box[1]);
  // flagstones
  for (let y = box[1]; y < box[3]; y += 26) for (let x = box[0] + ((y / 26) % 2) * 18; x < box[2]; x += 36) { const s = 0.08 + r() * 0.1; g.fillStyle = 'rgba(' + [120, 110, 130].map(c => Math.round(c * (0.5 + r() * 0.5))).join(',') + ',' + s + ')'; g.fillRect(x + 1.5, y + 1.5, 33, 23); }
  // pentagram-ish ritual circle in chalk (kept tame: a circle with runes)
  g.strokeStyle = 'rgba(220,200,255,.35)'; g.lineWidth = 1.4; P.circle(243, 410, 52).stroke(); P.circle(243, 410, 46).stroke();
  for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; P.text('ᚱᚢᚾᛖᛋᛏᚨᛒ'[i % 9], 243 + Math.cos(a) * 49, 410 + Math.sin(a) * 49, { size: 5, color: 'rgba(220,200,255,.5)', font: 'serif' }); }
  // bones scattered
  for (let i = 0; i < 9; i++) { const x = box[0] + 12 + r() * (box[2] - box[0] - 24), y = box[1] + 50 + r() * 140; g.save(); g.translate(x, y); g.rotate(r() * TAU); g.fillStyle = 'rgba(230,220,200,.35)'; g.fillRect(-6, -1, 12, 2); g.beginPath(); g.arc(-6, 0, 1.6, 0, TAU); g.arc(6, 0, 1.6, 0, TAU); g.fill(); g.restore(); }
  P.text('THE CELLAR', 243, 372, { size: 9, color: 'rgba(255,170,110,.75)', glow: '#ff7a3a' });
  // drains between the flippers
  g.fillStyle = 'rgba(0,0,0,.7)'; g.fillRect(222, box[1], 42, 14);
}
function paintAttic(P, box) {
  const g = P.ctx, r = rng(9);
  // floorboards
  for (let x = box[0]; x < box[2]; x += 14) { g.fillStyle = 'rgb(' + (64 + r() * 20 | 0) + ',' + (40 + r() * 14 | 0) + ',' + (24 + r() * 8 | 0) + ')'; g.fillRect(x, box[1], 13.2, box[3] - box[1]); for (let k = 0; k < 6; k++) { g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 0.4; g.beginPath(); const yy = box[1] + r() * (box[3] - box[1]); g.moveTo(x, yy); g.lineTo(x + 13, yy + (r() - 0.5) * 4); g.stroke(); } }
  // dust and moonlight from a round window
  const gr = g.createRadialGradient(140, 950, 0, 140, 950, 80); gr.addColorStop(0, 'rgba(200,210,255,.25)'); gr.addColorStop(1, 'rgba(200,210,255,0)'); g.fillStyle = gr; g.fillRect(box[0], box[1], box[2] - box[0], box[3] - box[1]);
  P.text('THE ATTIC', 140, 900, { size: 10, color: 'rgba(255,230,180,.75)' });
  P.text('W-I-L', 136, 884, { size: 6, color: 'rgba(232,192,112,.8)' });
}
function paintBackglass(g, w, h) {
  // A translite painted like a matte: the camera low at the graveyard gate, the manor on its hill under the moon,
  // lightning tearing the storm bank over the dead oak, fog rolling between tilted headstones, a wraith of green
  // light drifting through the stones, the manor's windows spilling warm light into the mist.
  const r = rng(13), u = w / 1024, v = h / 662, W = 1024, H = 662;
  g.save(); g.scale(u, v);
  // ── sky: storm night, a touch of violet at the horizon, stars behind the clouds ──
  const sky = g.createLinearGradient(0, 0, 0, 450); sky.addColorStop(0, '#04030c'); sky.addColorStop(0.5, '#100c2a'); sky.addColorStop(0.85, '#241c4a'); sky.addColorStop(1, '#2f2a58'); g.fillStyle = sky; g.fillRect(0, 0, W, 460);
  bgStars(g, W, H, 320, 5, { yMax: 400, a: 0.85 });
  // ── the moon, upper right, with its halo ──
  const mx = 752, my = 160, mr = 86;
  glowAt(g, mx, my, mr * 4.2, '#8e86d8', 0.26); glowAt(g, mx, my, mr * 1.9, '#e6e2ff', 0.3);
  const md = g.createRadialGradient(mx - mr * 0.4, my - mr * 0.4, mr * 0.05, mx, my, mr); md.addColorStop(0, '#fffef6'); md.addColorStop(0.55, '#efe9d2'); md.addColorStop(0.92, '#cfc5a8'); md.addColorStop(1, '#b8ad92'); g.fillStyle = md; g.beginPath(); g.arc(mx, my, mr, 0, TAU); g.fill();
  g.save(); g.beginPath(); g.arc(mx, my, mr, 0, TAU); g.clip();
  [[-0.32, -0.18, 0.2, 0.16], [0.28, -0.42, 0.13, 0.1], [0.3, 0.3, 0.24, 0.2], [-0.22, 0.46, 0.15, 0.1], [-0.56, 0.12, 0.09, 0.08], [0.6, -0.02, 0.09, 0.08]].forEach(([cx, cy, rx, ry]) => { bgPuff(g, mx + cx * mr, my + cy * mr, rx * mr * 1.3, ry * mr * 1.3, '#9a8f74', 0.3, 0.3, 0.7); g.strokeStyle = 'rgba(255,255,245,.18)'; g.lineWidth = 1.2; g.beginPath(); g.ellipse(mx + cx * mr - 1.5, my + cy * mr - 1.5, rx * mr, ry * mr, 0.3, PI * 1.05, PI * 1.95); g.stroke(); });
  bgTexture(g, mx - mr, my - mr, mr * 2, mr * 2, 0.18, { seed: 3, lo: 150, hi: 255 });
  g.restore();
  // ── clouds: a storm bank across the top, moonlit in the middle, lit cold by the lightning on the right ──
  bgCloud(g, 130, 50, 120, { body: '#0a0818', a: 0.95, seed: 2, n: 9, mid: 0.5, lit: '#6f78c8', litA: 0.12, lx: 470, ly: 60 });
  bgCloud(g, 420, 30, 100, { body: '#0d0a1e', a: 0.92, seed: 4, n: 9, mid: 0.5, lit: '#8f8fd8', litA: 0.2, lx: mx, ly: my });
  bgCloud(g, 640, 40, 80, { body: '#0c0a1c', a: 0.9, seed: 6, n: 6, lit: '#c9c2f4', litA: 0.3, lx: mx, ly: my });
  bgCloud(g, 960, 90, 110, { body: '#0b0918', a: 0.92, seed: 8, n: 7, lit: '#bcd0ff', litA: 0.4, lx: 905, ly: 160 });
  // a shred of cloud drifting across the moon's lower half, glowing where the moon is behind it
  bgPuff(g, 720, 218, 80, 14, '#f2eeff', 0.16, 0.05, 0.6); bgCloud(g, 725, 222, 44, { body: '#1a1638', a: 0.85, seed: 9, n: 7, spread: 1.6, flat: 0.5, lit: '#fbf8ff', litA: 0.42, lx: mx, ly: my });
  // ── lightning: a forked bolt out of the right-hand bank, striking behind the oak, and its flash on the clouds ──
  bgPuff(g, 905, 150, 200, 170, '#7f9fff', 0.24, 0, 0.5);
  const jag = (x0, y0, x1, y1, n, amp) => { const pts = [[x0, y0]]; for (let i = 1; i < n; i++) { const t = i / n; pts.push([x0 + (x1 - x0) * t + (r() - 0.5) * amp * (i % 2 ? 1.6 : 0.6), y0 + (y1 - y0) * t + (r() - 0.5) * amp * 0.3]); } pts.push([x1, y1]); return pts; };
  const bolt = (pts, wd, col, blur) => { g.save(); g.strokeStyle = col; g.lineWidth = wd; g.lineCap = 'round'; g.lineJoin = 'round'; if (blur) { g.shadowColor = '#a9c4ff'; g.shadowBlur = blur; } g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.stroke(); g.restore(); };
  const main = jag(892, 60, 948, 372, 14, 36), fork = jag(main[5][0], main[5][1], main[5][0] - 54, main[5][1] + 86, 5, 20), fork2 = jag(main[9][0], main[9][1], main[9][0] + 40, main[9][1] + 60, 4, 14);
  bolt(main, 10, 'rgba(120,160,255,.28)', 30); bolt(fork, 5, 'rgba(120,160,255,.25)', 18); bolt(fork2, 4, 'rgba(120,160,255,.25)', 14);
  bolt(main, 2.6, '#f4f8ff', 8); bolt(fork, 1.5, '#e6efff', 6); bolt(fork2, 1.2, '#e6efff', 5);
  // ── far ridges fading into haze, moon rays slanting down through the gap in the clouds ──
  const ridge = (y0, amp, col, seed, f) => { const rr = rng(seed); g.fillStyle = col; g.beginPath(); g.moveTo(0, H); g.lineTo(0, y0); for (let x = 0; x <= W; x += 16) g.lineTo(x, y0 + Math.sin(x * f + seed) * amp + Math.sin(x * f * 2.7 + seed * 3) * amp * 0.4 + (rr() - 0.5) * 3); g.lineTo(W, H); g.closePath(); g.fill(); };
  ridge(372, 16, '#1b1740', 3, 0.006); ridge(400, 12, '#141134', 7, 0.009);
  bgHaze(g, W, 340, 460, '#7f7ac0', 0, 0.26);
  bgRays(g, mx, my, 560, PI * 0.56, PI * 0.9, 7, '#b4acff', 0.1, 11, { width: 0.035, r0: 100 });
  // ── the manor's hill: a dark mass with a moonlit crest and a path winding down to the gate ──
  const hill = () => { g.beginPath(); g.moveTo(0, 540); g.bezierCurveTo(160, 520, 330, 470, 470, 410); g.bezierCurveTo(560, 376, 700, 372, 800, 396); g.bezierCurveTo(900, 420, 980, 460, W, 490); g.lineTo(W, H); g.lineTo(0, H); g.closePath(); };
  const hg = g.createLinearGradient(0, 380, 0, 600); hg.addColorStop(0, '#171336'); hg.addColorStop(0.35, '#0c0a1e'); hg.addColorStop(1, '#06050e'); g.fillStyle = hg; hill(); g.fill();
  g.save(); hill(); g.clip();
  bgPuff(g, 820, 440, 260, 70, '#5a56a8', 0.2, 0.25, 0.5);   // moonlight on the right slope
  bgTexture(g, 0, 380, W, 300, 0.25, { seed: 5, lo: 120, hi: 255 });
  const pth = g.createLinearGradient(0, 400, 0, 662); pth.addColorStop(0, 'rgba(120,112,170,.55)'); pth.addColorStop(1, 'rgba(110,104,160,.2)'); g.fillStyle = pth; g.beginPath(); g.moveTo(638, 402); g.lineTo(650, 402); g.bezierCurveTo(660, 470, 560, 540, 590, 662); g.lineTo(430, 662); g.bezierCurveTo(470, 560, 600, 480, 638, 402); g.closePath(); g.fill();
  g.strokeStyle = 'rgba(8,6,16,.55)'; g.lineWidth = 1.2; for (let i = 0; i < 14; i++) { const t = i / 14, y = 410 + t * t * 240, x = 644 - t * 40 + Math.sin(t * 6) * 18 * t, hw = 7 + t * 60; g.beginPath(); g.moveTo(x - hw, y); g.lineTo(x + hw, y); g.stroke(); }
  g.restore();
  g.strokeStyle = 'rgba(200,192,255,.3)'; g.lineWidth = 2; g.beginPath(); g.moveTo(470, 410); g.bezierCurveTo(560, 376, 700, 372, 800, 396); g.bezierCurveTo(900, 420, 980, 460, W, 490); g.stroke();
  // ── the manor, moonlit from the right, every window lit; the oak clawing at the moon; bats ──
  bgManor(g, r);
  const branch = (x, y, len, ang, wd, depth) => { const x2 = x + Math.cos(ang) * len, y2 = y + Math.sin(ang) * len; g.strokeStyle = '#030208'; g.lineWidth = wd; g.lineCap = 'round'; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo((x + x2) / 2 + (r() - 0.5) * 10, (y + y2) / 2, x2, y2); g.stroke(); if (depth > 0) { branch(x2, y2, len * (0.62 + r() * 0.14), ang - 0.32 - r() * 0.3, wd * 0.6, depth - 1); branch(x2, y2, len * (0.55 + r() * 0.2), ang + 0.3 + r() * 0.35, wd * 0.6, depth - 1); if (r() < 0.45) branch(x2, y2, len * 0.45, ang + (r() - 0.5) * 0.4, wd * 0.5, depth - 2); } };
  branch(912, 476, 100, -PI / 2 - 0.3, 16, 6);
  const bat = (x, y, s, f) => { g.fillStyle = '#05040a'; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x - s * 0.55, y - s * 0.5 * f, x - s, y + s * 0.1); g.quadraticCurveTo(x - s * 0.5, y - s * 0.05, x, y + s * 0.25); g.quadraticCurveTo(x + s * 0.5, y - s * 0.05, x + s, y + s * 0.1); g.quadraticCurveTo(x + s * 0.55, y - s * 0.5 * f, x, y); g.fill(); };
  [[690, 112, 15, 1], [722, 88, 11, 0.6], [742, 140, 9, 1.2], [800, 64, 9, 0.8], [836, 236, 13, 1], [870, 104, 7, 1], [660, 74, 7, 1], [606, 124, 6, 1], [820, 300, 10, 1], [700, 250, 7, 0.7]].forEach(a => bat(...a));
  // ── fog rolling in behind the graveyard, warmed by the house ──
  for (let i = 0; i < 8; i++) bgPuff(g, 80 + i * 140, 500 + (i % 3) * 22, 180, 36, '#8c90c8', 0.17, 0, 0.5);
  bgPuff(g, 640, 470, 220, 60, '#ffb45a', 0.1, 0, 0.5);
  bgPuff(g, 700, 580, 420, 60, '#4a4680', 0.3, 0, 0.5); bgPuff(g, 160, 600, 220, 40, '#3e3a6a', 0.25, 0, 0.5);   // moonlight pooling on the grass
  // ── headstones: back rows small and pale in the mist, the front ones big and close ──
  for (const s of [[150, 528, 14, 30, 0.1, 0], [238, 522, 10, 24, -0.06, 1], [330, 532, 12, 28, 0.04, 0], [720, 524, 12, 26, -0.1, 0], [820, 536, 16, 34, 0.12, 1],
    [96, 588, 30, 66, -0.12, 0], [250, 596, 36, 80, 0.06, 2], [410, 584, 26, 58, -0.05, 1], [700, 592, 30, 68, 0.14, 0], [880, 604, 34, 80, -0.08, 1]]) bgHeadstone(g, r, s[0], s[1], s[2], s[3], s[4], s[5], 0.95 - (600 - s[1]) / 130);
  for (let i = 0; i < 7; i++) bgPuff(g, 60 + i * 160, 585 + (i % 2) * 18, 200, 30, '#a0a6d8', 0.16, 0, 0.5);
  bgPuff(g, 330, 600, 200, 50, '#5fe0a0', 0.14, 0, 0.5);
  // ── the wraith: a column of cold green light with a face half-formed in it, trailing into the fog ──
  bgWraith(g, r, 330, 575, 1.35);
  bgHeadstone(g, r, 176, 676, 54, 150, -0.07, 2, 1); bgHeadstone(g, r, 850, 684, 50, 140, 0.1, 0, 1);
  // ── the gate: stone pillars at both edges with urns on top, iron bars swung open towards us ──
  bgPillar(g, r, 44, 296, 60, 1); bgPillar(g, r, 982, 296, 60, -1);
  bgGateBars(g, 108, 330, 1); bgGateBars(g, 918, 330, -1);
  // ground fog lapping over everything at the bottom, and grass tufts in it
  bgHaze(g, W, 590, 662, '#9aa0d0', 0, 0.3);
  g.strokeStyle = 'rgba(4,3,10,.9)'; g.lineWidth = 2.4; g.lineCap = 'round'; for (let i = 0; i < 48; i++) { const x = r() * W, y = 648 + r() * 20, hh = 10 + r() * 24, lean = (r() - 0.5) * 14; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + lean * 0.4, y - hh * 0.6, x + lean, y - hh); g.stroke(); }
  // ── title: spectral green lettering over the storm, its light on the clouds behind ──
  bgPuff(g, 320, 190, 380, 150, '#2fe08a', 0.13, 0, 0.5);
  const tf = (x0, y0, x1, y1) => { const q = g.createLinearGradient(0, y0, 0, y1); q.addColorStop(0, '#f6fff9'); q.addColorStop(0.42, '#c2f5d8'); q.addColorStop(0.52, '#6fcf9a'); q.addColorStop(0.8, '#2f8f5e'); q.addColorStop(1, '#1b5c3d'); return q; };
  textLogo(g, 'HAUNTED', 320, 148, { font: '700 104px Cinzel, Georgia, serif', glow: { color: '#3aff9a', blur: 34, alpha: 0.75, twice: true }, shadow: { dx: 6, dy: 8, color: 'rgba(0,0,0,.8)' }, outline: { color: '#06140c', w: 8 }, fill: tf, inline: { color: 'rgba(10,60,35,.45)', w: 1.2 }, top: { color: 'rgba(255,255,255,.3)', frac: 0.4 } });
  textLogo(g, 'MANOR', 320, 256, { font: '700 78px Cinzel, Georgia, serif', spacing: 16, glow: { color: '#3aff9a', blur: 28, alpha: 0.7, twice: true }, shadow: { dx: 5, dy: 7, color: 'rgba(0,0,0,.8)' }, outline: { color: '#06140c', w: 7 }, fill: tf, inline: { color: 'rgba(10,60,35,.45)', w: 1.2 }, top: { color: 'rgba(255,255,255,.3)', frac: 0.4 } });
  bgVignette(g, W, H, 0.42, '#030208');
  g.restore();
  grain(g, w, h, 2600, 0.05, 17);
}
// The manor on its crest (design units): walls lit from the moon on the right, warm windows, the door's light
// spilling down the steps. Ground line y 392.
function bgManor(g, r) {
  const base = 392, dark = '#07060f', face = '#0e0b1f', lit = '#1c1840', rim = 'rgba(205,195,245,.5)';
  const wall = (x, y, bw, bh) => { const q = g.createLinearGradient(x, 0, x + bw, 0); q.addColorStop(0, dark); q.addColorStop(0.6, face); q.addColorStop(1, lit); g.fillStyle = q; g.fillRect(x, y - bh, bw, bh); g.strokeStyle = rim; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x + bw - 0.5, y - bh); g.lineTo(x + bw - 0.5, y); g.stroke(); };
  const gable = (x, y, bw, rh, over = 8) => { g.fillStyle = dark; g.beginPath(); g.moveTo(x - over, y); g.lineTo(x + bw / 2, y - rh); g.lineTo(x + bw + over, y); g.closePath(); g.fill(); g.fillStyle = 'rgba(60,54,110,.5)'; g.beginPath(); g.moveTo(x + bw / 2, y - rh); g.lineTo(x + bw + over, y); g.lineTo(x + bw + over - 14, y); g.closePath(); g.fill(); g.strokeStyle = rim; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x + bw / 2, y - rh); g.lineTo(x + bw + over, y); g.stroke(); };
  const cone = (x, y, rad, ch) => { g.fillStyle = dark; g.beginPath(); g.moveTo(x - rad - 3, y); g.lineTo(x, y - ch); g.lineTo(x + rad + 3, y); g.closePath(); g.fill(); g.fillStyle = 'rgba(60,54,110,.45)'; g.beginPath(); g.moveTo(x, y - ch); g.lineTo(x + rad + 3, y); g.lineTo(x + rad * 0.3, y); g.closePath(); g.fill(); g.strokeStyle = rim; g.lineWidth = 1.4; g.beginPath(); g.moveTo(x, y - ch); g.lineTo(x + rad + 3, y); g.stroke(); };
  const finial = (x, y, hh) => { g.strokeStyle = dark; g.lineWidth = 2.2; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - hh); g.stroke(); g.fillStyle = dark; g.beginPath(); g.arc(x, y - hh, 2.4, 0, TAU); g.fill(); };
  // the light of the house in the air round it
  bgPuff(g, 650, 330, 200, 110, '#ffb45a', 0.08, 0, 0.5);
  // wings, main block, tower, turret
  wall(498, base + 6, 72, 76); gable(498, base - 70, 72, 34);
  wall(740, base + 8, 78, 86); gable(740, base - 78, 78, 38);
  wall(566, base, 180, 112); gable(566, base - 112, 180, 42, 10);
  wall(636, base, 50, 206); g.fillStyle = dark; g.fillRect(631, base - 210, 60, 8);
  g.fillStyle = dark; g.beginPath(); g.moveTo(626, base - 214); g.lineTo(661, base - 318); g.lineTo(696, base - 214); g.closePath(); g.fill();
  g.fillStyle = 'rgba(60,54,110,.45)'; g.beginPath(); g.moveTo(661, base - 318); g.lineTo(696, base - 214); g.lineTo(672, base - 214); g.closePath(); g.fill();
  g.strokeStyle = rim; g.lineWidth = 1.5; g.beginPath(); g.moveTo(661, base - 318); g.lineTo(696, base - 214); g.stroke(); finial(661, base - 318, 20);
  wall(806, base + 4, 34, 136); cone(823, base - 132, 18, 58); finial(823, base - 190, 12);
  g.fillStyle = dark; g.fillRect(596, base - 150, 13, 42); g.fillRect(592, base - 154, 21, 5); g.fillRect(708, base - 150, 12, 40); g.fillRect(704, base - 154, 20, 5);
  finial(534, base - 104, 10); finial(779, base - 116, 10);
  // windows: warm lamplight, a floor of them haunted green, their light spilling on the stone round them
  const win = (x, y, ww, wh, green, arch) => {
    bgPuff(g, x + ww / 2, y - wh / 2, ww * 2.8, wh * 2, green ? '#5fd4a0' : '#ffb45a', 0.3, 0, 0.5);
    g.save(); const q = g.createLinearGradient(0, y - wh, 0, y); q.addColorStop(0, green ? '#eafff4' : '#fff6dc'); q.addColorStop(1, green ? '#5fd4a0' : '#ffb45a'); g.fillStyle = q;
    g.beginPath(); if (arch) { g.moveTo(x, y); g.lineTo(x, y - wh + ww / 2); g.quadraticCurveTo(x + ww / 2, y - wh - ww * 0.3, x + ww, y - wh + ww / 2); g.lineTo(x + ww, y); g.closePath(); } else g.rect(x, y - wh, ww, wh); g.fill(); g.restore();
    g.fillStyle = 'rgba(6,5,15,.85)'; g.fillRect(x + ww / 2 - 0.6, y - wh, 1.2, wh); g.fillRect(x, y - wh * 0.55, ww, 1.2);
  };
  win(512, base - 18, 10, 18); win(542, base - 18, 10, 18); win(527, base - 50, 10, 16, true);
  win(586, base - 16, 12, 24); win(618, base - 16, 12, 24); win(696, base - 16, 12, 24); win(722, base - 16, 12, 24);
  win(586, base - 60, 12, 22); win(722, base - 60, 12, 22, true);
  win(590, base - 96, 9, 12); win(714, base - 96, 9, 12);
  win(652, base - 84, 18, 40, false, true); win(654, base - 150, 14, 30, true, true); win(656, base - 236, 10, 20, true, true);
  win(752, base - 22, 10, 20); win(788, base - 22, 10, 20); win(770, base - 60, 10, 16);
  win(818, base - 52, 9, 18, false, true); win(818, base - 104, 9, 18, true, true);
  // the door, and its light pouring down the steps
  g.save(); g.shadowColor = '#ffb45a'; g.shadowBlur = 20; g.fillStyle = '#ffdca6'; g.beginPath(); g.moveTo(652, base); g.lineTo(652, base - 24); g.quadraticCurveTo(661, base - 38, 670, base - 24); g.lineTo(670, base); g.closePath(); g.fill(); g.restore();
  const dg = g.createLinearGradient(0, base, 0, base + 40); dg.addColorStop(0, 'rgba(255,190,110,.55)'); dg.addColorStop(1, 'rgba(255,180,90,0)'); g.fillStyle = dg; g.beginPath(); g.moveTo(650, base); g.lineTo(672, base); g.lineTo(700, base + 40); g.lineTo(612, base + 40); g.closePath(); g.fill();
  // iron fence along the crest to the left of the house, posts leaning
  g.strokeStyle = '#05040c'; g.lineWidth = 2; g.beginPath(); g.moveTo(330, 466); g.lineTo(500, 404); g.stroke();
  for (let i = 0; i < 10; i++) { const t = i / 9, x = 330 + t * 170, y = 466 - t * 62, lean = (r() - 0.5) * 5; g.beginPath(); g.moveTo(x, y + 4); g.lineTo(x + lean, y - 22); g.stroke(); g.fillStyle = '#05040c'; g.beginPath(); g.moveTo(x + lean - 2.5, y - 20); g.lineTo(x + lean, y - 29); g.lineTo(x + lean + 2.5, y - 20); g.fill(); }
}
// A headstone at (x, yBase), half-width hw, height hh, tilted; type 0 round-top, 1 cross, 2 tall with R I P.
// k: how near it is (1 = front row: full contrast and texture; small = far, dissolved in the mist).
function bgHeadstone(g, r, x, yBase, hw, hh, tilt, type, k) {
  k = Math.max(0.25, Math.min(1, k));
  const mix = (c, f) => { const a = hexRgb(c), b = hexRgb('#8c90c8'); return 'rgb(' + a.map((v, i) => Math.round(v * f + b[i] * (1 - f))).join(',') + ')'; };
  bgPuff(g, x - hw * 0.9, yBase + 2, hw * 1.8, hw * 0.45, '#000000', 0.45 * k, 0, 0.6);   // cast shadow, the moon at the right
  g.save(); g.translate(x, yBase); g.rotate(tilt);
  const shape = () => { g.beginPath(); if (type === 1) { const a = hw * 0.34; g.moveTo(-a, 0); g.lineTo(-a, -hh * 0.62); g.lineTo(-hw, -hh * 0.62); g.lineTo(-hw, -hh * 0.78); g.lineTo(-a, -hh * 0.78); g.lineTo(-a, -hh); g.lineTo(a, -hh); g.lineTo(a, -hh * 0.78); g.lineTo(hw, -hh * 0.78); g.lineTo(hw, -hh * 0.62); g.lineTo(a, -hh * 0.62); g.lineTo(a, 0); g.closePath(); } else if (type === 2) { g.moveTo(-hw, 0); g.lineTo(-hw, -hh * 0.72); g.lineTo(-hw * 0.6, -hh * 0.82); g.lineTo(-hw * 0.6, -hh * 0.9); g.lineTo(hw * 0.6, -hh * 0.9); g.lineTo(hw * 0.6, -hh * 0.82); g.lineTo(hw, -hh * 0.72); g.lineTo(hw, 0); g.closePath(); g.rect(-hw * 0.5, -hh, hw, hh * 0.1); } else { g.moveTo(-hw, 0); g.lineTo(-hw, -hh + hw); g.arc(0, -hh + hw, hw, PI, 0); g.lineTo(hw, 0); g.closePath(); } };
  const q = g.createLinearGradient(-hw, 0, hw, 0); q.addColorStop(0, mix('#1a1630', k)); q.addColorStop(0.5, mix('#38335a', k)); q.addColorStop(0.85, mix('#6a6492', k)); q.addColorStop(1, mix('#7d76a8', k)); g.fillStyle = q; shape(); g.fill();
  g.save(); shape(); g.clip();
  bgTexture(g, -hw - 2, -hh - 2, hw * 2 + 4, hh + 4, 0.4 * k, { seed: 9, lo: 110, hi: 255 });
  bgPuff(g, hw * 0.3, -hh * 0.85, hw * 1.1, hh * 0.35, '#c8c0f4', 0.35 * k, 0, 0.5);   // moonlight on the top
  bgPuff(g, -hw * 0.3, -hh * 0.12, hw * 1.1, hh * 0.25, '#3f7a3a', 0.5 * k, 0, 0.6);   // moss at the foot
  if (k > 0.6) { g.strokeStyle = 'rgba(8,6,16,' + 0.6 * k + ')'; g.lineWidth = 1.1; g.beginPath(); g.moveTo(-hw * 0.6, -hh * 0.55); g.lineTo(-hw * 0.2, -hh * 0.42); g.lineTo(-hw * 0.3, -hh * 0.3); g.lineTo(0, -hh * 0.2); g.stroke(); }
  if (type === 2 && k > 0.5) { g.fillStyle = 'rgba(8,6,16,' + 0.7 * k + ')'; g.font = '700 ' + hw * 0.55 + 'px Cinzel, Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('R I P', 0, -hh * 0.6); g.fillRect(-hw * 0.55, -hh * 0.48, hw * 1.1, 1); g.fillRect(-hw * 0.4, -hh * 0.4, hw * 0.8, 1); }
  g.restore();
  g.strokeStyle = 'rgba(215,208,255,' + 0.5 * k + ')'; g.lineWidth = 1.4; g.beginPath(); if (type === 0) g.arc(0, -hh + hw, hw - 0.7, -PI * 0.5, -0.05); else { g.moveTo(hw - 0.7, -hh * 0.72); g.lineTo(hw - 0.7, 0); } g.stroke();
  g.strokeStyle = 'rgba(4,3,10,' + 0.5 * k + ')'; g.beginPath(); g.moveTo(-hw + 0.7, 0); g.lineTo(-hw + 0.7, -hh * 0.6); g.stroke();
  g.restore();
}
// The wraith: no sheet, no outline, a body of light. Its base is at (x, yBase); it leans and trails left.
function bgWraith(g, r, x0, yBase0, s = 1) {
  g.save(); g.translate(x0, yBase0); g.scale(s, s); const x = 0, yBase = 0;
  g.save(); g.globalCompositeOperation = 'lighter';
  bgPuff(g, x, yBase - 80, 110, 150, '#2fa070', 0.16, 0, 0.45);
  bgPuff(g, x, yBase - 85, 40, 92, '#5fe0a0', 0.55, 0.06, 0.5);
  bgPuff(g, x + 2, yBase - 95, 22, 64, '#c8ffe6', 0.75, 0.06, 0.5);
  bgPuff(g, x + 6, yBase - 142, 23, 27, '#e8fff4', 0.9, 0, 0.5);
  bgPuff(g, x - 10, yBase - 118, 36, 14, '#9fffd0', 0.3, 0.5, 0.5); bgPuff(g, x + 26, yBase - 110, 30, 12, '#9fffd0', 0.3, -0.4, 0.5);   // arms raised in the light
  for (let i = 0; i < 6; i++) bgPuff(g, x - 24 - i * 22, yBase - 36 + i * 8, 24 - i * 2.5, 13 - i, '#7fffc0', 0.28 - i * 0.04, 0.2, 0.5);   // the trail
  g.restore();
  // the face: hollows in the light
  bgPuff(g, x - 1, yBase - 146, 5, 6, '#031a10', 0.6, 0.3, 0.6); bgPuff(g, x + 14, yBase - 148, 4.5, 6.5, '#031a10', 0.55, -0.1, 0.6); bgPuff(g, x + 7, yBase - 128, 4, 7, '#031a10', 0.45, 0.1, 0.6);
  bgPuff(g, x, yBase + 6, 130, 26, '#5fe0a0', 0.22, 0, 0.5);   // its light on the fog at its feet
  g.restore();
}
// A gate pillar at x (centre), from yTop to the bottom of the glass: stone blocks, a cap and an urn, moss, ivy.
// lit: +1 when the moon is to the right of it, -1 to the left.
function bgPillar(g, r, x, yTop, hw, lit) {
  const q = g.createLinearGradient(x - hw, 0, x + hw, 0);
  if (lit > 0) { q.addColorStop(0, '#0a0914'); q.addColorStop(0.55, '#221f36'); q.addColorStop(0.92, '#4c4768'); q.addColorStop(1, '#2a2640'); } else { q.addColorStop(0, '#2a2640'); q.addColorStop(0.08, '#4c4768'); q.addColorStop(0.45, '#221f36'); q.addColorStop(1, '#0a0914'); }
  g.fillStyle = q; g.fillRect(x - hw, yTop, hw * 2, 662 - yTop);
  g.save(); g.beginPath(); g.rect(x - hw, yTop, hw * 2, 662 - yTop); g.clip();
  bgTexture(g, x - hw, yTop, hw * 2, 662 - yTop, 0.45, { seed: 4, lo: 100, hi: 255 });
  g.strokeStyle = 'rgba(5,4,10,.6)'; g.lineWidth = 1.6; for (let y = yTop + 34; y < 662; y += 36) { g.beginPath(); g.moveTo(x - hw, y + (r() - 0.5) * 2); g.lineTo(x + hw, y + (r() - 0.5) * 2); g.stroke(); if (((y / 36) | 0) % 2) { g.beginPath(); g.moveTo(x + lit * hw * 0.2, y); g.lineTo(x + lit * hw * 0.2, y + 36); g.stroke(); } }
  g.strokeStyle = 'rgba(200,195,240,.16)'; g.lineWidth = 1; for (let y = yTop + 35; y < 662; y += 36) { g.beginPath(); g.moveTo(x - hw, y + 1.5); g.lineTo(x + hw, y + 1.5); g.stroke(); }
  bgPuff(g, x - lit * hw * 0.4, 640, hw * 1.4, 60, '#2f6a32', 0.55, 0, 0.6);   // moss and damp at the foot
  for (let i = 0; i < 26; i++) { const ix = x - lit * hw * 0.55 + (r() - 0.5) * hw * 0.8, iy = 662 - i * 11 - r() * 8; g.fillStyle = 'rgba(8,16,10,' + (0.55 + r() * 0.35) + ')'; g.beginPath(); g.ellipse(ix, iy, 5 + r() * 4, 3.5 + r() * 2, r() * PI, 0, TAU); g.fill(); }   // ivy
  g.restore();
  // cap and urn
  const cap = g.createLinearGradient(0, yTop - 12, 0, yTop + 4); cap.addColorStop(0, '#5a5578'); cap.addColorStop(1, '#1e1b30'); g.fillStyle = cap; g.fillRect(x - hw - 8, yTop - 12, hw * 2 + 16, 14);
  g.fillStyle = 'rgba(220,214,255,.35)'; g.fillRect(x - hw - 8, yTop - 12, hw * 2 + 16, 2);
  g.save(); g.translate(x, yTop - 12);
  const ug = g.createLinearGradient(-hw * 0.6, 0, hw * 0.6, 0); if (lit > 0) { ug.addColorStop(0, '#0e0c1a'); ug.addColorStop(0.6, '#2a2742'); ug.addColorStop(0.9, '#56507a'); ug.addColorStop(1, '#2c2944'); } else { ug.addColorStop(0, '#2c2944'); ug.addColorStop(0.1, '#56507a'); ug.addColorStop(0.4, '#2a2742'); ug.addColorStop(1, '#0e0c1a'); }
  g.fillStyle = ug; g.beginPath(); g.moveTo(-hw * 0.5, 0); g.lineTo(-hw * 0.4, -10); g.bezierCurveTo(-hw * 0.9, -30, -hw * 0.8, -62, -hw * 0.3, -70); g.lineTo(-hw * 0.4, -80); g.lineTo(hw * 0.4, -80); g.lineTo(hw * 0.3, -70); g.bezierCurveTo(hw * 0.8, -62, hw * 0.9, -30, hw * 0.4, -10); g.lineTo(hw * 0.5, 0); g.closePath(); g.fill();
  g.fillStyle = ug; g.beginPath(); g.ellipse(0, -84, hw * 0.3, 6, 0, 0, TAU); g.fill(); g.beginPath(); g.arc(0, -94, 7, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(220,214,255,.4)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(lit * hw * 0.28, -70); g.bezierCurveTo(lit * hw * 0.78, -62, lit * hw * 0.86, -30, lit * hw * 0.38, -10); g.stroke();
  g.restore();
}
// An iron gate leaf standing open along its pillar (hinge at x, dir +1 opens rightwards): thick bars with spikes,
// two rails, a moonlit edge on each bar.
function bgGateBars(g, x, yTop, dir) {
  g.lineCap = 'round';
  for (let i = 0; i < 3; i++) { const bx = x + dir * (12 + i * 30), top = yTop + 26 - i * 14, wd = 5.5 + i * 1.2; g.strokeStyle = '#08070f'; g.lineWidth = wd; g.beginPath(); g.moveTo(bx, top); g.lineTo(bx, 662); g.stroke(); g.strokeStyle = 'rgba(190,185,235,.3)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(bx + dir * wd * 0.3, top + 14); g.lineTo(bx + dir * wd * 0.3, 662); g.stroke(); g.fillStyle = '#08070f'; g.beginPath(); g.moveTo(bx - wd * 0.9, top + 2); g.lineTo(bx, top - 16); g.lineTo(bx + wd * 0.9, top + 2); g.closePath(); g.fill(); }
  g.strokeStyle = '#08070f'; g.lineWidth = 5; for (const dy of [44, 190]) { g.beginPath(); g.moveTo(x, yTop + dy); g.lineTo(x + dir * 80, yTop + dy - 20); g.stroke(); }
  g.strokeStyle = 'rgba(190,185,235,.3)'; g.lineWidth = 1.2; for (const dy of [42, 188]) { g.beginPath(); g.moveTo(x, yTop + dy); g.lineTo(x + dir * 80, yTop + dy - 20); g.stroke(); }
}
function paintApron(g, w, h) {
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#2a1838'); gr.addColorStop(1, '#0e0814'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.strokeStyle = 'rgba(232,192,112,.6)'; g.lineWidth = 3; g.strokeRect(10, 10, w - 20, h - 20);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '700 46px Cinzel, Georgia'; g.fillStyle = '#c8ffe0'; g.shadowColor = '#3aff9a'; g.shadowBlur = 14; g.fillText('HAUNTED MANOR', w / 2, h * 0.68); g.shadowBlur = 0;
  g.font = '700 16px Georgia'; g.fillStyle = 'rgba(232,220,192,.8)';
  g.fillText('THE COFFIN LOCKS  ·  THE STAIRS TO THE ATTIC  ·  R-I-P OPENS THE CELLAR', w / 2, h * 0.86);
  web(g, 0, 0, 90, 1); web(g, w, 0, 90, -1);
}
function paintSides(g, w, h) {
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#2a1838'); gr.addColorStop(1, '#0c0612'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.globalAlpha = 0.25; g.strokeStyle = '#b48cff'; g.lineWidth = 2;
  for (let x = 0; x < w; x += 48) { g.beginPath(); g.ellipse(x + 24, h / 2, 10, 22, 0, 0, TAU); g.stroke(); }
  g.globalAlpha = 1; g.fillStyle = '#3aff9a'; g.fillRect(0, h - 10, w, 3); g.fillStyle = 'rgba(232,192,112,.7)'; g.fillRect(0, 8, w, 2);
}
function paintBackboard(g, w, h) {
  // wallpaper with a dado rail; portraits and the manor are 3D models in front of it
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#1e1428'); gr.addColorStop(1, '#2c1c3a'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.globalAlpha = 0.18; g.strokeStyle = '#c9a8ff'; g.lineWidth = 2;
  for (let y = 20; y < h; y += 50) for (let x = ((y / 50) % 2) * 30; x < w; x += 60) { g.beginPath(); g.ellipse(x, y, 10, 18, 0, 0, TAU); g.stroke(); }
  g.globalAlpha = 1; g.fillStyle = '#3a2416'; g.fillRect(0, h - 40, w, 40); g.fillStyle = 'rgba(232,192,112,.5)'; g.fillRect(0, h - 42, w, 3);
}
function spinArt(g, w, h) { g.fillStyle = '#cfc4e8'; g.fillRect(0, 0, w, h); g.fillStyle = '#2a1838'; g.font = '700 54px Cinzel, Georgia'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('HALL', w / 2, h / 2 + 3); }
function portraitArt(g, w, h, i) {
  g.fillStyle = '#3a2416'; g.fillRect(0, 0, w, h); g.fillStyle = '#c8a050'; g.fillRect(4, 4, w - 8, h - 8); g.fillStyle = ['#2a3a2e', '#3a2a3e', '#2e2a3a'][i]; g.fillRect(12, 12, w - 24, h - 24);
  g.fillStyle = '#e8d4b8'; g.beginPath(); g.ellipse(w / 2, h * 0.42, w * 0.18, h * 0.16, 0, 0, TAU); g.fill();
  g.fillStyle = '#111'; g.fillRect(w / 2 - 12, h * 0.38, 6, 4); g.fillRect(w / 2 + 6, h * 0.38, 6, 4);
  g.fillStyle = ['#222', '#3a1a1a', '#1a1a3a'][i]; g.fillRect(w * 0.28, h * 0.58, w * 0.44, h * 0.3);
}
function boneArt(g, w, h) { g.fillStyle = '#2a2028'; g.fillRect(0, 0, w, h); g.fillStyle = '#efe6cf'; g.fillRect(w * 0.2, h * 0.45, w * 0.6, h * 0.1); [[0.2, 0.42], [0.2, 0.58], [0.8, 0.42], [0.8, 0.58]].forEach(([x, y]) => { g.beginPath(); g.arc(w * x, h * y, w * 0.09, 0, TAU); g.fill(); }); }
function ghostCap(g, w, h) {
  const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); gr.addColorStop(0, '#d8fff0'); gr.addColorStop(0.6, '#5ad8a0'); gr.addColorStop(1, '#1a5a40'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(10,30,20,.85)'; g.beginPath(); g.ellipse(w * 0.38, h * 0.42, 14, 20, 0, 0, TAU); g.ellipse(w * 0.62, h * 0.42, 14, 20, 0, 0, TAU); g.fill(); g.beginPath(); g.ellipse(w / 2, h * 0.68, 16, 12, 0, 0, TAU); g.fill();
}
function skullCap(g, w, h) { g.fillStyle = '#ff7a3a'; g.fillRect(0, 0, w, h); g.fillStyle = '#efe6cf'; g.beginPath(); g.arc(w / 2, h * 0.45, w * 0.28, 0, TAU); g.fill(); g.fillStyle = '#300'; g.beginPath(); g.arc(w * 0.4, h * 0.45, 12, 0, TAU); g.arc(w * 0.6, h * 0.45, 12, 0, TAU); g.fill(); }
function doorArt(g, w, h) { g.fillStyle = '#3a2416'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = 5; for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(i * w / 4, 0); g.lineTo(i * w / 4, h); g.stroke(); } g.fillStyle = '#8a8a90'; g.fillRect(w * 0.42, h * 0.1, w * 0.16, h * 0.12); }
function pixGhost(g, x, y) { g.fillStyle = '#fff'; const S = [[1, 0, 4], [0, 1, 6], [0, 2, 6], [0, 3, 6], [0, 4, 6], [0, 5, 6]]; S.forEach(([dx, dy, w]) => g.fillRect(x + dx, y + dy, w, 1)); g.fillRect(x, y + 6, 1, 1); g.fillRect(x + 2, y + 6, 2, 1); g.fillRect(x + 5, y + 6, 1, 1); g.fillStyle = '#000'; g.fillRect(x + 1, y + 2, 1, 1); g.fillRect(x + 4, y + 2, 1, 1); }
// the hologram ghost (drawn each frame on a 256x320 canvas)
function drawGhost(g, w, h, t, holo) {
  const k = holo.flare, bob = Math.sin(t * 2) * 6;
  g.save(); g.translate(w / 2, h * 0.42 + bob);
  g.filter = 'blur(6px)';
  // layered translucent veils: a tall soft body that trails into wisps
  for (let L = 0; L < 3; L++) {
    const sw = 1 + L * 0.18, al = (0.55 - L * 0.15) + k * 0.2;
    const gr = g.createRadialGradient(0, -40, 4, 0, 10, 130 * sw); gr.addColorStop(0, 'rgba(225,255,240,' + al + ')'); gr.addColorStop(0.45, 'rgba(140,235,200,' + al * 0.55 + ')'); gr.addColorStop(1, 'rgba(80,200,180,0)');
    g.fillStyle = gr; g.beginPath(); g.moveTo(-62 * sw, 20);
    g.bezierCurveTo(-70 * sw, -100, 70 * sw, -100, 62 * sw, 20);
    for (let i = 0; i <= 5; i++) { const x = (62 - i * 25) * sw, y = 90 + Math.sin(t * 3.5 + i * 1.7 + L) * 22 + (i % 2 ? 26 : 0); g.quadraticCurveTo(x + 12, y - 30, x, y); }
    g.closePath(); g.fill();
  }
  g.filter = 'blur(3px)';
  // arms reaching forward
  g.strokeStyle = 'rgba(190,255,230,.45)'; g.lineWidth = 14; g.lineCap = 'round'; g.beginPath(); g.moveTo(-48, -6); g.quadraticCurveTo(-92, -20 + Math.sin(t * 3) * 12, -102, -52); g.moveTo(48, -6); g.quadraticCurveTo(92, -20 - Math.sin(t * 3) * 12, 102, -52); g.stroke();
  // hollow eyes and a wailing mouth: dark softened holes
  g.fillStyle = 'rgba(8,30,36,.8)'; g.beginPath(); g.ellipse(-20, -44, 9, 16, -0.15, 0, TAU); g.ellipse(20, -44, 9, 16, 0.15, 0, TAU); g.fill();
  g.beginPath(); g.ellipse(0, -6, 11, 12 + Math.sin(t * 4) * 6, 0, 0, TAU); g.fill();
  g.filter = 'none';
  g.restore();
}

// ═══════════════════════════════════════════════════════════════════════════
// 3D MODELS
// ═══════════════════════════════════════════════════════════════════════════
function mesh(geo, mat, cast = true) { const m = new THREE.Mesh(geo, mat); m.castShadow = cast; m.receiveShadow = true; return m; }
function coffinModel(RC) {
  const g = new THREE.Group(), wood = RC.mats.wood('#4a2a1a', 'coffin'), dark = RC.mats.paint('#1a0e0a', { roughness: 0.6 }), brass = RC.mats.brass();
  const shape = new THREE.Shape(); COFFIN.forEach((p, i) => i ? shape.lineTo(p[0], p[1]) : shape.moveTo(p[0], p[1])); shape.closePath();
  const body = new THREE.ExtrudeGeometry(shape, { depth: 26, bevelEnabled: true, bevelThickness: 2, bevelSize: 2, bevelSegments: 2 });
  RC.batch.add(wood, body);
  // lid in two halves: the foot half opens (the hand comes out)
  const lidShape = new THREE.Shape(); const inset = offsetLine(COFFIN.concat([COFFIN[0]]), -3).slice(0, -1); inset.forEach((p, i) => i ? lidShape.lineTo(p[0], p[1]) : lidShape.moveTo(p[0], p[1])); lidShape.closePath();
  const lid = new THREE.ExtrudeGeometry(lidShape, { depth: 5, bevelEnabled: true, bevelThickness: 1.5, bevelSize: 1.5, bevelSegments: 2 });
  const lidM = mesh(lid, RC.mats.wood('#5a3420', 'lid')); lidM.position.z = 28;
  const hinge = new THREE.Group(); hinge.position.set(0, 0, 0); hinge.add(lidM); g.add(hinge);
  // brass cross and handles
  const cross = mesh(new THREE.BoxGeometry(6, 44, 2), brass); cross.position.set(262, 718, 36); lidM.add(cross); cross.position.set(262, 718, 8);
  const cross2 = mesh(new THREE.BoxGeometry(26, 6, 2), brass); lidM.add(cross2); cross2.position.set(262, 728, 8);
  [[234, 700], [290, 700], [234, 735], [290, 735]].forEach(p => { const h = new THREE.TorusGeometry(4, 1, 6, 12); h.rotateY(PI / 2); h.translate(p[0], p[1], 14); RC.batch.add(brass, h); });
  RC.root.add(g);
  // the lid tilts open at the foot while the hand is out
  RC.anim.push((dt, t) => {
    const hand = RC.G.comps.hand, open = hand && hand.state !== 'idle' ? 1 : hand ? hand.rise : 0;
    const B = RC.G.b, mb = B && (B.grave || B.witch);
    lidM.position.z = 28 + open * 6 + (mb ? Math.abs(Math.sin(t * 9)) * 4 : 0);
    hinge.rotation.x = 0; lidM.rotation.x = -open * 0.25; lidM.position.y = open * 16;
  });
  return null;
}
function handModel(RC, grab) {
  // a skeletal hand: palm, four jointed fingers and a thumb (bone), plus a forearm that stretches back to the
  // coffin. The palm faces DOWN over the ball (fingers curl round it); the forearm is re-aimed every frame.
  const g = new THREE.Group(), bone = RC.mats.plastic('#d8cfb4', { roughness: 0.62, clearcoat: 0.1 });
  const palm = mesh(new THREE.BoxGeometry(24, 22, 7), bone); palm.position.set(0, 0, 0); g.add(palm);
  for (let k = 0; k < 4; k++) { const r = mesh(new THREE.CylinderGeometry(2.4, 2.6, 20, 7), bone); r.rotation.x = PI / 2; r.position.set(-8.5 + k * 5.7, -2, 0); g.add(r); }   // metacarpals
  const fingers = [];
  for (let i = 0; i < 4; i++) {
    const f = new THREE.Group(); f.position.set(-8.5 + i * 5.7, 11, 0); g.add(f);
    const L1 = 12 - Math.abs(i - 1.5) * 1.5, L2 = 9 - Math.abs(i - 1.5);
    const s1 = mesh(new THREE.CylinderGeometry(1.8, 2.2, L1, 6), bone); s1.position.y = L1 / 2; f.add(s1);
    const j = new THREE.Group(); j.position.y = L1; f.add(j);
    const s2 = mesh(new THREE.CylinderGeometry(1.4, 1.8, L2, 6), bone); s2.position.y = L2 / 2; j.add(s2);
    const j2 = new THREE.Group(); j2.position.y = L2; j.add(j2);
    const s3 = mesh(new THREE.CylinderGeometry(1.1, 1.4, 6, 6), bone); s3.position.y = 3; j2.add(s3);
    [f, j, j2].forEach(k => k.add(mesh(new THREE.SphereGeometry(2.1, 8, 6), bone)));
    fingers.push([f, j, j2]);
  }
  const th = new THREE.Group(); th.position.set(-13, -4, 0); th.rotation.z = 0.9; g.add(th);
  const t1 = mesh(new THREE.CylinderGeometry(2.2, 2.6, 12, 6), bone); t1.position.y = 6; th.add(t1);
  const tj = new THREE.Group(); tj.position.y = 12; th.add(tj); const t2 = mesh(new THREE.CylinderGeometry(1.6, 2.1, 9, 6), bone); t2.position.y = 4.5; tj.add(t2);
  const wrist = mesh(new THREE.SphereGeometry(5, 10, 8), bone); wrist.position.set(0, -13, 0); g.add(wrist);
  // forearm: radius and ulna, aimed from the coffin to the wrist each frame
  const arm = new THREE.Group(); const ra = mesh(new THREE.CylinderGeometry(2.6, 3.4, 1, 8), bone); ra.rotation.x = PI / 2; ra.position.x = 3; arm.add(ra);
  const ul = mesh(new THREE.CylinderGeometry(2.2, 3, 1, 8), bone); ul.rotation.x = PI / 2; ul.position.x = -3; arm.add(ul); RC.root.add(arm);
  const gl = new THREE.Mesh(new THREE.PlaneGeometry(44, 44), RC.mats.glow('#7dffbf')); gl.position.set(0, 0, -3); gl.rotation.x = PI; g.add(gl);
  g.userData = { fingers, thumb: tj, thumbRoot: th, glow: gl, arm, armBones: [ra, ul] };
  return g;
}
const HAND_HOME = new THREE.Vector3(262, 712, -30);
function handAnimate(m, grab, dt) {
  const u = m.userData, rise = Math.min(1, grab.rise), vis = grab.state !== 'idle' || grab.rise > 0.02;
  m.visible = vis; u.arm.visible = vis;
  if (!vis) return;
  // the hand hangs palm-down over the ball; while rising it unfolds out of the coffin
  m.position.set(grab.pos.x, grab.pos.y, grab.pos.z + 2);
  m.rotation.set(PI - (1 - rise) * 1.2, 0, 0);
  const curl = grab.curl;
  u.fingers.forEach(([f, j, j2], i) => { f.rotation.x = -(0.25 + curl * 0.9 + i * 0.03); j.rotation.x = -(0.2 + curl * 1.1); j2.rotation.x = -(0.1 + curl * 0.8); });
  u.thumb.rotation.x = -(0.2 + curl * 0.9); u.thumbRoot.rotation.y = -curl * 0.6;
  u.glow.material.opacity = grab.state === 'grip' || grab.state === 'carry' ? 0.75 : 0.12;
  // forearm from the coffin to the wrist
  const wrist = new THREE.Vector3(0, -13, 0).applyMatrix4(m.matrixWorld ? m.matrix : m.matrix); m.updateMatrix(); wrist.set(0, -13, 0).applyMatrix4(m.matrix);
  const from = HAND_HOME.clone().lerp(new THREE.Vector3(262, 700, 0), rise * 0.5);
  const len = Math.max(10, wrist.distanceTo(from));
  u.arm.position.copy(from).lerp(wrist, 0.5); u.arm.lookAt(wrist); u.armBones.forEach(b => { b.scale.y = len; });
}
function chandelierModel(RC, comp) {
  const g = new THREE.Group(); g.position.set(CHAND[0], CHAND[1], 0);
  const iron = RC.mats.iron(), brass = RC.mats.brass();
  // hanging from an iron bracket that arches over from the post by the stairs (static)
  const bx = 90, by = 604;
  RC.batch.add(iron, tubeGeo([[bx, by, 34], [bx + 4, by, 70], [CHAND[0] + (bx - CHAND[0]) * 0.55, CHAND[1] + (by - CHAND[1]) * 0.6, 92], [CHAND[0], CHAND[1], 90]], 2.4, 24, 6));
  const pivot = new THREE.Group(); pivot.position.z = 88; g.add(pivot);
  const chain = mesh(new THREE.CylinderGeometry(0.8, 0.8, 20, 5), iron); chain.rotation.x = PI / 2; chain.position.z = -10; pivot.add(chain);
  const body = new THREE.Group(); body.position.z = -27; pivot.add(body);
  const brassG = [new THREE.TorusGeometry(26, 1.8, 8, 40), new THREE.SphereGeometry(5, 12, 8)], candleG = [], flameG = [], dropG = [];
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * TAU, x = Math.cos(a) * 26, y = Math.sin(a) * 26;
    brassG.push(tubeGeo([[0, 0, 0], [x * 0.5, y * 0.5, -6], [x, y, 0]], 1, 8, 5));
    const cup = new THREE.CylinderGeometry(3.2, 2, 3, 10); cup.rotateX(PI / 2); cup.translate(x, y, 1.5); brassG.push(cup);
    const cd = new THREE.CylinderGeometry(1.8, 1.8, 9, 8); cd.rotateX(PI / 2); cd.translate(x, y, 7.5); candleG.push(cd);
    const fl = new THREE.PlaneGeometry(9, 14); fl.rotateX(PI / 2 - 0.4); fl.translate(x, y, 15); flameG.push(fl);
  }
  for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; const d = new THREE.OctahedronGeometry(1.8); d.scale(1, 1, 1.8); d.translate(Math.cos(a) * 26, Math.sin(a) * 26, -6); dropG.push(d); }
  body.add(mesh(mergeGeos(brassG), brass)); body.add(mesh(mergeGeos(candleG), RC.mats.plastic('#f2ead8', { roughness: 0.6 })));
  const drops = new THREE.Mesh(mergeGeos(dropG), RC.mats.clear('#ffffff', 0.6)); body.add(drops);
  const flames = new THREE.Mesh(mergeGeos(flameG), RC.mats.glow('#ffb45a')); flames.renderOrder = 8; body.add(flames);
  g.userData = { body, flames, pivot };
  return g;
}
function chandelierAnimate(g, dt, comp) {
  const u = g.userData, held = !!comp.held, t = comp.G.time;
  u.spin = (u.spin || 0) + dt * (held ? 3 : 0.15); u.body.rotation.z = u.spin;
  u.pivot.rotation.x = Math.sin(t * 0.8) * 0.03 + (held ? Math.sin(t * 12) * 0.03 : 0); u.pivot.rotation.y = Math.cos(t * 0.6) * 0.03;
  const k = 0.75 + 0.25 * Math.sin(t * 17) * Math.sin(t * 5.3); u.flames.scale.set(1, 1, k * (held ? 1.5 : 1)); u.flames.material.opacity = (comp.active ? 1 : 0.7) * (1 - comp.G.dark * 0.2);
}
function manorModel(RC) {
  // the manor house front at the back right, behind the top lanes (static: batched)
  const ox = 400, oy = 1052, B = RC.batch;
  const stone = RC.mats.paint('#3a3242', { roughness: 0.85 }), roof = RC.mats.paint('#1a1420', { roughness: 0.7 }), trim = RC.mats.paint('#5a4a62');
  const winMat = new THREE.MeshStandardMaterial({ color: '#201008', emissive: '#ffb45a', emissiveIntensity: 1.6 });
  const put = (geo, x, y, z) => { geo.translate(ox + x, oy + y, z); return geo; };
  B.add(stone, put(new THREE.BoxGeometry(150, 24, 96), 0, 0, 48));
  const gs = new THREE.Shape(); gs.moveTo(-82, 0); gs.lineTo(0, 46); gs.lineTo(82, 0); gs.closePath();
  const gab = new THREE.ExtrudeGeometry(gs, { depth: 30, bevelEnabled: false }); gab.rotateX(PI / 2); B.add(roof, put(gab, 0, 15, 96));
  B.add(stone, put(new THREE.CylinderGeometry(20, 22, 150, 16).rotateX(PI / 2), -86, 4, 75));
  B.add(roof, put(new THREE.ConeGeometry(26, 56, 16).rotateX(PI / 2), -86, 4, 178));
  // stone courses (shallow boxes) give the walls relief
  for (let i = 0; i < 5; i++) B.add(trim, put(new THREE.BoxGeometry(152, 25, 1.2), 0, 0, 12 + i * 18));
  const wins = [];
  [[-50, 30], [-20, 30], [20, 30], [50, 30], [-50, 66], [50, 66]].forEach(([x, z]) => { wins.push(put(new THREE.BoxGeometry(14, 2, 20), x, -12.5, z)); B.add(trim, put(new THREE.BoxGeometry(18, 3, 24), x, -11.8, z)); });
  wins.push(put(new THREE.BoxGeometry(10, 2, 18), -86, -18, 110));
  const winGeo = mergeGeos(wins); const winMesh = new THREE.Mesh(winGeo, winMat); RC.root.add(winMesh);
  const sgC = canvas(128, 128), sg = sgC.getContext('2d');
  const cols = ['#ff3050', '#30a0ff', '#ffd040', '#40ff90', '#b060ff', '#ff8030'];
  for (let i = 0; i < 12; i++) { sg.fillStyle = cols[i % 6]; sg.beginPath(); sg.moveTo(64, 64); sg.arc(64, 64, 60, i / 12 * TAU, (i + 1) / 12 * TAU); sg.fill(); }
  sg.strokeStyle = '#111'; sg.lineWidth = 4; for (let i = 0; i < 12; i++) { sg.beginPath(); sg.moveTo(64, 64); sg.lineTo(64 + Math.cos(i / 12 * TAU) * 62, 64 + Math.sin(i / 12 * TAU) * 62); sg.stroke(); } sg.beginPath(); sg.arc(64, 64, 22, 0, TAU); sg.stroke(); sg.beginPath(); sg.arc(64, 64, 60, 0, TAU); sg.stroke();
  const sgT = RC.tex(sgC);
  const rose = new THREE.Mesh(new THREE.CircleGeometry(15, 32), new THREE.MeshStandardMaterial({ map: sgT, emissiveMap: sgT, emissive: '#ffffff', emissiveIntensity: 1.4 }));
  rose.position.set(ox, oy - 15.5, 112); rose.rotation.x = PI / 2; RC.root.add(rose);
  B.add(trim, put(new THREE.TorusGeometry(16, 2, 8, 32).rotateX(PI / 2), 0, -15.5, 112));
  B.add(RC.mats.wood('#3a2010', 'door'), put(new THREE.BoxGeometry(22, 4, 36), 0, -13, 18));
  RC.anim.push((dt, t) => { const d = RC.G.dark, flick = RC.G.b && RC.G.b.witch ? (Math.random() < 0.1 ? 0.2 : 1) : 1; winMat.emissiveIntensity = (1.6 - d * 0.9) * flick * (0.92 + 0.08 * Math.sin(t * 9)); rose.material.emissiveIntensity = 1.4 + RC.G.lightning * 2; });
  return null;
}
function mergeGeos(list) {
  const out = []; let n = 0;
  for (const g0 of list) { const g = g0.index ? g0.toNonIndexed() : g0; out.push(g); n += g.attributes.position.count; }
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2); let o = 0;
  for (const g of out) { pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); if (g.attributes.uv) uv.set(g.attributes.uv.array, o * 2); o += g.attributes.position.count; }
  const m = new THREE.BufferGeometry(); m.setAttribute('position', new THREE.BufferAttribute(pos, 3)); m.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); m.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); return m;
}
function portraitsModel(RC) {
  // three oil portraits on the back wall (one atlas texture, one mesh); their eyes follow the ball
  const c = canvas(768, 320), p = c.getContext('2d'), rr = rng(21);
  const people = [['#243428', '#1a1a1a', '#3a2010', 'lady'], ['#3a2232', '#2a0e14', '#9a9a9a', 'lord'], ['#26304a', '#1a1a2e', '#c89040', 'child']];
  people.forEach(([bg0, coat, hair], i) => {
    const x0 = i * 256; p.save(); p.translate(x0, 0);
    const bg = p.createRadialGradient(128, 120, 10, 128, 160, 220); bg.addColorStop(0, bg0); bg.addColorStop(1, '#050404'); p.fillStyle = bg; p.fillRect(0, 0, 256, 320);
    // shoulders and coat
    const cg = p.createLinearGradient(0, 180, 0, 320); cg.addColorStop(0, coat); cg.addColorStop(1, '#030303'); p.fillStyle = cg; p.beginPath(); p.moveTo(20, 320); p.bezierCurveTo(40, 200, 90, 180, 128, 180); p.bezierCurveTo(166, 180, 216, 200, 236, 320); p.fill();
    // neck and face with soft shading
    p.fillStyle = '#b89070'; p.fillRect(112, 150, 32, 40);
    const fg = p.createRadialGradient(112, 110, 10, 128, 125, 60); fg.addColorStop(0, '#f0d8bc'); fg.addColorStop(0.7, '#c9a07c'); fg.addColorStop(1, '#6a4a38'); p.fillStyle = fg; p.beginPath(); p.ellipse(128, 125, 44, 56, 0, 0, TAU); p.fill();
    // hair
    const hg = p.createLinearGradient(0, 60, 0, 130); hg.addColorStop(0, hair); hg.addColorStop(1, '#0a0806'); p.fillStyle = hg; p.beginPath(); p.ellipse(128, 86, 50, 34, 0, PI, TAU); p.fill(); if (i === 0) { p.beginPath(); p.ellipse(84, 130, 14, 50, 0.2, 0, TAU); p.ellipse(172, 130, 14, 50, -0.2, 0, TAU); p.fill(); }
    // eye sockets (shadowed), the whites; pupils are 3D so they can move
    p.fillStyle = 'rgba(60,30,30,.55)'; p.beginPath(); p.ellipse(110, 118, 12, 7, 0, 0, TAU); p.ellipse(146, 118, 12, 7, 0, 0, TAU); p.fill();
    p.fillStyle = '#efe6dc'; p.beginPath(); p.ellipse(110, 119, 9, 4.5, 0, 0, TAU); p.ellipse(146, 119, 9, 4.5, 0, 0, TAU); p.fill();
    p.strokeStyle = 'rgba(80,40,30,.7)'; p.lineWidth = 2; p.beginPath(); p.moveTo(118, 152); p.quadraticCurveTo(128, 157 - (i === 1 ? 6 : 0), 138, 152); p.stroke();
    p.fillStyle = 'rgba(120,60,50,.35)'; p.beginPath(); p.ellipse(128, 138, 5, 8, 0, 0, TAU); p.fill();
    // craquelure and varnish
    p.strokeStyle = 'rgba(0,0,0,.18)'; p.lineWidth = 0.7; for (let k = 0; k < 60; k++) { const x = rr() * 256, y = rr() * 320; p.beginPath(); p.moveTo(x, y); p.lineTo(x + (rr() - 0.5) * 30, y + (rr() - 0.5) * 30); p.stroke(); }
    const vg = p.createLinearGradient(0, 0, 256, 320); vg.addColorStop(0, 'rgba(255,240,200,.12)'); vg.addColorStop(0.5, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.35)'); p.fillStyle = vg; p.fillRect(0, 0, 256, 320);
    p.restore();
  });
  const t = RC.tex(c), geos = [], eyes = [], B = RC.batch;
  [70, 150, 230].forEach((x, i) => {
    const pg = new THREE.PlaneGeometry(58, 72); const uv = pg.attributes.uv; for (let k = 0; k < uv.count; k++) uv.setX(k, (uv.getX(k) + i) / 3);
    pg.rotateX(PI / 2); pg.translate(x, RC.L - 0.5, 70); geos.push(pg);
    B.add(RC.mats.brass(), boxGeo(x, RC.L + 2.5, 70, 68, 6, 82));
    B.add(RC.mats.brass(), boxGeo(x, RC.L - 1, 70, 62, 2, 76));
    [-4.1, 4.1].forEach(dx => eyes.push({ x0: x + dx, z0: 70 + 72 * (160 - 119) / 320 }));
  });
  const pics = new THREE.Mesh(mergeGeos(geos), new THREE.MeshStandardMaterial({ map: t, roughness: 0.55 })); RC.root.add(pics);
  const pupils = new THREE.InstancedMesh(new THREE.CircleGeometry(1.7, 10), new THREE.MeshBasicMaterial({ color: '#0a0a0a' }), eyes.length); RC.root.add(pupils);
  const mm = new THREE.Matrix4(), q = new THREE.Quaternion().setFromEuler(new THREE.Euler(PI / 2, 0, 0)), sc = new THREE.Vector3(1, 1, 1), pv = new THREE.Vector3();
  RC.anim.push(() => {
    const b = RC.G.world.balls.find(b => !b.hidden);
    eyes.forEach((E, i) => { let ex = E.x0, ez = E.z0; if (b) { const dx = b.x - E.x0, dy = RC.L - b.y, a = Math.atan2(dx, dy); ex += Math.sin(a) * 1.6; ez -= Math.min(1, dy / 800) * 1.0; } pv.set(ex, RC.L - 1.2, ez); mm.compose(pv, q, sc); pupils.setMatrixAt(i, mm); });
    pupils.instanceMatrix.needsUpdate = true;
  });
  return null;
}
function sceneryModel(RC) {
  const B = RC.batch;
  // candles on the back ledge (static), with flame planes merged into one mesh
  const flames = [];
  [[40, 1046], [212, 1046], [470, 1046]].forEach(([x, y]) => { B.add(RC.mats.plastic('#efe6d0', { roughness: 0.7 }), cylGeo(x, y, 3.8, 1, 27, 10)); B.add(RC.mats.brass(), cylGeo(x, y, 8, 0, 3.5, 14, 7)); const f = new THREE.PlaneGeometry(10, 16); f.rotateX(PI / 2); f.translate(x, y - 1, 34); flames.push(f); });
  const fm = new THREE.Mesh(mergeGeos(flames), RC.mats.glow('#ffb45a')); fm.renderOrder = 8; RC.root.add(fm);
  RC.anim.push((dt, t) => { fm.material.opacity = (0.75 + 0.25 * Math.sin(t * 17) * Math.sin(t * 5.3)) * (1 - RC.G.dark * 0.3); });
  // tombstones near the top lanes and the left wall
  const stone = RC.mats.paint('#5a5662', { roughness: 0.9 });
  [[226, 1036, 0.1], [362, 1030, -0.15], [16, 960, 0.2]].forEach(([x, y, r]) => { const s = new THREE.Shape(); s.moveTo(-9, 0); s.lineTo(-9, 18); s.absarc(0, 18, 9, PI, 0, true); s.lineTo(9, 0); s.closePath(); const geo = new THREE.ExtrudeGeometry(s, { depth: 5, bevelEnabled: true, bevelSize: 1, bevelThickness: 1, bevelSegments: 2 }); geo.rotateX(PI / 2); geo.rotateZ(r); geo.translate(x, y, 0); B.add(stone, geo); });
  // cobweb sheets in the top corners
  const wc = canvas(128, 128), wg = wc.getContext('2d'); web(wg, 0, 0, 125, 1);
  const wm = new THREE.MeshBasicMaterial({ map: RC.tex(wc), transparent: true, opacity: 0.45, depthWrite: false, side: THREE.DoubleSide });
  const w1 = new THREE.Mesh(new THREE.PlaneGeometry(70, 70), wm); w1.position.set(36, 1030, 50); w1.rotation.set(PI / 2 - 0.2, 0, PI); RC.root.add(w1);
  return null;
}
function candleFlicker(RC, t) {
  // the GI flickers like gas lamps; a little warm sway in the key light
  const G = RC.G, gi = RC.lights.gi;
  if (gi[4]) gi[4].intensity = gi[4].userData.base * (0.8 + 0.2 * Math.sin(t * 11) * Math.sin(t * 4.7)) * (1 - G.dark);
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPLAIN: the look-around instruction cards (tap a part of the table). Every number is what the code above pays,
// engine defaults included (README: "Table features").
// ═══════════════════════════════════════════════════════════════════════════
function makeExplain() {
  return {
    spinner: { name: 'Hall Spinner', text: '150 points every half turn. It hangs in the left orbit lane: shoot the Haunted Hall hard to spin it longer.' },
    hall: { ids: ['orbitL', 'orbitR'], kind: 'Orbit', name: 'Haunted Hall', text: '8,000 points for a loop round the top of the manor, either way. Big shots one after another score combos; in multiball both sides are jackpots.' },
    portraits: { name: 'The Portraits', text: '750 points for each portrait you knock down. Drop all three to light Lights Out at the séance scoop: 30 seconds in the dark, everything doubled and the ghost a jackpot.' },
    magna: { name: 'Magna-Save', text: 'Hold the MAGNET button as the ball heads down the left outlane: the magnet catches it, and letting go throws it back. One charge per ball; B-O-O and the séance add more.' },
    seance: { name: 'Séance Scoop', text: '12,500 points, then it starts whatever is lit: the Witching Hour, extra ball, Lights Out or Mist Multiball. Nothing lit? A random award: kickback, bonus up, 25,000, ball save or a magnet charge.' },
    kickback: { name: 'Resurrect', text: 'The right outlane kickback: while its lamp is lit, a draining ball is fired back into play. The crypt jackpot and the séance light it.' },
    coffin: { ids: ['coffinSaucer'], at: [[262, 708, 34]], kind: 'Ball lock', name: 'The Coffin', text: 'Knock on its foot (2,500 a knock) to light the lock, then shoot the hole in front: the skeletal hand drags the ball inside. Three balls start Grave Robber multiball, with a 250,000 super jackpot here.' },
    boo: { ids: ['boo0', 'boo1', 'boo2'], kind: 'Targets', name: 'B-O-O Targets', text: '1,000 points each. Spell B-O-O for 20,000 and a magnet charge, and the chandelier comes alive.' },
    chandelier: { name: 'The Chandelier', text: 'Once B-O-O lights it, its magnet catches the ball: 25,000 and a random award (bonus up, the cellar door, 50,000, ball save or extra ball).' },
    mist: { kind: 'Multiball', name: 'The Mist', text: 'Every third Spirit Walk lights Mist at the séance. A glowing ball drifts along here: hit it with yours (10,000 a hit) to free it and start Mist Multiball, with 50,000 jackpots.' },
    cellarDoor: { name: 'Cellar Trap Door', text: 'Spell R-I-P to open it for 20 seconds. Fall through for 25,000 and play the cellar under the floor with its own flippers.' },
    cellar: { kind: 'Lower playfield', name: 'The Cellar', text: 'A basement under the cracked floor with two flippers of its own, the Furnace, two bones and the secret stairs. Drain out of it and the ball comes back up on the left.' },
    furnace: { name: 'The Furnace', text: "The cellar's pop bumper: 2,000 points a hit." },
    bones: { ids: ['boneL', 'boneR'], kind: 'Targets', name: 'The Bones', text: '6,000 points each. Hit both bones and the secret stairs for the 100,000 crypt jackpot, which also lights the kickback.' },
    secretStairs: { ids: [], at: [[306, 462, 20]], lvl: 'cellar', kind: 'Hole', name: 'Secret Stairs', text: '20,000 points, and the ball climbs straight up to the attic. With both bones it wins the crypt jackpot.' },
    attic: { kind: 'Upper playfield', name: 'The Attic', text: 'A little playfield at the top of the Attic Stairs, with its own flipper on the left button. Spell W-I-L up here and visit the mirror.' },
    will: { ids: ['will0', 'will1', 'will2'], kind: 'Targets', name: 'W-I-L Targets', text: '1,000 points each. Spell W-I-L to read the will: the first time lights extra ball, after that it pays 75,000.' },
    mirror: { name: 'The Mirror', text: 'The attic scoop: 17,500 points and the bonus multiplier goes up a step.' },
    bannister: { name: 'The Bannister', text: "The attic's drain: the ball slides down the iron bannister to your left flipper, 5,000 points." },
    stairs: { name: 'Attic Stairs', text: '15,000 points a climb, and the ball rolls out onto the attic playfield. Big shots one after another score combos; it is a jackpot in multiball.' },
    spirit: { name: 'Spirit Walk', text: '20,000 points a ride round the iron wireform, 35,000 every third ride, which also lights Mist at the séance. A jackpot in multiball.' },
    pops: { ids: ['pop1', 'pop2', 'pop3'], kind: 'Pop bumpers', name: 'Spirit Bumpers', text: '500 points a hit (5,500 during the Witching Hour). Every hit adds to the Spirits line of the end-of-ball bonus.' },
    rip: { ids: ['laneR', 'laneI', 'laneP'], kind: 'Top lanes', name: 'R-I-P Lanes', text: '1,000 points each; the flipper buttons move the lit lanes. Spell R-I-P to raise the bonus multiplier and open the cellar door. A soft launch into the flashing lane is the 50,000 skill shot.' },
    ghost: { name: 'The Ghost', text: 'Pass through it for 5,000. During Lights Out and the Witching Hour it is a jackpot: 50,000, and 25,000 more each time you catch it.' },
    hand: null, coffinLock: null, cellarReturn: null
  };
}
