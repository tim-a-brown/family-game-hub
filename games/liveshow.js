// ═══════════════════════════════════════════════════════════════════════════
// liveshow.js: a game show played live, each contestant at their own podium on their own device
// (Wheel of Fortune, Press Your Luck). Built on online.js (WebRTC, a direct link like Centipede's).
//
// The host's device runs the show: the whole game, the computer contestants at any podium nobody took, and
// what everyone sees and hears, sent to the other devices as it happens. The others play their own podium:
// their buttons answer at once on their own device and go to the host, which checks them and plays them.
//
// Fairness. Each guest keeps the host's clock: pings at the start and every second and a half after, the
// offset taken from the quickest round trips. Anything that must appear everywhere at once (a toss-up letter,
// the Big Board's light) is sent ahead with the host-clock moment it shows (at), and every device, the host
// included, shows it then. A buzz, or a stop of the board, is judged by when the player pressed on their own
// device, on that shared clock, not by when the message arrived: the host waits a short window (the slowest
// link still able to beat the first press) for presses still on their way, then the earliest press wins.
//
// LiveShow(o) -> show
//   o: {game, title, app, max (3), colors [seat colours], intro (tables list), note() (the rules, one line),
//       hostStart(seats) the host taps Start: seats [{name, dev, cpu, away}] (seat 0 is the host),
//       seatMsg(seat, m) a guest's message reaches the host, seatLeft(seat), seatBack(seat) (host)
//       hostMsg(m) the host's message reaches a guest, ended(why) the guest's show is over ('host' | 'lost')
//       toSetup() leave online play for the setup, stopView() take the show off the screen}
//   show.mode 'host' | 'guest' | null; show.seat (this device's podium); show.seats; show.hostName
//   show.lobby() / host(name) / join(code, name) / leave(ask) / backToTable() / waitRoom()
//   show.now() the host's clock (ms); show.lead() how far ahead to send what must show everywhere at once
//   show.ow(seat) one-way delay to a guest (ms); show.at(t, fn) runs fn at host-clock t on this device
//   show.send(m, reliable) guest to host; show.cast(m, reliable) host to every guest; show.to(seat, m)
//   show.judge({eligible(seat), decide(press)}) -> {press(seat, at, x), remote(seat, at, x), open, reset()}
//   show.live: a show is under way; show.peerOf(seat): a guest's link (host)
//   LiveShow.morph(live, fresh): brings an element in line with a new copy without remaking what's the same
// ═══════════════════════════════════════════════════════════════════════════
(function () {
  'use strict';
  if (window.LiveShow) return;
  function pnow() { return performance.now(); }
  var LINKMSG = 'Couldn’t link up with the other device. Check that both devices are online, then try again.';

  // Bring live element a in line with b (same tag), keeping every node that stays, so nothing animates again.
  // A child whose data-k differs is a new thing and is replaced; data-nm keeps a node's own content as it is.
  function morph(a, b) {
    var i, n;
    for (i = a.attributes.length - 1; i >= 0; i--) { n = a.attributes[i].name; if (!b.hasAttribute(n)) a.removeAttribute(n); }
    for (i = 0; i < b.attributes.length; i++) { n = b.attributes[i]; if (a.getAttribute(n.name) !== n.value) a.setAttribute(n.name, n.value); }
    if (a.hasAttribute('data-nm')) return;
    var bc = Array.prototype.slice.call(b.childNodes);
    for (i = 0; i < bc.length; i++) {
      var x = a.childNodes[i], y = bc[i];
      if (x && x.nodeType === y.nodeType && (y.nodeType !== 1 || (x.tagName === y.tagName && x.getAttribute('data-k') === y.getAttribute('data-k')))) {
        if (y.nodeType === 1) morph(x, y); else if (x.nodeValue !== y.nodeValue) x.nodeValue = y.nodeValue;
      } else if (x) a.replaceChild(y, x); else a.appendChild(y);
    }
    while (a.childNodes.length > bc.length) a.removeChild(a.lastChild);
  }

  function LiveShow(o) {
    var Kit = window.Kit, Online = window.Online, app = o.app, MAX = o.max || 3;
    var L = { mode: null, seat: 0, seats: [], hostName: '', table: null, peers: {}, peer: null, live: false, wait: null, lob: null, me: '',
      off: 0, smp: [], rtt: 0, pingT: 0, rt: {}, lag: 0, leaving: false, note: '' };

    function myName() { try { return (localStorage.getItem('my_name') || '').trim(); } catch (e) { return ''; } }
    function col(i) { return (o.colors && o.colors[i]) || (Kit.color ? Kit.color(i) : '#888'); }

    // ── The host's clock, on a guest ──
    function ping() { if (L.peer && !L.peer.closed) raw({ t: '_pq', a: pnow(), r: Math.round(L.rtt) }, false); }
    function pong(m) {
      var t = pnow(), r = t - m.a; if (r < 0 || r > 5000) return;
      L.smp.push({ r: r, off: m.h + r / 2 - t }); if (L.smp.length > 16) L.smp.shift();
      var best = L.smp[0]; L.smp.forEach(function (s) { if (s.r < best.r) best = s; });
      L.off = best.off;
      // the round trip as it is now: the middle of the last six (a link can get slower, and one late ping is noise)
      var rs = L.smp.slice(-6).map(function (s) { return s.r; }).sort(function (a, b) { return a - b; });
      L.rtt = rs[Math.floor((rs.length - 1) / 2)];
    }
    function startPings() {
      clearInterval(L.pingT); L.smp = []; var k = 0;
      (function burst() { if (!L.peer || L.peer.closed || k++ >= 10) return; ping(); setTimeout(burst, 70); })();
      L.pingT = setInterval(ping, 1500);
    }
    function now() { return L.mode === 'guest' ? pnow() + L.off : pnow(); }
    function ow(s) { return L.mode === 'host' ? (L.rt[s] || 80) / 2 : L.rtt / 2; }
    function lead() {
      if (L.mode !== 'host') return 0;
      var w = 0; Object.keys(L.peers).forEach(function (s) { w = Math.max(w, ow(+s)); });
      return Math.round(Math.max(60, Math.min(800, w + 45)));
    }
    function at(t, fn) { return setTimeout(fn, Math.max(0, t - now())); }

    // ── Sending (a test can slow one guest's link both ways: show.lag = ms) ──
    function raw(m, rel) { var p = L.peer; if (!p || p.closed) return; if (L.lag) setTimeout(function () { if (!p.closed) p.send(m, rel); }, L.lag); else p.send(m, rel); }
    function send(m, rel) { if (L.mode === 'guest') raw(m, rel !== false); }
    function to(s, m, rel) { var p = L.peers[s]; if (p && !p.closed) p.send(m, rel !== false); }
    function cast(m, rel) { var s = typeof m === 'string' ? m : JSON.stringify(m); Object.keys(L.peers).forEach(function (k) { var p = L.peers[k]; if (p && !p.closed) p.send(s, rel !== false); }); }

    // ── Buzzers ──
    function judge(j) {
      var J = { open: false, c: [], t: 0 };
      J.reset = function () { clearTimeout(J.t); J.c = []; J.t = 0; J.open = false; };
      J.press = function (seat, t, x) {
        if (!j.eligible(seat) || J.c.some(function (c) { return c.seat === seat; })) return;
        J.c.push({ seat: seat, at: t, x: x });
        if (J.c.length > 1) return;
        J.open = true;
        // a press can still be beaten by one from a slower link that is already on its way: wait that long
        var w = 0;
        Object.keys(L.peers).forEach(function (s) { s = +s; if (s !== seat && j.eligible(s)) w = Math.max(w, ow(s) * 1.25 + 45); });
        J.t = setTimeout(function () {
          var best = null;
          J.c.forEach(function (c) { if (!best || c.at < best.at || (c.at === best.at && Math.random() < 0.5)) best = c; });
          var all = J.c; J.c = []; J.t = 0; J.open = false;
          j.decide(best, all);
        }, Math.max(0, t + Math.min(450, w) - now()));
      };
      // a press from a guest: its own clock's moment, kept within what the link allows
      J.remote = function (seat, t, x) {
        var n = now(), lo = n - 2 * ow(seat) - 250;
        t = +t; if (!isFinite(t) || t > n) t = n; if (t < lo) t = lo;
        J.press(seat, t, x);
      };
      return J;
    }

    // ── The tables list ──
    function lobby() {
      stopNet(); if (o.stopView) o.stopView();
      app.className = 'stage';
      L.lob = Online.lobby(app, {
        game: o.game, title: o.title, max: MAX, intro: o.intro,
        me: { name: L.me || myName() },
        onName: function (n) { L.me = n; },
        onHost: function (me) { L.from = 'lobby'; return host(me.name); },
        onJoin: function (code, room, me) { return join(code, me.name); },
        onSolo: function () { closeLobby(); o.toSetup(); }, solo: 'Play on this device instead',
        sub: function (r) { return r.status === 'playing' ? (r.info || 'The show is on') : 'Waiting for contestants'; }
      });
      window.scrollTo(0, 0);
    }
    function closeLobby() { if (L.lob) { L.lob.close(); L.lob = null; } }
    function backOut() { if (L.from === 'lobby') lobby(); else o.toSetup(); }

    // ── Hosting ──
    function host(name) {
      closeLobby(); if (o.stopView) o.stopView(); L.me = name || L.me || myName();
      return Online.host({ game: o.game, name: L.me, max: MAX, min: 2, screen: app, relay: false,
        // a show under way keeps each podium for its own player: only their device can take it again
        accept: function (x) {
          if (!L.live) return true;
          var dev = x && x.x && x.x.dev;
          return L.seats.some(function (s) { return s && s.dev && s.dev === dev; }) ? true : 'That show is under way';
        }
      }).then(function (table) {
        L.mode = 'host'; L.table = table; L.peers = {}; L.seat = 0; L.rt = {}; L.live = false;
        L.seats = [{ name: L.me, dev: Online.dev(), host: true }];
        table.on('fail', function (e) { Kit.toast('Couldn’t open a table. ' + Online.errText(e)); stopNet(); backOut(); });
        table.on('peer', hostPeer);
        table.on('leave', hostLeave);
        table.on('msg', hostMsg);
        waitRoom();
      }, function (e) { if (!(e && e.message === 'Cancelled')) Kit.toast('Couldn’t open a table. ' + Online.errText(e)); backOut(); });
    }
    function seatOf(peer) { for (var k in L.peers) if (L.peers[k] === peer) return +k; return -1; }
    function hostPeer(peer) {
      var dev = peer.info && peer.info.x && peer.info.x.dev || peer.id;
      if (L.live) {
        var s = -1; L.seats.forEach(function (x, i) { if (x && x.dev === dev && i) s = i; });
        if (s < 0) { peer.close('full'); return; }
        var old = L.peers[s]; if (old && old !== peer && !old.closed) old.close('rejoin');
        L.peers[s] = peer; L.seats[s].away = false;
        roster();
        o.seatBack(s);
        return;
      }
      var seat = -1;
      L.seats.forEach(function (x, i) { if (x && x.dev === dev && i) seat = i; });
      for (var i = 1; i < MAX && seat < 0; i++) if (!L.seats[i]) seat = i;
      if (seat < 0) { peer.close('full'); return; }
      var nm = peer.name || 'Player';
      if (L.seats.some(function (x, i) { return x && i !== seat && x.name.toLowerCase() === nm.toLowerCase(); })) nm = nm + ' ' + (seat + 1);
      L.peers[seat] = peer; L.seats[seat] = { name: nm, dev: dev };
      roster();
      Kit.toast(nm + ' joined'); Kit.sfx('pop');
    }
    function hostLeave(peer) {
      var s = seatOf(peer); if (s < 0) return;
      delete L.peers[s]; delete L.rt[s];
      if (L.live) { L.seats[s].away = true; roster(); o.seatLeft(s); return; }
      var nm = L.seats[s] && L.seats[s].name; L.seats[s] = null;
      roster(); if (nm) Kit.toast(nm + ' left');
    }
    function hostMsg(peer, m) {
      var s = seatOf(peer); if (s < 0 || !m) return;
      if (m.t === '_pq') { peer.send({ t: '_pa', a: m.a, h: pnow() }, false); if (m.r) L.rt[s] = m.r; return; }
      if (L.live) o.seatMsg(s, m);
    }
    function roster() {
      Object.keys(L.peers).forEach(function (k) { to(+k, { t: '_ro', seats: L.seats, me: +k, host: L.me, note: o.note() }); });
      if (L.wait) L.wait.update(waitPlayers());
      if (L.table) L.table.setStatus(L.live ? 'playing' : 'open', L.live ? 'The show is on' : '');
    }
    function waitPlayers() {
      var a = [];
      L.seats.forEach(function (x, i) { if (x) a.push({ name: x.name, host: i === 0, me: i === L.seat, color: col(i) }); });
      return a;
    }
    function waitNote() { return o.note() + ' The computer plays any podium nobody takes.'; }
    function waitRoom() {
      closeLobby(); if (o.stopView) o.stopView();
      app.className = 'stage';
      L.live = false;
      if (L.mode === 'host') {
        L.seats = L.seats.map(function (x) { return x && !x.away ? x : null; }); L.seats[0] = L.seats[0] || { name: L.me, dev: Online.dev(), host: true };
        L.wait = Online.waitRoom(app, { code: L.table.code, host: true, max: MAX, min: 2, table: L.table, players: waitPlayers(), note: waitNote(),
          onStart: hostStart, onLeave: function () { leave(false); backOut(); } });
        roster();
      } else {
        L.wait = Online.waitRoom(app, { host: false, hostName: L.hostName, max: MAX, min: 2, players: waitPlayers(), note: L.note,
          onLeave: function () { leave(false); lobby(); } });
      }
      window.scrollTo(0, 0);
    }
    function hostStart() {
      if (!Object.keys(L.peers).length) return;
      if (L.wait) { L.wait.close(); L.wait = null; }
      L.live = true;
      roster();
      cast({ t: '_go' });
      o.hostStart(L.seats.slice(0, MAX));
    }

    // ── Joining ──
    // back: this device is taking its own podium again. The host may not have noticed yet that the old link
    // dropped (up to ten seconds), and counts the table full until then: try again for a while
    function join(code, name, back) {
      closeLobby(); L.me = name || L.me || myName(); L.code = code;
      return Online.join(code, { game: o.game, name: L.me, min: 2, max: MAX, screen: app, relay: false, extra: { dev: Online.dev() } }).then(function (peer) {
        L.mode = 'guest'; L.peer = peer; L.hostName = peer.name; L.leaving = false; L.live = false; L.seats = []; L.seat = -1;
        peer.on('msg', function (m) { if (L.lag) setTimeout(function () { guestMsg(peer, m); }, L.lag); else guestMsg(peer, m); });
        peer.on('close', function (why) { guestLost(peer, why); });
        startPings();
        waitRoom();
      }, function (e) {
        if (back && e && /full/i.test(e.message || '') && Date.now() - back < 16000) {
          return new Promise(function (res) { setTimeout(res, 1500); }).then(function () { return join(code, L.me, back); });
        }
        if (!(e && e.message === 'Cancelled')) { if (e && e.nat) Kit.sheet({ title: 'Couldn’t connect', html: '<p>' + Kit.esc(LINKMSG) + '</p>' }); else Kit.toast(Online.errText(e)); }
        lobby();
      });
    }
    function guestMsg(peer, m) {
      if (peer !== L.peer || !m) return;
      if (m.t === '_pa') { pong(m); return; }
      if (m.t === '_ro') {
        L.seats = m.seats || []; L.seat = m.me; L.hostName = m.host || L.hostName;
        if (m.note && m.note !== L.note) { L.note = m.note + ' The computer plays any podium nobody takes.'; if (L.wait) { L.wait.close(); L.wait = null; waitRoom(); return; } }
        if (L.wait) L.wait.update(waitPlayers());
        return;
      }
      if (m.t === '_go') { L.live = true; if (L.wait) { L.wait.close(); L.wait = null; } return; }
      if (m.t === 'init') { L.live = true; if (L.wait) { L.wait.close(); L.wait = null; } }   // (the show itself, or back into it)
      if (m.t === '_end') { L.leaving = true; var p = L.peer; stopNet(); if (p) p.close('left'); o.ended('host'); return; }
      if (m.t === '_back') { L.live = false; waitRoom(); return; }
      o.hostMsg(m);
    }
    function guestLost(peer, why) {
      if (peer !== L.peer || L.leaving) return;
      var live = L.live, code = L.code;
      stopNet();
      o.ended(why === 'left' || !live ? 'host' : 'lost', code);
    }
    function rejoin(code) { return join(code, L.me, Date.now()); }
    // a page closed or reloaded says goodbye at once, so the others aren't left waiting (the host's closes the show)
    window.addEventListener('pagehide', function (e) { if (L.mode && !e.persisted) stopNet(); });

    // ── Leaving ──
    function stopNet() {
      clearInterval(L.pingT);
      var t = L.table, p = L.peer;
      if (L.mode === 'host') cast({ t: '_end' });
      L.mode = null; L.table = null; L.peer = null; L.peers = {}; L.live = false; L.seats = []; L.leaving = true;
      if (L.wait) { L.wait.close(); L.wait = null; }
      if (t) setTimeout(function () { t.close(); }, 120);
      if (p) p.close();
      closeLobby();
    }
    function leave(ask) {
      if (!L.mode) { closeLobby(); return Promise.resolve(true); }
      if (ask) {
        var host = L.mode === 'host';
        return Kit.confirm(L.live ? 'Leave the show?' : 'Leave the table?', { ok: 'Leave', body: host ? 'Your table closes, and the show ends for everyone.' : 'You can join ' + (L.hostName || 'the host') + '’s table again to take your podium back.' })
          .then(function (ok) { if (ok) { stopNet(); if (o.stopView) o.stopView(); o.toSetup(); } return ok; });
      }
      stopNet();
      return Promise.resolve(true);
    }
    // after the show: everyone back at the table for another
    function backToTable() {
      if (L.mode === 'host' && L.table && !L.table.closed) { cast({ t: '_back' }); waitRoom(); return; }
      if (L.mode === 'guest' && L.peer && !L.peer.closed) { L.live = false; waitRoom(); return; }
      stopNet(); lobby();
    }

    var show = {
      get mode() { return L.mode; }, get seat() { return L.seat; }, get seats() { return L.seats; }, get hostName() { return L.hostName; },
      get live() { return L.live; }, get code() { return L.table ? L.table.code : L.code; }, get rtt() { return L.rtt; }, get off() { return L.off; },
      set lag(v) { L.lag = +v || 0; }, get lag() { return L.lag; },
      lobby: lobby, host: host, join: join, rejoin: rejoin, leave: leave, backToTable: backToTable, waitRoom: waitRoom, start: hostStart,
      now: now, lead: lead, ow: ow, at: at, send: send, cast: cast, to: to, judge: judge,
      peerOf: function (s) { return L.peers[s] || null; }, linkMsg: LINKMSG,
      _peer: function () { return L.peer; }   // (tests: a guest's link, to cut it)
    };
    return show;
  }
  LiveShow.morph = morph;
  window.LiveShow = LiveShow;
})();
