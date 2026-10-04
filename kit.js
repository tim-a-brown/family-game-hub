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


  // ── Line icons (24×24, stroke = currentColor) ─────────────────────────────
  // Kit.icon('name') returns an <svg> string. Use these instead of emoji in UI.
  var P = {
    back: '<path d="m15 18-6-6 6-6"/>',
    help: '<circle cx="12" cy="12" r="9.5"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
    more: '<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    shuffle: '<path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.7-1.1 2-1.7 3.3-1.7H22"/><path d="m18 2 4 4-4 4"/><path d="M2 6h1.9c1.5 0 2.9.9 3.6 2.2"/><path d="M22 18h-5.9c-1.3 0-2.6-.7-3.3-1.8l-.5-.8"/><path d="m18 14 4 4-4 4"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    star: '<path d="M12 2.5l2.9 5.9 6.6 1-4.8 4.6 1.1 6.5L12 17.4l-5.8 3.1 1.1-6.5L2.5 9.4l6.6-1z"/>',
    play: '<path d="M7 4v16l13-8z"/>',
    plus: '<path d="M12 5v14"/><path d="M5 12h14"/>',
    sparkle: '<path d="M12 3l1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2z"/>',
    book: '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>',
    sound: '<path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M19 5a10 10 0 0 1 0 14"/>',
    mute: '<path d="M11 5 6 9H2v6h4l5 4z"/><path d="m22 9-6 6"/><path d="m16 9 6 6"/>',
    home: '<path d="m3 10 9-7 9 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>',
    history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>',
    sync: '<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>',
    pulse: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
    down: '<path d="m6 9 6 6 6-6"/>',
    right: '<path d="m9 18 6-6-6-6"/>',
    trophy: '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.7V17c0 .6-.5 1-1 1.2C7.9 18.8 7 20.2 7 22"/><path d="M14 14.7V17c0 .6.5 1 1 1.2 1.1.6 2 2 2 3.8"/><path d="M18 2H6v7a6 6 0 0 0 12 0z"/>',
    bot: '<rect x="4" y="8" width="16" height="12" rx="3"/><path d="M12 8V4"/><circle cx="12" cy="3" r="1"/><path d="M9 13v2"/><path d="M15 13v2"/><path d="M2 13v3"/><path d="M22 13v3"/>',
    phone: '<rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M11 18h2"/>',
    pencil: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    undo: '<path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-15-6.7L3 13"/>',
    chart: '<path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>',
    share: '<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="m16 6-4-4-4 4"/><path d="M12 2v13"/>',
    flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.4-.5-2-1-3-1.1-2.1-.2-4 2-6 .5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.2.4-2.3 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/>',
    infinity: '<path d="M12 12c-2-2.7-4-4-6-4a4 4 0 1 0 0 8c2 0 4-1.3 6-4zm0 0c2 2.7 4 4 6 4a4 4 0 0 0 0-8c-2 0-4 1.3-6 4z"/>',
    close: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    swap: '<path d="M7 4v16"/><path d="m3 8 4-4 4 4"/><path d="M17 20V4"/><path d="m21 16-4 4-4-4"/>',
    hand: '<path d="M18 11V6a2 2 0 0 0-4 0v5"/><path d="M14 10V4a2 2 0 0 0-4 0v6"/><path d="M10 10.5V6a2 2 0 0 0-4 0v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.9-6-2.4l-3.6-3.6a2 2 0 0 1 2.8-2.8L7 15"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    lightbulb: '<path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z"/>',
    coins: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.5"/><path d="M12 3v3"/><path d="M12 18v3"/><path d="M3 12h3"/><path d="M18 12h3"/>',
    // Category marks
    cards: '<rect x="8" y="2" width="13" height="17" rx="2"/><path d="M5.5 6.2 3.6 6.8a2 2 0 0 0-1.3 2.4l3 10.6a2 2 0 0 0 2.5 1.4l5.4-1.6"/>',
    board: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v18"/><path d="M15 3v18"/>',
    dice: '<rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="8.5" cy="8.5" r="1.2" fill="currentColor"/><circle cx="15.5" cy="15.5" r="1.2" fill="currentColor"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/>',
    puzzle: '<path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z"/>',
    words: '<path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/>',
    party: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22z"/>',
    casino: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.5"/><path d="M12 3v3"/><path d="M12 18v3"/><path d="M3 12h3"/><path d="M18 12h3"/>',
    arcade: '<rect x="2" y="6" width="20" height="12" rx="6"/><path d="M6 12h4"/><path d="M8 10v4"/><path d="M15 11h.01"/><path d="M18 13h.01"/>',
    tools: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9z"/>'
  };
  function icon(name, cls) {
    var body = P[name] || P.sparkle;
    var filled = name === 'play' || name === 'more';
    return '<svg class="ico' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" fill="' + (filled ? 'currentColor' : 'none') + '" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + body + '</svg>';
  }

  var ICON = { back: icon('back'), help: icon('help'), more: icon('more') };

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
        [el('span', { class: 'ic', html: P[ic] ? icon(ic) : esc(ic) }), el('span', { text: label })]));
    }
    if (opts.onNew) item('sparkle', 'New game', function () {
      if (opts.confirmNew === false) return opts.onNew();
      confirmSheet('Start a new game?', { ok: 'New game', body: 'The current game will be lost.' }).then(function (ok) { if (ok) opts.onNew(); });
    });
    (opts.menu || []).forEach(function (m) { item(m.icon || 'sparkle', m.label, m.onClick, m.cls); });
    if (opts.rules) item('book', 'How to play', rules);
    item(soundOn() ? 'sound' : 'mute', soundOn() ? 'Sound: on' : 'Sound: off', function () {
      lsSet('gn_sound', soundOn() ? '0' : '1'); toast(soundOn() ? 'Sound on' : 'Sound off'); sfx('good');
    });
    if (game) item('star', isFav() ? 'Remove from favorites' : 'Add to favorites', function () {
      var on = toggleFav(); toast(on ? 'Added to favorites' : 'Removed from favorites'); haptic('success');
    });
    item('home', 'All games', goHome);
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
        el('span', { text: opts.title || (game && game.name) || doc.title })
      ]),
      opts.rules ? el('button', { class: 'icon-btn', type: 'button', 'aria-label': 'How to play', html: ICON.help, onclick: rules }) : null,
      el('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Menu', html: ICON.more, onclick: menu })
    ]);
    doc.body.insertBefore(bar, doc.body.firstChild);
    requestWake();
    return bar;
  }
  function catName(id) { try { for (var i = 0; i < GAME_CATS.length; i++) if (GAME_CATS[i].id === id) return GAME_CATS[i].name; } catch (e) {} return ''; }
  function findGameSafe(k) { try { return typeof findGame === 'function' ? findGame(k) : null; } catch (e) { return null; } }

  // ── Setup screen ──────────────────────────────────────────────────────────
  // Kit.setup(rootEl, {
  //   modes:   [{id, icon, title, desc}]       icon = a Kit.icon name           optional mode cards
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
      game ? el('div', { class: 'k-cat', html: icon(game.cat) + '<span>' + esc(catName(game.cat)) + '</span>' }) : null,
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
        }, [el('span', { class: 'e', html: icon(m.icon || 'sparkle') }), el('span', { class: 'tx' }, [el('span', { class: 't', text: m.title }), el('span', { class: 'd', text: m.desc || '' })]), el('span', { class: 'ok', html: icon('check') })]));
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
          el('span', { class: 'avatar', style: { '--c': c }, html: isCpu ? icon('bot') : String(i + 1) }), inp
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
    if (opts.rules) wrap.appendChild(el('button', { type: 'button', class: 'btn btn-ghost btn-block', html: icon('book') + '<span>How to play</span>', onclick: rules }));
    host.appendChild(wrap);
    renderModes(); renderSeats();
    return { el: wrap, state: state };
  }

  // ── Win / results ─────────────────────────────────────────────────────────
  // Kit.win({icon:'trophy', title:'Sam wins!', sub:'by 12 points',
  //          rank:[{name,score,color}], lose:false, again:fn, againLabel, extra:[{label,onClick}]})
  function win(o) {
    o = o || {};
    var card = el('div', { class: 'card' });
    card.appendChild(el('div', { class: 'trophy' + (o.lose ? ' lose' : ''), html: icon(o.icon || (o.lose ? 'bot' : 'trophy')) }));
    card.appendChild(el('h2', { text: o.title || (o.lose ? 'So close!' : 'You win!') }));
    if (o.sub) card.appendChild(el('div', { class: 'sub', text: o.sub }));
    if (o.rank && o.rank.length) {
      var rk = el('div', { class: 'rank' });
      o.rank.forEach(function (p, i) {
        rk.appendChild(el('div', null, [
          el('span', { class: 'place', text: String(i + 1) }),
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
    confetti: confetti, sfx: sfx, haptic: haptic, card: card, die: die, color: playerColor, el: el, esc: esc, poss: poss, icon: icon, catName: catName,
    resume: resume, rules: rules, home: goHome, game: function () { return game; }
  };
  window.GN = window.GN || { _loaded: true, haptic: haptic, toast: toast, sheet: sheet, confirm: confirmSheet };
})();
