// The five ready stacks by home region and by kind, beside the homes of each deck's own Figures.
//   node scripts/anoria/places/homes.js
// "at home": the chance that a Figure of the deck (Voyagers apart, who are at home everywhere) is at home on a Domain
// taken at random from the deck's own stack. Today's shared set of 12 Places gives every deck about 17%.
'use strict';
const C = require('./cards-places'), D = Object.keys(C.ARCH), R = ['MED', 'EUR', 'ASIA', 'AFR', 'AMER', 'MIDEAST', 'OCE'], K = Object.keys(C.KINDS);
const pad = (s, n) => (s + ' '.repeat(n)).slice(0, n), all = {}, allf = {};
console.log(pad('stack', 13) + R.map(r => pad(r, 8)).join('') + pad('at home', 9) + K.map(k => pad(k, 10)).join(''));
for (const d of D) { const s = {}, f = {}, kd = {}; let v = 0, n = 0;
  C.STACKS[d].forEach(id => { const p = C.PLACES[id]; s[p.reg] = (s[p.reg] || 0) + 1; all[p.reg] = (all[p.reg] || 0) + 1; kd[p.kind] = (kd[p.kind] || 0) + 1; });
  C.ARCH[d].cards.forEach(k => { const x = C.CARDS[k]; if (x.t === 'fig') { n++; if (x.k.voyager) v++; else f[x.reg] = (f[x.reg] || 0) + 1; } });
  let e = 0; for (const r in f) e += f[r] * (s[r] || 0) / C.STACKS[d].length;
  console.log(pad(d, 13) + R.map(r => pad(String(s[r] || 0), 8)).join('') + pad((100 * e / (n - v)).toFixed(0) + '%', 9) + K.map(k => pad(String(kd[k] || 0), 10)).join(''));
  console.log(pad('  its Figures', 13) + R.map(r => pad(String(f[r] || 0), 8)).join('') + 'and ' + v + ' Voyagers'); }
for (const k in C.CARDS) { const x = C.CARDS[k]; if (x.t === 'fig' && !C.NEW[k]) allf[x.reg] = (allf[x.reg] || 0) + 1; }
console.log(pad('all 75', 13) + R.map(r => pad(String(all[r] || 0), 8)).join('') + '\n' + pad('all Figures', 13) + R.map(r => pad(String(allf[r] || 0), 8)).join(''));
console.log('Figures with a home power: ' + Object.keys(C.CARDS).filter(k => C.CARDS[k].k && C.CARDS[k].k.homeDouble).map(k => C.CARDS[k].n + ' (' + C.CARDS[k].reg + ')').join(', '));
