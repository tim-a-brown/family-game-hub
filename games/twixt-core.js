// Twixt: the rules and the computer player (window.TwixtCore, or require() in Node; CLAUDE.md, Twixt).
// Plain JSON state, so the same code runs in the page, at the TurnNet table, in the Web Worker and in scripts/twixt-sim.js.
//
// The board is 24 by 24 holes, hole h = r * 24 + c, r 0 the top row and c 0 the left column (A1 is the top left, X24
// the bottom right). The four corner holes are not used. Red owns the top and bottom rows (its border rows) and Black
// the left and right columns. The rules (Alex Randolph's Twixt, with the links made automatically as most play it today):
//   - Red moves first. A turn places one peg in any empty hole, never in the other player's border rows.
//   - Two pegs of one color a knight's move apart are joined by a link at once, unless that link would cross a link
//     already on the board (of either color). Links never cross, and links are never taken away.
//   - A player whose links join a peg in one of their border rows to a peg in the other has won.
//   - Swap (the pie rule, st.swap): just after Red's first peg, Black may swap sides instead of moving. The peg stays
//     red; the players change colors, and Black (now the player who placed that peg) moves next.
//   - Once neither player can still join their borders the game is a draw (canConnect for both is false). Players can
//     also agree to a draw. A player with no hole to play passes.
//
// State: {b: [576] (0 empty, 1 red, 2 black), lk: [link ids], turn: 1|2, n (moves made, a swap counts), swap (the rule
//   is on), swapped, ml: ['D5', 'swap', ...], over, win (1|2, 0 a draw), why ('connect'|'stuck'|'agreed'|'resign'),
//   chain: [holes of the winning chain, border to border], last: {h, side, links: [ids]} | {swap: 1}}
// A link id is h * 4 + k for its upper end h and the direction DIR[k] (always downward), so each link has one id.
(function (root) {
  'use strict';
  var N = 24, H = N * N, RED = 1, BLACK = 2;
  var DIR = [[1, 2], [2, 1], [2, -1], [1, -2]];
  var COLS = 'ABCDEFGHIJKLMNOPQRSTUVWX';
  var CORNER = {}; [0, N - 1, H - N, H - 1].forEach(function (h) { CORNER[h] = 1; });
  // LA, LB: the two ends of each link id (-1 when it would leave the board); NB[h]: [other hole, id] for its 8 knight holes
  var LA = new Int16Array(H * 4).fill(-1), LB = new Int16Array(H * 4).fill(-1), NB = [], CROSS = [];
  (function build() {
    var h, k;
    for (h = 0; h < H; h++) NB.push([]);
    for (h = 0; h < H; h++) {
      var r = (h / N) | 0, c = h % N;
      for (k = 0; k < 4; k++) {
        var r2 = r + DIR[k][0], c2 = c + DIR[k][1], id = h * 4 + k;
        if (r2 >= N || c2 < 0 || c2 >= N) continue;
        var h2 = r2 * N + c2;
        if (CORNER[h] || CORNER[h2]) continue;
        LA[id] = h; LB[id] = h2;
        NB[h].push([h2, id]); NB[h2].push([h, id]);
      }
    }
    // which links cross which: two segments cross when each one's ends lie on opposite sides of the other's line
    // (links that share an end never cross, and no link passes through a hole)
    function side(ax, ay, bx, by, px, py) { var v = (bx - ax) * (py - ay) - (by - ay) * (px - ax); return v > 0 ? 1 : v < 0 ? -1 : 0; }
    for (var id = 0; id < H * 4; id++) {
      CROSS.push([]);
      if (LA[id] < 0) continue;
      var a = LA[id], b = LB[id], ar = (a / N) | 0, ac = a % N, br = (b / N) | 0, bc = b % N;
      for (var rr = ar - 2; rr <= ar + 2; rr++) for (var cc = ac - 3; cc <= ac + 3; cc++) {
        if (rr < 0 || rr >= N || cc < 0 || cc >= N) continue;
        for (k = 0; k < 4; k++) {
          var j = (rr * N + cc) * 4 + k; if (j === id || LA[j] < 0) continue;
          var p = LA[j], q = LB[j]; if (p === a || p === b || q === a || q === b) continue;
          var pr = (p / N) | 0, pc = p % N, qr = (q / N) | 0, qc = q % N;
          if (side(ac, ar, bc, br, pc, pr) * side(ac, ar, bc, br, qc, qr) < 0 && side(pc, pr, qc, qr, ac, ar) * side(pc, pr, qc, qr, bc, br) < 0) CROSS[id].push(j);
        }
      }
    }
  })();

  function rowOf(h) { return (h / N) | 0; }
  function colOf(h) { return h % N; }
  function name(h) { return COLS.charAt(h % N) + (((h / N) | 0) + 1); }
  function hole(s) { var m = /^([A-X])(\d{1,2})$/i.exec(String(s).trim()); if (!m) return -1; var c = COLS.indexOf(m[1].toUpperCase()), r = +m[2] - 1; return r >= 0 && r < N ? r * N + c : -1; }
  // a hole side may play in (empty or not): never a corner, never the other player's border rows
  function playable(h, side) {
    if (CORNER[h]) return false;
    var r = (h / N) | 0, c = h % N;
    return side === RED ? c !== 0 && c !== N - 1 : r !== 0 && r !== N - 1;
  }
  function onStart(h, side) { return side === RED ? h < N : h % N === 0; }
  function onEnd(h, side) { return side === RED ? h >= H - N : h % N === N - 1; }
  function ends(id) { return [LA[id], LB[id]]; }

  // ── The rules on the plain state ──
  function newGame(o) {
    o = o || {};
    var b = []; for (var i = 0; i < H; i++) b.push(0);
    return { b: b, lk: [], turn: RED, n: 0, swap: o.swap !== false, swapped: false, ml: [], over: false, win: null, why: null, chain: null, last: null };
  }
  function present(st) { var p = new Uint8Array(H * 4); for (var i = 0; i < st.lk.length; i++) p[st.lk[i]] = 1; return p; }
  function crossed(p, id) { var x = CROSS[id]; for (var i = 0; i < x.length; i++) if (p[x[i]]) return x[i]; return -1; }
  // The links a peg of side's at h would make now, and the knight holes of side's pegs it can't link to (with the link
  // in the way): {make: [{h, id}], blocked: [{h, id, by}]}
  function wouldLink(st, h, side, p) {
    p = p || present(st);
    var make = [], blocked = [];
    NB[h].forEach(function (e) {
      if (st.b[e[0]] !== side) return;
      var by = crossed(p, e[1]);
      if (by < 0) make.push({ h: e[0], id: e[1] }); else blocked.push({ h: e[0], id: e[1], by: by });
    });
    return { make: make, blocked: blocked };
  }
  function canPlace(st, h, side) { return !st.over && h >= 0 && h < H && !st.b[h] && playable(h, side == null ? st.turn : side); }
  function canSwap(st) { return !!(st.swap && !st.over && st.n === 1 && !st.swapped && st.turn === BLACK && st.ml[0] !== 'swap'); }
  function hasMove(st, side) { for (var h = 0; h < H; h++) if (!st.b[h] && playable(h, side)) return true; return false; }
  // side's pegs joined by links to h (a flood fill over links): the list of holes
  function linkAdj(st) {
    var adj = {};
    st.lk.forEach(function (id) { var a = LA[id], b = LB[id]; (adj[a] = adj[a] || []).push(b); (adj[b] = adj[b] || []).push(a); });
    return adj;
  }
  function group(st, h, adj) {
    adj = adj || linkAdj(st);
    var seen = {}, out = [h], q = [h]; seen[h] = 1;
    while (q.length) { var x = q.pop(); (adj[x] || []).forEach(function (y) { if (!seen[y]) { seen[y] = 1; out.push(y); q.push(y); } }); }
    return out;
  }
  // A chain from one border to the other through side's links, as a list of holes (the shortest one), or null
  function winChain(st, side) {
    var adj = linkAdj(st), prev = {}, q = [], i;
    for (var h = 0; h < H; h++) if (st.b[h] === side && onStart(h, side)) { prev[h] = -1; q.push(h); }
    for (i = 0; i < q.length; i++) {
      var x = q[i];
      if (onEnd(x, side)) { var out = []; while (x >= 0) { out.unshift(x); x = prev[x]; } return out; }
      (adj[x] || []).forEach(function (y) { if (prev[y] === undefined && st.b[y] === side) { prev[y] = x; q.push(y); } });
    }
    return null;
  }
  // Could side still join its borders, whatever is played from here? Over every hole side may still use (its own pegs
  // and the empty holes it can play), joined by its links and by every link not yet crossed by one on the board. Links
  // are never taken away, so if no such path is left, none ever will be.
  function canConnect(st, side, p) {
    p = p || present(st);
    var seen = new Uint8Array(H), q = [], i;
    function ok(h) { return st.b[h] === side || (!st.b[h] && playable(h, side)); }
    for (var h = 0; h < H; h++) if (onStart(h, side) && ok(h)) { seen[h] = 1; q.push(h); }
    for (i = 0; i < q.length; i++) {
      var x = q[i]; if (onEnd(x, side)) return true;
      var nb = NB[x];
      for (var j = 0; j < nb.length; j++) {
        var y = nb[j][0], id = nb[j][1];
        if (seen[y] || !ok(y)) continue;
        if (!p[id] && crossed(p, id) >= 0) continue;
        seen[y] = 1; q.push(y);
      }
    }
    return false;
  }
  // Place a peg for the side to move (or 'swap'). Changes st; returns {h, side, links, swap} or null when not allowed.
  function play(st, mv) {
    if (st.over) return null;
    var side = st.turn;
    if (mv === 'swap' || mv === -2) {
      if (!canSwap(st)) return null;
      st.swapped = true; st.n++; st.ml.push('swap'); st.last = { swap: 1, side: side };
      return { swap: true, side: side, links: [] };
    }
    var h = typeof mv === 'string' ? hole(mv) : mv;
    if (!canPlace(st, h, side)) return null;
    var w = wouldLink(st, h, side);
    st.b[h] = side;
    var links = w.make.map(function (x) { return x.id; });
    links.forEach(function (id) { st.lk.push(id); });
    st.n++; st.ml.push(name(h));
    st.last = { h: h, side: side, links: links };
    var res = { h: h, side: side, links: links, blocked: w.blocked.map(function (x) { return x.id; }) };
    var ch = links.length ? winChain(st, side) : null;
    if (ch) { st.over = true; st.win = side; st.why = 'connect'; st.chain = ch; res.win = true; return res; }
    var p = present(st);
    if (!canConnect(st, RED, p) && !canConnect(st, BLACK, p)) { st.over = true; st.win = 0; st.why = 'stuck'; res.draw = true; return res; }
    var next = 3 - side;
    if (!hasMove(st, next)) { if (!hasMove(st, side)) { st.over = true; st.win = 0; st.why = 'stuck'; res.draw = true; return res; } res.pass = next; next = side; }
    st.turn = next;
    return res;
  }
  function end(st, why, win) { st.over = true; st.why = why; st.win = win; return st; }
  // every legal move for the side to move, as holes ('swap' first when it is allowed)
  function moves(st) { var out = canSwap(st) ? ['swap'] : []; for (var h = 0; h < H; h++) if (canPlace(st, h)) out.push(h); return out; }
  function count(st, side) { var n = 0; for (var h = 0; h < H; h++) if (st.b[h] === side) n++; return n; }
  // How far side's longest chain of linked pegs reaches across the board toward its other border (rows for Red,
  // columns for Black): {span, from, to, holes}
  function longest(st, side) {
    var adj = linkAdj(st), seen = {}, best = { span: 0, holes: [] };
    for (var h = 0; h < H; h++) {
      if (st.b[h] !== side || seen[h]) continue;
      var g = group(st, h, adj), lo = 99, hi = -1;
      g.forEach(function (x) { seen[x] = 1; var v = side === RED ? rowOf(x) : colOf(x); if (v < lo) lo = v; if (v > hi) hi = v; });
      if (g.length > 1 && hi - lo + 1 > best.span) best = { span: hi - lo + 1, from: lo, to: hi, holes: g };
    }
    return best;
  }

  // ── The computer player ──
  // A board the search can change and change back. The position is weighed by how many more pegs each side needs to
  // join its borders (a shortest path over its pegs, cost 0, and the empty holes it can play, cost 1, joined by its links
  // and by links nothing crosses yet), the other side's count less its own, with a small part for how many holes lie on
  // its shortest paths (more ways through are harder to block). The moves looked at are the holes on either side's
  // shortest paths and near the pegs, best first; Easy, Normal and Hard differ in how far they look and how much noise
  // they add, never in what they can see.
  function Engine(st) {
    var b = new Int8Array(H), pr = new Uint8Array(H * 4), blk = new Int16Array(H * 4), hist = [];
    for (var h = 0; h < H; h++) b[h] = st.b[h];
    function addLink(id) { pr[id] = 1; var x = CROSS[id]; for (var i = 0; i < x.length; i++) blk[x[i]]++; }
    function delLink(id) { pr[id] = 0; var x = CROSS[id]; for (var i = 0; i < x.length; i++) blk[x[i]]--; }
    st.lk.forEach(addLink);
    var E = { b: b, pr: pr, blk: blk };
    E.make = function (h, s) {
      b[h] = s; var nb = NB[h], made = [];
      for (var i = 0; i < nb.length; i++) { var id = nb[i][1]; if (b[nb[i][0]] === s && !blk[id]) { addLink(id); made.push(id); } }
      hist.push(made);
    };
    E.unmake = function (h) { var made = hist.pop(); for (var i = made.length - 1; i >= 0; i--) delLink(made[i]); b[h] = 0; };
    // 0-1 shortest path from side's first border to its second; fills D (from the start) when given
    var DQ = new Int32Array(H * 16);
    function dist(side, D, rev) {
      D.fill(255);
      var head = H * 8, tail = H * 8;
      for (var h = 0; h < H; h++) {
        if (rev ? !onEnd(h, side) : !onStart(h, side)) continue;
        var v = b[h]; if (v && v !== side) continue; if (!v && !playable(h, side)) continue;
        D[h] = v ? 0 : 1; DQ[tail++] = h;
      }
      var best = 255;
      while (head < tail) {
        var x = DQ[head++], dx = D[x];
        if (dx >= best) continue;
        if (rev ? onStart(x, side) : onEnd(x, side)) { if (dx < best) best = dx; continue; }
        var nb = NB[x];
        for (var j = 0; j < nb.length; j++) {
          var y = nb[j][0], id = nb[j][1], vy = b[y];
          if (vy && vy !== side) continue;
          if (!vy && !playable(y, side)) continue;
          if (!pr[id] && blk[id]) continue;
          var nd = dx + (vy ? 0 : 1);
          if (nd < D[y]) { D[y] = nd; if (vy) DQ[--head] = y; else DQ[tail++] = y; }
        }
      }
      return best;
    }
    var DA = new Uint8Array(H), DB = new Uint8Array(H), DC = new Uint8Array(H), DD = new Uint8Array(H);
    E.dist = function (side) { return dist(side, DA, false); };
    // the empty holes on side's shortest paths: {d, holes}
    E.crit = function (side, slack) {
      var d1 = dist(side, DA, false), d2 = dist(side, DB, true), out = [];
      if (d1 >= 255) return { d: 255, holes: out };
      for (var h = 0; h < H; h++) if (!b[h] && DA[h] < 255 && DB[h] < 255 && DA[h] + DB[h] - 1 <= d1 + (slack || 0)) out.push(h);
      return { d: d1, holes: out };
    };
    // the weight of the position for side (to move): the other's pegs to go less its own, and a little for the width
    // of its shortest paths
    E.evaluate = function (side) {
      var me = dist(side, DA, false), op = dist(3 - side, DC, false);
      if (me === 0) return WIN; if (op === 0) return -WIN;
      if (me >= 255 && op >= 255) return 0;
      if (me >= 255) return -WIN / 4 - op; if (op >= 255) return WIN / 4 + me;
      dist(side, DB, true); dist(3 - side, DD, true);
      var wm = 0, wo = 0;
      for (var h = 0; h < H; h++) {
        if (b[h]) continue;
        if (DA[h] + DB[h] - 1 === me) wm++;
        if (DC[h] + DD[h] - 1 === op) wo++;
      }
      // a side to move is about half a peg ahead
      return (op - me) * 100 + 50 + Math.round((Math.min(wm, 60) - Math.min(wo, 60)) * 1.5);
    };
    return E;
  }
  var WIN = 100000, STOP = {};
  function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  // Candidate holes for side to move: on either side's shortest paths (slack 1 for its own), plus the holes a knight's
  // move or one step from the last pegs, cheapest first by how near they lie to the pegs on the board
  function candidates(E, side, lastH, cap) {
    var me = E.crit(side, 0), op = E.crit(3 - side, 0), sc = new Float32Array(H), mark = new Uint8Array(H), out = [];
    function add(h, v) { if (E.b[h] || !playable(h, side)) return; if (!mark[h]) { mark[h] = 1; out.push(h); } sc[h] += v; }
    me.holes.forEach(function (h) { add(h, 3); });
    op.holes.forEach(function (h) { add(h, 3); });
    (lastH || []).forEach(function (L, i) {
      if (L < 0) return;
      var w = i === 0 ? 2 : 1;
      NB[L].forEach(function (e) { add(e[0], w); });
      var r = rowOf(L), c = colOf(L);
      for (var dr = -2; dr <= 2; dr++) for (var dc = -2; dc <= 2; dc++) { var rr = r + dr, cc = c + dc; if (rr >= 0 && rr < N && cc >= 0 && cc < N && (dr || dc)) add(rr * N + cc, 0.5); }
    });
    out.sort(function (a, c) { return sc[c] - sc[a]; });
    return cap ? out.slice(0, cap) : out;
  }
  // The opening peg, for the side that places the first one: away from the middle when the other side may swap it,
  // in the middle when it may not
  function opening(st, rnd) {
    if (st.swap) {
      // a peg near one of its own border rows, toward the middle: fair enough that a swap gains little
      var r = rnd() < 0.5 ? 2 + Math.floor(rnd() * 2) : N - 3 - Math.floor(rnd() * 2), c = 7 + Math.floor(rnd() * 10);
      return r * N + c;
    }
    return (9 + Math.floor(rnd() * 6)) * N + 9 + Math.floor(rnd() * 6);
  }
  // Swap when Red's first peg is worth more than a move: in the middle part of the board
  function wantSwap(st) {
    var h = -1; for (var i = 0; i < H; i++) if (st.b[i]) { h = i; break; }
    if (h < 0) return false;
    var r = rowOf(h), c = colOf(h);
    return c >= 5 && c <= 18 && r >= 4 && r <= 19;
  }
  function search(st, o) {
    o = o || {};
    var side = st.turn, rnd = o.seed != null ? mulberry(o.seed) : Math.random, now = o.now || Date.now;
    if (st.over) return null;
    if (canSwap(st) && o.level !== 'easy' && wantSwap(st)) return { move: 'swap', score: 0, depth: 0 };
    var pegs = 0; for (var i = 0; i < H; i++) if (st.b[i]) pegs++;
    if (!pegs) return { move: opening(st, rnd), score: 0, depth: 0 };
    var E = Engine(st), t0 = now(), limit = o.time || 1000, maxD = o.depth || 2, nodes = 0, noise = o.noise || 0;
    var lastH = []; for (var k = st.ml.length - 1; k >= 0 && lastH.length < 3; k--) { var hh = hole(st.ml[k]); if (hh >= 0) lastH.push(hh); }
    function tick() { if ((++nodes & 15) === 0 && now() - t0 > limit) throw STOP; }
    function ab(sd, depth, alpha, beta, ply, last) {
      tick();
      var v0 = E.evaluate(sd);
      if (Math.abs(v0) >= WIN) return v0 > 0 ? WIN - ply : -WIN + ply;
      if (depth <= 0) return v0;
      var cs = candidates(E, sd, last, o.inner || 10);
      if (!cs.length) return v0;
      var best = -Infinity;
      for (var i = 0; i < cs.length; i++) {
        E.make(cs[i], sd);
        var v = -ab(3 - sd, depth - 1, -beta, -alpha, ply + 1, [cs[i]].concat(last.slice(0, 1)));
        E.unmake(cs[i]);
        if (v > best) best = v;
        if (v > alpha) alpha = v;
        if (alpha >= beta) break;
      }
      return best;
    }
    // the root: every candidate weighed one move deep first (that is Easy's whole look), the best few searched deeper
    var root = candidates(E, side, lastH, o.root || 60).map(function (h) {
      E.make(h, side); var v = -E.evaluate(3 - side); E.unmake(h);
      if (Math.abs(v) >= WIN) v = v > 0 ? WIN : -WIN;
      return { h: h, v: v, n: (rnd() * 2 - 1) * noise };
    });
    if (!root.length) { var any = moves(st).filter(function (m) { return m !== 'swap'; }); return any.length ? { move: any[Math.floor(rnd() * any.length)], score: 0, depth: 0 } : null; }
    root.sort(function (a, c) { return (c.v + c.n) - (a.v + a.n); });
    for (var w = 0; w < root.length; w++) if (root[w].v >= WIN) return { move: root[w].h, score: WIN, depth: 1, nodes: nodes };
    var best = root[0], done = 1;
    if (maxD > 1) {
      var keep = root.slice(0, o.wide || 12);
      for (var d = 2; d <= maxD; d++) {
        try {
          var cur = null, curS = -Infinity;
          for (var j = 0; j < keep.length; j++) {
            var m = keep[j];
            E.make(m.h, side);
            var v = -ab(3 - side, d - 1, -WIN - 1, -(cur ? curS - 2 * noise - 1 : -WIN - 1), 1, [m.h].concat(lastH.slice(0, 1)));
            E.unmake(m.h);
            m.d = v;
            var vn = v + (Math.abs(v) > WIN / 2 ? 0 : m.n);
            if (!cur || vn > curS) { cur = m; curS = vn; }
          }
          best = cur; done = d;
          keep.sort(function (a, c) { return (c === best ? 1e9 : c.d) - (a === best ? 1e9 : a.d); });
          if (Math.abs(curS) > WIN / 2) break;
          if (now() - t0 > limit * 0.4) break;
        } catch (e) { if (e !== STOP) throw e; break; }
      }
    }
    return { move: best.h, score: best.d != null ? best.d : best.v, depth: done, nodes: nodes };
  }
  // How many more pegs each side needs, as the computer weighs it (the room's "pegs to go"): {1: n, 2: n}, 99 = can't
  function toGo(st) { var E = Engine(st), a = E.dist(RED), b = E.dist(BLACK); return { 1: a >= 255 ? 99 : a, 2: b >= 255 ? 99 : b }; }
  var LEVELS = {
    easy: { level: 'easy', depth: 1, time: 400, noise: 150, root: 30 },
    normal: { level: 'normal', depth: 3, time: 1400, noise: 12, root: 50, wide: 9, inner: 7 },
    hard: { level: 'hard', depth: 5, time: 3000, noise: 0, root: 60, wide: 12, inner: 8 }
  };

  var API = {
    N: N, H: H, RED: RED, BLACK: BLACK, DIR: DIR, COLS: COLS, CORNER: CORNER, NB: NB, CROSS: CROSS, LEVELS: LEVELS, WIN: WIN,
    rowOf: rowOf, colOf: colOf, name: name, hole: hole, playable: playable, onStart: onStart, onEnd: onEnd, ends: ends,
    newGame: newGame, present: present, crossed: crossed, wouldLink: wouldLink, canPlace: canPlace, canSwap: canSwap, hasMove: hasMove,
    linkAdj: linkAdj, group: group, winChain: winChain, canConnect: canConnect, play: play, end: end, moves: moves, count: count, longest: longest,
    Engine: Engine, candidates: candidates, search: search, toGo: toGo, wantSwap: wantSwap
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.TwixtCore = API;
})(typeof self !== 'undefined' ? self : this);
