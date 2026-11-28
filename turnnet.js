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
//   hs        how many people sat down when the game started (a table of 3 or more gets the computer's cover, below)
//   cov       {seat: since}: people whose device has dropped out and whose seat is being looked after (below)
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
//     free(state, seat) -> true       optional: this seat may move now although it isn't its turn (a casino seat out of
//                                     chips buying back in)
//     over(state) -> null | {win: [seats], text}
//     bot(state, seat) -> {state, mv} | Promise   a computer seat's move (needed when seats() adds any)
//     show(net, info)      draw the table: called at the start and after every move (info: {prev, mv, by, mine,
//                          fresh: first draw at this table, again: a new game at the same table})
//     leave()              back to playing on this device
//     resign(state, seat) -> state | {state, bot}   optional: a person leaving mid-game (default: the computer takes
//                          their seat when the game has bot(), otherwise the game ends and the others win); bot: true
//                          hands the seat to the computer after all
//     leaveNote(state, seat) -> text   optional: what leaving does, for the "Leave the online game?" question
//   TurnNet.open()        the lobby (menu: Play online)
//   TurnNet.menu()        menu items for Kit.init: Play online, Your online game, Leave the online game
//   TurnNet.on()          true while at an online table
//   TurnNet.chips()       an element listing the seats, whose turn it is glowing (games may place it)
//   TurnNet.poke()        look at the table again now (a computer seat's move seems stuck)
//   TurnNet.away()        stop following the table without leaving it (off to play something else; back via Your games)
//   net (passed to show): {state, seat (yours, -1 watching), seats, code, mv, myTurn(), act(fn), again(), leave(),
//                          result, status}
//     net.act(fn)         your move: fn(state) -> {state, mv} (or null for no move). Shown here at once; written
//                         as a transaction (fn runs again on the newest state if someone else moved first)
//   Tests: window.__tnStore swaps Firestore for another store with the same calls (fireStore below).
//
// A DEVICE THAT DROPS OUT (Tim, 2026-11-28). Every device at a table writes hb[seat] every 15 s while the page is in
// view, and a seat whose hb is more than 45 s old has dropped out (a person who switches apps for 45 s counts too, and
// gets the seat back the moment they come back). What happens then:
//   - a table that started with fewer than 3 people: nothing; the turn waits for them, as a correspondence game does
//   - a table that started with 3 or more people, in a game with bot(): the computer plays the seat for them (cov),
//     from whichever other person's device is looking (one move at a time, through the same transaction as any move),
//     until their device beats again, when the seat is theirs again. The seat stays theirs throughout: not a bot seat,
//     not a seat that left.
//   - a game with its own handling (the casino tables, Poker) says so with these cfg hooks:
//     dropped(state, seat) -> {state, mv} | null   the seat has just dropped out (a casino seat sits out)
//     returned(state, seat) -> {state, mv} | null  their device is back (dealt back in)
//     cover(state, seat) -> {state, mv} | null     a move for a dropped seat whose turn it is (Poker's tournament checks
//                                                   or folds); without it, bot() covers the seat at a table of 3 or more
//     dropAny: true                                 the game's handling applies however many people started
//     dropLeave(state) -> ms (or a number)          after that long dropped out the seat leaves the table, as a person who
//                                                   leaves does (resign); their own device, when it next opens the table,
//                                                   finishes leaving (the game's leave() settles their money there)
//     dropSay(name, state) -> text                  what the others are told when the seat drops out
//     closeTable(net) -> true | false               the last person left at the table chose Close the table: make the move
//                                                   (net.free(fn) moves when it isn't your turn); false: not now (it is
//                                                   asked again after each move until it can)
// ═══════════════════════════════════════════════════════════════════════════
(function () {
  'use strict';
  if (window.TurnNet) return;
  var COL = 'turnRooms', V = 1, HB = 15000, DROP = 45000;   // (a beat every 15 s; 45 s without one is a dropped device)
  // The home screen's hidden frame that only gives this device's seat up (?kquit=1, Kit.netQuit): it never beats (a beat
  // would lift the computer's cover on the seat and say "You're back"), never moves for a computer or a dropped seat and
  // never marks anyone dropped. It only reads the table and leaves.
  var QUIT = /[?&]kquit=1\b/.test(location.search) && window.parent !== window;
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
      pin: function () { return window.FGHSync && FGHSync.acctKey ? FGHSync.acctKey() : window.FGHSync && FGHSync.pin ? FGHSync.pin() : null; },   // (the account's key: its PIN, or g:<uid> on Google)
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
    // (a seat that left while its device was away keeps the device and account on it, so that device can finish leaving)
    for (i = 0; i < d.seats.length; i++) if (d.seats[i] && (!d.seats[i].bot || d.seats[i].gone) && d.seats[i].dev === me) return i;
    if (tag) for (i = 0; i < d.seats.length; i++) if (d.seats[i] && (!d.seats[i].bot || d.seats[i].gone) && d.seats[i].acct === tag) return i;
    return -1;
  }
  function humans(d) { return (d.seats || []).filter(function (s) { return s && !s.bot; }); }
  function turnOf(st) { try { return (G.turn(st) || []).slice(); } catch (e) { return []; } }
  function freeOf(st, s) { try { return !!(G.free && G.free(st, s)); } catch (e) { return false; } }
  function overOf(st) { try { return G.over(st) || null; } catch (e) { return null; } }

  // ── A device that drops out ──
  // how many people started the game (tables from before hs: the people's seats, counting those who left)
  function hsOf(d) { return d && d.hs != null ? d.hs : ((d && d.seats) || []).filter(function (s) { return s && (!s.bot || s.left); }).length; }
  function ownDrop() { return !!(G && (G.dropped || G.cover)); }
  // does this table look after a seat whose device dropped out?
  function dropOn(d) {
    if (!d || d.status !== 'playing' || !G) return false;
    var n = hsOf(d);
    return ownDrop() ? !!G.dropAny || n >= 3 : !!G.bot && n >= 3;
  }
  // the moves for a dropped seat when it's their turn: the game's own, or the computer's at a table of 3 or more
  function coverFn(d) { if (!dropOn(d)) return null; return G.cover || (ownDrop() ? null : G.bot) || null; }
  // Another seat's beat is judged by this device's own clock: the moment it saw that seat's hb change (SEEN), not the
  // time written by the other device's clock, so a phone whose clock runs fast or slow is never counted as dropped
  // when it isn't. Your own seat's beat was written by this clock and is read as it is.
  var SEEN = {};
  function stale(d, i, now) {
    var h = d && d.hb && d.hb[i]; if (!h) return true;
    now = now || Date.now();
    if (i === T.seat) return now - h > DROP;
    var k = (T.code || '') + ':' + i, s = SEEN[k], t = Date.now();
    if (!s || s.h !== h) { SEEN[k] = s = { h: h, at: t }; }
    return now - s.at > DROP;
  }
  function covered(d, i) { return !!(d && d.cov && d.cov[i] != null); }
  function leaveMs(st) { try { return typeof G.dropLeave === 'function' ? +G.dropLeave(st) || 0 : +G.dropLeave || 0; } catch (e) { return 0; } }
  function mins(ms) { var m = Math.round(ms / 60000); return m === 1 ? 'a minute' : m + ' minutes'; }

  // ── The table on screen ──
  var net = {
    get state() { return T.st; }, get seat() { return T.seat; }, get code() { return T.code; }, get mv() { return T.mv; },
    get seats() { return T.d ? T.d.seats.map(function (s, i) { return { name: s.name, bot: !!s.bot, me: i === T.seat, away: away(i), cover: covered(T.d, i) }; }) : []; },
    get result() { return T.d ? T.d.result || null : null; }, get status() { return T.d ? T.d.status : null; },
    myTurn: function () { return T.seat >= 0 && !!T.d && T.d.status === 'playing' && turnOf(T.st).indexOf(T.seat) >= 0; },
    act: function (fn) { return act(fn, T.seat); },
    free: function (fn) { return act(fn, T.seat, null, true); },
    // (a seat whose device has dropped out: 'cover' the computer plays it, 'out' it sits out, 'auto' it checks or folds;
    // null otherwise. A game puts Kit.awaySeat(its avatar, net.dropOf(seat)) on that seat's plate)
    dropOf: function (i) { var d = T.d, s = d && d.seats && d.seats[i]; return s && !s.bot && !s.left && covered(d, i) ? (ownDrop() ? markOf(T.st, i) : 'cover') : null; },   // (a move made when it isn't your turn: the game's fn decides whether it can be)
    again: again, leave: function () { return leave(); }
  };
  function away(i) { return stale(T.d, i); }
  function draw(info) {
    paintChips();
    try { G.show(net, info || {}); } catch (e) { console.error('[turnnet] show', e); }
  }

  // ── Moves ──
  // fn(state) -> {state, mv} | null; as: the seat moving (yours, or a computer seat). Shown here at once, then written.
  function act(fn, as, pre, force) {
    if (!T.d || T.d.status !== 'playing' || T.busy && as === T.seat) return Promise.resolve(false);
    var code = T.code, base = T.seq, prev = T.st, res;
    if (!force && turnOf(prev).indexOf(as) < 0 && !freeOf(prev, as)) return Promise.resolve(false);
    try { res = pre || fn(clone(prev)); } catch (e) { console.warn(e); return Promise.resolve(false); }
    if (!res || !res.state) return Promise.resolve(false);
    var mine = as === T.seat;
    if (mine) { T.busy = true; T.st = res.state; T.mv = res.mv || null; T.local = base + 1; draw({ prev: prev, mv: T.mv, by: dev(), mine: true }); }
    var drive = T.seat, sx = T.d.seats[as], cover = !mine && !!sx && !sx.bot;   // (a move for a person's seat whose device dropped out)
    return store().tx(code, function (d) {
      if (!d || d.status !== 'playing') throw new Error('This game has ended');
      if (cover && !covered(d, as)) throw new Error('stale');   // (their device came back first: the move is theirs to make)
      var r = res;
      if (d.seq !== base) {
        if (!fn) throw new Error('stale');
        T.local = -1;   // (built again on the newer table: the server's copy is the one to show)   // a computer move made on an older table: the next look makes it again
        var cur = JSON.parse(d.st);
        if (!force && turnOf(cur).indexOf(as) < 0 && !freeOf(cur, as)) throw new Error('It’s not your turn any more');
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
  // computer seats: whoever's looking makes their moves (the one sitting nearest after the last mover goes first). A
  // seat whose device has dropped out is moved for in the same way (coverFn), never by its own device.
  function botCheck() {
    if (QUIT) return;
    if (T.botT && T.botSeq === T.seq && T.d && T.d.status === 'playing') return;   // (a heartbeat changed nothing: the move already waiting stays on time)
    clearTimeout(T.botT); T.botT = 0; T.botSeq = T.seq;
    var d = T.d;
    if (!d || d.status !== 'playing' || T.seat < 0 || (d.seats[T.seat] && d.seats[T.seat].gone)) return;
    var cf = coverFn(d), now = Date.now();
    var up = turnOf(T.st), bots = G.bot ? up.filter(function (i) { return d.seats[i] && d.seats[i].bot; }) : [];
    var covs = cf ? up.filter(function (i) { var x = d.seats[i]; return x && !x.bot && !x.left && i !== T.seat && covered(d, i); }) : [];
    var todo = bots.map(function (i) { return [i, G.bot]; }).concat(covs.map(function (i) { return [i, cf]; }));
    if (!todo.length) return;
    // (the people who are here, in seat order: a dropped seat's device isn't, so nobody waits for it to move first)
    var hs = []; d.seats.forEach(function (s, i) { if (s && !s.bot && !s.left && (i === T.seat || !covered(d, i) && !stale(d, i, now))) hs.push(i); });
    var rank = d.drive === T.seat ? 0 : 1 + hs.indexOf(T.seat), seq = T.seq;
    T.botT = setTimeout(function () {
      T.botT = 0;
      if (T.seq !== seq || !T.d || T.d.status !== 'playing') return;
      var k = 0;
      (function tryOne() {
        if (T.seq !== seq) return;
        if (k >= todo.length) { setTimeout(botCheck, 3000); return; }   // (no move this time: look again)
        var s = todo[k][0], fn = todo[k][1]; k++;
        Promise.resolve().then(function () { return fn(clone(T.st), s); }).then(function (res) {
          if (T.seq !== seq) return;
          if (!res || !res.state) { tryOne(); return; }
          // (shown when the server has it, as anyone else's move is)
          act(null, s, res).then(function (ok) { if (!ok) setTimeout(botCheck, 1500); });
        }).catch(function (e) { console.warn('[turnnet] computer move', e); setTimeout(botCheck, 3000); });
      })();
    }, (G.botMs || 900) + rank * 2500);
  }

  // Seats whose device has dropped out (no beat for 45 s): marked in cov by whichever person's device notices first
  // (a transaction, so two devices never both do it), with the game's own dropped() where it has one; and after
  // dropLeave(state) of it, the seat leaves the table as a person who leaves does.
  function dropCheck() {
    if (QUIT) return;
    var d = T.d, me = T.seat, code = T.code;
    if (!code || !d || d.status !== 'playing' || me < 0 || document.hidden || T.dropBusy || !dropOn(d)) return;
    if (d.seats[me] && d.seats[me].gone) return;
    var now = Date.now(), ms = leaveMs(T.st), need = false;
    d.seats.forEach(function (s, i) {
      if (i === me || !s || s.bot || s.left || !stale(d, i, now)) return;
      if (!covered(d, i) || ms && now - d.cov[i] > ms) need = true;
    });
    if (!need) return;
    T.dropBusy = true;
    var tag = T.tag;
    store().tx(code, function (dd) {
      if (!dd || dd.status !== 'playing' || !dropOn(dd)) return null;
      var t = Date.now(), cov = Object.assign({}, dd.cov || {}), seats = dd.seats.slice(), st = null, stCh = false, mv = null, sCh = false, ch = false;
      var mine = seatOf(dd, tag);
      if (mine < 0) return null;
      function cur() { if (!st) st = JSON.parse(dd.st); return st; }
      dd.seats.forEach(function (s, i) {
        if (i === mine || !s || s.bot || s.left || !stale(dd, i, t)) return;
        if (cov[i] == null) {
          cov[i] = t; ch = true;
          if (G.dropped) {
            var r = null; try { r = G.dropped(cur(), i); } catch (e) { console.warn('[turnnet] dropped', e); }
            if (r && r.state) { st = r.state; stCh = true; mv = Object.assign(mv || {}, r.mv || { t: 'drop', s: i }); }
          }
          return;
        }
        var lm = leaveMs(cur());
        if (lm && t - cov[i] > lm) {
          var o = dropOut(cur(), seats, i);
          if (o) { st = o.st; stCh = true; sCh = true; ch = true; delete cov[i]; mv = Object.assign(mv || {}, { t: 'gone', s: i }); }
        }
      });
      if (!ch) return null;
      var p = stCh ? patchFor(st, mv, dd.seq + 1, -1, dd) : {};
      p.cov = cov;
      if (sCh) p.seats = seats;
      return p;
    }).catch(function (e) { console.warn('[turnnet] drop', e); }).then(function () { T.dropBusy = false; });
  }
  // the seat leaves the table, as leave() does for a person in the middle of a game (resign, or the computer takes it),
  // but keeping the device and account on it (gone), so that their own device can find the table and finish leaving
  function dropOut(st, seats, i) {
    var x = seats[i], keep = { gone: 1, dev: x.dev };
    if (x.acct) keep.acct = x.acct;
    if (G.resign) {
      var rr = G.resign(st, i), toBot = rr && rr.state && rr.bot;
      st = rr && rr.state ? rr.state : rr;
      seats[i] = toBot ? Object.assign({ name: x.name, bot: true, left: true }, keep) : Object.assign({}, x, { left: true, gone: 1 });
    } else if (G.bot || G.botTakeover) seats[i] = Object.assign({ name: x.name, bot: true, left: true }, keep);
    else return null;
    return { st: st };
  }
  // What the others are told as seats drop out and come back (from the table as it was and as it is now)
  function dropNews(a, b) {
    if (!a || !b || a.status !== 'playing' || b.status !== 'playing' || (a.g || 1) !== (b.g || 1) || !b.seats) return;
    var ca = a.cov || {}, cb = b.cov || {}, st = T.st;
    // (each one is a banner from the top with the person's face and what happens to their seat, Kit.awayNote; the bar
    // keeps the mark while they're away, paintAway)
    b.seats.forEach(function (s, i) {
      if (!s) return;
      var was = ca[i] != null, now = cb[i] != null, sa = a.seats && a.seats[i], nm = s.name, col = Kit.color ? Kit.color(i) : null;
      if (!was && now && i !== T.seat) {
        var say = null; try { say = G.dropSay ? G.dropSay(nm, st) : null; } catch (e) {}
        say = say || nm + '’s device dropped out. The computer plays for ' + nm + ' until ' + nm + ' is back.';
        var head = nm + '’s device dropped out';
        note({ name: nm, color: col, kind: ownDrop() ? markOf(st, i) : 'cover', title: head, line: say.indexOf(head + '. ') === 0 ? say.slice(head.length + 2) : say, say: say });
      } else if (was && !now) {
        if (s.gone && !(sa && sa.gone)) {
          if (i === T.seat) return;
          note({ name: nm, color: col, kind: 'gone', title: nm + ' has left the table', line: nm + ' was away for ' + mins(leaveMs(st)) + '.', say: nm + ' was away for ' + mins(leaveMs(st)) + ' and has left the table.' });
          lastOne(b, nm);
        } else if (!s.left) {
          if (i === T.seat) note({ name: nm, color: col, kind: 'me', title: 'You’re back at the table', say: 'You’re back at the table.', ms: 3200 });
          else note({ name: nm, color: col, kind: 'back', title: nm + ' is back', line: ownDrop() ? nm + ' is dealt back in.' : nm + ' is playing again.', say: nm + ' is back.', ms: 3600 });
        }
      }
    });
  }
  // (Kit.awayNote where the kit has it; a page with an older kit gets the sentence as a toast)
  function note(x) { if (Kit.awayNote) Kit.awayNote(x); else Kit.toast(x.say, x.ms || 5000); }
  // what a dropped seat does at a table with its own handling: sits out ('out', the default) or plays itself ('auto')
  function markOf(st, i) { try { return (G.dropMark && G.dropMark(st, i)) || 'out'; } catch (e) { return 'out'; } }
  // The mark in the game bar for everyone who is away (Kit.away): the computer playing for them, sitting out, or (a
  // table that waits for them) simply not here. Drawn with the seats, and every 15 s.
  function paintAway() {
    if (!window.Kit || !Kit.away || QUIT) return;
    var d = T.d, out = [];
    if (d && d.status === 'playing' && T.seat >= 0 && d.seats) {
      var up = turnOf(T.st), now = Date.now(), cf = dropOn(d);
      d.seats.forEach(function (s, i) {
        if (!s || s.bot || s.left || s.gone || i === T.seat) return;
        var cv = covered(d, i);
        if (!cv && !stale(d, i, now)) return;
        var kind = cv ? (ownDrop() ? markOf(T.st, i) : 'cover') : 'wait', x = { name: s.name, color: Kit.color ? Kit.color(i) : null, kind: kind, up: up.indexOf(i) >= 0 };
        if (cv) { x.since = d.cov[i]; x.leave = leaveMs(T.st); }
        if (kind === 'auto' && G.dropSay) { try { x.line = G.dropSay(s.name, T.st); } catch (e) {} }
        if (!cv && cf) return;   // (a table that covers a dropped seat marks it within moments: nothing until it does)
        out.push(x);
      });
    }
    Kit.away(out);
    if (Kit.awaySeat && Kit.awaySeat.refresh) Kit.awaySeat.refresh();
  }
  // the others have all left: the last person at the table chooses to close it or keep playing on their own. The sheet
  // shows the table: your face, lit, and the people who have left, faded, each with the mark of leaving.
  function lastOne(d, nm) {
    var here = []; d.seats.forEach(function (s, i) { if (s && !s.bot && !s.left) here.push(i); });
    if (here.length !== 1 || here[0] !== T.seat) return;
    var key = T.code + ':' + (d.g || 1) + ':' + nm;
    if (T.lastAsk === key) return; T.lastAsk = key;
    var me = d.seats[T.seat], faces = [E('span', { class: 'tn-lo-me' }, [av(me.name, T.seat), E('small', { text: 'You' })])];
    d.seats.forEach(function (s, i) {
      if (!s || i === T.seat || !s.left || !(s.gone || s.dev || s.acct)) return;
      faces.push(E('span', { class: 'tn-lo-gone' }, [Kit.awayFace ? Kit.awayFace({ name: s.name, color: Kit.color(i), kind: 'gone' }, 'lg') : av(s.name, i), E('small', { text: s.name })]));
    });
    Kit.sheet({ title: 'You’re the only one at the table', node: E('div', { class: 'tn-lo' }, [E('div', { class: 'tn-lo-faces' }, faces),
      E('p', { class: 'muted', text: nm + ' was away for ' + mins(leaveMs(T.st)) + ' and has left the table, so nobody else is here. Close the table to end the game, or keep playing on your own.' })]),
      actions: [{ label: 'Close the table', primary: true, onClick: function () { T.closing = T.code; tryClose(true); } }, { label: 'Keep playing', cls: 'btn-ghost' }] });
  }
  function tryClose(first) {
    if (!T.closing || T.closing !== T.code || !T.d || T.d.status !== 'playing') { T.closing = null; return; }
    if (!G.closeTable) { T.closing = null; leave(); return; }
    var ok = false; try { ok = G.closeTable(net) !== false; } catch (e) { console.warn('[turnnet] close', e); }
    if (ok) T.closing = null;
    else if (first) Kit.toast('The table closes when this round is over.');
  }

  // ── Following a table ──
  function listen(code) {
    stopListen();
    T.code = code; T.d = null; T.seq = -1; T.st = null; T.fresh = true; T.wasMine = false;
    remember(code); lsP('tn_last_' + G.game, code);
    T.off = store().watch(code, onDoc, function (e) { console.warn('[turnnet] watch', e); Kit.toast('Connection problem: ' + errText(e)); });
    clearInterval(T.hbT); clearInterval(T.wdT);
    if (!QUIT) { T.hbT = setInterval(beat, HB); T.wdT = setInterval(watchdog, 15000); }
  }
  // A computer seat's move that never came (a dropped update, a stalled timer): look at the table again. And every
  // 15 s, whether anyone's device has dropped out.
  function watchdog() {
    dropCheck(); paintAway();
    if (!T.code || !T.d || T.d.status !== 'playing' || T.botT || T.busy || document.hidden) return;
    var cf = coverFn(T.d);
    if (!turnOf(T.st).some(function (i) { var x = T.d.seats[i]; return x && (x.bot || cf && !x.left && i !== T.seat && covered(T.d, i)); })) return;
    if (Date.now() - (T.d.at || 0) < 12000) return;
    poke();
  }
  function poke() {
    if (!T.code) return;
    var code = T.code;
    store().get(code).then(function (d) { if (T.code !== code) return; clearTimeout(T.botT); T.botT = 0; onDoc(d); }).catch(function () {});
  }
  function stopListen() { if (T.off) { T.off(); T.off = null; } clearInterval(T.hbT); clearInterval(T.wdT); clearTimeout(T.botT); T.botT = 0; }
  // Here: this seat's hb. A seat that was dropped out comes back (cov cleared, the game's returned()).
  function beat() {
    if (QUIT) return;
    if (!T.code || T.seat < 0 || document.hidden || !T.d || T.d.status === 'over') return;
    var code = T.code, s = T.seat;
    T.lastBeat = Date.now();
    store().tx(code, function (d) {
      if (!d || !d.seats || !d.seats[s]) return null;
      var now = Date.now(), hb = Object.assign({}, d.hb || {}), p = { hb: hb };
      hb[s] = now;
      if (d.status === 'playing' && d.cov && d.cov[s] != null && !d.seats[s].left) {
        var cov = Object.assign({}, d.cov); delete cov[s];
        if (G.returned) {
          var r = null; try { r = G.returned(JSON.parse(d.st), s); } catch (e) { console.warn('[turnnet] returned', e); }
          if (r && r.state) { p = patchFor(r.state, r.mv || { t: 'back', s: s }, d.seq + 1, -1, d); p.hb[s] = now; }
        }
        p.cov = cov;
      }
      return p;
    }).catch(function () {});
  }
  function beatSoon() { if (Date.now() - (T.lastBeat || 0) > 3000) beat(); }
  function onDoc(d) {
    if (!T.code) return;
    if (!d || d.status === 'closed') {
      var was = T.d; stopListen(); forget(T.code); T.code = null; T.d = null; closeOv();
      if (was && was.status !== 'over') Kit.toast(was && was.seats && was.seats[0] && was.seats[0].dev !== dev() ? 'The table has closed' : 'Table closed');
      paintChips(); try { G.leave(); } catch (e) { console.warn('[turnnet] leave', e); }
      return;
    }
    var was = T.d;
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
      if (mineNow && !T.wasMine && !echo && d.by !== dev()) { try { setTimeout(function () { Kit.sfx('turn'); }, 350); Kit.haptic('medium'); } catch (e) {} }   // your turn: the bell
      T.wasMine = mineNow;
    } else paintChips();
    dropNews(was, d);
    var mySeat = T.seat >= 0 ? d.seats[T.seat] : null;
    if (d.status === 'playing' && mySeat && mySeat.gone) {
      // (this device was away so long that its seat left the table: it finishes leaving now, the game settling up)
      if (T.goneDone !== T.code) {
        T.goneDone = T.code; var gc = T.code;
        var gm = d.seats[T.seat]; note({ name: gm.name, color: Kit.color ? Kit.color(T.seat) : null, kind: 'gone', title: 'You’ve left the table', line: 'You were away for ' + mins(leaveMs(T.st)) + '.', say: 'You were away for ' + mins(leaveMs(T.st)) + ', so you’ve left the table.' });
        setTimeout(function () { if (T.code === gc) leave(); }, 1500);
      }
      return;
    }
    if (d.seats) d.seats.forEach(function (x, i) { stale(d, i); });   // (notes, by this device's clock, whose beats have just changed)
    if (T.seat >= 0 && !document.hidden && d.status === 'playing' && (covered(d, T.seat) || stale(d, T.seat, Date.now() - HB))) beatSoon();   // (you're here: back, or just opened the table)
    if (T.closing) tryClose(false);
    botCheck();
    dropCheck(); paintAway();
  }

  // ── Opening, joining, starting, leaving ──
  function need() {
    if (!ready()) { Kit.toast('Sign in with your PIN to play online'); return false; }
    return true;
  }
  function host(me, bots) {
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
          if (bots && bots.length) dd.bn = bots.slice(0, 9);   // (the robots named in the host's setup sit in the seats nobody takes)
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
      (d.bn || []).forEach(function (nm) { if (seats.length < n && typeof nm === 'string' && nm && names.indexOf(nm) < 0) { seats.push({ name: nm, bot: true }); names.push(nm); } });
      if (n > seats.length) (Kit.cpuNames ? Kit.cpuNames(n - seats.length, names, n >= 4 ? 8 : 0) : []).forEach(function (nm) { seats.push({ name: nm, bot: true }); });
      while (seats.length < n) seats.push({ name: 'Robot ' + seats.length, bot: true });
      var o = {}; try { o = JSON.parse(d.opts || '{}'); } catch (e) {}
      var st = G.start(seats.map(function (s) { return { name: s.name, bot: !!s.bot }; }), o);
      var p = patchFor(st, null, (d.seq || 0) + 1, -1, null);
      p.seats = seats; p.t0 = Date.now(); p.drive = 0; p.hs = hs.length; p.cov = {};
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
      var p = patchFor(st, null, (d.seq || 0) + 1, T.seat, d); p.g = (d.g || 1) + 1; p.t0 = Date.now(); p.cov = {};   // (anyone still away is noticed again in the new game)
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
      if (d.seats[s] && d.seats[s].gone) return { accts: (d.accts || []).filter(function (a) { return a !== tag; }) };   // (it left while away: only the account goes)
      var cov = null; if (d.cov && d.cov[s] != null) { cov = Object.assign({}, d.cov); delete cov[s]; }
      var st = JSON.parse(d.st), seats2 = d.seats.slice(), others = humans(d).filter(function (x) { return !x.left; }).length - 1, accts2 = (d.accts || []).filter(function (a) { return a !== tag; });
      if (!others) return { status: 'closed', accts: accts2, at: Date.now(), by: dev() };
      if (G.resign) {
        var rr = G.resign(st, s), toBot = rr && rr.state && rr.bot;
        st = rr && rr.state ? rr.state : rr;
        seats2[s] = toBot ? { name: seats2[s].name, bot: true, left: true } : Object.assign({}, seats2[s], { left: true });
      }
      else if (G.bot || G.botTakeover) { seats2[s] = { name: seats2[s].name, bot: true, left: true }; }
      else {
        seats2[s] = Object.assign({}, seats2[s], { left: true });
        var win = []; seats2.forEach(function (x, i) { if (i !== s) win.push(i); });
        var pq = patchFor(st, null, d.seq + 1, -1, null);
        pq.status = 'over'; pq.turn = []; pq.result = { win: win, text: d.seats[s].name + ' left the game', left: s }; pq.seats = seats2; pq.accts = accts2;
        if (cov) pq.cov = cov;
        return pq;
      }
      var pr = patchFor(st, null, d.seq + 1, -1, null); pr.seats = seats2; pr.accts = accts2;
      if (cov) pr.cov = cov;
      return pr;
    }).catch(function (e) { console.warn('[turnnet] leave', e); });
    // (the game's leave() can still read the table as it was, net.state and net.seat, to settle up)
    T.d = null; closeOv(); paintChips(); T.closing = null;
    if (!quiet) { try { G.leave(); } catch (e) { console.warn('[turnnet] leave', e); } }
    if (!T.code) { T.seat = -1; T.st = null; }
    return p;
  }

  // Step away from the table without leaving it (your seat stays; it's in Your games and on the home screen)
  function detach() {
    if (!T.code) return;
    stopListen(); T.code = null; T.d = null; T.seat = -1; T.st = null; T.seq = -1; closeOv(); paintChips();
  }

  // ── Screens: the lobby and the waiting room, over the game ──
  var CSS = '.tn-ov{position:fixed;inset:0;z-index:55;overflow-y:auto;-webkit-overflow-scrolling:touch;background:var(--bg,#14112a);padding-top:calc(env(safe-area-inset-top,0px) + 10px);}' +
    '.tn-ov .ol{max-width:620px;margin:0 auto;padding:4px 16px calc(env(safe-area-inset-bottom,0px) + 24px);display:flex;flex-direction:column;gap:12px;}' +
    '.tn-ov h1{font-family:var(--display);font-weight:400;font-size:2rem;margin:4px 0 0;text-align:center;}' +
    '.tn-ov .tn-sub{text-align:center;color:var(--text-3);font-weight:800;margin:-6px 0 2px;}' +
    '.tn-ov .ol-h{font-size:.84rem;font-weight:700;color:var(--text-2);margin:10px 2px -2px;}' +
    '.tn-ov .ol-note{color:var(--text-3);font-size:.9rem;margin:0;font-weight:600;}' +
    '.tn-ov .ol-row{display:flex;align-items:center;gap:12px;padding:12px;border-radius:18px;background:var(--surface);box-shadow:var(--shadow-sm);border:0;color:inherit;font:inherit;text-align:left;width:100%;}' +
    '.tn-ov .ol-row .grow{flex:1;min-width:0;}.tn-ov .ol-row b{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}' +
    '.tn-ov .ol-row small{display:block;color:var(--text-3);font-weight:700;font-size:.8rem;}' +
    '.tn-ov .ol-row .avatar{width:40px;height:40px;flex:none;}' +
    '.tn-ov button.ol-row{cursor:pointer;}.tn-ov button.ol-row:active{transform:scale(.98);}' +
    '.tn-ov .tn-g.turn{background:linear-gradient(120deg,color-mix(in srgb,var(--yellow,#f5c542) 22%,var(--surface)),var(--surface) 75%);box-shadow:inset 0 0 0 2px color-mix(in srgb,var(--yellow,#f5c542) 60%,transparent),var(--shadow-sm);}' +
    '.tn-ov .tn-g .yt{flex:none;font-size:.72rem;font-weight:700;padding:4px 9px;border-radius:999px;background:linear-gradient(180deg,var(--gold-hi,#ffe486),var(--gold-lo,#f6b93b));color:var(--gold-ink,#2a1c00);}' +
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
    '.tn-chip.away:not(.bot){opacity:.55;}.tn-chip.cover{opacity:.7;box-shadow:inset 0 0 0 1.5px color-mix(in srgb,var(--text-3) 70%,transparent);}.tn-chip.cover.up{opacity:1;}.tn-chip.left{opacity:.4;text-decoration:line-through;}' +
    '.tn-chip .tn-bot{width:14px;height:14px;opacity:.7;}.tn-chip.cover .avatar{filter:saturate(.3) brightness(.85);}.tn-chip.cover:not(.up) .tn-bot{opacity:1;color:var(--text-2);}' +
    /* the last one at the table: your face lit, the faces of those who left faded with the mark of leaving */
    '.tn-lo-faces{display:flex;justify-content:center;flex-wrap:wrap;gap:18px;margin:6px 0 14px;}' +
    '.tn-lo-faces > span{display:flex;flex-direction:column;align-items:center;gap:6px;font-size:.8rem;font-weight:800;color:var(--text-2);max-width:88px;text-align:center;}' +
    '.tn-lo-me .avatar{width:52px;height:52px;font-size:1.3rem;box-shadow:0 0 0 2.5px var(--gold-hi,var(--yellow,#f5c542)),0 0 18px color-mix(in srgb,var(--yellow,#f5c542) 40%,transparent);}' +
    '.tn-lo-me small{color:var(--text);}.tn-lo p{margin:0;line-height:1.4;}';
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
    wrap.appendChild(E('p', { class: 'tn-sub', text: 'Take your turn in ' + G.title + ' whenever you like.' }));
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
    var codeIn = E('input', { class: 'input', type: 'text', maxlength: '4', placeholder: 'Code', 'aria-label': 'Table code', autocapitalize: 'characters', 'data-osk': 'letters', 'data-osk-space': 'off', enterkeyhint: 'go', autocomplete: 'off', spellcheck: 'false' });
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
          var sub = d.status === 'open' ? 'Waiting for players \u00b7 Code ' + x.code : x.mine ? 'Last move ' + ago(d.at || 0) : (upName ? upName + '’s turn' : 'Their turn') + ' \u00b7 Last move ' + ago(d.at || 0);   // (facts: a line each)
          var b = E('button', { type: 'button', class: 'ol-row tn-g ' + (x.mine ? 'turn' : 'wait'), onclick: function (e) { run(e.currentTarget, 'Opening…', function () { return resume(x.code); }); } }, [
            faces, E('div', { class: 'grow' }, [E('b', { text: others.length ? 'With ' + others.map(function (s) { return s.name; }).join(', ') : 'Your table' }), Kit.facts(E('small'), sub)]),
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
          var sub = n + ' of ' + (d.max || 2) + ' seats are taken \u00b7 Code ' + x.code;
          var go = function (e) { run(e.currentTarget, 'Joining…', function () { return join(x.code, me); }); };
          if (r.who) pals.appendChild(E('div', { class: 'ol-row ol-pal' }, [av(r.who.name, 1), E('div', { class: 'grow' }, [E('b', { text: r.who.name + ' has a table open' }), Kit.facts(E('small'), sub)]),
            E('button', { type: 'button', class: 'btn btn-primary btn-lg btn-block', html: Kit.icon('play') + '<span>' + Kit.esc('Join ' + r.who.name + '’s table') + '</span>', onclick: go })]));
          else rest.push([x, sub, go]);
        });
        if (!rest.length) rooms.appendChild(E('p', { class: 'ol-note', text: 'No open tables yet. When someone opens one, it shows up here.' }));
        rest.forEach(function (y) {
          rooms.appendChild(E('div', { class: 'ol-row' }, [av(y[0].host.name, 1), E('div', { class: 'grow' }, [E('b', { text: y[0].host.name + '’s table' }), Kit.facts(E('small'), y[1])]),
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
    paintAway();
    chipsEls = chipsEls.filter(function (e) { return e.isConnected || !e._seen; });
    chipsEls.forEach(function (box) {
      box._seen = true; box.innerHTML = ''; box.hidden = !T.d || T.d.status === 'open';
      if (box.hidden) return;
      var up = T.d.status === 'playing' ? turnOf(T.st) : [];
      T.d.seats.forEach(function (s, i) {
        var cv = !s.bot && !s.left && covered(T.d, i), byBot = cv && !ownDrop();
        var c = E('span', { class: 'tn-chip' + (up.indexOf(i) >= 0 ? ' up' : '') + (i === T.seat ? ' me' : '') + (s.bot ? ' bot' : '') + (s.left ? ' left' : '') + (!s.bot && away(i) ? ' away' : '') + (cv ? ' cover' : ''),
          title: cv ? (byBot ? 'The computer plays for ' + s.name + ' until ' + s.name + ' is back' : s.name + '’s device dropped out') : '' }, [av(s.name, i), E('span', { text: s.name })]);
        if (s.bot || byBot) c.appendChild(E('span', { class: 'tn-bot', html: Kit.icon('bot') }));
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
        var note = null; try { note = G.leaveNote ? G.leaveNote(T.st, T.seat) : null; } catch (e) {}
        Kit.confirm('Leave the online game?', { ok: 'Leave', danger: true, body: note || (botsTake ? 'The computer takes your seat and the others play on.' : 'The game ends and the others win.') }).then(function (ok) { if (ok) leave(); });
      } }
    ];
  }

  // Open a table straight away, with the settings the game's setup has just saved (the setup's Play online: the player
  // has looked over the rules and the seats there). Anything missing (no sign-in, no name yet) goes by way of the lobby.
  function hostNow(o) {
    if (!G) return false;
    var me = meName(); if (o && o.name && !me.name) { me.name = o.name; lsP('tn_me', { name: o.name }); }
    if (!ready() || !me.name) { lobby(); return true; }
    ov(); host(me, o && o.bots);
    return true;
  }
  window.TurnNet = {
    host: hostNow, ready: function () { return !!G; },
    // what the setup's review says about a table of this game: people at it, and the seats the computer fills
    info: function () { return G ? { title: G.title, min: G.min || 2, max: G.max || 2, bots: !!G.bot, seats: function (n, opts) { try { return G.seats ? G.seats(n, opts || (G.opts ? G.opts() : {}) || {}) : n; } catch (e) { return n; } } } : null; },
    setup: setup, open: lobby, menu: menu, chips: chips, leave: leave, away: detach, again: again, poke: poke,
    on: function () { return !!T.code && !!T.d && T.d.status !== 'open'; }, net: net,
    _t: T, _store: store, _acct: acctTag
  };
})();
