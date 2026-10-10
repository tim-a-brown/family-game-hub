// ═══════════════════════════════════════════════════════════════════════════
// NEON NIGHTS — synthwave after dark.
// Black gloss and a perspective grid, hot pink and cyan neon tubes (real
// emissive geometry, flicker and bloom), chrome everywhere, a sunset on the
// backboard. Signature pieces: the SKYLINE WHEEL (a lit ferris wheel at the
// back-left that carries the ball up and tips it onto a chrome wireform), the
// SUPER-LOOP (a neon ramp that climbs into a vertical corkscrew loop and lands
// on the ROOFTOP), the ROOFTOP (a raised deck with a MOVING LAUNCHER: slide it
// with the flippers, fire at the V-I-P bank), THE ORB (a ring-catch magnet
// under a hanging chrome orb that holds the ball dead centre and beams it into
// a lock), the DANCE FLOOR (two counter-rotating discs under the surface) and
// the WIND machine (a fan that blows the ball across the floor), a hologram DJ
// on the rooftop and a radio DJ on the mic. Wizard mode: MIDNIGHT DRIVE.
// ═══════════════════════════════════════════════════════════════════════════
import * as THREE from 'three';
import { BR, spline, deg } from '../physics.js';
import { canvas, rng, shade, rgba, cylGeo, tubeGeo, boxGeo, torusGeo, offsetLine } from '../gfx.js';
import { Comp, drawPath } from '../components.js';
import { audio } from '../engine.js';

const PI = Math.PI, TAU = PI * 2;
const C = { pink: '#ff3fa4', hot: '#ff6ad5', cyan: '#2ee6ff', violet: '#9b5cff', sun: '#ff8a3d', gold: '#ffd166', night: '#07050e', chrome: '#dfe4ee', mint: '#7dffd4' };
const fmt = n => Math.round(n).toLocaleString('en-US');

// ── Layout constants ───────────────────────────────────────────────────────
const WHEEL = { x: 134, y: 912, r: 50 };
const ORB = [243, 600];
const SCOOP = [314, 714];
const ROOF = { z: 56, box: [220, 920, 400, 1010] };
const DISCS = [[175, 470, 1], [311, 470, -1]];
const FAN = [458, 500];
const POPS = [[262, 800], [348, 800], [305, 866]];
const HOUSE_ARC = [260, 802, 216];

export default {
  id: 'neon', name: 'Neon Nights', short: 'NEON', diff: 2, color: '#f472b6', wizard: 'Midnight Drive',
  desc: 'Synthwave after dark: a lit ferris wheel, a neon loop-the-loop, a rooftop launcher and the Orb.',
  intro: 'TURN IT UP',
  display: { type: 'lcd', ink: '#fff6fb', ink2: '#ff6ad5', bg: lcdBg },
  msgStyle: 'zoom',
  music: { url: '../sounds/pinball/neon.mp3', samples: 714419, rate: 32000 },
  speech: { pitch: 0.9, rate: 1.02, voice: 'Daniel|Alex|Male|Google UK English Male' },
  rulesHtml:
    '<p>A city at midnight, lit in pink and cyan. The DJ on the radio talks you through it.</p><ul>' +
    '<li><b>The Skyline Wheel:</b> shoot the lane up the left-centre into the lit ferris wheel. It carries the ball to the top and tips it onto the chrome wire down to your left flipper. Three rides light <b>Skyline</b> (start it with the next ride): every ride and loop is big points for 45 seconds.</li>' +
    '<li><b>The Super-Loop:</b> the pink ramp on the right climbs into a full loop-the-loop and lands on the <b>Rooftop</b>. A soft shot rolls back out: hit it hard. On the rooftop the ball drops into the <b>moving launcher</b>: slide it with the flippers, then fire (FIRE button or Space) at the V-I-P targets. Knock all three down for the Rooftop jackpot; the first time lights <b>extra ball</b>. The ball rides a wireform back to your left flipper.</li>' +
    '<li><b>The Orb:</b> hit N-E-O (the three targets on the left) to light the lock. The chrome orb then catches the ball dead centre and beams it away. Three balls start <b>Orb Multiball</b>: the loop, the wheel and the orbits are jackpots, then the Orb itself is the super jackpot. When the lock is not lit, a lit Orb gives a mystery award instead.</li>' +
    '<li><b>Club nights:</b> the Backstage scoop (right of the Orb) starts a track: Neon Rain (hit the pops), Midnight Run (orbits and the spinner), Laser Show (the lit targets), Bass Drop (the wheel and the loop). Play two tracks to light extra ball at the scoop.</li>' +
    '<li><b>Wind:</b> the DRIVE spinner on the left charges the wind: 45 spins light it at the scoop. The fan blows across the dance floor and the two discs under it spin for 30 seconds: everything scores double while the ball drifts.</li>' +
    '<li><b>Second Wind:</b> a kickback on the left outlane, re-armed by the Rooftop and by Orb catches.</li>' +
    '<li><b>Midnight Drive:</b> play Wind, Skyline, Orb Multiball and two tracks, then shoot the scoop: four balls, 60 seconds, every shot a jackpot and the Orb the super.</li></ul>',
  theme: {
    playfield: '#07050e', cabinet: '#0d0a16', wood: '#1a1424', rails: 'chrome', rubber: '#161418', postColor: '#e62e8c', postRubber: '#1a1a1e',
    flipper: '#17121f', flipperRubber: '#2ee6ff', flipperStripe: '#ff3fa4', popBody: '#15101d', apron: '#0c0914', slingPlastic: '#160d22',
    gi: ['#ff5ab8', '#3fe0ff', '#ff5ab8', '#3fe0ff', '#b57bff'], giPos: [[34, 250, 150], [440, 250, 150], [40, 640, 160], [440, 700, 160], [243, 950, 120, 0.8]], giLevel: 1.0,
    env: ['#ff5ab8', '#3fe0ff', '#9b5cff'], sky: '#6050b0', keyColor: '#e0e8ff', key: 1.0, ambient: 0.3, exposure: 1.05, bloom: 0.72, bloomThreshold: 0.95,
    spark: '#ff9ad6', room: '#05040a', darkLight: '#ffd0f0', lampGain: 3.6, button: '#ff3fa4', knob: '#ff3fa4'
  },
  art: {
    playfield: paintPlayfield, backglass: paintBackglass, apron: paintApron, sides: paintSides, backboard: paintBackboard,
    sling(g, w, h, side) {
      const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#1c0f2e'); gr.addColorStop(1, '#0b0714'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.strokeStyle = 'rgba(46,230,255,.5)'; g.lineWidth = 3; for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(side === 'L' ? 0 : w, h * 0.2 + i * 26); g.lineTo(side === 'L' ? w : 0, h * 0.55 + i * 26); g.stroke(); }
      g.shadowColor = C.pink; g.shadowBlur = 18; g.fillStyle = '#ffd1ec'; g.font = '400 34px Bungee, Impact'; g.textAlign = 'center'; g.fillText(side === 'L' ? 'NEON' : 'NITE', w / 2, h * 0.62);
    }
  },
  fit: { top: 120, lookY: 0.47 },
  anims: lcdAnims(),
  build,
  rules: makeRules()
};

