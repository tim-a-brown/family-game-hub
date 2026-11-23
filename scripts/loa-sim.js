#!/usr/bin/env node
// Lines of Action: robot games with every move checked (CLAUDE.md, Lines of Action).
//   node scripts/loa-sim.js [games] [--pairs=easy-normal,normal-hard] [--tie=mover] [--fast] [--scale=0.2 (thinking time)] [--seed=n]
// Each move the robot makes is checked against a second, plainer reading of the rules written here (every square
// walked, the line counted square by square), every position's win is checked by a flood fill of its own, the
// pieces are counted (a capture takes exactly one), and the game's end is checked: a connection, both at once, a
// position seen three times, or nobody able to move. --fast plays at depth 1 to check many games quickly.
'use strict';
var path = require('path');
var C = require(path.join(__dirname, '..', 'games', 'loa-core.js'));

var args = process.argv.slice(2), N = +(args.find(function (a) { return /^\d+$/.test(a); }) || 200);
function opt(name, d) { var a = args.find(function (x) { return x.indexOf('--' + name + '=') === 0; }); return a ? a.slice(name.length + 3) : d; }
var FAST = args.indexOf('--fast') >= 0, TIE = opt('tie', 'draw'), SCALE = +opt('scale', 1);
var PAIRS = opt('pairs', FAST ? 'easy-easy' : 'easy-normal,normal-hard,easy-hard,normal-normal').split(',').map(function (p) { return p.split('-'); });

// mulberry32, so a run comes out the same each time
var seed = +opt('seed', 7);
function rnd() { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }

// ── the plain reading of the rules ──
function plainMoves(b, side) {
  var out = [];
  for (var s = 0; s < 64; s++) {
    if (b[s] !== side) continue;
    var r0 = Math.floor(s / 8), c0 = s % 8;
    [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]].forEach(function (d) {
      // count every piece on the whole line, both ways from the piece, the piece itself once
      var n = 1, r, c;
      for (r = r0 + d[0], c = c0 + d[1]; r >= 0 && r < 8 && c >= 0 && c < 8; r += d[0], c += d[1]) if (b[r * 8 + c]) n++;
      for (r = r0 - d[0], c = c0 - d[1]; r >= 0 && r < 8 && c >= 0 && c < 8; r -= d[0], c -= d[1]) if (b[r * 8 + c]) n++;
      var tr = r0 + d[0] * n, tc = c0 + d[1] * n;
      if (tr < 0 || tr > 7 || tc < 0 || tc > 7) return;
      for (var i = 1; i < n; i++) if (b[(r0 + d[0] * i) * 8 + c0 + d[1] * i] === -side) return;
      if (b[tr * 8 + tc] === side) return;
      out.push(s + '>' + (tr * 8 + tc));
    });
  }
  return out.sort();
}
function plainJoined(b, side) {
  var sq = []; for (var s = 0; s < 64; s++) if (b[s] === side) sq.push(s);
  if (sq.length <= 1) return true;
  var seen = {}; seen[sq[0]] = 1; var q = [sq[0]];
  while (q.length) {
    var x = q.shift();
    sq.forEach(function (y) { if (!seen[y] && Math.abs(Math.floor(x / 8) - Math.floor(y / 8)) <= 1 && Math.abs(x % 8 - y % 8) <= 1) { seen[y] = 1; q.push(y); } });
  }
  return Object.keys(seen).length === sq.length;
}

var errors = 0;
function fail(msg) { errors++; if (errors <= 20) console.log('ERROR: ' + msg); }

