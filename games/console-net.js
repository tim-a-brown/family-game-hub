// ═══════════════════════════════════════════════════════════════════════════
// ConsoleNet: one console game, two devices, online (console.js does the screens, online.js the connection).
//
// Lockstep, the way emulators play online: both devices run the same game from the same moment, and every frame
// both get the same controller input, so both pictures stay identical without sending any picture at all.
//   - Each device reads its own player's buttons and books them for a few frames ahead (the delay, from the time
//     a message takes to go there and back), sending them on straight away: by the time that frame comes round,
//     the other device has them too.
//   - A frame runs only when both players' buttons for it are in; if the other's haven't come yet, it waits (the
//     page shows who it's waiting for).
//   - The start: the host sends its game exactly as it is (a save state); both load it and begin at frame 0.
//   - A check every few seconds: both fingerprint the game; if they ever differ, the host sends its game again.
// The hooks: EJS_preFrame (before each frame; false holds it back) and EJS_postFrame, in emu/emulator.min.js.
// One emulator frame per loop step (checked); loading a state takes one step of its own, with no frame in it.
//
// API (window.ConsoleNet)
//   install(E)             once the emulator is up: every press (drawn pad, controllers, keyboard) comes here
//   begin({peer, seat, delay, onEnd})   start lockstep (seat 0 is player 1, the host); hold() first to stop the game
//   hold()                 stop the game at the next frame until begin (the guest, while it waits)
//   load(bytes)            this state on both devices (host only)
//   resync()               the host's game to the guest again
//   reset()                the console's Reset button, on both at the same frame (host only)
//   end(why)               back to playing alone
//   pause(on)             a menu open on this device: the game waits (and the other device sees why)
//   status() -> {on, wait: ms waited for the other, paused: other's menu open, rtt, delay, frame}
//   sendBytes(peer, kind, bytes, meta, onProgress) -> Promise; onBytes(fn(kind, bytes, meta)); onProgress(fn(kind, frac))
// ═══════════════════════════════════════════════════════════════════════════
(function () {
  'use strict';
  var FMS = 1000 / 60.0988;    // an NTSC frame
  var CHECK = 300;             // fingerprint both games every 5 seconds (every second when the state is small)
  var KEEP = 240;              // frames of button history kept (for a resync that rewinds)
  var E = null, gm = null, raw = null;
  var mine = [{}, {}];         // buttons held on this device (by the console.js player index), while online
  var N = null;                // the session
  var holding = false;

  function fnv(a) { var h = 2166136261; for (var i = 0; i < a.length; i++) h = Math.imul(h ^ a[i], 16777619); return h >>> 0; }
  function myMask() { var m = 0; for (var p = 0; p < 2; p++) for (var i in mine[p]) if (mine[p][i]) m |= 1 << i; return m; }

  function install(emu) {
    if (E === emu) return;
    E = emu; gm = emu.gameManager; raw = gm.functions.simulateInput;
    var orig = gm.simulateInput;
    gm.simulateInput = function (p, i, v) {
      if (N || holding) { if (i < 12 && p < 2) mine[p][i] = v ? 1 : 0; return; }
      return orig.apply(gm, arguments);
    };
  }

  // ── The frame loop ──
  window.EJS_preFrame = function () {
    if (!N) return holding ? false : undefined;
    var now = performance.now();
    if (N.loading) { N.loading.step = true; N.next = now; return; }   // this step loads the state; no frame
    if (!N.go || N.held) return false;   // (a menu open here: the game waits, and the other device waits with it)
    if (now < N.next - 3) return false;
    sample(now);
    var f = N.f, r = N.rem[f];
    if (r === undefined) {
      if (!N.waitAt) N.waitAt = now;
      if (now - N.sentAt > 40) send(now);   // keep ours coming while we wait (a lost message can't stall both)
      return false;
    }
    N.waitAt = 0;
    if (N.resetAt === f) gm.restart();   // Reset online: both consoles at the same frame
    var l = N.loc[f], m = N.seat === 0 ? [l, r] : [r, l];
    for (var p = 0; p < 2; p++) {
      var d = m[p] ^ N.applied[p];
      if (d) for (var i = 0; i < 12; i++) if (d >> i & 1) raw(p, i, m[p] >> i & 1);
      N.applied[p] = m[p];
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
    if (f % 60 === 0) { for (var k in N.loc) if (+k < f - KEEP) delete N.loc[k]; for (var j in N.rem) if (+j < f - KEEP) delete N.rem[j]; }
    if (N.wantSync && N.seat === 0) { N.wantSync = false; pushState(); return; }
    // the delay follows the connection: each device books its own buttons far enough ahead for them to arrive in
    // time (the two needn't match). Up straight away when it gets slower, down a frame at a time when it's quick.
    if (f % 120 === 0 && N.peer.rtt) {
      N.rtts.push(N.peer.rtt); if (N.rtts.length > 6) N.rtts.shift();   // (the second slowest of the last few: one hiccup doesn't count)
      var rs = N.rtts.slice().sort(function (a, b) { return a - b; }), rtt = rs[Math.max(0, rs.length - 2)];
      var want = Math.max(2, Math.min(10, Math.ceil((rtt / 2 + 10) / FMS) + 1));
      if (want > N.delay) N.delay = want; else if (want < N.delay && f % 360 === 0) N.delay--;
    }
    if ((f + 1) % N.check === 0) {
      var st = null; try { st = gm.getState(); } catch (e) { return; }
      var h2 = fnv(st);
      if (st.length < 150000) N.check = 60;   // a small game state: check it every second
      N.hashes[f] = h2;
      if (N.seat === 1) N.peer.send({ t: 'nh', f: f, h: h2, e: N.epoch }, true);
      else if (N.theirs[f] != null) compare(f);
    }
  };
  function compare(f) {
    if (N.hashes[f] == null || N.theirs[f] == null) return;
    N.checks++;
    if (N.hashes[f] !== N.theirs[f]) { console.warn('[net] out of step at frame', f, '· sending the game again'); N.resyncs++; N.wantSync = true; }
    delete N.hashes[f]; delete N.theirs[f];
  }

  // our buttons, booked `delay` frames ahead (every frame up to there, so none is ever skipped)
  function sample(now) {
    var want = N.f + N.delay, m = myMask(), fresh = false;
    while (N.last < want) { N.last++; N.loc[N.last] = m; fresh = true; }
    if (fresh) send(now);
  }
  // the buttons the other device hasn't confirmed yet (all of them since its last ack, the newest 60 at most)
  function send(now) {
    var from = Math.max(N.ack + 1, N.last - 59), m = [];
    for (var f = from; f <= N.last; f++) m.push(N.loc[f] || 0);
    var pk = { t: 'ni', a: N.have, f: from, m: m };
    if (N.resetAt != null && N.resetAt >= from - 30) pk.r = N.resetAt;   // (rides with the buttons, so it's there before that frame can run)
    N.peer.send(pk, false);
    N.sentAt = now;
  }
  function onMsg(msg) {
    if (!N || !msg || typeof msg.t !== 'string' || msg.t.charAt(0) !== 'n') return;
    if (msg.t === 'ni') {
      var f0 = msg.f | 0, m = msg.m || [];
      if (msg.r != null && msg.r >= N.f) N.resetAt = msg.r;
      for (var k = 0; k < m.length; k++) if (N.rem[f0 + k] === undefined && f0 + k > N.f - KEEP) N.rem[f0 + k] = m[k] | 0;
      while (N.rem[N.have + 1] !== undefined) N.have++;
      if (msg.a > N.ack) N.ack = msg.a;
    } else if (msg.t === 'nh' && N.seat === 0) { if ((msg.e | 0) !== N.epoch) return; N.theirs[msg.f] = msg.h; compare(msg.f); }   // (one from before the last resync doesn't count)
    else if (msg.t === 'np') { N.paused = !!msg.on; }
  }
  // the host's game, sent at a frame boundary: the guest picks up from there. The host loads it too: loading
  // resets a few things a state doesn't hold (some consoles' timers), so both carry on from exactly the same place.
  function pushState() {
    var S; try { S = gm.getState(); } catch (e) { return; }
    N.hashes = {}; N.theirs = {};
    doLoad(S);
    sendBytes(N.peer, 'nstate', S, { f: N.f, e: ++N.epoch });
  }
  function takeState(bytes, meta) {
    if (!N) return;
    var g = meta.f | 0;
    // a rewind (or a jump ahead): pick up at the host's frame; buttons from there on are in the history
    N.f = g; N.have = Math.max(N.have, g - 1);
    while (N.rem[N.have + 1] !== undefined) N.have++;
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
    N = { peer: o.peer, seat: o.seat, delay: o.delay, f: 0, last: o.delay - 1, have: o.delay - 1, ack: -1, loc: {}, rem: {}, applied: [0, 0],
      next: performance.now(), sentAt: 0, waitAt: 0, go: true, ran: null, loading: null, hashes: {}, theirs: {}, wantSync: false, paused: false, held: false, resyncs: 0, checks: 0, epoch: 0, check: CHECK, resetAt: null, rtts: [], onEnd: o.onEnd };
    for (var f = 0; f < o.delay; f++) { N.loc[f] = 0; N.rem[f] = 0; }
    for (var p = 0; p < 2; p++) for (var i = 0; i < 12; i++) raw(p, i, 0);
    if (!o.peer._cnet) { o.peer._cnet = true; o.peer.on('msg', function (m) { if (N && N.peer === o.peer) onMsg(m); }); }
    if (o.state) { try { gm.restart(); } catch (e) {} doLoad(o.state); }
  }
  function end(why) {
    if (!N) { holding = false; return; }
    var S = N; N = null; holding = false;
    for (var p = 0; p < 2; p++) for (var i = 0; i < 12; i++) if (S.applied[p] >> i & 1) raw(p, i, 0);
    // what's still held on this device goes back to the game as player 1's
    mine.forEach(function (h, pl) { for (var k in h) { if (h[k]) try { raw(pl, +k, 1); } catch (e) {} } });
    if (why !== 'restart' && S.onEnd) S.onEnd(why);
  }
  function status() {
    if (!N) return { on: false };
    return { on: true, wait: N.waitAt && !N.loading ? performance.now() - N.waitAt : 0, paused: N.paused, rtt: N.peer.rtt || 0, delay: N.delay, frame: N.f, resyncs: N.resyncs, checks: N.checks };
  }

  // ── Big things over the reliable channel: the cartridge, the game's state ──
  // gzip when the browser can (states shrink to a fraction), base64 in pieces small enough for any browser,
  // paced by what the channel still has to send.
  var CH = 48000, inbox = {}, byteFns = [], progFns = [];
  function gz(bytes, how) {
    if (typeof CompressionStream === 'undefined') return Promise.resolve(null);
    var s = new Blob([bytes]).stream().pipeThrough(how === 'up' ? new DecompressionStream('gzip') : new CompressionStream('gzip'));
    return new Response(s).arrayBuffer().then(function (b) { return new Uint8Array(b); }, function () { return null; });
  }
  function b64(u8) { var s = ''; for (var i = 0; i < u8.length; i += 8192) s += String.fromCharCode.apply(null, u8.subarray(i, i + 8192)); return btoa(s); }
  function unb64(s) { var b = atob(s), a = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a; }
  function sendBytes(peer, kind, bytes, meta, onProg) {
    return gz(bytes).then(function (z) {
      var body = z && z.length < bytes.length ? z : bytes, s = b64(body), n = Math.max(1, Math.ceil(s.length / CH)), id = Math.random().toString(36).slice(2, 9), i = 0;
      return new Promise(function (ok, no) {
        (function next() {
          if (peer.closed) return no(new Error('closed'));
          var ch = peer.r;
          while (i < n) {
            if (ch && ch.bufferedAmount > 1000000) return setTimeout(next, 30);
            var m = { t: 'nb', id: id, k: kind, n: n, i: i, d: s.slice(i * CH, (i + 1) * CH) };
            if (i === 0) { m.meta = meta || {}; m.z = body !== bytes ? 1 : 0; m.len = bytes.length; }
            if (!peer.send(m, true)) return no(new Error('closed'));
            i++;
            if (onProg) onProg(i / n);
          }
          ok();
        })();
      });
    });
  }
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
    install: install, begin: begin, end: end, status: status, listen: listen, sendBytes: sendBytes,
    hold: function () { holding = true; },
    load: function (bytes) { if (!N || N.seat !== 0) return; N.wantSync = false; N.hashes = {}; N.theirs = {}; doLoad(bytes); sendBytes(N.peer, 'nstate', bytes, { f: N.f, e: ++N.epoch }); },
    resync: function () { if (N && N.seat === 0) N.wantSync = true; },
    reset: function () { if (N && N.seat === 0) N.resetAt = N.last + 1; },
    // a menu open on this device: hold the game here (EmulatorJS's own pause doesn't keep two consoles in step)
    pause: function (on) { if (!N || !!N.held === !!on) return; N.held = !!on; if (!on) N.next = performance.now(); N.peer.send({ t: 'np', on: on ? 1 : 0 }, true); },
    on: function () { return !!N; },
    _n: function () { return N; },
    seat: function () { return N ? N.seat : -1; },
    onBytes: function (f) { byteFns.push(f); },
    onProgress: function (f) { progFns.push(f); }
  };
})();