// ── LCD: a synthwave backdrop behind every message, in colour ──────────────
function lcdBg(g, W, H, t, G) {
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#120a2a'); gr.addColorStop(0.55, '#2a0f3a'); gr.addColorStop(1, '#070410'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  // the sun, striped
  const sx = W / 2, sy = H * 0.56, sr = 15;
  const sg = g.createLinearGradient(0, sy - sr, 0, sy + sr); sg.addColorStop(0, '#ffd166'); sg.addColorStop(0.55, '#ff6a3d'); sg.addColorStop(1, '#ff2d95');
  g.save(); g.beginPath(); g.arc(sx, sy, sr, 0, TAU); g.clip(); g.fillStyle = sg; g.fillRect(sx - sr, sy - sr, sr * 2, sr * 2);
  g.fillStyle = 'rgba(20,8,40,.9)'; for (let i = 0; i < 5; i++) { const y = sy + 1 + i * 3.2 + (t * 3 % 3.2); g.fillRect(sx - sr, y, sr * 2, 0.9 + i * 0.25); } g.restore();
  // grid floor rushing toward the viewer
  g.strokeStyle = 'rgba(46,230,255,.45)'; g.lineWidth = 1;
  const hz = H * 0.6; g.beginPath();
  for (let i = -8; i <= 8; i++) { g.moveTo(sx + i * 6, hz); g.lineTo(sx + i * 70, H + 8); }
  for (let k = 0; k < 6; k++) { const f = ((t * 0.9 + k / 6) % 1), y = hz + (H - hz) * f * f; g.moveTo(0, y); g.lineTo(W, y); }
  g.stroke();
  g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, 0, W, H);   // keep the text readable
}
function lcdAnims() {
  const star = (g, x, y, r) => { g.beginPath(); for (let i = 0; i < 10; i++) { const a = -PI / 2 + i * PI / 5, rr = i % 2 ? r * 0.45 : r; i ? g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : g.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); g.fill(); };
  return {
    wheel(g, t, W, H) { const x = W - 26, y = H / 2 + 2, r = 17; g.strokeStyle = C.pink; g.lineWidth = 1.5; g.beginPath(); g.arc(x, y, r, 0, TAU); g.stroke(); g.strokeStyle = C.cyan; for (let i = 0; i < 6; i++) { const a = t * 1.6 + i / 6 * TAU; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); g.stroke(); g.fillStyle = i % 2 ? C.gold : C.hot; g.fillRect(x + Math.cos(a) * r - 2, y + Math.sin(a) * r - 1, 4, 3); } },
    loop(g, t, W, H) { const x = 26, y = H / 2, r = 15; g.strokeStyle = C.hot; g.lineWidth = 2; g.beginPath(); g.arc(x, y, r, 0, TAU); g.stroke(); g.beginPath(); g.moveTo(0, H - 6); g.lineTo(x - 2, y + r); g.stroke(); const a = PI / 2 + t * 5; g.fillStyle = '#fff'; g.beginPath(); g.arc(x + Math.cos(a) * r, y + Math.sin(a) * r, 3, 0, TAU); g.fill(); },
    wind(g, t, W, H) { g.strokeStyle = 'rgba(46,230,255,.8)'; g.lineWidth = 1; for (let i = 0; i < 14; i++) { const y = (i * 37) % H, x = W - ((t * 160 + i * 53) % (W + 40)); g.beginPath(); g.moveTo(x, y); g.lineTo(x + 14 + (i % 3) * 8, y); g.stroke(); } },
    orb(g, t, W, H) { const x = W - 28, y = H / 2; for (let i = 0; i < 3; i++) { const r = 5 + ((t * 18 + i * 7) % 20); g.strokeStyle = i % 2 ? C.pink : C.cyan; g.globalAlpha = 1 - r / 26; g.beginPath(); g.ellipse(x, y, r, r * 0.55, 0, 0, TAU); g.stroke(); } g.globalAlpha = 1; const sg = g.createRadialGradient(x - 2, y - 2, 1, x, y, 7); sg.addColorStop(0, '#fff'); sg.addColorStop(1, '#8a8aa0'); g.fillStyle = sg; g.beginPath(); g.arc(x, y, 7, 0, TAU); g.fill(); },
    drive(g, t, W, H) { g.strokeStyle = C.gold; g.lineWidth = 2; for (let k = 0; k < 5; k++) { const f = (t * 1.4 + k / 5) % 1, y = H * 0.55 + (H * 0.45) * f * f; g.beginPath(); g.moveTo(W / 2 - 1, y); g.lineTo(W / 2 + 1, y + 2 + f * 6); g.stroke(); } g.strokeStyle = C.pink; g.lineWidth = 1; g.beginPath(); g.moveTo(W / 2, H * 0.55); g.lineTo(8, H); g.moveTo(W / 2, H * 0.55); g.lineTo(W - 8, H); g.stroke(); },
    eq(g, t, W, H) { for (let i = 0; i < 24; i++) { const h = 4 + Math.abs(Math.sin(t * 7 + i * 0.9) * Math.sin(t * 3.1 + i)) * (H - 10); g.fillStyle = i % 3 === 0 ? C.pink : i % 3 === 1 ? C.cyan : C.violet; g.globalAlpha = 0.55; g.fillRect(2 + i * 8, H - h, 5, h); } g.globalAlpha = 1; },
    stars(g, t, W, H) { g.fillStyle = C.gold; for (let i = 0; i < 7; i++) { const x = (i * 29 + 10 + t * 20) % W, y = 6 + (i * 13) % (H - 12), r = 2.5 + 1.5 * Math.sin(t * 6 + i); star(g, x, y, r); } },
    city(g, t, W, H) { g.fillStyle = 'rgba(0,0,0,.6)'; const r = rng(4); for (let x = 0; x < W; x += 9) { const h = 6 + r() * 16; g.fillRect(x, H - h, 8, h); } g.fillStyle = C.gold; for (let i = 0; i < 30; i++) { const x = (i * 23 + 3) % W, y = H - 3 - (i * 7) % 14; if (Math.sin(t * 3 + i) > -0.3) g.fillRect(x, y, 1, 1); } }
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// BUILD
// ═══════════════════════════════════════════════════════════════════════════
function build(T) {
  const W = T.W, L = T.L;
  defineSounds();
  T.shooter({ min: 700, max: 3900 });
  T.lower({ flipColor: '#17121f', flipRubber: C.cyan, bxColor: C.gold, saveColor: C.pink, extraColor: C.sun, bxY: 302, inColor: C.cyan, outColor: C.pink });

  // ── Left: THE STRIP orbit lane with the DRIVE spinner, Second Wind kickback ──
  // the lane's bottom curve ends steeply so nothing can balance on its tip
  T.wall([[2, 612], [6, 588], [16, 570], [30, 558], [44, 548], [54, 534]], { style: 'wood', r: 4, h: 34, color: '#1c1428' });
  T.post(54, 534, { style: 'rubber', r: 5 });
  T.wall([[64, 610], [64, 830]], { style: 'metal', h: 26 });
  T.post(64, 607, { style: 'rubber', r: 5 });
  T.spinner({ id: 'spinner', x: 33, y: 700, w: 46, angle: 90, label: 'DRIVE', color: '#f2f2f8', art: spinArt });
  T.orbit({ id: 'orbitL', a: [8, 660, 60, 660], dirA: [0, 1], b: [430, 660, 478, 660], dirB: [0, -1] });
  T.orbit({ id: 'orbitR', a: [430, 660, 478, 660], dirA: [0, 1], b: [8, 660, 60, 660], dirB: [0, -1] });
  T.kickback({ id: 'kickback', x: 23, y: 205, power: 2400, label: 'SECOND WIND', color: C.cyan });

  // ── N-E-O targets on a diagonal wall left of the wheel lane ──
  T.wall([[64, 610], [72, 690], [104, 756], [108, 770]], { style: 'wood', r: 4, h: 34, color: '#1c1428' });
  [['N', 73, 652], ['E', 83, 690], ['O', 95, 724]].forEach(([ch, x, y], i) => T.standupTarget({ id: 'neo' + i, x, y, angle: 345, w: 20, label: ch, color: i === 1 ? C.cyan : C.pink }));
  [0, 1, 2].forEach(i => T.insert('neol' + i, 102 + i * 10, 640 + i * 36, { shape: 'circle', r: 6, color: i === 1 ? C.cyan : C.pink, text: 'NEO'[i], size: 7 }));

  // ── The wheel house (upper-left block) and the SKYLINE WHEEL ──
  const houseArc = T.arcPts(HOUSE_ARC[0], HOUSE_ARC[1], HOUSE_ARC[2], 156, 103, 10);
  T.wall([[64, 830], [66, 888]].concat(houseArc).concat([[204, 1008], [204, 830], [160, 830]]), { style: 'wood', r: 4, h: 40, color: '#160f22' });
  T.wall([[108, 830], [64, 830]], { style: 'wood', r: 4, h: 40, color: '#160f22' });
  // the lane into the wheel
  T.wall([[108, 770], [108, 896]], { style: 'metal', h: 24 }); T.wall([[160, 770], [160, 896]], { style: 'metal', h: 24 });
  T.post(108, 768, { style: 'rubber', r: 5 }); T.post(160, 768, { style: 'rubber', r: 5 });
  T.wall([[100, 930], [168, 930]], { style: 'invisible', mat: 'rubber', r: 3 });
  T.wall([[108, 896], [100, 930]], { style: 'invisible', mat: 'metal', r: 2 }); T.wall([[160, 896], [168, 930]], { style: 'invisible', mat: 'metal', r: 2 });
  T.comp(new SkylineWheel(T, { id: 'wheel', x: WHEEL.x, y: WHEEL.y, r: WHEEL.r, buckets: 6, speed: 1.15, idle: 0.35,
    exitPath: [[WHEEL.x, WHEEL.y, 100], [100, 912, 100], [66, 910, 94], [38, 890, 84], [26, 840, 74], [24, 760, 64], [28, 640, 52], [36, 520, 40], [48, 420, 26], [58, 366, 12], [62, 348, 7]] }));
  for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; T.bulb('wb' + i, WHEEL.x + Math.cos(a) * (WHEEL.r + 5), WHEEL.y - 10, WHEEL.r + 18 + Math.sin(a) * (WHEEL.r + 5), { color: i % 2 ? C.gold : C.hot, r: 2.2, k: 5 }); }

  // ── Right: orbit lane, SUPER-LOOP ramp up into the corkscrew and onto the Rooftop ──
  T.wall([[478, 612], [474, 588], [464, 572], [450, 558], [436, 548], [426, 534]], { style: 'wood', r: 4, h: 34, color: '#1c1428' });
  T.wall([[426, 620], [426, 764]], { style: 'metal', h: 26 });
  T.post(426, 617, { style: 'rubber', r: 5 }); T.post(426, 534, { style: 'rubber', r: 5 });
  T.wall([[444, 490], [478, 518]], { style: 'metal', h: 24 });
  T.post(366, 656, { style: 'rubber', r: 5 }); T.post(418, 644, { style: 'rubber', r: 5 });
  T.wall([[418, 644], [426, 619]], { style: 'metal', h: 24 });
  const loopPts = [[392, 650, 0], [394, 690, 4], [397, 735, 18], [398, 800, 32]];
  for (let k = 1; k <= 8; k++) { const a = k / 8 * TAU; loopPts.push([398 + 44 * k / 8, 800 + 36 * Math.sin(a), 68 - 36 * Math.cos(a)]); }
  loopPts.push([444, 842, 42], [442, 882, 50], [426, 920, 56], [410, 946, 57], [398, 952, 57]);
  T.ramp({ id: 'loop', style: 'plastic', w: 40, color: '#ff4fb0', opacity: 0.3, edge: '#ff9ad6', wallH: 22, exitLvl: 'roof', entryMin: 160, minExit: 260, supports: false, pts: loopPts });

  // ── The ROOFTOP: raised deck with the moving launcher and the V-I-P bank ──
  T.miniField({ id: 'roof', z: ROOF.z, box: ROOF.box, floor: '#0b0816', paint: paintRoof, legs: [[228, 928], [392, 928], [228, 1002], [392, 1002]],
    walls: [[[220, 920], [220, 1010], [400, 1010], [400, 966]], [[400, 936], [400, 920]]], wallStyle: 'wood', wallColor: '#1a1030', wallH: 22 });
  T.wall([[400, 936], [400, 966]], { style: 'invisible', mat: 'metal', lvl: 'roof', one: [-1, 0] });
  const launcher = T.movingLauncher({ id: 'launcher', x0: 250, x1: 370, y: 928, power: 1700, lvl: 'roof' });
  launcher.mesh = function (RC) { launcherMesh(RC, this); };
  T.dropTargetBank({ id: 'vip', x: 310, y: 998, angle: 270, n: 3, w: 28, gap: 6, lvl: 'roof', labels: ['V', 'I', 'P'], color: '#f6f0ff', ink: '#2a0a3a', resetDelay: 2.2 });
  // the way down: a long chrome wireform over the loop ramp and down the right side to the right inlane
  T.vuk({ id: 'roofExit', x: 394, y: 926, lvl: 'roof', hole: false, power: 1000, hold: 0.25, style: 'wire', wireMat: 'chrome', exitLvl: 'main', supports: false,
    path: [[394, 926, 56], [412, 914, 74], [436, 896, 86], [460, 872, 86], [478, 830, 74], [478, 740, 58], [476, 640, 46], [470, 540, 38], [460, 440, 26], [446, 378, 14], [430, 352, 8], [424, 346, 7]] });

  // ── Centre: THE ORB (ring-catch under a hanging chrome orb) and its lock ──
  T.post(243, 700, { style: 'metal', r: 6, h: 48 });
  T.ringCatch({ id: 'orb', x: ORB[0], y: ORB[1], r: 38, strength: 7600, hold: 2.2, active: false, toy: orbModel, animate: orbAnimate, releaseAngle: 232, releaseSpeed: 650 });
  T.ballLock({ id: 'orbLock', slots: [[243, 640, -40], [243, 660, -40], [243, 680, -40]], hidden: true, exit: { x: ORB[0], y: ORB[1] - 2, vx: 0, vy: -520 } });
  T.insert('orbL', ORB[0], ORB[1], { shape: 'ring', r: 21, ring: 4, color: C.violet });
  [0, 1, 2].forEach(i => T.insert('lock' + i, 219 + i * 24, 548, { shape: 'diamond', w: 13, h: 13, color: C.pink }));
  T.art(P => P.text('LOCK', 243, 534, { size: 6, color: '#f3e6f8', font: '"Arial Narrow", Arial, sans-serif', weight: '700', spacing: 2 }), 'over');

  // ── BACKSTAGE scoop (modes), the pops (BEAT), the hologram DJ ──
  T.scoop({ id: 'backstage', x: SCOOP[0], y: SCOOP[1], r: 12, eject: { angle: 236, speed: 1450 }, hold: 1.0 });
  POPS.forEach(([x, y], i) => T.popBumper({ id: 'pop' + (i + 1), x, y, r: 23, color: [C.pink, C.cyan, C.violet][i], skirt: ['#ff7ac8', '#7df0ff', '#c49bff'][i], body: '#15101d', capArt: (g, w, h) => beatCap(g, w, h, i), kick: 1250 }));
  T.hologram({ id: 'dj', size: [78, 96], hit: 26, draw: drawDJ, visible: false, path: t => [310, 968, ROOF.z + 1 + Math.sin(t * 2) * 2] });

  // ── The dance floor: two counter-rotating discs, and the WIND fan ──
  DISCS.forEach(([x, y, s], i) => T.spinningDisc({ id: 'disc' + i, x, y, r: 40, speed: 9 * s, grip: 4, on: false, color: '#15121c', art: (g, w, h) => discArt(g, w, h, i) }));
  const fan = T.fan({ id: 'fan', x: FAN[0], y: FAN[1], r: 330, dir: 180, strength: 1000, on: false, color: '#dfe4ee' });
  fan.mesh = function (RC) { fanMesh(RC, this); };

  // ── Inserts (shot arrows and mode lamps) ──
  const ins = (id, x, y, o) => T.insert(id, x, y, o);
  ins('arrOrbL', 36, 760, { shape: 'arrow', w: 16, h: 28, color: C.cyan, label: 'THE STRIP', ly: -22, labelSize: 5.5 });
  ins('arrOrbR', 452, 592, { shape: 'arrow', w: 16, h: 26, color: C.cyan, label: 'THE STRIP', ly: -21, labelSize: 5.5 });
  ins('arrWheel', 134, 736, { shape: 'arrow', w: 18, h: 30, color: C.gold, label: 'SKYLINE WHEEL', ly: -24, labelSize: 5.5 });
  [0, 1, 2].forEach(i => ins('ride' + i, 120 + i * 14, 700, { shape: 'circle', r: 5, color: C.gold }));
  ins('arrLoop', 392, 606, { shape: 'arrow', w: 18, h: 30, rot: 4, color: C.pink, label: 'SUPER LOOP', ly: -24, labelSize: 5.5 });
  ins('scoopL', 330, 648, { shape: 'oval', w: 32, h: 16, color: C.violet, text: 'BACKSTAGE', size: 4.8 });
  [0, 1, 2, 3].forEach(i => { const a = deg(226 + i * 29), r = 44; ins('track' + i, SCOOP[0] + Math.cos(a) * r, SCOOP[1] + Math.sin(a) * r, { shape: 'circle', r: 6, color: [C.cyan, C.gold, C.pink, C.violet][i], text: String(i + 1), size: 6 }); });
  ins('windL', 243, 392, { shape: 'oval', w: 30, h: 15, color: C.cyan, text: 'WIND', size: 6 });
  ins('skyL', 134, 790, { shape: 'oval', w: 30, h: 14, color: C.gold, text: 'SKYLINE', size: 5.2 });
  ins('wizL', 243, 486, { shape: 'star', w: 26, h: 26, color: C.gold, label: 'MIDNIGHT DRIVE', ly: -19, labelSize: 5.2 });
  ins('mbL', 196, 548, { shape: 'oval', w: 26, h: 13, color: C.hot, text: 'ORB', size: 6 });
  ins('ebL', 290, 548, { shape: 'oval', w: 26, h: 13, color: C.sun, text: 'EXTRA', size: 5.5 });
  T.flasher('flWheel', 90, 820, { color: C.hot, r: 10, z0: 40 });
  T.flasher('flRoof', 452, 985, { color: C.cyan, r: 10, z0: 40 });
  T.flasher('flOrb', 300, 760, { color: C.violet, r: 9, z0: 0 });
  // GI bulbs along the sides and under the rooftop (neon underglow)
  [[14, 360], [14, 520], [470, 360], [470, 520], [20, 820], [500, 980], [500, 760]].forEach((p, i) => T.bulb('gi' + i, p[0], p[1], 12, { color: i % 2 ? C.cyan : C.pink, r: 3, k: 3, on: 1 }));
  [[240, 940], [310, 940], [380, 940], [240, 1000], [380, 1000]].forEach((p, i) => T.bulb('ug' + i, p[0], p[1], ROOF.z - 14, { color: C.violet, r: 2.5, k: 4, on: 1 }));

  // ── Scenery and neon ──
  T.model(RC => neonModel(RC));
  T.model(RC => skylineModel(RC));
  T.model(RC => wireLegs(RC));
  T.model(RC => windStreaks(RC));
}

