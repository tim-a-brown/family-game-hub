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
//   Kit.init({id, rules, menu, onNew, undo})  build the game bar, set accent
//                                              (undo: fn adds "Undo" to the menu)
//   Kit.setup(root, {...})                     standard "who's playing" screen
//   Kit.handoff({name, color, what}) -> Promise  pass-and-play cover; hold 3s to reveal
//   Kit.win({...})                             celebration + results card
//   Kit.sheet({title, html|node, actions})     bottom sheet; returns {close}
//   Kit.confirm(msg, {ok, danger})             -> Promise<bool>
//   Kit.toast(msg)   Kit.callout(text)         quick feedback
//   Kit.confetti()   Kit.sfx(name, vol?)   Kit.haptic(kind)
//   Kit.card(rank, suit, {back, cls})          playing-card element
//   Kit.die(value)                             die element
//   Kit.color(i)                               player colour for seat i
//   Kit.resume.set(label, {keys}) / .clear()           "Continue" rail on home
//   Kit.rules()                                open the rules sheet
//   Kit.music({search})                        the Music sheet (your Spotify: a playlist per game, search); Kit.spotifyOwns(id)
//   Kit.offline()                              save everything on this device for offline (a flight); Kit.offlineTag()
//   Kit.musicMini(slot, close)                 the Spotify player for the top of a menu (once something plays)
//   Kit.theme.pick() / .get() / .set(id)       app colour theme (localStorage fgh_theme)
//   Kit.init({orient:'landscape'|'portrait'})  phones only (orientTablets:true adds iPads): lock or show a turn-your-device cover; 'kit:orient' event
//   Kit.orient('landscape'|'portrait'|null, tablets?)  same gate, set or lifted later (per mode); Kit.orientOk() -> bool
//   Kit.titleSwitch(text, onClick, label) / (null)   title shows the table/machine/level with a down arrow; tap = the game's own picker
// window.GN is kept as an alias for haptic/toast/confirm/sheet.
// ═══════════════════════════════════════════════════════════════════════════
(function () {
  'use strict';
  // Editing a game's defaults (games/<page>.html?defaults=1, from Game defaults in the profile menu): the page
  // must show its setup screen as if new and change nothing but that game's remembered setup. So for this page
  // load the game's own saves read as empty (it can't resume a game in progress) and the only storage write
  // that lands is gn_setup_*. Your account, players, scores and history still read normally; sync.js stays off.
  var EDIT_DEFAULTS = /\/games\//.test(location.pathname) && /[?&]defaults=1(&|$)/.test(location.search);
  if (EDIT_DEFAULTS) (function () {
    var SP = Storage.prototype, get = SP.getItem, set = SP.setItem, del = SP.removeItem;
    var KEEP = /^(gn_|fgh_|hi_|gh_|lorcana_|my_name$|frequent_players$|casino_bank$|rklists$|fav_games$)/;
    SP.getItem = function (k) { return this === window.localStorage && !KEEP.test(String(k)) ? null : get.call(this, k); };
    SP.setItem = function (k, v) { if (this === window.localStorage && !/^gn_setup_/.test(String(k))) return; return set.call(this, k, v); };
    SP.removeItem = function (k) { if (this === window.localStorage) return; return del.call(this, k); };
  })();
  if (window.Kit) return;
  var doc = document, root = doc.documentElement;
  var LS = (function () { try { return window.localStorage; } catch (e) { return null; } })();
  function lsGet(k, d) { try { var v = LS.getItem(k); return v == null ? d : v; } catch (e) { return d; } }
  function lsSet(k, v) { try { LS.setItem(k, v); } catch (e) {} if (window.FGHSync && FGHSync.noteWrite) FGHSync.noteWrite(k); }   // settings follow the PIN

  // ── Page metas, manifest, gestures, wake lock ─────────────────────────────
  function meta(name, content) {
    var m = doc.querySelector('meta[name="' + name + '"]');
    if (!m) { m = doc.createElement('meta'); m.name = name; doc.head.appendChild(m); }
    m.content = content;
  }
  // ── App theme (colours only). Set on <html> before first paint; Kit.theme has the list and picker.
  var THEME_LIST = [
    { id: 'night', name: 'Night', bg: '#141029', s: '#2d2556', t: '#fbf8ff', a: '#ffc83d', light: false },
    { id: 'light', name: 'Light', bg: '#f3f1f9', s: '#dcd8ec', t: '#1b1733', a: '#ff5c9a', light: true },
    { id: 'dark', name: 'Dark', bg: '#0b0b0f', s: '#2f2f39', t: '#f4f4f7', a: '#4da3ff', light: false },
    { id: 'midnight', name: 'Midnight', bg: 'linear-gradient(180deg,#123a7c,#050a18)', bar: '#123a7c', s: '#1f376f', t: '#f1f5ff', a: '#ffc83d', light: false },
    { id: 'forest', name: 'Forest', bg: 'linear-gradient(180deg,#0f5234,#04110b)', bar: '#0f5234', s: '#1d4a34', t: '#eef8f1', a: '#ffc83d', light: false },
    { id: 'velvet', name: 'Red velvet', bg: 'radial-gradient(120% 90% at 50% 0%,#7a1a34,#1f060e)', bar: '#4a1024', s: '#601c35', t: '#fff3f5', a: '#ffc83d', light: false },
    { id: 'parchment', name: 'Parchment', bg: '#eee3c6', s: '#d8c59a', t: '#2c2212', a: '#e3a81c', light: true }
  ];
  function themeRec(id) { for (var i = 0; i < THEME_LIST.length; i++) if (THEME_LIST[i].id === id) return THEME_LIST[i]; return THEME_LIST[0]; }
  function themeGet() { return themeRec(lsGet('fgh_theme', 'night')).id; }
  function themeApply(id) {
    // Pages with their own fixed backdrop (<html data-theme-fixed>, e.g. Lorcana's night sky) stay on Night
    var t = themeRec(root.hasAttribute('data-theme-fixed') ? 'night' : id);
    if (t.id === 'night') root.removeAttribute('data-theme'); else root.setAttribute('data-theme', t.id);
    root.style.setProperty('--theme-accent', t.a);   // the theme's own accent (games set --accent to their colour)
    meta('theme-color', t.bar || t.bg);
    meta('apple-mobile-web-app-status-bar-style', t.light ? 'default' : 'black');
  }
  function themeSet(id) { lsSet('fgh_theme', themeRec(id).id); themeApply(id); }
  meta('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no');
  themeApply(themeGet());
  meta('apple-mobile-web-app-capable', 'yes');
  meta('mobile-web-app-capable', 'yes');
  meta('apple-mobile-web-app-status-bar-style', 'black');
  if (!doc.querySelector('link[rel="manifest"]')) {
    var mf = doc.createElement('link'); mf.rel = 'manifest'; mf.href = '/manifest.json'; doc.head.appendChild(mf);
  }
  if (!doc.querySelector('link[rel="icon"]')) {
    var ic = doc.createElement('link'); ic.rel = 'icon'; ic.type = 'image/png'; ic.href = '/favicon.png?v=489'; doc.head.appendChild(ic);
  }
  if (!doc.querySelector('link[rel="apple-touch-icon"]')) {
    var at = doc.createElement('link'); at.rel = 'apple-touch-icon'; at.setAttribute('sizes', '180x180'); at.href = '/img/home-icon-180.png'; doc.head.appendChild(at);
  }
  ['gesturestart', 'gesturechange'].forEach(function (t) {
    doc.addEventListener(t, function (e) { e.preventDefault(); }, { passive: false });
  });
  doc.addEventListener('touchstart', function () {}, { passive: true }); // enables :active on iOS

  // Frosted status-bar shield and sticky bars (.gbar, .k-stick) once content
  // scrolls under them (see kit.css). Bars are clear at rest.
  var stickRaf = 0;
  function onStick() {
    stickRaf = 0;
    var y = window.scrollY || root.scrollTop || 0;
    var bars = doc.querySelectorAll('.gbar, .k-stick'), stuck = false;
    for (var i = 0; i < bars.length; i++) {
      var on = y > 2 && bars[i].getBoundingClientRect().top <= 1;
      bars[i].classList.toggle('stuck', on); stuck = stuck || on;
    }
    // A stuck bar already covers the status bar; the shield is for the gap before it sticks.
    root.classList.toggle('k-scrolled', y > 2 && !stuck);
  }
  window.addEventListener('scroll', function () { if (!stickRaf) stickRaf = requestAnimationFrame(onStick); }, { passive: true });
  window.addEventListener('resize', onStick);

  // Keep the screen on while someone is playing: the lock is taken on the first touch or key and let go after
  // five minutes without one, so a setup or results screen left on the table dims and locks like any other page.
  var wake = null, wakeOff = false, wakeTimer = 0, WAKE_IDLE = 5 * 60000;
  function requestWake() {
    if (wakeOff || !wakeTimer || !('wakeLock' in navigator) || doc.visibilityState !== 'visible') return;
    navigator.wakeLock.request('screen').then(function (w) { wake = w; }).catch(function () {});
  }
  function releaseWake() { clearTimeout(wakeTimer); wakeTimer = 0; if (wake) { try { wake.release(); } catch (e) {} wake = null; } }
  function touchWake() {
    if (wakeOff) return;
    clearTimeout(wakeTimer); wakeTimer = setTimeout(releaseWake, WAKE_IDLE);
    if (!wake) requestWake();
  }
  doc.addEventListener('pointerdown', touchWake, { passive: true, capture: true });
  doc.addEventListener('keydown', touchWake, { capture: true });
  doc.addEventListener('visibilitychange', function () { if (doc.visibilityState === 'visible') { wake = null; requestWake(); } });
  // Kit.keepAwake(false): let the screen dim and lock as usual (a game's battery saver); true: keep it on again
  function keepAwake(on) { wakeOff = !on; if (on) touchWake(); else releaseWake(); }

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
    sliders: '<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
    shuffle: '<path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.7-1.1 2-1.7 3.3-1.7H22"/><path d="m18 2 4 4-4 4"/><path d="M2 6h1.9c1.5 0 2.9.9 3.6 2.2"/><path d="M22 18h-5.9c-1.3 0-2.6-.7-3.3-1.8l-.5-.8"/><path d="m18 14 4 4-4 4"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    tiles: '<rect x="3" y="3" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="2"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2"/>',
    rows: '<rect x="3" y="4" width="5" height="5" rx="1.5"/><rect x="3" y="15" width="5" height="5" rx="1.5"/><path d="M11.5 6.5H21M11.5 17.5H21"/>',
    star: '<path d="M12 2.5l2.9 5.9 6.6 1-4.8 4.6 1.1 6.5L12 17.4l-5.8 3.1 1.1-6.5L2.5 9.4l6.6-1z"/>',
    // avatar marks (paths after Lucide, ISC licence)
    crown: '<path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z"/>',
    heart: '<path d="M12 20s-7.5-4.6-9.2-9.3A4.8 4.8 0 0 1 12 7.3a4.8 4.8 0 0 1 9.2 3.4C19.5 15.4 12 20 12 20z"/>',
    moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    paw: '<circle cx="6.5" cy="9.5" r="1.8"/><circle cx="10" cy="5.8" r="1.8"/><circle cx="14" cy="5.8" r="1.8"/><circle cx="17.5" cy="9.5" r="1.8"/><path d="M12 11.5c-3 0-5.5 3.2-5.5 5.6 0 1.6 1.3 2.4 2.8 2.4 1.2 0 1.8-.7 2.7-.7s1.5.7 2.7.7c1.5 0 2.8-.8 2.8-2.4 0-2.4-2.5-5.6-5.5-5.6z"/>',
    rocket: '<path d="M4.5 16.5c-1.5 1.3-2 5-2 5s3.7-.5 5-2c.7-.8.7-2.1-.1-2.9a2.2 2.2 0 0 0-2.9-.1z"/><path d="M12 15l-3-3a22 22 0 0 1 2-3.9A12.9 12.9 0 0 1 22 2c0 2.7-.8 7.5-6 11a22 22 0 0 1-4 2z"/><path d="M9 12H4s.6-3 2-4c1.6-1.1 5 0 5 0"/><path d="M12 15v5s3-.6 4-2c1.1-1.6 0-5 0-5"/>',
    music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
    leaf: '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10z"/><path d="M2 21c0-3 1.9-5.4 5.2-6.1C9.6 14.4 12 13 13 12"/>',
    minus: '<path d="M5 12h14"/>',
    bolt: '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>',
    cloud: '<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>',
    download: '<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/>',
    coffee: '<path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/><path d="M6 2v2"/><path d="M10 2v2"/><path d="M14 2v2"/>',
    compass: '<circle cx="12" cy="12" r="10"/><path d="m16.2 7.8-1.8 5.4-5.4 1.8 1.8-5.4z"/>',
    gem: '<path d="M6 3h12l4 6-10 13L2 9Z"/><path d="M11 3 8 9l4 13 4-13-3-6"/><path d="M2 9h20"/>',
    feather: '<path d="M20.2 12.2a6 6 0 0 0-8.5-8.5L5 10.5V19h8.5z"/><path d="M16 8 2 22"/><path d="M17.5 15H9"/>',
    flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><path d="M4 22v-7"/>',
    flower: '<circle cx="12" cy="12" r="3"/><path d="M12 16.5A4.5 4.5 0 1 1 7.5 12 4.5 4.5 0 1 1 12 7.5a4.5 4.5 0 1 1 4.5 4.5 4.5 4.5 0 1 1-4.5 4.5"/>',
    gamepad: '<path d="M6 12h4"/><path d="M8 10v4"/><path d="M15 13h.01"/><path d="M18 11h.01"/><rect x="2" y="6" width="20" height="12" rx="2"/>',
    ghost: '<path d="M9 10h.01"/><path d="M15 10h.01"/><path d="M12 2a8 8 0 0 0-8 8v12l3-3 2.5 2.5L12 19l2.5 2.5L17 19l3 3V10a8 8 0 0 0-8-8z"/>',
    globe: '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
    key: '<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/>',
    mountain: '<path d="m8 3 4 8 5-5 5 15H2L8 3z"/>',
    snowflake: '<path d="M2 12h20"/><path d="M12 2v20"/><path d="m20 16-4-4 4-4"/><path d="m4 8 4 4-4 4"/><path d="m16 4-4 4-4-4"/><path d="m8 20 4-4 4 4"/>',
    smile: '<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><path d="M9 9h.01"/><path d="M15 9h.01"/>',
    target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
    anchor: '<path d="M12 22V8"/><path d="M5 12H2a10 10 0 0 0 20 0h-3"/><circle cx="12" cy="5" r="3"/>',
    umbrella: '<path d="M22 12a10 10 0 0 0-20 0Z"/><path d="M12 12v8a2 2 0 0 0 4 0"/><path d="M12 2v1"/>',
    tree: '<path d="m17 14 3 3.3a1 1 0 0 1-.7 1.7H4.7a1 1 0 0 1-.7-1.7L7 14h-.3a1 1 0 0 1-.7-1.7L9 9h-.2A1 1 0 0 1 8 7.3L12 3l4 4.3a1 1 0 0 1-.8 1.7H15l3 3.3a1 1 0 0 1-.7 1.7H17Z"/><path d="M12 22v-3"/>',
    fish: '<path d="M6.5 12c.94-3.46 4.94-6 8.5-6 3.56 0 6.06 2.54 7 6-.94 3.47-3.44 6-7 6s-7.56-2.53-8.5-6Z"/><path d="M18 12v.5"/><path d="M16 17.93a9.77 9.77 0 0 1 0-11.86"/><path d="M7 10.67C7 8 5.58 5.97 2.73 5.5c-1 1.5-1 5 .23 6.5-1.24 1.5-1.24 5-.23 6.5C5.58 18.03 7 16 7 13.33"/>',
    bird: '<path d="M16 7h.01"/><path d="M3.4 18H12a8 8 0 0 0 8-8V7a4 4 0 0 0-7.28-2.3L2 20"/><path d="m20 7 2 .5-2 .5"/><path d="M10 18v3"/><path d="M14 17.75V21"/><path d="M7 18a6 6 0 0 0 3.84-10.61"/>',
    bike: '<circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/>',
    car: '<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/>',
    plane: '<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>',
    pizza: '<path d="M15 11h.01"/><path d="M11 15h.01"/><path d="M16 16h.01"/><path d="m2 16 20 6-6-20A20 20 0 0 0 2 16"/><path d="M5.71 17.11a17 17 0 0 1 11.4-11.4"/>',
    cake: '<path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8"/><path d="M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1"/><path d="M2 21h20"/><path d="M7 8v3"/><path d="M12 8v3"/><path d="M17 8v3"/><path d="M7 4h.01"/><path d="M12 4h.01"/><path d="M17 4h.01"/>',
    headphones: '<path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"/>',
    wand: '<path d="M15 4V2"/><path d="M15 16v-2"/><path d="M8 9h2"/><path d="M20 9h2"/><path d="M17.8 11.8 19 13"/><path d="M15 9h.01"/><path d="M17.8 6.2 19 5"/><path d="m3 21 9-9"/><path d="M12.2 6.2 11 5"/>',
    palette: '<circle cx="13.5" cy="6.5" r="1"/><circle cx="17.5" cy="10.5" r="1"/><circle cx="8.5" cy="7.5" r="1"/><circle cx="6.5" cy="12.5" r="1"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.9 0 1.6-.7 1.6-1.7 0-.4-.2-.8-.4-1.1-.3-.3-.4-.7-.4-1.1a1.6 1.6 0 0 1 1.7-1.7h2c3 0 5.5-2.5 5.5-5.5C22 6 17.5 2 12 2z"/>',
    glasses: '<circle cx="6" cy="15" r="4"/><circle cx="18" cy="15" r="4"/><path d="M14 15a2 2 0 0 0-2-2 2 2 0 0 0-2 2"/><path d="M2.5 13 5 7c.7-1.3 1.4-2 3-2"/><path d="M21.5 13 19 7c-.7-1.3-1.5-2-3-2"/>',
    bug: '<path d="m8 2 1.9 1.9"/><path d="M14.1 3.9 16 2"/><path d="M9 7.1v-1a3 3 0 1 1 6 0v1"/><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6"/><path d="M12 20v-9"/><path d="M6.5 9C4.6 8.8 3 7.1 3 5"/><path d="M6 13H2"/><path d="M3 21c0-2.1 1.7-3.9 3.8-4"/><path d="M21 5c0 2.1-1.6 3.8-3.5 4"/><path d="M22 13h-4"/><path d="M17.2 17c2.1.1 3.8 1.9 3.8 4"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
    inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5.1L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.7 4H7.3a2 2 0 0 0-1.8 1.1z"/>',
    play: '<path d="M7 4v16l13-8z"/>',
    pause: '<path d="M9 5v14"/><path d="M15 5v14"/>',
    trash: '<path d="M3 6h18"/><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/>',
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
    bookmark: '<path d="M6.5 3.5h11a1 1 0 0 1 1 1v16l-6.5-4.6-6.5 4.6v-16a1 1 0 0 1 1-1z"/>',
    camera: '<path d="M4 8h3.2l1.8-2.6h6l1.8 2.6H20a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.6"/>',
    undo: '<path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-15-6.7L3 13"/>',
    chart: '<path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>',
    share: '<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="m16 6-4-4-4 4"/><path d="M12 2v13"/>',
    flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.4-.5-2-1-3-1.1-2.1-.2-4 2-6 .5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.2.4-2.3 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/>',
    infinity: '<path d="M12 12c-2-2.7-4-4-6-4a4 4 0 1 0 0 8c2 0 4-1.3 6-4zm0 0c2 2.7 4 4 6 4a4 4 0 0 0 0-8c-2 0-4 1.3-6 4z"/>',
    close: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/>',
    swap: '<path d="M7 4v16"/><path d="m3 8 4-4 4 4"/><path d="M17 20V4"/><path d="m21 16-4 4-4-4"/>',
    hand: '<path d="M18 11V6a2 2 0 0 0-4 0v5"/><path d="M14 10V4a2 2 0 0 0-4 0v6"/><path d="M10 10.5V6a2 2 0 0 0-4 0v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.9-6-2.4l-3.6-3.6a2 2 0 0 1 2.8-2.8L7 15"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    battery: '<rect x="2" y="7" width="17" height="10" rx="2"/><path d="M22 11v2"/><path d="M6 10v4"/>',
    lightbulb: '<path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z"/>',
    meh: '<circle cx="12" cy="12" r="9.5"/><path d="M8 15h8"/><path d="M9 9.5h.01"/><path d="M15 9.5h.01"/>',
    coins: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.5"/><path d="M12 3v3"/><path d="M12 18v3"/><path d="M3 12h3"/><path d="M18 12h3"/>',
    // Category marks
    specialty: '<rect x="8" y="2" width="13" height="17" rx="2"/><path d="M5.5 6.2 3.6 6.8a2 2 0 0 0-1.3 2.4l3 10.6a2 2 0 0 0 2.5 1.4l5.4-1.6"/><path d="M14.5 5.5l1 2.6 2.6 1-2.6 1-1 2.6-1-2.6-2.6-1 2.6-1z"/>',
    cards: '<rect x="8" y="2" width="13" height="17" rx="2"/><path d="M5.5 6.2 3.6 6.8a2 2 0 0 0-1.3 2.4l3 10.6a2 2 0 0 0 2.5 1.4l5.4-1.6"/>',
    board: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v18"/><path d="M15 3v18"/>',
    dice: '<rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="8.5" cy="8.5" r="1.2" fill="currentColor"/><circle cx="15.5" cy="15.5" r="1.2" fill="currentColor"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/>',
    puzzle: '<path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z"/>',
    words: '<path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/>',
    party: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22z"/>',
    casino: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.5"/><path d="M12 3v3"/><path d="M12 18v3"/><path d="M3 12h3"/><path d="M18 12h3"/>',
    arcade: '<rect x="2" y="6" width="20" height="12" rx="6"/><path d="M6 12h4"/><path d="M8 10v4"/><path d="M15 11h.01"/><path d="M18 13h.01"/>',
    console: '<path d="M6 3h12v13a2 2 0 0 1-2 2h-1.5v3h-5v-3H8a2 2 0 0 1-2-2z"/><rect x="9" y="6" width="6" height="6" rx="1"/><path d="M9 15h6"/>',
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
    // Browsers ignore (and warn about) vibration before the first tap
    if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
    try { if (navigator.vibrate) navigator.vibrate(HAPTIC[kind] || HAPTIC.light); } catch (e) {}
  }

  // ── Audio power: any Web Audio context on the page (the kit's own and each game's) ──
  // A running AudioContext keeps the phone's audio hardware awake even when silent. Count the
  // sounds that are playing; 5 s after the last one ends, suspend the context. Suspend while the
  // app is hidden too. The next sound started on it resumes it first. Contexts a game suspended
  // itself (pause screens) are left alone. Looping music never "ends", so it is never cut off.
  (function () {
    var AC = window.AudioContext || window.webkitAudioContext;
    var OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!AC) return;
    var SLEEP_MS = 5000, all = [];
    function noop() {}
    function rec(c) {
      if (!c || !(c instanceof AC) || (OAC && c instanceof OAC) || typeof c.suspend !== 'function') return null;
      if (!c.__kpow) { c.__kpow = { live: 0, t: 0, ours: false, hid: false }; all.push(c); }
      return c.__kpow;
    }
    function sleepSoon(c, k) {
      clearTimeout(k.t);
      k.t = setTimeout(function () {
        if (!k.live && c.state === 'running') { k.ours = true; try { c.suspend().catch(noop); } catch (e) {} }
      }, SLEEP_MS);
    }
    function patch(proto) {
      // each source type may define its own start (buffer sources do), so patch every one that has it
      if (!proto || !Object.prototype.hasOwnProperty.call(proto, 'start') || Object.prototype.hasOwnProperty.call(proto, '__kpow')) return;
      proto.__kpow = true;
      var start = proto.start;
      proto.start = function () {
        var c = this.context, k = rec(c);
        if (k) {
          clearTimeout(k.t);
          if ((k.ours || k.hid) && c.state === 'suspended' && !doc.hidden) { k.ours = k.hid = false; try { c.resume().catch(noop); } catch (e) {} }
          k.live++;
          var done = false;
          this.addEventListener('ended', function () { if (done) return; done = true; k.live = Math.max(0, k.live - 1); if (!k.live) sleepSoon(c, k); });
        }
        return start.apply(this, arguments);
      };
    }
    ['AudioScheduledSourceNode', 'AudioBufferSourceNode', 'OscillatorNode', 'ConstantSourceNode'].forEach(function (n) { if (window[n]) patch(window[n].prototype); });
    doc.addEventListener('visibilitychange', function () {
      all = all.filter(function (c) { return c.state !== 'closed'; });
      all.forEach(function (c) {
        var k = c.__kpow;
        if (doc.hidden) {
          if (c.state === 'running') { k.hid = true; clearTimeout(k.t); try { c.suspend().catch(noop); } catch (e) {} }
        } else if (k.hid) {
          // back in view: music that was playing picks up again; a silent context waits for its next sound
          if (k.live) { k.hid = false; try { c.resume().catch(noop); } catch (e) {} }
          else { k.hid = false; k.ours = true; }
        }
      });
    });
  })();

  // ── Sound: tiny synthesized effects, no files to download ─────────────────
  var actx = null;
  function soundOn() { return lsGet('gn_sound', '1') === '1' && !timerLocked; }   // (quiet while the game timer has locked play)
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
  // Short burst of filtered noise. Band-passed (not high-passed) with a fast
  // exponential fade, so it reads as paper or wood rather than a cymbal.
  // sweep: optional end frequency for a gentle swoosh.
  function noise(t0, dur, vol, freq, q, sweep) {
    var a = ctx(); if (!a) return;
    var n = Math.max(1, Math.floor(a.sampleRate * dur)), b = a.createBuffer(1, n, a.sampleRate), d = b.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    var s = a.createBufferSource(), g = a.createGain(), f = a.createBiquadFilter(), lp = a.createBiquadFilter(), t = a.currentTime + t0;
    f.type = 'bandpass'; f.frequency.setValueAtTime(freq || 1200, t); f.Q.value = q || 1;
    if (sweep) f.frequency.exponentialRampToValueAtTime(sweep, t + dur);
    lp.type = 'lowpass'; lp.frequency.value = 4200;   // keep the fizz off the top
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.05, t + Math.min(0.006, dur / 4));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.buffer = b; s.connect(f); f.connect(lp); lp.connect(g); g.connect(a.destination); s.start(t); s.stop(t + dur + 0.02);
  }
  var SFX = {
    tap: function () { tone(660, 0, 0.06, 'triangle', 0.07); },
    pop: function () { tone(520, 0, 0.09, 'sine', 0.12, 980); },
    flip: function () { noise(0, 0.05, 0.06, 1500, 0.8); tone(210, 0, 0.05, 'sine', 0.035); },
    deal: function () { noise(0, 0.035, 0.05, 1900, 0.9); tone(260, 0, 0.035, 'sine', 0.03); },
    chip: function () { tone(1800, 0, 0.05, 'square', 0.03); tone(2400, 0.03, 0.05, 'square', 0.025); },
    roll: function () { for (var i = 0; i < 5; i++) { noise(i * 0.055 + Math.random() * 0.015, 0.03, 0.07, 650 + Math.random() * 500, 2.2); tone(170 + Math.random() * 60, i * 0.055, 0.03, 'sine', 0.03); } },
    good: function () { tone(660, 0, 0.1, 'triangle', 0.1); tone(990, 0.08, 0.14, 'triangle', 0.1); },
    bad: function () { tone(300, 0, 0.18, 'sawtooth', 0.05, 160); },
    tick: function () { tone(1200, 0, 0.03, 'square', 0.025); },
    win: function () { [523, 659, 784, 1047].forEach(function (f, i) { tone(f, i * 0.09, 0.22, 'triangle', 0.11); }); tone(1319, 0.38, 0.5, 'triangle', 0.09); },
    lose: function () { [392, 330, 262].forEach(function (f, i) { tone(f, i * 0.16, 0.25, 'triangle', 0.08); }); },
    whoosh: function () { noise(0, 0.22, 0.035, 350, 0.7, 1100); },
    clash: function () { noise(0, 0.09, 0.11, 3200, 1.5); tone(1250, 0, 0.12, 'square', 0.03, 900); tone(2600, 0.01, 0.2, 'triangle', 0.04, 2100); },
    sparkle: function () { [1320, 1760, 2350].forEach(function (f, i) { tone(f, i * 0.06, 0.14, 'sine', 0.05); }); },
    splash: function () { noise(0, 0.16, 0.07, 900, 1.2, 300); tone(180, 0, 0.12, 'sine', 0.06, 90); },
    boom: function () { noise(0, 0.32, 0.08, 240, 0.8, 90); tone(95, 0, 0.28, 'sine', 0.09, 45); },
    // Your turn (online games): one music-box tine, bright and delicate, with a twin a hair apart so it shimmers
    // as it rings out, and a touch of the tine's own uneven overtones
    turn: function () { var f = 1397; tone(f, 0, 1.0, 'sine', 0.07); tone(f * 1.002, 0, 1.0, 'sine', 0.03); tone(f * 3.9, 0, 0.25, 'sine', 0.012); tone(f * 6.3, 0, 0.13, 'sine', 0.004); },
    // A dull, soft card brush (no click): low-pitched paper noise with a faint body, for card carousels
    slide: function () { noise(0, 0.05, 0.03, 480 + Math.random() * 80, 0.9, 300); tone(130, 0, 0.04, 'sine', 0.018); }
  };
  // Recorded sounds (Kenney's CC0 packs, built by scripts/build-sounds.py) live in
  // /sounds as name-1.mp3, name-2.mp3…: real cards, chips, dice, strings, metal and
  // glass. Each play picks a different take and nudges its pitch a little so
  // repeats don't sound canned. The synthesized versions above stand in until
  // the files have loaded, or if they can't load.
  var TAKES = { tap: 3, tick: 2, pop: 2, flip: 4, deal: 3, chip: 4, roll: 3, whoosh: 3, good: 2, bad: 2, win: 2, lose: 2, clash: 2, sparkle: 2, boom: 2, splash: 2 };
  var GAIN = { tap: 0.26, tick: 0.2, pop: 0.3, flip: 0.6, deal: 0.55, chip: 0.5, roll: 0.75, whoosh: 0.32, good: 0.3, bad: 0.26, win: 0.45, lose: 0.4, clash: 0.55, sparkle: 0.5, boom: 0.55, splash: 0.45 };
  var MELODIC = { good: 1, bad: 1, win: 1, lose: 1 };
  var SND_BASE = (function () { try { return new URL('sounds/', (document.currentScript && document.currentScript.src) || location.href).href; } catch (e) { return '/sounds/'; } })();
  var bufs = {}, lastTake = {}, sndLoading = false;
  function loadSounds() {
    if (sndLoading) return; sndLoading = true;
    var OC = window.OfflineAudioContext || window.webkitOfflineAudioContext; if (!OC || !window.fetch) return;
    var dec; try { dec = new OC(1, 1, 44100); } catch (e) { return; }
    Object.keys(TAKES).forEach(function (n) {
      bufs[n] = [];
      for (var i = 1; i <= TAKES[n]; i++) (function (n, i) {
        fetch(SND_BASE + n + '-' + i + '.mp3').then(function (r) { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
          .then(function (b) { return new Promise(function (res, rej) { var pr = dec.decodeAudioData(b, res, rej); if (pr && pr.catch) pr.catch(rej); }); })
          .then(function (buf) { bufs[n][i - 1] = buf; }).catch(function () {});
      })(n, i);
    });
  }
  function playSample(name, vol) {
    var list = bufs[name], a; if (!list) return false;
    var ok = []; for (var i = 0; i < list.length; i++) if (list[i]) ok.push(i);
    if (!ok.length || !(a = ctx())) return false;
    if (ok.length > 1) ok = ok.filter(function (i) { return i !== lastTake[name]; });
    var k = ok[Math.floor(Math.random() * ok.length)]; lastTake[name] = k;
    var src = a.createBufferSource(), g = a.createGain();
    src.buffer = list[k];
    src.playbackRate.value = MELODIC[name] ? 1 : 0.95 + Math.random() * 0.1;
    g.gain.value = (GAIN[name] || 0.4) * (vol == null ? 1 : vol) * (0.9 + Math.random() * 0.2);
    src.connect(g); g.connect(a.destination); src.start();
    return true;
  }
  function soundsLoaded() { var o = {}; Object.keys(bufs).forEach(function (n) { o[n] = bufs[n].filter(Boolean).length; }); return o; }
  // vol: an optional 0–1 multiplier for quieter uses of a sound (the synthesized fallback skips very quiet ones)
  function sfx(name, vol) { if (!soundOn()) return; loadSounds(); try { if (!playSample(name, vol) && !(vol != null && vol < 0.5)) (SFX[name] || SFX.tap)(); } catch (e) {} }
  // Fetch the recordings early (decoding needs no tap), so the first sound is the real one
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { if (soundOn()) setTimeout(loadSounds, 400); });
  else setTimeout(function () { if (soundOn()) loadSounds(); }, 400);

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
  // A full-screen layer (sheet, win screen) must cover the screen. iPhone can place one off it (scrolled with the
  // page, or after the keyboard closes): measure it once it's up and shift it back if it isn't at the top.
  function pinFixed(n, blur) {
    if (blur) try { var a = doc.activeElement; if (a && a !== doc.body && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) a.blur(); } catch (e) {}
    function fix() { if (!n.isConnected) return; n.style.transform = ''; var t = n.getBoundingClientRect().top; if (Math.abs(t) > 1) n.style.transform = 'translateY(' + (-t) + 'px)'; }
    requestAnimationFrame(fix); setTimeout(fix, 350); setTimeout(fix, 900);
    // and again after the device turns (a shift measured for the old shape would leave it off the screen)
    function onR() { if (!n.isConnected) return window.removeEventListener('resize', onR); clearTimeout(onR.t); onR.t = setTimeout(fix, 300); }
    window.addEventListener('resize', onR);
  }
  function sheet(o) {
    o = o || {};
    var body = el('div', { class: 'k-sheet' + (o.help ? ' k-sh-has-help' : ''), role: 'dialog', 'aria-modal': 'true' });
    body.appendChild(el('div', { class: 'grab' }));
    // o.help: a "?" in the top corner that opens an explanation (a function, usually another sheet)
    if (o.help) body.appendChild(el('button', { type: 'button', class: 'icon-btn k-sh-help', 'aria-label': o.helpLabel || 'More about this', html: ICON.help, onclick: function () { sfx('tap'); o.help(); } }));
    if (o.title) body.appendChild(el('h2', { text: o.title }));
    if (o.html != null) body.appendChild(el('div', { html: o.html }));
    if (o.node) body.appendChild(o.node);
    var scrim = el('div', { class: 'k-scrim' }, [body]);
    var closed = false;
    function close(fromCancel) {
      if (closed) return; closed = true;
      scrim.classList.remove('show'); scrim.style.pointerEvents = 'none';
      doc.removeEventListener('keydown', onKey);
      setTimeout(function () { scrim.remove(); }, 300);
      if (fromCancel === true && o.onCancel) o.onCancel();
      if (o.onClose) o.onClose();
      try { window.dispatchEvent(new CustomEvent('kit-sheet-closed')); } catch (e) {}
    }
    function onKey(e) { if (e.key === 'Escape' && o.dismissible !== false) close(true); }   // (a sheet that needs an answer stays up)
    if (o.actions && o.actions.length) {
      var acts = el('div', { class: 'k-acts' });
      o.actions.forEach(function (a) {
        acts.appendChild(el('button', {
          class: 'btn btn-block ' + (a.cls || (a.primary ? 'btn-primary' : a.danger ? 'btn-red' : 'btn-soft')),
          type: 'button', text: a.label,
          onclick: function () { if (closed) return; sfx('tap'); haptic('light'); if (!a.keep) close(); if (a.onClick) a.onClick(); }   // a second tap while it closes does nothing
        }));
      });
      body.appendChild(acts);
    }
    scrim.addEventListener('click', function (e) { if (e.target === scrim && o.dismissible !== false) close(true); });
    if (o.dismissible !== false) sheetDrag(body, close);
    doc.addEventListener('keydown', onKey);
    trapScroll(scrim);
    doc.body.appendChild(scrim); pinFixed(scrim);
    requestAnimationFrame(function () { requestAnimationFrame(function () { scrim.classList.add('show'); }); });
    return { close: close, el: body };
  }
  // While a sheet is up the page behind stays still: a drag (or wheel) moves only something in the sheet that can
  // scroll that way, and stops at its ends instead of carrying on into the page. Sliders and typing fields are left
  // to themselves; sideways rows (chips) still scroll sideways.
  function trapScroll(scrim) {
    var x0 = 0, y0 = 0, axis = null;
    function scroller(t, dir) {
      for (var n = t; n && n !== scrim; n = n.parentElement) {
        var cs = getComputedStyle(n), ov = dir === 'x' ? cs.overflowX : cs.overflowY;
        if ((ov === 'auto' || ov === 'scroll') && (dir === 'x' ? n.scrollWidth > n.clientWidth + 1 : n.scrollHeight > n.clientHeight + 1)) return n;
      }
      return null;
    }
    function atEnd(s, d, dir) {
      if (dir === 'x') return (d > 0 && s.scrollLeft <= 0) || (d < 0 && s.scrollLeft + s.clientWidth >= s.scrollWidth - 1);
      return (d > 0 && s.scrollTop <= 0) || (d < 0 && s.scrollTop + s.clientHeight >= s.scrollHeight - 1);
    }
    scrim.addEventListener('touchstart', function (e) { if (e.touches.length === 1) { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; axis = null; } }, { passive: true });
    scrim.addEventListener('touchmove', function (e) {
      if (e.touches.length > 1 || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
      var dx = e.touches[0].clientX - x0, dy = e.touches[0].clientY - y0;
      if (!axis) { if (Math.abs(dx) + Math.abs(dy) < 4) return; axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'; }
      var s = scroller(e.target, axis);
      if (!s || atEnd(s, axis === 'x' ? dx : dy, axis)) { if (e.cancelable) e.preventDefault(); }
      else { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }   // (measured from here on, so its ends are caught as they come)
    }, { passive: false });
    scrim.addEventListener('wheel', function (e) {
      var s = scroller(e.target, 'y');
      if (!s || atEnd(s, -e.deltaY, 'y')) e.preventDefault();
    }, { passive: false });
  }
  // Pull a sheet down by its handle or title to close it (the rest of the sheet scrolls as usual)
  function sheetDrag(body, close) {
    var st = null;
    body.addEventListener('pointerdown', function (e) {
      if (e.button > 0 || (e.target.closest && e.target.closest('button,input,select,textarea,a'))) return;
      var r = body.getBoundingClientRect(), h = body.querySelector(':scope > h2'), hb = h ? h.getBoundingClientRect().bottom + 8 : r.top + 48;
      if (e.clientY > Math.max(hb, r.top + 48)) return;
      st = { y: e.clientY, id: e.pointerId, dy: 0, on: false, pts: [] };
    });
    body.addEventListener('pointermove', function (e) {
      if (!st || e.pointerId !== st.id) return;
      var dy = e.clientY - st.y;
      if (!st.on) {
        if (Math.abs(dy) < 6) return;
        if (dy < 0) { st = null; return; }
        st.on = true; body.style.transition = 'none';
        try { body.setPointerCapture(e.pointerId); } catch (x) {}
      }
      st.dy = Math.max(0, dy);
      st.pts.push({ y: e.clientY, t: performance.now() }); if (st.pts.length > 6) st.pts.shift();
      body.style.transform = 'translateY(' + st.dy.toFixed(1) + 'px)';
    });
    function end(e) {
      if (!st || e.pointerId !== st.id) return;
      var s = st; st = null;
      if (!s.on) return;
      var a = s.pts[0], b = s.pts[s.pts.length - 1], v = a && b && b.t > a.t ? (b.y - a.y) / (b.t - a.t) : 0;
      if (s.dy > Math.min(140, body.offsetHeight * 0.3) || (v > 0.5 && s.dy > 24)) {
        body.style.transition = 'transform .22s ease-in';
        body.style.transform = 'translateY(' + Math.max(body.offsetHeight, 200) + 'px)';
        haptic('light'); close(true);
      } else {
        body.style.transition = 'transform .32s cubic-bezier(.3,1.4,.5,1)'; body.style.transform = '';
        setTimeout(function () { body.style.transition = ''; }, 340);
      }
    }
    body.addEventListener('pointerup', end); body.addEventListener('pointercancel', end);
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
    // the device turning mid-burst: the canvas takes the new screen, and the pieces fly on from where they are
    var fit = function () { W = innerWidth; H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0); };
    window.addEventListener('resize', fit);
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
      if (age < 3200) requestAnimationFrame(frame); else { cv.remove(); window.removeEventListener('resize', fit); }
    })(t0);
  }

  // ── Catalog helpers ───────────────────────────────────────────────────────
  var game = null;
  // ── Your own Spotify as background music (spotify.js, loaded only when it's wanted) ──
  var KIT_BASE = ((doc.currentScript && doc.currentScript.src) || '').replace(/kit\.js(\?.*)?$/, '');
  var spLoading = null;
  function spotifyLoad() {
    if (window.Spotify) return Promise.resolve(window.Spotify);
    return spLoading || (spLoading = new Promise(function (ok, no) {
      var s = doc.createElement('script'); s.src = KIT_BASE + 'spotify.js'; s.onload = function () { ok(window.Spotify); }; s.onerror = function () { spLoading = null; no(); };
      doc.head.appendChild(s);
    }));
  }
  function spotifyPick(id) { try { var all = JSON.parse(lsGet('gn_spotify', '{}')) || {}; return all[id] || all['*'] || null; } catch (e) { return null; } }
  function spotifyOn() { return !!lsGet('spotify_auth', ''); }
  // true when Spotify plays for this game (the game keeps its own music quiet)
  function spotifyOwns(id) { var p = spotifyPick(id || (game && game.id)); return spotifyOn() && !!(p && p.u && p.u !== 'off'); }
  function spotifySheet(o) { spotifyLoad().then(function (Sp) { Sp.sheet(game ? { id: game.id, name: game.name } : {}, o); }, function () { toast('Couldn’t load Spotify. Check the connection.'); }); }
  // the player at the top of a menu (shows once something is playing); close: shuts that menu first
  function spotifyMini(slot, close) {
    if (!spotifyOn()) return;
    spotifyLoad().then(function (Sp) {
      Sp.mini(slot, { onOpen: function () { close(); spotifySheet(); }, onSearch: function () { close(); spotifySheet({ search: true }); } });
    }, function () {});
  }
  function pageKey() { return location.pathname.replace(/^.*\//, '').replace(/\.html$/, ''); }
  function playerColor(i) {
    return getComputedStyle(root).getPropertyValue('--p' + ((i % 8) + 1)).trim() || '#ffc83d';
  }
  // Text on a colour: white or near-black, whichever stands out more (true contrast, not a brightness guess)
  function inkFor(hex) {
    var h = String(hex).trim().replace(/^#/, '');
    if (/^[0-9a-f]{3}$/i.test(h)) h = h.replace(/./g, '$&$&');
    if (!/^[0-9a-f]{6}$/i.test(h)) return '#1a1033';
    var lum = [0, 2, 4].map(function (i) { var v = parseInt(h.substr(i, 2), 16) / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    var L = 0.2126 * lum[0] + 0.7152 * lum[1] + 0.0722 * lum[2];
    return 1.05 / (L + 0.05) >= (L + 0.05) / 0.0583 ? '#ffffff' : '#1a1033';
  }

  // ── "Continue" rail data (read by the home screen) ────────────────────────
  var resume = {
    set: function (label, o) {
      if (!game) return;
      var all = {}; try { all = JSON.parse(lsGet('gn_resume', '{}')) || {}; } catch (e) {}
      all[game.id] = { ts: Date.now(), label: label || 'In progress', file: pageKey() };
      if (o && o.keys) all[game.id].keys = o.keys;   // saved-game keys, so home can delete it
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
  // Opened from the Daily puzzles list (its link, or ?daily=1): win screens offer the way back to that list
  function fromDaily() {
    if (/[?&]daily=1/.test(location.search)) return true;
    try { return sessionStorage.getItem('fgh_from_daily') === '1'; } catch (e) { return false; }
  }
  function toDaily() {
    sfx('tap');
    try { sessionStorage.setItem('fgh_open_daily', '1'); } catch (e) {}
    var ref = doc.referrer;
    try { var u = new URL(ref); if (u.origin === location.origin && /^\/(index\.html)?$/.test(u.pathname) && history.length > 1) { history.back(); return; } } catch (e) {}
    location.href = '../index.html#daily';
  }
  function goHome() {
    sfx('tap');
    // A game can take over the bar's back button for a screen of its own (Kit.onBack returns true when it handled it)
    try { if (window.Kit && typeof Kit.onBack === 'function' && Kit.onBack() === true) return; } catch (e) {}
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
  // Theme picker: a swatch per theme, tap to switch at once
  // ── Offline: save everything on this device before a flight ─────────────────────────────────────────────
  // The service worker does the saving (see "Ready for offline" there) and reports progress over a message port.
  function swAsk(msg, onMsg) {
    return new Promise(function (ok, no) {
      var sw = navigator.serviceWorker && navigator.serviceWorker.controller;
      if (!sw || !window.MessageChannel) return no(new Error('nosw'));
      var ch = new MessageChannel();
      ch.port1.onmessage = function (e) { var d = e.data || {}; if (d.error) no(new Error(d.error)); else if (d.n != null && !d.done && onMsg) onMsg(d); else ok(d); };
      sw.postMessage(msg, [ch.port2]);
    });
  }
  function mb(b) { return b >= 1e6 ? Math.round(b / 1e6) + ' MB' : Math.max(1, Math.round(b / 1e3)) + ' KB'; }
  function offDate(t) { return new Date(t).toLocaleDateString([], { month: 'short', day: 'numeric' }); }
  function offlineTag() { var t = +lsGet('fgh_offline_at', '0'); return t ? 'Ready · saved ' + offDate(t) : 'Save everything for a flight'; }
  function offlineSheet() {
    sfx('pop');
    var ring = el('div', { class: 'k-off-ring', html: icon('plane') });
    var head = el('b', { text: 'Checking…' }), sub = el('small', { text: '' });
    var bar = el('i'), barBox = el('div', { class: 'k-off-bar' }, [bar]); barBox.hidden = true;
    function li(ic, t) { return el('li', {}, [el('span', { html: icon(ic) }), el('span', { text: t })]); }
    var body = el('div', { class: 'k-off' }, [
      el('div', { class: 'k-off-top' }, [ring, el('div', { class: 'k-off-st' }, [head, sub])]), barBox,
      el('div', { class: 'k-off-cols' }, [
        el('div', {}, [el('h3', { text: 'Works offline' }), el('ul', { class: 'k-off-ok' }, [
          li('check', 'Every game against the computer or pass-and-play'), li('check', 'Arcade, casino, puzzles and dailies'),
          li('check', 'Crosswords, Sandlot stats, Axis & Allies marches'), li('check', 'Console games on this device'), li('check', 'Scores and history (they sync when you’re back)')])]),
        el('div', {}, [el('h3', { text: 'Needs internet' }), el('ul', { class: 'k-off-no' }, [
          li('cloud', 'Online play and open tables'), li('cloud', 'Signing in and syncing'),
          li('cloud', 'Spotify controls (play your downloads in the Spotify app)'), li('cloud', 'Lorcana cards you haven’t seen yet, mini golf course search')])])
      ])
    ]);
    var s, busy = false, go;
    function show(r) {
      var m = r && r.meta, cur = m && m.version === r.version;
      ring.classList.toggle('ok', !!cur); ring.innerHTML = icon(cur ? 'check' : 'plane');
      if (m) lsSet('fgh_offline_at', String(m.at));
      head.textContent = !m ? 'Not saved yet' : cur ? 'Ready for offline' : 'Saved before the latest update';
      sub.textContent = !m ? 'Saves about ' + mb(45e6) + ' on this device' : 'Saved ' + offDate(m.at) + ' · ' + mb(m.bytes) + (cur ? '' : ' · save again to top up') + (m.failed ? ' · ' + m.failed + ' files didn’t save' : '');
      go.textContent = !m ? 'Save everything' : cur ? 'Save again' : 'Top up';
      go.disabled = !navigator.onLine;
      if (!navigator.onLine) sub.textContent += (sub.textContent ? ' · ' : '') + 'connect to the internet to save';
    }
    function run() {
      if (busy) return; busy = true; go.disabled = true; go.textContent = 'Saving…';
      try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}
      barBox.hidden = false; bar.style.width = '0'; ring.classList.add('spin'); head.textContent = 'Saving for offline';
      swAsk({ type: 'offline-prep' }, function (p) {
        bar.style.width = Math.round(p.n / p.total * 100) + '%';
        sub.textContent = p.n + ' of ' + p.total + ' files · ' + mb(p.bytes) + ' of ' + mb(p.all);
      }).then(function (r) {
        busy = false; ring.classList.remove('spin'); bar.style.width = '100%';
        setTimeout(function () { barBox.hidden = true; }, 700);
        show(r); haptic('success'); sfx('good');
      }, function (e) {
        busy = false; ring.classList.remove('spin'); barBox.hidden = true; go.disabled = false; go.textContent = 'Try again';
        head.textContent = 'Couldn’t save everything'; sub.textContent = e.message === 'nosw' ? 'This browser can’t save the app. Open it from the home screen icon.' : 'Check the connection and try again.';
        haptic('error');
      });
    }
    consoleRow(body);
    s = sheet({ title: 'Offline', node: body, actions: [{ label: 'Save everything', primary: true, keep: true, onClick: run }, { label: 'Done', cls: 'btn-soft' }] });
    go = s.el.querySelector('.k-acts .btn');
    swAsk({ type: 'offline-status' }).then(show, function () { head.textContent = 'Not available here'; sub.textContent = 'Open the app from its home screen icon to save it for offline.'; go.disabled = true; });
  }

  // Signed in: the console games (the family's and your own) come down to this device separately, being bigger
  // (console-lib.js, loaded here when the page doesn't have it)
  function withConsoleLib(fn) {
    if (window.ConsoleLib) return fn(window.ConsoleLib);
    var sc = doc.createElement('script'); sc.src = KIT_BASE + 'console-lib.js';
    sc.onload = function () { if (window.ConsoleLib) fn(window.ConsoleLib); }; doc.head.appendChild(sc);
  }
  function consoleRow(body) {
    if (!(window.FGHSync && FGHSync.isPin && FGHSync.isPin())) return;
    var b = el('b', { text: 'Console games' }), sm = el('small', { text: 'Checking…' }), bar = el('i'), barBox = el('div', { class: 'k-off-bar' }, [bar]);
    var go = el('button', { type: 'button', class: 'btn btn-soft', disabled: '' }, ['Download all']);
    var row = el('div', { class: 'k-off-cons' }, [el('span', { class: 'k-off-ci', html: icon('console') }), el('div', { class: 'k-off-st' }, [b, sm]), go]);
    barBox.hidden = true;
    body.insertBefore(barBox, body.lastChild); body.insertBefore(row, barBox);
    withConsoleLib(function (CL) {
      var games = [], busy = false;
      function show() {
        var away = games.filter(function (c) { return !c.local && c.lib; }), have = games.length - away.length;
        sm.textContent = !games.length ? 'None on your shelves yet' : !away.length ? 'All ' + games.length + ' on this device' : have + ' of ' + games.length + ' on this device · ' + mb(CL.toFetch(away));
        go.hidden = !away.length; go.disabled = busy || navigator.onLine === false;
      }
      CL.list().then(function (l) { games = l || []; show(); }, function () { sm.textContent = 'Couldn’t check them'; });
      go.onclick = function () {
        if (busy) return; busy = true; go.disabled = true; go.textContent = 'Downloading…'; barBox.hidden = false; bar.style.width = '0'; sfx('tap');
        CL.saveAll(games, function (p) {
          bar.style.width = Math.round((p.n + (p.landed ? 0 : p.frac)) / Math.max(1, p.total) * 100) + '%';
          if (!p.done) sm.textContent = Math.min(p.n + 1, p.total) + ' of ' + p.total + (p.c ? ' · ' + p.c.name : '');
        }).then(function (failed) {
          busy = false; go.textContent = 'Download all'; setTimeout(function () { barBox.hidden = true; }, 700); show();
          if (failed) { sm.textContent += ' · ' + failed + ' didn’t come down'; haptic('error'); } else { haptic('success'); sfx('good'); }
        });
      };
    });
  }

  function themePick(onDone) {
    sfx('pop');
    var grid = el('div', { class: 'k-themes' }), cur = themeGet(), s;
    THEME_LIST.forEach(function (t) {
      var b = el('button', { type: 'button', class: 'k-theme' + (t.id === cur ? ' on' : ''), 'aria-pressed': String(t.id === cur), onclick: function () {
        themeSet(t.id); cur = t.id; sfx('tap'); haptic('light');
        Array.prototype.forEach.call(grid.children, function (c) { var on = c._id === cur; c.classList.toggle('on', on); c.setAttribute('aria-pressed', String(on)); });
        if (onDone) onDone(t);
      } }, [
        el('span', { class: 'sw', style: { '--t-bg': t.bg, '--t-s': t.s, '--t-t': t.t, '--t-a': t.a } }, [el('i'), el('i'), el('i'), el('b'), el('span', { class: 'ck', html: icon('check') })]),
        el('span', { text: t.name })
      ]);
      b._id = t.id;
      grid.appendChild(b);
    });
    s = sheet({ title: 'Theme', node: grid, actions: [{ label: 'Done', cls: 'btn-soft' }] });
    return s;
  }

  // The game menu, in groups: the game itself, the game's own sections (opts.menu items can name a section),
  // settings as on/off switches (items with a toggle function, plus Sound), then help and leaving
  function menu() {
    sfx('pop');
    var list = el('div', { class: 'k-list' });
    var s, groups = [], byName = {};
    function group(name) { if (!byName[name]) { byName[name] = []; groups.push(name); } return byName[name]; }
    function item(g, ic, label, fn, cls, sub) {
      group(g).push(el('button', { type: 'button', class: cls || '', onclick: function () { sfx('tap'); s.close(); fn(); } },
        [el('span', { class: 'ic', html: P[ic] ? icon(ic) : esc(ic) }), el('span', { class: 'lbl' }, [el('span', { text: label })].concat(sub ? [el('small', { text: sub })] : []))]));
    }
    function toggle(g, ic, label, sub, get, set) {
      var b = el('button', { type: 'button', class: 'tg', role: 'switch', 'aria-checked': String(!!get()) },
        [el('span', { class: 'ic', html: P[ic] ? icon(ic) : esc(ic) }), el('span', { class: 'lbl' }, [el('span', { text: label })].concat(sub ? [el('small', { text: sub })] : [])), el('i', { class: 'sw' })]);
      b.onclick = function () { set(); b.setAttribute('aria-checked', String(!!get())); haptic('light'); };
      group(g).push(b);
    }
    var G = 'Game', top = [];
    // what's playing on Spotify, with its controls, right at the top
    if (spotifyOn()) { var spSlot = el('div'); list.appendChild(spSlot); spotifyMini(spSlot, function () { s.close(); }); }
    // New game, Undo and Past games sit side by side across the top
    function tile(ic, label, fn) {
      top.push(el('button', { type: 'button', class: 'k-tile', onclick: function () { sfx('tap'); s.close(); fn(); } },
        [el('span', { class: 'ic', html: P[ic] ? icon(ic) : esc(ic) }), el('span', { text: label })]));
    }
    if (opts.onNew) tile('sparkle', 'New game', function () {
      if (opts.confirmNew === false) return opts.onNew();
      confirmSheet('Start a new game?', { ok: 'New game', body: 'The current game will be lost.' }).then(function (ok) { if (ok) opts.onNew(); });
    });
    if (opts.undo) tile('undo', 'Undo', opts.undo);
    (opts.menu || []).forEach(function (m) {
      if (m.when && !m.when()) return;
      if (m.top || m.label === 'Past games') { tile(m.icon || 'history', m.label, m.onClick); return; }
      var g = m.toggle ? 'Settings' : m.section || G;
      if (m.toggle) toggle(g, m.icon || 'sparkle', m.label, m.sub, m.toggle, m.onClick);
      else item(g, m.icon || 'sparkle', typeof m.label === 'function' ? m.label() : m.label, m.onClick, m.cls, m.sub);
    });
    if (game && game.cat === 'casino' && window.Casino && Casino.showHistory) item(G, 'chart', 'Bankroll history', function () { Casino.showHistory(); });
    toggle('Settings', 'sound', 'Sound', '', soundOn, function () { lsSet('gn_sound', soundOn() ? '0' : '1'); sfx('good'); });
    item('Settings', 'palette', 'Theme', function () { themePick(); }, '', themeRec(themeGet()).name);
    item('Settings', 'clock', 'Game timer', timerSheet, '', timerStatus());
    var spP = game && spotifyPick(game.id);
    item('Settings', 'headphones', 'Music', spotifySheet, '', !spotifyOn() ? 'Play your Spotify' : spP && spP.u !== 'off' ? spP.n || 'Spotify' : spP ? 'Spotify off in this game' : 'Search or pick a playlist');
    var M = 'More';
    if (opts.rules) item(M, 'book', 'How to play', rules);
    var nReq = linkReqs().length;
    item(M, 'users', 'Frequent players', function () { managePlayers(); }, nReq ? 'k-attn' : '', nReq ? (nReq === 1 ? '1 link request to review' : nReq + ' link requests to review') : null);
    if (game) item(M, 'star', isFav() ? 'Remove from favorites' : 'Add to favorites', function () {
      var on = toggleFav(); toast(on ? 'Added to favorites' : 'Removed from favorites'); haptic('success');
    });
    item(M, 'plane', 'Offline', offlineSheet, '', offlineTag());
    item(M, 'home', 'All games', goHome);
    if (top.length) list.appendChild(el('div', { class: 'k-tiles' }, top));
    groups.forEach(function (g) {
      list.appendChild(el('div', { class: 'k-grp' }, [el('h3', { text: g })].concat(byName[g])));
    });
    s = sheet({ title: game ? game.name : 'Menu', node: list });
  }


  // ── Per-game table themes ─────────────────────────────────────────────────
  // Each game keeps the same layout and controls but gets its own "box":
  // felt colour, card backs and wood. Subtle on purpose. Values: felt
  // [centre, mid, edge], back [from, to], wood [top, bottom] (all optional).
  var THEMES = {
    hearts:        { felt: ['#6e1f33', '#4a1222', '#360b18'], back: ['#a0183a', '#e04a6a'] },
    spades:        { felt: ['#24407a', '#152a55', '#0e1d3f'], back: ['#1c2c5c', '#4b63b8'], wood: ['#5b4636', '#3a2b20'] },
    euchre:        { back: ['#1d6b45', '#3fa36b'] },
    cribbage:      { wood: ['#b07a42', '#7d4f24'], back: ['#7a4b20', '#c08a4a'] },
    'gin-rummy':   { felt: ['#147a74', '#0b524e', '#073c39'], back: ['#0f5f5b', '#d0a24a'] },
    wizard:        { felt: ['#43297a', '#2a1752', '#1c0f3a'], back: ['#2a1752', '#7a52d1'], wood: ['#4a3a5e', '#2c2240'] },
    flip7:         { felt: ['#1a6f8a', '#0e4a60', '#093646'], back: ['#ff7a29', '#ffb52e'] },
    'five-crowns': { felt: ['#2558b0', '#163a7a', '#0f295a'], back: ['#163a7a', '#e2a400'] },
    rook:          { felt: ['#33473d', '#1f2d26', '#151f1a'], back: ['#d9561c', '#ff9a3d'], wood: ['#3a2f28', '#231b16'] },
    phase10:       { felt: ['#1c66b0', '#0f4378', '#0a2f57'], back: ['#d8253a', '#2f6fe0'] },
    freecell:      { felt: ['#1f6b86', '#11475c', '#0b3446'] },
    pyramid:       { felt: ['#6f6a34', '#4a461f', '#353215'], back: ['#b8862a', '#e9c46a'], wood: ['#a07a4a', '#6e5030'] },
    pokersquares:  { felt: ['#7a1f2a', '#521219', '#3c0c12'] },
    lorcana:       {},
    blackjack:     { felt: ['#156b45', '#0c4a2f', '#083721'] },
    baccarat:      { felt: ['#7a1f2a', '#521219', '#3c0c12'] },
    roulette:      { felt: ['#156b45', '#0c4a2f', '#083721'] },
    craps:         { felt: ['#156b45', '#0c4a2f', '#083721'] },
    poker:         { felt: ['#24407a', '#152a55', '#0e1d3f'] },
    threecardpoker:{ felt: ['#0f6a6a', '#094848', '#063434'] },
    paigow:        { felt: ['#7a1f2a', '#521219', '#3c0c12'], back: ['#7a1f2a', '#e2a400'] },
    candymatch:    { felt: ['#5a2f6e', '#3d1d4f', '#2a1238'], wood: ['#a8623c', '#6a321c'] },
    monopoly:      { felt: ['#1f6b4f', '#155039', '#0e3a29'], wood: ['#6b4126', '#412614'], back: ['#c8102e', '#f3901d'] },
    scrabble:      { felt: ['#1f5c4c', '#143f34', '#0d2d25'], wood: ['#8f5a2e', '#5a3417'] },
    applestoapples:{ felt: ['#245069', '#173a4f', '#0f2a3a'], back: ['#b3122e', '#e4475d'], wood: ['#8a4b2a', '#5e2f18'] }
  };
  function applyTheme(id) {
    var t = THEMES[id]; if (!t) return;
    function set(k, v) { if (v) root.style.setProperty(k, v); }
    if (t.felt) { set('--felt-a', t.felt[0]); set('--felt-b', t.felt[1]); set('--felt-c', t.felt[2]); }
    if (t.back) { set('--back-a', t.back[0]); set('--back-b', t.back[1]); set('--back-edge', t.back[2]); }
    if (t.wood) { set('--wood-a', t.wood[0]); set('--wood-b', t.wood[1]); }
  }

  // ── Hold the page still when the whole game fits ───────────────────────
  // On a phone it's easy to drag the whole game up or down by accident (and
  // iOS rubber-bands it). When the page fits the screen we lock it in place;
  // anything that really scrolls (setup screens taller than the screen,
  // sheets, word lists) keeps scrolling.
  var fitLock = false, fitRaf = 0;
  function checkFit() {
    fitRaf = 0;
    var se = doc.scrollingElement || root, fits = se.scrollHeight <= window.innerHeight + 2;
    if (fits && window.scrollY > 0) window.scrollTo(0, 0);
    if (fits !== fitLock) { fitLock = fits; root.classList.toggle('k-fit', fits); }
  }
  function queueFit() { if (!fitRaf) fitRaf = requestAnimationFrame(checkFit); }
  function scrollerFor(t) {
    for (var n = t; n && n !== doc.body && n !== root; n = n.parentElement) {
      if (n.nodeType !== 1) continue;
      var cs = getComputedStyle(n), oy = cs.overflowY, ox = cs.overflowX;
      if ((oy === 'auto' || oy === 'scroll') && n.scrollHeight > n.clientHeight + 1) return n;
      if ((ox === 'auto' || ox === 'scroll') && n.scrollWidth > n.clientWidth + 1) return n;
    }
    return null;
  }
  function startFitLock() {
    queueFit();
    window.addEventListener('resize', queueFit);
    window.addEventListener('orientationchange', function () { setTimeout(queueFit, 250); });
    if (window.ResizeObserver) new ResizeObserver(queueFit).observe(doc.body);
    if (window.MutationObserver) new MutationObserver(queueFit).observe(doc.body, { childList: true, subtree: true });
    // A page that fits the screen never stays shifted: iPhone can leave it scrolled or offset after a double tap
    function unshift() { if (!fitLock) return; var vv = window.visualViewport; if (window.scrollY || (vv && vv.scale < 1.02 && vv.offsetTop > 0.5)) window.scrollTo(0, 0); }
    window.addEventListener('scroll', unshift, { passive: true });
    if (window.visualViewport) { visualViewport.addEventListener('scroll', unshift); visualViewport.addEventListener('resize', unshift); }
    doc.addEventListener('touchend', function () { setTimeout(unshift, 350); }, { passive: true });
    doc.addEventListener('touchmove', function (e) {
      if (!fitLock || e.touches.length > 1) return;   // pinch-zoom still works
      if (scrollerFor(e.target)) return;
      if (e.target.closest && e.target.closest('input[type="range"]')) return;   // sliders need the drag
      if (e.cancelable) e.preventDefault();
    }, { passive: false });
  }

  // ── Orientation: games built for one orientation on phones (Kit.init({orient:'landscape'|'portrait'})) ──
  // Where the browser allows it (Android, installed or full screen) the screen is locked. Everywhere else
  // (iPhone Safari can't lock) a "turn your phone" cover sits over the game until the phone is turned.
  // Tablets and computers are never gated. Games hear 'kit:orient' ({detail:{ok}}) to pause and resume.
  var orientOk = true;
  function isPhone() {
    try { return matchMedia('(hover:none) and (pointer:coarse)').matches && Math.min(screen.width, screen.height) < 600; } catch (e) { return false; }
  }
  function isTouchTablet() {
    try { return matchMedia('(hover:none) and (pointer:coarse)').matches; } catch (e) { return false; }
  }
  // tablets: true also gates touch tablets (iPad) for games whose table only works one way (pinball)
  // Kit.orient(want|null, tablets) runs the same gate later, for games whose modes differ (Poker: the
  // Hold'em table is landscape, the video poker machine portrait); null lifts it (e.g. on the setup screen).
  var orWant = null, orTabs = false, orCover = null, orHooked = false, orTap = false;
  function orUnlock() { try { screen.orientation && screen.orientation.unlock && screen.orientation.unlock(); } catch (e) {} }
  function orLock() { if (orWant && orGated()) try { if (screen.orientation && screen.orientation.lock) screen.orientation.lock(orWant).catch(function () {}); } catch (e) {} }
  function orGated() { return !!orWant && (isPhone() || (orTabs && isTouchTablet())); }
  function orCheck() {
    var land = window.innerWidth > window.innerHeight, ok = !orGated() || (orWant === 'landscape' ? land : !land);
    if (orCover && (ok || orCover.getAttribute('data-want') !== orWant)) { orCover.remove(); orCover = null; }
    if (!ok && !orCover && doc.body) {
      orCover = el('div', { class: 'k-rotate k-rotate-' + orWant, 'data-want': orWant, role: 'alertdialog', 'aria-live': 'polite' }, [
        el('div', { class: 'k-rot-ph', 'aria-hidden': 'true' }, [el('i')]),
        el('b', { text: 'Turn your ' + (isPhone() ? 'phone' : 'iPad') + (orWant === 'landscape' ? ' sideways' : ' upright') }),
        el('span', { text: (game ? game.name : 'This game') + (orWant === 'landscape' ? ' plays in landscape.' : ' plays in portrait.') }),
        // a way out when the device can't (or won't) turn: rotation lock, a stand, a desk
        el('button', { type: 'button', class: 'k-rot-home', html: icon('home') + '<span>Back to home</span>', onclick: function () { sfx('tap'); location.href = rootPath() + 'index.html'; } })
      ]);
      doc.body.appendChild(orCover);
    }
    if (ok !== orientOk) { orientOk = ok; try { doc.dispatchEvent(new CustomEvent('kit:orient', { detail: { ok: ok } })); } catch (e) {} }
  }
  function orientGate(want, tablets) {
    want = want === 'landscape' || want === 'portrait' ? want : null;
    if (want === orWant && !!tablets === orTabs) return;
    orWant = want; orTabs = !!tablets;
    if (!orGated()) orUnlock();
    if (orGated() && !orHooked) {
      orHooked = true;
      doc.addEventListener('pointerdown', function () { if (orTap) { orTap = false; orLock(); } }, { passive: true });   // some browsers only lock after a tap
      window.addEventListener('resize', orCheck);
      window.addEventListener('orientationchange', function () { setTimeout(orCheck, 150); });
      window.addEventListener('pagehide', orUnlock);
    }
    orTap = true; orLock();
    if (doc.body) orCheck(); else doc.addEventListener('DOMContentLoaded', orCheck);
  }

  // the Game Night mark (the home screen's logo), on the bar's home pill
  var HOME_LOGO = '<svg viewBox="40 40 176 176" aria-hidden="true"><g fill="none" stroke-width="18" stroke-linecap="round"><path d="M148 72A58 58 0 0 1 184 108" stroke="#ffd166"/><path d="M184 148A58 58 0 0 1 148 184" stroke="#ff7a8a"/><path d="M108 184A58 58 0 0 1 72 148" stroke="#4fd1c5"/><path d="M72 108A58 58 0 0 1 108 72" stroke="#8b7cff"/></g><g fill="#fff"><circle cx="79" cy="79" r="16"/><circle cx="177" cy="79" r="16"/><circle cx="177" cy="177" r="16"/><circle cx="79" cy="177" r="16"/></g></svg>';
  function init(o) {
    // opened as "#new" (home: New game while one is going): start over once the page has restored its saved game
    if (location.hash === '#new' && o && o.onNew) {
      try { window.history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
      setTimeout(function () {
        try { o.onNew(); } catch (e) {}
        setTimeout(function () { if (location.hash === '#new') try { window.history.replaceState(window.history.state, '', location.pathname + location.search); } catch (e) {} }, 50);
      }, 0);
    }
    opts = o || {};
    startFitLock();
    game = findGameSafe(opts.id || pageKey());
    if (opts.orient) orientGate(opts.orient, opts.orientTablets);
    var accent = opts.color || (game && game.color) || '#ffc83d';
    root.style.setProperty('--accent', accent);
    root.style.setProperty('--accent-ink', inkFor(accent));
    if (game) { doc.title = game.name + ' · Game Night'; applyTheme(game.id); }
    if (game && spotifyOn() && spotifyPick(game.id)) spotifyLoad().then(function (Sp) { Sp.gameStart(game.id); }, function () {});
    // Faint silhouette of the game's mark in the middle of the table
    if (game && window.GameIcon && GameIcon.mark && opts.mark !== false) {
      var mk = GameIcon.mark(game.id);
      if (mk) root.style.setProperty('--felt-mark', 'url("data:image/svg+xml,' + encodeURIComponent(mk) + '")');
    }
    if (opts.theme) { THEMES._custom = opts.theme; applyTheme('_custom'); }

    var bar = el('header', { class: 'gbar' }, [
      // back to the home screen: a pill that says so (the title's own arrow is for the game's modes)
      el('button', { class: 'k-home', type: 'button', 'aria-label': 'Game Night home', html: ICON.back + '<span class="k-home-logo">' + HOME_LOGO + '</span>', onclick: goHome }),
      el('div', { class: 'ttl' + (game && window.GameIcon ? ' has-ic' : '') }, [
        game && window.GameIcon ? el('span', { class: 'gi', html: GameIcon(game.id) }) : null,
        el('span', { text: opts.title || (game && game.name) || doc.title })
      ]),
      opts.rules ? el('button', { class: 'icon-btn', type: 'button', 'aria-label': 'How to play', html: ICON.help, onclick: rules }) : null,
      el('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Menu', html: ICON.more, onclick: menu })
    ]);
    doc.body.insertBefore(bar, doc.body.firstChild);
    gbarEl = bar;
    requestAnimationFrame(fitBar);
    window.addEventListener('resize', function () { clearTimeout(fitBar.t); fitBar.t = setTimeout(fitBar, 120); });
    try { doc.fonts.addEventListener('loadingdone', function () { requestAnimationFrame(fitBar); }); } catch (e) {}   // measured again in the title's own font (the first look can be in the fallback)
    try { new ResizeObserver(function () { requestAnimationFrame(fitBar); }).observe(gbarEl.querySelector('.ttl > span:not(.gi):not(.k-chev)') || gbarEl.querySelector('.ttl')); } catch (e) {}   // and when the name's room changes (renamed, or its arrow shows after setup)
    // games with modes, options or players to pick again: the title gets a down arrow that goes back to that
    // choice (games with their own picker call Kit.titleSwitch and take the arrow over)
    // while the setup screen is showing there's nothing to go back to: the arrow hides (html.k-in-setup)
    var setupChk = function () { var st = doc.querySelector('.setup .k-start'); root.classList.toggle('k-in-setup', !!(st && st.offsetParent !== null)); };
    try { var mo = new MutationObserver(function () { if (setupChk.t) return; setupChk.t = requestAnimationFrame(function () { setupChk.t = 0; setupChk(); }); }); mo.observe(doc.body, { childList: true, subtree: true }); } catch (e) {}
    setTimeout(setupChk, 0);
    if (opts.onNew) titleSwitch(opts.title || (game && game.name) || doc.title, function () {
      if (root.classList.contains('k-in-setup')) return;
      if (opts.confirmNew === false) return opts.onNew();
      confirmSheet('Change the game setup?', { ok: 'Change', body: 'The current game will be lost.' }).then(function (ok) { if (ok) opts.onNew(); });
    }, 'Change the game setup');
    return bar;
  }

  // Kit.titleSwitch(text, onClick, label): for games with their own picker (a pinball table, a slot
  // machine, a level, a teller). The bar title shows what's being played, with a small down arrow;
  // tapping it goes back to the game's own picker instead of all the way home.
  // Kit.titleSwitch(null) puts the plain game name back (use it while the picker is showing).
  var gbarEl = null, tsw = null;
  // The home pill keeps its label while the title fits; when a long title would be cut off, the pill drops to
  // the arrow alone (gbar.k-tight) so the name wins
  function fitBar() {
    if (!gbarEl) return;
    gbarEl.classList.remove('k-tight');
    var t = gbarEl.querySelector('.ttl > span:not(.gi):not(.k-chev)');
    if (t && t.scrollWidth > t.clientWidth) gbarEl.classList.add('k-tight');
  }
  function titleSwitch(text, onClick, label) {
    var ttl = gbarEl && gbarEl.querySelector('.ttl'); if (!ttl) return;
    var txt = ttl.lastElementChild && ttl.lastElementChild.classList.contains('k-chev') ? ttl.lastElementChild.previousElementSibling : ttl.lastElementChild;
    if (!tsw) {
      tsw = { name: txt.textContent, fn: null, chev: el('span', { class: 'k-chev', 'aria-hidden': 'true', html: icon('down') }) };
      ttl.addEventListener('click', function () { if (tsw.fn) { sfx('tap'); tsw.fn(); } });
      ttl.addEventListener('keydown', function (e) { if (tsw.fn && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); tsw.fn(); } });
    }
    tsw.fn = text ? onClick : null;
    txt.textContent = text || tsw.name;
    if (text) {
      if (!tsw.chev.parentNode) ttl.appendChild(tsw.chev);
      ttl.classList.add('k-switch'); ttl.setAttribute('role', 'button'); ttl.setAttribute('tabindex', '0');
      ttl.setAttribute('aria-label', text + '. ' + (label || 'Choose another'));
    } else {
      if (tsw.chev.parentNode) tsw.chev.remove();
      ttl.classList.remove('k-switch'); ttl.removeAttribute('role'); ttl.removeAttribute('tabindex'); ttl.removeAttribute('aria-label');
    }
    requestAnimationFrame(fitBar);
  }
  // Home screen sections in the order you set in Preferences (gn_cat_order: [cat ids]); new sections go at the end
  function catsOrdered() {
    var base = typeof GAME_CATS !== 'undefined' ? GAME_CATS.slice() : [], order = [];
    try { order = JSON.parse(lsGet('gn_cat_order', '[]')) || []; } catch (e) {}
    if (!Array.isArray(order) || !order.length) return base;
    var at = function (c) { var i = order.indexOf(c.id); return i < 0 ? 1000 + base.indexOf(c) : i; };
    return base.sort(function (a, b) { return at(a) - at(b); });
  }
  // Sections switched off in Preferences (gn_cat_off: [cat ids]): their games leave the home screen, its search and
  // Surprise; the games themselves stay put (switch the section back on and they're all there)
  function catsOff() { try { var a = JSON.parse(lsGet('gn_cat_off', '[]')); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  function catOn(id) { return catsOff().indexOf(id) < 0; }
  function catName(id) { try { for (var i = 0; i < GAME_CATS.length; i++) if (GAME_CATS[i].id === id) return GAME_CATS[i].name; } catch (e) {} return ''; }
  function findGameSafe(k) { try { return typeof findGame === 'function' ? findGame(k) : null; } catch (e) { return null; } }

  // Names of people this household plays with: the Frequent Players list first,
  // then anyone who appears in saved game history (which syncs across devices).
  // Computer opponents get a random famous robot / AI / alien name.
  var CPU_NAMES = ['HAL 9000', 'Linguo', 'Johnny 5', 'WALL-E', 'EVE', 'Optimus Prime', 'Bender', 'C-3PO', 'R2-D2',
    'Rocky', 'BB-8', 'K-2SO', 'Baymax', 'Data', 'Marvin', 'KITT', 'Rosie', 'Iron Giant', 'Robby', 'T-800',
    'Sonny', 'Stitch', 'E.T.', 'ALF', 'Groot', 'Bumblebee', 'Megatron', 'Gort', 'Number 5', 'Dewey', 'Huey',
    'Wheatley', 'Bishop', 'Ash', 'JARVIS', 'Ultron', 'Vision', 'Chappie', 'Mother', 'Klaatu'];
  function cpuNames(n, avoid, maxLen) {
    var pool = CPU_NAMES.filter(function (x) { return (avoid || []).indexOf(x) < 0 && (!maxLen || x.length <= maxLen); }), out = [];
    while (out.length < n && pool.length) out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    return out;
  }
  var NOT_NAMES = /^(you|me|computer|cpu|ai|dealer|bank|house|player\s*\d+|p\d|robo|chip|bolt|pixel|sprocket|gizmo|widget|north|south|east|west|team\s*\d+)$/i;
  function isPersonName(n) {
    n = String(n || '').trim();
    if (!n || n.length > 14 || NOT_NAMES.test(n)) return false;
    if (/&|\/|\+| and /i.test(n)) return false;   // team names like "Tim & Jamie"
    var l = n.toLowerCase();
    return !CPU_NAMES.some(function (c) { return c.toLowerCase() === l; });
  }
  // Board games record "Tim (White)" so history shows who had which side; the
  // person is still just "Tim".
  function baseName(n) { return String(n || '').replace(/\s*\([^()]{1,12}\)\s*$/, '').trim(); }
  function hiddenNames() { try { return JSON.parse(lsGet('gn_hidden_names', '[]')) || []; } catch (e) { return []; } }
  function nameCounts() { try { return JSON.parse(lsGet('gn_name_counts', '{}')) || {}; } catch (e) { return {}; } }
  function countPlays(list) {
    var c = nameCounts();
    list.forEach(function (n) { var k = n.toLowerCase(); c[k] = (c[k] || 0) + 1; });
    lsSet('gn_name_counts', JSON.stringify(c));
  }
  // Frequent players: the one list of people this household plays with.
  // Stored in 'frequent_players' (players.js). Names that appear in saved game
  // history (which syncs across devices) are added to it automatically unless
  // someone removed them. Ordered by how often each person has played.
  function fpRead() { try { var a = JSON.parse(lsGet('frequent_players', '[]')); return Array.isArray(a) ? a.filter(function (x) { return typeof x === 'string' && x.trim(); }) : []; } catch (e) { return []; } }
  function fpWrite(a) { lsSet('frequent_players', JSON.stringify(a)); }
  function historyNames() {
    var seen = {};
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i); if (!k || k.indexOf('gh_') !== 0) continue;
        var list = JSON.parse(localStorage.getItem(k) || '[]');
        if (!Array.isArray(list)) continue;
        list.forEach(function (e) {
          (e && Array.isArray(e.players) ? e.players : []).forEach(function (p) {
            var n = baseName((p && (p.name || p)) || '');
            if (isPersonName(n)) { var key = n.toLowerCase(); seen[key] = seen[key] || { n: n, c: 0 }; seen[key].c++; }
          });
        });
      }
    } catch (e) {}
    return seen;
  }
  function knownNames() {
    var hidden = hiddenNames().map(function (x) { return x.toLowerCase(); });
    var fp = [], have = {}, hist = historyNames(), changed = false;
    // Fold "Tim (White)" back into "Tim" (older games added these as separate people)
    fpRead().forEach(function (n) {
      var b = baseName(n), k = b.toLowerCase();
      if (b !== n) changed = true;
      if (!b || have[k]) { changed = true; return; }
      have[k] = true; fp.push(b);
    });
    Object.keys(hist).forEach(function (k) {
      if (!have[k] && hidden.indexOf(k) < 0) { fp.push(hist[k].n); have[k] = true; changed = true; }
    });
    if (changed) fpWrite(fp);
    var counts = nameCounts();
    var list = fp.filter(function (n) { return isPersonName(n) && hidden.indexOf(n.toLowerCase()) < 0; });
    var order = {}; list.forEach(function (n, i) { order[n.toLowerCase()] = i; });
    function plays(n) { var k = n.toLowerCase(); return (counts[k] || 0) + (hist[k] ? hist[k].c : 0); }
    return list.sort(function (a, b) { return plays(b) - plays(a) || order[a.toLowerCase()] - order[b.toLowerCase()]; });
  }
  function playsOf(n) { var k = String(n).toLowerCase(), h = historyNames(); return (nameCounts()[k] || 0) + (h[k] ? h[k].c : 0); }

  // Sheet: pick one of the regulars (the 5 who play most on top, then everyone else A to Z), or type a new name.
  function pickName(onPick, o) {
    o = o || {};
    var taken = (o.taken || []).map(function (x) { return String(x || '').toLowerCase(); });
    var box = el('div', { class: 'k-names' }), s;
    var names = knownNames();
    if (!names.length) box.appendChild(el('p', { class: 'muted', text: 'No frequent players yet. Type a name below and it will be saved for next time.' }));
    var top = names.length > 6 ? names.slice(0, 5) : names, rest = names.length > 6 ? names.slice(5).sort(function (a, b) { return a.localeCompare(b); }) : [];
    if (rest.length) box.appendChild(el('div', { class: 'label', style: { margin: '0 2px' }, text: 'Most frequent' }));
    top.concat(rest).forEach(function (n, j) {
      if (rest.length && j === top.length) box.appendChild(el('div', { class: 'label', style: { margin: '10px 2px 0' }, text: 'Everyone else' }));
      var used = taken.indexOf(n.toLowerCase()) >= 0;
      box.appendChild(el('button', { type: 'button', class: 'k-name' + (used ? ' used' : ''), disabled: used, onclick: function () { s.close(); sfx('pop'); haptic('light'); onPick(n); } }, [
        avMarked(n, 'var(--surface-3)'),
        el('span', { class: 'grow', text: n }),
        whoMark(n) === 'me' ? el('span', { class: 'dim', text: 'you' }) : null,
        used ? el('span', { class: 'dim', text: 'playing' }) : null
      ]));
    });
    var inp = el('input', { class: 'input', maxlength: 14, placeholder: 'New name', autocomplete: 'off', autocorrect: 'off', spellcheck: 'false' });
    function addNew() {
      var v = inp.value.trim(); if (!v) return;
      if (!fpRead().some(function (x) { return x.toLowerCase() === v.toLowerCase(); })) fpWrite(fpRead().concat([v]));
      unhide(v); s.close(); sfx('pop'); onPick(v);
    }
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') addNew(); });
    var foot = el('div', { class: 'row', style: { 'margin-top': '14px' } }, [inp, el('button', { type: 'button', class: 'btn btn-primary btn-sm', text: 'Add', onclick: addNew })]);
    var node = el('div', null, [box, foot, el('button', { type: 'button', class: 'btn btn-ghost btn-block', style: { 'margin-top': '8px' }, html: icon('pencil') + '<span>Edit frequent players</span>', onclick: function () { s.close(); managePlayers(); } })]);
    s = sheet({ title: o.title || 'Who is it?', node: node });
  }
  // Roster edits sync with the account (localStorage fgh_players_at, synced as 'players'): each name's newest
  // change wins on every device, so a removed player stays removed after a reinstall or on another phone.
  var PL_KEY = 'fgh_players_at';
  function plRead() { try { var m = JSON.parse(lsGet(PL_KEY, '{}')); return m && typeof m === 'object' && !Array.isArray(m) ? m : {}; } catch (e) { return {}; } }
  function plMark(n, hidden) {
    n = String(n || '').trim(); if (!n) return;
    var m = plRead(); m[n.toLowerCase()] = { n: n, t: Date.now(), h: hidden ? 1 : 0 }; lsSet(PL_KEY, JSON.stringify(m));
    try { if (window.FGHSync && FGHSync.noteWrite) FGHSync.noteWrite(PL_KEY); } catch (e) {}
  }
  function hideName(n) {
    var h = hiddenNames(); if (h.indexOf(n) < 0) h.push(n); lsSet('gn_hidden_names', JSON.stringify(h));
    plMark(n, true);
  }
  // added: the player was added on purpose (not just typed into a game), so other devices list them too
  function unhide(n, added) {
    var k = String(n).toLowerCase(), was = hiddenNames().some(function (x) { return x.toLowerCase() === k; });
    var h = hiddenNames().filter(function (x) { return x.toLowerCase() !== k; });
    lsSet('gn_hidden_names', JSON.stringify(h));
    if (was || added) plMark(n, false);
  }
  // Frequent players editor: add, rename, remove. Used in a sheet (game menu,
  // home menu, name picker) and full-page on games/players.html.
  function playersPanel() {
    var wrap = el('div'), list = el('div', { class: 'k-names', 'data-live': '1' });
    list._paint = function () { paint(); };
    function paint() {
      list.innerHTML = '';
      // people who linked you from their phone, waiting for your answer
      reqRows(paint).forEach(function (row) { list.appendChild(row); });
      var names = knownNames();
      if (!names.length && !linkReqs().length) list.appendChild(el('p', { class: 'muted', text: 'No frequent players yet. Add the people you play with.' }));
      names.forEach(function (n) {
        var p = playsOf(n);
        list.appendChild(el('div', { class: 'k-name' }, [
          el('button', { type: 'button', class: 'av-btn', 'aria-label': 'Change ' + poss(n) + ' avatar', title: 'Change avatar', onclick: function () { avatarEdit(n, paint); } }, [avEl(n, null, 'var(--surface-3)')]),
          el('span', { class: 'grow' }, [el('span', { text: n }), (function () {
            var r = window.FGHSync && FGHSync.linkOf && FGHSync.linkOf(n);
            if (r && !r.hs && !r.gone) return el('small', { class: 'k-plays k-wait', text: 'Waiting to accept' });
            var ini = iniOf(n), bits = [];
            if (ini) bits.push(ini);
            if (p) bits.push(p + (p === 1 ? ' game' : ' games'));
            return bits.length ? el('small', { class: 'k-plays', text: bits.join(' · ') }) : null;
          })()]),
          // the signed-in person is already themselves: no link button for them
          whoMark(n) === 'me' ? el('span', { class: 'k-you', text: 'You' }) : el('button', { type: 'button', class: 'icon-btn' + (function () { var r = window.FGHSync && FGHSync.linkOf && FGHSync.linkOf(n); return r ? (r.hs ? ' lk-on' : ' lk-wait') : ''; })(), 'aria-label': 'Link ' + n + ' to their profile', title: 'Link to their profile', html: icon('link'), onclick: function () { linkSheet(n, paint); } }),
          el('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Edit ' + n, html: icon('pencil'), onclick: function () {
            var inp = el('input', { class: 'input', maxlength: 14, value: n, autocomplete: 'off' }), s2;
            var ini0 = iniOf(n), iin = el('input', { class: 'input k-ini-in', maxlength: 3, value: ini0, placeholder: 'ABC', autocomplete: 'off', autocorrect: 'off', autocapitalize: 'characters', spellcheck: 'false' });
            iin.addEventListener('input', function () { var c = iniClean(iin.value); if (c !== iin.value) iin.value = c; });
            var form = el('div', { class: 'k-edit' }, [el('div', { class: 'label', text: 'Name' }), inp, el('div', { class: 'label', text: 'Arcade initials' }), iin]);
            function go() {
              var v = inp.value.trim(), iv = iniClean(iin.value); s2.close();
              if (iv !== ini0 && (iv.length >= 2 || !iv)) iniSet(v && v !== n ? v : n, iv);
              if (!v || v === n) { paint(); return; }
              if (ini0 && iv === ini0) { iniSet(v, ini0); iniSet(n, ''); }   // the initials go with the new name
              var fp = fpRead().map(function (x) { return x.toLowerCase() === n.toLowerCase() ? v : x; });
              fpWrite(fp);
              var c = nameCounts(), ok = n.toLowerCase(), nk = v.toLowerCase();
              if (c[ok]) { c[nk] = (c[nk] || 0) + c[ok]; delete c[ok]; lsSet('gn_name_counts', JSON.stringify(c)); }
              hideName(n); unhide(v, true);
              sfx('good'); paint();
            }
            inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') go(); });
            iin.addEventListener('keydown', function (e) { if (e.key === 'Enter') go(); });
            s2 = sheet({ title: 'Edit ' + n, node: form, actions: [{ label: 'Save', primary: true, keep: true, onClick: go }, { label: 'Cancel', cls: 'btn-ghost' }] });
            setTimeout(function () { inp.focus(); inp.select(); }, 350);
          } }),
          el('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Remove ' + n, html: icon('close'), onclick: function () {
            fpWrite(fpRead().filter(function (x) { return x.toLowerCase() !== n.toLowerCase(); }));
            hideName(n);
            sfx('tap'); toast(n + ' removed'); paint();
          } })
        ]));
      });
    }
    var inp = el('input', { class: 'input', maxlength: 14, placeholder: 'Add a player', autocomplete: 'off', autocorrect: 'off', spellcheck: 'false' });
    function add() {
      var v = inp.value.trim(); if (!v) return;
      if (!fpRead().some(function (x) { return x.toLowerCase() === v.toLowerCase(); })) fpWrite(fpRead().concat([v]));
      unhide(v, true); inp.value = ''; sfx('pop'); paint();
    }
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') add(); });
    wrap.appendChild(el('p', { class: 'muted', style: { 'margin-bottom': '12px' }, text: 'These names are offered whenever a game asks who’s playing, most played first.' }));
    wrap.appendChild(list);
    wrap.appendChild(el('div', { class: 'row', style: { 'margin-top': '14px' } }, [inp, el('button', { type: 'button', class: 'btn btn-primary btn-sm', text: 'Add', onclick: add })]));
    paint();
    return wrap;
  }
  function managePlayers(onDone) {
    sheet({ title: 'Frequent players', node: playersPanel(), actions: [{ label: 'Done', cls: 'btn-soft' }], onClose: function () { if (onDone) onDone(); } });
  }

  // ── Setup screen ──────────────────────────────────────────────────────────
  // Kit.setup(rootEl, {
  //   modes:   [{id, icon, title, desc}]       icon = a Kit.icon name           optional mode cards
  //   mode:    default mode id (modeLocked: true = use it even if a different mode was picked last time)
  //   players: {min, max, count, names:true, cpu:(mode)=>bool|'seats', seatLabel}
  //   options: [{id, label, choices:[[value,label],...], value, help}]  segmented pickers
  //            help: plain-language explanation shown by a tappable "?" next to
  //            the label. A choice can carry its own note as a third item,
  //            [value, label, help]; the note for the chosen value shows too.
  //   intro:   short line under the title
  //   start:   button label
  //   onStart: function(cfg)   cfg = {mode, players:[{name,cpu,color}], options:{}}
  // })
  // "Phone" in setup text reads oddly on an iPad: say what the device is
  var bigScreen = Math.min(screen.width || 0, screen.height || 0) >= 700;
  function devWord(t) { return bigScreen && typeof t === 'string' ? t.replace(/\b(the|this|one|a) phone\b/gi, function (m, a) { return a + ' iPad'; }) : t; }
  function setup(host, o) {
    o = o || {};
    host.innerHTML = '';
    var state = { mode: o.mode || (o.modes && o.modes[0] && o.modes[0].id) || null, count: 0, options: {} };
    var P = o.players || null;
    var saved = {};
    try { saved = JSON.parse(lsGet('gn_setup_' + (game ? game.id : pageKey()), '{}')) || {}; } catch (e) {}
    if (saved.mode && !o.modeLocked && o.modes && o.modes.some(function (m) { return m.id === saved.mode; })) state.mode = saved.mode;
    (o.options || []).forEach(function (op) { state.options[op.id] = saved.options && saved.options[op.id] != null ? saved.options[op.id] : op.value; });
    var names = (saved.names || []).map(function (n) { return isPersonName(n) ? n : ''; });
    var bots = cpuNames(8);
    var openHelp = {};
    // Opened from the home screen with its players filter on (?np=1 Just me, 2 Two of us, 3 Three or more):
    // start on a mode that suits that many people (vs Computer or solo for one, Pass & play for more) and seat them
    var NP = 0; try { NP = Math.min(3, parseInt(new URLSearchParams(location.search).get('np'), 10) || 0); } catch (e) {}
    if (NP && P && !EDIT_DEFAULTS) {
      var cpuOf = function (m) { return typeof P.cpu === 'function' ? P.cpu(m) : P.cpu; };
      var fits = function (m, h) {   // can this mode seat h people at this device? (computer seats mean one person)
        if (cpuOf(m)) return h === 1;
        var r = (typeof P.range === 'function' && P.range(m)) || [P.min || 1, P.max || P.min || 1];
        return h >= 3 ? r[1] >= 3 : h >= r[0] && h <= r[1];
      };
      if (o.modes && o.modes.length > 1 && !o.modeLocked && !fits(state.mode, NP)) {
        var fit = o.modes.filter(function (m) { return !/online|real/i.test(m.id) && fits(m.id, NP); })[0];
        if (fit) state.mode = fit.id;
      }
      if (!cpuOf(state.mode)) saved = Object.assign({}, saved, { count: NP >= 3 ? Math.max(3, saved.count || 0) : NP });
    }

    var wrap = el('div', { class: 'setup' });
    wrap.appendChild(el('div', { class: 'setup-hero' }, [
      game && window.GameIcon ? el('div', { class: 'k-hero-ic', html: GameIcon(game.id) }) : null,
      el('h1', { text: o.title || (game && game.name) || '' }),
      el('p', { text: EDIT_DEFAULTS ? 'Set how this game starts. Saved on this device.' : o.intro || (game && game.tag) || '' })
    ]));
    if (EDIT_DEFAULTS) wrap.firstChild.insertBefore(el('div', { class: 'k-defs-tag', text: 'Defaults' }), wrap.firstChild.querySelector('h1'));

    // Who's playing comes first, right under the title; then the modes and options.
    // Games that add their own pickers put them after .k-seats (options live in .k-opts).
    var seatsBox = el('div', { class: 'stack k-seats' });
    wrap.appendChild(seatsBox);
    var modesBox = null;
    if (o.modes && o.modes.length > 1) {
      modesBox = el('div', { class: 'modes' });
      wrap.appendChild(modesBox);
    }
    var optsBox = el('div', { class: 'stack k-opts' });
    wrap.appendChild(optsBox);

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
        }, [el('span', { class: 'e', html: icon(m.icon || 'sparkle') }), el('span', { class: 'tx' }, [el('span', { class: 't', text: m.title }), el('span', { class: 'd', text: devWord(m.desc || '') })]), el('span', { class: 'ok', html: icon('check') })]));
      });
    }
    // op.choices can be a function of (player count, mode), e.g. "who goes first" offering each seat
    function choicesOf(op) { return typeof op.choices === 'function' ? op.choices(state.count, state.mode) : op.choices; }
    function renderOptions() {
      optsBox.innerHTML = '';
      (o.options || []).forEach(function (op) {
        if (op.when && !op.when(state.mode)) return;
        var seg = el('div', { class: 'seg' }), choices = choicesOf(op);
        if (!choices.some(function (c) { return String(c[0]) === String(state.options[op.id]); })) state.options[op.id] = op.value;
        choices.forEach(function (c) {
          seg.appendChild(el('button', {
            type: 'button', class: String(state.options[op.id]) === String(c[0]) ? 'on' : '', text: c[1],
            onclick: function () { state.options[op.id] = c[0]; sfx('tap'); renderOptions(); }
          }));
        });
        var lab = el('div', { class: 'label' }, [el('span', { text: op.label })]);
        var cur = choices.filter(function (c) { return String(c[0]) === String(state.options[op.id]); })[0];
        var note = devWord([op.help, cur && cur[2]].filter(Boolean).join(' '));
        var hasHelp = op.help || choices.some(function (c) { return c[2]; });
        var box = el('div', { class: 'k-opt' + (openHelp[op.id] ? ' help-on' : '') }, [lab, seg]);
        if (hasHelp) {
          lab.appendChild(el('button', { type: 'button', class: 'k-q', 'aria-label': 'What does ' + op.label + ' mean?', 'aria-expanded': String(!!openHelp[op.id]), text: '?',
            onclick: function () { openHelp[op.id] = !openHelp[op.id]; sfx('tap'); renderOptions(); } }));
          box.appendChild(el('p', { class: 'k-help', text: note || '' }));
        }
        optsBox.appendChild(box);
      });
    }
    function renderSeats() {
      seatsBox.innerHTML = '';
      if (!P) { renderOptions(); return; }
      var r = range(), cpu = cpuFor();
      if (!state.count) state.count = Math.min(r[1], Math.max(r[0], saved.count || P.count || r[0]));
      state.count = Math.min(r[1], Math.max(r[0], state.count));
      renderOptions();
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
      // Crowded tables: keep robot names short so seat labels fit
      if (state.count >= 4) bots.forEach(function (b, k) { if (b.length > 8) bots[k] = cpuNames(1, bots, 8)[0] || b; });
      for (var i = 0; i < state.count; i++) {
        (function (i) {
          var isCpu = cpu === 'seats' ? i > 0 : (cpu && i > 0);
          var c = playerColor(i);
          var inp = el('input', {
            class: 'input', type: 'text', maxlength: 14, autocomplete: 'off', autocorrect: 'off', spellcheck: 'false',
            placeholder: i === 0 && cpu ? 'Your name' : 'Player ' + (i + 1),
            value: isCpu ? bots[i - 1] : (names[i] || '')
          });
          inputs.push(inp);
          var row = el('div', { class: 'seat' + (isCpu ? ' cpu' : '') }, [isCpu ? el('span', { class: 'avatar', style: { '--c': c }, html: icon('bot') }) : seatBadge(inp.value, i, c)]);
          var field = el('div', { class: 'seat-field' }, [inp]);
          if (isCpu) {
            inp.readOnly = true; inp.setAttribute('aria-label', 'Computer player');
            field.appendChild(el('button', { type: 'button', class: 'seat-btn', 'aria-label': 'New computer name', html: icon('shuffle'), onclick: function () {
              bots[i - 1] = cpuNames(1, bots, state.count >= 4 ? 8 : 0)[0] || bots[i - 1]; inp.value = bots[i - 1]; sfx('pop'); haptic('light');
            } }));
          } else {
            inp.addEventListener('input', function () {
              names[i] = inp.value; clr.hidden = !inp.value;
              var was = row.firstChild, nb = seatBadge(inp.value, i, c);
              if (was.getAttribute('data-who') !== nb.getAttribute('data-who')) row.replaceChild(nb, was);
            });
            var clr = el('button', { type: 'button', class: 'seat-clear', 'aria-label': 'Clear name', html: icon('close'), onclick: function () {
              names[i] = ''; sfx('tap'); haptic('light'); renderSeats();
              var again = seatsBox.querySelectorAll('input')[i]; if (again) again.focus();
            } });
            clr.hidden = !inp.value;
            field.appendChild(clr);
            var pick = el('button', { type: 'button', class: 'seat-btn', 'aria-label': 'Choose a player', html: icon('users'), onclick: function () {
              pickName(function (n) { names[i] = n; renderSeats(); }, { taken: names.slice(0, state.count).filter(function (x, j) { return j !== i; }), title: 'Seat ' + (i + 1) });
            } });
            field.appendChild(pick);
            // the seat's avatar is a big target for choosing who sits there, too
            row.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('.seat > .avatar, .seat > .seat-av')) { sfx('tap'); pick.click(); } });
          }
          row.appendChild(field);
          // Two or more people (no computer seats): a handle to drag a player up or down the order
          if (!cpu && state.count > 1) row.appendChild(grip(row, i));
          seatsBox.appendChild(row);
        })(i);
      }
    }
    // Seat marker: the seat number, or the person's avatar with a tag when it's you or someone linked to their own profile
    function seatBadge(v, i, c) {
      var m = whoMark(v);
      if (!m) return el('span', { class: 'avatar', style: { '--c': c }, 'data-who': '', html: String(i + 1) });
      var b = avMarked(v.trim(), c); b.setAttribute('data-who', m + ':' + avKey(v));
      return b;
    }
    var GRIP = '<svg class="ico" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="9" cy="6" r="1.7"/><circle cx="15" cy="6" r="1.7"/><circle cx="9" cy="12" r="1.7"/><circle cx="15" cy="12" r="1.7"/><circle cx="9" cy="18" r="1.7"/><circle cx="15" cy="18" r="1.7"/></svg>';
    function moveSeat(from, to) {
      if (to === from || to < 0 || to >= state.count) return;
      while (names.length < state.count) names.push('');
      var n = names.splice(from, 1)[0]; names.splice(to, 0, n);
      sfx('pop'); haptic('light'); renderSeats();
    }
    function grip(row, i) {
      var g = el('button', { type: 'button', class: 'seat-grip', 'aria-label': 'Move player ' + (i + 1) + ' (drag, or use the arrow keys)', title: 'Drag to reorder', html: GRIP });
      var y0 = 0, rows = null, step = 0, to = i, on = false;
      g.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); var t = i + (e.key === 'ArrowUp' ? -1 : 1); moveSeat(i, t); var again = seatsBox.querySelectorAll('.seat-grip')[t]; if (again) again.focus(); }
      });
      g.addEventListener('pointerdown', function (e) {
        if (e.button > 0) return;
        e.preventDefault(); try { g.setPointerCapture(e.pointerId); } catch (x) {}
        rows = Array.prototype.slice.call(seatsBox.querySelectorAll('.seat'));
        step = rows.length > 1 ? rows[1].getBoundingClientRect().top - rows[0].getBoundingClientRect().top : row.offsetHeight + 10;
        y0 = e.clientY; to = i; on = true; row.classList.add('drag'); haptic('light');
      });
      g.addEventListener('pointermove', function (e) {
        if (!on) return;
        var dy = e.clientY - y0, t = Math.max(0, Math.min(rows.length - 1, i + Math.round(dy / step)));
        row.style.transform = 'translateY(' + dy + 'px)';
        if (t !== to) { to = t; haptic('light'); }
        rows.forEach(function (rw, j) { if (j === i) return; var sh = (j > i && j <= to) ? -step : (j < i && j >= to) ? step : 0; rw.style.transform = sh ? 'translateY(' + sh + 'px)' : ''; });
      });
      function end() {
        if (!on) return; on = false;
        rows.forEach(function (rw) { rw.style.transform = ''; }); row.classList.remove('drag');
        if (to !== i) moveSeat(i, to);
      }
      g.addEventListener('pointerup', end); g.addEventListener('pointercancel', end);
      return g;
    }

    // a short line for the Game defaults list: the mode, the player count and each option shown
    function summary() {
      var bits = [];
      if (o.modes && o.modes.length > 1) { var m = o.modes.filter(function (x) { return x.id === state.mode; })[0]; if (m) bits.push(m.title); }
      if (P) { var r = range(); if (r[1] > r[0]) bits.push(state.count + (state.count === 1 ? ' player' : ' players')); }
      (o.options || []).forEach(function (op) {
        if (op.when && !op.when(state.mode)) return;
        var c = (choicesOf(op) || []).filter(function (x) { return String(x[0]) === String(state.options[op.id]); })[0];
        if (c) bits.push(c[1]);
      });
      return bits.join(' · ');
    }
    function saveSetup() {
      lsSet('gn_setup_' + (game ? game.id : pageKey()), JSON.stringify({ mode: state.mode, count: state.count, options: state.options, names: names.map(function (n) { return isPersonName(n) ? n : ''; }), sum: summary() }));
    }
    if (EDIT_DEFAULTS) {
      var saveBtn = el('button', { type: 'button', class: 'btn btn-primary btn-lg btn-block k-start', text: 'Save defaults', onclick: function () {
        saveSetup(); sfx('good'); haptic('success'); toast('Saved');
        setTimeout(function () { location.href = rootPath() + 'index.html#game-defaults'; }, 450);
      } });
      // some games relabel their start button (e.g. "Play level 1"); here it always says what it does
      if (window.MutationObserver) new MutationObserver(function () { if (saveBtn.textContent !== 'Save defaults') saveBtn.textContent = 'Save defaults'; }).observe(saveBtn, { childList: true, characterData: true, subtree: true });
      wrap.appendChild(saveBtn);
      wrap.appendChild(el('button', { type: 'button', class: 'btn btn-ghost btn-block', text: 'Cancel', onclick: function () { location.href = rootPath() + 'index.html#game-defaults'; } }));
      host.appendChild(wrap);
      renderModes(); renderSeats();
      return { el: wrap, state: state };
    }
    var startBtn = el('button', {
      type: 'button', class: 'btn btn-primary btn-lg btn-block k-start', text: o.start || "Let's play!",
      onclick: function () {
        var cpu = cpuFor(), players = [], picked = [];
        // arcade games: every person playing is someone you can pick (their high scores file under their initials)
        if (P && P.names !== false && game && game.cat === 'arcade') {
          var ins = seatsBox.querySelectorAll('input');
          for (var j = 0; j < state.count; j++) {
            var cj = cpu === 'seats' ? j > 0 : (cpu && j > 0);
            if (cj || isPersonName(ins[j] ? ins[j].value : '')) continue;
            (function (j) {
              pickName(function (n) { names[j] = n; renderSeats(); setTimeout(function () { startBtn.click(); }, 260); },
                { taken: names.slice(0, state.count).filter(function (x, q) { return q !== j; }), title: state.count > 1 && !cpu ? 'Player ' + (j + 1) : 'Who’s playing?' });
            })(j);
            return;
          }
        }
        if (P) {
          var inputs = seatsBox.querySelectorAll('input');
          for (var i = 0; i < state.count; i++) {
            var isCpu = cpu === 'seats' ? i > 0 : (cpu && i > 0);
            var v = inputs[i] ? inputs[i].value.trim() : '';
            players.push({ name: v || (isCpu ? 'Computer' : (i === 0 && cpu ? 'You' : 'Player ' + (i + 1))), cpu: !!isCpu, color: playerColor(i), seat: i });
            if (!isCpu && isPersonName(v)) { picked.push(v); unhide(v); if (!fpRead().some(function (x) { return x.toLowerCase() === v.toLowerCase(); })) fpWrite(fpRead().concat([v])); }
          }
        }
        if (picked.length) countPlays(picked);
        curPlayers = players.filter(function (p) { return !p.cpu; }).map(function (p) { return p.name; });
        saveSetup();
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
    card.appendChild(el('div', { class: 'trophy' + (o.lose ? ' lose' : ''), html: icon(o.icon || (o.lose ? 'meh' : 'trophy')) }));
    card.appendChild(el('h2', { text: o.title || (o.lose ? 'So close!' : 'You win!') }));
    if (o.sub) card.appendChild(el('div', { class: 'sub', text: o.sub }));
    // notes: how it ended (the last moves), so a sudden win makes sense
    if (o.notes && o.notes.length) card.appendChild(el('div', { class: 'k-win-notes' }, [el('b', { text: o.notesTitle || 'How it ended' })].concat(o.notes.map(function (t) { return el('div', { text: t }); }))));
    if (o.rank && o.rank.length) {
      var rk = el('div', { class: 'rank' });
      o.rank.forEach(function (p, i) {
        rk.appendChild(el('div', null, [
          el('span', { class: 'place', text: String(i + 1) }),
          p.cpu ? el('span', { class: 'avatar sm', style: { '--c': p.color || playerColor(i) }, html: icon('bot') }) : avEl(p.name || '?', 'sm', p.color || playerColor(i)),
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
    if (fromDaily()) acts.appendChild(el('button', { type: 'button', class: 'btn btn-soft btn-block', html: icon('calendar') + '<span>Daily puzzles</span>', onclick: function () { close(); toDaily(); } }));
    acts.appendChild(el('button', { type: 'button', class: 'btn btn-ghost btn-block', text: o.closeLabel || 'Back to games', onclick: o.onClose ? function () { close(); o.onClose(); } : goHome }));
    card.appendChild(acts);
    doc.body.appendChild(ov); pinFixed(ov, true);
    requestAnimationFrame(function () { requestAnimationFrame(function () { ov.classList.add('show'); }); });
    if (!(window.TurnNet && TurnNet.on())) resume.clear();   // (an online game ending leaves this device's own saved game in Keep playing)
    if (o.quiet) {}   // shown again (after looking at the board): no fanfare
    else if (o.lose) { sfx('lose'); haptic('error'); }
    else { sfx('win'); haptic('success'); confetti(); }
    return { close: close };
  }


  // ── Game records & history ────────────────────────────────────────────────
  // Kit.record(key, {players:[{name,score,cpu}], winner, lowWins, mode,
  //   rounds:{labels:[..], scores:[[p0,p1..],..]}   points scored each round
  //   highlights:['Cam shot the moon in round 4', ..], meta:{..game extras},
  //   detail:{..} what the history detail view shows (hist-view.js): keep it small, no arrays inside arrays})
  // Saves to gh_<key> through GameHistory (synced). Kit.gameStart() marks the
  // start time so the record knows how long the game took.
  var startedAt = Date.now();
  function gameStart() { startedAt = Date.now(); }
  function record(key, r) {
    r = r || {};
    var players = (r.players || []).map(function (p) { return { name: p.name, score: p.score, cpu: !!p.cpu }; });
    var ranked = players.filter(function (p) { return typeof p.score === 'number'; }).slice()
      .sort(function (a, b) { return r.lowWins ? a.score - b.score : b.score - a.score; });
    var winner = r.winner !== undefined ? r.winner
      : ranked.length > 1 && ranked[0].score !== ranked[1].score ? ranked[0].name : ranked.length === 1 ? ranked[0].name : null;
    var entry = {};
    if (r.meta) for (var k in r.meta) entry[k] = r.meta[k];
    entry.v = 2; entry.game = game ? game.id : pageKey(); entry.mode = r.mode || '';
    entry.players = players; entry.winner = winner; entry.lowWins = !!r.lowWins;
    if (r.rounds && r.rounds.scores && r.rounds.scores.length) entry.rounds = r.rounds;
    entry.highlights = (r.highlights || []).filter(Boolean).slice(0, 12);
    var st = r.started || startedAt;
    entry.started = st; entry.duration = Math.max(0, Math.round((Date.now() - st) / 1000));
    entry._summary = r.summary || (winner ? winner + ' won' : players.length > 1 ? 'Tie game' : 'Finished') +
      (ranked.length > 1 ? ' · ' + ranked.map(function (p) { return p.score; }).join(' – ') : ranked.length === 1 ? ' · ' + ranked[0].score : '');
    entry._badge = r.badge || '';
    if (r.detail) {
      // it syncs: a detail that got too big is left out rather than crowding everyone's history
      try { var dj = JSON.stringify(r.detail); if (dj.length <= 6000) entry.dt = JSON.parse(dj); else console.warn('[record] detail too big, skipped', key, dj.length); } catch (e) {}
    }
    try { GameHistory.save(key, entry); } catch (e) {}
    return entry;
  }

  function fmtDate(ts) {
    var d = new Date(ts);
    return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) + ' · ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  }
  function fmtDur(sec) {
    if (!sec) return ''; var m = Math.round(sec / 60);
    return m < 1 ? 'under a minute' : m < 60 ? m + ' min' : Math.floor(m / 60) + ' h ' + (m % 60) + ' min';
  }
  // Older records used different field names; map what we can.
  function normalize(e) {
    e = e || {};
    if (window.HistView) e = HistView.unpack(e);
    else if (e.rounds && e.rounds.scores) e = Object.assign({}, e, { rounds: Object.assign({}, e.rounds, { scores: e.rounds.scores.map(function (row) { return Array.isArray(row) ? row : row && typeof row === 'object' ? Object.keys(row).sort(function (a, b) { return a.slice(1) - b.slice(1); }).map(function (k) { return row[k]; }) : []; }) }) });
    var players = e.players;
    if (!players && Array.isArray(e.names)) players = e.names.map(function (n, i) { return { name: n, score: e.totals ? e.totals[i] : undefined }; });
    return { players: Array.isArray(players) ? players.map(function (p) { return typeof p === 'string' ? { name: p } : p; }) : [],
      winner: typeof e.winner === 'number' && Array.isArray(players) && players[e.winner] ? (players[e.winner].name || players[e.winner]) : e.winner, rounds: e.rounds && e.rounds.scores ? e.rounds : null, highlights: e.highlights || [], mode: e.mode || '',
      duration: e.duration, date: e._date, summary: e._summary || '', lowWins: !!e.lowWins };
  }
  function raceChart(n, names) {
    var sc = n.rounds.scores, P = n.players.length; if (sc.length < 2 || !P) return null;
    var cum = [], tot = []; for (var i = 0; i < P; i++) tot.push(0);
    cum.push(tot.slice());
    sc.forEach(function (row) { for (var i = 0; i < P; i++) tot[i] += Number(row[i]) || 0; cum.push(tot.slice()); });
    var all = [].concat.apply([], cum), mn = Math.min.apply(null, all.concat([0])), mx = Math.max.apply(null, all.concat([1]));
    var W = 300, H = 120, pad = 8;
    function x(i) { return pad + i * (W - 2 * pad) / (cum.length - 1); }
    function y(v) { return H - pad - (v - mn) * (H - 2 * pad) / ((mx - mn) || 1); }
    var svg = '<svg class="k-race" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Score race">';
    if (mn < 0) svg += '<line x1="0" x2="' + W + '" y1="' + y(0) + '" y2="' + y(0) + '" stroke="rgba(255,255,255,.15)" stroke-dasharray="3 4"/>';
    for (var p = 0; p < P; p++) {
      var pts = cum.map(function (c, i) { return x(i).toFixed(1) + ',' + y(c[p]).toFixed(1); }).join(' ');
      var col = playerColor(p);
      svg += '<polyline points="' + pts + '" fill="none" stroke="' + col + '" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>';
      svg += '<circle cx="' + x(cum.length - 1) + '" cy="' + y(cum[cum.length - 1][p]) + '" r="4" fill="' + col + '"/>';
    }
    return el('div', { class: 'k-race-wrap', html: svg + '</svg>' });
  }
  function historyDetail(e, o) {
    o = o || {};
    var n = normalize(e), box = el('div', { class: 'k-hd' });
    var meta = o.inList ? [] : [fmtDate(n.date)]; if (n.duration && !o.inList) meta.push(fmtDur(n.duration)); if (n.mode && !o.inList) meta.push(n.mode);
    if (meta.length) box.appendChild(el('div', { class: 'k-hd-meta', text: meta.join(' · ') }));
    if (n.players.length) {
      var ps = n.players.map(function (p, i) { return { p: p, i: i }; });
      if (ps.some(function (x) { return typeof x.p.score === 'number'; })) ps.sort(function (a, b) { return n.lowWins ? a.p.score - b.p.score : b.p.score - a.p.score; });
      var st = el('div', { class: 'k-hd-players' });
      ps.forEach(function (x, rank) {
        var won = n.winner && x.p.name === n.winner;
        st.appendChild(el('div', { class: 'k-hd-p' + (won ? ' won' : '') }, [
          el('span', { class: 'place', text: String(rank + 1) }),
          x.p.cpu ? el('span', { class: 'avatar sm', style: { '--c': playerColor(x.i) }, html: icon('bot') }) : avEl(x.p.name || '?', 'sm', playerColor(x.i)),
          el('span', { class: 'grow', text: x.p.name || 'Player' }),
          won ? el('span', { class: 'crown', html: icon('trophy') }) : null,
          el('span', { class: 'sc', text: x.p.score == null ? '' : String(x.p.score) })
        ]));
      });
      box.appendChild(st);
    } else if (n.summary) box.appendChild(el('div', { class: 'k-hd-sum', text: n.summary }));
    // the game's own view: final board, cards, scorecard... (hist/*.js)
    if (window.HistView) { var gv = HistView.render(e, o.game || e.game); if (gv) box.appendChild(gv); }
    if (n.highlights.length) {
      var hl = el('ul', { class: 'k-hd-hl' });
      n.highlights.forEach(function (h) { hl.appendChild(el('li', { html: icon('sparkle') + '<span>' + esc(h) + '</span>' })); });
      box.appendChild(hl);
    }
    if (n.rounds && n.players.length) {
      var chart = raceChart(n); if (chart) box.appendChild(chart);
      var t = el('table', { class: 'k-hd-rounds' }), hr = el('tr', null, [el('th', { text: '' })]);
      n.players.forEach(function (p, i) { hr.appendChild(el('th', { text: p.name, style: { color: playerColor(i) } })); });
      t.appendChild(hr);
      var run = n.players.map(function () { return 0; });
      n.rounds.scores.forEach(function (row, ri) {
        var tr = el('tr', null, [el('th', { text: (n.rounds.labels && n.rounds.labels[ri]) || String(ri + 1) })]);
        row.forEach(function (v, pi) { run[pi] += Number(v) || 0; tr.appendChild(el('td', { text: v == null ? '–' : String(v) })); });
        t.appendChild(tr);
      });
      var ft = el('tr', { class: 'tot' }, [el('th', { text: 'Total' })]);
      n.players.forEach(function (p, i) { ft.appendChild(el('td', { text: String(p.score != null ? p.score : run[i]) })); });
      t.appendChild(ft);
      box.appendChild(el('div', { class: 'k-hd-scroll' }, [t]));
    }
    if (o.extra) { try { var x = o.extra(e); if (x) box.appendChild(x); } catch (err) {} }
    return box;
  }
  // Kit.history(key, {title, extra(entry) -> Node}) opens the past-games sheet.
  // The detail views (hist-view.js + hist/*.js), loaded the first time a history is opened
  var hvLoading = null;
  function loadHistView() {
    if (hvLoading) return hvLoading;
    var base = (function () { try { return new URL('.', (doc.querySelector('script[src*="kit.js"]') || {}).src || location.href).href; } catch (e) { return ''; } })();
    function add(src) { return new Promise(function (res) { var sc = doc.createElement('script'); sc.src = base + src; sc.onload = sc.onerror = function () { res(); }; doc.head.appendChild(sc); }); }
    hvLoading = (window.HistView ? Promise.resolve() : add('hist-view.js')).then(function () {
      return Promise.all(((window.HistView && HistView.files) || []).map(add));
    });
    return hvLoading;
  }
  function history(key, o) {
    if (!window.HistView || !HistView.ready) { var a = arguments; return loadHistView().then(function () { if (window.HistView) HistView.ready = true; history.apply(null, a); }); }
    o = o || {};
    var list = []; try { list = GameHistory.load(key); } catch (e) {}
    if (o.keys) o.keys.forEach(function (k) { try { list = list.concat(GameHistory.load(k)); } catch (e) {} });
    list.sort(function (a, b) { return (b._date || 0) - (a._date || 0); });
    var box = el('div', { class: 'k-hist' }), inList = { inList: true, extra: o.extra, game: histGameId(key) };
    if (!list.length) box.appendChild(el('p', { class: 'muted', text: 'No finished games yet. Each game you finish is saved here.' }));
    list.forEach(function (e, i) {
      var n = normalize(e);
      var head = el('button', { type: 'button', class: 'k-hist-h' }, [
        el('span', { class: 'grow' }, [el('b', { text: n.winner ? n.winner + ' won' : n.summary.split(' · ')[0] || 'Finished' }), el('small', { text: fmtDate(n.date) + (n.duration ? ' · ' + fmtDur(n.duration) : '') + (n.mode ? ' · ' + n.mode : '') })]),
        el('span', { class: 'k-hist-s', text: n.players.length > 1 && n.players.every(function (p) { return p.score != null; }) ? n.players.map(function (p) { return p.score; }).join(' – ') : '' }),
        el('span', { class: 'chev', html: icon('down') })
      ]);
      var item = el('div', { class: 'k-hist-i' + (i === 0 ? ' open' : '') }, [head]);
      var body = null;
      function toggle() {
        var open = item.classList.toggle('open');
        if (open && !body) { body = historyDetail(e, inList); item.appendChild(body); }
      }
      head.addEventListener('click', function () { sfx('tap'); toggle(); });
      if (i === 0) { body = historyDetail(e, inList); item.appendChild(body); }
      box.appendChild(item);
    });
    sheet({ title: o.title || ((game ? game.name : '') + ': past games'), node: box, actions: [{ label: 'Close', cls: 'btn-soft' }] });
  }

  // ── Cards & dice ──────────────────────────────────────────────────────────
  var SUIT = { s: '♠', h: '♥', d: '♦', c: '♣', '♠': '♠', '♥': '♥', '♦': '♦', '♣': '♣' };
  function card(rank, suit, o) {
    o = o || {};
    var st = SUIT[suit] || suit || '', red = st === '♥' || st === '♦';
    var r = rank === 'T' || rank === 10 ? '10' : String(rank);
    var c = el('div', { class: 'pcard' + (red ? ' red' : '') + (o.back ? ' back' : '') + (o.cls ? ' ' + o.cls : ''), 'data-r': r, 'data-s': st });
    var corner = '<span class="ix">' + esc(r) + '<b>' + st + '</b></span><span class="ix bot">' + esc(r) + '<b>' + st + '</b></span>';
    var center = /^[JQK]$/.test(r) ? '<span class="face"><span>' + r + '</span><i>' + st + '</i></span>' : '<span class="pip">' + st + '</span>';
    c.innerHTML = corner + center;
    c.setAttribute('aria-label', o.back ? 'Face-down card' : ({ A: 'Ace', J: 'Jack', Q: 'Queen', K: 'King' }[r] || r) + ' of ' + ({ '♠': 'spades', '♥': 'hearts', '♦': 'diamonds', '♣': 'clubs' }[st] || st));
    return c;
  }
  // Non-standard decks: Kit.cardFace({rank:'7', label:'Freeze', color:'#e5263f', solid:false, corner:true})
  function cardFace(o) {
    o = o || {};
    var c = el('div', { class: 'pcard custom' + (o.solid ? ' solid' : '') + (o.cls ? ' ' + o.cls : '') });
    if (o.color) c.style.setProperty('--ink', o.color);
    var r = o.rank == null ? '' : String(o.rank);
    c.innerHTML = (o.corner !== false && r ? '<span class="ix">' + esc(r) + '</span><span class="ix bot">' + esc(r) + '</span>' : '') +
      '<span class="big">' + (o.html || esc(o.center != null ? o.center : r)) + '</span>' + (o.label ? '<span class="lbl">' + esc(o.label) + '</span>' : '');
    c.setAttribute('aria-label', o.aria || ((o.label ? o.label + ' ' : '') + r));
    return c;
  }
  function die(v) {
    var d = el('button', { type: 'button', class: 'die', 'data-v': v || 1, 'aria-label': 'Die showing ' + (v || 1) });
    for (var i = 0; i < 9; i++) d.appendChild(doc.createElement('i'));
    return d;
  }


  // ── Pass-and-play hand-off ────────────────────────────────────────────────
  // Kit.handoff({name, color, what, msg, hold}) -> Promise
  // Covers the screen with "Pass to <name>". The player must press and HOLD
  // the button for 3 seconds (hold: ms) before the cover lifts and their
  // hidden cards/tiles show for their turn. Letting go early resets it.
  // Call it again before the next player's turn. The cover sits under the game
  // bar so the menu (Undo, New game) still works; opts.hint replaces the hint
  // text; Kit.handoff.close() removes an open cover without revealing.
  function handoff(o) {
    o = o || {};
    var HOLD = o.hold || 3000;
    return new Promise(function (resolve) {
      var c = o.color || 'var(--accent)';
      var R = 46, CIRC = 2 * Math.PI * R;
      var ring = '<svg viewBox="0 0 108 108" aria-hidden="true"><circle cx="54" cy="54" r="' + R + '" class="tr"/><circle cx="54" cy="54" r="' + R + '" class="pg" style="stroke-dasharray:' + CIRC + ';stroke-dashoffset:' + CIRC + '"/></svg>';
      var btn = el('button', { type: 'button', class: 'k-ho-btn', 'aria-label': 'Hold for 3 seconds to show your ' + (o.what || 'cards') }, [
        el('span', { class: 'k-ho-ring', html: ring }), el('span', { class: 'k-ho-ic', html: icon('eye') })
      ]);
      var HINT = o.hint || ('Hold for 3 seconds to see your ' + (o.what || 'cards'));
      var hint = el('div', { class: 'k-ho-hint', text: HINT });
      var cover = el('div', { class: 'k-ho', role: 'dialog', 'aria-modal': 'true', style: { '--ho': c } }, [
        el('div', { class: 'k-ho-in' }, [
          el('div', { class: 'k-ho-av', style: { '--c': c }, text: String(o.name || '?').charAt(0).toUpperCase() }),
          el('div', { class: 'k-ho-k', text: 'Pass to' }),
          el('h2', { text: o.name || 'the next player' }),
          o.msg ? el('p', { class: 'k-ho-msg', text: o.msg }) : null,
          btn, hint
        ])
      ]);
      var old = doc.querySelector('.k-ho'); if (old) old.remove();
      doc.body.appendChild(cover);
      cover.classList.add('show');
      var pg = cover.querySelector('.pg'), t0 = 0, raf = 0, done = false, lastTick = 0;
      function frame(t) {
        if (!t0) t0 = t;
        var p = Math.min(1, (t - t0) / HOLD);
        pg.style.strokeDashoffset = String(CIRC * (1 - p));
        var sec = Math.floor((t - t0) / 1000);
        if (sec > lastTick && p < 1) { lastTick = sec; haptic('tick'); sfx('tick'); }
        if (p >= 1) return finish();
        raf = requestAnimationFrame(frame);
      }
      function start(e) {
        if (done) return; e.preventDefault();
        try { btn.setPointerCapture(e.pointerId); } catch (er) {}
        btn.classList.add('holding'); hint.textContent = 'Keep holding…';
        t0 = 0; lastTick = 0; cancelAnimationFrame(raf); raf = requestAnimationFrame(frame);
      }
      function stop() {
        if (done) return;
        cancelAnimationFrame(raf); btn.classList.remove('holding');
        pg.style.transition = 'stroke-dashoffset .25s'; pg.style.strokeDashoffset = String(CIRC);
        setTimeout(function () { pg.style.transition = ''; }, 260);
        hint.textContent = HINT;
      }
      function finish() {
        done = true; haptic('success'); sfx('pop');
        cover.classList.remove('show'); cover.classList.add('lift');
        setTimeout(function () { cover.remove(); resolve(); }, 320);
      }
      btn.addEventListener('pointerdown', start);
      btn.addEventListener('pointerup', stop);
      btn.addEventListener('pointercancel', stop);
      btn.addEventListener('lostpointercapture', function () { if (!done) stop(); });
      btn.addEventListener('contextmenu', function (e) { e.preventDefault(); });
      // Keyboard: hold Space or Enter
      btn.addEventListener('keydown', function (e) { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) start(e); });
      btn.addEventListener('keyup', function (e) { if (e.key === ' ' || e.key === 'Enter') stop(); });
    });
  }

  // ── Avatars ───────────────────────────────────────────────────────────────
  // Each person (by name, so "Tim" is the same Tim in every game) can have an avatar: their initial or a mark on a
  // colour, or a photo. Photos they've uploaded stay in their gallery to swap back to. Stored in fgh_avatars and
  // synced through the PIN (sync.js). Shown by Kit.avatar.el / .html wherever a player's avatar appears.
  var AV_KEY = 'fgh_avatars', AV_MAX = 8, AV_PX = 192;
  var AV_ICONS = ['star', 'heart', 'crown', 'sparkle', 'flame', 'moon', 'sun', 'paw', 'rocket', 'music', 'leaf', 'trophy', 'dice', 'cards', 'book', 'lightbulb',
    'bolt', 'cloud', 'coffee', 'compass', 'gem', 'feather', 'flag', 'flower', 'gamepad', 'ghost', 'globe', 'key', 'mountain', 'snowflake', 'smile', 'target', 'anchor',
    'umbrella', 'tree', 'fish', 'bird', 'bike', 'car', 'plane', 'pizza', 'cake', 'headphones', 'wand', 'palette', 'glasses', 'bug'];
  var AV_COLORS = ['#ffc83d', '#ff7a59', '#ff5d8f', '#b583ff', '#5b8cff', '#3cc8e8', '#3ddc97', '#9ad94a', '#f2f4f8', '#2a2440'];
  function avKey(n) { return String(n || '').trim().toLowerCase(); }
  // ── Arcade initials, per player ──
  // Yours live with your PIN (FGHSync); everyone else's in gn_ini {name: 'ABC'} (a synced setting); a linked
  // person's come from their own profile. A high score files under them without asking.
  function iniMap() { try { return JSON.parse(lsGet('gn_ini', '{}')) || {}; } catch (e) { return {}; } }
  function iniClean(v) { return String(v || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3); }
  function isMe(n) { var me = avKey(lsGet('my_name', '')); return !!me && avKey(n) === me; }
  function iniOf(n) {
    n = String(n || '').trim(); if (!isPersonName(n)) return '';
    var k = avKey(n), v = '';
    if (isMe(n)) { try { v = window.FGHSync && FGHSync.isPin && FGHSync.isPin() && FGHSync.initials ? FGHSync.initials() : ''; } catch (e) {} }
    // someone linked: the initials on their own profile win
    if (!v) { try { var lh = JSON.parse(lsGet('fgh_link_hi', '{}')) || {}, lr = window.FGHSync && FGHSync.linkOf && FGHSync.linkOf(n); if (lr && lr.hs && lh[k] && iniClean(lh[k].ini).length >= 2) v = lh[k].ini; } catch (e) {} }
    if (!v) v = iniMap()[k] || '';
    v = iniClean(v); return v.length >= 2 ? v : '';
  }
  function iniSet(n, v) {
    n = String(n || '').trim(); v = iniClean(v); if (!isPersonName(n)) return '';
    var was = iniOf(n), m = iniMap(), k = avKey(n), viaPin = false;
    if (v) m[k] = v; else delete m[k];
    lsSet('gn_ini', JSON.stringify(m));
    if (isMe(n)) { try { if (window.FGHSync && FGHSync.isPin && FGHSync.isPin() && FGHSync.setInitials) { FGHSync.setInitials(v); viaPin = true; } } catch (e) {} }
    // their scores already on the boards move to the new initials (setInitials does that for yours)
    if (!viaPin && was && v && was !== v) { try { if (window.FGHSync && FGHSync.renameIni) FGHSync.renameIni(was, v, k); } catch (e) {} }
    try { if (window.FGHSync && FGHSync.tagOldScores) FGHSync.tagOldScores(); } catch (e) {}   // old scores under these initials may now be theirs
    return v;
  }
  // who's playing (the people seated at the last Kit.setup start, computer seats left out)
  var curPlayers = [];
  function avAll() { try { var v = JSON.parse(lsGet(AV_KEY, '{}')); return v && typeof v === 'object' ? v : {}; } catch (e) { return {}; } }
  function avRec(name) { var r = avAll()[avKey(name)]; return r && r.cur ? r : null; }
  function avPut(name, rec) {
    var all = avAll(); rec.name = String(name).trim(); rec.at = Date.now(); all[avKey(name)] = rec;
    lsSet(AV_KEY, JSON.stringify(all));
    try { if (window.FGHSync && FGHSync.noteWrite) FGHSync.noteWrite(AV_KEY); } catch (e) {}
    try { if (window.FGHSync && FGHSync.linkPublish && avKey(lsGet('my_name', '')) === avKey(name)) FGHSync.linkPublish(); } catch (e) {}
    avRefresh();
  }
  // inner HTML of an avatar circle for this person, or null when they haven't set one
  function avHTML(name) {
    var r = avRec(name); if (!r) return null;
    var c = r.cur;
    if (c.k === 'photo') { var ph = (r.photos || []).filter(function (x) { return x.id === c.id; })[0]; return ph ? '<img class="av-img" src="' + ph.d + '" alt="">' : null; }
    if (c.k === 'icon') return icon(c.i);
    return esc(String(r.name || name).charAt(0).toUpperCase());
  }
  function avColor(name) { var r = avRec(name); return r && r.cur.k !== 'photo' ? r.cur.c || null : null; }
  // fill an avatar element for a person (keeps the fallback when they have none); it updates when they change it
  function avFill(node, name, fallback, color) {
    var h = avHTML(name), c = avColor(name);
    node.setAttribute('data-av', name || '');
    node._avFb = node._avFb || { html: fallback != null ? fallback : node.innerHTML, c: color || node.style.getPropertyValue('--c') };
    node.innerHTML = h || node._avFb.html;
    node.classList.toggle('av-photo', !!(h && h.indexOf('<img') === 0));
    var cc = c || node._avFb.c; if (cc) node.style.setProperty('--c', cc); if (c) node.style.color = inkFor(c); else node.style.color = '';
    return node;
  }
  function avEl(name, cls, color, fallback) {
    return avFill(el('span', { class: 'avatar' + (cls ? ' ' + cls : ''), style: color ? { '--c': color } : null }), name, fallback != null ? fallback : esc(String(name || '?').charAt(0).toUpperCase()), color);
  }
  // 'me' for the signed-in person, 'link' for someone linked to their own profile, else null
  function whoMark(n) {
    var k = avKey(n); if (!k) return null;
    var me = avKey(lsGet('my_name', '')) || (window.FGHSync && FGHSync.label ? avKey(FGHSync.label()) : '');
    if (me && k === me) return 'me';
    try { var r = window.FGHSync && FGHSync.linkOf && FGHSync.linkOf(k); if (r) return r.hs ? 'link' : 'wait'; } catch (e) {}
    return null;
  }
  // their avatar with a small tag for you / linked (plain avatar otherwise)
  function avMarked(n, color) {
    var m = whoMark(n), a = avEl(n, null, color);
    if (!m || m === 'wait') return a;
    return el('span', { class: 'seat-av', title: m === 'me' ? 'You' : 'Linked to ' + poss(n) + ' profile' }, [a, el('span', { class: 'seat-tag ' + m, html: icon(m === 'me' ? 'user' : 'link') })]);
  }
  function avRefresh() { Array.prototype.forEach.call(doc.querySelectorAll('[data-av]'), function (n) { if (n._avFb) avFill(n, n.getAttribute('data-av')); }); try { window.dispatchEvent(new CustomEvent('kit-avatar')); } catch (e) {} }
  window.addEventListener('storage', function (e) { if (e.key === AV_KEY) avRefresh(); });

  // Colour wheel: drag around the wheel for the colour (centre is pale, edge is full), the slider for how dark
  function hexOf(r, g, b) { return '#' + [r, g, b].map(function (v) { v = Math.max(0, Math.min(255, Math.round(v))); return (v < 16 ? '0' : '') + v.toString(16); }).join(''); }
  function hsvHex(h, s, v) { var f = function (n) { var k = (n + h / 60) % 6; return v - v * s * Math.max(0, Math.min(k, 4 - k, 1)); }; return hexOf(f(5) * 255, f(3) * 255, f(1) * 255); }
  function hexHsv(hex) {
    var m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '')); if (!m) return { h: 0, s: 0.8, v: 1 };
    var n = parseInt(m[1], 16), r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, h = 0;
    if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return { h: (h * 60 + 360) % 360, s: mx ? d / mx : 0, v: mx };
  }
  function colorWheel(start, done) {
    var hsv = hexHsv(start), S = 240, R = S / 2, s;
    var cv = el('canvas', { width: S * 2, height: S * 2, class: 'cw-wheel', 'aria-label': 'Colour wheel' });
    var knob = el('span', { class: 'cw-knob' }), dark = el('input', { type: 'range', min: '15', max: '100', class: 'cw-dark', 'aria-label': 'Brightness' });
    var prev = el('span', { class: 'avatar xl cw-prev' }), hexT = el('b', { class: 'cw-hex' });
    function drawWheel() {
      var g = cv.getContext('2d'), c = S, img = g.createImageData(S * 2, S * 2), d = img.data;
      for (var y = 0; y < S * 2; y++) for (var x = 0; x < S * 2; x++) {
        var dx = x - c, dy = y - c, r = Math.sqrt(dx * dx + dy * dy) / c, i = (y * S * 2 + x) * 4;
        if (r > 1) { d[i + 3] = 0; continue; }
        var h = (Math.atan2(dy, dx) * 180 / Math.PI + 450) % 360, hx = hsvHex(h, r, hsv.v), n = parseInt(hx.slice(1), 16);
        d[i] = n >> 16; d[i + 1] = (n >> 8) & 255; d[i + 2] = n & 255; d[i + 3] = r > 0.985 ? Math.round((1 - r) / 0.015 * 255) : 255;
      }
      g.putImageData(img, 0, 0);
    }
    function paintCw() {
      var hx = hsvHex(hsv.h, hsv.s, hsv.v), a = (hsv.h - 90) * Math.PI / 180;
      knob.style.left = (R + Math.cos(a) * hsv.s * R) + 'px'; knob.style.top = (R + Math.sin(a) * hsv.s * R) + 'px'; knob.style.background = hx;
      prev.style.setProperty('--c', hx); prev.style.color = inkFor(hx); prev.textContent = '';
      hexT.textContent = hx.toUpperCase();
      dark.style.setProperty('--hue', hsvHex(hsv.h, hsv.s, 1));
    }
    var wrap = el('div', { class: 'cw-box', style: { width: S + 'px', height: S + 'px' } }, [cv, knob]);
    function pick(e) {
      var b = wrap.getBoundingClientRect(), dx = e.clientX - b.left - R, dy = e.clientY - b.top - R;
      hsv.h = (Math.atan2(dy, dx) * 180 / Math.PI + 450) % 360; hsv.s = Math.min(1, Math.sqrt(dx * dx + dy * dy) / R); paintCw();
    }
    var down = false;
    wrap.addEventListener('pointerdown', function (e) { down = true; try { wrap.setPointerCapture(e.pointerId); } catch (x) {} pick(e); e.preventDefault(); });
    wrap.addEventListener('pointermove', function (e) { if (down) pick(e); });
    wrap.addEventListener('pointerup', function () { down = false; haptic('light'); });
    wrap.addEventListener('pointercancel', function () { down = false; });
    dark.value = String(Math.round(Math.max(0.15, hsv.v) * 100));
    dark.addEventListener('input', function () { hsv.v = dark.value / 100; drawWheel(); paintCw(); });
    var node = el('div', { class: 'cw' }, [el('div', { class: 'cw-top' }, [prev, hexT]), wrap, dark]);
    drawWheel(); paintCw();
    s = sheet({ title: 'Any colour', node: node, actions: [{ label: 'Use this colour', primary: true, onClick: function () { done(hsvHex(hsv.h, hsv.s, hsv.v)); } }, { label: 'Cancel', cls: 'btn-ghost' }] });
  }

  // The avatar editor: a big preview, the marks and colours, and your photos (upload, or tap an old one)
  function avatarEdit(name, onDone) {
    name = String(name || '').trim(); if (!name) return;
    var lnk = window.FGHSync && FGHSync.linkOf ? FGHSync.linkOf(name) : null;
    if (lnk) return linkSheet(name, onDone);   // their avatar comes from their own profile
    var r0 = avRec(name), photos = (r0 && r0.photos || []).slice();
    var cur = r0 ? JSON.parse(JSON.stringify(r0.cur)) : { k: 'letter', c: AV_COLORS[0] };
    if (!cur.c) cur.c = AV_COLORS[0];
    var prev = el('span', { class: 'avatar xl' }), body = el('div', { class: 'av-ed' }), s;
    var file = el('input', { type: 'file', accept: 'image/*', style: { display: 'none' } });
    // crop a photo again: from its original when this device has it, otherwise from the saved circle (zoom in only)
    function recrop(p) {
      avOrig(p.id).then(function (b) {
        avCrop(b || p.d, function (d, at) {
          photos = photos.map(function (x) { return x.id === p.id ? Object.assign({}, x, { d: d, at: Date.now(), crop: b ? at : x.crop }) : x; });
          sfx('good'); paint();
        }, { again: true, init: b ? p.crop : null });
      });
    }
    prev.addEventListener('click', function () { var ph = cur.k === 'photo' && photos.filter(function (x) { return x.id === cur.id; })[0]; if (ph) recrop(ph); });
    function paint() {
      var ph = cur.k === 'photo' && photos.filter(function (x) { return x.id === cur.id; })[0];
      prev.innerHTML = ph ? '<img class="av-img" src="' + ph.d + '" alt="">' : cur.k === 'icon' ? icon(cur.i) : esc(name.charAt(0).toUpperCase());
      prev.classList.toggle('av-photo', !!ph); prev.style.setProperty('--c', cur.c); prev.style.color = ph ? '' : inkFor(cur.c);
      body.innerHTML = '';
      prev.classList.toggle('av-adj', !!ph); prev.setAttribute('role', ph ? 'button' : 'img'); prev.setAttribute('aria-label', ph ? 'Adjust this photo' : name);
      body.appendChild(el('div', { class: 'av-top' }, [prev, el('div', { class: 'av-who' }, [el('b', { text: name }), el('small', { text: ph ? 'Tap the picture to move or zoom it' : 'Shows wherever ' + name + ' plays' })])]));
      // photos
      body.appendChild(el('div', { class: 'label', text: 'Photos' }));
      var pr = el('div', { class: 'av-grid' });
      pr.appendChild(el('button', { type: 'button', class: 'av-tile av-up', 'aria-label': 'Upload a photo', html: icon('camera') + '<small>Upload</small>', onclick: function () { file.click(); } }));
      photos.forEach(function (p) {
        var on = cur.k === 'photo' && cur.id === p.id;
        var t = el('button', { type: 'button', class: 'av-tile' + (on ? ' on' : ''), 'aria-pressed': String(on), 'aria-label': 'Use this photo', html: '<img src="' + p.d + '" alt="">', onclick: function () { if (on) return recrop(p); cur = { k: 'photo', id: p.id, c: cur.c }; sfx('tap'); paint(); } });
        t.appendChild(el('span', { class: 'av-del', role: 'button', 'aria-label': 'Remove this photo', html: icon('close'), onclick: function (e) {
          e.stopPropagation();
          confirmSheet('Remove this photo from ' + poss(name) + ' photos?', { ok: 'Remove', danger: true }).then(function (ok) {
            if (!ok) return; photos = photos.filter(function (x) { return x.id !== p.id; }); avOrig(p.id, null); if (cur.k === 'photo' && cur.id === p.id) cur = { k: 'letter', c: cur.c }; paint();
          });
        } }));
        pr.appendChild(t);
      });
      body.appendChild(pr);
      // a mark: pick its colour first, then the mark
      body.appendChild(el('div', { class: 'label', text: 'Or a mark' }));
      var cr = el('div', { class: 'av-cols' });
      AV_COLORS.forEach(function (c) {
        cr.appendChild(el('button', { type: 'button', class: 'av-col' + (cur.c === c ? ' on' : ''), 'aria-label': 'Colour', style: { background: c }, onclick: function () { cur.c = c; if (cur.k === 'photo') cur = { k: 'letter', c: c }; sfx('tap'); paint(); } }));
      });
      // any colour: the rainbow dot opens a colour wheel
      var custom = AV_COLORS.indexOf(cur.c) < 0;
      cr.appendChild(el('button', { type: 'button', class: 'av-col av-rb' + (custom ? ' on' : ''), 'aria-label': 'Any colour', style: custom ? { '--cc': cur.c } : null, onclick: function () {
        colorWheel(cur.c, function (c) { cur.c = c; if (cur.k === 'photo') cur = { k: 'letter', c: c }; sfx('tap'); paint(); });
      } }));
      body.appendChild(cr);
      var mr = el('div', { class: 'av-grid marks' });
      [{ k: 'letter' }].concat(AV_ICONS.map(function (i) { return { k: 'icon', i: i }; })).forEach(function (m) {
        var on = cur.k === m.k && (m.k === 'letter' || cur.i === m.i);
        mr.appendChild(el('button', { type: 'button', class: 'av-tile mk' + (on ? ' on' : ''), 'aria-pressed': String(on), 'aria-label': m.k === 'letter' ? 'Initial' : m.i,
          style: { '--c': cur.c, color: inkFor(cur.c) }, html: m.k === 'letter' ? '<b>' + esc(name.charAt(0).toUpperCase()) + '</b>' : icon(m.i),
          onclick: function () { cur = { k: m.k, i: m.i, c: cur.c }; sfx('tap'); paint(); } }));
      });
      body.appendChild(mr);
    }
    file.addEventListener('change', function () {
      var f = file.files && file.files[0]; file.value = ''; if (!f) return;
      avCrop(f, function (d, at, keep) {
        var p = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), d: d, at: Date.now(), crop: at };
        if (keep) keep.then(function (b) { if (b) avOrig(p.id, b); });
        var gone = photos.slice(AV_MAX - 1); gone.forEach(function (x) { avOrig(x.id, null); });
        photos = [p].concat(photos).slice(0, AV_MAX); cur = { k: 'photo', id: p.id, c: cur.c }; sfx('good'); paint();
      }, { keep: true });
    });
    paint();
    s = sheet({ title: 'Avatar', node: el('div', null, [body, file]), actions: [
      { label: 'Save', primary: true, onClick: function () { avPut(name, { cur: cur, photos: photos }); toast('Avatar saved'); if (onDone) onDone(); } },
      { label: 'Cancel', cls: 'btn-ghost' }] });
  }

  // ── Player links (the engine is in sync.js) ──
  // Plain words for what went wrong talking to the cloud
  function linkErr(e) {
    var c = e && (e.code || ''), m = (e && e.message) || '';
    if (c === 'permission-denied' || /insufficient permissions/i.test(m)) return 'Profile sharing isn’t switched on yet. It starts working once this update is live.';
    if (c === 'unavailable' || /offline|network/i.test(m)) return 'Couldn’t reach the cloud. Try again when you’re online.';
    return m || 'Something went wrong. Try again.';
  }
  function linksOn() { return !!(window.FGHSync && FGHSync.isPin && FGHSync.isPin() && FGHSync.linkAdd); }
  // Link a frequent player to their own profile (their share code), or see / undo the link
  function linkSheet(name, onDone, scanned) {
    var node = el('div', { class: 'lk' }), s;
    if (!linksOn()) {
      node.appendChild(el('p', { class: 'muted', text: 'Sign in with a PIN to link players. Linking lets ' + name + '’s avatar come from their own phone, and saves the games you play together to their history too.' }));
      s = sheet({ title: 'Link ' + name, node: node, actions: [{ label: 'OK', cls: 'btn-soft' }] }); return;
    }
    var r = FGHSync.linkOf(name);
    node.appendChild(el('div', { class: 'lk-top' }, [avEl(name, 'lg', 'var(--surface-3)'), el('div', null, [el('b', { text: name }),
      el('small', { class: r && !r.hs ? 'k-wait' : '', text: r ? (r.hs ? 'Linked to ' + (r.them || name) + '’s profile · ' + r.code : 'Waiting to accept') : 'Not linked yet' })])]));
    if (r && r.gone) {
      node.appendChild(el('p', { class: 'muted', text: 'That code doesn’t work anymore (' + name + ' made a new one). Unlink, then link again with their new code.' }));
      s = sheet({ title: name, node: node, actions: [{ label: 'Unlink ' + name, primary: true, onClick: function () { FGHSync.linkRemove(name); avRefresh(); if (onDone) onDone(); linkSheet(name, onDone); } }, { label: 'Close', cls: 'btn-ghost' }] });
      return;
    }
    if (r && !r.hs) {
      // still waiting: the request can be taken back
      s = sheet({ title: name, node: node, actions: [
        { label: 'Done', primary: true },
        { label: 'Cancel request', cls: 'btn-ghost', onClick: function () { FGHSync.linkCancel(name); sfx('tap'); toast('Request to ' + name + ' cancelled'); avRefresh(); if (onDone) onDone(); } }] });
      return;
    }
    if (r) {
      node.appendChild(el('p', { class: 'muted', text: 'Their avatar comes from their own phone, and games you play with ' + name + ' are saved to their history too. They can remove any game that wasn’t them.' }));
      s = sheet({ title: name, node: node, actions: [
        { label: 'Done', primary: true },
        { label: 'Unlink ' + name, cls: 'btn-ghost', onClick: function () { setTimeout(function () { unlinkAsk(name, onDone); }, 320); } }] });
      return;
    }
    node.appendChild(el('p', { class: 'muted', text: 'Ask ' + name + ' for their profile code. On their phone: tap their avatar at the top of the home screen, then Share my profile. The games you’ve already played with ' + name + ' go to their history too, once they accept on their phone.' }));
    var inp = el('input', { class: 'input lk-code', maxlength: 7, placeholder: 'ABC123', autocomplete: 'off', autocorrect: 'off', autocapitalize: 'characters', spellcheck: 'false' });
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      node.appendChild(el('button', { type: 'button', class: 'btn btn-soft btn-block', html: icon('camera') + '<span>Scan their QR code</span>', onclick: function () {
        scanSheet(name, function (code) { inp.value = code; setTimeout(go, 200); });   // scanned: link straight away, in this sheet
      } }));
      node.appendChild(el('div', { class: 'lk-or', text: 'or type their code' }));
    }
    node.appendChild(inp);
    var msg = el('p', { class: 'lk-msg' }); node.appendChild(msg);
    function go() {
      msg.textContent = 'Checking…';
      FGHSync.linkAdd(name, inp.value).then(function (d) {
        s.close(); avRefresh(); if (onDone) onDone();
        setTimeout(function () { sentSheet(name, d.name); }, 330);
      }).catch(function (e) { msg.textContent = linkErr(e); sfx('bad'); });
    }
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') go(); });
    s = sheet({ title: 'Link ' + name, node: node, actions: [{ label: 'Link', primary: true, keep: true, onClick: go }, { label: 'Cancel', cls: 'btn-ghost' }] });
    if (scanned) { inp.value = scanned; setTimeout(go, 350); }   // back from the scanner: link straight away
    else setTimeout(function () { inp.focus(); }, 300);
  }
  // They accepted your link: a small banner drops in from the top, on any screen (mid-game too), then slides away
  function acceptedBanner() {
    var names; try { names = JSON.parse(lsGet('fgh_link_acc', '[]')); } catch (e) { names = []; }
    if (!Array.isArray(names) || !names.length || !doc.body) return;
    try { localStorage.removeItem('fgh_link_acc'); } catch (e) {}
    var who = names.join(' and '), me = lsGet('my_name', '').trim() || 'You';
    var old = doc.querySelector('.k-note'); if (old) old.remove();
    var b = el('button', { type: 'button', class: 'k-note', role: 'status', 'aria-label': who + ' accepted · you’re linked' }, [
      el('span', { class: 'k-note-pair' }, [avEl(me, null, '#3f86e0'), el('i', { html: icon('link') }), avEl(names[0], null, '#e2557f')]),
      el('span', { class: 'grow' }, [el('b', { text: who + ' accepted' }), el('small', { text: 'You’re linked' })]),
      el('span', { class: 'k-note-ok', html: icon('check') })
    ]);
    function hide() { b.classList.remove('show'); setTimeout(function () { b.remove(); }, 400); }
    b.addEventListener('click', hide);
    doc.body.appendChild(b);
    requestAnimationFrame(function () { requestAnimationFrame(function () { b.classList.add('show'); }); });
    setTimeout(function () { sfx('good'); haptic('success'); }, 200);
    setTimeout(hide, 5000);
    avRefresh();
  }
  window.addEventListener('fghlinks', function (e) { if (e.detail && e.detail.accepted && e.detail.accepted.length) acceptedBanner(); });
  // accepted while no page could show it (the app was closed): on the next page
  window.addEventListener('load', function () { setTimeout(acceptedBanner, 1200); });
  // The request went out: you and them with a dotted link between, waiting for their answer
  function sentSheet(name, them) {
    var me = lsGet('my_name', '').trim() || 'You';
    var node = el('div', { class: 'lk lk-sent' }, [
      el('div', { class: 'lk-sent-pair' }, [
        avEl(me, 'lg', 'var(--surface-3)'),
        el('span', { class: 'lk-sent-line' }, [el('i'), el('b', { html: icon('link') })]),
        el('span', { class: 'lk-sent-them' }, [avEl(name, 'lg', 'var(--surface-3)'), el('em', { text: '?' })])
      ]),
      el('p', { class: 'lk-sent-t', html: 'Asked <b>' + esc(name) + '</b> to link' }),
      el('p', { class: 'muted', text: 'Once they accept, you’re linked.' })
    ]);
    sfx('good'); haptic('success');
    // they accept while this is open: the question mark turns into a check and the link closes
    function onLinks(e) {
      var lk = (e.detail && e.detail.accepted) || [];
      if (!lk.some(function (n) { return String(n).toLowerCase() === name.toLowerCase(); })) return;
      node.classList.add('done');
      node.querySelector('.lk-sent-them em').innerHTML = icon('check');
      node.querySelector('.lk-sent-t').innerHTML = 'Linked with <b>' + esc(name) + '</b>';
      node.querySelector('.muted').textContent = 'You’re all set.';
      var h = node.closest('.k-sheet') && node.closest('.k-sheet').querySelector('h2'); if (h) h.textContent = 'Linked';
      sfx('win'); haptic('success');
    }
    window.addEventListener('fghlinks', onLinks);
    // on a game page there's no live listener: look for their answer every 3 seconds while this is open
    var peek = setInterval(function () { if (document.visibilityState === 'visible' && FGHSync.linkPeek) FGHSync.linkPeek(); }, 3000);
    sheet({ title: 'Request sent', node: node, actions: [{ label: 'Done', primary: true }], onClose: function () { clearInterval(peek); window.removeEventListener('fghlinks', onLinks); } });
  }
  // ── Drag to reorder a list: a grip on each row; drag it and the row lifts and follows the finger, the others slide
  // out of its way, and it settles into the gap when let go. Near the top or bottom of a scrolling sheet the list
  // scrolls itself (faster nearer the edge). Arrow keys on the grip move it one place. rowSel picks the rows in box;
  // onMove(from, to) after the row has moved in the page. Returns a function that makes a grip for a row.
  var GRIP_SVG = '<svg class="ico" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="9" cy="6" r="1.7"/><circle cx="15" cy="6" r="1.7"/><circle cx="9" cy="12" r="1.7"/><circle cx="15" cy="12" r="1.7"/><circle cx="9" cy="18" r="1.7"/><circle cx="15" cy="18" r="1.7"/></svg>';
  function dragGrip(box, rowSel, onMove, cls) {
    function all() { return Array.prototype.slice.call(box.querySelectorAll(rowSel)); }
    function place(from, t) {
      var rs = all(), r = rs[from];
      if (t === from || !r) return;
      var ref = rs[t]; ref.parentNode.insertBefore(r, t > from ? ref.nextSibling : ref);
      if (onMove) onMove(from, t);
    }
    return function () {
      var g = el('span', { class: cls || 'k-grip', role: 'button', tabindex: '0', 'aria-label': 'Move (drag, or use the arrow keys)', html: GRIP_SVG });
      var row = null, rows = null, i = 0, to = 0, on = false, mid = [], sc = null, st0 = 0, yc0 = 0, lastY = 0, raf = 0, stMax = 0;
      function rowOf() { var n = g; while (n && n.parentNode !== box && !(n.matches && n.matches(rowSel))) n = n.parentNode; return n; }
      g.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); });
      g.addEventListener('keydown', function (e) {
        if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
        e.preventDefault();
        var rs = all(), k = rs.indexOf(rowOf()), t = k + (e.key === 'ArrowUp' ? -1 : 1);
        if (k < 0 || t < 0 || t >= rs.length) return;
        place(k, t); sfx('tap'); g.focus();
      });
      function scroller() { for (var n = box.parentNode; n && n !== doc.body; n = n.parentNode) { var oy = getComputedStyle(n).overflowY; if ((oy === 'auto' || oy === 'scroll') && n.scrollHeight > n.clientHeight + 1) return n; } return doc.scrollingElement; }
      function update() {
        // the row stays within the list, and takes the next place once it's past halfway to it
        var st = sc.scrollTop, dy = Math.max(mid[0] - mid[i], Math.min(mid[mid.length - 1] - mid[i], lastY + st - yc0)), c = mid[i] + dy, t = i;
        if (Math.abs(dy) > 4) box._dragged = true;
        while (t < rows.length - 1 && c > (mid[t] + mid[t + 1]) / 2) t++;
        while (t > 0 && c < (mid[t] + mid[t - 1]) / 2) t--;
        row.style.transform = 'translateY(' + dy + 'px) scale(1.02)';
        if (t !== to) { to = t; haptic('light'); sfx('tap'); }
        rows.forEach(function (r, j) { if (j === i) return; var sh = (j > i && j <= to) ? mid[j - 1] - mid[j] : (j < i && j >= to) ? mid[j + 1] - mid[j] : 0; r.style.transform = sh ? 'translateY(' + sh + 'px)' : ''; });
      }
      function tick() {
        raf = 0; if (!on) return;
        var r = sc === doc.scrollingElement ? { top: 0, bottom: innerHeight } : sc.getBoundingClientRect(), edge = 80, v = 0;
        if (lastY > r.bottom - edge) v = Math.min(1, (lastY - (r.bottom - edge)) / edge);
        else if (lastY < r.top + edge) v = -Math.min(1, ((r.top + edge) - lastY) / edge);
        if (v) { var b = sc.scrollTop; sc.scrollTop = Math.max(0, Math.min(stMax, b + v * 16)); if (sc.scrollTop !== b) update(); }   // (never past the list's own end)
        raf = requestAnimationFrame(tick);
      }
      g.addEventListener('pointerdown', function (e) {
        if (e.button > 0) return;
        e.preventDefault(); try { g.setPointerCapture(e.pointerId); } catch (x) {}
        row = rowOf(); rows = all(); if (!row || rows.indexOf(row) < 0) return;
        sc = scroller(); st0 = sc.scrollTop; stMax = sc.scrollHeight - sc.clientHeight; lastY = e.clientY; yc0 = e.clientY + st0;
        i = to = rows.indexOf(row); on = true; box._dragged = false;
        mid = rows.map(function (r) { var b = r.getBoundingClientRect(); return b.top + b.height / 2 + st0; });   // (in list coordinates, so scrolling doesn't throw them off)
        row.classList.add('drag'); box.classList.add('dragging'); haptic('light');
        if (!raf) raf = requestAnimationFrame(tick);
      });
      g.addEventListener('pointermove', function (e) { if (!on) return; lastY = e.clientY; update(); });
      function end() {
        if (!on) return; on = false; if (raf) { cancelAnimationFrame(raf); raf = 0; }
        rows.forEach(function (r) { r.style.transform = ''; }); row.classList.remove('drag'); box.classList.remove('dragging');
        if (to !== i) { place(i, to); sfx('pop'); }
        setTimeout(function () { box._dragged = false; }, 0);
      }
      g.addEventListener('pointerup', end); g.addEventListener('pointercancel', end);
      return g;
    };
  }
  // ── Play time: how long the app is in use, per PIN, by day and hour ──
  // Counted while a page is on screen and someone has touched it (or a key or pad) in the last 5 minutes, so an iPad
  // left on a game doesn't run up time. Each device keeps its own record (gn_usage_<device>: {'YYYY-MM-DD': [seconds
  // in each of the 24 hours]}, 60 days) in the signed-in PIN's space; it syncs with the PIN, and the screen adds up
  // every device's record.
  var USE_DEV = (function () { var v = null; try { v = LS.getItem('fgh_usage_dev'); if (!v || !/^[a-z0-9]{6,12}$/.test(v)) { v = Math.random().toString(36).slice(2, 10); LS.setItem('fgh_usage_dev', v); } } catch (e) { v = 'here'; } return v; })();
  var USE_KEY = 'gn_usage_' + USE_DEV, useIn = Date.now(), usePend = {}, useNoted = 0;
  function dayKey(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  ['pointerdown', 'keydown', 'touchstart', 'wheel'].forEach(function (k) { doc.addEventListener(k, function () { useIn = Date.now(); }, { capture: true, passive: true }); });
  setInterval(function () {
    if (doc.visibilityState !== 'visible' || timerLocked) return;
    try { if (navigator.getGamepads && Array.prototype.some.call(navigator.getGamepads() || [], function (g) { return g && g.buttons && g.buttons.some(function (b) { return b.pressed; }); })) useIn = Date.now(); } catch (e) {}
    if (Date.now() - useIn > 300000) return;
    var d = new Date(), k = dayKey(d), h = d.getHours();
    (usePend[k] = usePend[k] || {})[h] = (usePend[k][h] || 0) + 15;
  }, 15000);
  function useFlush(note) {
    var ks = Object.keys(usePend); if (!ks.length) return;
    var rec = {}; try { rec = JSON.parse(LS.getItem(USE_KEY) || '{}') || {}; } catch (e) {}
    ks.forEach(function (k) { var a = rec[k] || (rec[k] = new Array(24).fill(0)); Object.keys(usePend[k]).forEach(function (h) { a[h] = Math.min(3600, (a[h] || 0) + usePend[k][h]); }); });
    usePend = {};
    var keep = dayKey(new Date(Date.now() - 60 * 86400000)); Object.keys(rec).forEach(function (k) { if (k < keep) delete rec[k]; });
    try { LS.setItem(USE_KEY, JSON.stringify(rec)); } catch (e) {}
    if (note || Date.now() - useNoted > 300000) { useNoted = Date.now(); if (window.FGHSync && FGHSync.noteWrite) FGHSync.noteWrite(USE_KEY); }   // (to the account every few minutes, not every minute)
  }
  setInterval(function () { useFlush(false); }, 60000);
  doc.addEventListener('visibilitychange', function () { if (doc.visibilityState === 'hidden') useFlush(true); });
  window.addEventListener('pagehide', function () { useFlush(true); });
  // every device's record for this PIN, added up: {day: [24 hours of seconds]}
  function usageAll() {
    useFlush(false);
    var out = {};
    for (var i = 0; i < LS.length; i++) {
      var k = LS.key(i); if (!k || k.indexOf('gn_usage_') !== 0) continue;
      var r = null; try { r = JSON.parse(LS.getItem(k)); } catch (e) {}
      if (r) Object.keys(r).forEach(function (d) { var a = out[d] || (out[d] = new Array(24).fill(0)); (r[d] || []).forEach(function (s, h) { a[h] += +s || 0; }); });
    }
    return out;
  }
  function minsText(sec) { var m = Math.round(sec / 60); if (m < 1) return sec > 0 ? 'Under a minute' : 'None'; var h = Math.floor(m / 60); return h ? h + ' hr' + (m % 60 ? ' ' + (m % 60) + ' min' : '') : m + ' min'; }
  function sumDay(a) { return (a || []).reduce(function (x, y) { return x + y; }, 0); }
  function playToday() { var a = usageAll()[dayKey(new Date())]; return sumDay(a); }
  // The screen: today's total, the last 7 days as bars (tap one), and that day hour by hour
  function playTimeSheet() {
    var U = usageAll(), days = [], i, today = new Date(); today.setHours(12, 0, 0, 0);
    for (i = 6; i >= 0; i--) { var d = new Date(today.getTime() - i * 86400000); days.push({ d: d, k: dayKey(d), s: sumDay(U[dayKey(d)]) }); }
    var sel = days.length - 1, max = Math.max(1800, Math.max.apply(null, days.map(function (x) { return x.s; })));
    var week = days.reduce(function (a, x) { return a + x.s; }, 0), active = days.filter(function (x) { return x.s > 0; }).length;
    var who = window.FGHSync && FGHSync.isPin && FGHSync.isPin() ? (lsGet('my_name', '') || 'This profile') : 'Guest on this device';
    var hero = el('div', { class: 'k-pt-hero' }, [el('small', { text: 'Today' }), el('b', { text: minsText(days[6].s) }),
      el('span', { text: 'This week ' + minsText(week) + (active ? ' · about ' + minsText(week / active) + ' a day played' : '') })]);
    var bars = el('div', { class: 'k-pt-bars', role: 'tablist', 'aria-label': 'Last 7 days' }), hours = el('div', { class: 'k-pt-hours' }), dayT = el('div', { class: 'k-pt-day' }), tip = el('div', { class: 'k-pt-tip' });
    days.forEach(function (x, j) {
      var lbl = j === 6 ? 'Today' : x.d.toLocaleDateString([], { weekday: 'short' });
      var b = el('button', { type: 'button', class: 'k-pt-bar', role: 'tab', 'aria-label': lbl + ': ' + minsText(x.s), onclick: function () { sel = j; sfx('tap'); paintSel(); } }, [
        el('span', { class: 'v', text: x.s ? minsText(x.s).replace(' min', 'm').replace(' hr', 'h') : '' }),
        el('span', { class: 'col' }, [el('i', { style: { height: (x.s ? Math.max(4, x.s / max * 100) : 0) + '%' } })]),
        el('span', { class: 'd', text: lbl })]);
      bars.appendChild(b);
    });
    function paintSel() {
      Array.prototype.forEach.call(bars.children, function (b, j) { b.classList.toggle('on', j === sel); b.setAttribute('aria-selected', String(j === sel)); });
      var x = days[sel], a = U[x.k] || new Array(24).fill(0);
      dayT.innerHTML = '<b>' + esc(sel === 6 ? 'Today' : x.d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })) + '</b><span>' + esc(minsText(x.s)) + '</span>';
      hours.innerHTML = ''; tip.textContent = '';
      a.forEach(function (s, h) {
        var lv = s <= 0 ? 0 : s < 600 ? 1 : s < 1500 ? 2 : s < 2700 ? 3 : 4;   // shade by how much of that hour was played
        var lab = function (n) { return (n % 12 || 12) + (n < 12 ? ' AM' : ' PM'); };
        var c = el('button', { type: 'button', class: 'k-pt-h l' + lv, 'aria-label': lab(h) + ': ' + minsText(s), onclick: function () { Array.prototype.forEach.call(hours.children, function (y) { y.classList.remove('pick'); }); c.classList.add('pick'); tip.textContent = lab(h) + '–' + lab((h + 1) % 24) + ' · ' + minsText(s); } });
        hours.appendChild(c);
      });
    }
    paintSel();
    var node = el('div', { class: 'k-pt' }, [
      el('p', { class: 'k-pt-who', text: who + ' · counted while the games are open and in use' }), hero,
      el('div', { class: 'label k-sec', text: 'Last 7 days' }), bars,
      el('div', { class: 'label k-sec', text: 'Time of day' }), dayT, hours,
      el('div', { class: 'k-pt-axis' }, ['12 AM', '6 AM', '12 PM', '6 PM', '12 AM'].map(function (t) { return el('span', { text: t }); })), tip]);
    sheet({ title: 'Play time', node: node, actions: [{ label: 'Done', cls: 'btn-soft' }] });
  }
  // ── Game timer: a countdown set in Preferences that ends gaming for this PIN ──
  // gn_timer {end, lock, mins} belongs to the PIN (or guest) and syncs like a setting, so it carries on on every device
  // that PIN signs in on (picked up when a page opens). Nothing shows until the last two minutes: then
  // a small countdown sits in the game's top bar (or a slim pill at the top of the screen where there's no bar), out
  // of the game's way. At zero: a chime and "Time's up". With lock on, there's a minute's grace to finish up, then a
  // screen over everything says game time is over; holding Unlock for 15 seconds ends the timer.
  var TIMER = 'gn_timer', timerLocked = false, tmEl = null, tmLock = null, tmLast = null, tmT = 0;
  // the timer used to belong to the device: hand one that's set to whoever is signed in now
  try { [['fgh_timer', TIMER], ['fgh_timer_lock', 'gn_timer_lock'], ['fgh_timer_custom', 'gn_timer_custom']].forEach(function (m) { var v = LS.getItem(m[0]); if (v != null) { if (LS.getItem(m[1]) == null) lsSet(m[1], v); LS.removeItem(m[0]); } }); } catch (e) {}
  function timerGet() { try { var t = JSON.parse(LS.getItem(TIMER) || 'null'); return t && t.end ? t : null; } catch (e) { return null; } }
  function timerSet(t) { try { if (t) LS.setItem(TIMER, JSON.stringify(t)); else LS.removeItem(TIMER); } catch (e) {} if (window.FGHSync && FGHSync.noteWrite) FGHSync.noteWrite(TIMER); timerTick(); }
  function clockText(ms) { var s = Math.max(0, Math.ceil(ms / 1000)), h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, x = s % 60; return (h ? h + ':' + ('0' + m).slice(-2) : m) + ':' + ('0' + x).slice(-2); }
  function timerChip(text, cls) {
    var host = gbarEl;
    if (tmEl && host && !host.contains(tmEl)) { tmEl.remove(); tmEl = null; }   // the page's bar arrived after the pill: move into it
    if (!tmEl) {
      tmEl = el('div', { class: 'k-timer', role: 'timer', 'aria-live': 'polite' });
      if (host) { var at = host.querySelector('.icon-btn'); host.insertBefore(tmEl, at); } else { tmEl.classList.add('float'); doc.body.appendChild(tmEl); }
    }
    tmEl.className = 'k-timer' + (host ? '' : ' float') + (cls ? ' ' + cls : '');
    tmEl.innerHTML = icon('clock') + '<b>' + esc(text) + '</b>';
  }
  function timerChipOff() { if (tmEl) { tmEl.remove(); tmEl = null; } }
  function timerLockOn() {
    if (tmLock) return;
    timerLocked = true;
    // a long hold (15 seconds, counting down on the button) so it's a decision, not a tap
    var HOLD = 15000, hold = el('button', { type: 'button', class: 'k-lock-hold', html: '<i></i><span>Hold to unlock</span>' }), lab = hold.querySelector('span'), ht = 0, hi = 0;
    function down(e) {
      e.preventDefault(); hold.classList.add('on'); var t0 = Date.now();
      ht = setTimeout(function () { haptic('success'); timerSet(null); }, HOLD);
      hi = setInterval(function () { lab.textContent = 'Keep holding · ' + Math.max(1, Math.ceil((HOLD - (Date.now() - t0)) / 1000)); }, 200);
      lab.textContent = 'Keep holding · 15';
    }
    function up() { hold.classList.remove('on'); clearTimeout(ht); clearInterval(hi); lab.textContent = 'Hold to unlock'; }
    hold.addEventListener('pointerdown', down); ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (k) { hold.addEventListener(k, up); });
    tmLock = el('div', { class: 'k-lock', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Game time is over' }, [
      el('div', { class: 'k-lock-in' }, [el('span', { class: 'k-lock-ic', html: icon('moon') }), el('h2', { text: 'Game time’s over' }), el('p', { text: 'Time to put the games away for now.' }), hold])]);
    // nothing underneath can be tapped, typed into or scrolled
    ['pointerdown', 'click', 'touchstart', 'keydown', 'wheel'].forEach(function (k) { tmLock.addEventListener(k, function (e) { if (!hold.contains(e.target)) { e.stopPropagation(); if (k !== 'touchstart' && k !== 'pointerdown') e.preventDefault(); } }, { capture: true, passive: false }); });
    doc.body.appendChild(tmLock);
    try { doc.activeElement && doc.activeElement.blur && doc.activeElement.blur(); } catch (e) {}
    try { window.dispatchEvent(new Event('kit:locked')); } catch (e) {}
  }
  function timerLockOff() { timerLocked = false; if (tmLock) { tmLock.remove(); tmLock = null; } }
  function timerTick() {
    clearTimeout(tmT);
    var t = timerGet();
    if (!t) { timerChipOff(); timerLockOff(); tmLast = null; return; }
    var left = t.end - Date.now(), grace = 60000;
    if (left > 120000) { timerChipOff(); timerLockOff(); tmLast = null; }   // (more time added: warn again near the new end)
    else if (left > 0) {
      timerChip(clockText(left), left <= 30000 ? 'low' : '');
      if (tmLast !== 'two') { tmLast = 'two'; sfx('tick'); haptic('light'); toast('2 minutes of game time left'); }
    } else if (t.lock && left > -grace) {
      timerChip('Finish up ' + clockText(left + grace), 'grace');
      if (tmLast !== 'grace') { tmLast = 'grace'; sfx('turn'); haptic('medium'); toast('Time’s up: one more minute to finish up'); }
    } else if (t.lock) { timerChipOff(); timerLockOn(); }
    else {
      timerChip('Time’s up', 'up');
      if (tmLast !== 'up') { tmLast = 'up'; sfx('turn'); haptic('medium'); toast('Time’s up'); }
      if (left < -60000) { timerSet(null); return; }   // the reminder clears itself after a minute
    }
    tmT = setTimeout(timerTick, left > 130000 ? Math.min(30000, left - 120000) : 500);
  }
  doc.addEventListener('visibilitychange', function () { if (doc.visibilityState === 'visible') timerTick(); });
  doc.addEventListener('keydown', function (e) { if (timerLocked) { e.stopPropagation(); e.preventDefault(); } }, true);   // locked: no keys reach the game
  window.addEventListener('storage', function (e) { if (e.key === TIMER) timerTick(); });   // set or stopped in another tab
  doc.addEventListener('fghsync:updated', timerTick);   // set, changed or stopped on another device
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', timerTick); else setTimeout(timerTick, 0);
  // Preferences: pick how long (a preset, or Custom: a dial you spin, a full turn an hour); while it runs, a ring that
  // empties as the time goes, how long is left and when it ends, more time, or stop
  function timerPanel() {
    var box = el('div', { class: 'k-tmr' }), iv = 0, NS = 'http://www.w3.org/2000/svg';
    function lockPref() { return lsGet('gn_timer_lock', '1') === '1'; }
    function durText(m) { var h = Math.floor(m / 60), x = m % 60; return h ? h + ' hr' + (x ? ' ' + x + ' min' : '') : x + ' min'; }
    function endsAt(ms) { return new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); }
    function start(mins, end) { end = end || Date.now() + mins * 60000; timerSet({ end: end, start: Date.now(), lock: lockPref(), mins: mins }); sfx('good'); haptic('light'); paint(); }
    function svgEl(tag, at) { var n = doc.createElementNS(NS, tag); for (var a in at) n.setAttribute(a, at[a]); return n; }
    // a ring: track, the filled arc, optional tick marks (every 5 minutes, longer each quarter hour)
    function ring(size, ticks) {
      var c = size / 2, r = c - 14, sv = svgEl('svg', { viewBox: '0 0 ' + size + ' ' + size, class: 'k-ring', 'aria-hidden': 'true' });
      sv.appendChild(svgEl('circle', { cx: c, cy: c, r: r, class: 'k-ring-track' }));
      if (ticks) for (var i = 0; i < 60; i += 5) { var a = i / 60 * 2 * Math.PI, l = i % 15 === 0 ? 9 : 5; sv.appendChild(svgEl('line', { x1: c + Math.sin(a) * (r - 13), y1: c - Math.cos(a) * (r - 13), x2: c + Math.sin(a) * (r - 13 - l), y2: c - Math.cos(a) * (r - 13 - l), class: 'k-ring-tick' + (i % 15 ? '' : ' q') })); }
      var arc = svgEl('circle', { cx: c, cy: c, r: r, class: 'k-ring-arc', transform: 'rotate(-90 ' + c + ' ' + c + ')', 'stroke-dasharray': (2 * Math.PI * r).toFixed(1), 'stroke-dashoffset': (2 * Math.PI * r).toFixed(1) });
      sv.appendChild(arc);
      return { svg: sv, c: c, r: r, set: function (f) { var L = 2 * Math.PI * r; arc.setAttribute('stroke-dashoffset', (L * (1 - Math.max(0, Math.min(1, f)))).toFixed(1)); } };
    }
    function lockRow(t) {
      var lockOn = t ? !!t.lock : lockPref();
      var b = el('button', { type: 'button', class: 'k-tmr-lock', role: 'switch', 'aria-checked': String(lockOn) }, [
        el('span', { class: 'ic', html: icon('lock') }),
        el('span', { class: 'grow' }, [el('b', { text: 'Lock games when time’s up' }), el('small', { text: lockOn ? 'A minute to finish up, then games close' : 'Just a reminder when time’s up' })]), el('i', { class: 'sw' })]);
      b.onclick = function () { var x = timerGet(), v = !(x ? x.lock : lockPref()); lsSet('gn_timer_lock', v ? '1' : '0'); if (x) { x.lock = v; timerSet(x); } sfx('tap'); haptic('light'); paint(); };
      return b;
    }
    // Custom: drag round the dial (clockwise adds time, a full turn is an hour, up to 10 hours, in 5-minute steps)
    function dialPanel() {
      var cm = Math.max(5, Math.min(600, Number(lsGet('gn_timer_custom', '25')) || 25));
      var R = ring(240, true), knob = svgEl('circle', { r: 13, class: 'k-dial-knob' }), hrs = el('div', { class: 'k-dial-hrs' });
      R.svg.appendChild(knob);
      var big = el('b', { class: 'k-dial-n' }), sub = el('small', { class: 'k-dial-end' });
      var dial = el('div', { class: 'k-dial', role: 'slider', tabindex: '0', 'aria-label': 'Game time', 'aria-valuemin': '5', 'aria-valuemax': '600' }, [R.svg, el('div', { class: 'k-dial-mid' }, [big, sub, hrs])]);
      function show() {
        var f = (cm % 60) / 60, a = f * 2 * Math.PI;
        R.set(cm >= 60 && f === 0 ? 1 : f);
        knob.setAttribute('cx', (R.c + Math.sin(a) * R.r).toFixed(1)); knob.setAttribute('cy', (R.c - Math.cos(a) * R.r).toFixed(1));
        big.textContent = durText(cm); sub.textContent = 'Ends at ' + endsAt(Date.now() + cm * 60000);
        hrs.innerHTML = ''; for (var i = 0; i < Math.min(10, Math.floor(cm / 60)); i++) hrs.appendChild(el('i'));   // a dot for each full hour
        dial.setAttribute('aria-valuenow', String(cm)); dial.setAttribute('aria-valuetext', durText(cm));
      }
      var on = false, lastA = 0, acc = 0;
      function ang(e) { var b = R.svg.getBoundingClientRect(); return Math.atan2(e.clientX - (b.left + b.width / 2), -(e.clientY - (b.top + b.height / 2))); }
      dial.addEventListener('pointerdown', function (e) { e.preventDefault(); try { dial.setPointerCapture(e.pointerId); } catch (x) {} on = true; lastA = ang(e); acc = cm; dial.classList.add('on'); });
      dial.addEventListener('pointermove', function (e) {
        if (!on) return;
        var a = ang(e), d = a - lastA; if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI; lastA = a;
        acc = Math.max(5, Math.min(600, acc + d / (2 * Math.PI) * 60));
        var n = Math.round(acc / 5) * 5; if (n < 5) n = 5;
        if (n !== cm) { cm = n; show(); sfx('tick', 0.3); if (cm % 15 === 0) haptic('light'); }
      });
      function up() { if (!on) return; on = false; dial.classList.remove('on'); acc = cm; }
      dial.addEventListener('pointerup', up); dial.addEventListener('pointercancel', up);
      dial.addEventListener('keydown', function (e) { var d = e.key === 'ArrowUp' || e.key === 'ArrowRight' ? 5 : e.key === 'ArrowDown' || e.key === 'ArrowLeft' ? -5 : 0; if (!d) return; e.preventDefault(); cm = Math.max(5, Math.min(600, cm + d)); show(); });
      show();
      var at = el('input', { type: 'time', class: 'k-tmr-at', 'aria-label': 'Or until this time' });
      var go = el('button', { type: 'button', class: 'btn btn-primary btn-block', text: 'Start', onclick: function () {
        if (at.value) {   // until a time: today, or tomorrow if that time has already gone by
          var hm = at.value.split(':'), d = new Date(); d.setHours(+hm[0], +hm[1], 0, 0); if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1);
          start(Math.round((d.getTime() - Date.now()) / 60000), d.getTime());
        } else { lsSet('gn_timer_custom', String(cm)); start(cm); }
      } });
      at.addEventListener('input', function () { dial.classList.toggle('dim', !!at.value); go.textContent = at.value ? 'Start · until ' + endsAt((function () { var hm = at.value.split(':'), d = new Date(); d.setHours(+hm[0], +hm[1], 0, 0); if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1); return d.getTime(); })()) : 'Start'; });
      return el('div', { class: 'k-tmr-cust' }, [dial, el('p', { class: 'k-dial-hint', text: 'Spin the dial: a full turn is an hour' }), el('label', { class: 'k-tmr-or' }, [el('span', { text: 'or until' }), at]), go]);
    }
    function paint() {
      clearInterval(iv); box.innerHTML = '';
      var t = timerGet();
      if (!t) {
        var cust = null, picks = el('div', { class: 'k-tmr-picks' });
        [[15, '15', 'min'], [30, '30', 'min'], [45, '45', 'min'], [60, '1', 'hour'], [90, '1½', 'hours'], [120, '2', 'hours']].forEach(function (p) {
          picks.appendChild(el('button', { type: 'button', class: 'k-tmr-pick', 'aria-label': p[1] + ' ' + p[2], onclick: function () { start(p[0]); } }, [el('b', { text: p[1] }), el('small', { text: p[2] })]));
        });
        var cb = el('button', { type: 'button', class: 'k-tmr-pick cust', 'aria-expanded': 'false', onclick: function () {
          var open = !cust; if (cust) { cust.remove(); cust = null; } else { cust = dialPanel(); picks.parentNode.insertBefore(cust, picks.nextSibling); }
          cb.classList.toggle('on', open); cb.setAttribute('aria-expanded', String(open)); sfx('tap');
        } }, [el('span', { html: icon('clock') }), el('small', { text: 'Custom' })]);
        picks.appendChild(cb);
        box.appendChild(el('p', { class: 'k-tmr-note', text: (window.FGHSync && FGHSync.isPin && FGHSync.isPin() ? 'A countdown for your game time, on every device you sign in on.' : 'A countdown for game time on this device.') + ' It shows up in the last two minutes.' }));
        box.appendChild(picks);
      } else {
        var R = ring(150, false), left = el('b', { class: 'k-tmr-left' }), cap = el('small'), when = el('p', { class: 'k-tmr-when' });
        var total = t.start ? t.end - t.start : (t.mins || 60) * 60000;
        var run = el('div', { class: 'k-tmr-run' }, [
          el('div', { class: 'k-tmr-face' }, [R.svg, el('div', { class: 'k-tmr-mid' }, [left, cap])]),
          el('div', { class: 'k-tmr-side' }, [when,
            el('div', { class: 'k-tmr-btns' }, [
              el('button', { type: 'button', class: 'btn btn-soft', html: icon('plus') + '<span>15 min</span>', onclick: function () { var x = timerGet(); if (!x) return; var add = 15 * 60000; x.end = Math.max(x.end, Date.now()) + add; total += add; timerSet(x); sfx('tap'); haptic('light'); paint(); } }),
              el('button', { type: 'button', class: 'btn btn-ghost', text: 'Stop timer', onclick: function () { timerSet(null); sfx('tap'); paint(); } })])])]);
        var upd = function () {
          var x = timerGet(); if (!x) { paint(); return; }
          var ms = x.end - Date.now(), tot = x.start ? x.end - x.start : total;
          R.set(ms / tot); run.classList.toggle('low', ms <= 120000);
          left.textContent = ms > 0 ? clockText(ms) : '0:00'; cap.textContent = ms > 0 ? 'left' : 'time’s up';
          when.innerHTML = 'Ends at <b>' + esc(endsAt(x.end)) + '</b>';
        };
        upd(); iv = setInterval(function () { if (!box.isConnected) { clearInterval(iv); return; } upd(); }, 1000);
        box.appendChild(run);
      }
      box.appendChild(lockRow(t));
    }
    paint();
    return box;
  }
  // ── Game defaults: each game's own setup, set ahead of time ──
  // The list (profile menu) opens a game's page with ?defaults=1: its normal setup screen, saving instead of
  // starting (see EDIT_DEFAULTS at the top). The choices land in gn_setup_<id>, the same place a game remembers
  // its last setup, with a short summary (sum) for the list. SETUP_PAGES: the pages that call Kit.setup.
  var SETUP_PAGES = ['applestoapples', 'asteroids','axisallies-score', 'axisallies', 'baccarat', 'backgammon', 'battleship', 'bingo', 'blackjack', 'boggle', 'breakout', 'candymatch', 'centipede', 'checkers', 'chess', 'chinesecheckers', 'codebreaker', 'connectfour', 'conversation', 'craps', 'crazytower', 'cribbage', 'crossyroad', 'cubehopper', 'dealornodeal', 'dominoes', 'dotsboxes', 'euchre-ai', 'euchre', 'farkle', 'five-crowns', 'fivecrownss-ai', 'flappybird', 'flip7-ai', 'flip7', 'gin-rummy-ai', 'gin-rummy', 'go', 'hangman', 'hearts-ai', 'hearts', 'horserace', 'invaders', 'lorcana-play', 'lorcana', 'lrc', 'madlibs', 'mahjong', 'mahjong4', 'mancala', 'marbles', 'marblesolitaire', 'mathpuzzles', 'mazes', 'mysteries', 'logicgrid', 'truthlies', 'ciphers', 'riddles', 'memorymatch', 'minesweeper', 'minigolf', 'othello', 'pacman', 'paddleball', 'paigow', 'peggle', 'phase10-ai', 'phase10', 'pinball', 'plinko', 'poker', 'pokersquares', 'pressyourluck', 'riddlestories', 'rook-ai', 'rook', 'roulette', 'sandlot', 'scorecard', 'scrabble', 'shellgame', 'slidepuzzle', 'slots', 'snake', 'solitaire', 'spades-ai', 'spades', 'sudoku', 'tetris', 'threecardpoker', 'tictactoe', 'trivia', 'wheeloffortune', 'willycrash', 'wizard-ai', 'wizard', 'wordscramble', 'wordsearch', 'wouldyourather', 'yahtzee'];
  function setupPageOf(g) {
    if (g.play && SETUP_PAGES.indexOf(g.play) >= 0) return g.play;
    if (g.score && SETUP_PAGES.indexOf(g.score) >= 0) return g.score;
    return SETUP_PAGES.indexOf(g.id) >= 0 ? g.id : null;
  }
  function setupSaved(id) { try { return JSON.parse(lsGet('gn_setup_' + id, 'null')); } catch (e) { return null; } }
  function rootPath() { return /\/games\//.test(location.pathname) ? '../' : ''; }
  function defaultsSheet(part) {
    var list = (typeof GAMES !== 'undefined' ? GAMES : []).filter(function (g) { return !g.hidden && setupPageOf(g); });
    // Home screen sections: move them up and down; Favorites always stays first
    var ord = el('div', { class: 'k-ord' });
    // drag a section by its grip into the order you like (the same feel as the Daily puzzles list)
    var ordGrip = dragGrip(ord, '.k-ord-row.mv', function () {
      lsSet('gn_cat_order', JSON.stringify(Array.prototype.map.call(ord.querySelectorAll('.k-ord-row.mv'), function (r) { return r.getAttribute('data-id'); })));
      try { window.dispatchEvent(new Event('kit:cats')); } catch (e) {}
      paintOrd();
    }, 'k-ord-grip');
    function paintOrd() {
      ord.innerHTML = '';
      ord.appendChild(el('div', { class: 'k-ord-row fixed' }, [el('span', { class: 'ic', html: icon('star') }), el('span', { class: 'grow' }, [el('b', { text: 'Favorites' }), el('small', { text: 'Always first' })])]));
      var cs = catsOrdered();
      cs.forEach(function (c, i) {
        // the switch shows or hides the whole section on the home screen (the row dims when it's off)
        var on = catOn(c.id), row = el('div', { class: 'k-ord-row mv' + (on ? '' : ' off'), 'data-id': c.id });
        var sw = el('button', { type: 'button', class: 'k-ord-sw', role: 'switch', 'aria-checked': String(on), 'aria-label': 'Show ' + c.name + ' on the home screen', html: '<i class="sw"></i>', onclick: function () {
          var off = catsOff(), k = off.indexOf(c.id);
          if (k >= 0) off.splice(k, 1); else off.push(c.id);
          lsSet('gn_cat_off', JSON.stringify(off)); sfx('tap'); haptic('light'); paintOrd();
          try { window.dispatchEvent(new Event('kit:cats')); } catch (e) {}
        } });
        ord.appendChild(row);
        [ordGrip(), el('span', { class: 'ic', html: icon(c.id) }), el('span', { class: 'grow' }, [el('b', { text: c.name })].concat(on ? [] : [el('small', { text: 'Hidden from the home screen' })])), sw].forEach(function (x) { row.appendChild(x); });
      });
      if (lsGet('gn_cat_order', '') && lsGet('gn_cat_order', '') !== '[]') ord.appendChild(el('button', { type: 'button', class: 'btn btn-ghost btn-block k-ord-reset', text: 'Back to the usual order', onclick: function () {
        lsSet('gn_cat_order', '[]'); sfx('tap'); paintOrd(); try { window.dispatchEvent(new Event('kit:cats')); } catch (e) {}
      } }));
    }
    paintOrd();
    var q = el('input', { class: 'input', type: 'search', placeholder: 'Find a game', autocomplete: 'off', 'aria-label': 'Find a game' });
    var box = el('div', { class: 'k-list k-defs' });
    function paint() {
      var t = q.value.trim().toLowerCase(); box.innerHTML = '';
      var cats = catsOrdered(); if (!cats.length) cats = [{ id: null, name: '' }];
      cats.forEach(function (c) {
        var gs = list.filter(function (g) { return (c.id == null || g.cat === c.id) && (!t || g.name.toLowerCase().indexOf(t) >= 0); });
        if (!gs.length) return;
        if (c.name) box.appendChild(el('div', { class: 'label k-sec', text: c.name }));
        gs.forEach(function (g) {
          var sv = setupSaved(g.id), sum = sv && sv.sum ? sv.sum : sv ? 'Last game’s setup' : 'Not set yet';
          box.appendChild(el('button', { type: 'button', onclick: function () { location.href = rootPath() + 'games/' + setupPageOf(g) + '.html?defaults=1'; } }, [
            el('span', { class: 'ic gic', html: window.GameIcon ? GameIcon(g.id) : '' }),
            el('span', { class: 'grow' }, [el('b', { text: g.name }), el('small', { text: sum })]),
            el('span', { class: 'chev', html: icon('right') })]));
        });
      });
      if (!box.firstChild) box.appendChild(el('p', { class: 'muted', text: 'No game called that.' }));
    }
    q.addEventListener('input', paint);
    paint();
    if (part === 'home') return sheet({ title: 'Home screen', node: el('div', null, [
        el('p', { class: 'muted', style: { margin: '0 0 4px' }, text: 'Drag sections into the order you like. Switch one off to hide its games from home, search, Surprise and High Scores.' }), ord]),
      actions: [{ label: 'Done', cls: 'btn-soft' }] });
    sheet({ title: 'Game defaults', node: el('div', null, [
        el('p', { class: 'muted', style: { margin: '0 0 10px' }, text: 'Pick a game to set how it starts: who plays, the computer’s skill and its options. A game also remembers whatever you pick when you start it.' }), q, box]),
      actions: [{ label: 'Done', cls: 'btn-soft' }] });
  }
  function homeSheet() { defaultsSheet('home'); }
  function timerSheet() { sheet({ title: 'Game timer', node: timerPanel(), actions: [{ label: 'Done', cls: 'btn-soft' }] }); }
  // a few words for the menus: what the timer and the sections are set to now
  function timerStatus() { var t = timerGet(); if (!t) return 'Off'; var ms = t.end - Date.now(); return ms > 0 ? (ms >= 3600000 ? Math.floor(ms / 3600000) + ' hr ' + Math.floor(ms / 60000) % 60 + ' min' : Math.ceil(ms / 60000) + ' min') + ' left' : 'Time’s up'; }
  function homeStatus() { var n = catsOff().length; return n ? n + ' hidden' : 'All shown'; }
  // Your profile: the code to give people, and whether their games need your OK first
  function profileSheet() {
    var node = el('div', { class: 'lk' }), s;
    if (!linksOn()) { node.appendChild(el('p', { class: 'muted', text: 'Sign in with a PIN to share your profile.' })); sheet({ title: 'Share my profile', node: node, help: togetherSheet, helpLabel: 'How playing together works', actions: [{ label: 'OK', cls: 'btn-soft' }] }); return; }
    var me = lsGet('my_name', '').trim();
    if (!me) {
      // no name yet: ask for it here, then carry on to the code
      var nin = el('input', { class: 'input', maxlength: 14, placeholder: 'Your name', autocomplete: 'off', enterkeyhint: 'done' }), s0;
      function goName() {
        var v = nin.value.trim(); if (!v) { nin.focus(); return; }
        if (typeof FrequentPlayers !== 'undefined' && FrequentPlayers.setMyName) FrequentPlayers.setMyName(v); else lsSet('my_name', v);
        s0.close(); setTimeout(profileSheet, 320);
      }
      nin.addEventListener('keydown', function (e) { if (e.key === 'Enter') goName(); });
      node.appendChild(el('p', { class: 'muted', style: { margin: '0 0 10px' }, text: 'What’s your name? It’s what people see when they link you.' }));
      node.appendChild(nin);
      s0 = sheet({ title: 'Share my profile', node: node, actions: [{ label: 'Continue', primary: true, keep: true, onClick: goName }, { label: 'Cancel', cls: 'btn-ghost' }] });
      setTimeout(function () { nin.focus(); }, 300);
      return;
    }
    node.appendChild(el('p', { class: 'muted', text: 'Making your code…' }));
    // while your code is showing, someone is probably about to link you: look for their request every 3 seconds
    var peek = setInterval(function () {
      if (!document.body.contains(node)) { clearInterval(peek); return; }
      if (document.visibilityState === 'visible' && FGHSync.linkPeek) FGHSync.linkPeek();
    }, 3000);
    s = sheet({ title: 'Share my profile', node: node, help: togetherSheet, helpLabel: 'How playing together works', actions: [{ label: 'Done', cls: 'btn-soft' }], onClose: function () { clearInterval(peek); } });
    FGHSync.linkShare().then(paint).catch(function (e) { node.innerHTML = ''; node.appendChild(el('p', { class: 'muted', text: linkErr(e) })); });
    function paint(own) {
      node.innerHTML = '';
      // someone scanned your code: their request shows up here as it arrives
      var rb = el('div', { class: 'k-names lk-reqs', 'data-live': '1' });
      rb._paint = function () { rb.innerHTML = ''; reqRows(rb._paint).forEach(function (row) { rb.appendChild(row); }); rb.style.display = rb.children.length ? '' : 'none'; };
      rb._paint(); node.appendChild(rb);
      node.appendChild(el('div', { class: 'lk-top' }, [avEl(me, 'lg', 'var(--surface-3)'), el('div', null, [el('b', { text: me }), el('small', { text: 'People who link you see your avatar, and games they play with you are saved to your history.' })])]));
      node.appendChild(el('div', { class: 'lk-big', text: own.code.slice(0, 3) + ' ' + own.code.slice(3), 'aria-label': 'Your code ' + own.code.split('').join(' ') }));
      // the same link as a QR code: the other phone's camera opens it and links you in one tap
      var url = linkUrl(own.code, me), qr = el('div', { class: 'lk-qr' }, [el('div', { class: 'lk-qr-box' }), el('small', { text: 'Or point the other phone’s camera at this' })]);
      node.appendChild(qr);
      loadQr().then(function () { qr.firstChild.appendChild(qrSvg(url)); }).catch(function () { qr.remove(); });
      var txt = 'Link me in Game Night: ' + own.code + '\n' + url;
      node.appendChild(el('div', { class: 'row', style: { gap: '8px' } }, [
        el('button', { type: 'button', class: 'btn btn-soft grow', html: icon('share') + '<span>Share</span>', onclick: function () { if (navigator.share) navigator.share({ text: txt }).catch(function () {}); else copy(); } }),
        el('button', { type: 'button', class: 'btn btn-soft grow', text: 'Copy', onclick: copy })]));
      function copy() { try { navigator.clipboard.writeText(own.code).then(function () { toast('Copied'); }); } catch (e) { toast(own.code); } }
      var sw = el('input', { type: 'checkbox' }); sw.checked = !!own.ask;
      sw.addEventListener('change', function () { FGHSync.linkSetAsk(sw.checked); sfx('tap'); });
      node.appendChild(el('label', { class: 'lk-sw' }, [el('span', { class: 'grow' }, [el('b', { text: 'Ask before adding games' }), el('small', { text: 'Games others record with you wait for your OK' })]), el('span', { class: 'switch' }, [sw, el('i')])]));
      node.appendChild(el('button', { type: 'button', class: 'btn btn-ghost btn-block', text: 'Make a new code', onclick: function () {
        confirmSheet('Make a new code? Your old code stops working, so anyone who linked you will need the new one.', { ok: 'New code' }).then(function (ok) {
          if (!ok) return; node.innerHTML = ''; node.appendChild(el('p', { class: 'muted', text: 'Making a new code…' }));
          FGHSync.linkNewCode().then(paint).catch(function (e) { toast(linkErr(e)); });
        });
      } }));
    }
  }
  // A link that carries your code: scanned from the QR code or tapped in a message, it opens the home page,
  // which asks who you are in their players and links you (linkFromUrl)
  function linkUrl(code, name) { return location.origin + '/?link=' + code + '&from=' + encodeURIComponent(String(name || '').slice(0, 40)); }
  var _libs = {};
  function loadLib(file, global) {
    if (window[global]) return Promise.resolve();
    return _libs[file] || (_libs[file] = new Promise(function (res, rej) {
      var sc = doc.createElement('script'); sc.src = (location.pathname.indexOf('/games/') >= 0 ? '../' : '') + file; sc.onload = res; sc.onerror = function () { delete _libs[file]; rej(new Error(file)); }; doc.head.appendChild(sc);
    }));
  }
  function loadQr() { return loadLib('qr.js', 'qrcode'); }
  // a scanned QR code or a pasted link: the profile code in it
  function codeFromScan(text) {
    text = String(text || '').trim();
    var m = /[?&]link=([A-Za-z0-9]{6})(?:&|#|$)/.exec(text) || /^([A-Za-z0-9]{3})\s?([A-Za-z0-9]{3})$/.exec(text);
    return m ? (m[1] + (m[2] || '')).toUpperCase() : null;
  }
  // Scan someone's QR code with the camera, in the app. BarcodeDetector where the browser has it, jsQR otherwise.
  function scanSheet(name, onCode) {
    var node = el('div', { class: 'lk' }), s, stream = null, raf = 0, stopped = false, det = null;
    var video = el('video', { playsinline: 'true', muted: 'true', autoplay: 'true' }), box = el('div', { class: 'lk-scan' }, [video, el('i')]);
    var msg = el('p', { class: 'lk-msg', text: 'Point at the QR code on ' + poss(name) + ' Share my profile screen.' });
    node.appendChild(box); node.appendChild(msg);
    var cv = doc.createElement('canvas'), g = cv.getContext('2d', { willReadFrequently: true });
    function stop() { stopped = true; cancelAnimationFrame(raf); if (stream) stream.getTracks().forEach(function (t) { t.stop(); }); stream = null; }
    function found(text) {
      var code = codeFromScan(text); if (!code) return false;
      stop(); sfx('good'); haptic('success'); s.close(); onCode(code); return true;
    }
    function tick() {
      if (stopped) return;
      if (video.readyState >= 2 && video.videoWidth) {
        if (det) det.detect(video).then(function (codes) { if (codes.some(function (c) { return found(c.rawValue); })) return; raf = requestAnimationFrame(tick); }).catch(function () { raf = requestAnimationFrame(tick); });
        else {
          var sz = 480, sc = Math.max(video.videoWidth, video.videoHeight) / sz;
          cv.width = Math.round(video.videoWidth / sc); cv.height = Math.round(video.videoHeight / sc);
          g.drawImage(video, 0, 0, cv.width, cv.height);
          var r = window.jsQR(g.getImageData(0, 0, cv.width, cv.height).data, cv.width, cv.height, { inversionAttempts: 'dontInvert' });
          if (r && found(r.data)) return;
          setTimeout(function () { raf = requestAnimationFrame(tick); }, 90);
        }
      } else raf = requestAnimationFrame(tick);
    }
    s = sheet({ title: 'Scan ' + poss(name) + ' code', node: node, actions: [{ label: 'Cancel', cls: 'btn-ghost' }], onClose: stop });
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { msg.textContent = 'This browser can’t use the camera here. Type the code instead.'; return; }
    var ready = ('BarcodeDetector' in window) ? BarcodeDetector.getSupportedFormats().then(function (f) { if (f.indexOf('qr_code') >= 0) det = new BarcodeDetector({ formats: ['qr_code'] }); else return loadLib('qr-scan.js', 'jsQR'); }).catch(function () { return loadLib('qr-scan.js', 'jsQR'); }) : loadLib('qr-scan.js', 'jsQR');
    Promise.all([ready, navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 1280 } }, audio: false })]).then(function (r) {
      if (stopped) { r[1].getTracks().forEach(function (t) { t.stop(); }); return; }
      stream = r[1]; video.srcObject = stream; video.play().catch(function () {}); box.classList.add('live'); tick();
    }).catch(function (e) {
      msg.textContent = e && (e.name === 'NotAllowedError' || e.name === 'SecurityError') ? 'Camera access was turned down. Allow it in Settings, or type the code instead.' : 'Couldn’t start the camera. Type the code instead.';
    });
  }
  function qrSvg(text) {
    var q = window.qrcode(0, 'M'); q.addData(text); q.make();
    var n = q.getModuleCount(), d = '';
    for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) if (q.isDark(r, c)) d += 'M' + c + ' ' + r + 'h1v1h-1z';
    var svg = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 ' + n + ' ' + n); svg.setAttribute('shape-rendering', 'crispEdges'); svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', 'QR code of your profile link');
    var path = doc.createElementNS('http://www.w3.org/2000/svg', 'path'); path.setAttribute('d', d); path.setAttribute('fill', '#111');
    svg.appendChild(path); return svg;
  }
  // Opened the app from someone's link (?link=CODE&from=NAME): link them, as one of your players or a new one.
  // The ask waits (sessionStorage) until you're signed in with a PIN, and the URL is cleaned up straight away.
  var LINK_ASK = 'fgh_link_ask';
  function linkFromUrl() {
    var m = /[?&]link=([A-Za-z0-9]{6})(?:&|$)/.exec(location.search), ask = null;
    if (m) {
      var f = /[?&]from=([^&]*)/.exec(location.search), from = '';
      try { from = decodeURIComponent((f && f[1] || '').replace(/\+/g, ' ')).trim().slice(0, 40); } catch (e) {}
      ask = { code: m[1].toUpperCase(), from: from };
      try { sessionStorage.setItem(LINK_ASK, JSON.stringify(ask)); } catch (e) {}
      try { window.history.replaceState(null, '', location.pathname + location.hash); } catch (e) {}
    } else { try { ask = JSON.parse(sessionStorage.getItem(LINK_ASK) || 'null'); } catch (e) {} }
    if (!ask || !ask.code || doc.querySelector('.k-scrim')) return false;
    var done = function () { try { sessionStorage.removeItem(LINK_ASK); } catch (e) {} };
    if (!linksOn()) {
      sheet({ title: 'Link ' + (ask.from || 'a player'), html: '<p class="muted">' + esc(ask.from || 'Someone') + ' shared their profile with you. Sign in with a PIN first, then it links on its own.</p>', actions: [{ label: 'OK', cls: 'btn-soft' }] });
      return true;
    }
    var own = FGHSync.links().own;
    if (own && own.code === ask.code) { done(); toast('That’s your own code'); return true; }
    var from = ask.from || '', node = el('div', { class: 'lk' }), s, picked = from;
    node.appendChild(el('p', { class: 'muted', style: { margin: '0 0 10px' }, text: (from || 'Someone') + ' shared their profile with you. Which of your players is this?' }));
    var names = knownNames(), have = names.some(function (n) { return n.toLowerCase() === from.toLowerCase(); });
    if (from && !have) names.unshift(from);
    var list = el('div', { class: 'k-names lk-pick' }), btns = [];
    names.slice(0, 12).forEach(function (n) {
      var lk = FGHSync.linkOf(n), b = el('button', { type: 'button', class: 'k-name' + (lk ? ' used' : ''), disabled: !!lk, onclick: function () { picked = n; inp.value = ''; mark(); } }, [
        avMarked(n, 'var(--surface-3)'), el('span', { class: 'grow', text: n }), lk ? el('small', { class: 'k-plays', text: 'already linked' }) : (n === from && !have ? el('small', { class: 'k-plays', text: 'new' }) : null)]);
      btns.push([b, n]); list.appendChild(b);
    });
    node.appendChild(list);
    var inp = el('input', { class: 'input', maxlength: 14, placeholder: 'Or type another name', autocomplete: 'off', enterkeyhint: 'done', style: { marginTop: '10px' } });
    inp.addEventListener('input', function () { picked = inp.value.trim(); mark(); });
    node.appendChild(inp);
    var msg = el('p', { class: 'lk-msg' }); node.appendChild(msg);
    function mark() { btns.forEach(function (x) { x[0].classList.toggle('on', !!picked && x[1].toLowerCase() === picked.toLowerCase()); }); }
    mark();
    function go() {
      var name = (picked || '').trim(); if (!name) { inp.focus(); return; }
      msg.textContent = 'Linking…';
      FGHSync.linkAdd(name, ask.code).then(function (d) {
        done(); s.close(); unhide(name, true); avRefresh();
        setTimeout(function () { sentSheet(name, d.name); }, 330);
      }).catch(function (e) { msg.textContent = linkErr(e); sfx('bad'); });
    }
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') go(); });
    s = sheet({ title: 'Link ' + (from || 'a player'), node: node, actions: [{ label: 'Link', primary: true, keep: true, onClick: go }, { label: 'Not now', cls: 'btn-ghost', onClick: done }] });
    return true;
  }
  // How the ways of playing together fit: PINs, linking, one shared phone, each on their own device
  function togetherSheet() {
    sheet({ title: 'Playing together', html: '<div class="rules">' +
      '<p class="goal">There are a few ways to play with other people here. Here’s how they fit together.</p>' +
      '<h3>Your PIN</h3><p>Your PIN is your account. Sign in with it on any phone or tablet and your games, high scores and Lorcana decks are all there. You’ll need one to link players or to play Chess or Lorcana online. Playing as a guest works fine, but nothing leaves that device.</p>' +
      '<h3>Linking players</h3><ul>' +
        '<li>Your code is on this screen, with a QR code of it. Point the other phone’s camera at the QR code, tap <b>Share</b> to send the code, or just read it out.</li>' +
        '<li>To link someone, open <b>Frequent players</b> from any game’s menu, tap the link button next to their name, then scan their QR code or type their code.</li>' +
        '<li>After that, their avatar comes from their own phone, games you play together show up in both histories, and you each see the other’s best arcade scores.</li>' +
        '<li>One code is enough: when you link someone, their phone asks them first. Once they accept, it works both ways; if they decline, nothing is linked.</li></ul>' +
      '<h3>Playing on one phone</h3><p>Just pass the phone around. Pick everyone at the start, and when the game ends it’s saved here, with a copy sent to anyone you’ve linked. If someone has <b>Ask before adding games</b> turned on, they get to look it over first, and can tap <b>Not me</b> if it wasn’t them.</p>' +
      '<h3>Playing on separate phones</h3><ul>' +
        '<li><b>Chess</b> and <b>Lorcana</b>: each of you signs in with your own PIN on your own device. One opens a table, and the other joins from the list or types in its 4-letter code.</li>' +
        '<li>These don’t have to be finished in one sitting. Leave a game going for days or weeks and pick it up on any device with your PIN. The home screen lets you know when it’s your move.</li>' +
        '<li><b>Centipede</b> is played live, with 2 or 3 people at once. It works without a PIN, and friends can jump into a game that’s already going.</li>' +
        '<li>If someone you’ve linked has a table open, it shows up first with their avatar, so you don’t have to ask for the code.</li></ul>' +
      '</div>', actions: [{ label: 'Got it', primary: true }] });
  }
  // Your arcade initials: offered first (and filled in) when you make a high score; people who link you see your best scores
  function initialsSheet(onDone) {
    if (!linksOn()) { sheet({ title: 'Arcade initials', html: '<p class="muted">Sign in with a PIN to set your arcade initials.</p>', actions: [{ label: 'OK', cls: 'btn-soft' }] }); return; }
    var cur = FGHSync.initials() || lsGet('my_name', '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
    var inp = el('input', { class: 'input lk-code', maxlength: 3, value: cur, placeholder: 'ABC', autocomplete: 'off', autocorrect: 'off', autocapitalize: 'characters', spellcheck: 'false', 'aria-label': 'Your initials' });
    inp.addEventListener('input', function () { var v = inp.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3); if (v !== inp.value) inp.value = v; });
    var node = el('div', { class: 'lk' }, [el('p', { class: 'muted', style: { margin: '0 0 10px' }, text: 'Three letters for arcade high scores. They’re filled in for you when you make the board, and people who link you see your best scores on theirs.' }), inp]), s;
    function go() {
      var v = inp.value.toUpperCase().replace(/[^A-Z]/g, '');
      if (v.length < 2) { inp.focus(); toast('Two or three letters'); return; }
      FGHSync.setInitials(v); s.close(); sfx('good'); toast('Initials saved'); if (onDone) onDone(v);
    }
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') go(); });
    s = sheet({ title: 'Arcade initials', node: node, actions: [{ label: 'Save', primary: true, keep: true, onClick: go }, { label: 'Cancel', cls: 'btn-ghost' }] });
    setTimeout(function () { inp.focus(); inp.select(); }, 300);
  }

  // Someone linked you from their phone: accept (link back, under the name you choose) or decline.
  // Opened by the home screen when a request arrives, and from the row in Frequent players.
  function requestSheet(id, onDone) {
    if (!window.FGHSync || !FGHSync.linkReqs) return false;
    var r = FGHSync.linkReqs().filter(function (x) { return !id || x.id === id; })[0]; if (!r) return false;
    var s, name = r.name, av = avEl(name, 'lg', 'var(--surface-3)');
    var node = el('div', { class: 'lk' }, [
      el('div', { class: 'lk-top' }, [av, el('div', null, [el('b', { text: name }), el('small', { text: 'linked you from their phone' })])]),
      el('p', { class: 'muted', text: 'Accept and their avatar and best scores show here, and the games you play together go to both histories. Decline and nothing is linked, on either phone.' })
    ]);
    var inp = el('input', { class: 'input', maxlength: 14, value: name, autocomplete: 'off', enterkeyhint: 'done', 'aria-label': 'Their name here' });
    var hint = el('p', { class: 'lk-msg' });
    function check() {
      var v = inp.value.trim(), have = knownNames().some(function (n) { return n.toLowerCase() === v.toLowerCase(); }), lk = v && FGHSync.linkOf(v);
      hint.textContent = !v ? '' : lk && lk.code !== r.code ? 'You already have a ' + v + ' linked to someone else. Use another name.' : have ? 'Links your player ' + v : 'Adds ' + v + ' to your players';
    }
    inp.addEventListener('input', check); check();
    node.appendChild(el('label', { class: 'label', style: { display: 'block', margin: '12px 2px 4px' }, text: 'Their name here' }));
    node.appendChild(inp); node.appendChild(hint);
    // their avatar from their profile, once it loads
    FGHSync.linkReqInfo(r.code).then(function (d) {
      if (!d || !d.avatar || !d.avatar.cur) return;
      if (d.avatar.cur.k === 'photo' && d.avatar.d) { av.innerHTML = ''; av.style.background = 'none'; av.appendChild(el('img', { src: d.avatar.d, alt: '', style: { width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' } })); }
    }).catch(function () {});
    function accept() {
      var v = inp.value.trim(); if (!v) { inp.focus(); return; }
      hint.textContent = 'Linking…';
      FGHSync.linkReqAccept(r.id, v).then(function () { s.close(); sfx('good'); avRefresh(); }).catch(function (e) { hint.textContent = (e && e.message) || 'Couldn’t link'; sfx('bad'); });
    }
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') accept(); });
    s = sheet({ title: 'Link ' + name + '?', node: node, actions: [
      { label: 'Accept', primary: true, keep: true, onClick: accept },
      { label: 'Decline', cls: 'btn-ghost', onClick: function () { FGHSync.linkReqDecline(r.id).then(function () { if (onDone) onDone(); }); sfx('tap'); } }],
      onClose: function () { if (onDone) onDone(); } });
    return true;
  }
  function linkReqs() { try { return window.FGHSync && FGHSync.linkReqs ? FGHSync.linkReqs() : []; } catch (e) { return []; } }
  // rows for the requests waiting: in Frequent players and on the Share my profile screen
  function reqRows(onDone) {
    return linkReqs().map(function (r) {
      return el('button', { type: 'button', class: 'k-name k-req', onclick: function () { sfx('pop'); requestSheet(r.id, onDone); } }, [
        avEl(r.name, null, 'var(--surface-3)'),
        el('span', { class: 'grow' }, [el('span', { text: r.name }), el('small', { class: 'k-plays', text: 'wants to link with you' })]),
        el('span', { class: 'k-rev', text: 'Review' })
      ]);
    });
  }
  // Linked players: everyone you've linked to their own profile
  function linkedList() {
    if (!window.FGHSync || !FGHSync.links) return [];
    var o = FGHSync.links().others || {};
    return Object.keys(o).map(function (k) { return o[k]; }).filter(function (r) { return r && !r.off && r.code; })
      .sort(function (a, b) { return String(a.name).localeCompare(String(b.name)); });
  }
  // Every finished game in this device's history (key, list, record)
  function histEach(fn) {
    var keys = [];
    for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k && k.indexOf('gh_') === 0 && !GH_SKIP[k.slice(3)]) keys.push(k); }
    keys.forEach(function (k) {
      var list; try { list = JSON.parse(localStorage.getItem(k) || '[]'); } catch (e) { return; }
      if (!Array.isArray(list)) return;
      var changed = false;
      list.forEach(function (e, i) { if (e && typeof e === 'object' && fn(k.slice(3), e, i)) changed = true; });
      if (changed) { lsSet(k, JSON.stringify(list)); try { if (window.FGHSync && FGHSync.noteWrite) FGHSync.noteWrite(k); } catch (e) {} }
    });
  }
  // Is this person in a game (by link, or by name anywhere in the record)?
  function hasPerson(e, name, code) {
    var k = avKey(name), hit = false;
    (function walk(v) {
      if (hit || v == null) return;
      if (typeof v === 'string') { if (v.trim().toLowerCase() === k) hit = true; return; }
      if (typeof v !== 'object') return;
      if (code && v.link === code) { hit = true; return; }
      for (var x in v) { if (x === '_from') continue; if (x.trim().toLowerCase() === k) { hit = true; return; } walk(v[x]); }
    })(e);
    return hit;
  }
  function gamesWith(name, code) {
    var n = 0; histEach(function (key, e) { if (hasPerson(e, name, code)) n++; return false; }); return n;
  }
  function reEsc(t) { return String(t).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  // Swap a name everywhere in a record (values, keys, and inside text like the summary)
  function renameIn(v, from, to) {
    var re = new RegExp('(^|[^A-Za-z0-9])' + reEsc(from) + '(?![A-Za-z0-9])', 'gi');
    function fix(t) { return t.trim().toLowerCase() === from.toLowerCase() ? to : t.replace(re, function (m, a) { return a + to; }); }
    if (typeof v === 'string') return fix(v);
    if (Array.isArray(v)) { for (var i = 0; i < v.length; i++) v[i] = renameIn(v[i], from, to); return v; }
    if (v && typeof v === 'object') {
      // rebuilt in place so the keys keep their order
      var pairs = Object.keys(v).map(function (x) {
        if (x === '_id' || x === '_from' || x === 'link') return [x, v[x]];
        return [x.trim().toLowerCase() === from.toLowerCase() ? to : x, renameIn(v[x], from, to)];
      });
      Object.keys(v).forEach(function (x) { delete v[x]; });
      pairs.forEach(function (pr) { v[pr[0]] = pr[1]; });
    }
    return v;
  }
  var ANON = ['Alex', 'Sam', 'Jordan', 'Riley', 'Casey', 'Morgan', 'Quinn', 'Avery', 'Rowan', 'Skyler', 'Jesse', 'Drew', 'Blake', 'Reese', 'Parker', 'Emerson', 'Harper', 'Sage', 'Logan', 'Charlie'];
  function anonName(name) {
    var used = {}; knownNames().forEach(function (n) { used[avKey(n)] = 1; }); used[avKey(name)] = 1; used[avKey(lsGet('my_name', ''))] = 1;
    var free = ANON.filter(function (n) { return !used[avKey(n)]; });
    return free.length ? free[Math.floor(Math.random() * free.length)] : 'Player ' + (10 + Math.floor(Math.random() * 90));
  }
  function forgetName(name) {
    fpWrite(fpRead().filter(function (x) { return avKey(x) !== avKey(name); }));
    hideName(name);
  }
  // Remove a linked player, and choose what happens to the games you played with them:
  // keep them as they are, keep them under a made-up name, or delete them.
  function unlinkAsk(name, onDone) {
    var r = FGHSync.linkOf(name), code = r ? r.code : null, n = gamesWith(name, code), s;
    var games = n + (n === 1 ? ' game' : ' games');
    function done(msg) { s.close(); sfx('good'); toast(msg); avRefresh(); if (onDone) onDone(); }
    function opt(ic, t, d, fn, cls) {
      return el('button', { type: 'button', class: 'lk-opt' + (cls ? ' ' + cls : ''), onclick: fn }, [el('span', { class: 'ic', html: icon(ic) }), el('span', { class: 'grow' }, [el('b', { text: t }), el('small', { text: d })])]);
    }
    var node = el('div', { class: 'lk' }, [
      el('div', { class: 'lk-top' }, [avEl(name, 'lg', 'var(--surface-3)'), el('div', null, [el('b', { text: name }), el('small', { text: n ? games + ' with ' + name + ' in your history' : 'No games with ' + name + ' in your history' })])]),
      el('div', { class: 'lk-opts' }, [
        opt('link', 'Just unlink', 'Keep the ' + (n ? games : 'games') + ' as they are. New games stop going to ' + poss(name) + ' history.', function () {
          histEach(function (key, e) { var ch = false; (Array.isArray(e.players) ? e.players : []).forEach(function (p) { if (p && p.link === code) { delete p.link; ch = true; } }); if (ch) e._ed = Date.now(); return ch; });
          FGHSync.linkRemove(name); done('Unlinked ' + name);
        }),
        opt('user', 'Unlink and hide their name', 'Keep the games, but ' + name + ' shows as a made-up name in them.', function () {
          var nn = anonName(name);
          histEach(function (key, e) {
            if (!hasPerson(e, name, code)) return false;
            (Array.isArray(e.players) ? e.players : []).forEach(function (p) { if (p && p.link === code) delete p.link; });
            renameIn(e, name, nn); e._ed = Date.now(); return true;
          });
          FGHSync.linkRemove(name); forgetName(name); forgetName(nn); done(n ? name + ' is now ' + nn + ' in past games' : 'Unlinked ' + name);
        }),
        opt('trash', 'Unlink and delete the games', n ? 'Delete all ' + games + ' with ' + name + ' from your history, on all your devices.' : 'There are no games to delete.', function () {
          if (!n) { FGHSync.linkRemove(name); forgetName(name); return done('Unlinked ' + name); }
          confirmSheet('Delete ' + games + ' with ' + name + '?', { ok: 'Delete', danger: true, body: 'This can’t be undone.' }).then(function (ok) {
            if (!ok) return;
            var by = {}, GH = window.GameHistory;
            histEach(function (key, e) { if (hasPerson(e, name, code)) (by[key] = by[key] || []).push(GH && GH.idOf ? GH.idOf(key, e) : e._id); return false; });
            if (GH && GH.remove) GH.remove(by);
            FGHSync.linkRemove(name); forgetName(name); done('Deleted ' + games);
          });
        }, 'danger')
      ])
    ]);
    s = sheet({ title: 'Remove ' + name, node: node, actions: [{ label: 'Cancel', cls: 'btn-ghost' }] });
  }
  // The Linked players list (account menu): tap someone to see their link, or remove them
  function linkedPanel(onChange) {
    var box = el('div', { class: 'lk-people' });
    function paint() {
      box.innerHTML = '';
      var list = linkedList();
      if (!list.length) { box.appendChild(el('p', { class: 'muted lk-none', text: 'No one yet. In Frequent players, tap the link button next to someone and enter their profile code.' })); return; }
      list.forEach(function (r) {
        box.appendChild(el('div', { class: 'lk-person' }, [
          el('button', { type: 'button', class: 'lk-who', onclick: function () { linkSheet(r.name, function () { paint(); if (onChange) onChange(); }); } }, [
            avEl(r.name, null, 'var(--surface-3)'),
            el('span', { class: 'grow' }, [el('b', { text: r.name }), el('small', { text: r.gone ? 'Their code stopped working' : !r.hs ? 'Waiting for them to accept' : (r.them && avKey(r.them) !== avKey(r.name) ? 'Their profile: ' + r.them : 'Linked') })])
          ]),
          el('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Remove ' + r.name, title: 'Remove', html: icon('close'), onclick: function () { unlinkAsk(r.name, function () { paint(); if (onChange) onChange(); }); } })
        ]));
      });
    }
    paint();
    return box;
  }
  window.addEventListener('fghlinks', function () { Array.prototype.forEach.call(doc.querySelectorAll('.k-names[data-live]'), function (n) { if (n._paint) n._paint(); }); });
  // Games others recorded with you, waiting for your OK
  function reviewSheet(onDone) {
    var list = window.FGHSync && FGHSync.linkPending ? FGHSync.linkPending() : [], box = el('div', { class: 'lk-rev' }), s;
    function paint() {
      list = FGHSync.linkPending(); box.innerHTML = '';
      if (!list.length) { box.appendChild(el('p', { class: 'muted', text: 'Nothing waiting.' })); return; }
      list.forEach(function (it) {
        var g = findGameSafe(histGameId(it.key)), e = it.entry, ps = (e.players || []).map(function (p) { return p.name + (p.score != null ? ' ' + p.score : ''); }).join(' · ');
        box.appendChild(el('div', { class: 'lk-item' }, [
          el('div', { class: 'grow' }, [el('b', { text: (g ? g.name : it.key) + (e.winner ? ' · ' + e.winner + ' won' : '') }), el('small', { text: it.from + ' · ' + fmtDate(e._date || it.at) }), el('small', { text: ps })]),
          el('div', { class: 'lk-btns' }, [
            el('button', { type: 'button', class: 'btn btn-primary btn-sm', text: 'Add', onclick: function () { FGHSync.linkAccept(it.id); sfx('good'); paint(); if (onDone) onDone(); } }),
            el('button', { type: 'button', class: 'btn btn-ghost btn-sm', text: 'Not me', onclick: function () { FGHSync.linkDecline(it.id); sfx('tap'); paint(); if (onDone) onDone(); } })])]));
      });
    }
    paint();
    s = sheet({ title: 'Games to review', node: box, actions: [{ label: 'Done', cls: 'btn-soft' }] });
  }
  // History keys that aren't game ids, and synced gh_ keys that aren't game results
  var GH_GAME = { sol: 'solitaire', fc: 'freecell', ht: 'hearts', sp: 'spades', gin: 'gin-rummy', rm: 'gin-rummy', eu: 'euchre',
    wz: 'wizard', f7: 'flip7', fivecrwns: 'five-crowns', rk: 'rook', p10: 'phase10', mg: 'minigolf', dond: 'dealornodeal',
    wof: 'wheeloffortune', c4: 'connectfour', cs_sc: 'scorecard', sc: 'scorecard', mj4: 'mahjong4' };
  var GH_SKIP = { casino_ledger: 1, dedup_v1: 1 };
  function histGameId(key) { return GH_GAME[key] || key; }

  // Originals of uploaded photos stay on this device (IndexedDB), so a photo can be cropped again from the whole
  // picture; only the small cropped circle (and where it was cut from) syncs.
  var avDB = null;
  function avStore() {
    if (avDB) return avDB;
    avDB = new Promise(function (ok, no) {
      try { var rq = indexedDB.open('fgh_avatar', 1); rq.onupgradeneeded = function () { rq.result.createObjectStore('orig'); }; rq.onsuccess = function () { ok(rq.result); }; rq.onerror = function () { no(rq.error); }; } catch (e) { no(e); }
    });
    return avDB;
  }
  function avOrig(id, blob) {
    return avStore().then(function (db) { return new Promise(function (ok) {
      var tx = db.transaction('orig', blob === undefined ? 'readonly' : 'readwrite'), st = tx.objectStore('orig');
      var rq = blob === undefined ? st.get(id) : blob === null ? st.delete(id) : st.put(blob, id);
      rq.onsuccess = function () { ok(blob === undefined ? rq.result || null : true); }; rq.onerror = function () { ok(null); };
    }); }).catch(function () { return null; });
  }

  // Crop a photo to a circle: drag to move it, pinch / scroll / the slider to zoom. Hands back a small square JPEG,
  // where it was cut from ({u, v, z}: the circle's centre as a fraction of the picture, and the zoom) and, for a new
  // upload (o.keep), a sized-down copy of the whole picture to crop again later.
  function avCrop(src, done, o) {
    o = o || {};
    var url = typeof src === 'string' ? src : URL.createObjectURL(src), own = typeof src !== 'string', img = new Image();
    img.onerror = function () { if (own) URL.revokeObjectURL(url); toast('That picture couldn’t be opened'); };
    img.onload = function () {
      var W = img.naturalWidth, H = img.naturalHeight; if (!W || !H) return img.onerror();
      var ov = el('div', { class: 'av-crop', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Crop your photo' });
      var stage = el('div', { class: 'avc-stage' }), pic = el('img', { class: 'avc-img', src: url, alt: '', draggable: 'false' }), ring = el('div', { class: 'avc-ring' });
      var zoom = el('input', { type: 'range', min: '1', max: '4', step: '0.01', value: '1', 'aria-label': 'Zoom' });
      stage.appendChild(pic); stage.appendChild(ring);
      ov.appendChild(el('div', { class: 'avc-head', text: o.again ? 'Move and zoom to adjust' : 'Move and zoom to fit the circle' }));
      ov.appendChild(stage);
      ov.appendChild(el('div', { class: 'avc-zoom' }, [el('span', { html: icon('minus') }), zoom, el('span', { html: icon('plus') })]));
      var acts = el('div', { class: 'avc-acts' }, [
        el('button', { type: 'button', class: 'btn btn-ghost grow', text: 'Cancel', onclick: function () { finish(false); } }),
        el('button', { type: 'button', class: 'btn btn-primary grow', text: o.again ? 'Done' : 'Use photo', onclick: function () { finish(true); } })]);
      ov.appendChild(acts);
      doc.body.appendChild(ov);
      var S = 0, D = 0, base = 1, z = 1, x = 0, y = 0, placed = false;
      function measure() {
        var was = base;
        S = stage.clientWidth; D = S * 0.84; base = D / Math.min(W, H); pic.style.width = (W * base) + 'px'; pic.style.height = (H * base) + 'px';
        if (placed && was) { x *= base / was; y *= base / was; }   // the device turned: the same part of the picture stays in the circle
        if (!placed && o.init) { z = Math.max(1, Math.min(4, o.init.z || 1)); var sc = base * z; x = (W / 2 - o.init.u * W) * sc; y = (H / 2 - o.init.v * H) * sc; }
        placed = true; clamp(); draw();
      }
      function clamp() { var sc = base * z, mx = Math.max(0, (W * sc - D) / 2), my = Math.max(0, (H * sc - D) / 2); x = Math.max(-mx, Math.min(mx, x)); y = Math.max(-my, Math.min(my, y)); }
      function draw() { pic.style.transform = 'translate(-50%,-50%) translate(' + x + 'px,' + y + 'px) scale(' + z + ')'; zoom.value = String(z); }
      function setZ(nz) { z = Math.max(1, Math.min(4, nz)); clamp(); draw(); }
      zoom.addEventListener('input', function () { setZ(parseFloat(zoom.value) || 1); });
      stage.addEventListener('wheel', function (e) { e.preventDefault(); setZ(z * Math.exp(-e.deltaY * 0.0015)); }, { passive: false });
      var pts = {}, last = null, pinch = null;
      stage.addEventListener('pointerdown', function (e) { stage.setPointerCapture(e.pointerId); pts[e.pointerId] = { x: e.clientX, y: e.clientY }; last = { x: e.clientX, y: e.clientY }; pinch = null; });
      stage.addEventListener('pointermove', function (e) {
        if (!pts[e.pointerId]) return; pts[e.pointerId] = { x: e.clientX, y: e.clientY };
        var ids = Object.keys(pts);
        if (ids.length >= 2) {
          var a = pts[ids[0]], b = pts[ids[1]], d = Math.hypot(a.x - b.x, a.y - b.y);
          if (pinch) setZ(pinch.z * d / pinch.d); else pinch = { d: d || 1, z: z };
          return;
        }
        if (last) { x += e.clientX - last.x; y += e.clientY - last.y; clamp(); draw(); }
        last = { x: e.clientX, y: e.clientY };
      });
      function up(e) { delete pts[e.pointerId]; pinch = null; var ids = Object.keys(pts); last = ids.length ? pts[ids[0]] : null; }
      stage.addEventListener('pointerup', up); stage.addEventListener('pointercancel', up);
      window.addEventListener('resize', measure);
      requestAnimationFrame(function () { ov.classList.add('show'); measure(); });
      function finish(ok) {
        window.removeEventListener('resize', measure);
        var out = null, at = null;
        if (ok) {
          var sc = base * z, side = D / sc, cxI = W / 2 - x / sc, cyI = H / 2 - y / sc;
          var cv = el('canvas'); cv.width = cv.height = AV_PX;
          var cx = cv.getContext('2d'); cx.imageSmoothingQuality = 'high'; cx.drawImage(img, cxI - side / 2, cyI - side / 2, side, side, 0, 0, AV_PX, AV_PX);
          try { out = cv.toDataURL('image/jpeg', 0.82); } catch (e) { out = null; }
          at = { u: +(cxI / W).toFixed(4), v: +(cyI / H).toFixed(4), z: +z.toFixed(3) };
        }
        var keep = null;
        if (out && o.keep) {
          // the whole picture, at most 1600 px on its long side, for cropping again
          var k = Math.min(1, 1600 / Math.max(W, H)), kc = el('canvas'); kc.width = Math.round(W * k); kc.height = Math.round(H * k);
          kc.getContext('2d').drawImage(img, 0, 0, kc.width, kc.height);
          keep = new Promise(function (r) { try { kc.toBlob(function (b) { r(b); }, 'image/jpeg', 0.86); } catch (e) { r(null); } });
        }
        ov.classList.remove('show'); setTimeout(function () { ov.remove(); if (own) URL.revokeObjectURL(url); }, 250);
        if (out) done(out, at, keep);
      }
    };
    img.src = url;
  }

  handoff.close = function () { var c = doc.querySelector('.k-ho'); if (c) c.remove(); };

  window.Kit = {
    init: init, keepAwake: keepAwake, setup: setup, win: win, sheet: sheet, confirm: confirmSheet, toast: toast, callout: callout,
    confetti: confetti, sfx: sfx, _sounds: soundsLoaded, haptic: haptic, card: card, cardFace: cardFace, die: die, color: playerColor, el: el, esc: esc, poss: poss, icon: icon, catName: catName, avatar: { el: avEl, fill: avFill, html: avHTML, color: avColor, edit: avatarEdit, has: function (n) { return !!avRec(n); } },
    defaults: { sheet: defaultsSheet, get: setupSaved }, prefs: function () { defaultsSheet(); }, homeSheet: homeSheet, timerSheet: timerSheet, timerStatus: timerStatus, homeStatus: homeStatus, playTime: playTimeSheet, playToday: playToday, cats: catsOrdered, catOn: catOn, timer: { get: timerGet, set: timerSet }, dragGrip: dragGrip,
    initials: { of: iniOf, set: iniSet }, player: function () { return curPlayers.length === 1 ? curPlayers[0] : ''; }, players: function () { return curPlayers.slice(); },
    links: { link: linkSheet, profile: profileSheet, review: reviewSheet, fromUrl: linkFromUrl, request: requestSheet, on: linksOn, initials: initialsSheet, panel: linkedPanel, list: linkedList, remove: unlinkAsk }, histGame: histGameId, histSkip: GH_SKIP, fmtDur: fmtDur, cpuNameList: function () { return CPU_NAMES.slice(); },
    orientOk: function () { return orientOk; },
    orient: function (want, tablets) { orientGate(want, tablets); },
    theme: { list: THEME_LIST, get: themeGet, set: themeSet, name: function () { return themeRec(themeGet()).name; }, pick: themePick },
    spotifyOwns: spotifyOwns, music: spotifySheet, musicMini: spotifyMini, offline: offlineSheet, offlineTag: offlineTag,
    titleSwitch: titleSwitch, resume: resume, rules: rules, record: record, gameStart: gameStart, history: history, historyDetail: historyDetail, loadHistView: loadHistView, fmtDate: fmtDate, knownNames: knownNames, pickName: pickName, managePlayers: managePlayers, playersPanel: playersPanel, cpuNames: cpuNames, home: goHome, handoff: handoff, game: function () { return game; }
  };
  window.GN = window.GN || { _loaded: true, haptic: haptic, toast: toast, sheet: sheet, confirm: confirmSheet };
})();
