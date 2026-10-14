// ═══════════════════════════════════════════════════════════════════════════
// online.js: play a game with other people, each on their own device.
//
// How it works
//   A "table" is one Firestore doc, arcadeRooms/{CODE} (4 letters). The doc only lists the table:
//     { game, host: {name, dev, lk}, status: 'open'|'playing'|'over', n, max, info, at, v, by }
//   The devices then talk straight to each other over WebRTC data channels (fast enough for an
//   arcade game; Firestore takes about one write a second). The table's host runs the game; the
//   others send their controls and draw what the host sends back.
//   The connection handshake (an offer and an answer, with each device's network addresses inside)
//   goes through arcadeRooms/{CODE}/sig/{id}: one doc each way, deleted once read.
//   host.lk is a one-way tag of the host's player-link profile code (never the code itself: a code
//   is a key to that profile, and anyone can list tables). The people linked to the host make the
//   same tag from the code they know, so their lobby puts the table on top with the host's avatar.
//   The tag is the same one the Lorcana lobby uses (linkTag below), so the two match.
//
// API (window.Online)
//   Online.dev()                         this device's id
//   Online.linkTag(code) -> Promise<tag> the table tag for a profile code (null when it can't be made)
//   Online.people()                      the people you've linked: [{name (as you know them), code, them}]
//   Online.whose(rooms) -> Promise       marks rooms opened by a linked person: room.who = person (or null)
//   Online.lobby(root, opts)             the lobby screen (see below); returns {close, refresh}
//   Online.waitRoom(root, opts)          the "waiting for players" screen; returns {update(players), close}
//   Online.host(opts) -> Promise<Table>  open a table and take players (Table: code, peers, on(), setStatus(), close())
//                                        on('fail', fn(err)): the server refused the new table after all (rare)
//   Online.busy(button, label) -> undo   show a button as busy ("Opening…" and a spinner) and disable it
//   Online.join(code, opts) -> Promise<Peer>   connect to a table
//   Online.useTransport(t) / Online.localTransport()   swap Firestore for another signaling store
//                                        (create(code, data): data may be a Promise; it may resolve before
//                                        the server confirms, with {saved: Promise} for the confirmation)
//                                        (localTransport: two tabs of one browser, for testing)
//   Online.config.iceServers             STUN (and TURN, if one is ever added) for WebRTC
//
// Peer: send(obj, reliable), on('msg'|'close', fn), close(), rtt, id, name.
// Two channels per connection: 'r' (reliable, in order) for events, 'u' (unreliable, unordered) for
// the many small updates where only the newest one matters.
// ═══════════════════════════════════════════════════════════════════════════
(function () {
  'use strict';
  if (window.Online) return;
  // A table writes a heartbeat every BEAT; one not heard from for STALE is gone (the host's page closed before
  // it could delete the doc), so lobbies drop it. Hidden pages can run timers only once a minute: STALE allows that.
  var COL = 'arcadeRooms', V = 1, STALE = 90000, BEAT = 30000;
  // Tables closed on this device: off its lists at once, before the server says so
  var GONE = {};
  function gone(code) { return !!GONE[code] && Date.now() - GONE[code] < 5 * 60000; }
  var LS = (function () { try { return window.localStorage; } catch (e) { return null; } })();
  function lsGet(k, d) { try { var v = LS.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }
  function lsSet(k, v) { try { LS.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function log() { if (config.debug) try { console.log.apply(console, ['[online ' + (performance.now() / 1000).toFixed(2) + ']'].concat([].slice.call(arguments))); } catch (e) {} }
  var config = { debug: false, iceServers: [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }], connectMs: 20000, gatherMs: 2500 };

  // ── This device ─────────────────────────────────────────────────────────
  var devId = null;
  function dev() {
    if (devId) return devId;
    try { devId = sessionStorage.getItem('online_dev_override') || null; } catch (e) {}
    if (!devId) { devId = lsGet('online_dev', null); if (!devId || !/^[a-z0-9]{8,12}$/.test(devId)) { devId = Math.random().toString(36).slice(2, 10).padEnd(8, '0'); lsSet('online_dev', devId); } }
    return devId;
  }
  function rid() { return dev() + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function code4() { var A = 'ABCDEFGHJKLMNPQRSTUVWXYZ', c = ''; for (var i = 0; i < 4; i++) c += A.charAt(Math.floor(Math.random() * A.length)); return c; }
  function myName() { try { return (LS.getItem('my_name') || '').trim(); } catch (e) { return ''; } }

  // ── Linked players ──────────────────────────────────────────────────────
  // Same tag as the Lorcana lobby (salt and cache included), so a table from either game is recognised.
  var LKT = {};
  function linkTag(code) {
    code = String(code || '');
    var c = window.crypto && window.crypto.subtle;
    if (!code || !c || typeof TextEncoder === 'undefined') return Promise.resolve(null);
    if (LKT[code]) return LKT[code];
    var saved = lsGet('lorc_lktag', {}) || {};
    if (saved[code]) return (LKT[code] = Promise.resolve(saved[code]));
    var enc = new TextEncoder();
    return (LKT[code] = c.importKey('raw', enc.encode(code), 'PBKDF2', false, ['deriveBits']).then(function (k) {
      return c.deriveBits({ name: 'PBKDF2', salt: enc.encode('fgh-lorcana-table'), iterations: 100000, hash: 'SHA-256' }, k, 64);
    }).then(function (b) {
      var t = Array.prototype.map.call(new Uint8Array(b), function (x) { return ('0' + x.toString(16)).slice(-2); }).join('');
      var m = lsGet('lorc_lktag', {}) || {}; m[code] = t; lsSet('lorc_lktag', m);
      return t;
    }).catch(function () { return null; }));
  }
  function people() {
    var L = window.FGHSync && FGHSync.links ? FGHSync.links() : null, out = [];
    if (!L || !L.others) return out;
    Object.keys(L.others).forEach(function (k) { var r = L.others[k]; if (r && !r.off && r.code && r.name) out.push(r); });
    return out;
  }
  function myTag() { var own = window.FGHSync && FGHSync.links ? FGHSync.links().own : null; return linkTag(own && own.code); }
  // room.who = the linked person who opened it (by tag; by name for a table without one), else null
  function whose(list) {
    var ppl = people();
    list.forEach(function (r) { r.who = null; });
    if (!ppl.length || !list.length) return Promise.resolve(list);
    var nk = function (n) { return String(n || '').trim().toLowerCase(); };
    return Promise.all(ppl.map(function (p) { return linkTag(p.code); })).then(function (tags) {
      var canTag = tags.some(function (t) { return !!t; });
      list.forEach(function (r) {
        var h = r.host || {}, i = -1;
        if (h.lk && canTag) i = tags.indexOf(h.lk);
        else if (!h.lk && h.name) { var n = nk(h.name); for (var j = 0; j < ppl.length && i < 0; j++) if (nk(ppl[j].name) === n || (ppl[j].them && nk(ppl[j].them) === n)) i = j; }
        r.who = i >= 0 ? ppl[i] : null;
      });
      return list;
    });
  }

  // ── Signaling stores ────────────────────────────────────────────────────
  // A transport: rooms(game, cb, err) -> off · create(code, data) · get(code) · update(code, patch) · remove(code)
  //   watch(code, cb, err) -> off · send(code, msg) · inbox(code, me, cb, err) -> off · ack(code, id)
  var TAKEN = 'taken';
  function fsTransport() {
    function db() { return window.FGHSync && FGHSync.db ? FGHSync.db() : Promise.reject(new Error('Sync isn’t loaded')); }
    function ref(d, code) { return d.collection(COL).doc(code); }
    function live(start) { var off = null, dead = false; start(function (o) { if (dead) o(); else off = o; }); return function () { dead = true; if (off) off(); }; }
    return {
      kind: 'firestore',
      rooms: function (game, cb, err) {
        return live(function (set) { db().then(function (d) { set(d.collection(COL).where('game', '==', game).limit(30).onSnapshot(function (qs) { var l = []; qs.forEach(function (doc) { l.push(Object.assign({ code: doc.id }, doc.data())); }); cb(l); }, err)); }).catch(err); });
      },
      // Checks the code is free (while the data is still being made), then writes the table. Resolves as soon as
      // the write is sent: Firestore shows it here at once and sends it in order; saved settles when the server has it.
      create: function (code, data) {
        return db().then(function (d) {
          var r = ref(d, code);
          return Promise.all([r.get(), data]).then(function (x) {
            var sn = x[0];
            if (sn.exists && Date.now() - (sn.data().at || 0) < 6 * 3600e3) throw new Error(TAKEN);
            return { saved: r.set(x[1]) };
          });
        });
      },
      get: function (code) { return db().then(function (d) { return ref(d, code).get(); }).then(function (sn) { return sn.exists ? sn.data() : null; }); },
      update: function (code, patch) { return db().then(function (d) { return ref(d, code).update(patch); }); },
      remove: function (code) { return db().then(function (d) { return ref(d, code).delete(); }); },
      watch: function (code, cb, err) { return live(function (set) { db().then(function (d) { set(ref(d, code).onSnapshot(function (sn) { cb(sn.exists ? sn.data() : null); }, err)); }).catch(err); }); },
      send: function (code, m) { return db().then(function (d) { return ref(d, code).collection('sig').doc(m.id).set({ to: m.to, from: m.from, k: m.k, d: m.d, at: m.at }); }); },
      inbox: function (code, me, cb, err) {
        return live(function (set) {
          db().then(function (d) {
            set(ref(d, code).collection('sig').where('to', '==', me).limit(20).onSnapshot(function (qs) {
              qs.docChanges().forEach(function (ch) { if (ch.type === 'added') cb(Object.assign({ id: ch.doc.id }, ch.doc.data())); });
            }, err));
          }).catch(err);
        });
      },
      ack: function (code, id) { return db().then(function (d) { return ref(d, code).collection('sig').doc(id).delete(); }); }
    };
  }
  // Two tabs of one browser (tests): each table and each message under its own localStorage key; the other
  // tabs hear about changes through the storage event
  function localTransport(name) {
    var P = 'online_local_' + (name || 'db') + ':', subs = [];
    window.addEventListener('storage', function (e) { if (!e.key || e.key.indexOf(P) === 0) fire(); });
    function all(pre) { var out = {}; try { for (var i = 0; i < LS.length; i++) { var k = LS.key(i); if (k && k.indexOf(P + pre) === 0) { var v = lsGet(k, null); if (v) out[k.slice((P + pre).length)] = v; } } } catch (e) {} return out; }
    function put(k, v) { if (v == null) { try { LS.removeItem(P + k); } catch (e) {} } else lsSet(P + k, v); setTimeout(fire, 0); }
    function fire() { subs.slice().forEach(function (s) { try { s(); } catch (e) { console.error(e); } }); }
    function sub(fn) { subs.push(fn); setTimeout(function () { if (subs.indexOf(fn) >= 0) fn(); }, 0); return function () { var i = subs.indexOf(fn); if (i >= 0) subs.splice(i, 1); }; }
    return {
      kind: 'local',
      rooms: function (game, cb) { return sub(function () { var r = all('room:'); cb(Object.keys(r).map(function (c) { return Object.assign({ code: c }, r[c]); }).filter(function (x) { return x.game === game; })); }); },
      create: function (code, data) { return Promise.resolve(data).then(function (data) { if (lsGet(P + 'room:' + code, null)) throw new Error(TAKEN); put('room:' + code, data); }); },
      get: function (code) { return Promise.resolve(lsGet(P + 'room:' + code, null)); },
      update: function (code, patch) { var r = lsGet(P + 'room:' + code, null); if (!r) return Promise.reject(new Error('No such table')); put('room:' + code, Object.assign(r, patch)); return Promise.resolve(); },
      remove: function (code) { put('room:' + code, null); return Promise.resolve(); },
      watch: function (code, cb) { var last = '?'; return sub(function () { var r = lsGet(P + 'room:' + code, null), j = JSON.stringify(r); if (j !== last) { last = j; cb(r); } }); },
      send: function (code, m) { put('sig:' + code + ':' + m.id, m); return Promise.resolve(); },
      inbox: function (code, me, cb) { var seen = {}; return sub(function () { var s = all('sig:' + code + ':'); Object.keys(s).forEach(function (id) { if (s[id].to === me && !seen[id]) { seen[id] = 1; cb(Object.assign({}, s[id], { id: id })); } }); }); },
      ack: function (code, id) { put('sig:' + code + ':' + id, null); return Promise.resolve(); }
    };
  }
  var transport = null;
  function T() {
    if (!transport) transport = lsGet('online_transport', null) === 'local' ? localTransport() : fsTransport();
    return transport;
  }

  // ── Peer: one WebRTC connection with a reliable and an unreliable channel ─
  function Peer(pc, id, name) {
    var p = this, ls = { msg: [], close: [], open: [] };
    p.pc = pc; p.id = id; p.name = name || ''; p.rtt = 0; p.open = false; p.closed = false; p.heard = Date.now();
    p.r = pc.createDataChannel('r', { negotiated: true, id: 0, ordered: true });
    p.u = pc.createDataChannel('u', { negotiated: true, id: 1, ordered: false, maxRetransmits: 0 });
    function onMsg(e) {
      p.heard = Date.now();
      var m; try { m = JSON.parse(e.data); } catch (er) { return; }
      if (m._ === 'p') { p.sendRaw(p.r, { _: 'q', t: m.t }); return; }
      if (m._ === 'q') { p.rtt = Date.now() - m.t; return; }
      if (m._ === 'bye') { p.close('left'); return; }
      ls.msg.forEach(function (f) { try { f(m); } catch (er) { console.error(er); } });
    }
    p.r.onmessage = onMsg; p.u.onmessage = onMsg;
    p.r.onopen = function () {
      if (p.open) return; p.open = true; p.heard = Date.now();
      p.beat = setInterval(function () {
        if (Date.now() - p.heard > 9000) { p.close('timeout'); return; }
        p.sendRaw(p.r, { _: 'p', t: Date.now() });
      }, 1000);
      ls.open.forEach(function (f) { f(); });
    };
    p.r.onclose = function () { p.close('closed'); };
    var dt = 0;
    pc.addEventListener('connectionstatechange', function () {
      var s = pc.connectionState; log('connection', id, s);
      if (s === 'failed' || s === 'closed') p.close(s);
      else if (s === 'disconnected') { clearTimeout(dt); dt = setTimeout(function () { if (pc.connectionState === 'disconnected') p.close('lost'); }, 6000); }
    });
    p.on = function (k, f) { ls[k].push(f); return p; };
    p._fire = function (k, a) { ls[k].forEach(function (f) { try { f(a); } catch (er) { console.error(er); } }); };
  }
  Peer.prototype.sendRaw = function (ch, obj) { try { if (ch.readyState === 'open') { ch.send(typeof obj === 'string' ? obj : JSON.stringify(obj)); return true; } } catch (e) {} return false; };
  // reliable: events that must arrive (and in order); otherwise the fast lane, where a lost update is fine
  Peer.prototype.send = function (obj, reliable) {
    var s = typeof obj === 'string' ? obj : JSON.stringify(obj);
    if (!reliable && this.u.readyState === 'open' && s.length < 15000) return this.sendRaw(this.u, s);
    return this.sendRaw(this.r, s);
  };
  Peer.prototype.close = function (why) {
    if (this.closed) return; this.closed = true; clearInterval(this.beat);
    if (why !== 'closed' && why !== 'left') this.sendRaw(this.r, { _: 'bye' });
    var pc = this.pc; setTimeout(function () { try { pc.close(); } catch (e) {} }, 60);
    this._fire('close', why || 'closed');
  };
  function gathered(pc) {
    return new Promise(function (res) {
      if (pc.iceGatheringState === 'complete') return res();
      var t = setTimeout(res, config.gatherMs);
      function chk() { if (pc.iceGatheringState === 'complete') { clearTimeout(t); res(); } }
      pc.addEventListener('icegatheringstatechange', chk);
      pc.addEventListener('icecandidate', function (e) { if (!e.candidate) { clearTimeout(t); res(); } });
    });
  }
  function newPc() { return new RTCPeerConnection({ iceServers: config.iceServers }); }
  function noRtc() { return typeof RTCPeerConnection === 'undefined'; }
  // Plain words for what went wrong
  function errText(e) {
    var m = String(e && e.message || e || '');
    if (e && e.code === 'permission-denied' || /permission/i.test(m)) return 'Online tables aren’t switched on yet.';
    if (/^load https?:/.test(m) || /offline|unavailable|network/i.test(m)) return 'Couldn’t reach the internet. Check the connection and try again.';
    return m || 'Something went wrong';
  }
  var NAT_MSG = 'Couldn’t connect to the other device. Some networks (often phone data, or school and office Wi-Fi) block direct connections between devices. Try again with both devices on the same Wi-Fi.';

  // ── Host a table ────────────────────────────────────────────────────────
  // opts: {game, name, max, info, accept(info) -> true | 'reason'}
  function host(opts) {
    if (noRtc()) return Promise.reject(new Error('This browser can’t play online.'));
    var t = T(), me = dev(), max = opts.max || 2;
    var table = { code: null, peers: {}, status: 'open', closed: false, max: max }, ls = { peer: [], leave: [], msg: [], fail: [], joining: [], joinfail: [] }, offs = [], beat = 0, pending = {};
    function fire(k, a, b) { ls[k].forEach(function (f) { try { f(a, b); } catch (e) { console.error(e); } }); }
    table.on = function (k, f) { ls[k].push(f); return table; };
    table.count = function () { return Object.keys(table.peers).length; };
    table.broadcast = function (obj, reliable) { var s = JSON.stringify(obj); Object.keys(table.peers).forEach(function (k) { table.peers[k].send(s, reliable); }); };
    var lastDoc = '';
    table.setStatus = function (status, info) {
      if (table.closed) return Promise.resolve();
      if (status) table.status = status;
      if (info != null) table.info = String(info).slice(0, 60);
      var patch = { status: table.status, n: table.count() + 1, info: table.info || '', at: Date.now(), by: me }, sig = JSON.stringify([patch.status, patch.n, patch.info]);
      if (sig === lastDoc && !arguments[2]) return Promise.resolve();
      lastDoc = sig;
      return t.update(table.code, patch).catch(function (e) { console.warn('[online] table update', e); });
    };
    table.close = function () {
      if (table.closed) return; table.closed = true; clearInterval(beat);
      offs.forEach(function (o) { try { o(); } catch (e) {} });
      Object.keys(table.peers).forEach(function (k) { table.peers[k].close('host'); });
      Object.keys(pending).forEach(function (k) { try { pending[k].close(); } catch (e) {} });
      if (table.code) { GONE[table.code] = Date.now(); t.remove(table.code).catch(function () {}); }
    };
    function answer(m) {
      log('host got', m.k, 'from', m.from);
      t.ack(table.code, m.id).catch(function () {});
      if (m.k !== 'offer' || table.closed) return;
      var o; try { o = JSON.parse(m.d); } catch (e) { return; }
      if (Date.now() - (m.at || 0) > 60000) return;   // left over from an earlier try
      var from = m.from, ok = table.peers[from] ? true : table.count() + 1 >= max ? 'That table is full' : opts.accept ? opts.accept(o) : true;
      if (ok !== true) { t.send(table.code, { id: rid(), to: from, from: me, k: 'no', d: JSON.stringify({ why: String(ok), sid: o.sid || '' }), at: Date.now() }).catch(function () {}); return; }
      if (table.peers[from]) table.peers[from].close('rejoin');
      if (pending[from]) try { pending[from].close(); } catch (e) {}
      var pc = newPc(), peer = new Peer(pc, from, String(o.name || 'Player').slice(0, 20));
      peer.link = o.lk || null; peer.info = o;
      pending[from] = pc; fire('joining', { dev: from, name: peer.name });
      var to = setTimeout(function () { if (!peer.open) { delete pending[from]; peer.close('timeout'); fire('joinfail', { dev: from, name: peer.name }); } }, config.connectMs + 5000);
      peer.on('open', function () {
        log('host: channel open with', from);
        clearTimeout(to); delete pending[from];
        if (table.closed) { peer.close('host'); return; }
        table.peers[from] = peer;
        peer.on('msg', function (msg) { fire('msg', peer, msg); });
        peer.on('close', function (why) { if (table.peers[from] === peer) { delete table.peers[from]; fire('leave', peer, why); table.setStatus(); } });
        fire('peer', peer); table.setStatus();
      });
      pc.setRemoteDescription({ type: 'offer', sdp: o.sdp })
        .then(function () { return pc.createAnswer(); })
        .then(function (a) { return pc.setLocalDescription(a); })
        .then(function () { return gathered(pc); })
        .then(function () { log('host: answer ready'); return t.send(table.code, { id: rid(), to: from, from: me, k: 'answer', d: JSON.stringify({ sdp: pc.localDescription.sdp, sid: o.sid || '' }), at: Date.now() }); })
        .catch(function (e) { console.warn('[online] answer failed', e); peer.close('failed'); fire('joinfail', { dev: from, name: peer.name }); });
    }
    // the link tag and the check that the code is free run side by side (nothing waits on the other)
    var tagP = myTag(), tries = 0;
    function attempt() {
      var code = code4();
      var data = tagP.then(function (lk) {
        var h = { name: String(opts.name || 'Player').slice(0, 20), dev: me };
        if (lk) h.lk = lk;   // so the people linked to you see it's your table
        return { game: opts.game, host: h, status: 'open', n: 1, max: max, info: opts.info || '', at: Date.now(), v: V, by: me };
      });
      return t.create(code, data).then(function (res) {
        // the table shows here straight away; if the server refuses it after all, close it and say so
        if (res && res.saved) res.saved.catch(function (e) {
          console.warn('[online] table not saved', e);
          if (table.closed) return;
          table.close();
          if (ls.fail.length) fire('fail', e); else if (window.Kit) Kit.toast('Couldn’t open the table. ' + errText(e));
        });
        return code;
      }, function (e) { if (e && e.message === TAKEN && ++tries < 6) return attempt(); throw e; });
    }
    var scr = opts.screen ? stage(opts.screen, { host: true, max: max, min: opts.min, hostName: opts.name, onLeave: function () { table.close(); scrCancel(); } }) : null, scrCancel = function () {};
    if (scr) scr.step('open', 'run', 'Getting a table code');
    var opened = attempt().then(function (code) {
      table.code = code;
      if (scr) { scr.setCode(code); scr.step('open', 'done', 'Code ' + code); scr.table(table); }
      offs.push(t.inbox(code, me, answer, function (e) { console.warn('[online] inbox', e); }));
      beat = setInterval(function () { table.setStatus(null, null, true); }, BEAT);
      return table;
    });
    if (!scr) return opened;
    return new Promise(function (res, rej) { scrCancel = function () { rej(new Error('Cancelled')); }; opened.then(res, rej); });
  }

  // ── Join a table ────────────────────────────────────────────────────────
  // opts: {game, name, extra}. Resolves with a Peer (the host) once connected; peer.room = the table doc.
  function join(code, opts) {
    if (noRtc()) return Promise.reject(new Error('This browser can’t play online.'));
    code = String(code || '').trim().toUpperCase();
    if (!/^[A-Z]{4}$/.test(code)) return Promise.reject(new Error('Table codes are 4 letters'));
    var t = T(), me = dev();
    var tagP = myTag();
    lastCode = code;
    var scr = opts.screen ? stage(opts.screen, { host: false, code: code, max: opts.max || 0, min: opts.min, onLeave: function () { if (cancel) cancel(); } }) : null, cancel = null;
    if (scr) { scr.step('find', 'run', 'Looking for table ' + code); scr.step('connect', 'wait'); scr.step('seat', 'wait'); scr.step('start', 'wait'); }
    return t.get(code).then(function (room) {
      if (!room || room.game !== opts.game) throw new Error('No open table with code ' + code);
      if (room.host && room.host.dev === me) throw new Error('That’s your own table. Join it from another device.');
      if (room.status !== 'open' && room.status !== 'playing' || Date.now() - (room.at || 0) > STALE * 3) throw new Error('That table has closed');
      if ((room.n || 1) >= (room.max || 2)) throw new Error('That table is full');
      if (scr) {
        scr.room(room);
        scr.step('find', 'done', (room.host && room.host.name || 'The host') + '’s table · ' + code);
        scr.step('connect', 'run', 'Asking ' + (room.host && room.host.name || 'the host') + '’s device to let you in');
      }
      return tagP.then(function (lk) {
        return new Promise(function (resolve, reject) {
          var pc = newPc(), peer = new Peer(pc, room.host.dev, room.host.name), offs = [], done = false, answered = false, sid = Math.random().toString(36).slice(2, 10);
          peer.room = room; peer.code = code;
          cancel = function () { finish(new Error('Cancelled')); };
          function finish(err) {
            if (done) return; done = true; clearTimeout(to);
            if (scr && !err) { scr.step('connect', 'done', 'Connected to ' + (room.host && room.host.name || 'the host')); scr.step('seat', 'run', 'Taking your seat'); }
            offs.forEach(function (o) { try { o(); } catch (e) {} });
            if (err) { peer.close('failed'); reject(err); } else resolve(peer);
          }
          var to = setTimeout(function () { var e = new Error(NAT_MSG); e.nat = true; finish(e); }, config.connectMs);
          peer.on('open', function () {
            log('guest: channel open');
            finish(null);
            // the host closing the table (or the page) ends the game here too
            var off = t.watch(code, function (r) { if (!r && !peer.closed) peer.close('host'); }, function () {});
            peer.on('close', function () { try { off(); } catch (e) {} });
          });
          offs.push(t.inbox(code, me, function (m) {
            t.ack(code, m.id).catch(function () {});
            log('guest got', m.k);
            if (m.from !== room.host.dev) return;
            var a; try { a = JSON.parse(m.d); } catch (e) { return; }
            if (!a || a.sid !== sid) return;   // an answer to an earlier try
            if (m.k === 'no') finish(new Error(a.why || 'The table didn’t let you in'));
            else if (m.k === 'answer' && !answered) { answered = true; if (scr) scr.step('connect', 'run', 'Let in · linking the two devices'); pc.setRemoteDescription({ type: 'answer', sdp: a.sdp }).catch(function (e) { finish(e); }); }
          }, function (e) { finish(e); }));
          pc.createOffer()
            .then(function (o) { return pc.setLocalDescription(o); })
            .then(function () { return gathered(pc); })
            .then(function () {
              log('guest: offer ready', pc.iceGatheringState);
              var d = { sdp: pc.localDescription.sdp, name: String(opts.name || 'Player').slice(0, 20), v: V, sid: sid };
              if (lk) d.lk = lk;
              if (opts.extra) d.x = opts.extra;
              return t.send(code, { id: rid(), to: room.host.dev, from: me, k: 'offer', d: JSON.stringify(d), at: Date.now() });
            })
            .catch(function (e) { finish(e); });
        });
      });
    });
  }

  // ── Screens ─────────────────────────────────────────────────────────────
  var CSS = '.ol{max-width:620px;margin:0 auto;padding:4px 16px calc(var(--safe-b,0px) + 24px);display:flex;flex-direction:column;gap:12px;}' +
    '.ol h1{font-family:var(--display);font-weight:400;font-size:2rem;margin:4px 0 0;text-align:center;}' +
    '.ol-h{font-size:.78rem;font-weight:900;letter-spacing:.12em;text-transform:uppercase;color:var(--text-3);margin:10px 2px -2px;}' +
    '.ol-note{color:var(--text-3);font-size:.9rem;margin:0;font-weight:600;}' +
    '.ol-row{display:flex;align-items:center;gap:12px;padding:12px;border-radius:18px;background:var(--surface);box-shadow:var(--shadow-sm);}' +
    '.ol-row .grow{flex:1;min-width:0;}.ol-row b{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}' +
    '.ol-row small{display:block;color:var(--text-3);font-weight:700;font-size:.8rem;}' +
    '.ol-pal{flex-wrap:wrap;padding:16px;background:linear-gradient(180deg,color-mix(in srgb,var(--accent) 22%,var(--surface)),var(--surface));box-shadow:inset 0 0 0 2px color-mix(in srgb,var(--accent) 55%,transparent),var(--shadow-sm);}' +
    '.ol-pal .avatar{width:64px;height:64px;font-size:1.6rem;}.ol-pal b{font-size:1.15rem;white-space:normal;}.ol-pal .btn{flex-basis:100%;}' +
    '.ol-code{font-family:var(--display);font-size:2.8rem;letter-spacing:.2em;color:var(--accent);text-align:center;margin:0;}' +
    '.ol-join{display:flex;gap:8px;}.ol-join .input{flex:1;min-width:0;text-transform:uppercase;letter-spacing:.12em;font-weight:800;}' +
    '.ol-spin{width:18px;height:18px;flex:none;border-radius:50%;border:3px solid rgba(255,255,255,.15);border-top-color:var(--accent);animation:olspin 1s linear infinite;}' +
    '@keyframes olspin{to{transform:rotate(360deg)}}.ol-seat .tag{font-size:.7rem;font-weight:900;letter-spacing:.08em;text-transform:uppercase;color:var(--text-3);}' +
    '.btn.ol-busy:disabled{opacity:.85;filter:none;cursor:progress;}' +
    '.ol-bspin{width:1em;height:1em;flex:none;border-radius:50%;border:.17em solid currentColor;border-right-color:transparent;animation:olspin .8s linear infinite;}';
  function css() { if (document.getElementById('ol-css')) return; var s = document.createElement('style'); s.id = 'ol-css'; s.textContent = CSS; document.head.appendChild(s); }
  function E(tag, a, kids) { return window.Kit ? Kit.el(tag, a, kids) : document.createElement(tag); }
  function esc(s) { return window.Kit ? Kit.esc(s) : String(s); }
  function av(name, color) { return window.Kit && Kit.avatar ? Kit.avatar.el(name || '?', null, color) : E('span', { class: 'avatar', text: String(name || '?').charAt(0) }); }
  // A button that's waiting on the network: spinner, label ("Opening…"), and no more taps. Returns undo().
  function busyBtn(btn, label) {
    css();
    var html = btn.innerHTML, was = btn.disabled;
    btn.disabled = true; btn.classList.add('ol-busy'); btn.setAttribute('aria-busy', 'true');
    btn.innerHTML = '<i class="ol-bspin" aria-hidden="true"></i><span>' + esc(label) + '</span>';
    return function () { btn.disabled = was; btn.classList.remove('ol-busy'); btn.removeAttribute('aria-busy'); btn.innerHTML = html; };
  }
  // Run one network action from a button, once: busy until it settles (fn returns a promise), or until the game
  // moves to another screen (fn returns nothing; if the screen stays, the button frees itself after a while)
  function oneAtATime() {
    var cur = null;
    function run(btn, label, fn) {
      if (cur) return false;
      var undo = btn ? busyBtn(btn, label) : function () {}, me = cur = {};
      var done = function () { if (cur !== me) return; cur = null; undo(); if (me.after) me.after(); };
      var r; try { r = fn(); } catch (e) { done(); throw e; }
      if (r && typeof r.then === 'function') r.then(done, done); else setTimeout(done, 15000);
      return me;
    }
    Object.defineProperty(run, 'busy', { get: function () { return !!cur; } });
    return run;
  }

  // Online.lobby(root, opts)
  //   opts: {game, title, intro, me: {name}, onName(name), onHost(), onJoin(code, room), onSolo(), solo: label,
  //          sub(room) -> text for a table's second line, max}
  function lobby(root, o) {
    css(); root.innerHTML = '';
    var me = o.me || { name: myName() }, alive = true, off = null, last = [];
    var wrap = E('div', { class: 'ol' });
    root.appendChild(wrap);
    wrap.appendChild(E('h1', { text: o.title || 'Play Online' }));
    if (o.intro) wrap.appendChild(E('p', { class: 'ol-note', style: { 'text-align': 'center' }, text: o.intro }));
    var seat = E('div', { class: 'ol-row' });
    function paintMe() {
      seat.innerHTML = '';
      seat.appendChild(av(me.name, window.Kit ? Kit.color(0) : null));
      seat.appendChild(E('div', { class: 'grow' }, [E('b', { text: me.name || 'Who’s playing?' }), E('small', { text: 'Your name at the table' })]));
      seat.appendChild(E('button', { type: 'button', class: 'btn btn-soft btn-sm', text: me.name ? 'Change' : 'Pick', onclick: function () { Kit.pickName(function (n) { me.name = n; if (o.onName) o.onName(n); paintMe(); }); } }));
    }
    paintMe();
    wrap.appendChild(seat);
    var pals = E('div', { class: 'stack' });
    wrap.appendChild(pals);
    function need() { if (!me.name) { Kit.toast('Pick your name first'); return false; } return true; }
    // one tap, one table: a second tap while the first is under way does nothing
    var one = oneAtATime(), held = false;
    function act(btn, label, fn) {
      if (!alive || !need()) return;
      var a = one(btn, label, fn);
      if (a) a.after = function () { if (alive && held) { held = false; paint(last); } };
    }
    function openTable(e) { act(e.currentTarget, 'Opening…', function () { return o.onHost(me); }); }
    function joinAt(r) { return function (e) { act(e.currentTarget, 'Joining…', function () { return o.onJoin(r.code, r, me); }); }; }
    wrap.appendChild(E('button', { type: 'button', class: 'btn btn-primary btn-lg btn-block', html: Kit.icon('users') + '<span>Open a table</span>', onclick: openTable }));
    wrap.appendChild(E('div', { class: 'ol-h', text: 'Open tables' }));
    var rooms = E('div', { class: 'stack' }, [E('p', { class: 'ol-note', text: 'Looking for open tables…' })]);
    wrap.appendChild(rooms);
    var code = E('input', { class: 'input', type: 'text', maxlength: '4', placeholder: 'Code', 'aria-label': 'Table code', autocapitalize: 'characters', autocomplete: 'off', spellcheck: 'false' });
    var codeBtn = E('button', { type: 'button', class: 'btn btn-soft', text: 'Join with code', onclick: go });
    code.addEventListener('keydown', function (e) { if (e.key === 'Enter') go(); });
    function go() { act(codeBtn, 'Joining…', function () { return o.onJoin(code.value.trim().toUpperCase(), null, me); }); }
    wrap.appendChild(E('div', { class: 'ol-join' }, [code, codeBtn]));
    if (o.onSolo) wrap.appendChild(E('button', { type: 'button', class: 'btn btn-ghost btn-block', text: o.solo || 'Play solo instead', onclick: o.onSolo }));
    if (o.note) wrap.appendChild(E('p', { class: 'ol-note', text: o.note }));

    function sub(r) { var s = o.sub ? o.sub(r) : ''; return (s ? s + ' · ' : '') + 'code ' + r.code; }
    function paint(list) {
      if (!alive) return;
      if (one.busy) { held = true; return; }   // a join is under way: keep its button as it is, paint after
      pals.innerHTML = ''; rooms.innerHTML = '';
      var mine = list.filter(function (r) { return r.who; }), rest = list.filter(function (r) { return !r.who; });
      mine.forEach(function (r) {
        var nm = r.who.name;
        pals.appendChild(E('div', { class: 'ol-row ol-pal' }, [
          av(nm, window.Kit ? Kit.color(1) : null),
          E('div', { class: 'grow' }, [E('b', { text: nm + (r.status === 'playing' ? ' is playing' : ' has a table open') }), E('small', { text: sub(r) })]),
          E('button', { type: 'button', class: 'btn btn-primary btn-lg btn-block', html: Kit.icon('play') + '<span>' + esc('Join ' + nm + '’s table') + '</span>', onclick: joinAt(r) })
        ]));
      });
      if (!rest.length) rooms.appendChild(E('p', { class: 'ol-note', text: mine.length ? 'No other open tables.' : 'No open tables yet. When someone opens one, it shows up here.' }));
      rest.forEach(function (r) {
        rooms.appendChild(E('div', { class: 'ol-row' }, [
          av(r.host.name, window.Kit ? Kit.color(1) : null),
          E('div', { class: 'grow' }, [E('b', { text: r.host.name + '’s table' }), E('small', { text: sub(r) })]),
          E('button', { type: 'button', class: 'btn btn-primary btn-sm', text: 'Join', onclick: joinAt(r) })
        ]));
      });
    }
    function got(all) {
      var now = Date.now(), d = dev();
      // only tables still taking players: not yours, not closed here, open or playing (any other status is over),
      // not full, and heard from lately
      var list = all.filter(function (r) { return r && r.host && r.host.dev !== d && !gone(r.code) && (r.status === 'open' || r.status === 'playing') && (r.n || 1) < (r.max || 2) && now - (r.at || 0) < STALE; });
      list.sort(function (a, b) { return (b.at || 0) - (a.at || 0); });
      sweep(all, now);
      var sig = list.map(function (r) { return [r.code, r.status, r.n, r.info, r.host.name, r.host.lk].join('|'); }).join(',');
      if (sig === shownSig) {   // nothing to show has changed: keep the fresh heartbeats, skip the repaint
        var who = {}; last.forEach(function (r) { who[r.code] = r.who; });
        list.forEach(function (r) { r.who = who[r.code] || null; });
        last = list; return;
      }
      last = list;
      whose(list).then(function () { if (last === list) { shownSig = sig; paint(list); } });
    }
    // Tables whose page closed before it could delete them stay in the store: clear out long-dead ones so the
    // list query (30 at most) keeps finding the live ones
    var swept = {}, shownSig = null;
    function sweep(all, now) {
      var n = 0;
      all.forEach(function (r) {
        if (n >= 5 || !r || !r.code || swept[r.code] || now - (r.at || 0) < 6 * 3600e3) return;
        swept[r.code] = 1; n++;
        T().remove(r.code).catch(function () {});
      });
    }
    off = T().rooms(o.game, got, function (e) { if (!alive) return; rooms.innerHTML = ''; rooms.appendChild(E('p', { class: 'ol-note', text: 'Couldn’t reach the tables. ' + errText(e) })); });
    // tables go stale without a heartbeat: look again now and then
    var tick = setInterval(function () { if (last.length) got(last); }, 10000);
    return { close: function () { alive = false; clearInterval(tick); if (off) off(); }, refresh: function () { shownSig = null; got(last); } };
  }

  // Online.waitRoom(root, {code, host: bool, hostName, players: [{name, color, me, host}], max, onStart, onLeave, note})

  // ── The table screen: from the first tap to the game starting, host and joiners ──
  // A felt table with a chair for every seat (filled, on the way in, or open), how many are here and how many
  // more are needed, and the steps left before the game begins, each ticking off as it happens.
  var CSS2 = '.olt h1{margin-bottom:2px;}' +
    '.olt-tbl{position:relative;width:min(100%,440px);aspect-ratio:1.42;margin:6px auto 0;}' +
    '.olt-rim{position:absolute;inset:19% 19%;border-radius:999px;padding:9px;}' +
    '.olt-felt{position:relative;width:100%;height:100%;border-radius:999px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;}' +
    '.olt-felt small{font-size:.66rem;font-weight:900;letter-spacing:.16em;text-transform:uppercase;opacity:.7;}' +
    '.olt-code{font-family:var(--display);font-size:clamp(1.9rem,8vw,2.6rem);letter-spacing:.22em;margin-right:-.22em;line-height:1.05;color:#ffe08a;text-shadow:0 2px 0 rgba(0,0,0,.35);}' +
    '.olt-code.pend{opacity:.35;letter-spacing:.3em;}' +
    '.olt-seat{position:absolute;width:62px;margin:-31px 0 0 -31px;display:flex;flex-direction:column;align-items:center;gap:3px;transition:transform .45s var(--spring,cubic-bezier(.3,1.5,.5,1));}' +
    '.olt-seat .avatar,.olt-chair{width:46px;height:46px;font-size:1.15rem;box-shadow:0 0 0 3px var(--bg,#14112a),0 6px 14px rgba(0,0,0,.35);}' +
    '.olt-chair{display:grid;place-items:center;border-radius:50%;border:2px dashed color-mix(in srgb,var(--text-3) 70%,transparent);background:color-mix(in srgb,var(--surface) 70%,transparent);color:var(--text-3);font-weight:900;font-size:.8rem;box-shadow:none;}' +
    '.olt-seat em{font-style:normal;font-size:.72rem;font-weight:800;max-width:70px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text-2);}' +
    '.olt-seat.need .olt-chair{border-color:#ffd36b;background:color-mix(in srgb,#ffd36b 14%,transparent);animation:oltPulse 1.6s ease-in-out infinite;}.olt-seat.need em{color:#ffd36b;}' +
    '.olt-seat.up{flex-direction:column-reverse;}.olt-seat.me em{color:var(--accent);}.olt-seat.host .avatar{box-shadow:0 0 0 3px var(--bg,#14112a),0 0 0 5px #ffd36b,0 6px 14px rgba(0,0,0,.35);}' +
    '.olt-seat.in{animation:oltIn .5s var(--spring,cubic-bezier(.3,1.5,.5,1));}' +
    '.olt-seat.coming .avatar,.olt-seat.coming .olt-chair{opacity:.55;animation:oltPulse 1.2s ease-in-out infinite;}' +
    '.olt-seat .olt-ring{position:absolute;top:-4px;left:50%;}.olt-seat.up .olt-ring{top:auto;bottom:-4px;}.olt-seat .olt-ring{width:54px;height:54px;margin-left:-27px;border-radius:50%;border:3px solid transparent;border-top-color:var(--accent);animation:olspin .9s linear infinite;}' +
    '@keyframes oltIn{0%{transform:scale(.3);opacity:0}100%{transform:scale(1);opacity:1}}' +
    '@keyframes oltPulse{50%{transform:scale(.92);opacity:.35}}' +
    '.olt-count{text-align:center;margin:2px 0 0;}.olt-count b{display:block;font-family:var(--display);font-weight:400;font-size:1.5rem;}' +
    '.olt-count small{display:block;color:var(--text-3);font-weight:800;font-size:.86rem;}.olt-count.ready small{color:#3fb56b;}' +
    '.olt-steps{list-style:none;margin:4px 0 0;padding:6px 14px;border-radius:18px;background:var(--surface);box-shadow:var(--shadow-sm);}' +
    '.olt-steps li{display:flex;align-items:center;gap:12px;padding:9px 0;}.olt-steps li + li{border-top:1px solid var(--w06,rgba(255,255,255,.06));}' +
    '.olt-steps li > i{flex:none;width:24px;height:24px;border-radius:50%;display:grid;place-items:center;border:2px solid color-mix(in srgb,var(--text-3) 55%,transparent);}' +
    '.olt-steps li > i svg{width:14px;height:14px;}' +
    '.olt-steps li.run > i{border-color:transparent;border-top-color:var(--accent);border-right-color:var(--accent);animation:olspin .9s linear infinite;}' +
    '.olt-steps li.done > i{background:#3fb56b;border-color:#3fb56b;color:#fff;animation:oltIn .4s var(--spring,cubic-bezier(.3,1.5,.5,1));}' +
    '.olt-steps li.now > i{background:var(--accent);border-color:var(--accent);color:var(--on-accent,#1b1400);}' +
    '.olt-steps li .grow{flex:1;min-width:0;}.olt-steps b{display:block;font-weight:800;}.olt-steps small{display:block;color:var(--text-3);font-weight:700;font-size:.8rem;}' +
    '.olt-steps li.wait{opacity:.55;}' +
    '.olt .ol-seat.coming{opacity:.6;}';
  var STEPS = {
    host: [['open', 'Open the table'], ['join', 'Players join'], ['start', 'Start the game']],
    guest: [['find', 'Find the table'], ['connect', 'Connect'], ['seat', 'Take your seat'], ['start', 'Game starts']]
  };
  function stage(root, o) {
    css();
    if (!document.getElementById('olt-css')) { var st0 = document.createElement('style'); st0.id = 'olt-css'; st0.textContent = CSS2; document.head.appendChild(st0); }
    var me = root._olStage;
    if (me && root.contains(me.el)) { me.opts(o); return me; }   // connecting → waiting: the same table carries on
    root.innerHTML = '';
    o = o || {};
    var S = { host: !!o.host, max: o.max || 2, min: o.min || 2, code: o.code || '', hostName: o.hostName || '', players: [], coming: [], room: null, onStart: o.onStart, onLeave: o.onLeave, note: o.note, ticks: {} };
    var wrap = E('div', { class: 'ol olt' }), h1 = E('h1'), tbl = E('div', { class: 'olt-tbl' });
    var mid = E('div', { class: 'olt-felt felt-in' }), codeEl = E('div', { class: 'olt-code' });
    mid.appendChild(E('small', { text: 'Table code' })); mid.appendChild(codeEl);
    tbl.appendChild(E('div', { class: 'olt-rim wood' }, [mid]));
    var seatsBox = E('div'); tbl.appendChild(seatsBox);
    var count = E('div', { class: 'olt-count' }, [E('b'), E('small')]);
    var steps = E('ol', { class: 'olt-steps' }), rows = {};
    (S.host ? STEPS.host : STEPS.guest).forEach(function (x) {
      var li = E('li', { class: 'wait' }, [E('i'), E('div', { class: 'grow' }, [E('b', { text: x[1] }), E('small')])]);
      rows[x[0]] = li; steps.appendChild(li);
    });
    var listH = E('div', { class: 'ol-h', text: 'Players' }), list = E('div', { class: 'stack' }), comingBox = E('div', { class: 'stack' });
    var one = oneAtATime(), startBtn = null, leaveBtn, noteEl = E('p', { class: 'ol-note' });
    if (S.host) startBtn = E('button', { type: 'button', class: 'btn btn-primary btn-lg btn-block', html: Kit.icon('play') + '<span>Start the game</span>', onclick: function (e) { if (S.onStart) one(e.currentTarget, 'Starting…', function () { return S.onStart(); }); } });
    leaveBtn = E('button', { type: 'button', class: 'btn btn-ghost btn-block', onclick: function (e) { if (S.onLeave) one(e.currentTarget, S.host ? 'Closing…' : 'Leaving…', function () { return S.onLeave(); }); } });
    [h1, tbl, count, steps, listH, list, comingBox].concat(startBtn ? [startBtn] : []).concat([leaveBtn, noteEl]).forEach(function (n) { wrap.appendChild(n); });
    root.appendChild(wrap);

    function hostLabel() { return S.host ? 'You' : (S.hostName || 'The host'); }
    function paintHead() {
      h1.textContent = S.host ? 'Your table' : (S.hostName ? S.hostName + '’s table' : 'Joining a table');
      codeEl.textContent = S.code || '····'; codeEl.classList.toggle('pend', !S.code);
      rows.start.querySelector('b').textContent = S.host ? 'Start the game' : (S.hostName || 'The host') + ' starts the game';
      leaveBtn.textContent = S.players.length ? (S.host ? 'Close the table' : 'Leave the table') : 'Cancel';
      noteEl.textContent = S.note || ''; noteEl.hidden = !S.note;
      listH.hidden = !S.players.length; list.hidden = !S.players.length;
    }
    function step(id, state, detail) {
      var li = rows[id]; if (!li) return;
      if (state && li.className !== state) {
        li.className = state;
        li.firstChild.innerHTML = state === 'done' ? Kit.icon('check') : state === 'now' ? Kit.icon('play') : '';
        if (state === 'done' && !S.ticks[id]) { S.ticks[id] = 1; try { Kit.sfx('tap'); } catch (e) {} }
      }
      if (detail != null) li.querySelector('small').textContent = detail;
    }
    // chairs round the table: everyone here, anyone on the way in, then open seats (big tables show a few + the rest)
    var known = {};
    function paintSeats() {
      var people = S.players.map(function (p) { return { name: p.name, color: p.color, me: p.me, host: p.host }; });
      if (!people.length && S.room) {   // still connecting: the host, the others already there, and you on the way
        people.push({ name: S.hostName, host: true });
        for (var q = 1; q < (S.room.n || 1); q++) people.push({ name: '', anon: true });
      }
      S.coming.forEach(function (c) { people.push({ name: c.name, coming: true }); });
      if (!S.host && !S.players.length) people.push({ name: 'You', me: true, coming: true });
      // every seat up to 8; a big table (Trivia, Apples: 24) shows six chairs, the last one standing for the rest
      var n = S.max <= 8 ? S.max : Math.min(12, Math.max(6, people.length + 1));
      seatsBox.innerHTML = '';
      for (var i = 0; i < n; i++) {
        var a = -Math.PI / 2 + i * 2 * Math.PI / n, x = 50 + 41 * Math.cos(a), y = 50 + 37 * Math.sin(a);
        var p = people[i], seat = E('div', { class: 'olt-seat' + (y < 30 ? ' up' : ''), style: { left: x + '%', top: y + '%' } });
        if (p) {
          var key = (p.coming ? 'c:' : '') + (p.name || '?') + i;
          if (!known[key]) { known[key] = 1; seat.classList.add('in'); }
          if (p.coming) seat.classList.add('coming');
          if (p.me) seat.classList.add('me');
          if (p.host) seat.classList.add('host');
          seat.appendChild(p.anon ? E('span', { class: 'olt-chair', html: Kit.icon('user') }) : av(p.name, p.color));
          if (p.coming) seat.appendChild(E('i', { class: 'olt-ring' }));
          seat.appendChild(E('em', { text: p.anon ? 'Player' : p.me && !S.players.length ? 'You' : p.name + (p.me ? ' (you)' : '') }));
        } else {
          // chairs still needed before the game can start look different from the optional ones
          var last = i === n - 1 && S.max > n, needed = i < S.min;
          if (needed) seat.classList.add('need');
          seat.appendChild(E('span', { class: 'olt-chair', text: last ? '+' + (S.max - n + 1) : '' }));
          seat.appendChild(E('em', { text: needed ? 'Needed' : last ? 'more' : 'Open' }));
        }
        seatsBox.appendChild(seat);
      }
    }
    function paintCount() {
      var here = S.players.length || (S.room ? (S.room.n || 1) : 0), need = Math.max(0, S.min - here), b = count.firstChild, sm = count.lastChild;
      if (!here) { b.textContent = S.host ? 'Opening your table' : 'Finding the table'; sm.textContent = ''; count.classList.remove('ready'); return; }
      b.textContent = S.max <= 8 ? here + ' of ' + S.max + ' seats taken' : here + (here === 1 ? ' player' : ' players') + ' at the table';
      count.classList.toggle('ready', !need);
      sm.textContent = need ? 'Waiting for ' + need + ' more ' + (need === 1 ? 'player' : 'players') + ' to start' :
        here >= S.max ? 'The table is full · ready to start' : 'Ready to start' + (S.max - here > 0 ? ' · ' + (S.max - here) + ' more can join' : '');
    }
    function paintSteps() {
      if (!S.players.length) return;
      var here = S.players.length, need = Math.max(0, S.min - here);
      if (S.host) {
        step('open', 'done', S.code ? 'Code ' + S.code + ' · share it, or they find you under Play online' : null);
        step('join', need ? 'run' : 'done', need ? 'Waiting for ' + need + ' more' + (S.coming.length ? ' · ' + S.coming.map(function (c) { return c.name; }).join(', ') + ' joining now' : '') : here + ' at the table' + (here < S.max ? ' · more can still join' : ''));
        step('start', need ? 'wait' : 'now', need ? 'You can start once ' + S.min + ' are here' : 'Tap Start when everyone’s in');
        if (startBtn) {
          startBtn.disabled = !!need || one.busy;
          if (!one.busy) startBtn.innerHTML = Kit.icon('play') + '<span>' + (need ? 'Need ' + need + ' more ' + (need === 1 ? 'player' : 'players') : 'Start the game') + '</span>';
        }
      } else {
        step('find', 'done'); step('connect', 'done');
        var mine = S.players.filter(function (p) { return p.me; })[0], k = S.players.indexOf(mine);
        step('seat', 'done', mine ? 'Seat ' + (k + 1) + ' of ' + S.max : 'You’re in');
        step('start', 'run', need ? 'Waiting for ' + need + ' more ' + (need === 1 ? 'player' : 'players') : 'Everyone’s ready · waiting for ' + hostLabel() + ' to start');
      }
    }
    // the players as rows too: names in full, who hosts, who's you (games add to these rows, e.g. Monopoly's pieces)
    function paintList() {
      list.innerHTML = '';
      S.players.forEach(function (p) {
        list.appendChild(E('div', { class: 'ol-row ol-seat' }, [av(p.name, p.color), E('div', { class: 'grow' }, [E('b', { text: p.name + (p.me ? ' (you)' : '') }), E('small', { text: p.host ? 'Host' : 'Player' })])]));
      });
      paintComing();
    }
    // people on their way in: their own rows under the list, so the player rows (and anything a game added) stay put
    function paintComing() {
      comingBox.innerHTML = '';
      S.coming.forEach(function (c) {
        comingBox.appendChild(E('div', { class: 'ol-row coming' }, [av(c.name), E('div', { class: 'grow' }, [E('b', { text: c.name }), E('small', { text: 'Joining…' })]), E('i', { class: 'ol-spin' })]));
      });
    }
    function paint() { paintHead(); paintSeats(); paintCount(); paintSteps(); }
    function update(players) {
      var before = S.players.length;
      S.players = (players || []).slice();
      S.coming = S.coming.filter(function (c) { return !S.players.some(function (p) { return p.name === c.name; }); });
      paint(); paintList();
      if (before && S.players.length > before) { try { Kit.sfx('pop'); Kit.haptic('light'); } catch (e) {} }
    }
    me = root._olStage = {
      el: wrap, step: step, update: update,
      setCode: function (c) { S.code = c; paint(); },
      room: function (r) { S.room = r; S.max = r.max || S.max; if (r.host && r.host.name) S.hostName = r.host.name; paint(); },
      table: function (t) {
        if (!t || !t.on) return;
        t.on('joining', function (c) { if (!S.coming.some(function (x) { return x.dev === c.dev; })) S.coming.push(c); paint(); paintComing(); });
        t.on('joinfail', function (c) { S.coming = S.coming.filter(function (x) { return x.dev !== c.dev; }); paint(); paintComing(); });
        t.on('peer', function (pe) { S.coming = S.coming.filter(function (x) { return x.dev !== pe.id; }); paint(); paintComing(); });
      },
      opts: function (n) {
        n = n || {};
        ['max', 'min', 'onStart', 'onLeave', 'note'].forEach(function (k) { if (n[k] != null) S[k] = n[k]; });
        if (n.code) S.code = n.code; if (n.hostName) S.hostName = n.hostName;
        paint();
      },
      close: function () { root._olStage = null; root.innerHTML = ''; }
    };
    paint();
    return me;
  }

  // The waiting room: the same table screen, picking up where connecting left off.
  // o: {host, code, hostName, max, min (players needed to start), players, onStart, onLeave, note, table}
  var lastCode = '';   // the table this device last joined: its code stays on the guest's table too
  function waitRoom(root, o) {
    if (!o.host && !o.code && lastCode) o = Object.assign({}, o, { code: lastCode });
    var st = stage(root, o);
    st.opts(o);
    if (o.host && o.code) st.setCode(o.code);
    if (o.table) st.table(o.table);
    st.update(o.players || []);
    return { update: st.update, close: st.close };
  }

  window.Online = {
    config: config, dev: dev, errText: errText, linkTag: linkTag, people: people, whose: whose, myTag: myTag,
    lobby: lobby, waitRoom: waitRoom, stage: stage, host: host, join: join, NAT_MSG: NAT_MSG, busy: busyBtn,
    useTransport: function (t) { transport = t; }, transport: T, localTransport: localTransport, fsTransport: fsTransport,
    _setDev: function (d) { devId = d; }
  };
})();
