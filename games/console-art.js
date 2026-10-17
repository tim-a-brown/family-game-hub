// ═══════════════════════════════════════════════════════════════════════════
// Console game art: what a game file is, and its cartridge label, worked out on the device when a game is added.
//
//   ConsoleArt.unpack(file) -> Promise<{name, bytes}>   the game inside a .zip (or the file itself)
//   ConsoleArt.identify(sys, bytes, fileName) -> Promise<{name, title, europe} | null>
//       By the file's CRC32 in the No-Intro list of every released game (../data/consoles/<sys>.json, {crc: name},
//       made from libretro-database), the way emulators do it; NES files are checked without their 16-byte header,
//       SNES without a copier's 512-byte one. When the data doesn't match (a different dump), by the name instead.
//   ConsoleArt.art(sys, name) -> Promise<{logo, box}>   the game's logo and box art (images, or null) from the
//       libretro thumbnails on GitHub, which anyone may load
//   ConsoleArt.label(box, logo) -> Promise<Blob|null>   the label: the box art softened and dimmed behind the logo
//       (or the box art itself when there's no logo), 360 x 270, a JPEG; null with neither
// ═══════════════════════════════════════════════════════════════════════════
var ConsoleArt = (function () {
  'use strict';
  var REPO = { nes: 'Nintendo_-_Nintendo_Entertainment_System', snes: 'Nintendo_-_Super_Nintendo_Entertainment_System', genesis: 'Sega_-_Mega_Drive_-_Genesis', atari2600: 'Atari_-_2600' };
  var RAW = 'https://raw.githubusercontent.com/libretro-thumbnails/';

  // ── The file ──
  var CRC = (function () { var t = new Uint32Array(256); for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc32(b) { var c = 0xffffffff; for (var i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return ((c ^ 0xffffffff) >>> 0).toString(16).padStart(8, '0'); }
  var ROM_EXT = /\.(nes|fds|unf|unif|sfc|smc|fig|swc|bs|md|gen|smd|bin|a26)$/i;
  // the biggest game file in a zip (stored, or deflated: DecompressionStream does the inflating)
  function unpack(file) {
    return file.arrayBuffer().then(function (buf) {
      var b = new Uint8Array(buf);
      if (!/\.zip$/i.test(file.name) || b[0] !== 0x50 || b[1] !== 0x4b) return { name: file.name, bytes: b };
      var v = new DataView(buf), e = -1;
      for (var i = b.length - 22; i >= Math.max(0, b.length - 65557); i--) if (v.getUint32(i, true) === 0x06054b50) { e = i; break; }
      if (e < 0) return { name: file.name, bytes: b };
      var n = v.getUint16(e + 10, true), p = v.getUint32(e + 16, true), best = null;
      for (var k = 0; k < n; k++) {
        var method = v.getUint16(p + 10, true), csize = v.getUint32(p + 20, true), size = v.getUint32(p + 24, true);
        var nl = v.getUint16(p + 28, true), xl = v.getUint16(p + 30, true), cl = v.getUint16(p + 32, true), off = v.getUint32(p + 42, true);
        var fname = new TextDecoder().decode(b.subarray(p + 46, p + 46 + nl));
        if (ROM_EXT.test(fname) && (!best || size > best.size)) best = { name: fname.split('/').pop(), method: method, csize: csize, size: size, off: off };
        p += 46 + nl + xl + cl;
      }
      if (!best) return { name: file.name, bytes: b };
      var start = best.off + 30 + v.getUint16(best.off + 26, true) + v.getUint16(best.off + 28, true), data = b.subarray(start, start + best.csize);
      if (best.method === 0) return { name: best.name, bytes: data.slice() };
      if (best.method !== 8 || typeof DecompressionStream === 'undefined') return { name: file.name, bytes: b };
      return new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer()
        .then(function (out) { return { name: best.name, bytes: new Uint8Array(out) }; }, function () { return { name: file.name, bytes: b }; });
    });
  }

  // ── Which game ──
  var DB = {};
  function db(sys) {
    if (!DB[sys]) DB[sys] = fetch('../data/consoles/' + sys + '.json').then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { delete DB[sys]; return {}; });
    return DB[sys];
  }
  // "Legend of Zelda, The (USA) (Rev 1)" -> "The Legend of Zelda"; "Bases Loaded II - Second Season" -> "Bases Loaded II: Second Season"
  function title(name) {
    var t = name.replace(/\s*[\(\[][^\)\]]*[\)\]]/g, '').trim();
    t = t.replace(/^(.*), (The|A|An)( - .*)?$/i, function (m, a, b, c) { return b + ' ' + a + (c || ''); });
    t = t.replace(/ - /g, ': ');
    // small words stay small after the first ("Sonic The Hedgehog" -> "Sonic the Hedgehog")
    return t.replace(/([^\s:]) (The|Of|And|In|On|At|To|For|A|An)\b/g, function (m, c, w) { return c + ' ' + w.toLowerCase(); });
  }
  var ROMAN = { ii: '2', iii: '3', iv: '4', v: '5', vi: '6', vii: '7', viii: '8' };
  function norm(s) {
    return title(s.replace(/\.[a-z0-9]{1,4}$/i, '')).toLowerCase().replace(/^the /, '').replace(/&/g, 'and')
      .replace(/\b(ii|iii|iv|v|vi|vii|viii)\b/g, function (r) { return ROMAN[r]; }).replace(/[^a-z0-9]+/g, '');
  }
  // the release to prefer when only the name is known: American, then worldwide, then anything
  function rank(n) { return /\(USA\)/.test(n) ? 0 : /\(World\)/.test(n) ? 1 : /USA/.test(n) ? 2 : /\(Europe\)/.test(n) ? 4 : 3; }
  function bad(n) { return /\((Beta|Proto|Sample|Demo|Pirate|Unl)/i.test(n); }
  function identify(sys, bytes, fileName) {
    return db(sys).then(function (idx) {
      var b = bytes;
      if (sys === 'nes' && b[0] === 0x4e && b[1] === 0x45 && b[2] === 0x53 && b[3] === 0x1a) b = b.subarray(16);
      if (sys === 'snes' && b.length % 1024 === 512) b = b.subarray(512);
      var name = idx[crc32(b)], how = 'data';
      if (!name) {
        how = 'name';
        var want = norm(fileName), hits = [];
        for (var k in idx) { var n = idx[k]; if (!bad(n) && norm(n) === want) hits.push(n); }
        hits.sort(function (a, c) { return rank(a) - rank(c) || a.length - c.length; });
        name = hits[0];
      }
      if (!name) return null;
      return { name: name, title: title(name), how: how, europe: /\((Europe|Germany|France|Spain|Italy|Australia|Sweden)[,)]/.test(name) && !/USA|World|Japan/.test(name), all: idx };
    });
  }

  // ── The art ──
  // a thumbnail by its release name (the archive names files after No-Intro, with &*/:`<>?\|" made _); some files
  // are links that just hold the name of another file
  function thumb(sys, kind, name, hops) {
    var safe = name.replace(/[&*\/:`<>?\\|"]/g, '_');
    return fetch(RAW + REPO[sys] + '/master/' + kind + '/' + encodeURIComponent(safe + '.png').replace(/%2F/g, '/'))
      .then(function (r) { return r.ok ? r.blob() : null; })
      .then(function (blob) {
        if (!blob) return null;
        return blob.slice(0, 4).arrayBuffer().then(function (h) {
          var u = new Uint8Array(h);
          if (u[0] === 0x89 && u[1] === 0x50) return blob;
          if ((hops || 0) > 2 || blob.size > 300) return null;
          return blob.text().then(function (t) { return thumb(sys, kind, t.trim().replace(/\.png$/i, ''), (hops || 0) + 1); });
        });
      }).catch(function () { return null; });
  }
  function image(blob) {
    if (!blob) return Promise.resolve(null);
    return new Promise(function (ok) { var im = new Image(), u = URL.createObjectURL(blob); im.onload = function () { ok(im); }; im.onerror = function () { ok(null); }; im.src = u; });
  }
  // the game's own release first, then its other releases (the art is often filed under one of them)
  function art(sys, id) {
    var names = [id.name];
    for (var k in id.all) { var n = id.all[k]; if (n !== id.name && !bad(n) && title(n) === id.title && names.indexOf(n) < 0) names.push(n); }
    names = [names[0]].concat(names.slice(1).sort(function (a, c) { return rank(a) - rank(c); })).slice(0, 6);
    function first(kind) { return names.reduce(function (p, n) { return p.then(function (got) { return got || thumb(sys, kind, n); }); }, Promise.resolve(null)); }
    return Promise.all([first('Named_Logos').then(image), first('Named_Boxarts').then(image)]).then(function (r) { return { logo: r[0], box: r[1] }; });
  }

  // ── The label ──
  var W = 360, H = 270;
  function cover(c, im, w, h, cy) {   // draw an image to fill w x h, cropping (cy: where to centre vertically, 0-1)
    var s = Math.max(w / im.width, h / im.height), dw = im.width * s, dh = im.height * s;
    c.drawImage(im, (w - dw) / 2, (h - dh) * (cy == null ? .5 : cy), dw, dh);
  }
  function trim(im) {   // the logo without its empty margins
    var cv = document.createElement('canvas'); cv.width = im.width; cv.height = im.height;
    var x = cv.getContext('2d'); x.drawImage(im, 0, 0);
    var d = x.getImageData(0, 0, cv.width, cv.height).data, x0 = cv.width, y0 = cv.height, x1 = -1, y1 = -1, lum = 0, n = 0;
    for (var y = 0; y < cv.height; y++) for (var i = 0; i < cv.width; i++) {
      var p = (y * cv.width + i) * 4, a = d[p + 3];
      if (a > 24) { if (i < x0) x0 = i; if (i > x1) x1 = i; if (y < y0) y0 = y; if (y > y1) y1 = y; lum += (d[p] * .3 + d[p + 1] * .59 + d[p + 2] * .11) * a / 255; n += a / 255; }
    }
    if (x1 < 0) return null;
    var out = document.createElement('canvas'); out.width = x1 - x0 + 1; out.height = y1 - y0 + 1;
    out.getContext('2d').drawImage(cv, x0, y0, out.width, out.height, 0, 0, out.width, out.height);
    out.lum = n ? lum / n : 255;
    return out;
  }
  function label(box, logo) {
    if (!box && !logo) return Promise.resolve(null);
    var cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    var c = cv.getContext('2d');
    c.fillStyle = '#121216'; c.fillRect(0, 0, W, H);
    var lg = logo ? trim(logo) : null;
    if (box && !lg) cover(c, box, W, H, .5);   // no logo: the box art itself (it carries the logo)
    else {
      if (box) {   // softened: drawn tiny, then stretched back up (works on every browser, unlike canvas blur)
        var sm = document.createElement('canvas'); sm.width = 40; sm.height = 30; cover(sm.getContext('2d'), box, 40, 30, .62);
        var md = document.createElement('canvas'); md.width = 120; md.height = 90; var mx = md.getContext('2d'); mx.imageSmoothingQuality = 'high'; mx.drawImage(sm, 0, 0, 120, 90);
        c.imageSmoothingQuality = 'high'; c.drawImage(md, 0, 0, W, H);
        c.fillStyle = 'rgba(0,0,0,.45)'; c.fillRect(0, 0, W, H);
      }
      var g = c.createRadialGradient(W / 2, H / 2, H * .2, W / 2, H / 2, W * .7); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.55)');
      c.fillStyle = g; c.fillRect(0, 0, W, H);
      if (lg) {
        var s = Math.min(W * .96 / lg.width, H * .86 / lg.height), w = lg.width * s, h = lg.height * s, x = (W - w) / 2, y = (H - h) / 2;
        var halo = lg.lum < 105;   // a dark logo gets a pale glow instead of a shadow, so it reads on the dark label
        c.save(); c.shadowColor = halo ? 'rgba(235,228,210,.9)' : 'rgba(0,0,0,.7)'; c.shadowBlur = halo ? 14 : 10; c.shadowOffsetY = halo ? 0 : 4;
        c.drawImage(lg, x, y, w, h); if (halo) c.drawImage(lg, x, y, w, h); c.restore();
        c.drawImage(lg, x, y, w, h);
      }
    }
    return new Promise(function (ok) { cv.toBlob(function (b) { ok(b); }, 'image/jpeg', .86); });
  }
  // a label from a picture of your own (a photo of the cartridge or box): the picture itself, filling the label
  function ownLabel(file) { return image(file).then(function (im) { return im ? label(im, null) : null; }); }

  return { unpack: unpack, identify: identify, art: art, label: label, ownLabel: ownLabel, crc32: crc32, title: title };
})();
