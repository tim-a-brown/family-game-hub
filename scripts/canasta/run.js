#!/usr/bin/env node
// Canasta: plays thousands of computer games with the page's own rules (games/canasta-core.js) and checks them.
//   node scripts/canasta/run.js [games=400] [seed=1]
// Every move is checked to be allowed, every card is accounted for after every move (108 of them), every meld is a
// legal meld, and every game has to end. Then it plays the skill levels against each other and prints how often each
// one wins, with how the games went (hands, canastas, going out, concealed, red 3s, frozen piles taken).
'use strict';
const path = require('path');
const Core = require(path.join(__dirname, '../../games/canasta-core.js'));
const N = +process.argv[2] || 400, SEED = +process.argv[3] || 1;
let seed = SEED;
function rng() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x80000000; }
Core.C.rng = rng;

function count(st) {
  let n = st.stock.length + st.pile.length;
  st.hands.forEach(h => n += h.length);
  st.melds.forEach(ms => ms.forEach(m => n += m.cards.length));
  st.red3.forEach(r => n += r.length);
  return n;
}
function checkMelds(st, where) {
  st.melds.forEach((ms, s) => {
    const seen = {};
    ms.forEach(m => {
      const w = m.cards.filter(Core.isWild).length, nat = m.cards.length - w;
      if (m.cards.length < 3 || w > 3 || nat < 2) throw new Error(where + ': bad meld ' + JSON.stringify(m));
      if (seen[m.r]) throw new Error(where + ': two melds of ' + m.r);
      seen[m.r] = 1;
      if (!m.cards.every(c => Core.isWild(c) || c.r === m.r)) throw new Error(where + ': mixed ranks in meld');
      if (m.r === '3' && w) throw new Error(where + ': wild in black 3 meld');
    });
  });
  st.hands.forEach(h => h.forEach(c => { if (Core.isRed3(c)) throw new Error(where + ': red 3 left in a hand'); }));
}

function play(kind, levels, opts) {
  opts = opts || {};
  const n = Core.KINDS[kind].n;
  const st = Core.newGame({ kind, players: levels.map((l, i) => ({ name: 'P' + i, cpu: true, level: l })), target: opts.target || 5000 });
  const T = { hands: 0, moves: 0, asks: 0, no: 0, take: 0, bigPile: 0, conc: 0, out: 0, stockEnd: 0, red3End: 0, canN: 0, canM: 0, red4: 0, firstMeld: [], spoilt: 0 };
  let guard = 0, lastRound = st.round;
  while (st.phase !== 'over') {
    if (++guard > 20000) throw new Error('game did not end (' + kind + ')');
    const p = Core.turn(st);
    const a = Core.bot(st, p);
    if (!a) throw new Error('no move for seat ' + p + ' in phase ' + st.phase);
    const before = JSON.stringify(st);
    const mv = Core.apply(st, p, a);
    if (!mv) {
      const S0 = JSON.parse(before);
      throw new Error('illegal bot move ' + JSON.stringify(a) + ': ' + Core.why(S0, p, a) + '\nhand ' + S0.hands[p].map(c => c.r + c.s).join(' ') + ' phase ' + S0.phase + ' asked ' + S0.asked);
    }
    T.moves++;
    if (mv.k === 'ask') T.asks++;
    if (mv.k === 'answer' && !mv.yes) T.no++;
    if (mv.k === 'take') { T.take++; if (mv.big) T.bigPile++; }
    if (mv.can) mv.can.forEach(c => { if (c.spoilt) T.spoilt++; });
    if (mv.red4) T.red4++;
    if (st.round !== lastRound || st.phase === 'over') {
      const L = st.last; T.hands++;
      if (L.how === 'out') { T.out++; if (L.conc) T.conc++; } else if (L.how === 'stock') T.stockEnd++; else T.red3End++;
      L.res.forEach(r => { T.canN += r.cn; T.canM += r.cm; });
      lastRound = st.round;
    }
    if (st.phase !== 'over') {
      const c = count(st); if (c !== 108) throw new Error('cards: ' + c + ' after ' + JSON.stringify(a));
      checkMelds(st, kind + ' move ' + T.moves);
    }
  }
  T.winner = st.winner; T.scores = st.scores.slice(); T.comeback = st.last.comeback ? 1 : 0;
  return T;
}

function agg(list) {
  const o = {}; list.forEach(t => Object.keys(t).forEach(k => { if (typeof t[k] === 'number') o[k] = (o[k] || 0) + t[k]; }));
  return o;
}
function pct(a, b) { return (100 * a / b).toFixed(1) + '%'; }

const t0 = Date.now();
console.log('Canasta robot runs, ' + N + ' games each, seed ' + SEED + '\n');
// 1. Every kind with every level, as a rules check
for (const kind of ['part', 'two', 'three']) {
  for (const lvl of ['easy', 'normal', 'hard', 'expert']) {
    const n = Core.KINDS[kind].n, games = [];
    for (let g = 0; g < Math.max(20, N / 4); g++) games.push(play(kind, Array(n).fill(lvl)));
    const A = agg(games);
    console.log(kind.padEnd(5), lvl.padEnd(6), 'hands/game', (A.hands / games.length).toFixed(1), ' moves/hand', (A.moves / A.hands).toFixed(0),
      ' out', pct(A.out, A.hands), ' concealed', pct(A.conc, A.hands), ' stock ran out', pct(A.stockEnd + A.red3End, A.hands),
      ' canastas/hand', ((A.canN + A.canM) / A.hands).toFixed(2), '(natural', pct(A.canN, A.canN + A.canM) + ')',
      ' piles taken/hand', (A.take / A.hands).toFixed(1), ' big frozen', A.bigPile, ' all 4 red 3s', A.red4, ' asks', A.asks, '(no', A.no + ')', ' comebacks', A.comeback);
  }
}
// 2. Skill against skill: partnerships of one level against the other (seats swap halfway), and heads up
console.log('');
function vs(kind, a, b) {
  let wa = 0, games = 0, margin = 0;
  for (let g = 0; g < N; g++) {
    const flip = g % 2, n = Core.KINDS[kind].n, lv = [];
    for (let p = 0; p < n; p++) lv.push((p % 2 === 0) !== !!flip ? a : b);
    const T = play(kind, lv);
    const aSide = flip ? 1 : 0;
    if (T.winner === aSide) wa++;
    margin += T.scores[aSide] - T.scores[1 - aSide];
    games++;
  }
  console.log(kind.padEnd(5), (a + ' vs ' + b).padEnd(16), a, 'wins', pct(wa, games), ' average margin', Math.round(margin / games));
}
for (const kind of ['part', 'two']) { vs(kind, 'normal', 'easy'); vs(kind, 'hard', 'normal'); vs(kind, 'hard', 'easy'); vs(kind, 'expert', 'hard'); vs(kind, 'expert', 'normal'); }
console.log('\n' + ((Date.now() - t0) / 1000).toFixed(1) + ' s');
