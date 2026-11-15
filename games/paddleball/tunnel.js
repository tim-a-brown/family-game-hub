// Pong's Tunnel (Tim, 2026-11-15: "a 1 player 3-D concept for pong with bounces off the ceiling, floor and walls ...
// get weird and colorful and wacky with the effects"). One player against the computer, looking down a box-shaped
// tunnel drawn in neon edges inside a synthwave world: a big striped sun, a checkered floor to the horizon, stars.
// Your paddle is the see-through frame at the near end; the computer's is the solid square at the far end; the ball
// is chrome and bounces off all four sides of the tunnel. A frame rides the walls at the ball's depth.
//
// paddleball.html starts it from Pong's setup (Table: Tunnel) through window.PongTunnel:
//   PongTunnel.start({host, diff, players, saved, onSetup})   PongTunnel.stop()   PongTunnel.active()
//   PongTunnel.saved()   the saved tunnel game in paddleball_state (v 2), or null
// Test hook: window.__tunnel (get, auto, level, hold, miss, point, curve, quality, perf, serve).
//
// The ball moves in the tunnel's own measure: u and v run from -1 to 1 across its width and height, z is depth (0 at
// your paddle, -L at the computer's). The tunnel takes the shape of the screen (wide sideways, tall upright), so a
// turn of the device only stretches the box: the game plays on exactly where it was.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const Kit = window.Kit;
const KEY = 'paddleball', BOARD = 'paddleball_tunnel', SAVE = 'paddleball_state';
const L = 11, CAM_D = 2.7, HH = 1.5, FIT = 1.06, TICK = 1 / 120;
const PU = 0.26, PV = 0.26;             // each paddle's half size, as a share of the tunnel's half width and half height
const NEED = 3;                         // points past the computer to clear a level
const LIVES = 3, MAX_LIVES = 5;
const SPIN_DECAY = 0.32, CURVE = 0.6, BIG_CURVE = 1.5;
const MUL = { easy: 1, normal: 2, hard: 3 };
// The computer's skill: how fast it moves (u a second), how quickly it looks again, how far off its first guess is,
// how much of the ball's curve it reads, how it aims, and how much curve it puts on. Never anything it couldn't see.
const DIFF = {
  easy:   { name: 'Easy',   speed: 1.1,  accel: 6,  react: 0.3,  err: 0.4,  settle: 0.95, read: 0,    aim: 0,    spin: 0,    spinP: 0 },
  normal: { name: 'Normal', speed: 1.35, accel: 9,  react: 0.22, err: 0.32, settle: 0.93, read: 0.2,  aim: 0.35, spin: 0.8,  spinP: 0.3 },
  hard:   { name: 'Hard',   speed: 1.6,  accel: 12, react: 0.17, err: 0.3,  settle: 0.92, read: 0.4,  aim: 0.6,  spin: 1.1,  spinP: 0.5 }
};
// Each level has its own colors (the last ones cycle the rainbow)
const PALS = [
  { a: '#ff3df2', b: '#2ef6ff', top: '#12042c', mid: '#5b0f6e', hor: '#ff6a3d', sunA: '#fff3a0', sunB: '#ff2f9a', fa: '#d6b4ff', fb: '#150531', grid: '#ff4fd8', pad: '#ffe93a', cpu: '#ff2ad4' },
  { a: '#7dff2e', b: '#ff2e88', top: '#020d14', mid: '#0a3a3c', hor: '#21b87a', sunA: '#eaff8a', sunB: '#12c46a', fa: '#86f0c0', fb: '#021612', grid: '#7dff2e', pad: '#fff23a', cpu: '#ff2e88' },
  { a: '#ff8a1a', b: '#3a8bff', top: '#120104', mid: '#560818', hor: '#ff5a1a', sunA: '#ffe08a', sunB: '#ff2a10', fa: '#ffb08a', fb: '#1a0306', grid: '#ff7a1a', pad: '#e9f5ff', cpu: '#3a8bff' },
  { a: '#b14dff', b: '#ffd23a', top: '#05011a', mid: '#22095c', hor: '#c03a9e', sunA: '#ffffff', sunB: '#b14dff', fa: '#b9a0ff', fb: '#08021c', grid: '#8f5dff', pad: '#3affd2', cpu: '#ffd23a' },
  { a: '#7af0ff', b: '#ff7ad9', top: '#020818', mid: '#0b2c5c', hor: '#3f9ad8', sunA: '#ffffff', sunB: '#4a8cff', fa: '#b0e0ff', fb: '#041024', grid: '#7af0ff', pad: '#ffe93a', cpu: '#ff7ad9' },
  { a: '#ff5ab0', b: '#5affd8', top: '#1a0320', mid: '#5c1458', hor: '#ff7a4a', sunA: '#fffbe0', sunB: '#ff5ab0', fa: '#ffc0e8', fb: '#1e041a', grid: '#5affd8', pad: '#fff23a', cpu: '#5affd8' }
];
const PKEYS = Object.keys(PALS[0]);
const HDR = { a: 1.35, b: 1.35, pad: 1.4, cpu: 1.25 };   // neon lines are brighter than white, so the bloom catches them

const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const randn = () => (Math.random() + Math.random() + Math.random() - 1.5) / 0.5;
const fmt = n => Math.round(n).toLocaleString('en-US');
function soundOn() { try { return localStorage.getItem('gn_sound') !== '0'; } catch (e) { return true; } }
const TOUCH = (window.matchMedia && matchMedia('(pointer:coarse), (hover:none)').matches) || navigator.maxTouchPoints > 0;

// ═══ Sound ═══════════════════════════════════════════════════════════════
let AC = null, master = null, musicIn = null, analyser = null, fbins = null, noiseBuf = null;
function ac() {
  if (!soundOn()) return null;
  if (!AC) {
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return null;
    try { AC = new C(); } catch (e) { return null; }
    master = AC.createGain(); master.gain.value = 0.8;
    const comp = AC.createDynamicsCompressor(); master.connect(comp); comp.connect(AC.destination);
    // the music runs through an analyser: the sun and the walls pulse with its kick and snare
    analyser = AC.createAnalyser(); analyser.fftSize = 64; analyser.smoothingTimeConstant = 0.35;
    musicIn = AC.createGain(); musicIn.connect(analyser); analyser.connect(master);
    fbins = new Uint8Array(analyser.frequencyBinCount);
  }
  if (AC.state === 'suspended') AC.resume();
  return AC;
}
function osc(type, f, t0, dur, vol, o) {
  const a = ac(); if (!a) return; o = o || {};
  const t = a.currentTime + t0, n = a.createOscillator(), g = a.createGain(); let out = n;
  n.type = type; n.frequency.setValueAtTime(f, t);
  if (o.to) n.frequency.exponentialRampToValueAtTime(o.to, t + (o.toT || dur));
  if (o.wob) { const l = a.createOscillator(), lg = a.createGain(); l.frequency.value = o.wob; lg.gain.value = f * 0.12; l.connect(lg); lg.connect(n.frequency); l.start(t); l.stop(t + dur + 0.05); }
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  if (o.lp) { const fl = a.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = o.lp; n.connect(fl); out = fl; }
  out.connect(g); g.connect(master); n.start(t); n.stop(t + dur + 0.05);
}
function noise(t0, dur, vol, type, freq, to) {
  const a = ac(); if (!a) return;
  if (!noiseBuf) { noiseBuf = a.createBuffer(1, a.sampleRate, a.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
  const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain(), t = a.currentTime + t0;
  s.buffer = noiseBuf; s.loop = true; f.type = type || 'bandpass'; f.frequency.setValueAtTime(freq || 1000, t);
  if (to) f.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(master); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
}
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
const SCALE = [0, 3, 5, 7, 10, 12, 15, 17];   // the walls ring the notes of A minor pentatonic
const snd = {
  hit(rally, spin) {
    const f = 330 * Math.pow(2, Math.min(rally, 24) / 16);
    osc('square', f, 0, 0.08, 0.05, { lp: 3400 }); osc('sine', f / 2, 0, 0.1, 0.07);
    if (Math.abs(spin) > CURVE) osc('sine', f * 1.5, 0.02, 0.32, 0.05, { to: f * (spin > 0 ? 3 : 0.75), wob: 14 });   // the curve's wee-oo
  },
  cpu() { osc('triangle', 196, 0, 0.1, 0.07); osc('square', 392, 0, 0.05, 0.02, { lp: 1800 }); },
  wall(i, lvl) { const m = 57 + SCALE[(i + lvl) % SCALE.length]; osc('sine', mtof(m) * 1.5, 0, 0.16, 0.06, { to: mtof(m), toT: 0.05 }); osc('square', mtof(m), 0, 0.05, 0.015, { lp: 1600 }); },
  serve() { osc('triangle', 520, 0, 0.08, 0.06, { to: 880 }); },
  point() { [69, 73, 76, 81, 85].forEach((m, i) => osc('square', mtof(m), i * 0.05, 0.14, 0.035, { lp: 3000 })); noise(0, 0.5, 0.05, 'highpass', 5000); },
  miss() { osc('sawtooth', 420, 0, 0.6, 0.06, { to: 50, lp: 2200 }); noise(0, 0.45, 0.16, 'lowpass', 1500, 120); noise(0.02, 0.18, 0.08, 'highpass', 6000); },
  warp() { noise(0, 2.2, 0.08, 'bandpass', 180, 5200); osc('sawtooth', 110, 0, 2.0, 0.035, { to: 1320, lp: 3000 }); osc('sine', 55, 0, 2.2, 0.08, { to: 220 }); },
  life() { [76, 81, 88].forEach((m, i) => osc('triangle', mtof(m), i * 0.08, 0.3, 0.07)); },
  boom() { noise(0, 0.6, 0.18, 'lowpass', 900, 60); osc('sine', 90, 0, 0.5, 0.12, { to: 30 }); }
};
// A synthwave loop in A minor (Am F C G): driving sawtooth bass, a glassy lead, kick and snare that the sun pulses to
const SONG = {
  eighth: 0.25, leadWave: 'sawtooth', leadVol: 0.022, leadLp: 2400, echo: 0.45, bassWave: 'sawtooth', bassLp: 620, bassVol: 0.07, drumVol: 1,
  lead: [81, 0, 76, 0, 72, 0, 76, 79,  77, 0, 72, 0, 69, 0, 72, 76,  79, 0, 76, 0, 72, 0, 76, 0,  74, 0, 79, 0, 83, 0, 79, 74,
         81, 0, 0, 84, 83, 0, 79, 0,  77, 0, 0, 81, 79, 0, 76, 0,  76, 0, 0, 79, 84, 0, 83, 0,  79, 0, 74, 0, 71, 0, 0, 0],
  bass: [45, 45, 57, 45, 45, 45, 57, 45,  41, 41, 53, 41, 41, 41, 53, 41,  48, 48, 60, 48, 48, 48, 60, 48,  43, 43, 55, 43, 43, 43, 55, 43],
  drums: 'khshkhsh'
};

// ═══ Shaders ═════════════════════════════════════════════════════════════
const U = { twist: { value: 0 }, L: { value: L }, time: { value: 0 }, beat: { value: 0 } };
// the tunnel's twist (later levels): everything in the tunnel turns about its axis, more the farther away it is
const TWIST_VS = `
  uniform float uTwist, uL;
  vec4 twistIt(vec4 wp){ float a = uTwist * clamp(-wp.z / uL, 0.0, 1.0); float c = cos(a), s = sin(a); wp.xy = vec2(wp.x*c - wp.y*s, wp.x*s + wp.y*c); return wp; }`;
function neonMat(color, op, add) {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uOp: { value: op == null ? 1 : op }, uTwist: U.twist, uL: U.L },
    vertexShader: TWIST_VS + `void main(){ gl_Position = projectionMatrix * viewMatrix * twistIt(modelMatrix * vec4(position, 1.0)); }`,
    fragmentShader: `uniform vec3 uColor; uniform float uOp; void main(){ gl_FragColor = vec4(uColor, uOp); }`,
    transparent: op != null && op < 1, depthWrite: !(op != null && op < 1), blending: add ? THREE.AdditiveBlending : THREE.NormalBlending
  });
}
const WALL_FS = `
  varying vec3 vPos;
  uniform vec3 uBall, uA, uB; uniform float uBallOn, uTime, uBeat, uPulse, uS, uL;
  uniform vec4 uImp[8]; uniform vec3 uImpC[8];
  void main(){
    float zz = vPos.z * 0.85;
    float d = abs(fract(zz + 0.5) - 0.5) / max(fwidth(zz), 1e-4);
    float line = (1.0 - min(d, 1.0)) * 0.28;
    // the ball lights the walls near it (you can tell how close it is to each side)
    vec3 q = vPos - uBall; float dd = dot(q, q) / (uS * uS);
    float g = uBallOn * (exp(-dd * 7.0) * 0.28 + exp(-dd * 30.0) * 0.8);
    // a band of light runs down the tunnel on each beat
    float pz = -uPulse * uL; float pulse = exp(-pow((vPos.z - pz) * 2.2, 2.0)) * (1.0 - uPulse) * uBeat * 0.7;
    vec3 col = uA * (line + pulse) + uB * g;
    float a = 0.09 + line * 0.5 + g * 0.6 + pulse * 0.6;
    for (int i = 0; i < 8; i++) {
      float t = uTime - uImp[i].w; if (t < 0.0 || t > 1.4) continue;
      float r = length(vPos - uImp[i].xyz) / uS;
      float ring = exp(-pow((r - t * 2.6) * 5.0, 2.0)) * exp(-t * 2.4);
      float core = exp(-r * r * 9.0) * exp(-t * 5.0);
      col += uImpC[i] * (ring * 1.3 + core * 1.1); a += ring * 0.6 + core * 0.6;
    }
    gl_FragColor = vec4(col, clamp(a, 0.0, 1.0));
  }`;
