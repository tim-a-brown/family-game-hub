#!/usr/bin/env node
// Blokus: robot games with every placement checked (CLAUDE.md, Blokus).
//   node scripts/blokus-sim.js [games] [--np=2|3|4] [--seats=easy,normal,normal,normal] [--matrix] [--seed=n] [--quiet]
// Each piece a robot places is checked against a second, plainer reading of the rules written here: the piece is one
// of the color's unused pieces in one of its eight turns and flips (worked out here, not from the core's tables); every
// square is on the board and empty; a color's first piece covers its own corner square; every later piece touches its
// own color corner to corner and never along a side. When the core puts a color out, a brute-force search here (every
// unused piece, every turn and flip, every place on the board) must find no legal placement. At the end every score is
// worked out again from the trays (-1 a square left, +15 for all 21, +20 when the single square was last), the players'
// totals (two colors each with two players, the shared color counting for nobody with three) and the winners.
// --matrix plays the skills against each other (seats rotated so each skill sits in every seat) and prints win rates.
'use strict';
var path = require('path');
var B = require(path.join(__dirname, '..', 'games', 'blokus-core.js'));

var args = process.argv.slice(2), NG = +(args.find(function (a) { return /^\d+$/.test(a); }) || 200);
function opt(name, d) { var a = args.find(function (x) { return x.indexOf('--' + name + '=') === 0; }); return a ? a.slice(name.length + 3) : d; }
var QUIET = args.indexOf('--quiet') >= 0, MATRIX = args.indexOf('--matrix') >= 0;
var seed = +opt('seed', 7);
function rnd() { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }

// ── the plain reading ──
var N = 20;
var SHAPES = [   // the 21 pieces, written out again here
  [[0, 0]], [[0, 0], [0, 1]], [[0, 0], [0, 1], [0, 2]], [[0, 0], [1, 0], [1, 1]],
  [[0, 0], [0, 1], [0, 2], [0, 3]], [[0, 0], [1, 0], [2, 0], [2, 1]], [[0, 0], [0, 1], [0, 2], [1, 1]], [[0, 0], [0, 1], [1, 0], [1, 1]], [[0, 1], [0, 2], [1, 0], [1, 1]],
  [[0, 1], [0, 2], [1, 0], [1, 1], [2, 1]], [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]], [[0, 0], [1, 0], [2, 0], [3, 0], [3, 1]], [[0, 1], [1, 1], [2, 0], [2, 1], [3, 0]],
  [[0, 0], [0, 1], [1, 0], [1, 1], [2, 0]], [[0, 0], [0, 1], [0, 2], [1, 1], [2, 1]], [[0, 0], [0, 2], [1, 0], [1, 1], [1, 2]], [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2]],
  [[0, 0], [1, 0], [1, 1], [2, 1], [2, 2]], [[0, 1], [1, 0], [1, 1], [1, 2], [2, 1]], [[0, 1], [1, 0], [1, 1], [2, 1], [3, 1]], [[0, 0], [0, 1], [1, 1], [2, 1], [2, 2]]
];
var CORNER = { 1: [0, 0], 2: [0, 19], 3: [19, 19], 4: [19, 0] };
function shape(cells) { var mr = 99, mc = 99; cells.forEach(function (q) { mr = Math.min(mr, q[0]); mc = Math.min(mc, q[1]); }); return cells.map(function (q) { return (q[0] - mr) + ',' + (q[1] - mc); }).sort().join(' '); }
// the eight ways piece p can lie, as shape strings
var WAYS = SHAPES.map(function (s) {
  var out = {}, cur = s;
  for (var f = 0; f < 2; f++) {
    for (var k = 0; k < 4; k++) { out[shape(cur)] = cur.map(function (q) { return q.slice(); }); cur = cur.map(function (q) { return [q[1], -q[0]]; }); }
    cur = cur.map(function (q) { return [q[0], -q[1]]; });
  }
  return out;
});
function at(b, r, c) { return r < 0 || r >= N || c < 0 || c >= N ? -1 : b[r * N + c]; }
// is placing these squares (as [r, c]) of color col legal on board b, with firstMove?
function plainOk(b, col, cells, firstMove) {
  var touch = false, onCorner = false;
  for (var i = 0; i < cells.length; i++) {
    var r = cells[i][0], c = cells[i][1];
    if (r < 0 || r >= N || c < 0 || c >= N) return false;
    if (b[r * N + c] !== 0) return false;
    if (at(b, r - 1, c) === col || at(b, r + 1, c) === col || at(b, r, c - 1) === col || at(b, r, c + 1) === col) return false;
    if (at(b, r - 1, c - 1) === col || at(b, r - 1, c + 1) === col || at(b, r + 1, c - 1) === col || at(b, r + 1, c + 1) === col) touch = true;
    if (r === CORNER[col][0] && c === CORNER[col][1]) onCorner = true;
  }
  return firstMove ? onCorner : touch;
}
// any legal placement at all for col with these unused pieces?
function plainAny(b, col, unused, firstMove) {
  for (var p = 0; p < 21; p++) {
    if (!unused[p]) continue;
    var ws = WAYS[p];
    for (var key in ws) {
      var cl = ws[key], mr = 99, mc = 99; cl.forEach(function (q) { mr = Math.min(mr, q[0]); mc = Math.min(mc, q[1]); });
      for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) {
        if (plainOk(b, col, cl.map(function (q) { return [q[0] - mr + r, q[1] - mc + c]; }), firstMove)) return true;
      }
    }
  }
  return false;
}

