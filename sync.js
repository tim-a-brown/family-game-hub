// ==== Family Game Hub  sync.js ====
// Transparent localStorage + Firestore mirror for hi_* (arcade-hi scores)
// and gh_* (game history) keys. Default behavior = identical to
// pre-sync app (pure localStorage). When a 4-digit PIN is active
// (localStorage.fgh_mode === 'pin'), writes ALSO mirror to Firestore
// pins/{pin}, and sign-in merges the cloud doc into local.
//
// Public API on window.FGHSync:
//   mode()                    -> 'pin' | 'guest' | null
//   pin()                     -> '1234' | null
//   signInWithPin(pin)        -> Promise<void>   (merge cloud -> local, then persist local -> cloud)
//   signOut()                 -> void            (clears mode; keeps local data)
//   continueAsGuest()         -> void            (sets mode=guest)
//   onReady(cb)               -> cb called once initial sync completes (or immediately in guest)
//
// Keys we care about:
//   hi_<game>  (array of [name, score, date])   arcade-hi.js
//   gh_<game>  (array of snapshot objects)      hist.js
(function(){
  'use strict';

  var LS = window.localStorage;
  var MODE_KEY = 'fgh_mode';
  var PIN_KEY  = 'fgh_pin';
  var PIN_RE   = /^[0-9]{4}$/;

  // ---- Public Firebase config (safe to ship; security is in rules) ----
  var firebaseConfig = {
    apiKey: "AIzaSyDmZ4AXZz1MJLiQi1sygbvigrpR5JcWkrQ",
    authDomain: "familygames-da3e5.firebaseapp.com",
    projectId: "familygames-da3e5",
    storageBucket: "familygames-da3e5.firebasestorage.app",
    messagingSenderId: "926415998661",
    appId: "1:926415998661:web:f8e56856d36af6ab202aac"
  };

  // ---- Firestore bootstrap (lazy; only when PIN mode) ----
  var _fb = null; // { app, db }
  var _readyResolvers = [];
  var _ready = false;

  function mode(){ return LS.getItem(MODE_KEY); }
  function pin(){ return LS.getItem(PIN_KEY); }
  function isPin(){ return mode() === 'pin' && PIN_RE.test(pin() || ''); }

  function notifyReady(){
    _ready = true;
    _readyResolvers.forEach(function(r){ try{ r(); }catch(e){} });
    _readyResolvers = [];
  }
  function onReady(cb){ if(_ready) try{cb();}catch(e){} else _readyResolvers.push(cb); }

  // ---- Firebase loader (compat SDK via CDN, no build step) ----
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
        var db = firebase.firestore();
        _fb = { app: app, db: db };
        return _fb;
      });
  }

  // ---- Scan localStorage for our managed keys and build a snapshot ----
  function scanLocal(){
    var out = { hi: {}, gh: {} };
    for(var i=0; i<LS.length; i++){
      var k = LS.key(i);
      if(!k) continue;
      if(k.indexOf('hi_') === 0){
        try{ out.hi[k.slice(3)] = JSON.parse(LS.getItem(k)) || []; }catch(e){}
      } else if(k.indexOf('gh_') === 0){
        try{ out.gh[k.slice(3)] = JSON.parse(LS.getItem(k)) || []; }catch(e){}
      }
    }
    return out;
  }

  // ---- Merge strategies ----
  // hi: array of [name, score, date]; keep top by score desc, cap 10 (matches existing behavior)
  function mergeHi(a, b){
    var all = (a||[]).concat(b||[]);
    // dedupe by name+score+date
    var seen = {};
    all = all.filter(function(row){
      if(!Array.isArray(row) || row.length < 2) return false;
      var k = (row[0]||'')+'|'+row[1]+'|'+(row[2]||'');
      if(seen[k]) return false; seen[k] = 1; return true;
    });
    all.sort(function(x,y){ return (Number(y[1])||0) - (Number(x[1])||0); });
    return all.slice(0, 10);
  }

  // gh: array of snapshot objects; union by timestamp/finishedAt; newest first; cap 50
  function mergeGh(a, b){
    var all = (a||[]).concat(b||[]);
    var seen = {};
    all = all.filter(function(row){
      if(!row || typeof row !== 'object') return false;
      var t = row.finishedAt || row.date || row.ts || JSON.stringify(row).slice(0,80);
      if(seen[t]) return false; seen[t] = 1; return true;
    });
    all.sort(function(x,y){
      var tx = x.finishedAt || x.date || x.ts || 0;
      var ty = y.finishedAt || y.date || y.ts || 0;
      return (ty > tx ? 1 : (ty < tx ? -1 : 0));
    });
    return all.slice(0, 50);
  }

  function mergeSnapshots(local, remote){
    var out = { hi: {}, gh: {} };
    var keys;
    // hi
    keys = {};
    Object.keys(local.hi||{}).forEach(function(k){ keys[k]=1; });
    Object.keys(remote.hi||{}).forEach(function(k){ keys[k]=1; });
    Object.keys(keys).forEach(function(k){ out.hi[k] = mergeHi(local.hi&&local.hi[k], remote.hi&&remote.hi[k]); });
    // gh
    keys = {};
    Object.keys(local.gh||{}).forEach(function(k){ keys[k]=1; });
    Object.keys(remote.gh||{}).forEach(function(k){ keys[k]=1; });
    Object.keys(keys).forEach(function(k){ out.gh[k] = mergeGh(local.gh&&local.gh[k], remote.gh&&remote.gh[k]); });
    return out;
  }

  function writeSnapshotToLocal(snap){
    Object.keys(snap.hi||{}).forEach(function(k){
      try{ LS.setItem('hi_'+k, JSON.stringify(snap.hi[k])); }catch(e){}
    });
    Object.keys(snap.gh||{}).forEach(function(k){
      try{ LS.setItem('gh_'+k, JSON.stringify(snap.gh[k])); }catch(e){}
    });
  }

  // ---- Firestore IO ----
  function cloudRef(){
    if(!isPin() || !_fb) return null;
    return _fb.db.collection('pins').doc(pin());
  }

  function pullCloud(){
    var ref = cloudRef(); if(!ref) return Promise.resolve({hi:{},gh:{}});
    return ref.get().then(function(doc){
      if(!doc.exists) return {hi:{},gh:{}};
      var d = doc.data() || {};
      return { hi: d.hi || {}, gh: d.gh || {} };
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
      pushNow().catch(function(err){ console.warn('[sync] push failed', err); });
    }, 1500);
  }

  function pushNow(){
    var ref = cloudRef(); if(!ref) return Promise.resolve();
    var snap = scanLocal();
    return ref.set({
      hi: snap.hi,
      gh: snap.gh,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: false });
  }

  // ---- Entry points ----
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
        var local = scanLocal();
        var merged = mergeSnapshots(local, remote);
        writeSnapshotToLocal(merged);
        return pushNow();
      })
      .then(function(){ notifyReady(); });
  }

  function signOut(){
    LS.removeItem(MODE_KEY);
    LS.removeItem(PIN_KEY);
    // keep local data as-is
  }

  // ---- Hook into localStorage writes transparently ----
  // We don't monkey-patch globally; instead hist.js and arcade-hi.js will
  // call FGHSync.noteWrite(key) after their setItem calls. That keeps changes
  // minimal and explicit.
  function noteWrite(key){
    if(!key) return;
    if(key.indexOf('hi_') !== 0 && key.indexOf('gh_') !== 0) return;
    if(isPin()) schedulePush();
  }

  // ---- Bootstrap on page load ----
  function boot(){
    var m = mode();
    if(m === 'pin' && PIN_RE.test(pin()||'')){
      ensureFirebase()
        .then(pullCloud)
        .then(function(remote){
          var local = scanLocal();
          var merged = mergeSnapshots(local, remote);
          writeSnapshotToLocal(merged);
          // best-effort push back in case local had newer stuff
          return pushNow();
        })
        .then(notifyReady)
        .catch(function(err){ console.warn('[sync] boot failed; staying local', err); notifyReady(); });
    } else {
      // guest or unset  ready immediately, no network
      notifyReady();
    }
  }

  window.FGHSync = {
    mode: mode,
    pin: pin,
    signInWithPin: signInWithPin,
    signOut: signOut,
    continueAsGuest: continueAsGuest,
    onReady: onReady,
    noteWrite: noteWrite,
    // exposed for gate/hub UI
    _scanLocal: scanLocal
  };

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
