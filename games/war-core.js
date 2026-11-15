// ═══════════════════════════════════════════════════════════════════════════
// War: the rules, in plain JSON state. The same code runs in the page (games/war.html), at the online table
// (TurnNet: each move is made inside the table's transaction) and in Node (scripts/war-sim.js plays thousands of
// games with it).
//
// The rules (Pagat's War, and the common American way of playing it):
//   The deck is dealt out face down, one card at a time: 26 each with two players, 13 each with four. With three, the
//   two of clubs is taken out and everyone has 17. Nobody looks at their cards.
//   Every round, each player turns up the top card of their pile. The highest card takes all the cards turned up, and
//   they go face down under the bottom of the winner's pile. Aces are high (or low, or high with a 2 that beats an ace).
//   When the highest cards tie, it is war: the players who tied each lay cards face down (3, or 1 if chosen) and one
//   face up, and the highest of those face-up cards takes everything on the table. Another tie is a double war, and so on.
//   A player with too few cards for a war lays all but their last card face down and turns their last card up. A
//   player who has no card at all to go to war with is out, and their cards on the table go to the winner.
//   A player with no cards left is out. The last player with cards wins. In a short game, whoever holds the most
//   cards when the rounds are up wins (a tie is a tie). No game goes on forever: at CAP rounds it ends the same way.
//
// State (all plain JSON):
//   v, n, players [{name, cpu}], o {down, aces, shuffle, rounds}
//   piles [[card codes]]  index 0 is the top of the pile; a code is rank + suit: 'As', 'Th', '2c'
//   out [bool]            players who have run out
//   phase  'flip' | 'war' | 'over'
//   inb    [seats]        the players in the battle now (everyone left at a flip, the players who tied at a war)
//   laid   {seat: 1}      who has laid their cards for this step
//   tbl    [[{c, up}]]    each seat's cards on the table in this battle, in the order laid
//   wars   number of wars in this battle so far
//   round  the battle being played (1 to ...); rounds counts battles, a war is part of the battle that tied
//   lo [n]   each player's fewest cards while still in the game (a comeback is a win from under 5)
//   st {w: battles won, wars: wars won, big: most cards taken in one battle, run: battles won in a row now, best: longest run}
//   rs     the random seed (shuffles come from it, so a game can be played again exactly)
//   winner seat, or -1 for a tie; why 'all' | 'rounds' | 'cap' | 'tie'; hl [highlight sentences]
// ═══════════════════════════════════════════════════════════════════════════
(function (root) {
  'use strict';
  var RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
  var SUITS = ['s', 'h', 'd', 'c'];
  var CAP = 3000;
  var RNAME = { '2': 'two', '3': 'three', '4': 'four', '5': 'five', '6': 'six', '7': 'seven', '8': 'eight', '9': 'nine', T: 'ten', J: 'jack', Q: 'queen', K: 'king', A: 'ace' };
  var RPLURAL = { '6': 'sixes' };
  var SNAME = { s: 'spades', h: 'hearts', d: 'diamonds', c: 'clubs' };

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  // mulberry32 on a seed kept in the state
  function rnd(st) {
    var t = (st.rs = (st.rs + 0x6D2B79F5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function shuffle(st, a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rnd(st) * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function rankOf(c) { return c.charAt(0); }
  function value(c, aces) { var i = RANKS.indexOf(rankOf(c)); return aces === 'low' && rankOf(c) === 'A' ? -1 : i; }
  function cardName(c) { return RNAME[rankOf(c)] + ' of ' + SNAME[c.charAt(1)]; }
  function rankWord(c, plural) { var r = rankOf(c), w = RNAME[r]; return plural ? (RPLURAL[r] || w + 's') : w; }
  function opts(o) {
    o = o || {};
    return { down: +o.down === 1 ? 1 : 3, aces: o.aces === 'low' || o.aces === 'two' ? o.aces : 'high', shuffle: o.shuffle === 0 || o.shuffle === '0' || o.shuffle === false ? 0 : 1, rounds: Math.max(0, +o.rounds || 0) };
  }

  // a new game: players [{name, cpu}], o the options, seed (optional)
  function newGame(players, o, seed) {
    var n = Math.max(2, Math.min(4, players.length));
    var st = { v: 1, n: n, players: players.slice(0, n).map(function (p) { return { name: p.name, cpu: !!p.cpu }; }), o: opts(o),
      rs: (seed == null ? Math.floor(Math.random() * 4294967296) : seed) >>> 0 };
    var deck = [];
    SUITS.forEach(function (s) { RANKS.forEach(function (r) { if (!(n === 3 && r === '2' && s === 'c')) deck.push(r + s); }); });
    shuffle(st, deck);
    st.piles = []; st.tbl = []; st.out = []; st.lo = []; st.st = [];
    for (var p = 0; p < n; p++) { st.piles.push([]); st.tbl.push([]); st.out.push(false); st.st.push({ w: 0, wars: 0, big: 0, run: 0, best: 0 }); }
    deck.forEach(function (c, i) { st.piles[i % n].push(c); });
    st.piles.forEach(function (pl, i) { st.lo[i] = pl.length; });
    st.phase = 'flip'; st.round = 1; st.wars = 0; st.laid = {}; st.inb = live(st); st.winner = null; st.why = null; st.hl = []; st.most = 0;
    st.outAt = st.out.map(function () { return 0; }); st.wl = []; st.tie0 = null; st.a2 = 0;
    st.tr = st.piles.map(function (pl) { return pl.length; }).join(',');
    st.started = Date.now();
    return st;
  }
  function live(st) { var a = []; for (var p = 0; p < st.n; p++) if (!st.out[p]) a.push(p); return a; }
  function count(st, p) { return st.piles[p].length; }
  function total(st) { var t = 0; st.piles.forEach(function (pl) { t += pl.length; }); st.tbl.forEach(function (x) { t += x.length; }); return t; }
  // the players who still have to lay their cards for this step
  function waiting(st) { if (st.phase === 'over') return []; return st.inb.filter(function (p) { return !st.laid[p]; }); }
  // whose move it is: the people who still have to lay; when only computer players are left in the battle, theirs
  function turn(st) {
    var w = waiting(st), ppl = w.filter(function (p) { return !st.players[p].cpu; });
    return ppl.length ? ppl : w;
  }

  // the cards one player lays for this step
  function layFor(st, p) {
    var pile = st.piles[p], out = [];
    if (st.phase === 'war') { var k = Math.min(st.o.down, pile.length - 1); for (var i = 0; i < k; i++) out.push({ c: pile.shift(), up: 0 }); }
    if (pile.length) out.push({ c: pile.shift(), up: 1 });
    out.forEach(function (x) { st.tbl[p].push(x); });
    st.laid[p] = 1;
    return { p: p, cards: out };
  }
  // A player lays their cards (one face up at a flip; the face-down cards and one face up at a war). When the only
  // ones left to lay are computer players, they lay too, and the step is settled. Returns the move, or null.
  function lay(st, p) {
    if (st.phase === 'over' || st.inb.indexOf(p) < 0 || st.laid[p]) return null;
    var mv = { k: 'lay', round: st.round, war: st.phase === 'war' ? st.wars : 0, lays: [layFor(st, p)] };
    var left = waiting(st);
    if (left.length && left.every(function (q) { return st.players[q].cpu; })) left.forEach(function (q) { mv.lays.push(layFor(st, q)); });
    if (!waiting(st).length) mv.res = settle(st);
    return mv;
  }
  // which of the face-up cards just laid is highest: [seats] (more than one is a tie). A 2 beats an ace (that variant)
  // when an ace would otherwise be the best card.
  function best(st, seats) {
    var ups = seats.map(function (p) { var t = st.tbl[p]; return { p: p, c: t[t.length - 1].c }; });
    var top = -9, a = [];
    ups.forEach(function (u) { var v = value(u.c, st.o.aces); if (v > top) { top = v; a = [u.p]; } else if (v === top) a.push(u.p); });
    var ace2 = null;
    if (st.o.aces === 'two' && top === 12) {
      var twos = ups.filter(function (u) { return rankOf(u.c) === '2'; }).map(function (u) { return u.p; });
      if (twos.length) { ace2 = { by: twos.slice(), aces: a.slice() }; a = twos; }
    }
    return { seats: a, ace2: ace2 };
  }
  function settle(st) {
    var b = best(st, st.inb), res = { ace2: b.ace2 };
    if (b.seats.length > 1) {
      // a tie: war, among the players who can still go to war
      res.tie = b.seats.slice();
      var can = b.seats.filter(function (p) { return st.piles[p].length > 0; });
      res.short = b.seats.filter(function (p) { return !st.piles[p].length; });
      if (!st.wars) st.tie0 = b.seats.map(function (p) { var t = st.tbl[p]; return t[t.length - 1].c; }).join('.');
      if (can.length >= 2) {
        st.phase = 'war'; st.wars++; st.inb = can; st.laid = {};
        res.k = 'war'; res.wars = st.wars;
        return res;
      }
      if (can.length === 1) return take(st, can[0], res);
      // everyone who tied had laid their last card: the cards go back to the players who laid them, shuffled, and the
      // battle is played again (it can only happen with every card on the table)
      res.k = 'back';
      st.tbl.forEach(function (t, p) { var mine = t.map(function (x) { return x.c; }); shuffle(st, mine); mine.forEach(function (c) { st.piles[p].push(c); }); st.tbl[p] = []; });
      st.phase = 'flip'; st.wars = 0; st.laid = {}; st.inb = live(st);
      return res;
    }
    return take(st, b.seats[0], res);
  }
  // the winner of the battle takes every card on the table under their pile
  // (Not shuffled, they go under as they were laid, each player's cards together, starting with a different player
  // each round: a fixed order that started with the winner every time could send a game round and round for ever,
  // which scripts/war-sim.js found in about one game in eight with three players.)
  function take(st, w, res) {
    var got = [], fin = st.inb.map(function (p) { var t = st.tbl[p]; return t.length ? t[t.length - 1].c : ''; }).filter(Boolean).join('.');
    for (var q = 0; q < st.n; q++) { var p0 = (st.round + q) % st.n; st.tbl[p0].forEach(function (x) { got.push(x.c); }); st.tbl[p0] = []; }
    if (st.o.shuffle) shuffle(st, got);
    got.forEach(function (c) { st.piles[w].push(c); });
    res.k = 'take'; res.w = w; res.cards = got; res.wars = st.wars;
    var S = st.st[w]; S.w++; if (st.wars) S.wars++; if (got.length > S.big) S.big = got.length;
    st.st.forEach(function (x, p) { if (p === w) { x.run++; if (x.run > x.best) x.best = x.run; } else x.run = 0; });
    if (got.length > st.most) st.most = got.length;
    if (res.ace2) st.a2++;
    // the war log for the history: the round, how deep, who won, how many cards, the cards that tied and the cards that settled it
    if (st.wars || res.tie) { st.wl.push({ r: st.round, d: Math.max(1, st.wars), w: w, n: got.length, t: st.tie0 || '', f: fin }); if (st.wl.length > 120) st.wl.shift(); }
    st.tie0 = null;
    note(st, res);
    // anyone with no cards left is out
    res.outs = [];
    for (var p = 0; p < st.n; p++) if (!st.out[p] && !st.piles[p].length) { st.out[p] = true; st.outAt[p] = st.round; res.outs.push(p); }
    st.tr += '.' + st.piles.map(function (pl) { return pl.length; }).join(',');
    live(st).forEach(function (p) { if (st.piles[p].length < st.lo[p]) st.lo[p] = st.piles[p].length; });
    st.phase = 'flip'; st.wars = 0; st.laid = {}; st.inb = live(st);
    st.round++;
    var L = live(st);
    if (L.length === 1) end(st, L[0], 'all');
    else if (st.o.rounds && st.round > st.o.rounds) endByCount(st, 'rounds');
    else if (st.round > CAP) endByCount(st, 'cap');
    if (st.phase === 'over') res.over = { winner: st.winner, why: st.why };
    return res;
  }
  function endByCount(st, why) {
    var top = -1, a = [];
    live(st).forEach(function (p) { var k = st.piles[p].length; if (k > top) { top = k; a = [p]; } else if (k === top) a.push(p); });
    end(st, a.length === 1 ? a[0] : -1, a.length === 1 ? why : 'tie');
  }
  function end(st, w, why) {
    st.phase = 'over'; st.winner = w; st.why = why; st.inb = []; st.laid = {};
    if (st.series && w >= 0) st.series[w]++;   // (online: the games won at this table)
    if (w >= 0 && st.lo[w] < 5 && why === 'all') hl(st, nm(st, w) + ' came back from ' + (st.lo[w] === 1 ? 'a single card' : st.lo[w] + ' cards') + ' to win.');
    if (st.round - 1 >= 500) hl(st, 'The game lasted ' + fmt(st.round - 1) + ' rounds.');
  }
  function nm(st, p) { return st.players[p].name; }
  function fmt(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function hl(st, t) { if (st.hl.indexOf(t) < 0) st.hl.push(t); if (st.hl.length > 14) st.hl.splice(2, 1); }
  // the rare moments, kept for the history
  function note(st, res) {
    var w = res.w, who = nm(st, w);
    if (res.wars >= 3) hl(st, who + ' won a ' + (res.wars === 3 ? 'triple' : res.wars === 4 ? 'quadruple' : res.wars + '-deep') + ' war and took ' + res.cards.length + ' cards in round ' + st.round + '.');
    else if (res.wars === 2) hl(st, who + ' won a double war and took ' + res.cards.length + ' cards in round ' + st.round + '.');
    if (res.ace2) res.ace2.aces.forEach(function (a) { hl(st, who + '’s two took ' + (a === w ? 'their own' : nm(st, a) + '’s') + ' ace in round ' + st.round + '.'); });
  }

  // a computer player's move: there is nothing to choose in War, so it lays its cards
  function bot(st, p) { return lay(st, p); }
  // play on to the end at once (the people are out and only the computer is left)
  function playOut(st) {
    var guard = 0;
    while (st.phase !== 'over' && guard++ < 200000) { var w = waiting(st); if (!w.length) break; lay(st, w[0]); }
    return st;
  }
  // the names of the cards for a sentence
  root.WarCore = { RANKS: RANKS, SUITS: SUITS, CAP: CAP, clone: clone, newGame: newGame, opts: opts, lay: lay, bot: bot, turn: turn, waiting: waiting,
    live: live, count: count, total: total, value: value, cardName: cardName, rankWord: rankWord, rankOf: rankOf, playOut: playOut, fmt: fmt };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.WarCore;
})(typeof window !== 'undefined' ? window : globalThis);
