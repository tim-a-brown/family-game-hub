// ═══════════════════════════════════════════════════════════════════════════
// Pinball audio. Every sound is synthesised ONCE into a sample buffer with an
// OfflineAudioContext (cheap, consistent playback), then played through a
// small generated room reverb and a master limiter. A steel ball on a wooden
// playfield: hits are short inharmonic metal rings (3-6 kHz) with a noise
// tick; rubber is a soft low thud; coils are low thumps; rolling is a filtered
// rumble that follows speed (wire ramps rattle, plastic ramps sound hollow).
// Music beds loop quietly under it all and duck for callouts and modes.
// Speech (Web Speech API) never overlaps and respects the sound setting.
// ═══════════════════════════════════════════════════════════════════════════
const SR = 32000;
const RECIPES = {};
// helper bound to an offline context
function synth(ctx) {
  const out = ctx.destination;
  let nb = null;
  function noiseBuf() { if (nb) return nb; const n = Math.floor(ctx.sampleRate * 2.5); nb = ctx.createBuffer(1, n, ctx.sampleRate); const d = nb.getChannelData(0); let s = 1234567; for (let i = 0; i < n; i++) { s = (s * 1103515245 + 12345) & 0x7fffffff; d[i] = (s / 0x3fffffff) - 1; } return nb; }
  function env(g, t, vol, att, dur, curve) {
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(vol, 0.0002), t + att);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }
  function filt(src, o) {
    let n = src;
    if (o.lp) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lp; f.Q.value = o.lq || 0.7; n.connect(f); n = f; }
    if (o.hp) { const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = o.hp; n.connect(f); n = f; }
    if (o.bp) { const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = o.bp; f.Q.value = o.q || 1; if (o.bpTo) f.frequency.exponentialRampToValueAtTime(o.bpTo, (o.t || 0) + (o.dur || 0.2)); n.connect(f); n = f; }
    return n;
  }
  const nyq = ctx.sampleRate * 0.45;
  return {
    ctx,
    osc(type, f, t, dur, vol, o = {}) {
      if (f > nyq) return;
      const n = ctx.createOscillator(), g = ctx.createGain(); n.type = type; n.frequency.setValueAtTime(f, t);
      if (o.to) n.frequency.exponentialRampToValueAtTime(Math.min(o.to, nyq), t + (o.toT || dur));
      if (o.detune) n.detune.value = o.detune;
      env(g, t, vol, o.att || 0.002, dur);
      filt(n, Object.assign({ t, dur }, o)).connect(g); g.connect(o.dest || out); n.start(t); n.stop(t + dur + 0.02);
      return n;
    },
    noise(t, dur, vol, o = {}) {
      const s = ctx.createBufferSource(), g = ctx.createGain(); s.buffer = noiseBuf(); s.playbackRate.value = o.rate || 1;
      env(g, t, vol, o.att || 0.001, dur);
      filt(s, Object.assign({ t, dur }, o)).connect(g); g.connect(o.dest || out); s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.02);
    },
    // inharmonic metal ring (a steel ball against steel)
    ring(f, t, dur, vol, ratios = [1, 2.76, 5.4, 8.93]) {
      ratios.forEach((r, i) => this.osc('sine', f * r, t, dur / (1 + i * 0.8), vol / (1 + i * 1.1), { att: 0.0008 }));
    },
    // bell (FM-ish additive), for chimes and stingers
    bell(f, t, dur, vol) {
      [[1, 1], [2.0, 0.5], [2.76, 0.35], [4.07, 0.18], [5.2, 0.1]].forEach(([r, a], i) => this.osc('sine', f * r, t, dur / (1 + i * 0.6), vol * a, { att: 0.002 }));
    },
    // detuned saw pad through a moving lowpass (avoids the 'MIDI' sound)
    pad(f, t, dur, vol, o = {}) {
      [-9, -3, 3, 9].forEach(d => this.osc('sawtooth', f, t, dur, vol / 3, { att: o.att || 0.08, detune: d, lp: o.lp || 1800, lq: 0.9 }));
    },
    organ(f, t, dur, vol) {   // pipe organ: harmonics with slow attack and chorus
      [[1, 1], [2, 0.6], [3, 0.35], [4, 0.3], [6, 0.12], [8, 0.1], [0.5, 0.5]].forEach(([r, a]) => {
        this.osc('sine', f * r, t, dur, vol * a * 0.5, { att: 0.07, detune: 4 }); this.osc('sine', f * r, t, dur, vol * a * 0.5, { att: 0.09, detune: -5 });
      });
      this.noise(t, 0.12, vol * 0.08, { bp: f * 4, q: 3 });
    }
  };
}
// ── Recipes: name -> [duration, fn(S)] ── (variants get random pitch at play time)
function R(name, dur, fn) { RECIPES[name] = [dur, fn]; }
R('metal', 0.35, S => { S.noise(0, 0.006, 0.5, { hp: 5000 }); S.ring(4200, 0, 0.3, 0.16); });
R('metal2', 0.35, S => { S.noise(0, 0.006, 0.5, { hp: 5500 }); S.ring(3300, 0, 0.32, 0.16, [1, 2.41, 4.9, 7.2]); });
R('rail', 0.45, S => { S.noise(0, 0.01, 0.4, { hp: 4000 }); S.ring(2650, 0, 0.42, 0.2, [1, 2.76, 5.4, 6.6]); S.osc('sine', 180, 0, 0.06, 0.15, { to: 110 }); });
R('rubber', 0.16, S => { S.osc('sine', 125, 0, 0.09, 0.55, { to: 68 }); S.noise(0, 0.03, 0.12, { lp: 900 }); S.ring(3600, 0.002, 0.08, 0.025); });
R('wood', 0.2, S => { S.osc('sine', 168, 0, 0.11, 0.5, { to: 88 }); S.noise(0, 0.04, 0.2, { bp: 700, q: 1.4 }); S.ring(2900, 0, 0.07, 0.03); });
R('plastic', 0.18, S => { S.noise(0, 0.03, 0.4, { bp: 1100, q: 2.2 }); S.osc('sine', 320, 0, 0.06, 0.2, { to: 180 }); S.ring(3800, 0, 0.05, 0.02); });
R('clack', 0.3, S => { S.noise(0, 0.004, 0.6, { hp: 6000 }); S.ring(5200, 0, 0.22, 0.14, [1, 2.76, 5.4]); S.ring(4700, 0.0007, 0.18, 0.08); });
R('flipUp', 0.22, S => { S.osc('sine', 74, 0, 0.12, 0.6, { to: 38 }); S.noise(0, 0.022, 0.45, { bp: 2400, q: 3 }); S.noise(0.002, 0.05, 0.25, { lp: 520 }); S.ring(4300, 0.004, 0.05, 0.03); });
R('flipDn', 0.12, S => { S.noise(0, 0.02, 0.25, { bp: 1700, q: 3 }); S.osc('sine', 60, 0, 0.05, 0.22, { to: 40 }); });
R('flipHit', 0.2, S => { S.osc('sine', 110, 0, 0.08, 0.45, { to: 70 }); S.noise(0, 0.02, 0.2, { bp: 1500, q: 1.5 }); S.ring(3900, 0.001, 0.08, 0.04); });
R('pop', 0.42, S => { S.osc('sine', 90, 0, 0.18, 0.75, { to: 40 }); S.noise(0, 0.07, 0.55, { lp: 380 }); S.noise(0, 0.015, 0.3, { hp: 5000 }); S.ring(3300, 0.005, 0.32, 0.09); S.osc('sine', 52, 0.01, 0.2, 0.3, { to: 34 }); });
R('sling', 0.25, S => { S.noise(0, 0.03, 0.6, { hp: 2600 }); S.osc('sine', 150, 0, 0.08, 0.5, { to: 70 }); S.ring(3900, 0, 0.14, 0.06); S.noise(0.004, 0.05, 0.25, { lp: 600 }); });
R('target', 0.2, S => { S.noise(0, 0.035, 0.5, { bp: 1600, q: 2 }); S.osc('sine', 230, 0, 0.05, 0.25, { to: 120 }); S.ring(4000, 0, 0.1, 0.04); });
R('drop', 0.25, S => { S.noise(0, 0.04, 0.55, { bp: 1250, q: 2 }); S.osc('sine', 110, 0, 0.12, 0.5, { to: 58 }); S.noise(0.05, 0.05, 0.15, { bp: 900, q: 2 }); });
R('dropReset', 0.35, S => { for (let i = 0; i < 4; i++) S.noise(i * 0.022, 0.03, 0.35, { bp: 1200 + i * 220, q: 2 }); S.osc('sine', 85, 0, 0.13, 0.45, { to: 45 }); });
R('scoop', 0.5, S => { S.osc('sine', 100, 0, 0.2, 0.6, { to: 55 }); S.noise(0, 0.08, 0.45, { lp: 520 }); S.ring(3000, 0.03, 0.08, 0.08); S.ring(3400, 0.07, 0.06, 0.05); S.ring(2800, 0.11, 0.05, 0.04); });
R('kick', 0.3, S => { S.osc('sine', 84, 0, 0.14, 0.7, { to: 40 }); S.noise(0, 0.06, 0.5, { lp: 420 }); S.ring(3200, 0, 0.1, 0.05); S.noise(0, 0.01, 0.3, { hp: 4000 }); });
R('vuk', 0.45, S => { S.osc('sine', 70, 0, 0.2, 0.85, { to: 34 }); S.noise(0, 0.09, 0.6, { lp: 360 }); S.noise(0.03, 0.18, 0.18, { bp: 2400, q: 4 }); S.ring(2600, 0.02, 0.25, 0.07); });
R('drain', 0.9, S => { S.noise(0, 0.5, 0.18, { lp: 260 }); S.osc('sine', 110, 0.34, 0.22, 0.45, { to: 50 }); S.noise(0.34, 0.08, 0.35, { lp: 620 }); S.ring(2400, 0.36, 0.12, 0.05); });
R('trough', 0.4, S => { S.osc('sine', 95, 0, 0.15, 0.4, { to: 50 }); S.ring(3100, 0.01, 0.2, 0.08); S.ring(3500, 0.08, 0.15, 0.05); });
R('launch', 0.4, S => { S.osc('sine', 125, 0, 0.15, 0.5, { to: 50 }); S.noise(0, 0.06, 0.4, { bp: 900, q: 0.9 }); S.ring(2700, 0, 0.15, 0.06); S.noise(0, 0.25, 0.06, { bp: 3000, q: 8 }); });
R('pull', 0.4, S => { S.noise(0, 0.35, 0.08, { bp: 2400, q: 6 }); S.osc('sawtooth', 75, 0, 0.3, 0.03, { to: 48, lp: 600 }); });
R('gate', 0.15, S => { S.noise(0, 0.004, 0.4, { hp: 5000 }); S.ring(5600, 0, 0.1, 0.06, [1, 2.2, 3.9]); });
R('spin', 0.06, S => { S.noise(0, 0.004, 0.3, { hp: 6000 }); S.ring(5200, 0, 0.04, 0.05, [1, 2.3]); });
R('rollover', 0.12, S => { S.noise(0, 0.008, 0.3, { hp: 3500 }); S.osc('sine', 900, 0, 0.02, 0.06); S.ring(4800, 0.001, 0.05, 0.03); });
R('land', 0.4, S => { S.osc('sine', 150, 0, 0.12, 0.6, { to: 80 }); S.noise(0, 0.04, 0.35, { bp: 800, q: 1.2 }); S.ring(3500, 0, 0.25, 0.08); });
R('flap', 0.15, S => { S.noise(0, 0.02, 0.4, { bp: 1400, q: 2 }); S.osc('sine', 260, 0, 0.05, 0.2, { to: 160 }); });
R('wireEnd', 0.35, S => { S.ring(2200, 0, 0.3, 0.12, [1, 2.9, 5.1]); S.noise(0, 0.01, 0.3, { hp: 3000 }); });
R('magnet', 1.3, S => { S.osc('sine', 60, 0, 1.2, 0.3, { att: 0.05 }); S.osc('sawtooth', 120, 0, 1.2, 0.04, { lp: 400, att: 0.05 }); S.osc('sine', 180, 0, 1.2, 0.05, { att: 0.05 }); });
R('magClick', 0.12, S => { S.osc('sine', 120, 0, 0.06, 0.4, { to: 60 }); S.noise(0, 0.01, 0.3, { bp: 2000, q: 2 }); });
R('knocker', 0.5, S => { S.osc('sine', 120, 0, 0.18, 1, { to: 45 }); S.noise(0, 0.1, 0.8, { lp: 900 }); S.noise(0, 0.02, 0.5, { bp: 1800, q: 1 }); S.osc('sine', 260, 0, 0.05, 0.4, { to: 150 }); });
R('motor', 0.25, S => { S.noise(0, 0.03, 0.35, { bp: 900, q: 3 }); S.osc('square', 45, 0, 0.12, 0.08, { lp: 300 }); S.noise(0.06, 0.02, 0.25, { bp: 1300, q: 3 }); });
R('chime1', 1.6, S => S.bell(1046.5, 0, 1.5, 0.25));
R('chime2', 1.8, S => S.bell(784, 0, 1.7, 0.25));
R('chime3', 2.0, S => S.bell(523.3, 0, 1.9, 0.27));
R('clank', 0.3, S => { S.ring(1800, 0, 0.25, 0.15, [1, 2.4, 3.8, 6.1]); S.noise(0, 0.02, 0.4, { bp: 2500, q: 1 }); });
R('motorRun', 1.0, S => { for (let i = 0; i < 6; i++) S.noise(i * 0.16, 0.03, 0.2, { bp: 900 + (i % 2) * 300, q: 3 }); S.osc('sawtooth', 50, 0, 0.95, 0.04, { lp: 220, att: 0.05 }); });
R('whoosh', 0.8, S => { S.noise(0, 0.7, 0.25, { bp: 600, bpTo: 2400, q: 1.5, att: 0.2 }); });
R('shake', 1.0, S => { for (let i = 0; i < 14; i++) S.osc('sine', 38 + (i % 3) * 4, i * 0.06, 0.08, 0.35, { att: 0.01 }); S.noise(0, 0.9, 0.08, { lp: 160 }); });
// game stingers
R('jackpot', 2.2, S => { [261.6, 329.6, 392, 523.3].forEach((f, i) => S.pad(f, 0, 1.8, 0.09, { att: 0.02, lp: 2600 })); [523.3, 659.3, 784, 1046.5, 1318.5].forEach((f, i) => S.bell(f, i * 0.08, 1.2, 0.09)); S.noise(0, 1.4, 0.05, { hp: 6000, att: 0.05 }); });
R('award', 1.0, S => { [523.3, 784, 1046.5].forEach((f, i) => S.bell(f, i * 0.07, 0.8, 0.1)); });
R('combo', 0.6, S => { S.bell(880, 0, 0.5, 0.1); S.bell(1318.5, 0.07, 0.5, 0.1); });
R('skill', 1.0, S => { [784, 987.8, 1174.7, 1568].forEach((f, i) => S.bell(f, i * 0.06, 0.8, 0.09)); });
R('extra', 1.6, S => { [392, 523.3, 659.3, 784, 1046.5, 1318.5].forEach((f, i) => S.bell(f, i * 0.09, 1.0, 0.09)); S.pad(261.6, 0, 1.5, 0.08); });
R('multi', 1.6, S => { for (let i = 0; i < 4; i++) { S.osc('sawtooth', 440, i * 0.32, 0.16, 0.06, { to: 880, lp: 2400 }); S.osc('sawtooth', 880, i * 0.32 + 0.16, 0.16, 0.06, { to: 440, lp: 2400 }); } S.pad(110, 0, 1.4, 0.08, { lp: 900 }); });
R('tilt', 0.9, S => { S.osc('sawtooth', 110, 0, 0.7, 0.12, { lp: 900 }); S.osc('sawtooth', 117, 0, 0.7, 0.12, { lp: 900 }); });
R('warn', 0.35, S => { S.osc('square', 660, 0, 0.1, 0.06, { lp: 2000 }); S.osc('square', 660, 0.16, 0.1, 0.06, { lp: 2000 }); });
R('bonus', 0.18, S => { S.bell(1046.5, 0, 0.15, 0.08); S.osc('square', 523.3, 0, 0.06, 0.03, { lp: 2500 }); });
R('start', 1.2, S => { [261.6, 392, 523.3, 659.3, 784].forEach((f, i) => S.bell(f, i * 0.08, 0.6, 0.08)); S.pad(130.8, 0.3, 0.8, 0.07); });
R('save', 0.6, S => { S.bell(659.3, 0, 0.4, 0.1); S.bell(880, 0.1, 0.5, 0.1); });
R('lock', 0.9, S => { S.osc('sine', 220, 0, 0.3, 0.3, { to: 110 }); [329.6, 392, 493.9].forEach((f, i) => S.bell(f, 0.1 + i * 0.08, 0.5, 0.08)); });
R('over', 2.4, S => { [392, 349.2, 311.1, 261.6].forEach((f, i) => S.pad(f, i * 0.4, 0.9, 0.07, { lp: 1400 })); });
// haunted / atmosphere
R('thunder', 3.2, S => { S.noise(0, 0.3, 0.35, { lp: 1100, lq: 0.7 }); S.noise(0.08, 2.8, 0.45, { lp: 180, lq: 0.8 }); S.noise(0.4, 1.6, 0.25, { lp: 90 }); S.osc('sine', 46, 0.05, 2.2, 0.25, { to: 30 }); });
R('organ', 3.4, S => { [[146.8, 0], [174.6, 0], [220, 0], [293.7, 0]].forEach(([f]) => S.organ(f, 0, 1.4, 0.06)); [[138.6], [174.6], [207.7], [277.2]].forEach(([f]) => S.organ(f, 1.3, 2.0, 0.06)); });
R('organHit', 2.2, S => { [73.4, 146.8, 174.6, 220, 293.7].forEach(f => S.organ(f, 0, 2.0, 0.06)); });
R('wail', 1.8, S => { S.osc('sine', 720, 0, 1.6, 0.08, { to: 260, att: 0.25 }); S.osc('sine', 727, 0.05, 1.6, 0.05, { to: 262, att: 0.3 }); S.noise(0, 1.5, 0.04, { bp: 700, bpTo: 260, q: 6, att: 0.3 }); });
R('creak', 1.2, S => { for (let i = 0; i < 18; i++) S.osc('sawtooth', 90 + Math.sin(i * 0.7) * 25, i * 0.055, 0.05, 0.05, { lp: 700 }); S.noise(0, 1.0, 0.03, { bp: 400, q: 4 }); });
R('knockDoor', 0.25, S => { S.osc('sine', 140, 0, 0.12, 0.6, { to: 80 }); S.noise(0, 0.06, 0.45, { lp: 700 }); });
R('chains', 0.9, S => { for (let i = 0; i < 12; i++) S.ring(2200 + (i * 397 % 1600), i * 0.06 + (i % 3) * 0.01, 0.12, 0.05, [1, 2.3, 3.7]); });
R('toll', 4.0, S => { S.bell(196, 0, 3.8, 0.22); S.bell(98, 0, 3.8, 0.12); });
R('lid', 1.0, S => { S.noise(0, 0.8, 0.2, { bp: 300, bpTo: 900, q: 3, att: 0.1 }); S.osc('sawtooth', 70, 0, 0.8, 0.04, { lp: 300 }); S.osc('sine', 90, 0.8, 0.15, 0.4, { to: 50 }); });
R('heart', 0.6, S => { S.osc('sine', 60, 0, 0.12, 0.5, { to: 40 }); S.osc('sine', 55, 0.18, 0.14, 0.4, { to: 38 }); });
R('spook', 2.0, S => { S.pad(110, 0, 1.8, 0.08, { lp: 700, att: 0.4 }); S.pad(116.5, 0, 1.8, 0.06, { lp: 700, att: 0.4 }); S.bell(1760, 0.2, 1.4, 0.03); S.bell(1864.7, 0.5, 1.2, 0.025); });
R('owl', 1.2, S => { S.osc('sine', 392, 0, 0.35, 0.05, { to: 370, att: 0.05 }); S.osc('sine', 392, 0.5, 0.55, 0.05, { to: 360, att: 0.05 }); });
R('dark', 1.6, S => { S.osc('sine', 300, 0, 1.4, 0.18, { to: 60 }); S.noise(0, 0.3, 0.3, { lp: 300 }); S.osc('sine', 40, 0.1, 1.4, 0.3); });

