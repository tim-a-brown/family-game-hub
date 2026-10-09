'use strict';
// History views: board games (part 2)
(function () {
  if (!window.HistView) return;
  var R = HistView.register;

  // Connect Four: the final board with the four ringed, then a replay you can step through
  R('connectfour', function (e, ui) {
    var d = e.dt; if (!d || !d.grid) return null;
    var DISC = { r: '#ff4d5e', y: '#ffc83d' }, cols = (d.discs || 'ry').split(''), hole = 'rgba(8,16,48,.55)';
    function pal() { return { '.': { fill: hole, shape: 'circle' }, '1': { fill: DISC[cols[0]] || '#ff4d5e', shape: 'circle', shine: 1 }, '2': { fill: DISC[cols[1]] || '#ffc83d', shape: 'circle', shine: 1 } }; }
    var names = (e.players || []).map(function (p) { return p.name; });
    var snap = ui.el('div', null, [ui.board(d.grid, pal(), { frame: 'blue', cell: 30, gap: 5, mark: d.line, aria: 'Final board' })]);
    var out = [ui.section('Final board', snap)];
    // replay: rebuild the board move by move from the column list
    var mv = String(d.moves || ''), first = d.first === 1 ? 1 : 0;
    if (mv.length > 1) {
      var step = mv.length, label = ui.el('b'), rng = ui.el('input', { type: 'range', min: '0', max: String(mv.length), value: String(mv.length), class: 'hv-range', 'aria-label': 'Move' });
      function at(n) {
        var g = []; for (var r = 0; r < 6; r++) g.push('.......'.split(''));
        for (var i = 0; i < n; i++) { var c = +mv.charAt(i); for (var r2 = 5; r2 >= 0; r2--) if (g[r2][c] === '.') { g[r2][c] = String(((i + first) % 2) + 1); break; } }
        return g.map(function (x) { return x.join(''); });
      }
      function show(n) {
        step = n; snap.innerHTML = ''; snap.appendChild(ui.board(n === mv.length ? d.grid : at(n), pal(), { frame: 'blue', cell: 30, gap: 5, mark: n === mv.length ? d.line : [] }));
        var who = n ? names[(n - 1 + first) % 2] : '';
        label.textContent = n === 0 ? 'Empty board' : n === mv.length ? 'Final board · move ' + n : 'Move ' + n + ' · ' + who + ' in column ' + (+mv.charAt(n - 1) + 1);
      }
      rng.addEventListener('input', function () { show(+rng.value); });
      show(mv.length);
      out.push(ui.section('Replay', ui.el('div', { class: 'hv-replay' }, [rng, label])));
    }
    if (d.series) out.push(ui.stats([[names[0] + ' wins', d.series[0]], [names[1] + ' wins', d.series[1]], ['Draws', d.series[2] || 0], ['Moves', mv.length || '']]));
    return ui.wrap(out);
  });
  HistView.css('hv-board2', '.hv-replay{display:flex;flex-direction:column;gap:6px;}.hv-range{width:100%;accent-color:var(--yellow);}.hv-replay b{font-size:.85rem;color:var(--text-2);}');
})();
