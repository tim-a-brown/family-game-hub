// ═══════════════════════════════════════════════════════════════════════════
// Console game library: NES / Super Nintendo / Genesis / Atari 2600 game files, shared by the home screen (one
// cartridge tile per game) and the console pages (games/nes.html, snes.html, genesis.html, atari2600.html).
//
// Two kinds of games, both in Firebase Storage under a library key (32 random hex digits):
//   roms/<lib>/<id>               the game file (id = SHA-1 of the file)
//   roms/<lib>/label-<id>[-<v>].webp  its cartridge label (box art and logo), when it has one (art: v); or
//   roms/<lib>/label-<id>.jpg     a label the app made itself when the game was added (label: its file name)
//   roms/<lib>/index.json         {v, carts: {id: {sys, name, file, size, added, art?, label?}}, del: {id: at}}
// Games added in the app go to the house (Add for everyone) or to your own library (Just for me).
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
  // (art: the label's version, so a redrawn label gets a new name and never comes from an old cache)
  function artUrl(k, id, v) { return url(k, 'label-' + id + (v > 1 ? '-' + v : '') + '.webp', true); }
  function fetchIndex(k) {
    if (!k) return Promise.resolve(null);
    return fetch(url(k, 'index.json', true), { cache: 'no-store' }).then(function (r) {
      if (r.status === 404) return { v: 1, carts: {}, del: {} };
      if (!r.ok) throw new Error('index ' + r.status);
      return r.json();
    }).then(function (ix) { ix.carts = ix.carts || {}; ix.del = ix.del || {}; return ix; });
  }
  // a file into a library
  function put(k, name, body, type, keep) {
    return fetch(UP + '?uploadType=media&name=' + encodeURIComponent('roms/' + k + '/' + name), { method: 'POST', headers: { 'Content-Type': type }, body: body, keepalive: !!keep })
      .then(function (r) { if (!r.ok) throw new Error('upload ' + name + ' ' + r.status); return true; });
  }
  // read, change and write back a library's list (yours unless another is named; the newest edit of each game wins)
  function editAt(k, fn) { if (!k) return Promise.resolve(null); return fetchIndex(k).then(function (ix) { fn(ix); return put(k, 'index.json', JSON.stringify(ix), 'application/json').then(function () { return ix; }); }); }
  function editIndex(fn) { var k = lib(true); return k ? editAt(k, fn) : Promise.resolve(null); }
  function upload(c) { var k = lib(true); return k ? put(k, c.id, c.data, 'application/octet-stream') : Promise.resolve(false); }
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
    return { id: id, sys: m.sys, name: m.name, file: m.file, size: m.size, added: m.added, played: 0, local: false, lib: k, house: isHouse,
      art: m.label ? url(k, m.label, true) : m.art ? artUrl(k, id, m.art) : null };
  }
  // everything: [{id, sys, name, file, size, added, played, local (on this device), house, lib, art, data?}]; uploads
  // any game only this device has to your own library, and drops ones you deleted on another device
  function list() {
    return house().then(function (hk) {
      var own = lib(false);
      return Promise.all([localAll(), fetchIndex(own).catch(function () { return null; }), own === hk ? null : fetchIndex(hk).catch(function () { return null; }), hk]);
    }).then(function (r) {
      var loc = r[0], ix = r[1], hx = r[2], hk = r[3], own = lib(false), by = {}, out = [], push = [];
      // (offline, or a list that didn't come: the games kept on this device still show, and the home screen's tiles stay as they were)
      var reached = (!own || ix) && (!hk || own === hk || hx);
      if (own && own === hk) { hx = ix; ix = null; }   // (the house library's keeper: their own list is the house list)
      if (hx) Object.keys(hx.carts).forEach(function (id) { by[id] = entry(id, hx.carts[id], hk, true); });
      if (ix) Object.keys(ix.carts).forEach(function (id) { if (!by[id]) by[id] = entry(id, ix.carts[id], own, false); });
      loc.forEach(function (c) {
        var cloud = by[c.id];
        if (cloud) {
          cloud.local = true; cloud.data = c.data; cloud.played = c.played || 0;
          if (cloud.art && c.art !== cloud.art) { c.art = cloud.art; tx('carts', 'readwrite', function (s) { s.put(c); }); }   // (its label, for offline)
          return;
        }
        if (c.house && signedIn() && c.lib === hk && !reached) { c.local = true; by[c.id] = c; return; }
        if (c.house || (c.lib && !signedIn())) return;   // a house game kept here, from before signing out
        if (ix && ix.del[c.id] && ix.del[c.id] > (c.added || 0)) { tx('carts', 'readwrite', function (s) { s.delete(c.id); }); return; }
        c.local = true; by[c.id] = c;
        if (ix && !ix.carts[c.id]) push.push(c);
      });
      if (push.length) push.reduce(function (p, c) { return p.then(function () { return upload(c); }); }, Promise.resolve())
        .then(function () { return editIndex(function (x) { push.forEach(function (c) { x.carts[c.id] = meta(c); delete x.del[c.id]; }); }); })
        .catch(function (e) { console.warn('[consoles] cloud copy failed', e); });
      Object.keys(by).forEach(function (id) { out.push(by[id]); });
      if (reached) cache(out);
      return out;
    });
  }
  // a new game: on this device, and when signed in in the house (opts.house: everyone has it) or your own library,
  // with its label picture (opts.label, a JPEG) when it has one
  function save(c, opts) {
    opts = opts || {};
    return tx('carts', 'readwrite', function (s) { s.put(strip(c)); }).then(function () {
      if (!signedIn()) return;
      var hk = houseKey(), k = opts.house && hk ? hk : lib(true), lab = 'label-' + c.id + '.jpg';
      return put(k, c.id, c.data, 'application/octet-stream')
        .then(function () { return opts.label ? put(k, lab, opts.label, 'image/jpeg') : null; })
        .then(function () { return editAt(k, function (x) { var m = meta(c); if (opts.label) m.label = lab; x.carts[c.id] = m; delete x.del[c.id]; }); })
        .then(function () { c.lib = k; c.house = k === hk; if (opts.label) c.art = url(k, lab, true); return true; });
    });
  }
  // a new label picture for a game already on the shelf (Find cartridge art), in whichever library has the game
  function setLabel(c, blob) {
    var k = c.lib || lib(true), lab = 'label-' + c.id + '-' + Date.now().toString(36) + '.jpg';
    if (!k) return Promise.reject(new Error('not signed in'));
    return put(k, lab, blob, 'image/jpeg')
      .then(function () { return editAt(k, function (x) { if (!x.carts[c.id]) x.carts[c.id] = meta(c); x.carts[c.id].label = lab; }); })
      .then(function () { c.lib = k; c.art = url(k, lab, true); return c.art; });
  }
  function rename(c) {
    return tx('carts', 'readwrite', function (s) { if (c.data) s.put(strip(c)); }).then(function () {
      if (!signedIn()) return;   // (a house game is renamed for everyone)
      return editAt(c.lib || lib(true), function (x) { if (x.carts[c.id]) x.carts[c.id].name = c.name; }).catch(function () {});
    });
  }
  function drop(id, c) {
    return tx('carts', 'readwrite', function (s) { s.delete(id); }).then(function () {
      return tx('states', 'readwrite', function (s) { var r = s.index('id').openCursor(IDBKeyRange.only(id)); r.onsuccess = function () { var c = r.result; if (c) { c.delete(); c.continue(); } }; });
    }).then(function () {
      if (!signedIn()) return;
      if (c && c.house) {   // a house game: gone for everyone
        var hk = c.lib; return editAt(hk, function (x) { delete x.carts[id]; x.del[id] = Date.now(); })
          .then(function () { return fetch(url(hk, id), { method: 'DELETE' }); }).catch(function () {});
      }
      return remove(id).then(function () { return editIndex(function (x) { delete x.carts[id]; x.del[id] = Date.now(); }); }).catch(function () {});
    });
  }
  // what goes in IndexedDB: the game, without the list's own bookkeeping (its label's address stays, for offline)
  function strip(c) { var o = {}; for (var k in c) if (k !== 'local') o[k] = c[k]; return o; }
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

  // the game file fetched again from your account (the copy kept on this device wouldn't read), and kept in its place
  function refetch(c, onProgress) {
    if (!c.lib) return Promise.reject(new Error('not in your account'));
    return download(c.lib, c.id, onProgress).then(function (blob) {
      var rec = strip(c); rec.data = blob;
      return tx('carts', 'readwrite', function (s) { s.put(rec); }).then(function () { return rec; }, function () { return rec; });
    });
  }

  // every game in the list that isn't on this device yet, one after another, with its label (the service worker
  // keeps labels): onProgress({n (done so far), total, frac (of the one coming down), c, landed}); resolves to how
  // many couldn't be fetched
  function saveAll(games, onProgress) {
    var todo = games.filter(function (c) { return !c.local && c.lib; }), failed = 0;
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}
    return todo.reduce(function (p, c, i) {
      return p.then(function () {
        if (onProgress) onProgress({ n: i, total: todo.length, frac: 0, c: c });
        return file(c, function (f) { if (onProgress) onProgress({ n: i, total: todo.length, frac: f, c: c }); })
          .then(function () { c.local = true; return c.art ? fetch(c.art).catch(function () {}) : null; })
          .then(function () { if (onProgress) onProgress({ n: i + 1, total: todo.length, frac: 1, c: c, landed: true }); })
          .catch(function (e) { failed++; console.warn('[consoles] download failed', c.name, e); });
      });
    }, Promise.resolve()).then(function () { if (onProgress) onProgress({ n: todo.length, total: todo.length, frac: 1, done: true }); return failed; });
  }
  function mbOf(games) { return games.reduce(function (t, c) { return t + (c.local ? 0 : c.size || 0); }, 0); }

  // ── What the home screen shows ──
  function vis() { try { return JSON.parse(get('gn_console_vis') || '{}') || {}; } catch (e) { return {}; } }
  function shown(id) { return vis()[id] !== 0; }
  function show(id, on) { showMany([id], on); }
  function showMany(ids, on) { var v = vis(); ids.forEach(function (id) { if (on) delete v[id]; else v[id] = 0; }); set('gn_console_vis', JSON.stringify(v)); }

  // ── Saves that follow the PIN ──
  // Save states (the three slots, and the automatic one from when you left) and each game's own battery save go up
  // to your library as well: roms/<lib>/sv-<id>-<slot>.bin (gzipped when the browser can: .gz) with its picture
  // sv-<id>-<slot>.jpg, and sram-<name>.srm. Which copy is newest is kept in two synced keys (sync.js "Everything else
  // follows the PIN"): console_saves {'<id>:<slot>': {at, z}} and console_sram {<name>: {at, path}}. What this device
  // has already sent or taken is in console_local {sv: {key: at}, sram: {name: {at, h}}} (this device only).
  function jget(k) { try { return JSON.parse(get(k) || '{}') || {}; } catch (e) { return {}; } }
  function jset(k, o) { set(k, JSON.stringify(o)); }
  function mine() { var o = jget('console_local'); o.sv = o.sv || {}; o.sram = o.sram || {}; return o; }
  function hashOf(a) { var h = 0x811c9dc5; for (var i = 0; i < a.length; i++) h = Math.imul(h ^ a[i], 16777619); return (h >>> 0).toString(36) + a.length.toString(36); }
  function zip(a) {
    if (!window.CompressionStream) return Promise.resolve({ b: a, z: 0 });
    return new Response(new Blob([a]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer().then(function (b) { return { b: new Uint8Array(b), z: 1 }; }, function () { return { b: a, z: 0 }; });
  }
  function unzip(buf, z) {
    if (!z) return Promise.resolve(new Uint8Array(buf));
    return new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer().then(function (b) { return new Uint8Array(b); });
  }
  function getFile(k, name) { return fetch(url(k, name, true), { cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error('save ' + r.status); return r; }); }
  function within(p, ms) { return Promise.race([p, new Promise(function (ok) { setTimeout(function () { ok(null); }, ms); })]); }
  // a save state (as stored on this device) up to the library; then the synced list says it's the newest
  function stateUp(st) {
    var k = lib(true); if (!k || !st || !st.data) return Promise.resolve(false);
    var base = 'sv-' + st.id + '-' + st.slot, my = mine();
    if ((my.sv[st.key] || 0) >= st.at) return Promise.resolve(true);
    return zip(st.data).then(function (zd) {
      return put(k, base + '.bin', zd.b, 'application/octet-stream')
        .then(function () { return st.img ? put(k, base + '.jpg', st.img, 'text/plain') : null; })
        .then(function () {
          var ix = jget('console_saves'); if ((ix[st.key] && ix[st.key].at || 0) < st.at) { ix[st.key] = { at: st.at, z: zd.z }; jset('console_saves', ix); }
          my = mine(); my.sv[st.key] = st.at; jset('console_local', my);
          return true;
        });
    }).catch(function (e) { console.warn('[console] save not sent', e); return false; });
  }
  // newer save states for one game from the library onto this device
  function statesDown(id) {
    var k = lib(false); if (!k) return Promise.resolve(0);
    var ix = jget('console_saves'), keys = Object.keys(ix).filter(function (x) { return x.indexOf(id + ':') === 0; });
    return tx('states', 'readonly', function (s) { return s.index('id').getAll(id); }).then(function (have) {
      var at = {}; (have || []).forEach(function (h) { at[h.key] = h.at || 0; });
      return Promise.all(keys.filter(function (x) { return (ix[x].at || 0) > (at[x] || 0); }).map(function (x) {
        var slot = x.slice(id.length + 1), base = 'sv-' + id + '-' + slot;
        return getFile(k, base + '.bin').then(function (r) { return r.arrayBuffer(); }).then(function (b) { return unzip(b, ix[x].z); }).then(function (data) {
          return getFile(k, base + '.jpg').then(function (r) { return r.text(); }, function () { return null; }).then(function (img) {
            var st = { key: x, id: id, slot: /^\d+$/.test(slot) ? +slot : slot, at: ix[x].at, img: img, data: data };
            return tx('states', 'readwrite', function (s) { s.put(st); }).then(function () { var my = mine(); my.sv[x] = st.at; jset('console_local', my); return 1; });
          });
        }).catch(function (e) { console.warn('[console] save not fetched', x, e); return 0; });
      })).then(function (n) { return n.reduce(function (a, b) { return a + b; }, 0); });
    });
  }
  // saves made here that never got sent (the app was closed first): send them now
  function statesPending() {
    if (!lib(false)) return Promise.resolve();
    var my = mine();
    return tx('states', 'readonly', function (s) { return s.getAll(); }).then(function (all) {
      return (all || []).filter(function (st) { return st.at > (my.sv[st.key] || 0) && !/^net-/.test(st.id); }).reduce(function (p, st) { return p.then(function () { return stateUp(st); }); }, Promise.resolve());
    }).catch(function () {});
  }
  // the game's own battery save, when it changed
  function sramUp(name, path, data) {
    var k = lib(true); if (!k || !data || !data.length || /^net-/.test(name)) return Promise.resolve(false);
    var h = hashOf(data), my = mine(); if (my.sram[name] && my.sram[name].h === h) return Promise.resolve(true);
    var at = Date.now();
    return put(k, 'sram-' + name + '.srm', data, 'application/octet-stream', data.length < 60000).then(function () {
      var ix = jget('console_sram'); ix[name] = { at: at, path: path }; jset('console_sram', ix);
      my = mine(); my.sram[name] = { at: at, h: h }; jset('console_local', my);
      return true;
    }).catch(function (e) { console.warn('[console] battery save not sent', e); return false; });
  }
  // a newer battery save from another device: {path, data}, to put in place before the game starts
  function sramDown(name) {
    var k = lib(false), ix = jget('console_sram')[name], my = mine();
    if (!k || !ix || !ix.path || (my.sram[name] && my.sram[name].at >= ix.at)) return Promise.resolve(null);
    return getFile(k, 'sram-' + name + '.srm').then(function (r) { return r.arrayBuffer(); }).then(function (b) {
      var data = new Uint8Array(b);
      return { path: ix.path, data: data, done: function () { var m = mine(); m.sram[name] = { at: ix.at, h: hashOf(data) }; jset('console_local', m); } };
    }).catch(function (e) { console.warn('[console] battery save not fetched', e); return null; });
  }

  return { refetch: refetch, db: db, tx: tx, list: list, stateUp: stateUp, statesDown: statesDown, statesPending: statesPending, sramUp: sramUp, sramDown: sramDown, within: within, save: save, saveAll: saveAll, toFetch: mbOf, setLabel: setLabel, rename: rename, drop: drop, file: file, cache: cache, strip: strip, houseKey: houseKey,
    cloud: function () { return !!(lib(false) || houseKey()); }, signedIn: signedIn, shown: shown, show: show, showMany: showMany, vis: vis };
})();
