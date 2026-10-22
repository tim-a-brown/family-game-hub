// The Oregon Trail: pixel art, drawn fresh in the style of the MECC game (EGA's sixteen colours and dithering).
// Everything is painted at low resolution onto canvases that the page scales up with crisp pixels.
//   OTArt.Travel(W, H)                    the travel strip: sky, parallax country, the wagon and oxen, weather
//   OTArt.scene(id, W, H, o)              a still picture (landmark, store, tombstone, river, title, arrival)
//                                         returns {img, anim(ctx, t)} - the painted picture and its moving parts
//   OTArt.map(W, H, o)                    the trail map
//   OTArt.animal(ctx, kind, x, y, f, dir, dead) / OTArt.hunter / OTArt.raft   hunting and rafting sprites
var OTArt = window.OTArt = (function () {
  'use strict';
  var PAL = { k: '#000000', b: '#0000aa', g: '#00aa00', c: '#00aaaa', r: '#aa0000', m: '#aa00aa', n: '#aa5500', l: '#aaaaaa',
    d: '#555555', B: '#5555ff', G: '#55ff55', C: '#55ffff', R: '#ff5555', M: '#ff55ff', y: '#ffff55', w: '#ffffff', S: '#e8a070' };

  // ── Seeded randomness so a scene looks the same every time it is drawn ──
  function rng(seed) { var a = seed >>> 0; return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function hash(s) { var h = 2166136261; s = String(s); for (var i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; }

  function mk(w, h) { var c = document.createElement('canvas'); c.width = Math.max(1, w | 0); c.height = Math.max(1, h | 0); return c; }

  // ── The painter: rectangles, dithers, spans, polygons, ellipses, lines and sprites, all on whole pixels ──
  var patCache = {};
  function Painter(ctx) { this.x = ctx; }
  Painter.prototype.paint = function (p) {
    if (typeof p === 'string') return PAL[p] || p;
    // dither {a, b, l}: l = 1 (a quarter b), 2 (half), 3 (three quarters), 4 (b in an eighth: sparse)
    var key = p.a + p.b + p.l;
    if (!patCache[key]) {
      var t = mk(4, 4), c = t.getContext('2d'); c.fillStyle = PAL[p.a]; c.fillRect(0, 0, 4, 4); c.fillStyle = PAL[p.b];
      for (var y = 0; y < 4; y++) for (var x = 0; x < 4; x++) {
        var on = p.l === 2 ? (x + y) % 2 === 0 : p.l === 1 ? (x % 2 === 0 && y % 2 === 0) : p.l === 3 ? !(x % 2 === 1 && y % 2 === 1) : (x === 0 && y === 0) || (x === 2 && y === 2);
        if (on) c.fillRect(x, y, 1, 1);
      }
      patCache[key] = t;
    }
    return this.x.createPattern(patCache[key], 'repeat');
  };
  Painter.prototype.r = function (x, y, w, h, p) { if (w <= 0 || h <= 0) return; this.x.fillStyle = this.paint(p); this.x.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  Painter.prototype.px = function (x, y, p) { this.x.fillStyle = this.paint(p); this.x.fillRect(Math.round(x), Math.round(y), 1, 1); };
  Painter.prototype.span = function (y, x0, x1, p) { x0 = Math.round(x0); x1 = Math.round(x1); if (x1 < x0) return; this.x.fillStyle = this.paint(p); this.x.fillRect(x0, Math.round(y), x1 - x0 + 1, 1); };
  // scanline polygon fill: pts [[x,y],...]
  Painter.prototype.poly = function (pts, p) {
    var minY = Infinity, maxY = -Infinity, i;
    for (i = 0; i < pts.length; i++) { minY = Math.min(minY, pts[i][1]); maxY = Math.max(maxY, pts[i][1]); }
    this.x.fillStyle = this.paint(p);
    for (var y = Math.ceil(minY); y <= Math.floor(maxY); y++) {
      var xs = [], yy = y + 0.01;
      for (i = 0; i < pts.length; i++) {
        var a = pts[i], b = pts[(i + 1) % pts.length];
        if ((a[1] <= yy && b[1] > yy) || (b[1] <= yy && a[1] > yy)) xs.push(a[0] + (yy - a[1]) / (b[1] - a[1]) * (b[0] - a[0]));
      }
      xs.sort(function (m, n) { return m - n; });
      for (i = 0; i + 1 < xs.length; i += 2) { var x0 = Math.round(xs[i]), x1 = Math.round(xs[i + 1]); if (x1 >= x0) this.x.fillRect(x0, y, x1 - x0 + 1, 1); }
    }
  };
  Painter.prototype.ell = function (cx, cy, rx, ry, p, half) {
    this.x.fillStyle = this.paint(p);
    for (var y = -ry; y <= (half ? 0 : ry); y++) {
      var w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / ((ry + 0.4) * (ry + 0.4)))));
      this.x.fillRect(Math.round(cx - w), Math.round(cy + y), w * 2 + 1, 1);
    }
  };
  Painter.prototype.line = function (x0, y0, x1, y1, p) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    this.x.fillStyle = this.paint(p);
    var dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, e = dx + dy;
    for (var n = 0; n < 2000; n++) {
      this.x.fillRect(x0, y0, 1, 1);
      if (x0 === x1 && y0 === y1) break;
      var e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; }
    }
  };
  // a sprite from rows of letters ('.' is clear); flip mirrors it; map recolours letters
  Painter.prototype.spr = function (rows, x, y, flip, map) {
    var w = 0, i, j; for (i = 0; i < rows.length; i++) w = Math.max(w, rows[i].length);
    x = Math.round(x); y = Math.round(y);
    for (j = 0; j < rows.length; j++) {
      var row = rows[j];
      for (i = 0; i < row.length; i++) {
        var ch = row.charAt(i); if (ch === '.' || ch === ' ') continue;
        if (map && map[ch]) ch = map[ch];
        this.x.fillStyle = PAL[ch] || ch;
        this.x.fillRect(flip ? x + w - 1 - i : x + i, y + j, 1, 1);
      }
    }
  };
  function P(ctx) { return new Painter(ctx); }

  // ── Shapes shared by many pictures ───────────────────────────────────────
  // a sky with dithered bands; mood: 'day' | 'gray' | 'snow' | 'dusk'
  function sky(p, W, h, mood) {
    var bands = mood === 'gray' || mood === 'snow' ? [['d', 'l', 1], ['l', 'd', 1], ['l', null], ['l', 'w', 1], [mood === 'snow' ? 'w' : 'l', 'l', 1]]
      : mood === 'dusk' ? [['b', 'm', 1], ['m', 'b', 1], ['m', 'R', 1], ['R', 'y', 1], ['y', 'R', 1]]
      : [['B', 'b', 1], ['B', null], ['B', null], ['B', 'C', 1], ['C', 'B', 2]];
    var n = bands.length;
    for (var i = 0; i < n; i++) {
      var y0 = Math.round(h * i / n), y1 = Math.round(h * (i + 1) / n), b = bands[i];
      p.r(0, y0, W, y1 - y0, b[1] ? { a: b[0], b: b[1], l: b[2] } : b[0]);
    }
  }
  function cloud(p, x, y, s, mood) {
    var hi = mood === 'gray' || mood === 'snow' ? 'l' : 'w', lo = mood === 'gray' || mood === 'snow' ? 'd' : 'l';
    p.ell(x, y, 7 * s, 3 * s, hi); p.ell(x - 6 * s, y + 1, 5 * s, 2 * s, hi); p.ell(x + 7 * s, y + 1, 6 * s, 2 * s, hi); p.ell(x + 2, y - 2 * s, 5 * s, 3 * s, hi);
    p.r(x - 10 * s, y + 2 * s, 22 * s, 1, lo);
  }
  // a ridge line across [x0, x0+w): heights from a few waves that wrap around (tiles join up)
  function ridgeH(w, base, amp, seed, sharp, period) {
    var r = rng(seed), waves = [], hs = new Array(w), per = period || w;
    for (var k = 0; k < 5; k++) waves.push({ f: (k + 1) * (1 + Math.floor(r() * 2)), a: amp / (k + 1.2), ph: r() * Math.PI * 2 });
    for (var x = 0; x < w; x++) {
      var v = 0;
      waves.forEach(function (q) { var s = Math.sin(q.ph + x / per * Math.PI * 2 * q.f); v += q.a * (sharp ? 1 - Math.abs(s) * 2 : s); });
      hs[x] = Math.round(base - v);
    }
    return hs;
  }
  function fillRidge(p, hs, bottom, paint, x0) { for (var x = 0; x < hs.length; x++) p.r((x0 || 0) + x, hs[x], 1, bottom - hs[x], paint); }
  // snow on the peaks: anything above the line
  function snowCaps(p, hs, line, x0) {
    for (var x = 0; x < hs.length; x++) if (hs[x] < line) { var d = line - hs[x]; p.r((x0 || 0) + x, hs[x], 1, Math.min(d, 2 + d * 0.6), x % 3 === 0 ? 'l' : 'w'); }
  }
  // trees: 'pine' (dark spire) | 'oak' (round) | 'sage' (low gray bush) | 'cotton' (cottonwood by the river)
  function tree(p, kind, x, y, s, snow) {
    s = s || 1;
    if (kind === 'pine') {
      var h = Math.round(14 * s), w = Math.round(5 * s);
      p.r(x, y - 2, 1, 3, 'n');
      for (var i = 0; i < h; i++) { var ww = Math.round(w * (i / h)); p.span(y - h - 1 + i, x - ww, x + ww, i % 4 === 3 ? 'k' : 'g'); }
      if (snow) for (var j = 2; j < h; j += 4) { var sw = Math.round(w * (j / h)); p.span(y - h - 1 + j, x - sw, x - sw + Math.max(1, sw >> 1), 'w'); }
    } else if (kind === 'oak' || kind === 'cotton') {
      var r = Math.round((kind === 'cotton' ? 6 : 5) * s);
      p.r(x, y - r, 2, r + 1, 'n'); p.px(x - 1, y - Math.round(r * 0.6), 'n');
      p.ell(x + 1, y - r - Math.round(r * 0.8), r, Math.round(r * 0.8), snow ? { a: 'l', b: 'w', l: 2 } : 'g');
      p.ell(x - 1, y - r - Math.round(r * 1.1), Math.round(r * 0.6), Math.round(r * 0.45), snow ? 'w' : { a: 'g', b: 'G', l: 2 });
      p.span(y - r - 1, x - r + 2, x + r, snow ? 'l' : { a: 'g', b: 'k', l: 2 });
    } else if (kind === 'sage') {
      p.ell(x, y - 1, Math.round(3 * s), Math.round(1.5 * s), snow ? 'w' : { a: 'l', b: 'g', l: 2 }); p.px(x - 1, y - 2, 'G');
    }
  }
  function rock(p, x, y, w, h, snow) {
    p.poly([[x, y], [x + w * 0.15, y - h * 0.7], [x + w * 0.5, y - h], [x + w * 0.85, y - h * 0.6], [x + w, y]], 'l');
    p.poly([[x + w * 0.5, y - h], [x + w * 0.85, y - h * 0.6], [x + w, y], [x + w * 0.55, y]], 'd');
    if (snow) p.span(y - h, x + w * 0.35, x + w * 0.6, 'w');
  }
  function grass(p, x0, y0, w, h, season) {
    p.r(x0, y0, w, h, season === 'winter' ? { a: 'w', b: 'l', l: 1 } : season === 'fall' ? { a: 'n', b: 'g', l: 2 } : season === 'dry' ? { a: 'y', b: 'n', l: 2 } : { a: 'g', b: 'G', l: 1 });
  }
  function flag(p, x, y, f) {   // the stars and stripes on a pole, f = 0|1 waving
    p.r(x, y, 1, 22, 'l'); p.px(x, y - 1, 'y');
    for (var i = 0; i < 6; i++) { var off = f ? (i % 2) : ((i + 1) % 2); p.span(y + 1 + i, x + 1, x + 9 + (i > 2 ? off : 0), i % 2 ? 'w' : 'r'); }
    p.r(x + 1, y + 1, 4, 3, 'b'); p.px(x + 2, y + 2, 'w'); p.px(x + 4, y + 2, 'w');
  }

  // ── The wagon and oxen (facing west, which is left) ──────────────────────
  var OX = [
    '..w..w..............',
    '..wkkw..............',
    '..knnk.kkkkkkkkkkk..',
    '.knnnnknnnnnnnnnnnk.',
    'knknnnnnnnnnnnnnnnnk',
    'knnnnnnnnnnnnnnnnnnk',
    '.kknnnnnnnnnnnnnnnnk',
    '...knnnnnnnnnnnnnnnkk',
    '...knnnnnnnnnnnnnnk.k',
    '....kkkkkkkkkkkkkk..k'
  ];
  function ox(p, x, y, f, map) {
    // legs: front pair and back pair swing opposite ways
    var a = f % 2 ? 1 : -1;
    [[5, a], [7, -a], [14, -a], [16, a]].forEach(function (l, i) {
      var lx = x + l[0] + (l[1] > 0 ? 1 : 0);
      p.r(lx, y + 9, 1, 3, map && map.n === 'l' ? 'd' : 'n'); p.px(lx, y + 12, 'k');
      if (i % 2) p.px(lx - l[1], y + 10, map && map.n === 'l' ? 'd' : 'n');
    });
    p.spr(OX, x, y + (f % 2), false, map);
  }
  // the covered wagon: w wide 34, h 24, (x, y) its top left; spin turns the wheel spokes; broken: a wheel off
  function wagon(p, x, y, spin, broken) {
    // the bonnet: canvas over hoops, puckered closed at the front
    var top = [[6, 25], [4, 27], [3, 28], [2, 29], [2, 29], [2, 29], [2, 29], [2, 29], [2, 30], [2, 30], [3, 30]];
    top.forEach(function (s, i) { p.span(y + i, x + s[0] - 1, x + s[1] + 1, 'k'); });
    top.forEach(function (s, i) { if (i > 0) p.span(y + i, x + s[0], x + s[1], i > 8 ? 'l' : 'w'); });
    p.span(y + 1, x + 7, x + 24, 'w');
    [9, 16, 23].forEach(function (hx) { p.r(x + hx, y + 2, 1, 8, 'l'); });
    p.r(x + 3, y + 3, 2, 6, 'd'); p.px(x + 3, y + 4, 'k'); p.px(x + 3, y + 7, 'k');   // the puckered front
    // the bed: a box of planks
    p.r(x + 1, y + 11, 31, 7, 'k'); p.r(x + 2, y + 12, 29, 5, 'n'); p.span(y + 14, x + 2, x + 30, 'k'); p.span(y + 16, x + 2, x + 30, 'r');
    for (var pk = 8; pk < 30; pk += 7) p.r(x + pk, y + 12, 1, 5, 'r');
    p.r(x + 0, y + 13, 1, 2, 'k');   // the tongue's root at the front
    // wheels: front small (left), back big (right)
    wheel(p, x + 8, y + 19, 4, spin);
    if (broken !== 'wheel') wheel(p, x + 24, y + 17, 6, spin * 0.67);
    else { p.ell(x + 25, y + 25, 6, 1, 'n'); p.line(x + 19, y + 25, x + 31, y + 24, 'k'); }
  }
  function wheel(p, cx, cy, r, spin) {
    for (var a = 0; a < 32; a++) { var t = a / 32 * Math.PI * 2; p.px(cx + Math.round(Math.cos(t) * r), cy + Math.round(Math.sin(t) * r), 'k'); }
    for (var b = 0; b < 32; b++) { var u = b / 32 * Math.PI * 2; p.px(cx + Math.round(Math.cos(u) * (r - 1)), cy + Math.round(Math.sin(u) * (r - 1)), 'n'); }
    for (var s = 0; s < 4; s++) { var v = spin + s * Math.PI / 4; p.line(cx - Math.round(Math.cos(v) * (r - 1)), cy - Math.round(Math.sin(v) * (r - 1)), cx + Math.round(Math.cos(v) * (r - 1)), cy + Math.round(Math.sin(v) * (r - 1)), 'n'); }
    p.r(cx - 1, cy - 1, 2, 2, 'k');
  }
  // the whole team: two oxen yoked ahead of the wagon. (x, y) is the wagon's top left
  function team(p, x, y, f, spin, opt) {
    opt = opt || {};
    // two yoke in tandem along the tongue and chain: the wheel yoke next to the wagon, the lead yoke ahead
    var n = opt.oxen == null ? 4 : opt.oxen;
    p.line(x - 1, y + 14, x - 8, y + 15, 'n');
    if (n >= 3) { p.line(x - 26, y + 15, x - 31, y + 15, 'd'); ox(p, x - 50, y + 10, f + 1, { n: 'r' }); p.r(x - 48, y + 13, 3, 1, 'y'); }
    wagon(p, x, y, spin, opt.broken);
    if (n >= 1) { ox(p, x - 27, y + 10, f); p.r(x - 25, y + 13, 3, 1, 'y'); }
  }

  // ── The travel strip ─────────────────────────────────────────────────────
  // land kinds look like this from the trail
  var LOOK = {
    prairie:  { far: ['c', 'B'], farAmp: 3, mid: ['g', 'G'], midAmp: 5, trees: 'oak', props: 'grass', ground: 'green' },
    platte:   { far: ['c', 'l'], farAmp: 2, mid: ['g', 'y'], midAmp: 3, trees: 'cotton', props: 'grass', ground: 'green', river: true },
    bluffs:   { far: ['n', 'y'], farAmp: 9, mid: ['n', 'y'], midAmp: 5, trees: 'sage', props: 'sage', ground: 'dry', bluffs: true },
    sage:     { far: ['l', 'n'], farAmp: 7, mid: ['n', 'g'], midAmp: 4, trees: 'sage', props: 'sage', ground: 'dry' },
    rockies:  { far: ['d', 'l'], farAmp: 22, sharp: true, snow: true, mid: ['g', 'k'], midAmp: 8, trees: 'pine', props: 'rock', ground: 'green' },
    snake:    { far: ['d', 'n'], farAmp: 5, mid: ['k', 'd'], midAmp: 3, trees: 'sage', props: 'lava', ground: 'dry', canyon: true },
    forest:   { far: ['b', 'g'], farAmp: 14, mid: ['g', 'k'], midAmp: 9, trees: 'pine', dense: true, props: 'rock', ground: 'green' },
    columbia: { far: ['d', 'l'], farAmp: 8, mid: ['n', 'd'], midAmp: 5, trees: 'sage', props: 'sage', ground: 'dry', hood: true },
    valley:   { far: ['B', 'c'], farAmp: 6, mid: ['g', 'G'], midAmp: 4, trees: 'oak', props: 'grass', ground: 'green', hood: true }
  };
  function seasonOf(month, high) { var m = month; if (m >= 10 || m <= 1 || (high && (m >= 9 || m <= 3))) return 'winter'; if (m >= 8) return 'fall'; return null; }

  function Travel(W, H) {
    this.W = W; this.H = H; this.hz = Math.round(H * 0.46); this.TW = 512; this.key = '';
  }
  Travel.prototype.set = function (land, month, mood, high, snow) {
    var key = [land, month, mood, high, snow].join('|'); if (key === this.key) return; this.key = key;
    var L = LOOK[land] || LOOK.prairie, W = this.W, H = this.H, hz = this.hz, TW = this.TW, seas = snow ? 'winter' : seasonOf(month, high), seed = hash(land);
    this.look = L; this.season = seas; this.mood = mood;
    var groundP = seas === 'winter' ? { a: 'w', b: 'l', l: 1 } : seas === 'fall' ? { a: 'n', b: 'y', l: 1 } : L.ground === 'dry' ? { a: 'n', b: 'y', l: 2 } : { a: 'g', b: 'G', l: 1 };
    this.groundP = groundP;
    // sky (with a few clouds baked in) and the far country
    var sk = mk(W, hz + 30), p = P(sk.getContext('2d'));
    sky(p, W, hz + 30, mood);
    var r = rng(seed + 7);
    this.clouds = []; for (var i = 0; i < 4; i++) this.clouds.push({ x: r() * W, y: 6 + r() * (hz * 0.4), s: r() < 0.5 ? 1 : 2, v: 0.6 + r() * 0.8 });
    this.sky = sk;
    // far: a tile that wraps
    var far = mk(TW, H), fp = P(far.getContext('2d'));
    var fh = ridgeH(TW, hz - 2, L.farAmp, seed + 1, L.sharp);
    fillRidge(fp, fh, hz + 20, { a: L.far[0], b: L.far[1], l: 2 });
    if (L.snow || seas === 'winter') snowCaps(fp, fh, hz - L.farAmp * 0.55 - (seas === 'winter' ? -6 : 0));
    if (L.hood) { var hx = Math.round(TW * 0.3); fp.poly([[hx - 30, hz + 2], [hx, hz - 34], [hx + 32, hz + 2]], 'l'); fp.poly([[hx - 9, hz - 23], [hx, hz - 34], [hx + 10, hz - 22], [hx + 4, hz - 19], [hx - 2, hz - 21]], 'w'); fp.poly([[hx, hz - 34], [hx + 32, hz + 2], [hx + 12, hz + 2]], { a: 'l', b: 'd', l: 1 }); }
    this.far = far;
    // mid: rolling hills with trees, at a third of the near speed
    var mid = mk(TW, H), mp = P(mid.getContext('2d')), mh = ridgeH(TW, hz + 9, L.midAmp, seed + 2, false);
    var midP = seas === 'winter' ? { a: 'w', b: 'l', l: 2 } : { a: L.mid[0], b: L.mid[1], l: L.ground === 'dry' ? 2 : 1 };
    fillRidge(mp, mh, H, midP);
    if (L.bluffs) { for (var bx = 20; bx < TW; bx += 110 + Math.round(r() * 60)) { var bw = 40 + r() * 40; mp.poly([[bx, hz + 16], [bx + 6, hz - 6], [bx + bw - 8, hz - 8], [bx + bw, hz + 16]], { a: 'y', b: 'n', l: 2 }); mp.r(bx + 6, hz - 6, bw - 14, 2, 'y'); mp.poly([[bx + bw * 0.6, hz - 8], [bx + bw - 8, hz - 8], [bx + bw, hz + 16], [bx + bw * 0.7, hz + 16]], { a: 'n', b: 'r', l: 1 }); } }
    if (L.canyon) { mp.r(0, hz + 12, TW, 3, 'k'); mp.r(0, hz + 15, TW, 2, { a: 'b', b: 'B', l: 2 }); }
    if (L.river) { mp.r(0, hz + 13, TW, 2, { a: 'B', b: 'C', l: 1 }); mp.r(0, hz + 15, TW, 1, 'y'); }
    var tn = L.dense ? 40 : L.trees === 'sage' ? 30 : 14;
    for (var t = 0; t < tn; t++) { var tx = Math.round(r() * TW), ty = mh[tx] + 3 + Math.round(r() * 6); tree(mp, L.trees, tx, ty, L.trees === 'sage' ? 0.8 : 0.7 + r() * 0.3, seas === 'winter'); }
    this.mid = mid; this.midH = mh;
    // near: things beside the trail that rush past
    var near = mk(TW, H), np = P(near.getContext('2d')), gy = Math.round(H * 0.66);
    for (var k = 0; k < 26; k++) {
      var kx = Math.round(r() * TW), ky = gy + Math.round(r() * (H - gy - 4)) + 3, kind = L.props;
      if (ky > H * 0.8 && ky < H * 0.9) ky += 12;   // keep the ruts clear
      if (kind === 'grass') { var gc = seas === 'winter' ? 'l' : seas === 'fall' ? 'n' : 'g'; np.line(kx, ky, kx - 1, ky - 3, gc); np.line(kx + 1, ky, kx + 2, ky - 3, gc); np.px(kx, ky - 4, seas ? gc : 'G'); if (r() < 0.25 && !seas) np.px(kx + 3, ky - 2, r() < 0.5 ? 'y' : 'M'); }
      else if (kind === 'sage') tree(np, 'sage', kx, ky, 1.2, seas === 'winter');
      else if (kind === 'lava') { np.r(kx, ky - 2, 5, 2, 'k'); np.r(kx + 1, ky - 3, 3, 1, 'd'); }
      else rock(np, kx, ky, 6 + r() * 6, 3 + r() * 3, seas === 'winter');
    }
    this.near = near;
  };
  // o: {scroll, t, moving, step, oxen, broken, ahead:{id, kind, mi}, graves:[{dmi}], weather:'rain'|'snow'|null}
  Travel.prototype.draw = function (ctx, o) {
    var W = this.W, H = this.H, hz = this.hz, TW = this.TW, p = P(ctx), sc = o.scroll || 0;
    ctx.drawImage(this.sky, 0, 0);
    var self = this;
    this.clouds.forEach(function (c) { cloud(p, ((c.x + o.t * 0.002 * c.v + sc * 0.01) % (W + 60)) - 30, c.y, c.s, self.mood); });
    function tile(img, k, dy) { var off = Math.round((sc * k) % TW); if (off < 0) off += TW; for (var x = off - TW; x < W; x += TW) ctx.drawImage(img, x, dy || 0); }
    tile(this.far, 0.06);
    tile(this.mid, 0.3);
    // the ground and the trail's ruts
    var gy = Math.round(H * 0.64);
    p.r(0, gy, W, H - gy, this.groundP);
    var ry = Math.round(H * 0.84), dash = Math.round(sc) % 10;
    p.r(0, ry, W, 2, this.season === 'winter' ? 'l' : 'n'); p.r(0, ry + 6, W, 2, this.season === 'winter' ? 'l' : 'n');
    for (var x = -10 + dash; x < W; x += 10) { p.r(x, ry, 3, 1, this.season === 'winter' ? 'd' : 'r'); p.r(x + 4, ry + 7, 3, 1, this.season === 'winter' ? 'd' : 'r'); }
    tile(this.near, 1);
    // what's coming up ahead (to the left): a river across the trail, a fort, a rock
    var wx = Math.round(W * 0.56), wy = Math.round(H * 0.84) - 21, ppm = 6;
    if (o.ahead && o.ahead.mi != null && o.ahead.mi < 60) drawAhead(p, o.ahead, wx - 34 - o.ahead.mi * ppm, H, hz, this.season);
    (o.graves || []).forEach(function (g) { var gx = wx + 12 - g.dmi * ppm; if (gx > -10 && gx < W + 10) smallStone(p, gx, Math.round(H * 0.8)); });
    // dust behind the wheels while moving
    if (o.moving) for (var d = 0; d < 4; d++) { var ph = (o.t / 90 + d * 7) % 12; p.px(wx + 34 + ph * 1.5, wy + 23 - ph * 0.4 - (d % 2), this.season === 'winter' ? 'w' : 'y'); }
    team(p, wx, wy + (o.moving && o.step % 2 ? -1 : 0), o.moving ? o.step : 0, o.moving ? -sc * 0.35 : 0, { oxen: o.oxen, broken: o.broken });
    // weather on top
    if (o.weather === 'rain' || o.weather === 'storm') { var rr = rng(Math.floor(o.t / 60)); for (var i = 0; i < (o.weather === 'storm' ? 120 : 60); i++) { var x0 = Math.round(rr() * W), y0 = Math.round(rr() * H); p.line(x0, y0, x0 - 2, y0 + 4, 'B'); } if (o.weather === 'storm' && Math.floor(o.t / 150) % 23 === 0) { ctx.globalAlpha = 0.5; p.r(0, 0, W, H, 'w'); ctx.globalAlpha = 1; } }
    if (o.weather === 'snow' || o.weather === 'blizzard') { var sr = rng(7); for (var j = 0; j < (o.weather === 'blizzard' ? 160 : 70); j++) { var sx0 = sr() * W, sy0 = sr() * H, sp = 0.6 + sr(); p.px(((sx0 + o.t * 0.02 * sp - (o.weather === 'blizzard' ? o.t * 0.08 : 0)) % W + W) % W, (sy0 + o.t * 0.03 * sp) % H, 'w'); } }
    if (o.weather === 'fog') { ctx.globalAlpha = 0.55; p.r(0, 0, W, H, { a: 'l', b: 'w', l: 2 }); ctx.globalAlpha = 1; }
  };
  function smallStone(p, x, y) { p.r(x - 3, y - 7, 7, 8, 'd'); p.r(x - 2, y - 8, 5, 1, 'd'); p.r(x - 2, y - 7, 5, 7, 'l'); p.r(x - 1, y - 8, 3, 1, 'l'); p.span(y - 5, x - 1, x + 1, 'd'); p.span(y + 1, x - 4, x + 4, 'n'); }
  function drawAhead(p, a, x, H, hz, seas) {
    var gy = Math.round(H * 0.64), x0 = Math.round(x);
    if (a.kind === 'river' || a.id === 'dalles') {   // water across the trail, from the hills down past the bottom
      p.poly([[x0 - 26, gy - 2], [x0 + 2, gy - 2], [x0 - 4, H], [x0 - 52, H]], { a: 'b', b: 'B', l: 2 });
      p.line(x0 + 2, gy - 2, x0 - 4, H, 'y'); p.line(x0 + 3, gy - 2, x0 - 3, H, 'n');
      p.line(x0 - 27, gy - 2, x0 - 53, H, 'n');
      return;
    }
    if (a.kind === 'fort') { var fx = x0 - 50, fy = gy + 2; p.r(fx, fy - 12, 44, 12, a.id === 'laramie' || a.id === 'hall' || a.id === 'boise' ? { a: 'y', b: 'n', l: 1 } : { a: 'n', b: 'r', l: 1 }); for (var i = 0; i < 44; i += 3) p.px(fx + i, fy - 13, 'n'); p.r(fx + 18, fy - 7, 7, 7, 'k'); flag(p, fx + 4, fy - 34, 0); return; }
    if (a.id === 'chimney') { var cx = x0 - 40; p.poly([[cx - 22, gy + 2], [cx - 4, gy - 16], [cx + 4, gy - 16], [cx + 24, gy + 2]], { a: 'n', b: 'y', l: 2 }); p.r(cx - 2, gy - 44, 5, 30, { a: 'y', b: 'n', l: 1 }); p.r(cx - 1, gy - 46, 3, 2, 'y'); return; }
    if (a.id === 'indrock') { p.ell(x0 - 46, gy + 2, 34, 12, 'l', true); p.ell(x0 - 40, gy, 22, 7, 'w', true); p.span(gy + 2, x0 - 80, x0 - 12, 'd'); return; }
    if (a.id === 'soda') { p.ell(x0 - 30, gy + 4, 16, 4, 'C'); p.ell(x0 - 30, gy + 4, 10, 2, 'w'); return; }
    if (a.id === 'southpass' || a.id === 'bluemtns') { for (var k = 0; k < 4; k++) tree(p, 'pine', x0 - 20 - k * 12, gy + 6 + (k % 2) * 3, 1, seas === 'winter'); return; }
  }

  // ── Still pictures ───────────────────────────────────────────────────────
  // Each returns {img, anim}: anim(ctx, t) draws the parts that move over the painted picture.
  var SCENES = {};
  function base(W, H, mood) { var c = mk(W, H), p = P(c.getContext('2d')); sky(p, W, Math.round(H * 0.62), mood || 'day'); return { c: c, p: p }; }
  function hills(p, W, H, y, amp, seed, paint, sharp) { var hs = ridgeH(W, y, amp, seed, sharp, W); fillRidge(p, hs, H, paint); return hs; }
  function animClouds(W, H, seed, mood) {
    var r = rng(seed), cs = []; for (var i = 0; i < 3; i++) cs.push({ x: r() * W, y: 6 + r() * H * 0.22, s: r() < 0.6 ? 1 : 2, v: 0.4 + r() * 0.6 });
    return function (p, t) { cs.forEach(function (c) { cloud(p, ((c.x + t * 0.004 * c.v) % (W + 70)) - 35, c.y, c.s, mood); }); };
  }
  function water(p, x, y, w, h, t, shore) {
    p.r(x, y, w, h, { a: 'b', b: 'B', l: 2 });
    var r = rng(5);
    for (var i = 0; i < w * h / 90; i++) { var wx = x + Math.round((r() * w + t * 0.01 * (0.5 + r())) % w), wy = y + 1 + Math.round(r() * (h - 2)); p.span(wy, wx, Math.min(x + w - 1, wx + 2 + Math.round(r() * 3)), Math.floor(t / 400 + i) % 3 ? 'B' : 'C'); }
    if (shore) p.r(x, y, w, 1, 'C');
  }

  // the town of Independence: false-front stores along a muddy street, wagons gathering
  SCENES.independence = function (W, H) {
    var b = base(W, H), p = b.p, gy = Math.round(H * 0.62), r = rng(11);
    hills(p, W, H, gy - 4, 3, 3, { a: 'g', b: 'c', l: 2 });
    p.r(0, gy, W, H - gy, { a: 'g', b: 'G', l: 1 });
    p.poly([[0, H], [W * 0.35, gy + 6], [W * 0.65, gy + 6], [W, H]], { a: 'n', b: 'y', l: 1 });
    var smokes = [];
    for (var x = 4; x < W * 0.34; x += 30) building(p, x, gy + 6, 26, 20 + Math.round(r() * 14), r, smokes);
    for (var x2 = Math.round(W * 0.67); x2 < W - 4; x2 += 30) building(p, x2, gy + 6, 26, 20 + Math.round(r() * 14), r, smokes);
    team(p, Math.round(W * 0.45), gy + 4, 0, 0.3);
    var cl = animClouds(W, H, 4);
    return { img: b.c, anim: function (ctx, t) { var q = P(ctx); cl(q, t); smokes.forEach(function (s) { smoke(q, s[0], s[1], t); }); } };
  };
  function building(p, x, y, w, h, r, smokes) {
    var col = ['n', 'r', 'l', 'y'][Math.floor(r() * 4)], dark = col === 'y' || col === 'l' ? 'd' : 'k';
    p.r(x, y - h, w, h, col); p.r(x - 1, y - h - 4, w + 2, 4, col); p.span(y - h - 4, x - 1, x + w, dark);
    for (var i = 0; i < w; i += 3) p.r(x + i, y - h, 1, h, dark === 'k' ? { a: col, b: 'k', l: 1 } : { a: col, b: 'd', l: 1 });
    p.r(x + 3, y - h + 3, w - 6, 3, 'w'); p.r(x + 4, y - h + 4, w - 8, 1, 'k');   // the sign board
    p.r(x + Math.round(w / 2) - 3, y - 9, 6, 9, 'k'); p.r(x + 3, y - 12, 5, 5, 'C'); p.r(x + w - 8, y - 12, 5, 5, 'C');
    p.r(x - 1, y - 14, w + 2, 1, 'n');   // porch roof
    if (r() < 0.5) { p.r(x + w - 6, y - h - 9, 3, 5, 'r'); smokes.push([x + w - 5, y - h - 10]); }
  }
  function smoke(p, x, y, t) { for (var i = 0; i < 6; i++) { var ph = (t / 300 + i * 0.8) % 5; p.r(x + Math.round(Math.sin(ph * 1.7 + i) * 1.5 + ph * 1.2), Math.round(y - ph * 3), ph > 3 ? 2 : 1, 1, ph > 2.5 ? 'l' : 'd'); } }

  // a river crossing: the far bank, wide water, the near bank. o.width (feet) widens the water
  function riverScene(W, H, o) {
    o = o || {};
    var mood = o.mood || 'day', b = base(W, H, mood), p = b.p, gy = Math.round(H * 0.5), seas = o.season;
    var far = o.canyon ? { a: 'n', b: 'r', l: 2 } : seas === 'winter' ? { a: 'w', b: 'l', l: 1 } : { a: 'g', b: 'c', l: 2 };
    if (o.mountains) { var mh = hills(p, W, H, gy - 10, 18, 31, { a: 'd', b: 'l', l: 2 }, true); snowCaps(p, mh, gy - 18); }
    hills(p, W, H, gy, 4, 5, far);
    if (o.canyon) { for (var y = gy - 8; y < gy + 12; y += 4) p.r(0, y, W, 2, { a: 'r', b: 'n', l: 1 }); }
    var wTop = gy + 6, wBot = Math.round(H * (0.7 + Math.min(0.12, (o.width || 400) / 9000)));
    p.r(0, wTop - 3, W, 3, seas === 'winter' ? 'w' : o.canyon ? 'n' : 'y');
    var r = rng(9);
    for (var i = 0; i < 10; i++) tree(p, o.trees || 'cotton', Math.round(r() * W), wTop - 2, 0.8 + r() * 0.4, seas === 'winter');
    p.r(0, wBot, W, H - wBot, seas === 'winter' ? { a: 'w', b: 'l', l: 1 } : { a: 'g', b: 'G', l: 1 });
    p.r(0, wBot, W, 2, 'y');
    for (var j = 0; j < 8; j++) { var gx = Math.round(r() * W); p.line(gx, H - 2 - j * 3, gx - 1, H - 6 - j * 3, 'g'); }
    var cl = animClouds(W, H, 6, mood);
    return { img: b.c, wTop: wTop, wBot: wBot, anim: function (ctx, t) { var q = P(ctx); cl(q, t); water(q, 0, wTop, W, wBot - wTop, t, true); } };
  }
  SCENES.kansas = function (W, H, o) { return riverScene(W, H, Object.assign({ width: 620, trees: 'oak' }, o)); };
  SCENES.bigblue = function (W, H, o) { return riverScene(W, H, Object.assign({ width: 220, trees: 'oak' }, o)); };
  SCENES.greenriver = function (W, H, o) { return riverScene(W, H, Object.assign({ width: 420, trees: 'cotton', mountains: true }, o)); };
  SCENES.snake = function (W, H, o) { return riverScene(W, H, Object.assign({ width: 1000, trees: 'sage', canyon: true }, o)); };

  // forts: style 'sod' (Kearney), 'adobe' (Laramie, Hall, Boise), 'log' (Bridger, Walla Walla)
  function fortScene(W, H, style, o) {
    o = o || {};
    var b = base(W, H, o.mood), p = b.p, gy = Math.round(H * 0.6), seas = o.season;
    if (o.mountains) { var mh = hills(p, W, H, gy - 14, 16, 23, { a: 'd', b: 'l', l: 2 }, true); snowCaps(p, mh, gy - 20); }
    hills(p, W, H, gy - 2, 4, 13, seas === 'winter' ? { a: 'w', b: 'l', l: 2 } : style === 'adobe' ? { a: 'n', b: 'y', l: 2 } : { a: 'g', b: 'c', l: 2 });
    p.r(0, gy, W, H - gy, seas === 'winter' ? { a: 'w', b: 'l', l: 1 } : style === 'adobe' ? { a: 'y', b: 'n', l: 2 } : { a: 'g', b: 'G', l: 1 });
    var fw = Math.min(W - 40, 190), fx = Math.round((W - fw) / 2), fy = gy + 8, fh = 30, smokes = [], flagAt;
    var wall = style === 'adobe' ? { a: 'y', b: 'n', l: 1 } : style === 'log' ? 'n' : { a: 'n', b: 'k', l: 1 };
    if (style === 'sod') {
      // sod and frame buildings around a parade ground, no stockade
      for (var i = 0; i < 4; i++) { var bx = fx + i * (fw / 4) + 4, bw = fw / 4 - 8; p.r(bx, fy - 16, bw, 16, wall); p.poly([[bx - 2, fy - 16], [bx + bw / 2, fy - 24], [bx + bw + 2, fy - 16]], i % 2 ? 'r' : 'd'); p.r(bx + bw / 2 - 2, fy - 8, 4, 8, 'k'); p.r(bx + 3, fy - 12, 3, 3, 'C'); if (i === 1) { p.r(bx + bw - 6, fy - 27, 2, 4, 'd'); smokes.push([bx + bw - 5, fy - 28]); } }
      flagAt = [fx + fw / 2 - 1, fy - 52];
    } else {
      p.r(fx, fy - fh, fw, fh, wall);
      if (style === 'log') { for (var x = fx; x < fx + fw; x += 3) { p.r(x, fy - fh, 1, fh, 'k'); p.px(x + 1, fy - fh - 1, 'n'); p.px(x + 1, fy - fh - 2, 'n'); } }
      else { p.span(fy - fh, fx, fx + fw - 1, 'w'); for (var y = fy - fh + 4; y < fy; y += 5) p.span(y, fx, fx + fw - 1, { a: 'y', b: 'n', l: 3 }); }
      // corner blockhouses
      [fx - 6, fx + fw - 12].forEach(function (bx2) { p.r(bx2, fy - fh - 14, 18, fh + 14, wall); p.r(bx2 - 2, fy - fh - 16, 22, 3, style === 'log' ? 'k' : 'n'); p.r(bx2 + 5, fy - fh - 8, 3, 3, 'k'); p.r(bx2 + 11, fy - fh - 8, 3, 3, 'k'); });
      p.r(fx + fw / 2 - 9, fy - 18, 18, 18, 'k'); p.r(fx + fw / 2 - 8, fy - 17, 7, 17, 'n'); p.r(fx + fw / 2 + 1, fy - 17, 7, 17, 'n');
      p.r(fx + fw / 2 - 11, fy - 22, 22, 3, style === 'log' ? 'k' : 'w');
      smokes.push([fx + 30, fy - fh - 2]);
      flagAt = [fx + fw / 2 - 1, fy - fh - 30];
    }
    var r = rng(17);
    for (var t = 0; t < 7; t++) { var tx = Math.round(r() * W); if (tx > fx - 20 && tx < fx + fw + 20) continue; tree(p, o.trees || 'oak', tx, gy + 6 + Math.round(r() * 8), 0.9, seas === 'winter'); }
    var wg = Math.round(W * 0.08); if (W > 300) team(p, Math.min(W - 70, fx + fw + 26), gy + 14, 0, 0.2);
    p.r(Math.max(2, wg - 10), H - 10, 40, 2, 'n');
    var cl = animClouds(W, H, 21, o.mood);
    return { img: b.c, anim: function (ctx, t) { var q = P(ctx); cl(q, t); smokes.forEach(function (s) { smoke(q, s[0], s[1], t); }); flag(q, flagAt[0], flagAt[1], Math.floor(t / 300) % 2); } };
  }
  SCENES.kearney = function (W, H, o) { return fortScene(W, H, 'sod', o); };
  SCENES.laramie = function (W, H, o) { return fortScene(W, H, 'adobe', Object.assign({ trees: 'cotton' }, o)); };
  SCENES.bridger = function (W, H, o) { return fortScene(W, H, 'log', Object.assign({ trees: 'pine', mountains: true }, o)); };
  SCENES.forthall = function (W, H, o) { return fortScene(W, H, 'adobe', Object.assign({ trees: 'sage' }, o)); };
  SCENES.boise = function (W, H, o) { return fortScene(W, H, 'adobe', Object.assign({ trees: 'sage' }, o)); };
  SCENES.wallawalla = function (W, H, o) { return fortScene(W, H, 'log', Object.assign({ trees: 'sage' }, o)); };

  SCENES.chimney = function (W, H, o) {
    o = o || {};
    var b = base(W, H, o.mood), p = b.p, gy = Math.round(H * 0.74), seas = o.season, cx = Math.round(W * 0.55);
    hills(p, W, H, gy - 6, 8, 41, { a: 'n', b: 'y', l: 2 });
    // the cone and the spire, lit from the left
    p.poly([[cx - 52, gy + 2], [cx - 14, gy - 34], [cx + 12, gy - 34], [cx + 56, gy + 2]], { a: 'y', b: 'n', l: 2 });
    p.poly([[cx + 2, gy - 34], [cx + 12, gy - 34], [cx + 56, gy + 2], [cx + 24, gy + 2]], { a: 'n', b: 'r', l: 1 });
    var sp = Math.max(34, Math.round(H * 0.36)), st = gy - 34 - sp;
    p.r(cx - 5, st, 11, sp + 2, { a: 'y', b: 'w', l: 1 }); p.r(cx + 2, st, 4, sp + 2, { a: 'n', b: 'y', l: 2 });
    p.r(cx - 4, st - 4, 9, 4, 'y'); p.r(cx - 3, st - 6, 6, 2, 'w');
    for (var k = st + 6; k < gy - 34; k += 9) p.span(k, cx - 5, cx + 5, 'n');
    p.r(0, gy, W, H - gy, seas === 'winter' ? { a: 'w', b: 'l', l: 1 } : { a: 'y', b: 'g', l: 1 });
    var r = rng(3); for (var i = 0; i < 12; i++) tree(p, 'sage', Math.round(r() * W), gy + 4 + Math.round(r() * (H - gy - 6)), 1.1, seas === 'winter');
    var cl = animClouds(W, H, 8, o.mood);
    return { img: b.c, anim: function (ctx, t) { cl(P(ctx), t); } };
  };
  SCENES.indrock = function (W, H, o) {
    o = o || {};
    var b = base(W, H, o.mood), p = b.p, gy = Math.round(H * 0.68), seas = o.season, cx = Math.round(W * 0.5);
    hills(p, W, H, gy - 10, 10, 51, { a: 'l', b: 'c', l: 2 });
    p.r(0, gy - 2, W, H - gy + 2, seas === 'winter' ? { a: 'w', b: 'l', l: 1 } : { a: 'y', b: 'n', l: 2 });
    // the great granite whale-back
    p.ell(cx, gy + 6, 90, 40, 'd', true); p.ell(cx - 6, gy + 4, 84, 37, 'l', true); p.ell(cx - 20, gy - 8, 50, 20, { a: 'l', b: 'w', l: 1 }, true);
    for (var y = gy - 26; y < gy; y += 7) p.span(y, cx - 60 + (gy - y), cx + 50 - (gy - y), { a: 'l', b: 'd', l: 1 });
    // names painted in axle grease
    var r = rng(4); for (var i = 0; i < 18; i++) p.r(cx - 50 + Math.round(r() * 90), gy - 4 - Math.round(r() * 16), 2 + Math.round(r() * 3), 1, 'k');
    water(p, 0, gy + 10, W, 4, 0, false); p.r(0, gy + 9, W, 1, 'g');
    for (var j = 0; j < 9; j++) tree(p, 'sage', Math.round(r() * W), gy + 20 + Math.round(r() * (H - gy - 22)), 1.1, seas === 'winter');
    var cl = animClouds(W, H, 9, o.mood);
    return { img: b.c, anim: function (ctx, t) { var q = P(ctx); cl(q, t); water(q, 0, gy + 10, W, 4, t, false); } };
  };
  SCENES.southpass = function (W, H, o) {
    o = o || {};
    var b = base(W, H, o.mood), p = b.p, gy = Math.round(H * 0.66), seas = o.season;
    var hs = hills(p, W, H, gy - 26, 26, 61, { a: 'd', b: 'l', l: 2 }, true); snowCaps(p, hs, gy - 38);
    // the broad, gentle saddle
    var sh = []; for (var x = 0; x < W; x++) sh.push(Math.round(gy - 6 - 10 * Math.pow((x / W - 0.5) * 2, 2)));
    fillRidge(p, sh, H, seas === 'winter' ? { a: 'w', b: 'l', l: 1 } : { a: 'n', b: 'g', l: 2 });
    p.r(0, gy + 4, W, H - gy - 4, seas === 'winter' ? { a: 'w', b: 'l', l: 1 } : { a: 'g', b: 'n', l: 2 });
    p.poly([[W * 0.45, gy - 2], [W * 0.55, gy - 2], [W * 0.75, H], [W * 0.25, H]], seas === 'winter' ? 'l' : { a: 'n', b: 'y', l: 1 });
    var r = rng(2); for (var i = 0; i < 10; i++) tree(p, 'sage', Math.round(r() * W), gy + 6 + Math.round(r() * (H - gy - 8)), 1, seas === 'winter');
    var cl = animClouds(W, H, 10, o.mood);
    return { img: b.c, anim: function (ctx, t) { cl(P(ctx), t); } };
  };
  SCENES.soda = function (W, H, o) {
    o = o || {};
    var b = base(W, H, o.mood), p = b.p, gy = Math.round(H * 0.6), seas = o.season;
    var hs = hills(p, W, H, gy - 12, 14, 71, { a: 'g', b: 'd', l: 2 }, true); if (seas === 'winter') snowCaps(p, hs, gy - 14);
    p.r(0, gy, W, H - gy, seas === 'winter' ? { a: 'w', b: 'l', l: 1 } : { a: 'g', b: 'G', l: 1 });
    var pools = [[W * 0.3, gy + 26, 26], [W * 0.62, gy + 18, 18], [W * 0.78, gy + 36, 14]];
    pools.forEach(function (q) { p.ell(q[0], q[1], q[2] + 4, Math.round(q[2] / 3) + 2, { a: 'y', b: 'w', l: 2 }); p.ell(q[0], q[1], q[2], Math.round(q[2] / 3), 'C'); });
    var r = rng(5); for (var i = 0; i < 6; i++) tree(p, 'pine', Math.round(r() * W), gy + 4, 0.9, seas === 'winter');
    var cl = animClouds(W, H, 11, o.mood);
    return { img: b.c, anim: function (ctx, t) {
      var q = P(ctx); cl(q, t);
      pools.forEach(function (pl, k) { for (var i = 0; i < 7; i++) { var ph = (t / 220 + i * 1.3 + k) % 4, bx = pl[0] + Math.round(Math.sin(i * 2.1 + k) * pl[2] * 0.6), by = pl[1] - Math.round(ph * 2); q.px(bx, by, ph < 2 ? 'w' : 'C'); } });
      var g = (t / 2500) % 1; if (g < 0.3) for (var j = 0; j < 6; j++) q.px(pools[1][0] + (j % 2), pools[1][1] - 2 - j * 2 - Math.round(g * 20), 'w');
    } };
  };
  SCENES.bluemtns = function (W, H, o) {
    o = o || {};
    var b = base(W, H, o.mood), p = b.p, gy = Math.round(H * 0.6), seas = o.season, snow = seas === 'winter';
    var h1 = hills(p, W, H, gy - 22, 18, 81, { a: 'b', b: 'B', l: 2 }); if (snow) snowCaps(p, h1, gy - 24);
    var h2 = hills(p, W, H, gy - 6, 12, 82, { a: 'g', b: 'b', l: 2 });
    var h3 = hills(p, W, H, gy + 12, 10, 83, snow ? { a: 'w', b: 'l', l: 2 } : { a: 'g', b: 'k', l: 1 });
    var r = rng(6);
    for (var i = 0; i < W / 6; i++) { var x = Math.round(r() * W); tree(p, 'pine', x, h2[x] + 8, 0.6, snow); }
    for (var j = 0; j < W / 9; j++) { var x2 = Math.round(r() * W); tree(p, 'pine', x2, h3[x2] + 18 + Math.round(r() * 20), 1.1 + r() * 0.4, snow); }
    var cl = animClouds(W, H, 12, o.mood);
    return { img: b.c, anim: function (ctx, t) { cl(P(ctx), t); } };
  };
  SCENES.dalles = function (W, H, o) {
    o = o || {};
    var b = base(W, H, o.mood), p = b.p, gy = Math.round(H * 0.5), seas = o.season;
    var hx = Math.round(W * 0.7); p.poly([[hx - 40, gy], [hx, gy - 46], [hx + 44, gy]], 'l'); p.poly([[hx - 12, gy - 32], [hx, gy - 46], [hx + 13, gy - 31], [hx + 4, gy - 27], [hx - 4, gy - 29]], 'w'); p.poly([[hx, gy - 46], [hx + 44, gy], [hx + 16, gy]], { a: 'l', b: 'd', l: 1 });
    // basalt cliffs on both sides of the gorge, in columns
    var cl1 = hills(p, W, H, gy + 4, 10, 91, { a: 'd', b: 'k', l: 2 });
    for (var x = 0; x < W; x += 4) p.r(x, cl1[x] + 2, 1, 16, 'k');
    p.r(0, gy + 18, W, 2, seas === 'winter' ? 'w' : 'y');
    var wt = gy + 20, wb = Math.round(H * 0.8);
    p.r(0, wb, W, H - wb, seas === 'winter' ? { a: 'w', b: 'l', l: 1 } : { a: 'n', b: 'y', l: 2 });
    var r = rng(9); for (var i = 0; i < 8; i++) tree(p, 'sage', Math.round(r() * W), wb + 6 + Math.round(r() * (H - wb - 8)), 1, seas === 'winter');
    var cl = animClouds(W, H, 13, o.mood);
    return { img: b.c, anim: function (ctx, t) { var q = P(ctx); cl(q, t); water(q, 0, wt, W, wb - wt, t * 2, true); for (var k = 0; k < 5; k++) { var rx = (k * 71 + 30) % W; q.r(rx, wt + 6 + k * 3, 4, 2, 'd'); q.span(wt + 5 + k * 3, rx - 1, rx + 5, Math.floor(t / 200 + k) % 2 ? 'w' : 'C'); } } };
  };
  // the Willamette Valley: green farms, Mount Hood, a cabin, the end of the trail
  SCENES.willamette = function (W, H, o) {
    o = o || {};
    var b = base(W, H, 'day'), p = b.p, gy = Math.round(H * 0.56);
    var hx = Math.round(W * 0.68); p.poly([[hx - 50, gy + 4], [hx, gy - 52], [hx + 54, gy + 4]], 'l'); p.poly([[hx - 15, gy - 36], [hx, gy - 52], [hx + 16, gy - 35], [hx + 6, gy - 30], [hx - 3, gy - 33], [hx - 9, gy - 29]], 'w'); p.poly([[hx, gy - 52], [hx + 54, gy + 4], [hx + 20, gy + 4]], { a: 'l', b: 'B', l: 1 });
    hills(p, W, H, gy, 6, 101, { a: 'g', b: 'c', l: 2 });
    p.r(0, gy + 6, W, H - gy - 6, { a: 'g', b: 'G', l: 1 });
    // fields in strips
    for (var i = 0; i < 6; i++) { var fy = gy + 10 + i * 7; p.poly([[0, fy], [W, fy - 3], [W, fy + 3], [0, fy + 6]], i % 2 ? { a: 'y', b: 'g', l: 2 } : { a: 'G', b: 'g', l: 2 }); }
    // the cabin
    var cx = Math.round(W * 0.2), cy = H - 18; p.r(cx, cy - 18, 34, 18, 'n'); for (var y = cy - 16; y < cy; y += 3) p.span(y, cx, cx + 33, 'r');
    p.poly([[cx - 4, cy - 18], [cx + 17, cy - 32], [cx + 38, cy - 18]], 'r'); p.r(cx + 13, cy - 10, 7, 10, 'k'); p.r(cx + 4, cy - 13, 5, 5, 'y'); p.r(cx + 25, cy - 13, 5, 5, 'y'); p.r(cx + 26, cy - 36, 4, 10, 'd');
    var r = rng(4); for (var t = 0; t < 10; t++) tree(p, r() < 0.5 ? 'oak' : 'pine', Math.round(W * 0.4 + r() * W * 0.6), gy + 12 + Math.round(r() * 10), 1, false);
    var cl = animClouds(W, H, 14, 'day');
    return { img: b.c, anim: function (ctx, t) { var q = P(ctx); cl(q, t); smoke(q, cx + 27, cy - 37, t); var sx = Math.round(W * 0.12); q.ell(sx, 16, 7, 7, 'y'); for (var k = 0; k < 8; k++) { var a = k / 8 * Math.PI * 2 + t / 2000; q.px(sx + Math.round(Math.cos(a) * 10), 16 + Math.round(Math.sin(a) * 10), 'y'); } } };
  };
  // Barlow Road: the rough road around Mount Hood
  SCENES.barlow = function (W, H, o) {
    o = o || {};
    var b = base(W, H, o.mood), p = b.p, gy = Math.round(H * 0.58), snow = o.season === 'winter';
    var hx = Math.round(W * 0.5); p.poly([[hx - 70, gy + 10], [hx, gy - 60], [hx + 74, gy + 10]], 'l'); p.poly([[hx - 26, gy - 34], [hx, gy - 60], [hx + 28, gy - 32], [hx + 10, gy - 24], [hx - 6, gy - 28], [hx - 16, gy - 22]], 'w'); p.poly([[hx, gy - 60], [hx + 74, gy + 10], [hx + 30, gy + 10]], { a: 'l', b: 'd', l: 1 });
    var h2 = hills(p, W, H, gy + 8, 10, 111, snow ? { a: 'w', b: 'l', l: 1 } : { a: 'g', b: 'k', l: 1 });
    var r = rng(7); for (var i = 0; i < W / 5; i++) { var x = Math.round(r() * W); tree(p, 'pine', x, h2[x] + 10 + Math.round(r() * (H - h2[x] - 10)), 1 + r() * 0.5, snow); }
    p.poly([[W * 0.42, H], [W * 0.5, gy + 22], [W * 0.54, gy + 22], [W * 0.62, H]], snow ? 'l' : 'n');
    var cl = animClouds(W, H, 15, o.mood);
    return { img: b.c, anim: function (ctx, t) { cl(P(ctx), t); } };
  };

  // Matt's General Store: shelves, barrels and sacks, Matt behind the counter
  SCENES.store = function (W, H) {
    var c = mk(W, H), p = P(c.getContext('2d'));
    p.r(0, 0, W, H, 'n'); for (var x = 0; x < W; x += 7) p.r(x, 0, 1, H, 'r');
    p.r(0, 0, W, 6, 'k');
    // shelves of goods
    var r = rng(12);
    for (var s = 0; s < 3; s++) {
      var sy = 20 + s * 22; p.r(6, sy, W - 12, 2, 'k'); p.r(6, sy - 1, W - 12, 1, 'y');
      for (var gx = 10; gx < W - 14; gx += 6 + Math.round(r() * 4)) {
        var kind = r(); if (Math.abs(gx - W * 0.5) < 26 && s === 0) continue;
        if (kind < 0.3) { p.r(gx, sy - 8, 4, 8, ['B', 'g', 'r', 'y'][Math.floor(r() * 4)]); p.r(gx + 1, sy - 9, 2, 1, 'l'); }
        else if (kind < 0.6) { p.r(gx, sy - 6, 5, 6, 'w'); p.r(gx, sy - 4, 5, 1, ['r', 'b'][Math.floor(r() * 2)]); }
        else { p.r(gx, sy - 7, 6, 7, 'y'); p.r(gx + 1, sy - 8, 4, 1, 'n'); }
      }
    }
    // the window onto the street
    var wx = Math.round(W * 0.5) - 20; p.r(wx, 6, 40, 10, 'k'); p.r(wx + 1, 7, 38, 8, 'C'); p.r(wx + 20, 7, 1, 8, 'k'); p.r(wx + 1, 12, 38, 3, 'g');
    // floor
    var fy = Math.round(H * 0.72); p.r(0, fy, W, H - fy, { a: 'n', b: 'r', l: 2 }); for (var y = fy; y < H; y += 4) p.span(y, 0, W, 'r');
    // the counter
    var cy = Math.round(H * 0.62); p.r(Math.round(W * 0.25), cy, Math.round(W * 0.5), Math.round(H * 0.16), 'r'); p.r(Math.round(W * 0.25), cy, Math.round(W * 0.5), 2, 'y');
    for (var px2 = Math.round(W * 0.25) + 4; px2 < W * 0.75; px2 += 8) p.r(px2, cy + 3, 1, Math.round(H * 0.16) - 4, 'n');
    // Matt
    var mx = Math.round(W * 0.5) - 6, my = cy - 30;
    p.r(mx + 2, my, 8, 3, 'n'); p.r(mx + 2, my + 3, 8, 7, 'S'); p.px(mx + 4, my + 5, 'k'); p.px(mx + 7, my + 5, 'k'); p.r(mx + 3, my + 8, 6, 1, 'n');
    p.r(mx, my + 10, 12, 20, 'B'); p.r(mx + 3, my + 10, 6, 20, 'w'); p.r(mx + 3, my + 14, 6, 1, 'l'); p.r(mx - 2, my + 12, 2, 10, 'B'); p.r(mx + 12, my + 12, 2, 10, 'B'); p.r(mx - 2, my + 22, 2, 2, 'S'); p.r(mx + 12, my + 22, 2, 2, 'S');
    // barrels and sacks on the floor
    function barrel(bx, by) { p.r(bx, by - 14, 12, 14, 'n'); p.r(bx + 1, by - 15, 10, 1, 'n'); p.r(bx, by - 11, 12, 1, 'k'); p.r(bx, by - 4, 12, 1, 'k'); p.r(bx + 3, by - 14, 1, 14, 'r'); p.r(bx + 2, by - 16, 8, 1, 'k'); }
    function sack(bx, by) { p.ell(bx + 6, by - 5, 6, 5, 'y'); p.r(bx + 4, by - 12, 4, 3, 'y'); p.r(bx + 4, by - 10, 4, 1, 'n'); p.r(bx + 3, by - 6, 6, 2, 'n'); }
    barrel(8, H - 6); barrel(22, H - 4); sack(W - 30, H - 4); sack(W - 18, H - 6); barrel(W - 46, H - 3);
    // the yoke on the wall
    p.r(W - 48, 74, 30, 2, 'n'); p.r(W - 46, 74, 2, 6, 'n'); p.r(W - 22, 74, 2, 6, 'n');
    return { img: c, anim: function (ctx, t) { var q = P(ctx); if (Math.floor(t / 2600) % 5 === 0 && t % 2600 < 180) { q.r(mx + 3, my + 5, 6, 1, 'S'); } } };
  };

  // the tombstone on a grassy rise; the page writes the name and epitaph on it
  SCENES.tomb = function (W, H, o) {
    o = o || {};
    var b = base(W, H, o.mood || 'gray'), p = b.p, gy = Math.round(H * 0.7), snow = o.season === 'winter';
    hills(p, W, H, gy - 6, 6, 121, snow ? { a: 'w', b: 'l', l: 2 } : { a: 'g', b: 'c', l: 2 });
    p.r(0, gy, W, H - gy, snow ? { a: 'w', b: 'l', l: 1 } : { a: 'g', b: 'G', l: 1 });
    var sw = Math.min(96, Math.round(W * 0.36)), sh = Math.round(H * 0.74), sx = Math.round((W - sw) / 2), sy = gy + 10 - sh, ar = Math.round(sw * 0.36);
    p.ell(sx + sw / 2, sy + ar, sw / 2 + 2, ar + 2, 'k', true); p.r(sx - 2, sy + ar, sw + 4, sh - ar, 'k');
    p.ell(sx + sw / 2, sy + ar, sw / 2, ar, 'l', true); p.r(sx, sy + ar, sw, sh - ar, 'l');
    p.r(sx + sw - 7, sy + ar, 7, sh - ar, { a: 'l', b: 'd', l: 2 }); p.r(sx + 2, sy + ar, 2, sh - ar - 4, 'w');
    for (var gr = 0; gr < sw * sh / 40; gr++) p.px(sx + 3 + Math.round(rng(gr)() * (sw - 8)), sy + ar + Math.round(rng(gr + 99)() * (sh - ar - 2)), 'd');
    p.r(sx + 6, sy + ar - 4, sw - 12, 1, 'd'); p.r(sx + 6, sy + sh - 8, sw - 12, 1, 'd');
    p.ell(sx + sw / 2, gy + 14, sw / 2 + 14, 5, 'n'); p.ell(sx + sw / 2, gy + 13, sw / 2 + 10, 3, { a: 'n', b: 'r', l: 1 });
    var r = rng(o.seed || 3); for (var i = 0; i < 6; i++) { var fx = Math.round(r() * W); if (Math.abs(fx - W / 2) < sw / 2 + 8) continue; p.line(fx, H - 4, fx, H - 9, 'g'); p.px(fx, H - 10, ['y', 'M', 'w'][i % 3]); }
    var cl = animClouds(W, H, 16, o.mood || 'gray');
    return { img: b.c, stone: { x: sx, y: sy, w: sw, h: sh }, anim: function (ctx, t) { cl(P(ctx), t); } };
  };

  // the title: the wagon on a ridge at sunset
  SCENES.title = function (W, H) {
    var b = base(W, H, 'dusk'), p = b.p, gy = Math.round(H * 0.72);
    p.ell(Math.round(W * 0.7), gy - 6, 18, 18, 'y', true); p.ell(Math.round(W * 0.7), gy - 6, 14, 14, 'w', true);
    var hs = hills(p, W, H, gy - 18, 14, 131, { a: 'm', b: 'b', l: 2 }, true);
    hills(p, W, H, gy, 5, 132, 'k');
    return { img: b.c, anim: function (ctx, t) { var q = P(ctx); var x = Math.round(W + 40 - (t / 30) % (W + 120)); team(q, x, gy - 21, Math.floor(t / 180), -t / 200, {}); } };
  };

  function scene(id, W, H, o) { var f = SCENES[id]; return f ? f(W, H, o || {}) : SCENES.southpass(W, H, o || {}); }

  // ── The map ──────────────────────────────────────────────────────────────
  // o: {nodes, path: [ids travelled], here: {lon, lat}, frac}
  function map(W, H, o) {
    var c = mk(W, H), p = P(c.getContext('2d')), M = o.map;
    var lon0 = M.lon[0], lon1 = M.lon[1], lat0 = M.lat[0], lat1 = M.lat[1];
    function X(lon) { return Math.round((lon - lon0) / (lon1 - lon0) * (W - 1)); }
    function Y(lat) { return Math.round((lat1 - lat) / (lat1 - lat0) * (H - 1)); }
    p.r(0, 0, W, H, { a: 'y', b: 'n', l: 1 });
    p.r(0, 0, Math.max(4, X(-124.1)), H, { a: 'b', b: 'B', l: 2 });   // the Pacific
    M.peaks.forEach(function (k) { var x = X(k[0]), y = Y(k[1]); p.poly([[x - 6, y + 4], [x, y - 5], [x + 6, y + 4]], 'n'); p.poly([[x - 2, y - 2], [x, y - 5], [x + 2, y - 2]], 'w'); p.line(x, y - 5, x + 6, y + 4, 'k'); });
    M.rivers.forEach(function (rv) { for (var i = 0; i + 1 < rv.length; i++) p.line(X(rv[i][0]), Y(rv[i][1]), X(rv[i + 1][0]), Y(rv[i + 1][1]), 'b'); });
    // the trail: dotted ahead, solid where you've been
    var N = o.nodes, done = o.path || [];
    function seg(a, b, col, dots) { var x0 = X(a.lon), y0 = Y(a.lat), x1 = X(b.lon), y1 = Y(b.lat), n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)); for (var i = 0; i <= n; i++) { if (dots && i % 3) continue; var x = Math.round(x0 + (x1 - x0) * i / n), y = Math.round(y0 + (y1 - y0) * i / n); p.r(x, y, 2, 2, col); } }
    Object.keys(N).forEach(function (id) { (N[id].next || []).forEach(function (nx) { seg(N[id], N[nx.to], 'k', true); }); });
    seg(N.dalles, N.willamette, 'k', true);
    for (var i = 0; i + 1 < done.length; i++) seg(N[done[i]], N[done[i + 1]], 'r', false);
    if (o.here && done.length) seg(N[done[done.length - 1]], o.here, 'r', false);
    Object.keys(N).forEach(function (id) { var n = N[id], x = X(n.lon), y = Y(n.lat), been = done.indexOf(id) >= 0; p.r(x - 2, y - 2, 5, 5, 'k'); p.r(x - 1, y - 1, 3, 3, been ? 'r' : n.kind === 'fort' ? 'w' : n.kind === 'river' ? 'B' : 'y'); });
    return { img: c, X: X, Y: Y };
  }

  // ── Hunting ──────────────────────────────────────────────────────────────
  // animals facing left; legs are drawn by code so they can run
  var ANIMALS = {
    bison: { w: 24, h: 12, legs: [5, 8, 17, 20], leg: 4, col: 'k', rows: [
      '....kkkk................',
      '..kkkkkkkk..............',
      '.wkkkkkkkkkknnnnnnnn....',
      'wkkkkkkkkkkknnnnnnnnnn..',
      '.kkkkkkkkkkknnnnnnnnnnn.',
      'kkykkkkkkkkknnnnnnnnnnnk',
      'kkkkkkkkkkkknnnnnnnnnnnk',
      '.kkkkkkkkkkknnnnnnnnnnk.',
      '..kkkkkkkkkknnnnnnnnnn..',
      '...kk..kkkkknnnnnnnnn...'] },
    deer: { w: 16, h: 11, legs: [4, 6, 11, 13], leg: 5, col: 'n', rows: [
      '.y.y............',
      '..yy............',
      '.nnnk...........',
      'knnnn...........',
      '..nnn...........',
      '...nnnnnnnnnnnw.',
      '...nnnnnnnnnnnww',
      '...nnnnnnnnnnnn.',
      '...wnnnnnnnnnn..',
      '....nnnnnnnnn...'] },
    elk: { w: 20, h: 14, legs: [5, 7, 15, 17], leg: 6, col: 'n', rows: [
      'l.l.l...............',
      '.lll.l..............',
      '..lll...............',
      '...kkk..............',
      '..kkkkk.............',
      '.kkkkkk.............',
      'kkk.kkkk............',
      '.....kkknnnnnnnnnnw.',
      '.....kknnnnnnnnnnnww',
      '.....kknnnnnnnnnnnn.',
      '.....kknnnnnnnnnnnn.',
      '......nnnnnnnnnnnn..'] },
    bear: { w: 20, h: 11, legs: [4, 6, 14, 16], leg: 3, col: 'k', rows: [
      '..kk................',
      '.kkkk..kkkkkk.......',
      'kkkkkkkkkkkkkkkk....',
      'kdkkkkkkkkkkkkkkkk..',
      'kkkkkkkkkkkkdkkkkkk.',
      '.kkkkkkkkkkkkkkkkkkk',
      '...kkkkkkkkkkkkkkkkk',
      '...kkkkkkkkkkkkkkkk.',
      '....kkkkkkkkkkkkkk..'] },
    rabbit: { w: 9, h: 7, legs: [2, 6], leg: 2, col: 'l', rows: [
      '.ll......',
      '..ll.....',
      '.lllll...',
      'lkllllll.',
      '.llllllww',
      '..llllll.'] },
    squirrel: { w: 9, h: 7, legs: [2, 5], leg: 1, col: 'd', rows: [
      '......ll.',
      '.....llll',
      '.ll..l.ll',
      'kldll..l.',
      '.lllllll.',
      '..llllll.'] }
  };
  function animal(ctx, kind, x, y, f, dir, dead) {
    var A = ANIMALS[kind], p = P(ctx), flip = dir > 0;
    x = Math.round(x); y = Math.round(y);
    if (dead) {   // on its side
      var rr = A.rows.slice().reverse(), top = y + A.h - rr.length;
      A.legs.forEach(function (lx) { var xx = flip ? x + A.w - 1 - lx : x + lx; p.r(xx, top - A.leg + 1, 1, A.leg, A.col); p.px(xx, top - A.leg, 'k'); });
      p.spr(rr, x, top, flip); p.r(x + 2, y + A.h, A.w - 4, 1, 'r'); return;
    }
    var bodyH = A.rows.length, a = f % 2 ? 1 : -1;
    A.legs.forEach(function (lx, i) {
      var sw = (i % 2 ? a : -a), xx = flip ? x + A.w - 1 - lx : x + lx;
      p.r(xx, y + bodyH, 1, A.leg, A.col); if (kind !== 'rabbit' && kind !== 'squirrel') p.px(xx + sw, y + bodyH + A.leg - 1, A.col); p.px(xx + sw, y + bodyH + A.leg, 'k');
    });
    p.spr(A.rows, x, y + (kind === 'rabbit' && f % 2 ? -2 : 0), flip);
  }
  // the hunter, seen from behind and above, rifle pointing at angle a
  function hunter(ctx, x, y, a, fire) {
    var p = P(ctx); x = Math.round(x); y = Math.round(y);
    p.ell(x, y + 9, 6, 2, { a: 'k', b: 'g', l: 2 });
    p.r(x - 3, y + 2, 7, 7, 'n'); p.r(x - 3, y + 8, 3, 2, 'b'); p.r(x + 1, y + 8, 3, 2, 'b');
    p.r(x - 2, y - 3, 5, 5, 'S'); p.r(x - 3, y - 4, 7, 2, 'k'); p.r(x - 2, y - 6, 5, 2, 'k');
    var ex = x + Math.round(Math.cos(a) * 12), ey = y + 3 + Math.round(Math.sin(a) * 12);
    p.line(x, y + 3, ex, ey, 'k'); p.line(x + 1, y + 3, ex + 1, ey, 'd');
    if (fire) { p.r(ex - 1, ey - 1, 3, 3, 'y'); p.px(ex + Math.round(Math.cos(a) * 3), ey + Math.round(Math.sin(a) * 3), 'w'); }
  }
  // the hunting ground: grass, trees and rocks (returned so the page can block shots with them)
  function huntField(W, H, land, season, seed) {
    var c = mk(W, H), p = P(c.getContext('2d')), r = rng(seed || 1), L = LOOK[land] || LOOK.prairie, snow = season === 'winter';
    var g = snow ? { a: 'w', b: 'l', l: 1 } : L.ground === 'dry' ? { a: 'y', b: 'n', l: 2 } : { a: 'g', b: 'G', l: 1 };
    p.r(0, 0, W, H, g);
    for (var i = 0; i < W * H / 200; i++) { var x = Math.round(r() * W), y = Math.round(r() * H); p.px(x, y, snow ? 'l' : L.ground === 'dry' ? 'n' : 'g'); p.px(x, y - 1, snow ? 'w' : L.ground === 'dry' ? 'y' : 'G'); }
    for (var t2 = 0; t2 < W * H / 160; t2++) { var gx = Math.round(r() * W), gy2 = Math.round(r() * H), gc = snow ? 'l' : L.ground === 'dry' ? 'n' : 'g'; p.line(gx, gy2, gx - 1, gy2 - 2, gc); p.line(gx + 1, gy2, gx + 2, gy2 - 2, gc); if (!snow && r() < 0.12) p.px(gx + 3, gy2 - 1, ['y', 'M', 'w'][Math.floor(r() * 3)]); }
    if (L.ground !== 'dry' || r() < 0.4) { var cy = Math.round(H * (0.15 + r() * 0.2)); for (var x2 = 0; x2 < W; x2++) { var yy = cy + Math.round(Math.sin(x2 / 23) * 4 + Math.sin(x2 / 9) * 1.5); p.r(x2, yy, 1, 4, snow ? 'C' : { a: 'b', b: 'B', l: 2 }); p.px(x2, yy - 1, snow ? 'w' : 'n'); p.px(x2, yy + 4, snow ? 'w' : 'n'); } }
    var obs = [], n = 7 + Math.round(r() * 5);
    for (var k = 0; k < n; k++) {
      var ox2 = 14 + Math.round(r() * (W - 28)), oy = 16 + Math.round(r() * (H - 46));
      if (Math.abs(ox2 - W / 2) < 26 && oy > H - 60) continue;
      var kind = L.trees === 'sage' ? (r() < 0.5 ? 'rock' : 'sage') : (r() < 0.65 ? 'tree' : 'rock');
      if (kind === 'tree') { tree(p, L.trees === 'oak' || L.trees === 'cotton' ? 'oak' : 'pine', ox2, oy + 10, 1.4, snow); obs.push({ x: ox2 - 5, y: oy - 12, w: 12, h: 22 }); }
      else if (kind === 'rock') { rock(p, ox2 - 7, oy + 6, 14, 8, snow); obs.push({ x: ox2 - 7, y: oy - 2, w: 14, h: 8 }); }
      else { tree(p, 'sage', ox2, oy + 4, 2, snow); }
    }
    return { img: c, obs: obs };
  }

  // ── The Columbia: raft and rocks, seen from above ────────────────────────
  function raft(ctx, x, y, tilt, paddle) {
    var p = P(ctx); x = Math.round(x); y = Math.round(y);
    for (var i = 0; i < 7; i++) { p.r(x - 7 + i * 2, y - 11, 2, 22, i % 2 ? 'n' : 'r'); }
    p.r(x - 8, y - 9, 16, 1, 'k'); p.r(x - 8, y + 8, 16, 1, 'k');
    p.r(x - 5, y - 6, 10, 13, 'w'); for (var k = -4; k < 7; k += 4) p.r(x - 5, y + k, 10, 1, 'l'); p.r(x - 5, y - 6, 1, 13, 'l');
    var s = paddle ? (Math.floor(paddle / 120) % 2 ? 1 : -1) : 0;
    p.line(x + 8, y + 9, x + 12 + s, y + 15, 'n'); p.r(x + 11 + s, y + 14, 2, 3, 'n');
    p.r(x + 7, y + 8, 3, 3, 'S');
  }
  function riverRock(ctx, x, y, s, t) {
    var p = P(ctx); x = Math.round(x); y = Math.round(y);
    var f = Math.floor(t / 160) % 2;
    p.ell(x, y + 1, s + 3, Math.round(s * 0.6) + 2, f ? 'w' : 'C');
    p.ell(x, y, s, Math.round(s * 0.6), 'd'); p.ell(x - 1, y - 1, s - 2, Math.max(1, Math.round(s * 0.4)), 'l');
  }

  return { PAL: PAL, P: P, mk: mk, rng: rng, hash: hash, Travel: Travel, scene: scene, map: map, team: team, wagon: wagon, ox: ox, tree: tree,
    animal: animal, ANIMALS: ANIMALS, hunter: hunter, huntField: huntField, raft: raft, riverRock: riverRock, water: water, LOOK: LOOK, seasonOf: seasonOf };
})();