const SKY_VS = `varying vec3 vDir; void main(){ vDir = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }`;
const SKY_FS = `
  varying vec3 vDir;
  uniform vec3 uTop, uMid, uHor, uSunA, uSunB; uniform float uTime, uBeat, uWarp, uFlash, uSunR;
  float hash(vec3 p){ return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
  void main(){
    vec3 d = normalize(vDir); float y = d.y;
    vec3 col = mix(uMid, uTop, smoothstep(0.08, 0.7, y));
    col = mix(uHor, col, smoothstep(-0.01, 0.22, y));
    // stars, twinkling (and streaking at warp speed)
    vec3 sp = d * 160.0; vec3 c = floor(sp); float h = hash(c);
    if (h > 0.982 && y > 0.06) { vec3 f = fract(sp) - 0.5; float st = exp(-dot(f.xy, f.xy) * (40.0 / (1.0 + uWarp * 6.0))) * (0.55 + 0.45 * sin(uTime * 2.5 + h * 80.0)); col += vec3(1.0, 0.9, 1.0) * st * smoothstep(0.06, 0.3, y) * 1.4; }
    // the sun: a striped disc behind the tunnel's far end, pulsing with the beat
    vec2 q = vec2(atan(d.x, -d.z), asin(y)); q = (q - vec2(0.0, 0.03 + uSunR * 0.45)) / uSunR;
    float r = length(q), R0 = 1.0 + uBeat * 0.07 + uWarp * 0.25;
    float cut = 1.0;
    if (q.y < 0.15) { float k = clamp((0.15 - q.y) / 1.15, 0.0, 1.0); float band = fract((q.y + uTime * 0.06) * 6.5); cut = step(k * 0.62, band); }
    float disc = smoothstep(R0, R0 - 0.015, r) * cut;
    vec3 sc = mix(uSunB, uSunA, smoothstep(-0.9, 0.9, q.y));
    col = mix(col, sc * (0.72 + uBeat * 0.4 + uFlash * 2.5), disc);
    col += uSunB * exp(-max(r - R0, 0.0) * 3.2) * (0.18 + uBeat * 0.3 + uFlash) * (1.0 - disc) * step(R0, r);
    gl_FragColor = vec4(col, 1.0);
  }`;
const FLOOR_FS = `
  varying vec3 vPos;
  uniform vec3 uFA, uFB, uGrid, uHor; uniform float uTime, uScroll, uBeat, uDisco;
  uniform vec4 uRip[6];
  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  void main(){
    vec2 p = vPos.xz; p.y -= uScroll;
    float lite = 0.0; vec2 disp = vec2(0.0);
    for (int i = 0; i < 6; i++) {
      float t = uTime - uRip[i].z; if (t < 0.0 || t > 3.0) continue;
      vec2 o = vPos.xz - uRip[i].xy; float d = length(o) + 1e-3;
      float w = sin(d * 2.6 - t * 11.0) * exp(-t * 1.3) * exp(-d * 0.09) * uRip[i].w;
      disp += o / d * w * 0.35;
      lite += exp(-pow(d - t * 8.5, 2.0) * 0.45) * exp(-t * 1.1) * uRip[i].w;
    }
    p += disp;
    vec2 g = p / 1.25, w = max(fwidth(g), vec2(1e-4)) * 1.5;
    vec2 i2 = 2.0 * (abs(fract((g - 0.5 * w) * 0.5) - 0.5) - abs(fract((g + 0.5 * w) * 0.5) - 0.5)) / w;
    float ch = 0.5 - 0.5 * i2.x * i2.y;
    vec3 col = mix(uFB, uFA * (0.42 + uBeat * 0.18), ch);
    if (uDisco > 0.0) { vec2 cell = floor(g); float hh = hash(cell + floor(uTime * 2.1)); vec3 dc = 0.6 + 0.6 * cos(6.2831 * (hh + vec3(0.0, 0.33, 0.67))); col = mix(col, dc * (0.6 + uBeat), uDisco * step(0.55, hh) * ch); }
    vec2 gl = 0.5 - abs(fract(g) - 0.5); vec2 gw = max(fwidth(g), vec2(1e-4)); float ln = 1.0 - min(min(gl.x / gw.x, gl.y / gw.y), 1.0);
    col += uGrid * (ln * 0.55 + lite * 0.75);
    float dist = length(vPos.xz - cameraPosition.xz);
    col = mix(col, uHor, clamp(1.0 - exp(-dist * 0.018), 0.0, 1.0));
    gl_FragColor = vec4(col, 1.0);
  }`;
const PT_VS = `attribute float aSize; attribute float aAlpha; attribute vec3 aColor; varying float vA; varying vec3 vC; uniform float uPx, uMax;
  void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = min(aSize * uPx / max(0.15, -mv.z), uMax); vA = aAlpha; vC = aColor; }`;
