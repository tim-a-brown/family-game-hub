// node scripts/hivemind-sim.js [games] [--seed=N]: Hive Mind (games/mindmeld-core.js) played by computer players at
// 3 to 12 bees. Checks every round against a plain reading of the rules: the points (one for each player who wrote an
// answer, you included), the shake (the die's number of lowest down, ties at the cut too, the highest up, never above the
// top), the end (a bee past the gate) and the winners (everyone still in the hive). Prints how long games run.
global.window = {};
require('../games/mindmeld-data.js');
const C = require('../games/mindmeld-core.js');
C.setData(window.MINDMELD_PROMPTS);
const DATA = window.MINDMELD_PROMPTS;
const args = process.argv.slice(2), N = +(args.find(a => /^\d+$/.test(a)) || 300);
let seed = +((args.find(a => a.startsWith('--seed=')) || '--seed=7').slice(7));
function rnd() { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
let bad = 0; function fail(m) { if (bad++ < 20) console.log('FAIL', m); }
const stat = {};
for (let n = 3; n <= 12; n++) {
  const lens = [], outs = [];
  for (let k = 0; k < N; k++) {
    const deck = shuffle(DATA.map((_, i) => i));
    const g = C.newGame({ mode: 'cpu', timer: 0, rnd, players: Array.from({ length: n }, (_, i) => ({ name: 'P' + i, cpu: true })) }, deck);
    if (g.depth !== (n <= 4 ? 4 : n <= 6 ? 5 : 6)) fail('depth');
    let guard = 0;
    while (g.phase !== 'over' && guard++ < 400) {
      if (g.phase !== 'ask') fail('phase ' + g.phase);
      const asker = g.ask;
      if (C.apply(g, (asker + 1) % n, { t: 'pick', c: 0 }, rnd)) fail('pick by someone else');
      if (!C.apply(g, asker, { t: 'pick', c: rnd() < .5 ? 0 : 1 }, rnd)) fail('pick');
      const P = C.prompt(g);
      g.players.forEach((p, i) => { if (!C.apply(g, i, { t: 'ans', a: C.cpuWrite(g.pi, P.n, p.temp, rnd) }, rnd)) fail('ans'); });
      if (!C.apply(g, -1, { t: 'reveal' })) fail('reveal');
      const lv0 = g.players.map(p => p.lv);
      // plain reading: points
      const keys = g.players.map((p, i) => [...new Set(g.ans[i].filter(Boolean).map(t => C.keyOf(g.pi, t)))]);
      const want = keys.map(ks => ks.reduce((s, k) => s + keys.filter(o => o.includes(k)).length, 0));
      C.apply(g, -1, { t: 'score' });
      if (want.join() !== g.pts.join()) fail('pts ' + want + ' / ' + g.pts);
      // plain reading: the shake
      const roll = C.DIE[g.roll], cnt = Math.min(roll, n === 3 ? 2 : roll), sc = g.pts, lo = Math.min(...sc), hi = Math.max(...sc);
      const exp = lv0.slice();
      if (lo !== hi) {
        const asc = sc.slice().sort((a, b) => a - b), cut = asc[cnt - 1];
        const dn = sc.map(v => cut === hi ? v < hi : v <= cut);
        sc.forEach((v, i) => { if (dn[i]) exp[i]++; else if (v === hi) exp[i] = Math.max(0, exp[i] - 1); });
        if (dn.filter(Boolean).length < 1) fail('nobody down');
      }
      g.players.forEach((p, i) => { if (Math.min(exp[i], g.depth) !== p.lv) fail('lv ' + i + ' ' + exp[i] + ' ' + p.lv); if (!!p.out !== (exp[i] >= g.depth)) fail('out'); });
      C.apply(g, -1, { t: 'next' });
    }
    if (g.phase !== 'over') fail('never ended n=' + n);
    const w = C.winners(g);
    if (!w.length || w.some(i => g.players[i].out) || g.players.some((p, i) => !p.out && !w.includes(i))) fail('winners');
    lens.push(g.round); outs.push(g.players.filter(p => p.out).length);
  }
  lens.sort((a, b) => a - b);
  stat[n] = { median: lens[lens.length >> 1], p10: lens[Math.floor(lens.length * .1)], p90: lens[Math.floor(lens.length * .9)], max: lens[lens.length - 1], leaving: +(outs.reduce((a, b) => a + b, 0) / outs.length).toFixed(2) };
}
Object.keys(stat).forEach(n => console.log(n + ' bees: rounds ' + JSON.stringify(stat[n])));
console.log(bad ? bad + ' failures' : 'all rounds checked: ok');
process.exit(bad ? 1 : 0);
