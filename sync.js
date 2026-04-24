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
    var out = { hi: {}, gh: {}, bank: null, rklists: null };
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
      }
    }
    return out;
  }

  // ── Merge strategies ──────────────────────────────────────────────────
  function mergeHi(a, b){
    var all = (a||[]).concat(b||[]);
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
    var all = (a||[]).concat(b||[]);
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
    var out = { hi: {}, gh: {}, rklists: null };
    var keys = {};
    Object.keys(local.hi||{}).forEach(function(k){ keys[k]=1; });
    Object.keys(remote.hi||{}).forEach(function(k){ keys[k]=1; });
    Object.keys(keys).forEach(function(k){ out.hi[k] = mergeHi(local.hi&&local.hi[k], remote.hi&&remote.hi[k]); });
    keys = {};
    Object.keys(local.gh||{}).forEach(function(k){ keys[k]=1; });
    Object.keys(remote.gh||{}).forEach(function(k){ keys[k]=1; });
    Object.keys(keys).forEach(function(k){ out.gh[k] = mergeGh(local.gh&&local.gh[k], remote.gh&&remote.gh[k]); });
    out.rklists = mergeRkLists(local.rklists, remote.rklists);
    return out;
  }

  // Ranker lists are a flat collection: each list has its own id and
  // _modifiedAt timestamp. Merge by id, keeping the newer version of each.
  function mergeRkLists(a, b){
    if(!a && !b) return null;
    var byId = {};
    (a && a.lists || []).forEach(function(l){ if(l && l.id) byId[l.id] = l; });
    (b && b.lists || []).forEach(function(l){
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
  }

  // ── Firestore sanitization ────────────────────────────────────────────────
  // Firestore does not support arrays within arrays. This recursively converts
  // any array found inside another array into an indexed object: [1,2]→{i0:1,i1:2}
  function sanitizeForFirestore(val) {
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
      Object.keys(val).forEach(function(k) { out[k] = sanitizeForFirestore(val[k]); });
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
    var ref = cloudRef(); if(!ref) return Promise.resolve({hi:{}, gh:{}, label:null, bank:null, rklists:null, isNew:false});
    return ref.get().then(function(doc){
      if(!doc.exists) return {hi:{}, gh:{}, label:null, bank:null, rklists:null, isNew:true};
      var d = doc.data() || {};
      return { hi: hiFromFirestore(d.hi||{}), gh: d.gh||{}, label: d.label||null, bank: d.bank||null, rklists: d.rklists||null, isNew:false };
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
    var doc = {
      hi: hiToFirestore(snap.hi),
      gh: sanitizeForFirestore(snap.gh),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    var lbl = label();
    if(lbl) doc.label = lbl;
    if(snap.bank !== null && snap.bank !== undefined) doc.bank = snap.bank;
    if(snap.rklists) doc.rklists = sanitizeForFirestore(snap.rklists);
    return ref.set(doc, { merge: false });
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

  function noteWrite(key){
    if(!key) return;
    if(key.indexOf('hi_') !== 0 && key.indexOf('gh_') !== 0 && key !== 'casino_bank' && key !== 'rklists') return;
    if(isPin()) schedulePush();
  }

  // ── Bootstrap ─────────────────────────────────────────────────────────
  function boot(){
    var m = mode();
    if(m === 'pin' && PIN_RE.test(pin()||'')){
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
        .then(notifyReady)
        .catch(function(err){ console.warn('[sync] boot failed; staying local', err); notifyReady(); });
    } else {
      notifyReady();
    }
  }

  window.FGHSync = {
    mode: mode, pin: pin, label: label,
    signInWithPin: signInWithPin,
    setLabel: setLabel,
    signOut: signOut,
    continueAsGuest: continueAsGuest,
    onReady: onReady,
    noteWrite: noteWrite,
    _scanLocal: scanLocal
  };

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
