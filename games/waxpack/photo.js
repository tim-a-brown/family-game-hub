'use strict';
// Wax Pack's card photos (WaxPhoto): a photo of a real card made to look like a good flatbed scan of that very card,
// on the device, nothing sent anywhere. Nothing is repainted: the card is found, straightened and cut out, and then
// only whole-card corrections are made (a white balance from the card's own white, a gentle evening of the light, a
// light sharpen), so creases, wear, centering and print dots stay. No library: canvas and plain arrays.
//
//   WaxPhoto.capture({sides: ['front', 'back'], optional: ['back'], clean: true}) -> Promise<{front, back}>
//       A live camera view with a card-shaped frame; each side is a Blob (or the clean() result with clean: true),
//       or null when skipped. Falls back to the file picker and photo library where the camera isn't allowed.
//   WaxPhoto.clean(imageOrBlob, {side: 'front' | 'back', straight, holo, turn, type}) -> Promise<Cleaned>
//       Cleaned: {blob, url (object URL), raw (the straightened card before any correction, a Blob), w, h, side,
//       kind: 'front' | 'printed' | 'cardboard', found (the card's edges were found), cut (a corner lay outside the
//       photo), quad (the four corners in the photo's pixels, clockwise from top left), corners: 'square' | 'round',
//       radius (a fraction of the card's width), cornerSure, border: {kind: 'white' | 'gray' | 'color' | 'none',
//       rgb}, stock (a cardboard back's own color), holo: {cols, rows, bits, boxes}, glare (share of the card blown
//       out), ms}. straight: true takes the image as an already straightened card (to correct again with a mended
//       holo mask: clean(cleaned.raw, {straight: true, holo})).
//   WaxPhoto.record(cleaned) -> Promise<{url (data URL), w, h, side, kind, corners, radius, holo}>   to store
//   WaxPhoto.show(el, cleanedOrRecord) -> {destroy}      the card with its own corners, a card-stock edge, and a live
//       shimmer over any hologram or foil that follows the finger, the pointer or the phone's tilt.
//   WaxPhoto.editHolo(cleanedOrRecord) -> Promise<holo | null>   tap or drag to mark where the hologram or foil is.
//   WaxPhoto.ask()    asks an iPhone for its tilt; call it from a tap.
//   WaxPhoto.detect(imageOrBlob) -> Promise<{quad, found, cut, w, h}>   (tests)
(function (root) {
  var CARD = 2.5 / 3.5, OW = 750, OH = 1050, PAD = 24, GC = 20, GR = 28;
  var IDLE = 0;

  // ── Images in and out ────────────────────────────────────────────────────
  function load(src) {
    if (src && (src.tagName === 'CANVAS' || (typeof ImageBitmap !== 'undefined' && src instanceof ImageBitmap))) return Promise.resolve(src);
    if (src && src.tagName === 'IMG') return src.complete && src.naturalWidth ? Promise.resolve(src) : new Promise(function (res, rej) { src.onload = function () { res(src); }; src.onerror = rej; });
    return new Promise(function (res, rej) {
      var url = typeof src === 'string' ? src : URL.createObjectURL(src), im = new Image();
      im.decoding = 'async';
      im.onload = function () { if (typeof src !== 'string') setTimeout(function () { URL.revokeObjectURL(url); }, 0); res(im); };
      im.onerror = function () { rej(new Error('image')); }; im.src = url;
    });
  }
  function dims(im) { return { w: im.naturalWidth || im.videoWidth || im.width, h: im.naturalHeight || im.videoHeight || im.height }; }
  function canvas(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function ctx2(c) { return c.getContext('2d', { willReadFrequently: true }); }
  function drawScaled(im, k) {
    var d = dims(im), w = Math.max(1, Math.round(d.w * k)), h = Math.max(1, Math.round(d.h * k)), c = canvas(w, h), x = ctx2(c);
    x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high'; x.drawImage(im, 0, 0, w, h); return c;
  }
  function pixels(c) { return ctx2(c).getImageData(0, 0, c.width, c.height); }
  var WEBP = null;
  function encode(c, type, q) {
    return new Promise(function (res) {
      var want = type || (WEBP === false ? 'image/jpeg' : 'image/webp');
      c.toBlob(function (b) {
        if (want === 'image/webp' && (!b || b.type !== 'image/webp')) { WEBP = false; return c.toBlob(function (j) { res(j); }, 'image/jpeg', q || 0.9); }
        if (want === 'image/webp') WEBP = true;
        res(b);
      }, want, q || 0.9);
    });
  }
  function blobToData(b) { return new Promise(function (res) { var r = new FileReader(); r.onload = function () { res(r.result); }; r.onerror = function () { res(null); }; r.readAsDataURL(b); }); }

  // ── Small image maths ────────────────────────────────────────────────────
  // RGBA bytes -> three Float32 planes 0..1
  function planes(id) {
    var n = id.width * id.height, d = id.data, r = new Float32Array(n), g = new Float32Array(n), b = new Float32Array(n);
    for (var i = 0, j = 0; i < n; i++, j += 4) { r[i] = d[j] / 255; g[i] = d[j + 1] / 255; b[i] = d[j + 2] / 255; }
    return { w: id.width, h: id.height, r: r, g: g, b: b };
  }
  function boxBlur(a, w, h, rad) {   // separable box blur, edges clamped
    var t = new Float32Array(a.length), o = new Float32Array(a.length), n = rad * 2 + 1, x, y, s, i;
    for (y = 0; y < h; y++) {
      i = y * w; s = 0;
      for (x = -rad; x <= rad; x++) s += a[i + Math.min(w - 1, Math.max(0, x))];
      for (x = 0; x < w; x++) { t[i + x] = s / n; s += a[i + Math.min(w - 1, x + rad + 1)] - a[i + Math.max(0, x - rad)]; }
    }
    for (x = 0; x < w; x++) {
      s = 0;
      for (y = -rad; y <= rad; y++) s += t[Math.min(h - 1, Math.max(0, y)) * w + x];
      for (y = 0; y < h; y++) { o[y * w + x] = s / n; s += t[Math.min(h - 1, y + rad + 1) * w + x] - t[Math.max(0, y - rad) * w + x]; }
    }
    return o;
  }
  function luma(P) { var n = P.r.length, L = new Float32Array(n); for (var i = 0; i < n; i++) L[i] = 0.299 * P.r[i] + 0.587 * P.g[i] + 0.114 * P.b[i]; return L; }
  // The color gradient: per pixel the channel with the strongest Sobel response
  function gradient(P) {
    var w = P.w, h = P.h, n = w * h, gx = new Float32Array(n), gy = new Float32Array(n), mg = new Float32Array(n), ch = [P.r, P.g, P.b];
    for (var y = 1; y < h - 1; y++) for (var x = 1; x < w - 1; x++) {
      var i = y * w + x, best = -1, bx = 0, by = 0;
      for (var c = 0; c < 3; c++) {
        var a = ch[c];
        var sx = (a[i - w + 1] + 2 * a[i + 1] + a[i + w + 1] - a[i - w - 1] - 2 * a[i - 1] - a[i + w - 1]) / 4;
        var sy = (a[i + w - 1] + 2 * a[i + w] + a[i + w + 1] - a[i - w - 1] - 2 * a[i - w] - a[i - w + 1]) / 4;
        var m = sx * sx + sy * sy; if (m > best) { best = m; bx = sx; by = sy; }
      }
      gx[i] = bx; gy[i] = by; mg[i] = Math.sqrt(best);
    }
    return { gx: gx, gy: gy, mg: mg };
  }
  function hsv(r, g, b) {
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, hh = 0;
    if (d > 1e-6) { if (mx === r) hh = ((g - b) / d) % 6; else if (mx === g) hh = (b - r) / d + 2; else hh = (r - g) / d + 4; hh *= 60; if (hh < 0) hh += 360; }
    return [hh, mx > 0 ? d / mx : 0, mx];
  }
  function median(a) { if (!a.length) return 0; var s = a.slice().sort(function (p, q) { return p - q; }); return s[s.length >> 1]; }

  // ── Finding the card ─────────────────────────────────────────────────────
  // 1. A rough outline: the background is flooded in from the photo's edge and the card from its middle, each front
  //    taking the next pixel that costs it least (a marker watershed). Crossing an edge costs anyone; the background
  //    also pays for leaving its own color, so the white border can't be taken for table.
  // 2. Each side of that outline is searched for straight edges (a small Hough over a band either side), and of
  //    every set of four the one kept is the best supported, card-shaped (2.5 by 3.5) and outermost.
  // 3. Each side is pinned down at a finer size, edge point by edge point, and a line fitted through them; the
  //    corners are where the lines meet, so a rounded or worn corner still gives a square card.
  function rough(P, G) {
    var w = P.w, h = P.h, n = w * h, i, x, y;
    var ring = []; for (x = 0; x < w; x++) { ring.push(x, (h - 1) * w + x, w + x, (h - 2) * w + x); } for (y = 0; y < h; y++) { ring.push(y * w, y * w + w - 1, y * w + 1, y * w + w - 2); }
    var hist = {}, top = null;
    ring.forEach(function (p) { var k = (P.r[p] * 7.99 | 0) * 64 + (P.g[p] * 7.99 | 0) * 8 + (P.b[p] * 7.99 | 0); hist[k] = (hist[k] || 0) + 1; if (!top || hist[k] > hist[top]) top = k; });
    var br = 0, bg = 0, bb = 0, bn = 0;
    ring.forEach(function (p) { var k = (P.r[p] * 7.99 | 0) * 64 + (P.g[p] * 7.99 | 0) * 8 + (P.b[p] * 7.99 | 0); if (k == top) { br += P.r[p]; bg += P.g[p]; bb += P.b[p]; bn++; } });
    br /= bn; bg /= bn; bb /= bn;
    var lab = new Uint8Array(n), Q = [], LV = 256;
    for (i = 0; i < LV; i++) Q.push([]);
    function bgd(p) { var a = P.r[p] - br, b = P.g[p] - bg, c = P.b[p] - bb; return Math.sqrt(a * a + b * b + c * c); }
    function cost(p, l) { var c = G.mg[p]; if (l === 1) c = Math.max(c, 1.4 * Math.max(0, bgd(p) - 0.1)); return Math.min(LV - 1, Math.round(c * 700)); }
    var cx0 = Math.round(w * 0.38), cx1 = Math.round(w * 0.62), cy0 = Math.round(h * 0.38), cy1 = Math.round(h * 0.62);
    for (y = cy0; y <= cy1; y++) for (x = cx0; x <= cx1; x++) lab[y * w + x] = 2;
    ring.forEach(function (p) { if (bgd(p) < 0.16 && !lab[p]) lab[p] = 1; });
    function push(p, l, lv) {
      var nb = [p - 1, p + 1, p - w, p + w], px = p % w;
      for (var k = 0; k < 4; k++) { var q = nb[k]; if (q < 0 || q >= n || lab[q] || (k === 0 && px === 0) || (k === 1 && px === w - 1)) continue; Q[Math.max(lv, cost(q, l))].push(q * 2 + l - 1); }
    }
    for (i = 0; i < n; i++) if (lab[i]) push(i, lab[i], 0);
    for (var lv = 0; lv < LV; lv++) {
      var B = Q[lv];
      for (var j = 0; j < B.length; j++) { var e = B[j], q = e >> 1, l = (e & 1) + 1; if (lab[q]) continue; lab[q] = l; push(q, l, lv); }
      Q[lv] = null;
    }
    // the hull of the card's region from each row's ends
    var pts = [], area = 0;
    for (y = 0; y < h; y++) { var a = -1, b = -1; for (x = 0; x < w; x++) if (lab[y * w + x] === 2) { if (a < 0) a = x; b = x; area++; } if (a >= 0) { pts.push([a, y]); if (b !== a) pts.push([b, y]); } }
    var frac = area / n;
    if (root.__wphDebug) root.__wphDebug = { frac: frac, bgc: [br, bg, bb] };
    if (frac < 0.06 || frac > 0.985 || pts.length < 6) return null;
    var H = hull(pts);
    // the tightest rectangle's turn, then the corners as the hull's farthest points along its diagonals
    var best = null;
    for (i = 0; i < H.length; i++) {
      var p0 = H[i], p1 = H[(i + 1) % H.length], ang = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]), c = Math.cos(ang), s = Math.sin(ang), u0 = 1e9, u1 = -1e9, v0 = 1e9, v1 = -1e9;
      H.forEach(function (p) { var u = p[0] * c + p[1] * s, v = -p[0] * s + p[1] * c; u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v); });
      var ar = (u1 - u0) * (v1 - v0); if (!best || ar < best.ar) best = { ar: ar, ang: ang };
    }
    var cA = Math.cos(best.ang), sA = Math.sin(best.ang), dirs = [[-1, -1], [1, -1], [1, 1], [-1, 1]], cs = dirs.map(function (d) {
      var bp = null, bv = -1e9; H.forEach(function (p) { var u = p[0] * cA + p[1] * sA, v = -p[0] * sA + p[1] * cA, val = d[0] * u + d[1] * v; if (val > bv) { bv = val; bp = p; } }); return bp;
    });
    var U0 = 1e9, U1 = -1e9, V0 = 1e9, V1 = -1e9;
    H.forEach(function (p) { var u = p[0] * cA + p[1] * sA, v = -p[0] * sA + p[1] * cA; U0 = Math.min(U0, u); U1 = Math.max(U1, u); V0 = Math.min(V0, v); V1 = Math.max(V1, v); });
    var rect = [[U0, V0], [U1, V0], [U1, V1], [U0, V1]].map(function (p) { return [p[0] * cA - p[1] * sA, p[0] * sA + p[1] * cA]; });
    // on a light table a white card's border floods as table, so the flood's word on a line is only taken on a dark one
    G.lab = 0.299 * br + 0.587 * bg + 0.114 * bb < 0.55 ? lab : null;
    return { quad: order(cs), rect: order(rect), frac: frac, bgc: [br, bg, bb] };
  }
  function hull(pts) {
    pts = pts.slice().sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
    function cr(o, a, b) { return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); }
    var lo = [], up = [], i;
    for (i = 0; i < pts.length; i++) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], pts[i]) <= 0) lo.pop(); lo.push(pts[i]); }
    for (i = pts.length - 1; i >= 0; i--) { while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], pts[i]) <= 0) up.pop(); up.push(pts[i]); }
    up.pop(); lo.pop(); return lo.concat(up);
  }
  function order(q) {   // clockwise from top left, in image coordinates
    var cx = 0, cy = 0; q.forEach(function (p) { cx += p[0] / 4; cy += p[1] / 4; });
    var s = q.slice().sort(function (a, b) { return Math.atan2(a[1] - cy, a[0] - cx) - Math.atan2(b[1] - cy, b[0] - cx); });
    // atan2 order from -pi: starts near the left going up through top; find the one with least x+y as the start
    var k = 0; s.forEach(function (p, i) { if (p[0] + p[1] < s[k][0] + s[k][1]) k = i; });
    return s.slice(k).concat(s.slice(0, k));
  }
  function meet(l1, l2) {   // lines as {p: [x, y], d: [dx, dy]}
    var den = l1.d[0] * l2.d[1] - l1.d[1] * l2.d[0]; if (Math.abs(den) < 1e-9) return null;
    var t = ((l2.p[0] - l1.p[0]) * l2.d[1] - (l2.p[1] - l1.p[1]) * l2.d[0]) / den;
    return [l1.p[0] + l1.d[0] * t, l1.p[1] + l1.d[1] * t];
  }
  function dist(a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1]); }
  // Straight edges near one side: [{line, sup, off, pol}], best first
  function sideLines(G, w, h, A, B, depth, outF, inF) {
    var L = dist(A, B), d = [(B[0] - A[0]) / L, (B[1] - A[1]) / L], nrm = [d[1], -d[0]], M = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2];
    // inward a little (the outline can run outside a soft edge), outward far (it can stop at an inner frame line)
    var band = Math.max(4, Math.round(depth * (inF || 0.1))), bout = Math.max(8, Math.round(depth * (outF || 0.24))), NB = band + bout + 1, ANG = [], a;
    for (a = -6; a <= 6.01; a += 0.75) ANG.push(a * Math.PI / 180);
    // for each line, which of SL slots along the side have an edge on it: support is the share of slots covered
    var SL = 48, NA = ANG.length, hit = new Uint8Array(NA * NB * SL), pol = new Float32Array(NA * NB), cnt = new Uint16Array(NA * NB);
    var nA = ANG.map(function (t) { var c = Math.cos(t), s = Math.sin(t); return [nrm[0] * c - nrm[1] * s, nrm[0] * s + nrm[1] * c]; });
    var xs = [A[0], B[0], A[0] + nrm[0] * bout, A[0] - nrm[0] * band, B[0] + nrm[0] * bout, B[0] - nrm[0] * band], ys = [A[1], B[1], A[1] + nrm[1] * bout, A[1] - nrm[1] * band, B[1] + nrm[1] * bout, B[1] - nrm[1] * band];
    var x0 = Math.max(1, Math.floor(Math.min.apply(null, xs)) - 2), x1 = Math.min(w - 2, Math.ceil(Math.max.apply(null, xs)) + 2), y0 = Math.max(1, Math.floor(Math.min.apply(null, ys)) - 2), y1 = Math.min(h - 2, Math.ceil(Math.max.apply(null, ys)) + 2);
    for (var y = y0; y <= y1; y++) for (var x = x0; x <= x1; x++) {
      var i = y * w + x, m = G.mg[i]; if (m < 0.03) continue;
      var rx = x - A[0], ry = y - A[1], t = (rx * d[0] + ry * d[1]) / L; if (t < 0.08 || t > 0.92) continue;
      var s0 = rx * nrm[0] + ry * nrm[1]; if (s0 < -band - 4 || s0 > bout + 4) continue;
      var al = (G.gx[i] * nrm[0] + G.gy[i] * nrm[1]) / m; if (Math.abs(al) < 0.88) continue;
      var mx = x - M[0], my = y - M[1], sl = Math.min(SL - 1, (t * SL) | 0);
      for (var k = 0; k < NA; k++) { var b = Math.round(mx * nA[k][0] + my * nA[k][1]) + band; if (b >= 0 && b < NB) { var ab = k * NB + b; hit[ab * SL + sl] = 1; pol[ab] += al; cnt[ab]++; } }
    }
    var lo = Math.floor(0.08 * SL), hi = Math.ceil(0.92 * SL), span = hi - lo, cov = new Float32Array(NA * NB);
    for (var k1 = 0; k1 < NA; k1++) for (var b1 = 0; b1 < NB; b1++) {
      var c1 = 0;
      for (var q = lo; q < hi; q++) { var o1 = (k1 * NB + b1) * SL + q; if (hit[o1] || (b1 > 0 && hit[o1 - SL]) || (b1 < NB - 1 && hit[o1 + SL])) c1++; }
      cov[k1 * NB + b1] = c1 / span;
    }
    var cand = [];
    for (var k2 = 0; k2 < NA; k2++) for (var b2 = 1; b2 < NB - 1; b2++) {
      var sup = cov[k2 * NB + b2], here = cnt[k2 * NB + b2]; if (sup < 0.3) continue;
      var peak = true;
      for (var dk = -1; dk <= 1 && peak; dk++) for (var db = -2; db <= 2; db++) {
        var kk = k2 + dk, bb = b2 + db; if ((!dk && !db) || kk < 0 || kk >= NA || bb < 1 || bb >= NB - 1) continue;
        var o2 = cov[kk * NB + bb]; if (o2 > sup || (o2 === sup && cnt[kk * NB + bb] > here)) { peak = false; break; }
      }
      if (!peak) continue;
      var po = pol[k2 * NB + b2] / Math.max(1, here), n2 = nA[k2], off = b2 - band;
      var Pl = [M[0] + n2[0] * off, M[1] + n2[1] * off], dl = [-n2[1], n2[0]], tr = 1;
      if (G.lab) {   // does the flood say card inside the line and table outside it? (a table's stripe: table both sides)
        var inC = 0, outB = 0, nn = 0;
        for (var tt = -0.4; tt <= 0.4; tt += 0.05) for (var dd = 2; dd <= 5; dd += 1.5) {
          var ax = Math.round(Pl[0] + dl[0] * L * tt - n2[0] * dd), ay = Math.round(Pl[1] + dl[1] * L * tt - n2[1] * dd), bx = Math.round(Pl[0] + dl[0] * L * tt + n2[0] * dd), by = Math.round(Pl[1] + dl[1] * L * tt + n2[1] * dd);
          if (ax < 0 || ay < 0 || ax >= w || ay >= h) continue; nn++; if (G.lab[ay * w + ax] === 2) inC++;
          if (bx < 0 || by < 0 || bx >= w || by >= h || G.lab[by * w + bx] === 1) outB++;
        }
        tr = nn ? Math.max(0, inC / nn + outB / nn - 1) : 0;
      }
      // how crisp: the steepest step at the line against the whole change across it (a cut edge is crisp, a
      // shadow's edge soft)
      var gs = 0, cs = 0, ns = 0;
      for (var t2 = -0.4; t2 <= 0.4; t2 += 0.04) {
        var cx = Pl[0] + dl[0] * L * t2, cy = Pl[1] + dl[1] * L * t2, gm = 0;
        for (var o3 = -1; o3 <= 1; o3++) { var X3 = Math.round(cx + n2[0] * o3), Y3 = Math.round(cy + n2[1] * o3); if (X3 > 0 && Y3 > 0 && X3 < w && Y3 < h) gm = Math.max(gm, Math.abs(G.gx[Y3 * w + X3] * n2[0] + G.gy[Y3 * w + X3] * n2[1])); }
        var Xa = Math.round(cx - n2[0] * 4), Ya = Math.round(cy - n2[1] * 4), Xb = Math.round(cx + n2[0] * 4), Yb = Math.round(cy + n2[1] * 4);
        if (Xa < 0 || Ya < 0 || Xb < 0 || Yb < 0 || Xa >= w || Xb >= w || Ya >= h || Yb >= h) continue;
        cs += Math.abs(G.L[Ya * w + Xa] - G.L[Yb * w + Xb]); gs += gm; ns++;
      }
      var crisp = ns ? Math.min(1, (gs / ns) / Math.max(0.02, cs / ns) / 0.6) : 1;
      cand.push({ line: { p: Pl, d: dl }, sup: sup, raw: sup, tr: tr, crisp: crisp, off: off, band: bout, pol: po > 0.3 ? 1 : po < -0.3 ? -1 : 0, n: n2 });
    }
    cand.sort(function (p, q) { return q.sup - p.sup; });
    var kept = [];
    cand.forEach(function (c) { if (kept.length < 6 && kept.every(function (k) { return Math.abs(k.off - c.off) >= 3; })) kept.push(c); });
    return kept;
  }
  function pickQuad(sides, w, h, plain) {
    var best = null, idx = [0, 0, 0, 0];
    var outer = sides.map(function (cs) {   // the outermost well supported line on each side
      if (!cs.length) return -1; var mx = Math.max.apply(null, cs.map(function (c) { return c.sup; })), o = -1, ov = -1e9;
      cs.forEach(function (c, i) { if (c.sup >= Math.max(0.6, mx * 0.75) && c.off > ov) { ov = c.off; o = i; } }); return o;
    });
    function rec(s) {
      if (s === 4) {
        var Ls = idx.map(function (k, i) { return sides[i][k].line; }), q = [], i;
        for (i = 0; i < 4; i++) { var p = meet(Ls[(i + 3) % 4], Ls[i]); if (!p) return; if (p[0] < -0.25 * w || p[0] > 1.25 * w || p[1] < -0.25 * h || p[1] > 1.25 * h) return; q.push(p); }
        var top = dist(q[0], q[1]), rt = dist(q[1], q[2]), bt = dist(q[2], q[3]), lf = dist(q[3], q[0]);
        if (Math.min(top, rt, bt, lf) < 0.1 * Math.max(w, h)) return;
        var r = (top + bt) / (rt + lf), rr = Math.min(r, 1 / r), sc = 0;
        for (i = 0; i < 4; i++) { var c = sides[i][idx[i]]; sc += c.sup * (0.65 + 0.35 * (c.tr == null ? 1 : c.tr)) * (0.7 + 0.3 * (c.crisp == null ? 1 : c.crisp)) + (plain ? 0 : (idx[i] === outer[i] ? 0.15 : 0) - 0.2 * Math.min(1, Math.abs(c.off) / c.band)); }
        sc -= 4 * Math.abs(Math.log(rr / CARD));
        // the card is lighter (or darker) than the table all the way round; a shadow's far edge turns the other way
        var pv = idx.map(function (k, i) { return sides[i][k].pol; }), ps = pv.reduce(function (a, b) { return a + b; }, 0);
        if (ps) pv.forEach(function (v) { if (v && v !== Math.sign(ps)) sc -= 0.3; });
        if (!best || sc > best.sc) best = { sc: sc, q: q, pick: idx.slice() };
        return;
      }
      if (!sides[s].length) return;
      for (var k = 0; k < sides[s].length; k++) { idx[s] = k; rec(s + 1); }
    }
    rec(0);
    return best;
  }
  // Pin a side down at the finer size: the edge across the line at many points, then a line through them
  function refineSide(Lm, w, h, line, n, pol, t0p, t1p, R) {
    var pts = [], K = 90;
    function at(x, y) {
      if (x < 0 || y < 0 || x > w - 1.001 || y > h - 1.001) return NaN;
      var xi = x | 0, yi = y | 0, fx = x - xi, fy = y - yi, i = yi * w + xi;
      return (Lm[i] * (1 - fx) + Lm[i + 1] * fx) * (1 - fy) + (Lm[i + w] * (1 - fx) + Lm[i + w + 1] * fx) * fy;
    }
    for (var k = 0; k <= K; k++) {
      var t = 0.07 + 0.86 * k / K, px = t0p[0] + (t1p[0] - t0p[0]) * t, py = t0p[1] + (t1p[1] - t0p[1]) * t, prof = [], s;
      for (s = -R - 1; s <= R + 1; s += 0.5) prof.push(at(px + n[0] * s, py + n[1] * s));
      var f = function (j) { var D = prof[j + 1] - prof[j - 1]; return D !== D ? 0 : pol ? pol * D : Math.abs(D); };
      // the edge nearest the coarse line among the strong ones (not the strongest, which can be a stripe of the table)
      var bv = 0, bi = -1, mid = (prof.length - 1) / 2;
      for (var j = 2; j < prof.length - 2; j++) bv = Math.max(bv, f(j));
      if (bv < 0.04) continue;
      for (j = 2; j < prof.length - 2; j++) { var vj = f(j); if (vj >= bv * 0.6 && vj >= f(j - 1) && vj >= f(j + 1) && (bi < 0 || Math.abs(j - mid) < Math.abs(bi - mid))) bi = j; }
      if (bi < 0) continue;
      var a = f(bi - 1), b = f(bi), c = f(bi + 1), sub = (a - 2 * b + c) ? 0.5 * (a - c) / (a - 2 * b + c) : 0;
      var off = (-R - 1) + (bi + Math.max(-0.5, Math.min(0.5, sub || 0))) * 0.5;
      pts.push([px + n[0] * off, py + n[1] * off]);
    }
    if (pts.length < K * 0.35) return null;
    var use = pts;
    for (var it = 0; it < 3; it++) {
      var ln = fitLine(use); if (!ln) return null;
      var res = pts.map(function (p) { return Math.abs((p[0] - ln.p[0]) * ln.d[1] - (p[1] - ln.p[1]) * ln.d[0]); });
      var mad = median(res.slice()), lim = Math.max(0.8, 2.5 * mad);
      use = pts.filter(function (p, i) { return res[i] <= lim; });
      if (use.length < pts.length * 0.4) { use = pts; break; }
    }
    var fin = fitLine(use); if (fin) fin.n = use.length / (K + 1);
    return fin;
  }
  function fitLine(pts) {
    if (pts.length < 4) return null;
    var mx = 0, my = 0; pts.forEach(function (p) { mx += p[0]; my += p[1]; }); mx /= pts.length; my /= pts.length;
    var sxx = 0, syy = 0, sxy = 0; pts.forEach(function (p) { var a = p[0] - mx, b = p[1] - my; sxx += a * a; syy += b * b; sxy += a * b; });
    var th = 0.5 * Math.atan2(2 * sxy, sxx - syy);
    return { p: [mx, my], d: [Math.cos(th), Math.sin(th)] };
  }
  // the whole search; img any drawable; returns the quad in the image's own pixels
  function find(im) {
    var D = dims(im), k = Math.min(1, 380 / Math.max(D.w, D.h)), wc = drawScaled(im, k), P = planes(pixels(wc));
    var sm = { w: P.w, h: P.h, r: boxBlur(boxBlur(P.r, P.w, P.h, 1), P.w, P.h, 1), g: boxBlur(boxBlur(P.g, P.w, P.h, 1), P.w, P.h, 1), b: boxBlur(boxBlur(P.b, P.w, P.h, 1), P.w, P.h, 1) };
    var G = gradient(sm); G.L = luma(sm); var R = rough(sm, G), q0;
    if (R) q0 = R.quad;
    else { var mw = P.w * 0.06, mh = P.h * 0.06; q0 = [[mw, mh], [P.w - mw, mh], [P.w - mw, P.h - mh], [mw, P.h - mh]]; }
    // edges searched from the outline's sides and from its tightest rectangle's (a part of the card the flood
    // missed bends the outline, never the rectangle), measured from the outline's sides
    function search(q, inF, outF) {
      return [0, 1, 2, 3].map(function (i) {
        var A = q[i], B = q[(i + 1) % 4], depth = (dist(q[(i + 1) % 4], q[(i + 2) % 4]) + dist(q[(i + 3) % 4], q[i])) / 2;
        return sideLines(G, P.w, P.h, A, B, depth, outF, inF);
      });
    }
    function merge(lists, ref) {
      return [0, 1, 2, 3].map(function (i) {
        var A = ref[i], B = ref[(i + 1) % 4], L = dist(A, B), d = [(B[0] - A[0]) / L, (B[1] - A[1]) / L], n0 = [d[1], -d[0]], M0 = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2], all = [];
        lists.forEach(function (S) { S[i].forEach(function (c) {
          var hit = meet(c.line, { p: M0, d: n0 }), off = hit ? (hit[0] - M0[0]) * n0[0] + (hit[1] - M0[1]) * n0[1] : c.off;
          var ang = Math.abs(c.n[0] * n0[1] - c.n[1] * n0[0]), c2 = Object.assign({}, c, { off: off, ang: ang });
          var dup = all.filter(function (o) { return Math.abs(o.off - off) < 2.5 && Math.abs(o.ang - ang) < 0.03; })[0];
          if (!dup) all.push(c2); else if (c2.sup > dup.sup) all[all.indexOf(dup)] = c2;
        }); });
        all.sort(function (p, q) { return q.sup - p.sup; }); all = all.slice(0, 7);
        // no straight edge at all on a side: the outline's own side stands in
        if (!all.length) all.push({ line: { p: A, d: d }, sup: 0.2, off: 0, band: 1, pol: 0, n: n0, none: true });
        return all;
      });
    }
    var sides = merge(R ? [search(q0, 0.1, 0.24), search(R.rect, 0.1, 0.24)] : [search(q0, 0.1, 0.4)], q0);
    if (root.__wphDebug) root.__wphDebug = { k: k, rough: q0, sides: sides, pick: [], frac: R && R.frac };
    var pick = pickQuad(sides, P.w, P.h);
    if (!pick) return { quad: q0.map(function (p) { return [p[0] / k, p[1] / k]; }), found: false, rough: !!R, k: k, lines: null };
    // a second, close look from the four sides chosen: coverage measured along the card's true extent
    // (only for a side whose first choice was weak: a strong side stays as it is)
    var weak = pick.pick.some(function (j, i) { return sides[i][j].sup < 0.7; });
    if (weak) {
      var near = merge([search(pick.q, 0.06, 0.15)], pick.q), s2 = sides.map(function (cs, i) { var c = cs[pick.pick[i]]; return c.sup >= 0.7 ? [c] : near[i].filter(function (x) { return !x.none; }).concat([c]); });
      var p2 = pickQuad(s2, P.w, P.h); if (p2) { pick = p2; sides = s2; }
    }
    var lines = pick.pick.map(function (j, i) { return sides[i][j]; });
    if (root.__wphDebug) root.__wphDebug = { k: k, rough: q0, sides: sides, pick: pick.pick, q: pick.q };
    return { quad: pick.q.map(function (p) { return [p[0] / k, p[1] / k]; }), found: true, k: k, lines: lines, score: pick.sc };
  }

  // ── Straightening ────────────────────────────────────────────────────────
  function homography(src, dst) {   // maps src[i] -> dst[i]
    var A = [], b = [];
    for (var i = 0; i < 4; i++) {
      var x = src[i][0], y = src[i][1], u = dst[i][0], v = dst[i][1];
      A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u);
      A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v);
    }
    for (var c = 0; c < 8; c++) {
      var p = c; for (var r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
      var t = A[c]; A[c] = A[p]; A[p] = t; t = b[c]; b[c] = b[p]; b[p] = t;
      for (r = 0; r < 8; r++) { if (r === c) continue; var f = A[r][c] / A[c][c]; for (var j = c; j < 8; j++) A[r][j] -= f * A[c][j]; b[r] -= f * b[c]; }
    }
    var h = b.map(function (v, i) { return v / A[i][i]; }); h.push(1); return h;
  }
  function warp(id, H, ow, oh, pad) {   // id: source ImageData; H maps card coords to source; out is padded
    var sw = id.width, sh = id.height, s = id.data, W = ow + pad * 2, Hh = oh + pad * 2, out = new ImageData(W, Hh), o = out.data;
    for (var y = 0; y < Hh; y++) {
      var cy = y - pad + 0.5;
      for (var x = 0; x < W; x++) {
        var cx = x - pad + 0.5, z = H[6] * cx + H[7] * cy + 1, sx = (H[0] * cx + H[1] * cy + H[2]) / z - 0.5, sy = (H[3] * cx + H[4] * cy + H[5]) / z - 0.5;
        var j = (y * W + x) * 4, inb = sx >= 0 && sy >= 0 && sx <= sw - 1 && sy <= sh - 1;
        if (sx < 0) sx = 0; if (sy < 0) sy = 0; if (sx > sw - 1.001) sx = sw - 1.001; if (sy > sh - 1.001) sy = sh - 1.001;
        var xi = sx | 0, yi = sy | 0, fx = sx - xi, fy = sy - yi, i = (yi * sw + xi) * 4, i2 = i + sw * 4;
        var w00 = (1 - fx) * (1 - fy), w10 = fx * (1 - fy), w01 = (1 - fx) * fy, w11 = fx * fy;
        o[j] = s[i] * w00 + s[i + 4] * w10 + s[i2] * w01 + s[i2 + 4] * w11;
        o[j + 1] = s[i + 1] * w00 + s[i + 5] * w10 + s[i2 + 1] * w01 + s[i2 + 5] * w11;
        o[j + 2] = s[i + 2] * w00 + s[i + 6] * w10 + s[i2 + 2] * w01 + s[i2 + 6] * w11;
        o[j + 3] = inb ? 255 : 0;
      }
    }
    return out;
  }

  // ── Corners: square cut or rounded ────────────────────────────────────────
  // On the straightened card with its margin: the table's color just outside each corner, the card's own edge color
  // just inside, and along rays into the corner where the card begins. A corner of radius R begins at
  // R((c+s) - sqrt((c+s)^2 - 1)) along a ray at angle (c, s) from the corner point.
  function cornerShape(id, ow, oh, pad) {
    var W = id.width, d = id.data;
    function px(x, y) { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= W || y >= id.height) return null; var i = (y * W + x) * 4; return d[i + 3] ? [d[i] / 255, d[i + 1] / 255, d[i + 2] / 255] : null; }
    function med(list) { list = list.filter(Boolean); if (list.length < 5) return null; return [0, 1, 2].map(function (c) { return median(list.map(function (p) { return p[c]; })); }); }
    function cd(a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]); }
    var Rs = [], sure = 0, per = [];
    [[0, 0, 1, 1], [ow, 0, -1, 1], [ow, oh, -1, -1], [0, oh, 1, -1]].forEach(function (C) {
      var cx = C[0] + pad, cy = C[1] + pad, sx = C[2], sy = C[3], out = [], inn = [], t, k;
      for (t = 0.05; t <= 0.13; t += 0.004) {
        for (k = 0.45; k <= 0.85; k += 0.2) { out.push(px(cx + sx * t * ow, cy - sy * pad * k)); out.push(px(cx - sx * pad * k, cy + sy * t * oh)); }
        for (k = 0.008; k <= 0.016; k += 0.004) { inn.push(px(cx + sx * t * ow, cy + sy * k * oh)); inn.push(px(cx + sx * k * ow, cy + sy * t * oh)); }
      }
      var bgc = med(out), cc = med(inn);
      if (!bgc || !cc || cd(bgc, cc) < 0.08) { per.push(null); return; }
      var rays = [];
      for (var deg = 30; deg <= 60; deg += 5) {
        var c = Math.cos(deg * Math.PI / 180), s = Math.sin(deg * Math.PI / 180), run = 0, hit = null;
        for (t = -4; t <= ow * 0.15; t += 0.5) {
          var p = px(cx + sx * c * t, cy + sy * s * t); if (!p) { run = 0; continue; }
          if (cd(p, cc) < cd(p, bgc)) { if (++run >= 4) { hit = t - 1.5; break; } } else run = 0;
        }
        if (hit === null) continue;
        var f = (c + s) - Math.sqrt((c + s) * (c + s) - 1); rays.push(Math.max(0, hit) / f);
      }
      if (rays.length < 4) { per.push(null); return; }
      var R = median(rays); per.push(R / ow); Rs.push(R / ow); sure++;
    });
    var R = Rs.length ? median(Rs) : 0;
    // a worn square corner measures up to about 4% of the width and no two wear alike; a die-cut round corner is 4
    // to 6%, and the same at every corner
    var lo = Math.min.apply(null, Rs.concat([1])), hi = Math.max.apply(null, Rs.concat([0]));
    var round = Rs.length >= 3 && R >= 0.04 && lo >= 0.03 && hi / Math.max(lo, 1e-3) < 1.5;
    return { corners: round ? 'round' : 'square', radius: round ? Math.round(R * 1000) / 1000 : 0, sure: sure >= 2, each: per };
  }

  // ── What kind of card face this is ───────────────────────────────────────
  function stats(P) {   // a coarse look at the whole face
    var w = P.w, h = P.h, step = 3, hist = {}, n = 0, all = [];
    for (var y = Math.round(h * 0.015); y < h * 0.985; y += step) for (var x = Math.round(w * 0.015); x < w * 0.985; x += step) {
      var i = y * w + x, k = (P.r[i] * 7.99 | 0) * 64 + (P.g[i] * 7.99 | 0) * 8 + (P.b[i] * 7.99 | 0);
      hist[k] = (hist[k] || 0) + 1; n++; all.push(i);
    }
    var bins = Object.keys(hist).map(function (k) { return hist[k]; }).sort(function (a, b) { return b - a; }), cum = 0, cover = 0;
    for (var j = 0; j < bins.length && cum < 0.85 * n; j++) { cum += bins[j]; cover++; }
    return { cover: cover, n: n, all: all };
  }
  // the dominant flat color (a back's stock or panel): the mean of the pixels near the commonest color
  function dominant(P, sample) {
    var hist = {}, top = null;
    sample.forEach(function (i) { var k = (P.r[i] * 11.99 | 0) * 144 + (P.g[i] * 11.99 | 0) * 12 + (P.b[i] * 11.99 | 0); hist[k] = (hist[k] || 0) + 1; if (top === null || hist[k] > hist[top]) top = k; });
    var c = [((top / 144 | 0) + 0.5) / 12, (((top / 12 | 0) % 12) + 0.5) / 12, ((top % 12) + 0.5) / 12];
    for (var it = 0; it < 3; it++) {
      var s = [0, 0, 0], m = 0;
      sample.forEach(function (i) { if (Math.hypot(P.r[i] - c[0], P.g[i] - c[1], P.b[i] - c[2]) < 0.09) { s[0] += P.r[i]; s[1] += P.g[i]; s[2] += P.b[i]; m++; } });
      if (!m) break; c = [s[0] / m, s[1] / m, s[2] / m]; c.share = m / sample.length;
    }
    return c;
  }
  function borderOf(P) {
    var w = P.w, h = P.h, pts = [], step = 2;
    for (var t = 0.03; t < 0.97; t += 0.004) for (var k = 0.012; k <= 0.03; k += 0.006) {
      pts.push(Math.round(h * k) * w + Math.round(w * t), Math.round(h * (1 - k)) * w + Math.round(w * t), Math.round(h * t) * w + Math.round(w * k), Math.round(h * t) * w + Math.round(w * (1 - k)));
    }
    var c = [0, 1, 2].map(function (j) { var a = [P.r, P.g, P.b][j]; return median(pts.map(function (i) { return a[i]; })); });
    var near = pts.filter(function (i) { return Math.hypot(P.r[i] - c[0], P.g[i] - c[1], P.b[i] - c[2]) < 0.1; }).length / pts.length;
    var hs = hsv(c[0], c[1], c[2]), L = 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
    // a white border under a lamp turns cream (warm hues, up to about a third saturated); a printed colored border
    // is more saturated than that, or another hue
    var warm = hs[0] >= 15 && hs[0] <= 65 && hs[1] < 0.33 && L > 0.55;
    var kind = near < 0.62 ? 'none' : ((hs[1] < 0.24 && L > 0.42) || warm) ? (L > 0.6 ? 'white' : 'gray') : 'color';
    return { kind: kind, rgb: c, even: near, pts: pts };
  }

  // ── Holograms and foil ───────────────────────────────────────────────────
  // A coarse grid over the card. A hologram's cell has many bright, saturated hues side by side (the rainbow); foil
  // has specular glints far brighter than the card's own white packed into fine detail. A lone cell is left out.
  function findHolo(P, cols, rows, white) {
    var w = P.w, h = P.h, cw = w / cols, chh = h / rows, bits = new Uint8Array(cols * rows), wl = white || 0.85;
    for (var gy = 0; gy < rows; gy++) for (var gx = 0; gx < cols; gx++) {
      var x0 = Math.round(gx * cw), x1 = Math.round((gx + 1) * cw), y0 = Math.round(gy * chh), y1 = Math.round((gy + 1) * chh);
      var hb = new Float32Array(12), n = 0, sat = 0, spec = 0, tot = 0, hi = 0, sumL = 0, sumL2 = 0;
      for (var y = y0; y < y1; y += 2) for (var x = x0; x < x1; x += 2) {
        var i = y * w + x, v = hsv(P.r[i], P.g[i], P.b[i]); tot++;
        var L = 0.299 * P.r[i] + 0.587 * P.g[i] + 0.114 * P.b[i]; sumL += L; sumL2 += L * L;
        if (v[1] > 0.3 && v[2] > 0.45) { hb[(v[0] / 30) | 0]++; n++; }
        if (v[2] > Math.max(0.985, Math.min(0.995, wl * 1.06)) && v[1] < 0.18) spec++;   // a glint blows the photo out; paper never does
        if (x + 2 < x1) { var j = i + 2; hi += Math.abs(L - (0.299 * P.r[j] + 0.587 * P.g[j] + 0.114 * P.b[j])); }
      }
      var cov = 0; for (var b = 0; b < 12; b++) if (hb[b] > 0.06 * n) cov++;
      var frac = n / tot, sd = Math.sqrt(Math.max(0, sumL2 / tot - (sumL / tot) * (sumL / tot))), sf = spec / tot, hp = hi / tot;
      var rainbow = frac > 0.7 && cov >= 5, foil = sf > 0.04 && sf < 0.5 && sd > 0.16 && hp > 0.12;
      if (rainbow || foil) bits[gy * cols + gx] = 1;
    }
    // drop lone cells, fill single holes
    var keep = new Uint8Array(bits.length);
    for (var y2 = 0; y2 < rows; y2++) for (var x2 = 0; x2 < cols; x2++) {
      var nb = 0; for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; var X = x2 + dx, Y = y2 + dy; if (X >= 0 && Y >= 0 && X < cols && Y < rows && bits[Y * cols + X]) nb++; }
      var me = bits[y2 * cols + x2]; keep[y2 * cols + x2] = me ? (nb >= 2 ? 1 : 0) : (nb >= 6 ? 1 : 0);
    }
    // a hologram is one patch: its edge cells are only partly rainbow, so a patch of four or more grows by a cell
    var H0 = mkHolo(cols, rows, keep), grow = new Uint8Array(keep);
    H0.boxes.forEach(function (bx) {
      if (bx.cells < 4) return;
      var X0 = Math.round(bx.x * cols), Y0 = Math.round(bx.y * rows), X1 = X0 + Math.round(bx.w * cols) - 1, Y1 = Y0 + Math.round(bx.h * rows) - 1;
      for (var y3 = Math.max(0, Y0 - 1); y3 <= Math.min(rows - 1, Y1 + 1); y3++) for (var x3 = Math.max(0, X0 - 1); x3 <= Math.min(cols - 1, X1 + 1); x3++) {
        var near = 0; for (var dy2 = -1; dy2 <= 1; dy2++) for (var dx2 = -1; dx2 <= 1; dx2++) { var X2 = x3 + dx2, Y2 = y3 + dy2; if (X2 >= 0 && Y2 >= 0 && X2 < cols && Y2 < rows && keep[Y2 * cols + X2]) near = 1; }
        if (near) grow[y3 * cols + x3] = 1;
      }
    });
    return mkHolo(cols, rows, grow);
  }
  function mkHolo(cols, rows, bits) {
    var s = ''; for (var i = 0; i < bits.length; i++) s += bits[i] ? '1' : '0';
    var seen = new Uint8Array(bits.length), boxes = [];
    for (var j = 0; j < bits.length; j++) {
      if (!bits[j] || seen[j]) continue;
      var st = [j], x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1, n = 0; seen[j] = 1;
      while (st.length) { var c = st.pop(), x = c % cols, y = (c / cols) | 0; n++; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
        [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) { var X = x + d[0], Y = y + d[1], k = Y * cols + X; if (X >= 0 && Y >= 0 && X < cols && Y < rows && bits[k] && !seen[k]) { seen[k] = 1; st.push(k); } }); }
      boxes.push({ x: x0 / cols, y: y0 / rows, w: (x1 - x0 + 1) / cols, h: (y1 - y0 + 1) / rows, cells: n });
    }
    return { cols: cols, rows: rows, bits: s, boxes: boxes };
  }
  function holoField(holo, w, h) {   // the grid drawn up to the card's size, soft across a cell
    if (!holo || holo.bits.indexOf('1') < 0) return null;
    var cols = holo.cols, rows = holo.rows, m = new Float32Array(w * h), cw = w / cols, ch = h / rows;
    function at(X, Y) { X = Math.max(0, Math.min(cols - 1, X)); Y = Math.max(0, Math.min(rows - 1, Y)); return holo.bits.charCodeAt(Y * cols + X) === 49 ? 1 : 0; }
    for (var y = 0; y < h; y++) {
      var fy = y / ch - 0.5, Y = Math.floor(fy), ty = fy - Y;
      for (var x = 0; x < w; x++) {
        var fx = x / cw - 0.5, X = Math.floor(fx), tx = fx - X;
        var v = (at(X, Y) * (1 - tx) + at(X + 1, Y) * tx) * (1 - ty) + (at(X, Y + 1) * (1 - tx) + at(X + 1, Y + 1) * tx) * ty;
        m[y * w + x] = Math.min(1, v * 1.6);   // reaches 1 inside a marked cell's soft edge
      }
    }
    return m;
  }

  // ── Corrections ──────────────────────────────────────────────────────────
  function soft(v) { return v < 0.9 ? v : 0.9 + 0.1 * (1 - Math.exp(-(v - 0.9) / 0.1)); }
  // the light across the card as a smooth surface (a + bx + cy + dxy + ex^2 + fy^2) through samples [x, y, L]
  function fitField(S) {
    if (S.length < 12) return null;
    var M = [], v = [], i, j, k;
    for (i = 0; i < 6; i++) { M.push([0, 0, 0, 0, 0, 0]); v.push(0); }
    S.forEach(function (s) { var f = [1, s[0], s[1], s[0] * s[1], s[0] * s[0], s[1] * s[1]]; for (i = 0; i < 6; i++) { v[i] += f[i] * s[2]; for (j = 0; j < 6; j++) M[i][j] += f[i] * f[j]; } });
    for (i = 0; i < 6; i++) M[i][i] += 1e-3;
    for (i = 0; i < 6; i++) { var p = i; for (k = i + 1; k < 6; k++) if (Math.abs(M[k][i]) > Math.abs(M[p][i])) p = k; var t = M[i]; M[i] = M[p]; M[p] = t; t = v[i]; v[i] = v[p]; v[p] = t;
      for (k = 0; k < 6; k++) { if (k === i) continue; var f2 = M[k][i] / M[i][i]; for (j = i; j < 6; j++) M[k][j] -= f2 * M[i][j]; v[k] -= f2 * v[i]; } }
    var c = v.map(function (x, q) { return x / M[q][q]; });
    return function (x, y) { return c[0] + c[1] * x + c[2] * y + c[3] * x * y + c[4] * x * x + c[5] * y * y; };
  }
  // samples of the light: patches whose pixels are near the reference color (a border, a stock)
  function lightSamples(P, ref, where) {
    var w = P.w, h = P.h, S = [], step = 6;
    where.forEach(function (c) {
      var xs = 0, n = 0, lsum = 0;
      for (var dy = -step; dy <= step; dy += 2) for (var dx = -step; dx <= step; dx += 2) {
        var x = Math.round(c[0] * w + dx), y = Math.round(c[1] * h + dy); if (x < 0 || y < 0 || x >= w || y >= h) continue;
        var i = y * w + x; xs++;
        if (Math.hypot(P.r[i] - ref[0] * c[2], P.g[i] - ref[1] * c[2], P.b[i] - ref[2] * c[2]) < 0.12 + 0.1 * Math.abs(1 - c[2]) || chromaNear(P, i, ref)) { lsum += 0.299 * P.r[i] + 0.587 * P.g[i] + 0.114 * P.b[i]; n++; }
      }
      if (n > xs * 0.5) S.push([c[0], c[1], lsum / n]);
    });
    return S;
  }
  function chromaNear(P, i, ref) {   // same color, any brightness (a shadow across the stock)
    var s = P.r[i] + P.g[i] + P.b[i], t = ref[0] + ref[1] + ref[2]; if (s < 0.15) return false;
    return Math.abs(P.r[i] / s - ref[0] / t) + Math.abs(P.g[i] / s - ref[1] / t) < 0.035;
  }
  function correct(P, o) {
    var w = P.w, h = P.h, n = w * h, i, x, y, info = {};
    var orig = { r: P.r.slice(), g: P.g.slice(), b: P.b.slice() };
    var st = stats(P), border = borderOf(P), dom = dominant(P, st.all), domL = 0.299 * dom[0] + 0.587 * dom[1] + 0.114 * dom[2];
    var hsD = hsv(dom[0], dom[1], dom[2]);
    // A cardboard back: few flat inks and the stock showing between them; matte (no glints brighter than the stock's
    // own lightest), and not bright white paper. Its stock and inks keep their own hue whatever they are.
    // how many different inks: hue families among the pixels with real color (a photo has many, a cardboard back one
    // to three: its stock and a red, green, orange or blue ink or panel)
    var hb = new Float32Array(12), hn = 0;
    st.all.forEach(function (i2) { var v = hsv(P.r[i2], P.g[i2], P.b[i2]); if (v[1] > 0.28 && v[2] > 0.2) { hb[(v[0] / 30) | 0]++; hn++; } });
    var hues = 0; for (var hk = 0; hk < 12; hk++) if (hb[hk] > Math.max(0.04 * hn, 0.004 * st.all.length)) hues++;
    // two neighboring families are one ink (an orange box reads as red and orange)
    var runs = 0; for (hk = 0; hk < 12; hk++) { var on = hb[hk] > Math.max(0.04 * hn, 0.004 * st.all.length), prevOn = hb[(hk + 11) % 12] > Math.max(0.04 * hn, 0.004 * st.all.length); if (on && !prevOn) runs++; }
    if (hues === 12) runs = 1;
    info.hues = hues;
    // and how much of the face is flat color: the few commonest colors cover most of a printed back, not of a photo
    var cb = {}; st.all.forEach(function (i2) { var k2 = (P.r[i2] * 9.99 | 0) * 100 + (P.g[i2] * 9.99 | 0) * 10 + (P.b[i2] * 9.99 | 0); cb[k2] = (cb[k2] || 0) + 1; });
    var tops = Object.keys(cb).map(function (k2) { return cb[k2]; }).sort(function (a, b) { return b - a; }).slice(0, 6).reduce(function (a, b) { return a + b; }, 0) / st.all.length;
    info.flatShare = Math.round(tops * 100) / 100;
    // A back is taken as printed on cardboard (every hue kept) unless it is plainly a color photograph: four or more
    // hue families. The flat share is reported, but a phone photo's uneven light spreads it too much to decide on.
    var flat = runs <= 3 && hues <= 3 && (dom.share || 0) > 0.08;
    var tex = 0, tn = 0;
    for (var s = 0; s < st.all.length; s += 7) { i = st.all[s]; if (i < w || i > n - w - 1 || Math.hypot(P.r[i] - dom[0], P.g[i] - dom[1], P.b[i] - dom[2]) > 0.08) continue;
      var L0 = 0.299 * P.r[i] + 0.587 * P.g[i] + 0.114 * P.b[i], La = (0.299 * (P.r[i - 1] + P.r[i + 1] + P.r[i - w] + P.r[i + w]) + 0.587 * (P.g[i - 1] + P.g[i + 1] + P.g[i - w] + P.g[i + w]) + 0.114 * (P.b[i - 1] + P.b[i + 1] + P.b[i - w] + P.b[i + w])) / 4; tex += Math.abs(L0 - La); tn++; }
    tex = tn ? tex / tn : 0;
    var whitePaper = domL > 0.8 && hsD[1] < 0.12;
    var kind = o.side === 'back' && flat && !whitePaper ? 'cardboard' : o.side === 'back' && flat ? 'printed' : 'front';
    info.kind = kind; info.texture = Math.round(tex * 1000) / 1000; info.inks = st.cover;
    var holo = o.holo || findHolo(P, w > h ? GR : GC, w > h ? GC : GR, border.kind === 'white' ? 0.299 * border.rgb[0] + 0.587 * border.rgb[1] + 0.114 * border.rgb[2] : 0.85);
    info.holo = holo;
    var hm = holoField(holo, w, h);
    // glare: blown out, near neutral, outside any hologram
    var blown = 0, bt = 0; for (s = 0; s < st.all.length; s++) { i = st.all[s]; if (hm && hm[i] > 0.5) continue; bt++; if (P.r[i] > 0.985 && P.g[i] > 0.985 && P.b[i] > 0.985) blown++; }
    info.glare = bt ? Math.round(blown / bt * 1000) / 1000 : 0;
    info.border = { kind: border.kind, rgb: border.rgb.map(function (v) { return Math.round(v * 255); }) };

    if (kind === 'cardboard') {
      info.stock = dom.map(function (v) { return Math.round(v * 255); });
      // even the light across the stock (brightness only), then lift the inks away from the stock, hue kept
      var where = []; for (var gy = 0.04; gy < 0.97; gy += 0.06) for (var gx = 0.04; gx < 0.97; gx += 0.06) where.push([gx, gy, 1]);
      var F = fitField(lightSamples(P, dom, where).filter(function (s) { return true; }));
      var Ls = domL;
      for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
        i = y * w + x; var r = P.r[i], g = P.g[i], b = P.b[i], L = 0.299 * r + 0.587 * g + 0.114 * b;
        var k = 1; if (F) { var f = F(x / w, y / h); if (f > 0.05) k = Math.max(0.78, Math.min(1.3, Ls / f)); k = 1 + (k - 1) * 0.85; }
        L *= k; var Lt = L < Ls ? Ls - (Ls - L) * 1.18 : Ls + (L - Ls) * 1.08; Lt = Math.max(0.01, Lt);
        var q = Lt / Math.max(0.004, L) * k, R2 = r * q, G2 = g * q, B2 = b * q, mx = Math.max(R2, G2, B2);
        if (mx > 1) { R2 /= mx; G2 /= mx; B2 /= mx; }
        P.r[i] = R2; P.g[i] = G2; P.b[i] = B2;
      }
    } else {
      // white balance and brightness
      var gain = [1, 1, 1], ref = null;
      var paper = [1, 0.988, 0.962];   // card stock is never a pure screen white
      if (kind === 'printed') ref = dom;
      else if (border.kind === 'white' || border.kind === 'gray') ref = border.rgb;
      else {   // any white the card has: its brightest near-neutral pixels
        var cand = st.all.filter(function (i2) { if (hm && hm[i2] > 0.3) return false; var v = hsv(P.r[i2], P.g[i2], P.b[i2]); return v[1] < 0.22 && v[2] > 0.5 && v[2] < 0.985; });
        if (cand.length > st.all.length * 0.006) {
          cand.sort(function (a, b) { return (P.r[b] + P.g[b] + P.b[b]) - (P.r[a] + P.g[a] + P.b[a]); });
          var tk = cand.slice(0, Math.max(10, cand.length * 0.3 | 0)), sr = 0, sg = 0, sb = 0;
          tk.forEach(function (i2) { sr += P.r[i2]; sg += P.g[i2]; sb += P.b[i2]; }); ref = [sr / tk.length, sg / tk.length, sb / tk.length]; info.whiteRef = 'card';
        }
      }
      if (ref) {
        var Lr = 0.299 * ref[0] + 0.587 * ref[1] + 0.114 * ref[2], tgt = border.kind === 'gray' ? Math.min(0.8, Math.max(Lr, 0.62)) : 0.9;
        var bright = Math.max(0.85, Math.min(1.6, tgt / Lr));
        gain = [0, 1, 2].map(function (c) { return Math.max(0.6, Math.min(1.9, Lr / ref[c] * paper[c] * bright)); });
      } else {   // a gentle gray world: half way toward the card's average being neutral
        var mr = 0, mg = 0, mb = 0; st.all.forEach(function (i2) { mr += P.r[i2]; mg += P.g[i2]; mb += P.b[i2]; }); mr /= st.all.length; mg /= st.all.length; mb /= st.all.length;
        var mL = (mr + mg + mb) / 3; gain = [mL / mr, mL / mg, mL / mb].map(function (g2) { return 1 + (g2 - 1) * 0.5; });
        var lum = st.all.map(function (i2) { return 0.299 * P.r[i2] + 0.587 * P.g[i2] + 0.114 * P.b[i2]; }).sort(function (a, b) { return a - b; }), p99 = lum[Math.floor(lum.length * 0.99)];
        var bk = Math.max(1, Math.min(1.35, 0.95 / p99)); gain = gain.map(function (g2) { return g2 * bk; }); info.whiteRef = 'grayworld';
      }
      info.gain = gain.map(function (g2) { return Math.round(g2 * 1000) / 1000; });
      // the light across a bordered card, from its border
      var F2 = null;
      if (border.kind !== 'none' && border.kind !== 'color' || kind === 'printed') {
        var pts = []; for (var t = 0.03; t <= 0.97; t += 0.047) { pts.push([t, 0.021, 1], [t, 0.979, 1], [0.021, t, 1], [0.979, t, 1]); }
        if (kind === 'printed') for (var a2 = 0.1; a2 < 0.95; a2 += 0.1) for (var b2 = 0.1; b2 < 0.95; b2 += 0.1) pts.push([a2, b2, 1]);
        F2 = fitField(lightSamples(P, kind === 'printed' ? dom : border.rgb, pts));
      }
      var Lref = ref ? 0.299 * ref[0] + 0.587 * ref[1] + 0.114 * ref[2] : 0;
      for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
        i = y * w + x; var e = 1;
        if (F2) { var f3 = F2(x / w, y / h); if (f3 > 0.05) e = 1 + (Math.max(0.8, Math.min(1.25, Lref / f3)) - 1) * 0.8; }
        P.r[i] = soft(P.r[i] * gain[0] * e); P.g[i] = soft(P.g[i] * gain[1] * e); P.b[i] = soft(P.b[i] * gain[2] * e);
      }
    }
    // a light sharpen on brightness (a 1px unsharp mask), then the hologram's own pixels put back as they were
    var Lp = luma(P), Lb = boxBlur(Lp, w, h, 1), amt = kind === 'cardboard' ? 0.25 : 0.35;
    for (i = 0; i < n; i++) {
      var dt = (Lp[i] - Lb[i]) * amt, m = hm ? hm[i] : 0;
      var R3 = P.r[i] + dt, G3 = P.g[i] + dt, B3 = P.b[i] + dt;
      P.r[i] = R3 * (1 - m) + orig.r[i] * m; P.g[i] = G3 * (1 - m) + orig.g[i] * m; P.b[i] = B3 * (1 - m) + orig.b[i] * m;
    }
    return info;
  }
  function toImageData(P) {
    var n = P.w * P.h, id = new ImageData(P.w, P.h), d = id.data;
    for (var i = 0, j = 0; i < n; i++, j += 4) { d[j] = P.r[i] * 255 + 0.5; d[j + 1] = P.g[i] * 255 + 0.5; d[j + 2] = P.b[i] * 255 + 0.5; d[j + 3] = 255; }
    return id;
  }
  function turnCanvas(c, q) {
    q = ((q || 0) % 4 + 4) % 4; if (!q) return c;
    var o = canvas(q % 2 ? c.height : c.width, q % 2 ? c.width : c.height), x = o.getContext('2d');
    x.translate(o.width / 2, o.height / 2); x.rotate(q * Math.PI / 2); x.drawImage(c, -c.width / 2, -c.height / 2); return o;
  }
  function turnHolo(holo, q) {
    q = ((q || 0) % 4 + 4) % 4; if (!q || !holo) return holo;
    var cols = holo.cols, rows = holo.rows, b = holo.bits, out, nc, nr;
    for (var t = 0; t < q; t++) {   // a quarter turn clockwise
      nc = rows; nr = cols; out = new Uint8Array(nc * nr);
      for (var y = 0; y < rows; y++) for (var x = 0; x < cols; x++) out[x * nc + (rows - 1 - y)] = b.charCodeAt(y * cols + x) === 49 ? 1 : 0;
      var h2 = mkHolo(nc, nr, out); cols = nc; rows = nr; b = h2.bits; holo = h2;
    }
    return holo;
  }

  // ── The whole cleaning ───────────────────────────────────────────────────
  function detect(src) {
    return load(src).then(function (im) { var D = dims(im), f = find(im); return { quad: f.quad, found: f.found, cut: cutOf(f.quad, D), w: D.w, h: D.h }; });
  }
  function cutOf(q, D) { return q.some(function (p) { return p[0] < -1 || p[1] < -1 || p[0] > D.w + 1 || p[1] > D.h + 1; }); }
  function clean(src, o) {
    o = o || {}; var t0 = (root.performance || Date).now();
    return load(src).then(function (im) {
      var D = dims(im), res = { side: o.side || 'front' }, card, padded = null, ow, oh;
      if (o.straight) {
        var up = D.h >= D.w; ow = up ? OW : OH; oh = up ? OH : OW;
        card = canvas(ow, oh); var cx = ctx2(card); cx.imageSmoothingQuality = 'high'; cx.drawImage(im, 0, 0, ow, oh);
        res.found = true; res.cut = false; res.quad = [[0, 0], [D.w, 0], [D.w, D.h], [0, D.h]];
      } else {
        var f = find(im), q = f.quad;
        var top = (dist(q[0], q[1]) + dist(q[2], q[3])) / 2, side = (dist(q[1], q[2]) + dist(q[3], q[0])) / 2, wide = top > side;
        ow = wide ? OH : OW; oh = wide ? OW : OH;
        // the photo at the size that gives the card a little more than its output size, then each side pinned down
        var m = Math.min(1, 1.2 * Math.max(ow, oh) / Math.max(top, side)), mid = drawScaled(im, m), mid_id = pixels(mid), MP = planes(mid_id), Lm = luma(MP);
        var qm = q.map(function (p) { return [p[0] * m, p[1] * m]; });
        if (f.found) {
          var lines = [0, 1, 2, 3].map(function (i) {
            // twice: first across about five coarse pixels, then close in on the line found
            var A = qm[i], B = qm[(i + 1) % 4], c = f.lines[i], r = null;
            [Math.max(4, 5 * m / f.k), Math.max(2.5, 1.2 * m / f.k)].forEach(function (R, pass) {
              var a = A, b = B;
              if (pass && r) { var pr = function (p) { var t = (p[0] - r.p[0]) * r.d[0] + (p[1] - r.p[1]) * r.d[1]; return [r.p[0] + r.d[0] * t, r.p[1] + r.d[1] * t]; }; a = pr(A); b = pr(B); }
              var r2 = refineSide(Lm, mid.width, mid.height, null, c.n, c.pol, a, b, R);
              if (r2) { var dd = r2.d; if (dd[0] * (B[0] - A[0]) + dd[1] * (B[1] - A[1]) < 0) r2.d = [-dd[0], -dd[1]]; r = r2; }
            });
            return r || { p: A, d: [(B[0] - A[0]) / dist(A, B), (B[1] - A[1]) / dist(A, B)] };
          });
          var q2 = []; for (var i = 0; i < 4; i++) { var p = meet(lines[(i + 3) % 4], lines[i]); q2.push(p && dist(p, qm[i]) < 0.05 * Math.max(top, side) * m ? p : qm[i]); }
          qm = q2;
        }
        res.found = f.found; res.quad = qm.map(function (p) { return [Math.round(p[0] / m * 10) / 10, Math.round(p[1] / m * 10) / 10]; }); res.cut = cutOf(res.quad, D);
        var Hm = homography([[0, 0], [ow, 0], [ow, oh], [0, oh]], qm);
        padded = warp(mid_id, Hm, ow, oh, PAD);
        var pc = canvas(padded.width, padded.height); pc.getContext('2d').putImageData(padded, 0, 0);
        card = canvas(ow, oh); card.getContext('2d').drawImage(pc, PAD, PAD, ow, oh, 0, 0, ow, oh);
      }
      var shape = padded ? cornerShape(padded, ow, oh, PAD) : { corners: o.corners || 'square', radius: o.radius || 0, sure: false };
      res.corners = shape.corners; res.radius = shape.radius; res.cornerSure = shape.sure; res.cornerEach = shape.each;
      var P = planes(pixels(card)), info = correct(P, { side: res.side, holo: o.holo || null });
      Object.keys(info).forEach(function (k) { res[k] = info[k]; });
      var outc = canvas(ow, oh); outc.getContext('2d').putImageData(toImageData(P), 0, 0);
      var turned = turnCanvas(outc, o.turn), rawT = turnCanvas(card, o.turn);
      if (o.turn) res.holo = turnHolo(res.holo, o.turn);
      res.w = turned.width; res.h = turned.height;
      return Promise.all([encode(turned, o.type, 0.9), o.keepRaw === false ? null : encode(rawT, o.type, 0.92)]).then(function (b) {
        res.blob = b[0]; res.raw = b[1]; res.type = b[0] && b[0].type; res.url = b[0] ? URL.createObjectURL(b[0]) : null;
        res.ms = Math.round((root.performance || Date).now() - t0);
        return res;
      });
    });
  }
  function record(c) {
    var meta = { w: c.w, h: c.h, side: c.side, kind: c.kind, corners: c.corners, radius: c.radius, holo: c.holo };
    if (c.url && /^data:/.test(c.url)) { meta.url = c.url; return Promise.resolve(meta); }
    return blobToData(c.blob).then(function (u) { meta.url = u; return meta; });
  }

  // ── Showing a card ───────────────────────────────────────────────────────
  var LIVE = [], TILT = { on: false, asked: false, x: 0, y: 0, base: null }, RAF = 0;
  function calm() { try { return root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } }
  function maskURL(holo) {
    var c = canvas(holo.cols, holo.rows), x = c.getContext('2d'), id = x.createImageData(holo.cols, holo.rows);
    for (var i = 0; i < holo.bits.length; i++) { var v = holo.bits.charCodeAt(i) === 49 ? 255 : 0; id.data[i * 4] = id.data[i * 4 + 1] = id.data[i * 4 + 2] = 255; id.data[i * 4 + 3] = v; }
    x.putImageData(id, 0, 0); return c.toDataURL('image/png');
  }
  function show(el, c, opt) {
    opt = opt || {};
    var w = c.w || OW, h = c.h || OH, r = (c.corners === 'round' ? c.radius : 0.012) * 100;
    var box = document.createElement('div');
    box.className = 'wph' + (c.corners === 'round' ? ' round' : '');
    box.style.aspectRatio = w + ' / ' + h;
    box.style.setProperty('--wph-r', r.toFixed(2) + '% / ' + (r * w / h).toFixed(2) + '%');
    var img = document.createElement('img'); img.className = 'wph-img'; img.alt = opt.alt || ''; img.decoding = 'async'; img.src = c.url; img.draggable = false;
    box.appendChild(img);
    var live = null;
    if (c.holo && c.holo.bits && c.holo.bits.indexOf('1') >= 0) {
      var hl = document.createElement('div'), mu = 'url("' + maskURL(c.holo) + '")';
      hl.className = 'wph-holo'; hl.style.webkitMaskImage = mu; hl.style.maskImage = mu;
      var sh = document.createElement('i'); sh.className = 'wph-sheen'; var gl = document.createElement('i'); gl.className = 'wph-glint';
      hl.appendChild(sh); hl.appendChild(gl); box.appendChild(hl);
      live = { box: box, sh: sh, gl: gl, x: 0.5, y: 0.5, tx: 0.5, ty: 0.5, ptr: false, last: '' };
      box.addEventListener('pointermove', function (e) { var b = box.getBoundingClientRect(); live.tx = (e.clientX - b.left) / b.width; live.ty = (e.clientY - b.top) / b.height; live.ptr = true; wake(); });
      box.addEventListener('pointerleave', function () { live.ptr = false; live.tx = 0.5; live.ty = 0.5; wake(); });
      box.addEventListener('click', function () { ask(); });
      LIVE.push(live); listenTilt(); place(live, true);
    }
    var edge = document.createElement('div'); edge.className = 'wph-edge'; box.appendChild(edge);
    if (el) { el.innerHTML = ''; el.appendChild(box); }
    return { el: box, destroy: function () { if (live) LIVE = LIVE.filter(function (l) { return l !== live; }); box.remove(); } };
  }
  function place(l, now) {
    var x = l.x - 0.5, y = l.y - 0.5;
    // the rainbow band slides across the hologram as the light moves; the glint follows the light itself
    var s = 'translate3d(' + (-x * 60).toFixed(2) + '%,' + (-y * 40).toFixed(2) + '%,0)', o = (0.55 + Math.min(0.4, Math.hypot(x, y) * 0.9)).toFixed(3);
    var g = 'translate3d(' + (x * 70).toFixed(2) + '%,' + (y * 70).toFixed(2) + '%,0)';
    var key = s + o + g; if (key === l.last && !now) return; l.last = key;
    l.sh.style.transform = s; l.sh.style.opacity = o; l.gl.style.transform = g;
  }
  function wake() { if (!RAF) RAF = requestAnimationFrame(frame); }
  function frame() {
    RAF = 0; var more = false;
    LIVE.forEach(function (l) {
      if (!l.box.isConnected) return;
      var tx = l.ptr ? l.tx : TILT.on ? 0.5 + TILT.x : 0.5, ty = l.ptr ? l.ty : TILT.on ? 0.5 + TILT.y : 0.5;
      l.x += (tx - l.x) * 0.25; l.y += (ty - l.y) * 0.25;
      if (Math.abs(tx - l.x) + Math.abs(ty - l.y) > 0.002) more = true;
      place(l);
    });
    LIVE = LIVE.filter(function (l) { return l.box.isConnected; });
    if (more) wake();
  }
  function onTilt(e) {
    if (e.beta == null) return;
    if (!TILT.base) TILT.base = [e.beta, e.gamma];
    TILT.base[0] += (e.beta - TILT.base[0]) * 0.01; TILT.base[1] += (e.gamma - TILT.base[1]) * 0.01;   // drifts back to how it's held
    TILT.x = Math.max(-0.5, Math.min(0.5, (e.gamma - TILT.base[1]) / 40)); TILT.y = Math.max(-0.5, Math.min(0.5, (e.beta - TILT.base[0]) / 40));
    TILT.on = true; wake();
  }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function listenTilt() {
    if (TILT.listening || calm() || typeof DeviceOrientationEvent === 'undefined') return;
    if (typeof DeviceOrientationEvent.requestPermission === 'function' && lsGet('waxpack_tilt_dev') !== '1') return;
    TILT.listening = true; root.addEventListener('deviceorientation', onTilt);
  }
  // An iPhone asks before it shares its tilt, and only from a tap. A yes is remembered; a no is asked again next visit.
  function ask() {
    if (TILT.asked || TILT.listening || calm() || typeof DeviceOrientationEvent === 'undefined' || typeof DeviceOrientationEvent.requestPermission !== 'function') { listenTilt(); return; }
    TILT.asked = true;
    DeviceOrientationEvent.requestPermission().then(function (r) { if (r === 'granted') { lsSet('waxpack_tilt_dev', '1'); listenTilt(); } }).catch(function () { TILT.asked = false; });
  }

  // ── Marking the hologram by hand ─────────────────────────────────────────
  function icon(n) { try { if (root.Kit && Kit.icon) return Kit.icon(n); } catch (e) {} return ''; }
  function fx(s, hp) { try { if (root.Kit) { if (s && Kit.sfx) Kit.sfx(s); if (hp && Kit.haptic) Kit.haptic(hp); } } catch (e) {} }
  // the kit's own buttons (Night glass, gold for the one that goes on), with photo.css's look where the kit isn't loaded
  function btn(label, cls, on) {
    var b = document.createElement('button'), k = (cls || '').split(' ');
    b.type = 'button'; b.className = 'wph-btn' + (cls ? ' ' + cls : '') + (k.indexOf('raw') < 0 ? ' btn' + (k.indexOf('gold') >= 0 ? ' btn-primary' : k.indexOf('ghost') >= 0 ? ' btn-ghost' : '') : '');
    b.innerHTML = label; b.addEventListener('click', on); return b;
  }
  function editHolo(c) {
    return new Promise(function (resolve) {
      var w = c.w || OW, h = c.h || OH, cols = (c.holo && c.holo.cols) || (w > h ? GR : GC), rows = (c.holo && c.holo.rows) || (w > h ? GC : GR);
      var bits = new Uint8Array(cols * rows); if (c.holo) for (var i = 0; i < bits.length; i++) bits[i] = c.holo.bits.charCodeAt(i) === 49 ? 1 : 0;
      var ov = document.createElement('div'); ov.className = 'wph-ed';
      var head = document.createElement('p'); head.className = 'wph-ed-say'; head.textContent = 'Tap or drag across the card where the hologram or foil is. Tap a lit square again to clear it.';
      var stage = document.createElement('div'); stage.className = 'wph-ed-stage';
      var cardBox = document.createElement('div'); cardBox.className = 'wph-ed-card'; cardBox.style.aspectRatio = w + ' / ' + h; cardBox.style.width = 'min(100%, calc((100vh - 210px) * ' + (w / h).toFixed(4) + '))';
      var img = document.createElement('img'); img.src = c.url; img.alt = ''; img.draggable = false; cardBox.appendChild(img);
      var grid = document.createElement('div'); grid.className = 'wph-ed-grid'; grid.style.gridTemplateColumns = 'repeat(' + cols + ',1fr)'; grid.style.gridTemplateRows = 'repeat(' + rows + ',1fr)';
      var cells = []; for (i = 0; i < cols * rows; i++) { var e = document.createElement('i'); if (bits[i]) e.className = 'on'; grid.appendChild(e); cells.push(e); }
      cardBox.appendChild(grid); stage.appendChild(cardBox);
      var bar = document.createElement('div'); bar.className = 'wph-ed-bar';
      function close(v) { ov.remove(); resolve(v); }
      bar.appendChild(btn('Clear every square', 'ghost', function () { bits.fill(0); cells.forEach(function (e2) { e2.className = ''; }); }));
      bar.appendChild(btn('Cancel', '', function () { close(null); }));
      bar.appendChild(btn('Done', 'gold', function () { close(mkHolo(cols, rows, bits)); }));
      ov.appendChild(head); ov.appendChild(stage); ov.appendChild(bar);
      document.body.appendChild(ov);
      var paint = -1, lastCell = -1;
      function cellAt(e2) { var b = cardBox.getBoundingClientRect(), X = Math.floor((e2.clientX - b.left) / b.width * cols), Y = Math.floor((e2.clientY - b.top) / b.height * rows); return X < 0 || Y < 0 || X >= cols || Y >= rows ? -1 : Y * cols + X; }
      function set(k) { if (k < 0 || k === lastCell) return; lastCell = k; if (bits[k] === paint) return; bits[k] = paint; cells[k].className = paint ? 'on' : ''; fx(null, 'light'); }
      grid.addEventListener('pointerdown', function (e2) { var k = cellAt(e2); if (k < 0) return; e2.preventDefault(); grid.setPointerCapture(e2.pointerId); paint = bits[k] ? 0 : 1; lastCell = -1; set(k); });
      grid.addEventListener('pointermove', function (e2) { if (paint >= 0) set(cellAt(e2)); });
      grid.addEventListener('pointerup', function () { paint = -1; });
      grid.addEventListener('pointercancel', function () { paint = -1; });
    });
  }

  // ── The camera ───────────────────────────────────────────────────────────
  // A live view with a card-shaped frame. Each side of the frame lights green as the card's edge is found along it;
  // with all four lit and the card held still for a moment the photo is taken. Blown-out patches inside the frame
  // ask for a small tilt and hold the automatic shot back. Where the camera isn't allowed it asks for a photo instead.
  function pickFile(capture) {
    return new Promise(function (res) {
      var inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; if (capture) inp.setAttribute('capture', 'environment');
      inp.style.cssText = 'position:fixed;left:-9999px'; document.body.appendChild(inp);
      var done = false; inp.addEventListener('change', function () { done = true; var f = inp.files && inp.files[0]; inp.remove(); res(f || null); });
      root.addEventListener('focus', function back() { root.removeEventListener('focus', back); setTimeout(function () { if (!done) { inp.remove(); res(undefined); } }, 1200); });
      inp.click();
    });
  }
  var SAY = {
    front: 'Hold the front of the card inside the frame.', back: 'Now turn the card over and hold its back inside the frame.',
    steady: 'Hold still for a moment.', glare: 'Tilt the card a little to lose the glare.', closer: 'Bring the card closer so it fills the frame.',
    noCam: { front: 'The camera isn\u2019t available here, so take or choose a photo of the card\u2019s front.', back: 'Now take or choose a photo of the card\u2019s back.' }
  };
  function capture(o) {
    o = o || {};
    var sides = o.sides || ['front', 'back'], optional = o.optional || ['back'], out = {}, at = 0;
    var ov = document.createElement('div'); ov.className = 'wph-cap';
    var video = document.createElement('video'); video.setAttribute('playsinline', ''); video.muted = true; video.autoplay = true; video.className = 'wph-video';
    var frameEl = document.createElement('div'); frameEl.className = 'wph-frame';
    ['t', 'r', 'b', 'l'].forEach(function (s) { var e = document.createElement('i'); e.className = 'wph-fs ' + s; frameEl.appendChild(e); });
    var say = document.createElement('p'); say.className = 'wph-say';
    var warn = document.createElement('p'); warn.className = 'wph-warn';
    var thumbs = document.createElement('div'); thumbs.className = 'wph-thumbs';
    var flash = document.createElement('div'); flash.className = 'wph-flash';
    var x = btn(icon('close') || '\u00d7', 'wph-x', function () { finish(true); }); x.setAttribute('aria-label', 'Close the camera');
    var bar = document.createElement('div'); bar.className = 'wph-cbar';
    var lib = btn('<span>Your photos</span>', 'wph-lib', function () { fromFile(false); });
    var shut = btn('<span class="wph-shut-in"></span>', 'wph-shut raw', function () { shoot(); }); shut.setAttribute('aria-label', 'Take the photo');
    var turn = btn('<span>Turn the frame</span>', 'wph-turn btn-sm', function () { sideways = !sideways; layout(); });
    var skip = btn('<span>Skip</span>', 'wph-skip', function () { out[sides[at]] = null; next(); });
    bar.appendChild(turn); bar.appendChild(lib); bar.appendChild(shut); bar.appendChild(skip);
    [video, frameEl, say, warn, thumbs, flash, x, bar].forEach(function (e) { ov.appendChild(e); });
    document.body.appendChild(ov);
    var stream = null, sideways = !!o.sideways, timer = 0, steadyN = 0, prev = null, busy = false, armed = true, away = 0, resolveAll, small = canvas(2, 2);
    var promise = new Promise(function (res) { resolveAll = res; });
    function layout() {   // the frame as large as the view allows, in the card's shape
      var W = ov.clientWidth, H = ov.clientHeight, low = W > H && H <= 520, top = low ? 84 : 96, foot = low ? 14 : 196, right = low ? 200 : 0;
      var aw = (W - right) * 0.86, ah = Math.max(120, H - top - foot), ar = sideways ? 1 / CARD : CARD;
      var fw = Math.min(aw, ah * ar), fh = fw / ar;
      frameEl.style.width = fw + 'px'; frameEl.style.height = fh + 'px'; frameEl.style.left = (W - right - fw) / 2 + 'px'; frameEl.style.top = (top + (ah - fh) / 2) + 'px';
      frameEl.classList.toggle('side', sideways);
    }
    function prompt() {
      var s = sides[at]; say.textContent = SAY[s] || SAY.front;
      skip.style.display = optional.indexOf(s) >= 0 ? '' : 'none';
      skip.querySelector('span').textContent = s === 'back' ? 'Skip the back' : 'Skip the front';
    }
    function finish(cancel) {
      clearInterval(timer); if (stream) stream.getTracks().forEach(function (t) { t.stop(); });
      root.removeEventListener('resize', layout); ov.remove();
      if (cancel) return resolveAll(null);
      if (!o.clean) return resolveAll(out);
      Promise.all(sides.map(function (s) { return out[s] ? clean(out[s], { side: s }) : null; })).then(function (r) { var c = {}; sides.forEach(function (s, i) { c[s] = r[i]; }); resolveAll(c); });
    }
    // after a shot the next side waits until the card has left the frame or turned over, so the side just taken
    // isn't taken again
    function next() { at++; steadyN = 0; prev = null; armed = false; away = 0; if (at >= sides.length) return finish(false); prompt(); if (!stream) fallback(); }
    function keep(blob) {
      out[sides[at]] = blob;
      var t = document.createElement('img'); t.src = URL.createObjectURL(blob); t.alt = ''; thumbs.appendChild(t);
      fx('tap', 'medium'); next();
    }
    function fromFile(cam) {
      busy = true;
      pickFile(cam).then(function (f) { busy = false; if (f) keep(f); });
    }
    function shoot() {
      if (busy || !stream || !video.videoWidth) return;
      busy = true; flash.classList.remove('go'); void flash.offsetWidth; flash.classList.add('go');
      // the frame and a margin round it, at the camera's full resolution: the card fills most of the photo
      var g = guide(0.16), c = canvas(Math.round(g.sw), Math.round(g.sh)); c.getContext('2d').drawImage(video, g.sx, g.sy, g.sw, g.sh, 0, 0, c.width, c.height);
      c.toBlob(function (b) { busy = false; if (b) keep(b); }, 'image/jpeg', 0.95);
    }
    function fallback() {
      ov.classList.add('nocam'); say.textContent = SAY.noCam[sides[at]] || SAY.noCam.front;
      if (!ov.querySelector('.wph-fb')) {
        var fb = document.createElement('div'); fb.className = 'wph-fb';
        fb.appendChild(btn(icon('camera') + '<span>Take a photo</span>', 'gold', function () { fromFile(true); }));
        fb.appendChild(btn(icon('cards') + '<span>Choose from your photos</span>', '', function () { fromFile(false); }));
        ov.appendChild(fb);
      }
    }
    // where the frame lies in the camera's own pixels (the view is the video scaled to cover), with a margin m
    function guide(m) {
      var vw = video.videoWidth, vh = video.videoHeight, W = ov.clientWidth, H = ov.clientHeight, k = Math.max(W / vw, H / vh);
      var ox = (W - vw * k) / 2, oy = (H - vh * k) / 2, fr = frameEl.getBoundingClientRect(), orr = ov.getBoundingClientRect();
      var fx0 = (fr.left - orr.left - ox) / k, fy0 = (fr.top - orr.top - oy) / k, fw = fr.width / k, fh = fr.height / k;
      var sx = Math.max(0, fx0 - fw * m), sy = Math.max(0, fy0 - fh * m), ex = Math.min(vw, fx0 + fw * (1 + m)), ey = Math.min(vh, fy0 + fh * (1 + m));
      return { sx: sx, sy: sy, sw: ex - sx, sh: ey - sy, fx: fx0, fy: fy0, fw: fw, fh: fh };
    }
    // the live check, about eight times a second, on a small copy of the frame and a margin round it
    function tick() {
      if (busy || !video.videoWidth || ov.classList.contains('nocam')) return;
      var m = 0.14, gb = guide(m), sx = gb.sx, sy = gb.sy, sw = gb.sw, sh = gb.sh, s = 180 / Math.max(sw, sh);
      small.width = Math.round(sw * s); small.height = Math.round(sh * s);
      var sc = ctx2(small); sc.drawImage(video, sx, sy, sw, sh, 0, 0, small.width, small.height);
      var P = planes(sc.getImageData(0, 0, small.width, small.height)), G = gradient(P), w = P.w, h = P.h;
      var kx = w / sw, ky = h / sh, mx = (gb.fx - sx) * kx, my = (gb.fy - sy) * ky, mx2 = mx + gb.fw * kx, my2 = my + gb.fh * ky;
      var box = [[mx, my], [mx2, my], [mx2, my2], [mx, my2]], lit = 0, names = ['t', 'r', 'b', 'l'];
      for (var i = 0; i < 4; i++) {
        var A = box[i], B = box[(i + 1) % 4], L = dist(A, B), d = [(B[0] - A[0]) / L, (B[1] - A[1]) / L], n = [d[1], -d[0]], band = Math.min(w, h) * 0.11, hits = 0, offs = [];
        for (var j = 1; j <= 20; j++) {
          var t = 0.1 + 0.8 * j / 21, bx = A[0] + d[0] * L * t, by = A[1] + d[1] * L * t, bv = 0, bo = 0;
          for (var u = -band; u <= band; u += 1) { var X = Math.round(bx + n[0] * u), Y = Math.round(by + n[1] * u); if (X < 1 || Y < 1 || X >= w - 1 || Y >= h - 1) continue; var q = Y * w + X, al = Math.abs(G.gx[q] * n[0] + G.gy[q] * n[1]); if (al > bv) { bv = al; bo = u; } }
          if (bv > 0.05) { hits++; offs.push(bo); }
        }
        var sd = 0; if (offs.length > 2) { var mu = offs.reduce(function (a, b) { return a + b; }, 0) / offs.length; sd = Math.sqrt(offs.reduce(function (a, b) { return a + (b - mu) * (b - mu); }, 0) / offs.length); }
        var ok = hits >= 14 && sd < band * 0.35;
        frameEl.querySelector('.' + names[i]).classList.toggle('ok', ok); if (ok) lit++;
      }
      // glare: blown, near neutral pixels inside the frame
      var blown = 0, tot = 0, luma2 = new Float32Array(w * h);
      for (var y = Math.max(0, Math.round(my)); y < Math.min(h, my2); y++) for (var x2 = Math.max(0, Math.round(mx)); x2 < Math.min(w, mx2); x2++) { var p = y * w + x2; tot++; if (P.r[p] > 0.97 && P.g[p] > 0.97 && P.b[p] > 0.97) blown++; }
      for (var p2 = 0; p2 < w * h; p2 += 1) luma2[p2] = P.g[p2];
      var glare = blown / Math.max(1, tot) > 0.006;
      var moved = 1; if (prev && prev.length === luma2.length) { moved = 0; for (var p3 = 0; p3 < luma2.length; p3 += 3) moved += Math.abs(luma2[p3] - prev[p3]); moved /= luma2.length / 3; }
      prev = luma2;
      if (!armed) { if (lit < 3 || moved > 0.06) away++; if (away >= 2) armed = true; }
      warn.textContent = glare ? SAY.glare : lit >= 2 && lit < 4 ? SAY.closer : '';
      ov.classList.toggle('all', lit === 4);
      if (lit === 4 && !glare && moved < 0.025) { steadyN++; say.textContent = SAY.steady; } else { steadyN = 0; prompt(); }
      if (steadyN >= 5 && armed && o.auto !== false) { steadyN = 0; shoot(); }
    }
    prompt(); layout(); root.addEventListener('resize', layout);
    var md = navigator.mediaDevices;
    if (!md || !md.getUserMedia || o.camera === false) fallback();
    else md.getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 3840 }, height: { ideal: 2160 } } }).then(function (s) {
      if (!ov.isConnected) { s.getTracks().forEach(function (t) { t.stop(); }); return; }
      stream = s; video.srcObject = s; var pl = video.play(); if (pl && pl.catch) pl.catch(function () {});
      timer = setInterval(tick, 125);
    }).catch(function () { fallback(); });
    return promise;
  }

  root.WaxPhoto = {
    capture: capture, clean: clean, detect: detect, record: record, show: show, editHolo: editHolo, ask: ask,
    _: { find: find, homography: homography, cornerShape: cornerShape, findHolo: findHolo, mkHolo: mkHolo, turnHolo: turnHolo }
  };
})(typeof window !== 'undefined' ? window : this);
