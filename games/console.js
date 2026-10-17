// ═══════════════════════════════════════════════════════════════════════════
// Consoles: NES, Super Nintendo, Sega Genesis and Atari 2600, played from your own game files.
//
// The page (games/nes.html, snes.html, genesis.html, atari2600.html) sets window.CONSOLE to 'nes' | 'snes' |
// 'genesis' | 'atari2600'.
// The shelf shows the console on its stand and your games as cartridges. Tap one: it slides into the console
// and the game takes over the whole display, like Delta: the picture at the top (or in the middle, sideways)
// and the system's own controller drawn round it, with Menu and Fast-forward buttons. ?play=<id> (a game's
// tile on the home screen) goes straight to the game. EmulatorJS (../emu/, the RetroArch cores fceumm,
// snes9x, genesis_plus_gx and stella2014) runs it; its own menus and on-screen pad are hidden.
//
// Your games: console-lib.js (this device, and the cloud when signed in with a PIN). Save states stay on the
// device (IndexedDB gn_console, store states: {key 'id:slot', id, slot ('auto' | 1..3), at, img, data}); the game's
// own battery saves (SRAM) are kept by EmulatorJS, per game (EJS_gameName = id).
// ═══════════════════════════════════════════════════════════════════════════
(function () {
  'use strict';
  var SYS_ID = window.CONSOLE || 'nes';
  // Controller buttons are RetroArch's: 0 B, 1 Y, 2 Select, 3 Start, 4-7 up/down/left/right, 8 A, 9 X, 10 L, 11 R
  var SYSTEMS = {
    nes: {
      name: 'NES', core: 'nes', exts: ['nes', 'fds', 'unf', 'unif'], cw: 92, room: ['#2a2830', '#0c0b10'], wood: ['#7d5a3c', '#4b321e'], skin: ['#2c2b2f', '#18171a'],
      keys: 'Arrow keys move · Z is A · X is B · Enter is Start · V is Select'
    },
    snes: {
      name: 'Super Nintendo', core: 'snes', exts: ['sfc', 'smc', 'fig', 'swc', 'bs'], cw: 124, room: ['#2c2838', '#0d0b14'], wood: ['#80603f', '#4d3520'], skin: ['#d6d3db', '#b5b0bd'],
      keys: 'Arrow keys move · Z is A · X is B · A is X · S is Y · Q and E are L and R · Enter is Start · V is Select'
    },
    genesis: {
      name: 'Sega Genesis', core: 'segaMD', exts: ['md', 'gen', 'smd', 'bin'], cw: 100, room: ['#26262c', '#0a0a0d'], wood: ['#6e5038', '#422c1b'], skin: ['#1d1d21', '#0c0c0e'],
      keys: 'Arrow keys move · S is A · X is B · Z is C · Enter is Start'
    },
    atari2600: {
      name: 'Atari 2600', core: 'atari2600', exts: ['a26', 'bin'], cw: 92, room: ['#2b2420', '#0d0a08'], wood: ['#7a5534', '#46301b'], skin: ['#1d1b1a', '#0b0a09'],
      keys: 'Arrow keys move the joystick · X fires · Enter is Game Reset · V is Game Select'
    }
  };
  var SYS = SYSTEMS[SYS_ID], L = ConsoleLib;
  var $ = function (id) { return document.getElementById(id); };
  function el(tag, attrs, kids) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      if (k === 'text') e.textContent = attrs[k]; else if (k === 'html') e.innerHTML = attrs[k];
      else if (k === 'style' && typeof attrs[k] === 'object') for (var s in attrs[k]) e.style.setProperty(s, attrs[k][s]);
      else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), attrs[k]); else if (attrs[k] != null) e.setAttribute(k, attrs[k]);
    }
    (kids || []).forEach(function (c) { if (c) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return e;
  }
  function sndOn() { try { return localStorage.getItem('gn_sound') !== '0'; } catch (e) { return true; } }
  var root = document.documentElement;
  root.style.setProperty('--room-a', SYS.room[0]); root.style.setProperty('--room-b', SYS.room[1]);
  root.style.setProperty('--wood-a', SYS.wood[0]); root.style.setProperty('--wood-b', SYS.wood[1]);
  root.style.setProperty('--skin-a', SYS.skin[0]); root.style.setProperty('--skin-b', SYS.skin[1]);

  // ── Save states (this device) ──
  function statesOf(id) { return L.tx('states', 'readonly', function (s) { return s.index('id').getAll(id); }); }
  function putState(st) { return L.tx('states', 'readwrite', function (s) { s.put(st); }); }
  function getState(id, slot) { return L.tx('states', 'readonly', function (s) { return s.get(id + ':' + slot); }); }

  function sha1(buf) {
    if (window.crypto && crypto.subtle) return crypto.subtle.digest('SHA-1', buf).then(function (h) { return Array.prototype.map.call(new Uint8Array(h), function (b) { return (b + 256).toString(16).slice(1); }).join(''); });
    var a = new Uint8Array(buf), h = 2166136261;   // (no secure context: a plain FNV hash of the bytes)
    for (var i = 0; i < a.length; i++) { h ^= a[i]; h = Math.imul(h, 16777619) >>> 0; }
    return Promise.resolve('f' + h.toString(16) + a.length.toString(16));
  }
  // "Legend of Zelda, The (USA) (Rev 1) [!].nes" -> "The Legend of Zelda"
  function cleanName(file) {
    var n = file.replace(/\.[a-z0-9]{1,5}$/i, '').replace(/[_]+/g, ' ').replace(/\s*[\(\[][^\)\]]*[\)\]]/g, '').replace(/\s{2,}/g, ' ').trim();
    var m = n.match(/^(.*), (The|A|An)( - .*)?$/i); if (m) n = m[2] + ' ' + m[1] + (m[3] || '');
    return n || file;
  }
  function sysOfFile(name, size) {
    var ext = (name.split('.').pop() || '').toLowerCase();
    if (ext === 'bin') return size < 65536 ? 'atari2600' : 'genesis';   // both use .bin: Atari games are tiny (4 to 32 KB)
    for (var k in SYSTEMS) if (SYSTEMS[k].exts.indexOf(ext) >= 0) return k;
    return ext === 'zip' || ext === '7z' ? SYS_ID : null;
  }

  // ═══ Drawings: the consoles and their cartridges (SVG) ════════════════════
  // each unit has a cartridge slot at SLOT (in its own viewBox units) that a cartridge flies into
  var UNITS = {
    nes: { vb: [0, 0, 320, 132], slot: [86, 10, 148, 30], svg:
      '<defs><linearGradient id="u1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d9d6d0"/><stop offset="1" stop-color="#b9b5ae"/></linearGradient>' +
      '<linearGradient id="u2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3b3a3d"/><stop offset="1" stop-color="#222125"/></linearGradient></defs>' +
      '<path d="M8 22 Q8 14 16 14 H304 Q312 14 312 22 V120 Q312 128 304 128 H16 Q8 128 8 120 Z" fill="url(#u1)"/>' +
      '<rect x="8" y="72" width="304" height="56" rx="6" fill="url(#u2)"/>' +
      '<rect x="74" y="20" width="172" height="44" rx="4" fill="#1c1b1e" class="slot"/>' +
      '<rect x="78" y="24" width="164" height="36" rx="3" fill="#cfcbc4" stroke="#a6a29b" stroke-width="2" class="door"/>' +
      '<rect x="86" y="54" width="148" height="3" rx="1.5" fill="#a6a29b"/>' +
      '<g fill="#a6a29b">' + (function () { var s = ''; for (var i = 0; i < 9; i++) s += '<rect x="' + (26 + i * 5) + '" y="24" width="2.5" height="36" rx="1"/>'; return s; })() + '</g>' +
      '<rect x="26" y="88" width="34" height="13" rx="3" fill="#c33"/><rect x="66" y="88" width="34" height="13" rx="3" fill="#c33"/>' +
      '<text x="43" y="116" font-size="8" fill="#c33" text-anchor="middle" font-family="sans-serif" font-weight="700">POWER</text>' +
      '<text x="83" y="116" font-size="8" fill="#c33" text-anchor="middle" font-family="sans-serif" font-weight="700">RESET</text>' +
      '<circle cx="114" cy="94" r="3.4" fill="#4a1414" class="led"/>' +
      '<rect x="212" y="94" width="22" height="16" rx="2" fill="#151417"/><rect x="242" y="94" width="22" height="16" rx="2" fill="#151417"/>' },
    snes: { vb: [0, 0, 320, 150], slot: [102, 8, 116, 26], svg:
      '<defs><linearGradient id="u1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e6e3e9"/><stop offset="1" stop-color="#bdb9c3"/></linearGradient>' +
      '<linearGradient id="u2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d0ccd6"/><stop offset="1" stop-color="#a9a4b0"/></linearGradient></defs>' +
      '<path d="M18 40 Q20 24 40 22 H280 Q300 24 302 40 L312 120 Q314 140 292 142 H28 Q6 140 8 120 Z" fill="url(#u1)"/>' +
      '<path d="M16 96 H304 L310 122 Q312 140 292 140 H28 Q8 140 10 122 Z" fill="url(#u2)"/>' +
      '<path d="M86 22 Q86 4 102 4 H218 Q234 4 234 22 Z" fill="#cfcbd5"/>' +
      '<rect x="102" y="8" width="116" height="26" rx="3" fill="#2a2830" class="slot"/>' +
      '<rect x="60" y="54" width="34" height="14" rx="7" fill="#7a6ca8"/><rect x="226" y="54" width="34" height="14" rx="7" fill="#7a6ca8"/>' +
      '<rect x="64" y="57" width="12" height="8" rx="4" fill="#5d5088"/><rect x="244" y="57" width="12" height="8" rx="4" fill="#5d5088"/>' +
      '<text x="77" y="82" font-size="8" fill="#6b6575" text-anchor="middle" font-family="sans-serif" font-weight="700">POWER</text>' +
      '<text x="243" y="82" font-size="8" fill="#6b6575" text-anchor="middle" font-family="sans-serif" font-weight="700">RESET</text>' +
      '<circle cx="110" cy="61" r="3.2" fill="#4a1414" class="led"/>' +
      '<rect x="120" y="108" width="80" height="14" rx="3" fill="#a59fae"/><circle cx="138" cy="115" r="4" fill="#5d5867"/><circle cx="182" cy="115" r="4" fill="#5d5867"/>' },
    genesis: { vb: [0, 0, 320, 140], slot: [104, 6, 112, 26], svg:
      '<defs><linearGradient id="u1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2e2e33"/><stop offset="1" stop-color="#121214"/></linearGradient>' +
      '<radialGradient id="u2" cx=".5" cy=".4" r=".6"><stop offset="0" stop-color="#3a3a40"/><stop offset="1" stop-color="#18181b"/></radialGradient></defs>' +
      '<path d="M10 54 Q12 30 40 26 H280 Q308 30 310 54 V118 Q310 134 292 134 H28 Q10 134 10 118 Z" fill="url(#u1)"/>' +
      '<path d="M96 26 Q96 2 120 2 H200 Q224 2 224 26 Z" fill="#232327"/>' +
      '<rect x="104" y="6" width="112" height="26" rx="3" fill="#060607" class="slot"/>' +
      '<circle cx="160" cy="80" r="40" fill="url(#u2)" stroke="#404047" stroke-width="2"/>' +
      '<circle cx="160" cy="80" r="30" fill="none" stroke="#c9302c" stroke-width="2"/>' +
      '<text x="160" y="77" font-size="11" fill="#e8e8ee" text-anchor="middle" font-family="sans-serif" font-weight="900" letter-spacing="1">16-BIT</text>' +
      '<text x="160" y="92" font-size="6.5" fill="#9a9aa4" text-anchor="middle" font-family="sans-serif" font-weight="700" letter-spacing="1.2">HIGH DEFINITION</text>' +
      '<rect x="36" y="100" width="40" height="12" rx="3" fill="#3a3a40"/><rect x="244" y="100" width="40" height="12" rx="3" fill="#3a3a40"/>' +
      '<circle cx="90" cy="106" r="3.2" fill="#4a1414" class="led"/>' +
      '<text x="56" y="124" font-size="7" fill="#8a8a94" text-anchor="middle" font-family="sans-serif" font-weight="700">POWER</text>' +
      '<text x="264" y="124" font-size="7" fill="#8a8a94" text-anchor="middle" font-family="sans-serif" font-weight="700">RESET</text>' },
    // the four-switch VCS: ribbed black top, the cartridge slot behind, a woodgrain front with its silver switches
    atari2600: { vb: [0, 0, 320, 136], slot: [116, 8, 88, 22], svg:
      '<defs><linearGradient id="u1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2d2a28"/><stop offset="1" stop-color="#121110"/></linearGradient>' +
      '<linearGradient id="u2" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#6b4424"/><stop offset=".3" stop-color="#8a5c33"/><stop offset=".55" stop-color="#704727"/><stop offset=".8" stop-color="#93653a"/><stop offset="1" stop-color="#6a4323"/></linearGradient>' +
      '<linearGradient id="u3" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e9e6df"/><stop offset="1" stop-color="#8f8b84"/></linearGradient></defs>' +
      '<path d="M22 30 Q24 20 36 20 H284 Q296 20 298 30 L312 92 H8 Z" fill="url(#u1)"/>' +
      (function () { var r = ''; for (var i = 0; i < 7; i++) r += '<path d="M' + (30 + i * 2) + ' ' + (36 + i * 7) + ' H' + (290 - i * 2) + '" stroke="#000" stroke-opacity=".5" stroke-width="2.4"/><path d="M' + (30 + i * 2) + ' ' + (38 + i * 7) + ' H' + (290 - i * 2) + '" stroke="#fff" stroke-opacity=".05" stroke-width="1"/>'; return r; })() +
      '<path d="M104 20 Q104 4 120 4 H200 Q216 4 216 20 Z" fill="#1b1918"/>' +
      '<rect x="116" y="8" width="88" height="22" rx="2" fill="#050505" class="slot"/>' +
      '<path d="M8 92 H312 V122 Q312 132 302 132 H18 Q8 132 8 122 Z" fill="url(#u2)"/>' +
      '<path d="M8 99 Q120 95 312 101 M8 108 Q160 112 312 106 M8 118 Q90 114 312 120 M8 126 Q200 129 312 125" stroke="#3b2412" stroke-opacity=".35" stroke-width="1.2" fill="none"/>' +
      [52, 106, 214, 268].map(function (x, i) { return '<rect x="' + (x - 8) + '" y="98" width="16" height="26" rx="3" fill="#151312"/><rect x="' + (x - 5) + '" y="' + (i % 2 ? 106 : 100) + '" width="10" height="10" rx="2" fill="url(#u3)"/>'; }).join('') +
      '<circle cx="80" cy="112" r="3.2" fill="#4a1414" class="led"/>' +
      '<text x="160" y="116" font-size="10" fill="#e8c890" text-anchor="middle" font-family="sans-serif" font-weight="900" letter-spacing="2">ATARI</text>' }
  };
  // cartridges: shell drawing and where the paper label sits (as fractions of the drawing)
  var CARTS = {
    nes: { vb: [120, 134], lab: [.08, .07, .84, .6], svg: function () {
      var r = ''; for (var i = 0; i < 6; i++) r += '<rect x="14" y="' + (98 + i * 5) + '" width="92" height="2.2" rx="1" fill="#6f6d70"/>';
      return '<path d="M4 4 H116 V122 Q116 130 108 130 H12 Q4 130 4 122 Z" fill="#8f8d90"/><path d="M4 4 H116 V10 H4 Z" fill="#a8a6a9"/>' + r +
        '<rect x="4" y="88" width="112" height="3" fill="#7a787b"/>';
    } },
    snes: { vb: [160, 108], lab: [.17, .2, .66, .56], svg: function () {
      return '<path d="M10 14 Q10 4 22 4 H138 Q150 4 150 14 V100 Q150 104 146 104 H14 Q10 104 10 100 Z" fill="#9c99a1"/>' +
        '<path d="M2 18 Q2 10 10 10 V104 H6 Q2 104 2 100 Z M158 18 Q158 10 150 10 V104 H154 Q158 104 158 100 Z" fill="#87848c"/>' +
        '<rect x="18" y="86" width="124" height="3" rx="1.5" fill="#86838b"/><rect x="18" y="92" width="124" height="3" rx="1.5" fill="#86838b"/>';
    } },
    genesis: { vb: [124, 132], lab: [.1, .08, .8, .58], svg: function () {
      var r = ''; for (var i = 0; i < 5; i++) r += '<rect x="16" y="' + (96 + i * 6) + '" width="92" height="2.6" rx="1.3" fill="#2a2a2e"/>';
      return '<path d="M4 16 Q4 4 18 4 H106 Q120 4 120 16 V124 Q120 128 116 128 H8 Q4 128 4 124 Z" fill="#141416"/>' +
        '<path d="M4 84 H120 V90 H4 Z" fill="#202024"/>' + r;
    } },
    // the black Atari cartridge: a ribbed grip along the top, the big label below it
    atari2600: { vb: [112, 128], lab: [.1, .3, .8, .62], svg: function () {
      var r = ''; for (var i = 0; i < 5; i++) r += '<rect x="10" y="' + (8 + i * 5.4) + '" width="92" height="2.6" rx="1.3" fill="#2c2a29"/>';
      return '<path d="M6 4 H106 Q110 4 110 8 V120 Q110 126 104 126 H8 Q2 126 2 120 V8 Q2 4 6 4 Z" fill="#141312"/>' +
        '<path d="M2 34 H110 V36 H2 Z" fill="#0a0909"/>' + r;
    } }
  };
  var LABELS = [['#f4d94a', '#17130b'], ['#e2403c', '#fff8ec'], ['#1f3f74', '#fff8ec'], ['#2a9d8f', '#fff8ec'], ['#f3efe4', '#1a1a22'],
    ['#ff9b2e', '#1a1208'], ['#6b4b9a', '#fff8ec'], ['#141418', '#ffd23d'], ['#3d8b3d', '#fff8ec'], ['#c2185b', '#fff8ec']];
  function hashOf(s) { var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); }

  function cartW() { return Math.round(SYS.cw * Math.max(1, Math.min(1.45, (Math.min(window.innerWidth, 900) - 40) / 520))); }
  function cartEl(c, opts) {
    opts = opts || {};
    var C = CARTS[SYS_ID], w = cartW(), lb = LABELS[hashOf(c ? c.id + c.name : '+') % LABELS.length];
    var b = el('button', { type: 'button', class: 'cart' + (opts.add ? ' add' : '') + (opts.fresh ? ' new' : '') + (c && !c.local ? ' away' : ''), 'aria-label': c ? c.name : 'Add games',
      style: { '--cw': w + 'px', '--lx': (C.lab[0] * 100) + '%', '--ly': (C.lab[1] * w * C.vb[1] / C.vb[0]) + 'px', '--lw': (C.lab[2] * 100) + '%',
        '--lh': (C.lab[3] * w * C.vb[1] / C.vb[0]) + 'px', '--lab': lb[0], '--lab-ink': lb[1] } });
    b.innerHTML = opts.add
      ? '<svg viewBox="0 0 ' + C.vb[0] + ' ' + C.vb[1] + '"><rect x="4" y="4" width="' + (C.vb[0] - 8) + '" height="' + (C.vb[1] - 8) + '" rx="10" fill="rgba(255,236,210,.05)" stroke="rgba(255,236,210,.45)" stroke-width="2.5" stroke-dasharray="7 6"/></svg>'
      : '<svg viewBox="0 0 ' + C.vb[0] + ' ' + C.vb[1] + '">' + C.svg() + '</svg>';
    if (opts.add) b.appendChild(el('span', { class: 'plus', html: Kit.icon('plus') + '<span>Add games</span>' }));
    else {
      var n = c.name, fs = n.length <= 8 ? 17 : n.length <= 14 ? 15 : n.length <= 24 ? 13 : 11.5;
      // the longest word has to fit across the label on one line
      var longest = n.split(/\s+/).reduce(function (m, x) { return Math.max(m, x.length); }, 1), across = C.lab[2] * 100 - 8;
      fs = Math.min(fs, across / (longest * .56));
      b.style.setProperty('--fs', Math.round(fs * w / 100) + 'px');
      b.appendChild(el('span', { class: 'lab' }, [el('b', { text: n })]));
      if (!c.local) b.appendChild(el('span', { class: 'cloud', html: Kit.icon('cloud') }));
    }
    return b;
  }

  // ═══ The shelf ════════════════════════════════════════════════════════════
  var view = $('cs'), carts = [], unitEl = null;
  function mine() { return carts.filter(function (c) { return c.sys === SYS_ID; }); }
  function drawShelf(freshIds) {
    view.innerHTML = '';
    var sv = el('div', { class: 'shelf-view' });
    var U = UNITS[SYS_ID];
    unitEl = el('div', { class: 'unit', html: '<svg viewBox="' + U.vb.join(' ') + '">' + U.svg + '</svg>' });
    sv.appendChild(el('div', { class: 'stand' }, [unitEl, el('div', { class: 'top wood' }), el('div', { class: 'lip' })]));
    var wrap = el('div', { class: 'shelves' }); sv.appendChild(wrap);
    view.appendChild(sv);
    var all = mine().sort(function (a, b) { return (b.played || b.added || 0) - (a.played || a.added || 0); });
    var items = all.map(function (c) {
      var b = cartEl(c, { fresh: freshIds && freshIds.indexOf(c.id) >= 0 });
      holdable(b, function () { cartMenu(c); }, function () { insert(c, b); });
      return b;
    });
    var add = cartEl(null, { add: true }); add.addEventListener('click', pickFiles); items.push(add);
    // as many cartridges as fit across make one shelf
    var W = Math.min(window.innerWidth, window.innerWidth >= 700 ? 760 : 560) - 44, per = Math.max(2, Math.floor((W + 12) / (cartW() + 12)));
    for (var i = 0; i < items.length; i += per) {
      var p = el('div', { class: 'plank' }); items.slice(i, i + per).forEach(function (x) { p.appendChild(x); }); wrap.appendChild(p);
    }
    if (!all.length) sv.appendChild(el('p', { class: 'empty-note', text: 'Add the ' + SYS.name + ' game files you own.' }));
    sv.appendChild(el('p', { class: 'shelf-note', text: L.signedIn() ? 'Your games are kept in your account, so they’re on every device you sign in on.' : 'Your games stay on this device. Sign in with a PIN to have them on all your devices.' }));
  }
  // tap plays it; press and hold for the cartridge's own menu
  function holdable(b, onHold, onTap) {
    var t = 0, held = false, sx = 0, sy = 0;
    b.addEventListener('pointerdown', function (e) { held = false; sx = e.clientX; sy = e.clientY; clearTimeout(t); t = setTimeout(function () { held = true; Kit.haptic('medium'); onHold(); }, 520); });
    b.addEventListener('pointermove', function (e) { if (Math.abs(e.clientX - sx) + Math.abs(e.clientY - sy) > 12) clearTimeout(t); });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (k) { b.addEventListener(k, function () { clearTimeout(t); }); });
    b.addEventListener('click', function (e) { if (held) { e.preventDefault(); return; } onTap(); });
    b.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  }
  function item(ic, label, sub, fn) {
    return el('button', { type: 'button', onclick: fn }, [el('span', { class: 'ic', html: Kit.icon(ic) }), el('span', { class: 'lbl' }, [el('span', { text: label })].concat(sub ? [el('small', { text: sub })] : []))]);
  }
  function cartMenu(c) {
    var s, home = el('button', { type: 'button', class: 'tg', role: 'switch', 'aria-checked': String(L.shown(c.id)) },
      [el('span', { class: 'ic', html: Kit.icon('home') }), el('span', { class: 'lbl' }, [el('span', { text: 'On the home screen' }), el('small', { text: 'Its own tile in Consoles' })]), el('i', { class: 'sw' })]);
    home.onclick = function () { var on = !L.shown(c.id); L.show(c.id, on); home.setAttribute('aria-checked', String(on)); Kit.haptic('light'); };
    s = Kit.sheet({ title: c.name, node: el('div', { class: 'k-list' }, [
      item('play', 'Play', null, function () { s.close(); insert(c, null); }),
      item('pencil', 'Rename', null, function () { s.close(); renameCart(c); }),
      home,
      item('trash', L.signedIn() ? 'Remove from your games' : 'Remove from this device', c.file + ' · ' + Math.round((c.size || 0) / 1024) + ' KB', function () {
        s.close();
        Kit.confirm('Take ' + c.name + ' off the shelf?', { ok: 'Remove', danger: true, body: (L.signedIn() ? 'Its game file is deleted from your account and this device' : 'Its game file is deleted from this device') + ', along with its save states. Its battery saves stay, in case you add it again.' })
          .then(function (ok) { if (!ok) return; L.drop(c.id).then(function () { carts = carts.filter(function (x) { return x.id !== c.id; }); L.cache(carts); drawShelf(); Kit.toast('Removed'); }); });
      })
    ]) });
  }
  function renameCart(c) {
    var inp = el('input', { type: 'text', value: c.name, maxlength: '48', class: 'k-input', style: { width: '100%' } });
    Kit.sheet({ title: 'Rename', node: inp, actions: [
      { label: 'Save', cls: 'btn-primary', onClick: function () { var v = inp.value.trim(); if (!v) return; c.name = v; L.rename(c).then(function () { L.cache(carts); drawShelf(); }); } },
      { label: 'Cancel', cls: 'btn-soft' }] });
    setTimeout(function () { inp.focus(); inp.select(); }, 120);
  }

  // ── Adding games: the file picker ──
  var picker = el('input', { type: 'file', multiple: '', style: { display: 'none' } });
  document.body.appendChild(picker);
  function pickFiles() { Kit.sfx('tap'); picker.value = ''; picker.click(); }
  picker.addEventListener('change', function () {
    var files = Array.prototype.slice.call(picker.files || []); if (!files.length) return;
    var fresh = [], elsewhere = {}, skipped = [];
    if (L.signedIn()) Kit.toast(files.length === 1 ? 'Adding to your games' : 'Adding ' + files.length + ' games');
    files.reduce(function (p, f) {
      return p.then(function () {
        var sys = sysOfFile(f.name, f.size); if (!sys) { skipped.push(f.name); return; }
        return f.arrayBuffer().then(function (buf) {
          return sha1(buf).then(function (id) {
            var old = carts.filter(function (x) { return x.id === id; })[0];
            var rec = { id: id, sys: sys, name: old ? old.name : cleanName(f.name), file: f.name, size: f.size, added: old ? old.added : Date.now(), played: old ? old.played : 0, data: new Blob([buf]) };
            return L.save(rec).then(function () {
              rec.local = true; carts = carts.filter(function (x) { return x.id !== id; }); carts.push(rec);
              if (sys === SYS_ID) fresh.push(id); else elsewhere[sys] = (elsewhere[sys] || 0) + 1;
            });
          });
        });
      });
    }, Promise.resolve()).then(function () {
      L.cache(carts);
      if (fresh.length) { Kit.sfx('chip'); Kit.haptic('success'); }
      drawShelf(fresh);
      Object.keys(elsewhere).forEach(function (k) { Kit.toast(elsewhere[k] + (elsewhere[k] === 1 ? ' game' : ' games') + ' put on the ' + SYSTEMS[k].name + ' shelf'); });
      if (skipped.length) Kit.toast(skipped.length === 1 ? skipped[0] + ' isn’t a game file this console plays' : skipped.length + ' files aren’t game files this console plays');
    }).catch(function (e) { console.warn(e); Kit.toast('Couldn’t read that file'); });
  });

  // ── Into the console: the cartridge flies to the slot, the light comes on, the game takes over ──
  var busy = false;
  function insert(c, b) {
    if (busy) return; busy = true;
    if (booted) { location.replace(location.pathname + '?play=' + c.id); return; }   // one game per page load
    Kit.haptic('light');
    if (!b) { play(c); return; }
    var from = b.getBoundingClientRect(), slot = unitEl.querySelector('.slot').getBoundingClientRect();
    var fly = b.cloneNode(true); fly.classList.add('flying'); fly.classList.remove('new');
    fly.style.left = from.left + 'px'; fly.style.top = from.top + 'px'; fly.style.width = from.width + 'px';
    document.body.appendChild(fly); b.style.visibility = 'hidden'; unitEl.classList.add('open');
    var sc = Math.min(1, (slot.width * .92) / from.width), tx = slot.left + slot.width / 2 - (from.left + from.width / 2), ty = slot.top - from.top - from.height * sc + slot.height * .9;
    var a = fly.animate([
      { transform: 'translate(0,0) scale(1)', offset: 0 },
      { transform: 'translate(' + tx + 'px,' + (ty - 40) + 'px) scale(' + sc + ')', offset: .7 },
      { transform: 'translate(' + tx + 'px,' + (ty + from.height * sc * .55) + 'px) scale(' + sc + ')', offset: 1 }
    ], { duration: 640, easing: 'cubic-bezier(.4,.1,.3,1)', fill: 'forwards' });
    setTimeout(function () { clunk(); Kit.haptic('medium'); }, 470);
    a.onfinish = function () {
      fly.style.clipPath = 'inset(0 0 100% 0)'; unitEl.classList.add('on'); unitEl.classList.remove('open');
      setTimeout(function () { fly.remove(); play(c); }, 260);
    };
  }
  var actx = null;
  function ac() { if (!actx) try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} return actx; }
  // the cartridge seating: a plastic knock and a spring click
  function clunk() {
    var a = ac(); if (!a || !sndOn()) return; var t = a.currentTime;
    [[0, 900, .18, .05], [.06, 2600, .1, .025]].forEach(function (p) {
      var n = a.createBuffer(1, Math.floor(a.sampleRate * p[3]), a.sampleRate), d = n.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
      var s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain(); s.buffer = n; f.type = 'bandpass'; f.frequency.value = p[1]; f.Q.value = 1.4; g.gain.value = p[2];
      s.connect(f); f.connect(g); g.connect(a.destination); s.start(t + p[0]);
    });
  }

  // ═══ Playing ══════════════════════════════════════════════════════════════
  var cur = null, booted = false, started = false, playEl = null, scrEl = null, glassEl = null, skinEl = null, resumeEl = null;
  function play(c) {
    cur = c;
    Kit.titleSwitch && Kit.titleSwitch(c.name, function () { toShelf(); }, 'Change cartridge');
    view.innerHTML = '';
    playEl = el('div', { class: 'play', 'data-sys': SYS_ID });
    glassEl = el('div', { class: 'glass loading' }, [el('div', { id: 'ejs' }), snowCanvas(), el('div', { class: 'boot' }), el('div', { class: 'tv-msg', id: 'tv-msg' })]);
    scrEl = el('div', { class: 'screen' }, [glassEl]);
    skinEl = buildSkin();
    playEl.appendChild(skinEl); playEl.appendChild(scrEl);
    document.body.appendChild(playEl);
    padMode();
    requestAnimationFrame(function () { playEl.classList.add('on'); });
    // the game file: on this device, or fetched from your account the first time
    if (c.data) return boot(c);
    msg('Reading cartridge', 0);
    L.file(c.id, function (f) { msg('Reading cartridge', f); }).then(function (full) {
      c.data = full.data; c.local = true; boot(c);
    }).catch(function (e) { console.warn(e); msg('Couldn’t get this game. Check your connection.'); });
  }
  // a drawn controller when you're playing by touch; a keyboard or real controller gets the picture alone
  var touchy = matchMedia('(pointer:coarse)').matches || 'ontouchstart' in window, padConnected = false;
  function padMode() {
    var drawn = touchy && !padConnected;
    skinEl.hidden = !drawn; playEl.classList.toggle('nopad', !drawn);
    root.classList.toggle('cs-play', drawn);
    playEl.style.top = drawn ? '0' : (document.querySelector('.gbar') ? document.querySelector('.gbar').getBoundingClientRect().bottom + 'px' : '0');
    layout();
  }
  window.addEventListener('gamepadconnected', function () { padConnected = true; if (playEl) { padMode(); Kit.toast('Controller connected'); } });
  window.addEventListener('gamepaddisconnected', function () { padConnected = false; if (playEl) padMode(); });
  window.addEventListener('touchstart', function () { if (!touchy) { touchy = true; if (playEl) padMode(); } }, { passive: true });
  window.addEventListener('resize', function () { if (playEl) layout(); else if (!cur) drawShelf(); });

  // static on the glass while the game loads
  function snowCanvas() {
    var c = el('canvas', { class: 'snow', width: '160', height: '120' }), x = c.getContext('2d'), img = x.createImageData(160, 120);
    (function tick() {
      if (started) return;
      for (var i = 0; i < img.data.length; i += 4) { var v = Math.random() * 255 | 0; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
      x.putImageData(img, 0, 0); setTimeout(function () { requestAnimationFrame(tick); }, 50);
    })();
    return c;
  }
  function msg(t, frac) {
    var m = $('tv-msg'); if (!m) return;
    m.innerHTML = ''; if (!t) return;
    m.appendChild(document.createTextNode(t));
    if (frac != null) { var b = el('span', { class: 'bar' }, [el('i', { style: { width: Math.round(frac * 100) + '%' } })]); m.appendChild(b); }
  }

  function boot(c) {
    booted = true; msg('Loading');
    c.played = Date.now(); L.tx('carts', 'readwrite', function (s) { if (c.data) s.put(stripLocal(c)); });
    window.EJS_player = '#ejs';
    window.EJS_core = SYS.core;
    window.EJS_gameUrl = new File([c.data], c.file);
    window.EJS_gameName = c.id;
    window.EJS_pathtodata = '../emu/';
    window.EJS_startOnLoaded = true;
    window.EJS_disableAutoLang = false;
    window.EJS_volume = sndOn() ? .5 : 0;
    window.EJS_color = '#ffc83d';
    window.EJS_backgroundColor = '#000';
    window.EJS_Buttons = { playPause: false, restart: false, mute: false, settings: false, fullscreen: false, saveState: false, loadState: false, screenRecord: false,
      gamepad: false, cheat: false, volume: false, saveSavFiles: false, loadSavFiles: false, quickSave: false, quickLoad: false, screenshot: false, cacheManager: false,
      exitEmulation: false, netplay: false, diskButton: false, contextMenu: false, rightClick: false };
    window.EJS_defaultOptions = { 'virtual-gamepad': 'disabled', 'save-state-location': 'browser' };
    // European Genesis carts run at the American 60 frames a second, as the games were meant to feel
    if (SYS_ID === 'genesis') window.EJS_defaultOptions.genesis_plus_gx_region_detect = 'ntsc-u';
    window.EJS_onGameStart = function () {
      started = true; msg('');
      glassEl.classList.remove('loading');
      try { emu().gameManager.setFastForwardRatio(3); } catch (e) {}
      getState(c.id, 'auto').then(function (st) { if (st) offerResume(st); });
    };
    var s = document.createElement('script'); s.src = '../emu/loader.js'; document.body.appendChild(s);
    var poll = setInterval(function () {
      if (started) return clearInterval(poll);
      var t = document.querySelector('#ejs .ejs_loading_text'); if (t && t.textContent) msg(t.textContent.replace(/Download Game Core/, 'Warming up').replace(/Download Game Data/, 'Reading cartridge'));
    }, 200);
  }
  function stripLocal(c) { var o = {}; for (var k in c) if (k !== 'local') o[k] = c[k]; return o; }
  function emu() { return window.EJS_emulator && window.EJS_emulator.gameManager ? window.EJS_emulator : null; }
  function press(i, v) { var e = emu(); if (e && started) try { e.gameManager.simulateInput(0, i, v); } catch (er) {} }
  // a game started straight from the home screen has no tap behind it yet: its sound starts with your first touch
  function wakeAudio() { try { var E = emu(), a = E && E.Module && E.Module.AL && E.Module.AL.currentCtx && E.Module.AL.currentCtx.audioCtx; if (a && a.state === 'suspended') a.resume(); } catch (e) {} }
  document.addEventListener('pointerdown', wakeAudio, true);
  document.addEventListener('keydown', wakeAudio, true);

  // the last picture from when you left, to carry on from
  function offerResume(st) {
    var E = emu(); if (E) E.pause();
    resumeEl = el('div', { class: 'resume' }, [
      st.img ? el('img', { src: st.img, alt: '' }) : null,
      el('div', { class: 'row' }, [
        el('button', { type: 'button', onclick: function () { loadState(st); closeResume(); } }, ['Carry on']),
        el('button', { type: 'button', class: 'alt', onclick: function () { closeResume(); } }, ['Start over'])
      ])
    ]);
    glassEl.appendChild(resumeEl);
  }
  function closeResume() { if (resumeEl) { resumeEl.remove(); resumeEl = null; } var E = emu(); if (E) E.play(); Kit.sfx('tap'); }

  // ── Save states: three slots, plus the automatic one from when you last left ──
  function snap() {
    return new Promise(function (ok) {
      var E = emu(); if (!E) return ok(null);
      try {
        E.gameManager.screenshot().then(function (png) {
          var url = URL.createObjectURL(new Blob([png], { type: 'image/png' })), im = new Image();
          im.onload = function () { var cv = document.createElement('canvas'); cv.width = 160; cv.height = 120; var x = cv.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(im, 0, 0, 160, 120); URL.revokeObjectURL(url); ok(cv.toDataURL('image/jpeg', .8)); };
          im.onerror = function () { ok(null); }; im.src = url;
        }, function () { ok(null); });
      } catch (e) { ok(null); }
    });
  }
  function saveState(slot) {
    var E = emu(); if (!E || !started || !cur) return Promise.resolve(false);
    var data; try { data = E.gameManager.getState(); } catch (e) { return Promise.resolve(false); }
    return snap().then(function (img) { return putState({ key: cur.id + ':' + slot, id: cur.id, slot: slot, at: Date.now(), img: img, data: data }); }).then(function () { return true; });
  }
  function loadState(st) { var E = emu(); if (!E || !st) return; try { E.gameManager.loadState(st.data); } catch (e) { Kit.toast('That save doesn’t fit this game'); } }
  function ago(t) { var m = Math.round((Date.now() - t) / 60000); return m < 1 ? 'just now' : m < 60 ? m + ' min ago' : m < 1440 ? Math.round(m / 60) + ' h ago' : new Date(t).toLocaleDateString(); }
  function slotsSheet(saving) {
    if (!cur || !started) return;
    statesOf(cur.id).then(function (list) {
      var by = {}; list.forEach(function (s) { by[s.slot] = s; });
      var slots = saving ? [1, 2, 3] : ['auto', 1, 2, 3];
      var box = el('div', { class: 'cs-slots' }), s;
      slots.forEach(function (k) {
        var st = by[k];
        if (!saving && !st) return;
        box.appendChild(el('button', { type: 'button', class: 'cs-slot', onclick: function () {
          s.close();
          if (saving) saveState(k).then(function (ok) { Kit.toast(ok ? 'Saved in slot ' + k : 'Couldn’t save here'); if (ok) Kit.haptic('success'); });
          else { loadState(st); Kit.haptic('medium'); }
        } }, [
          st && st.img ? el('img', { src: st.img, alt: '' }) : el('span', { class: 'blank', html: Kit.icon(saving ? 'plus' : 'bookmark') }),
          el('span', { class: 't' }, [el('b', { text: k === 'auto' ? 'When you last left' : 'Slot ' + k }), el('small', { text: st ? ago(st.at) : 'Empty' })])
        ]));
      });
      if (!box.children.length) box.appendChild(el('p', { class: 'muted', text: 'No saved states for this game yet. Save one from the menu.' }));
      s = Kit.sheet({ title: saving ? 'Save state' : 'Load state', node: box });
    });
  }
  function toShelf() {
    var go = function () { location.replace(location.pathname); };
    if (started) saveState('auto').then(go, go); else go();
  }
  // leaving or switching away keeps your place
  document.addEventListener('visibilitychange', function () { if (document.hidden && started) saveState('auto'); });
  window.addEventListener('pagehide', function () { if (started) { try { emu().gameManager.saveSaveFiles(); } catch (e) {} } });
  // the game waits while a menu or sheet is open
  new MutationObserver(function () {
    var E = emu(); if (!E || !started || resumeEl) return;
    var open = !!document.querySelector('.k-scrim');
    if (open && !E.paused) { E.pause(); E._kitPaused = true; } else if (!open && E._kitPaused) { E._kitPaused = false; E.play(); }
  }).observe(document.body, { childList: true });

  // ═══ The controller ═══════════════════════════════════════════════════════
  // Each system's own: the D-pad, its face buttons in their real arrangement, Select/Start (and the SNES shoulders),
  // plus Menu and Fast-forward. Positions: portrait as shares of the controller area below the picture; face
  // buttons as offsets (in controller units, u) from the group's centre. Sideways, the D-pad and face buttons sit
  // either side of the picture.
  var FACE = {
    nes: { at: [.75, .44], size: 76, b: [['B', 0, -42, 14, '#d42a2f'], ['A', 8, 42, -14, '#d42a2f']] },
    snes: { at: [.76, .48], size: 58, b: [['X', 9, 0, -56, '#3a6fd4'], ['Y', 1, -56, 0, '#2ea253'], ['A', 8, 56, 0, '#d93641'], ['B', 0, 0, 56, '#ecbf22']] },
    genesis: { at: [.68, .5], size: 62, b: [['A', 1, -64, 24, '#2c2c31'], ['B', 0, 0, 0, '#2c2c31'], ['C', 8, 64, -24, '#2c2c31']] },
    atari2600: { at: [.74, .46], size: 96, b: [['', 0, 0, 0, '#c9271d']] }
  };
  // drawn behind the controls in portrait, stretched to the controller area (viewBox 400 x 330)
  var DECOR = {
    nes: '<svg viewBox="0 0 400 330" preserveAspectRatio="none"><rect x="118" y="212" width="164" height="96" rx="10" fill="#cfcbc4" opacity=".16"/>' +
      '<rect x="130" y="222" width="140" height="7" rx="3.5" fill="#000" opacity=".35"/><rect x="130" y="236" width="140" height="7" rx="3.5" fill="#000" opacity=".35"/>' +
      '<rect x="130" y="250" width="140" height="7" rx="3.5" fill="#000" opacity=".35"/></svg>',
    snes: '<svg viewBox="0 0 400 330" preserveAspectRatio="none"><circle cx="304" cy="158" r="96" fill="#8f86ad" opacity=".28"/><circle cx="100" cy="152" r="88" fill="#8f86ad" opacity=".14"/></svg>',
    genesis: '<svg viewBox="0 0 400 330" preserveAspectRatio="none"><path d="M190 214 Q300 210 392 110 L392 250 Q300 300 190 300 Z" fill="#fff" opacity=".035"/><circle cx="100" cy="152" r="86" fill="#fff" opacity=".03"/></svg>',
    atari2600: '<svg viewBox="0 0 400 330" preserveAspectRatio="none"><rect x="0" y="252" width="400" height="78" fill="#7a5130" opacity=".22"/>' +
      '<path d="M0 266 Q120 260 400 270 M0 286 Q200 292 400 282 M0 306 Q140 300 400 310" stroke="#2a180b" stroke-opacity=".3" stroke-width="2" fill="none"/></svg>'
  };
  var MID = { nes: [['SELECT', 2], ['START', 3]], snes: [['SELECT', 2], ['START', 3]], genesis: [['START', 3]], atari2600: [['SELECT', 2], ['RESET', 3]] };
  var ctls = [];
  // the Atari joystick: a square black base, its rubber boot and the stick, which leans the way you push
  function svgStick() {
    return '<svg viewBox="0 0 100 100" overflow="visible"><defs><radialGradient id="jk" cx=".38" cy=".32" r=".8"><stop offset="0" stop-color="#5a5654"/><stop offset=".55" stop-color="#1f1d1c"/><stop offset="1" stop-color="#080707"/></radialGradient>' +
      '<radialGradient id="jb" cx=".5" cy=".45" r=".6"><stop offset="0" stop-color="#2a2827"/><stop offset="1" stop-color="#0c0b0b"/></radialGradient></defs>' +
      '<rect x="3" y="5" width="94" height="94" rx="14" fill="#000" opacity=".45"/>' +
      '<rect x="2" y="2" width="96" height="94" rx="14" fill="#1a1918" stroke="#3a3735" stroke-width="1.2"/>' +
      '<rect x="8" y="8" width="84" height="82" rx="10" fill="none" stroke="#000" stroke-opacity=".5" stroke-width="1.5"/>' +
      '<path d="M50 14 l4 6 h-8z M50 84 l4 -6 h-8z M14 49 l6 -4 v8z M86 49 l-6 -4 v8z" fill="#d7a25a" opacity=".55"/>' +
      '<circle cx="50" cy="49" r="24" fill="url(#jb)" stroke="#000" stroke-opacity=".6" stroke-width="1.5"/>' +
      '<g class="stick"><path class="shaft" d="M46 49 L54 49 L54 49 L46 49 Z" fill="#3b3836"/>' +
      '<circle class="knob" cx="50" cy="49" r="15" fill="url(#jk)"/><ellipse class="knob-hi" cx="45" cy="43" rx="6" ry="3.6" fill="#fff" opacity=".18"/></g></svg>';
  }
  function svgDpad() {
    if (SYS_ID === 'atari2600') return svgStick();
    var arm = SYS_ID === 'snes' ? '#3b3a40' : SYS_ID === 'genesis' ? '#34343a' : '#151417', well = SYS_ID === 'snes' ? '#bdb8c6' : SYS_ID === 'genesis' ? '#2a2a2f' : '#cfcbc4';
    return '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="49" fill="' + well + '" opacity="' + (SYS_ID === 'nes' ? .35 : .8) + '"/>' +
      '<circle cx="50" cy="50" r="49" fill="none" stroke="#000" stroke-opacity=".25" stroke-width="1"/>' +
      '<g class="face"><path d="M36 9h28a3 3 0 0 1 3 3v24h24a3 3 0 0 1 3 3v22a3 3 0 0 1-3 3H67v24a3 3 0 0 1-3 3H36a3 3 0 0 1-3-3V64H9a3 3 0 0 1-3-3V39a3 3 0 0 1 3-3h24V12a3 3 0 0 1 3-3z" fill="' + arm + '"/>' +
      '<path class="arm" data-d="u" d="M38 12h24v24H38z" fill="transparent"/><path class="arm" data-d="d" d="M38 64h24v24H38z" fill="transparent"/>' +
      '<path class="arm" data-d="l" d="M9 39h27v22H9z" fill="transparent"/><path class="arm" data-d="r" d="M64 39h27v22H64z" fill="transparent"/>' +
      '<circle cx="50" cy="50" r="8" fill="#000" opacity=".3"/>' +
      '<path d="M50 15l6 8H44zM50 85l6-8H44zM15 50l8-6v12zM85 50l-8-6v12z" fill="#fff" opacity=".25"/>' +
      '<path d="M36 9h28a3 3 0 0 1 3 3v2H33v-2a3 3 0 0 1 3-3z" fill="#fff" opacity=".12"/></g></svg>';
  }
  function svgBtn(label, col) {
    if (SYS_ID === 'atari2600') col = '#c9271d';
    var light = col === '#ecbf22' || col === '#cfcbc4', ink = SYS_ID === 'genesis' ? '#d8d8e0' : light ? '#3a2a00' : '#ffffff';
    var gid = 'sh' + label + SYS_ID;
    return '<svg viewBox="0 0 100 100"><defs><radialGradient id="' + gid + '" cx=".35" cy=".3" r=".75"><stop offset="0" stop-color="#fff" stop-opacity=".45"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".25"/></radialGradient></defs>' +
      '<circle cx="50" cy="54" r="46" fill="#000" opacity=".35"/><g class="face">' +
      '<circle cx="50" cy="50" r="46" fill="' + col + '"/><circle cx="50" cy="50" r="46" fill="url(#' + gid + ')"/>' +
      '<circle cx="50" cy="50" r="45" fill="none" stroke="#000" stroke-opacity=".3" stroke-width="2"/>' +
      '<text x="50" y="62" font-size="36" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="900" fill="' + ink + '" opacity=".9">' + label + '</text></g></svg>';
  }
  function svgPill(label) {
    var dark = SYS_ID !== 'snes', fill = SYS_ID === 'genesis' ? '#3a3a40' : SYS_ID === 'atari2600' ? '#a8a39a' : '#3b3a3f',
      ink = SYS_ID === 'nes' ? '#d0262b' : SYS_ID === 'atari2600' ? '#e1ad66' : dark ? '#9a9aa5' : '#5d5867';
    return '<svg viewBox="0 0 100 56"><g class="face"><rect x="14" y="6" width="72" height="24" rx="12" fill="' + fill + '"/><rect x="18" y="8" width="64" height="7" rx="3.5" fill="#fff" opacity=".12"/></g>' +
      '<text x="50" y="50" font-size="15" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="900" letter-spacing="1" fill="' + ink + '">' + label + '</text></svg>';
  }
  function svgShoulder(label, right) {
    return '<svg viewBox="0 0 120 40"><g class="face"><path d="' + (right ? 'M8 38 Q10 4 52 3 H112 Q118 3 118 10 V38 Z' : 'M112 38 Q110 4 68 3 H8 Q2 3 2 10 V38 Z') + '" fill="#a39eab"/>' +
      '<path d="' + (right ? 'M20 14 Q30 7 52 7 H112' : 'M100 14 Q90 7 68 7 H8') + '" stroke="#fff" stroke-opacity=".35" stroke-width="3" fill="none"/>' +
      '<text x="' + (right ? 66 : 54) + '" y="30" font-size="18" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="900" fill="#5d5867">' + label + '</text></g></svg>';
  }
  function svgTool(kind) {
    var g = kind === 'menu' ? '<g class="glyph" fill="#fff"><circle cx="13" cy="20" r="2.6"/><circle cx="20" cy="20" r="2.6"/><circle cx="27" cy="20" r="2.6"/></g>'
      : '<path class="glyph" d="M10 13l9 7-9 7zM20 13l9 7-9 7z" fill="#fff"/>';
    return '<svg viewBox="0 0 40 40"><g class="face"><circle cx="20" cy="20" r="18" fill="rgba(0,0,0,.35)" stroke="rgba(255,255,255,.28)" stroke-width="1.5"/>' + g + '</g></svg>';
  }
  function buildSkin() {
    var sk = el('div', { class: 'skin' });
    ctls = [];
    // the controller's own body behind the buttons (portrait): NES centre panel, SNES button dish, Genesis crescent
    sk.appendChild(el('div', { class: 'decor', html: DECOR[SYS_ID] }));
    function add(c, html) { c.el = el('div', { class: 'ctl c-' + c.k, html: html }); sk.appendChild(c.el); ctls.push(c); return c; }
    add({ k: 'dp' }, svgDpad());
    var F = FACE[SYS_ID];
    F.b.forEach(function (b) { add({ k: 'btn', i: b[1], dx: b[2], dy: b[3] }, svgBtn(b[0], b[4])); });
    MID[SYS_ID].forEach(function (m, n) { add({ k: 'pill', i: m[1], n: n }, svgPill(m[0])); });
    if (SYS_ID === 'snes') { add({ k: 'sh', i: 10, side: 0 }, svgShoulder('L', false)); add({ k: 'sh', i: 11, side: 1 }, svgShoulder('R', true)); }
    add({ k: 'tool', t: 'menu' }, svgTool('menu'));
    add({ k: 'tool', t: 'ff' }, svgTool('ff'));
    wireSkin(sk);
    return sk;
  }
  // the notch and home-bar insets, in pixels (CSS env() values read through a probe)
  var probe = null;
  function safe() {
    if (!probe) { probe = el('div', { style: { position: 'fixed', left: '0', top: '0', visibility: 'hidden', 'pointer-events': 'none', 'padding-top': 'env(safe-area-inset-top,0px)', 'padding-bottom': 'env(safe-area-inset-bottom,0px)' } }); document.body.appendChild(probe); }
    var c = getComputedStyle(probe); return [parseFloat(c.paddingTop) || 0, parseFloat(c.paddingBottom) || 0];
  }
  // place the picture and every control for this screen shape
  function layout() {
    if (!playEl) return;
    var W = playEl.clientWidth, H = playEl.clientHeight, sf = safe(), sT = sf[0], sB = sf[1];
    var land = W > H * 1.1, drawn = !skinEl.hidden, x, y, w, h;
    playEl.classList.toggle('land', land);
    if (!drawn) {   // the picture alone, as big as it goes
      w = Math.min(W - 24, (H - 24) * 4 / 3); h = w * 3 / 4; x = (W - w) / 2; y = (H - h) / 2;
    } else if (!land) {
      w = Math.min(W - 8, 760, (H - sT) * .5 * 4 / 3); h = w * 3 / 4; x = (W - w) / 2; y = sT + 6;
    } else {
      h = H - sT - sB - 12; w = h * 4 / 3;
      if (W - w < 2 * 150) { w = Math.max(W * .5, W - 2 * 150); h = w * 3 / 4; }
      x = (W - w) / 2; y = sT + (H - sT - sB - h) / 2;
    }
    scrEl.style.left = x + 'px'; scrEl.style.top = y + 'px'; scrEl.style.width = w + 'px'; scrEl.style.height = h + 'px';
    if (!drawn) return;
    var F = FACE[SYS_ID], u, place = function (c, cx, cy, sw, shh) { c.cx = cx; c.cy = cy; c.w = sw; c.h = shh || sw; c.el.style.left = cx + 'px'; c.el.style.top = cy + 'px'; c.el.style.width = c.w + 'px'; c.el.style.height = c.h + 'px'; };
    if (!land) {
      var top = y + h + 8, bh = H - sB - top;
      u = Math.max(.7, Math.min(1.7, W / 370, bh / 320));
      var dec = skinEl.querySelector('.decor'); dec.style.left = '0'; dec.style.top = top + 'px'; dec.style.width = W + 'px'; dec.style.height = bh + 'px'; dec.hidden = false;
      ctls.forEach(function (c) {
        if (c.k === 'dp') place(c, W * .25, top + bh * .44, 150 * u);
        else if (c.k === 'btn') place(c, W * F.at[0] + c.dx * u, top + bh * F.at[1] + c.dy * u, F.size * u);
        else if (c.k === 'pill') { var n = MID[SYS_ID].length; place(c, W * (n === 1 ? .5 : c.n ? .6 : .4), top + bh * .85, 92 * u, 52 * u); }
        else if (c.k === 'sh') place(c, c.side ? W - 70 * u : 70 * u, top + 20 * u, 124 * u, 41 * u);
        else if (c.k === 'tool') place(c, c.t === 'menu' ? 30 * u : W - 30 * u, top + bh - 26 * u, 42 * u);
      });
    } else {
      var side = x, lc = side / 2, rc = x + w + side / 2; skinEl.querySelector('.decor').hidden = true;
      u = Math.max(.6, Math.min(1.3, H / 380));
      ctls.forEach(function (c) {
        if (c.k === 'dp') place(c, Math.max(lc, 80 * u), H * .58, 150 * u);
        else if (c.k === 'btn') place(c, Math.min(rc, W - 80 * u) + c.dx * u * .9, H * .55 + c.dy * u * .9, F.size * u * .95);
        else if (c.k === 'pill') { var n2 = MID[SYS_ID].length; place(c, n2 === 1 || c.n ? Math.min(rc, W - 60 * u) : Math.max(lc, 60 * u), H - sB - 26 * u, 84 * u, 48 * u); }
        else if (c.k === 'sh') place(c, c.side ? Math.min(rc, W - 64 * u) : Math.max(lc, 64 * u), H * .2, 118 * u, 39 * u);
        else if (c.k === 'tool') place(c, c.t === 'menu' ? Math.max(lc, 26 * u) - (SYS_ID === 'snes' ? 0 : 0) : Math.min(rc, W - 26 * u), sT + 24 * u, 38 * u);
      });
    }
  }
  // Fingers press, slide from button to button, and a touch between two face buttons presses both (B+A on a NES)
  function wireSkin(sk) {
    var touches = {}, held = {}, ffOn = false;
    function mark(i, on) {
      ctls.forEach(function (c) { if (c.i === i && c.k !== 'dp') c.el.classList.toggle('on', on); });
      var d = { 4: 'u', 5: 'd', 6: 'l', 7: 'r' }[i];
      if (d && SYS_ID === 'atari2600') lean();
      else if (d) { var dp = ctls[0].el, a = dp.querySelector('.arm[data-d="' + d + '"]'); if (a) a.setAttribute('fill', on ? 'rgba(255,255,255,.28)' : 'transparent'); }
    }
    // the joystick leans toward the held directions, its shaft showing below the knob
    function lean() {
      var x = (held[7] ? 1 : 0) - (held[6] ? 1 : 0), y = (held[5] ? 1 : 0) - (held[4] ? 1 : 0), k = (x && y) ? 10 : 13, st = ctls[0].el;
      var g = st.querySelector('.knob'), h = st.querySelector('.knob-hi'), sh = st.querySelector('.shaft');
      var cx = 50 + x * k, cy = 49 + y * k;
      g.setAttribute('cx', cx); g.setAttribute('cy', cy); h.setAttribute('cx', cx - 5); h.setAttribute('cy', cy - 6);
      var px = -y * 4, py = x * 4;   // the shaft: a band from the boot's centre to the knob
      sh.setAttribute('d', 'M' + (50 + px) + ' ' + (49 + py) + ' L' + (50 - px) + ' ' + (49 - py) + ' L' + (cx - px) + ' ' + (cy - py) + ' L' + (cx + px) + ' ' + (cy + py) + ' Z');
    }
    function setHeld(next) {
      for (var k in held) if (!next[k]) { press(+k, 0); delete held[k]; mark(+k, false); }
      for (var j in next) if (!held[j]) { press(+j, 1); held[j] = 1; mark(+j, true); Kit.haptic('light'); }
    }
    function read(x, y) {
      var out = [], best = null, bd = 1e9;
      ctls.forEach(function (c) {
        var dx = x - c.cx, dy = y - c.cy;
        if (c.k === 'dp') {
          var r = c.w / 2, d2 = dx * dx + dy * dy;
          if (d2 < r * r * 1.7 && d2 > r * r * .02) {   // eight ways: each direction covers 67.5 degrees, so diagonals overlap
            var ang = Math.atan2(dy, dx) * 180 / Math.PI;
            if (ang > -157.5 && ang < -22.5) out.push(4);
            if (ang > 22.5 && ang < 157.5) out.push(5);
            if (ang > 112.5 || ang < -112.5) out.push(6);
            if (ang > -67.5 && ang < 67.5) out.push(7);
          }
        } else if (c.k === 'btn') {
          var rb = c.w / 2, db = Math.sqrt(dx * dx + dy * dy);
          if (db < rb * 1.12) out.push(c.i); else if (db < rb * 1.6 && db < bd) { bd = db; best = c.i; }
        } else if (c.k === 'pill' || c.k === 'sh') {
          if (Math.abs(dx) < c.w * .55 && Math.abs(dy) < c.h * .7) out.push(c.i);
        }
      });
      // between two face buttons: both (B+A on a NES; any neighbouring pair on the others)
      var bs = ctls.filter(function (c) { return c.k === 'btn'; });
      for (var m = 0; m < bs.length; m++) for (var n = m + 1; n < bs.length; n++) {
        var p = bs[m], q = bs[n], gap = Math.hypot(p.cx - q.cx, p.cy - q.cy);
        if (gap < p.w * 1.6 && Math.hypot(x - (p.cx + q.cx) / 2, y - (p.cy + q.cy) / 2) < p.w * .24) { if (out.indexOf(p.i) < 0) out.push(p.i); if (out.indexOf(q.i) < 0) out.push(q.i); }
      }
      if (!out.length && best != null) out.push(best);
      return out;
    }
    function toolAt(x, y) { for (var n = 0; n < ctls.length; n++) { var c = ctls[n]; if (c.k === 'tool' && Math.hypot(x - c.cx, y - c.cy) < c.w * .8) return c; } return null; }
    function update() { var next = {}; for (var id in touches) touches[id].forEach(function (i) { next[i] = 1; }); setHeld(next); }
    sk.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      var t = toolAt(e.clientX, e.clientY);
      if (t) {
        Kit.haptic('light'); t.el.classList.add('on'); setTimeout(function () { t.el.classList.remove('on'); }, 120);
        if (t.t === 'menu') { var b = document.querySelector('.gbar button[aria-label="Menu"]'); if (b) b.click(); }
        else { ffOn = !ffOn; t.el.classList.toggle('lit', ffOn); var E = emu(); if (E) try { E.gameManager.toggleFastForward(ffOn ? 1 : 0); } catch (er) {} }
        return;
      }
      try { sk.setPointerCapture(e.pointerId); } catch (er) {}
      touches[e.pointerId] = read(e.clientX, e.clientY); update();
    });
    sk.addEventListener('pointermove', function (e) { if (!touches[e.pointerId]) return; touches[e.pointerId] = read(e.clientX, e.clientY); update(); });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (k) { sk.addEventListener(k, function (e) { if (!touches[e.pointerId]) return; delete touches[e.pointerId]; update(); }); });
    sk.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  }

  // ═══ Kit shell ════════════════════════════════════════════════════════════
  function controls() {
    Kit.sheet({ title: 'Controls', html:
      '<p>On a phone or iPad the controller is drawn round the picture (turn sideways and it sits either side). Slide a finger from one button to the next, or touch between two face buttons to press both.</p>' +
      '<p>The <b>Menu</b> button on the controller opens this menu; <b>»</b> runs the game at triple speed until you tap it again.</p>' +
      '<p><b>Keyboard:</b> ' + SYS.keys + '.</p>' +
      '<p><b>A real controller</b> (Bluetooth or USB) works too: connect it and press a button. The drawn one steps aside.</p>' });
  }
  var playing = function () { return !!cur; };
  Kit.init({
    id: SYS_ID,
    menu: [
      { icon: 'bookmark', label: 'Save state', sub: 'Keep this exact moment', when: playing, onClick: function () { slotsSheet(true); } },
      { icon: 'history', label: 'Load state', sub: 'Go back to a saved moment', when: playing, onClick: function () { slotsSheet(false); } },
      { icon: 'sync', label: 'Reset', sub: 'Like the console’s Reset button', when: playing, onClick: function () { var E = emu(); if (E) { E.gameManager.restart(); Kit.haptic('medium'); } } },
      { icon: 'swap', label: 'Change cartridge', sub: 'Back to the ' + SYS.name + ' shelf', when: playing, onClick: toShelf },
      { icon: 'gamepad', label: 'Controls', onClick: controls }
    ],
    rules:
      '<p class="goal">Play your own ' + SYS.name + ' games. Add the game files you own and they line up on the shelf as cartridges.</p>' +
      '<h3>Your games</h3><ul><li>Tap the empty cartridge to add game files (you can pick several at once).</li>' +
      '<li>Signed in with a PIN, they’re kept in your account, so every device you sign in on has them (a cloud badge means it comes down the first time you play it there). As a guest they stay on this device.</li>' +
      '<li>Each game gets its own tile in Consoles on the home screen, which starts it straight away. <b>Edit</b> there (or press and hold a cartridge) turns tiles on and off.</li>' +
      '<li>Tap a cartridge to play it. Press and hold one to rename it, hide its tile, or take it off the shelf.</li></ul>' +
      '<h3>Playing</h3><ul><li>Use the controller drawn on the screen, a keyboard (' + SYS.keys + '), or a real Bluetooth or USB controller.</li>' +
      '<li>Games that save on their own (battery saves) keep them on this device.</li>' +
      '<li><b>Save state</b> and <b>Load state</b> in the menu keep and return to an exact moment, three slots per game. When you leave, your place is kept and you can carry on next time.</li></ul>'
  });

  // ═══ Start ════════════════════════════════════════════════════════════════
  root.classList.add('cs-on');
  var want = new URLSearchParams(location.search).get('play');
  function start() {
    L.list().then(function (list) {
      carts = list || [];
      var c = want && carts.filter(function (x) { return x.id === want; })[0];
      if (c) play(c); else drawShelf();
    }).catch(function (e) { console.warn(e); view.innerHTML = ''; view.appendChild(el('p', { class: 'empty-note', text: 'This browser can’t keep game files (private browsing blocks it).' })); });
  }
  // signed in: wait for the account's settings (the library key) before listing
  if (window.FGHSync && FGHSync.isPin && FGHSync.isPin() && FGHSync.onReady) { var go = false; FGHSync.onReady(function () { if (!go) { go = true; start(); } }); setTimeout(function () { if (!go) { go = true; start(); } }, 4000); }
  else start();

  window.__cs = { carts: function () { return carts; }, emu: emu, started: function () { return started; }, press: press, saveState: saveState, getState: getState, ctls: function () { return ctls; } };
})();
