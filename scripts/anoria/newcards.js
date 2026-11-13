// Reads what "node scripts/anoria/run.js cards [games]" printed and says how each card of the third printing does
// beside the cards the game had before it: beside the older cards of its faction, and beside the older cards of its
// kind and cost.
//   node scripts/anoria/run.js cards 6000 > cards.txt ; node scripts/anoria/newcards.js cards.txt [pr]
// (pr: which cards are the new ones, 3 by default: the third printing; 5 for the cards of 2026-11-13)
// A random deck is two factions, so a strong faction lifts every card in it: each card is measured against its own
// faction (a Relic against the Relics). "Outside" means more than 2 points past the highest or the lowest older card
// of its faction, in 300 games or more; with about 1,900 games a card the measure itself wanders by about a point.
'use strict';
const fs = require('fs'), C = require('../../games/anoria/cards'), CARDS = C.CARDS;
const txt = fs.readFileSync(process.argv[2], 'utf8');
// run.js prints each card as "  Name [F3]   51.2%  (1234)", the name cut to 30 letters with its tag
const tag = k => ((CARDS[k].n + ' [' + CARDS[k].f + CARDS[k].c + ']') + '                              ').slice(0, 30).trim();
const table = title => { const out = {}, at = txt.indexOf(title); if (at < 0) return out;
  for (const l of txt.slice(at).split('\n').slice(1)) { const m = l.match(/^  (.{30})([\d.]+)%\s+\((\d+)\)/); if (!m) break; out[m[1].trim()] = [+m[2], +m[3]]; } return out; };
const FAC = { D: 'Discovery', S: 'Statecraft', V: 'Valor', A: 'Arts', W: 'Wonder', N: 'Relics' }, KIND = { fig: 'Figure', relic: 'Relic', deed: 'Deed' };
const PR = +process.argv[3] || 3, all = Object.keys(CARDS), old = all.filter(k => CARDS[k].pr !== PR), neu = all.filter(k => CARDS[k].pr === PR);
console.log(txt.split('\n')[0]);
[['When the card is in the deck', 'WIN RATE WHEN THE CARD IS IN THE DECK'], ['When the card was played', 'WIN RATE WHEN THE CARD WAS PLAYED']].forEach(([label, title]) => {
  const T = table(title), base = {};
  old.forEach(k => { const c = CARDS[k], r = T[tag(k)]; if (!r) return; const b = base[c.f] || (base[c.f] = { sum: 0, n: 0, lo: 100, hi: 0 }); b.sum += r[0]; b.n++; b.lo = Math.min(b.lo, r[0]); b.hi = Math.max(b.hi, r[0]); });
  const mean = f => base[f].sum / base[f].n;
  console.log('\n' + label + '. The cards the game had before, by faction: ' + Object.keys(FAC).filter(f => base[f]).map(f => FAC[f] + ' ' + mean(f).toFixed(1) + '% (' + base[f].lo.toFixed(1) + ' to ' + base[f].hi.toFixed(1) + ')').join('; '));
  const rows = neu.filter(k => T[tag(k)]).map(k => { const c = CARDS[k], r = T[tag(k)], b = base[c.f]; return { k: k, c: c, w: r[0], g: r[1], d: r[0] - mean(c.f), out: r[0] > b.hi + 2 ? 1 : r[0] < b.lo - 2 ? -1 : 0 }; }).sort((a, b) => b.d - a.d);
  const show = r => r.c.n + ' (' + FAC[r.c.f] + ', ' + KIND[r.c.t] + ', ' + r.c.c + (r.c.t === 'fig' ? '/' + r.c.m : '') + ') ' + r.w.toFixed(1) + '%, ' + (r.d >= 0 ? '+' : '') + r.d.toFixed(1) + ' in ' + r.g + ' games';
  console.log('  The ' + rows.length + ' new cards (pr ' + PR + ') are ' + (rows.reduce((s, r) => s + r.d, 0) / rows.length).toFixed(1) + ' points from their factions on average.');
  Object.keys(FAC).forEach(f => { const rs = rows.filter(r => r.c.f === f); if (rs.length) console.log('  ' + FAC[f] + ': new ' + (rs.reduce((s, r) => s + r.w, 0) / rs.length).toFixed(1) + '% beside ' + mean(f).toFixed(1) + '%'); });
  ['fig', 'relic', 'deed'].forEach(t => { const rs = rows.filter(r => r.c.t === t); if (rs.length) console.log('  ' + KIND[t] + 's among them: ' + (rs.reduce((s, r) => s + r.d, 0) / rs.length).toFixed(1) + ' points from their factions on average'); });
  console.log('  Highest:\n    ' + rows.slice(0, 10).map(show).join('\n    '));
  console.log('  Lowest:\n    ' + rows.slice(-10).map(show).join('\n    '));
  const out = rows.filter(r => r.out && r.g >= 300);
  console.log('  Outside what their faction had (by more than 2 points, 300 games or more): ' + (out.length ? '\n    ' + out.map(show).join('\n    ') : 'none'));
});
const fp = table('FACTION PAIRS'), fk = Object.keys(fp).sort((a, b) => fp[b][0] - fp[a][0]);
if (fk.length) console.log('\nPairs of factions, random decks from the whole set: ' + fk.map(k => k + ' ' + fp[k][0].toFixed(1) + '%').join(', ') + ' (spread ' + (fp[fk[0]][0] - fp[fk[fk.length - 1]][0]).toFixed(1) + ' points).');
