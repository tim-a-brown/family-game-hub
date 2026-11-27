// Crazy Eights: plays thousands of robot games with games/crazy8s-core.js to check the rules and that every game ends.
//   node scripts/crazy8s-sim.js [games per table, default 2000]
// For every count of players (2 to 7) and every set of options it checks, move by move: the 52 cards are all
// somewhere and never twice, a robot's move is always legal, the turn moves on, the scores add up to the hands'
// counts, and the game ends. Then it plays each skill against the others and prints how often each wins.
'use strict';
const Core = require('../games/crazy8s-core.js');
const N = +process.argv[2] || 2000;
// mulberry32: a small generator with no pattern from one game to the next (a plain LCG favored alternate seats)
let seed = 12345;
Core.C.rng = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
function fail(m, S) { console.error('FAIL: ' + m); if (S) console.error(JSON.stringify(S).slice(0, 2000)); process.exit(1); }
function check(S) {
  if (S.phase !== 'play') return;
  const all = [].concat(S.deck, S.disc, ...S.hands);
  if (all.length !== 52) fail('cards: ' + all.length, S);
  if (new Set(all).size !== 52) fail('a card is twice', S);
  if (S.turn < 0 || S.turn >= S.n) fail('turn ' + S.turn, S);
  if (Core.SUITS.indexOf(S.suit) < 0) fail('suit ' + S.suit, S);
}
function play(cfg) {
  const S = Core.newGame(cfg);
  let moves = 0, hands = 0;
  check(S);
  while (S.phase !== 'over') {
    const p = Core.turn(S);
    const a = Core.bot(S, p);
    if (!a) fail('no move for ' + p, S);
    const before = S.round, sc = S.scores.slice();
    const mv = Core.apply(S, p, a);
    if (!mv) fail('illegal robot move ' + JSON.stringify(a) + ' pend ' + S.pend + ' drew ' + S.drew, S);
    if (mv.end) {
      hands++;
      const L = S.last, gained = S.scores.reduce((t, v, i) => t + v - sc[i], 0);
      if (L.how === 'out' && gained !== L.cnt.reduce((t, v, i) => t + (i === L.w ? 0 : v), 0)) fail('score does not add up', S);
      if (L.how === 'out' && L.cnt[L.w] !== 0) fail('winner holds cards', S);
      if (S.phase === 'play' && S.round !== before + 1) fail('no new hand', S);
    }
    check(S);
    if (++moves > 20000) fail('game does not end', S);
  }
  if (S.winner < 0) fail('no winner', S);
  return { S, moves, hands };
}
// (Expert's look ahead is cut to a few deals for the rules check, and put back for its own duel)
const XR = Object.assign({}, Core.C.xr); Core.C.xr.min = 4; Core.C.xr.ms = 0;
const OPTS = [
  { draw: 'until', twos: 0, qs: 0 }, { draw: 'one', twos: 0, qs: 0 }, { draw: 'until', twos: 1, qs: 1 }, { draw: 'one', twos: 1, qs: 1 }, { draw: 'until', twos: 1, qs: 0 }
];
const t0 = Date.now();
let games = 0, stat = { eights: 0, clean: 0, sweep: 0, stack3: 0, stack4: 0, blocked: 0, hands: 0 };
for (let n = 2; n <= 7; n++) {
  for (const o of OPTS) {
    let mv = 0, hs = 0;
    for (let g = 0; g < Math.ceil(N / OPTS.length); g++) {
      const lvls = ['easy', 'normal', 'hard', 'expert'];
      const players = [];
      for (let i = 0; i < n; i++) players.push({ name: 'P' + i, cpu: true, level: lvls[(g + i) % 4] });
      const r = play(Object.assign({ players, target: g % 4 === 0 ? 0 : 100 }, o));
      games++; mv += r.moves; hs += r.hands; stat.hands += r.hands;
      stat.eights += r.S.stats.eights.reduce((a, b) => a + b, 0);
      stat.clean += r.S.stats.clean.reduce((a, b) => a + b, 0);
      if (r.S.stats.sweep != null) stat.sweep++;
      stat.blocked += r.S.hx.filter(x => x.b).length;
      r.S.highlights.forEach(h => { if (/^Three 2s/.test(h)) stat.stack3++; if (/^All four 2s/.test(h)) stat.stack4++; });
    }
    console.log(n + ' players, ' + JSON.stringify(o) + ': ' + (mv / Math.ceil(N / OPTS.length)).toFixed(0) + ' moves and ' + (hs / Math.ceil(N / OPTS.length)).toFixed(2) + ' hands a game');
  }
}
console.log('\n' + games + ' games, ' + stat.hands + ' hands, all ended. Per 1,000 hands: out with an 8 ' + (stat.eights * 1000 / stat.hands).toFixed(1) +
  ', out without drawing a card ' + (stat.clean * 1000 / stat.hands).toFixed(1) + ', three 2s stacked ' + (stat.stack3 * 1000 / stat.hands).toFixed(2) +
  ', all four ' + (stat.stack4 * 1000 / stat.hands).toFixed(2) + ', blocked ' + (stat.blocked * 1000 / stat.hands).toFixed(2) + '. Sweeps (3+ hands): ' + stat.sweep + ' games.');

// Skill against skill: two players and four, one of each skill against the others, wins counted by hand
function duel(levels, o, games) {
  const wins = {}; levels.forEach(l => { wins[l] = 0; });
  let hands = 0;
  for (let g = 0; g < games; g++) {
    const order = levels.slice(); const rot = g % levels.length; for (let i = 0; i < rot; i++) order.push(order.shift());
    const S = Core.newGame(Object.assign({ players: order.map((l, i) => ({ name: l + i, cpu: true, level: l })), target: 0 }, o));
    let moves = 0;
    while (S.phase !== 'over') { const p = Core.turn(S); Core.apply(S, p, Core.bot(S, p)); if (++moves > 20000) fail('stuck'); }
    if (S.last.w >= 0) wins[order[S.last.w]]++; hands++;
  }
  return levels.map(l => l + ' ' + (wins[l] * 100 / hands).toFixed(1) + '%').join(', ');
}
console.log('\nHands won (one hand each, seats rotated):');
for (const o of [OPTS[0], OPTS[2]]) {
  console.log(JSON.stringify(o));
  console.log('  easy vs normal: ' + duel(['easy', 'normal'], o, N));
  console.log('  normal vs hard: ' + duel(['normal', 'hard'], o, N));
  console.log('  easy vs hard:   ' + duel(['easy', 'hard'], o, N));
  Object.assign(Core.C.xr, XR, { ms: 0 });
  console.log('  hard vs expert: ' + duel(['hard', 'expert'], o, Math.min(N, 600)));
  Core.C.xr.min = 4;
  console.log('  three, one of each: ' + duel(['easy', 'normal', 'hard'], o, N));
}
console.log('\n' + ((Date.now() - t0) / 1000).toFixed(1) + ' s');
