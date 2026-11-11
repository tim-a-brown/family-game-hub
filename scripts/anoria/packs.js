// (An early experiment, kept for its results in packs.txt. The collection's real rules are in games/anoria/coll.js and
// are played by pacing.js.)
// Opening packs: how fast does a collection fill? Starter = one ready deck (two of each of its cards), then packs of 12
// from the 65-card core set. A pack never holds a card you already have the cap of.
//   node scripts/anoria/packs.js [trials]
const { CARDS, ARCH } = require('../../games/anoria/cards'); const { rng } = require('../../games/anoria/engine');
const T = +process.argv[2] || 2000, ALL = Object.keys(CARDS), SIZE = 12;
function run(cap, fresh, R) {   // fresh = chance each slot goes to a card you have none of, while any are left
  const have = {}; const st = Object.keys(ARCH)[(R() * 5) | 0]; ARCH[st].cards.forEach(c => have[c] = Math.min(2, cap));
  const need = () => ALL.filter(c => (have[c] || 0) < cap), log = [];
  for (let p = 1; p <= 60; p++) { let nw = 0, dup = 0;
    for (let s = 0; s < SIZE; s++) { const pool = need(); if (!pool.length) break; const un = pool.filter(c => !have[c]);
      const from = un.length && R() < fresh ? un : pool, c = from[(R() * from.length) | 0]; if (!have[c]) nw++; else dup++; have[c] = (have[c] || 0) + 1; }
    log.push({ nw, dup, distinct: ALL.filter(c => have[c]).length, full: !need().length }); if (!need().length) break; }
  return log;
}
for (const [cap, fresh, label] of [[2, 0, 'cap 2, any card you can still use'], [2, 0.75, 'cap 2, three slots in four go to cards you have none of'], [3, 0.75, 'cap 3, same'], [4, 0.75, 'cap 4, same']]) {
  const R = rng(99 + cap * 7 + fresh * 100); let n3 = 0, d3 = 0, own3 = 0, all1 = 0, done = 0, row = [0, 0, 0, 0, 0, 0];
  for (let t = 0; t < T; t++) { const L = run(cap, fresh, R); for (let i = 0; i < 3; i++) { n3 += L[i].nw; d3 += L[i].dup; } own3 += L[2].distinct; all1 += L.findIndex(x => x.distinct === ALL.length) + 1; done += L.length; for (let i = 0; i < 6; i++) row[i] += L[i] ? L[i].nw : 0; }
  console.log(label + '\n  first three packs: ' + (n3 / T).toFixed(1) + ' cards you have never had, ' + (d3 / T).toFixed(1) + ' extra copies; you then own ' + (own3 / T).toFixed(1) + ' of ' + ALL.length + ' different cards'
    + '\n  new cards in packs 1 to 6: ' + row.map(x => (x / T).toFixed(1)).join(', ') + '\n  every card seen after ' + (all1 / T).toFixed(1) + ' packs; nothing left to collect after ' + (done / T).toFixed(1) + ' packs\n');
}