// ── Custom sounds (metal, coils, pads; nothing MIDI) ──────────────────────
function defineSounds() {
  const A = audio();
  A.define('neonBuzz', 0.7, S => { S.osc('sawtooth', 118, 0, 0.65, 0.035, { lp: 420, att: 0.03 }); S.noise(0, 0.6, 0.02, { bp: 2600, q: 9, att: 0.05 }); });
  A.define('riser', 1.8, S => { S.noise(0, 1.7, 0.12, { bp: 300, bpTo: 3200, q: 2, att: 0.5 }); S.pad(110, 0, 1.7, 0.07, { att: 0.4, lp: 1400 }); S.pad(164.8, 0.5, 1.2, 0.05, { att: 0.3, lp: 1800 }); });
  A.define('beam', 1.4, S => { S.pad(220, 0, 1.2, 0.08, { att: 0.05, lp: 2400 }); S.osc('sine', 440, 0, 1.0, 0.06, { to: 1760, att: 0.02 }); [880, 1108.7, 1318.5].forEach((f, i) => S.bell(f, 0.3 + i * 0.1, 0.8, 0.06)); });
  A.define('bassDrop', 1.3, S => { S.osc('sine', 70, 0, 1.1, 0.5, { to: 28 }); S.noise(0, 0.25, 0.3, { lp: 300 }); S.osc('sine', 140, 0, 0.3, 0.15, { to: 56 }); });
  A.define('scratch', 0.45, S => { S.noise(0, 0.18, 0.2, { bp: 1500, bpTo: 500, q: 4 }); S.noise(0.2, 0.2, 0.18, { bp: 600, bpTo: 1800, q: 4 }); });
  A.define('wheelTick', 0.12, S => { S.noise(0, 0.006, 0.3, { hp: 4000 }); S.ring(2400, 0, 0.09, 0.05, [1, 2.9, 4.4]); S.osc('sine', 95, 0, 0.05, 0.12, { to: 60 }); });
  A.define('stinger', 1.4, S => { [261.6, 329.6, 392, 493.9].forEach((f, i) => S.pad(f, i * 0.05, 1.1, 0.07, { att: 0.03, lp: 2200 })); S.bell(1046.5, 0.25, 1.0, 0.07); S.bell(1568, 0.4, 0.9, 0.05); });
}

// ═══════════════════════════════════════════════════════════════════════════
// SKYLINE WHEEL: a lit ferris wheel facing the player. The ball rolls into
// the gondola at the bottom, rides to the top and is tipped onto a wireform.
// Gondolas hang from the rim and stay upright (instanced: two draw calls).
// ═══════════════════════════════════════════════════════════════════════════
class SkylineWheel extends Comp {
  constructor(T, o) {
    super(T, o);
    this.r = o.r || 44; this.n = o.buckets || 6; this.a = 0; this.w = o.speed || 1.1; this.idle = o.idle || 0.3; this.carry = []; this.zc = this.r + 18;
    this.sens = T.world.sensor({ kind: 'circle', x: o.x, y: o.y - 2, r: 13, lvl: this.lvl, owner: this, id: this.id });
    this.pts = spline(o.exitPath, 6);
    this.path = T.world.path({ pts: this.pts, style: 'wire', fric: 60, exitLvl: 'main', lvl: 'main' });
    this.path.owner = this; this.tick = 0; this.lastK = -1; this.motor = 0;
    T.ao({ kind: 'dot', x: o.x, y: o.y, r: 30, a: 0.5, blur: 10 });
  }
  ang(k) { return this.a + k / this.n * TAU; }
  onSensor(b) {
    if (b.noCap[this.id] > this.world.time || b.mode !== 'free') return;
    let best = 0, bd = 9;
    for (let k = 0; k < this.n; k++) { let d = ((this.ang(k) + PI / 2) % TAU + TAU) % TAU; d = Math.min(d, TAU - d); if (d < bd) { bd = d; best = k; } }
    this.world.hold(b, this, { k: best }); this.carry.push(b);
    this.sfx('clank', { vol: 0.7 }); this.sfx('motorRun', { vol: 0.5 }); this.G.haptic('medium');
    this.emit('wheelIn', b);
  }
  stepHeld(b, dt, h) {
    const a = this.ang(h.k);
    b.x = this.o.x + Math.cos(a) * this.r; b.y = this.o.y; b.z = this.zc + Math.sin(a) * this.r - 18; b.vx = b.vy = 0;
    const top = ((a % TAU) + TAU) % TAU;
    if (h.t > 0.8 && Math.abs(top - PI / 2) < 0.1) this.dump(b);
  }
  dump(b) {
    this.carry.splice(this.carry.indexOf(b), 1);
    this.world.enterPath(b, this.path, 260); b.noCap[this.id] = this.world.time + 2;
    this.sfx('wireEnd', { vol: 0.7 }); this.G.shake(0.2); this.emit('wheelOut', b);
  }
  step(dt) {
    const want = this.carry.length ? this.w : this.idle; this.motor += (want - this.motor) * Math.min(1, dt * 2.5);
    this.a += this.motor * dt;
    const k = Math.floor(this.a / (TAU / this.n)); if (k !== this.lastK) { this.lastK = k; if (this.G.state === 'play' && this.carry.length) this.sfx('wheelTick', { vol: 0.35 }); }
  }
  onTilt() { for (const b of this.carry.slice()) { this.carry.splice(0, 1); this.world.release(b, this.o.x, this.o.y - 20, 0, -200, 'main'); } }
  trigger() { const b = this.world.addBall(this.o.x, this.o.y - 2, {}); this.onSensor(b); }
  update() { this.carry = this.carry.filter(b => !b.removed); }
  mesh(RC) {
    const { x, y } = this.o, r = this.r, zc = this.zc, B = RC.batch, chrome = RC.mats.chrome(), steel = RC.mats.steel();
    drawPath(RC, this.pts, 'wire', { wireMat: 'chrome', supports: false, lvl: 'main' });
    const g = new THREE.Group(); g.position.set(x, y, zc); RC.root.add(g);
    // two rims with spokes and cross braces (one chrome mesh)
    const parts = [];
    for (const dy of [-7, 7]) {
      const rim = new THREE.TorusGeometry(r, 2.2, 8, 48); rim.rotateX(PI / 2); rim.translate(0, dy, 0); parts.push(rim);
      for (let i = 0; i < this.n * 2; i++) { const a = i / (this.n * 2) * TAU; parts.push(tubeGeo([[0, dy, 0], [Math.cos(a) * r, dy, Math.sin(a) * r]], 1.1, 2, 6)); }
    }
    for (let i = 0; i < this.n * 2; i++) { const a = i / (this.n * 2) * TAU; parts.push(tubeGeo([[Math.cos(a) * r, -7, Math.sin(a) * r], [Math.cos(a) * r, 7, Math.sin(a) * r]], 1, 2, 6)); }
    const hub = new THREE.CylinderGeometry(6, 6, 20, 16); parts.push(hub);
    const wheel = new THREE.Mesh(mergeGeos(parts), chrome); wheel.castShadow = true; g.add(wheel); this.wheel = wheel;
    // neon rings on both faces (emissive, blooms)
    const neon = [];
    for (const dy of [-9.5, 9.5]) { const t = new THREE.TorusGeometry(r + 3.5, 1.1, 6, 56); t.rotateX(PI / 2); t.translate(0, dy, 0); neon.push(t); }
    this.neonMat = new THREE.MeshStandardMaterial({ color: '#2a0818', emissive: C.pink, emissiveIntensity: 2.2, roughness: 0.4 });
    const nm = new THREE.Mesh(mergeGeos(neon), this.neonMat); wheel.add(nm);
    // gondolas: upright cabins hanging from the rim (instanced)
    const cab = new THREE.Group();
    const body = new THREE.BoxGeometry(28, 22, 16); body.translate(0, 0, -20);
    const roof = new THREE.BoxGeometry(30, 24, 2); roof.translate(0, 0, -4);
    const bar = new THREE.CylinderGeometry(1.2, 1.2, 14, 6); bar.rotateX(PI / 2); bar.rotateX(0); bar.translate(0, 0, -5);
    const post1 = new THREE.CylinderGeometry(0.9, 0.9, 16, 6); post1.rotateX(PI / 2);
    const posts = [[-14, -10], [14, -10], [-14, 10], [14, 10]].map(p => { const q = post1.clone(); q.translate(p[0], p[1], -12); return q; });
    const cabGeo = mergeGeos([body, roof, bar].concat(posts));
    this.cabs = new THREE.InstancedMesh(cabGeo, RC.mats.plastic('#1a1326', { roughness: 0.3, clearcoat: 1 }), this.n); this.cabs.castShadow = true; g.add(this.cabs);
    const strip = new THREE.BoxGeometry(24, 23.5, 3); strip.translate(0, 0, -14);
    this.stripMat = new THREE.MeshStandardMaterial({ color: '#083038', emissive: C.cyan, emissiveIntensity: 1.6, roughness: 0.4 });
    this.strips = new THREE.InstancedMesh(strip, this.stripMat, this.n); g.add(this.strips);
    // A-frame legs and a chrome base plate (static)
    for (const dy of [-16, 16]) for (const dx of [-1, 1]) B.add(steel, tubeGeo([[x + dx * 4, y + dy * 0.6, zc], [x + dx * 30, y + dy, 0]], 2.6, 2, 8));
    B.add(steel, boxGeo(x, y, 1, 90, 40, 2));
    B.add(RC.mats.plastic('#0a0812'), boxGeo(x, y, 0.3, 36, 30, 0.6));
    this.mm = new THREE.Matrix4(); this.q = new THREE.Quaternion(); this.p = new THREE.Vector3(); this.s = new THREE.Vector3(1, 1, 1);
  }
  render(dt) {
    if (!this.wheel) return;
    this.wheel.rotation.y = -this.a;
    for (let k = 0; k < this.n; k++) {
      const a = this.ang(k); this.p.set(Math.cos(a) * this.r, 0, Math.sin(a) * this.r);
      this.mm.compose(this.p, this.q, this.s); this.cabs.setMatrixAt(k, this.mm); this.strips.setMatrixAt(k, this.mm);
    }
    this.cabs.instanceMatrix.needsUpdate = true; this.strips.instanceMatrix.needsUpdate = true;
    const B = this.G.b, hot = B && (B.sky || B.wiz), t = this.G.time;
    this.neonMat.emissiveIntensity = (hot ? 3.2 : 2.0) * (0.92 + 0.08 * Math.sin(t * 9)) * (1 - this.G.dark * 0.5);
    this.stripMat.emissiveIntensity = (this.carry.length ? 2.4 : 1.3) * (1 - this.G.dark * 0.5);
  }
}
function mergeGeos(list) {
  const out = []; let n = 0;
  for (const g0 of list) { const g = g0.index ? g0.toNonIndexed() : g0; out.push(g); n += g.attributes.position.count; }
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2); let o = 0;
  for (const g of out) { pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); if (g.attributes.uv) uv.set(g.attributes.uv.array, o * 2); o += g.attributes.position.count; }
  const m = new THREE.BufferGeometry(); m.setAttribute('position', new THREE.BufferAttribute(pos, 3)); m.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); m.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); return m;
}

