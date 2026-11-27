// Entropy: the rules and the computer player (window.EntropyCore, or require() in Node; CLAUDE.md, Entropy).
// Plain JSON state, so the same code runs in the page, at the TurnNet table, in the Web Worker and in
// scripts/entropy-sim.js.
//
// Eric Solomon's Entropy (published as Hyle and, on the 7 by 7 board, Hyle7). Two roles, Order and Chaos:
//   - The board is sz by sz (7, or 5), with sz chips of each of sz colors in a bag (49 or 25 chips).
//   - Chaos draws a chip from the bag at random (both players see it) and puts it on any empty square.
//   - Then Order may slide any one chip on the board, its own or not (every chip is neutral), any number of empty
//     squares in a straight line along a row or a column, as a rook moves, never over another chip; or pass.
//   - When the board is full (Chaos's last chip), Order scores every palindrome in every row and column: every run of
//     two or more chips side by side that reads the same both ways scores its length, and runs inside runs and runs
//     that overlap all count (red-blue-red scores 3; red-blue-blue-red scores 4 for itself and 2 for blue-blue).
//   - Then the players change roles and play a second game. Whoever scored more as Order wins; equal is a draw.
// The board's square i = r * sz + c, r 0 the top row and c 0 the left column. Squares are named as on a chess board:
// a column letter (a at the left) and a row number (1 at the bottom): a1 is the bottom left.
//
// State: {v, sz, seed, rs (the bag's random state: every draw comes from it, so every device draws the same chip),
//   g (0 or 1, the game of the match), ord: [seat who is Order in game 0, in game 1], b: [sz*sz] (0 empty, 1..sz a
//   color), bag: [sz] (chips left of each color, not counting the one drawn), chip (the color drawn, waiting to be
//   placed; 0 none), ph ('place': Chaos's turn | 'slide': Order's), n (moves this game), ml: ['3d4', 'd4-d7', 'pass',
//   ...] (this game's moves: a placement is the color then the square), gm: [{b: '0123..', ml: '...', sc, o}] (the
//   games finished: the final board as digits, the moves, Order's score and Order's seat), over, win (seat, -1 a draw),
//   last}
(function (root) {
  'use strict';
  var COLS = 'abcdefghij';
  // a small, quick generator for the bag (mulberry32 on a 32-bit state kept in the game's state)
  function rnd(st) {
    var t = (st.rs = (st.rs + 0x6D2B79F5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function name(i, sz) { return COLS.charAt(i % sz) + (sz - Math.floor(i / sz)); }
  function sq(nm, sz) {
    var m = /^([a-j])(\d+)$/.exec(String(nm || '')); if (!m) return -1;
    var c = COLS.indexOf(m[1]), r = sz - +m[2];
    return c < sz && r >= 0 && r < sz ? r * sz + c : -1;
  }
  // the board's lines: every row (top to bottom, each left to right), then every column (left to right, each top down)
  var LINES = {};
  function lines(sz) {
    if (LINES[sz]) return LINES[sz];
    var L = [], r, c;
    for (r = 0; r < sz; r++) { var a = []; for (c = 0; c < sz; c++) a.push(r * sz + c); L.push(a); }
    for (c = 0; c < sz; c++) { var b = []; for (r = 0; r < sz; r++) b.push(r * sz + c); L.push(b); }
    return (LINES[sz] = L);
  }
  function lineName(k, sz) { return k < sz ? 'row ' + (sz - k) : 'column ' + COLS.charAt(k - sz); }

  // ── Scoring ──────────────────────────────────────────────────────────────
  // The palindromes in one line of colors (0 = empty): every run of 2 or more filled squares that reads the same both
  // ways, found by growing each one from its middle, so runs inside runs are found too. Calls fn(start, length).
  function eachRun(v, fn) {
    var n = v.length, i, a, e;
    for (i = 0; i < n; i++) {
      // odd lengths, round square i
      for (a = i - 1, e = i + 1; a >= 0 && e < n && v[a] && v[i] && v[a] === v[e]; a--, e++) fn(a, e - a + 1);
      // even lengths, round the gap after square i
      for (a = i, e = i + 1; a >= 0 && e < n && v[a] && v[a] === v[e]; a--, e++) fn(a, e - a + 1);
    }
  }
  function lineScore(v) { var s = 0; eachRun(v, function (a, len) { s += len; }); return s; }
  // Order's score on a board (the final score once it is full; while it fills, the palindromes standing now):
  // {total, runs: [[line, start, length]], lines: [each line's points]}
  function score(b, sz) {
    var L = lines(sz), total = 0, runs = [], per = [];
    L.forEach(function (ln, k) {
      var v = ln.map(function (i) { return b[i]; }), s = 0;
      eachRun(v, function (a, len) { s += len; runs.push([k, a, len]); });
      per.push(s); total += s;
    });
    return { total: total, runs: runs, lines: per };
  }
  function total(b, sz) { var L = lines(sz), t = 0; for (var k = 0; k < L.length; k++) { var ln = L[k], v = []; for (var j = 0; j < ln.length; j++) v.push(b[ln[j]]); t += lineScore(v); } return t; }

  // ── The game ─────────────────────────────────────────────────────────────
  function newMatch(o) {
    o = o || {};
    var sz = o.sz === 5 ? 5 : 7, seed = (o.seed == null ? Math.floor(Math.random() * 4294967296) : o.seed) >>> 0;
    var st = { v: 1, sz: sz, seed: seed, rs: seed, g: 0, ord: [o.first ? 1 : 0, o.first ? 0 : 1], b: [], bag: [], chip: 0, ph: 'place', n: 0, ml: [], gm: [], over: false, win: -1, last: null };
    freshBoard(st);
    return st;
  }
  function freshBoard(st) {
    var i; st.b = []; st.bag = [];
    for (i = 0; i < st.sz * st.sz; i++) st.b.push(0);
    for (i = 0; i < st.sz; i++) st.bag.push(st.sz);
    st.ph = 'place'; st.n = 0; st.ml = []; st.chip = 0;
    draw(st);
  }
  function left(st) { var t = 0; for (var i = 0; i < st.bag.length; i++) t += st.bag[i]; return t; }
  function empties(st) { var e = []; for (var i = 0; i < st.b.length; i++) if (!st.b[i]) e.push(i); return e; }
  // Chaos draws: a chip at random from those left in the bag
  function draw(st) {
    var t = left(st); if (!t) { st.chip = 0; return 0; }
    var r = Math.floor(rnd(st) * t), c = 0;
    while (r >= st.bag[c]) { r -= st.bag[c]; c++; }
    st.bag[c]--; st.chip = c + 1;
    return st.chip;
  }
  function seatToMove(st) { if (st.over) return -1; var o = st.ord[st.g]; return st.ph === 'slide' ? o : 1 - o; }
  function roleOf(st, seat, g) { return st.ord[g == null ? st.g : g] === seat ? 'order' : 'chaos'; }
  // Order's slides: for each chip, each square it can reach along its row and column through empty squares
  function slides(b, sz) {
    var out = [], n = sz * sz;
    for (var i = 0; i < n; i++) {
      if (!b[i]) continue;
      var r = (i / sz) | 0, c = i % sz, j;
      for (j = c + 1; j < sz && !b[r * sz + j]; j++) out.push([i, r * sz + j]);
      for (j = c - 1; j >= 0 && !b[r * sz + j]; j--) out.push([i, r * sz + j]);
      for (j = r + 1; j < sz && !b[j * sz + c]; j++) out.push([i, j * sz + c]);
      for (j = r - 1; j >= 0 && !b[j * sz + c]; j--) out.push([i, j * sz + c]);
    }
    return out;
  }
  function canSlide(b, sz, f, t) {
    if (f < 0 || t < 0 || f === t || !b[f] || b[t]) return false;
    var r1 = (f / sz) | 0, c1 = f % sz, r2 = (t / sz) | 0, c2 = t % sz, d, k;
    if (r1 === r2) { d = c2 > c1 ? 1 : -1; for (k = c1 + d; k !== c2 + d; k += d) if (b[r1 * sz + k]) return false; return true; }
    if (c1 === c2) { d = r2 > r1 ? 1 : -1; for (k = r1 + d; k !== r2 + d; k += d) if (b[k * sz + c1]) return false; return true; }
    return false;
  }
  // A move: a square's name for Chaos's placement ('d4'), 'd4-d7' for Order's slide, or 'pass'. Returns what happened
  // ({t: 'place'|'slide'|'pass', c, i | f, to, gain, sc, drew, auto: {i, c}, end: {g, sc}, over}), or null if illegal.
  function play(st, mv) {
    if (st.over) return null;
    var sz = st.sz, res, before = total(st.b, sz), m;
    if (st.ph === 'place') {
      var i = typeof mv === 'number' ? mv : sq(mv, sz);
      if (i < 0 || st.b[i] || !st.chip) return null;
      st.b[i] = st.chip; st.ml.push(st.chip + name(i, sz)); st.n++;
      res = { t: 'place', c: st.chip, i: i, seat: 1 - st.ord[st.g] };
      st.chip = 0; st.ph = 'slide';
    } else {
      if (mv === 'pass') { res = { t: 'pass', seat: st.ord[st.g] }; st.ml.push('pass'); }
      else {
        var f, t;
        if (Array.isArray(mv)) { f = mv[0]; t = mv[1]; }
        else if ((m = /^([a-j]\d+)-([a-j]\d+)$/.exec(String(mv)))) { f = sq(m[1], sz); t = sq(m[2], sz); }
        else return null;
        if (!canSlide(st.b, sz, f, t)) return null;
        st.b[t] = st.b[f]; st.b[f] = 0; st.ml.push(name(f, sz) + '-' + name(t, sz));
        res = { t: 'slide', c: st.b[t], f: f, to: t, seat: st.ord[st.g] };
      }
      st.n++; st.ph = 'place';
      res.drew = draw(st);
      // the last chip has one square to go to: it goes there at once
      var e = empties(st);
      if (e.length === 1 && st.chip) {
        res.auto = { i: e[0], c: st.chip };
        st.b[e[0]] = st.chip; st.ml.push(st.chip + name(e[0], sz)); st.n++; st.chip = 0;
      }
    }
    var after = total(st.b, sz);
    res.gain = after - before; res.sc = after;
    st.last = { t: res.t, i: res.i, f: res.f, to: res.to, auto: res.auto ? res.auto.i : undefined };
    if (empties(st).length === 0) endGame(st, res);
    return res;
  }
  function endGame(st, res) {
    var sc = total(st.b, st.sz);
    st.gm.push({ b: st.b.join(''), ml: st.ml.join(' '), sc: sc, o: st.ord[st.g] });
    res.end = { g: st.g, sc: sc, b: st.b.slice() };
    if (st.g === 0) { st.g = 1; st.last = null; freshBoard(st); }
    else {
      st.over = true; st.chip = 0;
      var s0 = 0, s1 = 0;
      st.gm.forEach(function (x) { if (x.o === 0) s0 += x.sc; else s1 += x.sc; });
      st.win = s0 > s1 ? 0 : s1 > s0 ? 1 : -1;
      res.over = true;
    }
  }
  // each seat's points as Order: [seat 0, seat 1] (a game being played counts what stands on its board now)
  function points(st) {
    var p = [0, 0];
    st.gm.forEach(function (x) { p[x.o] += x.sc; });
    if (!st.over) p[st.ord[st.g]] += total(st.b, st.sz);
    return p;
  }
  // a recorded game played back square by square: boards[k] after k moves
  function replay(sz, ml) {
    var b = []; for (var i = 0; i < sz * sz; i++) b.push(0);
    var out = [b.slice()], moves = [];
    String(ml || '').split(' ').filter(Boolean).forEach(function (tok) {
      var m;
      if (tok === 'pass') moves.push({ t: 'pass' });
      else if ((m = /^(\d)([a-j]\d+)$/.exec(tok))) { var j = sq(m[2], sz); b[j] = +m[1]; moves.push({ t: 'place', i: j, c: +m[1] }); }
      else if ((m = /^([a-j]\d+)-([a-j]\d+)$/.exec(tok))) { var f = sq(m[1], sz), t = sq(m[2], sz); b[t] = b[f]; b[f] = 0; moves.push({ t: 'slide', f: f, to: t, c: b[t] }); }
      out.push(b.slice());
    });
    return { boards: out, moves: moves };
  }

  // ── The computer ─────────────────────────────────────────────────────────
  // It weighs a board by what Order can expect from it: every run of 2 or more squares in every line counts its length
  // times the chance it ends up a palindrome if its empty squares were filled from the bag at random (a pair of filled
  // squares that differ: no chance; a filled square opposite an empty one: the share of that color left in the bag; two
  // empty squares: the chance two chips drawn match). Order wants this high and Chaos low. Normal looks at its own move;
  // Hard looks at the answer too: Chaos at Order's best slide after each placement, and Order at every chip the bag
  // could give next and Chaos's worst placement of it. Easy plays a weaker move much of the time.
  function Ctx(st) {
    var sz = st.sz, k = sz, q = [0], q2 = 0, t = 0, i;
    for (i = 0; i < k; i++) t += st.bag[i];
    for (i = 0; i < k; i++) { var p = t ? st.bag[i] / t : 0; q.push(p); q2 += p * p; }
    if (!t) { for (i = 1; i <= k; i++) q[i] = 0; q2 = 0; }
    return { sz: sz, L: lines(sz), q: q, q2: q2, LR: [], LC: [], v: new Array(sz) };
  }
  function lineH(cx, b, ln) {
    var n = ln.length, v = cx.v, i, a, e, s = 0, q = cx.q, q2 = cx.q2;
    for (i = 0; i < n; i++) v[i] = b[ln[i]];
    for (a = 0; a < n - 1; a++) {
      for (e = a + 1; e < n; e++) {
        var p = 1, x, y, lo = a, hi = e;
        while (lo < hi) {
          x = v[lo]; y = v[hi];
          if (x && y) { if (x !== y) { p = 0; break; } }
          else if (x || y) p *= q[x || y];
          else p *= q2;
          if (p < 1e-4) { p = 0; break; }
          lo++; hi--;
        }
        if (p) {
          // the middle square of an odd run must be filled too, but any color will do
          s += (e - a + 1) * p;
        }
      }
    }
    return s;
  }
  function evalB(cx, b) { var s = 0; for (var k = 0; k < cx.L.length; k++) s += lineH(cx, b, cx.L[k]); return s; }
  // the lines a move touches: a square's row and column; a slide's row or column and the two crossing it
  function linesOf(sz, a, c) {
    var ra = (a / sz) | 0, ca = a % sz;
    if (c == null) return [ra, sz + ca];
    var rc = (c / sz) | 0, cc = c % sz;
    return ra === rc ? [ra, sz + ca, sz + cc] : [sz + ca, ra, rc];
  }
  function partH(cx, b, ks) { var s = 0; for (var i = 0; i < ks.length; i++) s += lineH(cx, b, cx.L[ks[i]]); return s; }
  // Chaos placing color col: the change in the weight for each empty square
  function placeDeltas(cx, b, col) {
    var out = [], sz = cx.sz;
    for (var i = 0; i < b.length; i++) {
      if (b[i]) continue;
      var ks = linesOf(sz, i), h0 = partH(cx, b, ks);
      b[i] = col; var h1 = partH(cx, b, ks); b[i] = 0;
      out.push([i, h1 - h0]);
    }
    return out;
  }
  // Order's slides with the change in the weight each makes (pass first, at 0)
  function slideDeltas(cx, b) {
    var out = [['pass', 0]], sz = cx.sz, sl = slides(b, sz);
    for (var j = 0; j < sl.length; j++) {
      var f = sl[j][0], t = sl[j][1], ks = linesOf(sz, f, t), h0 = partH(cx, b, ks);
      b[t] = b[f]; b[f] = 0; var h1 = partH(cx, b, ks); b[f] = b[t]; b[t] = 0;
      out.push([sl[j], h1 - h0]);
    }
    return out;
  }
  // Expert's look one step further: the chip the bag gives next, each color by its chance, against Chaos's few most
  // careful placements of it, each answered by Order's best slide after it
  function chipLook(cx, st, b, k) {
    var tot = 0, ev = 0, sz = cx.sz;
    for (var c = 1; c <= sz; c++) tot += st.bag[c - 1];
    if (!tot) return 0;
    for (c = 1; c <= sz; c++) {
      if (!st.bag[c - 1]) continue;
      var pc = placeDeltas(cx, b, c).sort(function (x, y) { return x[1] - y[1]; }), mn = Infinity;
      for (var z = 0; z < Math.min(k, pc.length); z++) {
        b[pc[z][0]] = c;
        var sd = slideDeltas(cx, b), mx = 0;
        for (var j = 0; j < sd.length; j++) if (sd[j][1] > mx) mx = sd[j][1];
        b[pc[z][0]] = 0;
        if (pc[z][1] + mx < mn) mn = pc[z][1] + mx;
      }
      ev += st.bag[c - 1] / tot * (mn === Infinity ? 0 : mn);
    }
    return ev;
  }
  function chipNext(cx, st, b) {
    var tot = 0, ev = 0, sz = cx.sz, bag = st.bag;
    for (var c = 1; c <= sz; c++) tot += Math.max(0, bag[c - 1]);
    if (!tot) return 0;
    for (c = 1; c <= sz; c++) {
      if (bag[c - 1] <= 0) continue;
      var pc = placeDeltas(cx, b, c), mn = Infinity;
      for (var z = 0; z < pc.length; z++) if (pc[z][1] < mn) mn = pc[z][1];
      ev += bag[c - 1] / tot * (mn === Infinity ? 0 : mn);
    }
    return ev;
  }
  function bestOf(list, sign, noise, rng) {
    var best = null, bv = -Infinity;
    for (var i = 0; i < list.length; i++) {
      var v = sign * list[i][1] + (noise ? (rng() - 0.5) * noise : 0) + rng() * 1e-6;
      if (v > bv) { bv = v; best = list[i]; }
    }
    return best;
  }
  function seeded(seed) {
    var o = { rs: (seed >>> 0) || 1 };
    return function () { return rnd(o); };
  }
  function now() { return typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now(); }
  // search(st, {level, seed, time}) → {move: 'd4' | 'd4-d7' | 'pass', role}
  function search(st, o) {
    o = o || {};
    var L = LEVELS[o.level] || LEVELS.normal, rng = seeded(o.seed == null ? 12345 : o.seed), sz = st.sz;
    var b = st.b.slice(), cx = Ctx(st);
    if (st.ph === 'place') {
      var pd = placeDeltas(cx, b, st.chip);
      if (pd.length === 1) return { move: name(pd[0][0], sz), role: 'chaos' };
      var pick;
      if (L.rand && rng() < L.rand) pick = pd[Math.floor(rng() * pd.length)];
      else if (L.depth >= 3) {
        // each placement against Order's few best slides after it, each slide followed by the next chip (chipLook)
        pd.sort(function (x, y) { return x[1] - y[1]; });
        var cnd = pd.slice(0, L.wide), te = now(), bE = Infinity;
        pick = cnd[0];
        for (var ie = 0; ie < cnd.length; ie++) {
          var sqE = cnd[ie][0];
          b[sqE] = st.chip;
          var sdE = slideDeltas(cx, b).sort(function (x, y) { return y[1] - x[1]; }), mxE = -Infinity;
          for (var je = 0; je < Math.min(L.reply, sdE.length); je++) {
            var se = sdE[je][0], fe = -1, toe = -1;
            if (se !== 'pass') { fe = se[0]; toe = se[1]; b[toe] = b[fe]; b[fe] = 0; }
            var ve = sdE[je][1] + (left(st) > 0 ? chipNext(cx, st, b) : 0);
            if (se !== 'pass') { b[fe] = b[toe]; b[toe] = 0; }
            if (ve > mxE) mxE = ve;
          }
          b[sqE] = 0;
          var vE = cnd[ie][1] + (mxE === -Infinity ? 0 : mxE) + rng() * 1e-6;
          if (vE < bE) { bE = vE; pick = cnd[ie]; }
          if (now() - te > L.time) break;
        }
      } else if (L.depth >= 2) {
        // each placement against Order's best slide after it (the best few placements by themselves first)
        pd.sort(function (x, y) { return x[1] - y[1]; });
        var cand = pd.slice(0, L.wide || 14), t0 = now(), bestV = Infinity;
        pick = cand[0];
        for (var i = 0; i < cand.length; i++) {
          var sqI = cand[i][0];
          b[sqI] = st.chip;
          var sd = slideDeltas(cx, b), mx = 0;
          for (var j = 0; j < sd.length; j++) if (sd[j][1] > mx) mx = sd[j][1];
          b[sqI] = 0;
          var v = cand[i][1] + mx + rng() * 1e-6;
          if (v < bestV) { bestV = v; pick = cand[i]; }
          if (now() - t0 > (L.time || 1500)) break;
        }
      } else pick = bestOf(pd, -1, L.noise, rng);
      return { move: name(pick[0], sz), role: 'chaos' };
    }
    // Order
    var sdl = slideDeltas(cx, b), mv;
    if (L.rand && rng() < L.rand) mv = rng() < 0.35 ? sdl[0] : sdl[Math.floor(rng() * sdl.length)];
    else if (L.depth >= 3 && left(st) > 0) {
      sdl.sort(function (x, y) { return y[1] - x[1]; });
      var cE = sdl.slice(0, L.wide), tO = now(), bO = -Infinity;
      mv = cE[0];
      for (var aE = 0; aE < cE.length; aE++) {
        var sO = cE[aE][0], fO = -1, tO2 = -1;
        if (sO !== 'pass') { fO = sO[0]; tO2 = sO[1]; b[tO2] = b[fO]; b[fO] = 0; }
        var evO = chipLook(cx, st, b, L.reply);
        if (sO !== 'pass') { b[fO] = b[tO2]; b[tO2] = 0; }
        var valO = cE[aE][1] + evO + rng() * 1e-6;
        if (valO > bO) { bO = valO; mv = cE[aE]; }
        if (now() - tO > L.time) break;
      }
    } else if (L.depth >= 2 && left(st) > 0) {
      sdl.sort(function (x, y) { return y[1] - x[1]; });
      var cands = sdl.slice(0, L.wide || 24), tot = left(st), t1 = now(), bv = -Infinity;
      mv = cands[0];
      for (var a = 0; a < cands.length; a++) {
        var s = cands[a][0], f = -1, to = -1;
        if (s !== 'pass') { f = s[0]; to = s[1]; b[to] = b[f]; b[f] = 0; }
        // the chip the bag gives next, each color by its chance, and Chaos's worst placement of it for Order
        var ev = 0;
        for (var c = 1; c <= sz; c++) {
          if (!st.bag[c - 1]) continue;
          var pc = placeDeltas(cx, b, c), mn = Infinity;
          for (var z = 0; z < pc.length; z++) if (pc[z][1] < mn) mn = pc[z][1];
          ev += st.bag[c - 1] / tot * (mn === Infinity ? 0 : mn);
        }
        if (s !== 'pass') { b[f] = b[to]; b[to] = 0; }
        var val = cands[a][1] + ev + rng() * 1e-6;
        if (val > bv) { bv = val; mv = cands[a]; }
        if (now() - t1 > (L.time || 1500)) break;
      }
    } else if (L.greedy) {
      // weaker: only the palindromes a slide makes now, not what it sets up
      var cur = total(b, sz), best = null, bs = -Infinity, sl2 = slides(b, sz);
      [['pass']].concat(sl2.map(function (x) { return [x]; })).forEach(function (m) {
        var s2 = m[0], g = 0;
        if (s2 !== 'pass') { b[s2[1]] = b[s2[0]]; b[s2[0]] = 0; g = total(b, sz) - cur; b[s2[0]] = b[s2[1]]; b[s2[1]] = 0; }
        var v2 = g + (rng() - 0.5) * (L.noise || 0);
        if (v2 > bs) { bs = v2; best = s2; }
      });
      mv = [best];
    } else mv = bestOf(sdl, 1, L.noise, rng);
    var m0 = mv[0];
    return { move: m0 === 'pass' ? 'pass' : name(m0[0], sz) + '-' + name(m0[1], sz), role: 'order' };
  }
  var LEVELS = {
    easy: { level: 'easy', depth: 1, rand: 0.6, noise: 5, greedy: 1 },
    normal: { level: 'normal', depth: 1, noise: 0.15 },
    hard: { level: 'hard', depth: 2, wide: 24, time: 1800 },
    expert: { level: 'expert', depth: 3, wide: 30, reply: 4, time: 2200 }
  };

  var API = {
    COLS: COLS, LEVELS: LEVELS, lines: lines, lineName: lineName, name: name, sq: sq, eachRun: eachRun, lineScore: lineScore,
    score: score, total: total, newMatch: newMatch, left: left, empties: empties, seatToMove: seatToMove, roleOf: roleOf,
    slides: slides, canSlide: canSlide, play: play, points: points, replay: replay, search: search, evalBoard: function (st) { return evalB(Ctx(st), st.b); }
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.EntropyCore = API;
})(typeof self !== 'undefined' ? self : this);
