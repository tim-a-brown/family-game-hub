// How hard an Arrow Jam level is, in numbers (used by gen.js to keep the curve rising and by check.js to print it)
//   arrows, cells        how many arrows, and the cells they cover
//   free0                arrows that can leave at the start
//   chain                rounds a perfect player needs, taking every free arrow each round (the longest "must go first" chain)
//   avgFree              how many arrows are free at once on average, over many random clean clears
//   blind                bumps a player tapping at random would make clearing it (the sum of remaining / free - 1 over the clear),
//                        averaged over random clean clears: the main difficulty number
//   orders               log10 of the number of clean clearing orders (Knuth's estimate, averaged in log)
'use strict';
const C = require('../../games/arrowjam/core.js');

function rng(seed) {
  let a = seed >>> 0;
  return function () { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function metrics(L, runs, seed) {
  const R = rng(99991 + (seed || 0));
  const n = L.a.length, before = C.links(L), after = L.a.map(() => []);
  before.forEach((b, i) => b.forEach(j => after[j].push(i)));
  const rounds = C.solve(L);
  let blind = 0, orders = 0, frees = 0, steps = 0;
  for (let r = 0; r < runs; r++) {
    const need = before.map(b => b.length), free = [];
    need.forEach((k, i) => { if (!k) free.push(i); });
    let left = n, bb = 0, lo = 0;
    while (left) {
      const f = free.length;
      frees += f; steps++;
      bb += left / f - 1; lo += Math.log10(f);
      const k = Math.floor(R() * f), i = free[k];
      free[k] = free[f - 1]; free.pop(); left--;
      after[i].forEach(j => { if (--need[j] === 0) free.push(j); });
    }
    blind += bb; orders += lo;
  }
  let cells = 0, bent = 0, maxLen = 0;
  L.a.forEach(a => {
    cells += a.length - 1; maxLen = Math.max(maxLen, a.length - 1);
    let turns = 0; for (let k = 3; k < a.length; k++) if (a[k] - a[k - 1] !== a[k - 1] - a[k - 2]) turns++;
    if (turns) bent++;
  });
  const shapeCells = L.m ? L.m.split('').filter(x => x === '1').length : L.w * L.h;
  return { arrows: n, cells, fillPct: Math.round(100 * cells / shapeCells), bent, maxLen, free0: rounds ? rounds[0].length : 0, chain: rounds ? rounds.length : 0,
    avgFree: frees / steps, blind: blind / runs, orders: orders / runs };
}
module.exports = { metrics };
