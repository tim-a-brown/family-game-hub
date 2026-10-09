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
  // ── shared bits ──
  function plainName(e, i) { var p = (e.players || [])[i]; return p ? String(p.name).replace(/ \((Black|White)\)$/, '') : ''; }
  // A replay slider under a picture: show(n) redraws for step n (0..max)
  function slider(ui, max, show) {
    var label = ui.el('b'), rng = ui.el('input', { type: 'range', min: '0', max: String(max), value: String(max), class: 'hv-range', 'aria-label': 'Move' });
    rng.addEventListener('input', function () { label.textContent = show(+rng.value) || ''; });
    label.textContent = show(max) || '';
    return ui.el('div', { class: 'hv-replay' }, [rng, label]);
  }
  // A small line chart: series = [{v:[numbers], c:'#hex', w:width}], y from lo..hi; mid = dashed line value
  function spark(series, o) {
    o = o || {};
    var W = 320, H = o.h || 90, P = 6, n = Math.max.apply(null, series.map(function (s) { return s.v.length; }).concat([2]));
    var lo = o.lo != null ? o.lo : 0, hi = o.hi != null ? o.hi : Math.max.apply(null, [1].concat.apply([], series.map(function (s) { return s.v; })));
    function x(i) { return P + i * (W - 2 * P) / (n - 1); }
    function y(v) { return H - P - (v - lo) / ((hi - lo) || 1) * (H - 2 * P); }
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + (o.aria || 'Chart') + '">';
    if (o.mid != null) s += '<line x1="' + P + '" x2="' + (W - P) + '" y1="' + y(o.mid) + '" y2="' + y(o.mid) + '" stroke="rgba(255,255,255,.25)" stroke-dasharray="4 4"/>';
    series.forEach(function (sr) {
      var pts = sr.v.map(function (v, i) { return x(i).toFixed(1) + ',' + y(v).toFixed(1); }).join(' ');
      if (sr.fill) s += '<polygon points="' + x(0) + ',' + y(lo) + ' ' + pts + ' ' + x(sr.v.length - 1).toFixed(1) + ',' + y(lo) + '" fill="' + sr.fill + '"/>';
      s += '<polyline points="' + pts + '" fill="none" stroke="' + sr.c + '" stroke-width="' + (sr.w || 2.5) + '" stroke-linejoin="round" stroke-linecap="round"' + (sr.halo ? ' style="filter:drop-shadow(0 0 1px ' + sr.halo + ')"' : '') + '/>';
    });
    return s + '</svg>';
  }

  // ── Othello: the final board, a replay, and the disc count over the game ──
  var OT_DIRS = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
  function otBoardSvg(b, mark) {
    var cs = 36, W = cs * 8, s = '<svg viewBox="0 0 ' + W + ' ' + W + '" role="img" aria-label="Othello board">';
    s += '<defs><radialGradient id="otb" cx=".35" cy=".3" r=".75"><stop offset="0" stop-color="#55555c"/><stop offset=".5" stop-color="#1d1d21"/><stop offset="1" stop-color="#050506"/></radialGradient>' +
      '<radialGradient id="otw" cx=".35" cy=".3" r=".75"><stop offset="0" stop-color="#ffffff"/><stop offset=".6" stop-color="#eeeae0"/><stop offset="1" stop-color="#c8c0ae"/></radialGradient></defs>';
    s += '<rect width="' + W + '" height="' + W + '" fill="#17834a"/>';
    for (var k = 1; k < 8; k++) s += '<line x1="' + k * cs + '" x2="' + k * cs + '" y1="0" y2="' + W + '" stroke="rgba(0,0,0,.45)" stroke-width="1.2"/><line y1="' + k * cs + '" y2="' + k * cs + '" x1="0" x2="' + W + '" stroke="rgba(0,0,0,.45)" stroke-width="1.2"/>';
    [[2, 2], [2, 6], [6, 2], [6, 6]].forEach(function (q) { s += '<circle cx="' + q[1] * cs + '" cy="' + q[0] * cs + '" r="3" fill="rgba(0,0,0,.55)"/>'; });
    for (var i = 0; i < 64; i++) {
      var v = b[i]; if (!v) continue;
      var cx = (i % 8) * cs + cs / 2, cy = Math.floor(i / 8) * cs + cs / 2;
      s += '<circle cx="' + cx + '" cy="' + (cy + 1.5) + '" r="' + (cs * 0.4) + '" fill="rgba(0,0,0,.35)"/><circle cx="' + cx + '" cy="' + cy + '" r="' + (cs * 0.4) + '" fill="url(#ot' + (v === 1 ? 'b' : 'w') + ')"/>';
      if (i === mark) s += '<circle cx="' + cx + '" cy="' + cy + '" r="4" fill="#ff5a4e"/>';
    }
    return s + '</svg>';
  }
  R('othello', function (e, ui) {
    var d = e.dt; if (!d || !d.grid) return null;
    var fin = []; d.grid.join('').split('').forEach(function (ch) { fin.push(ch === 'b' ? 1 : ch === 'w' ? -1 : 0); });
    var mv = String(d.mv || ''), who = String(d.who || ''), N = mv.length / 2, sides = String(d.sides || 'bw');
    function nameOf(c) { var i = sides.indexOf(c); return i >= 0 ? plainName(e, i) : c === 'b' ? 'Black' : 'White'; }
    // rebuild every position from the move list
    var b = []; for (var i = 0; i < 64; i++) b.push(0); b[27] = -1; b[28] = 1; b[35] = 1; b[36] = -1;
    var pos = [b.slice()], cntB = [2], cntW = [2], sq = [], ok = true;
    for (var m = 0; m < N; m++) {
      var c = mv.charCodeAt(m * 2) - 97, r = 8 - +mv.charAt(m * 2 + 1), s = r * 8 + c, side = who.charAt(m) === 'w' ? -1 : 1;
      if (c < 0 || c > 7 || r < 0 || r > 7) { ok = false; break; }
      b[s] = side;
      OT_DIRS.forEach(function (dd) {
        var rr = r + dd[0], cc = c + dd[1], line = [];
        while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8 && b[rr * 8 + cc] === -side) { line.push(rr * 8 + cc); rr += dd[0]; cc += dd[1]; }
        if (line.length && rr >= 0 && rr < 8 && cc >= 0 && cc < 8 && b[rr * 8 + cc] === side) line.forEach(function (x) { b[x] = side; });
      });
      pos.push(b.slice()); sq.push(s);
      var nb = 0, nw = 0; b.forEach(function (v) { if (v === 1) nb++; else if (v === -1) nw++; }); cntB.push(nb); cntW.push(nw);
    }
    var snap = ui.el('div', null, [ui.picture(otBoardSvg(fin, d.last), { frame: 'wood' })]);
    var out = [ui.section('Final board', snap)];
    if (ok && N > 1) {
      out.push(ui.section('Replay', slider(ui, N, function (n) {
        snap.innerHTML = ''; snap.appendChild(ui.picture(otBoardSvg(n === N ? fin : pos[n], n ? sq[n - 1] : -1), { frame: 'wood' }));
        return n === 0 ? 'Starting position' : (n === N ? 'Final board · ' : '') + 'Move ' + n + ' · ' + nameOf(who.charAt(n - 1)) + ' at ' + mv.substr((n - 1) * 2, 2).toUpperCase() + ' · ' + cntB[n] + '–' + cntW[n];
      })));
      var chart = ui.picture(spark([{ v: cntW, c: '#f4f1e8', w: 2.5 }, { v: cntB, c: '#111114', w: 3, halo: 'rgba(255,255,255,.6)' }], { lo: 0, hi: Math.max(40, Math.max.apply(null, cntB.concat(cntW))), mid: 32, aria: 'Discs over the game' }), { frame: 'felt' });
      out.push(ui.section('Discs over the game', [chart, ui.chips([{ t: 'Black line: ' + nameOf('b'), c: '#9a9aa6' }, { t: 'White line: ' + nameOf('w'), c: '#e9e4d8' }])]));
    }
    var corners = { 1: 0, '-1': 0 }; [0, 7, 56, 63].forEach(function (x) { if (fin[x]) corners[fin[x]]++; });
    var best = d.best || [0, 0], ps = d.passes || [0, 0];
    out.push(ui.table(['', 'Black', 'White'], [
      ['Discs', cntB.length > 1 ? cntB[cntB.length - 1] : fin.filter(function (v) { return v === 1; }).length, cntW.length > 1 ? cntW[cntW.length - 1] : fin.filter(function (v) { return v === -1; }).length],
      ['Corners', corners[1], corners[-1]], ['Best flip', best[0] || '–', best[1] || '–'], ['Passes', ps[0], ps[1]]
    ]));
    return ui.wrap(out);
  });

  // ── Go: the final board with territory, and the score worked out ──
  function goSvg(rows, n, last) {
    var u = n <= 9 ? 30 : n <= 13 ? 22 : 15, pad = u * 0.8, W = (n - 1) * u + pad * 2, rs = u * 0.47;
    var s = '<svg viewBox="0 0 ' + W + ' ' + W + '" role="img" aria-label="Final Go board"><defs>' +
      '<radialGradient id="gob" cx=".38" cy=".32" r=".7"><stop offset="0" stop-color="#5a5a60"/><stop offset=".45" stop-color="#222226"/><stop offset="1" stop-color="#050506"/></radialGradient>' +
      '<radialGradient id="gow" cx=".38" cy=".32" r=".75"><stop offset="0" stop-color="#ffffff"/><stop offset=".6" stop-color="#ece7dc"/><stop offset="1" stop-color="#c4bba8"/></radialGradient>' +
      '<linearGradient id="gok" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ebc47c"/><stop offset=".5" stop-color="#e2b66b"/><stop offset="1" stop-color="#d7a65a"/></linearGradient></defs>';
    s += '<rect width="' + W + '" height="' + W + '" rx="6" fill="url(#gok)"/>';
    for (var k = 0; k < n; k++) {
      var p = pad + k * u;
      s += '<line x1="' + pad + '" x2="' + (W - pad) + '" y1="' + p + '" y2="' + p + '" stroke="#3a2510" stroke-width="' + (k === 0 || k === n - 1 ? 1.6 : 0.9) + '"/>';
      s += '<line y1="' + pad + '" y2="' + (W - pad) + '" x1="' + p + '" x2="' + p + '" stroke="#3a2510" stroke-width="' + (k === 0 || k === n - 1 ? 1.6 : 0.9) + '"/>';
    }
    var a = n <= 9 ? 2 : 3, z = n - 1 - a, m = (n - 1) / 2, st = n >= 15 ? [[a, a], [a, m], [a, z], [m, a], [m, m], [m, z], [z, a], [z, m], [z, z]] : [[a, a], [a, z], [z, a], [z, z], [m, m]];
    st.forEach(function (q) { s += '<circle cx="' + (pad + q[1] * u) + '" cy="' + (pad + q[0] * u) + '" r="' + Math.max(2, u * 0.09) + '" fill="#3a2510"/>'; });
    for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) {
      var ch = (rows[r] || '').charAt(c), x = pad + c * u, y = pad + r * u, ts = u * 0.3;
      if (ch === 'b' || ch === 'w' || ch === 'B' || ch === 'W') {
        var dead = ch === 'B' || ch === 'W', blk = ch === 'b' || ch === 'B';
        s += '<g' + (dead ? ' opacity=".42"' : '') + '><circle cx="' + x + '" cy="' + (y + 1) + '" r="' + rs + '" fill="rgba(0,0,0,.3)"/><circle cx="' + x + '" cy="' + y + '" r="' + rs + '" fill="url(#go' + (blk ? 'b' : 'w') + ')"' + (blk ? '' : ' stroke="#9c927e" stroke-width=".6"') + '/></g>';
        if (dead) s += '<rect x="' + (x - ts / 2) + '" y="' + (y - ts / 2) + '" width="' + ts + '" height="' + ts + '" rx="1" fill="' + (blk ? '#f6f2e8' : '#141416') + '"/>';
        if (r * n + c === last && !dead) s += '<circle cx="' + x + '" cy="' + y + '" r="' + rs * 0.42 + '" fill="none" stroke="' + (blk ? '#fff' : '#111') + '" stroke-width="' + Math.max(1.2, u * 0.06) + '"/>';
      } else if (ch === 'x' || ch === 'o') s += '<rect x="' + (x - ts / 2) + '" y="' + (y - ts / 2) + '" width="' + ts + '" height="' + ts + '" rx="1" fill="' + (ch === 'x' ? '#141416' : '#f6f2e8') + '"' + (ch === 'o' ? ' stroke="#8a7f69" stroke-width=".5"' : '') + '/>';
    }
    return s + '</svg>';
  }
  R('go', function (e, ui) {
    var d = e.dt; if (!d || !d.grid) return null;
    var out = [ui.section('Final board', [ui.picture(goSvg(d.grid, d.n || d.grid.length, d.last), { frame: 'wood' }),
      ui.el('small', { class: 'hv-note', text: d.tot ? 'Small squares show whose territory each empty point is. Faded stones were dead and came off at the end.' : 'The game ended by resignation.' })])];
    var bn = 'Black', wn = 'White';
    (e.players || []).forEach(function (p, i) { if (/\(Black\)$/.test(p.name)) bn = plainName(e, i); else if (/\(White\)$/.test(p.name)) wn = plainName(e, i); });
    if (d.tot) {
      var rows = [], area = d.rule === 'area';
      if (area) rows.push(['Stones on board', d.st[0], d.st[1]]);
      rows.push(['Territory', d.te[0], d.te[1]]);
      if (!area) rows.push(['Prisoners', d.pr[0], d.pr[1]]);
      rows.push(['Komi', '', d.komi]);
      if (d.hc) rows.push(['Handicap bonus', '', d.hc]);
      out.push(ui.section(area ? 'Score (area scoring)' : 'Score (territory scoring)', ui.table(['', bn, wn], rows, { foot: ['Total', d.tot[0], d.tot[1]] })));
    }
    out.push(ui.stats([['Captured by ' + bn, d.caps ? d.caps[0] : null], ['Captured by ' + wn, d.caps ? d.caps[1] : null], ['Dead stones', d.dd ? d.dd[0] + d.dd[1] : null],
      ['Ko captures', d.kos || null], ['Handicap', d.hcap >= 2 ? d.hcap + ' stones' : null]]));
    return ui.wrap(out);
  });

  // ── Backgammon: where the checkers ended, the cube, and how each game was won ──
  function bgSvg(d) {
    var W = 360, H = 250, fw = 10, bar = 24, tray = 26, iw = W - 2 * fw - bar - tray, pw = iw / 12, th = 96, cr = Math.min(pw * 0.46, 12.5);
    var top = fw, bot = H - fw, s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Backgammon board"><defs>' +
      '<radialGradient id="bgw" cx=".35" cy=".28" r=".8"><stop offset="0" stop-color="#ffffff"/><stop offset=".45" stop-color="#f3ead8"/><stop offset="1" stop-color="#b8a684"/></radialGradient>' +
      '<radialGradient id="bgb" cx=".35" cy=".28" r=".8"><stop offset="0" stop-color="#6f6a66"/><stop offset=".45" stop-color="#3a3532"/><stop offset="1" stop-color="#0c0a09"/></radialGradient></defs>';
    s += '<rect width="' + W + '" height="' + H + '" rx="8" fill="#6e3f1c"/>';
    s += '<rect x="' + fw + '" y="' + fw + '" width="' + (W - 2 * fw - tray) + '" height="' + (H - 2 * fw) + '" fill="#145c3d"/>';
    var bx = fw + pw * 6; s += '<rect x="' + bx + '" y="0" width="' + bar + '" height="' + H + '" fill="#7a4720"/>';
    var tx = W - fw - tray + 4; s += '<rect x="' + tx + '" y="' + fw + '" width="' + (tray - 6) + '" height="' + (H - 2 * fw) + '" rx="3" fill="#2a170a"/>';
    function px(col) { return fw + col * pw + (col >= 6 ? bar : 0); } // col 0..11 left to right
    // point index i (0..23): bottom row right→left is 0..11, top row left→right is 12..23
    function geo(i) { return i < 12 ? { col: 11 - i, up: false } : { col: i - 12, up: true }; }
    for (var i = 0; i < 24; i++) {
      var g = geo(i), x = px(g.col), fill = (i % 2) ? '#a3302a' : '#e9dcbc';
      s += g.up ? '<path d="M' + x + ' ' + top + 'L' + (x + pw) + ' ' + top + 'L' + (x + pw / 2) + ' ' + (top + th) + 'Z" fill="' + fill + '"/>'
        : '<path d="M' + x + ' ' + bot + 'L' + (x + pw) + ' ' + bot + 'L' + (x + pw / 2) + ' ' + (bot - th) + 'Z" fill="' + fill + '"/>';
      // point numbers from White's side
      s += '<text x="' + (x + pw / 2) + '" y="' + (g.up ? top + th + 9 : bot - th - 4) + '" text-anchor="middle" font-size="7.5" fill="rgba(255,255,255,.4)" font-family="system-ui">' + (i + 1) + '</text>';
      var v = (d.p || [])[i] || 0, n = Math.abs(v); if (!n) continue;
      var col = v > 0 ? 'w' : 'b', show = Math.min(n, 5);
      for (var k = 0; k < show; k++) {
        var cy = g.up ? top + cr + k * cr * 1.9 : bot - cr - k * cr * 1.9;
        s += '<circle cx="' + (x + pw / 2) + '" cy="' + cy + '" r="' + cr + '" fill="url(#bg' + col + ')" stroke="rgba(0,0,0,.45)" stroke-width=".8"/>';
        if (k === show - 1 && n > 5) s += '<text x="' + (x + pw / 2) + '" y="' + cy + '" text-anchor="middle" dominant-baseline="central" font-size="11" font-weight="900" fill="' + (col === 'w' ? '#5b4a35' : '#f1e6d2') + '" font-family="system-ui">' + n + '</text>';
      }
    }
    // bar checkers
    var barC = d.bar || [0, 0];
    [0, 1].forEach(function (pl) { for (var k = 0; k < Math.min(barC[pl], 4); k++) s += '<circle cx="' + (bx + bar / 2) + '" cy="' + (pl === 0 ? H / 2 + 16 + k * 14 : H / 2 - 16 - k * 14) + '" r="' + Math.min(cr, 10) + '" fill="url(#bg' + (pl ? 'b' : 'w') + ')" stroke="rgba(0,0,0,.45)"/>'; });
    // borne off: White's tray at the bottom, Black's at the top
    var off = d.off || [0, 0];
    for (var a = 0; a < off[0]; a++) s += '<rect x="' + (tx + 2) + '" y="' + (bot - 6 - a * 5.6) + '" width="' + (tray - 10) + '" height="4.6" rx="1.5" fill="#efe4cc"/>';
    for (a = 0; a < off[1]; a++) s += '<rect x="' + (tx + 2) + '" y="' + (top + 2 + a * 5.6) + '" width="' + (tray - 10) + '" height="4.6" rx="1.5" fill="#2a2522" stroke="rgba(255,255,255,.18)" stroke-width=".6"/>';
    // the cube: middle if nobody owns it, else on its owner's side
    if (d.cubeOn !== false) {
      var cs = 20, cy2 = d.own === 0 ? H - fw - 30 - cs : d.own === 1 ? fw + 30 : H / 2 - cs / 2, cx2 = d.own === -1 || d.own == null ? bx + bar / 2 - cs / 2 : bx + bar / 2 - cs / 2;
      s += '<rect x="' + cx2 + '" y="' + cy2 + '" width="' + cs + '" height="' + cs + '" rx="4" fill="#fbf6e6" stroke="rgba(0,0,0,.35)"/><text x="' + (cx2 + cs / 2) + '" y="' + (cy2 + cs / 2) + '" text-anchor="middle" dominant-baseline="central" font-size="11" font-weight="900" fill="#3a2a14" font-family="system-ui">' + (d.cube > 1 ? d.cube : 64) + '</text>';
    }
    return s + '</svg>';
  }
  R('backgammon', function (e, ui) {
    var d = e.dt; if (!d || !d.p) return null;
    var nm = [plainName(e, 0), plainName(e, 1)], out = [];
    out.push(ui.section('Final position', [ui.picture(bgSvg(d), { frame: 'wood', max: 380 }),
      ui.chips([{ t: 'White: ' + nm[0], c: '#e9e4d8' }, { t: 'Black: ' + nm[1], c: '#9a9aa6' }])]));
    var HOW = { single: 'a single game', gammon: 'a gammon', backgammon: 'a backgammon', drop: 'a dropped double' };
    var g = d.g || [];
    if (g.length) out.push(ui.section(g.length > 1 ? 'Each game' : 'How it ended', ui.log(g.map(function (x, i) {
      return { c: x.w, b: (g.length > 1 ? 'Game ' + (i + 1) + ': ' : ''), t: nm[x.w] + ' won ' + (HOW[x.h] || 'the game') + ', ' + x.pts + (x.pts === 1 ? ' point' : ' points') + (x.c > 1 ? ' (cube at ' + x.c + ')' : '') + (x.h !== 'drop' && x.pl ? ' · ' + nm[1 - x.w] + ' had ' + x.pl + ' pips left' : '') };
    }))));
    var off = d.off || [0, 0];
    out.push(ui.table(['', nm[0], nm[1]], [['Borne off', off[0] + ' / 15', off[1] + ' / 15'], ['Pips left', d.pips ? d.pips[0] : null, d.pips ? d.pips[1] : null],
      ['Checkers hit', d.hits ? d.hits[0] : null, d.hits ? d.hits[1] : null], ['Doubles rolled', d.dbl ? d.dbl[0] : null, d.dbl ? d.dbl[1] : null]]));
    if (d.cubeOn !== false) out.push(ui.stats([['Final cube', d.cube || 1], ['Highest cube', d.max || 1], ['Match to', d.to > 1 ? d.to : null]]));
    return ui.wrap(out);
  });

  // ── Battleship: both oceans side by side ──
  var BS_SIZE = [5, 4, 3, 3, 2], BS_NAME = ['Carrier', 'Battleship', 'Cruiser', 'Submarine', 'Destroyer'];
  function bsSvg(fleet, shots, sunk) {
    var cs = 17, pad = 14, W = pad + cs * 10 + 3, s = '<svg viewBox="0 0 ' + W + ' ' + W + '" role="img" aria-label="Ocean grid">';
    s += '<rect width="' + W + '" height="' + W + '" rx="6" fill="#0d3b66"/><rect x="' + pad + '" y="' + pad + '" width="' + cs * 10 + '" height="' + cs * 10 + '" fill="#1565a8"/>';
    for (var k = 0; k <= 10; k++) s += '<line x1="' + (pad + k * cs) + '" x2="' + (pad + k * cs) + '" y1="' + pad + '" y2="' + (pad + 10 * cs) + '" stroke="rgba(255,255,255,.14)"/><line y1="' + (pad + k * cs) + '" y2="' + (pad + k * cs) + '" x1="' + pad + '" x2="' + (pad + 10 * cs) + '" stroke="rgba(255,255,255,.14)"/>';
    for (k = 0; k < 10; k++) {
      s += '<text x="' + (pad + k * cs + cs / 2) + '" y="9" text-anchor="middle" font-size="7.5" fill="rgba(255,255,255,.5)" font-family="system-ui">' + (k + 1) + '</text>';
      s += '<text x="6" y="' + (pad + k * cs + cs / 2) + '" dominant-baseline="central" text-anchor="middle" font-size="7.5" fill="rgba(255,255,255,.5)" font-family="system-ui">' + 'ABCDEFGHIJ'.charAt(k) + '</text>';
    }
    (fleet || []).forEach(function (sh, i) {
      if (!sh) return; var L = BS_SIZE[i], w = sh.h ? L * cs : cs, h = sh.h ? cs : L * cs, dn = sunk.charAt(i) === '1';
      s += '<rect x="' + (pad + sh.c * cs + 1.5) + '" y="' + (pad + sh.r * cs + 1.5) + '" width="' + (w - 3) + '" height="' + (h - 3) + '" rx="' + (cs * 0.45) + '" fill="' + (dn ? '#4a4f55' : '#a7b0b9') + '" stroke="' + (dn ? '#2a2e33' : '#5f676f') + '" stroke-width="1.2"/>';
    });
    for (var x = 0; x < 100; x++) {
      var ch = shots.charAt(x); if (ch !== 'h' && ch !== 'm') continue;
      var cx = pad + (x % 10) * cs + cs / 2, cy = pad + Math.floor(x / 10) * cs + cs / 2;
      s += ch === 'h' ? '<circle cx="' + cx + '" cy="' + cy + '" r="4.2" fill="#e8343f" stroke="#7d0f16" stroke-width="1"/>' : '<circle cx="' + cx + '" cy="' + cy + '" r="2.8" fill="#f2f5f8" stroke="rgba(0,0,0,.3)" stroke-width=".6"/>';
    }
    return s + '</svg>';
  }
  R('battleship', function (e, ui) {
    var d = e.dt; if (!d || !d.at0) return null;
    var nm = [plainName(e, 0), plainName(e, 1)], out = [];
    var grids = ui.el('div', { class: 'hv-two' }, [0, 1].map(function (p) {
      var sk = String(d['sk' + p] || ''), n = sk.split('').filter(function (c) { return c === '1'; }).length;
      return ui.el('div', { class: 'hv-two-c' }, [ui.el('b', { text: nm[p] + "'s fleet" }), ui.picture(bsSvg(d['f' + p], String(d['at' + p]), sk), {}), ui.el('small', { text: n === 5 ? 'All 5 sunk' : (5 - n) + ' of 5 afloat' })]);
    }));
    out.push(ui.section('Both oceans', [grids, ui.el('small', { class: 'hv-note', text: 'Red pegs are hits, white pegs are misses. Dark ships were sunk.' })]));
    var st = d.st || [];
    if (st.length === 2) out.push(ui.table(['', nm[0], nm[1]], [['Shots', st[0].s, st[1].s], ['Hits', st[0].h, st[1].h],
      ['Accuracy', st[0].s ? Math.round(st[0].h / st[0].s * 100) + '%' : '–', st[1].s ? Math.round(st[1].h / st[1].s * 100) + '%' : '–'], ['Best hit streak', st[0].b, st[1].b]]));
    if (d.order && d.order.length) out.push(ui.section('Ships sunk, in order', ui.log(d.order.map(function (x) { return { c: x.p, t: nm[x.p] + ' sank ' + Kit.poss(nm[1 - x.p]) + ' ' + BS_NAME[x.k] }; }))));
    return ui.wrap(out);
  });

  // ── Dots & Boxes: the finished grid, every box in its owner's colour, with a replay ──
  var DB_INK = ['#2457c5', '#d1352b', '#1f8a4c', '#7b3fb8'], DB_TINT = ['rgba(36,87,197,.2)', 'rgba(209,53,43,.2)', 'rgba(31,138,76,.2)', 'rgba(123,63,184,.2)'];
  function dbSvg(n, h, v, box, inis, last) {
    var u = Math.min(56, Math.floor(300 / n)), pad = 12, W = pad * 2 + n * u, s = '<svg viewBox="0 0 ' + W + ' ' + W + '" role="img" aria-label="Dots and boxes grid">';
    s += '<rect width="' + W + '" height="' + W + '" fill="#fbf8ee"/>';
    for (var gx = pad % 10; gx < W; gx += 10) s += '<line x1="' + gx + '" x2="' + gx + '" y1="0" y2="' + W + '" stroke="rgba(80,140,200,.12)"/><line y1="' + gx + '" y2="' + gx + '" x1="0" x2="' + W + '" stroke="rgba(80,140,200,.12)"/>';
    for (var i = 0; i < n * n; i++) {
      var o = +box.charAt(i); if (!o) continue;
      var x = pad + (i % n) * u, y = pad + Math.floor(i / n) * u;
      s += '<rect x="' + x + '" y="' + y + '" width="' + u + '" height="' + u + '" fill="' + DB_TINT[o - 1] + '"/><text x="' + (x + u / 2) + '" y="' + (y + u / 2) + '" text-anchor="middle" dominant-baseline="central" font-size="' + (u * 0.42) + '" font-weight="800" fill="' + DB_INK[o - 1] + '" font-family="Marker Felt,Comic Sans MS,ui-rounded,system-ui">' + inis[o - 1] + '</text>';
    }
    function line(x1, y1, x2, y2, o, hot) { return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="' + DB_INK[o - 1] + '" stroke-width="' + (hot ? 5 : 3.6) + '" stroke-linecap="round"' + (hot ? ' opacity="1"' : ' opacity=".9"') + '/>'; }
    for (i = 0; i < (n + 1) * n; i++) { var o2 = +h.charAt(i); if (o2) { var r = Math.floor(i / n), c = i % n; s += line(pad + c * u, pad + r * u, pad + (c + 1) * u, pad + r * u, o2, last === 'h' + i); } }
    for (i = 0; i < n * (n + 1); i++) { var o3 = +v.charAt(i); if (o3) { var r2 = Math.floor(i / (n + 1)), c2 = i % (n + 1); s += line(pad + c2 * u, pad + r2 * u, pad + c2 * u, pad + (r2 + 1) * u, o3, last === 'v' + i); } }
    for (var rr = 0; rr <= n; rr++) for (var cc = 0; cc <= n; cc++) s += '<circle cx="' + (pad + cc * u) + '" cy="' + (pad + rr * u) + '" r="3.4" fill="#2b2620"/>';
    return s + '</svg>';
  }
  R('dotsboxes', function (e, ui) {
    var d = e.dt; if (!d || !d.box) return null;
    var n = d.n, P = e.players || [], H = (n + 1) * n;
    var inis = P.map(function (p, i) { var c = String(p.name || '?').charAt(0).toUpperCase(); return P.some(function (q, j) { return j !== i && String(q.name || '').charAt(0).toUpperCase() === c; }) ? c + (i + 1) : c; });
    var snap = ui.el('div', null, [ui.picture(dbSvg(n, d.h, d.v, d.box, inis), { frame: 'paper' })]), out = [ui.section('Final grid', snap)];
    var mv = String(d.mv || ''), N = mv.length / 2;
    if (N > 1) {
      // replay: the line owners come from the final grid; boxes fill in as their fourth side is drawn
      var steps = []; for (var k = 0; k < N; k++) steps.push(parseInt(mv.substr(k * 2, 2), 36));
      out.push(ui.section('Replay', slider(ui, N, function (m) {
        var hh = [], vv = [], bb = [], i, got = 0, by = 0;
        for (i = 0; i < H; i++) hh.push('0'); for (i = 0; i < n * (n + 1); i++) vv.push('0'); for (i = 0; i < n * n; i++) bb.push('0');
        for (i = 0; i < m; i++) { var x = steps[i]; if (x < H) hh[x] = d.h.charAt(x); else vv[x - H] = d.v.charAt(x - H); }
        function has(t, j) { return (t === 'h' ? hh[j] : vv[j]) !== '0'; }
        for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) if (has('h', r * n + c) && has('h', (r + 1) * n + c) && has('v', r * (n + 1) + c) && has('v', r * (n + 1) + c + 1)) bb[r * n + c] = d.box.charAt(r * n + c);
        var lx = m ? steps[m - 1] : -1, last = lx < 0 ? '' : lx < H ? 'h' + lx : 'v' + (lx - H);
        if (lx >= 0) by = +(lx < H ? d.h.charAt(lx) : d.v.charAt(lx - H));
        bb.forEach(function (x) { if (x !== '0') got++; });
        snap.innerHTML = ''; snap.appendChild(ui.picture(dbSvg(n, hh.join(''), vv.join(''), m === N ? d.box : bb.join(''), inis, last), { frame: 'paper' }));
        return m === 0 ? 'Empty grid' : 'Line ' + m + ' of ' + N + (by && P[by - 1] ? ' · ' + P[by - 1].name : '') + ' · ' + got + ' of ' + n * n + ' boxes closed';
      })));
    }
    if (d.best) out.push(ui.table([''].concat(P.map(function (p) { return p.name; })), [['Boxes', ].concat(P.map(function (p, i) { return d.box.split('').filter(function (x) { return +x === i + 1; }).length; })),
      ['Lines drawn'].concat(P.map(function (p, i) { return (d.h + d.v).split('').filter(function (x) { return +x === i + 1; }).length; })),
      ['Longest run'].concat(d.best)], { headColors: [null].concat(P.map(function (p, i) { return DB_INK[i]; })) }));
    return ui.wrap(out);
  });

  // ── Mancala: the pits when the game ended, then the race between the stores ──
  var MC_GLASS = ['#3d8bff', '#2fc56b', '#ffad33', '#ff4d6d', '#a479ff', '#35d0d0', '#f2f2f2'];
  function mcSvg(b, cols) {
    var W = 360, H = 150, sw = 40, pw = (W - 20 - 2 * sw - 24) / 6, s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Mancala board">';
    s += '<defs><radialGradient id="mcp" cx=".5" cy=".4" r=".7"><stop offset="0" stop-color="#3b220e"/><stop offset="1" stop-color="#5e3a1a"/></radialGradient></defs>';
    s += '<rect width="' + W + '" height="' + H + '" rx="22" fill="#9a6431"/><rect x="3" y="3" width="' + (W - 6) + '" height="' + (H - 6) + '" rx="20" fill="none" stroke="rgba(255,230,180,.18)" stroke-width="2"/>';
    var seed = 7; function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
    function stones(cx, cy, rx, ry, n) {
      var t = '', show = Math.min(n, 14);
      for (var k = 0; k < show; k++) { var a = rnd() * 6.283, rr = Math.sqrt(rnd()); t += '<circle cx="' + (cx + Math.cos(a) * rr * rx).toFixed(1) + '" cy="' + (cy + Math.sin(a) * rr * ry).toFixed(1) + '" r="4" fill="' + MC_GLASS[Math.floor(rnd() * 7)] + '" opacity=".92"/>'; }
      return t;
    }
    function count(cx, y, n, c) { return '<text x="' + cx + '" y="' + y + '" text-anchor="middle" font-size="13" font-weight="900" fill="' + (c || '#ffe9c4') + '" font-family="system-ui">' + n + '</text>'; }
    // player 1's store on the left, player 0's on the right; player 0's pits along the bottom, left to right
    [[13, 10], [6, W - 10 - sw]].forEach(function (q, j) {
      var x = q[1], n = b[q[0]];
      s += '<rect x="' + x + '" y="22" width="' + sw + '" height="' + (H - 44) + '" rx="' + sw / 2 + '" fill="url(#mcp)"/>' + stones(x + sw / 2, H / 2, sw * 0.28, H * 0.26, n) +
        '<rect x="' + (x + 4) + '" y="' + (H / 2 - 11) + '" width="' + (sw - 8) + '" height="22" rx="7" fill="rgba(0,0,0,.55)"/>' + count(x + sw / 2, H / 2 + 5, n, '#fff');
    });
    for (var i = 0; i < 6; i++) {
      var xb = 10 + sw + 12 + i * pw + pw / 2, xt = 10 + sw + 12 + (5 - i) * pw + pw / 2, r = Math.min(pw * 0.42, 22);
      [[i, xb, H - 42], [i + 7, xt, 42]].forEach(function (q) {
        s += '<circle cx="' + q[1] + '" cy="' + q[2] + '" r="' + r + '" fill="url(#mcp)"/>' + stones(q[1], q[2], r * 0.55, r * 0.55, b[q[0]]);
        s += count(q[1], q[2] + (q[2] > H / 2 ? r + 14 : -r - 5) , b[q[0]]);
      });
    }
    return s + '</svg>';
  }
  R('mancala', function (e, ui) {
    var d = e.dt; if (!d || !d.b) return null;
    var nm = [plainName(e, 0), plainName(e, 1)], cols = (d.col || []).map(function (c, i) { return c || Kit.color(i); }), out = [];
    var left = [0, 0]; for (var i = 0; i < 6; i++) { left[0] += d.b[i]; left[1] += d.b[i + 7]; }
    out.push(ui.section('When the game ended', [ui.picture(mcSvg(d.b, cols), { frame: 'wood', max: 380 }),
      ui.el('small', { class: 'hv-note', text: 'Bottom row and right store: ' + nm[0] + '. Top row and left store: ' + nm[1] + '.' + (d.sw && d.sw.n ? ' ' + nm[d.sw.w] + ' then swept the last ' + d.sw.n + ' stone' + (d.sw.n === 1 ? '' : 's') + ' into their store.' : '') })]));
    if (d.t0 && d.t0.length > 1) {
      var tot = d.per * 12 || 48, fin = (e.players || []).map(function (p) { return typeof p.score === 'number' ? p.score : null; });
      out.push(ui.section('Stores over the game', [ui.picture(spark([{ v: [0].concat(d.t0, fin[0] != null ? [fin[0]] : []), c: cols[0] }, { v: [0].concat(d.t1, fin[1] != null ? [fin[1]] : []), c: cols[1] }], { lo: 0, hi: Math.max(tot / 2 + 4, Math.max.apply(null, d.t0.concat(d.t1, fin.filter(function (x) { return x != null; })))), mid: tot / 2, aria: 'Stores over the game' }), { frame: 'dark' }),
        ui.chips([{ t: nm[0], c: cols[0], on: 1 }, { t: nm[1], c: cols[1], on: 1 }, { t: 'Dashed line: half the stones (' + tot / 2 + ')' }])]));
    }
    var caps = d.caps || [], ct = [0, 0], cs = [0, 0]; caps.forEach(function (c) { ct[c.w]++; cs[c.w] += c.n; });
    out.push(ui.table(['', nm[0], nm[1]], [['Captures', ct[0], ct[1]], ['Stones captured', cs[0], cs[1]], ['Extra turns', d.ex ? d.ex[0] : null, d.ex ? d.ex[1] : null], ['Left on side at end', left[0], left[1]]]));
    out.push(ui.stats([['Moves', d.mv || null], ['Stones per pit', d.per || null], ['Series', d.ser ? d.ser[0] + '–' + d.ser[1] + (d.ser[2] ? ' (' + d.ser[2] + ' tied)' : '') : null]]));
    return ui.wrap(out);
  });

  // ── Mahjong (4 players): every hand, with the winning tiles ──
  var MJ = (function () {
    var NUM_CH = ['一', '二', '三', '四', '五', '六', '七', '八', '九'], WIND_CH = ['東', '南', '西', '北'];
    var B = '#1d4fa5', G = '#12804a', Rd = '#c8282b', INK = '#1b2552', cache = {};
    function dot(x, y, r, c) { return '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="' + c + '"/><circle cx="' + x + '" cy="' + y + '" r="' + (r * .66) + '" fill="#fffdf4"/><circle cx="' + x + '" cy="' + y + '" r="' + (r * .46) + '" fill="' + c + '"/>'; }
    function stick(x, y, h, c, w) { w = w || 4; return '<rect x="' + (x - w / 2) + '" y="' + (y - h / 2) + '" width="' + w + '" height="' + h + '" rx="' + (w / 2) + '" fill="' + c + '"/><rect x="' + (x - w / 2 - .4) + '" y="' + (y - .7) + '" width="' + (w + .8) + '" height="1.4" rx=".7" fill="' + c + '" stroke="#fffdf4" stroke-width=".5"/>'; }
    var DOTS = { 2: [[15, 10.5, 6, G], [15, 29.5, 6, B]], 3: [[7.5, 8, 5.2, B], [15, 20, 5.2, Rd], [22.5, 32, 5.2, G]], 4: [[8.5, 10.5, 5.6, B], [21.5, 10.5, 5.6, G], [8.5, 29.5, 5.6, G], [21.5, 29.5, 5.6, B]],
      5: [[8, 8.5, 5, B], [22, 8.5, 5, G], [15, 20, 5, Rd], [8, 31.5, 5, G], [22, 31.5, 5, B]], 6: [[9, 7.5, 4.6, G], [21, 7.5, 4.6, G], [9, 20, 4.6, Rd], [21, 20, 4.6, Rd], [9, 32.5, 4.6, Rd], [21, 32.5, 4.6, Rd]],
      7: [[6.5, 6, 3.9, G], [15, 10, 3.9, G], [23.5, 14, 3.9, G], [9, 24, 4.1, Rd], [21, 24, 4.1, Rd], [9, 33.5, 4.1, Rd], [21, 33.5, 4.1, Rd]],
      8: [[9, 5.5, 3.9, B], [21, 5.5, 3.9, B], [9, 15.2, 3.9, B], [21, 15.2, 3.9, B], [9, 24.8, 3.9, B], [21, 24.8, 3.9, B], [9, 34.5, 3.9, B], [21, 34.5, 3.9, B]],
      9: [[7, 7, 4, B], [15, 7, 4, B], [23, 7, 4, B], [7, 20, 4, Rd], [15, 20, 4, Rd], [23, 20, 4, Rd], [7, 33, 4, G], [15, 33, 4, G], [23, 33, 4, G]] };
    var BAMS = { 2: [[15, 11, 15, G], [15, 29, 15, B]], 3: [[15, 11, 15, G], [9, 29, 15, B], [21, 29, 15, B]], 4: [[9, 11, 15, G], [21, 11, 15, B], [9, 29, 15, B], [21, 29, 15, G]],
      5: [[7, 11, 15, G], [23, 11, 15, B], [15, 20, 15, Rd], [7, 29, 15, B], [23, 29, 15, G]], 6: [[7, 11, 15, G], [15, 11, 15, G], [23, 11, 15, G], [7, 29, 15, B], [15, 29, 15, B], [23, 29, 15, B]],
      7: [[15, 7, 10, Rd], [7, 20, 10, G], [15, 20, 10, G], [23, 20, 10, G], [7, 33, 10, B], [15, 33, 10, B], [23, 33, 10, B]],
      8: [[5.5, 11, 15, G], [12, 11, 15, G], [18, 11, 15, G], [24.5, 11, 15, G], [5.5, 29, 15, B], [12, 29, 15, B], [18, 29, 15, B], [24.5, 29, 15, B]],
      9: [[7, 7, 10, G], [15, 7, 10, Rd], [23, 7, 10, B], [7, 20, 10, G], [15, 20, 10, Rd], [23, 20, 10, B], [7, 33, 10, G], [15, 33, 10, Rd], [23, 33, 10, B]] };
    function face(k) {
      if (cache[k]) return cache[k];
      var s = k < 9 ? 0 : k < 18 ? 1 : k < 27 ? 2 : k < 31 ? 3 : 4, n = k % 9 + 1, b = '';
      var font = 'font-family="PingFang SC,Hiragino Sans GB,Noto Sans CJK SC,Noto Serif CJK SC,WenQuanYi Zen Hei,Microsoft YaHei,serif" font-weight="700" text-anchor="middle"';
      if (s === 0) b = '<text x="15" y="17.5" font-size="15" fill="' + INK + '" ' + font + '>' + NUM_CH[n - 1] + '</text><text x="15" y="36" font-size="15" fill="' + Rd + '" ' + font + '>萬</text><text x="2.6" y="7" font-size="7" fill="' + INK + '" font-family="system-ui,sans-serif" font-weight="800">' + n + '</text>';
      else if (s === 1) b = n === 1 ? '<circle cx="15" cy="20" r="12" fill="' + G + '"/><circle cx="15" cy="20" r="10" fill="#fffdf4"/><circle cx="15" cy="20" r="8.6" fill="' + B + '"/><circle cx="15" cy="20" r="6.2" fill="#fffdf4"/><circle cx="15" cy="20" r="4.6" fill="' + Rd + '"/>' : DOTS[n].map(function (d) { return dot(d[0], d[1], d[2], d[3]); }).join('');
      else if (s === 2) b = n === 1 ? stick(15, 21, 28, G, 6) + '<path d="M15 9 C9 6 6 8 4 12 C9 12 12 11 15 9z" fill="' + G + '"/><path d="M15 9 C21 6 24 8 26 12 C21 12 18 11 15 9z" fill="' + G + '"/><circle cx="15" cy="7" r="2.6" fill="' + Rd + '"/>' : BAMS[n].map(function (p) { return stick(p[0], p[1], p[2], p[3], n === 8 ? 3.4 : 4); }).join('');
      else if (s === 3) b = '<text x="15" y="29" font-size="22" fill="' + INK + '" ' + font + '>' + WIND_CH[k - 27] + '</text><text x="2.6" y="7" font-size="7" fill="' + INK + '" font-family="system-ui,sans-serif" font-weight="800">' + 'ESWN'[k - 27] + '</text>';
      else b = k === 31 ? '<text x="15" y="29.5" font-size="24" fill="' + Rd + '" ' + font + '>中</text>' : k === 32 ? '<text x="15" y="29.5" font-size="23" fill="' + G + '" ' + font + '>發</text>' : '<rect x="6" y="6" width="18" height="28" rx="2" fill="none" stroke="' + B + '" stroke-width="2.2"/><rect x="9" y="9" width="12" height="22" rx="1" fill="none" stroke="' + B + '" stroke-width=".9"/>';
      return (cache[k] = '<svg viewBox="0 0 30 40" aria-hidden="true">' + b + '</svg>');
    }
    function kind(ch) { var c = ch.charCodeAt(0); return c >= 97 ? c - 71 : c - 65; }
    // 'ABC *DDDD !EF...' -> a row of tile groups
    function hand(code, el) {
      var row = el('div', { class: 'hv-mj' });
      String(code).split(' ').forEach(function (g) {
        if (!g) return; var conc = g.charAt(0) === '*', grp = el('div', { class: 'hv-mj-g' });
        g = g.replace('*', ''); var n = 0;
        for (var i = 0; i < g.length; i++) {
          var hot = g.charAt(i) === '!'; if (hot) i++;
          var k = kind(g.charAt(i)), back = conc && (n === 0 || n === 3);
          grp.appendChild(el('span', { class: 'hv-mt' + (back ? ' back' : '') + (hot ? ' hot' : ''), html: back ? '' : face(k) })); n++;
        }
        row.appendChild(grp);
      });
      return row;
    }
    return { hand: hand };
  })();
  R(['mahjong4', 'mj4'], function (e, ui) {
    var d = e.dt; if (!d || !d.hands) return null;
    var P = e.players || [], nm = P.map(function (p) { return p.name; }), out = [];
    var WIND = { E: 'East', S: 'South', W: 'West', N: 'North' };
    var list = d.hands.map(function (h) {
      var box = ui.el('div', { class: 'hv-mjh' });
      var head = h.w < 0 ? 'Draw: the wall ran out' : nm[h.w] + (h.f < 0 || h.f == null ? ' won, self-drawn' : ' won on ' + Kit.poss(nm[h.f] || '?') + ' discard');
      box.appendChild(ui.el('div', { class: 'hv-mjh-t' }, [ui.el('b', { text: (WIND[String(h.l).charAt(0)] || '') + ' ' + String(h.l).slice(1) }), ui.el('span', { text: head, style: h.w >= 0 ? { color: Kit.color(h.w) } : null }),
        h.w >= 0 ? ui.el('i', { text: h.fa + ' faan · ' + h.pt + ' pts' }) : null]));
      if (h.t) box.appendChild(MJ.hand(h.t, ui.el));
      var y = h.w >= 0 ? (h.y ? String(h.y).split('|') : ['Chicken hand']) : [];
      if (h.d >= 0 && nm[h.d]) y.push({ t: 'Dealer: ' + nm[h.d] });
      if (y.length) box.appendChild(ui.chips(y));
      return box;
    });
    out.push(ui.section('Hand by hand', list));
    // who won, who paid
    var wins = [0, 0, 0, 0], self = [0, 0, 0, 0], dealt = [0, 0, 0, 0], best = [0, 0, 0, 0];
    d.hands.forEach(function (h) { if (h.w < 0) return; wins[h.w]++; if (h.f < 0 || h.f == null) self[h.w]++; else dealt[h.f]++; best[h.w] = Math.max(best[h.w], h.fa || 0); });
    out.push(ui.table([''].concat(nm), [['Hands won'].concat(wins), ['Self-drawn'].concat(self), ['Dealt in'].concat(dealt), ['Best hand (faan)'].concat(best.map(function (x) { return x || '–'; })),
      ['Kongs'].concat(d.kongs || [0, 0, 0, 0]), ['Claims'].concat(d.claims || [0, 0, 0, 0])]));
    return ui.wrap(out);
  });

  HistView.css('hv-board2', '.hv-replay{display:flex;flex-direction:column;gap:6px;}.hv-range{width:100%;accent-color:var(--yellow);}.hv-replay b{font-size:.85rem;color:var(--text-2);}' +
    '.hv-note{font-size:.78rem;color:var(--text-3);line-height:1.35;}' +
    '.hv-two{display:grid;grid-template-columns:1fr 1fr;gap:8px;}.hv-two-c{display:flex;flex-direction:column;gap:4px;min-width:0;align-items:center;text-align:center;}.hv-two-c b{font-size:.84rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;}.hv-two-c small{font-size:.74rem;color:var(--text-3);font-weight:700;}.hv-two-c .hv-snap{padding:0;border-radius:8px;overflow:hidden;}' +
    '.hv-mjh{display:flex;flex-direction:column;gap:6px;padding:10px;border-radius:12px;background:radial-gradient(120% 120% at 50% 0%,#1f7a4a,#0e4a2b);}.hv-mjh-t{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 8px;font-size:.86rem;}.hv-mjh-t span{font-weight:800;}.hv-mjh-t i{font-style:normal;color:rgba(255,255,255,.7);font-size:.8rem;margin-left:auto;}.hv-mjh .hv-chip{background:rgba(0,0,0,.25);}' +
    '.hv-mj{display:flex;flex-wrap:wrap;gap:5px;}.hv-mj-g{display:flex;gap:1px;}.hv-mt{position:relative;width:21px;height:28px;border-radius:3px;background:linear-gradient(165deg,#fffef8,#f7f0de 55%,#ebe1c6);box-shadow:inset 0 0 0 1px rgba(120,95,50,.25),0 2px 0 #1f5ea8,0 3px 2px rgba(0,0,0,.35);}.hv-mt svg{position:absolute;inset:5% 7%;width:86%;height:90%;overflow:visible;}.hv-mt.back{background:linear-gradient(160deg,#2d7bd0,#1f5ea8);box-shadow:0 2px 0 #e9dfc4,0 3px 2px rgba(0,0,0,.35);}.hv-mt.hot{box-shadow:inset 0 0 0 1px rgba(120,95,50,.25),0 0 0 2px #ffd84a,0 0 8px rgba(255,216,74,.7);}');
})();
