#!/usr/bin/env node
// Checks Truth or Lies (games/truthlies.html): every classic and a run of generated puzzles at each level
// (and the next 60 dailies) must have exactly one answer, a full chain of deductions and words for every step.
// Usage: node scripts/check-truthlies.js [puzzles per level, default 200]
'use strict';
const fs = require('fs'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'games', 'truthlies.html'), 'utf8');
const eng = /\/\/ ==ENGINE==([\s\S]*?)\/\/ ==\/ENGINE==/.exec(src), cls = /\/\/ ==CLASSICS==([\s\S]*?)\/\/ ==\/CLASSICS==/.exec(src);
if (!eng || !cls) { console.error('ENGINE or CLASSICS markers missing'); process.exit(1); }
const TL = new Function(eng[1] + '; return TL;')();
const CLASSICS = new Function(cls[1] + '; return CLASSICS;')();
const N = +(process.argv[2] || 200);
let bad = 0;
function fail(msg) { bad++; console.log('FAIL ' + msg); }
function words(p, tag) {
  for (let i = 0; i < p.n; i++) {
    const s = TL.plainText(TL.say(p, i), p.names), w = TL.why(p, i);
    if (!s || /undefined|NaN|\[\[|…/.test(s)) fail(tag + ' statement ' + i + ': ' + s);
    if (!w.text || /undefined|NaN/.test(w.text)) fail(tag + ' why ' + i + ': ' + w.text);
  }
  const ch = TL.chain(p);
  if (!ch.length) fail(tag + ' no deduction steps');
  ch.forEach((st, k) => { const t = TL.stepWhy(p, st) + TL.stepLead(p, st); if (/undefined|NaN/.test(t)) fail(tag + ' step ' + k + ': ' + t); });
}
CLASSICS.forEach((c, i) => {
  const ex = c[4] || {}, fam = TL.SETS[c[0]].fam;
  const p = { fam, set: c[0], n: c[2].length, names: c[2], spy: ex.spy ? 1 : 0, rule: ex.rule, st: c[3].map((s, k) => ({ k: s[0], a: s.slice(1), v: (ex.v && ex.v[k]) || 0, f: 0 })) };
  const sols = TL.solve(p);
  if (sols.length !== 1) { fail('classic ' + (i + 1) + ': ' + sols.length + ' answers'); return; }
  p.sol = sols[0]; words(p, 'classic ' + (i + 1));
});
console.log(CLASSICS.length + ' classics checked');
const t0 = Date.now();
['easy', 'medium', 'hard'].forEach(lv => {
  const grades = {};
  for (let s = 1; s <= N; s++) {
    const p = TL.generate(lv, TL.hash('truthlies-' + lv + '-' + s));
    if (TL.solve(p).length !== 1) fail(lv + ' #' + s + ' not unique');
    const g = TL.grade(p); grades['k' + g.k] = (grades['k' + g.k] || 0) + 1;
    words(p, lv + ' #' + s);
  }
  console.log(lv + ': ' + N + ' puzzles, deduction sizes ' + JSON.stringify(grades));
});
const LV = ['hard', 'easy', 'easy', 'medium', 'medium', 'hard', 'hard'];
const day0 = Math.floor((Date.now() - new Date(2024, 0, 1).getTime()) / 86400000) + 1;
for (let d = day0; d < day0 + 60; d++) {
  const wd = new Date(new Date(2024, 0, 1).getTime() + (d - 1) * 86400000).getDay();
  const p = TL.generate(LV[wd], TL.hash('truthlies-daily-' + d));
  if (TL.solve(p).length !== 1) fail('daily ' + d + ' not unique');
}
console.log('60 dailies checked · ' + (Date.now() - t0) + 'ms');
console.log(bad ? bad + ' problems' : 'All good');
process.exit(bad ? 1 : 0);
