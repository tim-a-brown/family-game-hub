'use strict';
// History view: Xiangqi. The final board, a replay move by move with the move written in WXF, the moves, and what decided
// it. The detail (games/xiangqi.html detailOf): b the final board (10 rows of 9, KAEHRCP Red, lowercase Black), u every
// move as from-to points (ICCS: "h3e3"), w the same moves in WXF, k a 1 for each move that gave check, res the ending,
// wn the winning side (1 Red, -1 Black, 0 none), s0 the first player's side, st a starting position other than the usual
// one (the core's key), lv the computer's skill.
(function () {
  if (!window.HistView) return;
  var CHR = { K: '帥', A: '仕', E: '相', H: '傌', R: '俥', C: '炮', P: '兵', k: '將', a: '士', e: '象', h: '馬', r: '車', c: '砲', p: '卒' };
  var NAME = { K: 'General', A: 'Advisor', E: 'Elephant', H: 'Horse', R: 'Chariot', C: 'Cannon', P: 'Soldier' };
  var RES = { mate: 'Checkmate', stalemate: 'No legal move left', perpetual: 'Perpetual check', chase: 'Perpetual chase', repetition: 'Draw by repetition', material: 'Draw: no attacking pieces left', quiet: 'Draw: 60 moves each with no capture', agreed: 'Draw agreed', resign: 'Resigned', left: 'Left the table' };
  function names(e) { return (e.players || []).map(function (p) { return String(p.name || '').replace(/ \((Red|Black)\)$/, ''); }); }
  function startCells(st) {
    if (st && st.length >= 90) return st.slice(0, 90).split('').map(function (ch) { return ch === '.' ? '.' : ch; });
    return ('rheakaehr' + '.........' + '.c.....c.' + 'p.p.p.p.p' + '.........' + '.........' + 'P.P.P.P.P' + '.C.....C.' + '.........' + 'RHEAKAEHR').split('');
  }
  function idx(n) { return (10 - +n.slice(1)) * 9 + 'abcdefghi'.indexOf(n.charAt(0)); }
  function apply(b, mv) { var m = /^([a-i]\d+)([a-i]\d+)$/.exec(mv); if (!m) return null; var f = idx(m[1]), t = idx(m[2]), cap = b[t]; b[t] = b[f]; b[f] = '.'; return { f: f, t: t, cap: cap }; }
  function board(cells, o) {
    o = o || {};
    var flip = !!o.flip, s = '<svg viewBox="0 0 90 100" role="img" aria-label="' + (o.aria || 'Xiangqi board') + '">';
    s += '<rect x="0" y="0" width="90" height="100" rx="2" fill="#e8c283"/>';
    var L = '#4a2a10', g = '<g stroke="' + L + '" stroke-width=".5" fill="none">';
    g += '<rect x="5" y="5" width="80" height="90" stroke-width=".9"/>';
    for (var r = 1; r < 9; r++) g += '<line x1="5" x2="85" y1="' + (5 + r * 10) + '" y2="' + (5 + r * 10) + '"/>';
    for (var c = 1; c < 8; c++) g += '<line x1="' + (5 + c * 10) + '" x2="' + (5 + c * 10) + '" y1="5" y2="45"/><line x1="' + (5 + c * 10) + '" x2="' + (5 + c * 10) + '" y1="55" y2="95"/>';
    g += '<path d="M35 5L55 25M55 5L35 25M35 75L55 95M55 75L35 95"/></g>';
    s += g + '<g font-family="XQ Kai, serif" font-weight="700" font-size="6" fill="#5a3112" fill-opacity=".7" text-anchor="middle" dominant-baseline="central"><text x="22" y="50">楚 河</text><text x="68" y="50">漢 界</text></g>';
    function xy(i) { var rr = Math.floor(i / 9), cc = i % 9; if (flip) { rr = 9 - rr; cc = 8 - cc; } return [5 + cc * 10, 5 + rr * 10]; }
    if (o.last) { var a = xy(o.last.f), z = xy(o.last.t); s += '<circle cx="' + a[0] + '" cy="' + a[1] + '" r="2" fill="none" stroke="#d68c14" stroke-width=".9"/><circle cx="' + z[0] + '" cy="' + z[1] + '" r="5.2" fill="none" stroke="#e69614" stroke-width="1.1"/>'; }
    for (var i = 0; i < 90; i++) {
      var ch = cells[i]; if (!ch || ch === '.') continue;
      var p = xy(i), red = ch === ch.toUpperCase(), ink = red ? '#a8141c' : '#1c1a18';
      var hot = o.mated && ch === o.mated;
      s += '<circle cx="' + p[0] + '" cy="' + (p[1] + .7) + '" r="4.3" fill="#7a4b20"/>';
      s += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="4.3" fill="#f1d7a3"' + (hot ? ' stroke="#e02a2a" stroke-width="1.2"' : '') + '/>';
      s += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="3.4" fill="none" stroke="' + ink + '" stroke-width=".35" opacity=".75"/>';
      s += '<text x="' + p[0] + '" y="' + (p[1] + .2) + '" text-anchor="middle" dominant-baseline="central" font-family="XQ Kai, serif" font-weight="700" font-size="4.6" fill="' + ink + '">' + CHR[ch] + '</text>';
    }
    return s + '</svg>';
  }
  HistView.register('xiangqi', function (e, ui) {
    var d = e.dt; if (!d || !d.b) return null;
    ui.css('hv-xiangqi', '@font-face{font-family:"XQ Kai";src:url(/fonts/xiangqi-kai.woff2) format("woff2");font-weight:700;}' +
      '.hvx-moves{max-height:132px;overflow-y:auto;display:flex;flex-wrap:wrap;gap:2px 4px;padding:8px 10px;border-radius:12px;background:#f6f1e3;color:#2b2218;font-size:.84rem;line-height:1.5;font-variant-numeric:tabular-nums;}' +
      '.hvx-moves .no{color:#9a8a70;font-weight:800;margin-left:4px;}.hvx-moves span.mv{padding:0 3px;border-radius:4px;font-weight:700;}.hvx-moves span.mv.r{color:#a8141c;}' +
      '.hvx-moves span.mv.on{background:#2b2218;color:#f6f1e3;}');
    var nm = names(e), ps = e.players || [], s0 = d.s0 === -1 ? -1 : 1;
    var nameOf = function (side) { return nm[side === s0 ? 0 : 1] || (side === 1 ? 'Red' : 'Black'); };
    var bottom = ps[1] && ps[1].cpu ? s0 : ps[0] && ps[0].cpu ? -s0 : 1, flip = bottom === -1;
    var fin = String(d.b.join ? d.b.join('') : d.b).split('');
    var uci = String(d.u || '').split(' ').filter(Boolean), wxf = String(d.w || '').split(' ').filter(Boolean), chk = String(d.k || '');
    var first = d.st && d.st.slice(-1) === 'b' ? -1 : 1;
    var mated = d.res === 'mate' && d.wn ? (d.wn === 1 ? 'k' : 'K') : null, lastFin = null;
    if (uci.length) { var tmp = startCells(d.st); uci.forEach(function (m) { lastFin = apply(tmp, m) || lastFin; }); }
    var snap = ui.picture(board(fin, { flip: flip, last: lastFin, mated: mated, aria: 'Final position' }), { frame: 'wood', max: 340 });
    var out = [ui.section('Final position', snap)];
    var spans = [], moveList = null;
    if (wxf.length) {
      moveList = ui.el('div', { class: 'hvx-moves' });
      var list = wxf.slice();
      list.forEach(function (m, i) {
        var mover = (i % 2 === 0) ? first : -first, no = Math.floor(i / 2) + 1;
        if (i % 2 === 0) moveList.appendChild(ui.el('span', { class: 'no', text: no + '.' }));
        var sp = ui.el('span', { class: 'mv' + (mover === 1 ? ' r' : ''), text: m + (chk.charAt(i) === '1' ? '+' : '') }); spans.push(sp); moveList.appendChild(sp);
      });
    }
    var plies = uci.length, B = HistView.boardUI;
    if (plies > 1 && B && B.replay) {
      out.push(ui.section('Replay', B.replay(ui, plies, function (n) {
        var b = startCells(d.st), lm = null, info = null;
        for (var i = 0; i < n; i++) { info = apply(b, uci[i]); lm = info; }
        snap.innerHTML = board(n === plies ? fin : b, { flip: flip, last: lm, mated: n === plies ? mated : null });
        spans.forEach(function (s, i) { s.classList.toggle('on', i === n - 1); });
        if (moveList && spans[n - 1]) moveList.scrollTop = Math.max(0, spans[n - 1].offsetTop - moveList.offsetTop - 50);
        if (!n) return 'Starting position';
        var side = (n - 1) % 2 === 0 ? first : -first, piece = info ? b[info.t] : '', what = piece ? NAME[piece.toUpperCase()] : '';
        return (n === plies ? 'Final · ' : '') + 'Move ' + Math.ceil(n / 2) + ' · ' + nameOf(side) + ' (' + (side === 1 ? 'Red' : 'Black') + '): ' + (wxf[n - 1] || uci[n - 1]) + (what ? ', the ' + what + (info.cap && info.cap !== '.' ? ' takes the ' + NAME[info.cap.toUpperCase()] : '') : '') + (chk.charAt(n - 1) === '1' ? ', check' : '');
      })));
    }
    if (moveList) out.push(ui.section('Moves', moveList));
    var checks = { '1': 0, '-1': 0 };
    for (var i = 0; i < chk.length; i++) if (chk.charAt(i) === '1') checks[i % 2 === 0 ? first : -first]++;
    out.push(ui.facts([['Result', (RES[d.res] || 'Over') + (d.wn ? ': ' + nameOf(d.wn) + ' won' : '')], ['Moves', Math.ceil(plies / 2) || ''], ['Checks', checks[1] + checks[-1] ? nameOf(1) + ' ' + checks[1] + ', ' + nameOf(-1) + ' ' + checks[-1] : ''], ['Computer', d.lv ? d.lv.charAt(0).toUpperCase() + d.lv.slice(1) : '']]));
    if (B && B.foot && d.wn) out.push(B.foot(ui, nameOf(d.wn) + ' won' + (d.res === 'mate' ? ' by checkmate on move ' + Math.ceil(plies / 2) : d.res === 'perpetual' ? ' because ' + nameOf(-d.wn) + ' kept checking as the position repeated' : d.res === 'chase' ? ' because ' + nameOf(-d.wn) + ' kept chasing one piece as the position repeated' : d.res === 'stalemate' ? ' because ' + nameOf(-d.wn) + ' had no legal move' : '') + '.', 'trophy'));
    return ui.wrap(out);
  });
})();
