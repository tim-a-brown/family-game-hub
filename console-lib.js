// ═══════════════════════════════════════════════════════════════════════════
// Console game library: NES / Super Nintendo / Genesis / Atari 2600 game files, shared by the home screen (one
// cartridge tile per game) and the console pages (games/nes.html, snes.html, genesis.html, atari2600.html).
//
// Two kinds of games, both in Firebase Storage under a library key (32 random hex digits):
//   roms/<lib>/<id>               the game file (id = SHA-1 of the file)
//   roms/<lib>/label-<id>.webp    its cartridge label (box art and logo), when it has one
//   roms/<lib>/index.json         {v, carts: {id: {sys, name, file, size, added, art?}}, del: {id: at}}
// - The house games: everyone signed in with a PIN has them. Firestore house/consoles {lib} names their library;
//   it's read only when signed in, and kept on the device in gn_console_house.
// - Your own games, added on a console's shelf: on this device in IndexedDB (gn_console: carts, states), and when
//   signed in also in your account's own library (gn_console_lib, a synced setting), so every device has them.
// The storage rules allow reading and writing at exact paths only and never listing, so nobody can browse them.
// localStorage gn_console_idx caches the list ([{id, sys, name, art, h (a house game)}]) so games.js can put a tile on the home
// screen for each game before anything loads; gn_console_vis {id: 0} holds what you've hidden from the home screen
// (by game id), synced as a setting too.
// ═══════════════════════════════════════════════════════════════════════════
var ConsoleLib = (function () {
  'use strict';
  var BUCKET = 'familygames-da3e5.firebasestorage.app';
  var API = 'https://firebasestorage.googleapis.com/v0/b/' + BUCKET + '/o/', UP = API.slice(0, -1);   // (uploads go to .../o?name=)
  var HOUSE = 'https://firestore.googleapis.com/v1/projects/familygames-da3e5/databases/(default)/documents/house/consoles?key=AIzaSyDmZ4AXZz1MJLiQi1sygbvigrpR5JcWkrQ';
  var LS = (function () { try { return window.localStorage; } catch (e) { return null; } })();
  function get(k) { try { return LS.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { LS.setItem(k, v); } catch (e) {} if (window.FGHSync && FGHSync.noteWrite) FGHSync.noteWrite(k); }
  function signedIn() { return !!(window.FGHSync && FGHSync.isPin && FGHSync.isPin()); }
  var KEY_RE = /^[0-9a-f]{32}$/;

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

  // ── The libraries in the cloud ──
  function lib(make) {
    var k = get('gn_console_lib');
    if (!k && make && signedIn()) {
      var a = new Uint8Array(16); crypto.getRandomValues(a);
      k = Array.prototype.map.call(a, function (b) { return (b + 256).toString(16).slice(1); }).join('');
      set('gn_console_lib', k);
    }
    return signedIn() ? k : null;
  }
  // the house library's key (signed in only)
  function house() {
    if (!signedIn()) return Promise.resolve(null);
    return fetch(HOUSE, { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
      var k = d && d.fields && d.fields.lib && d.fields.lib.stringValue;
      if (k && KEY_RE.test(k)) { try { LS.setItem('gn_console_house', k); } catch (e) {} return k; }
      return houseKey();
    }, function () { return houseKey(); });
  }
  function houseKey() { var k = get('gn_console_house'); return signedIn() && k && KEY_RE.test(k) ? k : null; }
  function url(k, name, media) { return API + encodeURIComponent('roms/' + k + '/' + name) + (media ? '?alt=media' : ''); }
  function artUrl(k, id) { return url(k, 'label-' + id + '.webp', true); }
  function fetchIndex(k) {
    if (!k) return Promise.resolve(null);
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
  // read, change and write back your own list (the newest edit of each game wins)
  function editIndex(fn) { return fetchIndex(lib(false)).then(function (ix) { if (!ix) return null; fn(ix); return putIndex(ix).then(function () { return ix; }); }); }
  function upload(c) {
    var k = lib(true); if (!k) return Promise.resolve(false);
    return fetch(UP + '?uploadType=media&name=' + encodeURIComponent('roms/' + k + '/' + c.id), { method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: c.data })
      .then(function (r) { if (!r.ok) throw new Error('upload ' + r.status); return true; });
  }
  function download(k, id, onProgress) {
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

  // ── The list everyone sees: the house games, plus this device's and your account's own ──
  function meta(c) { return { sys: c.sys, name: c.name, file: c.file, size: c.size, added: c.added }; }
  function cache(list) {
    var l = list.map(function (c) { var o = { id: c.id, sys: c.sys, name: c.name }; if (c.art) o.art = c.art; if (c.house) o.h = 1; return o; }).sort(function (a, b) { return a.name.localeCompare(b.name); });
    var s = JSON.stringify(l); if (get('gn_console_idx') !== s) { try { LS.setItem('gn_console_idx', s); } catch (e) {} return true; }
    return false;
  }
  function entry(id, m, k, isHouse) {
    return { id: id, sys: m.sys, name: m.name, file: m.file, size: m.size, added: m.added, played: 0, local: false, lib: k, house: isHouse, art: m.art ? artUrl(k, id) : null };
  }
  // everything: [{id, sys, name, file, size, added, played, local (on this device), house, lib, art, data?}]; uploads
  // any game only this device has to your own library, and drops ones you deleted on another device
  function list() {
    return house().then(function (hk) {
      var own = lib(false);
      return Promise.all([localAll(), fetchIndex(own).catch(function () { return null; }), own === hk ? null : fetchIndex(hk).catch(function () { return null; }), hk]);
    }).then(function (r) {
      var loc = r[0], ix = r[1], hx = r[2], hk = r[3], own = lib(false), by = {}, out = [], push = [];
      if (own && own === hk) { hx = ix; ix = null; }   // (the house library's keeper: their own list is the house list)
      if (hx) Object.keys(hx.carts).forEach(function (id) { by[id] = entry(id, hx.carts[id], hk, true); });
      if (ix) Object.keys(ix.carts).forEach(function (id) { if (!by[id]) by[id] = entry(id, ix.carts[id], own, false); });
      loc.forEach(function (c) {
        var cloud = by[c.id];
        if (cloud) { cloud.local = true; cloud.data = c.data; cloud.played = c.played || 0; return; }
        if (c.house || (c.lib && !signedIn())) return;   // a house game kept here, from before signing out
        if (ix && ix.del[c.id] && ix.del[c.id] > (c.added || 0)) { tx('carts', 'readwrite', function (s) { s.delete(c.id); }); return; }
        c.local = true; by[c.id] = c;
        if (ix && !ix.carts[c.id]) push.push(c);
      });
      if (push.length) push.reduce(function (p, c) { return p.then(function () { return upload(c); }); }, Promise.resolve())
        .then(function () { return editIndex(function (x) { push.forEach(function (c) { x.carts[c.id] = meta(c); delete x.del[c.id]; }); }); })
        .catch(function (e) { console.warn('[consoles] cloud copy failed', e); });
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
    return tx('carts', 'readwrite', function (s) { if (c.data) s.put(strip(c)); }).then(function () {
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
  // what goes in IndexedDB: the game, without the list's own bookkeeping
  function strip(c) { var o = {}; for (var k in c) if (k !== 'local' && k !== 'art') o[k] = c[k]; return o; }
  // a game file for playing: from this device, or fetched from its library (and kept here)
  function file(c, onProgress) {
    return tx('carts', 'readonly', function (s) { return s.get(c.id); }).then(function (have) {
      if (have && have.data) return have;
      if (!c.lib) throw new Error('not found');
      return download(c.lib, c.id, onProgress).then(function (blob) {
        var rec = strip(c); rec.data = blob; rec.played = 0;
        return tx('carts', 'readwrite', function (s) { s.put(rec); }).then(function () { return rec; });
      });
    });
  }

  // ── What the home screen shows ──
  function vis() { try { return JSON.parse(get('gn_console_vis') || '{}') || {}; } catch (e) { return {}; } }
  function shown(id) { return vis()[id] !== 0; }
  function show(id, on) { var v = vis(); if (on) delete v[id]; else v[id] = 0; set('gn_console_vis', JSON.stringify(v)); }

  return { db: db, tx: tx, list: list, save: save, rename: rename, drop: drop, file: file, cache: cache, strip: strip,
    cloud: function () { return !!(lib(false) || houseKey()); }, signedIn: signedIn, shown: shown, show: show, vis: vis };
})();
