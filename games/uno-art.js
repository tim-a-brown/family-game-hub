// ═══════════════════════════════════════════════════════════════════════════
// UNO's card faces, back and name, drawn in SVG (window.UnoArt), for the game (games/spanishone.html), its history view
// (hist/spanishone.js) and the home tile. UNO is a trademark of Mattel, Inc., used with Mattel's permission for this
// family app (2026-11-26; CLAUDE.md, Spanish One). The files, ids and storage keys still say spanishone.
//
// A face is a 100 by 146 SVG: the white card, the color inside its white border, the tilted white oval, the number or
// sign in the middle in the card's color with a black outline and shadow, and the small number or sign in two corners
// (`.ix`, the lower one `.ix.bot`, so a small card can leave them out). `.cs` is the color's shape (red circle, yellow
// triangle, green square, blue diamond) under each corner, shown only with Color symbols on (`.so-sym` on <html>).
//   UnoArt.face(code)  code 'r7', 'bs', 'gr', 'yd2', 'ww', 'ww4'   UnoArt.back()   UnoArt.mark(w)  the name in its oval
// ═══════════════════════════════════════════════════════════════════════════
(function (root) {
  'use strict';
  var COL = { r: '#e3242b', y: '#f8c814', g: '#2c9f45', b: '#0a6ec7', w: '#141414' };
  var FONT = 'font-family="Schibsted Grotesk,system-ui,sans-serif" font-weight="800"';
  var CX = 50, CY = 73, TILT = 28;
  var SHAPE = {
    r: '<circle cx="0" cy="0" r="9.5"/>',
    y: '<path d="M0-9.4 10.2 8.6H-10.2z"/>',
    g: '<rect x="-9" y="-9" width="18" height="18" rx="2.6"/>',
    b: '<path d="M0-10.5 10.5 0 0 10.5-10.5 0z"/>'
  };

  // text with a black outline and a black shadow under it (the printed look)
  function word(t, x, y, size, fill, o) {
    o = o || {};
    var sk = o.skew == null ? -8 : o.skew, sw = o.stroke == null ? size * .09 : o.stroke, sh = o.shadow == null ? size * .05 : o.shadow;
    var base = ' x="0" y="0" text-anchor="middle" dominant-baseline="central" ' + FONT + ' font-size="' + size + '"';
    var g = '<g transform="translate(' + x + ' ' + y + ') skewX(' + sk + ')">';
    if (sh) g += '<text' + base + ' transform="translate(' + sh + ' ' + sh + ')" fill="#000" stroke="#000" stroke-width="' + sw + '" stroke-linejoin="round">' + t + '</text>';
    g += '<text' + base + ' fill="' + fill + '" stroke="#000" stroke-width="' + sw + '" stroke-linejoin="round" paint-order="stroke">' + t + '</text>';
    if (o.under) g += '<rect x="' + (-size * .26) + '" y="' + (size * .4) + '" width="' + (size * .52) + '" height="' + (size * .085) + '" fill="' + fill + '" stroke="#000" stroke-width="' + (sw * .6) + '"/>';
    return g + '</g>';
  }
  // the signs, drawn in a box from -10 to 10: an outline pass in black, then the fill
  function sign(v, x, y, s, fill, line) {
    var lw = line == null ? 2.2 : line, out = '', inn = '';
    if (v === 's') {
      out = '<circle r="7" fill="none" stroke="#000" stroke-width="' + (3.4 + lw) + '"/><path d="M-5 5 5-5" stroke="#000" stroke-width="' + (3.4 + lw) + '"/>';
      inn = '<circle r="7" fill="none" stroke="' + fill + '" stroke-width="3.4"/><path d="M-5 5 5-5" stroke="' + fill + '" stroke-width="3.4"/>';
    } else if (v === 'r') {
      var a = 'M-8.5-3.2H1.2V-7.2L8.8-1.4 1.2 4.4V.4H-8.5z', b = 'M8.5 3.2H-1.2V7.2L-8.8 1.4-1.2-4.4V-.4H8.5z';
      out = '<g transform="rotate(-45)"><g transform="translate(0 -1.8)"><path d="' + a + '" fill="#000" stroke="#000" stroke-width="' + lw + '" stroke-linejoin="round"/></g><g transform="translate(0 1.8)"><path d="' + b + '" fill="#000" stroke="#000" stroke-width="' + lw + '" stroke-linejoin="round"/></g></g>';
      inn = '<g transform="rotate(-45)"><g transform="translate(0 -1.8)"><path d="' + a + '" fill="' + fill + '"/></g><g transform="translate(0 1.8)"><path d="' + b + '" fill="' + fill + '"/></g></g>';
    } else if (v === 'd2') {
      out = '<rect x="-8" y="-9.5" width="10" height="14" rx="1.8" fill="#000" stroke="#000" stroke-width="' + lw + '"/><rect x="-2" y="-4.5" width="10" height="14" rx="1.8" fill="#000" stroke="#000" stroke-width="' + lw + '"/>';
      inn = '<rect x="-8" y="-9.5" width="10" height="14" rx="1.8" fill="' + fill + '" stroke="#000" stroke-width=".9"/><rect x="-2" y="-4.5" width="10" height="14" rx="1.8" fill="' + fill + '" stroke="#000" stroke-width=".9"/>';
    }
    return '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')" stroke-linecap="round">' + out + inn + '</g>';
  }
  // the oval in four colors (a Wild), as four quarters of the ellipse
  function quad(rx, ry, edge) {
    var q = [['r', 0, -ry, rx, 0], ['b', rx, 0, 0, ry], ['g', 0, ry, -rx, 0], ['y', -rx, 0, 0, -ry]], s = '';
    q.forEach(function (x) { s += '<path d="M0 0L' + x[1] + ' ' + x[2] + 'A' + rx + ' ' + ry + ' 0 0 1 ' + x[3] + ' ' + x[4] + 'Z" fill="' + COL[x[0]] + '"/>'; });
    if (edge) s += '<ellipse rx="' + rx + '" ry="' + ry + '" fill="none" stroke="#fff" stroke-width="' + edge + '"/>';
    return s;
  }
  // four small cards fanned (a Wild Draw Four)
  function four() {
    var s = '', cs = [['b', -15, -12], ['g', -5, -4], ['r', 5, 4], ['y', 15, 12]];
    cs.forEach(function (x) { s += '<rect x="' + (x[1] - 8) + '" y="' + (x[2] - 11) + '" width="16" height="22" rx="2.6" fill="' + COL[x[0]] + '" stroke="#fff" stroke-width="2"/>'; });
    return '<g transform="translate(' + CX + ' ' + CY + ') rotate(-12)">' + s + '</g>';
  }
  function corner(c, v, inner) { return '<g class="ix">' + inner + '</g><g class="ix bot" transform="rotate(180 ' + CX + ' ' + CY + ')">' + inner + '</g>'; }
  function cshape(c) {
    if (!SHAPE[c]) return '';
    var g = '<g transform="translate(15 37) scale(.5)" fill="#fff" stroke="#000" stroke-width="2.4">' + SHAPE[c] + '</g>';
    return '<g class="cs">' + g + '</g><g class="cs bot" transform="rotate(180 ' + CX + ' ' + CY + ')">' + g + '</g>';
  }

  function face(code) {
    var c = String(code || '').charAt(0), v = String(code || '').slice(1), col = COL[c] || COL.w;
    var num = /^\d$/.test(v), u = v === '6' || v === '9';
    var s = '<svg class="uf" viewBox="0 0 100 146" preserveAspectRatio="none" aria-hidden="true">' +
      '<rect width="100" height="146" rx="11" fill="#fff"/><rect x="6" y="6" width="88" height="134" rx="7" fill="' + col + '"/>';
    var oval = '<g transform="translate(' + CX + ' ' + CY + ') rotate(' + TILT + ')">';
    if (c === 'w' && v === 'w') s += oval + quad(31, 55, 0) + '</g>';
    else if (c === 'w') s += oval + '<ellipse rx="31" ry="55" fill="none" stroke="#fff" stroke-width="3"/></g>' + four();
    else s += oval + '<ellipse rx="31" ry="55" fill="#fff"/></g>';
    // the middle
    if (num) s += word(v, CX, CY, 64, col, { under: u });
    else if (v === 'd2') s += sign('d2', CX, CY, 2.5, col);
    else if (v === 's' || v === 'r') s += sign(v, CX, CY, 2.5, col);
    // the corners
    var ix;
    if (num) ix = word(v, 16, 20, 25, '#fff', { stroke: 2.6, shadow: 1.4, under: u });
    else if (v === 'd2' || v === 'w4') ix = word(v === 'd2' ? '+2' : '+4', 18, 19, 22, '#fff', { stroke: 2.4, shadow: 1.3 });
    else if (v === 'w') ix = '<g transform="translate(16 20) rotate(' + TILT + ')">' + quad(7.5, 12, 1.6) + '</g>';
    else ix = sign(v, 17, 19, .95, '#fff', 2.6);
    s += corner(c, v, ix) + cshape(c);
    return s + '</svg>';
  }
  // the name: heavy yellow letters with a black outline and shadow on a red oval with a yellow rim
  function mark(o) {
    o = o || {};
    var s = '<svg class="um" viewBox="0 0 120 80" aria-hidden="true"' + (o.label ? ' role="img" aria-label="UNO"' : '') + '>' +
      '<g transform="translate(60 40) rotate(-12)"><ellipse rx="56" ry="35" fill="#000" transform="translate(2 3)"/><ellipse rx="56" ry="35" fill="' + COL.r + '" stroke="' + COL.y + '" stroke-width="3.2"/>' +
      '<ellipse rx="49" ry="28.5" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="1.2"/></g>' +
      word('UNO', 60, 41, 40, COL.y, { skew: -10, stroke: 4.2, shadow: 2.6 }).replace('translate(60 41)', 'translate(60 41) rotate(-12)');
    return s + '</svg>';
  }
  function back() {
    return '<svg class="ub" viewBox="0 0 100 146" preserveAspectRatio="none" aria-hidden="true">' +
      '<rect width="100" height="146" rx="11" fill="#fff"/><rect x="6" y="6" width="88" height="134" rx="7" fill="' + COL.w + '"/>' +
      '<g transform="translate(50 73) rotate(' + TILT + ')"><ellipse rx="33" ry="57" fill="' + COL.r + '"/></g>' +
      '<g transform="translate(50 73) rotate(-62)">' + word('UNO', 0, 0, 34, COL.y, { skew: -10, stroke: 3.8, shadow: 2.4 }) + '</g></svg>';
  }
  root.UnoArt = { COL: COL, SHAPE: SHAPE, face: face, back: back, mark: mark, sign: sign, quad: quad };
})(typeof window !== 'undefined' ? window : this);
