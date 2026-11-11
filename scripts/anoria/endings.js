// How games end under a rule: the five ready decks against each other, with each deck's share of wins, how long games
// run, how they end (Renown, Seals, the round limit), which decks win on Seals, and how often a draw pile runs out.
//   node scripts/anoria/endings.js "<label>" '<json of rule changes>' [games per pair of decks] [first seed] [copies of each card]
//   e.g. node scripts/anoria/endings.js "four Seals" '{"seals":4}' 200 91000
// A draw pile "runs out" when a player draws its last card; they "draw past it" when they need a card after that, and
// the engine shuffles their discard pile into a new draw pile (draw() in engine.js).
// With "log":1 in the json it also says in which round the piles ran out and how far past them players drew (slower).
// "cards" in the json tries other numbers on a card without touching cards.js: '{"cards":{"theodora":{"m":3}}}'.
const { play, PROF, STD } = require('../../games/anoria/engine'); const { ARCH, CARDS } = require('../../games/anoria/cards');
const label = process.argv[2] || 'today', cfg = Object.assign({}, STD, JSON.parse(process.argv[3] || '{}')), n = +process.argv[4] || 100, seed0 = +process.argv[5] || 1000, copies = +process.argv[6] || 2;
if (cfg.cards) { Object.keys(cfg.cards).forEach(k => Object.assign(CARDS[k], cfg.cards[k])); delete cfg.cards; }
const D = Object.keys(ARCH), style = { Explorers: 'raider', Legion: 'brawler', Legacy: 'keeper', Court: 'holder', Pathfinders: 'raider' };
const dk = k => { let a = []; for (let i = 0; i < copies; i++) a = a.concat(ARCH[k].cards); return a; }, SIZE = dk(D[0]).length, PILE = SIZE - 5;
const T = {}; D.forEach(d => { T[d] = { g: 0, w: 0, seal: 0, lostSeal: 0, out: 0, past: 0, seen: 0 }; });
let g = 0, rounds = [], byRen = 0, bySeal = 0, byCap = 0, seat0 = 0, outGame = 0, pastGame = 0, pastBoth = 0, outPl = 0, pastPl = 0, seen = [], outRound = [], lastRounds = [], depth = [], bare = 0, margin = 0, left = [], big = 0, bigGame = 0;
for (let x = 0; x < D.length; x++) for (let y = x + 1; y < D.length; y++) {
  const a = D[x], b = D[y];
  for (let i = 0; i < 2 * n; i++) { const fl = i & 1, nm = fl ? [b, a] : [a, b];
    const S = play(nm.map(dk), nm.map(k => ARCH[k].guide), nm.map(k => PROF[style[k]]), cfg, seed0 + g); g++; rounds.push(S.round);
    const top = Math.max(S.P[0].renown, S.P[1].renown);
    if (S.how === 'seals') bySeal++; else if (top >= cfg.target) byRen++; else byCap++;
    if (S.winner === 0) seat0++; margin += Math.abs(S.P[0].renown - S.P[1].renown);
    let o = 0, p = 0;
    for (let s = 0; s < 2; s++) { const t = T[nm[s]], dr = S.P[s].drawn || 0; t.g++; t.w += S.winner < 0 ? .5 : S.winner === s ? 1 : 0;
      if (S.how === 'seals') { if (S.winner === s) t.seal++; else t.lostSeal++; }
      const c = Math.min(SIZE, dr + 5); seen.push(c); t.seen += c; left.push(Math.max(0, PILE - dr));
      if (dr >= PILE) { o++; t.out++; outPl++; } if (dr > PILE) { p++; t.past++; pastPl++; depth.push(dr - PILE); } if (dr >= PILE + 10) big++;
      if (!S.P[s].deck.length && !(S.P[s].gone || []).length) bare++;
      if (S.ev && dr >= PILE) { let rd = 1, k = 0; for (const e of S.ev) { if (e.t === 'turn') rd = e.round; else if (e.t === 'draw' && e.o === s && ++k === PILE) { outRound.push(rd); lastRounds.push(S.round - rd); break; } } } }
    if (o) outGame++; if (p) pastGame++; if (p === 2) pastBoth++; if (big) bigGame++; big = 0;
  } }
