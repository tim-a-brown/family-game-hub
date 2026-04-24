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
//   noteWrite(key)             -> call after any hi_/gh_ localStorage write
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
        _fb = { app: app, db: db };
        return _fb;
      });
  }

  // ── Scan localStorage ─────────────────────────────────────────────────
  function scanLocal(){
    var out = { hi: {}, gh: {}, bank: null, rklists: null, favs: null, favsAt: null };
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
      } else if(k === 'fav_games_updated_at'){
        try{ out.favsAt = parseInt(LS.getItem(k)) || null; }catch(e){}
      }
    }
    return out;
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

  function mergeHi(a, b){
    var all = asArray(a).concat(asArray(b));
    var seen = {};
    all = all.filter(function(row){
      if(!Array.isArray(row) || row.length < 2) return false;
      var k = (row[0]||'')+'|'+row[1]+'|'+(row[2]||'');
      if(seen[k]) return false; seen[k] = 1; return true;
    });
    all.sort(function(x,y){ return (Number(y[1])||0) - (Number(x[1])||0); });
    return all.slice(0, 15);
  }

  function mergeGh(a, b){
    var all = asArray(a).concat(asArray(b));
    var seen = {};
    all = all.filter(function(row){
      if(!row || typeof row !== 'object') return false;
      // hist.js uses _date; legacy rows may use finishedAt/date/ts
      var t = row._date || row.finishedAt || row.date || row.ts || JSON.stringify(row).slice(0,80);
      if(seen[t]) return false; seen[t] = 1; return true;
    });
    all.sort(function(x,y){
      var tx = x._date || x.finishedAt || x.date || x.ts || 0;
      var ty = y._date || y.finishedAt || y.date || y.ts || 0;
      return (ty > tx ? 1 : ty < tx ? -1 : 0);
    });
    return all.slice(0, 50);
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
    var ref = cloudRef(); if(!ref) return Promise.resolve({hi:{}, gh:{}, label:null, bank:null, rklists:null, favs:null, favsAt:null, isNew:false});
    return ref.get().then(function(doc){
      if(!doc.exists){
        console.log('[sync] pull: cloud doc empty (first sync)');
        return {hi:{}, gh:{}, label:null, bank:null, rklists:null, favs:null, favsAt:null, isNew:true};
      }
      var d = doc.data() || {};
      var result = { hi: hiFromFirestore(d.hi||{}), gh: d.gh||{}, label: d.label||null, bank: d.bank||null, rklists: d.rklists||null, favs: d.favs||null, favsAt: d.favsAt||null, isNew:false };
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

  function pushNow(){
    var ref = cloudRef(); if(!ref) return Promise.resolve();
    var snap = scanLocal();
    var doc = {
      hi: sanitizeForFirestore(hiToFirestore(snap.hi || {})),
      gh: sanitizeForFirestore(snap.gh || {}),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    var lbl = label();
    if(lbl) doc.label = lbl;
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
    console.log('[sync] push', {
      rklists_count: snap.rklists && snap.rklists.lists ? (Array.isArray(snap.rklists.lists) ? snap.rklists.lists.length : Object.keys(snap.rklists.lists).length) : 0,
      favs_count: Array.isArray(snap.favs) ? snap.favs.length : 'absent',
      hi_keys: Object.keys(snap.hi||{}).length,
      gh_keys: Object.keys(snap.gh||{}).length
    });
    // merge:true means fields not in `doc` are preserved on the cloud side.
    // This prevents the race where device A has empty local for some field
    // and pushes before device B's newly-saved data lands — merge:false
    // would wipe the cloud field entirely.
    return ref.set(doc, { merge: true }).catch(function(err){
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
    if(isPin()) schedulePush();
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
        if(remote.label && !label()) LS.setItem(LABEL_KEY, remote.label);
        if(remote.bank !== null && remote.bank !== undefined) try{ LS.setItem('casino_bank', String(remote.bank)); }catch(e){}
        var local   = scanLocal();
        var merged  = mergeSnapshots(local, remote);
        writeSnapshotToLocal(merged);
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
        if(remote.label && !label()) LS.setItem(LABEL_KEY, remote.label);
        if(remote.bank !== null && remote.bank !== undefined) try{ LS.setItem('casino_bank', String(remote.bank)); }catch(e){}
        var local  = scanLocal();
        var merged = mergeSnapshots(local, remote);
        writeSnapshotToLocal(merged);
        return pushNow();
      })
      .then(function(){
        setStatus('synced');
        try{ document.dispatchEvent(new CustomEvent('fghsync:updated')); }catch(e){}
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
    if(key.indexOf('hi_') !== 0 && key.indexOf('gh_') !== 0 && key !== 'casino_bank' && key !== 'rklists' && key !== 'fav_games') return;
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
          favs: remote.favs
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
          if(remote.label && !label()) LS.setItem(LABEL_KEY, remote.label);
          if(remote.bank !== null && remote.bank !== undefined) try{ LS.setItem('casino_bank', String(remote.bank)); }catch(e){}
          var local  = scanLocal();
          var merged = mergeSnapshots(local, remote);
          writeSnapshotToLocal(merged);
          return pushNow();
        })
        .then(function(){
          setStatus('synced');
          try{ document.dispatchEvent(new CustomEvent('fghsync:updated')); }catch(e){}
          notifyReady();
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

  window.FGHSync = {
    mode: mode, pin: pin, label: label,
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
    _scanLocal: scanLocal
  };

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
