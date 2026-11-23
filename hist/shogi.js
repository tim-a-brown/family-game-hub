'use strict';
// History view: Shogi. The final board with both piece stands, a replay rebuilt from the moves (Western notation:
// P7g-7f, B8hx2b+, P*5e), the moves in a table, and the numbers side by side.
// detail (games/shogi.html detail()): grid [9 rows: Black capitals, White lower case, promoted Q U V X H D, '.' empty],
// hb / hw (7 counts in base 36, Pawn first), mv (the moves joined by spaces), last (square), sides ('bw': seat 0's
// side), why, w (1 Black won, -1 White, 0 a draw), ev {p, c, d, k: promotions, captures, drops, checks as 'b-w'}
(function () {
  if (!window.HistView) return;
  var GL = '.PLNSGBRKQUVX?HD';
  var KANJI = ['', '歩', '香', '桂', '銀', '金', '角', '飛', '玉', 'と', '杏', '圭', '全', '', '馬', '龍'];
  var NAME = ['', 'Pawn', 'Lance', 'Knight', 'Silver', 'Gold', 'Bishop', 'Rook', 'King', 'Tokin', 'Promoted Lance', 'Promoted Knight', 'Promoted Silver', '', 'Horse', 'Dragon'];
  var LETTER = ['', 'P', 'L', 'N', 'S', 'G', 'B', 'R', 'K', '+P', '+L', '+N', '+S', '', '+B', '+R'];
  var WHY = { mate: 'Checkmate', nomoves: 'No legal move left', perpetual: 'Perpetual check', rep: 'Fourfold repetition', declare: 'Impasse declared', count: 'Impasse count', resign: 'Resigned' };
  function font() {
    if (document.getElementById('hv-shogi-font')) return;
    var s = document.createElement('style'); s.id = 'hv-shogi-font';
    s.textContent = "@font-face{font-family:'Shogi Kanji';src:url('/fonts/shogi-kanji.woff2') format('woff2');font-weight:700;font-display:swap;}";
    document.head.appendChild(s);
  }
  function fromGrid(d) {
    var b = [], rows = d.grid || [];
    for (var r = 0; r < 9; r++) for (var c = 0; c < 9; c++) {
      var ch = (rows[r] || '').charAt(c) || '.', up = ch.toUpperCase(), t = GL.indexOf(up);
      b.push(t <= 0 ? 0 : ch === up ? t : -t);
    }
    function hand(s) { var h = [0]; for (var t = 1; t <= 7; t++) h.push(parseInt(String(s || '').charAt(t - 1) || '0', 36) || 0); return h; }
    return { b: b, hb: hand(d.hb), hw: hand(d.hw) };
  }
  function start() {
    var b = [], i, back = [2, 3, 4, 5, 8, 5, 4, 3, 2];
    for (i = 0; i < 81; i++) b.push(0);
    for (i = 0; i < 9; i++) { b[i] = -back[i]; b[72 + i] = back[i]; b[18 + i] = -1; b[54 + i] = 1; }
    b[64] = 6; b[70] = 7; b[16] = -6; b[10] = -7;
    return { b: b, hb: [0, 0, 0, 0, 0, 0, 0, 0], hw: [0, 0, 0, 0, 0, 0, 0, 0] };
  }
  function sq(f, r) { return 'abcdefghi'.indexOf(r) * 9 + (9 - +f); }
  var RE = /^(\+?[PLNSGBRK])(?:\*(\d)([a-i])|(\d)([a-i])([-x])(\d)([a-i])([+=]?))$/;
  // one move on a position (no checking: the game checked it when it was played)
  function step(p, txt, side) {
    var x = RE.exec(txt); if (!x) return null;
    var b = p.b.slice(), hb = p.hb.slice(), hw = p.hw.slice(), to, fr = -1;
    if (x[2]) { var t = LETTER.indexOf(x[1]); to = sq(x[2], x[3]); b[to] = t * side; (side > 0 ? hb : hw)[t]--; }
    else {
      fr = sq(x[4], x[5]); to = sq(x[7], x[8]);
      var cap = b[to]; if (cap) { var ct = Math.abs(cap); if (ct > 8) ct -= 8; (side > 0 ? hb : hw)[ct]++; }
      b[to] = (Math.abs(b[fr]) + (x[9] === '+' ? 8 : 0)) * side; b[fr] = 0;
    }
    return { b: b, hb: hb, hw: hw, f: fr, t: to };
  }
  // the board as a picture: kaya wood, ruled lines, star points, wedge pieces facing their owners, both stands
  function piece(x, y, u, v, faceUp) {
    var t = Math.abs(v), k = [0, .84, .87, .89, .92, .93, .96, .96, 1, .84, .87, .89, .92, 0, .96, .96][t] || 1;
    var w = u * .82 * k, h = u * .94 * k, y1 = h / 2, y0 = -h / 2, shy = y0 + h * .17, sx = w * .12;
    var d = 'M0 ' + y0.toFixed(1) + 'L' + (w / 2 - sx).toFixed(1) + ' ' + shy.toFixed(1) + 'L' + (w / 2).toFixed(1) + ' ' + y1.toFixed(1) + 'L' + (-w / 2).toFixed(1) + ' ' + y1.toFixed(1) + 'L' + (-w / 2 + sx).toFixed(1) + ' ' + shy.toFixed(1) + 'Z';
    var kan = t === 8 && v < 0 ? '王' : KANJI[t];
    return '<g transform="translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ')' + (faceUp ? '' : ' rotate(180)') + '"><path d="' + d + '" fill="url(#hsgw)" stroke="#8a5b24" stroke-width="' + (u * .03).toFixed(2) + '" stroke-linejoin="round"/>' +
      '<text y="' + (h * .07).toFixed(1) + '" text-anchor="middle" dominant-baseline="central" font-family="Shogi Kanji, Hiragino Mincho ProN, Yu Mincho, serif" font-weight="700" font-size="' + (h * .5).toFixed(1) + '" fill="' + (t > 8 ? '#b42318' : '#1d1208') + '">' + kan + '</text></g>';
  }
  function svg(p, mark, from) {
    var u = 30, pad = 14, standH = 34, W = 9 * u + pad * 2, H = 9 * u + pad * 2 + standH * 2 + 12;
    var ox = pad, oy = standH + 6 + pad, s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Shogi board"><defs>' +
      '<linearGradient id="hsgw" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fbe8bd"/><stop offset=".55" stop-color="#ecc985"/><stop offset="1" stop-color="#d6a659"/></linearGradient>' +
      '<radialGradient id="hsgk" cx=".3" cy=".2" r="1.2"><stop offset="0" stop-color="#f3cd86"/><stop offset=".6" stop-color="#e2b066"/><stop offset="1" stop-color="#d39f55"/></radialGradient></defs>';
    // the stands, White's above and Black's below
    function stand(y, h, side) {
      var out = '<rect x="' + pad + '" y="' + y + '" width="' + (W - 2 * pad) + '" height="' + standH + '" rx="7" fill="#d9ab62" stroke="#8a5b24" stroke-width="1"/>', x = side > 0 ? pad + 18 : W - pad - 18, n = 0;
      for (var t = 7; t >= 1; t--) {
        if (!h[t]) continue;
        out += piece(x, y + standH / 2, 28, t * side, side > 0);
        if (h[t] > 1) out += '<circle cx="' + (x + 11) + '" cy="' + (y + standH - 8) + '" r="6.5" fill="#2a1a0c"/><text x="' + (x + 11) + '" y="' + (y + standH - 8) + '" text-anchor="middle" dominant-baseline="central" font-size="9" font-weight="800" fill="#ffe9bd" font-family="system-ui">' + h[t] + '</text>';
        x += side > 0 ? 34 : -34; n++;
      }
      if (!n) out += '<text x="' + W / 2 + '" y="' + (y + standH / 2) + '" text-anchor="middle" dominant-baseline="central" font-size="10" font-weight="700" fill="rgba(70,40,10,.6)" font-family="system-ui">No pieces in hand</text>';
      return out;
    }
    s += stand(0, p.hw, -1);
    s += '<rect x="' + (ox - pad + 2) + '" y="' + (oy - pad + 2) + '" width="' + (9 * u + 2 * pad - 4) + '" height="' + (9 * u + 2 * pad - 4) + '" rx="8" fill="#6e4520"/>';
    s += '<rect x="' + ox + '" y="' + oy + '" width="' + 9 * u + '" height="' + 9 * u + '" fill="url(#hsgk)"/>';
    [[from, 'rgba(255,170,40,.2)'], [mark, 'rgba(255,170,40,.45)']].forEach(function (q) { if (q[0] != null && q[0] >= 0) s += '<rect x="' + (ox + (q[0] % 9) * u) + '" y="' + (oy + Math.floor(q[0] / 9) * u) + '" width="' + u + '" height="' + u + '" fill="' + q[1] + '"/>'; });
    for (var k = 0; k <= 9; k++) {
      s += '<line x1="' + ox + '" x2="' + (ox + 9 * u) + '" y1="' + (oy + k * u) + '" y2="' + (oy + k * u) + '" stroke="#2c1a08" stroke-width="' + (k % 9 ? .8 : 1.6) + '"/>';
      s += '<line y1="' + oy + '" y2="' + (oy + 9 * u) + '" x1="' + (ox + k * u) + '" x2="' + (ox + k * u) + '" stroke="#2c1a08" stroke-width="' + (k % 9 ? .8 : 1.6) + '"/>';
    }
    [[3, 3], [3, 6], [6, 3], [6, 6]].forEach(function (q) { s += '<circle cx="' + (ox + q[1] * u) + '" cy="' + (oy + q[0] * u) + '" r="2.4" fill="#2c1a08"/>'; });
    for (var i = 0; i < 9; i++) {
      s += '<text x="' + (ox + i * u + u / 2) + '" y="' + (oy - 5) + '" text-anchor="middle" font-size="8" font-weight="800" fill="#f3dcb0" font-family="system-ui">' + (9 - i) + '</text>';
      s += '<text x="' + (ox + 9 * u + 7) + '" y="' + (oy + i * u + u / 2) + '" text-anchor="middle" dominant-baseline="central" font-size="8" font-weight="800" fill="#f3dcb0" font-family="system-ui">' + 'abcdefghi'.charAt(i) + '</text>';
    }
    for (var q = 0; q < 81; q++) { var v = p.b[q]; if (v) s += piece(ox + (q % 9) * u + u / 2, oy + Math.floor(q / 9) * u + u / 2, u, v, v > 0); }
    s += stand(oy + 9 * u + pad + 6 - 2, p.hb, 1);
    return s + '</svg>';
  }
  function name(e, i) { var p = (e.players || [])[i]; return p ? String(p.name).replace(/ \((Black|White)\)$/, '') : ''; }

  HistView.register('shogi', function (e, ui) {
    var d = e.dt; if (!d || !d.grid) return null;
    font();
    var sides = String(d.sides || 'bw'), bName = name(e, sides.indexOf('b')) || 'Black', wName = name(e, sides.indexOf('w')) || 'White';
    var fin = fromGrid(d), mv = String(d.mv || '').split(' ').filter(Boolean);
    // rebuild every position from the start (only when the moves lead to the final board: a game begun from a set position doesn't)
    var pos = [start()], ok = true, side = 1;
    for (var i = 0; i < mv.length; i++) { var nx = step(pos[i], mv[i], side); if (!nx) { ok = false; break; } pos.push(nx); side = -side; }
    if (ok) ok = pos[pos.length - 1].b.join() === fin.b.join();
    var snap = ui.el('div', { class: 'hv-shogi' }, [ui.picture(svg(fin, d.last, ok && mv.length ? pos[mv.length].f : -1), { frame: 'wood' })]);
    var out = [ui.section('Final board', snap)];
    var B = HistView.boardUI;
    if (ok && mv.length > 1 && B) {
      out.push(ui.section('Replay', B.replay(ui, mv.length, function (n) {
        snap.innerHTML = ''; snap.appendChild(ui.picture(svg(pos[n], n ? pos[n].t : -1, n ? pos[n].f : -1), { frame: 'wood' }));
        return n === 0 ? 'The starting position' : 'Move ' + n + ' · ' + (n % 2 ? bName : wName) + ' played ' + mv[n - 1];
      })));
    }
    if (mv.length) {
      var rows = [];
      for (var j = 0; j < mv.length; j += 2) rows.push([String(j / 2 + 1), mv[j], mv[j + 1] || '']);
      out.push(ui.section('Moves', ui.table(['', 'Black: ' + bName, 'White: ' + wName], rows)));
    }
    var ev = d.ev || {};
    function pair(k) { var x = String(ev[k] || '0-0').split('-'); return [+x[0] || 0, +x[1] || 0]; }
    var P = pair('p'), Cp = pair('c'), D = pair('d'), K = pair('k');
    out.push(ui.table(['', 'Black', 'White'], [['Promotions', P[0], P[1]], ['Captures', Cp[0], Cp[1]], ['Drops', D[0], D[1]], ['Checks', K[0], K[1]]]));
    if (d.why && B) out.push(B.foot(ui, (WHY[d.why] || '') + (d.w ? ': ' + (d.w > 0 ? bName : wName) + ' won' : ': a draw') + ' after ' + mv.length + ' moves', d.w ? 'trophy' : 'flag'));
    return ui.wrap(out);
  });
})();
