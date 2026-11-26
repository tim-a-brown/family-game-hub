'use strict';
// History view: Pacru (games/pacru.html). detail: {ml: 'c9-d8+d8 g9-f8+f8 ...' (every turn from the start, in the
// core's notation), np (players), mk [markers each seat had at the end], win (the winning seat), why ('target' | 'last'),
// out ('- blk' : each seat's way out), cap, meet, conv ('2 0': pincers, meetings and fields changed by connections, by
// seat), n}. The positions are rebuilt with pacru-core.js (hist-view.js loads it first), so the board is the game's own.
(function () {
  if (!window.HistView) return;
  var HEX = [null, '#2c2f37', '#d23a2f', '#e9b322', '#2f9a4f'], TINT = [null, 'rgba(30,32,40,.34)', 'rgba(210,58,47,.30)', 'rgba(233,179,34,.36)', 'rgba(47,154,79,.30)'];
  var CN = [null, 'Black', 'Red', 'Yellow', 'Green'];
  function boardSvg(C, st, last) {
    var s = '<svg viewBox="-0.2 -0.2 9.4 9.4" role="img" aria-label="Pacru board"><rect x="-0.2" y="-0.2" width="9.4" height="9.4" rx=".25" fill="#4a2c18"/><rect x="0" y="0" width="9" height="9" rx=".1" fill="#e9dcc0"/>';
    for (var x = 0; x < 81; x++) {
      var r = Math.floor(x / 9), c = x % 9, v = st.b[x];
      if (v) { var k = st.col[v - 1]; s += '<rect x="' + (c + 0.04) + '" y="' + (r + 0.04) + '" width=".92" height=".92" rx=".08" fill="' + TINT[k] + '"/><circle cx="' + (c + 0.5) + '" cy="' + (r + 0.5) + '" r=".19" fill="' + HEX[k] + '"/>'; }
      else s += '<circle cx="' + (c + 0.5) + '" cy="' + (r + 0.5) + '" r=".18" fill="rgba(110,74,36,.13)"/>';
    }
    s += '<path d="M3 0V9M6 0V9M0 3H9M0 6H9" stroke="#4a2c18" stroke-width=".08"/>';
    if (last && last.f != null) {
      var a = [last.f % 9 + 0.5, Math.floor(last.f / 9) + 0.5], b = [last.t % 9 + 0.5, Math.floor(last.t / 9) + 0.5];
      s += '<line x1="' + a[0] + '" y1="' + a[1] + '" x2="' + b[0] + '" y2="' + b[1] + '" stroke="#ffd75a" stroke-width=".07" stroke-dasharray=".12 .1"/>';
    }
    for (x = 0; x < 81; x++) {
      var w = st.ch[x]; if (w < 0) continue;
      var kk = st.col[w >> 3], rr = Math.floor(x / 9), cc = x % 9;
      s += '<g transform="translate(' + (cc + 0.5) + ' ' + (rr + 0.5) + ') rotate(' + ((w & 7) * 45) + ')"><path d="M0 -.36 L.33 .28 L.2 .32 L0 .1 L-.2 .32 L-.33 .28 Z" fill="' + HEX[kk] + '" stroke="' + (kk === 1 ? '#8d93a3' : '#000') + '" stroke-opacity=".6" stroke-width=".04"/></g>';
    }
    return s + '</svg>';
  }
  function pname(e, i) { var p = (e.players || [])[i]; return p ? String(p.name).replace(/ \((Black|Red|Yellow|Green)\)$/, '') : 'Player ' + (i + 1); }
  function say(C, st0, m) {
    var p = C.parse(m), w = CN[st0.col[st0.turn]];
    if (!p) return m;
    if (p.r != null) return w + ' turned the chevron on ' + C.NAMES[p.f] + ' ' + (Math.abs(p.r) === 2 ? '90' : '45') + ' degrees ' + (p.r < 0 ? 'left' : 'right') + ', taking off ' + p.rm.length + ' markers';
    var pin = st0.ch[p.t] >= 0;
    return w + (pin ? ' took the chevron on ' + C.NAMES[p.t] + ' with a pincer, from ' + C.NAMES[p.f] : ' moved from ' + C.NAMES[p.f] + ' to ' + C.NAMES[p.t]) + (p.mark >= 0 ? ', a marker on ' + C.NAMES[p.mark] : '') + (p.bonus >= 0 ? ', a meeting changed ' + C.NAMES[p.bonus] : '');
  }

  HistView.register('pacru', function (e, ui) {
    var d = e.dt, C = window.PacruCore; if (!d || d.ml == null || !C) return null;
    var list = String(d.ml || '').split(' ').filter(Boolean), np = +d.np || 2;
    var pos = C.replay(np, list);
    var M = pos.length - 1, fin = pos[M];
    var snap = ui.el('div', null, [ui.picture(boardSvg(C, fin, fin.last), { frame: 'wood' })]);
    var out = [ui.section('Final board', snap)];
    if (M > 1) {
      var showAt = function (n) {
        snap.innerHTML = ''; snap.appendChild(ui.picture(boardSvg(C, pos[n], pos[n].last), { frame: 'wood' }));
        if (!n) return 'The starting position';
        return (n === M ? 'The last turn, ' : 'Turn ') + n + ': ' + say(C, pos[n - 1], list[n - 1]);
      };
      if (HistView.boardUI && HistView.boardUI.replay) out.push(ui.section('Replay', HistView.boardUI.replay(ui, M, showAt)));
      else {
        var label = ui.el('b'), rng = ui.el('input', { type: 'range', min: '0', max: String(M), value: String(M), 'aria-label': 'Turn', style: { width: '100%', boxSizing: 'border-box' } });
        rng.addEventListener('input', function () { label.textContent = showAt(+rng.value); });
        label.textContent = showAt(M);
        out.push(ui.section('Replay', ui.el('div', null, [rng, label])));
      }
    }
    var sp = function (k) { return String(d[k] || '').split(' ').map(Number); }, cap = sp('cap'), meet = sp('meet'), conv = sp('conv'), outs = String(d.out || '').split(' ');
    var rows = fin.col.map(function (c, i) {
      return [pname(e, i) + ', ' + CN[c], String(C.markers(fin, i)), String(cap[i] || 0), outs[i] === 'blk' ? 'Blocked' : outs[i] === 'cap' ? 'Taken' : i === fin.win ? 'Won' : ''];
    });
    out.push(ui.section('Markers at the end', ui.table(['Player', 'Markers', 'Pincers', 'End'], rows)));
    var facts = [['Target', fin.target + ' markers, with ' + np + ' players']];
    if (fin.win >= 0) facts.push(['How it ended', fin.why === 'target' ? pname(e, fin.win) + ' put down marker number ' + fin.target : pname(e, fin.win) + ' was the last player with chevrons on the board']);
    var cv = fin.col.map(function (c, i) { return pname(e, i) + ' ' + (conv[i] || 0); });
    facts.push(['Fields turned by connections', cv.join(', ')]);
    var mt = meet.reduce(function (a, b) { return a + (b || 0); }, 0);
    if (mt) facts.push(['Meetings', String(mt)]);
    facts.push(['Turns', String(M)]);
    out.push(ui.facts(facts));
    return ui.wrap(out);
  });
})();
