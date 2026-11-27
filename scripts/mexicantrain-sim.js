// node scripts/mexicantrain-sim.js [games] [seed] [expertGames]
// Plays Mexican Train games between robots with games/mexicantrain-core.js, at every table size from 2 to 8 and with
// every option, and checks the rules as it goes:
//   every move a robot makes is one of the legal moves, and every legal move is a real one (apply accepts it);
//   the 91 tiles are all there after every move (the engine, the hands, the boneyard and the trains), none twice;
//   every train is a chain from the engine, tile matching tile;
//   a marker comes off only when its owner plays on their own train, and goes on only when they pass;
//   a double that must be covered is covered before any other play;
//   every round ends (someone goes out, or nobody can play with the boneyard empty), and every game ends after its rounds.
// Then it seats the four skills against each other and reports how they finish (lowest total wins). Expert plays
// each choice out many times, so its games are fewer (expertGames, 40 by default; 0 leaves Expert out), and a few of
// them have every move checked as above.
'use strict';
const C = require('../games/mexicantrain-core.js');
const N = +(process.argv[2] || 3000);
let seed = +(process.argv[3] || 7);
// mulberry32 (a plain linear congruential generator here made Easy look far weaker than it is: its choices and the
// deals came from neighboring numbers of one sequence)
function rand() { let t = (seed = (seed + 0x6D2B79F5) >>> 0); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
Math.random = rand;   // (Easy's choices and the deals come out the same each run)

function fail(msg, S) { console.error('FAIL', msg); if (S) console.error(JSON.stringify({ round: S.round, cur: S.cur, tn: S.tn, dbl: S.dbl, trains: S.trains }).slice(0, 1500)); process.exit(1); }
function check(S) {
  const seen = {};
  function add(t, where) { const id = C.tid(t); if (seen[id]) fail('tile ' + t + ' twice (' + where + ')', S); seen[id] = 1; }
  if (S.phase === 'play') add([S.eng, S.eng], 'engine');
  else return;
  S.hands.forEach((h, i) => h.forEach(t => add(t, 'hand ' + i)));
  S.bone.forEach(t => add(t, 'bone'));
  S.trains.forEach((T, i) => { let v = S.eng; T.t.forEach(t => { if (t[0] !== v) fail('train ' + i + ' breaks the chain', S); v = t[1]; add(t, 'train ' + i); }); });
  if (Object.keys(seen).length !== 91) fail('tiles missing: ' + Object.keys(seen).length, S);
  if (!S.trains[S.n].m) fail('the Mexican Train must always be open', S);
}
const stat = { games: 0, rounds: 0, moves: 0, outs: 0, blocks: 0, maxMoves: 0, covers: 0, longest: 0, runs: 0, blanks: 0 };
function playGame(n, o, levels, fast) {
  const players = []; for (let i = 0; i < n; i++) players.push({ name: 'P' + i, cpu: true, level: levels ? levels[i] : ['easy', 'normal', 'hard'][i % 3] });
  const S = C.newGame(players, o, Math.floor(rand() * 4294967296));
  check(S);
  let moves = 0, roundMoves = 0;
  while (S.phase === 'play') {
    const p = S.cur;
    if (fast) { if (!C.apply(S, p, C.botMove(S, p))) fail('apply refused a move', S); moves++; if (++roundMoves > 5000) fail('a game that does not end', S); continue; }
    const legal = C.legal(S, p), mv = C.botMove(S, p);
    if (mv.k === 'play' && !legal.some(m => m.id === mv.id && m.tr === mv.tr)) fail('robot chose an illegal play', S);
    if (mv.k === 'draw' && !C.canDraw(S)) fail('robot drew when it could not', S);
    if (mv.k === 'pass' && !C.canPass(S)) fail('robot passed when it could not', S);
    // every legal move is accepted by apply (on a copy)
    if (moves % 7 === 0) legal.forEach(m => { const X = C.clone(S); if (!C.apply(X, p, { k: 'play', id: m.id, tr: m.tr })) fail('a legal play was refused', S); });
    // a move by the wrong seat is refused
    if (n > 1 && C.apply(C.clone(S), (p + 1) % n, mv)) fail('a move out of turn was accepted', S);
    const before = C.clone(S), round0 = S.round;
    const ev = C.apply(S, p, mv);
    if (!ev) fail('apply refused the robot\'s move ' + JSON.stringify(mv), before);
    moves++; roundMoves++;
    ev.forEach(e => {
      if (e.e === 'play') {
        if (before.dbl && before.o.dbl === 'cover' && e.tr !== before.dbl.tr) fail('played elsewhere while a double was owed', before);
        if (e.tr !== p && e.tr !== before.n && !before.trains[e.tr].m) fail('played on a closed train', before);
        if (e.cover) stat.covers++;
      }
      if (e.e === 'round') {
        stat.rounds++; roundMoves = 0;
        if (e.res.k === 'out') { stat.outs++; if (before.hands[e.res.w].length !== 1) fail('went out with more than one tile', before); }
        else { stat.blocks++; if (before.bone.length) fail('blocked with tiles in the boneyard', before); }
        if (e.res.blank != null) stat.blanks++;
        const T = (S.prev.trains[e.res.w >= 0 ? e.res.w : 0] || {}).t || []; stat.longest = Math.max(stat.longest, T.length);
      }
    });
    // markers: off only by the owner's own play, on only by the owner's pass
    if (S.round === round0) before.trains.forEach((T, i) => {
      if (i === before.n) return;
      const now = S.trains[i].m;
      if (T.m && !now && !(i === p && ev.some(e => e.e === 'play' && e.tr === p))) fail('a marker came off without its owner playing', before);
      if (!T.m && now && !(i === p && ev.some(e => e.e === 'pass'))) fail('a marker went on without a pass', before);
    });
    check(S);
    if (roundMoves > 600) fail('a round that does not end', S);
  }
  if (S.rr.length !== S.R) fail('rounds played ' + S.rr.length + ' of ' + S.R, S);
  S.scores.forEach((x, i) => { if (x !== S.rr.reduce((s, r) => s + r[i], 0)) fail('a total that does not add up', S); });
  stat.games++; stat.moves += moves; stat.maxMoves = Math.max(stat.maxMoves, moves);
  if (S.hl.run) stat.runs++;
  return S;
}
const OPTS = [{}, { first: 'run' }, { dbl: 'open' }, { first: 'run', dbl: 'open', rounds: 7 }];
const t0 = Date.now();
for (let g = 0; g < N; g++) playGame(2 + (g % 7), OPTS[g % OPTS.length]);
console.log('Rules: ' + stat.games + ' games, ' + stat.rounds + ' rounds, ' + stat.moves + ' moves, all legal, every game ended.');
console.log('  ' + stat.outs + ' rounds went out, ' + stat.blocks + ' blocked; ' + stat.covers + ' doubles covered; the double blank was caught ' + stat.blanks + ' times;');
console.log('  the most moves in a game ' + stat.maxMoves + '; first-turn runs in ' + stat.runs + ' games; ' + ((Date.now() - t0) / 1000).toFixed(1) + ' s');

// ── The skills against each other ──
function duel(a, b, n, games) {
  const tot = {}, wins = {}; [a, b].forEach(k => { tot[k] = 0; wins[k] = 0; });
  let ties = 0;
  for (let g = 0; g < games; g++) {
    const lv = []; for (let i = 0; i < n; i++) lv.push((i + g) % 2 ? b : a);
    const T = playGame(n, OPTS[g % 2], lv, true);
    const per = {}; T.scores.forEach((x, i) => { per[lv[i]] = (per[lv[i]] || []).concat(x); });
    [a, b].forEach(k => { tot[k] += per[k].reduce((s, x) => s + x, 0) / per[k].length; });
    const lo = Math.min.apply(null, T.scores), w = T.scores.map((x, i) => x === lo ? lv[i] : null).filter(Boolean);
    if (w.indexOf(a) >= 0 && w.indexOf(b) >= 0) ties++; else wins[w[0]]++;
  }
  console.log('  ' + n + ' players, ' + a + ' against ' + b + ': ' + a + ' wins ' + (100 * wins[a] / games).toFixed(1) + '%, ' + b + ' ' + (100 * wins[b] / games).toFixed(1) + '%' + (ties ? ', ties ' + ties : '') +
    '; average total ' + a + ' ' + (tot[a] / games).toFixed(0) + ', ' + b + ' ' + (tot[b] / games).toFixed(0));
}
const D = Math.max(200, Math.round(N / 2));
console.log('Skills (' + D + ' games each, seats alternating):');
duel('hard', 'normal', 2, D); duel('normal', 'easy', 2, D); duel('hard', 'easy', 2, D); duel('hard', 'normal', 4, D); duel('normal', 'easy', 4, D);
const E = +(process.argv[4] == null ? 40 : process.argv[4]);
if (E) {
  C.EXP.deals = 24; C.EXP.min = 24; C.EXP.ms = 1e9;   // (a fixed number of deals, so a run comes out the same)
  if (process.env.MT_EXP) Object.assign(C.EXP, JSON.parse(process.env.MT_EXP));
  for (let g = 0; g < 2; g++) playGame(2 + g, OPTS[3], ['expert', 'hard', 'normal', 'easy', 'expert'].slice(0, 2 + g));
  console.log('  Expert: 2 games with every move checked');
  duel('expert', 'hard', 2, E); duel('expert', 'hard', 4, Math.max(10, E >> 1));
}
