'use strict';
// History view: Twixt (games/twixt.html). detail: {mv: 'K12 swap M14 ...' (every move from the start, a swap as 'swap'),
// win: 'r' | 'b' | '', why: 'connect' | 'stuck' | 'agreed' | 'resign', swap (the rule was on), sides ('rb': each seat's
// color at the end), tg: '13.13 12.13 ...' (each side's pegs to go after every move, Red's first, x for cut off),
// ev: 'r2 b1x ...' (each move: who, links made, x a block), chain: the winning chain's holes, n, pegs, span}
// The positions are rebuilt with twixt-core.js (hist-view.js loads it first), so the links are the game's own.
(function () {
  if (!window.HistView) return;
  var N = 24;
  function cx(h) { return h % N + 0.5; }
  function cy(h) { return Math.floor(h / N) + 0.5; }
  // the board as a picture: the maple pegboard with its border rows, the links, the pegs, the last peg ringed, the
  // winning chain in gold
  function boardSvg(C, st, lastH, chain) {
    var s = '<svg viewBox="-0.4 -0.4 24.8 24.8" role="img" aria-label="Twixt board"><defs>' +
      '<radialGradient id="twhR" cx=".36" cy=".3" r=".8"><stop offset="0" stop-color="#ffb0a0"/><stop offset=".25" stop-color="#e8443a"/><stop offset="1" stop-color="#6a0d08"/></radialGradient>' +
      '<radialGradient id="twhK" cx=".36" cy=".3" r=".8"><stop offset="0" stop-color="#a4a5ae"/><stop offset=".25" stop-color="#44454d"/><stop offset="1" stop-color="#050506"/></radialGradient></defs>';
    s += '<rect x="-0.4" y="-0.4" width="24.8" height="24.8" rx=".3" fill="#e4cf9f"/>' +
      '<rect x="1" y="0" width="22" height="1" fill="rgba(210,50,40,.17)"/><rect x="1" y="23" width="22" height="1" fill="rgba(210,50,40,.17)"/>' +
      '<rect x="0" y="1" width="1" height="22" fill="rgba(20,20,26,.15)"/><rect x="23" y="1" width="1" height="22" fill="rgba(20,20,26,.15)"/>' +
      '<path d="M1 1H23M1 23H23" stroke="#c42a20" stroke-width=".1"/><path d="M1 1V23M23 1V23" stroke="#1d1d22" stroke-width=".1"/><g fill="#3b2612" opacity=".5">';
    for (var h = 0; h < N * N; h++) if (!C.CORNER[h]) s += '<circle cx="' + cx(h) + '" cy="' + cy(h) + '" r=".12"/>';
    s += '</g>';
    var gold = {};
    if (chain) for (var i = 1; i < chain.length; i++) gold[Math.min(chain[i - 1], chain[i]) + '-' + Math.max(chain[i - 1], chain[i])] = 1;
    st.lk.forEach(function (id) {
      var e = C.ends(id), red = st.b[e[0]] === 1, g = gold[Math.min(e[0], e[1]) + '-' + Math.max(e[0], e[1])];
      s += '<line x1="' + cx(e[0]) + '" y1="' + cy(e[0]) + '" x2="' + cx(e[1]) + '" y2="' + cy(e[1]) + '" stroke="' + (g ? '#f2b92e' : red ? '#a51b14' : '#141418') + '" stroke-width=".28" stroke-linecap="round"/>';
    });
    for (h = 0; h < N * N; h++) {
      if (!st.b[h]) continue;
      s += '<circle cx="' + cx(h) + '" cy="' + (cy(h) + 0.07) + '" r=".35" fill="rgba(0,0,0,.35)"/><circle cx="' + cx(h) + '" cy="' + cy(h) + '" r=".33" fill="url(#twh' + (st.b[h] === 1 ? 'R' : 'K') + ')"/>';
    }
    if (lastH >= 0) s += '<circle cx="' + cx(lastH) + '" cy="' + cy(lastH) + '" r=".55" fill="none" stroke="#ffd75a" stroke-width=".1"/>';
    return s + '</svg>';
  }
  function name(e, i) { var p = (e.players || [])[i]; return p ? String(p.name).replace(/ \((Red|Black)\)$/, '') : ''; }
  function tgOf(str, side) { var p = String(str || '').split('.'), v = p[side - 1]; return v === 'x' || v == null ? 99 : +v; }

  HistView.register('twixt', function (e, ui) {
    var d = e.dt, C = window.TwixtCore; if (!d || d.mv == null || !C) return null;
    var list = String(d.mv || '').split(' ').filter(Boolean), sides = String(d.sides || 'rb');
    // who played each color at the end; before a swap, each seat played the other color
    var swapAt = list.indexOf('swap');
    function who(side, n) { var c = side === 1 ? 'r' : 'b'; if (swapAt >= 0 && n <= swapAt) c = c === 'r' ? 'b' : 'r'; var i = sides.indexOf(c); return i >= 0 ? name(e, i) || (side === 1 ? 'Red' : 'Black') : side === 1 ? 'Red' : 'Black'; }
    var st = C.newGame({ swap: !!d.swap }), pos = [JSON.parse(JSON.stringify(st))], moves = [], ok = true;
    list.forEach(function (m, i) {
      if (!ok) return;
      var side = st.turn, r = C.play(st, m);
      if (!r) { ok = false; return; }
      moves.push({ m: m, side: side, links: r.links.length, h: r.swap ? -1 : r.h, n: i });
      pos.push({ b: st.b.slice(), lk: st.lk.slice() });
    });
    var ev = String(d.ev || '').split(' '), tg = String(d.tg || '').split(' ').filter(Boolean);
    var chain = String(d.chain || '').split(' ').filter(Boolean).map(C.hole);
    var M = moves.length, fin = pos[M], snap = ui.el('div', null, [ui.picture(boardSvg(C, fin, M ? moves[M - 1].h : -1, chain.length ? chain : null), { frame: 'wood' })]);
    var out = [ui.section('Final board', snap)];
    if (ok && M > 1) {
      var label = ui.el('b'), rng = ui.el('input', { type: 'range', min: '0', max: String(M), value: String(M), class: 'hv-range', 'aria-label': 'Move' });
      var showAt = function (n) {
        snap.innerHTML = ''; snap.appendChild(ui.picture(boardSvg(C, pos[n], n ? moves[n - 1].h : -1, n === M && chain.length ? chain : null), { frame: 'wood' }));
        if (!n) return 'The empty board';
        var x = moves[n - 1], w = who(x.side, x.n);
        return (n === M ? 'The last move, move ' : 'Move ') + n + ': ' + (x.m === 'swap' ? w + ' swapped sides' : w + ' placed a peg at ' + x.m + (x.links ? ' with ' + x.links + (x.links === 1 ? ' link' : ' links') : ''));
      };
      rng.addEventListener('input', function () { label.textContent = showAt(+rng.value); });
      label.textContent = showAt(M);
      out.push(ui.section('Replay', ui.el('div', { class: 'hv-replay' }, [rng, label])));
    }
    // each side's pegs to go over the game: the line that reaches the bottom joined
    if (tg.length > 2) {
      var fin = []; tg.forEach(function (x) { [1, 2].forEach(function (sd) { var v = tgOf(x, sd); if (v < 99) fin.push(v); }); });
      var W = 320, Hh = 90, P = 8, hi = Math.max.apply(null, fin.concat([4])) + 1;
      var vr = tg.map(function (x) { return Math.min(hi, tgOf(x, 1)); }), vb = tg.map(function (x) { return Math.min(hi, tgOf(x, 2)); });
      var px = function (i) { return P + i * (W - 2 * P) / (tg.length - 1); }, py = function (v) { return Hh - P - (v / hi) * (Hh - 2 * P); };
      var line = function (v, c, w) { return '<polyline fill="none" stroke="' + c + '" stroke-width="' + w + '" stroke-linejoin="round" stroke-linecap="round" points="' + v.map(function (y, i) { return px(i).toFixed(1) + ',' + py(y).toFixed(1); }).join(' ') + '"/>'; };
      var svg = '<svg viewBox="0 0 ' + W + ' ' + Hh + '" role="img" aria-label="Pegs to go over the game"><line x1="' + P + '" x2="' + (W - P) + '" y1="' + (Hh - P) + '" y2="' + (Hh - P) + '" stroke="rgba(255,214,90,.5)" stroke-dasharray="4 4"/>' +
        line(vb, '#111114', 3) + line(vr, '#d2372c', 3) + '</svg>';
      out.push(ui.section('Pegs to go over the game', [ui.picture(svg, { frame: 'felt' }), ui.chips([{ t: 'Red: ' + who(1, M), c: '#d2372c' }, { t: 'Black: ' + who(2, M), c: '#9a9aa6' }, { t: 'The dashed line is joined', c: '#ffd75a' }])]));
    }
    if (ok && M) {
      out.push(ui.section('The moves', ui.log(moves.map(function (x, i) {
        var e2 = ev[i] || '', blk = /x$/.test(e2);
        return { b: (i + 1) + '.', t: x.m === 'swap' ? who(x.side, x.n) + ' swapped sides' : who(x.side, x.n) + ' placed a peg at ' + x.m + (x.links ? ', ' + x.links + (x.links === 1 ? ' link' : ' links') : '') + (blk ? ', a block' : ''), c: x.side === 1 ? '#d2372c' : '#2a2a30' };
      }), { numbered: false })));
    }
    var pegs = d.pegs || [0, 0], span = d.span || [0, 0], blk = [0, 0];
    ev.forEach(function (x) { if (/x$/.test(x)) blk[x.charAt(0) === 'r' ? 0 : 1]++; });
    var last = tg[tg.length - 1];
    out.push(ui.table(['', 'Red', 'Black'], [['Pegs placed', pegs[0], pegs[1]], ['Pegs to go at the end', d.win === 'r' ? 'Joined' : tgOf(last, 1) >= 99 ? 'Cut off' : tgOf(last, 1), d.win === 'b' ? 'Joined' : tgOf(last, 2) >= 99 ? 'Cut off' : tgOf(last, 2)], ['Longest chain', span[0] + ' rows', span[1] + ' columns'], ['Blocks', blk[0], blk[1]]]));
    var why = { stuck: 'Neither player could join their border rows any more: a draw.', agreed: 'The players agreed to a draw.', resign: 'The game ended when a player resigned.' }[d.why];
    if (why) out.push(ui.facts([['How it ended', why]]));
    return ui.wrap(out);
  });
})();
