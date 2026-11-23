#!/usr/bin/env node
// Shogi: plays robot games with games/shogi-core.js and checks every position against a second, plainly written
// move generator here (written from the rules, not from the core): the same legal moves, piece counts kept, no two
// unpromoted Pawns on a file, no piece where it could never move, drops never promoted, no Pawn drop that mates,
// the mover's King never left in check, and a game's end (mate, no moves, repetition, perpetual check) agreeing
// with the rules.
//   node scripts/shogi-sim.js [games] [--robots]   (default 300 games: random and Easy moves mixed, so drops and
//                                                     promotions come up all the time; --robots adds Normal and Hard
//                                                     games for the computer's choices and timing)
'use strict';
var C = require('../games/shogi-core.js');
var args = process.argv.slice(2), GAMES = +args.filter(function (a) { return /^\d+$/.test(a); })[0] || 300, ROBOTS = args.indexOf('--robots') >= 0;

// ── The reference generator (from the rules, square by square) ──────────────
// a piece's moves from Black's side: [dr, dc, slides]
var REF = {
  1: [[-1, 0, 0]], 2: [[-1, 0, 1]], 3: [[-2, -1, 0], [-2, 1, 0]],
  4: [[-1, -1, 0], [-1, 0, 0], [-1, 1, 0], [1, -1, 0], [1, 1, 0]],
  5: [[-1, -1, 0], [-1, 0, 0], [-1, 1, 0], [0, -1, 0], [0, 1, 0], [1, 0, 0]],
  6: [[-1, -1, 1], [-1, 1, 1], [1, -1, 1], [1, 1, 1]], 7: [[-1, 0, 1], [1, 0, 1], [0, -1, 1], [0, 1, 1]],
  8: [[-1, -1, 0], [-1, 0, 0], [-1, 1, 0], [0, -1, 0], [0, 1, 0], [1, -1, 0], [1, 0, 0], [1, 1, 0]]
};
REF[9] = REF[10] = REF[11] = REF[12] = REF[5];
REF[14] = REF[6].concat([[-1, 0, 0], [1, 0, 0], [0, -1, 0], [0, 1, 0]]);
REF[15] = REF[7].concat([[-1, -1, 0], [-1, 1, 0], [1, -1, 0], [1, 1, 0]]);
function zone(side, r) { return side > 0 ? r < 3 : r > 5; }
function lastRanks(t, side, r) { var x = side > 0 ? r : 8 - r; return (t === 1 || t === 2) ? x < 1 : t === 3 ? x < 2 : false; }
function targets(b, s, side) {
  var p = b[s], t = Math.abs(p), r = Math.floor(s / 9), c = s % 9, out = [];
  REF[t].forEach(function (d) {
    var rr = r + d[0] * side, cc = c + d[1];
    while (rr >= 0 && rr <= 8 && cc >= 0 && cc <= 8) {
      var q = b[rr * 9 + cc];
      if (q && Math.sign(q) === side) break;
      out.push(rr * 9 + cc);
      if (q || !d[2]) break;
      rr += d[0] * side; cc += d[1];
    }
  });
  return out;
}
function kingAttacked(b, side) {
  var k = b.indexOf(8 * side); if (k < 0) return true;
  for (var s = 0; s < 81; s++) if (b[s] && Math.sign(b[s]) === -side && targets(b, s, -side).indexOf(k) >= 0) return true;
  return false;
}
function refApply(pos, mv) {
  var b = pos.b.slice(), hb = pos.hb.slice(), hw = pos.hw.slice(), side = pos.turn;
  if (mv.drop) { b[mv.to] = mv.drop * side; (side > 0 ? hb : hw)[mv.drop]--; }
  else {
    var q = b[mv.to];
    if (q) { var ct = Math.abs(q); if (ct > 8) ct -= 8; (side > 0 ? hb : hw)[ct]++; }
    b[mv.to] = (Math.abs(b[mv.from]) + (mv.pr ? 8 : 0)) * side; b[mv.from] = 0;
  }
  return { b: b, hb: hb, hw: hw, turn: -side };
}
function refLegal(pos, depth) {
  var side = pos.turn, b = pos.b, out = [], s;
  for (s = 0; s < 81; s++) {
    if (!b[s] || Math.sign(b[s]) !== side) continue;
    var t = Math.abs(b[s]);
    targets(b, s, side).forEach(function (to) {
      var canP = [1, 2, 3, 4, 6, 7].indexOf(t) >= 0 && (zone(side, Math.floor(s / 9)) || zone(side, Math.floor(to / 9)));
      var must = canP && lastRanks(t, side, Math.floor(to / 9));
      if (canP) out.push({ from: s, to: to, pr: 1 });
      if (!must) out.push({ from: s, to: to, pr: 0 });
    });
  }
  var hand = side > 0 ? pos.hb : pos.hw;
  for (var t = 1; t <= 7; t++) {
    if (!hand[t]) continue;
    for (s = 0; s < 81; s++) {
      if (b[s]) continue;
      if (lastRanks(t, side, Math.floor(s / 9))) continue;
      if (t === 1) { var nifu = false; for (var r = 0; r < 9; r++) if (b[r * 9 + s % 9] === side) nifu = true; if (nifu) continue; }
      out.push({ drop: t, to: s, pr: 0 });
    }
  }
  return out.filter(function (mv) {
    var np = refApply(pos, mv);
    if (kingAttacked(np.b, side)) return false;
    // uchifuzume: a Pawn dropped to give check may not leave the other King with no move
    if (mv.drop === 1 && kingAttacked(np.b, -side) && depth < 1 && !refLegal(np, depth + 1).length) return false;
    return true;
  });
}
function refInt(mv) { return mv.drop ? C.drop(mv.drop, mv.to) : C.mk(mv.from, mv.to, mv.pr); }

