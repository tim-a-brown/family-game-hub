// ═══════════════════════════════════════════════════════════════════════════
// Canasta: the rules and the computer players (window.CanastaCore, or require() in Node for testing).
//
// Classic Canasta as Hoyle and Pagat (pagat.com/rummy/canasta.html) give it:
//   - Two 52-card decks and four jokers, 108 cards. Jokers and 2s are wild. Red 3s are bonus cards, laid face up as
//     soon as they are dealt or drawn (a replacement is drawn from the stock); black 3s block the discard pile.
//   - Card values: joker 50, 2 and ace 20, K Q J 10 9 8 10, 7 6 5 4 and the black 3 5.
//   - A meld is three or more cards of one rank (4 to ace), with at least two natural cards and no more than three wild
//     cards. A side has one meld of each rank; more of that rank are added to it. A meld of seven is a canasta: natural
//     (no wild card) 500, mixed 300. Black 3s are melded only by a player going out, three or four of them, no wilds.
//   - A side's first meld must be worth at least 15 (score below zero), 50 (0 to 1,495), 90 (1,500 to 2,995) or 120
//     (3,000 or more), counted from the cards' values only. Several melds made in one turn count together; a player
//     taking the discard pile counts its top card with cards from the hand, never other cards of the pile.
//   - The discard pile is frozen while it holds a wild card or a red 3 (the first wild card is turned across it), and
//     for a side that hasn't melded yet. A frozen pile is taken only with a natural pair matching its top card. An
//     unfrozen pile can also be taken with a natural card and a wild card, or by adding its top card to a meld the
//     side already has. Nobody takes the pile with a black 3 or a wild card on top. The top card is melded at once, the
//     rest go into the hand.
//   - Going out (melding every card, or discarding the last one) needs a canasta on the side (two in the two-handed
//     game). Before going out a player may ask their partner "may I go out?" and the answer binds: no means not this
//     turn, yes means they must. Going out: 100; concealed (melding the whole hand in one turn having melded nothing
//     before): 200, and from the stock the first-meld minimum doesn't apply.
//   - Scoring a hand: canastas and red 3s (100 each, all four 800, counted against a side that hasn't melded), the
//     going-out bonus, the cards melded, less the cards left in the side's hands.
//   - When the stock is gone, play goes on while each player in turn takes the discard pile; a player must take it when
//     its top card goes on one of the side's melds. A red 3 as the stock's last card ends the hand at once.
//   - The game is to 5,000.
//
//   kind 'part'   four players, partners across the table, 11 cards each (the classic game)
//   kind 'two'    two players, 15 cards each, draw two from the stock and discard one, two canastas to go out
//   kind 'three'  three players each for themselves, 13 cards each
//
// State (plain JSON, the saved game and the online table are the same object): see newGame() and deal().
// Moves: apply(st, seat, a) with a = {k:'draw'}, {k:'take', ids, groups}, {k:'meld', groups, adds}, {k:'discard', id},
// {k:'ask'}, {k:'answer', yes}, {k:'end'} (the stock is gone and the pile isn't taken). It returns the move (for drawing
// it) or null. why(st, seat, a) says in a sentence why a move isn't allowed. bot(st, seat) is the computer's move.
// ═══════════════════════════════════════════════════════════════════════════
(function (root) {
  'use strict';
  var NAT = ['4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  var ORD = { '3': 0, '4': 1, '5': 2, '6': 3, '7': 4, '8': 5, '9': 6, '10': 7, J: 8, Q: 9, K: 10, A: 11, '2': 12, JK: 13 };
  var SUITS = ['s', 'h', 'd', 'c'];
  var RNAME = { '3': 'three', '4': 'four', '5': 'five', '6': 'six', '7': 'seven', '8': 'eight', '9': 'nine', '10': 'ten', J: 'jack', Q: 'queen', K: 'king', A: 'ace', '2': 'two', JK: 'joker' };
  var PLURAL = { '3': 'threes', '4': 'fours', '5': 'fives', '6': 'sixes', '7': 'sevens', '8': 'eights', '9': 'nines', '10': 'tens', J: 'jacks', Q: 'queens', K: 'kings', A: 'aces' };
  var KINDS = { part: { n: 4, sides: 2, hand: 11, draw: 1, need: 1 }, three: { n: 3, sides: 3, hand: 13, draw: 1, need: 1 }, two: { n: 2, sides: 2, hand: 15, draw: 2, need: 2 } };
  var TARGET = 5000, BIG_PILE = 10;
  var C = { rng: Math.random };   // (tests swap in a seeded generator)
  function rnd() { return C.rng(); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  // ── Cards ──
  function deck() {
    var out = [], id = 0;
    for (var d = 0; d < 2; d++) SUITS.forEach(function (s) { ['2', '3'].concat(NAT).forEach(function (r) { out.push({ r: r, s: s, id: 'c' + (id++) }); }); });
    for (var j = 0; j < 4; j++) out.push({ r: 'JK', s: j % 2 ? 'r' : 'b', id: 'c' + (id++) });   // (two black jokers and two red, as most decks print them)
    return out;
  }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function isWild(c) { return c.r === '2' || c.r === 'JK'; }
  function isRed3(c) { return c.r === '3' && (c.s === 'h' || c.s === 'd'); }
  function isBlack3(c) { return c.r === '3' && (c.s === 's' || c.s === 'c'); }
  function val(c) { return c.r === 'JK' ? 50 : c.r === '2' || c.r === 'A' ? 20 : ORD[c.r] >= ORD['8'] ? 10 : c.r === '3' && isRed3(c) ? 100 : 5; }
  function sum(cards) { var t = 0; cards.forEach(function (c) { t += val(c); }); return t; }
  function wilds(cards) { return cards.filter(isWild).length; }
  function find(h, id) { for (var i = 0; i < h.length; i++) if (h[i].id === id) return i; return -1; }
  function sortHand(h) { return h.sort(function (a, b) { return ORD[a.r] - ORD[b.r] || SUITS.indexOf(a.s) - SUITS.indexOf(b.s) || (a.id < b.id ? -1 : 1); }); }
  function rname(c) { return c.r === 'JK' ? 'joker' : RNAME[c.r] + ' of ' + { s: 'spades', h: 'hearts', d: 'diamonds', c: 'clubs' }[c.s]; }
  function kindOf(st) { return KINDS[st.kind]; }
  function sideOf(st, p) { return st.kind === 'part' ? p % 2 : p; }
  function nSides(st) { return kindOf(st).sides; }
  function seatsOf(st, s) { return st.kind === 'part' ? [s, s + 2] : [s]; }
  function partner(st, p) { return st.kind === 'part' ? (p + 2) % 4 : -1; }
  function sideName(st, s) { return seatsOf(st, s).map(function (p) { return st.players[p].name; }).join(' & '); }
  function minMeld(score) { return score < 0 ? 15 : score < 1500 ? 50 : score < 3000 ? 90 : 120; }
  function needFor(st, s) { return minMeld(st.scores[s]); }
  function melded(st, s) { return st.melds[s].length > 0; }
  function meldOfRank(st, s, r) { for (var i = 0; i < st.melds[s].length; i++) if (st.melds[s][i].r === r) return st.melds[s][i]; return null; }
  function isCanasta(m) { return m.cards.length >= 7; }
  function isNatural(m) { return wilds(m.cards) === 0; }
  function canastas(st, s) { return st.melds[s].filter(isCanasta).length; }
  function frozenAll(st) { return st.pile.some(function (c) { return isWild(c) || isRed3(c); }); }
  function frozenFor(st, s) { return frozenAll(st) || !melded(st, s); }
  function top(st) { return st.pile.length ? st.pile[st.pile.length - 1] : null; }
  function turn(st) { return !st || st.phase === 'over' ? -1 : st.turn; }
  function canOut(st, s) { return canastas(st, s) >= kindOf(st).need; }

  // The rank of a new meld made of these cards, or null (out: the player is going out, so black 3s may be melded)
  function newRank(cards, out) {
    var nat = cards.filter(function (c) { return !isWild(c); }), w = cards.length - nat.length;
    if (cards.length < 3 || nat.length < 2 || w > 3) return null;
    var r = nat[0].r;
    if (!nat.every(function (c) { return c.r === r; })) return null;
    if (r === '3') return out && w === 0 && cards.length <= 4 && nat.every(isBlack3) ? '3' : null;
    return r;
  }
  function addOk(m, cards) {
    if (m.r === '3') return false;
    if (!cards.every(function (c) { return isWild(c) || c.r === m.r; })) return false;
    return wilds(m.cards) + wilds(cards) <= 3;
  }

  // ── A new game and a new deal ──
  // cfg: {kind, players: [{name, cpu, level}], target, level}
  function newGame(cfg) {
    var K = KINDS[cfg.kind] ? cfg.kind : 'part', n = KINDS[K].n, ns = KINDS[K].sides;
    var st = {
      v: 1, kind: K, n: n, target: +cfg.target || TARGET, level: lv(cfg.level),
      players: cfg.players.slice(0, n).map(function (p) { return { name: p.name, cpu: !!p.cpu, level: p.cpu ? lv(p.level || cfg.level) : undefined }; }),
      scores: zeros(ns), round: 0, dealer: Math.floor(rnd() * n), started: Date.now(),
      rounds: [], hx: [], highlights: [], last: null,
      stats: { canN: zeros(ns), canM: zeros(ns), outs: zeros(ns), conc: zeros(ns), red4: zeros(ns), bigPile: null, behind: zeros(ns), firstCan: 0 }
    };
    deal(st);
    return st;
  }
  function lv(v) { return v === 'easy' || v === 'hard' || v === 'expert' ? v : 'normal'; }
  function zeros(n) { var a = []; for (var i = 0; i < n; i++) a.push(0); return a; }
  function deal(st) {
    st.round++; st.dealer = (st.dealer + 1) % st.n;
    var K = kindOf(st), d = shuffle(deck()), n = st.n;
    st.hands = []; for (var p = 0; p < n; p++) st.hands.push([]);
    var first = (st.dealer + 1) % n;
    for (var r = 0; r < K.hand; r++) for (var q = 0; q < n; q++) st.hands[(first + q) % n].push(d.pop());
    st.stock = d;
    st.melds = []; st.red3 = []; for (var s = 0; s < K.sides; s++) { st.melds.push([]); st.red3.push([]); }
    // the upcard: a wild card or a red 3 is covered by the next card, and the pile starts frozen
    st.pile = [st.stock.pop()];
    while (isWild(top(st)) || isRed3(top(st))) st.pile.push(st.stock.pop());
    // red 3s dealt are laid out at once, each replaced from the stock (starting left of the dealer)
    st.dealR3 = [];
    for (q = 0; q < n; q++) {
      var pp = (first + q) % n, h = st.hands[pp];
      for (var i = h.length - 1; i >= 0; i--) {
        if (!isRed3(h[i])) continue;
        var c3 = h.splice(i, 1)[0]; st.red3[sideOf(st, pp)].push(c3); st.dealR3.push({ p: pp, c: c3 });
        var rep = st.stock.pop(); h.push(rep); if (isRed3(rep)) i = h.length;   // (look again: the replacement may be one)
      }
    }
    st.hands.forEach(sortHand);
    st.pm = []; for (q = 0; q < n; q++) st.pm.push(false);
    st.disc = [];   // the discards as they went down: {p, r} (what everyone at a real table saw), the last 40
    st.out = -1; st.endHow = null;
    startTurn(st, first);
  }
  function startTurn(st, p) {
    st.turn = p; st.phase = 'draw'; st.took = false; st.asked = 0; st.tmeld = false; st.drawn = []; st.pm0 = st.pm[p]; st.askBy = -1;
  }

  // ── Moves ──
  // (all or nothing: the move is worked out on a copy and only kept when it is allowed)
  function apply(st, p, a) {
    var T = clone(st), r = act(T, p, a, true);
    if (typeof r === 'string') return null;
    Object.keys(st).forEach(function (k) { delete st[k]; });
    Object.keys(T).forEach(function (k) { st[k] = T[k]; });
    return r;
  }
  function why(st, p, a) { var T = clone(st), r = act(T, p, a, false); return typeof r === 'string' ? r : ''; }
  function act(st, p, a, live) {
    if (!st || st.phase === 'over' || !a) return 'The game is over';
    if (a.k === 'answer') return doAnswer(st, p, a.yes);
    if (st.turn !== p) return 'It isn’t your turn';
    switch (a.k) {
      case 'draw': return doDraw(st, p);
      case 'take': return doTake(st, p, a.ids || [], a.groups || []);
      case 'meld': return doMeld(st, p, a.groups || [], a.adds || []);
      case 'discard': return doDiscard(st, p, a.id);
      case 'ask': return doAsk(st, p);
      case 'end': return doEnd(st, p);
    }
    return 'That isn’t a move';
  }
  function pickIds(h, ids) {
    var out = [], seen = {};
    if (!Array.isArray(ids)) return null;
    for (var i = 0; i < ids.length; i++) { var j = find(h, ids[i]); if (j < 0 || seen[ids[i]]) return null; seen[ids[i]] = 1; out.push(h[j]); }
    return out;
  }
  function drop(h, ids) { for (var i = h.length - 1; i >= 0; i--) if (ids.indexOf(h[i].id) >= 0) h.splice(i, 1); }
  // what a meld turning into a canasta is, for the moments
  function canNote(st, s, m, was) {
    if (!isCanasta(m)) return null;
    var nat = isNatural(m);
    if (was && was.can && was.nat === nat) return null;
    if (was && was.can && !nat) return { r: m.r, nat: false, spoilt: true };
    var first = !st.stats.firstCan; if (first) st.stats.firstCan = 1;
    return { r: m.r, nat: nat, first: first };
  }
  function snapMelds(st, s) { var o = {}; st.melds[s].forEach(function (m) { o[m.r] = { can: isCanasta(m), nat: isNatural(m) }; }); return o; }

  function doDraw(st, p) {
    if (st.phase !== 'draw') return 'You’ve already drawn';
    if (!st.stock.length) return 'The stock is gone';
    var s = sideOf(st, p), h = st.hands[p], want = kindOf(st).draw, got = [], r3 = [], endR3 = false;
    while (got.length < want && st.stock.length) {
      var c = st.stock.pop();
      if (isRed3(c)) { st.red3[s].push(c); r3.push(c); if (!st.stock.length) { endR3 = true; break; } continue; }
      h.push(c); got.push(c);
    }
    sortHand(h);
    st.drawn = got.map(function (c) { return c.id; });
    var mv = { k: 'draw', p: p, cards: got, r3: r3 };
    if (r3.length && st.red3[s].length === 4) mv.red4 = true;
    if (endR3) { mv.end = 1; finishHand(st, 'red3', p); return mv; }
    st.phase = 'play';
    return mv;
  }

  // Taking the pile: ids are the cards from the hand that go with its top card; groups (only for a side's first meld)
  // are more melds from the hand counted toward the minimum
  function doTake(st, p, ids, groups) {
    if (st.phase !== 'draw') return 'You’ve already drawn';
    var t = top(st), s = sideOf(st, p), h = st.hands[p];
    if (!t) return 'There’s no discard pile to take';
    if (isWild(t)) return 'Nobody can take the pile with a wild card on top';
    if (isBlack3(t)) return 'A black 3 on top blocks the pile for this turn';
    var mine = pickIds(h, ids); if (!mine) return 'Those cards aren’t in your hand';
    var fr = frozenFor(st, s), wasMelded = melded(st, s), m = meldOfRank(st, s, t.r);
    var natSame = mine.filter(function (c) { return !isWild(c) && c.r === t.r; }).length;
    if (mine.some(function (c) { return !isWild(c) && c.r !== t.r; })) return 'Only cards that match the top card go with it';
    if (!mine.length) {
      if (!m) return 'You need cards from your hand that match the ' + RNAME[t.r];
      if (fr) return frozenAll(st) ? 'The pile is frozen, so it takes a natural pair of ' + PLURAL[t.r] + ' from your hand' : 'Before your side’s first meld it takes a natural pair of ' + PLURAL[t.r] + ' from your hand';
    } else if (fr && natSame < 2) {
      return frozenAll(st) ? 'The pile is frozen, so it takes a natural pair of ' + PLURAL[t.r] + ' from your hand' : 'Before your side’s first meld it takes a natural pair of ' + PLURAL[t.r] + ' from your hand';
    } else if (!fr && !m && natSame < 1) return 'It takes a natural ' + RNAME[t.r] + ' from your hand';
    var cards = [t].concat(mine), before = snapMelds(st, s), notes = [];
    if (m) { if (!addOk(m, cards)) return 'A meld can’t hold more than three wild cards'; }
    else if (!newRank(cards, false)) return 'A meld needs two natural cards and no more than three wild cards';
    // more melds from the hand, for the first meld's count
    if (groups.length && wasMelded) return 'Lay your other melds after you take the pile';
    var used = ids.slice(), gcards = [], ranks = {}; ranks[t.r] = 1;
    for (var g = 0; g < groups.length; g++) {
      var gc = pickIds(h, groups[g]); if (!gc || !gc.length) return 'Those cards aren’t in your hand';
      if (groups[g].some(function (id) { return used.indexOf(id) >= 0; })) return 'A card can only go in one meld';
      used = used.concat(groups[g]);
      var gr = newRank(gc, false); if (!gr) return 'A meld needs three cards of one rank, with two natural cards and no more than three wild cards';
      if (ranks[gr]) return 'Your side keeps one meld of each rank'; ranks[gr] = 1;
      gcards.push(gc);
    }
    var need = needFor(st, s), count = sum(cards) + gcards.reduce(function (a, x) { return a + sum(x); }, 0);
    if (!wasMelded && count < need) return 'Your side’s first meld must be worth ' + need + ', and this is worth ' + count;
    // the move itself
    var pileN = st.pile.length, frozenNow = frozenAll(st);
    st.pile.pop(); drop(h, used);
    if (m) m.cards = m.cards.concat(cards); else { m = { r: t.r, cards: cards }; st.melds[s].push(m); }
    var n1 = canNote(st, s, m, before[m.r]); if (n1) notes.push(n1);
    gcards.forEach(function (gc) { var nm = { r: newRank(gc, false), cards: gc }; st.melds[s].push(nm); var n2 = canNote(st, s, nm, null); if (n2) notes.push(n2); });
    var rest = st.pile.splice(0), r3 = [];
    rest.forEach(function (c) { if (isRed3(c)) { st.red3[s].push(c); r3.push(c); } else h.push(c); });
    sortHand(h);
    var outNow = h.length <= 1;
    if (outNow && (!canOut(st, s) || st.asked === 'no')) return h.length ? 'You need ' + canNeed(st) + ' on your side before you can go out, so keep two cards to discard from' : 'You can’t meld your last card without ' + canNeed(st) + ' on your side';
    st.pm[p] = true; st.took = true; st.phase = 'play';
    st.drawn = rest.filter(function (c) { return !isRed3(c); }).map(function (c) { return c.id; });
    var mv = { k: 'take', p: p, top: t, ids: ids.slice(), groups: groups.map(function (x) { return x.slice(); }), n: pileN, frozen: frozenNow, cards: rest, r3: r3, can: notes, first: !wasMelded };
    if (r3.length && st.red3[s].length === 4) mv.red4 = true;
    if (frozenNow && pileN >= BIG_PILE) { mv.big = true; if (!st.stats.bigPile || pileN > st.stats.bigPile.n) st.stats.bigPile = { n: pileN, p: p, r: st.round }; hl(st, st.players[p].name + ' took a frozen pile of ' + pileN + ' cards in hand ' + st.round); }
    noteCans(st, p, notes);
    if (!h.length) { mv.out = 1; finishHand(st, 'out', p); }
    return mv;
  }
  function canNeed(st) { return kindOf(st).need === 2 ? 'two canastas' : 'a canasta'; }

  // Melding from the hand: new melds (groups) and cards added to the side's melds (adds: [{r, ids}])
  function doMeld(st, p, groups, adds) {
    if (st.phase === 'draw') return 'Draw first';
    if (st.phase !== 'play') return 'Not now';
    var s = sideOf(st, p), h = st.hands[p], wasMelded = melded(st, s), used = [], ranks = {}, gcs = [], acs = [];
    if (!groups.length && !adds.length) return 'Choose cards to meld';
    for (var a = 0; a < adds.length; a++) {
      var m = meldOfRank(st, s, adds[a].r); if (!m) return 'Your side has no meld of that rank';
      var ac = pickIds(h, adds[a].ids); if (!ac || !ac.length) return 'Those cards aren’t in your hand';
      if (adds[a].ids.some(function (id) { return used.indexOf(id) >= 0; })) return 'A card can only go in one meld';
      used = used.concat(adds[a].ids);
      if (!ac.every(function (c) { return isWild(c) || c.r === m.r; })) return 'Only ' + PLURAL[m.r] + ' and wild cards go on that meld';
      acs.push({ m: m, cards: ac });
    }
    acs.forEach(function (x) { if (wilds(x.m.cards) + wilds(x.cards) + acs.filter(function (y) { return y !== x && y.m === x.m; }).reduce(function (t, y) { return t + wilds(y.cards); }, 0) > 3) x.bad = 1; });
    if (acs.some(function (x) { return x.bad; })) return 'A meld can’t hold more than three wild cards';
    var left = h.length - used.length;
    for (var g = 0; g < groups.length; g++) {
      var gc = pickIds(h, groups[g]); if (!gc || !gc.length) return 'Those cards aren’t in your hand';
      if (groups[g].some(function (id) { return used.indexOf(id) >= 0; })) return 'A card can only go in one meld';
      used = used.concat(groups[g]); left -= gc.length;
      gcs.push(gc);
    }
    var outNow = left <= 1, okOut = st.asked !== 'no';
    var news = [];
    for (g = 0; g < gcs.length; g++) {
      var r = newRank(gcs[g], outNow);
      if (!r) {
        var nat = gcs[g].filter(function (c) { return !isWild(c); });
        if (nat.length && nat[0].r === '3') return nat.some(isRed3) ? 'Red 3s are never melded' : 'Black 3s are melded only when you go out, three or four of them with no wild cards';
        if (gcs[g].length < 3) return 'A meld needs at least three cards';
        if (nat.length < 2) return 'A meld needs at least two natural cards';
        if (gcs[g].length - nat.length > 3) return 'A meld can’t hold more than three wild cards';
        return 'A meld is cards of one rank';
      }
      if (meldOfRank(st, s, r)) return 'Your side already has a meld of ' + PLURAL[r] + ', so add to it';
      if (ranks[r]) return 'Your side keeps one meld of each rank'; ranks[r] = 1;
      news.push({ r: r, cards: gcs[g] });
    }
    // the first meld's minimum (waived for a player going out concealed from the stock)
    if (!wasMelded) {
      var need = needFor(st, s), count = news.reduce(function (t, x) { return t + sum(x.cards); }, 0);
      var concealedOut = outNow && !st.took && !st.pm0;
      if (count < need && !(concealedOut && canOutAfter(st, s, news, acs))) return 'Your side’s first meld must be worth ' + need + ', and this is worth ' + count;
    }
    if (outNow) {
      if (!okOut) return left ? 'Your partner said not yet, so keep two cards' : 'Your partner said not yet, so you can’t go out this turn';
      if (!canOutAfter(st, s, news, acs)) return left ? 'You need ' + canNeed(st) + ' before you can go out, so keep two cards to discard from' : 'You need ' + canNeed(st) + ' before you can go out';
    }
    var before = snapMelds(st, s), notes = [];
    drop(h, used);
    acs.forEach(function (x) { x.m.cards = x.m.cards.concat(x.cards); });
    news.forEach(function (x) { st.melds[s].push(x); });
    st.melds[s].forEach(function (m2) { var n = canNote(st, s, m2, before[m2.r]); if (n) notes.push(n); });
    st.pm[p] = true; st.tmeld = true;
    var mv = { k: 'meld', p: p, groups: groups.map(function (x) { return x.slice(); }), adds: adds.map(function (x) { return { r: x.r, ids: x.ids.slice() }; }), can: notes, first: !wasMelded,
      pts: news.reduce(function (t, x) { return t + sum(x.cards); }, 0) + acs.reduce(function (t, x) { return t + sum(x.cards); }, 0) };
    noteCans(st, p, notes);
    if (!h.length) { mv.out = 1; finishHand(st, 'out', p); }
    return mv;
  }
  function canOutAfter(st, s, news, acs) {
    var n = 0, extra = {};
    acs.forEach(function (x) { extra[x.m.r] = (extra[x.m.r] || 0) + x.cards.length; });
    st.melds[s].forEach(function (m) { if (m.cards.length + (extra[m.r] || 0) >= 7) n++; });
    news.forEach(function (x) { if (x.cards.length >= 7) n++; });
    return n >= kindOf(st).need;
  }
  function noteCans(st, p, notes) {
    var s = sideOf(st, p);
    notes.forEach(function (n) {
      if (n.spoilt) { st.stats.canN[s] = Math.max(0, st.stats.canN[s] - 1); st.stats.canM[s]++; return; }
      if (n.nat) st.stats.canN[s]++; else st.stats.canM[s]++;
      if (n.nat) hl(st, st.players[p].name + ' made a natural canasta of ' + PLURAL[n.r] + ' in hand ' + st.round);
    });
  }

  function doDiscard(st, p, id) {
    if (st.phase === 'draw') return 'Draw first';
    if (st.phase !== 'play') return 'Not now';
    var h = st.hands[p], i = find(h, id), s = sideOf(st, p);
    if (i < 0) return 'That card isn’t in your hand';
    if (h.length === 1) {
      if (st.asked === 'no') return 'Your partner said not yet, so you can’t go out this turn';
      if (!canOut(st, s)) return 'You need ' + canNeed(st) + ' before you can discard your last card';
    } else if (st.asked === 'yes' && planOut(st, p)) return 'Your partner said yes, so go out this turn';
    var c = h.splice(i, 1)[0];
    st.pile.push(c);
    st.disc.push({ p: p, r: c.r }); if (st.disc.length > 40) st.disc.shift();
    var mv = { k: 'discard', p: p, c: c, freeze: isWild(c) && st.pile.filter(isWild).length === 1 && !st.pile.some(isRed3), block: isBlack3(c) };
    if (!h.length) { mv.out = 1; finishHand(st, 'out', p); return mv; }
    startTurn(st, (p + 1) % st.n);
    return mv;
  }

  // "May I go out?" The partner answers, and the answer binds for this turn
  function doAsk(st, p) {
    if (st.kind !== 'part') return 'Only partners ask';
    if (st.phase !== 'play') return st.phase === 'draw' ? 'Draw first' : 'Not now';
    if (st.asked) return 'You’ve already asked this turn';
    if (st.tmeld) return 'Ask before you meld';
    if (st.hands[p].length < 2) return 'Go out without asking';
    if (!planOut(st, p)) return 'You can’t go out yet';
    st.askBy = p; st.phase = 'ask'; st.turn = partner(st, p);
    return { k: 'ask', p: p, to: st.turn };
  }
  function doAnswer(st, p, yes) {
    if (st.phase !== 'ask' || st.turn !== p) return 'Nobody asked you';
    var q = st.askBy; st.asked = yes ? 'yes' : 'no'; st.turn = q; st.phase = 'play';
    return { k: 'answer', p: p, to: q, yes: !!yes };
  }

  // The stock is gone: the player has to take the pile when its top card goes on one of the side's melds
  function mustTake(st, p) {
    var t = top(st), s = sideOf(st, p);
    return !!(t && !isWild(t) && !isBlack3(t) && !frozenFor(st, s) && meldOfRank(st, s, t.r) && apply(clone(st), p, { k: 'take', ids: [], groups: [] }));
  }
  function doEnd(st, p) {
    if (st.phase !== 'draw') return 'Not now';
    if (st.stock.length) return 'Draw from the stock';
    if (mustTake(st, p)) return 'The top card goes on one of your side’s melds, so you have to take the pile';
    var mv = { k: 'end', p: p, end: 1 };
    finishHand(st, 'stock', p);
    return mv;
  }

  // ── The end of a hand ──
  function hl(st, t) { st.highlights.push(t); if (st.highlights.length > 30) st.highlights.shift(); }
  function finishHand(st, how, p) {
    var ns = nSides(st), res = [], out = how === 'out' ? p : -1, conc = out >= 0 && !st.pm0;
    for (var s = 0; s < ns; s++) {
      var mel = melded(st, s), cn = 0, cm = 0, mp = 0;
      st.melds[s].forEach(function (m) { if (isCanasta(m)) { if (isNatural(m)) cn++; else cm++; } mp += sum(m.cards); });
      var r3n = st.red3[s].length, r3 = r3n === 4 ? 800 : r3n * 100; if (!mel) r3 = -r3;
      var hand = 0; seatsOf(st, s).forEach(function (q) { hand += sum(st.hands[q]); });
      var outB = out >= 0 && sideOf(st, out) === s ? (conc ? 200 : 100) : 0;
      var tot = cn * 500 + cm * 300 + r3 + outB + mp - hand;
      res.push({ cn: cn, cm: cm, r3n: r3n, r3: r3, out: outB, meld: mp, hand: hand, pts: tot, melded: mel });
    }
    var before = st.scores.slice();
    res.forEach(function (r, i) { st.scores[i] += r.pts; });
    st.rounds.push(res.map(function (r) { return r.pts; }));
    st.hx.push({ sc: res.map(function (r) { return r.pts; }).join('.'), o: out, c: conc ? 1 : 0, h: how === 'out' ? 'o' : how === 'red3' ? 'r' : 's',
      cn: res.map(function (r) { return r.cn; }).join('.'), cm: res.map(function (r) { return r.cm; }).join('.'), r3: res.map(function (r) { return r.r3; }).join('.'),
      m: res.map(function (r) { return r.meld; }).join('.'), l: res.map(function (r) { return r.hand; }).join('.'), t: st.scores.join('.'),
      cr: st.melds.map(function (ms) { return ms.filter(isCanasta).map(function (m) { return (m.r === '10' ? 'T' : m.r) + (isNatural(m) ? 'n' : 'm'); }).join(','); }).join('|') });
    var name = out >= 0 ? st.players[out].name : '';
    if (out >= 0) { st.stats.outs[sideOf(st, out)]++; if (conc) { st.stats.conc[sideOf(st, out)]++; hl(st, name + ' went out concealed in hand ' + st.round); } }
    res.forEach(function (r, i) { if (r.r3n === 4) { st.stats.red4[i]++; hl(st, sideName(st, i) + ' held all four red 3s in hand ' + st.round); } });
    var lead = Math.max.apply(null, st.scores);
    st.scores.forEach(function (v, i) { st.stats.behind[i] = Math.max(st.stats.behind[i], lead - v); });
    st.last = { round: st.round, res: res, out: out, conc: conc, how: how, before: before, melds: clone(st.melds), red3: clone(st.red3), hands: clone(st.hands) };
    // the game ends when a side reaches the target; a tie at the top plays another hand
    var hi = Math.max.apply(null, st.scores), top2 = st.scores.filter(function (v) { return v === hi; }).length;
    if (hi >= st.target && top2 === 1) {
      st.phase = 'over'; st.turn = -1; st.winner = st.scores.indexOf(hi);
      if (st.stats.behind[st.winner] >= 1500) { st.last.comeback = st.stats.behind[st.winner]; hl(st, sideName(st, st.winner) + ' came back from ' + st.stats.behind[st.winner].toLocaleString('en-US') + ' behind to win'); }
      return;
    }
    deal(st);
  }

  // ═══ The computer players ════════════════════════════════════════════════════════════════════════
  // Easy melds what it sees and discards with little thought; Normal reaches its first meld as soon as it can, builds
  // canastas with its wild cards and watches what the next player could take; Hard also keeps natural pairs for a
  // frozen pile, freezes a big pile against a threat and remembers the last dozen discards; Expert plays as Hard does and
  // remembers every discard of the hand. None of them sees a hidden card.
  function lvOf(st, p) { return lv(st.players[p] && st.players[p].level || st.level); }
  // What each level does (tuned with scripts/canasta/run.js)
  //   skipMeld/skipSet/skipOut: how often it misses its first meld, a new set, going out; take0/takeW: the smallest pile
  //   it takes without a wild card / with one; takeP: how often it takes at all; keep: cards it holds back; eager/endEager:
  //   how many wild cards it spends to finish a canasta (late: an opponent is close to going out); pairWild: melds a
  //   pair with a wild card any time; dump: late, spare wild cards go on melds; holdSets: keeps a set of three back while
  //   the pile is this big; dangerW/noise/memory: how much it minds what the next player could take, how random its
  //   discard is, how many of the pile's cards it remembers; hiPen: weighs a high card's cost in the hand; freeze: a 2
  //   to freeze a big pile; ask: asks a person partner "may I go out?"; answerYes: answers by chance
  var LV = {
    easy: { skipMeld: 0.35, skipSet: 0.3, skipOut: 0.4, take0: 2, takeW: 2, takeP: 0.6, keep: 2, eager: 2, endEager: 2, pairWild: false, dump: false, holdSets: 0, dangerW: 0, noise: 60, memory: 1, hiPen: 8, pairKeep: 24, freeze: false, ask: false, answerYes: 0.85 },
    normal: { skipMeld: 0, skipSet: 0, skipOut: 0, take0: 2, takeW: 3, takeP: 0, keep: 2, eager: 1, endEager: 3, pairWild: false, dump: true, holdSets: 0, dangerW: 1, noise: 6, memory: 6, hiPen: 4, pairKeep: 24, freeze: false, ask: true, answerYes: 0 },
    hard: { skipMeld: 0, skipSet: 0, skipOut: 0, take0: 2, takeW: 2, takeP: 0, keep: 2, eager: 2, endEager: 3, pairWild: false, dump: true, holdSets: 0, dangerW: 2, noise: 0, memory: 12, hiPen: 4, pairKeep: 32, freeze: true, ask: true, answerYes: 0 },
    expert: { skipMeld: 0, skipSet: 0, skipOut: 0, take0: 2, takeW: 2, takeP: 0, keep: 2, eager: 2, endEager: 3, pairWild: false, dump: true, holdSets: 0, dangerW: 2, noise: 0, memory: 200, hiPen: 4, pairKeep: 32, freeze: true, ask: true, answerYes: 0 }
  };
  function P(st, p) { return LV[lvOf(st, p)]; }
  function byRank(h) { var by = {}; h.forEach(function (c) { if (!isWild(c) && c.r !== '3') (by[c.r] = by[c.r] || []).push(c); }); return by; }
  function ids(cards) { return cards.map(function (c) { return c.id; }); }

  // Can p go out this turn from here? The melds that do it and the card left to discard (or null)
  function planOut(st, p) {
    if (st.phase !== 'play' || st.turn !== p || st.asked === 'no') return null;
    var s = sideOf(st, p), h = st.hands[p], need = kindOf(st).need;
    var by = byRank(h), wl = h.filter(isWild).sort(function (a, b) { return val(a) - val(b); }), b3 = h.filter(isBlack3);
    if (b3.length === 2) return null;
    var singles = Object.keys(by).filter(function (r) { return by[r].length === 1 && !meldOfRank(st, s, r); });
    var forced = singles.length ? by[singles[0]][0] : b3.length === 1 ? b3[0] : null;
    if (singles.length + (b3.length === 1 ? 1 : 0) > 1) return null;
    var tries = forced ? [forced] : [null].concat(wl.length ? [wl[0]] : []).concat(wl.length > 1 && wl[wl.length - 1].r !== wl[0].r ? [wl[wl.length - 1]] : []);
    for (var t = 0; t < tries.length; t++) {
      var plan = tryOut(st, s, by, wl.filter(function (c) { return c !== tries[t]; }), b3.length >= 3 ? b3 : [], need);
      if (plan) { plan.discard = tries[t] ? tries[t].id : null; if (h.length - (plan.discard ? 1 : 0) === 0) return plan; return plan; }
    }
    return null;
  }
  function tryOut(st, s, by, wl, b3, need) {
    var rows = [];   // {r, ex: existing meld or null, nat: [cards], w: wilds placed}
    Object.keys(by).forEach(function (r) {
      var ex = meldOfRank(st, s, r);
      if (!ex && by[r].length < 2) return;
      rows.push({ r: r, ex: ex, nat: by[r], w: [], base: ex ? ex.cards.length : 0, bw: ex ? wilds(ex.cards) : 0 });
    });
    st.melds[s].forEach(function (m) { if (!by[m.r]) rows.push({ r: m.r, ex: m, nat: [], w: [], base: m.cards.length, bw: wilds(m.cards) }); });
    var pool = wl.slice();
    // new melds of two naturals need a wild card
    for (var i = 0; i < rows.length; i++) { var R = rows[i]; if (!R.ex && R.nat.length === 2) { if (!pool.length) return null; R.w.push(pool.shift()); } }
    function size(R) { return R.base + R.nat.length + R.w.length; }
    function cap(R) { return 3 - R.bw - R.w.length; }
    var have = rows.filter(function (R) { return size(R) >= 7; }).length;
    // complete canastas with the wild cards left, nearest first
    while (have < need && pool.length) {
      var best = null;
      rows.forEach(function (R) { if (size(R) < 7) { var d = 7 - size(R); if (d <= cap(R) && d <= pool.length && (!best || d < 7 - size(best))) best = R; } });
      if (!best) break;
      while (size(best) < 7) best.w.push(pool.shift());
      have++;
    }
    if (have < need) return null;
    // every wild card left has to go somewhere
    while (pool.length) {
      var R2 = null; rows.forEach(function (R) { if (cap(R) > 0 && (!R2 || size(R) > size(R2))) R2 = R; });
      if (!R2) return null;
      R2.w.push(pool.shift());
    }
    var groups = [], adds = [];
    rows.forEach(function (R) {
      var cs = R.nat.concat(R.w); if (!cs.length) return;
      if (R.ex) adds.push({ r: R.r, ids: ids(cs) }); else groups.push(ids(cs));
    });
    if (b3.length) groups.push(ids(b3));
    return { groups: groups, adds: adds };
  }

  // Melds reaching need from these cards (natural sets first, then pairs with a wild card, then wild cards on them),
  // keeping at least keep cards; null when they don't reach it
  function reach(cards, need, keep, without) {
    var by = byRank(cards), wl = cards.filter(isWild).sort(function (a, b) { return val(a) - val(b); });
    var groups = [], total = 0, used = 0;
    var rs = Object.keys(by).filter(function (r) { return !(without && without[r]); }).sort(function (a, b) { return ORD[b] - ORD[a]; });
    rs.forEach(function (r) { if (by[r].length >= 3) { groups.push({ r: r, cards: by[r].slice() }); total += sum(by[r]); used += by[r].length; } });
    if (total < need) rs.forEach(function (r) { if (total < need && by[r].length === 2 && wl.length) { var w = wl.shift(); groups.push({ r: r, cards: by[r].concat([w]) }); total += sum(by[r]) + val(w); used += 3; } });
    // jokers count most: add the highest wild cards first to get there with fewest cards
    wl.sort(function (a, b) { return val(b) - val(a); });
    while (total < need && wl.length && groups.length) {
      var g = null; groups.forEach(function (x) { if (wilds(x.cards) < 3 && wilds(x.cards) < x.cards.length - wilds(x.cards) + 1 && (!g || x.cards.length < g.cards.length)) g = x; });
      if (!g) break;
      var w2 = wl.shift(); g.cards.push(w2); total += val(w2); used++;
    }
    if (total < need || !groups.length || cards.length - used < keep) return null;
    return { groups: groups.map(function (x) { return ids(x.cards); }), total: total };
  }

  // Every way to take the pile now: {ids, groups, uses: wild cards used, n}
  function takeOptions(st, p) {
    var t = top(st), out = []; if (!t || st.phase !== 'draw' || st.turn !== p) return out;
    if (isWild(t) || isBlack3(t)) return out;
    var s = sideOf(st, p), h = st.hands[p], fr = frozenFor(st, s), m = meldOfRank(st, s, t.r), mel = melded(st, s);
    var same = h.filter(function (c) { return !isWild(c) && c.r === t.r; }), wl = h.filter(isWild).sort(function (a, b) { return val(a) - val(b); });
    var cand = [];
    if (m && !fr) cand.push([]);
    if (same.length >= 2) cand.push(ids(same));
    if (!fr && same.length === 1 && wl.length) cand.push([same[0].id, wl[0].id]);
    cand.forEach(function (ids0) {
      var a = { k: 'take', ids: ids0, groups: [] };
      if (!mel) {
        var need = needFor(st, s), have = sum([t].concat(h.filter(function (c) { return ids0.indexOf(c.id) >= 0; })));
        if (have < need) {
          var rest = h.filter(function (c) { return ids0.indexOf(c.id) < 0; }), wo = {}; wo[t.r] = 1;
          var r = reach(rest, need - have, 2, wo); if (!r) return;
          a.groups = r.groups;
        }
      }
      if (apply(clone(st), p, a)) out.push({ a: a, uses: ids0.filter(function (id) { return isWild(h[find(h, id)]); }).length + a.groups.reduce(function (n, g) { return n + g.filter(function (id) { return isWild(h[find(h, id)]); }).length; }, 0) });
    });
    return out;
  }

  // How much the next player could want this card (the higher, the worse to discard it)
  function danger(st, p, c, lvl) {
    if (isBlack3(c)) return -20;
    var q = (p + 1) % st.n, qs = sideOf(st, q);
    if (qs === sideOf(st, p)) return 0;
    var pileN = st.pile.length + 1, fr = frozenAll(st) || isWild(c) || !melded(st, qs);
    if (isWild(c)) return 0;
    var d = 0;
    if (meldOfRank(st, qs, c.r) && !fr) d += 60 + pileN * 4;
    // a natural pair (or a natural and a wild card) of this rank in their hand
    var seen = 0;
    st.hands[p].forEach(function (x) { if (x.r === c.r && x !== c) seen++; });
    for (var s = 0; s < nSides(st); s++) st.melds[s].forEach(function (m) { m.cards.forEach(function (x) { if (x.r === c.r) seen++; }); });
    st.pile.slice(-LV[lvl].memory).forEach(function (x) { if (x.r === c.r) seen++; });
    var unk = Math.max(0, 7 - seen), pq = unk >= 2 ? unk / 7 : 0;
    d += pq * pileN * (fr ? 2.2 : 3.4);
    // they threw this rank away themselves not long ago
    if (LV[lvl].memory > 1) for (var i = st.disc.length - 1, k = 0; i >= 0 && k < 8; i--, k++) if (st.disc[i].p === q && st.disc[i].r === c.r) { d *= 0.35; break; }
    return d;
  }
  function keepVal(st, p, c, lvl) {
    var h = st.hands[p], s = sideOf(st, p);
    if (c.r === 'JK') return 90;
    if (c.r === '2') return 70;
    if (isBlack3(c)) return -12;
    var n = h.filter(function (x) { return x.r === c.r; }).length;
    var v = meldOfRank(st, s, c.r) ? 30 : n >= 3 ? 40 : n === 2 ? LV[lvl].pairKeep : 6;
    // a high card caught in the hand costs more
    v -= val(c) / LV[lvl].hiPen;
    return v;
  }
  function botDiscard(st, p) {
    var lvl = lvOf(st, p), h = st.hands[p], s = sideOf(st, p), pick = null;
    var q = (p + 1) % st.n, qs = sideOf(st, q);
    if (h.length === 1) return h[0];
    h.forEach(function (c) {
      var sc = keepVal(st, p, c, lvl) + danger(st, p, c, lvl) * LV[lvl].dangerW + rnd() * LV[lvl].noise;
      if (!pick || sc < pick.sc) pick = { c: c, sc: sc };
    });
    var best = pick.c;
    // Hard freezes a big pile with a 2 when the next player is threatening and everything else is risky
    if (LV[lvl].freeze && qs !== s && !frozenAll(st) && st.pile.length >= 7 && melded(st, qs)) {
      var two = h.filter(function (c) { return c.r === '2'; })[0];
      if (two && h.length > 2 && danger(st, p, best, lvl) > 30) best = two;
    }
    return best;
  }
  // Ordinary melding (not going out): what goes down now
  // How far the next opponent is from going out: few cards left, or a short stock
  function threat(st, p) {
    var s = sideOf(st, p), m = 99;
    for (var q = 0; q < st.n; q++) if (sideOf(st, q) !== s) m = Math.min(m, st.hands[q].length);
    return m <= 3 || st.stock.length < 8;
  }
  // Ordinary melding (not going out): what goes down now
  function botMeld(st, p) {
    var L = P(st, p), s = sideOf(st, p), h = st.hands[p], late = threat(st, p), keep = late ? 2 : L.keep;
    if (!melded(st, s)) {
      if (L.skipMeld && rnd() < L.skipMeld) return null;
      var r = reach(h, needFor(st, s), 2); if (!r) return null;
      var a0 = { k: 'meld', groups: r.groups, adds: [] };
      return apply(clone(st), p, a0) ? a0 : null;
    }
    var by = byRank(h), wl = h.filter(isWild).sort(function (a, b) { return val(a) - val(b); }), left = h.length, adds = [], groups = [];
    function room(n) { return left - n >= keep; }
    // naturals onto the side's melds
    Object.keys(by).forEach(function (r) { var m = meldOfRank(st, s, r); if (m && room(by[r].length)) { adds.push({ r: r, ids: ids(by[r]) }); left -= by[r].length; } });
    // new natural melds of three or more
    Object.keys(by).sort(function (a, b) { return by[b].length - by[a].length; }).forEach(function (r) {
      if (meldOfRank(st, s, r) || by[r].length < 3 || !room(by[r].length)) return;
      if (L.skipSet && rnd() < L.skipSet) return;
      if (L.holdSets && !late && by[r].length === 3 && st.pile.length >= L.holdSets) return;   // (Hard: kept back to take a big frozen pile)
      groups.push(ids(by[r])); left -= by[r].length;
    });
    // a pair with a wild card: near the end of the hand, so it isn't caught in the hand
    if ((L.pairWild || late) && wl.length) Object.keys(by).forEach(function (r) {
      if (meldOfRank(st, s, r) || by[r].length !== 2 || !wl.length || !room(3)) return;
      groups.push(ids(by[r]).concat([wl.shift().id])); left -= 3;
    });
    // wild cards finish a canasta
    var sizes = {}; st.melds[s].forEach(function (m) { sizes[m.r] = { n: m.cards.length, w: wilds(m.cards) }; });
    adds.forEach(function (a) { sizes[a.r].n += a.ids.length; });
    groups.forEach(function (g) { var cs = g.map(function (id) { return h[find(h, id)]; }), r = newRank(cs, false); if (r) sizes[r] = { n: cs.length, w: wilds(cs) }; });
    var eager = late ? L.endEager : L.eager;
    Object.keys(sizes).sort(function (a, b) { return sizes[b].n - sizes[a].n; }).forEach(function (r) {
      var z = sizes[r]; if (z.n >= 7) return;
      var d = 7 - z.n;
      if (d > eager || d > wl.length || z.w + d > 3 || !room(d)) return;
      var ws = wl.splice(0, d), ex = adds.filter(function (a) { return a.r === r; })[0], gi = -1;
      groups.forEach(function (g, i) { var c0 = h[find(h, g[0])]; if (c0 && c0.r === r) gi = i; });
      if (gi >= 0) groups[gi] = groups[gi].concat(ids(ws)); else if (ex) ex.ids = ex.ids.concat(ids(ws)); else adds.push({ r: r, ids: ids(ws) });
      left -= d; z.n = 7;
    });
    // late in the hand, spare wild cards go on any meld rather than be caught
    if (late && L.dump) Object.keys(sizes).forEach(function (r) {
      var z = sizes[r]; while (wl.length && z.w < 3 && room(1)) {
        var w = wl.shift(), ex = adds.filter(function (a) { return a.r === r; })[0], gi = -1;
        groups.forEach(function (g, i) { var c0 = h[find(h, g[0])]; if (c0 && c0.r === r) gi = i; });
        if (gi >= 0) groups[gi].push(w.id); else if (ex) ex.ids.push(w.id); else adds.push({ r: r, ids: [w.id] });
        z.w++; left--;
      }
    });
    if (!adds.length && !groups.length) return null;
    var a = { k: 'meld', groups: groups, adds: adds };
    return apply(clone(st), p, a) ? a : null;
  }
  // The partner asked "may I go out?": no while this hand still holds a lot that could be melded first
  function botAnswer(st, p) {
    var h = st.hands[p], v = sum(h), L = P(st, p);
    if (L.answerYes) return rnd() < L.answerYes;
    var s = sideOf(st, p), opp = 1 - s, oppMin = Math.min.apply(null, seatsOf(st, opp).map(function (q) { return st.hands[q].length; }));
    if (v >= 90 && oppMin > 3 && melded(st, s)) return false;
    return true;
  }
  function bot(st, p) {
    if (!st || turn(st) !== p) return null;
    var L = P(st, p), s = sideOf(st, p);
    if (st.phase === 'ask') return { k: 'answer', yes: botAnswer(st, p) };
    if (st.phase === 'draw') {
      var opts = takeOptions(st, p);
      if (!st.stock.length) return opts.length ? opts[0].a : { k: 'end' };
      if (opts.length) {
        opts.sort(function (a, b) { return a.uses - b.uses; });
        var o = opts[0], n = st.pile.length;
        // (a pile is worth taking when it holds more than the stock would give: in the two-handed game that is two cards,
        // and a small pile is often just your own last discard coming back)
        var more = kindOf(st).draw - 1, mine = n >= 2 && st.disc.length && st.disc[st.disc.length - 2] && st.disc[st.disc.length - 2].p === p ? 1 : 0;
        var want = !melded(st, s) || (o.uses === 0 ? n - mine >= L.take0 + more : n - mine >= L.takeW + more);
        if (L.takeP && rnd() > L.takeP) want = false;
        if (want) return o.a;
      }
      return { k: 'draw' };
    }
    if (st.phase !== 'play') return null;
    var plan = planOut(st, p);
    if (plan && L.skipOut && rnd() < L.skipOut) plan = null;
    if (plan) {
      var mate = partner(st, p);
      if (mate >= 0 && L.ask && !st.asked && !st.tmeld && !st.players[mate].cpu && st.hands[mate].length >= 4 && st.hands[p].length >= 2) return { k: 'ask' };
      if (plan.groups.length || plan.adds.length) return { k: 'meld', groups: plan.groups, adds: plan.adds };
      return { k: 'discard', id: plan.discard || st.hands[p][0].id };
    }
    var m = botMeld(st, p);
    if (m) return m;
    return { k: 'discard', id: botDiscard(st, p).id };
  }

  var API = {
    NAT: NAT, ORD: ORD, SUITS: SUITS, RNAME: RNAME, PLURAL: PLURAL, KINDS: KINDS, TARGET: TARGET, BIG_PILE: BIG_PILE, C: C,
    deck: deck, isWild: isWild, isRed3: isRed3, isBlack3: isBlack3, val: val, sum: sum, wilds: wilds, sortHand: sortHand, rname: rname, find: find,
    sideOf: sideOf, nSides: nSides, seatsOf: seatsOf, partner: partner, sideName: sideName, minMeld: minMeld, needFor: needFor, melded: melded,
    meldOfRank: meldOfRank, isCanasta: isCanasta, isNatural: isNatural, canastas: canastas, frozenAll: frozenAll, frozenFor: frozenFor, top: top,
    canOut: canOut, newRank: newRank, LV: LV, addOk: addOk, mustTake: mustTake,
    newGame: newGame, deal: deal, turn: turn, apply: apply, why: why, bot: bot, planOut: planOut, takeOptions: takeOptions, reach: reach, lv: lv
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.CanastaCore = API;
})(typeof window !== 'undefined' ? window : this);
