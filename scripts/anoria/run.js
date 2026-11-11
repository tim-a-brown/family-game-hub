// Balance runs for Anoria. node run.js <experiment> [games]
'use strict';
const { play, PROF, rng, shuffle } = require('../../games/anoria/engine'); const { CARDS, GUIDES, PLACES, ARCH } = require('../../games/anoria/cards');
const FACS = ['D', 'S', 'V', 'A', 'W'], GL = Object.keys(GUIDES), DECK = require('../../games/anoria/coll').DECK;
function randDeck(R) {
  for (;;) { const fs = shuffle(FACS.slice(), R).slice(0, 2), pool = []; for (const k in CARDS) { const c = CARDS[k]; if (fs.indexOf(c.f) >= 0 || c.f === 'N') pool.push(k, k); }
    const d = shuffle(pool, R).slice(0, DECK); if (d.filter(k => CARDS[k].t === 'fig').length >= Math.round(DECK * 17 / 30)) return d; }
}
const pct = (a, b) => b ? (100 * a / b).toFixed(1) : '-';
function batch(n, cfg, mk, seed0) {
  const r = { n, w: [0, 0], rounds: 0, seen: 0, long: 0, draw: 0, seals: 0, margin: 0, lead3: 0, lead3n: 0, changes: 0, clash: 0, ko: 0, jump: 0, walk: 0, lines: 0, plays: 0, home: 0, upsets: 0, last: 0, close: 0 };
  for (let i = 0; i < n; i++) {
    const R = rng(seed0 + i * 7919), g = mk(R, i), S = play(g.decks, g.guides, g.profs, cfg, seed0 * 31 + i), st = S.st;
    if (S.winner < 0) r.draw++; else r.w[S.winner]++; r.rounds += S.round; r.seen += (S.P[0].drawn + S.P[1].drawn + 2 * S.cfg.hand) / 2; if (S.round >= 10) r.long++;
    if (S.how === 'seals') r.seals++; const d = Math.abs(S.P[0].renown - S.P[1].renown); r.margin += d; if (d <= 2 && S.how !== 'seals') r.close++;
    const l3 = st.lead[2]; if (l3 != null && l3 >= 0) { r.lead3n++; if (l3 === S.winner) r.lead3++; }
    let ch = 0, prev = -1; for (const l of st.lead) { if (l >= 0) { if (prev >= 0 && l !== prev) ch++; prev = l; } } r.changes += ch;
    const pl = st.lead[st.lead.length - 2]; if (pl != null && pl >= 0 && S.winner >= 0 && pl !== S.winner) r.last++;
    for (const k of ['clash', 'ko', 'jump', 'walk', 'lines', 'plays', 'home', 'upsets']) r[k] += st[k];
    if (g.after) g.after(S);
  }
  return r;
}
const fmt = r => `rounds ${(r.rounds / r.n).toFixed(1)} (10+: ${pct(r.long, r.n)}%)  cards seen ${(r.seen / r.n).toFixed(1)} of ${DECK}  first player ${pct(r.w[0], r.n)}%  draws ${pct(r.draw, r.n)}%  seal wins ${pct(r.seals, r.n)}%  margin ${(r.margin / r.n).toFixed(1)}  within 2: ${pct(r.close, r.n)}%  leader after r3 wins ${pct(r.lead3, r.lead3n)}%  lead changes ${(r.changes / r.n).toFixed(2)}  last-round flips ${pct(r.last, r.n)}%  clashes ${(r.clash / r.n).toFixed(1)}  KOs ${(r.ko / r.n).toFixed(1)}  jumps ${(r.jump / r.n).toFixed(1)}  walks ${(r.walk / r.n).toFixed(1)}  lines ${(r.lines / r.n).toFixed(2)}  figures ${(r.plays / r.n).toFixed(1)} (home ${pct(r.home, r.plays)}%)`;
const mirror = prof => (R) => ({ decks: [randDeck(R), randDeck(R)], guides: [GL[(R() * 5) | 0], GL[(R() * 5) | 0]], profs: [prof, prof] });
const exp = process.argv[2], n = +(process.argv[3] || 1000), EX = {};
EX.rules = () => {
  for (const spark of ['round', 'hold', 'mix']) for (const scoring of ['round', 'end']) for (const order of ['alt', 'fixed'])
    console.log(`${spark}/${scoring}/${order}:  ` + fmt(batch(n, { spark, scoring, order }, mirror(PROF.holder), 11)));
};
module.exports = { EX, batch, fmt, mirror, randDeck, pct, GL, FACS, n };
if (require.main === module) { if (EX[exp]) EX[exp](); else require('./exp2')(exp, n); }
