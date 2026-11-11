// How rare is each card? More powerful cards are rarer to find in packs, and this is where "more powerful" is measured:
// the engine's own numbers (the same games as "node run.js cards": random decks of two factions, random Guides and
// robot styles) together with the card's cost.
//   node scripts/anoria/rarity.js [games]      (6000 by default: about five minutes)
// For every card it works out
//   in the deck   how often a deck holding the card wins, less the same number for the card's whole faction (a deck is
//                 two factions, so a strong faction lifts every card in it: that is the faction's doing, not the card's)
//   played        the same for games in which the card was actually played
//   power         cost + (in the deck) + (played) / 4
// then ranks the set by power and cuts it into four tiers by share: the top 10% Legendary (4), the next 20% Rare (3),
// the next 30% Uncommon (2), the rest Common (1). It prints the table and the RARE lists to paste into
// games/anoria/coll.js (a card on none of the lists is tiered by its cost alone until this is run again). A new set is tiered the same way: add the cards, run this, paste, then
// run pacing.js.
'use strict';
const { PROF } = require('../../games/anoria/engine'); const { CARDS } = require('../../games/anoria/cards');
const { batch, randDeck, GL } = require('./run'), STD = Object.assign({}, require('../../games/anoria/engine').STD);
const n = +process.argv[2] || 6000, PN = ['holder', 'raider', 'keeper', 'brawler'], SHARE = [[4, 0.10], [3, 0.20], [2, 0.30]], NAME = { 1: 'Common', 2: 'Uncommon', 3: 'Rare', 4: 'Legendary' };
const inc = {}, pl = {}, bump = (m, k, w) => { const x = m[k] || (m[k] = [0, 0]); x[0]++; x[1] += w; };
batch(n, STD, R => { const g = { decks: [randDeck(R), randDeck(R)], guides: [GL[(R() * 5) | 0], GL[(R() * 5) | 0]], pn: [PN[(R() * 4) | 0], PN[(R() * 4) | 0]] }; g.profs = g.pn.map(x => PROF[x]);
  g.after = S => { for (let o = 0; o < 2; o++) { const w = S.winner === o ? 1 : S.winner < 0 ? 0.5 : 0; for (const c of new Set(g.decks[o])) bump(inc, c, w); for (const c in S.st.played[o]) bump(pl, c, w); } };
  return g; }, 101);
const rate = (m, k) => (m[k] && m[k][0] ? 100 * m[k][1] / m[k][0] : null), keys = Object.keys(CARDS);
const facMean = m => { const t = {}; keys.forEach(k => { const r = rate(m, k); if (r == null) return; const f = CARDS[k].f, x = t[f] || (t[f] = [0, 0]); x[0] += r; x[1]++; }); const o = {}; Object.keys(t).forEach(f => { o[f] = t[f][0] / t[f][1]; }); return o; };
const mi = facMean(inc), mp = facMean(pl);
const rows = keys.map(k => { const c = CARDS[k], a = rate(inc, k), b = rate(pl, k), la = a == null ? 0 : a - mi[c.f], lb = b == null ? 0 : b - mp[c.f]; return { k: k, c: c.c, la: la, lb: lb, p: c.c + la + lb / 4 }; }).sort((x, y) => y.p - x.p || (x.k < y.k ? -1 : 1));
let at = 0; const cut = SHARE.map(s => { at += Math.round(s[1] * rows.length); return [s[0], at]; });
rows.forEach((r, i) => { r.t = 1; for (const c of cut) if (i < c[1]) { r.t = c[0]; break; } });
const pad = (s, w) => (s + '                              ').slice(0, w), sg = v => (v >= 0 ? '+' : '') + v.toFixed(1);
console.log(rows.length + ' cards, ' + n + ' games of random decks under the standard rules.\n');
console.log(pad('card', 26) + pad('cost', 6) + pad('in the deck', 13) + pad('played', 9) + pad('power', 8) + 'tier');
rows.forEach(r => console.log(pad(CARDS[r.k].n + ' [' + CARDS[r.k].f + ']', 26) + pad(String(r.c), 6) + pad(sg(r.la), 13) + pad(sg(r.lb), 9) + pad(r.p.toFixed(2), 8) + NAME[r.t]));
console.log('\nFor games/anoria/coll.js:\nconst RARE = {');
[4, 3, 2, 1].forEach(t => console.log('  ' + t + ': \'' + rows.filter(r => r.t === t).map(r => r.k).join(' ') + '\'' + (t > 1 ? ',' : '')));
console.log('};');
console.log('\n' + [4, 3, 2, 1].map(t => NAME[t] + ' ' + rows.filter(r => r.t === t).length).join(', ') + '.');
