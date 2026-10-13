// ═══════════════════════════════════════════════════════════════════════════
// Monopoly art: the board (SVG, 1000 × 1000 units), corner art, icons, metal tokens, houses and hotels.
// Everything is drawn here; nothing is downloaded.
// ═══════════════════════════════════════════════════════════════════════════
(function () {
  'use strict';
  var M = window.MonoEngine, SQ = M.SQ, GROUPS = M.GROUPS;
  var C = 130, W = (1000 - 2 * C) / 9, BAR = 27;
  var INK = '#1d1d1b', BOARD = '#d6ead2', LINE = '#1d1d1b';
  var FONT = "'Sofia Sans Condensed','Arial Narrow',sans-serif";

  // square i -> {x, y, w, h, side: b|l|t|r|c}
  function rectOf(i) {
    if (i === 0) return { x: 1000 - C, y: 1000 - C, w: C, h: C, side: 'c' };
    if (i < 10) return { x: 1000 - C - i * W, y: 1000 - C, w: W, h: C, side: 'b' };
    if (i === 10) return { x: 0, y: 1000 - C, w: C, h: C, side: 'c' };
    if (i < 20) return { x: 0, y: 1000 - C - (i - 10) * W, w: C, h: W, side: 'l' };
    if (i === 20) return { x: 0, y: 0, w: C, h: C, side: 'c' };
    if (i < 30) return { x: C + (i - 21) * W, y: 0, w: W, h: C, side: 't' };
    if (i === 30) return { x: 1000 - C, y: 0, w: C, h: C, side: 'c' };
    return { x: 1000 - C, y: C + (i - 31) * W, w: C, h: W, side: 'r' };
  }
  // the part of a square that isn't the colour bar: where the tokens stand
  function centerOf(i) {
    var r = rectOf(i);
    switch (r.side) {
      case 'b': return { x: r.x + r.w / 2, y: r.y + BAR + (r.h - BAR) / 2 + 4 };
      case 't': return { x: r.x + r.w / 2, y: r.y + (r.h - BAR) / 2 - 4 };
      case 'l': return { x: r.x + (r.w - BAR) / 2 - 4, y: r.y + r.h / 2 };
      case 'r': return { x: r.x + BAR + (r.w - BAR) / 2 + 4, y: r.y + r.h / 2 };
    }
    return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
  }
  var OFF = [[0, 0], [-15, -13], [15, 13], [15, -13], [-15, 13], [0, -22], [0, 22], [-22, 0], [22, 0]];
  var OFF_N = { 1: [[0, 0]], 2: [[-13, -10], [13, 10]], 3: [[-15, -14], [15, -14], [0, 14]], 4: [[-15, -15], [15, -15], [-15, 15], [15, 15]] };
  // where token k of n on square i stands (jail: in the cell, or just visiting on the outside strip)
  function slot(i, k, n, jailed) {
    if (i === 10) {
      if (jailed) { var o = (OFF_N[Math.min(n, 4)] || OFF_N[4])[k % 4]; return { x: 88 + o[0] * 0.9 + (k >= 4 ? 6 : 0), y: 912 + o[1] * 0.9 + (k >= 4 ? 6 : 0) }; }
      var vis = [[22, 978], [52, 980], [82, 980], [112, 980], [20, 946], [20, 914], [20, 882], [110, 960]];
      return { x: vis[k % 8][0], y: vis[k % 8][1] };
    }
    var c = centerOf(i), list = n <= 4 ? OFF_N[n] || OFF_N[1] : OFF, off = list[k % list.length];
    var r = rectOf(i), sc = r.side === 'c' ? 1.4 : 1;
    return { x: c.x + off[0] * sc, y: c.y + off[1] * sc };
  }

  // Board text: short lines per square, as printed on the board
  var LINES = {
    1: ['MEDITER-', 'RANEAN', 'AVENUE'], 2: ['COMMUNITY', 'CHEST'], 3: ['BALTIC', 'AVENUE'], 4: ['INCOME', 'TAX'], 5: ['READING', 'RAILROAD'],
    6: ['ORIENTAL', 'AVENUE'], 7: ['CHANCE'], 8: ['VERMONT', 'AVENUE'], 9: ['CONNECTI-', 'CUT', 'AVENUE'],
    11: ['ST. CHARLES', 'PLACE'], 12: ['ELECTRIC', 'COMPANY'], 13: ['STATES', 'AVENUE'], 14: ['VIRGINIA', 'AVENUE'], 15: ['PENNSYL-', 'VANIA R.R.'],
    16: ['ST. JAMES', 'PLACE'], 17: ['COMMUNITY', 'CHEST'], 18: ['TENNESSEE', 'AVENUE'], 19: ['NEW YORK', 'AVENUE'],
    21: ['KENTUCKY', 'AVENUE'], 22: ['CHANCE'], 23: ['INDIANA', 'AVENUE'], 24: ['ILLINOIS', 'AVENUE'], 25: ['B. & O.', 'RAILROAD'],
    26: ['ATLANTIC', 'AVENUE'], 27: ['VENTNOR', 'AVENUE'], 28: ['WATER', 'WORKS'], 29: ['MARVIN', 'GARDENS'],
    31: ['PACIFIC', 'AVENUE'], 32: ['NORTH', 'CAROLINA', 'AVENUE'], 33: ['COMMUNITY', 'CHEST'], 34: ['PENNSYL-', 'VANIA', 'AVENUE'], 35: ['SHORT', 'LINE'],
    36: ['CHANCE'], 37: ['PARK', 'PLACE'], 38: ['LUXURY', 'TAX'], 39: ['BOARD-', 'WALK']
  };
  function t(x, y, s, size, o) {
    o = o || {};
    return '<text x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" text-anchor="' + (o.a || 'middle') + '" font-family="' + (o.f || FONT) + '" font-weight="' + (o.w || 700) + '" font-size="' + size + '" fill="' + (o.c || INK) + '"' + (o.ls ? ' letter-spacing="' + o.ls + '"' : '') + (o.tr ? ' transform="' + o.tr + '"' : '') + '>' + s + '</text>';
  }
  // ── Icons: flat line art in the classic board style (black outlines, flat fills), drawn around 0,0 inside -30..30 ──
  function pth(d, fill, sw, more) { return '<path d="' + d + '" fill="' + fill + '" stroke="' + INK + '" stroke-width="' + (sw || 2) + '" stroke-linejoin="round" stroke-linecap="round"' + (more || '') + '/>'; }
  function circ(x, y, r, fill, sw) { return '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="' + fill + '" stroke="' + INK + '" stroke-width="' + (sw || 1.6) + '"/>'; }
  function lerp(a, b, k) { return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]; }
  // a point on a four-sided face Q = [bottom-left, bottom-right, top-right, top-left], u across, v up
  function onFace(Q, u, v) { return lerp(lerp(Q[0], Q[1], u), lerp(Q[3], Q[2], u), v); }
  function poly(p) { return 'M' + p.map(function (q) { return q[0].toFixed(1) + ' ' + q[1].toFixed(1); }).join('L') + 'Z'; }
  function inset(Q, u0, v0, u1, v1) { return poly([onFace(Q, u0, v0), onFace(Q, u1, v0), onFace(Q, u1, v1), onFace(Q, u0, v1)]); }
  // short dashes radiating from (x, y): angles in degrees from straight up
  function rays(x, y, r0, r1, angs, sw) {
    return pth(angs.map(function (a) { var s = Math.sin(a * Math.PI / 180), c = -Math.cos(a * Math.PI / 180); return 'M' + (x + s * r0).toFixed(1) + ' ' + (y + c * r0).toFixed(1) + 'L' + (x + s * r1).toFixed(1) + ' ' + (y + c * r1).toFixed(1); }).join(''), 'none', sw || 1.8);
  }
  // a tied money bag, bottom centre at x, y
  function bag(x, y, s) {
    return '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')">' +
      pth('M-7 0C-10-6-7-11-2.5-12.5L-4.5-16Q0-18.5 4.5-16L2.5-12.5C7-11 10-6 7 0Z', '#f1eee2', 1.8 / s) +
      pth('M-3-12.6Q0-11.2 3-12.6M-1.5-8.5Q-2.5-5-1.5-1M2.5-8Q3.5-5 2.8-2', 'none', 1.1 / s) + '</g>';
  }
  var IC = {
    train: function () {
      // the classic solid locomotive heading left: flared stack, round-nosed boiler, cab with swept roof, cowcatcher, two big wheels
      return '<g transform="translate(2 1)" fill="' + INK + '">' +
        '<path d="M-22.5-24H-9.5L-13-7H-19Z"/>' +
        '<path d="M-17-8H6V8H-17A8 8 0 0 1-17-8Z"/>' +
        '<path d="M3 8V-12C3-18 8-21 14-21H24.5C20.5-18 18.5-12 18.5-4V8Z"/>' +
        '<path d="M-19 5H-12L-21 22H-28Z"/>' +
        '<circle cx="-6" cy="14" r="7.5"/><circle cx="11.5" cy="14" r="7.5"/></g>';
    },
    bulb: function () {
      // pear-shaped bulb with a looped filament, screw base and little light dashes
      return '<g transform="translate(0 2)">' +
        rays(0, -8, 15.5, 20, [-135, -110, -85, -60, -35, 35, 60, 85, 110, 135], 1.9) +
        pth('M-5 9C-5 4-12 0-12-8C-12-16-6.5-21 0-21C6.5-21 12-16 12-8C12 0 5 4 5 9Z', '#ffe33d', 2.2) +
        pth('M-2.5 9V3L-5.5-9L0 0L5.5-9L2.5 3V9', 'none', 1.3) +
        pth('M-5 9H5V17.5H-5Z', '#fff', 2) + pth('M-5 11.6L5 12.6M-5 14.3L5 15.3', 'none', 1.4) +
        pth('M-2.6 17.5Q0 22.5 2.6 17.5Z', INK, 1.2) + '</g>';
    },
    tap: function () {
      // side-on faucet: wall flange, pipe, valve with a cross handle, spout turning down
      return '<g transform="translate(1.5 2)">' +
        '<ellipse cx="-22" cy="0" rx="4.2" ry="9.5" fill="#fff" stroke="' + INK + '" stroke-width="2.2"/>' +
        pth('M-19-5.5H-15V5.5H-19Z', '#fff', 2) +
        pth('M-15-5H10C17-5 21-1 21 6V19H13V8C13 6 12 5 10 5H-15Z', '#fff', 2.2) +
        pth('M12 18H22V21.5H12Z', '#fff', 2) +
        pth('M-10.5-5V5', 'none', 1.6) +
        pth('M-4 5L-3 8.5H5L6 5Z', '#fff', 2) +
        pth('M-5-5L-3.5-11H5.5L7-5Z', '#fff', 2) +
        pth('M-2-15H4V-11H-2Z', '#fff', 1.8) +
        pth('M0-15V-19H2V-15Z', '#fff', 1.4) +
        pth('M-9-21.6H11V-18.4H-9Z', '#fff', 1.8) +
        circ(-9.5, -20, 2.7, '#fff', 1.8) + circ(11.5, -20, 2.7, '#fff', 1.8) + circ(1, -24, 2.4, '#fff', 1.8) + circ(1, -20, 1.9, '#fff', 1.4) + '</g>';
    },
    chest: function () {
      // the open treasure chest at an angle: blue panels in a light frame, lid thrown back, money bags inside
      var BL = '#3fa9e0', FR = '#f4f3ee';
      var A = [-25, 14], B = [5, 22], Cc = [5, 4], D = [-25, -4], E = [24, 12], F = [24, -6], G = [-6, -14];
      var front = [A, B, Cc, D], side = [B, E, F, Cc], lid = [G, F, [28.5, -26], [-1.5, -34]];
      var lk = onFace(front, .42, .5);
      return '<g transform="translate(-0.5 3.5) scale(.93)">' +
        pth(poly(lid), FR, 2) + pth(inset(lid, .09, .13, .91, .87), BL, 1.4) +
        pth(poly([D, Cc, F, G]), '#17344d', 2) +
        bag(-10, 1, 1) + bag(4, 3, 1.25) +
        pth(poly(front), FR, 2) + pth(inset(front, .06, .58, .94, .86), BL, 1.3) + pth(inset(front, .06, .13, .94, .46), BL, 1.3) +
        pth(poly(side), FR, 2) + pth(inset(side, .13, .13, .87, .87), BL, 1.3) + pth(inset(side, .3, .48, .7, .62), FR, 1.2) +
        '<path d="M' + (lk[0] - 1.9).toFixed(1) + ' ' + (lk[1] - 1).toFixed(1) + 'v-1.6a1.9 1.9 0 0 1 3.8 0v1.6" fill="none" stroke="' + INK + '" stroke-width="1.3"/>' +
        pth('M' + (lk[0] - 3).toFixed(1) + ' ' + (lk[1] - 1.2).toFixed(1) + 'h6v5.2h-6z', '#fff', 1.3) + '</g>';
    },
    ring: function () {
      // gold band seen at an angle, a set stone and sparkle lines
      var GO = '#f5c518';
      return '<g transform="translate(0 2)">' +
        rays(0, -13, 6.5, 10.5, [-88, -58, -29, 0, 29, 58, 88], 1.5) +
        pth('M-21 9A21 11 0 1 0 21 9A21 11 0 1 0-21 9ZM-15 7.5A15 6.5 0 1 0 15 7.5A15 6.5 0 1 0-15 7.5Z', GO, 2, ' fill-rule="evenodd"') +
        pth('M-15 7.5A15 6.5 0 1 0 15 7.5A15 6.5 0 1 0-15 7.5ZM-12.5 9.8A12.5 4 0 1 0 12.5 9.8A12.5 4 0 1 0-12.5 9.8Z', '#c8930f', 1.3, ' fill-rule="evenodd"') +
        '<path d="M-16 14.6Q-6 19.6 8 18.7" fill="none" stroke="#fff6c4" stroke-width="1.6" stroke-linecap="round"/>' +
        pth('M-6-1L-7.5-9H7.5L6-1Z', GO, 1.8) +
        pth('M-6-9L-4-15H4L6-9Z', '#fff', 1.6) + pth('M-1.5-15L-2.5-9M1.5-15L2.5-9M-5-12H5', 'none', .8) + '</g>';
    },
    question: function (col) {
      // a tall question mark: black outline, coloured fill, ball terminal, tapering stem
      col = col || '#d6338a';
      var hook = 'M-10-14C-10-23-5-28 1.5-28C8.5-28 12.5-23 12.5-16.5C12.5-9 7-6.5 3.5-3.5C1-1.3 0.5 1 0.5 4', stem = 'M-3 2H4L2.3 13Q0.5 15.6-1.3 13Z';
      function layer(c, e) {
        return '<path d="' + hook + '" fill="none" stroke="' + c + '" stroke-width="' + (7 + e) + '" stroke-linecap="round"/>' +
          '<circle cx="-10" cy="-13.2" r="' + (4.4 + e / 2) + '" fill="' + c + '"/>' +
          '<path d="' + stem + '" fill="' + c + '"' + (e ? ' stroke="' + c + '" stroke-width="' + e + '" stroke-linejoin="round"' : '') + '/>' +
          '<circle cx="0.5" cy="22" r="' + (4.6 + e / 2) + '" fill="' + c + '"/>';
      }
      return '<g transform="translate(-0.5 1) scale(.9)">' + layer(INK, 4.4) + layer(col, 0) + '</g>';
    },
    diamond: function () {
      return '<path d="M0-22l18 22-18 22-18-22z" fill="none" stroke="' + INK + '" stroke-width="2.4"/>';
    },
    car: function () {
      // an old-fashioned car from the front: rounded cab, windshield, round grille, fenders and two tyres
      var R = '#d7262e';
      return '<g transform="translate(0 0.5)">' +
        pth('M-18 6H-10V18Q-10 20.5-12.5 20.5H-15.5Q-18 20.5-18 18Z', '#fff', 2) + pth('M10 6H18V18Q18 20.5 15.5 20.5H12.5Q10 20.5 10 18Z', '#fff', 2) +
        pth('M-10-6V-16Q-10-22-4-22H4Q10-22 10-16V-6Q20-6 22.5 1V8.5Q22.5 11 20 11H11Q10 15 0 15Q-10 15-11 11H-20Q-22.5 11-22.5 8.5V1Q-20-6-10-6Z', R, 2.2) +
        pth('M-6.5-17H6.5V-10H-6.5Z', '#fff', 1.8) +
        circ(0, 2, 6.5, '#fff', 2) + circ(0, 2, 2.6, '#fff', 1.6) + '</g>';
    },
    cop: function () {
      // a policeman in a blue uniform and cap, whistle in his mouth, pointing up with one gloved finger
      var B = '#2456b5';
      return '<g transform="translate(-1 1)">' +
        // uniform: shoulders and chest, collar, badge, buttons
        pth('M-24 25V16C-24 9-18 5-10 4H0C5 5 8 8 10 12L14 25Z', B, 2.2) +
        pth('M-11 4L-6 11L-1 4.5', 'none', 1.6) + circ(-16, 13, 2.4, '#f2c418', 1.2) + circ(-4, 17, 1.1, INK, .6) + circ(-3, 22, 1.1, INK, .6) +
        // raised arm, white cuff, gloved hand with one finger up
        pth('M1 14C4 8 8 2 11-3L18.5 2C15 7 11 12 8 17Z', B, 2.2) +
        pth('M11-3L18.5 2L21-1.6L13.4-6.6Z', '#fff', 1.8) +
        pth('M13.4-6.6C11-11 12-15 16-16.5L21.5-15.5C24.5-13 24.5-6 21-1.6Z', '#fff', 1.8) +
        pth('M16.5-16L20.5-28.5C21.3-30.6 24.8-29.9 24.2-27.6L21.6-15.3Z', '#fff', 1.8) +
        pth('M20.5-11.5H23.5M20.5-7.5H23', 'none', 1.2) +
        // head in profile: big nose, closed eye, ear, whistle
        pth('M-17-3C-19-10-16-19-7-20C1-20 4-15 4-11.5L8.5-7.5L4.2-6C5-2.5 2 1.5-3 2.5C-9 3.5-15 2-17-3Z', '#fff', 2) +
        pth('M-11-9C-14-10-14-4.5-11-4.5', 'none', 1.4) + pth('M-2-10Q0-8.6 1.8-10', 'none', 1.4) +
        pth('M2-3H7', 'none', 1.8) + circ(9, -3, 2.3, '#fff', 1.5) +
        // cap: crown, band and black peak
        pth('M-18.5-12C-19.5-21-13-27-3-27L9-24L4.5-15Z', B, 2) +
        pth('M-18-12.5L4.5-15', 'none', 1.8) + pth('M-1-15L9.5-15.6L11.5-12L0-12.6Z', INK, 1.2) + '</g>';
    },
    lock: function () {
      return '<path d="M-10-4v-8a10 10 0 0 1 20 0v8" fill="none" stroke="' + INK + '" stroke-width="5"/>' +
        '<rect x="-16" y="-5" width="32" height="26" rx="4" fill="#f3901d" stroke="' + INK + '" stroke-width="2.4"/><circle cx="0" cy="5" r="3.5" fill="' + INK + '"/><path d="M0 7v7" stroke="' + INK + '" stroke-width="3"/>';
    }
  };
  function icon(name, x, y, s, arg) { return '<g transform="translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ') scale(' + (s || 1) + ')">' + IC[name](arg) + '</g>'; }
  // icon sizes on the squares: [top or bottom row, left or right side]
  var ISC = { train: [1, .92], chest: [1.06, .87], question: [1.2, 1.05], bulb: [1.05, .95], tap: [1, .92], ring: [1.05, .95] };
  var QCOL = { 7: '#d6338a', 22: '#1b5fae', 36: '#f3901d' };

  // ── One square ──
  function square(i) {
    var s = SQ[i], r = rectOf(i), out = '', L = LINES[i] || [s.n.toUpperCase()];
    out += '<rect x="' + r.x.toFixed(1) + '" y="' + r.y.toFixed(1) + '" width="' + r.w.toFixed(1) + '" height="' + r.h.toFixed(1) + '" fill="' + BOARD + '" stroke="' + LINE + '" stroke-width="1.6"/>';
    if (r.side === 'c') return out + corner(i, r);
    var vert = r.side === 'l' || r.side === 'r';
    // content box (inside the bar) and a "flow" from the bar outward
    var bx = r.x, by = r.y, bw = r.w, bh = r.h;
    if (s.k === 'st') {
      var c = GROUPS[s.g].c;
      var bar = r.side === 'b' ? [r.x, r.y, r.w, BAR] : r.side === 't' ? [r.x, r.y + r.h - BAR, r.w, BAR] : r.side === 'l' ? [r.x + r.w - BAR, r.y, BAR, r.h] : [r.x, r.y, BAR, r.h];
      out += '<rect x="' + bar[0].toFixed(1) + '" y="' + bar[1].toFixed(1) + '" width="' + bar[2].toFixed(1) + '" height="' + bar[3].toFixed(1) + '" fill="' + c + '" stroke="' + LINE + '" stroke-width="1.6"/>';
      if (r.side === 'b') { by += BAR; bh -= BAR; } else if (r.side === 't') bh -= BAR; else if (r.side === 'l') bw -= BAR; else { bx += BAR; bw -= BAR; }
    }
    var cx = bx + bw / 2, fs = 12.2, lh = 12.6;
    var price = s.p ? 'M' + s.p : s.k === 'tax' ? 'PAY $' + s.amt : '';
    if (s.k === 'st' || s.k === 'rr' || s.k === 'ut') price = '$' + s.p;
    // names near the bar, price at the outer edge
    var nameTop, priceY;
    if (!vert) {
      if (r.side === 'b') { nameTop = by + 15; priceY = r.y + r.h - 9; }
      else { nameTop = by + bh - 13 - (L.length - 1) * lh; priceY = r.y + 17; }
    }
    function names(x0, y0) { return L.map(function (ln, k) { return t(x0, y0 + k * lh, ln, ln.length > 10 ? 11 : fs, { ls: .2 }); }).join(''); }
    if (s.k === 'st') {
      if (!vert) out += names(cx, r.side === 'b' ? nameTop : by + 18 + 16) + t(cx, r.side === 'b' ? priceY : by + 15, price, 12.5, { w: 600 });
      else {
        var ny = r.y + r.h / 2 - (L.length * lh) / 2 + 9;
        out += names(cx, ny - 5) + t(cx, ny - 5 + L.length * lh + 4, price, 12, { w: 600 });
      }
      return out;
    }
    // special squares: label + icon + price
    var ic = s.k === 'rr' ? 'train' : s.k === 'cc' ? 'chest' : s.k === 'ch' ? 'question' : i === 12 ? 'bulb' : i === 28 ? 'tap' : i === 38 ? 'ring' : null;
    var arg = s.k === 'ch' ? QCOL[i] : null;
    if (!vert) {
      var top = r.side === 'b' ? r.y + 15 : r.y + r.h - 16 - (L.length - 1) * lh - 2;
      var mid = r.y + r.h / 2 + (r.side === 'b' ? 6 : -6);
      if (r.side === 't') { out += t(cx, r.y + 17, price, 12.5, { w: 600 }); out += names(cx, top); }
      else { out += names(cx, top); if (price) out += t(cx, r.y + r.h - 9, price, 12.5, { w: 600 }); }
      if (s.k === 'tax' && i === 4) out += icon('diamond', cx, mid + 2, 0.95) + t(cx, mid + 6, 'TAX', 12, {});
      else if (ic) out += icon(ic, cx, mid + (s.k === 'ch' ? (r.side === 'b' ? 4 : -4) : 2), ISC[ic][0], arg);
    } else {
      // icon on the outer half, name and price on the inner half
      var lx = r.side === 'l' ? r.x + 30 : r.x + r.w - 31, tx = r.side === 'l' ? r.x + r.w - 46 : r.x + 46;
      var ty = r.y + r.h / 2 - (L.length * lh) / 2 + 8;
      out += names(tx, ty - (price ? 6 : 0));
      if (price) out += t(tx, ty - 6 + L.length * lh + 3, price, 12, { w: 600 });
      if (ic) out += icon(ic, lx, r.y + r.h / 2 + 1, ISC[ic][1], arg);
    }
    return out;
  }
  // ── Corners ──
  // the big slanted block-letter GO with a white inline, baseline centre at x, y
  function goWord(x, y) {
    var G = 'M-6.5-29L-12-35H-21L-27-29V-11L-21-5H-12L-6.5-11V-19H-14.5', Gi = 'M-8.3-31L-12-35H-21L-27-29V-11L-21-5H-12L-6.5-11V-19H-12',
      O = 'M12-35H21L27-29V-11L21-5H12L6-11V-29Z';
    function s(d, c, w) { return '<path d="' + d + '" fill="none" stroke="' + c + '" stroke-width="' + w + '" stroke-linejoin="miter"/>'; }
    return '<g transform="translate(' + x + ' ' + y + ') skewX(-12)">' + s(G, '#d7262e', 9) + s(O, '#d7262e', 9) + s(Gi, '#fff', 1.5) + s(O, '#fff', 1.5) + '</g>';
  }
  function corner(i, r) {
    var cx = r.x + r.w / 2, cy = r.y + r.h / 2, o = '';
    if (i === 0) {
      o += '<g transform="rotate(-45 ' + cx + ' ' + cy + ')">' +
        t(cx, cy - 26, 'COLLECT $200', 12, { ls: .4 }) + t(cx, cy - 13, 'SALARY AS YOU PASS', 9.5, { ls: .3 }) +
        goWord(cx, cy + 31) + '</g>' +
        // the arrow: barbed head pointing the way round, feathered tail
        '<path d="M' + (r.x + 106) + ' ' + (r.y + 116) + 'H' + (r.x + 26) + '" stroke="#d7262e" stroke-width="4.5"/>' +
        '<path d="M' + (r.x + 12) + ' ' + (r.y + 116) + 'l22-11-6 11 6 11z" fill="#d7262e"/>' +
        '<path d="M' + (r.x + 100) + ' ' + (r.y + 116) + 'l10-9h7l-10 9 10 9h-7z" fill="#d7262e"/>';
    } else if (i === 10) {
      var jx = r.x + 44, jy = r.y, js = 86;
      o += '<rect x="' + jx + '" y="' + jy + '" width="' + js + '" height="' + js + '" fill="#f3901d" stroke="' + LINE + '" stroke-width="1.8"/>';
      // the cell, turned on the diagonal like the real board: IN, a barred window with a prisoner, JAIL
      o += '<g transform="translate(' + (jx + js / 2) + ' ' + (jy + js / 2) + ') rotate(45)">' +
        '<rect x="-28" y="-24" width="56" height="40" fill="#fff" stroke="' + INK + '" stroke-width="1.8"/>' +
        pth('M-21 16C-19 9-12 6-7 6H7C12 6 19 9 21 16Z', '#fff', 1.5) + pth('M-4 6L0 11L4 6', 'none', 1.2) +
        pth('M-9-9C-9-20 9-20 9-9V-2C9 4 4 6 0 6C-4 6-9 4-9-2Z', '#fff', 1.7) +
        circ(-3.4, -8, 1.1, INK, .4) + circ(3.4, -8, 1.1, INK, .4) + pth('M0-7V-2.5H2M-3.4 2Q0 0 3.4 2M-5.5-11.5L-2-11M5.5-11.5L2-11', 'none', 1.3) +
        [-21, -10.5, 0, 10.5, 21].map(function (b) { return '<rect x="' + (b - 1.5) + '" y="-24" width="3" height="40" fill="' + INK + '"/>'; }).join('') +
        '<ellipse cx="-10.5" cy="1" rx="3.8" ry="4.6" fill="#fff" stroke="' + INK + '" stroke-width="1.4"/><ellipse cx="10.5" cy="1" rx="3.8" ry="4.6" fill="#fff" stroke="' + INK + '" stroke-width="1.4"/>' +
        pth('M-14.3-0.5H-10.5M-14.3 2.5H-10.5M14.3-0.5H10.5M14.3 2.5H10.5', 'none', 1) +
        t(0, -29, 'IN', 13, { ls: 1 }) + t(0, 33, 'JAIL', 14, { ls: 1 }) + '</g>';
      o += t(r.x + 22, r.y + 60, 'JUST', 12, { tr: 'rotate(90 ' + (r.x + 22) + ' ' + (r.y + 60) + ')', ls: 1.5 });
      o += t(r.x + 82, r.y + r.h - 11, 'VISITING', 12, { ls: 1.5 });
    } else if (i === 20) {
      o += '<g transform="rotate(135 ' + cx + ' ' + cy + ') rotate(180 ' + cx + ' ' + cy + ')">' +
        t(cx, cy - 30, 'FREE', 19, { ls: 1.5 }) + icon('car', cx, cy + 2, 1.15) + t(cx, cy + 44, 'PARKING', 19, { ls: 1.5 }) + '</g>';
    } else if (i === 30) {
      o += '<g transform="rotate(45 ' + cx + ' ' + cy + ')">' +
        t(cx, cy - 30, 'GO TO', 19, { ls: 1.5 }) + icon('cop', cx, cy + 1, 0.98) + t(cx, cy + 46, 'JAIL', 21, { ls: 2 }) + '</g>';
    }
    return o;
  }
  // ── Centre: card piles and the name ──
  function deckSpot(x, y, rot, kind) {
    var w = 170, h = 108, col = kind === 'ch' ? '#f3901d' : '#7fc4ea';
    return '<g transform="translate(' + x + ' ' + y + ') rotate(' + rot + ')">' +
      '<rect x="' + (-w / 2 - 8) + '" y="' + (-h / 2 - 8) + '" width="' + (w + 16) + '" height="' + (h + 16) + '" rx="8" fill="none" stroke="' + INK + '" stroke-width="1.4" stroke-dasharray="6 5" opacity=".55"/>' +
      '<g class="deck-' + kind + '">' +
      [3, 2, 1].map(function (k) { return '<rect x="' + (-w / 2 + k * 1.6) + '" y="' + (-h / 2 + k * 1.6) + '" width="' + w + '" height="' + h + '" rx="7" fill="' + col + '" stroke="rgba(0,0,0,.35)" stroke-width="1"/>'; }).join('') +
      '<rect x="' + (-w / 2) + '" y="' + (-h / 2) + '" width="' + w + '" height="' + h + '" rx="7" fill="' + col + '" stroke="rgba(0,0,0,.4)" stroke-width="1.2"/>' +
      '<rect x="' + (-w / 2 + 6) + '" y="' + (-h / 2 + 6) + '" width="' + (w - 12) + '" height="' + (h - 12) + '" rx="4" fill="none" stroke="rgba(255,255,255,.75)" stroke-width="2"/>' +
      (kind === 'ch' ? t(0, 26, '?', 74, { f: 'var(--display),Lilita One,sans-serif', w: 400, c: '#fff' }) : icon('chest', 0, 2, 1.25)) +
      '</g>' + t(0, h / 2 + 26, kind === 'ch' ? 'CHANCE' : 'COMMUNITY CHEST', 15, { ls: 2 }) + '</g>';
  }
  function centre() {
    var o = '';
    o += deckSpot(330, 330, -45, 'cc') + deckSpot(670, 670, -45, 'ch');
    // the logo across the middle: its red band centred on the board (band centre sits at 49.7% / 60.6% of the image)
    var lw = 520, lh = lw * 288 / 1066;
    o += '<g transform="rotate(-45 500 500)"><image href="../img/monopoly-logo.webp" x="' + (494 - .497 * lw).toFixed(1) + '" y="' + (494 - .606 * lh).toFixed(1) +
      '" width="' + lw + '" height="' + lh.toFixed(1) + '" style="filter:drop-shadow(3px 4px 0 rgba(0,0,0,.35))"/></g>';
    return o;
  }
  var boardCache = null;
  function board() {
    if (boardCache) return boardCache;
    var s = '<svg class="bsvg" viewBox="0 0 1000 1000" aria-hidden="true">' +
      '<defs><radialGradient id="mbg" cx="50%" cy="45%" r="70%"><stop offset="0" stop-color="#e4f2df"/><stop offset="1" stop-color="#cfe5ca"/></radialGradient>' +
      '<pattern id="mgrain" width="6" height="6" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".6" fill="rgba(0,0,0,.035)"/><circle cx="4" cy="4" r=".5" fill="rgba(255,255,255,.25)"/></pattern></defs>' +
      '<rect width="1000" height="1000" fill="url(#mbg)"/>';
    for (var i = 0; i < 40; i++) s += square(i);
    s += '<rect x="' + C + '" y="' + C + '" width="' + (1000 - 2 * C) + '" height="' + (1000 - 2 * C) + '" fill="url(#mbg)" stroke="' + LINE + '" stroke-width="2.4"/>';
    s += centre();
    s += '<rect width="1000" height="1000" fill="url(#mgrain)" pointer-events="none"/>';
    s += '<rect x="1" y="1" width="998" height="998" fill="none" stroke="' + LINE + '" stroke-width="3"/>';
    // tap targets, one per square
    for (var k = 0; k < 40; k++) { var r = rectOf(k); s += '<rect class="hit" data-sq="' + k + '" x="' + r.x.toFixed(1) + '" y="' + r.y.toFixed(1) + '" width="' + r.w.toFixed(1) + '" height="' + r.h.toFixed(1) + '" fill="transparent"/>'; }
    return (boardCache = s + '</svg>');
  }

  // ── Houses and hotels (3D-ish), drawn at x, y (centre bottom) ──
  function house(x, y, s, cls) {
    s = s || 1;
    return '<g class="bld' + (cls ? ' ' + cls : '') + '" transform="translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ') scale(' + s + ')">' +
      '<ellipse cx="1" cy="0.5" rx="8" ry="2.2" fill="rgba(0,0,0,.3)"/>' +
      '<path d="M3 0V-8l4-4V-3z" fill="#155e2b"/>' +                      // side
      '<path d="M-7 0V-8h10V0z" fill="#2ba24c"/>' +                        // front
      '<path d="M-8-8l6-7 6 7z" fill="#3cc463"/><path d="M4-8l-6-7 6-1 5 4z" fill="#1d7a37"/>' +   // roof
      '<path d="M-7-8h10" stroke="rgba(255,255,255,.35)" stroke-width=".8"/></g>';
  }
  function hotel(x, y, s, cls) {
    s = s || 1;
    return '<g class="bld' + (cls ? ' ' + cls : '') + '" transform="translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ') scale(' + s + ')">' +
      '<ellipse cx="2" cy="0.5" rx="17" ry="2.6" fill="rgba(0,0,0,.3)"/>' +
      '<path d="M13 0V-10l4-4V-4z" fill="#7d1010"/>' +
      '<path d="M-15 0V-10h28V0z" fill="#d42a2a"/>' +
      '<path d="M-16-10l7-7h21l-1 7z" fill="#ef4b4b"/><path d="M13-10l-1-7 5 3z" fill="#9a1717"/>' +
      '<path d="M-11-6h3M-5-6h3M1-6h3M7-6h3" stroke="rgba(255,255,255,.55)" stroke-width="1.6"/></g>';
  }
  // where the buildings go on square i (in the colour bar)
  function buildings(i, n, popK) {
    var r = rectOf(i), o = '', side = r.side;
    var bar = side === 'b' ? { x: r.x + r.w / 2, y: r.y + BAR / 2 + 7, dx: 1, dy: 0 } : side === 't' ? { x: r.x + r.w / 2, y: r.y + r.h - BAR / 2 + 7, dx: 1, dy: 0 } :
      side === 'l' ? { x: r.x + r.w - BAR / 2, y: r.y + r.h / 2 + 7, dx: 0, dy: 1 } : { x: r.x + BAR / 2, y: r.y + r.h / 2 + 7, dx: 0, dy: 1 };
    if (n === 5) return hotel(bar.x - 1, bar.y, side === 'l' || side === 'r' ? 0.7 : 1, popK != null ? 'pop' : '');
    var step = side === 'l' || side === 'r' ? 18.5 : 18.5;
    for (var k = 0; k < n; k++) {
      var off = (k - (n - 1) / 2) * step;
      o += house(bar.x + off * bar.dx, bar.y + off * bar.dy, 0.95, popK === k ? 'pop' : '');
    }
    return o;
  }

  // ── Metal tokens (64 × 64, base at the bottom) ──
  var TOK = {
    hat: '<ellipse cx="32" cy="50" rx="25" ry="7"/><path d="M19 49V16c0-3 6-5 13-5s13 2 13 5v33z"/><ellipse cx="32" cy="16" rx="13" ry="4" class="hl"/><path d="M19 39h26v6H19z" class="dk"/>',
    car: '<path d="M5 44c0-6 3-9 9-10l8-10c2-2 4-3 7-3h10c3 0 6 1 8 3l7 9c6 1 9 4 9 10v6H5z"/><path d="M24 26h7v8H18zM35 26h7l6 8H35z" class="dk"/><circle cx="17" cy="50" r="7"/><circle cx="47" cy="50" r="7"/><circle cx="17" cy="50" r="2.6" class="dk"/><circle cx="47" cy="50" r="2.6" class="dk"/>',
    dog: '<path d="M8 50l2-14c1-6 4-10 10-11l14-1 4-8 3-7 3 6 3-2 2 6c4 1 7 4 7 8l-6 2-3 0-1 4c3 3 4 8 3 17h-6l-1-10-14 1-2 9h-6l-1-8-6-2-2 10z"/><circle cx="47" cy="22" r="1.6" class="dk"/><path d="M44 30l7 4" class="ln"/><path d="M10 37l-6-12" class="ln2"/>',
    ship: '<path d="M3 40h58l-8 13H12z"/><path d="M14 40v-8h30v8z"/><path d="M22 32v-9h14v9z"/><path d="M27 23v-9h3v9z"/><path d="M44 35h14" class="ln"/><path d="M8 33h10" class="ln"/><path d="M12 46h40" class="ln dk"/>',
    boot: '<path d="M18 6h18l1 28c1 4 4 6 10 7 7 1 12 4 12 10v3H12l1-8z"/><path d="M17 12h20" class="ln dk"/><path d="M14 46h44" class="ln dk"/><path d="M38 34l3-3M41 37l3-3" class="ln"/>',
    thimble: '<path d="M17 52l3-34c1-8 6-12 12-12s11 4 12 12l3 34z"/><path d="M15 52h34v4H15z" class="dk"/><g class="dots"><circle cx="26" cy="20" r="1.4"/><circle cx="32" cy="17" r="1.4"/><circle cx="38" cy="20" r="1.4"/><circle cx="25" cy="28" r="1.4"/><circle cx="32" cy="26" r="1.4"/><circle cx="39" cy="28" r="1.4"/><circle cx="24" cy="36" r="1.4"/><circle cx="32" cy="35" r="1.4"/><circle cx="40" cy="36" r="1.4"/><circle cx="23" cy="44" r="1.4"/><circle cx="32" cy="43" r="1.4"/><circle cx="41" cy="44" r="1.4"/></g>',
    iron: '<path d="M6 50c2-12 10-22 26-24l26-1v25z"/><path d="M24 26c0-8 4-12 10-12h12c4 0 6 3 6 6v6h-6v-5h-12c-3 0-4 2-4 5z"/><path d="M8 50h50" class="ln dk"/>',
    barrow: '<path d="M8 22h40l-6 18H18z"/><path d="M42 40l16 6" class="ln2"/><path d="M14 22L4 14" class="ln2"/><circle cx="48" cy="48" r="8"/><circle cx="48" cy="48" r="3" class="dk"/><path d="M20 40l-2 12" class="ln2"/>'
  };
  var TOK_NAME = { hat: 'Top hat', car: 'Race car', dog: 'Scottie dog', ship: 'Battleship', boot: 'Boot', thimble: 'Thimble', iron: 'Iron', barrow: 'Wheelbarrow' };
  function token(name) {
    return '<svg viewBox="0 0 64 64" class="tok-svg" aria-hidden="true"><g class="metal">' + (TOK[name] || TOK.hat) + '</g></svg>';
  }
  // shared gradients for the tokens (once per page)
  function defs() {
    return '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>' +
      '<linearGradient id="mtl" x1="0" y1="0" x2="0.35" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".28" stop-color="#d7dbe2"/><stop offset=".52" stop-color="#8e949e"/><stop offset=".7" stop-color="#e9ecf0"/><stop offset="1" stop-color="#666b74"/></linearGradient>' +
      '<linearGradient id="mtldk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7c818a"/><stop offset="1" stop-color="#3d4148"/></linearGradient>' +
      '</defs></svg>';
  }

  window.MonoArt = { rectOf: rectOf, centerOf: centerOf, slot: slot, board: board, buildings: buildings, house: house, hotel: hotel, token: token, defs: defs, TOK_NAME: TOK_NAME, icon: function (n) { return '<svg viewBox="-30 -30 60 60" aria-hidden="true">' + IC[n]() + '</svg>'; }, BAR: BAR, C: C, W: W };
})();
