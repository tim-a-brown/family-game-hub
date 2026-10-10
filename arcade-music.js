// Arcade background music: a tiny chiptune sequencer that plays original loops through
// a game's own AudioContext.
//
//   var M = ArcadeMusic.create({
//     key:  'breakout_music',            // localStorage on/off switch (default on)
//     song: ArcadeMusic.songs.breakout,
//     ctx:  function () { return ac(); }, // the game's AudioContext, or null when sound is off
//     out:  function () { return master; },
//     tempo: function () { return 1; }   // optional: speed multiplier (1 = song tempo)
//   });
//   M.tick();     // call every frame while the game is actively being played
//   M.stop(hard); // call when play stops (pause, game over, menu); a no-op when already quiet
//   M.menuItem    // { icon, label, onClick } for Kit.init({ menu })
//
// Notes are scheduled a fraction of a second ahead, so music stops as soon as tick() does.
(function () {
  function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }

  // Songs: one step per eighth note. Lead and bass are MIDI notes (0 = rest); lead and bass
  // loop on their own lengths. Drums: k kick, s snare, h hat, x kick + hat, '.' nothing.
  var songs = {
    // Driving E minor arpeggios, then a tune over the same chords (Em C G D)
    breakout: {
      eighth: 0.19, leadVol: 0.04, leadLp: 2600, bassVol: 0.11, drumVol: 1,
      lead: [64, 67, 71, 67, 76, 71, 67, 71,  64, 67, 72, 67, 76, 72, 67, 72,  67, 71, 74, 71, 79, 74, 71, 74,  66, 69, 74, 69, 78, 74, 69, 66,
             76, 0, 76, 74, 76, 0, 79, 0,  76, 0, 74, 72, 71, 0, 67, 0,  74, 0, 74, 72, 74, 0, 79, 0,  78, 0, 76, 74, 78, 0, 81, 0],
      bass: [40, 52, 40, 52, 40, 52, 40, 52,  36, 48, 36, 48, 36, 48, 36, 48,  43, 55, 43, 55, 43, 55, 43, 55,  38, 50, 38, 50, 38, 50, 38, 50],
      drums: 'khshkksh'
    },
    // Bouncy C major (C Am F G), light and sunny
    flappy: {
      eighth: 0.2, leadWave: 'triangle', leadVol: 0.09, bassVol: 0.09, drumVol: 0.7,
      lead: [72, 0, 76, 0, 79, 76, 72, 0,  72, 0, 76, 0, 81, 79, 76, 0,  77, 0, 76, 74, 72, 0, 69, 0,  71, 0, 74, 0, 79, 0, 0, 0,
             84, 0, 79, 0, 76, 0, 79, 81,  84, 0, 81, 0, 76, 0, 72, 74,  77, 76, 74, 72, 77, 0, 81, 0,  79, 0, 77, 0, 74, 0, 71, 0],
      bass: [48, 0, 55, 0, 48, 0, 55, 0,  45, 0, 52, 0, 45, 0, 52, 0,  41, 0, 48, 0, 41, 0, 48, 0,  43, 0, 50, 0, 43, 0, 50, 0],
      drums: 'k.h.s.h.'
    },
    // Quirky shuffle (G E7 Am D7) for the cube pyramid
    qbert: {
      eighth: 0.17, swing: 0.3, leadVol: 0.045, leadLp: 3000, bassVol: 0.1, drumVol: 0.9,
      lead: [67, 71, 74, 0, 79, 0, 78, 79,  80, 0, 76, 0, 74, 0, 71, 0,  72, 76, 81, 0, 79, 0, 76, 0,  78, 0, 74, 0, 72, 0, 69, 0,
             79, 0, 79, 81, 83, 0, 79, 0,  80, 0, 80, 81, 83, 0, 80, 0,  81, 0, 79, 76, 72, 0, 76, 0,  74, 0, 78, 0, 81, 0, 0, 0],
      bass: [43, 0, 50, 0, 43, 0, 50, 0,  40, 0, 47, 0, 40, 0, 47, 0,  45, 0, 52, 0, 45, 0, 52, 0,  38, 0, 45, 0, 38, 0, 45, 0],
      drums: 'khshkhsh'
    },
    // Cool, sparse D minor synth (Dm Bb C Am)
    pong: {
      eighth: 0.23, leadVol: 0.04, leadLp: 1700, echo: 0.35, bassWave: 'square', bassLp: 500, bassVol: 0.08, drumVol: 0.7,
      lead: [74, 0, 0, 77, 0, 0, 81, 0,  0, 0, 77, 0, 74, 0, 70, 0,  72, 0, 0, 76, 0, 0, 79, 0,  0, 0, 76, 0, 72, 0, 69, 0,
             81, 0, 0, 79, 77, 0, 74, 0,  77, 0, 0, 74, 70, 0, 74, 0,  76, 0, 0, 79, 84, 0, 79, 0,  76, 0, 0, 72, 69, 0, 0, 0],
      bass: [38, 38, 50, 38, 38, 38, 50, 38,  34, 34, 46, 34, 34, 34, 46, 34,  36, 36, 48, 36, 36, 36, 48, 36,  33, 33, 45, 33, 33, 33, 45, 33],
      drums: 'k.h.s.h.'
    },
    // Calm and glassy F major for Peggle (F Dm Bb C), no drums
    peggle: {
      eighth: 0.27, leadWave: 'triangle', leadVol: 0.085, leadLen: 1.6, echo: 0.3, bassWave: 'sine', bassVol: 0.12, bassLen: 3.6, drumVol: 0,
      lead: [72, 0, 69, 0, 72, 74, 77, 0,  74, 0, 0, 72, 69, 0, 0, 0,  70, 0, 74, 0, 77, 0, 74, 72,  72, 0, 0, 0, 0, 0, 0, 0,
             77, 0, 76, 0, 77, 79, 81, 0,  81, 0, 79, 77, 74, 0, 0, 0,  77, 0, 74, 0, 70, 72, 74, 77,  76, 0, 0, 0, 79, 0, 0, 0],
      bass: [41, 0, 0, 0, 48, 0, 0, 0,  38, 0, 0, 0, 45, 0, 0, 0,  34, 0, 0, 0, 41, 0, 0, 0,  36, 0, 0, 0, 43, 0, 0, 0],
      drums: ''
    }
  };

  function musicOn(key) { try { return localStorage.getItem(key) !== '0'; } catch (e) { return true; } }

  function create(o) {
    var S = o.song, st = { on: false, step: 0, next: 0, bus: null, ac: null, nb: null };
    function noiseBuf(a) {
      if (!st.nb) { st.nb = a.createBuffer(1, a.sampleRate * 0.5, a.sampleRate); var d = st.nb.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
      return st.nb;
    }
    function note(a, type, f, t, dur, vol, lp) {
      var n = a.createOscillator(), g = a.createGain(), out = n;
      n.type = type; n.frequency.setValueAtTime(f, t);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
      g.gain.setValueAtTime(vol, t + dur * 0.55); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      if (lp) { var fl = a.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = lp; n.connect(fl); out = fl; }
      out.connect(g); g.connect(st.bus); n.start(t); n.stop(t + dur + 0.03);
    }
    function drum(a, ch, t) {
      var v = S.drumVol == null ? 1 : S.drumVol; if (!v) return;
      if (ch === 'k' || ch === 'x') {
        var k = a.createOscillator(), kg = a.createGain();
        k.frequency.setValueAtTime(140, t); k.frequency.exponentialRampToValueAtTime(42, t + 0.1);
        kg.gain.setValueAtTime(0.28 * v, t); kg.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
        k.connect(kg); kg.connect(st.bus); k.start(t); k.stop(t + 0.16);
      }
      if (ch === 'h' || ch === 'x' || ch === 's') {
        var s = a.createBufferSource(), fl = a.createBiquadFilter(), g = a.createGain(), sn = ch === 's';
        s.buffer = noiseBuf(a); fl.type = sn ? 'bandpass' : 'highpass'; fl.frequency.value = sn ? 1800 : 7000;
        var vol = (sn ? 0.13 : 0.045) * v, d = sn ? 0.12 : 0.035;
        g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
        s.connect(fl); fl.connect(g); g.connect(st.bus); s.start(t, Math.random() * 0.3); s.stop(t + d + 0.02);
      }
    }
    function stop(hard) {
      if (!st.on) return; st.on = false; st.next = 0;
      if (!st.ac || !st.bus) return;
      var now = st.ac.currentTime, g = st.bus.gain;
      try { g.cancelScheduledValues(now); g.setValueAtTime(Math.max(0.0001, g.value), now); g.exponentialRampToValueAtTime(0.0001, now + (hard ? 0.05 : 0.35)); } catch (e) {}
    }
    function tick() {
      var a = musicOn(o.key) ? o.ctx() : null;
      if (!a) { stop(true); return; }
      if (a.state !== 'running') return;
      var out = o.out(); if (!out) return;
      if (st.ac !== a || !st.bus) { st.ac = a; st.bus = a.createGain(); st.bus.connect(out); }
      var now = a.currentTime;
      if (!st.on) { st.on = true; st.bus.gain.cancelScheduledValues(now); st.bus.gain.setValueAtTime(0.0001, now); st.bus.gain.exponentialRampToValueAtTime(1, now + 0.3); }
      if (st.next < now) st.next = now + 0.05;
      var e = S.eighth / Math.max(0.5, Math.min(2, o.tempo ? o.tempo() : 1)), guard = 0;
      while (st.next < now + 0.18 && guard++ < 8) {
        var i = st.step, t = st.next + (S.swing && i % 2 ? e * S.swing : 0);
        var ld = S.lead[i % S.lead.length], bs = S.bass[i % S.bass.length], dr = S.drums ? S.drums.charAt(i % S.drums.length) : '.';
        if (ld) {
          note(a, S.leadWave || 'square', mtof(ld), t, e * (S.leadLen || 0.85), S.leadVol, S.leadLp);
          if (S.echo) note(a, S.leadWave || 'square', mtof(ld + 12), t + e * 1.5, e * 0.8, S.leadVol * S.echo, S.leadLp);
        }
        if (bs) note(a, S.bassWave || 'triangle', mtof(bs), t, e * (S.bassLen || 0.9), S.bassVol, S.bassLp);
        if (dr !== '.') drum(a, dr, t);
        st.step++; st.next += e;
      }
    }
    return {
      tick: tick, stop: stop,
      on: function () { return musicOn(o.key); },
      restart: function () { st.step = 0; },
      menuItem: {
        icon: 'sound', label: 'Music on / off',
        onClick: function () {
          var on = !musicOn(o.key);
          try { localStorage.setItem(o.key, on ? '1' : '0'); } catch (e) {}
          if (!on) stop(true);
          if (window.Kit && Kit.toast) Kit.toast(on ? 'Music on' : 'Music off');
        }
      }
    };
  }

  window.ArcadeMusic = { create: create, songs: songs };
})();
