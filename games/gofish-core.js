// ═══════════════════════════════════════════════════════════════════════════
// Go Fish: the rules and the computer players (window.GoFishCore, or require() in Node for testing).
//
// The game as Pagat (pagat.com/quartet/gofish.html) and the United States Playing Card Company's rules give it: a
// standard 52-card deck, 7 cards each for 2 or 3 players and 5 each for 4 to 6; the rest lie face down in the middle
// as the pond. On your turn you ask one player for a rank you hold yourself. If they have any, they hand over every
// card of that rank and you ask again. If they have none they say "Go fish" and you draw one card from the pond; if it
// is the rank you asked for, you show it and ask again, otherwise the turn passes to your left (or, as Pagat has it and
// as a setup choice here, to the player who said "Go fish"). Four of a rank make a book, laid down at once, a book in
// the deal too. A player whose hand runs out draws a card from the pond on their turn; with the pond empty as well,
// they are out. When all 13 books are down, whoever made the most wins.
//
// State (plain JSON: the saved game and the online table are the same object): see newGame().
// Moves: apply(st, p, a) with a = {k:'ask', to, r} or {k:'fish', i} (the i-th card of the pond: which one you pick
// doesn't change the odds). It returns the move (for drawing it) or null when it isn't allowed. bot(st, p) returns the
// computer's move for seat p.
//
// The computer players see only what a person at the table sees: their own hand, how many cards everyone holds, every
// ask and its answer, the cards handed over and the fish shown. Easy forgets nearly all of it; Normal remembers the
// last two rounds of asks; Hard remembers every ask and every card shown, and weighs the odds of the cards it hasn't
// seen.
// ═══════════════════════════════════════════════════════════════════════════
(function (root) {
  'use strict';
  var RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  var SUITS = ['s', 'h', 'c', 'd'];
  var NAMES = { J: 'Jack', Q: 'Queen', K: 'King', A: 'Ace' };
  var C = { rng: Math.random };   // (tests swap in a seeded generator)
  function rnd() { return C.rng(); }
  function pick(a) { return a[Math.floor(rnd() * a.length)]; }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  // ── Words ──
  // "7s", "Jacks", "Aces"; "a 7", "an 8", "an Ace"; "one", "two", "three"
  function plural(r) { return NAMES[r] ? NAMES[r] + 's' : r + 's'; }
  function single(r) { return NAMES[r] || r; }
  function aOf(r) { var w = single(r); return (/^(8|A)/.test(w) ? 'an ' : 'a ') + w; }
  function many(n, r) { return n === 1 ? 'one ' + single(r) : ['zero', 'one', 'two', 'three', 'four'][n] + ' ' + plural(r); }
  var NUMW = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen'];
  function numw(n) { return NUMW[n] || String(n); }

  // ── Cards ──
  function deck() { var out = [], id = 0; SUITS.forEach(function (s) { RANKS.forEach(function (r) { out.push({ r: r, s: s, id: 'c' + (id++) }); }); }); return out; }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function rankIx(r) { return RANKS.indexOf(r); }
  function sortHand(h) { var so = { s: 0, h: 1, c: 2, d: 3 }; return h.sort(function (a, b) { return rankIx(a.r) - rankIx(b.r) || so[a.s] - so[b.s]; }); }
  function countOf(h, r) { var n = 0; for (var i = 0; i < h.length; i++) if (h[i].r === r) n++; return n; }
  function ranksIn(h) { var o = []; h.forEach(function (c) { if (o.indexOf(c.r) < 0) o.push(c.r); }); return o.sort(function (a, b) { return rankIx(a) - rankIx(b); }); }
  function dealCount(n) { return n <= 3 ? 7 : 5; }
  function lv(v) { return v === 'easy' || v === 'hard' ? v : 'normal'; }
  function lvOf(st, p) { var pl = st.players[p]; return lv(pl && pl.level || st.level); }
  function zeros(n, v) { var a = []; for (var i = 0; i < n; i++) a.push(v === undefined ? 0 : (typeof v === 'object' ? clone(v) : v)); return a; }

  // ── A new game ──
  // o: {players: [{name, cpu, level}], level, next: 'left' | 'asked', dealer}
  function newGame(o) {
    var n = o.players.length;
    var st = {
      v: 1, n: n, level: lv(o.level), next: o.next === 'asked' ? 'asked' : 'left',
      players: o.players.map(function (p) { return { name: p.name, cpu: !!p.cpu, level: p.cpu ? lv(p.level || o.level) : undefined }; }),
      hands: zeros(n, []), pond: [], books: zeros(n, []), turn: 0, phase: 'ask', ask: null,
      tn: 1, asks: 0, streak: 0, kn: zeros(n, {}), no: zeros(n, {}), dr: zeros(n), log: [],
      stats: { lucky: zeros(n), big: zeros(n), best: zeros(n), got: zeros(n), fish: zeros(n), dealt: zeros(n) },
      ev: [], bo: [], catchBest: null, started: Date.now(), winner: null
    };
    var d = shuffle(deck()), k = dealCount(n);
    st.dealer = o.dealer != null ? o.dealer % n : Math.floor(rnd() * n);
    for (var i = 0; i < k * n; i++) st.hands[(st.dealer + 1 + i) % n].push(d.shift());
    st.pond = d;
    st.hands.forEach(sortHand);
    // books in the deal go down at once
    st.dealtBooks = [];
    for (var p = 0; p < n; p++) {
      var b = layBooks(st, p, 'deal');
      b.forEach(function (r) { st.dealtBooks.push({ p: p, r: r }); st.stats.dealt[p]++; st.ev.push({ k: 'dealt', p: p, r: r }); });
    }
    advance(st, (st.dealer + 1) % n);
    return st;
  }

  // Lay down every book in seat p's hand; returns their ranks. st.bo keeps every book in the order it went down: who,
  // which rank, on which turn, and how the last card came (an ask, a fish or the deal), for the game's history.
  function layBooks(st, p, how) {
    var out = [], h = st.hands[p];
    ranksIn(h).forEach(function (r) {
      if (countOf(h, r) === 4) {
        st.hands[p] = st.hands[p].filter(function (c) { return c.r !== r; }); h = st.hands[p];
        st.books[p].push(r); out.push(r);
        st.bo.push({ p: p, r: r, t: st.tn, h: how || 'ask' });
        for (var q = 0; q < st.n; q++) { delete st.kn[q][r]; delete st.no[q][r]; }
      }
    });
    return out;
  }
  function booksDown(st) { var t = 0; st.books.forEach(function (b) { t += b.length; }); return t; }

  // The turn goes to seat p: someone with cards asks; someone with none fishes one from the pond first; someone with
  // none and an empty pond is out, and the turn moves on. With every book down the game is over.
  function advance(st, p) {
    if (p !== st.turn) { st.streak = 0; }
    for (var k = 0; k < st.n; k++) {
      var q = (p + k) % st.n;
      if (booksDown(st) >= 13) break;
      if (st.hands[q].length) {
        if (q !== st.turn) st.tn++;
        st.turn = q; st.phase = 'ask'; st.ask = null;
        // (nobody else holds a card to ask for: a card from the pond, and the turn passes)
        if (!targets(st, q).length && st.pond.length) { st.phase = 'fish'; st.ask = { to: null, r: null, alone: 1 }; }
        return;
      }
      if (st.pond.length) { if (q !== st.turn) st.tn++; st.turn = q; st.phase = 'fish'; st.ask = null; return; }
    }
    if (st.turn >= 0) { if (st.streak >= 5) st.ev.push({ k: 'streak', p: st.turn, n: st.streak, t: st.tn }); if (st.streak > st.stats.best[st.turn]) st.stats.best[st.turn] = st.streak; }
    st.phase = 'over'; st.turn = -1; st.ask = null;
    var most = Math.max.apply(null, st.books.map(function (b) { return b.length; })), w = [];
    st.books.forEach(function (b, i) { if (b.length === most) w.push(i); });
    st.winner = w;
    if (most === 13) st.ev.push({ k: 'sweep', p: w[0] });
  }
  function turn(st) { return st && (st.phase === 'ask' || st.phase === 'fish') ? st.turn : -1; }
  function canAsk(st, p, to, r) {
    if (!st || st.phase !== 'ask' || st.turn !== p || to === p || to < 0 || to >= st.n) return false;
    return st.hands[to].length > 0 && countOf(st.hands[p], r) > 0;
  }
  function targets(st, p) { var o = []; for (var q = 0; q < st.n; q++) if (q !== p && st.hands[q].length) o.push(q); return o; }
  function endStreak(st, p) {
    if (st.streak >= 5) st.ev.push({ k: 'streak', p: p, n: st.streak, t: st.tn });
    if (st.streak > st.stats.best[p]) st.stats.best[p] = st.streak;
  }
  function passTurn(st, p, to) {
    endStreak(st, p);
    advance(st, st.next === 'asked' && to != null ? to : (p + 1) % st.n);
  }
  function note(st, e) { e.t = st.tn; st.log.push(e); if (st.log.length > 60) st.log.shift(); }

  function apply(st, p, a) {
    if (!st || !a || turn(st) !== p) return null;
    var mv;
    if (a.k === 'ask') {
      var to = +a.to, r = String(a.r);
      if (!canAsk(st, p, to, r)) return null;
      st.asks++;
      var giving = st.hands[to].filter(function (c) { return c.r === r; });
      st.kn[p][r] = Math.max(st.kn[p][r] || 0, 1); delete st.no[p][r];
      mv = { k: 'ask', p: p, to: to, r: r, n: giving.length, ids: giving.map(function (c) { return c.id; }), cards: giving, tn: st.tn };
      note(st, { p: p, to: to, r: r, n: giving.length });
      st.kn[to][r] = 0; st.no[to][r] = st.dr[to];
      if (giving.length) {
        st.hands[to] = st.hands[to].filter(function (c) { return c.r !== r; });
        st.hands[p] = sortHand(st.hands[p].concat(giving));
        st.kn[p][r] += giving.length;
        st.streak++; st.stats.got[p] += giving.length;
        if (giving.length === 3) { st.stats.big[p]++; st.ev.push({ k: 'big', p: p, to: to, r: r, t: st.tn }); }
        if (!st.catchBest || giving.length > st.catchBest.n) st.catchBest = { p: p, to: to, r: r, n: giving.length, t: st.tn };
        mv.books = layBooks(st, p, 'ask');
        mv.streak = st.streak;
        advance(st, p);   // (your turn again; with an empty hand you fish first)
      } else if (st.pond.length) {
        st.phase = 'fish'; st.ask = { to: to, r: r };
        mv.fish = 1;
      } else {
        mv.dry = 1;   // "Go fish", but the pond is empty
        passTurn(st, p, to);
      }
      mv.next = st.turn; mv.phase = st.phase;
      return mv;
    }
    if (a.k === 'fish') {
      if (st.phase !== 'fish' || !st.pond.length) return null;
      var i = Math.max(0, Math.min(st.pond.length - 1, a.i == null ? 0 : +a.i | 0));
      var c = st.pond.splice(i, 1)[0], ask = st.ask;
      st.hands[p] = sortHand(st.hands[p].concat([c]));
      st.stats.fish[p]++;
      mv = { k: 'fish', p: p, i: i, c: c, refill: ask ? 0 : 1, tn: st.tn };
      if (ask && ask.r && c.r === ask.r) {
        mv.lucky = 1; mv.r = ask.r; st.kn[p][c.r] = (st.kn[p][c.r] || 0) + 1;
        st.streak++; st.stats.lucky[p]++;
        st.ev.push({ k: 'lucky', p: p, r: c.r, t: st.tn });
        if (st.log.length) st.log[st.log.length - 1].f = 1;
      } else st.dr[p]++;
      mv.books = layBooks(st, p, 'fish');
      if (ask) mv.asked = ask;
      if (!ask || mv.lucky) { mv.streak = st.streak; advance(st, p); }
      else passTurn(st, p, ask.to);
      mv.next = st.turn; mv.phase = st.phase;
      return mv;
    }
    return null;
  }

  // ── The computer players ──
  function botFish(st) { return { k: 'fish', i: Math.floor(rnd() * st.pond.length) }; }
  function bot(st, p) {
    if (!st || turn(st) !== p) return null;
    if (st.phase === 'fish') return botFish(st);
    var L = lvOf(st, p), mine = ranksIn(st.hands[p]), tg = targets(st, p);
    if (!mine.length || !tg.length) return null;
    var c = L === 'hard' ? hardAsk(st, p, mine, tg) : L === 'easy' ? easyAsk(st, p, mine, tg) : normalAsk(st, p, mine, tg);
    return { k: 'ask', to: c.to, r: c.r };
  }
  // Easy forgets: a rank it holds, anyone at all. Now and then it remembers the ask just made.
  function easyAsk(st, p, mine, tg) {
    var last = st.log[st.log.length - 1];
    if (last && last.p !== p && rnd() < 0.3 && mine.indexOf(last.r) >= 0 && tg.indexOf(last.p) >= 0) return { to: last.p, r: last.r };
    return { to: pick(tg), r: pick(st.hands[p]).r };
  }
  // What the asks of the last two rounds say: who has shown they hold a rank, and who has said "Go fish" for it
  function recent(st, p) {
    var hold = {}, none = {}, win = st.log.slice(-2 * st.n);
    win.forEach(function (e) {
      var k1 = e.p + ':' + e.r, k2 = e.to + ':' + e.r;
      hold[k1] = 1; delete none[k1];
      if (e.n) { delete hold[k2]; none[k2] = 1; } else { none[k2] = 1; delete hold[k2]; }
    });
    return { hold: hold, none: none };
  }
  function most(st, p, ranks) {
    var best = -1, out = [];
    ranks.forEach(function (r) { var k = countOf(st.hands[p], r); if (k > best) { best = k; out = [r]; } else if (k === best) out.push(r); });
    return pick(out);
  }
  // Normal remembers the last two rounds: it asks whoever asked for a rank it holds, and it doesn't ask someone for a
  // rank they just said "Go fish" to
  function normalAsk(st, p, mine, tg) {
    var m = recent(st, p), hits = [];
    tg.forEach(function (q) { mine.forEach(function (r) { if (m.hold[q + ':' + r] && booked(st, r) < 0) hits.push({ to: q, r: r, k: countOf(st.hands[p], r) }); }); });
    if (hits.length) { hits.sort(function (a, b) { return b.k - a.k; }); return { to: hits[0].to, r: hits[0].r }; }
    var r = most(st, p, mine), ok = tg.filter(function (q) { return !m.none[q + ':' + r]; });
    if (!ok.length) {   // everyone said no to that one lately: another rank
      var alt = mine.filter(function (x) { return tg.some(function (q) { return !m.none[q + ':' + x]; }); });
      if (alt.length) { r = most(st, p, alt); ok = tg.filter(function (q) { return !m.none[q + ':' + r]; }); }
      else ok = tg;
    }
    return { to: pick(ok), r: r };
  }
  function booked(st, r) { for (var q = 0; q < st.n; q++) if (st.books[q].indexOf(r) >= 0) return q; return -1; }
  // Hard remembers every ask and every card shown (st.kn: the fewest of a rank each player is known to hold; st.no:
  // when they last said "Go fish" to it, counted in the unseen cards they have drawn since). A known card is asked for
  // first; otherwise it weighs how likely each player is to hold each rank from the cards it hasn't seen.
  function hardAsk(st, p, mine, tg) {
    var best = null, bv = -1;
    var unknown = st.pond.length, uq = {};
    tg.forEach(function (q) { var k = 0; for (var r in st.kn[q]) k += st.kn[q][r] || 0; uq[q] = Math.max(0, st.hands[q].length - k); unknown += uq[q]; });
    mine.forEach(function (r) {
      var have = countOf(st.hands[p], r), seen = have;
      for (var q2 = 0; q2 < st.n; q2++) if (q2 !== p) seen += st.kn[q2][r] || 0;
      var out = Math.max(0, 4 - seen), pr = unknown ? out / unknown : 0;
      tg.forEach(function (q) {
        var known = st.kn[q][r] || 0, v;
        if (known) v = 10 + known;
        else {
          var slots = uq[q];
          if (st.no[q][r] != null) slots = Math.min(slots, st.dr[q] - st.no[q][r]);
          v = slots > 0 ? (1 - Math.pow(1 - pr, slots)) * (1 - out * 0.2 + have * 0.5) : 0;
        }
        v += have * 0.04 + (st.kn[p][r] ? 0.02 : 0) + rnd() * 0.001;   // (closer to a book, and a rank it has already shown)
        if (v > bv) { bv = v; best = { to: q, r: r }; }
      });
    });
    return best || { to: pick(tg), r: pick(mine) };
  }


  // ── What the game's history keeps ──
  // highlights(st): the rare moments of a finished game as sentences a person would say
  function list(a) { return a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]; }
  function highlights(st) {
    var out = [], nm = function (p) { return st.players[p].name; }, by = {};
    st.ev.forEach(function (e) { (by[e.k] = by[e.k] || []).push(e); });
    (by.sweep || []).forEach(function (e) { out.push(nm(e.p) + ' made all 13 books'); });
    (by.dealt || []).forEach(function (e) { out.push(nm(e.p) + ' was dealt all four ' + plural(e.r)); });
    var bestS = {};
    (by.streak || []).forEach(function (e) { if (!bestS[e.p] || e.n > bestS[e.p].n) bestS[e.p] = e; });
    Object.keys(bestS).forEach(function (p) { out.push(nm(+p) + ' asked ' + bestS[p].n + ' times in a row and got cards every time'); });
    // (three of a rank in one ask comes up a few times a game among good players: the game's first is the one kept)
    var big = (by.big || [])[0];
    if (big) out.push(nm(big.p) + ' took three ' + plural(big.r) + ' from ' + nm(big.to) + ' in one ask');
    for (var p = 0; p < st.n; p++) {
      var lk = (by.lucky || []).filter(function (e) { return e.p === p; });
      if (lk.length === 1) out.push(nm(p) + ' asked for ' + plural(lk[0].r) + ' and fished one up from the pond');
      else if (lk.length > 1) out.push(nm(p) + ' fished up the very rank just asked for ' + (lk.length === 2 ? 'twice' : numw(lk.length) + ' times') + ': ' + list(lk.map(function (e) { return plural(e.r); })));
    }
    out.push('The game took ' + st.asks + ' asks');
    return out;
  }
  // historyDetail(st): small and flat (strings, no arrays inside arrays) for Kit.record. o: the books in the order they
  // went down, "seat.rank.turn.how" joined by spaces (how: a ask, f fish, d deal); t: the last turn; s: each player's
  // best streak; lk, bg: fish you wished for and three-card catches, each player's; c: the biggest single catch
  // "seat.from.rank.count"; nx: who went next after a Go fish
  function historyDetail(st) {
    function rc(r) { return r === '10' ? 'T' : r; }
    return {
      names: st.players.map(function (p) { return p.name; }), cpu: st.players.map(function (p) { return p.cpu ? 1 : 0; }).join(''),
      o: st.bo.map(function (b) { return b.p + '.' + rc(b.r) + '.' + b.t + '.' + b.h.charAt(0); }).join(' '),
      t: st.tn, asks: st.asks, s: st.stats.best.join('.'), lk: st.stats.lucky.join('.'), bg: st.stats.big.join('.'),
      c: st.catchBest ? [st.catchBest.p, st.catchBest.to, rc(st.catchBest.r), st.catchBest.n].join('.') : '', nx: st.next
    };
  }

  function scores(st) { return st.books.map(function (b) { return b.length; }); }
  function over(st) { return st && st.phase === 'over' ? { win: st.winner.slice() } : null; }

  var API = {
    RANKS: RANKS, SUITS: SUITS, C: C, deck: deck, sortHand: sortHand, countOf: countOf, ranksIn: ranksIn, dealCount: dealCount,
    plural: plural, single: single, aOf: aOf, many: many, numw: numw, lv: lv, lvOf: lvOf,
    newGame: newGame, turn: turn, canAsk: canAsk, targets: targets, apply: apply, bot: bot, booksDown: booksDown, booked: booked,
    scores: scores, over: over, clone: clone, highlights: highlights, historyDetail: historyDetail, list: list
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.GoFishCore = API;
})(typeof window !== 'undefined' ? window : this);
