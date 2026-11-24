'use strict';
// History view: Kamisado. The board at the end with every tower's rank, the rounds of a match (who won each, how, the
// tower promoted and its points, the set-up chosen), a replay of every round move by move (rebuilt from each round's
// starting board and moves with games/kamisado-core.js, which hist-view.js loads first), and the numbers side by side.
// detail: {target, pts [b, w], sides 'bw' (the players' colors in record order), grid [8 rows, Core.grid's letters],
// rk '0000...' (the 16 towers' ranks, Black orange to brown then White), rounds [{w 'b'|'w', why 'home'|'deadlock',
// c (the promoted tower's color), rk, pts, n (moves), ml 'c1-c5,pass,...', g0 (the round's starting board, 64 letters),
// k0 (the ranks then), fill 'L'|'R'|'', first 'b'|'w'}], blocks [b, w], pushes [b, w], n}
(function () {
  if (!window.HistView) return;
  var INK = ['#dd7a26', '#2a5fb5', '#6a3c9e', '#d0628e', '#e3b52f', '#b52d2b', '#2f8a4b', '#76462a'];
  var RANKS = ['tower', 'Sumo', 'Double Sumo', 'Triple Sumo', 'Quadruple Sumo'];
  // the board as a picture: b [64], rk [17], from/to: the last move's squares
  function svg(C, b, rk, from, to) {
    var S = 100, s = '<svg viewBox="0 0 840 840" role="img" aria-label="Kamisado board"><defs>' +
      '<radialGradient id="hkb" cx=".36" cy=".3" r=".8"><stop offset="0" stop-color="#5d6170"/><stop offset=".3" stop-color="#2a2c33"/><stop offset="1" stop-color="#050506"/></radialGradient>' +
      '<radialGradient id="hkw" cx=".36" cy=".3" r=".8"><stop offset="0" stop-color="#fffdf6"/><stop offset=".4" stop-color="#f2e8d2"/><stop offset="1" stop-color="#a48d63"/></radialGradient></defs>';
    s += '<rect x="0" y="0" width="840" height="840" rx="18" fill="#22150d"/><rect x="16" y="16" width="808" height="808" rx="4" fill="#0a0604" stroke="#c99a3c" stroke-width="3"/>';
    for (var i = 0; i < 64; i++) {
      var x = 20 + (i & 7) * S, y = 20 + (i >> 3) * S;
      s += '<rect x="' + (x + 2) + '" y="' + (y + 2) + '" width="' + (S - 4) + '" height="' + (S - 4) + '" rx="4" fill="' + INK[C.SQ[i]] + '"/>';
      if (i === from) s += '<rect x="' + (x + 6) + '" y="' + (y + 6) + '" width="' + (S - 12) + '" height="' + (S - 12) + '" rx="3" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="4"/>';
    }
    for (i = 0; i < 64; i++) {
      var p = b[i]; if (!p) continue;
      var cx = 20 + (i & 7) * S + S / 2, cy = 20 + (i >> 3) * S + S / 2, r = (rk && rk[p]) || 0;
      if (i === to) s += '<circle cx="' + cx + '" cy="' + cy + '" r="47" fill="none" stroke="#ffd34d" stroke-width="6"/>';
      s += '<circle cx="' + cx + '" cy="' + (cy + 3) + '" r="40" fill="rgba(0,0,0,.45)"/><circle cx="' + cx + '" cy="' + cy + '" r="40" fill="url(#hk' + (p <= 8 ? 'b' : 'w') + ')"' + (r ? ' stroke="#d9a93a" stroke-width="3"' : '') + '/>';
      for (var k = r; k >= 1; k--) s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + (13 + 5 * k) + '" fill="none" stroke="#f2c94c" stroke-width="2.5"/>';
      s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + (r ? 12 : 16) + '" fill="' + INK[C.colorOf(p)] + '" stroke="rgba(0,0,0,.4)" stroke-width="2"/>';
    }
    return s + '</svg>';
  }
  HistView.register('kamisado', function (e, ui) {
    var d = e.dt, C = window.KamisadoCore; if (!d || !d.grid || !C) return null;
    var sides = String(d.sides || 'bw');
    function nameOf(col) { var i = sides.indexOf(col), p = (e.players || [])[i]; return p ? String(p.name).replace(/ \((Black|White)\)$/, '') : col === 'w' ? 'White' : 'Black'; }
    var fin = C.fromGrid(d.grid), rk = [0]; String(d.rk || '').split('').forEach(function (x) { rk.push(+x || 0); });
    var snap = ui.el('div', null, [ui.picture(svg(C, fin, rk, -1, -1), { frame: 'dark', max: 420 })]);
    var out = [ui.section('Final board', snap)];
    var rounds = d.rounds || [], pos = [], labels = [];
    rounds.forEach(function (rd, ri) {
      var R = C.replay(rd.g0, rd.k0, rd.first === 'w' ? 2 : 1, rd.ml, 15);
      pos.push({ b: R.start.b, rk: R.start.rk, f: -1, t: -1 }); labels.push((rounds.length > 1 ? 'Round ' + (ri + 1) + ', ' : '') + 'the start' + (rd.fill ? ', filled from the ' + (rd.fill === 'L' ? 'left' : 'right') : ''));
      R.steps.forEach(function (x, j) {
        var m = C.parse(x.s), who = nameOf(x.side === 1 ? 'b' : 'w');
        pos.push({ b: x.b, rk: R.start.rk, f: m.f, t: m.t });
        labels.push((rounds.length > 1 ? 'Round ' + (ri + 1) + ' · ' : '') + 'Move ' + (j + 1) + ' · ' + who + ' · ' + C.COLOR_NAMES[x.res.k] + ' ' + C.NAMES[m.f] + ' to ' + C.NAMES[m.t] +
          (m.push ? ' · Sumo push' : '') + (x.res.passes.length ? ' · Blocked' : '') + (x.res.win ? ' · Home' : '') + (x.res.deadlock ? ' · Deadlock' : ''));
      });
    });
    if (pos.length > 1) {
      var label = ui.el('b'), N = pos.length - 1, rng = ui.el('input', { type: 'range', min: '0', max: String(N), value: String(N), class: 'hv-range', 'aria-label': 'Move' });
      var show = function (n) { var P = pos[n]; snap.innerHTML = ''; snap.appendChild(ui.picture(svg(C, P.b, P.rk, P.f, P.t), { frame: 'dark', max: 420 })); return labels[n]; };
      rng.addEventListener('input', function () { label.textContent = show(+rng.value); });
      label.textContent = show(N);
      out.push(ui.section('Replay', ui.el('div', { class: 'hv-replay' }, [rng, label])));
    }
    if (rounds.length > 1 || (d.target || 1) > 1) {
      out.push(ui.table(['Round', 'Won by', 'How', 'Promoted', 'Points'], rounds.map(function (rd, i) {
        return [i + 1, nameOf(rd.w), rd.why === 'deadlock' ? 'Deadlock' : 'Home row', C.COLOR_NAMES[rd.c] + ' ' + RANKS[rd.rk], rd.pts];
      })));
    }
    var pts = d.pts || [0, 0], bl = d.blocks || [0, 0], pu = d.pushes || [0, 0];
    out.push(ui.table(['', nameOf('b') + ' (Black)', nameOf('w') + ' (White)'], [
      ['Points', pts[0], pts[1]], ['Towers left with nowhere to go', bl[0], bl[1]], ['Sumo pushes', pu[0], pu[1]]
    ]));
    out.push(ui.facts([['Match', (d.target || 1) === 1 ? 'A single round' : 'First to ' + d.target + ' points'], ['Rounds', rounds.length], ['Moves', d.n || 0]]));
    return ui.wrap(out);
  });
})();
