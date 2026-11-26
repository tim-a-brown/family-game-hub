// ═══════════════════════════════════════════════════════════════════════════
// Pacru: the rules and the computer players, in plain JSON state. The same code runs in the page (games/pacru.html),
// at an online table (TurnNet: each move is made inside the table's transaction), in a Web Worker for the computer's
// search, and in Node (scripts/pacru-sim.js plays thousands of games with it).
// Pacru was designed by Mike Wellman (included with his written permission).
// The rules are the Pacru Series 302 booklet's (R1 to R16, www.pacru.com/rulesUK.pdf), its rules FAQ
// (pacruenglishfaq.html, 2009) and the meeting rule as changed on 1 March 2011 (allrules.html).
//
//   The board is 9 by 9 fields in nine borderlands of 3 by 3. A field is neutral, or has a marker of one color.
//   Two players have four chevrons each, three or four players three each (the booklet's back page, STARTS below).
//   A turn is one move or one reorientation; nobody passes (R2).
//   Moving (R3, R5, R6): a chevron moves straight ahead or forward 45 degrees to its left or right, in a straight line,
//   1 to N fields, N being the markers of its own color in the borderland where it starts (at least 1), and ends
//   facing the way it moved.
//   Forbidden (R7): jumping a chevron (except a connection jump), landing on a chevron (except a pincer), landing on
//   another player's color, changing a field a chevron stands on. Crossing other players' fields is allowed.
//   Borderland change (R4): a move that ends in another borderland puts a marker on a neutral field there that no other
//   chevron stands on (the field landed on counts as free). Borderland transformation (R10): a borderland with no
//   neutral field at all lets the mover change any unoccupied field there to their color instead.
//   Connection (R8, R9): a move of two or more fields from a field of your color to a field of your color (both yours
//   at the start of the turn). Jumping no chevron, it changes every field in between to your color; it may jump
//   chevrons, and then nothing in between changes. A connection that changes fields and also crosses a border gives one
//   benefit or the other, the mover's choice (a connection jump keeps its border change).
//   Pincer (R11): two or more of your chevrons that could each reach the field of another player's chevron at the start
//   of your turn (a straight run within their power, no chevron between) let one of them move onto it: the chevron is
//   removed and its field becomes yours, with any border change after.
//   Meeting (R12, as changed in 2011): a move that leaves two of your chevrons on fields of your color, on adjacent
//   fields (any of the eight ways), pointing at each other, lets you change any unoccupied field to your color, when at
//   least one other player has 9 or more markers on the board.
//   Reorientation (R14): instead of moving, turn one chevron 45 degrees (taking 2 of your markers off unoccupied fields)
//   or 90 degrees (4 markers).
//   Losing (R15): a player whose last chevron is taken, or who can move no chevron at the start of their turn, is out
//   (their chevrons come off; their markers stay). Winning (R16): the only player left with chevrons, or the first to
//   have the target number of markers on the board (42 with two players, 28 with three, 24 with four).
//
// Fields: 81, index r * 9 + c, row 0 at the top (rank 9) to row 8 (rank 1), column 0 at the left (file a). A field's
// name is its file a to i and rank 1 to 9: a1 the bottom left. Directions 0 to 7: N, NE, E, SE, S, SW, W, NW.
// Colors 1 Black, 2 Red, 3 Yellow, 4 Green (the booklet's), sitting at the left, right, top and bottom of the board.
//
// State (all plain JSON):
//   v, np, col [the color of each seat, in turn order], b [81: 0 neutral or the seat + 1 whose marker it is],
//   ch [81: -1 or seat * 8 + direction], turn (seat to move), out [seat: 0 in, 'cap' taken, 'blk' blocked],
//   target, over, win (seat or -1), why ('target' | 'last'), n (turns played), ml [moves: 'c1-c4', 'c1-c4:c'
//   (connection chosen over the border), 'e2-f3+f3' (a marker put down), 'g5-g7*h2' (a meeting's field), 'c5>R/a1,b2'
//   (a reorientation and the markers taken off)], last ({f, t} or {r: field} or null),
//   st {cap, meet, conv, cross, trans, rot, best} [per seat counts], race [[markers per seat] after each turn]
// ═══════════════════════════════════════════════════════════════════════════
(function (root) {
  'use strict';
  var N = 9, SZ = 81;
  var DR = [-1, -1, 0, 1, 1, 1, 0, -1], DC = [0, 1, 1, 1, 0, -1, -1, -1];
  var DNAME = ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'];
  var COLORS = [null, 'Black', 'Red', 'Yellow', 'Green'];
  var SIDE = [null, 'W', 'E', 'N', 'S'];
  var TARGET = { 2: 42, 3: 28, 4: 24 };
  // the colors in turn order: two players Black then Red; three the player in the middle (Yellow) first, then round
  // the table clockwise; four Black first (the FAQ's order), then clockwise
  var SEATCOLS = { 2: [1, 2], 3: [3, 2, 1], 4: [1, 3, 2, 4] };
  // the booklet's starting positions: [field, direction]
  var STARTS = {
    1: [['c9', 4], ['a5', 2], ['c1', 0]],
    2: [['g9', 4], ['i5', 6], ['g1', 0]],
    3: [['e9', 4], ['a7', 2], ['i7', 6]],
    4: [['e1', 0], ['a3', 2], ['i3', 6]]
  };
  var FOURTH = { 1: ['i1', 7], 2: ['a9', 3] };   // the two-player game's fourth chevrons, pointing at the middle
  var NAMES = [], BL = [], BLF = [];
  for (var i0 = 0; i0 < SZ; i0++) { var r0 = Math.floor(i0 / N), c0 = i0 % N; NAMES.push('abcdefghi'.charAt(c0) + (N - r0)); BL.push(Math.floor(r0 / 3) * 3 + Math.floor(c0 / 3)); }
  for (var k0 = 0; k0 < 9; k0++) { BLF.push([]); }
  for (i0 = 0; i0 < SZ; i0++) BLF[BL[i0]].push(i0);
  function idx(name) { return NAMES.indexOf(String(name).toLowerCase()); }
  function rowOf(x) { return Math.floor(x / N); }
  function colOf(x) { return x % N; }
  function step(x, d, k) { var r = rowOf(x) + DR[d] * k, c = colOf(x) + DC[d] * k; return r < 0 || r >= N || c < 0 || c >= N ? -1 : r * N + c; }
  function seatOf(v) { return v < 0 ? -1 : v >> 3; }
  function dirOf(v) { return v & 7; }

  function newGame(np) {
    np = np === 3 || np === 4 ? np : 2;
    var b = [], ch = [];
    for (var i = 0; i < SZ; i++) { b.push(0); ch.push(-1); }
    var col = SEATCOLS[np].slice(), z = [];
    col.forEach(function (c, s) {
      var list = STARTS[c].slice(); if (np === 2) list.push(FOURTH[c]);
      list.forEach(function (q) { ch[idx(q[0])] = s * 8 + q[1]; });
      z.push(0);
    });
    return { v: 1, np: np, col: col, b: b, ch: ch, turn: 0, out: z.slice(), target: TARGET[np], over: false, win: -1, why: '', n: 0, ml: [], last: null,
      st: { cap: z.slice(), meet: z.slice(), conv: z.slice(), cross: z.slice(), trans: z.slice(), rot: z.slice(), best: z.slice() }, race: [z.slice()] };
  }
  function markers(st, s) { var n = 0, me = s + 1; for (var i = 0; i < SZ; i++) if (st.b[i] === me) n++; return n; }
  function chevrons(st, s) { var out = []; for (var i = 0; i < SZ; i++) if (seatOf(st.ch[i]) === s) out.push(i); return out; }
  // a chevron's power of movement: its color's markers in the borderland it stands in, at least one
  function power(st, x, s) { if (s == null) s = seatOf(st.ch[x]); var n = 0, f = BLF[BL[x]], me = s + 1; for (var i = 0; i < 9; i++) if (st.b[f[i]] === me) n++; return Math.max(1, n); }
  function threeDirs(d) { return [(d + 7) & 7, d, (d + 1) & 7]; }

  // Every field the chevron on f can move to now (pincers only when two or more chevrons attack): [{t, d, k, pin,
  // conn (0 none, 1 a connection change, 2 a connection jump), gain (fields a change would turn), cross, jump}]
  function dests(st, f, all) {
    var v = st.ch[f]; if (v < 0) return [];
    var s = seatOf(v), me = s + 1, P = power(st, f, s), out = [], startMine = st.b[f] === me;
    threeDirs(dirOf(v)).forEach(function (d) {
      var jumped = 0, gain = 0;
      for (var k = 1; k <= P; k++) {
        var t = step(f, d, k); if (t < 0) break;
        var occ = st.ch[t];
        if (occ >= 0) {
          if (!jumped && seatOf(occ) !== s) {
            if (all || attackers(st, t, s).length >= 2) out.push({ t: t, d: d, k: k, pin: true, conn: 0, gain: 0, cross: BL[t] !== BL[f], jump: 0 });
          }
          jumped++;
        } else {
          var bt = st.b[t];
          if (bt === 0 || bt === me) {
            var conn = k >= 2 && startMine && bt === me ? (jumped ? 2 : 1) : 0;
            if (!jumped || conn === 2) out.push({ t: t, d: d, k: k, pin: false, conn: conn, gain: conn === 1 ? gain : 0, cross: BL[t] !== BL[f], jump: jumped });
          }
          if (bt !== me) gain++;
        }
      }
    });
    return out;
  }
  // the chevrons of seat s that attack field t (could reach it this turn, no chevron between)
  function attackers(st, t, s) {
    var out = [];
    for (var f = 0; f < SZ; f++) {
      var v = st.ch[f]; if (seatOf(v) !== s || f === t) continue;
      var P = power(st, f, s), ds = threeDirs(dirOf(v));
      for (var j = 0; j < 3; j++) {
        var d = ds[j], hit = false;
        for (var k = 1; k <= P; k++) { var x = step(f, d, k); if (x < 0) break; if (x === t) { hit = true; break; } if (st.ch[x] >= 0) break; }
        if (hit) { out.push(f); break; }
      }
    }
    return out;
  }
  function canMove(st, s) { var cs = chevrons(st, s); for (var i = 0; i < cs.length; i++) if (dests(st, cs[i]).length) return true; return false; }
  // the fields a border change may go on, after the chevron has landed on t: {list, trans}
  function crossCands(st, t, s) {
    var me = s + 1, f = BLF[BL[t]], neutral = [], free = [], trans = [];
    for (var i = 0; i < 9; i++) {
      var x = f[i];
      if (st.b[x] === 0) { neutral.push(x); if (st.ch[x] < 0 || x === t) free.push(x); }
      else if (st.b[x] !== me && st.ch[x] < 0) trans.push(x);
    }
    if (neutral.length) return { list: free, trans: false };
    return { list: trans, trans: true };
  }
  function bonusOk(st, s) { for (var p = 0; p < st.np; p++) if (p !== s && markers(st, p) >= 9) return true; return false; }
  function bonusCands(st, s) { var out = [], me = s + 1; for (var i = 0; i < SZ; i++) if (st.ch[i] < 0 && st.b[i] !== me) out.push(i); return out; }
  // a meeting after the chevron landed on t facing d: the field of the chevron it meets, or -1
  function meetAt(st, t, s) {
    var me = s + 1, v = st.ch[t]; if (seatOf(v) !== s || st.b[t] !== me) return -1;
    var d = dirOf(v), x = step(t, d, 1); if (x < 0) return -1;
    var w = st.ch[x];
    return seatOf(w) === s && dirOf(w) === ((d + 4) & 7) && st.b[x] === me ? x : -1;
  }
  function encode(m) {
    if (m.r != null) return NAMES[m.f] + '>' + (m.r < 0 ? 'L' : 'R') + (Math.abs(m.r) === 2 ? (m.r < 0 ? 'L' : 'R') : '') + '/' + m.rm.map(function (x) { return NAMES[x]; }).join(',');
    return NAMES[m.f] + '-' + NAMES[m.t] + (m.kind ? ':' + m.kind : '') + (m.mark != null && m.mark >= 0 ? '+' + NAMES[m.mark] : '') + (m.bonus != null && m.bonus >= 0 ? '*' + NAMES[m.bonus] : '');
  }
  function parse(str) {
    str = String(str || '').toLowerCase();
    var m = /^([a-i][1-9])>(l|r|ll|rr)\/((?:[a-i][1-9],?)*)$/.exec(str);
    if (m) { var r = m[2].length * (m[2].charAt(0) === 'l' ? -1 : 1); return { f: idx(m[1]), r: r, rm: m[3] ? m[3].split(',').filter(Boolean).map(idx) : [] }; }
    m = /^([a-i][1-9])-([a-i][1-9])(?::([cb]))?(?:\+([a-i][1-9]))?(?:\*([a-i][1-9]))?$/.exec(str);
    if (!m) return null;
    return { f: idx(m[1]), t: idx(m[2]), kind: m[3] || '', mark: m[4] ? idx(m[4]) : -1, bonus: m[5] ? idx(m[5]) : -1 };
  }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function wcopy(st) { return { np: st.np, b: st.b.slice(), ch: st.ch.slice(), turn: st.turn, out: st.out.slice(), target: st.target }; }

  // Work a move through on w (a copy holding b, ch, turn, np): m = {f, t, kind, mark, bonus}, where a choice not made yet
  // is undefined. Returns {need: 'kind' | 'mark' | 'bonus', opts} when a choice is still to make, {err} when it is not
  // legal, or the result: {f, t, d, k, s, pin, cap (the seat whose chevron was taken), conv [fields a connection changed,
  // each {x, was}], kind, mark, was (the mark's earlier owner), trans, meet (the field met), bonus, bwas}
  function work(w, m) {
    var s = w.turn, me = s + 1;
    if (seatOf(w.ch[m.f]) !== s) return { err: 'not yours' };
    var D = dests(w, m.f).filter(function (q) { return q.t === m.t; })[0];
    if (!D) return { err: 'no move' };
    var res = { f: m.f, t: m.t, d: D.d, k: D.k, s: s, pin: D.pin, cap: -1, conv: [], kind: '', mark: -1, was: 0, trans: false, meet: -1, bonus: -1, bwas: 0, conn: D.conn, cross: D.cross, jump: D.jump };
    if (D.pin) { res.cap = seatOf(w.ch[m.t]); res.capWas = w.b[m.t]; w.ch[m.t] = -1; w.b[m.t] = me; }
    w.ch[m.t] = s * 8 + D.d; w.ch[m.f] = -1;
    // a connection change and a border crossing: one benefit or the other
    var doConn = D.conn === 1, doCross = D.cross;
    if (doConn && doCross) {
      var cc = crossCands(w, m.t, s);
      if (D.gain === 0) doConn = false;
      else if (!cc.list.length) doCross = false;
      else {
        if (m.kind !== 'c' && m.kind !== 'b') return { need: 'kind', opts: ['c', 'b'], gain: D.gain, cross: cc };
        if (m.kind === 'c') doCross = false; else doConn = false;
        res.kind = m.kind;
      }
    }
    if ((m.kind === 'c' || m.kind === 'b') && !res.kind) return { err: 'no choice to make' };
    if (doConn) {
      for (var k = 1; k < D.k; k++) { var x = step(m.f, D.d, k); if (w.b[x] !== me) { res.conv.push({ x: x, was: w.b[x] }); w.b[x] = me; } }
    }
    if (doCross) {
      var c2 = crossCands(w, m.t, s);
      res.trans = c2.trans;
      if (c2.list.length) {
        if (m.mark == null) return { need: 'mark', opts: c2.list, trans: c2.trans };
        if (c2.list.indexOf(m.mark) < 0) return { err: 'mark' };
        res.mark = m.mark; res.was = w.b[m.mark]; w.b[m.mark] = me;
      } else if (m.mark != null && m.mark >= 0) return { err: 'no mark' };
    } else if (m.mark != null && m.mark >= 0) return { err: 'no mark' };
    var mt = meetAt(w, m.t, s);
      res.meet = mt;
      if (mt >= 0 && bonusOk(w, s)) {
        var bc = bonusCands(w, s);
        if (bc.length) {
          if (m.bonus == null) return { need: 'bonus', opts: bc };
          if (bc.indexOf(m.bonus) < 0) return { err: 'bonus' };
          res.bonus = m.bonus; res.bwas = w.b[m.bonus]; w.b[m.bonus] = me;
        } else if (m.bonus != null && m.bonus >= 0) return { err: 'no bonus' };
      } else if (m.bonus != null && m.bonus >= 0) return { err: 'no bonus' };
    return res;
  }
  // a reorientation: {f, r (-2, -1, 1, 2: 45 or 90 degrees left or right), rm [the markers taken off]}
  function rotCands(w, s) { var out = [], me = s + 1; for (var i = 0; i < SZ; i++) if (w.b[i] === me && w.ch[i] < 0) out.push(i); return out; }
  function workRot(w, m) {
    var s = w.turn, me = s + 1, v = w.ch[m.f];
    if (seatOf(v) !== s) return { err: 'not yours' };
    if ([-2, -1, 1, 2].indexOf(m.r) < 0) return { err: 'turn' };
    var need = Math.abs(m.r) * 2, rm = m.rm || [];
    if (rm.length !== need) return { err: 'count' };
    var seen = {};
    for (var i = 0; i < rm.length; i++) { var x = rm[i]; if (x < 0 || seen[x] || w.b[x] !== me || w.ch[x] >= 0) return { err: 'marker' }; seen[x] = 1; }
    if (!canMove(w, s)) return { err: 'blocked' };
    rm.forEach(function (x) { w.b[x] = 0; });
    var d = (dirOf(v) + m.r + 8) & 7; w.ch[m.f] = s * 8 + d;
    return { f: m.f, r: m.r, rm: rm.slice(), d: d, s: s };
  }
  // after a turn: the target reached, chevrons taken, players blocked at the start of their turn, the last one left
  function nextTurn(w, res) {
    var s = w.turn; res.out = [];
    if (markers(w, s) >= w.target) { res.win = s; res.why = 'target'; return; }
    if (res.cap != null && res.cap >= 0 && !chevrons(w, res.cap).length) { w.out[res.cap] = 'cap'; res.out.push({ s: res.cap, why: 'cap' }); }
    var guard = 0;
    for (;;) {
      var live = []; for (var p = 0; p < w.np; p++) if (!w.out[p]) live.push(p);
      if (live.length <= 1) { res.win = live.length ? live[0] : s; res.why = 'last'; return; }
      var nx = w.turn;
      do { nx = (nx + 1) % w.np; } while (w.out[nx]);
      w.turn = nx;
      if (canMove(w, nx)) return;
      // blocked: out of the game, chevrons off the board, markers stay
      chevrons(w, nx).forEach(function (x) { w.ch[x] = -1; });
      w.out[nx] = 'blk'; res.out.push({ s: nx, why: 'blk' });
      if (++guard > 8) return;
    }
  }
  // check a move string against the state: the parsed move, or null
  function check(st, str) {
    if (st.over) return null;
    var m = parse(str); if (!m || m.f < 0) return null;
    var w = wcopy(st), r = m.r != null ? workRot(w, m) : work(w, { f: m.f, t: m.t, kind: m.kind || undefined, mark: m.mark, bonus: m.bonus });
    if (!r || r.err || r.need) return null;
    return m;
  }
  // play a move string; returns the result (see work and workRot, with out [{s, why}], win, why) or null
  function play(st, str) {
    if (st.over) return null;
    var m = parse(str); if (!m || m.f < 0) return null;
    var w = wcopy(st), res = m.r != null ? workRot(w, m) : work(w, { f: m.f, t: m.t, kind: m.kind || undefined, mark: m.mark, bonus: m.bonus });
    if (!res || res.err || res.need) return null;
    var s = st.turn;
    res.before = markers(st, s);
    nextTurn(w, res);
    st.b = w.b; st.ch = w.ch; st.turn = w.turn; st.out = w.out;
    st.n++; st.ml.push(encode(m.r != null ? m : { f: m.f, t: m.t, kind: res.kind, mark: res.mark, bonus: res.bonus }));
    st.last = m.r != null ? { r: m.f } : { f: m.f, t: m.t };
    res.after = markers(st, s); res.gain = res.after - res.before;
    var S2 = st.st;
    if (m.r != null) S2.rot[s]++;
    else {
      if (res.cap >= 0) S2.cap[s]++;
      if (res.meet >= 0) S2.meet[s]++;
      S2.conv[s] += res.conv.length;
      if (res.mark >= 0) { if (res.trans) S2.trans[s]++; else S2.cross[s]++; }
      if (res.gain > S2.best[s]) S2.best[s] = res.gain;
    }
    var row = []; for (var p = 0; p < st.np; p++) row.push(markers(st, p));
    st.race.push(row);
    if (res.win != null) { st.over = true; st.win = res.win; st.why = res.why; }
    return res;
  }
  // every complete move for the side to move, with choices filled in as given by pick(kind, opts, w) or the first
  function legalBase(st) {
    var s = st.turn, out = [];
    chevrons(st, s).forEach(function (f) { dests(st, f).forEach(function (q) { out.push({ f: f, t: q.t, q: q }); }); });
    return out;
  }
  // the game replayed from the start: [{st}] after each move
  function replay(np, ml) {
    var st = newGame(np), list = [clone(st)];
    (Array.isArray(ml) ? ml : String(ml || '').split(' ')).filter(Boolean).forEach(function (m) { if (play(st, m)) list.push(clone(st)); });
    return list;
  }

  // ── The computer ──
  // A position is weighed for seat s: markers (more as the target nears), chevrons, how far each chevron can move
  // (its power) and how many moves it has, chevrons in danger of a pincer (two or more of another color attacking it)
  // and chances to make one, and blocked chevrons. Two players: alpha-beta (negamax) to a depth; three or four: each
  // other player is assumed to play against the mover (paranoid), to a shallower depth. Choices inside a move (where a
  // border change goes, the connection or the border, a meeting's field, which markers a reorientation takes off) are
  // made by a quick look at what each gives.
  var WIN = 1e6, STOP = {};
  function evalFor(w, s) {
    var tot = 0, best = -Infinity, sc = [];
    for (var p = 0; p < w.np; p++) {
      if (w.out[p]) { sc.push(null); continue; }
      var mk = markers(w, p), cs = chevrons(w, p), v = mk * 10 + Math.max(0, mk - w.target * 0.6) * 6 + cs.length * 45;
      for (var i = 0; i < cs.length; i++) {
        var f = cs[i], ds = dests(w, f), P = power(w, f, p);
        v += Math.min(ds.length, 8) * 1.2 + P * 2;
        if (!ds.length) v -= 14;
        for (var j = 0; j < ds.length; j++) { if (ds[j].pin) v += 18; if (ds[j].conn === 1) v += Math.min(ds[j].gain, 5) * 0.8; if (ds[j].cross) v += 0.6; }
        // danger: attacked by two or more of any one other color
        for (var q = 0; q < w.np; q++) if (q !== p && !w.out[q] && attackers(w, f, q).length >= 2) { v -= 30; break; }
      }
      sc.push(v);
    }
    for (p = 0; p < w.np; p++) if (p !== s && sc[p] != null) { tot += sc[p]; if (sc[p] > best) best = sc[p]; }
    if (sc[s] == null) return -WIN / 2;
    var others = w.np === 2 ? best : best * 0.7 + (tot / Math.max(1, w.np - 1 - w.out.filter(function (x, i) { return x && i !== s; }).length)) * 0.3;
    return sc[s] - (others === -Infinity ? 0 : others);
  }
  // quick worth of putting a marker on x for seat s: blocks other chevrons' landings, joins own fields in lines
  function markWorth(w, x, s, t) {
    var v = 0, me = s + 1;
    if (x === t) v += 1.5;
    for (var d = 0; d < 8; d++) { var y = step(x, d, 1); if (y >= 0 && w.b[y] === me) v += 0.4; var z = step(x, d, 2); if (z >= 0 && w.b[z] === me) v += 0.3; }
    var bl = BLF[BL[x]]; for (var i = 0; i < 9; i++) { var c = w.ch[bl[i]]; if (seatOf(c) === s) v += 1; else if (c >= 0) v += 0.6; }
    return v;
  }
  function rmWorth(w, x, s) {   // how much a marker is worth keeping (the lowest go first)
    var v = 0, bl = BLF[BL[x]], me = s + 1, mine = 0;
    for (var i = 0; i < 9; i++) { var c = w.ch[bl[i]]; if (seatOf(c) === s) v += 3; if (w.b[bl[i]] === me) mine++; }
    return v + mine * 0.3;
  }
  // complete moves (strings) for the side to move; at the root `full` weighs every choice by the evaluation
  function genMoves(st, o) {
    o = o || {};
    var w0 = wcopy(st), s = w0.turn, out = [];
    legalBase(w0).forEach(function (b) {
      var kinds = [undefined];
      var probe = work(wcopy(w0), { f: b.f, t: b.t });
      if (probe.need === 'kind') kinds = ['c', 'b'];
      kinds.forEach(function (kind) {
        var m = { f: b.f, t: b.t, kind: kind };
        for (var guard = 0; guard < 4; guard++) {
          var w = wcopy(w0), r = work(w, m);
          if (r.err) return;
          if (!r.need) { out.push({ m: encode({ f: b.f, t: b.t, kind: r.kind, mark: r.mark, bonus: r.bonus }), pin: r.pin, gain: r.conv.length + (r.mark >= 0 ? 1 : 0) + (r.bonus >= 0 ? 1 : 0) + (r.pin ? 1 : 0), q: b.q }); return; }
          var best = r.opts[0], bv = -Infinity;
          r.opts.forEach(function (x) {
            var v;
            if (o.full) { var w2 = wcopy(w0), m2 = Object.assign({}, m); m2[r.need] = x; var r2 = work(w2, m2); v = r2.need === 'bonus' ? markWorth(w2, x, s, b.t) : r2.err ? -1e9 : evalFor(w2, s); }
            else v = markWorth(w, x, s, b.t) + (r.need === 'bonus' && w.b[x] ? 2 : 0);
            if (v > bv) { bv = v; best = x; }
          });
          m[r.need] = best;
        }
      });
    });
    // reorientations: only for chevrons with few moves (or every chevron when asked), taking off the markers worth least
    var rc = rotCands(w0, s);
    if (rc.length >= 2) {
      chevrons(w0, s).forEach(function (f) {
        if (!o.allRot && dests(w0, f).length > 1) return;
        var sorted = rc.slice().sort(function (a, c) { return rmWorth(w0, a, s) - rmWorth(w0, c, s); });
        [-1, 1, -2, 2].forEach(function (r) {
          var need = Math.abs(r) * 2; if (sorted.length < need) return;
          out.push({ m: encode({ f: f, r: r, rm: sorted.slice(0, need) }), rot: true, gain: -need });
        });
      });
    }
    return out;
  }
  function applyStr(st, str) {   // a light play for the search: no records
    var m = parse(str), w = wcopy(st), res = m.r != null ? workRot(w, m) : work(w, { f: m.f, t: m.t, kind: m.kind || undefined, mark: m.mark, bonus: m.bonus });
    if (!res || res.err || res.need) return null;
    nextTurn(w, res);
    w.over = res.win != null; w.win = res.win;
    return w;
  }
  function search(st0, o) {
    o = o || {};
    var st = wcopy(st0), s = st.turn, t0 = Date.now(), limit = o.time || 0, maxD = o.depth || 2, nodes = 0;
    var seed = (o.seed >>> 0) || 1;
    function rnd() { seed = (seed + 0x6D2B79F5) >>> 0; var t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
    function tick() { if ((++nodes & 63) === 0 && limit > 0 && Date.now() - t0 > limit) throw STOP; }
    function term(w, ply) { return w.win === s ? WIN - ply : -(WIN - ply); }
    // paranoid: s maximizes, every other player minimizes s's value
    function ab(w, depth, alpha, beta, ply) {
      tick();
      if (w.over) return term(w, ply);
      if (depth <= 0) return evalFor(w, s);
      var ms = genMoves(w), mx = w.turn === s;
      if (!ms.length) return evalFor(w, s);
      ms.sort(function (a, b) { return (b.pin ? 100 : 0) + b.gain - ((a.pin ? 100 : 0) + a.gain); });
      if (ms.length > (o.beam || 40)) ms = ms.slice(0, o.beam || 40);
      var best = mx ? -Infinity : Infinity;
      for (var i = 0; i < ms.length; i++) {
        var w2 = applyStr(w, ms[i].m); if (!w2) continue;
        var v = ab(w2, depth - 1, alpha, beta, ply + 1);
        if (mx) { if (v > best) best = v; if (v > alpha) alpha = v; }
        else { if (v < best) best = v; if (v < beta) beta = v; }
        if (alpha >= beta) break;
      }
      return best;
    }
    var root = genMoves(st, { full: true, allRot: true });
    if (!root.length) return null;
    root.forEach(function (x) { var w = applyStr(st, x.m); x.w = w; x.v = w ? (w.over ? term(w, 1) : evalFor(w, s)) : -Infinity; x.n = (rnd() * 2 - 1) * (o.noise || 0); });
    root = root.filter(function (x) { return x.w; });
    for (var i = 0; i < root.length; i++) if (root[i].w.over && root[i].w.win === s) return { move: root[i].m, score: WIN, depth: 0, nodes: 1 };
    root.sort(function (a, b) { return b.v - a.v; });
    var best = root[0], done = 0;
    for (i = 0; i < root.length; i++) if (root[i].v + root[i].n > best.v + best.n) best = root[i];
    if (maxD >= 2) {
      var cand = root.slice(0, o.rootBeam || 24);
      for (var d = 2; d <= maxD; d++) {
        try {
          var cur = null, curV = -Infinity;
          for (var j = 0; j < cand.length; j++) {
            var x = cand[j], v = ab(x.w, d - 1, curV === -Infinity ? -Infinity : curV - 1 - 2 * (o.noise || 0), Infinity, 1);
            x.dv = v;
            if (!cur || v + x.n > curV) { cur = x; curV = v + x.n; }
          }
          best = cur; done = d;
          cand.sort(function (a, b) { return b.dv - a.dv; });
          if (Math.abs(best.dv) >= WIN - 100) break;
          if (limit > 0 && Date.now() - t0 > limit * 0.4) break;
        } catch (e) { if (e !== STOP) throw e; break; }
      }
    }
    return { move: best.m, score: best.dv != null ? best.dv : best.v, depth: done || 1, nodes: nodes };
  }
  // The skills differ in how far ahead they look and how much they slip, never in what they can see
  var LEVELS = {
    easy: { depth: 1, noise: 18, time: 0 },
    normal: { depth: 2, noise: 2, time: 0, rootBeam: 18, beam: 30 },
    hard: { depth: 4, noise: 0, time: 1600, rootBeam: 14, beam: 16 }
  };

  root.PacruCore = {
    N: N, SZ: SZ, DR: DR, DC: DC, DNAME: DNAME, COLORS: COLORS, SIDE: SIDE, TARGET: TARGET, SEATCOLS: SEATCOLS, STARTS: STARTS, FOURTH: FOURTH,
    NAMES: NAMES, BL: BL, BLF: BLF, LEVELS: LEVELS, WIN: WIN,
    idx: idx, rowOf: rowOf, colOf: colOf, step: step, seatOf: seatOf, dirOf: dirOf, threeDirs: threeDirs,
    newGame: newGame, markers: markers, chevrons: chevrons, power: power, dests: dests, attackers: attackers, canMove: canMove,
    crossCands: crossCands, bonusOk: bonusOk, bonusCands: bonusCands, meetAt: meetAt, rotCands: rotCands,
    encode: encode, parse: parse, work: work, workRot: workRot, wcopy: wcopy, check: check, play: play, replay: replay,
    genMoves: genMoves, search: search, evalFor: evalFor, clone: clone
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.PacruCore;
})(typeof window !== 'undefined' ? window : typeof self !== 'undefined' ? self : globalThis);
