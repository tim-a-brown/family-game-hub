// Blokus: the rules and the computer players (window.BlokusCore, or require() in Node; CLAUDE.md, Blokus).
// Plain JSON state, so the same code runs in the page, at the TurnNet table, in the computer's Web Worker and in
// scripts/blokus-sim.js. Blokus was designed by Bernard Tavitian and is published by Mattel Games.
//
// The board is 20 by 20 squares, cell x = r * 20 + c (r 0 the top row, c 0 the left column; A1 the top left, T20 the
// bottom right). Four colors play in the order Blue, Yellow, Red, Green (1 to 4), Blue from the top left corner, Yellow
// the top right, Red the bottom right and Green the bottom left. Each color has the same 21 pieces (PIECES: 1 square,
// 1 of 2, 2 of 3, 5 of 4 and 12 of 5: 89 squares). The rules (Mattel's):
//   - A color's first piece covers its corner square.
//   - Every later piece touches at least one piece of its own color corner to corner, and never along a side. Touching
//     other colors along a side is fine. Pieces can be turned and flipped over.
//   - A color with no piece that fits is out for the rest of the game (the board only fills, so it can never fit again).
//   - The game ends when no color can play. Each color scores -1 for each square left in its tray, +15 for placing all
//     21 pieces, and 5 more (+20 in all) when the single square was its last piece.
//   - Two players: each plays two colors (Blue and Red, Yellow and Green), and their two scores are added. Three players:
//     Blue, Yellow and Red are theirs, and Green is shared: its turns go to each player in turn, and its score counts for
//     nobody. Four players: one color each.
//
// State: {np (players), own: [_, p, p, p, p] (the player who owns each color; -1 the shared color), sh (shared turns
//   taken), b: [400] (0 empty, else the color), turn (the color to move), left: [_, mask x4] (21 bits, the pieces still
//   in each tray), out: [_, 0|1 x4], lastP: [_, piece x4] (each color's last piece, -1 none), ml: ['f2k7', ...] (every
//   piece placed, in order: piece letter, orientation, cell in base 36), n, over, sc: [_, score x4], psc: [score per
//   player], win: [players with the best score], last: {c, m, cells}}
// A move is an integer (p * 8 + o) * 400 + a: piece p (0..20), orientation o of ORI[p], a the cell of the top left of
// the orientation's box.
(function (root) {
  'use strict';
  var N = 20, H = 400;
  var NAMES = ['Blue', 'Yellow', 'Red', 'Green'];
  var START = [0, 0, 19, 399, 380];
  // the 21 pieces, smallest first: id, how people call them, cells [r, c]
  var PIECES = [
    { id: 'I1', name: 'the single square', s: [[0, 0]] },
    { id: 'I2', name: 'the two-square piece', s: [[0, 0], [0, 1]] },
    { id: 'I3', name: 'the straight three', s: [[0, 0], [0, 1], [0, 2]] },
    { id: 'V3', name: 'the bent three', s: [[0, 0], [1, 0], [1, 1]] },
    { id: 'I4', name: 'the straight four', s: [[0, 0], [0, 1], [0, 2], [0, 3]] },
    { id: 'L4', name: 'the L of four', s: [[0, 0], [1, 0], [2, 0], [2, 1]] },
    { id: 'T4', name: 'the T of four', s: [[0, 0], [0, 1], [0, 2], [1, 1]] },
    { id: 'O4', name: 'the square of four', s: [[0, 0], [0, 1], [1, 0], [1, 1]] },
    { id: 'S4', name: 'the S of four', s: [[0, 1], [0, 2], [1, 0], [1, 1]] },
    { id: 'F', name: 'the F', s: [[0, 1], [0, 2], [1, 0], [1, 1], [2, 1]] },
    { id: 'I5', name: 'the straight five', s: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]] },
    { id: 'L5', name: 'the L of five', s: [[0, 0], [1, 0], [2, 0], [3, 0], [3, 1]] },
    { id: 'N', name: 'the N', s: [[0, 1], [1, 1], [2, 0], [2, 1], [3, 0]] },
    { id: 'P', name: 'the P', s: [[0, 0], [0, 1], [1, 0], [1, 1], [2, 0]] },
    { id: 'T5', name: 'the T of five', s: [[0, 0], [0, 1], [0, 2], [1, 1], [2, 1]] },
    { id: 'U', name: 'the U', s: [[0, 0], [0, 2], [1, 0], [1, 1], [1, 2]] },
    { id: 'V5', name: 'the V', s: [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2]] },
    { id: 'W', name: 'the W', s: [[0, 0], [1, 0], [1, 1], [2, 1], [2, 2]] },
    { id: 'X', name: 'the X', s: [[0, 1], [1, 0], [1, 1], [1, 2], [2, 1]] },
    { id: 'Y', name: 'the Y', s: [[0, 1], [1, 0], [1, 1], [2, 1], [3, 1]] },
    { id: 'Z', name: 'the Z', s: [[0, 0], [0, 1], [1, 1], [2, 1], [2, 2]] }
  ];
  var NP = PIECES.length, FULL = (1 << NP) - 1, LET = 'abcdefghijklmnopqrstu';
  var SIZE = PIECES.map(function (p) { return p.s.length; });
  var TOTAL = SIZE.reduce(function (a, b) { return a + b; }, 0);   // 89

  // ── Orientations: every way a piece can lie (turned and flipped), each once ──
  function norm(cells) {
    var mr = Infinity, mc = Infinity;
    cells.forEach(function (q) { mr = Math.min(mr, q[0]); mc = Math.min(mc, q[1]); });
    return cells.map(function (q) { return [q[0] - mr, q[1] - mc]; }).sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
  }
  function keyOf(cells) { return cells.map(function (q) { return q[0] + ',' + q[1]; }).join(';'); }
  function rot(cells) { return norm(cells.map(function (q) { return [q[1], -q[0]]; })); }      // a quarter turn clockwise
  function flp(cells) { return norm(cells.map(function (q) { return [q[0], -q[1]]; })); }      // over, left to right
  // ORI[p]: [{c: [[r, c]], h, w, k: key}], ROT[p][o] and FLIP[p][o]: the orientation after a turn or a flip
  var ORI = [], ROT = [], FLIP = [];
  PIECES.forEach(function (pc, p) {
    var list = [], seen = {}, cur = norm(pc.s);
    for (var f = 0; f < 2; f++) {
      for (var k = 0; k < 4; k++) {
        var key = keyOf(cur);
        if (!seen[key]) {
          seen[key] = 1;
          var h = 0, w = 0; cur.forEach(function (q) { h = Math.max(h, q[0] + 1); w = Math.max(w, q[1] + 1); });
          list.push({ c: cur, h: h, w: w, k: key });
        }
        cur = rot(cur);
      }
      cur = flp(cur);
    }
    var idx = {}; list.forEach(function (o, i) { idx[o.k] = i; });
    ORI.push(list);
    ROT.push(list.map(function (o) { return idx[keyOf(rot(o.c))]; }));
    FLIP.push(list.map(function (o) { return idx[keyOf(flp(o.c))]; }));
  });

  function rowOf(x) { return (x / N) | 0; }
  function colOf(x) { return x % N; }
  function cellName(x) { return 'ABCDEFGHIJKLMNOPQRST'.charAt(x % N) + (((x / N) | 0) + 1); }
  function enc(p, o, a) { return (p * 8 + o) * H + a; }
  function dec(m) { var po = (m / H) | 0; return { p: (po / 8) | 0, o: po % 8, a: m % H }; }
  // the cells a move covers, or null when it runs off the board
  function cellsOf(m) {
    var d = dec(m), O = ORI[d.p] && ORI[d.p][d.o]; if (!O) return null;
    var ar = rowOf(d.a), ac = colOf(d.a);
    if (ar + O.h > N || ac + O.w > N) return null;
    return O.c.map(function (q) { return (ar + q[0]) * N + ac + q[1]; });
  }
  function code(m) { var d = dec(m); return LET.charAt(d.p) + d.o + (d.a < 36 ? '0' : '') + d.a.toString(36); }
  function uncode(s) {
    s = String(s || ''); if (s.length !== 4) return -1;
    var p = LET.indexOf(s.charAt(0)), o = +s.charAt(1), a = parseInt(s.slice(2), 36);
    if (p < 0 || !(o >= 0) || !ORI[p][o] || !(a >= 0 && a < H)) return -1;
    return enc(p, o, a);
  }

  // ── The rules ──
  function newGame(np) {
    np = np === 2 || np === 3 ? np : 4;
    var own = np === 4 ? [-1, 0, 1, 2, 3] : np === 2 ? [-1, 0, 1, 0, 1] : [-1, 0, 1, 2, -1];
    var b = []; for (var i = 0; i < H; i++) b.push(0);
    return { np: np, own: own, sh: 0, b: b, turn: 1, left: [0, FULL, FULL, FULL, FULL], out: [0, 0, 0, 0, 0], lastP: [-1, -1, -1, -1, -1],
      ml: [], n: 0, over: false, sc: [0, 0, 0, 0, 0], psc: [], win: [], last: null };
  }
  // the player who moves color c now
  function ctrl(st, c) { var o = st.own[c]; return o >= 0 ? o : st.sh % st.np; }
  function shared(st, c) { return st.own[c] < 0; }
  function first(st, c) { return st.left[c] === FULL; }
  function has(st, c, p) { return (st.left[c] >> p & 1) === 1; }
  function squaresLeft(st, c) { var s = 0; for (var p = 0; p < NP; p++) if (has(st, c, p)) s += SIZE[p]; return s; }
  function piecesLeft(st, c) { var n = 0; for (var p = 0; p < NP; p++) if (has(st, c, p)) n++; return n; }
  // open[x]: a square color c may cover (empty, and no side touching its own color)
  function openMap(b, c) {
    var ok = new Uint8Array(H);
    for (var x = 0; x < H; x++) {
      if (b[x]) continue;
      var r = (x / N) | 0, cc = x % N;
      if (r > 0 && b[x - N] === c || r < N - 1 && b[x + N] === c || cc > 0 && b[x - 1] === c || cc < N - 1 && b[x + 1] === c) continue;
      ok[x] = 1;
    }
    return ok;
  }
  // the squares where color c can start a piece: open, and touching its own color corner to corner (its corner square
  // before its first piece)
  function corners(b, c, firstMove, ok) {
    ok = ok || openMap(b, c);
    if (firstMove) return ok[START[c]] ? [START[c]] : [];
    var out = [];
    for (var x = 0; x < H; x++) {
      if (!ok[x]) continue;
      var r = (x / N) | 0, cc = x % N;
      if (r > 0 && (cc > 0 && b[x - N - 1] === c || cc < N - 1 && b[x - N + 1] === c) || r < N - 1 && (cc > 0 && b[x + N - 1] === c || cc < N - 1 && b[x + N + 1] === c)) out.push(x);
    }
    return out;
  }
  function cornersOf(st, c) { return corners(st.b, c, first(st, c)); }
  // every legal move for color c: [m], each once (only pieces in pieceMask when given)
  function genMoves(b, c, left, firstMove, pieceMask) {
    var ok = openMap(b, c), cs = corners(b, c, firstMove, ok), out = [], seen = {};
    if (!cs.length) return out;
    var mask = pieceMask == null ? left : left & pieceMask;
    for (var p = 0; p < NP; p++) {
      if (!(mask >> p & 1)) continue;
      var os = ORI[p];
      for (var o = 0; o < os.length; o++) {
        var O = os[o], cl = O.c, L = cl.length;
        for (var i = 0; i < cs.length; i++) {
          var cr = (cs[i] / N) | 0, ccol = cs[i] % N;
          for (var k = 0; k < L; k++) {
            var ar = cr - cl[k][0], ac = ccol - cl[k][1];
            if (ar < 0 || ac < 0 || ar + O.h > N || ac + O.w > N) continue;
            var a = ar * N + ac, m = (p * 8 + o) * H + a;
            if (seen[m]) continue;
            var fits = true;
            for (var j = 0; j < L; j++) if (!ok[(ar + cl[j][0]) * N + ac + cl[j][1]]) { fits = false; break; }
            seen[m] = 1;
            if (fits) out.push(m);
          }
        }
      }
    }
    return out;
  }
  function moves(st, c, pieceMask) { c = c || st.turn; if (st.over || st.out[c]) return []; return genMoves(st.b, c, st.left[c], first(st, c), pieceMask); }
  // why a placement of color c is not legal: null when it is ('off', 'taken', 'side', 'corner', 'start', 'used')
  function why(st, c, m) {
    var d = dec(m), cl = cellsOf(m);
    if (!cl) return 'off';
    if (!has(st, c, d.p)) return 'used';
    var ok = openMap(st.b, c), touch = false, b = st.b;
    for (var i = 0; i < cl.length; i++) {
      var x = cl[i];
      if (b[x]) return 'taken';
      if (!ok[x]) return 'side';
    }
    if (first(st, c)) return cl.indexOf(START[c]) >= 0 ? null : 'start';
    for (i = 0; i < cl.length; i++) {
      var r = rowOf(cl[i]), cc = colOf(cl[i]);
      [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(function (dd) { var rr = r + dd[0], c2 = cc + dd[1]; if (rr >= 0 && rr < N && c2 >= 0 && c2 < N && b[rr * N + c2] === c) touch = true; });
    }
    return touch ? null : 'corner';
  }
  function legal(st, m, c) { return !st.over && why(st, c || st.turn, m) === null; }
  var ORDER = [0, 2, 3, 4, 1];   // the color after each color
  // After a move: on to the next color that can play; a color that can't is out for good ('pass' events)
  function advance(st) {
    var passes = [], c = st.turn;
    for (var k = 0; k < 4; k++) {
      c = ORDER[c];
      if (st.out[c]) continue;
      if (!st.left[c] || !moves(st, c).length) { st.out[c] = 1; passes.push(c); continue; }
      st.turn = c;
      return passes;
    }
    // (every color is out)
    finish(st);
    return passes;
  }
  // The score of each color and each player; the winners
  function score(st, c) {
    var s = -squaresLeft(st, c);
    if (!st.left[c]) s += st.lastP[c] === 0 ? 20 : 15;
    return s;
  }
  function finish(st) {
    st.over = true;
    var psc = []; for (var p = 0; p < st.np; p++) psc.push(0);
    for (var c = 1; c <= 4; c++) { st.sc[c] = score(st, c); if (st.own[c] >= 0) psc[st.own[c]] += st.sc[c]; }
    st.psc = psc;
    var best = Math.max.apply(null, psc);
    st.win = []; psc.forEach(function (v, i) { if (v === best) st.win.push(i); });
  }
  // Place move m for the color to move. Returns {c, m, p, cells, passes: [colors now out], first, all (all 21 placed),
  // mono (the single square last)} or null when it isn't legal.
  function play(st, m) {
    if (st.over) return null;
    var c = st.turn; if (st.out[c]) return null;
    if (why(st, c, m) !== null) return null;
    var d = dec(m), cl = cellsOf(m), wasFirst = first(st, c);
    cl.forEach(function (x) { st.b[x] = c; });
    st.left[c] &= ~(1 << d.p);
    st.lastP[c] = d.p;
    st.ml.push(code(m)); st.n++;
    if (shared(st, c)) st.sh++;
    st.last = { c: c, m: m, cells: cl };
    var all = !st.left[c];
    var passes = advance(st);
    return { c: c, m: m, p: d.p, cells: cl, passes: passes, first: wasFirst, all: all, mono: all && d.p === 0 };
  }
  // the whole game again from its moves (the history's replay, an online table's check): [states after each move]
  function replay(list, np) {
    var st = newGame(np), out = [JSON.parse(JSON.stringify(st))];
    for (var i = 0; i < list.length; i++) { var m = uncode(list[i]); if (m < 0 || !play(st, m)) return null; out.push(JSON.parse(JSON.stringify(st))); }
    return out;
  }

  // ── The computer ──
  // Who a color is to the player moving now: 1 their own, -1 another player's, 0 the shared color (nobody's score)
  function rel(st, mover, c) { if (st.own[c] < 0) return 0; return st.own[c] === mover ? 1 : -1; }
  // Room round a corner: open squares (for c) within two steps of it, counted once
  function reach(b, c, cs, ok) {
    var seen = new Uint8Array(H), n = 0;
    cs.forEach(function (x) {
      var r = rowOf(x), cc = colOf(x);
      for (var dr = -2; dr <= 2; dr++) for (var dc = -2; dc <= 2; dc++) {
        if (Math.abs(dr) + Math.abs(dc) > 3) continue;
        var rr = r + dr, c2 = cc + dc; if (rr < 0 || rr >= N || c2 < 0 || c2 >= N) continue;
        var y = rr * N + c2; if (!seen[y] && ok[y]) { seen[y] = 1; n++; }
      }
    });
    return n;
  }
  // A color's prospects: its corners, the room round them and (deep) how many placements it has
  function outlook(st, b, c, deep) {
    if (st.out[c]) return { k: 0, r: 0, mob: 0 };
    var ok = openMap(b, c), cs = corners(b, c, st.left[c] === FULL, ok);
    var o = { k: cs.length, r: reach(b, c, cs, ok), mob: 0 };
    if (deep && cs.length) o.mob = genMoves(b, c, st.left[c], st.left[c] === FULL).length;
    return o;
  }
  var CENTER = 9.5;
  // A quick weighing of move m for the color to move: size, new corners, others' corners taken, reaching the middle early
  function quick(st, m, ctx) {
    var c = st.turn, d = dec(m), cl = cellsOf(m), b = st.b, sz = cl.length, v = sz * ctx.wSize;
    var mine = {}, k;
    for (k = 0; k < cl.length; k++) mine[cl[k]] = 1;
    // new corners this piece makes for its own color
    var nc = 0, seen = {};
    for (k = 0; k < cl.length; k++) {
      var r = rowOf(cl[k]), cc = colOf(cl[k]);
      for (var dr = -1; dr <= 1; dr += 2) for (var dc = -1; dc <= 1; dc += 2) {
        var rr = r + dr, c2 = cc + dc; if (rr < 0 || rr >= N || c2 < 0 || c2 >= N) continue;
        var y = rr * N + c2; if (seen[y] || mine[y] || b[y]) continue;
        seen[y] = 1;
        // it stays a corner only if no square of this color (old or new) touches it along a side
        var bad = false;
        [[rr - 1, c2], [rr + 1, c2], [rr, c2 - 1], [rr, c2 + 1]].forEach(function (q) { if (q[0] >= 0 && q[0] < N && q[1] >= 0 && q[1] < N) { var z = q[0] * N + q[1]; if (b[z] === c || mine[z]) bad = true; } });
        if (!bad && !ctx.myK[y]) nc++;
      }
    }
    v += nc * ctx.wCorner;
    // the corners of other colors this piece covers (and its own it uses up)
    for (k = 0; k < cl.length; k++) {
      var z = cl[k];
      for (var c3 = 1; c3 <= 4; c3++) if (c3 !== c && ctx.ck[c3][z]) v -= ctx.rl[c3] * ctx.wBlock * (ctx.rl[c3] < 0 ? 1 : 0.5);
    }
    // early on, the pieces head for the middle of the board
    if (ctx.early) {
      var far = 0; for (k = 0; k < cl.length; k++) far += Math.abs(rowOf(cl[k]) - CENTER) + Math.abs(colOf(cl[k]) - CENTER);
      v -= far / sz * ctx.wMid;
    }
    // keep the single square for last when it can be played anywhere (the +5)
    if (d.p === 0 && piecesLeft(st, c) > 1) v -= ctx.wMono;
    return v;
  }
  function ctxFor(st, L) {
    var c = st.turn, mover = ctrl(st, c), ck = [null], rl = [0], myK = {};
    for (var c2 = 1; c2 <= 4; c2++) {
      var m = {}; if (!st.out[c2]) cornersOf(st, c2).forEach(function (x) { m[x] = 1; });
      ck.push(m); rl.push(c2 === c ? 1 : rel(st, mover, c2));
    }
    myK = ck[c];
    var placed = 0; for (var x = 0; x < H; x++) if (st.b[x] === c) placed++;
    return { ck: ck, rl: rl, myK: myK, mover: mover, early: placed < 22,
      wSize: L.wSize, wCorner: L.wCorner, wBlock: L.wBlock, wMid: L.wMid, wMono: L.wMono };
  }
  // The deep look (Hard): the board after the move, every color's outlook weighed by who it is to the mover
  function deep(st, m, L) {
    var c = st.turn, mover = ctrl(st, c), cl = cellsOf(m), b = st.b.slice(), left = st.left.slice();
    cl.forEach(function (x) { b[x] = c; });
    left[c] &= ~(1 << dec(m).p);
    var tmp = { b: b, left: left, out: st.out, own: st.own, sh: st.sh, np: st.np };
    var v = cl.length * L.dSize;
    for (var c2 = 1; c2 <= 4; c2++) {
      if (st.out[c2]) continue;
      var w = c2 === c ? 1 : rel(st, mover, c2); if (!w) continue;
      var o = outlook(tmp, b, c2, true);
      var val = Math.sqrt(o.mob) * L.dMob + o.k * L.dCorner + o.r * L.dReach;
      if (o.mob === 0 && left[c2]) val -= L.dDead + squaresOf(left[c2]) * 1.5;
      v += w > 0 ? val : -val * L.dOpp;
    }
    return v;
  }
  // The look past the answer (Expert): the move, then the next color's best answer to it as that color sees it (its
  // best few placements by the quick weighing, each weighed by the deep look), and the board after both weighed again
  function deep2(st, m, L) {
    var base = deep(st, m, L), tmp = JSON.parse(JSON.stringify(st)), mover = ctrl(st, st.turn);
    if (!play(tmp, m) || tmp.over) return base;
    var c2 = tmp.turn; if (rel(st, mover, c2) > 0) return base;
    var rs = moves(tmp, c2); if (!rs.length) return base + L.dDead;
    var cx = ctxFor(tmp, L), sc = rs.map(function (r) { return { r: r, v: quick(tmp, r, cx) }; });
    sc.sort(function (a, b2) { return b2.v - a.v; });
    var bestR = -Infinity;
    for (var i = 0; i < Math.min(L.reply, sc.length); i++) bestR = Math.max(bestR, deep(tmp, sc[i].r, L) + sc[i].v * L.dQuick);
    return base - L.dReply * bestR;
  }
  function squaresOf(mask) { var s = 0; for (var p = 0; p < NP; p++) if (mask >> p & 1) s += SIZE[p]; return s; }
  function now() { return typeof performance !== 'undefined' ? performance.now() : Date.now(); }
  // Choose a move for the color to move. o: a level from LEVELS (or its fields), seed. Returns {move} or null (no move).
  function search(st, o) {
    o = o || LEVELS.normal;
    var seed = (o.seed >>> 0) || 1, rnd = function () { seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    var ms = moves(st, st.turn);
    if (!ms.length) return null;
    var L = Object.assign({}, LEVELS.normal, o);
    // Easy: a random piece it can play, a little more often a large one, put down at a random place it fits
    if (L.level === 'easy') {
      var byP = {}; ms.forEach(function (m) { var p = dec(m).p; (byP[p] = byP[p] || []).push(m); });
      var ps = Object.keys(byP).map(Number), tot = 0, wts = ps.map(function (p) { var w = Math.pow(SIZE[p], L.easyPow); tot += w; return w; });
      var pick = rnd() * tot, i = 0; while (pick > wts[i] && i < ps.length - 1) { pick -= wts[i]; i++; }
      var list = byP[ps[i]];
      // half the time it does look for the spot with the most room
      if (rnd() < L.easyLook) { var ctx0 = ctxFor(st, L); list.sort(function (a, b2) { return quick(st, b2, ctx0) - quick(st, a, ctx0); }); return { move: list[0] }; }
      return { move: list[Math.floor(rnd() * list.length)] };
    }
    var ctx = ctxFor(st, L), t0 = now();
    var scored = ms.map(function (m) { return { m: m, v: quick(st, m, ctx) + (rnd() * 2 - 1) * L.noise }; });
    scored.sort(function (a, b2) { return b2.v - a.v; });
    if (!L.deep) return { move: scored[0].m };
    var top = scored.slice(0, L.wide), best = top[0], bv = -Infinity;
    for (var j = 0; j < top.length; j++) {
      var v = (L.reply ? deep2(st, top[j].m, L) : deep(st, top[j].m, L)) + top[j].v * L.dQuick;
      if (v > bv) { bv = v; best = top[j]; }
      if (now() - t0 > L.time) break;
    }
    return { move: best.m };
  }
  var LEVELS = {
    easy: { level: 'easy', easyPow: 0.8, easyLook: 0.12, wSize: 3, wCorner: 1.2, wBlock: 1.5, wMid: 0.25, wMono: 6, noise: 0 },
    normal: { level: 'normal', wSize: 3, wCorner: 1.3, wBlock: 1.6, wMid: 0.3, wMono: 8, noise: 1.2, deep: false },
    hard: { level: 'hard', wSize: 3, wCorner: 1.3, wBlock: 1.6, wMid: 0.3, wMono: 8, noise: 0.5, deep: true, wide: 14, time: 1500,
      dSize: 3.2, dMob: 0.9, dCorner: 0.9, dReach: 0.12, dOpp: 0.55, dDead: 25, dQuick: 0.4 },
    // Expert: Hard's look after the move, and then past the next color's best answer to it
    expert: { level: 'expert', wSize: 3, wCorner: 1.3, wBlock: 1.6, wMid: 0.3, wMono: 8, noise: 0, deep: true, wide: 12, time: 2400,
      dSize: 3.2, dMob: 0.9, dCorner: 0.9, dReach: 0.12, dOpp: 0.55, dDead: 25, dQuick: 0.4, reply: 4, dReply: 0.5 }
  };

  var API = {
    N: N, H: H, NAMES: NAMES, START: START, PIECES: PIECES, NP: NP, FULL: FULL, SIZE: SIZE, TOTAL: TOTAL, ORI: ORI, ROT: ROT, FLIP: FLIP, LET: LET, LEVELS: LEVELS, ORDER: ORDER,
    rowOf: rowOf, colOf: colOf, cellName: cellName, enc: enc, dec: dec, cellsOf: cellsOf, code: code, uncode: uncode,
    newGame: newGame, ctrl: ctrl, shared: shared, first: first, has: has, squaresLeft: squaresLeft, piecesLeft: piecesLeft,
    openMap: openMap, corners: corners, cornersOf: cornersOf, genMoves: genMoves, moves: moves, why: why, legal: legal,
    play: play, score: score, finish: finish, replay: replay, outlook: outlook, search: search, squaresOf: squaresOf
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.BlokusCore = API;
})(typeof self !== 'undefined' ? self : this);
