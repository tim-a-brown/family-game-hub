#!/usr/bin/env node
// Go Fish: plays thousands of games between the computer players with the game's own rules (games/gofish-core.js),
// checks every move against the rules and that every game ends with all 13 books down, and measures the three skill
// levels against each other and how often the game's special moments come up.
//   node scripts/gofish-sim.js [games] [seed]
'use strict';
const Core = require('../games/gofish-core.js');
const N = +process.argv[2] || 4000;
let seed = +process.argv[3] || 7;
Core.C.rng = function () {   // (mulberry32: a small generator with good low bits)
  seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

function check(st) {
  let total = st.pond.length;
  st.hands.forEach(h => { total += h.length; });
  st.books.forEach(b => { total += b.length * 4; });
  if (total !== 52) throw new Error('cards lost: ' + total);
  const ids = {};
  st.pond.concat(...st.hands).forEach(c => { if (ids[c.id]) throw new Error('card twice ' + c.id); ids[c.id] = 1; });
  st.hands.forEach((h, p) => { Core.ranksIn(h).forEach(r => { if (Core.countOf(h, r) >= 4) throw new Error('book left in hand'); }); });
}
function play(levels, next) {
  const players = levels.map((l, i) => ({ name: 'P' + i, cpu: true, level: l }));
  const st = Core.newGame({ players, next });
  check(st);
  let moves = 0;
  const m = { lucky: 0, big: 0, streak4: 0, sweep: 0, dealt: st.dealtBooks.length, dry: 0, refill: 0 };
  while (st.phase !== 'over') {
    const p = Core.turn(st);
    const a = Core.bot(st, p);
    if (!a) throw new Error('no move for ' + p + ' in ' + st.phase);
    // the move the bot wants must be one a person could make
    if (a.k === 'ask' && !Core.canAsk(st, p, a.to, a.r)) throw new Error('illegal ask');
    const before = Core.clone(st);
    const mv = Core.apply(st, p, a);
    if (!mv) throw new Error('refused move ' + JSON.stringify(a) + ' phase ' + before.phase);
    // the answer is the truth: a "Go fish" only when they had none
    if (mv.k === 'ask' && mv.n !== Core.countOf(before.hands[a.to], a.r)) throw new Error('wrong answer');
    if (mv.k === 'ask' && mv.n === 3) m.big++;
    if (mv.k === 'ask' && mv.dry) m.dry++;
    if (mv.k === 'fish' && mv.lucky) m.lucky++;
    if (mv.k === 'fish' && mv.refill) m.refill++;
    if (mv.streak === 4) m.streak4++;
    check(st);
    if (++moves > 3000) throw new Error('game did not end');
  }
  if (Core.booksDown(st) !== 13) throw new Error('ended with ' + Core.booksDown(st) + ' books');
  if (st.hands.some(h => h.length) || st.pond.length) throw new Error('cards left at the end');
  if (Math.max(...Core.scores(st)) === 13) m.sweep++;
  return { st, moves, m };
}

const LV = ['easy', 'normal', 'hard'];
const wins = { easy: 0, normal: 0, hard: 0 }, games = { easy: 0, normal: 0, hard: 0 };
const tot = { lucky: 0, big: 0, streak4: 0, sweep: 0, dealt: 0, dry: 0, refill: 0, moves: 0 };
const head = {};   // head to head, two players
let n2 = 0;
for (let g = 0; g < N; g++) {
  const n = 2 + (g % 5);
  const levels = [];
  for (let i = 0; i < n; i++) levels.push(LV[(g + i) % 3]);
  const r = play(levels, g % 4 === 3 ? 'asked' : 'left');
  tot.moves += r.moves;
  Object.keys(r.m).forEach(k => { tot[k] += r.m[k]; });
  const w = r.st.winner;
  levels.forEach((l, i) => { games[l] += 1 / 1; if (w.indexOf(i) >= 0) wins[l] += 1 / w.length; });
  if (n === 2) { n2++; const k = levels.join(' v '); head[k] = head[k] || [0, 0, 0]; head[k][2]++; w.forEach(i => { head[k][i] += 1 / w.length; }); }
}
const pct = (a, b) => (100 * a / b).toFixed(1) + '%';
console.log(N + ' games, every one ended with all 13 books down and no card lost.');
console.log('Average moves a game: ' + (tot.moves / N).toFixed(1));
console.log('Share of wins against share of seats:');
LV.forEach(l => console.log('  ' + l.padEnd(7) + ' won ' + pct(wins[l], games[l]) + ' of the games it sat in'));
console.log('Two players, head to head (wins of the first, wins of the second, games):');
Object.keys(head).forEach(k => console.log('  ' + k.padEnd(16) + head[k].map(x => +x.toFixed(1)).join(', ')));
console.log('Moments, per game: the fish you wished for ' + (tot.lucky / N).toFixed(2) + ', three of a rank in one ask ' + (tot.big / N).toFixed(3) +
  ', a streak of 4 asks ' + (tot.streak4 / N).toFixed(3) + ', all 13 books by one player ' + pct(tot.sweep, N) + ', a book in the deal ' + (tot.dealt / N).toFixed(3));
console.log('Go fish with the pond empty, per game: ' + (tot.dry / N).toFixed(2) + '; a fish because the hand ran out: ' + (tot.refill / N).toFixed(2));
