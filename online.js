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
//   Online.join(code, opts) -> Promise<Peer>   connect to a table
//   Online.useTransport(t) / Online.localTransport()   swap Firestore for another signaling store
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
  var COL = 'arcadeRooms', V = 1, STALE = 3 * 60000, BEAT = 60000;
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
      create: function (code, data) {
        return db().then(function (d) { var r = ref(d, code); return r.get().then(function (sn) { if (sn.exists && Date.now() - (sn.data().at || 0) < 6 * 3600e3) throw new Error(TAKEN); return r.set(data); }); });
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
  // Two tabs of one browser (tests): the same store in localStorage, changes announced on a BroadcastChannel
  function localTransport(name) {
    var KEY = 'online_local_' + (name || 'db'), subs = [], bc = null;
    try { bc = new BroadcastChannel(KEY); bc.onmessage = fire; } catch (e) {}
    function read() { var d = lsGet(KEY, null); return d && d.rooms ? d : { rooms: {}, sig: {} }; }
    function write(d) { lsSet(KEY, d); if (bc) bc.postMessage(1); setTimeout(fire, 0); }
    function fire() { var d = read(); subs.slice().forEach(function (s) { try { s(d); } catch (e) { console.error(e); } }); }
    function sub(fn) { subs.push(fn); setTimeout(function () { if (subs.indexOf(fn) >= 0) fn(read()); }, 0); return function () { var i = subs.indexOf(fn); if (i >= 0) subs.splice(i, 1); }; }
    return {
      kind: 'local',
      rooms: function (game, cb) { return sub(function (d) { cb(Object.keys(d.rooms).map(function (c) { return Object.assign({ code: c }, d.rooms[c]); }).filter(function (r) { return r.game === game; })); }); },
      create: function (code, data) { var d = read(); if (d.rooms[code]) return Promise.reject(new Error(TAKEN)); d.rooms[code] = data; write(d); return Promise.resolve(); },
      get: function (code) { return Promise.resolve(read().rooms[code] || null); },
      update: function (code, patch) { var d = read(); if (!d.rooms[code]) return Promise.reject(new Error('No such table')); Object.assign(d.rooms[code], patch); write(d); return Promise.resolve(); },
      remove: function (code) { var d = read(); delete d.rooms[code]; delete d.sig[code]; write(d); return Promise.resolve(); },
      watch: function (code, cb) { var last = '?'; return sub(function (d) { var r = d.rooms[code] || null, j = JSON.stringify(r); if (j !== last) { last = j; cb(r); } }); },
      send: function (code, m) { var d = read(); (d.sig[code] = d.sig[code] || {})[m.id] = m; write(d); return Promise.resolve(); },
      inbox: function (code, me, cb) { var seen = {}; return sub(function (d) { var s = d.sig[code] || {}; Object.keys(s).forEach(function (id) { if (s[id].to === me && !seen[id]) { seen[id] = 1; cb(Object.assign({}, s[id], { id: id })); } }); }); },
      ack: function (code, id) { var d = read(); if (d.sig[code]) delete d.sig[code][id]; write(d); return Promise.resolve(); }
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
  var NAT_MSG = 'Couldn’t connect to the other device. Some networks (often phone data, or school and office Wi-Fi) block direct connections between devices. Try again with both devices on the same Wi-Fi.';

  // ── Host a table ────────────────────────────────────────────────────────
  // opts: {game, name, max, info, accept(info) -> true | 'reason'}
  function host(opts) {
    if (noRtc()) return Promise.reject(new Error('This browser can’t play online.'));
    var t = T(), me = dev(), max = opts.max || 2;
    var table = { code: null, peers: {}, status: 'open', closed: false }, ls = { peer: [], leave: [], msg: [] }, offs = [], beat = 0, pending = {};
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
      if (table.code) t.remove(table.code).catch(function () {});
    };
    function answer(m) {
      log('host got', m.k, 'from', m.from);
      t.ack(table.code, m.id).catch(function () {});
      if (m.k !== 'offer' || table.closed) return;
      var o; try { o = JSON.parse(m.d); } catch (e) { return; }
      var from = m.from, ok = table.peers[from] ? true : table.count() + 1 >= max ? 'That table is full' : opts.accept ? opts.accept(o) : true;
      if (ok !== true) { t.send(table.code, { id: rid(), to: from, from: me, k: 'no', d: String(ok), at: Date.now() }).catch(function () {}); return; }
      if (table.peers[from]) table.peers[from].close('rejoin');
      if (pending[from]) try { pending[from].close(); } catch (e) {}
      var pc = newPc(), peer = new Peer(pc, from, String(o.name || 'Player').slice(0, 20));
      peer.link = o.lk || null; peer.info = o;
      pending[from] = pc;
      var to = setTimeout(function () { if (!peer.open) { delete pending[from]; peer.close('timeout'); } }, config.connectMs + 5000);
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
        .then(function () { log('host: answer ready'); return t.send(table.code, { id: rid(), to: from, from: me, k: 'answer', d: JSON.stringify({ sdp: pc.localDescription.sdp }), at: Date.now() }); })
        .catch(function (e) { console.warn('[online] answer failed', e); peer.close('failed'); });
    }
    return myTag().then(function (lk) {
      var h = { name: String(opts.name || 'Player').slice(0, 20), dev: me };
      if (lk) h.lk = lk;   // so the people linked to you see it's your table
      var tries = 0;
      function attempt() {
        var code = code4();
        var data = { game: opts.game, host: h, status: 'open', n: 1, max: max, info: opts.info || '', at: Date.now(), v: V, by: me };
        return t.create(code, data).then(function () { return code; }, function (e) { if (e && e.message === TAKEN && ++tries < 6) return attempt(); throw e; });
      }
      return attempt();
    }).then(function (code) {
      table.code = code;
      offs.push(t.inbox(code, me, answer, function (e) { console.warn('[online] inbox', e); }));
      beat = setInterval(function () { table.setStatus(null, null, true); }, BEAT);
      return table;
    });
  }

  // ── Join a table ────────────────────────────────────────────────────────
  // opts: {game, name, extra}. Resolves with a Peer (the host) once connected; peer.room = the table doc.
  function join(code, opts) {
    if (noRtc()) return Promise.reject(new Error('This browser can’t play online.'));
    code = String(code || '').trim().toUpperCase();
    if (!/^[A-Z]{4}$/.test(code)) return Promise.reject(new Error('Table codes are 4 letters'));
    var t = T(), me = dev();
    return t.get(code).then(function (room) {
      if (!room || room.game !== opts.game) throw new Error('No open table with code ' + code);
      if (room.host && room.host.dev === me) throw new Error('That’s your own table. Join it from another device.');
      if (room.status === 'over' || Date.now() - (room.at || 0) > STALE * 3) throw new Error('That table has closed');
      if ((room.n || 1) >= (room.max || 2)) throw new Error('That table is full');
      return myTag().then(function (lk) {
        return new Promise(function (resolve, reject) {
          var pc = newPc(), peer = new Peer(pc, room.host.dev, room.host.name), offs = [], done = false;
          peer.room = room; peer.code = code;
          function finish(err) {
            if (done) return; done = true; clearTimeout(to);
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
            if (m.k === 'no') finish(new Error(m.d || 'The table didn’t let you in'));
            else if (m.k === 'answer') { var a; try { a = JSON.parse(m.d); } catch (e) { return; } pc.setRemoteDescription({ type: 'answer', sdp: a.sdp }).catch(function (e) { finish(e); }); }
          }, function (e) { finish(e); }));
          pc.createOffer()
            .then(function (o) { return pc.setLocalDescription(o); })
            .then(function () { return gathered(pc); })
            .then(function () {
              log('guest: offer ready', pc.iceGatheringState);
              var d = { sdp: pc.localDescription.sdp, name: String(opts.name || 'Player').slice(0, 20), v: V };
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
    '@keyframes olspin{to{transform:rotate(360deg)}}.ol-seat .tag{font-size:.7rem;font-weight:900;letter-spacing:.08em;text-transform:uppercase;color:var(--text-3);}';
  function css() { if (document.getElementById('ol-css')) return; var s = document.createElement('style'); s.id = 'ol-css'; s.textContent = CSS; document.head.appendChild(s); }
  function E(tag, a, kids) { return window.Kit ? Kit.el(tag, a, kids) : document.createElement(tag); }
  function esc(s) { return window.Kit ? Kit.esc(s) : String(s); }
  function av(name, color) { return window.Kit && Kit.avatar ? Kit.avatar.el(name || '?', null, color) : E('span', { class: 'avatar', text: String(name || '?').charAt(0) }); }

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
    wrap.appendChild(E('button', { type: 'button', class: 'btn btn-primary btn-lg btn-block', html: Kit.icon('users') + '<span>Open a table</span>', onclick: function () { if (need()) o.onHost(me); } }));
    wrap.appendChild(E('div', { class: 'ol-h', text: 'Open tables' }));
    var rooms = E('div', { class: 'stack' }, [E('p', { class: 'ol-note', text: 'Looking for open tables…' })]);
    wrap.appendChild(rooms);
    var code = E('input', { class: 'input', type: 'text', maxlength: '4', placeholder: 'Code', 'aria-label': 'Table code', autocapitalize: 'characters', autocomplete: 'off', spellcheck: 'false' });
    code.addEventListener('keydown', function (e) { if (e.key === 'Enter') go(); });
    function go() { if (need()) o.onJoin(code.value.trim().toUpperCase(), null, me); }
    wrap.appendChild(E('div', { class: 'ol-join' }, [code, E('button', { type: 'button', class: 'btn btn-soft', text: 'Join with code', onclick: go })]));
    if (o.onSolo) wrap.appendChild(E('button', { type: 'button', class: 'btn btn-ghost btn-block', text: o.solo || 'Play solo instead', onclick: o.onSolo }));
    if (o.note) wrap.appendChild(E('p', { class: 'ol-note', text: o.note }));

    function sub(r) { var s = o.sub ? o.sub(r) : ''; return (s ? s + ' · ' : '') + 'code ' + r.code; }
    function paint(list) {
      if (!alive) return;
      pals.innerHTML = ''; rooms.innerHTML = '';
      var mine = list.filter(function (r) { return r.who; }), rest = list.filter(function (r) { return !r.who; });
      mine.forEach(function (r) {
        var nm = r.who.name;
        pals.appendChild(E('div', { class: 'ol-row ol-pal' }, [
          av(nm, window.Kit ? Kit.color(1) : null),
          E('div', { class: 'grow' }, [E('b', { text: nm + (r.status === 'playing' ? ' is playing' : ' has a table open') }), E('small', { text: sub(r) })]),
          E('button', { type: 'button', class: 'btn btn-primary btn-lg btn-block', html: Kit.icon('play') + '<span>' + esc('Join ' + nm + '’s table') + '</span>', onclick: function () { if (need()) o.onJoin(r.code, r, me); } })
        ]));
      });
      if (!rest.length) rooms.appendChild(E('p', { class: 'ol-note', text: mine.length ? 'No other open tables.' : 'No open tables yet. When someone opens one, it shows up here.' }));
      rest.forEach(function (r) {
        rooms.appendChild(E('div', { class: 'ol-row' }, [
          av(r.host.name, window.Kit ? Kit.color(1) : null),
          E('div', { class: 'grow' }, [E('b', { text: r.host.name + '’s table' }), E('small', { text: sub(r) })]),
          E('button', { type: 'button', class: 'btn btn-primary btn-sm', text: 'Join', onclick: function () { if (need()) o.onJoin(r.code, r, me); } })
        ]));
      });
    }
    function got(all) {
      var now = Date.now(), d = dev();
      var list = all.filter(function (r) { return r && r.host && r.host.dev !== d && (r.status === 'open' || r.status === 'playing') && (r.n || 1) < (r.max || 2) && now - (r.at || 0) < STALE; });
      list.sort(function (a, b) { return (b.at || 0) - (a.at || 0); });
      last = list;
      whose(list).then(function () { if (last === list) paint(list); });
    }
    off = T().rooms(o.game, got, function (e) { if (!alive) return; rooms.innerHTML = ''; rooms.appendChild(E('p', { class: 'ol-note', text: 'Couldn’t reach the tables: ' + (e && e.message || e) })); });
    // tables go stale without a heartbeat: look again now and then
    var tick = setInterval(function () { if (last.length) got(last); }, 30000);
    return { close: function () { alive = false; clearInterval(tick); if (off) off(); }, refresh: function () { got(last); } };
  }

  // Online.waitRoom(root, {code, host: bool, hostName, players: [{name, color, me, host}], max, onStart, onLeave, note})
  function waitRoom(root, o) {
    css(); root.innerHTML = '';
    var wrap = E('div', { class: 'ol' }), list = E('div', { class: 'stack' }), startBtn = null;
    wrap.appendChild(E('h1', { text: o.host ? 'Your Table Is Open' : (o.hostName || 'The host') + '’s Table' }));
    if (o.code) { wrap.appendChild(E('p', { class: 'ol-note', style: { 'text-align': 'center' }, text: 'Table code' })); wrap.appendChild(E('p', { class: 'ol-code', text: o.code })); }
    wrap.appendChild(E('div', { class: 'ol-h', text: 'Players' }));
    wrap.appendChild(list);
    var status = E('div', { class: 'ol-row' }, [E('i', { class: 'ol-spin' }), E('div', { class: 'grow' }, [E('b', { text: '' }), E('small', { text: '' })])]);
    wrap.appendChild(status);
    if (o.host) { startBtn = E('button', { type: 'button', class: 'btn btn-primary btn-lg btn-block', html: Kit.icon('play') + '<span>Start the game</span>', onclick: function () { o.onStart(); } }); wrap.appendChild(startBtn); }
    wrap.appendChild(E('button', { type: 'button', class: 'btn btn-ghost btn-block', text: o.host ? 'Close the table' : 'Leave the table', onclick: function () { o.onLeave(); } }));
    if (o.note) wrap.appendChild(E('p', { class: 'ol-note', text: o.note }));
    root.appendChild(wrap);
    function update(players) {
      list.innerHTML = '';
      players.forEach(function (p) {
        list.appendChild(E('div', { class: 'ol-row ol-seat' }, [av(p.name, p.color), E('div', { class: 'grow' }, [E('b', { text: p.name + (p.me ? ' (you)' : '') }), E('small', { text: p.host ? 'Host' : 'Player' })])]));
      });
      var full = players.length >= (o.max || 2), b = status.querySelector('b'), s = status.querySelector('small');
      if (o.host) { b.textContent = full ? 'The table is full' : players.length > 1 ? 'More can still join' : 'Waiting for players'; s.textContent = 'On their device: open this game, then Play online. Your table shows up there, or they can type the code. You can also start now and others can join in.'; }
      else { b.textContent = 'Waiting for ' + (o.hostName || 'the host') + ' to start'; s.textContent = 'The game starts on everyone’s screen at once.'; }
    }
    update(o.players || []);
    return { update: update, close: function () { root.innerHTML = ''; } };
  }

  window.Online = {
    config: config, dev: dev, linkTag: linkTag, people: people, whose: whose, myTag: myTag,
    lobby: lobby, waitRoom: waitRoom, host: host, join: join, NAT_MSG: NAT_MSG,
    useTransport: function (t) { transport = t; }, transport: T, localTransport: localTransport, fsTransport: fsTransport,
    _setDev: function (d) { devId = d; }
  };
})();
