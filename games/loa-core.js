// Lines of Action: the rules and the computer player (window.LOACore, or require() in Node; CLAUDE.md, Lines of Action).
// Plain JSON state, so the same code runs in the page, at the TurnNet table, in the Web Worker and in scripts/loa-sim.js.
//
// The board is 64 numbers, square s = r * 8 + c, r 0 the top row (rank 8) and c 0 the a-file: 1 black, -1 white, 0 empty.
// The rules (Sid Sackson, A Gamut of Games; the Mind Sports Olympiad's rules for the simultaneous connection):
//   - Black on b1-g1 and b8-g8, White on a2-a7 and h2-h7, the corners empty; Black moves first.
//   - A piece moves in a straight line, in any of the 8 directions, exactly as many squares as there are pieces of
//     either color on that whole line, edge to edge, itself counted.
//   - It may jump over its own pieces, never over an enemy piece. It lands on an empty square or on an enemy piece,
//     which is captured; never on its own piece.
//   - A player whose pieces all touch, across or on a diagonal, in one group wins (a single piece is a group).
//   - A move that leaves both players connected (a capture can join the other player's pieces) is a draw, or a win for
//     the player who moved under Sackson's second edition (st.tie 'mover').
//   - A move that joins only the other player's pieces wins for the other player.
//   - A player with no legal move passes; the same position with the same player to move for the third time is a draw.
//
// State: {b, turn, n (moves played), tie: 'draw'|'mover', reps: {key: count}, over, win (1|-1|0 for a draw), why, last}
//   why: 'connect' | 'both' | 'rep' | 'stuck' (neither player can move)
//   last: {f, t, cap, side, n (squares moved), joined (groups the move joined into one)}
(function (root) {
  'use strict';
  var BLACK = 1, WHITE = -1;
  var DIRS = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
  var FILES = 'abcdefgh';

  function startBoard() {
    var b = []; for (var i = 0; i < 64; i++) b.push(0);
    for (var c = 1; c <= 6; c++) { b[c] = BLACK; b[56 + c] = BLACK; }
    for (var r = 1; r <= 6; r++) { b[r * 8] = WHITE; b[r * 8 + 7] = WHITE; }
    return b;
  }
  function sqName(s) { return FILES.charAt(s & 7) + (8 - (s >> 3)); }
  function sqOf(name) { var c = name.charCodeAt(0) - 97, r = 8 - +name.charAt(1); return r * 8 + c; }

  // How many pieces lie on each line: rows, columns, the two diagonals
  function counts(b) {
    var row = [0, 0, 0, 0, 0, 0, 0, 0], col = [0, 0, 0, 0, 0, 0, 0, 0], d1 = [], d2 = [];
    for (var i = 0; i < 15; i++) { d1.push(0); d2.push(0); }
    for (var s = 0; s < 64; s++) if (b[s]) { var r = s >> 3, c = s & 7; row[r]++; col[c]++; d1[r - c + 7]++; d2[r + c]++; }
    return { row: row, col: col, d1: d1, d2: d2 };
  }
  function lineCount(k, s, dr, dc) {
    var r = s >> 3, c = s & 7;
    if (dr === 0) return k.row[r];
    if (dc === 0) return k.col[c];
    if (dr === dc) return k.d1[r - c + 7];
    return k.d2[r + c];
  }
  // The squares of the whole line through s in direction (dr, dc), edge to edge, in order
  function lineSquares(s, dr, dc) {
    var r = s >> 3, c = s & 7;
    while (r - dr >= 0 && r - dr < 8 && c - dc >= 0 && c - dc < 8) { r -= dr; c -= dc; }
    var out = [];
    while (r >= 0 && r < 8 && c >= 0 && c < 8) { out.push(r * 8 + c); r += dr; c += dc; }
    return out;
  }

  // One direction for the piece on s: {d, n, t (landing or -1), ok, why ('edge' | 'enemy' | 'own'), block (square)}
  function ray(b, s, d, k) {
    k = k || counts(b);
    var side = b[s], dr = DIRS[d][0], dc = DIRS[d][1], n = lineCount(k, s, dr, dc);
    var r = (s >> 3) + dr * n, c = (s & 7) + dc * n;
    var out = { d: d, n: n, t: -1, ok: false, why: null, block: -1 };
    if (r < 0 || r > 7 || c < 0 || c > 7) { out.why = 'edge'; return out; }
    for (var i = 1; i < n; i++) {
      var q = ((s >> 3) + dr * i) * 8 + (s & 7) + dc * i;
      if (b[q] === -side) { out.why = 'enemy'; out.block = q; out.t = r * 8 + c; return out; }
    }
    var t = r * 8 + c;
    out.t = t;
    if (b[t] === side) { out.why = 'own'; out.block = t; return out; }
    out.ok = true; out.cap = b[t] === -side;
    return out;
  }
  function rays(b, s) { var k = counts(b), out = []; for (var d = 0; d < 8; d++) out.push(ray(b, s, d, k)); return out; }

  // Every legal move for side: [{f, t, cap}]
  function moves(b, side, k) {
    k = k || counts(b);
    var out = [];
    for (var s = 0; s < 64; s++) {
      if (b[s] !== side) continue;
      var r0 = s >> 3, c0 = s & 7;
      for (var d = 0; d < 8; d++) {
        var dr = DIRS[d][0], dc = DIRS[d][1], n = lineCount(k, s, dr, dc);
        var r = r0 + dr * n, c = c0 + dc * n;
        if (r < 0 || r > 7 || c < 0 || c > 7) continue;
        var t = r * 8 + c;
        if (b[t] === side) continue;
        var ok = true;
        for (var i = 1; i < n; i++) if (b[(r0 + dr * i) * 8 + c0 + dc * i] === -side) { ok = false; break; }
        if (ok) out.push({ f: s, t: t, cap: b[t] === -side });
      }
    }
    return out;
  }
  function legal(b, side, f, t) {
    if (b[f] !== side) return false;
    var ms = moves(b, side);
    for (var i = 0; i < ms.length; i++) if (ms[i].f === f && ms[i].t === t) return ms[i];
    return false;
  }
  function apply(b, m) { var nb = b.slice(); nb[m.t] = nb[m.f]; nb[m.f] = 0; return nb; }

  // The groups of side's pieces (8-connected), largest first: [[squares]]
  function groups(b, side) {
    var seen = {}, out = [];
    for (var s = 0; s < 64; s++) {
      if (b[s] !== side || seen[s]) continue;
      var g = [], st = [s]; seen[s] = 1;
      while (st.length) {
        var q = st.pop(); g.push(q);
        var r = q >> 3, c = q & 7;
        for (var dr = -1; dr <= 1; dr++) for (var dc = -1; dc <= 1; dc++) {
          if (!dr && !dc) continue;
          var rr = r + dr, cc = c + dc; if (rr < 0 || rr > 7 || cc < 0 || cc > 7) continue;
          var x = rr * 8 + cc; if (b[x] === side && !seen[x]) { seen[x] = 1; st.push(x); }
        }
      }
      out.push(g);
    }
    out.sort(function (a, c) { return c.length - a.length; });
    return out;
  }
  function connected(b, side) {
    var first = -1, n = 0;
    for (var s = 0; s < 64; s++) if (b[s] === side) { n++; if (first < 0) first = s; }
    if (n <= 1) return true;
    var seen = {}, st = [first], m = 0; seen[first] = 1;
    while (st.length) {
      var q = st.pop(); m++;
      var r = q >> 3, c = q & 7;
      for (var dr = -1; dr <= 1; dr++) for (var dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        var rr = r + dr, cc = c + dc; if (rr < 0 || rr > 7 || cc < 0 || cc > 7) continue;
        var x = rr * 8 + cc; if (b[x] === side && !seen[x]) { seen[x] = 1; st.push(x); }
      }
    }
    return m === n;
  }
  function pieces(b, side) { var n = 0; for (var s = 0; s < 64; s++) if (b[s] === side) n++; return n; }
  function key(b, turn) { var k = turn === BLACK ? 'B' : 'W'; for (var s = 0; s < 64; s++) k += b[s] === 1 ? 'b' : b[s] === -1 ? 'w' : '.'; return k; }

  // Who has won once side has moved on board b: {win: 1|-1|0, why} or null while the game goes on
  function result(b, side, tie) {
    var me = connected(b, side), them = connected(b, -side);
    if (me && them) return tie === 'mover' ? { win: side, why: 'both' } : { win: 0, why: 'both' };
    if (me) return { win: side, why: 'connect' };
    if (them) return { win: -side, why: 'connect' };
    return null;
  }

  function newGame(o) {
    o = o || {};
    var st = { b: startBoard(), turn: BLACK, n: 0, tie: o.tie === 'mover' ? 'mover' : 'draw', reps: {}, over: false, win: null, why: null, last: null, passes: { '1': 0, '-1': 0 }, ml: [] };
    st.reps[key(st.b, st.turn)] = 1;
    return st;
  }
  // Play the move f -> t on state st (changed in place). Returns the move made ({f, t, cap, side, n, joined, pass}) or null.
  function play(st, f, t) {
    if (st.over) return null;
    var side = st.turn, m = legal(st.b, side, f, t);
    if (!m) return null;
    var g0 = groups(st.b, side).length;
    st.b = apply(st.b, m); st.n++;
    var dist = Math.max(Math.abs((t >> 3) - (f >> 3)), Math.abs((t & 7) - (f & 7)));
    var g1 = groups(st.b, side).length;
    var mv = { f: f, t: t, cap: !!m.cap, side: side, n: dist, joined: g0 - g1 + 1 };
    st.last = mv;
    st.ml.push(sqName(f) + (m.cap ? 'x' : '-') + sqName(t));
    var res = result(st.b, side, st.tie);
    if (res) { st.over = true; st.win = res.win; st.why = res.why; st.turn = -side; return mv; }
    var next = -side;
    if (!moves(st.b, next).length) {
      if (!moves(st.b, side).length) { st.over = true; st.win = 0; st.why = 'stuck'; st.turn = next; return mv; }
      st.passes[next] = (st.passes[next] || 0) + 1; mv.pass = next; next = side;
    }
    st.turn = next;
    var k = key(st.b, st.turn);
    st.reps[k] = (st.reps[k] || 0) + 1;
    if (st.reps[k] >= 3) { st.over = true; st.win = 0; st.why = 'rep'; }
    return mv;
  }

  // ── The computer player: alpha-beta search with a connection evaluation ──
  // The evaluation, for each side: how spread out its pieces are around their center of mass (less is better, against
  // the least spread its number of pieces could have), its quads (2x2 windows counted for the Euler number: fewer
  // holes and gaps means fewer groups), how central its center of mass is, how many groups it has, and its mobility
  // (captures and moves to the middle count more). A robot sees only the board; Easy, Normal and Hard differ in how far
  // they look and how much noise they add.
  var MINSUM = [0, 0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 14];   // least sum of Chebyshev distances to the center for n pieces
  var CEN = []; (function () { for (var s = 0; s < 64; s++) { var r = s >> 3, c = s & 7; CEN.push(-Math.max(Math.abs(r - 3.5), Math.abs(c - 3.5)) + 3.5); } })();
  function sideScore(b, side, k, mob) {
    var n = 0, sr = 0, sc = 0;
    for (var s = 0; s < 64; s++) if (b[s] === side) { n++; sr += s >> 3; sc += s & 7; }
    if (n <= 1) return 5000;
    var mr = sr / n, mc = sc / n, sum = 0, cen = 0;
    for (s = 0; s < 64; s++) if (b[s] === side) {
      sum += Math.max(Math.abs((s >> 3) - mr), Math.abs((s & 7) - mc));
      cen += CEN[s];
    }
    var spread = sum - (MINSUM[Math.min(n, 12)] || n);
    // quads: q1 (one piece in the window), q3 (three) and qd (two on a diagonal); Euler number (q1 - q3 - 2qd) / 4
    var q1 = 0, q3 = 0, qd = 0;
    for (var r = -1; r < 8; r++) for (var c = -1; c < 8; c++) {
      var a = r >= 0 && c >= 0 && b[r * 8 + c] === side ? 1 : 0, bb = r >= 0 && c < 7 && b[r * 8 + c + 1] === side ? 1 : 0,
        cc = r < 7 && c >= 0 && b[(r + 1) * 8 + c] === side ? 1 : 0, dd = r < 7 && c < 7 && b[(r + 1) * 8 + c + 1] === side ? 1 : 0;
      var t = a + bb + cc + dd;
      if (t === 1) q1++; else if (t === 3) q3++; else if (t === 2 && a === dd) qd++;
    }
    var euler = (q1 - q3 - 2 * qd) / 4;
    var com = Math.max(Math.abs(mr - 3.5), Math.abs(mc - 3.5));
    var ng = groups(b, side).length;
    return -spread * 9 - euler * 14 - com * 6 + cen * 0.6 - ng * 6 + mob * 1.2 - (12 - n) * 2;
  }
  function mobility(b, side, k) {
    var ms = moves(b, side, k), v = 0;
    for (var i = 0; i < ms.length; i++) {
      var t = ms[i].t, edge = (t >> 3) === 0 || (t >> 3) === 7 || (t & 7) === 0 || (t & 7) === 7;
      v += (ms[i].cap ? 2 : 1) * (edge ? 0.5 : 1);
    }
    return v;
  }
  function evaluate(b, side) {
    var k = counts(b);
    return sideScore(b, side, k, mobility(b, side, k)) - sideScore(b, -side, k, mobility(b, -side, k));
  }
  function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  var WIN = 100000, STOP = {};
  function search(b, side, o) {
    o = o || {};
    var t0 = Date.now(), limit = o.time || 1000, maxD = o.depth || 3, nodes = 0, tie = o.tie || 'draw';
    var now = o.now || Date.now;
    function tick() { if ((++nodes & 255) === 0 && now() - t0 > limit) throw STOP; }
    // the score of a finished game from the view of the side that just moved... returned from the side to move's view
    function ab(bd, sd, depth, alpha, beta, ply) {
      tick();
      if (depth <= 0) return evaluate(bd, sd);
      var ms = moves(bd, sd);
      if (!ms.length) return -ab(bd, -sd, depth - 1, -beta, -alpha, ply + 1);
      order(bd, ms, ply);
      var best = -Infinity;
      for (var i = 0; i < ms.length; i++) {
        var nb = apply(bd, ms[i]), res = result(nb, sd, tie), v;
        if (res) v = res.win === sd ? WIN - ply : res.win === 0 ? 0 : -WIN + ply;
        else v = -ab(nb, -sd, depth - 1, -beta, -alpha, ply + 1);
        if (v > best) best = v;
        if (v > alpha) alpha = v;
        if (alpha >= beta) { if (HI) { var hk = ms[i].f * 64 + ms[i].t; HI[hk] = (HI[hk] || 0) + depth * depth; KL[ply] = hk; } break; }
      }
      return best;
    }
    // Expert (o.memory) tries first the moves that cut the search short before, at this depth and anywhere: the same
    // search, ordered better, so it reaches further in its time
    var HI = o.memory ? {} : null, KL = [];
    function order(bd, ms, ply) {
      for (var i = 0; i < ms.length; i++) {
        var m = ms[i]; m.o = (m.cap ? 6 : 0) + CEN[m.t] * 2 - CEN[m.f];
        if (HI) { var hk = m.f * 64 + m.t; if (KL[ply] === hk) m.o += 1000; else m.o += Math.min(500, (HI[hk] || 0) / 8); }
      }
      ms.sort(function (a, c) { return c.o - a.o; });
    }
    var root = moves(b, side);
    if (!root.length) return null;
    if (root.length === 1) return { move: { f: root[0].f, t: root[0].t }, score: 0, depth: 0, nodes: 0 };
    var noise = o.noise || 0, rnd = o.rnd || (o.seed != null ? mulberry(o.seed) : Math.random);
    root.forEach(function (m) { m.n = (rnd() * 2 - 1) * noise; });
    // a move that wins at once is taken at once, at every skill
    for (var w = 0; w < root.length; w++) { var rs = result(apply(b, root[w]), side, tie); if (rs && rs.win === side) return { move: { f: root[w].f, t: root[w].t }, score: WIN, depth: 1, nodes: 0 }; }
    order(b, root);
    var best = root[0], bestS = -Infinity, done = 0;
    for (var d = 1; d <= maxD; d++) {
      try {
        var cur = null, curS = -Infinity;
        root.sort(function (a, c) { return (c === best ? 1e9 : typeof c.v === 'number' ? c.v : c.o) - (a === best ? 1e9 : typeof a.v === 'number' ? a.v : a.o); });
        for (var j = 0; j < root.length; j++) {
          var m = root[j], nb = apply(b, m), res = result(nb, side, tie), v;
          if (res) v = res.win === side ? WIN : res.win === 0 ? 0 : -WIN;
          else v = -ab(nb, -side, d - 1, -Infinity, -(cur ? curS - 2 * noise - 1 : -Infinity), 1);
          m.v = v;
          var vn = v + (Math.abs(v) > WIN / 2 ? 0 : m.n);
          if (!cur || vn > curS) { cur = m; curS = vn; }
        }
        best = cur; bestS = curS; done = d;
        if (Math.abs(bestS) > WIN / 2) break;
        if (now() - t0 > limit * 0.45) break;
      } catch (e) { if (e !== STOP) throw e; break; }
    }
    return { move: { f: best.f, t: best.t }, score: bestS, depth: done, nodes: nodes };
  }
  var LEVELS = {
    easy: { depth: 1, time: 300, noise: 120 },
    normal: { depth: 3, time: 900, noise: 10 },
    hard: { depth: 6, time: 2000, noise: 0 },
    expert: { depth: 10, time: 2700, noise: 0, memory: true }
  };

  var API = {
    BLACK: BLACK, WHITE: WHITE, DIRS: DIRS, LEVELS: LEVELS,
    startBoard: startBoard, sqName: sqName, sqOf: sqOf, counts: counts, lineSquares: lineSquares, ray: ray, rays: rays,
    moves: moves, legal: legal, apply: apply, groups: groups, connected: connected, pieces: pieces, key: key,
    result: result, newGame: newGame, play: play, evaluate: evaluate, search: search
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.LOACore = API;
})(typeof self !== 'undefined' ? self : this);
