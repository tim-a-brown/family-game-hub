#!/usr/bin/env node
// Entropy: robot matches with every move checked (CLAUDE.md, Entropy).
//   node scripts/entropy-sim.js [matches] [--pairs=easy-normal,normal-hard] [--sz=7|5] [--seed=n] [--quiet]
// Each move a robot makes is checked against a plainer reading of the rules written here: Chaos's chip is one the bag
// still held and goes on an empty square; Order's slide moves one chip along its row or column over empty squares
// only; the bag's counts and the chips on the board always add up to sz of each color. Every score (after every move
// and at the end of every game) is checked against a brute-force count: every run of two or more filled squares in
// every row and column, reversed and compared, scoring its length when it reads the same both ways. A match is two
// games with the roles changed; the higher total as Order wins it. Each pair plays both seat orders.
'use strict';
var path = require('path');
var C = require(path.join(__dirname, '..', 'games', 'entropy-core.js'));

var args = process.argv.slice(2), NG = +(args.find(function (a) { return /^\d+$/.test(a); }) || 200);
function opt(nm, d) { var a = args.find(function (x) { return x.indexOf('--' + nm + '=') === 0; }); return a ? a.slice(nm.length + 3) : d; }
var QUIET = args.indexOf('--quiet') >= 0, SZ = +opt('sz', 7);
var PAIRS = opt('pairs', 'easy-normal,normal-hard,easy-hard,normal-normal').split(',').map(function (p) { return p.split('-'); });
var seed = +opt('seed', 7);
function rnd() { seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }

// ── the plain reading ──
function brute(b, sz) {
  var t = 0, k, i, j;
  var lines = [];
  for (k = 0; k < sz; k++) { var r = [], c = []; for (i = 0; i < sz; i++) { r.push(b[k * sz + i]); c.push(b[i * sz + k]); } lines.push(r, c); }
  lines.forEach(function (ln) {
    for (i = 0; i < sz; i++) for (j = i + 1; j < sz; j++) {
      var s = ln.slice(i, j + 1);
      if (s.some(function (x) { return !x; })) continue;
      if (s.join(',') === s.slice().reverse().join(',')) t += s.length;
    }
  });
  return t;
}
function plainSlideOk(b, sz, f, t) {
  if (!b[f] || b[t] || f === t) return false;
  var fr = Math.floor(f / sz), fc = f % sz, tr = Math.floor(t / sz), tc = t % sz;
  if (fr !== tr && fc !== tc) return false;
  var cells = [];
  if (fr === tr) for (var c = Math.min(fc, tc); c <= Math.max(fc, tc); c++) cells.push(fr * sz + c);
  else for (var r = Math.min(fr, tr); r <= Math.max(fr, tr); r++) cells.push(r * sz + fc);
  return cells.every(function (x) { return x === f || !b[x]; });
}
var bad = 0;
function fail(msg) { bad++; if (bad < 20) console.log('FAIL: ' + msg); }
function check(st) {
  var sz = st.sz, cnt = [];
  for (var c = 0; c < sz; c++) cnt.push(st.bag[c]);
  st.b.forEach(function (x) { if (x) cnt[x - 1]++; });
  if (st.chip) cnt[st.chip - 1]++;
  cnt.forEach(function (n, i) { if (n !== sz) fail('color ' + (i + 1) + ' adds up to ' + n); });
  if (C.total(st.b, sz) !== brute(st.b, sz)) fail('score ' + C.total(st.b, sz) + ' vs brute ' + brute(st.b, sz));
}