// ── Engine ──────────────────────────────────────────────────────────────
export class Audio {
  constructor() {
    this.ac = null; this.bufs = {}; this.ready = false; this.last = {}; this.music = { bufs: {}, loading: {}, src: null, g: null, id: null };
    this.roll = null; this.enabled = true; this.extra = {}; this.speakQ = null; this.duckT = 0; this.voice = null;
  }
  soundOn() { try { return localStorage.getItem('gn_sound') !== '0'; } catch (e) { return true; } }
  ctx(paused) {
    if (!this.soundOn() || !this.enabled) return null;
    if (!this.ac) {
      const C = window.AudioContext || window.webkitAudioContext; if (!C) return null;
      try { this.ac = new C(); } catch (e) { return null; }
      const a = this.ac;
      this.master = a.createGain(); this.master.gain.value = 0.9;
      const comp = a.createDynamicsCompressor(); comp.threshold.value = -10; comp.knee.value = 3; comp.ratio.value = 16; comp.attack.value = 0.002; comp.release.value = 0.15;
      this.master.connect(comp); comp.connect(a.destination);
      this.sfxBus = a.createGain(); this.sfxBus.gain.value = 1; this.sfxBus.connect(this.master);
      this.musicBus = a.createGain(); this.musicBus.gain.value = 1; this.musicBus.connect(this.master);
      // small room reverb (generated impulse)
      try {
        const len = Math.floor(a.sampleRate * 1.1), ir = a.createBuffer(2, len, a.sampleRate);
        for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); let lp = 0; for (let i = 0; i < len; i++) { const t = i / a.sampleRate, n = Math.random() * 2 - 1; lp += (n - lp) * (0.35 - 0.25 * t); d[i] = lp * Math.exp(-t * 5.5) * (i < a.sampleRate * 0.004 ? 0 : 1) * (1 + (i % 997 === 0 ? 4 : 0)); } }
        this.verb = a.createConvolver(); this.verb.buffer = ir; this.verbIn = a.createGain(); this.verbIn.gain.value = 0.16; this.verbIn.connect(this.verb); this.verb.connect(this.master);
      } catch (e) { this.verbIn = null; }
    }
    if (this.ac.state === 'suspended' && !paused) try { this.ac.resume(); } catch (e) {}
    return this.ac;
  }
  // pre-render the bank in the background (the first few sounds first), yielding to the page between sounds
  ensureBank() {
    if (this.banking) return this.banking;
    const first = ['start', 'flipUp', 'flipDn', 'pull', 'launch', 'trough', 'metal', 'metal2', 'rail', 'rubber', 'wood', 'plastic', 'pop', 'sling', 'rollover', 'drain', 'save', 'gate'];
    this.banking = this.render(first).then(() => this.render());
    return this.banking;
  }
  // pre-render the bank (async; plays as soon as each one is ready)
  async render(names) {
    const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext; if (!OAC) return;
    const list = names || Object.keys(RECIPES), t0 = performance.now();
    for (const n of list) {
      if (this.bufs[n] || !RECIPES[n]) continue;
      await new Promise(r => setTimeout(r, 0));   // let the page breathe between sounds
      const [dur, fn] = RECIPES[n];
      try {
        const oc = new OAC(1, Math.ceil(SR * dur), SR);
        fn(synth(oc));
        this.bufs[n] = await new Promise((res, rej) => { const p = oc.startRendering(); if (p && p.then) p.then(res, rej); else oc.oncomplete = e => res(e.renderedBuffer); });
      } catch (e) { /* skip that sound */ }
    }
    this.ready = true; this.renderMs = (this.renderMs || 0) + Math.round(performance.now() - t0);
  }
  // custom recipe from a table: name, duration, fn(S)
  define(name, dur, fn) { RECIPES[name] = [dur, fn]; if (this.banking) this.banking = this.banking.then(() => this.render([name])); }
  // play: o = {vol, rate (pitch), pan (-1..1), gap (min seconds between), verb (reverb send 0..1), when}
  play(name, o = {}) {
    const a = this.ctx(); if (!a) return;
    const buf = this.bufs[name]; if (!buf) return;
    const now = a.currentTime, gap = o.gap != null ? o.gap : 0.03;
    if (this.last[name] && now - this.last[name] < gap) return;
    this.last[name] = now;
    const s = a.createBufferSource(); s.buffer = buf; s.playbackRate.value = o.rate || 1;
    const g = a.createGain(); g.gain.value = o.vol == null ? 1 : o.vol;
    let n = s; s.connect(g); n = g;
    if (o.pan && a.createStereoPanner) { const p = a.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, o.pan)); g.connect(p); n = p; }
    n.connect(this.sfxBus);
    if (this.verbIn && o.verb !== 0) { const vs = a.createGain(); vs.gain.value = o.verb == null ? 0.5 : o.verb; n.connect(vs); vs.connect(this.verbIn); }
    s.start(now + (o.when || 0));
  }
  // ── Rolling: steel on wood rumble + ramp rattle/hollow ──
  rollUpdate(st, paused) {
    const a = this.ac; if (!a || a.state !== 'running' || !this.soundOn() || paused) { this.rollStop(); return; }
    if (!this.roll) {
      const n = Math.floor(a.sampleRate * 2), nb = a.createBuffer(1, n, a.sampleRate), d = nb.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      const mk = (type, f, q) => { const s = a.createBufferSource(), bf = a.createBiquadFilter(), g = a.createGain(); s.buffer = nb; s.loop = true; bf.type = type; bf.frequency.value = f; bf.Q.value = q; g.gain.value = 0.0001; s.connect(bf); bf.connect(g); g.connect(this.sfxBus); s.start(0, Math.random()); return { s, f: bf, g }; };
      this.roll = { a: mk('bandpass', 150, 1.4), b: mk('bandpass', 2600, 10), c: mk('lowpass', 70, 2) };
    }
    const r = this.roll, now = a.currentTime, v = st.v || 0, k = Math.min(1, v / 1800);
    r.a.g.gain.setTargetAtTime(0.0002 + 0.07 * k * k, now, 0.04); r.a.f.frequency.setTargetAtTime(90 + v * 0.12, now, 0.05);
    r.c.g.gain.setTargetAtTime(0.0002 + 0.06 * k * k, now, 0.05);
    const rv = st.rv || 0, wire = st.rs === 'wire', rk = Math.min(1, rv / 1300);
    r.b.f.frequency.setTargetAtTime(wire ? 2400 + rv * 0.5 : 600 + rv * 0.22, now, 0.05); r.b.f.Q.setTargetAtTime(wire ? 14 : 3, now, 0.05);
    r.b.g.gain.setTargetAtTime(rv ? 0.0002 + (wire ? 0.05 : 0.06) * rk * (wire ? 0.6 + 0.4 * Math.random() : 1) : 0.0001, now, 0.03);
  }
  rollStop() { const r = this.roll; if (!r || !this.ac) return; const t = this.ac.currentTime; [r.a, r.b, r.c].forEach(x => { try { x.g.gain.setTargetAtTime(0.0001, t, 0.05); x.s.stop(t + 0.3); } catch (e) {} }); this.roll = null; }
  // ── Music ──
  musicLoad(id, url) {
    const M = this.music; if (M.bufs[id] || M.loading[id] || !url) return;
    const a = this.ctx(); if (!a || !window.fetch) return;
    M.loading[id] = 1; const t0 = performance.now();
    fetch(url).then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
      .then(ab => new Promise((res, rej) => { const p = a.decodeAudioData(ab, res, rej); if (p && p.catch) p.catch(rej); }))
      .then(buf => { M.bufs[id] = buf; M.loading[id] = 0; M.decodeMs = Math.round(performance.now() - t0); })
      .catch(() => { M.loading[id] = 2; });
  }
  musicTick(want, id, url, loopSamples, loopRate, level) {
    const a = this.ac, M = this.music; if (!a || a.state !== 'running') return;
    if (!want) { this.musicStop(); return; }
    if (M.src && M.id !== id) this.musicStop(true);
    if (!M.src) {
      const buf = M.bufs[id]; if (!buf) { this.musicLoad(id, url); return; }
      const d = buf.getChannelData(0); let lead = 0; const lim = Math.min(d.length, 8000);
      while (lead < lim && Math.abs(d[lead]) < 1e-3) lead++; if (lead >= lim) lead = 0;
      const s = a.createBufferSource(), g = a.createGain();
      s.buffer = buf; s.loop = true; s.loopStart = lead / buf.sampleRate;
      s.loopEnd = loopSamples ? Math.min(buf.duration, s.loopStart + loopSamples / (loopRate || 32000)) : buf.duration;
      g.gain.value = 0.0001; s.connect(g); g.connect(this.musicBus); s.start(0, s.loopStart);
      M.src = s; M.g = g; M.id = id;
    }
    const duck = (this.speaking ? 0.35 : 1) * (level == null ? 1 : level);
    M.g.gain.setTargetAtTime(0.11 * duck, a.currentTime, M.g.gain.value < 0.001 ? 1.4 : 0.5);
  }
  musicStop(fast) {
    const M = this.music; if (!M.src || !this.ac) return;
    const s = M.src, g = M.g; M.src = null;
    try { g.gain.setTargetAtTime(0.0001, this.ac.currentTime, fast ? 0.04 : 0.4); s.stop(this.ac.currentTime + (fast ? 0.25 : 2)); } catch (e) {}
  }
  // ── Speech (talking pinball) ──
  say(text, o = {}) {
    if (!this.soundOn() || !this.enabled || !window.speechSynthesis || !window.SpeechSynthesisUtterance) return false;
    const ss = window.speechSynthesis;
    if (ss.speaking || ss.pending) { if (!o.force) return false; ss.cancel(); }
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.pitch = o.pitch != null ? o.pitch : 1; u.rate = o.rate != null ? o.rate : 1; u.volume = o.volume != null ? o.volume : 0.9;
      const v = this.pickVoice(o.voice); if (v) u.voice = v;
      u.onend = u.onerror = () => { this.speaking = false; };
      this.speaking = true; ss.speak(u);
      setTimeout(() => { this.speaking = false; }, 6000);
      return true;
    } catch (e) { return false; }
  }
  pickVoice(hint) {
    if (!window.speechSynthesis) return null;
    const vs = window.speechSynthesis.getVoices() || []; if (!vs.length) return null;
    const en = vs.filter(v => /^en/i.test(v.lang));
    if (hint) { const re = new RegExp(hint, 'i'); const m = en.find(v => re.test(v.name)); if (m) return m; }
    return en[0] || null;
  }
  hush() { try { if (window.speechSynthesis) window.speechSynthesis.cancel(); } catch (e) {} this.speaking = false; }
  suspend() { this.rollStop(); this.musicStop(true); this.hush(); if (this.ac && this.ac.state === 'running') try { this.ac.suspend(); } catch (e) {} }
  resume() { if (this.ac && this.ac.state === 'suspended') try { this.ac.resume(); } catch (e) {} }
}
export { RECIPES };