// ── Checks on every position ──────────────────────────────────────────────
var TOTAL = [0, 18, 4, 4, 4, 4, 2, 2, 2];
var fails = [], stats = { games: 0, plies: 0, drops: 0, promos: 0, declined: 0, captures: 0, checks: 0, mate: 0, nomoves: 0, rep: 0, perpetual: 0, capped: 0, uchiBarred: 0, nifuBarred: 0, impasseSeen: 0, declare: 0, maxMoves: 0 };
function fail(msg, g) { if (fails.length < 20) fails.push(msg + (g ? '\n  moves: ' + g.ml.join(' ') : '')); }
function checkPos(pos, g) {
  var cnt = [0, 0, 0, 0, 0, 0, 0, 0, 0], s;
  for (s = 0; s < 81; s++) {
    var p = pos.b[s]; if (!p) continue;
    var t = Math.abs(p), bt = t > 8 ? t - 8 : t, side = Math.sign(p), r = Math.floor(s / 9);
    cnt[bt]++;
    if (t === 13 || t === 16 || t > 15) fail('a piece that does not exist: ' + p, g);
    if (t <= 8 && lastRanks(t, side, r)) fail('a ' + C.NAME[t] + ' where it can never move, at ' + C.sqName(s), g);
  }
  for (var t2 = 1; t2 <= 7; t2++) cnt[t2] += pos.hb[t2] + pos.hw[t2];
  for (var t3 = 1; t3 <= 8; t3++) if (cnt[t3] !== TOTAL[t3]) fail('piece count for ' + C.NAME[t3] + ' is ' + cnt[t3], g);
  [1, -1].forEach(function (side) {
    for (var c = 0; c < 9; c++) { var n = 0; for (var r = 0; r < 9; r++) if (pos.b[r * 9 + c] === side) n++; if (n > 1) fail('two unpromoted Pawns on file ' + (9 - c), g); }
  });
  if (kingAttacked(pos.b, -pos.turn)) fail('the side that just moved left its King in check', g);
}
function sameMoves(pos, g) {
  var a = C.legal(pos).slice().sort(), ref = refLegal(pos, 0).map(refInt).sort();
  if (a.length !== ref.length || a.some(function (m, i) { return m !== ref[i]; })) {
    var sa = {}, sr = {}; a.forEach(function (m) { sa[m] = 1; }); ref.forEach(function (m) { sr[m] = 1; });
    fail('legal moves differ: core has ' + a.filter(function (m) { return !sr[m]; }).map(function (m) { return C.notation(pos, m); }).join(',') + ' extra, misses ' + ref.filter(function (m) { return !sa[m]; }).map(function (m) { return C.notation(pos, m); }).join(','), g);
  }
  return a;
}
// what the rules would forbid here: count where nifu and uchifuzume actually barred a move
function barredCounts(pos) {
  var side = pos.turn, hand = side > 0 ? pos.hb : pos.hw;
  if (!hand[1]) return;
  for (var s = 0; s < 81; s++) {
    if (pos.b[s] || lastRanks(1, side, Math.floor(s / 9))) continue;
    var nifu = false; for (var r = 0; r < 9; r++) if (pos.b[r * 9 + s % 9] === side) nifu = true;
    if (nifu) { stats.nifuBarred++; continue; }
    var np = refApply(pos, { drop: 1, to: s });
    if (!kingAttacked(np.b, side) && kingAttacked(np.b, -side) && !refLegal(np, 1).length) stats.uchiBarred++;
  }
}

