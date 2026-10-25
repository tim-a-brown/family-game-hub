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
// own battery saves (SRAM) are kept by EmulatorJS, per game (EJS_gameName = id). When signed in, both also go to your
// library and come back on your other devices (ConsoleLib stateUp / statesDown / sramUp / sramDown).
// ═══════════════════════════════════════════════════════════════════════════
(function () {
  'use strict';
  var SYS_ID = window.CONSOLE || 'nes';
  // Controller buttons are RetroArch's: 0 B, 1 Y, 2 Select, 3 Start, 4-7 up/down/left/right, 8 A, 9 X, 10 L, 11 R.
  // keys: the keyboard key on each (EmulatorJS's own; the arrow keys are the D-pad)
  var SYSTEMS = {
    nes: {
      name: 'NES', core: 'nes', exts: ['nes', 'fds', 'unf', 'unif'], cw: 92, room: ['#2a2830', '#0c0b10'], wood: ['#7d5a3c', '#4b321e'], skin: ['#2c2b2f', '#18171a'],
      keys: { 8: 'Z', 0: 'X', 3: 'Enter', 2: 'V' }
    },
    snes: {
      name: 'Super Nintendo', core: 'snes', exts: ['sfc', 'smc', 'fig', 'swc', 'bs'], cw: 124, room: ['#2c2838', '#0d0b14'], wood: ['#80603f', '#4d3520'], skin: ['#d6d3db', '#b5b0bd'],
      keys: { 8: 'Z', 0: 'X', 9: 'A', 1: 'S', 10: 'Q', 11: 'E', 3: 'Enter', 2: 'V' }
    },
    genesis: {
      name: 'Sega Genesis', core: 'segaMD', exts: ['md', 'gen', 'smd', 'bin'], cw: 100, room: ['#26262c', '#0a0a0d'], wood: ['#6e5038', '#422c1b'], skin: ['#1d1d21', '#0c0c0e'],
      keys: { 1: 'S', 0: 'X', 8: 'Z', 3: 'Enter' }
    },
    atari2600: {
      name: 'Atari 2600', core: 'atari2600', exts: ['a26', 'bin'], cw: 92, room: ['#2b2420', '#0d0a08'], wood: ['#7a5534', '#46301b'], skin: ['#1d1b1a', '#0b0a09'],
      keys: { 0: 'X', 3: 'Enter', 2: 'V' }
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
  function putState(st) { return L.tx('states', 'readwrite', function (s) { s.put(st); }).then(function (r) { if (L.stateUp) L.stateUp(st); return r; }); }   // (and up to your library: other devices carry on from it)
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
    // the NES Game Pak: label on the right, the ridged grip down the left with the square finger notch at its top,
    // the arrow under the label and the narrower connector tab along the bottom
    nes: { vb: [120, 134], lab: [.27, .05, .69, .535], svg: function () {
      var r = ''; for (var i = 0; i < 18; i++) r += '<rect x="7" y="' + (19 + i * 5.6) + '" width="20" height="2.4" fill="#7a787b"/><rect x="7" y="' + (21.4 + i * 5.6) + '" width="20" height=".8" fill="#b3b1b4"/>';
      return '<path d="M4 4 H116 V124 H110 V130 H10 V124 H4 Z" fill="#8f8d90"/><path d="M4 4 H116 V7 H4 Z" fill="#a8a6a9"/>' +
        '<rect x="7" y="4" width="20" height="13" fill="#6a686b"/><path d="M7 17 H27" stroke="#b9b7ba" stroke-width="1"/>' + r +
        '<path d="M70 112 L76 112 L73 116 Z" fill="#6f6d70"/>';
    } },
    // the US Super Nintendo cartridge: squared, segmented grip blocks down both sides with a screw at the bottom of
    // each, the label up top and the long groove under it
    snes: { vb: [160, 124], lab: [.19, .05, .62, .69], svg: function () {
      var r = '';
      [4, 136].forEach(function (x) {
        for (var i = 0; i < 6; i++) r += '<rect x="' + x + '" y="' + (4 + i * 19.6) + '" width="20" height="18.6" rx="1.5" fill="#a5a2ab"/><rect x="' + x + '" y="' + (4 + i * 19.6) + '" width="20" height="1" fill="#c9c6cf"/>';
        r += '<circle cx="' + (x + 10) + '" cy="111" r="2.4" fill="#d3d0d8"/><circle cx="' + (x + 10) + '" cy="111" r="1.4" fill="#57555c"/>';
      });
      return '<rect x="4" y="4" width="152" height="117" rx="3" fill="#9c99a2"/>' + r +
        '<path d="M24 4 H136 V121 H24 Z" fill="#a9a6af"/><path d="M24 4 H136 V6 H24 Z" fill="#c4c1ca"/>' +
        '<rect x="40" y="103" width="80" height="7" rx="3.5" fill="#86838c"/><path d="M71 103 V110 M89 103 V110" stroke="#76737c" stroke-width="1"/><path d="M42 110.5 H118" stroke="#c4c1ca" stroke-width="1"/>';
    } },
    // the Genesis cartridge: black with thick side rails, the label across nearly the whole front
    genesis: { vb: [124, 116], lab: [.11, .05, .78, .74], svg: function () {
      return '<path d="M4 16 Q4 4 18 4 H106 Q120 4 120 16 V106 Q120 112 114 112 H10 Q4 112 4 106 Z" fill="#161618"/>' +
        '<path d="M4 16 Q4 4 18 4 H24 V112 H10 Q4 112 4 106 Z M120 16 Q120 4 106 4 H100 V112 H114 Q120 112 120 106 Z" fill="#0c0c0d"/>' +
        '<path d="M18 4 H106 V6 H18 Z" fill="#2c2c31"/>';
    } },
    // the Atari cartridge: black, nearly all paper label (logo, red title band, picture, fine print)
    atari2600: { vb: [112, 128], lab: [.07, .05, .86, .84], svg: function () {
      return '<path d="M6 4 H106 Q110 4 110 8 V120 Q110 126 104 126 H8 Q2 126 2 120 V8 Q2 4 6 4 Z" fill="#141312"/><path d="M6 4 H106 V6 H6 Z" fill="#2a2827"/>';
    } }
  };
  var LABELS = [['#f4d94a', '#17130b'], ['#e2403c', '#fff8ec'], ['#1f3f74', '#fff8ec'], ['#2a9d8f', '#fff8ec'], ['#f3efe4', '#1a1a22'],
    ['#ff9b2e', '#1a1208'], ['#6b4b9a', '#fff8ec'], ['#141418', '#ffd23d'], ['#3d8b3d', '#fff8ec'], ['#c2185b', '#fff8ec']];
  function hashOf(s) { var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); }

  function cartW() { return Math.round(SYS.cw * Math.max(1, Math.min(1.45, (Math.min(window.innerWidth, 900) - 40) / 520))); }
  function cartEl(c, opts) {
    opts = opts || {};
    var C = CARTS[SYS_ID], w = cartW(), lb = LABELS[hashOf(c ? c.id + c.name : '+') % LABELS.length];
    var b = el('button', { type: 'button', class: 'cart' + (opts.add ? ' add' : '') + (opts.fresh ? ' new' : '') + (c && !c.local && !c.house ? ' away' : ''), 'aria-label': c ? c.name : 'Add games',
      style: { '--cw': w + 'px', '--lx': (C.lab[0] * 100) + '%', '--ly': (C.lab[1] * w * C.vb[1] / C.vb[0]) + 'px', '--lw': (C.lab[2] * 100) + '%',
        '--lh': (C.lab[3] * w * C.vb[1] / C.vb[0]) + 'px', '--lab': lb[0], '--lab-ink': lb[1] } });
    b.innerHTML = opts.add
      ? '<svg viewBox="0 0 ' + C.vb[0] + ' ' + C.vb[1] + '"><rect x="4" y="4" width="' + (C.vb[0] - 8) + '" height="' + (C.vb[1] - 8) + '" rx="10" fill="rgba(255,236,210,.05)" stroke="rgba(255,236,210,.45)" stroke-width="2.5" stroke-dasharray="7 6"/></svg>'
      : '<svg viewBox="0 0 ' + C.vb[0] + ' ' + C.vb[1] + '">' + C.svg() + '</svg>';
    if (opts.add) b.appendChild(el('span', { class: 'plus', html: Kit.icon('plus') + '<span>Add games</span>' }));
    else {
      b.appendChild(el('span', { class: 'pick', html: Kit.icon('check') }));   // (choosing home tiles: lit when it has one)
      var n = c.name, fs = n.length <= 8 ? 17 : n.length <= 14 ? 15 : n.length <= 24 ? 13 : 11.5;
      // the longest word has to fit across the label on one line
      var longest = n.split(/\s+/).reduce(function (m, x) { return Math.max(m, x.length); }, 1), across = C.lab[2] * 100 - 8;
      fs = Math.min(fs, across / (longest * .56));
      b.style.setProperty('--fs', Math.round(fs * w / 100) + 'px');
      // the label: the game's own art and logo when it has them, else its name on coloured paper
      // (with the console's logo where its cartridges carry it: under the art on NES, SNES and Genesis, at the top of Atari's paper label)
      var top = SYS_ID === 'atari2600';
      b.appendChild(c.art ? el('span', { class: 'lab art sys-' + SYS_ID + ' ' + (top ? 'brand-top' : 'brand-bottom') }, [el('img', { class: 'pic', src: c.art, alt: '', loading: 'lazy', decoding: 'async' }),
        el('span', { class: 'brand' }, [el('img', { src: '../img/consoles/' + SYS_ID + '.svg', alt: '' })]), top ? el('span', { class: 'title' }, [el('span', { text: n })]) : null, el('b', { text: n })]) : el('span', { class: 'lab' }, [el('b', { text: n })]));
      if (!c.local && !c.house) b.appendChild(el('span', { class: 'cloud', html: Kit.icon('cloud') }));
    }
    return b;
  }

  // ═══ The shelf ════════════════════════════════════════════════════════════
  var view = $('cs'), carts = [], unitEl = null;
  // picking: choosing which games have a home screen tile (tap a cartridge to light or dim it); dl: Download all
  // under way ({n done, total, frac of the current one, id}); cartBtns: each game's cartridge on the shelf now
  var picking = false, dl = null, cartBtns = {}, barEl = null, scrollKeep = 0;
  function mine() { return carts.filter(function (c) { return c.sys === SYS_ID; }); }
  function drawShelf(freshIds) {
    var old = view.querySelector('.shelf-view'); scrollKeep = old ? old.scrollTop : 0;
    view.innerHTML = ''; cartBtns = {};
    var sv = el('div', { class: 'shelf-view' + (picking ? ' picking' : '') });
    var U = UNITS[SYS_ID];
    unitEl = el('div', { class: 'unit', html: '<svg viewBox="' + U.vb.join(' ') + '">' + U.svg + '</svg>' });
    sv.appendChild(el('div', { class: 'stand' }, [unitEl, el('div', { class: 'top wood' }), el('div', { class: 'lip' })]));
    var all = mine().sort(function (a, b) { return (b.played || b.added || 0) - (a.played || a.added || 0); });
    barEl = el('div', { class: 'shelf-bar' }); if (all.length) sv.appendChild(barEl);
    var wrap = el('div', { class: 'shelves' }); sv.appendChild(wrap);
    view.appendChild(sv);
    var items = all.map(function (c) {
      var b = cartEl(c, { fresh: freshIds && freshIds.indexOf(c.id) >= 0 });
      cartBtns[c.id] = b; markPick(c);
      if (dl && dl.id === c.id) { b.classList.add('dl'); b.style.setProperty('--dl', dl.frac); }
      holdable(b, function () { if (!picking) cartMenu(c); }, function () { if (picking) togglePick(c); else insert(c, b); });
      return b;
    });
    drawBar();
    var add = cartEl(null, { add: true }); add.addEventListener('click', pickFiles); if (!picking) items.push(add);
    // as many cartridges as fit across make one shelf
    var W = Math.min(window.innerWidth, window.innerWidth >= 700 ? 760 : 560) - 44, per = Math.max(2, Math.floor((W + 12) / (cartW() + 12)));
    for (var i = 0; i < items.length; i += per) {
      var p = el('div', { class: 'plank' }); items.slice(i, i + per).forEach(function (x) { p.appendChild(x); }); wrap.appendChild(p);
    }
    if (!all.length) sv.appendChild(el('p', { class: 'empty-note', text: 'Add the ' + SYS.name + ' game files you own.' }));
    sv.appendChild(el('p', { class: 'shelf-note', text: L.signedIn() ? 'Games you add are kept in your account, so they’re on every device you sign in on.' : 'Games you add stay on this device. Sign in with a PIN for everyone’s games, and to have yours on all your devices.' }));
    sv.scrollTop = scrollKeep;
  }
  // the strip under the console: Home tiles (choose them on the shelf) and Download all; while choosing, the count
  // with All, None and Done
  function mb(b) { return b >= 1e6 ? Math.round(b / 1e6) + ' MB' : Math.max(1, Math.round(b / 1e3)) + ' KB'; }
  function sbBtn(ic, label, cls, fn) { return el('button', { type: 'button', class: 'sb-btn' + (cls ? ' ' + cls : ''), html: (ic ? Kit.icon(ic) : '') + '<span>' + label + '</span>', onclick: fn }); }
  function drawBar() {
    if (!barEl) return;
    var all = mine(); barEl.innerHTML = '';
    if (picking) {
      var on = all.filter(function (c) { return L.shown(c.id); }).length;
      barEl.appendChild(el('span', { class: 'sb-n' }, [el('span', {}, [el('b', { text: String(on) }), ' of ' + all.length]), el('small', { text: 'on the home screen' })]));
      barEl.appendChild(el('span', { class: 'sb-r' }, [
        sbBtn(null, 'All', on === all.length ? 'dim' : '', function () { pickAll(true); }),
        sbBtn(null, 'None', on ? '' : 'dim', function () { pickAll(false); }),
        sbBtn('check', 'Done', 'go', function () { picking = false; Kit.sfx('tap'); drawShelf(); })]));
      return;
    }
    barEl.appendChild(sbBtn('home', 'Home tiles', '', function () { picking = true; Kit.sfx('pop'); Kit.haptic('light'); drawShelf(); }));
    var away = all.filter(function (c) { return !c.local && c.lib; });
    if (dl) {
      var pr = el('span', { class: 'sb-prog' }, [el('i', { style: { width: Math.round((dl.n + dl.frac) / dl.total * 100) + '%' } }),
        el('span', { html: Kit.icon('download') + '<span>' + (dl.n + 1 > dl.total ? dl.total : dl.n + 1) + ' of ' + dl.total + '</span>' })]);
      barEl.appendChild(pr);
    } else if (away.length) {
      barEl.appendChild(sbBtn('download', 'Download all <small>' + away.length + ' · ' + mb(L.toFetch(away)) + '</small>', '', downloadAll));
    } else if (all.some(function (c) { return c.lib; })) {
      barEl.appendChild(el('span', { class: 'sb-done', html: Kit.icon('check') + '<span>All on this device</span>' }));
    }
  }
  function markPick(c) { var b = cartBtns[c.id]; if (b) b.classList.toggle('off', !L.shown(c.id)); }
  function bump(b) { if (!b) return; b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); }
  function togglePick(c) {
    var on = !L.shown(c.id); L.show(c.id, on); markPick(c); bump(cartBtns[c.id]);
    Kit.haptic('light'); Kit.sfx(on ? 'pop' : 'tap'); drawBar();
  }
  function pickAll(on) {
    var all = mine(), ch = all.filter(function (c) { return L.shown(c.id) !== on; });
    if (!ch.length) return;
    L.showMany(ch.map(function (c) { return c.id; }), on);
    ch.forEach(function (c, i) { markPick(c); setTimeout(function () { bump(cartBtns[c.id]); }, Math.min(i, 24) * 22); });
    Kit.haptic('medium'); Kit.sfx(on ? 'pop' : 'tap'); drawBar();
  }
  // every game on this shelf that isn't on this device yet comes down, one after another: each cartridge fills
  // as it arrives and hops onto the shelf when it's in
  function downloadAll() {
    var away = mine().filter(function (c) { return !c.local && c.lib; });
    if (!away.length || dl) return;
    if (navigator.onLine === false) { Kit.toast('Connect to the internet to download them'); return; }
    Kit.sfx('tap'); Kit.haptic('light');
    dl = { n: 0, total: away.length, frac: 0, id: null };
    L.saveAll(away, function (p) {
      if (!dl) return;
      var prev = dl.id && cartBtns[dl.id];
      dl.n = p.n; dl.frac = p.landed ? 0 : p.frac;
      if (p.c && !p.landed) {
        if (prev && dl.id !== p.c.id) prev.classList.remove('dl');
        dl.id = p.c.id; var b = cartBtns[p.c.id]; if (b) { b.classList.add('dl'); b.style.setProperty('--dl', p.frac); }
      }
      if (p.landed) {
        var lb = cartBtns[p.c.id];
        if (lb) { lb.classList.remove('dl', 'away'); var cl = lb.querySelector('.cloud'); if (cl) cl.remove(); lb.classList.remove('landed'); void lb.offsetWidth; lb.classList.add('landed'); }
        Kit.sfx('chip'); dl.id = null;
      }
      var fill = barEl && barEl.querySelector('.sb-prog i'), txt = barEl && barEl.querySelector('.sb-prog span span');
      if (fill) fill.style.width = Math.round((dl.n + dl.frac) / dl.total * 100) + '%'; else drawBar();
      if (txt) txt.textContent = Math.min(dl.n + 1, dl.total) + ' of ' + dl.total;
    }).then(function (failed) {
      var total = dl.total; dl = null; drawShelf();
      if (failed) { Kit.toast(failed + (failed === 1 ? ' game' : ' games') + ' didn’t come down. Try again on a better connection.'); Kit.haptic('error'); }
      else { Kit.haptic('success'); Kit.sfx('good'); Kit.toast(total === 1 ? 'It’s on this device now' : 'All ' + total + ' are on this device now'); }
    });
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
    var cloud = L.signedIn();
    s = Kit.sheet({ title: c.name, node: el('div', { class: 'k-list' }, [
      item('play', 'Play', null, function () { s.close(); insert(c, null); }),
      item('pencil', 'Rename', c.house ? 'For everyone' : null, function () { s.close(); renameCart(c); }),
      home,
      cloud ? item('sparkle', c.art ? 'Find the cartridge art again' : 'Find cartridge art', 'Its logo and box art', function () { s.close(); findArt(c); }) : null,
      cloud ? item('camera', 'Use my own picture', 'A photo of the cartridge or the box', function () { s.close(); askPhoto(function (b) { if (b) L.setLabel(c, b).then(function () { L.cache(carts); drawShelf([c.id]); Kit.toast('Label added'); }, function () { Kit.toast('Couldn’t save the picture'); }); }); }) : null,
      item('trash', c.house ? 'Remove for everyone' : cloud ? 'Remove from your games' : 'Remove from this device', c.file + ' · ' + Math.round((c.size || 0) / 1024) + ' KB', function () {
        s.close();
        Kit.confirm('Take ' + c.name + ' off the shelf' + (c.house ? ' for everyone' : '') + '?', { ok: 'Remove', danger: true, body: (c.house ? 'It’s deleted from the family’s games, so nobody has it any more' : cloud ? 'Its game file is deleted from your account and this device' : 'Its game file is deleted from this device') + ', along with its save states here. Its battery saves stay, in case you add it again.' })
          .then(function (ok) { if (!ok) return; L.drop(c.id, c).then(function () { carts = carts.filter(function (x) { return x.id !== c.id; }); L.cache(carts); drawShelf(); Kit.toast('Removed'); }); });
      })
    ]) });
  }
  function renameCart(c) { askName(c.name, function (v) { c.name = v; L.rename(c).then(function () { L.cache(carts); drawShelf(); }); }); }

  // ── Adding games: the file picker, then a sheet that works each one out ──
  // Every file: unzipped if need be, put on the right console's shelf by its type, identified against the list of
  // every released game, given its label (logo and box art, ConsoleArt). Then Add for everyone (the house: every
  // account signed in has it) or Just for me (your own library).
  var picker = el('input', { type: 'file', multiple: '', style: { display: 'none' } });
  document.body.appendChild(picker);
  function pickFiles() { Kit.sfx('tap'); picker.value = ''; picker.click(); }
  picker.addEventListener('change', function () { var files = Array.prototype.slice.call(picker.files || []); if (files.length) addGames(files); });
  var urls = [];
  function blobUrl(b) { var u = URL.createObjectURL(b); urls.push(u); return u; }
  function addGames(files) {
    var list = el('div', { class: 'k-list ag-list' }), foot = el('div', { class: 'ag-foot' }), items = [], s;
    files.forEach(function (f) { var it = { f: f, state: 'wait', name: cleanName(f.name), row: el('button', { type: 'button', class: 'ag-row' }) }; it.row.onclick = function () { rowMenu(it); }; items.push(it); list.appendChild(it.row); drawRow(it); });
    s = Kit.sheet({ title: files.length === 1 ? 'Adding a game' : 'Adding ' + files.length + ' games', node: el('div', { class: 'ag' }, [list, foot]),
      onClose: function () { urls.forEach(function (u) { URL.revokeObjectURL(u); }); urls = []; } });
    items.reduce(function (p, it) { return p.then(function () { return work(it); }); }, Promise.resolve()).then(function () { drawFoot(); });
    function drawFoot() {
      foot.innerHTML = '';
      var ready = items.filter(function (it) { return it.state === 'ready'; });
      if (!ready.length) { foot.appendChild(el('button', { type: 'button', class: 'btn btn-soft', onclick: function () { s.close(); } }, ['Close'])); return; }
      function go(house) {
        return function () {
          var bs = foot.querySelectorAll('button'); Array.prototype.forEach.call(bs, function (b) { b.disabled = true; });
          var n = 0, fresh = [], elsewhere = {};
          ready.reduce(function (p, it) {
            return p.then(function () {
              n++; bs[0].textContent = 'Adding ' + n + ' of ' + ready.length + '…';
              var rec = { id: it.id, sys: it.sys, name: it.name, file: it.file, size: it.bytes.length, added: Date.now(), played: 0, data: new Blob([it.bytes]) };
              return L.save(rec, { house: house, label: it.label }).then(function () {
                rec.local = true; carts = carts.filter(function (x) { return x.id !== rec.id; }); carts.push(rec);
                if (it.sys === SYS_ID) fresh.push(rec.id); else elsewhere[it.sys] = (elsewhere[it.sys] || 0) + 1;
              });
            });
          }, Promise.resolve()).then(function () {
            s.close(); L.cache(carts); Kit.sfx('chip'); Kit.haptic('success'); drawShelf(fresh);
            Kit.toast(ready.length + (ready.length === 1 ? ' game' : ' games') + (house ? ' added for everyone' : L.signedIn() ? ' added to your games' : ' added to this device'));
            Object.keys(elsewhere).forEach(function (k) { Kit.toast(elsewhere[k] + (elsewhere[k] === 1 ? ' game' : ' games') + ' put on the ' + SYSTEMS[k].name + ' shelf'); });
          }).catch(function (e) { console.warn(e); Kit.toast('Couldn’t add them all. Check your connection and try again.'); Array.prototype.forEach.call(bs, function (b) { b.disabled = false; }); drawFoot(); });
        };
      }
      if (L.signedIn() && L.houseKey()) {
        foot.appendChild(el('button', { type: 'button', class: 'btn btn-primary', onclick: go(true) }, ['Add for everyone']));
        foot.appendChild(el('button', { type: 'button', class: 'btn btn-soft', onclick: go(false) }, ['Just for me']));
      } else foot.appendChild(el('button', { type: 'button', class: 'btn btn-primary', onclick: go(false) }, [L.signedIn() ? 'Add to my games' : 'Add to this device']));
    }
  }
  function drawRow(it) {
    var r = it.row; r.innerHTML = ''; r.className = 'ag-row ' + it.state;
    var thumb = el('span', { class: 'ag-thumb' + (it.sys ? ' sys-' + it.sys : '') });
    if (it.label) thumb.appendChild(el('img', { src: it.labelUrl || (it.labelUrl = blobUrl(it.label)), alt: '' }));
    else if (it.state === 'ready') thumb.appendChild(el('b', { text: it.name }));
    else if (it.state !== 'skip') thumb.appendChild(el('i', { class: 'ag-spin' }));
    var what = { wait: 'Waiting', read: 'Reading the file', find: 'Looking it up', art: 'Finding its cartridge art', skip: '', ready: '' }[it.state];
    var sub = [it.sys ? SYSTEMS[it.sys].name : '', what, it.note].filter(Boolean).join(' · ');
    r.appendChild(thumb); r.appendChild(el('span', { class: 'lbl' }, [el('span', { text: it.name }), el('small', { text: sub })]));
    if (it.state === 'ready') r.appendChild(el('span', { class: 'ag-edit', html: Kit.icon('pencil') }));
  }
  function work(it) {
    it.state = 'read'; drawRow(it);
    return ConsoleArt.unpack(it.f).then(function (u) {
      it.file = u.name; it.bytes = u.bytes; it.sys = sysOfFile(u.name, u.bytes.length);
      if (!it.sys) { it.state = 'skip'; it.note = 'Not a game file these consoles play'; return; }
      return sha1(u.bytes.buffer.slice(u.bytes.byteOffset, u.bytes.byteOffset + u.bytes.byteLength)).then(function (id) {
        it.id = id;
        if (carts.some(function (c) { return c.id === id; })) { it.state = 'skip'; it.note = 'Already on the shelf'; return; }
        it.state = 'find'; drawRow(it);
        return ConsoleArt.identify(it.sys, u.bytes, u.name).then(function (gid) {
          it.gid = gid; it.name = gid ? gid.title : cleanName(u.name);
          if (gid && gid.europe) it.note = 'European version: it may run slower than the American one';
          if (!gid) { it.state = 'ready'; it.note = it.note || 'Not in the game list, so a plain label (tap to add a picture)'; return; }
          it.state = 'art'; drawRow(it);
          return ConsoleArt.art(it.sys, gid).then(function (a) { return ConsoleArt.label(a.box, a.logo); }).then(function (blob) {
            it.label = blob; it.state = 'ready'; if (!blob) it.note = it.note || 'No art found, so a plain label (tap to add a picture)';
          });
        });
      });
    }).catch(function (e) { console.warn(e); it.state = 'skip'; it.note = 'Couldn’t read this file'; }).then(function () { drawRow(it); });
  }
  // a game's own picture: a photo of the cartridge or its box, filling the label
  var photoPick = el('input', { type: 'file', accept: 'image/*', style: { display: 'none' } }), onPhoto = null;
  document.body.appendChild(photoPick);
  photoPick.addEventListener('change', function () { var f = photoPick.files && photoPick.files[0]; if (f && onPhoto) ConsoleArt.ownLabel(f).then(onPhoto); });
  function askPhoto(fn) { onPhoto = fn; photoPick.value = ''; photoPick.click(); }
  function rowMenu(it) {
    if (it.state !== 'ready') return;
    var s = Kit.sheet({ title: it.name, node: el('div', { class: 'k-list' }, [
      item('pencil', 'Rename', null, function () { s.close(); askName(it.name, function (v) { it.name = v; drawRow(it); }); }),
      item('camera', 'Use my own picture', 'A photo of the cartridge or the box', function () { s.close(); askPhoto(function (b) { if (b) { it.label = b; it.labelUrl = null; it.note = ''; drawRow(it); } }); })
    ]) });
  }
  function askName(v0, done) {
    var inp = el('input', { type: 'text', value: v0, maxlength: '48', class: 'k-input', style: { width: '100%' } });
    Kit.sheet({ title: 'Rename', node: inp, actions: [
      { label: 'Save', cls: 'btn-primary', onClick: function () { var v = inp.value.trim(); if (v) done(v); } },
      { label: 'Cancel', cls: 'btn-soft' }] });
    setTimeout(function () { inp.focus(); inp.select(); }, 120);
  }
  // Find cartridge art for a game already on the shelf (one added before, or one with a plain label)
  function findArt(c) {
    Kit.toast('Looking for ' + c.name + '…');
    return L.file(c).then(function (full) {
      var bytes = new Uint8Array(0);
      return full.data.arrayBuffer().then(function (buf) {
        bytes = new Uint8Array(buf);
        return ConsoleArt.identify(c.sys, bytes, c.file || c.name);
      }).then(function (gid) {
        if (!gid) return null;
        return ConsoleArt.art(c.sys, gid).then(function (a) { return ConsoleArt.label(a.box, a.logo); });
      });
    }).then(function (blob) {
      if (!blob) { Kit.toast('No art found for ' + c.name + '. Use my own picture adds one.'); return; }
      return L.setLabel(c, blob).then(function () { L.cache(carts); drawShelf([c.id]); Kit.sfx('chip'); Kit.toast('Label added'); });
    }).catch(function (e) { console.warn(e); Kit.toast('Couldn’t get the art. Check your connection.'); });
  }

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

  // ═══ High scores ══════════════════════════════════════════════════════════
  // Games that keep a score (console-hi.js knows which, and where each keeps it) put a finished game's score on
  // its board on the High Scores page (ArcadeHi, synced as hi_console_<game>). Followed only when playing on this
  // device: online, the game belongs to everyone at the table. A game left mid-way (the page closed) is kept in
  // gn_con_hi_pending and offered for the board the next time a console page opens.
  var hiW = null, hiQ = Promise.resolve(), HI_PEND = 'gn_con_hi_pending';
  function loadScript(src) { return new Promise(function (ok) { var s = document.createElement('script'); s.src = src; s.onload = s.onerror = function () { ok(); }; document.head.appendChild(s); }); }
  var hiReady = (typeof ArcadeHi !== 'undefined' ? Promise.resolve() : loadScript('../arcade-hi.js')).then(function () { return window.ConsoleHi ? null : loadScript('console-hi.js'); });
  function hiOk() { return !!window.ConsoleHi && typeof ArcadeHi !== 'undefined'; }
  function hiStart(c) {
    hiReady.then(function () {
      if (!hiOk() || hiW || c.netGame) return;
      hiW = ConsoleHi.watch({ cart: c, sys: SYS_ID, emu: emu, live: function () { return started && !resumeEl; }, skip: function () { return !!NET.mode || ConsoleNet.on(); },
        onEnd: function (key, score, g) { hiFile(key, score, g.name); },
        onPass: function () { if (!document.querySelector('.ahi-overlay')) { Kit.callout('High score!'); Kit.sfx('sparkle'); Kit.haptic('success'); } } });
    });
  }
  function hiInput() { if (hiW) hiW.input(); }
  window.addEventListener('keydown', hiInput, true);
  // a finished game's score: the moment on the TV (a new record gets confetti), then the initials for the board
  function hiFile(key, score, name, after) {
    try { localStorage.removeItem(HI_PEND); } catch (e) {}
    hiQ = hiQ.then(function () {
      return new Promise(function (done) {
        if (!hiOk() || !ArcadeHi.qualifies(key, score)) { done(); return; }
        var top = ArcadeHi.top(key), first = top == null || score > top;
        hiMoment(score, first ? 'New record' : 'High score', name, function () { ArcadeHi.check(key, score, done); }, first);
      });
    });
    return hiQ.then(function () { if (after) after(); });
  }
  function hiMoment(score, head, name, next, big) {
    Kit.sfx(big ? 'win' : 'good'); Kit.haptic('success'); if (big && Kit.confetti) Kit.confetti();
    var host = glassEl && glassEl.isConnected ? glassEl : null;
    if (!host || matchMedia('(prefers-reduced-motion: reduce)').matches) { if (!host) Kit.callout(head); next(); return; }
    var num = el('b', { class: 'chi-num', text: '0' });
    var box = el('div', { class: 'chi-moment' + (big ? ' big' : ''), role: 'status' }, [el('small', { text: head }), num, el('span', { class: 'chi-game', text: name })]);
    host.appendChild(box);
    var t0 = performance.now(), D = 900;
    (function count(now) {
      var k = Math.min(1, (now - t0) / D), e = 1 - Math.pow(1 - k, 3);
      num.textContent = Math.round(score * e).toLocaleString('en-US');
      if (k < 1) requestAnimationFrame(count); else { box.classList.add('done'); Kit.sfx('chip'); }
    })(t0);
    setTimeout(function () { box.classList.add('out'); setTimeout(function () { box.remove(); next(); }, 260); }, 2100);
  }
  // leaving the game (Change cartridge): its score first
  function hiLeave(go) {
    if (!hiW) { go(); return; }
    var w = hiW; hiW = null;
    E_pause(); w.finish('left'); w.stop();
    hiQ.then(go);
  }
  function E_pause() { var E = emu(); if (E && !E.paused) try { E.pause(); } catch (e) {} }
  // the page hidden (switching apps, locking the phone, closing it): the game so far is kept, in case it never comes back
  document.addEventListener('visibilitychange', function () {
    try {
      var p = hiW && hiW.pending();
      if (document.hidden && p) localStorage.setItem(HI_PEND, JSON.stringify(p)); else if (!document.hidden) localStorage.removeItem(HI_PEND);
    } catch (e) {}
  });
  window.addEventListener('pagehide', function () { try { var p = hiW && hiW.pending(); if (p) localStorage.setItem(HI_PEND, JSON.stringify(p)); } catch (e) {} });
  // a score from a game left mid-way last time
  function hiPending() {
    var p = null; try { p = JSON.parse(localStorage.getItem(HI_PEND) || 'null'); } catch (e) {}
    if (!p || !p.key || !(p.score > 0)) return;
    hiReady.then(function () {
      try { localStorage.removeItem(HI_PEND); } catch (e) {}
      if (!hiOk() || Date.now() - (p.at || 0) > 14 * 864e5 || !ArcadeHi.qualifies(p.key, p.score)) return;
      Kit.toast('Your last game of ' + p.name);
      setTimeout(function () { hiFile(p.key, p.score, p.name); }, 600);
    });
  }

  // ═══ Playing ══════════════════════════════════════════════════════════════
  var cur = null, booted = false, started = false, playEl = null, scrEl = null, glassEl = null, skinEl = null, resumeEl = null;
  function play(c) {
    var nat = window.consoleNative && consoleNative(c);   // (a cartridge with its own native version: games.js CONSOLE_NATIVE)
    if (nat) { location.href = nat + '.html?from=' + SYS_ID; return; }
    cur = c;
    if (Kit.playing) Kit.playing('cart-' + String(c.id).slice(0, 16), c.name);   // play time counts this cartridge
    Kit.titleSwitch && Kit.titleSwitch(c.name, function () { toShelf(); }, 'Change cartridge');
    view.innerHTML = '';
    playEl = el('div', { class: 'play', 'data-sys': SYS_ID });
    glassEl = el('div', { class: 'glass loading' }, [el('div', { id: 'ejs' }), snowCanvas(), el('div', { class: 'boot' }), el('div', { class: 'tv-msg', id: 'tv-msg' })]);
    scrEl = el('div', { class: 'screen' }, [glassEl]);
    skinEl = buildSkin();
    playEl.appendChild(skinEl); playEl.appendChild(scrEl);
    document.body.appendChild(playEl);
    if (window.ResizeObserver) { var lastWH = ''; new ResizeObserver(function () { var wh = playEl.clientWidth + 'x' + playEl.clientHeight; if (wh !== lastWH) { lastWH = wh; layout(); } }).observe(playEl); }
    padMode();
    requestAnimationFrame(function () { playEl.classList.add('on'); });
    // the game file: on this device, or fetched from your account the first time
    if (c.data) return boot(c);
    msg('Reading cartridge', 0);
    L.file(c, function (f) { msg('Reading cartridge', f); }).then(function (full) {
      c.data = full.data; c.local = true; boot(c);
    }).catch(function (e) { console.warn(e); msg('Couldn’t get this game. Check your connection.'); });
  }
  // A drawn controller when you're playing by touch. A real controller on a phone or iPad: the drawn one steps aside
  // and the picture takes the whole screen (the game bar too; Home, or Select and Start together, or a tap on the
  // screen brings up the menu). A computer keeps its game bar and gets the biggest picture under it.
  var touchy = matchMedia('(pointer:coarse)').matches || 'ontouchstart' in window, padConnected = false, peekEl = null, peekT = 0;
  function padMode() {
    var drawn = touchy && !padConnected, full = touchy && padConnected;
    skinEl.hidden = !drawn; playEl.classList.toggle('nopad', !drawn); playEl.classList.toggle('padfull', full);
    root.classList.toggle('cs-play', drawn || full);
    playEl.style.top = drawn || full ? '0' : (document.querySelector('.gbar') ? document.querySelector('.gbar').getBoundingClientRect().bottom + 'px' : '0');
    if (full && !peekEl) {
      peekEl = el('button', { type: 'button', class: 'pad-menu', 'aria-label': 'Menu', html: Kit.icon('more'), onclick: function (e) { e.stopPropagation(); openMenu(); } });
      playEl.appendChild(peekEl);
      playEl.addEventListener('pointerdown', function () { if (playEl.classList.contains('padfull')) peek(); });
    }
    if (full) peek();
    layout();
  }
  // the menu button shows for a few seconds, then gets out of the way
  function peek() {
    if (!peekEl) return;
    [peekEl, seatsEl].forEach(function (x) { if (x) x.classList.add('on'); });
    clearTimeout(peekT); peekT = setTimeout(function () { [peekEl, seatsEl].forEach(function (x) { if (x) x.classList.remove('on'); }); }, 3500);
  }
  function openMenu() { var b = document.querySelector('.gbar button[aria-label="Menu"]'); if (b) b.click(); }
  // controllers take seats as they press their first button (padTick); a disconnected one gives its seat up
  window.addEventListener('gamepaddisconnected', function (e) {
    var gi = e.gamepad ? e.gamepad.index : -1, seat = seats.indexOf(gi);
    if (seat >= 0) { padRelease(seat); seats[seat] = null; }
    var any = Array.prototype.some.call(pads(), function (p) { return p && p.connected !== false && p.index !== gi; });
    padConnected = any;
    // the one controller left plays as player 1 (a one-player game only listens to player 1)
    var moved = false;
    if (seats[0] == null && seats[1] != null) { padRelease(1); seats[0] = seats[1]; seats[1] = null; moved = true; }
    if (playEl) {
      padMode(); showSeats();
      Kit.toast((seat >= 0 ? 'Player ' + (seat + 1) + '’s controller disconnected' : 'Controller disconnected') + (moved ? ' · ' + padName(padAt(seats[0])) + ' is player 1 now' : ''));
    }
  });
  window.addEventListener('touchstart', function () { if (!touchy) { touchy = true; if (playEl) padMode(); } }, { passive: true });
  window.addEventListener('resize', function () { if (playEl) relayout(); else if (!cur) drawShelf(); });
  // Turning the device: iOS can tell the page before its new size has settled (and the notch insets move too), so the
  // game lays itself out again a few times over the next second, and whenever its screen really changes size
  var rlT = [];
  var relWH = '';
  function relayout() {
    if (!playEl) return;
    var wh = innerWidth + 'x' + innerHeight; if (wh !== relWH) { relWH = wh; if (skinRelease) skinRelease(); }   // (turned: let go of what was held)
    layout(); rlT.forEach(clearTimeout); rlT = [60, 200, 450, 900].map(function (ms) { return setTimeout(function () { if (playEl) layout(); }, ms); }); }
  window.addEventListener('orientationchange', relayout);
  if (window.visualViewport) visualViewport.addEventListener('resize', function () { if (playEl) relayout(); });

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
    c.played = Date.now(); L.tx('carts', 'readwrite', function (s) { if (c.data) s.put(L.strip(c)); });
    window.EJS_player = '#ejs';
    window.EJS_core = SYS.core;
    window.EJS_gameUrl = new File([c.data], c.file);
    window.EJS_gameName = c.net || NET.mode === 'guest' ? 'net-' + c.id : c.id;   // a joiner's own battery saves stay out of the host's game
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
    window.EJS_onGameStart = function () {
      started = true; msg('');
      glassEl.classList.remove('loading');
      try { emu().gameManager.setFastForwardRatio(3); } catch (e) {}
      ConsoleNet.install(emu());
      if (!NET.mode) quietStart();
      if (NET.mode === 'guest') { if (NET.peer) NET.peer.send({ t: 'ready' }, true); return; }
      hiStart(c);
      if (NET.pick) { var nm = NET.pick; NET.pick = null; root.classList.remove('net-pick'); netHost(nm); return; }
      getState(c.id, 'auto').then(function (st) { if (st) offerResume(st); });
    };
    // (the multitap goes in before the console is switched on, as on the real thing: see tapOf)
    // saves from your other devices first: the newest save states, and the game's own battery save, which goes in
    // place before the game is switched on (it reads it as it starts)
    var name = window.EJS_gameName, sram = null;
    var fresh = L.statesDown && L.signedIn() && !c.net && NET.mode !== 'guest'
      ? L.within((window.FGHSync && FGHSync.stSynced ? FGHSync.stSynced() : Promise.resolve()).then(function () {
          return Promise.all([L.statesDown(c.id), L.sramDown(name).then(function (x) { sram = x; })]);
        }), 8000).catch(function () {})
      : Promise.resolve();
    window.EJS_ready = function () {
      window.EJS_emulator.on('saveDatabaseLoaded', function (FS) {
        if (TAP_ON) tapIn(FS);
        // no "Fast-Forward" caption on the picture (the button lights up instead, and a game starting before your
        // first touch runs that way at normal speed)
        try { var cfgP = '/home/web_user/.config/retroarch/retroarch.cfg'; FS.writeFile(cfgP, FS.readFile(cfgP, { encoding: 'utf8' }) + 'notification_show_fast_forward = "false"\n'); } catch (e) {}
        if (sram) { try { var dir = sram.path.split('/').slice(0, -1).join('/'), p = ''; dir.split('/').slice(1).forEach(function (part) { p += '/' + part; try { FS.mkdir(p); } catch (e) {} }); FS.writeFile(sram.path, sram.data); sram.done(); } catch (e) { console.warn('[console] battery save not put in place', e); } }
      });
      // the game's own battery save, each time it's written out (sent only when it changed)
      window.EJS_emulator.on('saveSaveFiles', function (data) { if (!c.net && NET.mode !== 'guest' && data && L.sramUp) try { L.sramUp(name, emu().gameManager.getSaveFilePath(), data); } catch (e) {} });
    };
    Promise.all([tapOf(c), fresh]).then(function (r) {
      TAP_ON = r[0];
      var s = document.createElement('script'); s.src = '../emu/loader.js'; document.body.appendChild(s);
    });
    var poll = setInterval(function () {
      if (started) return clearInterval(poll);
      var t = document.querySelector('#ejs .ejs_loading_text'); if (t && t.textContent) msg(t.textContent.replace(/Download Game Core/, 'Warming up').replace(/Download Game Data/, 'Reading cartridge'));
    }, 200);
  }
  // ── Four players: a multitap in port 2, the way the real consoles did it ──
  // SNES: Nintendo's Super Multitap (snes9x device 257), for games made for it (MULTITAP below, by name: the
  // cartridge doesn't say). Games that don't use it would read player 2 through it unchanged, but snes9x with a
  // multitap now and then runs a frame slightly differently on two devices (checked: same buttons every frame),
  // which online play has to repair with a resync, so other games keep plain pads, exactly as before.
  // Genesis: Sega's Team Player (Genesis Plus GX device 1537), for cartridges whose header lists it (I/O support
  // '4'): it would get in the way of player 2 in other games. NES and Atari 2600: two players.
  // RetroArch takes a port's device from the core's remap file, written before the console starts.
  var TAPS = { snes: { lib: 'Snes9x', dev: 257 }, genesis: { lib: 'Genesis Plus GX', dev: 1537 } }, TAP_ON = false;
  var MULTITAP = /bomberman|nba jam|nba hang ?time|nba give|nba live|college slam|barkley|rap jam|madden|\bnhl|fifa|secret of mana|seiken densetsu|trials of mana|micro machines|slam masters|wwf raw|top gear 3000|street racer|smash tennis|olympic summer|final four|quarterback club|unnecessary roughness|j\.? ?league|hebereke|bruce lee|power baseball|wacky sports|yu ?yu hakusho|kunio|\bpieces\b/i;
  function tapOf(c) {
    var T = TAPS[SYS_ID]; if (!T) return Promise.resolve(false);
    if (NET.mode === 'guest' && NET.cart && NET.cart.tap != null) return Promise.resolve(!!NET.cart.tap);   // joining: the same console as the host's
    try { var tt = sessionStorage.getItem('cs_tap'); if (tt) return Promise.resolve(tt === '1'); } catch (e) {}   // (tests: '1' plugs it in for any game, '0' leaves it out)
    if (SYS_ID === 'snes') return Promise.resolve(MULTITAP.test((c.name || '') + ' ' + (c.file || '')));
    return c.data.slice(0, 0x4200).arrayBuffer().then(function (b) {
      var a = new Uint8Array(b);
      if (c.data.size % 16384 === 512 && a[8] === 0xaa && a[9] === 0xbb) {   // .smd: 512-byte header, then 16 KB blocks with odd and even bytes apart
        var d = new Uint8Array(16384); for (var i = 0; i < 8192; i++) { d[2 * i + 1] = a[512 + i]; d[2 * i] = a[512 + 8192 + i]; }
        a = d;
      }
      return String.fromCharCode.apply(null, a.subarray(0x190, 0x1a0)).indexOf('4') >= 0;
    }).catch(function () { return false; });
  }
  function tapIn(FS) {
    var T = TAPS[SYS_ID], dir = '/home/web_user/retroarch/userdata/config/remaps/' + T.lib, p = '';
    dir.split('/').slice(1).forEach(function (part) { p += '/' + part; try { FS.mkdir(p); } catch (e) {} });
    try { FS.writeFile(dir + '/' + T.lib + '.rmp', 'input_libretro_device_p2 = "' + T.dev + '"\n'); } catch (e) { console.warn('[console] multitap', e); }
  }
  function seatsMax() { return TAP_ON ? 4 : 2; }
  // A SNES state saved without the multitap (before it was plugged in) points all its pads at player 1 when loaded
  // with it: its controller block (CTL, version 4: the multitap's first two pads at 84 and 85) says pads 1 and 2 again.
  function fixState(data) {
    if (SYS_ID !== 'snes' || !TAP_ON || !data) return data;
    for (var i = data.length - 11; i > 0; i--) {
      if (data[i] !== 67 || data[i + 1] !== 84 || data[i + 2] !== 76 || data[i + 3] !== 58) continue;   // 'CTL:'
      if (String.fromCharCode.apply(null, data.subarray(i + 4, i + 11)) !== '000091:' || data[i + 11] !== 4) return data;
      var o = i + 11;
      if (data[o + 84] || data[o + 85]) return data;
      var out = new Uint8Array(data); out[o + 84] = 1; out[o + 85] = 2;
      return out;
    }
    return data;
  }
  function emu() { return window.EJS_emulator && window.EJS_emulator.gameManager ? window.EJS_emulator : null; }
  function press(i, v, player) { var e = emu(); if (e && started) try { e.gameManager.simulateInput(player || 0, i, v); } catch (er) {} if (v) hiInput(); }
  // a game started straight from the home screen has no tap behind it yet: its sound starts with your first touch
  function actxOf() { try { var E = emu(); return E && E.Module && E.Module.AL && E.Module.AL.currentCtx && E.Module.AL.currentCtx.audioCtx; } catch (e) { return null; } }
  // ...and the console waits on its sound before drawing the next frame, so until then it runs on the clock instead
  // (fast-forward at 1x doesn't wait on sound): the title screen plays straight away, in silence, until you touch
  var quiet = false;
  function quietStart() {
    var a = actxOf(), E = emu(); if (!a || a.state !== 'suspended' || !E) return;
    quiet = true;
    try { E.gameManager.setFastForwardRatio(1); E.gameManager.toggleFastForward(1); } catch (e) {}
  }
  function quietEnd() {
    if (!quiet) return; quiet = false;
    var E = emu(); if (E) try { E.gameManager.setFastForwardRatio(3); E.gameManager.toggleFastForward(ffOn ? 1 : 0); } catch (e) {}
  }
  function wakeAudio() {
    var a = actxOf(); if (!a) return;
    if (a.state === 'suspended') { var r = a.resume(); if (r && r.then) r.then(function () { if (a.state === 'running') quietEnd(); }); }
    else quietEnd();
  }
  document.addEventListener('pointerdown', wakeAudio, true);
  document.addEventListener('keydown', wakeAudio, true);
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
    if (slot === 'auto') keepPlaying();
    return snap().then(function (img) { return putState({ key: cur.id + ':' + slot, id: cur.id, slot: slot, at: Date.now(), img: img, data: data }); }).then(function () { return true; });
  }
  // the cartridge in Keep playing on the home screen (your place, kept as you leave: the 'auto' save), opening straight
  // into it; deleting it there drops that save too
  function keepPlaying() {
    if (!cur || cur.netGame || NET.mode === 'guest') return;
    Kit.resume.set('Paused', { id: 'cart-' + String(cur.id).slice(0, 16), file: SYS_ID + '.html?play=' + cur.id });
  }
  function loadState(st) {
    var E = emu(); if (!E || !st) return;
    var data = fixState(st.data);
    if (ConsoleNet.on()) { ConsoleNet.load(data); return; }   // online: on every device
    if (hiW) hiW.finish('load');   // (the game so far is done; the saved moment starts another)
    try { E.gameManager.loadState(data); } catch (e) { Kit.toast('That save doesn’t fit this game'); }
  }
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
    if (Kit.playing) Kit.playing(null);   // (the shelf isn't a game)
    var go = function () { location.replace(location.pathname); };
    netQuit();
    hiLeave(function () { if (started && !cur.netGame) saveState('auto').then(go, go); else go(); });
  }
  // leaving or switching away keeps your place. The bar's back button pauses the game and waits for its place to be
  // kept before going home (the page hidden alone may close before the save is written)
  var homeBound = false;
  Kit.onBack = function () {
    if (homeBound || !started || !cur || cur.netGame) return false;
    homeBound = true; E_pause();
    var gone = false, go = function () { if (!gone) { gone = true; Kit.home(); } };
    hiLeave(function () { saveState('auto').then(go, go); });
    setTimeout(go, 2500);   // (never stuck on a slow save)
    return true;
  };
  document.addEventListener('visibilitychange', function () { if (document.hidden && started && !cur.netGame) { saveState('auto'); try { emu().gameManager.saveSaveFiles(); } catch (e) {} } });   // (a joiner's game is the host's)
  // while you play: your place and the game's own save every few minutes, so another device can carry on even if this
  // one is closed without a goodbye
  setInterval(function () { if (started && cur && !cur.netGame && !document.hidden && !resumeEl) { saveState('auto'); try { emu().gameManager.saveSaveFiles(); } catch (e) {} } }, 180000);
  if (L.statesPending) setTimeout(function () { if (L.signedIn()) L.statesPending(); }, 4000);   // saves from last time that didn't get sent
  window.addEventListener('pagehide', function () { if (started) { try { emu().gameManager.saveSaveFiles(); } catch (e) {} } });
  // the game waits while a menu or sheet is open
  new MutationObserver(function () {
    var E = emu(); if (!E || !started || resumeEl) return;
    var open = !!document.querySelector('.k-scrim, .ahi-overlay');
    if (ConsoleNet.on()) { ConsoleNet.pause(open); return; }   // online: held a frame at a time, both devices together
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
  // the controller's own body, drawn behind the controls when upright and placed round them: P = {W, H, u, dp: [x, y],
  // face: [x, y], pillY} in pixels
  var DECOR = {
    nes: function (P) {   // the grey centre panel with its dark stripes, above Select and Start
      var u = P.u, x = P.W / 2 - 84 * u, y = P.pillY - 70 * u, r = '';
      for (var i = 0; i < 3; i++) r += '<rect x="' + (x + 12 * u) + '" y="' + (y + (10 + i * 14) * u) + '" width="' + (144 * u) + '" height="' + (7 * u) + '" rx="' + (3.5 * u) + '" fill="#000" opacity=".35"/>';
      return '<rect x="' + x + '" y="' + y + '" width="' + (168 * u) + '" height="' + (98 * u) + '" rx="' + (10 * u) + '" fill="#cfcbc4" opacity=".16"/>' + r;
    },
    snes: function (P) {   // the lilac dish under the four face buttons, a fainter one under the D-pad
      return '<circle cx="' + P.face[0] + '" cy="' + P.face[1] + '" r="' + (98 * P.u) + '" fill="#8f86ad" opacity=".28"/><circle cx="' + P.dp[0] + '" cy="' + P.dp[1] + '" r="' + (90 * P.u) + '" fill="#8f86ad" opacity=".14"/>';
    },
    genesis: function (P) {   // the sweep the three buttons rise along, and the D-pad's round boss
      var u = P.u, fx = P.face[0], fy = P.face[1];
      return '<path d="M' + (fx - 150 * u) + ' ' + (fy + 48 * u) + ' Q' + (fx + 30 * u) + ' ' + (fy + 44 * u) + ' ' + P.W + ' ' + (fy - 96 * u) + ' L' + P.W + ' ' + (fy + 70 * u) +
        ' Q' + (fx + 30 * u) + ' ' + (fy + 118 * u) + ' ' + (fx - 150 * u) + ' ' + (fy + 118 * u) + ' Z" fill="#fff" opacity=".035"/><circle cx="' + P.dp[0] + '" cy="' + P.dp[1] + '" r="' + (88 * u) + '" fill="#fff" opacity=".03"/>';
    },
    atari2600: function (P) {   // the console's woodgrain front along the bottom, behind its switches
      var u = P.u, y = P.pillY - 36 * u, g = '';
      for (var i = 0; i < 3; i++) { var gy = y + (14 + i * 20) * u; g += '<path d="M0 ' + gy + ' Q' + (P.W * .3) + ' ' + (gy - 6 * u * (i % 2 ? -1 : 1)) + ' ' + P.W + ' ' + (gy + 4 * u) + '" stroke="#2a180b" stroke-opacity=".3" stroke-width="' + (2 * u) + '" fill="none"/>'; }
      return '<rect x="0" y="' + y + '" width="' + P.W + '" height="' + (P.H - y) + '" fill="#7a5130" opacity=".22"/>' + g;
    }
  };
  var MID = { nes: [['SELECT', 2], ['START', 3]], snes: [['SELECT', 2], ['START', 3]], genesis: [['START', 3]], atari2600: [['SELECT', 2], ['RESET', 3]] };
  var ctls = [], ffOn = false, skinRelease = null;
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
    sk.appendChild(el('div', { class: 'decor' }));
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
  // the notch, rounded-corner and home-bar insets, in pixels (CSS env() values read through a probe): [top, right, bottom, left]
  var probe = null;
  function safe() {
    if (!probe) { probe = el('div', { style: { position: 'fixed', left: '0', top: '0', visibility: 'hidden', 'pointer-events': 'none', 'padding-top': 'env(safe-area-inset-top,0px)',
      'padding-right': 'env(safe-area-inset-right,0px)', 'padding-bottom': 'env(safe-area-inset-bottom,0px)', 'padding-left': 'env(safe-area-inset-left,0px)' } }); document.body.appendChild(probe); }
    var c = getComputedStyle(probe); return [parseFloat(c.paddingTop) || 0, parseFloat(c.paddingRight) || 0, parseFloat(c.paddingBottom) || 0, parseFloat(c.paddingLeft) || 0];
  }
  // Place the picture and every control for this screen. One arrangement for every console, every screen:
  // D-pad (or joystick) under the left thumb, the face buttons in the console's own pattern under the right thumb,
  // Select/Start along the bottom, the SNES shoulders just above the thumbs, Menu and Fast-forward in the corners.
  // Controls are sized in units (u) of about a phone's worth and anchored to the edges, so on an iPad they stay
  // where the thumbs are instead of spreading to the middle; the picture gets every bit of room that leaves.
  // Upright, the controller sits along the bottom and the picture fills the width above it. Sideways, the picture
  // fills the height between the two thumb areas; on a small phone it would get too narrow, so it grows into them
  // and the controls sit see-through over its edges (like Delta).
  function faceHalf(F) { var m = 0; F.b.forEach(function (b) { m = Math.max(m, Math.abs(b[2])); }); return m + F.size / 2; }
  function layout() {
    if (!playEl) return;
    var W = playEl.clientWidth, H = playEl.clientHeight, sf = safe(), sT = sf[0], sR = sf[1], sB = sf[2], sL = sf[3];
    var land = W > H * 1.1, drawn = !skinEl.hidden, x, y, w, h, u;
    var F = FACE[SYS_ID], half = faceHalf(F), sh = SYS_ID === 'snes';
    playEl.classList.toggle('land', land);
    var place = function (c, cx, cy, sw, shh) { c.cx = cx; c.cy = cy; c.w = sw; c.h = shh || sw; c.el.style.left = cx + 'px'; c.el.style.top = cy + 'px'; c.el.style.width = c.w + 'px'; c.el.style.height = c.h + 'px'; };
    var dec = skinEl.querySelector('.decor');
    if (!drawn && playEl.classList.contains('padfull')) {   // a controller on a phone or iPad: the whole screen, inside the notch
      w = Math.min(W - sL - sR, (H - sT - sB) * 4 / 3); h = w * 3 / 4; x = sL + (W - sL - sR - w) / 2; y = sT + (H - sT - sB - h) / 2;
    } else if (!drawn) {   // a keyboard or controller on a computer: the picture alone, as big as it goes under the bar
      w = Math.min(W - 24, (H - 24) * 4 / 3); h = w * 3 / 4; x = (W - w) / 2; y = (H - h) / 2;
    } else if (!land) {
      // the controller: thumbs, Select/Start and the corner buttons need about 330 units of height (SNES shoulders 50 more)
      u = Math.max(.72, Math.min(1.25, (W - sL - sR) / 370));
      var need = (330 + (sh ? 50 : 0)) * u;
      w = Math.min(W - 8 - sL - sR, (H - sT - sB - need - 8) * 4 / 3); h = w * 3 / 4;
      if (h < 140) { h = 140; w = h * 4 / 3; u = Math.max(.6, Math.min(u, (H - sT - sB - h - 8) / (330 + (sh ? 50 : 0)))); }
      x = (W - w) / 2; y = sT + 6;
    } else {
      u = Math.max(.62, Math.min(1.1, H / 400));
      var side = Math.max(150 * u, 2 * half * u) + 26 * u;   // what one thumb area needs across
      var small = H < 520, minSide = side * (small ? .62 : .72);
      h = H - sT - sB - 8; w = h * 4 / 3;
      if ((W - sL - sR - w) / 2 < minSide) { w = W - sL - sR - 2 * minSide; h = w * 3 / 4; }
      x = sL + (W - sL - sR - w) / 2; y = sT + (H - sT - sB - h) / 2;
    }
    scrEl.style.left = x + 'px'; scrEl.style.top = y + 'px'; scrEl.style.width = w + 'px'; scrEl.style.height = h + 'px';
    if (!drawn) return;
    var L0 = sL + 14 * u, R0 = W - sR - 14 * u;   // the usable edges
    if (!land) {
      var top = y + h + 6;
      var toolY = H - sB - 26 * u, pillY = H - sB - 74 * u, thumbY = pillY - 128 * u;
      thumbY = Math.max(thumbY, top + (sh ? 132 : 82) * u);   // never up under the picture
      ctls.forEach(function (c) {
        if (c.k === 'dp') place(c, L0 + 75 * u, thumbY, 150 * u);
        else if (c.k === 'btn') place(c, R0 - half * u + c.dx * u, thumbY + c.dy * u, F.size * u);
        else if (c.k === 'pill') { var n = MID[SYS_ID].length; place(c, W / 2 + (n === 1 ? 0 : (c.n ? 46 : -46) * u), pillY, 92 * u, 52 * u); }
        else if (c.k === 'sh') place(c, c.side ? R0 - 56 * u : L0 + 56 * u, thumbY - 118 * u, 124 * u, 41 * u);
        else if (c.k === 'tool') place(c, c.t === 'menu' ? L0 + 14 * u : R0 - 14 * u, toolY, 42 * u);
      });
      dec.style.left = '0'; dec.style.top = '0'; dec.style.width = W + 'px'; dec.style.height = H + 'px'; dec.hidden = false;
      dec.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '">' + DECOR[SYS_ID]({ W: W, H: H, u: u, dp: [L0 + 75 * u, thumbY], face: [R0 - half * u, thumbY], pillY: pillY }) + '</svg>';
    } else {
      dec.hidden = true;
      var midY = sT + (H - sT - sB) * .6;
      ctls.forEach(function (c) {
        if (c.k === 'dp') place(c, L0 + 75 * u, midY, 150 * u);
        else if (c.k === 'btn') place(c, R0 - half * u + c.dx * u, midY + c.dy * u, F.size * u);
        else if (c.k === 'pill') { var n2 = MID[SYS_ID].length; place(c, n2 === 1 || c.n ? R0 - 30 * u : L0 + 30 * u, H - sB - 24 * u, 80 * u, 46 * u); }
        else if (c.k === 'sh') place(c, c.side ? R0 - 58 * u : L0 + 58 * u, midY - 120 * u, 116 * u, 39 * u);
        else if (c.k === 'tool') place(c, c.t === 'menu' ? L0 + 6 * u : R0 - 6 * u, sT + 24 * u, 38 * u);
      });
    }
    // a control over the picture goes see-through, so the game shows through it
    // (when a good part of it covers the picture: a sliver over the edge stays solid)
    ctls.forEach(function (c) {
      var ox = Math.min(c.cx + c.w / 2, x + w) - Math.max(c.cx - c.w / 2, x), oy = Math.min(c.cy + c.h / 2, y + h) - Math.max(c.cy - c.h / 2, y);
      c.el.classList.toggle('over', ox > c.w * .22 && oy > 0);
    });
  }
  // Fingers press, slide from button to button, and a touch between two face buttons presses both (B+A on a NES)
  function wireSkin(sk) {
    var touches = {}, held = {};
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
    // the D-pad: eight ways, each direction covering 67.5 degrees so diagonals overlap; still in a small dead spot
    // at its centre. A finger that's on it keeps it (own): it steers by its angle from the centre however far it
    // slides, until it lifts, the way a thumb drifts off a real pad without letting go
    function dpDirs(c, x, y, own) {
      var r = c.w / 2, dx = x - c.cx, dy = y - c.cy, d2 = dx * dx + dy * dy, out = [];
      if (d2 <= r * r * .02 || (!own && d2 >= r * r * 2.1)) return out;
      var ang = Math.atan2(dy, dx) * 180 / Math.PI;
      if (ang > -157.5 && ang < -22.5) out.push(4);
      if (ang > 22.5 && ang < 157.5) out.push(5);
      if (ang > 112.5 || ang < -112.5) out.push(6);
      if (ang > -67.5 && ang < 67.5) out.push(7);
      return out;
    }
    function onKeyAt(x, y) { return ctls.some(function (c) { return (c.k === 'pill' || c.k === 'sh') && Math.abs(x - c.cx) < c.w * .55 && Math.abs(y - c.cy) < c.h * .7; }); }
    // the D-pad takes a finger that lands on or near it (the margin gives way to Start, Select and shoulders)
    function dpTakes(x, y) { var c = ctls[0]; return !!(c && c.k === 'dp' && !onKeyAt(x, y) && Math.hypot(x - c.cx, y - c.cy) < c.w / 2 * 1.45); }
    function read(x, y, own) {
      if (own) return dpDirs(ctls[0], x, y, true);
      var out = [], best = null, bd = 1e9, bd2 = 1e9;
      var bs = ctls.filter(function (c) { return c.k === 'btn'; });
      // on Start/Select or a shoulder button (the SNES's R sits just over X): the face buttons' extra margin gives way
      var onKey = onKeyAt(x, y);
      ctls.forEach(function (c) {
        var dx = x - c.cx, dy = y - c.cy;
        if (c.k === 'dp') {
          if (!onKey) dpDirs(c, x, y, false).forEach(function (i) { out.push(i); });
        } else if (c.k === 'btn') {
          // generous: they can't be felt, so a thumb a little off still counts, but never reaching into a neighbour's
          // half of the gap (the SNES diamond and the Genesis row stay one button per spot); near but off them all,
          // the closest one, when it's clearly the closest
          var rb = c.w / 2, db = Math.sqrt(dx * dx + dy * dy), nn = 1e9;
          bs.forEach(function (o) { if (o !== c) nn = Math.min(nn, Math.hypot(o.cx - c.cx, o.cy - c.cy)); });
          if (db < rb || (!onKey && db < Math.min(rb * 1.3, nn * .5))) out.push(c.i);
          else if (!onKey && db < rb * 2.1) { if (db < bd) { bd2 = bd; bd = db; best = c.i; } else if (db < bd2) bd2 = db; }
        } else if (c.k === 'pill' || c.k === 'sh') {
          if (Math.abs(dx) < c.w * .55 && Math.abs(dy) < c.h * .7) out.push(c.i);
        }
      });
      // between two face buttons: both. The NES's two: a wide strip joining them, so a thumb rolled from B onto A
      // presses both on the way (run, then jump), like on the real pad. Three or four buttons: just the spot
      // midway between neighbours, kept out of the buttons themselves (the Genesis's nearly touch), so a thumb
      // off-centre doesn't press two
      for (var m = 0; m < bs.length; m++) for (var n = m + 1; n < bs.length; n++) {
        var p = bs[m], q = bs[n], vx = q.cx - p.cx, vy = q.cy - p.cy, gap = Math.hypot(vx, vy), both = false;
        if (gap > p.w * 1.6) continue;
        if (bs.length === 2) {
          var tt = ((x - p.cx) * vx + (y - p.cy) * vy) / (gap * gap), off = Math.abs((x - p.cx) * vy - (y - p.cy) * vx) / gap;
          both = tt > .28 && tt < .72 && off < p.w * .42;
        } else both = Math.hypot(x - (p.cx + q.cx) / 2, y - (p.cy + q.cy) / 2) < Math.min(p.w * .24, Math.max(gap / 2 - p.w * .425, p.w * .1));
        if (both) { if (out.indexOf(p.i) < 0) out.push(p.i); if (out.indexOf(q.i) < 0) out.push(q.i); }
      }
      if (!out.length && best != null && (bs.length < 2 || bd2 - bd > (ctls.filter(function (c) { return c.i === best; })[0].w / 2) * .3)) out.push(best);
      return out;
    }
    function toolAt(x, y) { for (var n = 0; n < ctls.length; n++) { var c = ctls[n]; if (c.k === 'tool' && Math.hypot(x - c.cx, y - c.cy) < c.w * .8) return c; } return null; }
    function update() { var next = {}; for (var id in touches) touches[id].forEach(function (i) { next[i] = 1; }); setHeld(next); }
    function useTool(t) {
      Kit.haptic('light'); t.el.classList.add('on'); setTimeout(function () { t.el.classList.remove('on'); }, 120);
      if (t.t === 'menu') { var b = document.querySelector('.gbar button[aria-label="Menu"]'); if (b) b.click(); }
      else if (ConsoleNet.on()) Kit.toast('Fast-forward is off while you play online');   // (both devices run at the same speed)
      else { ffOn = !ffOn; t.el.classList.toggle('lit', ffOn); var E = emu(); if (E) try { E.gameManager.toggleFastForward(ffOn ? 1 : 0); } catch (er) {} }
    }
    // Touch: what's pressed is worked out afresh from every finger still on the controller, at every touch event,
    // so a lift iOS never reported (a system gesture taking over a touch at the screen's edge) can't leave a
    // button held while another thumb stays down
    var toolIds = {}, dpIds = {};   // (the fingers on a tool button, and the ones the D-pad has)
    function fromTouches(e) {
      if (e.cancelable) e.preventDefault();
      var next = {};
      Array.prototype.forEach.call(e.targetTouches, function (t) {
        var id = t.identifier; if (toolIds[id]) return;
        if (!dpIds[id] && dpTakes(t.clientX, t.clientY)) dpIds[id] = 1;   // (one sliding onto the pad from elsewhere too)
        read(t.clientX, t.clientY, dpIds[id]).forEach(function (i) { next[i] = 1; });
      });
      Array.prototype.forEach.call(e.changedTouches, function (t) { if (e.type === 'touchend' || e.type === 'touchcancel') { delete toolIds[t.identifier]; delete dpIds[t.identifier]; } });
      setHeld(next);
    }
    sk.addEventListener('touchstart', function (e) {
      Array.prototype.forEach.call(e.changedTouches, function (t) { var tl = toolAt(t.clientX, t.clientY); if (tl) { toolIds[t.identifier] = 1; useTool(tl); } });
      fromTouches(e);
    }, { passive: false });
    ['touchmove', 'touchend', 'touchcancel'].forEach(function (k) { sk.addEventListener(k, fromTouches, { passive: false }); });
    // A mouse or pen (and touch where there are no touch events): pointer events
    var touchEvents = 'ontouchstart' in window;
    sk.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'touch' && touchEvents) return;
      e.preventDefault();
      var t = toolAt(e.clientX, e.clientY);
      if (t) { useTool(t); return; }
      try { sk.setPointerCapture(e.pointerId); } catch (er) {}
      if (dpTakes(e.clientX, e.clientY)) dpIds['p' + e.pointerId] = 1;
      touches[e.pointerId] = read(e.clientX, e.clientY, dpIds['p' + e.pointerId]); update();
    });
    sk.addEventListener('pointermove', function (e) {
      if (!touches[e.pointerId]) return;
      if (dpTakes(e.clientX, e.clientY)) dpIds['p' + e.pointerId] = 1;
      touches[e.pointerId] = read(e.clientX, e.clientY, dpIds['p' + e.pointerId]); update();
    });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (k) { sk.addEventListener(k, function (e) { delete dpIds['p' + e.pointerId]; if (!touches[e.pointerId]) return; delete touches[e.pointerId]; update(); }); });
    sk.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    // A lift the controller never heard about (turning the device mid-press, a notification sliding in) mustn't
    // leave a button held: with no finger on the glass, nothing is pressed
    function releaseAll() { touches = {}; toolIds = {}; dpIds = {}; update(); }
    ['pointerup', 'pointercancel'].forEach(function (k) { window.addEventListener(k, function (e) { if (touches[e.pointerId]) { delete touches[e.pointerId]; update(); } }); });
    ['touchend', 'touchcancel'].forEach(function (k) { window.addEventListener(k, function (e) { if (!e.touches || !e.touches.length) releaseAll(); }, { passive: true }); });
    window.addEventListener('blur', releaseAll);
    document.addEventListener('visibilitychange', function () { if (document.hidden) releaseAll(); });
    skinRelease = releaseAll;
  }

  // ═══ A real controller (Bluetooth or USB) ═════════════════════════════════
  // Read here rather than by EmulatorJS (its own gamepad handling is off: EJS_ownGamepad), so every controller can be
  // remapped for each console and keeps its own map: gn_pad_map {controller id: {console: {button: [codes]}}}, a
  // synced setting. Codes: 'b<n>' a controller button, 'a<n>+' / 'a<n>-' a stick pushed one way.
  window.EJS_ownGamepad = true;
  var DIRS = [['Up', 4], ['Down', 5], ['Left', 6], ['Right', 7]];
  var PAD_TARGETS = {
    nes: DIRS.concat([['B', 0], ['A', 8], ['Select', 2], ['Start', 3]]),
    snes: DIRS.concat([['Y', 1], ['B', 0], ['X', 9], ['A', 8], ['L', 10], ['R', 11], ['Select', 2], ['Start', 3]]),
    genesis: DIRS.concat([['A', 1], ['B', 0], ['C', 8], ['Start', 3]]),
    atari2600: DIRS.concat([['Fire', 0], ['Game Select', 2], ['Game Reset', 3]])
  };
  // out of the box, by position: the console's buttons where the controller has them (a standard-layout controller's
  // face buttons are 0 bottom, 1 right, 2 left, 3 top; 4-7 shoulders and triggers; 8 Select, 9 Start; 12-15 D-pad)
  function padDefaults() {
    var m = { 4: ['b12', 'a1-'], 5: ['b13', 'a1+'], 6: ['b14', 'a0-'], 7: ['b15', 'a0+'], 2: ['b8'], 3: ['b9'] };
    if (SYS_ID === 'nes') { m[0] = ['b0', 'b2']; m[8] = ['b1', 'b3']; }
    else if (SYS_ID === 'snes') { m[0] = ['b0']; m[8] = ['b1']; m[1] = ['b2']; m[9] = ['b3']; m[10] = ['b4', 'b6']; m[11] = ['b5', 'b7']; }
    else if (SYS_ID === 'genesis') { m[1] = ['b2']; m[0] = ['b0']; m[8] = ['b1']; }
    else { m[0] = ['b0', 'b1', 'b2', 'b3']; }
    return m;
  }
  function padMaps() { try { return JSON.parse(localStorage.getItem('gn_pad_map') || '{}') || {}; } catch (e) { return {}; } }
  function padSave(all) { try { localStorage.setItem('gn_pad_map', JSON.stringify(all)); } catch (e) {} if (window.FGHSync && FGHSync.noteWrite) FGHSync.noteWrite('gn_pad_map'); }
  function padMapOf(p) { var all = padMaps(), m = p && all[p.id] && all[p.id][SYS_ID]; return m || padDefaults(); }
  function pads() { try { return navigator.getGamepads ? navigator.getGamepads() : []; } catch (e) { return []; } }
  // Two players: each console has two controller ports. A controller takes the first free seat when it presses its
  // first button (seats[player] = its gamepad index); Swap players in Controller buttons trades them.
  var SEATS = 2, seats = [null, null], held = [{}, {}], lastPad = null, padMenuWas = false, mapper = null;
  function padAt(gi) { var l = pads(); return gi != null && l[gi] && l[gi].connected !== false ? l[gi] : null; }
  // the controller the remap sheet shows: the one last pressed, else player 1's, else any
  function activePad() {
    var p = padAt(lastPad) || padAt(seats[0]) || padAt(seats[1]); if (p) return p;
    var l = pads(); for (var i = 0; i < l.length; i++) if (l[i] && l[i].connected !== false) return l[i];
    return null;
  }
  function seatOf(p) { return p ? seats.indexOf(p.index) : -1; }
  function padDown(p) {
    var d = {};
    Array.prototype.forEach.call(p.buttons, function (b, i) { if (b && (b.pressed || b.value > .5)) d['b' + i] = 1; });
    Array.prototype.forEach.call(p.axes, function (a, i) { if (a > .5) d['a' + i + '+'] = 1; else if (a < -.5) d['a' + i + '-'] = 1; });
    return d;
  }
  function padRelease(seat) {
    (seat == null ? [0, 1] : [seat]).forEach(function (n) { for (var k in held[n]) { press(+k, 0, n); delete held[n][k]; } });
  }
  // a controller sits down: the first free seat, announced
  function sit(p) {
    var n = seats.indexOf(null); if (n < 0) return -1;
    seats[n] = p.index;
    var first = !padConnected; padConnected = true;
    if (playEl) {
      padMode();
      if (n === 0 && first) Kit.toast(padName(p) + ' connected · Home, or Select + Start, opens the menu');
      else { Kit.callout && Kit.callout('Player ' + (n + 1)); Kit.toast('Player ' + (n + 1) + ': ' + padName(p)); Kit.haptic('success'); }
      showSeats();
    }
    return n;
  }
  (function padTick() {
    var l = pads(), menuNow = false, scrim = !!document.querySelector('.k-scrim');
    for (var gi = 0; gi < l.length; gi++) {
      var p = l[gi]; if (!p || p.connected === false) continue;
      var down = padDown(p), any = Object.keys(down).length > 0, n = seatOf(p);
      if (any) lastPad = p.index;
      if (n < 0 && any && !mapper) n = sit(p);
      if (mapper) { if (any || p.index === lastPad) mapper(down, p); continue; }   // the remap sheet is listening
      if (n < 0) continue;
      if (scrim) { padRelease(n); continue; }
      var m = padMapOf(p), next = {};
      Object.keys(m).forEach(function (t) { if (m[t].some(function (c) { return down[c]; })) next[t] = 1; });
      for (var k in held[n]) if (!next[k]) { press(+k, 0, n); delete held[n][k]; }
      for (var j in next) if (!held[n][j]) { press(+j, 1, n); held[n][j] = 1; }
      if (down.b16 || (down.b8 && down.b9)) menuNow = true;
    }
    if (mapper) padRelease();
    if (menuNow && !padMenuWas && cur && !scrim) { padRelease(); openMenu(); }
    padMenuWas = menuNow;
    requestAnimationFrame(padTick);
  })();
  // who's playing: a chip per seat, shown with the menu button when the picture fills the screen
  var seatsEl = null;
  function showSeats() {
    if (!playEl) return;
    if (!seatsEl) { seatsEl = el('div', { class: 'pad-seats' }); playEl.appendChild(seatsEl); }
    seatsEl.innerHTML = '';
    seats.forEach(function (gi, n) { var p = padAt(gi); if (p) seatsEl.appendChild(el('span', { class: 'p' + (n + 1) }, [el('b', { text: 'P' + (n + 1) }), el('span', { text: padName(p) })])); });
    peek();
  }
  // what a controller calls its buttons: Xbox, PlayStation and Nintendo-style layouts by name, others by position
  function padFamily(p) { var id = (p && p.id) || ''; return /xbox|xinput|microsoft/i.test(id) ? 'x' : /dualshock|dualsense|playstation|sony|ps4|ps5|054c/i.test(id) ? 'ps' : /nintendo|pro controller|joy-?con|8bitdo|sn30|057e/i.test(id) ? 'n' : ''; }
  function padName(p) { var n = ((p && p.id) || 'Controller').replace(/\(.*?\)/g, ' ').replace(/\s*(Extended Gamepad|Gamepad)\s*$/i, '').replace(/\s+/g, ' ').trim(); return n || 'Controller'; }
  function codeName(p, c) {
    if (c[0] === 'a') { var ax = +c.slice(1, -1), pos = c.slice(-1) === '+'; return (ax < 2 ? 'Left stick ' : ax < 4 ? 'Right stick ' : 'Axis ' + ax + ' ') + (ax % 2 ? (pos ? 'down' : 'up') : (pos ? 'right' : 'left')); }
    var i = +c.slice(1), f = padFamily(p);
    if (!p || p.mapping !== 'standard') return 'Button ' + i;
    var face = { x: ['A', 'B', 'X', 'Y'], ps: ['Cross', 'Circle', 'Square', 'Triangle'], n: ['B', 'A', 'Y', 'X'], '': ['Bottom button', 'Right button', 'Left button', 'Top button'] }[f];
    var sh = { x: ['LB', 'RB', 'LT', 'RT', 'View', 'Menu'], ps: ['L1', 'R1', 'L2', 'R2', 'Share', 'Options'], n: ['L', 'R', 'ZL', 'ZR', 'Minus', 'Plus'], '': ['Left bumper', 'Right bumper', 'Left trigger', 'Right trigger', 'Select', 'Start'] }[f];
    return i < 4 ? face[i] : i < 10 ? sh[i - 4] : ['Left stick press', 'Right stick press', 'D-pad up', 'D-pad down', 'D-pad left', 'D-pad right', 'Home'][i - 10] || 'Button ' + i;
  }
  // The controls table (How to play and Controls): each of the console's buttons, its key on a keyboard, and when a
  // controller is connected (or one has been set up for this console) the button it's on now, remaps included
  function ctlPad() {
    var p = activePad(); if (p) return p;
    var all = padMaps(), id = Object.keys(all).filter(function (k) { return all[k] && all[k][SYS_ID]; })[0];
    return id ? { id: id, mapping: 'standard' } : null;
  }
  function ctlTable() {
    var p = ctlPad(), m = p ? padMapOf(p) : null, T = PAD_TARGETS[SYS_ID];
    var kc = function (t) { return '<kbd>' + Kit.esc(t) + '</kbd>'; };
    var arrow = function (rot) { return '<svg viewBox="0 0 20 20" width="14" height="14" style="transform:rotate(' + rot + 'deg)"><path d="M10 4l6 9H4z" fill="currentColor"/></svg>'; };
    var pad = function (code) { return (m[code] || []).map(function (c) { return Kit.esc(codeName(p, c)); }).join('<br>') || '<span class="none">Nothing</span>'; };
    var dflt = padDefaults(), same = m && [4, 5, 6, 7].every(function (k) { return JSON.stringify(m[k] || []) === JSON.stringify(dflt[k]); });
    var rows = '';
    // the D-pad: one row while the directions are where they started, else one row each
    var cross = '<svg viewBox="0 0 20 20" width="20" height="20"><path d="M7 1h6v6h6v6h-6v6H7v-6H1V7h6z" fill="currentColor" opacity=".9"/></svg>';
    if (!m || same) rows += '<tr><th><span class="pm-key k4 ctl-dpad">' + cross + '</span><span class="ctl-n">' + (SYS_ID === 'atari2600' ? 'Joystick' : 'D-pad') + '</span></th><td class="kb">' + kc('↑') + kc('↓') + kc('←') + kc('→') + '</td>' + (m ? '<td>D-pad<br>Left stick</td>' : '') + '</tr>';
    T.forEach(function (t) {
      var rot = { 4: 0, 7: 90, 5: 180, 6: 270 }[t[1]];
      if (rot != null && (!m || same)) return;
      var key = rot != null ? '<span class="pm-key k' + t[1] + '">' + arrow(rot) + '</span>' : '<span class="pm-key pm-' + SYS_ID + ' k' + t[1] + '">' + Kit.esc(t[0].replace('Game ', '')) + '</span>';
      var kb = rot != null ? kc(['↑', '↓', '←', '→'][t[1] - 4]) : SYS.keys[t[1]] ? kc(SYS.keys[t[1]]) : '';
      var chip = t[0].replace('Game ', '');   // (a button whose chip already says its name needs no name beside it)
      rows += '<tr><th>' + key + (rot != null || chip !== t[0] ? '<span class="ctl-n">' + Kit.esc(t[0]) + '</span>' : '') + '</th><td class="kb">' + kb + '</td>' + (m ? '<td>' + pad(t[1]) + '</td>' : '') + '</tr>';
    });
    return '<table class="ctl-t"><thead><tr><th>' + Kit.esc(SYS.name) + '</th><th>Keyboard</th>' + (m ? '<th>' + Kit.esc(padName(p)) + '</th>' : '') + '</tr></thead><tbody>' + rows + '</tbody></table>';
  }
  // The remap sheet: the console's buttons, each with what it's on now. Press anything on the controller and its row
  // lights up; tap a row, then press the controller button you want for it.
  function padSheet() {
    var box = el('div', { class: 'k-list pm' }), rows = {}, listen = null, startDown = null, s;
    var head = el('p', { class: 'pm-who' }), m = null, p = null;
    // the players: who has which controller, and a swap when there are two
    var who = el('div', { class: 'pm-seats' });
    function drawSeats() {
      who.innerHTML = '';
      var have = seats.filter(function (gi) { return padAt(gi); }).length;
      if (have < 2) return;
      seats.forEach(function (gi, n) { var q = padAt(gi); who.appendChild(el('span', { class: 'p' + (n + 1) + (q && p && q.index === p.index ? ' on' : '') }, [el('b', { text: 'P' + (n + 1) }), el('span', { text: q ? padName(q) : 'No controller' })])); });
      who.appendChild(el('button', { type: 'button', class: 'pm-swap', html: Kit.icon('swap') + '<span>Swap players</span>', onclick: function () {
        padRelease(); seats.reverse(); load(); showSeats(); Kit.haptic('medium'); Kit.toast('Players swapped');
      } }));
    }
    box.appendChild(who); box.appendChild(head);
    function load() {
      p = activePad();
      var n = seatOf(p);
      head.textContent = p ? (n >= 0 ? 'Player ' + (n + 1) + ' · ' : '') + padName(p) + (seats.filter(function (gi) { return padAt(gi); }).length > 1 ? ' (press a button on the other controller to set up that one)' : '') : 'Press any button on your controller to connect it.';
      drawSeats();
      m = JSON.parse(JSON.stringify(padMapOf(p)));
      PAD_TARGETS[SYS_ID].forEach(function (t) { var r = rows[t[1]]; if (r) r.sub.textContent = (m[t[1]] || []).map(function (c) { return codeName(p, c); }).join(' or ') || 'Nothing'; });
    }
    var grp = el('div', { class: 'k-grp' });
    PAD_TARGETS[SYS_ID].forEach(function (t) {
      // the console's own button as the row's key: an arrow on a D-pad arm for the directions
      var rot = { 4: 0, 7: 90, 5: 180, 6: 270 }[t[1]];
      var key = rot != null ? el('span', { class: 'pm-key k' + t[1], html: '<svg viewBox="0 0 20 20" width="16" height="16" style="transform:rotate(' + rot + 'deg)"><path d="M10 4l6 9H4z" fill="currentColor"/></svg>' })
        : el('span', { class: 'pm-key pm-' + SYS_ID + ' k' + t[1], text: t[0].replace('Game ', '') });
      var sub = el('small'), b = el('button', { type: 'button', class: 'pm-row' }, [key, el('span', { class: 'lbl' }, [el('span', { text: t[0] }), sub])]);
      b.onclick = function () {
        if (!p) return;
        if (listen === t[1]) { listen = null; b.classList.remove('listen'); load(); return; }
        Object.keys(rows).forEach(function (k) { rows[k].el.classList.remove('listen'); });
        listen = t[1]; startDown = padDown(p); b.classList.add('listen'); sub.textContent = 'Press a button on the controller…'; Kit.haptic('light');
      };
      rows[t[1]] = { el: b, sub: sub }; grp.appendChild(b);
    });
    box.appendChild(grp);
    var reset = el('button', { type: 'button', class: 'pm-reset' }, ['Back to the standard layout']);
    reset.onclick = function () { if (!p) return; var all = padMaps(); if (all[p.id]) { delete all[p.id][SYS_ID]; padSave(all); } listen = null; load(); Kit.toast('Standard layout'); };
    box.appendChild(reset);
    load();
    mapper = function (down, pad) {
      // the sheet follows whichever controller is being pressed (unless it's waiting for one to pick a button)
      if (listen == null && Object.keys(down).length && (!p || pad.index !== p.index)) { lastPad = pad.index; load(); }
      if (!p || pad.index !== p.index) return;
      if (listen != null) {
        var code = Object.keys(down).filter(function (c) { return !startDown[c]; })[0];
        var swapped = null;
        Object.keys(startDown).forEach(function (c) { if (!down[c]) delete startDown[c]; });   // let go, then press again counts
        if (code) {
          // one console button per controller button: whatever had it swaps onto this one's old button
          var old = (m[listen] || []).slice();
          Object.keys(m).forEach(function (k) { if (+k !== listen && (m[k] || []).indexOf(code) >= 0) { var rest = m[k].filter(function (c) { return c !== code; }); m[k] = rest.length ? rest : old.filter(function (c) { return c !== code; }); swapped = k; } });
          m[listen] = [code];
          var all = padMaps(); all[p.id] = all[p.id] || {}; all[p.id][SYS_ID] = m; padSave(all);
          [listen, swapped].forEach(function (k) { if (k == null || !rows[k]) return; var r = rows[k].el; r.classList.remove('listen'); r.classList.add('done'); setTimeout(function () { r.classList.remove('done'); }, 700); });
          listen = null; Kit.haptic('success'); Kit.sfx('tap'); load();
        }
        return;
      }
      // live: light up the console buttons the controller is pressing
      Object.keys(rows).forEach(function (k) { rows[k].el.classList.toggle('lit', (m[k] || []).some(function (c) { return down[c]; })); });
    };
    s = Kit.sheet({ title: 'Controller buttons · ' + SYS.name, node: box, onClose: function () { mapper = null; } });
  }

  // ═══ Online: two to four players, each on their own device ════════════════
  // A table (online.js) for the game being played: the host is player 1, whoever joins takes the next free seat
  // (players 2, 3, 4: four on the SNES, and on Genesis games made for the Team Player; two elsewhere). A joiner's
  // device gets the cartridge (from the family's games, or straight from the host's device), loads it, then takes
  // the host's exact moment; from there all run in lockstep (console-net.js). Tables are per console (game: the
  // console's id), so home's "open tables" link brings a friend to the right shelf (?online=1&join=CODE).
  // Someone joining a game under way: once their game is loaded, the host starts it again for everyone from
  // where it is (a second's pause). Someone leaving: the others carry on; the host leaving ends it for all.
  var NET = { mode: null, table: null, peer: null, ov: null, lobby: null, wait: null, me: '', other: '', want: false, live: false, pick: null, paused: false,
    guests: [], roster: [], seat: 0, names: {}, max: 2 };
  function netName() { try { return (localStorage.getItem('my_name') || '').trim(); } catch (e) { return ''; } }
  function nameOf(s) { return NET.names[s] || 'Player ' + (s + 1); }
  // the table screens sit over everything (the game waits underneath)
  function netOv() {
    if (NET.ov) return NET.ov.firstChild;
    var E = emu(); if (E && started && !E.paused && !ConsoleNet.on()) { E.pause(); NET.paused = true; }
    NET.ov = el('div', { class: 'net-ov' }, [el('div', { class: 'stage net-in' })]);
    document.body.appendChild(NET.ov);
    return NET.ov.firstChild;
  }
  function netOvClose(go) {
    if (NET.lobby) { NET.lobby.close(); NET.lobby = null; }
    NET.wait = null;
    if (go && NET.ov) NET.ov.firstChild.innerHTML = '';   // the table screen leaving for the game: its "Let's play" spin (online.js)
    if (NET.ov) { var ov = NET.ov; NET.ov = null; if (go) setTimeout(function () { ov.remove(); }, 30); else ov.remove(); }
    if (NET.paused) { NET.paused = false; var E = emu(); if (E) E.play(); }
  }
  function goOnline() {
    if (NET.mode) { netShowWait(); return; }
    var n = cur ? seatsMax() : TAPS[SYS_ID] ? 4 : 2;
    NET.lobby = Online.lobby(netOv(), {
      game: SYS_ID, title: 'Play online', max: n,
      intro: cur ? 'Play ' + cur.name + ' together, each on your own device. Open a table and you’re player 1; ' + (seatsMax() > 2 ? 'up to three more join as players 2 to 4.' : 'whoever joins is player 2.')
        : (n > 2 ? 'Up to four players' : 'Two players') + ', each on their own device. Join a table, or open one and pick the game.',
      me: { name: netName() },
      onHost: function (me) { return netHost(me.name); },
      onJoin: function (code, room, me) { return netJoin(code, me.name); },
      onSolo: netOvClose, solo: cur ? 'Back to the game' : 'Not now',
      sub: function (r) {
        var free = (r.max || 2) - (r.n || 1);
        return (r.info || SYS.name) + (r.status === 'playing' ? ' · playing, join in' : (r.max || 2) > 2 ? ' · ' + free + (free === 1 ? ' seat' : ' seats') + ' free' : ' · needs player 2');
      },
      note: 'Fast-paced games play best with every device on good Wi-Fi.'
    });
  }
  // who's at the table, in seat order (player 1 first)
  function netPlayers() {
    if (NET.mode === 'host') return [{ name: NET.me, host: true, me: true, seat: 0 }].concat(NET.guests.slice().sort(function (a, b) { return a.seat - b.seat; }).map(function (g) { return { name: g.name, seat: g.seat }; }));
    if (NET.roster.length) return NET.roster.map(function (r) { return { name: r.name, seat: r.seat, host: r.seat === 0, me: r.seat === NET.seat }; });
    return [{ name: NET.other, host: true, seat: 0 }, { name: NET.me, me: true, seat: NET.seat || 1 }];
  }
  // the seat tags (P1 to P4, in the players' colours) on the table screen's rows, in the line under the name
  function netTags() {
    if (!NET.ov) return;
    var pl = netPlayers(), rows = NET.ov.querySelectorAll('.olt-side .stack:not(:empty) > .ol-seat');
    Array.prototype.forEach.call(rows, function (r, i) {
      var p = pl[i], sm = r.querySelector('small'); if (!p || !sm || sm.querySelector('.net-ptag')) return;
      var t = el('i', { class: 'net-ptag p' + (p.seat + 1), text: 'P' + (p.seat + 1) });
      sm.textContent = p.host ? 'Host' : p.me ? 'You' : '';
      sm.insertBefore(t, sm.firstChild); sm.classList.add('net-sm');
    });
  }
  function netWaitUpdate() { if (NET.wait) { NET.wait.update(netPlayers()); netTags(); } }
  function netStep(detail) { if (NET.ov && NET.wait) try { Online.stage(NET.ov.firstChild).step('start', NET.mode === 'host' ? 'now' : 'run', detail); } catch (e) {} }
  function netShowWait() {
    var r = netOv();
    NET.wait = Online.waitRoom(r, NET.mode === 'host'
      ? { code: NET.table.code, host: true, max: NET.max, min: 2, table: NET.table, players: netPlayers(), onStart: netStart, onLeave: function () { netQuit(); },
          note: 'You’re player 1 on ' + cur.name + '. ' + (NET.max > 2 ? 'Up to three more can join, as players 2 to 4,' : 'Whoever joins plays as player 2') + ' on their own device.' }
      : { host: false, hostName: NET.other, max: NET.max, min: 2, players: netPlayers(), onLeave: function () { netQuit(); },
          note: 'You’re player ' + ((NET.seat || 1) + 1) + '. ' + NET.other + ' starts the game.' });
    netTags();
    netHostSteps();
  }
  function netHostSteps() {
    if (NET.mode !== 'host' || !NET.guests.length) return;
    var loading = NET.guests.filter(function (g) { return !g.ready; }).map(function (g) { return g.name; });
    if (loading.length) netStep('Loading the game on ' + loading.join(' and ') + (loading.length > 1 ? '’s devices…' : '’s device…'));
    else netStep(NET.want ? 'Starting…' : 'Tap Start when everyone’s in');
  }
  // the host tells the guests who's in which seat
  function netRoster() {
    var r = netPlayers().map(function (p) { return { seat: p.seat, name: p.name }; });
    r.forEach(function (p) { NET.names[p.seat] = p.name; });
    NET.guests.forEach(function (g) { g.peer.send({ t: 'roster', seats: r, max: NET.max }, true); });
    if (netHud) netSeats();
  }

  // ── Host ──
  function netHost(name) {
    NET.me = name;
    if (!cur || !started) { NET.pick = name; netOvClose(); root.classList.add('net-pick'); Kit.toast('Pick the game to play online'); return Promise.resolve(); }   // (the cartridges glow until one's picked)
    if (NET.lobby) { NET.lobby.close(); NET.lobby = null; }
    NET.max = seatsMax(); NET.guests = []; NET.names = { 0: name }; NET.seat = 0;
    return Online.host({ game: SYS_ID, name: name, max: NET.max, min: 2, info: cur.name, screen: netOv(), relay: false }).then(function (table) {
      NET.mode = 'host'; NET.table = table;
      table.on('fail', function (e) { Kit.toast('Couldn’t open a table. ' + Online.errText(e)); netQuit(); });
      table.on('peer', function (peer) {
        // the first free seat (someone who left mid-game frees theirs)
        var taken = {}, seat = 1; NET.guests.forEach(function (x) { taken[x.seat] = 1; });
        while (taken[seat]) seat++;
        var g = { peer: peer, seat: seat, name: peer.name || 'Player ' + (seat + 1), ready: false };
        NET.guests.push(g); NET.names[seat] = g.name;
        ConsoleNet.listen(peer);
        peer.on('msg', function (m) { netHostMsg(g, m); });
        peer.send({ t: 'cart', id: cur.id, name: cur.name, file: cur.file, p1: NET.me, seat: seat, max: NET.max, tap: TAP_ON }, true);
        netRoster();
        if (NET.wait) { netWaitUpdate(); netHostSteps(); }
        else { Kit.toast(g.name + ' is joining'); Kit.sfx('pop'); }
      });
      table.on('leave', function (peer) {
        var g = NET.guests.filter(function (x) { return x.peer === peer; })[0]; if (!g) return;
        NET.guests = NET.guests.filter(function (x) { return x !== g; });
        if (ConsoleNet.on()) {
          // the others carry on; with nobody left, back to playing alone
          if (ConsoleNet.drop(g.seat)) { Kit.toast(g.name + ' left'); Kit.haptic('warning'); if (netHud) netSeats(); }
          else { NET.other = g.name; ConsoleNet.end('left'); }
        } else if (NET.wait) { netWaitUpdate(); netHostSteps(); }
        netRoster();
        table.setStatus(NET.want ? 'playing' : 'open', cur.name);
        netGo();   // (someone still loading may be all that was missing)
      });
      netShowWait();
    }).catch(function (e) { if (e && e.message === 'Cancelled') return; Kit.toast('Couldn’t open a table. ' + Online.errText(e)); netQuit(); });
  }
  function netHostMsg(g, m) {
    if (!m || !m.t || NET.mode !== 'host' || NET.guests.indexOf(g) < 0) return;
    if (m.t === 'need') {   // not on their shelf: the cartridge comes from this device
      cur.data.arrayBuffer().then(function (b) { return ConsoleNet.sendBytes(g.peer, 'nrom', new Uint8Array(b), {}); }).catch(function (e) { console.warn(e); });
    } else if (m.t === 'ready') { g.ready = true; Kit.sfx('tap'); netHostSteps(); netGo(); }
  }
  // Start: as soon as every joiner's game is loaded (and again whenever someone joins a game under way)
  function netStart() { NET.want = true; netHostSteps(); return new Promise(function (ok) { NET.started = ok; netGo(); }); }
  function netGo() {
    if (NET.mode !== 'host' || !NET.want || !started || !NET.guests.length || NET.guests.some(function (g) { return !g.ready; })) return;
    var seats = [0].concat(NET.guests.map(function (g) { return g.seat; })).sort();
    if (ConsoleNet.on()) {   // already playing with exactly these people: nothing to do
      var st = ConsoleNet.status(), now = st.seats.filter(function (s) { return st.gone.indexOf(s) < 0; });
      if (now.join() === seats.join()) return;
    }
    var again = ConsoleNet.on();
    var E = emu(), S; try { S = E.gameManager.getState(); } catch (e) { Kit.toast('Couldn’t start online'); return; }
    // the button delay: enough frames for a message to get to the slowest device, plus a little slack
    var rtt = Math.max(20, NET.guests.reduce(function (a, g) { return Math.max(a, g.peer.rtt || 0); }, 0)), D = Math.max(2, Math.min(9, Math.ceil((rtt / 2 + 8) / 16.64) + 1));
    var sid = Math.random().toString(36).slice(2, 8), names = {}; seats.forEach(function (s) { names[s] = nameOf(s); });
    ffOff();
    ConsoleNet.begin({ seat: 0, sid: sid, seats: seats, delay: D, state: S, guests: NET.guests.map(function (g) { return { peer: g.peer, seat: g.seat }; }), onEnd: netEnded });
    ConsoleNet.pack(S).then(function (pk) {
      NET.guests.forEach(function (g) { ConsoleNet.ship(g.peer, 'nstart', pk, { delay: D, sid: sid, seats: seats, seat: g.seat, names: names, p1: NET.me }).catch(function () {}); });
    });
    NET.live = true; NET.table.setStatus('playing', cur.name);
    if (NET.started) { NET.started(); NET.started = null; }
    if (again) { netSeats(); netPeek(); return; }
    netOvClose(true); netLive();
  }

  // ── Guest ──
  function netJoin(code, name) {
    NET.me = name;
    // one game per page load: a fresh page joins
    if (booted) { location.replace(location.pathname + '?online=1&join=' + code); return new Promise(function () {}); }
    if (NET.lobby) { NET.lobby.close(); NET.lobby = null; }
    return Online.join(code, { game: SYS_ID, name: name, min: 2, max: TAPS[SYS_ID] ? 4 : 2, screen: netOv(), relay: false }).then(function (peer) {
      NET.mode = 'guest'; NET.peer = peer; NET.other = peer.name || 'Player 1'; NET.max = peer.room && peer.room.max || 2;
      ConsoleNet.listen(peer);
      peer.on('msg', netGuestMsg);
      peer.on('close', function () {
        if (NET.peer !== peer) return;
        NET.peer = null;
        if (ConsoleNet.on()) ConsoleNet.end('left');
        else { Kit.toast(NET.other + ' closed the table'); netQuit(); }
      });
      netShowWait();
    }).catch(function (e) {
      if (e && e.nat) Kit.sheet({ title: 'Couldn’t connect', html: '<p>' + Kit.esc(Online.NAT_MSG) + '</p>' }); else Kit.toast(Online.errText(e));
      netOvClose(); goOnline();
    });
  }
  function netGuestMsg(m) {
    if (!m || NET.mode !== 'guest') return;
    if (m.t === 'roster') {
      NET.roster = m.seats || []; NET.max = m.max || NET.max;
      NET.roster.forEach(function (r) { NET.names[r.seat] = r.name; });
      netWaitUpdate(); if (netHud) netSeats();
      return;
    }
    if (m.t !== 'cart' || NET.cart) return;
    NET.cart = m; NET.other = m.p1 || NET.other; NET.seat = m.seat || 1; NET.max = m.max || NET.max;
    NET.names[0] = NET.other; NET.names[NET.seat] = NET.me;
    if (NET.wait) netShowWait();   // (now it knows which player you are)
    var c = carts.filter(function (x) { return x.id === m.id; })[0];
    netStep('Getting ' + m.name + ' ready');
    (c ? (c.data ? Promise.resolve(c) : L.file(c, function (f) { netStep('Getting ' + m.name + ' · ' + Math.round(f * 100) + '%'); }).then(function (full) { c.data = full.data; return c; })) : Promise.reject())
      .catch(function () {   // not on this shelf: straight from the host's device
        return new Promise(function (ok) {
          NET.romWant = function (b) { ok({ id: m.id, sys: SYS_ID, name: m.name, file: m.file, size: b.length, data: new Blob([b]), net: true }); };
          if (NET.peer) NET.peer.send({ t: 'need' }, true);
        });
      })
      .then(function (c) { netStep('Loading ' + c.name); c.netGame = true; ConsoleNet.hold(); play(c); });
  }
  ConsoleNet.onBytes(function (k, bytes, meta) {
    if (k === 'nrom' && NET.romWant) { var f = NET.romWant; NET.romWant = null; f(bytes); }
    else if (k === 'nstart' && NET.mode === 'guest' && NET.peer) {
      var again = NET.live;
      if (meta.names) for (var s in meta.names) NET.names[s] = meta.names[s];
      if (meta.seat != null) NET.seat = meta.seat;
      ConsoleNet.begin({ peer: NET.peer, seat: NET.seat || 1, sid: meta.sid, seats: meta.seats || [0, 1], delay: meta.delay || 3, state: bytes, onEnd: netEnded });
      NET.live = true; if (meta.p1) NET.other = meta.p1;
      if (again) { netSeats(); netPeek(); return; }
      netOvClose(true); netLive();
    }
  });
  ConsoleNet.onProgress(function (k, frac) { if (k === 'nrom') netStep('Getting the cartridge from ' + NET.other + ' · ' + Math.round(frac * 100) + '%'); });

  // ── Leaving, and the others leaving ──
  function netEnded(why) {
    NET.live = false; netLiveOff();
    if (why === 'left') { Kit.toast(NET.other + ' left · you’re playing on your own'); Kit.haptic('warning'); }
    if (NET.mode === 'guest') { NET.mode = null; NET.peer = null; NET.cart = null; }
  }
  function netQuit() {
    var was = NET.mode, live = NET.live, table = NET.table, peer = NET.peer;
    ConsoleNet.end('quit');
    if (table) table.close();
    if (peer) peer.close('left');
    NET.mode = null; NET.table = null; NET.peer = null; NET.cart = null; NET.want = false; NET.live = false; NET.guests = []; NET.roster = []; NET.names = {};
    netOvClose(); netLiveOff();
    // a joiner leaving before the game began: the game loading underneath was the host's, back to the shelf
    if (was === 'guest' && !live && booted) location.replace(location.pathname);
    return Promise.resolve();
  }
  window.addEventListener('pagehide', function () { if (NET.table) NET.table.close(); if (NET.peer) NET.peer.close('left'); });

  // ── Playing online: who's who, and a word when the game waits for someone ──
  // Over the picture: a tag per seat (P1 to P4 in the table's colours, your own ringed, someone who left dimmed,
  // the one the game is waiting for pulsing), shown at the start, when someone joins, and while the game waits.
  var netHud = null, netT = 0;
  function netLive() {
    netLiveOff();
    var seats = el('div', { class: 'net-seats' }), veil = el('div', { class: 'net-veil' }, [el('i', { class: 'net-spin' }), el('i', { class: 'net-pz', html: Kit.icon('pause') }), el('b'), el('small')]);
    netHud = { seats: seats, veil: veil, sig: '' };
    netSeats();
    glassEl.appendChild(veil); glassEl.appendChild(seats);
    // after the table's "Let's play" spin: which player you are, and the names over the picture for a few seconds
    setTimeout(function () {
      if (!netHud || netHud.seats !== seats) return;
      Kit.callout && Kit.callout('Player ' + (ConsoleNet.seat() + 1)); Kit.haptic('success');
      netPeek();
    }, 1900);
    netT = setInterval(netTick, 120);
  }
  function netPeek() {
    if (!netHud) return;
    var h = netHud; h.seats.classList.add('on'); clearTimeout(h.peekT); h.peekUntil = Date.now() + 4500;
    h.peekT = setTimeout(function () { if (netHud === h && !h.veil.classList.contains('on')) h.seats.classList.remove('on'); }, 4500);
  }
  function netSeats() {
    if (!netHud) return;
    var st = ConsoleNet.status(); if (!st.on) return;
    var me = st.seat, wait = st.wait > 350 ? st.waitSeat : -1;
    var sig = [st.seats.join(), st.gone.join(), wait, st.seats.map(nameOf).join('|')].join('/');
    if (sig === netHud.sig) return;
    netHud.sig = sig;
    // someone left: their tag dims, and everyone sees it (the host has already said who)
    if (netHud.gone != null && st.gone.length > netHud.gone) { netPeek(); if (me !== 0) { Kit.toast(nameOf(st.gone[st.gone.length - 1]) + ' left'); Kit.haptic('warning'); } }
    netHud.gone = st.gone.length;
    netHud.seats.innerHTML = '';
    netHud.seats.classList.toggle('n3', st.seats.length > 2);
    st.seats.forEach(function (s) {
      var off = st.gone.indexOf(s) >= 0;
      netHud.seats.appendChild(el('span', { class: 'p' + (s + 1) + (s === me ? ' me' : '') + (off ? ' off' : '') + (s === wait ? ' wait' : '') }, [el('b', { text: 'P' + (s + 1) }), el('span', { text: nameOf(s) })]));
    });
  }
  function netLiveOff() { clearInterval(netT); if (netHud) { clearTimeout(netHud.peekT); netHud.seats.remove(); netHud.veil.remove(); netHud = null; } }
  function netTick() {
    if (!netHud) return;
    var st = ConsoleNet.status(), on = st.on && (st.paused || st.wait > 350);
    netSeats();
    if (on) {
      var who = st.paused ? nameOf(st.pausedSeat) : nameOf(st.waitSeat);
      netHud.veil.classList.toggle('pz', !!st.paused);
      netHud.veil.children[2].textContent = st.paused ? who + ' paused the game' : 'Waiting for ' + who;
      netHud.veil.children[3].textContent = st.paused ? 'It carries on when they close the menu' : st.wait > 4000 ? 'Their connection is slow or dropped out' : '';
    }
    if (on !== netHud.veil.classList.contains('on')) { netHud.veil.classList.toggle('on', on); netHud.seats.classList.toggle('on', on || Date.now() < (netHud.peekUntil || 0)); }
  }
  function ffOff() { if (!ffOn) return; ffOn = false; try { emu().gameManager.toggleFastForward(0); } catch (e) {} ctls.forEach(function (c) { if (c.t === 'ff') c.el.classList.remove('lit'); }); }

  // ═══ Kit shell ════════════════════════════════════════════════════════════
  function controls() {
    Kit.sheet({ title: 'Controls', html:
      '<p>On a phone or iPad the controller is drawn round the picture (turn sideways and it sits either side). Slide a finger from one button to the next, or touch between two face buttons to press both. A thumb on the D-pad keeps steering while it’s down, even if it drifts off the pad.</p>' +
      '<p>The <b>Menu</b> button on the controller opens this menu; <b>»</b> runs the game at triple speed until you tap it again.</p>' +
      ctlTable() +
      '<p><b>A real controller</b> (Bluetooth or USB) works too: connect it and press a button. The drawn one steps aside and the game fills the screen. <b>Home</b>, or <b>Select and Start</b> together, opens this menu. <b>Controller buttons</b> remaps it; each controller keeps its own layout for each console.</p>' +
      '<p><b>Two players:</b> connect a second controller and press a button on it; it becomes player 2. <b>Controller buttons</b> shows who’s who and can swap them.</p>' +
      '<p><b>Online:</b> each of you plays with your own device’s controls (drawn, keyboard or a real controller) as your own player; the host is player 1.' + (TAPS[SYS_ID] ? ' Up to four can play ' + SYS.name + ' games made for four (' + (SYS_ID === 'snes' ? 'Super Multitap games like Super Bomberman 2 and NBA Jam' : 'Team Player games') + ').' : '') + '</p>' });
  }
  var playing = function () { return !!cur; };
  var hostOrSolo = function () { return !!cur && !(NET.live && NET.mode === 'guest'); };   // online, the host's console has the Reset button
  Kit.init({
    id: SYS_ID,
    menu: [
      { icon: 'bookmark', label: 'Save state', sub: 'Keep this exact moment', when: playing, onClick: function () { slotsSheet(true); } },
      { icon: 'history', label: 'Load state', sub: 'Go back to a saved moment', when: hostOrSolo, onClick: function () { slotsSheet(false); } },
      { icon: 'globe', label: 'Play online', sub: TAPS[SYS_ID] ? 'Each player on their own device' : 'Two players, each on their own device', when: function () { return !NET.mode; }, onClick: goOnline },
      { icon: 'users', label: 'Your online table', sub: 'Who’s here, and Start', when: function () { return NET.mode === 'host' && !NET.live; }, onClick: netShowWait },
      { icon: 'logout', label: 'Leave the online game', sub: 'Keep playing on your own', when: function () { return !!NET.mode; }, onClick: function () { netQuit(); } },
      { icon: 'sync', label: 'Reset', sub: 'Like the console’s Reset button', when: hostOrSolo, onClick: function () {
        var E = emu(); if (!E) return;
        Kit.haptic('medium');
        if (ConsoleNet.on()) ConsoleNet.reset();   // online: both consoles, at the same frame
        else E.gameManager.restart();
      } },
      { icon: 'swap', label: 'Change cartridge', sub: 'Back to the ' + SYS.name + ' shelf', when: playing, onClick: toShelf },
      { icon: 'trophy', label: 'High scores', sub: 'The best scores in this game', when: function () { return !!hiW && L.shown(cur.id); }, onClick: function () {   // (the High Scores page lists the games on the home screen)
        var k = hiW.key; hiLeave(function () { var go = function () { ArcadeHi.show(k); }; if (started && !cur.netGame) saveState('auto').then(go, go); else go(); });
      } },
      { icon: 'gamepad', label: 'Controller buttons', sub: 'Remap a Bluetooth or USB controller', onClick: padSheet },
      { icon: 'help', label: 'Controls', onClick: controls }
    ],
    rules: function () { return '' +
      '<p class="goal">Play your own ' + SYS.name + ' games. Add the game files you own and they line up on the shelf as cartridges.</p>' +
      '<h3>Your games</h3><ul><li>Signed in with a PIN, everyone has the family’s games on the shelf. A game comes down the first time you play it on a device.</li>' +
      '<li>Tap the empty cartridge to add game files of your own (you can pick several at once).</li>' +
      '<li>Signed in with a PIN, they’re kept in your account, so every device you sign in on has them (a cloud badge means it comes down the first time you play it there). As a guest they stay on this device.</li>' +
      '<li>Each game gets its own tile in Consoles on the home screen, which starts it straight away. <b>Home tiles</b> on the shelf (or <b>Edit</b> on the home screen) chooses which games have one.</li>' +
      '<li><b>Download all</b> on the shelf puts every game there on this device, so they play offline. <b>Offline</b> in the home menu does every console at once.</li>' +
      '<li>Tap a cartridge to play it. Press and hold one to rename it, hide its tile, or take it off the shelf.</li></ul>' +
      '<h3>Playing</h3><ul><li>Use the controller drawn on the screen, a keyboard, or a real Bluetooth or USB controller (<b>Controller buttons</b> in the menu remaps it):</li></ul>' + ctlTable() + '<ul>' +
      '<li>Games that save on their own (battery saves) keep them on this device.</li>' +
      '<li>Games that keep a score put your best on the High Scores page.</li>' +
      '<li><b>Save state</b> and <b>Load state</b> in the menu keep and return to an exact moment, three slots per game. When you leave, the game pauses and your place is kept: it waits in <b>Keep playing</b> on the home screen, and carries on from there.</li></ul>' +
      '<h3>Online</h3><ul><li><b>Play online</b> in the menu: open a table for the game you’re playing and the others join it on their own devices. You’re player 1; the next to join is player 2' + (TAPS[SYS_ID] ? ', then 3 and 4 (in games made for four players' + (SYS_ID === 'genesis' ? ' with the Team Player' : '') + ')' : '') + '.</li>' +
      '<li>Their device gets the game from the family’s games, or straight from yours, and starts from exactly where you are. Someone can join a game under way: it starts again for everyone from that moment.</li>' +
      '<li>Every device plays the same game frame by frame. If one has to wait for another, the picture says who it’s waiting for. Opening the menu pauses the game for everyone.</li>' +
      '<li>Reset and Load state on player 1’s device happen on every device. If someone leaves, the rest carry on; if player 1 leaves, everyone plays on alone. Fast-forward is off while you play online.</li></ul>';
    }
  });

  // ═══ Start ════════════════════════════════════════════════════════════════
  root.classList.add('cs-on');
  var want = new URLSearchParams(location.search).get('play');
  function start() {
    L.list().then(function (list) {
      carts = list || [];
      var c = want && carts.filter(function (x) { return x.id === want; })[0];
      if (c) play(c); else drawShelf();
      hiPending();
      if (/[?&]online=1/.test(location.search)) goOnline();   // from home's "open tables", or a joiner's fresh page
    }).catch(function (e) { console.warn(e); view.innerHTML = ''; view.appendChild(el('p', { class: 'empty-note', text: 'This browser can’t keep game files (private browsing blocks it).' })); });
  }
  // signed in: wait for the account's settings (the library key) before listing
  if (window.FGHSync && FGHSync.isPin && FGHSync.isPin() && FGHSync.onReady) { var go = false; FGHSync.onReady(function () { if (!go) { go = true; start(); } }); setTimeout(function () { if (!go) { go = true; start(); } }, 4000); }
  else start();

  window.__cs = { net: { go: goOnline, state: function () { return NET; }, quit: netQuit }, carts: function () { return carts; }, emu: emu, started: function () { return started; }, press: press, saveState: saveState, getState: getState, ctls: function () { return ctls; }, hi: function () { return hiW; } };
})();
