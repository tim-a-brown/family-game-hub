// Centipede's sound: layered effects, an original electronic soundtrack and an announcer, all made in the browser
// (WebAudio synthesis and the device's own speech voice; no recordings, so nothing to license).
//
//   var CA = CentiAudio.create({ ctx: ac, out: function () { return master; }, view: function () { return R; } });
//   CA.play(name, x)    a sound effect; x (game units, 0..W) pans it left/right
//   CA.music.tick()     every frame while a wave is being played (schedules a little ahead)
//   CA.music.stop(hard) pause, game over, menu
//   CA.music.menuItem   { icon, label, toggle, onClick } for Kit.init({ menu })
//   CA.say(text, prio)  the announcer (prio 2 cuts in over anything; 1 waits its turn; 0 is skipped when busy)
//   CA.voiceItem        menu toggle for the announcer
(function () {
  'use strict';
  var TAU = Math.PI * 2;
  function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} if (window.FGHSync && FGHSync.noteWrite) FGHSync.noteWrite(k); }

  function create(o) {
    var MUSV = 0.4, A = null, sfx = null, mus = null, revIn = null, nbuf = null, dly = null, W = o.width || 400;
    function ctx() {
      var a = o.ctx(); if (!a) return null;
      if (a !== A) build(a);
      return a;
    }
    function build(a) {
      A = a;
      var out = o.out();
      sfx = A.createGain(); sfx.gain.value = 2.2; sfx.connect(out);
      mus = A.createGain(); mus.gain.value = MUSV; mus.connect(out);
      // a hall reverb from a generated impulse: decaying stereo noise
      var len = Math.floor(A.sampleRate * 1.8), ib = A.createBuffer(2, len, A.sampleRate);
      for (var ch = 0; ch < 2; ch++) { var d = ib.getChannelData(ch); for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
      var cv = A.createConvolver(); cv.buffer = ib; revIn = A.createGain(); revIn.gain.value = 0.6; revIn.connect(cv); cv.connect(out);
      nbuf = A.createBuffer(1, A.sampleRate, A.sampleRate);
      var nd = nbuf.getChannelData(0); for (var j = 0; j < nd.length; j++) nd[j] = Math.random() * 2 - 1;
      // a dotted-eighth echo for the music's arpeggio
      dly = A.createDelay(1); var fb = A.createGain(), dl = A.createGain(), dlp = A.createBiquadFilter();
      dly.delayTime.value = 0.36; fb.gain.value = 0.32; dl.gain.value = 0.35; dlp.type = 'lowpass'; dlp.frequency.value = 2600;
      dly.connect(dlp); dlp.connect(fb); fb.connect(dly); dlp.connect(dl); dl.connect(mus);
    }
    function panNode(x) {
      if (x == null || !A.createStereoPanner) return null;
      var p = A.createStereoPanner(); p.pan.value = Math.max(-0.8, Math.min(0.8, (x / W) * 2 - 1)) * 0.75; return p;
    }
    // One voice: an oscillator (or noise) through an envelope, optional filter, pan, reverb send.
    // p: {t, dur, vol, f, to, type, a (attack), lp, hp, bp, q, sweep (filter to), x, rv (reverb send), det, vib, bus}
    function voice(p, isNoise) {
      var a = A, t = a.currentTime + (p.t || 0), dur = p.dur || 0.1, src;
      if (isNoise) { src = a.createBufferSource(); src.buffer = nbuf; src.playbackRate.value = p.rate || 1; }
      else {
        src = a.createOscillator(); src.type = p.type || 'square'; src.frequency.setValueAtTime(p.f, t);
        if (p.to) src.frequency.exponentialRampToValueAtTime(Math.max(20, p.to), t + (p.glide || dur));
        if (p.det) src.detune.value = p.det;
        if (p.vib) { var lfo = a.createOscillator(), lg = a.createGain(); lfo.frequency.value = p.vib[0]; lg.gain.value = p.vib[1]; lfo.connect(lg); lg.connect(src.frequency); lfo.start(t); lfo.stop(t + dur + 0.1); }
      }
      var node = src, filt = null;
      if (p.lp || p.hp || p.bp) {
        filt = a.createBiquadFilter(); filt.type = p.lp ? 'lowpass' : p.hp ? 'highpass' : 'bandpass';
        var ff = p.lp || p.hp || p.bp; filt.frequency.setValueAtTime(ff, t); if (p.q) filt.Q.value = p.q;
        if (p.sweep) filt.frequency.exponentialRampToValueAtTime(Math.max(30, p.sweep), t + dur);
        node.connect(filt); node = filt;
      }
      var g = a.createGain(), at = p.a || 0.004, v = p.vol || 0.1;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + at);
      if (p.hold) g.gain.setValueAtTime(v, t + at + p.hold);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      node.connect(g);
      var pn = panNode(p.x), last = g; if (pn) { g.connect(pn); last = pn; }
      last.connect(p.bus || sfx);
      if (p.rv) { var sg = a.createGain(); sg.gain.value = p.rv; last.connect(sg); sg.connect(revIn); }
      if (p.echo) { var eg = a.createGain(); eg.gain.value = p.echo; last.connect(eg); eg.connect(dly); }
      if (isNoise) src.start(t, Math.random() * 0.6); else src.start(t);
      src.stop(t + dur + 0.05);
    }
    function tn(p) { voice(p, false); }
    function nz(p) { voice(p, true); }
    function vary(f) { return f * (0.96 + Math.random() * 0.08); }
    // building blocks
    function sub(t, f, dur, vol, x) { tn({ t: t, type: 'sine', f: f, to: Math.max(28, f * 0.35), dur: dur, vol: vol, x: x }); }
    function crack(t, vol, x, f) { nz({ t: t, hp: f || 2500, dur: 0.03, vol: vol, x: x }); }
    function boomL(t, vol, x, len) { nz({ t: t, lp: 2200, sweep: 90, dur: len || 0.7, vol: vol, x: x, rv: 0.35 }); sub(t, 110, (len || 0.7) * 0.9, vol * 0.9, x); }
    function chime(t, m, vol, x, len) { tn({ t: t, type: 'triangle', f: mtof(m), dur: len || 0.3, vol: vol, x: x, rv: 0.4 }); tn({ t: t, type: 'sine', f: mtof(m + 12), dur: (len || 0.3) * 0.7, vol: vol * 0.4, x: x, rv: 0.4 }); }
    function arp(t, ms, step, vol, type, x, rv) { ms.forEach(function (m, i) { tn({ t: t + i * step, type: type || 'square', f: mtof(m), dur: step * 2.2, vol: vol, lp: 4500, x: x, rv: rv || 0.25 }); }); }

    // ── Effects ──
    var FX = {
      // your blaster: a bright, tight zap with a tiny thump; quiet (it fires a lot)
      shot: function (x) { tn({ type: 'square', f: vary(2300), to: 900, dur: 0.045, vol: 0.03, lp: 6000, x: x }); tn({ type: 'sine', f: 180, to: 70, dur: 0.035, vol: 0.05, x: x }); },
      scatter: function (x) { [0, 0.012].forEach(function (d, i) { tn({ t: d, type: 'square', f: vary(1900 - i * 300), to: 700, dur: 0.05, vol: 0.016, lp: 5000, x: x }); }); crack(0, 0.025, x, 4000); },
      // a mushroom hit: a woody tock; destroyed: a crunchy pop with a sparkle
      mush: function (x) { nz({ bp: vary(1900), q: 5, dur: 0.035, vol: 0.12, x: x }); tn({ type: 'triangle', f: vary(380), to: 230, dur: 0.05, vol: 0.09, x: x }); },
      pop: function (x) { nz({ bp: 1100, q: 1.5, sweep: 3200, dur: 0.07, vol: 0.2, x: x }); tn({ type: 'square', f: vary(260), to: 820, dur: 0.06, vol: 0.06, lp: 2600, x: x }); tn({ t: 0.03, type: 'triangle', f: vary(2600), dur: 0.06, vol: 0.02, x: x, rv: 0.3 }); },
      // centipede segment: a zappy crunch with weight; a head adds a bright chime
      seg: function (x) { tn({ type: 'square', f: vary(640), to: 170, dur: 0.09, vol: 0.1, lp: 2800, x: x }); nz({ bp: 2100, q: 1.4, dur: 0.06, vol: 0.18, x: x }); sub(0, 120, 0.1, 0.22, x); },
      head: function (x) { FX.seg(x); chime(0.02, 88 + Math.floor(Math.random() * 3) * 2, 0.045, x, 0.25); tn({ t: 0.02, type: 'sawtooth', f: 900, to: 300, dur: 0.12, vol: 0.03, lp: 2400, x: x }); },
      // spider: a screech that drops, a crunch and a boom
      spider: function (x) { tn({ type: 'sawtooth', f: 1400, to: 420, dur: 0.22, vol: 0.05, lp: 3200, vib: [38, 90], x: x }); nz({ bp: 1300, q: 1, dur: 0.14, vol: 0.14, x: x }); sub(0, 140, 0.3, 0.2, x); chime(0.12, 91, 0.04, x, 0.4); },
      flea: function (x) { tn({ type: 'sine', f: 2100, to: 260, dur: 0.6, vol: 0.04, vib: [14, 40], x: x, rv: 0.2 }); },
      scorp: function (x) { tn({ type: 'sawtooth', f: 140, to: 300, dur: 0.4, vol: 0.05, lp: 900, vib: [22, 30], x: x }); nz({ bp: 3000, q: 4, dur: 0.35, vol: 0.03, x: x }); },
      kill: function (x) { nz({ lp: 2600, sweep: 180, dur: 0.3, vol: 0.3, x: x, rv: 0.2 }); tn({ type: 'square', f: 360, to: 110, dur: 0.22, vol: 0.05, lp: 1700, x: x }); sub(0, 130, 0.25, 0.2, x); },
      // you're hit: glass bursts, a falling whine and a deep boom in a big room
      die: function (x) { [0, 0.04, 0.09, 0.15].forEach(function (d) { nz({ t: d, hp: 3000 + Math.random() * 2000, dur: 0.12, vol: 0.12, x: x, rv: 0.4 }); }); tn({ type: 'sawtooth', f: 520, to: 45, dur: 0.9, vol: 0.09, lp: 1500, x: x, rv: 0.5 }); boomL(0.02, 0.45, x, 1.1); },
      // a power-up: a whoosh up into a bright chord
      power: function (x) { nz({ bp: 600, q: 0.8, sweep: 6000, dur: 0.35, vol: 0.08, x: x }); arp(0.05, [72, 76, 79, 84, 88, 91], 0.04, 0.035, 'square', x, 0.35); [84, 88, 91].forEach(function (m) { tn({ t: 0.28, type: 'triangle', f: mtof(m), dur: 0.6, vol: 0.03, x: x, rv: 0.5 }); }); },
      capin: function (x) { arp(0, [84, 88, 91], 0.06, 0.03, 'triangle', x, 0.4); },
      bomb: function (x) { crack(0, 0.2, x, 1500); boomL(0, 0.6, x, 1.3); [0.12, 0.25, 0.4].forEach(function (d) { nz({ t: d, bp: 800 + Math.random() * 800, q: 1, dur: 0.18, vol: 0.08, x: x }); }); },
      combo: function (x) { arp(0, [79, 83, 86, 91], 0.045, 0.035, 'square', x, 0.3); },
      // the boss is hit: a metal clang (two inharmonic tones) and a knock
      bhit: function (x) { tn({ type: 'triangle', f: vary(520), dur: 0.16, vol: 0.11, x: x, rv: 0.25 }); tn({ type: 'triangle', f: vary(1310), dur: 0.1, vol: 0.035, x: x }); nz({ bp: 900, q: 2, dur: 0.05, vol: 0.12, x: x }); sub(0, 90, 0.08, 0.12, x); },
      // the boss goes down: a chain of blasts, then a triumphant chord ringing out
      bdie: function (x) { [0, 0.18, 0.36, 0.6].forEach(function (d, i) { boomL(d, 0.35 + i * 0.08, x == null ? null : x + (i - 1.5) * 40, 0.9); }); [57, 64, 69, 72, 76, 81].forEach(function (m, i) { tn({ t: 0.9 + i * 0.03, type: i % 2 ? 'triangle' : 'sawtooth', f: mtof(m), a: 0.05, dur: 2.2, vol: 0.035, lp: 3200, rv: 0.6 }); }); arp(0.9, [69, 72, 76, 81, 84, 88], 0.07, 0.035, 'square', null, 0.4); },
      // a new wave: a riser into an impact
      wave: function () { nz({ bp: 300, q: 0.7, sweep: 7000, a: 0.6, dur: 0.75, vol: 0.06 }); tn({ type: 'sawtooth', f: 110, to: 440, glide: 0.7, a: 0.5, dur: 0.75, vol: 0.03, lp: 2400 }); boomL(0.72, 0.3, null, 0.8); arp(0.72, [69, 76, 81], 0.0, 0.04, 'square', null, 0.5); },
      clear: function () { arp(0, [72, 76, 79, 84, 79, 84, 88], 0.075, 0.045, 'square', null, 0.4); [60, 67, 72, 76].forEach(function (m) { tn({ t: 0.5, type: 'sawtooth', f: mtof(m), a: 0.03, dur: 1.4, vol: 0.03, lp: 2800, rv: 0.5 }); }); sub(0.5, 90, 0.6, 0.2); },
      extra: function () { arp(0, [76, 79, 84, 88, 91, 96], 0.06, 0.04, 'square', null, 0.4); chime(0.36, 96, 0.06, null, 0.8); },
      // boss warning: a two-tone siren over a low drone
      warn: function () { [0, 0.3, 0.6].forEach(function (d) { tn({ t: d, type: 'sawtooth', f: 440, to: 880, glide: 0.25, dur: 0.27, vol: 0.05, lp: 2200, rv: 0.3 }); }); tn({ type: 'sawtooth', f: 55, a: 0.2, dur: 1.2, vol: 0.06, lp: 400 }); },
      over: function () { [67, 66, 65, 64].forEach(function (m, i) { tn({ t: 0.2 + i * 0.26, type: 'square', f: mtof(m), dur: i === 3 ? 0.9 : 0.24, vol: 0.05, lp: 1800, rv: 0.4 }); tn({ t: 0.2 + i * 0.26, type: 'triangle', f: mtof(m - 12), dur: i === 3 ? 0.9 : 0.24, vol: 0.07 }); }); boomL(1.0, 0.25, null, 1.2); },
      shoot: function (x) { tn({ type: 'sawtooth', f: 950, to: 380, dur: 0.14, vol: 0.04, lp: 2600, x: x }); },
      beam: function (x) { tn({ type: 'sawtooth', f: 105 + Math.random() * 10, dur: 0.1, vol: 0.06, lp: 1500, x: x }); tn({ type: 'square', f: 210 + Math.random() * 20, dur: 0.1, vol: 0.025, lp: 2600, x: x }); nz({ bp: 5000 + Math.random() * 2000, q: 1.2, dur: 0.1, vol: 0.06, x: x }); },
      zap: function (x) { nz({ hp: 2600, dur: 0.22, vol: 0.28, x: x, rv: 0.3 }); nz({ t: 0.03, bp: 6000, q: 2, dur: 0.12, vol: 0.16, x: x }); [0, 0.035, 0.07].forEach(function (d, i) { tn({ t: d, type: 'square', f: 2600 - i * 600, to: 700, dur: 0.05, vol: 0.045, lp: 7000, x: x }); }); sub(0, 110, 0.18, 0.15, x); },
      tink: function (x) { tn({ type: 'triangle', f: 2400 + Math.random() * 700, dur: 0.05, vol: 0.02, x: x }); },
      charge: function (x) { tn({ type: 'sawtooth', f: 180, to: 900, glide: 0.6, a: 0.3, dur: 0.65, vol: 0.035, lp: 2400, x: x, rv: 0.3 }); nz({ bp: 500, sweep: 4000, dur: 0.6, a: 0.4, vol: 0.04, x: x }); },
      pulse: function (x) { boomL(0, 0.18, x, 0.4); tn({ type: 'sine', f: 180, to: 50, dur: 0.35, vol: 0.12, x: x }); },
      lob: function (x) { tn({ type: 'sine', f: 220, to: 560, dur: 0.28, vol: 0.06, x: x }); },
      dive: function (x) { tn({ type: 'sawtooth', f: 1100, to: 180, dur: 0.5, vol: 0.05, lp: 2400, x: x, rv: 0.2 }); nz({ bp: 2000, sweep: 400, dur: 0.5, vol: 0.05, x: x }); },
      slam: function (x) { boomL(0, 0.45, x, 0.6); crack(0, 0.15, x, 1200); },
      web: function (x) { nz({ bp: 3200, sweep: 900, q: 2, dur: 0.28, vol: 0.07, x: x }); }
    };
    var last = {};
    function play(name, x) {
      var now = performance.now(); if (last[name] && now - last[name] < 35) return; last[name] = now;
      if (!FX[name] || !ctx()) return;
      try { FX[name](x); } catch (e) {}
    }

    // ── Music: an original electronic track (A minor, 124 bpm); the boss fights have their own (D minor, 138 bpm).
    // Sixteen steps a bar, chords a bar each. The layers build as the waves go on and through each 8-bar phrase:
    // drums and bass, then the arpeggio, then the lead, with a lighter breakdown every fourth phrase.
    var SONGS = {
      main: { bpm: 124, chords: [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62], [57, 60, 64], [53, 57, 60], [50, 53, 57], [52, 56, 59]],
        lead: [76, 0, 0, 74, 72, 0, 74, 0, 76, 0, 79, 0, 76, 0, 0, 0,  77, 0, 0, 76, 74, 0, 72, 0, 74, 0, 0, 0, 0, 0, 0, 0,
               72, 0, 0, 71, 72, 0, 76, 0, 79, 0, 0, 0, 76, 0, 74, 0,  74, 0, 72, 0, 71, 0, 72, 0, 74, 0, 0, 0, 0, 0, 0, 0,
               76, 0, 0, 74, 72, 0, 74, 0, 76, 0, 79, 0, 81, 0, 0, 0,  77, 0, 0, 76, 74, 0, 72, 0, 74, 0, 0, 0, 77, 0, 0, 0,
               74, 0, 0, 72, 74, 0, 77, 0, 76, 0, 0, 0, 74, 0, 72, 0,  71, 0, 0, 0, 68, 0, 0, 0, 71, 0, 0, 0, 0, 0, 0, 0] },
      boss: { bpm: 138, chords: [[50, 53, 57], [46, 50, 53], [43, 46, 50], [45, 49, 52], [50, 53, 57], [46, 50, 53], [48, 52, 55], [45, 49, 52]],
        lead: [74, 0, 74, 77, 0, 74, 72, 0, 74, 0, 0, 0, 69, 0, 0, 0,  70, 0, 70, 74, 0, 70, 69, 0, 70, 0, 0, 0, 65, 0, 0, 0,
               67, 0, 67, 70, 0, 67, 65, 0, 67, 0, 70, 0, 74, 0, 0, 0,  73, 0, 0, 0, 76, 0, 0, 0, 73, 0, 69, 0, 64, 0, 0, 0,
               74, 0, 74, 77, 0, 74, 72, 0, 74, 0, 0, 0, 81, 0, 0, 0,  82, 0, 81, 0, 79, 0, 77, 0, 74, 0, 0, 0, 70, 0, 0, 0,
               72, 0, 72, 76, 0, 79, 76, 0, 72, 0, 0, 0, 76, 0, 0, 0,  73, 0, 0, 0, 76, 0, 0, 0, 81, 0, 79, 0, 76, 0, 73, 0] }
    };
    var MUS = { key: 'centipede_music', song: null, next: 0, step: 0, playing: false, fade: null };
    function musicOn() { var v = lsGet(MUS.key); return lsGet('gn_sound') !== '0' && (v == null ? lsGet('gn_music') !== '0' : v !== '0'); }
    function wantSong() { var R = o.view && o.view(); return R && R.boss ? 'boss' : 'main'; }
    function wave() { var R = o.view && o.view(); return (R && R.wave) || 1; }
    function mv(p) { p.bus = mus; voice(p, false); }
    function mn(p) { p.bus = mus; voice(p, true); }
    function kick(t, v) { mv({ t: t, type: 'sine', f: 150, to: 42, glide: 0.12, dur: 0.3, vol: 0.5 * v }); mn({ t: t, hp: 3000, dur: 0.012, vol: 0.06 * v }); }
    function snare(t, v) { mn({ t: t, bp: 1900, q: 0.8, dur: 0.16, vol: 0.18 * v, rv: 0.2 }); mv({ t: t, type: 'triangle', f: 200, to: 140, dur: 0.08, vol: 0.12 * v }); }
    function hat(t, v, open) { mn({ t: t, hp: 8000, dur: open ? 0.16 : 0.04, vol: (open ? 0.05 : 0.035) * v }); }
    function tom(t, f, v) { mv({ t: t, type: 'sine', f: f, to: f * 0.55, dur: 0.22, vol: 0.25 * v }); }
    function bassN(t, m, len, v, boss) { mv({ t: t, type: 'sawtooth', f: mtof(m), dur: len, a: 0.005, vol: 0.09 * v, lp: boss ? 900 : 700, sweep: 220, q: 6 }); mv({ t: t, type: 'square', f: mtof(m - 12), dur: len, vol: 0.05 * v, lp: 300 }); }
    function padC(t, ch, len, v) { ch.forEach(function (m) { [-9, 9].forEach(function (d) { mv({ t: t, type: 'sawtooth', f: mtof(m + 12), det: d, a: 0.35, hold: len - 0.6, dur: len, vol: 0.016 * v, lp: 1300, rv: 0.4 }); }); }); }
    function arpN(t, m, len, v) { mv({ t: t, type: 'square', f: mtof(m), dur: len, vol: 0.022 * v, lp: 3200, echo: 0.6 }); }
    function leadN(t, m, len, v) { mv({ t: t, type: 'square', f: mtof(m), dur: len, a: 0.01, vol: 0.03 * v, lp: 3600, vib: [5.5, 4], rv: 0.3, echo: 0.3 }); mv({ t: t, type: 'triangle', f: mtof(m + 12), dur: len * 0.8, vol: 0.012 * v }); }
    function stepAt(i, t) {
      var S = SONGS[MUS.song], sd = 60 / S.bpm / 4, bar = Math.floor(i / 16) % 8, s = i % 16, phrase = Math.floor(i / 128), ch = S.chords[bar];
      var boss = MUS.song === 'boss', lvl = Math.min(4, 1 + Math.floor((wave() - 1) / 2)) + (boss ? 2 : 0), part = phrase % 4, breakdown = part === 3 && !boss;
      var v = 1;
      // drums
      if (!breakdown) {
        if (s % 4 === 0) kick(t, v);
        if (s === 4 || s === 12) snare(t, v);
        if (s % 4 === 2) hat(t, v, s === 14);
        else if (lvl >= 3 && s % 2 === 1) hat(t, v * 0.6);
        if (boss && (s === 13 || s === 14 || s === 15) && bar % 2 === 1) tom(t, [180, 150, 120][s - 13], v);
      } else if (s === 0) kick(t, v * 0.7);
      // bass: off-beat eighths on the chord's root (the boss track drives straight eighths)
      var root = ch[0] - 12;
      if (!breakdown && (boss ? s % 2 === 0 : (s % 4 === 2 || s === 0))) bassN(t, s === 10 && !boss ? root + 7 : root, sd * (boss ? 1.6 : 1.8), v, boss);
      // pad: the chord, swelling in on each bar
      if (s === 0) padC(t, ch, sd * 16, breakdown ? 1.4 : 1);
      // arpeggio: from the second phrase, or from the third wave on
      if ((part >= 1 || lvl >= 3) && (breakdown || lvl >= 2)) { var notes = [ch[0] + 12, ch[1] + 12, ch[2] + 12, ch[0] + 24]; if (s % 2 === 0 || lvl >= 4) arpN(t, notes[(s >> (lvl >= 4 ? 0 : 1)) % 4], sd * 0.9, v); }
      // lead: on the third phrase, and every phrase in later waves and boss fights
      if ((part === 2 || lvl >= 4) && !breakdown) { var ln = S.lead[i % S.lead.length]; if (ln) leadN(t, ln, sd * 1.8, v); }
    }
    function musicTick() {
      if (!musicOn()) { musicStop(true); return; }
      var a = ctx(); if (!a) return;
      var want = wantSong();
      if (!MUS.playing || MUS.song !== want) {
        // a new song starts on the next beat, the music bus fading back in
        MUS.song = want; MUS.step = 0; MUS.next = a.currentTime + 0.08; MUS.playing = true;
        mus.gain.cancelScheduledValues(a.currentTime); mus.gain.setValueAtTime(0.0001, a.currentTime); mus.gain.exponentialRampToValueAtTime(MUSV, a.currentTime + 0.6);
      }
      var sd = 60 / SONGS[MUS.song].bpm / 4;
      if (MUS.next < a.currentTime - 0.25) MUS.next = a.currentTime + 0.02;   // fell behind (tab hidden): skip ahead
      while (MUS.next < a.currentTime + 0.15) { stepAt(MUS.step, MUS.next); MUS.step++; MUS.next += sd; }
    }
    function musicStop(hard) {
      if (!MUS.playing) return; MUS.playing = false;
      if (A && mus) { var t = A.currentTime; mus.gain.cancelScheduledValues(t); mus.gain.setValueAtTime(mus.gain.value, t); mus.gain.exponentialRampToValueAtTime(0.0001, t + (hard ? 0.08 : 0.5)); }
    }
    function duck(on) { if (!A || !mus || !MUS.playing) return; var t = A.currentTime; mus.gain.cancelScheduledValues(t); mus.gain.setTargetAtTime(on ? MUSV * 0.4 : MUSV, t, 0.08); }

    // ── Announcer: the device's own voice, deep and a touch slow, the music dipping under it ──
    var VKEY = 'centipede_voice', vq = [], speaking = false, voiceObj = null;
    function voiceOn() { return lsGet('gn_sound') !== '0' && lsGet(VKEY) !== '0' && 'speechSynthesis' in window; }
    function pickVoice() {
      if (voiceObj) return voiceObj;
      var vs = (window.speechSynthesis && speechSynthesis.getVoices()) || [];
      var pref = [/Daniel/i, /Arthur/i, /Aaron/i, /Fred/i, /Alex/i, /Google UK English Male/i, /Guy/i, /Male/i];
      for (var i = 0; i < pref.length && !voiceObj; i++) voiceObj = vs.filter(function (v) { return /^en/i.test(v.lang) && pref[i].test(v.name); })[0] || null;
      if (!voiceObj) voiceObj = vs.filter(function (v) { return /^en/i.test(v.lang); })[0] || null;
      return voiceObj;
    }
    if ('speechSynthesis' in window && speechSynthesis.addEventListener) speechSynthesis.addEventListener('voiceschanged', function () { voiceObj = null; });
    function say(text, prio) {
      if (!voiceOn() || !text) return;
      prio = prio || 1;
      if (speaking && prio === 0) return;
      if (prio >= 2) { vq = []; try { speechSynthesis.cancel(); } catch (e) {} speaking = false; }
      vq.push(text); if (!speaking) nextLine();
    }
    function nextLine() {
      var t = vq.shift(); if (!t) { speaking = false; duck(false); return; }
      speaking = true; duck(true);
      var u = new SpeechSynthesisUtterance(t), v = pickVoice();
      if (v) u.voice = v; u.lang = (v && v.lang) || 'en-US'; u.pitch = 0.55; u.rate = 0.98; u.volume = 1;
      u.onend = u.onerror = function () { setTimeout(nextLine, 120); };
      try { speechSynthesis.speak(u); } catch (e) { speaking = false; duck(false); }
      setTimeout(function () { if (speaking && !speechSynthesis.speaking) nextLine(); }, 4000);   // never left hanging
    }

    return {
      play: play, say: say,
      music: {
        tick: musicTick, stop: musicStop,
        menuItem: { icon: 'music', label: 'Music', toggle: musicOn, onClick: function () { lsSet(MUS.key, musicOn() ? '0' : '1'); if (!musicOn()) musicStop(true); } }
      },
      voiceItem: { icon: 'sound', label: 'Announcer', toggle: voiceOn, onClick: function () { lsSet(VKEY, voiceOn() ? '0' : '1'); if (!voiceOn()) { vq = []; try { speechSynthesis.cancel(); } catch (e) {} } } }
    };
  }
  window.CentiAudio = { create: create };
})();
