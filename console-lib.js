// ═══════════════════════════════════════════════════════════════════════════
// Console game library: your own NES / Super Nintendo / Genesis game files, shared by the home screen (one tile
// per game) and the console pages (games/nes.html, snes.html, genesis.html).
//
// On this device the files live in IndexedDB (gn_console: carts, states). Signed in with a PIN, they're also kept
// in the cloud (Firebase Storage) so every device signed in to the account has them:
//   roms/<lib>/<id>       the game file (id = SHA-1 of the file)
//   roms/<lib>/index.json {v, carts: {id: {sys, name, file, size, added}}, del: {id: at}}
// <lib> is a random 32-hex library key made the first time a game is added, kept as a synced setting
// (gn_console_lib), so only devices signed in to the account know where the games are. The storage rules allow
// reading and writing at exact paths only and never listing, so nobody can browse anyone's games.
// localStorage gn_console_idx caches the list ([{id, sys, name}]) so games.js can put a tile on the home screen
// for each game before anything loads; gn_console_vis {id: 0} holds what you've hidden from the home screen
// (a game id or a console: nes, snes, genesis), synced as a setting too.
// ═══════════════════════════════════════════════════════════════════════════
var ConsoleLib = (function () {
  'use strict';
  var BUCKET = 'familygames-da3e5.firebasestorage.app';
  var API = 'https://firebasestorage.googleapis.com/v0/b/' + BUCKET + '/o/', UP = API.slice(0, -1);   // (uploads go to .../o?name=)
  var LS = (function () { try { return window.localStorage; } catch (e) { return null; } })();
  function get(k) { try { return LS.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { LS.setItem(k, v); } catch (e) {} if (window.FGHSync && FGHSync.noteWrite) FGHSync.noteWrite(k); }
  function signedIn() { return !!(window.FGHSync && FGHSync.isPin && FGHSync.isPin()); }

  // ── This device (IndexedDB) ──
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
  function localAll() { return tx('carts', 'readonly', function (s) { return s.getAll(); }).then(function (l) { return l || []; }); }

  // ── The cloud copy ──
  function lib(make) {
    var k = get('gn_console_lib');
    if (!k && make && signedIn()) {
      var a = new Uint8Array(16); crypto.getRandomValues(a);
      k = Array.prototype.map.call(a, function (b) { return (b + 256).toString(16).slice(1); }).join('');
      set('gn_console_lib', k);
    }
    return signedIn() ? k : null;
  }
  function url(k, name, media) { return API + encodeURIComponent('roms/' + k + '/' + name) + (media ? '?alt=media' : ''); }
  function fetchIndex() {
    var k = lib(false); if (!k) return Promise.resolve(null);
    return fetch(url(k, 'index.json', true), { cache: 'no-store' }).then(function (r) {
      if (r.status === 404) return { v: 1, carts: {}, del: {} };
      if (!r.ok) throw new Error('index ' + r.status);
      return r.json();
    }).then(function (ix) { ix.carts = ix.carts || {}; ix.del = ix.del || {}; return ix; });
  }
  function putIndex(ix) {
    var k = lib(true); if (!k) return Promise.resolve();
    return fetch(UP + '?uploadType=media&name=' + encodeURIComponent('roms/' + k + '/index.json'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(ix) })
      .then(function (r) { if (!r.ok) throw new Error('save index ' + r.status); });
  }
  // read, change and write back the list (the newest edit of each game wins)
  function editIndex(fn) { return fetchIndex().then(function (ix) { if (!ix) return null; fn(ix); return putIndex(ix).then(function () { return ix; }); }); }
  function upload(c) {
    var k = lib(true); if (!k) return Promise.resolve(false);
    return fetch(UP + '?uploadType=media&name=' + encodeURIComponent('roms/' + k + '/' + c.id), { method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: c.data })
      .then(function (r) { if (!r.ok) throw new Error('upload ' + r.status); return true; });
  }
  function download(id, onProgress) {
    var k = lib(false); if (!k) return Promise.reject(new Error('not signed in'));
    return fetch(url(k, id, true)).then(function (r) {
      if (!r.ok) throw new Error('download ' + r.status);
      var total = +r.headers.get('content-length') || 0;
      if (!r.body || !r.body.getReader || !onProgress) return r.blob();
      var rd = r.body.getReader(), parts = [], got = 0;
      return (function pump() { return rd.read().then(function (x) { if (x.done) return new Blob(parts); parts.push(x.value); got += x.value.length; if (total) onProgress(got / total); return pump(); }); })();
    });
  }
  function remove(id) {
    var k = lib(false); if (!k) return Promise.resolve();
    return fetch(url(k, id), { method: 'DELETE' }).catch(function () {});
  }

  // ── The list everyone sees: this device's games plus the account's ──
  function meta(c) { return { sys: c.sys, name: c.name, file: c.file, size: c.size, added: c.added }; }
  function cache(list) {
    var l = list.map(function (c) { return { id: c.id, sys: c.sys, name: c.name }; }).sort(function (a, b) { return a.name.localeCompare(b.name); });
    var s = JSON.stringify(l); if (get('gn_console_idx') !== s) { try { LS.setItem('gn_console_idx', s); } catch (e) {} return true; }
    return false;
  }
  // everything: [{id, sys, name, file, size, added, played, local (on this device), data?}]; uploads any game only
  // this device has, and drops ones deleted on another device
  function list() {
    return Promise.all([localAll(), fetchIndex().catch(function () { return null; })]).then(function (r) {
      var loc = r[0], ix = r[1], by = {}, out = [], push = [];
      loc.forEach(function (c) { by[c.id] = c; c.local = true; });
      if (ix) {
        Object.keys(ix.carts).forEach(function (id) { if (!by[id]) { var m = ix.carts[id]; by[id] = { id: id, sys: m.sys, name: m.name, file: m.file, size: m.size, added: m.added, played: 0, local: false }; } else if (ix.carts[id].name) by[id].name = ix.carts[id].name; });
        loc.forEach(function (c) {
          if (ix.del[c.id] && ix.del[c.id] > (c.added || 0)) { delete by[c.id]; tx('carts', 'readwrite', function (s) { s.delete(c.id); }); }
          else if (!ix.carts[c.id]) push.push(c);
        });
        if (push.length) push.reduce(function (p, c) { return p.then(function () { return upload(c); }); }, Promise.resolve())
          .then(function () { return editIndex(function (x) { push.forEach(function (c) { x.carts[c.id] = meta(c); delete x.del[c.id]; }); }); })
          .catch(function (e) { console.warn('[consoles] cloud copy failed', e); });
      }
      Object.keys(by).forEach(function (id) { out.push(by[id]); });
      cache(out);
      return out;
    });
  }
  function save(c) {
    return tx('carts', 'readwrite', function (s) { s.put(c); }).then(function () {
      if (!signedIn()) return;
      return upload(c).then(function () { return editIndex(function (x) { x.carts[c.id] = meta(c); delete x.del[c.id]; }); })
        .catch(function (e) { console.warn('[consoles] cloud copy failed', e); });
    });
  }
  function rename(c) {
    return tx('carts', 'readwrite', function (s) { if (c.data) s.put(c); }).then(function () {
      return editIndex(function (x) { if (x.carts[c.id]) x.carts[c.id].name = c.name; }).catch(function () {});
    });
  }
  function drop(id) {
    return tx('carts', 'readwrite', function (s) { s.delete(id); }).then(function () {
      return tx('states', 'readwrite', function (s) { var r = s.index('id').openCursor(IDBKeyRange.only(id)); r.onsuccess = function () { var c = r.result; if (c) { c.delete(); c.continue(); } }; });
    }).then(function () {
      if (!signedIn()) return;
      return remove(id).then(function () { return editIndex(function (x) { delete x.carts[id]; x.del[id] = Date.now(); }); }).catch(function () {});
    });
  }
  // a game file for playing: from this device, or fetched from the account (and kept here)
  function file(id, onProgress) {
    return tx('carts', 'readonly', function (s) { return s.get(id); }).then(function (c) {
      if (c && c.data) return c;
      return fetchIndex().then(function (ix) {
        var m = ix && ix.carts[id]; if (!m) throw new Error('not found');
        return download(id, onProgress).then(function (blob) {
          var rec = { id: id, sys: m.sys, name: m.name, file: m.file, size: m.size, added: m.added, played: 0, data: blob };
          return tx('carts', 'readwrite', function (s) { s.put(rec); }).then(function () { return rec; });
        });
      });
    });
  }

  // ── What the home screen shows ──
  function vis() { try { return JSON.parse(get('gn_console_vis') || '{}') || {}; } catch (e) { return {}; } }
  function shown(id) { return vis()[id] !== 0; }
  function show(id, on) { var v = vis(); if (on) delete v[id]; else v[id] = 0; set('gn_console_vis', JSON.stringify(v)); }

  return { db: db, tx: tx, list: list, save: save, rename: rename, drop: drop, file: file, cache: cache, cloud: function () { return !!lib(false); },
    signedIn: signedIn, shown: shown, show: show, vis: vis };
})();