// ═══════════════════════════════════════════════════════════════════════════
// RULES
// ═══════════════════════════════════════════════════════════════════════════
const TRACKS = [
  { id: 'rain', name: 'NEON RAIN', sub: 'HIT THE BEAT BUMPERS', color: C.cyan, anim: 'eq' },
  { id: 'run', name: 'MIDNIGHT RUN', sub: 'ORBITS AND THE SPINNER', color: C.gold, anim: 'drive' },
  { id: 'laser', name: 'LASER SHOW', sub: 'HIT THE LIT TARGETS', color: C.pink, anim: 'stars' },
  { id: 'bass', name: 'BASS DROP', sub: 'THE WHEEL AND THE LOOP', color: C.violet, anim: 'wheel' }
];
function makeRules() {
  const LINES = {
    start: ["You're listening to Neon Nights.", 'Good evening, city. Turn it up.', 'The request line is open.'],
    wheel: ['Going up.', 'Enjoy the view.', 'Skyline.'],
    loop: ['Loop the loop!', 'All the way round!', 'Smooth.'],
    roof: ['Welcome to the rooftop.', 'Slide it, then fire.'],
    orb: ['The Orb has you.', 'Dead centre.', 'Beamed.'],
    lock: ['One in the Orb.', 'Locked. Keep them coming.'],
    mb: ['Orb multiball! Drop the bass!', 'Three balls, one dance floor.'],
    wind: ['Wind machine on.', 'Hold onto something.'],
    track: ['Next track.', 'This one goes out to the player on the flippers.', 'Here we go.'],
    drain: ['Still with us?', 'We will be right back after this.', 'Ouch. Stay tuned.'],
    jackpot: ['Jackpot.', 'Big one.'],
    wiz: ['Midnight. Drive.'],
    extra: ['One more for the road.'],
    sky: ['Skyline is lit.', 'Up to the skyline.']
  };
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const R = {
    modes: {
      wind: G => R.startWind(G), skyline: G => R.startSky(G), orbmb: G => R.startOrbMB(G), wizard: G => R.startWizard(G),
      track: G => R.startTrack(G, G.b.nextTrack), roof: G => { const b = G.liveBalls()[0]; if (b) G.world.place(b, 380, 960, 'roof', -300, -100); },
      lock: G => { G.b.lockLit = true; G.comp('orb').active = true; }
    },
    init(G) {
      G.b = { neo: [0, 0, 0], lockLit: false, locks: 0, orbLit: false, spins: 0, windLit: false, wind: false, rides: 0, skyLit: false, sky: false, loops: 0, roofVisits: 0, vipDone: 0,
        tracks: [0, 0, 0, 0], track: -1, nextTrack: 0, trackHits: 0, trackLit: true, laser: [0, 0, 0], mb: false, jpLit: {}, superLit: false, jp: 0, wiz: false, wizLit: false, wizDone: false, roofFired: -9,
        skillAt: 0, saidT: -9, buzzT: 6, djT: 0, playedWind: 0, playedSky: 0, playedMB: 0, beat: 0 };
      G.say(pick(LINES.start));
    },
    say(G, k, force) { if (G.time - G.b.saidT < 3.5 && !force) return; if (G.say(pick(LINES[k]), { force })) G.b.saidT = G.time; },
    ballStart(G) { const B = G.b; B.skillAt = (B.skillAt + 1) % 3; G.comp('kickback').arm(); B.roofFired = -9; },
    ballEnd(G) {
      const B = G.b; B.mb = false; B.wind = false; B.sky = false; B.wiz = false; B.jpLit = {}; B.superLit = false; B.track = -1;
      G.comp('fan').stop(); G.comps.disc0.on = G.comps.disc1.on = false; G.comp('dj').hide();
      G.comp('orb').active = B.lockLit || B.orbLit;
      if (!G.tilted) R.say(G, 'drain');
    },
    skill(G, type, id) {
      const want = ['wheelIn', 'ramp', 'ringCatch'][G.b.skillAt];
      if (type === want && (type !== 'ramp' || id === 'loop')) return true;
      if (type === 'wheelIn' || type === 'ramp' || type === 'ringCatch' || type === 'orbit' || type === 'scoop') return false;
    },
    spinValue(G) { return G.b.wind ? 500 : 200; },
    event(G, type, id, b, d) {
      const B = G.b;
      switch (type) {
        case 'pop': B.beat++; if (B.wiz) G.add(4000); if (B.track === 0) R.trackHit(G, 6000); break;
        case 'spinStart': if (B.track === 1) R.trackHit(G, 4000); break;
        case 'spin':
          B.spins++;
          if (!B.windLit && !B.wind && B.spins % 45 === 0) { B.windLit = true; G.msg('WIND IS LIT', 'AT THE BACKSTAGE SCOOP', { anim: 'wind' }); G.sfx('riser', { vol: 0.5 }); }
          else if (B.spins % 45 === 0) G.add(10000);
          break;
        case 'target':
          if (/^neo\d$/.test(id)) {
            const i = +id[3];
            if (B.track === 2 && B.laser[i]) { B.laser[i] = 0; R.trackHit(G, 15000); if (!B.laser.some(Boolean)) B.laser = [1, 1, 1]; }
            if (!B.neo[i]) { B.neo[i] = 1; G.pulse('neol' + i, 0.3); }
            if (B.neo.every(Boolean)) {
              B.neo = [0, 0, 0]; G.cnt('neo'); G.add(20000);
              if (!B.lockLit && !B.mb && B.locks < 3) { B.lockLit = true; G.comp('orb').active = true; G.msg('N-E-O', 'THE ORB IS LIT: LOCK', { anim: 'orb' }); G.sfx('neonBuzz', { vol: 0.8 }); }
              else { B.orbLit = true; G.comp('orb').active = true; G.msg('N-E-O', 'ORB MYSTERY IS LIT', { anim: 'orb' }); }
            }
          }
          break;
        case 'drop': if (id === 'vip') G.pulse('flRoof', 0.2); break;
        case 'bank':
          if (id === 'vip') {
            B.vipDone++; G.cnt('vip'); G.comp('kickback').arm();
            if (B.vipDone === 1) { G.lightExtra(); G.jackpot(50000, 'ROOFTOP JACKPOT', { color: C.cyan }); }
            else G.jackpot(B.wiz ? 150000 : 75000, 'ROOFTOP JACKPOT', { color: C.cyan });
            G.pulse('flRoof', 0.6);
          }
          break;
        case 'wheelIn':
          B.rides++; G.cnt('ride'); G.combo('wheel'); G.pulse('flWheel', 0.5);
          if (B.track === 3) R.trackHit(G, 20000);
          if (!R.jp(G, 'wheel')) {
            if (B.skyLit && !B.sky && !G.mb) { B.skyLit = false; R.startSky(G); }
            else if (B.sky) { G.jackpot(60000, 'SKYLINE RIDE', { color: C.gold, sound: 'stinger' }); }
            else { const p = G.add(15000 * Math.min(3, B.rides)); G.msg('SKYLINE WHEEL', fmt(p), { anim: 'wheel' }); if (!B.skyLit && B.rides % 3 === 0 && B.rides > 0) { B.skyLit = true; G.msg('SKYLINE IS LIT', 'RIDE AGAIN TO START', { anim: 'wheel' }); R.say(G, 'sky'); } }
          }
          R.say(G, 'wheel');
          break;
        case 'wheelOut': G.sfx('neonBuzz', { vol: 0.3 }); break;
        case 'rampEnter': if (id === 'loop') { G.cnt('loopIn'); G.sfx('whoosh', { vol: 0.35, rate: 1.4 }); } break;
        case 'rampFail': if (id === 'loop') { G.cnt('loopFail'); G.msg('NOT ENOUGH SPEED', 'HIT THE LOOP HARDER', { dur: 1.1 }); } break;
        case 'ramp':
          if (id === 'loop') {
            B.loops++; G.cnt('loop'); G.combo('loop'); G.haptic('success');
            if (B.track === 3) R.trackHit(G, 20000);
            if (!R.jp(G, 'loop')) { const p = G.add(B.sky ? 50000 : 20000); G.msg('SUPER LOOP', fmt(p), { anim: 'loop' }); }
            R.say(G, 'loop');
          }
          break;
        case 'launcherLoad': B.roofVisits++; G.cnt('roof'); G.msg('THE ROOFTOP', 'SLIDE WITH THE FLIPPERS, THEN FIRE', { anim: 'city', dur: 2.4 }); R.say(G, 'roof', true); G.pulse('flRoof', 0.3); break;
        case 'launcherFire': B.roofFired = G.time; G.sfx('kick', { vol: 0.8 }); break;
        case 'vuk': if (id === 'roofExit') G.sfx('wireEnd', { vol: 0.5 }); break;
        case 'orbit':
          G.combo(id); G.cnt('orb');
          if (B.track === 1) R.trackHit(G, 12000);
          if (!R.jp(G, id)) G.msg('THE STRIP', fmt(G.add(B.wind ? 12000 : 6000)), { anim: 'drive' });
          break;
        case 'scoop': if (id === 'backstage') R.backstage(G, b); break;
        case 'ringCatch': R.orbCatch(G, b); break;
        case 'ringCatchRelease': G.comp('orb').active = B.lockLit || B.orbLit || B.superLit; break;
        case 'lockOut': if (G.T.R) G.T.R.burst(ORB[0], ORB[1], 40, 16, 300, C.violet); break;
        case 'kickback': G.msg('SECOND WIND', '', { style: 'flash', dur: 1.1 }); G.sfx('whoosh', { vol: 0.5 }); break;
        case 'holoHit': G.cnt('dj'); G.add(5000); G.sfx('scratch', { vol: 0.6 }); G.msg('YOU BUMPED THE DJ', '', { anim: 'eq', dur: 1.2 }); break;
      }
    },
    // jackpots during Orb Multiball and the wizard mode
    jp(G, id) {
      const B = G.b; if (!(B.jpLit[id] || B.wiz)) return false;
      const v = B.wiz ? 100000 : 60000;
      if (!B.wiz) delete B.jpLit[id];
      B.jp++; G.jackpot(v, B.wiz ? 'MIDNIGHT JACKPOT' : 'JACKPOT', { color: B.wiz ? C.gold : C.hot }); R.say(G, 'jackpot');
      if (B.mb && !Object.keys(B.jpLit).length && !B.superLit) { B.superLit = true; G.comp('orb').active = true; G.msg('SUPER JACKPOT', 'AT THE ORB', { anim: 'orb' }); }
      return true;
    },
    orbCatch(G, b) {
      const B = G.b, orb = G.comp('orb'); G.cnt('orbc'); G.pulse('flOrb', 0.5); G.combo('orb');
      if (B.superLit) { B.superLit = false; G.jackpot(B.wiz ? 300000 : 200000, 'SUPER JACKPOT', { color: C.violet }); B.jpLit = { loop: 1, wheel: 1, orbitL: 1, orbitR: 1 }; orb.holdT = 1.6; orb.active = false; return; }
      if (B.lockLit && !B.mb && B.locks < 3) {
        B.lockLit = false; orb.active = false; orb.holdT = 99;
        G.msg('THE ORB HAS IT', 'BEAMING UP', { anim: 'orb', now: true }); G.sfx('beam', { vol: 0.8 }); R.say(G, 'orb', true);
        G.later(1.3, () => {
          if (b.removed || orb.held !== b) return;
          orb.held = null; orb.holdT = 0; G.comp('orbLock').lock(b); B.locks++; G.cnt('lock');
          if (G.T.R) G.T.R.burst(ORB[0], ORB[1], 30, 20, 350, C.violet);
          G.pulse('lock' + (B.locks - 1), 1.5);
          if (B.locks >= 3) G.later(0.9, () => R.startOrbMB(G));
          else { G.msg('BALL ' + B.locks + ' LOCKED', B.locks === 2 ? 'ONE MORE FOR MULTIBALL' : 'IN THE ORB', { anim: 'orb' }); R.say(G, 'lock'); }
        });
        return;
      }
      if (B.orbLit) { B.orbLit = false; orb.active = false; R.orbAward(G); orb.holdT = 1.8; return; }
      G.add(5000); orb.holdT = 0.8;
    },
    orbAward(G) {
      const opts = ['BONUS UP', 'LIGHT WIND', '50,000', 'BALL SAVE', 'SECOND WIND']; if (!G.ebLit && G.ebGot < 1) opts.push('EXTRA BALL');
      const a = opts[Math.floor(Math.random() * opts.length)];
      if (a === 'BONUS UP') G.bxUp(); else if (a === 'LIGHT WIND') G.b.windLit = true; else if (a === 'BALL SAVE') G.ballSave(12); else if (a === 'EXTRA BALL') G.lightExtra(); else if (a === 'SECOND WIND') G.comp('kickback').arm(); else G.add(50000);
      G.big('THE ORB', a, C.violet, { anim: 'orb' }); G.sfx('stinger', { vol: 0.6 });
    },
    backstage(G, b) {
      const B = G.b, sc = G.comp('backstage'); sc.holdT = 1.2; G.add(10000); G.cnt('scoop');
      if (B.wizLit && !B.wiz && !G.mb) { B.wizLit = false; sc.holdT = 3.6; R.startWizard(G); return; }
      if (G.ebLit) { G.collectExtra(); R.say(G, 'extra', true); return; }
      if (B.windLit && !B.wind && !G.mb) { B.windLit = false; sc.holdT = 2.2; R.startWind(G); return; }
      if (B.track < 0 && !G.mb && B.tracks.some(t => !t)) { sc.holdT = 2.6; R.startTrack(G, B.nextTrack); return; }
      const aw = ['BONUS UP', '25,000', 'BALL SAVE', 'SECOND WIND'][Math.floor(Math.random() * 4)];
      if (aw === 'BONUS UP') G.bxUp(); else if (aw === 'BALL SAVE') G.ballSave(10); else if (aw === 'SECOND WIND') G.comp('kickback').arm(); else G.add(25000);
      G.msg('BACKSTAGE', aw, { anim: 'city' }); G.sfx('scratch', { vol: 0.5 });
    },
    startTrack(G, i) {
      const B = G.b; let k = i; for (let n = 0; n < 4 && B.tracks[k]; n++) k = (k + 1) % 4;
      B.track = k; B.trackHits = 0; B.laser = [1, 1, 1]; G.cnt('track'); G.startMode('track', 35);
      const T = TRACKS[k]; G.big(T.name, T.sub, T.color, { anim: T.anim }); G.sfx('riser', { vol: 0.7 }); G.callout(T.name, T.color); R.say(G, 'track', true);
      G.comp('dj').show(); G.ballSave(5);
    },
    trackHit(G, v) {
      const B = G.b; B.trackHits++; const p = G.add(v); G.msg(TRACKS[B.track].name, fmt(p) + '  (' + B.trackHits + ' OF 6)', { anim: TRACKS[B.track].anim, dur: 1.1 });
      if (B.trackHits >= 6) { const k = B.track; B.tracks[k] = 1; B.nextTrack = (k + 1) % 4; G.endMode('track'); G.jackpot(75000, 'TRACK COMPLETE', { color: TRACKS[k].color, sound: 'stinger' }); const n = B.tracks.filter(Boolean).length; if (n === 2) G.lightExtra(); R.checkWiz(G); }
    },
    startWind(G) {
      const B = G.b; B.wind = true; B.playedWind++; G.cnt('wind'); G.startMode('wind', 30, { mult: 2 });
      G.comp('fan').start(); G.comps.disc0.on = G.comps.disc1.on = true;
      G.big('WIND', 'EVERYTHING SCORES 2X', C.cyan, { anim: 'wind' }); G.sfx('whoosh', { vol: 0.9, rate: 0.7 }); G.callout('WIND', C.cyan); R.say(G, 'wind', true); G.ballSave(5);
      R.checkWiz(G);
    },
    startSky(G) {
      const B = G.b; B.sky = true; B.playedSky++; G.cnt('sky'); G.startMode('skyline', 45);
      G.big('SKYLINE', 'RIDE THE WHEEL, LOOP THE LOOP', C.gold, { anim: 'wheel' }); G.sfx('stinger', { vol: 0.8 }); G.callout('SKYLINE', C.gold); G.lightShow('chase', 2); G.ballSave(5);
      R.checkWiz(G);
    },
    startOrbMB(G) {
      const B = G.b; B.mb = true; B.locks = 0; B.playedMB++; G.cnt('orbmb');
      G.comp('orbLock').release(); G.comp('orb').active = false;
      G.multiball(3, { label: 'ORB MULTIBALL', color: C.hot, save: 15 });
      B.jpLit = { loop: 1, wheel: 1, orbitL: 1, orbitR: 1 }; G.sfx('bassDrop', { vol: 0.9 }); G.comp('dj').show(); R.say(G, 'mb', true);
      R.checkWiz(G);
    },
    checkWiz(G) {
      const B = G.b; if (B.wizLit || B.wiz || B.wizDone) return;
      if (B.playedWind && B.playedSky && B.playedMB && B.tracks.filter(Boolean).length >= 2) { B.wizLit = true; G.msg('MIDNIGHT DRIVE', 'IS LIT AT BACKSTAGE', { anim: 'drive', dur: 2.5 }); G.sfx('riser', { vol: 0.8 }); }
    },
    startWizard(G) {
      const B = G.b; B.wiz = true; B.wizDone = true; G.cnt('wiz');
      G.comp('orbLock').release(); G.multiball(4, { label: 'MIDNIGHT DRIVE', color: C.gold, save: 25 });
      G.startMode('wizard', 60); G.comp('fan').start(); G.comps.disc0.on = G.comps.disc1.on = true; G.comp('dj').show(); B.superLit = true; G.comp('orb').active = true;
      G.sfx('bassDrop', { vol: 1 }); G.later(1, () => G.sfx('riser', { vol: 0.8 })); R.say(G, 'wiz', true); G.callout('MIDNIGHT DRIVE', C.gold);
    },
    modeEnd(G, name) {
      const B = G.b;
      if (name === 'wind') { B.wind = false; G.comp('fan').stop(); if (!B.wiz) G.comps.disc0.on = G.comps.disc1.on = false; G.msg('WIND', 'DIES DOWN', {}); }
      if (name === 'skyline') { B.sky = false; G.msg('SKYLINE', 'FADES', {}); }
      if (name === 'track') { if (B.track >= 0 && !B.tracks[B.track]) { G.msg(TRACKS[B.track].name, 'ENDS', {}); B.nextTrack = (B.track + 1) % 4; } B.track = -1; if (!G.mb) G.comp('dj').hide(); }
      if (name === 'wizard') { B.wiz = false; G.comp('fan').stop(); G.comps.disc0.on = G.comps.disc1.on = false; B.superLit = false; G.comp('orb').active = B.lockLit || B.orbLit; G.msg('DAWN', 'THE DRIVE IS OVER', { anim: 'city' }); if (!G.mb) G.comp('dj').hide(); }
    },
    mbEnd(G) { const B = G.b; B.mb = false; B.jpLit = {}; B.superLit = false; G.comp('orb').active = B.lockLit || B.orbLit; if (B.wiz) { B.wiz = false; G.endMode('wizard'); } if (B.track < 0) G.comp('dj').hide(); },
    levelDrain(G, lvl, b) {
      if (lvl !== 'roof') return false;
      const B = G.b, ml = G.comp('launcher');
      if (!ml.ball && G.time - B.roofFired > 3 && G.state === 'play') { ml.receive(b); return true; }
      G.comp('roofExit').receive(b, 0.25); G.sfx('scoop', { vol: 0.45, x: 226 }); return true;
    },
    update(G, dt) {
      const B = G.b, orb = G.comp('orb');
      // the DJ hologram appears for modes; a neon tube buzzes now and then
      B.buzzT -= dt; if (B.buzzT <= 0) { B.buzzT = 9 + Math.random() * 12; if (G.amb && G.state === 'play') G.sfx('neonBuzz', { vol: 0.08, x: 60 + Math.random() * 400 }); }
      // the moving launcher: auto-fire quietly after a while is built in; keep the FIRE button meaningful
      if (B.wiz) { B.djT -= dt; if (B.djT <= 0) { B.djT = 4; G.lightShow('chase', 1.2); } }
    },
    lamps(G) {
      const B = G.b, L = {}, t = G.time, trk = B.track;
      L.arrWheel = B.jpLit.wheel || B.wiz ? 'fast' : B.skyLit ? 'blink' : B.sky ? 'pulse' : trk === 3 ? 'blink' : G.skill && B.skillAt === 0 ? 'fast' : 'slow';
      L.arrLoop = B.jpLit.loop || B.wiz ? 'fast' : B.sky ? 'pulse' : trk === 3 ? 'blink' : G.skill && B.skillAt === 1 ? 'fast' : 0.5;
      L.arrOrbL = B.jpLit.orbitL || B.wiz ? 'fast' : trk === 1 ? 'blink' : G.lastShot === 'orbitR' && t - G.lastShotT < 4 ? 'blink' : 0;
      L.arrOrbR = B.jpLit.orbitR || B.wiz ? 'fast' : trk === 1 ? 'blink' : G.lastShot === 'orbitL' && t - G.lastShotT < 4 ? 'blink' : 0;
      L.orbL = B.superLit ? 'fast' : B.lockLit ? 'blink' : B.orbLit ? 'pulse' : G.skill && B.skillAt === 2 ? 'fast' : G.comp('orb').held ? 1 : 0;
      for (let i = 0; i < 3; i++) L['lock' + i] = B.mb ? 'fast' : i < B.locks ? 1 : (i === B.locks && B.lockLit) ? 'blink' : 0;
      L.scoopL = B.wizLit || G.ebLit || B.windLit || (trk < 0 && B.tracks.some(x => !x) && !G.mb) ? 'blink' : 0;
      for (let i = 0; i < 4; i++) L['track' + i] = B.tracks[i] ? 1 : trk === i ? 'fast' : (trk < 0 && i === B.nextTrack && !G.mb) ? 'pulse' : 0;
      L.windL = B.wind ? 'fast' : B.windLit ? 'blink' : (B.spins % 45) / 45 * 0.8;
      L.skyL = B.sky ? 'fast' : B.skyLit ? 'blink' : B.playedSky ? 1 : 0;
      for (let i = 0; i < 3; i++) L['ride' + i] = B.sky || B.skyLit ? 'pulse' : i < (B.rides % 3) ? 1 : 0;
      L.wizL = B.wiz ? 'fast' : B.wizLit ? 'blink' : B.wizDone ? 1 : 0;
      L.mbL = B.mb ? 'fast' : B.locks ? 'pulse' : 0; L.ebL = G.ebLit ? 'blink' : 0;
      B.neo.forEach((v, i) => { L['neol' + i] = v ? 1 : trk === 2 && B.laser[i] ? 'fast' : 0; });
      L.kickback = G.comp('kickback').armed ? 1 : 0;
      for (let i = 0; i < 12; i++) { const ph = (t * (B.sky || B.wiz ? 6 : 2.2) + i / 12 * 3) % 3; L['wb' + i] = ph < 1 ? 1 : 0.12; }
      for (let i = 0; i < 7; i++) L['gi' + i] = 1;
      for (let i = 0; i < 5; i++) L['ug' + i] = 0.6 + 0.4 * Math.sin(t * 2 + i);
      L.pop1 = L.pop2 = L.pop3 = trk === 0 ? 'blink' : B.wiz ? 'fast' : 0.2;
      L.flWheel = L.flRoof = 0; L.flOrb = B.superLit && (t % 1.5) < 0.1 ? 1 : 0;
      return L;
    },
    status(G) {
      const B = G.b;
      if (B.wiz) return 'MIDNIGHT DRIVE: EVERY SHOT IS A JACKPOT';
      if (B.mb) return B.superLit ? 'SUPER JACKPOT AT THE ORB' : 'ORB MULTIBALL: SHOOT THE LIT JACKPOTS';
      if (B.track >= 0) return TRACKS[B.track].name + ': ' + TRACKS[B.track].sub;
      if (B.wizLit) return 'MIDNIGHT DRIVE IS LIT AT BACKSTAGE';
      if (B.sky) return 'SKYLINE: RIDE THE WHEEL AND LOOP THE LOOP';
      if (B.wind) return 'WIND: EVERYTHING SCORES DOUBLE';
      if (B.lockLit) return 'SHOOT THE ORB TO LOCK A BALL';
      if (G.comp('launcher').ball) return 'SLIDE THE LAUNCHER AND FIRE AT V-I-P';
      const opts = ['HIT N-E-O TO LIGHT THE ORB', 'SHOOT THE SUPER LOOP TO THE ROOFTOP', 'RIDE THE SKYLINE WHEEL', 'SPINS TO WIND: ' + (45 - B.spins % 45)];
      if (B.windLit) opts.unshift('WIND IS LIT AT BACKSTAGE'); if (B.skyLit) opts.unshift('SKYLINE IS LIT: RIDE THE WHEEL'); if (B.track < 0 && B.tracks.some(x => !x)) opts.unshift('BACKSTAGE STARTS THE NEXT TRACK');
      return opts[Math.floor(G.time / 4) % opts.length];
    },
    bonus(G) { return [['BEATS', G.pbn('pop'), 500], ['SPINS', G.pbn('spin'), 100], ['LOOPS', G.pbn('loop'), 8000], ['RIDES', G.pbn('ride'), 10000], ['ROOFTOP', G.pbn('roof'), 15000], ['TRACKS', G.pbn('track'), 25000]]; }
  };
  return R;
}

