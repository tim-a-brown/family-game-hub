'use strict';
// Wax Pack's card designs by maker and year (WaxDesigns), drawn by cardface.js.
//
// Permissions (Tim, 2026-11-28): Topps / Fanatics Collectibles allow original Topps cards (and the brands Topps owns:
// Bowman, Play Ball, the 1951 Red and Blue Backs) to be reproduced in this private family app; The Upper Deck Company
// allows Upper Deck, Fleer, Ultra, Flair, SkyBox, SP, Collector's Choice, O-Pee-Chee and Goudey. The tobacco and candy
// sets before 1923 (Old Judge, T206, T205, T207, Cracker Jack, Sporting News M101, American Caramel) are in the public
// domain. Not covered and never drawn here: Donruss, Leaf, Score, Pinnacle, Diamond Stars, Double Play, Berk Ross.
//
// A design is the card's layout drawn in boxes on a card 100 units wide and 140 tall (container units of the card):
//   {bg, ph: picture, L: [layers], bk: back, sure: 'a' | 'b' | 'c', note}
//   ph: {r: [x, y, w, h], s: shape (rect | rd | oval | circle | arch | curl | tv), b: frame (CSS box-shadow), f: filter
//        (bw | sep | tint | paint), bg: what shows round a picture that doesn't fill its window}
//   layers: ['box', x, y, w, h, style] a shape; ['tx', field, x, y, w, h, style] words; ['lg', x, y, w, h, style] the
//   team's logo for that season (or its name in lettering); ['mk', x, y, w, h, style] the maker's name in lettering;
//   ['sg', x, y, w, h, style] a signature; ['in', x, y, w, h, style] a second, closer look at the same picture.
//   fields: fn ln nm (first, last, whole name), tm (nickname), ct (city), ft (city and nickname), ps pf (position,
//   in full), yr (the card's year).
//   style: c color, bg background, f font, z size, al l|c|r, up uppercase, it italic, rot degrees, rd radius,
//   sh box-shadow, cp clip-path, ls letter-spacing, w weight, va t|c|b, o opacity, lh line height
//   Colors may name the team's: t1 t2 (its colors), i1 i2 (the ink that reads on each).
//   back: {st: cardboard, ink, hd: header, hi: header ink, bx: the stat box, pn: a panel (quiz | fact | cartoon),
//          fr: 1 for French and English headers (O-Pee-Chee)}
//   sure: how sure the layout is from what could be checked: a the set's look as widely pictured, b the main parts,
//   c a fair guess at the year's look (see games/waxpack/designs-notes.txt).
(function (root) {
  var D = {}, BR = {};
  function P(x, y, w, h, o) { return Object.assign({ r: [x, y, w, h] }, o || {}); }
  function B(x, y, w, h, s) { return ['box', x, y, w, h, s || {}]; }
  function T(v, x, y, w, h, s) { return ['tx', v, x, y, w, h, s || {}]; }
  function G(x, y, w, h, s) { return ['lg', x, y, w, h, s || {}]; }
  function K(x, y, w, h, s) { return ['mk', x, y, w, h, s || {}]; }
  function S(x, y, w, h, s) { return ['sg', x, y, w, h, s || {}]; }
  function I(x, y, w, h, s) { return ['in', x, y, w, h, s || {}]; }
  function def(brand, years, spec) {
    (Array.isArray(years) ? years : [years]).forEach(function (y) { D[brand + ':' + y] = spec; (BR[brand] = BR[brand] || []).push(y); });
  }
  function range(a, b) { var o = []; for (var y = a; y <= b; y++) o.push(y); return o; }
  var WH = '#fbfaf6', CREAM = '#efe6cc', GRAY = '#cfcac0';
  var BK = { early: { st: '#cdc6b4', ink: '#222', hd: '#b3261e', hi: '#fff', bx: '#e8e0cc' },
    gray: { st: '#c9c1ad', ink: '#1f1f1f', hd: '#2f6b3a', hi: '#fff', bx: '#ece4cf' },
    white: { st: '#f4f2ec', ink: '#1b1b1b', hd: 't1', hi: 'i1', bx: '#ffffff' } };
  function bk(base, o) { return Object.assign({}, BK[base], o || {}); }

  // ── Topps ──────────────────────────────────────────────────────────────────────────────────────────────────
  // 1951: the Red Backs and Blue Backs, small game cards: the photograph in a diamond on a card quartered in color
  // (the play printed in two corners is left out: the game keeps its own plays)
  def('topps', 1951, [
    { bg: 'linear-gradient(135deg,#f6d33c 0 50%,#fbf6e6 50% 100%)', ph: P(5, 6, 90, 94, { s: 'diamond', f: 'bw', b: '0 0 0 1.2cqw #c8352b' }),
      L: [B(0, 0, 100, 140, { bg: 'linear-gradient(135deg,transparent 0 62%,#c8352b 62% 64%,transparent 64%)' }),
        T('fn', 6, 104, 54, 7, { f: 'blk', z: 5, c: '#111', up: 1 }), T('LN', 6, 110, 54, 10, { f: 'blk', z: 7.4, c: '#111' }),
        T('ft', 6, 121, 60, 7, { f: 'cond', z: 4.6, c: '#c8352b', up: 1 }), T('ps', 70, 121, 26, 7, { f: 'cond', z: 4.6, c: '#111', up: 1, al: 'r' })],
      bk: bk('early', { st: '#b3261e', ink: '#fff', hd: '#fff', hi: '#b3261e', bx: '#d84a3a', pn: 'fact' }), sure: 'a', note: 'Red Backs' },
    { bg: 'linear-gradient(135deg,#f6d33c 0 50%,#fbf6e6 50% 100%)', ph: P(5, 6, 90, 94, { s: 'diamond', f: 'bw', b: '0 0 0 1.2cqw #1f4e9a' }),
      L: [B(0, 0, 100, 140, { bg: 'linear-gradient(135deg,transparent 0 62%,#1f4e9a 62% 64%,transparent 64%)' }),
        T('fn', 6, 104, 54, 7, { f: 'blk', z: 5, c: '#111', up: 1 }), T('LN', 6, 110, 54, 10, { f: 'blk', z: 7.4, c: '#111' }),
        T('ft', 6, 121, 60, 7, { f: 'cond', z: 4.6, c: '#1f4e9a', up: 1 }), T('ps', 70, 121, 26, 7, { f: 'cond', z: 4.6, c: '#111', up: 1, al: 'r' })],
      bk: bk('early', { st: '#1f4e9a', ink: '#fff', hd: '#fff', hi: '#1f4e9a', bx: '#3d6cb8', pn: 'fact' }), sure: 'a', note: 'Blue Backs' }
  ]);
  // 1952: the colored portrait to a thin cream edge, the team's mark in a box at the lower left, the name in a
  // panel with stars at its corners and the signature under it
  var STAR = 'polygon(50% 0,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)';
  def('topps', 1952, { bg: '#e9dfc6', ph: P(3, 3, 94, 134, { f: 'paint' }),
    L: [B(5, 106, 24, 26, { bg: '#f4ecd6', sh: '0 0 0 .6cqw #2a2015' }), G(7, 108, 20, 22),
      B(31, 116, 64, 20, { bg: '#f4ecd6', sh: 'inset 0 0 0 .5cqw #2a2015' }), B(32.5, 117, 3, 3, { bg: '#c8352b', cp: STAR }), B(90.5, 117, 3, 3, { bg: '#c8352b', cp: STAR }),
      T('NM', 36, 117, 54, 8, { f: 'blk', z: 5.4, c: '#1d1d1d', al: 'c' }), S(34, 124, 58, 11, { c: '#1d1d1d', z: 8 })],
    bk: bk('early', { pn: 'fact' }), sure: 'a' });
  // 1953: the painted portrait to a thin white edge; the team's mark on a diamond and the name in a black panel along
  // the foot, the position and the team in italic under the name
  def('topps', 1953, { bg: WH, ph: P(3, 3, 94, 134, { f: 'paint' }),
    L: [B(5, 106, 20, 20, { bg: 't1', rot: 45, sh: '0 0 0 .6cqw #fff' }), G(7, 108, 16, 16),
      B(24, 116, 73, 21, { bg: '#111' }), T('nm', 27, 117, 67, 10, { f: 'blk', z: 7, c: '#fff' }),
      T('pf', 27, 128, 28, 7, { f: 'cond', z: 4.4, c: '#f2c84b', it: 1 }), T('FT', 50, 128, 44, 7, { f: 'cond', z: 4.4, c: '#f2c84b', al: 'r' })],
    bk: bk('early', { pn: 'quiz' }), sure: 'a', note: 'painted fronts' });
  // 1954: a solid color card, the name in white across the top beside the team's mark, a large portrait with the
  // signature, and a small action picture
  def('topps', 1954, { bg: 'solid', ph: P(3, 22, 94, 115, { f: 'tint', bg: 'solid' }),
    L: [G(3, 2, 17, 18), T('NM', 22, 3, 74, 9, { f: 'blk', z: 7, c: '#fff' }), T('pf', 22, 12, 22, 7, { f: 'cond', z: 4.6, c: '#fff', it: 1 }),
      T('FT', 44, 12, 52, 7, { f: 'blk', z: 4.8, c: '#fff', al: 'r' }), I(62, 22, 34, 48, { f: 'tint', sh: '0 0 0 .6cqw rgba(255,255,255,.7)' }),
      S(30, 116, 66, 16, { c: '#1d1d1d', z: 10 })],
    bk: bk('gray', { hd: '#2f6b3a', pn: 'cartoon' }), sure: 'a' });
  // 1955: a portrait and an action picture on one color, the name, position and team in a white band along the foot,
  // the team's mark on a diamond at the upper right (a horizontal card, drawn upright)
  def('topps', 1955, { bg: 'field', ph: P(3, 3, 94, 118, { f: 'paint', bg: 'field' }),
    L: [B(76, 4, 18, 18, { bg: '#fff', rot: 45, sh: '0 0 0 .6cqw t1' }), G(78, 6, 14, 14), S(34, 92, 58, 14, { c: '#1d1d1d', z: 9 }),
      B(3, 121, 94, 16, { bg: '#fff' }), T('NM', 5, 122, 34, 14, { f: 'blk', z: 5, c: '#111' }), T('pf', 40, 122, 18, 14, { f: 'cond', z: 4.4, c: '#c8352b', it: 1 }),
      T('FT', 58, 122, 37, 14, { f: 'blk', z: 4.4, c: '#1f4e9a', al: 'r' })],
    bk: bk('gray', { hd: '#3a6f9b', pn: 'cartoon' }), sure: 'a', note: 'a horizontal card in real life, drawn upright' });
  // 1956: the name on a colored tab at the top left with the position and team under it, the team's mark, a large
  // portrait over an action scene (a horizontal card, drawn upright)
  def('topps', 1956, { bg: WH, ph: P(3, 3, 94, 134, { f: 'paint' }),
    L: [B(5, 5, 58, 8, { bg: 't1' }), T('NM', 6, 5, 56, 8, { f: 'blk', z: 5, c: 'i1' }), B(5, 13, 58, 6, { bg: '#c8352b' }),
      T('pf', 6, 13, 22, 6, { f: 'cond', z: 4.2, c: '#fff', it: 1 }), T('FT', 28, 13, 34, 6, { f: 'cond', z: 4.2, c: '#fff', al: 'r' }),
      G(70, 5, 24, 22), I(5, 88, 38, 46, { rd: 1, sh: '0 0 0 .8cqw #fff' })],
    bk: bk('gray', { pn: 'cartoon' }), sure: 'a', note: 'a horizontal card in real life, drawn upright' });
  // 1957: the first full-color photographs, to a white edge, with the name and team lettered on the photograph
  def('topps', 1957, { bg: WH, ph: P(4, 4, 92, 132, {}),
    L: [B(4, 112, 92, 24, { bg: 'linear-gradient(0deg,rgba(0,0,0,.35),transparent)' }),
      T('FN', 7, 118, 30, 8, { f: 'blk', z: 6, c: 't2', sh: 1 }), T('ln', 37, 118, 56, 8, { f: 'blk', z: 6.6, c: 't2', sh: 1 }),
      T('FT', 7, 127, 64, 7, { f: 'blk', z: 4.6, c: 't1', sh: 2 }), T('ps', 70, 127, 23, 7, { f: 'blk', z: 4.6, c: 't1', al: 'r', sh: 2 })],
    bk: bk('gray', { hd: '#24467a' }), sure: 'a' });
  // 1958: the player on a plain color, the name across the top in white, the position and team in a band along the
  // foot, the team's mark at the lower right
  def('topps', 1958, { bg: 'solid', ph: P(4, 18, 92, 104, { f: 'tint', bg: 'solid' }),
    L: [T('nm', 5, 4, 90, 13, { f: 'pag', z: 9, c: '#fff', al: 'c' }), G(74, 98, 22, 22),
      B(4, 124, 92, 12, { bg: '#c8352b' }), T('PF', 6, 124, 30, 12, { f: 'blk', z: 4.6, c: '#fff' }), T('FT', 36, 124, 58, 12, { f: 'blk', z: 4.8, c: '#f6d33c', al: 'r' })],
    bk: bk('gray', { hd: '#c25a1f' }), sure: 'a', note: 'real cards set the player on a plain color, which a photograph here can only approach' });
  // 1959: the player in a circle on a pastel card, the name across the top in lowercase, the signature in the circle,
  // the team's mark at the lower left, the team and position at the lower right
  def('topps', 1959, { bg: 'field', ph: P(4, 16, 92, 92, { s: 'circle', b: '0 0 0 1cqw #fff' }),
    L: [T('nm', 6, 3, 88, 12, { f: 'blk', z: 9, c: '#1d1d1d', w: 600, lo: 1 }), S(12, 92, 76, 14, { c: '#1d1d1d', z: 10 }),
      G(5, 112, 20, 20), T('FT', 26, 116, 70, 8, { f: 'blk', z: 5, c: '#1d1d1d', al: 'r' }), T('PF', 26, 124, 70, 7, { f: 'blk', z: 4.6, c: '#1d1d1d', al: 'r' })],
    bk: bk('gray', { hd: '#a23a2d', pn: 'quiz' }), sure: 'a' });
  // 1960: a color portrait with a black-and-white action picture, the name in large letters on a colored band along
  // the foot with the team and position under it, the team's mark on the band (a horizontal card, drawn upright)
  def('topps', 1960, { bg: WH, ph: P(3, 3, 94, 106, {}),
    L: [I(4, 4, 36, 50, { f: 'bw', sh: '0 0 0 .6cqw #fff' }), B(3, 109, 94, 28, { bg: 't1' }), G(5, 112, 18, 18),
      T('NM', 25, 110, 70, 15, { f: 'blk', z: 10, c: '#f6d33c', al: 'c' }), T('FT', 25, 126, 48, 8, { f: 'cond', z: 4.6, c: '#fff' }), T('PF', 72, 126, 23, 8, { f: 'cond', z: 4.6, c: '#fff', al: 'r' })],
    bk: bk('gray', { hd: '#2f6b3a', pn: 'cartoon' }), sure: 'a', note: 'a horizontal card in real life, drawn upright' });
  // 1961: the photograph to a white edge, the name and position on a colored band at the lower left, the team in a
  // box of its own at the lower right
  def('topps', 1961, { bg: WH, ph: P(4, 4, 92, 132, { b: '0 0 0 .4cqw #222' }),
    L: [B(5, 119, 62, 16, { bg: '#c8352b', sh: '0 0 0 .5cqw #111' }), T('NM', 7, 119, 58, 10, { f: 'blk', z: 6, c: '#fff', al: 'c' }), T('pf', 7, 128, 58, 6, { f: 'cond', z: 4.4, c: '#f6d33c', al: 'c' }),
      B(68, 119, 27, 16, { bg: '#f6d33c', sh: '0 0 0 .5cqw #111' }), T('ct', 69, 119, 25, 8, { f: 'cond', z: 4.4, c: '#c8352b', al: 'c' }), T('tm', 69, 126, 25, 8, { f: 'cond', z: 4.6, c: '#c8352b', al: 'c' })],
    bk: bk('gray', { hd: '#2f6b3a' }), sure: 'a' });
  // 1962: wood grain round the photograph, its lower right corner curled up, the name lettered small at the lower right
  def('topps', 1962, { bg: 'wood', ph: P(5, 5, 90, 126, { s: 'curl', b: '0 0 0 .6cqw #2a1a0c' }),
    L: [T('FN', 40, 108, 42, 7, { f: 'blk', z: 4.6, c: '#fff', al: 'r', sh: 1 }), T('LN', 40, 114, 42, 10, { f: 'blk', z: 7, c: '#fff', al: 'r', ls: '.12em', sh: 1 }),
      T('FT', 20, 124, 52, 6, { f: 'cond', z: 4.2, c: '#fff', al: 'r', sh: 1 }), T('ps', 72, 124, 10, 6, { f: 'cond', z: 4.2, c: '#fff', al: 'r', sh: 1 })],
    bk: bk('gray', { hd: '#7a3d8f' }), sure: 'a', note: 'wood grain' });
  // 1963: the photograph over a colored band holding the first name small and the last name large, a second picture
  // in a colored circle at the lower right
  def('topps', 1963, { bg: WH, ph: P(4, 4, 92, 108, {}),
    L: [B(4, 112, 92, 24, { bg: 't2' }), I(58, 96, 36, 36, { s: 'circle', sh: '0 0 0 1.2cqw t1' }), T('FN', 7, 113, 48, 6, { f: 'blk', z: 4.4, c: '#fff' }),
      T('LN', 7, 119, 50, 10, { f: 'blk', z: 9, c: '#fff' }), T('FT', 7, 129, 40, 6, { f: 'cond', z: 4.2, c: '#fff' }), T('ps', 44, 129, 12, 6, { f: 'cond', z: 4.2, c: '#fff', al: 'r' })],
    bk: bk('gray', { st: '#e9b9a7', hd: '#3a3a3a' }), sure: 'a' });
  // 1964: the team's name in large letters across the top, the photograph, the name and position on a dark band
  def('topps', 1964, { bg: WH, ph: P(4, 19, 92, 103, {}),
    L: [T('TM', 4, 2, 92, 17, { f: 'bung', z: 14, c: 't1', al: 'c' }), B(4, 122, 92, 14, { bg: '#1d1d1d' }),
      T('nm', 7, 122, 52, 14, { f: 'blk', z: 6, c: '#f6d33c' }), T('pf', 60, 122, 33, 14, { f: 'blk', z: 5.4, c: '#fff', al: 'r' })],
    bk: bk('gray', { st: '#d6c79a', hd: '#c04a2a', pn: 'quiz' }), sure: 'a' });
  // 1965: the photograph in a thick colored frame, a pennant with the team's name at the lower left, the position and
  // name at the lower right
  def('topps', 1965, { bg: 't2', ph: P(6, 5, 88, 110, { b: '0 0 0 1.2cqw #fff' }),
    L: [B(2, 106, 52, 22, { bg: '#f6d33c', cp: 'polygon(0 0,100% 30%,100% 70%,0 100%)', sh: '0 0 0 .5cqw #111' }), T('TM', 5, 109, 36, 16, { f: 'blk', z: 7.4, c: '#c8352b' }),
      T('PF', 48, 119, 46, 7, { f: 'blk', z: 4.6, c: '#fff', al: 'r' }), T('NM', 40, 126, 54, 10, { f: 'blk', z: 6.4, c: '#fff', al: 'r' })],
    bk: bk('gray', { hd: '#1e5f8b' }), sure: 'a' });
  // 1966: the team's name on a band across the upper left corner, the name and position on a colored strip at the foot
  def('topps', 1966, { bg: WH, ph: P(4, 4, 92, 118, {}),
    L: [B(-10, 13, 60, 11, { bg: 't2', rot: -45, sh: '0 0 0 .5cqw #111' }), T('TM', -6, 13, 52, 11, { f: 'blk', z: 6.6, c: 'i2', al: 'c', rot: -45 }),
      B(4, 122, 92, 14, { bg: 't2' }), T('NM', 7, 122, 56, 14, { f: 'blk', z: 6.6, c: 'i2' }), T('pf', 62, 122, 32, 14, { f: 'cond', z: 5, c: 'i2', al: 'r' })],
    bk: bk('gray', { hd: '#2b2b2b' }), sure: 'a' });
  // 1967: the photograph nearly to the edge, the name and position small at the top, the team's name large at the
  // foot, a signature
  def('topps', 1967, { bg: WH, ph: P(4, 4, 92, 132, {}),
    L: [T('NM', 7, 6, 62, 7, { f: 'blk', z: 5, c: '#fff', sh: 1 }), T('ps', 70, 6, 20, 7, { f: 'blk', z: 5, c: '#f6d33c', sh: 1 }),
      S(6, 84, 60, 18, { c: '#1d1d1d', z: 10 }), T('TM', 6, 115, 88, 19, { f: 'bung', z: 13, c: 't2', sh: 3 })],
    bk: bk('gray', { st: '#d1c3a2', hd: '#2a6b37' }), sure: 'a' });
  // 1968: burlap round a rounded photograph, the name lettered at the lower left, a circle with the position and team
  def('topps', 1968, { bg: 'burlap', ph: P(6, 6, 88, 112, { s: 'rd', b: '0 0 0 .8cqw #1d1d1d' }),
    L: [B(64, 106, 30, 30, { bg: 't1', rd: 50, sh: '0 0 0 .9cqw #fff' }), T('PF', 65, 112, 28, 7, { f: 'blk', z: 4, c: '#fff', al: 'c' }), T('TM', 65, 119, 28, 9, { f: 'blk', z: 6, c: '#fff', al: 'c' }),
      T('FN', 8, 119, 54, 7, { f: 'blk', z: 4.6, c: '#1d1d1d' }), T('LN', 8, 125, 54, 11, { f: 'blk', z: 8, c: '#c8352b' })],
    bk: bk('gray', { st: '#d9c88f', hd: '#7d3b2a' }), sure: 'a', note: 'burlap' });
  // 1969: the photograph with rounded corners, a circle at the upper right with the name and position, the team's
  // name large across the foot
  def('topps', 1969, { bg: WH, ph: P(4, 4, 92, 120, { s: 'rd', b: '0 0 0 .5cqw #1d1d1d' }),
    L: [B(64, 5, 30, 30, { bg: 't2', rd: 50, sh: '0 0 0 .6cqw #1d1d1d' }), T('FN', 65, 11, 28, 6, { f: 'blk', z: 4, c: 'i2', al: 'c' }), T('LN', 65, 17, 28, 8, { f: 'blk', z: 5.6, c: 'i2', al: 'c' }),
      T('pf', 65, 25, 28, 5, { f: 'cond', z: 3.8, c: 'i2', al: 'c' }), T('TM', 6, 118, 88, 18, { f: 'bung', z: 12, c: '#f6d33c', al: 'c', sh: 3 })],
    bk: bk('gray', { st: '#e7b4b9', hd: '#2b2b2b' }), sure: 'a' });
  // 1970: gray borders, the team's name in large letters over the top of the photograph, the name and position on a
  // white strip at the foot
  def('topps', 1970, { bg: '#8f9197', ph: P(6, 6, 88, 116, { b: '0 0 0 .7cqw #fff' }),
    L: [T('TM', 30, 7, 62, 14, { f: 'blk', z: 11, c: 't1', al: 'r', sh: 2 }), B(6, 124, 88, 11, { bg: '#fff' }),
      T('nm', 8, 124, 64, 11, { f: 'scr', z: 8, c: '#1d1d1d' }), T('PF', 70, 124, 22, 11, { f: 'blk', z: 4.6, c: 't1', al: 'r' })],
    bk: bk('gray', { st: '#cfd8e3', hd: '#1f3f78' }), sure: 'a', note: 'gray borders' });
  // 1971: black borders, the team's name in large colored letters at the top, the name and position under it, a
  // signature on the photograph
  def('topps', 1971, { bg: '#111', ph: P(6, 24, 88, 110, { b: '0 0 0 .5cqw #fff' }),
    L: [T('TM', 5, 2, 90, 13, { f: 'bung', z: 10, c: 'color-mix(in srgb,t1 55%,#fff)', al: 'c' }), T('nm', 6, 15, 56, 8, { f: 'blk', z: 5.6, c: '#f6d33c', lo: 1 }),
      T('pf', 62, 15, 32, 8, { f: 'blk', z: 5.4, c: '#fff', al: 'r', lo: 1 }), S(10, 114, 76, 16, { c: '#1d1d1d', z: 10 })],
    bk: bk('gray', { st: '#cdbf98', hd: '#111' }), sure: 'a', note: 'black borders' });
  // 1972: a tombstone arch inside a bright frame, the team's name in large colored letters across its top, the name on
  // a small plate at the foot
  def('topps', 1972, { bg: 't1', ph: P(9, 14, 82, 108, { s: 'arch', b: '0 0 0 1cqw #f6d33c' }),
    L: [T('TM', 4, 4, 92, 20, { f: 'bung', z: 13, c: 't2', al: 'c', sh: 3 }), B(20, 124, 60, 10, { bg: '#fff', rd: '3cqw', sh: '0 0 0 .6cqw #f6d33c' }),
      T('NM', 21, 124, 58, 10, { f: 'pag', z: 5, c: '#1d1d1d', al: 'c' })],
    bk: bk('gray', { st: '#dcd0a8', hd: '#2a63a5' }), sure: 'a', note: 'the arched frame and the team name in bright letters' });
  // 1973: the first name small and the last name large in color at the lower left, the team under them, a circle with
  // the position at the lower right
  def('topps', 1973, { bg: WH, ph: P(4, 4, 92, 108, {}),
    L: [B(72, 98, 24, 24, { bg: '#c8352b', rd: 50, sh: '0 0 0 .8cqw #fff' }), T('ps', 73, 105, 22, 10, { f: 'blk', z: 6, c: '#fff', al: 'c' }),
      T('FN', 5, 112, 60, 6, { f: 'blk', z: 4.6, c: 't1' }), T('LN', 5, 118, 60, 10, { f: 'blk', z: 8.6, c: 't1' }), T('FT', 5, 129, 64, 7, { f: 'blk', z: 4.4, c: '#1d1d1d' }),
      T('PF', 66, 129, 30, 7, { f: 'blk', z: 4.4, c: '#1d1d1d', al: 'r' })],
    bk: bk('gray', { st: '#d0c3a0', hd: '#8a3b1d', pn: 'cartoon' }), sure: 'a' });
  // 1974: the city on a band at the top with the position, the photograph in a rounded frame, the name at the lower
  // left and the team's name on a pennant at the lower right
  def('topps', 1974, { bg: WH, ph: P(6, 15, 88, 104, { s: 'rd', b: '0 0 0 1cqw #f6d33c' }),
    L: [B(4, 4, 56, 10, { bg: 't1', cp: 'polygon(0 0,100% 0,88% 100%,0 100%)' }), T('CT', 6, 4, 48, 10, { f: 'blk', z: 5.6, c: 'i1' }), T('PF', 60, 4, 34, 10, { f: 'blk', z: 4.6, c: '#1d1d1d', al: 'r' }),
      T('FN', 6, 120, 40, 6, { f: 'blk', z: 4, c: '#1d1d1d' }), T('LN', 6, 125, 44, 10, { f: 'blk', z: 6.6, c: '#1d1d1d' }),
      B(50, 120, 46, 16, { bg: 't2', cp: 'polygon(12% 0,100% 0,100% 100%,12% 100%,0 50%)' }), T('TM', 56, 120, 38, 16, { f: 'blk', z: 6.4, c: 'i2', al: 'c' })],
    bk: bk('gray', { st: '#cde0c4', hd: '#7b2b2b', pn: 'cartoon' }), sure: 'a' });
  // 1975: two-color borders, the team's name in large letters at the top, the position in a baseball at the photo's
  // lower right, the name across the foot, a signature
  def('topps', 1975, { bg: 'two', ph: P(9, 17, 82, 106, { b: '0 0 0 .8cqw #fff' }),
    L: [T('TM', 6, 2, 88, 15, { f: 'bung', z: 11, c: 'i1' }), B(74, 108, 20, 20, { bg: '#fff', rd: 50, sh: '0 0 0 .6cqw #111' }), T('ps', 74, 113, 20, 10, { f: 'blk', z: 5.6, c: '#111', al: 'c' }),
      S(14, 102, 60, 14, { c: '#1d1d1d', z: 8 }), T('NM', 6, 124, 70, 12, { f: 'blk', z: 6.6, c: 'i2' })],
    bk: bk('gray', { st: '#e6c1c9', hd: '#2b5d8f' }), sure: 'a', note: 'two-color borders' });
  // 1976: the photograph in a thin frame, the name on a colored stripe and the team's name larger on a second stripe
  // under it, the position in a badge at the lower left
  def('topps', 1976, { bg: WH, ph: P(4, 4, 92, 108, { b: '0 0 0 .6cqw #1d1d1d' }),
    L: [B(4, 112, 92, 11, { bg: '#c8352b' }), B(4, 123, 92, 13, { bg: '#f6d33c' }), T('NM', 26, 112, 68, 11, { f: 'blk', z: 6, c: '#fff', al: 'c' }),
      T('TM', 26, 123, 68, 13, { f: 'bung', z: 7, c: '#c8352b', al: 'c' }), B(4, 106, 20, 28, { bg: 't1', cp: 'polygon(50% 0,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)' }),
      T('ps', 4, 116, 20, 9, { f: 'blk', z: 4.6, c: 'i1', al: 'c' })],
    bk: bk('gray', { st: '#d6cbaa', hd: '#2f6b3a' }), sure: 'a' });
  // 1977: the team's name in colored letters at the top left with the name under it, the position on a pennant at the
  // upper right, a signature on the photograph
  def('topps', 1977, { bg: WH, ph: P(4, 19, 92, 117, {}),
    L: [T('TM', 5, 2, 66, 11, { f: 'blk', z: 9.4, c: 't1', it: 1 }), T('NM', 5, 12, 66, 7, { f: 'blk', z: 5, c: '#1d1d1d' }),
      B(70, 4, 26, 12, { bg: 't2', cp: 'polygon(0 0,100% 50%,0 100%)', rot: -12 }), T('PF', 70, 4, 22, 12, { f: 'blk', z: 3.8, c: 'i2', rot: -12 }),
      S(8, 112, 50, 18, { c: '#1d1d1d', z: 9 })],
    bk: bk('gray', { st: '#d5c39e', hd: '#7b2b2b', pn: 'cartoon' }), sure: 'a' });
  // 1978: the team's name in script at the lower left in its color, the name at the lower right, the position in a
  // baseball at the upper right
  def('topps', 1978, { bg: WH, ph: P(4, 4, 92, 118, { b: '0 0 0 .6cqw #f6d33c' }),
    L: [B(78, 5, 16, 16, { bg: '#fff', rd: 50, sh: '0 0 0 .5cqw #c8352b' }), T('ps', 78, 8, 16, 10, { f: 'blk', z: 5, c: '#111', al: 'c' }),
      T('tm', 4, 116, 54, 18, { f: 'scr', z: 13, c: 't1', sh: 2 }), T('NM', 52, 124, 44, 12, { f: 'blk', z: 5, c: '#1d1d1d', al: 'r' })],
    bk: bk('gray', { st: '#cbbf9c', hd: '#c04a2a', pn: 'quiz' }), sure: 'a' });
  // 1979: the position in a baseball at the lower left, the name and position over a banner with the team's name
  def('topps', 1979, { bg: WH, ph: P(4, 4, 92, 112, {}),
    L: [B(4, 104, 18, 18, { bg: '#fff', rd: 50, sh: '0 0 0 .6cqw #c8352b' }), T('ps', 4, 108, 18, 10, { f: 'blk', z: 5, c: '#111', al: 'c' }),
      T('NM', 24, 116, 52, 8, { f: 'blk', z: 5.4, c: 't1' }), T('ps', 76, 116, 18, 8, { f: 'blk', z: 5, c: 't1', al: 'r' }),
      B(6, 124, 88, 12, { bg: '#e2642a', cp: 'polygon(0 0,100% 0,96% 50%,100% 100%,0 100%,4% 50%)' }), T('TM', 10, 124, 80, 12, { f: 'bung', z: 7, c: '#1d1d1d', al: 'c' })],
    bk: bk('gray', { st: '#cbbf9c', hd: '#2f6b3a' }), sure: 'a' });
  // 1980: the position on a pennant at the upper left, the name at the upper right, the team's name on a pennant at
  // the lower right, a signature
  def('topps', 1980, { bg: WH, ph: P(4, 12, 92, 124, {}),
    L: [B(3, 3, 32, 13, { bg: '#f6d33c', cp: 'polygon(0 20%,100% 0,100% 100%,0 80%)', rot: -10 }), T('PF', 4, 3, 30, 13, { f: 'blk', z: 4.4, c: '#1d1d1d', al: 'c', rot: -10 }),
      T('NM', 38, 2, 58, 9, { f: 'blk', z: 5.4, c: '#1d1d1d', al: 'r' }),
      B(54, 116, 44, 18, { bg: 't2', cp: 'polygon(0 30%,100% 0,100% 100%,0 70%)', rot: -10 }), T('TM', 58, 116, 38, 18, { f: 'bung', z: 7, c: 'i2', al: 'c', rot: -10 }),
      S(8, 106, 50, 16, { c: '#1d1d1d', z: 9 })],
    bk: bk('gray', { st: '#c9c1ad', hd: '#24467a' }), sure: 'a' });
  // 1981: the photograph in a thin colored frame, a cap at the lower left holding the position and team, the name at
  // the lower right
  def('topps', 1981, { bg: WH, ph: P(5, 5, 90, 120, { b: '0 0 0 .8cqw t1' }),
    L: [B(2, 106, 40, 26, { bg: 't1', rd: '50% 50% 6% 30% / 70% 70% 10% 30%', sh: '0 0 0 .5cqw #1d1d1d' }), T('PF', 4, 113, 34, 6, { f: 'blk', z: 3.8, c: 'i1', al: 'c', rot: -8 }),
      T('TM', 4, 119, 34, 10, { f: 'blk', z: 6.4, c: 'i1', al: 'c', rot: -8 }), T('FN', 44, 124, 50, 6, { f: 'blk', z: 4.4, c: 't1', al: 'r' }), T('LN', 44, 129, 50, 8, { f: 'blk', z: 5.6, c: 't1', al: 'r' }),
      K(78, 109, 16, 10, { c: '#c8352b', bg: '#fff', z: 3.6, rd: '50%' })],
    bk: bk('gray', { st: '#d9cfb8', hd: '#b3261e' }), sure: 'a', note: 'the cap with the team name' });
  // 1982: two stripes in the team's colors down the left and along the foot, the team's name in large letters, the
  // position and name under it, a signature
  def('topps', 1982, { bg: WH, ph: P(10, 4, 85, 100, {}),
    L: [B(5, 4, 34, 104, { sh: 'inset 3.2cqw -3.2cqw 0 t2', rd: '0 0 0 7cqw' }), B(2, 4, 1.3, 122, { bg: 't1' }),
      B(2, 125, 32, 8, { bg: 't1', rd: '0 0 0 1.5cqw' }), T('PF', 3, 125, 30, 8, { f: 'blk', z: 3.8, c: 'i1', al: 'c' }),
      T('TM', 36, 108, 60, 12, { f: 'blk', z: 9, c: 't2', al: 'r' }), T('NM', 36, 120, 60, 13, { f: 'blk', z: 7.4, c: 't1', al: 'r' }),
      S(30, 62, 50, 22, { c: '#1d1d1d', z: 9 }), K(76, 93, 18, 9, { c: '#fff', z: 4.6, it: 1 })],
    bk: bk('gray', { st: '#d6d6c8', hd: '#2a6b37' }), sure: 'a', note: 'hockey sticks' });
  // 1983: the photograph in a colored frame, a second picture in a circle at the lower left, the name, position and
  // team at the lower right
  def('topps', 1983, { bg: '#f4efe2', ph: P(7, 5, 86, 102, { b: '0 0 0 1cqw t2' }),
    L: [B(30, 109, 63, 27, { bg: '#f3ecd9', sh: '0 0 0 .9cqw t1' }), B(30, 126.5, 63, 9.5, { bg: 't1' }),
      I(5, 88, 46, 46, { s: 'circle', sh: '0 0 0 .9cqw #f4efe2, 0 0 0 1.9cqw t2' }),
      T('FN', 52, 109.5, 40, 6, { f: 'blk', z: 4.8, c: 't1', al: 'r' }), T('LN', 52, 115, 40, 6.5, { f: 'blk', z: 5.4, c: 't1', al: 'r' }),
      T('PF', 52, 121.5, 40, 5, { f: 'cond', z: 3.6, c: '#222', al: 'r' }), T('TM', 52, 126.5, 40, 9.5, { f: 'blk', z: 6.4, c: 'i1', al: 'r' }),
      K(72, 2.5, 20, 7, { c: 't2', z: 4.4, it: 1 })],
    bk: bk('gray', { st: '#d6c7a1', hd: '#c25a1f' }), sure: 'a' });
  // 1984: the team's name down the left side in large colored letters, a second picture at the lower left, the name and
  // position at the lower right
  def('topps', 1984, { bg: WH, ph: P(18, 4, 78, 118, {}),
    L: [T('TM', -45, 50, 122, 15, { f: 'bung', z: 13, c: 't1', rot: -90, al: 'c' }), I(4, 100, 32, 34, { sh: '0 0 0 .8cqw t2' }),
      T('NM', 38, 124, 58, 7, { f: 'blk', z: 4.8, c: 't1', al: 'r' }), T('ps', 38, 130, 58, 6, { f: 'blk', z: 4.4, c: '#1d1d1d', al: 'r' }), K(78, 6, 16, 7, { c: '#fff', z: 3.4 })],
    bk: bk('gray', { st: '#d0c8b0', hd: '#6d2f8a' }), sure: 'a' });
  // 1985: the photograph to a thin frame, the team's name in large letters on a slanted band across the lower left, the
  // team's mark in a circle at the lower right, the name under it
  def('topps', 1985, { bg: WH, ph: P(4, 4, 92, 126, { b: '0 0 0 .5cqw #1d1d1d' }),
    L: [B(2, 112, 70, 14, { bg: 't1', rot: -8, sh: '0 0 0 .5cqw #fff' }), T('TM', 4, 112, 66, 14, { f: 'bung', z: 9, c: 'i1', al: 'c', rot: -8 }),
      B(72, 106, 24, 24, { bg: '#fff', rd: 50, sh: '0 0 0 .7cqw t1' }), G(75, 109, 18, 18), T('NM', 40, 131, 56, 6, { f: 'blk', z: 4.4, c: '#1d1d1d', al: 'r' }),
      T('ps', 30, 126, 10, 5, { f: 'blk', z: 3.6, c: '#1d1d1d' }), K(6, 6, 14, 7, { c: '#fff', z: 3.4 })],
    bk: bk('gray', { st: '#d3c39d', hd: '#b3261e' }), sure: 'a' });
  // 1986: a black band at the top with the team's name, white below, the position in a circle at the photo's lower
  // left, the name spaced out along the foot
  def('topps', 1986, { bg: WH, ph: P(5, 19, 90, 107, {}),
    L: [B(0, 0, 100, 18, { bg: '#111' }), T('TM', 4, 1, 92, 17, { f: 'bung', z: 13, c: 'color-mix(in srgb,t1 55%,#fff)', al: 'c' }),
      B(7, 112, 12, 12, { bg: 't1', rd: 50, sh: '0 0 0 .5cqw #fff' }), T('ps', 7, 114, 12, 8, { f: 'blk', z: 4, c: 'i1', al: 'c' }),
      T('NM', 5, 127, 90, 9, { f: 'blk', z: 6, c: '#1d1d1d', al: 'c', ls: '.18em' }), K(80, 20, 14, 7, { c: '#fff', z: 3.4 })],
    bk: bk('gray', { st: '#ccbfa6', hd: '#b3261e' }), sure: 'a', note: 'the black band at the top' });
  // 1987: wood grain round the photograph, the team's mark in a circle at the upper left, the name on a colored plate
  // across the foot
  def('topps', 1987, { bg: 'oak', ph: P(6, 6, 88, 114, { b: '0 0 0 .6cqw #1f140a' }),
    L: [B(3, 3, 24, 24, { bg: 't1', rd: 50, sh: '0 0 0 .9cqw #fff, 0 0 0 1.4cqw #1f140a' }), G(6.5, 6.5, 17, 17),
      B(30, 120, 46, 14, { bg: 't1', sh: '0 0 0 .5cqw #1f140a' }), T('NM', 31, 120, 44, 14, { f: 'blk', z: 5.8, c: 'i1', al: 'c', sh: 1 }),
      K(8, 124, 18, 8, { c: '#1d1d1d', z: 4.6, it: 1 })],
    bk: bk('gray', { st: '#c9b98f', hd: '#2a4f8f' }), sure: 'a', note: 'wood grain' });
  // 1988: the photograph to a thin frame, the team's name in large outlined letters over its top, the name on a slanted
  // band at the lower right
  def('topps', 1988, { bg: WH, ph: P(4, 4, 92, 132, { b: '0 0 0 .6cqw t1' }),
    L: [T('TM', 5, 4, 90, 17, { f: 'bung', z: 13, c: 't2', al: 'c', sh: 3 }), B(42, 112, 62, 14, { bg: 't1', rot: -34, sh: '0 0 0 .5cqw #fff' }),
      T('NM', 46, 112, 54, 14, { f: 'blk', z: 5, c: 'i1', al: 'c', rot: -34 }), K(6, 126, 14, 7, { c: '#fff', z: 3.4 })],
    bk: bk('gray', { st: '#e3c09a', hd: '#c25a1f' }), sure: 'a' });
  // 1989: the photograph in a rounded colored frame, the team's name in script at the lower right, the name on a
  // banner under it
  def('topps', 1989, { bg: WH, ph: P(4, 4, 92, 126, { s: 'rd', b: '0 0 0 .8cqw t2' }),
    L: [T('tm', 34, 104, 60, 18, { f: 'scr', z: 15, c: 't1', al: 'r', sh: 2 }), B(22, 121, 74, 11, { bg: 't2', rd: '40% 40% 40% 40% / 100% 100% 30% 30%', sh: '0 0 0 .5cqw #fff' }),
      T('NM', 24, 121, 70, 11, { f: 'blk', z: 5, c: 'i2', al: 'c' }), K(6, 6, 14, 7, { c: '#fff', z: 3.4 })],
    bk: bk('gray', { st: '#e7b5b6', hd: '#2b2b2b' }), sure: 'a' });
  // 1990: bright two-color speckled borders, the team's name in italic letters at the top left, the name on a colored
  // band along the foot
  def('topps', 1990, { bg: 'dots', ph: P(7, 7, 86, 117, { b: '0 0 0 .9cqw t2' }),
    L: [T('TM', 9, 6, 66, 14, { f: 'cond8', z: 11.5, c: 'color-mix(in srgb,t2 55%,#fff)', sh: 3 }), B(18, 124, 75, 10, { bg: 't2', sh: '0 0 0 .5cqw #111' }),
      T('NM', 20, 124, 71, 10, { f: 'blk', z: 5.4, c: 'i2', al: 'r', it: 1 }), K(76, 9, 16, 7, { c: '#fff', z: 4.2, it: 1 })],
    bk: bk('gray', { st: '#e7b24f', hd: '#2b2b2b' }), sure: 'a', note: 'speckled two-color borders' });
  // 1991: the fortieth year: white borders, the photograph in a double colored line, the team's name in script on the
  // photograph's lower right, the position and the name along the foot
  def('topps', 1991, { bg: WH, ph: P(6, 6, 88, 120, { b: '0 0 0 .5cqw t1, 0 0 0 1.2cqw #fff, 0 0 0 1.7cqw t2' }),
    L: [T('tm', 40, 108, 52, 16, { f: 'scr', z: 12, c: 't1', al: 'r', sh: 2 }), T('ps', 6, 129, 14, 7, { f: 'pag', z: 4.2, c: '#1d1d1d' }),
      T('NM', 20, 129, 74, 7, { f: 'pag', z: 4.6, c: '#1d1d1d', al: 'r' }), B(6, 6, 16, 14, { bg: '#c9a33a', rd: 1.5, sh: '0 0 0 .5cqw #fff' }), T('yr', 6, 8, 16, 10, { f: 'blk', z: 4.6, c: '#111', al: 'c' })],
    bk: bk('gray', { st: '#d9c08a', hd: '#b3261e' }), sure: 'a', note: 'the fortieth year' });
  // 1992: white borders, the photograph in a frame of three colored lines, the name spaced out in a colored box at the
  // lower left and the team in a box at the lower right
  def('topps', 1992, { bg: WH, ph: P(7, 6, 86, 116, { b: '0 0 0 .5cqw #111, 0 0 0 1.1cqw #e2642a, 0 0 0 1.6cqw #f6d33c' }),
    L: [B(8, 120, 52, 9, { bg: 't1', sh: '0 0 0 .4cqw #fff' }), T('NM', 9, 120, 50, 9, { f: 'blk', z: 4, c: 'i1', al: 'c', ls: '.14em' }),
      B(62, 122, 32, 10, { bg: '#f6d33c', sh: '0 0 0 .4cqw #111' }), T('tm', 63, 122, 30, 10, { f: 'scr', z: 6, c: '#1d1d1d', al: 'c' })],
    bk: bk('white', { st: '#e9e4d6' }), sure: 'a' });
  // 1993: white borders, the name spaced out on a dark band with angled ends at the foot, the team's name under it
  def('topps', 1993, { bg: WH, ph: P(4, 4, 92, 116, {}),
    L: [B(4, 116, 92, 10, { bg: '#1d1d1d', cp: 'polygon(0 0,100% 0,94% 100%,6% 100%)' }), B(4, 112, 92, 4, { bg: '#c8352b', cp: 'polygon(0 0,100% 0,100% 100%,0 100%)' }),
      T('NM', 8, 116, 84, 10, { f: 'pag', z: 4.8, c: '#fff', al: 'c', ls: '.2em' }), T('TM', 8, 127, 84, 8, { f: 'blk', z: 5, c: 't1', al: 'c' })],
    bk: bk('white', {}), sure: 'a' });
  // 1994: the photograph to a thin white edge, the name in script over a slanted colored strip at the lower left, the
  // team and position under it
  def('topps', 1994, { bg: WH, ph: P(3, 3, 94, 134, {}),
    L: [B(-2, 116, 74, 10, { bg: 't1', rot: -6, sh: '0 0 0 .5cqw #fff' }), T('nm', 4, 110, 66, 14, { f: 'scr', z: 9, c: '#fff', sh: 1, rot: -6 }),
      B(3, 128, 94, 9, { bg: '#fff' }), T('TM', 5, 128, 60, 9, { f: 'blk', z: 4.6, c: '#1d1d1d' }), T('ps', 70, 128, 25, 9, { f: 'blk', z: 4.6, c: '#1d1d1d', al: 'r' })],
    bk: bk('white', {}), sure: 'a' });
  // 1995: a cream border torn ragged round the photograph, the name in script at the lower left, the position and team
  // spaced out along the foot
  def('topps', 1995, { bg: '#efe6cc', ph: P(5, 5, 90, 118, { b: '0 0 0 .8cqw rgba(201,163,58,.6)' }),
    L: [T('nm', 6, 112, 70, 13, { f: 'scr', z: 9, c: '#1d1d1d', sh: 2 }), T('PF', 6, 127, 28, 8, { f: 'pag', z: 3.8, c: '#8a6b1f', ls: '.2em' }),
      T('FT', 34, 127, 60, 8, { f: 'pag', z: 3.8, c: '#8a6b1f', al: 'r', ls: '.2em' })],
    bk: bk('white', {}), sure: 'a' });
  // 1996: the photograph nearly to the edge inside a thin white border, the team's mark at the upper left, the name on a
  // dark band at the lower right
  def('topps', 1996, { bg: WH, ph: P(3, 3, 94, 134, {}),
    L: [G(6, 6, 16, 16), B(28, 120, 69, 12, { bg: 'linear-gradient(90deg,transparent,rgba(0,0,0,.8) 30%)' }),
      T('NM', 34, 120, 61, 12, { f: 'blk', z: 5.6, c: '#d4d4da', al: 'r', ls: '.08em' }), K(6, 124, 16, 7, { c: '#fff', z: 3.6, it: 1 })],
    bk: bk('white', {}), sure: 'a' });
  // 1997: the photograph in a dark colored border that fades into it, the name large across the foot, the team's name
  // in script at the lower left
  def('topps', 1997, { bg: 't1', ph: P(5, 5, 90, 124, { b: '0 0 1.6cqw 1.2cqw rgba(0,0,0,.6)' }),
    L: [B(5, 112, 90, 22, { bg: 'linear-gradient(0deg,rgba(0,0,0,.8),transparent)' }), T('tm', 7, 112, 40, 10, { f: 'scr', z: 7, c: '#f6d33c' }),
      T('NM', 7, 121, 86, 12, { f: 'pag', z: 7, c: '#fff', al: 'c', ls: '.06em' }), K(78, 7, 14, 7, { c: '#fff', z: 3.4 })],
    bk: bk('white', {}), sure: 'a' });
  // 1998: a bronze border, the photograph in a thin dark line, the name spaced out on a dark band at the foot
  def('topps', 1998, { bg: '#a07a3c', ph: P(6, 6, 88, 116, { b: '0 0 0 .5cqw #2a2015' }),
    L: [B(6, 123, 88, 11, { bg: '#1b2a4a', sh: '0 0 0 .4cqw #2a2015' }), T('NM', 8, 123, 84, 11, { f: 'pag', z: 5, c: '#c9a33a', al: 'c', ls: '.22em' }),
      K(8, 113, 14, 7, { c: '#fff', z: 3.4 })],
    bk: bk('white', {}), sure: 'a' });
  // 1999: a bronze border, the name running up the photograph's left edge, the team's name small at the lower right
  def('topps', 1999, { bg: '#9c7a45', ph: P(6, 6, 88, 126, { b: '0 0 0 .5cqw #e9d9a8' }),
    L: [T('NM', -48, 60, 116, 8, { f: 'pag', z: 4.4, c: '#fff', rot: -90, al: 'c', ls: '.2em', sh: 1 }), T('ft', 40, 122, 52, 8, { f: 'scr', z: 5, c: '#fff', al: 'r', sh: 1 }),
      K(8, 8, 14, 7, { c: '#fff', z: 3.4 })],
    bk: bk('white', {}), sure: 'a' });
  // 2000: a tan border, the photograph to a thin line, the name on a red band at the foot, the team's mark at its left
  def('topps', 2000, { bg: '#8b7a5c', ph: P(5, 5, 90, 118, { b: '0 0 0 .5cqw #e9d9a8' }),
    L: [B(5, 123, 90, 12, { bg: '#c8352b' }), G(6, 108, 14, 14), T('NM', 22, 123, 72, 12, { f: 'blk', z: 5.6, c: '#1d1d1d', al: 'r', ls: '.06em' }),
      K(78, 7, 14, 7, { c: '#fff', z: 3.4 })],
    bk: bk('white', {}), sure: 'a' });
  // 2001: the fiftieth year: dark green borders, the team's mark at the lower left, the name in large gold letters
  def('topps', 2001, { bg: '#123a26', ph: P(5, 5, 90, 116, { b: '0 0 0 .5cqw #c9a33a' }),
    L: [G(6, 118, 14, 14), T('FN', 22, 121, 30, 7, { f: 'blk', z: 4.4, c: '#c9a33a', al: 'r' }), T('LN', 52, 120, 44, 14, { f: 'bung', z: 8, c: '#c9a33a', al: 'r' }),
      B(78, 7, 14, 14, { bg: '#c9a33a', rd: 1.5 }), T('yr', 78, 9, 14, 10, { f: 'blk', z: 4.4, c: '#123a26', al: 'c' })],
    bk: bk('white', { hd: '#1f6b3a', hi: '#fff' }), sure: 'a', note: 'the dark green borders of the fiftieth year' });
  // 2002: gold borders, the year on a banner at the top, the name on a dark swoosh across the foot
  def('topps', 2002, { bg: '#c98a1e', ph: P(5, 5, 90, 124, { b: '0 0 0 .5cqw #5a3c0c' }),
    L: [G(6, 6, 16, 16), T('yr', 40, 6, 52, 7, { f: 'pag', z: 4.4, c: '#fff', al: 'r', ls: '.3em', sh: 1 }),
      B(8, 116, 88, 12, { bg: '#1b2a6a', rot: -6, rd: '50% 10% 50% 10% / 100% 30% 100% 30%', sh: '0 0 0 .5cqw #e9d9a8' }), T('NM', 14, 116, 78, 12, { f: 'pag', z: 4.8, c: '#e9d9a8', al: 'c', ls: '.12em', rot: -6 }),
      K(6, 130, 14, 7, { c: '#2a1a05', z: 3.4 })],
    bk: bk('white', {}), sure: 'a' });
  // 2003: blue borders, a second picture in a team-colored badge at the lower left, the name and position on a red
  // band at the lower right
  def('topps', 2003, { bg: '#1c34a8', ph: P(5, 5, 90, 124, { b: '0 0 0 .5cqw #fff' }),
    L: [B(36, 114, 59, 15, { bg: '#c8352b', sh: '0 0 0 .4cqw #fff' }), I(5, 104, 32, 28, { rd: '0 0 50% 50%', sh: '0 0 0 .8cqw t1' }),
      T('NM', 38, 114, 55, 9, { f: 'pag', z: 4.8, c: '#f6d33c', al: 'r', ls: '.08em' }), T('PF', 38, 122, 55, 7, { f: 'blk', z: 3.8, c: '#fff', al: 'r' }), K(6, 6, 14, 7, { c: '#fff', z: 3.4 })],
    bk: bk('white', {}), sure: 'a' });
  // 2004: white borders, the team's name in large gray letters across the top, the photograph in a colored frame, the
  // team's mark at its lower right, the name and position small at the foot
  def('topps', 2004, { bg: WH, ph: P(6, 18, 88, 106, { b: '0 0 0 .6cqw #fff, 0 0 0 1.3cqw t1' }),
    L: [T('TM', 4, 3, 92, 14, { f: 'blk', z: 11, c: '#7a7d84', al: 'c', ls: '.06em' }), G(74, 102, 18, 18), T('NM', 40, 126, 54, 6, { f: 'blk', z: 4, c: '#5a5d64', al: 'r', it: 1 }),
      T('PF', 40, 131, 54, 5, { f: 'blk', z: 3.6, c: '#5a5d64', al: 'r', it: 1 }), K(80, 19, 13, 6, { c: '#c8352b', z: 3.2 })],
    bk: bk('white', {}), sure: 'a' });
  // 2005: white borders, the last name in large letters at the top, the photograph in a thick rounded team-colored
  // frame with the team and the name running down its sides, the team's name in script at the foot
  def('topps', 2005, { bg: WH, ph: P(8, 18, 84, 104, { s: 'rd', b: '0 0 0 .6cqw #fff, 0 0 0 2.2cqw t1, 0 0 0 2.8cqw #111' }),
    L: [T('LN', 4, 2, 92, 15, { f: 'pag', z: 11, c: '#4a2410', al: 'c', ls: '.04em' }), T('FT', -46, 66, 104, 6, { f: 'blk', z: 3.6, c: '#fff', rot: -90, al: 'c' }),
      T('NM', 42, 66, 104, 6, { f: 'blk', z: 3.6, c: '#fff', rot: 90, al: 'c' }), T('tm', 10, 118, 80, 18, { f: 'scr', z: 13, c: 't1', al: 'c', sh: 2 })],
    bk: bk('white', {}), sure: 'a' });
  // 2006: white borders, the team's name on a dark arched plate at the top, the photograph in a light frame, the team's
  // name in script on the photograph's foot and the name and position under it
  def('topps', 2006, { bg: WH, ph: P(5, 5, 90, 124, { b: '0 0 0 1cqw #8fb6e0' }),
    L: [B(20, 5, 60, 10, { bg: '#2a2a2a', rd: '0 0 30% 30%' }), T('TM', 20, 5, 60, 10, { f: 'bung', z: 6, c: '#fff', al: 'c' }),
      T('tm', 6, 100, 88, 20, { f: 'scr', z: 15, c: '#fff', al: 'c', sh: 1 }), B(10, 120, 80, 10, { bg: 't1', rd: 2 }), T('NM', 11, 120, 78, 6, { f: 'blk', z: 4, c: 'i1', al: 'c' }),
      T('PF', 11, 125, 78, 5, { f: 'blk', z: 3.4, c: 'i1', al: 'c' }), K(80, 7, 13, 6, { c: '#c8352b', z: 3.2 })],
    bk: bk('white', {}), sure: 'a' });
  // 2007: black borders dotted in the corners, the team's name small at the top, the name in large silver letters at
  // the foot, a signature
  def('topps', 2007, { bg: '#111', ph: P(5, 8, 90, 118, {}),
    L: [B(2, 2, 10, 6, { bg: 'radial-gradient(circle,#2a64b8 30%,transparent 32%) 0 0/3cqw 3cqw' }), B(88, 2, 10, 6, { bg: 'radial-gradient(circle,#2a64b8 30%,transparent 32%) 0 0/3cqw 3cqw' }),
      T('FT', 10, 9, 80, 6, { f: 'blk', z: 4, c: '#fff', al: 'c', sh: 1 }), S(10, 90, 80, 24, { c: '#1d1d1d', z: 12 }),
      T('FN', 10, 120, 80, 5, { f: 'blk', z: 3.6, c: '#c9c9cf', al: 'c' }), T('LN', 6, 125, 88, 11, { f: 'blk', z: 8, c: '#c9c9cf', al: 'c', ls: '.1em' }), K(43, 2, 14, 6, { c: '#fff', z: 3.2 })],
    bk: bk('white', {}), sure: 'a', note: 'black borders' });
  // 2008: white borders, the team's name across the top a letter to each colored disc, the photograph in a frame, the
  // name in small capitals at the foot
  def('topps', 2008, { bg: WH, ph: P(6, 19, 88, 106, { b: '0 0 0 .5cqw #111' }),
    L: [T('TM', 4, 4, 92, 14, { f: 'bung', z: 9, c: 't1', al: 'c', ls: '.3em' }), T('NM', 6, 127, 88, 8, { f: 'pag', z: 5, c: '#1d1d1d', al: 'c', ls: '.1em' }),
      S(50, 106, 40, 14, { c: '#1d1d1d', z: 7 }), K(42, 19, 16, 6, { c: '#fff', z: 3.2 })],
    bk: bk('white', {}), sure: 'a' });
  // 2009: white borders, a stripe across the photograph's lower right corner with the team's mark, the name at the foot
  def('topps', 2009, { bg: '#ecebe8', ph: P(5, 5, 90, 122, { b: '0 0 0 .5cqw #fff' }),
    L: [B(60, 104, 36, 20, { bg: 't1', cp: 'polygon(30% 0,100% 0,100% 100%,0 100%)' }), G(78, 106, 16, 16),
      T('NM', 6, 128, 70, 8, { f: 'blk', z: 4.8, c: '#5a5d64', al: 'c', ls: '.12em' }), T('ps', 76, 128, 18, 8, { f: 'blk', z: 4, c: '#5a5d64', al: 'r' }), K(78, 7, 14, 6, { c: '#c8352b', z: 3.2 })],
    bk: bk('white', {}), sure: 'a' });
  // 2010: the photograph nearly to the edge with a curved stripe down its left, the team's name in script large at the
  // foot, the name on a strip under it
  def('topps', 2010, { bg: WH, ph: P(4, 4, 92, 124, {}),
    L: [B(4, 4, 6, 124, { bg: 'linear-gradient(90deg,t1,t2)', rd: '0 50% 50% 0' }), T('tm', 8, 104, 70, 20, { f: 'scr', z: 15, c: 't1', sh: 2 }),
      B(4, 128, 92, 8, { bg: 't1' }), T('NM', 8, 128, 86, 8, { f: 'blk', z: 4.6, c: 'i1', al: 'c' }), K(80, 6, 14, 6, { c: '#fff', z: 3.2 })],
    bk: bk('white', {}), sure: 'a' });
  // 2011: white borders, the name on an arched band at the lower left, the team's mark in a circle at the lower right
  def('topps', 2011, { bg: WH, ph: P(5, 5, 90, 124, {}),
    L: [B(2, 116, 70, 14, { bg: 't1', rd: '40% 60% 0 0 / 100% 100% 0 0', sh: '0 0 0 .5cqw #fff' }), T('NM', 6, 116, 62, 9, { f: 'pag', z: 4.8, c: '#fff', al: 'c' }),
      T('PF', 6, 125, 62, 5, { f: 'blk', z: 3.4, c: '#fff', al: 'c' }), B(70, 106, 26, 26, { bg: '#fff', rd: 50, sh: '0 0 0 .8cqw t1' }), G(73, 109, 20, 20), K(6, 7, 14, 6, { c: '#fff', z: 3.2 })],
    bk: bk('white', {}), sure: 'a' });
  // 2012: white borders, the photograph in a rounded frame, the name on a colored swoosh at the foot with the team's
  // mark at its left
  def('topps', 2012, { bg: WH, ph: P(5, 5, 90, 122, { s: 'rd', b: '0 0 0 .5cqw #c9a33a' }),
    L: [B(10, 116, 80, 14, { bg: 't1', rd: '40% 40% 40% 40% / 100% 100% 100% 100%', sh: '0 0 0 .5cqw #fff' }), G(6, 113, 18, 18),
      T('FN', 26, 116, 60, 6, { f: 'blk', z: 3.8, c: '#fff', al: 'c', ls: '.14em' }), T('LN', 26, 121, 60, 8, { f: 'blk', z: 5.4, c: '#fff', al: 'c', ls: '.1em' }), K(6, 7, 14, 6, { c: '#fff', z: 3.2 })],
    bk: bk('white', {}), sure: 'a' });
  // 2013 to 2025: the photograph to a thin white edge; each year places the name, team and mark its own way
  var FB = function (L) { return { bg: '#fff', ph: P(3, 3, 94, 134, { s: 'rd' }), L: L.concat([K(80, 6, 14, 6, { c: '#fff', z: 3.2 })]), bk: bk('white', {}), sure: 'a' }; };
  // 2013: a colored swoosh rising from the lower left, the name at the foot, the team's mark at the lower right
  def('topps', 2013, FB([B(3, 118, 94, 19, { bg: '#fff', cp: 'polygon(0 30%,60% 60%,100% 40%,100% 100%,0 100%)' }), B(3, 116, 70, 6, { bg: 't2', rot: 8 }),
    T('NM', 6, 128, 64, 8, { f: 'blk', z: 4.6, c: '#1d1d1d' }), G(76, 118, 18, 18)]));
  // 2014: a colored border inside the white with the team's name down the right, the name on a plate at the foot
  def('topps', 2014, FB([B(3, 3, 94, 134, { bg: 'transparent', sh: 'inset 0 0 0 1.6cqw t1' }), T('TM', 46, 62, 100, 5, { f: 'blk', z: 3.2, c: '#fff', rot: 90, al: 'c', ls: '.4em' }),
    B(44, 126, 50, 9, { bg: '#fff', rd: '60% 0 0 0' }), T('PF', 46, 125, 46, 4, { f: 'blk', z: 3, c: '#5a5d64', al: 'r' }), T('NM', 46, 129, 46, 6, { f: 'blk', z: 4.4, c: '#1d1d1d', al: 'r', ls: '.1em' }), G(5, 118, 16, 16)]));
  // 2015: a colored border with a crackle, the name and team at the lower left, the team's mark in a circle at the right
  def('topps', 2015, FB([B(3, 3, 94, 134, { bg: 'transparent', sh: 'inset 0 0 0 2cqw t1' }), B(5, 122, 90, 13, { bg: 'linear-gradient(0deg,rgba(0,0,0,.6),transparent)' }),
    T('NM', 7, 123, 60, 7, { f: 'blk', z: 4.8, c: '#fff' }), T('FT', 7, 129, 60, 5, { f: 'blk', z: 3.4, c: '#fff' }), T('ps', 66, 123, 8, 7, { f: 'blk', z: 3.6, c: '#fff' }),
    B(76, 116, 18, 18, { bg: '#fff', rd: 50, sh: '0 0 0 .6cqw t1' }), G(78, 118, 14, 14)]));
  // 2016: a smoky band rising from the lower left, the team's mark in it, the name at the lower right
  def('topps', 2016, FB([B(3, 108, 94, 29, { bg: 'linear-gradient(20deg,t1 0 35%,transparent 65%)' }), G(5, 116, 18, 18),
    T('FN', 30, 122, 64, 5, { f: 'blk', z: 3.6, c: '#fff', al: 'r' }), T('LN', 30, 126, 64, 8, { f: 'blk', z: 6, c: '#fff', al: 'r' }), T('ps', 82, 132, 12, 5, { f: 'blk', z: 3.4, c: '#fff', al: 'r' })]));
  // 2017: a team-colored panel behind the player and a white stripe across the foot with the name, the team's mark at
  // the lower left
  def('topps', 2017, FB([B(55, 3, 42, 100, { bg: 't1', o: .55 }), B(0, 118, 100, 10, { bg: '#fff', rot: -14, sh: '0 0 0 .4cqw t1' }),
    T('NM', 30, 116, 66, 10, { f: 'blk', z: 4.6, c: '#1d1d1d', al: 'r', rot: -14 }), G(4, 122, 16, 16)]));
  // 2018: a colored wave across the foot with the team's mark at the left, the name on it
  def('topps', 2018, FB([B(3, 118, 94, 19, { bg: 'linear-gradient(90deg,t1,t2)', cp: 'polygon(0 40%,30% 20%,60% 45%,100% 25%,100% 100%,0 100%)' }), G(5, 114, 18, 18),
    T('NM', 26, 126, 56, 8, { f: 'blk', z: 4.6, c: '#fff' }), T('ps', 82, 126, 12, 8, { f: 'blk', z: 4, c: '#fff', al: 'r' })]));
  // 2019: the photograph in a fading white frame, the last name large and the first name small at the lower left
  def('topps', 2019, FB([B(3, 3, 94, 134, { bg: 'transparent', sh: 'inset 0 0 1cqw 1.4cqw #fff' }), T('LN', 6, 118, 70, 11, { f: 'blk', z: 9, c: '#fff', o: .9, sh: 1 }),
    T('FN', 6, 128, 40, 5, { f: 'blk', z: 3.6, c: '#fff' }), T('FT', 40, 132, 40, 4, { f: 'blk', z: 3, c: '#fff' }), G(78, 116, 16, 16)]));
  // 2020: a white bar standing up the photograph's right edge with the name down it, the team's mark at its foot
  def('topps', 2020, FB([B(80, 60, 10, 74, { bg: '#fff', cp: 'polygon(0 6%,100% 0,100% 100%,0 100%)' }), T('NM', 52, 94, 66, 6, { f: 'blk', z: 3.8, c: '#1d1d1d', rot: -90, al: 'c' }),
    G(80, 118, 14, 14)]));
  // 2021: angled stripes in the team's colors across the lower corners, the name along them, the team's mark
  def('topps', 2021, FB([B(3, 96, 94, 41, { bg: 'linear-gradient(135deg,transparent 40%,t1 40% 46%,transparent 46% 52%,t2 52% 58%,transparent 58%)' }),
    T('NM', 50, 116, 46, 6, { f: 'blk', z: 3.8, c: '#fff', rot: -45, al: 'c' }), G(78, 116, 16, 16)]));
  // 2022: a white frame curving round the foot, the team's mark at the lower left, the name on a plate
  def('topps', 2022, FB([B(3, 118, 94, 19, { bg: '#fff', rd: '0 0 3cqw 3cqw', cp: 'polygon(0 0,15% 30%,100% 30%,100% 100%,0 100%)' }), G(4, 116, 18, 18),
    B(28, 124, 66, 7, { bg: 't1', rd: 1 }), T('NM', 30, 124, 62, 7, { f: 'blk', z: 4, c: 'i1', al: 'c', ls: '.1em' })]));
  // 2023 to 2025: a white plate at the foot with the name, the team's mark and position at its right
  def('topps', range(2023, 2025), FB([B(3, 124, 94, 13, { bg: '#fff', cp: 'polygon(0 30%,8% 0,100% 0,100% 100%,0 100%)' }),
    T('NM', 8, 126, 64, 8, { f: 'blk', z: 4.6, c: '#1d1d1d', ls: '.06em' }), G(72, 118, 14, 14), T('ps', 86, 126, 10, 8, { f: 'blk', z: 4, c: '#1d1d1d', al: 'r' })]));

  // ── Bowman (owned by Topps) ─────────────────────────────────────────────────────────────────────────────────
  def('bowman', 1948, { bg: '#f4efe0', ph: P(6, 6, 88, 128, { f: 'bw', b: '0 0 0 .4cqw #333' }), L: [], bk: bk('early', { st: '#d9d0b6', hd: '#2a2a2a' }), sure: 'a', note: 'a black-and-white photograph and nothing else on the front' });
  def('bowman', 1949, { bg: '#f4efe0', ph: P(6, 6, 88, 112, { bg: 'field', f: 'tint' }), L: [B(6, 120, 88, 14, { bg: '#fff', sh: '0 0 0 .4cqw #333' }), T('NM', 8, 121, 84, 12, { f: 'blk', z: 6.6, c: '#111', up: 1, al: 'c' })], bk: bk('early', { st: '#d9d0b6' }), sure: 'b' });
  def('bowman', [1950, 1951], { bg: '#f4efe0', ph: P(5, 5, 90, 116, { f: 'paint' }), L: [B(5, 121, 90, 14, { bg: '#111' }), T('NM', 7, 122, 86, 12, { f: 'blk', z: 6.6, c: '#fff', up: 1, al: 'c' })], bk: bk('early', { st: '#d9d0b6', hd: '#1f3f78' }), sure: 'b', note: 'painted from photographs' });
  def('bowman', 1952, { bg: '#f4efe0', ph: P(5, 5, 90, 130, { f: 'paint' }), L: [S(10, 112, 80, 20, { c: '#111', z: 12 })], bk: bk('early', { st: '#d9d0b6' }), sure: 'b' });
  def('bowman', 1953, { bg: WH, ph: P(4, 4, 92, 132, {}), L: [], bk: bk('early', { st: '#d9d0b6' }), sure: 'a', note: 'a color photograph with no words on the front' });
  def('bowman', 1954, { bg: WH, ph: P(5, 5, 90, 112, {}), L: [B(5, 117, 90, 18, { bg: '#fff', sh: 'inset 0 0 0 .6cqw t1' }), S(10, 118, 80, 16, { c: '#111', z: 10 })], bk: bk('early', { st: '#d9d0b6' }), sure: 'b' });
  def('bowman', 1955, { bg: 'wood', ph: P(10, 10, 80, 100, { s: 'tv', b: '0 0 0 1cqw #222' }), L: [T('NM', 8, 116, 84, 10, { f: 'blk', z: 6.6, c: '#f8e7c5', up: 1, al: 'c' }), T('ps', 8, 125, 84, 8, { f: 'cond', z: 5, c: '#f8e7c5', up: 1, al: 'c' })], bk: bk('early', { st: '#d9d0b6' }), sure: 'a', note: 'the television set' });
  def('bowman', range(1989, 2025), { bg: WH, ph: P(6, 6, 88, 112, {}), L: [B(6, 118, 88, 17, { bg: '#c8102e' }), T('NM', 9, 119, 82, 9, { f: 'blk', z: 6.6, c: '#fff', up: 1 }), T('tm', 9, 127.5, 82, 6, { f: 'cond', z: 4.6, c: '#fff', up: 1 }), K(70, 7, 22, 8, { c: '#c8102e', bg: '#fff' })], bk: bk('white', {}), sure: 'c' });

  // ── Play Ball (Gum, Inc., owned by Topps) ───────────────────────────────────────────────────────────────────
  def('playball', [1939, 1940], { bg: WH, ph: P(7, 7, 86, 106, { f: 'bw', b: '0 0 0 .6cqw #222' }), L: [B(7, 115, 86, 19, { bg: '#fff', sh: 'inset 0 0 0 .5cqw #222' }), T('NM', 9, 116, 82, 10, { f: 'cinz', z: 6.6, c: '#111', up: 1, al: 'c' }), T('ft', 9, 126, 82, 7, { f: 'cond', z: 4.6, c: '#333', up: 1, al: 'c' })], bk: bk('early', { st: '#e7dfc8', hd: '#1f1f1f' }), sure: 'b', note: 'black-and-white photographs' });
  def('playball', 1941, { bg: WH, ph: P(7, 7, 86, 112, { f: 'tint' }), L: [B(7, 119, 86, 15, { bg: '#e8d79c' }), T('NM', 9, 120, 82, 13, { f: 'cinz', z: 6.6, c: '#111', up: 1, al: 'c' })], bk: bk('early', { st: '#e7dfc8' }), sure: 'b', note: 'colored photographs' });

  // ── The public domain: tobacco and candy cards ──────────────────────────────────────────────────────────────
  def('oldjudge', range(1887, 1890), { bg: '#d8c7a0', ph: P(8, 6, 84, 110, { f: 'sep', s: 'rd' }), L: [T('NM', 6, 117, 88, 8, { f: 'fell', z: 6.4, c: '#3b2a17', up: 1, al: 'c' }), T('ft', 6, 124, 88, 6, { f: 'fell', z: 4.6, c: '#3b2a17', up: 1, al: 'c' }), T('mk', 6, 130, 88, 6, { f: 'fell', z: 4.6, c: '#3b2a17', al: 'c', lit: 'Old Judge Cigarettes' })], bk: { st: '#ece2c6', ink: '#3b2a17', hd: '#3b2a17', hi: '#ece2c6', bx: '#f4ecd6' }, sure: 'a', note: 'sepia studio photographs on card stock, N172' });
  def('t206', range(1909, 1911), { bg: '#f6f1e3', ph: P(9, 7, 82, 108, { bg: 'field' }), L: [B(9, 116, 82, 17, { bg: '#f6f1e3' }), T('LN', 9, 117, 82, 9, { f: 'pag', z: 6.6, c: '#2a2015', al: 'c', ls: '.08em' }), T('CT', 9, 125, 82, 7, { f: 'pag', z: 5, c: '#2a2015', al: 'c', ls: '.08em' })], bk: { st: '#efe6cc', ink: '#26324f', hd: '#26324f', hi: '#efe6cc', bx: '#f7f0dc' }, sure: 'a', note: 'a portrait on a field of color; the last name and city under it' });
  def('t205', 1911, { bg: '#c9a74a', ph: P(10, 8, 80, 96, { s: 'oval', bg: 'field', b: '0 0 0 .8cqw #f4e2a0' }), L: [B(10, 107, 80, 27, { bg: '#f4ead0', rd: 3 }), G(42, 108, 16, 12), T('NM', 12, 120, 76, 7, { f: 'pag', z: 5.4, c: '#2a2015', up: 1, al: 'c' }), T('ft', 12, 127, 76, 6, { f: 'pag', z: 4.4, c: '#2a2015', up: 1, al: 'c' })], bk: { st: '#efe6cc', ink: '#2a2015', hd: '#2a2015', hi: '#efe6cc', bx: '#f7f0dc' }, sure: 'b', note: 'the gold border' });
  def('t207', 1912, { bg: '#7a5634', ph: P(8, 6, 84, 106, { f: 'tint' }), L: [B(8, 114, 84, 20, { bg: '#e9dcc0' }), T('LN', 10, 115, 80, 10, { f: 'pag', z: 6.6, c: '#3b2a17', al: 'c' }), T('ft', 10, 125, 80, 7, { f: 'pag', z: 4.6, c: '#3b2a17', up: 1, al: 'c' })], bk: { st: '#efe6cc', ink: '#3b2a17', hd: '#3b2a17', hi: '#efe6cc', bx: '#f7f0dc' }, sure: 'b', note: 'the brown background' });
  def('crackerjack', [1914, 1915], { bg: '#c8352b', ph: P(8, 6, 84, 110, { bg: '#c8352b', f: 'tint' }), L: [B(8, 117, 84, 18, { bg: '#f3ead2' }), T('NM', 10, 118, 80, 8, { f: 'pag', z: 6, c: '#2a2015', up: 1, al: 'c' }), T('ft', 10, 126, 80, 7, { f: 'pag', z: 4.6, c: '#2a2015', up: 1, al: 'c' })], bk: { st: '#efe6cc', ink: '#2a2015', hd: '#2a2015', hi: '#efe6cc', bx: '#f7f0dc' }, sure: 'b', note: 'the red background' });
  def('m101', [1916, 1917], { bg: WH, ph: P(10, 8, 80, 104, { f: 'bw' }), L: [T('NM', 8, 114, 84, 8, { f: 'pag', z: 6, c: '#111', al: 'c' }), T('pf', 8, 121, 84, 6, { f: 'pag', z: 4.6, c: '#111', al: 'c' }), T('ft', 8, 127, 84, 6, { f: 'pag', z: 4.6, c: '#111', al: 'c' })], bk: { st: '#f4f2ec', ink: '#111', hd: '#111', hi: '#fff', bx: '#fff' }, sure: 'b', note: 'black-and-white photographs, The Sporting News' });
  def('amcaramel', range(1909, 1922), { bg: '#ece2c6', ph: P(9, 7, 82, 108, { bg: 'field', f: 'tint' }), L: [T('NM', 8, 117, 84, 8, { f: 'pag', z: 6, c: '#2a2015', up: 1, al: 'c' }), T('ft', 8, 125, 84, 7, { f: 'pag', z: 4.6, c: '#2a2015', up: 1, al: 'c' })], bk: { st: '#efe6cc', ink: '#2a2015', hd: '#2a2015', hi: '#efe6cc', bx: '#f7f0dc' }, sure: 'c', note: 'American Caramel printed several sets; one look stands for them' });

  // ── Goudey (Upper Deck) ─────────────────────────────────────────────────────────────────────────────────────
  def('goudey', 1933, { bg: '#f1e9d2', ph: P(6, 6, 88, 112, { bg: 'field', f: 'paint' }), L: [B(6, 118, 88, 16, { bg: '#f1e9d2' }), T('NM', 6, 119, 88, 8, { f: 'blk', z: 6.4, c: '#1f1f1f', up: 1, al: 'c' }), T('mk', 6, 127, 88, 6, { f: 'blk', z: 4.4, c: '#b3261e', up: 1, al: 'c', lit: 'Big League Chewing Gum' })], bk: bk('early', { st: '#efe6cc', hd: '#2a2a2a' }), sure: 'a', note: 'painted portraits on a field of color' });
  def('goudey', 1934, { bg: '#f1e9d2', ph: P(6, 6, 88, 112, { bg: 'field', f: 'paint' }), L: [B(6, 6, 28, 20, { bg: '#f1e9d2', cp: 'polygon(0 0,100% 0,0 100%)' }), B(6, 118, 88, 16, { bg: 't1' }), T('NM', 6, 119, 88, 14, { f: 'blk', z: 6.6, c: 'i1', up: 1, al: 'c' })], bk: bk('early', { st: '#efe6cc' }), sure: 'b' });
  def('goudey', [1935, 1936, 1937], { bg: WH, ph: P(8, 8, 84, 106, { f: 'bw' }), L: [T('NM', 8, 116, 84, 9, { f: 'blk', z: 6.4, c: '#111', up: 1, al: 'c' }), T('ft', 8, 125, 84, 7, { f: 'cond', z: 4.6, c: '#333', up: 1, al: 'c' })], bk: bk('early', { st: '#efe6cc' }), sure: 'c', note: 'black-and-white photographs' });
  def('goudey', 1938, { bg: '#e7dcbf', ph: P(14, 6, 72, 72, { s: 'circle', bg: 'field' }), L: [B(10, 80, 80, 36, { bg: 't1', rd: 6 }), T('NM', 6, 118, 88, 8, { f: 'blk', z: 6.4, c: '#1f1f1f', up: 1, al: 'c' }), T('ft', 6, 126, 88, 7, { f: 'cond', z: 4.6, c: '#333', up: 1, al: 'c' })], bk: bk('early', { st: '#efe6cc' }), sure: 'c', note: 'Heads-Up: a large head over a small drawn body; the body here is a plain shape' });
  def('goudey', [1939, 1940, 1941], { bg: 'field', ph: P(8, 8, 84, 106, { f: 'tint', b: '0 0 0 .6cqw #fff' }), L: [T('NM', 8, 117, 84, 9, { f: 'blk', z: 6.4, c: '#fff', up: 1, al: 'c' }), T('ft', 8, 126, 84, 7, { f: 'cond', z: 4.6, c: '#fff', up: 1, al: 'c' })], bk: bk('early', { st: '#efe6cc' }), sure: 'c' });

  // ── Upper Deck ──────────────────────────────────────────────────────────────────────────────────────────────
  def('upperdeck', 1989, { bg: WH, ph: P(6, 6, 78, 112, {}), L: [B(86, 6, 8, 112, { bg: 't1' }), B(84, 6, 1.4, 112, { bg: 't2' }), T('NM', 6, 120, 88, 8, { f: 'cond8', z: 7, c: '#111', up: 1 }), T('pf', 6, 128, 60, 7, { f: 'cond', z: 4.8, c: '#555', up: 1 }), K(66, 128, 28, 7, { c: '#7a5c1e' })], bk: bk('white', { pn: 'fact' }), sure: 'b', note: 'the hologram on the back is not drawn' });
  def('upperdeck', 1990, { bg: WH, ph: P(14, 6, 80, 112, {}), L: [B(6, 6, 6, 112, { bg: 't1' }), T('NM', 6, 120, 88, 8, { f: 'cond8', z: 7, c: '#111', up: 1 }), T('tm', 6, 128, 60, 7, { f: 'cond', z: 4.8, c: 't1', up: 1 }), K(66, 128, 28, 7, { c: '#7a5c1e' })], bk: bk('white', { pn: 'fact' }), sure: 'b' });
  def('upperdeck', range(1991, 1992), { bg: WH, ph: P(6, 6, 88, 110, {}), L: [B(6, 116, 88, 19, { bg: 't1' }), B(6, 116, 88, 1.2, { bg: 't2' }), T('NM', 9, 117, 82, 10, { f: 'cond8', z: 7.4, c: 'i1', up: 1 }), T('tm', 9, 127, 50, 7, { f: 'cond', z: 4.8, c: 'i1', up: 1 }), K(64, 127, 28, 7, { c: 'i1' })], bk: bk('white', { pn: 'fact' }), sure: 'c' });
  def('upperdeck', range(1993, 2010), { bg: '#fff', ph: P(3, 3, 94, 134, { s: 'rd' }), L: [B(3, 110, 94, 27, { bg: 'linear-gradient(0deg,t1,transparent)' }), T('NM', 7, 118, 70, 10, { f: 'cond8', z: 8, c: '#fff', up: 1 }), T('tm', 7, 128, 70, 7, { f: 'cond', z: 4.8, c: '#fff', up: 1 }), K(74, 128, 21, 7, { c: '#fff' })], bk: bk('white', { pn: 'fact' }), sure: 'c' });

  // ── Fleer ───────────────────────────────────────────────────────────────────────────────────────────────────
  def('fleer', 1963, { bg: WH, ph: P(6, 6, 88, 110, {}), L: [B(6, 118, 88, 17, { bg: 't1' }), T('NM', 8, 119, 84, 9, { f: 'blk', z: 6.6, c: 'i1', up: 1, al: 'c' }), T('ft', 8, 127.5, 84, 6, { f: 'cond', z: 4.6, c: 'i1', up: 1, al: 'c' })], bk: bk('gray', {}), sure: 'c' });
  var FLEER = {
    1981: { bg: WH, fr: 't1', pl: '#fff', pi: 't1' }, 1982: { bg: WH, fr: 't1', pl: 't1', pi: 'i1' }, 1983: { bg: '#bfb7a3', fr: '#fff', pl: '#fff', pi: 't1', lg: 1 },
    1984: { bg: WH, fr: 't1', pl: 't1', pi: 'i1', lg: 1 }, 1985: { bg: '#d9d4c7', fr: 't1', pl: 't1', pi: 'i1', lg: 1 }, 1986: { bg: '#1c2f73', fr: '#fff', pl: '#1c2f73', pi: '#fff', lg: 1 },
    1987: { bg: 'linear-gradient(180deg,#9fc4ef,#1c4fa0)', fr: '#fff', pl: '#1c4fa0', pi: '#fff', lg: 1 }, 1988: { bg: 'stripes', fr: '#fff', pl: '#fff', pi: '#c8102e', lg: 1 },
    1989: { bg: 'pins', fr: '#fff', pl: '#fff', pi: '#222', lg: 1 }, 1990: { bg: WH, fr: 't1', pl: 't1', pi: 'i1' }, 1991: { bg: '#f6d313', fr: '#111', pl: '#f6d313', pi: '#111', lg: 1 },
    1992: { bg: '#2f7d47', fr: '#e7d58e', pl: '#2f7d47', pi: '#fff', lg: 1 }, 1993: { bg: '#a8aab0', fr: '#fff', pl: '#a8aab0', pi: '#111' }, 1994: { bg: WH, fr: 't1', pl: 't1', pi: 'i1' }
  };
  Object.keys(FLEER).forEach(function (y) {
    var f = FLEER[y], L = [B(6, 117, 88, 18, { bg: f.pl }), T('NM', 8, 118, f.lg ? 64 : 84, 9, { f: 'blk', z: 6.6, c: f.pi, up: 1 }), T('pf', 8, 127, f.lg ? 64 : 60, 7, { f: 'cond', z: 4.8, c: f.pi, up: 1 })];
    if (f.lg) L.push(G(76, 117, 17, 18)); else L.push(K(66, 127, 26, 7, { c: f.pi }));
    def('fleer', +y, { bg: f.bg, ph: P(6, 6, 88, 109, { b: '0 0 0 .8cqw ' + f.fr }), L: L, bk: bk('gray', { st: +y >= 1990 ? '#efe9dc' : '#cdc4ac', hd: '#c8102e' }), sure: +y >= 1993 ? 'c' : 'b' });
  });
  def('fleer', range(1995, 2007), { bg: '#fff', ph: P(3, 3, 94, 134, { s: 'rd' }), L: [B(3, 112, 94, 25, { bg: 'linear-gradient(0deg,rgba(0,0,0,.82),transparent)' }), T('NM', 7, 118, 70, 10, { f: 'cond8', z: 8, c: '#fff', up: 1 }), T('tm', 7, 128, 70, 7, { f: 'cond', z: 4.8, c: 't2', up: 1 }), K(74, 128, 21, 7, { c: '#fff' })], bk: bk('white', {}), sure: 'c' });

  // ── O-Pee-Chee: Topps' design with the Canadian maker's name, a French and English back ─────────────────────
  // (built below from Topps' table for 1965 to 1994; 1965 to 1969 OPC fronts carried Topps' look closely)

  // ── Upper Deck's other brands ───────────────────────────────────────────────────────────────────────────────
  def('ultra', range(1991, 2007), { bg: '#fff', ph: P(2.5, 2.5, 95, 135, { s: 'rd' }), L: [B(2.5, 108, 95, 29, { bg: 'linear-gradient(0deg,rgba(0,0,0,.85),transparent)' }), B(7, 124, 30, 1, { bg: 'linear-gradient(90deg,#8a6b1f,#f3dc8a,#8a6b1f)' }), T('NM', 7, 114, 86, 10, { f: 'cond8', z: 8.4, c: '#fff', up: 1 }), T('tm', 7, 126, 60, 7, { f: 'cond', z: 4.8, c: '#f3dc8a', up: 1 }), K(70, 126, 25, 7, { c: '#f3dc8a' })], bk: bk('white', {}), sure: 'c', note: 'full-bleed glossy fronts' });
  def('flair', range(1993, 1998), { bg: 'linear-gradient(160deg,#3a2f12,#c9a33a 50%,#3a2f12)', ph: P(5, 5, 90, 130, { s: 'rd', b: '0 0 0 .6cqw #f3dc8a' }), L: [B(5, 110, 90, 25, { bg: 'linear-gradient(0deg,rgba(20,14,4,.88),transparent)' }), T('NM', 8, 117, 84, 10, { f: 'cinz', z: 7.4, c: '#f3dc8a', up: 1, al: 'c' }), T('tm', 8, 127, 84, 6, { f: 'cond', z: 4.6, c: '#fff', up: 1, al: 'c' })], bk: bk('white', { st: '#f3eee0' }), sure: 'c', note: 'thick glossy stock' });
  def('sp', range(1993, 2010), { bg: '#fff', ph: P(3, 3, 94, 134, { s: 'rd' }), L: [B(3, 3, 94, 134, { bg: 'linear-gradient(118deg,rgba(255,255,255,0) 35%,rgba(255,255,255,.25) 48%,rgba(255,255,255,0) 60%)' }), B(3, 112, 94, 25, { bg: 'linear-gradient(0deg,t1,transparent)' }), T('NM', 7, 118, 70, 10, { f: 'cond8', z: 8, c: '#fff', up: 1 }), T('tm', 7, 128, 60, 7, { f: 'cond', z: 4.8, c: '#fff', up: 1 }), K(78, 120, 16, 12, { c: '#c9a33a', f: 'blk' })], bk: bk('white', {}), sure: 'c', note: 'the foil front' });
  def('cc', range(1994, 1998), { bg: WH, ph: P(6, 6, 88, 112, {}), L: [B(6, 118, 88, 17, { bg: 't1' }), T('NM', 8, 119, 84, 9, { f: 'cond8', z: 7, c: 'i1', up: 1 }), T('tm', 8, 127.5, 54, 7, { f: 'cond', z: 4.8, c: 'i1', up: 1 }), K(60, 127.5, 32, 7, { c: 'i1' })], bk: bk('white', {}), sure: 'c', note: "Collector's Choice" });
  def('skybox', range(1997, 2001), { bg: '#0f1d3a', ph: P(5, 5, 90, 118, { s: 'rd', b: '0 0 0 .6cqw #8fbce6' }), L: [T('NM', 6, 124, 70, 9, { f: 'cond8', z: 7, c: '#fff', up: 1 }), K(74, 125, 22, 7, { c: '#8fbce6' }), T('tm', 6, 132, 70, 6, { f: 'cond', z: 4.4, c: '#8fbce6', up: 1 })], bk: bk('white', {}), sure: 'c' });

  // O-Pee-Chee: Topps' fronts of the same year with OPC's name in Topps' corner, a French and English back
  range(1965, 1994).forEach(function (y) {
    var t = D['topps:' + y]; if (!t) return;
    var s = Array.isArray(t) ? t[0] : t;
    def('opc', y, Object.assign({}, s, { L: s.L.concat([K(70, 0.6, 28, 4.4, { c: '#111', bg: 'rgba(255,255,255,.85)', z: 3.6 })]), bk: Object.assign({}, s.bk, { fr: 1 }), sure: s.sure === 'a' ? 'b' : 'c', note: "Topps' design with O-Pee-Chee's name" }));
  });

  // ── The makers ──────────────────────────────────────────────────────────────────────────────────────────────
  // name: what a player reads; mk: the lettering of the maker's name on a card; by: whose permission covers it;
  // scan: words on a card that say who made it (WaxScan's copyright line)
  var MAKERS = {
    topps: { name: 'Topps', mk: 'Topps', f: 'lil', by: 'topps', scan: /\btopps\b/i },
    bowman: { name: 'Bowman', mk: 'Bowman', f: 'scr', by: 'topps', scan: /\bbowman\b/i },
    playball: { name: 'Play Ball', mk: 'Play Ball', f: 'cinz', by: 'topps', scan: /play\s*ball|gum,?\s*inc/i },
    upperdeck: { name: 'Upper Deck', mk: 'Upper Deck', f: 'cond8', by: 'ud', scan: /upper\s*deck/i },
    fleer: { name: 'Fleer', mk: 'Fleer', f: 'blk', by: 'ud', scan: /\bfleer\b/i },
    ultra: { name: 'Ultra', mk: 'Ultra', f: 'cond8', by: 'ud', scan: /\bultra\b/i },
    flair: { name: 'Flair', mk: 'Flair', f: 'cinz', by: 'ud', scan: /\bflair\b/i },
    sp: { name: 'SP', mk: 'SP', f: 'blk', by: 'ud', scan: /\bSP\b/ },
    cc: { name: "Collector's Choice", mk: "Collector's Choice", f: 'cond8', by: 'ud', scan: /collector'?s\s*choice/i },
    skybox: { name: 'SkyBox', mk: 'SkyBox', f: 'russo', by: 'ud', scan: /sky\s*box/i },
    opc: { name: 'O-Pee-Chee', mk: 'O-Pee-Chee', f: 'lil', by: 'ud', scan: /o-?pee-?chee/i },
    goudey: { name: 'Goudey', mk: 'Goudey', f: 'blk', by: 'ud', scan: /goudey/i },
    oldjudge: { name: 'Old Judge', mk: 'Old Judge', f: 'fell', by: 'pd', scan: /old\s*judge|goodwin/i },
    t206: { name: 'T206', mk: 'T206', f: 'pag', by: 'pd', scan: /piedmont|sweet\s*caporal|polar\s*bear|t206/i },
    t205: { name: 'T205 Gold Border', mk: 'T205', f: 'pag', by: 'pd', scan: /t205/i },
    t207: { name: 'T207 Brown Background', mk: 'T207', f: 'pag', by: 'pd', scan: /t207|recruit/i },
    crackerjack: { name: 'Cracker Jack', mk: 'Cracker Jack', f: 'pag', by: 'pd', scan: /cracker\s*jack/i },
    m101: { name: 'The Sporting News', mk: 'Sporting News', f: 'pag', by: 'pd', scan: /sporting\s*news/i },
    amcaramel: { name: 'American Caramel', mk: 'American Caramel', f: 'pag', by: 'pd', scan: /american\s*caramel/i }
  };
  // the order a person sees the makers of a year in (the one most likely first)
  var ORDER = ['topps', 'bowman', 'upperdeck', 'fleer', 'opc', 'ultra', 'flair', 'sp', 'cc', 'skybox', 'goudey', 'playball', 't206', 't205', 't207', 'crackerjack', 'm101', 'amcaramel', 'oldjudge'];
  function makersFor(y) { return ORDER.filter(function (b) { return D[b + ':' + y]; }); }
  // a card with no maker: Topps when Topps made a set that year, else the first that did, else none (our own designs)
  function makerOf(c) {
    var y = c && c.year || 0;
    if (c && c.mk && D[c.mk + ':' + y]) return c.mk;
    var L = makersFor(y); return L[0] || '';
  }
  function design(c, pick) {
    var mk = makerOf(c); if (!mk) return null;
    var d = D[mk + ':' + c.year];
    if (Array.isArray(d)) d = d[(pick >>> 0) % d.length];
    return d ? { mk: mk, d: d } : null;
  }
  function fromScan(text) {
    var out = ''; ORDER.some(function (b) { if (MAKERS[b].scan.test(text || '')) { out = b; return true; } return false; }); return out;
  }
  root.WaxDesigns = { D: D, BR: BR, MAKERS: MAKERS, ORDER: ORDER, makersFor: makersFor, makerOf: makerOf, design: design, fromScan: fromScan };
})(this);
