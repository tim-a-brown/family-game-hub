'use strict';
// History view: Abalone. The board at the end with the marbles each side pushed off in its tray, a replay you can step
// through move by move (rebuilt from the move list with games/abalone-core.js, which hist-view.js loads first), the
// marbles off the board over the game, and the numbers side by side.
// detail: {start, mv: 'Ffg0 ...' (move strings), grid [9 rows of b/w/.], off [black lost, white lost], sides 'bw'
// (the players' colors in record order), ej '12,40' (moves that pushed a marble off), push [b, w], sumito [b, w], n}
(function () {
  if (!window.HistView) return;
  function hexPts(R, cx, cy) { var p = []; for (var k = 0; k < 6; k++) { var a = Math.PI / 3 * k; p.push((cx + R * Math.cos(a)).toFixed(1) + ',' + (cy + R * Math.sin(a)).toFixed(1)); } return p.join(' '); }
  // the board as a picture: b [61], mark [holes to ring], off [_, black off, white off]
  function svg(C, b, mark, off) {
    var s = '<svg viewBox="0 -40 1000 946" role="img" aria-label="Abalone board"><defs>' +
      '<radialGradient id="hab" cx=".34" cy=".28" r=".75"><stop offset="0" stop-color="#9aa0ad"/><stop offset=".2" stop-color="#3a3d46"/><stop offset=".55" stop-color="#141519"/><stop offset="1" stop-color="#030304"/></radialGradient>' +
      '<radialGradient id="haw" cx=".34" cy=".28" r=".75"><stop offset="0" stop-color="#fff"/><stop offset=".3" stop-color="#f6f3ec"/><stop offset=".7" stop-color="#d9d2c4"/><stop offset="1" stop-color="#9d9585"/></radialGradient></defs>';
    s += '<polygon points="' + hexPts(486, 500, 433) + '" fill="#4a2e19" stroke="#4a2e19" stroke-width="28" stroke-linejoin="round"/>';
    s += '<polygon points="' + hexPts(446, 500, 433) + '" fill="#1c232c" stroke="#0b0f13" stroke-width="5" stroke-linejoin="round"/>';
    var mk = {}; (mark || []).forEach(function (c) { mk[c] = 1; });
    for (var c = 0; c < C.N; c++) {
      var x = 500 + C.CELLS[c].x * 100, y = 433 + C.CELLS[c].r * 86.6;
      s += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="36" fill="#0b0f14"/>';
      if (b[c]) s += '<circle cx="' + x.toFixed(1) + '" cy="' + (y + 3).toFixed(1) + '" r="42" fill="rgba(0,0,0,.4)"/><circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="42" fill="url(#ha' + (b[c] === 1 ? 'b' : 'w') + ')"/>';
      if (mk[c]) s += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="48" fill="none" stroke="#ffd34d" stroke-width="7"/>';
    }
    // the marbles off the board: White's lost at the top left (pushed off by Black), Black's at the bottom right
    if (off) [[2, 40, -16], [1, 960, 882]].forEach(function (q) {
      for (var i = 0; i < off[q[0]]; i++) { var xx = q[1] + (q[0] === 2 ? i * 44 : -i * 44); s += '<circle cx="' + xx + '" cy="' + q[2] + '" r="19" fill="url(#ha' + (q[0] === 1 ? 'b' : 'w') + ')"/>'; }
    });
    return s + '</svg>';
  }
  HistView.register('abalone', function (e, ui) {
    var d = e.dt, C = window.AbaloneCore; if (!d || !d.grid || !C) return null;
    var sides = String(d.sides || 'bw');
    function nameOf(col) { var i = sides.indexOf(col), p = (e.players || [])[i]; return p ? String(p.name).replace(/ \((Black|White)\)$/, '') : col === 'b' ? 'Black' : 'White'; }
    var fin = C.fromGrid(d.grid), off = [0, d.off ? d.off[0] : 0, d.off ? d.off[1] : 0];
    // replay every position from the move list
    var g = C.newGame(d.start), pos = [{ b: g.b.slice(), off: [0, 0, 0], mark: [] }], lines = [], offB = [0], offW = [0], ok = true;
    String(d.mv || '').split(' ').filter(Boolean).forEach(function (s) {
      if (!ok) return;
      var side = g.turn, m = C.decode(g, s); if (!m) { ok = false; return; }
      C.play(g, s);
      var mark = C.paths(m).map(function (ft) { return ft[1]; }).filter(function (x) { return x >= 0; });
      pos.push({ b: g.b.slice(), off: g.off.slice(), mark: mark });
      lines.push({ side: side, m: m });
      offB.push(g.off[1]); offW.push(g.off[2]);
    });
    var N = lines.length;
    var snap = ui.el('div', null, [ui.picture(svg(C, fin, [], off), { frame: 'dark', max: 420 })]);
    var out = [ui.section('Final board', snap)];
    if (ok && N > 1) {
      var label = ui.el('b'), rng = ui.el('input', { type: 'range', min: '0', max: String(N), value: String(N), class: 'hv-range', 'aria-label': 'Move' });
      var show = function (n) {
        var P = pos[n]; snap.innerHTML = ''; snap.appendChild(ui.picture(svg(C, P.b, P.mark, P.off), { frame: 'dark', max: 420 }));
        if (!n) return 'The starting position';
        var L = lines[n - 1], who = nameOf(L.side === 1 ? 'b' : 'w');
        return 'Move ' + n + ' · ' + who + ' (' + (L.side === 1 ? 'Black' : 'White') + ') · ' + C.short(L.m).replace(/ (off|push)$/, '') + (L.m.x ? ' · A marble went off the board' : L.m.p.length ? ' · Pushed ' + L.m.p.length + (L.m.p.length === 1 ? ' marble' : ' marbles') : '');
      };
      rng.addEventListener('input', function () { label.textContent = show(+rng.value); });
      label.textContent = show(N);
      out.push(ui.section('Replay', ui.el('div', { class: 'hv-replay' }, [rng, label])));
      // the marbles each side has pushed off, move by move
      var W = 320, H = 90, P = 8, x = function (i) { return P + i * (W - 2 * P) / N; }, y = function (v) { return H - P - v / 6 * (H - 2 * P); };
      var chart = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Marbles pushed off over the game"><line x1="' + P + '" x2="' + (W - P) + '" y1="' + y(6) + '" y2="' + y(6) + '" stroke="rgba(255,255,255,.25)" stroke-dasharray="4 4"/>';
      [[offW, '#111114', 'rgba(255,255,255,.7)'], [offB, '#f4f1e8', null]].forEach(function (q) {
        var pts = q[0].map(function (v, i) { return x(i).toFixed(1) + ',' + y(v).toFixed(1); }).join(' ');
        chart += '<polyline points="' + pts + '" fill="none" stroke="' + q[1] + '" stroke-width="3" stroke-linejoin="round"' + (q[2] ? ' style="filter:drop-shadow(0 0 1px ' + q[2] + ')"' : '') + '/>';
      });
      chart += '</svg>';
      out.push(ui.section('Marbles pushed off', [ui.picture(chart, { frame: 'felt' }), ui.chips([{ t: 'Black line: ' + nameOf('b'), c: '#9a9aa6' }, { t: 'White line: ' + nameOf('w'), c: '#e9e4d8' }])]));
    }
    var push = d.push || [0, 0], sum = d.sumito || [0, 0];
    out.push(ui.table(['', nameOf('b') + ' (Black)', nameOf('w') + ' (White)'], [
      ['Marbles pushed off', off[2], off[1]], ['Pushes', push[0], push[1]], ['Sumitos (3 push 2)', sum[0], sum[1]]
    ]));
    out.push(ui.facts([['Starting position', C.START[d.start] ? C.START[d.start].name : 'A set position'], ['Moves', d.n || N]]));
    return ui.wrap(out);
  });
})();
