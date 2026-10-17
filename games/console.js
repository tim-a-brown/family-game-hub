// ═══════════════════════════════════════════════════════════════════════════
// Consoles: NES, Super Nintendo and Sega Genesis, played from your own cartridges.
//
// The page (games/nes.html, snes.html, genesis.html) sets window.CONSOLE to 'nes' | 'snes' | 'genesis'.
// The shelf shows the console on its stand and the cartridges you've added (game files you own, read from
// this device). Tap one: it slides into the console, the TV switches on and the game runs in EmulatorJS
// (../emu/, the RetroArch cores fceumm, snes9x and genesis_plus_gx). Its own menus and on-screen pad are
// hidden; the controller drawn here, a keyboard or a real gamepad play it.
//
// Privacy: game files stay on this device (IndexedDB gn_console). Nothing is uploaded or synced.
//   carts  {id (SHA-1 of the file), sys, name, file, size, added, played, data: Blob}
//   states {key 'id:slot', id, slot ('auto' | 1..3), at, img (data URL), data: Uint8Array}
// The game's own battery saves (SRAM) are kept by EmulatorJS in its IndexedDB, per cartridge (EJS_gameName = id).
// ═══════════════════════════════════════════════════════════════════════════
(function () {
  'use strict';
  var SYS_ID = window.CONSOLE || 'nes';
  // Controller buttons are RetroArch's: 0 B, 1 Y, 2 Select, 3 Start, 4-7 up/down/left/right, 8 A, 9 X, 10 L, 11 R
  var SYSTEMS = {
    nes: {
      name: 'NES', core: 'nes', exts: ['nes', 'fds', 'unf', 'unif'], cw: 92, room: ['#2a2830', '#0c0b10'], wood: ['#7d5a3c', '#4b321e'],
      keys: 'Arrow keys move · Z is A · X is B · Enter is Start · V is Select'
    },
    snes: {
      name: 'Super Nintendo', core: 'snes', exts: ['sfc', 'smc', 'fig', 'swc', 'bs'], cw: 124, room: ['#2c2838', '#0d0b14'], wood: ['#80603f', '#4d3520'],
      keys: 'Arrow keys move · Z is A · X is B · A is X · S is Y · Q and E are L and R · Enter is Start · V is Select'
    },
    genesis: {
      name: 'Sega Genesis', core: 'segaMD', exts: ['md', 'gen', 'smd', 'bin'], cw: 100, room: ['#26262c', '#0a0a0d'], wood: ['#6e5038', '#422c1b'],
      keys: 'Arrow keys move · S is A · X is B · Z is C · Enter is Start'
    }
  };
  var SYS = SYSTEMS[SYS_ID];
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

  // ═══ Storage (this device only) ═════════════════════════════════════════
  var dbP = null;
  function db() {
    if (dbP) return dbP;
    dbP = new Promise(function (ok, no) {
      var r = indexedDB.open('gn_console', 1);
      r.onupgradeneeded = function () {
        var d = r.result;
        if (!d.objectStoreNames.contains('carts')) d.createObjectStore('carts', { keyPath: 'id' }).createIndex('sys', 'sys');
        if (!d.objectStoreNames.contains('states')) d.createObjectStore('states', { keyPath: 'key' }).createIndex('id', 'id');
      };
      r.onsuccess = function () { ok(r.result); }; r.onerror = function () { no(r.error); };
    });
    return dbP;
  }
  function tx(store, mode, fn) {
    return db().then(function (d) {
      return new Promise(function (ok, no) {
        var t = d.transaction(store, mode), s = t.objectStore(store), out;
        var r = fn(s); if (r) r.onsuccess = function () { out = r.result; };
        t.oncomplete = function () { ok(out); }; t.onerror = function () { no(t.error); }; t.onabort = function () { no(t.error); };
      });
    });
  }
  function cartsOf(sys) { return tx('carts', 'readonly', function (s) { return s.index('sys').getAll(sys); }); }
  function getCart(id) { return tx('carts', 'readonly', function (s) { return s.get(id); }); }
  function putCart(c) { return tx('carts', 'readwrite', function (s) { s.put(c); }); }
  function delCart(id) {
    return tx('carts', 'readwrite', function (s) { s.delete(id); }).then(function () {
      return tx('states', 'readwrite', function (s) { var r = s.index('id').openCursor(IDBKeyRange.only(id)); r.onsuccess = function () { var c = r.result; if (c) { c.delete(); c.continue(); } }; });
    });
  }
  function statesOf(id) { return tx('states', 'readonly', function (s) { return s.index('id').getAll(id); }); }
  function putState(st) { return tx('states', 'readwrite', function (s) { s.put(st); }); }
  function getState(id, slot) { return tx('states', 'readonly', function (s) { return s.get(id + ':' + slot); }); }

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
  function sysOfFile(name) {
    var ext = (name.split('.').pop() || '').toLowerCase();
    for (var k in SYSTEMS) if (SYSTEMS[k].exts.indexOf(ext) >= 0 && !(k === 'genesis' && ext === 'bin' && SYS_ID !== 'genesis')) return k;
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
      '<text x="264" y="124" font-size="7" fill="#8a8a94" text-anchor="middle" font-family="sans-serif" font-weight="700">RESET</text>' }
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
    } }
  };
  var LABELS = [['#f4d94a', '#17130b'], ['#e2403c', '#fff8ec'], ['#1f3f74', '#fff8ec'], ['#2a9d8f', '#fff8ec'], ['#f3efe4', '#1a1a22'],
    ['#ff9b2e', '#1a1208'], ['#6b4b9a', '#fff8ec'], ['#141418', '#ffd23d'], ['#3d8b3d', '#fff8ec'], ['#c2185b', '#fff8ec']];
  function hashOf(s) { var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); }

  function cartW() { return Math.round(SYS.cw * Math.max(1, Math.min(1.45, (Math.min(window.innerWidth, 900) - 40) / 520))); }
  function cartEl(c, opts) {
    opts = opts || {};
    var C = CARTS[SYS_ID], w = cartW(), lb = LABELS[hashOf(c ? c.id + c.name : '+') % LABELS.length];
    var b = el('button', { type: 'button', class: 'cart' + (opts.add ? ' add' : '') + (opts.fresh ? ' new' : ''), 'aria-label': c ? c.name : 'Add cartridges',
      style: { '--cw': w + 'px', '--lx': (C.lab[0] * 100) + '%', '--ly': (C.lab[1] * w * C.vb[1] / C.vb[0]) + 'px', '--lw': (C.lab[2] * 100) + '%',
        '--lh': (C.lab[3] * w * C.vb[1] / C.vb[0]) + 'px', '--lab': lb[0], '--lab-ink': lb[1] } });
    var shell = opts.add
      ? '<svg viewBox="0 0 ' + C.vb[0] + ' ' + C.vb[1] + '"><rect x="4" y="4" width="' + (C.vb[0] - 8) + '" height="' + (C.vb[1] - 8) + '" rx="10" fill="rgba(255,236,210,.05)" stroke="rgba(255,236,210,.45)" stroke-width="2.5" stroke-dasharray="7 6"/></svg>'
      : '<svg viewBox="0 0 ' + C.vb[0] + ' ' + C.vb[1] + '">' + C.svg() + '</svg>';
    b.innerHTML = shell;
    if (opts.add) b.appendChild(el('span', { class: 'plus', html: Kit.icon('plus') + '<span>Add games</span>' }));
    else {
      var n = c.name, fs = n.length <= 8 ? 17 : n.length <= 14 ? 15 : n.length <= 24 ? 13 : 11.5;
      // the longest word has to fit across the label on one line
      var longest = n.split(/\s+/).reduce(function (m, x) { return Math.max(m, x.length); }, 1), across = C.lab[2] * 100 - 8;
      fs = Math.min(fs, across / (longest * .56));
      b.style.setProperty('--fs', Math.round(fs * w / 100) + 'px');
      b.appendChild(el('span', { class: 'lab' }, [el('b', { text: n })]));
    }
    return b;
  }

  // ═══ The shelf ════════════════════════════════════════════════════════════
  var view = $('cs'), carts = [], unitEl = null;
  function drawShelf(freshIds) {
    view.innerHTML = '';
    var sv = el('div', { class: 'shelf-view' });
    var U = UNITS[SYS_ID];
    unitEl = el('div', { class: 'unit', html: '<svg viewBox="' + U.vb.join(' ') + '">' + U.svg + '</svg>' });
    sv.appendChild(el('div', { class: 'stand' }, [unitEl, el('div', { class: 'top wood' }), el('div', { class: 'lip' })]));
    var wrap = el('div', { class: 'shelves' }); sv.appendChild(wrap);
    view.appendChild(sv);
    var all = carts.slice().sort(function (a, b) { return (b.played || b.added) - (a.played || a.added); });
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
    if (!carts.length) sv.appendChild(el('p', { class: 'empty-note', text: 'Add the ' + SYS.name + ' game files you own. They stay on this device and nothing is uploaded.' }));
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
  function cartMenu(c) {
    var s = Kit.sheet({ title: c.name, node: el('div', { class: 'k-list' }, [
      el('button', { type: 'button', onclick: function () { s.close(); renameCart(c); } }, [el('span', { class: 'ic', html: Kit.icon('pencil') }), el('span', { class: 'lbl' }, [el('span', { text: 'Rename' })])]),
      el('button', { type: 'button', onclick: function () {
        s.close();
        Kit.confirm('Take ' + c.name + ' off the shelf?', { ok: 'Remove', danger: true, body: 'Its game file and save states are deleted from this device. Its battery saves stay, in case you add it again.' })
          .then(function (ok) { if (!ok) return; delCart(c.id).then(function () { carts = carts.filter(function (x) { return x.id !== c.id; }); drawShelf(); Kit.toast('Removed'); }); });
      } }, [el('span', { class: 'ic', html: Kit.icon('trash') }), el('span', { class: 'lbl' }, [el('span', { text: 'Remove from this device' }), el('small', { text: c.file + ' · ' + Math.round(c.size / 1024) + ' KB' })])])
    ]) });
  }
  function renameCart(c) {
    var inp = el('input', { type: 'text', value: c.name, maxlength: '48', class: 'k-input', style: { width: '100%' } });
    var s = Kit.sheet({ title: 'Rename', node: inp, actions: [
      { label: 'Save', cls: 'btn-primary', onClick: function () { var v = inp.value.trim(); if (!v) return; c.name = v; putCart(c).then(drawShelf); } },
      { label: 'Cancel', cls: 'btn-soft' }] });
    setTimeout(function () { inp.focus(); inp.select(); }, 120); void s;
  }

  // ── Adding cartridges: the file picker ──
  var picker = el('input', { type: 'file', multiple: '', style: { display: 'none' } });
  document.body.appendChild(picker);
  function pickFiles() { Kit.sfx('tap'); picker.value = ''; picker.click(); }
  picker.addEventListener('change', function () {
    var files = Array.prototype.slice.call(picker.files || []); if (!files.length) return;
    var fresh = [], elsewhere = {}, skipped = [];
    files.reduce(function (p, f) {
      return p.then(function () {
        var sys = sysOfFile(f.name); if (!sys) { skipped.push(f.name); return; }
        return f.arrayBuffer().then(function (buf) {
          return sha1(buf).then(function (id) {
            var rec = { id: id, sys: sys, name: cleanName(f.name), file: f.name, size: f.size, added: Date.now(), played: 0, data: new Blob([buf]) };
            return getCart(id).then(function (old) {
              if (old) { rec.name = old.name; rec.added = old.added; rec.played = old.played; }
              return putCart(rec).then(function () {
                if (sys === SYS_ID) { carts = carts.filter(function (x) { return x.id !== id; }); carts.push(rec); fresh.push(id); }
                else elsewhere[sys] = (elsewhere[sys] || 0) + 1;
              });
            });
          });
        });
      });
    }, Promise.resolve()).then(function () {
      if (fresh.length) { Kit.sfx('chip'); Kit.haptic('success'); }
      drawShelf(fresh);
      Object.keys(elsewhere).forEach(function (k) { Kit.toast(elsewhere[k] + (elsewhere[k] === 1 ? ' game' : ' games') + ' put on the ' + SYSTEMS[k].name + ' shelf'); });
      if (skipped.length) Kit.toast(skipped.length === 1 ? skipped[0] + ' isn’t a game file this console plays' : skipped.length + ' files aren’t game files this console plays');
    }).catch(function (e) { console.warn(e); Kit.toast('Couldn’t read that file'); });
  });

  // ── Into the console: the cartridge flies to the slot, the light comes on, the TV takes over ──
  var busy = false;
  function insert(c, b) {
    if (busy) return; busy = true;
    if (booted) { location.replace(location.pathname + '?play=' + c.id); return; }   // one game per page load
    Kit.haptic('light');
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
  // the set warming up: a high whine that fades, and a soft thump
  function hum() {
    var a = ac(); if (!a || !sndOn()) return; var t = a.currentTime;
    var o = a.createOscillator(), g = a.createGain(); o.type = 'sine'; o.frequency.value = 15700; g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.02, t + .05); g.gain.exponentialRampToValueAtTime(.0001, t + 1.2);
    o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + 1.3);
    var o2 = a.createOscillator(), g2 = a.createGain(); o2.type = 'sine'; o2.frequency.setValueAtTime(90, t); o2.frequency.exponentialRampToValueAtTime(40, t + .25);
    g2.gain.setValueAtTime(.12, t); g2.gain.exponentialRampToValueAtTime(.0001, t + .3); o2.connect(g2); g2.connect(a.destination); o2.start(t); o2.stop(t + .32);
  }

  // ═══ The TV ═══════════════════════════════════════════════════════════════
  var cur = null, booted = false, started = false, tvEl = null, glassEl = null, padEl = null, resumeEl = null;
  function play(c) {
    cur = c; c.played = Date.now(); putCart(c);
    Kit.titleSwitch && Kit.titleSwitch(c.name, function () { toShelf(); }, 'Change cartridge');
    view.innerHTML = '';
    var tv = el('div', { class: 'tv-view' });
    tvEl = el('div', { class: 'tv' });
    glassEl = el('div', { class: 'glass loading' }, [el('div', { id: 'ejs' }), snowCanvas(), el('div', { class: 'boot' }), el('div', { class: 'tv-msg', id: 'tv-msg', text: '' })]);
    tvEl.appendChild(glassEl); tvEl.appendChild(el('i', { class: 'knob a' })); tvEl.appendChild(el('i', { class: 'knob b' })); tvEl.appendChild(el('i', { class: 'pwr' }));
    tv.appendChild(tvEl);
    padEl = buildPad(); tv.appendChild(padEl);
    view.appendChild(tv);
    fitTV();
    requestAnimationFrame(function () { tvEl.classList.add('on'); hum(); });
    boot(c);
  }
  function fitTV() {
    if (!tvEl) return;
    var vw = view.clientWidth, vh = view.clientHeight, land = window.matchMedia('(orientation:landscape) and (max-height:540px)').matches;
    var padH = padEl && !padEl.hidden && !land ? Math.min(230, vh * .36) : 0;
    var w = Math.min(vw - 20 - 28, 760, (vh - padH - 24 - 44) * 4 / 3);
    if (land && padEl && !padEl.hidden) w = Math.min(w, vw - 2 * 170 - 28);
    w = Math.max(180, Math.floor(w));
    glassEl.style.width = w + 'px'; glassEl.style.height = Math.round(w * 3 / 4) + 'px';
  }
  window.addEventListener('resize', function () { if (tvEl) fitTV(); else if (!cur) drawShelf(); });

  // static on the glass while the game loads
  function snowCanvas() {
    var c = el('canvas', { class: 'snow', width: '160', height: '120' }), x = c.getContext('2d'), img = x.createImageData(160, 120);
    (function tick() {
      if (started) return;
      for (var i = 0; i < img.data.length; i += 4) { var v = Math.random() * 255 | 0; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
      x.putImageData(img, 0, 0); setTimeout(function () { requestAnimationFrame(tick); }, 50);
    })();
    c.style.width = '100%'; c.style.height = '100%';
    return c;
  }
  function msg(t) { var m = $('tv-msg'); if (m) m.textContent = t || ''; }

  function boot(c) {
    booted = true; msg('Loading');
    var vol = sndOn() ? .5 : 0;
    window.EJS_player = '#ejs';
    window.EJS_core = SYS.core;
    window.EJS_gameUrl = new File([c.data], c.file);
    window.EJS_gameName = c.id;
    window.EJS_pathtodata = '../emu/';
    window.EJS_startOnLoaded = true;
    window.EJS_disableAutoLang = false;
    window.EJS_volume = vol;
    window.EJS_color = '#ffc83d';
    window.EJS_backgroundColor = '#000';
    window.EJS_Buttons = { playPause: false, restart: false, mute: false, settings: false, fullscreen: false, saveState: false, loadState: false, screenRecord: false,
      gamepad: false, cheat: false, volume: false, saveSavFiles: false, loadSavFiles: false, quickSave: false, quickLoad: false, screenshot: false, cacheManager: false,
      exitEmulation: false, netplay: false, diskButton: false, contextMenu: false, rightClick: false };
    window.EJS_defaultOptions = { 'virtual-gamepad': 'disabled', 'save-state-location': 'browser' };
    window.EJS_onGameStart = function () {
      started = true; msg('');
      glassEl.classList.remove('loading');
      getState(c.id, 'auto').then(function (st) { if (st) offerResume(st); });
    };
    var s = document.createElement('script'); s.src = '../emu/loader.js'; document.body.appendChild(s);
    // while the core loads, its progress shows on the glass
    var poll = setInterval(function () {
      if (started) return clearInterval(poll);
      var t = document.querySelector('#ejs .ejs_loading_text'); if (t && t.textContent) msg(t.textContent.replace(/Download Game Core/, 'Warming up').replace(/Download Game Data/, 'Reading cartridge'));
    }, 200);
  }
  function emu() { return window.EJS_emulator && window.EJS_emulator.gameManager ? window.EJS_emulator : null; }
  function press(i, v) { var e = emu(); if (e && started) try { e.gameManager.simulateInput(0, i, v); } catch (er) {} }

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
      var box = el('div', { class: 'cs-slots' });
      var s;
      slots.forEach(function (k) {
        var st = by[k], empty = !st;
        if (!saving && empty) return;
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
    if (started) saveState('auto').then(function () { location.replace(location.pathname); });
    else location.replace(location.pathname);
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

  // ═══ The controller (touch) ═══════════════════════════════════════════════
  // Each system's own pad: the D-pad on the left, Select/Start in the middle, its face buttons on the right.
  var PADS = {
    nes: { body: '#2b2a2e', face: '#d7d4cf', btns: [['B', 0, '#d0262b', 24, 60, 20], ['A', 8, '#d0262b', 74, 46, 20]], mid: [['SELECT', 2], ['START', 3]] },
    snes: { body: '#cfccd4', face: '#cfccd4', btns: [['Y', 1, '#2b9b4b', 20, 52, 17], ['X', 9, '#2f63c8', 60, 22, 17], ['B', 0, '#e7b81e', 60, 82, 17], ['A', 8, '#d22a35', 100, 52, 17]],
      mid: [['SELECT', 2], ['START', 3]], shoulders: [['L', 10], ['R', 11]] },
    genesis: { body: '#141416', face: '#141416', btns: [['A', 1, '#2a2a2e', 18, 70, 17], ['B', 0, '#2a2a2e', 60, 58, 17], ['C', 8, '#2a2a2e', 102, 46, 17]], mid: [['START', 3]] }
  };
  function buildPad() {
    var P = PADS[SYS_ID];
    var pad = el('div', { class: 'pad', 'data-sys': SYS_ID });
    // the body of the controller, drawn behind both halves
    pad.appendChild(el('div', { class: 'body', html: '<svg width="100%" height="100%" viewBox="0 0 460 200" preserveAspectRatio="none">' + padBody(SYS_ID) + '</svg>' }));
    var L = el('div', { class: 'half l', html:
      '<svg width="150" height="150" viewBox="0 0 150 150">' +
      (SYS_ID === 'genesis' ? '<circle cx="75" cy="75" r="62" fill="#222226"/><circle cx="75" cy="75" r="54" fill="#2e2e33"/>' : '<circle cx="75" cy="75" r="62" fill="' + (SYS_ID === 'snes' ? '#bab6c0' : '#c8c4bd') + '" opacity=".55"/>') +
      '<g class="dp">' +
      '<rect class="arm" data-d="u" x="56" y="16" width="38" height="46" rx="5" fill="' + (SYS_ID === 'genesis' ? '#3a3a40' : '#1d1c1f') + '"/>' +
      '<rect class="arm" data-d="d" x="56" y="88" width="38" height="46" rx="5" fill="' + (SYS_ID === 'genesis' ? '#3a3a40' : '#1d1c1f') + '"/>' +
      '<rect class="arm" data-d="l" x="16" y="56" width="46" height="38" rx="5" fill="' + (SYS_ID === 'genesis' ? '#3a3a40' : '#1d1c1f') + '"/>' +
      '<rect class="arm" data-d="r" x="88" y="56" width="46" height="38" rx="5" fill="' + (SYS_ID === 'genesis' ? '#3a3a40' : '#1d1c1f') + '"/>' +
      '<rect x="56" y="56" width="38" height="38" fill="' + (SYS_ID === 'genesis' ? '#3a3a40' : '#1d1c1f') + '"/><circle cx="75" cy="75" r="9" fill="#000" opacity=".25"/>' +
      '<path d="M75 24l7 10h-14zM75 126l7-10h-14zM24 75l10-7v14zM126 75l-10-7v14z" fill="#fff" opacity=".18"/></g></svg>' });
    var mid = el('div', { class: 'half m', style: { '--mw': (P.mid.length * 52) + 'px' } }), mh = '<svg width="' + (P.mid.length * 52) + '" height="60" viewBox="0 0 ' + (P.mid.length * 52) + ' 60">';
    P.mid.forEach(function (m, i) {
      mh += '<g data-b="' + m[1] + '"><rect x="' + (i * 52 + 6) + '" y="20" width="40" height="13" rx="6.5" fill="' + (SYS_ID === 'genesis' ? '#2a2a2e' : '#3a393d') + '" transform="rotate(' + (SYS_ID === 'genesis' ? 0 : -18) + ' ' + (i * 52 + 26) + ' 26)"/>' +
        '<text x="' + (i * 52 + 26) + '" y="52" font-size="10" text-anchor="middle" font-family="sans-serif" font-weight="800" fill="' + (SYS_ID === 'genesis' ? '#8a8a94' : '#c0302c') + '">' + m[0] + '</text></g>';
    });
    mid.innerHTML = mh + '</svg>';
    var R = el('div', { class: 'half r' }), rh = '<svg width="150" height="150" viewBox="0 0 150 150">';
    if (SYS_ID === 'snes') rh += '<circle cx="80" cy="75" r="64" fill="#bab6c0" opacity=".55"/>';
    if (SYS_ID === 'nes') rh += '<rect x="2" y="26" width="146" height="76" rx="10" fill="#c8c4bd" opacity=".55"/>';
    P.btns.forEach(function (b) {
      rh += '<g data-b="' + b[1] + '"><circle cx="' + (b[3] + 14) + '" cy="' + (b[4] + 4) + '" r="' + (b[5] + 3) + '" fill="#000" opacity=".25"/>' +
        '<circle cx="' + (b[3] + 14) + '" cy="' + b[4] + '" r="' + b[5] + '" fill="' + b[2] + '"/>' +
        '<circle cx="' + (b[3] + 10) + '" cy="' + (b[4] - 5) + '" r="' + (b[5] * .45) + '" fill="#fff" opacity=".18"/>' +
        (SYS_ID === 'genesis' ? '<text x="' + (b[3] + 14) + '" y="' + (b[4] + 5) + '" font-size="15" text-anchor="middle" font-family="sans-serif" font-weight="900" fill="#cfcfd8">' + b[0] + '</text>'
          : SYS_ID === 'snes' ? '<text x="' + (b[3] + 14) + '" y="' + (b[4] + 5) + '" font-size="13" text-anchor="middle" font-family="sans-serif" font-weight="900" fill="#fff" opacity=".85">' + b[0] + '</text>'
          : '<text x="' + (b[3] + 14) + '" y="' + (b[4] + b[5] + 16) + '" font-size="13" text-anchor="middle" font-family="sans-serif" font-weight="900" fill="#c0302c">' + b[0] + '</text>') + '</g>';
    });
    R.innerHTML = rh + '</svg>';
    pad.appendChild(L);
    if (P.shoulders) {
      // L and R on the controller's top edge
      var sh = el('div', { class: 'half sh', html: '<svg width="0" height="0"></svg>' }); void sh;
      L.insertAdjacentHTML('afterbegin', '<svg class="shl" width="70" height="26" viewBox="0 0 70 26" style="position:absolute;left:10px;top:-24px"><g data-b="10"><path d="M4 24 Q8 4 30 3 H66 V24 Z" fill="#a9a5b0"/><text x="40" y="18" font-size="11" font-family="sans-serif" font-weight="900" fill="#5d5867">L</text></g></svg>');
      R.insertAdjacentHTML('afterbegin', '<svg class="shr" width="70" height="26" viewBox="0 0 70 26" style="position:absolute;right:6px;top:-24px"><g data-b="11"><path d="M66 24 Q62 4 40 3 H4 V24 Z" fill="#a9a5b0"/><text x="26" y="18" font-size="11" font-family="sans-serif" font-weight="900" fill="#5d5867">R</text></g></svg>');
    }
    pad.appendChild(mid); pad.appendChild(R);
    wirePad(pad);
    // a real controller or a keyboard takes over from the drawn one
    var touch = matchMedia('(pointer:coarse)').matches || 'ontouchstart' in window;
    pad.hidden = !touch;
    window.addEventListener('gamepadconnected', function () { pad.hidden = true; fitTV(); Kit.toast('Controller connected'); });
    window.addEventListener('touchstart', function () { if (pad.hidden && !(navigator.getGamepads && Array.prototype.some.call(navigator.getGamepads(), Boolean))) { pad.hidden = false; fitTV(); } }, { passive: true });
    return pad;
  }
  function padBody(id) {
    if (id === 'nes') return '<rect x="0" y="0" width="460" height="200" rx="14" fill="#2b2a2e"/><rect x="8" y="8" width="444" height="184" rx="10" fill="#1f1e22"/>' +
      '<rect x="170" y="30" width="120" height="140" rx="6" fill="#d7d4cf"/>' + (function () { var s = ''; for (var i = 0; i < 4; i++) s += '<rect x="178" y="' + (40 + i * 14) + '" width="104" height="8" rx="4" fill="#bdb9b2"/>'; return s; })();
    if (id === 'snes') return '<path d="M100 6 H360 Q456 6 456 100 Q456 194 360 194 Q300 194 270 160 H190 Q160 194 100 194 Q4 194 4 100 Q4 6 100 6 Z" fill="#cfccd4"/>' +
      '<path d="M100 14 H360 Q448 14 448 100 Q448 186 360 186 Q304 186 276 154 H184 Q156 186 100 186 Q12 186 12 100 Q12 14 100 14 Z" fill="none" stroke="#b7b3bd" stroke-width="2"/>';
    return '<path d="M60 10 H400 Q456 10 456 70 Q456 150 380 190 Q330 160 230 160 Q130 160 80 190 Q4 150 4 70 Q4 10 60 10 Z" fill="#141416"/>' +
      '<path d="M66 18 H394 Q448 18 448 70 Q448 140 380 180" fill="none" stroke="#26262a" stroke-width="3"/>';
  }
  // Fingers press, slide between buttons (B to A and back, as on the real pad) and the D-pad reads 8 ways
  function wirePad(pad) {
    var touches = {}, held = {};
    function setHeld(next) {
      for (var k in held) if (!next[k]) { press(+k, 0); held[k] = 0; delete held[k]; mark(k, false); }
      for (var j in next) if (!held[j]) { press(+j, 1); held[j] = 1; mark(j, true); Kit.haptic('light'); }
    }
    function mark(i, on) {
      var g = pad.querySelectorAll('[data-b="' + i + '"]'); for (var n = 0; n < g.length; n++) g[n].classList.toggle('on', on);
      var d = { 4: 'u', 5: 'd', 6: 'l', 7: 'r' }[i]; if (d) { var a = pad.querySelector('.arm[data-d="' + d + '"]'); if (a) a.classList.toggle('on', on); }
    }
    function read(x, y) {
      var out = [], t = document.elementFromPoint(x, y);
      var dp = pad.querySelector('.dp'), r = dp.getBoundingClientRect();
      var cx = r.left + r.width / 2, cy = r.top + r.height / 2, dx = x - cx, dy = y - cy, rr = r.width * .62;
      if (dx * dx + dy * dy < rr * rr && dx * dx + dy * dy > 36) {
        var ang = Math.atan2(dy, dx) * 180 / Math.PI;   // 8 ways: each direction covers 67.5 degrees, diagonals overlap
        if (ang > -157.5 && ang < -22.5) out.push(4);
        if (ang > 22.5 && ang < 157.5) out.push(5);
        if (ang > 112.5 || ang < -112.5) out.push(6);
        if (ang > -67.5 && ang < 67.5) out.push(7);
        return out;
      }
      var g = t && t.closest && t.closest('[data-b]');
      if (g && pad.contains(g)) out.push(+g.getAttribute('data-b'));
      return out;
    }
    function update() { var next = {}; for (var id in touches) touches[id].forEach(function (i) { next[i] = 1; }); setHeld(next); }
    pad.addEventListener('pointerdown', function (e) { e.preventDefault(); try { pad.setPointerCapture(e.pointerId); } catch (er) {} touches[e.pointerId] = read(e.clientX, e.clientY); update(); ac(); });
    pad.addEventListener('pointermove', function (e) { if (!touches[e.pointerId]) return; touches[e.pointerId] = read(e.clientX, e.clientY); update(); });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (k) { pad.addEventListener(k, function (e) { delete touches[e.pointerId]; update(); }); });
    pad.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  }

  // ═══ Kit shell ════════════════════════════════════════════════════════════
  function controls() {
    Kit.sheet({ title: 'Controls', html:
      '<p>On the screen: the controller under the TV (turn your phone sideways and it sits either side). Slide a finger from one button to the next to press both in turn.</p>' +
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
      { icon: 'swap', label: 'Change cartridge', when: playing, onClick: toShelf },
      { icon: 'gamepad', label: 'Controls', onClick: controls }
    ],
    rules:
      '<p class="goal">Play your own ' + SYS.name + ' games. Add the game files you own and they line up on the shelf as cartridges.</p>' +
      '<h3>Your games</h3><ul><li>Tap the empty cartridge to add game files (you can pick several at once). Files are read from this device and stay on it; nothing is uploaded.</li>' +
      '<li>Tap a cartridge to play it. Press and hold one to rename it or take it off the shelf.</li>' +
      '<li>Each device has its own shelf, so add your games on each phone or iPad you play on.</li></ul>' +
      '<h3>Playing</h3><ul><li>Use the controller under the TV, a keyboard (' + SYS.keys + '), or a real Bluetooth or USB controller.</li>' +
      '<li>Games that save on their own (battery saves) keep them on this device.</li>' +
      '<li>The menu has <b>Save state</b> and <b>Load state</b> to keep and return to an exact moment, three slots per game. When you leave, your place is kept and you can carry on next time.</li></ul>'
  });

  // ═══ Start ════════════════════════════════════════════════════════════════
  document.documentElement.classList.add('cs-on');
  var want = new URLSearchParams(location.search).get('play');
  cartsOf(SYS_ID).then(function (list) {
    carts = list || [];
    var c = want && carts.filter(function (x) { return x.id === want; })[0];
    if (c) {
      // came back with a cartridge chosen: it's in the console; the power button starts it (audio needs a tap)
      drawShelf(); unitEl.classList.add('on');
      var go = function () { document.removeEventListener('pointerdown', go, true); play(c); };
      var hint = el('p', { class: 'empty-note', text: 'Tap anywhere to switch on' });
      view.querySelector('.stand').appendChild(hint);
      document.addEventListener('pointerdown', go, true);
    } else drawShelf();
  }).catch(function (e) { console.warn(e); view.innerHTML = ''; view.appendChild(el('p', { class: 'empty-note', text: 'This browser can’t keep game files (private browsing blocks it).' })); });

  window.__cs = { db: db, carts: function () { return carts; }, emu: emu, started: function () { return started; }, press: press, saveState: saveState, getState: getState };
})();
