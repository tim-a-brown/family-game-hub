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
(function(){
  'use strict';
  var LS = window.localStorage;
  var MODE_KEY  = 'fgh_mode';
  var PIN_KEY   = 'fgh_pin';
  var LABEL_KEY = 'fgh_label';
  var PIN_RE    = /^[0-9]{4}$/;

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

  function loadScript(src){
    return new Promise(function(res, rej){
      var s = document.createElement('script');
      s.src = src; s.async = false;
      s.onload = res; s.onerror = function(){ rej(new Error('load '+src)); };
      document.head.appendChild(s);
    });
  }

  function ensureFirebase(){
    if(_fb) return Promise.resolve(_fb);
    var V = '10.12.2';
    return loadScript('https://www.gstatic.com/firebasejs/'+V+'/firebase-app-compat.js')
      .then(function(){ return loadScript('https://www.gstatic.com/firebasejs/'+V+'/firebase-firestore-compat.js'); })
      .then(function(){
        var app = firebase.initializeApp(firebaseConfig);
        var db  = firebase.firestore();
        // local testing only: talk to the Firestore emulator
        try{ if(/^(localhost|127\.0\.0\.1)$/.test(location.hostname) && LS.getItem('fgh_emu')) db.useEmulator('localhost', 8080); }catch(e){}
        _fb = { app: app, db: db };
        return _fb;
      });
  }

  // ── Scan localStorage ─────────────────────────────────────────────────
  function scanLocal(){
    var out = { hi: {}, gh: {}, bank: null, rklists: null, favs: null, favsAt: null, lorc: scanLorc(), avatars: null, ghDel: null, links: null };
    for(var i = 0; i < LS.length; i++){
      var k = LS.key(i);
      if(!k) continue;
      if(k.indexOf('hi_') === 0){
        try{ out.hi[k.slice(3)] = JSON.parse(LS.getItem(k)) || []; }catch(e){}
      } else if(k.indexOf('gh_') === 0){
        try{ out.gh[k.slice(3)] = JSON.parse(LS.getItem(k)) || []; }catch(e){}
      } else if(k === 'casino_bank'){
        try{ out.bank = parseInt(LS.getItem(k)) || null; }catch(e){}
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
      } else if(k === 'fav_games_updated_at'){
        try{ out.favsAt = parseInt(LS.getItem(k)) || null; }catch(e){}
      }
    }
    return out;
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
  function mergeHi(a, b){
    var all = asArray(a).concat(asArray(b));
    var seen = {};
    all = all.filter(function(row){
      if(Array.isArray(row)){ if(row.length < 2) return false; }
      else if(!row || typeof row !== 'object' || row.score == null) return false;
      var k = (hiName(row)||'')+'|'+hiScore(row)+'|'+(hiDate(row)||'');
      if(seen[k]) return false; seen[k] = 1; return true;
    });
    all.sort(function(x,y){ return hiScore(y) - hiScore(x); });
    return all.slice(0, 50);   // top 50 per arcade game
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

  function mergeSnapshots(local, remote){
    var out = { hi: {}, gh: {}, rklists: null, favs: null, favsAt: null };
    var keys = {};
    Object.keys(local.hi||{}).forEach(function(k){ keys[k]=1; });
    Object.keys(remote.hi||{}).forEach(function(k){ keys[k]=1; });
    Object.keys(keys).forEach(function(k){ out.hi[k] = mergeHi(local.hi&&local.hi[k], remote.hi&&remote.hi[k]); });
    keys = {};
    Object.keys(local.gh||{}).forEach(function(k){ keys[k]=1; });
    Object.keys(remote.gh||{}).forEach(function(k){ keys[k]=1; });
    Object.keys(keys).forEach(function(k){ out.gh[k] = mergeGh(local.gh&&local.gh[k], remote.gh&&remote.gh[k]); });
    out.rklists = mergeRkLists(local.rklists, remote.rklists);
    out.lorc = mergeLorc(local.lorc, remote.lorc);
    out.avatars = mergeAvatars(local.avatars, remote.avatars);
    out.ghDel = mergeDel(local.ghDel, remote.ghDel);
    out.links = mergeLinks(local.links, remote.links);
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
  function mergeLinks(a, b){
    if(!a && !b) return null;
    a = a || {}; b = b || {};
    var own = (a.own && b.own) ? ((a.own.at || 0) >= (b.own.at || 0) ? a.own : b.own) : (a.own || b.own || null);
    var others = {};
    [a.others || {}, b.others || {}].forEach(function(src){ Object.keys(src).forEach(function(k){ var r = src[k]; if(r && (!others[k] || (r.at || 0) > (others[k].at || 0))) others[k] = r; }); });
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
      out[game] = (hiMap[game]||[]).map(function(row){
        return Array.isArray(row) ? row : [row.n, row.s, row.d];
      });
    });
    return out;
  }

  // ── Firestore IO ──────────────────────────────────────────────────────
  function cloudRef(){
    if(!isPin() || !_fb) return null;
    return _fb.db.collection('pins').doc(pin());
  }

  function pullCloud(){
    var ref = cloudRef(); if(!ref) return Promise.resolve({hi:{}, gh:{}, label:null, bank:null, rklists:null, favs:null, favsAt:null, lorc:null, avatars:null, ghDel:null, links:null, isNew:false});
    return ref.get().then(function(doc){
      if(!doc.exists){
        console.log('[sync] pull: cloud doc empty (first sync)');
        return {hi:{}, gh:{}, label:null, bank:null, rklists:null, favs:null, favsAt:null, lorc:null, avatars:null, ghDel:null, links:null, isNew:true};
      }
      var d = doc.data() || {};
      var result = { hi: hiFromFirestore(d.hi||{}), gh: d.gh||{}, label: d.label||null, labelAt: d.labelAt||null, bank: d.bank||null, rklists: d.rklists||null, favs: d.favs||null, favsAt: d.favsAt||null, lorc: d.lorcana||null, avatars: d.avatars||null, ghDel: d.ghDel||null, links: d.links||null, isNew:false };
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
      pushNow()
        .then(function(){ setStatus('synced'); })
        .catch(function(err){
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
  function pushNow(){
    var ref = cloudRef(); if(!ref) return Promise.resolve();
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
    console.log('[sync] push', {
      rklists_count: snap.rklists && snap.rklists.lists ? (Array.isArray(snap.rklists.lists) ? snap.rklists.lists.length : Object.keys(snap.rklists.lists).length) : 0,
      favs_count: Array.isArray(snap.favs) ? snap.favs.length : 'absent',
      hi_keys: Object.keys(snap.hi||{}).length,
      gh_keys: Object.keys(snap.gh||{}).length
    });
    fitDoc(doc);
    // merge:true means fields not in `doc` are preserved on the cloud side.
    // This prevents the race where device A has empty local for some field
    // and pushes before device B's newly-saved data lands — merge:false
    // would wipe the cloud field entirely.
    return ref.set(doc, { merge: true }).catch(function(err){
      // Rules that don't allow `lorcana` yet would refuse the whole save:
      // save everything else instead of losing it
      if((doc.avatars || doc.ghDel || doc.links || doc.labelAt) && err && err.code === 'permission-denied'){
        console.warn('[sync] cloud refused avatars/ghDel/links/labelAt fields; saving the rest');
        delete doc.avatars; delete doc.ghDel; delete doc.links; delete doc.labelAt;
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
    }).catch(function(err){
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
    if(isPin()) schedulePush();
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
    LS.setItem(MODE_KEY, 'guest');
    LS.removeItem(PIN_KEY);
    notifyReady();
  }

  function signInWithPin(p){
    if(!PIN_RE.test(p||'')) return Promise.reject(new Error('PIN must be 4 digits'));
    LS.setItem(MODE_KEY, 'pin');
    LS.setItem(PIN_KEY, p);
    return ensureFirebase()
      .then(pullCloud)
      .then(function(remote){
        takeLabel(remote);
        if(remote.bank !== null && remote.bank !== undefined) try{ LS.setItem('casino_bank', String(remote.bank)); }catch(e){}
        var local   = scanLocal();
        var merged  = mergeSnapshots(local, remote);
        writeSnapshotToLocal(merged); reconcileName();
        return pushNow().then(function(){ return {isNew: remote.isNew}; });
      })
      .then(function(result){ notifyReady(); return result; });
  }

  function signOut(){
    LS.removeItem(MODE_KEY);
    LS.removeItem(PIN_KEY);
    LS.removeItem(LABEL_KEY);
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

  // Force a manual sync. Returns a Promise.
  function syncNow(){
    if(!isPin()){ setStatus('idle'); return Promise.resolve({ ok:true, reason:'guest' }); }
    if(typeof navigator !== 'undefined' && navigator.onLine === false){
      setStatus('offline');
      return Promise.resolve({ ok:false, reason:'offline' });
    }
    setStatus('syncing');
    return ensureFirebase()
      .then(pullCloud)
      .then(function(remote){
        takeLabel(remote);
        if(remote.bank !== null && remote.bank !== undefined) try{ LS.setItem('casino_bank', String(remote.bank)); }catch(e){}
        var local  = scanLocal();
        var merged = mergeSnapshots(local, remote);
        writeSnapshotToLocal(merged); reconcileName();
        return pushNow();
      })
      .then(function(){
        setStatus('synced');
        try{ document.dispatchEvent(new CustomEvent('fghsync:updated')); }catch(e){}
        linkPoll(true);
        return { ok: true };
      })
      .catch(function(err){
        console.warn('[sync] syncNow failed', err);
        setStatus('error', { error: (err && err.message) || String(err) });
        return { ok: false, error: err };
      });
  }

  function noteWrite(key){
    if(!key) return;
    if(key.indexOf('hi_') !== 0 && key.indexOf('gh_') !== 0 && key.indexOf('lorcana_decks') !== 0 && key.indexOf('lorcana_marks') !== 0 && key.indexOf('lorcana_art') !== 0 && key.indexOf('lorcana_fancy') !== 0 && key !== 'fgh_avatars' && key !== 'fgh_gh_del' && key !== 'fgh_links' && key !== 'casino_bank' && key !== 'rklists' && key !== 'fav_games') return;
    if(isPin()) schedulePush();
  }

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
    var m = mode();
    if(m === 'pin' && PIN_RE.test(pin()||'')){
      if(typeof navigator !== 'undefined' && navigator.onLine === false){
        setStatus('offline');
        notifyReady();
        return;
      }
      setStatus('syncing');
      ensureFirebase()
        .then(pullCloud)
        .then(function(remote){
          takeLabel(remote);
          if(remote.bank !== null && remote.bank !== undefined) try{ LS.setItem('casino_bank', String(remote.bank)); }catch(e){}
          var local  = scanLocal();
          var merged = mergeSnapshots(local, remote);
          writeSnapshotToLocal(merged); reconcileName();
          return pushNow();
        })
        .then(function(){
          setStatus('synced');
          try{ document.dispatchEvent(new CustomEvent('fghsync:updated')); }catch(e){}
          notifyReady();
          linkPoll(true);
        })
        .catch(function(err){
          console.warn('[sync] boot failed; staying local', err);
          setStatus('error', { error: (err && err.message) || String(err) });
          notifyReady();
        });
    } else {
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
  }


  // ── Player links ──────────────────────────────────────────────────────
  // Your profile: a share code (links/{code}) with your name and avatar. Someone who links you by that code sees your
  // avatar, and games they record with you in them land in its inbox; your app files them under your history
  // (or holds them for you to review when "Ask before adding" is on). "Not me" adds a game's id to the profile's
  // rejected list, which the sender's app reads to stop counting it as yours.
  var CODE_AB = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', CODE_RE = /^[A-HJ-NP-Z2-9]{6}$/;
  var OUTBOX = 'fgh_link_outbox';   // games waiting to be sent (this device only)
  var _pending = [], _linkBusy = false, _lastPoll = 0;
  function genCode(){ var c = ''; for(var i = 0; i < 6; i++) c += CODE_AB.charAt(Math.floor(Math.random() * CODE_AB.length)); return c; }
  function linksGet(){ var l = lsJSON('fgh_links') || {}, o = { own: l.own || null, others: l.others || {} }; if(l.ini) o.ini = l.ini; return o; }
  function linksSet(l){ try{ LS.setItem('fgh_links', JSON.stringify(l)); }catch(e){} noteWrite('fgh_links'); linkEvent(); }
  function linkEvent(){ try{ window.dispatchEvent(new CustomEvent('fghlinks', { detail: { pending: _pending.length } })); }catch(e){} }
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
    var l = linksGet(); l.ini = { v: v, at: Date.now() }; linksSet(l); linkPublishSoon();
    return v;
  }
  // Your best arcade scores (entries under your initials), top 5 per game, for the people who link you
  function myHi(){
    var ini = myInitials(), out = {}; if(!ini) return out;
    for(var i = 0; i < LS.length; i++){
      var k = LS.key(i); if(!k || k.indexOf('hi_') !== 0) continue;
      var list = lsJSON(k); if(!Array.isArray(list)) continue;
      var mine = list.filter(function(e){ return e && String(e.name || '').trim().toUpperCase() === ini && isFinite(Number(e.score)) && e.score !== null && e.score !== ''; })
        .map(function(e){ return { s: Number(e.score), d: String(e.date || '').slice(0, 24) }; })
        .sort(function(a, b){ return b.s - a.s; }).slice(0, 5);
      if(mine.length) out[k.slice(3)] = mine;
    }
    return out;
  }
  function hiSig(){ return myInitials() + '|' + JSON.stringify(myHi()); }
  // Linked people's initials and scores, as last read from their profiles (this device only)
  var LHI = 'fgh_link_hi';
  function linkHi(key){
    var c = lsJSON(LHI) || {}, l = linksGet(), out = [];
    Object.keys(c).forEach(function(k){
      var r = l.others[k], x = c[k]; if(!r || r.off || !r.code || r.code !== x.code) return;
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
            .then(function(){ l.own = own; linksSet(l); return own; });
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
      var doc = { name: myName() || l.own.name, avatar: myAvatar(), ask: !!l.own.ask, at: Date.now(), ini: myInitials(), hi: myHi() };
      return linkCol().doc(l.own.code).set(doc, { merge: true }).then(function(){ try{ LS.setItem('fgh_link_pub', hiSig()); }catch(e){} }).catch(function(e){
        if(!e || e.code !== 'permission-denied') throw e;
        delete doc.ini; delete doc.hi;   // cloud rules not updated yet
        return linkCol().doc(l.own.code).set(doc, { merge: true });
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
        linksSet(l); applyAvatar(name, code, data);
        data._sent = linkBackfill(name, code);
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
  function linkOf(name){ var r = linksGet().others[lk(name)]; return r && !r.off && r.code ? r : null; }
  function writeAvatars(all){
    try{ LS.setItem('fgh_avatars', JSON.stringify(all)); }catch(e){}
    noteWrite('fgh_avatars');
    try{ window.dispatchEvent(new StorageEvent('storage', { key: 'fgh_avatars' })); }catch(e){}
  }
  // A linked person's avatar comes from their profile (read-only here)
  function applyAvatar(name, code, data){
    var all = lsJSON('fgh_avatars') || {}, k = lk(name), cur = all[k], av = data.avatar;
    var stamp = Number(data.at) || 0;
    if(cur && cur.linked === code && cur.at === stamp) return;
    if(!av || !av.cur){ if(cur && cur.linked){ all[k] = { name: name, cur: null, photos: [], linked: code, at: stamp }; writeAvatars(all); } return; }
    var rec = { name: String(name).trim(), linked: code, at: stamp, photos: [] };
    if(av.cur.k === 'photo' && av.d){ rec.photos = [{ id: 'link', d: av.d, at: stamp }]; rec.cur = { k: 'photo', id: 'link' }; }
    else rec.cur = { k: av.cur.k, i: av.cur.i, c: av.cur.c };
    all[k] = rec; writeAvatars(all);
  }
  // Mark the players in a new record who are linked to someone's profile
  function linkMark(e){
    (e && Array.isArray(e.players) ? e.players : []).forEach(function(p){
      if(!p || typeof p !== 'object' || p.cpu) return;
      var r = linkOf(p.name); if(r) p.link = r.code;
    });
  }
  function outbox(){ var o = lsJSON(OUTBOX); return Array.isArray(o) ? o : []; }
  // Send a finished game to everyone linked in it
  function linkSend(key, e){
    var codes = {};
    (e.players || []).forEach(function(p){ if(p && p.link) codes[p.link] = 1; });
    var list = Object.keys(codes); if(!list.length) return;
    var ob = outbox();
    list.forEach(function(code){ ob.push({ code: code, id: e._id, key: key, entry: JSON.stringify(e), from: label() || myName() || 'Someone', by: myName() || '', at: Date.now() }); });
    try{ LS.setItem(OUTBOX, JSON.stringify(ob.slice(-200))); }catch(err){}
    flushOutbox();
  }
  // Linking someone after games with them are already in your history: those games go to them too.
  // Marks the player in each stored game (so it isn't sent twice) and queues a copy for their inbox.
  function linkBackfill(name, code){
    var k = lk(name), n = 0, ob = outbox(), seen = {}, keys = [];
    ob.forEach(function(it){ seen[it.code + '|' + it.id] = 1; });
    try{ for(var i = 0; i < LS.length; i++){ var kk = LS.key(i); if(kk && kk.indexOf('gh_') === 0 && kk !== 'gh_dedup_v1') keys.push(kk); } }catch(e){}
    keys.forEach(function(kk){
      var list; try{ list = JSON.parse(LS.getItem(kk)); }catch(e){ return; }
      if(!Array.isArray(list)) return;
      var changed = false;
      list.forEach(function(e){
        if(!e || typeof e !== 'object' || e._from || !e._id || !Array.isArray(e.players)) return;
        var hit = false;
        e.players.forEach(function(p){ if(p && typeof p === 'object' && !p.cpu && lk(p.name) === k && p.link !== code){ p.link = code; hit = true; } });
        if(!hit) return;
        changed = true;
        if(seen[code + '|' + e._id]) return;
        ob.push({ code: code, id: e._id, key: kk.slice(3), entry: JSON.stringify(e), from: label() || myName() || 'Someone', by: myName() || '', at: Date.now() }); n++;
      });
      if(changed){ try{ LS.setItem(kk, JSON.stringify(list)); noteWrite(kk); }catch(e){} }
    });
    if(n){ try{ LS.setItem(OUTBOX, JSON.stringify(ob.slice(-400))); }catch(e){} flushOutbox(); }
    return n;
  }
  function flushOutbox(){
    var ob = outbox(); if(!ob.length || !isPin() || (typeof navigator !== 'undefined' && navigator.onLine === false)) return Promise.resolve();
    return ensureFirebase().then(function(){
      return Promise.all(ob.map(function(it){
        return linkCol().doc(it.code).collection('inbox').doc(it.id).set({ key: it.key, entry: it.entry, from: it.from, by: it.by, at: it.at })
          .then(function(){ return it; }).catch(function(e){ console.warn('[links] send failed', e); return null; });
      })).then(function(done){
        var sent = done.filter(Boolean).map(function(it){ return it.code + '|' + it.id; });
        try{ LS.setItem(OUTBOX, JSON.stringify(outbox().filter(function(it){ return sent.indexOf(it.code + '|' + it.id) < 0; }))); }catch(e){}
      });
    });
  }
  // A game from someone else's device, filed under your history: the player they linked to you becomes you
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
  function fileGame(it){ var GH = window.GameHistory; return GH && GH.insert ? GH.insert(it.key, it.entry) : false; }
  // Check your inbox, your linked people's avatars and rejections, and send anything waiting
  function linkPoll(force){
    if(!isPin() || _linkBusy) return Promise.resolve();
    if(!force && Date.now() - _lastPoll < 20000) return Promise.resolve();
    _linkBusy = true; _lastPoll = Date.now();
    return ensureFirebase().then(function(){
      var l = linksGet(), jobs = [];
      if(l.own && l.own.code){
        var own = l.own;
        jobs.push(linkCol().doc(own.code).collection('inbox').limit(100).get().then(function(q){
          var pend = [];
          return Promise.all(q.docs.map(function(d){
            var it = received(own, d); if(!it) return d.ref.delete();
            if(own.ask){ pend.push(it); return null; }
            if(!window.GameHistory) return null;   // filed by a page that keeps history
            fileGame(it); return d.ref.delete();
          })).then(function(){ _pending = pend.sort(function(a, b){ return (b.at || 0) - (a.at || 0); }); });
        }));
      } else _pending = [];
      Object.keys(l.others).forEach(function(k){
        var r = l.others[k]; if(!r || r.off || !r.code) return;
        jobs.push(linkCol().doc(r.code).get().then(function(d){
          // their code no longer works (they made a new one): say so on the link
          var L2 = linksGet(), cur = L2.others[k];
          if(cur && !!cur.gone !== !d.exists){ if(d.exists) delete cur.gone; else cur.gone = true; try{ LS.setItem('fgh_links', JSON.stringify(L2)); }catch(e){} }
          if(!d.exists) return;
          var data = d.data() || {};
          applyAvatar(r.name, r.code, data);
          var c = lsJSON(LHI) || {};
          if(data.ini || data.hi){ c[k] = { code: r.code, ini: String(data.ini || '').slice(0, 3), hi: data.hi && typeof data.hi === 'object' ? data.hi : {} }; }
          else delete c[k];
          try{ LS.setItem(LHI, JSON.stringify(c)); }catch(e){}
          unmarkRejected(r.code, data.rejected || []);
        }).catch(function(e){ console.warn('[links] read failed', r.code, e); }));
      });
      jobs.push(flushOutbox());
      // scores that reached this device from your other devices: publish them too
      if(l.own && l.own.code && LS.getItem('fgh_link_pub') !== hiSig()) jobs.push(linkPublish());
      return Promise.all(jobs);
    }).catch(function(e){ console.warn('[links] poll failed', e); }).then(function(){ _linkBusy = false; linkEvent(); });
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
    return e && e._id ? rejectId(e._id).catch(function(err){ console.warn('[links] not me', err); }) : Promise.resolve();
  }
  if(typeof document !== 'undefined') document.addEventListener('visibilitychange', function(){ if(document.visibilityState === 'visible') linkPoll(); });

  window.FGHSync = {
    mode: mode, pin: pin, label: label, isPin: isPin,
    // Firestore handle for features beyond the PIN doc (Lorcana online tables)
    db: function(){ return ensureFirebase().then(function(f){ return f.db; }); },
    signInWithPin: signInWithPin,
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
    linkAdd: linkAdd, linkRemove: linkRemove, linkOf: linkOf, links: linksGet,
    initials: myInitials, setInitials: setInitials, linkHi: linkHi, linkPublishSoon: linkPublishSoon,
    linkMark: linkMark, linkSend: linkSend, linkBackfill: linkBackfill, linkPoll: linkPoll,
    linkPending: linkPending, linkAccept: linkAccept, linkDecline: linkDecline, linkNotMe: linkNotMe,
    _scanLocal: scanLocal
  };

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
