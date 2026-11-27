// ═══════════════════════════════════════════════════════════════════════════
// Crazy Eights: the rules and the computer players (window.C8Core, and module.exports in Node).
// Plain JSON state, so the same code runs in the page, at the online table (turnnet.js) and in Node
// (scripts/crazy8s-sim.js plays thousands of robot games with it).
//
// The rules (Pagat and Hoyle): one 52-card deck, 2 to 7 players, 7 cards each for two players and 5 each for more.
// The top card of the stock starts the discard pile (an 8 goes back into the stock and the next card is turned).
// On your turn you play a card of the same suit or rank as the top card, or an 8, which is wild: you name the suit
// that has to be played next. The first player to get rid of every card wins the hand and scores the cards left in
// the other hands: an 8 is 50, a king, queen, jack or ten 10, an ace 1, any other card its number.
//   opts.draw  'until'  a player who can't play draws until they can (they may draw when they could play, too)
//              'one'    a player who can't play draws one card, plays it if they can, and otherwise passes
//   opts.twos  2s make the next player draw two, unless they play a 2 of their own: then the next draws four, and so on
//   opts.qs    the queen of spades makes the next player miss their turn
// When the stock runs out, the discard pile but its top card is shuffled into a new stock. With nothing left to draw
// a player who can't play passes, and if nobody can play the hand is blocked: the player with the fewest points in
// hand wins it and scores the difference to each other hand. (A hand that goes round and round, the four 8s passing
// through the stock and back with nobody getting closer, which robots alone can do, ends the same way after HAND_CAP
// moves; no hand among people comes near it.)
// target: the score that wins the game (0: one hand, and the winner of that hand wins).
//
// State: {v, n, players [{name, cpu, level}], opts, target, level, scores [], rounds [[gain per seat]], hx [], round,
//   dealer, phase 'play' | 'over', hands [[card]], deck [card] (the stock, top last), disc [card] (top last), suit
//   (the suit to follow), turn, pend (cards the player whose turn it is has to take from 2s), run (2s in that stack),
//   drew (cards drawn this turn), dId (the card drawn this turn in draw-one), stuck (turns passed in a row with nothing
//   to draw), plays [] and draws [] (this hand, by seat), vd [''] (suits each seat was seen to be out of: public),
//   played {s,h,d,c} (cards of each suit gone to the discard pile this hand: public), last (the hand just finished),
//   winner, highlights [], stats}
// A card is two letters: rank (A 2-9 T J Q K) and suit (s h d c).
//
// apply(S, p, a) -> mv | null   a: {k: 'play', c, s (the suit named for an 8)} | {k: 'draw'} | {k: 'pass'} | {k: 'take'}
// mv says what happened, for the page to show it: {k, p, c, s, pend, run, skip, drew: [cards], pass, reshuf, end}
// ═══════════════════════════════════════════════════════════════════════════
(function (root) {
  'use strict';
  var RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K'], SUITS = ['s', 'h', 'd', 'c'];
  var SNAME = { s: 'spades', h: 'hearts', d: 'diamonds', c: 'clubs' }, GLYPH = { s: '♠', h: '♥', d: '♦', c: '♣' };
  var RNAME = { A: 'ace', T: '10', J: 'jack', Q: 'queen', K: 'king' };
  var C = { rng: Math.random };
  function rk(c) { return c.charAt(0); }
  function su(c) { return c.charAt(1); }
  function pts(c) { var r = rk(c); return r === '8' ? 50 : r === 'A' ? 1 : /[TJQK]/.test(r) ? 10 : +r; }
  function count(h) { var t = 0; for (var i = 0; i < h.length; i++) t += pts(h[i]); return t; }
  function zeros(n, v) { var a = []; for (var i = 0; i < n; i++) a.push(v === undefined ? 0 : v); return a; }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(C.rng() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function deck() { var d = []; SUITS.forEach(function (s) { RANKS.forEach(function (r) { d.push(r + s); }); }); return d; }
  function name(c) { return (RNAME[rk(c)] || rk(c)) + ' of ' + SNAME[su(c)]; }
  function label(c) { return (rk(c) === 'T' ? '10' : rk(c)) + GLYPH[su(c)]; }
  function lv(v) { return v === 'easy' || v === 'hard' || v === 'expert' ? v : 'normal'; }
  function nextOf(S, p) { return (p + 1) % S.n; }
  function top(S) { return S.disc[S.disc.length - 1]; }
  function handSize(n) { return n === 2 ? 7 : 5; }

  // ── A new game, a new hand ──
  function newGame(cfg) {
    var n = cfg.players.length;
    var S = {
      v: 1, n: n, players: cfg.players.map(function (p) { return { name: p.name, cpu: !!p.cpu, level: p.cpu ? lv(p.level || cfg.level) : undefined }; }),
      opts: { draw: cfg.draw === 'one' ? 'one' : 'until', twos: cfg.twos ? 1 : 0, qs: cfg.qs ? 1 : 0 },
      target: cfg.target == null ? 100 : +cfg.target, level: lv(cfg.level),
      scores: zeros(n), rounds: [], hx: [], round: 0, dealer: (n - 2 + n) % n, phase: 'play', last: null, winner: -1,
      highlights: [], stats: { wins: zeros(n), eights: zeros(n), clean: zeros(n), bestHand: null, bigStack: null }, started: Date.now()
    };
    deal(S);
    return S;
  }
  function deal(S) {
    var n = S.n;
    S.round++; S.dealer = (S.dealer + 1) % n;
    var d = shuffle(deck()), k = handSize(n);
    S.hands = []; for (var p = 0; p < n; p++) S.hands.push([]);
    for (var i = 0; i < k; i++) for (p = 0; p < n; p++) S.hands[(S.dealer + 1 + p) % n].push(d.pop());
    // the starter: an 8 goes back into the middle of the stock and the next card is turned up
    var st = d.pop();
    while (rk(st) === '8') { d.splice(Math.floor(C.rng() * d.length), 0, st); st = d.pop(); }
    S.deck = d; S.disc = [st]; S.suit = su(st);
    S.turn = (S.dealer + 1) % n; S.pend = 0; S.run = 0; S.drew = 0; S.dId = null; S.stuck = 0;
    S.plays = zeros(n); S.draws = zeros(n); S.vd = zeros(n, ''); S.played = { s: 0, h: 0, d: 0, c: 0 }; S.played[su(st)]++;
    S.maxRun = 0; S.mvs = 0; S.e8 = '';
    S.phase = 'play';
  }

  // ── What a player can do ──
  function playable(S, c) {
    if (S.pend > 0) return rk(c) === '2';
    return rk(c) === '8' || su(c) === S.suit || rk(c) === rk(top(S));
  }
  function legal(S, p) {
    if (S.phase !== 'play') return [];
    var h = S.hands[p];
    if (S.opts.draw === 'one' && S.drew) return S.dId && h.indexOf(S.dId) >= 0 && playable(S, S.dId) ? [S.dId] : [];
    return h.filter(function (c) { return playable(S, c); });
  }
  function stockLeft(S) { return S.deck.length + Math.max(0, S.disc.length - 1); }
  function canDraw(S, p) {
    if (S.phase !== 'play' || S.turn !== p || S.pend > 0 || !stockLeft(S)) return false;
    if (S.opts.draw === 'one') return !S.drew && !legal(S, p).length;
    return true;
  }
  function canPass(S, p) {
    if (S.phase !== 'play' || S.turn !== p || S.pend > 0) return false;
    if (S.opts.draw === 'one' && S.drew) return true;
    return !legal(S, p).length && !stockLeft(S);
  }
  // one card off the stock (the discard pile but its top card shuffled in first when the stock is gone)
  function pull(S, mv) {
    if (!S.deck.length) {
      if (S.disc.length < 2) return null;
      var t = S.disc.pop(); S.deck = shuffle(S.disc); S.disc = [t];
      if (mv) mv.reshuf = 1;
    }
    return S.deck.pop();
  }

  // ── Moves ──
  var HAND_CAP = 700;
  function apply(S, p, a) {
    var mv = move(S, p, a);
    if (mv && !mv.end && !S.sim && S.phase === 'play' && (S.mvs = (S.mvs || 0) + 1) > HAND_CAP) mv.end = endHand(S, -1, 'block');
    return mv;
  }
  function move(S, p, a) {
    if (!a || S.phase !== 'play' || S.turn !== p) return null;
    var h = S.hands[p], mv = { k: a.k, p: p }, c;
    if (a.k === 'play') {
      c = a.c;
      if (h.indexOf(c) < 0 || legal(S, p).indexOf(c) < 0) return null;
      var last = h.length === 1;
      if (rk(c) === '8' && !last && SUITS.indexOf(a.s) < 0) return null;
      h.splice(h.indexOf(c), 1); S.disc.push(c); S.played[su(c)]++; S.plays[p]++;
      S.suit = rk(c) === '8' && !last ? a.s : su(c);
      mv.c = c; mv.s = S.suit; S.stuck = 0;
      if (rk(c) === '8' && !S.sim) S.e8 = (S.e8 || '') + p + c + S.suit;
      // (they had that suit after all: it's no longer one they're out of)
      S.vd[p] = S.vd[p].replace(su(c), '').replace(rk(c) === '8' ? '8' : '-', '');
      if (!h.length) { S.drew = 0; S.dId = null; if (S.sim) { S.done = 1; S.w = p; return mv; } mv.end = endHand(S, p, 'out', c); return mv; }
      var nx = nextOf(S, p);
      if (S.opts.twos && rk(c) === '2') {
        S.pend += 2; S.run++; mv.pend = S.pend; mv.run = S.run;
        if (S.run > S.maxRun) S.maxRun = S.run;
      }
      if (S.opts.qs && c === 'Qs') { mv.skip = nx; nx = nextOf(S, nx); }
      S.turn = nx; S.drew = 0; S.dId = null;
      if (h.length === 1) mv.one = 1;
      return mv;
    }
    if (a.k === 'draw') {
      if (!canDraw(S, p)) return null;
      var first = !S.drew;
      c = pull(S, mv); if (!c) return null;
      h.push(c); S.drew++; S.draws[p]++; S.stuck = 0; mv.drew = [c];
      // drawing shows the table this player had nothing in the suit to follow (what they draw and keep isn't of it)
      if (first) S.vd[p] = S.suit + '8';   // (and no 8, which can always be played: what they draw and keep is never one)
      if (S.opts.draw === 'one') {
        S.dId = c;
        if (!playable(S, c)) { mv.pass = 1; S.turn = nextOf(S, p); S.drew = 0; S.dId = null; }
      }
      return mv;
    }
    if (a.k === 'pass') {
      if (!canPass(S, p)) return null;
      if (!(S.opts.draw === 'one' && S.drew)) S.stuck++;
      S.turn = nextOf(S, p); S.drew = 0; S.dId = null;
      if (S.stuck >= S.n) {
        if (S.sim) { var cn = S.hands.map(count), lo = Math.min.apply(null, cn); S.done = 1; S.w = cn.filter(function (v) { return v === lo; }).length === 1 ? cn.indexOf(lo) : -1; }
        else mv.end = endHand(S, -1, 'block');
      }
      return mv;
    }
    if (a.k === 'take') {
      if (S.pend <= 0) return null;
      var got = [];
      for (var i = 0; i < S.pend; i++) { c = pull(S, mv); if (!c) break; got.push(c); h.push(c); }
      S.draws[p] += got.length; S.vd[p] = '';
      mv.drew = got; mv.n = S.pend; mv.run = S.run;
      if (S.run >= 3 && !S.sim) {
        S.highlights.push(spell(S.run) + ' 2s stacked up in hand ' + S.round + ', and ' + S.players[p].name + ' drew ' + got.length + ' cards.');
        if (!S.stats.bigStack || S.run > S.stats.bigStack.run) S.stats.bigStack = { run: S.run, p: p, r: S.round };
      }
      S.pend = 0; S.run = 0; S.stuck = 0;
      S.turn = nextOf(S, p); S.drew = 0; S.dId = null;
      return mv;
    }
    return null;
  }
  function spell(n) { return ['No', 'One', 'Two', 'Three', 'All four'][n] || String(n); }

  // ── The end of a hand ──
  // how: 'out' (w played their last card) or 'block' (nothing to draw and nobody could play)
  function endHand(S, w, how, lastCard) {
    var n = S.n, cnt = S.hands.map(count), gain = zeros(n);
    if (how === 'block') {
      var lo = Math.min.apply(null, cnt), at = []; cnt.forEach(function (v, q) { if (v === lo) at.push(q); });
      w = at.length === 1 ? at[0] : -1;
      if (w >= 0) cnt.forEach(function (v, q) { if (q !== w) gain[w] += v - lo; });
    } else cnt.forEach(function (v, q) { if (q !== w) gain[w] += v; });
    var L = { round: S.round, w: w, how: how, gain: gain, cnt: cnt, hands: S.hands.map(function (x) { return x.slice(); }), last: lastCard || null,
      eight: !!(lastCard && rk(lastCard) === '8'), clean: how === 'out' && S.draws[w] === 0, run: S.maxRun, plays: S.plays.slice() };
    for (var q = 0; q < n; q++) S.scores[q] += gain[q];
    S.rounds.push(gain.slice());
    // for the history: who went out and on what card, what each hand still held (cards and points), the 8s played and
    // the suit each one named (seat, card, suit), the longest stack of 2s
    S.hx.push({ w: w, g: w >= 0 ? gain[w] : 0, c: cnt.join('.'), b: how === 'block' ? 1 : 0, l: lastCard || '', h: S.hands.map(function (x) { return x.join(''); }).join('.'), e: S.e8 || '', r: S.maxRun || 0, k: L.clean ? 1 : 0 });
    var nm = w >= 0 ? S.players[w].name : '';
    if (w >= 0) {
      S.stats.wins[w]++;
      if (L.eight) { S.stats.eights[w]++; S.highlights.push(nm + ' went out with an 8 in hand ' + S.round + '.'); }
      if (L.clean) S.stats.clean[w]++;   // (a quarter to half of all hands: a note on the table, not a highlight)
      if (gain[w] >= 100) S.highlights.push(nm + ' caught ' + gain[w] + ' points in hand ' + S.round + '.');
      if (!S.stats.bestHand || gain[w] > S.stats.bestHand.g) S.stats.bestHand = { p: w, g: gain[w], r: S.round };
    } else if (how === 'block') S.highlights.push('Hand ' + S.round + ' was blocked, and nobody scored.');
    S.last = L;
    var over = S.target <= 0 || S.scores.some(function (v) { return v >= S.target; });
    if (over) {
      var hi = Math.max.apply(null, S.scores), tied = []; S.scores.forEach(function (v, q) { if (v === hi) tied.push(q); });
      S.winner = tied.indexOf(w) >= 0 ? w : tied[0];
      S.phase = 'over'; S.turn = -1; L.over = 1;
      var sweep = S.rounds.length >= 3 && S.hx.every(function (x) { return x.w === S.winner; });
      if (sweep) { L.sweep = 1; S.stats.sweep = S.winner; S.highlights.push(S.players[S.winner].name + ' won every one of the ' + S.rounds.length + ' hands.'); }
    } else deal(S);
    return 1;
  }
  function turn(S) { return S && S.phase === 'play' ? S.turn : -1; }

  // ── The computer players ──
  // Easy plays the first card it can, in the order it holds them, and names any suit for an 8.
  // Normal keeps its 8s for when nothing else will do, changes to the suit it holds most, sheds its high cards first
  // and names the suit it holds most for an 8.
  // Hard counts cards: see hardPlay.
  function bot(S, p) {
    if (turn(S) !== p) return null;
    var L = lv(S.players[p].level || S.level), h = S.hands[p], opts = legal(S, p);
    if (S.pend > 0) return opts.length ? { k: 'play', c: L === 'easy' ? opts[0] : pick2(S, p, opts) } : { k: 'take' };
    if (!opts.length) return canDraw(S, p) ? { k: 'draw' } : { k: 'pass' };
    if (L === 'easy') return easyPlay(S, p, opts);
    if (L === 'normal') return normalPlay(S, p, opts);
    if (L === 'expert' && !S.sim) return expertPlay(S, p, opts);
    return hardPlay(S, p, opts);
  }
  // Easy plays any card it can, an 8 as soon as it has one, and names any suit for it.
  function easyPlay(S, p, opts) {
    var e = opts.filter(function (c) { return rk(c) === '8'; });
    var c0 = e.length && C.rng() < 0.7 ? e[0] : opts[Math.floor(C.rng() * opts.length)];
    return { k: 'play', c: c0, s: rk(c0) === '8' ? SUITS[Math.floor(C.rng() * 4)] : undefined };
  }
  function pick2(S, p, opts) { return opts.slice().sort(function (a, b) { return pts(b) - pts(a); })[0]; }
  function bySuit(h, skip) { var n = { s: 0, h: 0, d: 0, c: 0 }; h.forEach(function (c) { if (c !== skip && rk(c) !== '8') n[su(c)]++; }); return n; }
  function mostSuit(h, skip) { var n = bySuit(h, skip), best = 's'; SUITS.forEach(function (s) { if (n[s] > n[best]) best = s; }); return best; }
  function normalPlay(S, p, opts) {
    var h = S.hands[p], plain = opts.filter(function (c) { return rk(c) !== '8'; });
    if (!plain.length) { var e = opts[0]; return { k: 'play', c: e, s: mostSuit(h, e) }; }
    var n = bySuit(h);
    plain.sort(function (a, b) { return (n[su(b)] - n[su(a)]) || (pts(b) - pts(a)); });
    return { k: 'play', c: plain[0] };
  }
  // Hard counts cards. What it sees is what anyone at the table could: the cards gone to the discard pile, its own hand,
  // how many cards each player holds, and who had to draw (they held nothing of the suit to follow and no 8, and what
  // they drew and kept is never an 8). From that it works out how likely the next player is to be able to follow each
  // card it could play, and plays the card that keeps its own hand flowing and most often makes the next player draw;
  // it keeps its 8s and 2s for when they matter, and names the suit for an 8 the same way.
  C.hw = { mine: 2, rank: 0, dump: 0.01, stop: 3, eight: 20, two: 2.5 };   // (measured in scripts/crazy8s-sim.js)
  function seen(S, p) { var u = {}; S.disc.forEach(function (c) { u[c] = 1; }); S.hands[p].forEach(function (c) { u[c] = 1; }); return u; }
  // how likely seat q can play on a top card of rank r with suit s to follow (r null: an 8 was played, only the suit counts)
  function canFollow(S, p, q, s, r, gone) {
    var k = S.hands[q].length, vd = S.vd[q], U = 0, ok = 0;
    RANKS.forEach(function (rr) { SUITS.forEach(function (ss) {
      var c = rr + ss; if (gone[c]) return;
      U++;
      if (rr === '8' ? vd.indexOf('8') < 0 : vd.indexOf(ss) < 0 && (ss === s || (r && rr === r))) ok++;
    }); });
    if (!U || !k) return 0;
    var none = 1; for (var i = 0; i < k; i++) none *= Math.max(0, (U - ok - i) / (U - i));
    return 1 - none;
  }
  function hardPlay(S, p, opts) {
    var h = S.hands[p], W = C.hw, best = null;
    if (h.length === 1) return { k: 'play', c: opts[0] };
    var gone = seen(S, p), close = 99;
    for (var q = 0; q < S.n; q++) if (q !== p) close = Math.min(close, S.hands[q].length);
    opts.forEach(function (c) {
      var after = h.filter(function (x) { return x !== c; });
      var skip = S.opts.qs && c === 'Qs', who = nextOf(S, p); if (skip) who = nextOf(S, who);
      var threat = who !== p && S.hands[who].length <= 2 ? 2.5 : close <= 2 ? 1.6 : 1;
      var eight = rk(c) === '8';
      (eight ? SUITS : [su(c)]).forEach(function (s) {
        var mine = 0, mates = 0;
        after.forEach(function (x) { if (rk(x) === '8') return; if (su(x) === s) mine++; else if (!eight && rk(x) === rk(c)) mates++; });
        var v = mine * W.mine + mates * W.rank + pts(c) * W.dump;
        if (who === p) v += W.stop * 2;   // (two players and the queen of spades: our turn again)
        else v -= canFollow(S, p, who, s, eight ? null : rk(c), gone) * W.stop * threat;
        if (eight) v -= after.length > 2 ? W.eight : 1;
        if (S.opts.twos && rk(c) === '2') v += (threat - 1) * W.two;
        if (skip) v += (threat - 1) * W.two;
        if (!best || v > best.v + 1e-9) best = { v: v, c: c, s: eight ? s : undefined };
      });
    });
    return { k: 'play', c: best.c, s: best.s };
  }
  // Expert weighs its plays as Hard does, and when a hand is close to its end (someone holds three cards or fewer) it
  // plays each card it could (an 8 with each suit) through to the end of the hand many times over. Each time it deals the
  // cards it can't see to the other hands and the stock in a way that fits what the table has seen (a player who drew
  // holds none of the suit they couldn't follow, and no 8), and everyone plays on as Hard would. It keeps the play that
  // goes out first most often. It sees nothing a player at the table couldn't.
  C.xr = { ms: 700, min: 40, max: 300, at: 3 };
  function expertPlay(S, p, opts) {
    var usual = hardPlay(S, p, opts), close = 99;
    for (var q = 0; q < S.n; q++) close = Math.min(close, S.hands[q].length);
    if (close > C.xr.at) return usual;
    var cands = [];
    opts.forEach(function (c) { if (rk(c) === '8' && S.hands[p].length > 1) SUITS.forEach(function (s) { cands.push({ k: 'play', c: c, s: s }); }); else cands.push({ k: 'play', c: c }); });
    if (cands.length < 2) return usual;
    var gone = seen(S, p), pool = [];
    deck().forEach(function (c) { if (!gone[c]) pool.push(c); });
    var tot = cands.map(function () { return 0; }), t0 = Date.now(), k, i;
    for (k = 0; k < C.xr.max && (k < C.xr.min || Date.now() - t0 < C.xr.ms); k++) {
      var W = world(S, p, pool);
      for (i = 0; i < cands.length; i++) tot[i] += rollout(S, W, p, cands[i]);
    }
    var bi = -1; for (i = 0; i < cands.length; i++) if (cands[i].c === usual.c && cands[i].s === usual.s) bi = i;
    for (i = 0; i < cands.length; i++) if (bi < 0 || tot[i] > tot[bi] + 1) bi = i;
    return cands[bi];
  }
  // one way the unseen cards could lie: dealt to the other hands and the stock, the hardest cards to place first
  function world(S, p, pool) {
    var n = S.n, hands = [], left = [], q;
    for (q = 0; q < n; q++) { hands.push(q === p ? S.hands[p].slice() : []); left.push(q === p ? 0 : S.hands[q].length); }
    left.push(S.deck.length); hands.push([]);   // (the stock is the last "hand", and can take any card)
    function can(c) { var l = []; for (var q = 0; q <= n; q++) { if (left[q] <= 0) continue; if (q < n) { var v = S.vd[q]; if (rk(c) === '8' ? v.indexOf('8') >= 0 : v.indexOf(su(c)) >= 0) continue; } l.push(q); } return l; }
    var cards = shuffle(pool.slice()).map(function (c) { return { c: c, k: can(c).length }; });
    cards.sort(function (x, y) { return x.k - y.k; });
    cards.forEach(function (x) {
      var ok = can(x.c); if (!ok.length) for (q = 0; q <= n; q++) if (left[q] > 0) ok.push(q);
      var t = 0; ok.forEach(function (q) { t += left[q]; }); var r = C.rng() * t, w = ok[0];
      for (var i = 0; i < ok.length; i++) { r -= left[ok[i]]; if (r < 0) { w = ok[i]; break; } }
      hands[w].push(x.c); left[w]--;
    });
    return { hands: hands.slice(0, n), deck: hands[n] };
  }
  // the hand played out in that world from seat p's play a, everyone playing as Hard: 1 if p goes out first
  function rollout(S, W, p, a) {
    var X = {};
    for (var key in S) X[key] = S[key];
    X.sim = 1; X.done = 0; X.w = -1;
    X.hands = W.hands.map(function (h) { return h.slice(); }); X.deck = W.deck.slice(); X.disc = S.disc.slice();
    X.vd = S.vd.slice(); X.played = { s: S.played.s, h: S.played.h, d: S.played.d, c: S.played.c }; X.plays = S.plays.slice(); X.draws = S.draws.slice();
    X.players = S.players.map(function (pl) { return { name: pl.name, cpu: true, level: 'expert' }; });
    if (!move(X, p, a)) return 0;
    for (var g = 0; !X.done && g < 400; g++) { var q = X.turn, b = bot(X, q); if (!b || !move(X, q, b)) break; }
    return X.done && X.w === p ? 1 : 0;
  }
  var api = { RANKS: RANKS, SUITS: SUITS, SNAME: SNAME, GLYPH: GLYPH, C: C, rk: rk, su: su, pts: pts, count: count, name: name, label: label, lv: lv,
    newGame: newGame, deal: deal, legal: legal, playable: playable, canDraw: canDraw, canPass: canPass, stockLeft: stockLeft, apply: apply,
    turn: turn, bot: bot, top: top, nextOf: nextOf, handSize: handSize };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.C8Core = api;
})(typeof window !== 'undefined' ? window : this);
