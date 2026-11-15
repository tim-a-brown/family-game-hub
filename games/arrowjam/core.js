// ═══════════════════════════════════════════════════════════════════════════
// Arrow Jam rules: the same code runs in the page and in Node (scripts/arrowjam).
//
// A level is {w, h, m, a}: a board w by h cells (cell index = y * w + x), m the cells that are part of the board's
// shape as a string of 0 and 1 (left out: every cell), and a the arrows. An arrow is [d, c0, c1, ..., head]: the
// cells it lies on from its tail to its head, and d the way its head points (0 up, 1 right, 2 down, 3 left), which
// for an arrow of two cells or more is the way its last step goes.
// An arrow can leave when every cell from its head straight on to the board's edge (its way out) is clear of the
// other arrows still on the board. Taking an arrow away never blocks another, so a board can be cleared exactly when
// the "A blocks B" links (A has a cell on B's way out) never go round in a circle.
// ═══════════════════════════════════════════════════════════════════════════
(function () {
  'use strict';
  var DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];

  function head(a) { return a[a.length - 1]; }
  // the cells from an arrow's head straight on to the board's edge
  function ray(L, a) {
    var h = head(a), x = h % L.w, y = (h - x) / L.w, d = a[0], out = [];
    for (;;) { x += DX[d]; y += DY[d]; if (x < 0 || y < 0 || x >= L.w || y >= L.h) break; out.push(y * L.w + x); }
    return out;
  }
  // which arrow lies on each cell (-1: none), for the arrows still on the board (gone[i] true: taken away)
  function occ(L, gone) {
    var o = new Int16Array(L.w * L.h).fill(-1);
    L.a.forEach(function (a, i) { if (gone && gone[i]) return; for (var k = 1; k < a.length; k++) o[a[k]] = i; });
    return o;
  }
  // the first arrow on i's way out, and how many clear cells come before it ({by: -1} when the way is clear)
  function blocker(L, i, o) {
    var r = ray(L, L.a[i]);
    for (var k = 0; k < r.length; k++) if (o[r[k]] >= 0 && o[r[k]] !== i) return { by: o[r[k]], gap: k, cell: r[k] };
    return { by: -1, gap: r.length };
  }
  function free(L, gone, o) {
    o = o || occ(L, gone);
    var out = [];
    for (var i = 0; i < L.a.length; i++) if (!(gone && gone[i]) && blocker(L, i, o).by < 0) out.push(i);
    return out;
  }
  // the "must go first" links: before[i] lists the arrows lying on i's way out
  function links(L) {
    var o = occ(L), before = L.a.map(function () { return []; });
    L.a.forEach(function (a, i) {
      var seen = {};
      ray(L, a).forEach(function (c) { var j = o[c]; if (j >= 0 && j !== i && !seen[j]) { seen[j] = 1; before[i].push(j); } });
    });
    return before;
  }
  // Clear the board the way a player who never bumps would, taking every free arrow each round. Returns the rounds
  // (lists of arrows), or null when some arrows can never leave.
  function solve(L) {
    var gone = {}, left = L.a.length, rounds = [];
    while (left) {
      var f = free(L, gone);
      if (!f.length) return null;
      f.forEach(function (i) { gone[i] = true; }); left -= f.length; rounds.push(f);
    }
    return rounds;
  }
  // Is the level well made? Every arrow in bounds and in the shape, its cells joined step by step, no two arrows on a
  // cell, the head pointing the way its last step goes, nothing of its own on its way out. Returns a list of faults.
  function check(L) {
    var bad = [], seen = {};
    L.a.forEach(function (a, i) {
      if (!(a[0] >= 0 && a[0] <= 3) || a.length < 2) { bad.push('arrow ' + i + ' has no direction or cells'); return; }
      for (var k = 1; k < a.length; k++) {
        var c = a[k];
        if (!(c >= 0 && c < L.w * L.h)) bad.push('arrow ' + i + ' is off the board');
        if (L.m && L.m.charAt(c) !== '1') bad.push('arrow ' + i + ' is outside the shape');
        if (seen[c] != null) bad.push('arrows ' + seen[c] + ' and ' + i + ' share a cell'); seen[c] = i;
        if (k > 1) {
          var p = a[k - 1], dx = c % L.w - p % L.w, dy = Math.floor(c / L.w) - Math.floor(p / L.w);
          if (Math.abs(dx) + Math.abs(dy) !== 1) bad.push('arrow ' + i + ' has a gap');
          if (k === a.length - 1 && (dx !== DX[a[0]] || dy !== DY[a[0]])) bad.push('arrow ' + i + ' points away from its last step');
        }
      }
      var own = {}; for (k = 1; k < a.length; k++) own[a[k]] = 1;
      ray(L, a).forEach(function (c) { if (own[c]) bad.push('arrow ' + i + ' lies on its own way out'); });
    });
    if (!solve(L)) bad.push('the board cannot be cleared');
    return bad;
  }

  var API = { DX: DX, DY: DY, head: head, ray: ray, occ: occ, blocker: blocker, free: free, links: links, solve: solve, check: check };
  if (typeof module === 'object' && module.exports) module.exports = API; else window.ArrowJamCore = API;
})();
