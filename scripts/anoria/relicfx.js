// Every Relic power on the same footing (2026-11-13, relics-2026-11-13.txt). In every game both players have a random
// deck of two factions with no Relics in it; player A's deck then has its last two cards changed for two copies of one
// Relic. Every line plays the same games (the same decks, Guides, robots and seeds), so the lines differ only by the
// Relic, and A's share of wins over 50% is what that Relic's power is worth against two ordinary cards of A's factions.
//   node scripts/anoria/relicfx.js [games for each line] [seed] ['<json of rule changes>'] [relic,relic,...]
//   e.g. node scripts/anoria/relicfx.js 3000 61000 '{"hold":9}' manuscripts,press
// The default relics are one of each power. "none" is the line with no Relic (A's deck as it was: about 50%).
// ± is one standard error of A's share. Seats swap every game; the robots and Guides are drawn at random.
'use strict';
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const E = require('../../games/anoria/engine'), C = require('../../games/anoria/cards'), DECK = require('../../games/anoria/coll').DECK;
const CARDS = C.CARDS, FACS = ['D', 'S', 'V', 'A', 'W'], GL = Object.keys(C.GUIDES), PN = ['holder', 'raider', 'keeper', 'brawler'];
function deck(R) {
  for (;;) { const fs = E.shuffle(FACS.slice(), R).slice(0, 2), pool = []; for (const k in CARDS) if (fs.indexOf(CARDS[k].f) >= 0 && CARDS[k].t !== 'relic') pool.push(k, k);
    const d = E.shuffle(pool, R).slice(0, DECK); if (d.filter(k => CARDS[k].t === 'fig').length >= Math.round(DECK * 17 / 30)) return d; }
}
function game(i, seed, relic, cfg) {
  const R = E.rng(seed + i * 7919), a = deck(R), b = deck(R), fl = i & 1, pa = E.PROF[PN[(R() * 4) | 0]], pb = E.PROF[PN[(R() * 4) | 0]], ga = GL[(R() * GL.length) | 0], gb = GL[(R() * GL.length) | 0];
  if (relic !== 'none') { a[DECK - 1] = relic; a[DECK - 2] = relic; }
  const S = E.play(fl ? [b, a] : [a, b], fl ? [gb, ga] : [ga, gb], fl ? [pb, pa] : [pa, pb], Object.assign({}, E.STD, cfg), seed + i), me = fl ? 1 : 0;
  return { x: S.winner === me ? 1 : S.winner < 0 ? 0.5 : 0, pl: relic !== 'none' && !!S.st.played[me][relic], r: S.round };
}
if (!isMainThread) {
  const { lo, hi, seed, relic, cfg } = workerData; let w = 0, pl = 0, pw = 0, n = 0, rounds = 0;
  for (let i = lo; i < hi; i++) { const g = game(i, seed, relic, cfg); n++; w += g.x; rounds += g.r; if (g.pl) { pl++; pw += g.x; } }
  parentPort.postMessage({ w, pl, pw, n, rounds });
} else {
  const n = +process.argv[2] || 2000, seed = +process.argv[3] || 61000, cfg = JSON.parse(process.argv[4] || '{}');
  const keys = (process.argv[5] || 'none,press,compass,antikythera,dsteel,abacus,kudurru,manuscripts').split(',');
  keys.forEach(k => { if (k !== 'none' && (!CARDS[k] || CARDS[k].t !== 'relic')) { console.error('no Relic ' + k); process.exit(1); } });
  const cpus = Math.max(1, require('os').cpus().length), t0 = Date.now();
  console.log('Each Relic power, two copies in player A\'s deck, ' + n + ' games a line, seed ' + seed + (Object.keys(cfg).length ? ', rules ' + JSON.stringify(cfg) : '') + '. 50% is two ordinary cards.');
  (async () => {
    for (const k of keys) {
      const parts = await Promise.all(Array.from({ length: cpus }, (_, j) => new Promise((ok, no) => { const lo = Math.floor(n * j / cpus), hi = Math.floor(n * (j + 1) / cpus);
        const W = new Worker(__filename, { workerData: { lo, hi, seed, relic: k, cfg } }); W.on('message', ok); W.on('error', no); })));
      const t = parts.reduce((s, p) => { for (const f in p) s[f] = (s[f] || 0) + p[f]; return s; }, {}), p = t.w / t.n, se = Math.sqrt(p * (1 - p) / t.n);
      const nm = k === 'none' ? 'no Relic' : CARDS[k].n + ' (' + E.fxOf(k) + ', ' + CARDS[k].c + ')';
      console.log('  ' + (nm + '                                        ').slice(0, 40) + (100 * p).toFixed(1) + '% ±' + (100 * se).toFixed(1) + (k === 'none' ? '' : '   played in ' + (100 * t.pl / t.n).toFixed(0) + '% of games, won ' + (t.pl ? (100 * t.pw / t.pl).toFixed(1) : '-') + '% of those') + '   rounds ' + (t.rounds / t.n).toFixed(2));
    }
    console.log('  (' + Math.round((Date.now() - t0) / 1000) + ' s)');
  })();
}
