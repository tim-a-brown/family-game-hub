#!/usr/bin/env node
// Twixt: robot games with every move checked (CLAUDE.md, Twixt).
//   node scripts/twixt-sim.js [games] [--pairs=easy-normal,normal-hard,random-random] [--noswap] [--scale=0.3 (thinking time)] [--seed=n] [--quiet]
// Each peg a robot places is checked against a second, plainer reading of the rules written here: the hole is empty,
// not a corner and not in the other player's border rows; the links made are exactly the knight's-move pegs of the same
// color whose segment crosses no link on the board (crossing worked out from the coordinates, not the core's table);
// no two links on the board ever cross; every link joins two pegs of one color a knight's move apart. After every move
// the win is checked by a flood fill of its own (a peg in one border row joined through links to a peg in the other),
// and a draw by its own search for a way through for each side. The pie rule is checked too (only Black's first turn).
'use strict';
var path = require('path');
var C = require(path.join(__dirname, '..', 'games', 'twixt-core.js'));

var args = process.argv.slice(2), NG = +(args.find(function (a) { return /^\d+$/.test(a); }) || 40);
function opt(name, d) { var a = args.find(function (x) { return x.indexOf('--' + name + '=') === 0; }); return a ? a.slice(name.length + 3) : d; }
var SCALE = +opt('scale', 0.3), NOSWAP = args.indexOf('--noswap') >= 0, QUIET = args.indexOf('--quiet') >= 0;
var PAIRS = opt('pairs', 'easy-normal,normal-hard,easy-hard').split(',').map(function (p) { return p.split('-'); });
var seed = +opt('seed', 11);
function rnd() { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
Math.random = rnd;

// ── the plain reading ──
var N = 24;
function rc(h) { return [Math.floor(h / N), h % N]; }
function corner(r, c) { return (r === 0 || r === N - 1) && (c === 0 || c === N - 1); }
function mayPlay(r, c, side) { if (corner(r, c)) return false; return side === 1 ? c !== 0 && c !== N - 1 : r !== 0 && r !== N - 1; }
function knight(a, b) { var p = rc(a), q = rc(b), dr = Math.abs(p[0] - q[0]), dc = Math.abs(p[1] - q[1]); return dr === 1 && dc === 2 || dr === 2 && dc === 1; }
function orient(a, b, c) { return Math.sign((b[1] - a[1]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[1] - a[1])); }
// two links (pairs of holes) cross when they share no hole and each separates the other's ends
function cross(l1, l2) {
  if (l1[0] === l2[0] || l1[0] === l2[1] || l1[1] === l2[0] || l1[1] === l2[1]) return false;
  var a = rc(l1[0]), b = rc(l1[1]), c = rc(l2[0]), d = rc(l2[1]);
  return orient(a, b, c) * orient(a, b, d) < 0 && orient(c, d, a) * orient(c, d, b) < 0;
}
function plainLinks(board, links, h, side) {
  var out = [];
  for (var x = 0; x < N * N; x++) {
    if (board[x] !== side || !knight(h, x)) continue;
    var L = [h, x], ok = links.every(function (m) { return !cross(L, m); });
    if (ok) out.push(L);
  }
  return out;
}
function plainWin(board, links, side) {
  var adj = {}; links.forEach(function (l) { if (board[l[0]] !== side) return; (adj[l[0]] = adj[l[0]] || []).push(l[1]); (adj[l[1]] = adj[l[1]] || []).push(l[0]); });
  var seen = {}, st = [];
  for (var h = 0; h < N * N; h++) { var p = rc(h); if (board[h] === side && (side === 1 ? p[0] === 0 : p[1] === 0)) { seen[h] = 1; st.push(h); } }
  while (st.length) {
    var x = st.pop(), q = rc(x);
    if (side === 1 ? q[0] === N - 1 : q[1] === N - 1) return true;
    (adj[x] || []).forEach(function (y) { if (!seen[y]) { seen[y] = 1; st.push(y); } });
  }
  return false;
}
// can side still get through: its pegs and the empty holes it may play, joined by its links or by any pair a
// knight's move apart whose segment crosses no link on the board
function plainCan(board, links, side) {
  var ok = function (h) { var p = rc(h); return board[h] === side || (!board[h] && mayPlay(p[0], p[1], side)); };
  var have = {}; links.forEach(function (l) { have[Math.min(l[0], l[1]) + ',' + Math.max(l[0], l[1])] = 1; });
  var seen = {}, st = [];
  for (var h = 0; h < N * N; h++) { var p = rc(h); if ((side === 1 ? p[0] === 0 : p[1] === 0) && ok(h)) { seen[h] = 1; st.push(h); } }
  while (st.length) {
    var x = st.pop(), q = rc(x);
    if (side === 1 ? q[0] === N - 1 : q[1] === N - 1) return true;
    [[1, 2], [2, 1], [2, -1], [1, -2], [-1, 2], [-2, 1], [-2, -1], [-1, -2]].forEach(function (d) {
      var r = q[0] + d[0], c = q[1] + d[1]; if (r < 0 || r >= N || c < 0 || c >= N) return;
      var y = r * N + c; if (seen[y] || !ok(y)) return;
      var L = [x, y];
      if (!have[Math.min(x, y) + ',' + Math.max(x, y)] && links.some(function (m) { return cross(L, m); })) return;
      seen[y] = 1; st.push(y);
    });
  }
  return false;
}

var fail = 0, total = 0, movesAll = 0, t0 = Date.now(), timeMax = {};
function check(cond, msg) { if (!cond) { fail++; if (fail < 20) console.log('FAIL', msg); } }
function playGame(red, black, swap) {
  var st = C.newGame({ swap: swap }), board = [], links = [], who = { 1: red, 2: black };
  for (var i = 0; i < N * N; i++) board.push(0);
  var guard = 0, swapped = false;
  while (!st.over && guard++ < 700) {
    var side = st.turn, lv = who[side], L = Object.assign({}, C.LEVELS[lv] || {});
    L.time = Math.round((L.time || 0) * SCALE); L.seed = Math.floor(rnd() * 1e9);
    // 'random' places pegs anywhere legal: its games fill the board and end in draws, which checks the draw rule
    var a = Date.now(), ms = lv === 'random' ? C.moves(st).filter(function (m) { return m !== 'swap'; }) : null;
    var res = ms ? { move: ms[Math.floor(rnd() * ms.length)] } : C.search(JSON.parse(JSON.stringify(st)), L), dt = Date.now() - a;
    timeMax[lv] = Math.max(timeMax[lv] || 0, dt);
    check(res && res.move != null, 'no move');
    if (!res) break;
    if (res.move === 'swap') {
      check(st.swap && st.n === 1 && side === 2, 'swap at the wrong time');
      var m0 = C.play(st, 'swap'); check(m0 && m0.swap, 'swap refused');
      var tmp = who[1]; who[1] = who[2]; who[2] = tmp; swapped = true;
      continue;
    }
    var h = res.move, p = rc(h);
    check(!board[h] && mayPlay(p[0], p[1], side), 'illegal hole ' + C.name(h) + ' for ' + side);
    var want = plainLinks(board, links, h, side);
    var mv = C.play(st, h);
    check(!!mv, 'core refused ' + C.name(h));
    if (!mv) break;
    movesAll++;
    board[h] = side;
    var got = mv.links.map(function (id) { var e = C.ends(id); return e; });
    check(got.length === want.length && want.every(function (w) { return got.some(function (g) { return g[0] === w[0] && g[1] === w[1] || g[0] === w[1] && g[1] === w[0]; }); }), 'links differ at ' + C.name(h));
    want.forEach(function (w) { links.push(w); });
    // no two links cross; each joins one color's pegs a knight's move apart
    for (var x = links.length - want.length; x < links.length; x++) {
      check(knight(links[x][0], links[x][1]) && board[links[x][0]] === board[links[x][1]], 'bad link');
      for (var y = 0; y < links.length; y++) if (y !== x) check(!cross(links[x], links[y]), 'crossing links');
    }
    check(st.lk.length === links.length, 'link count');
    var wr = plainWin(board, links, 1), wb = plainWin(board, links, 2);
    check(!(wr && wb), 'both win');
    if (wr || wb) check(st.over && st.why === 'connect' && st.win === (wr ? 1 : 2), 'win missed or wrong');
    else if (st.over) {
      check(st.why === 'stuck' && !plainCan(board, links, 1) && !plainCan(board, links, 2), 'draw wrong');
    } else if (st.n % 9 === 0) check(plainCan(board, links, 1) || plainCan(board, links, 2), 'missed a draw');
    if (st.over && st.chain) {
      for (var k = 1; k < st.chain.length; k++) check(knight(st.chain[k - 1], st.chain[k]), 'chain not linked');
    }
  }
  return { win: st.win, why: st.why, n: st.n, swapped: swapped, winner: st.win ? who[st.win] : null, redWon: st.win === 1 };
}

PAIRS.forEach(function (pair) {
  var a = pair[0], b = pair[1], res = { a: 0, b: 0, draw: 0, n: 0, swaps: 0, red: 0 };
  for (var g = 0; g < NG; g++) {
    var aRed = g % 2 === 0, r = playGame(aRed ? a : b, aRed ? b : a, !NOSWAP);
    total++; res.n += r.n; if (r.swapped) res.swaps++; if (r.redWon) res.red++;
    if (!r.win) res.draw++;
    else if (a === b) { if (r.redWon) res.a++; else res.b++; }
    else if (r.winner === a) res.a++; else res.b++;
    if (!QUIET) process.stdout.write('.');
  }
  console.log('\n' + a + ' vs ' + b + ': ' + a + ' ' + res.a + ', ' + b + ' ' + res.b + ', draws ' + res.draw + ' of ' + NG + (a === b ? ' (first ' + a + ' = Red won)' : '') +
    '; Red won ' + res.red + '; swaps ' + res.swaps + '; ' + (res.n / NG).toFixed(1) + ' moves a game');
});
console.log(total + ' games, ' + movesAll + ' pegs checked, ' + fail + ' failures, longest think ' + JSON.stringify(timeMax) + ' ms, ' + ((Date.now() - t0) / 1000).toFixed(0) + ' s');
process.exit(fail ? 1 : 0);
