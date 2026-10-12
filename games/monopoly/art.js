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
  // ── Icons (drawn around 0,0, about 40 units across) ──
  var IC = {
    train: function () {
      // a side-on steam locomotive heading left: boiler, stack, dome, cab, cowcatcher, wheels and rod
      var B = BOARD;
      return '<g fill="' + INK + '">' +
        '<path d="M-17-8h22v14h-22a3 3 0 0 1-3-3v-8a3 3 0 0 1 3-3z"/>' +                       // boiler
        '<path d="M-15-8v-7h-3l1-4h10l1 4h-3v7z"/>' +                                           // flared smokestack
        '<path d="M-5-8a3.5 3.5 0 0 1 7 0z"/>' +                                                 // steam dome
        '<rect x="-23" y="-6" width="3" height="4" rx="1"/>' +                                   // headlamp
        '<path d="M5-17h18v23h-18z"/><rect x="3" y="-20" width="22" height="3.5" rx="1"/>' +     // cab and roof
        '<rect x="10" y="-13" width="9" height="7" rx="1" fill="' + B + '"/>' +                 // cab window
        '<rect x="-21" y="6" width="45" height="3"/>' +                                          // frame
        '<path d="M-20 5v11h-11z"/>' +                                                         // cowcatcher
        '<circle cx="-14" cy="14" r="4"/><circle cx="1" cy="13" r="6.5"/><circle cx="16" cy="13" r="6.5"/>' +
        '<circle cx="-14" cy="14" r="1.6" fill="' + B + '"/><circle cx="1" cy="13" r="2.4" fill="' + B + '"/><circle cx="16" cy="13" r="2.4" fill="' + B + '"/>' +
        '<path d="M-14 14H16" stroke="' + B + '" stroke-width="1.4"/>' +                       // side rod
        '</g><g fill="' + INK + '" opacity=".38"><circle cx="-10" cy="-22.5" r="2.6"/><circle cx="-4" cy="-25.5" r="3.2"/><circle cx="3" cy="-27" r="2.6"/></g>';
    },
    bulb: function () {
      return '<path d="M0-20a14 14 0 0 1 8 25.5V10h-16V5.5A14 14 0 0 1 0-20z" fill="#ffe14d" stroke="' + INK + '" stroke-width="2.4"/>' +
        '<path d="M-5 0l3 4 2-5 2 5 3-4" fill="none" stroke="#a87600" stroke-width="1.6"/>' +
        '<rect x="-7" y="11" width="14" height="3.5" rx="1.5" fill="#888" stroke="' + INK + '" stroke-width="1.6"/><rect x="-6" y="15.5" width="12" height="3.5" rx="1.5" fill="#888" stroke="' + INK + '" stroke-width="1.6"/>' +
        '<path d="M-14-22l-4-4M14-22l4-4M0-25v-5M-19-8h-5M19-8h5" stroke="' + INK + '" stroke-width="2" stroke-linecap="round"/>';
    },
    tap: function () {
      return '<path d="M-20-6h22a10 10 0 0 1 10 10v4h-8v-4a2 2 0 0 0-2-2h-22z" fill="#9fb3c4" stroke="' + INK + '" stroke-width="2.2" stroke-linejoin="round"/>' +
        '<rect x="-6" y="-14" width="6" height="8" fill="#9fb3c4" stroke="' + INK + '" stroke-width="2"/><rect x="-14" y="-18" width="22" height="5" rx="2.5" fill="#c7d4de" stroke="' + INK + '" stroke-width="2"/>' +
        '<path d="M8 14q-3 5 0 7 3-2 0-7z" fill="#2e8de0"/><path d="M8 25q-2 3 0 4 2-1 0-4z" fill="#2e8de0"/><rect x="-24" y="-8" width="5" height="10" rx="1" fill="#6d7f8f" stroke="' + INK + '" stroke-width="2"/>';
    },
    chest: function () {
      return '<path d="M-18-4h36v18h-36z" fill="#9a5b2a" stroke="' + INK + '" stroke-width="2.2" stroke-linejoin="round"/>' +
        '<path d="M-18-4v-4a8 8 0 0 1 8-8h20a8 8 0 0 1 8 8v4z" fill="#b8733a" stroke="' + INK + '" stroke-width="2.2" stroke-linejoin="round"/>' +
        '<path d="M-10-16v30M10-16v30" stroke="#f2c12e" stroke-width="3"/><path d="M-18 2h36" stroke="' + INK + '" stroke-width="1.6"/>' +
        '<rect x="-4" y="-1" width="8" height="8" rx="1.5" fill="#f2c12e" stroke="' + INK + '" stroke-width="1.6"/><circle cx="0" cy="3" r="1.3" fill="' + INK + '"/>' +
        '<path d="M-6-20l2 3M6-20l-2 3M0-22v4" stroke="#f2c12e" stroke-width="1.8" stroke-linecap="round"/>';
    },
    ring: function () {
      return '<circle cx="0" cy="6" r="13" fill="none" stroke="#c9a227" stroke-width="5"/><circle cx="0" cy="6" r="13" fill="none" stroke="' + INK + '" stroke-width="1" opacity=".4"/>' +
        '<path d="M-8-12h16l5 6-13 12-13-12z" fill="#bfe9ff" stroke="' + INK + '" stroke-width="1.8" stroke-linejoin="round"/><path d="M-13-6h26M-4-12l-2 6 6 12 6-12-2-6" fill="none" stroke="' + INK + '" stroke-width="1.2" opacity=".6"/>';
    },
    diamond: function () {
      return '<path d="M0-22l18 22-18 22-18-22z" fill="none" stroke="' + INK + '" stroke-width="2.4"/>';
    },
    car: function () {
      return '<path d="M-30 6c0-6 4-8 10-9l8-8c2-2 4-3 7-3h12c3 0 5 1 7 3l7 8c7 1 10 3 10 9v5h-61z" fill="#d7262e" stroke="' + INK + '" stroke-width="2.2" stroke-linejoin="round"/>' +
        '<path d="M-10-9l5-5h8v9h-16zM6-14h7l6 9h-13z" fill="#bfe2f5" stroke="' + INK + '" stroke-width="1.6" stroke-linejoin="round"/>' +
        '<circle cx="-17" cy="11" r="7" fill="' + INK + '"/><circle cx="17" cy="11" r="7" fill="' + INK + '"/><circle cx="-17" cy="11" r="3" fill="#ccc"/><circle cx="17" cy="11" r="3" fill="#ccc"/>' +
        '<path d="M26 0h4" stroke="#ffd84a" stroke-width="3"/>';
    },
    lock: function () {
      return '<path d="M-10-4v-8a10 10 0 0 1 20 0v8" fill="none" stroke="' + INK + '" stroke-width="5"/>' +
        '<rect x="-16" y="-5" width="32" height="26" rx="4" fill="#f3901d" stroke="' + INK + '" stroke-width="2.4"/><circle cx="0" cy="5" r="3.5" fill="' + INK + '"/><path d="M0 7v7" stroke="' + INK + '" stroke-width="3"/>';
    }
  };
  function icon(name, x, y, s) { return '<g transform="translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ') scale(' + (s || 1) + ')">' + IC[name]() + '</g>'; }
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
    var ic = s.k === 'rr' ? 'train' : s.k === 'cc' ? 'chest' : i === 12 ? 'bulb' : i === 28 ? 'tap' : i === 38 ? 'ring' : null;
    if (!vert) {
      var top = r.side === 'b' ? r.y + 15 : r.y + r.h - 16 - (L.length - 1) * lh - 2;
      var mid = r.y + r.h / 2 + (r.side === 'b' ? 6 : -6);
      if (r.side === 't') { out += t(cx, r.y + 17, price, 12.5, { w: 600 }); out += names(cx, top); }
      else { out += names(cx, top); if (price) out += t(cx, r.y + r.h - 9, price, 12.5, { w: 600 }); }
      if (s.k === 'ch') out += t(cx, mid + 18, '?', 64, { f: 'var(--display),Lilita One,sans-serif', w: 400, c: QCOL[i] });
      else if (s.k === 'tax' && i === 4) out += icon('diamond', cx, mid + 2, 0.95) + t(cx, mid + 6, 'TAX', 12, {});
      else if (ic) out += icon(ic, cx, mid + 2, ic === 'train' ? 0.95 : 0.9);
    } else {
      var lx = r.side === 'l' ? r.x + 38 : r.x + r.w - 38, tx = r.side === 'l' ? r.x + r.w - 46 : r.x + 46;
      var ty = r.y + r.h / 2 - (L.length * lh) / 2 + 8;
      out += names(tx, ty - (price ? 6 : 0));
      if (price) out += t(tx, ty - 6 + L.length * lh + 3, price, 12, { w: 600 });
      if (s.k === 'ch') out += t(lx, r.y + r.h / 2 + 20, '?', 58, { f: 'var(--display),Lilita One,sans-serif', w: 400, c: QCOL[i] });
      else if (ic) out += icon(ic, lx, r.y + r.h / 2 + 2, 0.82);
    }
    return out;
  }
  // ── Corners ──
  function corner(i, r) {
    var cx = r.x + r.w / 2, cy = r.y + r.h / 2, o = '';
    if (i === 0) {
      o += '<g transform="rotate(-45 ' + cx + ' ' + cy + ')">' +
        t(cx, cy - 26, 'COLLECT $200', 12, { ls: .4 }) + t(cx, cy - 13, 'SALARY AS YOU PASS', 9.5, { ls: .3 }) +
        t(cx, cy + 30, 'GO', 56, { f: 'var(--display),Lilita One,sans-serif', w: 400, c: '#d7262e', ls: 2 }) + '</g>' +
        '<path d="M' + (r.x + 110) + ' ' + (r.y + 116) + 'H' + (r.x + 32) + '" stroke="#d7262e" stroke-width="9"/><path d="M' + (r.x + 14) + ' ' + (r.y + 116) + 'l20-13v26z" fill="#d7262e"/>';
    } else if (i === 10) {
      var jx = r.x + 44, jy = r.y, js = 86;
      o += '<rect x="' + jx + '" y="' + jy + '" width="' + js + '" height="' + js + '" fill="#f3901d" stroke="' + LINE + '" stroke-width="1.8"/>';
      o += '<rect x="' + (jx + 14) + '" y="' + (jy + 12) + '" width="' + (js - 28) + '" height="' + (js - 30) + '" fill="#fff6e0" stroke="' + LINE + '" stroke-width="1.4"/>';
      for (var b = 0; b < 5; b++) o += '<rect x="' + (jx + 18 + b * 11.5) + '" y="' + (jy + 12) + '" width="3.4" height="' + (js - 30) + '" fill="' + INK + '"/>';
      o += t(jx + js / 2, jy + js - 6, 'IN JAIL', 12, { ls: 1 });
      o += t(r.x + 22, r.y + 60, 'JUST', 12, { tr: 'rotate(90 ' + (r.x + 22) + ' ' + (r.y + 60) + ')', ls: 1.5 });
      o += t(r.x + 82, r.y + r.h - 11, 'VISITING', 12, { ls: 1.5 });
    } else if (i === 20) {
      o += '<g transform="rotate(135 ' + cx + ' ' + cy + ') rotate(180 ' + cx + ' ' + cy + ')">' +
        t(cx, cy - 30, 'FREE', 19, { ls: 1.5 }) + icon('car', cx, cy + 4, 1) + t(cx, cy + 44, 'PARKING', 19, { ls: 1.5 }) + '</g>';
    } else if (i === 30) {
      o += '<g transform="rotate(45 ' + cx + ' ' + cy + ')">' +
        t(cx, cy - 30, 'GO TO', 19, { ls: 1.5 }) + icon('lock', cx, cy + 4, 1) + t(cx, cy + 46, 'JAIL', 21, { ls: 2 }) + '</g>';
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
  // The name: Lexend Zetta Regular, its ink centred exactly on the band (centre 494,494).
  // Measured at 100px: ink runs x 18..821.4 and 72 above to 1 below the baseline; letter-spacing adds after each letter.
  function logo() {
    var fs = 55.9, ls = 1, k = fs / 100, sh = 2.5;
    var x = 494 - (839.4 * k + 7 * ls) / 2, y = 494 + 35.5 * k;
    function one(dx, c) { return '<text x="' + (x + dx).toFixed(1) + '" y="' + (y + dx).toFixed(1) + '" font-family="Monopoly Logo,sans-serif" font-weight="400" font-size="' + fs + '" fill="' + c + '" letter-spacing="' + ls + '">MONOPOLY</text>'; }
    return one(sh, '#1d1d1b') + one(0, '#fff');
  }
  function centre() {
    var o = '';
    o += deckSpot(330, 330, -45, 'cc') + deckSpot(670, 670, -45, 'ch');
    // the name across the middle, on a red band
    o += '<g transform="rotate(-45 500 500)">' +
      '<rect x="252" y="452" width="496" height="96" rx="6" fill="#1d1d1b"/>' +
      '<rect x="246" y="446" width="496" height="96" rx="6" fill="#d7262e" stroke="#fff" stroke-width="4"/>' +
      logo() + '</g>';
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