// ═══════════════════════════════════════════════════════════════════════════
// ART (canvas painters; table space, y up)
// ═══════════════════════════════════════════════════════════════════════════
function neonLine(g, pts, color, w, glow) {
  g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
  g.shadowColor = color; g.shadowBlur = glow || 10; g.strokeStyle = rgba(color, 0.55); g.lineWidth = w * 2.4; g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.stroke();
  g.shadowBlur = 0; g.strokeStyle = shade(color, 0.55); g.lineWidth = w; g.stroke();
  g.restore();
}
function paintPlayfield(P) {
  const g = P.ctx, W = P.W, L = P.L, r = rng(31);
  // black gloss with a faint violet haze towards the horizon
  g.fillStyle = P.lin(0, 0, 0, L, [[0, '#06040c'], [0.5, '#0b0716'], [0.82, '#16092a'], [1, '#07050e']]); g.fillRect(0, 0, W, L);
  // the sun behind the beat bumpers (striped), with its haze
  const sx = 305, sy = 836, sr = 92;
  P.glow(sx, sy, 230, '#ff3f8a', 0.22);
  g.save(); P.circle(sx, sy, sr).clip();
  g.fillStyle = P.lin(0, sy - sr, 0, sy + sr, [[0, '#ff2d95'], [0.45, '#ff7a3d'], [1, '#ffd166']]); g.fillRect(sx - sr, sy - sr, sr * 2, sr * 2);
  g.fillStyle = 'rgba(12,6,26,.92)'; for (let i = 0; i < 7; i++) { const y = sy - 6 - i * 11 - i * i * 0.6; g.fillRect(sx - sr, y, sr * 2, 2.2 + i * 0.9); }
  g.restore();
  // perspective grid floor: horizon at y 960, converging to x 243
  g.save(); g.beginPath(); g.rect(0, 0, W, 962); g.clip();
  const hz = 962, vp = 243;
  for (let i = -14; i <= 14; i++) { const x1 = vp + i * 130; neonLine(g, [[vp + i * 9, hz], [x1, 0]], i % 2 ? C.cyan : C.pink, 0.9, 7); }
  for (let k = 0; k < 16; k++) { const f = k / 16, y = hz - (hz) * f * f * 1.0; neonLine(g, [[0, y], [W, y]], k % 2 ? C.cyan : C.pink, 0.9, 7); }
  g.restore();
  // soften the grid under the gameplay (so inserts and lanes read), leave it strong near the horizon
  g.fillStyle = P.lin(0, 0, 0, 962, [[0, 'rgba(7,5,14,.58)'], [0.6, 'rgba(7,5,14,.5)'], [1, 'rgba(7,5,14,.08)']]); g.fillRect(0, 0, W, 962);
  // a glowing horizon band
  g.fillStyle = P.lin(0, 930, 0, 990, [[0, 'rgba(255,63,164,0)'], [0.5, 'rgba(255,63,164,.35)'], [1, 'rgba(255,63,164,0)']]); g.fillRect(0, 930, W, 60);
  // city silhouette along the horizon (behind the rooftop and wheel house)
  g.fillStyle = '#05030a'; let bx = 0; while (bx < W) { const bw = 14 + r() * 26, bh = 20 + r() * 80; g.fillRect(bx, 955, bw, bh); if (r() < 0.3) g.fillRect(bx + bw * 0.4, 955 + bh, 3, 14); bx += bw + 2; }
  g.fillStyle = C.gold; for (let i = 0; i < 90; i++) { const x = r() * W, y = 962 + r() * 70; if (y < 1040) g.fillRect(x, y, 1.6, 2.4); }
  // the dance floor: two dark wells for the discs with a chrome rim and a tiled ring of light
  DISCS.forEach(([x, y]) => { P.glow(x, y, 70, C.violet, 0.22); g.fillStyle = '#060410'; P.circle(x, y, 43).fill(); g.strokeStyle = '#8a8fa0'; g.lineWidth = 2; P.circle(x, y, 43.5).stroke(); g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 0.7; P.circle(x, y, 45).stroke(); });
  for (let i = 0; i < 14; i++) { const x = 160 + i * 12; g.fillStyle = i % 2 ? 'rgba(46,230,255,.22)' : 'rgba(255,63,164,.22)'; g.fillRect(x, 424, 10, 6); g.fillRect(x, 512, 10, 6); }
  P.text('DANCE FLOOR', 243, 440, { size: 7, color: 'rgba(255,255,255,.55)', font: 'Bungee, Impact', weight: '400', spacing: 3 });
  // wind zone streak marks
  for (let i = 0; i < 8; i++) { const y = 360 + i * 32 + r() * 10, x0 = 380 - r() * 40; g.strokeStyle = 'rgba(46,230,255,.18)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x0, y); g.lineTo(x0 - 60 - r() * 60, y + 2); g.stroke(); }
  // the Orb's stage: a chrome-rimmed circle on a dark pool
  P.glow(ORB[0], ORB[1], 80, C.violet, 0.3); g.fillStyle = '#09061a'; P.circle(ORB[0], ORB[1], 40).fill(); g.strokeStyle = '#9aa0b4'; g.lineWidth = 1.5; P.circle(ORB[0], ORB[1], 40).stroke();
  for (let i = 0; i < 24; i++) { const a = i / 24 * TAU; g.fillStyle = i % 2 ? C.pink : C.cyan; g.globalAlpha = 0.5; P.circle(ORB[0] + Math.cos(a) * 35, ORB[1] + Math.sin(a) * 35, 1.6).fill(); } g.globalAlpha = 1;
  P.text('THE ORB', ORB[0], ORB[1] - 50, { size: 7, color: '#d9c8ff', font: 'Bungee, Impact', weight: '400', spacing: 2 });
  // the wheel lane: a lit runway with chevrons
  for (let i = 0; i < 6; i++) { const y = 600 + i * 26; g.fillStyle = 'rgba(255,209,102,' + (0.12 + i * 0.05) + ')'; g.beginPath(); g.moveTo(122, y); g.lineTo(134, y + 10); g.lineTo(146, y); g.lineTo(146, y + 5); g.lineTo(134, y + 15); g.lineTo(122, y + 5); g.closePath(); g.fill(); }
  // wheel house floor: dark with a pink neon border and a city name
  g.fillStyle = 'rgba(4,3,8,.8)'; g.beginPath(); g.moveTo(66, 832); g.lineTo(66, 888); P.ctx.lineTo(80, 930); g.lineTo(120, 980); g.lineTo(170, 1004); g.lineTo(202, 1006); g.lineTo(202, 832); g.closePath(); g.fill();
  P.text('SKYLINE', 134, 985, { size: 9, color: '#ffe1a8', font: 'Bungee, Impact', weight: '400', glow: C.gold, glowR: 3 });
  // the super-loop: printed track under the ramp climb, a neon arrow sweep
  neonLine(g, [[392, 612], [394, 690], [398, 740]], C.pink, 1.2, 8);
  // backstage: a stage door with a light bar
  g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(SCOOP[0] - 26, SCOOP[1] - 10, 52, 34); for (let i = 0; i < 6; i++) { g.fillStyle = i % 2 ? C.violet : C.pink; g.globalAlpha = 0.6; g.fillRect(SCOOP[0] - 22 + i * 8, SCOOP[1] + 20, 5, 3); } g.globalAlpha = 1;
  // lower playfield: title in chrome-pink and lane neon
  P.text('NEON', 243, 214, { size: 22, color: '#ffe0f3', font: 'Bungee, Impact', weight: '400', glow: C.pink, glowR: 5, spacing: 4 });
  P.text('NIGHTS', 243, 190, { size: 15, color: '#cdf6ff', font: 'Bungee, Impact', weight: '400', glow: C.cyan, glowR: 4, spacing: 6 });
  neonLine(g, [[70, 345], [70, 560]], C.violet, 0.9, 6); neonLine(g, [[450, 345], [450, 470]], C.violet, 0.9, 6);
  // palm silhouettes bottom corners
  palm(g, 14, 110, 60, 1, r); palm(g, 506, 110, 60, -1, r);
  // scuffs and wear
  g.strokeStyle = 'rgba(255,255,255,.05)'; g.lineWidth = 0.6; for (let i = 0; i < 70; i++) { const x = r() * W, y = 330 + r() * 500; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 24, y + (r() - 0.5) * 24); g.stroke(); }
}
function palm(g, x, y, h, dir, r) {
  g.save(); g.strokeStyle = 'rgba(0,0,0,.85)'; g.fillStyle = 'rgba(0,0,0,.85)'; g.lineCap = 'round'; g.lineWidth = 4;
  g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + dir * 10, y + h * 0.6, x + dir * 4, y + h); g.stroke();
  for (let i = 0; i < 7; i++) { const a = -0.5 + i * 0.55, len = 22 + r() * 10; g.lineWidth = 2.5; g.beginPath(); g.moveTo(x + dir * 4, y + h); g.quadraticCurveTo(x + dir * 4 + Math.cos(a) * len * 0.7, y + h + 10, x + dir * 4 + Math.cos(a) * len, y + h - 4 + Math.sin(a) * len * 0.5); g.stroke(); }
  g.restore();
}
function paintRoof(P, box) {
  const g = P.ctx, [x0, y0, x1, y1] = box, r = rng(8);
  g.fillStyle = '#0c0817'; g.fillRect(x0, y0, x1 - x0, y1 - y0);
  // rooftop tiles with a glowing grid
  for (let y = y0; y < y1; y += 15) for (let x = x0; x < x1; x += 15) { g.fillStyle = 'rgba(255,255,255,' + (0.02 + r() * 0.04) + ')'; g.fillRect(x + 0.6, y + 0.6, 13.8, 13.8); }
  g.strokeStyle = 'rgba(255,63,164,.5)'; g.lineWidth = 1; for (let x = x0; x <= x1; x += 30) { g.beginPath(); g.moveTo(x, y0); g.lineTo(x, y1); g.stroke(); } for (let y = y0; y <= y1; y += 30) { g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y); g.stroke(); }
  P.text('ROOFTOP', 310, 968, { size: 11, color: 'rgba(255,230,250,.85)', font: 'Bungee, Impact', weight: '400', glow: C.pink });
  P.text('V  I  P', 310, 982, { size: 7, color: 'rgba(205,246,255,.8)', font: 'Bungee, Impact', weight: '400' });
  // the launcher rail groove
  g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(236, 934, 148, 6);
}
function paintBackglass(g, w, h) {
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#0a0620'); gr.addColorStop(0.5, '#3a0f4a'); gr.addColorStop(0.72, '#ff3f8a'); gr.addColorStop(1, '#120a22'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  // sun
  const sx = w / 2, sy = h * 0.5, sr = 130;
  g.save(); g.shadowColor = '#ff6a3d'; g.shadowBlur = 60; g.fillStyle = '#ff7a3d'; g.beginPath(); g.arc(sx, sy, sr, 0, TAU); g.fill(); g.restore();
  g.save(); g.beginPath(); g.arc(sx, sy, sr, 0, TAU); g.clip();
  const sg = g.createLinearGradient(0, sy - sr, 0, sy + sr); sg.addColorStop(0, '#ffe08a'); sg.addColorStop(0.5, '#ff7a3d'); sg.addColorStop(1, '#ff2d95'); g.fillStyle = sg; g.fillRect(sx - sr, sy - sr, sr * 2, sr * 2);
  g.fillStyle = '#2a0f3a'; for (let i = 0; i < 8; i++) { const y = sy + 6 + i * 14 + i * i * 0.5; g.fillRect(sx - sr, y, sr * 2, 3 + i * 1.4); } g.restore();
  // grid floor
  g.strokeStyle = 'rgba(46,230,255,.75)'; g.lineWidth = 1.5; const hz = h * 0.72;
  for (let i = -10; i <= 10; i++) { g.beginPath(); g.moveTo(sx + i * 8, hz); g.lineTo(sx + i * 90, h); g.stroke(); }
  for (let k = 0; k < 7; k++) { const f = k / 7, y = hz + (h - hz) * f * f; g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
  // city skyline and palms
  g.fillStyle = '#07040f'; const r = rng(3); let x = 0; while (x < w) { const bw = 12 + r() * 30, bh = 30 + r() * 110; g.fillRect(x, hz - bh, bw, bh + 4); x += bw + 3; }
  g.fillStyle = '#ffd166'; for (let i = 0; i < 160; i++) { const xx = r() * w, yy = hz - r() * 110; g.fillRect(xx, yy, 2, 3); }
  [[40, h * 0.74, 1], [w - 40, h * 0.74, -1]].forEach(([px, py, d]) => { g.save(); g.translate(px, py); g.scale(1, -1); g.strokeStyle = '#07040f'; g.lineWidth = 6; g.lineCap = 'round'; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(d * 14, 70, d * 6, 120); g.stroke(); g.lineWidth = 4; for (let i = 0; i < 7; i++) { const a = -0.3 + i * 0.5; g.beginPath(); g.moveTo(d * 6, 120); g.quadraticCurveTo(d * 6 + Math.cos(a) * 30, 136, d * 6 + Math.cos(a) * 54, 112 + Math.sin(a) * 26); g.stroke(); } g.restore(); });
  // a car on the road, tail lights
  g.fillStyle = '#0a0612'; g.beginPath(); g.moveTo(sx - 70, h * 0.9); g.lineTo(sx - 50, h * 0.8); g.lineTo(sx + 50, h * 0.8); g.lineTo(sx + 70, h * 0.9); g.closePath(); g.fill();
  g.save(); g.shadowColor = '#ff2040'; g.shadowBlur = 16; g.fillStyle = '#ff3050'; g.fillRect(sx - 60, h * 0.84, 24, 6); g.fillRect(sx + 36, h * 0.84, 24, 6); g.restore();
  // title
  g.save(); g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '400 86px Bungee, Impact, sans-serif';
  g.shadowColor = C.pink; g.shadowBlur = 30; g.fillStyle = '#ffd9f0'; g.fillText('NEON', w / 2, h * 0.2); g.font = '400 60px Bungee, Impact, sans-serif'; g.shadowColor = C.cyan; g.fillStyle = '#d2f8ff'; g.fillText('NIGHTS', w / 2, h * 0.34); g.restore();
}
function paintApron(g, w, h) {
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#16102a'); gr.addColorStop(1, '#07050e'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.save(); g.shadowColor = C.pink; g.shadowBlur = 14; g.strokeStyle = '#ff8ad0'; g.lineWidth = 3; g.strokeRect(14, 14, w - 28, h - 28); g.shadowColor = C.cyan; g.strokeStyle = '#8ff0ff'; g.lineWidth = 2; g.strokeRect(26, 26, w - 52, h - 52); g.restore();
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.save(); g.font = '400 58px Bungee, Impact'; g.shadowColor = C.pink; g.shadowBlur = 18; g.fillStyle = '#ffe0f3'; g.fillText('NEON NIGHTS', w / 2, h * 0.5); g.restore();
  g.font = '700 16px "Arial Narrow", Arial'; g.fillStyle = 'rgba(205,246,255,.8)';
  g.fillText('THE SKYLINE WHEEL  ·  THE SUPER-LOOP TO THE ROOFTOP  ·  N-E-O LIGHTS THE ORB', w / 2, h * 0.8);
  // stripes at the corners
  for (let i = 0; i < 5; i++) { g.fillStyle = i % 2 ? C.cyan : C.pink; g.globalAlpha = 0.6; g.fillRect(40 + i * 14, 40, 6, 40); g.fillRect(w - 46 - i * 14, 40, 6, 40); } g.globalAlpha = 1;
}
function paintSides(g, w, h) {
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#120c1e'); gr.addColorStop(1, '#06040a'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.save(); g.shadowColor = C.pink; g.shadowBlur = 12; g.fillStyle = '#ff6ad5'; g.fillRect(0, h * 0.3, w, 3); g.shadowColor = C.cyan; g.fillStyle = '#5ff0ff'; g.fillRect(0, h * 0.3 + 10, w, 2); g.restore();
  g.strokeStyle = 'rgba(46,230,255,.25)'; g.lineWidth = 1.5; for (let x = 0; x < w; x += 40) { g.beginPath(); g.moveTo(x, h); g.lineTo(x + 30, h * 0.45); g.stroke(); }
}
function paintBackboard(g, w, h) {
  // the sunset wall behind the playfield: stripes and a glow; the skyline buildings are 3D in front
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#0a0620'); gr.addColorStop(0.45, '#4a1050'); gr.addColorStop(0.75, '#ff3f8a'); gr.addColorStop(1, '#ff8a3d'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(10,6,24,.55)'; for (let i = 0; i < 8; i++) { const y = h * 0.5 + i * 22 + i * i * 1.2; g.fillRect(0, y, w, 3 + i); }
  g.save(); g.shadowColor = '#ffb060'; g.shadowBlur = 50; g.fillStyle = 'rgba(255,170,90,.35)'; g.beginPath(); g.arc(w / 2, h * 0.95, 150, PI, 0); g.fill(); g.restore();
  g.fillStyle = '#ffd166'; const r = rng(17); for (let i = 0; i < 60; i++) { g.globalAlpha = 0.3 + r() * 0.7; g.fillRect(r() * w, r() * h * 0.4, 2, 2); } g.globalAlpha = 1;
}
function spinArt(g, w, h) { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#f8f8ff'); gr.addColorStop(1, '#c8ccd8'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = '#1a0a2a'; g.font = '400 56px Bungee, Impact'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('DRIVE', w / 2, h / 2 + 3); g.fillStyle = C.pink; g.fillRect(0, h - 10, w, 10); g.fillStyle = C.cyan; g.fillRect(0, 0, w, 10); }
function beatCap(g, w, h, i) {
  // a speaker cone with a pink/cyan ring, 'BEAT' lettering
  const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); gr.addColorStop(0, '#2a1a3a'); gr.addColorStop(0.5, [C.pink, C.cyan, C.violet][i]); gr.addColorStop(1, '#120a1c'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.strokeStyle = 'rgba(255,255,255,.65)'; g.lineWidth = 6; for (let k = 1; k <= 3; k++) { g.beginPath(); g.arc(w / 2, h / 2, w * 0.12 * k, 0, TAU); g.stroke(); }
  g.fillStyle = 'rgba(0,0,0,.8)'; g.font = '400 40px Bungee, Impact'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('BEAT', w / 2, h * 0.5 + 2);
}
function discArt(g, w, h, i) {
  // a vinyl record: grooves, a neon label
  g.fillStyle = '#14111b'; g.beginPath(); g.arc(w / 2, h / 2, w / 2, 0, TAU); g.fill();
  for (let r = w * 0.2; r < w * 0.49; r += 4) { g.strokeStyle = 'rgba(255,255,255,' + (0.05 + 0.08 * ((r / 4) % 2)) + ')'; g.lineWidth = 1.2; g.beginPath(); g.arc(w / 2, h / 2, r, 0, TAU); g.stroke(); }
  const lg = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.18); lg.addColorStop(0, i ? '#7df0ff' : '#ff8ad0'); lg.addColorStop(1, i ? '#0b5a6a' : '#7a1a4a'); g.fillStyle = lg; g.beginPath(); g.arc(w / 2, h / 2, w * 0.18, 0, TAU); g.fill();
  g.fillStyle = '#0a0812'; g.beginPath(); g.arc(w / 2, h / 2, 5, 0, TAU); g.fill();
  g.fillStyle = 'rgba(0,0,0,.7)'; g.font = '400 18px Bungee, Impact'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(i ? 'SIDE B' : 'SIDE A', w / 2, h / 2 + 24);
  g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.moveTo(w / 2 + 40, h / 2 - 6); g.lineTo(w / 2 + 52, h / 2); g.lineTo(w / 2 + 40, h / 2 + 6); g.fill();
}
// the hologram DJ (drawn each frame on a 256x320 canvas): headphones, bobbing head, a hand on the deck
function drawDJ(g, w, h, t, holo) {
  const k = holo.flare, bob = Math.sin(t * 5) * 5, nod = Math.sin(t * 5 + 0.6) * 0.08;
  g.save(); g.translate(w / 2, h * 0.5);
  g.shadowColor = C.cyan; g.shadowBlur = 14;
  // the deck: two turntables and a mixer
  g.fillStyle = 'rgba(46,230,255,.35)'; g.fillRect(-100, 90, 200, 36);
  for (const x of [-62, 62]) { g.strokeStyle = 'rgba(255,106,213,.9)'; g.lineWidth = 3; g.beginPath(); g.arc(x, 108, 24, 0, TAU); g.stroke(); g.beginPath(); g.arc(x, 108, 8, 0, TAU); g.stroke(); g.save(); g.translate(x, 108); g.rotate(t * (x < 0 ? 4 : -3.2)); g.fillStyle = 'rgba(255,255,255,.7)'; g.fillRect(-1, -22, 2, 10); g.restore(); }
  for (let i = 0; i < 4; i++) { g.fillStyle = 'rgba(255,255,255,.8)'; g.fillRect(-14 + i * 8, 98 + Math.sin(t * 6 + i) * 6, 3, 14); }
  // body
  g.fillStyle = 'rgba(46,230,255,' + (0.5 + k * 0.3) + ')'; g.beginPath(); g.moveTo(-60, 92); g.quadraticCurveTo(-56, 20, -20, 10); g.lineTo(20, 10); g.quadraticCurveTo(56, 20, 60, 92); g.closePath(); g.fill();
  // arms: one scratching, one in the air
  g.strokeStyle = 'rgba(46,230,255,.85)'; g.lineWidth = 12; g.lineCap = 'round';
  g.beginPath(); g.moveTo(-44, 36); g.quadraticCurveTo(-70, 70, -62 + Math.sin(t * 9) * 10, 96); g.stroke();
  g.beginPath(); g.moveTo(44, 36); g.quadraticCurveTo(80, 10, 70 + Math.sin(t * 2.5) * 10, -40 + Math.cos(t * 2.5) * 8); g.stroke();
  // head with headphones and shades
  g.save(); g.translate(0, -30 + bob); g.rotate(nod);
  g.fillStyle = 'rgba(46,230,255,' + (0.7 + k * 0.3) + ')'; g.beginPath(); g.ellipse(0, 0, 26, 32, 0, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(255,106,213,.95)'; g.lineWidth = 6; g.beginPath(); g.arc(0, -4, 32, PI * 1.1, PI * 1.9); g.stroke(); g.fillStyle = 'rgba(255,106,213,.95)'; g.fillRect(-36, -14, 10, 22); g.fillRect(26, -14, 10, 22);
  g.fillStyle = 'rgba(20,10,40,.9)'; g.fillRect(-22, -8, 18, 9); g.fillRect(4, -8, 18, 9); g.fillRect(-4, -6, 8, 3);
  g.restore();
  g.restore();
}

// ═══════════════════════════════════════════════════════════════════════════
// 3D MODELS
// ═══════════════════════════════════════════════════════════════════════════
function mesh(geo, mat, cast = true) { const m = new THREE.Mesh(geo, mat); m.castShadow = cast; m.receiveShadow = true; return m; }
function neonMat(color, k = 2) { return new THREE.MeshStandardMaterial({ color: shade(color, -0.75), emissive: color, emissiveIntensity: k, roughness: 0.35 }); }
// a neon tube along 3D points (glass tube look: emissive core)
function neonTube(RC, pts, color, r = 1.3, k = 2.2) {
  const m = neonMat(color, k); const t = new THREE.Mesh(tubeGeo(pts, r, Math.max(8, pts.length * 3), 6), m); RC.root.add(t);
  (RC.neon = RC.neon || []).push({ m, k, seed: Math.random() * 9 }); return t;
}
// points along a path offset sideways (lat) and up (vert), for rails and tube edges
function offsetPath3(pts, lat, vert) {
  const out = [], n = pts.length;
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    const t = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]).normalize();
    let side = new THREE.Vector3(-t.y, t.x, 0); if (side.lengthSq() < 1e-6) side = new THREE.Vector3(1, 0, 0); side.normalize();
    const up = new THREE.Vector3().crossVectors(t, side).normalize(); if (up.z < 0) up.multiplyScalar(-1);
    const p = new THREE.Vector3(pts[i][0], pts[i][1], pts[i][2]).addScaledVector(side, lat).addScaledVector(up, vert);
    out.push([p.x, p.y, p.z]);
  }
  return out;
}

