// ═══════════════════════════════════════════════════════════════════════════
// Console high scores: the console games that keep a score, where each keeps it in the console's memory, and
// when a game is really being played (not the attract demo, which plays itself and often scores).
//
// Each game in GAMES: key (its board is ArcadeHi 'console_<key>', synced as hi_console_<key>), name, sys, ids (the
// SHA-1 of the game files checked, the cartridge ids), re (a name the game goes by, for another copy of it),
// score(m) -> the score shown on screen (null when the memory doesn't hold a sensible one), play(m) -> a game is
// under way (not the title, the demo or game over), over(m) -> the game-over screen. m(address) reads a byte at
// the console's own address: NES $0000-$07FF, SNES $7E0000-$7FFFFF, Genesis $FF0000-$FFFFFF, Atari 2600 $80-$FF.
// Each one was checked by playing the game and reading the score off the screen against what's read here.
//
// Reading the memory: EmulatorJS has no way to read it, so once per game the console's work RAM is found inside
// the emulator's own memory (Module.HEAPU8): a save state holds a copy of the RAM; that copy is looked for in the
// heap, and the place that still matches a second save state a moment later is the live RAM. From then on a
// score is a few bytes read straight from there (about once a second).
//
// ConsoleHi.watch({...}) follows a game being played (console.js); ConsoleHi.boards() lists the boards the High
// Scores page shows (games on the shelf, on the home screen, with a score here).
// ═══════════════════════════════════════════════════════════════════════════
var ConsoleHi = (function () {
  'use strict';

  // ── Reading numbers out of memory ──
  // one decimal digit per byte, most significant first (null if a byte isn't a digit)
  function digits(m, a, n) { var v = 0; for (var i = 0; i < n; i++) { var d = m(a + i); if (d > 9) return null; v = v * 10 + d; } return v; }
  // packed BCD, most significant byte first (null on a nibble over 9)
  function bcd(m, a, n) { var v = 0; for (var i = 0; i < n; i++) { var b = m(a + i), hi = b >> 4, lo = b & 15; if (hi > 9 || lo > 9) return null; v = v * 100 + hi * 10 + lo; } return v; }
  function bcdLE(m, a, n) { var v = 0; for (var i = n - 1; i >= 0; i--) { var b = m(a + i), hi = b >> 4, lo = b & 15; if (hi > 9 || lo > 9) return null; v = v * 100 + hi * 10 + lo; } return v; }
  function be(m, a, n) { var v = 0; for (var i = 0; i < n; i++) v = v * 256 + m(a + i); return v; }
  function le(m, a, n) { var v = 0; for (var i = n - 1; i >= 0; i--) v = v * 256 + m(a + i); return v; }

  var GAMES = [
    // Mario's score: a digit a byte at $07DD-$07E2, the screen adding a 0 (100 points reads 0,0,0,0,1,0). OperMode
    // $0770: 0 title and demo, 1 playing, 2 the ending, 3 game over.
    { key: 'smb', name: 'Super Mario Bros.', sys: 'nes', ids: ['ea343f4e445a9050d4b4fbac2c77d0693b1d0922'], re: /^super mario bros\.?$/,
      score: function (m) { var d = digits(m, 0x7DD, 6); return d == null ? null : d * 10; },
      play: function (m) { return m(0x770) === 1 || m(0x770) === 2; }, over: function (m) { return m(0x770) === 3; } },
    // the score: 4 bytes at $FFFE26, the screen adding a 0. Game mode $FFF600: $04 title, $08 the demo (which
    // scores), $0C a level ($8C while it loads), $00 the Sega screen after game over.
    { key: 'sonic', name: 'Sonic the Hedgehog', sys: 'genesis', ids: ['69e102855d4389c3fd1a8f3dc7d193f8eee5fe5b'], re: /^sonic the hedgehog$/,
      score: function (m) { return be(m, 0xFFFE26, 4) * 10; },
      play: function (m) { return (m(0xFFF600) & 0x7F) === 0x0C; }, over: function (m) { return false; } }
  ];

  // ── Which game a cartridge is ──
  function norm(s) { return String(s || '').toLowerCase().replace(/\s*[\(\[][^\)\]]*[\)\]]/g, '').replace(/[’']/g, '').replace(/\s+/g, ' ').trim(); }
  function mapFor(c) {
    if (!c) return null;
    var id = String(c.id || '').toLowerCase(), n = norm(c.name);
    for (var i = 0; i < GAMES.length; i++) if (GAMES[i].ids.indexOf(id) >= 0) return GAMES[i];
    for (i = 0; i < GAMES.length; i++) if (GAMES[i].sys === c.sys && GAMES[i].re && GAMES[i].re.test(n)) return GAMES[i];
    return null;
  }
  function keyOf(g) { return 'console_' + g.key; }
  // the boards read with the game's own name
  function label() { if (typeof ArcadeHi === 'undefined') return; GAMES.forEach(function (g) { ArcadeHi.config(keyOf(g), { title: g.name }); }); }

  // ── Finding the console's RAM in the emulator's memory ──
  // where the RAM sits in each core's save state, and how big it is
  var CORE = {
    nes: { at: function (s) { var i = find(s, [82, 65, 77, 0, 0, 8, 0, 0]); return i < 0 ? -1 : i + 8; }, n: 0x800, addr: function (a) { return a & 0x7FF; } },   // fceumm: 'RAM\0', size
    snes: { at: function (s) { var i = find(s, str('RAM:131072:')); return i < 0 ? -1 : i + 11; }, n: 0x20000, addr: function (a) { return a & 0x1FFFF; } },   // snes9x's RAM block
    genesis: { at: function (s) { var i = find(s, str('GENPLUS-GX')); return i < 0 ? -1 : i + 16; }, n: 0x10000, addr: function (a) { return (a & 0xFFFF) ^ 1; } },   // after the 16-byte header; kept as little-endian words
    atari2600: { at: function (s) { var i = find(s, str('M6532')); return i < 0 ? -1 : i + 5; }, n: 128, addr: function (a) { return a & 0x7F; } }   // the RIOT's 128 bytes
  };
  function str(t) { var a = []; for (var i = 0; i < t.length; i++) a.push(t.charCodeAt(i)); return a; }
  function find(s, p) {
    var first = p[0], i = -1, lim = s.length - p.length;
    while ((i = s.indexOf(first, i + 1)) >= 0 && i <= lim) { var ok = true; for (var j = 1; j < p.length; j++) if (s[i + j] !== p[j]) { ok = false; break; } if (ok) return i; }
    return -1;
  }
  // the save state's copy of the RAM: {ram, ptr, size} (ptr/size: where the state itself sits in the heap)
  function stateRam(E, sys) {
    var info = String(E.gameManager.functions.saveStateInfo()).split('|');
    if (info[2] !== '1') return null;
    var size = +info[0], ptr = +info[1], H = E.Module.HEAPU8, s = H.subarray(ptr, ptr + size), at = CORE[sys].at(s);
    if (at < 0) return null;
    return { ram: s.slice(at, at + CORE[sys].n), ptr: ptr, size: size };
  }
  function same(H, base, ram) { if (base < 0 || base + ram.length > H.length) return false; for (var j = 0; j < ram.length; j++) if (H[base + j] !== ram[j]) return false; return true; }
  function cacheGet(sys) { try { return (JSON.parse(localStorage.getItem('gn_con_ram') || '{}') || {})[sys]; } catch (e) { return null; } }
  function cacheSet(sys, v) { try { var o = JSON.parse(localStorage.getItem('gn_con_ram') || '{}') || {}; o[sys] = v; localStorage.setItem('gn_con_ram', JSON.stringify(o)); } catch (e) {} }
  // every place in the heap holding exactly this RAM (not the state's own copy): the low 32 MB first, where the
  // cores keep it, then the rest only if need be
  function scan(E, st) {
    var H = E.Module.HEAPU8, ram = st.ram, n = ram.length, best = 0, bw = 0;
    for (var w = 0; w + 16 <= n; w += 4) { var seen = {}, k = 0; for (var q = 0; q < 16; q++) if (!seen[ram[w + q]]) { seen[ram[w + q]] = 1; k++; } if (k > best) { best = k; bw = w; } }
    if (best < 6) return null;   // (the RAM is still nearly blank: try again in a moment)
    var out = [];
    function pass(from, to) {
      var b0 = ram[bw], i = from - 1;
      while ((i = H.indexOf(b0, i + 1)) >= 0 && i < to) {
        if (i >= st.ptr && i < st.ptr + st.size) { i = st.ptr + st.size - 1; continue; }
        var ok = true; for (var j = 1; j < 16; j++) if (H[i + j] !== ram[bw + j]) { ok = false; break; }
        if (ok && same(H, i - bw, ram)) out.push(i - bw);
      }
    }
    pass(0, Math.min(H.length, 32 << 20));
    if (!out.length) pass(32 << 20, H.length);
    return out;
  }

  // ── Following a game being played ──
  // o: {cart, sys, emu() -> EmulatorJS or null, live() -> the game is running, skip() -> don't follow now (online),
  //     onEnd(key, score, game, why) -> a finished game's score to file (its initials are asked there)}
  function watch(o) {
    var g = mapFor(o.cart); if (!g || !CORE[o.sys]) return null;
    var C = CORE[o.sys], base = -1, cand = null, tries = 0, bad = 0, t = 0, since = Date.now(), lastIn = 0, cached = cacheGet(o.sys);
    var run = null, offT = 0, passed = false, top = null, hold = null;
    try { top = typeof ArcadeHi !== 'undefined' ? ArcadeHi.top(keyOf(g)) : null; } catch (e) {}
    function heap() { var E = o.emu(); return E && E.Module && E.Module.HEAPU8; }
    function mem(H) { return function (a) { return H[base + C.addr(a)]; }; }
    // find the RAM: a cached place or a scan, then a second save state picks the live copy
    function locate(E) {
      if (Date.now() - since < 2500) return;   // (the game sets its RAM up first)
      var st; try { st = stateRam(E, o.sys); } catch (e) { return; }
      if (!st) return;
      var H = E.Module.HEAPU8;
      if (cand) {
        var ok = cand.filter(function (b) { return same(H, b, st.ram); });
        cand = null;
        if (ok.length === 1) { base = ok[0]; cacheSet(o.sys, base); return; }
      }
      if (cached != null && same(H, cached, st.ram)) { cand = [cached]; cached = null; return; }   // (confirmed by the next state, like a scan)
      cached = null;
      if (++tries > 12) return;
      cand = scan(E, st);
      if (cand && !cand.length) cand = null;
    }
    function tick() {
      var E = o.emu();
      if (!E || !o.live() || (o.skip && o.skip())) return;
      if (base < 0) { locate(E); return; }
      var H = heap(), m = mem(H), s, on, over;
      try { s = g.score(m); on = !!g.play(m); over = !!(g.over && g.over(m)); } catch (e) { s = null; }
      if (s == null || !isFinite(s)) { if (++bad > 8) { base = -1; bad = 0; since = Date.now(); } return; }   // (moved, or not this game: look again)
      bad = 0;
      if (!run) run = fresh(s);
      if (on && !over) {
        offT = 0;
        if (!g.down && s < run.last) { end('new'); run = fresh(s); }   // the score went back: a new game (or Reset)
        if (hold != null && s < hold) hold = null;
        // a score counts once it moves while the player is pressing buttons (the demo plays itself), and, after a
        // game was filed, only in a new game (its score starts again lower), so one game is never filed twice
        if (s !== run.last && hold == null && Date.now() - lastIn < 60000) run.earned = true;
        run.last = s; if (s > run.best) run.best = s;
        if (run.earned && !passed && top > 0 && s > top) { passed = true; if (o.onPass) o.onPass(s, top); }
      } else if (run.earned) {
        offT += 1;   // (back on the title, or game over: the game is done)
        if (over || offT >= 6) { hold = scoreOf(run); end(over ? 'over' : 'idle'); run = fresh(s); }
      } else run = fresh(s);
    }
    function fresh(s) { return { best: s, last: s, earned: false }; }
    function scoreOf(r) { return r ? (g.down ? r.last : r.best) : 0; }
    function end(why) {
      if (!run || !run.earned) return;
      var sc = scoreOf(run); run.earned = false;
      if (sc > 0 && o.onEnd) o.onEnd(keyOf(g), sc, g, why);
      try { top = ArcadeHi.top(keyOf(g)); } catch (e) {}
      passed = false;
    }
    var timer = setInterval(tick, 1000);
    return {
      game: g, key: keyOf(g),
      input: function () { lastIn = Date.now(); },
      // the score so far of a game under way (for leaving the page: filed next time)
      pending: function () { return run && run.earned && scoreOf(run) > 0 ? { key: keyOf(g), score: scoreOf(run), name: g.name, at: Date.now() } : null; },
      // the game ends here (leaving, changing cartridge, loading a saved state): its score, if it made one
      finish: function (why) { tick(); end(why || 'left'); run = null; },
      stop: function () { clearInterval(timer); },
      // (tests) where the RAM is, and what's read
      debug: function () { var H = heap(); if (base < 0 || !H) return { base: base }; var m = mem(H); return { base: base, score: g.score(m), play: g.play(m), over: g.over && g.over(m), run: run }; }
    };
  }

  // ── The boards for the High Scores page: games on the shelf and on the home screen that keep a score ──
  // [{key, name, sys, art, id}], one per game (two copies of a game share its board), A to Z
  function boards() {
    var idx = [], vis = {};
    try { idx = JSON.parse(localStorage.getItem('gn_console_idx') || '[]') || []; } catch (e) {}
    try { vis = JSON.parse(localStorage.getItem('gn_console_vis') || '{}') || {}; } catch (e) {}
    var shown = function (id) { return window.ConsoleLib && ConsoleLib.shown ? ConsoleLib.shown(id) : vis[id] !== 0; };
    var by = {};
    idx.forEach(function (c) {
      if (!c || !c.id || !shown(c.id)) return;
      var g = mapFor(c); if (!g) return;
      var k = keyOf(g);
      if (!by[k] || (!by[k].art && c.art)) by[k] = { key: k, name: g.name, sys: g.sys, art: c.art || null, id: c.id, game: g.key };
    });
    return Object.keys(by).map(function (k) { return by[k]; }).sort(function (a, b) { return a.name.localeCompare(b.name, 'en', { numeric: true }); });
  }

  label();
  return { games: GAMES, mapFor: mapFor, key: keyOf, watch: watch, boards: boards, label: label,
    _: { digits: digits, bcd: bcd, bcdLE: bcdLE, be: be, le: le, stateRam: stateRam, scan: scan, CORE: CORE } };
})();
