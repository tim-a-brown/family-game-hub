// ═══════════════════════════════════════════════════════════════════════════
// ConsoleNet: one console game, two to four devices, online (console.js does the screens, online.js the connection).
//
// Lockstep, the way emulators play online: every device runs the same game from the same moment, and every frame
// each gets the same controller input, so all the pictures stay identical without sending any picture at all.
//   - Seats: the host is player 1 (seat 0); each guest has its own seat (1-3). Guests are linked only to the host
//     (online.js tables are a star), so the host passes everyone's buttons on to everyone else.
//   - Each device reads its own player's buttons and books them for a few frames ahead (the delay, from the time
//     a message takes to get round), sending them on straight away: by the time that frame comes round, every
//     other device has them too. The host sends its own straight to each guest, and forwards each guest's to the
//     others the moment they come in (with two players that's exactly a direct link).
//   - A frame runs only when every seat's buttons for it are in; if one hasn't come yet, it waits (the page shows
//     who it's waiting for). A guest who leaves: the host says from which frame their seat is empty, which is
//     past anything anyone has run with their buttons, so every device switches at the same frame.
//   - The start: the host sends its game exactly as it is (a save state); all load it and begin at frame 0.
//     Someone joining a game under way: console.js starts it again for everyone from the host's game.
//   - A check every few seconds: every guest fingerprints the game and sends it to the host; if one differs, the
//     host sends its game to all again (and loads it itself: some cores keep a little outside save states).
// The hooks: EJS_preFrame (before each frame; false holds it back) and EJS_postFrame, in emu/emulator.min.js.
// One emulator frame per loop step (checked); loading a state takes one step of its own, with no frame in it.
//
// API (window.ConsoleNet)
//   install(E)             once the emulator is up: every press (drawn pad, controllers, keyboard) comes here
//   begin(o)               start lockstep. o: {sid, seat, seats: [0, 1, ...], delay, state, onEnd} plus, on the host,
//                          guests: [{peer, seat}], on a guest, peer (the host). hold() first to stop the game
//   hold()                 stop the game at the next frame until begin (a guest, while it waits)
//   drop(seat) -> n        host: that guest left; their seat is empty from here on. n: guests still playing
//   load(bytes)            this state on every device (host only)
//   resync()               the host's game to every guest again
//   reset()                the console's Reset button, everywhere at the same frame (host only)
//   end(why)               back to playing alone
//   pause(on)              a menu open on this device: the game waits (and the others see why)
//   status() -> {on, wait: ms waited, waitSeat, paused, pausedSeat, rtt, delay, frame, seat, seats, gone, resyncs, checks}
//   pack(bytes) -> Promise<packed>; ship(peer, kind, packed, meta, onProgress) -> Promise
//   sendBytes(peer, kind, bytes, meta, onProgress) -> Promise; onBytes(fn(kind, bytes, meta)); onProgress(fn(kind, frac))
// ═══════════════════════════════════════════════════════════════════════════
(function () {
  'use strict';
  var FMS = 1000 / 60.0988;    // an NTSC frame
  var CHECK = 300;             // fingerprint the game every 5 seconds (every second when the state is small)
  var KEEP = 240;              // frames of button history kept (for a resync that rewinds)
  var SEATS = 4;
  var E = null, gm = null, raw = null;
  var mine = [{}, {}, {}, {}]; // buttons held on this device (by the console.js player index), while online
  var N = null;                // the session
  var holding = false;

  function fnv(a) { var h = 2166136261; for (var i = 0; i < a.length; i++) h = Math.imul(h ^ a[i], 16777619); return h >>> 0; }
  // online, every controller on this device plays this device's seat
  function myMask() { var m = 0; for (var p = 0; p < SEATS; p++) for (var i in mine[p]) if (mine[p][i]) m |= 1 << i; return m; }

  function install(emu) {
    if (E === emu) return;
    E = emu; gm = emu.gameManager; raw = gm.functions.simulateInput;
    var orig = gm.simulateInput;
    gm.simulateInput = function (p, i, v) {
      if (N || holding) { if (i < 12 && p < SEATS) mine[p][i] = v ? 1 : 0; return; }
      return orig.apply(gm, arguments);
    };
  }

  // ── Who's in, and what's known of their buttons ──
  // N.ins[s][f]: seat s's buttons for frame f · N.hi[s]: every frame up to here is in · N.gone[s]: empty from this frame
  function inputOf(s, f) { return N.gone[s] != null && f >= N.gone[s] ? 0 : N.ins[s][f]; }
  function missing(f) {   // the seat frame f still waits for (-1: none)
    for (var k = 0; k < N.seats.length; k++) { var s = N.seats[k]; if (inputOf(s, f) === undefined) return s; }
    return -1;
  }
  function advance(s) { var I = N.ins[s]; while (I[N.hi[s] + 1] !== undefined) N.hi[s]++; }

  // ── The frame loop ──
  window.EJS_preFrame = function () {
    if (!N) return holding ? false : undefined;
    var now = performance.now();
    if (N.loading) { N.loading.step = true; N.next = now; return; }   // this step loads the state; no frame
    if (!N.go || N.held) return false;   // (a menu open here: the game waits, and the others wait with it)
    if (now < N.next - 3) return false;
    sample(now);
    var f = N.f, w = missing(f);
    if (w >= 0) {
      if (!N.waitAt) N.waitAt = now;
      N.waitSeat = w;
      if (now - N.sentAt > 40) sendAll(now);   // keep ours coming while we wait (a lost message can't stall anyone)
      return false;
    }
    N.waitAt = 0; N.waitSeat = -1;
    if (N.resetAt === f) gm.restart();   // Reset online: every console at the same frame
    for (var p = 0; p < SEATS; p++) {
      var m = N.inGame[p] ? inputOf(p, f) | 0 : 0, d = m ^ N.applied[p];
      if (d) for (var i = 0; i < 12; i++) if (d >> i & 1) raw(p, i, m >> i & 1);
      N.applied[p] = m;
    }
    N.ran = f; N.f = f + 1;
    N.next = Math.max(N.next + FMS, now - FMS);
  };
  window.EJS_postFrame = function () {
    if (!N) return;
    if (N.loading && N.loading.step) {
      // the load is done when the game is exactly the state sent; once in a while it needs another go
      var L = N.loading; L.step = false;
      var h = 0; try { h = fnv(gm.getState()); } catch (e) {}
      if (h === L.h || ++L.tries > 4) { N.loading = null; if (h !== L.h) console.warn('[net] state did not load'); }
      else try { gm.loadState(L.bytes); } catch (e) { N.loading = null; }
      return;
    }
    if (N.ran == null) return;
    var f = N.ran; N.ran = null;
    // drop old history
    if (f % 60 === 0) {
      N.ins.forEach(function (I) { for (var k in I) if (+k < f - KEEP) delete I[k]; });
      for (var j in N.hashes) if (+j < f - 1200) { delete N.hashes[j]; delete N.theirs[j]; }
    }
    if (N.wantSync && N.host) { N.wantSync = false; pushState(); return; }
    // the delay follows the connection: each device books its own buttons far enough ahead for them to reach every
    // other device in time (they needn't match). Up straight away when it gets slower, down a frame at a time.
    // The way there: the host's go straight to each guest (the slowest decides); a guest's go through the host
    // (its own link, then the slowest of the other guests' links).
    if (f % 120 === 0) {
      var r = N.host ? N.guests.reduce(function (a, g) { return Math.max(a, g.peer.rtt || 0); }, 0) : (N.peer.rtt || 0) + (N.otherRtt || 0);
      if (r) {
        N.rtts.push(r); if (N.rtts.length > 6) N.rtts.shift();   // (the second slowest of the last few: one hiccup doesn't count)
        var rs = N.rtts.slice().sort(function (a, b) { return a - b; }), rtt = rs[Math.max(0, rs.length - 2)];
        var want = Math.max(2, Math.min(10, Math.ceil((rtt / 2 + 10) / FMS) + 1));
        if (want > N.delay) N.delay = want; else if (want < N.delay && f % 360 === 0) N.delay--;
      }
    }
    if ((f + 1) % N.check === 0) {
      var st = null; try { st = gm.getState(); } catch (e) { return; }
      var h2 = fnv(st);
      if (st.length < 150000) N.check = 60;   // a small game state: check it every second
      if (!N.host) { N.peer.send({ t: 'nh', s: N.sid, f: f, h: h2, e: N.epoch }, true); return; }
      N.hashes[f] = h2;
      compare(f);
    }
  };
  // the host: its fingerprint against each guest's, as they come in
  function compare(f) {
    var mineH = N.hashes[f], th = N.theirs[f];
    if (mineH == null || !th) return;
    Object.keys(th).forEach(function (s) {
      N.checks++;
      if (th[s] !== mineH && !N.wantSync) { console.warn('[net] seat', s, 'out of step at frame', f, '· sending the game again'); N.resyncs++; N.wantSync = true; }
    });
    N.theirs[f] = {};
  }

  // our buttons, booked `delay` frames ahead (every frame up to there, so none is ever skipped)
  function sample(now) {
    var want = N.f + N.delay, m = myMask(), I = N.ins[N.seat], fresh = false;
    while (N.hi[N.seat] < want) { I[++N.hi[N.seat]] = m; fresh = true; }
    if (fresh) sendAll(now);
  }
  function masks(s, from, to) { var I = N.ins[s], m = []; for (var f = from; f <= to; f++) m.push(I[f] || 0); return m; }
  function sendAll(now) {
    if (N.host) N.guests.forEach(function (g) { sendTo(g); }); else sendHost();
    N.sentAt = now;
  }
  // a guest: its own buttons the host hasn't confirmed yet (the newest 60 at most), and how far it has everyone's
  function sendHost() {
    var last = N.hi[N.seat], from = Math.max(N.ack + 1, last - 59);
    N.peer.send({ t: 'ni', s: N.sid, a: N.hi.slice(), f: from, m: masks(N.seat, from, last) }, false);
  }
  // the host to one guest: every other seat's buttons that guest hasn't confirmed yet, and how far it has theirs
  function sendTo(g) {
    var x = [];
    for (var s = 0; s < SEATS; s++) {
      if (s === g.seat || !N.inGame[s]) continue;
      var from = Math.max(g.ack[s] + 1, N.hi[s] - 59);
      if (from <= N.hi[s]) x.push([s, from, masks(s, from, N.hi[s])]);
    }
    var pk = { t: 'ni', s: N.sid, a: N.hi[g.seat], x: x };
    if (N.resetAt != null && N.resetAt >= g.ack[0] + 1 - 30) pk.r = N.resetAt;   // (rides with the buttons, so it's there before that frame can run)
    if (N.guests.length > 1) pk.w = N.guests.reduce(function (a, o) { return o === g ? a : Math.max(a, o.peer.rtt || 0); }, 0) | 0;
    g.peer.send(pk, false);
  }
  function take(s, f0, m) {
    var I = N.ins[s], fresh = false;
    if (!I) return false;
    for (var k = 0; k < m.length; k++) if (I[f0 + k] === undefined && f0 + k > N.f - KEEP) { I[f0 + k] = m[k] | 0; fresh = true; }
    advance(s);
    return fresh;
  }
  function onMsg(msg, peer) {
    if (!N || !msg || typeof msg.t !== 'string' || msg.t.charAt(0) !== 'n' || msg.t === 'nb') return;
    if (msg.s !== N.sid) return;   // (from an earlier start)
    var g = N.host ? guestOf(peer) : null;
    if (N.host && !g) return;
    if (msg.t === 'ni') {
      if (N.host) {
        // a guest's buttons: keep them, and pass them straight on to the other guests
        if (take(g.seat, msg.f | 0, msg.m || []) && N.guests.length > 1) N.guests.forEach(function (o) { if (o !== g) sendTo(o); });
        var a = msg.a || [];
        for (var s = 0; s < SEATS; s++) if (a[s] > g.ack[s]) g.ack[s] = a[s];
      } else {
        if (msg.r != null && msg.r >= N.f) N.resetAt = msg.r;
        (msg.x || []).forEach(function (e) { if (e && e[0] !== N.seat) take(e[0] | 0, e[1] | 0, e[2] || []); });
        if (msg.a > N.ack) N.ack = msg.a;
        if (msg.w != null) N.otherRtt = msg.w; else N.otherRtt = 0;
      }
    } else if (msg.t === 'nh' && N.host) {
      if ((msg.e | 0) !== N.epoch) return;   // (one from before the last resync doesn't count)
      (N.theirs[msg.f] || (N.theirs[msg.f] = {}))[g.seat] = msg.h;
      compare(msg.f);
    } else if (msg.t === 'np') {
      var who = N.host ? g.seat : msg.k | 0;
      N.paused[who] = !!msg.on;
      if (N.host) N.guests.forEach(function (o) { if (o !== g) o.peer.send({ t: 'np', s: N.sid, k: who, on: msg.on ? 1 : 0 }, true); });
    } else if (msg.t === 'nx' && !N.host) {
      seatGone(msg.k | 0, msg.f | 0);
    }
  }
  function guestOf(peer) { for (var i = 0; i < N.guests.length; i++) if (N.guests[i].peer === peer) return N.guests[i]; return null; }
  function seatGone(s, f) {
    if (N.gone[s] != null) return;
    N.gone[s] = f; delete N.paused[s];
  }

  // the host's game, sent at a frame boundary: the guests pick up from there. The host loads it too: loading
  // resets a few things a state doesn't hold (some consoles' timers), so all carry on from exactly the same place.
  function pushState(S) {
    if (!S) { try { S = gm.getState(); } catch (e) { return; } }
    N.hashes = {}; N.theirs = {};
    doLoad(S);
    var meta = { f: N.f, e: ++N.epoch, s: N.sid }, gs = N.guests.slice();
    pack(S).then(function (pk) { gs.forEach(function (g) { ship(g.peer, 'nstate', pk, meta).catch(function () {}); }); });
  }
  function takeState(bytes, meta) {
    if (!N || N.host || meta.s !== N.sid) return;
    var g = meta.f | 0;
    // a rewind (or a jump ahead): pick up at the host's frame; buttons from there on are in the history
    N.f = g;
    for (var s = 0; s < SEATS; s++) if (s !== N.seat && N.ins[s]) { N.hi[s] = Math.max(N.hi[s], g - 1); advance(s); }
    N.hashes = {}; N.theirs = {}; N.epoch = meta.e | 0;
    doLoad(bytes);
  }
  function doLoad(bytes) {
    gm.loadState(bytes);
    N.loading = { bytes: bytes, h: fnv(bytes), tries: 0, step: false };
  }

  function begin(o) {
    end('restart');
    holding = false;
    var D = o.delay, seats = (o.seats || [0, 1]).slice().sort();
    N = { host: o.seat === 0, sid: o.sid || '', seat: o.seat, seats: seats, inGame: [], ins: [], hi: [], gone: {}, paused: {},
      peer: o.peer || null, guests: [], ack: -1, otherRtt: 0, delay: D, f: 0, applied: [0, 0, 0, 0],
      next: performance.now(), sentAt: 0, waitAt: 0, waitSeat: -1, go: true, ran: null, loading: null, hashes: {}, theirs: {}, wantSync: false,
      held: false, resyncs: 0, checks: 0, epoch: 0, check: CHECK, resetAt: null, rtts: [], onEnd: o.onEnd };
    // every seat's buttons for the first `delay` frames: none (so the game can start straight away)
    for (var s = 0; s < SEATS; s++) {
      N.inGame[s] = seats.indexOf(s) >= 0;
      N.ins[s] = N.inGame[s] ? {} : null; N.hi[s] = N.inGame[s] ? D - 1 : -1;
      if (N.inGame[s]) for (var f = 0; f < D; f++) N.ins[s][f] = 0;
    }
    for (var p = 0; p < SEATS; p++) for (var i = 0; i < 12; i++) raw(p, i, 0);
    function hear(peer) { if (!peer._cnet) { peer._cnet = true; peer.on('msg', function (m) { if (N) onMsg(m, peer); }); } }
    if (N.host) (o.guests || []).forEach(function (g) {
      var ack = []; for (var s2 = 0; s2 < SEATS; s2++) ack.push(N.inGame[s2] ? D - 1 : -1);
      N.guests.push({ peer: g.peer, seat: g.seat, ack: ack }); hear(g.peer);
    });
    else { N.ack = D - 1; hear(o.peer); }
    if (o.state) { try { gm.restart(); } catch (e) {} doLoad(o.state); }
  }
  function drop(seat) {
    if (!N || !N.host) return 0;
    N.guests = N.guests.filter(function (g) { return g.seat !== seat; });
    if (N.inGame[seat] && N.gone[seat] == null) {
      // empty from the first frame nobody has their buttons for: no device can have run it yet
      var f = N.hi[seat] + 1;
      seatGone(seat, f);
      N.guests.forEach(function (g) { g.peer.send({ t: 'nx', s: N.sid, k: seat, f: f }, true); });
    }
    return N.guests.length;
  }
  function end(why) {
    if (!N) { holding = false; return; }
    var S = N; N = null; holding = false;
    for (var p = 0; p < SEATS; p++) for (var i = 0; i < 12; i++) if (S.applied[p] >> i & 1) raw(p, i, 0);
    // what's still held on this device goes back to the game as its own players'
    mine.forEach(function (h, pl) { for (var k in h) { if (h[k]) try { raw(pl, +k, 1); } catch (e) {} } });
    if (why !== 'restart' && S.onEnd) S.onEnd(why);
  }
  function status() {
    if (!N) return { on: false };
    var ps = -1; for (var s in N.paused) if (N.paused[s]) { ps = +s; break; }
    var rtt = N.host ? N.guests.reduce(function (a, g) { return Math.max(a, g.peer.rtt || 0); }, 0) : N.peer.rtt || 0;
    return { on: true, wait: N.waitAt && !N.loading ? performance.now() - N.waitAt : 0, waitSeat: N.waitAt ? N.waitSeat : -1, paused: ps >= 0, pausedSeat: ps,
      rtt: rtt, delay: N.delay, frame: N.f, seat: N.seat, seats: N.seats.slice(), gone: Object.keys(N.gone).map(Number), resyncs: N.resyncs, checks: N.checks, epoch: N.epoch };
  }

  // ── Big things over the reliable channel: the cartridge, the game's state ──
  // gzip when the browser can (states shrink to a fraction), base64 in pieces small enough for any browser,
  // paced by what the channel still has to send. pack once, ship to each device.
  var CH = 48000, inbox = {}, byteFns = [], progFns = [];
  function gz(bytes, how) {
    if (typeof CompressionStream === 'undefined') return Promise.resolve(null);
    var s = new Blob([bytes]).stream().pipeThrough(how === 'up' ? new DecompressionStream('gzip') : new CompressionStream('gzip'));
    return new Response(s).arrayBuffer().then(function (b) { return new Uint8Array(b); }, function () { return null; });
  }
  function b64(u8) { var s = ''; for (var i = 0; i < u8.length; i += 8192) s += String.fromCharCode.apply(null, u8.subarray(i, i + 8192)); return btoa(s); }
  function unb64(s) { var b = atob(s), a = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a; }
  function pack(bytes) {
    return gz(bytes).then(function (z) { var body = z && z.length < bytes.length ? z : bytes; return { s: b64(body), z: body !== bytes ? 1 : 0, len: bytes.length }; });
  }
  function ship(peer, kind, pk, meta, onProg) {
    var s = pk.s, n = Math.max(1, Math.ceil(s.length / CH)), id = Math.random().toString(36).slice(2, 9), i = 0;
    return new Promise(function (ok, no) {
      (function next() {
        if (peer.closed) return no(new Error('closed'));
        var ch = peer.r;
        while (i < n) {
          if (ch && ch.bufferedAmount > 1000000) return setTimeout(next, 30);
          var m = { t: 'nb', id: id, k: kind, n: n, i: i, d: s.slice(i * CH, (i + 1) * CH) };
          if (i === 0) { m.meta = meta || {}; m.z = pk.z; m.len = pk.len; }
          if (!peer.send(m, true)) return no(new Error('closed'));
          i++;
          if (onProg) onProg(i / n);
        }
        ok();
      })();
    });
  }
  function sendBytes(peer, kind, bytes, meta, onProg) { return pack(bytes).then(function (pk) { return ship(peer, kind, pk, meta, onProg); }); }
  function takeBytes(m) {
    var b = inbox[m.id] || (inbox[m.id] = { parts: [], got: 0 });
    if (m.i === 0) { b.meta = m.meta; b.z = m.z; b.k = m.k; }
    if (b.parts[m.i] == null) { b.parts[m.i] = m.d; b.got++; }
    progFns.forEach(function (f) { f(m.k, b.got / m.n); });
    if (b.got < m.n) return;
    delete inbox[m.id];
    var raw8 = unb64(b.parts.join(''));
    (b.z ? gz(raw8, 'up') : Promise.resolve(raw8)).then(function (bytes) {
      if (!bytes) return;
      if (b.k === 'nstate') { takeState(bytes, b.meta || {}); return; }
      byteFns.forEach(function (f) { f(b.k, bytes, b.meta || {}); });
    });
  }
  function listen(peer) {
    if (peer._cnetb) return; peer._cnetb = true;
    peer.on('msg', function (m) { if (m && m.t === 'nb') takeBytes(m); });
  }

  window.ConsoleNet = {
    install: install, begin: begin, end: end, drop: drop, status: status, listen: listen, sendBytes: sendBytes, pack: pack, ship: ship,
    hold: function () { holding = true; },
    load: function (bytes) { if (!N || !N.host) return; N.wantSync = false; pushState(bytes); },
    resync: function () { if (N && N.host) N.wantSync = true; },
    reset: function () { if (N && N.host) N.resetAt = N.hi[0] + 1; },
    // a menu open on this device: hold the game here (EmulatorJS's own pause doesn't keep consoles in step)
    pause: function (on) {
      if (!N || !!N.held === !!on) return;
      N.held = !!on; if (!on) N.next = performance.now();
      var m = { t: 'np', s: N.sid, k: N.seat, on: on ? 1 : 0 };
      if (N.host) N.guests.forEach(function (g) { g.peer.send(m, true); }); else N.peer.send(m, true);
    },
    on: function () { return !!N; },
    _n: function () { return N; },
    seat: function () { return N ? N.seat : -1; },
    onBytes: function (f) { byteFns.push(f); },
    onProgress: function (f) { progFns.push(f); }
  };
})();