// THE ORB: a chrome sphere hung from a curved arm on the centre pylon, with two neon rings
function orbModel(RC, comp) {
  const g = new THREE.Group(); g.position.set(ORB[0], ORB[1], 0);
  const chrome = RC.mats.chrome(), B = RC.batch;
  // pylon (the post at 243,700 has physics) and the arm reaching forward over the Orb
  B.add(chrome, cylGeo(243, 700, 6, 0, 96, 16)); B.add(chrome, cylGeo(243, 700, 9, 96, 99, 16));
  B.add(chrome, tubeGeo([[243, 700, 97], [243, 672, 104], [243, 636, 102], [243, 612, 94], [243, 602, 84]], 2.6, 24, 8));
  B.add(chrome, cylGeo(243, 600, 1.4, 78, 84, 8));
  const pivot = new THREE.Group(); pivot.position.z = 80; g.add(pivot);
  const body = new THREE.Group(); body.position.z = -24; pivot.add(body);
  const orb = mesh(new THREE.SphereGeometry(23, 36, 26), chrome); body.add(orb);
  // facets: a disco-mirror look from a scuffed roughness map
  orb.material = new THREE.MeshStandardMaterial({ color: '#f0f2f8', metalness: 1, roughness: 0.12, roughnessMap: RC.mats.scuff, envMapIntensity: 1.3 });
  const r1 = new THREE.Mesh(new THREE.TorusGeometry(28, 1.2, 8, 56), neonMat(C.pink, 2.4)); r1.rotation.x = 0.5; body.add(r1);
  const r2 = new THREE.Mesh(new THREE.TorusGeometry(32, 1.1, 8, 56), neonMat(C.cyan, 2.2)); r2.rotation.x = PI / 2 + 0.3; r2.rotation.y = 0.4; body.add(r2);
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(110, 110), RC.mats.glow(C.violet)); glow.position.z = 1.5; glow.renderOrder = 3; g.add(glow);
  g.userData = { body, r1, r2, glow, pivot, orb };
  return g;
}
function orbAnimate(g, dt, comp) {
  const u = g.userData, t = comp.G.time, held = !!comp.held, act = comp.active || held, B = comp.G.b;
  u.spin = (u.spin || 0) + dt * (held ? 5 : act ? 1.6 : 0.4); u.orb.rotation.z = u.spin; u.orb.rotation.x = Math.sin(t * 0.7) * 0.2;
  u.r1.rotation.z += dt * (act ? 2.2 : 0.5); u.r2.rotation.z -= dt * (act ? 1.8 : 0.4);
  u.pivot.rotation.x = Math.sin(t * 0.9) * 0.025 + (held ? Math.sin(t * 14) * 0.02 : 0);
  const sup = B && B.superLit;
  u.r1.material.emissiveIntensity = (act ? 3.2 : 1.1) * (0.9 + 0.1 * Math.sin(t * 11)) * (sup && (t % 0.4) < 0.2 ? 1.6 : 1);
  u.r2.material.emissiveIntensity = (act ? 2.8 : 0.9) * (0.9 + 0.1 * Math.sin(t * 9 + 2));
  u.glow.material.opacity = (act ? 0.45 : 0.12) + (held ? 0.3 * (0.5 + 0.5 * Math.sin(t * 16)) : 0);
  u.body.position.z = -24 + (held ? Math.sin(t * 10) * 1.2 : 0);
}

