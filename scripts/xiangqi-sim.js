#!/usr/bin/env node
// Xiangqi: robot games that check every move against the rules, and the repetition rules played out on set positions.
//   node scripts/xiangqi-sim.js [games] [seed]
// Every position of every game is checked twice: the moves games/xiangqi-core.js allows must be exactly the moves a
// second, separately written rule checker (here, below) allows, point by point over all 90 x 90 from-to pairs. Perft
// from the start (44, 1920, 79666) checks the move generator against the published counts. The repetition rules
// (perpetual check loses, perpetual chase loses, check beats chase, anything else is a draw), the flying General,
// stalemate (it loses) and the material draw are played out on positions set by hand.
'use strict';
var X = require('../games/xiangqi-core.js');
var GAMES = +(process.argv[2] || 200), SEED = +(process.argv[3] || 7);
var seed = SEED;
Math.random = function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
var fails = 0;
function fail(msg) { fails++; if (fails < 30) console.log('FAIL', msg); }
function ok(cond, msg) { if (!cond) fail(msg); }

// ── A second rule checker, written from the rules and not from the engine ──
function R_(s) { return Math.floor(s / 9); } function C_(s) { return s % 9; }
function side(v) { return v > 0 ? 1 : v < 0 ? -1 : 0; }
function palace(sd, s) { var r = R_(s), c = C_(s); return c >= 3 && c <= 5 && (sd === 1 ? r >= 7 : r <= 2); }
function between(b, f, t) { // pieces strictly between two points on one line
  var n = 0, dr = Math.sign(R_(t) - R_(f)), dc = Math.sign(C_(t) - C_(f)), s = f + dr * 9 + dc;
  while (s !== t) { if (b[s]) n++; s += dr * 9 + dc; }
  return n;
}
// can the piece on f go to t by the way it moves (and capture what's there), check aside?
function reach(b, f, t) {
  var v = b[f], sd = side(v), p = Math.abs(v); if (!v || f === t) return false;
  if (side(b[t]) === sd) return false;
  var dr = R_(t) - R_(f), dc = C_(t) - C_(f), ar = Math.abs(dr), ac = Math.abs(dc);
  switch (p) {
    case 1: return ar + ac === 1 && palace(sd, t);
    case 2: return ar === 1 && ac === 1 && palace(sd, t);
    case 3: return ar === 2 && ac === 2 && (sd === 1 ? R_(t) >= 5 : R_(t) <= 4) && !b[(f + t) / 2];
    case 4: {
      if (!((ar === 2 && ac === 1) || (ar === 1 && ac === 2))) return false;
      var leg = ar === 2 ? f + Math.sign(dr) * 9 : f + Math.sign(dc);
      return !b[leg];
    }
    case 5: return (ar === 0 || ac === 0) && between(b, f, t) === 0;
    case 6: if (ar !== 0 && ac !== 0) return false; return b[t] ? between(b, f, t) === 1 : between(b, f, t) === 0;
    case 7: {
      var fw = sd === 1 ? -1 : 1, across = sd === 1 ? R_(f) <= 4 : R_(f) >= 5;
      if (ac === 0 && dr === fw) return true;
      return across && dr === 0 && ac === 1;
    }
  }
  return false;
}
function genOf(b, sd) { for (var s = 0; s < 90; s++) if (b[s] === sd) return s; return -1; }
function exposed(b, sd) { // is sd's General attacked, or facing the other General?
  var g = genOf(b, sd), o = genOf(b, -sd);
  if (g < 0) return true;
  if (o >= 0 && C_(g) === C_(o) && between(b, g, o) === 0) return true;
  for (var s = 0; s < 90; s++) if (side(b[s]) === -sd && reach(b, s, g)) return true;
  return false;
}
function naiveLegal(b, sd) {
  var out = [];
  for (var f = 0; f < 90; f++) { if (side(b[f]) !== sd) continue; for (var t = 0; t < 90; t++) if (reach(b, f, t)) { var nb = b.slice(); nb[t] = nb[f]; nb[f] = 0; if (!exposed(nb, sd)) out.push(f * 90 + t); } }
  return out.sort(function (a, z) { return a - z; });
}
function coreLegal(b, sd) { return X.legal(b, sd).map(function (m) { return m.f * 90 + m.t; }).sort(function (a, z) { return a - z; }); }
function same(a, z) { if (a.length !== z.length) return false; for (var i = 0; i < a.length; i++) if (a[i] !== z[i]) return false; return true; }
var checked = 0;
function checkPos(b, sd, where) {
  checked++;
  var a = coreLegal(b, sd), n = naiveLegal(b, sd);
  if (!same(a, n)) {
    var extra = a.filter(function (x) { return n.indexOf(x) < 0; }).map(function (x) { return X.sqName(Math.floor(x / 90)) + X.sqName(x % 90); });
    var miss = n.filter(function (x) { return a.indexOf(x) < 0; }).map(function (x) { return X.sqName(Math.floor(x / 90)) + X.sqName(x % 90); });
    fail(where + ': engine allows ' + extra.join(' ') + ' it should not; misses ' + miss.join(' ') + ' (' + X.key(b, sd) + ')');
  }
  ok(!exposed(b, -sd), where + ': the side that just moved left its General exposed');
}

