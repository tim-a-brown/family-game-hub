// Goblin Defenders: drawing helpers. The sprite sheets (rendered from 3D models by scripts/goblin-sprites), the
// painted ground of each land, the wooden frame round the screen, buttons, medallions and plaques.
(function (root) {
  'use strict';
  var ELEV = 40 * Math.PI / 180, COSE = Math.cos(ELEV);
  var A = { sheets: {}, F: null, ready: false, COSE: COSE };

  // ── Sprites ──────────────────────────────────────────────────────────────
  A.load = function (base, done) {
    var x = new XMLHttpRequest(); x.open('GET', base + 'sprites.json'); x.onload = function () {
      var idx; try { idx = JSON.parse(x.responseText); } catch (e) { return done && done(false); }
      A.F = idx.frames; if (idx.elev) { A.COSE = Math.cos(idx.elev * Math.PI / 180); A.SINE = Math.sin(idx.elev * Math.PI / 180); }
      var names = Object.keys(idx.sheets), left = names.length, failed = false;
      names.forEach(function (n) {
        var im = new Image(); im.decoding = 'async';
        im.onload = function () { A.sheets[n] = im; if (--left === 0) { A.ready = !failed; done && done(!failed); } };
        im.onerror = function () { failed = true; if (--left === 0) done && done(false); };
        im.src = base + idx.sheets[n].file;
      });
    };
    x.onerror = function () { done && done(false); }; x.send();
  };
  A.has = function (k) { return !!(A.F && A.F[k]); };
  // draw frame k with its anchor at (x, y); s = screen px per cell. o: {flip, alpha, rot, scale}
  A.spr = function (g, k, x, y, s, o) {
    var f = A.F && A.F[k]; if (!f) return; var im = A.sheets[f.s]; if (!im) return;
    var sc = s / (f.u || 128) * (o && o.scale || 1);
    if (o && (o.flip || o.rot || o.alpha != null)) {
      g.save(); g.translate(x, y); if (o.rot) g.rotate(o.rot); if (o.flip) g.scale(-1, 1); if (o.alpha != null) g.globalAlpha *= o.alpha;
      g.drawImage(im, f.x, f.y, f.w, f.h, -f.ax * sc, -f.ay * sc, f.w * sc, f.h * sc); g.restore();
    } else g.drawImage(im, f.x, f.y, f.w, f.h, x - f.ax * sc, y - f.ay * sc, f.w * sc, f.h * sc);
  };
  // a frame on its own little canvas (for tints and greyed-out icons), cached
  var cut = {};
  A.cut = function (k, mode) {
    var key = k + '|' + (mode || ''); if (cut[key]) return cut[key];
    var f = A.F && A.F[k], im = f && A.sheets[f.s]; if (!im) return null;
    var c = document.createElement('canvas'); c.width = f.w; c.height = f.h; var g = c.getContext('2d');
    g.drawImage(im, f.x, f.y, f.w, f.h, 0, 0, f.w, f.h);
    if (mode === 'grey') {
      var d = g.getImageData(0, 0, f.w, f.h), p = d.data;
      for (var i = 0; i < p.length; i += 4) { var l = p[i] * .3 + p[i + 1] * .55 + p[i + 2] * .15; p[i] = p[i + 1] = p[i + 2] = l * .78 + 30; }
      g.putImageData(d, 0, 0);
    } else if (mode) {   // a colour wash over the silhouette: 'white' (hit), 'ice', 'acid', 'red'
      g.globalCompositeOperation = 'source-atop'; g.fillStyle = { white: 'rgba(255,255,255,.75)', ice: 'rgba(120,200,255,.5)', acid: 'rgba(120,255,60,.42)', red: 'rgba(255,60,40,.5)', gold: 'rgba(255,210,60,.55)' }[mode] || mode; g.fillRect(0, 0, f.w, f.h);
    }
    c.f = f; cut[key] = c; return c;
  };
  A.sprCut = function (g, k, mode, x, y, s, o) {
    var c = A.cut(k, mode); if (!c) return; var f = c.f, sc = s / (f.u || 128) * (o && o.scale || 1);
    g.save(); g.translate(x, y); if (o && o.flip) g.scale(-1, 1); if (o && o.alpha != null) g.globalAlpha *= o.alpha;
    g.drawImage(c, -f.ax * sc, -f.ay * sc, f.w * sc, f.h * sc); g.restore();
  };
  // an icon (128 x 128, centred) drawn to fit a box of size px
  A.icon = function (g, k, x, y, px, o) { var f = A.F && A.F[k]; if (!f) return; A.spr(g, k, x, y, px * (f.u || 128) / f.w, o); };
  A.iconCut = function (g, k, mode, x, y, px) { var f = A.F && A.F[k]; if (!f) return; A.sprCut(g, k, mode, x, y, px * (f.u || 128) / f.w); };

  // ── Random helpers ───────────────────────────────────────────────────────
  function R(seed) { var s = (seed >>> 0) || 1; return function () { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
  function rgb(h) { var n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
  function mixc(a, b, t) { var x = rgb(a), y = rgb(b); return 'rgb(' + x.map(function (v, i) { return Math.round(v + (y[i] - v) * t); }).join(',') + ')'; }
  function shade(h, d) { return 'rgb(' + rgb(h).map(function (v) { return Math.max(0, Math.min(255, Math.round(v + d))); }).join(',') + ')'; }
  function rgba(h, a) { return 'rgba(' + rgb(h).join(',') + ',' + a + ')'; }
  A.mix = mixc; A.shade = shade; A.rgba = rgba;
  function blob(g, x, y, r, col, a) { var gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, rgba(col, a)); gr.addColorStop(1, rgba(col, 0)); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }

  // ── The ground: one painting per land ────────────────────────────────────
  var LAND = {
    jungle: { base: '#4f9a2c', hi: ['#7cc23a', '#9ad44a', '#62b034'], lo: ['#2f6e1e', '#3a7d22', '#245a18'], road: '#c99a58', roadHi: '#e2bd7c', roadLo: '#8c6232', edge: '#6e8a2a', water: ['#2a8fb0', '#59c3d8'], tuft: '#2f7a1c', flower: ['#fff27a', '#ff8ab0', '#ffffff'] },
    snow: { base: '#c9dcf0', hi: ['#eef6ff', '#ffffff', '#dce9f7'], lo: ['#9db6d6', '#aac2df', '#8aa6cc'], road: '#a7bcd8', roadHi: '#c8d8ee', roadLo: '#7f97bd', edge: '#8fa8cc', water: ['#4f8fd0', '#9fd2f2'], tuft: '#8aa4c8', flower: ['#ffffff'], cracks: '#7d9cc4' },
    desert: { base: '#e2a94a', hi: ['#f2c86a', '#f7d27a', '#ecb85a'], lo: ['#c9852e', '#bf7a2a', '#d6963a'], road: '#b97a38', roadHi: '#d29a52', roadLo: '#8f5a24', edge: '#a8692a', water: ['#2f8fd8', '#6fd0f2'], tuft: '#b3792e', flower: ['#7aa83a'], cracks: '#a06426' },
    canyon: { base: '#b9a183', hi: ['#d5c2a2', '#cfb894', '#c4ad8c'], lo: ['#8f7a62', '#9a846a', '#7f6c56'], road: '#9a7a52', roadHi: '#b8946a', roadLo: '#6e5438', edge: '#7d6448', water: ['#2f7fd0', '#5fb8f0'], tuft: '#6f8a3a', flower: ['#8fae4a'], cracks: '#7a6650' },
    volcano: { base: '#4a3a36', hi: ['#6a5048', '#5e4842', '#73574c'], lo: ['#2a201e', '#33282a', '#251c1a'], road: '#2a2220', roadHi: '#3e3230', roadLo: '#140e0c', edge: '#1a1210', water: ['#ff5a10', '#ffb030'], tuft: '#5a4a40', flower: ['#ff7a20'], cracks: '#ff6a1a' }
  };
  A.LAND = LAND;
  // paint the map. v: {W, H, C, ox, oy} screen layout (css px), dpr; map; Core state s (for cells). Returns a canvas.
  A.paintMap = function (map, s, v, dpr) {
    var L = LAND[map.land] || LAND.jungle, W = Math.ceil(v.W * dpr), H = Math.ceil(v.H * dpr);
    var c = document.createElement('canvas'); c.width = W; c.height = H; var g = c.getContext('2d');
    g.scale(dpr, dpr);
    var C = v.C, ox = v.ox, oy = v.oy, rnd = R(map.seed * 977 + 13);
    function X(x) { return ox + x * C; } function Y(y) { return oy + y * C; }
    // base and broad painterly patches
    g.fillStyle = L.base; g.fillRect(0, 0, v.W, v.H);
    var n = Math.round(v.W * v.H / (C * C) * 3);
    for (var i = 0; i < n; i++) blob(g, rnd() * v.W, rnd() * v.H, C * (.6 + rnd() * 1.6), (rnd() < .5 ? L.hi : L.lo)[Math.floor(rnd() * 3)], .28 + rnd() * .25);
    // brush strokes: short curved dabs in light and dark, the painted texture
    for (i = 0; i < n * 9; i++) {
      var x = rnd() * v.W, y = rnd() * v.H, a = (rnd() - .5) * 1.2, l = C * (.08 + rnd() * .22);
      g.strokeStyle = rgba((rnd() < .55 ? L.hi : L.lo)[Math.floor(rnd() * 3)], .18 + rnd() * .3); g.lineWidth = C * (.03 + rnd() * .05); g.lineCap = 'round';
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a) * l * .5, y + Math.sin(a) * l * .5 - l * .2, x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
    }
    if (L.cracks) {   // cracks in ice, sand, rock and ash
      g.strokeStyle = rgba(L.cracks, map.land === 'volcano' ? .55 : .35); g.lineWidth = Math.max(1, C * .025);
      for (i = 0; i < n * .35; i++) { var cx = rnd() * v.W, cy = rnd() * v.H; g.beginPath(); g.moveTo(cx, cy); for (var k = 0; k < 5; k++) { cx += (rnd() - .5) * C * .7; cy += (rnd() - .5) * C * .7; g.lineTo(cx, cy); } g.stroke(); }
      if (map.land === 'volcano') { g.globalCompositeOperation = 'lighter'; for (i = 0; i < n * .15; i++) blob(g, rnd() * v.W, rnd() * v.H, C * .25, '#ff5a10', .25); g.globalCompositeOperation = 'source-over'; }
    }
    var T = GDCore.T, cell = function (i, j) { return GDCore.inside(i, j) ? s.cells[GDCore.idx(i, j)] : -1; };
    var isRoad = function (i, j) { var t = cell(i, j); return t === T.ROAD || t === T.SPAWN || t === T.EXIT || t === T.BRIDGE; };
    // water: ponds and the river
    function waterCells(f) { for (var j = 0; j < 9; j++) for (var i = 0; i < 16; i++) if (cell(i, j) === T.WATER || cell(i, j) === T.BRIDGE) f(i, j); }
    // each pond is one organic shape round its block of water cells (a soft wobble on a rounded outline)
    var seen = {}, comps = [];
    waterCells(function (i, j) { if (seen[i + ',' + j]) return; var q = [[i, j]], c0 = { x0: i, y0: j, x1: i, y1: j }; seen[i + ',' + j] = 1;
      for (var h = 0; h < q.length; h++) { var a2 = q[h][0], b2 = q[h][1]; c0.x0 = Math.min(c0.x0, a2); c0.x1 = Math.max(c0.x1, a2); c0.y0 = Math.min(c0.y0, b2); c0.y1 = Math.max(c0.y1, b2);
        [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) { var x2 = a2 + d[0], y2 = b2 + d[1], t = cell(x2, y2); if ((t === T.WATER || t === T.BRIDGE) && !seen[x2 + ',' + y2]) { seen[x2 + ',' + y2] = 1; q.push([x2, y2]); } }); }
      comps.push(c0); });
    comps.forEach(function (c0) {
      var cx = X((c0.x0 + c0.x1 + 1) / 2), cy = Y((c0.y0 + c0.y1 + 1) / 2), hw = (c0.x1 - c0.x0 + 1) * C / 2, hh = (c0.y1 - c0.y0 + 1) * C / 2, ph = rnd() * 6;
      [[L.edge, .16, .9], [L.water[0], 0, 1], [L.water[1], -.22, .8]].forEach(function (pass) {
        var ex = hw + pass[1] * C, ey = hh + pass[1] * C, rr = Math.min(ex, ey) * .7;
        g.fillStyle = A.rgba(pass[0], pass[2]); g.beginPath();
        for (var k = 0; k <= 64; k++) {
          var t = k / 64 * Math.PI * 2, ct = Math.cos(t), st = Math.sin(t);
          // a superellipse: square-ish with round corners, and a gentle wobble
          var px = Math.sign(ct) * Math.pow(Math.abs(ct), .45) * ex, py = Math.sign(st) * Math.pow(Math.abs(st), .45) * ey, wob = 1 + Math.sin(t * 5 + ph) * .035 + Math.sin(t * 3 + ph * 2) * .03;
          if (k) g.lineTo(cx + px * wob, cy + py * wob); else g.moveTo(cx + px * wob, cy + py * wob);
        }
        g.fill();
      });
      if (map.land === 'volcano') {   // a lava pool: a dark crust floating on it and a glow round it
        g.save(); g.globalCompositeOperation = 'lighter'; var gl = g.createRadialGradient(cx, cy, Math.min(hw, hh) * .5, cx, cy, Math.max(hw, hh) * 1.6); gl.addColorStop(0, 'rgba(255,120,20,.35)'); gl.addColorStop(1, 'rgba(255,60,0,0)'); g.fillStyle = gl; g.fillRect(cx - hw * 2, cy - hh * 2, hw * 4, hh * 4); g.restore();
        for (var q2 = 0; q2 < 9; q2++) { g.fillStyle = 'rgba(40,20,14,' + (.55 + rnd() * .3) + ')'; g.beginPath(); g.ellipse(cx + (rnd() - .5) * hw * 1.4, cy + (rnd() - .5) * hh * 1.4, C * (.1 + rnd() * .16), C * (.06 + rnd() * .1), rnd() * 3, 0, 7); g.fill(); }
      }
    });
    // a river running the full height (River Run): a wiggling stream with light on the ripples
    if (map.river != null) {
      var rx = X(map.river + .5);
      [[L.edge, .55], [L.water[0], .42], [L.water[1], .2]].forEach(function (p) { g.strokeStyle = p[0]; g.lineWidth = C * p[1] * 2; g.beginPath(); for (var yy = -2; yy <= 11; yy += .25) { var xx = rx + Math.sin(yy * 1.3) * C * .12; if (yy === -2) g.moveTo(xx, Y(yy)); else g.lineTo(xx, Y(yy)); } g.stroke(); });
    }
    // sparkles on water
    waterCells(function (i, j) { for (var q = 0; q < 3; q++) { g.fillStyle = 'rgba(255,255,255,' + (.25 + rnd() * .35) + ')'; g.beginPath(); g.ellipse(X(i + .2 + rnd() * .6), Y(j + .2 + rnd() * .6), C * .08, C * .025, 0, 0, 7); g.fill(); } });
    // the road: a dark rim, the dirt, worn lighter in the middle, pebbles at the edges
    function roadPass(w, col, a) {
      g.fillStyle = a != null ? rgba(col, a) : col;
      for (var j = 0; j < 9; j++) for (var i = 0; i < 16; i++) {
        if (!isRoad(i, j)) continue;
        var cx = X(i + .5), cy = Y(j + .5), r = C * w;
        g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill();
        [[1, 0], [0, 1], [-1, 0], [0, -1]].forEach(function (d) {
          var a2 = i + d[0], b2 = j + d[1];
          var link = isRoad(a2, b2) || (cell(i, j) === T.SPAWN && !GDCore.inside(a2, b2));
          if (!link) return;
          var ext = GDCore.inside(a2, b2) ? 1 : 2.2;
          if (d[0]) g.fillRect(Math.min(cx, cx + d[0] * C * ext), cy - r, C * ext, r * 2); else g.fillRect(cx - r, Math.min(cy, cy + d[1] * C * ext), r * 2, C * ext);
        });
      }
    }
    if (!s.maze) {
      roadPass(.5, L.edge, .55); roadPass(.44, L.roadLo); roadPass(.38, L.road); roadPass(.22, L.roadHi, .55);
      // texture on the dirt
      for (var j2 = 0; j2 < 9; j2++) for (var i2 = 0; i2 < 16; i2++) {
        if (!isRoad(i2, j2)) continue;
        for (var q = 0; q < 10; q++) { var px = X(i2 + rnd()), py = Y(j2 + rnd()); g.fillStyle = rgba(rnd() < .5 ? L.roadLo : L.roadHi, .25 + rnd() * .3); g.beginPath(); g.ellipse(px, py, C * (.03 + rnd() * .06), C * (.02 + rnd() * .04), rnd() * 3, 0, 7); g.fill(); }
        for (q = 0; q < 3; q++) {   // pebbles near the edges
          var ang = rnd() * 6.28, rr = C * (.3 + rnd() * .12), sx = X(i2 + .5) + Math.cos(ang) * rr, sy = Y(j2 + .5) + Math.sin(ang) * rr;
          g.fillStyle = shade(L.roadLo, -10); g.beginPath(); g.ellipse(sx, sy + C * .015, C * .055, C * .04, 0, 0, 7); g.fill();
          g.fillStyle = shade(L.roadHi, 10); g.beginPath(); g.ellipse(sx, sy, C * .05, C * .035, 0, 0, 7); g.fill();
        }
      }
      // wooden bridges over the river
      for (j2 = 0; j2 < 9; j2++) for (i2 = 0; i2 < 16; i2++) if (cell(i2, j2) === T.BRIDGE) {
        var bx = X(i2), by = Y(j2 + .12);
        for (q = 0; q < 6; q++) { g.fillStyle = q % 2 ? '#9a6232' : '#b47440'; g.fillRect(bx + q * C / 6 + 1, by, C / 6 - 2, C * .76); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(bx + q * C / 6 + 1, by + C * .7, C / 6 - 2, C * .06); }
        g.fillStyle = '#5a3418'; g.fillRect(bx - 2, by - C * .04, C + 4, C * .07); g.fillRect(bx - 2, by + C * .74, C + 4, C * .07);
      }
    } else {
      // maze maps: a worn trail of trampled ground from each entrance toward the village, no road
      s.spawns.forEach(function (sp) { var p = GDCore.spawnPoint(sp); blob(g, X(p.x), Y(p.y), C * 1.4, L.roadLo, .35); });
    }
    // grass tufts, flowers and stones on the buildable ground
    for (j2 = -2; j2 < 11; j2++) for (i2 = -3; i2 < 19; i2++) {
      if (isRoad(i2, j2) || cell(i2, j2) === T.WATER) continue;
      for (q = 0; q < 3; q++) {
        var tx = X(i2 + rnd()), ty = Y(j2 + rnd());
        if (map.land === 'jungle' || map.land === 'canyon') { g.strokeStyle = rgba(L.tuft, .55); g.lineWidth = Math.max(1, C * .02); for (var b = 0; b < 4; b++) { g.beginPath(); g.moveTo(tx, ty); g.quadraticCurveTo(tx + (b - 1.5) * C * .03, ty - C * .06, tx + (b - 1.5) * C * .05, ty - C * .1); g.stroke(); } }
        if (rnd() < .12) { g.fillStyle = L.flower[Math.floor(rnd() * L.flower.length)]; g.beginPath(); g.arc(tx + C * .05, ty - C * .02, C * .025, 0, 7); g.fill(); }
        if (map.land === 'snow' && rnd() < .3) { g.fillStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.ellipse(tx, ty, C * .12, C * .04, 0, 0, 7); g.fill(); }
      }
    }
    // a soft dark edge where the road meets the grass on maze maps' village and entrances, then the props
    var props = [];
    (map.deco || []).forEach(function (d) { props.push({ k: d[0], x: d[1], y: d[2], s: d[3] || 1 }); });
    var cave = (GD.LANDS[map.land] || {}).cave || 'cave';
    s.spawns.forEach(function (sp) {
      var p = GDCore.spawnPoint(sp), k = cave, sc = .85;
      if (sp.j === 0) props.push({ k: map.land === 'snow' ? 'gate' : k, x: sp.i + .5, y: -.15, s: map.land === 'snow' ? .9 : sc, back: true });
      else if (sp.j === 8) props.push({ k: k, x: sp.i + .5, y: 9.9, s: sc });
      else props.push({ k: k, x: p.x < 0 ? -.2 : 16.2, y: sp.j + .95, s: sc });
    });
    var vp = map.village || (s.exit ? [s.exit.i + .7, s.exit.j + .95] : null);
    if (vp) props.push({ k: 'village', x: vp[0], y: vp[1], s: .78, village: true });
    props.sort(function (a, b) { return a.y - b.y; });
    props.forEach(function (p) {
      var f = A.F && A.F[p.k]; if (!f) return;
      var sx = X(p.x), sy = Y(p.y), w = C * 1.2 * p.s;
      if (p.k !== 'lilyPad') { g.fillStyle = 'rgba(20,10,0,.25)'; g.beginPath(); g.ellipse(sx, sy, w * .55, w * .2, 0, 0, 7); g.fill(); }
      A.spr(g, p.k, sx, sy, C * p.s);
    });
    // shade the edge of the world so the eye stays in the middle
    var vg = g.createRadialGradient(v.W / 2, v.H / 2, Math.min(v.W, v.H) * .45, v.W / 2, v.H / 2, Math.max(v.W, v.H) * .75);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, map.land === 'snow' ? 'rgba(30,50,90,.28)' : 'rgba(10,20,0,.35)'); g.fillStyle = vg; g.fillRect(0, 0, v.W, v.H);
    return c;
  };

  // ── The wooden frame round the screen, with iron corner plates and bolts ─
  A.paintFrame = function (W, H, T, dpr) {
    var c = document.createElement('canvas'); c.width = Math.ceil(W * dpr); c.height = Math.ceil(H * dpr); var g = c.getContext('2d'); g.scale(dpr, dpr);
    var rnd = R(77);
    g.save(); g.beginPath(); g.rect(0, 0, W, H); var r = T * 1.1; roundPath(g, T, T, W - 2 * T, H - 2 * T, r, true); g.clip('evenodd');
    // planks
    var gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#a3622c'); gr.addColorStop(.5, '#8a4e22'); gr.addColorStop(1, '#6e3a18'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    for (var i = 0; i < 260; i++) { var y = rnd() * H, x = rnd() * W; g.strokeStyle = 'rgba(' + (rnd() < .5 ? '60,25,5' : '200,140,80') + ',' + (.12 + rnd() * .2) + ')'; g.lineWidth = .6 + rnd(); g.beginPath(); var horiz = y < T * 1.2 || y > H - T * 1.2; if (horiz) { g.moveTo(x, y); g.lineTo(x + 30 + rnd() * 80, y + (rnd() - .5) * 2); } else { g.moveTo(x, y); g.lineTo(x + (rnd() - .5) * 2, y + 30 + rnd() * 80); } g.stroke(); }
    // plank seams
    g.strokeStyle = 'rgba(40,15,0,.55)'; g.lineWidth = 1.5;
    for (x = 120 + rnd() * 80; x < W; x += 140 + rnd() * 120) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, T); g.moveTo(x + 40, H - T); g.lineTo(x + 40, H); g.stroke(); }
    for (y = 90 + rnd() * 60; y < H; y += 120 + rnd() * 90) { g.beginPath(); g.moveTo(0, y); g.lineTo(T, y); g.moveTo(W - T, y + 30); g.lineTo(W, y + 30); g.stroke(); }
    g.restore();
    // the inner lip: a dark groove, a lit bevel and a thin iron band
    g.save(); roundPath(g, T, T, W - 2 * T, H - 2 * T, r);
    g.lineWidth = 3; g.strokeStyle = 'rgba(25,10,0,.85)'; g.stroke();
    g.lineWidth = 2; g.strokeStyle = '#7d8590'; roundPath(g, T - 2.5, T - 2.5, W - 2 * T + 5, H - 2 * T + 5, r + 2); g.stroke();
    g.lineWidth = 1; g.strokeStyle = 'rgba(255,255,255,.35)'; roundPath(g, T - 4, T - 4, W - 2 * T + 8, H - 2 * T + 8, r + 3); g.stroke();
    g.restore();
    // inner shadow cast onto the playfield
    g.save(); roundPath(g, T, T, W - 2 * T, H - 2 * T, r); g.clip();
    g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = T * .9; g.lineWidth = T; g.strokeStyle = 'rgba(0,0,0,.5)'; roundPath(g, T - T / 2, T - T / 2, W - T, H - T, r); g.stroke(); g.restore();
    // iron corner plates and bolts
    var P = T * 1.9;
    [[0, 0, 1, 1], [W, 0, -1, 1], [0, H, 1, -1], [W, H, -1, -1]].forEach(function (k) {
      g.save(); g.translate(k[0], k[1]); g.scale(k[2], k[3]);
      g.beginPath(); g.moveTo(0, 0); g.lineTo(P * 1.25, 0); g.lineTo(P * 1.25, T * .55); g.quadraticCurveTo(P * .7, T * .8, P * .55, P * .55); g.quadraticCurveTo(T * .8, P * .7, T * .55, P * 1.25); g.lineTo(0, P * 1.25); g.closePath();
      var mg = g.createLinearGradient(0, 0, P, P); mg.addColorStop(0, '#9aa3ad'); mg.addColorStop(1, '#4a5058'); g.fillStyle = mg; g.fill();
      g.lineWidth = 1.2; g.strokeStyle = 'rgba(0,0,0,.6)'; g.stroke();
      g.restore();
      bolt(g, k[0] + k[2] * T * .5, k[1] + k[3] * T * .5, T * .26);
    });
    for (x = W * .2; x < W * .85; x += W * .2) { bolt(g, x, T * .5, T * .2); bolt(g, x + W * .05, H - T * .5, T * .2); }
    for (y = H * .33; y < H * .8; y += H * .33) { bolt(g, T * .5, y, T * .2); bolt(g, W - T * .5, y, T * .2); }
    return c;
  };
  function bolt(g, x, y, r) {
    var gr = g.createRadialGradient(x - r * .3, y - r * .4, r * .1, x, y, r); gr.addColorStop(0, '#f2f4f6'); gr.addColorStop(.5, '#9aa2ab'); gr.addColorStop(1, '#3d424a');
    g.fillStyle = 'rgba(0,0,0,.45)'; g.beginPath(); g.arc(x + r * .15, y + r * .25, r * 1.05, 0, 7); g.fill();
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
    g.strokeStyle = 'rgba(40,40,40,.6)'; g.lineWidth = Math.max(1, r * .18); g.beginPath(); g.moveTo(x - r * .5, y - r * .1); g.lineTo(x + r * .5, y + r * .1); g.stroke();
  }
  A.bolt = bolt;
  function roundPath(g, x, y, w, h, r, keep) { if (!keep) g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  A.roundPath = roundPath;

  // ── Round wood-and-iron buttons, medallions, plaques, outlined numerals ──
  // a round button: an iron ring with rivets round a disc (fill: [inner, outer] colours), pressed pushes it in
  A.disc = function (g, x, y, r, fill, o) {
    o = o || {};
    g.save();
    g.fillStyle = 'rgba(0,0,0,.4)'; g.beginPath(); g.arc(x + r * .06, y + r * .12, r * 1.04, 0, 7); g.fill();
    var ring = g.createLinearGradient(x, y - r, x, y + r); ring.addColorStop(0, o.ring ? o.ring[0] : '#8a5a34'); ring.addColorStop(1, o.ring ? o.ring[1] : '#3a1e0c');
    g.fillStyle = ring; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
    g.lineWidth = Math.max(1, r * .05); g.strokeStyle = 'rgba(20,8,0,.8)'; g.stroke();
    var ir = r * (o.inner || .8), gr = g.createRadialGradient(x - ir * .3, y - ir * .45, ir * .1, x, y, ir);
    gr.addColorStop(0, fill[0]); gr.addColorStop(1, fill[1]); g.fillStyle = gr; g.beginPath(); g.arc(x, y + (o.down ? r * .04 : 0), ir, 0, 7); g.fill();
    g.lineWidth = Math.max(1, r * .06); g.strokeStyle = 'rgba(0,0,0,.45)'; g.stroke();
    // a gloss across the top
    var gl = g.createLinearGradient(x, y - ir, x, y); gl.addColorStop(0, 'rgba(255,255,255,.38)'); gl.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gl; g.beginPath(); g.ellipse(x, y - ir * .42, ir * .78, ir * .5, 0, 0, 7); g.fill();
    if (o.rivets !== false) for (var i = 0; i < 8; i++) { var a = i / 8 * Math.PI * 2 + .2; g.fillStyle = '#e8c27a'; g.beginPath(); g.arc(x + Math.cos(a) * r * .9, y + Math.sin(a) * r * .9, Math.max(1, r * .045), 0, 7); g.fill(); }
    g.restore();
  };
  // a parchment plaque under a medallion with a coin (or gem) and a price
  A.plaque = function (g, x, y, w, h, text, icon, o) {
    o = o || {};
    g.save();
    g.fillStyle = 'rgba(0,0,0,.35)'; roundPath(g, x - w / 2 + 1, y - h / 2 + 2, w, h, h * .32); g.fill();
    var gr = g.createLinearGradient(0, y - h / 2, 0, y + h / 2); gr.addColorStop(0, o.dim ? '#bdb3a2' : '#f3e2bc'); gr.addColorStop(1, o.dim ? '#8d8476' : '#cdb07a');
    g.fillStyle = gr; roundPath(g, x - w / 2, y - h / 2, w, h, h * .32); g.fill();
    g.lineWidth = Math.max(1, h * .07); g.strokeStyle = '#5a3a1a'; g.stroke();
    [-1, 1].forEach(function (k) { g.fillStyle = '#8a6a3a'; g.beginPath(); g.arc(x + k * (w / 2 - h * .2), y, h * .08, 0, 7); g.fill(); });
    var ix = x - w / 2 + h * .62;
    if (icon) A.icon(g, icon, ix, y, h * 1.05, null);
    A.text(g, text, icon ? x + h * .32 : x, y + h * .04, h * .62, { fill: o.dim ? '#4a4038' : '#3a2410', stroke: false, align: 'center' });
    g.restore();
  };
  // chunky outlined numerals (Lilita One), white with a dark outline like the original HUD
  A.text = function (g, t, x, y, px, o) {
    o = o || {};
    g.save(); g.font = (o.weight || '') + ' ' + Math.round(px) + 'px "Lilita One", "Arial Rounded MT Bold", system-ui, sans-serif';
    g.textAlign = o.align || 'left'; g.textBaseline = 'middle'; g.lineJoin = 'round';
    if (o.alpha != null) g.globalAlpha *= o.alpha;
    if (o.stroke !== false) { g.lineWidth = px * (o.sw || .2); g.strokeStyle = o.stroke || 'rgba(30,15,5,.9)'; g.strokeText(t, x, y + px * .04); }
    if (o.shadow) { g.fillStyle = 'rgba(0,0,0,.5)'; g.fillText(t, x + px * .04, y + px * .1); }
    g.fillStyle = o.fill || '#fff'; g.fillText(t, x, y);
    var w = g.measureText(t).width; g.restore(); return w;
  };
  A.measure = function (g, t, px) { g.save(); g.font = Math.round(px) + 'px "Lilita One", system-ui, sans-serif'; var w = g.measureText(t).width; g.restore(); return w; };

  root.GDArt = A;
})(this);
