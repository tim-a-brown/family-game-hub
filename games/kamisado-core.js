// ═══════════════════════════════════════════════════════════════════════════
// Kamisado: the rules and the computer players, in plain JSON state. The same code runs in the page
// (games/kamisado.html), at an online table (TurnNet: each move is made inside the table's transaction), in a Web
// Worker for the computer's search, and in Node (scripts/kamisado-sim.js plays thousands of games with it).
// Kamisado was designed by Peter Burley and is published by Burley Games (included with his written permission).
// The rules follow Yucata's rules, adapted from the publisher's (Huch! / Burley Games); the official Burley Games text
// may still come.
//
// Movement (M1 to M8):
//   An 8 by 8 board of eight colors (orange, blue, purple, pink, yellow, red, green, brown); every row and every column
//   has each color once (BOARD below, the published arrangement: an orange square in each player's near right corner).
//   Each player has eight towers, one of each color, on their home row; in the first round each stands on the square of
//   its own color. The first round's first move is Black's, with any tower.
//   A tower moves any number of squares straight forward or diagonally forward, never sideways or backward, never
//   through or onto another tower; it may pass diagonally between two towers that touch corner to corner (M4).
//   After that, each player must move their tower of the color of the square the other player's last tower landed on,
//   at least one square if it can move at all (M5).
//   A tower that must move and can't is blocked: it moves zero squares on its own square, and the other player moves
//   again, with their tower of the color of that square (M6).
//   Deadlock (M8): when blocked towers send the turn round with nobody able to move, the player who made the last move
//   before it loses the round, and the winner's tower of the color of the square that last move ended on is promoted.
//
// Rounds and Sumo towers:
//   A tower that reaches any square of the other player's home row wins the round and is promoted: an ordinary tower
//   becomes a Sumo (1 point), a Sumo a Double Sumo (3 points), a Double a Triple Sumo (7 points), a Triple a Quadruple
//   Sumo (15 points). A match is played to 1, 3, 7 or 15 points. The loser of each round starts the next one.
//   A Sumo moves at most 5 squares, a Double 3, a Triple 1.
//   Sumo push: a Sumo that must move, with the other player's towers straight in front of it (never diagonally), may move
//   one square forward and push them one square back: a Sumo pushes one tower, a Double up to two, a Triple up to three,
//   only towers of a lower rank, only the other player's, and only onto an empty square behind the last one (so a tower
//   on its own home row can't be pushed off the board). After a push the other player misses their turn and the pusher
//   moves again, with their tower of the color of the square the last pushed tower now stands on. A push is a choice
//   when there are other moves; when it is the only move, it must be made.
//   Regroup between rounds: the round's winner (the Defender) chooses to fill from the left or from the right, and both
//   fill the same way. Filling from the left, each player takes their towers row by row, starting at their own home row
//   and going toward the other player, and within a row left to right as seen from their own seat, and puts them on
//   their home row from the brown square at their left across to the orange square at their right. From the right:
//   within a row right to left, placed from the orange square at the right across to brown.
//
// Squares: 64, index r * 8 + c, row 0 at the top of the board (White's home row) to row 7 (Black's home row), column 0
// at the left as Black sits. A square's name is its file a to h and rank 1 to 8 from Black's home row: a1 is the bottom
// left square (brown), h1 the bottom right (orange). Pieces: 0 empty; Black's tower of color k is 1 + k (1 to 8),
// White's is 9 + k (9 to 16).
//
// State (all plain JSON):
//   v, b [64], rk [17] (each piece's rank: 0 ordinary, 1 Sumo, 2 Double, 3 Triple, 4 Quadruple), turn (1 Black |
//   2 White), req (the color of the tower the side to move must move, or -1 on a round's first move), phase ('play' |
//   'regroup' | 'done'), def (the Defender while regrouping), n (towers moved in the match), ml [this round's moves:
//   'c1-c5', 'd4-d5*' (a push), 'pass' (a blocked tower moved zero squares)], last ([from, to] or null), over (the
//   match is over), winner (the match's winner), why (how the last round ended: 'home' | 'deadlock'), first (who
//   started this round), blocks [_, b, w] (times each side left the other's tower with nowhere to go), pushes [_, b, w],
//   long [_, b, w] (longest move), match {target, round, pts [_, b, w]}, rounds [{w, why, p, rk, pts, n, ml, fill,
//   first, g0 (the board the round began from, as grid's 64 letters), k0 (the 16 ranks then)}] (each round played),
//   fill ('L' | 'R' | '' this round's set-up), b0 and rk0 (the board and ranks the round began from)
// ═══════════════════════════════════════════════════════════════════════════
(function (root) {
  'use strict';
  var BLACK = 1, WHITE = 2;
  var COLORS = ['orange', 'blue', 'purple', 'pink', 'yellow', 'red', 'green', 'brown'];
  var COLOR_NAMES = ['Orange', 'Blue', 'Purple', 'Pink', 'Yellow', 'Red', 'Green', 'Brown'];
  var RANKS = ['Tower', 'Sumo', 'Double Sumo', 'Triple Sumo', 'Quadruple Sumo'];
  var RANGE = [7, 5, 3, 1, 1];
  var POINTS = [1, 3, 7, 15, 15];          // the points a promotion from each rank scores
  var TARGETS = [1, 3, 7, 15];
  // the published board, row 0 (White's home row) at the top
  var BOARD = [
    [0, 1, 2, 3, 4, 5, 6, 7],
    [5, 0, 3, 6, 1, 4, 7, 2],
    [6, 3, 0, 5, 2, 7, 4, 1],
    [3, 2, 1, 0, 7, 6, 5, 4],
    [4, 5, 6, 7, 0, 1, 2, 3],
    [1, 4, 7, 2, 5, 0, 3, 6],
    [2, 7, 4, 1, 6, 3, 0, 5],
    [7, 6, 5, 4, 3, 2, 1, 0]
  ];
  var SQ = [], NAMES = [];
  for (var r0 = 0; r0 < 8; r0++) for (var c0 = 0; c0 < 8; c0++) { SQ.push(BOARD[r0][c0]); NAMES.push('abcdefgh'.charAt(c0) + (8 - r0)); }
  function idx(name) { return NAMES.indexOf(String(name).toLowerCase()); }
  function other(s) { return 3 - s; }
  function piece(side, k) { return side === BLACK ? 1 + k : 9 + k; }
  function sideOf(p) { return p ? (p <= 8 ? BLACK : WHITE) : 0; }
  function colorOf(p) { return (p - 1) % 8; }
  function dir(side) { return side === BLACK ? -1 : 1; }
  function goalRow(side) { return side === BLACK ? 0 : 7; }
  function homeRow(side) { return side === BLACK ? 7 : 0; }
  function colorName(s) { return s === BLACK ? 'Black' : 'White'; }

  function newGame(o) {
    var b = [], rk = []; for (var i = 0; i < 64; i++) b.push(0);
    for (i = 0; i <= 16; i++) rk.push(0);
    for (var c = 0; c < 8; c++) { b[56 + c] = piece(BLACK, BOARD[7][c]); b[c] = piece(WHITE, BOARD[0][c]); }
    var t = o && TARGETS.indexOf(+o.target) >= 0 ? +o.target : 1;
    return { v: 2, b: b, rk: rk, turn: BLACK, req: -1, phase: 'play', def: 0, n: 0, ml: [], last: null, over: false, winner: 0, why: '', first: BLACK,
      blocks: [0, 0, 0], pushes: [0, 0, 0], long: [0, 0, 0], match: { target: t, round: 1, pts: [0, 0, 0] }, rounds: [], fill: '', b0: b.slice(), rk0: rk.slice() };
  }
  function find(b, p) { return b.indexOf(p); }
  // the squares the tower on sq can move to (its rank's range), nearest first along each of its three lines
  function targets(b, rk, sq) {
    var p = b[sq], s = sideOf(p), dr = dir(s), out = [], r = sq >> 3, c = sq & 7, R = RANGE[rk[p] || 0];
    for (var dc = -1; dc <= 1; dc++) {
      var rr = r + dr, cc = c + dc, k = 0;
      while (k < R && rr >= 0 && rr < 8 && cc >= 0 && cc < 8 && !b[rr * 8 + cc]) { out.push(rr * 8 + cc); rr += dr; cc += dc; k++; }
    }
    return out;
  }
  // how many towers the Sumo on sq could push straight ahead now (0: no push)
  function pushOf(b, rk, sq) {
    var p = b[sq], R = rk[p] || 0; if (R < 1) return 0;
    var s = sideOf(p), dr = dir(s), r = sq >> 3, c = sq & 7, k = 0, rr = r + dr;
    while (rr >= 0 && rr < 8 && b[rr * 8 + c]) {
      var q = b[rr * 8 + c];
      if (sideOf(q) === s || (rk[q] || 0) >= R) return 0;
      k++; rr += dr;
    }
    if (!k || k > R || rr < 0 || rr > 7) return 0;
    return k;
  }
  // the towers the side to move may move now
  function movers(st) {
    if (st.over || st.phase !== 'play') return [];
    if (st.req < 0) { var o = []; for (var i = 0; i < 64; i++) if (sideOf(st.b[i]) === st.turn) o.push(i); return o; }
    var at = find(st.b, piece(st.turn, st.req));
    return at >= 0 ? [at] : [];
  }
  // every move a tower on f may make now: [{f, t, push}] (a push only for the tower that must move)
  function movesFrom(st, f) {
    var out = targets(st.b, st.rk, f).map(function (t) { return { f: f, t: t, push: 0 }; });
    if (st.req >= 0) { var k = pushOf(st.b, st.rk, f); if (k) out.push({ f: f, t: f + dir(sideOf(st.b[f])) * 8, push: k }); }
    return out;
  }
  function legal(st) { var out = []; movers(st).forEach(function (f) { out = out.concat(movesFrom(st, f)); }); return out; }
  function encode(f, t, push) { return NAMES[f] + '-' + NAMES[t] + (push ? '*' : ''); }
  function parse(str) {
    var m = /^([a-h][1-8])-([a-h][1-8])(\*?)$/.exec(String(str || '').toLowerCase());
    return m ? { f: idx(m[1]), t: idx(m[2]), push: m[3] === '*' } : null;
  }
  function check(st, str) {
    if (st.over) return null;
    if (st.phase === 'regroup') return /^fill [LR]$/.test(str) ? { fill: str.charAt(5) } : null;
    var m = parse(str); if (!m) return null;
    if (movers(st).indexOf(m.f) < 0) return null;
    var ok = movesFrom(st, m.f).filter(function (x) { return x.t === m.t && !!x.push === m.push; })[0];
    return ok || null;
  }
  function dist(f, t) { return Math.abs((t >> 3) - (f >> 3)); }
  function canMove(st, at) { return targets(st.b, st.rk, at).length > 0 || (st.req >= 0 && pushOf(st.b, st.rk, at) > 0); }
  // The side to move must move the tower of st.req. Blocked towers move zero squares and the turn goes back with the
  // color under the blocked tower; a loop is a deadlock, lost by `mover`, who made the last move. Returns the passes.
  function resolve(st, mover) {
    var passes = [], seen = {};
    seen[st.turn * 8 + st.req] = 1;
    for (var guard = 0; guard < 40; guard++) {
      var at = find(st.b, piece(st.turn, st.req));
      if (at < 0 || canMove(st, at)) return passes;
      passes.push({ side: st.turn, sq: at });
      st.ml.push('pass'); st.blocks[other(st.turn)]++;
      st.turn = other(st.turn); st.req = SQ[at];
      var key = st.turn * 8 + st.req;
      if (seen[key]) return passes.concat([{ deadlock: true }]);
      seen[key] = 1;
    }
    return passes;
  }
  // a round won by side with tower p: p is promoted and scores
  function endRound(st, side, p, why, res) {
    var old = st.rk[p] || 0, pts = POINTS[old];
    st.rk[p] = Math.min(4, old + 1); st.match.pts[side] += pts; st.why = why;
    st.rounds.push({ w: side, why: why, p: p, rk: st.rk[p], pts: pts, g0: grid(st.b0).join(''), k0: st.rk0.slice(1).join(''), n: st.ml.filter(function (x) { return x !== 'pass'; }).length, ml: st.ml.join(','), fill: st.fill, first: st.first });
    res.promo = { p: p, rk: st.rk[p], pts: pts, side: side };
    if (st.match.pts[side] >= st.match.target || st.rk[p] >= 4) { st.over = true; st.winner = side; st.phase = 'done'; res.matchOver = true; }
    else { st.phase = 'regroup'; st.def = side; st.turn = side; st.req = -1; }
  }
  // the home rows after a regroup: fill 'L' or 'R' from the board b; returns the new board
  function regroup(b, fill) {
    var nb = []; for (var i = 0; i < 64; i++) nb.push(0);
    [BLACK, WHITE].forEach(function (s) {
      var rows = s === BLACK ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];
      // left to right as seen from the player's own seat: Black's left is column 0, White's is column 7
      var ltr = s === BLACK ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0], cols = fill === 'R' ? ltr.slice().reverse() : ltr;
      var order = [];
      rows.forEach(function (r) { cols.forEach(function (c) { var p = b[r * 8 + c]; if (sideOf(p) === s) order.push(p); }); });
      var h = homeRow(s);
      order.forEach(function (p, j) { nb[h * 8 + cols[j]] = p; });
    });
    return nb;
  }
  // play a move string on the state; returns {f, t, side, d, k, push, pushed [[from, to]...], forced, passes, win,
  // deadlock, promo, matchOver} or {fill} for a regroup, or null if it isn't legal
  function play(st, str) {
    var m = check(st, str); if (!m) return null;
    if (m.fill) {
      st.b = regroup(st.b, m.fill); st.fill = m.fill;
      var loser = other(st.def);
      st.phase = 'play'; st.turn = loser; st.first = loser; st.req = -1; st.ml = []; st.last = null; st.def = 0; st.match.round++;
      st.b0 = st.b.slice(); st.rk0 = st.rk.slice();
      return { fill: m.fill, side: other(loser) };
    }
    var side = st.turn, p = st.b[m.f], d = dist(m.f, m.t), res = { f: m.f, t: m.t, side: side, d: d, k: colorOf(p), push: m.push, pushed: [], passes: [], win: false, deadlock: false };
    if (m.push) {
      var dr = dir(side) * 8;
      for (var i = m.push; i >= 1; i--) { var from = m.f + dr * i, to = from + dr; st.b[to] = st.b[from]; st.b[from] = 0; res.pushed.unshift([from, to]); }
      st.b[m.t] = p; st.b[m.f] = 0; st.pushes[side]++;
    } else { st.b[m.t] = p; st.b[m.f] = 0; }
    st.n++; st.ml.push(encode(m.f, m.t, m.push)); st.last = [m.f, m.t];
    if (d > st.long[side]) st.long[side] = d;
    if (!m.push && (m.t >> 3) === goalRow(side)) { res.win = true; endRound(st, side, p, 'home', res); return res; }
    // after a push the other player misses a turn: the pusher moves again, with the color under the last tower pushed
    var land = m.push ? res.pushed[res.pushed.length - 1][1] : m.t;
    st.turn = m.push ? side : other(side); st.req = SQ[land]; res.forced = st.req;
    res.passes = resolve(st, side);
    if (res.passes.length && res.passes[res.passes.length - 1].deadlock) {
      res.passes.pop(); res.deadlock = true;
      var w = other(side);
      endRound(st, w, piece(w, SQ[m.t]), 'deadlock', res);
    }
    return res;
  }
  // a round replayed from where it began: {st, steps: [{s (move string), res}]} (passes are made by play itself)
  function replay(g0, k0, first, ml, target) {
    var st = newGame({ target: target || 15 });
    st.b = typeof g0 === 'string' ? fromGrid(g0.match(/.{8}/g)) : typeof g0[0] === 'number' ? g0.slice() : fromGrid(g0);
    if (Array.isArray(k0)) st.rk = k0.slice(); else String(k0 || '').split('').forEach(function (d, i) { st.rk[i + 1] = +d || 0; });
    st.turn = first || BLACK; st.first = st.turn; st.b0 = st.b.slice(); st.rk0 = st.rk.slice();
    var start = { b: st.b.slice(), rk: st.rk.slice() }, steps = [];
    (Array.isArray(ml) ? ml : String(ml || '').split(',')).forEach(function (m) {
      if (!m || m === 'pass' || st.phase !== 'play') return;
      var side = st.turn, res = play(st, m); if (res) steps.push({ s: m, side: side, res: res, b: st.b.slice() });
    });
    return { st: st, start: start, steps: steps };
  }
  // a tower's open lanes: the goal-row squares it could reach in one move
  function lanes(b, rk, sq) { var s = sideOf(b[sq]), g = goalRow(s); return targets(b, rk, sq).filter(function (t) { return (t >> 3) === g; }); }
  // the board as 8 strings, top row first: '.' empty, a to h Black's towers by color (a orange ... h brown), A to H White's
  function grid(b) { var rows = []; for (var r = 0; r < 8; r++) { var s = ''; for (var c = 0; c < 8; c++) { var p = b[r * 8 + c]; s += !p ? '.' : String.fromCharCode((p <= 8 ? 97 : 65) + colorOf(p)); } rows.push(s); } return rows; }
  function fromGrid(rows) { var b = []; rows.join('').split('').forEach(function (ch) { var lo = ch.charCodeAt(0) - 97, up = ch.charCodeAt(0) - 65; b.push(ch === '.' ? 0 : lo >= 0 && lo < 8 ? 1 + lo : 9 + up); }); return b; }
  function towerName(p, rk) { var r = rk ? rk[p] || 0 : 0; return COLOR_NAMES[colorOf(p)] + (r ? ' ' + RANKS[r] : ' tower'); }

  // ── The computer ──
  // Negamax with alpha-beta over the moves of the one tower that must move (every tower on a round's first move),
  // pushes included. A position is weighed from the side to move: each tower's open lanes to the goal row (a lane is a
  // win the moment that tower has to move), the other side's that much worse; Sumo towers, more the higher; how far the
  // towers have come; and how many squares the tower that must move can reach. Blocked towers pass and deadlocks are
  // played out exactly as the rules say. A round's win is the end of the search (a promotion is worth the round).
  var WIN = 100000, STOP = {};
  function search(b0, rk, side, req, o) {
    o = o || {};
    var b = b0.slice(), pos = [], t0 = Date.now(), limit = o.time || 0, maxD = o.depth || 3, nodes = 0, rnd = o.rnd || Math.random;
    // Easy now and then looks only at its own move, not at the tower it hands the other player (o.slip of its moves)
    if (o.slip && rnd() < o.slip) maxD = 1;
    for (var p0 = 0; p0 <= 16; p0++) pos.push(-1);
    for (var i0 = 0; i0 < 64; i0++) if (b[i0]) pos[b[i0]] = i0;
    function tick() { if ((++nodes & 1023) === 0 && limit > 0 && Date.now() - t0 > limit) throw STOP; }
    function tg(sq, out) {
      var p = b[sq], dr = p <= 8 ? -1 : 1, r = sq >> 3, c = sq & 7, n = 0, R = RANGE[rk[p]];
      for (var dc = -1; dc <= 1; dc++) { var rr = r + dr, cc = c + dc, k = 0; while (k < R && rr >= 0 && rr < 8 && cc >= 0 && cc < 8 && !b[rr * 8 + cc]) { out[n++] = rr * 8 + cc; rr += dr; cc += dc; k++; } }
      return n;
    }
    function laneCount(sq) {
      var p = b[sq], dr = p <= 8 ? -1 : 1, r = sq >> 3, c = sq & 7, n = 0, g = p <= 8 ? 0 : 7, R = RANGE[rk[p]];
      if (Math.abs(g - r) > R) return 0;
      for (var dc = -1; dc <= 1; dc++) { var rr = r + dr, cc = c + dc, ok = true; while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) { if (b[rr * 8 + cc]) { ok = false; break; } if (rr === g) break; rr += dr; cc += dc; } if (ok && rr === g && cc >= 0 && cc < 8) n++; }
      return n;
    }
    var tmp = new Int16Array(24);
    function evaluate(s, rq) {
      var e = 0;
      for (var p = 1; p <= 16; p++) {
        var sq = pos[p]; if (sq < 0) continue;
        var mine = (p <= 8 ? BLACK : WHITE) === s, ln = laneCount(sq), adv = p <= 8 ? 7 - (sq >> 3) : (sq >> 3);
        var v = ln * 34 + adv * 2 + rk[p] * 6;
        e += mine ? v : -v * 1.1;
      }
      var at = pos[s === BLACK ? 1 + rq : 9 + rq];
      if (at >= 0) e += tg(at, tmp) * 1.5;
      return e;
    }
    // a push of k towers by the tower on f (side s): make and unmake; returns the square the last one now stands on
    function doPush(f, k, s) { var dr = s === BLACK ? -8 : 8; for (var i = k; i >= 1; i--) { var a = f + dr * i, q = b[a]; b[a + dr] = q; b[a] = 0; pos[q] = a + dr; } var pc = b[f]; b[f + dr] = pc; b[f] = 0; pos[pc] = f + dr; return f + dr * (k + 1); }
    function unPush(f, k, s) { var dr = s === BLACK ? -8 : 8, pc = b[f + dr]; b[f] = pc; b[f + dr] = 0; pos[pc] = f; for (var i = 1; i <= k; i++) { var a = f + dr * (i + 1), q = b[a]; b[a - dr] = q; b[a] = 0; pos[q] = a - dr; } }
    function pushK(f) { return pushOf(b, rk, f); }
    // ab(s, rq): value for s, who must move tower color rq (-1: any). mover: the side whose move came last.
    function ab(s, rq, depth, alpha, beta, ply, mover, chain) {
      tick();
      var list = [], out = new Int16Array(24), froms = [];
      if (rq < 0) { for (var k = 0; k < 8; k++) froms.push(pos[s === BLACK ? 1 + k : 9 + k]); }
      else froms.push(pos[s === BLACK ? 1 + rq : 9 + rq]);
      var g = s === BLACK ? 0 : 7;
      for (var i = 0; i < froms.length; i++) {
        var f = froms[i]; if (f < 0) continue;
        var m = tg(f, out);
        for (var j = 0; j < m; j++) { if ((out[j] >> 3) === g) return WIN - ply; list.push(f * 64 + out[j]); }
        if (rq >= 0) { var pk = pushK(f); if (pk) list.push(-(f * 8 + pk) - 1); }
      }
      if (!list.length) {
        // blocked: the tower moves zero squares; a loop is lost by the side whose move came last
        var at = froms[0], key = other(s) * 8 + SQ[at];
        if (chain.indexOf(key) >= 0) return s === mover ? -(WIN - ply) : WIN - ply;
        return -ab(other(s), SQ[at], depth, -beta, -alpha, ply, mover, chain.concat([key]));
      }
      if (depth <= 0) return evaluate(s, rq);
      var sc = [];
      for (i = 0; i < list.length; i++) {
        var mv = list[i];
        if (mv < 0) { sc.push({ m: mv, g: 50 }); continue; }
        var ff = mv >> 6, tt = mv & 63, pc = b[ff];
        b[tt] = pc; b[ff] = 0; pos[pc] = tt;
        var opp = pos[s === BLACK ? 9 + SQ[tt] : 1 + SQ[tt]], bad = opp >= 0 ? laneCount(opp) : 0;
        b[ff] = pc; b[tt] = 0; pos[pc] = ff;
        sc.push({ m: mv, g: -bad * 100 + Math.abs((tt >> 3) - (ff >> 3)) });
      }
      sc.sort(function (x, y) { return y.g - x.g; });
      var best = -Infinity;
      for (i = 0; i < sc.length; i++) {
        var mv2 = sc[i].m, v;
        if (mv2 < 0) {
          var code = -mv2 - 1, pf = code >> 3, kk = code & 7, last = doPush(pf, kk, s);
          v = ab(s, SQ[last], depth - 1, alpha, beta, ply + 1, s, [s * 8 + SQ[last]]);
          unPush(pf, kk, s);
        } else {
          var f2 = mv2 >> 6, t2 = mv2 & 63, pc2 = b[f2];
          b[t2] = pc2; b[f2] = 0; pos[pc2] = t2;
          v = -ab(other(s), SQ[t2], depth - 1, -beta, -alpha, ply + 1, s, [other(s) * 8 + SQ[t2]]);
          b[f2] = pc2; b[t2] = 0; pos[pc2] = f2;
        }
        if (v > best) best = v;
        if (v > alpha) alpha = v;
        if (alpha >= beta) break;
      }
      return best;
    }
    var st = { b: b, rk: rk, turn: side, req: req, over: false, phase: 'play' };
    var root = legal(st).map(function (m) { return { m: m, v: null, n: 0 }; });
    if (!root.length) return null;
    var g = goalRow(side);
    for (var i = 0; i < root.length; i++) if (!root[i].m.push && (root[i].m.t >> 3) === g) return { move: encode(root[i].m.f, root[i].m.t), score: WIN, depth: 0, nodes: 1 };
    var noise = o.noise || 0;
    root.forEach(function (x) { x.n = (rnd() * 2 - 1) * noise; });
    var best = root[Math.floor(rnd() * root.length)], done = 0;
    for (var d = 1; d <= maxD; d++) {
      try {
        var cur = null, curS = -Infinity;
        root.sort(function (a, c) { return (c === best ? 1e12 : (c.v || 0)) - (a === best ? 1e12 : (a.v || 0)); });
        for (var j = 0; j < root.length; j++) {
          var x = root[j], v;
          if (x.m.push) {
            var last = doPush(x.m.f, x.m.push, side);
            v = ab(side, SQ[last], d - 1, -Infinity, Infinity, 1, side, [side * 8 + SQ[last]]);
            unPush(x.m.f, x.m.push, side);
          } else {
            var pc = b[x.m.f];
            b[x.m.t] = pc; b[x.m.f] = 0; pos[pc] = x.m.t;
            v = -ab(other(side), SQ[x.m.t], d - 1, -Infinity, -(cur ? curS - 2 * noise - 1 : -Infinity), 1, side, [other(side) * 8 + SQ[x.m.t]]);
            b[x.m.f] = pc; b[x.m.t] = 0; pos[pc] = x.m.f;
          }
          x.v = v;
          if (!cur || v + x.n > curS) { cur = x; curS = v + x.n; }
        }
        best = cur; done = d;
        if (Math.abs(best.v) >= WIN - 200) break;
        if (limit > 0 && Date.now() - t0 > limit * 0.45) break;
      } catch (e) { if (e !== STOP) throw e; break; }
    }
    return { move: encode(best.m.f, best.m.t, best.m.push), score: best.v, depth: done, nodes: nodes };
  }
  // The Defender's choice of fill: the set-up where the Challenger's best first move is worth least to them
  function chooseFill(b, rk, def, o) {
    o = o || {};
    var res = ['L', 'R'].map(function (f) {
      var nb = regroup(b, f), r = search(nb, rk, other(def), -1, { depth: o.depth || 3, time: o.time ? o.time / 2 : 0, noise: 0, rnd: o.rnd });
      return { f: f, v: (r ? r.score : 0) + (o.noise ? ((o.rnd || Math.random)() * 2 - 1) * o.noise : 0) };
    });
    return res[0].v <= res[1].v ? 'L' : 'R';
  }
  // The four skills differ in how far ahead they look and how much they slip, never in what they can see
  var LEVELS = {
    easy: { depth: 2, time: 0, noise: 50, slip: 0.3 },
    normal: { depth: 5, time: 0, noise: 4 },
    hard: { depth: 30, time: 1500, noise: 0 },
    expert: { depth: 40, time: 2700, noise: 0 }
  };

  root.KamisadoCore = {
    BLACK: BLACK, WHITE: WHITE, COLORS: COLORS, COLOR_NAMES: COLOR_NAMES, RANKS: RANKS, RANGE: RANGE, POINTS: POINTS, TARGETS: TARGETS,
    BOARD: BOARD, SQ: SQ, NAMES: NAMES, LEVELS: LEVELS, WIN: WIN,
    idx: idx, other: other, piece: piece, sideOf: sideOf, colorOf: colorOf, goalRow: goalRow, homeRow: homeRow, colorName: colorName,
    newGame: newGame, find: find, targets: targets, pushOf: pushOf, movers: movers, movesFrom: movesFrom, legal: legal,
    encode: encode, parse: parse, check: check, play: play, regroup: regroup, lanes: lanes, grid: grid, fromGrid: fromGrid,
    towerName: towerName, search: search, replay: replay, chooseFill: chooseFill,
    clone: function (o) { return JSON.parse(JSON.stringify(o)); }
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.KamisadoCore;
})(typeof window !== 'undefined' ? window : typeof self !== 'undefined' ? self : globalThis);
