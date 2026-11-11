// Does a deck built from the third printing run away with it? The 150 cards of the third printing are found only in
// packs, so nobody meets them in a ready deck: they are played in decks people build. This builds such decks the way
// the deck builder's "Finish the deck for me" does (games/anoria/coll.js finish(): two factions, a spread of costs,
// mostly Figures, three Relic cards at most) and plays them against the five ready decks.
//   node scripts/anoria/newdecks.js [games per built deck against each ready deck, each way round] [decks built per pair of factions] [first seed] [one pair, as SV]
// For each of the ten pairs of factions it builds decks from two pools:
//   new    only cards of the third printing (and its Relics)
//   all    every card of those two factions (and every Relic)
// A built deck gets each of the ten Guides in turn and one of the four robot styles; a ready deck plays as it does in
// endings.js (its own Guide and style). It prints each pair's share of wins against the ready decks, the spread
// between the best and the worst pair, and how each ready deck did against the built decks. 50% is level. One deck
// plays only a few dozen games, so the range across a pair's decks is wide: it is the pair's share that counts.
'use strict';
const { play, PROF, STD, rng } = require('../../games/anoria/engine'); const { ARCH, CARDS, GUIDES } = require('../../games/anoria/cards'); const Coll = require('../../games/anoria/coll');
const n = +process.argv[2] || 6, K = +process.argv[3] || 5, seed0 = +process.argv[4] || 7000, ONLY = process.argv[5] || '';
const FACS = ['D', 'S', 'V', 'A', 'W'], FN = { D: 'Discovery', S: 'Statecraft', V: 'Valor', A: 'Arts', W: 'Wonder' }, GL = Object.keys(GUIDES), PN = ['holder', 'raider', 'keeper', 'brawler'];
const READY = Object.keys(ARCH), style = { Explorers: 'raider', Legion: 'brawler', Legacy: 'keeper', Court: 'holder', Pathfinders: 'raider' };
const ready = k => ARCH[k].cards.concat(ARCH[k].cards);
// a deck from a pool, built by the game's own finish(): the collection owns two of every card in the pool
function build(pool, R) {
  const mem = { anoria_coll: JSON.stringify({ v: Coll.VER, starter: 'Explorers', cards: pool.reduce((o, k) => { o[k] = 2; return o; }, {}), guides: GL, seen: {}, fresh: {}, packs: [], wins: 0, games: 0, day: '', feats: {}, threads: {}, opened: 0, pid: 1, ed: {}, look: {} }) };
  Coll.use({ store: { get: k => (k in mem ? mem[k] : null), set: (k, v) => { mem[k] = v; } }, random: R });
  const d = Coll.finish({ cards: [] }); if (d.length !== Coll.DECK) throw new Error('a deck of ' + d.length + ' cards from a pool of ' + pool.length);
  return d;
}
const pct = (w, g) => (g ? 100 * w / g : 0).toFixed(1), pad = (s, w) => (s + '                                        ').slice(0, w);
const POOLS = { new: k => CARDS[k].pr === 3, all: () => true };
const out = {}, vs = {}, makeup = {}; let g = 0;
Object.keys(POOLS).forEach(pn => { out[pn] = {}; vs[pn] = {}; READY.forEach(r => { vs[pn][r] = [0, 0]; }); makeup[pn] = { fig: 0, relic: 0, deed: 0, pr3: 0, n: 0 };
  for (let a = 0; a < FACS.length; a++) for (let b = a + 1; b < FACS.length; b++) {
    if (ONLY && ONLY !== FACS[a] + FACS[b]) continue;
    const fs = [FACS[a], FACS[b]], pool = Object.keys(CARDS).filter(k => POOLS[pn](k) && (fs.indexOf(CARDS[k].f) >= 0 || CARDS[k].f === 'N')), rec = out[pn][fs.join('')] = [0, 0, []];
    for (let i = 0; i < K; i++) {
      const R = rng(seed0 + 97 * (a * 5 + b) + 13 * i + (pn === 'all' ? 5000 : 0)), deck = build(pool, R), guide = GL[(i + a + 2 * b) % GL.length], prof = PROF[PN[(R() * 4) | 0]];
      const mine = [0, 0]; rec[2].push(mine);
      deck.forEach(k => { makeup[pn][CARDS[k].t]++; if (CARDS[k].pr === 3) makeup[pn].pr3++; }); makeup[pn].n++;
      for (const r of READY) for (let j = 0; j < 2 * n; j++) { const fl = j & 1;
        const S = play(fl ? [ready(r), deck] : [deck, ready(r)], fl ? [ARCH[r].guide, guide] : [guide, ARCH[r].guide], fl ? [PROF[style[r]], prof] : [prof, PROF[style[r]]], STD, seed0 + g); g++;
        const me = fl ? 1 : 0, w = S.winner === me ? 1 : S.winner < 0 ? 0.5 : 0; rec[0] += w; rec[1]++; mine[0] += w; mine[1]++; vs[pn][r][0] += 1 - w; vs[pn][r][1]++; }
    }
  } });
console.log('Decks built by "Finish the deck for me" against the five ready decks: ' + K + ' decks for each pair of factions, ' + (2 * n) + ' games against each ready deck (' + g + ' games, first seed ' + seed0 + '). 50% is level.');
Object.keys(POOLS).forEach(pn => {
  const rows = Object.keys(out[pn]).map(k => [k, out[pn][k][0], out[pn][k][1], out[pn][k][2].map(d => 100 * d[0] / d[1]).sort((x, y) => x - y)]).sort((x, y) => y[1] / y[2] - x[1] / x[2]), tw = rows.reduce((s, x) => s + x[1], 0), tg = rows.reduce((s, x) => s + x[2], 0), m = makeup[pn];
  console.log('\n' + (pn === 'new' ? 'Built from the third printing only' : 'Built from every card of the two factions') + ': ' + pct(tw, tg) + '% of games won against the ready decks. A built deck holds ' + (m.fig / m.n).toFixed(1) + ' Figures, ' + (m.deed / m.n).toFixed(1) + ' Deeds and ' + (m.relic / m.n).toFixed(1) + ' Relics on average, ' + (m.pr3 / m.n).toFixed(1) + ' of its 40 cards from the third printing.');
  rows.forEach(x => console.log('  ' + pad(FN[x[0][0]] + ' and ' + FN[x[0][1]], 26) + pct(x[1], x[2]) + '%  (' + x[2] + ' games; its ' + x[3].length + ' decks from ' + x[3][0].toFixed(0) + '% to ' + x[3][x[3].length - 1].toFixed(0) + '%)'));
  console.log('  spread between the best and the worst pair: ' + (100 * (rows[0][1] / rows[0][2] - rows[rows.length - 1][1] / rows[rows.length - 1][2])).toFixed(1) + ' points');
  console.log('  each ready deck against these built decks: ' + READY.map(r => r + ' ' + pct(vs[pn][r][0], vs[pn][r][1])).join('  '));
});