var LV = { easy: { depth: 1, time: 60, noise: 160 }, normal: { depth: 3, time: 1500, noise: 25 }, hard: { depth: 5, time: 3500, noise: 0 } };
var seed = 7;
function rnd() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }
var think = { n: 0, ms: 0, max: 0, depth: 0 };
function choose(g, ms, kind) {
  if (kind === 'random') {
    // random, leaning toward drops, promotions and checks so the rules about them come up often
    var pick = ms.filter(function (m) { return C.dropType(m) || C.promo(m); });
    if (pick.length && rnd() < 0.45) return pick[Math.floor(rnd() * pick.length)];
    return ms[Math.floor(rnd() * ms.length)];
  }
  var t = Date.now(), r = C.search(g.pos, Object.assign({ seed: Math.floor(rnd() * 1e9) }, LV[kind])), dt = Date.now() - t;
  if (kind !== 'easy') { think.n++; think.ms += dt; think.max = Math.max(think.max, dt); think.depth += r.depth; }
  if (ms.indexOf(r.m) < 0) fail('the computer chose a move that is not legal: ' + r.m, g);
  return r.m;
}
var robotWins = {};
function game(kinds, cap) {
  var g = C.newGame(), plies = 0;
  checkPos(g.pos, g);
  while (!g.over && plies < cap) {
    var ms = sameMoves(g.pos, g);
    barredCounts(g.pos);
    stats.maxMoves = Math.max(stats.maxMoves, ms.length);
    if (C.bothIn(g.pos)) { stats.impasseSeen++; var im = C.impasse(g.pos, g.pos.turn); if (im.ok) { g = C.declare(g); stats.declare++; break; } }
    var kind = kinds[g.pos.turn > 0 ? 0 : 1], m = choose(g, ms, kind);
    var res = C.play(g, m, ms);
    if (!res) { fail('play() refused a legal move', g); break; }
    var i = res.info;
    if (i.drop) { stats.drops++; if (C.promo(m)) fail('a drop promoted', g); }
    if (i.pr) stats.promos++; else if (/=$/.test(i.san)) stats.declined++;
    if (i.cap) stats.captures++;
    if (i.check) stats.checks++;
    if (C.notation(g.pos, m) !== i.san || C.parse(i.san) !== m) fail('notation does not read back: ' + i.san, g);
    g = res.g; plies++;
    checkPos(g.pos, g);
    // the end agrees with the rules
    if (g.over && (g.over.why === 'mate' || g.over.why === 'nomoves')) {
      if (refLegal(g.pos, 0).length) fail('game over by ' + g.over.why + ' with moves left', g);
      if ((g.over.why === 'mate') !== kingAttacked(g.pos.b, g.pos.turn)) fail('mate and check disagree', g);
    }
    if (!g.over && !refLegal(g.pos, 0).length) fail('no legal moves but the game goes on', g);
    if (g.over && (g.over.why === 'rep' || g.over.why === 'perpetual')) {
      var k = g.keys[g.n], n = g.keys.filter(function (x) { return x === k; }).length;
      if (n !== 4) fail('repetition ended the game after ' + n + ' times', g);
    }
  }
  stats.games++; stats.plies += plies;
  if (!g.over) stats.capped++; else stats[g.over.why] = (stats[g.over.why] || 0) + 1;
  if (g.over && kinds[0] !== kinds[1]) { var who = g.over.w > 0 ? kinds[0] : g.over.w < 0 ? kinds[1] : 'draw'; robotWins[kinds.join(' v ')] = robotWins[kinds.join(' v ')] || {}; robotWins[kinds.join(' v ')][who] = (robotWins[kinds.join(' v ')][who] || 0) + 1; }
  return g;
}

