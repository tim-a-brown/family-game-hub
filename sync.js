// ==== Family Game Hub  sync.js ====
// Transparent localStorage + Firestore mirror for hi_* and gh_* keys.
// When a 4-digit PIN is active (localStorage.fgh_mode === 'pin'),
// writes mirror to Firestore pins/{pin}, and sign-in merges cloud → local.
//
// Public API on window.FGHSync:
//   mode()                     -> 'pin' | 'guest' | null
//   pin()                      -> '1234' | null
//   label()                    -> 'Brown Family' | null
//   signInWithPin(pin)         -> Promise<{isNew:bool}>
//   setLabel(str)              -> void  (saves label + schedules cloud push)
//   signOut()                  -> void
//   continueAsGuest()          -> void
//   onReady(cb)                -> called once sync completes
//   noteWrite(key)             -> call after any hi_/gh_/lorcana_ localStorage write
//   isPin()                    -> true when signed in with a PIN
//   db()                       -> Promise<firestore> (Lorcana online tables)
//
// Lorcana decks and bookmarks sync too (cloud field `lorcana`). Local keys:
//   lorcana_decks_v1 [{id,name,cards,at}]   lorcana_decks_del {id: deletedAt}
//   lorcana_marks_v1 {card: markedAt}        lorcana_marks_del {card: removedAt}
//   lorcana_art_v1 {card: [printingId, at]}  lorcana_fancy_v1 {on, at}   (card art choices)
// Player avatars sync too (cloud field `avatars`, local key fgh_avatars): {nameLowercase: {name, cur, photos, at}};
// each person goes by their own timestamp.
// Deleted game records leave tombstones (cloud `ghDel`, local fgh_gh_del {id: at}) so other devices drop them too.
// Player links (cloud `links`, local fgh_links): your profile's share code, and the people you've linked by theirs.
// A profile lives at links/{code} (name, avatar, ask, rejected) with an inbox of games other people recorded with
// you in them; your app files those under your history (or asks first) and clears the inbox.
// Each deck and each bookmark goes by its own timestamp, so edits, deletes and
// un-bookmarks on one device carry over to the others.
// Each PIN (and guest play) keeps its own space on a shared device (fgh_space, fgh_space_<id>): see switchSpace.
(function(){
  'use strict';
  var LS = window.localStorage;
  var MODE_KEY  = 'fgh_mode';
  var PIN_KEY   = 'fgh_pin';
  var LABEL_KEY = 'fgh_label';
  var PIN_RE    = /^[0-9]{4}$/;
  // PINs too easy to guess: one digit four times, straight runs up or down (wrapping 9 to 0), ABAB, AABB,
  // the keypad's middle column, and a few other favourites. About 230 of the 10,000.
  var WEAK_PINS = ['2580','0852','1004','2000','2001','2468','8642','1357','7531','1379','9731','0007','1984','1999','2020','2021','2022','2023','2024','2025','2026'];
  function weakPin(p){
    if(!PIN_RE.test(p || '')) return true;
    var d = p.split('').map(Number), up = true, dn = true;
    if(d[0] === d[1] && d[1] === d[2] && d[2] === d[3]) return true;
    for(var i = 1; i < 4; i++){ if((d[i-1] + 1) % 10 !== d[i]) up = false; if((d[i-1] + 9) % 10 !== d[i]) dn = false; }
    if(up || dn) return true;
    if(d[0] === d[2] && d[1] === d[3]) return true;
    if(d[0] === d[1] && d[2] === d[3]) return true;
    return WEAK_PINS.indexOf(p) >= 0;
  }
  var MOVED_FLAG = 'fgh_pin_moved';

  // A random PIN nobody has: not on the too-easy list, and no account under it. Each try asks the cloud whether that
  // PIN's account exists, by name only (the mask leaves every field out, so nobody's games come back with the answer).
  function pinTaken(p){
    var url = 'https://firestore.googleapis.com/v1/projects/' + firebaseConfig.projectId + '/databases/(default)/documents/pins/' + p + '?mask.fieldPaths=nofield&key=' + firebaseConfig.apiKey;
    return fetch(url, { cache: 'no-store' }).then(function(r){ if(r.status === 404) return false; if(r.ok) return true; throw new Error('PIN check failed (' + r.status + ')'); });
  }
  function randomPin(){
    var tried = {};
    function pick(){
      var a = new Uint16Array(1), p;
      for(var i = 0; i < 500; i++){
        if(window.crypto && crypto.getRandomValues) crypto.getRandomValues(a); else a[0] = Math.floor(Math.random() * 65536);
        p = ('000' + (a[0] % 10000)).slice(-4);
        if(!weakPin(p) && !tried[p]) return p;
      }
      return null;
    }
    function next(n){
      var p = pick(); if(!p || n >= 12) return Promise.reject(new Error('Couldn’t find a free PIN. Try again.'));
      tried[p] = 1;
      return pinTaken(p).then(function(taken){ return taken ? next(n + 1) : p; });
    }
    return next(0);
  }

  var firebaseConfig = {
    apiKey: "AIzaSyDmZ4AXZz1MJLiQi1sygbvigrpR5JcWkrQ",
    authDomain: "familygames-da3e5.firebaseapp.com",
    projectId: "familygames-da3e5",
    storageBucket: "familygames-da3e5.firebasestorage.app",
    messagingSenderId: "926415998661",
    appId: "1:926415998661:web:f8e56856d36af6ab202aac"
  };

  var _fb = null;
  var _readyResolvers = [];
  var _ready = false;

  function mode()  { return LS.getItem(MODE_KEY); }
  function pin()   { return LS.getItem(PIN_KEY); }
  function label() { return LS.getItem(LABEL_KEY); }
  function isPin() { return mode() === 'pin' && PIN_RE.test(pin() || ''); }

  function notifyReady(){
    _ready = true;
    _readyResolvers.forEach(function(r){ try{ r(); }catch(e){} });
    _readyResolvers = [];
  }
  function onReady(cb){ if(_ready) try{cb();}catch(e){} else _readyResolvers.push(cb); }

  // ── Activity log ──────────────────────────────────────────────────────
  // What this device did and how long it took: syncs (each step timed), sign-in, online tables, and any warning or
  // error. Kept on this device only (never synced, kept across accounts), last 400 lines. Profile menu > Activity log
  // shows it and shares it as text.
  var DLOG = 'fgh_diag_log', DLAST = 'fgh_sync_last', DMAX = 400;
  function pageName(){ try{ var m = /([^\/]+?)(?:\.html)?$/.exec(location.pathname); return (m && m[1] && m[1] !== 'index') ? m[1] : 'home'; }catch(e){ return '?'; } }
  function dlog(tag, msg){
    try{
      var a = JSON.parse(LS.getItem(DLOG) || '[]'); if(!Array.isArray(a)) a = [];
      a.push([Date.now(), pageName(), String(tag), String(msg).slice(0, 400)]);
      if(a.length > DMAX) a = a.slice(-DMAX);
      LS.setItem(DLOG, JSON.stringify(a));
    }catch(e){}
  }
  function secs(ms){ return (ms / 1000).toFixed(ms < 10000 ? 1 : 0) + ' s'; }
  function tnow(){ return (window.performance && performance.now) ? performance.now() : Date.now(); }
  // a sync from start to finish: each step's time goes in its one log line
  function runStart(what){ return { what: what, t0: tnow(), steps: [] }; }
  function timed(R, name, fn){
    var t = tnow();
    return Promise.resolve().then(fn).then(function(v){ var ms = tnow() - t; if(ms >= 50 || name !== 'cloud code') R.steps.push(name + ' ' + secs(ms)); return v; },
      function(e){ R.steps.push(name + ' failed after ' + secs(tnow() - t)); throw e; });
  }
  function runDone(R, err){
    R.done = true;
    var ms = tnow() - R.t0, em = err ? ((err && err.message) || String(err)) : '';
    dlog(err ? 'error' : 'sync', R.what + (err ? ': failed after ' : ': ') + secs(ms) + (R.steps.length ? ' (' + R.steps.join(', ') + ')' : '') + (em ? ' · ' + em : ''));
    try{ LS.setItem(DLAST, JSON.stringify({ at: Date.now(), ms: Math.round(ms), ok: !err, what: R.what, steps: R.steps, err: em || null })); }catch(e){}
  }
  // warnings and errors from any page land in the log too (ours start with a [tag])
  (function(){
    function fmt(args){ return [].slice.call(args).map(function(x){ if(x instanceof Error) return x.message || String(x); if(x && typeof x === 'object'){ try{ return (x.code ? x.code + ' ' : '') + (x.message || JSON.stringify(x)).slice(0, 160); }catch(e){ return '[object]'; } } return String(x); }).join(' '); }
    ['warn', 'error'].forEach(function(k){
      var orig = console[k]; if(!orig) return;
      console[k] = function(){ try{ dlog(k, fmt(arguments)); }catch(e){} return orig.apply(console, arguments); };
    });
    window.addEventListener('error', function(e){ dlog('error', (e.message || 'Script error') + (e.filename ? ' @ ' + String(e.filename).split('/').pop() + ':' + e.lineno : '')); });
    window.addEventListener('unhandledrejection', function(e){ var r = e.reason; dlog('error', 'Unhandled: ' + ((r && r.message) || String(r))); });
    window.addEventListener('online', function(){ dlog('net', 'Back online'); });
    window.addEventListener('offline', function(){ dlog('net', 'Went offline'); });
    var hidAt = 0;
    document.addEventListener('visibilitychange', function(){
      if(document.visibilityState === 'hidden'){ hidAt = Date.now(); return; }
      if(hidAt && Date.now() - hidAt > 60000) dlog('page', 'Back to the app after ' + Math.round((Date.now() - hidAt) / 60000) + ' min');
      hidAt = 0;
    });
    var ver = '';
    try{ if(window.caches && caches.keys) caches.keys().then(function(k){ ver = (k.filter(function(n){ return n.indexOf('game-night-') === 0; })[0] || '').replace('game-night-', ''); dlog('page', 'Opened ' + pageName() + (ver ? ' · ' + ver : '')); }, function(){ dlog('page', 'Opened ' + pageName()); }); else dlog('page', 'Opened ' + pageName()); }catch(e){}
  })();

  function loadScript(src){
    return new Promise(function(res, rej){
      var s = document.createElement('script');
      s.src = src; s.async = false;
      s.onload = res; s.onerror = function(){ rej(new Error('load '+src)); };
      document.head.appendChild(s);
    });
  }

  var _fbP = null;
  function ensureFirebase(){
    if(_fb) return Promise.resolve(_fb);
    if(_fbP) return _fbP;   // one load at a time: a second caller waits for the first
    var V = '10.12.2';
    var t0 = tnow();
    return _fbP = loadScript('https://www.gstatic.com/firebasejs/'+V+'/firebase-app-compat.js')
      .then(function(){ return loadScript('https://www.gstatic.com/firebasejs/'+V+'/firebase-firestore-compat.js'); })
      .then(function(){
        var app = firebase.initializeApp(firebaseConfig);
        var db  = firebase.firestore();
        // local testing only: talk to the Firestore emulator
        try{ if(/^(localhost|127\.0\.0\.1)$/.test(location.hostname) && LS.getItem('fgh_emu')) db.useEmulator('localhost', 8080); }catch(e){}
        _fb = { app: app, db: db };
        dlog('sync', 'Cloud code ready in ' + secs(tnow() - t0));
        return _fb;
      }, function(e){ _fbP = null; dlog('error', 'Cloud code didn’t load after ' + secs(tnow() - t0) + ': ' + ((e && e.message) || e)); throw e; });
  }

  // ── Scan localStorage ─────────────────────────────────────────────────
  function scanLocal(){
    var out = scanLocalRaw();
    // Frequent players removed before roster edits synced: carry them over (oldest possible time, so any newer
    // change on another device wins)
    var hid = lsJSON('gn_hidden_names');
    if(Array.isArray(hid) && hid.length){
      var pl = out.players && typeof out.players === 'object' ? out.players : {};
      hid.forEach(function(n){ if(typeof n === 'string' && n.trim() && !pl[n.trim().toLowerCase()]) pl[n.trim().toLowerCase()] = { n: n.trim(), t: 1, h: 1 }; });
      if(Object.keys(pl).length) out.players = pl;
    }
    return out;
  }
  function scanLocalRaw(){
    var out = { hi: {}, gh: {}, bank: null, rklists: null, favs: null, favsAt: null, lorc: scanLorc(), avatars: null, ghDel: null, links: null, players: null, prefs: scanPrefs() };
    for(var i = 0; i < LS.length; i++){
      var k = LS.key(i);
      if(!k) continue;
      if(k.indexOf('hi_') === 0){
        try{ out.hi[k.slice(3)] = JSON.parse(LS.getItem(k)) || []; }catch(e){}
      } else if(k.indexOf('gh_') === 0){
        try{ out.gh[k.slice(3)] = JSON.parse(LS.getItem(k)) || []; }catch(e){}
      } else if(k === 'casino_bank'){
        // a real $0 is a balance too (|| null used to turn it into 'no bankroll', which came back as $1,000)
        try{ var bn = parseInt(LS.getItem(k), 10); out.bank = isNaN(bn) ? null : Math.max(0, bn); }catch(e){}
      } else if(k === 'rklists'){
        // Per-PIN saved ranker lists: stored under one key, already scoped to
        // the current user since cloud docs are addressed by PIN.
        try{ out.rklists = JSON.parse(LS.getItem(k)) || null; }catch(e){}
      } else if(k === 'fav_games'){
        try{ out.favs = JSON.parse(LS.getItem(k)) || null; }catch(e){}
      } else if(k === 'fgh_gh_del'){
        try{ out.ghDel = JSON.parse(LS.getItem(k)) || null; }catch(e){}
      } else if(k === 'fgh_links'){
        try{ out.links = JSON.parse(LS.getItem(k)) || null; }catch(e){}
      } else if(k === 'fgh_avatars'){
        try{ out.avatars = JSON.parse(LS.getItem(k)) || null; }catch(e){}
      } else if(k === 'fgh_players_at'){
        try{ out.players = JSON.parse(LS.getItem(k)) || null; }catch(e){}
      } else if(k === 'fav_games_updated_at'){
        try{ out.favsAt = parseInt(LS.getItem(k)) || null; }catch(e){}
      }
    }
    return out;
  }

  // ── Preferences ───────────────────────────────────────────────────────
  // Theme, sound, music, home layout, per-game defaults and game options follow the PIN to every device (cloud
  // `prefs`). Each setting goes by when this device last saw it change (fgh_prefs_at {key: {v, at}}); settings
  // already on a device before they synced count as oldest, so the account's copy wins over them.
  var PREF_RE = /^(fgh_theme|gn_ini|gn_sound|gn_music|hs_attract|gn_cat_order|gn_setup_.+|gn_home_view|gn_spin|mazes_loupe|pinball_view|pinball_btns|pinball_quality|wordle_hard|sandlot_fast|invaders_auto|invaders_invx|invaders_invy|invaders_sticks|invaders_stick_right|jr_motion|jr_scan|jr_speed|lorc_fast|lorc_hints|lorc_sort|lorc_mat|lorc_dk_filter|fortune_mode|trivia_cats|trivia_levels|wyr_cats|hangman_cat|wordscramble_cat|wordsearch_cat|mahjong_dim|centi_opts|gn_spotify|randomtools_settings|diceroller_table|mysteries_book|[a-z0-9]+_sort|[a-z0-9]+_music)$/;
  var PREFS_AT = 'fgh_prefs_at';
  function stampPrefs(){
    var had = LS.getItem(PREFS_AT) != null, rec = lsJSON(PREFS_AT) || {}, now = had ? Date.now() : 1, changed = !had, seen = {}, i, k, v;
    for(i = 0; i < LS.length; i++){
      k = LS.key(i); if(!k || !PREF_RE.test(k)) continue;
      seen[k] = 1; v = LS.getItem(k);
      if(!rec[k] || rec[k].v !== v){ rec[k] = { v: v, at: now }; changed = true; }
    }
    Object.keys(rec).forEach(function(k){ if(!seen[k] && rec[k] && rec[k].v !== null){ rec[k] = { v: null, at: now }; changed = true; } });
    if(changed) try{ LS.setItem(PREFS_AT, JSON.stringify(rec)); }catch(e){}
    return had && changed;
  }
  function scanPrefs(){ stampPrefs(); var r = lsJSON(PREFS_AT); return r && Object.keys(r).length ? r : null; }
  // newest wins per setting; on a tie the account's copy (remote, b) wins
  function mergePrefs(a, b){
    if(!a && !b) return null;
    var out = {};
    [a || {}, b || {}].forEach(function(src){ Object.keys(src).forEach(function(k){ var r = src[k]; if(!r || typeof r !== 'object' || !PREF_RE.test(k)) return; if(!out[k] || (Number(r.at) || 0) >= (Number(out[k].at) || 0)) out[k] = { v: typeof r.v === 'string' ? r.v : null, at: Number(r.at) || 0 }; }); });
    return out;
  }
  function applyPrefs(p){
    var rec = mergePrefs(lsJSON(PREFS_AT), p), theme = LS.getItem('fgh_theme');
    Object.keys(rec).forEach(function(k){
      var v = rec[k].v;
      try{ if(v === null) LS.removeItem(k); else if(LS.getItem(k) !== v) LS.setItem(k, v); }catch(e){}
    });
    try{ LS.setItem(PREFS_AT, JSON.stringify(rec)); }catch(e){}
    if(LS.getItem('fgh_theme') !== theme) try{ if(window.Kit && Kit.theme) Kit.theme.set(LS.getItem('fgh_theme') || 'night'); }catch(e){}
  }

  // ── Lorcana decks + bookmarks ─────────────────────────────────────────
  var LORC_KEYS = { decks: 'lorcana_decks_v1', ddel: 'lorcana_decks_del', marks: 'lorcana_marks_v1', mdel: 'lorcana_marks_del', art: 'lorcana_art_v1', fancy: 'lorcana_fancy_v1' };
  function lsJSON(k){ try{ var v = LS.getItem(k); return v == null ? null : JSON.parse(v); }catch(e){ return null; } }
  function scanLorc(){
    var o = {}, any = false;
    Object.keys(LORC_KEYS).forEach(function(f){ var v = lsJSON(LORC_KEYS[f]); if(v != null) any = true; o[f] = v; });
    if(!any) return null;
    return { decks: asArray(o.decks), ddel: o.ddel || {}, marks: o.marks || {}, mdel: o.mdel || {}, art: o.art || {}, fancy: o.fancy || null };
  }
  function maxMap(a, b){
    var out = {};
    [a || {}, b || {}].forEach(function(m){ Object.keys(m).forEach(function(k){ var t = Number(m[k]) || 0; if(!(out[k] >= t)) out[k] = t; }); });
    return out;
  }
  function mergeLorc(a, b){
    if(!a && !b) return null;
    a = a || {}; b = b || {};
    var ddel = maxMap(a.ddel, b.ddel), byId = {};
    asArray(a.decks).concat(asArray(b.decks)).forEach(function(d){
      if(!d || !d.id || !d.cards) return;
      var ex = byId[d.id];
      if(!ex || (d.at || 0) > (ex.at || 0)) byId[d.id] = d;
    });
    var decks = Object.keys(byId).map(function(k){ return byId[k]; })
      .filter(function(d){ return !(ddel[d.id] >= (d.at || 0)); })
      .sort(function(x, y){ return (y.at || 0) - (x.at || 0); });
    var on = maxMap(a.marks, b.marks), off = maxMap(a.mdel, b.mdel), marks = {}, mdel = {};
    Object.keys(on).forEach(function(k){ if(!(off[k] >= on[k])) marks[k] = on[k]; });
    Object.keys(off).forEach(function(k){ if(!marks[k]) mdel[k] = off[k]; });
    // Card art choices {card: [printingId or '' for the standard art, at]} and the special-art setting {on, at}:
    // the latest change wins, card by card
    var art = {};
    [a.art || {}, b.art || {}].forEach(function(m){ Object.keys(m).forEach(function(k){ var v = m[k]; if(!Array.isArray(v)) return; if(!art[k] || (Number(v[1]) || 0) > (Number(art[k][1]) || 0)) art[k] = [String(v[0] || ''), Number(v[1]) || 0]; }); });
    var fa = a.fancy, fb = b.fancy, fancy = fa && fb ? ((fb.at || 0) > (fa.at || 0) ? fb : fa) : (fa || fb || null);
    return { decks: decks, ddel: ddel, marks: marks, mdel: mdel, art: art, fancy: fancy };
  }
  function writeLorc(l){
    if(!l) return;
    Object.keys(LORC_KEYS).forEach(function(f){ try{ LS.setItem(LORC_KEYS[f], JSON.stringify(l[f] || (f === 'decks' ? [] : f === 'fancy' ? null : {}))); }catch(e){} });
  }

  // ── Merge strategies ──────────────────────────────────────────────────
  function asArray(v){
    if(Array.isArray(v)) return v;
    if(v == null) return [];
    // Firestore can return array-like objects {0:..., 1:...} — recover those
    if(typeof v === 'object'){
      var keys = Object.keys(v);
      if(keys.length && keys.every(function(k){ return /^\d+$/.test(k); })){
        return keys.sort(function(a,b){return +a-+b;}).map(function(k){ return v[k]; });
      }
    }
    return [];
  }

  // High-score rows come in two shapes: [name, score, date] (older games,
  // Poker Squares) and {name, score, date} (arcade-hi.js). Keep both.
  function hiName(r){ return Array.isArray(r) ? r[0] : r.name; }
  function hiScore(r){ return Number(Array.isArray(r) ? r[1] : r.score) || 0; }
  function hiDate(r){ return Array.isArray(r) ? r[2] : r.date; }
  // Boards where lower is better (times, moves): listed in HI_BOARDS in games.js
  function hiIsLow(key){ try{ return typeof hiLow === 'function' && hiLow(key); }catch(e){ return false; } }
  function mergeHi(a, b, key){
    var all = asArray(a).concat(asArray(b));
    var seen = {}, low = hiIsLow(key);
    // a row whose initials were changed (was: 'CAM' or 'CAM,CJB') replaces the copy still under the old ones
    all.forEach(function(row){
      if(!row || Array.isArray(row) || typeof row !== 'object' || !row.was) return;
      String(row.was).split(',').forEach(function(w){ w = w.trim(); if(w) seen[w + '|' + hiScore(row) + '|' + (hiDate(row) || '')] = 1; });
    });
    all = all.filter(function(row){
      if(Array.isArray(row)){ if(row.length < 2 || row[1] == null) return false; }
      else if(!row || typeof row !== 'object' || row.score == null) return false;
      var k = (hiName(row)||'')+'|'+hiScore(row)+'|'+(hiDate(row)||'');
      if(seen[k]) return false; seen[k] = 1; return true;
    });
    all.sort(function(x,y){ return low ? hiScore(x) - hiScore(y) : hiScore(y) - hiScore(x); });
    return all.slice(0, 50);   // top 50 per board
  }

  function mergeGh(a, b){
    var all = asArray(a).concat(asArray(b));
    var seen = {}, out = [];
    // the same game on both sides: the copy edited last (_ed) wins, otherwise this device's
    all.forEach(function(row){
      if(!row || typeof row !== 'object') return;
      // hist.js uses _date; legacy rows may use finishedAt/date/ts
      var t = row._date || row.finishedAt || row.date || row.ts || JSON.stringify(row).slice(0,80);
      if(seen[t] != null){ if((row._ed || 0) > (out[seen[t]]._ed || 0)) out[seen[t]] = row; return; }
      seen[t] = out.length; out.push(row);
    });
    all = out;
    all.sort(function(x,y){
      var tx = x._date || x.finishedAt || x.date || x.ts || 0;
      var ty = y._date || y.finishedAt || y.date || y.ts || 0;
      return (ty > tx ? 1 : ty < tx ? -1 : 0);
    });
    return all.slice(0, 300);
  }

  // Roster edits: per name, the newest change (hide or show) wins
  function mergePlayers(a, b){
    var out = {}, any = false;
    [a || {}, b || {}].forEach(function(m){
      if(!m || typeof m !== 'object') return;
      Object.keys(m).forEach(function(k){ var r = m[k]; if(!r || typeof r !== 'object' || !r.n) return; if(!out[k] || (Number(r.t) || 0) > (Number(out[k].t) || 0)){ out[k] = { n: String(r.n), t: Number(r.t) || 0, h: r.h ? 1 : 0 }; any = true; } });
    });
    return any ? out : null;
  }
  // Apply roster edits on this device: hidden names stay hidden, added names show in Frequent players
  function applyPlayers(pl){
    if(!pl) return;
    try{ LS.setItem('fgh_players_at', JSON.stringify(pl)); }catch(e){}
    var hid = lsJSON('gn_hidden_names'); if(!Array.isArray(hid)) hid = [];
    var fp = lsJSON('frequent_players'); if(!Array.isArray(fp)) fp = [];
    Object.keys(pl).forEach(function(k){
      var r = pl[k];
      hid = hid.filter(function(x){ return String(x).toLowerCase() !== k; });
      if(r.h){ hid.push(r.n); fp = fp.filter(function(x){ return String(x).toLowerCase() !== k; }); }
      else if(!fp.some(function(x){ return String(x).toLowerCase() === k; })) fp.push(r.n);
    });
    try{ LS.setItem('gn_hidden_names', JSON.stringify(hid)); LS.setItem('frequent_players', JSON.stringify(fp)); }catch(e){}
  }

  function mergeSnapshots(local, remote){
    var out = { hi: {}, gh: {}, rklists: null, favs: null, favsAt: null };
    var keys = {};
    Object.keys(local.hi||{}).forEach(function(k){ keys[k]=1; });
    Object.keys(remote.hi||{}).forEach(function(k){ keys[k]=1; });
    Object.keys(keys).forEach(function(k){ out.hi[k] = mergeHi(local.hi&&local.hi[k], remote.hi&&remote.hi[k], k); });
    keys = {};
    Object.keys(local.gh||{}).forEach(function(k){ keys[k]=1; });
    Object.keys(remote.gh||{}).forEach(function(k){ keys[k]=1; });
    Object.keys(keys).forEach(function(k){ out.gh[k] = mergeGh(local.gh&&local.gh[k], remote.gh&&remote.gh[k]); });
    out.rklists = mergeRkLists(local.rklists, remote.rklists);
    out.lorc = mergeLorc(local.lorc, remote.lorc);
    out.avatars = mergeAvatars(local.avatars, remote.avatars);
    out.ghDel = mergeDel(local.ghDel, remote.ghDel);
    out.links = mergeLinks(local.links, remote.links);
    out.players = mergePlayers(local.players, remote.players);
    out.prefs = mergePrefs(local.prefs, remote.prefs);
    if(out.ghDel) Object.keys(out.gh).forEach(function(k){ out.gh[k] = out.gh[k].filter(function(r){ return !out.ghDel[ghId(k, r)]; }); });
    // Favorites: newest favsAt timestamp wins the whole list. This lets
    // deletions propagate — unfavoriting bumps the local timestamp, and on
    // next sync that version supersedes any stale cloud copy. Prior behavior
    // was a union which meant "once favorited, can't unfavorite via sync".
    var localFavs  = asArray(local.favs);
    var remoteFavs = asArray(remote.favs);
    var lAt = local.favsAt  || 0;
    var rAt = remote.favsAt || 0;
    if(lAt || rAt){
      if(lAt >= rAt){ out.favs = localFavs;  out.favsAt = lAt; }
      else          { out.favs = remoteFavs; out.favsAt = rAt; }
    } else if(localFavs.length || remoteFavs.length){
      // No timestamps on either side — legacy data from before this fix.
      // Fall back to union one time (so nobody loses favorites on upgrade).
      // The next write to either side will stamp a timestamp and switch to
      // timestamp-based merging from then on.
      var seen = {};
      var union = [];
      localFavs.concat(remoteFavs).forEach(function(h){
        if(typeof h !== 'string' || seen[h]) return;
        seen[h] = 1; union.push(h);
      });
      out.favs = union;
    }
    return out;
  }

  // Ranker lists are a flat collection: each list has its own id and
  // _modifiedAt timestamp. Merge by id, keeping the newer version of each.
  function mergeRkLists(a, b){
    if(!a && !b) return null;
    var byId = {};
    asArray(a && a.lists).forEach(function(l){ if(l && l.id) byId[l.id] = l; });
    asArray(b && b.lists).forEach(function(l){
      if(!l || !l.id) return;
      var ex = byId[l.id];
      if(!ex || (l._modifiedAt||0) > (ex._modifiedAt||0)){ byId[l.id] = l; }
    });
    var lists = Object.keys(byId).map(function(k){ return byId[k]; });
    return { lists: lists };
  }

  function ghId(key, r){ return (r && r._id) || (key + ':' + ((r && (r._date || r.finishedAt || r.date || r.ts)) || '')); }
  function mergeDel(a, b){
    if(!a && !b) return null;
    var out = {};
    [a || {}, b || {}].forEach(function(src){ Object.keys(src).forEach(function(k){ out[k] = Math.max(out[k] || 0, Number(src[k]) || 0); }); });
    return out;
  }
  // Links: your own profile and each linked person go by their own timestamps (an unlink is a dated tombstone)
  var LINK_KEYS = ['name', 'code', 'them', 'at', 'hs', 'bf', 'hsAt', 'off', 'gone'];
  function mergeLinks(a, b){
    if(!a && !b) return null;
    a = a || {}; b = b || {};
    var own = (a.own && b.own) ? ((a.own.at || 0) >= (b.own.at || 0) ? a.own : b.own) : (a.own || b.own || null);
    var others = {};
    // the newer wins; at the same moment a link beats an unlink (an unlink always gets its own, later time, so a tie
    // is an old 'off' left behind on a link, which older versions could leave in the cloud)
    [a.others || {}, b.others || {}].forEach(function(src){ Object.keys(src).forEach(function(k){ var r = src[k], o = others[k]; if(r && (!o || (r.at || 0) > (o.at || 0) || ((r.at || 0) === (o.at || 0) && o.off && !r.off && r.code))) others[k] = r; }); });
    var ini = (a.ini && b.ini) ? ((a.ini.at || 0) >= (b.ini.at || 0) ? a.ini : b.ini) : (a.ini || b.ini || null);
    var out = { own: own, others: others }; if(ini) out.ini = ini;
    return out;
  }
  // Avatars: each person's newest version wins (their whole record: current choice and photos)
  function mergeAvatars(a, b){
    if(!a && !b) return null;
    var out = {};
    [a || {}, b || {}].forEach(function(src){
      Object.keys(src).forEach(function(k){ var r = src[k]; if(!r || typeof r !== 'object') return; if(!out[k] || (r.at || 0) > (out[k].at || 0)) out[k] = r; });
    });
    return out;
  }
  function writeSnapshotToLocal(snap){
    Object.keys(snap.hi||{}).forEach(function(k){
      try{ LS.setItem('hi_'+k, JSON.stringify(snap.hi[k])); }catch(e){}
    });
    Object.keys(snap.gh||{}).forEach(function(k){
      try{ LS.setItem('gh_'+k, JSON.stringify(snap.gh[k])); }catch(e){}
    });
    if(snap.bank !== null && snap.bank !== undefined){
      try{ LS.setItem('casino_bank', String(snap.bank)); }catch(e){}
    }
    if(snap.rklists){
      try{ LS.setItem('rklists', JSON.stringify(snap.rklists)); }catch(e){}
    }
    if(snap.favs && Array.isArray(snap.favs)){
      try{ LS.setItem('fav_games', JSON.stringify(snap.favs)); }catch(e){}
    }
    if(snap.favsAt){
      try{ LS.setItem('fav_games_updated_at', String(snap.favsAt)); }catch(e){}
    }
    // Merge again with what's on the device right now, so a deck or bookmark
    // changed while the cloud was being read isn't overwritten
    if(snap.lorc) writeLorc(mergeLorc(snap.lorc, scanLorc()));
    if(snap.ghDel){
      var gd = mergeDel(snap.ghDel, lsJSON('fgh_gh_del'));
      try{ LS.setItem('fgh_gh_del', JSON.stringify(gd)); }catch(e){}
      // drop deleted records from every game's history on this device
      for(var gi = 0; gi < LS.length; gi++){
        var gk = LS.key(gi); if(!gk || gk.indexOf('gh_') !== 0) continue;
        var gl = lsJSON(gk); if(!Array.isArray(gl)) continue;
        var gkey = gk.slice(3), kept = gl.filter(function(r){ return !gd[ghId(gkey, r)]; });
        if(kept.length !== gl.length) try{ LS.setItem(gk, JSON.stringify(kept)); }catch(e){}
      }
    }
    if(snap.links){
      try{ LS.setItem('fgh_links', JSON.stringify(mergeLinks(snap.links, lsJSON('fgh_links')))); }catch(e){}
    }
    if(snap.players) applyPlayers(mergePlayers(snap.players, lsJSON('fgh_players_at')));
    if(snap.prefs) applyPrefs(snap.prefs);
    if(snap.avatars){
      var av = mergeAvatars(snap.avatars, lsJSON('fgh_avatars'));
      try{ LS.setItem('fgh_avatars', JSON.stringify(av)); }catch(e){}
      try{ window.dispatchEvent(new StorageEvent('storage', { key: 'fgh_avatars' })); }catch(e){}
    }
  }

  // ── Firestore sanitization ────────────────────────────────────────────────
  // Firestore:
  //   1. Does not support arrays-within-arrays (must convert inner arrays to objects)
  //   2. Rejects `undefined` values outright (replace with null or drop)
  //   3. Rejects NaN, Infinity (replace with null)
  //   4. Rejects functions / symbols (drop)
  // This recursive sanitizer handles all of the above.
  function sanitizeForFirestore(val) {
    if (val === undefined) return null;
    if (typeof val === 'number' && !isFinite(val)) return null;
    if (typeof val === 'function' || typeof val === 'symbol') return null;
    if (Array.isArray(val)) {
      return val.map(function(item) {
        if (Array.isArray(item)) {
          var obj = {};
          item.forEach(function(v, i) { obj['i'+i] = sanitizeForFirestore(v); });
          return obj;
        }
        return sanitizeForFirestore(item);
      });
    }
    if (val !== null && typeof val === 'object') {
      var out = {};
      Object.keys(val).forEach(function(k) {
        var v = sanitizeForFirestore(val[k]);
        // Skip undefined keys entirely rather than writing null —
        // Firestore tolerates both, but omitting keeps docs lean.
        if (v !== undefined) out[k] = v;
      });
      return out;
    }
    return val;
  }

  // ── Firestore hi serialization (no nested arrays) ─────────────────────────
  function hiToFirestore(hiMap){
    var out = {};
    Object.keys(hiMap).forEach(function(game){
      out[game] = (hiMap[game]||[]).map(function(row){
        return Array.isArray(row) ? {n:row[0], s:row[1], d:row[2]} : row;
      });
    });
    return out;
  }
  function hiFromFirestore(hiMap){
    var out = {};
    Object.keys(hiMap||{}).forEach(function(game){
      out[game] = asArray(hiMap[game]).map(function(row){
        // {name, score, date} rows (arcade-hi.js) are saved as they are; only [name, score, date] rows were packed
        if(Array.isArray(row) || !row || typeof row !== 'object') return row;
        return ('s' in row || 'n' in row) ? [row.n, row.s, row.d] : row;
      });
    });
    return out;
  }

  // ── Firestore IO ──────────────────────────────────────────────────────
  function cloudRef(){
    if(!isPin() || !_fb) return null;
    return _fb.db.collection('pins').doc(pin());
  }

  // Reading your account: one plain web request first. The Firebase library reads through a live connection that on
  // iPhone Safari sometimes stalls until its 30-second timeout (sign-in took half a minute); a plain request doesn't.
  // Anything wrong with it (offline, a refusal, 12 seconds without an answer) falls back to the library's read.
  function fromRest(v){
    if(!v || typeof v !== 'object') return null;
    if('stringValue' in v) return v.stringValue;
    if('integerValue' in v) return Number(v.integerValue);
    if('doubleValue' in v) return Number(v.doubleValue);
    if('booleanValue' in v) return !!v.booleanValue;
    if('nullValue' in v) return null;
    if('timestampValue' in v) return v.timestampValue;
    if('mapValue' in v){ var o = {}, f = (v.mapValue && v.mapValue.fields) || {}; Object.keys(f).forEach(function(k){ o[k] = fromRest(f[k]); }); return o; }
    if('arrayValue' in v) return ((v.arrayValue && v.arrayValue.values) || []).map(fromRest);
    return null;
  }
  function restGetPin(p){
    var ctl = typeof AbortController !== 'undefined' ? new AbortController() : null, to = ctl ? setTimeout(function(){ ctl.abort(); }, 12000) : 0;
    var url = 'https://firestore.googleapis.com/v1/projects/' + firebaseConfig.projectId + '/databases/(default)/documents/pins/' + p + '?key=' + firebaseConfig.apiKey;
    return fetch(url, { cache: 'no-store', signal: ctl ? ctl.signal : undefined }).then(function(r){
      if(r.status === 404) return { exists: false, data: function(){ return null; } };
      if(!r.ok) throw new Error('read refused (' + r.status + ')');
      return r.json().then(function(j){ var d = fromRest({ mapValue: { fields: j.fields || {} } }); return { exists: true, data: function(){ return d; } }; });
    }).then(function(x){ clearTimeout(to); return x; }, function(e){ clearTimeout(to); throw e; });
  }
  // A query as one plain web request (see restGetPin): [{ id, data }]. Used where waiting on the live connection
  // would be slow, like friends' open tables on the home screen.
  function restQuery(col, field, values, limit){
    var url = 'https://firestore.googleapis.com/v1/projects/' + firebaseConfig.projectId + '/databases/(default)/documents:runQuery?key=' + firebaseConfig.apiKey;
    var body = { structuredQuery: { from: [{ collectionId: col }], where: { fieldFilter: { field: { fieldPath: field }, op: 'IN', value: { arrayValue: { values: values.map(function(v){ return { stringValue: String(v) }; }) } } } }, limit: limit || 20 } };
    var ctl = typeof AbortController !== 'undefined' ? new AbortController() : null, to = ctl ? setTimeout(function(){ ctl.abort(); }, 8000) : 0;
    return fetch(url, { method: 'POST', cache: 'no-store', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ctl ? ctl.signal : undefined }).then(function(r){
      if(!r.ok) throw new Error('query refused (' + r.status + ')');
      return r.json();
    }).then(function(rows){
      clearTimeout(to);
      return (rows || []).filter(function(x){ return x && x.document; }).map(function(x){ return { id: x.document.name.split('/').pop(), data: fromRest({ mapValue: { fields: x.document.fields || {} } }) }; });
    }, function(e){ clearTimeout(to); throw e; });
  }
  function getPinDoc(ref){
    return restGetPin(pin()).catch(function(e){
      dlog('warn', 'Quick read failed (' + ((e && e.name === 'AbortError') ? 'no answer in 12 s' : (e && e.message) || e) + '); reading through Firebase instead');
      return ref.get();
    });
  }

  function pullCloud(){
    var ref = cloudRef(); if(!ref) return Promise.resolve({hi:{}, gh:{}, label:null, bank:null, rklists:null, favs:null, favsAt:null, lorc:null, avatars:null, ghDel:null, links:null, isNew:false});
    return getPinDoc(ref).then(function(doc){
      if(!doc.exists){
        console.log('[sync] pull: cloud doc empty (first sync)');
        return {hi:{}, gh:{}, label:null, bank:null, rklists:null, favs:null, favsAt:null, lorc:null, avatars:null, ghDel:null, links:null, isNew:true};
      }
      var d = doc.data() || {};
      var result = { hi: hiFromFirestore(d.hi||{}), gh: d.gh||{}, label: d.label||null, labelAt: d.labelAt||null, bank: typeof d.bank === 'number' && isFinite(d.bank) ? d.bank : null, rklists: d.rklists||null, favs: d.favs||null, favsAt: d.favsAt||null, lorc: d.lorcana||null, avatars: d.avatars||null, ghDel: d.ghDel||null, links: d.links||null, players: d.players||null, prefs: d.prefs||null, isNew:false, moved: !!d.moved };
      console.log('[sync] pull', {
        rklists_count: result.rklists && result.rklists.lists ? asArray(result.rklists.lists).length : 0,
        favs_count: Array.isArray(result.favs) ? result.favs.length : 'absent',
        favsAt: result.favsAt,
        hi_keys: Object.keys(result.hi||{}).length,
        gh_keys: Object.keys(result.gh||{}).length
      });
      return result;
    });
  }

  var _pushTimer = null;
  var _pushPending = false;
  function schedulePush(){
    if(!isPin()) return;
    _pushPending = true;
    if(_pushTimer) return;
    _pushTimer = setTimeout(function(){
      _pushTimer = null;
      if(!_pushPending) return;
      _pushPending = false;
      if(typeof navigator !== 'undefined' && navigator.onLine === false){
        setStatus('offline');
        return;
      }
      setStatus('syncing');
      var R = runStart('Saving changes');
      timed(R, 'cloud code', ensureFirebase).then(function(){ return timed(R, 'upload', function(){ return pushNow(); }); })
        .then(function(r){ if(r !== 'same') runDone(R); setStatus('synced'); })
        .catch(function(err){
          runDone(R, err);
          console.warn('[sync] push failed', err);
          setStatus('error', { error: (err && err.message) || String(err) });
        });
    }, 1500);
  }

  // The cloud keeps one document per PIN (1 MB at most). If it grows near that, the oldest games lose their
  // detail view (dt) in the cloud copy first; every device keeps the full detail it already has.
  function fitDoc(doc){
    try{
      var LIMIT = 850000, size = JSON.stringify(doc).length;
      if(size <= LIMIT || !doc.gh) return;
      var all = [];
      Object.keys(doc.gh).forEach(function(k){ (doc.gh[k] || []).forEach(function(e){ if(e && e.dt) all.push(e); }); });
      all.sort(function(a, b){ return (a._date || 0) - (b._date || 0); });
      for(var i = 0; i < all.length && size > LIMIT; i++){ size -= JSON.stringify(all[i].dt).length + 6; delete all[i].dt; }
      console.warn('[sync] cloud copy near its size limit: left out the detail of ' + i + ' older games');
    }catch(e){}
  }
  // ── Fewer round trips (battery and data) ─────────────────────────────
  // A full sync downloads the whole account and uploads it back. Pages opened within a minute of the last
  // full sync in this app session skip it unless something was saved since (fgh_sync_w > fgh_sync_p).
  // Uploads are skipped when they would be identical to this device's last upload for this PIN.
  var RECENT_MS = 60000, SIG_KEY = 'fgh_sync_sig', W_KEY = 'fgh_sync_w', P_KEY = 'fgh_sync_p', PULL_KEY = 'fgh_sync_pull_at';
  var SS = (function(){ try{ return window.sessionStorage; }catch(e){ return null; } })();
  function ssGet(k){ try{ return SS ? SS.getItem(k) : null; }catch(e){ return null; } }
  function ssSet(k, v){ try{ if(SS) SS.setItem(k, v); }catch(e){} }
  function markWrite(){ try{ LS.setItem(W_KEY, String(Date.now())); }catch(e){} }
  function dirtySinceLastPush(){ return (Number(LS.getItem(W_KEY)) || 0) > (Number(LS.getItem(P_KEY)) || 0); }
  function pulledRecently(){ return Date.now() - (Number(ssGet(PULL_KEY)) || 0) < RECENT_MS; }
  function stableStr(v){
    if(v === null || typeof v !== 'object') return JSON.stringify(v === undefined ? null : v);
    if(Array.isArray(v)) return '[' + v.map(stableStr).join(',') + ']';
    return '{' + Object.keys(v).sort().filter(function(k){ return v[k] !== undefined; }).map(function(k){ return JSON.stringify(k) + ':' + stableStr(v[k]); }).join(',') + '}';
  }
  function docSig(doc){
    var c = {}; Object.keys(doc).forEach(function(k){ if(k !== 'updatedAt') c[k] = doc[k]; });
    var str = pin() + '|' + stableStr(c), h1 = 0x811c9dc5, h2 = 0x2b2b2b2b;
    for(var i = 0; i < str.length; i++){ var ch = str.charCodeAt(i); h1 = Math.imul(h1 ^ ch, 16777619); h2 = Math.imul(h2 ^ ch, 2246822519); }
    return (h1 >>> 0).toString(36) + '.' + (h2 >>> 0).toString(36) + '.' + str.length;
  }

  function pushNow(opts){
    opts = opts || {};
    var ref = cloudRef(); if(!ref) return Promise.resolve();
    var pushAt = Date.now();
    var snap = scanLocal();
    var doc = {
      hi: sanitizeForFirestore(hiToFirestore(snap.hi || {})),
      gh: sanitizeForFirestore(snap.gh || {}),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    var lbl = label();
    if(lbl){ doc.label = lbl; var lat = Number(LS.getItem('fgh_label_at')) || 0; if(lat) doc.labelAt = lat; }
    if(snap.bank !== null && snap.bank !== undefined) doc.bank = snap.bank;
    // Include rklists when local has it (even empty {lists:[]} to propagate
    // "user deleted all lists"). Omit only when local never had it at all —
    // with merge:true that preserves the cloud version from other devices.
    if(snap.rklists) doc.rklists = sanitizeForFirestore(snap.rklists);
    // Same logic for favs — always include defined arrays (even empty) so
    // unfavoriting everything propagates across devices. Also include
    // favsAt timestamp so the merge layer can resolve cross-device conflicts
    // and let deletions win over stale remote copies.
    if(Array.isArray(snap.favs)){
      doc.favs = sanitizeForFirestore(snap.favs);
      doc.favsAt = snap.favsAt || Date.now();
    }
    // Lorcana decks + bookmarks: only when this device has any (merge:true keeps the cloud copy otherwise)
    if(snap.lorc) doc.lorcana = sanitizeForFirestore(snap.lorc);
    if(snap.avatars) doc.avatars = sanitizeForFirestore(snap.avatars);
    if(snap.ghDel) doc.ghDel = sanitizeForFirestore(snap.ghDel);
    if(snap.links) doc.links = sanitizeForFirestore(snap.links);
    if(snap.players) doc.players = sanitizeForFirestore(snap.players);
    if(snap.prefs) doc.prefs = sanitizeForFirestore(snap.prefs);
    console.log('[sync] push', {
      rklists_count: snap.rklists && snap.rklists.lists ? (Array.isArray(snap.rklists.lists) ? snap.rklists.lists.length : Object.keys(snap.rklists.lists).length) : 0,
      favs_count: Array.isArray(snap.favs) ? snap.favs.length : 'absent',
      hi_keys: Object.keys(snap.hi||{}).length,
      gh_keys: Object.keys(snap.gh||{}).length
    });
    fitDoc(doc);
    var sig = docSig(doc);
    if(!opts.force && sig === LS.getItem(SIG_KEY)){
      console.log('[sync] push skipped: nothing changed since this device last saved');
      try{ LS.setItem(P_KEY, String(pushAt)); }catch(e){}
      return Promise.resolve('same');
    }
    function saved(r){ try{ LS.setItem(SIG_KEY, sig); LS.setItem(P_KEY, String(pushAt)); }catch(e){} return r; }
    // merge:true means fields not in `doc` are preserved on the cloud side.
    // This prevents the race where device A has empty local for some field
    // and pushes before device B's newly-saved data lands — merge:false
    // would wipe the cloud field entirely.
    // Each linked person's entry goes up as a whole: the save merges into the cloud copy field by field, so a field
    // this device no longer has (an unlink's 'off' after linking again, a 'gone' that cleared) is removed outright
    // instead of lingering and turning the link back off on every device that loads from the cloud
    if(doc.links && doc.links.others) Object.keys(doc.links.others).forEach(function(k){
      var r = doc.links.others[k]; if(!r || typeof r !== 'object') return;
      LINK_KEYS.forEach(function(f){ if(!(f in r)) r[f] = firebase.firestore.FieldValue.delete(); });
    });
    return ref.set(doc, { merge: true }).catch(function(err){
      // Rules that don't allow `prefs` yet: save everything else
      if(doc.prefs && err && err.code === 'permission-denied'){ console.warn('[sync] cloud refused prefs; saving the rest'); delete doc.prefs; return ref.set(doc, { merge: true }); }
      throw err;
    }).catch(function(err){
      // Rules that don't allow `lorcana` yet would refuse the whole save:
      // save everything else instead of losing it
      if((doc.avatars || doc.ghDel || doc.links || doc.labelAt || doc.players) && err && err.code === 'permission-denied'){
        console.warn('[sync] cloud refused avatars/ghDel/links/labelAt/players fields; saving the rest');
        delete doc.avatars; delete doc.ghDel; delete doc.links; delete doc.labelAt; delete doc.players;
        return ref.set(doc, { merge: true }).catch(function(err2){
          if(doc.lorcana && err2 && err2.code === 'permission-denied'){ delete doc.lorcana; return ref.set(doc, { merge: true }); }
          throw err2;
        });
      }
      if(doc.lorcana && err && err.code === 'permission-denied'){
        console.warn('[sync] cloud refused lorcana field; saving the rest');
        delete doc.lorcana;
        return ref.set(doc, { merge: true });
      }
      throw err;
    }).then(saved).catch(function(err){
      if(err && err.code === 'permission-denied'){
        ref.get().then(function(d){ if(d.exists && d.data() && d.data().moved && ref.id === pin()) movedOut(); }).catch(function(){});
      }
      // Log detailed error for diagnostics
      console.error('[sync] ref.set failed', err && err.code, err && err.message, err);
      throw err;
    });
  }

  // ── Label ─────────────────────────────────────────────────────────────
  function setLabel(str){
    var trimmed = (str||'').trim();
    if(trimmed) LS.setItem(LABEL_KEY, trimmed);
    else LS.removeItem(LABEL_KEY);
    LS.setItem('fgh_label_at', String(Date.now()));   // the newest name wins on every device
    if(isPin()){ markWrite(); schedulePush(); }
  }

  // A PIN is one person's account: its label is that person's name, the same as "my name" on each device they use.
  // A name typed on this device wins (it's how older family-named PINs become personal); a device without one
  // takes the account's.
  function reconcileName(){
    if(!isPin()) return;
    var ln = (label() || '').trim(), mn = (LS.getItem('my_name') || '').trim(), at = Number(LS.getItem('fgh_label_at')) || 0;
    if(!at){ if(mn && ln !== mn){ setLabel(mn); } else if(!mn && ln){ try{ LS.setItem('my_name', ln); }catch(e){} } return; }
    if(ln && mn !== ln){ try{ LS.setItem('my_name', ln); }catch(e){} }
  }
  // The account's name from the cloud when it's newer than this device's (or this device has none)
  function takeLabel(remote){
    if(!remote.label) return;
    var mine = Number(LS.getItem('fgh_label_at')) || 0, theirs = Number(remote.labelAt) || 0;
    if(!label() || theirs > mine){ LS.setItem(LABEL_KEY, remote.label); if(theirs) LS.setItem('fgh_label_at', String(theirs)); }
  }

  // ── Entry points ──────────────────────────────────────────────────────
  function continueAsGuest(){
    switchSpace('g');
    LS.setItem(MODE_KEY, 'guest');
    LS.removeItem(PIN_KEY);
    notifyReady();
  }

  function signInWithPin(p){
    if(!PIN_RE.test(p||'')) return Promise.reject(new Error('PIN must be 4 digits'));
    if(weakPin(p)){ var we = new Error('That PIN is too easy to guess. Pick a less common one.'); we.code = 'weak'; return Promise.reject(we); }
    // this PIN's own things only: whatever else is on the device is packed away first
    switchSpace(spaceOf(p));
    LS.setItem(MODE_KEY, 'pin');
    LS.setItem(PIN_KEY, p);
    ssSet(PULL_KEY, '0');
    var R = runStart('Sign-in');
    return timed(R, 'cloud code', ensureFirebase)
      .then(function(){ return timed(R, 'download', pullCloud); })
      .then(function(remote){
        if(remote.moved){
          signOut(); LS.removeItem(STASH + spaceOf(p));
          var me = new Error('That PIN was changed. Sign in with the new one.'); me.code = 'moved'; throw me;
        }
        try{ LS.removeItem(MOVED_FLAG); }catch(e){}
        takeLabel(remote);
        if(remote.bank !== null && remote.bank !== undefined) try{ LS.setItem('casino_bank', String(remote.bank)); }catch(e){}
        var local   = scanLocal();
        var merged  = mergeSnapshots(local, remote);
        writeSnapshotToLocal(merged); reconcileName();
        // Signed in once the cloud copy is merged in. The upload of this device's copy carries on in the background
        // instead of holding the sign-in (a slow first write took sign-in to half a minute); if it doesn't finish
        // before the page changes, the next page's sync sends it (the pull mark is only set once it lands).
        runDone(R);
        var U = runStart('Upload after sign-in');
        timed(U, 'upload', function(){ return pushNow({ force: true }); }).then(function(){ runDone(U); ssSet(PULL_KEY, String(Date.now())); }, function(err){ runDone(U, err); console.warn('[sync] sign-in upload failed; the next page retries', err); });
        return {isNew: remote.isNew};
      })
      .then(function(result){ notifyReady(); return result; },
            function(err){ if(!R.done) runDone(R, err); if(isPin() && pin() === p) signOut(); throw err; });   // not signed in after all: pack it away again
  }

  // Another device changed this account's PIN: the old PIN is wiped and marked moved. Sign this device out
  // (its games stay on the device) and send it to the sign-in page, which explains what happened.
  function movedOut(){
    console.warn('[sync] this PIN was changed on another device; signing out');
    var old = curSpace();
    signOut();
    LS.removeItem(STASH + old);   // nobody can sign in with the old PIN again; its games live on under the new one
    try{ LS.setItem(MOVED_FLAG, '1'); }catch(e){}
    setStatus('idle');
    try{ if(!/\/gate\.html$/.test(location.pathname)) location.replace('/gate.html'); }catch(e){}
  }

  // Change this account's PIN: sync, copy everything to the new PIN, then wipe the old PIN and mark it moved
  // (the cloud refuses any more writes to a moved PIN, so stale devices can't refill it).
  function changePin(np){
    var op = pin();
    function fail(msg, code){ var e = new Error(msg); e.code = code; return Promise.reject(e); }
    if(!isPin()) return fail('Sign in with a PIN first.', 'signin');
    if(!PIN_RE.test(np || '')) return fail('A PIN is 4 digits.', 'format');
    if(np === op) return fail('That is already your PIN.', 'same');
    if(weakPin(np)) return fail('That PIN is too easy to guess. Pick a less common one.', 'weak');
    if(typeof navigator !== 'undefined' && navigator.onLine === false) return fail('You are offline. Connect to change your PIN.', 'offline');
    setStatus('syncing');
    var oldRef;
    return ensureFirebase()
      .then(function(){ return _fb.db.collection('pins').doc(np).get(); })
      .then(function(doc){ if(doc.exists) throw Object.assign(new Error('That PIN is taken. Pick another.'), { code: 'taken' }); })
      .then(pullCloud)
      .then(function(remote){
        if(remote.moved){ movedOut(); throw Object.assign(new Error('This PIN was already changed on another device.'), { code: 'moved' }); }
        takeLabel(remote);
        writeSnapshotToLocal(mergeSnapshots(scanLocal(), remote)); reconcileName();
        oldRef = cloudRef();
        LS.setItem(PIN_KEY, np); LS.setItem(SPACE_KEY, spaceOf(np));
        try{ LS.removeItem(SIG_KEY); }catch(e){}
        return pushNow({ force: true }).catch(function(err){ LS.setItem(PIN_KEY, op); LS.setItem(SPACE_KEY, spaceOf(op)); throw err; });
      })
      .then(function(){
        // Retire the old PIN. If the cloud rules don't allow it yet, the move still stands; the old copy stays.
        return oldRef.set({ moved: true, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }).then(function(){ return true; })
          .catch(function(err){ console.warn('[sync] could not retire the old PIN', err && err.code); return false; });
      })
      .then(function(retired){
        ssSet(PULL_KEY, String(Date.now()));
        setStatus('synced');
        try{ document.dispatchEvent(new CustomEvent('fghsync:updated')); }catch(e){}
        return { ok: true, pin: np, retired: retired };
      })
      .catch(function(err){ setStatus(_syncStatus.state === 'syncing' ? 'synced' : _syncStatus.state); throw err; });
  }

  function signOut(){
    switchSpace('g');
    LS.removeItem(MODE_KEY);
    LS.removeItem(PIN_KEY);
    LS.removeItem(LABEL_KEY);
    ssSet(PULL_KEY, '0');
  }

  // ── One device, several accounts ──────────────────────────────────────
  // Each PIN (and guest play) has its own space on the device. Signing out packs everything of that account
  // (scores, history, names, avatars, links, favourites, decks, saved games, settings, look and layout, its
  // online-table identity) into one stash key and empties the device and this session's storage; signing in
  // unpacks only that PIN's own stash before syncing with its cloud copy. So nothing from one PIN is ever merged
  // into another. Only the phone's motion-permission answers and test flags stay with the device.
  var SPACE_KEY = 'fgh_space', STASH = 'fgh_space_';
  var DEVICE_RE = /^(fgh_(mode|pin|pin_moved|emu|space(_.*)?|diag_log|sync_last)|online_transport|eightball_motion|lorc_tilt(_asked)?|firebase.*)$/;
  function spaceOf(p){ var h = 5381; p = String(p || ''); for(var i = 0; i < p.length; i++) h = ((h << 5) + h + p.charCodeAt(i)) | 0; return 'p' + (h >>> 0).toString(36); }
  function curSpace(){ return LS.getItem(SPACE_KEY) || (isPin() ? spaceOf(pin()) : 'g'); }
  function switchSpace(to){
    var from = curSpace();
    if(from === to){ try{ LS.setItem(SPACE_KEY, to); }catch(e){} return; }
    var keys = [], packed = {}, i, k;
    for(i = 0; i < LS.length; i++){ k = LS.key(i); if(k && !DEVICE_RE.test(k)) keys.push(k); }
    keys.forEach(function(k){ packed[k] = LS.getItem(k); });
    keys.forEach(function(k){ LS.removeItem(k); });
    if(keys.length){
      try{ LS.setItem(STASH + from, JSON.stringify(packed)); }
      catch(e){ console.warn('[sync] could not keep ' + from + ' on this device (storage full); its cloud copy is safe', e); }
    }
    var raw = LS.getItem(STASH + to), back = null;
    try{ back = raw ? JSON.parse(raw) : null; }catch(e){}
    LS.removeItem(STASH + to);
    if(back) Object.keys(back).forEach(function(k){ if(!DEVICE_RE.test(k) && typeof back[k] === 'string') try{ LS.setItem(k, back[k]); }catch(e){} });
    try{ LS.setItem(SPACE_KEY, to); }catch(e){}
    // this browser session's leftovers (dice log, open scorecard, map view...) belonged to the last account too
    try{ if(SS) Object.keys(SS).forEach(function(k){ if(k !== 'online_dev_override') SS.removeItem(k); }); }catch(e){}
    _pushPending = false;
  }

  // ── Sync status tracking ──────────────────────────────────────────────
  var _syncStatus = { state: 'idle', lastSync: null, error: null };
  var _statusListeners = [];
  function setStatus(state, extra){
    _syncStatus.state = state;
    if(state === 'synced') _syncStatus.lastSync = Date.now();
    if(extra && extra.error !== undefined) _syncStatus.error = extra.error;
    _statusListeners.forEach(function(fn){ try{ fn(_syncStatus); }catch(e){} });
  }
  function onStatusChange(fn){
    _statusListeners.push(fn);
    try{ fn(_syncStatus); }catch(e){}
  }
  function syncStatus(){ return _syncStatus; }

  // Force a manual sync. Returns a Promise. {soft:true} (coming back to the app): nothing to do when this session
  // synced under a minute ago and nothing was saved since, and the push only goes when the merged data changed.
  function syncNow(opts){
    opts = opts || {};
    if(!isPin()){ setStatus('idle'); return Promise.resolve({ ok:true, reason:'guest' }); }
    if(opts.soft && pulledRecently() && !dirtySinceLastPush()) return Promise.resolve({ ok:true, reason:'recent' });
    if(typeof navigator !== 'undefined' && navigator.onLine === false){
      setStatus('offline');
      return Promise.resolve({ ok:false, reason:'offline' });
    }
    setStatus('syncing');
    var R = runStart(opts.soft ? 'Sync on coming back' : 'Sync now');
    return timed(R, 'cloud code', ensureFirebase)
      .then(function(){ return timed(R, 'download', pullCloud); })
      .then(function(remote){
        if(remote.moved){ movedOut(); throw Object.assign(new Error('PIN moved'), { code: 'moved' }); }
        takeLabel(remote);
        if(remote.bank !== null && remote.bank !== undefined) try{ LS.setItem('casino_bank', String(remote.bank)); }catch(e){}
        var local  = scanLocal();
        var merged = mergeSnapshots(local, remote);
        writeSnapshotToLocal(merged); reconcileName();
        return timed(R, 'upload', function(){ return pushNow({ force: !opts.soft }); }).then(function(r){ ssSet(PULL_KEY, String(Date.now())); return r; });
      })
      .then(function(){
        runDone(R);
        setStatus('synced');
        try{ document.dispatchEvent(new CustomEvent('fghsync:updated')); }catch(e){}
        linkPoll(!opts.soft);
        return { ok: true };
      })
      .catch(function(err){
        runDone(R, err);
        console.warn('[sync] syncNow failed', err);
        setStatus('error', { error: (err && err.message) || String(err) });
        return { ok: false, error: err };
      });
  }

  function noteWrite(key){
    if(/\/games\//.test(location.pathname) && /[?&]defaults=1(&|$)/.test(location.search)) return;
    if(!key) return;
    if(key.indexOf('hi_') !== 0 && key.indexOf('gh_') !== 0 && key.indexOf('lorcana_decks') !== 0 && key.indexOf('lorcana_marks') !== 0 && key.indexOf('lorcana_art') !== 0 && key.indexOf('lorcana_fancy') !== 0 && key !== 'fgh_avatars' && key !== 'fgh_players_at' && key !== 'fgh_gh_del' && key !== 'fgh_links' && key !== 'casino_bank' && key !== 'rklists' && key !== 'fav_games' && !(PREF_RE.test(key) && stampPrefs())) return;
    if(isPin()){ markWrite(); schedulePush(); }
    // the bankroll on your link profile follows casino_bank (a few seconds after it settles)
    if(key === 'casino_bank' && isPin()){ clearTimeout(_bankPubT); _bankPubT = setTimeout(function(){ var l = linksGet(); if(l.own && l.own.code && LS.getItem('fgh_link_pub') !== pubSig()) linkPublish(); }, 5000); }
  }
  var _bankPubT = null;

  // ── Diagnostic APIs ───────────────────────────────────────────────────
  // Returns the raw Firestore document for the current PIN without merging.
  function pullCloudRaw(){
    if(!isPin()) return Promise.resolve({error:'Not signed in with PIN'});
    return ensureFirebase().then(function(){
      var ref = cloudRef();
      if(!ref) return {error:'No cloud ref'};
      return ref.get().then(function(doc){
        if(!doc.exists) return {exists:false, data:null};
        return {exists:true, data:doc.data()};
      });
    }).catch(function(err){
      return {error:(err && err.message) || String(err)};
    });
  }

  // Pulls cloud data and writes it directly to local, overwriting
  // whatever was there (no merge). Useful for "reset local from cloud".
  function forceOverwriteLocal(){
    if(!isPin()) return Promise.resolve({ok:false, reason:'Not signed in'});
    setStatus('syncing');
    return ensureFirebase()
      .then(pullCloud)
      .then(function(remote){
        // Clear existing hi_/gh_/rklists/fav_games, then write fresh from cloud
        var keysToRemove = [];
        for(var i = 0; i < LS.length; i++){
          var k = LS.key(i);
          if(k && (k.indexOf('hi_') === 0 || k.indexOf('gh_') === 0 ||
                   k === 'rklists' || k === 'fav_games' || k === 'casino_bank')){
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach(function(k){ LS.removeItem(k); });
        if(remote.label) LS.setItem(LABEL_KEY, remote.label);
        writeSnapshotToLocal({
          hi: remote.hi || {},
          gh: remote.gh || {},
          bank: remote.bank,
          rklists: remote.rklists,
          favs: remote.favs,
          lorc: remote.lorc ? mergeLorc(remote.lorc, null) : null,
          avatars: remote.avatars,
          ghDel: remote.ghDel,
          links: remote.links
        });
        setStatus('synced');
        try{ document.dispatchEvent(new CustomEvent('fghsync:updated')); }catch(e){}
        return {ok:true};
      })
      .catch(function(err){
        console.warn('[sync] forceOverwriteLocal failed', err);
        setStatus('error', { error: (err && err.message) || String(err) });
        return {ok:false, error:err};
      });
  }

  // Pushes local state to cloud, overwriting whatever was there.
  function forceOverwriteCloud(){
    if(!isPin()) return Promise.resolve({ok:false, reason:'Not signed in'});
    setStatus('syncing');
    return ensureFirebase()
      .then(pushNow)
      .then(function(){
        setStatus('synced');
        return {ok:true};
      })
      .catch(function(err){
        console.warn('[sync] forceOverwriteCloud failed', err);
        setStatus('error', { error: (err && err.message) || String(err) });
        return {ok:false, error:err};
      });
  }

  // ── Bootstrap ─────────────────────────────────────────────────────────
  function boot(){
    // a page opened to edit a game's defaults (?defaults=1) changes nothing but that game's setup: no sync
    if(/\/games\//.test(location.pathname) && /[?&]defaults=1(&|$)/.test(location.search)){ notifyReady(); return; }
    var m = mode();
    if(m === 'pin' && PIN_RE.test(pin()||'') && stampPrefs()) markWrite();   // settings changed since the last sync
    if(m === 'pin' && PIN_RE.test(pin()||'')){
      if(typeof navigator !== 'undefined' && navigator.onLine === false){
        setStatus('offline');
        notifyReady();
        return;
      }
      if(pulledRecently() && !dirtySinceLastPush()){
        // Synced moments ago on another page of this session and nothing saved since: no round trip needed
        console.log('[sync] boot: synced under a minute ago, nothing new; skipping the round trip');
        setStatus('synced');
        try{ tagOldScores(); }catch(e){}
        notifyReady();
        linkPoll(true);   // games and link notes sent to you still get picked up on this page
        return;
      }
      setStatus('syncing');
      var R = runStart('Sync on opening ' + pageName());
      timed(R, 'cloud code', ensureFirebase)
        .then(function(){ return timed(R, 'download', pullCloud); })
        .then(function(remote){
          if(remote.moved){ movedOut(); throw Object.assign(new Error('PIN moved'), { code: 'moved' }); }
          takeLabel(remote);
          if(remote.bank !== null && remote.bank !== undefined) try{ LS.setItem('casino_bank', String(remote.bank)); }catch(e){}
          var local  = scanLocal();
          var merged = mergeSnapshots(local, remote);
          writeSnapshotToLocal(merged); reconcileName();
          try{ tagOldScores(); }catch(e){}
          return timed(R, 'upload', function(){ return pushNow(); });
        })
        .then(function(){
          runDone(R);
          ssSet(PULL_KEY, String(Date.now()));   // only once the round trip finished; a failed one is retried on the next page
          setStatus('synced');
          try{ document.dispatchEvent(new CustomEvent('fghsync:updated')); }catch(e){}
          notifyReady();
          linkPoll(true);
        })
        .catch(function(err){
          runDone(R, err);
          console.warn('[sync] boot failed; staying local', err);
          setStatus('error', { error: (err && err.message) || String(err) });
          notifyReady();
        });
    } else {
      try{ tagOldScores(); }catch(e){}   // guests too: their own boards
      setStatus('idle');
      notifyReady();
    }
  }

  // Listen for browser online/offline events — auto re-sync on reconnect
  if(typeof window !== 'undefined'){
    window.addEventListener('online', function(){
      if(_syncStatus.state === 'offline' || _syncStatus.state === 'error'){
        syncNow();
      }
    });
    window.addEventListener('offline', function(){
      setStatus('offline');
    });
    // settings a game saved straight to the device: send them when the app goes to the background
    document.addEventListener('visibilitychange', function(){
      if(document.visibilityState === 'hidden' && isPin() && !(/\/games\//.test(location.pathname) && /[?&]defaults=1(&|$)/.test(location.search)) && stampPrefs()){ markWrite(); schedulePush(); }
    });
  }


  // ── Player links ──────────────────────────────────────────────────────
  // Your profile: a share code (links/{code}) with your name and avatar. Someone who links you by that code sees your
  // avatar, and games they record with you in them land in its inbox; your app files them under your history
  // (or holds them for you to review when "Ask before adding" is on). "Not me" adds a game's id to the profile's
  // rejected list, which the sender's app reads to stop counting it as yours.
  var CODE_AB = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', CODE_RE = /^[A-HJ-NP-Z2-9]{6}$/;
  var OUTBOX = 'fgh_link_outbox';   // games waiting to be sent (this device only)
  var _pending = [], _reqs = [], _linkBusy = false, _lastPoll = 0, _pollAgain = false;
  function genCode(){ var c = ''; for(var i = 0; i < 6; i++) c += CODE_AB.charAt(Math.floor(Math.random() * CODE_AB.length)); return c; }
  function linksGet(){ var l = lsJSON('fgh_links') || {}, o = { own: l.own || null, others: l.others || {} }; if(l.ini) o.ini = l.ini; return o; }
  function linksSet(l){ try{ LS.setItem('fgh_links', JSON.stringify(l)); }catch(e){} noteWrite('fgh_links'); linkEvent(); setTimeout(pendWatch, 0); }
  function linkEvent(linked, acc){ try{ window.dispatchEvent(new CustomEvent('fghlinks', { detail: { pending: _pending.length, linked: linked || [], accepted: acc || [], requests: _reqs.length } })); }catch(e){} }
  function myName(){ return (LS.getItem('my_name') || '').trim(); }
  function lk(n){ return String(n || '').trim().toLowerCase(); }
  function linkCol(){ return _fb.db.collection('links'); }
  function myAvatar(){
    var all = lsJSON('fgh_avatars') || {}, r = all[lk(myName())];
    if(!r || !r.cur) return null;
    var out = { cur: r.cur };
    if(r.cur.k === 'photo'){ var ph = (r.photos || []).filter(function(x){ return x.id === r.cur.id; })[0]; if(ph) out.d = ph.d; else return null; }
    return out;
  }
  // Your arcade initials (3 letters), kept with your links so they follow your PIN
  function myInitials(){ var l = linksGet(); return l.ini && /^[A-Z]{1,3}$/.test(l.ini.v || '') ? l.ini.v : ''; }
  function setInitials(v){
    v = String(v || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
    var was = myInitials();
    var l = linksGet(); l.ini = { v: v, at: Date.now() }; linksSet(l);
    if(was && v && was !== v) renameIni(was, v, lk(myName()));
    try{ tagOldScores(); }catch(e){}
    linkPublishSoon();
    return v;
  }
  // Someone's initials changed: their scores on this device's leaderboards follow. A row tagged with who it
  // belongs to (p) moves only for that person; an older untagged row moves when nobody else uses those initials.
  // The row keeps the old initials in `was`, so a copy still under them (another device, the cloud) is dropped
  // when boards merge instead of coming back as a duplicate.
  function iniClean(v){ return String(v || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3); }
  function iniTakenBy(ini, who){
    if(!ini) return false;
    var me = lk(myName());
    if(me && me !== who && myInitials() === ini) return true;
    var m = lsJSON('gn_ini') || {}, c = lsJSON(LHI) || {};
    return Object.keys(m).some(function(k){ return k !== who && iniClean(m[k]) === ini; }) ||
      Object.keys(c).some(function(k){ return k !== who && c[k] && iniClean(c[k].ini) === ini; });
  }
  // Old scores (saved before scores remembered their player): give each one its player when exactly one person
  // uses those initials (you, someone linked, or a frequent player with saved initials). Shared or unknown
  // initials stay as they are. Runs on every sync and whenever initials change, so more match as initials fill in.
  function tagOldScores(){
    var who = {}, me = lk(myName());
    function add(ini, k){ ini = iniClean(ini); if(ini.length < 2 || !k) return; (who[ini] = who[ini] || {})[k] = 1; }
    if(me) add(myInitials(), me);
    var m = lsJSON('gn_ini') || {}, c = lsJSON(LHI) || {}, L = linksGet().others || {};
    Object.keys(m).forEach(function(k){ add(m[k], k); });
    Object.keys(c).forEach(function(k){ var r = L[k]; if(r && !r.off && r.hs) add(c[k] && c[k].ini, k); });
    var n = 0;
    for(var i = 0; i < LS.length; i++){
      var key = LS.key(i); if(!key || key.indexOf('hi_') !== 0) continue;
      var list = lsJSON(key); if(!Array.isArray(list)) continue;
      var ch = false;
      list.forEach(function(row){
        if(!row || Array.isArray(row) || typeof row !== 'object' || row.p) return;
        var ks = who[iniClean(row.name)]; if(!ks) return;
        var only = Object.keys(ks); if(only.length !== 1) return;
        row.p = only[0]; ch = true; n++;
      });
      if(ch){ try{ LS.setItem(key, JSON.stringify(list)); }catch(e){} noteWrite(key); }
    }
    return n;
  }
  function renameIni(from, to, who){
    from = iniClean(from); to = iniClean(to); who = lk(who);
    if(!from || !to || from === to || to.length < 2) return 0;
    var shared = iniTakenBy(from, who), n = 0;
    for(var i = 0; i < LS.length; i++){
      var k = LS.key(i); if(!k || k.indexOf('hi_') !== 0) continue;
      var list = lsJSON(k); if(!Array.isArray(list)) continue;
      var ch = false;
      list.forEach(function(row){
        if(!row || Array.isArray(row) || typeof row !== 'object') return;
        if(String(row.name || '').trim().toUpperCase() !== from) return;
        if(row.p ? row.p !== who : (shared || !who)) return;
        row.was = row.was ? row.was + ',' + from : from;
        row.name = (to + '   ').slice(0, 3); if(who) row.p = who;
        ch = true; n++;
      });
      if(ch){ try{ LS.setItem(k, JSON.stringify(list)); }catch(e){} noteWrite(k); }
    }
    if(n) try{ window.dispatchEvent(new CustomEvent('fghinitials', { detail: { from: from, to: to, who: who, n: n } })); }catch(e){}
    return n;
  }
  // Your best arcade scores (entries under your initials), top 5 per game, for the people who link you.
  // Boards where lower is better (puzzle times and moves, HI_BOARDS in games.js) publish your lowest 5.
  function myHi(){
    var ini = myInitials(), me = lk(myName()), out = {}; if(!ini) return out;
    for(var i = 0; i < LS.length; i++){
      var k = LS.key(i); if(!k || k.indexOf('hi_') !== 0) continue;
      var list = lsJSON(k); if(!Array.isArray(list)) continue;
      var low = hiIsLow(k.slice(3));
      var mine = list.filter(function(e){ return e && (e.p ? e.p === me : String(e.name || '').trim().toUpperCase() === ini) && isFinite(Number(e.score)) && e.score !== null && e.score !== ''; })
        .map(function(e){ return { s: Number(e.score), d: String(e.date || '').slice(0, 24) }; })
        .sort(function(a, b){ return low ? a.s - b.s : b.s - a.s; }).slice(0, 5);
      if(mine.length) out[k.slice(3)] = mine;
    }
    return out;
  }
  function hiSig(){ return myInitials() + '|' + JSON.stringify(myHi()); }
  // Your casino bankroll in whole dollars (a missing bank starts at $1,000, like casino.js), published so the
  // people who link you can bring it to their table
  function myBank(){ var v = LS.getItem('casino_bank'); if(v === null || v === '') return 1000; var n = parseInt(v, 10); return isNaN(n) ? 1000 : Math.max(0, n); }
  function pubSig(){ return hiSig() + '|' + myBank(); }
  // Linked people's initials, scores and casino bankroll, as last read from their profiles (this device only)
  var LHI = 'fgh_link_hi';
  // A linked person's casino bankroll: {bank, at, code, them}, or null (not linked, or never published).
  // It's what they last published, plus what they won or lost at this device's tables since then (their device
  // applies those when it files the game, then publishes again), so playing again right away starts where they left off.
  var LBP = 'fgh_link_bankpend';
  function linkBank(name){
    var r = linkOf(name); if(!r) return null;
    var x = (lsJSON(LHI) || {})[lk(name)];
    if(!x || x.code !== r.code || typeof x.bank !== 'number') return null;
    var at = x.bankAt || 0, add = 0;
    ((lsJSON(LBP) || {})[r.code] || []).forEach(function(p){ if(p && p.at > at) add += Number(p.d) || 0; });
    return { bank: Math.max(0, x.bank + add), at: at, code: r.code, them: r.them || r.name };
  }
  // A game sent with bankroll changes in it (bk, see tableDelta): remember them until that person publishes again
  function bankPending(e){
    if(!e || !e.bk || typeof e.bk !== 'object' || !Array.isArray(e.players)) return;
    var all = lsJSON(LBP) || {}, now = Date.now(), any = false;
    e.players.forEach(function(p, i){
      var b = e.bk[i]; if(!p || !p.link || !b || b.c !== p.link) return;
      var d = Math.round(Number(b.e) - Number(b.s)); if(!d || !isFinite(d)) return;
      var list = (all[p.link] || []).filter(function(x){ return x && x.id !== e._id && now - x.at < 30 * 864e5; });
      list.push({ id: e._id, d: d, at: now }); all[p.link] = list.slice(-50); any = true;
    });
    if(any) try{ LS.setItem(LBP, JSON.stringify(all)); }catch(err){}
  }
  function bankPendingDrop(code, at){
    var all = lsJSON(LBP); if(!all || !all[code]) return;
    var list = all[code].filter(function(x){ return x && x.at > at; });
    if(list.length === all[code].length) return;
    if(list.length) all[code] = list; else delete all[code];
    try{ LS.setItem(LBP, JSON.stringify(all)); }catch(err){}
  }
  function linkHi(key){
    var c = lsJSON(LHI) || {}, l = linksGet(), out = [];
    Object.keys(c).forEach(function(k){
      var r = l.others[k], x = c[k]; if(!r || r.off || !r.code || !r.hs || r.code !== x.code) return;
      ((x.hi || {})[key] || []).forEach(function(e){ out.push({ who: r.name, ini: x.ini || '', score: Number(e.s) || 0, date: e.d || '' }); });
    });
    return out;
  }
  function needPin(){ return isPin() ? ensureFirebase() : Promise.reject(new Error('Sign in with a PIN to link players')); }
  // Your profile's code (made the first time)
  function linkShare(){
    return needPin().then(function(){
      var l = linksGet();
      if(l.own && l.own.code) return linkPublish().then(function(){ return l.own; });
      if(!myName()) throw new Error('Set your name first');
      var tries = 0;
      function attempt(){
        var code = genCode();
        return linkCol().doc(code).get().then(function(d){
          if(d.exists){ if(++tries > 5) throw new Error('Try again'); return attempt(); }
          var own = { code: code, name: myName(), ask: false, at: Date.now() };
          return linkCol().doc(code).set({ name: own.name, avatar: myAvatar(), ask: false, rejected: [], at: own.at })
            .then(function(){ l.own = own; linksSet(l); if(_watchOn) watchApply(true); return linkPublish().then(function(){ return own; }); });
        });
      }
      return attempt();
    });
  }
  // Keep your profile's name and avatar current
  var _pubT = null;
  function linkPublish(){
    var l = linksGet(); if(!l.own || !isPin()) return Promise.resolve();
    return ensureFirebase().then(function(){
      var doc = { name: myName() || l.own.name, avatar: myAvatar(), ask: !!l.own.ask, at: Date.now(), ini: myInitials(), hi: myHi(), bank: myBank() }, sig = pubSig();
      function put(){ return linkCol().doc(l.own.code).set(doc, { merge: true }); }
      function denied(e){ if(!e || e.code !== 'permission-denied') throw e; }
      return put().then(function(){ try{ LS.setItem('fgh_link_pub', sig); }catch(e){} }).catch(function(e){
        denied(e); delete doc.bank;   // cloud rules not updated yet
        return put().catch(function(e2){ denied(e2); delete doc.ini; delete doc.hi; return put(); });
      });
    }).catch(function(e){ console.warn('[links] publish failed', e); });
  }
  function linkPublishSoon(){ clearTimeout(_pubT); _pubT = setTimeout(linkPublish, 800); }
  function linkSetAsk(on){
    var l = linksGet(); if(!l.own) return Promise.resolve();
    l.own.ask = !!on; l.own.at = Date.now(); linksSet(l);
    return linkPublish();
  }
  // A new code: the old one stops working (games waiting in its inbox move across)
  function linkNewCode(){
    return needPin().then(function(){
      var l = linksGet(), old = l.own && l.own.code;
      l.own = null; linksSet(l);
      return linkShare().then(function(own){
        if(!old) return own;
        var oldRef = linkCol().doc(old);
        return oldRef.collection('inbox').limit(100).get().then(function(q){
          return Promise.all(q.docs.map(function(d){ return linkCol().doc(own.code).collection('inbox').doc(d.id).set(d.data()).then(function(){ return d.ref.delete(); }); }));
        }).then(function(){ return oldRef.delete(); }).catch(function(e){ console.warn('[links] old code cleanup', e); }).then(function(){ return own; });
      });
    });
  }
  // Link a frequent player to someone's profile by their code
  function linkAdd(name, code){
    code = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if(!CODE_RE.test(code)) return Promise.reject(new Error('Codes are 6 letters and numbers'));
    return needPin().then(function(){
      var l = linksGet();
      if(l.own && l.own.code === code) throw new Error('That’s your own code');
      return linkCol().doc(code).get().then(function(d){
        if(!d.exists) throw new Error('No profile has that code');
        var data = d.data() || {};
        l.others[lk(name)] = { name: String(name).trim(), code: code, them: data.name || '', at: Date.now() };
        linksSet(l); linkNotes();   // pending until they accept: their avatar and your past games wait for that
        return data;
      });
    });
  }
  function linkRemove(name){
    var l = linksGet(), k = lk(name), had = l.others[k];
    l.others[k] = { name: String(name).trim(), off: true, at: Date.now() }; linksSet(l);
    var all = lsJSON('fgh_avatars') || {};
    if(had && all[k] && all[k].linked){ all[k] = { name: all[k].name, cur: null, photos: [], at: Date.now() }; writeAvatars(all); }
  }
  // Take back a request they haven't answered: it leaves their inbox, and nothing is linked
  function linkCancel(name){
    var r = linkOf(name), own = linksGet().own;
    linkRemove(name);
    if(!r || r.hs || !own || !own.code) return Promise.resolve();
    return ensureFirebase().then(function(){ return linkCol().doc(r.code).collection('inbox').doc(noteId('ask', own.code)).delete(); })
      .catch(function(e){ console.warn('[links] cancel', e); });
  }
  function linkOf(name){ var r = linksGet().others[lk(name)]; return r && !r.off && r.code ? r : null; }
  // accepted by both sides: the only kind games are sent to and profiles read from
  function linkOk(name){ var r = linkOf(name); return r && r.hs ? r : null; }
  function setHs(code){
    var L = linksGet(), hit = [];
    Object.keys(L.others).forEach(function(k){ var r = L.others[k]; if(r && !r.off && r.code === code && !r.hs){ r.hs = 1; r.at = Date.now(); hit.push(r.name); } });
    if(hit.length) linksSet(L);
    return hit;
  }
  function writeAvatars(all){
    try{ LS.setItem('fgh_avatars', JSON.stringify(all)); }catch(e){}
    noteWrite('fgh_avatars');
    try{ window.dispatchEvent(new StorageEvent('storage', { key: 'fgh_avatars' })); }catch(e){}
  }
  // A linked person's avatar comes from their profile (read-only here)
  function applyAvatar(name, code, data){
    var all = lsJSON('fgh_avatars') || {}, k = lk(name), cur = all[k], av = data.avatar;
    var stamp = Number(data.at) || 0;
    // their profile's time moves with every score or bankroll change: rewrite (and sync) only when the avatar itself changed
    var sig = av && av.cur ? [av.cur.k, av.cur.i || '', av.cur.c || '', av.d ? av.d.length + ':' + av.d.slice(-48) : ''].join('|') : 'none';
    if(cur && cur.linked === code && (cur.sig === sig || cur.at === stamp)) return;
    if(!av || !av.cur){ if(cur && cur.linked){ all[k] = { name: name, cur: null, photos: [], linked: code, at: stamp, sig: sig }; writeAvatars(all); } return; }
    var rec = { name: String(name).trim(), linked: code, at: stamp, photos: [], sig: sig };
    if(av.cur.k === 'photo' && av.d){ rec.photos = [{ id: 'link', d: av.d, at: stamp }]; rec.cur = { k: 'photo', id: 'link' }; }
    else rec.cur = { k: av.cur.k, i: av.cur.i, c: av.cur.c };
    all[k] = rec; writeAvatars(all);
  }
  // Mark the players in a new record who are linked to someone's profile
  function linkMark(e){
    (e && Array.isArray(e.players) ? e.players : []).forEach(function(p){
      if(!p || typeof p !== 'object' || p.cpu) return;
      var r = linkOk(p.name); if(r) p.link = r.code;
    });
  }
  function outbox(){ var o = lsJSON(OUTBOX); return Array.isArray(o) ? o : []; }
  // Send a finished game to everyone linked in it
  // Outbox items: a whole game (sent as recorded), or for past games just where to find it ({ref:1, n: name}),
  // so a long backlog stays small on the device
  function saveOutbox(ob){
    var full = ob.filter(function(it){ return !it.ref; }).slice(-200), refs = ob.filter(function(it){ return it.ref; }).slice(-5000);
    try{ LS.setItem(OUTBOX, JSON.stringify(refs.concat(full))); }catch(e){}
  }
  function linkSend(key, e){
    var codes = {};
    (e.players || []).forEach(function(p){ if(p && p.link) codes[p.link] = 1; });
    var list = Object.keys(codes); if(!list.length) return;
    try{ bankPending(e); }catch(err){}
    var ob = outbox();
    list.forEach(function(code){ ob.push({ code: code, id: e._id, key: key, entry: JSON.stringify(e), from: label() || myName() || 'Someone', by: myName() || '', at: Date.now() }); });
    saveOutbox(ob);
    flushOutbox();
  }
  // Link someone after the fact: every past game with them in it goes to their history too (games they already
  // have, deleted, or said "Not me" to are skipped). opts.all sends ones marked before again.
  function linkBackfill(name, code, opts){
    opts = opts || {};
    var k = lk(name), n = 0, ob = outbox(), seen = {}, keys = [], rej = {};
    (opts.rejected || []).forEach(function(id){ rej[id] = 1; });
    ob.forEach(function(it){ seen[it.code + '|' + it.id] = 1; });
    try{ for(var i = 0; i < LS.length; i++){ var kk = LS.key(i); if(kk && kk.indexOf('gh_') === 0 && kk !== 'gh_dedup_v1') keys.push(kk); } }catch(e){}
    keys.forEach(function(kk){
      var list; try{ list = JSON.parse(LS.getItem(kk)); }catch(e){ return; }
      if(!Array.isArray(list)) return;
      var gk = kk.slice(3), changed = false;
      list.forEach(function(e){
        if(!e || typeof e !== 'object' || e._from || !Array.isArray(e.players)) return;
        var hit = false, had = false;
        e.players.forEach(function(p){
          if(typeof p === 'string'){ if(lk(p) === k) hit = true; return; }
          if(!p || typeof p !== 'object' || p.cpu || lk(p.name) !== k) return;
          hit = true; if(p.link === code) had = true; else { p.link = code; changed = true; }
        });
        if(!hit) return;
        // an older record without an id gets one now (the same on every device), so it can be sent and said "Not me" to
        if(!e._id){ e._id = legacyId(ghId(gk, e)); e._ed = Date.now(); changed = true; }
        var id = e._id;
        if((had && !opts.all) || rej[id] || seen[code + '|' + id]) return;
        seen[code + '|' + id] = 1;
        ob.push({ ref: 1, code: code, id: id, key: gk, n: k, from: label() || myName() || 'Someone', by: myName() || '', at: Date.now() }); n++;
      });
      if(changed){ try{ LS.setItem(kk, JSON.stringify(list)); noteWrite(kk); }catch(e){} }
    });
    if(n){ saveOutbox(ob); flushOutbox(); }
    return n;
  }
  function legacyId(s){
    var h1 = 0x811c9dc5, h2 = 5381;
    for(var i = 0; i < s.length; i++){ var c = s.charCodeAt(i); h1 = Math.imul(h1 ^ c, 16777619); h2 = ((h2 << 5) + h2 + c) | 0; }
    return 'l' + (h1 >>> 0).toString(36) + (h2 >>> 0).toString(36);
  }
  // A past game as sent: players listed by name become {name}, the linked one marked, and an id if it never had one
  function refEntry(it){
    var list = lsJSON('gh_' + it.key), e = null;
    if(Array.isArray(list)) for(var i = 0; i < list.length; i++){ if(list[i] && ghId(it.key, list[i]) === it.id){ e = list[i]; break; } }
    if(!e) return null;
    e = JSON.parse(JSON.stringify(e));
    if(!e._id) e._id = it.id;
    e.players = (e.players || []).map(function(p){
      if(typeof p === 'string') p = { name: p };
      if(p && typeof p === 'object' && !p.cpu && lk(p.name) === it.n) p.link = it.code;
      return p;
    });
    return JSON.stringify(e);
  }
  var _flushing = null;
  function flushOutbox(){
    if(_flushing) return _flushing;
    var ob = outbox(); if(!ob.length || !isPin() || (typeof navigator !== 'undefined' && navigator.onLine === false)) return Promise.resolve();
    var sent = {}, i = 0;
    function chunk(){
      var part = ob.slice(i, i + 40); i += 40;
      if(!part.length) return Promise.resolve();
      return Promise.all(part.map(function(it){
        var entry = it.ref ? refEntry(it) : it.entry;
        if(!entry){ sent[it.code + '|' + it.id] = 1; return null; }   // deleted since: nothing to send
        return linkCol().doc(it.code).collection('inbox').doc(it.id).set({ key: it.key, entry: entry, from: it.from, by: it.by, at: it.at })
          .then(function(){ sent[it.code + '|' + it.id] = 1; }).catch(function(e){ console.warn('[links] send failed', e); });
      })).then(chunk);
    }
    _flushing = ensureFirebase().then(chunk).then(function(){
      saveOutbox(outbox().filter(function(it){ return !sent[it.code + '|' + it.id]; }));
    }).then(function(){ _flushing = null; }, function(e){ _flushing = null; console.warn('[links] flush failed', e); });
    return _flushing;
  }
  // Already in this account's history (or deleted from it): a game sent again needs no review
  function haveGame(key, id){
    var del = lsJSON('fgh_gh_del'); if(del && del[id]) return true;
    var list = lsJSON('gh_' + key);
    return Array.isArray(list) && list.some(function(r){ return r && ghId(key, r) === id; });
  }
  function received(own, d){
    var x = d.data() || {}, e;
    try{ e = JSON.parse(x.entry); }catch(err){ return null; }
    if(!e || typeof e !== 'object') return null;
    var me = myName() || own.name;
    (e.players || []).forEach(function(p){
      if(!p || p.link !== own.code) return;
      if(p.name !== me){
        p.as = p.name;
        if(e.winner === p.name) e.winner = me;
        if(typeof e._summary === 'string') e._summary = e._summary.split(p.name).join(me);
      }
      p.name = me; p.me = true;
    });
    e._from = { by: x.by || '', from: x.from || '', code: own.code };
    return { id: d.id, key: x.key || 'misc', entry: e, from: x.by || x.from || 'Someone', at: x.at };
  }
  function fileGame(it){
    var GH = window.GameHistory; if(!GH || !GH.insert) return false;
    var ok = GH.insert(it.key, it.entry);   // false when it's already here (or was deleted): nothing changes twice
    if(ok){ try{ tableBank(it.entry, false); }catch(e){ console.warn('[links] bankroll', e); } }
    return ok;
  }
  // Casino games played at someone else's table from your own bankroll: the record carries bk = {seat: {s, e, c}}
  // (start and end of your bankroll there, and the profile code it was taken for). Filing the game changes your
  // casino bank by that much (never below $0) and adds a line to your bankroll history; "Not me" takes it back.
  var LEDGER = 'gh_casino_ledger';
  function tableDelta(e){
    var code = e && e._from && e._from.code;
    if(!code || !e.bk || typeof e.bk !== 'object' || !Array.isArray(e.players)) return null;
    for(var i = 0; i < e.players.length; i++){
      var p = e.players[i], b = e.bk[i];
      if(!p || p.link !== code || !b || b.c !== code) continue;
      var d = Math.round(Number(b.e) - Number(b.s));
      return isFinite(d) ? d : null;
    }
    return null;
  }
  function tableBank(e, rev){
    var d = tableDelta(e); if(!d) return false;
    var g = null; try{ if(typeof findGame === 'function') g = findGame(e.game); }catch(err){}
    var info = { gid: e._id || '', game: e.game || '', name: g ? g.name : String(e.game || 'Casino'), table: e._from.by || e._from.from || 'Someone', rev: !!rev };
    var delta = rev ? -d : d;
    // casino.js (casino pages, home) also keeps its running session right; elsewhere the bank is written here
    if(typeof Casino !== 'undefined' && Casino.applyRemote) return Casino.applyRemote(delta, info);
    return bankRemote(delta, info);
  }
  // Change casino_bank by delta and log it in the bankroll history (same formats as casino.js). Once per game:
  // a game id already in the history isn't applied again, and taking one back needs it to have been applied.
  function bankRemote(delta, info){
    info = info || {}; delta = Math.round(Number(delta) || 0); if(!delta) return false;
    var list = lsJSON(LEDGER); if(!Array.isArray(list)) list = [];
    if(info.gid){
      var has = function(rev){ return list.some(function(x){ return x && x.gid === info.gid && !!x.rev === rev; }); };
      if(has(!!info.rev) || (info.rev && !has(false))) return false;
    }
    var start = myBank(), end = Math.max(0, start + delta), now = Date.now();
    try{ LS.setItem('casino_bank', String(end)); }catch(e){ return false; }
    noteWrite('casino_bank');
    list.push({ _date: now, kind: 'session', game: info.game || '', name: info.name || 'Casino', start: start, end: end, net: end - start,
      wagered: 0, won: 0, bets: 0, best: 0, t0: now, table: String(info.table || 'Someone').slice(0, 40), gid: info.gid || '', rev: !!info.rev });
    list.sort(function(a, b){ return (b._date || 0) - (a._date || 0); });
    if(list.length > 300) list.length = 300;
    try{ LS.setItem(LEDGER, JSON.stringify(list)); }catch(e){}
    noteWrite(LEDGER);
    return true;
  }
  // Linking takes both sides. Linking someone (their code) drops a note in their inbox ("ask:" + your code, from
  // your name); until they accept, the link is pending (no hs): no games go across and nothing is read from their
  // profile. Their app shows the note as a request, always, even if they had entered your code too. Accepting
  // links you back under that name (or one they choose) and answers "ack:" + its code: both sides are on (hs),
  // and past games go across. Declining answers "deny:", which unlinks you from them. The note sits in their
  // inbox until they answer, so any of their devices can. Notes are plain strings (not JSON), so an older app
  // that can't read them just clears them, and the note goes again later (every 12 hours until it's answered).
  var LINK_NOTE_MS = 12 * 3600e3;
  function noteId(kind, code){ return 'z' + kind + String(code).toLowerCase(); }
  function sendNote(toCode, kind, own){
    return linkCol().doc(toCode).collection('inbox').doc(noteId(kind, own.code))
      .set({ key: '_' + kind, entry: kind + ':' + own.code, from: label() || myName() || own.name || 'Someone', by: myName() || own.name || '', at: Date.now() });
  }
  function linkNotes(){
    var l = linksGet(), now = Date.now();
    var due = Object.keys(l.others).filter(function(k){ var r = l.others[k]; return r && !r.off && r.code && !r.gone && !r.hs && (!r.hsAt || now - r.hsAt > LINK_NOTE_MS); });
    if(!due.length || !myName()) return Promise.resolve();
    return (l.own && l.own.code ? Promise.resolve(l.own) : linkShare()).then(function(own){
      return Promise.all(due.map(function(k){
        var code = l.others[k].code;
        return sendNote(code, 'ask', own).then(function(){
          var L = linksGet(); if(L.others[k] && L.others[k].code === code){ L.others[k].hsAt = Date.now(); try{ LS.setItem('fgh_links', JSON.stringify(L)); }catch(e){} }
        }).catch(function(e){ console.warn('[links] note failed', code, e); });
      }));
    }).catch(function(e){ console.warn('[links] notes', e); });
  }
  // Someone you play with, added on purpose so every device lists them
  function addPlayer(n){
    try{
      var k = lk(n), fp = lsJSON('frequent_players'); if(!Array.isArray(fp)) fp = [];
      if(!fp.some(function(x){ return lk(x) === k; })){ fp.push(n); LS.setItem('frequent_players', JSON.stringify(fp)); }
      var h = lsJSON('gn_hidden_names');
      if(Array.isArray(h)){ var h2 = h.filter(function(x){ return lk(x) !== k; }); if(h2.length !== h.length) LS.setItem('gn_hidden_names', JSON.stringify(h2)); }
      var m = lsJSON('fgh_players_at') || {};
      if(!m[k] || m[k].h){ m[k] = { n: n, t: Date.now(), h: 0 }; LS.setItem('fgh_players_at', JSON.stringify(m)); noteWrite('fgh_players_at'); }
    }catch(e){}
  }
  // A note in your inbox. Returns true when it's dealt with (delete it); a link request stays until answered.
  function readNote(own, x, id, reqs){
    var m = /^(ask|ack|deny):([A-HJ-NP-Z2-9]{6})$/.exec(String(x.entry || '')); if(!m || m[2] === own.code) return true;
    var code = m[2], L = linksGet(), keys = Object.keys(L.others);
    if(m[1] === 'ack'){ accepted(code); return true; }
    if(m[1] === 'deny'){
      var gone = [];
      keys.forEach(function(k){ var r = L.others[k]; if(r && !r.off && r.code === code) gone.push(r.name); });
      gone.forEach(function(n){ linkRemove(n); });
      if(gone.length){ var dl = lsJSON('fgh_link_denied'); dl = Array.isArray(dl) ? dl : []; gone.forEach(function(n){ if(dl.indexOf(n) < 0) dl.push(n); }); try{ LS.setItem('fgh_link_denied', JSON.stringify(dl)); }catch(e){} }
      return true;
    }
    // already on (accepted on another of your devices, or they asked again): just answer
    if(keys.some(function(k){ var r = L.others[k]; return r && !r.off && r.hs && r.code === code; })){ sendNote(code, 'ack', own).catch(function(e){ console.warn('[links] ack failed', e); }); return true; }
    var name = String(x.by || x.from || '').trim().slice(0, 40); if(!name || lk(name) === lk(myName())) return true;
    reqs.push({ id: id, code: code, name: name, at: Number(x.at) || 0 });
    return false;
  }
  // They accepted (or you both had each other's code): the link is on, and every past game with them goes across
  function accepted(code){
    var names = setHs(code);
    names.forEach(function(n){ var L = linksGet(), r = L.others[lk(n)]; if(r){ r.bf = 1; try{ LS.setItem('fgh_links', JSON.stringify(L)); }catch(e){} } linkBackfill(n, code, { all: true }); });
    if(names.length){
      // the person who asked gets a banner, on whatever screen they're on (kept until a page shows it)
      var was = lsJSON('fgh_link_acc'); was = Array.isArray(was) ? was : [];
      names.forEach(function(n){ if(was.indexOf(n) < 0) was.push(n); });
      try{ LS.setItem('fgh_link_acc', JSON.stringify(was)); }catch(e){}
      setTimeout(function(){ linkEvent([], names); }, 0);
      setTimeout(function(){ linkPoll(true); }, 300);   // their avatar and scores
    }
    return names;
  }
  // Live: the home screen watches your inbox, so a link request or a game sent to you shows up within seconds
  // instead of at the next app open. Stops when the page is hidden; restarts if your code changes.
  // Any page also listens while a request you sent is waiting, so their answer can pop in mid-game.
  var _watch = null, _watchCode = null, _watchOn = false, _homeWant = false;
  // a request you sent in the last 15 minutes and still waiting (after that, the regular checks pick up the answer)
  function waitingOut(){ var o = linksGet().others, now = Date.now(); return Object.keys(o).some(function(k){ var r = o[k]; return r && !r.off && r.code && !r.gone && !r.hs && now - (Number(r.at) || 0) < 15 * 60000; }); }
  var _watchWait = 5000;
  function pendWatch(){
    var vis = typeof document === 'undefined' || document.visibilityState !== 'hidden';
    var on = _homeWant || (vis && isPin() && waitingOut());
    if(on !== _watchOn || (on && !_watch)) watchApply(on);
  }
  function linkWatch(on){ _homeWant = !!on; pendWatch(); }
  function watchApply(on){
    _watchOn = !!on;
    if(!on){ if(_watch){ try{ _watch(); }catch(e){} _watch = null; _watchCode = null; } return; }
    if(!isPin()) return;
    var l = linksGet(), code = l.own && l.own.code; if(!code) return;
    if(_watch && _watchCode === code) return;
    if(_watch){ try{ _watch(); }catch(e){} _watch = null; }
    _watchCode = code;
    ensureFirebase().then(function(){
      if(!_watchOn || _watchCode !== code || _watch) return;
      _watch = linkCol().doc(code).collection('inbox').limit(100).onSnapshot(function(q){
        _watchWait = 5000;
        if(q && !q.empty) linkPoll(true);   // if a check is already running, it runs once more right after
      }, function(e){
        console.warn('[links] watch', e); _watch = null; _watchCode = null;
        if(e && e.code === 'permission-denied') return;   // won't fix itself: the regular checks carry on
        // dropped connection: listen again, waiting longer each time it fails (up to 5 minutes)
        setTimeout(function(){ if(_watchOn) watchApply(true); }, _watchWait); _watchWait = Math.min(_watchWait * 2, 300000);
      });
    }).catch(function(e){ console.warn('[links] watch', e); });
  }
  // A quick look at just your inbox (one small read): anything new runs the full check.
  // Used while your code is on screen, when a request is most likely to land, in case the live listener lags.
  function linkPeek(){
    if(!isPin() || _linkBusy || _watch) return Promise.resolve();   // the live listener already covers it
    var l = linksGet(), code = l.own && l.own.code; if(!code) return Promise.resolve();
    return ensureFirebase().then(function(){ return linkCol().doc(code).collection('inbox').limit(100).get(); }).then(function(q){
      var known = {}; _reqs.concat(_pending).forEach(function(r){ if(r && r.id) known[r.id] = 1; });
      if(q.docs.some(function(d){ return !known[d.id]; })) return linkPoll(true);
    }).catch(function(e){ console.warn('[links] peek', e); });
  }
  // Link requests waiting for your answer
  function linkReqs(){ return _reqs.slice(); }
  // Their profile (name, avatar) for the request screen
  function linkReqInfo(code){ return ensureFirebase().then(function(){ return linkCol().doc(code).get(); }).then(function(d){ return d.exists ? (d.data() || {}) : null; }); }
  function answerNote(r, kind){
    var l = linksGet();
    return ensureFirebase().then(function(){ return l.own && l.own.code ? sendNote(r.code, kind || 'ack', l.own) : null; })
      .then(function(){ return l.own && l.own.code ? linkCol().doc(l.own.code).collection('inbox').doc(r.id).delete() : null; });
  }
  // Accept: link them back under that name (yours for them), then tell the home screen
  function linkReqAccept(id, name){
    var r = _reqs.filter(function(x){ return x.id === id; })[0]; if(!r) return Promise.resolve();
    name = String(name || r.name).trim().slice(0, 40);
    if(!name || lk(name) === lk(myName())) return Promise.reject(new Error('That’s your own name'));
    var L = linksGet(), k = lk(name), cur = L.others[k];
    if(cur && !cur.off && cur.code && cur.code !== r.code) return Promise.reject(new Error(name + ' is already linked to someone else. Use another name.'));
    L.others[k] = { name: name, code: r.code, them: r.name, at: Date.now(), hs: 1, bf: 1 };
    linksSet(L); addPlayer(name); linkBackfill(name, r.code, { all: true });
    _reqs = _reqs.filter(function(x){ return x.id !== id; });
    return answerNote(r).catch(function(e){ console.warn('[links] accept', e); }).then(function(){
      return linkPoll(true);   // their avatar and scores, and the games you've had together go to them
    }).then(function(){
      var was = lsJSON('fgh_link_new'); was = Array.isArray(was) ? was : []; if(was.indexOf(name) < 0) was.push(name);
      try{ LS.setItem('fgh_link_new', JSON.stringify(was)); }catch(e){}
      linkEvent([name]);
    });
  }
  // Decline: nothing is linked, and their phone unlinks you too
  function linkReqDecline(id){
    var r = _reqs.filter(function(x){ return x.id === id; })[0]; if(!r) return Promise.resolve();
    _reqs = _reqs.filter(function(x){ return x.id !== id; }); linkEvent();
    return answerNote(r, 'deny').catch(function(e){ console.warn('[links] decline', e); });
  }
  // Check your inbox, your linked people's avatars and rejections, and send anything waiting
  function linkPoll(force){
    if(!isPin()) return Promise.resolve();
    if(_linkBusy){ if(force) _pollAgain = true; return Promise.resolve(); }   // something arrived mid-check: check again right after
    if(!force && Date.now() - _lastPoll < 20000) return Promise.resolve();
    _linkBusy = true; _lastPoll = Date.now();
    return ensureFirebase().then(function(){
      var l = linksGet(), jobs = [];
      if(l.own && l.own.code){
        var own = l.own;
        jobs.push(linkCol().doc(own.code).collection('inbox').limit(100).get().then(function(q){
          var pend = [], reqs = [];
          return Promise.all(q.docs.map(function(d){
            var x0 = d.data() || {};
            if(x0.key === '_ask' || x0.key === '_ack' || x0.key === '_deny'){ return readNote(own, x0, d.id, reqs) ? d.ref.delete() : null; }
            var it = received(own, d); if(!it || haveGame(it.key, it.entry._id || it.id)) return d.ref.delete();
            if(own.ask){ pend.push(it); return null; }
            if(!window.GameHistory) return null;   // filed by a page that keeps history
            fileGame(it); return d.ref.delete();
          })).then(function(){ _pending = pend.sort(function(a, b){ return (b.at || 0) - (a.at || 0); }); _reqs = reqs.sort(function(a, b){ return (b.at || 0) - (a.at || 0); }); });
        }));
      } else { _pending = []; _reqs = []; }
      Object.keys(l.others).forEach(function(k){
        var r = l.others[k]; if(!r || r.off || !r.code) return;
        jobs.push(linkCol().doc(r.code).get().then(function(d){
          // their code no longer works (they made a new one): say so on the link
          var L2 = linksGet(), cur = L2.others[k];
          if(cur && !!cur.gone !== !d.exists){ if(d.exists) delete cur.gone; else cur.gone = true; try{ LS.setItem('fgh_links', JSON.stringify(L2)); }catch(e){} }
          if(!d.exists || !r.hs) return;   // pending: wait for them to accept
          var data = d.data() || {};
          applyAvatar(r.name, r.code, data);
          var c = lsJSON(LHI) || {};
          var bk = typeof data.bank === 'number' && isFinite(data.bank) ? Math.max(0, Math.round(data.bank)) : null;
          if(data.ini || data.hi || bk !== null){
            var newIni = iniClean(data.ini), prevIni = (c[k] && iniClean(c[k].ini)) || iniClean((lsJSON('gn_ini') || {})[k]);
            c[k] = { code: r.code, ini: String(data.ini || '').slice(0, 3), hi: data.hi && typeof data.hi === 'object' ? data.hi : {} };
            if(newIni.length >= 2 && newIni !== prevIni) setTimeout(function(){ try{ tagOldScores(); }catch(e){} }, 0);
            if(newIni.length >= 2 && prevIni && prevIni !== newIni){
              try{ LS.setItem(LHI, JSON.stringify(c)); }catch(e){}
              renameIni(prevIni, newIni, k);
              var gm = lsJSON('gn_ini'); if(gm && gm[k] && gm[k] !== newIni){ gm[k] = newIni; try{ LS.setItem('gn_ini', JSON.stringify(gm)); }catch(e){} noteWrite('gn_ini'); }
            }
            if(bk !== null){ c[k].bank = bk; c[k].bankAt = Number(data.at) || Date.now(); bankPendingDrop(r.code, c[k].bankAt); }
          }
          else delete c[k];
          try{ LS.setItem(LHI, JSON.stringify(c)); }catch(e){}
          unmarkRejected(r.code, data.rejected || []);
          // links made before every past game went across (older records, long backlogs): send them once more
          if(!r.bf){ linkBackfill(r.name, r.code, { all: true, rejected: data.rejected || [] }); var L3 = linksGet(); if(L3.others[k]){ L3.others[k].bf = 1; try{ LS.setItem('fgh_links', JSON.stringify(L3)); }catch(e){} } }
        }).catch(function(e){ console.warn('[links] read failed', r.code, e); }));
      });
      jobs.push(flushOutbox());
      jobs.push(linkNotes());
      // scores that reached this device from your other devices: publish them too
      if(l.own && l.own.code && LS.getItem('fgh_link_pub') !== pubSig()) jobs.push(linkPublish());
      return Promise.all(jobs);
    }).catch(function(e){ console.warn('[links] poll failed', e); }).then(function(){
      _linkBusy = false; linkEvent(); pendWatch();
      if(_pollAgain){ _pollAgain = false; return linkPoll(true); }
    });
  }
  // Someone said "Not me" to a game you recorded: it stays in your history, just no longer linked to them
  function unmarkRejected(code, rejected){
    if(!rejected.length) return;
    for(var i = 0; i < LS.length; i++){
      var k = LS.key(i); if(!k || k.indexOf('gh_') !== 0) continue;
      var list = lsJSON(k); if(!Array.isArray(list)) continue;
      var changed = false;
      list.forEach(function(e){
        if(!e || rejected.indexOf(e._id) < 0) return;
        (e.players || []).forEach(function(p){ if(p && p.link === code){ delete p.link; p.unlinked = true; changed = true; } });
      });
      if(changed){ try{ LS.setItem(k, JSON.stringify(list)); }catch(e){} noteWrite(k); }
    }
  }
  function linkPending(){ return _pending.slice(); }
  function inboxRef(id){ var l = linksGet(); return l.own ? linkCol().doc(l.own.code).collection('inbox').doc(id) : null; }
  function linkAccept(id){
    var it = _pending.filter(function(x){ return x.id === id; })[0]; if(!it) return Promise.resolve();
    fileGame(it); _pending = _pending.filter(function(x){ return x.id !== id; }); linkEvent();
    return ensureFirebase().then(function(){ var r = inboxRef(id); return r && r.delete(); }).catch(function(){});
  }
  function rejectId(id){
    var l = linksGet(); if(!l.own) return Promise.resolve();
    return ensureFirebase().then(function(){ return linkCol().doc(l.own.code).update({ rejected: firebase.firestore.FieldValue.arrayUnion(id) }); });
  }
  function linkDecline(id){
    _pending = _pending.filter(function(x){ return x.id !== id; }); linkEvent();
    return rejectId(id).then(function(){ var r = inboxRef(id); return r && r.delete(); }).catch(function(e){ console.warn('[links] decline', e); });
  }
  // "Not me" on a game already in your history
  function linkNotMe(key, e){
    var GH = window.GameHistory; if(GH && GH.remove) GH.remove((function(){ var o = {}; o[key] = [GH.idOf(key, e)]; return o; })());
    try{ tableBank(e, true); }catch(err){ console.warn('[links] bankroll', err); }   // a bankroll change from it is taken back
    return e && e._id ? rejectId(e._id).catch(function(err){ console.warn('[links] not me', err); }) : Promise.resolve();
  }
  if(typeof document !== 'undefined') document.addEventListener('visibilitychange', function(){ if(document.visibilityState === 'visible') linkPoll(); pendWatch(); });

  window.FGHSync = {
    mode: mode, pin: pin, label: label, isPin: isPin,
    // Firestore handle for features beyond the PIN doc (Lorcana online tables)
    db: function(){ return ensureFirebase().then(function(f){ return f.db; }); },
    // activity log (this device only): add a line, read it, the last sync's timing, clear it
    log: dlog,
    logGet: function(){ try{ var a = JSON.parse(LS.getItem(DLOG) || '[]'); return Array.isArray(a) ? a : []; }catch(e){ return []; } },
    lastSync: function(){ try{ return JSON.parse(LS.getItem(DLAST) || 'null'); }catch(e){ return null; } },
    logClear: function(){ try{ LS.removeItem(DLOG); }catch(e){} },
    restQuery: restQuery,
    warm: function(){ return ensureFirebase().then(function(){ return true; }, function(){ return false; }); },   // load the cloud code early (the sign-in page)
    signInWithPin: signInWithPin, changePin: changePin, weakPin: weakPin, randomPin: randomPin,
    setLabel: setLabel,
    signOut: signOut,
    continueAsGuest: continueAsGuest,
    onReady: onReady,
    noteWrite: noteWrite,
    syncNow: syncNow,
    syncStatus: syncStatus,
    onStatusChange: onStatusChange,
    pullCloudRaw: pullCloudRaw,
    forceOverwriteLocal: forceOverwriteLocal,
    forceOverwriteCloud: forceOverwriteCloud,
    // player links
    linkShare: linkShare, linkNewCode: linkNewCode, linkSetAsk: linkSetAsk, linkPublish: linkPublishSoon,
    linkAdd: linkAdd, linkRemove: linkRemove, linkCancel: linkCancel, linkOf: linkOf, links: linksGet,
    initials: myInitials, setInitials: setInitials, renameIni: renameIni, tagOldScores: tagOldScores, linkHi: linkHi, linkPublishSoon: linkPublishSoon,
    linkMark: linkMark, linkSend: linkSend, linkBackfill: linkBackfill, linkPoll: linkPoll,
    linkPending: linkPending, linkAccept: linkAccept, linkDecline: linkDecline, linkNotMe: linkNotMe,
    linkReqs: linkReqs, linkReqInfo: linkReqInfo, linkReqAccept: linkReqAccept, linkReqDecline: linkReqDecline, linkWatch: linkWatch, linkPeek: linkPeek,
    linkBank: linkBank, bankRemote: bankRemote, _fileGame: fileGame,
    _scanLocal: scanLocal, _myHi: myHi, _mergeHi: mergeHi, _hiFromFirestore: hiFromFirestore
  };

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