// THE MOVING LAUNCHER on the rooftop: a chrome carriage on two rails with a neon nose
function launcherMesh(RC, comp) {
  const z = comp.z0, { x0, x1, y } = comp.o, chrome = RC.mats.chrome(), B = RC.batch;
  for (const dy of [-11, -5]) B.add(chrome, tubeGeo([[x0 - 14, y + dy, z + 3], [x1 + 14, y + dy, z + 3]], 1.6, 2, 8));
  [x0 - 14, x1 + 14].forEach(x => B.add(RC.mats.steel(), boxGeo(x, y - 8, z + 3, 4, 12, 7)));
  const g = new THREE.Group();
  const car = mesh(new THREE.BoxGeometry(32, 18, 9), RC.mats.plastic('#1a1326', { roughness: 0.25, clearcoat: 1 })); car.position.set(0, -8, 5); g.add(car);
  const rail = mesh(new THREE.BoxGeometry(26, 3, 3), chrome); rail.position.set(0, -8, 11); g.add(rail);
  const nose = mesh(new THREE.CylinderGeometry(5, 7, 10, 14), chrome); nose.position.set(0, 2, 7); g.add(nose);
  const strip = new THREE.Mesh(new THREE.BoxGeometry(30, 2, 2.4), neonMat(C.pink, 2.6)); strip.position.set(0, -17.5, 8); g.add(strip);
  const dots = new THREE.Mesh(new THREE.BoxGeometry(2.4, 14, 2), neonMat(C.cyan, 2.2)); dots.position.set(-15.5, -8, 9); g.add(dots); const d2 = dots.clone(); d2.position.x = 15.5; g.add(d2);
  RC.root.add(g); comp.g = g;
  RC.anim.push((dt, t) => { strip.material.emissiveIntensity = comp.ball ? 3.5 * (0.7 + 0.3 * Math.sin(t * 14)) : 1.4; });
}

