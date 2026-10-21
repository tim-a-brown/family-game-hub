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
  function ln(x1, y1, x2, y2, w, op) {
    return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="' + C + '" stroke-width="' + w + '" stroke-linecap="round"' + (op ? ' stroke-opacity="' + op + '"' : '') + '/>';
  }
  function pth(d, ex) { return '<path d="' + d + '"' + (ex || ' fill="' + C + '"') + '/>'; }
  function stk(w, op) { return ' fill="none" stroke="' + C + '" stroke-width="' + w + '" stroke-linecap="round" stroke-linejoin="round"' + (op ? ' stroke-opacity="' + op + '"' : ''); }
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

  /* ───────── HOME GAMES ───────── */

  // Kitchen Table: hand-lettered, gingham tablecloth edge, a coffee mug and a stack of clay chips
  SAMPLE.kitchen = { venue: 'Kitchen Table', city: "Friday night at a friend's place", style: 'Home game' };
  LOGOS.kitchen = function (o) {
    var v = String(o.venue), b = '';
    b += '<defs><mask id="kitchen-m1"><rect x="0" y="0" width="600" height="400" fill="#fff"/>' +
      '<path d="' + SPADE + '" transform="translate(66 211) scale(30)" fill="#000"/></mask></defs>';
    b += '<g transform="rotate(-4 300 100)">' + tx(300, 112, 92, "'Patrick Hand'", E(v), fit(v, 92, 0.4, 450) + ' stroke="' + C + '" stroke-width="2.5"') +
      pth('M156 134Q300 116 448 128', stk(6)) + '</g>';
    // gingham band under the cards
    var g = '';
    for (var x = 134; x < 466; x += 22) g += '<rect x="' + x + '" y="262" width="11" height="33" fill="' + C + '" fill-opacity=".42"/>';
    g += '<rect x="134" y="262" width="332" height="11" fill="' + C + '" fill-opacity=".42"/><rect x="134" y="284" width="332" height="11" fill="' + C + '" fill-opacity=".42"/>';
    b += g;
    if (o.city) b += tx(300, 336, 30, "'Patrick Hand'", E(o.city), fit(o.city, 30, 0.4, 440) + ' stroke="' + C + '" stroke-width="1"');
    // mug with steam
    b += '<g mask="url(#kitchen-m1)">' + pth('M34 176h64v52q0 24 -24 24h-16q-24 0 -24 -24z') + '</g>' +
      pth('M98 188h6a16 16 0 0 1 0 32h-6', stk(7));
    [50, 66, 82].forEach(function (x, i) { b += pth('M' + x + ' 162q-9 -10 0 -20t0 -20', stk(5, i === 1 ? 1 : 0.6)); });
    // clay chips
    var cx = 528;
    for (var i = 0; i < 4; i++) {
      var y = 254 - i * 19, sx = [0, 3, -2, 1][i];
      [[0, 12, 1], [12, 22, 0.35], [22, 58, 1], [58, 68, 0.35], [68, 80, 1]].forEach(function (s) {
        b += '<rect x="' + (cx - 40 + sx + s[0]) + '" y="' + y + '" width="' + (s[1] - s[0]) + '" height="13" fill="' + C + '" fill-opacity="' + s[2] + '"/>';
      });
    }
    var ty = 254 - 3 * 19 + 1;
    b += '<path fill-rule="evenodd" fill="' + C + '" d="M' + (cx - 39) + ' ' + ty + 'a40 12 0 1 0 80 0a40 12 0 1 0 -80 0ZM' + (cx - 26) + ' ' + ty + 'a27 7.5 0 1 0 54 0a27 7.5 0 1 0 -54 0Z"/>' +
      '<ellipse cx="' + (cx + 1) + '" cy="' + ty + '" rx="17" ry="4.5" fill="' + C + '" fill-opacity=".5"/>';
    return svg(b);
  };

  // The Basement Game: a home-bar neon sign, stairs going down on one side, a cocktail glass on the other
  SAMPLE.basement = { venue: 'The Basement Game', city: 'Game night at your cousin\'s', style: 'Home game' };
  LOGOS.basement = function (o) {
    var v = String(o.venue), the = /^the\s+/i.test(v), top = v.replace(/^the\s+/i, '').replace(/\s+(game|poker)$/i, '');
    function neon(inner) { return '<g stroke-opacity=".28" stroke-width="16">' + inner + '</g><g stroke-width="5">' + inner + '</g>'; }
    var n = '';
    n += '<text x="300" y="150" font-size="80" font-family="Bungee" text-anchor="middle" fill="none" stroke="' + C + '" stroke-linejoin="round"' + fit(top, 80, 0.8, 440) + '>' + E(up(top)) + '</text>';
    if (the) n += '<rect x="250" y="30" width="100" height="38" rx="19" fill="none" stroke="' + C + '"/>';
    // the four suits in neon tube under the cards
    var SU = [SPADE, 'M0 0.42C-0.5 0 -0.55 -0.35 -0.27 -0.45C-0.1 -0.5 0 -0.38 0 -0.28C0 -0.38 0.1 -0.5 0.27 -0.45C0.55 -0.35 0.5 0 0 0.42Z',
      'M0 -0.5L0.36 0L0 0.5L-0.36 0Z', 'M0 -0.02A0.2 0.2 0 1 1 0.001 -0.02ZM-0.04 0.06A0.2 0.2 0 1 1 -0.04 0.061ZM0.04 0.06A0.2 0.2 0 1 1 0.04 0.061ZM0 0.1L0.12 0.48H-0.12Z'];
    SU[3] = 'M-0.2 -0.22a0.2 0.2 0 1 0 0.4 0a0.2 0.2 0 1 0 -0.4 0ZM-0.44 0.1a0.2 0.2 0 1 0 0.4 0a0.2 0.2 0 1 0 -0.4 0ZM0.04 0.1a0.2 0.2 0 1 0 0.4 0a0.2 0.2 0 1 0 -0.4 0ZM0 0.12L0.12 0.48H-0.12Z';
    SU.forEach(function (d, i) { n += '<path d="' + d + '" transform="translate(' + (186 + i * 76) + ' 306) scale(56)" fill="none" stroke="' + C + '" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>'; });
    // stairs down (left), martini glass (right)
    n += '<path d="M14 150h24v28h24v28h24v28h24v28" fill="none" stroke="' + C + '" stroke-linecap="round" stroke-linejoin="round"/>';
    n += '<path d="M90 300l18 -18M108 300v-18h-18" fill="none" stroke="' + C + '" stroke-linecap="round" stroke-linejoin="round"/>';
    n += '<path d="M490 176h84l-42 50zM532 226v42M508 270h48M514 174l20 -22" fill="none" stroke="' + C + '" stroke-linecap="round" stroke-linejoin="round"/>';
    n += '<circle cx="518" cy="190" r="7" fill="none" stroke="' + C + '"/>';
    var b = neon(n);
    if (the) b += tx(300, 58, 24, 'Bungee', 'THE', ' letter-spacing="3"');
    return svg(b);
  };

  // The Garage Game: the garage door itself (cards land on its panels) under a bolted shop sign
  SAMPLE.garage = { venue: 'The Garage Game', city: 'Saturday at the neighbors\'', style: 'Home game' };
  LOGOS.garage = function (o) {
    var v = up(String(o.venue).replace(/\s+game$/i, '')), b = '';
    b += '<rect x="98" y="30" width="404" height="84" rx="8"' + stk(6) + '/>';
    [[116, 48], [484, 48], [116, 96], [484, 96]].forEach(function (p) { b += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="6" fill="' + C + '"/>'; });
    b += tx(300, 96, 64, "'Sofia Sans Condensed'", E(v), ' font-weight="900" letter-spacing="3"' + fit(v, 64, 0.46, 336, 3));
    // door frame + panels
    b += pth('M70 400V132H530V400', stk(9));
    var cols = 4, x0 = 88, w = (424 - 3 * 10) / 4, rows = [150, 204, 258, 312];
    rows.forEach(function (y, r) {
      for (var c = 0; c < cols; c++) {
        var x = x0 + c * (w + 10);
        b += '<rect x="' + x.toFixed(1) + '" y="' + y + '" width="' + w.toFixed(1) + '" height="44" rx="4"' + (r === 0 ? stk(5).replace('fill="none"', 'fill="' + C + '" fill-opacity=".3"') : stk(5)) + '/>';
      }
    });
    b += '<rect x="276" y="368" width="48" height="10" rx="5" fill="' + C + '"/>';
    return svg(b);
  };

  // Dining Room Poker: a place setting (the cards are on the plate), the chandelier above, a formal script name
  SAMPLE.dining = { venue: 'Dining Room Poker', city: 'Saturday at the neighbors\'', style: 'Home game' };
  LOGOS.dining = function (o) {
    var v = String(o.venue).replace(/\s+poker$/i, ''), b = '';
    // chandelier
    b += ln(300, 0, 300, 36, 5) + '<ellipse cx="300" cy="44" rx="9" ry="11" fill="' + C + '"/>' + '<rect x="296" y="50" width="8" height="40" fill="' + C + '"/>';
    b += pth('M262 84Q300 112 338 84Z');
    [['M300 88C268 106 222 102 216 72', 216], ['M300 88C286 98 262 94 258 70', 258], ['M300 88C314 98 338 94 342 70', 342], ['M300 88C332 106 378 102 384 72', 384]].forEach(function (a) {
      var x = a[1]; b += pth(a[0], stk(5)) + '<rect x="' + (x - 10) + '" y="64" width="20" height="8" rx="3" fill="' + C + '"/>' +
        '<rect x="' + (x - 4) + '" y="40" width="8" height="24" fill="' + C + '" fill-opacity=".65"/>' + pth('M' + x + ' 22q7 9 0 14q-7 -5 0 -14Z');
    });
    [238, 279, 321, 362].forEach(function (x) { b += '<circle cx="' + x + '" cy="' + (x === 279 || x === 321 ? 108 : 102) + '" r="5" fill="' + C + '" fill-opacity=".6"/>'; });
    b += '<circle cx="300" cy="112" r="6" fill="' + C + '"/>';
    // plate
    b += '<ellipse cx="300" cy="200" rx="204" ry="76"' + stk(6) + '/><ellipse cx="300" cy="200" rx="180" ry="62"' + stk(4, 0.45) + '/>';
    // fork (left), knife (right)
    var f = '';
    for (var i = 0; i < 4; i++) f += '<rect x="' + (44 + i * 9) + '" y="128" width="5" height="44" rx="2.5" fill="' + C + '"/>';
    f += pth('M43 168H80Q80 194 66 200V318Q66 326 61.5 326Q57 326 57 318V200Q43 194 43 168Z');
    b += f + pth('M536 126Q560 152 556 230H536Z') + '<rect x="536" y="226" width="18" height="100" rx="9" fill="' + C + '"/>';
    b += tx(300, 338, 54, 'Pagella', E(v), ' font-weight="700" font-style="italic"' + fit(v, 58, 0.5, 410));
    b += ln(196, 362, 280, 362, 4, 0.6) + ln(320, 362, 404, 362, 4, 0.6) + pth('M300 352L310 362L300 372L290 362Z');
    return svg(b);
  };

  // The Back Porch Game: string lights across the top, rocking chairs either side, the river below
  SAMPLE.porch = { venue: 'The Back Porch Game', city: 'After the barbecue', style: 'Home game' };
  LOGOS.porch = function (o) {
    var v = String(o.venue).replace(/\s+game$/i, ''), b = '';
    b += pth('M6 30Q300 110 594 30', stk(4));
    for (var i = 1; i < 14; i++) {
      var t = i / 14, x = (1 - t) * (1 - t) * 6 + 2 * t * (1 - t) * 300 + t * t * 594, y = (1 - t) * (1 - t) * 30 + 2 * t * (1 - t) * 110 + t * t * 30;
      b += '<rect x="' + (x - 4).toFixed(1) + '" y="' + y.toFixed(1) + '" width="8" height="7" fill="' + C + '"/>' +
        '<ellipse cx="' + x.toFixed(1) + '" cy="' + (y + 17).toFixed(1) + '" rx="7.5" ry="10.5" fill="' + C + '" fill-opacity="' + (i % 3 === 1 ? 1 : 0.55) + '"/>';
    }
    b += tx(300, 148, 64, "'Baloo 2'", E(v), ' font-weight="700"' + fit(v, 64, 0.44, 420));
    var chair = pth('M6 0Q12 40 18 64L20 120M14 64H74M71 64L73 118M16 32H64Q72 32 72 40V64M-6 110Q40 132 92 104', stk(7)) + '<circle cx="6" cy="0" r="6" fill="' + C + '"/>' +
      pth('M8 14L18 14M10 46H20', stk(5, 0.6));
    b += '<g transform="translate(40 176)">' + chair + '</g><g transform="translate(560 176) scale(-1 1)">' + chair + '</g>';
    if (o.city) b += tx(300, 292, 28, 'Fredoka', E(o.city), ' font-weight="600"' + fit(o.city, 28, 0.5, 330));
    [[322, 170, 1], [342, 200, 0.6], [362, 230, 0.4]].forEach(function (r) {
      var x = 300 - r[1], d = 'M' + x + ' ' + r[0];
      for (var k = 0; k < r[1] * 2 / 30; k++) d += k ? 't30 0' : 'q15 -9 30 0';
      b += pth(d, stk(5, r[2]));
    });
    return svg(b);
  };

  /* ───────── CLUB TOURNEYS ───────── */

  // Lodge NNN Charity Night: a lodge-hall portal: two columns, an arch with keystone, name arched beneath, a charity ribbon
  SAMPLE.lodge = { venue: 'Lodge 512 Charity Night', city: 'Saturday night, members and guests', style: 'Club tourney' };
  LOGOS.lodge = function (o) {
    var v = String(o.venue), m = v.match(/^(lodge\s+\d+)\s*(.*)$/i), top = m ? m[1].replace(/lodge\s+(\d+)/i, 'Lodge No. $1') : v, sub = m ? m[2] : '', b = '';
    function col(cx) {
      return '<rect x="' + (cx - 36) + '" y="126" width="72" height="12" rx="3" fill="' + C + '"/>' +
        '<circle cx="' + (cx - 32) + '" cy="142" r="7" fill="' + C + '"/><circle cx="' + (cx + 32) + '" cy="142" r="7" fill="' + C + '"/>' +
        '<rect x="' + (cx - 26) + '" y="138" width="52" height="10" fill="' + C + '" fill-opacity=".6"/>' +
        '<rect x="' + (cx - 23) + '" y="152" width="46" height="150"' + stk(5) + '/>' + ln(cx - 8, 162, cx - 8, 292, 4, 0.55) + ln(cx + 8, 162, cx + 8, 292, 4, 0.55) +
        '<rect x="' + (cx - 31) + '" y="304" width="62" height="12" rx="2" fill="' + C + '"/><rect x="' + (cx - 38) + '" y="318" width="76" height="12" rx="2" fill="' + C + '"/>';
    }
    b += col(78) + col(522);
    b += pth('M42 126A258 104 0 0 1 558 126', stk(7)) + pth('M284 8H316L310 34H290Z');
    b += '<defs><path id="lodge-a" d="M92 162A208 110 0 0 1 508 162"/></defs>';
    b += '<text font-family="Cinzel" font-weight="700" font-size="40" fill="' + C + '" text-anchor="middle" letter-spacing="2"' + fit(top, 40, 0.74, 400, 2) +
      '><textPath href="#lodge-a" startOffset="50%">' + E(top) + '</textPath></text>';
    if (sub) {
      b += pth('M150 274L110 274L126 298L110 322L150 322', ' fill="' + C + '" fill-opacity=".35"') + pth('M450 274L490 274L474 298L450 322Z', ' fill="' + C + '" fill-opacity=".35"');
      b += pth('M150 264Q300 278 450 264V314Q300 328 150 314Z', stk(5));
      b += tx(300, 300, 26, 'Cinzel', E(sub), ' font-weight="700" letter-spacing="2"' + fit(sub, 26, 0.72, 270, 2));
    }
    if (o.city) b += tx(300, 362, 22, 'Pagella', E(o.city), ' font-style="italic"' + fit(o.city, 22, 0.42, 380));
    return svg(b);
  };

  // Post NNN Veterans Hall Tourney: flag bunting, stars and sergeant's chevrons, stencil-sturdy lettering
  SAMPLE.vfw = { venue: 'Post 512 Veterans Hall Tourney', city: 'In the big hall, after the fish fry', style: 'Club tourney' };
  LOGOS.vfw = function (o) {
    var v = String(o.venue), m = v.match(/^(post\s+\d+)\s*(.*)$/i), top = m ? m[1] : v, b = '';
    var l1 = m ? m[2].replace(/\s*(tourney|tournament|poker night|card night|fundraiser)$/i, '') : '';
    // bunting fan hanging from the top edge
    var n = 7, r1 = 40, r2 = 94, cx = 300;
    for (var i = 0; i < n; i++) {
      var a1 = Math.PI * i / n, a2 = Math.PI * (i + 1) / n;
      function P(r, a) { return (cx + r * Math.cos(a)).toFixed(1) + ' ' + (r * Math.sin(a)).toFixed(1); }
      b += '<path d="M' + P(r1, a1) + 'L' + P(r2, a1) + 'A' + r2 + ' ' + r2 + ' 0 0 1 ' + P(r2, a2) + 'L' + P(r1, a2) + 'A' + r1 + ' ' + r1 + ' 0 0 0 ' + P(r1, a1) + 'Z" fill="' + C + '" fill-opacity="' + (i % 2 ? 0.35 : 1) + '"/>';
    }
    b += '<path d="M' + (cx - 34) + ' 0A34 34 0 0 0 ' + (cx + 34) + ' 0Z" fill="' + C + '" fill-opacity=".65"/>';
    b += tx(300, 148, 62, "'Russo One'", E(up(top)), ' letter-spacing="3"' + fit(top, 62, 0.68, 330, 3));
    b += pth(star(92, 126, 22)) + pth(star(508, 126, 22));
    [176, 202, 228].forEach(function (y) { b += pth('M46 ' + (y + 28) + 'L82 ' + y + 'L118 ' + (y + 28), stk(11)) + pth('M482 ' + (y + 28) + 'L518 ' + y + 'L554 ' + (y + 28), stk(11)); });
    if (l1) b += tx(300, 302, 48, "'Sofia Sans Condensed'", E(up(l1)), ' font-weight="800" letter-spacing="2"' + fit(l1, 48, 0.5, 380, 2));
    b += ln(170, 336, 262, 336, 5) + ln(338, 336, 430, 336, 5) + pth(star(278, 336, 11)) + pth(star(300, 336, 11)) + pth(star(322, 336, 11));
    return svg(b);
  };

  // Firehouse NN Fundraiser: the fire-service cross with gold-leaf style scroll banners and a ladder
  SAMPLE.firehouse = { venue: 'Firehouse 13 Fundraiser', city: 'Raising money for a good cause', style: 'Club tourney' };
  LOGOS.firehouse = function (o) {
    var v = String(o.venue), m = v.match(/^(firehouse)\s+(\d+)\s*(.*)$/i), name = m ? m[1] : v.replace(/\s+(fundraiser|tourney|night)$/i, ''), num = m ? m[2] : '', sub = 'Engine Co.' + (m ? ' ' + m[2] : ''), b = '';
    // cross as one outline
    var arm = [[-26, -26], [-76, -180], [0, -150], [76, -180]], d = '';
    for (var k = 0; k < 4; k++) {
      var R = function (p) { var x = p[0], y = p[1]; for (var j = 0; j < k; j++) { var t = x; x = -y; y = t; } return (300 + x) + ' ' + (200 + y); };
      d += (k ? 'L' : 'M') + R(arm[0]) + 'L' + R(arm[1]) + 'Q' + R(arm[2]) + ' ' + R(arm[3]);
    }
    b += '<mask id="firehouse-x"><rect width="600" height="400" fill="#fff"/><path d="M96 78Q300 52 504 78V124Q300 98 96 124ZM96 282Q300 308 504 282V326Q300 352 96 326Z" fill="#000" stroke="#000" stroke-width="8"/></mask>' +
      '<path d="' + d + 'Z" fill="' + C + '" fill-opacity=".3" stroke="' + C + '" stroke-width="7" stroke-linejoin="round" mask="url(#firehouse-x)"/>';
        // ladder in the bottom arm
    b += ln(286, 348, 286, 382, 5) + ln(314, 348, 314, 382, 5) + ln(286, 358, 314, 358, 5) + ln(286, 372, 314, 372, 5);
    b += '<defs><path id="firehouse-p1" d="M96 112Q300 86 504 112"/><path id="firehouse-p2" d="M96 316Q300 342 504 316"/>' +
      '<mask id="firehouse-k"><rect width="600" height="400" fill="#fff"/>' +
      '<text font-family="Rye" font-size="40" text-anchor="middle" fill="#000"' + fit(name, 40, 0.86, 380) + '><textPath href="#firehouse-p1" startOffset="50%">' + E(up(name)) + '</textPath></text>' +
      (sub ? '<text font-family="Rye" font-size="32" text-anchor="middle" fill="#000"' + fit(sub, 32, 0.86, 360) + '><textPath href="#firehouse-p2" startOffset="50%">' + E(up(sub)) + '</textPath></text>' : '') +
      '</mask></defs>';
    var tails = pth('M100 84L58 90L74 108L58 128L100 124Z', ' fill="' + C + '" fill-opacity=".55"') + pth('M500 84L542 90L526 108L542 128L500 124Z', ' fill="' + C + '" fill-opacity=".55"');
    var ban = pth('M96 78Q300 52 504 78V124Q300 98 96 124Z');
    if (sub) {
      tails += pth('M100 282L58 288L74 306L58 326L100 322Z', ' fill="' + C + '" fill-opacity=".55"') + pth('M500 282L542 288L526 306L542 326L500 322Z', ' fill="' + C + '" fill-opacity=".55"');
      ban += pth('M96 282Q300 308 504 282V326Q300 352 96 326Z');
    }
    b += tails + '<g mask="url(#firehouse-k)">' + ban + '</g>';
    return svg(b);
  };

  // Country Club Card Night: a laurel wreath around the table, crossed golf clubs, engraved caps and a script
  SAMPLE.countryclub = { venue: 'Country Club Card Night', city: 'Saturday night, members and guests', style: 'Club tourney' };
  LOGOS.countryclub = function (o) {
    var v = String(o.venue), m = v.match(/^(.*?club)\b/i), top = m ? m[1] : v.replace(/\s+(card night|poker night|tourney)$/i, ''), b = '';
    var sub = top.split(/\s+/).filter(function (x) { return /^[A-Z]/i.test(x) && !/^(the|of)$/i.test(x); }).map(function (x) { return x[0].toUpperCase(); }).join('').slice(0, 3);
    var cx = 300, cy = 205, rx = 252, ry = 152;
    function pt(a) { return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)]; }
    function branch(a0, a1, dir) {
      var p0 = pt(a0), p1 = pt(a1), s = '<path d="M' + p0[0].toFixed(1) + ' ' + p0[1].toFixed(1) + 'A' + rx + ' ' + ry + ' 0 0 ' + (dir > 0 ? 1 : 0) + ' ' + p1[0].toFixed(1) + ' ' + p1[1].toFixed(1) + '"' + stk(5) + '/>';
      var n = 9;
      for (var i = 0; i <= n; i++) {
        var a = a0 + (a1 - a0) * i / n, p = pt(a), gx = -rx * Math.sin(a) * dir, gy = ry * Math.cos(a) * dir, g = Math.atan2(gy, gx), sc = 1 - i * 0.035;
        [-0.75, 0.75].forEach(function (off) {
          var la = g + off, lx = p[0] + Math.cos(la) * 15 * sc, ly = p[1] + Math.sin(la) * 15 * sc;
          s += '<ellipse cx="' + lx.toFixed(1) + '" cy="' + ly.toFixed(1) + '" rx="' + (17 * sc).toFixed(1) + '" ry="' + (6.5 * sc).toFixed(1) + '" transform="rotate(' + (la * 180 / Math.PI).toFixed(1) + ' ' + lx.toFixed(1) + ' ' + ly.toFixed(1) + ')" fill="' + C + '" fill-opacity=".85"/>';
        });
      }
      var tp = pt(a1); s += '<circle cx="' + tp[0].toFixed(1) + '" cy="' + tp[1].toFixed(1) + '" r="6" fill="' + C + '"/>';
      return s;
    }
    var D = Math.PI / 180;
    b += branch(100 * D, 200 * D, 1) + branch(80 * D, -20 * D, -1);
    // bow where the branches meet
    b += pth('M300 356C282 338 262 342 266 356C262 370 282 374 300 356ZM300 356C318 338 338 342 334 356C338 370 318 374 300 356Z', stk(5)) + '<circle cx="300" cy="356" r="6" fill="' + C + '"/>' +
      pth('M296 360L284 392M304 360L316 392', stk(5));
    // crossed golf clubs at the crown
    b += ln(278, 12, 318, 42, 5) + ln(322, 12, 282, 42, 5) + ln(278, 12, 286, 18, 8) + ln(322, 12, 314, 18, 8) +
      pth('M314 38L334 42L332 50L312 46Z') + pth('M286 38L266 42L268 50L288 46Z');
    b += '<defs><path id="countryclub-a" d="M90 172A220 128 0 0 1 510 172"/></defs>';
    b += '<text font-family="Pagella" font-weight="700" font-size="36" fill="' + C + '" text-anchor="middle" letter-spacing="5"' + fit(top, 36, 0.72, 380, 5) +
      '><textPath href="#countryclub-a" startOffset="50%">' + E(up(top)) + '</textPath></text>';
    if (sub) b += tx(300, 330, 96, "'Great Vibes'", E(sub), ' stroke="' + C + '" stroke-width="2" letter-spacing="-14"');
    return svg(b);
  };

  // Elm Street Rec Center Tourney: the gym floor: center circle, the paint and three-point arcs, varsity lettering
  SAMPLE.rec = { venue: 'Elm Street Rec Center Tourney', city: 'Folding tables and a coffee urn', style: 'Club tourney' };
  LOGOS.rec = function (o) {
    var v = String(o.venue), m = v.match(/^(.*?)\s+(rec(?:reation)? center)\s*(.*)$/i), l1 = m ? m[1] : v, l2 = m ? m[2] : '', b = '';
    // court
    [0, 1].forEach(function (s) {
      var g = s ? ' transform="translate(600 0) scale(-1 1)"' : '';
      b += '<g' + g + '><rect x="-10" y="152" width="120" height="96" fill="' + C + '" fill-opacity=".3" stroke="' + C + '" stroke-width="6"/>' +
        '<path d="M110 154A46 46 0 0 1 110 246"' + stk(6) + '/>' +
        '<path d="M0 36A164 164 0 0 1 0 364"' + stk(6) + '/>' + ln(14, 200, 30, 200, 6) + '<circle cx="40" cy="200" r="11"' + stk(5) + '/></g>';
    });
    b += '<circle cx="300" cy="200" r="74"' + stk(6) + '/>' + ln(300, 118, 300, 282, 6);
    b += tx(300, 120, 82, "'Jersey 10'", E(up(l1)), ' letter-spacing="3"' + fit(l1, 82, 0.46, 340, 3));
    if (l2) b += tx(300, 338, 74, "'Jersey 10'", E(up(l2)), ' letter-spacing="3"' + fit(l2, 74, 0.46, 340, 3));
    return svg(b);
  };

  /* ───────── SERIES EVENTS ───────── */

  // Gladiators of Poker: a crested gladiator helmet, two gladius swords, monumental Roman capitals
  SAMPLE.glad = { venue: 'Gladiators of Poker', city: 'Las Vegas', style: 'Gladiators', series: 'Summer Series' };
  LOGOS.glad = function (o) {
    var v = String(o.venue), m = v.match(/^(.*?)\s+(of\s+.*)$/i), l1 = m ? m[1] : v, l2 = m ? m[2] : '', b = '';
    var cut = '';
    for (var x = 234; x <= 366; x += 11) cut += '<line x1="' + x + '" y1="4" x2="' + x + '" y2="66" stroke="#000" stroke-width="3.5"/>';
    b += '<defs><mask id="glad-m"><rect width="600" height="400" fill="#fff"/>' + cut + '</mask>' +
      '<mask id="glad-v"><rect width="600" height="400" fill="#fff"/>';
    for (var gx = 266; gx < 336; gx += 13) for (var gy = 134; gy < 152; gy += 8) b += '<rect x="' + gx + '" y="' + gy + '" width="7" height="4.5" fill="#000"/>';
    b += '</mask></defs>';
    b += '<path d="M222 84C224 30 258 12 300 12C342 12 376 30 378 84Z" fill="' + C + '" fill-opacity=".8" mask="url(#glad-m)"/>';
    b += '<rect x="230" y="74" width="140" height="12" rx="5" fill="' + C + '"/>';
    b += pth('M246 124C246 78 354 78 354 124Z') + pth('M194 124Q300 110 406 124L398 138Q300 122 202 138Z');
    b += '<rect x="258" y="128" width="84" height="27" rx="5" fill="' + C + '" mask="url(#glad-v)"/>';
    function sword(c) {
      return pth('M' + (c - 8) + ' 150Q' + (c - 13) + ' 250 ' + c + ' 332Q' + (c + 13) + ' 250 ' + (c + 8) + ' 150Z', ' fill="' + C + '" fill-opacity=".85"') +
        '<rect x="' + (c - 26) + '" y="138" width="52" height="12" rx="5" fill="' + C + '"/>' +
        '<rect x="' + (c - 6) + '" y="102" width="12" height="36" rx="3" fill="' + C + '" fill-opacity=".7"/>' + ln(c - 6, 114, c + 6, 114, 4) + ln(c - 6, 126, c + 6, 126, 4) +
        '<circle cx="' + c + '" cy="94" r="11" fill="' + C + '"/>';
    }
    b += sword(62) + sword(538);
    b += tx(300, 318, 66, 'Cinzel', E(up(l1)), ' font-weight="700"' + fit(l1, 66, 0.8, 400));
    if (l2) {
      b += tx(300, 352, 26, 'Cinzel', E(up(l2)), ' font-weight="700" letter-spacing="6"');
      var hw = l2.length * 13 + 18; b += ln(140, 343, 300 - hw, 343, 4) + ln(300 + hw, 343, 460, 343, 4);
    }
    if (o.series) b += tx(300, 382, 20, "'Sofia Sans Condensed'", E(up(o.series)), ' font-weight="700" letter-spacing="6"');
    return svg(b);
  };

  // Millionaire Maker: the felt is a banknote: engraved border, corner "1M" numerals, the cards in the portrait spot
  SAMPLE.mmaker = { venue: 'Millionaire Maker', city: 'Las Vegas', style: 'Millionaire Maker', series: 'Summer Series' };
  LOGOS.mmaker = function (o) {
    var v = String(o.venue), w = v.split(/\s+/), l1 = w.length > 1 ? w.slice(0, -1).join(' ') : v, l2 = w.length > 1 ? w[w.length - 1] : '', b = '';
    b += '<rect x="40" y="44" width="520" height="312" rx="46"' + stk(6) + '/>';
    b += '<rect x="54" y="58" width="492" height="284" rx="34" fill="none" stroke="' + C + '" stroke-width="10" stroke-dasharray="4 5" stroke-opacity=".6"/>';
    b += '<rect x="70" y="74" width="460" height="252" rx="22"' + stk(4, 0.7) + '/>';
    [[104, 110], [496, 110], [104, 290], [496, 290]].forEach(function (p) {
      var d = '';
      for (var i = 0; i < 24; i++) { var a = i * Math.PI / 12, r = i % 2 ? 26 : 31; d += (i ? 'L' : 'M') + (p[0] + r * Math.cos(a)).toFixed(1) + ' ' + (p[1] + r * Math.sin(a)).toFixed(1); }
      b += '<path d="' + d + 'Z" fill="' + C + '" fill-opacity=".3" stroke="' + C + '" stroke-width="4" stroke-linejoin="round"/>' +
        tx(p[0], p[1] + 10, 28, 'Pagella', '1M', ' font-weight="700"');
    });
    b += tx(300, 138, 50, 'Pagella', E(up(l1)), ' font-weight="700" letter-spacing="3"' + fit(l1, 50, 0.7, 300, 3));
    if (l2) b += tx(300, 294, 50, 'Pagella', E(up(l2)), ' font-weight="700" letter-spacing="10"' + fit(l2, 50, 0.7, 300, 10));
    if (o.series) b += tx(300, 318, 18, "'Sofia Sans Condensed'", E(up(o.series)), ' font-weight="800" letter-spacing="7"');
    return svg(b);
  };

  // Monster Stack: two towering stacks of chips framing huge block letters
  SAMPLE.monster = { venue: 'Monster Stack', city: 'Las Vegas', style: 'Monster Stack', series: 'Summer Series' };
  LOGOS.monster = function (o) {
    var v = String(o.venue), w = v.split(/\s+/), l1 = w.length > 1 ? w.slice(0, -1).join(' ') : v, l2 = w.length > 1 ? w[w.length - 1] : '', b = '';
    function tower(cx, n, base, seed) {
      var s = '', top = 0, hi = '', lo = '';
      for (var i = 0; i < n; i++) {
        var y = base - i * 19, jx = Math.round(Math.sin(i * 1.7 + seed) * 4);
        [[0, 12, 1], [12, 22, 0.35], [22, 54, 1], [54, 64, 0.35], [64, 76, 1]].forEach(function (p) {
          var r = 'M' + (cx - 38 + jx + p[0]) + ' ' + y + 'h' + (p[1] - p[0]) + 'v14h-' + (p[1] - p[0]) + 'z';
          if (p[2] < 1) lo += r; else hi += r;
        });
        top = y; var tj = jx;
      }
      s += '<path d="' + hi + '" fill="' + C + '"/><path d="' + lo + '" fill="' + C + '" fill-opacity=".35"/>';
      s += '<path fill-rule="evenodd" fill="' + C + '" d="M' + (cx - 38 + tj) + ' ' + top + 'a38 10 0 1 0 76 0a38 10 0 1 0 -76 0ZM' + (cx - 24 + tj) + ' ' + top + 'a24 6 0 1 0 48 0a24 6 0 1 0 -48 0Z"/>';
      return s;
    }
    b += tower(84, 13, 320, 0) + tower(516, 11, 320, 2);
    b += tx(300, 130, 78, "'Russo One'", E(up(l1)), ' stroke="' + C + '" stroke-width="2" stroke-linejoin="round"' + fit(l1, 78, 0.72, 340));
    if (l2) b += tx(300, 332, 100, "'Russo One'", E(up(l2)), ' stroke="' + C + '" stroke-width="2" stroke-linejoin="round"' + fit(l2, 100, 0.72, 330));
    if (o.series) b += tx(300, 370, 20, "'Sofia Sans Condensed'", E(up(o.series)), ' font-weight="700" letter-spacing="7"');
    return svg(b);
  };

  // Mystery Millions: the back of a sealed envelope, a wax seal with a question mark at the flap
  SAMPLE.mystery = { venue: 'Mystery Millions', city: 'Las Vegas', style: 'Mystery Bounty', series: 'Summer Series' };
  LOGOS.mystery = function (o) {
    var v = String(o.venue), b = '';
    b += '<rect x="70" y="50" width="460" height="300" rx="14"' + stk(7) + '/>';
    b += '<path d="M76 56L300 122L524 56" fill="' + C + '" fill-opacity=".3" stroke="' + C + '" stroke-width="6" stroke-linejoin="round"/>';
    b += pth('M76 344L232 236M524 344L368 236', stk(5, 0.5));
    var d = '';
    for (var i = 0; i < 36; i++) { var a = i * Math.PI / 18, r = i % 2 ? 36 : 41; d += (i ? 'L' : 'M') + (300 + r * Math.cos(a)).toFixed(1) + ' ' + (112 + r * Math.sin(a)).toFixed(1); }
    b += '<defs><mask id="mystery-m"><rect width="600" height="400" fill="#fff"/><circle cx="300" cy="112" r="28" fill="none" stroke="#000" stroke-width="4"/>' +
      '<text x="300" y="129" font-family="\'Lilita One\'" font-size="46" text-anchor="middle" fill="#000">?</text></mask></defs>';
    b += '<path d="' + d + 'Z" fill="' + C + '" mask="url(#mystery-m)"/>';
    b += tx(300, 304, 54, "'Lilita One'", E(up(v)), ' letter-spacing="1"' + fit(v, 54, 0.52, 400, 1));
    if (o.series) b += tx(300, 336, 20, "'Sofia Sans Condensed'", E(up(o.series)), ' font-weight="700" letter-spacing="7"');
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
    return SV + '<rect x="62" y="40" width="476" height="320" rx="38"' + L(6) + '/>' +
      T(nm, 300, 146, 116, 'Great Vibes', { cw: 0.42, max: 400 }) +
      T('ITALIAN KITCHEN', 300, 290, 34, 'Cinzel', { w: 700, ls: 3, cw: 0.74 }) +
      P('M62,306h476v16a38,38 0 0 1 -38,38h-400a38,38 0 0 1 -38,-38z', ' fill-opacity=".32"') + P('M62,306h476', L(5)) +
      T('CLOSE COVER BEFORE STRIKING', 300, 340, 20, 'Sofia Sans Condensed', { w: 800, ls: 4, cw: 0.46, max: 380 }) +
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
      P('M150,152H450', L(5) + ' stroke-opacity=".5"') +
      (top ? T(U(top), 300, 62, 26, 'Sofia Sans Condensed', { w: 800, ls: 10, cw: 0.5, max: 300 }) + P('M196,54H252M348,54H404', L(4)) : '') +
      T(U(nm), 300, 136, 64, 'Pagella', { w: 700, ls: 3, cw: 0.72, max: 470 }) +
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
      var x = xs[i], y = 18 + Math.round(10 * Math.sin(Math.PI * (x - 100) / 400)), w = 48, h = 42, z = '', k;
      for (k = 6; k >= 0; k--) z += 'L' + (x - w / 2 + k * w / 6) + ',' + (y + h - (k % 2 ? 8 : 0));
      var cy = y + 20; // cut-outs punched through: a ring with a diamond, two little squares
      flags += '<path fill-rule="evenodd" fill-opacity="' + (i % 2 ? '.9' : '.5') + '" d="M' + (x - w / 2) + ',' + y + 'H' + (x + w / 2) + z + 'Z' +
        'M' + (x - 12) + ',' + cy + 'a12,12 0 1 0 24,0a12,12 0 1 0 -24,0zM' + x + ',' + (cy - 6) + 'l6,6 -6,6 -6,-6z' +
        'M' + (x - 19) + ',' + (y + 5) + 'h6v6h-6zM' + (x + 13) + ',' + (y + 5) + 'h6v6h-6z"/>';
    }
    function tile(cx) {
      return '<rect x="' + (cx - 36) + '" y="164" width="72" height="72" rx="3"' + L(5) + '/>' +
        P('M' + cx + ',170c12,14 12,22 0,30c-12,-8 -12,-16 0,-30zM' + cx + ',230c12,-14 12,-22 0,-30c-12,8 -12,16 0,30zM' + (cx - 30) + ',200c14,-12 22,-12 30,0c-14,12 -22,12 -30,0zM' + (cx + 30) + ',200c-14,-12 -22,-12 -30,0c14,12 22,12 30,0z', ' fill-opacity=".55"') +
        '<circle cx="' + cx + '" cy="200" r="7"/>' + P('M' + (cx - 36) + ',178a14,14 0 0 0 14,-14M' + (cx + 22) + ',164a14,14 0 0 0 14,14M' + (cx - 36) + ',222a14,14 0 0 1 14,14M' + (cx + 22) + ',236a14,14 0 0 1 14,-14', L(4));
    }
    var row = '';
    for (i = 0; i < 9; i++) row += P('M' + (189 + i * 28) + ',346l8,-8 8,8 -8,8z', i % 2 ? ' fill-opacity=".5"' : '');
    return SV + P('M100,18Q300,38 500,18', L(4) + ' stroke-opacity=".6"') + flags +
      T(nm, 300, 148, 84, 'Lilita One', { cw: 0.5, max: 400 }) +
      (suf ? T(U(suf), 300, 316, 56, 'Bungee', { ls: 6, cw: 0.78, max: 380 }) : '') + row +
      tile(78) + tile(522) + '</svg>';
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
      T('RISTORANTE', 300, 94, 22, 'Cinzel', { w: 700, ls: 6, cw: 0.8 }) +
      T(nm, 300, 150, 64, 'Pagella', { w: 700, it: true, cw: 0.5, max: 330 }) +
      P('M90,262H510M90,342H510', L(5)) + P(rack.replace(/M(\d+),262l-30,40 30,40/g, function (s, a) { return +a > 120 ? s : ''; }).replace(/M480,262l30,40 -30,40/, ''), L(5)) + ends +
      P('M40,374H560', L(6)) + '</svg>';
  };

  // ── The Back of Lucky's Diner: the neon over the door, the letter boxes, the checkerboard ──
  SAMPLE.diner = { venue: "The Back of Lucky's Diner", city: 'After closing time', style: 'Back-room game' };
  LOGOS.diner = function (o) {
    var b = brand(o.venue), m = b.match(/^(.+?)\s+(diner)$/i), nm = m ? m[1] : b, word = 'DINER';
    var boxes = '', n = word.length, bw = 62, gap = 10, w = n * bw + (n - 1) * gap, x0 = 300 - w / 2, i;
    for (i = 0; i < n; i++) boxes += '<rect x="' + (x0 + i * (bw + gap)) + '" y="262" width="' + bw + '" height="66" rx="6" fill-opacity=".3" stroke-width="5"/>' + T(word[i], x0 + i * (bw + gap) + bw / 2, 315, 54, 'Sofia Sans Condensed', { w: 900 });
    var chk = '';
    for (i = 0; i < 18; i++) chk += '<rect x="' + (192 + i * 12) + '" y="' + (i % 2 ? 352 : 340) + '" width="12" height="12"/>';
    var neon = T(nm, 300, 142, 104, 'Baloo 2', { w: 700, cw: 0.5, max: 420, attr: ' transform="skewX(-8) translate(20 0)"' });
    return SV + '<g fill="none" stroke-linejoin="round" stroke-width="20" stroke-opacity=".3">' + neon + '</g>' +
      '<g fill="none" stroke-linejoin="round" stroke-width="6">' + neon + '</g>' +
      T('COFFEE & PIE', 300, 40, 22, 'Sofia Sans Condensed', { w: 800, ls: 8, cw: 0.5 }) +
      star(96, 92, 26, 6, 4) + star(504, 104, 20, 5, 4) + star(130, 52, 12, 3, 4) +
      P('M66,186h44v26a22,22 0 0 1 -44,0zM110,192c14,0 14,20 0,20', L(5)) + P('M58,236h60', L(5)) + P('M78,176c-6,-8 6,-12 0,-22M96,176c-6,-8 6,-12 0,-22', L(4) + ' stroke-opacity=".6"') +
      P('M486,236h56M514,236v-8M496,228h36M494,228c0,-40 40,-40 40,0M514,180v-6', L(5)) + P('M500,226l14,-16 14,16z', ' fill-opacity=".5"') +
      boxes + chk + '</svg>';
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
    return SV + T(U(r[0]), 300, 128, 98, 'Sofia Sans Condensed', { w: 900, ls: 4, cw: 0.47, max: 440 }) +
      ring + oar(28) + oar(-28) + tow +
      P(wave(70, 530, 334, 6, 28), L(5)) + P(wave(130, 470, 350, 5, 28), L(4) + ' stroke-opacity=".45"') +
      (r[1] ? T(U(r[1]), 300, 380, 26, 'Sofia Sans', { w: 800, ls: 12, cw: 0.62, max: 320 }) : '') + '</svg>';
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
    return SV + '<defs><mask id="' + id + '"><rect width="600" height="400" fill="#fff"/>' + T(U(r[0]), 300, 316, 40, 'Pagella', { w: 700, ls: 2, cw: 0.7, max: 340, fill: '#000' }) + '</mask></defs>' +
      '<clipPath id="cardroom-c"><rect width="600" height="268"/></clipPath><g clip-path="url(#cardroom-c)">' + P(d, ' fill-opacity=".3"') + P(d, L(5)) + '</g>' + '<circle cx="300" cy="190" r="34" fill-opacity=".5"/><circle cx="300" cy="190" r="34"' + L(4) + '/>' + dots +
      P('M66,290h70v56h-70l18,-28z', ' fill-opacity=".6"') + P('M534,290h-70v56h70l-18,-28z', ' fill-opacity=".6"') + P('M116,330l20,16v-16zM484,330l-20,16v-16z') +
      '<rect x="116" y="274" width="368" height="56" mask="url(#' + id + ')"/>' +
      (r[1] ? T(U(r[1]), 300, 378, 24, 'Pagella', { w: 700, ls: 10, cw: 0.7, max: 300 }) : '') + '</svg>';
  };

  // ── Northside Card Room: upstairs from the sports bar; varsity arch, pennants, sleeve stripes ──
  SAMPLE.cardclub = { venue: 'Northside Card Room', city: 'Upstairs, past the bar', style: 'Freezeout' };
  LOGOS.cardclub = function (o) {
    var r = room(o.venue), id = 'cardclub-a';
    function pennant(x, dir) { return P('M' + x + ',170v60l' + (-78 * dir) + ',-30z', ' fill-opacity=".5"') + P('M' + x + ',170v60l' + (-78 * dir) + ',-30z', L(4)) + star(x - 26 * dir, 200, 12, 5); }
    return SV + arc(id, 300, 700, 590, 250, 290) +
      TP(id, U(r[0]), 96, 'Jersey 10', { cw: 0.5, max: 380, attr: ' fill="none" stroke-width="14" stroke-linejoin="round" stroke-opacity=".35"' }) +
      TP(id, U(r[0]), 96, 'Jersey 10', { cw: 0.5, max: 380 }) +
      pennant(118, 1) + pennant(482, -1) +
      (r[1] ? T(U(r[1]), 300, 312, 44, 'Russo One', { ls: 4, cw: 0.66, max: 360 }) : '') +
      star(118, 296, 13, 5) + star(482, 296, 13, 5) +
      '<rect x="130" y="334" width="340" height="12"/><rect x="160" y="354" width="280" height="8" fill-opacity=".55"/></svg>';
  };

  // ── Harbor Lights Card Room: the old cannery on the docks; the lighthouse throws its beam across the name ──
  SAMPLE.cardharbor = { venue: 'Harbor Lights Card Room', city: 'Down by the river', style: 'Freezeout' };
  LOGOS.cardharbor = function (o) {
    var r = room(o.venue), id = 'cardharbor-c', rope = '', x;
    for (x = 150; x < 540; x += 11) rope += 'M' + x + ',318l7,12';
    return SV + '<defs><clipPath id="' + id + '"><path d="M68,112h32l12,218h-56z"/></clipPath></defs>' +
      P('M100,78L590,28V150L100,96z', ' fill-opacity=".3"') +
      P('M68,112h32l12,218h-56z', ' fill-opacity=".45"') + '<g clip-path="url(#' + id + ')"><rect x="50" y="150" width="70" height="30"/><rect x="50" y="212" width="70" height="30"/><rect x="50" y="274" width="70" height="30"/></g>' +
      P('M68,112h32l12,218h-56z', L(4)) + '<rect x="58" y="102" width="52" height="10" rx="2"/>' +
      '<rect x="70" y="72" width="28" height="30" fill-opacity=".6"/>' + P('M70,72h28v30h-28z', L(4)) + P('M64,72l20,-18 20,18z') + '<circle cx="84" cy="48" r="5"/>' +
      P('M40,330h90', L(6)) +
      T(U(r[0]), 342, 112, 42, 'Bungee', { cw: 0.76, max: 410 }) +
      (r[1] ? T(U(r[1]), 342, 296, 30, 'Sofia Sans', { w: 800, ls: 12, cw: 0.62, max: 340 }) : '') +
      P(rope, ' fill="none" stroke-width="4" stroke-linecap="round"') + '</svg>';
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
      '<defs><mask id="' + id + '"><rect width="600" height="400" fill="#fff"/>' + holes + TP(ap, U(rest), 34, 'Rye', { cw: 0.8, ls: 3, max: 330, fill: '#000' }) + '</mask></defs>' +
      '<path d="' + shoe + '" fill-opacity=".6" mask="url(#' + id + ')"/>' + P(shoe, L(4)) + '<rect x="120" y="30" width="68" height="14" rx="3"/><rect x="412" y="30" width="68" height="14" rx="3"/>' +
      (top ? T(U(top), 300, 132, 62, 'Rye', { cw: 0.78, max: 220 }) : '') +
      star(300, 64, 16, 7) + star(256, 74, 10, 4) + star(344, 74, 10, 4) +
      wheel(64, 304) + wheel(536, 304) + '</svg>';
  };

  // ── Gold Nugget Card Room: the gold-rush hall; an assay bar stamped with the name, pick and shovel crossed below ──
  SAMPLE.cardnugget = { venue: 'Gold Nugget Card Room', city: 'Downtown', style: 'Turbo' };
  LOGOS.cardnugget = function (o) {
    var r = room(o.venue), id = 'cardnugget-m', sub = r[1] ? U(r[1]).split(' ') : [];
    return SV + '<defs><mask id="' + id + '"><rect width="600" height="400" fill="#fff"/>' + T(U(r[0]), 300, 110, 54, 'Sofia Sans Condensed', { w: 900, ls: 3, cw: 0.5, max: 280, fill: '#000' }) + '</mask></defs>' +
      P('M150,30H450L494,140H106Z', ' fill-opacity=".35"') + P('M150,30H450L494,140H106Z', L(5)) +
      P('M172,48H428L458,124H142Z', ' mask="url(#' + id + ')"') + P('M150,30L172,48M450,30L428,48M494,140L458,124M106,140L142,124', L(4)) +
      // pick over shovel, crossed
      P('M248,352L346,262', L(9)) + P('M310,236Q356,234 380,284', L(11)) +
      P('M352,352L262,268', L(9)) + '<path d="M-17,-26h34v24q0,22 -17,32q-17,-10 -17,-32z" transform="translate(252 254) rotate(-47)"/>' + P('M340,362l24,-20', L(7)) +
      (sub.length === 2 ? T(sub[0], 168, 318, 40, 'Rye', { ls: 3, cw: 0.8, max: 140 }) + T(sub[1], 432, 318, 40, 'Rye', { ls: 3, cw: 0.8, max: 140 }) : sub.length ? T(sub.join(' '), 300, 384, 26, 'Rye', { ls: 3, cw: 0.8, max: 300 }) : '') +
      star(168, 348, 8, 3, 4) + star(432, 348, 8, 3, 4) + '</svg>';
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
      T(r[0], 300, 314, 78, 'Pagella', { w: 700, it: true, cw: 0.52, max: 420 }) +
      (r[1] ? P('M150,350H210M390,350H450', L(4)) + T(U(r[1]), 300, 359, 24, 'Sofia Sans', { w: 800, ls: 12, cw: 0.62, max: 170 }) : '') + '</svg>';
  };

  // ── Silver Dollar Card Club: the card club by the track, open all night; the cards land on a big silver dollar ──
  SAMPLE.carddollar = { venue: 'Silver Dollar Card Club', city: 'Out by the racetrack', style: 'Turbo' };
  LOGOS.carddollar = function (o) {
    var r = room(o.venue), a1 = 'carddollar-t', a2 = 'carddollar-b';
    return SV + arc(a1, 300, 198, 140, 200, 340) + arc(a2, 300, 198, 164, 140, 40) +
      '<circle cx="300" cy="198" r="184" fill="none" stroke-width="12" stroke-dasharray="5 6"/>' + '<circle cx="300" cy="198" r="172"' + L(5) + '/>' +
      '<circle cx="300" cy="198" r="114"' + L(4) + ' stroke-opacity=".5"/>' +
      TP(a1, U(r[0]), 36, 'Cinzel', { w: 700, ls: 3, cw: 0.8, max: 330 }) +
      (r[1] ? TP(a2, U(r[1]), 30, 'Cinzel', { w: 700, ls: 4, cw: 0.74, max: 230 }) : '') +
      star(160, 290, 11, 5) + star(440, 290, 11, 5) +
      T('OPEN ALL NIGHT', 300, 282, 20, 'Sofia Sans Condensed', { w: 800, ls: 6, cw: 0.5, op: '.7' }) + '</svg>';
  };

  // ── The Ocean Majesty Card Room: the cruise line's crown over the sea ──
  SAMPLE.cruise = { venue: 'The Ocean Majesty Card Room', city: 'At sea, two days out of Fort Lauderdale', style: 'Freezeout' };
  LOGOS.cruise = function (o) {
    var r = room(String(o.venue).replace(/^the\s+/i, ''));
    function rose(cx) { return star(cx, 200, 40, 9, 4) + '<g fill-opacity=".5">' + '<path d="' + star(cx, 200, 28, 8, 4).replace(/^<path d="|"\/>$/g, '') + '" transform="rotate(45 ' + cx + ' 200)"/></g>' + '<circle cx="' + cx + '" cy="200" r="22"' + L(4) + '/>'; }
    return SV +
      P('M262,62L254,28 276,44 300,20 324,44 346,28 338,62Z') + '<rect x="258" y="66" width="84" height="9" rx="2"/>' +
      '<circle cx="254" cy="24" r="5"/><circle cx="300" cy="15" r="6"/><circle cx="346" cy="24" r="5"/>' +
      P('M140,70H236M364,70H460', L(4)) + '<circle cx="134" cy="70" r="4"/><circle cx="466" cy="70" r="4"/>' +
      T(U(r[0]), 300, 132, 42, 'Cinzel', { w: 700, ls: 6, cw: 0.74, max: 470 }) +
      rose(74) + rose(526) +
      P(wave(150, 450, 272, 7, 30), L(5)) + P(wave(180, 420, 288, 6, 30), L(4) + ' stroke-opacity=".5"') +
      (r[1] ? T(r[1].replace(/\b\w/g, function (c) { return c.toUpperCase(); }), 300, 334, 38, 'Pagella', { w: 700, it: true, cw: 0.5, max: 360 }) : '') +
      T('AT SEA', 300, 366, 18, 'Cinzel', { w: 700, ls: 10, cw: 0.8, op: '.7' }) + '</svg>';
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
  var C = 'currentColor';
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
      (a.op ? ' fill-opacity="' + a.op + '"' : '') + (a.tr ? ' transform="' + a.tr + '"' : '') + ' fill="' + (a.fill || C) + '">' + E(s) + '</text>';
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
    var p = parts(o.venue, 'Rusty Anchor');
    var name = up((p.the ? p.the + ' ' : '') + p.name);
    var s = '<mask id="pub0-m"><rect width="600" height="400" fill="#fff"/>' + T(300, 323, name, 'Lilita One', 46, { max: 352, k: 0.6, ls: 1.5, fill: '#000' }) + '</mask>';
    // anchor (masked out behind the banner so the knocked-out name stays clean)
    s += '<mask id="pub0-a"><rect width="600" height="400" fill="#fff"/><path d="M104 276Q300 262 496 276V340Q300 326 104 340Z" fill="#000"/></mask><g mask="url(#pub0-a)">';
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
      '<path mask="url(#pub0-m)" d="M110 280Q300 266 490 280V336Q300 322 110 336Z"/>';
    s += T(300, 382, p.suf ? up(p.suf) : 'DOCKSIDE', 'Lilita One', 22, { ls: 9, op: 0.8 });
    return svg(s);
  };

  // ── pub1 The Copper Kettle: copperplate script over a hearth kettle steaming under the cards ──
  LOGOS.pub1 = function (o) {
    var p = parts(o.venue, 'Copper Kettle');
    var s = T(300, 116, (p.the ? p.the + ' ' : '') + p.name, 'Great Vibes', 78, { max: 480, k: 0.39 });
    // flourish under the script
    s += '<path d="M150 138C230 128 260 146 300 138C340 130 370 146 450 136" fill="none" stroke="' + C + '" stroke-width="4" stroke-linecap="round" stroke-opacity=".7"/>';
    // kettle
    s += '<path d="M244 352C238 306 262 288 300 288C338 288 362 306 356 352Z"/>' +
      '<rect x="232" y="349" width="136" height="13" rx="6"/>' +
      '<ellipse cx="300" cy="290" rx="26" ry="6"/><circle cx="300" cy="280" r="7"/>' +
      '<path d="M258 304C256 252 344 252 342 304" fill="none" stroke="' + C + '" stroke-width="8" stroke-linecap="round"/>' +
      '<path d="M250 336Q226 330 206 296" fill="none" stroke="' + C + '" stroke-width="12" stroke-linecap="round"/>' +
      '<path d="M198 286C186 270 212 262 198 244M184 290C168 272 192 262 176 246" fill="none" stroke="' + C + '" stroke-width="5" stroke-linecap="round" stroke-opacity=".5"/>';
    // flanking words with rules
    var L = 'PINTS', Rt = p.suf ? up(p.suf) : 'POKER', sz = 26, ls = 5;
    s += T(186, 334, L, 'Cinzel', sz, { w: 700, ls: ls, anchor: 'end' }) + T(380, 334, Rt, 'Cinzel', sz, { w: 700, ls: ls, anchor: 'start' });
    return svg(s);
  };

  // ── pub2 The Brass Tap: a forty-tap craft tower across the top, sign lettering underneath ──
  LOGOS.pub2 = function (o) {
    var p = parts(o.venue, 'Brass Tap');
    var s = '<rect x="86" y="120" width="428" height="16" rx="8"/>';
    var xs = [118, 163, 208, 253, 300, 347, 392, 437, 482], tops = [74, 58, 80, 52, 26, 54, 78, 60, 72];
    xs.forEach(function (x, i) {
      var t = tops[i], kind = i === 4 ? 9 : i % 3;
      s += '<rect x="' + (x - 8) + '" y="112" width="16" height="10" rx="2"/>'; // collar
      if (kind === 9) s += '<path d="M' + (x - 7) + ' 112L' + (x - 14) + ' ' + (t + 22) + 'Q' + x + ' ' + (t - 6) + ' ' + (x + 14) + ' ' + (t + 22) + 'L' + (x + 7) + ' 112Z"/>';
      else if (kind === 0) s += '<rect x="' + (x - 10) + '" y="' + t + '" width="20" height="' + (112 - t) + '" rx="5"/>';
      else if (kind === 1) s += '<rect x="' + (x - 5) + '" y="' + (t + 14) + '" width="10" height="' + (100 - t) + '"/><circle cx="' + x + '" cy="' + (t + 10) + '" r="12"/>';
      else s += '<path d="M' + (x - 5) + ' 112L' + (x - 12) + ' ' + t + 'H' + (x + 12) + 'L' + (x + 5) + ' 112Z"/>';
      s += '<path d="M' + (x - 5) + ' 136V150Q' + (x - 5) + ' 156 ' + (x + 1) + ' 156H' + (x + 5) + 'V136Z" fill-opacity=".7"/>'; // faucet
    });
    s += T(300, 276, up(p.the || ''), 'Bungee', 20, { ls: 10, op: 0.85 });
    s += T(300, 334, up(p.name), 'Bungee', 62, { max: 440, k: 0.64 });
    var line = (p.suf ? up(p.suf) + '  ·  ' : '') + '40 ON TAP';
    s += T(300, 368, line, 'Sofia Sans Condensed', 22, { w: 800, ls: 6, op: 0.85 });
    s += '<path d="M120 358H' + R(300 - W(line, 22, 0.42, 6) / 2 - 14) + 'M' + R(300 + W(line, 22, 0.42, 6) / 2 + 14) + ' 358H480" stroke="' + C + '" stroke-width="4" stroke-opacity=".5"/>';
    return svg(s);
  };

  // ── pub3 The Red Lion: English public-house heraldry, two lions rampant supporting the board ──
  var LION = 'M84 14L88 16L104 24L101 32L92 33L106 37L104 41L96 42L94 46L86 48L88 54L92 52L112 36L118 30L120 36L126 36L121 42L126 46L118 48L110 49L95 64L98 72L112 72L122 70L124 76L130 78L124 84L128 90L118 89L106 90L94 87L82 112L100 126L110 146L120 146L124 152L130 154L124 160L112 162L106 158L98 148L84 140L74 140L72 164L66 178L80 188L86 197L54 197L52 186L56 166L50 140L46 132C18 128 6 104 16 86C24 72 22 62 14 52L6 46L14 44L10 36L20 40L24 32L28 46L26 54C32 64 32 76 24 90C16 104 26 120 48 122L56 90L60 66L60 56L50 58L58 48L46 46L56 40L46 32L58 30L50 20L62 20L60 10L72 14L76 6Z';
  LOGOS.pub3 = function (o) {
    var p = parts(o.venue, 'Red Lion');
    var s = mirror('<path transform="translate(4 140) scale(1.02)" d="' + LION + '"/>');
    // crown
    s += '<path d="M268 52L262 26L280 40L300 20L320 40L338 26L332 52Z"/><rect x="266" y="54" width="68" height="8" rx="3"/>' +
      '<circle cx="262" cy="24" r="5"/><circle cx="300" cy="17" r="5"/><circle cx="338" cy="24" r="5"/>';
    s += T(300, 118, up((p.the ? p.the + ' ' : '') + p.name), 'Pagella', 54, { w: 700, max: 430, k: 0.63, ls: 2 });
    s += '<path d="M120 136H270M330 136H480" stroke="' + C + '" stroke-width="4"/><path d="M300 128l8 8-8 8-8-8z"/>';
    s += T(300, 300, p.suf || 'Public House', 'Pagella', 40, { it: 1, w: 700 });
    s += '<path d="M170 318H430" stroke="' + C + '" stroke-width="4" stroke-opacity=".6"/>';
    s += T(300, 350, 'ALES · DARTS · CARDS', 'Cinzel', 20, { w: 700, ls: 5, op: 0.8 });
    return svg(s);
  };

  // ── pub4 The Black Dog: dive-bar sticker block, hound sprawled under the cards, marker-scrawled tagline ──
  var DOG = 'M0 100L0 92Q2 86 10 86L56 86L60 72Q56 62 50 56L30 54L12 52Q2 50 2 42Q2 34 10 33L30 30Q36 18 46 14Q60 6 72 14Q80 22 80 34Q84 46 96 52Q140 44 176 54Q198 62 200 84Q214 88 232 84L234 90Q216 98 200 96L200 100Z';
  var DOGK = 'M62 16Q80 26 74 52Q64 56 58 48M172 60Q150 72 158 100M62 76Q90 84 120 86';
  LOGOS.pub4 = function (o) {
    var p = parts(o.venue, 'Black Dog');
    var s = '<mask id="pub4-m"><rect width="600" height="400" fill="#fff"/>' +
      T(326, 122, up(p.name), 'Sofia Sans Condensed', 84, { w: 900, max: 296, k: 0.46, ls: 1, fill: '#000' }) +
      (p.the ? T(150, 90, up(p.the), 'Sofia Sans Condensed', 24, { w: 900, ls: 4, fill: '#000', tr: 'rotate(-90 150 90)' }) : '') + '</mask>';
    s += '<rect transform="rotate(-3 300 90)" x="118" y="36" width="364" height="104" rx="6" mask="url(#pub4-m)"/>';
    s += '<mask id="pub4-d"><rect width="600" height="400" fill="#fff"/><g><path d="' + DOGK + '" fill="none" stroke="#000" stroke-width="5" stroke-linecap="round"/><circle cx="40" cy="27" r="4" fill="#000"/></g></mask>';
    s += '<path mask="url(#pub4-d)" transform="translate(176 258)" d="' + DOG + '"/>';
    // the 8-ball the dog is guarding
    s += '<mask id="pub4-b"><rect width="600" height="400" fill="#fff"/><circle cx="446" cy="320" r="11" fill="#000"/></mask>' +
      '<circle cx="452" cy="326" r="24" mask="url(#pub4-b)"/>' + T(446, 326, '8', 'Sofia Sans Condensed', 16, { w: 900 });
    var line = (p.suf ? p.suf.toLowerCase() + '  ·  ' : '') + 'cold beer · pool · jukebox';
    s += T(300, 380, line, 'Patrick Hand', 28, { max: 380, k: 0.36, op: 0.9 });
    return svg(s);
  };

  // ── pub5 The Shamrock: one great shamrock the cards sit on, Irish welcome in script, gilt italic name ──
  LOGOS.pub5 = function (o) {
    var p = parts(o.venue, 'Shamrock');
    var leaf = 'M0 0C-10 -20 -64 -40 -60 -84C-57 -112 -16 -118 0 -92C16 -118 57 -112 60 -84C64 -40 10 -20 0 0Z';
    var s = '<g transform="translate(300 182) scale(1.2)">';
    [0, -116, 116].forEach(function (a) {
      s += '<g transform="rotate(' + a + ')"><path d="' + leaf + '" fill-opacity=".5" stroke="' + C + '" stroke-width="4.5" stroke-linejoin="round"/>' +
        '<path d="M0 -6V-80" stroke="' + C + '" stroke-width="3.5" stroke-linecap="round"/></g>';
    });
    s += '<path d="M0 0C4 20 10 34 22 44" fill="none" stroke="' + C + '" stroke-width="7" stroke-linecap="round"/></g>';
    s += T(146, 80, 'Céad Míle', 'Great Vibes', 38, {}) + T(456, 80, 'Fáilte', 'Great Vibes', 38, {});
    s += T(300, 352, (p.the ? p.the + ' ' : '') + p.name, 'Pagella', 50, { it: 1, w: 700, max: 380, k: 0.53 });
    s += T(300, 382, up(p.suf || 'Irish Pub'), 'Sofia Sans', 20, { w: 800, ls: 9, op: 0.8 });
    return svg(s);
  };

  // ── pub6 The Tin Cup: the golfers' nineteenth hole, a pin flag and the green the cards are dealt on ──
  LOGOS.pub6 = function (o) {
    var p = parts(o.venue, 'Tin Cup');
    var s = '<mask id="pub6-m"><rect width="600" height="400" fill="#fff"/>' + T(532, 76, '19', 'Russo One', 26, { fill: '#000' }) + '</mask>';
    if (p.the) s += T(96, 54, up(p.the), 'Sofia Sans', 22, { w: 800, ls: 8, anchor: 'start', op: 0.85 });
    if (p.suf) s += T(462, 54, up(p.suf), 'Sofia Sans', 22, { w: 800, ls: 8, anchor: 'end', op: 0.85 });
    s += T(92, 132, up(p.name), 'Russo One', 92, { anchor: 'start', max: 380, k: 0.6, ls: 1 });
    // flag on its pin
    s += '<path d="M512 40V340" stroke="' + C + '" stroke-width="6"/><path mask="url(#pub6-m)" d="M512 42Q532 34 556 46V88Q534 78 512 88Z"/>';
    // the green, the cup and the ball
    s += '<ellipse cx="300" cy="318" rx="252" ry="52" fill="none" stroke="' + C + '" stroke-width="6"/>' +
      '<ellipse cx="300" cy="318" rx="234" ry="40" fill="none" stroke="' + C + '" stroke-width="4" stroke-opacity=".4" stroke-dasharray="2 12" stroke-linecap="round"/>' +
      '<ellipse cx="512" cy="340" rx="22" ry="7"/>';
    s += '<circle cx="452" cy="334" r="11"/>';
    s += T(280, 330, 'NINETEENTH HOLE', 'Sofia Sans', 21, { w: 800, ls: 5, op: 0.9 });
    return svg(s);
  };

  // ── pub7 The Iron Horse: railroad saloon, wanted-poster lettering over a steam engine on the rails ──
  LOGOS.pub7 = function (o) {
    var p = parts(o.venue, 'Iron Horse');
    var s = '';
    if (p.the) s += T(300, 50, up(p.the), 'Rye', 22, { ls: 6 }) + '<path d="M196 43H262M338 43H404" stroke="' + C + '" stroke-width="4"/>';
    s += T(300, 112, up(p.name), 'Rye', 64, { max: 450, k: 0.67, ls: 1 });
    s += T(300, 142, (p.suf ? up(p.suf) + '  ·  ' : '') + 'WHISKEY BY THE TRACKS', 'Sofia Sans Condensed', 20, { w: 800, ls: 6, op: 0.85 });
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
    s += T(300, 278, up(p.the || ''), 'Sofia Sans', 20, { w: 800, ls: 10, op: 0.85 });
    s += T(300, 332, up(p.name), 'Baloo 2', 66, { w: 700, max: 440, k: 0.58, ls: 1 });
    var tag = up(p.suf ? p.suf + ' · Ski Bar' : 'Après Ski Bar'), w = W(tag, 19, 0.6, 5);
    s += T(300, 372, tag, 'Sofia Sans', 19, { w: 800, ls: 5, op: 0.85 });
    var l = R(300 - w / 2 - 22), r = R(300 + w / 2 + 18);
    s += '<circle cx="' + R(l - 26) + '" cy="365" r="8"/><rect x="' + R(l - 8) + '" y="358" width="14" height="14"/>' +
      '<path d="M' + (r + 9) + ' 356l9 9-9 9-9-9z"/><path d="M' + (r + 31) + ' 356l9 9-9 9-9-9z"/>';
    return svg(s);
  };

  // ── pub9 The Lucky Penny: the bar's lucky coin, wheat-cent reverse, "In Luck We Trust" ──
  LOGOS.pub9 = function (o) {
    var p = parts(o.venue, 'Lucky Penny');
    var s = '<circle cx="300" cy="200" r="184" fill="none" stroke="' + C + '" stroke-width="8"/>' +
      '<circle cx="300" cy="200" r="172" fill="none" stroke="' + C + '" stroke-width="7" stroke-dasharray="0 13.5" stroke-linecap="round"/>' +
      '<circle cx="300" cy="200" r="160" fill="none" stroke="' + C + '" stroke-width="4" stroke-opacity=".7"/>';
    s += '<path id="pub9-t" d="M168 200A132 132 0 0 1 432 200" fill="none"/><path id="pub9-b" d="M150 200A150 150 0 0 0 450 200" fill="none"/>';
    var top = up((p.the ? p.the + ' ' : '') + p.name), sz = Math.min(40, 340 / (top.length * 0.67 + (top.length - 1) * 0.08));
    s += '<text font-family="Cinzel" font-weight="700" font-size="' + R(sz) + '" letter-spacing="' + R(sz * 0.08) + '" text-anchor="middle"><textPath href="#pub9-t" startOffset="50%">' + E(top) + '</textPath></text>';
    s += '<text font-family="Cinzel" font-weight="700" font-size="19" letter-spacing="3.5" text-anchor="middle" fill-opacity=".85"><textPath href="#pub9-b" startOffset="50%">IN LUCK WE TRUST</textPath></text>';
    // wheat ears
    var ear = '', i;
    for (i = 0; i < 7; i++) {
      var t = 0.3 + i * 0.105, x0 = 190, y0 = 292, cx = 136, cy = 274, x1 = 146, y1 = 196;
      var x = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * cx + t * t * x1, y = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * cy + t * t * y1;
      var dx = 2 * (1 - t) * (cx - x0) + 2 * t * (x1 - cx), dy = 2 * (1 - t) * (cy - y0) + 2 * t * (y1 - cy), a = Math.atan2(dy, dx) * 180 / Math.PI + 90;
      ear += '<ellipse cx="0" cy="-12" rx="6" ry="13" transform="translate(' + R(x) + ' ' + R(y) + ') rotate(' + R(a - 32) + ')"/><ellipse cx="0" cy="-12" rx="6" ry="13" transform="translate(' + R(x) + ' ' + R(y) + ') rotate(' + R(a + 32) + ')"/>';
    }
    ear += '<ellipse cx="148" cy="181" rx="6" ry="14" transform="rotate(8 148 181)"/><path d="M190 292Q136 274 146 196" fill="none" stroke="' + C + '" stroke-width="5" stroke-linecap="round"/>';
    s += mirror(ear);
    s += T(300, 284, up(p.suf || 'One Cent'), 'Cinzel', 32, { w: 700, ls: 3, max: 168, k: 0.69 });
    s += T(300, 132, 'KARAOKE', 'Sofia Sans Condensed', 20, { w: 800, ls: 8, op: 0.75 });
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
      (a.op ? ' fill-opacity="' + a.op + '"' : '') + (max ? fit(raw, size, k, max, ls) : '') + '>' + s + '</text>';
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
    s += '<path d="M240 256H360M268 267H332" ' + W + ' stroke-width="5" stroke-opacity=".55"/>';
    // gulls
    s += '<path d="M136 80q10-10 20 0q10-10 20 0M168 106q7-7 14 0q7-7 14 0" ' + W + ' stroke-width="4.5" stroke-opacity=".8"/>';
    // Biloxi lighthouse (cast-iron cone, lantern, beam over the water)
    s += '<path d="M84 117L156 98V140Z" fill-opacity=".3"/>';
    s += '<path d="M55 302L64 146H84L93 302Z"/><rect x="55" y="136" width="38" height="8" rx="2"/><rect x="47" y="300" width="54" height="9" rx="2"/>';
    s += '<path d="M65 134V114H83V134M74 114V134" ' + W + ' stroke-width="4"/><path d="M61 114Q74 92 87 114Z"/><path d="M74 98V86" ' + W + ' stroke-width="4"/>';
    // palm
    s += '<path d="M538 306Q546 232 516 162" ' + W + ' stroke-width="9"/>';
    s += '<path d="M516 158Q486 132 452 148Q488 140 516 164Z"/><path d="M516 158Q488 160 468 196Q494 168 518 164Z"/>' +
      '<path d="M516 160Q522 124 498 100Q530 122 522 160Z"/><path d="M516 158Q548 130 578 146Q548 142 518 164Z"/><path d="M516 160Q550 162 562 198Q538 170 514 164Z"/>';
    // wordmark
    s += T(300, 322, 58, 'Lilita One', up(first || o.venue), { raw: first || o.venue }, 0.56, 400);
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
    s += '<text font-family="Rye" font-size="44" text-anchor="middle"><textPath href="#reno-a" startOffset="50%"' + fit(o.venue, 44, 0.9, 420) + '>' + up(o.venue) + '</textPath></text>';
    // spur: heel band, strap button, shank, rowel
    s += '<path d="M162 258C168 336 290 344 344 302L336 290C286 322 186 318 180 258Z"/><circle cx="171" cy="257" r="12"/><path d="M171 257L150 246" ' + W + ' stroke-width="8"/>';
    s += '<path d="M336 297L392 305" ' + W + ' stroke-width="10"/><path d="M356 302q6 22-4 30" ' + W + ' stroke-width="4" stroke-opacity=".6"/>';
    s += '<path fill-rule="evenodd" d="M' + star(426, 307, 37, 12, 12).replace(/ /g, 'L') + 'ZM432 307a6 6 0 1 0-12 0a6 6 0 1 0 12 0Z"/>';
    s += T(300, 374, 24, 'Rye', up(o.city) + ' &#183; ' + up(o.style), { raw: o.city + ' . ' + o.style }, 0.8, 300);
    return svg(s);
  };

  // ── Boardwalk Open · Atlantic City: a light-bulb marquee, the pier's Ferris wheel and pilings ──────────────────
  SAMPLE.boardwalk = { venue: 'Boardwalk Open', city: 'Atlantic City', style: 'Deepstack' };
  LOGOS.boardwalk = function (o) {
    var w = words(o.venue), last = w.length > 1 ? w.pop() : '', first = w.join(' '), s = '', x, y, i;
    s += '<rect x="104" y="30" width="392" height="114" rx="12" ' + W + ' stroke-width="5"/>';
    for (x = 118; x <= 483; x += 22.8) s += '<circle cx="' + f(x) + '" cy="43" r="4"/><circle cx="' + f(x) + '" cy="131" r="4"/>';
    for (y = 65; y <= 110; y += 22) s += '<circle cx="118" cy="' + y + '" r="4"/><circle cx="482" cy="' + y + '" r="4"/>';
    s += T(300, 69, 13, 'Bungee', up(o.city) + ' &#183; ' + up(o.style), { ls: 3, raw: o.city + ' . ' + o.style, op: '.8' }, 0.75, 300);
    s += T(300, 117, 46, 'Bungee', up(first || o.venue), { raw: first || o.venue }, 0.74, 330);
    // pier deck and pilings
    s += '<rect x="106" y="338" width="388" height="9" rx="2"/>';
    for (x = 128; x <= 476; x += 29) s += '<path d="M' + x + ' 349V366" ' + W + ' stroke-width="5" stroke-opacity=".6"/>';
    // Ferris wheel
    var cx = 460, cy = 290, r = 46;
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" ' + W + ' stroke-width="5"/><circle cx="' + cx + '" cy="' + cy + '" r="' + (r - 14) + '" ' + W + ' stroke-width="4" stroke-opacity=".5"/>';
    for (i = 0; i < 8; i++) {
      var t = (i * 45 + 22.5) * Math.PI / 180, ex = cx + Math.cos(t) * r, ey = cy + Math.sin(t) * r;
      s += '<path d="M' + cx + ' ' + cy + 'L' + f(ex) + ' ' + f(ey) + '" ' + W + ' stroke-width="4" stroke-opacity=".7"/><rect x="' + f(ex - 6) + '" y="' + f(ey) + '" width="12" height="10" rx="3"/>';
    }
    s += '<path d="M' + cx + ' ' + cy + 'L430 338M' + cx + ' ' + cy + 'L490 338" ' + W + ' stroke-width="6"/><circle cx="' + cx + '" cy="' + cy + '" r="8"/>';
    // striped beach umbrella
    s += '<path d="M150 284V338" ' + W + ' stroke-width="5"/>';
    s += '<path d="M104 292Q150 238 196 292Q184 284 173 292Q161 284 150 292Q139 284 127 292Q116 284 104 292Z" fill-opacity=".35"/>';
    s += '<path d="M127 292Q139 284 150 292L150 256Q136 262 127 292ZM173 292Q161 284 150 292L150 256Q164 262 173 292Z" fill-opacity="0"/>';
    s += '<path d="M104 292Q116 284 127 292Q132 262 150 252Q120 256 104 292ZM150 292Q161 284 173 292Q168 262 150 252Z"/>';
    if (last) s += T(300, 324, 52, 'Bungee', up(last), { raw: last }, 0.74, 200);
    return svg(s);
  };

  // ── Lakeshore Open · Chicago: the city flag's two blue stripes and six-point stars, the skyline on the lake ────
  SAMPLE.chicago = { venue: 'Lakeshore Open', city: 'Chicago', style: 'Freezeout' };
  LOGOS.chicago = function (o) {
    var s = '';
    s += T(300, 98, 60, 'Sofia Sans Condensed', up(o.venue), { w: 900, ls: 3, raw: o.venue }, 0.5, 450);
    s += T(300, 126, 18, 'Sofia Sans Condensed', up(o.city) + ' &#183; ' + up(o.style), { w: 700, ls: 9, raw: o.city + ' . ' + o.style, op: '.85' }, 0.5, 300);
    s += '<rect x="64" y="137" width="472" height="11"/><rect x="92" y="340" width="416" height="11"/>';
    [46, 98, 502, 554].forEach(function (x) { s += '<polygon points="' + star(x, 200, 24, 10.5, 6) + '"/>'; });
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
    s += '<path d="M300 36V12" ' + W + ' stroke-width="4"/><path d="M302 12L324 18L302 25Z"/>';
    function pine(x, top, bot, wd) { var hgt = bot - top, q = '', k; for (k = 0; k < 3; k++) { var ty = top + k * hgt * 0.24, by = top + hgt * (0.36 + k * 0.24), hw = wd * (0.5 + k * 0.25); q += 'M' + x + ' ' + f(ty) + 'L' + f(x + hw) + ' ' + f(by) + 'H' + f(x - hw) + 'Z'; } return '<path d="' + q + 'M' + (x - 3) + ' ' + f(top + hgt * 0.84) + 'h6V' + bot + 'h-6Z"/>'; }
    s += pine(62, 158, 262, 34) + pine(98, 192, 262, 24) + pine(538, 158, 262, 34) + pine(502, 192, 262, 24);
    s += '<path d="M40 266H560" ' + W + ' stroke-width="4" stroke-opacity=".5"/>';
    s += '<path d="M200 279H400M236 290H364" ' + W + ' stroke-width="4" stroke-opacity=".45"/>';
    s += T(300, 336, 44, 'Sofia Sans', up(o.venue), { w: 800, ls: 7, raw: o.venue }, 0.64, 420);
    var el = /tahoe/i.test(o.city + o.venue) ? ' &#183; ELEV. 6,225 FT' : '';   // the lake's surface elevation
    s += T(300, 364, 15, 'Sofia Sans', up(o.city) + el + ' &#183; ' + up(o.style), { w: 700, ls: 4, raw: o.city + (el ? ' . ELEV. 6,225 FT' : '') + ' . ' + o.style, op: '.85' }, 0.6, 400);
    return svg(s);
  };

  // ── Grand Prix de Paris: the Eiffel Tower standing through the board, script name either side, sparkles ──────
  SAMPLE.paris = { venue: 'Grand Prix de Paris', city: 'Paris', style: 'Freezeout' };
  LOGOS.paris = function (o) {
    var v = String(o.venue), m = v.match(/^(.*?)\s+((?:de|of|du)\s+.*)$/i), head = m ? m[1] : v, tail = m ? m[2] : o.city;
    var hw = words(head), left = hw.length > 1 ? hw.slice(0, Math.ceil(hw.length / 2)).join(' ') : head, right = hw.length > 1 ? hw.slice(Math.ceil(hw.length / 2)).join(' ') : '';
    var L = [['M', -3, 40], ['L', -7, 52], ['Q', -10, 100, -24, 134], ['L', -36, 134], ['L', -36, 146], ['L', -27, 146], ['Q', -36, 212, -60, 250], ['L', -78, 250], ['L', -78, 264], ['L', -64, 264],
      ['Q', -84, 316, -126, 342], ['L', -88, 342], ['Q', -62, 290, 0, 288]];
    var d = '', i, c;
    L.forEach(function (q) { d += q[0] + q.slice(1).map(function (n, j) { return j % 2 ? n : 300 + n; }).join(' '); });
    for (i = L.length - 1; i > 0; i--) {                    // mirror back up the right side
      c = L[i]; var prev = L[i - 1], ex = 600 - (300 + prev[prev.length - 2]), ey = prev[prev.length - 1];
      d += c[0] === 'Q' ? 'Q' + (600 - (300 + c[1])) + ' ' + c[2] + ' ' + ex + ' ' + ey : 'L' + ex + ' ' + ey;
    }
    var s = '<path d="' + d + 'Z"/>';
    s += '<path d="M300 40V16" ' + W + ' stroke-width="4"/><path d="M262 140H338M226 258H374" ' + W + ' stroke-width="4" stroke-opacity=".6"/>';
    s += '<path d="M138 344H462" ' + W + ' stroke-width="4" stroke-opacity=".55"/>';
    [[244, 46, 10], [356, 70, 8], [252, 96, 7], [340, 30, 6]].forEach(function (q) { s += '<polygon points="' + star(q[0], q[1], q[2], q[2] * 0.28, 4) + '" fill-opacity=".8"/>'; });
    if (right) {
      s += T(170, 130, 74, 'Great Vibes', E(left), { raw: left }, 0.42, 190) + T(432, 130, 74, 'Great Vibes', E(right), { raw: right }, 0.42, 170);
    } else s += T(300, 120, 74, 'Great Vibes', E(left), { raw: left }, 0.42, 420);
    s += T(300, 380, 26, 'Sofia Sans Condensed', up(tail), { w: 700, ls: 14, raw: tail }, 0.5, 300);
    s += T(126, 300, 15, 'Sofia Sans Condensed', up(o.style), { w: 700, ls: 5, raw: o.style, op: '.8' }, 0.5, 110);
    s += T(474, 300, 15, 'Sofia Sans Condensed', up(o.city), { w: 700, ls: 5, raw: o.city, op: '.8' }, 0.5, 110);
    return svg(s);
  };

  // ── Riviera High Roller · Monte Carlo: a crowned shield in the Grimaldi lozenges, the name on a ribbon ────────
  SAMPLE.monaco = { venue: 'Riviera High Roller', city: 'Monte Carlo', style: 'High Roller' };
  LOGOS.monaco = function (o) {
    var shield = 'M206 74H394V214Q394 296 300 338Q206 296 206 214Z', band = 'M120 302Q300 338 480 302V352Q300 388 120 352Z', s = '', i, j;
    s += '<defs><clipPath id="monaco-c"><path d="' + shield + '"/></clipPath><mask id="monaco-m" maskUnits="userSpaceOnUse" x="0" y="0" width="600" height="400">' +
      '<rect width="600" height="400" fill="#fff"/><path d="M110 292Q300 328 490 292V362Q300 398 110 362Z" fill="#000"/></mask>' +
      '<path id="monaco-t" d="M128 338Q300 372 472 338"/></defs>';
    var lz = '';
    for (j = 0; j < 7; j++) for (i = 0; i < 6; i++) { var x = 206 + i * 38, y = 74 + j * 50; lz += 'M' + x + ' ' + (y - 25) + 'L' + (x + 19) + ' ' + y + 'L' + x + ' ' + (y + 25) + 'L' + (x - 19) + ' ' + y + 'Z'; }
    s += '<g mask="url(#monaco-m)"><path clip-path="url(#monaco-c)" d="' + lz + '" fill-opacity=".5"/><path d="' + shield + '" ' + W + ' stroke-width="7"/></g>';
    // crown
    s += '<path d="M260 64L254 30L278 46L300 20L322 46L346 30L340 64Z"/><rect x="258" y="62" width="84" height="8" rx="2"/>';
    s += '<circle cx="254" cy="26" r="5"/><circle cx="300" cy="15" r="6"/><circle cx="346" cy="26" r="5"/>';
    // ribbon: tails behind, band in front
    s += '<path d="M90 318H126V368H90L104 343Z" fill-opacity=".45"/><path d="M510 318H474V368H510L496 343Z" fill-opacity=".45"/>';
    s += '<path d="' + band + '" ' + W + ' stroke-width="5"/>';
    s += '<text font-family="Pagella" font-weight="700" font-size="32" text-anchor="middle" letter-spacing="3"><textPath href="#monaco-t" startOffset="50%"' + fit(o.venue, 32, 0.72, 330, 3) + '>' + up(o.venue) + '</textPath></text>';
    var cw = words(o.city), a = cw.length > 1 ? cw[0] : o.city, b = cw.length > 1 ? cw.slice(1).join(' ') : o.style;
    s += T(126, 124, 25, 'Pagella', up(a), { w: 700, ls: 6, raw: a }, 0.72, 140) + T(474, 124, 25, 'Pagella', up(b), { w: 700, ls: 6, raw: b }, 0.72, 140);
    s += '<path d="M86 138H166M434 138H514" ' + W + ' stroke-width="4" stroke-opacity=".55"/>';
    s += '<polygon points="126,82 134,92 126,102 118,92"/><polygon points="474,82 482,92 474,102 466,92"/>';
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
    // cloud scrolls at the lower left
    s += '<path d="M44 236H120Q134 236 132 224Q130 212 116 214Q116 198 98 198Q84 198 80 210Q74 202 64 206Q54 212 60 222Q46 220 44 230M98 220a8 8 0 1 0-12-6" ' + W + ' stroke-width="5" stroke-opacity=".7"/>';
    s += '<path d="M78 300H140Q152 300 150 290Q148 280 136 282Q134 268 118 270Q104 272 104 284Q92 280 88 290" ' + W + ' stroke-width="5" stroke-opacity=".5"/>';
    s += T(300, 338, 54, 'Russo One', up(o.venue), { ls: 3, raw: o.venue }, 0.66, 330);
    s += T(300, 366, 17, 'Russo One', up(o.city) + ' &#183; ' + up(o.style), { ls: 7, raw: o.city + ' . ' + o.style, op: '.85' }, 0.65, 300);
    return svg(s);
  };

  // ── Champions Invitational · Las Vegas: an Art Deco card, three champion stars, stepped Strip-tower pylons ──────
  SAMPLE.vegasvip = { venue: 'Champions Invitational', city: 'Las Vegas', style: 'High Roller' };
  LOGOS.vegasvip = function (o) {
    var w = words(o.venue), first = w.length > 1 ? w[0] : o.venue, rest = w.length > 1 ? w.slice(1).join(' ') : '', s = '';
    s += '<path d="M132 34H468L536 102V298L468 366H132L64 298V102Z" ' + W + ' stroke-width="5"/>';
    s += '<path d="M138 48H462L522 108V292L462 352H138L78 292V108Z" ' + W + ' stroke-width="4" stroke-opacity=".45"/>';
    // corner fans
    [[132, 34, 1, 1], [468, 34, -1, 1], [132, 366, 1, -1], [468, 366, -1, -1]].forEach(function (c) { s += '<path d="M' + (c[0] - c[2] * 54) + ' ' + (c[1] + c[3] * 54) + 'L' + (c[0] - c[2] * 40) + ' ' + (c[1] + c[3] * 40) + '" ' + W + ' stroke-width="4" stroke-opacity=".7"/>'; });
    // stepped pylons either side of the board
    [[92, 1], [508, -1]].forEach(function (p) { var x = p[0], d = p[1]; s += '<path d="M' + x + ' 140V260M' + (x + d * 14) + ' 158V242M' + (x + d * 28) + ' 178V222" ' + W + ' stroke-width="7"/>'; });
    s += '<polygon points="' + star(300, 62, 15, 6, 5) + '"/><polygon points="' + star(266, 68, 10, 4, 5) + '" fill-opacity=".7"/><polygon points="' + star(334, 68, 10, 4, 5) + '" fill-opacity=".7"/>';
    s += '<path d="M190 66H246M354 66H410" ' + W + ' stroke-width="4" stroke-opacity=".55"/>';
    s += T(300, 132, 58, 'Sofia Sans Condensed', up(first), { w: 800, ls: 10, raw: first }, 0.52, 360);
    if (rest) s += T(300, 300, 50, 'Pagella', E(rest), { w: 700, it: 1, raw: rest }, 0.48, 330);
    s += '<path d="M150 320H272M328 320H450" ' + W + ' stroke-width="4" stroke-opacity=".6"/><polygon points="300,312 308,320 300,328 292,320"/>';
    s += T(300, 344, 14, 'Sofia Sans Condensed', 'BY INVITATION ONLY &#183; ' + up(o.city), { w: 700, ls: 5, raw: 'BY INVITATION ONLY . ' + o.city, op: '.85' }, 0.5, 330);
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
    if (first) s += T(300, 104, 34, 'Cinzel', up(first), { w: 700, ls: 16, raw: first }, 0.82, 300);
    s += T(300, 146, 44, 'Cinzel', up(last), { w: 700, ls: 2, raw: last }, 0.8, 380);
    s += T(300, 292, 34, 'Cinzel', up(o.style), { w: 700, ls: 8, raw: o.style }, 0.8, 300);
    s += '<path d="M104 282H142M458 282H496" ' + W + ' stroke-width="4" stroke-opacity=".6"/>';
    s += T(300, 320, 17, 'Sofia Sans Condensed', '$10,000 &#183; NO-LIMIT HOLD&#8217;EM', { w: 700, ls: 6, raw: '$10,000 . NO-LIMIT HOLDEM' }, 0.5, 300);
    s += T(300, 346, 15, 'Cinzel', up(o.city), { w: 700, ls: 8, raw: o.city, op: '.85' }, 0.8, 200);
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
  function T(x, y, s, font, size, o) {
    o = o || {};
    return '<text x="' + x + '" y="' + y + '" text-anchor="middle" font-family="\'' + font + '\'" font-size="' + size + '"' +
      (o.w ? ' font-weight="' + o.w + '"' : '') + (o.it ? ' font-style="italic"' : '') + (o.ls ? ' letter-spacing="' + o.ls + '"' : '') +
      (o.op ? ' fill-opacity="' + o.op + '"' : '') + (o.sw ? ' stroke="currentColor" stroke-width="' + o.sw + '" stroke-linejoin="round"' : '') +
      (o.max ? fit(s, size, o.max, o.k || 0.6, o.ls) : '') + '>' + E(s) + '</text>';
  }
  function SK(w, extra) { return ' fill="none" stroke="currentColor" stroke-width="' + w + '" stroke-linecap="round" stroke-linejoin="round"' + (extra || ''); }
  function line(x1, y1, x2, y2, w) { return '<path d="M' + x1 + ',' + y1 + 'L' + x2 + ',' + y2 + '"' + SK(w) + '/>'; }

  // ───────────── Bayou Classic · New Orleans: fleur-de-lis and French Quarter balcony ironwork
  SAMPLE.bayou = { venue: 'Bayou Classic', city: 'New Orleans', style: 'Deepstack' };
  LOGOS.bayou = function (o) {
    var fl = '<path d="M0,-62C14,-48 22,-28 16,-8C12,4 6,10 5,16L-5,16C-6,10 -12,4 -16,-8C-22,-28 -14,-48 0,-62Z"/>' +
      '<rect x="-25" y="14" width="50" height="12" rx="3"/><path d="M-6,26L6,26C6,38 4,46 0,58C-4,46 -6,38 -6,26Z"/>';
    var half = '<path d="M7,14C10,-6 26,-30 44,-28C58,-26 61,-8 51,0C44,6 35,2 37,-6C38,-12 32,-15 27,-8C21,0 17,10 15,16Z"/>' +
      '<path d="M9,26C18,29 28,36 30,50C25,43 17,41 10,41C10,35 9,30 9,26Z"/>';
    function fleur(x, y, s) { return '<g transform="translate(' + x + ',' + y + ') scale(' + s + ')">' + fl + half + '<g transform="scale(-1,1)">' + half + '</g></g>'; }
    var rail = '';
    rail += line(118, 282, 482, 282, 7) + line(118, 336, 482, 336, 6);
    for (var x = 158; x < 450; x += 41) rail += line(x, 282, x, 336, 4);
    for (var i = 0; i < 9; i++) {
      var a = 118 + i * 41 - (i ? 0 : 0), b = a + 40, m = (a + b) / 2;
      if (i === 0) { a = 118; } if (b > 482) b = 482; m = (a + b) / 2;
      rail += '<circle cx="' + m + '" cy="309" r="11"' + SK(4) + '/>' + '<path d="M' + a + ',336Q' + m + ',358 ' + b + ',336"' + SK(4) + '/>';
    }
    rail += '<rect x="106" y="268" width="14" height="82" rx="3"/><rect x="480" y="268" width="14" height="82" rx="3"/>' +
      '<circle cx="113" cy="262" r="8"/><circle cx="487" cy="262" r="8"/>';
    return OPEN +
      line(128, 40, 178, 40, 4) + line(422, 40, 472, 40, 4) +
      T(300, 47, String(o.city || 'New Orleans').toUpperCase(), 'Cinzel', 21, { ls: 7, max: 230, k: 0.78 }) +
      T(300, 124, o.venue, 'Pagella', 66, { w: 700, it: 1, max: 470, k: 0.5 }) +
      fleur(66, 196, 1.25) + fleur(534, 196, 1.25) + rail +
      T(300, 386, String(o.style || 'Deepstack').toUpperCase(), 'Cinzel', 18, { ls: 10, op: 0.8, max: 260, k: 0.78 }) + CLOSE;
  };

  // ───────────── Mile High Bounty · Black Hawk: Rockies, mine headframe, crossed picks, plank sign
  SAMPLE.minetown = { venue: 'Mile High Bounty', city: 'Black Hawk', style: 'Bounty' };
  LOGOS.minetown = function (o) {
    var n = headTail(o.venue), top = n[0] || n[1], low = n[0] ? n[1] : '';
    var mt = 'M18,92L70,54L96,68L150,22L190,58L222,42L262,70L300,10L338,60L372,38L404,62L452,26L500,66L530,52L582,92';
    function snow(x, y) { return '<path d="M' + x + ',' + y + 'L' + (x + 14) + ',' + (y + 18) + 'L' + (x + 6) + ',' + (y + 15) + 'L' + x + ',' + (y + 24) + 'L' + (x - 7) + ',' + (y + 15) + 'L' + (x - 13) + ',' + (y + 17) + 'Z"/>'; }
    var head = '<g>' + line(46, 332, 64, 180, 6) + line(96, 332, 78, 180, 6) + line(124, 332, 86, 196, 5) +
      line(52, 290, 90, 290, 4) + line(57, 248, 85, 248, 4) + line(61, 212, 81, 212, 4) +
      line(52, 290, 85, 248, 4) + line(90, 290, 57, 248, 4) + line(57, 248, 81, 212, 4) + line(85, 248, 61, 212, 4) +
      line(56, 180, 88, 180, 6) + '<circle cx="72" cy="160" r="17"' + SK(5) + '/><circle cx="72" cy="160" r="4"/>' +
      line(72, 145, 72, 175, 4) + line(57, 160, 87, 160, 4) + line(30, 334, 136, 334, 5) + '</g>';
    var pickHalf = line(-38, 42, 33, -33, 8) + '<path d="M2,-70Q58,-58 70,-2Q44,-30 2,-70Z"' + SK(3) + ' fill="currentColor"/><circle cx="36" cy="-36" r="8"/>';
    var picks = '<g transform="translate(530,248) scale(.72)">' + pickHalf + '<g transform="scale(-1,1)">' + pickHalf + '</g></g>';
    var board = '<path d="M166,262L434,257L438,331L162,336Z"' + SK(6) + '/>' + line(186, 276, 250, 275, 4) + line(360, 322, 416, 321, 4) +
      '<circle cx="180" cy="272" r="5"/><circle cx="420" cy="269" r="5"/><circle cx="423" cy="320" r="5"/><circle cx="178" cy="324" r="5"/>';
    return OPEN +
      '<path d="' + mt + 'Z" fill-opacity=".3"/><path d="' + mt + '"' + SK(6) + '/>' + snow(150, 22) + snow(300, 10) + snow(452, 26) +
      T(300, 138, top, 'Rye', 52, { max: 470, k: 0.74 }) + head + picks + board +
      (low ? T(300, 313, low.toUpperCase(), 'Rye', 46, { max: 236, k: 0.8 }) : '') +
      T(300, 368, (String(o.city || 'Black Hawk') + ' · Colorado').toUpperCase(), 'Sofia Sans Condensed', 21, { w: 800, ls: 5, max: 340, k: 0.5 }) + CLOSE;
  };

  // ───────────── Pinewood Open · Connecticut: resort lights in a moonlit New England pine forest
  SAMPLE.pinewood = { venue: 'Pinewood Open', city: 'Connecticut', style: 'Deepstack' };
  LOGOS.pinewood = function (o) {
    function pine(x, h, op) {
      var b = 364, w = h * 0.52, P = function (dx, f) { return r1(x + w * dx) + ',' + r1(b - h * f); };
      return '<path d="M' + P(0, 1) + 'L' + P(.26, .72) + 'L' + P(.13, .72) + 'L' + P(.4, .42) + 'L' + P(.22, .42) + 'L' + P(.5, .13) + 'L' + P(.07, .13) + 'L' + P(.07, 0) +
        'L' + P(-.07, 0) + 'L' + P(-.07, .13) + 'L' + P(-.5, .13) + 'L' + P(-.22, .42) + 'L' + P(-.4, .42) + 'L' + P(-.13, .72) + 'L' + P(-.26, .72) + 'Z"' + (op ? ' fill-opacity="' + op + '"' : '') + '/>';
    }
    var back = [[52, 175], [132, 118], [204, 84], [278, 74], [326, 78], [398, 86], [470, 120], [548, 172]], front = [[30, 225], [74, 192], [108, 140], [152, 96], [186, 70], [222, 88], [256, 62], [300, 108], [344, 64], [380, 88], [414, 72], [450, 98], [494, 142], [528, 196], [570, 222]];
    var trees = '';
    back.forEach(function (t) { trees += pine(t[0], t[1], 0.4); });
    front.forEach(function (t) { trees += pine(t[0], t[1]); });
    return OPEN +
      line(150, 40, 190, 40, 4) + line(410, 40, 450, 40, 4) +
      T(300, 47, String(o.city || 'Connecticut').toUpperCase(), 'Sofia Sans', 19, { w: 800, ls: 7, max: 200, k: 0.62 }) +
      T(300, 118, o.venue, 'Lilita One', 66, { max: 470, k: 0.52 }) +
      trees + '<rect x="20" y="338" width="560" height="28" rx="3"/>' +
      T(300, 391, String(o.style || 'Deepstack').toUpperCase(), 'Sofia Sans', 15, { w: 800, ls: 10, op: 0.85, max: 220, k: 0.62 }) + CLOSE;
  };

  // ───────────── Twin Cities Open · Minneapolis: Stone Arch Bridge over the Mississippi, twin freezeout snowflakes
  SAMPLE.twincities = { venue: 'Twin Cities Open', city: 'Minneapolis', style: 'Freezeout' };
  LOGOS.twincities = function (o) {
    var n = headTail(o.venue), big = n[0] || n[1], small = n[0] ? n[1] : '';
    var x0 = 70, x1 = 530, pier = 14, k = 8, aw = (x1 - x0 - (k + 1) * pier) / k, rr = aw / 2, d = 'M' + x0 + ',60L' + x1 + ',60L' + x1 + ',128L' + x0 + ',128Z';
    for (var i = 0; i < k; i++) { var a = x0 + pier + i * (aw + pier), b = a + aw; d += 'M' + r1(a) + ',128L' + r1(a) + ',106A' + r1(rr) + ',' + r1(rr) + ' 0 0 1 ' + r1(b) + ',106L' + r1(b) + ',128Z'; }
    function flake(cx, cy, r) {
      var s = '';
      for (var j = 0; j < 6; j++) {
        var an = (j * 60 - 90) * Math.PI / 180, c = Math.cos(an), sn = Math.sin(an), tip = [cx + c * r, cy + sn * r], m = [cx + c * r * .55, cy + sn * r * .55];
        s += line(cx, cy, r1(tip[0]), r1(tip[1]), 6);
        [-1, 1].forEach(function (sg) { var ba = an + sg * 0.75; s += line(r1(m[0]), r1(m[1]), r1(m[0] + Math.cos(ba) * r * .34), r1(m[1] + Math.sin(ba) * r * .34), 5); });
      }
      return s + '<circle cx="' + cx + '" cy="' + cy + '" r="7"/>';
    }
    return OPEN +
      T(300, 42, (String(o.city || 'Minneapolis') + ' · Minnesota').toUpperCase(), 'Sofia Sans Condensed', 21, { w: 800, ls: 6, max: 360, k: 0.5 }) +
      '<path d="' + d + '" fill-rule="evenodd"/>' +
      '<path d="M80,143q20,-9 40,0t40,0t40,0t40,0t40,0t40,0t40,0t40,0t40,0t40,0t40,0"' + SK(4) + ' stroke-opacity=".7"/>' +
      flake(68, 205, 44) + flake(532, 205, 44) +
      T(300, 304, big.toUpperCase(), 'Russo One', 56, { ls: 2, max: 440, k: 0.7 }) +
      (small ? line(160, 333, 228, 333, 5) + line(372, 333, 440, 333, 5) + T(306, 344, small.toUpperCase(), 'Russo One', 30, { ls: 12, max: 130, k: 0.72 }) : '') +
      T(300, 382, String(o.style || 'Freezeout').toUpperCase(), 'Sofia Sans Condensed', 17, { w: 800, ls: 9, op: 0.75, max: 220, k: 0.5 }) + CLOSE;
  };

  // ───────────── Desert Springs Bounty · Palm Springs: mid-century sign, palms, atomic stars, kidney pool
  SAMPLE.palmsprings = { venue: 'Desert Springs Bounty', city: 'Palm Springs', style: 'Bounty' };
  LOGOS.palmsprings = function (o) {
    var n = headTail(o.venue), top = n[0] || n[1], pool = n[0] ? n[1] : '';
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
      T(300, 42, (String(o.city || 'Palm Springs') + ' · California').toUpperCase(), 'Sofia Sans', 17, { w: 800, ls: 6, max: 330, k: 0.62 }) +
      T(300, 112, top, 'Baloo 2', 62, { max: 460, k: 0.5 }) +
      '<path d="M150,127Q300,150 462,121L458,131Q300,162 146,137Z"/>' +
      palm('86,374', '66,280', [98, 180], [-172, -140, -108, -72, -38, -6, 22], 78) +
      palm('516,374', '540,290', [504, 196], [-178, -146, -112, -76, -42, -10, 18], 72) +
      star(552, 96, 20) + star(70, 96, 14) + star(470, 52, 11) +
      '<path d="M166,312C158,276 230,266 280,286C320,302 360,264 412,280C454,292 448,350 400,358C340,368 300,352 250,358C198,364 172,346 166,312Z"' + SK(6) + '/>' +
      (pool ? T(304, 338, pool, 'Great Vibes', 64, { sw: 1.6, max: 230, k: 0.42 }) : '') + CLOSE;
  };

  // ───────────── London Masters · London: crown, Elizabeth Tower and its clock dial, engraved club caps
  SAMPLE.london = { venue: 'London Masters', city: 'London', style: 'Freezeout' };
  LOGOS.london = function (o) {
    var n = headTail(o.venue), top = n[0] || n[1], low = n[0] ? n[1] : '';
    var tw = '<path d="M60,182L96,182L96,346L60,346Z"' + SK(5) + ' fill="currentColor" fill-opacity=".3"/>' + line(72, 196, 72, 336, 4) + line(84, 196, 84, 336, 4) +
      '<path d="M54,128L102,128L102,182L54,182Z"' + SK(5) + '/><circle cx="78" cy="155" r="17"' + SK(5) + '/>' + line(78, 155, 78, 143, 4) + line(78, 155, 86, 151, 4) +
      '<path d="M60,100L96,100L96,128L60,128Z"' + SK(5) + '/>' + line(70, 106, 70, 124, 5) + line(78, 106, 78, 124, 5) + line(86, 106, 86, 124, 5) +
      '<path d="M54,100L102,100L90,80L78,52L66,80Z"/>' + line(78, 52, 78, 40, 4) +
      '<path d="M52,128L52,116M104,128L104,116M58,100L58,90M98,100L98,90"' + SK(5) + '/>';
    var dial = '<circle cx="524" cy="200" r="54"' + SK(6) + '/><circle cx="524" cy="200" r="40"' + SK(4) + '/>';
    for (var i = 0; i < 12; i++) { var an = i * Math.PI / 6, c = Math.sin(an), s = -Math.cos(an), r0 = i % 3 ? 30 : 25; dial += line(r1(524 + c * r0), r1(200 + s * r0), r1(524 + c * 37), r1(200 + s * 37), 5); }
    dial += line(524, 200, 521, 176, 6) + line(524, 200, 505, 175, 4) + '<circle cx="524" cy="200" r="5"/>';
    var crown = '<path d="M266,62L334,62L334,52L266,52Z"/><path d="M266,50L259,22L279,36L290,16L300,32L310,16L321,36L341,22L334,50Z"/>' +
      '<circle cx="259" cy="20" r="4.5"/><circle cx="290" cy="14" r="4.5"/><circle cx="310" cy="14" r="4.5"/><circle cx="341" cy="20" r="4.5"/>';
    return OPEN + crown + line(166, 46, 244, 46, 4) + line(356, 46, 434, 46, 4) +
      T(304, 128, top.toUpperCase(), 'Cinzel', 60, { w: 700, ls: 10, max: 330, k: 0.78 }) +
      (low ? T(303, 310, low.toUpperCase(), 'Cinzel', 56, { w: 700, ls: 6, max: 330, k: 0.78 }) : '') +
      line(196, 332, 404, 332, 4) + '<path d="M300,323L310,332L300,341L290,332Z"/>' +
      T(300, 368, String(o.style || 'Freezeout'), 'Pagella', 24, { it: 1, ls: 4, max: 220, k: 0.5 }) + tw + dial + CLOSE;
  };

  // ───────────── Danube High Roller · Vienna: ballroom chandelier, Secession checker pylons, the Danube
  SAMPLE.vienna = { venue: 'Danube High Roller', city: 'Vienna', style: 'High Roller' };
  LOGOS.vienna = function (o) {
    var n = firstRest(o.venue);
    var ch = line(300, 0, 300, 24, 5) + '<circle cx="300" cy="28" r="6"/>' + line(300, 30, 300, 96, 6) + '<ellipse cx="300" cy="60" rx="11" ry="15"/>' +
      '<path d="M300,104Q284,112 300,130Q316,112 300,104Z"/>';
    [-96, -50, 50, 96].forEach(function (dx) {
      var x = 300 + dx;
      ch += '<path d="M300,94C' + (300 + dx * .3) + ',122 ' + (300 + dx * .92) + ',114 ' + x + ',82"' + SK(5) + '/>' +
        '<rect x="' + (x - 9) + '" y="76" width="18" height="7" rx="2"/><rect x="' + (x - 3.5) + '" y="54" width="7" height="22"/>' +
        '<path d="M' + x + ',36Q' + (x + 6) + ',46 ' + x + ',50Q' + (x - 6) + ',46 ' + x + ',36Z"/>' +
        '<path d="M' + (300 + dx * .62) + ',112Q' + (300 + dx * .62 + 5) + ',120 ' + (300 + dx * .62) + ',128Q' + (300 + dx * .62 - 5) + ',120 ' + (300 + dx * .62) + ',112Z"/>';
    });
    ch += '<path d="M204,84Q252,112 300,100Q348,112 396,84"' + SK(4) + '/>';
    function pylon(x0) {
      var s = line(x0, 122, x0, 300, 5) + line(x0 + 50, 122, x0 + 50, 300, 5) + '<circle cx="' + (x0 + 25) + '" cy="108" r="11"/>' + line(x0 - 4, 306, x0 + 54, 306, 6);
      for (var r = 0; r < 10; r++) for (var c = 0; c < 3; c++) s += '<rect x="' + (x0 + 7 + c * 13) + '" y="' + (130 + r * 16.5) + '" width="10" height="10"' + ((r + c) % 2 ? ' fill-opacity=".35"' : '') + '/>';
      return s;
    }
    return OPEN + ch + pylon(44) + pylon(506) +
      T(308, 300, n[0].toUpperCase(), 'Pagella', 64, { w: 700, ls: 16, max: 380, k: 0.74 }) +
      '<path d="M170,326q22,-12 44,0t44,0t44,0t44,0t44,0t44,0"' + SK(5) + '/>' +
      T(300, 366, ((n[1] ? n[1] + ' · ' : '') + 'Wien').toUpperCase(), 'Sofia Sans', 20, { w: 700, ls: 7, max: 330, k: 0.62 }) + CLOSE;
  };

  // ───────────── Marina Bay Cup · Singapore: three towers carrying the SkyPark, Supertree Grove at the sides
  SAMPLE.singapore = { venue: 'Marina Bay Cup', city: 'Singapore', style: 'Deepstack' };
  LOGOS.singapore = function (o) {
    var tw = '';
    [190, 300, 410].forEach(function (x) {
      tw += '<path d="M' + (x - 29) + ',352L' + (x - 24) + ',120L' + (x + 24) + ',120L' + (x + 29) + ',352Z"' + SK(5) + ' fill="currentColor" fill-opacity=".28"/>' +
        '<path d="M' + (x + 5) + ',352Q' + (x - 7) + ',236 ' + x + ',120"' + SK(4) + '/>';
    });
    function tree(x, top, base, w) {
      var s = '<path d="M' + (x - 5) + ',' + base + 'L' + (x - 4) + ',' + (top + 36) + 'Q' + (x - w * .4) + ',' + (top + 18) + ' ' + (x - w) + ',' + top + 'Q' + x + ',' + (top - 10) + ' ' + (x + w) + ',' + top +
        'Q' + (x + w * .4) + ',' + (top + 18) + ' ' + (x + 4) + ',' + (top + 36) + 'L' + (x + 5) + ',' + base + 'Z"' + SK(4, ' fill="currentColor" fill-opacity=".35"') + '/>';
      s += '<path d="M' + x + ',' + (top + 36) + 'L' + (x - w * .7) + ',' + (top - 1) + 'M' + x + ',' + (top + 36) + 'L' + (x - w * .25) + ',' + (top - 5) + 'M' + x + ',' + (top + 36) + 'L' + (x + w * .25) + ',' + (top - 5) + 'M' + x + ',' + (top + 36) + 'L' + (x + w * .7) + ',' + (top - 1) + '"' + SK(4) + '/>';
      for (var k = 1; k < 4; k++) s += line(x - 9, base - k * 44, x + 9, base - k * 44, 5);
      return s;
    }
    return OPEN +
      T(300, 30, String(o.city || 'Singapore').toUpperCase(), 'Sofia Sans Condensed', 19, { w: 800, ls: 10, max: 240, k: 0.5 }) +
      T(300, 80, o.venue.toUpperCase(), 'Sofia Sans Condensed', 48, { w: 800, ls: 4, max: 450, k: 0.5 }) +
      tw + '<path d="M122,98L562,88L560,99Q520,112 470,120L132,120Q118,112 122,98Z"/>' +
      tree(52, 150, 338, 30) + tree(100, 206, 352, 24) + tree(500, 210, 352, 24) + tree(550, 156, 336, 30) +
      line(110, 356, 490, 356, 5) + '<path d="M150,370L450,370"' + SK(4, ' stroke-dasharray="36 16" stroke-opacity=".6"') + '/>' +
      T(300, 393, String(o.style || 'Deepstack').toUpperCase(), 'Sofia Sans Condensed', 16, { w: 800, ls: 10, op: 0.8, max: 200, k: 0.5 }) + CLOSE;
  };

  // ───────────── Bahamas Invitational · Nassau: an engraved invitation card framed by palm fronds
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
    return OPEN +
      '<rect x="116" y="26" width="368" height="348" rx="3"' + SK(5) + '/>' +
      '<path d="M140,38L460,38A12,12 0 0 0 472,50L472,350A12,12 0 0 0 460,362L140,362A12,12 0 0 0 128,350L128,50A12,12 0 0 0 140,38Z"' + SK(4, ' stroke-opacity=".6"') + '/>' +
      T(300, 62, 'By Invitation Only'.toUpperCase(), 'Cinzel', 17, { w: 700, ls: 5, max: 300, k: 0.78 }) +
      T(300, 132, n[0], 'Great Vibes', 84, { sw: 2, max: 320, k: 0.42 }) +
      (n[1] ? T(302, 298, n[1].toUpperCase(), 'Cinzel', 36, { w: 700, ls: 4, max: 320, k: 0.78 }) : '') +
      line(230, 316, 280, 316, 4) + line(320, 316, 370, 316, 4) + '<path d="M300,309L307,316L300,323L293,316Z"/>' +
      T(300, 346, String(o.city || 'Nassau') + ' · ' + String(o.style || 'High Roller'), 'Pagella', 23, { it: 1, max: 300, k: 0.48 }) +
      '<g>' + left + '</g><g transform="matrix(-1 0 0 1 600 0)">' + left + '</g>' + CLOSE;
  };

  // ───────────── Omaha World Championship · Omaha: Nebraska wheat wreath, Omaha's four hole cards, ribbon
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
    var fan = '';
    [-27, -9, 9, 27].forEach(function (a, i) { fan += '<rect x="-17" y="-60" width="34" height="50" rx="4" transform="translate(300,150) rotate(' + a + ')"' + SK(4, ' fill="currentColor" fill-opacity="' + (i === 3 ? '.7' : '.3') + '"') + '/>'; });
    var ribbon = '<path d="M150,276L102,276L119,301L102,326L164,326L164,312L150,312Z" fill-opacity=".45"/><path d="M450,276L498,276L481,301L498,326L436,326L436,312L450,312Z" fill-opacity=".45"/>' +
      '<rect x="150" y="262" width="300" height="50"' + SK(5) + '/>';
    return OPEN + '<defs><path id="omahachamp-a" d="M115,165A210,210 0 0 1 485,165"/></defs>' +
      '<g>' + w + '</g><g transform="matrix(-1 0 0 1 600 0)">' + w + '</g>' + fan + '<path d="M246,100l4.1,8.9 9.7,1.1-7.2,6.6 2,9.6-8.6,-4.9-8.6,4.9 2,-9.6-7.2,-6.6 9.7,-1.1Z"/><path d="M354,100l4.1,8.9 9.7,1.1-7.2,6.6 2,9.6-8.6,-4.9-8.6,4.9 2,-9.6-7.2,-6.6 9.7,-1.1Z"/>' +
      '<text font-family="Cinzel" font-weight="700" font-size="44" letter-spacing="6" text-anchor="middle"' + fit(arc.toUpperCase(), 44, 440, 0.8, 6) + '><textPath href="#omahachamp-a" startOffset="50%">' + E(arc.toUpperCase()) + '</textPath></text>' +
      ribbon + (rib ? T(302, 300, rib.toUpperCase(), 'Cinzel', 34, { w: 700, ls: 4, max: 280, k: 0.78 }) : '') +
      T(300, 344, (String(o.city || 'Omaha') + ' · Nebraska').toUpperCase(), 'Sofia Sans', 16, { w: 800, ls: 6, max: 210, k: 0.62 }) + CLOSE;
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
  var SPADE = 'M0-13C5-7 13-3 13 4C13 9 8 11 3 8L5 14H-5L-3 8C-8 11-13 9-13 4C-13-3-5-7 0-13Z';
  var CLUB = '<circle cx="0" cy="-6.5" r="5.8"/><circle cx="-6.6" cy="2.5" r="5.8"/><circle cx="6.6" cy="2.5" r="5.8"/><path d="M-1.6 2L-4.5 14H4.5L1.6 2Z"/>';

  /* ---------- Tunica: a sidewheel steamboat over a showbill name ---------- */
  SAMPLE.tunica = { venue: 'Riverboat Classic', city: 'Tunica', style: 'Deepstack' };
  LOGOS.tunica = function (o) {
    var n = split(o.venue), posts = '', spokes = '', waves = '';
    for (var x = 196; x <= 404; x += 19) if (Math.abs(x - 300) > 46) posts += 'M' + x + ' 110V130';
    for (var a = 180; a <= 360; a += 22.5) {
      var r = a * Math.PI / 180;
      spokes += 'M' + f(300 + 9 * Math.cos(r)) + ' ' + f(134 + 9 * Math.sin(r)) + 'L' + f(300 + 36 * Math.cos(r)) + ' ' + f(134 + 36 * Math.sin(r));
    }
    [176, 198, 220].forEach(function (y, i) {
      waves += 'M' + (34 + i * 8) + ' ' + y + 'q10-8 20 0t20 0t20 0' + (i < 2 ? 't20 0' : '');
      waves += 'M' + (566 - i * 8) + ' ' + y + 'q-10-8-20 0t-20 0t-20 0' + (i < 2 ? 't-20 0' : '');
    });
    var crown = function (x) { return 'M' + (x - 12) + ' 32L' + (x - 9) + ' 20L' + (x - 4) + ' 27L' + x + ' 17L' + (x + 4) + ' 27L' + (x + 9) + ' 20L' + (x + 12) + ' 32Z'; };
    return S(
      '<mask id="tunica-m"><rect width="600" height="400" fill="#fff"/><circle cx="300" cy="134" r="44" fill="#000"/></mask>' +
      // smoke
      '<g fill="none" stroke="currentColor" stroke-width="4" stroke-opacity=".45"><circle cx="356" cy="16" r="7"/><circle cx="376" cy="12" r="5.5"/><circle cx="392" cy="10" r="4"/></g>' +
      // stacks
      '<path d="M256 30h12v60h-12zM332 30h12v60h-12z' + crown(262) + crown(338) + '"/>' +
      // pilot house + texas deck
      '<rect x="282" y="70" width="36" height="20" fill-opacity=".85"/><path d="M274 68h52" stroke="currentColor" stroke-width="5"/>' +
      '<g mask="url(#tunica-m)" fill="none" stroke="currentColor"><rect x="224" y="90" width="152" height="18" stroke-width="5"/>' +
      '<rect x="186" y="108" width="228" height="24" stroke-width="5"/><path d="' + posts + '" stroke-width="4" stroke-opacity=".6"/></g>' +
      // paddlebox
      '<g fill="none" stroke="currentColor"><path d="M258 134A42 42 0 0 1 342 134" stroke-width="6"/><path d="' + spokes + '" stroke-width="4"/></g><circle cx="300" cy="134" r="6"/>' +
      // flagstaffs
      '<path d="M178 132V94M422 132V94" stroke="currentColor" stroke-width="4"/><path d="M178 94l20 6-20 6zM422 94l20 6-20 6z"/>' +
      // hull
      '<path d="M166 132H434Q430 146 414 151H186Q170 146 166 132Z"/>' +
      // river either side of the board
      '<path d="' + waves + '" fill="none" stroke="currentColor" stroke-width="4.5" stroke-opacity=".55" stroke-linecap="round"/>' +
      // name
      T(300, 306, E(n[0]), 'font-family="Pagella" font-weight="700" font-style="italic" font-size="68"') +
      '<path d="M138 336h56M406 336h56" stroke="currentColor" stroke-width="4"/>' +
      T(300, 348, U(n[1]), 'font-family="Sofia Sans Condensed" font-weight="800" font-size="36" letter-spacing="12"') +
      T(300, 378, 'TUNICA · MISSISSIPPI', 'font-family="Sofia Sans Condensed" font-weight="700" font-size="17" letter-spacing="5" fill-opacity=".8"')
    );
  };

  /* ---------- Deadwood: a tacked-up reward poster with the dead man's hand ---------- */
  SAMPLE.deadwood = { venue: 'Gold Rush Bounty', city: 'Deadwood', style: 'Bounty' };
  LOGOS.deadwood = function (o) {
    var n = split(o.venue);
    function card(rank, suit, id, tr, mask) {
      return (mask ? '<g mask="url(#' + mask + ')">' : '<g>') + '<g transform="' + tr + '"><rect x="-27" y="-40" width="54" height="80" rx="6" fill="none" stroke="currentColor" stroke-width="5"/>' +
        '<text x="-15" y="-13" text-anchor="middle" font-family="Pagella" font-weight="700" font-size="25">' + rank + '</text>' +
        '<g transform="translate(5 12) scale(1.15)">' + (suit === 's' ? '<path d="' + SPADE + '"/>' : CLUB) + '</g></g></g>';
    }
    function pair(cx, r1, r2, k) {
      var b = 'translate(' + (cx - 14) + ' 196) rotate(-10)', t = 'translate(' + (cx + 14) + ' 206) rotate(9)';
      return '<mask id="deadwood-' + k + '"><rect width="600" height="400" fill="#fff"/><rect x="-31" y="-44" width="62" height="88" rx="8" transform="' + t + '" fill="#000"/></mask>' +
        card(r1, 's', k, b, 'deadwood-' + k) + card(r2, 'c', k, t);
    }
    return S(
      '<mask id="deadwood-p"><rect width="600" height="400" fill="#fff"/><rect x="0" y="140" width="128" height="120" fill="#000"/><rect x="472" y="140" width="128" height="120" fill="#000"/></mask>' +
      '<g mask="url(#deadwood-p)" fill="none" stroke="currentColor"><path d="M116 24H470L484 38V376H130L116 362Z" stroke-width="6"/>' +
      '<rect x="130" y="38" width="340" height="324" stroke-width="4" stroke-opacity=".45"/></g>' +
      '<circle cx="142" cy="50" r="6"/><circle cx="458" cy="50" r="6"/><circle cx="142" cy="350" r="6"/><circle cx="458" cy="350" r="6"/>' +
      T(300, 72, 'DEADWOOD · DAKOTA TERRITORY', 'font-family="Sofia Sans Condensed" font-weight="700" font-size="17" letter-spacing="3"') +
      T(300, 128, U(n[0]), 'font-family="Rye" font-size="56" textLength="300" lengthAdjust="spacingAndGlyphs"') +
      T(300, 318, U(n[1]), 'font-family="Rye" font-size="72" textLength="290" lengthAdjust="spacingAndGlyphs"') +
      '<path d="M168 336h52M380 336h52" stroke="currentColor" stroke-width="4"/>' +
      T(300, 342, 'ACES &amp; EIGHTS', 'font-family="Sofia Sans Condensed" font-weight="700" font-size="17" letter-spacing="3"') +
      pair(66, 'A', 'A', 'l') + pair(534, '8', '8', 'r')
    );
  };

  /* ---------- Miami: art deco sunburst, neon script and two palms ---------- */
  SAMPLE.miami = { venue: 'Ocean Drive Open', city: 'Miami', style: 'Deepstack' };
  LOGOS.miami = function (o) {
    var n = split(o.venue), rays = '';
    for (var i = 0; i < 11; i++) {
      var a = (200 + i * 14) * Math.PI / 180, r2 = i % 2 ? 72 : 88;
      rays += 'M' + f(300 + 52 * Math.cos(a)) + ' ' + f(102 + 52 * Math.sin(a)) + 'L' + f(300 + r2 * Math.cos(a)) + ' ' + f(102 + r2 * Math.sin(a));
    }
    var LEAF = 'M0 0C18-13 44-12 66 6C44-2 20-3 0 0Z';
    function palm(cx, cy, trunk, angs, s) {
      var g = '<path d="' + trunk + '" fill="none" stroke="currentColor" stroke-width="9" stroke-linecap="round"/><g transform="translate(' + cx + ' ' + cy + ') scale(' + s + ' 1)">';
      angs.forEach(function (a) { g += '<path d="' + LEAF + '" transform="rotate(' + a + ')' + (a < -90 || a > 90 ? ' scale(1 -1)' : '') + '"/>'; });
      return g + '<circle r="7"/></g>';
    }
    return S(
      // sunburst on a horizon
      '<path d="M258 102A42 42 0 0 1 342 102Z"/>' +
      '<path d="' + rays + '" stroke="currentColor" stroke-width="6"/>' +
      '<path d="M150 102H450" stroke="currentColor" stroke-width="5"/>' +
      T(300, 150, U(n[0]), 'font-family="Sofia Sans Condensed" font-weight="600" font-size="52" letter-spacing="7"') +
      // streamline bands and the neon script
      '<path d="M112 290h86M124 304h70M136 318h54M488 290h-86M476 304h-70M464 318h-54" stroke="currentColor" stroke-width="5"/>' +
      T(300, 326, E(n[1]), 'font-family="Great Vibes" font-size="104" fill-opacity=".4" stroke="currentColor" stroke-width="4" stroke-linejoin="round"') +
      T(300, 376, 'MIAMI BEACH · DEEPSTACK', 'font-family="Sofia Sans Condensed" font-weight="700" font-size="17" letter-spacing="5" fill-opacity=".85"') +
      palm(76, 112, 'M98 372C106 300 100 200 76 114', [-164, -132, -100, -66, -32, 4, 30], 1) +
      palm(522, 146, 'M502 360C496 290 500 220 522 148', [-164, -132, -100, -66, -32, 2, 28], -1)
    );
  };

  /* ---------- Seattle: an emerald-cut gem with the Space Needle in its setting ---------- */
  SAMPLE.seattle = { venue: 'Emerald City Open', city: 'Seattle', style: 'Freezeout' };
  LOGOS.seattle = function (o) {
    var n = split(o.venue);
    var needle = '<path d="M91 76V100" stroke-width="4"/><path d="M75 108L91 97L107 108ZM62 108H120L111 119H71ZM74 119H108L99 127H83Z"/>' +
      '<path d="M84 127Q90 196 88 206Q86 262 72 306M98 127Q92 196 94 206Q96 262 110 306" fill="none" stroke-width="5"/>' +
      '<path d="M91 127V306" stroke-width="4" stroke-opacity=".6"/><path d="M80 262H102" stroke-width="5"/>';
    var side = 'transform="translate(518 200) rotate(-90)"';
    return S(
      '<mask id="seattle-m"><rect width="600" height="400" fill="#fff"/><g fill="#000" stroke="#000" stroke-width="14">' + needle + '</g>' +
      '<rect x="490" y="118" width="56" height="164" fill="#000" stroke="none"/></mask>' +
      '<g mask="url(#seattle-m)" fill="none" stroke="currentColor">' +
      '<path d="M130 28H470L548 106V294L470 372H130L52 294V106Z" stroke-width="6"/>' +
      '<path d="M136 42H464L534 112V288L464 358H136L66 288V112Z" stroke-width="4" stroke-opacity=".5"/>' +
      '<path d="M164 140H436L470 174V226L436 260H164L130 226V174Z" stroke-width="4.5" stroke-opacity=".7"/>' +
      '<path d="M130 28L164 140M470 28L436 140M130 372L164 260M470 372L436 260" stroke-width="4" stroke-opacity=".5"/></g>' +
      '<g stroke="currentColor">' + needle + '</g>' +
      T(300, 70, 'PACIFIC NORTHWEST', 'font-family="Sofia Sans" font-weight="700" font-size="16" letter-spacing="5" fill-opacity=".8"') +
      T(300, 122, U(n[0]), 'font-family="Sofia Sans" font-weight="900" font-size="46" letter-spacing="1" textLength="262" lengthAdjust="spacingAndGlyphs"') +
      T(300, 318, U(n[1]), 'font-family="Sofia Sans" font-weight="900" font-size="50" letter-spacing="16"') +
      T(300, 348, 'FREEZEOUT', 'font-family="Sofia Sans" font-weight="700" font-size="16" letter-spacing="6" fill-opacity=".8"') +
      '<text x="0" y="10" ' + side + ' text-anchor="middle" font-family="Sofia Sans Condensed" font-weight="800" font-size="30" letter-spacing="8">SEATTLE</text>'
    );
  };

  /* ---------- Sedona: a striped desert sun setting behind Cathedral and Bell Rock ---------- */
  SAMPLE.sedona = { venue: 'Red Rock Bounty', city: 'Sedona', style: 'Bounty' };
  LOGOS.sedona = function (o) {
    var n = split(o.venue);
    var rock = 'M10 400V296L36 278L46 250L56 246L60 204L68 200L72 164L80 160L86 192L92 188L98 150L106 146L112 182L120 198L128 204L134 238L152 246L176 258L204 258L210 250L262 250L268 258L346 258L352 252L404 252L426 246L452 246' +
      'C468 246 472 204 486 192C494 174 502 162 510 158L514 148L518 158C526 162 534 174 542 192C556 204 560 244 580 252L592 296V400Z';
    var stripes = '';
    [[180, 5], [198, 7], [218, 9], [240, 11]].forEach(function (s) { stripes += '<rect x="170" y="' + s[0] + '" width="260" height="' + s[1] + '"/>'; });
    var title = T(300, 132, U(n[0]), 'font-family="Bungee" font-size="54"');
    return S(
      '<mask id="sedona-s"><rect width="600" height="400" fill="#fff"/><g fill="#000">' + stripes + '</g>' +
      '<g fill="#000" stroke="#000" stroke-width="14" stroke-linejoin="round">' + title + '</g></mask>' +
      '<mask id="sedona-r"><rect width="600" height="400" fill="#fff"/><g fill="#000">' +
      T(300, 344, U(n[1]), 'font-family="Bungee" font-size="52" letter-spacing="6"') +
      T(300, 378, 'SEDONA · ARIZONA', 'font-family="Sofia Sans Condensed" font-weight="800" font-size="18" letter-spacing="6"') + '</g>' +
      '<path d="M30 226H140M24 262H150M40 296H120M470 214H560M462 240H570" stroke="#000" stroke-width="4.5"/></mask>' +
      '<circle cx="300" cy="216" r="118" fill-opacity=".42" mask="url(#sedona-s)"/>' +
      title +
      '<path d="' + rock + '" fill-opacity=".78" mask="url(#sedona-r)"/>'
    );
  };

  /* ---------- Prague: the Old Town astronomical clock ---------- */
  SAMPLE.prague = { venue: 'Prague Grand Prix', city: 'Prague', style: 'Freezeout' };
  LOGOS.prague = function (o) {
    var n = split(o.venue, true), ticks = '';
    for (var i = 0; i < 24; i++) {
      var a = i * 15 * Math.PI / 180;
      ticks += 'M' + f(300 + 130 * Math.cos(a)) + ' ' + f(200 + 130 * Math.sin(a)) + 'L' + f(300 + 144 * Math.cos(a)) + ' ' + f(200 + 144 * Math.sin(a));
    }
    var star = function (x, y, r) { return 'M' + x + ' ' + (y - r) + 'L' + (x + r * .28) + ' ' + (y - r * .28) + 'L' + (x + r) + ' ' + y + 'L' + (x + r * .28) + ' ' + (y + r * .28) + 'L' + x + ' ' + (y + r) + 'L' + (x - r * .28) + ' ' + (y + r * .28) + 'L' + (x - r) + ' ' + y + 'L' + (x - r * .28) + ' ' + (y - r * .28) + 'Z'; };
    return S(
      '<path id="prague-a" d="M146 200A154 154 0 0 1 454 200" fill="none"/>' +
      '<path id="prague-b" d="M123 200A177 177 0 0 0 477 200" fill="none"/>' +
      '<g fill="none" stroke="currentColor"><circle cx="300" cy="200" r="188" stroke-width="6"/><circle cx="300" cy="200" r="146" stroke-width="5"/>' +
      '<path d="' + ticks + '" stroke-width="4" stroke-opacity=".7"/>' +
      '<circle cx="300" cy="172" r="94" stroke-width="5" stroke-opacity=".55"/>' +
      '<path d="M190 286Q300 330 410 286" stroke-width="4" stroke-opacity=".55"/>' +
      '<path d="M300 200V92" stroke-width="5"/></g>' +
      '<circle cx="300" cy="118" r="10"/><path d="' + star(300, 84, 14) + star(64, 200, 18) + star(536, 200, 18) + '"/>' +
      '<text font-family="Cinzel" font-weight="700" font-size="40" letter-spacing="12" text-anchor="middle"><textPath href="#prague-a" startOffset="50%">' + U(n[0]) + '</textPath></text>' +
      '<text font-family="Cinzel" font-weight="700" font-size="36" letter-spacing="6" text-anchor="middle"><textPath href="#prague-b" startOffset="50%">' + U(n[1]) + '</textPath></text>' +
      T(300, 316, 'PRAHA', 'font-family="Cinzel" font-weight="700" font-size="20" letter-spacing="9" fill-opacity=".8"')
    );
  };

  /* ---------- Malta: the eight-pointed Maltese cross ---------- */
  SAMPLE.malta = { venue: 'Mediterranean High Roller', city: 'Malta', style: 'High Roller' };
  LOGOS.malta = function (o) {
    var n = split(o.venue, true), arms = '';
    [0, 90, 180, 270].forEach(function (a) { arms += '<path d="M300 200L208 12L300 72L392 12Z" transform="rotate(' + a + ' 300 200)"/>'; });
    var top = T(300, 132, U(n[0]), 'font-family="Pagella" font-weight="700" font-size="44" letter-spacing="3" textLength="420" lengthAdjust="spacingAndGlyphs"');
    var bot = T(300, 300, U(n[1]), 'font-family="Pagella" font-weight="700" font-size="44" letter-spacing="7"');
    var sub = T(300, 336, 'Valletta · Malta', 'font-family="Pagella" font-style="italic" font-size="24"');
    return S(
      '<mask id="malta-m"><rect width="600" height="400" fill="#fff"/><g fill="#000" stroke="#000" stroke-width="16" stroke-linejoin="round">' + top + bot + sub + '</g></mask>' +
      '<g mask="url(#malta-m)"><g fill-opacity=".34" stroke="currentColor" stroke-width="6" stroke-linejoin="miter">' + arms + '</g>' +
      '<g fill="none" stroke="currentColor" stroke-width="4" stroke-opacity=".45"><circle cx="300" cy="200" r="30"/></g></g>' +
      top + bot + sub
    );
  };

  /* ---------- Seoul: Sungnyemun gate, the board under its eaves, a seal below ---------- */
  SAMPLE.seoul = { venue: 'Seoul Cup', city: 'Seoul', style: 'Deepstack' };
  LOGOS.seoul = function (o) {
    var tiles1 = '', tiles2 = '', joints = '';
    for (var x = 186; x <= 414; x += 13) tiles1 += 'M' + x + ' 40V78';
    for (var x2 = 128; x2 <= 472; x2 += 14) tiles2 += 'M' + x2 + ' 116V154';
    [[100, 278], [160, 278], [220, 278], [280, 278], [340, 278], [400, 278], [460, 278], [130, 302], [190, 302], [250, 302], [310, 302], [370, 302], [430, 302], [490, 302]].forEach(function (j) { joints += 'M' + j[0] + ' ' + (j[1] - 24) + 'V' + j[1]; });
    var name = T(300, 314, U(o.venue), 'font-family="Russo One" font-size="48" letter-spacing="4"');
    return S(
      '<mask id="seoul-t"><rect width="600" height="400" fill="#fff"/><path d="' + tiles1 + tiles2 + '" stroke="#000" stroke-width="3.5"/></mask>' +
      '<mask id="seoul-w"><rect width="600" height="400" fill="#fff"/><g fill="#000" stroke="#000" stroke-width="16">' + name + '</g></mask>' +
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
      T(178, 368, 'SEOUL · KOREA', 'font-family="Sofia Sans" font-weight="800" font-size="16" letter-spacing="3"') +
      T(422, 368, 'DEEPSTACK', 'font-family="Sofia Sans" font-weight="800" font-size="16" letter-spacing="3"')
    );
  };

  /* ---------- Aspen: an engraved invitation card, script name, Maroon Bells ---------- */
  SAMPLE.aspen = { venue: 'Aspen Invitational', city: 'Aspen', style: 'High Roller' };
  LOGOS.aspen = function (o) {
    var n = split(o.venue);
    function frame(x0, y0, x1, y1, r) {
      return 'M' + (x0 + r) + ' ' + y0 + 'H' + (x1 - r) + 'A' + r + ' ' + r + ' 0 0 0 ' + x1 + ' ' + (y0 + r) + 'V' + (y1 - r) + 'A' + r + ' ' + r + ' 0 0 0 ' + (x1 - r) + ' ' + y1 +
        'H' + (x0 + r) + 'A' + r + ' ' + r + ' 0 0 0 ' + x0 + ' ' + (y1 - r) + 'V' + (y0 + r) + 'A' + r + ' ' + r + ' 0 0 0 ' + (x0 + r) + ' ' + y0 + 'Z';
    }
    var LEAF = '<path d="M0-20C12-12 18-2 16 6C14 14 6 18 0 18C-6 18-14 14-16 6C-18-2-12-12 0-20Z" fill-opacity=".4" stroke="currentColor" stroke-width="4"/><path d="M0-12V18Q2 26-3 32" fill="none" stroke="currentColor" stroke-width="4"/>';
    return S(
      '<g fill="none" stroke="currentColor"><path d="' + frame(100, 24, 500, 376, 28) + '" stroke-width="5"/><path d="' + frame(112, 36, 488, 364, 22) + '" stroke-width="4" stroke-opacity=".45"/></g>' +
      '<g transform="translate(146 74) rotate(-28)">' + LEAF + '</g><g transform="translate(454 74) rotate(28) scale(-1 1)">' + LEAF + '</g>' +
      T(300, 140, E(n[0]), 'font-family="Great Vibes" font-size="118"') +
      T(300, 298, U(n[1]), 'font-family="Cinzel" font-weight="700" font-size="34" letter-spacing="5"') +
      '<path d="M134 334H246M354 334H466" stroke="currentColor" stroke-width="4"/>' +
      '<path d="M250 336L272 316L280 322L294 300L304 312L312 306L350 336Z" fill-opacity=".45" stroke="currentColor" stroke-width="4.5" stroke-linejoin="round"/>' +
      T(300, 360, 'BY INVITATION ONLY · ASPEN, COLORADO', 'font-family="Sofia Sans Condensed" font-weight="700" font-size="15" letter-spacing="3"')
    );
  };

  /* ---------- Toronto: laurel wreath, the CN Tower and the skyline, the road's final ---------- */
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
    var star = function (x, y, r) { var p = ''; for (var i = 0; i < 10; i++) { var q = (i * 36 - 90) * Math.PI / 180, rr = i % 2 ? r * .42 : r; p += (i ? 'L' : 'M') + f(x + rr * Math.cos(q)) + ' ' + f(y + rr * Math.sin(q)); } return p + 'Z'; };
    return S(
      wreath + '<g transform="translate(600 0) scale(-1 1)">' + wreath + '</g>' +
      // skyline
      '<path d="M206 152V134Q240 108 274 134V152ZM166 152V134H182V152ZM186 152V122H202V152ZM330 152V112H348V152ZM352 152V96H372V152ZM376 152V118H392V152ZM396 152V128H414V152ZM418 152V138H432V152Z" fill-opacity=".45"/>' +
      // CN Tower
      '<path d="M300 6V46" stroke="currentColor" stroke-width="4"/><path d="M293 44H307V53H293ZM296 53H304L305 70H295ZM280 72H320L327 81L320 92H280L273 81ZM293 92H307L316 152H284Z"/>' +
      T(300, 292, U(n[0]), 'font-family="Cinzel" font-weight="700" font-size="40" letter-spacing="12"') +
      T(300, 340, U(n[1]), 'font-family="Cinzel" font-weight="700" font-size="46" letter-spacing="2" textLength="392" lengthAdjust="spacingAndGlyphs"') +
      '<path d="' + star(196, 366, 8) + star(404, 366, 8) + '"/>' +
      T(300, 373, 'TORONTO', 'font-family="Sofia Sans" font-weight="800" font-size="18" letter-spacing="9" fill-opacity=".85"')
    );
  };
})();

  window.PokerLogos = {
    has: function (k) { return !!LOGOS[k]; },
    svg: function (k, o) { try { return LOGOS[k] ? LOGOS[k](o || {}) : ''; } catch (e) { return ''; } }
  };
})();
