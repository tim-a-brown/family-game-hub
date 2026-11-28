// Hive Mind's rules (games/mindmeld.html; the ids, files and keys still say mindmeld). Plain JSON state, no page:
// the page, the online host and Node (scripts/hivemind-sim.js) all run this.
//
// Hive Mind is published by Calliope Games and used with permission (CLAUDE.md, Hive Mind). The rules as built:
//  - The hive has six levels. With 3 or 4 bees a gate closes it after level 4, with 5 or 6 after level 5, and with 7
//    or more all six levels are open (depthFor). Every bee starts on the top level.
//  - Each round one player asks (it goes round the table): they choose one of two question cards and roll the Queen
//    Bee die (faces 1, 1, 2, 2, 3, 3: DIE). Everyone writes as many answers as the card asks for.
//  - Each answer scores 1 point for every player who wrote it, you included (a lone answer scores 1). Writing the same
//    thing twice counts once.
//  - The hive shake: the die's number of lowest scorers move down a level (with 3 bees a 3 counts as 2; players tied at
//    the cut all move), then every player with the highest score moves up a level (never above the top). If every
//    score is the same nobody moves. A bee that moves down past the gate leaves the hive.
//  - The game ends when one or more bees leave the hive in a shake; everyone still in the hive wins.
(function (root) {
  'use strict';
  var DATA = [];
  var DIE = [1, 1, 2, 2, 3, 3];
  function setData(d) { DATA = d || []; aliasCache = {}; }

  // ── Matching answers ──────────────────────────────────────────────────────
  // Two answers are the same when they read the same after: lower case, accents and punctuation gone, a leading
  // a/an/the dropped, simple plurals made singular (and "-ie" spelled "-y", so cookie and cookies meet), spaces
  // ignored (hot dog, hotdog), and the card's own list of other ways to say each answer.
  function sing(w) {
    if (w.length <= 3 || /\d/.test(w)) return w;
    if (/ies$/.test(w) && w.length > 4) return w.slice(0, -3) + 'y';
    if (/ie$/.test(w)) return w.slice(0, -2) + 'y';
    if (/(ches|shes|sses|xes|zzes)$/.test(w)) return w.slice(0, -2);
    if (/oes$/.test(w) && w.length > 5) return w.slice(0, -2);
    if (/(ss|us|is)$/.test(w)) return w;
    if (/s$/.test(w)) return w.slice(0, -1);
    return w;
  }
  function norm(s) {
    s = String(s || '').toLowerCase();
    try { s = s.normalize('NFD').replace(/[̀-ͯ]/g, ''); } catch (e) {}
    s = s.replace(/&/g, ' and ').replace(/['‘’`]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
    s = s.replace(/^(a|an|the|some)\s+/, '');
    return s.split(' ').filter(Boolean).map(sing).join(' ');
  }
  var aliasCache = {};
  function aliasMap(pi) {
    if (aliasCache[pi]) return aliasCache[pi];
    var m = {}, P = DATA[pi];
    function put(s, key) { var n = norm(s); if (!n) return; if (!m[n]) m[n] = key; var c = n.replace(/ /g, ''); if (!m[c]) m[c] = key; }
    if (P) {
      P.a.forEach(function (r) { put(r[0], norm(r[0]).replace(/ /g, '')); });        // every answer is its own first
      P.a.forEach(function (r) { var key = norm(r[0]).replace(/ /g, ''); r.slice(2).forEach(function (s) { put(s, key); }); });
    }
    return (aliasCache[pi] = m);
  }
  function keyOf(pi, t) { var n = norm(t), m = aliasMap(pi); if (!n) return ''; return m[n] || m[n.replace(/ /g, '')] || n.replace(/ /g, ''); }
  function cap(s) { s = String(s || '').trim(); return s.charAt(0).toUpperCase() + s.slice(1); }

  // ── Computer players ──────────────────────────────────────────────────────
  // They draw from the card's answers by how often people give them (each robot a little more or less ordinary),
  // now and then pick something off the wall, and sometimes write it another way ("bbq" for barbecue).
  function cpuWrite(pi, n, temp, rnd) {
    rnd = rnd || Math.random;
    var P = DATA[pi]; if (!P) return [];
    var pool = P.a.map(function (r, k) { return { k: k, w: Math.pow(r[1], temp || 1) }; }), out = [];
    for (var s = 0; s < n && pool.length; s++) {
      var pick = null;
      if (rnd() < 0.1) pick = pool[Math.floor(rnd() * pool.length)];
      else {
        var tot = 0; pool.forEach(function (x) { tot += x.w; });
        var x = rnd() * tot; for (var j = 0; j < pool.length; j++) { x -= pool[j].w; if (x <= 0) { pick = pool[j]; break; } }
        pick = pick || pool[pool.length - 1];
      }
      pool.splice(pool.indexOf(pick), 1);
      var r = P.a[pick.k], alts = r.slice(2), t = r[0];
      if (alts.length && rnd() < 0.3) t = alts[Math.floor(rnd() * alts.length)];
      out.push(rnd() < 0.6 ? cap(t) : t);
    }
    return out;
  }

  // ── The stacks: matching slips together, the biggest first ───────────────
  function buildItems(g) {
    g.items = [];
    g.players.forEach(function (p, k) { (g.ans[k] || []).forEach(function (t, i) { if (t) g.items.push({ p: k, i: i, t: t, g: keyOf(g.pi, t) || ('#' + k + '.' + i) }); }); });
  }
  function groupsOf(items) {
    var map = {}, list = [];
    (items || []).forEach(function (it, k) {
      var s = map[it.g]; if (!s) { s = map[it.g] = { id: it.g, items: [], ps: [], first: k }; list.push(s); }
      s.items.push(it); if (s.ps.indexOf(it.p) < 0) s.ps.push(it.p);
    });
    list.sort(function (a, b) { return b.ps.length - a.ps.length || a.first - b.first; });
    return list;
  }
  // a stack reads as the way most people wrote it (and in capitals if anyone wrote it that way: USA, New York)
  function label(s) {
    var c = {}, form = {}, best = null;
    s.items.forEach(function (it) {
      var t = it.t.trim(), k = t.toLowerCase(); c[k] = (c[k] || 0) + 1;
      if (!form[k] || (t.slice(1) !== t.slice(1).toLowerCase() && form[k].slice(1) === form[k].slice(1).toLowerCase())) form[k] = t;
      if (!best || c[k] > c[best]) best = k;
    });
    return best ? cap(form[best]) : '';
  }

  // ── The hive ──────────────────────────────────────────────────────────────
  var LEVELS = 6;
  function depthFor(n) { return n <= 4 ? 4 : n <= 6 ? 5 : 6; }
  // the bees that play this round: in the hive and at the table
  function live(g) { var o = []; g.players.forEach(function (p, i) { if (!p.gone && !p.out) o.push(i); }); return o; }
  // each answer scores 1 point for every player who wrote it, you included (once per stack)
  function roundPts(g) {
    var pts = g.players.map(function () { return 0; }), on = live(g);
    groupsOf(g.items).forEach(function (s) {
      var ps = s.ps.filter(function (p) { return on.indexOf(p) >= 0; });
      ps.forEach(function (p) { pts[p] += ps.length; });
    });
    return pts;
  }
  // The hive shake: who moves where after a round (nothing is changed here; see doShake)
  function shakePlan(g, pts, roll) {
    var on = live(g), n = Math.min(roll, on.length === 3 ? 2 : roll, Math.max(1, on.length - 1));
    var sc = on.map(function (i) { return pts[i]; }), lo = Math.min.apply(null, sc), hi = Math.max.apply(null, sc);
    var down = [], up = [];
    if (on.length >= 2 && lo !== hi) {
      var sorted = on.slice().sort(function (a, b) { return pts[a] - pts[b]; }), cut = pts[sorted[n - 1]];
      // (a tie at the cut moves everyone tied, but never the highest score: then only those under it move)
      down = on.filter(function (i) { return cut === hi ? pts[i] < hi : pts[i] <= cut; });
      up = on.filter(function (i) { return pts[i] === hi && down.indexOf(i) < 0; });
    }
    var mv = [];
    on.forEach(function (i) {
      var from = g.players[i].lv, to = from;
      if (down.indexOf(i) >= 0) to = from + 1; else if (up.indexOf(i) >= 0) to = Math.max(0, from - 1);
      if (to !== from) mv.push([i, from, to]);
    });
    return { n: n, down: down, up: up, mv: mv, out: mv.filter(function (m) { return m[2] >= g.depth; }).map(function (m) { return m[0]; }) };
  }

  // ── The game ──────────────────────────────────────────────────────────────
  // G = {v: 2, hm: 1, mode, timer, depth, round, ask (who asks this round), offer: [two prompt indices], roll (die face),
  //      players: [{name, color, cpu, pid, dev, lv (0 the top level), out, score (points over the game), temp, gone}],
  //      used: [prompt indices dealt], pi, phase: ask|write|reveal|scored|over, ans, items, pts, shake,
  //      log: [{q, pts, top: [{t, c}], roll, ask, mv: [[p, from, to]]}], deadline, cpuAt, started, sid}
  function newGame(cfg, deck) {
    var g = { v: 2, hm: 1, mode: cfg.mode, timer: cfg.timer || 0, round: 0, log: [], started: Date.now(), sid: 0,
      players: cfg.players.map(function (p) { return { name: p.name, color: p.color, cpu: !!p.cpu, pid: p.pid, dev: p.dev || undefined, lv: 0, score: 0, temp: p.cpu ? 0.7 + (cfg.rnd || Math.random)() * 0.45 : 1 }; }),
      deck: deck.slice(), used: [], ask: -1 };
    g.depth = depthFor(g.players.length);
    g.qs = g.deck.map(function (i) { return DATA[i] ? DATA[i].q : ''; });
    startRound(g);
    return g;
  }
  function nextAsker(g) {
    var n = g.players.length;
    for (var k = 1; k <= n; k++) { var i = (g.ask + k + n) % n, p = g.players[i]; if (p && !p.gone && !p.out) return i; }
    return Math.max(0, g.ask);
  }
  function startRound(g) {
    g.round++; g.phase = 'ask'; g.ask = nextAsker(g);
    // two cards to choose from, the first ones in the deck not yet dealt (a short deck starts over)
    if (g.deck.length < 2) g.deck = g.deck.concat(g.used.splice(0));
    g.offer = [g.deck.shift(), g.deck.shift()];
    g.pi = g.offer[0]; g.roll = null;
    g.ans = g.players.map(function () { return null; });
    g.items = null; g.pts = null; g.shake = null; g.deadline = 0;
  }
  function beginWrite(g, now, rnd) {
    rnd = rnd || Math.random; now = now || Date.now();
    g.phase = 'write';
    g.deadline = g.timer && g.mode !== 'pass' ? now + g.timer * 1000 : 0;
    // when each robot finishes writing (pass and play: right away, their slips drop in one by one)
    var hi = g.timer ? Math.max(5000, Math.min(16000, g.timer * 1000 - 5000)) : 16000, k = 0;
    g.cpuAt = g.players.map(function (p) { return !p.cpu || p.out ? 0 : g.mode === 'pass' ? now + 900 + (k++) * 380 : now + 3500 + rnd() * (hi - 3500); });
  }
  function prompt(g) { return DATA[g.pi] || { q: '', n: 1, a: [] }; }
  function allIn(g) { return live(g).every(function (i) { return !!g.ans[i]; }); }
  function humansIn(g) { return live(g).every(function (i) { return g.players[i].cpu || !!g.ans[i]; }); }
  // one move of the game; who is the player making it (-1: the device running the game). Returns whether it was allowed.
  function apply(g, who, a, rnd) {
    if (!g || !a) return false;
    if (a.t === 'pick') {
      if (g.phase !== 'ask' || (who >= 0 && who !== g.ask)) return false;
      var c = a.c === 1 ? 1 : 0;
      g.pi = g.offer[c]; g.used.push(g.pi); g.deck.push(g.offer[1 - c]);   // (the card not chosen goes to the bottom of the deck)
      g.roll = a.f != null && a.f >= 0 && a.f < DIE.length ? a.f : Math.floor((rnd || Math.random)() * DIE.length);
      beginWrite(g, a.now, rnd);
      return true;
    }
    if (a.t === 'ans') {
      if (g.phase !== 'write' || who < 0 || !g.players[who] || g.ans[who] || g.players[who].out) return false;
      var n = prompt(g).n, list = (Array.isArray(a.a) ? a.a : []).slice(0, n).map(function (s) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, 40); });
      while (list.length < n) list.push('');
      g.ans[who] = list;
      return true;
    }
    if (a.t === 'reveal') {
      if (g.phase !== 'write') return false;
      g.players.forEach(function (p, k) { if (!g.ans[k]) g.ans[k] = []; });
      buildItems(g); g.phase = 'reveal'; g.deadline = 0;
      return true;
    }
    if (a.t === 'merge') {
      if (g.phase !== 'reveal' || !a.a || a.a === a.b) return false;
      var hit = false; g.items.forEach(function (it) { if (it.g === a.a) { it.g = a.b; hit = true; } });
      return hit && g.items.some(function (it) { return it.g === a.b; });
    }
    if (a.t === 'split') {
      if (g.phase !== 'reveal') return false;
      var it = g.items.filter(function (x) { return x.p === a.p && x.i === a.i; })[0];
      if (!it || g.items.filter(function (x) { return x.g === it.g; }).length < 2) return false;
      it.g = '#' + it.p + '.' + it.i + '.' + (++g.sid);
      return true;
    }
    if (a.t === 'score') {
      if (g.phase !== 'reveal') return false;
      var pts = roundPts(g); g.pts = pts;
      pts.forEach(function (v, k) { g.players[k].score += v; });
      var sh = shakePlan(g, pts, DIE[g.roll] || 1);
      sh.mv.forEach(function (m) { var P = g.players[m[0]]; P.lv = Math.min(m[2], g.depth); if (m[2] >= g.depth) P.out = g.round; });
      g.shake = sh;
      g.log.push({ q: prompt(g).q, pts: pts.slice(), roll: DIE[g.roll] || 1, ask: g.ask, mv: sh.mv,
        top: groupsOf(g.items).filter(function (s) { return s.ps.length > 1; }).slice(0, 3).map(function (s) { return { t: label(s), c: s.ps.length }; }) });
      g.phase = 'scored';
      return true;
    }
    if (a.t === 'next') {
      if (g.phase !== 'scored') return false;
      if (g.players.some(function (p) { return p.out; })) g.phase = 'over'; else startRound(g);
      return true;
    }
    return false;
  }
  // a bee who joins once the game is under way comes in where most of the hive is
  function joinLevel(g) {
    var on = live(g).map(function (i) { return g.players[i].lv; }).sort(function (a, b) { return a - b; });
    return on.length ? on[Math.floor((on.length - 1) / 2)] : 0;
  }
  function winners(g) { var o = []; g.players.forEach(function (p, i) { if (!p.out) o.push(i); }); return o; }

  var api = { DIE: DIE, LEVELS: LEVELS, setData: setData, data: function () { return DATA; }, norm: norm, keyOf: keyOf, cap: cap, cpuWrite: cpuWrite,
    buildItems: buildItems, groupsOf: groupsOf, label: label, depthFor: depthFor, live: live, roundPts: roundPts, shakePlan: shakePlan,
    newGame: newGame, startRound: startRound, beginWrite: beginWrite, prompt: prompt, allIn: allIn, humansIn: humansIn, apply: apply,
    joinLevel: joinLevel, winners: winners };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.HiveCore = api;
})(this);