// ── a game ──
var problems = 0;
function fail(msg) { problems++; if (problems < 20) console.log('PROBLEM: ' + msg); }
function game(levels, np) {
  var st = B.newGame(np), board = [], unused = { 1: [], 2: [], 3: [], 4: [] }, placed = { 1: 0, 2: 0, 3: 0, 4: 0 }, lastP = {}, outSeen = {};
  for (var i = 0; i < 400; i++) board.push(0);
  for (var c = 1; c <= 4; c++) for (var p = 0; p < 21; p++) unused[c].push(true);
  var guard = 0;
  while (!st.over && guard++ < 200) {
    var col = st.turn, who = B.ctrl(st, col), L = Object.assign({}, B.LEVELS[levels[who]], { seed: Math.floor(rnd() * 1e9) });
    var res = B.search(st, L);
    if (!res) { fail('no move found for a color the core says can play'); break; }
    var d = B.dec(res.move), cl = B.cellsOf(res.move);
    var cells = cl.map(function (x) { return [Math.floor(x / N), x % N]; });
    // the plain checks
    if (!unused[col][d.p]) fail('piece used twice');
    if (!WAYS[d.p][shape(cells)]) fail('not a turn or flip of the piece');
    if (!plainOk(board, col, cells, placed[col] === 0)) fail('placement breaks the rules: color ' + col + ' piece ' + d.p + ' at ' + cl.join(','));
    var r = B.play(st, res.move);
    if (!r) { fail('core refused its own move'); break; }
    cl.forEach(function (x) { board[x] = col; });
    unused[col][d.p] = false; placed[col]++; lastP[col] = d.p;
    for (var x = 0; x < 400; x++) if (board[x] !== st.b[x]) { fail('boards differ'); break; }
    // a color the core has just put out must have no placement, and one still in must have one
    for (c = 1; c <= 4; c++) {
      if (st.out[c] && !outSeen[c]) {
        outSeen[c] = 1;
        var any = unused[c].some(Boolean) && plainAny(board, c, unused[c], placed[c] === 0);
        if (any) fail('color ' + c + ' put out with a placement left');
      }
    }
    if (!st.over && !plainAny(board, st.turn, unused[st.turn], placed[st.turn] === 0)) fail('color to move has no placement');
  }
  if (!st.over) fail('game did not end');
  // the scores again
  var psc = []; for (var p2 = 0; p2 < np; p2++) psc.push(0);
  for (c = 1; c <= 4; c++) {
    var left = 0; unused[c].forEach(function (u, p3) { if (u) left += SHAPES[p3].length; });
    var s = -left; if (!left) s += lastP[c] === 0 ? 20 : 15;
    if (s !== st.sc[c]) fail('score of color ' + c + ': ' + st.sc[c] + ' should be ' + s);
    var owner = np === 4 ? c - 1 : np === 2 ? (c === 1 || c === 3 ? 0 : 1) : (c === 4 ? -1 : c - 1);
    if (owner >= 0) psc[owner] += s;
  }
  psc.forEach(function (v, i2) { if (v !== st.psc[i2]) fail('player total ' + i2); });
  var best = Math.max.apply(null, psc), w = []; psc.forEach(function (v, i2) { if (v === best) w.push(i2); });
  if (w.join() !== st.win.join()) fail('winners');
  return st;
}

var t0 = Date.now(), stats = { games: 0, moves: 0, all21: 0, mono: 0, outs: 0 };
function tally(st) {
  stats.games++; stats.moves += st.n;
  for (var c = 1; c <= 4; c++) { if (!st.left[c]) { stats.all21++; if (st.lastP[c] === 0) stats.mono++; } }
}
if (MATRIX) {
  var np = +opt('np', 2), pairs = opt('pairs', 'easy-normal,normal-hard,easy-hard').split(',');
  pairs.forEach(function (pr) {
    var a = pr.split('-')[0], b2 = pr.split('-')[1], wins = { a: 0, b: 0, tie: 0 }, sum = { a: 0, b: 0 };
    for (var g = 0; g < NG; g++) {
      // a takes seat g % np, the rest b
      var lv = []; for (var i = 0; i < np; i++) lv.push(i === g % np ? a : b2);
      var st = game(lv, np); tally(st);
      var ai = g % np, ws = st.win;
      if (ws.length > 1) wins.tie++; else if (ws[0] === ai) wins.a++; else wins.b++;
      sum.a += st.psc[ai];
    }
    var share = np === 2 ? 0.5 : 1 / np;
    console.log(np + ' players, one ' + a + ' against ' + (np - 1) + ' ' + b2 + ': the ' + a + ' seat won ' + (100 * wins.a / NG).toFixed(1) + '% (an even share is ' + (100 * share).toFixed(0) + '%), ties ' + wins.tie + ', its average score ' + (sum.a / NG).toFixed(1));
  });
} else {
  var np2 = +opt('np', 4), seats = opt('seats', 'normal,normal,normal,normal').split(',');
  for (var g = 0; g < NG; g++) { var st = game(seats.slice(0, np2), np2); tally(st); if (!QUIET && g % 50 === 0) console.log('game ' + g + ': scores ' + st.sc.slice(1).join(' ') + ', players ' + st.psc.join(' ')); }
}
console.log(stats.games + ' games, ' + stats.moves + ' placements checked, ' + stats.all21 + ' colors placed all 21 (' + stats.mono + ' with the single square last), ' + problems + ' problems, ' + ((Date.now() - t0) / 1000).toFixed(1) + ' s');
process.exit(problems ? 1 : 0);
