'use strict';
// Wax Pack: the game page. Real baseball cards on the table; this page is the umpire, the scoreboard, the announcer
// and the record keeper. The flow: the stack (tell the app which cards are on the table), the draft (take turns
// picking from the spread), the lineups (the cards laid round a diamond), then the game: every at-bat a secret duel,
// the pitcher's pitch against what the batter looks for. The league keeps every card ever entered and its numbers.
//
// State S (saved in waxpack_state): {v, mode, level, inn, size, seed, phase: 'stack'|'draft'|'lineup'|'play'|'over',
//   C: {cardId: card in this game}, stack: [ids], T: [team, team], home, draft: {turn, first, n}, g: the game}
// A card here: {id, lid (its league id), kind ('player' or a special), pid, name, year, sy (the season it shows),
//   role 'h'|'p', pos [positions, most first], r (ratings and rates), team (nickname), tc (team code), rk, as, rb,
//   err, scout, kid, ph (photo key)}
// A team: {name, cpu, color, cards: [ids], order: [9 ids], at: {id: position}, sp (pitcher), pen, bench, hand: [{k, id, used}]}
(function () {
  var E = window.WaxEngine, C = window.WaxCards, el = Kit.el, esc = Kit.esc;
  var app = document.getElementById('app');
  var SAVE = 'waxpack_state', LKEY = 'waxpack_league', HKEY = 'sandlot';
  var FAST = (function () { try { return localStorage.getItem('waxpack_fast') === '1'; } catch (e) { return false; } })();
  function ms(t) { return FAST ? Math.min(t, 20) : t; }
  var timers = [];
  function later(fn, t) { var id = setTimeout(fn, ms(t)); timers.push(id); return id; }
  function clearTimers() { timers.forEach(clearTimeout); timers = []; }
  var S = null, R = Math.random;
  var POSN = { C: 'Catcher', '1B': 'First base', '2B': 'Second base', '3B': 'Third base', SS: 'Shortstop', LF: 'Left field', CF: 'Center field', RF: 'Right field', DH: 'Designated hitter', P: 'Pitcher' };
  var SPOTS = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH'];
  function ord(n) { var s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }
  function avg3(a) { if (a == null || !isFinite(a)) return '.000'; return a >= 1 ? a.toFixed(3) : '.' + String(Math.round(a * 1000)).padStart(3, '0'); }
  function last(n) { var p = String(n || '').trim().split(/\s+/); return p[p.length - 1]; }
  function shortName(n) { var p = String(n || '').trim().split(/\s+/); return p.length > 1 ? p[0].charAt(0) + '. ' + p[p.length - 1] : n; }

  // ── The orientation: <html data-o> says which way the screen is turned, so a turn can glide ─────────────────
  var LQ = window.matchMedia('(orientation: landscape)');
  function setO() { document.documentElement.setAttribute('data-o', LQ.matches ? 'land' : 'port'); }
  setO();
  function onTurn() { Kit.glide(function () { setO(); relayout(); }); }
  if (LQ.addEventListener) LQ.addEventListener('change', onTurn); else LQ.addListener(onTurn);
  var rzT = null; window.addEventListener('resize', function () { clearTimeout(rzT); rzT = setTimeout(relayout, 80); });

  // ── The database ─────────────────────────────────────────────────────────
  var DBP = null;
  function db() {
    if (E.db()) return Promise.resolve(E.db());
    if (!DBP) { DBP = fetch('waxpack/mlb.json').then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }).then(function (j) { return E.load(j); }); DBP.catch(function () { DBP = null; }); }
    return DBP;
  }

  // ── The league: every card ever entered, with its numbers from your games ─────────────────────────────────
  // waxpack_league = {v, n, cards: {lid: {pid, n, y, role, k (kind), rk, as, rb, err, ph, sc (scout's role), at,
  //   h: {g, ab, h, hr, rbi, bb, k, r}, p: {g, bf, outs, h, r, bb, k, w, l}}}, games}
  var L = null;
  function league() {
    if (L) return L;
    try { L = JSON.parse(localStorage.getItem(LKEY)); } catch (e) {}
    if (!L || L.v !== 1) L = { v: 1, n: 0, cards: {}, games: 0 };
    return L;
  }
  function saveLeague() { try { localStorage.setItem(LKEY, JSON.stringify(league())); } catch (e) {} }
  // The old Sandlot's remembered cards come over once (its own keys are left exactly as they were)
  function importOld() {
    var Lg = league(); if (Lg.imp) return; Lg.imp = 1;
    var old = null; try { old = JSON.parse(localStorage.getItem('sandlot_cards') || 'null'); } catch (e) {}
    if (old) Object.keys(old).forEach(function (k) {
      var rec = old[k], cy = +String(k).split('|')[1] || 0; if (!rec || !rec.name) return;
      var pl = E.find(rec.name, { year: cy, max: 1 })[0];
      if (!pl || E.name(pl).toLowerCase() !== String(rec.name).toLowerCase()) return;
      var lid = 'L' + (++Lg.n); Lg.cards[lid] = { pid: pl.id, n: E.name(pl), y: cy || 0, role: rec.role === 'p' ? 'p' : 'h', k: 'player', at: Date.now() };
    });
    saveLeague();
  }

  // ── Making a card from the database ──────────────────────────────────────
  function makeCard(o) {   // o: {pid | name, year, kind, role, rk, as, rb, err, ph, lid, scout role, team code}
    var c = { id: 'c' + (++S.cn), lid: o.lid || null, kind: o.kind || 'player', year: o.year || 0, ph: o.ph || '', rk: !!o.rk, as: !!o.as, rb: !!o.rb, err: !!o.err };
    if (S.vals === 'shoe') c.vm = 'shoe';   // Shoebox rules: the values are read off the card back (E.SHOE)
    if (c.kind !== 'player') { c.name = C.SPECIAL[c.kind].name; c.tc = o.tc || ''; c.team = o.tc ? E.nick(o.tc) : ''; return c; }
    var pl = o.pid ? E.byId(o.pid) : null;
    if (pl) {
      c.pid = pl.id; c.name = E.name(pl); c.role = o.role || E.roleOf(pl, c.year);
      var s = E.cardSeason(pl, c.role, c.year) || E.cardSeason(pl, c.role === 'p' ? 'h' : 'p', c.year);
      if (s && !E.seasons(pl, c.role).length) c.role = c.role === 'p' ? 'h' : 'p';
      c.sy = s ? s.y : c.year; c.tc = s ? s.t : ''; c.team = E.nick(c.tc);
      c.r = c.role === 'p' ? E.rateP(s) : E.rateH(s);
      c.pos = c.role === 'p' ? ['P'] : E.positionsNear(pl, c.sy);
      if (c.role === 'p') c.pos = ['P'];
      c.line = s;
    } else {
      c.name = o.name || 'Unknown'; c.role = o.role || 'h'; c.scout = true;
      c.r = E.scout(c.name, c.role); c.pos = c.role === 'p' ? ['P'] : (o.pos ? [o.pos] : []); c.team = o.team || '';
    }
    E.table(c);
    return c;
  }
  function kid(i, role) {
    var c = { id: 'c' + (++S.cn), kind: 'player', kid: true, name: 'Sandlot kid ' + i, role: role || 'h', pos: [], team: 'Sandlot', year: 0 };
    if (S.vals === 'shoe') c.vm = 'shoe';
    c.r = Object.assign({}, role === 'p' ? E.ARM : E.KID); if (role === 'p') c.pos = ['P'];
    E.table(c);
    return c;
  }
  // The numbers the table plays with: "+2" and "−1" with a real minus sign
  function sgn(v) { v = v | 0; return v > 0 ? '+' + v : v < 0 ? '\u2212' + (-v) : '0'; }
  function rr(c) { return E.table(c).r || {}; }
  // the speedster card is the one edge a runner has (the base-running rule, E.advance); a sandlot kid is never one
  function fastRunner(id) { var c = S.C[id]; return !!(c && !c.kid && rr(c).card === 'speed'); }
  // what a hitter's card is worth beyond his modifier, for the computer's picks and Best fit
  var CW = { slugger: 2, power: 1, speed: .6, patient: .4, contact: 0 };
  // a printed name too long for its plate is set condensed, as card makers did, never cut
  function fitCardNames(root) {
    (root || app).querySelectorAll('.wc-ln,.wc-fn,.wc-tm').forEach(function (n) { n.style.transform = ''; n.style.width = ''; n.style.maxWidth = ''; var w = n.parentNode.clientWidth - (n.nextElementSibling && n.nextElementSibling.classList.contains('wc-pos') ? 0 : 0), sw = n.scrollWidth, cw = n.clientWidth; if (sw > cw + 1 && cw > 0) { n.style.transform = 'scaleX(' + (cw / sw).toFixed(3) + ')'; n.style.transformOrigin = 'left center'; n.style.width = sw + 'px'; n.style.maxWidth = 'none'; } });
  }
  // the drawn card (cardface.js): one of six period designs by year, the player's own photo when he has one
  function cardFace(c, o) { o = o || {};
    var cc = Object.assign({}, c, { name: c.kid ? 'Sandlot kid' : c.name, pos: c.role === 'p' ? ['P'] : (o.at ? [o.at] : c.pos) });
    var d = WaxCard.face(cc, { photo: C.photoNow(c.ph) || undefined, pos: c.role === 'p' ? 'P' : (o.at || (c.pos && c.pos[0]) || '') }); d.classList.add('wc');
    if (c.ph && !C.photoNow(c.ph)) C.photoGet(c.ph).then(function (u) { if (u && d.isConnected) { var m = WaxCard.face(cc, { photo: u, pos: c.role === 'p' ? 'P' : (o.at || '') }); m.className = d.className; m.dataset.id = c.id; d.replaceWith(m); } });
    d.dataset.id = c.id; return d; }

  // ── Saving ───────────────────────────────────────────────────────────────
  function save() {
    if (!S) return;
    try { localStorage.setItem(SAVE, JSON.stringify(S)); } catch (e) {}
    var lab = S.phase === 'play' ? (S.g.half ? 'Bottom ' : 'Top ') + 'of the ' + ord(S.g.inn) : S.phase === 'draft' ? 'The draft' : S.phase === 'lineup' ? 'Lineups' : 'Your stack';
    if (S.phase !== 'over') Kit.resume.set(lab);
  }
  function clearSave() { try { localStorage.removeItem(SAVE); } catch (e) {} Kit.resume.clear(); }
  function load() { try { var s = JSON.parse(localStorage.getItem(SAVE)); return s && (s.v === 1 || s.v === 2 || s.v === 3) ? s : null; } catch (e) { return null; } }
  // A game saved before the d20 at-bat (v 1) plays on under it: every card gets its table numbers, and each team's
  // starter and bullpen become its three stints, the pitcher on the mound keeping the stint of this inning
  // A game saved before the milestone powers and the Shoebox rules (v 2) plays on with League labels; its cards work
  // out their powers the first time they are read (E.table)
  function upgrade(s) {
    if (s.v === 3) return s;
    if (s.v === 2) { s.vals = s.vals || 'league'; s.v = 3; return s; }
    var keep = S; S = s;
    Object.keys(s.C).forEach(function (id) { var c = s.C[id]; if (c.kind === 'player' && c.r) { delete c.r.bat; delete c.r.arm; E.table(c); } });
    if (s.T) s.T.forEach(function (T, t) {
      if (!T.sp || T.arms) return;
      var used = (T.used || []).slice(), pen = (T.pen || []).slice(), cur = s.g ? s.g.pit[t] : T.sp, arms = [null, null, null];
      var ci = s.g && s.phase === 'play' ? E.stintOf(s.g.inn, s.inn).i : 0;
      arms[ci] = cur;
      var before = [T.sp].concat(used).filter(function (x) { return x !== cur; });
      for (var i = 0; i < ci; i++) arms[i] = before.shift() || pen.shift() || null;
      for (var j = ci + 1; j < 3; j++) arms[j] = pen.shift() || null;
      for (var k = 0; k < 3; k++) if (!arms[k]) { var kd = kid(90 + k, 'p'); s.C[kd.id] = kd; arms[k] = kd.id; }
      T.arms = arms; T.pen = pen; T.sp = arms[0];
    });
    s.v = 3; s.vals = 'league'; S = keep;
    return s;
  }
  var undoStack = [];
  function snap() { if (!S) return; undoStack.push(JSON.stringify(S)); if (undoStack.length > 30) undoStack.shift(); }
  function undo() {
    if (!undoStack.length) return Kit.toast('Nothing to take back');
    clearTimers(); S = JSON.parse(undoStack.pop()); save(); render(); Kit.sfx('whoosh');
  }

  // ── Rules ────────────────────────────────────────────────────────────────
  // The Shoebox chart and the milestone powers, made from the engine's own numbers (E.shoeLines, E.powerLines), so
  // How to play and the printed page say exactly what the app does
  function shoeRules() {
    var L = E.shoeLines(), li = function (a) { return '<li><b>' + a[0] + '</b>: ' + a[1] + '</li>'; };
    return '<ul><li>Use the last season on the back of the card, the season before the card’s year.</li>' + '<li>' + L.short + '</li></ul>' +
      '<p><b>Bat, from the batting average</b></p><ul>' + L.bat.map(function (a) { return li([a[0], 'Bat ' + a[1]]); }).join('') + '</ul>' +
      '<p><b>The batter’s card, the first one that fits</b></p><ul>' + L.hit.map(li).join('') + '</ul>' +
      '<p><b>Arm, from the ERA</b></p><ul>' + L.arm.map(function (a) { return li([a[0], 'Arm ' + a[1]]); }).join('') + '</ul>' +
      '<p><b>Pitch cards</b></p><ul>' + L.pc.map(li).join('') + '</ul>' +
      '<p><b>The pitcher’s card, the first one that fits</b></p><ul>' + L.pit.map(li).join('') + '</ul>';
  }
  function powerRules() {
    return '<ul><li>A player gets one power at most, from the last season on the back of his card. A batter who earns two keeps the first of Feared slugger, Base stealer and Run producer, and a pitcher the first of Closer, Strikeout artist, 20-game winner and Workhorse.</li>' +
      E.powerLines().map(function (l) { return '<li><b>' + l[0] + '</b> (' + l[1] + '): ' + l[2] + '</li>'; }).join('') + '</ul>';
  }
  var RULES =
    '<p class="goal">Grab a stack of old baseball cards, pick teams from it, and play a game of baseball with them. The cards stay on the table. The app is the umpire, the scoreboard and the announcer.</p>' +
    '<h3>The stack</h3><ul><li>Spread 25 to 50 cards face up: any brand, any year, stars and commons mixed.</li>' +
    '<li>Tell the app who is on each card. Type a few letters of the name, or take a photo of the card and the app reads it. Then pick the year printed on the card.</li>' +
    '<li>The app knows every big leaguer through 2025. It reads each player’s season on the card against his own league that year, so cards from any decade can play each other, and gives him a few whole numbers you could print on a label for his sleeve (the menu’s Print the table cards).</li>' +
    '<li>A player the app can’t find plays at 0, on the plain card.</li></ul>' +
    '<h3>Player values</h3><ul><li>The setup’s Player values says where each player’s numbers come from. With <b>League labels</b>, the app measures his season against his own league that year, and the menu prints a label for his sleeve. With <b>Shoebox rules</b>, everyone reads the numbers straight off the back of the card with the chart in Shoebox rules below, so a game needs no labels and no app.</li></ul>' +
    '<h3>The draft</h3><ul><li>A coin flip decides who picks first. Then you take turns picking cards from the spread, the way kids pick teams at recess. Slide each card you pick to your side of the table.</li>' +
    '<li>Every team pitches exactly three pitchers, so a team that has three can’t take a fourth. The team that picks second bats last, as the home team.</li></ul>' +
    '<h3>Your lineup</h3><ul><li>Nine hitters: eight in the field and a designated hitter.</li>' +
    '<li>Your three pitchers split the game: in 9 innings each pitches 3, in 5 innings it’s 2, 2 and 1, and in 3 innings one each. You choose who pitches first, in the middle and last. The last one also pitches any extra innings.</li>' +
    '<li>A pitcher tires in a long stint: he pitches the third inning of his stint at \u22121, and another \u22121 for each inning after that.</li>' +
    '<li>A player at a position he really played has a sure glove. A player out of position makes more errors, and a pitcher or catcher in the outfield makes the most.</li>' +
    '<li>A team short of players fills in with sandlot kids, who play at \u22122.</li></ul>' +
    '<h3>Every at-bat</h3><ul><li>The pitcher lays one of his pitch cards face down: Heat, Breaking ball, Junk or Changeup. A pitcher who strikes out a lot holds more of them, so he is harder to read.</li>' +
    '<li>The batter names the pitch he’s looking for.</li>' +
    '<li>Both roll a d20 and add their numbers: the batter his Bat, the pitcher his Arm. The batter wins the at-bat if his total beats the pitcher’s by ' + E.RULE.margin + ' or more.</li>' +
    '<li>The winner reads his own die, the number he rolled, on his own card. A batter who named the pitch squared it up, so he reads his Guessed right row: a single when he only just won, otherwise doubles, triples and home runs. A batter who guessed wrong only got a piece of it, so he reads his Guessed wrong row: walks and singles, and doubles for a speedster. A pitcher’s row has ball four, ground outs, fly outs and strikeouts.</li>' +
    '<li>A ground out or a fly out goes to a fielder, by a d6: on the ground 1 first base, 2 and 3 second base, 4 and 5 shortstop, 6 third base; in the air 1 and 2 left field, 3 and 4 center field, 5 and 6 right field. A fielder out of position rolls a d20: at a nearby position a 1 is an error, anywhere else a 1, 2 or 3.</li>' +
    '<li>In pass and play, the pitcher picks with the screen covered, then hands the device to the batter.</li></ul>' +
    '<h3>Running the bases</h3><ul>' + E.runLines().map(function (l) { return '<li><b>' + l[0] + '</b>: ' + l[1] + '</li>'; }).join('') +
    '<li>Where a line gives numbers, roll a d6. The speedster card is the only thing that makes a runner faster.</li></ul>' +
    '<h3>Milestone powers</h3>' + powerRules() +
    '<h3>Shoebox rules</h3>' + shoeRules() +
    '<h3>The odd cards</h3><ul><li>Cards that aren’t players are plays you hold and use once:</li>' +
    '<li><b>Team card</b>: +2 on your hitters’ rolls for the rest of the half-inning. <b>Checklist</b>: see the pitch before you name one. <b>League Leaders</b>: the batter wins the at-bat, and a walk counts as a single. <b>Highlight card</b>: the batter’s guess doesn’t count, so a batter who wins rolls his Guessed wrong row.</li>' +
    '<li>A player’s <b>All-Star card</b> rolls his d20 twice and keeps the higher one. A <b>Record Breaker</b> moves his hit up one: a single to a double, a double to a triple, a triple to a home run. An <b>error card</b> makes the other team boot the next ball in play. A <b>second copy</b> of a player puts him on fire, +3 for an at-bat. A <b>rookie card</b> is +1 in his first at-bat.</li></ul>' +
    '<h3>Winning</h3><ul><li>A game is 3, 5 or 9 innings; 5 takes about 20 minutes. Most runs wins, and a tie goes to extra innings.</li>' +
    '<li>Your league keeps every card you’ve entered and its numbers from every game, so the common card that keeps hitting home runs becomes a legend.</li></ul>' +
    '<p class="note">Player seasons from the Lahman Baseball Database (seanlahman.com), CC BY-SA 3.0. Card photos are read on this device with Tesseract.js and never leave it.</p>';

  Kit.init({
    id: 'sandlot', mark: false,
    rules: RULES,
    onNew: function () { clearTimers(); clearSave(); undoStack = []; showSetup(); },
    undo: function () { undo(); },
    menu: [
      { icon: 'book', label: 'Your league', onClick: function () { db().then(leagueSheet); } },
      { icon: 'chart', label: 'Box score', onClick: function () { if (S && S.g) boxSheet(); else Kit.toast('The box score starts with the first pitch'); } },
      { icon: 'history', label: 'Past games', onClick: function () { Kit.history(HKEY, { title: 'Wax Pack: past games' }); } },
      { icon: 'cards', label: 'Print the table cards', onClick: function () { printSheet(); } }
    ]
  });

  // ── Setup ────────────────────────────────────────────────────────────────
  function showSetup() {
    S = null; clearTimers(); app.className = 'stage wp-setup';
    Kit.setup(app, {
      modes: Kit.modes([{ id: 'cpu', desc: 'Draft against the computer' }, { id: 'local', kind: 'local' }]),
      options: [
        { id: 'level', robot: true, label: 'Computer skill', value: 'normal', when: function (m) { return m === 'cpu'; },
          choices: [['easy', 'Easy', 'Throws and looks for pitches at random, and drafts loosely.'], ['normal', 'Normal', 'Plays the matchups: it throws what its pitcher does best and looks for it too.'], ['hard', 'Hard', 'Plays the matchups and remembers what you’ve been doing this game.']] },
        { id: 'inn', label: 'Innings', value: 5, choices: [[3, '3\nQuick', 'About 12 minutes.'], [5, '5\nStandard', 'About 20 minutes.'], [9, '9\nFull game', 'About 35 minutes, the way the big leagues play.']] },
        { id: 'size', label: 'Cards each', value: 12, choices: [[10, '10\nNo bench', 'Nine hitters and a pitcher. Every pick plays.'], [12, '12\nTwo extras', 'Room for a reliever or a pinch hitter, or an odd card.'], [15, '15\nFull bench', 'A bench, a bullpen and a hand of odd cards. Needs a bigger stack.']] },
        { id: 'vals', label: 'Player values', value: 'league', choices: [['league', 'League labels', 'The app measures each player against his own league that year, so cards from any decade play fair. Print a label for each card’s sleeve from the menu.'], ['shoe', 'Shoebox rules', 'Every value is read straight off the back of the card with one printed chart, so a game needs no labels and no app.']] }
      ],
      players: { min: 2, max: 2, cpu: function (m) { return m === 'cpu' ? 'seats' : false; } },
      onStart: function (cfg) {
        S = { v: 3, mode: cfg.mode, level: cfg.options.level || 'normal', inn: +cfg.options.inn || 5, size: +cfg.options.size || 12, vals: cfg.options.vals === 'shoe' ? 'shoe' : 'league', seed: (Math.random() * 1e9) >>> 0,
          phase: 'stack', C: {}, cn: 0, stack: [], T: cfg.players.map(function (p, i) { return { name: p.name, cpu: !!p.cpu, color: p.color || Kit.color(i), cards: [] }; }) };
        S.started = Date.now(); Kit.gameStart(); undoStack = [];
        save(); db().then(function () { importOld(); render(); }).catch(function () { render(); });
        render();
      }
    });
  }

  // ── Rendering: one screen per phase ──────────────────────────────────────
  function render() {
    if (!S) return showSetup();
    app.className = 'stage wp wp-' + S.phase;
    if (S.phase === 'stack') renderStack();
    else if (S.phase === 'draft') renderDraft();
    else if (S.phase === 'lineup') renderLineup();
    else if (S.phase === 'play' || S.phase === 'over') renderPlay();
  }
  function relayout() { if (!S) return; if (S.phase === 'stack' || S.phase === 'draft') { fitGrid(); requestAnimationFrame(function () { fitCardNames(); }); } if (S.phase === 'play' || S.phase === 'over') fitPlay(); if (S.phase === 'lineup') fitLineup(); }

  // A grid of cards as large as the box allows, with no scrolling: try every column count, keep the largest card
  function gridFit(box, n, gap, minW) {
    var W = box.clientWidth, H = box.clientHeight - (parseFloat(getComputedStyle(box).paddingBottom) || 0) - 4, best = { w: 0, cols: 1 };
    if (!W || !H) return best;
    for (var cols = 1; cols <= Math.max(1, n); cols++) {
      var rows = Math.ceil(Math.max(1, n) / cols);
      var w = Math.min((W - gap * (cols - 1)) / cols, ((H - gap * (rows - 1)) / rows) / 1.4);
      if (w > best.w) best = { w: Math.floor(w), cols: cols };
    }
    if (minW && best.w < minW) { var cols2 = Math.max(1, Math.floor((W + gap) / (minW + gap))); best = { w: Math.floor((W - gap * (cols2 - 1)) / cols2), cols: cols2, scroll: true }; }
    return best;
  }
  function fitGrid() {
    var g = app.querySelector('.wp-grid'); if (!g) return;
    var dr = S && S.phase === 'draft', n = g.children.length, f = gridFit(g.parentNode, n, dr ? 16 : 8, 46);
    g.style.rowGap = (dr ? 16 : 8) + 'px';
    g.style.setProperty('--cw', Math.min(180, f.w) + 'px'); g.style.gridTemplateColumns = 'repeat(' + f.cols + ', var(--cw))';
    g.parentNode.classList.toggle('scroll', !!f.scroll);
  }

  // ── The stack ────────────────────────────────────────────────────────────
  function need() { return S.size * 2; }
  function renderStack() {
    app.innerHTML = '';
    var n = S.stack.length, players = S.stack.filter(function (id) { return S.C[id].kind === 'player'; }).length;
    var arms = S.stack.filter(function (id) { return S.C[id].kind === 'player' && S.C[id].role === 'p'; }).length;
    var head = el('div', { class: 'wp-head' }, [
      el('div', { class: 'wp-ttl' }, [el('h2', { text: 'Your stack' }), el('p', { class: 'wp-sub', text: n ? n + (n === 1 ? ' card' : ' cards') + ' on the table, ' + players + (players === 1 ? ' player.' : ' players.') + ' The draft takes ' + need() + '.' : 'Spread your cards face up, then tell the app who is on each one.' }),
        n ? el('p', { class: 'wp-arms' + (arms < 6 ? ' short' : ''), html: '<span>' + (arms >= 6 ? 'There are ' + arms + ' pitchers, enough for three on each team.' : 'Add ' + (6 - arms) + ' more ' + (6 - arms === 1 ? 'pitcher' : 'pitchers') + ', or sandlot kids will pitch.') + '</span>' }) : null])
    ]);
    var gridBox = el('div', { class: 'wp-gbox' }), grid = el('div', { class: 'wp-grid' });
    S.stack.forEach(function (id) {
      var c = S.C[id], f = cardFace(c);
      var b = el('button', { type: 'button', class: 'wp-cbtn', 'aria-label': c.name, onclick: function () { cardSheet(c, true); } }, [f]);
      grid.appendChild(b);
    });
    if (!n) grid.appendChild(el('button', { type: 'button', class: 'wp-cbtn wp-empty', onclick: function () { entrySheet(); } }, [el('div', { class: 'wc wc-slot' }, [el('span', { html: Kit.icon('plus') })])]));
    gridBox.appendChild(grid);
    var lg = league(), lgN = Object.keys(lg.cards).length;
    var dock = el('div', { class: 'wp-dock' });
    var row = el('div', { class: 'wp-row2' });
    row.appendChild(el('button', { type: 'button', class: 'btn btn-soft', html: Kit.icon('camera') + '<span>Scan a card</span>', onclick: function () { scanFlow(); } }));
    row.appendChild(el('button', { type: 'button', class: 'btn btn-soft', html: Kit.icon('search') + '<span>Find a player</span>', onclick: function () { entrySheet(); } }));
    dock.appendChild(row);
    var more = el('div', { class: 'wp-row2 quiet' });
    if (lgN) more.appendChild(el('button', { type: 'button', class: 'btn btn-ghost btn-sm', html: Kit.icon('book') + '<span>From your league</span>', onclick: function () { pickFromLeague(); } }));
    if (n < need()) more.appendChild(el('button', { type: 'button', class: 'btn btn-ghost btn-sm', html: Kit.icon('cards') + '<span>' + (n ? 'Fill with sample cards' : 'Try a sample stack') + '</span>', onclick: function () { sampleStack(); } }));
    if (more.children.length) dock.appendChild(more);
    var go = el('button', { type: 'button', class: 'btn btn-primary btn-lg btn-block wp-go' + (players < 4 ? ' dim' : ''), html: '<span>Start the draft</span>', onclick: function () {
      if (players < 2) return Kit.toast('Add at least two player cards first');
      if (n < need()) return Kit.confirm('The stack has ' + n + ' cards and the draft takes ' + need() + '. Sandlot kids will fill the empty spots.', { ok: 'Start the draft' }).then(function (ok) { if (ok) startDraft(); });
      startDraft();
    } });
    dock.appendChild(go);
    app.appendChild(el('div', { class: 'wp-scr wp-stk' }, [head, gridBox, dock]));
    requestAnimationFrame(function () { fitGrid(); requestAnimationFrame(function () { fitCardNames(); }); });
  }
  function addToStack(c, quiet) {
    snap();
    S.C[c.id] = c; S.stack.push(c.id);
    // into the league: a card it already has (the same player and year) is the same card
    var Lg = league(), lid = null;
    Object.keys(Lg.cards).some(function (k) { var x = Lg.cards[k]; if ((x.pid && x.pid === c.pid || !x.pid && x.n === c.name) && x.y === c.year && x.k === c.kind) { lid = k; return true; } });
    if (!lid) { lid = 'L' + (++Lg.n); Lg.cards[lid] = { pid: c.pid || null, n: c.name, y: c.year, role: c.role, k: c.kind, at: Date.now() }; }
    var rec = Lg.cards[lid]; ['rk', 'as', 'rb', 'err'].forEach(function (f) { if (c[f]) rec[f] = 1; }); if (c.ph) rec.ph = c.ph; if (c.tc && c.kind !== 'player') rec.tc = c.tc;
    if (c.scout) rec.sr = c.role;
    c.lid = lid; saveLeague(); save();
    if (!quiet) { Kit.sfx('deal'); Kit.haptic('light'); }
    if (S.phase === 'stack') renderStack();
  }
  function sampleStack() {
    db().then(function () {
      var have = {}; S.stack.forEach(function (id) { have[S.C[id].name + S.C[id].year] = 1; });
      var added = 0;
      C.SAMPLE.forEach(function (s) {
        if (S.stack.length >= Math.max(need() + 4, 28) && added) return;
        if (s[0].charAt(0) === ':') { var k = s[0].slice(1), x = s[2] || {}; if (have[C.SPECIAL[k].name + s[1]]) return; addToStack(makeCard({ kind: k, year: s[1], tc: x.team }), true); added++; return; }
        if (have[s[0] + s[1]]) return;
        var pl = E.find(s[0], { year: s[1], max: 1 })[0]; if (!pl) return;
        var x2 = s[2] || {};
        addToStack(makeCard({ pid: pl.id, year: s[1], rk: x2.rk, err: x2.err }), true); added++;
      });
      Kit.sfx('deal'); Kit.haptic('medium'); renderStack();
    });
  }
  function pickFromLeague() {
    var Lg = league(), inStack = {}; S.stack.forEach(function (id) { if (S.C[id].lid) inStack[S.C[id].lid] = 1; });
    var ids = Object.keys(Lg.cards).filter(function (k) { return !inStack[k]; }).sort(function (a, b) { return (Lg.cards[b].at || 0) - (Lg.cards[a].at || 0); });
    if (!ids.length) return Kit.toast('Every card in your league is already in the stack');
    var box = el('div', { class: 'wp-lgpick' }), chosen = {};
    var all = el('button', { type: 'button', class: 'btn btn-soft btn-sm', text: 'Take them all', onclick: function () { ids.forEach(function (k) { chosen[k] = 1; }); paint(); } });
    function paint() {
      box.innerHTML = ''; box.appendChild(all);
      var g = el('div', { class: 'wp-lgg' });
      ids.forEach(function (k) {
        var x = Lg.cards[k], c = fromLeague(k, true);
        g.appendChild(el('button', { type: 'button', class: 'wp-lgc' + (chosen[k] ? ' on' : ''), 'aria-pressed': String(!!chosen[k]), onclick: function () { chosen[k] = !chosen[k]; Kit.sfx('tap'); paint(); } }, [cardFace(c), el('span', { text: c.name + (x.y ? ', ' + x.y : '') })]));
      });
      box.appendChild(g);
    }
    paint();
    var sh = Kit.sheet({ title: 'Cards from your league', node: box, actions: [{ label: 'Add to the stack', primary: true, onClick: function () {
      Object.keys(chosen).forEach(function (k) { if (chosen[k]) addToStack(fromLeague(k), true); }); Kit.sfx('deal'); renderStack();
    } }, { label: 'Cancel' }] });
  }
  function fromLeague(lid, peek) {
    var x = league().cards[lid];
    var c = makeCard({ pid: x.pid, name: x.n, year: x.y, kind: x.k, role: x.sr || (x.pid ? null : x.role), rk: x.rk, as: x.as, rb: x.rb, err: x.err, ph: x.ph, tc: x.tc, lid: lid });
    if (peek) S.cn--;
    return c;
  }

  // ── Telling the app who's on a card ───────────────────────────────────────
  function entrySheet(pre) {
    pre = pre || {};
    var body = el('div', { class: 'wp-entry' }), sh;
    var q = el('input', { type: 'search', class: 'wp-q', placeholder: 'Name on the card', autocomplete: 'off', autocapitalize: 'words', enterkeyhint: 'search', 'data-osk': 'name', 'aria-label': 'Name on the card' });
    var res = el('div', { class: 'wp-res' });
    var odd = el('div', { class: 'wp-odd' });
    ['team', 'checklist', 'leaders', 'highlight'].forEach(function (k) {
      odd.appendChild(el('button', { type: 'button', class: 'wp-oddb', onclick: function () { oddCard(k); } }, [(function () { var f = WaxCard.face({ kind: k, year: 0 }); f.classList.add('wc'); return f; })(), el('span', { text: C.SPECIAL[k].name })]));
    });
    var scanB = el('button', { type: 'button', class: 'btn btn-soft wp-scanb', html: Kit.icon('camera') + '<span>Scan the card instead</span>', onclick: function () { sh.close(); scanFlow(); } });
    body.appendChild(q); body.appendChild(res);
    var oddH = el('p', { class: 'wp-lbl', text: 'Not a player card? These are plays you hold for later.' });
    body.appendChild(oddH); body.appendChild(odd); body.appendChild(scanB);
    var qT = null;
    q.addEventListener('input', function () { clearTimeout(qT); qT = setTimeout(paint, 120); });
    function paint() {
      var v = q.value.trim(); res.innerHTML = '';
      var showOdd = !v; oddH.hidden = odd.hidden = scanB.hidden = !showOdd;
      if (v.length < 2) return;
      db().then(function () {
        var found = E.find(v, { year: pre.year });
        found.forEach(function (pl) {
          var role = E.roleOf(pl, 0), hs = E.seasons(pl, 'h'), pos = role === 'p' ? 'Pitcher' : (function () { var c = {}; hs.forEach(function (s) { if (s.pos) c[s.pos] = (c[s.pos] || 0) + s.g; }); var b = '', m = 0; for (var k in c) if (c[k] > m) { m = c[k]; b = k; } return POSN[b] || ''; })();
          var tms = {}; E.seasons(pl, role).forEach(function (s) { tms[E.nick(s.t)] = (tms[E.nick(s.t)] || 0) + s.g; });
          var top = Object.keys(tms).sort(function (a, b) { return tms[b] - tms[a]; }).slice(0, 2).join(' and ');
          res.appendChild(el('button', { type: 'button', class: 'wp-hit', onclick: function () { detail(pl); } }, [
            el('b', { text: E.name(pl) }), el('span', { text: pos + (top ? ' for the ' + top : '') }), el('i', { text: pl.y0 + (pl.y1 > pl.y0 ? ' to ' + pl.y1 : '') })]));
        });
        res.appendChild(el('button', { type: 'button', class: 'wp-hit wp-unk', onclick: function () { unknown(v); } }, [el('b', { text: 'Someone else' }), el('span', { text: 'Not in the book? He gets a scout’s report.' })]));
      });
    }
    function detail(pl, scanned) { sh.close(); yearSheet(pl, scanned || pre); }
    function unknown(name) { sh.close(); unknownSheet(name); }
    function oddCard(k) { sh.close(); oddSheet(k); }
    sh = Kit.sheet({ title: pre.title || 'Who’s on the card?', node: body });
    if (pre.q) { q.value = pre.q; paint(); }
    setTimeout(function () { try { q.focus(); } catch (e) {} }, 300);
  }
  // Step two: the year printed on the card, what kind of card it is, and a photo
  var lastYear = 0;
  function yearSheet(pl, pre) {
    pre = pre || {};
    var role = E.roleOf(pl, pre.year || 0), years = [], y0 = pl.y0, y1 = Math.min(pl.y1 + 1, (E.db().upto || 2025) + 1);
    for (var y = y0; y <= y1; y++) years.push(y);
    var guess = pre.year && years.indexOf(pre.year) >= 0 ? pre.year : lastYear && years.indexOf(lastYear) >= 0 ? lastYear : (function () {
      var L = E.seasons(pl, role), best = L[0]; L.forEach(function (s) { if ((role === 'p' ? s.ipo : s.ab) > (role === 'p' ? best.ipo : best.ab)) best = s; }); return Math.min(y1, best.y + 1); })();
    var fx = { rk: false, as: false, rb: false, err: !!C.famousErr(E.name(pl), guess) }, ph = pre.ph || '';
    var body = el('div', { class: 'wp-yr' });
    var prev = el('div', { class: 'wp-yrprev' }), facts = el('div', { class: 'wp-yrfacts' });
    var strip = el('div', { class: 'wp-yrs', role: 'listbox', 'aria-label': 'Year on the card' });
    var flags = el('div', { class: 'wp-flags' });
    var note = el('p', { class: 'wp-note' });
    body.appendChild(el('div', { class: 'wp-yrtop' }, [prev, facts]));
    body.appendChild(el('p', { class: 'wp-lbl', text: 'The year printed on the card' })); body.appendChild(strip);
    body.appendChild(el('p', { class: 'wp-lbl', text: 'What kind of card it is' })); body.appendChild(flags); body.appendChild(note);
    var cur = guess;
    function card() { return makeCardPeek({ pid: pl.id, year: cur, rk: fx.rk, as: fx.as, rb: fx.rb, err: fx.err, ph: ph }); }
    function paint() {
      var c = card();
      prev.innerHTML = ''; prev.appendChild(cardFace(c));
      facts.innerHTML = ''; facts.appendChild(valuesEl(c)); facts.appendChild(ratingsEl(c, true));
      var s = c.line, ln = s ? (c.role === 'p' ? s.w + ' and ' + s.l + ', ' + (s.ipo ? (s.er * 27 / s.ipo).toFixed(2) : '0.00') + ' ERA, ' + s.so + ' strikeouts' : avg3(s.h / Math.max(1, s.ab)) + ', ' + s.hr + ' home runs, ' + s.rbi + ' runs batted in') : '';
      facts.appendChild(el('p', { class: 'wp-sln', text: s ? 'His ' + s.y + ' season for the ' + c.team + ': ' + ln + '.' : '' }));
      strip.innerHTML = '';
      years.forEach(function (y) {
        strip.appendChild(el('button', { type: 'button', class: 'wp-y' + (y === cur ? ' on' : ''), role: 'option', 'aria-selected': String(y === cur), text: String(y), onclick: function () { cur = y; lastYear = y; Kit.sfx('tap'); paint(); } }));
      });
      var on = strip.querySelector('.on'); if (on) setTimeout(function () { strip.scrollLeft = Math.max(0, on.offsetLeft - strip.clientWidth / 2 + on.offsetWidth / 2); }, 0);
      flags.innerHTML = '';
      [['rk', 'Rookie card'], ['as', 'All-Star card'], ['rb', 'Record Breaker'], ['err', 'Error card']].forEach(function (f) {
        flags.appendChild(el('button', { type: 'button', class: 'wp-flag' + (fx[f[0]] ? ' on' : ''), 'aria-pressed': String(fx[f[0]]), text: f[1], onclick: function () { fx[f[0]] = !fx[f[0]]; Kit.sfx('pop'); paint(); } }));
      });
      var fam = C.famousErr(E.name(pl), cur);
      note.textContent = fam ? fam.say : pre.line ? (pre.line.agree >= 3 ? 'The ' + pre.line.y + ' line on the back matches his ' + pre.line.y + ' season.' : '') : '';
      note.hidden = !note.textContent;
    }
    paint();
    var sh = Kit.sheet({ title: E.name(pl), node: body, actions: [
      { label: 'Add to the stack', primary: true, onClick: function () { lastYear = cur; var c = makeCard({ pid: pl.id, year: cur, rk: fx.rk, as: fx.as, rb: fx.rb, err: fx.err, ph: ph }); addToStack(c); Kit.toast(c.name + ' is in the stack'); } },
      { label: ph ? 'Retake the photo' : 'Add a photo of the card', onClick: function () { setTimeout(function () { takePhoto(function (key) { ph = key; pre.ph = key; yearSheet(pl, Object.assign({}, pre, { year: cur, ph: key })); }); }, 250); } },
      { label: 'Back to the search', onClick: function () { setTimeout(function () { entrySheet({ q: pl.l, year: cur }); }, 250); } }
    ] });
  }
  function makeCardPeek(o) { var c = makeCard(o); S.cn--; return c; }
  function unknownSheet(name) {
    var role = 'h', pos = '';
    var body = el('div', { class: 'wp-unkb' }), prev = el('div', { class: 'wp-yrprev' }), roles = el('div', { class: 'wp-flags' }), poss = el('div', { class: 'wp-flags' });
    body.appendChild(el('p', { class: 'wp-note', text: 'The record book has nobody called ' + name + '. A scout will size him up instead.' }));
    body.appendChild(el('div', { class: 'wp-yrtop' }, [prev, el('div', { class: 'wp-yrfacts' })]));
    body.appendChild(roles); body.appendChild(poss);
    function paint() {
      var c = makeCardPeek({ name: name, role: role, pos: pos });
      prev.innerHTML = ''; prev.appendChild(cardFace(c));
      var f = body.querySelector('.wp-yrfacts'); f.innerHTML = ''; f.appendChild(valuesEl(c)); f.appendChild(ratingsEl(c, true));
      roles.innerHTML = ''; [['h', 'Hitter'], ['p', 'Pitcher']].forEach(function (r) { roles.appendChild(el('button', { type: 'button', class: 'wp-flag' + (role === r[0] ? ' on' : ''), text: r[1], onclick: function () { role = r[0]; paint(); } })); });
      poss.innerHTML = ''; poss.hidden = role === 'p';
      SPOTS.slice(0, 8).forEach(function (p) { poss.appendChild(el('button', { type: 'button', class: 'wp-flag sm' + (pos === p ? ' on' : ''), text: p, 'aria-label': POSN[p], onclick: function () { pos = pos === p ? '' : p; paint(); } })); });
    }
    paint();
    Kit.sheet({ title: name, node: body, actions: [{ label: 'Add to the stack', primary: true, onClick: function () { addToStack(makeCard({ name: name, role: role, pos: pos })); } }, { label: 'Cancel' }] });
  }
  function oddSheet(k) {
    var sp = C.SPECIAL[k], tc = '', y = lastYear || 1988;
    var body = el('div', { class: 'wp-unkb' });
    body.appendChild(el('div', { class: 'wp-yrtop' }, [el('div', { class: 'wp-yrprev' }, [(function () { var f = WaxCard.face({ kind: k, year: y }); f.classList.add('wc'); return f; })()]), el('div', { class: 'wp-yrfacts' }, [el('p', { class: 'wp-play', html: '<b>' + esc(sp.play) + '</b>' }), el('p', { class: 'wp-sln', text: sp.say })])]));
    Kit.sheet({ title: sp.name, node: body, actions: [{ label: 'Add to the stack', primary: true, onClick: function () { addToStack(makeCard({ kind: k, year: y, tc: tc })); } }, { label: 'Cancel' }] });
  }

  // ── Photos and scanning ──────────────────────────────────────────────────
  function pickImage(cb) {
    var inp = el('input', { type: 'file', accept: 'image/*', capture: 'environment', style: { position: 'fixed', left: '-9999px' } });
    document.body.appendChild(inp);
    inp.addEventListener('change', function () { var f = inp.files && inp.files[0]; inp.remove(); if (f) cb(f); });
    inp.click();
  }
  function shrink(file, px) {
    return new Promise(function (res) {
      var url = URL.createObjectURL(file), im = new Image();
      im.onload = function () {
        var k = Math.min(1, px / Math.max(im.width, im.height)), c = document.createElement('canvas');
        c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
        res(c.toDataURL('image/jpeg', .82));
      };
      im.onerror = function () { res(null); }; im.src = url;
    });
  }
  // the camera with the card-shaped frame, then the straightened, cleaned card (photo.js); the plain picker where it can't run
  function captureCard(cb) {
    if (!window.WaxPhoto) return pickImage(function (f) { cb({ file: f }); });
    WaxPhoto.capture({ sides: ['front', 'back'], optional: ['back'], clean: true }).then(function (r) {
      if (!r || !r.front) return;
      var key = 'ph' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      WaxPhoto.record(r.front).then(function (rec) {
        C.photoPut(key, rec.url); C.photoPut(key + ':m', JSON.stringify(rec));
        cb({ key: key, url: rec.url, file: r.front.blob || r.front.raw, back: r.back && (r.back.blob || r.back.raw) });
      });
    }).catch(function () { pickImage(function (f) { cb({ file: f }); }); });
  }
  function takePhoto(done) {
    captureCard(function (c) {
      if (c.key) return done(c.key);
      shrink(c.file, 640).then(function (u) { if (!u) return; var key = 'ph' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); C.photoPut(key, u).then(function () { done(key); }); });
    });
  }
  function scanFlow() {
    captureCard(function (cap) { var file = cap.file;
      var body = el('div', { class: 'wp-scan' }), pic = el('div', { class: 'wp-scanpic' }), msg = el('p', { class: 'wp-scanmsg', text: 'Reading the card…' }), bar = el('div', { class: 'wp-scanbar' }, [el('i')]);
      body.appendChild(pic); body.appendChild(msg); body.appendChild(bar);
      var sh = Kit.sheet({ title: 'Reading the card', node: body, actions: [{ label: 'Type the name instead', onClick: function () { setTimeout(function () { entrySheet(); }, 250); } }] });
      var key = cap.key || null;
      if (key) pic.style.backgroundImage = 'url("' + cap.url + '")';
      else shrink(file, 640).then(function (u) { if (!u) return; pic.style.backgroundImage = 'url("' + u + '")'; key = 'ph' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); C.photoPut(key, u); });
      var t0 = Date.now();
      db().then(function () {
        return WaxScan.read(file, { E: E, onStep: function (st, p) {
          var say = /load|init/.test(st) ? 'Getting the reader ready (the first time takes a moment)…' : /turning/.test(st) ? 'Turning the card to read it sideways…' : /closer/.test(st) ? 'Looking closer at the name…' : 'Reading the card…';
          msg.textContent = say; if (p != null) bar.firstChild.style.width = Math.round(p * 100) + '%';
        } });
      }).then(function (r) {
        var m = r.m || { cands: [] }, cands = m.cands.filter(function (c) { return c.score >= .5; }).slice(0, 3);
        body.innerHTML = '';
        if (key) body.appendChild(el('div', { class: 'wp-scanpic sm', style: { 'background-image': 'url("' + C.photoNow(key) + '")' } }));
        body.appendChild(el('p', { class: 'wp-lbl', text: cands.length ? 'Is it one of these?' : 'The app couldn’t read a name it knows. Type it instead.' }));
        cands.forEach(function (c, i) {
          var pl = c.pl, s = E.cardSeason(pl, c.role, m.year || 0);
          body.appendChild(el('button', { type: 'button', class: 'wp-hit' + (i === 0 && c.score > .8 ? ' best' : ''), onclick: function () { sh.close(); yearSheet(pl, { year: m.year || 0, ph: key, line: m.line }); } }, [
            el('b', { text: E.name(pl) }), el('span', { text: (c.role === 'p' ? 'Pitcher' : 'Hitter') + (s ? ' for the ' + E.nick(s.t) : '') }), el('i', { text: pl.y0 + ' to ' + pl.y1 })]));
        });
        if (m.year) body.appendChild(el('p', { class: 'wp-note', text: 'The card looks like it’s from ' + m.year + '.' }));
        body.appendChild(el('button', { type: 'button', class: 'wp-hit wp-unk', onclick: function () { sh.close(); entrySheet({ q: cands[0] ? cands[0].pl.l : '', year: m.year }); } }, [el('b', { text: 'None of these' }), el('span', { text: 'Find him by name' })]));
        Kit.sfx(cands.length ? 'good' : 'bad');
      }).catch(function () { msg.textContent = 'The reader couldn’t load on this device. Type the name instead.'; });
    });
  }

  // ── Ratings ──────────────────────────────────────────────────────────────
  function ratingsEl(c, labels) {
    var r = c.r || {}, rows = c.role === 'p' ? [['Stuff', r.stf], ['Control', r.ctl], ['Stamina', r.sta]] : [['Contact', r.con], ['Power', r.pow], ['Speed', r.spd], ['Eye', r.eye]];
    var d = el('div', { class: 'wp-rt' + (c.scout ? ' scout' : '') });
    rows.forEach(function (x) {
      var v = Math.round(x[1] || 1);
      d.appendChild(el('div', { class: 'wp-rr' }, [el('span', { text: x[0] }), el('i', { class: 'wp-meter' }, [el('b', { style: { width: (v * 10) + '%' } })]), el('em', { text: String(v) })]));
    });
    if (c.scout && labels) d.appendChild(el('p', { class: 'wp-sln', text: 'A scout’s report: no record-book numbers for this card.' }));
    return d;
  }
  // The values the game plays with, as the sleeve label prints them: Bat or Arm, the card, a pitcher's pitch cards, and
  // his milestone power with what it does
  function valuesEl(c) {
    var r = rr(c), p = c.role === 'p', d = el('div', { class: 'wp-vals' });
    var row = el('div', { class: 'mu-nums' }, [numChip(p ? 'Arm' : 'Bat', p ? r.arm : r.bat, 'var(--gold-hi,#f5c84b)'), el('span', { class: 'mu-mark', text: E.CNAME[r.card] }), p ? el('span', { class: 'mu-mark', text: r.np + ' pitch cards' }) : null]);
    d.appendChild(row);
    if (r.pw) d.appendChild(el('p', { class: 'wp-pw' }, [el('b', { text: E.PNAME2[r.pw] }), el('span', { text: E.powerLabel(r.pw) })]));
    return d;
  }
  function cardSheet(c, removable) {
    var body = el('div', { class: 'wp-unkb' });
    body.appendChild(el('div', { class: 'wp-yrtop' }, [el('div', { class: 'wp-yrprev' }, [cardFace(c)]), el('div', { class: 'wp-yrfacts' }, [c.kind === 'player' ? valuesEl(c) : null, c.kind === 'player' ? ratingsEl(c, true) : el('p', { class: 'wp-play', html: '<b>' + esc(C.SPECIAL[c.kind].play) + '</b><br>' + esc(C.SPECIAL[c.kind].say) })])]));
    if (c.kind === 'player' && c.pid) body.appendChild(el('p', { class: 'wp-sln', text: bio(c) }));
    var acts = removable ? [{ label: 'Take it out of the stack', danger: true, onClick: function () { snap(); S.stack = S.stack.filter(function (x) { return x !== c.id; }); delete S.C[c.id]; save(); renderStack(); } }, { label: 'Done' }] : [{ label: 'Done' }];
    Kit.sheet({ title: c.kind === 'player' ? c.name : C.SPECIAL[c.kind].name, node: body, actions: acts });
  }

  // ── The announcer: his real history ──────────────────────────────────────
  var TK = window.TALK_WAXPACK || {};
  function say(key, v) { return window.Talk ? Talk.line('wp.' + key, TK[key], v) : ''; }
  function slots(c) {
    var v = { name: c.name, last: last(c.name), team: c.team, y: c.year, sy: c.sy };
    var s = c.line;
    if (s && c.role === 'h') { v.avg = avg3(s.h / Math.max(1, s.ab)); v.hr = s.hr; v.rbi = s.rbi; v.hits = s.h; v.g = s.g; v.sb = s.sb; }
    if (s && c.role === 'p') { v.w = s.w; v.l = s.l; v.era = s.ipo ? (s.er * 27 / s.ipo).toFixed(2) : '0.00'; v.so = s.so; v.ip = Math.round(s.ipo / 3); v.g = s.g; v.sv = s.sv; }
    return v;
  }
  function history(c) {   // one or two sentences about the man on the card, from the database
    if (c.kid) return say('kid', {});
    if (c.scout) return say('scout', { name: c.name, note: say('scoutNote', {}) });
    var pl = E.byId(c.pid); if (!pl) return '';
    var v = slots(c), h = E.honors(pl), out = [];
    if (c.rk && !S.g.seenRk[c.id]) out.push(say('rookie', v));
    var s = c.line;
    if (c.role === 'h') {
      if (s && (s.hr >= 30 || s.h / Math.max(1, s.ab) >= .32 && s.ab >= 300)) out.push(say('bigSeason', v));
      else if (s && s.sb >= 40) out.push(say('speed', v));
      else out.push(say('hitSeason', v));
    } else out.push(s && s.sv >= 20 ? say('closer', v) : say('pitchSeason', v));
    // honors, All-Star teams and career totals stop at the season on the card: a 1988 card knows nothing of 1990
    var upto = c.sy || (c.year ? c.year - 1 : 9999), hv = function (k) { return (h[k] || []).filter(function (y) { return y <= upto; }); };
    var HF = hv('H'), MV = hv('M'), CY = hv('C'), WS = hv('W'), AS = hv('A'), RY = hv('R');
    var extra = [];
    if (HF.length) extra.push(say('hof', Object.assign(v, { hof: HF[0] })));
    if (MV.length) extra.push(say('mvp', Object.assign(v, { mvp: MV.join(' and ') })));
    if (CY.length) extra.push(say('cy', Object.assign(v, { cy: CY.join(' and ') })));
    if (WS.length) { var wy = WS[0], st = E.seasons(pl, c.role).concat(E.seasons(pl, c.role === 'p' ? 'h' : 'p')).filter(function (x) { return x.y === wy; })[0]; extra.push(say('ring', Object.assign(v, { ws: wy, wsteam: st ? E.nick(st.t) : c.team }))); }
    if (AS.length >= 2) extra.push(say('allStar', Object.assign(v, { n: AS.length })));
    if (RY.length) extra.push(say('roy', Object.assign(v, { roy: RY[0] })));
    var lc = c.lid && league().cards[c.lid];
    if (lc && lc.h && lc.h.g >= 2 && c.role === 'h') extra.push(say('league', Object.assign(v, { lhr: lc.h.hr, lg: lc.h.g, lavg: avg3(lc.h.h / Math.max(1, lc.h.ab)), lh: lc.h.h })));
    if (lc && lc.p && lc.p.g >= 2 && c.role === 'p') extra.push(say('leagueP', Object.assign(v, { lk: lc.p.k, lg: lc.p.g })));
    if (!extra.length) {
      var L = E.seasons(pl, c.role).filter(function (x) { return x.y <= upto; }), tot = { hr: 0, h: 0, so: 0, w: 0 }; L.forEach(function (x) { tot.hr += x.hr || 0; tot.h += x.h || 0; tot.so += x.so || 0; tot.w += x.w || 0; });
      var y0 = L.length ? L[0].y : pl.y0, y1 = L.length ? L[L.length - 1].y : upto, ny = {}; L.forEach(function (x) { ny[x.y] = 1; }); var nys = Object.keys(ny).length;
      if (nys >= 2) extra.push(c.role === 'h' ? say('careerHr', Object.assign(v, { chr: tot.hr, chits: tot.h, y0: y0, y1: y1, nys: nys })) : say('careerK', Object.assign(v, { cso: tot.so, cw: tot.w, y0: y0, y1: y1, nys: nys })));
    }
    if (!extra.length) return out.filter(Boolean).join(' ');
    out.push(extra[Math.floor(R() * extra.length)]);
    return out.filter(Boolean).join(' ');
  }
  function bio(c) { var keep = S.g; if (!S.g) S.g = { seenRk: {} }; var t = history(c); S.g = keep; return t; }

  // ── The draft ────────────────────────────────────────────────────────────
  var NOFLIP = false, AUTO = null, FIRST = null, RIG = null;
  // a name and its verb: "Pete picks", "You pick"
  function vb(name, s, p) { return name + ' ' + (name === 'You' ? p : s); }
  function startDraft() {
    snap();
    S.phase = 'draft';
    S.draft = { first: FIRST != null ? FIRST : R() < .5 ? 0 : 1, turn: 0, n: 0, flip: !NOFLIP };
    S.draft.turn = S.draft.first;
    S.home = 1 - S.draft.first;
    save(); render();
  }
  function draftLeft() { var taken = {}; S.T.forEach(function (T) { T.cards.forEach(function (id) { taken[id] = 1; }); }); return S.stack.filter(function (id) { return !taken[id]; }); }
  function draftDone() { return S.T.every(function (T, t) { return T.cards.length >= S.size || !draftLeftFor(t).length; }); }
  function renderDraft() {
    app.innerHTML = '';
    var D = S.draft, T = S.T[D.turn];
    var teams = el('div', { class: 'wp-dteams' });
    S.T.forEach(function (tm, t) {
      var row = el('div', { class: 'wp-dteam' + (t === D.turn && !draftDone() ? ' on' : ''), style: { '--tc': tm.color } }, [
        el('div', { class: 'wp-dtn' }, [el('b', { text: tm.name }), el('span', { text: tm.cards.length + ' of ' + S.size })]),
        el('div', { class: 'wp-dpit' + (armsOf(t) >= 3 ? ' full' : '') }, [el('span', { text: 'Pitchers' }), el('i', {}, [0, 1, 2].map(function (k) { return el('em', { class: k < armsOf(t) ? 'on' : '' }); })), el('b', { text: armsOf(t) + ' of 3' })]),
        el('div', { class: 'wp-dpile' }, tm.cards.map(function (id) { var f = cardFace(S.C[id]); f.classList.add('mini'); return f; }))
      ]);
      teams.appendChild(row);
    });
    var left = draftLeft();
    var gridBox = el('div', { class: 'wp-gbox' }), grid = el('div', { class: 'wp-grid' });
    left.forEach(function (id) {
      var c = S.C[id], shut = !draftDone() && !canTake(D.turn, c);
      grid.appendChild(el('button', { type: 'button', class: 'wp-cbtn' + (shut ? ' shut' : ''), 'aria-label': 'Take ' + c.name, 'aria-disabled': shut ? 'true' : null, onclick: function (e) {
        if (!myPick()) return Kit.toast(S.T[S.draft.turn].name + ' is picking');
        if (!canTake(S.draft.turn, c)) return Kit.toast(S.T[S.draft.turn].name + ' already ' + (S.T[S.draft.turn].name === 'You' ? 'have' : 'has') + ' three pitchers');
        pick(id, e.currentTarget); } }, [cardFace(c), c.kind === 'player' ? el('span', { class: 'wp-cr', text: quick(c) }) : null]));
    });
    gridBox.appendChild(grid);
    var cap = el('div', { class: 'wp-cap' }, [el('p', { text: draftDone() ? 'Both teams are picked. Slide each card to its team’s side of the table.' : myPick() ? T.name + ', take a card.' : vb(T.name, 'is', 'are') + ' choosing…' })]);
    var dock = el('div', { class: 'wp-dock' }, [cap]);
    if (draftDone()) dock.appendChild(el('button', { type: 'button', class: 'btn btn-primary btn-lg btn-block wp-go', text: 'Set the lineups', onclick: function () { toLineup(); } }));
    app.appendChild(el('div', { class: 'wp-scr wp-drf' }, [teams, gridBox, dock]));
    requestAnimationFrame(function () { fitGrid(); requestAnimationFrame(function () { fitCardNames(); }); });
    if (D.flip) { D.flip = false; save(); coinFlip(); return; }
    if (!draftDone() && !myPick()) later(cpuPick, 900);
  }
  function quick(c) { var r = rr(c); return c.role === 'p' ? 'Arm ' + sgn(r.arm) : (c.pos[0] || 'UT') + ' Bat ' + sgn(r.bat); }
  function myPick() { return !S.T[S.draft.turn].cpu; }
  // Every team pitches exactly three arms, so a fourth pitcher isn't offered to a team that has three
  function armsOf(t) { return S.T[t].cards.filter(function (id) { var c = S.C[id]; return c.kind === 'player' && c.role === 'p'; }).length; }
  function canTake(t, c) { return !(c.kind === 'player' && c.role === 'p' && armsOf(t) >= 3); }
  function draftLeftFor(t) { return draftLeft().filter(function (id) { return canTake(t, S.C[id]); }); }
  function coinFlip() {
    var f = S.draft.first, coin = el('div', { class: 'wp-coin' }, [el('div', { class: 'wp-coinf h', text: S.T[0].name.charAt(0).toUpperCase() }), el('div', { class: 'wp-coinf t', text: S.T[1].name.charAt(0).toUpperCase() })]);
    var ov = el('div', { class: 'wp-coinov' }, [coin, el('p', { class: 'wp-coinmsg', text: 'A coin flip for the first pick…' })]);
    document.body.appendChild(ov); Kit.sfx('whoosh');
    requestAnimationFrame(function () { coin.style.transform = 'rotateY(' + (1440 + (f ? 180 : 0)) + 'deg)'; });
    later(function () {
      Kit.sfx('chip'); Kit.haptic('medium');
      ov.querySelector('.wp-coinmsg').textContent = vb(S.T[f].name, 'picks', 'pick') + ' first. ' + vb(S.T[1 - f].name, 'bats', 'bat') + ' last as the home team.';
      later(function () { ov.classList.add('out'); later(function () { ov.remove(); if (!myPick()) later(cpuPick, 600); }, 350); }, 1700);
    }, 1500);
  }
  function pick(id, from) {
    if (draftDone()) return;
    snap();
    var t = S.draft.turn, T = S.T[t], c = S.C[id];
    T.cards.push(id); S.draft.n++;
    // the next team that still has room (and a card it can take) picks
    var nx = nextPicker(t);
    S.draft.turn = nx;
    save();
    flyTo(from, t, function () {
      Kit.sfx('deal'); Kit.haptic('light');
      if (T.cpu) Kit.toast(vb(T.name, 'takes', 'take') + ' ' + (c.kind === 'player' ? c.name : 'the ' + C.SPECIAL[c.kind].name) + '. Slide the card to ' + T.name + '’s side.');
      renderDraft();
    });
  }
  function nextPicker(t) { var o = 1 - t; function can(x) { return S.T[x].cards.length < S.size && draftLeftFor(x).length; } return can(o) ? o : can(t) ? t : o; }
  function flyTo(from, t, done) {
    var dest = app.querySelectorAll('.wp-dteam')[t];
    if (!from || !dest || FAST) return done();
    var a = from.getBoundingClientRect(), b = dest.getBoundingClientRect(), g = from.cloneNode(true);
    g.className = 'wp-fly'; g.style.left = a.left + 'px'; g.style.top = a.top + 'px'; g.style.width = a.width + 'px'; g.style.height = a.height + 'px';
    document.body.appendChild(g); from.style.visibility = 'hidden';
    requestAnimationFrame(function () { g.style.transform = 'translate(' + (b.left + b.width * .7 - a.left - a.width / 2) + 'px,' + (b.top + b.height / 2 - a.top - a.height / 2) + 'px) scale(.3) rotate(' + (t ? 8 : -8) + 'deg)'; g.style.opacity = '.4'; });
    setTimeout(function () { g.remove(); done(); }, 420);
  }
  // The computer drafts by what its team still needs: a pitcher early, then the best hitter for an open position
  function cpuPick() {
    if (!S || S.phase !== 'draft' || draftDone() || myPick()) return;
    var t = S.draft.turn, T = S.T[t], left = draftLeftFor(t), have = T.cards.map(function (id) { return S.C[id]; });
    var pitchers = have.filter(function (c) { return c.kind === 'player' && c.role === 'p'; }).length, hitters = have.filter(function (c) { return c.kind === 'player' && c.role === 'h'; }).length;
    var posHave = {}; have.forEach(function (c) { if (c.role === 'h' && c.pos) c.pos.slice(0, 2).forEach(function (p) { posHave[p] = 1; }); });
    var slotsLeft = S.size - T.cards.length;
    function worth(c) {
      if (c.kind !== 'player') return (S.level === 'easy' ? 3 : 2.2) + (slotsLeft > (10 - hitters - Math.min(1, pitchers)) ? 1 : -3);
      var r = c.r, v;
      E.table(c);
      // a pitcher is worth his Arm and Stamina; the first is the ace, the second and third still needed, and they get
      // more urgent as the picks run out
      if (c.role === 'p') v = (5.5 + r.arm * 1.1 + (r.np - 3) * .3) * [1.25, 1.05, .95][pitchers] * (slotsLeft <= 3 - pitchers + 1 ? 1.4 : 1);
      else { v = 5 + r.bat * 1.15 + (CW[r.card] || 0) * .5; if (hitters >= 9) v *= .5; if (c.pos && c.pos[0] && !posHave[c.pos[0]]) v *= 1.15; if (c.pos && c.pos[0] === 'C' && !posHave.C) v *= 1.1; }
      return v;
    }
    var best = null, noise = S.level === 'easy' ? 4 : S.level === 'normal' ? 1.2 : .3;
    left.forEach(function (id) { var w = worth(S.C[id]) + (R() - .5) * noise; if (!best || w > best.w) best = { id: id, w: w }; });
    var btn = app.querySelector('.wp-cbtn[aria-label="Take ' + CSS.escape(S.C[best.id].name) + '"]');
    if (btn) btn.classList.add('cpu-pick');
    later(function () { pick(best.id, btn); }, 450);
  }

  // ── Lineups ──────────────────────────────────────────────────────────────
  function toLineup() {
    snap();
    S.T.forEach(function (T, t) { arrange(t); });
    S.phase = 'lineup'; S.lt = S.T[0].cpu ? 1 : 0;
    save(); render();
  }
  // Players and odd cards from a team's picks; empty spots go to sandlot kids. Positions by the best fit, the batting
  // order by what each hitter does best.
  function arrange(t) {
    var T = S.T[t], cards = T.cards.map(function (id) { return S.C[id]; });
    var hit = [], pit = [], hand = [], seen = {};
    cards.forEach(function (c) {
      if (c.kind !== 'player') { hand.push({ k: c.kind, id: c.id }); return; }
      var key = c.pid || c.name;
      if (seen[key]) { hand.push({ k: 'dup', id: c.id, of: seen[key] }); return; }
      seen[key] = c.id;
      (c.role === 'p' ? pit : hit).push(c);
      if (c.as) hand.push({ k: 'as', id: c.id }); if (c.rb) hand.push({ k: 'rb', id: c.id }); if (c.err) hand.push({ k: 'err', id: c.id });
    });
    var kids = 0;
    while (hit.length < 9) { var k = kid(++kids, 'h'); S.C[k.id] = k; hit.push(k); }
    pit.sort(function (x, y) { return pv(y) - pv(x); });
    while (pit.length < 3) { var a = kid(++kids, 'p'); S.C[a.id] = a; pit.push(a); }   // a missing arm is a sandlot kid
    hit.sort(function (x, y) { return hv(y) - hv(x); });
    var nine = hit.slice(0, 9), bench = hit.slice(9);
    T.at = bestFit(nine);
    T.order = smartOrder(nine);
    T.arms = staffFit(pit.slice(0, 3).map(function (c) { return c.id; }));
    T.pen = pit.slice(3).map(function (c) { return c.id; }); T.sp = T.arms[0]; T.bench = bench.map(function (c) { return c.id; });
    T.hand = hand.map(function (h) { return { k: h.k, id: h.id, of: h.of, used: false }; });
  }
  function hv(c) { var r = rr(c); return r.bat * 1.2 + (CW[r.card] || 0) * .6 + ((r.con || 0) + (r.pow || 0)) * .01; }
  function pv(c) { var r = rr(c); return r.arm * 1.2 + (r.np || 2) * .2 + (r.stf || 0) * .01; }
  // Best fit for the three pitchers: which one takes the first, middle and last stint (E.staffOrder)
  function staffFit(ids) { var o = E.staffOrder(ids.map(function (id) { return rr(S.C[id]); }), S.inn); return o.map(function (i) { return ids[i]; }); }
  function fitScore(c, at) { if (at === 'DH') return 1.2; var f = E.fit(c.pos, at); return f === 'home' ? 3 : f === 'near' ? 1.5 : 0; }
  function bestFit(nine) {
    var at = {}, used = {};
    // the scarce spots first, then a pass of swaps that improves the total
    ['C', 'SS', 'CF', '2B', '3B', '1B', 'RF', 'LF', 'DH'].forEach(function (p) {
      var best = null; nine.forEach(function (c) { if (used[c.id]) return; var s = fitScore(c, p) - (p === 'DH' ? 0 : 0) + (p === 'DH' ? -.2 * (c.r.spd || 0) : 0); if (!best || s > best.s) best = { c: c, s: s }; });
      at[best.c.id] = p; used[best.c.id] = 1;
    });
    for (var pass = 0; pass < 4; pass++) nine.forEach(function (a) { nine.forEach(function (b) {
      if (a === b) return; var pa = at[a.id], pb = at[b.id];
      if (fitScore(a, pb) + fitScore(b, pa) > fitScore(a, pa) + fitScore(b, pb) + .01) { at[a.id] = pb; at[b.id] = pa; }
    }); });
    return at;
  }
  function smartOrder(nine) {
    var a = nine.slice().sort(function (x, y) { return hv(y) - hv(x); });
    var top = a.slice(0, 5), rest = a.slice(5);
    function take(f) { var bi = 0; top.forEach(function (x, i) { if (f(x) > f(top[bi])) bi = i; }); return top.splice(bi, 1)[0]; }
    var c4 = take(function (x) { return x.r.pow; }), c1 = take(function (x) { return x.r.spd + x.r.eye + x.r.con * .5; }), c3 = take(function (x) { return x.r.con + x.r.pow; }), c2 = take(function (x) { return x.r.con + x.r.eye; });
    return [c1, c2, c3, c4].concat(top, rest).map(function (c) { return c.id; });
  }
  var LSEL = null;
  function renderLineup() {
    app.innerHTML = '';
    var t = S.lt, T = S.T[t];
    var head = el('div', { class: 'wp-head' }, [el('div', { class: 'wp-ttl' }, [el('h2', { text: T.name === 'You' ? 'Your lineup' : T.name + '’s lineup' }), el('p', { class: 'wp-sub', text: 'Lay your cards on the table the same way. Tap two cards to swap them, and two pitchers to swap their innings.' })])]);
    var fieldBox = el('div', { class: 'wp-lfield' }), dia = el('div', { class: 'wp-dia' });
    dia.innerHTML = fieldSVG(true);
    var spots = el('div', { class: 'wp-spots' });
    var posOf = {}; Object.keys(T.at).forEach(function (id) { posOf[T.at[id]] = id; });
    ['LF', 'CF', 'RF', 'SS', '2B', '3B', '1B', 'C', 'DH'].forEach(function (p) {
      var id = posOf[p], c = S.C[id];
      var fit = p === 'DH' ? 'home' : E.fit(c.pos, p);
      var b = el('button', { type: 'button', class: 'wp-spot s-' + p + ' f-' + fit + (LSEL === id ? ' sel' : ''), 'aria-label': POSN[p] + ': ' + c.name, onclick: function () { lineTap(id, 'F'); } }, [
        el('span', { class: 'wp-sp', text: p }), el('b', { text: c.kid ? 'Kid' : last(c.name) })]);
      spots.appendChild(b);
    });
    // the mound: three pitchers, each with the innings of his stint
    var mound = el('div', { class: 'wp-mound' });
    T.arms.forEach(function (id, i) {
      var c = S.C[id], r = rr(c);
      mound.appendChild(el('button', { type: 'button', class: 'wp-st' + (LSEL === id ? ' sel' : ''), 'aria-label': 'Innings ' + innLabel(i) + ': ' + c.name, onclick: function () { lineTap(id, 'P'); } }, [
        el('span', { class: 'i', text: innLabel(i) }), el('b', { text: c.kid ? 'Kid' : last(c.name) }), el('span', { class: 'a', text: sgn(r.arm) })]));
    });
    spots.appendChild(mound);
    dia.appendChild(spots); fieldBox.appendChild(dia);
    var orderBox = el('ol', { class: 'wp-order' });
    T.order.forEach(function (id, i) {
      var c = S.C[id], p = T.at[id], fit = p === 'DH' ? 'home' : E.fit(c.pos, p);
      orderBox.appendChild(el('li', {}, [el('button', { type: 'button', class: 'wp-orow' + (LSEL === id ? ' sel' : ''), onclick: function () { lineTap(id, 'O'); } }, [
        el('span', { class: 'n', text: String(i + 1) }), el('b', { text: c.kid ? 'Kid' : last(c.name) }), el('span', { class: 'p f-' + fit, text: p }), el('span', { class: 'r', text: quick(c).replace(/^\S+ /, '') })])]));
    });
    var extra = el('div', { class: 'wp-extra' });
    function chipRow(label, ids, kind) {
      if (!ids.length) return;
      var r = el('div', { class: 'wp-chips' }, [el('span', { class: 'wp-lbl', text: label })]);
      ids.forEach(function (id) { var c = S.C[id]; r.appendChild(el('button', { type: 'button', class: 'wp-chip' + (LSEL === id ? ' sel' : ''), onclick: function () { lineTap(id, kind); } }, [el('b', { text: shortName(c.name) }), el('span', { text: kind === 'B' ? (c.pos[0] || 'UT') : 'P' })])); });
      extra.appendChild(r);
    }
    chipRow('Bench', T.bench, 'B'); chipRow('Bullpen', T.pen, 'R');
    if (T.hand.length) {
      var hr = el('div', { class: 'wp-chips' }, [el('span', { class: 'wp-lbl', text: 'Your hand' })]);
      T.hand.forEach(function (h) { hr.appendChild(el('span', { class: 'wp-chip play' }, [el('b', { text: C.SPECIAL[h.k].play })])); });
      extra.appendChild(hr);
    }
    var other = S.T[1 - t], last2 = t === 1 || other.cpu || S.lt2;
    var dock = el('div', { class: 'wp-dock wp-ldock' }, [
      el('div', { class: 'wp-row2' }, [el('button', { type: 'button', class: 'btn btn-soft', html: Kit.icon('sparkle') + '<span>Best fit</span>', onclick: function () { snap(); var nine = T.order.map(function (id) { return S.C[id]; }); T.at = bestFit(nine); T.order = smartOrder(nine); T.arms = staffFit(T.arms); T.sp = T.arms[0]; LSEL = null; Kit.sfx('flip'); save(); renderLineup(); } })]),
      el('button', { type: 'button', class: 'btn btn-primary btn-lg btn-block wp-go', text: last2 ? 'Play ball' : 'Next: ' + other.name + '’s lineup', onclick: function () {
        LSEL = null;
        if (!last2) { S.lt2 = 1; S.lt = 1 - t; save(); return renderLineup(); }
        startGame();
      } })
    ]);
    app.appendChild(el('div', { class: 'wp-scr wp-lin', style: { '--tc': T.color } }, [head, fieldBox, el('div', { class: 'wp-lcol' }, [orderBox, extra]), dock]));
    fitLineup();
  }
  // the innings of each stint: "1–3", "4–5", "6"
  function innLabel(i) { var st = E.stints(S.inn), a = 1; for (var k = 0; k < i; k++) a += st[k]; var b = a + st[i] - 1; return a === b ? String(a) : a + '\u2013' + b; }
  function fitLineup() { var d = app.querySelector('.wp-dia'); if (!d) return; var b = d.parentNode, w = Math.min(b.clientWidth, b.clientHeight * 1.21); d.style.width = Math.max(Math.min(b.clientWidth, 300), w) + 'px'; }
  function lineTap(id, kind) {
    var T = S.T[S.lt];
    if (!LSEL) { LSEL = id; LKIND = kind; Kit.sfx('tap'); return renderLineup(); }
    if (LSEL === id) { LSEL = null; return renderLineup(); }
    snap();
    var a = LSEL, ka = LKIND, b = id, kb = kind; LSEL = null;
    function inNine(x) { return T.order.indexOf(x) >= 0; }
    if (ka === 'O' && kb === 'O') { var i = T.order.indexOf(a), j = T.order.indexOf(b); T.order[i] = b; T.order[j] = a; }
    else if (inNine(a) && inNine(b)) { var pa = T.at[a]; T.at[a] = T.at[b]; T.at[b] = pa; }
    else if (ka === 'P' && kb === 'P') { var x = T.arms.indexOf(a), y = T.arms.indexOf(b); T.arms[x] = b; T.arms[y] = a; T.sp = T.arms[0]; }
    else if (ka === 'P' || ka === 'R' || kb === 'P' || kb === 'R') {
      var p1 = ka === 'P' ? a : kb === 'P' ? b : null, r1 = ka === 'R' ? a : kb === 'R' ? b : null;
      if (p1 && r1) { T.arms[T.arms.indexOf(p1)] = r1; T.pen[T.pen.indexOf(r1)] = p1; T.sp = T.arms[0]; } else { Kit.toast('Swap a pitcher with a pitcher'); return renderLineup(); }
    } else {   // a bench player for one of the nine: he takes the spot and the place in the order
      var inn = inNine(a) ? a : b, out = inn === a ? b : a;
      if (T.bench.indexOf(out) < 0) return renderLineup();
      T.at[out] = T.at[inn]; delete T.at[inn]; T.order[T.order.indexOf(inn)] = out; T.bench[T.bench.indexOf(out)] = inn;
    }
    Kit.sfx('flip'); Kit.haptic('light'); save(); renderLineup();
  }
  var LKIND = null;

  // ── The ballpark (the drawing is the old Sandlot's, kept) ─────────────────
  var HOME = { x: 250, y: 410 }, BASE = [{ x: 320.7, y: 339.3 }, { x: 250, y: 268.6 }, { x: 179.3, y: 339.3 }], MOUND = { x: 250, y: 341 };
  var FPOS = { C: { x: 250, y: 425 }, '1B': { x: 318, y: 316 }, '2B': { x: 286, y: 262 }, SS: { x: 212, y: 262 }, '3B': { x: 182, y: 316 }, LF: { x: 125, y: 190 }, CF: { x: 250, y: 140 }, RF: { x: 375, y: 190 }, P: { x: 250, y: 335 } };
  function fenceFt(a) { return 400 - 70 * Math.pow(Math.min(45, Math.abs(a)) / 45, 1.5); }
  function spot(a, ft) { var r = ft * .91, rad = a * Math.PI / 180; return { x: HOME.x + r * Math.sin(rad), y: HOME.y - r * Math.cos(rad) }; }
  function fieldSVG(lineup) {
    var fence = [], track = [], a, p;
    for (a = -45; a <= 45; a += 3) { p = spot(a, fenceFt(a)); fence.push(p.x.toFixed(1) + ',' + p.y.toFixed(1)); }
    for (a = 45; a >= -45; a -= 3) { p = spot(a, fenceFt(a) - 15); track.push(p.x.toFixed(1) + ',' + p.y.toFixed(1)); }
    var lp = spot(-45, 160), rp = spot(45, 160), stands = [];
    for (a = -45; a <= 45; a += 3) { p = spot(a, fenceFt(a) + 6); stands.push(p.x.toFixed(1) + ',' + p.y.toFixed(1)); }
    for (a = 45; a >= -45; a -= 3) { p = spot(a, fenceFt(a) + 380); stands.push(p.x.toFixed(1) + ',' + p.y.toFixed(1)); }
    var crowd = ['#c9b79a', '#8d6e5a', '#e0d3c0', '#6b7a8f', '#b04a4a', '#3f5f8a', '#d9a441'], dots = '';
    for (var k = 0; k < 18; k++) dots += '<circle cx="' + (k % 6 * 4 + 2) + '" cy="' + (Math.floor(k / 6) * 4 + 2) + '" r="1.25" fill="' + crowd[(k * 5 + (k >> 1)) % crowd.length] + '" opacity=".75"/>';
    var s = '<svg class="fld" viewBox="' + (lineup ? '20 70 460 380' : '0 18 500 412') + '" preserveAspectRatio="xMidYMid meet" aria-hidden="true">' +
      '<defs><pattern id="crowd" width="24" height="12" patternUnits="userSpaceOnUse"><rect width="24" height="12" fill="#2a3138"/>' + dots + '</pattern>' +
      '<pattern id="mow" width="34" height="34" patternUnits="userSpaceOnUse" patternTransform="rotate(45 250 410)"><rect width="17" height="34" fill="rgba(255,255,255,.055)"/></pattern>' +
      '<radialGradient id="dirt" cx="50%" cy="80%" r="70%"><stop offset="0" stop-color="#d39a62"/><stop offset="1" stop-color="#b47a45"/></radialGradient></defs>' +
      '<polygon points="' + stands.join(' ') + '" fill="url(#crowd)"/>' +
      '<polygon points="' + HOME.x + ',' + HOME.y + ' ' + fence.join(' ') + '" fill="#3f9a43"/>' +
      '<polygon points="' + HOME.x + ',' + HOME.y + ' ' + fence.join(' ') + '" fill="url(#mow)"/>' +
      '<polygon points="' + fence.join(' ') + ' ' + track.join(' ') + '" fill="#b98653" opacity=".9"/>' +
      '<polyline points="' + fence.join(' ') + '" fill="none" stroke="#173a26" stroke-width="7" stroke-linejoin="round"/>' +
      '<polyline points="' + fence.join(' ') + '" fill="none" stroke="#ffd34d" stroke-width="1.6" stroke-linejoin="round" transform="translate(0,-3.4)"/>' +
      '<path d="M' + HOME.x + ' ' + HOME.y + ' L' + lp.x.toFixed(1) + ' ' + lp.y.toFixed(1) + ' A118 118 0 0 1 ' + rp.x.toFixed(1) + ' ' + rp.y.toFixed(1) + ' Z" fill="url(#dirt)"/>' +
      '<polygon points="250,394 304,339.3 250,284.6 196,339.3" fill="#47a64b"/><polygon points="250,394 304,339.3 250,284.6 196,339.3" fill="url(#mow)"/>' +
      '<circle cx="' + MOUND.x + '" cy="' + MOUND.y + '" r="13" fill="url(#dirt)"/><rect x="245" y="339.5" width="10" height="3" fill="#fff" rx="1"/>' +
      '<circle cx="' + HOME.x + '" cy="' + (HOME.y - 2) + '" r="20" fill="url(#dirt)"/>';
    var lpole = spot(-45, fenceFt(45)), rpole = spot(45, fenceFt(45));
    s += '<line x1="' + HOME.x + '" y1="' + HOME.y + '" x2="' + lpole.x.toFixed(1) + '" y2="' + lpole.y.toFixed(1) + '" stroke="#fff" stroke-width="2" opacity=".85"/>' +
      '<line x1="' + HOME.x + '" y1="' + HOME.y + '" x2="' + rpole.x.toFixed(1) + '" y2="' + rpole.y.toFixed(1) + '" stroke="#fff" stroke-width="2" opacity=".85"/>';
    BASE.forEach(function (b) { s += '<rect class="bag" x="' + (b.x - 5.5) + '" y="' + (b.y - 5.5) + '" width="11" height="11" fill="#fff" transform="rotate(45 ' + b.x + ' ' + b.y + ')" rx="1"/>'; });
    s += '<polygon points="245,406 255,406 255,410.5 250,414 245,410.5" fill="#fff"/>';
    if (!lineup) { var cf = spot(0, 400), lf = spot(-45, 330), rf = spot(45, 330);
      s += '<text x="' + cf.x + '" y="' + (cf.y + 19) + '" class="dm">400</text><text x="' + (lf.x + 22) + '" y="' + (lf.y + 4) + '" class="dm">330</text><text x="' + (rf.x - 22) + '" y="' + (rf.y + 4) + '" class="dm">330</text>'; }
    s += '<g class="fl"></g><g class="rn"></g><g class="flight"></g></svg>';
    return s;
  }

  // ── The game ─────────────────────────────────────────────────────────────
  // Every team pitches three arms, each a fixed stint (E.stints: 3, 3, 3 in nine innings; 2, 2, 1 in five; one inning
  // each in three). A pitcher tires in a long stint: −1 in its third inning and another −1 for each inning after
  // (E.tired). Nobody is pulled mid-stint; the next arm takes the mound at the start of his stint's first inning.
  function startGame() {
    snap();
    S.phase = 'play';
    S.T.forEach(function (T) { if (!T.arms) T.arms = [T.sp]; T.sp = T.arms[0]; });
    S.g = { inn: 1, half: 0, outs: 0, bases: [null, null, null], R: [0, 0], H: [0, 0], E: [0, 0], line: [[], []], bat: [0, 0],
      pit: [S.T[0].arms[0], S.T[1].arms[0]], bf: {}, pc: {}, st: {}, ps: {}, hx: [], plays: [], sideK: 0, halfK: 0, halfBF: 0, halfStart: [0, 0],
      seen: [{ H: 0, B: 0, J: 0, n: 0 }, { H: 0, B: 0, J: 0, n: 0 }], looks: [{ H: 0, B: 0, J: 0, n: 0 }, { H: 0, B: 0, J: 0, n: 0 }],
      fx: { rally: -1, err: -1 }, seenRk: {}, firstAB: {}, ab: null, duels: [0, 0, 0], ph: {}, hl: [], n20: 0 };
    S.g.line[1 - S.home].push(0);
    var rng = E.rng(S.seed); S.rs = rng.state();
    save(); render();
    later(function () { announce(vb(S.T[1 - S.home].name, 'bats', 'bat') + ' first. ' + vb(S.T[S.home].name, 'takes', 'take') + ' the field.'); newAB(); }, 500);
  }
  function rand() { var r = E.rng(S.rs); var v = r(); S.rs = r.state(); return v; }
  function d20() { return 1 + Math.floor(rand() * 20); }
  function bt() { return S.g.half === 0 ? 1 - S.home : S.home; }
  function ft() { return 1 - bt(); }
  function batter() { var t = bt(); return S.T[t].order[S.g.bat[t] % 9]; }
  function pitcher() { return S.g.pit[ft()]; }
  function hst(id) { return S.g.st[id] || (S.g.st[id] = { ab: 0, h: 0, hr: 0, rbi: 0, bb: 0, k: 0, r: 0, d: 0, t: 0 }); }
  function pst(id) { return S.g.ps[id] || (S.g.ps[id] = { bf: 0, outs: 0, h: 0, r: 0, bb: 0, k: 0, hr: 0, pc: 0 }); }
  // whose stint an inning is, and the card the pitcher on the mound is on in it
  function stintArm(t, inn) { var so = E.stintOf(inn, S.inn); return S.T[t].arms[so.i]; }
  // a pitcher's fatigue in an inning: 0, or −1 in his stint's third inning and another −1 each inning after; a
  // workhorse never tires (id: the pitcher)
  function tiredIn(inn, id) { return E.tiredFor(E.stintOf(inn, S.inn).k, id ? rr(S.C[id]) : null); }
  // the right arm on the mound for this half-inning: a new stint brings the next pitcher in
  function syncPitcher() {
    var t = ft(), want = stintArm(t, S.g.inn);
    if (want && S.g.pit[t] !== want) changePitcher(t, want, true);
  }

  // an at-bat: who picks, then the reveal
  function newAB() {
    if (!S || S.phase !== 'play') return;
    syncPitcher();
    var g = S.g, b = batter(), p = pitcher();
    g.ab = { b: b, p: p, pitch: null, look: null, step: 'pitch', fx: {} };
    var bc = S.C[b];
    // the computer's own plays before the pitch
    var F = S.T[ft()], B = S.T[bt()];
    if (B.cpu) cpuHand(bt());
    if (F.cpu) cpuHandField(ft());
    if (!g.firstAB[b]) { g.firstAB[b] = 1; announce(history(bc)); if (bc.rk) g.ab.fx.rk = 1; g.seenRk[b] = 1; }
    else announce(todayLine(b));
    save(); paintPlay();
    // the computer's base stealer goes, or its pitcher walks a feared slugger on purpose, before the pitch
    if (cpuPre()) return;
    pitchStep();
  }
  function pitchStep() {
    var g = S.g, F = S.T[ft()], B = S.T[bt()], p = g.ab.p, bc = S.C[g.ab.b];
    paintPlay();
    // the pitcher's side picks first
    if (F.cpu) { g.ab.pitch = E.cpuPitch(S.C[p].r, bc.r, S.level, g.looks[bt()], rand); g.ab.step = 'look'; save(); paintPlay(); if (B.cpu) later(cpuLookNow, 700); }
    else if (!B.cpu) { coverFor(ft(), 'pitch'); }
  }
  // ── The milestone powers before a pitch: the base stealer and the walk on purpose ─────────────────────────
  function stealer(id) { var c = S.C[id]; return !!(c && !c.kid && rr(c).pw === 'steal'); }
  function stealOpt() { var g = S.g; return g && g.ab && !g.ab.stole ? E.stealOption(g.bases, stealer) : null; }
  function canWalk() { var g = S.g, ab = g && g.ab; return !!(ab && !ab.busy && ab.step === 'pitch' && rr(S.C[ab.b]).pw === 'slug'); }
  // the computer's own choices (E.cpuSteal, E.cpuWalk); true when one is under way (it carries the at-bat on itself)
  function cpuPre() {
    var g = S.g, t = bt(), f = ft(), base = { bases: g.bases, outs: g.outs, inn: g.inn, inns: S.inn, level: S.level };
    var opt = S.T[t].cpu ? stealOpt() : null;
    // while the computer makes its move, nobody picks a pitch (ab.pre holds the at-bat)
    if (opt && E.cpuSteal(Object.assign({}, base, { lead: g.R[t] - g.R[f] }), opt, rand)) { g.ab.busy = g.ab.pre = 1; paintPlay(); later(function () { doSteal(opt, function () { if (!cpuPre()) pitchStep(); }); }, 900); return true; }
    if (S.T[f].cpu && canWalk()) {
      var T = S.T[t], nx = S.C[T.order[(g.bat[t] + 1) % 9]];
      if (E.cpuWalk(Object.assign({}, base, { lead: g.R[f] - g.R[t] }), rr(nx).pw === 'slug')) { g.ab.busy = g.ab.pre = 1; paintPlay(); later(walkOnPurpose, 900); return true; }
    }
    return false;
  }
  var BASEW = ['first', 'second', 'third', 'home'];
  // A steal: the runner's d20 against the number on his label (E.steal), shown on the duel's panel, then the runner
  // moves or is out. A third out ends the half-inning with the batter still to bat: he leads off the next one.
  function doSteal(opt, next) {
    var g = S.g, ab = g.ab, t = bt(); if (!ab || ab.busy && !ab.pre) return;
    snap();
    ab.busy = 1; ab.pre = 0; ab.stole = 1;
    var r = E.steal({ bases: g.bases, outs: g.outs }, opt.i, rand, RIG && RIG.steal), c = S.C[r.id];
    if (RIG && RIG.steal) RIG.steal = 0;
    var hs = hst(r.id); if (r.ok) hs.sb = (hs.sb || 0) + 1; else hs.cs = (hs.cs || 0) + 1;
    g.sb = g.sb || [0, 0]; g.cs = g.cs || [0, 0]; if (r.ok) g.sb[t]++; else g.cs[t]++;
    g.bases = r.bases; g.outs = r.outs;
    g.hx.push(r.ok ? 'SB' : 'CS');
    var line = c.name + (r.ok ? ' steals ' : ' is caught stealing ') + BASEW[r.to] + '.';
    if (r.ok) g.hl.push(c.name + ' stole ' + BASEW[r.to] + ' in the ' + ord(g.inn) + '.');
    save();
    // the panel: the runner's die, what it needs, where it landed
    V.hand.innerHTML = '';
    var die = d20El(r.d), msg = el('p', { class: 'rl-say', text: c.name + ' is running for ' + BASEW[r.to] + '. He needs ' + E.POW.steal.safe + ' or higher on his d20.' });
    var pan = el('div', { class: 'wp-stl', style: { '--tc': S.T[t].color } }, [el('div', { class: 'stl-h' }, [el('b', { text: E.PNAME2.steal }), el('span', { text: 'Safe on ' + E.POW.steal.safe + ' or higher' })]), die, msg]);
    V.duel.innerHTML = ''; V.duel.appendChild(pan);
    Kit.sfx('whoosh'); Kit.haptic('light');
    later(function () { die.classList.add('rolling'); spin(die, 20); Kit.sfx('roll'); }, 250);
    later(function () {
      die.classList.remove('rolling'); die.classList.add('landed', r.ok ? 'ok' : 'no'); die.querySelector('b').textContent = String(r.d);
      msg.textContent = line; announce(say(r.ok ? 'steal' : 'caught', { name: c.name, last: last(c.name), base: BASEW[r.to], pit: S.C[ab.p].name }) || line);
      paintRunners(); paintBoard();
      if (r.ok) { Kit.sfx('good'); Kit.haptic('success'); Kit.callout('Stolen base'); } else { Kit.sfx('bad'); Kit.haptic('heavy'); }
    }, 1350);
    later(function () {
      if (g.outs >= 3) return endHalf();
      ab.busy = 0; save(); paintPlay(); if (next) next();
    }, 3000);
  }
  // A walk on purpose: the batter takes first, and the runners move only when forced (E.advance's walk)
  function walkOnPurpose() {
    var g = S.g, ab = g.ab, t = bt(), f = ft(); if (!ab || ab.busy && !ab.pre) return;
    snap();
    ab.busy = 1; ab.pre = 0; ab.step = 'ibb';
    var bc = S.C[ab.b], pc = S.C[ab.p];
    var res = E.advance({ bases: g.bases, outs: g.outs, batter: ab.b }, 'BB', rand);
    var hs = hst(ab.b), ps = pst(ab.p);
    hs.bb++; hs.ibb = (hs.ibb || 0) + 1; ps.bb++; ps.bf++; ps.pc += 4; g.halfBF++;
    hs.rbi += res.rbi; res.scored.forEach(function (id) { hst(id).r++; }); ps.r += res.scored.length;
    g.R[t] += res.scored.length; var li = g.line[t]; li[li.length - 1] += res.scored.length;
    g.bases = res.bases; g.bat[t]++;
    g.ibb = g.ibb || [0, 0]; g.ibb[f]++;
    g.hx.push('IBB' + (res.scored.length ? '+' + res.scored.length : ''));
    ab.o = 'BB'; ab.res = res;
    var line = (S.T[f].name === 'You' ? 'You walk ' : S.T[f].name + ' walks ') + bc.name + ' on purpose.';
    save();
    V.hand.innerHTML = ''; V.duel.innerHTML = '';
    V.duel.appendChild(el('div', { class: 'wp-stl ibb', style: { '--tc': S.T[f].color } }, [el('div', { class: 'stl-h' }, [el('b', { text: E.PNAME2.slug }), el('span', { text: 'Walked on purpose' })]), el('p', { class: 'rl-say', text: line })]));
    announce(say('ibb', { name: bc.name, last: last(bc.name), pit: pc.name }) || line);
    Kit.sfx('tick'); Kit.haptic('light');
    later(function () { paintRunners(res.scored); paintBoard(); if (res.scored.length) Kit.sfx('good'); }, 500);
    if (g.half === 1 && g.inn >= S.inn && g.R[S.home] > g.R[1 - S.home]) { g.hl.push(bc.name + ' was walked on purpose with the bases loaded, and the winning run walked home.'); return later(function () { endGame(true, ab); }, 1800); }
    later(function () { g.ab = null; newAB(); }, 2200);
  }
  function cpuLookNow() { var g = S.g; if (!g.ab || g.ab.look) return; g.ab.look = E.cpuLook(S.C[g.ab.p].r, S.C[g.ab.b].r, S.level, g.seen[ft()], rand); reveal(); }
  // pass and play: the pitcher picks with the screen covered
  function coverFor(t, step) {
    S.g.ab.cover = 1; paintPlay();
    Kit.handoff({ name: S.T[t].name, color: S.T[t].color, what: step === 'pitch' ? 'pitches' : 'at-bat', msg: step === 'pitch' ? 'Pick your pitch where ' + S.T[1 - t].name + ' can’t see it.' : 'The pitch is in. Now guess what it is.', hint: 'Hold the button to see your ' + (step === 'pitch' ? 'pitches' : 'at-bat'), hold: 700 }).then(function () { if (S.g.ab) { S.g.ab.cover = 0; paintPlay(); } });
  }
  function choose(k) {
    var g = S.g, ab = g.ab; if (!ab || ab.busy) return;
    Kit.sfx('tap'); Kit.haptic('light');
    if (ab.step === 'pitch') {
      ab.pitch = k; ab.step = 'look'; save();
      var B = S.T[bt()];
      if (B.cpu) { paintPlay(); later(cpuLookNow, 650); }
      else { paintPlay(); coverFor(bt(), 'bat'); }
    } else if (ab.step === 'look') { ab.look = k; save(); if (!ab.pitch) { ab.pitch = E.cpuPitch(S.C[ab.p].r, S.C[ab.b].r, S.level, g.looks[bt()], rand); } reveal(); }
  }
  function todayLine(id) {
    var s = S.g.st[id], c = S.C[id]; if (!s) return c.name + ' steps in.';
    var ab = s.ab, h = s.h;
    return c.name + ' is ' + h + ' for ' + ab + ' today' + (s.hr ? ', with ' + (s.hr === 1 ? 'a home run' : s.hr + ' home runs') : '') + (s.bb ? (s.hr ? ' and ' : ', with ') + (s.bb === 1 ? 'a walk' : s.bb + ' walks') : '') + '.';
  }

  // the reveal, the roll and the play
  var RANK = { K: 0, GB: 1, FB: 1, LD: 1, PU: 1, E: 3, BB: 4, HBP: 4, S: 5, D: 6, T: 7, HR: 8 };
  function reveal() {
    var g = S.g, ab = g.ab, t = bt(), f = ft(); if (!ab || ab.busy) return;
    snap();
    ab.busy = 1; ab.step = 'reveal';
    var bc = S.C[ab.b], pc = S.C[ab.p], fx = ab.fx;
    if (RIG && RIG.pitch && S.T[f].cpu) ab.pitch = RIG.pitch;
    var guess = ab.pitch === ab.look;
    if (fx.clutch) guess = false;   // the Highlight card: the guess doesn't count
    if (fx.peek && ab.look === ab.pitch) guess = true;
    ab.guess = guess;
    g.seen[f][ab.pitch]++; g.seen[f].n++; g.looks[t][ab.look]++; g.looks[t].n++;
    g.duels[guess ? 0 : 1]++;
    // the roll: each side's d20 with its modifiers, the margin to beat, the winner's own die on his card (E.atBat)
    var hr = rr(bc), pr = rr(pc), so = E.stintOf(g.inn, S.inn), plusB = [];
    if (g.fx.rally === g.inn * 2 + g.half) plusB.push({ k: 'rally', v: 2 });
    if (fx.rk) plusB.push({ k: 'rk', v: 1 });
    if (fx.fire) plusB.push({ k: 'fire', v: 3 });
    // the milestone powers: the run producer, the closer and the 20-game winner add to the roll (E.powerMods)
    var pm = E.powerMods(hr, pr, { bases: g.bases, inn: g.inn, inns: S.inn, lead: g.R[f] - g.R[t] });
    var rc = { bat: hr.bat, arm: pr.arm, fat: E.tiredFor(so.k, pr), guess: guess, plusB: plusB.concat(pm.b), plusP: pm.p, bcard: hr.card, pcard: pr.card, sure: !!fx.sure, rb: !!fx.rb, two: !!fx.as, slug: hr.pw === 'slug' };
    if (RIG) { if (RIG.bd) rc.bd = RIG.bd; if (RIG.pd) rc.pd = RIG.pd; if (RIG.bd2) rc.bd2 = RIG.bd2; }
    var x = E.atBat(rc, rand);
    ab.roll = x; ab.rc = rc;
    // the strikeout artist: once in each stint, a batter who won the at-bat rolls again (the computer by E.cpuReroll,
    // a person by the buttons on the roll)
    var kk = f + ':' + so.i;
    g.kart = g.kart || {};
    if (pr.pw === 'kart' && x.win && !g.kart[kk]) {
      if (S.T[f].cpu) { if (E.cpuReroll(x, { bases: g.bases, level: S.level })) { g.kart[kk] = 1; ab.roll0 = x; ab.roll = E.reroll(rc, x, rand); } }
      else { ab.ask = kk; save(); return rollShow(ab, null, { head: true }); }
    }
    resolve(ab);
  }
  // A person's answer for the strikeout artist: make the batter roll again, or let the roll stand
  function kartChoose(yes) {
    var g = S.g, ab = g.ab; if (!ab || !ab.ask) return;
    var kk = ab.ask; ab.ask = 0;
    Kit.sfx('tap'); Kit.haptic('light');
    var box = V.duel.querySelector('.rl-ask'); if (box) box.remove();
    var rl = V.duel.querySelector('.wp-rl'); if (rl) rl.classList.remove('asking');
    if (yes) { g.kart[kk] = 1; ab.roll0 = ab.roll; ab.roll = E.reroll(ab.rc, ab.roll, rand); }
    resolve(ab, true);
  }
  // the rest of the at-bat once the roll stands: the fielder, the runners, the numbers, then the show
  function resolve(ab, resumed) {
    var g = S.g, t = bt(), f = ft(), bc = S.C[ab.b], pc = S.C[ab.p], x = ab.roll;
    if (RIG && RIG.o) { var ro = { GB: 'G', FB: 'F', PU: 'F', LD: 'F' }[RIG.o] || RIG.o; x.o = ro; }
    if (x.bd === 20) g.n20 = (g.n20 || 0) + 1;
    if (x.why === 'slug') g.slugHR = (g.slugHR || 0) + 1;
    // a ground out or a fly out goes to a fielder (a d6), and a fielder out of position may boot it (a d20)
    var o = x.o, fld = null, fit = 'home', F = S.T[f];
    if (o === 'G' || o === 'F') {
      var wf = RIG && RIG.where ? RIG.where : 1 + Math.floor(rand() * 6), pos = E.whereOf(o, wf);
      Object.keys(F.at).forEach(function (id) { if (F.at[id] === pos) fld = id; });
      ab.where = pos; ab.wf = wf;
      if (fld) { var fc = S.C[fld]; fit = fc.kid ? 'far' : E.fit(fc.pos, pos); }
      var need = E.BOOT[fit], kind = o === 'G' ? 'GB' : 'FB';
      if (g.fx.err === g.inn * 2 + g.half) { o = 'E'; ab.ecard = 1; }
      else if (need) { var bf = RIG && RIG.boot ? RIG.boot : d20(); ab.boot = { face: bf, need: need }; o = bf <= need ? 'E' : kind; }
      else o = kind;
    }
    var runDie = RIG && RIG.run;
    RIG = null;
    if (o === 'E') g.fx.err = -1;
    ab.fld = fld; ab.fit = fit; ab.o = o;
    var runners0 = g.bases.slice(), outs0 = g.outs;
    // the runners move by the printed rule (E.advance): a d6 where the rule says so, and the speedster card
    var res = E.advance({ bases: g.bases, outs: g.outs, batter: ab.b, where: ab.where, die: runDie }, o, rand, fastRunner);
    ab.res = res; ab.from = runners0; ab.outs0 = outs0;
    // the numbers
    var hs = hst(ab.b), ps = pst(ab.p), pcN = E.pitchCount(o, rand);
    ps.bf++; ps.pc += pcN; g.halfBF++;
    var isHit = /^(S|D|T|HR)$/.test(o);
    if (o !== 'BB' && o !== 'HBP' && res.tag !== 'sf') hs.ab++;
    if (isHit) { hs.h++; g.H[t]++; ps.h++; }
    if (o === 'D') hs.d++; if (o === 'T') hs.t++;
    if (o === 'HR') { hs.hr++; ps.hr++; }
    if (o === 'BB' || o === 'HBP') { hs.bb++; ps.bb++; }
    if (o === 'K') { hs.k++; ps.k++; g.halfK++; }
    if (o === 'E') g.E[f]++;
    hs.rbi += res.rbi;
    res.scored.forEach(function (id) { hst(id).r++; });
    ps.r += res.scored.length; ps.outs += res.outs - outs0;
    g.R[t] += res.scored.length;
    var li = g.line[t]; li[li.length - 1] += res.scored.length;
    g.bases = res.bases; g.outs = res.outs;
    g.bat[t]++;
    ab.code = res.tag === 'dp' ? 'DP' : o;
    g.hx.push(ab.code + (res.scored.length ? '+' + res.scored.length : ''));
    var txt = playText(ab, bc, pc);
    ab.txt = txt;
    ab.say = rollSay(ab, bc, pc);
    if (res.scored.length) g.plays.push({ i: g.inn, h: g.half, t: txt, r: res.scored.length });
    ab.hi = moments(ab, bc, pc, res);
    save();
    rollShow(ab, function () { ab.shown = 1; animatePlay(ab, function () { afterPlay(ab); }); }, { tail: !!resumed });
  }
  // One sentence that says what the guess did when it decided the at-bat, or what a card played did. Nothing when
  // the dice alone decided it: the totals, the margin and the lit card on the screen say that.
  var PWORD = { H: 'the heat', B: 'the breaking ball', J: 'the junk', C: 'the changeup' }, PWITH = { H: 'heat', B: 'a breaking ball', J: 'junk', C: 'a changeup' };
  function rollSay(ab, bc, pc) {
    var x = ab.roll, B = bc.kid ? 'The kid' : last(bc.name), P = pc.kid ? 'the kid' : last(pc.name);
    if (ab.roll0) return cap(nameOf(pc)) + ' made ' + nameOf(bc) + ' roll again, and ' + (x.win ? 'he won the at-bat again.' : 'this time ' + (pc.kid ? 'the kid' : last(pc.name)) + ' won it.');
    if (x.why === 'slug') return bc.name + ' is a feared slugger, and a ' + x.bd + ' that wins the at-bat is a home run' + (ab.guess ? '.' : ', even on a wrong guess.');
    if (x.why === 'sure') return 'The League Leaders card wins the at-bat for ' + B + ', so he rolls on his own card.';
    if (x.why === 'rb') return 'The Record Breaker card turns the ' + E.BNAME[x.face].toLowerCase() + ' into ' + ({ D: 'a double', T: 'a triple', HR: 'a home run' })[x.o] + '.';
    if (x.bdice.length > 1) return B + '’s All-Star card rolled his die twice, a ' + x.bdice[0] + ' and a ' + x.bdice[1] + ', and the higher one counts.';
    if (x.win && ab.guess) return B + ' read ' + PWORD[ab.pitch] + ', so it’s the squared-up die.';
    if (x.win) return P.charAt(0).toUpperCase() + P.slice(1) + ' fooled him with ' + PWITH[ab.pitch] + ', so it’s the got-a-piece die.';
    return '';
  }
  function playText(ab, bc, pc) {
    var o = ab.o, v = { name: bc.name, pit: pc.name, fld: ab.fld ? S.C[ab.fld].name : 'the fielder', home: ab.fld ? (POSN[S.C[ab.fld].pos[0]] || 'utility man').toLowerCase() : '', at: ab.where ? (POSN[ab.where] || '').toLowerCase() : '' };
    if (o === 'HR' && ab.res.scored.length === 4) return say('slam', v);
    if (ab.res.tag === 'dp') return say('dp', v);
    if (ab.res.tag === 'sf') return say('sf', v);
    if (o === 'E') return ab.fit !== 'home' && ab.fld && !S.C[ab.fld].kid && S.C[ab.fld].pos[0] ? say('Eoff', v) : say('E', v);
    return say(o, v) || o;
  }
  // the special moments: a home run, a grand slam, a pinch hit, three strikeouts in a half-inning, a walk-off, a
  // natural 20, a home run off a tiring pitcher
  function moments(ab, bc, pc, res) {
    var g = S.g, out = [], t = bt();
    var walk = g.half === 1 && g.inn >= S.inn && g.R[S.home] > g.R[1 - S.home] && res.scored.length;
    if (walk) out.push({ k: 'walkoff' });
    if (ab.o === 'HR') out.push({ k: res.scored.length === 4 ? 'slam' : 'hr', n: res.scored.length });
    if (g.ph[ab.b] && /^(S|D|T|HR)$/.test(ab.o)) out.push({ k: 'pinch' });
    if (ab.o === 'K' && g.halfK === 3 && g.halfBF === 3) out.push({ k: 'sideK' });
    if (ab.roll.bd === 20 && /^(S|D|T|HR)$/.test(ab.o)) out.push({ k: 'n20' });
    if (ab.o === 'HR' && ab.rc.fat < 0) out.push({ k: 'fumes' });
    return out;
  }
  var HITW = { S: 'a single', D: 'a double', T: 'a triple', HR: 'a home run' };
  function afterPlay(ab) {
    var g = S.g, bc = S.C[ab.b], pc = S.C[ab.p];
    var v = { name: bc.name, pit: pc.name };
    var big = ab.hi.filter(function (m) { return m.k === 'walkoff' || m.k === 'slam'; })[0];
    ab.hi.forEach(function (m) {
      if (m.k === 'hr') { Kit.moment({ title: ab.res.tag ? cap(ab.res.tag) + ' home run' : 'Home run', line: ab.txt, icon: 'trophy', pts: '+' + m.n, color: S.T[bt()].color, at: app.querySelector('.wp-field') }); g.hl.push(bc.name + ' hit a ' + (ab.res.tag || 'solo') + ' home run in the ' + ord(g.inn) + '.'); }
      if (m.k === 'pinch') { var t2 = say(ab.o === 'HR' ? 'pinchHR' : 'pinch', v); announce(t2); g.hl.push(bc.name + ' came off the bench with ' + HITW[ab.o] + '.'); if (ab.o !== 'HR') Kit.callout('Pinch hit!'); }
      if (m.k === 'sideK') { Kit.moment({ title: 'Struck out the side', line: say('sideK', v), icon: 'flame', color: S.T[ft()].color, at: app.querySelector('.wp-field') }); g.hl.push(pc.name + ' struck out the side in the ' + ord(g.inn) + '.'); }
      if (m.k === 'n20') g.hl.push(bc.name + ' rolled a natural 20 for ' + HITW[ab.o] + ' off ' + pc.name + ' in the ' + ord(g.inn) + '.');
      if (m.k === 'fumes') g.hl.push(bc.name + ' homered off ' + pc.name + ', who was tiring in the ' + ord(g.inn) + '.');
    });
    if (big && big.k === 'slam') { Kit.confetti(); Kit.moment({ big: true, title: 'Grand slam', line: ab.txt, icon: 'trophy', pts: '+4', color: S.T[bt()].color }); g.hl.push(bc.name + ' hit a grand slam in the ' + ord(g.inn) + '.'); }
    announce(ab.txt);
    // the half-inning or the game ends
    if (big && big.k === 'walkoff') { g.hl.push(bc.name + ' won it with a walk-off in the bottom of the ' + ord(g.inn) + '.'); return later(function () { endGame(true, ab); }, ab.o === 'HR' ? 2600 : 1600); }
    if (g.half === 1 && g.inn >= S.inn && g.R[S.home] > g.R[1 - S.home]) return later(function () { endGame(true, ab); }, 1400);
    if (g.outs >= 3) return later(endHalf, ab.hi.length ? 2200 : 1500);
    later(function () { g.ab = null; newAB(); }, ab.hi.length ? 2300 : 1500);
  }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  // a player's whole name, or the sandlot kid's
  function nameOf(c) { return c.kid ? 'the sandlot kid' : c.name; }
  // The end of a half-inning: when the pitcher who just finished it will be tired in his next inning, his Tired chip
  // comes up where everyone can see it, before the sides change
  function endHalf() {
    var g = S.g, f = ft(), id = g.pit[f];
    var over = g.half === 0 ? g.inn >= S.inn && g.R[S.home] > g.R[1 - S.home] : g.inn >= S.inn && g.R[0] !== g.R[1];
    var t0 = tiredIn(g.inn, id), t1 = tiredIn(g.inn + 1, id), stays = stintArm(f, g.inn + 1) === id;
    g.outs = 0; g.bases = [null, null, null]; g.halfK = 0; g.halfBF = 0; g.ab = null;
    if (!over && stays && t1 < t0) {
      var c = S.C[id];
      announce((c.kid ? 'The kid' : c.name) + ' is tiring, so he pitches his next inning at ' + sgn(t1) + '.');
      tireShow(t1); Kit.sfx('flip'); Kit.haptic('light');
      return later(switchSides, 1900);
    }
    switchSides();
  }
  function switchSides() {
    var g = S.g;
    if (g.half === 0) {
      if (g.inn >= S.inn && g.R[S.home] > g.R[1 - S.home]) { return endGame(false); }
      g.half = 1; g.line[S.home].push(0);
    } else {
      if (g.inn >= S.inn && g.R[0] !== g.R[1]) return endGame(false);
      g.half = 0; g.inn++; g.line[1 - S.home].push(0);
    }
    Kit.sfx('whoosh');
    var t = ft(), want = stintArm(t, g.inn), fresh = want && g.pit[t] !== want;
    if (fresh) changePitcher(t, want, true);
    else announce((g.half ? 'Bottom' : 'Top') + ' of the ' + ord(g.inn) + '. ' + vb(S.T[bt()].name, 'is', 'are') + ' up.');
    save(); paintPlay(); later(newAB, fresh ? 1500 : 900);
  }

  // ── Moves around the at-bat ──────────────────────────────────────────────
  // the next stint's pitcher takes the mound, fresh on card 1
  function changePitcher(t, id, quiet) {
    var T = S.T[t], old = S.g.pit[t];
    S.g.pit[t] = id;
    if (old && old !== id) T.used = (T.used || []).concat([old]);
    if (S.g.ab && t === ft()) S.g.ab.p = id;
    var so = E.stintOf(S.g.inn, S.inn), c = S.C[id];
    var span = innLabel(so.i);
    announce((c.kid ? 'A sandlot kid' : c.name) + ' takes the mound for ' + (S.g.inn > S.inn ? 'extra innings' : /\u2013/.test(span) ? 'innings ' + span : 'the ' + ord(+span) + ' inning') + '. ' + history(c));
    Kit.sfx('whoosh');
    if (!quiet) { save(); paintPlay(); }
  }
  function pinchHit(id) {
    var t = bt(), T = S.T[t], g = S.g, b = g.ab.b;
    snap();
    T.order[T.order.indexOf(b)] = id; T.at[id] = T.at[b]; delete T.at[b];
    T.bench = T.bench.filter(function (x) { return x !== id; }); T.out = (T.out || []).concat([b]);
    g.ab.b = id; g.ph[id] = 1;
    announce(S.C[id].name + ' comes off the bench to bat for ' + S.C[b].name + '. ' + history(S.C[id]));
    if (!g.firstAB[id]) g.firstAB[id] = 1;
    Kit.sfx('deal'); save(); paintPlay();
  }
  // a play from your hand
  function usePlay(t, h) {
    var g = S.g, ab = g.ab, sp = C.SPECIAL[h.k];
    snap();
    h.used = true;
    if (h.k === 'team') g.fx.rally = g.inn * 2 + g.half;
    else if (h.k === 'err') g.fx.err = g.inn * 2 + g.half;
    else if (h.k === 'checklist') ab.fx.peek = 1;
    else if (h.k === 'leaders') ab.fx.sure = 1;
    else if (h.k === 'highlight') ab.fx.clutch = 1;
    else if (h.k === 'as') ab.fx.as = 1;
    else if (h.k === 'rb') ab.fx.rb = 1;
    else if (h.k === 'dup') ab.fx.fire = 1;
    Kit.sfx('sparkle'); Kit.haptic('success');
    Kit.moment({ title: sp.play, line: S.T[t].name + ' played the ' + (h.k === 'dup' ? 'second copy of ' + S.C[h.of].name : h.k === 'as' || h.k === 'rb' || h.k === 'err' ? S.C[h.id].name + ' ' + sp.name : sp.name) + '. ' + sp.say, icon: 'cards', color: S.T[t].color, at: app.querySelector('.wp-field'), ms: 2600 });
    g.hl.push(S.T[t].name + ' played the ' + sp.name + ' for ' + sp.play + '.');
    save(); paintPlay();
  }
  function playable(t, h) {
    var g = S.g, ab = g.ab; if (!ab || h.used || ab.step === 'reveal' || ab.busy) return false;
    var batting = t === bt();
    if (h.k === 'team') return batting && g.fx.rally !== g.inn * 2 + g.half;
    if (h.k === 'err') return batting && g.fx.err < 0;
    if (h.k === 'checklist') return batting && ab.step === 'look' && !ab.fx.peek;
    if (h.k === 'leaders' || h.k === 'as' || h.k === 'rb') return batting && !ab.fx.sure && !ab.fx.as && !ab.fx.rb && (h.k === 'leaders' || ab.b === h.id);
    if (h.k === 'highlight') return !batting && ab.step === 'pitch' && !ab.fx.clutch;
    if (h.k === 'dup') return batting && ab.b === h.of && !ab.fx.fire;
    return false;
  }
  function cpuHand(t) {
    if (S.level === 'easy') return;
    var g = S.g, T = S.T[t], late = g.inn >= S.inn - 1, behind = g.R[t] < g.R[1 - t], risp = g.bases[1] || g.bases[2];
    T.hand.forEach(function (h) {
      if (!playable(t, h)) return;
      if (h.k === 'dup' || h.k === 'rb' && g.bases.some(Boolean)) return usePlay(t, h);
      if (h.k === 'leaders' && risp && (g.outs === 2 || late)) return usePlay(t, h);
      if (h.k === 'team' && (late && behind || g.bases.filter(Boolean).length >= 2)) return usePlay(t, h);
      if (h.k === 'err' && late && behind) return usePlay(t, h);
    });
  }
  function cpuHandField(t) {
    if (S.level === 'easy') return;
    var g = S.g, T = S.T[t];
    T.hand.forEach(function (h) { if (h.k === 'highlight' && playable(t, h) && (g.bases[1] || g.bases[2]) && g.inn >= S.inn - 1) usePlay(t, h); });
  }

  // ── The play screen ──────────────────────────────────────────────────────
  var V = null, ANN = '';
  function announce(t) { if (!t) return; ANN = t; var a = app.querySelector('.wp-ann p'); if (a) { a.textContent = t; a.parentNode.classList.remove('new'); void a.offsetWidth; a.parentNode.classList.add('new'); } }
  function renderPlay() {
    app.innerHTML = '';
    V = {};
    var sb = el('div', { class: 'wp-sb' }), field = el('div', { class: 'wp-field' });
    field.innerHTML = fieldSVG(false);
    var mu = el('div', { class: 'wp-mu' }), ann = el('div', { class: 'wp-ann' }, [el('p', { text: ANN })]), duel = el('div', { class: 'wp-duel' }), hand = el('div', { class: 'wp-hand' });
    var root = el('div', { class: 'wp-scr wp-ply' }, [field, sb, ann, mu, duel, hand]);
    app.appendChild(root);
    V = { root: root, sb: sb, field: field, svg: field.querySelector('svg'), mu: mu, ann: ann, duel: duel, hand: hand, tok: {} };
    paintPlay(); fitPlay(); requestAnimationFrame(fitPlay);
  }
  // The ballpark drawn as large as its box allows: the field from the fence to home plate fills the room left by
  // whatever lies over it (the scoreboard and the announcer sideways), and the grandstand fills the rest
  function fitPlay() {
    if (!V || !V.svg) return;
    var W = V.field.clientWidth, H = V.field.clientHeight; if (!W || !H) return;
    var land = document.documentElement.getAttribute('data-o') === 'land';
    var T = land ? V.sb.offsetHeight + 6 : 0, B = 0;
    var sc = Math.min(W / 470, Math.max(40, H - T - B) / 392);
    var vw = W / sc, vh = H / sc;
    var y0 = Math.min(42 - T / sc, 452 - vh);   // home plate near the foot, the grandstand filling any room above
    V.svg.setAttribute('viewBox', (250 - vw / 2).toFixed(1) + ' ' + y0.toFixed(1) + ' ' + vw.toFixed(1) + ' ' + vh.toFixed(1));
  }
  function paintPlay() {
    if (!V || !V.root || !V.root.isConnected) return renderPlay();
    V.root.classList.toggle('rolling', !!(S.g && S.g.ab && S.g.ab.step === 'reveal'));
    paintBoard(); paintField(); paintStaff(); paintMatchup(); paintDuel(); paintHand();
  }
  function paintBoard() {
    var g = S.g, n = Math.max(S.inn, g.line[0].length, g.line[1].length), from = Math.max(0, n - 9), tb = el('table', { class: 'wp-line' });
    var hr = el('tr', {}, [el('th', { class: 'tm' })]);
    for (var i = from; i < n; i++) hr.appendChild(el('th', { class: i + 1 === g.inn ? 'now' : '', text: String(i + 1) }));
    ['R', 'H', 'E'].forEach(function (x) { hr.appendChild(el('th', { class: 'rhe', text: x })); });
    tb.appendChild(hr);
    [1 - S.home, S.home].forEach(function (t) {
      var tr = el('tr', { class: bt() === t && S.phase === 'play' ? 'up' : '', style: { '--tc': S.T[t].color } }, [el('td', { class: 'tm' }, [el('i'), el('span', { text: S.T[t].name })])]);
      for (var k = from; k < n; k++) { var v = g.line[t][k]; tr.appendChild(el('td', { class: k + 1 === g.inn && bt() === t ? 'now' : '', text: v == null ? (t === S.home && S.phase === 'over' && k === n - 1 && g.line[t].length < n ? 'X' : '') : String(v) })); }
      [g.R[t], g.H[t], g.E[t]].forEach(function (v, j) { tr.appendChild(el('td', { class: 'rhe' + (j === 0 ? ' r' : ''), text: String(v) })); });
      tb.appendChild(tr);
    });
    var outs = el('div', { class: 'wp-outs', 'aria-label': g.outs + ' out' + (g.outs === 1 ? '' : 's') }, [el('span', { text: (g.half ? 'Bottom ' : 'Top ') + ord(g.inn) })].concat([0, 1, 2].map(function (k) { return el('i', { class: k < g.outs ? 'on' : '' }); })));
    V.sb.innerHTML = ''; V.sb.appendChild(tb); V.sb.appendChild(outs);
  }
  function svgEl(tag, a) { var n = document.createElementNS('http://www.w3.org/2000/svg', tag); for (var k in a) n.setAttribute(k, a[k]); return n; }
  function paintField() {
    var g = S.g, svg = V.svg; if (!svg) return;
    // the fielding team at its positions, the batter at the plate
    var fl = svg.querySelector('.fl'); fl.innerHTML = '';
    var F = S.T[ft()], tc = F.color;
    Object.keys(F.at).forEach(function (id) {
      var p = F.at[id]; if (p === 'DH') return;
      var c = S.C[id], fit = c.kid ? 'far' : E.fit(c.pos, p), q = FPOS[p];
      var gg = svgEl('g', { class: 'fp f-' + fit + (g.ab && g.ab.fld === id && g.ab.step === 'reveal' ? ' act' : ''), transform: 'translate(' + q.x + ' ' + q.y + ')' });
      gg.appendChild(svgEl('circle', { r: 7, fill: tc, stroke: '#fff', 'stroke-width': 1.6 }));
      var tx = svgEl('text', { y: 17, class: 'fn' }); tx.textContent = c.kid ? 'Kid' : last(c.name); gg.appendChild(tx);
      fl.appendChild(gg);
    });
    var pp = svgEl('g', { class: 'fp', transform: 'translate(' + FPOS.P.x + ' ' + FPOS.P.y + ')' }); pp.appendChild(svgEl('circle', { r: 7, fill: tc, stroke: '#fff', 'stroke-width': 1.6 }));
    fl.appendChild(pp);
    paintRunners();
  }
  function paintRunners(scoredNow) {
    var g = S.g, rn = V.svg.querySelector('.rn'), want = {};
    g.bases.forEach(function (id, i) { if (id) want[id] = BASE[i]; });
    if (g.ab && g.ab.step !== 'reveal' && g.ab.step !== 'ibb') want[g.ab.b] = { x: HOME.x - 22, y: HOME.y - 2, bat: 1 };
    Object.keys(V.tok).forEach(function (id) {
      if (want[id]) return; var t = V.tok[id]; delete V.tok[id];
      if (scoredNow && scoredNow.indexOf(id) >= 0) { place(t, HOME); setTimeout(function () { t.classList.add('gone'); }, ms(520)); setTimeout(function () { t.remove(); }, ms(1000)); }
      else { t.classList.add('gone'); setTimeout(function () { t.remove(); }, ms(400)); }
    });
    Object.keys(want).forEach(function (id) {
      var t = V.tok[id], w = want[id];
      if (!t) {
        t = svgEl('g', { class: 'tk' + (w.bat ? ' bat' : '') }); var c = S.C[id];
        t.appendChild(svgEl('circle', { r: 11, fill: S.T[c ? teamOf(id) : bt()].color, stroke: '#fff', 'stroke-width': 2 }));
        var tx = svgEl('text', { y: 4.2, class: 'ti' }); tx.textContent = (c.kid ? 'K' : last(c.name).charAt(0)); t.appendChild(tx);
        rn.appendChild(t); V.tok[id] = t; place(t, w, true);
      } else { t.classList.toggle('bat', !!w.bat); place(t, w); }
    });
  }
  function teamOf(id) { var T = S.T[0]; return T.cards.indexOf(id) >= 0 || T.order.indexOf(id) >= 0 || (T.arms || []).indexOf(id) >= 0 || (T.bench || []).indexOf(id) >= 0 || (T.out || []).indexOf(id) >= 0 ? 0 : 1; }
  function place(t, p, now) { if (now) t.style.transition = 'none'; t.style.transform = 'translate(' + p.x.toFixed(1) + 'px,' + p.y.toFixed(1) + 'px)'; if (now) { void t.getBoundingClientRect(); t.style.transition = ''; } }
  function paintMatchup() {
    var g = S.g, ab = g.ab; V.mu.innerHTML = '';
    var b = ab ? ab.b : batter(), p = ab ? ab.p : pitcher();
    function side(id, cls, label) {
      var c = S.C[id], t = cls === 'b' ? bt() : ft(), r = rr(c);
      var face = cardFace(c, { at: S.T[t].at[id] }); face.classList.add('mu-card');
      var nums = el('div', { class: 'mu-nums' });
      if (cls === 'b') {
        nums.appendChild(numChip('Bat', r.bat, S.T[t].color));
        nums.appendChild(el('span', { class: 'mu-mark', text: E.CNAME[r.card] }));
        if (r.pw) nums.appendChild(el('span', { class: 'mu-mark pw', text: E.PNAME2[r.pw] }));
      } else {
        nums.appendChild(numChip('Arm', r.arm, S.T[t].color));
        var fat = tiredIn(g.inn, id); if (fat) nums.appendChild(numChip('Tired', fat, '#ff9f2e'));
        nums.appendChild(el('span', { class: 'mu-mark', text: E.CNAME[r.card] }));
        if (r.pw) nums.appendChild(el('span', { class: 'mu-mark pw', text: E.PNAME2[r.pw] }));
      }
      var info = el('div', { class: 'mu-info' }, [el('span', { class: 'mu-lbl', text: label }), el('b', { class: 'mu-nm', text: c.kid ? 'Sandlot kid' : c.name }),
        el('span', { class: 'mu-line', text: cls === 'b' ? todayShort(id) : pitchShort(id) }), nums]);
      return el('button', { type: 'button', class: 'mu ' + cls + (r.pw ? ' haspw' : ''), style: { '--tc': S.T[t].color }, onclick: function () { cardSheet(c, false); } }, [face, info]);
    }
    V.mu.appendChild(side(b, 'b', 'At bat')); V.mu.appendChild(side(p, 'p', 'Pitching'));
    requestAnimationFrame(function () { fitCardNames(V.mu); });
  }
  function numChip(label, v, color) { return el('span', { class: 'wp-num', style: { '--nc': color } }, [el('span', { text: label }), el('b', { text: sgn(v) })]); }
  function todayShort(id) { var s = S.g.st[id]; if (!s || !s.ab && !s.bb) { var c = S.C[id]; return c.sy ? c.sy + ' ' + (c.team || '') : c.kid ? 'Neighborhood kid' : 'Scout’s report'; } return s.h + ' for ' + s.ab + (s.hr ? ', ' + s.hr + ' HR' : ''); }
  function pitchShort(id) { var s = S.g.ps[id]; if (!s || !s.bf) { var c = S.C[id]; return c.sy ? c.sy + ' ' + (c.team || '') : 'Fresh arm'; } return Math.floor(s.outs / 3) + '.' + s.outs % 3 + ' IP, ' + s.k + ' K'; }
  // the fielding team's pitching card beside the mound: its three stints, the one now lit, the ones done dimmed
  function paintStaff() {
    var box = V.field.querySelector('.wp-staff'); if (!box) { box = el('div', { class: 'wp-staff' }); V.field.appendChild(box); }
    var t = ft(), T = S.T[t], now = E.stintOf(S.g.inn, S.inn).i;
    box.innerHTML = ''; box.style.setProperty('--tc', T.color);
    box.appendChild(el('span', { class: 'wp-sth', text: T.name === 'You' ? 'Your pitchers' : T.name + '’s pitchers' }));
    T.arms.forEach(function (id, i) {
      var c = S.C[id];
      box.appendChild(el('span', { class: 'wp-str' + (i === now ? ' on' : i < now ? ' done' : '') }, [el('span', { class: 'i', text: innLabel(i) }), el('b', { text: c.kid ? 'Kid' : last(c.name) }), el('span', { class: 'a', text: sgn(rr(c).arm) })]));
    });
  }
  // the three pitches, drawn as their own marks
  var PICON = {
    H: '<svg viewBox="0 0 48 48"><circle cx="30" cy="24" r="9" fill="#fff"/><path d="M26 16 q5 8 0 16 M34 16 q-5 8 0 16" stroke="#d33" stroke-width="1.6" fill="none"/><path d="M4 18 h14 M2 24 h16 M6 30 h12" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>',
    B: '<svg viewBox="0 0 48 48"><path d="M6 10 q26 0 30 26" stroke="currentColor" stroke-width="3" fill="none" stroke-dasharray="3 5" stroke-linecap="round"/><circle cx="36" cy="36" r="8" fill="#fff"/><path d="M32 29 q5 7 0 14" stroke="#d33" stroke-width="1.5" fill="none"/></svg>',
    J: '<svg viewBox="0 0 48 48"><path d="M5 30 q8 -14 14 0 q6 14 12 0" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" stroke-dasharray="2 5"/><circle cx="38" cy="26" r="7.5" fill="#fff"/><path d="M34 20 q4 6 0 12" stroke="#d33" stroke-width="1.5" fill="none"/></svg>',
    C: '<svg viewBox="0 0 48 48"><path d="M4 22 h7 M15 22 h6 M25 22 h4" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><circle cx="37" cy="26" r="8" fill="#fff"/><path d="M33 19 q5 7 0 14" stroke="#d33" stroke-width="1.5" fill="none"/></svg>'
  };
  function paintDuel() {
    var g = S.g, ab = g.ab; V.duel.innerHTML = '';
    if (S.phase === 'over') { V.duel.appendChild(el('button', { type: 'button', class: 'btn btn-primary btn-lg btn-block', text: 'See the results', onclick: function () { showWin(); } })); return; }
    if (!ab) { V.duel.appendChild(el('p', { class: 'wp-wait', text: ' ' })); return; }
    var F = S.T[ft()], B = S.T[bt()];
    if (ab.pre || ab.step === 'ibb') { V.duel.appendChild(el('p', { class: 'wp-wait', text: ab.step === 'ibb' ? ' ' : (ab.pre && S.T[bt()].cpu && stealOpt() ? B.name : F.name) + ' is thinking…' })); return; }
    if (ab.step === 'reveal') { if (ab.roll) V.duel.appendChild(rollEl(ab, !ab.shown)); return; }
    var picking = ab.step === 'pitch' ? F : B, human = !picking.cpu;
    var who = ab.step === 'pitch' ? F.name + ', pick your pitch' : B.name + ', what are you looking for?';
    if (!human || ab.cover) { V.duel.appendChild(el('p', { class: 'wp-wait', text: ab.cover ? 'Pass the device.' : picking.name + ' is thinking…' })); return; }
    V.duel.appendChild(el('p', { class: 'wp-ask' + (ab.step === 'pitch' ? ' p' : ''), style: { '--tc': picking.color }, text: who }));
    // under each pitch, how often it has come up this game: thrown by this team's pitchers, or looked for by these hitters
    var tally = ab.step === 'look' ? g.seen[ft()] : g.looks[bt()];
    var has = E.pitchesOf(rr(S.C[ab.p])), btns = el('div', { class: 'wp-pitches n' + has.length });
    has.forEach(function (k) {
      var peek = ab.step === 'look' && ab.fx.peek && ab.pitch === k, n = tally[k] || 0;
      btns.appendChild(el('button', { type: 'button', class: 'wp-pb' + (peek ? ' peek' : ''), style: { '--pc': F.color, '--bc': B.color }, onclick: function () { choose(k); } }, [
        el('i', { html: PICON[k] }), el('b', { text: E.PNAME[k] }),
        el('span', { class: 'tal', 'aria-label': (ab.step === 'look' ? 'Thrown ' : 'Looked for ') + n + ' times this game' }, Array.from({ length: Math.min(n, 8) }, function () { return el('em'); }))]));
    });
    V.duel.appendChild(btns);
  }

  // ── The roll on the screen: two d20s with the margin to beat between them, then the winner's die on his card ───
  var FLONG = { K: 'Strikeout', G: 'Ground out', F: 'Fly out', BB: 'Walk', S: 'Single', D: 'Double', T: 'Triple', HR: 'Home run' };
  var FSH = { K: 'K', G: 'GO', F: 'FO', BB: 'BB', S: '1B', D: '2B', T: '3B', HR: 'HR' };
  // a row of a player's card: the die's ranges, each as wide as its numbers, each with its first and last number; a
  // pin with the die's number stands over the range it reads
  function rangesEl(card, row, die) {
    var d = el('div', { class: 'wp-rg' });
    E.ranges(card, row).forEach(function (x) {
      d.appendChild(el('div', { class: 'rg-r f-' + x[2] + (die && die >= x[0] && die <= x[1] ? ' lit' : ''), 'data-lo': x[0], 'data-hi': x[1], style: { flex: (x[1] - x[0] + 1) + ' 1 0' } }, [
        el('i', { text: x[0] === x[1] ? String(x[0]) : x[0] + '\u2013' + x[1] }), el('span', { 'data-l': FLONG[x[2]], 'data-s': FSH[x[2]], text: FLONG[x[2]] })]));
    });
    var pin = el('div', { class: 'rg-pin' + (die ? ' in' : '') }, [el('b', { text: die ? String(die) : '' })]);
    if (die) pin.style.left = ((die - .5) / 20 * 100).toFixed(2) + '%';
    d.appendChild(pin);
    return d;
  }
  function fitFaces(root) {
    (root || app).querySelectorAll('.rg-r span').forEach(function (s) { s.textContent = s.dataset.l; if (s.scrollWidth > s.clientWidth + 1) s.textContent = s.dataset.s; });
    (root || app).querySelectorAll('.rg-r i').forEach(function (s) { s.style.visibility = s.scrollWidth > s.clientWidth + 1 ? 'hidden' : ''; });
  }
  // a twenty-sided die seen face on: the outline of an icosahedron with its facets, the number in the middle
  function d20El(v) {
    return el('span', { class: 'wp-d20', html: '<svg viewBox="0 0 60 60" aria-hidden="true"><polygon class="o" points="30,2 54,16 54,44 30,58 6,44 6,16"/>' +
      '<polygon class="f" points="30,14 47,43 13,43"/><path class="e" d="M30 2 L30 14 M54 16 L47 43 M54 44 L47 43 M30 58 L47 43 M30 58 L13 43 M6 44 L13 43 M6 16 L13 43 M6 16 L30 14 M54 16 L30 14 M13 43 L47 43"/></svg><b>' + v + '</b>' });
  }
  var MODL = { bat: 'Bat', arm: 'Arm', tired: 'Tired', rally: 'Team card', rk: 'Rookie card', fire: 'On fire', rbi: 'Run producer', close: 'Closer', w20: '20-game winner' };
  function chipsOf(mods, color) {
    var c = el('div', { class: 'rl-chips' });
    mods.forEach(function (m) { if (m.k !== 'bat' && m.k !== 'arm' && !m.v) return; c.appendChild(el('span', { class: 'rl-c' + (m.k === 'bat' || m.k === 'arm' ? '' : m.k === 'tired' ? ' tired' : ' play'), style: m.k === 'bat' || m.k === 'arm' ? { '--nc': color } : null }, [el('span', { text: MODL[m.k] || m.k }), el('b', { text: sgn(m.v) })])); });
    return c;
  }
  // the roll panel: live, its pieces come in one at a time (rollShow); otherwise it is drawn as it ended. When the
  // strikeout artist made the batter roll again, a live panel starts from the first roll (ab.roll0)
  function rollEl(ab, live) {
    var x = ab.roll, x0 = live && ab.roll0 ? ab.roll0 : x, bc = S.C[ab.b], pc = S.C[ab.p], d = el('div', { class: 'wp-rl' + (live ? ' live' : '') + (x0.win ? ' bwin' : ' pwin') });
    function side(cls, c, mods, dice, tot, color) {
      return el('div', { class: 'rl-side ' + cls, style: { '--tc': color } }, [
        el('span', { class: 'rl-who', text: c.kid ? 'Sandlot kid' : last(c.name) }), chipsOf(mods, color),
        el('div', { class: 'rl-roll' }, dice.map(function (v, i) { var e = d20El(v); if (dice.length > 1 && v !== x0.bd) e.classList.add('lost'); if (v === 20 && cls === 'b') e.classList.add('n20'); return e; }).concat([el('b', { class: 'rl-tot', text: String(tot) })]))]);
    }
    var B = side('b', bc, x0.modsB, x0.bdice, x0.bt, S.T[bt()].color), P = side('p', pc, x0.modsP, [x0.pd], x0.pt, S.T[ft()].color);
    var mid = el('div', { class: 'rl-mid' + (ab.guess ? ' right' : ' wrong') }, [
      el('div', { class: 'rl-guess' }, [el('i', { html: PICON[ab.look] }), el('span', { class: 'mk', html: Kit.icon(ab.guess ? 'check' : 'close') }), el('i', { html: PICON[ab.pitch] })]),
      el('span', { class: 'rl-nl', text: 'Beat by' }),
      el('div', { class: 'rl-need' }, [el('b', { text: String(x0.need) })]),
      el('span', { class: 'rl-by', text: byText(x0) })]);
    d.appendChild(el('div', { class: 'rl-duel' }, [B, mid, P]));
    var card = cardPart(ab, live);
    d.appendChild(card);
    if (!live && ab.res && ab.res.roll) { var rd = d6El(ab.res.roll.d); rd.classList.add('run', 'in'); card.querySelector('.rl-ch').appendChild(rd); }
    if (!live && x.why === 'slug') card.querySelector('.rl-ch').appendChild(slugMark());
    d.appendChild(el('p', { class: 'rl-say', text: live ? '' : ab.ask ? '' : rollLine(ab) }));
    if (!live && ab.ask) { d.classList.add('asking'); d.appendChild(askBox(ab)); }
    requestAnimationFrame(function () { fitFaces(d); });
    return d;
  }
  // the feared slugger's 19 or 20: whatever the card's range says, it's a home run
  function slugMark() { return el('span', { class: 'rl-mk', text: 'Home run' }); }
  function byText(x) { return x.bt - x.pt > 0 ? 'Won by ' + (x.bt - x.pt) : x.bt === x.pt ? 'Tied' : 'Lost by ' + (x.pt - x.bt); }
  // the winner's card: a batter's two rows (the guess lights one), a pitcher's one
  function cardPart(ab, live) {
    var x = ab.roll, bc = S.C[ab.b], pc = S.C[ab.p], wc = x.win ? bc : pc, rows = x.win ? ['right', 'wrong'] : ['p'];
    return el('div', { class: 'rl-card ' + (x.win ? 'b' : 'p'), style: { '--tc': S.T[x.win ? bt() : ft()].color } }, [
      el('div', { class: 'rl-ch' }, [el('b', { text: wc.kid ? 'Sandlot kid' : last(wc.name) }), el('span', { text: E.CNAME[x.card] })]),
      el('div', { class: 'rl-rows' }, rows.map(function (rw) {
        var on = rw === x.row;
        return el('div', { class: 'rl-row' + (on && !live ? ' on' : '') + (on ? ' this' : ''), 'data-row': rw }, [rw === 'p' ? null : el('span', { class: 'rl-rl', text: rw === 'right' ? 'Guessed right' : 'Guessed wrong' }), rangesEl(x.card, rw === 'p' ? null : rw, on && !live ? x.die : 0)]);
      }))]);
  }
  // the strikeout artist's choice, on the roll, for a person: the batter won, so make him roll again or let it stand
  function askBox(ab) {
    var bc = S.C[ab.b], pc = S.C[ab.p], T = S.T[ft()];
    return el('div', { class: 'rl-ask', style: { '--tc': T.color } }, [
      el('p', { text: pc.name + ' is a strikeout artist. Once in his stint, he can make ' + nameOf(bc) + ' roll his d20 again, and the new roll stands.' }),
      el('div', { class: 'rl-askb' }, [
        el('button', { type: 'button', class: 'btn btn-primary', text: 'Make him roll again', onclick: function () { kartChoose(true); } }),
        el('button', { type: 'button', class: 'btn btn-soft', text: 'Let it stand', onclick: function () { kartChoose(false); } })])]);
  }
  function rollLine(ab, noRun) {
    var run = !noRun && ab.res && ab.res.roll ? ' ' + runSay(ab, true) : '';
    if (ab.boot) { var f = S.C[ab.fld], nm = f.kid ? 'The kid' : last(f.name); return (ab.o === 'E' ? nm + ' is out of position at ' + POSN[ab.where].toLowerCase() + ' and boots it on a ' + ab.boot.face + '.' : nm + ' is out of position at ' + POSN[ab.where].toLowerCase() + ', but he fields it cleanly on a ' + ab.boot.face + '.') + run; }
    if (ab.ecard) return 'The Error card makes the fielder boot it.';
    return run ? run.slice(1) : ab.say || '';
  }
  // The base-running d6 (E.advance's roll), said before it lands (what it needs) and after (what it did), with the
  // runner's name: the same numbers the printed reference page gives for a table
  function runSay(ab, landed) {
    var rl = ab.res && ab.res.roll; if (!rl) return '';
    var who = S.C[rl.who], nm = who && !who.kid ? last(who.name) : 'the kid', Nm = nm.charAt(0).toUpperCase() + nm.slice(1);
    var on1 = S.C[ab.from && ab.from[0]], r1 = on1 && !on1.kid ? last(on1.name) : 'the runner';
    var need = E.faces(rl.need[0], rl.need[1]), a = 'A ' + rl.d + ', so ';
    if (rl.k === 'dp') return !landed ? 'With ' + r1 + ' on first and fewer than two outs, ' + need + ' on the d6 is a double play.' : rl.ok ? a + 'it’s a double play.' : a + 'only ' + nm + ' is out, and ' + r1 + ' moves up to second.';
    if (rl.k === 'tag') return !landed ? Nm + ' tags up at third, and ' + need + ' on the d6 scores him.' : rl.ok ? a + nm + ' scores on the sacrifice fly.' : a + nm + ' holds at third.';
    if (rl.k === 's13') return !landed ? Nm + ' is running from first, and ' + need + ' on the d6 takes him to third.' : rl.ok ? a + nm + ' goes first to third.' : a + nm + ' stops at second.';
    if (rl.k === 'd1h') return !landed ? Nm + ' is running from first, and ' + need + ' on the d6 sends him home.' : rl.ok ? a + nm + ' scores all the way from first.' : a + nm + ' holds at third.';
    return '';
  }
  // a six-sided die with its pips, for the base-running roll
  var PIP6 = { 1: [[15, 15]], 2: [[9, 9], [21, 21]], 3: [[8, 8], [15, 15], [22, 22]], 4: [[9, 9], [21, 9], [9, 21], [21, 21]], 5: [[8, 8], [22, 8], [15, 15], [8, 22], [22, 22]], 6: [[9, 8], [21, 8], [9, 15], [21, 15], [9, 22], [21, 22]] };
  function d6Svg(v) { return '<svg viewBox="0 0 30 30" aria-hidden="true"><rect x="1.5" y="1.5" width="27" height="27" rx="6"/>' + (PIP6[v] || []).map(function (p) { return '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="2.6"/>'; }).join('') + '</svg>'; }
  function d6El(v) { var e = el('span', { class: 'wp-d6', html: d6Svg(v) }); e.setAttribute('role', 'img'); e.setAttribute('aria-label', 'A ' + v + ' on the d6'); return e; }
  // The roll, one piece at a time: the guess is shown and the margin set, the chips come in, both d20s tumble and
  // land with their totals, the winner's side lights, his card slides up with the row he reads lit, and his own die's
  // number lands on its range. A ground out or fly out to a fielder out of position rolls a d20 once more for the error.
  // o.head: stop once the throw is decided and ask the strikeout artist's question (askBox); o.tail: carry on from
  // there on the panel already drawn (a second roll first, when he asked for one)
  function rollShow(ab, done, o) {
    o = o || {};
    var d = o.tail ? V.duel.querySelector('.wp-rl') : null;
    if (!d) {
      o.tail = false; V.root.classList.add('rolling'); V.hand.innerHTML = '';
      paintMatchup();
      V.duel.innerHTML = ''; d = rollEl(ab, true); V.duel.appendChild(d);
    }
    var x = ab.roll, x0 = ab.roll0 || x, q = function (s) { return d.querySelector(s); }, qa = function (s) { return d.querySelectorAll(s); };
    var guess = q('.rl-guess'), need = q('.rl-need'), chips = qa('.rl-c'), dice = qa('.rl-roll .wp-d20'), tots = qa('.rl-tot'), by = q('.rl-by'), card = q('.rl-card');
    var t = 80;
    if (!o.tail) {
    later(function () { guess.classList.add('in'); Kit.sfx('flip'); Kit.haptic(ab.guess ? 'medium' : 'light'); }, t);
    t += 420;
    later(function () { need.classList.add('in'); Kit.sfx('tick'); }, t);
    t += 300;
    chips.forEach(function (c, i) { later(function () { c.classList.add('in'); Kit.sfx('chip'); }, t + i * 180); });
    t += chips.length * 180 + 120;
    later(function () { dice.forEach(function (e) { e.classList.add('rolling'); spin(e, 20); }); Kit.sfx('roll'); Kit.haptic('light'); }, t);
    t += 900;
    later(function () {
      var vals = x0.bdice.concat([x0.pd]);
      dice.forEach(function (e, i) { e.classList.remove('rolling'); e.classList.add('landed'); e.querySelector('b').textContent = String(vals[i]); });
      tots.forEach(function (e) { e.classList.add('in'); });
      Kit.haptic('medium');
      if (x0.bd === 20) { Kit.callout('Natural 20'); Kit.sfx('sparkle'); }
    }, t);
    t += 520;
    later(function () {
      by.classList.add('in'); d.classList.add('decided');
      var mu = V.mu.querySelector(x0.win ? '.mu.b' : '.mu.p'); if (mu) mu.classList.add('won');
      Kit.sfx(x0.win ? 'good' : 'tick');
    }, t);
    t += 520;
    }
    if (o.head) { later(function () { if (S.g.ab === ab && ab.ask) { d.classList.add('asking'); d.appendChild(askBox(ab)); Kit.sfx('pop'); Kit.haptic('medium'); } }, t); return; }
    // the strikeout artist's second roll: the batter's die tumbles again, lands, and the throw is decided again
    if (ab.roll0) {
      var bdice = qa('.rl-side.b .wp-d20'), btot = q('.rl-side.b .rl-tot');
      later(function () {
        q('.rl-say').textContent = cap(nameOf(S.C[ab.p])) + ' makes ' + nameOf(S.C[ab.b]) + ' roll again.';
        d.classList.remove('decided'); by.classList.remove('in');
        bdice.forEach(function (e) { e.classList.remove('landed', 'n20', 'lost'); e.classList.add('rolling'); spin(e, 20); });
        Kit.sfx('roll'); Kit.haptic('medium');
        var mu = V.mu.querySelector('.mu.b'); if (mu) mu.classList.remove('won');
      }, t + 200);
      t += 1300;
      later(function () {
        bdice.forEach(function (e, i) { e.classList.remove('rolling'); e.classList.add('landed'); e.querySelector('b').textContent = String(x.bdice[i]); if (x.bdice.length > 1 && x.bdice[i] !== x.bd) e.classList.add('lost'); });
        btot.textContent = String(x.bt); by.textContent = byText(x); by.classList.add('in');
        d.classList.toggle('bwin', x.win); d.classList.toggle('pwin', !x.win); d.classList.add('decided');
        var mu = V.mu.querySelector(x.win ? '.mu.b' : '.mu.p'); if (mu) mu.classList.add('won');
        Kit.sfx(x.win ? 'good' : 'bad'); Kit.haptic(x.win ? 'medium' : 'success');
        var nc = cardPart(ab, true); card.replaceWith(nc); card = nc; fitFaces(d);
      }, t);
      t += 700;
    }
    // the winner's card comes up; for a batter the guess lights his row, and the caption says which die it is
    later(function () { card.classList.add('in'); var rw = d.querySelector('.rl-row.this'); if (rw) rw.classList.add('on'); if (x.win) { d.querySelector('.rl-say').textContent = ab.say; Kit.sfx(ab.guess ? 'sparkle' : 'tick'); } }, t);
    t += x.win ? 1200 : 450;
    // the winner's own die lands on its range on his card, and the range lights
    later(function () {
      var row = d.querySelector('.rl-row.this'), pin = row.querySelector('.rg-pin');
      pin.firstChild.textContent = String(x.die); pin.style.left = ((x.die - .5) / 20 * 100).toFixed(2) + '%'; pin.classList.add('in');
      Kit.sfx('pop');
    }, t);
    t += 520;
    later(function () {
      var row = d.querySelector('.rl-row.this'), r = row.querySelector('.rg-r[data-lo="' + x.range[0] + '"]'); if (r) r.classList.add('lit');
      if (x.why === 'slug') { q('.rl-ch').appendChild(slugMark()); Kit.callout('Feared slugger'); Kit.sfx('sparkle'); }
      d.querySelector('.rl-say').textContent = ab.boot ? (S.C[ab.fld].kid ? 'The kid' : last(S.C[ab.fld].name)) + ' is out of position at ' + POSN[ab.where].toLowerCase() + ', so ' + (ab.boot.need === 1 ? 'a 1' : 'a 1, 2 or 3') + ' on the die is an error.' : rollLine(ab, true);
      Kit.haptic('light'); Kit.sfx(E.RANK[x.o] >= E.RANK.S ? 'good' : 'tick');
    }, t);
    t += 750;
    if (ab.boot) {
      var bd = d20El(ab.boot.face); bd.classList.add('boot'); q('.rl-ch').appendChild(bd);
      later(function () { bd.classList.add('in', 'rolling'); spin(bd, 20); Kit.sfx('roll'); }, t);
      t += 800;
      later(function () { bd.classList.remove('rolling'); bd.classList.add('landed'); bd.querySelector('b').textContent = String(ab.boot.face); d.querySelector('.rl-say').textContent = rollLine(ab, true); if (ab.o === 'E') { Kit.sfx('bad'); Kit.haptic('heavy'); } }, t);
      t += 1300;
    }
    // the base-running d6, where the printed rule rolls one (a double play, a tag from third, first to third on a
    // single, first to home on a double): the caption says what it needs, the die tumbles and lands, and says what it did
    var rl = ab.res && ab.res.roll;
    if (rl) {
      var rd = d6El(rl.d); rd.classList.add('run'); q('.rl-ch').appendChild(rd);
      later(function () { d.querySelector('.rl-say').textContent = runSay(ab, false); rd.classList.add('in', 'rolling'); spin6(rd); Kit.sfx('roll'); Kit.haptic('light'); }, t);
      t += 1500;
      later(function () {
        rd.classList.remove('rolling'); rd.classList.add('landed'); rd.innerHTML = d6Svg(rl.d);
        d.querySelector('.rl-say').textContent = runSay(ab, true);
        var good = rl.k === 'dp' ? !rl.ok : rl.ok;   // good for the batting side
        if (rl.k === 'dp' && rl.ok) { Kit.sfx('bad'); Kit.haptic('heavy'); } else { Kit.sfx(good ? 'good' : 'tick'); Kit.haptic('medium'); }
      }, t);
      t += 1500;
    }
    later(done, t);
  }
  function spin6(e) {
    var k = 0;
    (function tick() { if (!e.classList.contains('rolling') || k++ > 30) return; e.innerHTML = d6Svg(1 + Math.floor(Math.random() * 6)); setTimeout(tick, FAST ? 5 : 80); })();
  }
  // a die tumbling shows numbers flicking past until it lands
  function spin(e, n) {
    var b = e.querySelector('b'), k = 0;
    (function tick() { if (!e.classList.contains('rolling') || k++ > 30) return; b.textContent = String(1 + Math.floor(Math.random() * n)); setTimeout(tick, FAST ? 5 : 70); })();
  }
  // the end of an inning: the pitcher's Tired chip comes up beside his Arm
  function tireShow(v) {
    var box = V && V.mu && V.mu.querySelector('.mu.p .mu-nums'); if (!box) return;
    var old = box.querySelector('.wp-num.tired'); if (old) old.remove();
    var ch = numChip('Tired', v, '#ff9f2e'); ch.classList.add('tired', 'pop');
    box.insertBefore(ch, box.children[1] || null);
  }
  function paintHand() {
    var g = S.g, ab = g.ab; V.hand.innerHTML = '';
    if (S.phase !== 'play' || !ab || ab.step === 'reveal' || ab.step === 'ibb' || ab.busy || ab.cover) return;
    // the human whose decision it is: their hand and their manager moves
    var t = ab.step === 'pitch' ? ft() : bt(); if (S.T[t].cpu) return;
    var T = S.T[t];
    T.hand.forEach(function (h) {
      if (!playable(t, h)) return;
      var who = h.k === 'dup' ? S.C[h.of] : h.k === 'as' || h.k === 'rb' || h.k === 'err' ? S.C[h.id] : null;
      V.hand.appendChild(el('button', { type: 'button', class: 'wp-hc', onclick: function () {
        Kit.confirm(C.SPECIAL[h.k].say, { ok: 'Play it' }).then(function (ok) { if (ok) usePlay(t, h); });
      } }, [el('span', { class: 'k', text: C.SPECIAL[h.k].name }), el('b', { text: C.SPECIAL[h.k].play + (who ? ': ' + last(who.name) : '') })]));
    });
    // the milestone powers before a pitch: steal with a base stealer, walk a feared slugger on purpose
    var so = t === bt() && ab.step === 'look' ? stealOpt() : null;
    if (so) V.hand.appendChild(el('button', { type: 'button', class: 'wp-hc pw', onclick: function () { doSteal(so); } }, [el('span', { class: 'k', text: E.PNAME2.steal }), el('b', { text: 'Steal ' + BASEW[so.i + 1] + ': ' + last(S.C[so.id].name) })]));
    if (t === ft() && canWalk()) V.hand.appendChild(el('button', { type: 'button', class: 'wp-hc pw', onclick: function () { walkOnPurpose(); } }, [el('span', { class: 'k', text: E.PNAME2.slug }), el('b', { text: 'Walk ' + last(S.C[ab.b].name) + ' on purpose' })]));
    if (t === bt() && T.bench.length && ab.step === 'look') V.hand.appendChild(el('button', { type: 'button', class: 'wp-hc mv', onclick: function () { benchSheet(); } }, [el('span', { class: 'k', text: 'Manager' }), el('b', { text: 'Pinch hit' })]));
  }
  function benchSheet() {
    var T = S.T[bt()], box = el('div', { class: 'wp-res' }), sh, now = S.C[S.g.ab.b];
    T.bench.forEach(function (id) { var c = S.C[id], r = rr(c); box.appendChild(el('button', { type: 'button', class: 'wp-hit', onclick: function () { sh.close(); pinchHit(id); } }, [el('b', { text: c.name }), el('span', { text: (POSN[c.pos[0]] || 'Utility') + ', Bat ' + sgn(r.bat) + ', ' + E.CNAME[r.card].toLowerCase() + (r.pw ? ', ' + E.PNAME2[r.pw].toLowerCase() : '') }), el('i', { text: c.year ? String(c.year) : '' })])); });
    sh = Kit.sheet({ title: 'Bat for ' + now.name + ' (Bat ' + sgn(rr(now).bat) + ')', node: box, actions: [{ label: 'Cancel' }] });
  }

  // ── The play, animated ───────────────────────────────────────────────────
  function animatePlay(ab, done) {
    paintPlay();
    var o = ab.o, svg = V.svg, fl = svg && svg.querySelector('.flight');
    later(function () {
      var tail = 0;
      if (/^(S|D|T|HR|GB|FB|LD|PU|E)$/.test(o)) {
        crack(o === 'HR');
        var dest = ballSpot(ab);
        if (fl && !FAST) {
          var ball = svgEl('circle', { r: 4.5, class: 'ball', fill: '#fff' }); fl.innerHTML = ''; fl.appendChild(ball);
          var t0 = performance.now(), dur = o === 'HR' ? 1300 : o === 'GB' ? 600 : 900, peak = o === 'GB' ? 4 : o === 'LD' ? 18 : o === 'PU' ? 120 : 70 + (o === 'HR' ? 60 : 0);
          (function step(now) {
            var k = Math.min(1, (now - t0) / dur), x = HOME.x + (dest.x - HOME.x) * k, y = HOME.y - 6 + (dest.y - HOME.y + 6) * k - Math.sin(k * Math.PI) * peak;
            ball.setAttribute('cx', x.toFixed(1)); ball.setAttribute('cy', y.toFixed(1)); ball.setAttribute('r', (4.5 + Math.sin(k * Math.PI) * (peak / 30)).toFixed(1));
            if (k < 1) requestAnimationFrame(step); else setTimeout(function () { ball.remove(); }, 400);
          })(t0);
        }
        tail = o === 'HR' ? 1300 : 800;
      } else if (o === 'K') { mitt(); tail = 300; } else { tail = 300; }
      later(function () {
        paintBoard(); paintRunners(ab.res.scored); paintField();
        var g = S.g, big = ab.hi.length;
        if (o === 'HR') { roar(1, 3); Kit.haptic('success'); }
        else if (ab.res.scored.length) { roar(.6, 1.8); Kit.sfx('good'); }
        else if (/^(S|D|T)$/.test(o)) { roar(.35, 1.2); Kit.sfx('pop'); }
        else if (o === 'K') { Kit.sfx('bad'); }
        else if (o === 'E') { ooh(); Kit.sfx('bad'); }
        else Kit.sfx('tick');
        if (ab.res.scored.length) { var r = V.sb.querySelectorAll('tr')[bt() === S.home ? 2 : 1]; if (r) { r.classList.remove('bump'); void r.offsetWidth; r.classList.add('bump'); } }
        done();
      }, tail);
    }, 200);
  }
  function ballSpot(ab) {
    var o = ab.o, r = rand;
    if (o === 'HR') { var a = (r() - .5) * 80; return spot(a, fenceFt(a) + 40); }
    if (ab.where && FPOS[ab.where]) { var q = FPOS[ab.where]; return { x: q.x + (r() - .5) * 18, y: q.y + (r() - .5) * 14 }; }
    var a2 = (r() - .5) * 84, ft2 = o === 'S' ? 200 : o === 'D' ? 300 : o === 'T' ? 330 : 120;
    return spot(a2, ft2);
  }

  // ── Ballpark sounds, synthesized (the old Sandlot's) ──────────────────────
  var actx = null, nb = null;
  function on() { try { return localStorage.getItem('gn_sound') !== '0'; } catch (e) { return true; } }
  function ac() { if (!on()) return null; if (!actx) { var A = window.AudioContext || window.webkitAudioContext; if (!A) return null; try { actx = new A(); } catch (e) { return null; } } if (actx.state === 'suspended') actx.resume(); return actx; }
  function nbuf(c) { if (nb) return nb; var n = Math.floor(c.sampleRate * 2), b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0), l = 0; for (var i = 0; i < n; i++) { var w = Math.random() * 2 - 1; l = l * .62 + w * .38; d[i] = l * 1.7; } return (nb = b); }
  function noise(t0, dur, vol, type, freq, q, attack, loop) {
    var c = ac(); if (!c) return null;
    var s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), t = c.currentTime + t0;
    s.buffer = nbuf(c); s.loop = !!loop; f.type = type; f.frequency.value = freq; f.Q.value = q || 1;
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + (attack || .004)); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(c.destination); s.start(t, Math.random() * 1.5); s.stop(t + dur + .05);
    return { f: f, g: g, t: t };
  }
  function tone(freq, t0, dur, type, vol, to) {
    var c = ac(); if (!c) return;
    var o = c.createOscillator(), g = c.createGain(), t = c.currentTime + t0;
    o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t); if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .012); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + .03);
  }
  function crack(big) { noise(0, .05, big ? .55 : .38, 'highpass', 1700, .7, .001); tone(big ? 1050 : 1400, 0, .06, 'triangle', .07, 600); noise(0, .14, .12, 'bandpass', 520, 1.4, .002); }
  function mitt() { noise(0, .08, .45, 'lowpass', 420, .8, .001); tone(150, 0, .08, 'sine', .14, 80); }
  function roar(level, dur) { var c = ac(); if (!c) return; [[620, .5, 1], [1250, .7, .45], [2400, .9, .18]].forEach(function (b) { var n = noise(0, dur, .32 * level * b[2], 'bandpass', b[0], b[1], .25, true); if (!n) return; n.f.frequency.setValueAtTime(b[0] * .9, n.t); n.f.frequency.linearRampToValueAtTime(b[0] * 1.08, n.t + dur * .4); }); }
  function ooh() { var n = noise(0, 1.1, .16, 'bandpass', 420, 3, .15); if (!n) return; n.f.frequency.setValueAtTime(380, n.t); n.f.frequency.linearRampToValueAtTime(720, n.t + .45); n.f.frequency.linearRampToValueAtTime(520, n.t + 1.05); }
  function organ() { [[392, 0, .14], [523, .15, .14], [659, .3, .14], [784, .45, .32], [659, .85, .14], [784, 1.0, .6]].forEach(function (n) { [1, 2, 3].forEach(function (h, i) { tone(n[0] * h, n[1], n[2] + .05, 'sine', [.07, .035, .02][i]); }); }); }

  // ── The end ──────────────────────────────────────────────────────────────
  function endGame(walkoff, ab) {
    var g = S.g; S.phase = 'over'; g.ab = null; g.wo = !!walkoff;
    var win = g.R[0] > g.R[1] ? 0 : 1, lose = 1 - win;
    // a no-hitter: the losing side never got a hit
    if (g.H[lose] === 0) { var nh = S.T[win]; var arms = Object.keys(g.ps).filter(function (id) { return teamOf(id) === win; }); var nm = arms.map(function (id) { return S.C[id].kid ? 'a sandlot kid' : S.C[id].name; }); g.nohit = nm.length > 1 ? nm.slice(0, -1).join(', ') + ' and ' + nm[nm.length - 1] : nm[0]; g.nohit = g.nohit.charAt(0).toUpperCase() + g.nohit.slice(1); g.hl.unshift(g.nohit + (nm.length > 1 ? ' combined on a no-hitter.' : ' threw a no-hitter.')); }
    if (walkoff) { Kit.confetti(); Kit.moment({ big: true, title: 'Walk-off', line: say('walkoff', { name: ab ? S.C[ab.b].name : '' }), icon: 'trophy', color: S.T[win].color }); organ(); roar(1, 3.5); }
    else if (g.nohit) { Kit.confetti(); Kit.moment({ big: true, title: 'A no-hitter', line: say('noHit', { pit: g.nohit }), icon: 'trophy', color: S.T[win].color }); organ(); }
    // the league keeps every card's numbers
    var Lg = league(); Lg.games = (Lg.games || 0) + 1;
    Object.keys(g.st).forEach(function (id) { var c = S.C[id]; if (!c.lid || !Lg.cards[c.lid]) return; var x = Lg.cards[c.lid].h || (Lg.cards[c.lid].h = { g: 0, ab: 0, h: 0, hr: 0, rbi: 0, bb: 0, k: 0, r: 0 }); var s = g.st[id]; x.g++; ['ab', 'h', 'hr', 'rbi', 'bb', 'k', 'r'].forEach(function (k) { x[k] += s[k] || 0; }); });
    Object.keys(g.ps).forEach(function (id) { var c = S.C[id]; if (!c.lid || !Lg.cards[c.lid]) return; var x = Lg.cards[c.lid].p || (Lg.cards[c.lid].p = { g: 0, bf: 0, outs: 0, h: 0, r: 0, bb: 0, k: 0, w: 0, l: 0 }); var s = g.ps[id]; x.g++; ['bf', 'outs', 'h', 'r', 'bb', 'k'].forEach(function (k) { x[k] += s[k] || 0; }); });
    var wp = g.pit[win], lp = g.pit[lose]; if (S.C[wp].lid && Lg.cards[S.C[wp].lid] && Lg.cards[S.C[wp].lid].p) Lg.cards[S.C[wp].lid].p.w++; if (S.C[lp].lid && Lg.cards[S.C[lp].lid] && Lg.cards[S.C[lp].lid].p) Lg.cards[S.C[lp].lid].p.l++;
    saveLeague();
    record(win);
    clearSave(); S.phase = 'over';
    try { localStorage.setItem(SAVE, JSON.stringify(S)); } catch (e) {}
    Kit.resume.clear();
    paintPlay();
    later(showWin, walkoff || g.nohit ? 3000 : 900);
  }
  function record(win) {
    var g = S.g, aw = 1 - S.home;
    function tm(t) {
      var T = S.T[t];
      var bats = T.order.concat(T.out || []).filter(function (id) { return g.st[id]; }).map(function (id) { var s = g.st[id], c = S.C[id]; return [c.kid ? 'Sandlot kid' : c.name, T.at[id] || 'PH', s.ab, s.r, s.h, s.hr, s.rbi, s.bb, s.k, T.out && T.out.indexOf(id) >= 0 ? 1 : 0].join('|'); });
      var arms = Object.keys(g.ps).filter(function (id) { return teamOf(id) === t; }).map(function (id) { var s = g.ps[id], c = S.C[id]; return [c.name, s.outs, s.h, s.r, s.bb, s.k, s.hr, s.pc].join('|'); });
      return { n: T.name, c: T.color, l: g.line[t].join(','), r: g.R[t], h: g.H[t], e: g.E[t], b: bats, p: arms };
    }
    var hx = []; // half-inning by half-inning from the plays
    var detail = { wp: 2, home: S.home, inn: S.inn, wo: g.wo ? 1 : 0, tm: [tm(0), tm(1)], plays: g.plays.slice(-12), duel: g.duels.slice(0, 2), nh: g.nohit || '', n20: g.n20 || 0,
      sb: g.sb ? g.sb[0] + g.sb[1] : 0, cs: g.cs ? g.cs[0] + g.cs[1] : 0, ibb: g.ibb ? g.ibb[0] + g.ibb[1] : 0, vals: S.vals === 'shoe' ? 1 : 0 };
    var hl = g.hl.slice(0, 10);
    hl.push('Batters guessed the pitch ' + g.duels[0] + ' times and were fooled ' + g.duels[1] + ' times.');
    Kit.record(HKEY, {
      started: S.started, mode: S.mode === 'cpu' ? 'vs Computer (' + ({ easy: 'Easy', normal: 'Normal', hard: 'Hard' })[S.level] + ')' : 'Pass & play',
      players: S.T.map(function (T, t) { return { name: T.name, score: g.R[t], cpu: T.cpu }; }), winner: S.T[win].name,
      highlights: hl, detail: detail
    });
  }
  function showWin() {
    var g = S.g, win = g.R[0] > g.R[1] ? 0 : 1, W = S.T[win], lose = W.cpu && !S.T[1 - win].cpu;
    var pic = el('div', { class: 'wp-winline' }); var tb = V && V.sb && V.sb.querySelector('.wp-line'); if (tb) pic.appendChild(tb.cloneNode(true));
    var stars = starOf();
    Kit.win({
      icon: lose ? 'bot' : 'trophy', lose: lose,
      title: lose ? W.name + ' wins this one' : W.name === 'You' ? 'You win!' : W.name + ' win!',
      sub: S.T[win].name + ' ' + g.R[win] + ', ' + S.T[1 - win].name + ' ' + g.R[1 - win] + (g.line[0].length > S.inn ? ' in ' + g.line[0].length + ' innings' : '') + (stars ? ' · ' + stars : ''),
      pic: pic,
      rank: S.T.map(function (T, t) { return { name: T.name, score: g.R[t], color: T.color, cpu: T.cpu }; }).sort(function (a, b) { return b.score - a.score; }),
      again: function () { rematch(); },
      look: true,
      extra: [{ label: 'Box score', onClick: function () { boxSheet(); } }, { label: 'Your league', onClick: function () { leagueSheet(); } }],
      setup: function () { clearSave(); showSetup(); }, setupLabel: 'New stack'
    });
  }
  function starOf() {
    var g = S.g, best = null;
    Object.keys(g.st).forEach(function (id) { var s = g.st[id], v = s.h * 2 + s.hr * 4 + s.rbi * 1.5 + s.bb; if (!best || v > best.v) best = { id: id, v: v, s: s }; });
    if (!best || best.s.h < 2 && !best.s.hr) return '';
    var s = best.s; return S.C[best.id].name + ' went ' + s.h + ' for ' + s.ab + (s.hr ? ' with ' + (s.hr === 1 ? 'a home run' : s.hr + ' home runs') : '');
  }
  function rematch() {
    snap();
    S.phase = 'play'; S.home = 1 - S.home; S.started = Date.now(); Kit.gameStart();
    S.T.forEach(function (T) { if (T.out) { T.out.forEach(function (id) { if (T.bench.indexOf(id) < 0) T.bench.push(id); }); } T.out = []; T.used = []; T.hand.forEach(function (h) { h.used = false; }); });
    startGame();
  }

  // ── The box score and the league ─────────────────────────────────────────
  function boxSheet() {
    var g = S.g, box = el('div', { class: 'wp-box' });
    var tb = V && V.sb && V.sb.querySelector('.wp-line'); if (tb) box.appendChild(tb.cloneNode(true));
    [1 - S.home, S.home].forEach(function (t) {
      var T = S.T[t];
      box.appendChild(el('h3', { text: T.name }));
      var tab = el('table', { class: 'wp-bx' }), hr = el('tr', {}, [el('th', { text: '' })]);
      ['AB', 'R', 'H', 'HR', 'RBI', 'BB', 'K'].forEach(function (x) { hr.appendChild(el('th', { text: x })); }); tab.appendChild(hr);
      T.order.concat(T.out || []).forEach(function (id) { var s = g.st[id] || {}, c = S.C[id]; var tr = el('tr', {}, [el('td', { class: 'n', text: (c.kid ? 'Sandlot kid' : c.name) + ' ' + (T.at[id] || 'PH') })]); ['ab', 'r', 'h', 'hr', 'rbi', 'bb', 'k'].forEach(function (k) { tr.appendChild(el('td', { text: String(s[k] || 0) })); }); tab.appendChild(tr); });
      box.appendChild(tab);
      var pt = el('table', { class: 'wp-bx' }), ph = el('tr', {}, [el('th', { text: 'Pitching' })]); ['IP', 'H', 'R', 'BB', 'K'].forEach(function (x) { ph.appendChild(el('th', { text: x })); }); pt.appendChild(ph);
      Object.keys(g.ps).filter(function (id) { return teamOf(id) === t; }).forEach(function (id) { var s = g.ps[id]; var tr = el('tr', {}, [el('td', { class: 'n', text: S.C[id].name })]); [Math.floor(s.outs / 3) + '.' + s.outs % 3, s.h, s.r, s.bb, s.k].forEach(function (v) { tr.appendChild(el('td', { text: String(v) })); }); pt.appendChild(tr); });
      box.appendChild(pt);
    });
    Kit.sheet({ title: 'Box score', node: box, actions: [{ label: 'Done' }] });
  }
  function leagueSheet() {
    var Lg = league(), ids = Object.keys(Lg.cards);
    var box = el('div', { class: 'wp-lg' });
    if (!ids.length) { box.appendChild(el('p', { class: 'wp-note', text: 'Your league starts with the first card you enter. Every card stays here with its numbers from your games.' })); return Kit.sheet({ title: 'Your league', node: box, actions: [{ label: 'Done' }] }); }
    box.appendChild(el('p', { class: 'wp-sub', text: ids.length + (ids.length === 1 ? ' card' : ' cards') + ' in your league, ' + (Lg.games || 0) + (Lg.games === 1 ? ' game played.' : ' games played.') }));
    function board(title, list, val) {
      if (!list.length) return;
      box.appendChild(el('h3', { text: title }));
      var ol = el('ol', { class: 'wp-lb' });
      list.slice(0, 5).forEach(function (k) { var x = Lg.cards[k]; ol.appendChild(el('li', {}, [el('span', { text: x.n + (x.y ? ', ' + x.y : '') }), el('b', { text: val(x) })])); });
      box.appendChild(ol);
    }
    var hitters = ids.filter(function (k) { return Lg.cards[k].h && Lg.cards[k].h.ab; }), arms = ids.filter(function (k) { return Lg.cards[k].p && Lg.cards[k].p.bf; });
    board('Home runs', hitters.filter(function (k) { return Lg.cards[k].h.hr; }).sort(function (a, b) { return Lg.cards[b].h.hr - Lg.cards[a].h.hr; }), function (x) { return String(x.h.hr); });
    board('Batting average (10 at-bats or more)', hitters.filter(function (k) { return Lg.cards[k].h.ab >= 10; }).sort(function (a, b) { return Lg.cards[b].h.h / Lg.cards[b].h.ab - Lg.cards[a].h.h / Lg.cards[a].h.ab; }), function (x) { return avg3(x.h.h / x.h.ab); });
    board('Strikeouts', arms.sort(function (a, b) { return Lg.cards[b].p.k - Lg.cards[a].p.k; }), function (x) { return String(x.p.k); });
    board('Wins', arms.filter(function (k) { return Lg.cards[k].p.w; }).sort(function (a, b) { return Lg.cards[b].p.w - Lg.cards[a].p.w; }), function (x) { return String(x.p.w); });
    box.appendChild(el('h3', { text: 'Every card' }));
    var all = el('div', { class: 'wp-lgall' });
    ids.sort(function (a, b) { return String(Lg.cards[a].n).localeCompare(Lg.cards[b].n); }).forEach(function (k) {
      var x = Lg.cards[k], line = x.h && x.h.ab ? avg3(x.h.h / x.h.ab) + ', ' + x.h.hr + ' HR in ' + x.h.g + (x.h.g === 1 ? ' game' : ' games') : x.p && x.p.bf ? x.p.k + ' K in ' + x.p.g + (x.p.g === 1 ? ' game' : ' games') : x.k !== 'player' ? (C.SPECIAL[x.k] ? C.SPECIAL[x.k].play : '') : 'No games yet';
      all.appendChild(el('div', { class: 'wp-lgr' }, [el('b', { text: x.n + (x.y ? ', ' + x.y : '') }), el('span', { text: line })]));
    });
    box.appendChild(all);
    Kit.sheet({ title: 'Your league', node: box, actions: [{ label: 'Done' }] });
  }

  // ── Print the table cards: the reference page, pitch cards, each team's pitching card, and a sleeve label for every
  // card in the league, so a game can be played at a table with two d20s, a d6 and no device ─────────────────
  var PLONG = { K: 'Strikeout', G: 'Ground out', F: 'Fly out', BB: 'Walk', S: 'Single', D: 'Double', T: 'Triple', HR: 'Home run' };
  function printRow(card, row) {
    return '<div class="pr-row">' + E.ranges(card, row).map(function (x) { return '<span class="f-' + x[2] + '" style="flex:' + (x[1] - x[0] + 1) + ' 1 0"><i>' + (x[0] === x[1] ? x[0] : x[0] + '\u2013' + x[1]) + '</i>' + (x[1] - x[0] < 2 ? FSH[x[2]] : PLONG[x[2]]) + '</span>'; }).join('') + '</div>';
  }
  function labelHtml(c) {
    var r = rr(c), yr = c.year ? String(c.year) : '', team = c.team || '';
    var head = '<div class="pl-h"><b>' + esc(c.kid ? 'Sandlot kid' : c.name) + '</b><span>' + esc([yr, team].filter(Boolean).join(' ')) + '</span></div>';
    var pw = r.pw ? '<div class="pl-p"><b>' + E.PNAME2[r.pw] + '</b> ' + esc(E.powerLabel(r.pw)) + '</div>' : '';
    if (c.role === 'p') return '<div class="pl">' + head + '<div class="pl-n"><span>Arm <b>' + sgn(r.arm) + '</b></span><span>Pitch cards <b>' + r.np + '</b></span><span class="t">' + E.CNAME[r.card] + '</span></div>' + printRow(r.card) + pw + '</div>';
    return '<div class="pl">' + head + '<div class="pl-n"><span>Bat <b>' + sgn(r.bat) + '</b></span><span class="t">' + E.CNAME[r.card] + '</span></div>' +
      '<div class="pl-r"><em>Guessed right</em>' + printRow(r.card, 'right') + '</div><div class="pl-r"><em>Guessed wrong</em>' + printRow(r.card, 'wrong') + '</div>' + pw + '</div>';
  }
  function printSheet(noPrint) {
    return db().then(function () {
      var keep = S, cards = [], seen = {};
      if (!S) S = { cn: 0, C: {}, inn: 9 };
      if (keep && keep.C) Object.keys(keep.C).forEach(function (id) { var c = keep.C[id]; if (c.kind !== 'player' || c.kid) return; var k = c.lid || id; if (seen[k]) return; seen[k] = 1; cards.push(c); });
      var Lg = league(); Object.keys(Lg.cards).forEach(function (lid) { if (seen[lid] || Lg.cards[lid].k !== 'player') return; seen[lid] = 1; try { cards.push(fromLeague(lid, true)); } catch (e) {} });
      cards.sort(function (a, b) { return (a.role === b.role ? 0 : a.role === 'p' ? 1 : -1) || String(last(a.name)).localeCompare(last(b.name)); });
      var inn = keep && keep.inn || 9;
      S = keep;
      var st = E.stints(inn), stTxt = st.map(function (n, i) { var a = 1; for (var k = 0; k < i; k++) a += st[k]; return a === a + n - 1 ? 'inning ' + a : 'innings ' + a + '–' + (a + n - 1); });
      var h = '<section class="pr-page pr-ref"><h1>Wax Pack at the table</h1>' +
        '<p class="pr-lead">You need two d20s (one for each side), a d6 for where an out goes and for the runners, the pitch cards below, and a label in each card’s sleeve.</p>' +
        '<h2>Every at-bat</h2><ol>' +
        '<li>The pitcher lays one of his pitch cards face down. His label says how many he holds.</li>' +
        '<li>The batter names the pitch he’s looking for.</li>' +
        '<li>Before the pitch, a base stealer on base may steal, and the pitcher may walk a feared slugger on purpose (the next page has the milestone powers).</li>' +
        '<li>Both roll a d20. The batter adds his Bat, the pitcher adds his Arm, and a milestone power may add 1 or 2.</li>' +
        '<li>If the batter’s total beats the pitcher’s by <b>' + E.RULE.margin + ' or more</b>, the batter wins the at-bat. Otherwise the pitcher wins it.</li>' +
        '<li>Turn the pitch card over. The winner reads his own die (the number he rolled, not his total) on his own label: a batter who named the pitch reads his Guessed right row, a batter who didn’t reads his Guessed wrong row, and a pitcher reads his one row.</li></ol>' +
        '<h2>Outs in play</h2><p>A ground out or a fly out goes to a fielder. Roll the d6:</p>' +
        '<table class="pr-t"><tr><th></th><th>1</th><th>2</th><th>3</th><th>4</th><th>5</th><th>6</th></tr>' +
        '<tr><th>Ground out</th>' + E.WHERE6.G.map(function (p) { return '<td>' + p + '</td>'; }).join('') + '</tr>' +
        '<tr><th>Fly out</th>' + E.WHERE6.F.map(function (p) { return '<td>' + p + '</td>'; }).join('') + '</tr></table>' +
        '<p>A fielder playing a position he didn’t play rolls a d20: at a nearby position (another outfield spot, across second base, the other corner) a 1 is an error; anywhere else a 1, 2 or 3 is an error.</p>' +
        '<h2>Pitchers</h2><p>Each team pitches three pitchers, each for a fixed stint: in a ' + inn + '-inning game the first pitches ' + stTxt[0] + ', the second ' + stTxt[1] + ' and the third ' + stTxt[2] + ', and the third also pitches any extra innings. A pitcher in the third inning of his stint is −1, and another −1 for each inning after that. A workhorse never tires.</p>' +
        '<h2>Running the bases</h2><p>Where a line gives numbers, roll the d6. A speedster is a player whose label says Speedster.</p>' +
        '<table class="pr-t pr-run">' + E.runLines().map(function (l) { return '<tr><th>' + l[0] + '</th><td>' + l[1] + '</td></tr>'; }).join('') + '</table>' +
        '<h2>Odd cards, each played once</h2><ul>' + Object.keys(C.SPECIAL).map(function (k) { return '<li><b>' + esc(C.SPECIAL[k].name) + '</b>: ' + esc(C.SPECIAL[k].say) + '</li>'; }).join('') + '<li><b>Rookie card</b>: +1 in his first at-bat.</li></ul></section>';
      // the Shoebox chart and the milestone powers: every value read off the back of a card, on one page
      var SL = E.shoeLines(), tr2 = function (a, b) { return '<tr><th>' + a + '</th><td>' + b + '</td></tr>'; };
      h += '<section class="pr-page pr-shoe"><h1>Reading a card back</h1>' +
        '<p class="pr-lead">With Shoebox rules, every player’s numbers come from the last season on the back of his card, the season before the card’s year. The milestone powers come from the same season in every game.</p>' +
        '<div class="pr-2"><div><h2>Batters</h2><table class="pr-t pr-k"><tr><th>Batting average</th><th>Bat</th></tr>' + SL.bat.map(function (a) { return '<tr><td>' + a[0] + '</td><td>' + a[1] + '</td></tr>'; }).join('') + '</table>' +
        '<p>The batter’s card is the first one that fits:</p><table class="pr-t pr-run">' + SL.hit.map(function (a) { return tr2(a[0], a[1]); }).join('') + '</table></div>' +
        '<div><h2>Pitchers</h2><table class="pr-t pr-k"><tr><th>ERA</th><th>Arm</th></tr>' + SL.arm.map(function (a) { return '<tr><td>' + a[0] + '</td><td>' + a[1] + '</td></tr>'; }).join('') + '</table>' +
        '<table class="pr-t pr-run">' + SL.pc.map(function (a) { return tr2(a[0], a[1]); }).join('') + '</table>' +
        '<p>The pitcher’s card is the first one that fits:</p><table class="pr-t pr-run">' + SL.pit.map(function (a) { return tr2(a[0], a[1]); }).join('') + '</table></div></div>' +
        '<p>' + SL.short + '</p>' +
        '<h2>Milestone powers, in every game</h2><p>A player gets one power at most. A batter who earns two keeps the first of Feared slugger, Base stealer and Run producer, and a pitcher the first of Closer, Strikeout artist, 20-game winner and Workhorse.</p>' +
        '<table class="pr-t pr-run">' + E.powerLines().map(function (l) { return '<tr><th>' + l[0] + '<br><span>' + l[1] + '</span></th><td>' + l[2] + '</td></tr>'; }).join('') + '</table></section>';
      // the pitch cards (two sets) and each team's pitching card
      h += '<section class="pr-page"><h2>Pitch cards</h2><p class="pr-lead">Cut these out: one set for each team. A pitcher uses as many as his label says, starting from Heat.</p><div class="pr-pc">' +
        [0, 1].map(function () { return E.PITCHES4.map(function (k) { return '<div class="pc"><i>' + PICON[k] + '</i><b>' + E.PNAME[k] + '</b></div>'; }).join(''); }).join('') + '</div>';
      if (keep && keep.T && keep.T[0].arms) {
        h += '<h2>Pitching cards</h2><div class="pr-st">' + keep.T.map(function (T) {
          return '<div class="ps"><b>' + esc(T.name === 'You' ? 'Your pitchers' : T.name + '’s pitchers') + '</b><table>' + T.arms.map(function (id, i) { var c = keep.C[id]; return '<tr><td>' + stTxt[i].replace(/^./, function (x) { return x.toUpperCase(); }) + '</td><td>' + esc(c.kid ? 'Sandlot kid' : c.name) + '</td><td>Arm ' + sgn(rr(c).arm) + '</td></tr>'; }).join('') + '</table></div>';
        }).join('') + '</div>';
      }
      h += '</section>';
      h += '<section class="pr-page pr-labels"><h2>Sleeve labels</h2><div class="pr-lg">' + (cards.length ? cards.map(labelHtml).join('') : '<p>Your league has no cards yet. Add cards to your stack and print again.</p>') + '</div></section>';
      var old = document.querySelector('.wp-print'); if (old) old.remove();
      var box = el('div', { class: 'wp-print', html: h });
      document.body.appendChild(box);
      document.documentElement.classList.add('wp-printing');
      function done() { document.documentElement.classList.remove('wp-printing'); box.remove(); window.removeEventListener('afterprint', done); }
      if (!noPrint) { window.addEventListener('afterprint', done); setTimeout(function () { window.print(); }, 60); }
      return box;
    });
  }

  // ── Test and demo hooks ──────────────────────────────────────────────────
  window.__wax = {
    state: function () { return S; }, db: db, render: render,
    // a stack from the sample cards, the draft and lineups made by the computer for both sides: straight to the game
    quick: function (o) {
      o = o || {};
      return db().then(function () {
        S = { v: 3, mode: o.mode || 'cpu', level: o.level || 'normal', inn: o.inn || 5, size: o.size || 12, vals: o.vals === 'shoe' ? 'shoe' : 'league', seed: o.seed || 7, phase: 'stack', C: {}, cn: 0, stack: [],
          T: [{ name: o.a || 'You', cpu: false, color: Kit.color(0), cards: [] }, { name: o.b || 'Sprocket', cpu: o.mode !== 'local', color: Kit.color(1), cards: [] }] };
        S.started = Date.now();
        R = E.rng(o.seed || 7);
        sampleStack();
        return new Promise(function (res) { setTimeout(res, 50); });
      }).then(function () {
        if (o.to === 'stack') { render(); return S; }
        NOFLIP = true; startDraft(); NOFLIP = false;
        if (o.to === 'draft') { render(); return S; }
        while (!draftDone()) { var t = S.draft.turn, T = S.T[t]; T.cpu = true; var keep = S.level; cpuPickNow(); }
        S.T[0].cpu = false; S.T[1].cpu = o.mode !== 'local';
        toLineup();
        if (o.to === 'lineup') { render(); return S; }
        startGame(); return S;
      });
    },
    choose: choose, ab: function () { return S && S.g && S.g.ab; }, fast: function (v) { FAST = v; },
    // tests: a human's picks made at random, so a whole game plays itself
    auto: function (on) { clearInterval(AUTO); if (on) AUTO = setInterval(function () { var ab = S && S.g && S.g.ab; if (ab && ab.ask && V.duel.querySelector('.rl-ask')) return kartChoose(Math.random() < .5); if (!ab || ab.busy || ab.cover) return; var t = ab.step === 'pitch' ? ft() : ab.step === 'look' ? bt() : -1; if (t >= 0 && !S.T[t].cpu) choose(E.PITCHES[Math.floor(Math.random() * 3)]); }, 60); },
    set: function (fn) { fn(S); save(); render(); },
    first: function (t) { FIRST = t; }, rig: function (r) { RIG = r; },
    finishDraft: function () { if (!S || S.phase !== 'draft') return; clearTimers(); while (!draftDone()) cpuPickNow(); save(); renderDraft(); },
    busy: function () { return !!(S && S.g && S.g.ab && S.g.ab.busy); },
    // tests: a fresh at-bat from the state as it stands (set() first to put runners on or give a card a power)
    newAB: function () { clearTimers(); if (S && S.g) { S.g.ab = null; newAB(); } },
    printSheet: printSheet
  };
  function cpuPickNow() { var t = S.draft.turn, left = draftLeftFor(t); var T = S.T[t]; var pitchers = armsOf(t);
    var best = null; left.forEach(function (id) { var c = S.C[id], r = rr(c), w = c.kind !== 'player' ? 4.6 : c.role === 'p' ? 5.5 + r.arm + (pitchers ? 0 : 1) : 5 + r.bat * 1.15 + (CW[r.card] || 0) * .5; w += R() * .5; if (!best || w > best.w) best = { id: id, w: w }; });
    if (!best) { S.draft.turn = 1 - t; return; }
    T.cards.push(best.id); S.draft.turn = nextPicker(t); }

  // ── Start ────────────────────────────────────────────────────────────────
  var saved = load();
  if (Kit.inDemo()) { app.className = 'stage wp'; }
  else if (saved && saved.phase !== 'over') { S = upgrade(saved); db().then(function () { if (S.phase === 'play' && S.g) { S.g.ab = null; render(); later(newAB, 600); } else render(); }); }
  else showSetup();
})();
