// ═══════════════════════════════════════════════════════════════════════════
// Pinochle: the rules and the computer players (window.PinoCore, or require() in Node for testing).
//
// The standard American game as Pagat (pagat.com/marriage/pin4.html, pin3.html, pin2.html) and the United States
// Playing Card Company's Official Rules of Card Games give it, on the ten-point scale the brief and most American
// tables use: counters A, 10 and K are 10 each, the last trick 10 (250 in all), the meld table at its usual values,
// bids from 250 in tens, game to 1500 (two-handed to 1000).
//
//   kind 'part'  Partnership Pinochle for 4: two partnerships across the table. An auction, the bidder names trump,
//                partners pass 4 (or 3) cards each way, everyone melds face up, 12 tricks. The bidding side needs its
//                meld and counters to reach the bid or it goes set (loses the bid). A side's meld only counts if it
//                takes a trick.
//   kind 'cut'   Cutthroat for 3: each for themselves, 15 cards each and a 3-card widow. The bidder shows the widow,
//                takes it, names trump and buries 3 cards (counters in them count for the bidder).
//   kind 'two'   Two-handed: 12 each, the next card turned for trump, the rest the stock. Until the stock is gone you
//                need not follow suit; the winner of a trick may lay one meld, then both draw. The holder of the nine
//                of trump (the dix) may swap it for the turned card. The last 12 tricks are played with the strict
//                rules and no meld.
//
// The strict rules of play (every trick in 'part' and 'cut', the last 12 in 'two'): follow suit and beat the best
// card in the trick if you can (unless the trick has been trumped and you are following another suit); if you can't
// follow, trump, and beat a trump already played if you can; otherwise play anything. Of two identical cards, the
// one played first wins.
//
// State (plain JSON: the saved game and the online table are the same object): see newGame() and deal().
// Moves: apply(st, seat, a) with a = {k:'bid', b} (0 = pass), {k:'trump', s}, {k:'pass', ids}, {k:'bury', ids},
// {k:'go', concede}, {k:'play', id}, {k:'meld', i} (two-handed: the i-th of meldOptions, -1 for none). It returns the
// move (for drawing it) or null when it isn't allowed. bot(st, seat) returns the computer's move for that seat.
// ═══════════════════════════════════════════════════════════════════════════
(function (root) {
  'use strict';
  var RANKS = ['9', 'J', 'Q', 'K', '10', 'A'];
  var PW = { '9': 0, J: 1, Q: 2, K: 3, '10': 4, A: 5 };
  var SUITS = ['s', 'h', 'c', 'd'];
  var SNAME = { s: 'Spades', h: 'Hearts', d: 'Diamonds', c: 'Clubs' };
  var MIN_BID = 250, STEP = 10;
  var KINDS = { part: { n: 4, sides: 2, hand: 12 }, cut: { n: 3, sides: 3, hand: 15 }, two: { n: 2, sides: 2, hand: 12 } };
  var C = { rng: Math.random };   // (tests swap in a seeded generator)
  function rnd() { return C.rng(); }

  // ── Cards ──
  function deck() { var out = [], id = 0; for (var d = 0; d < 2; d++) SUITS.forEach(function (s) { RANKS.forEach(function (r) { out.push({ r: r, s: s, id: 'c' + (id++) }); }); }); return out; }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function code(c) { return (c.r === '10' ? 'T' : c.r) + c.s; }
  function isCounter(c) { return c.r === 'A' || c.r === '10' || c.r === 'K'; }
  function cval(c) { return isCounter(c) ? 10 : 0; }
  function find(h, id) { for (var i = 0; i < h.length; i++) if (h[i].id === id) return i; return -1; }
  function sortHand(h, trump) {
    // trump first, then the colors alternating (spades, hearts, clubs, diamonds, starting from trump)
    var cyc = ['s', 'h', 'c', 'd'], k = trump ? cyc.indexOf(trump) : 0, ord = [cyc[k], cyc[(k + 1) % 4], cyc[(k + 2) % 4], cyc[(k + 3) % 4]];
    return h.sort(function (a, b) { return ord.indexOf(a.s) - ord.indexOf(b.s) || PW[b.r] - PW[a.r] || (a.id < b.id ? -1 : 1); });
  }
  function kindOf(st) { return KINDS[st.kind]; }
  function sideOf(st, p) { return st.kind === 'part' ? p % 2 : p; }
  function nSides(st) { return kindOf(st).sides; }
  function seatsOf(st, side) { return st.kind === 'part' ? [side, side + 2] : [side]; }
  function nextSeat(st, p) { return (p + 1) % st.n; }

  // ── Meld ──
  // The meld table (Pagat): class A, runs and marriages: a run (A 10 K Q J of trump) 150, a double run 1500, a royal
  // marriage (K Q of trump) 40, a marriage (K Q of another suit) 20, the dix (9 of trump) 10. Class B, arounds (one of
  // a rank in every suit): aces 100, kings 80, queens 60, jacks 40; doubled (two of each) 1000, 800, 600, 400. Class C:
  // pinochle (Q of spades and J of diamonds) 40, double pinochle 300. A card can count in melds of different classes
  // but not twice in one class, so a run's king and queen are not also a royal marriage.
  var MV = { drun: 1500, run: 150, rm: 40, m: 20, dix: 10, A: 100, K: 80, Q: 60, J: 40, AA: 1000, KK: 800, QQ: 600, JJ: 400, pin: 40, dpin: 300 };
  var MNAME = { drun: 'Double run', run: 'Run', rm: 'Royal marriage', m: 'Marriage', dix: 'Dix', A: 'Aces around', K: 'Kings around', Q: 'Queens around', J: 'Jacks around',
    AA: 'Thousand aces', turn9: 'Nine turned up', KK: 'Double kings', QQ: 'Double queens', JJ: 'Double jacks', pin: 'Pinochle', dpin: 'Double pinochle' };
  function meldOf(cards, trump) {
    var by = {}; cards.forEach(function (c) { (by[c.r + c.s] = by[c.r + c.s] || []).push(c.id); });
    function n(r, s) { return (by[r + s] || []).length; }
    function take(list, k) { var ids = []; list.forEach(function (key) { var a = by[key[0] + key[1]]; ids.push(a[k]); }); return ids; }
    var groups = [];
    function add(k, ids, s) { groups.push({ k: k, pts: MV[k], ids: ids, s: s || null }); }
    var runKeys = ['A', '10', 'K', 'Q', 'J'].map(function (r) { return [r, trump]; });
    var runs = 0;
    if (trump) {
      runs = Math.min.apply(null, ['A', '10', 'K', 'Q', 'J'].map(function (r) { return n(r, trump); }));
      if (runs >= 2) { runs = 2; add('drun', take(runKeys, 0).concat(take(runKeys, 1)), trump); }
      else if (runs === 1) add('run', take(runKeys, 0), trump);
      var rm = Math.min(n('K', trump), n('Q', trump)) - runs;
      for (var i = 0; i < rm; i++) add('rm', [by['K' + trump][runs + i], by['Q' + trump][runs + i]], trump);
      for (var d = 0; d < n('9', trump); d++) add('dix', [by['9' + trump][d]], trump);
    }
    SUITS.forEach(function (s) {
      if (s === trump) return;
      var m = Math.min(n('K', s), n('Q', s));
      for (var i = 0; i < m; i++) add('m', [by['K' + s][i], by['Q' + s][i]], s);
    });
    [['A', 'A', 'AA'], ['K', 'K', 'KK'], ['Q', 'Q', 'QQ'], ['J', 'J', 'JJ']].forEach(function (x) {
      var m = Math.min.apply(null, SUITS.map(function (s) { return n(x[0], s); })), keys = SUITS.map(function (s) { return [x[0], s]; });
      if (m >= 2) add(x[2], take(keys, 0).concat(take(keys, 1)));
      else if (m === 1) add(x[1], take(keys, 0));
    });
    var pin = Math.min(n('Q', 's'), n('J', 'd'));
    if (pin >= 2) add('dpin', [by.Qs[0], by.Jd[0], by.Qs[1], by.Jd[1]]);
    else if (pin === 1) add('pin', [by.Qs[0], by.Jd[0]]);
    var pts = 0; groups.forEach(function (g) { pts += g.pts; });
    return { pts: pts, groups: groups };
  }
  function bigMeld(k) { return k === 'drun' || k === 'AA' || k === 'KK' || k === 'QQ' || k === 'JJ' || k === 'dpin'; }

  // ── The strict rules of play ──
  function beats(a, b, trump) { return a.s === b.s ? PW[a.r] > PW[b.r] : a.s === trump; }
  function winIdx(trick, trump) { var w = 0; for (var i = 1; i < trick.length; i++) if (beats(trick[i].c, trick[w].c, trump)) w = i; return w; }
  function legalStrict(hand, trick, trump) {
    if (!trick.length) return hand.slice();
    var led = trick[0].c.s, best = trick[winIdx(trick, trump)].c;
    var fol = hand.filter(function (c) { return c.s === led; });
    if (fol.length) {
      if (best.s === trump && led !== trump) return fol;
      var hi = fol.filter(function (c) { return beats(c, best, trump); });
      return hi.length ? hi : fol;
    }
    var tr = hand.filter(function (c) { return c.s === trump; });
    if (tr.length) {
      if (best.s === trump) { var ht = tr.filter(function (c) { return beats(c, best, trump); }); return ht.length ? ht : tr; }
      return tr;
    }
    return hand.slice();
  }
  function legal(st, p) {
    var h = st.hands[p];
    if (st.phase === 'stock') return h.slice();   // (two-handed, before the stock runs out: anything)
    return legalStrict(h, st.trick, st.trump);
  }
  // Why a card can't be played (for the player who taps it)
  function whyNot(st, p, c) {
    var t = st.trick; if (!t.length) return '';
    var led = t[0].c.s, best = t[winIdx(t, st.trump)].c, h = st.hands[p];
    if (c.s !== led && h.some(function (x) { return x.s === led; })) return 'You have to follow ' + SNAME[led].toLowerCase();
    if (c.s === led) return 'You have to play a card that beats the ' + rname(best) + ' when you can';
    if (c.s !== st.trump && h.some(function (x) { return x.s === st.trump; })) return 'You can’t follow ' + SNAME[led].toLowerCase() + ', so you have to play a trump';
    return 'You have to play a trump that beats the ' + rname(best) + ' when you can';
  }
  function rname(c) { return ({ A: 'ace', K: 'king', Q: 'queen', J: 'jack', '10': 'ten', '9': 'nine' })[c.r] + ' of ' + SNAME[c.s].toLowerCase(); }

  // ── A new game and a new deal ──
  // cfg: {kind, players: [{name, cpu, level}], target, passN, level}
  function newGame(cfg) {
    var K = KINDS[cfg.kind] ? cfg.kind : 'part', n = KINDS[K].n;
    var st = {
      v: 1, kind: K, n: n, target: +cfg.target || (K === 'two' ? 1000 : 1500), passN: +cfg.passN === 3 ? 3 : 4, level: lv(cfg.level),
      players: cfg.players.slice(0, n).map(function (p) { return { name: p.name, cpu: !!p.cpu, level: p.cpu ? lv(p.level || cfg.level) : undefined }; }),
      scores: zeros(KINDS[K].sides), round: 0, dealer: Math.floor(rnd() * n), started: Date.now(),
      rounds: [], hx: [], highlights: [], stats: { sets: zeros(KINDS[K].sides), made: zeros(KINDS[K].sides), bigMeld: 0, bestMeld: null }
    };
    deal(st);
    return st;
  }
  function lv(v) { return v === 'easy' || v === 'hard' ? v : 'normal'; }
  function zeros(n) { var a = []; for (var i = 0; i < n; i++) a.push(0); return a; }
  function deal(st) {
    st.round++; st.dealer = (st.dealer + 1) % st.n;
    var d = shuffle(deck()), n = st.n, K = kindOf(st);
    st.hands = []; for (var p = 0; p < n; p++) st.hands.push([]);
    var i = 0, first = nextSeat(st, st.dealer);
    for (var r = 0; r < K.hand; r++) for (var q = 0; q < n; q++) st.hands[(first + q) % n].push(d[i++]);
    st.widow = st.kind === 'cut' ? d.slice(i, i + 3) : null; if (st.kind === 'cut') i += 3;
    st.trump = null; st.turnup = null; st.stock = null;
    if (st.kind === 'two') { st.turnup = d[i++]; st.stock = d.slice(i); st.trump = st.turnup.s; st.upCode = code(st.turnup); }
    st.hands.forEach(function (h) { sortHand(h, st.trump); });
    st.deal = st.hands.map(function (h) { return h.map(code).join(''); });   // (as dealt, for the history)
    st.auction = []; st.high = 0; st.bidder = -1; st.out = zeros(n).map(function () { return false; });
    st.passed = null; st.back = null; st.buried = null; st.melds = null; st.conceded = false;
    st.trick = []; st.trickNo = 0; st.lastTrick = null; st.gone = []; st.voids = []; st.caps = [];
    for (var v = 0; v < n; v++) { st.voids.push({}); st.caps.push({}); }
    st.won = zeros(nSides(st)); st.cpts = zeros(nSides(st)); st.piles = []; for (var s = 0; s < nSides(st); s++) st.piles.push([]);
    st.lastBy = -1;
    if (st.kind === 'two') {
      st.phase = 'stock'; st.turn = st.leader = nextSeat(st, st.dealer);
      st.mt = [[], []]; st.used = [{ A: [], B: [], C: [] }, { A: [], B: [], C: [] }]; st.mlog = []; st.mpts = [0, 0];
      st.melds = [{ pts: 0, groups: [] }, { pts: 0, groups: [] }];
      st.dixDealer = st.turnup.r === '9' ? 1 : 0;
      if (st.dixDealer) { st.mpts[st.dealer] += 10; st.melds[st.dealer].groups.push({ k: 'turn9', pts: 10, ids: [st.turnup.id], s: st.trump }); st.melds[st.dealer].pts += 10; }
    } else {
      st.phase = 'bid'; st.turn = nextSeat(st, st.dealer);
    }
  }

  // ── Whose move ──
  function turn(st) { return !st || st.phase === 'over' ? -1 : st.turn; }

  // ── The auction ──
  function minBid(st) { return st.high ? st.high + STEP : MIN_BID; }
  function stuck(st, p) { return p === st.dealer && !st.high && st.out.filter(function (x, q) { return x && q !== p; }).length === st.n - 1; }
  function nextBidder(st, p) { for (var i = 1; i <= st.n; i++) { var q = (p + i) % st.n; if (!st.out[q]) return q; } return p; }
  function doBid(st, p, b) {
    if (st.phase !== 'bid' || st.turn !== p || st.out[p]) return null;
    b = +b || 0;
    if (b) { if (b < minBid(st) || b % STEP || b > 9990) return null; st.high = b; st.bidder = p; }
    else { if (stuck(st, p)) return null; st.out[p] = true; }
    st.auction.push({ p: p, b: b });
    var live = []; for (var q = 0; q < st.n; q++) if (!st.out[q]) live.push(q);
    var mv = { k: 'bid', p: p, b: b };
    if (live.length === 1 && st.high) { st.bidder = live[0]; st.phase = 'trump'; st.turn = st.bidder; mv.won = st.bidder; return mv; }
    st.turn = nextBidder(st, p);
    // everyone but the dealer passed and nobody bid: the dealer is stuck with the minimum (Pagat's "dealer stuck")
    return mv;
  }
  function doTrump(st, p, s) {
    if (st.phase !== 'trump' || st.turn !== p || SUITS.indexOf(s) < 0) return null;
    st.trump = s;
    if (st.kind === 'cut') {
      // the widow (shown to everyone as the bidder takes it) joins the bidder's hand; the bidder buries 3
      st.hands[p] = st.hands[p].concat(st.widow);
      sortHand(st.hands[p], s); st.phase = 'bury';
    } else { st.phase = 'pass'; st.turn = (p + 2) % 4; }
    st.hands.forEach(function (h) { sortHand(h, s); });
    return { k: 'trump', p: p, s: s };
  }
  function pickIds(h, ids, n) {
    if (!Array.isArray(ids) || ids.length !== n) return null;
    var out = [], seen = {};
    for (var i = 0; i < ids.length; i++) { var j = find(h, ids[i]); if (j < 0 || seen[ids[i]]) return null; seen[ids[i]] = 1; out.push(h[j]); }
    return out;
  }
  function doPass(st, p, ids) {
    if (st.turn !== p || (st.phase !== 'pass' && st.phase !== 'passback')) return null;
    var cards = pickIds(st.hands[p], ids, st.passN); if (!cards) return null;
    var to = (p + 2) % 4;
    st.hands[p] = st.hands[p].filter(function (c) { return ids.indexOf(c.id) < 0; });
    st.hands[to] = st.hands[to].concat(cards); sortHand(st.hands[to], st.trump);
    var mv = { k: 'pass', p: p, to: to, n: cards.length };
    if (st.phase === 'pass') { st.passed = cards.map(code).join(''); st.passedIds = ids.slice(); st.phase = 'passback'; st.turn = to; }
    else { st.back = cards.map(code).join(''); st.backIds = ids.slice(); startMeld(st); }
    return mv;
  }
  function doBury(st, p, ids) {
    if (st.phase !== 'bury' || st.turn !== p) return null;
    var cards = pickIds(st.hands[p], ids, 3); if (!cards) return null;
    st.hands[p] = st.hands[p].filter(function (c) { return ids.indexOf(c.id) < 0; });
    st.buried = cards.map(code).join(''); st.buriedIds = ids.slice(); st.buriedPts = cards.reduce(function (a, c) { return a + cval(c); }, 0);
    startMeld(st);
    return { k: 'bury', p: p };
  }
  function startMeld(st) {
    st.melds = st.hands.map(function (h) { return meldOf(h, st.trump); });
    st.phase = 'meld'; st.turn = st.bidder;
  }
  // The bidder looks at everyone's meld and plays the hand, or throws it in (concedes: the bidding side loses the bid,
  // and the others score their meld without playing; Pagat's "throwing in")
  function doGo(st, p, concede) {
    if (st.phase !== 'meld' || st.turn !== p) return null;
    if (concede) { st.conceded = true; finishHand(st); return { k: 'go', p: p, concede: true }; }
    st.phase = 'play'; st.turn = st.leader = st.bidder;   // the bidder leads the first trick
    return { k: 'go', p: p };
  }

  // ── Tricks ──
  function noteInfer(st, p, c) {
    var t = st.trick; if (!t.length) return;
    var led = t[0].c.s, best = t[winIdx(t, st.trump)].c, cap = st.caps[p];
    if (st.phase === 'stock') return;
    if (c.s !== led) {
      st.voids[p][led] = 1;
      if (c.s !== st.trump) st.voids[p][st.trump] = 1;
      else if (best.s === st.trump && !beats(c, best, st.trump)) cap[st.trump] = Math.min(cap[st.trump] == null ? 9 : cap[st.trump], PW[best.r]);
    } else if (!(best.s === st.trump && led !== st.trump) && !beats(c, best, st.trump)) {
      cap[led] = Math.min(cap[led] == null ? 9 : cap[led], PW[best.r]);   // (had to head the trick and didn't: nothing higher in that suit)
    }
  }
  function doPlay(st, p, id) {
    if ((st.phase !== 'play' && st.phase !== 'stock') || st.turn !== p) return null;
    var h = st.hands[p], i = find(h, id); if (i < 0) return null;
    if (!legal(st, p).some(function (c) { return c.id === id; })) return null;
    var card = h[i];
    noteInfer(st, p, card);
    h.splice(i, 1);
    if (st.kind === 'two' && st.phase === 'stock') st.mt[p] = st.mt[p].filter(function (x) { return x !== id; });
    st.trick.push({ p: p, c: card });
    var mv = { k: 'play', p: p, c: card };
    if (st.trick.length < st.n) { st.turn = nextSeat(st, p); return mv; }
    var w = st.trick[winIdx(st.trick, st.trump)].p, sd = sideOf(st, w);
    st.won[sd]++;
    st.trick.forEach(function (x) { st.cpts[sd] += cval(x.c); st.piles[sd].push(code(x.c)); st.gone.push(x.c.id); });
    st.lastTrick = { cards: st.trick.map(function (x) { return { p: x.p, c: x.c }; }), w: w };
    st.trick = []; st.trickNo++; st.leader = st.turn = w; st.lastBy = w;
    mv.w = w;
    var total = st.kind === 'two' ? 24 : kindOf(st).hand;
    if (st.trickNo === total) { st.cpts[sd] += 10; mv.last = 1; finishHand(st); mv.end = 1; return mv; }
    if (st.kind === 'two' && st.phase === 'stock') { st.phase = 'smeld'; st.turn = w; }
    return mv;
  }

  // ── Two-handed: meld after winning a trick, then both draw ──
  // A meld adds at least one card from the hand, and no card counts twice in one class; a royal marriage can later grow
  // into a run (a run's king and queen can't then be called a royal marriage). The dix can be swapped for the turned card.
  var KEYS = {
    run: function (t) { return ['A', '10', 'K', 'Q', 'J'].map(function (r) { return r + t; }); }, rm: function (t) { return ['K' + t, 'Q' + t]; },
    dix: function (t) { return ['9' + t]; }, A: function () { return SUITS.map(function (s) { return 'A' + s; }); }, K: function () { return SUITS.map(function (s) { return 'K' + s; }); },
    Q: function () { return SUITS.map(function (s) { return 'Q' + s; }); }, J: function () { return SUITS.map(function (s) { return 'J' + s; }); }, pin: function () { return ['Qs', 'Jd']; }
  };
  var CLS = { run: 'A', rm: 'A', m: 'A', dix: 'A', drun: 'A', A: 'B', K: 'B', Q: 'B', J: 'B', AA: 'B', KK: 'B', QQ: 'B', JJ: 'B', pin: 'C', dpin: 'C' };
  function meldOptions(st, p) {
    if (st.kind !== 'two' || st.phase !== 'smeld' || st.turn !== p) return [];
    var h = st.hands[p], t = st.trump, tab = st.mt[p], used = st.used[p], out = [];
    var rmUsed = used.rmIds || [];
    function pick(keys, k) {
      // cards for these keys: not used in this class before (a run may reuse a royal marriage's king and queen), tabled ones first
      var cls = CLS[k], taken = {}, ids = [];
      for (var i = 0; i < keys.length; i++) {
        var cand = h.filter(function (c) { return c.r + c.s === keys[i] && !taken[c.id] && (used[cls].indexOf(c.id) < 0 || (k === 'run' && rmUsed.indexOf(c.id) >= 0 && used.runIds.indexOf(c.id) < 0)); });
        if (!cand.length) return null;
        cand.sort(function (a, b) { return (tab.indexOf(b.id) >= 0) - (tab.indexOf(a.id) >= 0); });
        taken[cand[0].id] = 1; ids.push(cand[0].id);
      }
      // at least one card from the hand: swap a tabled card for a fresh twin if that is what it takes
      if (ids.every(function (id) { return tab.indexOf(id) >= 0; })) {
        for (var j = 0; j < keys.length; j++) {
          var fresh = h.filter(function (c) { return c.r + c.s === keys[j] && !taken[c.id] && tab.indexOf(c.id) < 0 && used[cls].indexOf(c.id) < 0; });
          if (fresh.length) { ids[j] = fresh[0].id; return ids; }
        }
        return null;
      }
      return ids;
    }
    used.runIds = used.runIds || [];
    function opt(k, keys, pts, s) { var ids = pick(keys, k); if (ids) out.push({ k: k, pts: pts, ids: ids, s: s || null }); }
    opt('run', KEYS.run(t), 150, t);
    opt('rm', KEYS.rm(t), 40, t);
    SUITS.forEach(function (s) { if (s !== t) opt('m', ['K' + s, 'Q' + s], 20, s); });
    // the arounds: all eight at once for the thousand (and so on), otherwise four
    [['A', 'AA'], ['K', 'KK'], ['Q', 'QQ'], ['J', 'JJ']].forEach(function (x) {
      var keys = KEYS[x[0]](), dbl = keys.concat(keys), ids = pick(dbl, x[1]);
      if (ids) out.push({ k: x[1], pts: MV[x[1]], ids: ids }); else opt(x[0], keys, MV[x[0]]);
    });
    var dp = pick(['Qs', 'Jd', 'Qs', 'Jd'], 'dpin');
    if (dp) out.push({ k: 'dpin', pts: 300, ids: dp }); else opt('pin', KEYS.pin(), 40);
    // the dix: swapped for the turned card while there is one, or simply shown
    var nine = h.filter(function (c) { return c.r === '9' && c.s === t && used.A.indexOf(c.id) < 0 && tab.indexOf(c.id) < 0; })[0];
    if (nine) out.push({ k: 'dix', pts: 10, ids: [nine.id], s: t, swap: !!(st.turnup && st.turnup.r !== '9') });
    out.sort(function (a, b) { return b.pts - a.pts; });
    return out;
  }
  function doMeld2(st, p, i) {
    if (st.kind !== 'two' || st.phase !== 'smeld' || st.turn !== p) return null;
    var opts = meldOptions(st, p), o = i >= 0 ? opts[i] : null, mv = { k: 'meld', p: p };
    if (i >= 0 && !o) return null;
    if (o) {
      var used = st.used[p], cls = CLS[o.k];
      o.ids.forEach(function (id) { if (used[cls].indexOf(id) < 0) used[cls].push(id); if (o.k !== 'dix' && st.mt[p].indexOf(id) < 0) st.mt[p].push(id); });
      if (o.k === 'rm') used.rmIds = (used.rmIds || []).concat(o.ids);
      if (o.k === 'run') used.runIds = (used.runIds || []).concat(o.ids);
      st.mpts[p] += o.pts;
      var g = { k: o.k, pts: o.pts, ids: o.ids.slice(), s: o.s };
      st.melds[p].groups.push(g); st.melds[p].pts += o.pts;
      st.mlog.push({ p: p, k: o.k, pts: o.pts, cs: o.ids.map(function (id) { var c = st.hands[p][find(st.hands[p], id)]; return c ? code(c) : ''; }).join('') });
      mv.m = { k: o.k, pts: o.pts, ids: o.ids.slice(), s: o.s };
      if (o.k === 'dix' && o.swap) {
        var j = find(st.hands[p], o.ids[0]), nine = st.hands[p][j], up = st.turnup;
        st.hands[p][j] = up; st.turnup = nine; mv.swap = { nine: nine, up: up }; sortHand(st.hands[p], st.trump);
      }
    }
    draw(st, p, mv);
    return mv;
  }
  function draw(st, w, mv) {
    var l = 1 - w, a = st.stock.shift(), b;
    if (st.stock.length) b = st.stock.shift();
    else { b = st.turnup; st.turnup = null; }
    st.hands[w].push(a); st.hands[l].push(b);
    mv.drew = [{ p: w, c: a }, { p: l, c: b, up: !st.turnup && !st.stock.length }];
    sortHand(st.hands[0], st.trump); sortHand(st.hands[1], st.trump);
    if (!st.stock.length && !st.turnup) {
      // the stock is gone: the melded cards go back into the hands, and the last 12 tricks follow the strict rules
      st.mt = [[], []]; st.phase = 'play'; mv.endgame = 1;
    } else st.phase = 'stock';
    st.turn = st.leader = w;
  }

  // ── The end of a hand ──
  function finishHand(st) {
    var S = nSides(st), meld = zeros(S), took = st.won.map(function (x) { return x > 0; }), res = [], i;
    if (st.kind === 'two') { for (i = 0; i < 2; i++) meld[i] = st.mpts[i]; }
    else st.melds.forEach(function (m, p) { meld[sideOf(st, p)] += m.pts; });
    var bs = st.bidder >= 0 ? sideOf(st, st.bidder) : -1;
    var cpts = st.cpts.slice();
    if (st.kind === 'cut' && st.buriedPts && !st.conceded) cpts[st.bidder] += st.buriedPts;   // (the buried cards' counters are the bidder's)
    for (i = 0; i < S; i++) {
      var r = { meld: meld[i], cpts: cpts[i], tricks: st.won[i], saved: st.kind === 'two' || st.conceded ? true : took[i], pts: 0 };
      if (st.conceded) { r.cpts = 0; r.pts = i === bs ? -st.high : meld[i]; if (i === bs) r.set = true; r.conceded = i === bs; }
      else if (i === bs) {
        var tot = (took[i] ? meld[i] : 0) + cpts[i];
        r.total = tot; if (tot >= st.high) { r.made = true; r.pts = tot; } else { r.set = true; r.pts = -st.high; }
      } else r.pts = (took[i] ? meld[i] : 0) + cpts[i];
      res.push(r);
    }
    var pts = res.map(function (r) { return r.pts; });
    pts.forEach(function (v, s) { st.scores[s] += v; });
    st.rounds.push(pts);
    if (bs >= 0) { if (res[bs].set) st.stats.sets[bs]++; else st.stats.made[bs]++; }
    // the history line for this hand (strings only: no arrays inside arrays)
    var hx = { d: st.dealer, h: st.deal.join('.'), sc: pts.join('.'), tot: st.scores.join('.'), c: cpts.join('.'), k: st.won.join('.') };
    if (st.kind !== 'two') {
      hx.a = st.auction.map(function (x) { return x.p + ':' + (x.b || 'p'); }).join('.'); hx.bw = st.bidder; hx.b = st.high; hx.t = st.trump;
      hx.r = st.conceded ? 'c' : res[bs].made ? 'm' : 's';
      if (st.passed) { hx.pg = st.passed; hx.pb = st.back; }
      if (st.widow) { hx.w = st.widow.map(code).join(''); hx.bu = st.buried || ''; }
    } else { hx.t = st.trump; hx.u = st.upCode || ''; hx.ml = st.mlog.map(function (m) { return m.p + ':' + m.k + ':' + m.cs; }).join('.'); }
    // every player's meld, as groups of cards: "run=AhThKhQhJh,pin=QsJd" (a player at a time, "|" between)
    hx.m = st.melds.map(function (m, p) {
      return m.groups.map(function (g) { return g.k + '=' + g.ids.map(function (id) { return codeOfId(st, id, p); }).join(''); }).join(',');
    }).join('|');
    hx.mp = st.melds.map(function (m) { return m.pts; }).join('.');
    if (st.kind !== 'two') hx.sv = took.map(function (x) { return x ? 1 : 0; }).join('');
    st.hx.push(hx);
    // moments worth remembering
    var nm = function (p) { return st.players[p].name; };
    st.melds.forEach(function (m, p) {
      m.groups.forEach(function (g) { if (bigMeld(g.k)) { st.stats.bigMeld++; st.highlights.push(nm(p) + ' laid ' + (g.k === 'AA' ? 'a thousand aces' : MNAME[g.k].toLowerCase()) + ' in hand ' + st.round); } });
      if (!st.stats.bestMeld || m.pts > st.stats.bestMeld.pts) st.stats.bestMeld = { p: p, pts: m.pts, r: st.round };
    });
    for (i = 0; i < S; i++) {
      var tn = sideName(st, i), all = st.kind === 'two' ? 24 : kindOf(st).hand;
      if (!st.conceded && st.won[i] === all) st.highlights.push(tn + ' took every trick in hand ' + st.round);
      else if (!st.conceded && st.kind !== 'two' && st.won[i] === 1 && meld[i] >= 20) st.highlights.push(tn + ' saved ' + meld[i] + ' in meld with a single trick in hand ' + st.round);
    }
    st.melds.forEach(function (m, p) { m.groups.forEach(function (g) { if (g.k === 'run') st.highlights.push(nm(p) + ' laid a run in hand ' + st.round); }); });
    if (bs >= 0 && st.kind !== 'two') {
      var who = sideName(st, bs);
      if (st.conceded) st.highlights.push(who + ' threw in a bid of ' + st.high + ' in hand ' + st.round);
      else if (res[bs].set) st.highlights.push(who + ' went set bidding ' + st.high + ' in hand ' + st.round);
      else if (st.high >= 400) st.highlights.push(who + ' made a big bid of ' + st.high + ' in hand ' + st.round);
    }
    st.last = { round: st.round, res: res, bidder: st.bidder, high: st.high, trump: st.trump, conceded: st.conceded, piles: st.piles.map(function (p) { return p.join(''); }),
      lastBy: st.lastBy, melds: st.melds, hands0: st.deal.slice(), buried: st.buried, buriedPts: st.buriedPts || 0, won: st.won.slice() };
    // the end of the game: a side at the target. The bidding side counts out first (Pagat), otherwise the higher score
    var at = []; for (i = 0; i < S; i++) if (st.scores[i] >= st.target) at.push(i);
    var w = -1;
    if (at.length) {
      if (bs >= 0 && at.indexOf(bs) >= 0) w = bs;
      else { var best = Math.max.apply(null, at.map(function (s) { return st.scores[s]; })), top = at.filter(function (s) { return st.scores[s] === best; }); if (top.length === 1) w = top[0]; }
    }
    if (w >= 0) { st.phase = 'over'; st.winner = w; st.turn = -1; if (st.series) st.series[w]++; }
    else deal(st);
  }
  function codeOfId(st, id, p) {
    // a card id back to its code: ids are c0..c47 in deck order
    var n = +String(id).slice(1); if (!(n >= 0)) return '';
    var k = n % 24, s = SUITS[Math.floor(k / 6)], r = RANKS[k % 6];
    return (r === '10' ? 'T' : r) + s;
  }
  function sideName(st, s) {
    var ps = seatsOf(st, s).map(function (p) { return st.players[p].name; });
    return ps.join(' & ');
  }

  // ── One entry for every move ──
  function apply(st, p, a) {
    if (!st || !a) return null;
    switch (a.k) {
      case 'bid': return doBid(st, p, a.b);
      case 'trump': return doTrump(st, p, a.s);
      case 'pass': return doPass(st, p, a.ids);
      case 'bury': return doBury(st, p, a.ids);
      case 'go': return doGo(st, p, !!a.concede);
      case 'play': return doPlay(st, p, a.id);
      case 'meld': return doMeld2(st, p, a.i);
    }
    return null;
  }

  // ═══ The computer players ═══════════════════════════════════════════════
  // They see only what a person in that seat would: their own hand, the meld laid on the table, the cards they
  // passed or were passed, the widow, and the play so far. Easy, Normal and Hard differ in how well they use it.
  function lvOf(st, p) { var pl = st.players[p]; return lv((pl && pl.level) || st.level); }
  function cnt(h, s) { return h.filter(function (c) { return c.s === s; }).length; }
  function has(h, r, s) { return h.filter(function (c) { return c.r === r && c.s === s; }).length; }

  // How much a hand is worth with s as trump: its meld and its strength in the play (what it can expect to take)
  function handValue(h, s, lvl) {
    var m = meldOf(h, s).pts, tl = cnt(h, s), aces = h.filter(function (c) { return c.r === 'A'; }).length;
    var tA = has(h, 'A', s), t10 = has(h, '10', s);
    var tricks = 0;
    // trump length and top trumps make the hand; off-suit aces cash, a ten behind its ace is likely a winner too
    tricks += tl * 14 + tA * 14 + t10 * 6;
    SUITS.forEach(function (x) {
      if (x === s) return;
      var a = has(h, 'A', x), t = has(h, '10', x), L = cnt(h, x);
      tricks += a * 12 + (a && t ? t * 6 : 0);
      if (L === 0 && tl >= 4) tricks += 8;   // (a void to trump in)
    });
    if (lvl === 'easy') tricks = tl * 15 + aces * 10;
    return { meld: m, play: tricks, tl: tl };
  }
  function bestTrump(h, lvl) {
    var best = null;
    SUITS.forEach(function (s) {
      var v = handValue(h, s, lvl), score = v.meld + v.play + (v.tl >= 5 ? 20 : 0);
      if (!best || score > best.score) best = { s: s, score: score, v: v };
    });
    return best;
  }
  // The most this seat would bid: its meld and play, what its partner (or the widow) is likely to add, and for
  // the partnership game the cards its partner will pass
  function maxBid(st, p) {
    var h = st.hands[p], lvl = lvOf(st, p), bt = bestTrump(h, lvl), v = bt.v;
    var counters;
    if (st.kind === 'part') {
      // the bidding side takes most of the 250 when it holds trump: from about 40% with a weak trump suit to 75%
      var share = 0.42 + 0.045 * (v.tl - 4) + v.play / 1400;
      counters = Math.max(80, Math.min(195, 250 * share));
      var mate = (p + 2) % 4, mateBid = 0, oppBid = 0;
      st.auction.forEach(function (x) { if (x.b && x.p === mate) mateBid = Math.max(mateBid, x.b); if (x.b && x.p % 2 !== p % 2) oppBid = Math.max(oppBid, x.b); });
      var mateMeld = 45 + (mateBid ? (lvl === 'hard' ? 35 + Math.min(40, (mateBid - 250) / 2) : 30) : 0) - (oppBid && lvl === 'hard' ? 10 : 0);
      var passGain = st.passN === 4 ? 45 : 35;
      // (a strong trump suit gets more from the pass: the partner sends trump and aces)
      if (v.tl >= 6) passGain += 15;
      var est = v.meld + mateMeld + passGain + counters;
      if (lvl === 'hard') est -= 5; else if (lvl === 'easy') est += (rnd() - 0.4) * 80;
      else est += (rnd() - 0.5) * 20;
      if (v.tl < 4 && lvl !== 'easy') est -= 40;   // (no trump suit to speak of: let someone else name it)
      return Math.floor(est / STEP) * STEP;
    }
    // Cutthroat: alone against two, with three widow cards to come and three to bury
    var share3 = 0.30 + 0.05 * (v.tl - 5) + v.play / 1500;
    counters = Math.max(60, Math.min(190, 250 * share3));
    var est3 = v.meld + 30 + counters + 15;
    if (lvl === 'easy') est3 += (rnd() - 0.4) * 80; else if (lvl === 'normal') est3 += (rnd() - 0.5) * 20;
    if (v.tl < 5 && lvl !== 'easy') est3 -= 40;
    return Math.floor(est3 / STEP) * STEP;
  }
  function botBid(st, p) {
    var need = minBid(st), mx = maxBid(st, p);
    if (stuck(st, p)) return MIN_BID;
    // don't outbid your own partner unless your hand wants to name trump itself
    if (st.kind === 'part' && st.bidder === (p + 2) % 4 && st.high) {
      var v = bestTrump(st.hands[p], lvOf(st, p)).v;
      if (!(v.meld >= 150 && v.tl >= 6 && mx >= need + 40)) return 0;
    }
    if (mx < need) return 0;
    // Hard opens near what it can make when its meld alone is big (so its partner knows), otherwise steps up by ten
    if (lvOf(st, p) === 'hard' && !st.high && mx >= 330) return Math.min(mx - 40, 300);
    return need;
  }
  function botTrump(st, p) {
    var h = st.hands[p].concat(st.kind === 'cut' && st.phase === 'trump' ? st.widow : []);
    return bestTrump(h, lvOf(st, p)).s;
  }
  // What the partner sends the bidder: trump (aces and tens first), aces, and pieces of the bidder's meld, keeping its
  // own meld where it can. What the bidder sends back: the cards it can't use, never its trump or its meld.
  function giftValue(c, t) {
    if (c.s === t) return { A: 70, '10': 60, K: 52, Q: 50, J: 48, '9': 40 }[c.r];
    if (c.r === 'A') return 42;
    if (c.r === '10') return 10;
    if ((c.r === 'Q' && c.s === 's') || (c.r === 'J' && c.s === 'd')) return 14;
    return { K: 6, Q: 4, J: 3, '9': 0 }[c.r] || 0;
  }
  function botPass(st, p) {
    var h = st.hands[p].slice(), t = st.trump, N = st.passN, lvl = lvOf(st, p), out = [];
    if (st.phase === 'pass') {
      // partner to bidder: greedy, the most useful card to the bidder for the least meld lost
      for (var k = 0; k < N; k++) {
        var base = meldOf(h, t).pts, best = null;
        h.forEach(function (c) {
          var rest = h.filter(function (x) { return x !== c; }), lost = base - meldOf(rest, t).pts;
          var v = giftValue(c, t) - (lvl === 'easy' ? 0 : lost * 0.9) + (lvl === 'easy' ? rnd() * 30 : 0);
          if (!best || v > best.v) best = { c: c, v: v };
        });
        out.push(best.c.id); h = h.filter(function (x) { return x !== best.c; });
      }
      return out;
    }
    // bidder to partner: keep what scores for us (Hard looks at every way to choose; the others choose one at a time)
    function keepVal(cards) {
      var m = meldOf(cards, t).pts, v = m;
      cards.forEach(function (c) { if (c.s === t) v += 30 + PW[c.r] * 2; else if (c.r === 'A') v += 22; else if (c.r === '10') v += has(cards, 'A', c.s) ? 10 : 3; });
      // a short side suit lets the bidder trump in sooner
      SUITS.forEach(function (s) { if (s !== t && !cnt(cards, s)) v += 10; });
      return v;
    }
    if (lvl === 'hard') {
      var ids = h.map(function (c) { return c; }), n = ids.length, bestSet = null, bestV = -1e9;
      var idx = []; for (var a = 0; a < N; a++) idx.push(a);
      for (;;) {
        var give = idx.map(function (i) { return ids[i]; }), keep = ids.filter(function (c, i) { return idx.indexOf(i) < 0; });
        var v2 = keepVal(keep) + give.reduce(function (s, c) { return s + (c.r === '10' || c.r === 'K' ? 2 : 0); }, 0);
        if (v2 > bestV) { bestV = v2; bestSet = give; }
        var j = N - 1; while (j >= 0 && idx[j] === n - N + j) j--;
        if (j < 0) break;
        idx[j]++; for (var q = j + 1; q < N; q++) idx[q] = idx[q - 1] + 1;
      }
      return bestSet.map(function (c) { return c.id; });
    }
    for (var k2 = 0; k2 < N; k2++) {
      var bst = null;
      h.forEach(function (c) { var v = keepVal(h.filter(function (x) { return x !== c; })) + (lvl === 'easy' ? rnd() * 25 : 0); if (!bst || v > bst.v) bst = { c: c, v: v }; });
      out.push(bst.c.id); h = h.filter(function (x) { return x !== bst.c; });
    }
    return out;
  }
  function botBury(st, p) {
    var h = st.hands[p].slice(), t = st.trump, lvl = lvOf(st, p), out = [];
    for (var k = 0; k < 3; k++) {
      var base = meldOf(h, t).pts, best = null;
      h.forEach(function (c) {
        var lost = base - meldOf(h.filter(function (x) { return x !== c; }), t).pts;
        // bury what neither melds nor wins: a counter in a short side suit is safe here (it scores for us)
        var v = -lost * 2 - (c.s === t ? 60 : 0) - (c.r === 'A' ? 30 : 0) + (isCounter(c) && c.r !== 'A' && c.s !== t ? 14 : 0) + (cnt(h, c.s) <= 2 && c.s !== t ? 8 : 0);
        if (lvl === 'easy') v += rnd() * 30;
        if (!best || v > best.v) best = { c: c, v: v };
      });
      out.push(best.c.id); h = h.filter(function (x) { return x !== best.c; });
    }
    return out;
  }
  function botGo(st, p) {
    // throw the hand in only when the bid can't (or almost can't) be reached: the others then score their meld but no counters
    var bs = sideOf(st, p), meld = 0;
    st.melds.forEach(function (m, q) { if (sideOf(st, q) === bs) meld += m.pts; });
    var need = st.high - meld, lvl = lvOf(st, p);
    if (need > 250) return { k: 'go', concede: true };
    if (lvl !== 'easy') {
      var v = handValue(st.hands[p], st.trump, lvl), mate = st.kind === 'part' ? handValue(st.hands[(p + 2) % 4] ? st.hands[(p + 2) % 4] : [], st.trump, lvl) : null;
      var share = st.kind === 'part' ? 0.42 + 0.045 * (v.tl - 4) + v.play / 1400 : 0.3 + 0.05 * (v.tl - 5) + v.play / 1500;
      if (need > 250 * Math.min(0.9, share) + (lvl === 'hard' && st.kind === 'part' ? 45 : 70)) return { k: 'go', concede: true };
    }
    return { k: 'go' };
  }

  // ── Card play ──
  function bossIn(st, p, c, seen) {
    // no card higher than c in its suit is still out (not in p's hand, not played, not in this trick)
    for (var r = PW[c.r] + 1; r <= 5; r++) {
      var rk = RANKS[r], total = 2, mine = has(st.hands[p], rk, c.s), gone = seen[rk + c.s] || 0;
      if (mine + gone < total) return false;
    }
    return true;
  }
  function seenMap(st, dull) {
    var m = {};
    if (!dull) st.gone.forEach(function (id) { var cd = codeOfId(st, id); var key = (cd.charAt(0) === 'T' ? '10' : cd.charAt(0)) + cd.charAt(1); m[key] = (m[key] || 0) + 1; });
    st.trick.forEach(function (x) { var key = x.c.r + x.c.s; m[key] = (m[key] || 0) + 1; });
    if (st.kind === 'cut' && st.buried && st.bidder >= 0) {/* (only the bidder knows these; handled by the caller) */}
    return m;
  }
  function lowest(cards, t) { return cards.slice().sort(function (a, b) { return (cval(a) - cval(b)) || ((a.s === t) - (b.s === t)) || PW[a.r] - PW[b.r]; })[0]; }
  function cheapestWinner(cards, t) { return cards.slice().sort(function (a, b) { return ((a.s === t) - (b.s === t)) || PW[a.r] - PW[b.r]; })[0]; }
  function richest(cards, t) {
    // a counter to give to a trick our side wins: a ten or king before an ace, never a trump if a side card will do
    var pr = { '10': 3, K: 2, A: 1 };
    return cards.slice().sort(function (a, b) { return ((pr[b.r] || 0) - (pr[a.r] || 0)) || ((a.s === t) - (b.s === t)) || PW[a.r] - PW[b.r]; })[0];
  }
  function teamPlaysLeft(st, p) {
    // the seats still to play this trick after p
    var out = []; for (var i = st.trick.length + 1; i < st.n; i++) out.push((st.leader + i) % st.n);
    return out;
  }
  function normalPlay(st, p, dull) {
    var opts = legal(st, p), t = st.trump; if (opts.length === 1) return opts[0];
    var h = st.hands[p], seen = seenMap(st, dull), sd = sideOf(st, p);
    var bs = st.bidder >= 0 ? sideOf(st, st.bidder) : -1;
    if (!st.trick.length) {
      // Leading. The bidding side draws trump while it holds the top of it; anyone cashes aces that are still boss;
      // otherwise lead low from a long side suit (never a lone ten into an ace)
      var tr = opts.filter(function (c) { return c.s === t; });
      var oppTrumpOut = 0; // how many trump the others may still hold
      var tseen = 0; Object.keys(seen).forEach(function (k) { if (k.slice(-1) === t) tseen += seen[k]; });
      oppTrumpOut = 12 - tseen - cnt(h, t);
      if (st.kind === 'part' && st.trickNo === 0 && p === st.bidder) {
        var ta = tr.filter(function (c) { return c.r === 'A'; });
        if (ta.length) return ta[0];
      }
      if (sd === bs && tr.length >= 3 && oppTrumpOut > 0) {
        var bossT = tr.filter(function (c) { return bossIn(st, p, c, seen); });
        if (bossT.length) return bossT[0];
      }
      var sideAces = opts.filter(function (c) { return c.s !== t && bossIn(st, p, c, seen) && isCounter(c); });
      // (not into a seat known to be out of the suit: they would trump it)
      sideAces = sideAces.filter(function (c) { return !dull && st.voids ? !otherVoid(st, p, c.s) : true; });
      if (sideAces.length) return sideAces.sort(function (a, b) { return PW[b.r] - PW[a.r]; })[0];
      if (sd === bs && tr.length && oppTrumpOut > 0 && tr.length >= 4) return lowest(tr, t);
      var side = opts.filter(function (c) { return c.s !== t; });
      var pool = side.length ? side : opts;
      var non = pool.filter(function (c) { return !isCounter(c); });
      if (non.length) pool = non;
      var counts = {}; h.forEach(function (c) { counts[c.s] = (counts[c.s] || 0) + 1; });
      return pool.slice().sort(function (a, b) { return (counts[b.s] - counts[a.s]) || PW[a.r] - PW[b.r]; })[0];
    }
    var wi = winIdx(st.trick, t), best = st.trick[wi], ours = sideOf(st, best.p) === sd && st.kind === 'part';
    var later = teamPlaysLeft(st, p), oppLater = later.filter(function (q) { return sideOf(st, q) !== sd; }).length;
    var beat = opts.filter(function (c) { return beats(c, best.c, t); });
    // can a later opponent still beat this card?
    function safe(c) {
      if (!oppLater) return true;
      if (dull) return c.r === 'A';
      if (!bossIn(st, p, c, seen)) return false;
      var led = st.trick[0].c.s;
      if (c.s !== t && later.some(function (q) { return sideOf(st, q) !== sd && st.voids[q][led] && !st.voids[q][t]; })) return false;
      return true;
    }
    if (beat.length) {
      // must head the trick: every legal card is a beater, or none is
      if (ours && !oppLater) return richest(beat, t);
      var safeB = beat.filter(safe);
      if (safeB.length) {
        // win it, and put a counter on it when that's free
        var cs = safeB.filter(function (c) { return isCounter(c) && c.r !== 'A'; });
        return cs.length ? cs[0] : cheapestWinner(safeB, t);
      }
      if (!oppLater) { var cw = beat.filter(function (c) { return isCounter(c) && c.r !== 'A'; }); return cw.length ? cw[0] : cheapestWinner(beat, t); }
      return cheapestWinner(beat, t);
    }
    // can't win the trick
    var bestSafe = !oppLater || (bossIn(st, p, best.c, seen) && !(best.c.s !== t && later.some(function (q) { return sideOf(st, q) !== sd && st.voids[q][st.trick[0].c.s]; })));
    if (ours && bestSafe) return richest(opts, t);
    return lowest(opts, t);
  }
  function otherVoid(st, p, s) { for (var q = 0; q < st.n; q++) if (q !== p && sideOf(st, q) !== sideOf(st, p) && st.voids[q][s] && !st.voids[q][st.trump]) return true; return false; }

  // Hard: deals the unseen cards out in ways that fit what it knows (the meld everyone laid, what it passed or was
  // passed, who is out of a suit or couldn't head a trick), plays each card it could play through to the end of the
  // hand with everyone playing as Normal does, and keeps the card that leaves its side best off.
  var HARD_DEALS = 28, HARD_MS = 420;
  function known(st, p) {
    // cards this seat knows are in another hand: their meld (until played), and its own pass to its partner
    var k = []; for (var q = 0; q < st.n; q++) k.push([]);
    var inHand = {}; for (q = 0; q < st.n; q++) st.hands[q].forEach(function (c) { inHand[c.id] = q; });
    if (st.melds && st.kind !== 'two') st.melds.forEach(function (m, q) { if (q === p) return; m.groups.forEach(function (g) { g.ids.forEach(function (id) { if (inHand[id] === q && k[q].indexOf(id) < 0) k[q].push(id); }); }); });
    if (st.kind === 'two' && st.mt) st.mt.forEach(function (ids, q) { if (q !== p) ids.forEach(function (id) { if (inHand[id] === q) k[q].push(id); }); });
    if (st.kind === 'part') {
      var mate = (p + 2) % 4;
      if (p === st.bidder && st.backIds) st.backIds.forEach(function (id) { if (inHand[id] === mate && k[mate].indexOf(id) < 0) k[mate].push(id); });
      if (mate === st.bidder && st.passedIds) st.passedIds.forEach(function (id) { if (inHand[id] === mate && k[mate].indexOf(id) < 0) k[mate].push(id); });
    }
    return k;
  }
  function dealOut(st, p) {
    var n = st.n, kn = known(st, p), hands = [], need = [], pool = [], q, byId = {};
    for (q = 0; q < n; q++) { st.hands[q].forEach(function (c) { byId[c.id] = c; }); }
    for (q = 0; q < n; q++) {
      if (q === p) { hands.push(st.hands[p].slice()); need.push(0); continue; }
      hands.push(kn[q].map(function (id) { return byId[id]; }));
      need.push(st.hands[q].length - kn[q].length);
      st.hands[q].forEach(function (c) { if (kn[q].indexOf(c.id) < 0) pool.push(c); });
    }
    // Cutthroat: to anyone but the bidder the three buried cards are unseen too, a hand that never plays
    if (st.kind === 'cut' && st.buriedIds && p !== st.bidder) { hands.push([]); need.push(3); st.buriedIds.forEach(function (id) { pool.push(cardOfId(id)); }); }
    var cards = shuffle(pool.slice());
    function ok(q, c) { if (q >= n) return true; if (st.voids[q][c.s]) return false; var cap = st.caps[q][c.s]; return !(cap != null && PW[c.r] > cap); }
    var N = hands.length;
    cards.sort(function (a, b) { var na = 0, nb = 0; for (var q = 0; q < N; q++) { if (need[q] > 0 && ok(q, a)) na++; if (need[q] > 0 && ok(q, b)) nb++; } return na - nb; });
    var left = need.slice();
    cards.forEach(function (c) {
      var can = []; for (var q = 0; q < N; q++) if (left[q] > 0 && ok(q, c)) can.push(q);
      if (!can.length) for (q = 0; q < N; q++) if (left[q] > 0) can.push(q);
      var pick = can[Math.floor(rnd() * can.length)]; hands[pick].push(c); left[pick]--;
    });
    return hands.slice(0, n);
  }
  function cardOfId(id) { var cd = codeOfId(null, id); return { r: cd.charAt(0) === 'T' ? '10' : cd.charAt(0), s: cd.charAt(1), id: id }; }
  function playOut(st, hands, p, card) {
    var Y = JSON.parse(JSON.stringify({ kind: st.kind, n: st.n, trump: st.trump, bidder: st.bidder, high: st.high, phase: 'play', trick: st.trick, leader: st.leader, trickNo: st.trickNo,
      gone: st.gone, voids: st.voids, caps: st.caps, won: st.won, cpts: st.cpts, players: st.players.map(function (x) { return { name: x.name, cpu: true, level: 'normal' }; }), level: 'normal' }));
    Y.hands = hands.map(function (h) { return h.slice(); }); Y.turn = p;
    var total = st.kind === 'two' ? 24 : kindOf(st).hand;
    var c = card, s;
    for (;;) {
      s = Y.turn;
      noteInfer(Y, s, c);
      Y.hands[s].splice(find(Y.hands[s], c.id), 1); Y.trick.push({ p: s, c: c });
      if (Y.trick.length === Y.n) {
        var w = Y.trick[winIdx(Y.trick, Y.trump)].p, sd = sideOf(Y, w);
        Y.won[sd]++; Y.trick.forEach(function (x) { Y.cpts[sd] += cval(x.c); Y.gone.push(x.c.id); });
        Y.trick = []; Y.trickNo++; Y.turn = Y.leader = w;
        if (Y.trickNo >= total) { Y.cpts[sd] += 10; break; }
      } else Y.turn = (s + 1) % Y.n;
      c = normalPlay(Y, Y.turn, false);
    }
    // how the hand comes out for p's side against the others
    var sd0 = sideOf(st, p), S = nSides(st), val = zeros(S);
    for (var i = 0; i < S; i++) {
      var m = 0;
      if (st.kind === 'two') m = st.mpts[i];
      else st.melds.forEach(function (mm, q) { if (sideOf(st, q) === i) m += mm.pts; });
      var got = (Y.won[i] ? m : 0) + Y.cpts[i] + (st.kind === 'cut' && i === sideOf(st, st.bidder) ? (p === st.bidder ? st.buriedPts || 0 : 10) : 0);
      if (st.bidder >= 0 && i === sideOf(st, st.bidder) && st.kind !== 'two') val[i] = got >= st.high ? got : -st.high - 60;
      else val[i] = got;
    }
    // (Cutthroat: against the best of the others, who is the one to beat)
    var others = 0, no = 0, top = -1e9; for (i = 0; i < S; i++) if (i !== sd0) { others += val[i]; no++; top = Math.max(top, val[i] + (st.scores ? st.scores[i] : 0)); }
    if (st.kind === 'cut') return val[sd0] + (st.scores ? st.scores[sd0] : 0) - (top + others / no) / 2;
    return val[sd0] - others / no;
  }
  function hardPlay(st, p) {
    var opts = legal(st, p); if (opts.length < 2) return opts[0];
    // (two copies of a card play the same)
    var uniq = [], seenK = {}; opts.forEach(function (c) { if (!seenK[c.r + c.s]) { seenK[c.r + c.s] = 1; uniq.push(c); } });
    if (uniq.length < 2) return uniq[0];
    var tot = uniq.map(function () { return 0; }), t0 = Date.now(), n;
    for (n = 0; n < HARD_DEALS && (n < 10 || Date.now() - t0 < HARD_MS); n++) {
      var hands = dealOut(st, p);
      for (var i = 0; i < uniq.length; i++) tot[i] += playOut(st, hands, p, uniq[i]);
    }
    var best = 0; for (i = 1; i < uniq.length; i++) if (tot[i] > tot[best] + 1e-9) best = i;
    var usual = normalPlay(st, p, false), u = -1;
    for (i = 0; i < uniq.length; i++) if (uniq[i].r === usual.r && uniq[i].s === usual.s) u = i;
    return u >= 0 && tot[u] >= tot[best] - 1e-9 ? usual : uniq[best];
  }
  // Two-handed, while the stock lasts: win the tricks with counters in them and the ones that let you meld, cheaply;
  // otherwise give away a card that neither melds nor counts
  function meldNeed(st, p) {
    // the cards worth keeping for meld: those in any meld of the hand with trump
    var m = meldOf(st.hands[p], st.trump), keep = {};
    m.groups.forEach(function (g) { g.ids.forEach(function (id) { keep[id] = 1; }); });
    return keep;
  }
  function stockPlay(st, p) {
    var h = st.hands[p], t = st.trump, keep = meldNeed(st, p), lvl = lvOf(st, p);
    function junk(cards) {
      return cards.slice().sort(function (a, b) {
        var va = (keep[a.id] ? 40 : 0) + cval(a) * 2 + (a.s === t ? 25 : 0) + PW[a.r];
        var vb = (keep[b.id] ? 40 : 0) + cval(b) * 2 + (b.s === t ? 25 : 0) + PW[b.r];
        return va - vb;
      })[0];
    }
    if (lvl === 'easy' && rnd() < 0.3) return h[Math.floor(rnd() * h.length)];
    if (!st.trick.length) return junk(h);
    var led = st.trick[0].c, beat = h.filter(function (c) { return beats(c, led, t); });
    var unmelded = meldOptionsFor(st, p);
    // (Hard also takes a trick for a smaller meld, and fights for the last cards of the stock)
    var want = isCounter(led) || unmelded >= 40 || (lvl === 'hard' && (unmelded >= 20 || st.stock.length <= 4));
    if (want && beat.length) {
      var cheap = beat.slice().sort(function (a, b) {
        var va = (keep[a.id] ? 30 : 0) + (a.s === t ? 20 + PW[a.r] * 3 : PW[a.r]) - (isCounter(a) && a.s === led.s ? 12 : 0);
        var vb = (keep[b.id] ? 30 : 0) + (b.s === t ? 20 + PW[b.r] * 3 : PW[b.r]) - (isCounter(b) && b.s === led.s ? 12 : 0);
        return va - vb;
      })[0];
      // (not a trump ace or a run card for a nine)
      if (!(cheap.s === t && (cheap.r === 'A' || keep[cheap.id]) && !isCounter(led) && unmelded < 80)) return cheap;
    }
    return junk(h);
  }
  function meldOptionsFor(st, p) {
    // the best meld p could lay after winning a trick now (a pretend smeld phase)
    var keep = { phase: st.phase, turn: st.turn };
    st.phase = 'smeld'; st.turn = p;
    var o = meldOptions(st, p);
    st.phase = keep.phase; st.turn = keep.turn;
    return o.length ? o[0].pts : 0;
  }
  function botMeld2(st, p) {
    var o = meldOptions(st, p); if (!o.length) return -1;
    var lvl = lvOf(st, p);
    if (lvl === 'easy') return rnd() < 0.2 ? -1 : 0;
    // the royal marriage before the run when both are there: 40 now and the run's 150 next time
    if (lvl === 'hard' && o[0].k === 'run') { for (var i = 0; i < o.length; i++) if (o[i].k === 'rm' && st.stock.length > 2) return i; }
    return 0;
  }
  function bot(st, p) {
    if (!st || turn(st) !== p) return null;
    var lvl = lvOf(st, p);
    switch (st.phase) {
      case 'bid': return { k: 'bid', b: botBid(st, p) };
      case 'trump': return { k: 'trump', s: botTrump(st, p) };
      case 'pass': case 'passback': return { k: 'pass', ids: botPass(st, p) };
      case 'bury': return { k: 'bury', ids: botBury(st, p) };
      case 'meld': return botGo(st, p);
      case 'smeld': return { k: 'meld', i: botMeld2(st, p) };
      case 'stock': return { k: 'play', id: stockPlay(st, p).id };
      case 'play':
        if (lvl === 'hard') return { k: 'play', id: hardPlay(st, p).id };
        if (lvl === 'easy') { var o = legal(st, p); return { k: 'play', id: (rnd() < 0.3 ? o[Math.floor(rnd() * o.length)] : normalPlay(st, p, true)).id }; }
        return { k: 'play', id: normalPlay(st, p, false).id };
    }
    return null;
  }

  var API = {
    RANKS: RANKS, SUITS: SUITS, SNAME: SNAME, MV: MV, MNAME: MNAME, MIN_BID: MIN_BID, STEP: STEP, KINDS: KINDS, PW: PW, C: C,
    deck: deck, code: code, cval: cval, isCounter: isCounter, sortHand: sortHand, meldOf: meldOf, bigMeld: bigMeld, beats: beats, winIdx: winIdx,
    legal: legal, legalStrict: legalStrict, whyNot: whyNot, rname: rname, newGame: newGame, deal: deal, turn: turn, minBid: minBid, stuck: stuck,
    apply: apply, bot: bot, meldOptions: meldOptions, sideOf: sideOf, seatsOf: seatsOf, nSides: nSides, sideName: sideName, codeOfId: codeOfId,
    bestTrump: bestTrump, handValue: handValue, maxBid: maxBid, find: find, lv: lv
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.PinoCore = API;
})(typeof window !== 'undefined' ? window : this);