function game(lvB, lvW, gi) {
  var st = C.newGame({ tie: TIE }), lv = { '1': lvB, '-1': lvW }, t0 = Date.now(), moves = 0, slow = 0;
  var start = C.startBoard();
  if (C.pieces(start, 1) !== 12 || C.pieces(start, -1) !== 12 || start[0] || start[7] || start[56] || start[63]) fail('start position');
  while (!st.over && moves < 400) {
    var side = st.turn, b0 = st.b.slice(), want = plainMoves(b0, side);
    var got = C.moves(b0, side).map(function (m) { return m.f + '>' + m.t; }).sort();
    if (want.join() !== got.join()) fail('game ' + gi + ' move ' + moves + ': move lists differ\n  plain ' + want.join(' ') + '\n  core  ' + got.join(' '));
    var L = Object.assign({}, C.LEVELS[lv[side]]);
    if (FAST) { L.depth = 1; L.time = 60; }
    L.time = Math.round(L.time * SCALE);
    L.tie = TIE; L.rnd = rnd;
    var m0 = Date.now(), res = C.search(b0, side, L), dt = Date.now() - m0;
    if (dt > L.time * 1.6 + 200) slow++;
    if (!res) { fail('game ' + gi + ': no move for a side that should move'); break; }
    if (want.indexOf(res.move.f + '>' + res.move.t) < 0) { fail('game ' + gi + ': robot chose an illegal move ' + C.sqName(res.move.f) + C.sqName(res.move.t)); break; }
    var nB = C.pieces(b0, 1), nW = C.pieces(b0, -1), cap = b0[res.move.t] === -side;
    var mv = C.play(st, res.move.f, res.move.t); moves++;
    if (!mv) { fail('game ' + gi + ': play refused a legal move'); break; }
    if (mv.cap !== cap) fail('game ' + gi + ': capture flag wrong');
    var lost = side === 1 ? nW - C.pieces(st.b, -1) : nB - C.pieces(st.b, 1);
    if (lost !== (cap ? 1 : 0) || C.pieces(st.b, side) !== (side === 1 ? nB : nW)) fail('game ' + gi + ': piece count wrong after a move');
    // the end, by the plain flood fill
    var me = plainJoined(st.b, side), them = plainJoined(st.b, -side);
    var expect = me && them ? (TIE === 'mover' ? side : 0) : me ? side : them ? -side : null;
    if (expect !== null) {
      if (!st.over || st.win !== expect || (me && them ? st.why !== 'both' : st.why !== 'connect')) fail('game ' + gi + ': win not seen right (expected ' + expect + ', got ' + st.win + ' ' + st.why + ')');
    } else if (st.over && st.why === 'connect') fail('game ' + gi + ': a win was called with no connection');
    if (st.over && st.why === 'rep') { var k = C.key(st.b, st.turn); if ((st.reps[k] || 0) < 3) fail('game ' + gi + ': repetition called too soon'); }
    if (!st.over && mv.pass != null && plainMoves(st.b, mv.pass).length) fail('game ' + gi + ': a pass with moves left');
  }
  return { st: st, moves: moves, ms: Date.now() - t0, slow: slow };
}

console.log('Lines of Action sim: ' + N + ' games a pairing, ' + (FAST ? 'depth 1' : 'real skills') + ', simultaneous connection: ' + TIE);
var all = { games: 0, connect: 0, both: 0, rep: 0, stuck: 0, captures: 0, long: 0, passes: 0, byOther: 0 };
PAIRS.forEach(function (p) {
  var a = p[0], b = p[1], w = { a: 0, b: 0, d: 0 }, len = 0, ms = 0, why = {}, slow = 0, blackWins = 0;
  for (var g = 0; g < N; g++) {
    var aBlack = g % 2 === 0, r = game(aBlack ? a : b, aBlack ? b : a, g);
    all.games++; len += r.moves; ms += r.ms; slow += r.slow;
    if (r.moves >= 400) all.long++;
    why[r.st.why || 'none'] = (why[r.st.why || 'none'] || 0) + 1;
    all[r.st.why] = (all[r.st.why] || 0) + 1;
    all.passes += (r.st.passes['1'] || 0) + (r.st.passes['-1'] || 0);
    all.captures += r.st.ml.filter(function (m) { return m.indexOf('x') > 0; }).length;
    if (r.st.why === 'connect' && r.st.last && r.st.last.side !== r.st.win) all.byOther++;
    if (r.st.win === 0 || r.st.win == null) w.d++;
    else { if (r.st.win === 1) blackWins++; if ((r.st.win === 1) === aBlack) w.a++; else w.b++; }
  }
  console.log(a + ' vs ' + b + ': ' + a + ' won ' + w.a + ', ' + b + ' won ' + w.b + ', drawn ' + w.d +
    '; black won ' + blackWins + '; ' + (len / N).toFixed(1) + ' moves a game; ' + (ms / Math.max(1, len)).toFixed(0) + ' ms a move; endings ' + JSON.stringify(why) + (slow ? '; slow moves ' + slow : ''));
});
console.log('All: ' + JSON.stringify(all));
console.log(errors ? errors + ' ERRORS' : 'No errors: every move matched the plain rules, every win was seen.');
process.exit(errors ? 1 : 0);