// ── Perft ──
function perft(b, sd, d) { if (!d) return 1; var ms = X.legal(b, sd); if (d === 1) return ms.length; var n = 0; ms.forEach(function (m) { n += perft(X.apply(b, m), -sd, d - 1); }); return n; }
var st0 = X.start();
[[1, 44], [2, 1920], [3, 79666]].forEach(function (x) { var n = perft(st0.b, 1, x[0]); ok(n === x[1], 'perft ' + x[0] + ' is ' + n + ', not ' + x[1]); });
console.log('Perft from the start: 44, 1920, 79666 checked');

// ── Set positions ──
function empty() { var b = []; for (var i = 0; i < 90; i++) b.push(0); return b; }
function at(n) { return X.sqOf(n); }
function put(b, list) { list.forEach(function (x) { b[at(x[0])] = x[1]; }); return b; }
function mv(st, a, z) { var ns = X.play(st, { f: at(a), t: at(z) }); if (!ns) fail('move ' + a + z + ' refused'); return ns; }
// perpetual check: a Red Chariot checks the Black General from a10 and a9 while the General steps between d10 and d9
(function () {
  var st = X.fromBoard(put(empty(), [['e1', 1], ['d10', -1], ['a9', 5]]), 1), seq = ['a9', 'a10', 'd10', 'd9', 'a10', 'a9', 'd9', 'd10'], i = 0, res = null;
  while (!res && i < 40) { var k = i % 8; st = mv(st, seq[k], seq[k + 1]); i += 2; res = X.result(st); }
  ok(res && res.type === 'perpetual' && res.winner === -1, 'perpetual check should lose for Red: ' + JSON.stringify(res));
  console.log('Perpetual check: ' + JSON.stringify(res) + ' after ' + st.pl.length + ' plies');
})();
// perpetual chase: a Red Chariot keeps attacking the same unprotected Black Horse, which runs between b6 and c8
(function () {
  var st = X.fromBoard(put(empty(), [['f1', 1], ['d10', -1], ['i8', 5], ['b6', -4]]), 1), res = null, n = 0;
  // the Chariot comes to i6, attacking the Horse along the 6th rank; the Horse runs to c8; the Chariot follows to i8...
  var seq = [['i8', 'i6'], ['b6', 'c8'], ['i6', 'i8'], ['c8', 'b6']];
  while (!res && n < 40) { var s = seq[n % 4]; st = mv(st, s[0], s[1]); n++; res = X.result(st); }
  ok(res && res.type === 'chase' && res.winner === -1, 'perpetual chase should lose for Red: ' + JSON.stringify(res));
  console.log('Perpetual chase: ' + JSON.stringify(res) + ' after ' + st.pl.length + ' plies');
})();
// perpetual check with a Black Chariot on the board: a General stepping out of check is never a chase, so the checker loses
(function () {
  var st = X.fromBoard(put(empty(), [['e1', 1], ['d10', -1], ['a9', 5], ['h3', -5]]), 1), res = null, n = 0;
  var seq = [['a9', 'a10'], ['d10', 'd9'], ['a10', 'a9'], ['d9', 'd10']];
  while (!res && n < 40) { var s = seq[n % 4]; st = mv(st, s[0], s[1]); n++; res = X.result(st); }
  ok(res && res.type === 'perpetual' && res.winner === -1, 'check against nothing should lose for the checker: ' + JSON.stringify(res));
})();
// plain repetition: both sides shuffle a Chariot with no threat: a draw
(function () {
  var st = X.fromBoard(put(empty(), [['e1', 1], ['d10', -1], ['a1', 5], ['i10', -5]]), 1), res = null, n = 0;
  var seq = [['a1', 'a2'], ['i10', 'i9'], ['a2', 'a1'], ['i9', 'i10']];
  while (!res && n < 40) { var s = seq[n % 4]; st = mv(st, s[0], s[1]); n++; res = X.result(st); }
  ok(res && res.type === 'repetition' && res.winner === 0, 'a plain repetition should be a draw: ' + JSON.stringify(res));
  console.log('Plain repetition: ' + JSON.stringify(res) + ' after ' + st.pl.length + ' plies');
})();
// both sides chase: a draw
(function () {
  // Red's Chariot shuttles along the 6th rank attacking Black's Horse on b6; Black's Chariot shuttles down the a file
  // attacking Red's Horse on a1
  var st = X.fromBoard(put(empty(), [['f1', 1], ['d10', -1], ['i6', 5], ['b6', -4], ['a5', -5], ['a1', 4]]), 1), res = null, n = 0;
  var seq = [['i6', 'h6'], ['a5', 'a4'], ['h6', 'i6'], ['a4', 'a5']];
  while (!res && n < 40) { var s = seq[n % 4]; st = mv(st, s[0], s[1]); n++; res = X.result(st); }
  ok(res && res.type === 'repetition' && res.winner === 0, 'both sides chasing should be a draw: ' + JSON.stringify(res));
  console.log('Both sides chase: ' + JSON.stringify(res));
})();
// the flying General: a piece between the two Generals can't step off the file
(function () {
  var b = put(empty(), [['e1', 1], ['e10', -1], ['e5', 4]]);
  var ms = X.legal(b, 1).filter(function (m) { return m.f === at('e5'); });
  ok(!ms.length, 'the Horse between the Generals may not move at all');
  ok(X.why(b, at('e5'), at('d7')) === 'face', 'the Horse stepping off the file is refused because the Generals would face');
  checkPos(b, 1, 'flying general');
  console.log('Flying General: the Horse on e5 is pinned to the e file');
})();
// stalemate loses: Black's General on d10 has nowhere to go and isn't in check
(function () {
  var st = X.fromBoard(put(empty(), [['e1', 1], ['d10', -1], ['d8', 7]]), -1), res = X.result(st);
  ok(res && res.type === 'stalemate' && res.winner === 1, 'stalemate should lose for Black: ' + JSON.stringify(res));
  console.log('Stalemate: ' + JSON.stringify(res));
})();
// mate: the classic double Chariot mate
(function () {
  var st = X.fromBoard(put(empty(), [['d1', 1], ['e10', -1], ['a9', 5], ['b8', 5]]), 1);
  st = mv(st, 'b8', 'b10'); var res = X.result(st);
  ok(res && res.type === 'mate' && res.winner === 1, 'double chariot mate: ' + JSON.stringify(res));
  console.log('Mate with two Chariots: ' + JSON.stringify(res));
})();
// material: only Advisors and Elephants left
(function () {
  var st = X.fromBoard(put(empty(), [['e1', 1], ['d10', -1], ['d1', 2], ['c1', 3], ['f10', -2]]), 1), res = X.result(st);
  ok(res && res.type === 'material', 'no attacking pieces left should be a draw: ' + JSON.stringify(res));
})();
// a cannon's screen and a horse's leg
(function () {
  var st = X.start();
  ok(X.screen(st.b, at('b3'), at('b10')) === at('b8'), 'the Cannon on b3 jumps the Cannon on b8 to take the Horse on b10');
  var b = put(empty(), [['e1', 1], ['d10', -1], ['c3', 4], ['c4', 7]]);
  var bl = X.blocked(b, at('c3')).map(function (x) { return X.sqName(x.t) + '/' + X.sqName(x.at); }).sort();
  ok(bl.join(' ') === 'b5/c4 d5/c4', 'the Horse on c3 is blocked toward b5 and d5 by the Soldier on c4: ' + bl.join(' '));
  ok(X.wxf(X.start().b, { f: at('h3'), t: at('e3') }) === 'C2=5' && X.wxf(X.start().b, { f: at('h1'), t: at('g3') }) === 'H2+3' && X.wxf(X.start().b, { f: at('b1'), t: at('c3') }) === 'H8+7', 'WXF: C2=5, H2+3, H8+7');
})();