// THE WIND MACHINE: a caged fan on a chrome post, facing across the dance floor
function fanMesh(RC, comp) {
  const fx = comp.o.x, fy = comp.o.y, z0 = comp.z0, chrome = RC.mats.chrome(), B = RC.batch;
  B.add(RC.mats.steel(), cylGeo(fx, fy, 4, z0, z0 + 50, 10)); B.add(RC.mats.steel(), cylGeo(fx, fy, 9, z0, z0 + 3, 16));
  // the cage is static: rings and bars built round the fan axis (table -x), batched
  const cage = [];
  for (const dx of [-7, 7]) { const t = new THREE.TorusGeometry(31, 1.2, 6, 40); t.rotateY(PI / 2); t.translate(fx + dx, fy, z0 + 54); cage.push(t); }
  for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; cage.push(tubeGeo([[fx - 7, fy + Math.cos(a) * 31, z0 + 54 + Math.sin(a) * 31], [fx - 7, fy + Math.cos(a) * 6, z0 + 54 + Math.sin(a) * 6]], 0.7, 2, 5)); cage.push(tubeGeo([[fx - 7, fy + Math.cos(a) * 31, z0 + 54 + Math.sin(a) * 31], [fx + 7, fy + Math.cos(a) * 31, z0 + 54 + Math.sin(a) * 31]], 0.7, 2, 5)); }
  B.add(chrome, mergeGeos(cage));
  B.add(RC.mats.plastic('#1a1326', { roughness: 0.3 }), new THREE.CylinderGeometry(6, 6, 10, 16).rotateZ(PI / 2).translate(fx, fy, z0 + 54));
  const g = new THREE.Group(); g.position.set(fx, fy, z0);
  const holder = new THREE.Group(); holder.position.z = 54; holder.rotation.z = PI / 2; g.add(holder);   // local +Y = table -X (the fan axis)
  const blades = new THREE.Group(); holder.add(blades);
  const bg = [];
  for (let i = 0; i < 5; i++) { const b = new THREE.BoxGeometry(9, 1.2, 24); b.translate(0, 0, 16); b.rotateY(0.5); b.rotateY(i / 5 * TAU); bg.push(b); }
  blades.add(mesh(mergeGeos(bg), RC.mats.plastic('#e8ecf4', { roughness: 0.2, clearcoat: 1 })));
  const ring = new THREE.Mesh(new THREE.TorusGeometry(33, 1, 6, 40), neonMat(C.cyan, 2)); ring.rotation.x = PI / 2; holder.add(ring);
  RC.root.add(g); comp.blades = blades;
  RC.anim.push((dt, t) => { ring.material.emissiveIntensity = 1.2 + comp.spd * 2.5 * (0.8 + 0.2 * Math.sin(t * 20)); });
}

// Neon tubes: the rooftop edge (pink), the wheel house (cyan), the loop ramp rails (pink), lane guides (violet)
function neonModel(RC) {
  const z = ROOF.z, [x0, y0, x1, y1] = ROOF.box;
  neonTube(RC, [[x0 + 2, y0 + 1, z + 23], [x0 + 2, y1 - 1, z + 23], [x1 - 2, y1 - 1, z + 23], [x1 - 2, y0 + 30, z + 23]], C.pink, 1.4, 2.4);
  neonTube(RC, [[x0 - 1, y0, z - 10], [x1 + 1, y0, z - 10]], C.cyan, 1.2, 2.2);
  // wheel house: a cyan tube along the top of the wall
  const arc = []; for (let i = 0; i <= 10; i++) { const a = deg(156 - i * 5.3); arc.push([HOUSE_ARC[0] + Math.cos(a) * (HOUSE_ARC[2] - 1), HOUSE_ARC[1] + Math.sin(a) * (HOUSE_ARC[2] - 1), 43]); }
  neonTube(RC, [[64, 836, 43], [66, 888, 43]].concat(arc).concat([[204, 1008, 43], [204, 838, 43]]), C.cyan, 1.3, 2.2);
  // the loop ramp: pink tubes along both top edges (the ball glows through the pink plastic)
  const lp = RC.G.comps.loop.pts;
  for (const lat of [-19, 19]) neonTube(RC, offsetPath3(lp, lat, 22), C.hot, 1.1, 2.0);
  // violet tubes along the inlane guides
  neonTube(RC, [[46, 328, 24], [46, 218, 24]], C.violet, 1.1, 1.8); neonTube(RC, [[440, 328, 24], [440, 218, 24]], C.violet, 1.1, 1.8);
  // the orb pylon gets a violet ring
  const pr = new THREE.Mesh(torusGeo(243, 700, 60, 9, 1, 24), neonMat(C.violet, 2)); RC.root.add(pr); RC.neon.push({ m: pr.material, k: 2, seed: 3 });
  // flicker: one tube is 'old' and stutters; the rest breathe
  RC.anim.push((dt, t) => {
    const G = RC.G, dark = G.dark, beat = G.b && (G.b.wiz || G.b.mb) ? 0.25 * Math.max(0, Math.sin(t * 8)) : 0;
    RC.neon.forEach((n, i) => {
      let k = n.k * (0.94 + 0.06 * Math.sin(t * 7 + n.seed)) * (1 - dark * 0.6) * (1 + beat);
      if (i === 3 && Math.sin(t * 1.3 + 1) > 0.93 && Math.random() < 0.5) k *= 0.25;
      n.m.emissiveIntensity = k;
    });
  });
  return null;
}
// city skyline along the back wall: dark towers with lit windows, a radio mast with a blinking light
function skylineModel(RC) {
  const B = RC.batch, r = rng(23), dark = RC.mats.plastic('#0a0812', { roughness: 0.6, clearcoat: 0.3 }), wins = [];
  let x = 10;
  while (x < RC.W - 20) {
    const w = 18 + r() * 30, h = 40 + r() * 90, d = 10 + r() * 10, y = RC.L - 14 + (r() - 0.5) * 6;
    B.add(dark, boxGeo(x + w / 2, y, h / 2, w, d, h));
    for (let wy = 10; wy < h - 8; wy += 9) for (let wx = 4; wx < w - 4; wx += 6) if (r() < 0.55) { const g = new THREE.BoxGeometry(3, 1, 4); g.translate(x + wx + 1.5, y - d / 2 - 0.3, wy); wins.push(g); }
    x += w + 3 + r() * 6;
  }
  const wm = new THREE.Mesh(mergeGeos(wins), neonMat(C.gold, 1.6)); RC.root.add(wm);
  // radio mast with a red beacon
  B.add(RC.mats.steel(), cylGeo(60, RC.L - 12, 1.6, 0, 170, 8)); B.add(RC.mats.steel(), tubeGeo([[52, RC.L - 12, 110], [60, RC.L - 12, 150], [68, RC.L - 12, 110]], 0.6, 6, 5));
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(3, 10, 8), neonMat('#ff3050', 3)); beacon.position.set(60, RC.L - 12, 172); RC.root.add(beacon);
  RC.anim.push((dt, t) => { beacon.material.emissiveIntensity = (t % 1.6) < 0.25 ? 4 : 0.2; wm.material.emissiveIntensity = 1.6 * (1 - RC.G.dark * 0.7); });
  return null;
}
// legs and wall brackets holding the wireforms (placed where no ball travels)
function wireLegs(RC) {
  const B = RC.batch, s = RC.mats.steel(), w = RC.G.world;
  const leg = (x, y, z) => { B.add(s, cylGeo(x, y, 1.6, 0, z - 1, 8)); B.add(s, cylGeo(x, y, 4, 0, 1.5, 8)); };
  const at = (comp, f) => { const p = w.pathAt(comp.path, comp.path.L * f); return p; };
  // skyline wire: posts on the wheel-house wall, brackets off the left wall, a post at the lane end
  const sk = RC.G.comps.wheel; [0.14, 0.34, 0.56, 0.78].forEach(f => { const p = at(sk, f); if (f < 0.2) leg(p[0], p[1], p[2]); else { B.add(s, tubeGeo([[4, p[1], 36], [p[0] - 15, p[1], p[2] + 2]], 1.6, 2, 6)); B.add(s, boxGeo(4, p[1], 36, 3, 10, 6)); } });
  // roof exit wire: a post by the deck leg, then brackets off the shooter-lane wall down the right side
  const re = RC.G.comps.roofExit; leg(452, 896, at(re, 0.14)[2]);
  [0.42, 0.56, 0.7, 0.84].forEach(f => { const p = at(re, f); B.add(s, tubeGeo([[506, p[1], 40], [p[0] + 12, p[1], p[2] + 2]], 1.6, 2, 6)); B.add(s, boxGeo(508, p[1], 40, 4, 10, 6)); });
  // the loop ramp: a cradle under the corkscrew and legs under the climb to the deck (outside the lanes)
  const lp = RC.G.comps.loop.pts;
  [[0.52, 404, 758], [0.66, 440, 846], [0.8, 448, 900]].forEach(([f, x, y]) => { const p = w.pathAt(RC.G.comps.loop.path, RC.G.comps.loop.path.L * f); B.add(s, cylGeo(x, y, 2, 0, p[2] - 3, 8)); B.add(s, cylGeo(x, y, 5, 0, 1.5, 8)); B.add(s, tubeGeo([[x, y, p[2] - 3], [p[0], p[1], p[2] - 3]], 1.6, 2, 6)); });
  void lp;
  return null;
}
// wind: thin streaks that fly across the dance floor while the fan runs
function windStreaks(RC) {
  const n = 16, geo = new THREE.PlaneGeometry(36, 1.2), mat = new THREE.MeshBasicMaterial({ color: C.cyan, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const im = new THREE.InstancedMesh(geo, mat, n); im.renderOrder = 6; RC.root.add(im);
  const S = []; for (let i = 0; i < n; i++) S.push({ x: 120 + Math.random() * 300, y: 340 + Math.random() * 300, z: 8 + Math.random() * 40, v: 500 + Math.random() * 400 });
  const mm = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), sc = new THREE.Vector3(1, 1, 1);
  RC.anim.push((dt) => {
    const fan = RC.G.comps.fan, k = fan ? fan.spd : 0; mat.opacity = k * 0.55; if (k < 0.02) return;
    S.forEach((s, i) => { s.x -= s.v * k * dt; if (s.x < 60) { s.x = 420 + Math.random() * 30; s.y = 340 + Math.random() * 300; s.z = 8 + Math.random() * 40; } p.set(s.x, s.y, s.z); sc.set(0.6 + k, 1, 1); mm.compose(p, q, sc); im.setMatrixAt(i, mm); });
    im.instanceMatrix.needsUpdate = true;
  });
  return null;
}
