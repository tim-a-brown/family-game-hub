// ═══════════════════════════════════════════════════════════════════════════
// xiangqi-core.js: the rules of Xiangqi (Chinese chess) and the computer player. Plain JSON state, no DOM, so the same
// code runs in the page, at an online table (TurnNet) and in Node (scripts/xiangqi-sim.js). A Web Worker builds its own
// copy from XiangqiCore.factory.toString().
//
// The board is 90 points, index = r * 9 + c: r 0 is Black's back rank (rank 10 in ICCS), r 9 is Red's (rank 1); c 0 is
// file a at Red's left. Red (1) sits at the bottom and moves first; Black is -1. A point holds 0 or side * piece:
//   1 General  2 Advisor  3 Elephant  4 Horse  5 Chariot  6 Cannon  7 Soldier
// The river runs between r 4 and r 5. The palaces are files d to f (c 3 to 5), r 0 to 2 and r 7 to 9.
//
// State (all plain JSON):
//   b      [90] the board
//   id     [90] which piece stands on each point (1 to 32, 0 empty): a piece keeps its id as it moves, so a chase can
//          follow the same piece round a repetition
//   turn   1 Red, -1 Black
//   keys   [position keys]: keys[0] the start, keys[n] after n plies (the side to move is part of the key)
//   pl     [{f, t, c (captured code, 0), k (1: the move gave check), h: [ids the mover now chases], n: WXF}]
//   quiet  plies since the last capture
// API: start(), legal(st | b, side), play(st, m) -> new state, result(st) -> null | {type, winner}, wxf(b, m),
//      inCheck(b, side), facing(b), blocked(b, f) (a horse's leg, an elephant's eye), screen(b, f, t) (a cannon's
//      screen), why(b, f, t) ('face' | 'check' | null: why a move the piece could make is not allowed), search(st, o).
// Results: mate, stalemate (the side with no move loses), perpetual (the side that checked every move of a repetition
// loses), chase (the side that chased one piece every move of a repetition loses), repetition (draw), material (no
// Chariot, Horse, Cannon or Soldier left on either side: draw), quiet (60 moves each with no capture: draw),
// resign, agreed, left.
// ═══════════════════════════════════════════════════════════════════════════
(function (root) {
  'use strict';
  function XiangqiCore() {
    var K = 1, A = 2, E = 3, H = 4, R = 5, C = 6, P = 7;
    var LET = ['', 'K', 'A', 'E', 'H', 'R', 'C', 'P'];
    var NAME = ['', 'General', 'Advisor', 'Elephant', 'Horse', 'Chariot', 'Cannon', 'Soldier'];
    var FILES = 'abcdefghi';
    function rc(s) { return [Math.floor(s / 9), s % 9]; }
    function on(r, c) { return r >= 0 && r < 10 && c >= 0 && c < 9; }
    function inPalace(side, r, c) { return c >= 3 && c <= 5 && (side === 1 ? r >= 7 && r <= 9 : r >= 0 && r <= 2); }
    function ownHalf(side, r) { return side === 1 ? r >= 5 : r <= 4; }
    function crossed(side, r) { return side === 1 ? r <= 4 : r >= 5; }
    function fwd(side) { return side === 1 ? -1 : 1; }
    function sqName(s) { var p = rc(s); return FILES[p[1]] + (10 - p[0]); }
    function sqOf(n) { return (10 - +n.slice(1)) * 9 + FILES.indexOf(n.charAt(0)); }

    function startBoard() {
      var b = [], i, back = [R, H, E, A, K, A, E, H, R];
      for (i = 0; i < 90; i++) b.push(0);
      for (i = 0; i < 9; i++) { b[i] = -back[i]; b[81 + i] = back[i]; }
      b[2 * 9 + 1] = b[2 * 9 + 7] = -C; b[7 * 9 + 1] = b[7 * 9 + 7] = C;
      for (i = 0; i < 9; i += 2) { b[3 * 9 + i] = -P; b[6 * 9 + i] = P; }
      return b;
    }
    var CH = '0KAEHRCPkaehrcp';
    function key(b, turn) { var s = ''; for (var i = 0; i < 90; i++) { var v = b[i]; s += v > 0 ? CH[v] : v < 0 ? CH[7 - v] : '.'; } return s + (turn === 1 ? 'r' : 'b'); }
    function start() {
      var b = startBoard(), id = [], n = 0;
      for (var i = 0; i < 90; i++) id.push(b[i] ? ++n : 0);
      return { b: b, id: id, turn: 1, keys: [key(b, 1)], pl: [], quiet: 0 };
    }
    // a position set by hand (a demo, a test): b with Red or Black to move
    function fromBoard(b, turn) {
      var id = [], n = 0; b = b.slice();
      for (var i = 0; i < 90; i++) id.push(b[i] ? ++n : 0);
      return { b: b, id: id, turn: turn || 1, keys: [key(b, turn || 1)], pl: [], quiet: 0 };
    }

    // ── Moves a piece could make, ignoring check (pseudo-legal). out gets {f, t, c} ──
    var HJ = [[-1, 0, -2, -1], [-1, 0, -2, 1], [1, 0, 2, -1], [1, 0, 2, 1], [0, -1, -1, -2], [0, -1, 1, -2], [0, 1, -1, 2], [0, 1, 1, 2]];
    var ORTH = [[-1, 0], [1, 0], [0, -1], [0, 1]], DIAG = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
    function pieceMoves(b, s, out, capsOnly) {
      var v = b[s]; if (!v) return out;
      var side = v > 0 ? 1 : -1, p = v * side, r = Math.floor(s / 9), c = s % 9, i, rr, cc, t, x;
      function add(t) { var x = b[t]; if (x * side > 0) return; if (capsOnly && !x) return; out.push({ f: s, t: t, c: x }); }
      if (p === K) {
        for (i = 0; i < 4; i++) { rr = r + ORTH[i][0]; cc = c + ORTH[i][1]; if (inPalace(side, rr, cc)) add(rr * 9 + cc); }
      } else if (p === A) {
        for (i = 0; i < 4; i++) { rr = r + DIAG[i][0]; cc = c + DIAG[i][1]; if (inPalace(side, rr, cc)) add(rr * 9 + cc); }
      } else if (p === E) {
        for (i = 0; i < 4; i++) {
          rr = r + 2 * DIAG[i][0]; cc = c + 2 * DIAG[i][1];
          if (!on(rr, cc) || !ownHalf(side, rr)) continue;
          if (b[(r + DIAG[i][0]) * 9 + c + DIAG[i][1]]) continue;   // the elephant's eye is blocked
          add(rr * 9 + cc);
        }
      } else if (p === H) {
        for (i = 0; i < 8; i++) {
          rr = r + HJ[i][2]; cc = c + HJ[i][3];
          if (!on(rr, cc)) continue;
          if (b[(r + HJ[i][0]) * 9 + c + HJ[i][1]]) continue;   // the horse's leg is blocked
          add(rr * 9 + cc);
        }
      } else if (p === R || p === C) {
        for (i = 0; i < 4; i++) {
          rr = r + ORTH[i][0]; cc = c + ORTH[i][1]; var screen = false;
          while (on(rr, cc)) {
            t = rr * 9 + cc; x = b[t];
            if (p === R) { if (!x) { if (!capsOnly) out.push({ f: s, t: t, c: 0 }); } else { if (x * side < 0) out.push({ f: s, t: t, c: x }); break; } }
            else if (!screen) { if (!x) { if (!capsOnly) out.push({ f: s, t: t, c: 0 }); } else screen = true; }
            else if (x) { if (x * side < 0) out.push({ f: s, t: t, c: x }); break; }
            rr += ORTH[i][0]; cc += ORTH[i][1];
          }
        }
      } else if (p === P) {
        rr = r + fwd(side); if (on(rr, c)) add(rr * 9 + c);
        if (crossed(side, r)) { if (c > 0) add(r * 9 + c - 1); if (c < 8) add(r * 9 + c + 1); }
      }
      return out;
    }
    function pseudo(b, side, capsOnly) { var out = []; for (var s = 0; s < 90; s++) if (b[s] * side > 0) pieceMoves(b, s, out, capsOnly); return out; }

    // ── Attack and check ──
    function general(b, side) { var k = side * K; for (var s = 0; s < 90; s++) if (b[s] === k) return s; return -1; }
    // is point s attacked by side `by`? (the generals facing each other is not counted here: see facing)
    function attacked(b, s, by) {
      var r = Math.floor(s / 9), c = s % 9, i, rr, cc, x, n;
      for (i = 0; i < 4; i++) {
        rr = r + ORTH[i][0]; cc = c + ORTH[i][1]; n = 0;
        while (on(rr, cc)) {
          x = b[rr * 9 + cc];
          if (x) {
            if (n === 0) { if (x === R * by) return true; if (x === K * by && Math.abs(rr - r) + Math.abs(cc - c) === 1 && inPalace(by, r, c)) return true; if (x === P * by && Math.abs(rr - r) + Math.abs(cc - c) === 1) {
                if (cc === c && rr - r === -fwd(by)) return true;   // a soldier straight behind, pushing forward
                if (rr === r && crossed(by, rr)) return true;   // a soldier across the river, beside
              } }
            else if (n === 1) { if (x === C * by) return true; break; }
            n++;
          }
          rr += ORTH[i][0]; cc += ORTH[i][1];
        }
      }
      for (i = 0; i < 8; i++) {   // a horse that reaches s: its leg is next to the horse, toward s
        var hr = r - HJ[i][2], hc = c - HJ[i][3];
        if (!on(hr, hc) || b[hr * 9 + hc] !== H * by) continue;
        if (!b[(hr + HJ[i][0]) * 9 + hc + HJ[i][1]]) return true;
      }
      for (i = 0; i < 4; i++) {
        rr = r + DIAG[i][0]; cc = c + DIAG[i][1];
        if (on(rr, cc) && b[rr * 9 + cc] === A * by && inPalace(by, r, c)) return true;
        var er = r + 2 * DIAG[i][0], ec = c + 2 * DIAG[i][1];
        if (on(er, ec) && b[er * 9 + ec] === E * by && ownHalf(by, r) && !b[rr * 9 + cc]) return true;
      }
      return false;
    }
    // the two generals on one file with nothing between them
    function facing(b) {
      var r1 = general(b, 1), b1 = general(b, -1); if (r1 < 0 || b1 < 0 || r1 % 9 !== b1 % 9) return false;
      for (var s = b1 + 9; s < r1; s += 9) if (b[s]) return false;
      return true;
    }
    function inCheck(b, side) { var g = general(b, side); if (g < 0) return true; return attacked(b, g, -side) || facing(b); }
    function apply(b, m) { var nb = b.slice(); nb[m.t] = nb[m.f]; nb[m.f] = 0; return nb; }
    function legalB(b, side) { return pseudo(b, side).filter(function (m) { return !inCheck(apply(b, m), side); }); }
    function legal(st, side) { if (Array.isArray(st)) return legalB(st, side); return legalB(st.b, st.turn); }
    // why a move the piece's own way of moving allows is not allowed
    function why(b, f, t) {
      var v = b[f]; if (!v) return null; var side = v > 0 ? 1 : -1, nb = apply(b, { f: f, t: t });
      if (facing(nb)) return 'face';
      if (inCheck(nb, side)) return 'check';
      return null;
    }
    // the points a horse or an elephant would reach but for a piece in the way: [{t, at}] (at: the blocking point)
    function blocked(b, f) {
      var v = b[f], out = []; if (!v) return out;
      var side = v > 0 ? 1 : -1, p = v * side, r = Math.floor(f / 9), c = f % 9, i, rr, cc;
      if (p === H) for (i = 0; i < 8; i++) {
        rr = r + HJ[i][2]; cc = c + HJ[i][3]; var leg = (r + HJ[i][0]) * 9 + c + HJ[i][1];
        if (on(rr, cc) && b[leg] && b[rr * 9 + cc] * side <= 0) out.push({ t: rr * 9 + cc, at: leg, kind: 'leg' });
      }
      if (p === E) for (i = 0; i < 4; i++) {
        rr = r + 2 * DIAG[i][0]; cc = c + 2 * DIAG[i][1]; var eye = (r + DIAG[i][0]) * 9 + c + DIAG[i][1];
        if (on(rr, cc) && ownHalf(side, rr) && b[eye] && b[rr * 9 + cc] * side <= 0) out.push({ t: rr * 9 + cc, at: eye, kind: 'eye' });
      }
      return out;
    }
    // the screen a cannon jumps to capture from f to t (-1 when it isn't a cannon's jump)
    function screen(b, f, t) {
      if (Math.abs(b[f]) !== C || !b[t]) return -1;
      var fr = Math.floor(f / 9), fc = f % 9, tr = Math.floor(t / 9), tc = t % 9;
      if (fr !== tr && fc !== tc) return -1;
      var dr = Math.sign(tr - fr), dc = Math.sign(tc - fc), s = f + dr * 9 + dc, found = -1;
      while (s !== t) { if (b[s]) { if (found >= 0) return -1; found = s; } s += dr * 9 + dc; }
      return found;
    }

    // ── Chases: after side X has moved, the enemy pieces X now threatens to win ──
    // A chase is a threat to capture a piece that isn't protected (or a Chariot, by a Horse or a Cannon, protected or
    // not), by a piece other than the General or a Soldier, and only with a capture X could legally make. The General
    // is never chased (that's check).
    function chases(b, id, side) {
      var out = [], seen = {};
      var caps = pseudo(b, side, true);
      for (var i = 0; i < caps.length; i++) {
        var m = caps[i], att = Math.abs(b[m.f]), vic = Math.abs(b[m.t]);
        if (att === K || att === P || vic === K) continue;
        var nb = apply(b, m);
        if (inCheck(nb, side)) continue;
        var prot = legalB(nb, -side).some(function (x) { return x.t === m.t; });
        if (prot && !(vic === R && (att === H || att === C))) continue;
        var who = id[m.t]; if (who && !seen[who]) { seen[who] = 1; out.push(who); }
      }
      return out;
    }

    // ── WXF notation: the piece's letter, the file it stands on (counted from its own player's right), + forward, -
    // back or = across, then the ranks moved (a piece moving straight along a file) or the file it lands on ──
    function fileNo(side, c) { return side === 1 ? 9 - c : c + 1; }
    function wxf(b, m) {
      var v = b[m.f], side = v > 0 ? 1 : -1, p = v * side, f = rc(m.f), t = rc(m.t), dr = (t[0] - f[0]) * fwd(side);
      var head = LET[p] + fileNo(side, f[1]);
      if (p === R || p === H || p === C || p === P) {
        var same = []; for (var r = 0; r < 10; r++) if (b[r * 9 + f[1]] === v) same.push(r);
        if (same.length >= 2) {
          // front is the one further forward for its own player
          same.sort(function (a, z) { return (a - z) * fwd(side); });   // furthest back first
          var pos = same.indexOf(f[0]);
          if (pos === same.length - 1) head = '+' + LET[p];
          else if (pos === 0) head = '-' + LET[p];
        }
      }
      var op = dr > 0 ? '+' : dr < 0 ? '-' : '=', dest;
      if (p === A || p === E || p === H) dest = fileNo(side, t[1]);
      else dest = op === '=' ? fileNo(side, t[1]) : Math.abs(t[0] - f[0]);
      return head + op + dest;
    }

    // ── Playing a move ──
    function play(st, m) {
      var b = st.b, side = st.turn, mv = null, list = legalB(b, side);
      for (var i = 0; i < list.length; i++) if (list[i].f === m.f && list[i].t === m.t) { mv = list[i]; break; }
      if (!mv) return null;
      var note = wxf(b, mv), nb = apply(b, mv), nid = st.id.slice();
      nid[mv.t] = nid[mv.f]; nid[mv.f] = 0;
      var chk = inCheck(nb, -side) ? 1 : 0;
      var rec = { f: mv.f, t: mv.t, c: mv.c || 0, k: chk, h: chases(nb, nid, side), n: note };
      return { b: nb, id: nid, turn: -side, keys: st.keys.concat([key(nb, -side)]), pl: st.pl.concat([rec]), quiet: mv.c ? 0 : (st.quiet || 0) + 1 };
    }
    // the outcome of a threefold repetition ending at the last ply (null when there isn't one)
    function repetition(st) {
      var n = st.keys.length - 1, k = st.keys[n], first = -1, count = 0;
      for (var i = 0; i <= n; i++) if (st.keys[i] === k) { if (first < 0) first = i; count++; }
      if (count < 3) return null;
      // the plies from the first time this position stood to now: ply j took keys[j - 1] to keys[j]
      var chkAll = {}, chase = {}, moved = {};
      for (var j = first + 1; j <= n; j++) {
        var p = st.pl[j - 1], mover = (st.turn * ((n - j) % 2 === 0 ? -1 : 1));
        moved[mover] = 1;
        if (!p.k) chkAll[mover] = false; else if (chkAll[mover] !== false) chkAll[mover] = true;
        if (!chase[mover]) chase[mover] = p.h.slice();
        else chase[mover] = chase[mover].filter(function (x) { return p.h.indexOf(x) >= 0; });
      }
      var ck = { '1': chkAll[1] === true, '-1': chkAll[-1] === true };
      if (ck[1] !== ck[-1]) return { type: 'perpetual', winner: ck[1] ? -1 : 1 };
      if (ck[1] && ck[-1]) return { type: 'repetition', winner: 0 };
      var ch = { '1': !!(chase[1] && chase[1].length), '-1': !!(chase[-1] && chase[-1].length) };
      if (ch[1] !== ch[-1]) return { type: 'chase', winner: ch[1] ? -1 : 1 };
      return { type: 'repetition', winner: 0 };
    }
    function material(b) {
      for (var s = 0; s < 90; s++) { var a = Math.abs(b[s]); if (a >= H) return true; }
      return false;
    }
    var QUIET = 120;
    function result(st) {
      if (!legalB(st.b, st.turn).length) return { type: inCheck(st.b, st.turn) ? 'mate' : 'stalemate', winner: -st.turn };
      var rp = repetition(st); if (rp) return rp;
      if (!material(st.b)) return { type: 'material', winner: 0 };
      if ((st.quiet || 0) >= QUIET) return { type: 'quiet', winner: 0 };
      return null;
    }

    // ── The computer: alpha-beta with quiescence, piece values and point tables ──
    // values (a Soldier across the river is worth twice one at home)
    var VAL = [0, 0, 200, 200, 400, 900, 450, 100];
    // point tables from Red's side (r 0 is the far side); Black reads them upside down
    var PST = {};
    (function () {
      var r, c, h = [], ch = [], cn = [], so = [], g = [];
      for (r = 0; r < 10; r++) for (c = 0; c < 9; c++) {
        var mid = 4 - Math.abs(c - 4);
        // horse: the middle and the enemy's side; poor on the edge and at home
        h.push(mid * 6 + (r <= 6 ? 12 : 0) + (r >= 2 && r <= 5 ? 10 : 0) - (c === 0 || c === 8 ? 16 : 0) - (r === 9 ? 10 : 0) + ((r === 2 || r === 1) && (c === 3 || c === 5) ? 14 : 0));
        // chariot: open files, the river bank and the enemy's ranks
        ch.push((c === 3 || c === 5 ? 6 : 0) + (c === 4 ? 4 : 0) + (r <= 4 ? 10 : 0) + (r === 2 ? 8 : 0) + (r === 9 && (c === 0 || c === 8) ? -4 : 0));
        // cannon: the middle file and its own side early; a little forward
        cn.push((c === 4 ? 12 : 0) + (c === 3 || c === 5 ? 4 : 0) + (r === 7 ? 4 : 0) + (r >= 3 && r <= 5 ? 4 : 0) + (r === 0 ? -6 : 0));
        // soldier: nothing at home, more across the river and near the palace, less on the last rank
        so.push(r >= 5 ? (r === 5 ? 6 : 0) + (c === 4 ? 4 : 0) : (r === 0 ? 20 : 90 + (4 - r) * 14 + mid * 10 + (c >= 3 && c <= 5 && r <= 2 ? 30 : 0)));
        g.push((c === 4 ? 6 : 0) + (r === 9 ? 4 : 0));
      }
      PST[H] = h; PST[R] = ch; PST[C] = cn; PST[P] = so; PST[K] = g;
    })();
    function pst(p, side, s) { var t = PST[p]; if (!t) return 0; return side === 1 ? t[s] : t[89 - s]; }
    function evaluate(b, side) {
      var sc = 0, adv = [0, 0, 0], el = [0, 0, 0];
      for (var s = 0; s < 90; s++) {
        var v = b[s]; if (!v) continue;
        var sd = v > 0 ? 1 : -1, p = v * sd, val = VAL[p] + pst(p, sd, s);
        sc += sd * val;
        if (p === A) adv[sd + 1]++; else if (p === E) el[sd + 1]++;
      }
      // a General without its guards is open to Horses and Cannons
      sc += (adv[2] - adv[0]) * 15 + (el[2] - el[0]) * 10;
      return sc * side;
    }
    // a seeded random for the hash keys, so every copy of the engine hashes alike
    function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0); }; }
    var ZB = [], ZT, MATE = 100000, STOP = {};
    (function () { var r = rng(20261123); for (var i = 0; i < 15 * 90; i++) ZB.push(r()); ZT = r(); })();
    function zi(v, s) { return ZB[(v + 7) * 90 + s]; }
    function hashOf(b, side) { var h = side === 1 ? 0 : ZT; for (var s = 0; s < 90; s++) if (b[s]) h ^= zi(b[s], s); return h >>> 0; }

    function search(st, o) {
      o = o || {};
      var b = st.b.slice(), root = st.turn, t0 = Date.now(), limit = o.time || 1000, maxD = o.depth || 4, nodes = 0, noise = o.noise || 0;
      var kp = {}; kp[1] = general(b, 1); kp[-1] = general(b, -1);
      var hash = hashOf(b, root), TT = new Map(), path = [];
      var killers = [];
      function tick() { if ((++nodes & 1023) === 0 && Date.now() - t0 > limit) throw STOP; }
      function chk(side) { var g = kp[side]; if (g < 0) return true; if (attacked(b, g, -side)) return true; var o2 = kp[-side]; if (o2 % 9 !== g % 9) return false; var lo = Math.min(g, o2), hi = Math.max(g, o2); for (var s = lo + 9; s < hi; s += 9) if (b[s]) return false; return true; }
      function mk(m) { var v = b[m.f], x = b[m.t]; hash ^= zi(v, m.f) ^ zi(v, m.t) ^ ZT; if (x) hash ^= zi(x, m.t); b[m.t] = v; b[m.f] = 0; if (v === K) kp[1] = m.t; else if (v === -K) kp[-1] = m.t; hash >>>= 0; }
      function um(m) { var v = b[m.t], x = m.c; b[m.f] = v; b[m.t] = x; hash ^= zi(v, m.f) ^ zi(v, m.t) ^ ZT; if (x) hash ^= zi(x, m.t); if (v === K) kp[1] = m.f; else if (v === -K) kp[-1] = m.f; hash >>>= 0; }
      function order(ms, best, ply) {
        var k = killers[ply] || [];
        for (var i = 0; i < ms.length; i++) {
          var m = ms[i], code = m.f * 90 + m.t;
          m.o = code === best ? 1e7 : m.c ? 1e6 + VAL[Math.abs(m.c)] * 10 - VAL[Math.abs(b[m.f])] : (code === k[0] || code === k[1]) ? 5e5 : 0;
        }
        ms.sort(function (a, z) { return z.o - a.o; });
      }
      function qs(alpha, beta, side, ply) {
        tick();
        var stand = evaluate(b, side);
        if (stand >= beta) return stand;
        if (stand > alpha) alpha = stand;
        if (ply > 40) return stand;
        var ms = pseudo(b, side, true); order(ms, -1, ply);
        for (var i = 0; i < ms.length; i++) {
          var m = ms[i]; if (Math.abs(m.c) === K) return MATE - ply;
          mk(m); if (chk(side)) { um(m); continue; }
          var v = -qs(-beta, -alpha, -side, ply + 1); um(m);
          if (v >= beta) return v;
          if (v > alpha) alpha = v;
        }
        return alpha;
      }
      function ab(depth, alpha, beta, side, ply) {
        tick();
        var inChk = chk(side);
        if (inChk) depth++;   // a check is looked at one move deeper
        if (depth <= 0) return qs(alpha, beta, side, ply);
        for (var pi = path.length - 2; pi >= 0; pi -= 2) if (path[pi] === hash) return 0;   // a repetition in the line looked at
        var te = TT.get(hash), best = -1, a0 = alpha;
        if (te) {
          best = te.m;
          if (te.d >= depth) {
            if (te.fl === 0) return te.s;
            if (te.fl === 1 && te.s >= beta) return te.s;
            if (te.fl === -1 && te.s <= alpha) return te.s;
          }
        }
        var ms = pseudo(b, side, false); order(ms, best, ply);
        var bestS = -Infinity, bestM = -1, any = false;
        path.push(hash);
        for (var i = 0; i < ms.length; i++) {
          var m = ms[i]; mk(m);
          if (chk(side)) { um(m); continue; }
          any = true;
          var v = -ab(depth - 1, -beta, -alpha, -side, ply + 1); um(m);
          if (v > bestS) { bestS = v; bestM = m.f * 90 + m.t; }
          if (v > alpha) alpha = v;
          if (alpha >= beta) { if (!m.c) { var kk = killers[ply] || (killers[ply] = []); if (kk[0] !== bestM) { kk[1] = kk[0]; kk[0] = bestM; } } break; }
        }
        path.pop();
        if (!any) return -MATE + ply;   // checkmated, or no move at all: both lose in Xiangqi
        if (TT.size > 400000) TT.clear();
        TT.set(hash, { d: depth, s: bestS, fl: bestS <= a0 ? -1 : bestS >= beta ? 1 : 0, m: bestM });
        return bestS;
      }
      var moves = legalB(b, root);
      if (!moves.length) return null;
      // a move that would repeat the position for the third time is judged by the game's own rule
      var fixed = {}, ok = [];
      moves.forEach(function (m) {
        var ns = play(st, m), key0 = ns.keys[ns.keys.length - 1], cnt = 0;
        for (var i = 0; i < ns.keys.length; i++) if (ns.keys[i] === key0) cnt++;
        if (cnt >= 3) {
          var rp = repetition(ns);
          if (rp) { m.fixed = rp.winner === root ? MATE - 1 : rp.winner === -root ? -MATE + 1 : 0; fixed[m.f * 90 + m.t] = m.fixed; }
        }
        if (!legalB(ns.b, ns.turn).length) m.fixed = MATE - 1;   // mate (or no move) at once
        if (m.fixed == null || m.fixed > -MATE / 2) ok.push(m);
      });
      if (ok.length) moves = ok;
      if (moves.length === 1) return { move: { f: moves[0].f, t: moves[0].t }, score: 0, depth: 0, nodes: 0 };
      moves.forEach(function (m) { m.n = (Math.random() * 2 - 1) * noise; });
      var best = moves[0], bestS = -Infinity, done = 0;
      path.push(hash);
      for (var d = 1; d <= maxD; d++) {
        try {
          var cur = null, curS = -Infinity;
          moves.sort(function (a, z) { return (z === best ? 1e9 : typeof z.s === 'number' ? z.s : -1e9) - (a === best ? 1e9 : typeof a.s === 'number' ? a.s : -1e9); });
          for (var i = 0; i < moves.length; i++) {
            var m = moves[i], v;
            if (m.fixed != null) v = m.fixed;
            else { mk(m); v = -ab(d - 1, -Infinity, -(cur ? curS - 2 * noise - 1 : -Infinity), -root, 1); um(m); }
            m.s = v;
            var vn = v + (Math.abs(v) > MATE / 2 ? 0 : m.n);
            if (!cur || vn > curS) { cur = m; curS = vn; }
          }
          best = cur; bestS = curS; done = d;
          if (Math.abs(curS) > MATE / 2) break;
          if (Date.now() - t0 > limit * 0.5) break;
        } catch (e) { if (e !== STOP) throw e; break; }
      }
      return { move: { f: best.f, t: best.t }, score: bestS, depth: done, nodes: nodes };
    }

    return {
      K: K, A: A, E: E, H: H, R: R, C: C, P: P, LET: LET, NAME: NAME, VAL: VAL, QUIET: QUIET,
      start: start, fromBoard: fromBoard, startBoard: startBoard, key: key, sqName: sqName, sqOf: sqOf, fileNo: fileNo,
      pseudo: pseudo, pieceMoves: pieceMoves, legal: legal, apply: apply, attacked: attacked, inCheck: inCheck, facing: facing,
      general: general, why: why, blocked: blocked, screen: screen, chases: chases, wxf: wxf, play: play, repetition: repetition,
      material: material, result: result, evaluate: evaluate, search: search, inPalace: inPalace, crossed: crossed
    };
  }
  var api = XiangqiCore();
  api.factory = XiangqiCore;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.XiangqiCore = api;
})(this);