// rule tests on fixed positions
function empty() { var b = []; for (var i = 0; i < 81; i++) b.push(0); return { b: b, hb: [0, 0, 0, 0, 0, 0, 0, 0], hw: [0, 0, 0, 0, 0, 0, 0, 0], turn: 1 }; }
function sq(n) { return 'abcdefghi'.indexOf(n.charAt(1)) * 9 + (9 - +n.charAt(0)); }
function fixed() {
  var p, ms, s;
  // uchifuzume: White King 5a boxed in by its own Lances, a Black Gold on 5c: P*5b would mate, so it is barred,
  // while the same Pawn drop is allowed where the King can step away
  p = empty(); p.b[sq('5a')] = -8; p.b[sq('4a')] = -2; p.b[sq('6a')] = -2; p.b[sq('5c')] = 5; p.b[sq('4b')] = -1 * 0; p.b[sq('5i')] = 8; p.hb[1] = 1;
  p.b[sq('4c')] = 5; p.b[sq('6c')] = 5;
  ms = C.legal(p).map(function (m) { return C.notation(p, m); });
  if (ms.indexOf('P*5b') >= 0) fail('uchifuzume: P*5b was allowed though it mates');
  p.b[sq('4c')] = 0; p.b[sq('5c')] = 0; p.b[sq('6c')] = 0; ms = C.legal(p).map(function (m) { return C.notation(p, m); });
  if (ms.indexOf('P*5b') < 0) fail('a Pawn drop that checks but does not mate was barred');
  // a Pawn drop that mates is barred, a Gold drop that mates is fine and ends the game
  p = empty(); p.b[sq('5a')] = -8; p.b[sq('5c')] = 4; p.b[sq('5i')] = 8; p.hb[5] = 1;
  var g = C.newGame(p), r = C.play(g, C.drop(5, sq('5b')));
  if (!r || !r.g.over || r.g.over.why !== 'mate' || r.g.over.w !== 1) fail('G*5b should mate');
  // nifu
  p = empty(); p.b[sq('5a')] = -8; p.b[sq('5i')] = 8; p.b[sq('3g')] = 1; p.hb[1] = 1;
  ms = C.legal(p).map(function (m) { return C.notation(p, m); });
  if (ms.indexOf('P*3e') >= 0) fail('nifu: a second Pawn on file 3 was allowed');
  if (ms.indexOf('P*4e') < 0) fail('a Pawn drop on an open file was barred');
  if (ms.indexOf('P*4a') >= 0) fail('a Pawn dropped on the last rank was allowed');
  // a promoted Pawn on the file doesn't count for nifu
  p.b[sq('3g')] = 9; ms = C.legal(p).map(function (m) { return C.notation(p, m); });
  if (ms.indexOf('P*3e') < 0) fail('a Tokin on the file wrongly barred a Pawn drop');
  // Knights: dropped no further than the third rank; promotion forced on the last two
  p = empty(); p.b[sq('5a')] = -8; p.b[sq('5i')] = 8; p.hb[3] = 1; p.b[sq('2d')] = 3;
  ms = C.legal(p).map(function (m) { return C.notation(p, m); });
  if (ms.some(function (x) { return /^N\*\d[ab]$/.test(x); })) fail('a Knight dropped on the last two ranks');
  if (ms.indexOf('N2d-1b=') >= 0 || ms.indexOf('N2d-1b') >= 0 || ms.indexOf('N2d-1b+') < 0) fail('a Knight reaching 1b must promote');
  if (ms.indexOf('N2d-3b+') < 0) fail('the Knight should be able to go to 3b and promote');
  // optional promotion moving out of the zone
  p = empty(); p.b[sq('5a')] = -8; p.b[sq('5i')] = 8; p.b[sq('8c')] = 4;
  ms = C.legal(p).map(function (m) { return C.notation(p, m); });
  if (ms.indexOf('S8c-7d+') < 0 || ms.indexOf('S8c-7d=') < 0) fail('a Silver leaving the zone may promote or not');
  // no legal move without check is a loss (no stalemate): Black's King on 1i, White Golds on 1g and 3g, a White
  // Rook on 2a: the King is not in check but every square it could go to is covered; White plays G3g-3h? no, it is
  // Black's move with none, so White wins
  p = empty(); p.b[sq('1i')] = 8; p.b[sq('1g')] = -5; p.b[sq('3g')] = -5; p.b[sq('2a')] = -7; p.b[sq('5a')] = -8; p.turn = -1;
  g = C.newGame(p); r = C.play(g, C.parse('K5a-4a'));
  if (!r) fail('stalemate test move refused');
  else if (C.inCheck(r.g.pos) || !r.g.over || r.g.over.why !== 'nomoves' || r.g.over.w !== -1) fail('no legal move should lose: ' + JSON.stringify(r.g.over) + ' moves ' + C.legal(r.g.pos).map(function (m) { return C.notation(r.g.pos, m); }));
  // perpetual check: White's King shuffles between 5a and 4a while a Black Gold checks every time
  p = empty(); p.b[sq('5a')] = -8; p.b[sq('5i')] = 8; p.b[sq('1a')] = -2; p.b[sq('5c')] = 7;
  p.turn = -1;
  g = C.newGame(p);
  var seq = ['K5a-4a', 'R5c-4c', 'K4a-5a', 'R4c-5c'], k = 0, last = null;
  while (!g.over && k < 40) { var mm = C.parse(seq[k % 4]); r = C.play(g, mm); if (!r) { fail('perpetual test move ' + seq[k % 4] + ' refused'); break; } g = r.g; last = r; k++; }
  if (!g.over || g.over.why !== 'perpetual' || g.over.w !== -1) fail('perpetual check should lose for Black, got ' + JSON.stringify(g.over) + ' after ' + k);
  // impasse: Black's King and ten pieces in the camp with 28 points
  p = empty(); p.b[sq('5b')] = 8; p.b[sq('5h')] = -8;
  ['1a', '2a', '3a', '4a', '6a', '7a', '8a', '9a', '1c', '9c'].forEach(function (n) { p.b[sq(n)] = 9; });
  p.hb[7] = 2; p.hb[6] = 2; p.hb[5] = 0;
  var im = C.impasse(p, 1);
  if (!im.ok || im.pts !== 30) fail('impasse 27-point declaration: ' + JSON.stringify(im));
  p.hb[6] = 0; im = C.impasse(p, 1); if (im.ok) fail('impasse with 20 points should not be allowed');
}

