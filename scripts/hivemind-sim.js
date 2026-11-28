// node scripts/hivemind-sim.js [games] [--seed=N]: Hive Mind (games/mindmeld-core.js) played by computer players at
// 3 to 24 pawns on both sides of the board (6 and 8 levels). Checks every turn against a plain reading of the rulebook:
// the points (1 for each response written, plus 1 for each other player with a matching response, counted on one
// response only when a player wrote two that match), the pawns' moves (one, two or three dots: everyone among that
// many lowest totals down one; three counts as two with three players; the star: the lowest down, then the highest up,
// never past the top; nobody else moves up), the end (a pawn off the board) and the winners (everyone still on the board,
// or everyone when all leave at once). Prints how long games run.
global.window = {};
require('../games/mindmeld-data.js');
const C = require('../games/mindmeld-core.js');
C.setData(window.MINDMELD_PROMPTS);
const N_CARDS = C.cards().length;
const args = process.argv.slice(2), N = +(args.find(a => /^\d+$/.test(a)) || 200);
let seed = +((args.find(a => a.startsWith('--seed=')) || '--seed=7').slice(7));
function rnd() { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
let bad = 0; function fail(m) { if (bad++ < 20) console.log('FAIL', m); }
let allOuts = 0, stars = 0, ups = 0;
for (const levels of [6, 8]) for (const n of [3, 4, 5, 6, 8, 12, 24]) {
  const lens = [];
  for (let k = 0; k < N; k++) {
    const g = C.newGame({ mode: 'cpu', timer: 0, levels, rnd, players: Array.from({ length: n }, (_, i) => ({ name: 'P' + i, cpu: true })) }, shuffle([...Array(N_CARDS).keys()]));
    if (g.depth !== levels) fail('depth');
    let guard = 0, expectAsk = 0;
    while (g.phase !== 'over' && guard++ < 600) {
      if (g.phase !== 'roll' || g.ask !== expectAsk) fail('turn order ' + g.ask + ' ' + expectAsk);
      if (C.apply(g, (g.ask + 1) % n, { t: 'roll' }, rnd)) fail('roll by someone else');
      if (!C.apply(g, g.ask, { t: 'roll' }, rnd)) fail('roll');
      if (!C.apply(g, g.ask, { t: 'pick', c: Math.floor(rnd() * 3) }, rnd)) fail('pick');
      const P = C.prompt(g);
      g.players.forEach((p, i) => { if (!C.apply(g, i, { t: 'ans', a: C.cpuWrite(g.pi, P.n, p.temp, rnd) }, rnd)) fail('ans'); });
      // now and then a player writes two responses the table takes as one
      if (rnd() < 0.2) { const a = g.ans[0]; if (a.length > 1 && a[0]) a[1] = a[0]; }
      if (!C.apply(g, -1, { t: 'reveal' })) fail('reveal');
      const lv0 = g.players.map(p => p.lv);
      // plain reading: points
      const keys = g.players.map((p, i) => g.ans[i].filter(Boolean).map(t => C.keyOf(g.pi, t)));
      const want = keys.map((ks, i) => ks.length + [...new Set(ks)].reduce((s, key) => s + keys.filter((o, j) => j !== i && o.includes(key)).length, 0));
      C.apply(g, -1, { t: 'score' });
      if (want.join() !== g.pts.join()) fail('pts ' + want + ' / ' + g.pts);
      // plain reading: the pawns
      const f = C.DIE[g.roll], sc = g.pts, vals = [...new Set(sc)].sort((a, b) => a - b);
      let cnt = f === 's' ? 1 : f; if (n === 3 && cnt === 3) cnt = 2;
      const low = vals.slice(0, cnt), hi = vals[vals.length - 1];
      const exp = lv0.map((l, i) => { let t = l; if (low.includes(sc[i])) t++; if (f === 's' && sc[i] === hi && t < levels) t = Math.max(0, t - 1); return t; });
      if (f === 's') stars++;
      g.players.forEach((p, i) => {
        if (Math.min(exp[i], levels) !== p.lv) fail('lv ' + i + ' ' + exp[i] + ' ' + p.lv + ' face ' + f);
        if (!!p.out !== (exp[i] >= levels)) fail('out');
        if (p.lv < lv0[i]) { ups++; if (f !== 's') fail('moved up without the star'); }
      });
      C.apply(g, -1, { t: 'next' });
      expectAsk = (expectAsk + 1) % n;
    }
    if (g.phase !== 'over') fail('never ended n=' + n);
    const w = C.winners(g), out = g.players.filter(p => p.out).length;
    if (out === n) { allOuts++; if (w.length !== n) fail('all out: everyone wins'); }
    else if (w.some(i => g.players[i].out) || g.players.some((p, i) => !p.out && !w.includes(i))) fail('winners');
    lens.push(g.round);
  }
  lens.sort((a, b) => a - b);
  console.log(levels + ' levels, ' + n + ' players: turns median ' + lens[lens.length >> 1] + ', middle 80% ' + lens[Math.floor(lens.length * .1)] + ' to ' + lens[Math.floor(lens.length * .9)] + ', most ' + lens[lens.length - 1]);
}
console.log('star turns ' + stars + ', pawns moved up ' + ups + ', games where every pawn left at once ' + allOuts);
console.log(bad ? bad + ' failures' : 'every turn checked: ok');
process.exit(bad ? 1 : 0);
