// ═══════════════════════════════════════════════════════════════════════════
// Carmen Sandiego: pixel art, drawn fresh in the style of the late-80s PC games.
// Everything is drawn into small canvases (scenes 192×120, portraits 48×56) with a
// VGA-era palette and 4×4 ordered dithering, then shown scaled up with crisp pixels.
//   CarmenArt.scene(canvas, place, {night})      a city / place picture from place.scene
//   CarmenArt.interior(canvas, kind, seed)       inside a bank, library, museum...
//   CarmenArt.portrait(canvas, look)             suspect or witness head and shoulders
//   CarmenArt.map(canvas, version, view)         the travel map; returns project(lat, lon) -> {x, y} in 0..1
//   CarmenArt.title(canvas) / .warrant(...) / .jail(...)   the big moments
// ═══════════════════════════════════════════════════════════════════════════
(function () {
  'use strict';
  var BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

  // ── Colours ───────────────────────────────────────────────────────────────
  var cache = {};
  function rgb(h) {
    h = String(h).replace('#', ''); if (h.length === 3) h = h.replace(/./g, '$&$&');
    var n = parseInt(h, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255];
  }
  function u32(h) {
    var c = cache[h]; if (c !== undefined) return c;
    var a = rgb(h); c = ((255 << 24) | (a[2] << 16) | (a[1] << 8) | a[0]) >>> 0; cache[h] = c; return c;
  }
  function hx(a) { return '#' + a.map(function (v) { v = Math.max(0, Math.min(255, Math.round(v))); return (v < 16 ? '0' : '') + v.toString(16); }).join(''); }
  function mix(a, b, t) { var x = rgb(a), y = rgb(b); return hx([x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t]); }
  function shade(h, f) { return f < 0 ? mix(h, '#000000', -f) : mix(h, '#ffffff', f); }

  // seeded random: the same place always draws the same way
  function rng(seed) {
    var s = 2166136261; seed = String(seed);
    for (var i = 0; i < seed.length; i++) { s ^= seed.charCodeAt(i); s = Math.imul(s, 16777619); }
    return function () { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 100000) / 100000; };
  }

  // ── A tiny pixel canvas ───────────────────────────────────────────────────
  function G(w, h) { this.w = w; this.h = h; this.b = new Uint32Array(w * h); }
  var gp = G.prototype;
  gp.p = function (x, y, c) { x = x | 0; y = y | 0; if (x < 0 || y < 0 || x >= this.w || y >= this.h || !c) return; this.b[y * this.w + x] = u32(c); };
  // dithered blend: t of c2 over c1 (0..1)
  gp.d = function (x, y, c1, c2, t) { this.p(x, y, t * 16 > BAY[((y & 3) << 2) | (x & 3)] + 0.5 ? c2 : c1); };
  gp.get = function (x, y) { x |= 0; y |= 0; if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0; return this.b[y * this.w + x]; };
  gp.rect = function (x, y, w, h, c) {
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
    for (var j = y; j < y + h; j++) for (var i = x; i < x + w; i++) this.p(i, j, typeof c === 'function' ? c(i, j) : c);
  };
  gp.drect = function (x, y, w, h, c1, c2, t) { var g = this; this.rect(x, y, w, h, function (i, j) { return t * 16 > BAY[((j & 3) << 2) | (i & 3)] + 0.5 ? c2 : c1; }); };
  // vertical gradient through colour stops, dithered
  gp.vgrad = function (x, y, w, h, stops) {
    for (var j = 0; j < h; j++) {
      var t = h > 1 ? j / (h - 1) : 0, s = t * (stops.length - 1), k = Math.min(stops.length - 2, Math.floor(s)), f = s - k;
      for (var i = 0; i < w; i++) this.d(x + i, y + j, stops[k], stops[k + 1], f);
    }
  };
  // filled polygon (even-odd); c can be a function (x, y) -> colour
  gp.poly = function (pts, c) {
    var minY = Infinity, maxY = -Infinity, i;
    for (i = 0; i < pts.length; i++) { minY = Math.min(minY, pts[i][1]); maxY = Math.max(maxY, pts[i][1]); }
    minY = Math.max(0, Math.floor(minY)); maxY = Math.min(this.h - 1, Math.ceil(maxY));
    for (var y = minY; y <= maxY; y++) {
      var yc = y + 0.5, xs = [];
      for (i = 0; i < pts.length; i++) {
        var a = pts[i], b = pts[(i + 1) % pts.length];
        if ((a[1] <= yc && b[1] > yc) || (b[1] <= yc && a[1] > yc)) xs.push(a[0] + (yc - a[1]) / (b[1] - a[1]) * (b[0] - a[0]));
      }
      xs.sort(function (p, q) { return p - q; });
      for (i = 0; i + 1 < xs.length; i += 2) {
        for (var x = Math.max(0, Math.round(xs[i])); x < Math.min(this.w, Math.round(xs[i + 1])); x++) this.p(x, y, typeof c === 'function' ? c(x, y) : c);
      }
    }
  };
  gp.ell = function (cx, cy, rx, ry, c, half) {
    for (var y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      if (half === 'top' && y > cy) break;
      if (half === 'bot' && y < cy) continue;
      var dy = (y + 0.5 - cy) / ry; if (Math.abs(dy) > 1) continue;
      var dx = rx * Math.sqrt(1 - dy * dy);
      for (var x = Math.round(cx - dx); x < Math.round(cx + dx); x++) this.p(x, y, typeof c === 'function' ? c(x, y) : c);
    }
  };
  gp.line = function (x0, y0, x1, y1, c) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    var dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, e = dx + dy;
    for (var n = 0; n < 2000; n++) { this.p(x0, y0, c); if (x0 === x1 && y0 === y1) break; var e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } }
  };
  gp.put = function (cv) {
    cv.width = this.w; cv.height = this.h;
    var cx = cv.getContext('2d'), im = cx.createImageData(this.w, this.h);
    new Uint32Array(im.data.buffer).set(this.b); cx.putImageData(im, 0, 0);
  };
  // shaded fill helpers: lit from the left
  function lit(cx, base, amt) { var L = shade(base, amt || 0.18), D = shade(base, -(amt || 0.18) * 1.6); return function (x, y) { return x < cx ? L : x > cx ? D : base; }; }
  function lattice(c1, c2) { return function (x, y) { return (x + y) % 3 === 0 || (x - y) % 3 === 0 ? c2 : c1; }; }

  // ── Skies, land and trees ─────────────────────────────────────────────────
  var W = 192, H = 120;
  var SKY = {
    day: ['#2f5fc6', '#5a8ee0', '#8ab8ee', '#c4e2f6'],
    dawn: ['#2c2460', '#7a4a8a', '#d0708a', '#f6b878'],
    dusk: ['#141048', '#4a2a78', '#b4466a', '#f08a48', '#f8c860'],
    night: ['#03031a', '#0a0a34', '#16185a', '#2a2c74'],
    overcast: ['#5e6574', '#80868f', '#a4a9ae', '#c2c5c7']
  };
  function sky(g, kind, hz, R) {
    var st = SKY[kind] || SKY.day; g.vgrad(0, 0, W, hz + 2, st);
    if (kind === 'night') {
      for (var i = 0; i < 46; i++) { var x = R() * W | 0, y = R() * (hz - 8) | 0; g.p(x, y, R() < 0.25 ? '#ffffff' : '#9aa0d8'); }
      var mx = 18 + R() * 40 | 0, my = 12 + R() * 8 | 0;
      g.ell(mx, my, 6, 6, '#f4f0cc'); g.ell(mx + 3, my - 2, 5, 5, st[0]);
    } else if (kind === 'dusk' || kind === 'dawn') {
      var sx = 30 + R() * 130 | 0; g.ell(sx, hz - 2, 11, 11, kind === 'dusk' ? '#ffb040' : '#ffd890', 'top');
      g.ell(sx, hz - 2, 8, 8, kind === 'dusk' ? '#ffd060' : '#fff0c0', 'top');
    } else if (kind === 'day') {
      var ux = 150 + R() * 30 | 0, uy = 10 + R() * 6 | 0; g.ell(ux, uy, 7, 7, '#fff8b0'); g.ell(ux, uy, 5, 5, '#ffffe8');
    }
    var nc = kind === 'night' ? 0 : kind === 'overcast' ? 7 : 2 + (R() * 3 | 0);
    for (var c = 0; c < nc; c++) cloud(g, R() * W, 8 + R() * (hz * 0.45), 8 + R() * 14, kind, R);
  }
  function cloud(g, x, y, s, kind, R) {
    var top = kind === 'overcast' ? '#d4d6d8' : kind === 'dusk' ? '#f0a080' : kind === 'dawn' ? '#f4c8c0' : '#ffffff';
    var bot = kind === 'overcast' ? '#9a9ea4' : kind === 'dusk' ? '#9a4a7a' : kind === 'dawn' ? '#b48aa8' : '#bcd4ee';
    for (var i = 0; i < 4; i++) { var ox = (i - 1.5) * s * 0.45, r = s * (0.32 + R() * 0.2); g.ell(x + ox, y + 1, r * 1.2, r * 0.7, bot); g.ell(x + ox, y, r * 1.2, r * 0.6, top); }
  }
  function hills(g, hz, amp, freq, ph, c, R) {
    for (var x = 0; x < W; x++) { var h = Math.round(amp * (0.6 + 0.4 * Math.sin(x * freq + ph) + 0.25 * Math.sin(x * freq * 2.7 + ph * 2))); g.rect(x, hz - h, 1, h + 1, c); }
  }
  function far(g, land, hz, skyk, R) {
    var haze = (SKY[skyk] || SKY.day).slice(-1)[0];
    if (land === 'city') {
      var c = mix('#3a4a6a', haze, 0.45), x = 0;
      while (x < W) { var w = 5 + R() * 9 | 0, h = 4 + R() * 16 | 0; g.rect(x, hz - h, w, h + 1, c); if (skyk === 'night' || skyk === 'dusk') for (var k = 0; k < h * w / 14; k++) g.p(x + 1 + R() * (w - 2), hz - h + 2 + R() * (h - 2), '#ffd860'); x += w + (R() * 2 | 0); }
    } else if (land === 'grass' || land === 'jungle') hills(g, hz, land === 'jungle' ? 9 : 7, 0.05, R() * 6, mix(land === 'jungle' ? '#1a5a2a' : '#3a7a4a', haze, 0.45), R);
    else if (land === 'desert') hills(g, hz, 4, 0.035, R() * 6, mix('#d0a060', haze, 0.4), R);
    else if (land === 'snow') { hills(g, hz, 14, 0.06, R() * 6, mix('#8090b0', haze, 0.35), R); }
    else if (land === 'rock') hills(g, hz, 9, 0.07, R() * 6, mix('#8a5a3a', haze, 0.4), R);
    else if (land === 'savanna') hills(g, hz, 3, 0.03, R() * 6, mix('#8a8a4a', haze, 0.5), R);
  }
  function ground(g, land, hz, skyk, R) {
    var n = skyk === 'night' ? -0.45 : skyk === 'dusk' ? -0.2 : 0, y, x;
    function S(c) { return n ? shade(c, n) : c; }
    if (land === 'sea') {
      g.vgrad(0, hz, W, H - hz, [S('#3a70c0'), S('#1c4a96'), S('#0e2c6a')]);
      for (var i = 0; i < 70; i++) { x = R() * W | 0; y = hz + 2 + (R() * (H - hz - 2) | 0); g.rect(x, y, 2 + R() * 5, 1, S(skyk === 'dusk' ? '#f0a060' : '#9ac4f0')); }
      return;
    }
    var P = { city: ['#8a8a8e', '#6a6a70', '#5a5a60'], grass: ['#5aa040', '#3c8030', '#2a6424'], desert: ['#ecc880', '#d4a860', '#b88848'],
      snow: ['#f4f8ff', '#d4e0f0', '#b0c4e0'], jungle: ['#2a7a30', '#1c5a24', '#103e18'], savanna: ['#c8b45a', '#a89440', '#8a7a34'], rock: ['#b07a50', '#8a5a3a', '#6a4028'] }[land] || ['#5aa040', '#3c8030', '#2a6424'];
    g.vgrad(0, hz, W, H - hz, P.map(S));
    if (land === 'city') { g.rect(0, hz + 10, W, 1, S('#a4a4a8')); for (x = 0; x < W; x += 12) g.rect(x, hz + 22, 6, 1, S('#e0e0c0')); }
    else for (i = 0; i < 90; i++) g.p(R() * W, hz + 2 + R() * (H - hz), S(shade(P[1], R() < 0.5 ? -0.2 : 0.15)));
  }
  function tree(g, kind, x, y, s, night) {
    var dk = night ? -0.5 : 0;
    if (kind === 'palm') {
      for (var i = 0; i < s * 1.6; i++) g.rect(x + Math.round(Math.sin(i / (s * 1.6) * 1.4) * s * 0.3), y - i, 2, 1, shade(i % 3 ? '#8a5a2a' : '#6a4020', dk));
      var tx = x + Math.round(Math.sin(1.4) * s * 0.3), ty = y - s * 1.6;
      [[-1, 0.3], [1, 0.3], [-0.8, -0.4], [0.8, -0.4], [0, -0.9]].forEach(function (d) {
        for (var k = 0; k < s * 0.9; k++) { var px = tx + d[0] * k, py = ty + d[1] * k + (k * k) / (s * 1.6); g.rect(px, py, 2, 2, shade(k % 2 ? '#2a9a3a' : '#1a7a2a', dk)); }
      });
    } else if (kind === 'pine') {
      g.rect(x, y - 3, 2, 4, shade('#5a3a1a', dk));
      for (var t = 0; t < 3; t++) { var w = s * (0.5 - t * 0.12), ty2 = y - 2 - t * s * 0.42; g.poly([[x + 1 - w, ty2], [x + 1, ty2 - s * 0.6], [x + 1 + w, ty2]], function (px) { return shade(px < x + 1 ? '#2a7a3a' : '#1a5a2a', dk); }); }
    } else if (kind === 'leafy') {
      g.rect(x, y - s * 0.5, 2, s * 0.5 + 1, shade('#6a4a2a', dk));
      g.ell(x + 1, y - s * 0.8, s * 0.5, s * 0.42, function (px, py) { return shade((px + py) % 4 === 0 ? '#5aaa3a' : px < x ? '#3a9030' : '#2a7024', dk); });
    }
  }

  // ── Landmarks: each draws upward from the horizon at x = X ─────────────────
  var STONE = '#d8c8a0', WHITE = '#f0eee6';
  function columns(g, x0, x1, y0, y1, c, gap) {
    for (var x = x0; x < x1; x += gap) { g.rect(x, y0, 2, y1 - y0, shade(c, 0.15)); g.rect(x + 2, y0, 1, y1 - y0, shade(c, -0.3)); }
  }
  function windows(g, x, y, w, h, c, lit_, R, gx, gy) {
    for (var j = y + 1; j < y + h - 1; j += gy || 3) for (var i = x + 1; i < x + w - 1; i += gx || 3) g.p(i, j, lit_ && R() < 0.6 ? '#ffd860' : c);
  }
  function onion(g, cx, y, r, c1, c2) {
    g.ell(cx, y, r, r * 1.05, function (x, yy) { return ((x - cx + yy) >> 1) % 2 === 0 ? c1 : c2; });
    g.poly([[cx - r * 0.7, y - r * 0.6], [cx, y - r * 2.1], [cx + r * 0.7, y - r * 0.6]], function (x, yy) { return ((x - cx + yy) >> 1) % 2 === 0 ? c1 : c2; });
    g.rect(cx, y - r * 2.6, 1, r * 0.6, '#e8c040');
  }
  function minaret(g, x, B, h, c) {
    g.rect(x, B - h, 3, h, lit(x + 1, c)); g.rect(x - 1, B - h * 0.7, 5, 1, shade(c, -0.3)); g.rect(x - 1, B - h * 0.4, 5, 1, shade(c, -0.3));
    g.poly([[x - 0.5, B - h], [x + 1.5, B - h - 6], [x + 3.5, B - h]], shade(c, -0.15));
  }
  function trilithon(g, x, B, c) { g.rect(x, B - 12, 3, 12, lit(x + 1, c)); g.rect(x + 6, B - 12, 3, 12, lit(x + 7, c)); g.rect(x - 1, B - 15, 11, 3, shade(c, 0.1)); }
  function house(g, x, B, w, h, c, roof, night, R) {
    g.rect(x, B - h, w, h, lit(x + w / 2, c, 0.1));
    g.poly([[x - 1, B - h], [x + w / 2, B - h - w * 0.5], [x + w + 1, B - h]], roof);
    windows(g, x, B - h + 1, w, h - 3, shade(c, -0.45), night, R, 3, 4);
  }

  var LM = {
    eiffel: function (g, X, B, o) {
      var c = o.c || '#6e5040', l = shade(c, 0.35), f = lattice(c, l);
      g.poly([[X - 30, B], [X - 22, B], [X - 10, B - 22], [X - 15, B - 22]], f); g.poly([[X + 30, B], [X + 22, B], [X + 10, B - 22], [X + 15, B - 22]], f);
      for (var dx = -14; dx <= 14; dx++) { var t = 2 + Math.round(5 * Math.pow(Math.abs(dx) / 14, 2)); g.rect(X + dx, B - 22, 1, t, f); }
      g.rect(X - 17, B - 24, 34, 3, shade(c, 0.2));
      g.poly([[X - 12, B - 24], [X - 6, B - 44], [X + 6, B - 44], [X + 12, B - 24]], f);
      g.ell(X, B - 25, 4, 6, null);
      g.rect(X - 9, B - 46, 18, 2, shade(c, 0.2));
      g.poly([[X - 5, B - 46], [X - 1, B - 84], [X + 1, B - 84], [X + 5, B - 46]], f);
      g.rect(X - 2, B - 88, 4, 4, shade(c, 0.1)); g.rect(X, B - 96, 1, 8, c);
    },
    needle: function (g, X, B, o) {
      var c = o.c || '#c8c0b4';
      g.poly([[X - 6, B], [X - 2, B - 20], [X + 2, B - 20], [X + 6, B]], lit(X, c));
      g.rect(X - 2, B - 70, 4, 52, lit(X, c));
      g.ell(X, B - 66, 9, 3, shade(c, -0.2)); g.ell(X, B - 68, 9, 3, lit(X, c)); g.rect(X - 8, B - 68, 16, 1, '#5070a0');
      g.ell(X, B - 76, 4, 2, lit(X, c)); g.rect(X - 1, B - 76, 2, -1, c); g.rect(X, B - 100, 1, 26, shade(c, -0.1)); g.p(X, B - 101, '#ff4040');
    },
    clocktower: function (g, X, B, o, R) {
      var c = o.c || '#d0b070';
      g.rect(X - 50, B - 18, 44, 18, lit(X - 28, c, 0.08));
      for (var x = X - 48; x < X - 8; x += 4) { g.rect(x, B - 16, 1, 14, shade(c, -0.3)); g.poly([[x - 1, B - 18], [x, B - 23], [x + 1, B - 18]], shade(c, -0.15)); }
      g.rect(X - 6, B - 70, 13, 70, lit(X, c));
      for (var y = B - 60; y < B - 4; y += 5) g.rect(X - 4, y, 9, 1, shade(c, -0.3));
      g.rect(X - 8, B - 72, 17, 3, shade(c, 0.1)); g.rect(X - 7, B - 82, 15, 10, lit(X, c));
      g.ell(X + 0.5, B - 77, 5, 5, '#2a2a2a'); g.ell(X + 0.5, B - 77, 4, 4, '#f4f0e0'); g.line(X, B - 77, X, B - 80, '#202020'); g.line(X, B - 77, X + 2, B - 76, '#202020');
      g.poly([[X - 7, B - 82], [X + 0.5, B - 100], [X + 8, B - 82]], lit(X, shade(c, -0.25)));
      g.rect(X, B - 104, 1, 5, '#e8c040');
    },
    dome: function (g, X, B, o) {
      var c = o.c || STONE, dc = o.c2 || '#a0aec0';
      g.rect(X - 34, B - 26, 68, 26, lit(X, c, 0.08)); columns(g, X - 32, X + 32, B - 22, B - 2, c, 6);
      g.poly([[X - 36, B - 26], [X, B - 34], [X + 36, B - 26]], shade(c, 0.12));
      g.rect(X - 16, B - 46, 32, 14, lit(X, c)); columns(g, X - 15, X + 15, B - 44, B - 34, c, 5);
      g.ell(X, B - 46, 17, 20, lit(X, dc, 0.25), 'top'); for (var dx = -12; dx <= 12; dx += 6) g.line(X + dx * 0.6, B - 64, X + dx, B - 47, shade(dc, -0.25));
      g.rect(X - 3, B - 72, 6, 7, lit(X, c)); g.poly([[X - 3, B - 72], [X, B - 78], [X + 3, B - 72]], dc); g.rect(X, B - 82, 1, 4, '#e8c040');
    },
    capitol: function (g, X, B, o) {
      var c = o.c || WHITE;
      g.rect(X - 60, B - 18, 120, 18, lit(X, c, 0.06)); columns(g, X - 58, X + 58, B - 15, B - 2, c, 5);
      g.rect(X - 20, B - 26, 40, 8, c); g.poly([[X - 22, B - 26], [X, B - 33], [X + 22, B - 26]], shade(c, -0.05));
      g.rect(X - 14, B - 42, 28, 12, lit(X, c)); columns(g, X - 13, X + 13, B - 41, B - 31, c, 4);
      g.ell(X, B - 42, 14, 16, lit(X, c, 0.2), 'top'); g.rect(X - 2, B - 62, 4, 6, c); g.rect(X - 1, B - 66, 2, 4, shade(c, -0.2));
    },
    onion: function (g, X, B, o) {
      var c = o.c || '#c84030';
      g.rect(X - 36, B - 22, 72, 22, lit(X, c, 0.1)); for (var x = X - 34; x < X + 34; x += 6) g.ell(x + 2, B - 12, 2, 4, '#f0e0c0', 'top');
      var towers = [[-26, 34, 7, '#30a050', '#f0d040'], [-12, 44, 8, '#3060c0', '#f0f0f0'], [0, 62, 6, '#e8c040', '#c84030'], [12, 46, 8, '#e04040', '#f0f0f0'], [26, 36, 7, '#e8a020', '#30a050']];
      towers.forEach(function (t) { g.rect(X + t[0] - t[2] * 0.6, B - t[1], t[2] * 1.2, t[1] - 18, lit(X + t[0], c, 0.12)); onion(g, X + t[0], B - t[1] - t[2] * 0.6, t[2], t[3], t[4]); });
      g.poly([[X - 4, B - 62], [X, B - 92], [X + 4, B - 62]], lit(X, '#d0c090'));
    },
    pyramid: function (g, X, B, o) {
      var c = o.c || '#e0b870';
      [[X + 34, 30], [X - 30, 26], [X, 52]].forEach(function (p, i) {
        var x = p[0], h = p[1]; g.poly([[x - h * 1.1, B], [x, B - h], [x + h * 1.1, B]], function (px, py) { var sh = px < x ? shade(c, 0.1) : shade(c, -0.25); return (py % 3 === 0) ? shade(sh, -0.08) : sh; });
        if (i === 2) g.poly([[x - 5, B - h + 5], [x, B - h], [x + 5, B - h + 5]], '#f4e0b0');
      });
    },
    steppyramid: function (g, X, B, o) {
      var c = o.c || '#b8a888';
      for (var i = 0; i < 8; i++) { var w = 66 - i * 7, y = B - (i + 1) * 6; g.rect(X - w / 2, y, w, 6, lit(X, c, 0.12)); g.rect(X - w / 2, y, w, 1, shade(c, 0.2)); }
      g.rect(X - 4, B - 48, 8, 48, function (x, y) { return y % 2 ? shade(c, -0.3) : shade(c, -0.1); });
      g.rect(X - 8, B - 60, 16, 12, lit(X, c)); g.rect(X - 3, B - 57, 6, 9, '#2a2018'); g.rect(X - 9, B - 62, 18, 2, shade(c, -0.2));
    },
    pagoda: function (g, X, B, o) {
      var c = o.c || '#b83a2a', r = o.c2 || '#2a3a4a';
      for (var i = 0; i < 5; i++) {
        var w = 30 - i * 4.5, y = B - 4 - i * 15;
        g.rect(X - w / 2 + 2, y - 10, w - 4, 10, lit(X, c, 0.12)); windows(g, X - w / 2 + 2, y - 10, w - 4, 10, '#3a1a10', false, Math.random, 3, 5);
        g.poly([[X - w / 2 - 6, y - 12], [X - w / 2 - 8, y - 15], [X - w / 2 + 2, y - 15], [X, y - 19], [X + w / 2 - 2, y - 15], [X + w / 2 + 8, y - 15], [X + w / 2 + 6, y - 12]], lit(X, r, 0.2));
      }
      g.rect(X, B - 96, 1, 14, '#e8c040'); for (var k = 0; k < 4; k++) g.rect(X - 1, B - 92 + k * 3, 3, 1, '#e8c040');
    },
    temple: function (g, X, B, o) {
      var c = o.c || WHITE;
      g.poly([[X - 70, B], [X - 52, B - 14], [X + 50, B - 16], [X + 70, B]], lit(X, '#a08a6a', 0.1));
      var b = B - 15;
      for (var s = 0; s < 3; s++) g.rect(X - 40 + s * 2, b - s * 2, 80 - s * 4, 2, shade(c, -0.1 * s));
      columns(g, X - 34, X + 34, b - 26, b - 5, c, 7);
      g.rect(X - 37, b - 30, 74, 4, lit(X, c, 0.06)); g.poly([[X - 38, b - 30], [X, b - 42], [X + 38, b - 30]], lit(X, c, 0.08));
    },
    colosseum: function (g, X, B, o) {
      var c = o.c || '#d4b48a';
      var top = function (x) { return x < X + 16 ? B - 52 : B - 52 + Math.min(20, (x - X - 16) * 0.8 | 0) - ((x % 6 < 3) ? 3 : 0); };
      for (var x = X - 58; x < X + 58; x++) { var t = top(x); g.rect(x, t, 1, B - t, lit(X, c, 0.08)(x, 0)); }
      for (var row = 0; row < 3; row++) for (x = X - 54; x < X + 52; x += 8) { var y = B - 8 - row * 15; if (y - 8 < top(x + 3)) continue; g.rect(x, y - 8, 5, 9, shade(c, -0.55)); g.ell(x + 2.5, y - 8, 2.5, 2, shade(c, -0.55), 'top'); }
      for (row = 0; row < 3; row++) g.rect(X - 58, B - 16 - row * 15, 116, 1, shade(c, 0.2));
    },
    mosque: function (g, X, B, o) {
      var c = o.c || '#c8ccd8';
      g.rect(X - 34, B - 22, 68, 22, lit(X, c, 0.08)); for (var x = X - 30; x < X + 30; x += 7) { g.rect(x, B - 14, 4, 10, shade(c, -0.45)); g.ell(x + 2, B - 14, 2, 2, shade(c, -0.45), 'top'); }
      [[-24, 8], [24, 8], [-12, 10], [12, 10]].forEach(function (d) { g.ell(X + d[0], B - 22, d[1], d[1] * 0.9, lit(X + d[0], c, 0.2), 'top'); });
      g.rect(X - 16, B - 32, 32, 10, lit(X, c)); g.ell(X, B - 32, 18, 18, lit(X, shade(c, -0.08), 0.25), 'top'); g.rect(X, B - 56, 1, 6, '#e8c040');
      [[-44, 56], [-38, 48], [38, 48], [44, 56]].forEach(function (m) { minaret(g, X + m[0] - 1, B, m[1], c); });
    },
    taj: function (g, X, B, o) {
      var c = o.c || '#f4f0ea';
      g.rect(X - 46, B - 6, 92, 6, shade(c, -0.15));
      g.rect(X - 26, B - 32, 52, 26, lit(X, c, 0.06)); g.rect(X - 8, B - 30, 16, 22, shade(c, -0.25)); g.ell(X, B - 30, 8, 6, shade(c, -0.25), 'top'); g.rect(X - 6, B - 26, 12, 18, '#5a5a6a');
      for (var s = -1; s <= 1; s += 2) { g.rect(X + s * 18 - 4, B - 26, 8, 16, shade(c, -0.18)); g.ell(X + s * 18, B - 34, 5, 5, lit(X + s * 18, c), 'top'); }
      g.rect(X - 10, B - 40, 20, 8, c); g.ell(X, B - 50, 15, 15, lit(X, c, 0.2)); g.poly([[X - 3, B - 63], [X, B - 72], [X + 3, B - 63]], '#d8c890');
      [[-42, 40], [42, 40]].forEach(function (m) { minaret(g, X + m[0] - 1, B - 6, m[1], c); });
      g.rect(X - 4, B + 1, 8, 20, '#4a80c8'); g.rect(X - 1, B + 3, 2, 16, '#9ac0f0');
    },
    skyline: function (g, X, B, o, R) {
      var night = o.night, x = 6;
      while (x < W - 6) {
        var w = 8 + R() * 12 | 0, h = 18 + R() * 46 | 0; if (Math.abs(x - X) < 12) h += 24;
        var c = ['#5a6a8a', '#7a8aa8', '#4a5a74', '#8a9ab0', '#6a7a90'][R() * 5 | 0];
        g.rect(x, B - h, w, h, lit(x + w / 2, c, 0.1)); windows(g, x, B - h, w, h, shade(c, night ? -0.5 : 0.35), night, R, 2, 3);
        if (Math.abs(x - X) < 12) { g.rect(x + w / 2 - 1, B - h - 12, 2, 12, c); g.rect(x + w / 2 - 3, B - h - 3, 6, 3, c); }
        x += w + 1 + (R() * 3 | 0);
      }
    },
    suspension: function (g, X, B, o) {
      var c = o.c || '#c8402a', deck = B - 6;
      [X - 46, X + 46].forEach(function (tx) { g.rect(tx - 3, deck - 54, 2, 66, shade(c, 0.1)); g.rect(tx + 1, deck - 54, 2, 66, shade(c, -0.2)); for (var k = 0; k < 4; k++) g.rect(tx - 3, deck - 50 + k * 13, 6, 2, c); });
      for (var x = 0; x < W; x++) {
        var y = x < X - 46 ? deck - 54 + (X - 46 - x) * 1.1 : x > X + 46 ? deck - 54 + (x - X - 46) * 1.1 : deck - 54 + 46 * (1 - Math.pow((x - X) / 46, 2));
        if (y < deck) { g.p(x, y, c); if (x % 4 === 0 && Math.abs(x - X) < 46) g.rect(x, y, 1, deck - y, shade(c, -0.1)); }
      }
      g.rect(0, deck, W, 3, shade(c, -0.15)); g.rect(0, deck + 3, W, 1, shade(c, -0.5));
    },
    statue: function (g, X, B, o) {
      var c = o.c || '#5fa88c';
      g.poly([[X - 22, B], [X - 14, B - 10], [X + 14, B - 10], [X + 22, B]], '#8a8a80');
      g.rect(X - 9, B - 34, 18, 24, lit(X, '#b8aa8a')); g.rect(X - 11, B - 36, 22, 3, '#c8baa0');
      g.poly([[X - 7, B - 36], [X - 5, B - 66], [X + 5, B - 66], [X + 8, B - 36]], lit(X, c, 0.2));
      g.ell(X, B - 70, 3.5, 4, lit(X, c, 0.2));
      for (var k = -2; k <= 2; k++) g.line(X, B - 72, X + k * 2, B - 78 + Math.abs(k), c);
      g.poly([[X + 3, B - 64], [X + 6, B - 64], [X + 7, B - 88], [X + 5, B - 88]], c);
      g.rect(X + 4, B - 92, 4, 4, '#c8a040'); g.ell(X + 6, B - 94, 2.5, 3.5, '#ffb030'); g.ell(X + 6, B - 94, 1.2, 2, '#fff080');
      g.rect(X - 8, B - 56, 5, 6, shade(c, -0.25));
    },
    redeemer: function (g, X, B, o) {
      g.poly([[X - 60, B], [X - 10, B - 56], [X + 6, B - 60], [X + 70, B]], lit(X, '#3a7a3a', 0.15));
      g.poly([[X - 20, B - 46], [X - 6, B - 58], [X + 10, B - 60], [X + 20, B - 50]], '#7a6a5a');
      var c = o.c || '#ecece4';
      g.rect(X - 2, B - 82, 5, 22, lit(X, c, 0.12)); g.rect(X - 16, B - 79, 33, 3, c); g.ell(X + 0.5, B - 85, 2.5, 3, c);
    },
    opera: function (g, X, B, o) {
      g.rect(X - 50, B - 6, 100, 6, '#c8b890');
      [[-36, 22, 18], [-20, 30, 20], [-2, 40, 22], [16, 34, 20], [32, 24, 16]].forEach(function (s) {
        var x = X + s[0], h = s[1], w = s[2];
        g.poly([[x - w * 0.2, B - 6], [x + w * 0.1, B - 6 - h], [x + w * 0.35, B - 6 - h * 0.85], [x + w * 0.8, B - 6]], function (px, py) { return (px + py) % 5 === 0 ? '#d8d8d0' : px < x + w * 0.2 ? '#fafaf4' : '#e4e4dc'; });
      });
    },
    castle: function (g, X, B, o) {
      var c = o.c || '#c8c4bc', roof = o.c2 || '#3a5ab0';
      g.poly([[X - 70, B], [X - 50, B - 12], [X + 50, B - 12], [X + 70, B]], '#5a7a4a');
      var b = B - 12;
      g.rect(X - 36, b - 20, 72, 20, lit(X, c, 0.08)); for (var x = X - 36; x < X + 36; x += 4) g.rect(x, b - 23, 2, 3, c);
      [[-36, 34, 7], [36, 34, 7], [-14, 46, 8], [10, 58, 9]].forEach(function (t) {
        var tx = X + t[0]; g.rect(tx - t[2] / 2, b - t[1], t[2], t[1], lit(tx, c)); windows(g, tx - t[2] / 2, b - t[1] + 4, t[2], t[1] - 10, '#2a2a40', false, Math.random, 3, 6);
        g.poly([[tx - t[2] / 2 - 2, b - t[1]], [tx, b - t[1] - t[2] * 1.8], [tx + t[2] / 2 + 2, b - t[1]]], lit(tx, roof, 0.2));
      });
      g.rect(X - 5, b - 12, 10, 12, '#3a2a20'); g.ell(X, b - 12, 5, 4, '#3a2a20', 'top');
    },
    cathedral: function (g, X, B, o) {
      var c = o.c || '#a8a49c';
      g.rect(X - 30, B - 40, 60, 40, lit(X, c, 0.06));
      [-20, 20].forEach(function (s) { var tx = X + s; g.rect(tx - 9, B - 62, 18, 62, lit(tx, c)); g.poly([[tx - 9, B - 62], [tx, B - 96], [tx + 9, B - 62]], lit(tx, shade(c, -0.1))); for (var k = 0; k < 3; k++) g.rect(tx - 2, B - 56 + k * 14, 4, 8, '#3a3a50'); });
      g.ell(X, B - 30, 7, 7, '#5a3a7a'); g.ell(X, B - 30, 5, 5, function (x, y) { return (x + y) % 2 ? '#c84a5a' : '#4a6ac8'; });
      g.poly([[X - 30, B - 40], [X, B - 52], [X + 30, B - 40]], shade(c, -0.1));
      [-12, 0, 12].forEach(function (s) { g.rect(X + s - 3, B - 14, 6, 14, '#3a2a20'); g.poly([[X + s - 3, B - 14], [X + s, B - 19], [X + s + 3, B - 14]], '#3a2a20'); });
    },
    arch: function (g, X, B, o) {
      var c = o.c || '#e0d4b4';
      g.rect(X - 26, B - 52, 52, 52, lit(X, c, 0.1)); g.rect(X - 28, B - 56, 56, 5, shade(c, 0.12));
      g.rect(X - 9, B - 30, 18, 30, null); g.rect(X - 9, B - 30, 18, 30, function (x, y) { return '#000000'; });
      g.rect(X - 9, B - 28, 18, 28, '#3a3a48'); g.ell(X, B - 28, 9, 9, '#3a3a48', 'top');
      g.rect(X - 22, B - 44, 9, 10, shade(c, -0.15)); g.rect(X + 13, B - 44, 9, 10, shade(c, -0.15)); g.rect(X - 26, B - 48, 52, 1, shade(c, -0.25));
    },
    gatewayarch: function (g, X, B) {
      for (var t = -1; t <= 1; t += 0.004) {
        var x = X + t * 44, y = B - 92 * (1 - Math.pow(Math.abs(t), 1.7)), w = 2 + Math.round((1 - Math.abs(t)) * 0) + Math.round(Math.abs(t) * 3);
        g.rect(x - w / 2, y, w, 2, t < 0 ? '#e8ecf0' : '#9aa4b0');
      }
    },
    windmill: function (g, X, B, o) {
      var c = o.c || '#7a4a30';
      g.poly([[X - 10, B], [X - 6, B - 38], [X + 6, B - 38], [X + 10, B]], lit(X, c)); g.rect(X - 3, B - 10, 6, 10, '#3a2a1a'); g.rect(X - 2, B - 26, 4, 4, '#f0e0a0');
      g.poly([[X - 8, B - 38], [X, B - 46], [X + 8, B - 38]], '#4a3a3a');
      var cx = X, cy = B - 40;
      [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(function (d) { for (var k = 3; k < 30; k++) { var x = cx + d[0] * k * 0.72, y = cy + d[1] * k * 0.72; g.p(x, y, '#5a4030'); if (k > 8) for (var w = 1; w < 4; w++) g.p(x + d[1] * w * 0.7, y - d[0] * w * 0.7, (k + w) % 3 ? '#f0ece0' : '#8a7a6a'); } });
    },
    mountain: function (g, X, B, o) {
      var c = o.c || '#5a6a8a', s = o.snow !== false;
      g.poly([[X - 90, B], [X - 4, B - 74], [X + 4, B - 76], [X + 90, B]], function (x, y) { var snow = s && y < B - 52 + Math.sin(x * 0.8) * 3; return snow ? (x < X ? '#ffffff' : '#c8d4ec') : x < X + (B - y) * 0.15 ? shade(c, 0.15) : shade(c, -0.2); });
      g.poly([[X - 100, B], [X - 56, B - 30], [X - 30, B]], shade(c, -0.1));
    },
    volcano: function (g, X, B, o) {
      var c = o.c || '#5a4a4a';
      g.poly([[X - 80, B], [X - 12, B - 58], [X + 12, B - 58], [X + 80, B]], function (x, y) { return x < X ? shade(c, 0.12) : shade(c, -0.2); });
      for (var k = 0; k < 9; k++) g.ell(X + k * 3 + Math.sin(k) * 3, B - 64 - k * 5, 4 + k, 3 + k * 0.6, k % 2 ? '#b0aaa8' : '#d0ccc8');
      if (o.night) g.poly([[X - 6, B - 58], [X - 2, B - 40], [X + 3, B - 58]], '#ff6020');
    },
    wall: function (g, X, B) {
      hills(g, B, 20, 0.04, 1.3, '#3a7a3a');
      var pts = [];
      for (var x = 0; x < W; x++) pts.push(B - 18 - 10 * Math.sin(x * 0.04 + 1.3) - 4 * Math.sin(x * 0.11));
      for (x = 0; x < W; x++) { g.rect(x, pts[x] - 5, 1, 6, x % 3 ? '#b8a888' : '#9a8a6a'); if (x % 3 === 0) g.p(x, pts[x] - 6, '#b8a888'); }
      [20, 70, 120, 170].forEach(function (tx) { g.rect(tx - 4, pts[tx] - 14, 8, 10, lit(tx, '#b0a080')); g.rect(tx - 2, pts[tx] - 10, 2, 3, '#3a2a20'); g.poly([[tx - 6, pts[tx] - 14], [tx, pts[tx] - 19], [tx + 6, pts[tx] - 14]], '#6a4a3a'); });
    },
    stupa: function (g, X, B, o) {
      var c = o.c || '#e8b830';
      g.rect(X - 40, B - 8, 80, 8, shade(c, -0.35));
      g.ell(X, B - 8, 26, 30, lit(X, c, 0.25), 'top'); g.rect(X - 10, B - 40, 20, 4, shade(c, -0.15));
      g.poly([[X - 9, B - 40], [X, B - 90], [X + 9, B - 40]], function (x, y) { return y % 4 === 0 ? shade(c, -0.25) : x < X ? shade(c, 0.3) : c; });
      g.ell(X, B - 92, 1.5, 2, '#ffffff');
      [-34, 34].forEach(function (s) { g.ell(X + s, B - 8, 7, 9, lit(X + s, c), 'top'); g.poly([[X + s - 2, B - 16], [X + s, B - 30], [X + s + 2, B - 16]], c); });
    },
    torii: function (g, X, B, o) {
      LM.mountain(g, X + 40, B, { c: '#6a7aa0' });
      var c = o.c || '#d83a20';
      g.rect(X - 22, B - 46, 4, 46, lit(X - 20, c)); g.rect(X + 18, B - 46, 4, 46, lit(X + 20, c));
      g.rect(X - 26, B - 40, 52, 3, c); g.rect(X - 2, B - 46, 4, 6, c);
      g.poly([[X - 32, B - 46], [X - 30, B - 51], [X + 30, B - 51], [X + 32, B - 46], [X + 24, B - 48], [X - 24, B - 48]], '#2a2020');
    },
    mesa: function (g, X, B, o) {
      var c = o.c || '#c0582a';
      [[X - 54, 22, 18], [X + 6, 46, 26], [X + 56, 32, 10]].forEach(function (m) { g.poly([[m[0] - m[2] - 6, B], [m[0] - m[2], B - m[1]], [m[0] + m[2], B - m[1]], [m[0] + m[2] + 6, B]], function (x, y) { return (y % 5 === 0) ? shade(c, -0.15) : x < m[0] ? shade(c, 0.12) : shade(c, -0.18); }); });
      [[X - 24, 14], [X + 34, 10]].forEach(function (k) { g.rect(k[0], B + 8 - k[1], 3, k[1], '#2a7a3a'); g.rect(k[0] - 3, B + 1 - k[1] / 2, 3, 2, '#2a7a3a'); g.rect(k[0] - 3, B - 3 - k[1] / 2, 1, 4, '#2a7a3a'); });
    },
    beach: function (g, X, B, o, R) {
      g.poly([[0, B + 12], [W * 0.55, B + 4], [W, B + 18], [W, H], [0, H]], '#ecd090');
      g.rect(0, B + 9, W * 0.6, 1, '#ffffff');
      tree(g, 'palm', 26, B + 14, 26, o.night); tree(g, 'palm', 150, B + 22, 30, o.night); tree(g, 'palm', 170, B + 20, 22, o.night);
      g.poly([[X - 10, B - 2], [X + 10, B - 2], [X + 6, B + 1], [X - 6, B + 1]], '#8a4a2a'); g.poly([[X, B - 16], [X, B - 3], [X + 8, B - 3]], '#f4f4ec');
    },
    falls: function (g, X, B) {
      g.poly([[0, B - 40], [X - 20, B - 44], [X + 20, B - 44], [W, B - 38], [W, B + 6], [0, B + 6]], function (x, y) { return y % 4 === 0 ? '#4a6a3a' : '#5a7a44'; });
      g.rect(0, B - 48, W, 6, '#2a6a2a');
      for (var x = X - 30; x < X + 30; x++) for (var y = B - 44; y < B + 6; y++) g.p(x, y, (x * 7 + y * 3) % 5 === 0 ? '#ffffff' : (x + y) % 3 ? '#cfe8f8' : '#8ac0e8');
      for (var k = 0; k < 40; k++) g.ell(X - 34 + Math.random() * 68, B + 4 + Math.random() * 4, 3, 2, '#eef6fc');
      g.vgrad(0, B + 8, W, H - B - 8, ['#5a9ad0', '#2a5a9a']);
    },
    savanna: function (g, X, B, o) {
      var t = function (x, y, s) { g.rect(x, y - s, 2, s, '#4a3020'); g.ell(x + 1, y - s, s * 1.1, s * 0.25, '#4a6a2a'); g.ell(x + 1, y - s - 1, s * 0.9, s * 0.2, '#6a8a3a'); };
      t(X - 50, B + 4, 16); t(X + 40, B + 2, 20); t(X + 80, B + 6, 12);
      var gx = X - 8, gy = B + 6, gc = '#c89040';
      g.rect(gx, gy - 12, 10, 6, gc); g.rect(gx + 1, gy - 6, 2, 8, gc); g.rect(gx + 7, gy - 6, 2, 8, gc); g.poly([[gx + 8, gy - 12], [gx + 14, gy - 32], [gx + 16, gy - 31], [gx + 11, gy - 11]], gc); g.rect(gx + 13, gy - 34, 5, 3, gc);
      for (var k = 0; k < 12; k++) g.p(gx + 2 + (k * 3) % 9, gy - 11 + (k * 5) % 5, '#7a4a20');
      var ex = X + 14; g.ell(ex + 10, B + 2, 11, 7, '#7a7a80'); g.rect(ex + 2, B + 4, 4, 6, '#6a6a70'); g.rect(ex + 14, B + 4, 4, 6, '#6a6a70'); g.ell(ex + 22, B, 5, 5, '#7a7a80'); g.rect(ex + 25, B, 2, 9, '#6a6a70');
    },
    jungle: function (g, X, B, o, R) {
      for (var k = 0; k < 40; k++) { var x = R() * W, y = B - 30 + R() * 34, r = 6 + R() * 10; g.ell(x, y, r, r * 0.8, ['#1a5a24', '#2a7a30', '#3a8a34', '#145020'][k % 4]); }
      if (o.c) { g.rect(X - 14, B - 30, 28, 30, lit(X, o.c, 0.1)); g.rect(X - 4, B - 12, 8, 12, '#2a2018'); for (k = 0; k < 6; k++) g.ell(X - 14 + R() * 28, B - 30 + R() * 20, 4, 3, '#2a7a30'); }
      g.poly([[X - 20, H], [X - 6, B + 2], [X + 6, B + 2], [X + 30, H]], '#5a7aa0');
    },
    glacier: function (g, X, B) {
      g.poly([[X - 100, B], [X - 40, B - 50], [X - 10, B - 30], [X + 20, B - 64], [X + 100, B]], function (x, y) { return (x + y) % 7 === 0 ? '#9ac8e8' : x < X ? '#e8f4fc' : '#b8d8f0'; });
      [[X - 50, 6], [X + 30, 8], [X + 64, 4]].forEach(function (b) { g.poly([[b[0] - b[1] * 2, B + 12], [b[0] - b[1], B + 12 - b[1]], [b[0] + b[1], B + 12 - b[1] * 0.6], [b[0] + b[1] * 2, B + 12]], '#f4faff'); });
    },
    fjord: function (g, X, B, o, R) {
      g.poly([[0, B - 70], [40, B - 60], [70, B - 20], [74, B + 30], [0, B + 30]], function (x, y) { return (x * 3 + y) % 6 === 0 ? '#3a5a3a' : '#4a6a44'; });
      g.poly([[W, B - 64], [W - 50, B - 50], [W - 78, B - 10], [W - 84, B + 30], [W, B + 30]], function (x, y) { return (x * 3 + y) % 6 === 0 ? '#2a4a30' : '#3a5a3a'; });
      g.poly([[40, B - 60], [52, B - 64], [60, B - 50]], '#f4f8ff'); g.poly([[W - 50, B - 50], [W - 40, B - 58], [W - 30, B - 52]], '#f4f8ff');
      for (var k = 0; k < 6; k++) house(g, 10 + k * 9, B + 26 - (k % 2) * 3, 6, 6, ['#b83a2a', '#e8d8b0', '#c86a2a'][k % 3], '#3a2a2a', o.night, R);
    },
    canal: function (g, X, B, o, R) {
      var x = 0, cols = ['#8a3a2a', '#5a3a2a', '#c8a070', '#3a4a5a', '#a84a3a', '#6a5a3a'];
      while (x < W) { var w = 12 + R() * 6 | 0, h = 40 + R() * 22 | 0, c = cols[R() * cols.length | 0];
        g.rect(x, B + 4 - h, w, h, lit(x + w / 2, c, 0.1)); windows(g, x + 1, B + 8 - h, w - 2, h - 14, '#e8e4d8', o.night, R, 4, 6);
        var gy = B + 4 - h; g.poly([[x, gy], [x + w / 2, gy - w * 0.6], [x + w, gy]], shade(c, -0.2)); g.rect(x + w / 2 - 1, gy - w * 0.4, 2, 2, '#ffffff');
        x += w; }
      g.vgrad(0, B + 4, W, H - B - 4, ['#3a5a6a', '#2a4050']);
      for (var k = 0; k < 60; k++) g.rect(R() * W, B + 6 + R() * (H - B - 8), 3, 1, '#7a9aa8');
      g.ell(X, B + 12, 24, 10, '#7a5a3a', 'top'); g.ell(X, B + 12, 14, 6, '#2a4050', 'top');
    },
    monolith: function (g, X, B, o) {
      var c = o.c || '#c0502a';
      g.poly([[X - 70, B], [X - 62, B - 24], [X - 40, B - 32], [X + 30, B - 34], [X + 56, B - 26], [X + 70, B]], function (x, y) { return (x % 9 === 0 && y > B - 30) ? shade(c, -0.3) : y < B - 26 ? shade(c, 0.15) : c; });
    },
    tablemtn: function (g, X, B, o, R) {
      g.poly([[X - 96, B], [X - 70, B - 52], [X + 50, B - 54], [X + 80, B - 30], [X + 96, B]], function (x, y) { return (x * 2 + y) % 9 === 0 ? '#5a5a54' : y < B - 46 ? '#8a8a7a' : '#6a7a5a'; });
      g.rect(X - 66, B - 56, 112, 3, '#f4f4f4');
      for (var x = 0; x < W; x += 6) { var h = 4 + R() * 10; g.rect(x, B - h, 5, h, ['#e8e0d0', '#c8c0b0', '#f0e8d8'][x % 3]); }
    },
    rockcut: function (g, X, B, o) {
      var c = o.c || '#d08a6a';
      g.rect(0, 0, W, B, function (x, y) { return ((x * 13 + y * 7) % 17 === 0) ? shade(c, -0.3) : y % 6 === 0 ? shade(c, -0.12) : c; });
      g.rect(X - 32, B - 74, 64, 74, shade(c, -0.08));
      columns(g, X - 28, X + 28, B - 30, B - 2, shade(c, 0.1), 9); g.rect(X - 30, B - 34, 60, 4, shade(c, 0.12));
      g.poly([[X - 30, B - 34], [X, B - 44], [X + 30, B - 34]], shade(c, 0.05));
      columns(g, X - 12, X + 12, B - 66, B - 48, shade(c, 0.1), 8); g.ell(X, B - 66, 9, 6, shade(c, 0.08), 'top'); g.rect(X - 1, B - 76, 3, 6, shade(c, 0.1));
      g.rect(X - 5, B - 22, 10, 22, '#3a2018');
    },
    mudmosque: function (g, X, B, o) {
      var c = o.c || '#b88050';
      g.rect(X - 50, B - 26, 100, 26, lit(X, c, 0.08));
      for (var x = X - 48; x < X + 48; x += 10) { g.rect(x, B - 32, 6, 32, lit(x + 3, c)); g.ell(x + 3, B - 33, 3, 3, '#f0e8d0'); }
      [[-16, 50], [0, 58], [16, 50]].forEach(function (t) { var tx = X + t[0]; g.poly([[tx - 7, B - 20], [tx - 5, B - t[1]], [tx + 5, B - t[1]], [tx + 7, B - 20]], lit(tx, c)); g.ell(tx, B - t[1] - 1, 3, 3, '#f0e8d0');
        for (var y = B - t[1] + 6; y < B - 22; y += 6) for (var s = -1; s <= 1; s += 2) g.rect(tx + s * 6 - (s < 0 ? 2 : 0), y, 3, 1, '#6a4a2a'); });
      for (x = X - 48; x < X + 48; x += 5) g.rect(x, B - 18, 2, 1, '#6a4a2a');
    },
    stonehenge: function (g, X, B) {
      [[-50, B + 4], [-24, B], [6, B - 2], [34, B + 2], [-36, B + 14], [20, B + 14]].forEach(function (t) { trilithon(g, X + t[0], t[1], '#9a9890'); });
    },
    moai: function (g, X, B) {
      [-48, -18, 12, 42].forEach(function (s, i) {
        var x = X + s, h = 30 + (i % 2) * 4; g.rect(x - 8, B + 2 - 4, 16, 6, '#6a6058');
        g.rect(x - 5, B - 2 - h, 10, h, lit(x, '#7a6a5a', 0.12)); g.rect(x - 6, B - 2 - h + 6, 12, 4, '#5a4a40'); g.rect(x - 2, B - h + 8, 3, 8, '#5a4a40'); g.rect(x - 4, B - h + 18, 8, 2, '#5a4a40');
      });
    },
    village: function (g, X, B) {
      [[-60, 1], [-26, 1.2], [8, 1.4], [42, 1.1], [72, 0.9]].forEach(function (h) {
        var x = X + h[0], s = h[1]; g.rect(x - 10 * s, B + 4 - 12 * s, 20 * s, 12 * s, '#b07a4a'); g.rect(x - 2 * s, B + 4 - 8 * s, 4 * s, 8 * s, '#3a2018');
        g.poly([[x - 14 * s, B + 4 - 11 * s], [x, B + 4 - 26 * s], [x + 14 * s, B + 4 - 11 * s]], function (px, py) { return (px + py) % 3 ? '#d8b060' : '#a88040'; });
      });
    },
    harbor: function (g, X, B, o, R) {
      for (var x = 0; x < W; x += 14) house(g, x, B, 12, 10 + (R() * 10 | 0), ['#c8a070', '#a85a3a', '#e8d8b0', '#7a8a9a'][R() * 4 | 0], '#5a3a2a', o.night, R);
      g.vgrad(0, B, W, H - B, ['#3a6aa8', '#1a3a7a']);
      [[X - 40, 1], [X + 30, 1.3]].forEach(function (b) {
        var x = b[0], s = b[1]; g.poly([[x - 16 * s, B + 10], [x + 18 * s, B + 10], [x + 14 * s, B + 16], [x - 12 * s, B + 16]], '#6a3a20');
        g.rect(x, B + 10 - 28 * s, 1, 28 * s, '#3a2a1a'); g.poly([[x + 1, B + 8 - 26 * s], [x + 14 * s, B + 8], [x + 1, B + 8]], '#f0ece0');
      });
    },
    lighthouse: function (g, X, B, o) {
      g.poly([[X - 40, B + 14], [X - 24, B - 4], [X + 20, B - 6], [X + 44, B + 14]], '#6a6260');
      g.poly([[X - 7, B - 4], [X - 4, B - 56], [X + 4, B - 56], [X + 7, B - 4]], function (x, y) { return Math.floor((y - B) / 8) % 2 ? '#e8e8e8' : '#d03a2a'; });
      g.rect(X - 5, B - 64, 10, 8, '#2a2a2a'); g.rect(X - 3, B - 63, 6, 6, '#fff080'); g.poly([[X - 6, B - 64], [X, B - 70], [X + 6, B - 64]], '#2a2a2a');
      if (o.night) g.poly([[X + 3, B - 62], [W, B - 80], [W, B - 48]], function (x, y) { return (x + y) % 2 ? '#fff4b0' : null; });
    },
    palace: function (g, X, B, o, R) {
      var c = o.c || '#e8dcc0';
      g.rect(X - 80, B - 26, 160, 26, lit(X, c, 0.05)); windows(g, X - 80, B - 24, 160, 22, '#5a6a8a', o.night, R, 4, 7);
      g.rect(X - 82, B - 30, 164, 4, '#5a6a7a');
      g.rect(X - 16, B - 40, 32, 14, lit(X, c)); g.poly([[X - 18, B - 40], [X, B - 48], [X + 18, B - 40]], shade(c, -0.1)); g.rect(X - 1, B - 52, 2, 4, '#e8c040');
      for (var x = 6; x < W; x += 16) { g.ell(x, B + 14, 5, 3, '#2a6a2a'); }
      g.ell(X, B + 20, 10, 3, '#9ac4f0'); g.rect(X, B + 12, 1, 8, '#cfe8f8');
    },
    terraces: function (g, X, B) {
      g.poly([[X + 10, B - 20], [X + 34, B - 80], [X + 44, B - 84], [X + 70, B - 20]], function (x, y) { return x < X + 38 ? '#3a8a3a' : '#2a6a2a'; });
      g.poly([[X - 96, B], [X - 60, B - 40], [X + 50, B - 38], [X + 96, B]], '#4a8a3a');
      for (var k = 0; k < 7; k++) g.rect(X - 70 + k * 4, B - 36 + k * 5, 120 - k * 8, 1, '#7a9a5a');
      for (var r = 0; r < 12; r++) { var hx = X - 50 + (r % 6) * 16, hy = B - 34 + Math.floor(r / 6) * 10; g.rect(hx, hy, 10, 6, '#9a9488'); g.poly([[hx - 1, hy], [hx + 5, hy - 4], [hx + 11, hy]], '#8a8478'); }
    },
    camp: function (g, X, B) {
      [[-50, 1], [-14, 1.3], [24, 1.1], [62, 0.9]].forEach(function (t) { var x = X + t[0], s = t[1];
        g.rect(x - 12 * s, B + 4 - 10 * s, 24 * s, 10 * s, '#f0ece0'); g.ell(x, B + 4 - 10 * s, 12 * s, 6 * s, '#e4dccc', 'top'); g.rect(x - 2 * s, B + 4 - 7 * s, 4 * s, 7 * s, '#c83a2a');
        g.rect(x - 12 * s, B + 4 - 6 * s, 24 * s, 1, '#c83a2a'); });
      var hx = X + 46; g.rect(hx, B + 6, 12, 5, '#6a3a20'); g.rect(hx + 1, B + 11, 1, 5, '#6a3a20'); g.rect(hx + 10, B + 11, 1, 5, '#6a3a20'); g.rect(hx + 11, B + 2, 3, 6, '#6a3a20');
    },
    longship: function (g, X, B, o) {
      LM.fjord(g, X, B, o, Math.random);
      [[X - 10, 1.2], [X + 50, 0.8]].forEach(function (b) { var x = b[0], s = b[1], y = B + 18;
        g.poly([[x - 26 * s, y - 4 * s], [x + 26 * s, y - 4 * s], [x + 18 * s, y + 2 * s], [x - 18 * s, y + 2 * s]], '#6a3a1a');
        g.line(x - 26 * s, y - 4 * s, x - 30 * s, y - 12 * s, '#6a3a1a'); g.line(x + 26 * s, y - 4 * s, x + 30 * s, y - 12 * s, '#6a3a1a');
        g.rect(x, y - 30 * s, 1, 26 * s, '#3a2a1a'); g.rect(x - 12 * s, y - 28 * s, 24 * s, 18 * s, function (px) { return Math.floor(px / 3) % 2 ? '#c83a2a' : '#f0e8d8'; });
        for (var k = -20; k < 20; k += 5) g.ell(x + k * s, y - 4 * s, 2 * s, 2 * s, '#e8c040'); });
    },
    cabin: function (g, X, B, o) {
      LM.mountain(g, X + 30, B, { c: '#6a7a9a' });
      g.rect(X - 22, B - 16, 44, 16, function (x, y) { return y % 3 === 0 ? '#5a3a1a' : '#8a5a2a'; });
      g.poly([[X - 26, B - 16], [X, B - 30], [X + 26, B - 16]], '#4a3a2a'); g.rect(X - 4, B - 10, 8, 10, '#3a2010'); g.rect(X - 16, B - 12, 6, 5, o.night ? '#ffd860' : '#9ac4f0'); g.rect(X + 10, B - 12, 6, 5, o.night ? '#ffd860' : '#9ac4f0');
      g.rect(X + 12, B - 34, 4, 10, '#6a6a6a');
    },
    oasis: function (g, X, B, o) {
      g.poly([[0, B + 2], [40, B - 8], [90, B + 2], [140, B - 10], [W, B], [W, H], [0, H]], '#e0b468');
      g.ell(X, B + 14, 26, 6, '#3a7ac0'); g.ell(X, B + 13, 20, 4, '#5a9ad8');
      tree(g, 'palm', X - 30, B + 14, 24, o.night); tree(g, 'palm', X + 22, B + 12, 28, o.night); tree(g, 'palm', X + 36, B + 16, 20, o.night);
    },
    sphinx: function (g, X, B, o) {
      LM.pyramid(g, X + 30, B - 6, { c: '#d8b070' });
      var c = '#c8a060';
      g.rect(X - 50, B - 10, 52, 12, lit(X - 24, c, 0.1)); g.rect(X - 54, B - 2, 16, 4, c);
      g.rect(X - 6, B - 26, 14, 18, lit(X, c)); g.poly([[X - 9, B - 26], [X - 4, B - 31], [X + 10, B - 31], [X + 11, B - 12], [X + 8, B - 12], [X + 8, B - 26]], function (x, y) { return y % 2 ? '#b89050' : '#d8b070'; });
      g.rect(X - 4, B - 20, 3, 2, '#5a4020'); g.rect(X - 6, B - 15, 6, 2, '#a07a40');
    }
  };

  function scene(cv, place, opt) {
    opt = opt || {};
    var s = place.scene || {}, R = rng(place.id || place.name), g = new G(W, H);
    var sk = opt.sky || s.sky || 'day', land = s.land || 'city', hz = land === 'sea' ? 82 : 86;
    sky(g, sk, hz, R); far(g, land, hz, sk, R); ground(g, land, hz, sk, R);
    var X = Math.round(W / 2 + (R() - 0.5) * 30), fn = LM[s.k] || LM.skyline;
    var o = { c: s.c, c2: s.c2, night: sk === 'night' || sk === 'dusk' };
    try { fn(g, X, hz + 2, o, R); } catch (e) { if (window.console) console.warn('scene', s.k, e); }
    var t = s.trees || 'none';
    if (t !== 'none' && s.k !== 'beach' && s.k !== 'oasis') { tree(g, t, 6 + R() * 10, H - 6, 26 + R() * 8, o.night); tree(g, t, W - 18 - R() * 8, H - 2, 30 + R() * 8, o.night); if (R() < 0.5) tree(g, t, 30 + R() * 10, H - 12, 18, o.night); }
    g.put(cv); return cv;
  }

  // ── Interiors (where witnesses are questioned) ─────────────────────────────
  var INTERIOR = {
    bank: function (g, R) {
      g.vgrad(0, 0, W, 80, ['#6a5a4a', '#8a7a62']); columns(g, 6, W, 6, 70, '#d8ccb0', 34);
      g.rect(0, 70, W, 50, function (x, y) { return ((x >> 3) + (y >> 3)) % 2 ? '#3a3030' : '#d8d0c0'; });
      g.rect(0, 62, W, 18, '#5a3a20'); g.rect(0, 60, W, 3, '#c8a040'); for (var x = 4; x < W; x += 6) g.rect(x, 36, 1, 24, '#c8a040'); g.rect(0, 36, W, 2, '#c8a040');
      g.rect(80, 14, 32, 14, '#2a2a3a'); g.rect(82, 16, 28, 10, '#3a3a54');
    },
    library: function (g, R) {
      g.rect(0, 0, W, H, '#4a3020');
      for (var y = 6; y < 92; y += 18) { g.rect(0, y + 14, W, 3, '#2a1a10'); for (var x = 0; x < W; x += 2 + (R() * 2 | 0)) { var h = 9 + R() * 5 | 0; g.rect(x, y + 14 - h, 2, h, ['#a83a2a', '#2a5a8a', '#3a7a3a', '#c8a040', '#6a3a7a', '#e8dcc0'][R() * 6 | 0]); } }
      g.rect(0, 96, W, 24, '#6a4a2a'); g.rect(60, 84, 72, 6, '#8a5a30'); g.rect(64, 90, 4, 20, '#5a3a1a'); g.rect(124, 90, 4, 20, '#5a3a1a'); g.ell(96, 80, 6, 3, '#e8c040'); g.rect(95, 74, 2, 6, '#3a3a3a');
    },
    museum: function (g, R) {
      g.vgrad(0, 0, W, 90, ['#c8c0b0', '#e0d8c8']); g.rect(0, 90, W, 30, function (x, y) { return (x + y * 2) % 16 < 8 ? '#a89070' : '#8a7458'; });
      [[22, 22, 34, 26], [80, 16, 32, 40], [140, 24, 30, 24]].forEach(function (f, i) { g.rect(f[0] - 3, f[1] - 3, f[2] + 6, f[3] + 6, '#c8a040'); g.vgrad(f[0], f[1], f[2], f[3], [['#3a6aa8', '#c86a3a', '#3a7a4a'][i], ['#e8d890', '#3a2a5a', '#c8d8a0'][i]]); });
      g.rect(60, 74, 6, 18, '#e8e4dc'); g.rect(124, 74, 6, 18, '#e8e4dc'); g.rect(56, 72, 74, 2, '#a83a2a'); g.ell(96, 70, 8, 10, '#d8d4cc');
    },
    airport: function (g, R) {
      g.rect(0, 0, W, H, '#5a6070'); g.vgrad(4, 6, W - 8, 56, ['#5a8ee0', '#c4e2f6']); for (var x = 4; x < W; x += 30) g.rect(x, 6, 2, 56, '#3a404a');
      g.rect(20, 46, 70, 6, '#e8e8f0'); g.poly([[40, 46], [56, 30], [62, 30], [52, 46]], '#e8e8f0'); g.poly([[80, 46], [86, 36], [90, 36], [88, 46]], '#c83a2a'); g.rect(4, 58, W - 8, 4, '#8a8a8a');
      g.rect(110, 14, 70, 30, '#101820'); for (var y = 18; y < 42; y += 6) g.rect(114, y, 62, 2, (y / 6) % 2 ? '#f0c040' : '#e8e8e8');
      g.rect(0, 92, W, 28, '#8a8a92'); g.rect(30, 84, 130, 10, '#3a4a6a');
    },
    hotel: function (g, R) {
      g.rect(0, 0, W, H, function (x, y) { return (x >> 2) % 3 ? '#7a2a3a' : '#6a2232'; }); g.rect(0, 96, W, 24, '#4a2a1a');
      g.rect(24, 70, 144, 26, '#6a4020'); g.rect(24, 68, 144, 3, '#c8a040');
      g.rect(130, 14, 50, 36, '#4a2a1a'); for (var k = 0; k < 12; k++) { g.rect(134 + (k % 6) * 7, 18 + Math.floor(k / 6) * 14, 5, 8, '#3a1a10'); g.rect(136 + (k % 6) * 7, 22 + Math.floor(k / 6) * 14, 1, 4, '#e8c040'); }
      g.ell(60, 66, 4, 3, '#e8c040'); g.rect(59, 62, 2, 2, '#e8c040'); g.ell(30, 20, 10, 6, '#ffd860'); g.rect(29, 6, 2, 10, '#3a2a1a');
    },
    dock: function (g, R) {
      g.vgrad(0, 0, W, 60, SKY.day); g.vgrad(0, 60, W, 60, ['#3a6aa8', '#1a3a7a']);
      for (var k = 0; k < 40; k++) g.rect(R() * W, 62 + R() * 56, 3, 1, '#8ab8e8');
      g.rect(0, 74, W, 10, '#7a5a3a'); for (var x = 0; x < W; x += 16) g.rect(x, 84, 3, 20, '#5a3a1a');
      [[10, 58, 18], [32, 62, 14], [140, 56, 20]].forEach(function (c) { g.rect(c[0], c[1], c[2], 74 - c[1], function (px, py) { return (px + py) % 6 === 0 ? '#6a4a2a' : '#a0703a'; }); });
      g.poly([[90, 52], [130, 52], [124, 60], [96, 60]], '#3a3a4a'); g.rect(108, 30, 2, 22, '#3a2a1a');
    },
    market: function (g, R) {
      g.vgrad(0, 0, W, 70, SKY.day); g.rect(0, 70, W, 50, '#c8a878');
      [[0, '#c83a2a'], [64, '#2a6ac8'], [128, '#e8a020']].forEach(function (s) {
        var x = s[0]; g.rect(x + 4, 40, 56, 40, '#8a6a4a'); g.rect(x + 2, 34, 60, 8, function (px) { return (px >> 2) % 2 ? s[1] : '#f4f0e0'; });
        for (var k = 0; k < 10; k++) g.ell(x + 10 + (k % 5) * 10, 64 + Math.floor(k / 5) * 6, 4, 3, ['#e8402a', '#f0c030', '#5ab03a', '#e88a20'][(k + x) % 4]);
      });
    },
    embassy: function (g, R) {
      g.rect(0, 0, W, H, '#d8d0bc'); g.rect(0, 92, W, 28, '#5a3a3a'); g.rect(20, 0, 3, 92, '#c8b89a'); g.rect(168, 0, 3, 92, '#c8b89a');
      [[40, '#c83a2a'], [140, '#2a4aa8']].forEach(function (f) { g.rect(f[0], 20, 2, 70, '#8a7a5a'); g.rect(f[0] + 2, 22, 22, 14, function (x, y) { return ((y - 22) / 5 | 0) % 2 ? '#f4f0e0' : f[1]; }); g.ell(f[0] + 1, 19, 2, 2, '#e8c040'); });
      g.rect(60, 70, 72, 6, '#6a3a1a'); g.rect(64, 76, 64, 16, '#5a3018'); g.ell(96, 26, 12, 12, '#c8a040'); g.ell(96, 26, 9, 9, '#e8dcc0');
    },
    exchange: function (g, R) {
      g.rect(0, 0, W, H, '#3a3a4a'); g.rect(8, 8, W - 16, 40, '#0a0a10');
      for (var y = 12; y < 44; y += 7) for (var x = 12; x < W - 16; x += 16) { g.rect(x, y, 10, 2, R() < 0.5 ? '#40e060' : '#e04040'); g.p(x + 12, y, '#e8e8e8'); }
      g.rect(0, 90, W, 30, '#6a6a7a'); g.rect(30, 70, 132, 20, '#2a2a3a'); for (x = 34; x < 160; x += 14) g.rect(x, 72, 10, 7, '#3a7ac0');
    },
    station: function (g, R) {
      g.rect(0, 0, W, H, '#4a4a54'); for (var x = 0; x < W; x += 24) { g.ell(x + 12, 40, 12, 36, '#6a6a74', 'top'); g.ell(x + 12, 40, 10, 34, '#2a3040', 'top'); }
      g.rect(0, 40, W, 4, '#6a6a74'); g.rect(0, 80, W, 40, '#8a8a80'); g.rect(0, 100, W, 3, '#3a3a3a'); g.rect(0, 108, W, 3, '#3a3a3a');
      g.rect(30, 60, 120, 20, '#2a5a3a'); for (x = 36; x < 146; x += 14) g.rect(x, 64, 10, 7, '#e8e4c0'); g.ell(96, 14, 8, 8, '#f4f0e0'); g.line(96, 14, 96, 9, '#202020'); g.line(96, 14, 99, 15, '#202020');
    }
  };
  function interior(cv, kind, seed) { var g = new G(W, H); (INTERIOR[kind] || INTERIOR.hotel)(g, rng(kind + seed)); g.put(cv); return cv; }

  // ── Portraits (48 × 56): suspects and witnesses ────────────────────────────
  // look: {sex:'F'|'M', hair:'Black'|'Brown'|'Red'|'Blond'|'Gray'|..., style, skin, coat, bg, hat, glasses, feature, seed, carmen}
  var HAIR = { Black: '#1c1a1e', Brown: '#5a3418', Red: '#b8401c', Blond: '#e8c060', Gray: '#a8a8ac', White: '#e8e8e8' };
  var SKIN = ['#f4cca0', '#e0b088', '#c88a5c', '#a06a40', '#7a4a2a', '#5a3420'];
  function portrait(cv, L) {
    var g = new G(48, 56), R = rng(L.seed || L.name || 'x');
    var bg = L.bg || ['#3a5a8a', '#5a3a6a', '#3a6a5a', '#6a4a3a', '#4a4a6a'][R() * 5 | 0];
    g.vgrad(0, 0, 48, 56, [shade(bg, 0.15), shade(bg, -0.35)]);
    var skin = L.skin || SKIN[R() * SKIN.length | 0], skD = shade(skin, -0.22), hair = HAIR[L.hair] || L.hair || '#3a2a1a', hD = shade(hair, -0.35);
    var coat = L.coat || ['#2a3a5a', '#5a2a2a', '#2a4a3a', '#4a4a4a', '#6a5a3a', '#3a2a4a'][R() * 6 | 0];
    var F = L.sex === 'F', cx = 24;
    var longHair = F && !L.carmen && (L.style || (R() < 0.6 ? 'long' : 'bob')) === 'long';
    if (longHair) g.rect(cx - 12, 14, 24, 30, hD);
    g.poly([[2, 56], [6, 44], [16, 39], [32, 39], [42, 44], [46, 56]], function (x, y) { return x < 24 ? shade(coat, 0.12) : coat; });
    if (L.carmen) { g.poly([[12, 40], [18, 30], [24, 42], [30, 30], [36, 40], [34, 56], [14, 56]], '#b81c1c'); g.poly([[18, 40], [24, 44], [30, 40], [28, 56], [20, 56]], '#e8e0d0'); }
    else if (!F) { g.poly([[19, 40], [24, 47], [29, 40]], '#e8e4dc'); g.rect(23, 42, 2, 10, L.tie || ['#a82a2a', '#2a4a9a', '#c8a040'][R() * 3 | 0]); }
    else g.poly([[18, 40], [24, 46], [30, 40]], skin);
    g.rect(20, 33, 8, 8, skD);
    g.ell(cx, 24, 9.5, 12, function (x, y) { return x > cx + 5 ? skD : skin; });
    g.rect(cx - 10, 23, 2, 5, skin); g.rect(cx + 8, 23, 2, 5, skD);
    var hs = L.style || (F ? (longHair ? 'long' : 'bob') : ['short', 'short', 'slick', 'bald', 'curly'][R() * 5 | 0]);
    if (!L.carmen) {
      if (hs === 'bald') { g.rect(cx - 10, 20, 3, 6, hair); g.rect(cx + 7, 20, 3, 6, hair); }
      else {
        g.ell(cx, 17, 10.5, 7, hair, 'top'); g.rect(cx - 10, 16, 21, 3, hair);
        if (hs === 'curly') for (var k = 0; k < 14; k++) g.ell(cx - 10 + (k % 7) * 3.3, 11 + (k >> 3) * 4, 2.2, 2, k % 2 ? hair : hD);
        if (hs === 'slick') g.line(cx - 6, 12, cx + 6, 15, hD);
        if (F) { g.rect(cx - 11, 16, 3, hs === 'long' ? 26 : 14, hair); g.rect(cx + 8, 16, 3, hs === 'long' ? 26 : 14, hD); g.poly([[cx - 9, 16], [cx - 2, 16], [cx - 8, 22]], hair); }
        else { g.rect(cx - 10, 16, 2, 6, hair); g.rect(cx + 8, 16, 2, 6, hD); }
      }
    }
    // eyes, brows, nose, mouth
    var ey = 24;
    g.rect(cx - 6, ey, 3, 2, '#ffffff'); g.rect(cx + 3, ey, 3, 2, '#ffffff'); g.p(cx - 5, ey, '#1a1a2a'); g.p(cx - 5, ey + 1, '#1a1a2a'); g.p(cx + 4, ey, '#1a1a2a'); g.p(cx + 4, ey + 1, '#1a1a2a');
    g.rect(cx - 7, ey - 2, 4, 1, hD); g.rect(cx + 3, ey - 2, 4, 1, hD);
    g.rect(cx, ey + 3, 1, 4, skD); g.p(cx - 1, ey + 6, skD);
    var mouth = F ? '#b83a4a' : shade(skin, -0.35); g.rect(cx - 3, ey + 9, 6, 1, mouth); if (F) g.rect(cx - 2, ey + 10, 4, 1, shade(mouth, 0.2));
    if (L.mustache) g.rect(cx - 4, ey + 8, 8, 1, hair);
    if (L.beard) g.ell(cx, ey + 11, 7, 4, hair, 'bot');
    if (L.glasses) { g.rect(cx - 7, ey - 1, 5, 4, null); [cx - 7, cx + 2].forEach(function (x) { g.line(x, ey - 1, x + 4, ey - 1, '#202020'); g.line(x, ey + 2, x + 4, ey + 2, '#202020'); g.p(x, ey, '#202020'); g.p(x + 4, ey, '#202020'); g.p(x, ey + 1, '#202020'); g.p(x + 4, ey + 1, '#202020'); }); g.line(cx - 2, ey, cx + 2, ey, '#202020'); }
    // hats
    if (L.carmen) {
      g.rect(cx - 10, 16, 3, 18, '#2a1a1a'); g.rect(cx + 7, 16, 3, 18, '#1a1010');
      g.ell(cx, 16, 18, 3.5, '#a8141c'); g.ell(cx, 15, 18, 2.5, '#c81e24');
      g.ell(cx, 12, 10, 8, '#c81e24', 'top'); g.rect(cx - 10, 11, 20, 3, '#c81e24'); g.rect(cx - 10, 13, 20, 2, '#2a1a1a');
      g.rect(cx - 9, 17, 18, 5, function (x, y) { return y === 17 ? '#3a1a1a' : null; });
      g.rect(cx - 8, 18, 16, 3, null); for (var x2 = cx - 9; x2 < cx + 10; x2++) g.d(x2, 18, null, shade(skin, -0.45), 0.5);
    } else if (L.hat === 'fedora') { g.ell(cx, 15, 15, 3, '#3a3a3a'); g.ell(cx, 11, 9, 7, '#4a4a4a', 'top'); g.rect(cx - 9, 10, 18, 3, '#4a4a4a'); g.rect(cx - 9, 12, 18, 1, '#1a1a1a'); }
    else if (L.hat === 'cap') { g.ell(cx, 13, 10, 6, L.capc || '#2a3a6a', 'top'); g.rect(cx - 10, 12, 20, 3, L.capc || '#2a3a6a'); g.rect(cx - 2, 14, 14, 2, '#1a1a2a'); g.rect(cx - 2, 8, 4, 3, '#e8c040'); }
    // features from the dossier
    var f = L.feature;
    if (f === 'Scar') { g.line(cx + 4, ey + 3, cx + 7, ey + 9, '#8a2a2a'); g.p(cx + 5, ey + 5, '#e8c0b0'); g.p(cx + 6, ey + 7, '#e8c0b0'); }
    if (f === 'Tattoo') { var tx = 9, ty = 47; g.ell(tx + 2, ty, 3, 3, '#2a4a8a'); g.rect(tx + 2, ty - 4, 1, 8, '#2a4a8a'); g.rect(tx, ty - 3, 5, 1, '#2a4a8a'); g.rect(tx - 2, 44, 10, 1, shade(coat, -0.3)); }
    if (f === 'Jewelry') { g.rect(cx - 10, ey + 4, 2, 3, '#f0d040'); g.rect(cx + 8, ey + 4, 2, 3, '#f0d040'); for (var j = -6; j <= 6; j++) g.p(cx + j, 41 + Math.round(Math.abs(j) * -0.3 + 2), j % 2 ? '#f0d040' : '#ffffff'); }
    if (f === 'Ring') { g.ell(38, 47, 4, 4, skin); g.rect(35, 47, 7, 9, skin); g.rect(35, 46, 7, 2, '#f0d040'); g.p(38, 45, '#e04060'); g.p(39, 45, '#ff8090'); }
    if (f === 'Limps') { g.rect(40, 36, 2, 20, '#5a3a1a'); g.rect(36, 34, 6, 2, '#5a3a1a'); g.ell(41, 42, 3, 3, skin); }
    g.put(cv); return cv;
  }

  // ── The travel map ─────────────────────────────────────────────────────────
  var MAPW = 384, MAPH = 240, ringsCache = {};
  function unpack(s) {
    var out = [], parts = s.split(';'), a = parts[0].split(','), x = parseInt(a[0], 36), y = parseInt(a[1], 36); out.push([x / 10, y / 10]);
    for (var i = 1; i < parts.length; i++) { a = parts[i].split(','); x += parseInt(a[0], 36); y += parseInt(a[1], 36); out.push([x / 10, y / 10]); }
    return out;
  }
  function rings(kind) {
    if (ringsCache[kind]) return ringsCache[kind];
    var M = window.CARMEN_MAPS || {}, src = M[kind] || '';
    return (ringsCache[kind] = src ? src.split('|').map(function (r) { var id = null, m = /^(\d+):/.exec(r); if (m) { id = m[1]; r = r.slice(m[0].length); } return { id: id, pts: unpack(r) }; }) : []);
  }
  // view: {lon0, lon1, lat0, lat1} (or 'usa'); returns the projection used
  function mapProj(view) {
    if (view === 'usa') {
      var main = mk({ lon0: -126, lon1: -65, lat0: 23, lat1: 50 }, 0, 0, MAPW, MAPH, 0);
      var ak = mk({ lon0: -170, lon1: -130, lat0: 51, lat1: 72 }, 4, MAPH - 74, 88, 70, 1), hi = mk({ lon0: -161, lon1: -154.5, lat0: 18.8, lat1: 22.4 }, 96, MAPH - 40, 50, 34, 1);
      return function (lat, lon) { if (lon < -129 && lat > 50) return ak(lat, lon); if (lon < -150 && lat < 25) return hi(lat, lon); return main(lat, lon); };
    }
    return mk(view, 0, 0, MAPW, MAPH, 0);
    function mk(v, ox, oy, w, h, stretch) {
      var lm = (v.lat0 + v.lat1) / 2, k = Math.cos(lm * Math.PI / 180), pw = (v.lon1 - v.lon0) * k, ph = v.lat1 - v.lat0;
      var sc = stretch ? Math.min(w / pw, h / ph) : Math.min(w / pw, h / ph), dx = ox + (w - pw * sc) / 2, dy = oy + (h - ph * sc) / 2;
      return function (lat, lon) { var L = lon; if (v.lon1 > 180 && L < v.lon0) L += 360; return { x: dx + (L - v.lon0) * k * sc, y: dy + (v.lat1 - lat) * sc }; };
    }
  }
  function map(cv, view, opt) {
    opt = opt || {};
    var g = new G(MAPW, MAPH), pr = mapProj(view), land = opt.land || '#3c8a3c', coast = opt.coast || '#2a6a2a';
    g.rect(0, 0, MAPW, MAPH, function (x, y) { return (x + y * 3) % 23 === 0 ? '#2a4cb0' : '#1e3c9a'; });
    var list = view === 'usa' ? rings('usa') : rings('world');
    var shift = view !== 'usa' && view.lon1 > 180;
    list.forEach(function (r) {
      var lo = Infinity, hi = -Infinity; r.pts.forEach(function (p) { lo = Math.min(lo, p[0]); hi = Math.max(hi, p[0]); });
      var wrap = view !== 'usa' && hi - lo > 300;   // a ring cut at the date line (eastern Russia): keep it on one side
      var pts = r.pts.map(function (p) { var q = pr(p[1], wrap && p[0] < 0 ? p[0] + 360 : p[0]); return [q.x, q.y]; });
      var minx = Infinity, maxx = -Infinity; pts.forEach(function (q) { minx = Math.min(minx, q[0]); maxx = Math.max(maxx, q[0]); });
      if (maxx < 0 || minx > MAPW) return;
      if (view !== 'usa' && r.pts.every(function (q) { return q[1] < -55; })) return;   // (no Antarctica)
      var c = view === 'usa' ? ['#4a9a4a', '#5aa850', '#3c8a40', '#6ab05a', '#4c9448'][(parseInt(r.id, 10) || 0) % 5] : land;
      g.poly(pts, function (x, y) { return ((x * 73856093) ^ (y * 19349663)) % 29 === 0 ? shade(c, 0.12) : c; });
    });
    // coastlines/borders: darken land pixels that touch water or a different state colour
    var b = g.b, sea1 = u32('#2a4cb0'), sea2 = u32('#1e3c9a'), cst = u32(coast), out = new Uint32Array(b);
    for (var y = 1; y < MAPH - 1; y++) for (var x = 1; x < MAPW - 1; x++) {
      var v = b[y * MAPW + x]; if (v === sea1 || v === sea2) continue;
      var n = b[y * MAPW + x + 1], s = b[(y + 1) * MAPW + x];
      if (n === sea1 || n === sea2 || s === sea1 || s === sea2) out[y * MAPW + x] = cst;
      else if (view === 'usa' && ((n !== v && Math.abs(n - v) > 0x40000 && n !== cst) || (s !== v && Math.abs(s - v) > 0x40000 && s !== cst))) out[y * MAPW + x] = u32('#2a5a2a');
    }
    g.b = out;
    if (view === 'usa') { g.rect(2, MAPH - 76, 92, 74, null); [[2, MAPH - 76, 92, 74], [94, MAPH - 42, 54, 38]].forEach(function (bx) { g.line(bx[0], bx[1], bx[0] + bx[2], bx[1], '#6a8ad0'); g.line(bx[0] + bx[2], bx[1], bx[0] + bx[2], bx[1] + bx[3], '#6a8ad0'); }); }
    g.put(cv);
    return function (lat, lon) { var q = pr(lat, lon); return { x: q.x / MAPW, y: q.y / MAPH }; };
  }

  // ── Big moments ───────────────────────────────────────────────────────────
  // title: Carmen in silhouette over a spinning-globe night sky
  function title(cv, t) {
    var g = new G(W, H), R = rng('title');
    g.vgrad(0, 0, W, H, ['#05051a', '#1a0a3a', '#3a0a2a']);
    for (var i = 0; i < 60; i++) g.p(R() * W, R() * H, R() < 0.3 ? '#ffffff' : '#7a7ac0');
    var gx = 136, gy = 82, gr = 36, rot = (t || 0) * 0.02;
    g.ell(gx, gy, gr, gr, function (x, y) {
      var nx = (x - gx) / gr, ny = (y - gy) / gr, z = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny)), lon = Math.atan2(nx, z) + rot, lat = Math.asin(ny);
      var l = Math.sin(lon * 2.3) * Math.cos(lat * 3) + Math.sin(lon * 5 + lat * 4) * 0.4 > 0.35;
      var t2 = 0.25 + 0.75 * z * (0.6 - nx * 0.4);
      return l ? mix('#0a2a0a', '#5ab04a', t2) : mix('#020a30', '#3a6ad8', t2);
    });
    for (var a = 0; a < 6; a++) { var yy = gy - gr + a * gr / 3; g.ell(gx, gy, gr, gr, function (x, y) { return y === Math.round(yy) ? null : null; }); }
    // Carmen: trench coat with the collar up and the wide-brimmed hat, lit from the globe on the right
    var X = 50, B = H + 14, red = '#c81e24', rd = '#7a0e14', rl = '#f0484a';
    g.poly([[X - 30, B], [X - 20, B - 50], [X - 13, B - 62], [X + 13, B - 62], [X + 20, B - 50], [X + 32, B]], function (x, y) {
      var fold = ((x - X) * 3 + y) % 11 === 0; return x > X + 10 ? (fold ? red : rl) : x < X - 8 ? (fold ? '#5a0a10' : rd) : fold ? rd : red; });
    g.poly([[X - 14, B - 62], [X - 4, B - 40], [X - 1, B - 60]], rd); g.poly([[X + 14, B - 62], [X + 4, B - 40], [X + 1, B - 60]], rl);   // lapels
    g.rect(X - 22, B - 30, 46, 3, '#4a0a0e'); g.rect(X - 2, B - 31, 5, 5, '#e8c040'); g.rect(X - 1, B - 30, 3, 3, '#4a0a0e');   // belt and buckle
    g.poly([[X + 18, B - 50], [X + 26, B - 26], [X + 22, B - 24], [X + 15, B - 44]], rl); g.ell(X + 24, B - 24, 3, 3, '#e8b48a');   // arm, glove
    g.poly([[X - 15, B - 63], [X - 11, B - 78], [X - 6, B - 64]], red); g.poly([[X + 15, B - 63], [X + 11, B - 78], [X + 6, B - 64]], rl);   // collar up
    g.rect(X - 5, B - 76, 10, 14, '#e0a880'); g.rect(X + 2, B - 76, 3, 14, '#f0c09a'); g.rect(X - 5, B - 76, 10, 4, '#5a3020');   // face, brim shadow
    g.rect(X - 1, B - 66, 4, 1, '#c81e3a'); g.rect(X - 8, B - 78, 4, 16, '#1a0e0e'); g.rect(X + 5, B - 77, 2, 6, '#1a0e0e');   // lips, hair
    g.ell(X, B - 79, 22, 4, rd); g.ell(X + 1, B - 80, 21, 3, red); g.rect(X + 6, B - 81, 12, 1, rl);   // brim
    g.ell(X, B - 84, 11, 9, function (x) { return x > X + 4 ? rl : x < X - 6 ? rd : red; }, 'top'); g.rect(X - 11, B - 85, 22, 4, red);
    g.rect(X - 11, B - 83, 22, 2, '#1a0a0a'); g.line(X - 2, B - 92, X + 2, B - 88, rd);   // band, crease
    g.put(cv); return cv;
  }
  // a henchman dashing past: drawn on its own small canvas and slid across the picture by CSS
  function henchman(cv) {
    var g = new G(20, 34), c = '#2a2a34';
    g.ell(10, 4, 7, 2, c); g.ell(10, 2, 4, 3, c, 'top'); g.rect(8, 4, 4, 4, '#c8a080');
    g.poly([[4, 30], [6, 9], [14, 9], [17, 30]], c); g.rect(2, 12, 4, 10, c); g.rect(15, 12, 3, 9, c);
    g.poly([[6, 30], [3, 34], [6, 34], [9, 30]], '#101014'); g.poly([[12, 30], [16, 34], [19, 34], [15, 30]], '#101014');
    g.put(cv); return cv;
  }
  function plane(cv) {
    var g = new G(16, 10), c = '#f4f4f4', d = '#a8a8b0';
    g.rect(1, 4, 13, 2, c); g.poly([[14, 4], [16, 5], [14, 6]], c); g.poly([[6, 4], [9, 0], [10, 0], [9, 4]], d); g.poly([[6, 6], [9, 10], [10, 10], [9, 6]], d); g.rect(0, 2, 2, 3, '#c83a2a'); g.rect(4, 4, 8, 1, '#5a8ac8');
    g.put(cv); return cv;
  }

  window.CarmenArt = { W: W, H: H, scene: scene, interior: interior, portrait: portrait, map: map, title: title, henchman: henchman, plane: plane, kinds: Object.keys(LM), interiors: Object.keys(INTERIOR), rng: rng };
})();
