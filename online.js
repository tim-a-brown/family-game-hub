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
  var config = { debug: false, iceServers: [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }], connectMs: 20000, directMs: 9000, gatherMs: 2500 };

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
    var relays = {};
    function answer(m) {
      log('host got', m.k, 'from', m.from);
      if (isRelayKind(m.k)) { if (relays[m.from]) relays[m.from].take(m); else t.ack(table.code, m.id).catch(function () {}); return; }
      t.ack(table.code, m.id).catch(function () {});
      if (m.k === 'relay') { relayIn(m); return; }
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
    // A guest who couldn't link up directly asks to play through the relay
    function relayIn(m) {
      if (table.closed) return;
      var o; try { o = JSON.parse(m.d); } catch (e) { return; }
      if (Date.now() - (m.at || 0) > 60000) return;
      var from = m.from, ok = table.peers[from] && !table.peers[from].relay ? true : table.count() + 1 >= max && !table.peers[from] ? 'That table is full' : opts.accept ? opts.accept(o) : true;
      if (opts.relay === false) ok = 'This game needs a direct connection';
      if (ok !== true) { t.send(table.code, { id: rid(), to: from, from: me, k: 'no', d: JSON.stringify({ why: String(ok), sid: o.sid || '' }), at: Date.now() }).catch(function () {}); return; }
      if (pending[from]) { try { pending[from].close(); } catch (e) {} delete pending[from]; }
      if (table.peers[from]) table.peers[from].close('rejoin');
      if (relays[from]) relays[from].close('rejoin');
      var peer = new RelayPeer(t, table.code, me, from, String(o.name || 'Player').slice(0, 20), o.sid || '');
      peer.link = o.lk || null; peer.info = o; relays[from] = peer;
      t.send(table.code, { id: rid(), to: from, from: me, k: 'relayok', d: JSON.stringify({ sid: o.sid || '' }), at: Date.now() }).catch(function () {});
      log('host: relay with', from);
      table.peers[from] = peer;
      peer.on('msg', function (msg) { fire('msg', peer, msg); });
      peer.on('close', function (why) { if (relays[from] === peer) delete relays[from]; if (table.peers[from] === peer) { delete table.peers[from]; fire('leave', peer, why); table.setStatus(); } });
      fire('peer', peer); table.setStatus();
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
      // tables this device opened before and couldn't close (the page went away first): gone now
      try {
        var swept = false, offR = t.rooms(opts.game, function (l) {
          if (swept) return; swept = true; setTimeout(function () { try { offR(); } catch (e) {} }, 0);
          (l || []).forEach(function (r) { if (r && r.code !== code && r.host && r.host.dev === me) { GONE[r.code] = Date.now(); t.remove(r.code).catch(function () {}); } });
        }, function () {});
      } catch (e) {}
      beat = setInterval(function () { table.setStatus(null, null, true); }, BEAT);
      return table;
    });
    if (!scr) return opened;
    return new Promise(function (res, rej) { scrCancel = function () { rej(new Error('Cancelled')); }; opened.then(res, rej); });
  }


  // ── Relay: when two devices can't reach each other directly ─────────────
  // Phone data and some Wi-Fi block direct links between devices. Then the game's messages go through the
  // table's signalling inbox instead (the same Firestore docs the handshake uses: no extra setup or rules).
  // Slower (about a quarter to half a second a message), fine for turn-based games; arcade games opt out.
  // Same API as Peer: send(obj, reliable), on('msg'|'close'|'open'), close(), rtt, id, name, relay: true.
  // Messages carry a sequence number so they're handed over in order; big ones are sent in parts.
  var RELAY_PART = 11000, RELAY_PING = 5000, RELAY_DEAD = 30000;
  function pad9(n) { return ('000000000' + n).slice(-9); }
  function RelayPeer(t, code, me, other, name, sid) {
    var p = this, ls = { msg: [], close: [], open: [] };
    p.id = other; p.name = name || ''; p.rtt = 0; p.open = true; p.closed = false; p.heard = Date.now(); p.relay = true;
    p._t = t; p._code = code; p._me = me; p._sid = sid; p._q = 0; p._uq = 0; p._seen = {}; p._next = 0; p._buf = {}; p._parts = {}; p._uLast = 0; p._uPend = null; p._uT = 0;
    p.on = function (k, f) { ls[k].push(f); return p; };
    p._fire = function (k, a) { ls[k].forEach(function (f) { try { f(a); } catch (er) { console.error(er); } }); };
    p._deliver = function (s) {
      p.heard = Date.now();
      var m; try { m = JSON.parse(s); } catch (er) { return; }
      if (m._ === 'p') { p._raw({ _: 'q', t: m.t }, true); return; }
      if (m._ === 'q') { p.rtt = Date.now() - m.t; return; }
      if (m._ === 'bye') { p.close('left'); return; }
      p._fire('msg', m);
    };
    p.beat = setInterval(function () {
      if (Date.now() - p.heard > RELAY_DEAD) { p.close('timeout'); return; }
      p._raw({ _: 'p', t: Date.now() }, true);
    }, RELAY_PING);
  }
  // one message in from the inbox (it may come twice: the join's listener and this one's)
  RelayPeer.prototype.take = function (m) {
    var p = this;
    if (p._seen[m.id]) return; p._seen[m.id] = 1;
    p._t.ack(p._code, m.id).catch(function () {});
    var a; try { a = JSON.parse(m.d); } catch (e) { return; }
    if (!a || a.sid !== p._sid) return;
    p.heard = Date.now();
    if (m.k === 'mu') { if (a.q > p._uLast) { p._uLast = a.q; p._deliver(a.s); } return; }
    if (m.k === 'mp') {   // a part of a big message
      var bucket = p._parts[a.q] || (p._parts[a.q] = []); bucket[a.i] = a.s;
      if (bucket.filter(function (x) { return x != null; }).length < a.n) return;
      delete p._parts[a.q]; a = { q: a.q, s: bucket.join('') };
    }
    p._buf[a.q] = a.s;
    while (p._buf[p._next] != null) { var s = p._buf[p._next]; delete p._buf[p._next]; p._next++; p._deliver(s); }
  };
  RelayPeer.prototype._raw = function (obj, reliable) {
    var p = this; if (p.closed && !(obj && obj._ === 'bye')) return false;
    var s = typeof obj === 'string' ? obj : JSON.stringify(obj);
    function put(k, id, d) { return p._t.send(p._code, { id: id, to: p.id, from: p._me, k: k, d: JSON.stringify(d), at: Date.now() }).catch(function (e) { console.warn('[online] relay send', e); }); }
    if (!reliable) {
      // the fast lane: only the newest update matters, so send at most about three a second
      p._uPend = s;
      if (p._uT) return true;
      var go = function () { p._uT = 0; if (p._uPend == null || p.closed) return; var x = p._uPend; p._uPend = null; var q = ++p._uq; put('mu', 'u_' + p._me + '_' + pad9(q), { sid: p._sid, q: q, s: x }); p._uT = setTimeout(go, 330); };
      go(); return true;
    }
    var q = p._q++;
    if (s.length <= RELAY_PART) { put('m', 'm_' + p._me + '_' + pad9(q), { sid: p._sid, q: q, s: s }); return true; }
    var n = Math.ceil(s.length / RELAY_PART);
    for (var i = 0; i < n; i++) put('mp', 'm_' + p._me + '_' + pad9(q) + '_' + i, { sid: p._sid, q: q, i: i, n: n, s: s.slice(i * RELAY_PART, (i + 1) * RELAY_PART) });
    return true;
  };
  RelayPeer.prototype.send = function (obj, reliable) { return this._raw(obj, !!reliable); };
  RelayPeer.prototype.sendRaw = function (ch, obj) { return this._raw(obj, true); };
  RelayPeer.prototype.close = function (why) {
    if (this.closed) return;
    if (why !== 'left') this._raw({ _: 'bye' }, true);
    this.closed = true; clearInterval(this.beat); clearTimeout(this._uT);
    if (this._off) try { this._off(); } catch (e) {}
    this._fire('close', why || 'closed');
  };
  function isRelayKind(k) { return k === 'm' || k === 'mp' || k === 'mu'; }

  // ── Join a table ────────────────────────────────────────────────────────
  // opts: {game, name, extra}. Resolves with a Peer (the host) once connected; peer.room = the table doc.
  function join(code, opts) {
    if (noRtc()) return Promise.reject(new Error('This browser can’t play online.'));
    code = String(code || '').trim().toUpperCase();
    if (!/^[A-Z]{4}$/.test(code)) return Promise.reject(new Error('Table codes are 4 letters'));
    var t = T(), me = dev();
    var tagP = myTag();
    lastCode = code;
    var scr = opts.screen ? stage(opts.screen, { host: false, code: code, max: opts.max || 0, min: opts.min, myName: opts.name, onLeave: function () { if (cancel) cancel(); } }) : null, cancel = null;
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
          var hostName = room.host && room.host.name || 'the host', relay = null, relayAsked = false, relayTo = 0;
          peer.room = room; peer.code = code;
          cancel = function () { finish(new Error('Cancelled')); };
          function hello() { var d = { name: String(opts.name || 'Player').slice(0, 20), v: V, sid: sid }; if (lk) d.lk = lk; if (opts.extra) d.x = opts.extra; return d; }
          function finish(err, via) {
            if (done) return; done = true; clearTimeout(to); clearTimeout(relayTo);
            var got = via || peer;
            if (scr && !err) { scr.step('connect', 'done', got.relay ? 'Connected to ' + hostName + ' through the relay' : 'Connected to ' + hostName); scr.step('seat', 'run', 'Taking your seat'); }
            offs.forEach(function (o) { try { o(); } catch (e) {} });
            if (err) { peer.close('failed'); if (relay) relay.close('failed'); reject(err); return; }
            if (got !== peer) { try { pc.close(); } catch (e) {} }
            // the host closing the table (or the page) ends the game here too
            var off = t.watch(code, function (r) { if (!r && !got.closed) got.close('host'); }, function () {});
            got.on('close', function () { try { off(); } catch (e) {} });
            if (got.relay) got._off = t.inbox(code, me, function (m) { if (isRelayKind(m.k) && m.from === room.host.dev) got.take(m); }, function () {});
            got.room = room; got.code = code;
            resolve(got);
          }
          // No direct link in time (phone data, strict Wi-Fi): play through the relay instead
          function fallBack() {
            if (done || relayAsked) return;
            if (opts.relay === false) { var e = new Error(NAT_MSG); e.nat = true; finish(e); return; }
            relayAsked = true;
            log('guest: no direct link, asking for the relay');
            try { pc.close(); } catch (er) {}
            if (scr) scr.step('connect', 'run', 'This network blocks a direct link · connecting through the relay');
            relay = new RelayPeer(t, code, me, room.host.dev, room.host.name, sid);
            t.send(code, { id: rid(), to: room.host.dev, from: me, k: 'relay', d: JSON.stringify(hello()), at: Date.now() }).catch(function (er) { finish(er); });
            relayTo = setTimeout(function () { var e = new Error(NAT_MSG); e.nat = true; finish(e); }, 20000);
          }
          var to = setTimeout(fallBack, config.directMs);
          pc.addEventListener('connectionstatechange', function () { if (pc.connectionState === 'failed') fallBack(); });
          peer.on('open', function () { if (relayAsked) return; log('guest: channel open'); finish(null); });
          offs.push(t.inbox(code, me, function (m) {
            if (m.from !== room.host.dev) { t.ack(code, m.id).catch(function () {}); return; }
            if (isRelayKind(m.k)) { if (relay) relay.take(m); else t.ack(code, m.id).catch(function () {}); return; }
            t.ack(code, m.id).catch(function () {});
            log('guest got', m.k);
            var a; try { a = JSON.parse(m.d); } catch (e) { return; }
            if (!a || a.sid !== sid) return;   // an answer to an earlier try
            if (m.k === 'no') finish(new Error(a.why || 'The table didn’t let you in'));
            else if (m.k === 'relayok' && relay) finish(null, relay);
            else if (m.k === 'answer' && !answered && !relayAsked) { answered = true; if (scr) scr.step('connect', 'run', 'Let in · linking the two devices'); pc.setRemoteDescription({ type: 'answer', sdp: a.sdp }).catch(function () { fallBack(); }); }
          }, function (e) { finish(e); }));
          pc.createOffer()
            .then(function (o) { return pc.setLocalDescription(o); })
            .then(function () { return gathered(pc); })
            .then(function () {
              if (relayAsked) return;
              log('guest: offer ready', pc.iceGatheringState);
              var d = hello(); d.sdp = pc.localDescription.sdp;
              return t.send(code, { id: rid(), to: room.host.dev, from: me, k: 'offer', d: JSON.stringify(d), at: Date.now() });
            })
            .catch(function () { fallBack(); });
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
      var newest = {};   // a device hosts one table at a time: an older one from the same device was left behind
      all.forEach(function (r) { if (r && r.host && (!newest[r.host.dev] || (r.at || 0) > (newest[r.host.dev].at || 0))) newest[r.host.dev] = r; });
      var list = all.filter(function (r) { return r && r.host && newest[r.host.dev] === r && r.host.dev !== d && !gone(r.code) && (r.status === 'open' || r.status === 'playing') && (r.n || 1) < (r.max || 2) && now - (r.at || 0) < STALE; });
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
    // The people: like the Game Night logo, each one a coloured arc (shoulders) with their avatar as the head,
    // round an empty circle with the table code in the middle. The circle makes room as people join.
    '.olt-top{display:flex;align-items:flex-start;gap:12px;margin-top:4px;}' +
    '.olt-side{flex:1;min-width:0;display:flex;flex-direction:column;gap:6px;}.olt-side:empty{display:none;}' +
    '.olt-side .ol-h{margin:0 2px 2px;}' +
    '.olt-side .stack{display:grid;gap:6px;grid-auto-flow:column;grid-template-rows:repeat(var(--rows,99),auto);grid-auto-columns:minmax(0,1fr);}' +
    '.olt-side .stack:empty{display:none;}' +
    '.olt-many{display:flex;flex-direction:column;align-items:flex-start;gap:8px;width:100%;padding:12px;border:0;border-radius:18px;background:var(--surface);box-shadow:var(--shadow-sm);color:var(--text);font:inherit;text-align:left;cursor:pointer;}' +
    '.olt-many .olt-stackav{display:flex;padding-left:8px;}.olt-many .olt-stackav .avatar{width:32px;height:32px;font-size:.8rem;margin-left:-8px;box-shadow:0 0 0 2.5px var(--surface);}' +
    '.olt-many b{font-family:var(--display);font-weight:400;font-size:1.25rem;line-height:1.1;}.olt-many small{display:flex;align-items:center;gap:4px;color:var(--text-3);font-weight:800;font-size:.78rem;}.olt-many small svg{width:14px;height:14px;}' +
    '.olt-side.many > .ol-h,.olt-side.many > .stack{display:none;}.olt-side:not(.many) > .olt-many{display:none;}' +
    '.olt-sheetlist{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;}' +
    '.olt-sheetlist .ol-row .avatar{width:34px;height:34px;font-size:.85rem;flex:none;}' +
    '.olt-side .ol-row{padding:6px 8px;gap:8px;border-radius:14px;}' +
    '.olt-side .ol-row .avatar{width:30px;height:30px;font-size:.8rem;flex:none;box-shadow:0 0 0 2px var(--c,transparent);}' +
    '.olt-side .ol-row b{font-size:.86rem;}.olt-side .ol-row small{font-size:.68rem;}' +
    '.olt-tbl{position:relative;flex:none;width:min(100%,300px);aspect-ratio:1;margin:0 auto;}' +
    '.olt-top.side .olt-tbl{width:min(56%,300px);}' +
    '.olt-mid{position:absolute;inset:30%;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;}' +
    '.olt-mid small{font-size:calc(var(--tw,300px) * .034);font-weight:900;letter-spacing:.14em;text-transform:uppercase;color:var(--text-3);white-space:nowrap;}' +
    '.olt-code{font-family:var(--display);font-size:calc(var(--tw,300px) * .1);letter-spacing:.18em;margin-right:-.18em;line-height:1.05;color:var(--accent);}' +
    '.olt-code.pend{opacity:.35;}' +
    '.olt-p{position:absolute;inset:0;pointer-events:none;transition:transform .8s cubic-bezier(.3,1.25,.5,1),opacity .4s;}' +
    '.olt-p svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible;}' +
    '.olt-p circle{fill:none;stroke-linecap:round;transition:stroke-dasharray .8s cubic-bezier(.3,1.25,.5,1),transform .8s cubic-bezier(.3,1.25,.5,1),stroke-width .6s cubic-bezier(.3,1.5,.5,1),stroke .3s,opacity .3s;}' +
    '.olt-p.need circle{opacity:.5;}' +
    '.olt-h{position:absolute;left:50%;transition:transform .8s cubic-bezier(.3,1.25,.5,1),width .6s,height .6s,margin .6s;}' +
    '.olt-h > .avatar,.olt-h > .olt-ph{width:100%;height:100%;font-size:calc(var(--hs) * .42);box-shadow:0 0 0 2.5px #fff,0 5px 12px rgba(0,0,0,.35);}' +
    '.olt-h > .avatar{animation:oltIn .55s cubic-bezier(.3,1.5,.5,1) both;}' +
    '.olt-ph{display:grid;place-items:center;border-radius:50%;color:var(--text-3);}.olt-ph svg{width:46%;height:46%;}' +
    '.olt-p.anon .olt-ph{background:var(--surface-3,#2a2546);}' +
    '.olt-p.host .olt-h > .avatar{box-shadow:0 0 0 2.5px #fff,0 0 0 5px #ffd36b,0 5px 12px rgba(0,0,0,.35);}' +
    '.olt-p.coming circle{opacity:.7;}' +
    '.olt-h .olt-ring{position:absolute;inset:-5px;border-radius:50%;border:3px solid transparent;border-top-color:var(--accent);animation:olspin .9s linear infinite;}' +
    '.olt-badge{position:relative;display:grid;place-items:center;width:100%;height:100%;border-radius:28%;background:linear-gradient(180deg,#171530,#0b0a1c);box-shadow:0 0 0 2px rgba(255,255,255,.15),0 5px 12px rgba(0,0,0,.4);}' +
    '.olt-badge svg{position:absolute;inset:6%;width:88%;height:88%;opacity:.55;}' +
    '.olt-badge b{position:relative;font-family:var(--display);font-weight:400;font-size:calc(var(--hs) * .38);color:#fff;text-shadow:0 1px 3px rgba(0,0,0,.8);}' +
    '.olt-p.in svg{animation:oltFade .5s both;}.olt-p.out{opacity:0;}' +
    '@keyframes oltFade{from{opacity:0}to{opacity:1}}' +
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
    var wrap = E('div', { class: 'ol olt' }), h1 = E('h1'), tbl = E('div', { class: 'olt-tbl' }), side = E('div', { class: 'olt-side' }), top = E('div', { class: 'olt-top' }, [side, tbl]);
    var mid = E('div', { class: 'olt-mid' }), codeEl = E('div', { class: 'olt-code' });
    mid.appendChild(E('small', { text: 'Table code' })); mid.appendChild(codeEl);
    tbl.appendChild(mid);
    var seatsBox = tbl;
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
    // more than six: one tile with their faces and the count; tapping it lists everyone
    var many = E('button', { type: 'button', class: 'olt-many', onclick: function () {
      var box = E('div', { class: 'stack olt-sheetlist' });
      Array.prototype.forEach.call(list.children, function (r) { box.appendChild(r.cloneNode(true)); });
      Array.prototype.forEach.call(comingBox.children, function (r) { box.appendChild(r.cloneNode(true)); });
      Kit.sheet({ title: manyLabel(), node: box, actions: [{ label: 'Done', cls: 'btn-soft' }] });
    } });
    function manyLabel() { return S.players.length + ' players at the table'; }
    side.appendChild(listH); side.appendChild(list); side.appendChild(comingBox); side.appendChild(many);
    [h1, top, count, steps].concat(startBtn ? [startBtn] : []).concat([leaveBtn, noteEl]).forEach(function (n) { wrap.appendChild(n); });
    root.appendChild(wrap);

    function hostLabel() { return S.host ? 'You' : (S.hostName || 'The host'); }
    function paintHead() {
      h1.textContent = S.host ? 'Your table' : (S.hostName ? S.hostName + '’s table' : 'Joining a table');
      codeEl.textContent = S.code || '····'; codeEl.classList.toggle('pend', !S.code);
      rows.start.querySelector('b').textContent = S.host ? 'Start the game' : (S.hostName || 'The host') + ' starts the game';
      leaveBtn.textContent = S.players.length ? (S.host ? 'Close the table' : 'Leave the table') : 'Cancel';
      noteEl.textContent = S.note || ''; noteEl.hidden = !S.note;
      listH.hidden = !S.players.length; list.hidden = !S.players.length;
      top.classList.toggle('side', !!(S.players.length || S.coming.length));
      if (!S.players.length && !S.coming.length) { side.style.display = 'none'; } else side.style.display = '';
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
    // The circle of people, like the Game Night logo: each seat a coloured arc (shoulders) with the player's avatar
    // as the head. The logo's four colours go to the first four. Seats still needed to start are a thin line in
    // their colour, which fills out to a full arc (and gets a head) when someone sits there. Up to 12 in the circle;
    // more than that, a small Game Night badge with +N takes the 13th place.
    var PAL = ['#ffd166', '#ff7a8a', '#4fd1c5', '#8b7cff', '#5b8cff', '#3fb56b', '#f59e0b', '#ec4899', '#14b8a6', '#a3e635', '#f97316', '#c084fc'];
    var LOGO = '<svg viewBox="40 40 176 176" aria-hidden="true"><g fill="none" stroke-width="18" stroke-linecap="round"><path d="M148 72A58 58 0 0 1 184 108" stroke="#ffd166"/><path d="M184 148A58 58 0 0 1 148 184" stroke="#ff7a8a"/><path d="M108 184A58 58 0 0 1 72 148" stroke="#4fd1c5"/><path d="M72 108A58 58 0 0 1 108 72" stroke="#8b7cff"/></g><g fill="#fff"><circle cx="79" cy="79" r="16"/><circle cx="177" cy="79" r="16"/><circle cx="177" cy="177" r="16"/><circle cx="79" cy="177" r="16"/></g></svg>';
    var figs = {}, NS = 'http://www.w3.org/2000/svg', RA = 60, RH = 77;
    function figure(key) {
      if (figs[key]) return figs[key];
      var el = E('div', { class: 'olt-p in' }), svg = document.createElementNS(NS, 'svg'), c = document.createElementNS(NS, 'circle');
      svg.setAttribute('viewBox', '-100 -100 200 200'); c.setAttribute('r', RA); c.setAttribute('pathLength', '360');
      svg.appendChild(c); el.appendChild(svg);
      var h = E('div', { class: 'olt-h' }); el.appendChild(h);
      seatsBox.appendChild(el);
      setTimeout(function () { el.classList.remove('in'); }, 700);
      return (figs[key] = { el: el, arc: c, head: h, sig: '' });
    }
    function paintSeats() {
      var people = S.players.map(function (p) { return { name: p.name, me: p.me, host: p.host }; });
      if (!people.length && S.room) {   // still connecting: the host, the others already there, and you on the way
        people.push({ name: S.hostName, host: true });
        for (var q = 1; q < (S.room.n || 1); q++) people.push({ name: '', anon: true });
      }
      S.coming.forEach(function (c) { people.push({ name: c.name, coming: true }); });
      if (!S.host && !S.players.length) people.push({ name: o.myName || 'You', me: true, coming: true });
      var extra = 0;
      if (people.length > 12) { extra = people.length - 12; people = people.slice(0, 12); people.push({ badge: true }); }
      for (var k = people.length; k < S.min; k++) people.push({ need: true });
      var n = Math.max(people.length, 1), span = Math.min(50, 360 / n * .56);
      var px = tbl.clientWidth || 300, hs = Math.min(n <= 4 ? 34 : 29, 2 * Math.PI * RH / n * .6), hpx = hs / 200 * px, sw = Math.max(7, Math.min(17, hs * .62));
      tbl.style.setProperty('--tw', px + 'px');
      var keep = {};
      people.forEach(function (p, i) {
        var key = 'seat' + i, f = figure(key), th = i * 360 / n, col = PAL[i % PAL.length]; keep[key] = 1;
        f.el.className = 'olt-p' + (f.el.classList.contains('in') ? ' in' : '') + (p.need ? ' need' : '') + (p.anon ? ' anon' : '') + (p.coming ? ' coming' : '') + (p.me ? ' me' : '') + (p.host ? ' host' : '') + (p.badge ? ' badge' : '');
        f.el.style.transform = 'rotate(' + th + 'deg)';
        // the shoulders: a dash of a full circle (pathLength 360 = degrees), centred on this seat
        f.arc.style.stroke = p.anon ? 'var(--text-3)' : col;
        // an empty seat and someone still connecting: a thin line; it fills out once they're in
        f.arc.style.strokeWidth = p.badge ? 0 : p.need || p.coming ? 2.5 : sw;
        f.arc.style.strokeDasharray = span + ' 360';
        f.arc.style.transform = 'rotate(' + (-90 - span / 2) + 'deg)';
        // the head: the player's avatar, kept upright while the circle turns
        var h = f.head; h.style.setProperty('--hs', hpx + 'px');
        h.style.width = h.style.height = hpx + 'px'; h.style.marginLeft = (-hpx / 2) + 'px';
        h.style.top = ((100 - RH) / 2) + '%'; h.style.marginTop = (-hpx / 2) + 'px';
        h.style.transform = 'rotate(' + (-th) + 'deg)';
        var sig = [p.need, p.anon, p.coming, p.badge, p.name, extra, i].join('|');
        if (f.sig !== sig) {
          f.sig = sig; h.innerHTML = '';
          if (p.badge) { h.style.transform += ' scale(1.25)'; h.appendChild(E('span', { class: 'olt-badge', html: LOGO + '<b>+' + extra + '</b>' })); }
          else if (p.anon) h.appendChild(E('span', { class: 'olt-ph', html: Kit.icon('user') }));
          else if (!p.need) h.appendChild(av(p.name, col));
          if (p.coming) h.appendChild(E('i', { class: 'olt-ring' }));
        }
      });
      Object.keys(figs).forEach(function (key) {
        if (keep[key]) return;
        var f = figs[key]; delete figs[key]; f.el.classList.add('out'); setTimeout(function () { f.el.remove(); }, 450);
      });
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
      S.players.forEach(function (p, i) {
        var a = av(p.name, PAL[i % PAL.length]); a.style.setProperty('--c', PAL[i % PAL.length]);
        list.appendChild(E('div', { class: 'ol-row ol-seat' }, [a, E('div', { class: 'grow' }, [E('b', { text: p.name, 'data-you': p.me ? '1' : null }), E('small', { text: p.host ? 'Host' : p.me ? 'You' : 'Player' })])]));
      });
      paintComing();
    }
    // people on their way in: their own rows under the list, so the player rows (and anything a game added) stay put
    function paintComing() {
      comingBox.innerHTML = '';
      S.coming.forEach(function (c) {
        comingBox.appendChild(E('div', { class: 'ol-row coming' }, [av(c.name), E('div', { class: 'grow' }, [E('b', { text: c.name }), E('small', { text: 'Joining…' })])]));
      });
    }
    function paintCols() {
      var n = S.players.length + S.coming.length, isMany = S.players.length > 6;
      side.classList.toggle('many', isMany);
      list.style.setProperty('--rows', 99); comingBox.style.setProperty('--rows', 99);
      if (!isMany) return;
      many.innerHTML = '';
      var faces = E('span', { class: 'olt-stackav' });
      S.players.slice(0, 5).forEach(function (p, i) { faces.appendChild(av(p.name, PAL[i % PAL.length])); });
      many.appendChild(faces);
      many.appendChild(E('b', { text: S.players.length + ' players' }));
      many.appendChild(E('small', { html: (S.coming.length ? S.coming.length + ' joining · ' : '') + 'See who’s here' + Kit.icon('right') }));
    }
    function paint() { paintHead(); paintSeats(); paintCount(); paintSteps(); paintCols(); }
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
