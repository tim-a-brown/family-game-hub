// The first Figures that cost 1 Spark (Tim, 2026-11-13: "i meant 1 spark more than 1 might actually but yes design and
// measure them"). The results are in spark1-2026-11-13.txt.
//   node scripts/anoria/spark1.js one <card> [games] ['<json of changes>'] ['<extra card>']
//        the card two copies in one player's deck in every game (as onecard.js), beside the cards it is measured against
//        (REF). An extra card puts two copies of that one in the same deck too (Yan Hui with Confucius).
//   node scripts/anoria/spark1.js games [games] [seed]
//        whether cheap bodies change games: the same random decks with and without the 1-Spark Figures of their two
//        factions (two copies of each, in place of other cards of those factions), each pair of decks played both ways:
//        how long games run, how they end, the Renown scored at Domains nobody else stood on, the cards that reward
//        outnumbering, the Roman Forum, the Rock of Gibraltar and Thermopylae. And one deck with them against the same
//        deck without them.
'use strict';
const E = require('../../games/anoria/engine'), { PROF, STD, rng, shuffle } = E;
const { CARDS, PLACES } = require('../../games/anoria/cards'), { GL, FACS } = require('./run'), DECK = require('../../games/anoria/coll').DECK;
const ONE = Object.keys(CARDS).filter(k => CARDS[k].t === 'fig' && CARDS[k].c === 1);
const PN = ['holder', 'raider', 'keeper', 'brawler'], relics = Object.keys(CARDS).filter(k => CARDS[k].t === 'relic');
// a random deck of two factions (the card's own and one other when `must`), Relics 0 to 3, mostly Figures. `no`: cards
// left out of the pool (the 1-Spark Figures, for the "without" decks)
function deck(R, must, no, fs0) {
  for (;;) { const others = FACS.filter(f => !must || f !== CARDS[must[0]].f), fs = fs0 || (must ? [CARDS[must[0]].f, others[(R() * others.length) | 0]] : shuffle(FACS.slice(), R).slice(0, 2)), pool = [];
    for (const k in CARDS) { if (fs.indexOf(CARDS[k].f) >= 0 && (!must || must.indexOf(k) < 0) && !(no && no[k])) pool.push(k, k); }
    const rel = shuffle(relics.concat(relics), R).slice(0, (R() * 4) | 0), head = must ? must.concat(must) : [];
    const d = head.concat(rel, shuffle(pool, R).slice(0, DECK - rel.length - head.length)); if (d.filter(k => CARDS[k].t === 'fig').length >= Math.round(DECK * 17 / 30)) return { d, fs }; }
}
const mode = process.argv[2];
if (mode === 'one') {
  const key = process.argv[3], n = +process.argv[4] || 2000, tries = [{}].concat(JSON.parse(process.argv[5] || '[]')), extra = process.argv[6], base = Object.assign({}, CARDS[key]);
  tries.forEach(ch => {
    Object.assign(CARDS[key], base, ch); let w = 0, pl = 0, pw = 0;
    for (let i = 0; i < n; i++) { const R = rng(52000 + i * 7919), a = deck(R, extra ? [key, extra] : [key]).d, b = deck(R, null).d, fl = i & 1, pa = PROF[PN[(R() * 4) | 0]], pb = PROF[PN[(R() * 4) | 0]], ga = GL[(R() * 5) | 0], gb = GL[(R() * 5) | 0];
      const S = E.play(fl ? [b, a] : [a, b], fl ? [gb, ga] : [ga, gb], fl ? [pb, pa] : [pa, pb], STD, 52000 + i), me = fl ? 1 : 0, x = S.winner === me ? 1 : S.winner < 0 ? 0.5 : 0;
      w += x; if (S.st.played[me][key]) { pl++; pw += x; } }
    console.log(CARDS[key].n + ' (' + CARDS[key].c + '/' + CARDS[key].m + ')' + (extra ? ' with two ' + CARDS[extra].n : '') + (Object.keys(ch).length ? ' ' + JSON.stringify(ch) : '') + ': wins ' + (100 * w / n).toFixed(1) + '% with the card in the deck; played in ' + pl + ' games, won ' + (pl ? (100 * pw / pl).toFixed(1) : '-') + '% of those');
  });
  Object.assign(CARDS[key], base);
} else if (mode === 'games') {
  const n = +process.argv[3] || 2000, seed0 = +process.argv[4] || 7000, NO = {}; ONE.forEach(k => { NO[k] = 1; });
  // the same game played to its end, with the Domains looked at before each count
  function game(decks, guides, profs, seed, st) {
    const R = rng(seed), stacks = E.stacksFor(decks, rng((seed ^ 0x5bd1e995) >>> 0)), S = E.newGame(decks, guides, STD, R, stacks, { profs: profs });
    while (!S.over) {
      const first = E.firstOf(S); for (const o of [first, 1 - first]) { if (S.over) break; S.turn = o; E.startTurn(S); E.aiTurn(S, profs[o], R); E.endTurn(S); }
      if (S.over) break;
      for (let i = 0; i < 5; i++) { const pw = E.pw(S, i), here = S.figs.filter(f => f.p === i), m = E.mights(S, i), h = E.holder(S, i);
        if (pw === 'vote' && here.length) { st.vote++; let mx = Math.max(m[0], m[1]); const byM = m[0] === m[1] ? -1 : m.indexOf(mx); if (h !== byM) st.voteDiff++; }
        if (pw === 'narrow') { st.narrow++; for (let o = 0; o < 2; o++) if (here.filter(f => f.o === o).length >= 2) st.narrowFull++; }
        if (pw === 'siege' && h >= 0) { st.siege++; const own = here.filter(f => f.o === h).length, opp = here.length - own; if (own < opp) st.siegeOut++; } }
      S.ev = []; E.endRound(S);
      for (const e of S.ev) if (e.t === 'hold' && e.o >= 0) { st.ren += e.n; if (!S.figs.some(f => f.p === e.p && f.o !== e.o) && !S.figs.some(f => f.p === e.p && f.o === e.o) ) st.renBare += e.n; else if (!S.figs.some(f => f.p === e.p && f.o !== e.o)) st.renAlone += e.n; }
      S.ev = null;
    }
    return S;
  }
  const OUT = ['orator', 'uprising', 'underdog'], outCard = k => CARDS[k].t === 'fig' && OUT.some(w => CARDS[k].k[w]);
  const mk = () => ({ g: 0, rounds: 0, seals: 0, ren: 0, renAlone: 0, renBare: 0, figs: 0, clash: 0, ko: 0, cheap: 0, vote: 0, voteDiff: 0, narrow: 0, narrowFull: 0, siege: 0, siegeOut: 0, outPl: 0, outW: 0, first: 0 });
  const with_ = mk(), without = mk(), head = { w: 0, n: 0 };
  for (let i = 0; i < n; i++) {
    const R = rng(seed0 + i * 7919), A = deck(R, null, NO), B = deck(R, null, NO), guides = [GL[(R() * 5) | 0], GL[(R() * 5) | 0]], profs = [PROF[PN[(R() * 4) | 0]], PROF[PN[(R() * 4) | 0]]];
    // the same deck with two copies of each 1-Spark Figure of its factions, in place of the last cards of the deck
    const cheap = d => { const add = ONE.filter(k => d.fs.indexOf(CARDS[k].f) >= 0); const x = d.d.slice(0, DECK - 2 * add.length); return add.concat(add, x); };
    const A1 = cheap(A), B1 = cheap(B);
    for (const [decks, st] of [[[A.d, B.d], without], [[A1, B1], with_]]) {
      const S = game(decks, guides, profs, seed0 + i, st); st.g++; st.rounds += S.round; if (S.how === 'seals') st.seals++;
      st.clash += S.st.clash; st.ko += S.st.ko; st.figs += S.st.plays;
      for (let o = 0; o < 2; o++) { const pl = Object.keys(S.st.played[o]); st.cheap += pl.filter(k => ONE.indexOf(k) >= 0).length; if (pl.some(outCard)) { st.outPl++; st.outW += S.winner === o ? 1 : S.winner < 0 ? 0.5 : 0; } }
    }
    // one deck with the cheap Figures against the same deck without them, both seats
    for (const fl of [0, 1]) { const decks = fl ? [A.d, A1] : [A1, A.d], S = E.play(decks, [guides[0], guides[0]], [profs[0], profs[0]], STD, seed0 + i * 3 + fl), me = fl ? 1 : 0; head.n++; head.w += S.winner === me ? 1 : S.winner < 0 ? 0.5 : 0; }
  }
  const pc = (a, b) => b ? (100 * a / b).toFixed(1) + '%' : '-', av = (a, b) => (a / b).toFixed(2);
  console.log('1-Spark Figures: ' + ONE.map(k => CARDS[k].n + ' (' + CARDS[k].f + ' ' + CARDS[k].c + '/' + CARDS[k].m + ')').join(', '));
  console.log(n + ' pairs of random decks (two factions each), every pair played twice: once as they are with no 1-Spark Figure, once with two copies of each 1-Spark Figure of their factions in place of other cards.\n');
  for (const [lab, s] of [['without', without], ['with', with_]]) console.log(('  ' + lab + '       ').slice(0, 11) + 'rounds ' + av(s.rounds, s.g) + '  Seal wins ' + pc(s.seals, s.g) + '  Figures played ' + av(s.figs, s.g) + ' (1-Spark ' + av(s.cheap, s.g) + ')  clashes ' + av(s.clash, s.g) + '  knock-outs ' + av(s.ko, s.g) +
    '\n             Renown from Domains ' + av(s.ren, s.g) + ' a game: held with nobody else there ' + pc(s.renAlone, s.ren) + ', held with no Figure at all ' + pc(s.renBare, s.ren) +
    '\n             a deck that played an outnumbering card (orator, uprising, underdog) won ' + pc(s.outW, s.outPl) + ' (' + s.outPl + ' decks)' +
    '\n             Roman Forum: the most Figures decided it against the Might in ' + pc(s.voteDiff, s.vote) + ' of ' + s.vote + ' counts; Thermopylae: a side with its two there in ' + pc(s.narrowFull, s.narrow) + ' of ' + s.narrow + ' counts; Gibraltar: its holder outnumbered there in ' + pc(s.siegeOut, s.siege) + ' of ' + s.siege + ' counts');
  console.log('\nOne deck with its 1-Spark Figures against the same deck without them (the same Guide and robot): ' + pc(head.w, head.n) + ' of ' + head.n + ' games.');
} else console.log('node spark1.js one <card> [games] [changes] [extra] | games [games] [seed]');
