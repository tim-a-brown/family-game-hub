// UNO (spanishone): plays thousands of computer games with games/spanishone-core.js and checks the rules hold.
//   node scripts/spanishone-sim.js [games=3000] [seed=1]   (RULES=1: the rules check only; DUEL=1: the skill duels only)
// Checks after every move: all 108 cards are somewhere (draw pile, discard pile, hands) and no card is in two places;
// whoever's turn it is has a move; every game ends. Then plays the skill levels against each other.
'use strict';
const Core = require('../games/spanishone-core.js');
const N = +process.argv[2] || 3000;
let seed = +process.argv[3] || 1;
function rng() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
Core.C.rng = rng;

function check(st, where) {
  if (st.phase === 'over') return;
  const all = st.draw.concat(st.pile).concat(...st.hands);
  const ids = new Set(all.map(c => c.id));
  if (all.length !== 108 || ids.size !== 108) throw new Error(where + ': cards ' + all.length + ' unique ' + ids.size);
  if (st.turn < 0 || st.turn >= st.n) throw new Error(where + ': bad turn ' + st.turn);
  if (st.phase === 'play' && !st.color) throw new Error(where + ': no color in play');
}
function play(cfg, opt) {
  opt = opt || {};
  const st = Core.newGame(cfg);
  check(st, 'deal');
  let moves = 0;
  const tally = { stacks: 0, bluffsCaught: 0, wildOuts: 0, big15: 0, chain4: 0, catches: 0, swaps: 0, blocked: 0, challenges: 0 };
  while (st.phase !== 'over') {
    if (++moves > 20000) throw new Error('game did not end: ' + JSON.stringify(cfg.players.map(p => p.level)) + ' ' + JSON.stringify(st.opts));
    // someone off-turn noticing a missed call, now and then (as a person or a robot watching would)
    if (rng() < 0.3) for (let q = 0; q < st.n; q++) if (q !== st.turn) { const c = Core.botCatch(st, q); if (c) { Core.apply(st, q, c); tally.catches++; check(st, 'catch'); break; } }
    const p = Core.turn(st), a = Core.bot(st, p);
    if (!a) throw new Error('no move for ' + p + ' in phase ' + st.phase);
    const before = Core.clone(st);
    const mv = Core.apply(st, p, a);
    if (!mv) throw new Error('refused ' + JSON.stringify(a) + ' phase ' + before.phase + ' pend ' + before.pend + ' four ' + JSON.stringify(before.four));
    if (a.k === 'challenge') tally.challenges++;
    if (mv.caught) tally.bluffsCaught++;
    if (mv.stack) tally.stacks++;
    mv.ev.forEach(e => { if (e.e === 'swap' || e.e === 'rotate') tally.swaps++; if (e.e === 'blocked') tally.blocked++; if (e.e === 'out') { if (e.wild) tally.wildOuts++; if (st.last && st.last.big >= 0) tally.big15++; if (st.last && st.last.chain >= 4) tally.chain4++; } });
    check(st, 'after ' + a.k);
  }
  return { st, moves, tally };
}

const LV = ['easy', 'normal', 'hard'];
const DUEL = !!process.env.DUEL;
const tot = { games: 0, hands: 0, moves: 0 };
const sum = {};
for (let g = 0; g < (DUEL ? 0 : N); g++) {
  const n = 2 + Math.floor(rng() * 9);
  const players = []; for (let i = 0; i < n; i++) players.push({ name: 'P' + i, cpu: true, level: LV[Math.floor(rng() * 3)] });
  const cfg = { players, to: rng() < 0.25 ? 0 : 500, stack: rng() < 0.5, until: rng() < 0.3, seven: rng() < 0.4, four: rng() < 0.3 ? 'free' : 'challenge' };
  const r = play(cfg);
  tot.games++; tot.hands += r.st.round; tot.moves += r.moves;
  for (const k in r.tally) sum[k] = (sum[k] || 0) + r.tally[k];
}
if (!DUEL) console.log('Rules check: ' + tot.games + ' games, ' + tot.hands + ' hands, ' + tot.moves + ' moves, every one ended with all 108 cards in place.');
if (!DUEL) console.log('Per 100 hands: ' + Object.keys(sum).map(k => k + ' ' + (sum[k] * 100 / tot.hands).toFixed(1)).join(', '));

// The levels against each other: two players, one of each level, to 500, standard rules
function duel(a, b, games) {
  let wa = 0;
  for (let g = 0; g < games; g++) {
    const swap = g % 2, pl = [{ name: 'A', cpu: true, level: a }, { name: 'B', cpu: true, level: b }];
    if (swap) pl.reverse();
    const r = play({ players: pl, to: 500 });
    if (r.st.players[r.st.winner].name === 'A') wa++;
  }
  return wa / games;
}
function table(lvl, games) {
  // four players: one at this level against three Normal robots
  let w = 0;
  for (let g = 0; g < games; g++) {
    const pl = [0, 1, 2, 3].map(i => ({ name: 'P' + i, cpu: true, level: 'normal' })), at = g % 4;
    pl[at] = { name: 'X', cpu: true, level: lvl };
    const r = play({ players: pl, to: 500 });
    if (r.st.players[r.st.winner].name === 'X') w++;
  }
  return w / games;
}
if (process.env.RULES) process.exit(0);
const D = Math.max(200, Math.round(N / 5));
console.log('Two players, games to 500 (' + D + ' each): Normal beats Easy ' + (duel('normal', 'easy', D) * 100).toFixed(1) + '%, Hard beats Normal ' + (duel('hard', 'normal', D) * 100).toFixed(1) + '%, Hard beats Easy ' + (duel('hard', 'easy', D) * 100).toFixed(1) + '%');
console.log('Four players, one robot against three Normal (25% is even): Easy ' + (table('easy', D) * 100).toFixed(1) + '%, Normal ' + (table('normal', D) * 100).toFixed(1) + '%, Hard ' + (table('hard', D) * 100).toFixed(1) + '%');
