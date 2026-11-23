'use strict';
// History view: Boku. The board at the end with the winning line lit, a replay you can step through move by move
// (rebuilt from the move list with games/boku-core.js, which hist-view.js loads first), the captures over the game and
// the numbers side by side.
// detail: {mv: 'F5,F6,E5 xF6,...' (move strings), grid [11 rows of w/b/.], caps [taken by White, taken by Black],
// sides 'wb' (the players' colors in record order), line 'F1 F2 F3 F4 F5' (the winning line), cx '12,30' (moves that
// captured), dbl [w, b] (two threats at once), n, end ('five' | 'full')}
(function () {
  if (!window.HistView) return;
  var VW = 1080, VH = 1010;
  function outline(m) {
    var k = m / Math.cos(Math.PI / 6), V = [[-2, -5, -.5, -.866], [2, -5, .5, -.866], [4.5, 0, 1, 0], [2, 5, .5, .866], [-2, 5, -.5, .866], [-4.5, 0, -1, 0]];
    return V.map(function (v) { return (540 + v[0] * 100 + v[2] * k).toFixed(1) + ',' + (505 + v[1] * 86.6 + v[3] * k).toFixed(1); }).join(' ');
  }
  function pt(C, c) { return { x: 540 + C.CELLS[c].x * 100, y: 505 + C.CELLS[c].r * 86.6 }; }
  // the board as a picture: b [80], mark: the hole just played, took: the hole just emptied, line: holes lit gold
  function svg(C, b, mark, took, line) {
    var s = '<svg viewBox="0 0 ' + VW + ' ' + VH + '" role="img" aria-label="Boku board"><defs>' +
      '<radialGradient id="hbw" cx=".34" cy=".28" r=".75"><stop offset="0" stop-color="#fff"/><stop offset=".3" stop-color="#fbf8f2"/><stop offset=".7" stop-color="#e4ddd0"/><stop offset="1" stop-color="#a89f8f"/></radialGradient>' +
      '<radialGradient id="hbb" cx=".34" cy=".28" r=".75"><stop offset="0" stop-color="#a7b0bf"/><stop offset=".2" stop-color="#4a5160"/><stop offset=".55" stop-color="#1b1e25"/><stop offset="1" stop-color="#050608"/></radialGradient></defs>';
    s += '<polygon points="' + outline(64) + '" fill="#b47a3c" stroke="#b47a3c" stroke-width="30" stroke-linejoin="round"/>';
    s += '<polygon points="' + outline(48) + '" fill="#1c2a4d" stroke="#3b2510" stroke-width="7" stroke-linejoin="round"/>';
    if (line && line.length > 1) { var a = pt(C, line[0]), z = pt(C, line[line.length - 1]); s += '<line x1="' + a.x + '" y1="' + a.y + '" x2="' + z.x + '" y2="' + z.y + '" stroke="#ffd75a" stroke-width="16" stroke-linecap="round" opacity=".6"/>'; }
    for (var c = 0; c < C.N; c++) {
      var p = pt(C, c), x = p.x.toFixed(1), y = p.y.toFixed(1);
      s += '<circle cx="' + x + '" cy="' + y + '" r="35" fill="#0b1224"/>';
      if (b[c]) s += '<circle cx="' + x + '" cy="' + (p.y + 3).toFixed(1) + '" r="40" fill="rgba(0,0,0,.4)"/><circle cx="' + x + '" cy="' + y + '" r="40" fill="url(#hb' + (b[c] === 1 ? 'w' : 'b') + ')"/>';
      if (c === mark) s += '<circle cx="' + x + '" cy="' + y + '" r="11" fill="#ffd34d"/>';
      if (c === took) s += '<circle cx="' + x + '" cy="' + y + '" r="34" fill="none" stroke="#ff6a4a" stroke-width="6"/><path d="M' + (p.x - 16) + ' ' + (p.y - 16) + 'l32 32M' + (p.x + 16) + ' ' + (p.y - 16) + 'l-32 32" stroke="#ff6a4a" stroke-width="6" stroke-linecap="round"/>';
      if (line && line.indexOf(c) >= 0) s += '<circle cx="' + x + '" cy="' + y + '" r="46" fill="none" stroke="#ffd34d" stroke-width="7"/>';
    }
    return s + '</svg>';
  }
  HistView.register('boku', function (e, ui) {
    var d = e.dt, C = window.BokuCore; if (!d || !d.grid || !C) return null;
    var sides = String(d.sides || 'wb');
    function nameOf(col) { var i = sides.indexOf(col), p = (e.players || [])[i]; return p ? String(p.name).replace(/ \((Black|White)\)$/, '') : col === 'w' ? 'White' : 'Black'; }
    var fin = C.fromGrid(d.grid), line = String(d.line || '').split(' ').filter(Boolean).map(C.idx);
    var g = C.newGame(), pos = [{ b: g.b.slice(), mark: -1, took: -1, line: [] }], lines = [], capW = [0], capB = [0], ok = true;
    String(d.mv || '').split(',').filter(Boolean).forEach(function (s) {
      if (!ok) return;
      var side = g.turn, r = C.play(g, s); if (!r) { ok = false; return; }
      pos.push({ b: g.b.slice(), mark: r.c, took: r.x, line: r.five || [] });
      lines.push({ side: side, s: s, r: r });
      capW.push(g.caps[1]); capB.push(g.caps[2]);
    });
    var N = lines.length, caps = d.caps || [0, 0];
    var snap = ui.el('div', null, [ui.picture(svg(C, fin, -1, -1, line), { frame: 'dark', max: 420 })]);
    var out = [ui.section(d.end === 'full' ? 'Final board (full, a draw)' : 'Final board', snap)];
    if (ok && N > 1) {
      var label = ui.el('b'), rng = ui.el('input', { type: 'range', min: '0', max: String(N), value: String(N), class: 'hv-range', 'aria-label': 'Move' });
      var show = function (n) {
        var P = pos[n]; snap.innerHTML = ''; snap.appendChild(ui.picture(svg(C, P.b, P.mark, P.took, P.line), { frame: 'dark', max: 420 }));
        if (!n) return 'The empty board';
        var L = lines[n - 1], who = nameOf(L.side === 1 ? 'w' : 'b'), m = C.parse(L.s);
        if (m.pass) return 'Move ' + n + ' · ' + who + ' passed';
        return 'Move ' + n + ' · ' + who + ' · ' + C.NAMES[m.c] + (m.x >= 0 ? ' · Took the marble on ' + C.NAMES[m.x] : '') + (L.r.five ? ' · Five in a row' : '');
      };
      rng.addEventListener('input', function () { label.textContent = show(+rng.value); });
      label.textContent = show(N);
      out.push(ui.section('Replay', ui.el('div', { class: 'hv-replay' }, [rng, label])));
      if (caps[0] + caps[1] > 0) {
        var top = Math.max(2, capW[N], capB[N]), W = 320, H = 90, P = 8, x = function (i) { return P + i * (W - 2 * P) / N; }, y = function (v) { return H - P - v / top * (H - 2 * P); };
        var chart = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Marbles taken over the game">';
        [[capB, '#111114', 'rgba(255,255,255,.7)'], [capW, '#f4f1e8', null]].forEach(function (q) {
          var pts = q[0].map(function (v, i) { return x(i).toFixed(1) + ',' + y(v).toFixed(1); }).join(' ');
          chart += '<polyline points="' + pts + '" fill="none" stroke="' + q[1] + '" stroke-width="3" stroke-linejoin="round"' + (q[2] ? ' style="filter:drop-shadow(0 0 1px ' + q[2] + ')"' : '') + '/>';
        });
        chart += '</svg>';
        out.push(ui.section('Marbles taken', [ui.picture(chart, { frame: 'felt' }), ui.chips([{ t: 'White line: ' + nameOf('w'), c: '#e9e4d8' }, { t: 'Black line: ' + nameOf('b'), c: '#9a9aa6' }])]));
      }
    }
    var dbl = d.dbl || [0, 0];
    out.push(ui.table(['', nameOf('w') + ' (White)', nameOf('b') + ' (Black)'], [
      ['Marbles taken', caps[0], caps[1]], ['Two ways to win at once', dbl[0], dbl[1]]
    ]));
    out.push(ui.facts([['Moves', d.n || N], ['How it ended', d.end === 'full' ? 'The board filled: a draw' : 'Five in a row']]));
    return ui.wrap(out);
  });
})();
