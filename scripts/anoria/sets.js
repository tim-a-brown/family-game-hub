// The Guides' decks against each other (Tim, 2026-11-13: "the base 20 plus each Guide's 20 must make a balanced 40-card
// deck"). Every Guide's deck (the base set and that Guide's set, one of each card, with that Guide's own stack of 15
// Domains: coll.js guideDeck, guideStack) plays every other, each seat half the time, robots on both sides.
//   node scripts/anoria/sets.js [games per pair and seat] [seed] [robots: style | normal | hard | ...] [only: guide,guide] ['<json of rule changes>']
//   (the json as relicfx.js takes it: '{"rfx":0}' the Relic powers before 2026-11-13, '{"cards":{"stirrup":{"fx":"compass"}}}'
//   one card with other numbers or another power; relics-2026-11-13b.txt)
//   (SWAP='a:b,c:d' in the environment tries cards a and b changing places between their sets, or a card of the pool
//   taking a set card's place; with `only`, just the pairs those Guides play)
// style: each Guide's deck played by the robot that plays it best (STY below, found by trying all four styles against
// the field), as the ready decks were measured; a profile name plays every deck with that one robot.
// It also checks the sets (20 different cards each, no card in two sets, 8 Domains each). sets.txt has the last runs.
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const E = require('../../games/anoria/engine');
if (!isMainThread) {
  let cardsDone = false;
  parentPort.on('message', ({ i, job }) => { const { A, B, n, seed } = job, cfg = Object.assign({}, job.cfg || {}); let wa = 0, g = 0, rounds = 0, seals = 0;
    if (cfg.cards) { if (!cardsDone) { Object.keys(cfg.cards).forEach(k => { Object.assign(E.CARDS[k], cfg.cards[k]); if (cfg.cards[k].fx === null) delete E.CARDS[k].fx; }); cardsDone = true; } delete cfg.cards; }
    for (let k = 0; k < 2 * n; k++) { const fl = k & 1, x = fl ? [B, A] : [A, B];
      const S = E.play(x.map(d => d.cards), x.map(d => d.guide), x.map(d => E.PROF[d.style]), Object.assign({}, E.STD, cfg), seed + k, x.map(d => d.stack));
      wa += S.winner < 0 ? .5 : S.winner === (fl ? 1 : 0) ? 1 : 0; g++; rounds += S.round; if (S.how === 'seals') seals++; }
    parentPort.postMessage({ i, r: { wa, g, rounds, seals } }); });
} else {
  const C = require('../../games/anoria/cards'), os = require('os');
  // (a trial swap, before the sets are read: SWAP='a:b,c:d' swaps card a and card b between their sets, or puts a
  // card of the pool in a set's place; the fifth argument plays only the pairs with those Guides in them)
  (process.env.SWAP || '').split(',').filter(Boolean).forEach(x => { const [a, b] = x.split(':'), where = k => C.BASE.indexOf(k) >= 0 ? C.BASE : Object.values(C.GSET).find(s => s.indexOf(k) >= 0), A = where(a), B = where(b);
    if (A) A[A.indexOf(a)] = b; if (B) B[B.indexOf(b)] = a; console.log('swap: ' + a + ' and ' + b); });
  const Coll = require('../../games/anoria/coll');
  const n = +process.argv[2] || 50, seed = +process.argv[3] || 78000, prof = process.argv[4] || 'style', only = (process.argv[5] || '').split(',').filter(Boolean), cfg = JSON.parse(process.argv[6] || '{}');
  const STY = { cleopatra: 'holder', leonardo: 'raider', tubman: 'holder', shakespeare: 'brawler', suntzu: 'holder', curie: 'brawler', joan: 'brawler', saladin: 'brawler', wuzetian: 'holder', akbar: 'brawler', mansamusa: 'brawler', sorjuana: 'brawler' };
  const GK = Object.keys(C.GUIDES), seen = {};
  [['base', Coll.BASE]].concat(GK.map(g => [g, Coll.GSET[g]])).forEach(([id, s]) => { if (s.length !== 20 || new Set(s).size !== 20) throw new Error(id + ' is not 20 different cards'); s.forEach(k => { if (seen[k]) throw new Error(k + ' is in ' + seen[k] + ' and ' + id); seen[k] = id; }); if ((Coll.DSET[id] || []).length !== 8) throw new Error(id + ' has no 8 Domains'); });
  const decks = GK.map(g => ({ id: g, cards: Coll.guideDeck(g).cards, stack: Coll.guideStack(g), guide: g, style: prof === 'style' ? STY[g] : prof }));
  const jobs = []; let s = seed; for (let a = 0; a < decks.length; a++) for (let b = a + 1; b < decks.length; b++) if (!only.length || only.indexOf(decks[a].id) >= 0 || only.indexOf(decks[b].id) >= 0) jobs.push({ a, b, job: { A: decks[a], B: decks[b], n, seed: (s += 977), cfg } });
  const out = new Array(jobs.length); let next = 0, done = 0; const t0 = Date.now();
  const finish = () => {
    const T = decks.map(() => ({ w: 0, g: 0, rounds: 0, seals: 0 }));
    out.forEach((r, i) => { const { a, b } = jobs[i]; [[a, r.wa], [b, r.g - r.wa]].forEach(([p, w]) => { T[p].w += w; T[p].g += r.g; T[p].rounds += r.rounds; T[p].seals += r.seals; }); });
    console.log(jobs.length + ' pairs, ' + 2 * n + ' games each, seed ' + seed + ', robots: ' + prof + ' (' + Math.round((Date.now() - t0) / 1000) + ' s)');
    const rows = decks.map((d, i) => [d.id, T[i].g ? 100 * T[i].w / T[i].g : 50, (T[i].rounds / T[i].g).toFixed(2), (100 * T[i].seals / T[i].g).toFixed(0), d.style]).sort((x, y) => y[1] - x[1]);
    console.log('Guide'.padEnd(13) + 'won %  rounds  ended on Seals %  robot'); rows.forEach(r => console.log(r[0].padEnd(13) + r[1].toFixed(1).padEnd(7) + r[2].padEnd(8) + r[3].padEnd(17) + r[4]));
    const w = rows.map(r => r[1]); console.log('spread ' + (Math.max(...w) - Math.min(...w)).toFixed(1) + ' points (the five ready decks of before: 9.6)');
  };
  for (let k = 0; k < Math.min(os.cpus().length, jobs.length); k++) { const W = new Worker(__filename); const feed = () => { if (next < jobs.length) { const i = next++; W.postMessage({ i, job: jobs[i].job }); } else W.terminate(); };
    W.on('message', m => { out[m.i] = m.r; if (++done === jobs.length) finish(); feed(); }); feed(); }
}
