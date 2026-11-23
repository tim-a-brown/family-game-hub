// ═══════════════════════════════════════════════════════════════════════════
// Boku: the rules and the computer players, in plain JSON state. The same code runs in the page (games/boku.html),
// at an online table (TurnNet: each move is made inside the table's transaction), in a Web Worker for the computer's
// search, and in Node (scripts/boku-sim.js plays thousands of games with it).
// Boku was designed by Rob Nelson (included with his written permission).
//
// The rules (Rob Nelson's, as the Mind Sports Olympiad plays them):
//   A hexagonal board of 80 holes in rows of 5, 6, 7, 8, 9, 10, 9, 8, 7, 6, 5. White moves first.
//   On a turn a player puts one marble of their color into any empty hole.
//   Five or more of a player's marbles in a straight line win at once.
//   A capture: when the marble just placed traps exactly two of the other player's marbles in a straight line
//   between itself and another of the player's own (you, them, them, you), the player may take away one of those
//   two, whichever they choose. Only one marble is taken a turn, even when the placement traps pairs in more than
//   one line (the player chooses from all of them). Taking one is a choice, not a duty.
//   The other player may not put a marble into the hole just emptied on their very next turn.
//   A placement that makes five wins at once, and no capture is made with it.
//   Placing a marble between two of the other player's marbles is safe: only the player who places captures.
//   If the board fills with no five in a row, the game is a draw. A player whose only empty hole is the one they
//   may not use passes that turn (rare; how the rule sheet settles it isn't known here).
//
// Holes: 80, numbered row by row from the top of the screen (row K) down to row A, left to right. A hole's name is
// its row letter (A at the bottom to K at the top) and its place in the row from the left: A1 to A5, F1 to F10, K1
// to K5. Axial coordinates (q, r), r growing down the screen; -5 <= r <= 5, -5 <= q <= 4, -5 <= q + r <= 4.
// Directions (0 to 5): E, NE, NW, W, SW, SE.
//
// State (all plain JSON):
//   v, b [80] (0 empty, 1 White, 2 Black), turn (1 | 2), caps [_, taken by White, taken by Black], n (turns played),
//   ml [move strings], blk (the hole the side to move may not use, or -1), over, winner (1 | 2 | 0), draw (true when
//   the board filled), line [the winning line's holes], cx [move numbers that captured], dbl [_, w, b] (double
//   threats made), pass [_, w, b]
// A move string is a hole's name, with ' x' and the hole taken when it captures: 'F5', 'F5 xG6', or 'pass'.
// ═══════════════════════════════════════════════════════════════════════════
(function (root) {
  'use strict';
  var N = 80, WHITE = 1, BLACK = 2;
  var DIRS = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
  var CELLS = [], AT = {}, NB = new Int16Array(N * 6), ROW = [], NAMES = [], ROWS = [];
  (function () {
    for (var y = 0; y <= 10; y++) {
      var r = y - 5, row = [], j = 0;
      for (var q = -5; q <= 4; q++) {
        if (q + r < -5 || q + r > 4) continue;
        var i = CELLS.length;
        CELLS.push({ q: q, r: r, y: y, j: j, x: q + r / 2 + 0.5 });
        AT[q + ',' + r] = i; ROW.push(y); row.push(i);
        NAMES.push('KJIHGFEDCBA'.charAt(y) + (j + 1)); j++;
      }
      ROWS.push(row);
    }
    for (var c = 0; c < N; c++) for (var d = 0; d < 6; d++) {
      var t = AT[(CELLS[c].q + DIRS[d][0]) + ',' + (CELLS[c].r + DIRS[d][1])];
      NB[c * 6 + d] = t == null ? -1 : t;
    }
  })();
  function nb(c, d) { return NB[c * 6 + d]; }
  function idx(name) { return NAMES.indexOf(String(name).toUpperCase()); }
  function other(s) { return 3 - s; }

  // Every window of five holes in a straight line (the places a five can be made), and the windows each hole is in
  var WINS = [], WOF = [];
  (function () {
    for (var c = 0; c < N; c++) WOF.push([]);
    for (var d = 0; d < 3; d++) for (var s = 0; s < N; s++) {
      var w = [s], x = s;
      for (var k = 1; k < 5; k++) { x = NB[x * 6 + d]; if (x < 0) break; w.push(x); }
      if (w.length === 5) { var i = WINS.length; WINS.push(w); w.forEach(function (h) { WOF[h].push(i); }); }
    }
  })();
  // holes within two steps of each hole (where the computer looks)
  var NEAR = [];
  (function () {
    for (var c = 0; c < N; c++) {
      var s = {}; for (var d = 0; d < 6; d++) { var a = NB[c * 6 + d]; if (a < 0) continue; s[a] = 1; for (var e = 0; e < 6; e++) { var b2 = NB[a * 6 + e]; if (b2 >= 0 && b2 !== c) s[b2] = 1; } }
      NEAR.push(Object.keys(s).map(Number));
    }
  })();

  function newGame() {
    var b = []; for (var i = 0; i < N; i++) b.push(0);
    return { v: 1, b: b, turn: WHITE, caps: [0, 0, 0], n: 0, ml: [], blk: -1, over: false, winner: 0, draw: false, line: [], cx: [], dbl: [0, 0, 0], pass: [0, 0, 0] };
  }

  // the pairs a marble of side's placed at c would trap: [{d, p: [nearer, farther]}]
  function sandwiches(b, c, side) {
    var o = other(side), out = [];
    for (var d = 0; d < 6; d++) {
      var a = NB[c * 6 + d]; if (a < 0 || b[a] !== o) continue;
      var a2 = NB[a * 6 + d]; if (a2 < 0 || b[a2] !== o) continue;
      var e = NB[a2 * 6 + d]; if (e < 0 || b[e] !== side) continue;
      out.push({ d: d, p: [a, a2] });
    }
    return out;
  }
  // the marbles a placement at c could take (each once)
  function takeable(b, c, side) { var s = []; sandwiches(b, c, side).forEach(function (w) { w.p.forEach(function (h) { if (s.indexOf(h) < 0) s.push(h); }); }); return s; }
  // the longest straight line of side's marbles through c (with b[c] counted as side's), its holes in order
  function runThrough(b, c, side) {
    var best = [c];
    for (var d = 0; d < 3; d++) {
      var run = [c], x = NB[c * 6 + d];
      while (x >= 0 && b[x] === side) { run.push(x); x = NB[x * 6 + d]; }
      x = NB[c * 6 + d + 3];
      while (x >= 0 && b[x] === side) { run.unshift(x); x = NB[x * 6 + d + 3]; }
      if (run.length > best.length) best = run;
    }
    return best;
  }
  function makesFive(b, c, side) { return runThrough(b, c, side).length >= 5; }
  // the empty holes where side would make five (not counting a hole side may not use: pass blk for that)
  function winCells(b, side, blk) {
    var out = [];
    for (var i = 0; i < WINS.length; i++) {
      var w = WINS[i], own = 0, emp = -1, bad = false;
      for (var k = 0; k < 5; k++) { var v = b[w[k]]; if (v === side) own++; else if (v === 0) { if (emp >= 0) { bad = true; break; } emp = w[k]; } else { bad = true; break; } }
      if (!bad && own === 4 && emp >= 0 && emp !== blk && out.indexOf(emp) < 0) out.push(emp);
    }
    return out;
  }
  function empties(b) { var n = 0; for (var i = 0; i < N; i++) if (!b[i]) n++; return n; }
  // the holes the side to move may use
  function places(st) { var o = []; for (var i = 0; i < N; i++) if (!st.b[i] && i !== st.blk) o.push(i); return o; }
  function parse(str) {
    if (str === 'pass') return { pass: true, c: -1, x: -1 };
    var m = /^([A-K]\d{1,2})(?: x([A-K]\d{1,2}))?$/.exec(String(str || ''));
    if (!m) return null;
    var c = idx(m[1]), x = m[2] ? idx(m[2]) : -1;
    if (c < 0 || (m[2] && x < 0)) return null;
    return { c: c, x: x, pass: false };
  }
  function encode(c, x) { return NAMES[c] + (x >= 0 ? ' x' + NAMES[x] : ''); }
  // is this move legal now? returns the parsed move or null
  function check(st, str) {
    if (st.over) return null;
    var m = parse(str); if (!m) return null;
    if (m.pass) return places(st).length === 0 && empties(st.b) > 0 ? m : null;
    if (st.b[m.c] || m.c === st.blk) return null;
    if (m.x >= 0) {
      if (makesFive(st.b, m.c, st.turn)) return null;   // a win takes no capture
      if (takeable(st.b, m.c, st.turn).indexOf(m.x) < 0) return null;
    }
    return m;
  }
  // play a move string on the state; returns {c, x, five, threats, pass} or null if it isn't legal
  function play(st, str) {
    var m = check(st, str); if (!m) return null;
    var side = st.turn, o = other(side), res = { c: m.c, x: m.x, five: null, threats: 0, pass: m.pass, side: side };
    st.n++; st.ml.push(m.pass ? 'pass' : encode(m.c, m.x));
    if (m.pass) { st.pass[side]++; st.blk = -1; st.turn = o; return res; }
    st.b[m.c] = side;
    var run = runThrough(st.b, m.c, side);
    if (run.length >= 5) { st.over = true; st.winner = side; st.line = run; st.blk = -1; res.five = run; return res; }
    st.blk = -1;
    if (m.x >= 0) { st.b[m.x] = 0; st.caps[side]++; st.cx.push(st.n); st.blk = m.x; }
    res.threats = winCells(st.b, side, -1).length;
    if (res.threats >= 2) st.dbl[side]++;
    if (!empties(st.b)) { st.over = true; st.draw = true; st.winner = 0; return res; }
    st.turn = o;
    // (a player whose only empty hole is the one they may not use passes: done at once, so a turn always has a move)
    if (!places(st).length) { st.n++; st.ml.push('pass'); st.pass[o]++; st.blk = -1; st.turn = side; }
    return res;
  }
  function count(b, side) { var n = 0; for (var i = 0; i < N; i++) if (b[i] === side) n++; return n; }
  // the board as 11 strings of 'w', 'b' and '.', top row (K) first
  function grid(b) { var rows = []; ROWS.forEach(function (row) { rows.push(row.map(function (i) { return b[i] === 1 ? 'w' : b[i] === 2 ? 'b' : '.'; }).join('')); }); return rows; }
  function fromGrid(rows) { var b = []; rows.join('').split('').forEach(function (ch) { b.push(ch === 'w' ? 1 : ch === 'b' ? 2 : 0); }); return b; }
  function colorName(s) { return s === WHITE ? 'White' : 'Black'; }
  // a move as a person would say it: "White put a marble on F5 and took Black's marble on G6"
  function describe(str, side) {
    var m = parse(str); if (!m) return '';
    var who = colorName(side), them = colorName(other(side));
    if (m.pass) return who + ' had no hole to use and passed';
    return who + ' put a marble on ' + NAMES[m.c] + (m.x >= 0 ? ' and took ' + them + '’s marble on ' + NAMES[m.x] : '');
  }

  // ── The computer ──
  // A position is weighed from the side to move: every window of five holes with only one side's marbles in it is
  // worth more the fuller it is (an open four nearly a win), pairs of marbles the other side could trap and take
  // next move count against their owner, and marbles taken count a little. The search looks at the holes near the
  // marbles on the board, best first, and when the other side has a four it only looks at the moves that stop it.
  var V = [0, 1, 7, 45, 420, 0], WIN = 1e6, STOP = {};
  function capturable(b, side, blkO) {
    // pairs of side's marbles the other side could trap with its next marble: x S S y with x the other side's and y empty
    var o = other(side), n = 0;
    for (var a = 0; a < N; a++) {
      if (b[a] !== side) continue;
      for (var d = 0; d < 6; d++) {
        var a2 = NB[a * 6 + d]; if (a2 < 0 || b[a2] !== side) continue;
        var x = NB[a * 6 + d + (d < 3 ? 3 : -3)], y = NB[a2 * 6 + d];
        if (x >= 0 && y >= 0 && b[x] === o && b[y] === 0 && y !== blkO) n++;
      }
    }
    return n;
  }
  function evaluate(b, side, caps, blk) {
    var o = other(side), s = 0;
    for (var i = 0; i < WINS.length; i++) {
      var w = WINS[i], a = 0, z = 0;
      for (var k = 0; k < 5; k++) { var v = b[w[k]]; if (v === side) a++; else if (v === o) z++; }
      if (a && !z) s += V[a] * 1.15; else if (z && !a) s -= V[z];
    }
    // the side to move takes first: its own marbles that can be trapped matter less than the other side's
    s += 22 * capturable(b, o, -1) - 34 * capturable(b, side, blk);
    if (caps) s += 9 * (caps[side] - caps[o]);
    return s;
  }
  // a quick guess at a placement's worth, to look at the best first
  function guess(b, c, side) {
    var o = other(side), g = 0, L = WOF[c];
    for (var i = 0; i < L.length; i++) {
      var w = WINS[L[i]], a = 0, z = 0;
      for (var k = 0; k < 5; k++) { var v = b[w[k]]; if (v === side) a++; else if (v === o) z++; }
      if (!z) g += V[a + 1] - V[a];
      if (!a) g += (V[z + 1] - V[z]) * .85;
    }
    return g;
  }
  // the moves worth looking at: [{c, x}], best first. blk: the hole side may not use.
  function candidates(b, side, blk, caps) {
    var seen = new Uint8Array(N), list = [], any = false;
    for (var i = 0; i < N; i++) if (b[i]) { any = true; var L = NEAR[i]; for (var k = 0; k < L.length; k++) { var h = L[k]; if (!b[h] && h !== blk && !seen[h]) { seen[h] = 1; list.push(h); } } }
    if (!any) { for (i = 0; i < N; i++) if (!b[i] && i !== blk && Math.abs(CELLS[i].x) <= 1.5 && Math.abs(CELLS[i].r) <= 1) list.push(i); }
    if (!list.length) for (i = 0; i < N; i++) if (!b[i] && i !== blk) list.push(i);
    var out = [];
    list.forEach(function (c) {
      var g = guess(b, c, side);
      out.push({ c: c, x: -1, g: g });
      b[c] = side; var five = runThrough(b, c, side).length >= 5; b[c] = 0;
      if (five) { out[out.length - 1].g += 1e5; return; }
      takeable(b, c, side).forEach(function (x) { out.push({ c: c, x: x, g: g + 60 + guess(b, x, other(side)) * .5 }); });
    });
    out.sort(function (p, q) { return q.g - p.g; });
    return out;
  }
  function make(b, m, side, caps) { b[m.c] = side; if (m.x >= 0) { b[m.x] = 0; caps[side]++; } }
  function unmake(b, m, side, caps) { b[m.c] = 0; if (m.x >= 0) { b[m.x] = other(side); caps[side]--; } }
  // search(b, side, blk, caps, {depth, time, noise, beam, rnd}) -> {move, score, depth, nodes}
  function search(b, side, blk, caps, o) {
    o = o || {};
    b = b.slice(); caps = (caps || [0, 0, 0]).slice();
    var t0 = Date.now(), limit = o.time || 0, maxD = o.depth || 2, beam = o.beam || 14, nodes = 0, rnd = o.rnd || Math.random;
    function tick() { if ((++nodes & 511) === 0 && limit > 0 && Date.now() - t0 > limit) throw STOP; }
    // the moves side may make here, cut down to the ones that stop the other side's five when it has a four
    function moves(sd, bk, ply) {
      var wins = winCells(b, sd, bk);
      if (wins.length) return { win: wins[0] };
      var list = candidates(b, sd, bk, caps), threats = winCells(b, other(sd), -1);
      if (threats.length) {
        list = list.filter(function (m) {
          if (threats.indexOf(m.c) < 0 && m.x < 0) return false;
          make(b, m, sd, caps); var t = winCells(b, other(sd), m.x); unmake(b, m, sd, caps);
          return t.length === 0;
        });
        return { list: list, forced: true };
      }
      return { list: list, forced: false };
    }
    function ab(sd, bk, depth, alpha, beta, ply) {
      tick();
      var M = moves(sd, bk, ply);
      if (M.win != null) return WIN - ply;
      if (M.forced && !M.list.length) return -(WIN - ply - 1);
      if (!M.list.length) return 0;
      if (depth <= 0 && !M.forced) return evaluate(b, sd, caps, bk);
      if (depth <= -2) return evaluate(b, sd, caps, bk);
      var list = M.forced ? M.list : M.list.slice(0, beam), best = -Infinity;
      for (var i = 0; i < list.length; i++) {
        var m = list[i];
        make(b, m, sd, caps);
        var v = -ab(other(sd), m.x, depth - 1, -beta, -alpha, ply + 1);
        unmake(b, m, sd, caps);
        if (v > best) best = v;
        if (v > alpha) alpha = v;
        if (alpha >= beta) break;
      }
      return best;
    }
    var R = moves(side, blk, 0);
    if (R.win != null) return { move: encode(R.win, -1), score: WIN, depth: 0, nodes: 1 };
    var root = R.list;
    if (!root.length) {
      // nothing stops the other side (two fours): put a marble on one of them anyway
      var th = winCells(b, other(side), -1).filter(function (c) { return c !== blk; });
      var any = th.length ? th[0] : -1;
      if (any < 0) for (var i = 0; i < N; i++) if (!b[i] && i !== blk) { any = i; break; }
      return any < 0 ? { move: 'pass', score: 0, depth: 0, nodes: 1 } : { move: encode(any, -1), score: -WIN, depth: 0, nodes: 1 };
    }
    root = root.slice(0, Math.max(beam + 6, 20));
    var noise = o.noise || 0;
    root.forEach(function (m) { m.n = (rnd() * 2 - 1) * noise; });
    var best = root[0], bestS = -Infinity, done = 0;
    for (var d = 1; d <= maxD; d++) {
      try {
        var cur = null, curS = -Infinity;
        root.sort(function (a, c) { return (c === best ? 1e12 : (c.v != null ? c.v : c.g)) - (a === best ? 1e12 : (a.v != null ? a.v : a.g)); });
        for (var j = 0; j < root.length; j++) {
          var m = root[j];
          make(b, m, side, caps);
          var v = -ab(other(side), m.x, d - 1, -Infinity, -(cur ? curS - 2 * noise - 1 : -Infinity), 1);
          unmake(b, m, side, caps);
          m.v = v;
          var vn = v + m.n;
          if (!cur || vn > curS) { cur = m; curS = vn; }
        }
        best = cur; bestS = curS; done = d;
        if (Math.abs(bestS) >= WIN - 100) break;
        if (limit > 0 && Date.now() - t0 > limit * 0.4) break;
      } catch (e) {
        if (e !== STOP) throw e;
        break;
      }
    }
    return { move: encode(best.c, best.x), score: bestS, depth: done, nodes: nodes };
  }
  // The three skills differ in how far ahead they look and how much they slip, never in what they can see
  var LEVELS = {
    easy: { depth: 1, time: 0, noise: 60, beam: 10 },
    normal: { depth: 3, time: 0, noise: 6, beam: 10 },
    hard: { depth: 8, time: 1800, noise: 1, beam: 12 }
  };

  root.BokuCore = {
    N: N, WHITE: WHITE, BLACK: BLACK, CELLS: CELLS, NB: NB, DIRS: DIRS, ROW: ROW, ROWS: ROWS, NAMES: NAMES, WINS: WINS, LEVELS: LEVELS,
    idx: idx, nb: nb, other: other, newGame: newGame, sandwiches: sandwiches, takeable: takeable, runThrough: runThrough,
    makesFive: makesFive, winCells: winCells, places: places, parse: parse, encode: encode, check: check, play: play,
    count: count, empties: empties, grid: grid, fromGrid: fromGrid, describe: describe, colorName: colorName,
    evaluate: evaluate, capturable: capturable, search: search,
    clone: function (o) { return JSON.parse(JSON.stringify(o)); }
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.BokuCore;
})(typeof window !== 'undefined' ? window : typeof self !== 'undefined' ? self : globalThis);
