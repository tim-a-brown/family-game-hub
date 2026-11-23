'use strict';
// History view: Lines of Action (games/lines-of-action.html). detail: {grid: 8 rows of 'b', 'w', '.', mv: 'b1-b3 d1xa4 ...'
// (every move from the start, x a capture), win: 'b' | 'w' | '', why: 'connect' | 'both' | 'rep' | 'stuck', tie, sides
// ('bw': seat 0's color first), caps: [black's, white's], gl: '65 64 ...' (each side's groups after every move), last}
(function () {
  if (!window.HistView) return;
  var FILES = 'abcdefgh';
  function sq(n) { return (8 - +n.charAt(1)) * 8 + (n.charCodeAt(0) - 97); }
  function start() {
    var b = []; for (var i = 0; i < 64; i++) b.push(0);
    for (var c = 1; c <= 6; c++) { b[c] = 1; b[56 + c] = 1; }
    for (var r = 1; r <= 6; r++) { b[r * 8] = -1; b[r * 8 + 7] = -1; }
    return b;
  }
  function pool(b, side) {
    var s = '';
    for (var q = 0; q < 64; q++) {
      if (b[q] !== side) continue;
      var r = q >> 3, c = q & 7;
      s += '<circle cx="' + (c + 0.5) + '" cy="' + (r + 0.5) + '" r=".47"/>';
      [[0, 1], [1, -1], [1, 0], [1, 1]].forEach(function (d) { var rr = r + d[0], cc = c + d[1]; if (rr <= 7 && cc >= 0 && cc <= 7 && b[rr * 8 + cc] === side) s += '<line x1="' + (c + 0.5) + '" y1="' + (r + 0.5) + '" x2="' + (cc + 0.5) + '" y2="' + (rr + 0.5) + '"/>'; });
    }
    return s;
  }
  // the board as a picture: maple and walnut squares, each side's groups as a soft shadow, the stones, the last move
  function boardSvg(b, mv) {
    var s = '<svg viewBox="-0.3 -0.3 8.6 8.6" role="img" aria-label="Lines of Action board"><defs>' +
      '<radialGradient id="loab" cx=".36" cy=".3" r=".75"><stop offset="0" stop-color="#8d8d98"/><stop offset=".2" stop-color="#3a3a42"/><stop offset=".6" stop-color="#16161a"/><stop offset="1" stop-color="#040405"/></radialGradient>' +
      '<radialGradient id="loaw" cx=".36" cy=".3" r=".75"><stop offset="0" stop-color="#ffffff"/><stop offset=".4" stop-color="#f4f0e8"/><stop offset="1" stop-color="#bdb5a4"/></radialGradient></defs>';
    s += '<rect x="-0.3" y="-0.3" width="8.6" height="8.6" rx=".25" fill="#3d2614"/>';
    for (var q = 0; q < 64; q++) { var r = q >> 3, c = q & 7; s += '<rect x="' + c + '" y="' + r + '" width="1" height="1" fill="' + ((r + c) % 2 ? '#7a4f29' : '#dfc38d') + '"/>'; }
    if (mv) {
      [mv.f, mv.t].forEach(function (x, i) { s += '<rect x="' + (x & 7) + '" y="' + (x >> 3) + '" width="1" height="1" fill="rgba(255,206,64,' + (i ? '.38' : '.22') + ')"/>'; });
      s += '<line x1="' + ((mv.f & 7) + 0.5) + '" y1="' + ((mv.f >> 3) + 0.5) + '" x2="' + ((mv.t & 7) + 0.5) + '" y2="' + ((mv.t >> 3) + 0.5) + '" stroke="#ffd75a" stroke-width=".07" stroke-linecap="round" opacity=".9"/>';
    }
    s += '<g fill="#06060a" stroke="#06060a" stroke-width=".9" stroke-linecap="round" opacity=".34">' + pool(b, 1) + '</g>';
    s += '<g fill="#fffaf0" stroke="#fffaf0" stroke-width=".9" stroke-linecap="round" opacity=".3">' + pool(b, -1) + '</g>';
    for (q = 0; q < 64; q++) {
      if (!b[q]) continue;
      var x = (q & 7) + 0.5, y = (q >> 3) + 0.5;
      s += '<circle cx="' + x + '" cy="' + (y + 0.05) + '" r=".38" fill="rgba(0,0,0,.4)"/><circle cx="' + x + '" cy="' + y + '" r=".38" fill="url(#loa' + (b[q] === 1 ? 'b' : 'w') + ')"/>' +
        '<ellipse cx="' + (x - 0.1) + '" cy="' + (y - 0.17) + '" rx=".13" ry=".07" fill="rgba(255,255,255,' + (b[q] === 1 ? '.35' : '.7') + ')" transform="rotate(-24 ' + (x - 0.1) + ' ' + (y - 0.17) + ')"/>';
    }
    return s + '</svg>';
  }
  function fmt(m) { return m.txt.slice(0, 2).toUpperCase() + (m.cap ? ' and took the piece on ' : ' to ') + m.txt.slice(3).toUpperCase(); }
  function name(e, i) { var p = (e.players || [])[i]; return p ? String(p.name).replace(/ \((Black|White)\)$/, '') : ''; }

  HistView.register('linesofaction', function (e, ui) {
    var d = e.dt; if (!d || !d.grid) return null;
    var fin = []; d.grid.join('').split('').forEach(function (ch) { fin.push(ch === 'b' ? 1 : ch === 'w' ? -1 : 0); });
    var sides = String(d.sides || 'bw');
    function who(side) { var i = sides.indexOf(side === 1 ? 'b' : 'w'); return i >= 0 ? name(e, i) || (side === 1 ? 'Black' : 'White') : side === 1 ? 'Black' : 'White'; }
    var list = String(d.mv || '').split(' ').filter(Boolean), pos = [start()], moves = [], ok = true;
    // rebuild every position: a move takes the piece from one square to another (a capture lands on the enemy piece)
    var b = pos[0].slice(), side = 1;
    list.forEach(function (m) {
      if (!ok) return;
      var mm = /^([a-h][1-8])([-x])([a-h][1-8])$/.exec(m); if (!mm) { ok = false; return; }
      var f = sq(mm[1]), t = sq(mm[3]); if (!b[f]) { ok = false; return; }
      side = b[f];
      b[t] = b[f]; b[f] = 0; pos.push(b.slice()); moves.push({ f: f, t: t, cap: mm[2] === 'x', side: side, txt: m });
    });
    if (ok && list.length && b.join() !== fin.join()) ok = false;   // (a list that doesn't end on the saved board isn't shown)
    var N = moves.length, snap = ui.el('div', null, [ui.picture(boardSvg(fin, moves[N - 1]), { frame: 'wood' })]);
    var out = [ui.section('Final board', snap)];
    if (ok && N > 1) {
      var label = ui.el('b'), rng = ui.el('input', { type: 'range', min: '0', max: String(N), value: String(N), class: 'hv-range', 'aria-label': 'Move' });
      var showAt = function (n) {
        snap.innerHTML = ''; snap.appendChild(ui.picture(boardSvg(pos[n], n ? moves[n - 1] : null), { frame: 'wood' }));
        if (!n) return 'The starting position';
        var m = moves[n - 1];
        return (n === N ? 'The last move, move ' : 'Move ') + n + ' · ' + who(m.side) + ' moved ' + fmt(m);
      };
      rng.addEventListener('input', function () { label.textContent = showAt(+rng.value); });
      label.textContent = showAt(N);
      out.push(ui.section('Replay', ui.el('div', { class: 'hv-replay' }, [rng, label])));
      // each side's groups over the game: the line that reaches 1 is the one that joined
      var gl = String(d.gl || '').split(' ').filter(Boolean);
      if (gl.length > 2) {
        var gb = gl.map(function (x) { return +x.charAt(0); }), gw = gl.map(function (x) { return +x.charAt(1); });
        var W = 320, H = 90, P = 8, hi = Math.max.apply(null, gb.concat(gw).concat([4]));
        var px = function (i) { return P + i * (W - 2 * P) / (gl.length - 1); }, py = function (v) { return P + (v - 1) / (hi - 1) * (H - 2 * P); };
        var line = function (v, c, w) { return '<polyline fill="none" stroke="' + c + '" stroke-width="' + w + '" stroke-linejoin="round" stroke-linecap="round" points="' + v.map(function (y, i) { return px(i).toFixed(1) + ',' + py(y).toFixed(1); }).join(' ') + '"/>'; };
        var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Groups over the game"><line x1="' + P + '" x2="' + (W - P) + '" y1="' + py(1) + '" y2="' + py(1) + '" stroke="rgba(255,214,90,.5)" stroke-dasharray="4 4"/>' +
          line(gw, '#f4f1e8', 2.5) + line(gb, '#111114', 3) + '</svg>';
        out.push(ui.section('Groups over the game', [ui.picture(svg, { frame: 'felt' }), ui.chips([{ t: 'Black line: ' + who(1), c: '#9a9aa6' }, { t: 'White line: ' + who(-1), c: '#e9e4d8' }, { t: 'The dashed line is one group', c: '#ffd75a' }])]));
      }
      out.push(ui.section('The moves', ui.log(moves.map(function (m, i) {
        return { b: (i + 1) + '.', t: who(m.side) + ' moved ' + fmt(m), c: m.side === 1 ? '#3a3a42' : '#ece7dc' };
      }), { numbered: false })));
    }
    var nb = fin.filter(function (v) { return v === 1; }).length, nw = fin.filter(function (v) { return v === -1; }).length, caps = d.caps || [0, 0];
    out.push(ui.table(['', 'Black', 'White'], [['Pieces left', nb, nw], ['Captures', caps[0] || 0, caps[1] || 0]]));
    var why = { connect: '', both: d.win ? 'One move joined both sides, and the player who moved won.' : 'One move joined both sides at once: a draw.', rep: 'The same position came up a third time: a draw.', stuck: 'Neither player could move: a draw.' }[d.why || 'connect'];
    if (why) out.push(ui.facts([['How it ended', why]]));
    return ui.wrap(out);
  });
})();
