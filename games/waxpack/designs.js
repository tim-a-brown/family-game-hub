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
  // 1951: the Red Backs and Blue Backs, small game cards (the play read off the corner is left out)
  def('topps', 1951, [
    { bg: '#f1ead4', ph: P(9, 9, 82, 92, { s: 'rd', f: 'tint', b: '0 0 0 1.4cqw #b3261e' }),
      L: [B(0, 104, 100, 36, { bg: '#b3261e' }), T('NM', 6, 107, 88, 14, { f: 'blk', z: 9, c: '#fff', al: 'c' }), T('ft', 6, 121, 88, 9, { f: 'cond', z: 5.6, c: '#ffe7b0', al: 'c', up: 1 }), T('ps', 6, 129, 88, 8, { f: 'cond', z: 5, c: '#fff', al: 'c', up: 1 })],
      bk: bk('early', { st: '#b3261e', ink: '#fff', hd: '#fff', hi: '#b3261e', bx: '#d84a3a', pn: 'fact' }), sure: 'c', note: 'Red Backs' },
    { bg: '#e9eef3', ph: P(9, 9, 82, 92, { s: 'rd', f: 'tint', b: '0 0 0 1.4cqw #1f4e9a' }),
      L: [B(0, 104, 100, 36, { bg: '#1f4e9a' }), T('NM', 6, 107, 88, 14, { f: 'blk', z: 9, c: '#fff', al: 'c' }), T('ft', 6, 121, 88, 9, { f: 'cond', z: 5.6, c: '#d6e6ff', al: 'c', up: 1 }), T('ps', 6, 129, 88, 8, { f: 'cond', z: 5, c: '#fff', al: 'c', up: 1 })],
      bk: bk('early', { st: '#1f4e9a', ink: '#fff', hd: '#fff', hi: '#1f4e9a', bx: '#3d6cb8', pn: 'fact' }), sure: 'c', note: 'Blue Backs' }
  ]);
  def('topps', 1952, { bg: WH, ph: P(5, 5, 90, 101, { f: 'tint' }),
    L: [S(12, 86, 70, 16, { c: '#fff', z: 11 }), B(5, 108, 24, 27, { bg: 't1' }), G(7, 110, 20, 23), B(30, 108, 65, 27, { bg: '#111' }),
      T('ln', 33, 110, 59, 12, { f: 'blk', z: 9.5, c: '#fff', up: 1, al: 'c' }), T('ft', 33, 122, 59, 6, { f: 'cond', z: 4.6, c: '#ffd84a', up: 1, al: 'c' }), T('pf', 33, 128, 59, 6, { f: 'cond', z: 4.4, c: '#fff', up: 1, al: 'c' }),
      B(32, 109, 3, 3, { bg: '#ffd84a', cp: 'polygon(50% 0,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)' }), B(90, 109, 3, 3, { bg: '#ffd84a', cp: 'polygon(50% 0,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)' })],
    bk: bk('early', { pn: 'fact' }), sure: 'b' });
  def('topps', 1953, { bg: WH, ph: P(5, 5, 90, 112, { f: 'paint' }),
    L: [B(5, 117, 64, 18, { bg: 't1', sh: 'inset 0 0 0 .8cqw #111' }), T('NM', 8, 118, 58, 10, { f: 'blk', z: 7, c: 'i1', up: 1 }), T('ps', 8, 127, 58, 7, { f: 'cond', z: 5, c: 'i1', up: 1 }), B(70, 117, 25, 18, { bg: '#fff', sh: 'inset 0 0 0 .8cqw #111' }), G(72, 118, 21, 16)],
    bk: bk('early', { pn: 'quiz' }), sure: 'a', note: 'painted fronts' });
  def('topps', 1954, { bg: 't2', ph: P(0, 20, 100, 120, { f: 'tint' }),
    L: [B(0, 0, 100, 20, { bg: 't2' }), T('NM', 5, 2, 70, 10, { f: 'blk', z: 8, c: 't1', up: 1 }), T('ft', 5, 11, 70, 7, { f: 'cond', z: 5, c: 't1', up: 1 }), G(76, 2, 20, 17), S(8, 120, 70, 15, { c: '#111', z: 11 })],
    bk: bk('gray', { hd: '#2f6b3a', pn: 'cartoon' }), sure: 'b' });
  def('topps', 1955, { bg: WH, ph: P(5, 22, 90, 88, { f: 'tint', b: '0 0 0 .6cqw #333' }),
    L: [T('NM', 5, 4, 66, 11, { f: 'blk', z: 8, c: 't1', up: 1 }), T('ft', 5, 14, 66, 7, { f: 'cond', z: 5, c: '#333', up: 1 }), G(74, 3, 21, 18), B(5, 112, 90, 23, { bg: 't2' }), S(10, 114, 80, 18, { c: 'i2', z: 12 })],
    bk: bk('gray', { hd: '#3a6f9b', pn: 'cartoon' }), sure: 'b', note: 'a horizontal card in real life, drawn upright' });
  def('topps', 1956, { bg: WH, ph: P(5, 5, 90, 108, { f: 'paint' }),
    L: [I(7, 60, 42, 50, { rd: 2, sh: '0 0 0 .8cqw #fff' }), G(74, 7, 19, 17), B(5, 114, 90, 21, { bg: '#fff', sh: 'inset 0 .6cqw 0 t1' }), T('NM', 8, 116, 84, 10, { f: 'blk', z: 8, c: 't1', up: 1 }), T('ft', 8, 126, 60, 7, { f: 'cond', z: 5, c: '#222', up: 1 }), T('ps', 70, 126, 22, 7, { f: 'cond', z: 5, c: '#222', up: 1, al: 'r' })],
    bk: bk('gray', { pn: 'cartoon' }), sure: 'b', note: 'a horizontal card in real life, drawn upright' });
  def('topps', 1957, { bg: WH, ph: P(5, 5, 90, 130, { b: '0 0 0 .5cqw #222' }),
    L: [B(8, 118, 60, 14, { bg: '#fff', sh: '0 0 0 .5cqw #222' }), T('NM', 10, 119, 56, 7, { f: 'blk', z: 5.6, c: '#111', up: 1 }), T('ft', 10, 125.5, 56, 6, { f: 'cond', z: 4.4, c: 't1', up: 1 })],
    bk: bk('gray', { hd: '#24467a' }), sure: 'a' });
  def('topps', 1958, { bg: WH, ph: P(5, 13, 90, 103, { bg: 't2', f: 'tint' }),
    L: [T('tm', 6, 2, 88, 11, { f: 'blk', z: 9, c: 't1', up: 1, al: 'l' }), B(5, 116, 90, 19, { bg: '#fff', sh: 'inset 0 0 0 .5cqw #222' }), T('NM', 8, 117, 84, 10, { f: 'blk', z: 7, c: '#111', up: 1 }), T('pf', 8, 127, 84, 7, { f: 'cond', z: 5, c: '#333', up: 1 })],
    bk: bk('gray', { hd: '#c25a1f' }), sure: 'a', note: 'real cards set the player on a plain color, which a photograph here can only approach' });
  def('topps', 1959, { bg: 't2', ph: P(10, 6, 80, 80, { s: 'circle', b: '0 0 0 1.2cqw #fff' }),
    L: [B(-4, 98, 108, 22, { bg: '#fff', rot: -8 }), T('NM', 6, 99, 88, 12, { f: 'blk', z: 8, c: '#111', up: 1, al: 'c', rot: -8 }), T('ft', 6, 110, 88, 7, { f: 'scr', z: 7, c: 't1', al: 'c', rot: -8 }), T('pf', 6, 126, 60, 8, { f: 'cond', z: 5.4, c: 'i2', up: 1 }), K(70, 126, 24, 9, { c: 'i2' })],
    bk: bk('gray', { hd: '#a23a2d', pn: 'quiz' }), sure: 'a' });
  def('topps', 1960, { bg: WH, ph: P(5, 22, 90, 113, {}),
    L: [T('NM', 5, 3, 90, 12, { f: 'blk', z: 10, c: 't1', up: 1 }), T('ft', 5, 14, 60, 7, { f: 'cond', z: 5.2, c: '#333', up: 1 }), T('pf', 60, 14, 35, 7, { f: 'cond', z: 5.2, c: '#333', up: 1, al: 'r' }), I(7, 80, 36, 52, { f: 'bw', sh: '0 0 0 .8cqw #fff' })],
    bk: bk('gray', { hd: '#2f6b3a', pn: 'cartoon' }), sure: 'b', note: 'a horizontal card in real life, drawn upright' });
  def('topps', 1961, { bg: WH, ph: P(5, 5, 90, 108, { b: '0 0 0 .4cqw #222' }),
    L: [B(5, 115, 90, 20, { bg: 't1' }), T('NM', 8, 116, 84, 10, { f: 'blk', z: 7.4, c: 'i1', up: 1 }), T('ft', 8, 126, 60, 7, { f: 'cond', z: 5, c: 'i1', up: 1 }), T('ps', 70, 126, 22, 7, { f: 'cond', z: 5, c: 'i1', up: 1, al: 'r' })],
    bk: bk('gray', { hd: '#2f6b3a' }), sure: 'a' });
  def('topps', 1962, { bg: 'wood', ph: P(6, 6, 88, 104, { s: 'curl', b: '0 0 0 .6cqw #2a1a0c' }),
    L: [B(6, 113, 88, 21, { bg: '#fdf8ea', sh: 'inset 0 0 0 .6cqw #2a1a0c' }), T('NM', 9, 114, 82, 10, { f: 'blk', z: 7.6, c: '#111', up: 1 }), T('ft', 9, 124, 82, 7, { f: 'cond', z: 5, c: 't1', up: 1 })],
    bk: bk('gray', { hd: '#7a3d8f' }), sure: 'a', note: 'wood grain' });
  def('topps', 1963, { bg: WH, ph: P(5, 5, 90, 108, {}),
    L: [B(5, 113, 90, 22, { bg: 't1' }), I(63, 95, 30, 30, { s: 'circle', sh: '0 0 0 1cqw t2' }), T('NM', 8, 114, 54, 11, { f: 'blk', z: 7.6, c: 'i1', up: 1 }), T('ft', 8, 125, 54, 8, { f: 'cond', z: 5, c: 'i1', up: 1 })],
    bk: bk('gray', { st: '#e9b9a7', hd: '#3a3a3a' }), sure: 'a' });
  def('topps', 1964, { bg: WH, ph: P(5, 22, 90, 96, {}),
    L: [T('tm', 5, 3, 90, 18, { f: 'blk', z: 16, c: 't1', up: 1, al: 'c' }), B(5, 118, 90, 17, { bg: 't2' }), T('NM', 8, 119, 84, 9, { f: 'blk', z: 7, c: 'i2', up: 1, al: 'c' }), T('pf', 8, 127.5, 84, 6, { f: 'cond', z: 4.6, c: 'i2', up: 1, al: 'c' })],
    bk: bk('gray', { st: '#d6c79a', hd: '#c04a2a', pn: 'quiz' }), sure: 'a' });
  def('topps', 1965, { bg: WH, ph: P(5, 5, 90, 110, { b: '0 0 0 1.2cqw t1' }),
    L: [B(2, 112, 40, 24, { bg: 't2', cp: 'polygon(0 0,100% 30%,100% 70%,0 100%)' }), T('tm', 4, 116, 34, 15, { f: 'blk', z: 6, c: 'i2', up: 1, rot: 0 }), T('NM', 42, 117, 54, 9, { f: 'blk', z: 7, c: '#111', up: 1, al: 'r' }), T('pf', 42, 126, 54, 7, { f: 'cond', z: 5, c: '#333', up: 1, al: 'r' })],
    bk: bk('gray', { hd: '#1e5f8b' }), sure: 'a' });
  def('topps', 1966, { bg: WH, ph: P(5, 5, 90, 112, {}),
    L: [B(5, 5, 34, 34, { bg: 't1', cp: 'polygon(0 0,100% 0,0 100%)' }), T('ps', 6, 7, 20, 10, { f: 'blk', z: 6, c: 'i1', up: 1, rot: -45 }), B(5, 117, 90, 18, { bg: '#fff' }), T('NM', 6, 118, 88, 9, { f: 'blk', z: 7.4, c: '#111', up: 1 }), T('ft', 6, 127, 88, 7, { f: 'cond', z: 5.2, c: 't1', up: 1 })],
    bk: bk('gray', { hd: '#2b2b2b' }), sure: 'c' });
  def('topps', 1967, { bg: WH, ph: P(4, 4, 92, 132, {}),
    L: [T('NM', 7, 6, 86, 8, { f: 'cond', z: 5.4, c: '#fff', up: 1, w: 600 }), T('ps', 7, 13, 30, 6, { f: 'cond', z: 4.6, c: '#fff', up: 1 }), T('tm', 7, 116, 86, 18, { f: 'blk', z: 13, c: 't2', up: 1, al: 'r', sh: 1 })],
    bk: bk('gray', { st: '#d1c3a2', hd: '#2a6b37' }), sure: 'a' });
  def('topps', 1968, { bg: 'burlap', ph: P(7, 7, 86, 110, { s: 'rd' }),
    L: [B(64, 104, 32, 32, { bg: '#fff', rd: 50, sh: '0 0 0 1cqw t1' }), T('ln', 65, 111, 30, 8, { f: 'blk', z: 5, c: '#111', up: 1, al: 'c' }), T('ps', 65, 119, 30, 6, { f: 'cond', z: 4.4, c: 't1', up: 1, al: 'c' }), T('tm', 7, 120, 56, 13, { f: 'blk', z: 9, c: '#2a2015', up: 1 })],
    bk: bk('gray', { st: '#d9c88f', hd: '#7d3b2a' }), sure: 'a', note: 'burlap' });
  def('topps', 1969, { bg: WH, ph: P(5, 5, 90, 112, {}),
    L: [B(5, 117, 90, 18, { bg: '#fff' }), B(3, 100, 26, 26, { bg: 't1', rd: 50, sh: '0 0 0 .8cqw #fff' }), T('ps', 4, 108, 24, 10, { f: 'blk', z: 6, c: 'i1', up: 1, al: 'c' }), T('NM', 31, 118, 64, 9, { f: 'blk', z: 7, c: '#111', up: 1 }), T('tm', 31, 127, 64, 8, { f: 'blk', z: 6, c: 't1', up: 1 })],
    bk: bk('gray', { st: '#e7b4b9', hd: '#2b2b2b' }), sure: 'b' });
  def('topps', 1970, { bg: '#8f9197', ph: P(6, 6, 88, 106, { b: '0 0 0 .7cqw #fff' }),
    L: [T('tm', 6, 112, 88, 11, { f: 'scr', z: 10, c: 't2' }), B(6, 123, 88, 12, { bg: '#fff' }), T('NM', 9, 124, 60, 10, { f: 'blk', z: 6.4, c: '#111', up: 1 }), T('ps', 70, 124, 21, 10, { f: 'blk', z: 6, c: 't1', up: 1, al: 'r' })],
    bk: bk('gray', { st: '#cfd8e3', hd: '#1f3f78' }), sure: 'a', note: 'gray borders' });
  def('topps', 1971, { bg: '#111', ph: P(6, 16, 88, 100, { b: '0 0 0 .5cqw #fff' }),
    L: [T('NM', 6, 3, 70, 8, { f: 'blk', z: 6.4, c: '#fff', up: 1 }), T('ps', 6, 10, 50, 6, { f: 'cond', z: 4.6, c: 't2', up: 1 }), G(78, 2, 16, 14), T('tm', 6, 118, 88, 15, { f: 'blk', z: 12, c: 'color-mix(in srgb,t1 55%,#fff)', up: 1, al: 'c' }), S(30, 98, 60, 15, { c: '#fff', z: 10 })],
    bk: bk('gray', { st: '#cdbf98', hd: '#111' }), sure: 'a', note: 'black borders' });
  def('topps', 1972, { bg: 't2', ph: P(10, 28, 80, 94, { s: 'arch', b: '0 0 0 1.4cqw #fff' }),
    L: [T('tm', 2, 4, 96, 22, { f: 'bung', z: 13, c: 't1', al: 'c', up: 1, sh: 3 }), B(8, 122, 84, 13, { bg: '#fff', rd: 3 }), T('NM', 10, 123, 80, 11, { f: 'blk', z: 6.4, c: '#111', up: 1, al: 'c' })],
    bk: bk('gray', { st: '#dcd0a8', hd: '#2a63a5' }), sure: 'a', note: 'the arched frame and the team name in bright letters' });
  def('topps', 1973, { bg: WH, ph: P(5, 5, 90, 113, {}),
    L: [B(70, 104, 24, 24, { bg: 't1', rd: 50, sh: '0 0 0 .8cqw #fff' }), T('ps', 71, 112, 22, 8, { f: 'blk', z: 6, c: 'i1', al: 'c', up: 1 }), T('NM', 6, 119, 88, 9, { f: 'blk', z: 7.2, c: '#111', up: 1 }), T('ft', 6, 127.5, 88, 7, { f: 'cond', z: 5.2, c: 't1', up: 1 })],
    bk: bk('gray', { st: '#d0c3a0', hd: '#8a3b1d', pn: 'cartoon' }), sure: 'a' });
  def('topps', 1974, { bg: WH, ph: P(5, 5, 90, 112, {}),
    L: [B(5, 5, 50, 16, { bg: 't1', cp: 'polygon(0 0,100% 50%,0 100%)' }), T('tm', 7, 6, 36, 14, { f: 'blk', z: 6, c: 'i1', up: 1 }), B(10, 118, 80, 17, { bg: 't2', rd: 2 }), T('NM', 12, 119, 76, 9, { f: 'blk', z: 7, c: 'i2', up: 1, al: 'c' }), T('pf', 12, 127.5, 76, 6, { f: 'cond', z: 4.6, c: 'i2', up: 1, al: 'c' })],
    bk: bk('gray', { st: '#cde0c4', hd: '#7b2b2b', pn: 'cartoon' }), sure: 'b' });
  def('topps', 1975, { bg: 'two', ph: P(8, 18, 84, 98, { b: '0 0 0 .8cqw #fff' }),
    L: [T('tm', 6, 3, 74, 14, { f: 'blk', z: 10, c: 'i1', up: 1 }), B(76, 2, 20, 20, { bg: '#fff', rd: 50, sh: '0 0 0 .6cqw #111' }), T('ps', 76, 7, 20, 10, { f: 'blk', z: 6, c: '#111', al: 'c', up: 1 }), T('NM', 6, 118, 88, 10, { f: 'blk', z: 7.4, c: 'i2', up: 1, al: 'c' }), S(20, 126, 60, 12, { c: 'i2', z: 8 })],
    bk: bk('gray', { st: '#e6c1c9', hd: '#2b5d8f' }), sure: 'a', note: 'two-color borders' });
  def('topps', 1976, { bg: WH, ph: P(5, 5, 90, 108, {}),
    L: [B(5, 113, 90, 11, { bg: 't1' }), B(5, 124, 90, 11, { bg: 't2' }), T('tm', 26, 113, 66, 11, { f: 'blk', z: 7.4, c: 'i1', up: 1, al: 'r' }), T('NM', 26, 124, 66, 11, { f: 'blk', z: 6.4, c: 'i2', up: 1, al: 'r' }), B(6, 108, 18, 26, { bg: '#fff', rd: 2, sh: '0 0 0 .6cqw t1' }), T('ps', 6, 116, 18, 10, { f: 'blk', z: 6, c: 't1', al: 'c', up: 1 })],
    bk: bk('gray', { st: '#d6cbaa', hd: '#2f6b3a' }), sure: 'a' });
  def('topps', 1977, { bg: WH, ph: P(5, 18, 90, 98, {}),
    L: [T('tm', 5, 3, 90, 14, { f: 'blk', z: 11, c: 't1', up: 1 }), T('NM', 5, 118, 70, 9, { f: 'blk', z: 7, c: '#111', up: 1 }), B(74, 116, 22, 20, { bg: 't2', cp: 'polygon(0 0,100% 50%,0 100%)' }), T('ps', 74, 121, 14, 10, { f: 'blk', z: 5.6, c: 'i2', up: 1 }), S(8, 126, 60, 12, { c: '#111', z: 8 })],
    bk: bk('gray', { st: '#d5c39e', hd: '#7b2b2b', pn: 'cartoon' }), sure: 'a' });
  def('topps', 1978, { bg: WH, ph: P(5, 5, 90, 112, {}),
    L: [B(76, 4, 20, 20, { bg: '#fff', rd: 50, sh: '0 0 0 .6cqw #c33' }), T('ps', 76, 9, 20, 10, { f: 'blk', z: 6, c: '#111', al: 'c', up: 1 }), T('tm', 30, 103, 66, 16, { f: 'scr', z: 13, c: 't1', al: 'r', sh: 2 }), T('NM', 5, 120, 90, 9, { f: 'blk', z: 7, c: '#111', up: 1 }), T('pf', 5, 128, 90, 7, { f: 'cond', z: 5, c: '#555', up: 1 })],
    bk: bk('gray', { st: '#cbbf9c', hd: '#c04a2a', pn: 'quiz' }), sure: 'a' });
  def('topps', 1979, { bg: WH, ph: P(5, 5, 90, 112, {}),
    L: [B(5, 117, 56, 13, { bg: 't1', cp: 'polygon(0 0,92% 0,100% 50%,92% 100%,0 100%)' }), T('tm', 8, 117, 48, 13, { f: 'blk', z: 7, c: 'i1', up: 1 }), B(2, 98, 18, 18, { bg: '#fff', rd: 50, sh: '0 0 0 .6cqw #c33' }), T('ps', 2, 102, 18, 10, { f: 'blk', z: 5.6, c: '#111', al: 'c', up: 1 }), T('NM', 5, 130, 90, 8, { f: 'blk', z: 6, c: '#111', up: 1, al: 'r' })],
    bk: bk('gray', { st: '#cbbf9c', hd: '#2f6b3a' }), sure: 'a' });
  def('topps', 1980, { bg: WH, ph: P(5, 5, 90, 112, {}),
    L: [B(4, 4, 30, 22, { bg: 't1', cp: 'polygon(0 0,100% 0,100% 100%,50% 80%,0 100%)' }), T('ps', 4, 6, 30, 12, { f: 'blk', z: 6.6, c: 'i1', al: 'c', up: 1 }), B(46, 113, 52, 20, { bg: 't2', cp: 'polygon(0 0,100% 0,100% 100%,0 100%,8% 50%)' }), T('tm', 52, 114, 44, 9, { f: 'blk', z: 6, c: 'i2', up: 1, al: 'r' }), T('NM', 52, 123, 44, 9, { f: 'blk', z: 5.4, c: 'i2', up: 1, al: 'r' }), S(8, 96, 60, 14, { c: '#fff', z: 10 })],
    bk: bk('gray', { st: '#c9c1ad', hd: '#24467a' }), sure: 'a' });
  def('topps', 1981, { bg: WH, ph: P(5, 5, 90, 112, { b: '0 0 0 .8cqw t1' }),
    L: [B(3, 104, 26, 26, { bg: 't1', rd: '50% 50% 10% 10%' }), T('ps', 3, 112, 26, 10, { f: 'blk', z: 6, c: 'i1', al: 'c', up: 1 }), T('tm', 31, 118, 64, 8, { f: 'blk', z: 6.4, c: 't1', up: 1 }), T('NM', 31, 126, 64, 9, { f: 'blk', z: 6.6, c: '#111', up: 1 })],
    bk: bk('gray', { st: '#d9cfb8', hd: '#b3261e' }), sure: 'a', note: 'the cap with the team name' });
  def('topps', 1982, { bg: WH, ph: P(10, 5, 85, 110, {}),
    L: [B(3, 5, 3, 124, { bg: 't1' }), B(7, 5, 2, 124, { bg: 't2' }), B(3, 126, 92, 3, { bg: 't1' }), B(7, 122, 88, 2, { bg: 't2' }), T('tm', 12, 113, 80, 8, { f: 'blk', z: 6.4, c: 't1', up: 1, al: 'r' }), T('NM', 12, 129, 80, 9, { f: 'blk', z: 6.4, c: '#111', up: 1, al: 'r' }), S(14, 96, 60, 14, { c: '#fff', z: 10 })],
    bk: bk('gray', { st: '#d6d6c8', hd: '#2a6b37' }), sure: 'a', note: 'hockey sticks' });
  def('topps', 1983, { bg: WH, ph: P(5, 5, 90, 104, {}),
    L: [B(5, 109, 90, 26, { bg: '#fff' }), I(62, 96, 33, 33, { s: 'circle', sh: '0 0 0 1cqw t1' }), T('tm', 6, 111, 56, 10, { f: 'blk', z: 7.4, c: 't1', up: 1 }), T('NM', 6, 121, 56, 8, { f: 'blk', z: 5.6, c: '#111', up: 1 }), T('ps', 6, 128, 56, 6, { f: 'cond', z: 4.6, c: '#444', up: 1 })],
    bk: bk('gray', { st: '#d6c7a1', hd: '#c25a1f' }), sure: 'a' });
  def('topps', 1984, { bg: WH, ph: P(20, 5, 75, 104, {}),
    L: [T('tm', -48, 52, 110, 14, { f: 'blk', z: 11, c: 't1', up: 1, rot: -90, al: 'c' }), I(4, 104, 28, 32, { sh: '0 0 0 .8cqw t2' }), B(34, 111, 61, 24, { bg: 't2' }), T('NM', 36, 113, 57, 10, { f: 'blk', z: 6.4, c: 'i2', up: 1 }), T('ps', 36, 124, 57, 8, { f: 'cond', z: 5, c: 'i2', up: 1 })],
    bk: bk('gray', { st: '#d0c8b0', hd: '#6d2f8a' }), sure: 'a' });
  def('topps', 1985, { bg: WH, ph: P(5, 5, 90, 108, { b: '0 0 0 .5cqw t1' }),
    L: [B(5, 116, 90, 19, { bg: 't2' }), B(3, 104, 26, 26, { bg: '#fff', rd: 50, sh: '0 0 0 .8cqw t1' }), G(6, 107, 20, 20), T('NM', 31, 117, 62, 9, { f: 'blk', z: 6.6, c: 'i2', up: 1 }), T('ps', 31, 126, 62, 7, { f: 'cond', z: 5, c: 'i2', up: 1 })],
    bk: bk('gray', { st: '#d3c39d', hd: '#b3261e' }), sure: 'a' });
  def('topps', 1986, { bg: WH, ph: P(5, 22, 90, 96, {}),
    L: [B(0, 0, 100, 20, { bg: '#111' }), T('tm', 4, 2, 92, 17, { f: 'blk', z: 13, c: 'color-mix(in srgb,t1 55%,#fff)', up: 1, al: 'c' }), B(5, 118, 90, 17, { bg: '#fff', sh: 'inset 0 .6cqw 0 t1' }), T('NM', 6, 121, 70, 10, { f: 'blk', z: 6.4, c: '#111', up: 1 }), B(78, 118, 17, 17, { bg: 't1', rd: 50 }), T('ps', 78, 122, 17, 9, { f: 'blk', z: 5.4, c: 'i1', al: 'c', up: 1 })],
    bk: bk('gray', { st: '#ccbfa6', hd: '#b3261e' }), sure: 'a', note: 'the black band at the top' });
  def('topps', 1987, { bg: 'wood', ph: P(7, 7, 86, 108, { b: '0 0 0 .6cqw #1f140a' }),
    L: [B(4, 4, 24, 24, { bg: '#fff', rd: 50, sh: '0 0 0 .8cqw t1' }), G(7, 7, 18, 18), B(34, 116, 62, 18, { bg: 't1', cp: 'polygon(6% 0,100% 0,94% 100%,0 100%)' }), T('NM', 38, 117, 54, 16, { f: 'blk', z: 6.4, c: 'i1', up: 1, al: 'c' })],
    bk: bk('gray', { st: '#c9b98f', hd: '#2a4f8f' }), sure: 'a', note: 'wood grain' });
  def('topps', 1988, { bg: WH, ph: P(5, 16, 90, 100, {}),
    L: [T('tm', 4, 1, 92, 17, { f: 'blk', z: 13, c: 't1', up: 1, al: 'c' }), B(46, 112, 54, 18, { bg: 't2', cp: 'polygon(10% 0,100% 0,100% 100%,0 100%)' }), T('NM', 52, 113, 44, 16, { f: 'blk', z: 5.6, c: 'i2', up: 1, al: 'r' }), T('ps', 6, 128, 30, 8, { f: 'cond', z: 4.8, c: '#444', up: 1 })],
    bk: bk('gray', { st: '#e3c09a', hd: '#c25a1f' }), sure: 'a' });
  def('topps', 1989, { bg: WH, ph: P(5, 5, 90, 112, {}),
    L: [B(34, 108, 70, 16, { bg: 't1', rot: -14 }), T('NM', 38, 109, 60, 14, { f: 'blk', z: 6.4, c: 'i1', up: 1, al: 'c', rot: -14 }), T('tm', 5, 124, 70, 12, { f: 'blk', z: 9, c: 't2', up: 1 })],
    bk: bk('gray', { st: '#e7b5b6', hd: '#2b2b2b' }), sure: 'a' });
  def('topps', 1990, { bg: 'two', ph: P(9, 18, 82, 98, { b: '0 0 0 .8cqw #fff' }),
    L: [T('tm', 9, 2, 82, 15, { f: 'blk', z: 11, c: 'i1', up: 1, al: 'c' }), B(9, 119, 82, 15, { bg: '#fff' }), T('NM', 11, 120, 78, 13, { f: 'blk', z: 6.6, c: '#111', up: 1, al: 'c' })],
    bk: bk('gray', { st: '#e7b24f', hd: '#2b2b2b' }), sure: 'a', note: 'bright two-color borders' });
  def('topps', 1991, { bg: WH, ph: P(6, 6, 88, 108, { b: '0 0 0 .6cqw t1, 0 0 0 1.4cqw t2' }),
    L: [B(3, 3, 22, 18, { bg: '#c9a33a', rd: 2, sh: '0 0 0 .5cqw #fff' }), T('yr', 3, 5, 22, 14, { f: 'blk', z: 5.4, c: '#111', al: 'c' }), B(6, 117, 88, 18, { bg: 't1' }), T('NM', 9, 118, 82, 9, { f: 'blk', z: 6.6, c: 'i1', up: 1 }), T('tm', 9, 127, 82, 7, { f: 'cond', z: 5, c: 'i1', up: 1 })],
    bk: bk('gray', { st: '#d9c08a', hd: '#b3261e' }), sure: 'b', note: 'the fortieth year' });
  def('topps', 1992, { bg: WH, ph: P(6, 6, 88, 110, { b: '0 0 0 .5cqw t1' }),
    L: [B(6, 119, 88, 16, { bg: 't2' }), T('NM', 8, 120, 60, 14, { f: 'blk', z: 6.2, c: 'i2', up: 1 }), T('tm', 60, 120, 32, 14, { f: 'cond', z: 4.8, c: 'i2', up: 1, al: 'r' })],
    bk: bk('white', { st: '#e9e4d6' }), sure: 'c' });
  def('topps', 1993, { bg: WH, ph: P(6, 6, 88, 110, {}),
    L: [B(6, 116, 88, 4, { bg: 't1' }), T('NM', 6, 121, 88, 8, { f: 'blk', z: 6.4, c: '#111', up: 1 }), T('tm', 6, 128, 88, 7, { f: 'cond', z: 5, c: 't1', up: 1 })],
    bk: bk('white', {}), sure: 'c' });
  def('topps', 1994, { bg: WH, ph: P(6, 6, 88, 110, { b: '0 0 0 .6cqw t2' }),
    L: [B(2, 114, 96, 15, { bg: 't1', rd: 1 }), T('NM', 6, 115, 88, 13, { f: 'blk', z: 6.6, c: 'i1', up: 1, al: 'c' }), T('tm', 6, 129, 88, 8, { f: 'cond', z: 5, c: 't1', up: 1, al: 'c' })],
    bk: bk('white', {}), sure: 'c' });
  def('topps', 1995, { bg: WH, ph: P(6, 6, 88, 110, {}),
    L: [B(6, 113, 88, 22, { bg: 'linear-gradient(90deg,t1,t2)' }), T('NM', 9, 114, 82, 11, { f: 'cond8', z: 8, c: 'i1', up: 1 }), T('tm', 9, 125, 82, 8, { f: 'cond', z: 5, c: 'i1', up: 1 })],
    bk: bk('white', {}), sure: 'c' });
  def('topps', 1996, { bg: WH, ph: P(6, 6, 88, 116, {}),
    L: [B(6, 108, 88, 14, { bg: 'linear-gradient(0deg,rgba(0,0,0,.75),transparent)' }), T('NM', 9, 110, 82, 10, { f: 'cond8', z: 8, c: '#fff', up: 1 }), T('tm', 6, 124, 88, 10, { f: 'blk', z: 6.4, c: 't1', up: 1, al: 'c' })],
    bk: bk('white', {}), sure: 'c' });
  def('topps', 1997, { bg: WH, ph: P(6, 6, 88, 112, { b: '0 0 0 .5cqw #c9a33a' }),
    L: [B(6, 120, 88, 15, { bg: '#c9a33a' }), T('NM', 8, 121, 84, 8, { f: 'blk', z: 6.2, c: '#111', up: 1, al: 'c' }), T('tm', 8, 128, 84, 6, { f: 'cond', z: 4.6, c: '#111', up: 1, al: 'c' })],
    bk: bk('white', {}), sure: 'c' });
  def('topps', 1998, { bg: '#c9a33a', ph: P(6, 6, 88, 112, { b: '0 0 0 .5cqw #fff' }),
    L: [B(6, 120, 88, 15, { bg: '#fff' }), T('NM', 8, 121, 84, 8, { f: 'blk', z: 6.2, c: '#111', up: 1 }), T('tm', 8, 128, 84, 6, { f: 'cond', z: 4.6, c: 't1', up: 1 })],
    bk: bk('white', {}), sure: 'c' });
  def('topps', 1999, { bg: WH, ph: P(6, 6, 88, 112, {}),
    L: [B(6, 112, 88, 24, { bg: 't1', cp: 'ellipse(70% 100% at 50% 100%)' }), T('NM', 10, 119, 80, 9, { f: 'blk', z: 6.4, c: 'i1', up: 1, al: 'c' }), T('tm', 10, 127, 80, 7, { f: 'cond', z: 4.8, c: 'i1', up: 1, al: 'c' })],
    bk: bk('white', {}), sure: 'c' });
  def('topps', 2000, { bg: '#5d6168', ph: P(6, 6, 88, 114, { b: '0 0 0 .5cqw #c4c8cf' }),
    L: [T('NM', 6, 122, 88, 8, { f: 'blk', z: 6.4, c: '#fff', up: 1 }), T('tm', 6, 129, 88, 7, { f: 'cond', z: 5, c: '#c4c8cf', up: 1 })],
    bk: bk('white', {}), sure: 'c' });
  def('topps', 2001, { bg: '#1f6b3a', ph: P(6, 6, 88, 112, { b: '0 0 0 .6cqw #f5d36b' }),
    L: [B(6, 121, 88, 14, { bg: '#f5f0dc' }), T('NM', 8, 122, 60, 12, { f: 'blk', z: 6.4, c: '#1f6b3a', up: 1 }), T('tm', 60, 122, 32, 12, { f: 'cond', z: 4.6, c: '#333', up: 1, al: 'r' })],
    bk: bk('white', { hd: '#1f6b3a', hi: '#fff' }), sure: 'b', note: 'the green borders of the fiftieth year' });
  def('topps', 2002, { bg: '#1e3f7a', ph: P(6, 6, 88, 112, { b: '0 0 0 .6cqw #fff' }),
    L: [T('NM', 6, 121, 88, 8, { f: 'blk', z: 6.4, c: '#fff', up: 1 }), T('tm', 6, 128.5, 88, 7, { f: 'cond', z: 5, c: '#cfe0ff', up: 1 })],
    bk: bk('white', {}), sure: 'c' });
  def('topps', range(2003, 2006), { bg: WH, ph: P(6, 6, 88, 112, {}),
    L: [B(6, 118, 88, 17, { bg: 't1' }), B(6, 118, 88, 1.2, { bg: 't2' }), G(8, 119.5, 14, 14), T('NM', 24, 119, 68, 9, { f: 'blk', z: 6.4, c: 'i1', up: 1 }), T('pf', 24, 127.5, 68, 7, { f: 'cond', z: 4.8, c: 'i1', up: 1 })],
    bk: bk('white', {}), sure: 'c' });
  def('topps', 2007, { bg: '#111', ph: P(5, 5, 90, 114, {}),
    L: [G(78, 103, 15, 15), T('NM', 6, 121, 70, 8, { f: 'blk', z: 6.4, c: '#fff', up: 1 }), T('pf', 6, 128.5, 70, 7, { f: 'cond', z: 4.8, c: 't2', up: 1 })],
    bk: bk('white', {}), sure: 'b', note: 'black borders' });
  def('topps', range(2008, 2012), { bg: WH, ph: P(5, 5, 90, 116, { s: 'rd' }),
    L: [B(70, 100, 24, 24, { bg: '#fff', rd: 50, sh: '0 0 0 .7cqw t1' }), G(73, 103, 18, 18), T('NM', 6, 122, 70, 8, { f: 'blk', z: 6.4, c: '#111', up: 1 }), T('pf', 6, 129, 70, 7, { f: 'cond', z: 4.8, c: 't1', up: 1 })],
    bk: bk('white', {}), sure: 'c' });
  def('topps', range(2013, 2025), { bg: '#fff', ph: P(3, 3, 94, 134, { s: 'rd' }),
    L: [B(3, 112, 94, 25, { bg: 'linear-gradient(0deg,rgba(0,0,0,.8),transparent)' }), B(6, 124, 6, 6, { bg: 't2', rot: 45 }), G(78, 114, 16, 16), T('NM', 14, 120, 62, 9, { f: 'cond8', z: 7.4, c: '#fff', up: 1 }), T('pf', 14, 128.5, 62, 6, { f: 'cond', z: 4.6, c: '#fff', up: 1, o: .85 })],
    bk: bk('white', {}), sure: 'c', note: 'the full-bleed photographs of the 2010s and 2020s' });

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