const pc = (a, b) => (100 * a / b).toFixed(1) + '%', avg = a => a.reduce((s, x) => s + x, 0) / a.length;
rounds.sort((x, y) => x - y); seen.sort((x, y) => x - y); left.sort((x, y) => x - y); const q = (a, f) => a[Math.floor(f * (a.length - 1))];
const w = D.map(d => 100 * T[d].w / T[d].g), sp = Math.max.apply(null, w) - Math.min.apply(null, w);
console.log(label + '  (' + g + ' games, first seed ' + seed0 + ', decks of ' + SIZE + ', first to ' + cfg.target + ', ' + (cfg.seals || 3) + ' Seals)' +
  '\n  decks: ' + D.map((d, i) => d + ' ' + w[i].toFixed(1)).join('  ') + '  spread ' + sp.toFixed(1) + '  (seat 1 wins ' + pc(seat0, g) + ')' +
  '\n  rounds: average ' + avg(rounds).toFixed(2) + ', most games ' + q(rounds, .1) + ' to ' + q(rounds, .9) + ', longest ' + q(rounds, 1) + '; ' + [6, 7, 8, 9, 10, 11, 12].map(r => r + '+ in ' + (100 * rounds.filter(v => v >= r).length / g).toFixed(0) + '%').join(', ') +
  '\n  ends: ' + pc(byRen, g) + ' on Renown, ' + pc(bySeal, g) + ' on Seals, ' + pc(byCap, g) + ' at the round limit; the winner is ahead by ' + (margin / g).toFixed(1) + ' Renown on average' +
  '\n  games each deck wins on Seals (of all its games): ' + D.map(d => d.slice(0, 5) + ' ' + pc(T[d].seal, T[d].g)).join('  ') + '; loses on Seals: ' + D.map(d => d.slice(0, 5) + ' ' + pc(T[d].lostSeal, T[d].g)).join('  ') +
  '\n  a draw pile runs out (its last card is drawn): in ' + pc(outGame, g) + ' of games for at least one player, ' + pc(outPl, 2 * g) + ' of players' +
  '\n  a player draws past the last card (the discard pile is shuffled into a new draw pile): in ' + pc(pastGame, g) + ' of games for at least one player (both in ' + pc(pastBoth, g) + '), ' + pc(pastPl, 2 * g) + ' of players' +
  '\n     by deck (players who draw past the last card): ' + D.map(d => d.slice(0, 5) + ' ' + pc(T[d].past, T[d].g)).join('  ') +
  (depth.length ? '\n     those players draw ' + avg(depth).toFixed(1) + ' cards from the new pile on average (most ' + Math.max.apply(null, depth) + '); players who end with no draw pile and no discard pile: ' + pc(bare, 2 * g) : '') +
  (outRound.length ? '\n     the last card is drawn in round ' + avg(outRound).toFixed(1) + ' on average (earliest ' + Math.min.apply(null, outRound) + '), ' + avg(lastRounds).toFixed(1) + ' rounds before the game ends; in the last round or the one before it in ' + pc(lastRounds.filter(x => x <= 1).length, lastRounds.length) + ' of those cases' : '') +
  '\n     a deck 10 cards bigger would have had its last card drawn in about ' + pc(bigGame, g) + ' of these games (a player drew that many)' +
  '\n  cards of the ' + SIZE + ' a player has drawn by the end: average ' + avg(seen).toFixed(1) + ', middle ' + q(seen, .5) + ', one player in ten ' + q(seen, .9) + ' or more; by deck ' + D.map(d => d.slice(0, 5) + ' ' + (T[d].seen / T[d].g).toFixed(1)).join('  ') +
  '\n  cards left in the draw pile at the end: average ' + avg(left).toFixed(1) + ', middle ' + q(left, .5) + ', one player in ten ' + q(left, .1) + ' or fewer');
