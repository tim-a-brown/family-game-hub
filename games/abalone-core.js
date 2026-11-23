// ═══════════════════════════════════════════════════════════════════════════
// Abalone: the rules and the computer players, in plain JSON state. The same code runs in the page
// (games/abalone.html), at an online table (TurnNet: each move is made inside the table's transaction), in a Web
// Worker for the computer's search, and in Node (scripts/abalone-sim.js plays thousands of games with it).
// Abalone was designed by Michel Lalet and Laurent Lévi (included with the permission of Abalone S.A.).
//
// The rules (the official rule booklet):
//   A hexagonal board of 61 holes, 5 on a side. Each player has 14 marbles; Black moves first.
//   A move shifts 1, 2 or 3 of your own marbles that lie touching in a straight line by one hole:
//     in line   along the line they lie in (the lead marble moves into the hole ahead, the others follow), or
//     broadside sideways, every marble moving into an empty hole beside it. A broadside move never pushes.
//   Sumito: a move in line may push the other player's marbles that lie in that line ahead of yours when yours
//   outnumber them (3 push 2 or 1, 2 push 1). The hole past the last pushed marble must be empty or off the board
//   (that marble is pushed off). A push is blocked by one of your own marbles behind theirs, and by equal numbers
//   (pac: 1 against 1, 2 against 2, 3 against 3). You can never move your own marble off the board.
//   The first player to push 6 of the other player's marbles off the board wins.
//   Starting positions: Standard, Belgian Daisy and German Daisy (the tournament openings).
//
// Holes: 61, numbered row by row from the top of the screen (row I) down to row A, left to right. A hole's name is
// its row letter (A at the bottom, Black's side, to I at the top) and its diagonal number (1 to 9), as the official
// notation has it: A1 to A5, B1 to B6 ... E1 to E9 ... I5 to I9. Directions (0 to 5): E, NE, NW, W, SW, SE.
//
// State (all plain JSON):
//   v, start ('std' | 'belgian' | 'german'), b [61] (0 empty, 1 Black, 2 White), turn (1 | 2), off [_, black, white]
//   (how many of each color are off the board), n (moves made), ml [move strings], over, winner (1 | 2 | 0),
//   ej [move numbers that pushed a marble off], st {push: [_, b, w], sumito: [_, b, w] (3 against 2 pushes)}
// A move string is its marbles (one character each, tail first for a move in line) and its direction: 'Ffg0'.
// ═══════════════════════════════════════════════════════════════════════════
(function (root) {
  'use strict';
  var N = 61, CH = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  var DIRS = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];   // E NE NW W SW SE (axial q, r; r grows down the screen)
  var DNAME = ['right', 'up and to the right', 'up and to the left', 'left', 'down and to the left', 'down and to the right'];
  var CELLS = [], AT = {}, NB = new Int8Array(N * 6), DIST = [], ROW = [], NAMES = [];
  (function () {
    for (var y = 0; y < 9; y++) {
      var r = y - 4, q0 = Math.max(-4, -4 - r), q1 = Math.min(4, 4 - r), k = 8 - y, start = Math.max(1, k - 3), j = 0;
      for (var q = q0; q <= q1; q++, j++) {
        var i = CELLS.length;
        CELLS.push({ q: q, r: r, y: y, j: j, x: q + r / 2 });
        AT[q + ',' + r] = i; ROW.push(y);
        DIST.push(Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r)));
        NAMES.push('IHGFEDCBA'.charAt(y) + (start + j));
      }
    }
    for (var c = 0; c < N; c++) for (var d = 0; d < 6; d++) {
      var t = AT[(CELLS[c].q + DIRS[d][0]) + ',' + (CELLS[c].r + DIRS[d][1])];
      NB[c * 6 + d] = t == null ? -1 : t;
    }
  })();
  function idx(name) { return NAMES.indexOf(String(name).toUpperCase()); }
  function opp(d) { return (d + 3) % 6; }
  function other(s) { return 3 - s; }
  function nb(c, d) { return NB[c * 6 + d]; }

  // ── Starting positions ──
  function daisy(center) { var c = idx(center), o = [c]; for (var d = 0; d < 6; d++) o.push(nb(c, d)); return o; }
  function names(list) { return list.split(' ').map(idx); }
  var START = {
    std: { name: 'Standard', b: names('A1 A2 A3 A4 A5 B1 B2 B3 B4 B5 B6 C3 C4 C5'), w: names('I5 I6 I7 I8 I9 H4 H5 H6 H7 H8 H9 G5 G6 G7') },
    belgian: { name: 'Belgian Daisy', b: daisy('B2').concat(daisy('H8')), w: daisy('B5').concat(daisy('H5')) },
    german: { name: 'German Daisy', b: daisy('C2').concat(daisy('G8')), w: daisy('C6').concat(daisy('G4')) }
  };
  // (a key 'x:' and 61 characters of b, w and . is a position of its own: a lesson's or a test's)
  function startBoard(key) {
    if (typeof key === 'string' && /^x:[bw.]{61}$/.test(key)) return key.slice(2).split('').map(function (ch) { return ch === 'b' ? 1 : ch === 'w' ? 2 : 0; });
    var s = START[key] || START.std, b = []; for (var i = 0; i < N; i++) b.push(0);
    s.b.forEach(function (c) { b[c] = 1; }); s.w.forEach(function (c) { b[c] = 2; });
    return b;
  }
  function newGame(start) {
    start = START[start] || /^x:[bw.]{61}$/.test(String(start)) ? start : 'std';
    return { v: 1, start: start, b: startBoard(start), turn: 1, off: [0, 0, 0], n: 0, ml: [], over: false, winner: 0, ej: [], st: { push: [0, 0, 0], sumito: [0, 0, 0] } };
  }

  // ── Moves ──
  // A move: {c: [own marbles, tail first in line], d, k: 'i' (in line) | 'b' (broadside), p: [the other player's
  // marbles pushed, nearest first], x: true when the last of them goes off the board}
  function gen(b, side, out) {
    out = out || [];
    var o = other(side);
    for (var i = 0; i < N; i++) {
      if (b[i] !== side) continue;
      // in line, with i as the tail
      for (var d = 0; d < 6; d++) {
        var c = [i];
        for (;;) {
          var lead = c[c.length - 1], nx = NB[lead * 6 + d];
          if (nx < 0) break;   // (your own marble can't go off)
          if (b[nx] === 0) { out.push({ c: c.slice(), d: d, k: 'i', p: [], x: false }); break; }
          if (b[nx] === side) { if (c.length < 3) { c.push(nx); continue; } break; }
          // the other player's marbles: a push when there are fewer of them, with room or the edge past them
          var p = [nx], y = NB[nx * 6 + d];
          while (y >= 0 && b[y] === o && p.length < c.length) { p.push(y); y = NB[y * 6 + d]; }
          if (p.length >= c.length) break;
          if (y < 0) out.push({ c: c.slice(), d: d, k: 'i', p: p, x: true });
          else if (b[y] === 0) out.push({ c: c.slice(), d: d, k: 'i', p: p, x: false });
          break;
        }
      }
      // broadside: a line of 2 or 3 starting at i along an axis (E, NE, NW)
      for (var a = 0; a < 3; a++) {
        var j = NB[i * 6 + a];
        if (j < 0 || b[j] !== side) continue;
        var k2 = NB[j * 6 + a], groups = [[i, j]];
        if (k2 >= 0 && b[k2] === side) groups.push([i, j, k2]);
        for (var g = 0; g < groups.length; g++) {
          var G = groups[g];
          for (var e = 0; e < 6; e++) {
            if (e === a || e === a + 3) continue;
            var ok = true;
            for (var m = 0; m < G.length; m++) { var t = NB[G[m] * 6 + e]; if (t < 0 || b[t] !== 0) { ok = false; break; } }
            if (ok) out.push({ c: G.slice(), d: e, k: 'b', p: [], x: false });
          }
        }
      }
    }
    return out;
  }
  function moves(st, side) { return gen(st.b, side || st.turn); }
  function encode(m) { var s = ''; for (var i = 0; i < m.c.length; i++) s += CH.charAt(m.c[i]); return s + m.d; }
  // make and unmake on the board itself (the search), returning what unmake needs
  function make(b, m) {
    if (m.k === 'b') { var side = b[m.c[0]]; for (var i = 0; i < m.c.length; i++) { b[m.c[i]] = 0; } for (i = 0; i < m.c.length; i++) b[NB[m.c[i] * 6 + m.d]] = side; return; }
    var seq = m.p.length ? m.c.concat(m.p) : m.c, last = seq[seq.length - 1], dest = NB[last * 6 + m.d];
    if (dest >= 0) b[dest] = b[last];
    for (var j = seq.length - 2; j >= 0; j--) b[seq[j + 1]] = b[seq[j]];
    b[seq[0]] = 0;
  }
  function unmake(b, m) {
    if (m.k === 'b') { var side = b[NB[m.c[0] * 6 + m.d]]; for (var i = 0; i < m.c.length; i++) b[NB[m.c[i] * 6 + m.d]] = 0; for (i = 0; i < m.c.length; i++) b[m.c[i]] = side; return; }
    var seq = m.p.length ? m.c.concat(m.p) : m.c, last = seq[seq.length - 1], dest = NB[last * 6 + m.d];
    // (a marble that went off was the other player's: the mover's color now stands on the second hole of the line)
    var lastColor = dest >= 0 ? b[dest] : other(b[seq[1]]);
    for (var j = 0; j < seq.length - 1; j++) b[seq[j]] = b[seq[j + 1]];
    b[last] = lastColor;
    if (dest >= 0) b[dest] = 0;
  }
  // where each marble goes: [[from, to (-1 off the board)]]
  function paths(m) {
    var o = [], i;
    if (m.k === 'b') { for (i = 0; i < m.c.length; i++) o.push([m.c[i], NB[m.c[i] * 6 + m.d]]); return o; }
    var seq = m.c.concat(m.p);
    for (i = 0; i < seq.length; i++) o.push([seq[i], NB[seq[i] * 6 + m.d]]);
    return o;
  }
  // a move string to the legal move it names, or null
  function decode(st, str) {
    var list = gen(st.b, st.turn);
    for (var i = 0; i < list.length; i++) if (encode(list[i]) === str) return list[i];
    return null;
  }
  // play a move (a string or a move from moves()) on the state; returns the move played, or null if it isn't legal
  function play(st, mv) {
    if (st.over) return null;
    var str = typeof mv === 'string' ? mv : encode(mv), m = decode(st, str);
    if (!m) return null;
    var side = st.turn;
    make(st.b, m);
    st.n++; st.ml.push(str);
    if (m.p.length) { st.st.push[side]++; if (m.c.length === 3 && m.p.length === 2) st.st.sumito[side]++; }
    if (m.x) { st.off[other(side)]++; st.ej.push(st.n); }
    if (st.off[other(side)] >= 6) { st.over = true; st.winner = side; }
    else st.turn = other(side);
    return m;
  }
  function count(b, side) { var n = 0; for (var i = 0; i < N; i++) if (b[i] === side) n++; return n; }
  function key(b, turn) { var s = ''; for (var i = 0; i < N; i++) s += b[i]; return s + turn; }
  // the board as 9 strings of 'b', 'w' and '.', top row (I) first
  function grid(b) { var rows = ['', '', '', '', '', '', '', '', '']; for (var i = 0; i < N; i++) rows[ROW[i]] += b[i] === 1 ? 'b' : b[i] === 2 ? 'w' : '.'; return rows; }
  function fromGrid(rows) { var b = []; rows.join('').split('').forEach(function (ch) { b.push(ch === 'b' ? 1 : ch === 'w' ? 2 : 0); }); return b; }
  // a move as a person would name it: "Black moved 3 marbles up and to the right, pushing 2 of White's"
  function describe(m, side) {
    var who = side === 1 ? 'Black' : 'White', them = side === 1 ? 'White' : 'Black', n = m.c.length;
    var what = n === 1 ? 'a marble' : n + ' marbles';
    var s = who + ' moved ' + what + (m.k === 'b' ? ' sideways, ' : ' ') + DNAME[m.d];
    if (m.p.length) s += ', pushing ' + (m.p.length === 1 ? 'one of ' + them + '’s marbles' : m.p.length + ' of ' + them + '’s marbles') + (m.x ? ' and one off the board' : '');
    return s;
  }
  // a short notation for the move list: the marbles (a range for two or three) and where they go: "C3 to D4",
  // "C3–C5 to D4" (the lead marble's new hole) for a move in line, "C3–C5 to D4–D6" for a sideways move
  function short(m) {
    var a = NAMES[m.c[0]], z = NAMES[m.c[m.c.length - 1]], who = m.c.length > 1 ? a + '–' + z : a;
    if (m.k === 'b') return who + ' to ' + NAMES[NB[m.c[0] * 6 + m.d]] + '–' + NAMES[NB[m.c[m.c.length - 1] * 6 + m.d]];
    return who + ' to ' + NAMES[NB[m.c[m.c.length - 1] * 6 + m.d]];
  }

  // ── The computer ──
  // A position is weighed from the side to move: marbles off the board count most, then marbles of the other side
  // that can be pushed off this move (the side to move can do it now), its own marbles that could be pushed off
  // next move, how near the middle each side's marbles stand, and how many of its own marbles touch each other.
  var W = { off: 1000, now: 520, risk: 140, center: 12, coh: 5, edge: 9 };
  var CENT = DIST.map(function (d) { return 4 - d; });
  function threatened(b, x) {
    // could marble x (at the edge) be pushed off by the other side in one move?
    var c = b[x], o = other(c);
    for (var d = 0; d < 6; d++) {
      if (NB[x * 6 + d] >= 0) continue;
      var e = opp(d), y = x, cnt = 0, m = 0;
      while (y >= 0 && b[y] === c) { cnt++; y = NB[y * 6 + e]; }
      if (cnt >= 3) continue;
      while (y >= 0 && b[y] === o && m < 3) { m++; y = NB[y * 6 + e]; }
      if (m > cnt) return true;
    }
    return false;
  }
  function evaluate(b, off, side) {
    var o = other(side), s = 0;
    s += W.off * (off[o] - off[side]);
    var cs = 0, co = 0, hs = 0, ho = 0, ts = 0, to = 0, es = 0, eo = 0;
    for (var i = 0; i < N; i++) {
      var v = b[i]; if (!v) continue;
      if (v === side) { cs += CENT[i]; if (DIST[i] === 4) { es++; if (threatened(b, i)) ts++; } }
      else { co += CENT[i]; if (DIST[i] === 4) { eo++; if (threatened(b, i)) to++; } }
      for (var d = 0; d < 3; d++) { var t = NB[i * 6 + d]; if (t >= 0 && b[t] === v) { if (v === side) hs++; else ho++; } }
    }
    s += W.center * (cs - co) + W.coh * (hs - ho) - W.edge * (es - eo);
    s += (to ? W.now + (to - 1) * 60 : 0) - ts * W.risk;
    return s;
  }
  var WIN = 1e6, STOP = {};
  function order(list, b) {
    for (var i = 0; i < list.length; i++) {
      var m = list[i], v = m.x ? 5000 : m.p.length ? 800 + m.p.length * 100 : 0;
      if (!m.x) { var g = 0; for (var j = 0; j < m.c.length; j++) { var t = NB[m.c[j] * 6 + m.d]; g += t >= 0 ? CENT[t] - CENT[m.c[j]] : 0; } v += g * 20 + m.c.length; }
      m.o = v;
    }
    list.sort(function (a, c) { return c.o - a.o; });
    return list;
  }
  // search(b, side, off, {depth, time, noise, seen}) -> {move, score, depth}. seen: position keys already played
  // (a move back into one is weighed down, so the computer doesn't shuffle back and forth)
  function search(b, side, off, o) {
    o = o || {};
    b = b.slice(); off = off.slice();
    var t0 = Date.now(), limit = o.time || 1000, maxD = o.depth || 2, nodes = 0, rnd = o.rnd || Math.random;
    function tick() { if ((++nodes & 1023) === 0 && limit > 0 && Date.now() - t0 > limit) throw STOP; }
    function ab(sd, depth, alpha, beta) {
      tick();
      if (off[other(sd)] >= 6) return WIN;
      if (off[sd] >= 6) return -WIN;
      if (depth <= 0) return evaluate(b, off, sd);
      var ms = order(gen(b, sd), b);
      if (!ms.length) return evaluate(b, off, sd);
      var best = -Infinity;
      for (var i = 0; i < ms.length; i++) {
        var m = ms[i];
        make(b, m); if (m.x) off[other(sd)]++;
        var v = off[other(sd)] >= 6 ? WIN - 10 : -ab(other(sd), depth - 1, -beta, -alpha);
        if (m.x) off[other(sd)]--; unmake(b, m);
        if (v > best) best = v;
        if (v > alpha) alpha = v;
        if (alpha >= beta) break;
      }
      return best;
    }
    var root = order(gen(b, side), b);
    if (!root.length) return null;
    var noise = o.noise || 0, seen = o.seen || null;
    root.forEach(function (m) {
      m.n = (rnd() * 2 - 1) * noise;
      if (seen) { make(b, m); if (seen[key(b, other(side))]) m.n -= 60; unmake(b, m); }
    });
    var best = root[0], bestS = -Infinity, done = 0;
    for (var d = 1; d <= maxD; d++) {
      try {
        var cur = null, curS = -Infinity;
        root.sort(function (a, c) { return (c === best ? 1e9 : (c.v != null ? c.v : c.o)) - (a === best ? 1e9 : (a.v != null ? a.v : a.o)); });
        for (var j = 0; j < root.length; j++) {
          var m = root[j];
          make(b, m); if (m.x) off[other(side)]++;
          var v = off[other(side)] >= 6 ? WIN : -ab(other(side), d - 1, -Infinity, -(cur ? curS - 2 * noise - 61 : -Infinity));
          if (m.x) off[other(side)]--; unmake(b, m);
          m.v = v;
          var vn = v + m.n;
          if (!cur || vn > curS) { cur = m; curS = vn; }
        }
        best = cur; bestS = curS; done = d;
        if (bestS >= WIN - 100) break;
        if (limit > 0 && Date.now() - t0 > limit * 0.45) break;
      } catch (e) {
        if (e !== STOP) throw e;
        break;
      }
    }
    return { move: encode(best), score: bestS, depth: done, nodes: nodes };
  }
  // The three skills differ in how far ahead they look and how much they slip, never in what they can see
  var LEVELS = {
    easy: { depth: 2, time: 0, noise: 70 },
    normal: { depth: 3, time: 0, noise: 15 },
    hard: { depth: 6, time: 1500, noise: 2 }
  };

  function startName(key) { return START[key] ? START[key].name : 'a set'; }
  root.AbaloneCore = {
    startName: startName,
    N: N, CELLS: CELLS, NB: NB, DIRS: DIRS, DIST: DIST, ROW: ROW, NAMES: NAMES, START: START, LEVELS: LEVELS, CH: CH,
    idx: idx, nb: nb, opp: opp, other: other, newGame: newGame, startBoard: startBoard, gen: gen, moves: moves,
    encode: encode, decode: decode, play: play, make: make, unmake: unmake, paths: paths, count: count, key: key,
    grid: grid, fromGrid: fromGrid, describe: describe, short: short, evaluate: evaluate, search: search, threatened: threatened,
    clone: function (o) { return JSON.parse(JSON.stringify(o)); }
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.AbaloneCore;
})(typeof window !== 'undefined' ? window : typeof self !== 'undefined' ? self : globalThis);
