// ═══════════════════════════════════════════════════════════════════════════
// turnnet.js: turn-based games online (window.TurnNet). Each player on their own device, at their own pace:
// take your turn, close the app, come back when it's your move again (the home screen shows "Your turn").
//
// A table is one Firestore doc, turnRooms/{CODE} (4 letters). The whole game lives in it:
//   game      the catalog id (games.js), e.g. 'connectfour'
//   status    'open' (taking players) | 'playing' | 'over' | 'closed'
//   seats     [{name, dev, acct?, lk?, bot?}] in seat order; seat 0 opened the table. bot: the computer plays it
//   accts     the seats' account tags (one-way hashes of their PINs): "your games" on any of your devices
//   turn      [seat indexes] whose move it is now (more than one when moves happen at the same time)
//   drive     the person (seat) who moved last: the computer seats' moves are theirs to make while it's the
//             computer's turn, so the home screen shows that table as "your turn" to them
//   st        the game state (JSON text), seq (one more each move), mv (JSON: the last move, for animating it)
//   opts      the table's settings (JSON), min / max (people), g (game number at this table), t0
//   result    {win: [seats], text} once it's over; hb {seat: last seen}; at; by (the device that wrote last)
//   lk        the host's link tag (seats[0].lk), at the top so the linked people's home screens can find the table
// THE RULE for every turn-based online game (CLAUDE.md): keep seats, accts, turn and drive like this, so the home
// screen can tell whose move it is without knowing the game.
//
// Moves are transactions: the move is checked against the table as it is on the server (only on that seat's turn,
// built again on the newest state if someone else moved first), so two devices can never both move.
// Computer seats: whichever person's device has the table open makes their moves (the transaction keeps it to
// one), so a game with robots carries on as long as someone's looking.
//
// API
//   TurnNet.setup(cfg)    once, from the game. cfg:
//     game, title          catalog id and name
//     min, max             people at the table (min to start)
//     seats(n, opts) -> number   seats in the game for n people (the rest are computer players); default n
//     opts() -> object     the table's settings, from the game's own setup (host, at Start)
//     start(players, opts, last) -> state   a new game: players [{name, bot}] in seat order (last: the game just
//                          finished at this table, for a rematch: series scores, who goes first)
//     turn(state) -> [seat]           whose move it is ([] when over)
//     over(state) -> null | {win: [seats], text}
//     bot(state, seat) -> {state, mv} | Promise   a computer seat's move (needed when seats() adds any)
//     show(net, info)      draw the table: called at the start and after every move (info: {prev, mv, by, mine,
//                          fresh: first draw at this table, again: a new game at the same table})
//     leave()              back to playing on this device
//     resign(state, seat) -> state    optional: a person leaving mid-game (default: the computer takes their seat
//                          when the game has bot(), otherwise the game ends and the others win)
//   TurnNet.open()        the lobby (menu: Play online)
//   TurnNet.menu()        menu items for Kit.init: Play online, Your online game, Leave the online game
//   TurnNet.on()          true while at an online table
//   TurnNet.chips()       an element listing the seats, whose turn it is glowing (games may place it)
//   net (passed to show): {state, seat (yours, -1 watching), seats, code, mv, myTurn(), act(fn), again(), leave(),
//                          result, status}
//     net.act(fn)         your move: fn(state) -> {state, mv} (or null for no move). Shown here at once; written
//                         as a transaction (fn runs again on the newest state if someone else moved first)
//   Tests: window.__tnStore swaps Firestore for another store with the same calls (fireStore below).
// ═══════════════════════════════════════════════════════════════════════════
(function () {
  'use strict';
  if (window.TurnNet) return;
  var COL = 'turnRooms', V = 1, HB = 30000;
  var LS = (function () { try { return window.localStorage; } catch (e) { return null; } })();
  function lsJ(k, d) { try { var v = JSON.parse(LS.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }
  function lsP(k, v) { try { if (v == null) LS.removeItem(k); else LS.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function E(tag, a, kids) { return Kit.el(tag, a, kids); }
  function clone(o) { return o == null ? o : JSON.parse(JSON.stringify(o)); }
  function dev() { return window.Online ? Online.dev() : (lsJ('tn_dev', '') || (function () { var d = Math.random().toString(36).slice(2, 10); lsP('tn_dev', d); return d; })()); }
  function errText(e) { return window.Online && Online.errText ? Online.errText(e) : (e && e.message) || String(e); }
  function dl(m) { try { if (window.FGHSync && FGHSync.log) FGHSync.log('online', m); } catch (e) {} }

  // ── The store: Firestore, or a test's own ──
  function fireStore() {
    function db() { return window.FGHSync && FGHSync.db ? FGHSync.db() : Promise.reject(new Error('Sync isn’t loaded')); }
    function col(d) { return d.collection(COL); }
    function ref(code) { return db().then(function (d) { return col(d).doc(code); }); }
    function list(qs) { var l = []; qs.forEach(function (x) { l.push({ code: x.id, d: x.data() }); }); return l; }
    return {
      ready: function () { return !!(window.FGHSync && FGHSync.isPin && FGHSync.isPin()); },
      pin: function () { return window.FGHSync && FGHSync.pin ? FGHSync.pin() : null; },
      get: function (code) { return ref(code).then(function (r) { return r.get(); }).then(function (sn) { return sn.exists ? sn.data() : null; }); },
      del: function (code) { return ref(code).then(function (r) { return r.delete(); }); },
      // fn(data or null) -> the fields to write (a new doc when there was none), null to write nothing; may throw
      tx: function (code, fn) {
        return db().then(function (d) {
          var r = col(d).doc(code);
          return d.runTransaction(function (t) {
            return t.get(r).then(function (sn) { var had = sn.exists, p = fn(had ? sn.data() : null); if (p) { if (had) t.update(r, p); else t.set(r, p); } return p; });
          });
        });
      },
      watch: function (code, cb, err) {
        var off = null, dead = false;
        ref(code).then(function (r) { if (!dead) off = r.onSnapshot(function (sn) { cb(sn.exists ? sn.data() : null); }, err); }).catch(err);
        return function () { dead = true; if (off) off(); };
      },
      // tables of this game taking players
      open: function (game, cb, err) {
        var off = null, dead = false;
        db().then(function (d) {
          if (dead) return;
          off = col(d).where('game', '==', game).where('status', '==', 'open').limit(30).onSnapshot(function (qs) { cb(list(qs)); }, err);
        }).catch(err);
        return function () { dead = true; if (off) off(); };
      },
      // the tables this account sits at (every game)
      mine: function (tag) { return db().then(function (d) { return col(d).where('accts', 'array-contains', tag).limit(40).get(); }).then(list); }
    };
  }
  var FS = null;
  function store() { return window.__tnStore || FS || (FS = fireStore()); }
  function ready() { try { return !!store().ready(); } catch (e) { return false; } }

  // This account's tag: the same one-way hash of the PIN that Chess, Lorcana and the home screen use (same salt and cache)
  var ACT = {};
  function pinKey(p) { var h = 5381; for (var i = 0; i < p.length; i++) h = ((h << 5) + h + p.charCodeAt(i)) | 0; return 'p' + (h >>> 0).toString(36); }
  function acctTag() {
    var pin = null; try { pin = store().pin(); } catch (e) {}
    var c = window.crypto && window.crypto.subtle;
    if (!pin || !c || typeof TextEncoder === 'undefined') return Promise.resolve(null);
    if (ACT[pin]) return ACT[pin];
    var k = pinKey(pin), saved = lsJ('fgh_acct_tag', null);
    if (saved && saved.k === k && saved.t) return (ACT[pin] = Promise.resolve(saved.t));
    var enc = new TextEncoder();
    return (ACT[pin] = c.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveBits']).then(function (key) {
      return c.deriveBits({ name: 'PBKDF2', salt: enc.encode('fgh-online-account'), iterations: 150000, hash: 'SHA-256' }, key, 64);
    }).then(function (b) {
      var t = Array.prototype.map.call(new Uint8Array(b), function (x) { return ('0' + x.toString(16)).slice(-2); }).join('');
      lsP('fgh_acct_tag', { k: k, t: t });
      return t;
    }).catch(function () { return null; }));
  }
  function linkTag() { return window.Online && Online.myTag ? Online.myTag() : Promise.resolve(null); }
  function meName() {
    var m = lsJ('tn_me', null) || {};
    if (!m.name) { try { m.name = (LS.getItem('my_name') || '').trim(); } catch (e) {} }
    if (!m.name && Kit.knownNames) m.name = Kit.knownNames()[0] || '';
    return m;
  }
  function code4() { var A = 'ABCDEFGHJKLMNPQRSTUVWXYZ', c = ''; for (var i = 0; i < 4; i++) c += A.charAt(Math.floor(Math.random() * A.length)); return c; }
  function ago(ts) {
    var s = Math.max(0, (Date.now() - ts) / 1000), n;
    if (s < 60) return 'just now';
    if (s < 3600) { n = Math.floor(s / 60); return n + ' min ago'; }
    if (s < 86400) { n = Math.floor(s / 3600); return n + (n === 1 ? ' hour ago' : ' hours ago'); }
    n = Math.floor(s / 86400); return n === 1 ? 'yesterday' : n + ' days ago';
  }

  // ── State ──
  var G = null;   // the game's setup
  var T = { code: null, d: null, seat: -1, st: null, seq: -1, mv: null, off: null, hbT: 0, botT: 0, tag: null, wait: null, root: null, wasMine: false, fresh: true, g: 0, busy: false };
  var REM = function () { return 'tn_mine_' + (G ? G.game : ''); };
  function remember(code) { var l = lsJ(REM(), []); if (!Array.isArray(l)) l = []; l = l.filter(function (c) { return c !== code; }); l.unshift(code); lsP(REM(), l.slice(0, 12)); }
  function forget(code) { var l = lsJ(REM(), []); if (Array.isArray(l)) lsP(REM(), l.filter(function (c) { return c !== code; })); }
  function seatOf(d, tag) {
    if (!d || !d.seats) return -1;
    var me = dev(), i;
    for (i = 0; i < d.seats.length; i++) if (d.seats[i] && !d.seats[i].bot && d.seats[i].dev === me) return i;
    if (tag) for (i = 0; i < d.seats.length; i++) if (d.seats[i] && !d.seats[i].bot && d.seats[i].acct === tag) return i;
    return -1;
  }
  function humans(d) { return (d.seats || []).filter(function (s) { return s && !s.bot; }); }
  function turnOf(st) { try { return (G.turn(st) || []).slice(); } catch (e) { return []; } }
  function overOf(st) { try { return G.over(st) || null; } catch (e) { return null; } }

  // ── The table on screen ──
  var net = {
    get state() { return T.st; }, get seat() { return T.seat; }, get code() { return T.code; }, get mv() { return T.mv; },
    get seats() { return T.d ? T.d.seats.map(function (s, i) { return { name: s.name, bot: !!s.bot, me: i === T.seat, away: away(i) }; }) : []; },
    get result() { return T.d ? T.d.result || null : null; }, get status() { return T.d ? T.d.status : null; },
    myTurn: function () { return T.seat >= 0 && !!T.d && T.d.status === 'playing' && turnOf(T.st).indexOf(T.seat) >= 0; },
    act: function (fn) { return act(fn, T.seat); },
    again: again, leave: function () { return leave(); }
  };
  function away(i) { var h = T.d && T.d.hb && T.d.hb[i]; return !h || Date.now() - h > HB * 3; }
  function draw(info) {
    paintChips();
    try { G.show(net, info || {}); } catch (e) { console.error('[turnnet] show', e); }
  }

  // ── Moves ──
  // fn(state) -> {state, mv} | null; as: the seat moving (yours, or a computer seat). Shown here at once, then written.
  function act(fn, as, pre) {
    if (!T.d || T.d.status !== 'playing' || T.busy && as === T.seat) return Promise.resolve(false);
    var code = T.code, base = T.seq, prev = T.st, res;
    if (turnOf(prev).indexOf(as) < 0) return Promise.resolve(false);
    try { res = pre || fn(clone(prev)); } catch (e) { console.warn(e); return Promise.resolve(false); }
    if (!res || !res.state) return Promise.resolve(false);
    var mine = as === T.seat;
    if (mine) { T.busy = true; T.st = res.state; T.mv = res.mv || null; T.local = base + 1; draw({ prev: prev, mv: T.mv, by: dev(), mine: true }); }
    var drive = T.seat;
    return store().tx(code, function (d) {
      if (!d || d.status !== 'playing') throw new Error('This game has ended');
      var r = res;
      if (d.seq !== base) {
        if (!fn) throw new Error('stale');
        T.local = -1;   // (built again on the newer table: the server's copy is the one to show)   // a computer move made on an older table: the next look makes it again
        var cur = JSON.parse(d.st);
        if (turnOf(cur).indexOf(as) < 0) throw new Error('It’s not your turn any more');
        r = fn(clone(cur)); if (!r || !r.state) throw new Error('That move can’t be made now');
      }
      res = r;
      return patchFor(r.state, r.mv, d.seq + 1, drive, d);
    }).then(function () { T.busy = false; return true; }, function (e) {
      T.busy = false;
      if (e && e.message !== 'stale') { console.warn('[turnnet] move', e); if (mine) Kit.toast(errText(e)); }
      if (T.code === code) { T.seq = -1; store().get(code).then(function (d) { if (T.code === code) onDoc(d); }).catch(function () {}); }
      return false;
    });
  }
  function patchFor(state, mv, seq, drive, d) {
    var ov = overOf(state), now = Date.now();
    var p = { st: JSON.stringify(state), seq: seq, mv: mv == null ? null : JSON.stringify(mv), turn: ov ? [] : turnOf(state), at: now, by: dev(), status: ov ? 'over' : 'playing', result: ov || null };
    if (drive >= 0) p.drive = drive;
    if (d) { var hb = Object.assign({}, d.hb || {}); if (drive >= 0) hb[drive] = now; p.hb = hb; }
    return p;
  }
  // computer seats: whoever's looking makes their moves (the one sitting nearest after the last mover goes first)
  function botCheck() {
    if (T.botT && T.botSeq === T.seq && T.d && T.d.status === 'playing') return;   // (a heartbeat changed nothing: the move already waiting stays on time)
    clearTimeout(T.botT); T.botT = 0; T.botSeq = T.seq;
    var d = T.d;
    if (!d || d.status !== 'playing' || T.seat < 0 || !G.bot) return;
    var bots = turnOf(T.st).filter(function (i) { return d.seats[i] && d.seats[i].bot; });
    if (!bots.length) return;
    var hs = []; d.seats.forEach(function (s, i) { if (s && !s.bot) hs.push(i); });
    var rank = d.drive === T.seat ? 0 : 1 + hs.indexOf(T.seat), seq = T.seq;
    T.botT = setTimeout(function () {
      T.botT = 0;
      if (T.seq !== seq || !T.d || T.d.status !== 'playing') return;
      var s = bots[0];
      Promise.resolve().then(function () { return G.bot(clone(T.st), s); }).then(function (res) {
        if (!res || T.seq !== seq) return;
        // (shown when the server has it, as anyone else's move is)
        act(null, s, res).then(function (ok) { if (!ok) setTimeout(botCheck, 1500); });
      }).catch(function (e) { console.warn('[turnnet] computer move', e); });
    }, (G.botMs || 900) + rank * 2500);
  }

  // ── Following a table ──
  function listen(code) {
    stopListen();
    T.code = code; T.d = null; T.seq = -1; T.st = null; T.fresh = true; T.wasMine = false;
    remember(code); lsP('tn_last_' + G.game, code);
    T.off = store().watch(code, onDoc, function (e) { console.warn('[turnnet] watch', e); Kit.toast('Connection problem: ' + errText(e)); });
    clearInterval(T.hbT); T.hbT = setInterval(beat, HB);
  }
  function stopListen() { if (T.off) { T.off(); T.off = null; } clearInterval(T.hbT); clearTimeout(T.botT); T.botT = 0; }
  function beat() {
    if (!T.code || T.seat < 0 || document.hidden || !T.d || T.d.status === 'over') return;
    var code = T.code, s = T.seat;
    store().tx(code, function (d) { if (!d || !d.seats || !d.seats[s]) return null; var hb = Object.assign({}, d.hb || {}); hb[s] = Date.now(); return { hb: hb }; }).catch(function () {});
  }
  function onDoc(d) {
    if (!T.code) return;
    if (!d || d.status === 'closed') {
      var was = T.d; stopListen(); forget(T.code); T.code = null; T.d = null; closeOv();
      if (was && was.status !== 'over') Kit.toast(was && was.seats && was.seats[0] && was.seats[0].dev !== dev() ? 'The table has closed' : 'Table closed');
      paintChips(); try { G.leave(); } catch (e) {}
      return;
    }
    T.d = d;
    T.seat = seatOf(d, T.tag);
    if (d.status === 'open') { T.st = null; T.seq = -1; showWait(); return; }
    // playing or over
    if (T.ov) closeOv();
    var newGame = (d.g || 1) !== T.g;
    if (d.seq !== T.seq || newGame) {
      var prev = newGame ? null : T.st, echo = T.local === d.seq && d.by === dev();
      T.seq = d.seq; T.g = d.g || 1; T.local = -1;
      try { T.st = JSON.parse(d.st); } catch (e) { console.warn('[turnnet] bad state', e); return; }
      T.mv = d.mv ? (function () { try { return JSON.parse(d.mv); } catch (e) { return null; } })() : null;
      if (!echo || newGame) draw({ prev: prev, mv: T.mv, by: d.by, mine: d.by === dev(), fresh: T.fresh, again: newGame && !T.fresh });
      else paintChips();
      T.fresh = false;
      var mineNow = net.myTurn();
      if (mineNow && !T.wasMine && !echo && d.by !== dev()) { try { Kit.sfx('pop'); Kit.haptic('medium'); } catch (e) {} }
      T.wasMine = mineNow;
    } else paintChips();
    botCheck();
  }

  // ── Opening, joining, starting, leaving ──
  function need() {
    if (!ready()) { Kit.toast('Sign in with your PIN to play online'); return false; }
    return true;
  }
  function host(me) {
    if (!need()) return Promise.resolve();
    if (!me.name) { Kit.toast('Pick your name first'); return Promise.resolve(); }
    var tries = 0;
    return Promise.all([acctTag(), linkTag()]).then(function (tags) {
      T.tag = tags[0];
      return (function attempt() {
        var code = code4(), now = Date.now();
        return store().tx(code, function (d) {
          if (d && d.status !== 'closed' && now - (d.at || 0) < 30 * 864e5) throw new Error('taken');
          var seat = { name: me.name, dev: dev() };
          if (tags[0]) seat.acct = tags[0];
          if (tags[1]) seat.lk = tags[1];
          var o = {}; try { o = G.opts ? G.opts() || {} : {}; } catch (e) {}
          var dd = { game: G.game, v: V, status: 'open', seats: [seat], accts: tags[0] ? [tags[0]] : [], turn: [], drive: 0, st: '', seq: 0, mv: null,
            opts: JSON.stringify(o), min: G.min || 2, max: G.max || 2, g: 1, t0: now, result: null, hb: { 0: now }, at: now, by: dev() };
          if (tags[1]) dd.lk = tags[1];   // (the home screens of the people linked to you list it: "Tim has a table open")
          return dd;
        }).then(function () { dl('Opened ' + G.title + ' table ' + code); listen(code); }, function (e) {
          if (e && e.message === 'taken' && ++tries < 8) return attempt();
          throw e;
        });
      })();
    }).catch(function (e) { Kit.toast(errText(e)); });
  }
  function join(code, me) {
    if (!need()) return Promise.resolve();
    if (!me.name) { Kit.toast('Pick your name first'); return Promise.resolve(); }
    code = String(code || '').trim().toUpperCase();
    if (!/^[A-Z]{4}$/.test(code)) { Kit.toast('Table codes are 4 letters'); return Promise.resolve(); }
    return Promise.all([acctTag(), linkTag()]).then(function (tags) {
      T.tag = tags[0];
      return store().tx(code, function (d) {
        if (!d || d.status === 'closed') throw new Error('No table with code ' + code);
        if (d.game !== G.game) throw new Error('That table is for another game');
        var at = seatOf(d, null);
        if (at >= 0) return null;   // already sitting there (this device)
        if (d.status !== 'open') { if (seatOf(d, tags[0]) >= 0) return null; throw new Error('That game has already started'); }
        if (humans(d).length >= (d.max || 2)) throw new Error('That table is full');
        var nm = me.name, taken = d.seats.map(function (s) { return String(s.name).toLowerCase(); }), k = 2;
        while (taken.indexOf(nm.toLowerCase()) >= 0) nm = me.name + ' ' + (k++);
        var seat = { name: nm, dev: dev() };
        if (tags[0]) seat.acct = tags[0];
        if (tags[1]) seat.lk = tags[1];
        var seats = d.seats.concat([seat]), accts = (d.accts || []).slice(), hb = Object.assign({}, d.hb || {});
        if (tags[0] && accts.indexOf(tags[0]) < 0) accts.push(tags[0]);
        hb[seats.length - 1] = Date.now();
        return { seats: seats, accts: accts, hb: hb, at: Date.now(), by: dev() };
      }).then(function () { dl('Joined ' + G.title + ' table ' + code); listen(code); });
    }).catch(function (e) { Kit.toast(errText(e)); });
  }
  // sit back down at a table (from "your games", the home screen or this device's last one)
  function resume(code) {
    if (!ready()) { Kit.toast('Sign in with your PIN to play online'); return Promise.resolve(false); }
    return Promise.all([store().get(code), acctTag()]).then(function (r) {
      var d = r[0]; T.tag = r[1];
      if (!d || d.status === 'closed' || d.game !== G.game) { forget(code); Kit.toast('That table has closed'); return false; }
      if (seatOf(d, T.tag) < 0) { if (d.status === 'open') return join(code, meName()).then(function () { return true; }); Kit.toast('You’re not at that table'); return false; }
      listen(code); return true;
    }).catch(function (e) { Kit.toast(errText(e)); return false; });
  }
  function start() {
    var code = T.code; if (!code) return Promise.resolve();
    return store().tx(code, function (d) {
      if (!d || d.status !== 'open') return null;
      var hs = humans(d), o0 = {}; try { o0 = JSON.parse(d.opts || '{}'); } catch (e) {}
      if (hs.length < (d.min || 2)) throw new Error('Waiting for more players');
      var n = G.seats ? G.seats(hs.length, o0) : hs.length, seats = hs.slice(), names = hs.map(function (s) { return s.name; });
      if (n > seats.length) (Kit.cpuNames ? Kit.cpuNames(n - seats.length, names, n >= 4 ? 8 : 0) : []).forEach(function (nm) { seats.push({ name: nm, bot: true }); });
      while (seats.length < n) seats.push({ name: 'Robot ' + seats.length, bot: true });
      var o = {}; try { o = JSON.parse(d.opts || '{}'); } catch (e) {}
      var st = G.start(seats.map(function (s) { return { name: s.name, bot: !!s.bot }; }), o);
      var p = patchFor(st, null, (d.seq || 0) + 1, -1, null);
      p.seats = seats; p.t0 = Date.now(); p.drive = 0;
      var hb = {}; seats.forEach(function (s, i) { if (!s.bot) hb[i] = (d.hb || {})[d.seats.indexOf(s)] || Date.now(); }); p.hb = hb;
      return p;
    }).then(function () { dl('Started ' + G.title + ' at table ' + code); }).catch(function (e) { Kit.toast(errText(e)); });
  }
  // a new game at the same table, same seats (anyone can ask, once it's over)
  function again() {
    var code = T.code; if (!code) return Promise.resolve(false);
    return store().tx(code, function (d) {
      if (!d || d.status !== 'over') return null;
      var o = {}; try { o = JSON.parse(d.opts || '{}'); } catch (e) {}
      var last = null; try { last = JSON.parse(d.st); } catch (e) {}
      var st = G.start(d.seats.map(function (s) { return { name: s.name, bot: !!s.bot }; }), o, last);
      var p = patchFor(st, null, (d.seq || 0) + 1, T.seat, d); p.g = (d.g || 1) + 1; p.t0 = Date.now();
      return p;
    }).then(function () { return true; }, function (e) { Kit.toast(errText(e)); return false; });
  }
  // Leave the table. Waiting: the table closes (the one who opened it) or your seat empties. In a game: the computer
  // takes your seat where the game has computer players, otherwise it ends and the others win.
  function leave(quiet) {
    var code = T.code, s = T.seat, tag = T.tag;
    if (!code) return Promise.resolve();
    stopListen(); T.code = null; forget(code); lsP('tn_last_' + G.game, null);
    var p = store().tx(code, function (d) {
      if (!d || d.status === 'closed') return null;
      if (d.status === 'open') {
        if (s === 0) return { status: 'closed', at: Date.now(), by: dev() };
        var seats = d.seats.filter(function (x, i) { return i !== s; }), accts = seats.map(function (x) { return x.acct; }).filter(Boolean);
        return { seats: seats, accts: accts, at: Date.now(), by: dev() };
      }
      if (d.status === 'over') {
        var keep = d.seats.filter(function (x, i) { return i !== s && !x.bot && !x.left; }).length;
        var seatsO = d.seats.map(function (x, i) { return i === s ? Object.assign({}, x, { left: true }) : x; });
        return keep ? { seats: seatsO, accts: (d.accts || []).filter(function (a) { return a !== tag; }), at: Date.now() } : { status: 'closed', seats: seatsO, at: Date.now(), by: dev() };
      }
      if (s < 0) return null;
      var st = JSON.parse(d.st), seats2 = d.seats.slice(), others = humans(d).length - 1, accts2 = (d.accts || []).filter(function (a) { return a !== tag; });
      if (!others) return { status: 'closed', accts: accts2, at: Date.now(), by: dev() };
      if (G.resign) { st = G.resign(st, s); seats2[s] = Object.assign({}, seats2[s], { left: true }); }
      else if (G.bot || G.botTakeover) { seats2[s] = { name: seats2[s].name, bot: true, left: true }; }
      else {
        seats2[s] = Object.assign({}, seats2[s], { left: true });
        var win = []; seats2.forEach(function (x, i) { if (i !== s) win.push(i); });
        var pq = patchFor(st, null, d.seq + 1, -1, null);
        pq.status = 'over'; pq.turn = []; pq.result = { win: win, text: d.seats[s].name + ' left the game', left: s }; pq.seats = seats2; pq.accts = accts2;
        return pq;
      }
      var pr = patchFor(st, null, d.seq + 1, -1, null); pr.seats = seats2; pr.accts = accts2;
      return pr;
    }).catch(function (e) { console.warn('[turnnet] leave', e); });
    T.d = null; T.seat = -1; T.st = null; closeOv(); paintChips();
    if (!quiet) { try { G.leave(); } catch (e) {} }
    return p;
  }

  // ── Screens: the lobby and the waiting room, over the game ──
  var CSS = '.tn-ov{position:fixed;inset:0;z-index:55;overflow-y:auto;-webkit-overflow-scrolling:touch;background:var(--bg,#14112a);padding-top:calc(env(safe-area-inset-top,0px) + 10px);}' +
    '.tn-ov .ol{max-width:620px;margin:0 auto;padding:4px 16px calc(env(safe-area-inset-bottom,0px) + 24px);display:flex;flex-direction:column;gap:12px;}' +
    '.tn-ov h1{font-family:var(--display);font-weight:400;font-size:2rem;margin:4px 0 0;text-align:center;}' +
    '.tn-ov .tn-sub{text-align:center;color:var(--text-3);font-weight:800;margin:-6px 0 2px;}' +
    '.tn-ov .ol-h{font-size:.78rem;font-weight:900;letter-spacing:.12em;text-transform:uppercase;color:var(--text-3);margin:10px 2px -2px;}' +
    '.tn-ov .ol-note{color:var(--text-3);font-size:.9rem;margin:0;font-weight:600;}' +
    '.tn-ov .ol-row{display:flex;align-items:center;gap:12px;padding:12px;border-radius:18px;background:var(--surface);box-shadow:var(--shadow-sm);border:0;color:inherit;font:inherit;text-align:left;width:100%;}' +
    '.tn-ov .ol-row .grow{flex:1;min-width:0;}.tn-ov .ol-row b{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}' +
    '.tn-ov .ol-row small{display:block;color:var(--text-3);font-weight:700;font-size:.8rem;}' +
    '.tn-ov .ol-row .avatar{width:40px;height:40px;flex:none;}' +
    '.tn-ov button.ol-row{cursor:pointer;}.tn-ov button.ol-row:active{transform:scale(.98);}' +
    '.tn-ov .tn-g.turn{background:linear-gradient(120deg,color-mix(in srgb,var(--yellow,#f5c542) 22%,var(--surface)),var(--surface) 75%);box-shadow:inset 0 0 0 2px color-mix(in srgb,var(--yellow,#f5c542) 60%,transparent),var(--shadow-sm);}' +
    '.tn-ov .tn-g .yt{flex:none;font-size:.72rem;font-weight:900;letter-spacing:.06em;text-transform:uppercase;padding:4px 9px;border-radius:999px;background:var(--yellow,#f5c542);color:#1d1406;}' +
    '.tn-ov .tn-g.wait{opacity:.8;}' +
    '.tn-ov .tn-faces{display:flex;flex:none;padding-left:8px;}.tn-ov .tn-faces .avatar{width:34px;height:34px;margin-left:-8px;box-shadow:0 0 0 2.5px var(--surface);font-size:.8rem;}' +
    '.tn-ov .ol-pal{flex-wrap:wrap;padding:16px;background:linear-gradient(180deg,color-mix(in srgb,var(--accent) 22%,var(--surface)),var(--surface));box-shadow:inset 0 0 0 2px color-mix(in srgb,var(--accent) 55%,transparent),var(--shadow-sm);}' +
    '.tn-ov .ol-pal .avatar{width:56px;height:56px;}.tn-ov .ol-pal .btn{flex-basis:100%;}' +
    '.tn-ov .ol-join{display:flex;gap:8px;}.tn-ov .ol-join .input{flex:1;min-width:0;text-transform:uppercase;letter-spacing:.12em;font-weight:800;}' +
    '.tn-chips{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;}' +
    '.tn-chip{display:inline-flex;align-items:center;gap:6px;padding:3px 10px 3px 3px;border-radius:999px;background:var(--w08,rgba(255,255,255,.08));font-weight:800;font-size:.8rem;color:var(--text-2);transition:background .25s,color .25s,box-shadow .25s,opacity .25s;}' +
    '.tn-chip .avatar{width:24px;height:24px;font-size:.66rem;flex:none;}' +
    '.tn-chip.up{background:var(--yellow,#f5c542);color:#1d1406;box-shadow:0 0 14px color-mix(in srgb,var(--yellow,#f5c542) 60%,transparent);}' +
    '.tn-chip.me:not(.up){box-shadow:inset 0 0 0 1.5px var(--text-3);}' +
    '.tn-chip.away:not(.bot){opacity:.55;}.tn-chip.left{opacity:.4;text-decoration:line-through;}' +
    '.tn-chip .tn-bot{width:14px;height:14px;opacity:.7;}';
  function css() { if (document.getElementById('tn-css')) return; var s = document.createElement('style'); s.id = 'tn-css'; s.textContent = CSS; document.head.appendChild(s); }
  function av(name, i) { return Kit.avatar && Kit.avatar.el ? Kit.avatar.el(name || '?', null, Kit.color ? Kit.color(i || 0) : null) : E('span', { class: 'avatar', text: String(name || '?').charAt(0) }); }
  function ov() {
    css();
    if (T.ov && document.body.contains(T.ov)) return T.ovRoot;
    T.ov = E('div', { class: 'tn-ov', role: 'dialog', 'aria-label': 'Play online' });
    T.ovRoot = E('div'); T.ov.appendChild(T.ovRoot);
    document.body.appendChild(T.ov);
    return T.ovRoot;
  }
  function closeOv() {
    if (T.lobbyOff) { T.lobbyOff(); T.lobbyOff = null; }
    if (!T.ov) return;
    var o = T.ov; T.ov = null; T.wait = null;
    o.firstChild.innerHTML = '';   // (the waiting room's table spins up into the game as it goes)
    o.remove();
  }

  function lobby() {
    if (!G) return;
    var root = ov(), me = meName(), alive = {};
    T.lobbyAlive = alive;
    if (T.lobbyOff) { T.lobbyOff(); T.lobbyOff = null; }
    root.innerHTML = '';
    var wrap = E('div', { class: 'ol' }); root.appendChild(wrap);
    wrap.appendChild(E('h1', { text: 'Play online' }));
    wrap.appendChild(E('p', { class: 'tn-sub', text: G.title + ' · take your turn whenever you like' }));
    if (!ready()) {
      wrap.appendChild(E('p', { class: 'ol-note', style: { 'text-align': 'center' }, text: 'Sign in with your PIN to play online: the profile button on the home screen.' }));
      wrap.appendChild(E('button', { type: 'button', class: 'btn btn-soft btn-block', text: 'Back to the game', onclick: closeOv }));
      return;
    }
    var seat = E('div', { class: 'ol-row' });
    function paintMe() {
      seat.innerHTML = '';
      seat.appendChild(av(me.name, 0));
      seat.appendChild(E('div', { class: 'grow' }, [E('b', { text: me.name || 'Who’s playing?' }), E('small', { text: 'Your name at the table' })]));
      seat.appendChild(E('button', { type: 'button', class: 'btn btn-soft btn-sm', text: me.name ? 'Change' : 'Pick', onclick: function () { Kit.pickName(function (n) { me.name = n; lsP('tn_me', { name: n }); paintMe(); }); } }));
    }
    paintMe(); wrap.appendChild(seat);
    var mineH = E('div', { class: 'ol-h', text: 'Your games' }), mineBox = E('div', { class: 'stack' }), pals = E('div', { class: 'stack' });
    mineH.hidden = true;
    wrap.appendChild(mineH); wrap.appendChild(mineBox); wrap.appendChild(pals);
    var busy = false;
    function run(btn, label, fn) {
      if (busy) return; busy = true;
      var undo = window.Online && Online.busy ? Online.busy(btn, label) : function () {};
      Promise.resolve(fn()).then(function () { busy = false; undo(); }, function () { busy = false; undo(); });
    }
    wrap.appendChild(E('button', { type: 'button', class: 'btn btn-primary btn-lg btn-block', html: Kit.icon('users') + '<span>Open a table</span>', onclick: function (e) { run(e.currentTarget, 'Opening…', function () { return host(me); }); } }));
    wrap.appendChild(E('div', { class: 'ol-h', text: 'Open tables' }));
    var rooms = E('div', { class: 'stack' }, [E('p', { class: 'ol-note', text: 'Looking for open tables…' })]);
    wrap.appendChild(rooms);
    var codeIn = E('input', { class: 'input', type: 'text', maxlength: '4', placeholder: 'Code', 'aria-label': 'Table code', autocapitalize: 'characters', autocomplete: 'off', spellcheck: 'false' });
    var codeBtn = E('button', { type: 'button', class: 'btn btn-soft', text: 'Join with code', onclick: function () { run(codeBtn, 'Joining…', function () { return join(codeIn.value, me); }); } });
    codeIn.addEventListener('keydown', function (e) { if (e.key === 'Enter') codeBtn.click(); });
    wrap.appendChild(E('div', { class: 'ol-join' }, [codeIn, codeBtn]));
    wrap.appendChild(E('button', { type: 'button', class: 'btn btn-ghost btn-block', text: 'Play on this device instead', onclick: closeOv }));

    // your games: tables you sit at (any of your devices), your move first
    acctTag().then(function (tag) {
      T.tag = tag;
      var codes = lsJ(REM(), []), mineP = tag ? store().mine(tag).catch(function () { return []; }) : Promise.resolve([]);
      return mineP.then(function (l) {
        var have = {}; l.forEach(function (x) { have[x.code] = 1; });
        var extra = (Array.isArray(codes) ? codes : []).filter(function (c) { return !have[c]; }).slice(0, 6);
        return Promise.all(extra.map(function (c) { return store().get(c).then(function (d) { return d ? { code: c, d: d } : null; }, function () { return null; }); })).then(function (r) { return l.concat(r.filter(Boolean)); });
      }).then(function (l) {
        if (T.lobbyAlive !== alive) return;
        var list = l.filter(function (x) { var d = x.d; return d.game === G.game && (d.status === 'open' || d.status === 'playing') && seatOf(d, tag) >= 0; });
        list.forEach(function (x) { var d = x.d, s = seatOf(d, tag); x.mine = d.status === 'playing' && ((d.turn || []).indexOf(s) >= 0 || (d.turn || []).some(function (i) { return d.seats[i] && d.seats[i].bot; }) && d.drive === s); x.s = s; });
        list.sort(function (a, b) { return (b.mine - a.mine) || ((b.d.at || 0) - (a.d.at || 0)); });
        mineBox.innerHTML = ''; mineH.hidden = !list.length;
        list.forEach(function (x) {
          var d = x.d, others = d.seats.filter(function (s, i) { return i !== x.s; }), faces = E('span', { class: 'tn-faces' });
          others.slice(0, 4).forEach(function (s, i) { faces.appendChild(av(s.name, i + 1)); });
          var upName = (d.turn || []).map(function (i) { return d.seats[i] && d.seats[i].name; }).filter(Boolean)[0];
          var sub = d.status === 'open' ? 'Waiting for players · code ' + x.code : x.mine ? 'vs ' + others.map(function (s) { return s.name; }).join(', ') + ' · ' + ago(d.at || 0) : (upName ? upName + '’s turn' : 'Their turn') + ' · ' + ago(d.at || 0);
          var b = E('button', { type: 'button', class: 'ol-row tn-g ' + (x.mine ? 'turn' : 'wait'), onclick: function (e) { run(e.currentTarget, 'Opening…', function () { return resume(x.code); }); } }, [
            faces, E('div', { class: 'grow' }, [E('b', { text: others.length ? 'With ' + others.map(function (s) { return s.name; }).join(', ') : 'Your table' }), E('small', { text: sub })]),
            x.mine ? E('span', { class: 'yt', text: 'Your turn' }) : null]);
          mineBox.appendChild(b);
        });
      });
    }).catch(function () {});

    // open tables of this game: the people you've linked first
    function paint(l) {
      if (T.lobbyAlive !== alive) return;
      var md = dev();
      var list = l.filter(function (x) { var d = x.d; return d.status === 'open' && d.seats && d.seats[0] && d.seats[0].dev !== md && seatOf(d, T.tag) < 0 && humans(d).length < (d.max || 2) && Date.now() - (d.at || 0) < 7 * 864e5; });
      list.forEach(function (x) { x.host = x.d.seats[0]; });
      var p = window.Online && Online.whose ? Online.whose(list.map(function (x) { return { code: x.code, host: x.host, x: x }; })) : Promise.resolve(list.map(function (x) { return { x: x }; }));
      Promise.resolve(p).then(function (rs) {
        if (T.lobbyAlive !== alive) return;
        pals.innerHTML = ''; rooms.innerHTML = '';
        var rest = [];
        (rs || []).forEach(function (r) {
          var x = r.x || r, d = x.d, n = humans(d).length;
          var sub = n + ' of ' + (d.max || 2) + ' seats taken · code ' + x.code;
          var go = function (e) { run(e.currentTarget, 'Joining…', function () { return join(x.code, me); }); };
          if (r.who) pals.appendChild(E('div', { class: 'ol-row ol-pal' }, [av(r.who.name, 1), E('div', { class: 'grow' }, [E('b', { text: r.who.name + ' has a table open' }), E('small', { text: sub })]),
            E('button', { type: 'button', class: 'btn btn-primary btn-lg btn-block', html: Kit.icon('play') + '<span>' + Kit.esc('Join ' + r.who.name + '’s table') + '</span>', onclick: go })]));
          else rest.push([x, sub, go]);
        });
        if (!rest.length) rooms.appendChild(E('p', { class: 'ol-note', text: 'No open tables yet. When someone opens one, it shows up here.' }));
        rest.forEach(function (y) {
          rooms.appendChild(E('div', { class: 'ol-row' }, [av(y[0].host.name, 1), E('div', { class: 'grow' }, [E('b', { text: y[0].host.name + '’s table' }), E('small', { text: y[1] })]),
            E('button', { type: 'button', class: 'btn btn-primary btn-sm', text: 'Join', onclick: y[2] })]));
        });
      });
    }
    T.lobbyOff = store().open(G.game, paint, function (e) { if (T.lobbyAlive !== alive) return; rooms.innerHTML = ''; rooms.appendChild(E('p', { class: 'ol-note', text: 'Couldn’t reach the tables. ' + errText(e) })); });
  }
  function showWait() {
    var d = T.d, root = ov();
    if (T.lobbyOff) { T.lobbyOff(); T.lobbyOff = null; }
    T.lobbyAlive = null;
    var players = d.seats.map(function (s, i) { return { name: s.name, me: i === T.seat, host: i === 0 }; });
    var o0 = {}; try { o0 = JSON.parse(d.opts || '{}'); } catch (e) {}
    var bots = (G.seats ? G.seats(players.length, o0) : players.length) - players.length;
    var note = (bots > 0 ? (bots === 1 ? 'One seat goes' : bots + ' seats go') + ' to the computer. ' : '') + 'Everyone takes their turn whenever they like: the home screen shows when it’s yours.';
    var o = { host: T.seat === 0, code: T.code, hostName: d.seats[0].name, max: d.max || 2, min: d.min || 2, players: players, note: note,
      onStart: start, onLeave: function () { return leave(); } };
    if (window.Online && Online.waitRoom) {
      if (!T.wait) { root.innerHTML = ''; T.wait = Online.waitRoom(root, o); }
      else T.wait.update(players);
    }
  }

  // ── The seats, as a strip (whose turn glows) ──
  var chipsEls = [];
  function chips() { css(); var e = E('div', { class: 'tn-chips' }); chipsEls.push(e); paintChips(); return e; }
  function paintChips() {
    chipsEls = chipsEls.filter(function (e) { return e.isConnected || !e._seen; });
    chipsEls.forEach(function (box) {
      box._seen = true; box.innerHTML = ''; box.hidden = !T.d || T.d.status === 'open';
      if (box.hidden) return;
      var up = T.d.status === 'playing' ? turnOf(T.st) : [];
      T.d.seats.forEach(function (s, i) {
        var c = E('span', { class: 'tn-chip' + (up.indexOf(i) >= 0 ? ' up' : '') + (i === T.seat ? ' me' : '') + (s.bot ? ' bot' : '') + (s.left ? ' left' : '') + (!s.bot && away(i) ? ' away' : '') }, [av(s.name, i), E('span', { text: i === T.seat ? 'You' : s.name })]);
        if (s.bot) c.appendChild(E('span', { class: 'tn-bot', html: Kit.icon('bot') }));
        box.appendChild(c);
      });
    });
  }

  // ── Setup ──
  function setup(cfg) {
    G = cfg; css();
    document.addEventListener('visibilitychange', function () {
      if (document.hidden || !T.code) return;
      beat(); store().get(T.code).then(function (d) { if (T.code) onDoc(d); }).catch(function () {});   // back from the background: catch up
    });
    // opened from the home screen (?online=1&room=CODE), a friend's table (?join=CODE) or the menu link (?online=1)
    var q = location.search, room = /[?&]room=([A-Za-z]{4})\b/.exec(q), jn = /[?&]join=([A-Za-z]{4})\b/.exec(q);
    if (/[?&]online=1\b/.test(q) || room || jn) {
      try { history.replaceState(null, '', location.pathname + location.hash); } catch (e) {}
      var go = function () {
        if (room) resume(room[1].toUpperCase()).then(function (ok) { if (!ok) lobby(); });
        else if (jn) join(jn[1], meName()).then(function () { if (!T.code) lobby(); });
        else lobby();
      };
      // signed in: wait for the account to be ready
      if (window.FGHSync && FGHSync.onReady && !window.__tnStore) { var done = false; FGHSync.onReady(function () { if (!done) { done = true; go(); } }); setTimeout(function () { if (!done) { done = true; go(); } }, 4000); }
      else setTimeout(go, 0);
    }
  }
  function menu() {
    return [
      { icon: 'globe', label: 'Play online', sub: 'Each on your own device, at your own pace', when: function () { return !T.code; }, onClick: lobby },
      { icon: 'users', label: 'Your online games', sub: 'Other tables you’re at', when: function () { return !!T.code; }, onClick: lobby },
      { icon: 'logout', label: 'Leave the online game', sub: 'Back to playing on this device', when: function () { return !!T.code; }, onClick: function () {
        var d = T.d, playing = d && d.status === 'playing';
        if (!playing) { leave(); return; }
        var botsTake = !!(G.resign || G.botTakeover || G.bot);
        Kit.confirm('Leave the online game?', { ok: 'Leave', danger: true, body: botsTake ? 'The computer takes your seat and the others play on.' : 'The game ends and the others win.' }).then(function (ok) { if (ok) leave(); });
      } }
    ];
  }

  window.TurnNet = {
    setup: setup, open: lobby, menu: menu, chips: chips, leave: leave, again: again,
    on: function () { return !!T.code && !!T.d && T.d.status !== 'open'; }, net: net,
    _t: T, _store: store, _acct: acctTag
  };
})();
