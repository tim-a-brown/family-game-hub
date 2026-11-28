// Hive Mind's rules (games/mindmeld.html; the ids, files and keys still say mindmeld). Plain JSON state, no page:
// the page, the online host and Node (scripts/hivemind-sim.js) all run this.
//
// Hive Mind was designed by Richard Garfield and is published by Calliope Games; used with permission (CLAUDE.md,
// Hive Mind). The rules are the rulebook's (Tim's photos of it, 2026-11-28):
//  - The board is double-sided: a 6-level side for a speedier game and an 8-level side for a longer one (cfg.levels).
//    Every Mind pawn starts at the top of the Hive. The person who thought to play goes first (seat 0); the turn then
//    passes to the left.
//  - The active player rolls the die (faces in DIE: one, two or three dots, or a star), then draws a card and chooses
//    one of the three questions on its front, or makes up their own. Everyone writes their responses (2 minutes).
//  - Scoring: 1 point for each response you wrote, plus 1 for each other player who wrote a matching response. You
//    can't get the same matches on more than one reference within an answer: of two of your responses in one stack,
//    only one counts the matches; the other still scores its automatic point.
//  - Moving the pawns: with one, two or three dots, every player whose score total is among the single, two or three
//    lowest totals moves down one level (with three players a three counts as two). With the star, the players with
//    the single lowest total move down, then the players with the highest total move up one level (never past the top).
//    Nobody moves up except on the star.
//  - As soon as one or more pawns exit the board, the game ends and everyone still on the board wins. If every pawn
//    exits at once, everyone wins together.
(function (root) {
  'use strict';
  var DATA = [], CARDS = [];
  // the die's six faces (1, 2, 3 dots, or 's' the star), in the order they sit on Tim's own die (confirmed from his box,
  // 2026-11-28: two ones, two twos, one three, one star)
  var DIE = [1, 2, 3, 's', 1, 2];
  // the cards: each holds three questions (indices into DATA)
  function setData(d, cards) {
    DATA = d || []; aliasCache = {};
    CARDS = cards || [];
    if (!CARDS.length) for (var i = 0; i + 2 < DATA.length; i += 3) CARDS.push([i, i + 1, i + 2]);
  }

  // ── Matching answers ──────────────────────────────────────────────────────
  // "What you are referring to is important, not how you refer to it": two responses are the same when they read the
  // same after lower case, accents and punctuation go, a leading a/an/the is dropped, plurals are made singular
  // ("plurality doesn't matter": cookie and cookies meet), spaces are ignored (hot dog, hotdog), and the card's own list
  // of other ways to say each answer. Nothing more general is ever matched with something less general (beagle, dog).
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
  // A question a person made up has no list of answers: the computer players think along with the people at the table
  // (each response, about half the time, is one a person wrote) and otherwise write a thing of their own.
  var OWN = ['Pizza', 'Dogs', 'Music', 'Coffee', 'The beach', 'Ice cream', 'Money', 'Sleep', 'Family', 'Friends', 'Cats', 'Summer', 'Books', 'Movies',
    'Chocolate', 'Soccer', 'Rain', 'Pancakes', 'Grandma', 'Tacos', 'The moon', 'Bubbles', 'Shoes', 'Cake', 'Socks', 'Trains', 'A hug', 'Pajamas'];
  function cpuOwn(g, k, rnd) {
    rnd = rnd || Math.random;
    var n = prompt(g).n, pool = [], out = [];
    g.players.forEach(function (p, i) { if (!p.cpu && g.ans[i]) g.ans[i].forEach(function (t) { if (t && pool.indexOf(t) < 0) pool.push(t); }); });
    var skill = 0.35 + 0.3 * Math.min(1, Math.max(0, 1.15 - (g.players[k].temp || 1)) / 0.45);
    for (var s = 0; s < n; s++) {
      if (pool.length && rnd() < skill) out.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
      else out.push(OWN[Math.floor(rnd() * OWN.length)]);
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

  // ── The board ─────────────────────────────────────────────────────────────
  function live(g) { var o = []; g.players.forEach(function (p, i) { if (!p.gone && !p.out) o.push(i); }); return o; }
  // 1 point for each response written, plus 1 for each other player who wrote a matching one; of one player's two
  // responses in one stack, only one counts the matches (the rest keep their automatic point)
  function roundPts(g) {
    var pts = g.players.map(function () { return 0; }), on = live(g);
    groupsOf(g.items).forEach(function (s) {
      var ps = s.ps.filter(function (p) { return on.indexOf(p) >= 0; });
      s.items.forEach(function (it) { if (on.indexOf(it.p) >= 0) pts[it.p] += 1; });
      ps.forEach(function (p) { pts[p] += ps.length - 1; });
    });
    return pts;
  }
  // Moving the pawns (nothing is changed here; see apply's score)
  function face(f) { return DIE[f]; }
  function shakePlan(g, pts, fc) {
    var on = live(g), star = fc === 's', n = star ? 1 : +fc;
    if (on.length === 3 && n === 3) n = 2;
    var vals = []; on.forEach(function (i) { if (vals.indexOf(pts[i]) < 0) vals.push(pts[i]); });
    vals.sort(function (a, b) { return a - b; });
    var low = vals.slice(0, n), hi = vals[vals.length - 1];
    var down = on.filter(function (i) { return low.indexOf(pts[i]) >= 0; });
    var up = star ? on.filter(function (i) { return pts[i] === hi; }) : [];
    var mv = [];
    on.forEach(function (i) {
      var from = g.players[i].lv, to = from;
      if (down.indexOf(i) >= 0) to = from + 1;
      if (to < g.depth && up.indexOf(i) >= 0) to = Math.max(0, to - 1);   // (a pawn that has left the board stays off it)
      if (to !== from) mv.push([i, from, to]);
    });
    return { n: n, star: star, down: down, up: up, mv: mv, out: mv.filter(function (m) { return m[2] >= g.depth; }).map(function (m) { return m[0]; }) };
  }

  // ── The game ──────────────────────────────────────────────────────────────
  // G = {v: 3, hm: 2, mode, timer, depth (6 or 8), round, ask (the active player), roll (index into DIE, or null),
  //      card (index into CARDS), pi (the question's index into DATA, -1 for one made up), own ({q, n} made up),
  //      players: [{name, color, cpu, pid, dev, lv (0 the top level), out (round it exited), score (points over the
  //      game), temp, gone}], deck: [card indices], phase: roll|ask|write|reveal|scored|over, ans, items, pts, shake,
  //      log: [{q, pts, top: [{t, c}], roll (the face), ask, mv: [[p, from, to]]}], deadline, cpuAt, started, sid}
  function newGame(cfg, deck) {
    var rnd = cfg.rnd || Math.random;
    var g = { v: 3, hm: 2, mode: cfg.mode, timer: cfg.timer || 0, depth: cfg.levels === 8 ? 8 : 6, round: 0, log: [], started: Date.now(), sid: 0,
      players: cfg.players.map(function (p) { return { name: p.name, color: p.color, cpu: !!p.cpu, pid: p.pid, dev: p.dev || undefined, lv: 0, score: 0, temp: p.cpu ? 0.7 + rnd() * 0.45 : 1 }; }),
      deck: deck.slice(), used: [], ask: -1 };
    startRound(g);
    return g;
  }
  function nextAsker(g) {
    var n = g.players.length;
    for (var k = 1; k <= n; k++) { var i = (g.ask + k + n) % n, p = g.players[i]; if (p && !p.gone && !p.out) return i; }
    return Math.max(0, g.ask);
  }
  function startRound(g) {
    g.round++; g.phase = 'roll'; g.ask = nextAsker(g);
    g.roll = null; g.card = null; g.pi = null; g.own = null;
    g.ans = g.players.map(function () { return null; });
    g.items = null; g.pts = null; g.shake = null; g.deadline = 0;
  }
  function beginWrite(g, now, rnd) {
    rnd = rnd || Math.random; now = now || Date.now();
    g.phase = 'write';
    g.deadline = g.timer && g.mode !== 'pass' ? now + g.timer * 1000 : 0;
    // when each robot finishes writing (pass and play: right away, their slips go in one by one)
    var hi = g.timer ? Math.max(5000, Math.min(16000, g.timer * 1000 - 5000)) : 16000, k = 0;
    g.cpuAt = g.players.map(function (p) { return !p.cpu || p.out ? 0 : g.mode === 'pass' ? now + 900 + (k++) * 380 : now + 3500 + rnd() * (hi - 3500); });
  }
  function prompt(g) { return g.pi === -1 && g.own ? { q: g.own.q, n: g.own.n, a: [] } : DATA[g.pi] || { q: '', n: 1, a: [] }; }
  function cardQs(g) { return (CARDS[g.card] || []).map(function (i) { return DATA[i] || { q: '', n: 1, a: [] }; }); }
  function allIn(g) { return live(g).every(function (i) { return !!g.ans[i]; }); }
  function humansIn(g) { return live(g).every(function (i) { return g.players[i].cpu || !!g.ans[i]; }); }
  // one move of the game; who is the player making it (-1: the device running the game). Returns whether it was allowed.
  function apply(g, who, a, rnd) {
    if (!g || !a) return false;
    rnd = rnd || Math.random;
    if (a.t === 'roll') {
      if (g.phase !== 'roll' || (who >= 0 && who !== g.ask)) return false;
      g.roll = a.f != null && a.f >= 0 && a.f < DIE.length ? a.f : Math.floor(rnd() * DIE.length);
      if (!g.deck.length) g.deck = g.used.splice(0);
      g.card = g.deck.length ? g.deck.shift() : 0; g.used.push(g.card);
      g.phase = 'ask';
      return true;
    }
    if (a.t === 'pick') {
      if (g.phase !== 'ask' || (who >= 0 && who !== g.ask)) return false;
      if (a.own) {
        var q = String(a.own).replace(/\s+/g, ' ').trim().slice(0, 120); if (!q) return false;
        g.pi = -1; g.own = { q: q, n: Math.max(1, Math.min(4, +a.n || 3)) };
      } else {
        var c = CARDS[g.card] || [], k = Math.max(0, Math.min(c.length - 1, +a.c || 0));
        if (!c.length) return false;
        g.pi = c[k];
      }
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
      var sh = shakePlan(g, pts, DIE[g.roll]);
      sh.mv.forEach(function (m) { var P = g.players[m[0]]; P.lv = Math.min(m[2], g.depth); if (m[2] >= g.depth) P.out = g.round; });
      g.shake = sh;
      g.log.push({ q: prompt(g).q, pts: pts.slice(), roll: DIE[g.roll], ask: g.ask, mv: sh.mv,
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
  // a player who joins once the game is under way puts their pawn where most of the others are
  function joinLevel(g) {
    var on = live(g).map(function (i) { return g.players[i].lv; }).sort(function (a, b) { return a - b; });
    return on.length ? on[Math.floor((on.length - 1) / 2)] : 0;
  }
  function winners(g) {
    var o = []; g.players.forEach(function (p, i) { if (!p.out) o.push(i); });
    return o.length ? o : g.players.map(function (p, i) { return i; });   // (every pawn out at once: everyone wins together)
  }
  function allOut(g) { return g.players.every(function (p) { return p.out || p.gone; }) && g.players.some(function (p) { return p.out; }); }

  var api = { DIE: DIE, setData: setData, data: function () { return DATA; }, cards: function () { return CARDS; }, norm: norm, keyOf: keyOf, cap: cap,
    cpuWrite: cpuWrite, cpuOwn: cpuOwn, buildItems: buildItems, groupsOf: groupsOf, label: label, live: live, roundPts: roundPts, face: face, shakePlan: shakePlan,
    newGame: newGame, startRound: startRound, beginWrite: beginWrite, prompt: prompt, cardQs: cardQs, allIn: allIn, humansIn: humansIn, apply: apply,
    joinLevel: joinLevel, winners: winners, allOut: allOut };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.HiveCore = api;
})(this);