// fixed tests of the counting convention
(function () {
  var t = [[[1, 2, 1], 3], [[1, 1], 2], [[1, 2, 2, 1], 6], [[1, 2, 1, 2, 1], 14], [[1, 1, 1], 7], [[1, 2, 3], 0], [[1, 0, 1], 0]];
  t.forEach(function (x) { var s = C.lineScore(x[0]); if (s !== x[1]) fail('line ' + x[0].join('') + ' scores ' + s + ', not ' + x[1]); });
  // slides can't jump; pass is always legal; illegal moves are refused
  var st = C.newMatch({ sz: 5, seed: 3 });
  if (C.play(st, 'pass')) fail('Chaos passed');
  if (!C.play(st, 'c3')) fail('a placement was refused');
  if (C.play(st, 'c3')) fail('a second placement in a row');
  if (C.play(st, 'c3-c3')) fail('a slide to its own square');
  if (C.play(st, 'c3-d4')) fail('a diagonal slide');
  if (!C.play(st, 'c3-a3')) fail('a slide was refused');
})();

function playMatch(lv0, lv1, first, sz) {
  var st = C.newMatch({ sz: sz, seed: Math.floor(rnd() * 4294967296), first: first }), lv = [lv0, lv1], guard = 0;
  check(st);
  while (!st.over && guard++ < 400) {
    var seat = C.seatToMove(st), ph = st.ph, before = JSON.parse(JSON.stringify(st));
    var r = C.search(st, { level: lv[seat], seed: Math.floor(rnd() * 1e9) });
    var mv = r.move;
    // the plain reading of the move
    if (ph === 'place') {
      var i = C.sq(mv, sz);
      if (i < 0 || before.b[i]) fail('placement on ' + mv);
      if (!before.chip || before.bag[before.chip - 1] < 0) fail('a chip that was not drawn');
    } else if (mv !== 'pass') {
      var p = mv.split('-').map(function (x) { return C.sq(x, sz); });
      if (!plainSlideOk(before.b, sz, p[0], p[1])) fail('slide ' + mv + ' is not a rook move over empty squares');
    }
    var res = C.play(st, mv);
    if (!res) { fail('the core refused ' + mv); break; }
    if (res.end) { if (brute(res.end.b, sz) !== res.end.sc) fail('game score ' + res.end.sc + ' vs brute ' + brute(res.end.b, sz)); if (res.end.b.some(function (x) { return !x; })) fail('a game ended with an empty square'); }
    check(st);
  }
  if (!st.over) fail('a match did not end');
  if (st.gm.length !== 2 || st.gm[0].o === st.gm[1].o) fail('the roles were not swapped');
  return st;
}

var t0 = Date.now();
PAIRS.forEach(function (pr) {
  var w = [0, 0, 0], sc = {}, n = 0, scSum = {}, tm = Date.now();
  sc[pr[0]] = []; sc[pr[1]] = [];
  for (var m = 0; m < NG; m++) {
    // seat 0 plays pr[0]; alternate who is Order first
    var st = playMatch(pr[0], pr[1], m % 2, SZ);
    w[st.win === 0 ? 0 : st.win === 1 ? 1 : 2]++;
    st.gm.forEach(function (g) { (pr[g.o] === pr[0] && pr[0] !== pr[1] ? sc[pr[0]] : sc[pr[g.o]] || (sc[pr[g.o]] = [])).push(g.sc); });
    n++;
  }
  var avg = function (a) { return a.length ? (a.reduce(function (x, y) { return x + y; }, 0) / a.length).toFixed(1) : '-'; };
  console.log(pr[0] + ' vs ' + pr[1] + ' (' + SZ + 'x' + SZ + ', ' + n + ' matches): ' + pr[0] + ' wins ' + (100 * w[0] / n).toFixed(1) + '%, ' + pr[1] + ' ' + (100 * w[1] / n).toFixed(1) + '%, draws ' + (100 * w[2] / n).toFixed(1) + '%' +
    (pr[0] !== pr[1] ? '; as Order ' + pr[0] + ' averages ' + avg(sc[pr[0]]) + ', ' + pr[1] + ' ' + avg(sc[pr[1]]) : '; Order averages ' + avg(sc[pr[0]])) + ' (' + ((Date.now() - tm) / 1000).toFixed(1) + ' s)');
});
console.log(bad ? bad + ' FAILURES' : 'All moves legal, every score matches the brute-force count. (' + ((Date.now() - t0) / 1000).toFixed(1) + ' s)');
process.exit(bad ? 1 : 0);