fixed();
var t0 = Date.now();
for (var i = 0; i < GAMES; i++) {
  var mix = i % 3 === 0 ? ['random', 'random'] : i % 3 === 1 ? ['random', 'easy'] : ['easy', 'easy'];
  game(mix, 500);
}
if (ROBOTS) {
  for (var j = 0; j < 4; j++) game(j % 2 ? ['normal', 'easy'] : ['easy', 'normal'], 400);
  for (var j2 = 0; j2 < 2; j2++) game(j2 % 2 ? ['hard', 'normal'] : ['normal', 'hard'], 400);
}
console.log('Shogi sim: ' + stats.games + ' games, ' + stats.plies + ' moves in ' + ((Date.now() - t0) / 1000).toFixed(1) + 's');
console.log(JSON.stringify(stats));
if (ROBOTS) { console.log('robots:', JSON.stringify(robotWins)); console.log('think: ' + think.n + ' moves, average ' + Math.round(think.ms / (think.n || 1)) + 'ms, longest ' + think.max + 'ms, average depth ' + (think.depth / (think.n || 1)).toFixed(1)); }
if (fails.length) { console.log('FAILED ' + fails.length + ':\n' + fails.join('\n')); process.exit(1); }
console.log('Every move legal, the drop rules held, the ends agreed with the rules.');