// ── Robot games ──
var LV = [{ depth: 1, time: 60, noise: 150 }, { depth: 2, time: 80, noise: 40 }, { depth: 3, time: 120, noise: 10 }];
var tally = {}, plies = 0, longest = 0, t0 = Date.now(), wins = { '1': 0, '-1': 0, '0': 0 };
for (var g = 0; g < GAMES; g++) {
  var st = X.start(), res = null, wild = g % 4 === 0 ? 0.35 : g % 4 === 1 ? 0.1 : 0, lr = LV[g % 3], lb = LV[(g + 1) % 3], shuffle = g % 10 === 9;
  while (!res) {
    checkPos(st.b, st.turn, 'game ' + g + ' ply ' + st.pl.length);
    var ms = X.legal(st), m;
    if (shuffle && st.pl.length > 20) {
      // look for a repetition: undo the last move made by this side when it can be undone
      var back = st.pl.length >= 2 ? st.pl[st.pl.length - 2] : null;
      m = back && ms.filter(function (x) { return x.f === back.t && x.t === back.f; })[0];
      if (!m) m = ms[Math.floor(Math.random() * ms.length)];
    } else if (Math.random() < wild) m = ms[Math.floor(Math.random() * ms.length)];
    else m = X.search(st, st.turn === 1 ? lr : lb).move;
    var ns = X.play(st, m);
    if (!ns) { fail('game ' + g + ': the robot\'s move was refused'); break; }
    // the record agrees with the board
    var rec = ns.pl[ns.pl.length - 1];
    ok(rec.k === (X.inCheck(ns.b, ns.turn) ? 1 : 0), 'game ' + g + ': the check flag is wrong');
    ok(rec.c === st.b[m.t], 'game ' + g + ': the capture is wrong');
    st = ns; res = X.result(st);
    if (st.pl.length > 600) { fail('game ' + g + ' ran past 600 plies'); break; }
  }
  if (!res) continue;
  // the result agrees with the rules: a mate leaves the loser in check with no move; a repetition's position stood 3 times
  if (res.type === 'mate') ok(X.inCheck(st.b, st.turn) && !X.legal(st).length, 'game ' + g + ': mate without check or with a move');
  if (res.type === 'stalemate') ok(!X.inCheck(st.b, st.turn) && !X.legal(st).length, 'game ' + g + ': stalemate in check');
  if (/perpetual|chase|repetition/.test(res.type)) ok(st.keys.filter(function (k) { return k === st.keys[st.keys.length - 1]; }).length >= 3, 'game ' + g + ': repetition without 3 of the position');
  if (res.type === 'perpetual') {
    // the loser gave check with every move since the position first stood
    var key = st.keys[st.keys.length - 1], first = st.keys.indexOf(key), all = true;
    for (var j = first; j < st.pl.length; j++) { var mover = (st.pl.length - 1 - j) % 2 === 0 ? -st.turn : st.turn; if (mover === -res.winner && !st.pl[j].k) all = false; }
    ok(all, 'game ' + g + ': perpetual check for a side that didn\'t check every move');
  }
  tally[res.type] = (tally[res.type] || 0) + 1; wins[res.winner]++;
  plies += st.pl.length; longest = Math.max(longest, st.pl.length);
}
console.log('\n' + GAMES + ' robot games, ' + checked + ' positions checked against the second rule checker in ' + Math.round((Date.now() - t0) / 1000) + ' s');
console.log('Endings: ' + JSON.stringify(tally));
console.log('Red won ' + wins[1] + ', Black won ' + wins[-1] + ', drawn ' + wins[0] + '; ' + Math.round(plies / GAMES) + ' plies a game on average, the longest ' + longest);
console.log(fails ? fails + ' FAILURES' : 'No failures');
process.exit(fails ? 1 : 0);
