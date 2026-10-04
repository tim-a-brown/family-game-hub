// ═══════════════════════════════════════════════════════════════════════════
// Game Night kit: the shared shell every game page runs on.
//
// Load order in a game page:
//   <link rel="stylesheet" href="../kit.css">
//   <script src="../sync.js"></script>
//   <script src="../games.js"></script>
//   <script src="../kit.js"></script>
//   (optional) hist.js, players.js, casino.js, arcade-hi.js
//
// API (all on window.Kit)
//   Kit.init({id, rules, menu, onNew, wide})  build the game bar, set accent
//   Kit.setup(root, {...})                     standard "who's playing" screen
//   Kit.win({...})                             celebration + results card
//   Kit.sheet({title, html|node, actions})     bottom sheet; returns {close}
//   Kit.confirm(msg, {ok, danger})             -> Promise<bool>
//   Kit.toast(msg)   Kit.callout(text)         quick feedback
//   Kit.confetti()   Kit.sfx(name)   Kit.haptic(kind)
//   Kit.card(rank, suit, {back, cls})          playing-card element
//   Kit.die(value)                             die element
//   Kit.color(i)                               player colour for seat i
//   Kit.resume.set(label) / .clear()           "Continue" rail on home
//   Kit.rules()                                open the rules sheet
// window.GN is kept as an alias for haptic/toast/confirm/sheet.
// ═══════════════════════════════════════════════════════════════════════════
(function () {
  'use strict';
  if (window.Kit) return;
  var doc = document, root = doc.documentElement;
  var LS = (function () { try { return window.localStorage; } catch (e) { return null; } })();
  function lsGet(k, d) { try { var v = LS.getItem(k); return v == null ? d : v; } catch (e) { return d; } }
  function lsSet(k, v) { try { LS.setItem(k, v); } catch (e) {} }

  // ── Page metas, manifest, gestures, wake lock ─────────────────────────────
  function meta(name, content) {
    var m = doc.querySelector('meta[name="' + name + '"]');
    if (!m) { m = doc.createElement('meta'); m.name = name; doc.head.appendChild(m); }
    m.content = content;
  }
  meta('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover');
  meta('theme-color', '#141029');
  meta('apple-mobile-web-app-capable', 'yes');
  meta('mobile-web-app-capable', 'yes');
  meta('apple-mobile-web-app-status-bar-style', 'black-translucent');
  if (!doc.querySelector('link[rel="manifest"]')) {
    var mf = doc.createElement('link'); mf.rel = 'manifest'; mf.href = '/manifest.json'; doc.head.appendChild(mf);
  }
  if (!doc.querySelector('link[rel="icon"]')) {
    var ic = doc.createElement('link'); ic.rel = 'icon'; ic.href = '/icon-192.png'; doc.head.appendChild(ic);
  }
  ['gesturestart', 'gesturechange'].forEach(function (t) {
    doc.addEventListener(t, function (e) { e.preventDefault(); }, { passive: false });
  });
  doc.addEventListener('touchstart', function () {}, { passive: true }); // enables :active on iOS

  var wake = null;
  function requestWake() {
    if (!('wakeLock' in navigator) || doc.visibilityState !== 'visible') return;
    navigator.wakeLock.request('screen').then(function (w) { wake = w; }).catch(function () {});
  }
  doc.addEventListener('visibilitychange', function () { if (doc.visibilityState === 'visible') requestWake(); });

  // ── Small DOM helper ──────────────────────────────────────────────────────
  function el(tag, attrs, kids) {
    var n = doc.createElement(tag);
    if (attrs) for (var k in attrs) {
      var v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'class') n.className = v;
      else if (k === 'html') n.innerHTML = v;
      else if (k === 'text') n.textContent = v;
      else if (k.slice(0, 2) === 'on') n.addEventListener(k.slice(2), v);
      else if (k === 'style' && typeof v === 'object') for (var s in v) n.style.setProperty(s, v[s]);
      else n.setAttribute(k, v === true ? '' : v);
    }
    (kids || []).forEach(function (c) { if (c != null) n.appendChild(typeof c === 'string' ? doc.createTextNode(c) : c); });
    return n;
  }
  // "Your turn" for the player called You, "Sam's turn" otherwise
  function poss(n) { return n === 'You' ? 'Your' : n + "'s"; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return '&#' + c.charCodeAt(0) + ';'; }); }

  var ICON = {
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>',
    help: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>',
    more: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2.2"/><circle cx="12" cy="12" r="2.2"/><circle cx="19" cy="12" r="2.2"/></svg>'
  };

  // ── Haptics ───────────────────────────────────────────────────────────────
  var HAPTIC = { light: 8, medium: 16, heavy: 30, success: [12, 60, 18], error: [30, 40, 30], tick: 4 };
  function haptic(kind) {
    try { if (navigator.vibrate) navigator.vibrate(HAPTIC[kind] || HAPTIC.light); } catch (e) {}
  }

  // ── Sound: tiny synthesized effects, no files to download ─────────────────
  var actx = null;
  function soundOn() { return lsGet('gn_sound', '1') === '1'; }
  function ctx() {
    if (!actx) { var C = window.AudioContext || window.webkitAudioContext; if (!C) return null; actx = new C(); }
    if (actx.state === 'suspended') actx.resume();
    return actx;
  }
  function tone(freq, t0, dur, type, vol, slideTo) {
    var a = ctx(); if (!a) return;
    var o = a.createOscillator(), g = a.createGain(), t = a.currentTime + t0;
    o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.12, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(t0, dur, vol, hp) {
    var a = ctx(); if (!a) return;
    var n = Math.floor(a.sampleRate * dur), b = a.createBuffer(1, n, a.sampleRate), d = b.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    var s = a.createBufferSource(), g = a.createGain(), f = a.createBiquadFilter(), t = a.currentTime + t0;
    f.type = 'highpass'; f.frequency.value = hp || 1200;
    g.gain.value = vol || 0.12; s.buffer = b; s.connect(f); f.connect(g); g.connect(a.destination); s.start(t);
  }
  var SFX = {
    tap: function () { tone(660, 0, 0.06, 'triangle', 0.07); },
    pop: function () { tone(520, 0, 0.09, 'sine', 0.12, 980); },
    flip: function () { noise(0, 0.08, 0.1, 2500); },
    deal: function () { noise(0, 0.06, 0.08, 3200); tone(300, 0, 0.04, 'triangle', 0.03); },
    chip: function () { tone(1800, 0, 0.05, 'square', 0.03); tone(2400, 0.03, 0.05, 'square', 0.025); },
    roll: function () { for (var i = 0; i < 6; i++) noise(i * 0.05, 0.04, 0.09, 800 + i * 200); },
    good: function () { tone(660, 0, 0.1, 'triangle', 0.1); tone(990, 0.08, 0.14, 'triangle', 0.1); },
    bad: function () { tone(300, 0, 0.18, 'sawtooth', 0.05, 160); },
    tick: function () { tone(1200, 0, 0.03, 'square', 0.025); },
    win: function () { [523, 659, 784, 1047].forEach(function (f, i) { tone(f, i * 0.09, 0.22, 'triangle', 0.11); }); tone(1319, 0.38, 0.5, 'triangle', 0.09); },
    lose: function () { [392, 330, 262].forEach(function (f, i) { tone(f, i * 0.16, 0.25, 'triangle', 0.08); }); },
    whoosh: function () { noise(0, 0.25, 0.07, 600); }
  };
  function sfx(name) { if (!soundOn()) return; try { (SFX[name] || SFX.tap)(); } catch (e) {} }

  // ── Toast & callout ───────────────────────────────────────────────────────
  var toastEl = null, toastT = null;
  function toast(msg, ms) {
    if (!toastEl) { toastEl = el('div', { class: 'k-toast', role: 'status' }); doc.body.appendChild(toastEl); }
    toastEl.textContent = msg;
    requestAnimationFrame(function () { toastEl.classList.add('show'); });
    clearTimeout(toastT);
    toastT = setTimeout(function () { toastEl.classList.remove('show'); }, ms || 1800);
  }
  function callout(text, color) {
    var c = el('div', { class: 'k-callout', text: text });
    if (color) c.style.color = color;
    doc.body.appendChild(c);
    setTimeout(function () { c.remove(); }, 1400);
  }

  // ── Sheets ────────────────────────────────────────────────────────────────
  function sheet(o) {
    o = o || {};
    var body = el('div', { class: 'k-sheet', role: 'dialog', 'aria-modal': 'true' });
    body.appendChild(el('div', { class: 'grab' }));
    if (o.title) body.appendChild(el('h2', { text: o.title }));
    if (o.html != null) body.appendChild(el('div', { html: o.html }));
    if (o.node) body.appendChild(o.node);
    var scrim = el('div', { class: 'k-scrim' }, [body]);
    var closed = false;
    function close(fromCancel) {
      if (closed) return; closed = true;
      scrim.classList.remove('show');
      doc.removeEventListener('keydown', onKey);
      setTimeout(function () { scrim.remove(); }, 300);
      if (fromCancel === true && o.onCancel) o.onCancel();
      if (o.onClose) o.onClose();
    }
    function onKey(e) { if (e.key === 'Escape') close(true); }
    if (o.actions && o.actions.length) {
      var acts = el('div', { class: 'k-acts' });
      o.actions.forEach(function (a) {
        acts.appendChild(el('button', {
          class: 'btn btn-block ' + (a.cls || (a.primary ? 'btn-primary' : a.danger ? 'btn-red' : 'btn-soft')),
          type: 'button', text: a.label,
          onclick: function () { sfx('tap'); haptic('light'); if (!a.keep) close(); if (a.onClick) a.onClick(); }
        }));
      });
      body.appendChild(acts);
    }
    scrim.addEventListener('click', function (e) { if (e.target === scrim && o.dismissible !== false) close(true); });
    doc.addEventListener('keydown', onKey);
    doc.body.appendChild(scrim);
    requestAnimationFrame(function () { requestAnimationFrame(function () { scrim.classList.add('show'); }); });
    return { close: close, el: body };
  }
  function confirmSheet(msg, o) {
    o = o || {};
    return new Promise(function (resolve) {
      sheet({
        title: msg, html: o.body ? '<p class="muted">' + o.body + '</p>' : null,
        actions: [
          { label: o.ok || 'OK', cls: o.danger ? 'btn-red' : 'btn-primary', onClick: function () { resolve(true); } },
          { label: o.cancel || 'Cancel', cls: 'btn-ghost', onClick: function () { resolve(false); } }
        ],
        onCancel: function () { resolve(false); }
      });
    });
  }

  // ── Confetti ──────────────────────────────────────────────────────────────
  function confetti(o) {
    o = o || {};
    var cv = el('canvas', { class: 'k-confetti' }); doc.body.appendChild(cv);
    var dpr = Math.min(window.devicePixelRatio || 1, 2), W = innerWidth, H = innerHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    var g = cv.getContext('2d'); g.scale(dpr, dpr);
    var cols = o.colors || ['#ffc83d', '#ff5c9a', '#4da3ff', '#3ddc84', '#9b7bff', '#ff8a3d', '#2fd3c0'];
    var P = [], n = o.count || 140;
    for (var i = 0; i < n; i++) {
      var fromLeft = i % 2 === 0;
      P.push({
        x: fromLeft ? -10 : W + 10, y: H * (0.55 + Math.random() * 0.3),
        vx: (fromLeft ? 1 : -1) * (4 + Math.random() * 7), vy: -(9 + Math.random() * 9),
        w: 6 + Math.random() * 6, h: 8 + Math.random() * 8, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4,
        c: cols[i % cols.length]
      });
    }
    var t0 = performance.now();
    (function frame(t) {
      var age = t - t0; g.clearRect(0, 0, W, H);
      P.forEach(function (p) {
        p.vy += 0.32; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.fillStyle = p.c;
        g.globalAlpha = Math.max(0, 1 - age / 3200); g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.r * 2)));
        g.restore();
      });
      if (age < 3200) requestAnimationFrame(frame); else cv.remove();
    })(t0);
  }

  // ── Catalog helpers ───────────────────────────────────────────────────────
  var game = null;
  function pageKey() { return location.pathname.replace(/^.*\//, '').replace(/\.html$/, ''); }
  function playerColor(i) {
    return getComputedStyle(root).getPropertyValue('--p' + ((i % 8) + 1)).trim() || '#ffc83d';
  }
  function inkFor(hex) {
    var m = /^#?([0-9a-f]{6})$/i.exec(String(hex).trim()); if (!m) return '#1a1033';
    var n = parseInt(m[1], 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    return (0.299 * r + 0.587 * g + 0.114 * b) > 150 ? '#1a1033' : '#ffffff';
  }

  // ── "Continue" rail data (read by the home screen) ────────────────────────
  var resume = {
    set: function (label) {
      if (!game) return;
      var all = {}; try { all = JSON.parse(lsGet('gn_resume', '{}')) || {}; } catch (e) {}
      all[game.id] = { ts: Date.now(), label: label || 'In progress', file: pageKey() };
      lsSet('gn_resume', JSON.stringify(all));
    },
    clear: function () {
      if (!game) return;
      var all = {}; try { all = JSON.parse(lsGet('gn_resume', '{}')) || {}; } catch (e) {}
      delete all[game.id]; lsSet('gn_resume', JSON.stringify(all));
    }
  };

  // ── Favorites (same storage the home screen and sync use) ─────────────────
  function favHref() { return game ? 'games/' + (game.play || game.id) + '.html' : ''; }
  function favs() { try { var a = JSON.parse(lsGet('fav_games', '[]')); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  function isFav() { return favs().indexOf(favHref()) >= 0; }
  function toggleFav() {
    var a = favs(), h = favHref(), i = a.indexOf(h);
    if (i >= 0) a.splice(i, 1); else a.push(h);
    lsSet('fav_games', JSON.stringify(a)); lsSet('fav_games_updated_at', String(Date.now()));
    try { if (window.FGHSync && FGHSync.noteWrite) FGHSync.noteWrite('fav_games'); } catch (e) {}
    return i < 0;
  }

  // ── Game bar ──────────────────────────────────────────────────────────────
  var opts = {};
  function goHome() {
    sfx('tap');
    var ref = doc.referrer;
    try {
      var u = new URL(ref);
      if (u.origin === location.origin && /^\/(index\.html)?$/.test(u.pathname) && history.length > 1) { history.back(); return; }
    } catch (e) {}
    location.href = '../index.html';
  }
  function rules() {
    if (!opts.rules) return;
    sfx('pop');
    sheet({ title: 'How to play', html: '<div class="rules">' + opts.rules + '</div>', actions: [{ label: 'Got it', primary: true }] });
  }
  function menu() {
    sfx('pop');
    var list = el('div', { class: 'k-list' });
    var s;
    function item(ic, label, fn, cls) {
      list.appendChild(el('button', { type: 'button', class: cls || '', onclick: function () { sfx('tap'); s.close(); fn(); } },
        [el('span', { class: 'ic', text: ic }), el('span', { text: label })]));
    }
    if (opts.onNew) item('✨', 'New game', function () {
      if (opts.confirmNew === false) return opts.onNew();
      confirmSheet('Start a new game?', { ok: 'New game', body: 'The current game will be lost.' }).then(function (ok) { if (ok) opts.onNew(); });
    });
    (opts.menu || []).forEach(function (m) { item(m.icon || '•', m.label, m.onClick, m.cls); });
    if (opts.rules) item('📖', 'How to play', rules);
    item(soundOn() ? '🔊' : '🔈', soundOn() ? 'Sound: on' : 'Sound: off', function () {
      lsSet('gn_sound', soundOn() ? '0' : '1'); toast(soundOn() ? 'Sound on' : 'Sound off'); sfx('good');
    });
    if (game) item(isFav() ? '⭐' : '☆', isFav() ? 'Remove from favorites' : 'Add to favorites', function () {
      var on = toggleFav(); toast(on ? 'Added to favorites ⭐' : 'Removed from favorites'); haptic('success');
    });
    item('🏠', 'All games', goHome);
    s = sheet({ title: game ? game.name : 'Menu', node: list });
  }

  function init(o) {
    opts = o || {};
    game = findGameSafe(opts.id || pageKey());
    var accent = opts.color || (game && game.color) || '#ffc83d';
    root.style.setProperty('--accent', accent);
    root.style.setProperty('--accent-ink', inkFor(accent));
    if (game) doc.title = game.name + ' · Game Night';

    var bar = el('header', { class: 'gbar' }, [
      el('button', { class: 'icon-btn', type: 'button', 'aria-label': 'All games', html: ICON.back, onclick: goHome }),
      el('div', { class: 'ttl' }, [
        el('span', { class: 'em', text: (game && game.emoji) || '🎲' }),
        el('span', { text: opts.title || (game && game.name) || doc.title })
      ]),
      opts.rules ? el('button', { class: 'icon-btn', type: 'button', 'aria-label': 'How to play', html: ICON.help, onclick: rules }) : null,
      el('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Menu', html: ICON.more, onclick: menu })
    ]);
    doc.body.insertBefore(bar, doc.body.firstChild);
    requestWake();
    return bar;
  }
  function findGameSafe(k) { try { return typeof findGame === 'function' ? findGame(k) : null; } catch (e) { return null; } }

  // ── Setup screen ──────────────────────────────────────────────────────────
  // Kit.setup(rootEl, {
  //   modes:   [{id, emoji, title, desc}]           optional mode cards
  //   mode:    default mode id
  //   players: {min, max, count, names:true, cpu:(mode)=>bool|'seats', seatLabel}
  //   options: [{id, label, choices:[[value,label],...], value}]  segmented pickers
  //   intro:   short line under the title
  //   start:   button label
  //   onStart: function(cfg)   cfg = {mode, players:[{name,cpu,color}], options:{}}
  // })
  function setup(host, o) {
    o = o || {};
    host.innerHTML = '';
    var state = { mode: o.mode || (o.modes && o.modes[0] && o.modes[0].id) || null, count: 0, options: {} };
    var P = o.players || null;
    var saved = {};
    try { saved = JSON.parse(lsGet('gn_setup_' + (game ? game.id : pageKey()), '{}')) || {}; } catch (e) {}
    if (saved.mode && o.modes && o.modes.some(function (m) { return m.id === saved.mode; })) state.mode = saved.mode;
    (o.options || []).forEach(function (op) { state.options[op.id] = saved.options && saved.options[op.id] != null ? saved.options[op.id] : op.value; });
    var names = (saved.names || []).slice();

    var wrap = el('div', { class: 'setup' });
    wrap.appendChild(el('div', { class: 'setup-hero' }, [
      el('div', { class: 'big', text: (game && game.emoji) || '🎲' }),
      el('h1', { text: o.title || (game && game.name) || '' }),
      el('p', { text: o.intro || (game && game.tag) || '' })
    ]));

    var modesBox = null;
    if (o.modes && o.modes.length > 1) {
      modesBox = el('div', { class: 'modes' });
      wrap.appendChild(modesBox);
    }
    var optsBox = el('div', { class: 'stack' });
    wrap.appendChild(optsBox);
    var seatsBox = el('div', { class: 'stack' });
    wrap.appendChild(seatsBox);

    function cpuFor() { return P && typeof P.cpu === 'function' ? P.cpu(state.mode) : (P && P.cpu) || false; }
    function range() {
      var r = P && typeof P.range === 'function' ? P.range(state.mode) : null;
      return r || [P.min || 1, P.max || P.min || 1];
    }

    function renderModes() {
      if (!modesBox) return;
      modesBox.innerHTML = '';
      o.modes.forEach(function (m) {
        modesBox.appendChild(el('button', {
          type: 'button', class: 'mode' + (state.mode === m.id ? ' on' : ''),
          onclick: function () { state.mode = m.id; sfx('tap'); haptic('light'); renderModes(); renderSeats(); }
        }, [el('span', { class: 'e', text: m.emoji || '' }), el('span', { class: 't', text: m.title }), el('span', { class: 'd', text: m.desc || '' })]));
      });
    }
    function renderOptions() {
      optsBox.innerHTML = '';
      (o.options || []).forEach(function (op) {
        if (op.when && !op.when(state.mode)) return;
        var seg = el('div', { class: 'seg' });
        op.choices.forEach(function (c) {
          seg.appendChild(el('button', {
            type: 'button', class: String(state.options[op.id]) === String(c[0]) ? 'on' : '', text: c[1],
            onclick: function () { state.options[op.id] = c[0]; sfx('tap'); renderOptions(); }
          }));
        });
        optsBox.appendChild(el('div', null, [el('div', { class: 'label', text: op.label }), seg]));
      });
    }
    function renderSeats() {
      seatsBox.innerHTML = '';
      renderOptions();
      if (!P) return;
      var r = range(), cpu = cpuFor();
      if (!state.count) state.count = Math.min(r[1], Math.max(r[0], saved.count || P.count || r[0]));
      state.count = Math.min(r[1], Math.max(r[0], state.count));
      var head = el('div', { class: 'row' }, [el('div', { class: 'label grow', style: { margin: 0 }, text: P.label || "Who's playing?" })]);
      if (r[1] > r[0]) {
        var out = el('output', { text: String(state.count) });
        var minus = el('button', { type: 'button', 'aria-label': 'Fewer players', text: '−', onclick: function () { state.count--; sfx('tap'); renderSeats(); } });
        var plus = el('button', { type: 'button', 'aria-label': 'More players', text: '+', onclick: function () { state.count++; sfx('tap'); renderSeats(); } });
        minus.disabled = state.count <= r[0]; plus.disabled = state.count >= r[1];
        head.appendChild(el('div', { class: 'stepper' }, [minus, out, plus]));
      }
      seatsBox.appendChild(head);
      if (P.names === false) return;
      var inputs = [];
      for (var i = 0; i < state.count; i++) {
        var isCpu = cpu === 'seats' ? i > 0 : (cpu && i > 0);
        var c = playerColor(i);
        var inp = el('input', {
          class: 'input', type: 'text', maxlength: 14, autocomplete: 'off', autocorrect: 'off', spellcheck: 'false',
          placeholder: isCpu ? 'Computer' : (i === 0 && cpu ? 'You' : 'Player ' + (i + 1)),
          value: isCpu ? '' : (names[i] || '')
        });
        if (isCpu) { inp.disabled = true; inp.value = (P.cpuNames && P.cpuNames[i - 1]) || ['Robo', 'Chip', 'Bolt', 'Pixel', 'Sprocket', 'Gizmo', 'Widget'][(i - 1) % 7]; }
        (function (idx) { inp.addEventListener('input', function () { names[idx] = inp.value; }); })(i);
        inputs.push(inp);
        seatsBox.appendChild(el('div', { class: 'seat' }, [
          el('span', { class: 'avatar', style: { '--c': c }, text: isCpu ? '🤖' : String(i + 1) }), inp
        ]));
      }
      // Quick-pick names from the Frequent Players list
      var fp = [];
      try { if (window.FrequentPlayers) fp = FrequentPlayers.list(); } catch (e) {}
      if (fp.length) {
        var quick = el('div', { class: 'quick' });
        fp.slice(0, 10).forEach(function (n) {
          quick.appendChild(el('button', {
            type: 'button', class: 'chip', text: n,
            onclick: function () {
              var target = inputs.filter(function (x) { return !x.disabled && !x.value.trim(); })[0];
              if (!target) { target = inputs.filter(function (x) { return !x.disabled; })[0]; }
              if (!target) return;
              target.value = n; target.dispatchEvent(new Event('input')); sfx('pop'); haptic('light');
            }
          }));
        });
        seatsBox.appendChild(quick);
      }
    }

    var startBtn = el('button', {
      type: 'button', class: 'btn btn-primary btn-lg btn-block', text: o.start || "Let's play!",
      onclick: function () {
        var cpu = cpuFor(), players = [];
        if (P) {
          var inputs = seatsBox.querySelectorAll('input');
          for (var i = 0; i < state.count; i++) {
            var isCpu = cpu === 'seats' ? i > 0 : (cpu && i > 0);
            var v = inputs[i] ? inputs[i].value.trim() : '';
            players.push({ name: v || (isCpu ? 'Computer' : (i === 0 && cpu ? 'You' : 'Player ' + (i + 1))), cpu: !!isCpu, color: playerColor(i), seat: i });
            if (!isCpu && v) { try { if (window.FrequentPlayers) FrequentPlayers.add(v); } catch (e) {} }
          }
        }
        lsSet('gn_setup_' + (game ? game.id : pageKey()), JSON.stringify({ mode: state.mode, count: state.count, options: state.options, names: names }));
        sfx('pop'); haptic('medium');
        o.onStart && o.onStart({ mode: state.mode, players: players, options: state.options });
      }
    });
    wrap.appendChild(startBtn);
    if (opts.rules) wrap.appendChild(el('button', { type: 'button', class: 'btn btn-ghost btn-block', text: '📖  How to play', onclick: rules }));
    host.appendChild(wrap);
    renderModes(); renderSeats();
    return { el: wrap, state: state };
  }

  // ── Win / results ─────────────────────────────────────────────────────────
  // Kit.win({emoji:'🏆', title:'Sam wins!', sub:'by 12 points',
  //          rank:[{name,score,color}], lose:false, again:fn, againLabel, extra:[{label,onClick}]})
  function win(o) {
    o = o || {};
    var card = el('div', { class: 'card' });
    card.appendChild(el('div', { class: 'trophy', text: o.emoji || (o.lose ? '😅' : '🏆') }));
    card.appendChild(el('h2', { text: o.title || (o.lose ? 'So close!' : 'You win!') }));
    if (o.sub) card.appendChild(el('div', { class: 'sub', text: o.sub }));
    if (o.rank && o.rank.length) {
      var rk = el('div', { class: 'rank' });
      o.rank.forEach(function (p, i) {
        rk.appendChild(el('div', null, [
          el('span', { text: i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : String(i + 1) }),
          el('span', { class: 'avatar sm', style: { '--c': p.color || playerColor(i) }, text: (p.name || '?').charAt(0).toUpperCase() }),
          el('span', { text: p.name }),
          el('span', { class: 'p', text: p.score == null ? '' : String(p.score) })
        ]));
      });
      card.appendChild(rk);
    }
    var acts = el('div', { class: 'k-acts' });
    var ov = el('div', { class: 'k-win', role: 'dialog', 'aria-modal': 'true' }, [card]);
    function close() { ov.classList.remove('show'); setTimeout(function () { ov.remove(); }, 300); }
    if (o.again !== false) acts.appendChild(el('button', { type: 'button', class: 'btn btn-primary btn-lg btn-block', text: o.againLabel || 'Play again', onclick: function () { sfx('pop'); close(); o.again && o.again(); } }));
    (o.extra || []).forEach(function (x) { acts.appendChild(el('button', { type: 'button', class: 'btn btn-soft btn-block', text: x.label, onclick: function () { close(); x.onClick && x.onClick(); } })); });
    acts.appendChild(el('button', { type: 'button', class: 'btn btn-ghost btn-block', text: o.closeLabel || 'Back to games', onclick: o.onClose ? function () { close(); o.onClose(); } : goHome }));
    card.appendChild(acts);
    doc.body.appendChild(ov);
    requestAnimationFrame(function () { requestAnimationFrame(function () { ov.classList.add('show'); }); });
    resume.clear();
    if (o.lose) { sfx('lose'); haptic('error'); }
    else { sfx('win'); haptic('success'); confetti(); }
    return { close: close };
  }

  // ── Cards & dice ──────────────────────────────────────────────────────────
  var SUIT = { s: '♠', h: '♥', d: '♦', c: '♣', '♠': '♠', '♥': '♥', '♦': '♦', '♣': '♣' };
  function card(rank, suit, o) {
    o = o || {};
    var s = SUIT[suit] || suit || '', red = s === '♥' || s === '♦';
    var r = rank === 'T' || rank === 10 ? '10' : String(rank);
    var c = el('div', { class: 'pcard' + (red ? ' red' : '') + (o.back ? ' back' : '') + (o.cls ? ' ' + o.cls : ''), 'data-r': r, 'data-s': s });
    c.innerHTML = '<span class="ix">' + esc(r) + '<b>' + s + '</b></span><span class="pip">' + s + '</span>';
    c.setAttribute('aria-label', o.back ? 'Face-down card' : r + ' of ' + ({ '♠': 'spades', '♥': 'hearts', '♦': 'diamonds', '♣': 'clubs' }[s] || s));
    return c;
  }
  function die(v) {
    var d = el('button', { type: 'button', class: 'die', 'data-v': v || 1, 'aria-label': 'Die showing ' + (v || 1) });
    for (var i = 0; i < 9; i++) d.appendChild(doc.createElement('i'));
    return d;
  }

  window.Kit = {
    init: init, setup: setup, win: win, sheet: sheet, confirm: confirmSheet, toast: toast, callout: callout,
    confetti: confetti, sfx: sfx, haptic: haptic, card: card, die: die, color: playerColor, el: el, esc: esc, poss: poss,
    resume: resume, rules: rules, home: goHome, game: function () { return game; }
  };
  window.GN = window.GN || { _loaded: true, haptic: haptic, toast: toast, sheet: sheet, confirm: confirmSheet };
})();
