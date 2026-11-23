'use strict';
// History view: Blokus (games/blokus.html). detail: {mv: 'f2k7 c1a3 ...' (every piece placed from the start: piece
// letter, orientation, cell in base 36), np (players), sc: [score of Blue, Yellow, Red, Green], psc: [each player's
// total], win: [winning players], bl: '0 3 0 ...' (squares other colors could start from that each move covered),
// cols: '0101' (the player who owned each color; - for the shared one), n}
// The positions are rebuilt with blokus-core.js (hist-view.js loads it first), so the pieces are the game's own.
(function () {
  if (!window.HistView) return;
  var N = 20, HEX = [null, '#2f74e0', '#f2c418', '#e2382c', '#2fa152'], DARK = [null, '#123a86', '#8a6200', '#7c0f0a', '#0e5527'];
  var CN = [null, 'Blue', 'Yellow', 'Red', 'Green'];
  // the board as a picture: the slate grid, the pieces, the last piece ringed
  function boardSvg(C, st, lastCells) {
    var s = '<svg viewBox="-0.3 -0.3 20.6 20.6" role="img" aria-label="Blokus board"><rect x="-0.3" y="-0.3" width="20.6" height="20.6" rx=".3" fill="#171a22"/><g fill="#2a2f3c">';
    for (var x = 0; x < 400; x++) s += '<rect x="' + (x % N + 0.06) + '" y="' + (Math.floor(x / N) + 0.06) + '" width=".88" height=".88" rx=".1"/>';
    s += '</g>';
    for (x = 0; x < 400; x++) {
      var c = st.b[x]; if (!c) continue;
      s += '<rect x="' + (x % N + 0.05) + '" y="' + (Math.floor(x / N) + 0.05) + '" width=".9" height=".9" rx=".14" fill="' + HEX[c] + '" stroke="' + DARK[c] + '" stroke-width=".06"/>';
    }
    if (lastCells && lastCells.length) {
      var mr = 99, mc = 99, xr = -1, xc = -1;
      lastCells.forEach(function (y) { mr = Math.min(mr, Math.floor(y / N)); mc = Math.min(mc, y % N); xr = Math.max(xr, Math.floor(y / N)); xc = Math.max(xc, y % N); });
      s += '<rect x="' + (mc - 0.1) + '" y="' + (mr - 0.1) + '" width="' + (xc - mc + 1.2) + '" height="' + (xr - mr + 1.2) + '" rx=".3" fill="none" stroke="#ffd75a" stroke-width=".12"/>';
    }
    return s + '</svg>';
  }
  function pname(e, i) { var p = (e.players || [])[i]; return p ? String(p.name).replace(/ \((Blue|Yellow|Red|Green)( and (Blue|Yellow|Red|Green))?\)$/, '') : 'Player ' + (i + 1); }

  HistView.register('blokus', function (e, ui) {
    var d = e.dt, C = window.BlokusCore; if (!d || d.mv == null || !C) return null;
    var list = String(d.mv || '').split(' ').filter(Boolean), np = +d.np || 4;
    var pos = C.replay(list, np);
    if (!pos) return null;
    var M = list.length, fin = pos[M];
    var lastOf = function (n) { return n ? C.cellsOf(C.uncode(list[n - 1])) : null; };
    var snap = ui.el('div', null, [ui.picture(boardSvg(C, fin, lastOf(M)), { frame: 'wood' })]);
    var out = [ui.section('Final board', snap)];
    var cols = String(d.cols || ''), ownOf = function (c) { var ch = cols.charAt(c - 1); return ch === '-' ? -1 : ch ? +ch : fin.own[c]; };
    if (M > 1) {
      var showAt = function (n) {
        snap.innerHTML = ''; snap.appendChild(ui.picture(boardSvg(C, pos[n], lastOf(n)), { frame: 'wood' }));
        if (!n) return 'The empty board';
        var m = C.uncode(list[n - 1]), cl = C.cellsOf(m), c = pos[n].b[cl[0]], dd = C.dec(m);
        return (n === M ? 'The last piece, move ' : 'Move ') + n + ': ' + CN[c] + ' placed ' + C.PIECES[dd.p].name + ' at ' + C.cellName(cl[0]);
      };
      if (HistView.boardUI && HistView.boardUI.replay) out.push(ui.section('Replay', HistView.boardUI.replay(ui, M, showAt)));
      else {
        var label = ui.el('b'), rng = ui.el('input', { type: 'range', min: '0', max: String(M), value: String(M), 'aria-label': 'Move', style: { width: '100%', boxSizing: 'border-box' } });
        rng.addEventListener('input', function () { label.textContent = showAt(+rng.value); });
        label.textContent = showAt(M);
        out.push(ui.section('Replay', ui.el('div', null, [rng, label])));
      }
    }
    // each color's tray at the end and its score
    var rows = [1, 2, 3, 4].map(function (c) {
      var left = C.squaresLeft(fin, c), all = !fin.left[c];
      return [CN[c], all ? 'None' : String(left), all ? (fin.lastP[c] === 0 ? '+20' : '+15') : String(-left)];
    });
    out.push(ui.section('Scores by color', ui.table(['Color', 'Squares left', 'Score'], rows)));
    var tot = (d.psc || fin.psc || []).map(function (v, i) {
      var cs = [1, 2, 3, 4].filter(function (c) { return ownOf(c) === i; }).map(function (c) { return CN[c]; });
      return [pname(e, i), cs.join(' and '), (v > 0 ? '+' : '') + v];
    });
    if (tot.length) out.push(ui.table(['Player', 'Colors', 'Total'], tot));
    // the biggest blocks
    var bl = String(d.bl || '').split(' ').map(Number), best = 0, bi = -1;
    bl.forEach(function (v, i) { if (v > best) { best = v; bi = i; } });
    var facts = [];
    if (best >= 3 && bi >= 0) {
      var off = M - bl.length, k = bi + off, cl2 = C.cellsOf(C.uncode(list[k])), c2 = pos[k + 1].b[cl2[0]];
      facts.push(['The biggest block', CN[c2] + ' covered ' + best + ' squares other colors could start from, on move ' + (k + 1) + '.']);
    }
    if (np === 3) facts.push(['Green', 'Shared by the three players, and not scored.']);
    if (np === 2) facts.push(['Two players', pname(e, ownOf(1)) + ' played Blue and Red, and ' + pname(e, ownOf(2)) + ' played Yellow and Green.']);
    if (facts.length) out.push(ui.facts(facts));
    return ui.wrap(out);
  });
})();
