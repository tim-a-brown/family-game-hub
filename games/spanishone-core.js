// ═══════════════════════════════════════════════════════════════════════════
// UNO: the rules and the computer players (window.SpanishCore, or require() in Node for testing). UNO is a trademark of
// Mattel, Inc., used with Mattel's permission (2026-11-26); the game was built as Spanish One, so its files, ids and
// storage keys say spanishone, and they stay that way so saved games and history carry on.
//
// Colored number cards and action cards, the first player out of cards wins the hand. The rules follow Mattel's
// official rules: match the top card by color, number or symbol; a Wild names a color; a Wild Draw Four may be challenged;
// Reverse acts as a Skip with two players; a player who can't play draws one and may play it at once; going down to
// one card needs a call of "UNO!", and a player caught without calling before their next turn draws two.
// The winner of a hand scores what is left in everyone else's hand (numbers at face value, Skip, Reverse and Draw Two
// 20, Wilds 50); the first to 500 wins, or one hand decides it.
//
// The deck (108): four colors, r y g b; in each one 0, two each of 1 to 9, and two each of Skip (s), Reverse (r) and
// Draw Two (d2); four Wild (w) and four Wild Draw Four (w4), color 'w'.
//
// House rules (setup options, standard off): stacking (a Draw Two can be answered with a Draw Two or a Wild Draw Four,
// and a Wild Draw Four with a Wild Draw Four; whoever can't answer draws the lot), draw until you can play, 7-0 (a 7
// swaps hands with a player you choose, a 0 passes every hand along in the direction of play), and Draw Four freely
// played (no challenge).
//
// State: plain JSON (the saved game and the online table are the same object): see newGame() and deal().
// Moves: apply(st, p, a) with a =
//   {k:'play', id, c?, t?, call?}  c: the color a Wild names; t: the seat a 7 swaps with (7-0); call: UNO! with it
//   {k:'draw'}                      draw one (or until you can play), then maybe play it
//   {k:'keep'}                      keep the card you drew and end your turn
//   {k:'take'}                      take the Draw cards aimed at you
//   {k:'challenge'}                 challenge the Wild Draw Four aimed at you
//   {k:'pick', c}                   the first player names the color when the first card turned is a Wild
//   {k:'call'}                      UNO! (any time you hold two on your turn, or one you haven't called)
//   {k:'catch', t}                  catch t, who holds one card and didn't call (any time before t's next turn)
// apply returns the move ({k, p, ev: [events to animate]}) or null when it isn't allowed. bot(st, p) gives the
// computer's move for seat p.
// ═══════════════════════════════════════════════════════════════════════════
(function (root) {
  'use strict';
  var COLORS = ['r', 'y', 'g', 'b'];
  var CNAME = { r: 'Red', y: 'Yellow', g: 'Green', b: 'Blue', w: 'Wild' };
  var VNAME = { s: 'Skip', r: 'Reverse', d2: 'Draw Two', w: 'Wild', w4: 'Wild Draw Four' };
  var C = { rng: Math.random };   // (tests swap in a seeded generator)
  function rnd() { return C.rng(); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  // ── Cards ──
  function deck() {
    var out = [], id = 0;
    function add(c, v) { out.push({ id: 'k' + (id++), c: c, v: v }); }
    COLORS.forEach(function (c) {
      add(c, '0');
      for (var n = 1; n <= 9; n++) { add(c, String(n)); add(c, String(n)); }
      ['s', 'r', 'd2'].forEach(function (v) { add(c, v); add(c, v); });
    });
    for (var i = 0; i < 4; i++) { add('w', 'w'); add('w', 'w4'); }
    return out;
  }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function isNum(c) { return /^\d$/.test(c.v); }
  function pts(c) { return isNum(c) ? +c.v : c.c === 'w' ? 50 : 20; }
  function handPts(h) { return h.reduce(function (a, c) { return a + pts(c); }, 0); }
  function name(c) { return c.c === 'w' ? VNAME[c.v] : CNAME[c.c] + ' ' + (isNum(c) ? c.v : VNAME[c.v]); }
  function code(c) { return c.c + c.v; }
  function find(h, id) { for (var i = 0; i < h.length; i++) if (h[i].id === id) return i; return -1; }
  var VORD = { '0': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, s: 10, r: 11, d2: 12, w: 13, w4: 14 };
  function sortHand(h) { return h.sort(function (a, b) { return (COLORS.indexOf(a.c) + 1 || 9) - (COLORS.indexOf(b.c) + 1 || 9) || VORD[a.v] - VORD[b.v] || (a.id < b.id ? -1 : 1); }); }

  // ── A new game ──
  // cfg: {players: [{name, cpu, level}], to: 500 | 0 (one hand), stack, until, seven, four: 'challenge' | 'free', level}
  function lv(v) { return v === 'easy' || v === 'hard' || v === 'expert' ? v : 'normal'; }
  function hardish(l) { return l === 'hard' || l === 'expert'; }
  function zeros(n, v) { var a = []; for (var i = 0; i < n; i++) a.push(v === undefined ? 0 : v); return a; }
  function newGame(cfg) {
    var n = cfg.players.length;
    var st = {
      v: 1, n: n, players: cfg.players.map(function (p) { return { name: p.name, cpu: !!p.cpu, level: p.cpu ? lv(p.level || cfg.level) : undefined }; }),
      level: lv(cfg.level), to: cfg.to === 0 ? 0 : +cfg.to || 500,
      opts: { stack: !!cfg.stack, until: !!cfg.until, seven: !!cfg.seven, four: cfg.four === 'free' ? 'free' : 'challenge' },
      scores: zeros(n), rounds: [], hx: [], highlights: [], round: 0, dealer: Math.floor(rnd() * n),
      started: Date.now(), winner: -1, phase: 'play', bluffs: zeros(n), honest: zeros(n), stats: { caught: zeros(n), calls: zeros(n), best: null }
    };
    deal(st);
    return st;
  }
  function deal(st) {
    var n = st.n;
    st.round++;
    if (st.round > 1) st.dealer = (st.dealer + 1) % n;
    var d = shuffle(deck());
    st.hands = []; for (var p = 0; p < n; p++) st.hands.push([]);
    for (var k = 0; k < 7; k++) for (var q = 1; q <= n; q++) st.hands[(st.dealer + q) % n].push(d.pop());
    st.hands.forEach(sortHand);
    // the first card turned: a Wild Draw Four goes back into the deck and another is turned
    var top = d.pop(), back = 0;
    while (top.v === 'w4') { d.push(top); shuffle(d); top = d.pop(); back++; }
    st.draw = d; st.pile = [top];
    st.color = top.c === 'w' ? null : top.c;
    st.dir = 1; st.pend = 0; st.pendK = null; st.pendN = 0; st.four = null; st.drawn = null;
    st.called = zeros(n, false); st.voids = []; for (p = 0; p < n; p++) st.voids.push({});
    st.run = { v: top.v, n: isNum(top) ? 1 : 0 }; st.passes = 0; st.phase = 'play';
    st.hand = { plays: 0, stackMax: 0, chainMax: isNum(top) ? 1 : 0, rev: 0, skip: 0 };
    var first = (st.dealer + 1) % n, ev = [{ e: 'deal', dealer: st.dealer, top: top, back: back }];
    // what the first card turned does to the first player
    if (top.v === 's') { ev.push({ e: 'skip', p: first }); first = (first + 1) % n; }
    else if (top.v === 'r') { st.dir = -1; first = n === 2 ? (st.dealer + 2) % n : st.dealer; ev.push({ e: 'rev', dir: -1 }); if (n === 2) ev.push({ e: 'skip', p: (st.dealer + 1) % n }); }
    else if (top.v === 'd2') { var got = drawN(st, first, 2); ev.push({ e: 'draw', p: first, n: got.length, ids: ids(got), forced: 1 }); ev.push({ e: 'skip', p: first }); first = (first + 1) % n; }
    st.turn = first;
    if (top.v === 'w') st.phase = 'pick';
    st.dealEv = ev;
    return ev;
  }
  function ids(cs) { return cs.map(function (c) { return c.id; }); }

  // ── Drawing ──
  function refill(st, ev) {
    if (st.draw.length || st.pile.length < 2) return false;
    var top = st.pile.pop();
    st.draw = shuffle(st.pile); st.pile = [top];
    if (ev) ev.push({ e: 'reshuffle', n: st.draw.length });
    return true;
  }
  function drawN(st, p, n, ev) {
    var got = [];
    for (var i = 0; i < n; i++) {
      if (!st.draw.length) refill(st, ev);
      if (!st.draw.length) break;
      got.push(st.draw.pop());
    }
    got.forEach(function (c) { st.hands[p].push(c); });
    if (st.hands[p].length >= 2) st.called[p] = false;
    sortHand(st.hands[p]);
    return got;
  }

  // ── Whose turn, and what may be played ──
  function nextSeat(st, p, k) { var n = st.n; return (((p + st.dir * (k || 1)) % n) + n) % n; }
  function topCard(st) { return st.pile[st.pile.length - 1]; }
  function canPlay(st, c) {
    if (st.pend > 0) return st.opts.stack ? (c.v === 'w4' || (c.v === 'd2' && st.pendK === 'd2')) : false;
    if (c.c === 'w') return true;
    if (!st.color) return true;
    var t = topCard(st);
    return c.c === st.color || (t.c !== 'w' && c.v === t.v);
  }
  // A Wild Draw Four is "honest" only when its player holds no card of the color in play (the challenge rule)
  function honest(st, p, id) { return !st.color || st.pend > 0 || !st.hands[p].some(function (c) { return c.id !== id && c.c === st.color; }); }
  function legal(st, p) {
    if (turn(st) !== p) return [];
    if (st.phase === 'drawn') { var i = find(st.hands[p], st.drawn); return i >= 0 && canPlay(st, st.hands[p][i]) ? [st.hands[p][i]] : []; }
    if (st.phase !== 'play') return [];
    return st.hands[p].filter(function (c) { return canPlay(st, c); });
  }
  function turn(st) { return !st || st.phase === 'over' ? -1 : st.turn; }
  function vulnerable(st, t) { return !!st.hands && st.phase !== 'over' && st.hands[t] && st.hands[t].length === 1 && !st.called[t]; }
  function canCall(st, p) {
    if (!st.hands || st.phase === 'over' || st.called[p]) return false;
    var h = st.hands[p];
    return h.length === 1 || (h.length === 2 && turn(st) === p && (st.phase === 'play' || st.phase === 'drawn') && legal(st, p).length > 0);
  }
  function setTurn(st, t) {
    st.turn = t;
    // a player who reaches their next turn without being caught is safe
    if (vulnerable(st, t)) st.called[t] = true;
  }

  // ── Moves ──
  function apply(st, p, a) {
    if (!a || !st.hands || st.phase === 'over') return null;
    var mv = { k: a.k, p: p, ev: [] };
    if (a.k === 'call') {
      if (!canCall(st, p)) return null;
      st.called[p] = true; st.stats.calls[p]++;
      mv.ev.push({ e: 'call', p: p });
      return mv;
    }
    if (a.k === 'catch') {
      var t = a.t;
      if (t === p || t == null || t < 0 || t >= st.n || !vulnerable(st, t)) return null;
      var got = drawN(st, t, 2, mv.ev);
      st.called[t] = false; st.stats.caught[p]++;
      mv.t = t;
      mv.ev.push({ e: 'caught', p: t, by: p });
      mv.ev.push({ e: 'draw', p: t, n: got.length, ids: ids(got), forced: 1 });
      return mv;
    }
    if (turn(st) !== p) return null;
    var h = st.hands[p];
    if (st.phase === 'pick') {
      if (a.k !== 'pick' || COLORS.indexOf(a.c) < 0) return null;
      st.color = a.c; st.phase = 'play';
      mv.ev.push({ e: 'color', p: p, c: a.c });
      return mv;
    }
    if (a.k === 'play') {
      var i = find(h, a.id); if (i < 0) return null;
      var c = h[i];
      if (st.phase === 'drawn' && c.id !== st.drawn) return null;
      if (st.phase !== 'play' && st.phase !== 'drawn') return null;
      if (!canPlay(st, c)) return null;
      if (c.c === 'w' && COLORS.indexOf(a.c) < 0) return null;
      var seven = st.opts.seven && c.v === '7' && h.length > 1;
      if (seven && (a.t == null || a.t === p || a.t < 0 || a.t >= st.n)) return null;
      return doPlay(st, p, c, a, mv);
    }
    if (a.k === 'draw') {
      if (st.phase !== 'play' || st.pend > 0 || st.four) return null;
      return doDraw(st, p, mv);
    }
    if (a.k === 'keep') {
      if (st.phase !== 'drawn') return null;
      st.phase = 'play'; st.drawn = null;
      mv.ev.push({ e: 'keep', p: p });
      endTurn(st, p, 1, mv);
      return mv;
    }
    if (a.k === 'take') {
      if (st.phase !== 'play' || st.pend <= 0) return null;
      takePend(st, p, mv);
      endTurn(st, p, 1, mv);
      return mv;
    }
    if (a.k === 'challenge') {
      if (st.phase !== 'play' || !st.four) return null;
      var f = st.four; st.four = null;
      if (f.guilty) {
        var g1 = drawN(st, f.by, 4, mv.ev);
        st.pend = 0; st.pendK = null; st.pendN = 0;
        st.bluffs[f.by]++;
        mv.ev.push({ e: 'bluff', p: f.by, by: p, guilty: true, prev: f.prev, show: ids(st.hands[f.by]) });
        mv.ev.push({ e: 'draw', p: f.by, n: g1.length, ids: ids(g1), forced: 1 });
        st.highlights.push(st.players[p].name + ' caught ' + st.players[f.by].name + ' bluffing a Wild Draw Four in hand ' + st.round);
        mv.caught = 1;
        // the challenger still takes their own turn, in the color that was named
        return mv;
      }
      var n6 = st.pend + 2;
      var g2 = drawN(st, p, n6, mv.ev);
      st.pend = 0; st.pendK = null; st.pendN = 0;
      st.honest[f.by] = (st.honest[f.by] || 0) + 1;
      mv.ev.push({ e: 'bluff', p: f.by, by: p, guilty: false, prev: f.prev });
      mv.ev.push({ e: 'draw', p: p, n: g2.length, ids: ids(g2), forced: 1 });
      mv.ev.push({ e: 'skip', p: p, quiet: 1 });
      endTurn(st, p, 1, mv);
      return mv;
    }
    return null;
  }
  function takePend(st, p, mv) {
    var n = st.pend, k = st.pendN, kind = st.pendK;
    var got = drawN(st, p, n, mv.ev);
    st.pend = 0; st.pendK = null; st.pendN = 0; st.four = null;
    mv.ev.push({ e: 'draw', p: p, n: got.length, ids: ids(got), forced: 1, stack: k, kind: kind });
    mv.ev.push({ e: 'skip', p: p, quiet: 1 });
    if (k >= 2) {
      mv.stack = { p: p, n: got.length, k: k };
      if (got.length > st.hand.stackMax) st.hand.stackMax = got.length;
      if (k >= 3) st.highlights.push(st.players[p].name + ' drew ' + got.length + ' cards after a stack of ' + k + ' Draw cards in hand ' + st.round);
    }
  }
  function doDraw(st, p, mv) {
    var color = st.color, got = [];
    st.voids[p][color] = 1;
    if (st.opts.until) {
      for (var i = 0; i < 108; i++) {
        var one = drawN(st, p, 1, mv.ev); if (!one.length) break;
        got.push(one[0]);
        if (canPlay(st, one[0])) break;
      }
    } else got = drawN(st, p, 1, mv.ev);
    mv.ev.push({ e: 'draw', p: p, n: got.length, ids: ids(got) });
    var last = got[got.length - 1];
    if (last && canPlay(st, last)) {
      st.phase = 'drawn'; st.drawn = last.id; st.passes = 0;
      mv.drew = last.id;
      return mv;
    }
    // nothing to play (and, rarely, nothing left to draw): the turn passes
    if (!got.length) st.passes++; else st.passes = 0;
    if (st.passes >= st.n * 2) { blocked(st, mv); return mv; }
    endTurn(st, p, 1, mv);
    return mv;
  }
  function doPlay(st, p, c, a, mv) {
    var h = st.hands[p], before = st.color, n = st.n;
    var wasHonest = c.v !== 'w4' || honest(st, p, c.id);
    st.four = null;   // (a Draw card stacked on a Wild Draw Four gives up the challenge)
    h.splice(find(h, c.id), 1);
    st.pile.push(c);
    st.phase = 'play'; st.drawn = null; st.passes = 0;
    st.hand.plays++;
    if (c.c === 'w') st.color = a.c; else { st.color = c.c; delete st.voids[p][c.c]; }
    // a chain of the same number
    if (isNum(c) && st.run.v === c.v) st.run.n++; else st.run = { v: c.v, n: isNum(c) ? 1 : 0 };
    if (st.run.n > st.hand.chainMax) st.hand.chainMax = st.run.n;
    mv.ev.push({ e: 'play', p: p, card: c, c: st.color, from: before, run: st.run.n });
    if (st.run.n >= 5) {   // (a chain of four is common enough; five or more is worth keeping)
      var said = ['Five', 'Six', 'Seven', 'Eight'][st.run.n - 5] || String(st.run.n), hl = said + ' ' + c.v + 's were played in a row in hand ' + st.round;
      if (st.run.n > 5) st.highlights = st.highlights.filter(function (x) { return !/ were played in a row in hand \d+$/.test(x) || x.indexOf('hand ' + st.round) < 0 || x.indexOf(' ' + c.v + 's ') < 0; });
      st.highlights.push(hl);
    }
    if (a.call && h.length === 1) { st.called[p] = true; st.stats.calls[p]++; mv.ev.push({ e: 'call', p: p }); }
    if (h.length >= 2) st.called[p] = false;
    var out = h.length === 0;
    // 7-0
    if (st.opts.seven && !out && c.v === '7') {
      var t = a.t, tmp = st.hands[p]; st.hands[p] = st.hands[t]; st.hands[t] = tmp;
      [p, t].forEach(function (q) { st.called[q] = st.hands[q].length === 1; });
      mv.ev.push({ e: 'swap', a: p, b: t });
    } else if (st.opts.seven && !out && c.v === '0') {
      var old = st.hands.slice(), nh = [];
      for (var q = 0; q < n; q++) nh[(((q + st.dir) % n) + n) % n] = old[q];
      st.hands = nh;
      for (q = 0; q < n; q++) st.called[q] = st.hands[q].length === 1;
      mv.ev.push({ e: 'rotate', dir: st.dir });
    }
    if (c.v === 'r') st.hand.rev++; else if (c.v === 's') st.hand.skip++;
    // what the card does next
    var nx = nextSeat(st, p, 1);
    if (c.v === 'r') {
      st.dir = -st.dir; mv.ev.push({ e: 'rev', dir: st.dir });
      if (n === 2) { if (!out) { mv.ev.push({ e: 'skip', p: nx }); setTurn(st, p); mv.again = 1; } }
      nx = nextSeat(st, p, 1);
    }
    if (out) {
      // a Draw card played last still counts against the next player
      if (c.v === 'd2' || c.v === 'w4') {
        var tot = st.pend + (c.v === 'd2' ? 2 : 4), k0 = st.pendN + 1;
        st.pend = tot; st.pendN = k0; st.four = null;
        takePend(st, nx, mv);
      }
      finishHand(st, p, c, mv);
      return mv;
    }
    if (c.v === 'r') { if (n > 2) endTurn(st, p, 1, mv); return mv; }
    if (c.v === 's') { mv.ev.push({ e: 'skip', p: nx }); endTurn(st, p, 2, mv); return mv; }
    if (c.v === 'd2' || c.v === 'w4') {
      var add = c.v === 'd2' ? 2 : 4;
      var chal = c.v === 'w4' && st.opts.four === 'challenge' && st.pend === 0;
      st.pend += add; st.pendN++; st.pendK = c.v;
      if (chal) {
        st.four = { by: p, prev: before, guilty: !wasHonest };
        setTurn(st, nx);
        return mv;
      }
      if (st.opts.stack) { setTurn(st, nx); return mv; }
      takePend(st, nx, mv);
      endTurn(st, p, 2, mv);
      return mv;
    }
    endTurn(st, p, 1, mv);
    return mv;
  }
  function endTurn(st, p, k, mv) {
    var t = nextSeat(st, p, k);
    setTurn(st, t);
    mv.ev.push({ e: 'turn', p: t });
  }
  // Nobody can play and nothing is left to draw (very rare): the hand ends, and the lightest hand wins it
  function blocked(st, mv) {
    var best = 0;
    for (var p = 1; p < st.n; p++) if (handPts(st.hands[p]) < handPts(st.hands[best])) best = p;
    mv.ev.push({ e: 'blocked', p: best });
    finishHand(st, best, null, mv, true);
  }
  function finishHand(st, w, last, mv, block) {
    var n = st.n, got = 0, left = [];
    for (var p = 0; p < n; p++) { left.push(clone(st.hands[p])); if (p !== w) got += handPts(st.hands[p]); }
    var big = -1;
    for (p = 0; p < n; p++) if (p !== w && st.hands[p].length >= 15 && (big < 0 || st.hands[p].length > st.hands[big].length)) big = p;
    st.scores[w] += got;
    var row = zeros(n); row[w] = got; st.rounds.push(row);
    var res = { round: st.round, w: w, pts: got, last: last, left: left, wild: !!(last && last.c === 'w'), big: big, bigN: big >= 0 ? st.hands[big].length : 0, block: !!block, chain: st.hand.chainMax, stack: st.hand.stackMax };
    // (for the game's history: no arrays inside arrays, so each player's leftovers are a dotted string)
    st.hx.push({ w: w, pts: got, c: last ? code(last) : '', d: st.dealer, n: left.map(function (h) { return h.length; }).join('.'), lp: left.map(handPts).join('.'),
      rv: st.hand.rev, sk: st.hand.skip, st: st.hand.stackMax, ch: st.hand.chainMax, b: block ? 1 : 0 });
    if (!st.stats.best || got > st.stats.best.pts) st.stats.best = { p: w, pts: got, r: st.round };
    var nm = st.players[w].name;
    if (res.wild) st.highlights.push(nm + ' went out with a ' + VNAME[last.v] + ' in hand ' + st.round);
    if (big >= 0) st.highlights.push(nm + ' won hand ' + st.round + ' while ' + st.players[big].name + ' held ' + res.bigN + ' cards');
    st.last = res;
    mv.ev.push({ e: 'out', p: w, pts: got, wild: res.wild, block: !!block });
    mv.end = 1;
    var over = st.to === 0 || st.scores[w] >= st.to;
    if (over) {
      st.phase = 'over'; st.winner = w;
      mv.ev.push({ e: 'over', p: w });
      return;
    }
    var ev = deal(st);
    mv.ev.push({ e: 'newhand', round: st.round, ev: ev });
  }

  // ═══ The computer players ═══════════════════════════════════════════════════════════════════════
  // Easy plays any card it can. Normal keeps its Wilds for when nothing else will do, and names its strongest
  // color. Hard remembers which colors each player had to draw on, steers the color away from the next player, keeps
  // its action cards for whoever is about to go out or is leading, and will bluff a Wild Draw Four when it matters.
  // Expert does all Hard does without its lapses (Hard now and then forgets who drew on which color, and misses a
  // player who didn't call UNO), and counts the cards gone too: of each color, how many are still out in other hands
  // or the draw pile, so it turns play to the color the others are least likely to hold, and it sheds its points
  // when the next player is about to go out.
  // None of them looks at anyone else's cards: they see only what anyone at the table could see.
  function lvOf(st, p) { var pl = st.players[p]; return lv((pl && pl.level) || st.level); }
  function counts(h) { var o = { r: 0, y: 0, g: 0, b: 0 }; h.forEach(function (c) { if (o[c.c] != null) o[c.c]++; }); return o; }
  function bestColor(st, p, skipId, lvl) {
    var h = st.hands[p].filter(function (c) { return c.id !== skipId; }), cn = counts(h), pv = { r: 0, y: 0, g: 0, b: 0 };
    h.forEach(function (c) { if (pv[c.c] != null) pv[c.c] += pts(c); });
    if (lvl === 'easy') { var held = COLORS.filter(function (c) { return cn[c] > 0; }); if (!held.length || rnd() < 0.5) held = COLORS; return held[Math.floor(rnd() * held.length)]; }
    var nx = nextSeat(st, p, 1), best = null, bs = -1e9;
    COLORS.forEach(function (c) {
      var s = cn[c] * 10 + pv[c] * 0.2;
      if (hardish(lvl)) {
        if (st.voids[nx][c] && sees(lvl)) s += 6;   // the next player had to draw on this color
        for (var q = 0; q < st.n; q++) if (q !== p && q !== nx && st.voids[q][c]) s += 2;
      }
      if (lvl === 'expert') s -= unseen(st, p)[c] * (threat(st, nx) >= 3 ? C.xu[0] : C.xu[1]);
      s += rnd() * (lvl === 'expert' ? 0.1 : 0.5);
      if (s > bs) { bs = s; best = c; }
    });
    return best;
  }
  // how many of each color are still unseen by p: 25 of each, less those on the discard pile and in p's own hand
  C.xu = [0.5, 0.2, 0.5, 0.1, 0.2, 0.6, 0];   // (Expert's weights: the colors still out when choosing a color, close to the end and before; when changing color by a play, the same; its noise)
  // (Hard now and then forgets who had to draw on which color; Expert never does)
  C.hv = 0.3; C.hc = 0.7;   // (how often Hard remembers a color someone drew on, and notices a missed UNO; measured with robot games)
  function sees(lvl) { return lvl === 'expert' || rnd() < C.hv; }
  function unseen(st, p) {
    var o = { r: 25, y: 25, g: 25, b: 25 };
    st.pile.forEach(function (c) { if (o[c.c] != null) o[c.c]--; });
    st.hands[p].forEach(function (c) { if (o[c.c] != null) o[c.c]--; });
    return o;
  }
  // how dangerous a player is: about to go out, or leading the scores near the end
  function threat(st, q) {
    var k = st.hands[q].length, s = k <= 1 ? 10 : k === 2 ? 6 : k === 3 ? 3 : 0;
    if (st.to) {
      var lead = Math.max.apply(null, st.scores);
      if (st.scores[q] === lead && lead > 0) s += lead >= st.to * 0.7 ? 3 : 1;
    }
    return s;
  }
  function minOther(st, p) { var best = -1; for (var q = 0; q < st.n; q++) if (q !== p && (best < 0 || st.hands[q].length < st.hands[best].length)) best = q; return best; }
  function swapTarget(st, p, lvl) {
    if (lvl === 'easy') { var o = []; for (var q = 0; q < st.n; q++) if (q !== p) o.push(q); return o[Math.floor(rnd() * o.length)]; }
    return minOther(st, p);
  }
  function botCatchChance(lvl) { return lvl === 'expert' ? 1 : lvl === 'hard' ? C.hc : lvl === 'normal' ? 0.7 : 0.25; }
  function botCallChance(lvl) { return hardish(lvl) ? 1 : lvl === 'normal' ? 0.95 : 0.6; }
  // a computer player looking around the table for someone holding one card who didn't call
  function botCatch(st, p) {
    var lvl = lvOf(st, p);
    for (var t = 0; t < st.n; t++) if (t !== p && vulnerable(st, t) && rnd() < botCatchChance(lvl)) return { k: 'catch', t: t };
    return null;
  }
  function scorePlay(st, p, c, lvl) {
    var h = st.hands[p], nx = nextSeat(st, p, 1), thr = threat(st, nx), left = h.length - 1, s = 0;
    var cn = counts(h);
    if (lvl === 'easy') return 0;
    if (c.c === 'w') {
      s = left <= 1 ? 30 : -40;   // keep Wilds for later (a last card that is a Wild is a sure way out)
      if (c.v === 'w4') s += thr * (hardish(lvl) ? 5 : 3) - 6;
      return s;
    }
    s += pts(c) * 0.6 + cn[c.c] * 3;   // shed points, stay in a color you hold
    if (c.c !== st.color) s += (cn[c.c] - (cn[st.color] || 0)) * 2;   // changing to a stronger color
    var action = c.v === 's' || c.v === 'r' || c.v === 'd2';
    if (action) {
      if (hardish(lvl)) {
        if (st.n === 2 && c.v !== 'd2') s += 12;   // with two players a Skip or a Reverse is a free extra turn
        else if (thr >= 3) s += thr * 4 + (c.v === 'd2' ? 8 : 4);
        else if (left > 3) s -= 6;   // save it for someone who's about to go out
        if (c.v === 'r' && st.n > 2) { var pv = nextSeat(st, p, -1); s += (thr - threat(st, pv)) * 3; }
      } else s += thr * 2 + (c.v === 'd2' ? 3 : 1);
    }
    if (hardish(lvl)) {
      if (st.voids[nx][c.c] && sees(lvl)) s += 9;   // the next player couldn't play this color last time
      if (left === 1 && h.some(function (x) { return x.c === 'w' && x.id !== c.id; })) s += 25;   // finish with the Wild
    }
    if (lvl === 'expert') s += pts(c) * (thr >= 6 ? C.xu[5] : thr >= 3 ? C.xu[6] : 0);   // (shed points when the next player is close to going out)
    if (lvl === 'expert' && c.c !== st.color) { var u = unseen(st, p); s += (u[st.color] - u[c.c]) * (thr >= 3 ? C.xu[2] : C.xu[3]); }
    if (st.opts.seven && c.v === '7' && left > 0) { var mo = minOther(st, p); s += (left - st.hands[mo].length) * 4; }
    if (st.opts.seven && c.v === '0' && left > 0) { var giver = nextSeat(st, p, -1); s += (left - st.hands[giver].length) * 3; }
    return s;
  }
  function choose(st, p, opts, lvl) {
    if (!opts.length) return null;
    if (lvl === 'easy') return opts[Math.floor(rnd() * opts.length)];
    var best = null, bs = -1e9;
    opts.forEach(function (c) { var s = scorePlay(st, p, c, lvl) + rnd() * (lvl === 'expert' ? C.xu[4] : 1.5); if (s > bs) { bs = s; best = c; } });
    return best;
  }
  function playMove(st, p, c, lvl) {
    var a = { k: 'play', id: c.id };
    if (c.c === 'w') a.c = bestColor(st, p, c.id, lvl);
    if (st.opts.seven && c.v === '7' && st.hands[p].length > 1) a.t = swapTarget(st, p, lvl);
    if (st.hands[p].length === 2 && rnd() < botCallChance(lvl)) a.call = true;
    return a;
  }
  function botChallenge(st, p) {
    var f = st.four, lvl = lvOf(st, p), k = st.hands[f.by].length;
    if (lvl === 'easy') return rnd() < 0.2;
    if (st.voids[f.by][f.prev]) return false;   // they had to draw on that color, so they likely had none
    if (lvl === 'normal') return k >= 6 && rnd() < 0.5;
    // Hard goes by what this player has done: someone caught bluffing before is challenged again, and a big hand
    // with none of the color is unlikely
    var hon = (st.honest && st.honest[f.by]) || 0, bl = st.bluffs[f.by];
    if (bl > hon) return true;
    return k >= 9 && bl >= hon;
  }
  function bot(st, p) {
    if (turn(st) !== p) return null;
    var lvl = lvOf(st, p);
    var ct = botCatch(st, p); if (ct) return ct;
    if (st.phase === 'pick') return { k: 'pick', c: bestColor(st, p, null, lvl) };
    if (st.four) {
      var w4 = st.opts.stack && st.hands[p].filter(function (c) { return c.v === 'w4'; })[0];
      if (w4 && lvl !== 'easy') return playMove(st, p, w4, lvl);
      return botChallenge(st, p) ? { k: 'challenge' } : { k: 'take' };
    }
    if (st.pend > 0) {
      var stk = legal(st, p);
      if (stk.length && (lvl !== 'easy' || rnd() < 0.7)) { stk.sort(function (a, b) { return (a.v === 'w4') - (b.v === 'w4'); }); return playMove(st, p, stk[0], lvl); }
      return { k: 'take' };
    }
    if (st.phase === 'drawn') {
      var dc = st.hands[p][find(st.hands[p], st.drawn)];
      if (dc && canPlay(st, dc)) {
        if (dc.c === 'w' && lvl !== 'easy' && st.hands[p].length > 3 && threat(st, nextSeat(st, p, 1)) < 3) return { k: 'keep' };
        if (dc.v === 'w4' && !hardish(lvl) && st.opts.four === 'challenge' && !honest(st, p, dc.id)) return { k: 'keep' };
        return playMove(st, p, dc, lvl);
      }
      return { k: 'keep' };
    }
    var opts = legal(st, p);
    // the challenge rule: Easy and Normal play a Wild Draw Four only when they hold nothing of the color; Hard bluffs
    // when the next player is about to go out
    if (st.opts.four === 'challenge') {
      var nx = nextSeat(st, p, 1), bluffOk = hardish(lvl) && st.hands[nx].length <= 2 && st.hands[p].length >= 3;
      opts = opts.filter(function (c) { return c.v !== 'w4' || honest(st, p, c.id) || bluffOk; });
    }
    var c = choose(st, p, opts, lvl);
    if (!c) return { k: 'draw' };
    return playMove(st, p, c, lvl);
  }

  // ── Online privacy helper: what a seat may see of another seat's hand (count only) ──
  function sideName(st, p) { return st.players[p].name; }

  var API = {
    COLORS: COLORS, CNAME: CNAME, VNAME: VNAME, C: C, deck: deck, pts: pts, handPts: handPts, name: name, code: code, isNum: isNum, find: find, sortHand: sortHand,
    newGame: newGame, deal: deal, apply: apply, legal: legal, canPlay: canPlay, honest: honest, turn: turn, nextSeat: nextSeat, topCard: topCard,
    vulnerable: vulnerable, canCall: canCall, bot: bot, botCatch: botCatch, botCatchChance: botCatchChance, lv: lv, lvOf: lvOf, sideName: sideName, clone: clone
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.SpanishCore = API;
})(this);
