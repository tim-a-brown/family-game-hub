// A basic playable table (flippers, slings, three pop bumpers, plunger lane).
// Used until a table gets its full build. See ../README.md.
export function stubTable(meta) {
  const th = meta.theme || {};
  return {
    id: meta.id, name: meta.name, short: meta.short, desc: meta.desc, diff: meta.diff || 2, color: meta.color,
    intro: meta.intro || 'GOOD LUCK', display: meta.display || { type: 'dmd', color: '#ff8a1e' },
    music: meta.music, theme: th,
    art: {
      playfield(P) {
        const g = P.ctx, W = P.W, L = P.L;
        g.fillStyle = P.lin(0, 0, 0, L, [[0, th.pf0 || '#1a1830'], [1, th.pf1 || '#2c2650']]); g.fillRect(0, 0, W, L);
        for (let i = 0; i < 40; i++) { const r = P.rng(i + 1); P.glow(r() * W, r() * L, 30 + r() * 80, th.accent || '#ffffff', 0.05); }
        P.text(meta.name.toUpperCase(), 243, 560, { size: 34, color: th.title || '#ffe6a0', glow: th.accent || '#ff8a1e', glowR: 4, font: meta.font || '"Bungee", Impact, sans-serif', weight: '400' });
        P.text(meta.tag || '', 243, 520, { size: 11, color: 'rgba(255,255,255,.7)' });
      },
      backglass(g, w, h) {
        const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, th.pf0 || '#1a1830'); gr.addColorStop(1, th.accent || '#ff8a1e'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
        g.fillStyle = '#fff'; g.font = '400 54px "Bungee", Impact'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(meta.name.toUpperCase(), w / 2, h / 2, w - 30);
      }
    },
    build(T) {
      T.shooter({});
      T.lower({ flipColor: th.flipper, flipRubber: th.flipperRubber, slingPlastic: th.slingPlastic });
      [[180, 760, 'p1'], [306, 760, 'p2'], [243, 850, 'p3']].forEach(([x, y, id]) => T.popBumper({ x, y, id, color: th.pop || '#ffd27a' }));
      T.wall([[60, 600], [60, 820]], { style: 'metal' });
      T.wall([[426, 600], [426, 820]], { style: 'metal' });
      T.post(60, 600, { style: 'rubber' }); T.post(426, 600, { style: 'rubber' });
      ['p1', 'p2', 'p3'].forEach((id, i) => T.insert('l' + i, 210 + i * 33, 470, { shape: 'circle', r: 8, color: th.pop || '#ffd27a' }));
    },
    rules: {
      init(G) { G.b = { pops: 0 }; },
      event(G, type) { if (type === 'pop') G.b.pops++; },
      lamps(G) { const n = G.b.pops % 4; return { l0: n > 0, l1: n > 1, l2: n > 2 }; },
      status() { return meta.status || 'HIT THE POP BUMPERS'; },
      bonus(G) { return [['POPS', G.pbn('pop'), 200], ['SLINGS', G.pbn('sl'), 100]]; }
    }
  };
}
