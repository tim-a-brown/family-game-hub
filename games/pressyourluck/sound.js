// ═══════════════════════════════════════════════════════════════════════════
// Press Your Luck: synthesized sound. Everything here is made on the fly with
// Web Audio (original jingles, no recordings): board bleeps, the stop thunk,
// cash bells, prize fanfares, the Whammy's zap and cackle, a clap-along
// "big bucks, no whammies" rhythm (no voices), and the show's music stings.
// Respects the kit's Sound switch (localStorage gn_sound).
// ═══════════════════════════════════════════════════════════════════════════
var PYLSound = (function () {
  'use strict';
  var ac = null, out = null, verb = null;
  function on() { try { return localStorage.getItem('gn_sound') !== '0'; } catch (e) { return true; } }
  function ctx() {
    if (!on()) return null;
    if (!ac) {
      var C = window.AudioContext || window.webkitAudioContext; if (!C) return null;
      ac = new C(); out = ac.createGain(); out.gain.value = 0.75;
      var comp = ac.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
      out.connect(comp); comp.connect(ac.destination);
      // a little studio room: a short feedback echo
      verb = ac.createDelay(); verb.delayTime.value = 0.09;
      var fb = ac.createGain(); fb.gain.value = 0.22; var vl = ac.createBiquadFilter(); vl.type = 'lowpass'; vl.frequency.value = 2600;
      var vo = ac.createGain(); vo.gain.value = 0.35;
      verb.connect(vl); vl.connect(fb); fb.connect(verb); vl.connect(vo); vo.connect(out);
    }
    if (ac.state === 'suspended') { try { ac.resume(); } catch (e) {} }
    return ac;
  }
  function env(g, t, a, d, v, sus) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + a);
    if (sus) g.gain.setValueAtTime(v, t + a + sus);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + (sus || 0) + d);
  }
  // one oscillator note: o = {type, f, f2 (slide), t (start offset), a, d, sus, v, wet, det, lp}
  function note(o) {
    var a = ctx(); if (!a) return;
    var t = a.currentTime + (o.t || 0), os = a.createOscillator(), g = a.createGain(), last = g;
    os.type = o.type || 'sine'; os.frequency.setValueAtTime(o.f, t);
    if (o.det) os.detune.value = o.det;
    if (o.f2) os.frequency.exponentialRampToValueAtTime(o.f2, t + (o.slide || (o.a || 0.01) + (o.d || 0.2)));
    if (o.vib) { var l = a.createOscillator(), lg = a.createGain(); l.frequency.value = o.vib; lg.gain.value = o.vibd || 8; l.connect(lg); lg.connect(os.frequency); l.start(t); l.stop(t + (o.a || .01) + (o.sus || 0) + (o.d || .2) + .05); }
    os.connect(g);
    if (o.lp) {
      var f = a.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = o.q || 1;
      f.frequency.setValueAtTime(o.lp, t);
      if (o.lp2) { f.frequency.exponentialRampToValueAtTime(o.lp2, t + (o.a || .01) + .05); f.frequency.exponentialRampToValueAtTime(o.lp, t + (o.a || .01) + (o.sus || 0) + (o.d || .2)); }
      g.connect(f); last = f;
    }
    env(g, t, o.a || 0.006, o.d || 0.2, o.v || 0.1, o.sus);
    last.connect(out); if (o.wet && verb) { var w = a.createGain(); w.gain.value = o.wet; last.connect(w); w.connect(verb); }
    os.start(t); os.stop(t + (o.a || .006) + (o.sus || 0) + (o.d || .2) + 0.05);
  }
  var nbuf = null;
  function noise(o) {
    var a = ctx(); if (!a) return;
    if (!nbuf) { nbuf = a.createBuffer(1, a.sampleRate, a.sampleRate); var d = nbuf.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    var t = a.currentTime + (o.t || 0), s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    s.buffer = nbuf; s.loop = true;
    f.type = o.ft || 'bandpass'; f.frequency.setValueAtTime(o.f || 1000, t); f.Q.value = o.q || 1;
    if (o.f2) f.frequency.exponentialRampToValueAtTime(o.f2, t + (o.a || .005) + (o.sus || 0) + (o.d || .1));
    env(g, t, o.a || 0.004, o.d || 0.1, o.v || 0.08, o.sus);
    s.connect(f); f.connect(g); g.connect(out);
    if (o.wet && verb) { var w = a.createGain(); w.gain.value = o.wet; g.connect(w); w.connect(verb); }
    s.start(t, Math.random() * 0.5); s.stop(t + (o.a || .005) + (o.sus || 0) + (o.d || .1) + 0.05);
  }
  var N = function (m) { return 440 * Math.pow(2, (m - 69) / 12); };   // MIDI note to Hz
  // 80s synth brass: two detuned saws through a filter that opens on the attack
  function brass(m, t, dur, v) {
    [-9, 9].forEach(function (det) { note({ type: 'sawtooth', f: N(m), det: det, t: t, a: 0.03, sus: Math.max(0, dur - 0.12), d: 0.18, v: (v || 0.05), lp: 900, lp2: 3800, q: 2, wet: 0.25 }); });
  }
  function chord(ms, t, dur, v) { ms.forEach(function (m) { brass(m, t, dur, v); }); }
  function snare(t, v) { noise({ t: t, f: 1800, q: .7, d: .12, v: v || .07 }); note({ type: 'triangle', f: 190, f2: 120, t: t, d: .08, v: .05 }); }
  function kick(t, v) { note({ type: 'sine', f: 120, f2: 45, t: t, d: .22, v: v || .2, slide: .15 }); }
  function clap(t, v) { [0, .012, .024].forEach(function (o) { noise({ t: t + o, f: 1300, q: 1.6, d: .07, v: (v || .07) * (o ? .7 : 1), wet: .3 }); }); }

  // ── Board ────────────────────────────────────────────────────────────────
  var HOP = [76, 79, 81, 83, 84, 86, 88, 91];
  var lastHop = 0;
  function hop() {
    var i; do { i = Math.floor(Math.random() * HOP.length); } while (i === lastHop); lastHop = i;
    var f = N(HOP[i]);
    note({ type: 'square', f: f, f2: f * 0.94, d: 0.05, v: 0.035, lp: 3200 });
    note({ type: 'triangle', f: f * 2, d: 0.03, v: 0.03 });
  }
  function stop() {
    kick(0, .26); noise({ f: 2400, q: .8, d: .04, v: .09 });
    note({ type: 'square', f: N(84), t: .05, d: .08, v: .05, lp: 3000 });
    note({ type: 'square', f: N(88), t: .14, d: .08, v: .05, lp: 3000 });
    note({ type: 'square', f: N(91), t: .23, d: .14, v: .05, lp: 3000 });
  }
  function blink() { note({ type: 'square', f: N(96), d: .05, v: .03, lp: 3600 }); }
  function cash(v) {
    var big = v >= 3000;
    // a cash-register bell, brighter for bigger money
    note({ type: 'sine', f: N(88), d: .9, v: .14, wet: .4 }); note({ type: 'sine', f: N(95), d: .7, v: .07, wet: .4 });
    note({ type: 'triangle', f: N(100), t: .02, d: .5, v: .04 });
    noise({ f: 5200, q: 1.2, d: .06, v: .05 });
    if (big) [84, 88, 91, 96].forEach(function (m, i) { note({ type: 'square', f: N(m), t: .12 + i * .07, d: .16, v: .035, lp: 3200, wet: .3 }); });
  }
  function spin() { [79, 84, 88, 91, 96].forEach(function (m, i) { note({ type: 'triangle', f: N(m), t: i * .055, d: .14, v: .07, wet: .3 }); }); }
  function prize() {
    chord([60, 64, 67], 0, .14, .045); chord([60, 64, 67], .16, .12, .045); chord([65, 69, 72], .3, .14, .045); chord([67, 71, 74, 79], .46, .7, .05);
    snare(.46, .06); kick(.46);
    [84, 88, 91, 96].forEach(function (m, i) { note({ type: 'square', f: N(m), t: .5 + i * .06, d: .1, v: .025, lp: 4000 }); });
  }
  function bigBucks() {
    // a quick fanfare and claps, the crowd's "big bucks!" without voices
    chord([67, 71, 74], 0, .1, .045); chord([67, 71, 74], .12, .1, .045); chord([72, 76, 79, 84], .26, .55, .05);
    clap(0); clap(.12); clap(.26, .1); kick(.26);
  }
  function doubled() { [72, 76, 79, 84, 88, 91, 96].forEach(function (m, i) { note({ type: 'square', f: N(m), t: i * .05, d: .12, v: .03, lp: 3600, wet: .3 }); }); chord([72, 76, 79, 84], .38, .5, .05); }
  function move(dir) { note({ type: 'triangle', f: dir > 0 ? N(79) : N(84), f2: dir > 0 ? N(84) : N(76), d: .14, v: .08, slide: .12 }); }

  // ── The Whammy ───────────────────────────────────────────────────────────
  function zap(t) {
    note({ type: 'sawtooth', f: 1400, f2: 70, t: t || 0, d: .55, v: .07, slide: .5, vib: 34, vibd: 120, lp: 3000 });
    note({ type: 'square', f: 900, f2: 50, t: (t || 0) + .02, d: .5, v: .04, slide: .45 });
  }
  // a gremlin's "heh-heh-heh-heh": a buzzy voice through two vowel filters, falling in pitch
  function cackle(t0, n, pitch) {
    var a = ctx(); if (!a) return;
    n = n || 5; pitch = pitch || 1;
    for (var i = 0; i < n; i++) {
      var t = a.currentTime + (t0 || 0) + i * 0.13, f0 = (360 - i * 18) * pitch;
      var os = a.createOscillator(), g = a.createGain(), f1 = a.createBiquadFilter(), f2 = a.createBiquadFilter(), mix = a.createGain();
      os.type = 'sawtooth'; os.frequency.setValueAtTime(f0 * 1.15, t); os.frequency.exponentialRampToValueAtTime(f0 * 0.82, t + 0.09);
      f1.type = 'bandpass'; f1.frequency.value = 760 * pitch; f1.Q.value = 5;
      f2.type = 'bandpass'; f2.frequency.value = 1650 * pitch; f2.Q.value = 6;
      mix.gain.value = 1.6;
      env(g, t, 0.008, 0.09, 0.22);
      os.connect(f1); os.connect(f2); f1.connect(g); f2.connect(g); g.connect(mix); mix.connect(out);
      os.start(t); os.stop(t + 0.12);
      noise({ t: (t0 || 0) + i * .13, f: 3000, q: 1, d: .03, v: .025 });   // breathy "h"
    }
  }
  function whammy(variant) {
    zap(0);
    if (variant === 'eraser') {
      for (var i = 0; i < 6; i++) noise({ t: .55 + i * .16, f: 900 + (i % 2) * 500, q: 3, d: .1, v: .05 });
      note({ type: 'sine', f: 1900, f2: 2600, t: .6, d: .06, v: .02 }); note({ type: 'sine', f: 2100, f2: 2800, t: 1.1, d: .06, v: .02 });
      cackle(1.7, 5);
    } else if (variant === 'bomb') {
      for (var j = 0; j < 8; j++) noise({ t: .5 + j * .08, f: 5000, q: 2, d: .04, v: .025 });   // fizzing fuse
      noise({ t: 1.3, ft: 'lowpass', f: 900, f2: 80, d: .9, v: .22 }); kick(1.3, .32); note({ type: 'sine', f: 70, f2: 30, t: 1.3, d: .7, v: .2, slide: .6 });
      cackle(2.0, 4, .9);
    } else if (variant === 'vacuum') {
      noise({ t: .4, f: 300, f2: 2400, q: 2.5, a: .25, sus: .9, d: .3, v: .07 });
      note({ type: 'sawtooth', f: 90, f2: 160, t: .4, a: .2, sus: .9, d: .3, v: .03, lp: 700, slide: 1.2 });
      for (var k = 0; k < 6; k++) note({ type: 'sine', f: 1200 + k * 120, f2: 2600, t: .8 + k * .13, d: .08, v: .025 });
      cackle(1.9, 5, 1.08);
    } else if (variant === 'hat') {
      [96, 100, 103, 108, 103, 100].forEach(function (m, i) { note({ type: 'sine', f: N(m), t: .45 + i * .06, d: .2, v: .04, wet: .5 }); });
      noise({ t: 1.05, f: 1200, f2: 300, q: .8, d: .45, v: .12 }); kick(1.05, .12);
      chord([72, 76, 79], 1.6, .3, .035);
      cackle(1.95, 4, 1.15);
    } else {   // mallet
      note({ type: 'sine', f: 300, f2: 900, t: .5, d: .35, v: .04, slide: .35 });
      note({ type: 'square', f: 180, f2: 90, t: 1.0, d: .12, v: .1, lp: 1200 }); kick(1.0, .3); noise({ t: 1.0, f: 600, q: 2, d: .1, v: .12 });
      for (var c = 0; c < 6; c++) note({ type: 'square', f: N(96 + (c % 3) * 3), t: 1.08 + c * .07, d: .08, v: .025, lp: 5000 });
      cackle(1.8, 5);
    }
    // a sad little "wah-wah" under the end
    note({ type: 'sawtooth', f: N(55), f2: N(53), t: 2.4, d: .35, v: .04, lp: 900, slide: .3 });
    note({ type: 'sawtooth', f: N(52), f2: N(47), t: 2.75, d: .6, v: .04, lp: 800, slide: .55, vib: 6, vibd: 6 });
  }
  function out4() {
    zap(0); cackle(.4, 7, .95);
    [67, 66, 65, 64].forEach(function (m, i) { note({ type: 'sawtooth', f: N(m - 12), t: 1.4 + i * .3, d: .3, v: .045, lp: 900, vib: 5, vibd: 5 }); });
  }

  // ── Clap-along while the board runs (no voices) ──────────────────────────
  // "Big bucks, no whammies" as claps: ta-ta, ta-ta-ta … then a stomp
  var chantT = 0, chantOn = false;
  function chantBar() {
    if (!chantOn || !ctx()) return;
    var hits = [0, .19, .48, .67, .86]; hits.forEach(function (t, i) { clap(t, i === 0 || i === 2 ? .06 : .045); });
    kick(0, .09); kick(.48, .09);
    chantT = setTimeout(chantBar, 1300);
  }
  function chant(onOff) {
    clearTimeout(chantT); chantOn = !!onOff;
    if (chantOn) chantT = setTimeout(chantBar, 250);
  }

  // ── Music stings (original) ──────────────────────────────────────────────
  function intro() {
    var s = 0.15;   // a bright 80s brass fanfare over a bass run
    [55, 59, 62, 67, 71, 74, 79].forEach(function (m, i) { note({ type: 'square', f: N(m), t: i * .055, d: .09, v: .03, lp: 3000 }); });
    chord([67, 71, 74], .45, .12, .05); chord([67, 71, 74], .45 + s, .12, .05); chord([69, 72, 76], .45 + 2 * s, .2, .05);
    chord([71, 74, 79], .45 + 3.5 * s, .14, .05); chord([72, 76, 79, 84], .45 + 4.5 * s, .9, .055);
    [43, 43, 45, 47, 48].forEach(function (m, i) { note({ type: 'sawtooth', f: N(m), t: .45 + [0, 1, 2, 3.5, 4.5][i] * s, d: .2, v: .07, lp: 600 }); });
    [0, 1, 2, 3.5, 4.5].forEach(function (k) { snare(.45 + k * s, .05); }); kick(.45 + 4.5 * s, .25);
  }
  function round(n) {
    var b = n === 2 ? 2 : 0;
    chord([60 + b, 64 + b, 67 + b], 0, .1, .05); chord([62 + b, 65 + b, 69 + b], .14, .1, .05); chord([64 + b, 67 + b, 72 + b, 76 + b], .3, .6, .055);
    kick(0); kick(.3); snare(.14); snare(.3, .08);
  }
  function turn() { note({ type: 'square', f: N(79), d: .07, v: .04, lp: 3000 }); note({ type: 'square', f: N(86), t: .08, d: .12, v: .04, lp: 3000 }); }
  function right() { note({ type: 'sine', f: N(84), d: .6, v: .12, wet: .3 }); note({ type: 'sine', f: N(91), t: .1, d: .7, v: .09, wet: .3 }); note({ type: 'triangle', f: N(96), t: .1, d: .5, v: .04 }); }
  function wrong() { note({ type: 'square', f: 110, d: .5, v: .06, lp: 800 }); note({ type: 'sawtooth', f: 116, d: .5, v: .04, lp: 700 }); }
  function tick() { note({ type: 'square', f: N(93), d: .025, v: .02, lp: 4000 }); }
  function bulbOff() { note({ type: 'triangle', f: N(81), f2: N(76), d: .06, v: .03 }); }
  function pass() { [79, 76, 72].forEach(function (m, i) { note({ type: 'triangle', f: N(m), t: i * .07, d: .12, v: .06 }); }); }
  function finale() {
    var s = .16;
    [[60, 64, 67], [65, 69, 72], [67, 71, 74], [72, 76, 79, 84]].forEach(function (c, i) { chord(c, i * s * 1.5, i === 3 ? 1.2 : .18, .05); snare(i * s * 1.5, .06); });
    [48, 53, 55, 48].forEach(function (m, i) { note({ type: 'sawtooth', f: N(m), t: i * s * 1.5, d: .3, v: .07, lp: 600 }); });
    [84, 88, 91, 96, 100].forEach(function (m, i) { note({ type: 'square', f: N(m), t: .75 + i * .06, d: .14, v: .03, lp: 4000, wet: .4 }); });
  }
  // toss-ups: each seat's buzzer has its own pitch; the lock-in click; nobody buzzed
  function buzz(seat) {
    var f = [330, 392, 466][seat % 3] || 330;
    note({ type: 'square', f: f, d: .32, v: .07, lp: 2400 }); note({ type: 'sawtooth', f: f * 1.5, d: .3, v: .04, lp: 2000 });
    note({ type: 'sine', f: N(91), t: .05, d: .5, v: .08, wet: .3 });
  }
  function lock() { note({ type: 'square', f: N(76), d: .05, v: .05, lp: 2600 }); note({ type: 'square', f: N(83), t: .06, d: .09, v: .05, lp: 2600 }); noise({ f: 2600, q: 2, d: .03, v: .05 }); }
  function timeup() { note({ type: 'sawtooth', f: N(58), d: .5, v: .05, lp: 900 }); note({ type: 'sawtooth', f: N(53), t: .2, d: .6, v: .05, lp: 800 }); }
  // the bonus round's entrance: a big brass build, then the Whammy laughs
  function bonus() {
    [55, 60, 62, 67].forEach(function (m, i) { note({ type: 'sawtooth', f: N(m - 12), t: i * .18, d: .2, v: .06, lp: 700 }); snare(i * .18, .05); });
    chord([67, 71, 74], .72, .16, .05); chord([69, 72, 76], .9, .16, .05); chord([71, 74, 79, 83], 1.08, 1.1, .055); kick(1.08, .25);
    [91, 95, 98, 103].forEach(function (m, i) { note({ type: 'square', f: N(m), t: 1.15 + i * .06, d: .12, v: .025, lp: 4000, wet: .4 }); });
    cackle(2.1, 5, 1);
  }
  return { buzz: buzz, lock: lock, timeup: timeup, bonus: bonus, hop: hop, stop: stop, blink: blink, cash: cash, spin: spin, prize: prize, bigBucks: bigBucks, doubled: doubled, move: move,
    whammy: whammy, out4: out4, chant: chant, intro: intro, round: round, turn: turn, right: right, wrong: wrong, tick: tick, bulbOff: bulbOff, pass: pass, finale: finale, cackle: cackle };
})();
