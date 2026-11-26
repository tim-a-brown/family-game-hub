// ═══════════════════════════════════════════════════════════════════════════
// Continuo: the rules and the computer players, in plain JSON state. The same code runs in the page
// (games/continuo.html), at an online table (TurnNet: each move is made inside the table's transaction), in a Web Worker
// for the computer's search, and in Node (scripts/continuo-sim.js plays thousands of games with it).
// Continuo was designed by Maureen Hiron and is published by David Westnedge Ltd (included with the publisher's written
// permission, for the family's own use).
//
// The cards (Wikipedia; the review in Jeux & Stratégie 21, June 1983, with its photograph of a game):
//   42 square cards, each a grid of 4 by 4 small squares in four colors, red, yellow, green and blue. Every card has the
//   same motif in two or three colors, and no two cards have the same colors in it. The motif, read off the photograph:
//   each corner square has an L of three squares round it; the top left and bottom right corners are one color (a) with
//   their Ls another (b), the top right and bottom left Ls a third (c) with their corners a fourth (d):
//        a b c d        so a card is the four colors (a, b, c, d) with a ≠ b, b ≠ c and c ≠ d (each part
//        b b c c        differs from the parts it touches), two or three colors in all. A quarter turn reads
//        c c b b        it as (d, c, b, a), and a half turn changes nothing, so a card lies two ways. That
//        d c b a        gives 84 color orders with two or three colors, two to a card: 42 cards (TILES).
// Play:
//   The deck is shuffled face down and its top card is turned up in the middle of the table (at 0, 0 here).
//   In turn, each player takes the top card and puts it down touching at least one card already on the table, squares
//   lined up with the squares on the table. Wherever its squares touch squares of other cards along a side, the colors
//   must match. The card may be offset along the cards it touches (the cards need not form a rectangle) and may touch
//   only one square. A card can be turned before it goes down.
// Scoring:
//   A chain is a run of squares of one color touching along their sides, across cards. Each chain the new card extends
//   (that is, a chain with squares on the new card and on at least one other card) scores its whole length in squares;
//   two chains joined by the new card are one chain and score once (a chain of 12 made 14 by the new card scores 14).
// The end: when the last card is down. The highest score wins; equal scores share the win.
// Not in the sources here: what happens to a card that fits nowhere (here it goes under the deck and the player draws
// again; a card that still fits nowhere once every card left has been tried that turn is set aside, out of the game); a hand of more than one card (here a house option, 'hand': hold up to that many,
// put one down, draw back up).
//
// State: {v, np, hand, deck [card ids, top first], hands [[ids] per player], pl [[card, o, x, y, player, points]]
//   (the cards down in order; the first is the start card, player -1), turn, n (cards put down by players), sc [points],
//   over, win [players], ml [move strings], aside [card ids set aside], best [best move points per player], ut (cards
//   put under the deck this turn)}
// Moves: 'card@x,y' for a card the first way round, 'card@x,y/' turned a quarter; 'card-' puts a card that fits nowhere
// under the deck (the player draws again), or aside once every card left has been tried.
// (x, y) is the card's top left square; x grows right and y down.
// ═══════════════════════════════════════════════════════════════════════════
(function (root) {
  'use strict';
  var COLORS = ['red', 'yellow', 'green', 'blue'];
  var COLOR_NAMES = ['Red', 'Yellow', 'Green', 'Blue'];
  // the 42 cards: [a, b, c, d], each read the way that comes first in order (a b c d before d c b a)
  var TILES = (function () {
    var out = [];
    for (var a = 0; a < 4; a++) for (var b = 0; b < 4; b++) for (var c = 0; c < 4; c++) for (var d = 0; d < 4; d++) {
      if (a === b || b === c || c === d) continue;
      var k = [a, b, c, d], u = {}; k.forEach(function (x) { u[x] = 1; });
      if (Object.keys(u).length > 3) continue;
      var s = '' + a + b + c + d, r = '' + d + c + b + a;
      if (s > r) continue;
      out.push(k);
    }
    return out;
  })();
  // the parts of a card: which part each square is in (row by row), and which of a, b, c, d colors it
  var REG = [0, 1, 2, 3, 1, 1, 2, 2, 5, 5, 6, 6, 4, 5, 6, 7];
  var REGK = [0, 1, 2, 3, 3, 2, 1, 0];
  var REGN = [1, 3, 3, 1, 1, 3, 3, 1];
  // the 16 colors of a card lying a given way (o 0 or 1)
  var CELLS = TILES.map(function (t) {
    return [0, 1].map(function (o) { var q = o ? t.slice().reverse() : t; return REG.map(function (r) { return q[REGK[r]]; }); });
  });
  function cells(t, o) { return CELLS[t][o ? 1 : 0]; }

  // ── The table: a grid big enough for any game (42 cards in one straight line still fit) ──
  var N = 400, OFF = 200;
  function at(x, y) { return (y + OFF) * N + (x + OFF); }
  var NB = [1, -1, N, -N];
  function Board() {
    this.col = new Int8Array(N * N).fill(-1);
    this.card = new Int16Array(N * N).fill(-1);
    this.comp = new Int32Array(N * N);
    this.csize = [];
    this.occ = [];
    this.stack = [];
    this.dirty = true;
  }
  Board.prototype.put = function (k, t, o, x, y) {
    var cl = cells(t, o);
    for (var i = 0; i < 16; i++) { var j = at(x + (i & 3), y + (i >> 2)); this.col[j] = cl[i]; this.card[j] = k; this.occ.push(j); }
    this.stack.push(k); this.dirty = true;
  };
  Board.prototype.pop = function () {
    for (var i = 0; i < 16; i++) { var j = this.occ.pop(); this.col[j] = -1; this.card[j] = -1; }
    this.stack.pop(); this.dirty = true;
  };
  // every chain on the table: comp[square] = its chain, csize[chain] = its length
  Board.prototype.chains = function () {
    if (!this.dirty) return;
    var comp = this.comp, col = this.col, occ = this.occ, sz = [], q = [];
    for (var i = 0; i < occ.length; i++) comp[occ[i]] = -1;
    for (i = 0; i < occ.length; i++) {
      var s = occ[i]; if (comp[s] >= 0) continue;
      var id = sz.length, c = col[s], n = 0; comp[s] = id; q.length = 0; q.push(s);
      while (q.length) { var u = q.pop(); n++; for (var d = 0; d < 4; d++) { var v = u + NB[d]; if (col[v] === c && comp[v] < 0) { comp[v] = id; q.push(v); } } }
      sz.push(n);
    }
    this.csize = sz; this.dirty = false;
  };
  function boardOf(pl) { var b = new Board(); (pl || []).forEach(function (p, k) { b.put(k, p[0], p[1], p[2], p[3]); }); return b; }

  // What a card put down at (x, y) does: {ok, why ('over' | 'alone' | 'clash'), score, groups [{c, len, n (chains joined),
  // sq [squares]}], touch (squares touching), cards (cards it touches), bad [[square, its neighbor]], good [[...]]}.
  // o.marks: list the touching squares (for the page's ghost); o.sq: list each scoring chain's squares.
  function judge(B, t, o, x, y, opt) {
    opt = opt || {};
    var cl = cells(t, o), touch = 0, bad = opt.marks ? [] : null, good = opt.marks ? [] : null, over = false, cards = {}, nc = 0;
    var links = null; // part -> [chains]
    for (var i = 0; i < 16; i++) {
      var cx = x + (i & 3), cy = y + (i >> 2), j = at(cx, cy);
      if (B.col[j] >= 0) { over = true; if (!opt.marks) return { ok: false, why: 'over' }; continue; }
      for (var d = 0; d < 4; d++) {
        var nx = cx + (d === 0 ? 1 : d === 1 ? -1 : 0), ny = cy + (d === 2 ? 1 : d === 3 ? -1 : 0);
        if (nx >= x && nx < x + 4 && ny >= y && ny < y + 4) continue;
        var v = at(nx, ny), c = B.col[v];
        if (c < 0) continue;
        touch++;
        if (!cards[B.card[v]]) { cards[B.card[v]] = 1; nc++; }
        if (c !== cl[i]) { if (!opt.marks) return { ok: false, why: 'clash' }; bad.push([j, v]); }
        else { if (good) good.push([j, v]); }
      }
    }
    if (over || (bad && bad.length) || !touch) return { ok: false, why: over ? 'over' : touch ? 'clash' : 'alone', bad: bad, good: good, touch: touch, cards: nc };
    // the score: each part of the card joins the chains it touches; parts linked through a chain are one chain
    B.chains();
    var par = [0, 1, 2, 3, 4, 5, 6, 7], cm = {}; // chain -> first part touching it
    function find(a) { while (par[a] !== a) a = par[a] = par[par[a]]; return a; }
    var touched = [[], [], [], [], [], [], [], []];
    for (i = 0; i < 16; i++) {
      cx = x + (i & 3); cy = y + (i >> 2);
      for (d = 0; d < 4; d++) {
        nx = cx + (d === 0 ? 1 : d === 1 ? -1 : 0); ny = cy + (d === 2 ? 1 : d === 3 ? -1 : 0);
        if (nx >= x && nx < x + 4 && ny >= y && ny < y + 4) continue;
        v = at(nx, ny); if (B.col[v] < 0) continue;
        var k = B.comp[v], r = REG[i];
        if (touched[r].indexOf(k) < 0) touched[r].push(k);
        if (cm[k] == null) cm[k] = r; else { var a1 = find(cm[k]), a2 = find(r); if (a1 !== a2) par[a1] = a2; }
      }
    }
    var groups = {}, score = 0;
    for (r = 0; r < 8; r++) {
      if (!touched[r].length) continue;
      var g = find(r), G = groups[g] || (groups[g] = { c: cl[REG.indexOf(r)], len: 0, n: 0, parts: [], ch: [] });
      if (G.parts.indexOf(r) < 0) G.parts.push(r);
      touched[r].forEach(function (k2) { if (G.ch.indexOf(k2) < 0) G.ch.push(k2); });
    }
    // parts of the same group that touch no chain themselves (can't happen: a part joins a group only by a chain)
    var list = Object.keys(groups).map(function (g2) {
      var G2 = groups[g2], len = 0;
      G2.parts.forEach(function (p) { len += REGN[p]; });
      G2.ch.forEach(function (k2) { len += B.csize[k2]; });
      G2.len = len; G2.n = G2.ch.length; score += len;
      return G2;
    });
    list.sort(function (p, q) { return q.len - p.len; });
    if (opt.sq) list.forEach(function (G3) {
      var s = [];
      for (var i2 = 0; i2 < 16; i2++) if (G3.parts.indexOf(REG[i2]) >= 0) s.push(at(x + (i2 & 3), y + (i2 >> 2)));
      for (var i3 = 0; i3 < B.occ.length; i3++) if (G3.ch.indexOf(B.comp[B.occ[i3]]) >= 0) s.push(B.occ[i3]);
      G3.sq = s;
    });
    return { ok: true, score: score, groups: list.map(function (G4) { return { c: G4.c, len: G4.len, n: G4.n, sq: G4.sq }; }), touch: touch, cards: nc, bad: bad, good: good };
  }
  // every place a card fits, the way round given: [{t, o, x, y, s}]
  function fits(B, t, o) {
    var seen = {}, out = [], occ = B.occ;
    for (var i = 0; i < occ.length; i++) {
      var s = occ[i];
      for (var d = 0; d < 4; d++) {
        var e = s + NB[d]; if (B.col[e] >= 0) continue;
        var ex = (e % N) - OFF, ey = Math.floor(e / N) - OFF;
        for (var dy = 0; dy < 4; dy++) for (var dx = 0; dx < 4; dx++) {
          var x = ex - dx, y = ey - dy, key = (x + OFF) * N + (y + OFF);
          if (seen[key]) continue; seen[key] = 1;
          var r = judge(B, t, o, x, y);
          if (r.ok) out.push({ t: t, o: o, x: x, y: y, s: r.score, g: r.groups, k: r.cards });
        }
      }
    }
    return out;
  }
  function allFits(B, t) { return fits(B, t, 0).concat(fits(B, t, 1)); }

  // ── The game ──
  function rng(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  // o: {np (players), hand (cards held, 1 the standard rule), seed, deck (a fixed order, for tests and the demo)}
  function newGame(o) {
    o = o || {};
    var np = Math.max(1, Math.min(6, o.np || 2)), deck;
    if (o.deck) deck = o.deck.slice();
    else {
      var r = rng(o.seed == null ? Math.floor(Math.random() * 4294967296) : o.seed);
      deck = TILES.map(function (_, i) { return i; });
      for (var i = deck.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)), t = deck[i]; deck[i] = deck[j]; deck[j] = t; }
    }
    var st = { v: 1, np: np, hand: Math.max(1, Math.min(3, o.hand || 1)), deck: deck, hands: [], pl: [], turn: o.first || 0, n: 0,
      sc: [], best: [], over: false, win: [], ml: [], aside: [] };
    for (i = 0; i < np; i++) { st.hands.push([]); st.sc.push(0); st.best.push(0); }
    var c0 = st.deck.shift();
    st.pl.push([c0, 0, 0, 0, -1, 0]);
    refill(st, st.turn);
    return st;
  }
  function refill(st, p) { while (st.hands[p].length < st.hand && st.deck.length) st.hands[p].push(st.deck.shift()); }
  // the next player who has a card to put down (drawing first); -1 when nobody has: the game is over
  function nextTurn(st) {
    for (var k = 1; k <= st.np; k++) {
      var p = (st.turn + k) % st.np;
      refill(st, p);
      if (st.hands[p].length) return p;
    }
    return -1;
  }
  function parse(s) {
    var m = /^(\d+)@(-?\d+),(-?\d+)(\/?)$/.exec(String(s));
    if (m) return { t: +m[1], x: +m[2], y: +m[3], o: m[4] ? 1 : 0 };
    m = /^(\d+)-$/.exec(String(s));
    return m ? { t: +m[1], aside: true } : null;
  }
  function encode(t, x, y, o) { return t + '@' + x + ',' + y + (o ? '/' : ''); }
  function boardFor(st) { return boardOf(st.pl); }
  // the moves the player to move has: every place each card in hand fits
  function moves(st, B) {
    B = B || boardFor(st);
    var out = [], h = st.hands[st.turn] || [];
    h.forEach(function (t) { out = out.concat(allFits(B, t)); });
    return out;
  }
  function check(st, s) {
    if (!st || st.over) return false;
    var m = parse(s); if (!m) return false;
    var h = st.hands[st.turn]; if (h.indexOf(m.t) < 0) return false;
    var B = boardFor(st);
    if (m.aside) return h.every(function (t) { return !allFits(B, t).length; });
    return judge(B, m.t, m.o, m.x, m.y).ok;
  }
  // Put a card down (or aside): the result {p, t, o, x, y, s, groups, cards, touch, aside} or null if it isn't allowed
  function play(st, s) {
    if (!check(st, s)) return null;
    var m = parse(s), p = st.turn, h = st.hands[p], B = boardFor(st), res;
    h.splice(h.indexOf(m.t), 1);
    if (m.aside) {
      // a card that fits nowhere goes under the deck and the player draws again; once every card left has been tried
      // this turn, it is set aside for good and the turn passes
      st.ut = (st.ut || 0) + 1;
      if (st.deck.length && st.ut <= st.deck.length) {
        st.deck.push(m.t); refill(st, p); st.ml.push(String(s));
        return { p: p, t: m.t, under: true, s: 0, groups: [], drew: h[h.length - 1] };
      }
      st.aside.push(m.t); res = { p: p, t: m.t, aside: true, s: 0, groups: [] };
    }
    else {
      var r = judge(B, m.t, m.o, m.x, m.y, { sq: false });
      st.pl.push([m.t, m.o, m.x, m.y, p, r.score]);
      st.sc[p] += r.score; if (r.score > st.best[p]) st.best[p] = r.score;
      res = { p: p, t: m.t, o: m.o, x: m.x, y: m.y, s: r.score, groups: r.groups, cards: r.cards, touch: r.touch };
    }
    st.ml.push(String(s)); st.n++; st.ut = 0;
    var nx = nextTurn(st);
    if (nx < 0) {
      st.over = true;
      var top = Math.max.apply(null, st.sc);
      st.win = []; st.sc.forEach(function (v, i) { if (v === top) st.win.push(i); });
    } else st.turn = nx;
    return res;
  }
  // the longest chain on the table: {c, len}
  function longest(B) { B.chains(); var bi = -1, bl = 0; B.csize.forEach(function (z, i) { if (z > bl) { bl = z; bi = i; } }); if (bi < 0) return { c: -1, len: 0 }; for (var i = 0; i < B.occ.length; i++) if (B.comp[B.occ[i]] === bi) return { c: B.col[B.occ[i]], len: bl }; return { c: -1, len: bl }; }

  // ── The computer ──
  // Easy puts the card where it scores, though not always the most; Normal takes the most points now; Hard weighs the
  // points now against the most the next player could score with the cards still unseen (a sample of them).
  var LEVELS = { easy: { k: 'easy', part: 0.6 }, normal: { k: 'normal' }, hard: { k: 'hard', sample: 14, top: 12, w: 0.8, ms: 1500 } };
  function search(st, o) {
    o = o || {};
    var L = LEVELS[o.level] || LEVELS[o.k] || LEVELS.normal, r = rng(o.seed == null ? 12345 : o.seed), B = boardFor(st);
    var all = moves(st, B);
    if (!all.length) return { move: (st.hands[st.turn] || [])[0] + '-' };
    all.sort(function (a, b) { return b.s - a.s || r() - 0.5; });
    var pick;
    if (L.k === 'easy') {
      // a card that scores at least L.part of the most it could, chosen at random
      var pos = all.filter(function (m) { return m.s >= all[0].s * L.part; });
      pick = pos[Math.floor(r() * pos.length)];
    } else if (L.k === 'normal' || st.deck.length === 0 && st.np === 1) {
      var top = all.filter(function (m) { return m.s === all[0].s; });
      pick = top[Math.floor(r() * top.length)];
    } else pick = hard(st, B, all, L, r);
    return { move: encode(pick.t, pick.x, pick.y, pick.o), s: pick.s };
  }
  function hard(st, B, all, L, r) {
    // the cards the next player could hold: the deck and every hand but this one
    var pool = st.deck.slice(); st.hands.forEach(function (h, i) { if (i !== st.turn) pool = pool.concat(h); });
    var solo = st.np === 1, t0 = Date.now();
    if (!pool.length) return all[0];
    var samp = pool.slice(); for (var i = samp.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)), t = samp[i]; samp[i] = samp[j]; samp[j] = t; }
    samp = samp.slice(0, L.sample);
    // the candidates: the best few by points now, and never one that gives away more than it takes
    var seen = {}, cand = [];
    all.forEach(function (m) { var k = m.t + ':' + m.o + ':' + m.x + ':' + m.y; if (!seen[k] && cand.length < L.top) { seen[k] = 1; cand.push(m); } });
    var best = null, bv = -1e9;
    cand.forEach(function (m, ci) {
      if (ci > 2 && Date.now() - t0 > L.ms) return;
      B.put(B.stack.length + 1000, m.t, m.o, m.x, m.y);
      var sum = 0;
      samp.forEach(function (t2) { var f = allFits(B, t2), mx = 0; f.forEach(function (q) { if (q.s > mx) mx = q.s; }); sum += mx; });
      B.pop();
      var reply = sum / samp.length;
      // alone, a big reply is my own next card: worth something to me, a little
      var v = solo ? m.s + 0.25 * reply : m.s - L.w * reply;
      if (v > bv + 1e-9 || (Math.abs(v - bv) < 1e-9 && r() < 0.5)) { bv = v; best = m; }
    });
    return best || all[0];
  }

  // ── History: the cards down, as text ──
  function packPl(pl) { return pl.map(function (p) { return p[0] + '.' + p[1] + '.' + p[2] + '.' + p[3] + '.' + p[4] + '.' + p[5]; }).join(' '); }
  function unpackPl(s) { return String(s || '').split(' ').filter(Boolean).map(function (q) { return q.split('.').map(Number); }); }

  root.ContinuoCore = {
    COLORS: COLORS, COLOR_NAMES: COLOR_NAMES, TILES: TILES, REG: REG, LEVELS: LEVELS, N: N, OFF: OFF,
    cells: cells, at: at, xy: function (j) { return { x: (j % N) - OFF, y: Math.floor(j / N) - OFF }; },
    Board: Board, boardOf: boardOf, boardFor: boardFor, judge: judge, fits: fits, allFits: allFits,
    newGame: newGame, moves: moves, check: check, play: play, parse: parse, encode: encode, search: search, longest: longest,
    packPl: packPl, unpackPl: unpackPl, rng: rng,
    clone: function (o) { return JSON.parse(JSON.stringify(o)); }
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.ContinuoCore;
})(typeof window !== 'undefined' ? window : typeof self !== 'undefined' ? self : globalThis);
