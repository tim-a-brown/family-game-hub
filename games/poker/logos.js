// The logo printed across the felt at every place on the poker circuit: one per place, each drawn for it.
// PokerLogos.svg(key, {venue, city, style, series}) gives an <svg> (600 x 400, drawn in currentColor) or '' when the
// place has none. key: the place's room (sceneOf in poker.html), or the big-field event's id (glad, mmaker...).
(function () {
  var LOGOS = {}, SAMPLE = {};
  function E(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
// ── g1 ──
// Felt logos, batch g1: home games, club tourneys, series events
(function () {
  var C = 'currentColor';
  function svg(b) { return '<svg viewBox="0 0 600 400" xmlns="http://www.w3.org/2000/svg">' + b + '</svg>'; }
  // centred text; ex = extra attributes
  function tx(x, y, size, fam, s, ex) {
    return '<text x="' + x + '" y="' + y + '" font-size="' + size + '" font-family="' + fam + '" text-anchor="middle" fill="' + C + '"' + (ex || '') + '>' + s + '</text>';
  }
  // squeeze to max width when the estimated width (k = average glyph width in em) is too wide
  function fit(s, size, k, max, ls) {
    s = String(s); var w = s.length * size * k + (ls || 0) * s.length;
    return w > max ? ' textLength="' + max + '" lengthAdjust="spacingAndGlyphs"' : '';
  }
  // text along a path (id), centred on it
  function tp(id, size, fam, s, ex) {
    return '<text font-size="' + size + '" font-family="' + fam + '" text-anchor="middle" fill="' + C + '"' + (ex || '') + '><textPath href="#' + id + '" startOffset="50%">' + s + '</textPath></text>';
  }
  function ln(x1, y1, x2, y2, w, op) {
    return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="' + C + '" stroke-width="' + w + '" stroke-linecap="round"' + (op ? ' stroke-opacity="' + op + '"' : '') + '/>';
  }
  function pth(d, ex) { return '<path d="' + d + '"' + (ex || ' fill="' + C + '"') + '/>'; }
  function stk(w, op) { return ' fill="none" stroke="' + C + '" stroke-width="' + w + '" stroke-linecap="round" stroke-linejoin="round"' + (op ? ' stroke-opacity="' + op + '"' : ''); }
  function op(o) { return ' fill="' + C + '" fill-opacity="' + o + '"'; }
  function star(cx, cy, r) {
    var d = '';
    for (var i = 0; i < 10; i++) {
      var a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.42 : r;
      d += (i ? 'L' : 'M') + (cx + rr * Math.cos(a)).toFixed(1) + ' ' + (cy + rr * Math.sin(a)).toFixed(1);
    }
    return d + 'Z';
  }
  var SPADE = 'M0 -0.5C0.18 -0.28 0.5 -0.12 0.5 0.1C0.5 0.3 0.25 0.38 0.06 0.24L0.14 0.5L-0.14 0.5L-0.06 0.24C-0.25 0.38 -0.5 0.3 -0.5 0.1C-0.5 -0.12 -0.18 -0.28 0 -0.5Z';
  function up(s) { return String(s).toUpperCase(); }

  /* ── The festival's own look, shared by its four events: the season and the city ──
     Summer Series (Las Vegas): desert sun and the Welcome sign's starburst; Spring Series (Los Angeles): palms and
     jacaranda blossoms; Fall Series (Philadelphia): maple leaves and the Liberty Bell. */
  function season(o) { var t = String(o.series || ''); return /fall/i.test(t) ? 'fall' : /spring/i.test(t) ? 'spring' : 'summer'; }
  function r1(n) { return Math.round(n * 10) / 10; }
  var MAPLE = 'M0 -50L8 -34L18 -38L14 -14L30 -26L34 -18L48 -22L42 -6L50 -2L28 14L32 22L4 17L3 44L-3 44L-4 17L-32 22L-28 14L-50 -2L-42 -6L-48 -22L-34 -18L-30 -26L-14 -14L-18 -38L-8 -34Z';
  function at(x, y, rot, sc, inner) { return '<g transform="translate(' + r1(x) + ' ' + r1(y) + ') rotate(' + r1(rot || 0) + ') scale(' + sc + ')">' + inner + '</g>'; }
  function blossom() {   // five rounded petals, a pale heart (unit: about 100 across)
    var d = '';
    for (var i = 0; i < 5; i++) {
      var a = (i * 72 - 90) * Math.PI / 180, x = 25 * Math.cos(a), y = 25 * Math.sin(a);
      d += '<ellipse cx="' + r1(x) + '" cy="' + r1(y) + '" rx="24" ry="17" transform="rotate(' + (i * 72) + ' ' + r1(x) + ' ' + r1(y) + ')"/>';
    }
    return '<g fill="' + C + '">' + d + '</g><circle r="10" fill="#000" fill-opacity=".25"/>';
  }
  function sparkle() { return '<path d="M0 -50Q4 -4 50 0Q4 4 0 50Q-4 4 -50 0Q-4 -4 0 -50Z" fill="' + C + '"/>'; }
  function sun() {
    var r = '';
    for (var i = 0; i < 12; i++) r += '<path d="M-5 -34L0 -50L5 -34Z" transform="rotate(' + (i * 30) + ')" fill="' + C + '"/>';
    return r + '<circle r="26" fill="' + C + '"/>';
  }
  // one small piece of the season, scattered around a logo
  function bit(se, x, y, rot, sc, o) {
    var g = se === 'fall' ? '<path d="' + MAPLE + '" fill="' + C + '"/>' : se === 'spring' ? blossom() : sparkle();
    return '<g opacity="' + (o || 1) + '">' + at(x, y, rot, sc, g) + '</g>';
  }
  // a palm: a leaning trunk, fronds from the crown (base at x,y, height h)
  function palm(x, y, h, lean, w) {
    var tx2 = x + lean, ty = y - h, b = pth('M' + x + ' ' + y + 'Q' + r1(x + lean * 0.2) + ' ' + r1(y - h * 0.55) + ' ' + tx2 + ' ' + ty, stk(5 * (w || 1)));
    [-168, -140, -110, -70, -40, -12].forEach(function (a, i) {
      var L = h * (i === 2 || i === 3 ? 0.42 : 0.5);
      b += '<path d="M0 0Q' + r1(L / 2) + ' ' + r1(-L * 0.28) + ' ' + r1(L) + ' ' + r1(L * 0.12) + 'Q' + r1(L / 2) + ' ' + r1(-L * 0.05) + ' 0 0Z" fill="' + C + '" transform="translate(' + tx2 + ' ' + ty + ') rotate(' + a + ')"/>';
    });
    return b + '<circle cx="' + (tx2 - 3) + '" cy="' + (ty + 5) + '" r="' + r1(h * 0.04) + '" fill="' + C + '"/><circle cx="' + (tx2 + 4) + '" cy="' + (ty + 6) + '" r="' + r1(h * 0.04) + '" fill="' + C + '"/>';
  }
  // a poker chip with the season at its heart: the series' badge
  function chipBadge(se, cx, cy, r) {
    var b = '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '"' + op(0.22) + '/><circle cx="' + cx + '" cy="' + cy + '" r="' + r + '"' + stk(Math.max(3, r * 0.09)) + '/>';
    for (var i = 0; i < 8; i++) b += '<rect x="' + r1(cx - r * 0.13) + '" y="' + r1(cy - r) + '" width="' + r1(r * 0.26) + '" height="' + r1(r * 0.22) + '" fill="' + C + '" transform="rotate(' + (i * 45 + 22.5) + ' ' + cx + ' ' + cy + ')"/>';
    b += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r1(r * 0.7) + '"' + stk(Math.max(2, r * 0.05), 0.8) + '/>';
    var g = se === 'fall' ? '<path d="' + MAPLE + '" fill="' + C + '"/>' : se === 'spring' ? palm(0, 44, 84, 10, 1) : sun();
    return b + at(cx, cy + (se === 'fall' ? -r * 0.04 : 0), se === 'fall' ? -8 : 0, r1(r * 0.0105 * 100) / 100, g);
  }
  var LBN = 0;
  // the city's landmark, about 100 across at sc 1: the Liberty Bell (crack and all), two palms on the hills, the Welcome sign
  function landmark(se, cx, cy, sc) {
    var g;
    if (se === 'fall') {
      var id = 'lbell' + (++LBN);
      g = '<defs><mask id="' + id + '" maskUnits="userSpaceOnUse" x="-60" y="-60" width="120" height="120"><rect x="-60" y="-60" width="120" height="120" fill="#fff"/>' +
        '<path d="M3 -12L-3 -2L4 7L-3 16L2 27" fill="none" stroke="#000" stroke-width="3.5" stroke-linejoin="round"/>' +
        '<path d="M-24 -14Q0 -20 24 -14M-28 6Q0 0 28 6" fill="none" stroke="#000" stroke-width="2"/></mask></defs>' +
        '<path d="M-32 -46H32V-38H-32ZM-7 -38H7V-31H-7Z" fill="' + C + '"/>' +
        '<g mask="url(#' + id + ')"><path d="M-21 -31C-23 -8 -25 12 -37 22L-41 27H41L37 22C25 12 23 -8 21 -31Q0 -38 -21 -31Z" fill="' + C + '"/>' +
        '<path d="M-45 27H45V34Q0 38 -45 34Z" fill="' + C + '"/></g><circle cy="42" r="5" fill="' + C + '"/>';
    } else if (se === 'spring') {
      g = '<path d="M-60 40Q-30 18 -6 30Q20 12 60 40Z"' + op(0.45) + '/>' + palm(-16, 40, 86, -12, 0.9) + palm(18, 40, 70, 12, 0.8);
    } else {
      var bulbs = '';
      for (var i = 0; i < 16; i++) { var a = i * Math.PI / 8; bulbs += '<circle cx="' + r1(40 * Math.cos(a)) + '" cy="' + r1(20 * Math.sin(a)) + '" r="2.4" fill="' + C + '"/>'; }
      g = '<path d="M-50 0L-38 -22Q0 -32 38 -22L50 0L38 22Q0 32 -38 22Z"' + op(0.25) + '/><path d="M-50 0L-38 -22Q0 -32 38 -22L50 0L38 22Q0 32 -38 22Z"' + stk(4) + '/>' + bulbs +
        '<text y="6" font-size="17" font-family="\'Sofia Sans Condensed\'" font-weight="800" letter-spacing="1" text-anchor="middle" fill="' + C + '">LAS VEGAS</text>' +
        '<path d="M0 -28V-40" stroke="' + C + '" stroke-width="3"/>' + at(0, -50, 0, 0.26, sparkle()) + at(0, -50, 45, 0.16, sparkle());
    }
    return at(cx, cy, 0, sc, g);
  }

  /* ───────── HOME GAMES ───────── */

  // Kitchen Table: brush-lettered name over a gingham tablecloth the cards land on; a coffee mug and a stack of clay chips
  SAMPLE.kitchen = { venue: 'Kitchen Table', city: "Friday night at a friend's place", style: 'Home game' };
  LOGOS.kitchen = function (o) {
    var v = String(o.venue), b = '';
    b += '<defs><mask id="kitchen-m1"><rect width="600" height="400" fill="#fff"/>' +
      '<path d="' + SPADE + '" transform="translate(76 222) scale(28)" fill="#000"/></mask></defs>';
    b += '<g transform="rotate(-3 300 110)">' + tx(300, 124, 100, "'Caveat Brush'", E(v), fit(v, 100, 0.4, 440) + ' stroke="' + C + '" stroke-width="1.5"') +
      pth('M176 144Q300 128 426 138', stk(6)) + '</g>';
    // gingham tablecloth
    var g = '', X0 = 150, X1 = 450, Y0 = 164, Y1 = 264;
    for (var x = X0 + 5; x < X1; x += 20) g += 'M' + x + ' ' + Y0 + 'h10V' + Y1 + 'h-10Z';
    for (var y = Y0 + 5; y < Y1; y += 20) g += 'M' + X0 + ' ' + y + 'H' + X1 + 'v10H' + X0 + 'Z';
    b += '<path d="' + g + '"' + op(0.3) + '/><rect x="' + X0 + '" y="' + Y0 + '" width="' + (X1 - X0) + '" height="' + (Y1 - Y0) + '"' + stk(5) + '/>';
    if (o.city) b += tx(300, 316, 34, "'Caveat Brush'", E(o.city), fit(o.city, 34, 0.38, 420));
    // mug with steam (left), chips (right), both centred on the cloth
    b += '<g mask="url(#kitchen-m1)">' + pth('M46 190h60v42q0 22 -22 22h-16q-22 0 -22 -22z') + '</g>' + pth('M106 200h6a15 15 0 0 1 0 30h-6', stk(7));
    [62, 76, 90].forEach(function (x, i) { b += pth('M' + x + ' 178q-8 -9 0 -18t0 -18', stk(5, i === 1 ? 1 : 0.6)); });
    var cx = 510, hi = '', lo = '';
    for (var i = 0; i < 4; i++) {
      var yy = 246 - i * 19, sx = [0, 3, -2, 1][i];
      [[0, 12, 1], [12, 22, 0.35], [22, 58, 1], [58, 68, 0.35], [68, 80, 1]].forEach(function (s) {
        var r = 'M' + (cx - 40 + sx + s[0]) + ' ' + yy + 'h' + (s[1] - s[0]) + 'v13h-' + (s[1] - s[0]) + 'z'; if (s[2] < 1) lo += r; else hi += r;
      });
    }
    var ty = 246 - 3 * 19 + 1;
    b += '<path d="' + hi + '" fill="' + C + '"/><path d="' + lo + '"' + op(0.35) + '/>' +
      '<path fill-rule="evenodd" fill="' + C + '" d="M' + (cx - 39) + ' ' + ty + 'a40 12 0 1 0 80 0a40 12 0 1 0 -80 0ZM' + (cx - 26) + ' ' + ty + 'a27 7.5 0 1 0 54 0a27 7.5 0 1 0 -54 0Z"/>' +
      '<ellipse cx="' + (cx + 1) + '" cy="' + ty + '" rx="17" ry="4.5"' + op(0.5) + '/>';
    return svg(b);
  };

  // The Basement: a home-bar neon sign: "the" in a tube pill over the name, a neon staircase going down, the four suits
  SAMPLE.basement = { venue: 'The Basement Game', city: 'Game night at your cousin\'s', style: 'Home game' };
  LOGOS.basement = function (o) {
    var v = String(o.venue), the = /^the\s+/i.test(v), top = v.replace(/^the\s+/i, '').replace(/\s+(game|poker)$/i, '');
    function neon(inner) { return '<g stroke-opacity=".28" stroke-width="16">' + inner + '</g><g stroke-width="5">' + inner + '</g>'; }
    var T = ' fill="none" stroke="' + C + '" stroke-linecap="round" stroke-linejoin="round"', n = '';
    if (the) n += '<rect x="256" y="28" width="88" height="36" rx="18"' + T + '/>';
    // staircase down across the middle, ending in an arrow
    var d = 'M132 168';
    for (var i = 0; i < 5; i++) d += 'h52v16';
    d += 'h44v22M380 244l12 14l12 -14';
    n += '<path d="' + d.replace('M380 244l12 14l12 -14', 'M' + (132 + 5 * 52 + 32) + ' 246l12 14l12 -14') + '"' + T + '/>';
    var SU = [SPADE, 'M0 0.42C-0.5 0 -0.55 -0.35 -0.27 -0.45C-0.1 -0.5 0 -0.38 0 -0.28C0 -0.38 0.1 -0.5 0.27 -0.45C0.55 -0.35 0.5 0 0 0.42Z',
      'M0 -0.5L0.36 0L0 0.5L-0.36 0Z',
      'M-0.2 -0.22a0.2 0.2 0 1 0 0.4 0a0.2 0.2 0 1 0 -0.4 0ZM-0.44 0.1a0.2 0.2 0 1 0 0.4 0a0.2 0.2 0 1 0 -0.4 0ZM0.04 0.1a0.2 0.2 0 1 0 0.4 0a0.2 0.2 0 1 0 -0.4 0ZM0 0.12L0.12 0.48H-0.12Z'];
    SU.forEach(function (p, i) { n += '<path d="' + p + '" transform="translate(' + (195 + i * 70) + ' 316) scale(46)"' + T + ' vector-effect="non-scaling-stroke"/>'; });
    var word = '<text x="300" y="148" font-size="100" font-family="Tilt Neon" text-anchor="middle" fill="' + C + '"' + fit(top, 100, 0.5, 440) + '>' + E(top) + '</text>';
    var b = neon(n) + word.replace('fill="', 'stroke="' + C + '" stroke-width="14" stroke-opacity=".28" stroke-linejoin="round" fill="') + word;
    if (the) b += tx(300, 54, 28, "'Tilt Neon'", 'the', ' letter-spacing="2"');
    return svg(b);
  };

  // The Garage: the garage door itself (cards land on its panels) under a bolted shop sign in racing italics
  SAMPLE.garage = { venue: 'The Garage Game', city: 'Saturday at the neighbors\'', style: 'Home game' };
  LOGOS.garage = function (o) {
    var v = up(String(o.venue).replace(/\s+game$/i, '')), b = '';
    b += '<rect x="104" y="34" width="392" height="78" rx="8"' + stk(6) + '/>';
    [[122, 50], [478, 50], [122, 96], [478, 96]].forEach(function (p) { b += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="5" fill="' + C + '"/>'; });
    b += tx(300, 96, 60, "'Racing Sans One'", E(v), ' letter-spacing="1"' + fit(v, 60, 0.52, 320, 1));
    b += pth('M70 400V132H530V400', stk(9));
    var w = (424 - 3 * 10) / 4;
    [150, 204, 258, 312].forEach(function (y, r) {
      for (var c = 0; c < 4; c++) b += '<rect x="' + (88 + c * (w + 10)).toFixed(1) + '" y="' + y + '" width="' + w.toFixed(1) + '" height="44" rx="4"' + (r === 0 ? stk(5).replace('fill="none"', 'fill="' + C + '" fill-opacity=".3"') : stk(5)) + '/>';
    });
    b += '<rect x="276" y="368" width="48" height="10" rx="5" fill="' + C + '"/>';
    return svg(b);
  };

  // Dining Room: a place setting (the cards are on the plate), the chandelier above, a formal italic name
  SAMPLE.dining = { venue: 'Dining Room Poker', city: 'Saturday at the neighbors\'', style: 'Home game' };
  LOGOS.dining = function (o) {
    var v = String(o.venue).replace(/\s+poker$/i, ''), b = '';
    b += ln(300, 0, 300, 36, 5) + '<ellipse cx="300" cy="44" rx="9" ry="11" fill="' + C + '"/>' + '<rect x="296" y="50" width="8" height="40" fill="' + C + '"/>';
    b += pth('M262 84Q300 112 338 84Z');
    [['M300 88C268 106 222 102 216 72', 216], ['M300 88C286 98 262 94 258 70', 258], ['M300 88C314 98 338 94 342 70', 342], ['M300 88C332 106 378 102 384 72', 384]].forEach(function (a) {
      var x = a[1]; b += pth(a[0], stk(5)) + '<rect x="' + (x - 10) + '" y="64" width="20" height="8" rx="3" fill="' + C + '"/>' +
        '<rect x="' + (x - 4) + '" y="40" width="8" height="24"' + op(0.65) + '/>' + pth('M' + x + ' 22q7 9 0 14q-7 -5 0 -14Z');
    });
    [238, 279, 321, 362].forEach(function (x) { b += '<circle cx="' + x + '" cy="' + (x === 279 || x === 321 ? 108 : 102) + '" r="5"' + op(0.6) + '/>'; });
    b += '<circle cx="300" cy="112" r="6" fill="' + C + '"/>';
    b += '<ellipse cx="300" cy="200" rx="204" ry="74"' + stk(6) + '/><ellipse cx="300" cy="200" rx="180" ry="60"' + stk(4, 0.45) + '/>';
    var f = '';
    for (var i = 0; i < 4; i++) f += '<rect x="' + (44 + i * 9) + '" y="134" width="5" height="40" rx="2.5" fill="' + C + '"/>';
    f += pth('M43 170H80Q80 194 66 200V300Q66 308 61.5 308Q57 308 57 300V200Q43 194 43 170Z');
    b += f + pth('M538 132Q560 156 556 226H538Z') + '<rect x="538" y="222" width="18" height="86" rx="9" fill="' + C + '"/>';
    b += tx(300, 334, 66, "'Cormorant Garamond'", E(v), ' font-weight="700" font-style="italic"' + fit(v, 66, 0.42, 400));
    b += ln(206, 360, 282, 360, 4, 0.6) + ln(318, 360, 394, 360, 4, 0.6) + pth('M300 351L309 360L300 369L291 360Z');
    return svg(b);
  };

  // The Back Porch: string lights, the porch railing the cards sit on, rocking chairs either side, the river below
  SAMPLE.porch = { venue: 'The Back Porch Game', city: 'After the barbecue', style: 'Home game' };
  LOGOS.porch = function (o) {
    var v = String(o.venue).replace(/\s+game$/i, ''), b = '';
    b += pth('M6 26Q300 92 594 26', stk(4));
    for (var i = 1; i < 14; i++) {
      var t = i / 14, x = (1 - t) * (1 - t) * 6 + 2 * t * (1 - t) * 300 + t * t * 594, y = (1 - t) * (1 - t) * 26 + 2 * t * (1 - t) * 92 + t * t * 26;
      b += '<rect x="' + (x - 4).toFixed(1) + '" y="' + y.toFixed(1) + '" width="8" height="6" fill="' + C + '"/>' +
        '<ellipse cx="' + x.toFixed(1) + '" cy="' + (y + 15).toFixed(1) + '" rx="7" ry="9.5"' + op(i % 3 === 1 ? 1 : 0.55) + '/>';
    }
    b += tx(300, 142, 60, "'Leckerli One'", E(v), fit(v, 60, 0.5, 400));
    // railing
    var r = '';
    for (var bx = 152; bx <= 448; bx += 24) r += ln(bx, 172, bx, 246, 6, 0.7);
    b += r + '<rect x="128" y="162" width="344" height="10" rx="3" fill="' + C + '"/><rect x="128" y="246" width="344" height="8" rx="3" fill="' + C + '"/>' +
      '<rect x="120" y="156" width="18" height="104" rx="3" fill="' + C + '"/><rect x="462" y="156" width="18" height="104" rx="3" fill="' + C + '"/>';
    var chair = pth('M6 0Q12 40 18 64L20 120M14 64H74M71 64L73 118M16 32H64Q72 32 72 40V64M-6 110Q40 132 92 104', stk(7)) + '<circle cx="6" cy="0" r="6" fill="' + C + '"/>' +
      pth('M8 14L18 14M10 46H20', stk(5, 0.6));
    b += '<g transform="translate(30 150) scale(.85)">' + chair + '</g><g transform="translate(570 150) scale(-.85 .85)">' + chair + '</g>';
    if (o.city) b += tx(300, 298, 28, 'Fredoka', E(o.city), ' font-weight="600"' + fit(o.city, 28, 0.5, 330));
    [[326, 150, 1], [344, 180, 0.6], [362, 210, 0.4]].forEach(function (rw) {
      var d = 'M' + (300 - rw[1]) + ' ' + rw[0];
      for (var k = 0; k < rw[1] * 2 / 30; k++) d += k ? 't30 0' : 'q15 -8 30 0';
      b += pth(d, stk(5, rw[2]));
    });
    return svg(b);
  };

  /* ───────── CLUB TOURNEYS ───────── */

  // Lodge No. NNN: a lodge-hall portal: two columns under an arch, the name arched beneath it, the checkered
  // lodge floor the cards land on, the evening's cause on a ribbon
  SAMPLE.lodge = { venue: 'Lodge 512 Charity Night', city: 'Saturday night, members and guests', style: 'Club tourney' };
  LOGOS.lodge = function (o) {
    var v = String(o.venue), m = v.match(/^(lodge\s+\d+)\s*(.*)$/i), top = m ? m[1].replace(/lodge\s+(\d+)/i, 'Lodge No. $1') : v, sub = m ? m[2] : '', b = '';
    function col(cx) {
      return '<rect x="' + (cx - 34) + '" y="126" width="68" height="12" rx="3" fill="' + C + '"/>' +
        '<circle cx="' + (cx - 30) + '" cy="142" r="7" fill="' + C + '"/><circle cx="' + (cx + 30) + '" cy="142" r="7" fill="' + C + '"/>' +
        '<rect x="' + (cx - 24) + '" y="138" width="48" height="10"' + op(0.6) + '/>' +
        '<rect x="' + (cx - 21) + '" y="152" width="42" height="146"' + stk(5) + '/>' + ln(cx - 7, 162, cx - 7, 288, 4, 0.55) + ln(cx + 7, 162, cx + 7, 288, 4, 0.55) +
        '<rect x="' + (cx - 29) + '" y="300" width="58" height="12" rx="2" fill="' + C + '"/><rect x="' + (cx - 36) + '" y="314" width="72" height="12" rx="2" fill="' + C + '"/>';
    }
    b += col(80) + col(520);
    b += pth('M46 126A254 100 0 0 1 554 126', stk(7)) + pth('M288 6H312L308 30H292Z');
    // checkered floor
    var ck = '', s = 20, X0 = 140, Y0 = 164;
    for (var r = 0; r < 4; r++) for (var c = 0; c < 16; c++) if ((r + c) % 2 === 0) ck += 'M' + (X0 + c * s) + ' ' + (Y0 + r * s + 4) + 'h' + s + 'v' + s + 'h-' + s + 'Z';
    b += '<path d="' + ck + '"' + op(0.4) + '/>' + ln(X0, Y0, X0 + 16 * s, Y0, 5) + ln(X0, Y0 + 4 * s + 8, X0 + 16 * s, Y0 + 4 * s + 8, 5);
    b += '<defs><path id="lodge-a" d="M104 180A196 104 0 0 1 496 180"/></defs>';
    b += tp('lodge-a', 38, 'Cinzel Decorative', E(top), ' font-weight="900" letter-spacing="1"' + fit(top, 38, 0.74, 370, 1));
    if (sub) {
      b += pth('M156 282L122 282L134 302L122 322L156 322Z', op(0.35)) + pth('M444 282L478 282L466 302L478 322L444 322Z', op(0.35));
      b += pth('M150 270Q300 282 450 270V312Q300 324 150 312Z', stk(5));
      b += tx(300, 303, 24, "'Cinzel Decorative'", E(sub), ' font-weight="900" letter-spacing="2"' + fit(sub, 24, 0.72, 260, 2));
    }
    return svg(b);
  };

  // Post NNN: veterans' hall: bunting overhead, the flag the cards land on, chevrons, a sturdy slab-serif lockup
  SAMPLE.vfw = { venue: 'Post 512 Veterans Hall Tourney', city: 'In the big hall, after the fish fry', style: 'Club tourney' };
  LOGOS.vfw = function (o) {
    var v = String(o.venue), m = v.match(/^(post\s+\d+)\s*(.*)$/i), top = m ? m[1] : v, b = '';
    var l1 = m ? m[2].replace(/\s*(tourney|tournament|poker night|card night|fundraiser)$/i, '') : '';
    // bunting fan hanging from the top edge
    var n = 7, r1 = 46, r2 = 116, cx = 300;
    function P(r, a) { return (cx + r * Math.cos(a)).toFixed(1) + ' ' + (r * Math.sin(a)).toFixed(1); }
    for (var i = 0; i < n; i++) {
      var a1 = Math.PI * i / n, a2 = Math.PI * (i + 1) / n;
      b += '<path d="M' + P(r1, a1) + 'L' + P(r2, a1) + 'A' + r2 + ' ' + r2 + ' 0 0 1 ' + P(r2, a2) + 'L' + P(r1, a2) + 'A' + r1 + ' ' + r1 + ' 0 0 0 ' + P(r1, a1) + 'Z"' + op(i % 2 ? 0.35 : 1) + '/>';
    }
    b += '<path d="M' + (cx - 38) + ' 0A38 38 0 0 0 ' + (cx + 38) + ' 0Z"' + op(0.65) + '/>';
    // flag
    var FX = 140, FY = 156, FW = 320, FH = 91, sh = FH / 7, CW = 140, CH = sh * 4, st = '';
    for (var k = 0; k < 7; k += 2) { var yy = FY + k * sh, x0 = k < 4 ? FX + CW : FX; st += 'M' + x0 + ' ' + yy.toFixed(1) + 'H' + (FX + FW) + 'v' + sh.toFixed(1) + 'H' + x0 + 'Z'; }
    var stars = '';
    for (var rr = 0; rr < 2; rr++) for (var cc = 0; cc < 4; cc++) stars += star(FX + 22 + cc * 32 + (rr ? 16 : 0) - (rr ? 8 : 0), FY + 15 + rr * 22, 9);
    b += '<mask id="vfw-c"><rect width="600" height="400" fill="#fff"/><path d="' + stars + '" fill="#000"/></mask>';
    b += '<path d="' + st + '"' + op(0.45) + '/><rect x="' + FX + '" y="' + FY + '" width="' + CW + '" height="' + CH.toFixed(1) + '"' + op(0.75) + ' mask="url(#vfw-c)"/>' +
      '<rect x="' + FX + '" y="' + FY + '" width="' + FW + '" height="' + FH + '"' + stk(4) + '/>';
    [178, 200, 222].forEach(function (y) { b += pth('M52 ' + (y + 24) + 'L84 ' + y + 'L116 ' + (y + 24), stk(10)) + pth('M484 ' + (y + 24) + 'L516 ' + y + 'L548 ' + (y + 24), stk(10)); });
    // lockup under the flag
    b += tx(300, 318, 64, "'Alfa Slab One'", E(up(top)), ' letter-spacing="1"' + fit(top, 64, 0.7, 330, 1));
    if (l1) {
      var t = up(l1), hw = Math.min(170, t.length * 9.5);
      b += tx(300, 352, 24, 'Oswald', E(t), ' font-weight="600" letter-spacing="6"' + fit(t, 24, 0.42, 300, 6));
      b += pth(star(300 - hw - 22, 344, 10)) + pth(star(300 + hw + 22, 344, 10));
    }
    return svg(b);
  };

  // Firehouse NN: the fire-service cross with stencil-lettered scroll banners, the company on the lower scroll, a ladder
  SAMPLE.firehouse = { venue: 'Firehouse 13 Fundraiser', city: 'Raising money for a good cause', style: 'Club tourney' };
  LOGOS.firehouse = function (o) {
    var v = String(o.venue), m = v.match(/^(firehouse\s+\d+)\s*(.*)$/i), name = m ? m[1] : v.replace(/\s+(fundraiser|tourney|night)$/i, ''), sub = 'Engine Company', b = '';
    var arm = [[-26, -26], [-76, -180], [0, -150], [76, -180]], d = '';
    for (var k = 0; k < 4; k++) {
      var R = function (p) { var x = p[0], y = p[1]; for (var j = 0; j < k; j++) { var t = x; x = -y; y = t; } return (300 + x) + ' ' + (200 + y); };
      d += (k ? 'L' : 'M') + R(arm[0]) + 'L' + R(arm[1]) + 'Q' + R(arm[2]) + ' ' + R(arm[3]);
    }
    var B1 = 'M96 78Q300 52 504 78V126Q300 100 96 126Z', B2 = 'M156 284Q300 302 444 284V320Q300 338 156 320Z';
    b += '<mask id="firehouse-x"><rect width="600" height="400" fill="#fff"/><path d="' + B1 + B2 + '" fill="#000" stroke="#000" stroke-width="8"/></mask>' +
      '<path d="' + d + 'Z" fill="' + C + '" fill-opacity=".3" stroke="' + C + '" stroke-width="7" stroke-linejoin="round" mask="url(#firehouse-x)"/>';
    b += ln(286, 346, 286, 382, 5) + ln(314, 346, 314, 382, 5) + ln(286, 358, 314, 358, 5) + ln(286, 370, 314, 370, 5);
    b += '<defs><path id="firehouse-p1" d="M96 118Q300 92 504 118"/><path id="firehouse-p2" d="M156 314Q300 332 444 314"/>' +
      '<mask id="firehouse-k"><rect width="600" height="400" fill="#fff"/>' +
      '<text font-family="Big Shoulders Stencil Display" font-weight="900" font-size="46" letter-spacing="4" text-anchor="middle" fill="#000"' + fit(name, 46, 0.48, 370, 4) + '><textPath href="#firehouse-p1" startOffset="50%">' + E(up(name)) + '</textPath></text>' +
      '<text font-family="Big Shoulders Stencil Display" font-weight="900" font-size="30" letter-spacing="5" text-anchor="middle" fill="#000"' + fit(sub, 30, 0.46, 250, 5) + '><textPath href="#firehouse-p2" startOffset="50%">' + E(up(sub)) + '</textPath></text>' +
      '</mask></defs>';
    var tails = pth('M100 86L58 92L74 110L58 130L100 126Z', op(0.55)) + pth('M500 86L542 92L526 110L542 130L500 126Z', op(0.55)) +
      pth('M160 288L128 292L140 306L128 322L160 320Z', op(0.55)) + pth('M440 288L472 292L460 306L472 322L440 320Z', op(0.55));
    b += tails + '<g mask="url(#firehouse-k)">' + pth(B1) + pth(B2) + '</g>';
    return svg(b);
  };

  // Country Club: a laurel wreath around the table, the name arched in Bodoni, a script monogram where the cards land,
  // crossed golf clubs tying the wreath
  SAMPLE.countryclub = { venue: 'Country Club Card Night', city: 'Saturday night, members and guests', style: 'Club tourney' };
  LOGOS.countryclub = function (o) {
    var v = String(o.venue), m = v.match(/^(.*?club)\b/i), top = m ? m[1] : v.replace(/\s+(card night|poker night|tourney)$/i, ''), b = '';
    var mono = top.split(/\s+/).filter(function (x) { return /^[a-z]/i.test(x) && !/^(the|of)$/i.test(x); }).map(function (x) { return x[0].toUpperCase(); }).join('').slice(0, 3);
    var cx = 300, cy = 205, rx = 252, ry = 150;
    function pt(a) { return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)]; }
    function branch(a0, a1, dir) {
      var p0 = pt(a0), p1 = pt(a1), s = '<path d="M' + p0[0].toFixed(1) + ' ' + p0[1].toFixed(1) + 'A' + rx + ' ' + ry + ' 0 0 ' + (dir > 0 ? 1 : 0) + ' ' + p1[0].toFixed(1) + ' ' + p1[1].toFixed(1) + '"' + stk(5) + '/>';
      for (var i = 0; i <= 9; i++) {
        var a = a0 + (a1 - a0) * i / 9, p = pt(a), g = Math.atan2(ry * Math.cos(a) * dir, -rx * Math.sin(a) * dir), sc = 1 - i * 0.035;
        [-0.75, 0.75].forEach(function (off) {
          var la = g + off, lx = p[0] + Math.cos(la) * 15 * sc, ly = p[1] + Math.sin(la) * 15 * sc;
          s += '<ellipse cx="' + lx.toFixed(1) + '" cy="' + ly.toFixed(1) + '" rx="' + (17 * sc).toFixed(1) + '" ry="' + (6.5 * sc).toFixed(1) + '" transform="rotate(' + (la * 180 / Math.PI).toFixed(1) + ' ' + lx.toFixed(1) + ' ' + ly.toFixed(1) + ')"' + op(0.85) + '/>';
        });
      }
      var e = pt(a1); s += '<circle cx="' + e[0].toFixed(1) + '" cy="' + e[1].toFixed(1) + '" r="6" fill="' + C + '"/>';
      return s;
    }
    var D = Math.PI / 180;
    b += branch(104 * D, 200 * D, 1) + branch(76 * D, -20 * D, -1);
    // crossed clubs where the branches meet
    b += ln(270, 318, 330, 378, 5) + ln(330, 318, 270, 378, 5) + ln(270, 318, 278, 326, 9) + ln(330, 318, 322, 326, 9) +
      pth('M326 374L348 378L346 387L323 382Z') + pth('M274 374L252 378L254 387L277 382Z') + '<circle cx="300" cy="384" r="7" fill="' + C + '"/>';
    b += '<defs><path id="countryclub-a" d="M92 176A218 124 0 0 1 508 176"/></defs>';
    b += tp('countryclub-a', 38, 'Bodoni Moda', E(up(top)), ' font-weight="700" letter-spacing="6"' + fit(top, 38, 0.72, 380, 6));
    if (mono) b += tx(300, 252, 124, "'Pinyon Script'", E(mono), ' stroke="' + C + '" stroke-width="2.5" letter-spacing="-24"');
    return svg(b);
  };

  // Elm Street Rec Center: center court: the name wrapped round the center circle like a gym-floor seal, the keys at the sides
  SAMPLE.rec = { venue: 'Elm Street Rec Center Tourney', city: 'Folding tables and a coffee urn', style: 'Club tourney' };
  LOGOS.rec = function (o) {
    var v = String(o.venue), m = v.match(/^(.*?)\s+(rec(?:reation)? center)\b/i), l1 = m ? m[1] : v.replace(/\s+(tourney|tournament)$/i, ''), l2 = m ? m[2] : '', b = '';
    [0, 1].forEach(function (s) {
      var g = s ? ' transform="translate(600 0) scale(-1 1)"' : '';
      b += '<g' + g + '><rect x="-10" y="160" width="70" height="80"' + op(0.3) + ' stroke="' + C + '" stroke-width="6"/>' + ln(8, 200, 22, 200, 6) + '<circle cx="32" cy="200" r="10"' + stk(5) + '/></g>';
    });
    b += '<ellipse cx="300" cy="200" rx="178" ry="112"' + stk(6) + '/><circle cx="300" cy="200" r="70"' + stk(6) + '/>' + ln(300, 88, 300, 312, 6);
    b += '<circle cx="96" cy="200" r="7" fill="' + C + '"/><circle cx="504" cy="200" r="7" fill="' + C + '"/>';
    b += '<defs><path id="rec-t" d="M106 200A194 134 0 0 1 494 200"/><path id="rec-b" d="M86 200A214 170 0 0 0 514 200"/></defs>';
    b += tp('rec-t', 48, 'Graduate', E(up(l1)), ' letter-spacing="4" stroke="' + C + '" stroke-width="1.2"' + fit(l1, 48, 0.62, 380, 4));
    if (l2) b += tp('rec-b', 48, 'Graduate', E(up(l2)), ' letter-spacing="4" stroke="' + C + '" stroke-width="1.2"' + fit(l2, 48, 0.62, 380, 4));
    return svg(b);
  };

  /* ───────── SERIES EVENTS ───────── */

  // Gladiators of Poker: a crested helmet over the Colosseum (the cards land in the arena), gladius swords, Roman capitals
  SAMPLE.glad = { venue: 'Gladiators of Poker', city: 'Las Vegas', style: 'Gladiators', series: 'Summer Series' };
  LOGOS.glad = function (o) {
    var v = String(o.venue), m = v.match(/^(.*?)\s+(of\s+.*)$/i), l1 = m ? m[1] : v, l2 = m ? m[2] : '', b = '';
    var cut = '';
    for (var x = 234; x <= 366; x += 11) cut += '<line x1="' + x + '" y1="4" x2="' + x + '" y2="62" stroke="#000" stroke-width="3.5"/>';
    b += '<defs><mask id="glad-m"><rect width="600" height="400" fill="#fff"/>' + cut + '</mask><mask id="glad-v"><rect width="600" height="400" fill="#fff"/>';
    for (var gx = 266; gx < 336; gx += 13) for (var gy = 126; gy < 142; gy += 8) b += '<rect x="' + gx + '" y="' + gy + '" width="7" height="4.5" fill="#000"/>';
    b += '</mask></defs>';
    b += '<path d="M222 78C224 26 258 8 300 8C342 8 376 26 378 78Z"' + op(0.8) + ' mask="url(#glad-m)"/>';
    b += '<rect x="230" y="68" width="140" height="12" rx="5" fill="' + C + '"/>';
    b += pth('M246 116C246 72 354 72 354 116Z') + pth('M194 116Q300 102 406 116L398 130Q300 114 202 130Z');
    b += '<rect x="258" y="120" width="84" height="26" rx="5" fill="' + C + '" mask="url(#glad-v)"/>';
    // Colosseum: two arcaded tiers, the right end broken away
    var F = 'M118 252V164H392V180H436V198H482V252Z', holes = '';
    for (var i = 0; i < 9; i++) {
      var ax = 128 + i * 40;
      if (ax + 24 < 392 || (ax + 24 < 436 && i < 8)) holes += 'M' + ax + ' 206V190A12 12 0 0 1 ' + (ax + 24) + ' 190V206Z';
      holes += 'M' + ax + ' 246V228A12 12 0 0 1 ' + (ax + 24) + ' 228V246Z';
    }
    b += '<path fill-rule="evenodd" d="' + F + holes + '"' + op(0.4) + '/>' +
      '<rect x="112" y="158" width="286" height="7" fill="' + C + '"/><rect x="112" y="210" width="376" height="7" fill="' + C + '"/><rect x="108" y="250" width="384" height="8" fill="' + C + '"/>';
    function sword(c) {
      return pth('M' + (c - 8) + ' 150Q' + (c - 13) + ' 246 ' + c + ' 318Q' + (c + 13) + ' 246 ' + (c + 8) + ' 150Z', op(0.85)) +
        '<rect x="' + (c - 26) + '" y="138" width="52" height="12" rx="5" fill="' + C + '"/>' +
        '<rect x="' + (c - 6) + '" y="102" width="12" height="36" rx="3"' + op(0.7) + '/>' + ln(c - 6, 114, c + 6, 114, 4) + ln(c - 6, 126, c + 6, 126, 4) +
        '<circle cx="' + c + '" cy="94" r="11" fill="' + C + '"/>';
    }
    b += sword(60) + sword(540);
    b += tx(300, 318, 64, "'Castoro Titling'", E(up(l1)), ' stroke="' + C + '" stroke-width="1.5" letter-spacing="1"' + fit(l1, 64, 0.78, 400, 1));
    if (l2) {
      var hw = l2.length * 12 + 14;
      b += tx(300, 350, 24, "'Castoro Titling'", E(up(l2)), ' letter-spacing="6" stroke="' + C + '" stroke-width="1"') + ln(160, 342, 300 - hw, 342, 4) + ln(300 + hw, 342, 440, 342, 4);
    }
    if (o.series) {
      var se = season(o);
      b += chipBadge(se, 150, 66, 40) + chipBadge(se, 450, 66, 40);
      b += tx(300, 377, 18, "'Sofia Sans Condensed'", E(up(o.series)), ' font-weight="700" letter-spacing="6"');
      var sw = String(o.series).length * 17.2 / 2 + 22; b += bit(se, 300 - sw, 371, -24, 0.26) + bit(se, 300 + sw, 371, 24, 0.26);
    }
    return svg(b);
  };

  // Millionaire Maker: the felt is a banknote: engraved border, the name in the top band, "1M" seals, the cards in the portrait oval
  SAMPLE.mmaker = { venue: 'Millionaire Maker', city: 'Las Vegas', style: 'Millionaire Maker', series: 'Summer Series' };
  LOGOS.mmaker = function (o) {
    var v = String(o.venue), b = '';
    b += '<rect x="40" y="44" width="520" height="312" rx="46"' + stk(6) + '/>';
    b += '<rect x="54" y="58" width="492" height="284" rx="34" fill="none" stroke="' + C + '" stroke-width="10" stroke-dasharray="4 5" stroke-opacity=".6"/>';
    b += '<rect x="70" y="74" width="460" height="252" rx="22"' + stk(4, 0.7) + '/>';
    b += '<ellipse cx="300" cy="206" rx="160" ry="54"' + stk(5) + '/><ellipse cx="300" cy="206" rx="146" ry="44"' + stk(4, 0.45) + '/>';
    [[104, 206], [496, 206]].forEach(function (p) {
      var d = '';
      for (var i = 0; i < 24; i++) { var a = i * Math.PI / 12, r = i % 2 ? 27 : 33; d += (i ? 'L' : 'M') + (p[0] + r * Math.cos(a)).toFixed(1) + ' ' + (p[1] + r * Math.sin(a)).toFixed(1); }
      b += '<path d="' + d + 'Z" fill="' + C + '" fill-opacity=".3" stroke="' + C + '" stroke-width="4" stroke-linejoin="round"/>' + tx(p[0], p[1] + 10, 28, "'Old Standard TT'", '1M', ' font-weight="700"');
    });
    if (o.series) {
      var se = season(o);
      b += tx(300, 97, 16, "'Share Tech Mono'", E(up(o.series)), ' letter-spacing="6"');
      b += '<g opacity=".5">' + landmark(se, 300, 214, 0.78) + '</g>';
      b += bit(se, 104, 106, -30, 0.3, 0.8) + bit(se, 496, 106, 30, 0.3, 0.8) + bit(se, 104, 296, 200, 0.3, 0.8) + bit(se, 496, 296, 160, 0.3, 0.8);
    }
    b += tx(300, 138, 38, "'Old Standard TT'", E(up(v)), ' font-weight="700" letter-spacing="2"' + fit(v, 38, 0.7, 420, 2));
    b += tx(300, 298, 24, "'Old Standard TT'", 'ONE MILLION', ' font-weight="700" letter-spacing="10"');
    return svg(b);
  };

  // Monster Stack: a justified block lockup in heavy caps, a giant chip under the cards, towering chip stacks either side
  SAMPLE.monster = { venue: 'Monster Stack', city: 'Las Vegas', style: 'Monster Stack', series: 'Summer Series' };
  LOGOS.monster = function (o) {
    var v = String(o.venue), w = v.split(/\s+/), l1 = w.length > 1 ? w.slice(0, -1).join(' ') : v, l2 = w.length > 1 ? w[w.length - 1] : '', b = '';
    function tower(cx, n, base, seed) {
      var s = '', top = 0, hi = '', lo = '', tj = 0;
      for (var i = 0; i < n; i++) {
        var y = base - i * 19, jx = Math.round(Math.sin(i * 1.7 + seed) * 4);
        [[0, 12, 1], [12, 22, 0.35], [22, 54, 1], [54, 64, 0.35], [64, 76, 1]].forEach(function (p) {
          var r = 'M' + (cx - 38 + jx + p[0]) + ' ' + y + 'h' + (p[1] - p[0]) + 'v14h-' + (p[1] - p[0]) + 'z';
          if (p[2] < 1) lo += r; else hi += r;
        });
        top = y; tj = jx;
      }
      s += '<path d="' + hi + '" fill="' + C + '"/><path d="' + lo + '"' + op(0.35) + '/>';
      s += '<path fill-rule="evenodd" fill="' + C + '" d="M' + (cx - 38 + tj) + ' ' + top + 'a38 10 0 1 0 76 0a38 10 0 1 0 -76 0ZM' + (cx - 24 + tj) + ' ' + top + 'a24 6 0 1 0 48 0a24 6 0 1 0 -48 0Z"/>';
      return s;
    }
    b += tower(82, 13, 324, 0) + tower(518, 12, 324, 2);
    // giant chip
    var gc = '<ellipse cx="300" cy="226" rx="156" ry="74"' + op(0.3) + '/><ellipse cx="300" cy="226" rx="156" ry="74"' + stk(5) + '/><ellipse cx="300" cy="226" rx="112" ry="52"' + stk(5) + '/>';
    for (var k = 0; k < 8; k++) {
      var a = k * Math.PI / 4 + Math.PI / 8, da = 0.13, Q = function (rx, ry, t) { return (300 + rx * Math.cos(t)).toFixed(1) + ' ' + (226 + ry * Math.sin(t)).toFixed(1); };
      gc += '<path d="M' + Q(118, 56, a - da) + 'L' + Q(150, 70, a - da) + 'L' + Q(150, 70, a + da) + 'L' + Q(118, 56, a + da) + 'Z" fill="' + C + '"/>';
    }
    b += gc;
    // stacked lockup: each line sized so both run the same width
    var W = 320, s1 = Math.min(78, W / (l1.length * 0.85)), s2 = l2 ? Math.min(76, W / (l2.length * 0.85)) : 0;
    var y1 = l2 ? 148 - s2 * 0.72 - 14 : 140;
    b += tx(300, y1.toFixed(0), s1.toFixed(0), "'Bowlby One SC'", E(up(l1)), ' textLength="' + W + '" lengthAdjust="spacingAndGlyphs"');
    if (l2) b += tx(300, 148, s2.toFixed(0), "'Bowlby One SC'", E(up(l2)), ' textLength="' + W + '" lengthAdjust="spacingAndGlyphs"');
    if (o.series) {
      var se = season(o);
      b += '<g opacity=".4">' + landmark(se, 300, 230, 0.62) + '</g>';
      b += tx(300, 344, 20, "'Sofia Sans Condensed'", E(up(o.series)), ' font-weight="700" letter-spacing="7"');
      b += bit(se, 146, 336, -20, 0.34) + bit(se, 454, 336, 20, 0.34) + bit(se, 150, 36, 30, 0.3, 0.8) + bit(se, 450, 36, -30, 0.3, 0.8) + bit(se, 112, 70, 70, 0.2, 0.55) + bit(se, 488, 70, -70, 0.2, 0.55);
    }
    return svg(b);
  };

  // Mystery Millions: the back of a sealed envelope, a wax seal with a question mark at the flap, typewritten name
  SAMPLE.mystery = { venue: 'Mystery Millions', city: 'Las Vegas', style: 'Mystery Bounty', series: 'Summer Series' };
  LOGOS.mystery = function (o) {
    var v = String(o.venue), b = '';
    b += '<rect x="70" y="50" width="460" height="300" rx="14"' + stk(7) + '/>';
    b += '<path d="M76 56L300 122L524 56" fill="' + C + '" fill-opacity=".3" stroke="' + C + '" stroke-width="6" stroke-linejoin="round"/>';
    b += pth('M76 344L232 236M524 344L368 236', stk(5, 0.5));
    var d = '';
    for (var i = 0; i < 36; i++) { var a = i * Math.PI / 18, r = i % 2 ? 36 : 41; d += (i ? 'L' : 'M') + (300 + r * Math.cos(a)).toFixed(1) + ' ' + (112 + r * Math.sin(a)).toFixed(1); }
    b += '<defs><mask id="mystery-m"><rect width="600" height="400" fill="#fff"/><circle cx="300" cy="112" r="28" fill="none" stroke="#000" stroke-width="4"/>' +
      '<text x="300" y="129" font-family="\'Courier Prime\'" font-weight="700" font-size="50" text-anchor="middle" fill="#000">?</text></mask></defs>';
    b += '<path d="' + d + 'Z" fill="' + C + '" mask="url(#mystery-m)"/>';
    b += tx(300, 300, 46, "'Courier Prime'", E(up(v)), ' font-weight="700" word-spacing="-12" stroke="' + C + '" stroke-width="1"' + fit(v, 46, 0.6, 420));
    if (o.series) {
      var se = season(o), city = up(o.city || (se === 'fall' ? 'Philadelphia' : se === 'spring' ? 'Los Angeles' : 'Las Vegas'));
      b += tx(300, 330, 18, "'Courier Prime'", E(up(o.series)), ' font-weight="700" letter-spacing="6"');
      // the stamp: perforated edge, the landmark, the season's name
      var perf = '';
      for (var px = 436; px <= 506; px += 7) perf += '<circle cx="' + px + '" cy="140" r="3"/><circle cx="' + px + '" cy="232" r="3"/>';
      for (var py = 147; py <= 226; py += 7) perf += '<circle cx="432" cy="' + py + '" r="3"/><circle cx="510" cy="' + py + '" r="3"/>';
      b += '<defs><mask id="mystery-s"><rect width="600" height="400" fill="#fff"/><g fill="#000">' + perf + '</g></mask></defs>';
      b += '<rect x="432" y="140" width="78" height="92" fill="' + C + '" fill-opacity=".3" mask="url(#mystery-s)"/><rect x="440" y="148" width="62" height="76"' + stk(2.5) + '/>';
      b += landmark(se, 471, 182, 0.42) + tx(471, 219, 11, "'Courier Prime'", up(se), ' font-weight="700" letter-spacing="2"');
      // the postmark over its corner: the city round the ring, wavy cancel lines
      b += '<defs><path id="mystery-pm" d="M346 190a34 34 0 1 1 68 0"/></defs><circle cx="380" cy="190" r="46"' + stk(3, 0.85) + '/><circle cx="380" cy="190" r="22"' + stk(2, 0.85) + '/>' +
        tp('mystery-pm', 11, "'Courier Prime'", E(city), ' font-weight="700" letter-spacing="1" fill-opacity=".9"' + fit(city, 11, 0.62, 100, 1)) +
        tx(380, 195, 13, "'Courier Prime'", '&#9733;', ' fill-opacity=".9"');
      for (var w = 0; w < 3; w++) b += pth('M440 ' + (170 + w * 12) + 'q10 -7 20 0t20 0t20 0t20 0', stk(2.5, 0.7));
      // tucked under the flap on the left
      b += bit(se, 150, 188, -30, 0.5, 0.9) + bit(se, 196, 168, 20, 0.34, 0.65) + bit(se, 186, 222, 80, 0.26, 0.5);
    }
    return svg(b);
  };
})();

// ── g2 ──
// back rooms, local card rooms, the cruise ship's card room
(function () {
  var SV = '<svg viewBox="0 0 600 400" xmlns="http://www.w3.org/2000/svg" fill="currentColor" stroke="currentColor" stroke-width="0">';
  // text: fits itself to `max` when the name runs long (cw = the font's rough width per em)
  function T(s, x, y, sz, font, a) {
    a = a || {}; s = String(s);
    var ls = a.ls || 0, est = s.length * sz * (a.cw || 0.6) + Math.max(0, s.length - 1) * ls;
    return '<text x="' + x + '" y="' + y + '" font-family="' + font + '" font-size="' + sz + '" text-anchor="' + (a.anchor || 'middle') + '"' +
      (a.w ? ' font-weight="' + a.w + '"' : '') + (a.it ? ' font-style="italic"' : '') + (ls ? ' letter-spacing="' + ls + '"' : '') +
      (a.op ? ' fill-opacity="' + a.op + '"' : '') + (a.fill ? ' fill="' + a.fill + '"' : '') + (a.attr || '') +
      (a.max && est > a.max ? ' textLength="' + a.max + '" lengthAdjust="spacingAndGlyphs"' : '') + '>' + E(s) + '</text>';
  }
  function U(s) { return String(s).toUpperCase(); }
  function wave(x0, x1, y, amp, len) { var d = 'M' + x0 + ',' + y, s = 1; for (var x = x0; x < x1 - 1; x += len, s = -s) d += 'q' + len / 2 + ',' + (-amp * s) + ' ' + len + ',0'; return d; }
  function P(d, a) { return '<path d="' + d + '"' + (a || '') + '/>'; }
  function L(w) { return ' fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="' + w + '"'; }
  function star(cx, cy, r, ri, n) { var d = '', k; n = n || 5; ri = ri || r * 0.42; for (k = 0; k < n * 2; k++) { var a = Math.PI * k / n - Math.PI / 2, q = k % 2 ? ri : r; d += (k ? 'L' : 'M') + (cx + q * Math.cos(a)).toFixed(1) + ',' + (cy + q * Math.sin(a)).toFixed(1); } return P(d + 'Z'); }
  // the restaurant's own name, without where the game is ("The Back Room at Sal's" -> "Sal's", "Upstairs at the Golden Dragon" -> "The Golden Dragon")
  function brand(v) {
    var s = String(v), re = /^.*?\b(?:at|behind|above|below|beneath|under|upstairs|downstairs|(?:out |in )?back of|in back of)\s+/i, k = 0;
    while (re.test(s) && k++ < 4) { var t = s.replace(re, ''); if (!t || t === s) break; s = t; }
    return s.replace(/^the\b/, 'The');
  }
  function split(v, re) { var m = String(v).match(re); return m ? m : null; }

  // ── The Back Room at Sal's: the joint's matchbook ──
  SAMPLE.backroom = { venue: "The Back Room at Sal's", city: 'Through the kitchen, knock twice', style: 'Back-room game' };
  LOGOS.backroom = function (o) {
    var nm = brand(o.venue);
    function fiasco(cx) { // a Chianti bottle in its straw jacket, a candle burning in the neck, wax run down it
      return '<ellipse cx="' + cx + '" cy="112" rx="5" ry="10"/>' + '<rect x="' + (cx - 6) + '" y="124" width="12" height="26" fill-opacity=".55"/>' +
        P('M' + (cx - 8) + ',150h16v40c0,8 18,16 18,40c0,20 -12,32 -26,32s-26,-12 -26,-32c0,-24 18,-32 18,-40z', ' fill-opacity=".3"') +
        P('M' + (cx - 8) + ',150h16v40c0,8 18,16 18,40c0,20 -12,32 -26,32s-26,-12 -26,-32c0,-24 18,-32 18,-40z', L(5)) +
        P('M' + (cx - 8) + ',150h16v14q-4,6 -2,14h-6q2,-6 -4,-10z') +
        P('M' + (cx - 24) + ',224h48c0,20 -10,36 -24,36s-24,-16 -24,-36z', ' fill-opacity=".6"') +
        P('M' + (cx - 14) + ',228v26M' + cx + ',228v30M' + (cx + 14) + ',228v26', ' fill="none" stroke-width="4" stroke-opacity="1"');
    }
    var cloth = '', c, q;
    for (q = 0; q < 3; q++) for (c = 0; c < 34; c++) { var on = (c % 2 === 0) + (q % 2 === 0); if (on) cloth += '<rect x="' + (64 + c * 14) + '" y="' + (258 + q * 14) + '" width="14" height="14"' + (on === 1 ? ' fill-opacity=".4"' : '') + '/>'; }
    return SV + '<rect x="62" y="34" width="476" height="326" rx="40"' + L(6) + '/>' +
      T(nm, 300, 112, 102, 'Yellowtail', { cw: 0.38, max: 320 }) +
      P('M120,136H160M440,136H480', L(4)) + T('ITALIAN KITCHEN', 300, 142, 17, 'Josefin Sans', { w: 700, ls: 6, cw: 0.6, max: 260 }) +
      cloth + P('M62,304h476v16a40,40 0 0 1 -40,40h-396a40,40 0 0 1 -40,-40z', ' fill-opacity=".32"') + P('M62,304h476', L(5)) +
      T('CLOSE COVER BEFORE STRIKING', 300, 338, 18, 'Josefin Sans', { w: 700, ls: 4, cw: 0.66, max: 400 }) +
      fiasco(95) + fiasco(505) + '</svg>';
  };

  // ── Upstairs at the Golden Dragon: the restaurant's menu-cover crest, key-fret border, lanterns ──
  SAMPLE.dragon = { venue: 'Upstairs at the Golden Dragon', city: 'After closing time', style: 'Back-room game' };
  LOGOS.dragon = function (o) {
    var b = brand(o.venue), m = b.match(/^(the)\s+(.+)$/i), top = m ? m[1] : '', nm = m ? m[2] : b;
    var fret = '', x;
    for (x = 92; x < 500; x += 40) if (x < 236 || x > 330) fret += 'M' + x + ',334V298H' + (x + 30) + 'V324H' + (x + 12) + 'V310H' + (x + 20);
    function lantern(cx) {
      return P('M' + cx + ',150v14', L(4)) + '<rect x="' + (cx - 16) + '" y="162" width="32" height="10" rx="2"/>' +
        '<ellipse cx="' + cx + '" cy="203" rx="40" ry="33" fill-opacity=".42"/>' +
        P('M' + cx + ',170v66M' + (cx - 20) + ',174c-12,18 -12,40 0,58M' + (cx + 20) + ',174c12,18 12,40 0,58', L(4)) +
        '<rect x="' + (cx - 16) + '" y="234" width="32" height="10" rx="2"/>' + P('M' + (cx - 6) + ',244v24M' + cx + ',244v28M' + (cx + 6) + ',244v24', L(4));
    }
    return SV +
      (top ? T(U(top), 300, 78, 22, 'Shojumaru', { ls: 10, cw: 0.81, max: 200 }) + P('M196,70H252M348,70H404', L(4)) : '') +
      T(U(nm), 300, 130, 46, 'Shojumaru', { ls: 1, cw: 0.81, max: 460 }) +
      P(fret, ' fill="none" stroke-width="6" stroke-linecap="square"') +
      P('M88,286H252M348,286H512M88,346H252M348,346H512', L(5)) +
      // the dragon's pearl in its ring of flame
      '<circle cx="300" cy="316" r="46"' + L(6) + '/>' + '<circle cx="300" cy="316" r="18"/>' +
      P('M300,280c14,8 22,20 18,36M336,316c-8,14 -20,22 -36,18M300,352c-14,-8 -22,-20 -18,-36M264,316c8,-14 20,-22 36,-18', L(5) + ' stroke-opacity=".6"') +
      lantern(74) + lantern(526) + '</svg>';
  };

  // ── Behind Rosa's Cantina: papel picado strung across the top, painted talavera tiles ──
  SAMPLE.cantina = { venue: "Behind Rosa's Cantina", city: 'Through the kitchen, knock twice', style: 'Back-room game' };
  LOGOS.cantina = function (o) {
    var b = brand(o.venue), m = b.match(/^(.+?)\s+(cantina)$/i), nm = m ? m[1] : b, suf = m ? m[2] : '';
    var flags = '', i, xs = [140, 204, 268, 332, 396, 460];
    for (i = 0; i < 6; i++) {
      var x = xs[i], y = 18 + Math.round(10 * Math.sin(Math.PI * (x - 100) / 400)), w = 50, h = 52, z = '', k;
      for (k = 6; k >= 0; k--) z += 'L' + (x - w / 2 + k * w / 6) + ',' + (y + h - (k % 2 ? 8 : 0));
      var cy = y + 24; // cut-outs punched through: a ring with a diamond, two little squares
      flags += '<path fill-rule="evenodd" fill-opacity="' + (i % 2 ? '.9' : '.5') + '" d="M' + (x - w / 2) + ',' + y + 'H' + (x + w / 2) + z + 'Z' +
        'M' + (x - 12) + ',' + cy + 'a12,12 0 1 0 24,0a12,12 0 1 0 -24,0zM' + x + ',' + (cy - 6) + 'l6,6 -6,6 -6,-6z' +
        'M' + (x - 19) + ',' + (y + 5) + 'h6v6h-6zM' + (x + 13) + ',' + (y + 5) + 'h6v6h-6z"/>';
    }
    function tile(cx, cy, z) { // a painted tile: four petals, a centre, quarter-rounds in the corners
      function q(x, y) { return (cx + x * z).toFixed(1) + ',' + (cy + y * z).toFixed(1); }
      return '<rect x="' + (cx - 36 * z) + '" y="' + (cy - 36 * z) + '" width="' + 72 * z + '" height="' + 72 * z + '" rx="3"' + L(5) + '/>' +
        P('M' + q(0, -30) + 'C' + q(12, -16) + ' ' + q(12, -8) + ' ' + q(0, 0) + 'C' + q(-12, -8) + ' ' + q(-12, -16) + ' ' + q(0, -30) + 'ZM' + q(0, 30) + 'C' + q(12, 16) + ' ' + q(12, 8) + ' ' + q(0, 0) + 'C' + q(-12, 8) + ' ' + q(-12, 16) + ' ' + q(0, 30) +
          'ZM' + q(-30, 0) + 'C' + q(-16, -12) + ' ' + q(-8, -12) + ' ' + q(0, 0) + 'C' + q(-8, 12) + ' ' + q(-16, 12) + ' ' + q(-30, 0) + 'ZM' + q(30, 0) + 'C' + q(16, -12) + ' ' + q(8, -12) + ' ' + q(0, 0) + 'C' + q(8, 12) + ' ' + q(16, 12) + ' ' + q(30, 0) + 'Z', ' fill-opacity=".55"') +
        '<circle cx="' + cx + '" cy="' + cy + '" r="' + 7 * z + '"/>' +
        P('M' + q(-36, -22) + 'A' + 14 * z + ',' + 14 * z + ' 0 0 0 ' + q(-22, -36) + 'M' + q(22, -36) + 'A' + 14 * z + ',' + 14 * z + ' 0 0 0 ' + q(36, -22) + 'M' + q(-36, 22) + 'A' + 14 * z + ',' + 14 * z + ' 0 0 1 ' + q(-22, 36) + 'M' + q(22, 36) + 'A' + 14 * z + ',' + 14 * z + ' 0 0 1 ' + q(36, 22), L(4));
    }
    // flags on top, a wall of painted tiles behind the board, the name below in one lockup
    return SV + P('M100,18Q300,38 500,18', L(4) + ' stroke-opacity=".6"') + flags +
      tile(78, 190, 1) + '<g transform="rotate(45 300 190)">' + tile(300, 190, 1.42) + '</g>' + tile(522, 190, 1) +
      T(nm, 300, 328, 64, 'Sancreek', { cw: 0.47, max: 360 }) +
      (suf ? P('M150,354H198M402,354H450', L(4)) + T(U(suf), 300, 362, 22, 'Chango', { ls: 6, cw: 0.9, max: 220 }) : '') + '</svg>';
  };

  // ── The Cellar at Bellini's: the brick barrel vault and the diamond-bin wine rack ──
  SAMPLE.cellar = { venue: "The Cellar at Bellini's", city: 'By invitation only', style: 'Back-room game' };
  LOGOS.cellar = function (o) {
    var nm = brand(o.venue);
    var cx = 300, cy = 262, r0 = 208, r1 = 248, n = 15, d = '', i;
    for (i = 0; i < n; i++) {
      if (i === 7) continue;
      var a0 = Math.PI + Math.PI * i / n + 0.012, a1 = Math.PI + Math.PI * (i + 1) / n - 0.012;
      d += 'M' + (cx + r0 * Math.cos(a0)).toFixed(1) + ',' + (cy + r0 * Math.sin(a0)).toFixed(1) + 'L' + (cx + r1 * Math.cos(a0)).toFixed(1) + ',' + (cy + r1 * Math.sin(a0)).toFixed(1) +
        'A' + r1 + ',' + r1 + ' 0 0 1 ' + (cx + r1 * Math.cos(a1)).toFixed(1) + ',' + (cy + r1 * Math.sin(a1)).toFixed(1) + 'L' + (cx + r0 * Math.cos(a1)).toFixed(1) + ',' + (cy + r0 * Math.sin(a1)).toFixed(1) +
        'A' + r0 + ',' + r0 + ' 0 0 0 ' + (cx + r0 * Math.cos(a0)).toFixed(1) + ',' + (cy + r0 * Math.sin(a0)).toFixed(1) + 'Z';
    }
    var piers = '';
    for (i = 0; i < 4; i++) { var y = 268 + i * 26, o2 = i % 2 ? 6 : 0; piers += 'M' + (54 + o2) + ',' + y + 'h' + (36 - o2) + 'v20h-' + (36 - o2) + 'zM' + (510) + ',' + y + 'h' + (36 - o2) + 'v20h-' + (36 - o2) + 'z'; }
    // the rack: a diamond lattice with a bottle's end in every bin
    var rack = '', ends = '', x;
    for (x = 120; x <= 480; x += 60) rack += 'M' + x + ',262l30,40 -30,40M' + x + ',262l-30,40 30,40';
    for (x = 150; x <= 450; x += 60) ends += '<circle cx="' + x + '" cy="302" r="10"/>';
    for (x = 120; x <= 480; x += 60) ends += '<circle cx="' + x + '" cy="282" r="6" fill-opacity=".5"/><circle cx="' + x + '" cy="322" r="6" fill-opacity=".5"/>';
    return SV + P(d, ' fill-opacity=".42"') + P('M276,8h48l-6,50h-36z') + P(piers, ' fill-opacity=".42"') +
      T('RISTORANTE', 300, 90, 26, 'Cormorant SC', { w: 700, ls: 6, cw: 0.65, max: 230 }) +
      T(nm, 300, 144, 66, 'Bodoni Moda', { w: 700, it: true, cw: 0.45, max: 330 }) +
      P('M90,262H510M90,342H510', L(5)) + P(rack.replace(/M(\d+),262l-30,40 30,40/g, function (s, a) { return +a > 120 ? s : ''; }).replace(/M480,262l30,40 -30,40/, ''), L(5)) + ends +
      P('M40,374H560', L(6)) + '</svg>';
  };

  // ── The Back of Lucky's Diner: the neon over the door, the letter boxes, the checkerboard ──
  SAMPLE.diner = { venue: "The Back of Lucky's Diner", city: 'After closing time', style: 'Back-room game' };
  LOGOS.diner = function (o) {
    var b = brand(o.venue), m = b.match(/^(.+?)\s+(diner|cafe|grill)$/i), nm = m ? m[1] : b, word = m ? U(m[2]) : 'DINER';
    var id = 'diner-m', i, chk = '';
    for (i = 0; i < 3; i++) for (var c = 0; c < 24; c++) if ((c + i) % 2 === 0) chk += '<rect x="' + (132 + c * 14) + '" y="' + (289 + i * 14) + '" width="14" height="14"' + (i === 2 ? ' fill-opacity=".5"' : '') + '/>';
    // the name in neon script, its glow round it; under it the DINER bar, cut clear of the script's tail
    var script = T(nm, 300, 90, 88, 'Lobster', { cw: 0.39, max: 300, attr: ' transform="skewX(-6) translate(11 0)"' });
    return SV + '<defs><mask id="' + id + '"><rect width="600" height="400" fill="#fff"/><g fill="#000" stroke="#000" stroke-width="12" stroke-linejoin="round">' + script + '</g>' +
      T(word, 311, 144, 28, 'Anton', { ls: 20, cw: 0.42, fill: '#000' }) + '</mask></defs>' +
      '<rect x="210" y="116" width="180" height="34" rx="5" mask="url(#' + id + ')"/>' +
      '<g stroke-width="12" stroke-linejoin="round" stroke-opacity=".3">' + script + '</g>' + script +
      star(140, 60, 22, 5, 4) + star(168, 30, 10, 3, 4) + star(462, 78, 16, 4, 4) +
      P('M66,186h44v26a22,22 0 0 1 -44,0zM110,192c14,0 14,20 0,20', L(5)) + P('M58,236h60', L(5)) + P('M78,176c-6,-8 6,-12 0,-22M96,176c-6,-8 6,-12 0,-22', L(4) + ' stroke-opacity=".6"') +
      P('M486,236h56M514,236v-8M496,228h36M494,228c0,-40 40,-40 40,0M514,180v-6', L(5)) + P('M500,226l14,-16 14,16z', ' fill-opacity=".5"') +
      P('M300,150L318,190 450,200 318,210 300,250 282,210 150,200 282,190Z', ' fill-opacity=".35"') + chk + '</svg>';
  };

  // the card rooms: the name, and what's left of it ("Card Room", "Card Club", "Casino")
  function room(v) { var m = String(v).match(/^(.*?)\s+(card room|card club|casino)$/i); return m ? [m[1], m[2]] : [String(v), '']; }
  function arc(id, cx, cy, r, a0, a1) { // a text path from angle a0 to a1 (degrees, clockwise from +x), sweep by sign
    var r0 = a0 * Math.PI / 180, r1 = a1 * Math.PI / 180;
    return '<path id="' + id + '" fill="none" d="M' + (cx + r * Math.cos(r0)).toFixed(1) + ',' + (cy + r * Math.sin(r0)).toFixed(1) + 'A' + r + ',' + r + ' 0 0 ' + (a1 > a0 ? 1 : 0) + ' ' + (cx + r * Math.cos(r1)).toFixed(1) + ',' + (cy + r * Math.sin(r1)).toFixed(1) + '"/>';
  }
  function TP(id, s, sz, font, a) {
    a = a || {}; var est = s.length * sz * (a.cw || 0.6) + (s.length - 1) * (a.ls || 0);
    return '<text font-family="' + font + '" font-size="' + sz + '"' + (a.w ? ' font-weight="' + a.w + '"' : '') + (a.ls ? ' letter-spacing="' + a.ls + '"' : '') + (a.fill ? ' fill="' + a.fill + '"' : '') + (a.attr || '') +
      '><textPath href="#' + id + '" startOffset="50%" text-anchor="middle"' + (a.max && est > a.max ? ' textLength="' + a.max + '" lengthAdjust="spacingAndGlyphs"' : '') + '>' + E(s) + '</textPath></text>';
  }

  // ── Riverside Card Room: the boathouse on the bank; a towboat pushing its barges under the name ──
  SAMPLE.cardriver = { venue: 'Riverside Card Room', city: 'Down by the river', style: 'Freezeout' };
  LOGOS.cardriver = function (o) {
    var r = room(o.venue);
    var ring = '<circle cx="74" cy="200" r="34"' + L(16) + ' stroke-opacity=".4"/><circle cx="74" cy="200" r="34" fill="none" stroke-width="16" stroke-dasharray="17 36.4" stroke-dashoffset="8"/>' +
      '<circle cx="74" cy="200" r="51"' + L(4) + ' stroke-dasharray="10 9" stroke-opacity=".6"/>';
    function oar(a) { return '<g transform="rotate(' + a + ' 526 200)">' + P('M526,138V244', L(6)) + '<rect x="516" y="236" width="20" height="34" rx="10"/>' + P('M520,140h12', L(6)) + '</g>'; }
    var tow = P('M104,298h92v20h-100zM202,298h92v20h-92zM300,298h92v20h-92z', ' fill-opacity=".5"') + P('M104,298h92v20h-100zM202,298h92v20h-92zM300,298h92v20h-92z', L(4)) +
      P('M398,296h8v24h-8zM410,292h84l-6,28h-78z') + P('M420,276h60v16h-60zM440,260h34v16h-34z') + '<rect x="446" y="244" width="7" height="16"/><rect x="460" y="244" width="7" height="16"/>' +
      P('M428,280h44M446,264h22', ' fill="none" stroke-width="4" stroke-opacity=".3"');
    return SV + T(U(r[0]), 300, 104, 100, 'Bebas Neue', { ls: 5, cw: 0.35, max: 420 }) +
      (r[1] ? P('M140,128H196M404,128H460', L(4)) + T(U(r[1]), 300, 135, 20, 'Barlow Condensed', { w: 700, ls: 12, cw: 0.5, max: 190 }) : '') +
      ring + oar(28) + oar(-28) + '<g transform="translate(0 8)">' + tow + '</g>' +
      P(wave(70, 530, 342, 6, 28), L(5)) + P(wave(130, 470, 358, 5, 28), L(4) + ' stroke-opacity=".45"') + '</svg>';
  };

  // ── Prairie Rose Card Club: the wild rose of the plains, the name on a ribbon across it ──
  SAMPLE.cardroom = { venue: 'Prairie Rose Card Club', city: 'Across from the courthouse', style: 'Freezeout' };
  LOGOS.cardroom = function (o) {
    var r = room(o.venue), cx = 300, cy = 190, d = '', k;
    var pet = [[0, -26], [-36, -38], [-74, -84], [-58, -130], [-32, -156], [0, -132], [32, -156], [58, -130], [74, -84], [36, -38]];
    function pt(p, a) { var c = Math.cos(a), s = Math.sin(a); return (cx + p[0] * c - p[1] * s).toFixed(1) + ',' + (cy + p[0] * s + p[1] * c).toFixed(1); }
    for (k = 0; k < 5; k++) { var a = k * 2 * Math.PI / 5; d += 'M' + pt(pet[0], a) + 'C' + pt(pet[1], a) + ' ' + pt(pet[2], a) + ' ' + pt(pet[3], a) + 'Q' + pt(pet[4], a) + ' ' + pt(pet[5], a) + 'Q' + pt(pet[6], a) + ' ' + pt(pet[7], a) + 'C' + pt(pet[8], a) + ' ' + pt(pet[9], a) + ' ' + pt(pet[0], a) + 'Z'; }
    var dots = ''; for (k = 0; k < 12; k++) { var b = k * Math.PI / 6; dots += '<circle cx="' + (cx + 50 * Math.cos(b)).toFixed(1) + '" cy="' + (cy + 50 * Math.sin(b)).toFixed(1) + '" r="6"/>'; }
    var id = 'cardroom-m';
    return SV + '<defs><mask id="' + id + '"><rect width="600" height="400" fill="#fff"/>' + T(U(r[0]), 300, 315, 34, 'Bevan', { ls: 1, cw: 0.72, max: 336, fill: '#000' }) + '</mask></defs>' +
      '<clipPath id="cardroom-c"><rect width="600" height="268"/></clipPath><g clip-path="url(#cardroom-c)">' + P(d, ' fill-opacity=".3"') + P(d, L(5)) + '</g>' + '<circle cx="300" cy="190" r="34" fill-opacity=".5"/><circle cx="300" cy="190" r="34"' + L(4) + '/>' + dots +
      P('M66,290h70v56h-70l18,-28z', ' fill-opacity=".6"') + P('M534,290h-70v56h70l-18,-28z', ' fill-opacity=".6"') + P('M116,330l20,16v-16zM484,330l-20,16v-16z') +
      '<rect x="116" y="274" width="368" height="56" mask="url(#' + id + ')"/>' +
      (r[1] ? T(U(r[1]), 300, 370, 24, 'Spectral SC', { w: 700, ls: 10, cw: 0.72, max: 280 }) : '') + '</svg>';
  };

  // ── Northside Card Room: upstairs from the sports bar; varsity arch, team pennants on their sticks, crossed bats and
  //    a ball, the bar's scoreboard along the bottom (HOME and GUEST, the ninth inning) ──
  SAMPLE.cardclub = { venue: 'Northside Card Room', city: 'Upstairs, past the bar', style: 'Freezeout' };
  LOGOS.cardclub = function (o) {
    var r = room(o.venue), id = 'cardclub-a', ini = U(r[0]).charAt(0);
    // a felt pennant on its stick, the team's letter on it, flying out from the side
    function pennant(x, dir) {
      var tip = x + 124 * dir;
      return P('M' + x + ',176V336', L(6)) + '<circle cx="' + x + '" cy="171" r="6"/>' +
        P('M' + x + ',182L' + tip + ',216L' + x + ',250Z', ' fill-opacity=".45"') + P('M' + x + ',182L' + tip + ',216L' + x + ',250Z', L(4)) +
        P('M' + (x + 8 * dir) + ',182V250', L(8)) +
        T(ini, x + 40 * dir, 234, 50, 'Alumni Sans Collegiate One', {});
    }
    // crossed bats behind a ball (the stitches as two seams)
    function bats(cx, cy) {
      var bat = 'M-7,-62Q-11,-22 -4,30L-7,54H7L4,30Q11,-22 7,-62Q0,-67 -7,-62Z';
      return '<g transform="translate(' + cx + ' ' + cy + ')">' +
        '<path d="' + bat + '" transform="rotate(-36)" fill-opacity=".8"/><path d="' + bat + '" transform="rotate(36)" fill-opacity=".8"/>' +
        '<circle cy="-6" r="19"/><path d="M-9,-17Q-3,-6 -9,7M9,-19Q3,-6 9,7" stroke="#000" stroke-opacity=".35"' + L(2.5) + '/></g>';
    }
    // the scoreboard: HOME and GUEST over lit digits, the period in the middle
    var sb = '<rect x="150" y="276" width="300" height="78" rx="8" fill-opacity=".22"/><rect x="150" y="276" width="300" height="78" rx="8"' + L(4) + '/>' +
      T('HOME', 205, 298, 17, 'Teko', { w: 600, ls: 3 }) + T('GUEST', 395, 298, 17, 'Teko', { w: 600, ls: 3 }) +
      '<rect x="176" y="306" width="58" height="38" rx="4" fill-opacity=".35"/><rect x="366" y="306" width="58" height="38" rx="4" fill-opacity=".35"/>' +
      T('5', 205, 337, 34, 'Teko', { w: 600 }) + T('4', 395, 337, 34, 'Teko', { w: 600 }) +
      T('INN', 300, 302, 13, 'Teko', { w: 600, ls: 2, op: 0.8 }) + '<circle cx="300" cy="324" r="15" fill-opacity=".35"/>' + T('9', 300, 334, 26, 'Teko', { w: 600 });
    return SV + arc(id, 300, 700, 590, 250, 290) +
      TP(id, U(r[0]), 104, 'Alumni Sans Collegiate One', { cw: 0.34, max: 380 }) +
      (r[1] ? T(U(r[1]), 300, 144, 30, 'Teko', { w: 600, ls: 6, cw: 0.46, max: 170 }) : '') +
      pennant(40, 1) + pennant(560, -1) + bats(300, 222) + sb + '</svg>';
  };

  // ── Harbor Lights Card Room: the old cannery on the docks; the lighthouse throws its beam across the name ──
  SAMPLE.cardharbor = { venue: 'Harbor Lights Card Room', city: 'Down by the river', style: 'Freezeout' };
  LOGOS.cardharbor = function (o) {
    var r = room(o.venue), id = 'cardharbor-c', rope = '', x;
    for (x = 150; x < 540; x += 11) if (x < 300 || x > 380) rope += 'M' + x + ',318l7,12';
    return SV + '<defs><clipPath id="' + id + '"><path d="M68,112h32l12,218h-56z"/></clipPath></defs>' +
      P('M100,78L590,28V150L100,96z', ' fill-opacity=".3"') +
      P('M68,112h32l12,218h-56z', ' fill-opacity=".45"') + '<g clip-path="url(#' + id + ')"><rect x="50" y="150" width="70" height="30"/><rect x="50" y="212" width="70" height="30"/><rect x="50" y="274" width="70" height="30"/></g>' +
      P('M68,112h32l12,218h-56z', L(4)) + '<rect x="58" y="102" width="52" height="10" rx="2"/>' +
      '<rect x="70" y="72" width="28" height="30" fill-opacity=".6"/>' + P('M70,72h28v30h-28z', L(4)) + P('M64,72l20,-18 20,18z') + '<circle cx="84" cy="48" r="5"/>' +
      P(wave(150, 540, 184, 5, 26) + wave(176, 514, 204, 5, 26) + wave(202, 488, 224, 5, 26), L(4) + ' stroke-opacity=".45"') +
      P('M40,330h90', L(6)) +
      T(U(r[0]), 342, 106, 44, 'Stardos Stencil', { w: 700, cw: 0.62, max: 400 }) +
      (r[1] ? P('M188,128H234M450,128H496', L(4)) + T(U(r[1]), 342, 135, 18, 'Archivo Narrow', { w: 700, ls: 12, cw: 0.61, max: 200 }) : '') +
      P(rope, ' fill="none" stroke-width="4" stroke-linecap="round"') +
      // the anchor on the rope
      '<circle cx="342" cy="262" r="9"' + L(5) + '/>' + P('M342,271V338M320,284H364M308,316Q312,342 342,342Q372,342 376,316', L(7)) + P('M300,320l10,-12 6,14zM384,320l-10,-12 -6,14z') + '</svg>';
  };

  // ── Lucky Horseshoe: the big neon horseshoe on its pole over the highway; the cards land inside it ──
  SAMPLE.cardwest = { venue: 'Lucky Horseshoe', city: 'Off the highway', style: 'Turbo' };
  LOGOS.cardwest = function (o) {
    var w = String(o.venue).split(/\s+/), top = w.length > 1 ? w[0] : '', rest = w.length > 1 ? w.slice(1).join(' ') : o.venue;
    var id = 'cardwest-m', ap = 'cardwest-a', holes = '', i;
    [74, 112].forEach(function (y) { holes += '<rect x="147" y="' + y + '' + '" width="10" height="20" rx="2" fill="#000"/><rect x="443" y="' + y + '" width="10" height="20" rx="2" fill="#000"/>'; });
    function wheel(cx, cy) { var d = '', k; for (k = 0; k < 8; k++) { var a = k * Math.PI / 4; d += 'M' + (cx + 8 * Math.cos(a)).toFixed(1) + ',' + (cy + 8 * Math.sin(a)).toFixed(1) + 'L' + (cx + 32 * Math.cos(a)).toFixed(1) + ',' + (cy + 32 * Math.sin(a)).toFixed(1); }
      return '<circle cx="' + cx + '" cy="' + cy + '" r="34"' + L(7) + '/><circle cx="' + cx + '" cy="' + cy + '" r="9"/>' + P(d, L(4)); }
    var shoe = 'M126,36H182V190A118,118 0 0 0 418,190V36H474V190A174,174 0 0 1 126,190Z';
    return SV + arc(ap, 300, 190, 159, 160, 20) +
      '<defs><mask id="' + id + '"><rect width="600" height="400" fill="#fff"/>' + holes + TP(ap, U(rest), 30, 'Vast Shadow', { cw: 0.97, ls: 2, max: 330, fill: '#000' }) + '</mask></defs>' +
      '<path d="' + shoe + '" fill-opacity=".6" mask="url(#' + id + ')"/>' + P(shoe, L(4)) + '<rect x="120" y="30" width="68" height="14" rx="3"/><rect x="412" y="30" width="68" height="14" rx="3"/>' +
      (top ? T(U(top), 300, 134, 50, 'Vast Shadow', { cw: 0.96, max: 236 }) : '') +
      star(300, 64, 16, 7) + star(256, 74, 10, 4) + star(344, 74, 10, 4) +
      wheel(64, 304) + wheel(536, 304) + '</svg>';
  };

  // ── Gold Nugget Card Room: the gold-rush hall; an assay bar stamped with the name, pick and shovel crossed below ──
  SAMPLE.cardnugget = { venue: 'Gold Nugget Card Room', city: 'Downtown', style: 'Turbo' };
  LOGOS.cardnugget = function (o) {
    var r = room(o.venue), id = 'cardnugget-m', sub = r[1] ? U(r[1]).split(' ') : [];
    function nug(x, y, s) { return P('M' + x + ',' + y + 'l' + 10 * s + ',-9 ' + 12 * s + ',3 ' + 6 * s + ',10 ' + -4 * s + ',10 ' + -14 * s + ',4 ' + -11 * s + ',-6z'); }
    return SV + '<defs><mask id="' + id + '"><rect width="600" height="400" fill="#fff"/>' + T(U(r[0]), 300, 100, 32, 'Ultra', { ls: 1, cw: 0.8, max: 262, fill: '#000' }) +
      (r[1] ? T(U(r[1]), 300, 125, 15, 'Ultra', { ls: 8, cw: 0.8, max: 200, fill: '#000' }) : '') + '</mask></defs>' +
      P('M154,34H446L492,148H108Z', ' fill-opacity=".35"') + P('M154,34H446L492,148H108Z', L(5)) +
      P('M174,48H426L458,134H142Z', ' mask="url(#' + id + ')"') + P('M154,34L174,48M446,34L426,48M492,148L458,134M108,148L142,134', L(4)) +
      // pick over shovel, crossed; nuggets either side
      '<g transform="translate(300 252) scale(1.3) translate(-300 -305)">' + P('M248,352L346,262', L(9)) + P('M310,236Q356,234 380,284', L(11)) +
      P('M352,352L262,268', L(9)) + '<path d="M-17,-26h34v24q0,22 -17,32q-17,-10 -17,-32z" transform="translate(252 254) rotate(-47)"/>' + P('M340,362l24,-20', L(7)) + '</g>' +
      nug(150, 318, 1.5) + nug(420, 322, 1.2) + '</svg>';
  };

  // ── Lakeview Casino: the glass prow on the lake, the sun going down into the water, pines on the shore ──
  SAMPLE.cardlake = { venue: 'Lakeview Casino', city: 'Out by the racetrack', style: 'Turbo' };
  LOGOS.cardlake = function (o) {
    var r = room(o.venue), id = 'cardlake-m', rays = '', k;
    for (k = 1; k < 8; k++) { var a = Math.PI + k * Math.PI / 8; rays += 'M' + (300 + 104 * Math.cos(a)).toFixed(1) + ',' + (146 + 104 * Math.sin(a)).toFixed(1) + 'L' + (300 + 132 * Math.cos(a)).toFixed(1) + ',' + (146 + 132 * Math.sin(a)).toFixed(1); }
    function pines(x, s) { return P('M' + x + ',146l' + (-26 * s) + ',0 ' + (14 * s) + ',-22 ' + (-9 * s) + ',0 ' + (12 * s) + ',-20 ' + (-7 * s) + ',0 ' + (16 * s) + ',-30 ' + (16 * s) + ',30 ' + (-7 * s) + ',0 ' + (12 * s) + ',20 ' + (-9 * s) + ',0 ' + (14 * s) + ',22z') +
      P('M' + (x + 34 * s) + ',146l' + (-18 * s) + ',0 ' + (10 * s) + ',-16 ' + (-6 * s) + ',0 ' + (14 * s) + ',-24 ' + (14 * s) + ',24 ' + (-6 * s) + ',0 ' + (10 * s) + ',16z', ' fill-opacity=".6"'); }
    var rip = ''; [[172, 70], [190, 50], [208, 34], [226, 20]].forEach(function (q) { rip += 'M' + (100 - q[1]) + ',' + q[0] + 'h' + q[1] + 'M' + (500) + ',' + q[0] + 'h' + q[1]; });
    return SV + '<defs><mask id="' + id + '"><rect width="600" height="400" fill="#fff"/><rect x="180" y="108" width="240" height="6" fill="#000"/><rect x="180" y="122" width="240" height="8" fill="#000"/><rect x="180" y="136" width="240" height="10" fill="#000"/></mask></defs>' +
      P('M210,146a90,90 0 0 1 180,0z', ' mask="url(#' + id + ')"') + P(rays, L(6)) +
      P('M40,150H560', L(5)) + pines(64, 1) + pines(536, -1) + P(rip, L(5) + ' stroke-opacity=".6"') +
      P('M200,168H400M226,184H374M252,200H348M274,216H326M290,232H310', L(6) + ' stroke-opacity=".55"') +
      T(r[0], 300, 318, 80, 'Sail', { cw: 0.47, max: 400 }) +
      (r[1] ? P('M160,343H214M386,343H440', L(4)) + T(U(r[1]), 300, 350, 20, 'Montserrat', { w: 700, ls: 12, cw: 0.77, max: 160 }) : '') + '</svg>';
  };

  // ── Silver Dollar Card Club: the card club by the track, open all night; the cards land on a big silver dollar ──
  SAMPLE.carddollar = { venue: 'Silver Dollar Card Club', city: 'Out by the racetrack', style: 'Turbo' };
  LOGOS.carddollar = function (o) {
    var r = room(o.venue), a1 = 'carddollar-t', a2 = 'carddollar-b';
    return SV + arc(a1, 300, 198, 140, 200, 340) + arc(a2, 300, 198, 164, 140, 40) +
      '<circle cx="300" cy="198" r="184" fill="none" stroke-width="12" stroke-dasharray="5 6"/>' + '<circle cx="300" cy="198" r="172"' + L(5) + '/>' +
      '<circle cx="300" cy="198" r="114"' + L(4) + ' stroke-opacity=".5"/>' +
      TP(a1, U(r[0]), 42, 'Cormorant Unicase', { w: 700, ls: 3, cw: 0.58, max: 330 }) +
      (r[1] ? TP(a2, U(r[1]), 34, 'Cormorant Unicase', { w: 700, ls: 4, cw: 0.58, max: 230 }) : '') +
      star(300, 196, 58, 23) .replace('/>', ' fill-opacity=".35"/>') + star(160, 290, 11, 5) + star(440, 290, 11, 5) +
      T('OPEN ALL NIGHT', 300, 284, 24, 'Saira Extra Condensed', { w: 700, ls: 6, cw: 0.4, op: '.7' }) + '</svg>';
  };

  // ── The Ocean Majesty Card Room: the cruise line's crown over the sea ──
  SAMPLE.cruise = { venue: 'The Ocean Majesty Card Room', city: 'At sea, two days out of Fort Lauderdale', style: 'Freezeout' };
  LOGOS.cruise = function (o) {
    var r = room(String(o.venue).replace(/^the\s+/i, ''));
    function wheel() { var d = '', k; for (k = 0; k < 8; k++) { var a = k * Math.PI / 4; d += 'M' + (300 + 12 * Math.cos(a)).toFixed(1) + ',' + (200 + 12 * Math.sin(a)).toFixed(1) + 'L' + (300 + 58 * Math.cos(a)).toFixed(1) + ',' + (200 + 58 * Math.sin(a)).toFixed(1); }
      return '<g stroke-opacity=".45" fill-opacity=".45"><circle cx="300" cy="200" r="42"' + L(7) + '/><circle cx="300" cy="200" r="12"/>' + P(d, L(7)) + '</g>'; }
    function rose(cx) { return star(cx, 200, 40, 9, 4) + '<g fill-opacity=".5">' + '<path d="' + star(cx, 200, 28, 8, 4).replace(/^<path d="|"\/>$/g, '') + '" transform="rotate(45 ' + cx + ' 200)"/></g>' + '<circle cx="' + cx + '" cy="200" r="22"' + L(4) + '/>'; }
    return SV +
      P('M266,56L258,30 278,42 300,22 322,42 342,30 334,56Z') + '<rect x="262" y="58" width="76" height="8" rx="2"/>' +
      '<circle cx="258" cy="26" r="5"/><circle cx="300" cy="18" r="6"/><circle cx="342" cy="26" r="5"/>' +
      P('M150,50H236M364,50H450', L(4)) +
      T(U(r[0]), 300, 112, 40, 'Prata', { ls: 5, cw: 0.7, max: 440 }) +
      (r[1] ? P('M150,132H196M404,132H450', L(4)) + T(U(r[1]), 300, 138, 16, 'Tenor Sans', { ls: 10, cw: 0.79, max: 200 }) : '') +
      wheel() + rose(74) + rose(526) +
      P(wave(150, 450, 280, 7, 30), L(5)) + P(wave(180, 420, 298, 6, 30), L(5) + ' stroke-opacity=".7"') + P(wave(210, 390, 316, 5, 30), L(4) + ' stroke-opacity=".45"') +
      T('AT SEA', 300, 350, 16, 'Tenor Sans', { ls: 10, cw: 0.79, op: '.7' }) + '</svg>';
  };
})();

// ── g3 ──
// Bar league: the ten pubs. The game names them "The " + name + one of "", " Pub", " Tavern", " Saloon", so every
// logo splits o.venue into "The" / the name / the suffix and lays each part out on its own.
SAMPLE.pub0 = { venue: 'The Rusty Anchor Tavern', city: 'Thursday poker night at the pub', style: 'Bar league' };
SAMPLE.pub1 = { venue: 'The Copper Kettle Saloon', city: 'Tuesday bar league', style: 'Bar league' };
SAMPLE.pub2 = { venue: 'The Brass Tap', city: 'Poker night upstairs at the bar', style: 'Bar league' };
SAMPLE.pub3 = { venue: 'The Red Lion Pub', city: 'Thursday poker night at the pub', style: 'Bar league' };
SAMPLE.pub4 = { venue: 'The Black Dog Saloon', city: 'Tuesday bar league', style: 'Bar league' };
SAMPLE.pub5 = { venue: 'The Shamrock Tavern', city: 'Sunday afternoon at the tavern', style: 'Bar league' };
SAMPLE.pub6 = { venue: 'The Tin Cup', city: 'Thursday poker night at the pub', style: 'Bar league' };
SAMPLE.pub7 = { venue: 'The Iron Horse Saloon', city: 'Tuesday bar league', style: 'Bar league' };
SAMPLE.pub8 = { venue: 'The Blue Moose Pub', city: 'Sunday afternoon at the tavern', style: 'Bar league' };
SAMPLE.pub9 = { venue: 'The Lucky Penny Tavern', city: 'Poker night upstairs at the bar', style: 'Bar league' };
(function () {
  var C = 'currentColor', N = 0; // N keeps mask ids unique if one page shows the same logo twice
  // "The Rusty Anchor Tavern" -> { the: 'The', name: 'Rusty Anchor', suf: 'Tavern' }
  function parts(v, def) {
    v = String(v || def).replace(/\s+/g, ' ').trim();
    var the = '', suf = '', m = /^the /i.exec(v);
    if (m) { the = v.slice(0, 3); v = v.slice(4); }
    m = / (pub|tavern|saloon|inn|bar|taproom|house)$/i.exec(v);
    if (m && m.index > 0) { suf = v.slice(m.index + 1); v = v.slice(0, m.index); }
    return { the: the, name: v || def, suf: suf };
  }
  function up(s) { return String(s).toUpperCase(); }
  function q(f) { return "'" + f + "'"; }
  // text; a.max (with a.k = width per char in em) shrinks the size and spacing so the line fits
  function T(x, y, s, font, size, a) {
    a = a || {}; s = String(s);
    var ls = a.ls || 0, n = s.length;
    if (a.max) { var w = n * size * (a.k || 0.6) + (n - 1) * ls; if (w > a.max) { var f = a.max / w; size *= f; ls *= f; } }
    return '<text x="' + x + '" y="' + y + '" text-anchor="' + (a.anchor || 'middle') + '" font-family="' + q(font) + '" font-size="' + size.toFixed(1) + '"' +
      (a.w ? ' font-weight="' + a.w + '"' : '') + (a.it ? ' font-style="italic"' : '') + (ls ? ' letter-spacing="' + ls.toFixed(1) + '"' : '') +
      (a.op ? ' fill-opacity="' + a.op + '"' : '') + (a.tr ? ' transform="' + a.tr + '"' : '') + (a.sw ? ' stroke="' + C + '" stroke-width="' + a.sw + '" stroke-linejoin="round"' : '') + ' fill="' + (a.fill || C) + '">' + E(s) + '</text>';
  }
  function W(s, size, k, ls) { s = String(s); return s.length * size * k + (s.length - 1) * (ls || 0); }
  function svg(body) { return '<svg viewBox="0 0 600 400" xmlns="http://www.w3.org/2000/svg" fill="currentColor">' + body + '</svg>'; }
  function mirror(g) { return g + '<g transform="translate(600 0) scale(-1 1)">' + g + '</g>'; }
  function R(n) { return Math.round(n * 10) / 10; }
  function star(cx, cy, r) { // nautical star: alternate halves of each point solid and pale
    var o = '', i, a, b, c, ri = r * 0.42;
    for (i = 0; i < 5; i++) {
      a = (-90 + i * 72) * Math.PI / 180; b = a + 36 * Math.PI / 180; c = a - 36 * Math.PI / 180;
      var tip = R(cx + r * Math.cos(a)) + ' ' + R(cy + r * Math.sin(a)), inB = R(cx + ri * Math.cos(b)) + ' ' + R(cy + ri * Math.sin(b)), inC = R(cx + ri * Math.cos(c)) + ' ' + R(cy + ri * Math.sin(c));
      o += '<path d="M' + cx + ' ' + cy + 'L' + inC + 'L' + tip + 'Z"/><path fill-opacity=".4" d="M' + cx + ' ' + cy + 'L' + tip + 'L' + inB + 'Z"/>';
    }
    return o;
  }

  // ── pub0 The Rusty Anchor: tattoo-flash anchor with rope, nautical stars and a ribbon banner across the arms ──
  LOGOS.pub0 = function (o) {
    var u = '-' + (++N);
    var p = parts(o.venue, 'Rusty Anchor');
    var name = (p.the ? p.the + ' ' : '') + p.name;
    var s = '<mask id="pub0-m' + u + '"><rect width="600" height="400" fill="#fff"/>' + T(300, 324, name, 'Pirata One', 56, { max: 350, k: 0.37, ls: 1, fill: '#000' }) + '</mask>';
    // anchor (masked out behind the banner so the knocked-out name stays clean)
    s += '<mask id="pub0-a' + u + '"><rect width="600" height="400" fill="#fff"/><path d="M104 276Q300 262 496 276V340Q300 326 104 340Z" fill="#000"/></mask><g mask="url(#pub0-a' + u + ')">';
    s += '<circle cx="300" cy="52" r="20" fill="none" stroke="' + C + '" stroke-width="10"/>' +
      '<rect x="210" y="86" width="180" height="18" rx="9"/><circle cx="208" cy="95" r="12"/><circle cx="392" cy="95" r="12"/>' +
      '<path d="M291 72H309V340L300 356L291 340Z"/>' +
      '<path d="M178 250Q190 338 300 346Q410 338 422 250" fill="none" stroke="' + C + '" stroke-width="18"/>' +
      '<path d="M156 268L176 214L202 262L182 256Z"/><path d="M444 268L424 214L398 262L418 256Z"/>';
    // rope winding down the shank
    s += '<path d="M280 60C250 80 262 112 300 122C344 134 344 168 300 178C258 190 258 222 300 232C340 242 348 262 330 280" fill="none" stroke="' + C + '" stroke-width="7" stroke-opacity=".6" stroke-linecap="round"/></g>';
    s += star(132, 96, 34) + star(468, 96, 34);
    // ribbon banner
    s += '<path fill-opacity=".55" d="M72 296H128V352H72L90 324Z"/><path fill-opacity=".55" d="M528 296H472V352H528L510 324Z"/>' +
      '<path fill-opacity=".8" d="M110 336L128 352V336Z"/><path fill-opacity=".8" d="M490 336L472 352V336Z"/>' +
      '<path mask="url(#pub0-m' + u + ')" d="M110 280Q300 266 490 280V336Q300 322 110 336Z"/>';
    s += T(300, 384, p.suf || 'Dockside', 'Pirata One', 32, { ls: 3, op: 0.85 });
    return svg(s);
  };

  // ── pub1 The Copper Kettle: brush-script name and subtitle over a big hearth kettle the cards sit on ──
  LOGOS.pub1 = function (o) {
    var p = parts(o.venue, 'Copper Kettle');
    var s = T(300, 104, (p.the ? p.the + ' ' : '') + p.name, 'Yesteryear', 78, { max: 470, k: 0.35 });
    var sub = up(p.suf || 'Free House'), w = W(sub, 24, 0.72, 6);
    s += T(300, 150, sub, 'IM Fell English SC', 24, { ls: 6, op: 0.9 });
    s += '<path d="M' + R(300 - w / 2 - 60) + ' 142H' + R(300 - w / 2 - 16) + 'M' + R(300 + w / 2 + 10) + ' 142H' + R(300 + w / 2 + 54) + '" stroke="' + C + '" stroke-width="4" stroke-opacity=".7"/>';
    // the kettle: body, lid, handle, spout, steam
    s += '<g transform="translate(0 10)"><path d="M208 340C198 262 242 216 300 216C358 216 402 262 392 340Z" fill-opacity=".45" stroke="' + C + '" stroke-width="7" stroke-linejoin="round"/>' +
      '<path d="M220 296Q300 284 380 296" fill="none" stroke="' + C + '" stroke-width="6"/>' +
      '<rect x="192" y="336" width="216" height="18" rx="9"/>' +
      '<ellipse cx="300" cy="218" rx="46" ry="10"/><circle cx="300" cy="200" r="12"/>' +
      '<path d="M238 238C232 146 368 146 362 238" fill="none" stroke="' + C + '" stroke-width="13" stroke-linecap="round"/>' +
      '<path d="M214 306Q174 298 148 240" fill="none" stroke="' + C + '" stroke-width="18" stroke-linecap="round"/><path d="M136 236L160 228" stroke="' + C + '" stroke-width="10" stroke-linecap="round"/>' +
      '<path d="M146 218C126 196 162 182 142 156M120 222C100 198 136 184 116 160" fill="none" stroke="' + C + '" stroke-width="6" stroke-linecap="round" stroke-opacity=".55"/></g>';
    return svg(s);
  };

  // ── pub2 The Brass Tap: a forty-tap craft tower across the middle, sign lettering underneath ──
  LOGOS.pub2 = function (o) {
    var p = parts(o.venue, 'Brass Tap');
    var y0 = 196, cb = y0 - 8; // rail top, collar bottom
    var s = '<rect x="86" y="' + y0 + '" width="428" height="16" rx="8"/>';
    var xs = [118, 163, 208, 253, 300, 347, 392, 437, 482], tops = [104, 82, 114, 72, 36, 78, 110, 86, 100];
    xs.forEach(function (x, i) {
      var t = tops[i], kind = i === 4 ? 9 : i % 3;
      s += '<rect x="' + (x - 8) + '" y="' + (cb - 2) + '" width="16" height="10" rx="2"/>'; // collar
      if (kind === 9) s += '<path d="M' + (x - 7) + ' ' + cb + 'L' + (x - 15) + ' ' + (t + 24) + 'Q' + x + ' ' + (t - 6) + ' ' + (x + 15) + ' ' + (t + 24) + 'L' + (x + 7) + ' ' + cb + 'Z"/>';
      else if (kind === 0) s += '<rect x="' + (x - 10) + '" y="' + t + '" width="20" height="' + (cb - t) + '" rx="5"/>';
      else if (kind === 1) s += '<rect x="' + (x - 5) + '" y="' + (t + 14) + '" width="10" height="' + (cb - t - 14) + '"/><circle cx="' + x + '" cy="' + (t + 10) + '" r="12"/>';
      else s += '<path d="M' + (x - 5) + ' ' + cb + 'L' + (x - 12) + ' ' + t + 'H' + (x + 12) + 'L' + (x + 5) + ' ' + cb + 'Z"/>';
      s += '<path d="M' + (x - 5) + ' ' + (y0 + 16) + 'V' + (y0 + 30) + 'Q' + (x - 5) + ' ' + (y0 + 36) + ' ' + (x + 1) + ' ' + (y0 + 36) + 'H' + (x + 5) + 'V' + (y0 + 16) + 'Z" fill-opacity=".7"/>'; // faucet
    });
    if (p.the) s += T(300, 276, up(p.the), 'Sigmar One', 20, { ls: 10, op: 0.85 });
    s += T(300, 334, up(p.name), 'Sigmar One', 60, { max: 430, k: 0.76 });
    var line = (p.suf ? up(p.suf) + '  ·  ' : '') + '40 ON TAP', w = W(line, 22, 0.39, 5);
    s += T(300, 370, line, 'Fjalla One', 22, { ls: 5, op: 0.85 });
    s += '<path d="M' + R(300 - w / 2 - 70) + ' 362H' + R(300 - w / 2 - 16) + 'M' + R(300 + w / 2 + 12) + ' 362H' + R(300 + w / 2 + 66) + '" stroke="' + C + '" stroke-width="4" stroke-opacity=".6"/>';
    return svg(s);
  };

  // ── pub3 The Red Lion: public-house arms, two lions rampant supporting a crowned shield the cards land on ──
  var LION = 'M84 14L88 16L104 24L101 32L92 33L106 37L104 41L96 42L94 46L86 48L88 54L92 52L112 36L118 30L120 36L126 36L121 42L126 46L118 48L110 49L95 64L98 72L112 72L122 70L124 76L130 78L124 84L128 90L118 89L106 90L94 87L82 112L100 126L110 146L120 146L124 152L130 154L124 160L112 162L106 158L98 148L84 140L74 140L72 164L66 178L80 188L86 197L54 197L52 186L56 166L50 140L46 132C18 128 6 104 16 86C24 72 22 62 14 52L6 46L14 44L10 36L20 40L24 32L28 46L26 54C32 64 32 76 24 90C16 104 26 120 48 122L56 90L60 66L60 56L50 58L58 48L46 46L56 40L46 32L58 30L50 20L62 20L60 10L72 14L76 6Z';
  LOGOS.pub3 = function (o) {
    var p = parts(o.venue, 'Red Lion');
    var s = mirror('<path transform="translate(8 88) scale(1.02)" d="' + LION + '"/>');
    // crown over the shield
    s += '<path d="M268 60L262 34L280 48L300 28L320 48L338 34L332 60Z"/><rect x="266" y="62" width="68" height="9" rx="3"/>' +
      '<circle cx="262" cy="32" r="5"/><circle cx="300" cy="25" r="5"/><circle cx="338" cy="32" r="5"/>';
    // the shield, with a chevron
    s += '<path d="M220 86H380V168C380 222 342 250 300 266C258 250 220 222 220 168Z" fill-opacity=".3" stroke="' + C + '" stroke-width="7" stroke-linejoin="round"/>' +
      '<path d="M234 100H366V166C366 212 336 236 300 250C264 236 234 212 234 166Z" fill="none" stroke="' + C + '" stroke-width="4" stroke-opacity=".6"/>' +
      '<path d="M236 206L300 150L364 206" fill="none" stroke="' + C + '" stroke-width="16" stroke-opacity=".8"/>';
    s += T(300, 330, up((p.the ? p.the + ' ' : '') + p.name), 'DM Serif Display', 52, { max: 320, k: 0.53, ls: 1 });
    var sub = p.suf || 'Public House', w = W(sub, 30, 0.5, 1);
    s += T(300, 366, sub, 'Libre Caslon Text', 30, { it: 1, ls: 1 });
    s += '<path d="M' + R(300 - w / 2 - 50) + ' 356H' + R(300 - w / 2 - 14) + 'M' + R(300 + w / 2 + 14) + ' 356H' + R(300 + w / 2 + 50) + '" stroke="' + C + '" stroke-width="4" stroke-opacity=".7"/>';
    return svg(s);
  };

  // ── pub4 The Black Dog: the bar dog sprawled where the cards land, eyeing the 8-ball; dive-bar sticker name below ──
  var DOG = 'M0 100L0 92Q2 86 10 86L56 86L60 72Q56 62 50 56L30 54L12 52Q2 50 2 42Q2 34 10 33L30 30Q36 18 46 14Q60 6 72 14Q80 22 80 34Q84 46 96 52Q140 44 176 54Q198 62 200 84Q214 88 232 84L234 90Q216 98 200 96L200 100Z';
  var DOGK = 'M62 16Q80 26 74 52Q64 56 58 48M172 60Q150 72 158 100M62 76Q90 84 120 86';
  LOGOS.pub4 = function (o) {
    var u = '-' + (++N);
    var p = parts(o.venue, 'Black Dog');
    var sz = p.suf ? 64 : 70, cx = p.the && !p.suf ? 312 : 300;
    var s = '<mask id="pub4-m' + u + '"><rect width="600" height="400" fill="#fff"/>' +
      T(cx, 304 + sz * 0.36, up(p.name), 'Passion One', sz, { w: 700, max: p.suf ? 272 : 300, k: 0.51, ls: 1, fill: '#000' }) +
      (p.the ? T(138, 304, up(p.the), 'Passion One', 26, { w: 700, ls: 4, fill: '#000', tr: 'rotate(-90 138 304)' }) : '') +
      (p.suf ? T(462, 304, up(p.suf), 'Passion One', 22, { w: 700, ls: 2, fill: '#000', tr: 'rotate(90 462 304)' }) : '') + '</mask>';
    s += '<rect transform="rotate(-2 300 304)" x="112" y="258" width="376" height="92" rx="6" mask="url(#pub4-m' + u + ')"/>';
    s += T(300, 52, 'cold beer · pool · jukebox', 'Rock Salt', 19, { op: 0.9 });
    s += '<mask id="pub4-d' + u + '"><rect width="600" height="400" fill="#fff"/><path d="' + DOGK + '" fill="none" stroke="#000" stroke-width="4" stroke-linecap="round"/><circle cx="40" cy="27" r="3.5" fill="#000"/></mask>';
    s += '<path mask="url(#pub4-d' + u + ')" transform="translate(122 80) scale(1.55)" d="' + DOG + '"/>';
    // the 8-ball under the dog's nose
    s += '<mask id="pub4-b' + u + '"><rect width="600" height="400" fill="#fff"/><circle cx="84" cy="214" r="9.5" fill="#000"/></mask>' +
      '<circle cx="88" cy="220" r="21" mask="url(#pub4-b' + u + ')"/>' + T(84, 220, '8', 'Passion One', 15, { w: 700 });
    return svg(s);
  };

  // ── pub5 The Shamrock: one great shamrock the cards sit on, the Irish welcome over it, the name under it ──
  LOGOS.pub5 = function (o) {
    var p = parts(o.venue, 'Shamrock');
    var leaf = 'M0 0C-10 -20 -64 -40 -60 -84C-57 -112 -16 -118 0 -92C16 -118 57 -112 60 -84C64 -40 10 -20 0 0Z';
    var s = '<g transform="translate(300 186)">';
    [0, -116, 116].forEach(function (a) {
      s += '<g transform="rotate(' + a + ')"><path d="' + leaf + '" fill-opacity=".5" stroke="' + C + '" stroke-width="5" stroke-linejoin="round"/>' +
        '<path d="M0 -6V-80" stroke="' + C + '" stroke-width="4" stroke-linecap="round"/></g>';
    });
    s += '<path d="M0 0C4 20 10 34 22 44" fill="none" stroke="' + C + '" stroke-width="8" stroke-linecap="round"/></g>';
    s += T(300, 46, 'Céad Míle Fáilte', 'Dancing Script', 30, { w: 700, op: 0.9 });
    s += T(300, 342, (p.the ? p.the + ' ' : '') + p.name, 'MedievalSharp', 52, { max: 380, k: 0.55, sw: 0.8 });
    var sub = up(p.suf || 'Irish Pub'), w = W(sub, 20, 0.62, 8);
    s += T(300, 374, sub, 'MedievalSharp', 20, { ls: 8, op: 0.85 });
    s += '<path d="M' + R(300 - w / 2 - 22) + ' 367l-6-6-6 6 6 6zM' + R(300 + w / 2 + 16) + ' 367l6-6 6 6-6 6z"/>';
    return svg(s);
  };

  // ── pub6 The Tin Cup: the golfers' nineteenth hole; the cards are dealt on the green, by the pin ──
  LOGOS.pub6 = function (o) {
    var u = '-' + (++N);
    var p = parts(o.venue, 'Tin Cup');
    var x0 = 92, nm = up(p.name), nw = Math.min(385, W(nm, 98, 0.57, 1)), small = { w: 700, ls: 7, op: 0.85 };
    var s = '<mask id="pub6-m' + u + '"><rect width="600" height="400" fill="#fff"/>' + T(509, 76, '19', 'Fugaz One', 25, { fill: '#000' }) + '</mask>';
    s += T(x0, 134, nm, 'Fugaz One', 98, { anchor: 'start', max: 385, k: 0.57, ls: 1 });
    // "THE ———— TAVERN" over the name, one line squared to it
    var a = x0 + 2, b = x0 + nw;
    if (p.the) { s += T(a, 52, up(p.the), 'Saira Condensed', 24, Object.assign({ anchor: 'start' }, small)); a += W(up(p.the), 24, 0.45, 7) + 14; }
    if (p.suf) { s += T(b, 52, up(p.suf), 'Saira Condensed', 24, Object.assign({ anchor: 'end' }, small)); b -= W(up(p.suf), 24, 0.45, 7) + 16; }
    s += '<path d="M' + R(a) + ' 44H' + R(b) + '" stroke="' + C + '" stroke-width="4" stroke-opacity=".6"/>';
    // the green, the pin, the ball
    s += '<ellipse cx="290" cy="262" rx="240" ry="88" fill="none" stroke="' + C + '" stroke-width="6"/>' +
      '<ellipse cx="290" cy="262" rx="222" ry="72" fill="none" stroke="' + C + '" stroke-width="4" stroke-opacity=".45" stroke-dasharray="1 13" stroke-linecap="round"/>';
    s += '<ellipse cx="488" cy="292" rx="20" ry="6"/><path d="M488 40V292" stroke="' + C + '" stroke-width="6"/><path mask="url(#pub6-m' + u + ')" d="M488 42Q508 34 532 46V88Q510 78 488 88Z"/>';
    s += '<circle cx="440" cy="300" r="10"/>';
    s += T(268, 306, 'NINETEENTH HOLE', 'Saira Condensed', 24, { w: 700, ls: 6, op: 0.9 });
    return svg(s);
  };

  // ── pub7 The Iron Horse: railroad saloon, wanted-poster lettering over a steam engine on the rails ──
  LOGOS.pub7 = function (o) {
    var p = parts(o.venue, 'Iron Horse');
    var s = '';
    if (p.the) s += T(300, 52, up(p.the), 'Ranchers', 26, { ls: 6 }) + '<path d="M196 43H262M338 43H404" stroke="' + C + '" stroke-width="4"/>';
    s += T(300, 114, up(p.name), 'Ranchers', 74, { max: 450, k: 0.5, ls: 2 });
    s += T(300, 142, (p.suf ? up(p.suf) + '  ·  ' : '') + 'WHISKEY BY THE TRACKS', 'Arvo', 17, { w: 700, ls: 3, max: 440, k: 0.64, op: 0.85 });
    // smoke
    s += '<g fill-opacity=".35"><circle cx="210" cy="226" r="14"/><circle cx="236" cy="210" r="20"/><circle cx="276" cy="200" r="24"/><circle cx="322" cy="196" r="20"/></g>';
    // locomotive (facing left)
    s += '<path fill-rule="evenodd" d="M372 238H452V246H446V322H372ZM386 254V280H426V254Z"/>' +
      '<rect x="190" y="276" width="186" height="44" rx="6"/><rect x="176" y="270" width="24" height="52" rx="4"/>' +
      '<path d="M198 276L195 250L184 240H226L215 250L212 276Z"/><path d="M252 277A18 16 0 0 1 288 277Z"/><path d="M312 277A14 12 0 0 1 340 277Z"/>' +
      '<rect x="164" y="256" width="14" height="14" rx="2"/>' +
      '<path d="M178 322L146 348H206V322Z"/><rect x="170" y="318" width="290" height="8"/>' +
      '<rect x="452" y="268" width="56" height="54" rx="3" fill-opacity=".7"/>';
    [[262, 20], [312, 20], [362, 20]].forEach(function (w) {
      s += '<circle cx="' + w[0] + '" cy="330" r="' + w[1] + '" fill="none" stroke="' + C + '" stroke-width="6"/><circle cx="' + w[0] + '" cy="330" r="5"/>';
    });
    s += '<circle cx="216" cy="338" r="12" fill="none" stroke="' + C + '" stroke-width="5"/><circle cx="420" cy="338" r="12" fill="none" stroke="' + C + '" stroke-width="5"/>' +
      '<circle cx="468" cy="338" r="12" fill="none" stroke="' + C + '" stroke-width="5"/><circle cx="496" cy="338" r="12" fill="none" stroke="' + C + '" stroke-width="5"/>';
    s += '<path d="M262 334H362" stroke="' + C + '" stroke-width="6" stroke-linecap="round"/>';
    s += '<path d="M100 352H520" stroke="' + C + '" stroke-width="5"/>';
    for (var x = 110; x <= 510; x += 25) s += '<rect x="' + (x - 7) + '" y="356" width="14" height="7" fill-opacity=".6"/>';
    return svg(s);
  };

  // ── pub8 The Blue Moose: ski-lodge trophy antlers spanning the top, trail-marker tagline ──
  var ANTLER = 'M284 146C268 140 252 134 236 132C196 136 140 132 110 112C96 102 86 90 82 76Q76 60 88 60Q96 62 98 74L104 58Q104 42 116 44Q124 48 120 66L132 52Q136 34 148 38Q154 44 146 64L162 52Q170 32 182 38Q186 46 176 66L192 60Q202 44 212 50Q214 58 202 76C214 88 224 96 236 100L246 92Q252 80 262 84Q264 92 256 104C266 112 276 122 290 128Z';
  LOGOS.pub8 = function (o) {
    var p = parts(o.venue, 'Blue Moose');
    var s = mirror('<path d="' + ANTLER + '"/>');
    // the head between them, ears out
    s += '<path d="M272 138C276 118 324 118 328 138L322 196Q300 212 278 196Z"/>' +
      '<path d="M272 146C256 140 236 146 226 156C242 162 260 160 274 154Z" fill-opacity=".7"/><path d="M328 146C344 140 364 146 374 156C358 162 340 160 326 154Z" fill-opacity=".7"/>';
    s += T(300, 276, up(p.the || ''), 'Quicksand', 21, { w: 700, ls: 10, op: 0.85 });
    s += T(300, 334, up(p.name), 'Righteous', 68, { max: 440, k: 0.63, ls: 1 });
    var tag = up(p.suf ? p.suf + ' · Ski Bar' : 'Après Ski Bar'), w = W(tag, 20, 0.54, 5);
    s += T(300, 372, tag, 'Quicksand', 20, { w: 700, ls: 5, op: 0.85 });
    var l = R(300 - w / 2 - 22), r = R(300 + w / 2 + 18);
    s += '<circle cx="' + R(l - 26) + '" cy="365" r="8"/><rect x="' + R(l - 8) + '" y="358" width="14" height="14"/>' +
      '<path d="M' + (r + 9) + ' 356l9 9-9 9-9-9z"/><path d="M' + (r + 31) + ' 356l9 9-9 9-9-9z"/>';
    return svg(s);
  };

  // ── pub9 The Lucky Penny: the bar's lucky coin, a wheat cent with the name round the rim ──
  LOGOS.pub9 = function (o) {
    var u = '-' + (++N);
    var p = parts(o.venue, 'Lucky Penny');
    var s = '<circle cx="300" cy="200" r="184" fill="none" stroke="' + C + '" stroke-width="8"/>' +
      '<circle cx="300" cy="200" r="172" fill="none" stroke="' + C + '" stroke-width="7" stroke-dasharray="0 13.5" stroke-linecap="round"/>' +
      '<circle cx="300" cy="200" r="160" fill="none" stroke="' + C + '" stroke-width="4" stroke-opacity=".7"/>';
    s += '<path id="pub9-t' + u + '" d="M170 200A130 130 0 0 1 430 200" fill="none"/><path id="pub9-b' + u + '" d="M152 200A148 148 0 0 0 448 200" fill="none"/>';
    var top = up((p.the ? p.the + ' ' : '') + p.name), sz = Math.min(46, 340 / (top.length * 0.5 + (top.length - 1) * 0.08));
    s += '<text font-family="Forum" font-size="' + R(sz) + '" letter-spacing="' + R(sz * 0.08) + '" text-anchor="middle" stroke="' + C + '" stroke-width="1.2" stroke-linejoin="round"><textPath href="#pub9-t' + u + '" startOffset="50%">' + E(top) + '</textPath></text>';
    s += '<text font-family="Forum" font-size="22" letter-spacing="4" text-anchor="middle" fill-opacity=".85"><textPath href="#pub9-b' + u + '" startOffset="50%">IN LUCK WE TRUST</textPath></text>';
    s += T(300, 120, up(p.suf || 'Karaoke'), 'Forum', 24, { ls: 9, op: 0.9, sw: 0.6 });
    // a wheat cent: ONE CENT between two ears of wheat
    s += T(300, 198, 'ONE', 'Forum', 40, { ls: 4, sw: 0.8, op: 0.8 }) + T(300, 244, 'CENT', 'Forum', 40, { ls: 4, sw: 0.8, op: 0.8 });
    var ear = '', i;
    for (i = 0; i < 7; i++) {
      var t = 0.32 + i * 0.1, x0 = 204, y0 = 290, cx = 160, cy = 280, x1 = 176, y1 = 200;
      var x = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * cx + t * t * x1, y = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * cy + t * t * y1;
      var dx = 2 * (1 - t) * (cx - x0) + 2 * t * (x1 - cx), dy = 2 * (1 - t) * (cy - y0) + 2 * t * (y1 - cy), a = Math.atan2(dy, dx) * 180 / Math.PI + 90;
      ear += '<ellipse cx="0" cy="-12" rx="5.5" ry="12" transform="translate(' + R(x) + ' ' + R(y) + ') rotate(' + R(a - 32) + ')"/><ellipse cx="0" cy="-12" rx="5.5" ry="12" transform="translate(' + R(x) + ' ' + R(y) + ') rotate(' + R(a + 32) + ')"/>';
    }
    ear += '<ellipse cx="178" cy="188" rx="5.5" ry="12" transform="rotate(10 178 188)"/><path d="M204 290Q160 280 176 200" fill="none" stroke="' + C + '" stroke-width="5" stroke-linecap="round"/>';
    s += mirror(ear);
    return svg(s);
  };
})();

// ── g4 ──
// g4: the Hold'em road's named tournament stops, $400 deepstack to the World Championship
(function () {
  var W = 'fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"';
  function f(n) { return Math.round(n * 10) / 10; }
  function up(s) { return E(String(s || '').toUpperCase()); }
  function svg(b) { return '<svg viewBox="0 0 600 400" xmlns="http://www.w3.org/2000/svg" fill="currentColor">' + b + '</svg>'; }
  // squeeze a line into max units when its estimated width (k: average glyph width in em) runs over
  function fit(s, size, k, max, ls) { var w = String(s).length * (size * k + (ls || 0)); return w > max ? ' textLength="' + max + '" lengthAdjust="spacingAndGlyphs"' : ''; }
  // a line of text, centred on x (letter-spacing adds a trailing gap, so nudge right by half of it)
  function T(x, y, size, fam, s, a, k, max) {
    a = a || {}; var ls = a.ls || 0, raw = a.raw != null ? a.raw : s;
    return '<text x="' + f(x + ls / 2) + '" y="' + y + '" text-anchor="' + (a.anchor || 'middle') + '" font-family="' + fam + '" font-size="' + size + '"' +
      (a.w ? ' font-weight="' + a.w + '"' : '') + (a.it ? ' font-style="italic"' : '') + (ls ? ' letter-spacing="' + ls + '"' : '') +
      (a.op ? ' fill-opacity="' + a.op + '"' : '') + (a.sw ? ' stroke="currentColor" stroke-width="' + a.sw + '" stroke-linejoin="round"' + (a.op ? ' stroke-opacity="' + a.op + '"' : '') : '') + (max ? fit(raw, size, k, max, ls) : '') + '>' + s + '</text>';
  }
  function star(cx, cy, R, r, n, rot) {
    var p = [], i, a; rot = rot == null ? -90 : rot;
    for (i = 0; i < n * 2; i++) { a = (rot + i * 180 / n) * Math.PI / 180; p.push(f(cx + Math.cos(a) * (i % 2 ? r : R)) + ',' + f(cy + Math.sin(a) * (i % 2 ? r : R))); }
    return p.join(' ');
  }
  function words(v) { var w = String(v || '').split(/\s+/).filter(Boolean); return w; }

  // ── Gulf Coast Classic · Biloxi: a striped sunset on the Gulf, the Biloxi lighthouse and a beach palm ──────────
  SAMPLE.gulf = { venue: 'Gulf Coast Classic', city: 'Biloxi', style: 'Deepstack' };
  LOGOS.gulf = function (o) {
    var w = words(o.venue), last = w.length > 1 ? w.pop() : '', first = w.join(' ');
    var s = '<defs><clipPath id="gulf-s"><rect x="200" y="40" width="200" height="62"/><rect x="200" y="108" width="200" height="11"/>' +
      '<rect x="200" y="125" width="200" height="7"/><rect x="200" y="137" width="200" height="4"/></clipPath></defs>';
    s += '<circle cx="300" cy="142" r="88" clip-path="url(#gulf-s)"/>';
    s += '<path d="M104 147H496" ' + W + ' stroke-width="5" stroke-opacity=".7"/>';
    var gl = '', gw = [176, 150, 128, 108, 90, 74, 60, 48, 38];
    gw.forEach(function (wd, k) { var y = 160 + k * 13, x0 = 300 - wd / 2 + (k % 2 ? 8 : -8); gl += 'M' + f(x0) + ' ' + y + 'h' + f(wd * 0.42) + 'M' + f(x0 + wd * 0.56) + ' ' + y + 'h' + f(wd * 0.44); });
    s += '<path d="' + gl + '" ' + W + ' stroke-width="5" stroke-opacity=".5"/>';
    // gulls
    s += '<path d="M136 80q10-10 20 0q10-10 20 0M168 106q7-7 14 0q7-7 14 0" ' + W + ' stroke-width="4.5" stroke-opacity=".8"/>';
    // Biloxi lighthouse (cast-iron cone, lantern, beam over the water)
    s += '<path d="M84 117L156 98V140Z" fill-opacity=".3"/>';
    s += '<path d="M55 302L64 146H84L93 302Z"/><rect x="55" y="136" width="38" height="8" rx="2"/><rect x="47" y="300" width="54" height="9" rx="2"/>';
    s += '<path d="M65 134V114H83V134M74 114V134" ' + W + ' stroke-width="4"/><path d="M61 114Q74 92 87 114Z"/><path d="M74 98V86" ' + W + ' stroke-width="4"/>';
    // palm
    s += '<path d="M538 306Q546 232 516 162" ' + W + ' stroke-width="9"/>';
    s += '<path d="M516 158Q486 132 452 148Q488 140 516 164Z"/><path d="M516 158Q488 160 468 196Q494 168 518 164Z"/>' +
      '<path d="M516 160Q522 124 498 100Q530 122 522 160Z"/><path d="M516 158Q546 132 570 144Q546 142 518 164Z"/><path d="M516 160Q546 164 556 196Q536 170 514 164Z"/>';
    // wordmark
    s += T(300, 322, 54, 'Shrikhand', E(first || o.venue), { raw: first || o.venue }, 0.6, 410);
    if (last) {
      s += T(300, 354, 27, 'Sofia Sans Condensed', up(last), { w: 800, ls: 12, raw: last }, 0.5, 220);
      s += '<path d="M150 346q9-9 18 0t18 0t18 0M396 346q9-9 18 0t18 0t18 0" ' + W + ' stroke-width="4.5"/>';
    }
    s += T(300, 380, 15, 'Sofia Sans Condensed', up(o.city) + ' &#183; ' + up(o.style), { w: 700, ls: 5, raw: o.city + ' . ' + o.style }, 0.5, 300);
    return svg(s);
  };

  // ── Silver Spur · Reno: the name rides a Reno-style arch on two pillars; a spur and rowel under the board ───────
  SAMPLE.reno = { venue: 'Silver Spur', city: 'Reno', style: 'Bounty' };
  LOGOS.reno = function (o) {
    function ay(r, x) { return f(560 - Math.sqrt(r * r - (x - 300) * (x - 300))); }
    var s = '<defs><path id="reno-a" d="M66 ' + ay(447, 66) + 'A447 447 0 0 1 534 ' + ay(447, 534) + '"/></defs>';
    s += '<path d="M56 336V' + ay(495, 56) + 'A495 495 0 0 1 544 ' + ay(495, 544) + 'V336" ' + W + ' stroke-width="6"/>';
    s += '<path d="M90 336V' + ay(428, 90) + 'A428 428 0 0 1 510 ' + ay(428, 510) + 'V336" ' + W + ' stroke-width="6"/>';
    s += '<rect x="46" y="332" width="54" height="12" rx="2"/><rect x="500" y="332" width="54" height="12" rx="2"/>';
    s += '<path d="M56 250H90M510 250H544" ' + W + ' stroke-width="4" stroke-opacity=".6"/>';
    for (var a = -26; a <= 26; a += 4) { var t = a * Math.PI / 180; s += '<circle cx="' + f(300 + 516 * Math.sin(t)) + '" cy="' + f(560 - 516 * Math.cos(t)) + '" r="4.5"/>'; }
    s += '<polygon points="' + star(300, 26, 19, 8, 5) + '"/>';
    s += '<text font-family="Diplomata SC" font-size="40" text-anchor="middle"><textPath href="#reno-a" startOffset="50%"' + fit(o.venue, 40, 1.12, 430) + '>' + up(o.venue) + '</textPath></text>';
    // spur: heel band, strap button, shank, rowel, hung in the arch across the middle
    s += '<g transform="translate(0 -52)">';
    s += '<path d="M162 258C168 336 290 344 344 302L336 290C286 322 186 318 180 258Z"/><circle cx="171" cy="257" r="12"/><path d="M171 257L150 246" ' + W + ' stroke-width="8"/>';
    s += '<path d="M336 297L392 305" ' + W + ' stroke-width="10"/><path d="M356 302q6 22-4 30" ' + W + ' stroke-width="4" stroke-opacity=".6"/>';
    s += '<path fill-rule="evenodd" d="M' + star(426, 307, 37, 12, 12).replace(/ /g, 'L') + 'ZM432 307a6 6 0 1 0-12 0a6 6 0 1 0 12 0Z"/></g>';
    s += T(300, 344, 26, 'Wellfleet', up(o.city) + ' &#183; ' + up(o.style), { ls: 2, raw: o.city + ' . ' + o.style }, 0.7, 300);
    return svg(s);
  };

  // ── Boardwalk Open · Atlantic City: a light-bulb marquee holds the name; the pier's big Ferris wheel turns behind the board ─
  SAMPLE.boardwalk = { venue: 'Boardwalk Open', city: 'Atlantic City', style: 'Deepstack' };
  LOGOS.boardwalk = function (o) {
    var w = words(o.venue), last = w.length > 1 ? w.pop() : '', first = w.join(' '), s = '', x, y, i;
    // Ferris wheel, centred behind the board, standing on the pier
    var cx = 300, cy = 252, r = 84;
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" ' + W + ' stroke-width="6"/><circle cx="' + cx + '" cy="' + cy + '" r="' + (r - 18) + '" ' + W + ' stroke-width="4" stroke-opacity=".5"/>';
    for (i = 0; i < 12; i++) {
      var t = (i * 30 + 15) * Math.PI / 180, ex = cx + Math.cos(t) * r, ey = cy + Math.sin(t) * r;
      s += '<path d="M' + cx + ' ' + cy + 'L' + f(ex) + ' ' + f(ey) + '" ' + W + ' stroke-width="4" stroke-opacity=".6"/><rect x="' + f(ex - 8) + '" y="' + f(ey + 1) + '" width="16" height="12" rx="4"/>';
    }
    s += '<path d="M' + cx + ' ' + cy + 'L258 344M' + cx + ' ' + cy + 'L342 344" ' + W + ' stroke-width="7"/><circle cx="' + cx + '" cy="' + cy + '" r="10"/>';
    s += '<rect x="96" y="344" width="408" height="9" rx="2"/>';
    // striped beach umbrellas either side
    [150, 450].forEach(function (u) {
      s += '<path d="M' + u + ' 290V344" ' + W + ' stroke-width="5"/>';
      s += '<path d="M' + (u - 46) + ' 298Q' + u + ' 244 ' + (u + 46) + ' 298Q' + (u + 34) + ' 290 ' + (u + 23) + ' 298Q' + (u + 11) + ' 290 ' + u + ' 298Q' + (u - 11) + ' 290 ' + (u - 23) + ' 298Q' + (u - 34) + ' 290 ' + (u - 46) + ' 298Z" fill-opacity=".35"/>';
      s += '<path d="M' + (u - 46) + ' 298Q' + (u - 34) + ' 290 ' + (u - 23) + ' 298Q' + (u - 18) + ' 268 ' + u + ' 258Q' + (u - 30) + ' 262 ' + (u - 46) + ' 298ZM' + u + ' 298Q' + (u + 11) + ' 290 ' + (u + 23) + ' 298Q' + (u + 18) + ' 268 ' + u + ' 258Z"/>';
    });
    s += T(300, 378, 13, 'Bungee', up(o.city) + ' &#183; ' + up(o.style), { ls: 3, raw: o.city + ' . ' + o.style, op: '.8' }, 0.75, 300);
    // the marquee
    s += '<rect x="104" y="26" width="392" height="122" rx="12" ' + W + ' stroke-width="5"/>';
    for (x = 120; x <= 481; x += 22.6) s += '<circle cx="' + f(x) + '" cy="40" r="4"/><circle cx="' + f(x) + '" cy="134" r="4"/>';
    for (y = 63; y <= 112; y += 24) s += '<circle cx="120" cy="' + y + '" r="4"/><circle cx="480" cy="' + y + '" r="4"/>';
    s += T(300, 88, 40, 'Holtwood One SC', up(first || o.venue), { raw: first || o.venue }, 0.95, 320);
    if (last) {
      s += T(300, 120, 24, 'Holtwood One SC', up(last), { ls: 12, raw: last }, 0.95, 200);
      s += '<path d="M200 111H236M364 111H400" ' + W + ' stroke-width="4" stroke-opacity=".6"/>';
    }
    return svg(s);
  };

  // ── Lakeshore Open · Chicago: the city flag's two blue stripes and six-point stars, the skyline on the lake ────
  SAMPLE.chicago = { venue: 'Lakeshore Open', city: 'Chicago', style: 'Freezeout' };
  LOGOS.chicago = function (o) {
    var s = '';
    s += T(300, 100, 72, 'Big Shoulders Display', up(o.venue), { w: 900, ls: 2, raw: o.venue }, 0.46, 450);
    s += T(300, 127, 20, 'Big Shoulders Display', up(o.city) + ' &#183; ' + up(o.style), { w: 900, ls: 9, raw: o.city + ' . ' + o.style, op: '.85' }, 0.5, 300);
    s += '<rect x="64" y="137" width="472" height="11"/><rect x="92" y="340" width="416" height="11"/>';
    [171, 257, 343, 429].forEach(function (x) { s += '<polygon points="' + star(x, 199, 32, 14, 6) + '"/>'; });
    // skyline, base 334: boxes, the Aon slab, Hancock (tapered, twin masts), Willis (setbacks, twin masts), Trump spire
    var b = [[116, 312, 18], [136, 298, 16], [154, 318, 14], [170, 304, 12], [184, 276, 22], [208, 300, 14], [258, 296, 14], [274, 286, 16], [292, 306, 8],
      [362, 294, 16], [380, 310, 14], [396, 288, 20], [418, 304, 16], [436, 296, 18], [456, 312, 14], [472, 320, 14]], p = '';
    b.forEach(function (q) { p += 'M' + q[0] + ' 334V' + q[1] + 'H' + (q[0] + q[2]) + 'V334Z'; });
    p += 'M224 334L230 274H250L256 334Z';                                  // Hancock
    p += 'M302 334V296H308V282H314V270H332V282H338V296H344V334Z';           // Willis
    p += 'M346 334V286H350V276H354V266H358V334Z';                           // Trump
    s += '<path d="' + p + '"/>';
    s += '<path d="M235 274V256M245 274V256M318 270V252M328 270V254M356 266V252" ' + W + ' stroke-width="4"/>';
    return svg(s);
  };

  // ── Tahoe Summit · Lake Tahoe: a snow-capped Sierra ridge with a summit flag, pines, ripples on the lake ───────
  SAMPLE.tahoe = { venue: 'Tahoe Summit', city: 'Lake Tahoe', style: 'Bounty' };
  LOGOS.tahoe = function (o) {
    var pk = [[66, 152], [128, 102], [158, 120], [214, 62], [250, 92], [300, 36], [346, 84], [382, 66], [432, 110], [466, 94], [534, 152]], s = '', i;
    s += '<polygon points="' + pk.map(function (q) { return q.join(','); }).join(' ') + '" fill-opacity=".4"/>';
    for (i = 1; i < pk.length - 1; i++) {
      var P = pk[i], L = pk[i - 1], R = pk[i + 1]; if (P[1] > L[1] && P[1] > R[1]) continue;   // valleys get no snow
      var h = (i === 5 ? 0.42 : 0.36), lx = P[0] + (L[0] - P[0]) * h, ly = P[1] + (L[1] - P[1]) * h, rx = P[0] + (R[0] - P[0]) * h, ry = P[1] + (R[1] - P[1]) * h;
      s += '<polygon points="' + [P, [rx, ry], [P[0] + (rx - P[0]) * 0.55, ry - 4], [P[0] + (rx - P[0]) * 0.15, ry + 5], [P[0] + (lx - P[0]) * 0.45, ly - 3], [lx, ly]].map(function (q) { return f(q[0]) + ',' + f(q[1]); }).join(' ') + '"/>';
    }
    var rf = pk.map(function (q) { return f(q[0]) + ',' + f(158 + (152 - q[1]) * 0.62); }).join(' '), ln = '';
    for (i = 0; i < 9; i++) ln += '<rect x="40" y="' + (160 + i * 11) + '" width="520" height="6"/>';
    s += '<defs><clipPath id="tahoe-w">' + ln + '</clipPath></defs><polygon clip-path="url(#tahoe-w)" points="' + rf + '" fill-opacity=".3"/>';
    s += '<path d="M300 36V12" ' + W + ' stroke-width="4"/><path d="M302 12L324 18L302 25Z"/>';
    function pine(x, top, bot, wd) { var hgt = bot - top, q = '', k; for (k = 0; k < 3; k++) { var ty = top + k * hgt * 0.24, by = top + hgt * (0.36 + k * 0.24), hw = wd * (0.5 + k * 0.25); q += 'M' + x + ' ' + f(ty) + 'L' + f(x + hw) + ' ' + f(by) + 'H' + f(x - hw) + 'Z'; } return '<path d="' + q + 'M' + (x - 3) + ' ' + f(top + hgt * 0.84) + 'h6V' + bot + 'h-6Z"/>'; }
    s += pine(62, 158, 262, 34) + pine(98, 192, 262, 24) + pine(538, 158, 262, 34) + pine(502, 192, 262, 24);
    s += '<path d="M40 266H560" ' + W + ' stroke-width="4" stroke-opacity=".5"/>';
    s += '<path d="M200 279H400M236 290H364" ' + W + ' stroke-width="4" stroke-opacity=".45"/>';
    s += T(300, 337, 46, 'Patua One', E(o.venue), { ls: 3, raw: o.venue }, 0.56, 420);
    var el = /tahoe/i.test(o.city + o.venue) ? ' &#183; ELEV. 6,225 FT' : '';   // the lake's surface elevation
    s += T(300, 364, 15, 'Sofia Sans', up(o.city) + el + ' &#183; ' + up(o.style), { w: 700, ls: 4, raw: o.city + (el ? ' . ELEV. 6,225 FT' : '') + ' . ' + o.style, op: '.85' }, 0.6, 400);
    return svg(s);
  };

  // ── Grand Prix de Paris: the Eiffel Tower in a ring medallion, standing on the script name ─────────────────
  SAMPLE.paris = { venue: 'Grand Prix de Paris', city: 'Paris', style: 'Freezeout' };
  LOGOS.paris = function (o) {
    var v = String(o.venue), m = v.match(/^(.*?)\s+((?:de|of|du)\s+.*)$/i), head = m ? m[1] : v, tail = m ? m[2] : o.city;
    var L = [['M', -3, 40], ['L', -7, 52], ['Q', -10, 100, -24, 134], ['L', -36, 134], ['L', -36, 146], ['L', -27, 146], ['Q', -36, 212, -60, 250], ['L', -78, 250], ['L', -78, 264], ['L', -64, 264],
      ['Q', -84, 316, -126, 342], ['L', -88, 342], ['Q', -62, 290, 0, 288]];
    var d = '', i, c;
    L.forEach(function (q) { d += q[0] + q.slice(1).map(function (n, j) { return j % 2 ? n : 300 + n; }).join(' '); });
    for (i = L.length - 1; i > 0; i--) {                    // mirror back up the right side
      c = L[i]; var prev = L[i - 1], ex = 600 - (300 + prev[prev.length - 2]), ey = prev[prev.length - 1];
      d += c[0] === 'Q' ? 'Q' + (600 - (300 + c[1])) + ' ' + c[2] + ' ' + ex + ' ' + ey : 'L' + ex + ' ' + ey;
    }
    var s = '<circle cx="300" cy="150" r="118" ' + W + ' stroke-width="5" stroke-opacity=".55"/>';
    s += '<g transform="translate(300 2) scale(0.78) translate(-300 0)"><path d="' + d + 'Z"/><path d="M300 40V16" ' + W + ' stroke-width="5"/></g>';
    s += '<path d="M150 272H450" ' + W + ' stroke-width="5"/>';
    [[232, 82, 10], [372, 104, 9], [250, 128, 7], [352, 58, 7]].forEach(function (q) { s += '<polygon points="' + star(q[0], q[1], q[2], q[2] * 0.28, 4) + '" fill-opacity=".85"/>'; });
    s += T(300, 330, 70, 'Parisienne', E(head), { raw: head, sw: 2 }, 0.44, 400);
    s += T(300, 364, 20, 'Sofia Sans Condensed', up(tail), { w: 700, ls: 12, raw: tail }, 0.5, 260);
    return svg(s);
  };

  // ── Riviera High Roller · Monte Carlo: a crowned shield in the Grimaldi lozenges, the name on a ribbon ────────
  SAMPLE.monaco = { venue: 'Riviera High Roller', city: 'Monte Carlo', style: 'High Roller' };
  LOGOS.monaco = function (o) {
    var shield = 'M206 74H394V214Q394 296 300 338Q206 296 206 214Z', band = 'M120 302Q300 338 480 302V352Q300 388 120 352Z', s = '', i, j;
    s += '<defs><clipPath id="monaco-c"><path d="' + shield + '"/></clipPath><mask id="monaco-m" maskUnits="userSpaceOnUse" x="0" y="0" width="600" height="400">' +
      '<rect width="600" height="400" fill="#fff"/><path d="M110 292Q300 328 490 292V362Q300 398 110 362Z" fill="#000"/>' +
      T(300, 104, 19, 'Marcellus SC', up(o.city), { ls: 2, raw: o.city }, 0.76, 164).replace('<text', '<text fill="#000"') + '</mask>' +
      '<path id="monaco-t" d="M128 338Q300 372 472 338"/></defs>';
    var lz = '';
    for (j = 0; j < 7; j++) for (i = 0; i < 6; i++) { var x = 206 + i * 38, y = 74 + j * 50; lz += 'M' + x + ' ' + (y - 25) + 'L' + (x + 19) + ' ' + y + 'L' + x + ' ' + (y + 25) + 'L' + (x - 19) + ' ' + y + 'Z'; }
    s += '<g mask="url(#monaco-m)"><g clip-path="url(#monaco-c)"><path d="' + lz + '" fill-opacity=".5" transform="translate(0 50)"/></g><path d="M206 74H394V116H206Z"/><path d="' + shield + '" ' + W + ' stroke-width="7"/></g>';
    // crown
    s += '<path d="M260 64L254 30L278 46L300 20L322 46L346 30L340 64Z"/><rect x="258" y="62" width="84" height="8" rx="2"/>';
    s += '<circle cx="254" cy="26" r="5"/><circle cx="300" cy="15" r="6"/><circle cx="346" cy="26" r="5"/>';
    // ribbon: tails behind, band in front
    s += '<path d="M90 318H126V368H90L104 343Z" fill-opacity=".45"/><path d="M510 318H474V368H510L496 343Z" fill-opacity=".45"/>';
    s += '<path d="' + band + '" ' + W + ' stroke-width="5"/>';
    s += '<text font-family="Marcellus SC" font-size="33" text-anchor="middle" letter-spacing="3" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"><textPath href="#monaco-t" startOffset="50%"' + fit(o.venue, 33, 0.72, 330, 3) + '>' + up(o.venue) + '</textPath></text>';
    return svg(s);
  };

  // ── Dragon Cup · Macau: a bold Chinese dragon snakes over the board, open-mouthed, chasing the flaming pearl ────
  SAMPLE.macau = { venue: 'Dragon Cup', city: 'Macau', style: 'Deepstack' };
  LOGOS.macau = function (o) {
    // body centreline, neck to tail: over the top in two waves, then down the right side
    var K = [[238, 104], [282, 70], [330, 50], [376, 82], [416, 118], [458, 100], [498, 66], [532, 84], [544, 138], [540, 192], [522, 234], [496, 260]];
    var C = [], i, j, s = '', f = Math.round;
    for (i = 0; i < K.length - 1; i++) {
      var p0 = K[i - 1] || K[i], p1 = K[i], p2 = K[i + 1], p3 = K[i + 2] || K[i + 1];
      for (j = 0; j < 8; j++) {
        var t = j / 8, t2 = t * t, t3 = t2 * t;
        C.push([0, 1].map(function (d) { return 0.5 * (2 * p1[d] + (-p0[d] + p2[d]) * t + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * t2 + (-p0[d] + 3 * p1[d] - 3 * p2[d] + p3[d]) * t3); }));
      }
    }
    C.push(K[K.length - 1]);
    var N = C.length - 1, back = [], mid = [], belly = [], nrm = [], wid = [];
    for (i = 0; i <= N; i++) {
      var a = C[Math.max(0, i - 1)], b = C[Math.min(N, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy), n = [dy / l, -dx / l], u = i / N;
      var w = u < 0.06 ? 30 + u * 130 : 38 - 30 * Math.pow((u - 0.06) / 0.94, 1.2);
      nrm.push(n); wid.push(w);
      back.push([C[i][0] + n[0] * w / 2, C[i][1] + n[1] * w / 2]); mid.push([C[i][0] - n[0] * w * 0.12, C[i][1] - n[1] * w * 0.12]); belly.push([C[i][0] - n[0] * w / 2, C[i][1] - n[1] * w / 2]);
    }
    function poly(A, B) { return 'M' + A.concat(B.slice().reverse()).map(function (q) { return f(q[0]) + ' ' + f(q[1]); }).join('L') + 'Z'; }
    // scales: chevrons pointing to the tail, knocked out of the back; plates across the belly
    var sc = '', pl = '';
    for (i = 3; i < N - 4; i += 3) {
      var c = C[i], n2 = nrm[i], w2 = wid[i], tx = -n2[1], ty = n2[0], r = w2 * 0.24, cx = c[0] + n2[0] * w2 * 0.2, cy = c[1] + n2[1] * w2 * 0.2;
      sc += 'M' + f(cx - tx * r + n2[0] * r) + ' ' + f(cy - ty * r + n2[1] * r) + 'Q' + f(cx + tx * r * 0.3) + ' ' + f(cy + ty * r * 0.3) + ' ' + f(cx - tx * r - n2[0] * r) + ' ' + f(cy - ty * r - n2[1] * r);
      pl += 'M' + f(mid[i][0]) + ' ' + f(mid[i][1]) + 'L' + f(belly[i][0] - n2[0] * 2) + ' ' + f(belly[i][1] - n2[1] * 2);
    }
    s += '<defs><mask id="macau-m" maskUnits="userSpaceOnUse" x="0" y="0" width="600" height="400"><rect width="600" height="400" fill="#fff"/>' +
      '<path d="' + sc + '" fill="none" stroke="#000" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="' + pl + '" stroke="#000" stroke-width="4"/></mask></defs>';
    // dorsal fins: flame-shaped spikes raked back toward the tail
    var fin = '';
    for (i = 3; i < N - 2; i += 4) {
      var p = back[i], q2 = back[Math.min(N, i + 3)], n3 = nrm[i], h = 9 + wid[i] * 0.45;
      fin += 'M' + f(p[0]) + ' ' + f(p[1]) + 'Q' + f(p[0] + n3[0] * h * 0.9) + ' ' + f(p[1] + n3[1] * h * 0.9) + ' ' + f(q2[0] + n3[0] * h) + ' ' + f(q2[1] + n3[1] * h) + 'Q' + f((p[0] + q2[0]) / 2 + n3[0] * 3) + ' ' + f((p[1] + q2[1]) / 2 + n3[1] * 3) + ' ' + f(q2[0]) + ' ' + f(q2[1]) + 'Z';
    }
    s += '<path d="' + fin + '" fill-opacity=".75"/>';
    // legs with three-taloned claws, hung from the belly
    function leg(k, kx, ky, fx, fy, ang) {
      var B = belly[k], Kn = [B[0] + kx, B[1] + ky], F = [Kn[0] + fx, Kn[1] + fy], out = '';
      out += '<path d="M' + f(B[0] - nrm[k][0] * -6) + ' ' + f(B[1] - nrm[k][1] * -6) + 'Q' + f(Kn[0]) + ' ' + f(Kn[1]) + ' ' + f(F[0]) + ' ' + f(F[1]) + '" ' + W + ' stroke-width="11"/>';
      out += '<path d="M' + f(Kn[0] - 2) + ' ' + f(Kn[1]) + 'q' + (kx > 0 ? 14 : -14) + ' -2 ' + (kx > 0 ? 20 : -20) + ' -14q' + (kx > 0 ? -2 : 2) + ' 10 ' + (kx > 0 ? -8 : 8) + ' 20Z" fill-opacity=".7"/>';
      [-40, 0, 40].forEach(function (d) {
        out += '<path transform="translate(' + f(F[0]) + ' ' + f(F[1]) + ') rotate(' + (ang + d) + ')" d="M-3-6L12-6Q25-5 27 8Q17 0 9 5L-3 6Z"/>';
      });
      return out;
    }
    s += leg(7, -6, 18, -16, 16, 110) + leg(17, 4, 20, 10, 14, 80) + leg(42, 8, 18, 12, 12, 70) + leg(67, -14, 8, -14, 10, 150);
    s += '<g mask="url(#macau-m)"><path d="' + poly(back, mid) + '"/><path d="' + poly(mid, belly) + '" fill-opacity=".65"/></g>';
    // tail: a forked flame fin
    var Z = C[N], zn = nrm[N];
    s += '<path d="M' + f(Z[0] + zn[0] * 5) + ' ' + f(Z[1] + zn[1] * 5) + 'Q466 268 448 300Q472 286 482 290Q476 300 474 318Q494 296 ' + f(Z[0] - zn[0] * 5) + ' ' + f(Z[1] - zn[1] * 5) + 'Z" fill-opacity=".85"/>';
    s += '<g transform="translate(256 100) scale(1.15) translate(-256 -100)">';
    // head, facing left toward the pearl: snout, open jaws with a fang, eye, horns, mane, whiskers, beard
    s += '<path fill-rule="evenodd" d="M252 82C236 68 216 62 198 66L184 58L174 72L152 74Q134 74 130 86Q128 96 140 97L178 99L146 112Q140 122 152 125L190 119Q214 130 236 128L256 124Z' +
      'M196 79a6 6 0 1 0 0.1 0Z"/>';
    s += '<path d="M152 98L156 108L162 99ZM150 113L158 106L162 114Z" fill-opacity=".55"/>';
    s += '<path d="M198 66Q212 34 254 22Q228 42 212 70ZM212 68Q240 52 270 54Q244 60 222 74ZM232 40l-4-16l12 12Z"/>';
    s += '<path d="M244 72Q262 50 290 46Q270 62 266 80ZM250 122Q270 140 298 136Q274 130 266 112ZM226 128Q230 150 218 166Q242 152 246 126Z" fill-opacity=".7"/>';
    s += '<path d="M134 84Q106 70 114 46Q120 32 104 22M146 118Q126 150 98 146M176 72Q166 46 178 34" ' + W + ' stroke-width="5"/>';
    s += '<path d="M168 122Q168 146 152 158Q178 152 190 122Z" fill-opacity=".75"/></g>';
    // the flaming pearl
    s += '<path fill-rule="evenodd" d="M72 100a19 19 0 1 0 0.1 0ZM74 108a9 9 0 1 1-8 14a12 12 0 0 0 8-14Z"/>';
    s += '<path d="M50 110Q36 94 46 76Q48 92 58 98M94 104Q100 86 92 72Q100 80 90 96M58 134Q46 150 54 164Q58 150 68 142M88 136Q100 148 96 162Q90 150 82 142M72 94Q66 80 74 68Q80 80 74 92" ' + W + ' stroke-width="4.5" stroke-opacity=".75"/>';
    // a band of cloud scrolls across the middle, under the dragon
    var cl = '';
    [[44, 1], [176, -1], [300, 1], [404, -1]].forEach(function (c) {
      var x0 = c[0], m = c[1], X = function (dx) { return f(m > 0 ? x0 + dx : x0 + 92 - dx); };
      cl += 'M' + X(0) + ' 236H' + X(76) + 'Q' + X(90) + ' 236 ' + X(88) + ' 224Q' + X(86) + ' 212 ' + X(72) + ' 214Q' + X(72) + ' 198 ' + X(54) + ' 198Q' + X(40) + ' 198 ' + X(36) + ' 210Q' + X(30) + ' 202 ' + X(20) + ' 206Q' + X(10) + ' 212 ' + X(16) + ' 222Q' + X(2) + ' 220 ' + X(0) + ' 230M' + X(54) + ' 220Q' + X(48) + ' 208 ' + X(42) + ' 216';
    });
    s += '<path d="' + cl + '" ' + W + ' stroke-width="5" stroke-opacity=".5"/>';
    s += T(290, 334, 80, 'Ma Shan Zheng', E(o.venue), { ls: 2, raw: o.venue, sw: 2 }, 0.42, 300);
    s += T(290, 377, 16, 'Russo One', up(o.city) + ' &#183; ' + up(o.style), { ls: 7, raw: o.city + ' . ' + o.style, op: '.85' }, 0.65, 300);
    return svg(s);
  };

  // ── Champions Invitational · Las Vegas: an Art Deco card, a deco sunrise behind the board, stepped pylons ─────
  SAMPLE.vegasvip = { venue: 'Champions Invitational', city: 'Las Vegas', style: 'High Roller' };
  LOGOS.vegasvip = function (o) {
    var w = words(o.venue), first = w.length > 1 ? w[0] : o.venue, rest = w.length > 1 ? w.slice(1).join(' ') : '', s = '', k;
    s += '<path d="M132 34H468L536 102V298L468 366H132L64 298V102Z" ' + W + ' stroke-width="5"/>';
    s += '<path d="M138 48H462L522 108V292L462 352H138L78 292V108Z" ' + W + ' stroke-width="4" stroke-opacity=".45"/>';
    [[132, 34, 1, 1], [468, 34, -1, 1], [132, 366, 1, -1], [468, 366, -1, -1]].forEach(function (c) { s += '<path d="M' + (c[0] - c[2] * 54) + ' ' + (c[1] + c[3] * 54) + 'L' + (c[0] - c[2] * 40) + ' ' + (c[1] + c[3] * 40) + '" ' + W + ' stroke-width="4" stroke-opacity=".7"/>'; });
    [[100, 1], [500, -1]].forEach(function (p) { var x = p[0], d = p[1]; s += '<path d="M' + x + ' 140V260M' + (x + d * 14) + ' 158V242M' + (x + d * 28) + ' 178V222" ' + W + ' stroke-width="7"/>'; });
    // the sunrise: a half disc on the horizon, rays fanning up behind the board
    var ray = '';
    for (k = 0; k <= 12; k++) {
      var a = Math.PI + k * Math.PI / 12, r0 = 52, r1 = k % 2 ? 112 : 132;
      ray += 'M' + f(300 + Math.cos(a) * r0) + ' ' + f(236 + Math.sin(a) * r0) + 'L' + f(300 + Math.cos(a) * r1) + ' ' + f(236 + Math.sin(a) * r1);
    }
    s += '<path d="' + ray + '" ' + W + ' stroke-width="5" stroke-opacity=".6"/><path d="M258 236A42 42 0 0 1 342 236Z"/><path d="M168 242H432" ' + W + ' stroke-width="5"/>';
    s += T(300, 72, 14, 'Sofia Sans Condensed', 'BY INVITATION ONLY &#183; ' + up(o.city), { w: 700, ls: 5, raw: 'BY INVITATION ONLY . ' + o.city, op: '.85' }, 0.5, 300);
    s += T(300, 296, 48, 'Limelight', up(first), { ls: 4, raw: first }, 0.72, 360);
    if (rest) s += T(300, 338, 50, 'Alex Brush', E(rest), { raw: rest, sw: 1.6 }, 0.42, 300);
    return svg(s);
  };

  // ── World Championship · Las Vegas Main Event: a full laurel wreath, a champion's star, classical capitals ─────
  SAMPLE.mainevent = { venue: 'World Championship', city: 'Las Vegas', style: 'Main Event' };
  LOGOS.mainevent = function (o) {
    var cx = 300, cy = 208, rx = 262, ry = 166, s = '', w = words(o.venue), last = w.length > 1 ? w.pop() : o.venue, first = w.length ? w.join(' ') : '';
    function pt(a) { var t = a * Math.PI / 180; return [cx + rx * Math.cos(t), cy + ry * Math.sin(t)]; }
    function leaf(x, y, ang, len, wid, op) {
      return '<path transform="translate(' + f(x) + ' ' + f(y) + ') rotate(' + f(ang) + ')" d="M0 0Q' + f(len / 2) + ' ' + (-wid) + ' ' + len + ' 0Q' + f(len / 2) + ' ' + wid + ' 0 0Z"' + (op ? ' fill-opacity="' + op + '"' : '') + '/>';
    }
    [1, -1].forEach(function (side) {
      // stem from the bottom (a=90) round the side to the top; side 1 = left (angles 92..244), -1 = right (88..-64)
      var st = 'M', a, k, A0 = 96, A1 = 242, n = 13;
      for (k = 0; k <= 40; k++) { a = A0 + (A1 - A0) * k / 40; var P = pt(side > 0 ? a : 180 - a); st += (k ? 'L' : '') + f(P[0]) + ' ' + f(P[1]); }
      s += '<path d="' + st + '" ' + W + ' stroke-width="5"/>';
      for (k = 0; k < n; k++) {
        a = A0 + 6 + (A1 - A0 - 6) * k / n; var aa = side > 0 ? a : 180 - a, Q = pt(aa), t = aa * Math.PI / 180;
        var dir = Math.atan2(ry * Math.cos(t), -rx * Math.sin(t)) * 180 / Math.PI + (side > 0 ? 0 : 180);   // along the stem, toward the top
        var sz = 1 - k * 0.025;
        s += leaf(Q[0], Q[1], dir - 38 * side, 32 * sz, 11 * sz) + leaf(Q[0], Q[1], dir + 34 * side, 26 * sz, 9 * sz, '.6');
      }
      var E1 = pt(side > 0 ? A1 : 180 - A1), t1 = (side > 0 ? A1 : 180 - A1) * Math.PI / 180, d1 = Math.atan2(ry * Math.cos(t1), -rx * Math.sin(t1)) * 180 / Math.PI + (side > 0 ? 0 : 180);
      s += leaf(E1[0], E1[1], d1, 30, 9);
    });
    // ribbon knot where the stems cross
    s += '<path d="M300 366L276 384L282 360ZM300 366L324 384L318 360Z" fill-opacity=".7"/><circle cx="300" cy="366" r="7"/>';
    s += '<polygon points="' + star(300, 46, 22, 9, 5) + '"/>';
    s += '<path d="M300 164C300 164 256 198 256 222C256 238 271 246 285 242Q292 240 296 233L289 250H311L304 233Q308 240 315 242C329 246 344 238 344 222C344 198 300 164 300 164Z" fill-opacity=".45"/>';
    if (first) s += T(300, 102, 34, 'Gloock', up(first), { ls: 16, raw: first }, 0.78, 300);
    s += T(300, 147, 46, 'Gloock', up(last), { ls: 1, raw: last }, 0.74, 380);
    s += T(300, 292, 34, 'Gloock', up(o.style), { ls: 8, raw: o.style }, 0.78, 300);
    s += '<path d="M104 282H142M458 282H496" ' + W + ' stroke-width="4" stroke-opacity=".6"/>';
    s += T(300, 320, 17, 'Sofia Sans Condensed', '$10,000 &#183; NO-LIMIT HOLD&#8217;EM', { w: 700, ls: 6, raw: '$10,000 . NO-LIMIT HOLDEM' }, 0.5, 300);
    s += T(300, 346, 16, 'Gloock', up(o.city), { ls: 8, raw: o.city, op: '.85' }, 0.8, 200);
    return svg(s);
  };
})();

// ── g5 ──
// Omaha road: ten named tournament stops, rising to the Omaha World Championship.
(function () {
  var OPEN = '<svg viewBox="0 0 600 400" xmlns="http://www.w3.org/2000/svg" fill="currentColor">', CLOSE = '</svg>';
  function r1(n) { return Math.round(n * 10) / 10; }
  // name helpers: [all but last word, last word] / [first word, the rest]
  function headTail(v) { var w = String(v || '').trim().split(/\s+/); if (w.length < 2) return [w.join(' '), '']; var l = w.pop(); return [w.join(' '), l]; }
  function firstRest(v) { var w = String(v || '').trim().split(/\s+/); var f = w.shift(); return [f, w.join(' ')]; }
  // squeeze text into maxW when the estimate says it would overflow
  function fit(s, size, maxW, k, ls) { var n = String(s).length, est = n * size * k + (n - 1) * (ls || 0); return est > maxW ? ' textLength="' + maxW + '" lengthAdjust="spacingAndGlyphs"' : ''; }
  // centred text; letter-spacing trails the last glyph, so shift by half of it to stay optically centred
  function T(x, y, s, font, size, o) {
    o = o || {};
    return '<text x="' + r1(x + (o.ls || 0) / 2) + '" y="' + y + '" text-anchor="middle" font-family="\'' + font + '\'" font-size="' + size + '"' +
      (o.w ? ' font-weight="' + o.w + '"' : '') + (o.it ? ' font-style="italic"' : '') + (o.ls ? ' letter-spacing="' + o.ls + '"' : '') +
      (o.op ? ' fill-opacity="' + o.op + '"' : '') + (o.sw ? ' stroke="currentColor" stroke-width="' + o.sw + '" stroke-linejoin="round"' : '') +
      (o.max ? fit(s, size, o.max, o.k || 0.6, o.ls) : '') + '>' + E(s) + '</text>';
  }
  function SK(w, extra) { return ' fill="none" stroke="currentColor" stroke-width="' + w + '" stroke-linecap="round" stroke-linejoin="round"' + (extra || ''); }
  function line(x1, y1, x2, y2, w) { return '<path d="M' + x1 + ',' + y1 + 'L' + x2 + ',' + y2 + '"' + SK(w) + '/>'; }
  function wave(x0, x1, y, h, step) { var d = 'M' + x0 + ',' + y + 'q' + step / 2 + ',' + -h + ' ' + step + ',0'; for (var x = x0 + step; x < x1 - 1; x += step) d += 't' + step + ',0'; return d; }

  // ───────────── Bayou Classic · New Orleans: name over a French Quarter iron-lace balcony, fleurs-de-lis
  SAMPLE.bayou = { venue: 'Bayou Classic', city: 'New Orleans', style: 'Deepstack' };
  LOGOS.bayou = function (o) {
    var fl = '<path d="M0,-62C14,-48 22,-28 16,-8C12,4 6,10 5,16L-5,16C-6,10 -12,4 -16,-8C-22,-28 -14,-48 0,-62Z"/>' +
      '<rect x="-25" y="14" width="50" height="12" rx="3"/><path d="M-6,26L6,26C6,38 4,46 0,58C-4,46 -6,38 -6,26Z"/>';
    var half = '<path d="M7,14C10,-6 26,-30 44,-28C58,-26 61,-8 51,0C44,6 35,2 37,-6C38,-12 32,-15 27,-8C21,0 17,10 15,16Z"/>' +
      '<path d="M9,26C18,29 28,36 30,50C25,43 17,41 10,41C10,35 9,30 9,26Z"/>';
    function fleur(x, y, s) { return '<g transform="translate(' + x + ',' + y + ') scale(' + s + ')">' + fl + half + '<g transform="scale(-1,1)">' + half + '</g></g>'; }
    var L = 147, R = 453, k = 8, pw = (R - L) / k, b = '';
    b += line(L, 162, R, 162, 7) + line(L, 194, R, 194, 4) + line(L, 330, R, 330, 6);
    for (var i = 0; i < k; i++) {
      var a = L + i * pw, m = a + pw / 2;
      if (i) b += line(r1(a), 162, r1(a), 330, 4);
      b += '<circle cx="' + r1(m) + '" cy="178" r="7"' + SK(4) + '/><ellipse cx="' + r1(m) + '" cy="262" rx="11" ry="46"' + SK(4) + '/>' +
        '<circle cx="' + r1(m) + '" cy="262" r="4"/><path d="M' + r1(a) + ',330Q' + r1(m) + ',350 ' + r1(a + pw) + ',330"' + SK(4) + '/>';
    }
    b += '<rect x="133" y="152" width="14" height="190" rx="3"/><rect x="453" y="152" width="14" height="190" rx="3"/><circle cx="140" cy="146" r="8"/><circle cx="460" cy="146" r="8"/>';
    return OPEN +
      line(132, 38, 176, 38, 4) + line(424, 38, 468, 38, 4) +
      T(300, 46, String(o.city || 'New Orleans').toUpperCase(), 'Della Respira', 22, { ls: 6, max: 230, k: 0.72 }) +
      T(300, 112, o.venue, 'Berkshire Swash', 68, { max: 460, k: 0.5 }) +
      b + fleur(72, 246, 1.0) + fleur(528, 246, 1.0) +
      T(300, 378, String(o.style || 'Deepstack').toUpperCase(), 'Della Respira', 19, { ls: 10, op: 0.85, max: 240, k: 0.72 }) + CLOSE;
  };

  // ───────────── Mile High Bounty · Black Hawk: Rockies behind the board, mine headframe, picks, a nailed plank sign
  SAMPLE.minetown = { venue: 'Mile High Bounty', city: 'Black Hawk', style: 'Bounty' };
  LOGOS.minetown = function (o) {
    var n = headTail(o.venue), top = n[0] || n[1], low = n[0] ? n[1] : '';
    var mt = 'M30,240L95,150L125,172L190,92L232,140L262,118L300,64L338,112L370,92L410,132L470,86L515,150L570,240';
    function snow(x, y) { return '<path d="M' + x + ',' + y + 'l18,24l-10,-4l-8,12l-9,-12l-9,4Z"/>'; }
    var head = line(46, 332, 64, 180, 6) + line(96, 332, 78, 180, 6) + line(124, 332, 86, 196, 5) +
      line(52, 290, 90, 290, 4) + line(57, 248, 85, 248, 4) + line(61, 212, 81, 212, 4) +
      line(52, 290, 85, 248, 4) + line(90, 290, 57, 248, 4) + line(57, 248, 81, 212, 4) + line(85, 248, 61, 212, 4) +
      line(56, 180, 88, 180, 6) + '<circle cx="72" cy="160" r="17"' + SK(5) + '/><circle cx="72" cy="160" r="4"/>' +
      line(72, 145, 72, 175, 4) + line(57, 160, 87, 160, 4) + line(30, 334, 136, 334, 5);
    var pickHalf = line(-38, 42, 33, -33, 8) + '<path d="M2,-70Q58,-58 70,-2Q44,-30 2,-70Z"' + SK(3) + ' fill="currentColor"/><circle cx="36" cy="-36" r="8"/>';
    var picks = '<g transform="translate(528,282) scale(.72)">' + pickHalf + '<g transform="scale(-1,1)">' + pickHalf + '</g></g>' + line(474, 334, 572, 334, 5);
    var board = '<path d="M152,254L448,250L452,358L148,362Z"' + SK(6) + '/>' +
      '<circle cx="166" cy="266" r="5"/><circle cx="434" cy="263" r="5"/><circle cx="437" cy="346" r="5"/><circle cx="163" cy="349" r="5"/>';
    return OPEN +
      T(300, 40, (String(o.city || 'Black Hawk') + ' · Colorado').toUpperCase(), 'Pathway Gothic One', 24, { ls: 5, max: 320, k: 0.42 }) +
      '<path d="' + mt + 'Z" fill-opacity=".3"/><path d="' + mt + '"' + SK(6) + '/>' + snow(190, 92) + snow(300, 64) + snow(470, 86) +
      head + picks + board +
      T(300, 308, top, 'Smokum', 60, { ls: 1, max: 270, k: 0.42 }) +
      (low ? line(196, 334, 228, 334, 4) + line(372, 334, 404, 334, 4) + T(300, 346, low.toUpperCase(), 'Smokum', 34, { ls: 7, max: 130, k: 0.45 }) : '') + CLOSE;
  };

  // ───────────── Pinewood Open · Connecticut: a resort name over a valley of New England pines
  SAMPLE.pinewood = { venue: 'Pinewood Open', city: 'Connecticut', style: 'Deepstack' };
  LOGOS.pinewood = function (o) {
    function pine(x, h, op) {
      var b = 350, w = h * 0.44, P = function (dx, f) { return r1(x + w * dx) + ',' + r1(b - h * f); };
      return '<path d="M' + P(0, 1) + 'L' + P(.26, .7) + 'L' + P(.13, .7) + 'L' + P(.4, .38) + 'L' + P(.22, .38) + 'L' + P(.5, 0) +
        'L' + P(-.5, 0) + 'L' + P(-.22, .38) + 'L' + P(-.4, .38) + 'L' + P(-.13, .7) + 'L' + P(-.26, .7) + 'Z"' + (op ? ' fill-opacity="' + op + '"' : SK(4, ' fill="currentColor" fill-opacity=".5"')) + '/>';
    }
    var back = [[52, 205], [128, 172], [206, 150], [254, 176], [346, 176], [394, 150], [472, 172], [548, 205]],
      front = [[34, 250], [88, 214], [140, 168], [190, 130], [242, 150], [300, 176], [358, 150], [410, 130], [460, 168], [512, 214], [566, 250]];
    var trees = '';
    back.forEach(function (t) { trees += pine(t[0], t[1], 0.3); });
    front.forEach(function (t) { trees += pine(t[0], t[1]); });
    return OPEN + '<circle cx="300" cy="186" r="44" fill-opacity=".35"/>' +
      line(146, 38, 186, 38, 4) + line(414, 38, 454, 38, 4) +
      T(300, 45, String(o.city || 'Connecticut').toUpperCase(), 'Sofia Sans', 18, { w: 800, ls: 7, max: 200, k: 0.62 }) +
      T(300, 112, o.venue, 'Coustard', 56, { w: 900, max: 470, k: 0.62 }) +
      trees + '<rect x="40" y="348" width="520" height="10" rx="3"/>' +
      T(300, 378, String(o.style || 'Deepstack').toUpperCase(), 'Sofia Sans', 15, { w: 800, ls: 10, op: 0.85, max: 200, k: 0.62 }) + CLOSE;
  };

  // ───────────── Twin Cities Open · Minneapolis: varsity wordmark over the Stone Arch Bridge, twin freezeout snowflakes
  SAMPLE.twincities = { venue: 'Twin Cities Open', city: 'Minneapolis', style: 'Freezeout' };
  LOGOS.twincities = function (o) {
    var n = headTail(o.venue), big = n[0] || n[1], small = n[0] ? n[1] : '';
    var x0 = 64, x1 = 536, pier = 16, k = 7, aw = (x1 - x0 - (k + 1) * pier) / k, rr = aw / 2, d = 'M' + x0 + ',166L' + x1 + ',166L' + x1 + ',262L' + x0 + ',262Z';
    for (var i = 0; i < k; i++) { var a = x0 + pier + i * (aw + pier), b = a + aw; d += 'M' + r1(a) + ',262L' + r1(a) + ',226A' + r1(rr) + ',' + r1(rr) + ' 0 0 1 ' + r1(b) + ',226L' + r1(b) + ',262Z'; }
    function flake(cx, cy, r) {
      var s = '';
      for (var j = 0; j < 6; j++) {
        var an = (j * 60 - 90) * Math.PI / 180, c = Math.cos(an), sn = Math.sin(an), m = [cx + c * r * .55, cy + sn * r * .55];
        s += line(cx, cy, r1(cx + c * r), r1(cy + sn * r), 5);
        [-1, 1].forEach(function (sg) { var ba = an + sg * 0.75; s += line(r1(m[0]), r1(m[1]), r1(m[0] + Math.cos(ba) * r * .38), r1(m[1] + Math.sin(ba) * r * .38), 4); });
      }
      return s;
    }
    return OPEN +
      T(300, 102, big.toUpperCase(), 'Staatliches', 74, { ls: 3, max: 460, k: 0.5 }) +
      (small ? line(176, 128, 236, 128, 5) + line(364, 128, 424, 128, 5) + T(300, 140, small.toUpperCase(), 'Staatliches', 32, { ls: 12, max: 116, k: 0.55 }) : '') +
      '<path d="' + d + '" fill-rule="evenodd"/>' +
      '<path d="' + wave(76, 524, 282, 8, 32) + '"' + SK(4, ' stroke-opacity=".7"') + '/>' +
      flake(110, 324, 18) + flake(490, 324, 18) +
      T(300, 333, (String(o.city || 'Minneapolis') + ' · ' + String(o.style || 'Freezeout')).toUpperCase(), 'Saira Extra Condensed', 25, { w: 800, ls: 5, max: 300, k: 0.4 }) + CLOSE;
  };

  // ───────────── Desert Springs Bounty · Palm Springs: mid-century sign lockup, palms, atomic stars, kidney pool
  SAMPLE.palmsprings = { venue: 'Desert Springs Bounty', city: 'Palm Springs', style: 'Bounty' };
  LOGOS.palmsprings = function (o) {
    var n = headTail(o.venue), top = n[0] || n[1], tail = n[0] ? n[1] : '';
    function frond(cx, cy, a, L) {
      var s = Math.cos(a * Math.PI / 180) < 0 ? -1 : 1;
      return '<path transform="translate(' + cx + ',' + cy + ') rotate(' + a + ') scale(1,' + s + ')" d="M0,0C' + r1(L * .3) + ',' + r1(-L * .24) + ' ' + r1(L * .72) + ',' + r1(-L * .2) + ' ' + L + ',' + r1(L * .16) +
        'C' + r1(L * .66) + ',' + r1(-L * .02) + ' ' + r1(L * .3) + ',' + r1(-L * .04) + ' 0,0Z"/>';
    }
    function palm(base, c1, crown, angs, L) {
      var s = '<path d="M' + base + 'Q' + c1 + ' ' + crown[0] + ',' + crown[1] + '"' + SK(10) + '/>';
      angs.forEach(function (a, i) { s += frond(crown[0], crown[1], a, L - (i % 2) * 10); });
      return s + '<circle cx="' + crown[0] + '" cy="' + crown[1] + '" r="7"/>';
    }
    function star(x, y, r) { return '<path d="M' + x + ',' + (y - r) + 'Q' + x + ',' + y + ' ' + (x + r) + ',' + y + 'Q' + x + ',' + y + ' ' + x + ',' + (y + r) + 'Q' + x + ',' + y + ' ' + (x - r) + ',' + y + 'Q' + x + ',' + y + ' ' + x + ',' + (y - r) + 'Z"/>'; }
    return OPEN +
      T(300, 82, top.toUpperCase(), 'Atomic Age', 38, { ls: 1, max: 440, k: 0.74 }) +
      '<path d="M128,98Q300,118 474,92L470,102Q300,130 124,108Z"/>' +
      (tail ? T(372, 146, tail, 'Pacifico', 44, { max: 200, k: 0.55 }) : '') +
      palm('84,374', '66,290', [96, 212], [-172, -140, -108, -72, -38, -6, 22], 76) +
      palm('516,374', '540,300', [504, 222], [-178, -146, -112, -76, -42, -10, 18], 70) +
      star(552, 120, 18) + star(48, 128, 13) + star(150, 142, 9) +
      '<path d="M160,250C152,214 224,204 274,224C314,240 354,202 406,218C448,230 442,288 394,296C334,306 294,290 244,296C192,302 166,284 160,250Z"' + SK(6) + '/>' +
      '<path d="' + wave(214, 380, 246, 6, 28) + '"' + SK(4, ' stroke-opacity=".5"') + '/><path d="' + wave(242, 354, 270, 6, 28) + '"' + SK(4, ' stroke-opacity=".5"') + '/>' +
      T(300, 340, (String(o.city || 'Palm Springs') + ' · California').toUpperCase(), 'Sofia Sans', 17, { w: 800, ls: 6, max: 300, k: 0.62 }) + CLOSE;
  };

  // ───────────── London Masters · London: the great clock dial under a crown, Westminster's two towers either side
  SAMPLE.london = { venue: 'London Masters', city: 'London', style: 'Freezeout' };
  LOGOS.london = function (o) {
    var n = headTail(o.venue), top = n[0] || n[1], low = n[0] ? n[1] : '';
    var big = '<path d="M60,182L96,182L96,346L60,346Z"' + SK(5) + ' fill="currentColor" fill-opacity=".3"/>' + line(72, 196, 72, 336, 4) + line(84, 196, 84, 336, 4) +
      '<path d="M54,128L102,128L102,182L54,182Z"' + SK(5) + '/><circle cx="78" cy="155" r="17"' + SK(5) + '/>' +
      '<path d="M60,100L96,100L96,128L60,128Z"' + SK(5) + '/>' + line(70, 106, 70, 124, 5) + line(78, 106, 78, 124, 5) + line(86, 106, 86, 124, 5) +
      '<path d="M54,100L102,100L90,80L78,52L66,80Z"/>' + line(78, 52, 78, 40, 4) + '<path d="M52,128L52,116M104,128L104,116M58,100L58,90M98,100L98,90"' + SK(5) + '/>';
    var vic = '<path d="M502,124L542,124L542,346L502,346Z"' + SK(5) + ' fill="currentColor" fill-opacity=".3"/>' + line(516, 138, 516, 336, 4) + line(528, 138, 528, 336, 4) +
      '<path d="M496,112L548,112L548,124L496,124Z"/><path d="M497,112L497,82L501,72L505,82L505,112ZM539,112L539,82L543,72L547,82L547,112Z"/>' +
      line(522, 112, 522, 64, 4) + '<path d="M522,64L540,69L522,75Z"/>';
    var cx = 300, cy = 166, dial = '<circle cx="' + cx + '" cy="' + cy + '" r="92"' + SK(7) + '/><circle cx="' + cx + '" cy="' + cy + '" r="76"' + SK(4) + '/>';
    for (var i = 0; i < 12; i++) { var an = i * Math.PI / 6, c = Math.sin(an), s = -Math.cos(an), q = i % 3 === 0; dial += line(r1(cx + c * (q ? 52 : 58)), r1(cy + s * (q ? 52 : 58)), r1(cx + c * 70), r1(cy + s * 70), q ? 8 : 5); }
    dial += line(cx, cy, cx - 2, cy - 42, 8) + line(cx, cy, cx - 30, cy - 52, 5) + '<circle cx="' + cx + '" cy="' + cy + '" r="8"/>';
    var crown = '<g transform="translate(0,12)"><path d="M266,62L334,62L334,52L266,52Z"/><path d="M266,50L259,22L279,36L290,16L300,32L310,16L321,36L341,22L334,50Z"/>' +
      '<circle cx="259" cy="20" r="4.5"/><circle cx="290" cy="14" r="4.5"/><circle cx="310" cy="14" r="4.5"/><circle cx="341" cy="20" r="4.5"/></g>';
    return OPEN + crown + dial + big + vic +
      T(300, 314, top.toUpperCase(), 'IM Fell DW Pica SC', 62, { ls: 6, max: 330, k: 0.7 }) +
      (low ? line(150, 340, 196, 340, 4) + line(404, 340, 450, 340, 4) + T(300, 348, low.toUpperCase(), 'IM Fell DW Pica SC', 28, { ls: 12, max: 196, k: 0.7 }) : '') + CLOSE;
  };

  // ───────────── Danube High Roller · Vienna: a ballroom chandelier over the board, Secession checker pylons, the Danube
  SAMPLE.vienna = { venue: 'Danube High Roller', city: 'Vienna', style: 'High Roller' };
  LOGOS.vienna = function (o) {
    var n = firstRest(o.venue);
    var ch = line(300, 0, 300, 24, 4) + '<circle cx="300" cy="28" r="5"/>' + line(300, 30, 300, 96, 4.5) + '<ellipse cx="300" cy="60" rx="10" ry="14"/>' +
      '<path d="M300,104Q286,114 300,132Q314,114 300,104Z"/>';
    [-96, -50, 50, 96].forEach(function (dx) {
      var x = 300 + dx, dxm = 300 + dx * .62;
      ch += '<path d="M300,94C' + (300 + dx * .3) + ',122 ' + (300 + dx * .92) + ',114 ' + x + ',82"' + SK(3.5) + '/>' +
        '<rect x="' + (x - 9) + '" y="76" width="18" height="7" rx="2"/><rect x="' + (x - 3.5) + '" y="54" width="7" height="22"/>' +
        '<path d="M' + x + ',36Q' + (x + 6) + ',46 ' + x + ',50Q' + (x - 6) + ',46 ' + x + ',36Z"/>' +
        '<path d="M' + dxm + ',112Q' + (dxm + 5) + ',120 ' + dxm + ',128Q' + (dxm - 5) + ',120 ' + dxm + ',112Z"/>';
    });
    ch += '<path d="M204,84Q252,112 300,100Q348,112 396,84"' + SK(3) + '/>';
    function pylon(x0) {
      var s = line(x0, 122, x0, 300, 5) + line(x0 + 50, 122, x0 + 50, 300, 5) + '<circle cx="' + (x0 + 25) + '" cy="108" r="11"/>' + line(x0 - 4, 306, x0 + 54, 306, 6);
      for (var r = 0; r < 10; r++) for (var c = 0; c < 3; c++) s += '<rect x="' + (x0 + 7 + c * 13) + '" y="' + (130 + r * 16.5) + '" width="10" height="10"' + ((r + c) % 2 ? ' fill-opacity=".35"' : '') + '/>';
      return s;
    }
    return OPEN + '<g transform="translate(300,0) scale(1.5) translate(-300,0)">' + ch + '</g>' + pylon(44) + pylon(506) +
      T(300, 300, n[0].toUpperCase(), 'Federo', 70, { ls: 8, max: 370, k: 0.64 }) +
      '<path d="' + wave(196, 404, 324, 9, 26) + '"' + SK(5) + '/>' +
      T(300, 358, ((n[1] ? n[1] + ' · ' : '') + 'Wien').toUpperCase(), 'Jost', 20, { w: 600, ls: 8, max: 320, k: 0.62 }) + CLOSE;
  };

  // ───────────── Marina Bay Cup · Singapore: three towers carrying the SkyPark, Supertree Grove at the sides
  SAMPLE.singapore = { venue: 'Marina Bay Cup', city: 'Singapore', style: 'Deepstack' };
  LOGOS.singapore = function (o) {
    var tw = '';
    [190, 300, 410].forEach(function (x) {
      tw += '<path d="M' + (x - 29) + ',344L' + (x - 24) + ',124L' + (x + 24) + ',124L' + (x + 29) + ',344Z"' + SK(5) + ' fill="currentColor" fill-opacity=".28"/>' +
        '<path d="M' + (x + 5) + ',344Q' + (x - 7) + ',236 ' + x + ',124"' + SK(4) + '/>';
    });
    function tree(x, top, base, w) {
      var s = '<path d="M' + (x - 5) + ',' + base + 'L' + (x - 4) + ',' + (top + 36) + 'Q' + (x - w * .4) + ',' + (top + 18) + ' ' + (x - w) + ',' + top + 'Q' + x + ',' + (top - 10) + ' ' + (x + w) + ',' + top +
        'Q' + (x + w * .4) + ',' + (top + 18) + ' ' + (x + 4) + ',' + (top + 36) + 'L' + (x + 5) + ',' + base + 'Z"' + SK(4, ' fill="currentColor" fill-opacity=".35"') + '/>';
      s += '<path d="M' + x + ',' + (top + 36) + 'L' + (x - w * .7) + ',' + (top - 1) + 'M' + x + ',' + (top + 36) + 'L' + (x - w * .25) + ',' + (top - 5) + 'M' + x + ',' + (top + 36) + 'L' + (x + w * .25) + ',' + (top - 5) + 'M' + x + ',' + (top + 36) + 'L' + (x + w * .7) + ',' + (top - 1) + '"' + SK(4) + '/>';
      for (var k = 1; k < 4; k++) s += line(x - 9, base - k * 44, x + 9, base - k * 44, 5);
      return s;
    }
    return OPEN +
      T(300, 42, String(o.city || 'Singapore').toUpperCase(), 'Chakra Petch', 17, { w: 700, ls: 10, max: 220, k: 0.62 }) +
      T(300, 90, o.venue.toUpperCase(), 'Chakra Petch', 44, { w: 700, ls: 2, max: 450, k: 0.62 }) +
      tw + '<path d="M122,104L562,94L560,105Q520,118 470,124L132,124Q118,116 122,104Z"/>' +
      tree(52, 156, 338, 30) + tree(100, 210, 344, 24) + tree(500, 214, 344, 24) + tree(550, 160, 336, 30) +
      line(110, 346, 490, 346, 5) + '<path d="M170,360L430,360"' + SK(4, ' stroke-dasharray="30 14" stroke-opacity=".6"') + '/>' +
      T(300, 386, String(o.style || 'Deepstack').toUpperCase(), 'Chakra Petch', 14, { w: 700, ls: 10, op: 0.85, max: 180, k: 0.62 }) + CLOSE;
  };

  // ───────────── Bahamas Invitational · Nassau: an engraved invitation card, a sloop under sail, palm fronds
  SAMPLE.nassau = { venue: 'Bahamas Invitational', city: 'Nassau', style: 'High Roller' };
  LOGOS.nassau = function (o) {
    var n = firstRest(o.venue);
    function frond(B, C, Tp, maxL) {
      var mid = 'M' + B + 'Q' + C + ' ' + Tp, s = '', st = 15;
      for (var i = 2; i < st; i++) {
        var t = i / st, u = 1 - t,
          px = u * u * B[0] + 2 * u * t * C[0] + t * t * Tp[0], py = u * u * B[1] + 2 * u * t * C[1] + t * t * Tp[1],
          dx = 2 * u * (C[0] - B[0]) + 2 * t * (Tp[0] - C[0]), dy = 2 * u * (C[1] - B[1]) + 2 * t * (Tp[1] - C[1]), dl = Math.hypot(dx, dy);
        dx /= dl; dy /= dl;
        var L = maxL * Math.sin(Math.PI * Math.min(1, t * 1.15)) + 6;
        [-1, 1].forEach(function (sg) {
          var nx = -dy * sg, ny = dx * sg, ex = px + (nx * 0.8 + dx * 0.6) * L, ey = py + (ny * 0.8 + dy * 0.6) * L + L * 0.25;
          s += 'M' + r1(px) + ',' + r1(py) + 'L' + r1(ex) + ',' + r1(ey);
        });
      }
      return '<path d="' + mid + '"' + SK(5) + '/><path d="' + s + '"' + SK(4) + '/>';
    }
    var left = frond([56, 372], [10, 220], [84, 70], 30) + frond([62, 372], [104, 268], [28, 214], 22);
    var sloop = line(300, 150, 300, 272, 5) +
      '<path d="M294,158L294,266L218,266Q246,212 294,158Z"' + SK(4, ' fill="currentColor" fill-opacity=".35"') + '/>' +
      '<path d="M306,170L306,266L366,266Q342,218 306,170Z"' + SK(4, ' fill="currentColor" fill-opacity=".35"') + '/>' +
      '<path d="M204,276L396,276Q384,294 354,298L246,298Q216,294 204,276Z"/>' +
      '<path d="' + wave(196, 404, 314, 6, 26) + '"' + SK(4, ' stroke-opacity=".7"') + '/>';
    return OPEN +
      '<rect x="116" y="26" width="368" height="348" rx="3"' + SK(5) + '/>' +
      '<path d="M140,38L460,38A12,12 0 0 0 472,50L472,350A12,12 0 0 0 460,362L140,362A12,12 0 0 0 128,350L128,50A12,12 0 0 0 140,38Z"' + SK(4, ' stroke-opacity=".6"') + '/>' +
      T(300, 100, n[0], 'Petit Formal Script', 58, { sw: 2.2, max: 320, k: 0.62 }) +
      (n[1] ? T(300, 138, n[1].toUpperCase(), 'Rufina', 26, { w: 700, ls: 7, max: 300, k: 0.7 }) : '') +
      sloop +
      T(300, 344, String(o.city || 'Nassau') + ' · ' + String(o.style || 'High Roller'), 'Pagella', 23, { it: 1, ls: 1, max: 280, k: 0.48 }) +
      '<g>' + left + '</g><g transform="matrix(-1 0 0 1 600 0)">' + left + '</g>' + CLOSE;
  };

  // ───────────── Omaha World Championship · Omaha: Nebraska wheat wreath round Omaha's four hole cards, name on a ribbon
  SAMPLE.omahachamp = { venue: 'Omaha World Championship', city: 'Omaha', style: 'Championship' };
  LOGOS.omahachamp = function (o) {
    var n = headTail(o.venue), arc = n[0] || n[1], rib = n[0] ? n[1] : '';
    var P0 = [316, 380], P1 = [150, 378], P2 = [36, 292], P3 = [72, 112];
    function bz(t) { var u = 1 - t; return [u * u * u * P0[0] + 3 * u * u * t * P1[0] + 3 * u * t * t * P2[0] + t * t * t * P3[0], u * u * u * P0[1] + 3 * u * u * t * P1[1] + 3 * u * t * t * P2[1] + t * t * t * P3[1]]; }
    var w = '<path d="M' + P0 + 'C' + P1 + ' ' + P2 + ' ' + P3 + '"' + SK(5) + '/>';
    for (var t = 0.5; t < 0.985; t += 0.042) {
      var p = bz(t), q = bz(t + 0.01), a = Math.atan2(q[1] - p[1], q[0] - p[0]) * 180 / Math.PI;
      w += '<g transform="translate(' + r1(p[0]) + ',' + r1(p[1]) + ') rotate(' + r1(a) + ')"><ellipse cx="5" cy="-7" rx="10" ry="5" transform="rotate(-28 5 -7)"/><ellipse cx="5" cy="7" rx="10" ry="5" transform="rotate(28 5 7)"/></g>';
    }
    var e = bz(1), lf1 = bz(0.22), lf2 = bz(0.36);
    w += '<ellipse cx="' + r1(e[0] + 2) + '" cy="' + r1(e[1] - 8) + '" rx="5" ry="10"/>' + line(r1(e[0] + 2), r1(e[1] - 16), r1(e[0] + 8), r1(e[1] - 40), 4) + line(r1(e[0] - 4), r1(e[1] - 14), r1(e[0] - 14), r1(e[1] - 36), 4);
    w += '<path d="M' + r1(lf1[0]) + ',' + r1(lf1[1]) + 'q-30,-30 -62,-18q34,4 62,18Z"/><path d="M' + r1(lf2[0]) + ',' + r1(lf2[1]) + 'q-10,-34 -48,-40q22,18 48,40Z"/>';
    var suits = [
      '<path d="M0,-130C10,-120 14,-114 10,-108C7,-104 2,-106 1,-108L4,-100L-4,-100L-1,-108C-2,-106 -7,-104 -10,-108C-14,-114 -10,-120 0,-130Z"/>',
      '<path d="M0,-102C-14,-112 -12,-128 -4,-128C-1,-128 0,-125 0,-123C0,-125 1,-128 4,-128C12,-128 14,-112 0,-102Z"/>',
      '<path d="M0,-130L10,-115L0,-100L-10,-115Z"/>',
      '<circle cx="0" cy="-123" r="5.5"/><circle cx="-6.5" cy="-113" r="5.5"/><circle cx="6.5" cy="-113" r="5.5"/><path d="M-3,-100L3,-100L1,-112L-1,-112Z"/>'];
    var fan = '';
    [-27, -9, 9, 27].forEach(function (a, i) {
      fan += '<g transform="translate(300,246) rotate(' + a + ')"><rect x="-28" y="-136" width="56" height="84" rx="6"' + SK(5, ' fill="currentColor" fill-opacity="' + (i === 3 ? '.55' : '.3') + '"') + '/>' + suits[i] + '</g>';
    });
    function star(x, y, r) { var d = ''; for (var j = 0; j < 10; j++) { var an = -Math.PI / 2 + j * Math.PI / 5, rr = j % 2 ? r * .45 : r; d += (j ? 'L' : 'M') + r1(x + Math.cos(an) * rr) + ',' + r1(y + Math.sin(an) * rr); } return '<path d="' + d + 'Z"/>'; }
    var ribbon = '<path d="M164,304L118,304L134,326L118,348L176,348L176,338L164,338Z" fill-opacity=".45"/><path d="M436,304L482,304L466,326L482,348L424,348L424,338L436,338Z" fill-opacity=".45"/>' +
      '<rect x="164" y="294" width="272" height="44"' + SK(5) + '/>';
    return OPEN +
      '<g>' + w + '</g><g transform="matrix(-1 0 0 1 600 0)">' + w + '</g>' +
      star(300, 54, 15) + star(262, 62, 9) + star(338, 62, 9) + fan +
      T(300, 280, arc.toUpperCase(), 'Alegreya SC', 44, { w: 800, ls: 3, max: 380, k: 0.72 }) +
      ribbon + (rib ? T(300, 325, rib.toUpperCase(), 'Alegreya SC', 26, { w: 800, ls: 4, max: 240, k: 0.72 }) : '') + CLOSE;
  };
})();

// ── g6 ──
// Mixed-games road: the ten named tournament stops, Tunica up to the Players' Championship in Toronto.
(function () {
  var SVG0 = '<svg viewBox="0 0 600 400" xmlns="http://www.w3.org/2000/svg" fill="currentColor" stroke="none">';
  function S(s) { return SVG0 + s + '</svg>'; }
  function f(n) { return Math.round(n * 10) / 10; }
  // text: x, y, string (already escaped), attrs
  function T(x, y, s, a) { return '<text x="' + x + '" y="' + y + '" text-anchor="middle" ' + a + '>' + s + '</text>'; }
  function U(s) { return E(String(s).toUpperCase()); }
  function split(v, first) { // split a name into [lead, rest]; first=true splits at the first space
    var s = String(v), i = first ? s.indexOf(' ') : s.lastIndexOf(' ');
    return i < 0 ? [s, ''] : [s.slice(0, i), s.slice(i + 1)];
  }
  function halo(id, inner, w) { // a mask that cuts a clear margin round the given shapes
    return '<mask id="' + id + '"><rect width="600" height="400" fill="#fff"/><g fill="#000" stroke="#000" stroke-width="' + (w || 14) + '" stroke-linejoin="round">' + inner + '</g></mask>';
  }
  function star4(x, y, r) { return 'M' + x + ' ' + (y - r) + 'L' + f(x + r * .28) + ' ' + f(y - r * .28) + 'L' + (x + r) + ' ' + y + 'L' + f(x + r * .28) + ' ' + f(y + r * .28) + 'L' + x + ' ' + (y + r) + 'L' + f(x - r * .28) + ' ' + f(y + r * .28) + 'L' + (x - r) + ' ' + y + 'L' + f(x - r * .28) + ' ' + f(y - r * .28) + 'Z'; }
  function star5(x, y, r) { var p = ''; for (var i = 0; i < 10; i++) { var q = (i * 36 - 90) * Math.PI / 180, rr = i % 2 ? r * .42 : r; p += (i ? 'L' : 'M') + f(x + rr * Math.cos(q)) + ' ' + f(y + rr * Math.sin(q)); } return p + 'Z'; }
  var SPADE = 'M0-13C5-7 13-3 13 4C13 9 8 11 3 8L5 14H-5L-3 8C-8 11-13 9-13 4C-13-3-5-7 0-13Z';
  var CLUB = '<circle cx="0" cy="-6.5" r="5.8"/><circle cx="-6.6" cy="2.5" r="5.8"/><circle cx="6.6" cy="2.5" r="5.8"/><path d="M-1.6 2L-4.5 14H4.5L1.6 2Z"/>';

  /* ---------- Tunica: a sidewheel steamboat on the river, the showbill name beneath ---------- */
  SAMPLE.tunica = { venue: 'Riverboat Classic', city: 'Tunica', style: 'Deepstack' };
  LOGOS.tunica = function (o) {
    var n = split(o.venue), posts = '', spokes = '', river = 'M132 252';
    for (var x = 196; x <= 404; x += 19) if (Math.abs(x - 300) > 46) posts += 'M' + x + ' 110V130';
    for (var a = 180; a <= 360; a += 22.5) {
      var r = a * Math.PI / 180;
      spokes += 'M' + f(300 + 9 * Math.cos(r)) + ' ' + f(134 + 9 * Math.sin(r)) + 'L' + f(300 + 36 * Math.cos(r)) + ' ' + f(134 + 36 * Math.sin(r));
    }
    for (var k = 0; k < 14; k++) river += (k ? 't24 0' : 'q12-7 24 0');
    var crown = function (x) { return 'M' + (x - 12) + ' 32L' + (x - 9) + ' 20L' + (x - 4) + ' 27L' + x + ' 17L' + (x + 4) + ' 27L' + (x + 9) + ' 20L' + (x + 12) + ' 32Z'; };
    var boat =
      '<mask id="tunica-m"><rect width="600" height="400" fill="#fff"/><circle cx="300" cy="134" r="44" fill="#000"/></mask>' +
      '<g fill="none" stroke="currentColor" stroke-width="3.5" stroke-opacity=".45"><circle cx="356" cy="16" r="7"/><circle cx="376" cy="12" r="5.5"/><circle cx="392" cy="10" r="4"/></g>' +
      '<path d="M256 30h12v60h-12zM332 30h12v60h-12z' + crown(262) + crown(338) + '"/>' +
      '<rect x="282" y="70" width="36" height="20" fill-opacity=".85"/><path d="M274 68h52" stroke="currentColor" stroke-width="4"/>' +
      '<g mask="url(#tunica-m)" fill="none" stroke="currentColor"><rect x="224" y="90" width="152" height="18" stroke-width="4"/>' +
      '<rect x="186" y="108" width="228" height="24" stroke-width="4"/><path d="' + posts + '" stroke-width="3.2" stroke-opacity=".6"/></g>' +
      '<g fill="none" stroke="currentColor"><path d="M258 134A42 42 0 0 1 342 134" stroke-width="5"/><path d="' + spokes + '" stroke-width="3.2"/></g><circle cx="300" cy="134" r="6"/>' +
      '<path d="M178 132V94M422 132V94" stroke="currentColor" stroke-width="3.2"/><path d="M178 94l20 6-20 6zM422 94l20 6-20 6z"/>' +
      '<path d="M166 132H434Q430 146 414 151H186Q170 146 166 132Z"/>';
    return S(
      '<g transform="translate(300 234) scale(1.32) translate(-300 -151)">' + boat + '</g>' +
      '<path d="' + river + '" fill="none" stroke="currentColor" stroke-width="4.5" stroke-opacity=".55" stroke-linecap="round"/>' +
      T(300, 318, E(n[0]), 'font-family="Abril Fatface" font-size="64" letter-spacing="1"') +
      '<path d="M150 341h52M398 341h52" stroke="currentColor" stroke-width="4"/>' +
      T(300, 352, U(n[1]), 'font-family="Sofia Sans Condensed" font-weight="800" font-size="30" letter-spacing="13"') +
      T(300, 378, 'TUNICA · MISSISSIPPI', 'font-family="Sofia Sans Condensed" font-weight="700" font-size="16" letter-spacing="5" fill-opacity=".8"')
    );
  };

  /* ---------- Deadwood: a tacked-up reward poster: the dead man's hand, the name in wood type ---------- */
  SAMPLE.deadwood = { venue: 'Gold Rush Bounty', city: 'Deadwood', style: 'Bounty' };
  LOGOS.deadwood = function (o) {
    var n = split(o.venue), hand = [['A', 's', -27], ['A', 'c', -9], ['8', 's', 9], ['8', 'c', 27]], out = '';
    hand.forEach(function (c, i) {
      var cut = '';
      for (var j = i + 1; j < hand.length; j++) cut += '<rect x="-36" y="-162" width="72" height="100" rx="9" transform="translate(300 250) rotate(' + hand[j][2] + ')"/>';
      var suit = function (tr) { return '<g transform="' + tr + '">' + (c[1] === 's' ? '<path d="' + SPADE + '"/>' : CLUB) + '</g>'; };
      out += (cut ? '<mask id="deadwood-c' + i + '"><rect width="600" height="400" fill="#fff"/><g fill="#000">' + cut + '</g></mask><g mask="url(#deadwood-c' + i + ')">' : '<g>') +
        '<g transform="translate(300 250) rotate(' + c[2] + ')"><rect x="-32" y="-158" width="64" height="92" rx="7" fill="none" stroke="currentColor" stroke-width="5"/>' +
        '<text x="-18" y="-128" text-anchor="middle" font-family="Pagella" font-weight="700" font-size="25">' + c[0] + '</text>' +
        suit('translate(-18 -111) scale(.62)') + suit('translate(5 -100) scale(1.3)') + '</g></g>';
    });
    var name = T(300, 290, U(n[0]), 'font-family="Six Caps" font-size="42" letter-spacing="9" stroke="currentColor" stroke-width="1.6"') +
      T(300, 352, U(n[1]), 'font-family="Six Caps" font-size="62" letter-spacing="12" stroke="currentColor" stroke-width="2"');
    return S(
      '<g fill="none" stroke="currentColor"><path d="M116 24H470L484 38V376H130L116 362Z" stroke-width="6"/>' +
      '<rect x="130" y="38" width="340" height="324" stroke-width="4" stroke-opacity=".45"/></g>' +
      '<circle cx="142" cy="50" r="6"/><circle cx="458" cy="50" r="6"/><circle cx="142" cy="350" r="6"/><circle cx="458" cy="350" r="6"/>' +
      T(300, 72, 'DEADWOOD · DAKOTA TERRITORY', 'font-family="Special Elite" font-size="18"') +
      out + name
    );
  };

  /* ---------- Miami: a deco sun rising behind the board, palms, the name in deco caps and neon script ---------- */
  SAMPLE.miami = { venue: 'Ocean Drive Open', city: 'Miami', style: 'Deepstack' };
  LOGOS.miami = function (o) {
    var n = split(o.venue), rays = '';
    for (var i = 0; i < 11; i++) {
      var a = (210 + i * 12) * Math.PI / 180, r2 = i % 2 ? 150 : 180;
      rays += 'M' + f(300 + 76 * Math.cos(a)) + ' ' + f(250 + 76 * Math.sin(a)) + 'L' + f(300 + r2 * Math.cos(a)) + ' ' + f(250 + r2 * Math.sin(a));
    }
    var LEAF = 'M0 0C18-13 44-12 66 6C44-2 20-3 0 0Z';
    function palm(cx, cy, trunk, angs, s) {
      var g = '<path d="' + trunk + '" fill="none" stroke="currentColor" stroke-width="9" stroke-linecap="round"/><g transform="translate(' + cx + ' ' + cy + ') scale(' + s + ' 1)">';
      angs.forEach(function (a) { g += '<path d="' + LEAF + '" transform="rotate(' + a + ')' + (a < -90 || a > 90 ? ' scale(1 -1)' : '') + '"/>'; });
      return g + '<circle r="7"/></g>';
    }
    return S(
      T(300, 42, 'MIAMI BEACH · DEEPSTACK', 'font-family="Sofia Sans Condensed" font-weight="700" font-size="16" letter-spacing="5" fill-opacity=".85"') +
      '<path d="M240 250A60 60 0 0 1 360 250Z"/>' +
      '<path d="' + rays + '" stroke="currentColor" stroke-width="6"/>' +
      '<path d="M150 252H450" stroke="currentColor" stroke-width="5"/>' +
      T(300, 298, U(n[0]), 'font-family="Fascinate" font-size="46" letter-spacing="2"') +
      '<path d="M128 318h66M140 330h54M152 342h42M472 318h-66M460 330h-54M448 342h-42" stroke="currentColor" stroke-width="4.5"/>' +
      T(300, 350, E(n[1]), 'font-family="Sacramento" font-size="76" stroke="currentColor" stroke-width="3" stroke-linejoin="round"') +
      palm(76, 112, 'M98 372C106 300 100 200 76 114', [-164, -132, -100, -66, -32, 4, 30], 1) +
      palm(524, 140, 'M502 360C496 290 502 220 524 142', [-164, -132, -100, -66, -32, 2, 28], -1)
    );
  };

  /* ---------- Seattle: an emerald-cut gem: the Space Needle in its setting, Rainier beneath ---------- */
  SAMPLE.seattle = { venue: 'Emerald City Open', city: 'Seattle', style: 'Freezeout' };
  LOGOS.seattle = function (o) {
    var w = String(o.venue).split(' '), l1 = w.shift(), l2 = w.join(' ');
    var needle = '<path d="M91 76V100" stroke-width="4"/><path d="M75 108L91 97L107 108ZM62 108H120L111 119H71ZM74 119H108L99 127H83Z"/>' +
      '<path d="M84 127Q90 196 88 206Q86 262 72 306M98 127Q92 196 94 206Q96 262 110 306" fill="none" stroke-width="5"/>' +
      '<path d="M91 127V306" stroke-width="4" stroke-opacity=".6"/><path d="M80 262H102" stroke-width="5"/>';
    var words = T(300, 100, U(l1), 'font-family="Audiowide" font-size="50" letter-spacing="4"') +
      T(300, 146, U(l2), 'font-family="Audiowide" font-size="50" letter-spacing="1"');
    return S(
      '<mask id="seattle-m"><rect width="600" height="400" fill="#fff"/><g fill="#000" stroke="#000" stroke-width="14">' + needle + '</g>' +
      '<rect x="490" y="118" width="56" height="164" fill="#000" stroke="none"/></mask>' +
      '<g mask="url(#seattle-m)" fill="none" stroke="currentColor">' +
      '<path d="M130 28H470L548 106V294L470 372H130L52 294V106Z" stroke-width="6"/>' +
      '<path d="M136 42H464L534 112V288L464 358H136L66 288V112Z" stroke-width="4" stroke-opacity=".5"/>' +
      '<path d="M176 160H424L456 186V214L424 240H176L144 214V186Z" stroke-width="4.5" stroke-opacity=".7"/>' +
      '<path d="M130 372L176 240M470 372L424 240" stroke-width="4" stroke-opacity=".5"/></g>' +
      '<g stroke="currentColor">' + needle + '</g>' + words +
      // Mount Rainier in the lower facet
      '<path d="M184 326L234 292L252 297L282 268L300 260L318 270L348 293L368 290L416 326Z" fill-opacity=".35" stroke="currentColor" stroke-width="4.5" stroke-linejoin="round"/>' +
      '<path d="M266 284L282 276L292 286L302 274L314 284L330 294" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/>' +
      T(300, 350, 'FREEZEOUT', 'font-family="Audiowide" font-size="15" letter-spacing="7" fill-opacity=".85"') +
      '<text x="0" y="10" transform="translate(518 200) rotate(-90)" text-anchor="middle" font-family="Audiowide" font-size="24" letter-spacing="8">SEATTLE</text>'
    );
  };

  /* ---------- Sedona: the name over a striped desert sun setting behind Cathedral and Bell Rock ---------- */
  SAMPLE.sedona = { venue: 'Red Rock Bounty', city: 'Sedona', style: 'Bounty' };
  LOGOS.sedona = function (o) {
    var n = split(o.venue);
    var rock = 'M10 400V296L36 278L46 250L56 246L60 204L68 200L72 164L80 160L86 192L92 188L98 150L106 146L112 182L120 198L128 204L134 238L152 246L176 258L204 258L210 250L262 250L268 258L346 258L352 252L404 252L426 246L452 246' +
      'C468 246 472 204 486 192C494 174 502 162 510 158L514 148L518 158C526 162 534 174 542 192C556 204 560 244 580 252L592 296V400Z';
    var stripes = '';
    [[188, 5], [206, 7], [226, 9], [248, 11]].forEach(function (s) { stripes += '<rect x="170" y="' + s[0] + '" width="260" height="' + s[1] + '"/>'; });
    var title = T(300, 96, U(n[0]), 'font-family="Chicle" font-size="76" letter-spacing="2"') +
      T(300, 140, U(n[1]), 'font-family="Bowlby One" font-size="30" letter-spacing="14"');
    return S(
      '<mask id="sedona-s"><rect width="600" height="400" fill="#fff"/><g fill="#000">' + stripes + '</g>' +
      '<g fill="#000" stroke="#000" stroke-width="14" stroke-linejoin="round">' + title + '</g></mask>' +
      '<mask id="sedona-r"><rect width="600" height="400" fill="#fff"/><g fill="#000">' +
      T(300, 336, 'SEDONA · ARIZONA', 'font-family="Bowlby One" font-size="18" letter-spacing="7"') + '</g>' +
      '<path d="M30 226H140M24 262H150M40 296H120M470 214H560M462 240H570" stroke="#000" stroke-width="4.5"/></mask>' +
      '<circle cx="300" cy="238" r="112" fill-opacity=".42" mask="url(#sedona-s)"/>' +
      title +
      '<path d="' + rock + '" fill-opacity=".78" mask="url(#sedona-r)"/>'
    );
  };

  /* ---------- Prague: the Old Town astronomical clock, the name round its ring ---------- */
  SAMPLE.prague = { venue: 'Prague Grand Prix', city: 'Prague', style: 'Freezeout' };
  LOGOS.prague = function (o) {
    var ticks = '';
    for (var i = 0; i < 24; i++) {
      var a = i * 15 * Math.PI / 180;
      ticks += 'M' + f(300 + 130 * Math.cos(a)) + ' ' + f(200 + 130 * Math.sin(a)) + 'L' + f(300 + 144 * Math.cos(a)) + ' ' + f(200 + 144 * Math.sin(a));
    }
    return S(
      '<path id="prague-a" d="M146 200A154 154 0 0 1 454 200" fill="none"/>' +
      '<path id="prague-b" d="M125 200A175 175 0 0 0 475 200" fill="none"/>' +
      '<g fill="none" stroke="currentColor"><circle cx="300" cy="200" r="188" stroke-width="6"/><circle cx="300" cy="200" r="146" stroke-width="5"/>' +
      '<path d="' + ticks + '" stroke-width="4" stroke-opacity=".7"/>' +
      '<circle cx="300" cy="172" r="94" stroke-width="5" stroke-opacity=".55"/>' +
      '<path d="M190 286Q300 330 410 286" stroke-width="4" stroke-opacity=".55"/>' +
      '<path d="M300 200V92" stroke-width="5"/></g>' +
      '<circle cx="300" cy="118" r="10"/><path d="' + star4(300, 84, 14) + star4(64, 200, 18) + star4(536, 200, 18) + star4(234, 352, 7) + star4(366, 352, 7) + '"/>' +
      '<text font-family="Grenze Gotisch" font-weight="700" font-size="44" letter-spacing="2" text-anchor="middle"><textPath href="#prague-a" startOffset="50%">' + E(o.venue) + '</textPath></text>' +
      '<text font-family="Grenze Gotisch" font-weight="700" font-size="28" letter-spacing="5" text-anchor="middle"><textPath href="#prague-b" startOffset="50%">Praha</textPath></text>'
    );
  };

  /* ---------- Malta: the eight-pointed Maltese cross, the name beneath ---------- */
  SAMPLE.malta = { venue: 'Mediterranean High Roller', city: 'Malta', style: 'High Roller' };
  LOGOS.malta = function (o) {
    var n = split(o.venue, true), arms = '';
    [0, 90, 180, 270].forEach(function (a) { arms += '<path d="M300 176L216 10L300 64L384 10Z" transform="rotate(' + a + ' 300 176)"/>'; });
    var name = T(300, 298, U(n[0]), 'font-family="Spectral SC" font-weight="600" font-size="44" letter-spacing="3" textLength="404" lengthAdjust="spacingAndGlyphs"') +
      T(300, 334, U(n[1]), 'font-family="Spectral SC" font-weight="600" font-size="27" letter-spacing="12"') +
      T(300, 366, 'Valletta · Malta', 'font-family="Cormorant Garamond" font-weight="600" font-style="italic" font-size="27"');
    return S(
      '<mask id="malta-m"><rect width="600" height="400" fill="#fff"/><rect x="60" y="258" width="480" height="142" fill="#000"/></mask>' +
      '<g mask="url(#malta-m)"><g fill-opacity=".34" stroke="currentColor" stroke-width="6" stroke-linejoin="miter">' + arms + '</g>' +
      '<circle cx="300" cy="176" r="28" fill="none" stroke="currentColor" stroke-width="4" stroke-opacity=".5"/></g>' +
      '<path d="M156 254H444" stroke="currentColor" stroke-width="4" stroke-opacity=".6"/>' + name
    );
  };

  /* ---------- Seoul: Sungnyemun gate, the board under its eaves, a seal below ---------- */
  SAMPLE.seoul = { venue: 'Seoul Cup', city: 'Seoul', style: 'Deepstack' };
  LOGOS.seoul = function (o) {
    var tiles1 = '', tiles2 = '', joints = '';
    for (var x = 186; x <= 414; x += 13) tiles1 += 'M' + x + ' 40V78';
    for (var x2 = 128; x2 <= 472; x2 += 14) tiles2 += 'M' + x2 + ' 116V154';
    [[100, 278], [160, 278], [220, 278], [280, 278], [340, 278], [400, 278], [460, 278], [130, 302], [190, 302], [250, 302], [310, 302], [370, 302], [430, 302], [490, 302]].forEach(function (j) { joints += 'M' + j[0] + ' ' + (j[1] - 24) + 'V' + j[1]; });
    var name = T(300, 312, U(o.venue), 'font-family="Black Han Sans" font-size="54" letter-spacing="2"');
    return S(
      '<mask id="seoul-t"><rect width="600" height="400" fill="#fff"/><path d="' + tiles1 + tiles2 + '" stroke="#000" stroke-width="3.5"/></mask>' +
      halo('seoul-w', name, 16) +
      '<g mask="url(#seoul-t)">' +
      '<path d="M214 30H386L390 38C410 58 440 64 478 58C466 72 450 78 432 78H168C150 78 134 72 122 58C160 64 190 58 210 38Z"/>' +
      '<path d="M160 104H440L446 112C470 136 510 140 552 132C540 148 520 154 500 154H100C80 154 60 148 48 132C90 140 130 136 154 112Z"/></g>' +
      '<path d="M210 34L202 18L222 30ZM390 34L398 18L378 30Z"/>' +
      '<rect x="180" y="82" width="240" height="20" fill-opacity=".35"/><path d="M190 80V104M222 80V104M254 80V104M286 80V104M314 80V104M346 80V104M378 80V104M410 80V104" stroke="currentColor" stroke-width="4"/>' +
      '<path d="M106 154V254M494 154V254" stroke="currentColor" stroke-width="9"/>' +
      '<g mask="url(#seoul-w)" fill="none" stroke="currentColor"><path d="M84 254H516L536 328H64Z" stroke-width="6"/>' +
      '<path d="M74 278H526M68 302H532" stroke-width="4" stroke-opacity=".4"/><path d="' + joints + '" stroke-width="4" stroke-opacity=".4"/></g>' +
      name +
      // seal: 서울
      '<g fill="none" stroke="currentColor" stroke-width="4"><rect x="258" y="336" width="84" height="50" rx="5" stroke-width="5"/>' +
      '<path d="M278 343L268 377M275 360L287 377M296 341V381M287 360H296"/><circle cx="320" cy="348" r="6"/><path d="M306 360H334M320 360V365M308 366H332V372H308V378H333"/></g>' +
      T(184, 367, 'SEOUL · KOREA', 'font-family="Sofia Sans" font-weight="800" font-size="16" letter-spacing="3"') +
      T(416, 367, 'DEEPSTACK', 'font-family="Sofia Sans" font-weight="800" font-size="16" letter-spacing="3"')
    );
  };

  /* ---------- Aspen: an engraved invitation: the script name over the Maroon Bells ---------- */
  SAMPLE.aspen = { venue: 'Aspen Invitational', city: 'Aspen', style: 'High Roller' };
  LOGOS.aspen = function (o) {
    var n = split(o.venue);
    function frame(x0, y0, x1, y1, r) {
      return 'M' + (x0 + r) + ' ' + y0 + 'H' + (x1 - r) + 'A' + r + ' ' + r + ' 0 0 0 ' + x1 + ' ' + (y0 + r) + 'V' + (y1 - r) + 'A' + r + ' ' + r + ' 0 0 0 ' + (x1 - r) + ' ' + y1 +
        'H' + (x0 + r) + 'A' + r + ' ' + r + ' 0 0 0 ' + x0 + ' ' + (y1 - r) + 'V' + (y0 + r) + 'A' + r + ' ' + r + ' 0 0 0 ' + (x0 + r) + ' ' + y0 + 'Z';
    }
    var LEAF = '<path d="M0-20C12-12 18-2 16 6C14 14 6 18 0 18C-6 18-14 14-16 6C-18-2-12-12 0-20Z" fill-opacity=".4" stroke="currentColor" stroke-width="4"/><path d="M0-12V18Q2 26-3 32" fill="none" stroke="currentColor" stroke-width="4"/>';
    var sub = T(300, 146, U(n[1]), 'font-family="Gilda Display" font-size="27" letter-spacing="9"');
    return S(
      '<g fill="none" stroke="currentColor"><path d="' + frame(100, 24, 500, 376, 28) + '" stroke-width="5"/><path d="' + frame(112, 36, 488, 364, 22) + '" stroke-width="4" stroke-opacity=".45"/></g>' +
      '<g transform="translate(150 80) rotate(-24)">' + LEAF + '</g><g transform="translate(450 80) rotate(24) scale(-1 1)">' + LEAF + '</g>' +
      halo('aspen-h', sub + '<rect x="0" y="132" width="600" height="80" stroke="none"/>', 12) +
      '<g mask="url(#aspen-h)">' + T(300, 112, E(n[0]), 'font-family="Allura" font-size="104"') + '</g>' + sub +
      // the Maroon Bells over the lake
      '<path d="M132 326L196 270L214 278L264 206L284 226L304 210L352 262L370 256L468 326Z" fill-opacity=".32" stroke="currentColor" stroke-width="4.5" stroke-linejoin="round"/>' +
      '<path d="M244 236L264 220L274 240M292 224L304 218L318 230" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/>' +
      '<path d="M128 326H472" stroke="currentColor" stroke-width="4.5"/>' +
      T(300, 352, 'BY INVITATION ONLY · COLORADO', 'font-family="Gilda Display" font-size="14" letter-spacing="2.5"')
    );
  };

  /* ---------- Toronto: laurel wreath round the CN Tower and skyline, the road's final ---------- */
  SAMPLE.playerschamp = { venue: 'Players\' Championship', city: 'Toronto', style: 'Championship' };
  LOGOS.playerschamp = function (o) {
    var n = split(o.venue), leaves = '', LEAF = 'M0 0C8-8 20-8 30 0C20 8 8 8 0 0Z';
    for (var t = 158; t <= 250; t += 8.5) {
      var a = t * Math.PI / 180, x = 300 + 236 * Math.cos(a), y = 200 + 160 * Math.sin(a);
      var d = Math.atan2(160 * Math.cos(a), -236 * Math.sin(a)) * 180 / Math.PI;
      leaves += '<path d="' + LEAF + '" transform="translate(' + f(x) + ' ' + f(y) + ') rotate(' + f(d - 38) + ')"/>';
      leaves += '<path d="' + LEAF + '" transform="translate(' + f(x) + ' ' + f(y) + ') rotate(' + f(d + 38) + ')"/>';
    }
    var a0 = 156 * Math.PI / 180, a1 = 254 * Math.PI / 180;
    var stem = 'M' + f(300 + 236 * Math.cos(a0)) + ' ' + f(200 + 160 * Math.sin(a0)) + 'A236 160 0 0 1 ' + f(300 + 236 * Math.cos(a1)) + ' ' + f(200 + 160 * Math.sin(a1));
    var wreath = '<path d="' + stem + '" fill="none" stroke="currentColor" stroke-width="5"/>' + leaves;
    return S(
      wreath + '<g transform="translate(600 0) scale(-1 1)">' + wreath + '</g>' +
      // skyline on the waterfront
      '<path d="M196 250V226Q232 196 268 226V250ZM164 250V220H180V250ZM184 250V198H200V250ZM332 250V178H350V250ZM354 250V158H374V250ZM378 250V188H394V250ZM398 250V204H416V250ZM420 250V220H436V250Z" fill-opacity=".42"/>' +
      '<path d="M150 252H450" stroke="currentColor" stroke-width="4"/>' +
      // CN Tower
      '<path d="M300 14V50" stroke="currentColor" stroke-width="4"/><path d="M293 48H307V57H293ZM296 57H304L305 78H295ZM279 80H321L328 90L321 102H279L272 90ZM292 102H308L318 250H282Z"/>' +
      T(300, 294, U(n[0]), 'font-family="Rozha One" font-size="40" letter-spacing="14"') +
      T(300, 342, U(n[1]), 'font-family="Rozha One" font-size="50" letter-spacing="2" textLength="400" lengthAdjust="spacingAndGlyphs"') +
      '<path d="' + star5(214, 368, 7) + star5(386, 368, 7) + '"/>' +
      T(300, 374, 'TORONTO', 'font-family="Sofia Sans" font-weight="800" font-size="17" letter-spacing="9" fill-opacity=".85"')
    );
  };
})();

  window.PokerLogos = {
    has: function (k) { return !!LOGOS[k]; },
    svg: function (k, o) { try { return LOGOS[k] ? LOGOS[k](o || {}) : ''; } catch (e) { return ''; } }
  };
})();
