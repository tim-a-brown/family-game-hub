// ═══════════════════════════════════════════════════════════════════════════
// Shogi's rules and the computer's play (window.ShogiCore, module.exports in Node, and a Web Worker when loaded as
// one: postMessage({id, pos, opts}) answers {id, res: search(pos, opts)}). Plain JSON state; no DOM.
//
// The rules (Wikipedia's Shogi article; checked against the JSA's rules for the details below):
//   9x9 board. Black (sente) moves first and sits at the bottom; White (gote) at the top.
//   Squares: index r*9 + c, r 0 the top row (rank a), c 0 the left column (file 9 from Black's side).
//   Pieces: 1 Pawn, 2 Lance, 3 Knight, 4 Silver, 5 Gold, 6 Bishop, 7 Rook, 8 King; promoted = type + 8 (9 Tokin,
//   10 promoted Lance, 11 promoted Knight, 12 promoted Silver, 14 Horse, 15 Dragon). Black's are positive, White's
//   negative. Hands: hb / hw, arrays of 8 counts indexed by type 1..7 (0 unused). Captured pieces change sides
//   unpromoted. A promotion is optional on a move that starts in, ends in or passes through the farthest three
//   ranks, and forced for a Pawn or Lance reaching the last rank and a Knight the last two. Drops: any empty square,
//   never promoted, never where the piece could never move again, never a second unpromoted Pawn on a file (nifu),
//   never a Pawn drop that mates at once (uchifuzume). No move may leave your own King in check; a side with no legal
//   move has lost (there is no stalemate). The same position (board, hands, side to move) four times is a draw,
//   unless one side gave check with every move of theirs in that cycle: that side loses (perpetual check).
//   Impasse: the 27-point declaration as 81Dojo uses it (King in the enemy camp, not in check, 10 other pieces in the
//   enemy camp, 28 points as Black or 27 as White, Rook and Bishop 5 and the rest 1, counting the hand), and the
//   24-point count by agreement (fewer than 24 loses; both 24 or more is a draw).
//
// Moves are integers: from | to << 7 | promote << 14, with from = 81 + type for a drop.
// pos  = {b: [81], hb: [8], hw: [8], turn: 1 | -1}
// game = {pos, n (plies), keys: [position hashes, one per position from the start], ck: one letter a ply, B or b for
//         Black's move with or without check, W or w for White's, ml: [Western notation, one per ply], last: {m, f, t, d, cap, pr} | null, over: null | {w, why}}
// ═══════════════════════════════════════════════════════════════════════════
(function (root) {
  'use strict';
  var PW = 1, LN = 2, KN = 3, SV = 4, GD = 5, BS = 6, RK = 7, KG = 8;
  var LETTER = ['', 'P', 'L', 'N', 'S', 'G', 'B', 'R', 'K', '+P', '+L', '+N', '+S', '', '+B', '+R', ''];
  var NAME = ['', 'Pawn', 'Lance', 'Knight', 'Silver', 'Gold', 'Bishop', 'Rook', 'King', 'Tokin', 'Promoted Lance', 'Promoted Knight', 'Promoted Silver', '', 'Horse', 'Dragon'];
  var PROMOTES = [0, 1, 1, 1, 1, 0, 1, 1, 0];
  function base(t) { return t > 8 ? t - 8 : t; }

  // moves of each kind, drawn from Black's side (dr -1 is forward)
  var ORTH = [[-1, 0], [1, 0], [0, -1], [0, 1]], DIAG = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  var GOLDS = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, 0]];
  var STEPS = [], SLIDES = [];
  STEPS[PW] = [[-1, 0]]; STEPS[LN] = []; STEPS[KN] = [[-2, -1], [-2, 1]]; STEPS[SV] = [[-1, -1], [-1, 0], [-1, 1], [1, -1], [1, 1]];
  STEPS[GD] = GOLDS; STEPS[BS] = []; STEPS[RK] = []; STEPS[KG] = ORTH.concat(DIAG);
  STEPS[9] = STEPS[10] = STEPS[11] = STEPS[12] = GOLDS; STEPS[14] = ORTH; STEPS[15] = DIAG; STEPS[13] = [];
  for (var t0 = 1; t0 <= 15; t0++) SLIDES[t0] = [];
  SLIDES[LN] = [[-1, 0]]; SLIDES[BS] = DIAG; SLIDES[RK] = ORTH; SLIDES[14] = DIAG; SLIDES[15] = ORTH;
  // bit masks of the 3x3 neighborhood for the attack test: bit (dr+1)*3 + (dc+1), Black's side
  var SMASK = [], RMASK = [];
  for (var t1 = 0; t1 <= 15; t1++) {
    SMASK[t1] = 0; RMASK[t1] = 0;
    (STEPS[t1] || []).forEach(function (d) { if (Math.abs(d[0]) <= 1) SMASK[t1] |= 1 << ((d[0] + 1) * 3 + d[1] + 1); });
    (SLIDES[t1] || []).forEach(function (d) { RMASK[t1] |= 1 << ((d[0] + 1) * 3 + d[1] + 1); });
  }
  // targets per side (0 Black, 1 White), type and square
  var STEP_T = [[], []], RAY_T = [[], []];
  (function () {
    for (var si = 0; si < 2; si++) {
      var f = si === 0 ? 1 : -1;
      for (var t = 1; t <= 15; t++) {
        STEP_T[si][t] = []; RAY_T[si][t] = [];
        for (var s = 0; s < 81; s++) {
          var r = (s / 9) | 0, c = s % 9, st = [], rays = [];
          (STEPS[t] || []).forEach(function (d) { var rr = r + d[0] * f, cc = c + d[1]; if (rr >= 0 && rr < 9 && cc >= 0 && cc < 9) st.push(rr * 9 + cc); });
          (SLIDES[t] || []).forEach(function (d) { var ray = [], rr = r + d[0] * f, cc = c + d[1]; while (rr >= 0 && rr < 9 && cc >= 0 && cc < 9) { ray.push(rr * 9 + cc); rr += d[0] * f; cc += d[1]; } if (ray.length) rays.push(ray); });
          STEP_T[si][t][s] = st; RAY_T[si][t][s] = rays;
        }
      }
    }
  })();
  var DIR8 = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];

  function inZone(side, r) { return side > 0 ? r <= 2 : r >= 6; }
  // the last rank(s) a piece can never move from (from the mover's side)
  function deadEnd(t, side, r) {
    var rr = side > 0 ? r : 8 - r;
    return ((t === PW || t === LN) && rr === 0) || (t === KN && rr <= 1);
  }

  // ── Internal board: Int8Array(81) b, Int8Array(16) h (Black's 0..7, White's 8..15), kings k[0] Black, k[1] White
  function W(pos) {
    var b = new Int8Array(81), h = new Int8Array(16), k = [-1, -1];
    for (var i = 0; i < 81; i++) { b[i] = pos.b[i]; if (pos.b[i] === KG) k[0] = i; else if (pos.b[i] === -KG) k[1] = i; }
    for (var t = 1; t <= 7; t++) { h[t] = pos.hb[t] || 0; h[8 + t] = pos.hw[t] || 0; }
    return { b: b, h: h, k: k, side: pos.turn };
  }
  function attacked(b, sq, by) {
    var r = (sq / 9) | 0, c = sq % 9, i, rr, cc, p, t, bit;
    // knights: a knight of `by` at sq + (2*by, ±1)
    rr = r + 2 * by;
    if (rr >= 0 && rr < 9) {
      if (c > 0 && b[rr * 9 + c - 1] === KN * by) return true;
      if (c < 8 && b[rr * 9 + c + 1] === KN * by) return true;
    }
    for (i = 0; i < 8; i++) {
      var dr = DIR8[i][0], dc = DIR8[i][1];
      rr = r + dr; cc = c + dc;
      if (rr < 0 || rr > 8 || cc < 0 || cc > 8) continue;
      p = b[rr * 9 + cc];
      // seen from the attacker, the step from it to sq is (-dr, -dc), in Black's terms (-dr*by, -dc)
      bit = 1 << ((-dr * by + 1) * 3 + (-dc + 1));
      if (p) {
        if (p * by > 0) { t = p * by; if ((SMASK[t] & bit) || (RMASK[t] & bit)) return true; }
        continue;
      }
      rr += dr; cc += dc;
      while (rr >= 0 && rr < 9 && cc >= 0 && cc < 9) {
        p = b[rr * 9 + cc];
        if (p) { if (p * by > 0 && (RMASK[p * by] & bit)) return true; break; }
        rr += dr; cc += dc;
      }
    }
    return false;
  }
  function inCheckW(w, side) { var k = w.k[side > 0 ? 0 : 1]; return k >= 0 && attacked(w.b, k, -side); }

  // pseudo-legal moves (may leave the King in check; drops already obey the drop rules except uchifuzume)
  function addMv(out, from, to, t, side, opt) {
    var rf = (from / 9) | 0, rt = (to / 9) | 0;
    if (t <= 8 && PROMOTES[t] && (inZone(side, rf) || inZone(side, rt))) {
      out.push(from | (to << 7) | (1 << 14));
      if (!deadEnd(t, side, rt) && !(opt && (t === PW || t === BS || t === RK))) out.push(from | (to << 7));
    } else out.push(from | (to << 7));
  }
  // opt: leave out not promoting a Pawn, Bishop or Rook that could (never better; the search's shortcut)
  function pseudo(w, side, out, capsOnly, opt) {
    var b = w.b, si = side > 0 ? 0 : 1, s, i, j, p, t, q, to;
    for (s = 0; s < 81; s++) {
      p = b[s]; if (p * side <= 0) continue;
      t = p * side;
      var st = STEP_T[si][t][s];
      for (i = 0; i < st.length; i++) { to = st[i]; q = b[to]; if (q * side > 0) continue; if (capsOnly && !q) continue; addMv(out, s, to, t, side, opt); }
      var rays = RAY_T[si][t][s];
      for (i = 0; i < rays.length; i++) {
        var ray = rays[i];
        for (j = 0; j < ray.length; j++) {
          to = ray[j]; q = b[to];
          if (q * side > 0) break;
          if (!(capsOnly && !q)) addMv(out, s, to, t, side, opt);
          if (q) break;
        }
      }
    }
    if (capsOnly) return out;
    var hb = side > 0 ? 0 : 8, h = w.h, pf = null;
    for (t = 1; t <= 7; t++) {
      if (!h[hb + t]) continue;
      if (t === PW) { pf = [0, 0, 0, 0, 0, 0, 0, 0, 0]; for (s = 0; s < 81; s++) if (b[s] === PW * side) pf[s % 9] = 1; }
      for (s = 0; s < 81; s++) {
        if (b[s]) continue;
        if (deadEnd(t, side, (s / 9) | 0)) continue;
        if (t === PW && pf[s % 9]) continue;
        out.push((81 + t) | (s << 7));
      }
    }
    return out;
  }
  function make(w, m) {
    var from = m & 127, to = (m >> 7) & 127, pr = (m >> 14) & 1, side = w.side, b = w.b, cap = 0, t;
    if (from >= 81) { t = from - 81; b[to] = t * side; w.h[(side > 0 ? 0 : 8) + t]--; }
    else {
      var p = b[from]; t = p * side; cap = b[to];
      b[from] = 0; b[to] = (t + (pr ? 8 : 0)) * side;
      if (cap) { var ct = base(cap * -side); if (ct !== KG) w.h[(side > 0 ? 0 : 8) + ct]++; }
      if (t === KG) w.k[side > 0 ? 0 : 1] = to;
    }
    w.side = -side;
    return cap;
  }
  function unmake(w, m, cap) {
    var from = m & 127, to = (m >> 7) & 127, pr = (m >> 14) & 1, side = -w.side, b = w.b, t;
    w.side = side;
    if (from >= 81) { t = from - 81; b[to] = 0; w.h[(side > 0 ? 0 : 8) + t]++; }
    else {
      t = b[to] * side - (pr ? 8 : 0);
      b[from] = t * side; b[to] = cap;
      if (cap) { var ct = base(cap * -side); if (ct !== KG) w.h[(side > 0 ? 0 : 8) + ct]--; }
      if (t === KG) w.k[side > 0 ? 0 : 1] = from;
    }
  }
  // a Pawn drop straight in front of the enemy King: it may not leave that King with no move (uchifuzume)
  function pawnDropCheck(w, m, side) {
    var from = m & 127; if (from !== 81 + PW) return false;
    var to = (m >> 7) & 127, k = w.k[side > 0 ? 1 : 0];
    return k === to - 9 * side;
  }
  function hasLegal(w, depth) {
    var side = w.side, ms = pseudo(w, side, [], false, false);
    // King moves and captures first: the quickest to find in a mating net
    for (var i = 0; i < ms.length; i++) {
      var m = ms[i], cap = make(w, m), ok = !inCheckW(w, side);
      if (ok && depth < 2 && pawnDropCheck(w, m, side) && !hasLegal(w, depth + 1)) ok = false;
      unmake(w, m, cap);
      if (ok) return true;
    }
    return false;
  }
  function legalW(w, opt) {
    var side = w.side, ms = pseudo(w, side, [], false, opt), out = [];
    for (var i = 0; i < ms.length; i++) {
      var m = ms[i], cap = make(w, m), ok = !inCheckW(w, side);
      if (ok && pawnDropCheck(w, m, side) && !hasLegal(w, 1)) ok = false;
      unmake(w, m, cap);
      if (ok) out.push(m);
    }
    return out;
  }

  // ── The public position functions ─────────────────────────────────────────
  function start() {
    var b = [], i;
    for (i = 0; i < 81; i++) b.push(0);
    var back = [LN, KN, SV, GD, KG, GD, SV, KN, LN];
    for (i = 0; i < 9; i++) { b[i] = -back[i]; b[72 + i] = back[i]; b[18 + i] = -PW; b[54 + i] = PW; }
    // each side's Bishop in front of its left Knight and Rook in front of its right Knight, from that side
    b[64] = BS; b[70] = RK;        // Black: Bishop 8h, Rook 2h
    b[16] = -BS; b[10] = -RK;      // White: Bishop 2b, Rook 8b
    return { b: b, hb: [0, 0, 0, 0, 0, 0, 0, 0], hw: [0, 0, 0, 0, 0, 0, 0, 0], turn: 1 };
  }
  function clonePos(p) { return { b: p.b.slice(), hb: p.hb.slice(), hw: p.hw.slice(), turn: p.turn }; }
  function legal(pos) { return legalW(W(pos), false); }
  function inCheck(pos, side) { return inCheckW(W(pos), side == null ? pos.turn : side); }
  function apply(pos, m) {
    var w = W(pos), cap = make(w, m), out = { b: Array.prototype.slice.call(w.b), hb: [], hw: [], turn: w.side };
    for (var t = 0; t <= 7; t++) { out.hb.push(t ? w.h[t] : 0); out.hw.push(t ? w.h[8 + t] : 0); }
    out.cap = cap;
    return out;
  }
  function sqName(s) { return (9 - (s % 9)) + 'abcdefghi'.charAt((s / 9) | 0); }
  function parseSq(f, r) { return 'abcdefghi'.indexOf(r) * 9 + (9 - +f); }
  // Western notation: P7g-7f, Bx2b+ style with the square it came from: B8hx2b+, a drop P*5e; + promotes, = declines
  function notation(pos, m) {
    var from = m & 127, to = (m >> 7) & 127, pr = (m >> 14) & 1;
    if (from >= 81) return LETTER[from - 81] + '*' + sqName(to);
    var t = Math.abs(pos.b[from]), side = pos.turn;
    var could = t <= 8 && PROMOTES[t] && (inZone(side, (from / 9) | 0) || inZone(side, (to / 9) | 0)) && !deadEnd(t, side, (to / 9) | 0);
    return LETTER[t] + sqName(from) + (pos.b[to] ? 'x' : '-') + sqName(to) + (pr ? '+' : could ? '=' : '');
  }
  var NOT_RE = /^(\+?[PLNSGBRK])(?:\*(\d)([a-i])|(\d)([a-i])([-x])(\d)([a-i])([+=]?))$/;
  // notation back to a move (for the history view's replay and tests)
  function parse(txt) {
    var x = NOT_RE.exec(txt); if (!x) return -1;
    if (x[2]) return (81 + LETTER.indexOf(x[1])) | (parseSq(x[2], x[3]) << 7);
    return parseSq(x[4], x[5]) | (parseSq(x[7], x[8]) << 7) | (x[9] === '+' ? 1 << 14 : 0);
  }
  function from(m) { var f = m & 127; return f >= 81 ? -1 : f; }
  function to(m) { return (m >> 7) & 127; }
  function dropType(m) { var f = m & 127; return f >= 81 ? f - 81 : 0; }
  function promo(m) { return (m >> 14) & 1; }
  function mk(f, t, pr) { return f | (t << 7) | (pr ? 1 << 14 : 0); }
  function drop(t, s) { return (81 + t) | (s << 7); }
  // a position as a short text: board, hands and side to move (for repetition)
  function hash(pos) {
    var h1 = 0x811c9dc5, h2 = 0x01000193 ^ 0x5bd1e995, i, v;
    function eat(v) { h1 = Math.imul(h1 ^ (v & 255), 16777619) >>> 0; h2 = Math.imul(h2 ^ ((v + 31) & 255), 2246822519) >>> 0; h2 = (h2 << 13 | h2 >>> 19) >>> 0; }
    for (i = 0; i < 81; i++) eat(pos.b[i] + 20);
    for (i = 1; i <= 7; i++) { eat(pos.hb[i] + 1); eat(pos.hw[i] + 60); }
    eat(pos.turn > 0 ? 7 : 9);
    return h1.toString(36) + '.' + h2.toString(36);
  }
  function kingSq(pos, side) { for (var i = 0; i < 81; i++) if (pos.b[i] === KG * side) return i; return -1; }
  function kingIn(pos, side) { var k = kingSq(pos, side); return k >= 0 && inZone(side, (k / 9) | 0); }
  // Impasse: the 27-point declaration (81Dojo's rule) for `side`
  function impasse(pos, side) {
    var k = kingSq(pos, side), n = 0, pts = 0, i, t;
    for (i = 0; i < 81; i++) {
      var p = pos.b[i] * side; if (p <= 0 || p === KG) continue;
      if (!inZone(side, (i / 9) | 0)) continue;
      n++; t = base(p); pts += t === BS || t === RK ? 5 : 1;
    }
    var hand = side > 0 ? pos.hb : pos.hw;
    for (t = 1; t <= 7; t++) pts += (hand[t] || 0) * (t === BS || t === RK ? 5 : 1);
    var need = side > 0 ? 28 : 27, kin = k >= 0 && inZone(side, (k / 9) | 0), chk = inCheck(pos, side);
    return { ok: kin && !chk && n >= 10 && pts >= need, kingIn: kin, check: chk, pieces: n, pts: pts, need: need };
  }
  // The 24-point count: every piece a side owns, on the board and in hand
  function count24(pos, side) {
    var pts = 0, i, t;
    for (i = 0; i < 81; i++) { var p = pos.b[i] * side; if (p <= 0 || p === KG) continue; t = base(p); pts += t === BS || t === RK ? 5 : 1; }
    var hand = side > 0 ? pos.hb : pos.hw;
    for (t = 1; t <= 7; t++) pts += (hand[t] || 0) * (t === BS || t === RK ? 5 : 1);
    return pts;
  }
  function bothIn(pos) { return kingIn(pos, 1) && kingIn(pos, -1); }

  // ── A whole game ─────────────────────────────────────────────────────────
  function newGame(pos) {
    pos = pos ? clonePos(pos) : start();
    return { pos: pos, n: 0, keys: [hash(pos)], ck: '', ml: [], last: null, over: null };
  }
  function cloneGame(g) { return JSON.parse(JSON.stringify(g)); }
  // play move m: null if it isn't legal. info says what happened (for the table's animation and moments)
  function play(g, m, ms) {
    if (g.over) return null;
    ms = ms || legal(g.pos);
    if (ms.indexOf(m) < 0) return null;
    var pos = g.pos, side = pos.turn, f = m & 127, t = (m >> 7) & 127, pr = (m >> 14) & 1;
    var san = notation(pos, m), moved = f >= 81 ? f - 81 : Math.abs(pos.b[f]), capT = pos.b[t] ? Math.abs(pos.b[t]) : 0;
    var np = apply(pos, m); delete np.cap;
    var ng = { pos: np, n: g.n + 1, keys: g.keys.concat([hash(np)]), ck: '', ml: g.ml.concat([san]), last: { m: m, f: f >= 81 ? -1 : f, t: t, d: f >= 81 ? f - 81 : 0, cap: capT, pr: pr, pc: moved, side: side }, over: null };
    var chk = inCheck(np, np.turn);
    ng.ck = g.ck + (side > 0 ? (chk ? 'B' : 'b') : (chk ? 'W' : 'w'));
    var replies = legal(np), info = { m: m, san: san, side: side, moved: moved, cap: capT, pr: pr, drop: f >= 81, check: chk, mate: false, rep: 0 };
    if (!replies.length) { ng.over = { w: side, why: chk ? 'mate' : 'nomoves' }; info.mate = chk; }
    else {
      // repetition: the fourth time this position stands
      var k = ng.keys[ng.n], seen = [];
      for (var i = 0; i < ng.keys.length; i++) if (ng.keys[i] === k) seen.push(i);
      info.rep = seen.length;
      if (seen.length >= 4) {
        var j0 = seen[0], allA = true, allB = true;
        for (var ply = j0 + 1; ply <= ng.n; ply++) {
          var ch = ng.ck.charAt(ply - 1);
          if (ch === 'b') allA = false; else if (ch === 'w') allB = false;
        }
        if (allA && !allB) ng.over = { w: -1, why: 'perpetual' };
        else if (allB && !allA) ng.over = { w: 1, why: 'perpetual' };
        else ng.over = { w: 0, why: 'rep' };
      }
    }
    return { g: ng, info: info, replies: replies };
  }
  function declare(g) {
    var side = g.pos.turn, im = impasse(g.pos, side);
    if (g.over || !im.ok) return null;
    var ng = cloneGame(g); ng.over = { w: side, why: 'declare', pts: im.pts }; return ng;
  }
  function agreeCount(g) {
    var b = count24(g.pos, 1), w = count24(g.pos, -1), ng = cloneGame(g);
    ng.over = { w: b < 24 && w >= 24 ? -1 : w < 24 && b >= 24 ? 1 : 0, why: 'count', pb: b, pw: w };
    return ng;
  }
  function resign(g, side) { var ng = cloneGame(g); ng.over = { w: -side, why: 'resign' }; return ng; }

  // ── The computer ─────────────────────────────────────────────────────────
  // values in hundredths of a Pawn, on the board and in hand (a piece in hand can go anywhere, so it is worth more)
  var VAL = [0, 100, 300, 350, 500, 560, 820, 980, 0, 560, 540, 540, 560, 0, 1050, 1250];
  var HVAL = [0, 115, 330, 390, 560, 620, 920, 1100];
  var MATE = 1000000;
  function evalW(w) {
    var b = w.b, sc = 0, s, p, t, side, r, c;
    var kb = w.k[0], kw = w.k[1], kbr = (kb / 9) | 0, kbc = kb % 9, kwr = (kw / 9) | 0, kwc = kw % 9;
    var defB = 0, defW = 0, attB = 0, attW = 0;
    for (s = 0; s < 81; s++) {
      p = b[s]; if (!p) continue;
      side = p > 0 ? 1 : -1; t = p * side; r = (s / 9) | 0; c = s % 9;
      var v = VAL[t];
      // a little for pieces that have come forward (Pawns and the minor pieces), toward promotion
      var adv = side > 0 ? 8 - r : r;
      if (t === PW) v += adv * 4; else if (t === SV || t === KN || t === LN) v += adv * 3;
      // near your own King a Gold or Silver guards it; near theirs a piece attacks it
      if (t !== KG) {
        var ownK = side > 0 ? kb : kw, oppK = side > 0 ? kw : kb;
        if (ownK >= 0) { var dO = Math.max(Math.abs(r - ((ownK / 9) | 0)), Math.abs(c - ownK % 9)); if (dO <= 2 && (t === GD || t === SV || (t >= 9 && t <= 12))) { if (side > 0) defB += dO === 1 ? 2 : 1; else defW += dO === 1 ? 2 : 1; } }
        if (oppK >= 0) { var dA = Math.max(Math.abs(r - ((oppK / 9) | 0)), Math.abs(c - oppK % 9)); if (dA <= 2) { var a = t === PW ? 1 : t >= 14 || t === RK || t === BS ? 4 : 2; if (side > 0) attB += dA === 1 ? a * 2 : a; else attW += dA === 1 ? a * 2 : a; } }
      }
      sc += v * side;
    }
    for (t = 1; t <= 7; t++) { sc += HVAL[t] * (w.h[t] - w.h[8 + t]); }
    // pieces in hand threaten a King that has few guards
    var handB = w.h[2] + w.h[3] + w.h[4] + w.h[5] + 2 * (w.h[6] + w.h[7]), handW = w.h[10] + w.h[11] + w.h[12] + w.h[13] + 2 * (w.h[14] + w.h[15]);
    sc += (defB * 14 - Math.max(0, attW + handW - defB) * 12) - (defW * 14 - Math.max(0, attB + handB - defW) * 12);
    // a King left in the middle of its home rank early is a little worse than one tucked to the side
    if (kb >= 0 && kbr >= 6) sc += (Math.abs(kbc - 4) >= 2 ? 15 : 0);
    if (kw >= 0 && kwr <= 2) sc -= (Math.abs(kwc - 4) >= 2 ? 15 : 0);
    return sc * w.side;
  }
  // a seeded random (so the demo's computer plays the same way every time)
  function rng(seed) { var a = seed >>> 0 || 1; return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  var STOP = {};
  // search(pos, {depth, time, noise, seed}) -> {m, score, depth, nodes}
  function search(pos, o) {
    o = o || {};
    var w = W(pos), t0 = Date.now(), limit = o.time || 1000, maxD = o.depth || 3, nodes = 0, rnd = rng(o.seed || 12345);
    var killers = [], hist = new Int32Array(1 << 15);
    function tick() { if ((++nodes & 2047) === 0 && Date.now() - t0 > limit) throw STOP; }
    function capVal(m) {
      var f = m & 127, t = (m >> 7) & 127, q = w.b[t], v = 0;
      if (q) v = 10 * VAL[Math.abs(q)] - (f < 81 ? VAL[Math.abs(w.b[f])] / 10 : 0);
      if ((m >> 14) & 1) v += 400;
      return v;
    }
    function order(ms, ply, best) {
      var sc = new Array(ms.length), k = killers[ply] || [];
      for (var i = 0; i < ms.length; i++) {
        var m = ms[i], v = capVal(m);
        if (m === best) v = 1e8;
        else if (!v) v = (m === k[0] ? 9000 : m === k[1] ? 8000 : 0) + (hist[m & 32767] >> 4) - ((m & 127) >= 81 ? 50 : 0);
        else v += 20000;
        sc[i] = v;
      }
      var idx = ms.map(function (_, i) { return i; }).sort(function (a, b) { return sc[b] - sc[a]; });
      return idx.map(function (i) { return ms[i]; });
    }
    function qs(alpha, beta, ply, qd) {
      tick();
      var side = w.side, chk = inCheckW(w, side), ms, i, any = false;
      if (chk) {
        if (qd > 3) return evalW(w);
        ms = pseudo(w, side, [], false, true);
      } else {
        var stand = evalW(w);
        if (stand >= beta) return stand;
        if (stand > alpha) alpha = stand;
        if (qd > 5) return stand;
        ms = pseudo(w, side, [], true, true);
      }
      ms = order(ms, ply, 0);
      var best = chk ? -MATE + ply : alpha;
      for (i = 0; i < ms.length; i++) {
        var m = ms[i], cap = make(w, m);
        if (inCheckW(w, side) || (pawnDropCheck(w, m, side) && !hasLegal(w, 1))) { unmake(w, m, cap); continue; }
        any = true;
        var v = -qs(-beta, -alpha, ply + 1, qd + 1);
        unmake(w, m, cap);
        if (v > best) best = v;
        if (v > alpha) alpha = v;
        if (alpha >= beta) break;
      }
      if (chk && !any) return -MATE + ply;
      return best;
    }
    function ab(depth, alpha, beta, ply) {
      if (depth <= 0) return qs(alpha, beta, ply, 0);
      tick();
      var side = w.side, ms = order(pseudo(w, side, [], false, true), ply, 0), best = -Infinity, legalN = 0;
      var chk = inCheckW(w, side);
      for (var i = 0; i < ms.length; i++) {
        var m = ms[i], cap = make(w, m);
        if (inCheckW(w, side) || (pawnDropCheck(w, m, side) && !hasLegal(w, 1))) { unmake(w, m, cap); continue; }
        legalN++;
        // a move that gives check is looked at one ply deeper
        var ext = chk && depth === 1 ? 1 : 0;
        var v = -ab(depth - 1 + ext, -beta, -alpha, ply + 1);
        unmake(w, m, cap);
        if (v > best) best = v;
        if (v > alpha) alpha = v;
        if (alpha >= beta) {
          if (!cap) { var k = killers[ply] || (killers[ply] = [0, 0]); if (k[0] !== m) { k[1] = k[0]; k[0] = m; } hist[m & 32767] += depth * depth; }
          break;
        }
      }
      if (!legalN) return -MATE + ply;
      return best;
    }
    var root = legalW(w, true);
    if (!root.length) return null;
    var noise = o.noise || 0, nz = {};
    root.forEach(function (m) { nz[m] = (rnd() * 2 - 1) * noise; });
    if (root.length === 1) return { m: root[0], score: 0, depth: 0, nodes: 0 };
    var best = root[0], bestS = -Infinity, done = 0, vals = {};
    for (var d = 1; d <= maxD; d++) {
      try {
        var ms = order(root, 0, best), cur = 0, curS = -Infinity, alpha = -Infinity;
        for (var j = 0; j < ms.length; j++) {
          var m = ms[j], cap = make(w, m);
          var v = -ab(d - 1, -Infinity, -(alpha === -Infinity ? -Infinity : alpha - 2 * noise - 1), 1);
          unmake(w, m, cap);
          vals[m] = v;
          var vn = v + (Math.abs(v) > MATE / 2 ? 0 : nz[m]);
          if (!cur || vn > curS) { cur = m; curS = vn; }
          if (vn > alpha) alpha = vn;
        }
        best = cur; bestS = curS; done = d;
        if (Math.abs(bestS) > MATE / 2) break;
        if (Date.now() - t0 > limit * 0.45) break;
      } catch (e) {
        if (e !== STOP) throw e;
        // the move being searched when time ran out: keep the last whole depth's choice
        break;
      }
    }
    return { m: best, score: bestS, depth: done, nodes: nodes };
  }

  var Core = {
    PW: PW, LN: LN, KN: KN, SV: SV, GD: GD, BS: BS, RK: RK, KG: KG, LETTER: LETTER, NAME: NAME, PROMOTES: PROMOTES,
    base: base, start: start, clonePos: clonePos, legal: legal, inCheck: inCheck, apply: apply, notation: notation, parse: parse,
    sqName: sqName, from: from, to: to, dropType: dropType, promo: promo, mk: mk, drop: drop, hash: hash, kingSq: kingSq,
    kingIn: kingIn, inZone: inZone, deadEnd: deadEnd, impasse: impasse, count24: count24, bothIn: bothIn,
    newGame: newGame, cloneGame: cloneGame, play: play, declare: declare, agreeCount: agreeCount, resign: resign,
    search: search, evaluate: function (pos) { return evalW(W(pos)); }, STEPS: STEPS, SLIDES: SLIDES
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = Core;
  else root.ShogiCore = Core;
  // loaded as a Web Worker: answer searches
  if (typeof window === 'undefined' && typeof importScripts === 'function' && typeof self !== 'undefined') {
    self.onmessage = function (e) { var d = e.data; var res = null; try { res = search(d.pos, d.opts); } catch (err) { res = null; } self.postMessage({ id: d.id, res: res }); };
  }
})(typeof self !== 'undefined' ? self : this);
