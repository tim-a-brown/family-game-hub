// ═══════════════════════════════════════════════════════════════════════════
// Mexican Train: the rules, in plain JSON state. The same code runs in the page (inside games/dominoes.html, through
// games/mexicantrain.js), at the online table (TurnNet: each move is made inside the table's transaction) and in Node
// (scripts/mexicantrain-sim.js plays thousands of games with it).
//
// The rules (Pagat's Mexican Train and the Puremco and Cardinal rule sheets that come with a double-12 set and hub):
//   A double-12 set, 91 tiles. There are 13 rounds: the engine (the double in the hub) is the double 12 in the first
//   round, then the double 11, down to the double blank. A shorter game plays 7 rounds, the double 12 down to the
//   double 6. The engine is taken out before the deal. With 2 to 4 players everyone takes 15 tiles, with 5 or 6 they
//   take 12, with 7 or 8 they take 11. The rest are the boneyard.
//   Every player has a train of their own that runs out from the hub, and there is one public train, the Mexican
//   Train, that anyone can play on. A train's first tile must match the engine.
//   The first player in each round moves one seat round the table from the round before. On your turn you play one
//   tile: on your own train, on the Mexican Train (anyone can start it, on any turn), or on another player's train
//   that has a marker on it.
//   If you can't play, draw one tile. If it plays, play it. If not, pass and put your marker on your own train: now
//   anyone can play on it. The marker comes off when you play on your own train again.
//   A double is played like any tile, and the player who plays it plays again. A double must be covered before
//   anything else is played anywhere: the next tile goes on it, by that player or whoever comes next. Someone who
//   can't cover it draws one, plays it if it covers, or passes and puts out their marker.
//   The round ends when someone plays their last tile (a double too), or when the boneyard is empty and nobody can
//   play. Everyone scores the dots left in their hand, and the double blank counts 50. After the last round the
//   lowest total wins.
// Options (o):
//   first 'one' (one tile a turn, the standard) | 'run' (on your first turn of a round you may lay as many tiles as you
//         can on your own train, one after another, and stop when you like)
//   dbl   'cover' (a double must be covered before anything else is played, the standard) | 'open' (a double can be
//         covered later by anyone: play carries on everywhere)
//   rounds 13 | 7
//
// State (all plain JSON):
//   v, mt: 1, n, players [{name, cpu, level, color}], o {first, dbl, rounds}
//   round (0 based), eng (the engine's number: 12 - round), R (rounds in the game)
//   hands [[ [a,b], ... ]]   bone [[a,b], ...] (the boneyard; the last is drawn first)
//   trains [{own: seat | -1 for the Mexican Train, t: [[in,out], ...], m: marker on (open to everyone)}]
//          trains[i] is seat i's own train for i < n, trains[n] is the Mexican Train (always open)
//   cur    the seat whose turn it is; start: the seat that began this round
//   tn     this turn: {n: tiles played, drew, run (a first-turn run is allowed), on (in the run: own train only),
//          need (a double was played and the next tile is owed)}
//   first  [bool] who has had their first turn this round (the 'run' option)
//   dbl    null | {tr, p, at}: the double that must be covered (o.dbl 'cover'), its train, who played it, when
//   phase  'play' | 'over'
//   scores [totals]   rr [[dots per seat] per round]   ro [{k: 'out' | 'block', w: seat | -1}] per round
//   prev   the last round as it ended: {round, eng, trains, hands, res}  (shown while the next is already dealt)
//   seq    moves made (for the replay)   pl: this round, move by move (the history's replay, see detail())
//   hl     highlights kept as the game goes, rs: the random seed
// ═══════════════════════════════════════════════════════════════════════════
(function (root) {
  'use strict';
  var TOP = 12;
  var NUMW = ['blank', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  // mulberry32 on a seed kept in the state, so a deal can be played again exactly
  function rnd(S) {
    var t = (S.rs = (S.rs + 0x6D2B79F5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function shuffle(S, a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rnd(S) * (i + 1)), x = a[i]; a[i] = a[j]; a[j] = x; } return a; }
  function tid(t) { var a = Math.min(t[0], t[1]), b = Math.max(t[0], t[1]); return a * 13 + b; }
  function fromId(id) { return [Math.floor(id / 13), id % 13]; }
  function isDbl(t) { return t[0] === t[1]; }
  function dots(t) { return t[0] === 0 && t[1] === 0 ? 50 : t[0] + t[1]; }   // (the double blank counts 50)
  function handDots(h) { return h.reduce(function (s, t) { return s + dots(t); }, 0); }
  function tname(t) { return isDbl(t) ? 'double ' + NUMW[t[0]] : t[0] + '-' + t[1]; }
  function perHand(n) { return n <= 4 ? 15 : n <= 6 ? 12 : 11; }
  function fullSet() { var s = []; for (var a = 0; a <= TOP; a++) for (var b = a; b <= TOP; b++) s.push([a, b]); return s; }
  function opts(o) {
    o = o || {};
    return { first: o.first === 'run' ? 'run' : 'one', dbl: o.dbl === 'open' ? 'open' : 'cover', rounds: +o.rounds === 7 ? 7 : 13 };
  }

  // ── A new game ────────────────────────────────────────────────────────────
  function newGame(players, o, seed) {
    var n = players.length;
    var S = {
      v: 1, mt: 1, n: n, o: opts(o), R: 0, round: 0, eng: TOP,
      players: players.map(function (p) { return { name: p.name, cpu: !!p.cpu, level: p.level || undefined, color: p.color }; }),
      hands: [], bone: [], trains: [], cur: 0, start: 0, tn: null, first: [], dbl: null, phase: 'play',
      scores: players.map(function () { return 0; }), rr: [], ro: [], prev: null, seq: 0, pl: '',
      hl: { outs: {}, zero: {}, blank: [], long: null, run: null, covers: {}, mex: null, first1: [], bigLoss: null },
      rs: (seed == null ? Math.floor(Math.random() * 4294967296) : seed) >>> 0
    };
    S.R = S.o.rounds;
    deal(S);
    return S;
  }
  function deal(S) {
    var n = S.n, e = TOP - S.round, per = perHand(n);
    S.eng = e;
    var set = shuffle(S, fullSet().filter(function (t) { return !(t[0] === e && t[1] === e); }));
    S.hands = [];
    for (var i = 0; i < n; i++) S.hands.push(sortHand(set.splice(0, per)));
    S.bone = set;
    S.trains = [];
    for (i = 0; i < n; i++) S.trains.push({ own: i, t: [], m: false });
    S.trains.push({ own: -1, t: [], m: true });
    S.start = S.round % n; S.cur = S.start;
    S.first = S.players.map(function () { return false; });
    S.dbl = null; S.pl = ''; S.phase = 'play';
    newTurn(S);
  }
  // a hand in order: by the higher end, then the lower, highest first (the rack shows them this way)
  function sortHand(h) { return h.sort(function (a, b) { var x = Math.max(b[0], b[1]) - Math.max(a[0], a[1]); return x || Math.min(b[0], b[1]) - Math.min(a[0], a[1]); }); }
  function newTurn(S) { S.tn = { n: 0, drew: false, run: S.o.first === 'run' && !S.first[S.cur], on: false, need: false }; }

  // ── What can be played ────────────────────────────────────────────────────
  function mex(S) { return S.n; }
  function endOf(S, tr) { var T = S.trains[tr].t; return T.length ? T[T.length - 1][1] : S.eng; }
  // the trains seat p may play on now (not yet checking any tile against them)
  function targets(S, p, fresh) {
    if (S.dbl && S.o.dbl === 'cover') return [S.dbl.tr];
    if (!fresh && S.tn && S.tn.on) return [p];
    var out = [p, mex(S)];
    for (var i = 0; i < S.n; i++) if (i !== p && S.trains[i].m) out.push(i);
    return out;
  }
  // every play seat p could make now: [{id, t, tr}] (t as it sits in the hand)
  function legal(S, p, fresh) {
    if (S.phase !== 'play') return [];
    if (p == null) p = S.cur;
    var out = [], tg = targets(S, p, fresh), h = S.hands[p];
    tg.forEach(function (tr) {
      var v = endOf(S, tr);
      h.forEach(function (t) { if (t[0] === v || t[1] === v) out.push({ id: tid(t), t: t, tr: tr }); });
    });
    return out;
  }
  function canDraw(S) { return S.phase === 'play' && !S.tn.drew && S.bone.length > 0 && !legal(S).length && !canDone(S); }
  function canPass(S) { return S.phase === 'play' && !legal(S).length && (S.tn.drew || !S.bone.length) && !canDone(S); }
  // in a first-turn run, with at least one tile laid on your own train and no double owed: stop when you like
  function canDone(S) { return S.phase === 'play' && !!(S.tn.on && S.tn.n > 0 && !S.tn.need); }
  // could anyone ever play again? (with every train open, as it will be once everyone who can't play has passed)
  function anyoneCan(S) {
    var ends = S.dbl && S.o.dbl === 'cover' ? [endOf(S, S.dbl.tr)] : S.trains.map(function (T, i) { return endOf(S, i); });
    return S.hands.some(function (h) { return h.some(function (t) { return ends.indexOf(t[0]) >= 0 || ends.indexOf(t[1]) >= 0; }); });
  }

  // ── Moves ─────────────────────────────────────────────────────────────────
  // apply(S, seat, mv) changes S and returns the events for the table to play back, or null if the move can't be made.
  // mv: {k: 'play', id, tr} | {k: 'draw'} | {k: 'pass'} | {k: 'done'}
  function apply(S, p, mv) {
    if (!S || S.phase !== 'play' || p !== S.cur || !mv) return null;
    var ev = [], P = S.players[p];
    if (mv.k === 'play') {
      var ok = legal(S, p).filter(function (m) { return m.id === mv.id && m.tr === mv.tr; })[0];
      if (!ok) return null;
      var h = S.hands[p], hi = -1;
      h.forEach(function (t, k) { if (tid(t) === mv.id) hi = k; });
      var t = h.splice(hi, 1)[0], v = endOf(S, mv.tr), o = t[0] === v ? [t[0], t[1]] : [t[1], t[0]];
      var T = S.trains[mv.tr], e = { e: 'play', p: p, id: mv.id, t: o, tr: mv.tr };
      if (!T.t.length) { if (mv.tr === p) e.first = 1; if (mv.tr === mex(S)) { e.mex = 1; if (!S.hl.mex) S.hl.mex = { p: p, round: S.round }; } }
      T.t.push(o);
      S.seq++;
      S.pl += (S.pl ? ' ' : '') + p + hx(o[0]) + hx(o[1]) + (mv.tr === mex(S) ? 'm' : String.fromCharCode(97 + mv.tr));
      if (mv.tr === p && T.m) { T.m = false; e.off = 1; }
      if (S.dbl && S.dbl.tr === mv.tr && !isDbl(o)) {
        e.cover = 1; e.coverOf = S.dbl.p; e.waited = S.seq - S.dbl.at;
        S.hl.covers[p] = (S.hl.covers[p] || 0) + 1;
        S.dbl = null;
      }
      var wasNeed = S.tn.need;
      S.tn.n++;
      if (mv.tr === p && S.tn.run) S.tn.on = true;
      if (isDbl(o)) {
        e.dbl = 1;
        S.tn.need = true; S.tn.drew = false;   // (a double: play again, with a draw of your own if nothing fits)
        if (S.o.dbl === 'cover') S.dbl = { tr: mv.tr, p: p, at: S.seq };
      } else S.tn.need = false;
      if (wasNeed && !isDbl(o)) e.after = 1;
      // a train of your own grows: the longest of the game
      if (mv.tr === p && (!S.hl.long || T.t.length > S.hl.long.n)) S.hl.long = { p: p, n: T.t.length, round: S.round };
      ev.push(e);
      if (!h.length) { ev = ev.concat(endRound(S, 'out', p)); return ev; }
      // the turn goes on after a double, and in a first-turn run while something still fits your own train
      if (S.tn.need) return ev;
      if (S.tn.on) {
        if (legal(S, p).length) return ev;
        ev.push({ e: 'runEnd', p: p, n: S.tn.n });
      }
      return ev.concat(endTurn(S));
    }
    if (mv.k === 'draw') {
      if (!canDraw(S)) return null;
      var d = S.bone.pop(); S.hands[p].push(d); S.tn.drew = true;
      S.pl += (S.pl ? ' ' : '') + p + 'd';
      return [{ e: 'draw', p: p, id: tid(d), fits: legal(S, p).length ? 1 : 0 }];
    }
    if (mv.k === 'pass') {
      if (!canPass(S)) return null;
      var me = S.trains[p], on = !me.m;
      me.m = true;
      S.pl += (S.pl ? ' ' : '') + p + 'x';
      ev.push({ e: 'pass', p: p, on: on ? 1 : 0, owed: S.dbl ? 1 : 0 });
      if (!S.bone.length && !anyoneCan(S)) { ev.push({ e: 'block' }); return ev.concat(endRound(S, 'block', -1)); }
      return ev.concat(endTurn(S));
    }
    if (mv.k === 'done') {
      if (!canDone(S)) return null;
      ev.push({ e: 'runEnd', p: p, n: S.tn.n, chose: 1 });
      return ev.concat(endTurn(S));
    }
    return null;
  }
  function hx(v) { return v.toString(13); }
  function endTurn(S) {
    var p = S.cur;
    if (S.tn.run) {
      S.first[p] = true;
      if (S.tn.on && S.tn.n >= 2 && (!S.hl.run || S.tn.n > S.hl.run.n)) S.hl.run = { p: p, n: S.tn.n, round: S.round };
    }
    S.cur = (p + 1) % S.n;
    newTurn(S);
    // nobody can move and the boneyard is empty: blocked (also caught at a pass, this is the check after a play)
    if (!S.bone.length && !anyoneCan(S)) return [{ e: 'block' }].concat(endRound(S, 'block', -1));
    return [{ e: 'turn', p: S.cur }];
  }
  function endRound(S, k, w) {
    var pips = S.hands.map(handDots), ev = [];
    if (k === 'block') { var lo = Math.min.apply(null, pips), lows = []; pips.forEach(function (x, i) { if (x === lo) lows.push(i); }); w = lows.length === 1 ? lows[0] : -1; }
    var res = { k: k, w: w, pips: pips, eng: S.eng, round: S.round };
    // the double blank left in a hand: caught
    S.hands.forEach(function (h, i) { if (h.some(function (t) { return t[0] === 0 && t[1] === 0; })) { res.blank = i; S.hl.blank.push({ p: i, round: S.round }); } });
    if (k === 'out') {
      S.hl.outs[w] = (S.hl.outs[w] || 0) + 1;
      if (S.o.first === 'run' && !S.first[w]) { res.firstOut = 1; S.hl.first1.push({ p: w, round: S.round }); }
    }
    pips.forEach(function (x, i) {
      S.scores[i] += x;
      if (x === 0) S.hl.zero[i] = (S.hl.zero[i] || 0) + 1;
      if (!S.hl.bigLoss || x > S.hl.bigLoss.n) S.hl.bigLoss = { p: i, n: x, round: S.round };
    });
    S.rr.push(pips.slice()); S.ro.push({ k: k, w: w });
    S.prev = { round: S.round, eng: S.eng, trains: clone(S.trains), hands: clone(S.hands), res: res, pl: S.pl, scores: S.scores.slice() };
    ev.push({ e: 'round', res: res });
    if (S.round + 1 >= S.R) { S.phase = 'over'; S.dbl = null; ev.push({ e: 'over' }); return ev; }
    S.round++;
    deal(S);
    ev.push({ e: 'deal', round: S.round, eng: S.eng, p: S.cur });
    return ev;
  }
  // the seats in order of their totals, lowest first
  function standings(S) {
    return S.scores.map(function (x, i) { return { p: i, s: x }; }).sort(function (a, b) { return a.s - b.s || a.p - b.p; });
  }
  function winners(S) { var lo = Math.min.apply(null, S.scores), w = []; S.scores.forEach(function (x, i) { if (x === lo) w.push(i); }); return w; }

  // ═════════════════════════════════════════════════════════════════════════
  // The computer players. Easy, Normal and Hard differ in skill, never in cheating: each sees its own hand, the
  // trains, the markers and how many tiles the others hold, as a person at the table would.
  //   Easy plays any tile that fits, but a little more than half the time it looks for the sensible play: its own
  //   train when its marker is out, a double only with a tile to follow it, a heavier tile before a lighter one.
  //   Normal gets rid of its heavy tiles, closes its own train when its marker is out, covers doubles it can follow.
  //   Hard plans the longest train it can build from its hand on its own train and keeps those tiles for it; it plays
  //   the tiles that aren't part of that plan on the Mexican Train and the open trains first, heaviest first, plays a
  //   double only when it holds a tile to follow it, and dumps its heaviest tiles anywhere once someone is about to go out.
  // ═════════════════════════════════════════════════════════════════════════
  function lvOf(S, p) { var l = S.players[p].level; return l === 'easy' || l === 'hard' ? l : 'normal'; }
  // the longest chain from value v through hand h (doubles count as tiles): [tile, ...] in order of play
  function chain(h, v, budget) {
    var best = [], bestDots = -1, used = [], path = [], calls = 0;
    budget = budget || 20000;
    function go(x) {
      if (++calls > budget) return;
      var any = false;
      for (var i = 0; i < h.length; i++) {
        if (used[i]) continue;
        var t = h[i]; if (t[0] !== x && t[1] !== x) continue;
        any = true; used[i] = 1; path.push(t);
        go(t[0] === x ? t[1] : t[0]);
        path.pop(); used[i] = 0;
      }
      if (!any) {
        var d = path.reduce(function (s, t) { return s + dots(t); }, 0);
        if (path.length > best.length || (path.length === best.length && d > bestDots)) { best = path.slice(); bestDots = d; }
      }
    }
    go(v);
    return best;
  }
  // the robot's next move: {k, id, tr}
  function botMove(S, p) {
    if (p == null) p = S.cur;
    var ms = legal(S, p), lv = lvOf(S, p);
    if (!ms.length) return canDone(S) ? { k: 'done' } : canDraw(S) ? { k: 'draw' } : { k: 'pass' };
    if (lv === 'easy') {
      if (canDone(S) && Math.random() < EZ.stop) return { k: 'done' };
      var m = easyPick(S, p, ms);
      return { k: 'play', id: m.id, tr: m.tr };
    }
    var c = lv === 'hard' ? hardPick(S, p, ms) : normalPick(S, p, ms);
    return c ? { k: 'play', id: c.id, tr: c.tr } : { k: 'done' };
  }
  // Easy: any tile that fits, but a little more than half the time it looks first: its own train when its
  // marker is out, a double it holds a tile to follow, a heavy tile to get rid of.
  // (sense: how often it looks; heavy and noise weigh the look. Measured with scripts/mexicantrain-sim.js: about 1 match
  // in 5 won against Normal head to head, 1 in 16 against Hard.)
  var EZ = { stop: 0.4, sense: 0.6, heavy: 0.3, noise: 10 };
  function easyPick(S, p, ms) {
    if (Math.random() >= EZ.sense) return ms[Math.floor(Math.random() * ms.length)];
    var h = S.hands[p], own = S.trains[p], best = null, bs = -1e9;
    ms.forEach(function (m) {
      var t = m.t, s = dots(t) * EZ.heavy + Math.random() * EZ.noise;
      if (m.tr === p) s += own.m ? 6 : 2;
      if (isDbl(t)) s += holds(h, t[0], m.id) ? 3 : -5;
      if (s > bs) { bs = s; best = m; }
    });
    return best;
  }
  function others(S, p) { var o = []; for (var q = 0; q < S.n; q++) if (q !== p) o.push(q); return o; }
  function danger(S, p) { return others(S, p).some(function (q) { return S.hands[q].length <= 2; }); }
  function holds(h, v, not) { return h.some(function (t) { return tid(t) !== not && (t[0] === v || t[1] === v); }); }
  function normalPick(S, p, ms) {
    var h = S.hands[p], own = S.trains[p], best = null, bs = -1e9, endgame = danger(S, p);
    ms.forEach(function (m) {
      var t = m.t, s = dots(t) * (endgame ? 1.6 : 1), out = t[0] === endOf(S, m.tr) ? t[1] : t[0];
      if (m.tr === p) { s += own.m ? 9 : 2; if (S.tn.on) s += 4; }
      if (isDbl(t)) s += holds(h, t[0], m.id) ? 5 : -7;
      // keep a tile to follow on your own train when you can
      if (m.tr !== p && !holds(h.filter(function (x) { return tid(x) !== m.id; }), endOf(S, p))) s -= 3;
      if (m.tr === p && holds(h.filter(function (x) { return tid(x) !== m.id; }), out)) s += 2;
      s += Math.random() * 1.2;
      if (s > bs) { bs = s; best = m; }
    });
    // in a first-turn run Normal keeps laying while something fits its own train
    if (S.tn.on && best && best.tr !== p) return null;
    return best;
  }
  function hardPick(S, p, ms) {
    var h = S.hands[p], own = S.trains[p], plan = chain(h, endOf(S, p)), inPlan = {};
    plan.forEach(function (t) { inPlan[tid(t)] = 1; });
    var endgame = danger(S, p), owed = S.dbl && S.o.dbl === 'cover';
    function rest(m) { return h.filter(function (x) { return tid(x) !== m.id; }); }
    var best = null, bs = -1e9;
    ms.forEach(function (m) {
      var t = m.t, d = dots(t), s = 0, v = endOf(S, m.tr), out = t[0] === v ? t[1] : t[0];
      if (owed) {
        // covering: give up a spare tile before one from the plan, the heavier the better
        s = (inPlan[m.id] ? 0 : 30) + d;
      } else if (endgame) {
        s = d * 3 + (m.tr === p && own.m ? 12 : 0) + (inPlan[m.id] && m.tr === p && plan[0] && tid(plan[0]) === m.id ? 4 : 0);
      } else if (m.tr === p) {
        // the plan's next tile on my own train; first of all when my marker is out (others can dump on me)
        s = plan.length && tid(plan[0]) === m.id ? 40 + (own.m ? 40 : 0) + d * 0.5 : inPlan[m.id] ? 8 : 18 + d;
        if (S.tn.on) s += 50;   // (a first-turn run lays the whole plan)
      } else {
        // a spare tile on the Mexican Train or an open train: heaviest first
        s = inPlan[m.id] ? -20 + d * 0.2 : 30 + d * 1.5;
        if (own.m && plan.length) s -= 25;   // (close my own train first)
      }
      if (isDbl(t) && !owed) {
        // a double plays again: only when I can follow it myself (with a tile that isn't needed elsewhere)
        var r = rest(m), follow = r.some(function (x) { return x[0] === out || x[1] === out; });
        s += follow ? 14 : -30;
      }
      // don't hand the next player an easy cover on a double I'm about to leave open... and keep an end I can play
      if (m.tr !== p && !owed && !holds(rest(m), endOf(S, p)) && !plan.length) s -= 2;
      s += Math.random() * 0.5;
      if (s > bs) { bs = s; best = m; }
    });
    if (S.tn.on && best && best.tr !== p) return null;
    return best;
  }

  // ═════════════════════════════════════════════════════════════════════════
  // History: what the record keeps (small: no arrays inside arrays)
  // ═════════════════════════════════════════════════════════════════════════
  function enc(t) { return hx(t[0]) + hx(t[1]); }
  function detail(S) {
    var P = S.prev || { trains: S.trains, hands: S.hands, eng: S.eng, round: S.round, res: null, pl: S.pl };
    return {
      v: 'mexican', R: S.R, rp: S.rr.length, o: (S.o.first === 'run' ? 'r' : 'o') + (S.o.dbl === 'open' ? 'o' : 'c'),
      // the last round: its engine, every train (tiles as two base-13 digits each, outward) with its marker, what was left
      e: P.eng, tr: P.trains.map(function (T) { return T.t.map(enc).join(''); }), mk: P.trains.map(function (T) { return T.m ? 1 : 0; }).join(''),
      hd: P.hands.map(function (h) { return h.map(enc).join(''); }),
      k: P.res ? P.res.k : '', w: P.res ? P.res.w : -1,
      // each round: how it ended ('o' + seat went out, 'b' blocked)
      ro: S.ro.map(function (r) { return r.k === 'out' ? 'o' + r.w : 'b'; }).join(' '),
      pl: P.pl && P.pl.length < 2000 ? P.pl : undefined
    };
  }

  var API = {
    TOP: TOP, NUMW: NUMW, newGame: newGame, deal: deal, legal: legal, targets: targets, endOf: endOf, canDraw: canDraw, canPass: canPass,
    canDone: canDone, apply: apply, botMove: botMove, chain: chain, standings: standings, winners: winners, detail: detail,
    tid: tid, fromId: fromId, isDbl: isDbl, dots: dots, handDots: handDots, tname: tname, perHand: perHand, opts: opts, clone: clone, mex: mex,
    sortHand: sortHand, fullSet: fullSet
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.MTCore = API;
})(typeof window !== 'undefined' ? window : this);
