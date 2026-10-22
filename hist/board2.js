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
  function f2(v) { return Math.round(v * 100) / 100; }
  function possLow(n) { return n === 'You' ? 'your' : Kit.poss(n); }
  function plainName(e, i) { var p = (e.players || [])[i]; return p ? String(p.name).replace(/ \((Black|White)\)$/, '') : ''; }
  // A replay slider under a picture: show(n) redraws for step n (0..max)
  function slider(ui, max, show, o) {
    if (HistView.boardUI) return HistView.boardUI.replay(ui, max, show, o);
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
  // the game move by move: [{b: board array (0/1 black/2 white), c, i, caps, pass}], or null if it doesn't add up
  function goHandicap(n, h) {
    var a = n <= 9 ? 2 : 3, z = n - 1 - a, m = (n - 1) / 2, TR = [a, z], BL = [z, a], BR = [z, z], TL = [a, a], C = [m, m], L = [m, a], Rr = [m, z], T = [a, m], Bt = [z, m];
    var P = { 2: [TR, BL], 3: [TR, BL, BR], 4: [TR, BL, BR, TL], 5: [TR, BL, BR, TL, C], 6: [TR, BL, BR, TL, L, Rr], 7: [TR, BL, BR, TL, L, Rr, C], 8: [TR, BL, BR, TL, L, Rr, T, Bt], 9: [TR, BL, BR, TL, L, Rr, T, Bt, C] }[h] || [];
    return P.map(function (rc) { return rc[0] * n + rc[1]; });
  }
  function goReplay(d) {
    var n = d.n, ml = String(d.ml || ''), b = [], L = 'abcdefghijklmnopqrs', out = [];
    for (var i = 0; i < n * n; i++) b.push(0);
    var hc = d.hcap >= 2 ? goHandicap(n, d.hcap) : [];
    hc.forEach(function (x) { b[x] = 1; });
    out.push({ b: b.slice() });
    function nbs(x) { var r = (x / n) | 0, c = x % n, o = []; if (r) o.push(x - n); if (r < n - 1) o.push(x + n); if (c) o.push(x - 1); if (c < n - 1) o.push(x + 1); return o; }
    function group(x) { var col = b[x], seen = {}, st = [x], g = [], libs = 0; seen[x] = 1; while (st.length) { var y = st.pop(); g.push(y); nbs(y).forEach(function (z) { if (seen[z]) return; if (!b[z]) { seen[z] = 1; libs++; } else if (b[z] === col) { seen[z] = 1; st.push(z); } }); } return { g: g, libs: libs }; }
    var c = hc.length ? 2 : 1;
    for (var k = 0; k + 1 < ml.length; k += 2) {
      if (ml.charAt(k) === '.') { out.push({ b: b.slice(), c: c, pass: true }); c = 3 - c; continue; }
      var x = L.indexOf(ml.charAt(k)) * n + L.indexOf(ml.charAt(k + 1));
      if (x < 0 || b[x]) return null;
      b[x] = c; var caps = 0;
      nbs(x).forEach(function (z) { if (b[z] === 3 - c) { var G = group(z); if (!G.libs) { G.g.forEach(function (y) { b[y] = 0; }); caps += G.g.length; } } });
      out.push({ b: b.slice(), c: c, i: x, caps: caps }); c = 3 - c;
    }
    return out;
  }
  R('go', function (e, ui) {
    var d = e.dt; if (!d || !d.grid) return null;
    var B = HistView.boardUI, n = d.n || d.grid.length, out = [];
    var bn = 'Black', wn = 'White';
    (e.players || []).forEach(function (p, i) { if (/\(Black\)$/.test(p.name)) bn = plainName(e, i); else if (/\(White\)$/.test(p.name)) wn = plainName(e, i); });
    var steps = d.ml ? goReplay(d) : null;
    if (steps) {
      // the replay's last position has to be the recorded one (dead stones still on the board, territory left out)
      var lb = steps[steps.length - 1].b, ok = true;
      for (var r = 0; r < n && ok; r++) for (var c = 0; c < n; c++) { var ch = d.grid[r].charAt(c), v = /[bB]/.test(ch) ? 1 : /[wW]/.test(ch) ? 2 : 0; if (v !== lb[r * n + c]) { ok = false; break; } }
      if (!ok) steps = null;
    }
    var resign = !d.tot, margin = d.tot ? Math.abs(d.tot[0] - d.tot[1]) : 0, bw = d.tot ? d.tot[0] > d.tot[1] : null;
    out.push(ui.stats([['Result', resign ? 'Resigned' : (bw ? 'B' : 'W') + '+' + margin, resign ? '' : (bw ? bn : wn) + ' won'], ['Moves', steps ? steps.length - 1 : null, n + '×' + n + (d.hcap >= 2 ? ' · ' + d.hcap + ' handicap' : '')],
      ['Biggest capture', d.big ? d.big.n : null, d.big ? (d.big.c === 'b' ? bn : wn) + ' · move ' + d.big.mv : '']]));
    var snap = ui.picture(goSvg(d.grid, n, d.last), { frame: 'wood' });
    out.push(ui.section('Final board', [snap, ui.el('small', { class: 'hv-note', text: d.tot ? 'Small squares show whose territory each empty point is. Faded stones were dead and came off at the end.' : 'The game ended by resignation.' })]));
    if (steps && steps.length > 2) {
      var N = steps.length - 1, sb = [], sw = [];
      steps.forEach(function (s) { var a = 0, w = 0; s.b.forEach(function (v) { if (v === 1) a++; else if (v === 2) w++; }); sb.push(a); sw.push(w); });
      var chart = B.chart(ui, [{ v: sw, c: '#f4f1e8' }, { v: sb, c: '#55505a', w: 3, halo: 'rgba(255,255,255,.7)' }], { lo: 0, from: 'Move 1', to: 'Move ' + N, aria: 'Stones on the board, move by move' });
      var rowsOf = function (b) { var rs = []; for (var r = 0; r < n; r++) { var s = ''; for (var c = 0; c < n; c++) { var v = b[r * n + c]; s += v === 1 ? 'b' : v === 2 ? 'w' : '.'; } rs.push(s); } return rs; };
      var cName = function (i) { return 'ABCDEFGHJKLMNOPQRST'.charAt(i % n) + (n - ((i / n) | 0)); };
      out.push(ui.section('Replay', B.replay(ui, N, function (k) {
        var s = steps[k];
        snap.innerHTML = goSvg(k === N ? d.grid : rowsOf(s.b), n, s.i != null ? s.i : -1);
        chart.at(k);
        if (!k) return d.hcap >= 2 ? d.hcap + ' handicap stones for Black; White to move' : 'An empty board; Black to move';
        var who = s.c === 1 ? bn + ' (Black)' : wn + ' (White)';
        return (k === N ? 'Final · ' : '') + 'Move ' + k + ' · ' + who + (s.pass ? ' passed' : ' at ' + cName(s.i) + (s.caps ? ', captured ' + s.caps + (s.caps === 1 ? ' stone' : ' stones') : ''));
      }, { start: N, ms: Math.max(90, Math.min(500, 24000 / N)) })));
      out.push(ui.section('Stones on the board', [chart, B.key(ui, [[bn + ' · Black', '#55505a'], [wn + ' · White', '#f4f1e8']])]));
    }
    if (d.tot) {
      var rows = [], area = d.rule === 'area';
      if (area) rows.push(['Stones on board', d.st[0], d.st[1]]);
      rows.push(['Territory', d.te[0], d.te[1]]);
      if (!area) rows.push(['Prisoners', d.pr[0], d.pr[1]]);
      rows.push(['Komi', '', d.komi]);
      if (d.hc) rows.push(['Handicap bonus', '', d.hc]);
      out.push(ui.section(area ? 'Score (area scoring)' : 'Score (territory scoring)', ui.table(['', bn, wn], rows, { foot: ['Total', d.tot[0], d.tot[1]] })));
    }
    out.push(ui.stats([['Captured by ' + bn, d.caps ? d.caps[0] : null], ['Captured by ' + wn, d.caps ? d.caps[1] : null], ['Dead stones', d.dd ? d.dd[0] + d.dd[1] : d.kos ? 0 : null, d.kos ? d.kos + ' ko ' + (d.kos === 1 ? 'capture' : 'captures') : '']]));
    // what decided it
    var why = '';
    if (d.tot) {
      var W = bw ? 0 : 1, wnm = bw ? bn : wn, held = d.rule === 'area' ? [d.st[0] + d.te[0], d.st[1] + d.te[1]] : [d.te[0], d.te[1]];
      if (!bw && d.komi && margin <= d.komi) why = 'Komi decided it: ' + wnm + ' (White) won by ' + margin + ' thanks to ' + d.komi + ' points of komi';
      else if (held[W] > held[1 - W]) why = wnm + ' held more of the board: ' + held[W] + ' points of ' + (d.rule === 'area' ? 'stones and territory' : 'territory') + ' to ' + held[1 - W];
      else if (d.rule !== 'area' && d.pr[W] > d.pr[1 - W]) why = wnm + ' won on prisoners: ' + d.pr[W] + ' to ' + d.pr[1 - W];
      else why = wnm + ' won by ' + margin;
    } else {
      var winP = (e.players || []).filter(function (p) { return p.name === e.winner; })[0];
      why = (winP ? String(winP.name).replace(/ \((Black|White)\)$/, '') : 'The winner') + ' won when the other side resigned';
    }
    out.push(B.foot(ui, why, 'trophy'));
    return ui.wrap(out);
  });

  // ── Backgammon: the board, a replay of the last game turn by turn with the dice, the pip race, the cube ──
  // d = {p: + White / − Black per point (index 0 = White's 1-point), bar, off, cube, own, cubeOn}; o = {dice, side, to:[points], from:[points], hit:[points]}
  function bgSvg(d, o) {
    o = o || {};
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
    var marks = '';
    for (var i = 0; i < 24; i++) {
      var g = geo(i), x = px(g.col), fill = (i % 2) ? '#a3302a' : '#e9dcbc';
      s += g.up ? '<path d="M' + x + ' ' + top + 'L' + (x + pw) + ' ' + top + 'L' + (x + pw / 2) + ' ' + (top + th) + 'Z" fill="' + fill + '"/>'
        : '<path d="M' + x + ' ' + bot + 'L' + (x + pw) + ' ' + bot + 'L' + (x + pw / 2) + ' ' + (bot - th) + 'Z" fill="' + fill + '"/>';
      // point numbers from White's side
      s += '<text x="' + (x + pw / 2) + '" y="' + (g.up ? top + th + 9 : bot - th - 4) + '" text-anchor="middle" font-size="7.5" fill="rgba(255,255,255,.4)" font-family="system-ui">' + (i + 1) + '</text>';
      var v = (d.p || [])[i] || 0, n = Math.abs(v), show = Math.min(n, 5), col = v > 0 ? 'w' : 'b';
      for (var k = 0; k < show; k++) {
        var cy = g.up ? top + cr + k * cr * 1.9 : bot - cr - k * cr * 1.9;
        s += '<circle cx="' + (x + pw / 2) + '" cy="' + cy + '" r="' + cr + '" fill="url(#bg' + col + ')" stroke="rgba(0,0,0,.45)" stroke-width=".8"/>';
        if (k === show - 1 && n > 5) s += '<text x="' + (x + pw / 2) + '" y="' + cy + '" text-anchor="middle" dominant-baseline="central" font-size="11" font-weight="900" fill="' + (col === 'w' ? '#5b4a35' : '#f1e6d2') + '" font-family="system-ui">' + n + '</text>';
      }
      // this turn: where checkers left (dashed) and landed (ringed), a hit in red
      var tip = function (k2) { return g.up ? top + cr + k2 * cr * 1.9 : bot - cr - k2 * cr * 1.9; };
      if (o.to && o.to.indexOf(i) >= 0 && n) marks += '<circle cx="' + (x + pw / 2) + '" cy="' + tip(show - 1) + '" r="' + (cr + 2) + '" fill="none" stroke="' + (o.hit && o.hit.indexOf(i) >= 0 ? '#ff5a4e' : '#ffd54a') + '" stroke-width="2.2"/>';
      if (o.from && o.from.indexOf(i) >= 0) marks += '<circle cx="' + (x + pw / 2) + '" cy="' + tip(n && (v > 0) === (o.side === 0) ? Math.min(show, 4) : 0) + '" r="' + (cr - 1) + '" fill="none" stroke="#ffd54a" stroke-width="1.6" stroke-dasharray="3 2.5" opacity=".9"/>';
    }
    s += marks;
    // bar checkers
    var barC = d.bar || [0, 0];
    [0, 1].forEach(function (pl) { for (var k = 0; k < Math.min(barC[pl], 4); k++) s += '<circle cx="' + (bx + bar / 2) + '" cy="' + (pl === 0 ? H / 2 + 16 + k * 14 : H / 2 - 16 - k * 14) + '" r="' + Math.min(cr, 10) + '" fill="url(#bg' + (pl ? 'b' : 'w') + ')" stroke="rgba(0,0,0,.45)"/>'; });
    // borne off: White's tray at the bottom, Black's at the top
    var off = d.off || [0, 0];
    for (var a = 0; a < off[0]; a++) s += '<rect x="' + (tx + 2) + '" y="' + (bot - 6 - a * 5.6) + '" width="' + (tray - 10) + '" height="4.6" rx="1.5" fill="#efe4cc"/>';
    for (a = 0; a < off[1]; a++) s += '<rect x="' + (tx + 2) + '" y="' + (top + 2 + a * 5.6) + '" width="' + (tray - 10) + '" height="4.6" rx="1.5" fill="#2a2522" stroke="rgba(255,255,255,.18)" stroke-width=".6"/>';
    // the cube: middle if nobody owns it, else on its owner's side
    if (d.cubeOn !== false) {
      var cs = 20, cy2 = d.own === 0 ? H - fw - 30 - cs : d.own === 1 ? fw + 30 : H / 2 - cs / 2, cx2 = bx + bar / 2 - cs / 2;
      s += '<rect x="' + cx2 + '" y="' + cy2 + '" width="' + cs + '" height="' + cs + '" rx="4" fill="#fbf6e6" stroke="rgba(0,0,0,.35)"/><text x="' + (cx2 + cs / 2) + '" y="' + (cy2 + cs / 2) + '" text-anchor="middle" dominant-baseline="central" font-size="11" font-weight="900" fill="#3a2a14" font-family="system-ui">' + (d.cube > 1 ? d.cube : 64) + '</text>';
    }
    // the dice, in the mover's colours on the right half
    if (o.dice) {
      // in whichever half has fewer tall stacks reaching the middle
      var tall = [0, 0]; for (var q2 = 0; q2 < 24; q2++) if (Math.abs((d.p || [])[q2] || 0) >= 4) tall[geo(q2).col >= 6 ? 1 : 0]++;
      var half = tall[1] <= tall[0] ? 6 : 0, dw = 17, dx0 = px(half) + pw * 3 - dw - 4, dy0 = H / 2 - dw / 2, P1 = { 1: [[.5, .5]], 2: [[.27, .27], [.73, .73]], 3: [[.27, .27], [.5, .5], [.73, .73]], 4: [[.27, .27], [.73, .27], [.27, .73], [.73, .73]], 5: [[.27, .27], [.73, .27], [.5, .5], [.27, .73], [.73, .73]], 6: [[.27, .25], [.73, .25], [.27, .5], [.73, .5], [.27, .75], [.73, .75]] };
      o.dice.forEach(function (v2, j) {
        var X = dx0 + j * (dw + 8), wh = o.side === 0;
        s += '<rect x="' + (X + 1) + '" y="' + (dy0 + 2) + '" width="' + dw + '" height="' + dw + '" rx="4" fill="rgba(0,0,0,.4)"/><rect x="' + X + '" y="' + dy0 + '" width="' + dw + '" height="' + dw + '" rx="4" fill="' + (wh ? '#f7f3ea' : '#2a2522') + '" stroke="rgba(0,0,0,.4)"/>';
        (P1[v2] || []).forEach(function (q) { s += '<circle cx="' + f2(X + q[0] * dw) + '" cy="' + f2(dy0 + q[1] * dw) + '" r="1.8" fill="' + (wh ? '#1b1b1b' : '#f1e6d2') + '"/>'; });
      });
    }
    return s + '</svg>';
  }
  function bgStart() { var p = []; for (var i = 0; i < 24; i++) p.push(0); p[23] = 2; p[12] = 5; p[7] = 3; p[5] = 5; p[0] = -2; p[11] = -5; p[16] = -3; p[18] = -5; return { p: p, bar: [0, 0], off: [0, 0] }; }
  function bgPips(q, s) { var t = 25 * q.bar[s]; for (var i = 0; i < 24; i++) { var v = q.p[i]; if (s === 0 && v > 0) t += v * (i + 1); if (s === 1 && v < 0) t += -v * (24 - i); } return t; }
  // the last game, turn by turn, from the move string. Returns null if it doesn't add up
  function bgTurns(str) {
    var q = bgStart(), out = [], cube = 1, own = -1, ok = true;
    String(str).split(' ').forEach(function (t) {
      if (!ok || !t) return;
      var s = +t.charAt(0);
      if (t.charAt(1) === 'C') { cube = +t.slice(2) || cube * 2; own = 1 - s; out.push({ s: s, cubeTo: cube, q: q, cube: cube, own: own, pips: [bgPips(q, 0), bgPips(q, 1)] }); return; }
      var dice = [+t.charAt(1), +t.charAt(2)], mv = [], from = [], to = [], hit = [], sg = s === 0 ? 1 : -1;
      q = { p: q.p.slice(), bar: q.bar.slice(), off: q.off.slice() };
      for (var k = 3; k + 1 < t.length; k += 2) {
        var f = t.charCodeAt(k) - 97, g = t.charCodeAt(k + 1) - 97;   // 24 = bar, 25 = off
        if (f === 24) { if (!q.bar[s]) { ok = false; return; } q.bar[s]--; } else { if (q.p[f] * sg <= 0) { ok = false; return; } q.p[f] -= sg; from.push(f); }
        if (g === 25) q.off[s]++;
        else { if (q.p[g] * sg === -1) { q.p[g] = 0; q.bar[1 - s]++; hit.push(g); } q.p[g] += sg; to.push(g); }
        mv.push([f, g]);
      }
      out.push({ s: s, dice: dice, mv: mv, from: from, to: to, hit: hit, q: q, cube: cube, own: own, pips: [bgPips(q, 0), bgPips(q, 1)] });
    });
    return ok ? out : null;
  }
  R('backgammon', function (e, ui) {
    var d = e.dt; if (!d || !d.p) return null;
    var B = HistView.boardUI, nm = [plainName(e, 0), plainName(e, 1)], out = [];
    var HOW = { single: 'a single game', gammon: 'a gammon', backgammon: 'a backgammon' }, g = d.g || [], last = g[g.length - 1];
    var turns = d.mv ? bgTurns(d.mv) : null;
    if (turns) { var fq = turns[turns.length - 1].q; if (fq.p.join() !== d.p.join() || fq.off.join() !== (d.off || []).join()) turns = null; }
    var off = d.off || [0, 0];
    out.push(ui.stats([[g.length > 1 ? 'Games' : 'Points', g.length > 1 ? g.length : last ? last.pts : null, g.length > 1 ? 'match to ' + d.to : last ? (last.h === 'drop' ? 'a dropped double' : HOW[last.h] || '') : ''],
      ['Checkers hit', d.hits ? d.hits[0] + d.hits[1] : null, d.hits ? d.hits[0] + '–' + d.hits[1] : ''], d.cubeOn !== false ? ['Cube', d.max || 1, d.max > 1 ? 'highest it went' : 'never turned'] : ['Turns', turns ? turns.filter(function (t) { return t.dice; }).length : null]]));
    var snap = ui.picture(bgSvg(d), { frame: 'wood', max: 380 });
    out.push(ui.section('Final position', [snap, ui.chips([{ t: 'White: ' + nm[0], c: '#e9e4d8' }, { t: 'Black: ' + nm[1], c: '#9a9aa6' }])]));
    var ch = null;
    if (turns && turns.length > 1) {
      var pw = [[167], [167]]; turns.forEach(function (t) { pw[0].push(t.pips[0]); pw[1].push(t.pips[1]); });
      ch = B.chart(ui, [{ v: pw[0], c: '#f4f1e8' }, { v: pw[1], c: '#55505a', w: 3, halo: 'rgba(255,255,255,.7)' }], { lo: 0, from: 'Start · 167 each', to: g.length > 1 ? 'End of game ' + g.length : 'The end', aria: 'Pips left to go, turn by turn' });
      var N = turns.length;
      function pt(i, s) { return i === 24 ? 'bar' : i === 25 ? 'off' : String(s === 0 ? i + 1 : 24 - i); }
      out.push(ui.section(g.length > 1 ? 'Replay game ' + g.length : 'Replay', B.replay(ui, N, function (n) {
        var t = turns[n - 1];
        if (!n) { snap.innerHTML = bgSvg({ p: bgStart().p, bar: [0, 0], off: [0, 0], cube: 1, own: -1, cubeOn: d.cubeOn }); ch.at(0); return 'The opening set-up'; }
        snap.innerHTML = bgSvg({ p: t.q.p, bar: t.q.bar, off: t.q.off, cube: t.cube, own: t.own, cubeOn: d.cubeOn }, { dice: t.dice, side: t.s, from: t.from, to: t.to, hit: t.hit });
        ch.at(n);
        if (t.cubeTo) return 'Turn ' + n + ' · ' + nm[t.s] + ' doubled; ' + nm[1 - t.s] + ' took. The cube is at ' + t.cubeTo;
        var moves = t.mv.map(function (m) { return pt(m[0], t.s) + '/' + pt(m[1], t.s); }).join(', ');
        return 'Turn ' + n + ' · ' + nm[t.s] + ' rolled ' + t.dice[0] + '-' + t.dice[1] + ': ' + (moves || 'no move') + (t.hit.length ? ' · hit!' : '') + ' · pips ' + t.pips[0] + '–' + t.pips[1];
      }, { start: N, ms: 550 })));
      out.push(ui.section('The pip race', [ch, B.key(ui, [['White · ' + nm[0], '#f4f1e8'], ['Black · ' + nm[1], '#55505a']]), ui.el('small', { class: 'hv-note', text: 'Pips are the dots still to travel home: lower is ahead.' })]));
    }
    if (g.length) out.push(ui.section(g.length > 1 ? 'Each game' : 'How it ended', ui.log(g.map(function (x, i) {
      return { c: x.w, b: (g.length > 1 ? 'Game ' + (i + 1) + ': ' : ''), t: (x.h === 'drop' ? nm[x.w] + ' won when ' + nm[1 - x.w] + ' dropped the double' : nm[x.w] + ' won ' + (HOW[x.h] || 'the game')) + ', ' + x.pts + (x.pts === 1 ? ' point' : ' points') + (x.c > 1 ? ' (cube at ' + x.c + ')' : '') + (x.h !== 'drop' && x.pl ? ' · ' + nm[1 - x.w] + ' had ' + x.pl + ' pips left' : '') };
    }))));
    out.push(ui.table(['', nm[0], nm[1]], [['Borne off', off[0] + ' / 15', off[1] + ' / 15'], ['Pips left', d.pips ? d.pips[0] : null, d.pips ? d.pips[1] : null],
      ['Checkers hit', d.hits ? d.hits[0] : null, d.hits ? d.hits[1] : null], ['Doubles rolled', d.dbl ? d.dbl[0] : null, d.dbl ? d.dbl[1] : null]]));
    // what decided it
    if (last) {
      var w = last.w, why;
      if (last.h === 'drop') why = nm[1 - w] + ' gave up the game rather than play on for ' + last.c * 2;
      else if (last.h === 'gammon' || last.h === 'backgammon') why = nm[w] + ' bore off all 15 before ' + nm[1 - w] + ' got a single checker off: ' + HOW[last.h] + ', worth ' + last.pts;
      else if (turns) {
        // when the winner took the lead in the race for good
        var lead = 0; turns.forEach(function (t, k) { if (t.pips[w] > t.pips[1 - w]) lead = k + 1; });
        why = last.pl <= 12 ? 'A close race: ' + nm[1 - w] + ' had only ' + last.pl + ' pips to go' : lead < turns.length ? nm[w] + ' took the lead in the race on turn ' + (lead + 1) + ' and kept it' : nm[w] + ' won the race home';
      } else why = nm[w] + ' bore off all 15 first';
      if (d.to > 1) why += ' · match to ' + d.to;
      out.push(B.foot(ui, why, 'trophy'));
    }
    return ui.wrap(out);
  });

  // ── Battleship: both oceans side by side, a shot-by-shot replay and the race to 17 hits ──
  var BS_SIZE = [5, 4, 3, 3, 2], BS_NAME = ['Carrier', 'Battleship', 'Cruiser', 'Submarine', 'Destroyer'];
  function bsCells(k, sh) { var o = []; for (var i = 0; i < BS_SIZE[k]; i++) o.push((sh.r + (sh.h ? 0 : i)) * 10 + sh.c + (sh.h ? i : 0)); return o; }
  // hot: the square just fired at
  function bsSvg(fleet, shots, sunk, hot) {
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
      if (x === hot) s += '<circle cx="' + cx + '" cy="' + cy + '" r="7.5" fill="none" stroke="#ffd54a" stroke-width="1.8"/>';
    }
    return s + '</svg>';
  }
  R('battleship', function (e, ui) {
    var d = e.dt; if (!d || !d.at0) return null;
    var B = HistView.boardUI, nm = [plainName(e, 0), plainName(e, 1)], out = [], st = d.st || [];
    var pics = [], subs = [];
    var grids = ui.el('div', { class: 'hv-two' }, [0, 1].map(function (p) {
      var sk = String(d['sk' + p] || ''), n = sk.split('').filter(function (c) { return c === '1'; }).length;
      pics[p] = ui.picture(bsSvg(d['f' + p], String(d['at' + p]), sk), {}); subs[p] = ui.el('small', { text: n === 5 ? 'All 5 sunk' : (5 - n) + ' of 5 afloat' });
      return ui.el('div', { class: 'hv-two-c' }, [ui.el('b', { text: Kit.poss(nm[p]) + ' fleet' }), pics[p], subs[p]]);
    }));
    var w = d.w != null ? d.w : null;
    if (st.length === 2 && w != null) out.push(ui.stats([['Shots to win', st[w].s, nm[w]], ['Hit rate', st[w].s ? Math.round(st[w].h / st[w].s * 100) + '%' : null, st[1 - w].s ? nm[1 - w] + ' ' + Math.round(st[1 - w].h / st[1 - w].s * 100) + '%' : ''], ['Best streak', Math.max(st[0].b, st[1].b), 'hits in a row · ' + nm[st[0].b >= st[1].b ? 0 : 1]]]));
    out.push(ui.section('Both oceans', [grids, ui.el('small', { class: 'hv-note', text: 'Red pegs are hits, white pegs are misses. Dark ships were sunk.' })]));
    // the replay: the shots one by one
    var sq = String(d.sq || ''), shots = [];
    for (var i = 0; i + 2 < sq.length + 1 && i < sq.length; i += 3) shots.push({ p: +sq.charAt(i), x: +sq.substr(i + 1, 2) });
    if (shots.length > 1) {
      var N = shots.length, occ = [[], []];
      [0, 1].forEach(function (p) { (d['f' + p] || []).forEach(function (sh, k) { if (sh) bsCells(k, sh).forEach(function (c) { occ[p][c] = k; }); }); });
      // hits for each shooter after every shot
      var hits = [[0], [0]], run = [0, 0];
      shots.forEach(function (s) { if (occ[1 - s.p][s.x] != null) run[s.p]++; hits[0].push(run[0]); hits[1].push(run[1]); });
      var chart = B.chart(ui, [{ v: hits[0], c: ui.color(0) }, { v: hits[1], c: ui.color(1) }], { lo: 0, hi: 17, mid: 17, midLabel: '17 hits sink the fleet', from: 'First shot', to: 'Shot ' + N, aria: 'Hits for each player, shot by shot' });
      out.push(ui.section('Replay', B.replay(ui, N, function (n) {
        var at = [[], []]; for (var k = 0; k < 100; k++) { at[0].push('.'); at[1].push('.'); }
        var last = n ? shots[n - 1] : null, res = '';
        for (k = 0; k < n; k++) { var s = shots[k], tgt = 1 - s.p; at[tgt][s.x] = occ[tgt][s.x] != null ? 'h' : 'm'; }
        [0, 1].forEach(function (p) {
          var sk = (d['f' + p] || []).map(function (sh, kk) { return sh && bsCells(kk, sh).every(function (c) { return at[p][c] === 'h'; }) ? '1' : '0'; }).join('');
          pics[p].innerHTML = bsSvg(d['f' + p], at[p].join(''), sk, last && 1 - last.p === p ? last.x : -1);
          var sn = sk.split('').filter(function (c) { return c === '1'; }).length; subs[p].textContent = sn === 5 ? 'All 5 sunk' : (5 - sn) + ' of 5 afloat';
          if (last && 1 - last.p === p) { var kk2 = occ[p][last.x]; res = kk2 == null ? 'miss' : sk.charAt(kk2) === '1' ? 'sank the ' + BS_NAME[kk2] + '!' : 'hit'; }   // (each square is fired at once, so a ship sunk now was sunk by this shot)
        });
        chart.at(n);
        if (!n) return 'Both fleets in place';
        return 'Shot ' + n + ' · ' + nm[last.p] + ' fired at ' + 'ABCDEFGHIJ'.charAt(Math.floor(last.x / 10)) + (last.x % 10 + 1) + ': ' + res + ' · hits ' + hits[0][n] + '–' + hits[1][n];
      }, { start: N, ms: Math.max(120, Math.min(450, 16000 / N)) })));
      out.push(ui.section('The race to 17 hits', [chart, B.key(ui, [[nm[0], ui.color(0)], [nm[1], ui.color(1)]])]));
    }
    if (st.length === 2) out.push(ui.table(['', nm[0], nm[1]], [['Shots', st[0].s, st[1].s], ['Hits', st[0].h, st[1].h],
      ['Accuracy', st[0].s ? Math.round(st[0].h / st[0].s * 100) + '%' : '–', st[1].s ? Math.round(st[1].h / st[1].s * 100) + '%' : '–'], ['Best hit streak', st[0].b, st[1].b]]));
    if (d.order && d.order.length) out.push(ui.section('Ships sunk, in order', ui.log(d.order.map(function (x) { return { c: x.p, t: nm[x.p] + ' sank ' + possLow(nm[1 - x.p]) + ' ' + BS_NAME[x.k] }; }))));
    // what decided it
    if (w != null && st.length === 2) {
      var afloat = String(d['sk' + w] || '').split('').filter(function (c) { return c !== '1'; }).length, acc = [0, 1].map(function (p) { return st[p].s ? st[p].h / st[p].s : 0; });
      var why = acc[w] > acc[1 - w] + .08 ? nm[w] + ' shot straighter: ' + Math.round(acc[w] * 100) + '% hits to ' + Math.round(acc[1 - w] * 100) + '%' : d.fb === w ? nm[w] + ' found the ships first and never gave up the lead' : nm[w] + ' sank the last ship first';
      why += afloat === 5 ? ', and never lost a ship' : afloat ? ', with ' + afloat + (afloat === 1 ? ' ship' : ' ships') + ' still afloat' : '';
      out.push(B.foot(ui, why, 'trophy'));
    }
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

  // ── Mancala: the pits when the game ended, a replay of every sowing, and the race between the stores ──
  var MC_GLASS = ['#3d8bff', '#2fc56b', '#ffad33', '#ff4d6d', '#a479ff', '#35d0d0', '#f2f2f2'];
  // o: {from: pit just played, to: where its last stone landed, cap: [pits emptied by a capture]}
  function mcSvg(b, cols, o) {
    o = o || {};
    var W = 360, H = 150, sw = 40, pw = (W - 20 - 2 * sw - 24) / 6, s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Mancala board">';
    s += '<defs><radialGradient id="mcp" cx=".5" cy=".4" r=".7"><stop offset="0" stop-color="#3b220e"/><stop offset="1" stop-color="#5e3a1a"/></radialGradient>' +
      '<radialGradient id="mcg" cx=".35" cy=".3" r=".7"><stop offset="0" stop-color="#fff" stop-opacity=".7"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>';
    s += '<rect width="' + W + '" height="' + H + '" rx="22" fill="#9a6431"/><rect x="3" y="3" width="' + (W - 6) + '" height="' + (H - 6) + '" rx="20" fill="none" stroke="rgba(255,230,180,.18)" stroke-width="2"/>';
    // each pit scatters its stones the same way every time, so a replay only adds and takes away stones
    function stones(pit, cx, cy, rx, ry, n) {
      var seed = pit * 7919 + 13, t = '', show = Math.min(n, 16);
      function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
      for (var k = 0; k < show; k++) {
        var a = rnd() * 6.283, rr = Math.sqrt(rnd()), c = MC_GLASS[Math.floor(rnd() * 7)], X = (cx + Math.cos(a) * rr * rx).toFixed(1), Y = (cy + Math.sin(a) * rr * ry).toFixed(1);
        t += '<circle cx="' + X + '" cy="' + (+Y + .8).toFixed(1) + '" r="4" fill="rgba(0,0,0,.35)"/><circle cx="' + X + '" cy="' + Y + '" r="4" fill="' + c + '" opacity=".95"/><circle cx="' + X + '" cy="' + Y + '" r="4" fill="url(#mcg)"/>';
      }
      return t;
    }
    function count(cx, y, n, c) { return '<text x="' + cx + '" y="' + y + '" text-anchor="middle" font-size="13" font-weight="900" fill="' + (c || '#ffe9c4') + '" font-family="system-ui">' + n + '</text>'; }
    // player 1's store on the left, player 0's on the right; player 0's pits along the bottom, left to right
    [[13, 10], [6, W - 10 - sw]].forEach(function (q) {
      var x = q[1], n = b[q[0]];
      s += '<rect x="' + x + '" y="22" width="' + sw + '" height="' + (H - 44) + '" rx="' + sw / 2 + '" fill="url(#mcp)"/>' + stones(q[0], x + sw / 2, H / 2, sw * 0.28, H * 0.26, n) +
        '<rect x="' + (x + 4) + '" y="' + (H / 2 - 11) + '" width="' + (sw - 8) + '" height="22" rx="7" fill="rgba(0,0,0,.55)"/>' + count(x + sw / 2, H / 2 + 5, n, '#fff');
      if (o.to === q[0]) s += '<rect x="' + (x - 3) + '" y="19" width="' + (sw + 6) + '" height="' + (H - 38) + '" rx="' + (sw / 2 + 3) + '" fill="none" stroke="#fff" stroke-width="2.5"/>';
    });
    for (var i = 0; i < 6; i++) {
      var xb = 10 + sw + 12 + i * pw + pw / 2, xt = 10 + sw + 12 + (5 - i) * pw + pw / 2, r = Math.min(pw * 0.42, 22);
      [[i, xb, H - 42], [i + 7, xt, 42]].forEach(function (q) {
        var cp = o.cap && o.cap.indexOf(q[0]) >= 0;
        s += '<circle cx="' + q[1] + '" cy="' + q[2] + '" r="' + r + '" fill="url(#mcp)"/>' + stones(q[0], q[1], q[2], r * 0.55, r * 0.55, b[q[0]]);
        if (o.from === q[0] || o.to === q[0]) s += '<circle cx="' + q[1] + '" cy="' + q[2] + '" r="' + (r + 3) + '" fill="none" stroke="' + (o.from === q[0] ? '#ffd54a' : '#fff') + '" stroke-width="2.5"' + (o.from === q[0] ? ' stroke-dasharray="5 3"' : '') + '/>';
        if (cp) s += '<circle cx="' + q[1] + '" cy="' + q[2] + '" r="' + (r + 3) + '" fill="none" stroke="#ff5a5a" stroke-width="2.5"/>';
        s += count(q[1], q[2] + (q[2] > H / 2 ? r + 14 : -r - 5), b[q[0]]);
      });
    }
    return s + '</svg>';
  }
  // standard Kalah: one sowing on a 14-count board (pits 0-5 + store 6 for the first player, 7-12 + store 13 for the second)
  function mcSow(b, pit) {
    b = b.slice(); var pl = pit > 6 ? 1 : 0, mine = pl ? 13 : 6, theirs = pl ? 6 : 13, n = b[pit], c = pit, out = { pl: pl, n: n, cap: 0 };
    b[pit] = 0;
    while (n > 0) { c = (c + 1) % 14; if (c === theirs) c = (c + 1) % 14; b[c]++; n--; }
    out.to = c; out.extra = c === mine;
    if (!out.extra && (pl ? c >= 7 && c <= 12 : c <= 5) && b[c] === 1 && b[12 - c] > 0) { out.cap = b[12 - c] + 1; out.capAt = [c, 12 - c]; b[mine] += out.cap; b[c] = 0; b[12 - c] = 0; }
    var e0 = true, e1 = true; for (var i = 0; i < 6; i++) { if (b[i]) e0 = false; if (b[i + 7]) e1 = false; }
    out.end = e0 || e1; out.b = b;
    return out;
  }
  R('mancala', function (e, ui) {
    var d = e.dt; if (!d || !d.b) return null;
    var B = HistView.boardUI, nm = [plainName(e, 0), plainName(e, 1)], cols = (d.col || []).map(function (c, i) { return c || Kit.color(i); }), out = [];
    var left = [0, 0]; for (var i = 0; i < 6; i++) { left[0] += d.b[i]; left[1] += d.b[i + 7]; }
    var fin = (e.players || []).map(function (p) { return typeof p.score === 'number' ? p.score : null; });
    var w = fin[0] != null && fin[1] != null ? (fin[0] > fin[1] ? 0 : fin[1] > fin[0] ? 1 : -1) : -1;
    // the replay: every board from the start, rebuilt from the pits played
    var mv = String(d.m || ''), steps = null;
    if (mv.length > 1 && d.per) {
      var bd = []; for (i = 0; i < 14; i++) bd.push(i === 6 || i === 13 ? 0 : d.per);
      steps = [{ b: bd }];
      for (i = 0; i < mv.length; i++) { var r = mcSow(bd, mv.charCodeAt(i) - 97); steps.push(r); bd = r.b; }
      if (bd.join() !== d.b.join()) steps = null;   // (doesn't match how it ended: show the end only)
    }
    var snap = ui.picture(mcSvg(d.b, cols), { frame: 'wood', max: 380 });
    var note = ui.el('small', { class: 'hv-note', text: 'Bottom row and right store: ' + nm[0] + '. Top row and left store: ' + nm[1] + '.' + (d.sw && d.sw.n ? ' ' + nm[d.sw.w] + ' then swept the last ' + d.sw.n + ' stone' + (d.sw.n === 1 ? '' : 's') + ' into their store.' : '') });
    var caps = d.caps || [], ct = [0, 0], cs = [0, 0]; caps.forEach(function (c) { ct[c.w]++; cs[c.w] += c.n; });
    var big = caps.slice().sort(function (a, b) { return b.n - a.n; })[0];
    out.push(ui.stats([['Final', fin[0] != null ? fin[0] + '–' + fin[1] : null, w >= 0 ? nm[w] + ' by ' + Math.abs(fin[0] - fin[1]) : 'tied'], ['Moves', d.mv || null],
      ['Biggest capture', big ? big.n : null, big ? nm[big.w] : ''], ['Extra turns', d.ex ? d.ex[0] + d.ex[1] : null, d.ex ? d.ex[0] + '–' + d.ex[1] : '']]));
    out.push(ui.section(steps ? 'The board' : 'When the game ended', [snap, note]));
    var tot = d.per * 12 || 48, ch = null;
    if (d.t0 && d.t0.length > 1) {
      var s0 = [0].concat(d.t0, fin[0] != null ? [fin[0]] : []), s1 = [0].concat(d.t1, fin[1] != null ? [fin[1]] : []);
      ch = HistView.boardUI.chart(ui, [{ v: s0, c: cols[0] }, { v: s1, c: cols[1] }], { lo: 0, hi: Math.max(tot / 2 + 4, Math.max.apply(null, s0.concat(s1))), mid: tot / 2, midLabel: 'Half the stones: ' + tot / 2, from: 'Start', to: 'End', aria: 'Stones in each store over the game' });
    }
    if (steps) {
      var N = steps.length - 1;
      out.push(ui.section('Replay', B.replay(ui, N, function (n) {
        var st = steps[n], pit = n ? mv.charCodeAt(n - 1) - 97 : -1;
        snap.innerHTML = mcSvg(n === N ? d.b : st.b, cols, n ? { from: pit, to: st.to, cap: st.capAt } : {});
        if (ch) ch.at(n);
        if (!n) return 'Start: ' + d.per + ' stones in every pit';
        return 'Move ' + n + ' · ' + nm[st.pl] + ' sowed ' + st.n + (st.n === 1 ? ' stone' : ' stones') + (st.extra ? ', the last one in the store: goes again' : st.cap ? ' and captured ' + st.cap : '') + (st.end ? '. A side is empty: game over' : '');
      }, { start: N })));
    }
    if (ch) out.push(ui.section('Stores over the game', [ch, B.key(ui, [[nm[0], cols[0]], [nm[1], cols[1]], ['Dashed: half the stones', 'rgba(255,255,255,.3)']])]));
    out.push(ui.table(['', nm[0], nm[1]], [['Captures', ct[0], ct[1]], ['Stones captured', cs[0], cs[1]], ['Extra turns', d.ex ? d.ex[0] : null, d.ex ? d.ex[1] : null], ['Left on side at end', left[0], left[1]]]));
    if (d.ser && d.ser[0] + d.ser[1] + (d.ser[2] || 0) > 1) out.push(ui.stats([['Series', d.ser[0] + '–' + d.ser[1] + (d.ser[2] ? ' (' + d.ser[2] + ' tied)' : '')], ['Stones per pit', d.per || null]]));
    // what decided it
    var why = '';
    if (w >= 0) {
      var margin = Math.abs(fin[0] - fin[1]);
      why = cs[w] - cs[1 - w] >= Math.max(4, margin / 2) ? nm[w] + ' won it on captures: ' + cs[w] + ' stones taken to ' + cs[1 - w]
        : d.sw && d.sw.w === w && d.sw.n >= margin ? 'The sweep decided it: ' + nm[w] + ' kept the ' + d.sw.n + ' stones left on their side'
        : d.ex && d.ex[w] - d.ex[1 - w] >= 3 ? nm[w] + ' strung together more extra turns (' + d.ex[w] + ' to ' + d.ex[1 - w] + ')'
        : nm[w] + ' won ' + fin[w] + ' to ' + fin[1 - w];
    } else if (fin[0] != null) why = 'Dead even: ' + fin[0] + ' stones each';
    out.push(B.foot(ui, why, 'trophy'));
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
    var d = e.dt; if (!d || !d.hands || !d.hands.length) return null;
    var B = HistView.boardUI, P = e.players || [], nm = P.map(function (p) { return p.name; }), out = [];
    var WIND = { E: 'East', S: 'South', W: 'West', N: 'North' };
    var deltas = e.rounds && e.rounds.scores && e.rounds.scores.length === d.hands.length ? e.rounds.scores : null;
    var hands = d.hands, wonH = hands.filter(function (h) { return h.w >= 0; });
    var big = wonH.slice().sort(function (a, b) { return (b.fa || 0) - (a.fa || 0) || (b.pt || 0) - (a.pt || 0); })[0];
    var selfN = wonH.filter(function (h) { return h.f < 0 || h.f == null; }).length;
    out.push(ui.stats([['Hands', hands.length, (hands.length - wonH.length) ? (hands.length - wonH.length) + ' drawn' : 'every one won'],
      ['Biggest hand', big ? big.fa + ' faan' : null, big ? nm[big.w] + ' · ' + (WIND[String(big.l).charAt(0)] || '') + ' ' + String(big.l).slice(1) : ''],
      ['Self-drawn', wonH.length ? selfN + ' of ' + wonH.length : null, 'won off the wall']]));
    // one hand on the felt: the winning tiles, how it scored, who paid
    var card = ui.el('div');
    function show(k) {
      var h = hands[k], box = ui.el('div', { class: 'hv-mjh big' });
      var head = h.w < 0 ? 'Draw: the wall ran out' : nm[h.w] + (h.f < 0 || h.f == null ? ' won, self-drawn' : ' won on ' + possLow(nm[h.f] || '?') + ' discard');
      box.appendChild(ui.el('div', { class: 'hv-mjh-t' }, [ui.el('b', { text: (WIND[String(h.l).charAt(0)] || '') + ' ' + String(h.l).slice(1) }),
        ui.el('span', { text: head, style: h.w >= 0 ? { color: Kit.color(h.w) } : null }), h.w >= 0 ? ui.el('i', { text: h.fa + ' faan · ' + h.pt + ' pts' }) : null]));
      if (h.t) box.appendChild(MJ.hand(h.t, ui.el));
      else if (h.w >= 0) box.appendChild(ui.el('div', { class: 'hv-mj-none', text: 'The tiles of smaller hands aren’t kept in long games.' }));
      var y = h.w >= 0 ? (h.y ? String(h.y).split('|') : ['Chicken hand']) : [];
      if (y.length) box.appendChild(ui.chips(y.map(function (t) { return { t: t, on: true }; })));
      // the money: who got and who paid
      var dl = deltas ? deltas[k] : null;
      if (dl && dl.some(function (v) { return v; })) {
        box.appendChild(ui.el('div', { class: 'hv-mj-pay' }, nm.map(function (n, i) {
          var v = +dl[i] || 0;
          return ui.el('span', { class: v > 0 ? 'up' : v < 0 ? 'dn' : '' }, [ui.el('i', { style: { background: Kit.color(i) } }), ui.el('span', { class: 'n', text: n }), ui.el('b', { text: v > 0 ? '+' + v : v < 0 ? '−' + (-v) : '0' })]);
        })));
      }
      if (h.d >= 0 && nm[h.d]) box.appendChild(ui.el('small', { class: 'hv-mj-d', text: 'Dealer: ' + nm[h.d] + (h.w === h.d ? ' (kept the deal)' : '') }));
      card.innerHTML = ''; card.appendChild(box);
    }
    var items = hands.map(function (h) {
      return { t: String(h.l), s: h.w < 0 ? 'Draw' : (nm[h.w] || '').split(' ')[0] + ' · ' + h.fa, c: h.w >= 0 ? Kit.color(h.w) : null, hot: h === big, dim: h.w < 0 };
    });
    out.push(ui.section(hands.length > 1 ? 'Every hand · tap one' : 'The hand', [hands.length > 1 ? B.strip(ui, items, big ? hands.indexOf(big) : hands.length - 1, show) : null, card]));
    if (hands.length === 1) show(0);
    // who won, who paid
    var wins = [0, 0, 0, 0], self = [0, 0, 0, 0], dealt = [0, 0, 0, 0], best = [0, 0, 0, 0];
    hands.forEach(function (h) { if (h.w < 0) return; wins[h.w]++; if (h.f < 0 || h.f == null) self[h.w]++; else dealt[h.f]++; best[h.w] = Math.max(best[h.w], h.fa || 0); });
    out.push(ui.section('Who won, who paid', ui.table(['', 'Won', 'Self-drawn', 'Dealt in', 'Top faan'], nm.map(function (n, i) { return [n, wins[i], self[i], dealt[i], best[i] || '–']; }))));
    // what decided it
    var sc = P.map(function (p, i) { return { i: i, s: p.score }; }).filter(function (x) { return typeof x.s === 'number'; }).sort(function (a, b) { return b.s - a.s; });
    if (sc.length > 1 && sc[0].s !== sc[1].s) {
      var wi = sc[0].i, why = nm[wi] + ' won ' + wins[wi] + (wins[wi] === 1 ? ' hand' : ' hands');
      if (big && big.w === wi && big.fa >= 3) why += ', and the ' + big.fa + '-faan ' + (String(big.y || '').split('|')[0] || 'hand') + ' in ' + big.l + ' was the big one';
      else if (dealt[wi] === 0 && hands.length > 2) why += ' and never dealt in';
      out.push(B.foot(ui, why, 'trophy'));
    }
    return ui.wrap(out);
  });

  // Scrabble: the board (premium squares and maple tiles; blanks in red), every turn in a strip you tap to see the board
  // as it was then with that word lit, the score race, the best plays, and each player's game
  var SC_PREM = ['T..d...T...d..T', '.D...t...t...D.', '..D...d.d...D..', 'd..D...d...D..d', '....D.....D....', '.t...t...t...t.', '..d...d.d...d..', 'T..d...*...d..T'];
  var SC_FILL = { T: '#d6493b', D: '#f2aca1', '*': '#f2aca1', t: '#2b80c2', d: '#a4d2ec', '.': '#ece3c7' };
  var SC_LAB = { T: 'TW', D: 'DW', t: 'TL', d: 'DL' };
  var SC_VAL = { A: 1, B: 3, C: 3, D: 2, E: 1, F: 4, G: 2, H: 4, I: 1, J: 8, K: 5, L: 1, M: 3, N: 1, O: 1, P: 3, Q: 10, R: 1, S: 1, T: 1, U: 1, V: 4, W: 4, X: 8, Y: 4, Z: 10 };
  // rows: the final board; show: cells to draw (null = all); hot: cells laid this turn; col: their player's colour
  function scSvg(rows, show, hot, col) {
    var cs = 20, g = 1, W = 15 * cs + 16 * g, s = '<svg viewBox="0 0 ' + W + ' ' + W + '" role="img" aria-label="Scrabble board"><rect width="' + W + '" height="' + W + '" fill="#1d4c40"/>', top = '';
    for (var r = 0; r < 15; r++) for (var c = 0; c < 15; c++) {
      var i = r * 15 + c, x = g + c * (cs + g), y = g + r * (cs + g), ch = rows[r].charAt(c), pm = SC_PREM[r <= 7 ? r : 14 - r].charAt(c);
      if (ch && ch !== '.' && (!show || show[i])) {
        var blank = ch >= 'a' && ch <= 'z', L = ch.toUpperCase(), h = hot && hot[i];
        var t = '<rect x="' + x + '" y="' + y + '" width="' + cs + '" height="' + cs + '" rx="3" fill="' + (h ? '#ffe2a6' : '#efd39c') + '"/><rect x="' + x + '" y="' + (y + cs - 2.5) + '" width="' + cs + '" height="2.5" rx="1" fill="#c99c5a"/>' +
          '<text x="' + (x + cs * 0.46) + '" y="' + (y + cs * 0.5) + '" text-anchor="middle" dominant-baseline="central" font-size="12.5" font-weight="800" fill="' + (blank ? '#9a3d1e' : '#2a1a0c') + '" font-family="ui-rounded,system-ui,sans-serif">' + L + '</text>' +
          (blank ? '' : '<text x="' + (x + cs - 3) + '" y="' + (y + cs - 4.5) + '" text-anchor="end" font-size="5.5" font-weight="800" fill="#2a1a0c" font-family="system-ui,sans-serif">' + SC_VAL[L] + '</text>');
        if (h) top += '<rect x="' + (x - 1) + '" y="' + (y - 1) + '" width="' + (cs + 2) + '" height="' + (cs + 2) + '" rx="3.5" fill="none" stroke="' + (col || '#ffd54a') + '" stroke-width="2.2"/>';
        s += t;
      } else {
        s += '<rect x="' + x + '" y="' + y + '" width="' + cs + '" height="' + cs + '" fill="' + SC_FILL[pm] + '"/>';
        if (SC_LAB[pm]) s += '<text x="' + (x + cs / 2) + '" y="' + (y + cs / 2 + .5) + '" text-anchor="middle" dominant-baseline="central" font-size="6" font-weight="900" fill="' + (pm === 'D' || pm === 'd' ? 'rgba(60,30,20,.55)' : 'rgba(255,255,255,.8)') + '" font-family="system-ui,sans-serif">' + SC_LAB[pm] + '</text>';
        if (pm === '*') s += '<path transform="translate(' + (x + cs / 2) + ' ' + (y + cs / 2) + ') scale(.55)" d="M0-9 2.6-3 9-2.8 4-1 5.6 6.5 0 3 -5.6 6.5 -4-1 -9-2.8 -2.6-3Z" fill="rgba(120,40,30,.6)"/>';
      }
    }
    return s + top + '</svg>';
  }
  R('scrabble', function (e, ui) {
    var d = e.dt; if (!d || !d.b || d.b.length !== 15) return null;
    var B = HistView.boardUI, nm = (e.players || []).map(function (p) { return p.name; }), P = nm.length, out = [];
    var snap = ui.picture(scSvg(d.b), { frame: 'wood', max: 360 });
    // the turns, if this record has them
    var L = 'abcdefghijklmno', turns = (d.tl || []).map(function (t) {
      var a = String(t).split(':'), x = { p: +a[0] || 0 };
      if (a[1] === '-') x.k = 'pass'; else if (a[1] && a[1].charAt(0) === '#') { x.k = 'swap'; x.n = +a[1].slice(1); }
      else { x.k = 'play'; x.w = a[1]; x.s = +a[2] || 0; var q = a[3] || ''; x.b = /\*$/.test(q); q = q.replace('*', ''); x.c = []; for (var i = 0; i + 1 < q.length; i += 2) x.c.push(L.indexOf(q.charAt(i)) * 15 + L.indexOf(q.charAt(i + 1))); }
      return x;
    });
    var plays = turns.filter(function (t) { return t.k === 'play'; }), best = plays.slice().sort(function (a, b) { return b.s - a.s; })[0];
    var bingos = d.bg ? d.bg.reduce(function (a, b) { return a + b; }, 0) : plays.filter(function (t) { return t.b; }).length;
    var top = d.top && d.top[0];
    out.push(ui.stats([['Best play', top ? top.s : best ? best.s : null, top ? top.w + ' · ' + (nm[top.p] || '') : best ? best.w + ' · ' + nm[best.p] : ''], ['Bingos', bingos, 'all 7 tiles at once'], ['Turns', d.tn || turns.length || null]]));
    out.push(ui.section(turns.length ? 'The board' : 'Final board', snap));
    if (plays.length > 1) {
      // score after every turn, for each player
      var run = nm.map(function () { return 0; }), ser = nm.map(function () { return [0]; });
      turns.forEach(function (t) { if (t.k === 'play') run[t.p] += t.s; ser.forEach(function (v, i) { v.push(run[i]); }); });
      var fin = (e.players || []).map(function (p) { return p.score; });
      // (the score race by round is drawn under the view from the record's rounds; this one only when there are none)
      var ch = e.rounds ? null : B.chart(ui, ser.map(function (v, i) { return { v: typeof fin[i] === 'number' ? v.concat([fin[i]]) : v, c: ui.color(i) }; }), { lo: 0, from: 'Turn 1', to: 'After leftovers', aria: 'Scores turn by turn' });
      var N = turns.length, cellsUpTo = function (n) { var m = {}; for (var k = 0; k < n; k++) (turns[k].c || []).forEach(function (i) { m[i] = 1; }); return m; };
      var items = turns.map(function (t) {
        return t.k === 'play' ? { t: t.w, s: t.s + (t.b ? ' · bingo' : ''), c: ui.color(t.p), hot: t === best || t.b } : { t: t.k === 'swap' ? 'Swap ' + t.n : 'Pass', s: nm[t.p], c: ui.color(t.p), dim: true };
      });
      var rp, st = B.strip(ui, items, null, function (i) { rp.go(i + 1); });
      rp = B.replay(ui, N, function (n) {
        var t = turns[n - 1], hot = {};
        if (t && t.c) t.c.forEach(function (i) { hot[i] = 1; });
        snap.innerHTML = scSvg(d.b, n === N ? null : cellsUpTo(n), hot, t ? ui.color(t.p) : null);
        if (n) st.set(n - 1, true); if (ch) ch.at(n);
        if (!n) return 'An empty board';
        var who = nm[t.p] || 'Player';
        return 'Turn ' + n + ' · ' + (t.k === 'play' ? who + ' played ' + t.w + ' for ' + t.s + (t.b ? ', a bingo' : '') : t.k === 'swap' ? who + ' swapped ' + t.n + (t.n === 1 ? ' tile' : ' tiles') : who + ' passed') + ' · ' + run.map(function (x, i) { return ser[i][n]; }).join('–');
      }, { start: best ? turns.indexOf(best) + 1 : N, ms: 650 });
      out.push(ui.section('Every turn · tap one', [st, rp]));
      if (ch) out.push(ui.section('The score race', [ch, B.key(ui, nm.map(function (n, i) { return [n, ui.color(i)]; }))]));
    } else if (d.top && d.top.length) out.push(ui.section('Best plays', ui.log(d.top.map(function (t) { return { c: t.p, b: t.w, t: t.s + ' points' + (t.b ? ' · bingo' : '') + ' · ' + (nm[t.p] || '') }; }))));
    var rows = nm.map(function (n, i) {
      var adj = d.adj ? d.adj[i] : 0;
      return [n, d.mv ? d.mv[i] : '–', d.bg ? d.bg[i] : '–', adj > 0 ? '+' + adj : adj < 0 ? String(adj) : '0'];
    });
    out.push(ui.section('Each player', ui.table(['', 'Plays', 'Bingos', 'Leftover'], rows)));
    // what decided it
    var sc = (e.players || []).map(function (p, i) { return { i: i, s: p.score }; }).filter(function (x) { return typeof x.s === 'number'; }).sort(function (a, b) { return b.s - a.s; });
    var why = d.end === 'out' ? (nm[d.o] || 'Someone') + ' went out first' : 'Six scoreless turns in a row ended it';
    if (sc.length > 1) {
      var mg = sc[0].s - sc[1].s, wi = sc[0].i;
      if (!mg) why += '; a tie at ' + sc[0].s;
      else {
        var swing = d.adj ? d.adj[wi] - d.adj[sc[1].i] : 0;
        why += swing >= mg ? '. The leftover tiles decided it: ' + nm[wi] + ' won by ' + mg : best && best.p === wi && best.s >= mg ? '. ' + nm[wi] + ' won by ' + mg + ', and ' + best.w + ' (' + best.s + ') was the difference' : '. ' + nm[wi] + ' won by ' + mg;
      }
    }
    out.push(B.foot(ui, why, 'trophy'));
    return ui.wrap(out);
  });

  // ── Monopoly: the board at the end (who owned what, buildings, mortgages), worth, rent and who went broke ──
  R('monopoly', function (e, ui) {
    var d = e.dt; if (!d || !d.o) return null;
    var nm = (e.players || []).map(function (p) { return p.name; }), out = [];
    var GC = ['#8a4b2a', '#a9dcf5', '#d6338a', '#f3901d', '#e1251b', '#f6e100', '#1d9e55', '#1b5fae'];
    // group of each square (-1: not a street)
    var G = [-1, 0, -1, 0, -1, -1, 1, -1, 1, 1, -1, 2, -1, 2, 2, -1, 3, -1, 3, 3, -1, 4, -1, 4, 4, -1, 5, 5, -1, 5, -1, 6, 6, -1, 6, -1, -1, 7, -1, 7];
    var OWN = [   // ownable squares
      0,1,0,1,0,1,1,0,1,1,0,1,1,1,1,1,1,0,1,1,0,1,0,1,1,1,1,1,1,1,0,1,1,0,1,1,0,1,0,1];
    var Cn = 44, Wd = (400 - 2 * Cn) / 9;
    function rc(i) {
      if (i === 0) return [400 - Cn, 400 - Cn, Cn, Cn, 'c']; if (i < 10) return [400 - Cn - i * Wd, 400 - Cn, Wd, Cn, 'b'];
      if (i === 10) return [0, 400 - Cn, Cn, Cn, 'c']; if (i < 20) return [0, 400 - Cn - (i - 10) * Wd, Cn, Wd, 'l'];
      if (i === 20) return [0, 0, Cn, Cn, 'c']; if (i < 30) return [Cn + (i - 21) * Wd, 0, Wd, Cn, 't'];
      if (i === 30) return [400 - Cn, 0, Cn, Cn, 'c']; return [400 - Cn, Cn + (i - 31) * Wd, Cn, Wd, 'r'];
    }
    var s = '<svg viewBox="0 0 400 400" role="img" aria-label="The board at the end"><rect width="400" height="400" fill="#d6ead2"/>';
    for (var i = 0; i < 40; i++) {
      var r = rc(i), x = r[0], y = r[1], w = r[2], h = r[3], sd = r[4], o = d.o.charAt(i), hs = +d.h.charAt(i) || 0, mo = d.m.charAt(i) === '1';
      s += '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + h.toFixed(1) + '" fill="' + (o !== '-' && o !== '' ? ui.color(+o) : OWN[i] ? '#eef6ec' : '#d6ead2') + '" fill-opacity="' + (o !== '-' && o !== '' ? (mo ? .35 : .8) : 1) + '" stroke="#1d1d1b" stroke-width="1"/>';
      if (G[i] >= 0) {
        var b = sd === 'b' ? [x, y, w, 10] : sd === 't' ? [x, y + h - 10, w, 10] : sd === 'l' ? [x + w - 10, y, 10, h] : [x, y, 10, h];
        s += '<rect x="' + b[0].toFixed(1) + '" y="' + b[1].toFixed(1) + '" width="' + b[2].toFixed(1) + '" height="' + b[3].toFixed(1) + '" fill="' + GC[G[i]] + '" stroke="#1d1d1b" stroke-width="1"/>';
        if (hs) {
          var cx = b[0] + b[2] / 2, cy = b[1] + b[3] / 2;
          if (hs === 5) s += '<rect x="' + (cx - 5) + '" y="' + (cy - 3.5) + '" width="10" height="7" rx="1" fill="#d42a2a" stroke="#fff" stroke-width=".8"/>';
          else for (var k = 0; k < hs; k++) { var off = (k - (hs - 1) / 2) * 6.2, hx = sd === 'l' || sd === 'r' ? cx : cx + off, hy = sd === 'l' || sd === 'r' ? cy + off : cy; s += '<rect x="' + (hx - 2.4) + '" y="' + (hy - 2.4) + '" width="4.8" height="4.8" rx=".8" fill="#2ba24c" stroke="#fff" stroke-width=".6"/>'; }
        }
      }
      if (mo) s += '<path d="M' + x + ' ' + y + 'l' + w + ' ' + h + '" stroke="#c8102e" stroke-width="1.6"/>';
    }
    s += '<text x="200" y="208" text-anchor="middle" font-family="Lilita One,system-ui,sans-serif" font-size="34" fill="#d7262e" transform="rotate(-45 200 200)">MONOPOLY</text></svg>';
    var key = nm.map(function (n, i) { return { t: n, c: ui.color(i) }; });
    out.push(ui.section('The board at the end', [ui.picture(s, { frame: 'wood', max: 360 }), ui.chips(key)]));
    var rows = nm.map(function (n, i) {
      var props = 0; for (var q = 0; q < 40; q++) if (d.o.charAt(q) === String(i)) props++;
      var bk = (d.out || []).filter(function (b) { return b.p === i; })[0];
      return [n, bk ? 'Bankrupt' : ui.money((d.w || [])[i]), bk ? '–' : props, ui.money((d.rg || [])[i])];
    });
    out.push(ui.table(['', 'Worth', 'Deeds', 'Rent in'], rows));
    if (d.out && d.out.length) out.push(ui.section('Bankruptcies', ui.log(d.out.map(function (b) { return { c: b.p, t: nm[b.p] + ' went broke on turn ' + b.n + (b.to >= 0 ? ', to ' + nm[b.to] : ', to the bank') }; }))));
    var opt = String(d.opt || '').split(',').filter(Boolean).map(function (o) { return { fp: 'Free Parking jackpot', go400: '$400 on Go', noauction: 'No auctions', m60: '1 hour game', m90: '90 minute game', r25: '25 rounds' }[o] || o; });
    out.push(ui.stats([['Rounds', d.r], ['Biggest rent', d.big ? ui.money(d.big.a) : null, d.big && nm[d.big.f] ? nm[d.big.f] + ' to ' + nm[d.big.t] : ''], ['Ended', d.why === 'time' ? 'Time up' : 'Last one left']]));
    if (opt.length) out.push(ui.chips(opt));
    return ui.wrap(out);
  });

  HistView.css('hv-board2', '.hv-replay{display:flex;flex-direction:column;gap:6px;}.hv-range{width:100%;accent-color:var(--yellow);}.hv-replay b{font-size:.85rem;color:var(--text-2);}' +
    '.hv-note{font-size:.78rem;color:var(--text-3);line-height:1.35;}' +
    '.hv-two{display:grid;grid-template-columns:1fr 1fr;gap:8px;}.hv-two-c{display:flex;flex-direction:column;gap:4px;min-width:0;align-items:center;text-align:center;}.hv-two-c b{font-size:.84rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;}.hv-two-c small{font-size:.74rem;color:var(--text-3);font-weight:700;}.hv-two-c .hv-snap{padding:0;border-radius:8px;overflow:hidden;}' +
    '.hv-mjh{display:flex;flex-direction:column;gap:6px;padding:10px;border-radius:12px;background:radial-gradient(120% 120% at 50% 0%,#1f7a4a,#0e4a2b);}.hv-mjh-t{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 8px;font-size:.86rem;}.hv-mjh-t span{font-weight:800;}.hv-mjh-t i{font-style:normal;color:rgba(255,255,255,.7);font-size:.8rem;margin-left:auto;}.hv-mjh .hv-chip{background:rgba(0,0,0,.25);}' +
    '.hv-mj{display:flex;flex-wrap:wrap;gap:5px;}.hv-mj-g{display:flex;gap:1px;}.hv-mt{position:relative;width:21px;height:28px;border-radius:3px;background:linear-gradient(165deg,#fffef8,#f7f0de 55%,#ebe1c6);box-shadow:inset 0 0 0 1px rgba(120,95,50,.25),0 2px 0 #1f5ea8,0 3px 2px rgba(0,0,0,.35);}.hv-mt svg{position:absolute;inset:5% 7%;width:86%;height:90%;overflow:visible;}.hv-mt.back{background:linear-gradient(160deg,#2d7bd0,#1f5ea8);box-shadow:0 2px 0 #e9dfc4,0 3px 2px rgba(0,0,0,.35);}.hv-mt.hot{box-shadow:inset 0 0 0 1px rgba(120,95,50,.25),0 0 0 2px #ffd84a,0 0 8px rgba(255,216,74,.7);}' +
    '.hv-mjh.big{gap:9px;padding:12px;}.hv-mjh.big .hv-mj{gap:5px;}.hv-mjh.big .hv-mt{width:21px;height:29px;}' +
    '.hv-mj-pay{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:4px 10px;padding-top:8px;border-top:1px solid rgba(255,255,255,.14);}' +
    '.hv-mj-pay>span{display:flex;align-items:center;gap:6px;font-size:.8rem;font-weight:800;min-width:0;}.hv-mj-pay i{width:9px;height:9px;border-radius:50%;flex:none;}' +
    '.hv-mj-pay .n{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:rgba(255,255,255,.85);}.hv-mj-pay b{font-variant-numeric:tabular-nums;color:rgba(255,255,255,.6);}' +
    '.hv-mj-pay .up b{color:#86efac;}.hv-mj-pay .dn b{color:#fca5a5;}.hv-mj-d{font-size:.74rem;font-weight:700;color:rgba(255,255,255,.6);}.hv-mj-none{font-size:.78rem;color:rgba(255,255,255,.6);font-style:italic;}' +
    '.hv-mjh .hv-chip.on{background:rgba(0,0,0,.3);color:#fff;}');
})();
