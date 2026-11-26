'use strict';
// History view: Continuo. The table at the end (every card down, the longest chain outlined), a replay card by card
// (each card ringed as it goes down, with who put it down and what it scored), the race for points card by card, and
// the numbers side by side. hist-view.js loads games/continuo-core.js first, for the cards' colors.
// detail: {np, hand, pl 'card.o.x.y.player.points ...' (the first is the start card, player -1), sc [points], win
// [players], lc (the longest chain's length), lcc (its color), n (cards put down), hints 1|0, under (cards that went
// under the deck)}
(function () {
  if (!window.HistView) return;
  var INK = ['#d9363e', '#f2c12e', '#2e9a57', '#2f62c8'], CN = ['red', 'yellow', 'green', 'blue'];
  function svg(C, pl, upto, ring) {
    var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    pl.forEach(function (p) { x0 = Math.min(x0, p[2]); y0 = Math.min(y0, p[3]); x1 = Math.max(x1, p[2] + 4); y1 = Math.max(y1, p[3] + 4); });
    var m = 1, w = x1 - x0 + 2 * m, h = y1 - y0 + 2 * m;
    var s = '<svg viewBox="' + (x0 - m) + ' ' + (y0 - m) + ' ' + w + ' ' + h + '" role="img" aria-label="The table">';
    s += '<rect x="' + (x0 - m) + '" y="' + (y0 - m) + '" width="' + w + '" height="' + h + '" rx="1" fill="#3c2212"/>';
    pl.slice(0, upto).forEach(function (p, k) {
      var cl = C.cells(p[0], p[1]);
      s += '<rect x="' + (p[2] + .08) + '" y="' + (p[3] + .14) + '" width="4" height="4" rx=".25" fill="rgba(0,0,0,.4)"/><rect x="' + p[2] + '" y="' + p[3] + '" width="4" height="4" rx=".24" fill="#0c0d12"/>';
      for (var i = 0; i < 16; i++) s += '<rect x="' + (p[2] + (i & 3) + .09) + '" y="' + (p[3] + (i >> 2) + .09) + '" width=".82" height=".82" rx=".1" fill="' + INK[cl[i]] + '"/>';
      if (k === ring) s += '<rect x="' + (p[2] - .12) + '" y="' + (p[3] - .12) + '" width="4.24" height="4.24" rx=".32" fill="none" stroke="#ffd34d" stroke-width=".16"/>';
    });
    return s + '</svg>';
  }
  HistView.register('continuo', function (e, ui) {
    var d = e.dt, C = window.ContinuoCore; if (!d || !d.pl || !C) return null;
    var pl = C.unpackPl(d.pl), ps = e.players || [];
    function nameOf(i) { var p = ps[i]; return p ? String(p.name) : 'Player ' + (i + 1); }
    var snap = ui.el('div', null, [ui.picture(svg(C, pl, pl.length, -1), { frame: 'dark', max: 460 })]);
    var out = [ui.section('The table at the end', snap)];
    if (pl.length > 1) {
      var label = ui.el('b'), N = pl.length, rng = ui.el('input', { type: 'range', min: '1', max: String(N), value: String(N), class: 'hv-range', 'aria-label': 'Card' });
      var show = function (n) {
        snap.innerHTML = ''; snap.appendChild(ui.picture(svg(C, pl, n, n - 1), { frame: 'dark', max: 460 }));
        var p = pl[n - 1];
        return n === 1 ? 'The first card, turned up to start' : 'Card ' + (n - 1) + ' · ' + nameOf(p[4]) + ' · ' + (p[5] ? p[5] + (p[5] === 1 ? ' point' : ' points') : 'no chain made longer');
      };
      rng.addEventListener('input', function () { label.textContent = show(+rng.value); });
      label.textContent = show(N);
      out.push(ui.section('Replay', ui.el('div', { class: 'hv-replay' }, [rng, label])));
    }
    var sc = d.sc || [], np = d.np || sc.length;
    if (np > 1) {
      // the race: each player's total after each round of cards
      var run = [], tot = sc.map(function () { return 0; }), W = 300, H = 110;
      pl.forEach(function (p) { if (p[4] < 0) return; tot[p[4]] += p[5]; run.push(tot.slice()); });
      var mx = Math.max.apply(null, [10].concat(tot)), s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="The scores card by card">';
      for (var i = 0; i < np; i++) {
        var dd = run.map(function (r, k) { return (k ? 'L' : 'M') + (k / Math.max(1, run.length - 1) * (W - 6) + 3).toFixed(1) + ' ' + (H - 4 - r[i] / mx * (H - 10)).toFixed(1); }).join('');
        s += '<path d="' + dd + '" fill="none" stroke="' + ui.color(i) + '" stroke-width="2.5" stroke-linejoin="round"/>';
      }
      out.push(ui.section('The race', ui.picture(s + '</svg>', { max: 460 })));
    }
    var best = sc.map(function () { return 0; }), cards = sc.map(function () { return 0; }), joins = sc.map(function () { return 0; });
    pl.forEach(function (p, k) {
      if (p[4] < 0) return;
      cards[p[4]]++; if (p[5] > best[p[4]]) best[p[4]] = p[5];
      var B = C.boardOf(pl.slice(0, k)), j = C.judge(B, p[0], p[1], p[2], p[3]);
      if (j.ok && j.groups.some(function (g) { return g.n > 1; })) joins[p[4]]++;
    });
    var head = [''].concat(sc.map(function (_, i) { return nameOf(i); }));
    out.push(ui.table(head, [['Points'].concat(sc), ['Cards'].concat(cards), ['Best card'].concat(best), ['Chains joined'].concat(joins)]));
    out.push(ui.facts([['Longest chain', d.lc ? d.lc + ' ' + (CN[d.lcc] || '') + ' squares' : ''], ['Cards in hand', d.hand === 3 ? 'Three (house rule)' : 'One'], ['Hints', d.hints === 0 ? 'Off' : 'On'],
      ['Cards under the deck', d.under || '']]));
    return ui.wrap(out);
  });
})();