const PT_FS = `varying float vA; varying vec3 vC; void main(){ vec2 c = gl_PointCoord - 0.5; float d = length(c); float a = smoothstep(0.5, 0.0, d); gl_FragColor = vec4(vC * (1.0 + 1.2 * smoothstep(0.22, 0.0, d)), a * a * vA); }`;
const FX = {
  uniforms: { tDiffuse: { value: null }, uCA: { value: 0 }, uWarp: { value: 0 }, uTime: { value: 0 }, uGlitch: { value: 0 }, uVig: { value: 0.55 }, uFlash: { value: 0 }, uFlashC: { value: new THREE.Color(1, 1, 1) } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uCA, uWarp, uTime, uGlitch, uVig, uFlash; uniform vec3 uFlashC; varying vec2 vUv;
    float hash(float n){ return fract(sin(n) * 43758.5453); }
    void main(){
      vec2 uv = vUv;
      if (uWarp > 0.0) uv += uWarp * 0.012 * vec2(sin(uv.y * 13.0 + uTime * 3.1), cos(uv.x * 11.0 + uTime * 2.3));
      if (uGlitch > 0.0) { float band = floor(uv.y * 26.0); float n = hash(band + floor(uTime * 22.0)); if (n > 0.7) uv.x += (hash(band * 1.7 + floor(uTime * 22.0)) - 0.5) * uGlitch * 0.12; }
      vec2 c = uv - 0.5; float r2 = dot(c, c);
      vec2 off = c * (0.004 + uCA * 0.07) * (0.5 + r2 * 2.0);
      vec3 col = vec3(texture2D(tDiffuse, uv + off).r, texture2D(tDiffuse, uv).g, texture2D(tDiffuse, uv - off).b);
      col *= 1.0 - uVig * r2 * 1.3;
      col += uFlashC * uFlash;
      gl_FragColor = vec4(col, 1.0);
    }`
};

// ═══ The scene ═══════════════════════════════════════════════════════════
let renderer = null, composer = null, bloom = null, fxPass = null, scene, camera, canvas, viewEl;
let BLOOM = 0.5, HW = HH, HWt = HH, viewW = 1, viewH = 1, QUAL = 2, qualLock = false;
const PAL = {}; PKEYS.forEach(k => { PAL[k] = new THREE.Color(); });
const PAL_T = {}; PKEYS.forEach(k => { PAL_T[k] = new THREE.Color(); });
let sky, floor, wallMat, walls = [], bars = {}, ball, ballGlow, orbiters = [], padP, padC, rallySign, rallyCtx, rallyTex, envTex = null;
let parts, partGeo, trail, trailGeo, lines, lineGeo, popups = [];
const tmpV = new THREE.Vector3();
function W(u, v, z, out) {
  let x = u * HW, y = v * HH;
  const a = U.twist.value * clamp(-z / L, 0, 1);
  if (a) { const c = Math.cos(a), s = Math.sin(a), x2 = x * c - y * s; y = x * s + y * c; x = x2; }
  return (out || tmpV).set(x, y, z);
}
function R() { return 0.135 * Math.sqrt(HW * HH); }   // the ball's radius (it keeps its share of the tunnel)

function setPal(i, now) {
  const P = PALS[(i - 1) % PALS.length];
  PKEYS.forEach(k => { PAL_T[k].set(P[k]); if (now) PAL[k].copy(PAL_T[k]); });
}
function makeEnv() {
  // the chrome ball's reflection: the sky, the sun and the checkered floor, painted on the six faces of a cube
  const S = 128, hex = c => '#' + c.getHexString(THREE.SRGBColorSpace);
  const face = (kind) => {
    const c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d');
    if (kind === 'up') { x.fillStyle = hex(PAL.top); x.fillRect(0, 0, S, S); x.fillStyle = '#fff'; for (let i = 0; i < 40; i++) x.fillRect(Math.random() * S, Math.random() * S, 1.5, 1.5); return c; }
    if (kind === 'down') { const n = 8; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { x.fillStyle = (i + j) % 2 ? hex(PAL.fa) : hex(PAL.fb); x.fillRect(i * S / n, j * S / n, S / n, S / n); } return c; }
    const g = x.createLinearGradient(0, 0, 0, S * 0.5); g.addColorStop(0, hex(PAL.top)); g.addColorStop(0.6, hex(PAL.mid)); g.addColorStop(1, hex(PAL.hor));
    x.fillStyle = g; x.fillRect(0, 0, S, S * 0.5);
    const n = 8; for (let i = 0; i < n; i++) for (let j = 0; j < 4; j++) { x.fillStyle = (i + j) % 2 ? hex(PAL.fa) : hex(PAL.fb); x.fillRect(i * S / n, S * 0.5 + j * S / 8, S / n, S / 8); }
    if (kind === 'sun') { const sg = x.createLinearGradient(0, S * 0.12, 0, S * 0.5); sg.addColorStop(0, hex(PAL.sunA)); sg.addColorStop(1, hex(PAL.sunB)); x.fillStyle = sg; x.beginPath(); x.arc(S / 2, S * 0.4, S * 0.26, Math.PI, 0); x.fill(); }
    return c;
  };
  const t = new THREE.CubeTexture([face('side'), face('side'), face('up'), face('down'), face('side'), face('sun')]);
  t.colorSpace = THREE.SRGBColorSpace; t.needsUpdate = true;
  if (envTex) envTex.dispose();
  envTex = t; if (ball) { ball.material.envMap = t; ball.material.needsUpdate = true; }
}
function canvasTex(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return { c, x: c.getContext('2d'), t }; }

function build() {
  canvas = document.createElement('canvas');
  renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance', stencil: false });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(60, 1, 0.05, 400);
  camera.position.set(0, 0, CAM_D);
  setPal(1, true);

  // sky
  sky = new THREE.Mesh(new THREE.SphereGeometry(300, 48, 24), new THREE.ShaderMaterial({
    uniforms: { uTop: { value: PAL.top }, uMid: { value: PAL.mid }, uHor: { value: PAL.hor }, uSunA: { value: PAL.sunA }, uSunB: { value: PAL.sunB }, uTime: U.time, uBeat: U.beat, uWarp: { value: 0 }, uFlash: { value: 0 }, uSunR: { value: 0.25 } },
    vertexShader: SKY_VS, fragmentShader: SKY_FS, side: THREE.BackSide, depthWrite: false
  }));
  sky.renderOrder = -10; scene.add(sky);
  // floor: checkers to the horizon, under the tunnel
  floor = new THREE.Mesh(new THREE.PlaneGeometry(800, 800), new THREE.ShaderMaterial({
    uniforms: { uFA: { value: PAL.fa }, uFB: { value: PAL.fb }, uGrid: { value: PAL.grid }, uHor: { value: PAL.hor }, uTime: U.time, uScroll: { value: 0 }, uBeat: U.beat, uDisco: { value: 0 },
      uRip: { value: Array.from({ length: 6 }, () => new THREE.Vector4(0, 0, -99, 0)) } },
    vertexShader: `varying vec3 vPos; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vPos = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: FLOOR_FS
  }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, -HH - 0.55, -150); floor.renderOrder = -9; scene.add(floor);
  // walls: see-through glass that the ball lights and that rings where the ball strikes
  wallMat = new THREE.ShaderMaterial({
    uniforms: { uBall: { value: new THREE.Vector3() }, uA: { value: PAL.a }, uB: { value: PAL.b }, uBallOn: { value: 0 }, uTime: U.time, uBeat: U.beat, uPulse: { value: 1 }, uS: { value: 1 }, uL: U.L, uTwist: U.twist,
      uImp: { value: Array.from({ length: 8 }, () => new THREE.Vector4(0, 0, 0, -99)) }, uImpC: { value: Array.from({ length: 8 }, () => new THREE.Color()) } },
    vertexShader: TWIST_VS + `varying vec3 vPos; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vPos = w.xyz; gl_Position = projectionMatrix * viewMatrix * twistIt(w); }`,
    fragmentShader: WALL_FS, transparent: true, depthWrite: false, side: THREE.DoubleSide, extensions: { derivatives: true }
  });
  for (let i = 0; i < 4; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1, 1, 24), wallMat); m.renderOrder = 1; walls.push(m); scene.add(m); }
  // the neon edges
  const box = new THREE.BoxGeometry(1, 1, 1), boxZ = new THREE.BoxGeometry(1, 1, 1, 1, 1, 24);
  const mk = (geo, mat, n) => Array.from({ length: n }, () => { const m = new THREE.Mesh(geo, mat); m.renderOrder = 2; scene.add(m); return m; });
  bars.matA = neonMat(PAL.a); bars.matB = neonMat(PAL.b); bars.matMid = neonMat(PAL.a, 0.28, true); bars.matRing = neonMat(PAL.b, 1, true); bars.matPulse = neonMat(PAL.a, 0.5, true);
  bars.near = mk(box, bars.matA, 4); bars.far = mk(box, bars.matB, 4); bars.long = mk(boxZ, bars.matA, 4);
  bars.mid = [mk(box, bars.matMid, 4), mk(box, bars.matMid, 4), mk(box, bars.matMid, 4)];
  bars.ring = mk(box, bars.matRing, 4); bars.pulse = mk(box, bars.matPulse, 4);
  // the ball: chrome, with a glow behind it and lights that orbit it while it curves
  makeEnv();
  ball = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), new THREE.MeshBasicMaterial({ envMap: envTex, color: 0xffffff }));
  ball.renderOrder = 5; scene.add(ball);
  const gc = canvasTex(64, 64); const gg = gc.x.createRadialGradient(32, 32, 0, 32, 32, 32); gg.addColorStop(0, 'rgba(255,255,255,1)'); gg.addColorStop(0.35, 'rgba(255,255,255,.35)'); gg.addColorStop(1, 'rgba(255,255,255,0)'); gc.x.fillStyle = gg; gc.x.fillRect(0, 0, 64, 64); gc.t.needsUpdate = true;
  ballGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: gc.t, color: PAL.b, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.35 }));
  ballGlow.renderOrder = 4; scene.add(ballGlow);
  for (let i = 0; i < 5; i++) { const o = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color().setHSL(i / 5, 1, 0.6).multiplyScalar(1.5) })); o.visible = false; scene.add(o); orbiters.push(o); }
  // your paddle: a see-through frame with a crosshair
  padP = new THREE.Group();
  const pm = new THREE.MeshBasicMaterial({ color: PAL.pad.clone().multiplyScalar(HDR.pad) });
  const pf = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: PAL.pad, transparent: true, opacity: 0.13, depthWrite: false }));
  padP.add(pf); padP.userData = { fill: pf, mat: pm, bars: [0, 1, 2, 3, 4, 5].map(() => { const m = new THREE.Mesh(box, pm); padP.add(m); return m; }) };
  padP.renderOrder = 6; scene.add(padP);
  // the computer's paddle: a solid glowing square at the far end
  padC = new THREE.Group();
  const cfill = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), neonMat(PAL.cpu, 0.82));
  const cm = neonMat(PAL.cpu);
  padC.add(cfill); padC.userData = { fill: cfill, mat: cm, bars: [0, 1, 2, 3].map(() => { const m = new THREE.Mesh(box, cm); padC.add(m); return m; }) };
  scene.add(padC);
  // the rally count, glowing in the air down the tunnel
  const rs = canvasTex(512, 256); rallyCtx = rs; rallyTex = rs.t;
  rallySign = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.5), new THREE.MeshBasicMaterial({ map: rs.t, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.85 }));
  rallySign.renderOrder = 3; scene.add(rallySign);
  // particles and the ball's trail
  const ptMat = () => new THREE.ShaderMaterial({ uniforms: { uPx: { value: 500 }, uMax: { value: 64 } }, vertexShader: PT_VS, fragmentShader: PT_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  partGeo = pointsGeo(P_N); parts = new THREE.Points(partGeo, ptMat()); parts.frustumCulled = false; parts.renderOrder = 7; scene.add(parts);
  trailGeo = pointsGeo(T_N); trail = new THREE.Points(trailGeo, ptMat()); trail.frustumCulled = false; trail.renderOrder = 4; scene.add(trail);
  // speed lines (warp speed, and fast rallies)
  lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(LN * 6), 3));
  lineGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(LN * 6), 3));
  lines = new THREE.LineSegments(lineGeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 }));
  lines.frustumCulled = false; scene.add(lines);
  for (let i = 0; i < LN; i++) SL.push({ a: Math.random() * 6.283, r: 1.2 + Math.random() * 7, z: -Math.random() * 60, len: 1 + Math.random() * 3, h: Math.random() });
  // words in the air
  for (let i = 0; i < 6; i++) { const t = canvasTex(512, 160); const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t.t, transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending })); s.visible = false; s.renderOrder = 20; scene.add(s); popups.push({ s, c: t, life: 0 }); }
  // post: bloom, then chromatic aberration, wobble, glitch and flash
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.5, 0.35, 0.86);
  composer.addPass(bloom);
  fxPass = new ShaderPass(FX); composer.addPass(fxPass);
  composer.addPass(new OutputPass());
}
const P_N = 520, T_N = 44, LN = 140, SL = [];
const PS = []; for (let i = 0; i < P_N; i++) PS.push({ life: 0 });
function pointsGeo(n) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  g.setAttribute('aColor', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  g.setAttribute('aSize', new THREE.BufferAttribute(new Float32Array(n), 1));
  g.setAttribute('aAlpha', new THREE.BufferAttribute(new Float32Array(n), 1));
  return g;
}
function bar(m, x1, y1, z1, x2, y2, z2, t) {
  m.position.set((x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2);
  m.scale.set(Math.abs(x2 - x1) + t, Math.abs(y2 - y1) + t, Math.abs(z2 - z1) + t);
}
function frame4(list, hw, hh, z, t) {
  bar(list[0], -hw, hh, z, hw, hh, z, t); bar(list[1], -hw, -hh, z, hw, -hh, z, t);
  bar(list[2], -hw, -hh, z, -hw, hh, z, t); bar(list[3], hw, -hh, z, hw, hh, z, t);
}
// lay the tunnel out at its current width
let laidHW = 0;
function placeTunnel() {
  if (Math.abs(laidHW - HW) < 1e-4) return; laidHW = HW;
  const t = 0.032;
  frame4(bars.near, HW, HH, 0, t * 1.4); frame4(bars.far, HW, HH, -L, t * 0.9);
  bar(bars.long[0], -HW, HH, 0, -HW, HH, -L, t); bar(bars.long[1], HW, HH, 0, HW, HH, -L, t);
  bar(bars.long[2], -HW, -HH, 0, -HW, -HH, -L, t); bar(bars.long[3], HW, -HH, 0, HW, -HH, -L, t);
  bars.mid.forEach((r, i) => frame4(r, HW, HH, -L * (i + 1) / 4, t * 0.5));
  // walls: floor, ceiling, left, right
  walls[0].rotation.set(-Math.PI / 2, 0, 0); walls[0].position.set(0, -HH, -L / 2); walls[0].scale.set(2 * HW, L, 1);
  walls[1].rotation.set(Math.PI / 2, 0, 0); walls[1].position.set(0, HH, -L / 2); walls[1].scale.set(2 * HW, L, 1);
  walls[2].rotation.set(0, Math.PI / 2, 0); walls[2].position.set(-HW, 0, -L / 2); walls[2].scale.set(L, 2 * HH, 1);
  walls[3].rotation.set(0, -Math.PI / 2, 0); walls[3].position.set(HW, 0, -L / 2); walls[3].scale.set(L, 2 * HH, 1);
  wallMat.uniforms.uS.value = Math.sqrt(HW * HH) / 1.5;
  // the paddles' frames
  const pw = PU * HW, ph = PV * HH, pt = 0.042;
  const pb = padP.userData.bars; padP.userData.fill.scale.set(2 * pw, 2 * ph, 1);
  bar(pb[0], -pw, ph, 0, pw, ph, 0, pt * 1.3); bar(pb[1], -pw, -ph, 0, pw, -ph, 0, pt * 1.3); bar(pb[2], -pw, -ph, 0, -pw, ph, 0, pt * 1.3); bar(pb[3], pw, -ph, 0, pw, ph, 0, pt * 1.3);
  const cs = Math.min(pw, ph) * 0.42; bar(pb[4], -cs, 0, 0, cs, 0, 0, pt * 0.8); bar(pb[5], 0, -cs, 0, 0, cs, 0, pt * 0.8);
  const cb = padC.userData.bars; padC.userData.fill.scale.set(2 * pw, 2 * ph, 1);
  bar(cb[0], -pw, ph, 0, pw, ph, 0, pt); bar(cb[1], -pw, -ph, 0, pw, -ph, 0, pt); bar(cb[2], -pw, -ph, 0, -pw, ph, 0, pt); bar(cb[3], pw, -ph, 0, pw, ph, 0, pt);
  rallySign.scale.set(HH * 1.1, HH * 1.1, 1);
  floor.position.y = -HH - 0.55;
}

// ═══ Game state ══════════════════════════════════════════════════════════
let G = null, on = false, paused = false, hold = false, raf = 0, lastT = 0, acc = 0, cfg0 = null, opts = {};
let hudEl, ovEl, tipEl, plates = {}, Mus = null;
const B = { u: 0, v: 0, z: 0, vu: 0, vv: 0, vz: 0, su: 0, sv: 0, held: true, checked: false, hits: 0, curve: 0, gone: false };
const P = { u: 0, v: 0, tu: 0, tv: 0, vu: 0, vv: 0, flash: 0, pop: 0 };
const C = { u: 0, v: 0, vu: 0, vv: 0, tu: 0, tv: 0, next: 0, eu: 0, ev: 0, shot: -1, flash: 0 };
const FXS = { shake: 0, ca: 0, glitch: 0, flash: 0, flashC: new THREE.Color(1, 1, 1), punch: 0, sunFlash: 0, warp: 0, disco: 0, scroll: 0, beat: 0, pulse: 1, lastPulse: 0, imp: 0, rip: 0, roll: 0 };
const TR = []; for (let i = 0; i < T_N; i++) TR.push({ x: 0, y: 0, z: 0, on: 0 });
let trailHead = 0, trailT = 0;

function D() { return DIFF[G.diff] || DIFF.normal; }
function lvlF(k) { return Math.pow(k, G.lvl - 1); }
function VZ() { return Math.min(14.5, 7 * (1 + 0.075 * (G.lvl - 1))); }
function myName() { return (G.players[0] && G.players[0].name) || 'You'; }
function botName() { return (G.players[1] && G.players[1].name) || 'the computer'; }
function freshStats() { return { hits: 0, curves: 0, big: 0, longest: 0, perfect: 0, extra: 0, cpuMiss: 0, lp: [], lm: [], bestCurve: 0, pb: 0 }; }
function newGame(o) {
  G = { diff: DIFF[o.diff] ? o.diff : 'normal', players: o.players && o.players.length ? o.players : [{ name: 'You' }, { name: 'Computer', cpu: true }],
    lvl: 1, score: 0, lives: LIVES, pts: 0, miss: 0, lvlScore: 0, phase: 'serve', t: 0, rally: 0, serves: 0, started: Date.now(), st: freshStats(), best0: 0, pbShown: false, queue: [], warpAt: 0 };
  try { G.best0 = window.ArcadeHi ? ArcadeHi.best(BOARD) : 0; } catch (e) {}
  if (o.saved) {
    const s = o.saved;
    Object.assign(G, { lvl: s.lvl || 1, score: s.score || 0, lives: s.lives || 1, pts: s.pts || 0, miss: s.miss || 0, lvlScore: s.lvlScore || 0, started: s.started || Date.now(), st: Object.assign(freshStats(), s.st || {}) });
    if (s.best0 != null) G.best0 = s.best0;
    G.pbShown = !!s.pbShown;
  }
}
function save() {
  if (!G || G.phase === 'over' || G.done) return;
  const s = { v: 2, tunnel: 1, diff: G.diff, players: G.players, lvl: G.lvl, score: G.score, lives: G.lives, pts: G.pts, miss: G.miss, lvlScore: G.lvlScore, started: G.started, st: G.st, best0: G.best0, pbShown: G.pbShown };
  try { localStorage.setItem(SAVE, JSON.stringify(s)); } catch (e) {}
  Kit.resume.set('Tunnel, level ' + G.lvl);
}
function clearSave() { try { localStorage.removeItem(SAVE); } catch (e) {} Kit.resume.clear(); }
function loadSaved() { try { const s = JSON.parse(localStorage.getItem(SAVE)); return s && s.v === 2 && s.tunnel ? s : null; } catch (e) { return null; } }

// ── Serve
function readyServe() {
  G.phase = 'serve'; G.t = 0; G.rally = 0;
  Object.assign(B, { held: true, checked: false, gone: false, su: 0, sv: 0, vu: 0, vv: 0, vz: 0, curve: 0 });
  C.next = 0; C.shot = -1;
  TR.forEach(p => { p.on = 0; });
  save();
  hudDirty = true;
  if (tipEl) { tipEl.textContent = TOUCH ? 'Tap to serve' : 'Click to serve'; tipEl.classList.toggle('show', G.serves < 3); }
}
function serve() {
  if (!G || G.phase !== 'serve') return;
  ac();
  const sf = 1;
  B.held = false; B.vz = -VZ();
  B.vu = clamp((Math.random() - 0.5) * 0.5 - P.vu * 0.1, -1.2, 1.2) * sf; B.vv = clamp((Math.random() - 0.5) * 0.4 - P.vv * 0.1, -1, 1) * sf;
  spinFromPaddle();
  G.phase = 'play'; G.t = 0; G.serves++; B.hits = 0;
  if (tipEl) tipEl.classList.remove('show');
  snd.serve(); Kit.haptic('light');
  P.pop = 1;
}
function spinFromPaddle() {
  // (a faster ball has less time to bend, so its curve is stronger: the same swing bends it as far at every level)
  const k = Math.pow(Math.max(1, Math.abs(B.vz) / 7), 1.5);
  const su = clamp(P.vu * 0.5, -2.3, 2.3), sv = clamp(P.vv * 0.5, -2.3, 2.3);
  B.su = su * k; B.sv = sv * k;
  B.vu = clamp(B.vu - P.vu * 0.1, -2.6, 2.6); B.vv = clamp(B.vv - P.vv * 0.1, -2.6, 2.6);
  B.curve = Math.hypot(su, sv);
}

// ── One step of play
function step(dt) {
  G.t += dt;
  movePaddle(dt);
  cpuThink(dt); moveCpu(dt);
  if (G.phase === 'serve') {
    const r = R(); B.u = P.u; B.v = P.v; B.z = -r - 0.03;
    if (G.t > 4 && !hold) serve();   // it goes on its own after a while
    return;
  }
  if (G.phase === 'play' || G.phase === 'point' || G.phase === 'miss') {
    moveBall(dt);
    // the trail keeps where the ball has been, in game time
    trailT += dt;
    if (!B.gone && trailT > 1 / 90) { trailT = 0; const p = TR[trailHead]; W(B.u, B.v, B.z, tmpV); p.x = tmpV.x; p.y = tmpV.y; p.z = tmpV.z; p.on = 1; p.c = B.curve; trailHead = (trailHead + 1) % T_N; }
  }
  if (G.phase === 'point' && G.t > 1.25) { if (G.pts >= NEED) startWarp(); else readyServe(); }
  if (G.phase === 'miss' && G.t > 1.5) { if (G.lives <= 0) gameOver(); else readyServe(); }
  if (G.phase === 'warp') { if (G.t > 2.5) endWarp(); }
}
function rU() { return R() / HW; }
function rV() { return R() / HH; }
function moveBall(dt) {
  if (B.gone) return;
  const ru = rU(), rv = rV();
  B.vu += B.su * dt; B.vv += B.sv * dt;
  const k = Math.exp(-SPIN_DECAY * dt); B.su *= k; B.sv *= k;
  B.u += B.vu * dt; B.v += B.vv * dt; B.z += B.vz * dt;
  const inside = B.z > -L - 0.2 && B.z < 0.1;
  if (inside) {
    if (B.u > 1 - ru) { B.u = 1 - ru; B.vu = -Math.abs(B.vu); B.su = -B.su * 0.5; wallHit(3); }
    else if (B.u < -1 + ru) { B.u = -1 + ru; B.vu = Math.abs(B.vu); B.su = -B.su * 0.5; wallHit(2); }
    if (B.v > 1 - rv) { B.v = 1 - rv; B.vv = -Math.abs(B.vv); B.sv = -B.sv * 0.5; wallHit(1); }
    else if (B.v < -1 + rv) { B.v = -1 + rv; B.vv = Math.abs(B.vv); B.sv = -B.sv * 0.5; wallHit(0); }
  }
  const r = R();
  if (G.phase !== 'play') {   // after a point the ball flies on: into the sun, or out at you
    if (G.phase === 'miss' && B.z > CAM_D - 0.5 && !B.gone) { B.gone = true; smash(); }
    if (G.phase === 'point' && B.z < -L - 9 && !B.gone) { B.gone = true; }
    return;
  }
  // your end
  if (B.vz > 0 && B.z >= -r && !B.checked) {
    B.checked = true;
    if (Math.abs(B.u - P.u) <= PU + ru * 0.8 && Math.abs(B.v - P.v) <= PV + rv * 0.8) { youHit(); return; }
  }
  if (B.vz > 0 && B.z > 0.35) { youMiss(); return; }
  // the computer's end
  if (B.vz < 0 && B.z <= -L + r && !B.checked) {
    B.checked = true;
    if (Math.abs(B.u - C.u) <= PU + ru * 0.8 && Math.abs(B.v - C.v) <= PV + rv * 0.8) { cpuHit(); return; }
  }
  if (B.vz < 0 && B.z < -L - 0.4) cpuMiss();
}
function wallHit(i) {
  const tw = U.twist.value * clamp(-B.z / L, 0, 1);
  // the wall rings where the ball struck it
  const x = i === 2 ? -HW : i === 3 ? HW : B.u * HW, y = i === 0 ? -HH : i === 1 ? HH : B.v * HH;
  const imp = wallMat.uniforms.uImp.value[FXS.imp % 8], ic = wallMat.uniforms.uImpC.value[FXS.imp % 8]; FXS.imp++;
  imp.set(x, y, B.z, U.time.value); ic.copy(i % 2 ? PAL.b : PAL.a).multiplyScalar(1.2);
  snd.wall(i, G.lvl);
  W(B.u, B.v, B.z, tmpV);
  burst(tmpV.x, tmpV.y, tmpV.z, 7, i % 2 ? PAL.b : PAL.a, 1.4, 0.06);
  if (i === 0) ripple(x, B.z, 0.7);
  void tw;
}
function hitSpeed() { return VZ() * (1 + 0.032 * Math.min(G.rally, 20)); }
function latScale(vz) { return Math.pow(Math.abs(vz) / 7, 0.6); }
function youHit() {
  const du = clamp((B.u - P.u) / PU, -1.2, 1.2), dv = clamp((B.v - P.v) / PV, -1.2, 1.2);
  const vz = hitSpeed(), ls = latScale(vz);
  B.vz = -vz; B.vu = du * 1.2 * ls; B.vv = dv * 1.2 * ls;
  spinFromPaddle();
  B.z = -R(); B.checked = false; B.hits++;
  G.rally++; G.st.hits++; if (G.rally > G.st.longest) G.st.longest = G.rally;
  const M = MUL[G.diff] || 1; let pts = (10 + 2 * Math.min(G.rally, 25)) * M;
  const cv = B.curve; let word = '';
  if (cv >= BIG_CURVE) { G.st.big++; G.st.curves++; pts += 75 * M; word = 'BIG CURVE!'; }
  else if (cv >= CURVE) { G.st.curves++; pts += 25 * M; word = 'CURVE!'; }
  if (cv > G.st.bestCurve) G.st.bestCurve = Math.round(cv * 100) / 100;
  addScore(pts);
  // what a hit looks, sounds and feels like
  P.flash = 1; P.pop = 1;
  FXS.punch = Math.min(1, 0.35 + cv * 0.3); FXS.shake = Math.max(FXS.shake, cv >= BIG_CURVE ? 0.5 : 0.12);
  W(B.u, B.v, B.z, tmpV);
  burst(tmpV.x, tmpV.y, tmpV.z, cv >= CURVE ? 34 : 18, PAL.pad, 2.6, 0.08);
  if (cv >= CURVE) burst(tmpV.x, tmpV.y, tmpV.z, 22, null, 3.4, 0.07);   // rainbow sparks
  ripple(B.u * HW, -0.5, cv >= BIG_CURVE ? 1.6 : 0.9);
  snd.hit(G.rally, cv * Math.sign(B.su + B.sv || 1));
  Kit.haptic(cv >= BIG_CURVE ? 'heavy' : cv >= CURVE ? 'medium' : 'light');
  if (word) { popup(word, clamp(B.u, -0.5, 0.5), clamp(B.v + 0.45, -0.6, 0.75), -2.6, cv >= BIG_CURVE ? '#ffffff' : null, cv >= BIG_CURVE ? 1.2 : 0.9, true); }
  popup('+' + fmt(pts), clamp(B.u, -0.6, 0.6), clamp(B.v + 0.55, -0.6, 0.85), -1.6, '#' + PAL.pad.getHexString(THREE.SRGBColorSpace), 0.5);
  if (cv >= BIG_CURVE && G.st.big === 1) G.queue.push({ title: 'Big curve', line: 'Your swing bent that shot right across the tunnel.', icon: 'sparkle' });
  rallyMilestone();
  C.next = 0;
}
function rallyMilestone() {
  const r = G.rally;
  rallyBump = 1; rallyDirty = true;
  if (r === 10 || r === 20 || r === 30 || r === 50 || r === 75 || r === 100) {
    popup(r + ' HIT RALLY!', 0, 0.35, -L * 0.45, '#ffffff', 1.5, true);
    FXS.disco = Math.max(FXS.disco, 1); FXS.flash = 0.35; FXS.flashC.copy(PAL.b);
    Kit.sfx('sparkle'); Kit.haptic('success');
    for (let i = 0; i < 4; i++) ripple((Math.random() - 0.5) * 8, -2 - Math.random() * 8, 1.4);
    G.queue.push({ title: r + '-hit rally', line: 'The ball has gone back and forth ' + r + ' times without a miss.', chip: String(r) });
  }
}
function cpuHit() {
  const d = D();
  const du = clamp((B.u - C.u) / PU, -1.2, 1.2), dv = clamp((B.v - C.v) / PV, -1.2, 1.2);
  const vz = hitSpeed(), ls = latScale(vz);
  B.vz = vz; B.vu = du * 1.05 * ls; B.vv = dv * 1.05 * ls;
  B.su = 0; B.sv = 0;
  // the computer aims away from your paddle, and from level 2 puts curve on some shots
  if (d.aim) { B.vu += (P.u > 0 ? -1 : 1) * d.aim * ls * (0.5 + Math.random() * 0.5); B.vv += (P.v > 0 ? -1 : 1) * d.aim * 0.6 * ls * Math.random(); }
  if (G.lvl >= 2 && Math.random() < d.spinP + 0.04 * (G.lvl - 2)) {
    const m = d.spin * Math.min(1, 0.4 + (G.lvl - 2) * 0.15) * (0.6 + Math.random() * 0.5), a = Math.random() * 6.283;
    B.su = Math.cos(a) * m; B.sv = Math.sin(a) * m;
  }
  B.vu = clamp(B.vu, -2.6, 2.6); B.vv = clamp(B.vv, -2.6, 2.6);
  B.curve = Math.hypot(B.su, B.sv);
  B.z = -L + R(); B.checked = false; B.hits++;
  G.rally++; if (G.rally > G.st.longest) G.st.longest = G.rally;
  C.flash = 1; rallyBump = 1; rallyDirty = true;
  W(B.u, B.v, B.z, tmpV); burst(tmpV.x, tmpV.y, tmpV.z, 14, PAL.cpu, 2.2, 0.12);
  snd.cpu();
}
function youMiss() {
  G.phase = 'miss'; G.t = 0; G.lives--; G.miss++;
  // the ball comes out of the tunnel at you
  B.vz = Math.max(B.vz, 9); B.su = B.sv = 0;
  FXS.ca = 1.2; FXS.glitch = 1; FXS.shake = 0.9; FXS.flash = 0.25; FXS.flashC.set(1, 0.1, 0.2);
  snd.miss(); Kit.haptic('error');
  hudDirty = true; livesAnim = 'lose';
  if (G.lives > 0) popup(G.lives === 1 ? 'LAST BALL' : G.lives + ' BALLS LEFT', 0, 0.1, -L * 0.3, '#ff5a7a', 1.05, true);
}
function smash() {
  // the ball hits the glass in front of you
  FXS.ca = 1.6; FXS.glitch = 1.2; FXS.shake = 1.1; FXS.flash = 0.5;
  burst(B.u * HW * 0.5, B.v * HH * 0.5, CAM_D - 0.9, 70, null, 4.5, 0.05);
  snd.boom();
}
function cpuMiss() {
  G.phase = 'point'; G.t = 0; G.pts++; G.st.cpuMiss++;
  const M = MUL[G.diff] || 1, pts = 100 * G.lvl * M;
  addScore(pts);
  FXS.sunFlash = 1; FXS.flash = 0.3; FXS.flashC.copy(PAL.sunA); FXS.shake = 0.35;
  W(B.u, B.v, -L, tmpV);
  burst(tmpV.x, tmpV.y, -L - 1, 90, null, 5.5, 0.12);
  burst(tmpV.x, tmpV.y, -L - 1, 40, PAL.sunA, 3.5, 0.18);
  for (let i = 0; i < 3; i++) ripple((Math.random() - 0.5) * 6, -L - 2 - i * 3, 1.5);
  popup('+' + fmt(pts), B.u, B.v, -L * 0.6, '#' + PAL.sunA.getHexString(THREE.SRGBColorSpace), 1.3, true);
  snd.point(); Kit.haptic('success');
  hudDirty = true; pipsAnim = true;
  if (G.rally >= 10) {}   // (the rally's moment was shown when it reached 10)
}
function startWarp() {
  // level cleared: points, then warp speed down the tunnel to the next level
  const M = MUL[G.diff] || 1, perfect = G.miss === 0;
  let bonus = 250 * G.lvl * M; if (perfect) { bonus += 500 * G.lvl * M; G.st.perfect++; }
  addScore(bonus);
  G.st.lp.push(Math.round(G.lvlScore)); G.st.lm.push(Math.min(9, G.miss));
  G.phase = 'warp'; G.t = 0; G.warpAt = U.time.value;
  const extra = G.lvl % 3 === 0 && G.lives < MAX_LIVES;
  lastMoment = performance.now();
  Kit.moment({ title: perfect ? 'Perfect level ' + G.lvl : 'Level ' + G.lvl + ' cleared', line: perfect ? 'You cleared level ' + G.lvl + ' without missing a single ball.' + (extra ? ' You earn an extra ball too.' : '') : extra ? 'You earn an extra ball for clearing level ' + G.lvl + '.' : 'Level ' + (G.lvl + 1) + ' is faster, and the computer gets sharper.', pts: '+' + fmt(bonus), color: '#' + PAL.a.getHexString(THREE.SRGBColorSpace), at: viewEl, ms: 2300 });
  if (perfect) { Kit.sfx('win'); } else Kit.sfx('good');
  if (extra) { G.lives++; G.st.extra++; livesAnim = 'gain'; setTimeout(() => snd.life(), 900); }
  snd.warp(); Kit.haptic('success');
  setPal(G.lvl + 1);
  hudDirty = true;
}
function endWarp() {
  G.lvl++; G.pts = 0; G.miss = 0; G.lvlScore = 0;
  PKEYS.forEach(k => PAL[k].copy(PAL_T[k])); palDirty = true;
  FXS.flash = 0.8; FXS.flashC.set(1, 1, 1);
  hudDirty = true;
  readyServe();
  popup('LEVEL ' + G.lvl, 0, 0.62, -L * 0.45, '#' + PAL.a.getHexString(THREE.SRGBColorSpace), 1.5, true);
}
function addScore(n) {
  G.score += n; G.lvlScore += n; hudDirty = true; scoreBump = true;
  // passing your own best is a moment (once a game, once the board has a real score to beat)
  if (!G.pbShown && G.best0 >= 500 && G.score > G.best0) {
    G.pbShown = true; G.st.pb = 1;
    popup('NEW BEST!', 0, 0.5, -L * 0.4, '#ffd34d', 1.6, true);
    FXS.disco = 1; Kit.sfx('win');
    G.queue.push({ title: 'New personal best', line: 'You just passed your best Tunnel score, ' + fmt(G.best0) + ' points.', icon: 'trophy' });
  }
}
function gameOver() {
  G.phase = 'over'; G.t = 0;
  FXS.ca = 0.8; FXS.glitch = 0.6;
  Kit.sfx('lose');
  setTimeout(finish, 1100);
}

// ── Your paddle
function movePaddle(dt) {
  if (keys[0] || keys[1]) { P.tu = clamp(P.tu + keys[0] * 2.4 * dt, -1 + PU, 1 - PU); P.tv = clamp(P.tv + keys[1] * 2.4 * dt, -1 + PV, 1 - PV); }
  const pu = P.u, pv = P.v, mx = 40 * dt;
  P.u += clamp(P.tu - P.u, -mx, mx); P.v += clamp(P.tv - P.v, -mx, mx);
  P.vu = P.vu * 0.75 + ((P.u - pu) / dt) * 0.25; P.vv = P.vv * 0.75 + ((P.v - pv) / dt) * 0.25;
}
// ── The computer
function predict(read) {
  let u = B.u, v = B.v, z = B.z, vu = B.vu, vv = B.vv, su = B.su * read, sv = B.sv * read;
  const ru = rU(), rv = rV(), zt = -L + R(), dt = 1 / 60;
  for (let i = 0; i < 600 && z > zt; i++) {
    vu += su * dt; vv += sv * dt; const k = Math.exp(-SPIN_DECAY * dt); su *= k; sv *= k;
    u += vu * dt; v += vv * dt; z += B.vz * dt;
    if (u > 1 - ru) { u = 1 - ru; vu = -Math.abs(vu); su = -su * 0.5; } else if (u < -1 + ru) { u = -1 + ru; vu = Math.abs(vu); su = -su * 0.5; }
    if (v > 1 - rv) { v = 1 - rv; vv = -Math.abs(vv); sv = -sv * 0.5; } else if (v < -1 + rv) { v = -1 + rv; vv = Math.abs(vv); sv = -sv * 0.5; }
  }
  return [u, v];
}
function cpuThink(dt) {
  const d = D();
  C.next -= dt; if (C.next > 0) return;
  const react = Math.max(0.07, d.react * lvlF(0.97));
  C.next = react * (0.8 + Math.random() * 0.45);
  if (G.phase !== 'play' || B.vz >= 0) { C.tu = B.u * 0.3; C.tv = B.v * 0.3; return; }
  const read = Math.min(0.8, d.read + 0.025 * (G.lvl - 1));
  if (C.shot !== B.hits) {   // a new shot: its first guess is off by a little (more for a fast, curving ball)
    C.shot = B.hits;
    const err = d.err * lvlF(0.96) * (0.6 + 0.3 * Math.hypot(B.vu, B.vv) + 0.9 * B.curve * (1 - read));
    C.eu = randn() * err; C.ev = randn() * err;
  } else { C.eu *= d.settle; C.ev *= d.settle; }
  const p = predict(read);
  C.tu = clamp(p[0] + C.eu, -1 + PU * 0.6, 1 - PU * 0.6); C.tv = clamp(p[1] + C.ev, -1 + PV * 0.6, 1 - PV * 0.6);
}
function moveCpu(dt) {
  const d = D(), top = d.speed * Math.min(1.6, 1 + 0.06 * (G.lvl - 1)), acc2 = d.accel * Math.min(1.6, 1 + 0.06 * (G.lvl - 1));
  const want = (t, c) => clamp((t - c) * 8, -top, top);
  C.vu += clamp(want(C.tu, C.u) - C.vu, -acc2 * dt, acc2 * dt); C.vv += clamp(want(C.tv, C.v) - C.vv, -acc2 * dt, acc2 * dt);
  C.u = clamp(C.u + C.vu * dt, -1 + PU, 1 - PU); C.v = clamp(C.v + C.vv * dt, -1 + PV, 1 - PV);
}

// ═══ Effects ═════════════════════════════════════════════════════════════
const tmpC = new THREE.Color();
function burst(x, y, z, n, col, sp, size) {
  if (QUAL === 0) n = Math.ceil(n / 2);
  for (let i = 0; i < n; i++) {
    let p = null; for (let j = 0; j < 12; j++) { const q = PS[(pHead + j) % P_N]; if (q.life <= 0) { p = q; pHead = (pHead + j + 1) % P_N; break; } }
    if (!p) { p = PS[pHead]; pHead = (pHead + 1) % P_N; }
    const a = Math.random() * 6.283, b = Math.acos(2 * Math.random() - 1), s = sp * (0.3 + Math.random() * 0.7);
    p.x = x; p.y = y; p.z = z; p.vx = Math.sin(b) * Math.cos(a) * s; p.vy = Math.sin(b) * Math.sin(a) * s; p.vz = Math.cos(b) * s;
    p.life = p.max = 0.45 + Math.random() * 0.6; p.size = size * (0.6 + Math.random() * 0.8);
    if (col) { p.r = col.r * 2; p.g = col.g * 2; p.b = col.b * 2; } else { tmpC.setHSL(Math.random(), 1, 0.6); p.r = tmpC.r * 2.2; p.g = tmpC.g * 2.2; p.b = tmpC.b * 2.2; }
  }
}
let pHead = 0;
function ripple(x, z, amp) { const r = floor.material.uniforms.uRip.value[FXS.rip % 6]; FXS.rip++; r.set(x, z, U.time.value, amp); }
function popup(text, u, v, z, color, scale, big) {
  const p = popups.reduce((a, b) => (a.life < b.life ? a : b));
  const c = p.c, x = c.x; x.clearRect(0, 0, 512, 160);
  const face = '"GN Display", "Schibsted Grotesk", sans-serif';
  x.font = 'italic 900 92px ' + face; x.textAlign = 'center'; x.textBaseline = 'middle';
  let fs = 92; while (x.measureText(text).width > 470 && fs > 30) { fs -= 6; x.font = 'italic 900 ' + fs + 'px ' + face; }
  const col = color || '#' + PAL.b.getHexString(THREE.SRGBColorSpace);
  x.shadowColor = col; x.shadowBlur = 9; x.fillStyle = col; x.globalAlpha = 0.8; x.fillText(text, 256, 84);
  x.shadowBlur = 0; x.globalAlpha = 0.45; x.fillStyle = '#fff'; x.fillText(text, 256, 84); x.globalAlpha = 1;
  c.t.needsUpdate = true;
  W(u, v, z, tmpV); p.s.position.copy(tmpV); p.base = tmpV.clone(); p.life = p.max = big ? 1.5 : 0.9; p.scale = (scale || 1) * Math.min(HH, HW * 1.3) * 0.55; p.s.visible = true; p.s.material.color.setScalar(big ? 0.78 : 0.62);   // (bright enough to glow, never to white out)
}

// ═══ Input ═══════════════════════════════════════════════════════════════
const ptrs = {}; let keys = [0, 0]; const down = {};
function rollXY(x, y) { const r = -FXS.roll, c = Math.cos(r), s = Math.sin(r); return [x * c - y * s, x * s + y * c]; }
function fovV() {
  const r = Math.abs(FXS.roll), c = Math.cos(r), s = Math.sin(r), hh = HH * c + HW * s, hw = HW * c + HH * s;
  return 2 * Math.atan(Math.max(hh, hw / camera.aspect) * FIT / CAM_D);
}
function screenToUV(cx, cy) {
  const r = canvas.getBoundingClientRect(), nx = ((cx - r.left) / r.width) * 2 - 1, ny = -(((cy - r.top) / r.height) * 2 - 1);
  const th = Math.tan(fovV() / 2) * CAM_D, xy = rollXY(nx * th * camera.aspect, ny * th);
  return [xy[0] / HW, xy[1] / HH];
}
function setTarget(u, v) { P.tu = clamp(u, -1 + PU, 1 - PU); P.tv = clamp(v, -1 + PV, 1 - PV); }
function bindInput() {
  viewEl.addEventListener('pointerdown', e => {
    if (e.target.closest('.pt-ov')) return;
    e.preventDefault(); ac();
    if (!G || paused) return;
    try { viewEl.setPointerCapture(e.pointerId); } catch (er) {}
    ptrs[e.pointerId] = { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, t0: performance.now(), moved: false, type: e.pointerType };
    if (e.pointerType === 'mouse') { const q = screenToUV(e.clientX, e.clientY); setTarget(q[0], q[1]); }
  });
  viewEl.addEventListener('pointermove', e => {
    if (!G || paused) return;
    const d = ptrs[e.pointerId];
    if (e.pointerType === 'mouse') { const q = screenToUV(e.clientX, e.clientY); setTarget(q[0], q[1]); if (d && Math.hypot(e.clientX - d.x0, e.clientY - d.y0) > 8) d.moved = true; return; }
    if (!d) return;
    e.preventDefault();
    // a finger anywhere moves the paddle by how far it slides (a little more, so a thumb can cross the tunnel),
    // so the finger never has to cover the paddle or the ball
    const th = Math.tan(fovV() / 2) * CAM_D, k = (2 * th / viewH) * 1.35, xy = rollXY((e.clientX - d.x) * k, -(e.clientY - d.y) * k);
    setTarget(P.tu + xy[0] / HW, P.tv + xy[1] / HH);
    d.x = e.clientX; d.y = e.clientY;
    if (Math.hypot(e.clientX - d.x0, e.clientY - d.y0) > 12) d.moved = true;
  });
  const up = e => {
    const d = ptrs[e.pointerId]; if (!d) return; delete ptrs[e.pointerId];
    if (!G || paused) return;
    if (!d.moved && performance.now() - d.t0 < 400) serve();
    else if (d.type === 'mouse') serve();
  };
  viewEl.addEventListener('pointerup', up);
  viewEl.addEventListener('pointercancel', e => { delete ptrs[e.pointerId]; });
  viewEl.addEventListener('touchmove', e => { e.preventDefault(); }, { passive: false });
}
const KMAP = { ArrowLeft: [0, -1], a: [0, -1], A: [0, -1], ArrowRight: [0, 1], d: [0, 1], D: [0, 1], ArrowUp: [1, 1], w: [1, 1], W: [1, 1], ArrowDown: [1, -1], s: [1, -1], S: [1, -1] };
function keyDir() { keys = [0, 0]; for (const k in down) if (down[k] && KMAP[k]) keys[KMAP[k][0]] += KMAP[k][1]; keys = keys.map(v => clamp(v, -1, 1)); }
document.addEventListener('keydown', e => {
  if (!on || document.querySelector('.k-scrim, .k-win, .ahi-overlay')) return;
  const k = e.key;
  if (k === 'p' || k === 'P' || k === 'Escape') { e.preventDefault(); if (paused) resume(); else pause(); return; }
  if (paused) { if (k === 'Enter' || k === ' ') { e.preventDefault(); resume(); } return; }
  if (k === ' ' || k === 'Enter') { e.preventDefault(); serve(); return; }
  if (KMAP[k]) { e.preventDefault(); ac(); down[k] = true; keyDir(); }
});
document.addEventListener('keyup', e => { if (down[e.key]) { down[e.key] = false; keyDir(); } });
document.addEventListener('visibilitychange', () => { if (!on) return; if (document.hidden) pause(); });
window.addEventListener('blur', () => { if (on) pause(); });
window.addEventListener('pagehide', () => { if (on) save(); });

// ═══ View ════════════════════════════════════════════════════════════════
let hudDirty = true, scoreBump = false, pipsAnim = false, livesAnim = '', shownScore = 0, rallyDirty = true, rallyBump = 0, palDirty = false, ro = null;
const PAUSE_SVG = '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1.2"/><rect x="14" y="5" width="4" height="14" rx="1.2"/></svg>';
function buildView(host) {
  const el = Kit.el;
  host.className = 'stage'; host.innerHTML = '';
  document.documentElement.classList.add('pt-on');
  plates.sc = el('div', { class: 'pt-plate sc' }, [el('small', { text: 'Score' }), el('b', { text: fmt(G.score) })]);
  plates.pips = el('span', { class: 'pt-pips' });
  plates.lv = el('div', { class: 'pt-plate lv' }, [el('small', { text: 'Level' }), el('div', { class: 'row' }, [el('b', { text: '1' }), plates.pips])]);
  plates.balls = el('span', { class: 'pt-balls' });
  plates.bl = el('div', { class: 'pt-plate bl' }, [el('small', { text: 'Balls' }), plates.balls]);
  const pb = el('button', { type: 'button', class: 'pt-pbtn', 'aria-label': 'Pause', html: PAUSE_SVG, onclick: () => { Kit.sfx('tap'); if (paused) resume(); else pause(); } });
  hudEl = el('div', { class: 'pt-hud' }, [plates.lv, plates.sc, plates.bl, pb]);
  if (!renderer) build();
  ovEl = el('div', { class: 'pt-ov' });
  tipEl = el('div', { class: 'pt-tip' });
  viewEl = el('div', { class: 'pt-view' }, [canvas, tipEl, ovEl]);
  host.appendChild(hudEl); host.appendChild(viewEl);
  bindInput();
  setLand(true);
  if (ro) ro.disconnect();
  ro = new ResizeObserver(() => layout()); ro.observe(viewEl);
  layout(); HW = HWt; laidHW = 0;
  shownScore = G.score; hudDirty = true; rallyDirty = true; palDirty = true;
}
// a phone held sideways: the plates in a column at the left
const landQ = matchMedia('(orientation:landscape) and (max-height:560px)');
function setLand(now) {
  const root = document.documentElement, want = landQ.matches;
  if (root.classList.contains('pt-land') === want) return;
  if (now || !on) root.classList.toggle('pt-land', want);
  else Kit.glide(() => { root.classList.toggle('pt-land', want); layout(); });
}
if (landQ.addEventListener) landQ.addEventListener('change', () => { if (on) setLand(false); });
function pr() { const d = window.devicePixelRatio || 1; return QUAL >= 2 ? Math.min(d, 2) : QUAL === 1 ? Math.min(d, 1.25) : 1; }
function layout() {
  if (!viewEl) return;
  const w = Math.max(1, viewEl.clientWidth), h = Math.max(1, viewEl.clientHeight);
  viewW = w; viewH = h;
  renderer.setPixelRatio(pr()); renderer.setSize(w, h, false);
  composer.setPixelRatio(pr()); composer.setSize(w, h);
  bloom.enabled = QUAL > 0;
  camera.aspect = w / h;
  HWt = HH * clamp(w / h, 0.45, 2.6);
  const px = (h * pr()) / (2 * Math.tan(fovV() / 2));
  parts.material.uniforms.uPx.value = px; trail.material.uniforms.uPx.value = px;
  parts.material.uniforms.uMax.value = trail.material.uniforms.uMax.value = Math.max(24, Math.min(w, h) * pr() * 0.09);
  if (on) draw(0);   // (resizing clears the canvas: paint it again at once, so a turn of the device never blinks)
}
function updateHud() {
  hudDirty = false;
  plates.lv.querySelector('b').textContent = String(G.lvl);
  plates.pips.style.setProperty('--pt-a', '#' + PAL_T.a.getHexString(THREE.SRGBColorSpace));
  if (plates.pips.children.length !== NEED) { plates.pips.innerHTML = ''; for (let i = 0; i < NEED; i++) plates.pips.appendChild(document.createElement('i')); }
  [...plates.pips.children].forEach((p, i) => p.classList.toggle('on', i < G.pts));
  const balls = plates.balls;
  if (livesAnim === 'lose' && balls.children.length > G.lives) { const last = balls.lastElementChild; last.classList.add('gone'); setTimeout(() => { if (last.parentNode && G && balls.children.length > G.lives) last.remove(); }, 600); }
  else { while (balls.children.length < G.lives) { const i = document.createElement('i'); if (livesAnim === 'gain') i.className = 'new'; balls.appendChild(i); } while (balls.children.length > G.lives && livesAnim !== 'lose') balls.lastElementChild.remove(); }
  livesAnim = '';
  balls.dataset.none = G.lives <= 0 ? '1' : '';
  if (scoreBump) { scoreBump = false; const s = plates.sc; s.classList.remove('bump'); void s.offsetWidth; s.classList.add('bump'); }
}
function drawRally() {
  rallyDirty = false;
  const x = rallyCtx.x; x.clearRect(0, 0, 512, 256);
  const n = G ? G.rally : 0, col = '#' + PAL.b.getHexString(THREE.SRGBColorSpace);
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = 'italic 900 160px "GN Display", sans-serif';
  x.shadowColor = col; x.shadowBlur = 22; x.fillStyle = col; x.globalAlpha = 0.8; x.fillText(String(n), 256, 104);
  x.shadowBlur = 0; x.globalAlpha = 0.35; x.fillStyle = '#fff'; x.fillText(String(n), 256, 104); x.globalAlpha = 1;
  x.font = '800 34px "GN Display", sans-serif'; x.fillStyle = col; x.fillText(n === 1 ? 'hit' : 'hits in a row', 256, 214);
  rallyTex.needsUpdate = true;
}

// ═══ Loop ════════════════════════════════════════════════════════════════
let time = 0, perf = { n: 0, sum: 0, max: 0, work: 0, workMax: 0, list: [] }, qT = 0, scrimCheck = 0;
function loop(t) {
  raf = 0;
  if (!on) return;
  const dt = lastT ? Math.min(0.05, (t - lastT) / 1000) : 1 / 60; const real = lastT ? (t - lastT) : 16.7; lastT = t;
  const w0 = performance.now();
  if (!paused) {
    if (++scrimCheck % 12 === 0 && (G.phase === 'play' || G.phase === 'serve') && document.querySelector('.k-scrim, .ahi-overlay')) { pause(); }
    else {
      const scale = G.phase === 'over' ? 0.25 : 1;
      if (!hold) { acc += dt * scale; let n = 0; while (acc >= TICK && n++ < 12) { acc -= TICK; step(TICK); } }
      else if (G.phase === 'serve' || hold === 'paddle') movePaddle(dt);
      draw(dt);
    }
  }
  const work = performance.now() - w0;
  // frame time: scale the effects down when frames run long
  if (!paused && real < 250) {
    perf.n++; perf.sum += real; perf.max = Math.max(perf.max, real); perf.work += work; perf.workMax = Math.max(perf.workMax, work);
    perf.list.push(real); if (perf.list.length > 600) perf.list.shift();
    qT += real;
    if (qT > 2500 && !qualLock) {
      const recent = perf.list.slice(-90), avg = recent.reduce((a, b) => a + b, 0) / recent.length;
      if (avg > 21 && QUAL > 0) { QUAL--; layout(); perf.list.length = 0; }
      qT = 0;
    }
  }
  if (on && !paused && !document.hidden && !(G && G.done)) raf = requestAnimationFrame(loop);
}
function wake() { if (!raf && on && !paused && !document.hidden) { lastT = 0; raf = requestAnimationFrame(loop); } }

function beatNow(dt) {
  let lvl = -1;
  if (analyser && Mus && Mus.on() && AC && AC.state === 'running' && G && (G.phase === 'serve' || G.phase === 'play' || G.phase === 'point' || G.phase === 'warp')) {
    analyser.getByteFrequencyData(fbins);
    lvl = (fbins[0] + fbins[1] + fbins[2] * 0.6) / (255 * 2.6);
  }
  if (lvl < 0) {   // no music: a steady pulse at the song's tempo
    const bps = 1 / (SONG.eighth * 2 / tempo()), ph = (time * bps) % 1;
    lvl = Math.pow(1 - ph, 5) * 0.8 + 0.1;
  }
  const v = clamp((lvl - 0.25) / 0.55, 0, 1);
  FXS.beat = v > FXS.beat ? v : Math.max(0, FXS.beat - dt * 2.8);
  if (v > 0.6 && time - FXS.lastPulse > 0.3) { FXS.lastPulse = time; FXS.pulse = 0; }
  FXS.pulse = Math.min(1, FXS.pulse + dt * 1.4);
}
function tempo() { return G ? Math.min(1.35, 1 + 0.035 * (G.lvl - 1)) : 1; }

const tmpCol = new THREE.Color();
function draw(dt) {
  time += dt; U.time.value = time;
  if (Mus) { if (G && !paused && (G.phase === 'serve' || G.phase === 'play' || G.phase === 'point' || G.phase === 'warp')) Mus.tick(); else Mus.stop(); }
  beatNow(dt); U.beat.value = FXS.beat;
  // the tunnel takes the screen's shape (gliding there when the device turns)
  if (Math.abs(HW - HWt) > 1e-4) HW += (HWt - HW) * Math.min(1, dt * 7 || 1);
  // colors: glide toward this level's palette during the warp; from level 7 the rainbow turns
  const warping = G && G.phase === 'warp';
  if (warping) { const k = Math.min(1, dt * 1.6); PKEYS.forEach(c => PAL[c].lerp(PAL_T[c], k)); palDirty = true; }
  if (G && G.lvl >= 7 && !warping) { ['a', 'b', 'grid', 'cpu'].forEach(c => { PAL[c].getHSL(hsl); PAL[c].setHSL((hsl.h + dt * 0.04) % 1, hsl.s, hsl.l); }); palDirty = true; }
  if (palDirty) applyPal();
  // the twist and the roll of later levels
  const lv = G ? G.lvl : 1;
  const twAmp = lv >= 5 ? Math.min(0.55, 0.14 * (lv - 4)) : 0;
  U.twist.value = twAmp * Math.sin(time * 0.33);
  FXS.roll = lv >= 4 ? Math.min(0.09, 0.025 * (lv - 3)) * Math.sin(time * 0.21 + 1) : 0;
  placeTunnel();
  sky.material.uniforms.uSunR.value = clamp(0.62 * Math.atan(HW * FIT / CAM_D), 0.15, 0.3);

  // effects decay
  FXS.shake = Math.max(0, FXS.shake - dt * 2.4); FXS.ca = Math.max(0, FXS.ca - dt * 1.4); FXS.glitch = Math.max(0, FXS.glitch - dt * 1.6);
  FXS.flash = Math.max(0, FXS.flash - dt * 2.2); FXS.punch = Math.max(0, FXS.punch - dt * 3); FXS.sunFlash = Math.max(0, FXS.sunFlash - dt * 1.2);
  FXS.disco = Math.max(0, FXS.disco - dt * (G && G.rally >= 10 && G.phase === 'play' ? 0 : 0.35));
  P.flash = Math.max(0, P.flash - dt * 4); P.pop = Math.max(0, P.pop - dt * 5); C.flash = Math.max(0, C.flash - dt * 4);
  rallyBump = Math.max(0, rallyBump - dt * 3);
  const wt = warping ? G.t : 0, wk = warping ? Math.sin(Math.min(1, wt / 2.5) * Math.PI) : 0;
  FXS.warp = wk;

  // camera: shake, the roll, the punch on a hit, the warp's wide angle
  const sh = FXS.shake * FXS.shake * 0.12;
  const fk = warping ? clamp(G.t / 2.45, 0, 1) : 0, fly = (L + 6) * fk * fk * (3 - 2 * fk);
  camera.position.set((Math.random() - 0.5) * sh, (Math.random() - 0.5) * sh, CAM_D - fly);
  camera.up.set(Math.sin(FXS.roll), Math.cos(FXS.roll), 0); camera.lookAt(camera.position.x * 0.5, camera.position.y * 0.5, camera.position.z - 12);
  camera.fov = THREE.MathUtils.radToDeg(fovV()) * (1 - FXS.punch * 0.025) + wk * 22;
  camera.updateProjectionMatrix();
  sky.position.copy(camera.position);

  // floor scrolls toward you, faster with the ball (and at warp speed)
  const speed = G && G.phase === 'play' ? Math.abs(B.vz) : 3;
  FXS.scroll += dt * (speed * 0.35 + wk * 60);
  floor.material.uniforms.uScroll.value = FXS.scroll % 2.5;
  floor.material.uniforms.uDisco.value = Math.min(1, FXS.disco);
  sky.material.uniforms.uWarp.value = wk; sky.material.uniforms.uFlash.value = FXS.sunFlash;
  wallMat.uniforms.uPulse.value = FXS.pulse;

  // the ball
  const ballOn = G && !B.gone && G.phase !== 'warp' && G.phase !== 'over';
  ball.visible = ballGlow.visible = !!ballOn;
  const r = R();
  if (ballOn) {
    W(B.u, B.v, B.z, tmpV); ball.position.copy(tmpV); ball.scale.setScalar(r * (G.phase === 'serve' ? 1 + 0.08 * Math.sin(time * 8) : 1));
    ballGlow.position.copy(tmpV); ballGlow.scale.setScalar(r * (3.2 + FXS.beat * 0.8));
    ballGlow.material.color.copy(B.curve >= CURVE ? tmpCol.setHSL((time * 1.5) % 1, 1, 0.6) : PAL.b);
    wallMat.uniforms.uBall.value.set(B.u * HW, B.v * HH, B.z); wallMat.uniforms.uBallOn.value = 1;
  } else wallMat.uniforms.uBallOn.value = 0;
  // lights that orbit a curving ball, around the way it bends
  const spin = Math.hypot(B.su, B.sv), showOrb = ballOn && spin > 0.3;
  orbiters.forEach((o, i) => {
    o.visible = showOrb; if (!showOrb) return;
    const a = time * (6 + spin * 6) + i * 6.283 / orbiters.length, ax = B.su / spin, ay = B.sv / spin;
    // orbit in the plane that holds the bend and the travel
    const cr = r * 2, c1 = Math.cos(a) * cr, s1 = Math.sin(a) * cr;
    o.position.set(ball.position.x + ax * c1 - ay * s1 * 0.55, ball.position.y + ay * c1 + ax * s1 * 0.55, ball.position.z + s1 * 0.8);
    o.scale.setScalar(r * 0.16 * Math.min(1.6, 0.6 + spin * 0.5));
  });
  // the depth frame rides the walls at the ball's depth, brighter as it comes at you
  bars.ring.forEach(m => { m.visible = !!ballOn && G.phase !== 'serve'; });
  if (ballOn) { frame4(bars.ring, HW, HH, clamp(B.z, -L, 0), 0.022); bars.matRing.uniforms.uOp.value = 0.45 + 0.45 * clamp(1 + B.z / L, 0, 1); }
  // a ring of light runs down the tunnel with the beat
  frame4(bars.pulse, HW, HH, -FXS.pulse * L, 0.02); bars.matPulse.uniforms.uOp.value = (1 - FXS.pulse) * 0.7 * (0.3 + FXS.beat);
  // trail
  writeTrail(r);
  writeParts(dt);
  writeLines(dt, speed, wk);
  // paddles
  const pw = 1 + P.pop * 0.12;
  padP.position.set(P.u * HW, P.v * HH, 0.001);
  padP.scale.set(pw, pw, 1);
  padP.rotation.x += (clamp(-P.vv * 0.05, -0.16, 0.16) - padP.rotation.x) * Math.min(1, dt * 12); padP.rotation.y += (clamp(P.vu * 0.05, -0.16, 0.16) - padP.rotation.y) * Math.min(1, dt * 12);
  const charge = clamp(Math.hypot(P.vu, P.vv) / 4, 0, 1);
  padP.userData.mat.color.copy(PAL.pad).lerp(tmpCol.setRGB(1, 1, 1), charge * 0.6 + P.flash * 0.5).multiplyScalar(HDR.pad * (1 + P.flash * 0.7 + charge * 0.25));
  padP.userData.fill.material.opacity = 0.1 + P.flash * 0.3 + charge * 0.06;
  padC.position.set(C.u * HW, C.v * HH, -L + 0.01); padC.visible = !warping;
  padC.userData.mat.uniforms.uColor.value.copy(PAL.cpu).multiplyScalar(HDR.cpu * (1 + C.flash * 2));
  padC.userData.fill.material.uniforms.uColor.value.copy(PAL.cpu).multiplyScalar(1.5 + C.flash * 2 + FXS.beat * 0.3);
  // the rally count
  if (rallyDirty) drawRally();
  rallySign.position.set(0, HH * 0.52, -L * 0.48);
  const rw = Math.min(HH * 1.3, HW * 1.85) * (1 + rallyBump * 0.25); rallySign.scale.set(rw, rw, 1);
  rallySign.material.opacity = G && G.phase !== 'warp' && G.rally > 0 ? 0.45 + Math.min(0.45, G.rally * 0.04) : 0;
  // words in the air
  popups.forEach(p => {
    if (p.life <= 0) { p.s.visible = false; return; }
    p.life -= dt; const k = 1 - p.life / p.max;
    p.s.position.set(p.base.x, p.base.y + k * HH * 0.25, p.base.z);
    const sc = p.scale * (k < 0.15 ? 0.6 + k / 0.15 * 0.4 : 1);
    p.s.scale.set(sc * 3.2, sc, 1); p.s.material.opacity = clamp(p.life / 0.35, 0, 1);
  });
  // post
  fxPass.uniforms.uTime.value = time;
  fxPass.uniforms.uCA.value = FXS.ca + wk * 0.7 + (G && G.lvl >= 6 ? 0.06 : 0);
  fxPass.uniforms.uGlitch.value = FXS.glitch;
  fxPass.uniforms.uWarp.value = wk * 1.5 + (lv >= 6 ? Math.min(0.5, 0.1 * (lv - 5)) * (0.4 + FXS.beat) : 0);
  fxPass.uniforms.uFlash.value = FXS.flash * 0.6; fxPass.uniforms.uFlashC.value.copy(FXS.flashC);
  bloom.strength = BLOOM * (1 + FXS.beat * 0.3 + wk + FXS.disco * 0.25);
  if (hudDirty && G) updateHud();
  // the score counts up to what was just earned
  if (G && plates.sc && Math.round(shownScore) !== G.score) {
    shownScore = shownScore < G.score && dt > 0 ? Math.min(G.score, shownScore + Math.max(1, (G.score - shownScore) * Math.min(1, dt * 7))) : G.score;
    plates.sc.querySelector('b').textContent = fmt(shownScore);
  }
  composer.render();
}
const hsl = {};
function applyPal() {
  palDirty = false;
  bars.matA.uniforms.uColor.value.copy(PAL.a).multiplyScalar(HDR.a);
  bars.matB.uniforms.uColor.value.copy(PAL.b).multiplyScalar(HDR.b);
  bars.matMid.uniforms.uColor.value.copy(PAL.a).multiplyScalar(1.4);
  bars.matRing.uniforms.uColor.value.copy(PAL.b).multiplyScalar(1.15);
  bars.matPulse.uniforms.uColor.value.copy(PAL.a).multiplyScalar(1.8);
  padP.userData.fill.material.color.copy(PAL.pad);
  rallyDirty = true;
  if (G && G.phase !== 'warp' && envFor !== G.lvl) { envFor = G.lvl; makeEnv(); }
}
let envFor = 0;
function writeTrail(r) {
  const pa = trailGeo.attributes.position.array, ca = trailGeo.attributes.aColor.array, sa = trailGeo.attributes.aSize.array, aa = trailGeo.attributes.aAlpha.array;
  for (let i = 0; i < T_N; i++) {
    const idx = (trailHead - 1 - i + T_N * 2) % T_N, p = TR[idx], k = 1 - i / T_N;
    pa[i * 3] = p.x; pa[i * 3 + 1] = p.y; pa[i * 3 + 2] = p.z;
    if (p.c >= CURVE) tmpCol.setHSL((time * 0.8 + i * 0.035) % 1, 1, 0.6); else tmpCol.copy(PAL.b).lerp(PAL.a, i / T_N);
    ca[i * 3] = tmpCol.r * 0.8; ca[i * 3 + 1] = tmpCol.g * 0.8; ca[i * 3 + 2] = tmpCol.b * 0.8;
    sa[i] = r * 1.9 * (0.3 + 0.7 * k); aa[i] = p.on ? k * 0.8 : 0;
  }
  ['position', 'aColor', 'aSize', 'aAlpha'].forEach(a => { trailGeo.attributes[a].needsUpdate = true; });
}
function writeParts(dt) {
  const pa = partGeo.attributes.position.array, ca = partGeo.attributes.aColor.array, sa = partGeo.attributes.aSize.array, aa = partGeo.attributes.aAlpha.array;
  for (let i = 0; i < P_N; i++) {
    const p = PS[i];
    if (p.life <= 0) { aa[i] = 0; continue; }
    p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.vx *= 0.97; p.vy = p.vy * 0.97 - dt * 1.2; p.vz *= 0.97;
    pa[i * 3] = p.x; pa[i * 3 + 1] = p.y; pa[i * 3 + 2] = p.z; ca[i * 3] = p.r; ca[i * 3 + 1] = p.g; ca[i * 3 + 2] = p.b;
    sa[i] = p.size; aa[i] = clamp(p.life / p.max, 0, 1);
  }
  ['position', 'aColor', 'aSize', 'aAlpha'].forEach(a => { partGeo.attributes[a].needsUpdate = true; });
}
function writeLines(dt, speed, wk) {
  const fast = G && G.phase === 'play' ? clamp((speed - 9) / 6, 0, 1) * 0.35 : 0, vis = Math.max(wk, fast);
  lines.material.opacity = vis; lines.visible = vis > 0.01; if (!lines.visible) return;
  const pa = lineGeo.attributes.position.array, ca = lineGeo.attributes.color.array, v = 20 + wk * 90;
  for (let i = 0; i < LN; i++) {
    const s = SL[i]; s.z += v * dt; if (s.z > CAM_D + 1) { s.z = -60 - Math.random() * 20; s.a = Math.random() * 6.283; }
    const x = Math.cos(s.a) * s.r * Math.max(1, HW / HH), y = Math.sin(s.a) * s.r, len = s.len * (1 + wk * 4);
    pa[i * 6] = x; pa[i * 6 + 1] = y; pa[i * 6 + 2] = s.z; pa[i * 6 + 3] = x; pa[i * 6 + 4] = y; pa[i * 6 + 5] = s.z - len;
    tmpCol.setHSL((s.h + time * 0.2) % 1, 1, 0.65);
    ca[i * 6] = ca[i * 6 + 3] = tmpCol.r * 2; ca[i * 6 + 1] = ca[i * 6 + 4] = tmpCol.g * 2; ca[i * 6 + 2] = ca[i * 6 + 5] = tmpCol.b * 2;
  }
  lineGeo.attributes.position.needsUpdate = true; lineGeo.attributes.color.needsUpdate = true;
}

// ═══ Pause, overlays, the end ════════════════════════════════════════════
function pause() {
  if (!on || paused || !G || G.phase === 'over' || G.done) return;
  paused = true; Object.keys(ptrs).forEach(k => delete ptrs[k]); Object.keys(down).forEach(k => delete down[k]); keys = [0, 0];
  if (Mus) Mus.stop(true);
  showOverlay('Paused', 'Level ' + G.lvl + ' · ' + fmt(G.score) + ' points', 'Resume');
  save();
}
function resume() {
  if (!paused) return;
  paused = false; ovEl.classList.remove('show'); lastT = 0; acc = 0;
  if (AC && AC.state === 'suspended') try { AC.resume(); } catch (e) {}
  Kit.sfx('tap'); wake();
}
function showOverlay(title, sub, btn) {
  const el = Kit.el;
  ovEl.innerHTML = '';
  ovEl.appendChild(el('div', { class: 'card' }, [
    el('h2', { text: title }), Kit.facts(el('p'), sub),
    el('button', { type: 'button', class: 'btn btn-primary btn-block', text: btn, onclick: resume }),
    el('button', { type: 'button', class: 'btn btn-ghost btn-block', text: 'New game', onclick: () => { Kit.confirm('Start a new game?', { ok: 'New game', body: 'This game will be lost.' }).then(ok => { if (ok) { clearSave(); stop(); opts.onSetup && opts.onSetup(); } }); } })
  ]));
  ovEl.classList.add('show');
  draw(0);
}
// moments that came up mid-rally wait for the next pause in play
let lastMoment = 0;
function flushQueue() {
  if (!G || !G.queue.length || performance.now() - lastMoment < 2600) return;
  lastMoment = performance.now();
  const m = G.queue.shift();
  Kit.moment(Object.assign({ at: viewEl, ms: 2200, color: '#' + PAL.b.getHexString(THREE.SRGBColorSpace) }, m));
}
function finish() {
  if (!G || G.done) return; G.done = true;
  clearSave();
  const st = G.st, name = myName(), dn = D().name;
  if (G.lvlScore > 0 || G.miss) { st.lp.push(Math.round(G.lvlScore)); st.lm.push(Math.min(9, G.miss)); }
  const h = [];
  h.push(name + ' reached level ' + G.lvl + ' against ' + botName() + ' on ' + dn + '.');
  if (st.longest >= 2) h.push('The longest rally was ' + st.longest + ' hits.');
  if (st.curves) h.push(name + ' hit ' + st.curves + (st.curves === 1 ? ' curve shot' : ' curve shots') + (st.big ? ', and ' + st.big + (st.big === 1 ? ' of them was a big curve.' : ' of them were big curves.') : '.'));
  if (st.perfect) h.push(name + ' cleared ' + (st.perfect === 1 ? 'one level' : st.perfect + ' levels') + ' without missing a ball.');
  if (st.extra) h.push(name + ' earned ' + (st.extra === 1 ? 'an extra ball' : st.extra + ' extra balls') + '.');
  if (st.pb) h.push('This game passed ' + name + '’s best score of ' + fmt(G.best0) + ' points.');
  const hiL = window.ArcadeHi ? ArcadeHi.list(BOARD) : [];
  const detail = { tn: 1, lv: G.lvl, sc: G.score, lr: st.longest, ht: st.hits, cv: st.curves, bc: st.big, pf: st.perfect, xb: st.extra, df: G.diff, cm: st.cpuMiss,
    lp: st.lp.slice(0, 40).join(','), lm: st.lm.slice(0, 40).join(''),
    hr: G.score > 0 && (hiL.length < ArcadeHi.max || G.score > hiL[hiL.length - 1].score) ? hiL.filter(x => x.score >= G.score).length + 1 : 0, hb: hiL.length ? hiL[0].score : 0 };
  Kit.record(KEY, { detail, started: G.started, mode: 'Tunnel · ' + dn,
    players: [{ name, score: G.score }], winner: null, highlights: h.slice(0, 6),
    summary: fmt(G.score) + ' points · level ' + G.lvl, badge: 'Lvl ' + G.lvl,
    meta: { tunnel: 1, score: G.score, level: G.lvl, longestRally: st.longest, diff: G.diff } });
  const best = G.score > G.best0 && G.score > 0, sc = G.score, lvl = G.lvl, again = { diff: G.diff, players: G.players };
  const done = () => {
    Kit.win({
      lose: !best, icon: best ? 'trophy' : 'meh',
      title: best ? 'New high score!' : 'Game over',
      sub: fmt(sc) + ' points · reached level ' + lvl + (st.longest >= 2 ? ' · a longest rally of ' + st.longest + ' hits' : ''),
      again: () => start(Object.assign({}, opts, again, { saved: null })), againLabel: 'Play again',
      setup: () => { stop(); opts.onSetup && opts.onSetup(); }, setupLabel: 'Change settings',
      scores: () => { ArcadeHi.show(BOARD, 'Pong: Tunnel high scores'); }
    });
  };
  if (window.ArcadeHi && sc > 0) ArcadeHi.check(BOARD, sc, done); else done();
}

// ═══ Start and stop ══════════════════════════════════════════════════════
function start(o) {
  opts = o || {};
  stop(true);
  newGame(opts);
  on = true; paused = false; hold = false;
  Object.assign(P, { u: 0, v: 0, tu: 0, tv: 0, vu: 0, vv: 0, flash: 0, pop: 0 });
  Object.assign(C, { u: 0, v: 0, vu: 0, vv: 0, tu: 0, tv: 0, next: 0, eu: 0, ev: 0, shot: -1, flash: 0 });
  FXS.disco = 0; FXS.ca = 0; FXS.glitch = 0; FXS.flash = 0; FXS.shake = 0;
  PS.forEach(p => { p.life = 0; }); popups.forEach(p => { p.life = 0; });
  setPal(G.lvl, true); envFor = 0;
  if (!Mus && window.ArcadeMusic) Mus = ArcadeMusic.create({ key: 'pong_music', song: SONG, ctx: ac, out: () => musicIn, tempo: tempo });
  Kit.gameStart();
  try { document.fonts.load('italic 900 100px "GN Display"').then(() => { rallyDirty = true; }); } catch (e) {}
  buildView(opts.host);
  applyPal();
  readyServe();
  if (opts.saved) { paused = true; showOverlay('Welcome back', 'Level ' + G.lvl + ' · ' + fmt(G.score) + ' points', 'Continue'); }
  else popup('LEVEL ' + G.lvl, 0, 0.62, -L * 0.45, '#' + PAL.a.getHexString(THREE.SRGBColorSpace), 1.5, true);
  lastT = 0; acc = 0; qT = 0; perf = { n: 0, sum: 0, max: 0, work: 0, workMax: 0, list: [] };
  wake();
}
function stop(quiet) {
  if (!on) return;
  on = false; paused = false;
  if (raf) { cancelAnimationFrame(raf); raf = 0; }
  if (Mus) Mus.stop(true);
  if (ro) { ro.disconnect(); ro = null; }
  document.documentElement.classList.remove('pt-on', 'pt-land');
  void quiet;
}
// pauses in play show the moments that waited
setInterval(() => { if (on && !paused && G && (G.phase === 'point' || G.phase === 'serve' || G.phase === 'miss')) flushQueue(); }, 700);

window.PongTunnel = { start, stop, active: () => on, saved: loadSaved, pause };

// ═══ Test hook ═══════════════════════════════════════════════════════════
let autoOn = false, autoMiss = 0, autoCurve = 0, autoN = 0;
function autoStep() {
  if (!autoOn || !G || paused) return;
  if (G.phase === 'serve' && G.t > 0.5) { if (autoCurve) P.vu = autoCurve; serve(); return; }
  if (G.phase !== 'play') return;
  if (B.vz > 0) {
    // where the ball will reach your end (the hook reads the ball as a sharp player would)
    let u = B.u, v = B.v, z = B.z, vu = B.vu, vv = B.vv, su = B.su, sv = B.sv; const ru = rU(), rv = rV(), dt = 1 / 60;
    for (let i = 0; i < 400 && z < -R(); i++) { vu += su * dt; vv += sv * dt; const k = Math.exp(-SPIN_DECAY * dt); su *= k; sv *= k; u += vu * dt; v += vv * dt; z += B.vz * dt;
      if (u > 1 - ru) { u = 1 - ru; vu = -Math.abs(vu); su = -su * 0.5; } else if (u < -1 + ru) { u = -1 + ru; vu = Math.abs(vu); su = -su * 0.5; }
      if (v > 1 - rv) { v = 1 - rv; vv = -Math.abs(vv); sv = -sv * 0.5; } else if (v < -1 + rv) { v = -1 + rv; vv = Math.abs(vv); sv = -sv * 0.5; } }
    const missIt = autoMiss && (autoN % autoMiss === autoMiss - 1);
    // aim off center so the return angles away; a curve: swing through the ball as it arrives
    const off = 0.55 * PU;
    setTarget(missIt ? (u > 0 ? u - 0.9 : u + 0.9) : u - Math.sign(u || 1) * off, v);
    if (autoCurve && B.z > -1.6) { P.tu = clamp(P.tu + autoCurve * 0.02, -1 + PU, 1 - PU); }
  } else if (B.checked === false && B.vz < 0 && B.z < -L * 0.5) { autoN = G.st.hits; }
}
setInterval(autoStep, 16);
window.__tunnel = {
  get: () => G && { trail: TR.filter(p => p.on).length, phase: G.phase, lvl: G.lvl, score: G.score, lives: G.lives, pts: G.pts, miss: G.miss, rally: G.rally, st: G.st, q: QUAL, hw: HW, paused, ball: { u: B.u, v: B.v, z: B.z, vz: B.vz, su: B.su, sv: B.sv, curve: B.curve }, pad: { u: P.u, v: P.v }, cpu: { u: C.u, v: C.v } },
  auto: (onOff, missEvery, curve) => { autoOn = !!onOff; autoMiss = missEvery || 0; autoCurve = curve || 0; },
  level: n => { if (!G) return; G.lvl = n; G.pts = 0; G.miss = 0; setPal(n, true); envFor = 0; palDirty = true; hudDirty = true; readyServe(); },
  hold: h => { hold = h; },
  serve: () => serve(),
  miss: () => { if (!G) return; if (G.phase === 'serve') serve(); B.vz = Math.abs(B.vz) || 8; B.z = -0.6; B.checked = false; P.tu = P.u = B.u > 0 ? -1 + PU : 1 - PU; },
  point: () => { if (!G) return; if (G.phase === 'serve') serve(); B.vz = -Math.abs(B.vz || 8); B.z = -L + 1; B.checked = false; C.u = C.tu = B.u > 0 ? -1 + PU : 1 - PU; C.next = 9; },
  // put a ball in flight toward the computer with a curve on it, as if you had just swung through it
  curve: (s, at) => { if (!G) return; if (G.phase === 'serve') serve(); B.z = -(at || 1.2); B.vz = -VZ(); B.u = -0.5; B.v = -0.2; B.vu = 0.2; B.vv = 0.1; B.su = s || 1.6; B.sv = 0.3; B.curve = Math.hypot(B.su, B.sv); B.checked = false; for (let i = 0; i < 24; i++) step(TICK); },
  ballAt: (u, v, z, vz) => { Object.assign(B, { u, v, z, vz: vz == null ? B.vz : vz, held: false, checked: false }); if (G.phase === 'serve') G.phase = 'play'; },
  quality: (q, lock) => { QUAL = q; qualLock = lock !== false; if (on) layout(); },
  perf: () => { const l = perf.list.slice().sort((a, b) => a - b); return { frames: perf.n, avg: perf.n ? perf.sum / perf.n : 0, p50: l[Math.floor(l.length * 0.5)] || 0, p95: l[Math.floor(l.length * 0.95)] || 0, max: perf.max, workAvg: perf.n ? perf.work / perf.n : 0, workMax: perf.workMax, q: QUAL }; },
  perfReset: () => { perf = { n: 0, sum: 0, max: 0, work: 0, workMax: 0, list: [] }; qT = 0; },
  lives: n => { G.lives = n; hudDirty = true; },
  diff: d => { G.diff = d; },
  pts: n => { G.pts = n; hudDirty = true; },
  // you hit the ball now, swinging your paddle at v (u a second): a curve shot
  curveHit: v => { if (!G || G.phase !== 'play') return; P.u = P.tu = B.u; P.v = P.tv = B.v; P.vu = v; P.vv = v * 0.2; B.z = -R(); B.vz = Math.abs(B.vz) || 7; youHit(); },
  tune: (d, o) => Object.assign(DIFF[d], o || {}),
  score: n => { G.score = n; hudDirty = true; },
  step: (n) => { for (let i = 0; i < (n || 1); i++) step(TICK); },
  // play on at full speed, the autopilot moving your paddle (stops at a phase given in until)
  sim: (sec, until) => { const n = Math.round(sec / TICK); for (let i = 0; i < n; i++) { if (i % 2 === 0) autoStep(); step(TICK); if (until && G.phase === until) break; if (G.done || G.phase === 'over') break; } return window.__tunnel.get(); },
  draw: () => draw(0),
  bloom: (s, r, th) => { BLOOM = s; if (r != null) bloom.radius = r; if (th != null) bloom.threshold = th; }
};
window.dispatchEvent(new Event('pongtunnel:ready'));
