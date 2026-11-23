'use strict';
// History view: Entropy (games/entropy.html). detail: {sz (7 or 5), f (the seat who was Order in game 1), sc: [game 1's
// score, game 2's] (Order's points), b1, b2 (each game's final board, digits row by row from the top, 1-7 a color),
// m1, m2 (each game's moves: '3d4' Chaos put color 3 on d4, 'd4-d7' Order's slide, 'pass'), win (seat, -1 a draw),
// best: [each seat's longest palindrome made as Order], big: [each seat's best single slide]}
// The scoring runs and the replay are worked out again with entropy-core.js (hist-view.js loads it first).
(function () {
  if (!window.HistView) return;
  var HEX = [null, '#d8352c', '#f0b41f', '#2f9a4c', '#2c6fd8', '#8a4fd0', '#ece4d2', '#2b2d33'];
  var NAMES = [null, 'red', 'yellow', 'green', 'blue', 'purple', 'white', 'black'];
  // a board as a picture: the slate tray, its chips, and the palindromes outlined in gold (the longest in each place)
  function boardSvg(C, b, sz, o) {
    o = o || {};
    var s = '<svg viewBox="-0.15 -0.15 ' + (sz + 0.3) + ' ' + (sz + 0.3) + '" role="img" aria-label="Entropy board"><rect x="-0.15" y="-0.15" width="' + (sz + 0.3) + '" height="' + (sz + 0.3) + '" rx=".2" fill="#36404a"/>';
    for (var i = 0; i < sz * sz; i++) {
      var x = i % sz + 0.5, y = Math.floor(i / sz) + 0.5;
      s += '<circle cx="' + x + '" cy="' + y + '" r=".4" fill="rgba(0,0,0,.3)"/>';
      if (b[i]) s += '<circle cx="' + x + '" cy="' + (y + 0.04) + '" r=".4" fill="rgba(0,0,0,.4)"/><circle cx="' + x + '" cy="' + y + '" r=".39" fill="' + HEX[b[i]] + '"' + (b[i] === 7 ? ' stroke="rgba(220,225,235,.45)" stroke-width=".04"' : '') + '/><circle cx="' + (x - 0.12) + '" cy="' + (y - 0.14) + '" r=".11" fill="rgba(255,255,255,.3)"/>';
    }
    if (o.runs !== false) {
      var runs = C.score(b, sz).runs;
      runs.filter(function (r) { return !runs.some(function (q) { return q !== r && q[0] === r[0] && q[1] <= r[1] && q[1] + q[2] >= r[1] + r[2] && q[2] > r[2]; }); }).forEach(function (r) {
        var k = r[0], a = r[1], len = r[2], p = 0.07;
        var rx = k < sz ? a + p : k - sz + p, ry = k < sz ? k + p : a + p, w = k < sz ? len - 2 * p : 1 - 2 * p, h = k < sz ? 1 - 2 * p : len - 2 * p;
        s += '<rect x="' + rx + '" y="' + ry + '" width="' + w + '" height="' + h + '" rx=".43" fill="none" stroke="#ffd75a" stroke-width=".06"/>';
      });
    }
    if (o.last >= 0) s += '<circle cx="' + (o.last % sz + 0.5) + '" cy="' + (Math.floor(o.last / sz) + 0.5) + '" r=".47" fill="none" stroke="#fff" stroke-width=".07"/>';
    return s + '</svg>';
  }
  function digits(str) { return String(str || '').split('').map(Number); }

  HistView.register('entropy', function (e, ui) {
    var d = e.dt, C = window.EntropyCore; if (!d || !d.b1 || !C) return null;
    var sz = d.sz === 5 ? 5 : 7, pl = e.players || [], f = d.f ? 1 : 0;
    function nm(seat) { var p = pl[seat]; return p ? String(p.name) : seat ? 'Second player' : 'First player'; }
    var out = [];
    // the scores side by side: who was Order in each game, and the totals
    var sc = d.sc || [], o1 = f, o2 = 1 - f;
    out.push(ui.table(['', nm(0), nm(1)], [
      ['Game 1', o1 === 0 ? sc[0] + ' as Order' : 'Chaos', o1 === 1 ? sc[0] + ' as Order' : 'Chaos'],
      ['Game 2', o2 === 0 ? (sc[1] != null ? sc[1] + ' as Order' : '') : 'Chaos', o2 === 1 ? (sc[1] != null ? sc[1] + ' as Order' : '') : 'Chaos'],
      ['Points as Order', o1 === 0 ? sc[0] : sc[1], o1 === 1 ? sc[0] : sc[1]]]));
    [['b1', 'm1', 0], ['b2', 'm2', 1]].forEach(function (g) {
      if (!d[g[0]]) return;
      var fin = digits(d[g[0]]), order = g[2] === 0 ? o1 : o2, rp = C.replay(sz, d[g[1]]), M = rp.moves.length;
      var snap = ui.el('div', null, [ui.picture(boardSvg(C, fin, sz), { frame: 'wood' })]);
      var parts = [snap];
      // every line that scored, with its points
      var s = C.score(fin, sz), lines = [];
      s.lines.forEach(function (p, k) { if (p) lines.push({ t: C.lineName(k, sz).replace(/^./, function (x) { return x.toUpperCase(); }) + ': ' + p, c: '#ffd75a' }); });
      if (lines.length) parts.push(ui.chips(lines));
      if (M > 1) {
        var label = ui.el('b'), rng = ui.el('input', { type: 'range', min: '0', max: String(M), value: String(M), class: 'hv-range', 'aria-label': 'Move' });
        var showAt = function (n) {
          snap.innerHTML = '';
          var mv = n ? rp.moves[n - 1] : null, last = mv ? (mv.t === 'place' ? mv.i : mv.t === 'slide' ? mv.to : -1) : -1;
          snap.appendChild(ui.picture(boardSvg(C, rp.boards[n], sz, { last: last }), { frame: 'wood' }));
          if (!n) return 'The empty board';
          var who = mv.t === 'place' ? nm(1 - order) : nm(order);
          return 'Move ' + n + ': ' + (mv.t === 'place' ? who + ' put a ' + NAMES[mv.c] + ' chip on ' + C.name(mv.i, sz) : mv.t === 'pass' ? who + ' passed' : who + ' slid the ' + NAMES[mv.c] + ' chip from ' + C.name(mv.f, sz) + ' to ' + C.name(mv.to, sz)) +
            ', ' + C.total(rp.boards[n], sz) + ' points standing';
        };
        rng.addEventListener('input', function () { label.textContent = showAt(+rng.value); });
        label.textContent = 'The final board: ' + nm(order) + ' scored ' + sc[g[2]] + ' as Order';
        parts.push(ui.el('div', { class: 'hv-replay' }, [rng, label]));
      }
      out.push(ui.section('Game ' + (g[2] + 1) + ': ' + nm(order) + ' as Order, ' + (sc[g[2]] != null ? sc[g[2]] : C.total(fin, sz)) + ' points', parts));
    });
    var facts = [['Board', sz + ' by ' + sz + ', ' + sz * sz + ' chips']];
    if (d.win === -1) facts.push(['How it ended', 'Both players scored the same as Order: a draw.']);
    [0, 1].forEach(function (s2) {
      if (d.best && d.best[s2] >= 4) facts.push([Kit.poss ? Kit.poss(nm(s2)) + ' longest palindrome' : nm(s2), d.best[s2] + ' chips']);
      if (d.big && d.big[s2] >= 6) facts.push([Kit.poss ? Kit.poss(nm(s2)) + ' best slide' : nm(s2), d.big[s2] + ' points']);
    });
    out.push(ui.facts(facts));
    return ui.wrap(out);
  });
})();
