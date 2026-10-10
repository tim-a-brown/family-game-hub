// Crossy Road: synthesized sound effects (Web Audio; nothing to download).
export function createSfx() {
  let ac = null, master = null, nbuf = null;
  function on() { try { return localStorage.getItem('gn_sound') !== '0'; } catch (e) { return true; } }
  function ctx() {
    if (!on()) return null;
    if (!ac) {
      const C = window.AudioContext || window.webkitAudioContext; if (!C) return null;
      try { ac = new C(); } catch (e) { return null; }
      master = ac.createGain(); master.gain.value = 0.7;
      const comp = ac.createDynamicsCompressor(); master.connect(comp); comp.connect(ac.destination);
    }
    if (ac.state === 'suspended') { try { ac.resume(); } catch (e) {} }
    return ac;
  }
  function tone(type, f, t0, dur, vol, o) {
    const a = ctx(); if (!a) return; o = o || {};
    const t = a.currentTime + (t0 || 0), n = a.createOscillator(), g = a.createGain();
    let out = n;
    n.type = type; n.frequency.setValueAtTime(f, t);
    if (o.to) n.frequency.exponentialRampToValueAtTime(o.to, t + (o.toT || dur));
    if (o.vib) { const l = a.createOscillator(), lg = a.createGain(); l.frequency.value = o.vib; lg.gain.value = o.vibD || 30; l.connect(lg); lg.connect(n.frequency); l.start(t); l.stop(t + dur + 0.05); }
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + (o.att || 0.005));
    if (o.hold) g.gain.setValueAtTime(vol, t + o.hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    if (o.lp || o.bp) { const f2 = a.createBiquadFilter(); f2.type = o.bp ? 'bandpass' : 'lowpass'; f2.frequency.value = o.bp || o.lp; if (o.q) f2.Q.value = o.q; n.connect(f2); out = f2; }
    out.connect(g); g.connect(master); n.start(t); n.stop(t + dur + 0.05);
  }
  function noise(t0, dur, vol, type, freq, o) {
    const a = ctx(); if (!a) return; o = o || {};
    if (!nbuf) { nbuf = a.createBuffer(1, a.sampleRate * 2, a.sampleRate); const d = nbuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain(), t = a.currentTime + (t0 || 0);
    s.buffer = nbuf; f.type = type || 'bandpass'; f.frequency.setValueAtTime(freq || 1000, t);
    if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, t + (o.toT || dur));
    if (o.q) f.Q.value = o.q;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + (o.att || 0.004));
    if (o.hold) g.gain.setValueAtTime(vol, t + o.hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(master); s.start(t, Math.random() * 1.2); s.stop(t + dur + 0.05);
  }
  let hopN = 0, lastWhoosh = 0, lastHorn = 0;
  function now() { return ac ? ac.currentTime : 0; }
  return {
    ctx, out: () => master,
    suspend() { if (ac && ac.state === 'running') try { ac.suspend(); } catch (e) {} },
    resume() { if (ac && ac.state === 'suspended') try { ac.resume(); } catch (e) {} },
    // a soft, bouncy blip, pitched a touch differently each hop
    hop() { hopN++; const f = 520 + (hopN % 3) * 40; tone('triangle', f, 0, 0.07, 0.11, { to: f * 1.7, toT: 0.05 }); tone('square', f * 2, 0, 0.03, 0.02, { lp: 2400 }); },
    bump() { tone('sine', 190, 0, 0.09, 0.14, { to: 90 }); noise(0, 0.05, 0.06, 'lowpass', 600); },
    land(kind) { if (kind === 'river') { noise(0, 0.12, 0.08, 'bandpass', 700, { to: 300 }); tone('sine', 140, 0, 0.1, 0.08, { to: 90 }); } },
    coin() { tone('square', 988, 0, 0.07, 0.06, { lp: 4000 }); tone('square', 1319, 0.065, 0.22, 0.06, { lp: 4500 }); tone('triangle', 2637, 0.065, 0.18, 0.03); },
    whoosh(truck, near) {
      const t = now(); if (t - lastWhoosh < 0.12) return; lastWhoosh = t;
      const v = (truck ? 0.22 : 0.16) * (near ? 0.55 : 1);
      noise(0, truck ? 0.5 : 0.36, v, 'bandpass', truck ? 300 : 500, { to: truck ? 1100 : 1800, toT: 0.16, q: 0.9, att: 0.09 });
      if (truck) tone('sawtooth', 70, 0, 0.45, 0.05, { lp: 260, att: 0.08 });
    },
    horn(truck) {
      const t = now(); if (t - lastHorn < 1.2) return; lastHorn = t;
      const f = truck ? [196, 247] : [370, 466];
      f.forEach(x => tone('square', x, 0, truck ? 0.5 : 0.28, 0.035, { lp: 1400, hold: truck ? 0.38 : 0.2, att: 0.01 }));
    },
    splash() { noise(0, 0.5, 0.32, 'lowpass', 2400, { to: 260 }); noise(0.02, 0.35, 0.12, 'highpass', 3000); tone('sine', 420, 0, 0.22, 0.12, { to: 90 }); },
    squash() { noise(0, 0.22, 0.32, 'lowpass', 1600, { to: 200 }); tone('square', 260, 0, 0.16, 0.08, { to: 60, lp: 1200 }); tone('sine', 110, 0, 0.25, 0.2, { to: 40 }); },
    smash() { noise(0, 0.6, 0.4, 'lowpass', 2200, { to: 150 }); tone('sawtooth', 160, 0, 0.4, 0.09, { to: 40, lp: 900 }); tone('sine', 90, 0, 0.5, 0.25, { to: 35 }); },
    // the crossing bell: a few bright dings
    bell(near) { const v = near <= 3 ? 0.07 : near <= 8 ? 0.045 : 0.025; for (let i = 0; i < 4; i++) { tone('triangle', 1245, i * 0.27, 0.24, v); tone('sine', 1868, i * 0.27, 0.16, v * 0.6); } },
    train(near) {
      const v = near <= 1 ? 1 : near <= 3 ? 0.6 : 0.35;
      [311, 370, 466].forEach(f => tone('sawtooth', f, 0, 0.75, 0.03 * v, { lp: 1500, att: 0.03, hold: 0.55 }));
      noise(0.05, 1.7, 0.28 * v, 'lowpass', 700, { att: 0.35, hold: 0.9 });
      noise(0.05, 1.5, 0.08 * v, 'bandpass', 2500, { att: 0.3, hold: 0.8, q: 2 });
      for (let i = 0; i < 8; i++) noise(0.15 + i * 0.16, 0.05, 0.08 * v, 'bandpass', 900, { q: 3 });
    },
    screech() { tone('sawtooth', 1500, 0, 0.7, 0.07, { to: 2400, toT: 0.12, vib: 28, vibD: 120, bp: 2200, q: 1.5, att: 0.02, hold: 0.25 }); tone('square', 2900, 0.05, 0.55, 0.025, { to: 1700, bp: 3000, q: 2 }); },
    die() { [523, 392, 330, 262].forEach((f, i) => tone('square', f, 0.35 + i * 0.12, 0.14, 0.04, { lp: 2000 })); },
    start() { [523, 659, 784].forEach((f, i) => tone('square', f, i * 0.06, 0.09, 0.04, { lp: 3000 })); }
  };
}
