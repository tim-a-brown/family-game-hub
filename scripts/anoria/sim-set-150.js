// Plays robot games with the 128 Figures of scripts/anoria/set-150.json added to the card pool (in memory only: no
// game file is changed), and says how each new Figure does beside the Figures the game already has in its faction.
// It runs the same experiment as `node scripts/anoria/run.js cards`. The set's Relics and Deeds are left out: the
// engine names Relics and Deeds by their keys, so they cannot be played until it reads `as` (see "merge" in the JSON).
//   node scripts/anoria/sim-set-150.js [games]      (12000 games take about ten minutes)
'use strict';
const C = require('../../games/anoria/cards'), SET = require('./set-150.json').cards;
const OLD = Object.assign({}, C.CARDS), isFig = k => SET.some(c => c.key === k && c.t === 'fig');
SET.forEach(c => {
  if (c.t !== 'fig') return;
  const o = { n: c.n, t: 'fig', f: c.f, c: c.c, m: c.m, reg: c.reg, era: c.era, y: c.y, k: c.k || {} };
  if (c.arr) o.arr = c.arr; if (c.insp) o.insp = c.insp;
  const from = (c.from || []).filter(s => s[0] === '@' || OLD[s] || isFig(s)); if (from.length) o.from = from;   // (a Thread from one of the set's Relics waits for `as`)
  C.CARDS[c.key] = o;
});
const games = +(process.argv[2] || 3000), lines = [], log = console.log;
console.log = s => lines.push(String(s)); require('./exp2')('cards', games); console.log = log;
const txt = lines.join('\n');
// exp2 prints each card as "  Name [F3]   51.2%  (1234)", the name cut to 30 letters with its tag
const tag = k => ((C.CARDS[k].n + ' [' + C.CARDS[k].f + C.CARDS[k].c + ']') + '                              ').slice(0, 30).trim();
const table = title => { const out = {}, at = txt.indexOf(title); if (at < 0) return out;
  for (const l of txt.slice(at).split('\n').slice(1)) { const m = l.match(/^  (.{30})([\d.]+)%\s+\((\d+)\)/); if (!m) break; out[m[1].trim()] = [+m[2], +m[3]]; } return out; };
const FAC = { D: 'Discovery', S: 'Statecraft', V: 'Valor', A: 'Arts', W: 'Wonder' };
console.log(lines[0]);
[['When the card is in the deck', 'WIN RATE WHEN THE CARD IS IN THE DECK'], ['When the card was played', 'WIN RATE WHEN THE CARD WAS PLAYED']].forEach(([label, title]) => {
  const T = table(title), base = {};
  Object.keys(OLD).forEach(k => { const c = OLD[k], r = T[tag(k)]; if (c.t !== 'fig' || !r) return; const b = base[c.f] || (base[c.f] = { sum: 0, n: 0, lo: 100, hi: 0 }); b.sum += r[0]; b.n++; b.lo = Math.min(b.lo, r[0]); b.hi = Math.max(b.hi, r[0]); });
  console.log('\n' + label + '. Figures the game has now, by faction: ' + Object.keys(FAC).map(f => FAC[f] + ' ' + (base[f].sum / base[f].n).toFixed(1) + '% (' + base[f].lo.toFixed(1) + ' to ' + base[f].hi.toFixed(1) + ')').join('; '));
  const rows = SET.filter(c => c.t === 'fig' && T[tag(c.key)]).map(c => { const r = T[tag(c.key)], b = base[c.f]; return { c: c, w: r[0], g: r[1], d: r[0] - b.sum / b.n, out: r[0] > b.hi + 2 ? 1 : r[0] < b.lo - 2 ? -1 : 0 }; }).sort((a, b) => b.d - a.d);
  const show = r => r.c.n + ' (' + FAC[r.c.f] + ' ' + r.c.c + '/' + r.c.m + ') ' + r.w.toFixed(1) + '%, ' + (r.d >= 0 ? '+' : '') + r.d.toFixed(1) + ' in ' + r.g + ' games';
  console.log('  The ' + rows.length + ' new Figures are ' + (rows.reduce((s, r) => s + r.d, 0) / rows.length).toFixed(1) + ' points from their factions on average.');
  Object.keys(FAC).forEach(f => { const rs = rows.filter(r => r.c.f === f); console.log('  ' + FAC[f] + ': new ' + (rs.reduce((s, r) => s + r.w, 0) / rs.length).toFixed(1) + '% beside ' + (base[f].sum / base[f].n).toFixed(1) + '%'); });
  console.log('  Highest:\n    ' + rows.slice(0, 10).map(show).join('\n    '));
  console.log('  Lowest:\n    ' + rows.slice(-10).map(show).join('\n    '));
  const out = rows.filter(r => r.out && r.g >= 300);
  console.log('  More than 2 points outside what their faction has now (300 games or more): ' + (out.length ? '\n    ' + out.map(show).join('\n    ') : 'none'));
});
