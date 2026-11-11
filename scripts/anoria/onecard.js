// One card under other numbers, measured on purpose: every game, one player's random deck is made to hold two copies
// of the card (in a deck of its own faction and one other), so the card is in the deck in every game and played in
// many. It prints the share of games that deck wins, and the share it wins when the card was played, for the card as
// it is and for each change tried.
//   node scripts/anoria/onecard.js <card> [games] '<json of changes to try, each an object of fields>'
//   e.g. node scripts/anoria/onecard.js menelik 2000 '[{"m":2},{"c":3,"m":2}]'
// (run.js cards measures every card at once, with about 1,900 games a card and far fewer in which it was played; this
// is for a card whose "played" number stands out there.)
'use strict';
const { play, PROF, STD, rng, shuffle } = require('../../games/anoria/engine'); const { CARDS } = require('../../games/anoria/cards'); const { GL, FACS } = require('./run'), DECK = require('../../games/anoria/coll').DECK;
const key = process.argv[2], n = +process.argv[3] || 2000, tries = [{}].concat(JSON.parse(process.argv[4] || '[]')), PN = ['holder', 'raider', 'keeper', 'brawler'], base = Object.assign({}, CARDS[key]);
if (!CARDS[key]) { console.error('no card ' + key); process.exit(1); }
const relics = Object.keys(CARDS).filter(k => CARDS[k].t === 'relic');
function deck(R, must) {
  for (;;) { const others = FACS.filter(f => f !== (must ? CARDS[must].f : '')), fs = must ? [CARDS[must].f, others[(R() * others.length) | 0]] : shuffle(FACS.slice(), R).slice(0, 2), pool = [];
    for (const k in CARDS) { if (fs.indexOf(CARDS[k].f) >= 0 && k !== must) pool.push(k, k); }
    const rel = shuffle(relics.concat(relics), R).slice(0, (R() * 4) | 0), head = must ? [must, must] : [];
    const d = head.concat(rel, shuffle(pool, R).slice(0, DECK - rel.length - head.length)); if (d.filter(k => CARDS[k].t === 'fig').length >= Math.round(DECK * 17 / 30)) return d; }
}
console.log(base.n + ' (' + base.c + '/' + base.m + '), two copies in one player\'s deck every game, ' + n + ' games for each line. 50% is level for a random deck of its faction only if the faction is: read the lines against each other.');
tries.forEach(ch => {
  Object.assign(CARDS[key], base, ch); let w = 0, pl = 0, pw = 0;
  for (let i = 0; i < n; i++) { const R = rng(52000 + i * 7919), a = deck(R, key), b = deck(R, null), fl = i & 1, pa = PROF[PN[(R() * 4) | 0]], pb = PROF[PN[(R() * 4) | 0]], ga = GL[(R() * 5) | 0], gb = GL[(R() * 5) | 0];
    const S = play(fl ? [b, a] : [a, b], fl ? [gb, ga] : [ga, gb], fl ? [pb, pa] : [pa, pb], STD, 52000 + i), me = fl ? 1 : 0, x = S.winner === me ? 1 : S.winner < 0 ? 0.5 : 0;
    w += x; if (S.st.played[me][key]) { pl++; pw += x; } }
  console.log('  ' + (Object.keys(ch).length ? JSON.stringify(ch) : 'as it is') + ': wins ' + (100 * w / n).toFixed(1) + '% with the card in the deck; played in ' + pl + ' games and won ' + (pl ? (100 * pw / pl).toFixed(1) : '-') + '% of those');
});
Object.assign(CARDS[key], base);
