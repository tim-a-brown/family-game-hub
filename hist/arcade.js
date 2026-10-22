'use strict';
// History views: arcade
// Each run reads like an arcade results screen: a dark screen with the score and where it landed on the
// high-score table, a picture of how the run ended, then the run's numbers.
(function () {
  if (!window.HistView) return;
  var R = HistView.register;

  HistView.css('hv-arcade', [
    '.ar-scr{position:relative;border-radius:16px;padding:14px 14px 12px;background:#07080f;color:#e9ecff;overflow:hidden;',
    'box-shadow:inset 0 0 0 2px #1b1f33,inset 0 0 0 5px #0c0e18,inset 0 0 40px rgba(80,120,255,.10),0 8px 20px -10px rgba(0,0,0,.8);',
    'font-family:ui-monospace,"SF Mono",Menlo,Consolas,"Liberation Mono",monospace;display:flex;flex-direction:column;gap:12px;}',
    '.ar-scr::after{content:"";position:absolute;inset:0;pointer-events:none;border-radius:inherit;',
    'background:repeating-linear-gradient(180deg,rgba(255,255,255,.035) 0 1px,transparent 1px 3px);}',
    '.ar-top{display:flex;align-items:flex-end;justify-content:space-between;gap:10px;flex-wrap:wrap;}',
    '.ar-ttl{font-size:.72rem;font-weight:800;letter-spacing:.18em;text-transform:uppercase;color:var(--ac,#ffd84a);}',
    '.ar-score{font-size:2rem;font-weight:900;line-height:1;letter-spacing:.04em;color:#fff;font-variant-numeric:tabular-nums;',
    'text-shadow:0 0 10px color-mix(in srgb,var(--ac,#ffd84a) 70%,transparent);}',
    '.ar-score small{font-size:.7rem;letter-spacing:.14em;color:rgba(233,236,255,.55);margin-left:6px;font-weight:800;}',
    '.ar-rank{font-size:.68rem;font-weight:900;letter-spacing:.12em;text-transform:uppercase;padding:5px 8px;border-radius:6px;',
    'border:1.5px solid rgba(233,236,255,.25);color:rgba(233,236,255,.8);white-space:nowrap;}',
    '.ar-rank.new{border-color:#ffd84a;color:#ffd84a;box-shadow:0 0 12px rgba(255,216,74,.35);}',
    '.ar-body{display:flex;flex-direction:column;gap:12px;align-items:center;}',
    '.ar-body.side{flex-direction:row;align-items:flex-start;}',
    '.ar-pic{line-height:0;width:100%;}',
    '.ar-pic svg{width:100%;height:auto;display:block;border-radius:6px;}',
    '.ar-body.side .ar-pic{flex:0 0 44%;}',
    '.ar-st{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px 10px;width:100%;}',
    '.ar-body.side .ar-st{grid-template-columns:1fr;gap:7px;flex:1;min-width:0;}',
    '.ar-s{display:flex;flex-direction:column;gap:1px;min-width:0;}',
    '.ar-s b{font-size:1.02rem;font-weight:900;color:#fff;font-variant-numeric:tabular-nums;display:flex;align-items:center;gap:6px;overflow-wrap:anywhere;}',
    '.ar-s small{font-size:.6rem;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:rgba(233,236,255,.5);}',
    '.ar-s i{font-style:normal;font-size:.68rem;color:rgba(233,236,255,.6);}',
    '.ar-dot{width:12px;height:12px;border-radius:50%;flex:none;box-shadow:inset 0 -2px 0 rgba(0,0,0,.3),0 0 0 1.5px rgba(255,255,255,.35);}',
    '.ar-foot{font-size:.78rem;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#ff6b7a;text-align:center;}',
    '.ar-foot.ok{color:#7dff9a;}',
    '.ar-sub{font-size:.7rem;color:rgba(233,236,255,.55);letter-spacing:.08em;text-transform:uppercase;font-weight:800;}',
    '.ar-kz{display:flex;flex-wrap:wrap;gap:4px 12px;justify-content:center;font-size:.64rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:rgba(233,236,255,.6);}',
    '.ar-kz span{display:inline-flex;align-items:center;gap:5px;}',
    '.ar-kz span i{width:10px;height:10px;border-radius:2px;display:inline-block;}'
  ].join(''));

  // ── shared pieces ──
  function n(v) { return (Number(v) || 0).toLocaleString('en-US'); }
  function plural(k, one, many) { return n(k) + ' ' + (k === 1 ? one : many || one + 's'); }
  function mmss(sec) { sec = Math.round(Number(sec) || 0); var m = Math.floor(sec / 60), s = sec % 60; return m + ':' + (s < 10 ? '0' : '') + s; }
  function myScore(e) { var p = (e.players || [])[0]; return p && typeof p.score === 'number' ? p.score : 0; }
  // where the run landed on the high-score table
  function rankText(d, unit) {
    if (!d) return null;
    if (d.hr === 1) return { t: 'New high score', cls: 'new' };
    if (d.hr > 1) return { t: '#' + d.hr + ' on the high scores' };
    if (d.hb) return { t: 'Best: ' + n(d.hb) + (unit ? ' ' + unit : '') };
    return null;
  }
  // the screen: o = {ac, title, score, unit, rank, pic, side, stats: [[label, value, sub?, dotColor?]], foot, footOk, extra:[nodes]}
  function screen(ui, o) {
    var el = ui.el, box = el('div', { class: 'ar-scr', style: { '--ac': o.ac || '#ffd84a' } });
    var rk = o.rank;
    box.appendChild(el('div', { class: 'ar-top' }, [
      el('div', null, [el('div', { class: 'ar-ttl', text: o.title || 'Game over' }), el('div', { class: 'ar-score', html: ui.esc(o.score) + (o.unit ? '<small>' + ui.esc(o.unit) + '</small>' : '') })]),
      rk ? el('div', { class: 'ar-rank' + (rk.cls ? ' ' + rk.cls : ''), text: rk.t }) : null
    ]));
    var st = el('div', { class: 'ar-st' });
    (o.stats || []).forEach(function (x) {
      if (!x || x[1] == null || x[1] === '' || x[1] === false) return;
      st.appendChild(el('div', { class: 'ar-s' }, [el('b', null, [x[3] ? el('span', { class: 'ar-dot', style: { background: x[3] } }) : null, el('span', { text: String(x[1]) })]), el('small', { text: x[0] }), x[2] ? el('i', { text: x[2] }) : null]));
    });
    box.appendChild(el('div', { class: 'ar-body' + (o.side ? ' side' : '') }, [o.pic ? el('div', { class: 'ar-pic', style: o.picMax ? { 'max-width': o.picMax + 'px' } : null, html: o.pic }) : null, st]));
    (o.extra || []).forEach(function (x) { if (x) box.appendChild(x); });
    if (o.foot) box.appendChild(el('div', { class: 'ar-foot' + (o.footOk ? ' ok' : ''), text: o.foot }));
    return box;
  }
  function svg(w, h, body, o) {
    o = o || {};
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="' + (o.aria || 'How the run ended') + '"' + (o.crisp ? ' shape-rendering="crispEdges"' : '') + '>' + body + '</svg>';
  }
  function key(ui, list) { return ui.el('div', { class: 'ar-kz' }, list.map(function (x) { return ui.el('span', null, [ui.el('i', { style: { background: x[1] } }), ui.el('span', { text: x[0] })]); })); }
  function rnd(seed) { var s = seed % 2147483647; if (s <= 0) s += 2147483646; return function () { s = s * 16807 % 2147483647; return (s - 1) / 2147483646; }; }

  // ═══ Tetris ═══
  var TET = { I: '#2fd0f0', J: '#4f6cf0', L: '#ff8f2a', O: '#ffd22e', S: '#4fd65a', T: '#b45ef0', Z: '#ff4058', G: '#6c6888' };
  R('tetris', function (e, ui) {
    var d = e.dt; if (!d || !d.b) return null;
    var rows = d.b, C = 10, cs = 10, over = d.over || 0, H = rows.length * cs, s = '';
    s += '<rect width="' + (C * cs + 4) + '" height="' + (H + 4) + '" fill="#2a2f4a"/><rect x="2" y="2" width="' + C * cs + '" height="' + H + '" fill="#0c0e1c"/>';
    for (var x = 1; x < C; x++) s += '<rect x="' + (2 + x * cs) + '" y="' + (2 + over * cs) + '" width=".4" height="' + (H - over * cs) + '" fill="rgba(255,255,255,.05)"/>';
    rows.forEach(function (row, r) {
      for (var c = 0; c < C; c++) {
        var col = TET[row.charAt(c)]; if (!col) continue;
        var px = 2 + c * cs, py = 2 + r * cs;
        s += '<rect x="' + px + '" y="' + py + '" width="' + cs + '" height="' + cs + '" fill="' + col + '"/>' +
          '<rect x="' + px + '" y="' + py + '" width="' + cs + '" height="2" fill="rgba(255,255,255,.35)"/><rect x="' + px + '" y="' + py + '" width="2" height="' + cs + '" fill="rgba(255,255,255,.2)"/>' +
          '<rect x="' + px + '" y="' + (py + cs - 2) + '" width="' + cs + '" height="2" fill="rgba(0,0,0,.3)"/><rect x="' + (px + cs - 2) + '" y="' + py + '" width="2" height="' + cs + '" fill="rgba(0,0,0,.2)"/>';
      }
    });
    if (over) s += '<rect x="2" y="' + (2 + over * cs - 0.6) + '" width="' + C * cs + '" height="1.2" fill="#ff4058"/>';
    var cl = d.cl || [0, 0, 0, 0];
    return withRun(ui, d.run, { ac: '#b45ef0', noLives: true }, screen(ui, {
      ac: '#b45ef0', title: 'Game over' + (d.cls ? ' · Classic' : ''), score: n(myScore(e)), rank: rankText(d),
      pic: svg(C * cs + 4, H + 4, s, { crisp: true, aria: 'The final stack' }), side: true, picMax: 150,
      stats: [['Level', d.lv, d.sl > 1 ? 'started at ' + d.sl : ''], ['Lines', n(d.ln)], ['Tetrises', cl[3] || 0, cl[0] || cl[1] || cl[2] ? 'singles ' + cl[0] + ' · doubles ' + cl[1] + ' · triples ' + cl[2] : ''],
        ['Blocks', n(d.pcs)], d.ts ? ['T-spins', d.ts] : null, d.cb >= 2 ? ['Best combo', d.cb + ' in a row'] : null, d.b2b ? ['Back-to-back', d.b2b] : null,
        d.pc ? ['Perfect clears', d.pc] : null, d.bm >= 300 ? ['Best move', n(d.bm), d.bmn] : null, d.t ? ['Time', mmss(d.t)] : null],
      foot: over ? 'Stacked past the top' : 'Topped out'
    }));
  });

  // ═══ Snake ═══
  R('snake', function (e, ui) {
    var d = e.dt; if (!d || !d.hd) return null;
    var sz = String(d.sz || '16x20').split('x'), C = +sz[0] || 16, Rn = +sz[1] || 20, cs = 10, s = '';
    for (var r = 0; r < Rn; r++) for (var c = 0; c < C; c++) s += '<rect x="' + c * cs + '" y="' + r * cs + '" width="' + cs + '" height="' + cs + '" fill="' + ((r + c) % 2 ? '#3f8f3a' : '#47a042') + '"/>';
    function xy(str) { var a = String(str || '').split(','); return a.length === 2 && a[0] !== '' ? { x: +a[0], y: +a[1] } : null; }
    // rebuild the body from the head and the direction letters
    var h = xy(d.hd), pts = [h], D = { r: [1, 0], l: [-1, 0], d: [0, 1], u: [0, -1] };
    String(d.p || '').split('').forEach(function (ch) { var p = pts[pts.length - 1], m = D[ch] || [0, 0]; pts.push({ x: (p.x + m[0] + C) % C, y: (p.y + m[1] + Rn) % Rn }); });
    var runs = [[pts[0]]];
    for (var i = 1; i < pts.length; i++) { var a = pts[i - 1], b = pts[i]; if (Math.abs(a.x - b.x) + Math.abs(a.y - b.y) > 1) runs.push([]); runs[runs.length - 1].push(b); }
    function line(w, col, dy) { return runs.map(function (rn) { return '<polyline points="' + rn.map(function (p) { return (p.x * cs + 5) + ',' + (p.y * cs + 5 + (dy || 0)); }).join(' ') + '" fill="none" stroke="' + col + '" stroke-width="' + w + '" stroke-linecap="round" stroke-linejoin="round"/>'; }).join(''); }
    function apple(p, gold) {
      if (!p || p.x < 0 || p.y < 0 || p.x >= C || p.y >= Rn) return '';
      var cx = p.x * cs + 5, cy = p.y * cs + 5.5;
      return gold ? '<circle cx="' + cx + '" cy="' + cy + '" r="3.8" fill="#ffd45a" stroke="#b07a10" stroke-width="1"/>'
        : '<circle cx="' + cx + '" cy="' + cy + '" r="3.8" fill="#ff3b4f"/><circle cx="' + (cx - 1.2) + '" cy="' + (cy - 1.3) + '" r="1" fill="rgba(255,255,255,.6)"/><path d="M' + cx + ' ' + (cy - 3.6) + 'q1.5 -2 3.3 -1.6" stroke="#2f7a24" stroke-width="1.2" fill="none"/>';
    }
    s += apple(xy(d.f)) + apple(xy(d.gd), true);
    s += line(8.8, 'rgba(0,0,0,.25)', 1.2) + line(8.8, '#1f3e9e') + line(7.4, '#4a7cf0') + line(2, 'rgba(170,205,255,.55)', -1.4);
    // head and eyes, looking the way it was going
    var hx = h.x * cs + 5, hy = h.y * cs + 5, dir = String(d.p || 'l').charAt(0) || 'l', back = D[dir], fx = -back[0], fy = -back[1];
    s += '<circle cx="' + hx + '" cy="' + hy + '" r="4.8" fill="#4a7cf0" stroke="#1f3e9e" stroke-width="1"/>';
    [-1, 1].forEach(function (k) { var ex = hx + fx * 1.6 + fy * k * 2, ey = hy + fy * 1.6 - fx * k * 2; s += '<circle cx="' + ex + '" cy="' + ey + '" r="1.5" fill="#fff"/><circle cx="' + (ex + fx * .5) + '" cy="' + (ey + fy * .5) + '" r=".8" fill="#111"/>'; });
    var cr = xy(d.cr);
    if (cr && d.why !== 'full') {
      var kx = Math.max(0, Math.min(C - 1, cr.x)) * cs + 5, ky = Math.max(0, Math.min(Rn - 1, cr.y)) * cs + 5;
      if (cr.x < 0) kx = 1.5; if (cr.x >= C) kx = C * cs - 1.5; if (cr.y < 0) ky = 1.5; if (cr.y >= Rn) ky = Rn * cs - 1.5;
      s += '<g stroke="#fff" stroke-width="3.2" stroke-linecap="round"><path d="M' + (kx - 3) + ' ' + (ky - 3) + 'l6 6M' + (kx + 3) + ' ' + (ky - 3) + 'l-6 6"/></g><g stroke="#ff2e48" stroke-width="1.8" stroke-linecap="round"><path d="M' + (kx - 3) + ' ' + (ky - 3) + 'l6 6M' + (kx + 3) + ' ' + (ky - 3) + 'l-6 6"/></g>';
    }
    var SP = { relaxed: 'Relaxed', normal: 'Normal', fast: 'Fast', turbo: 'Turbo' };
    return withRun(ui, d.run, { ac: '#7dff9a', noStrip: true, noLives: true }, screen(ui, {
      ac: '#7dff9a', title: d.why === 'full' ? 'Board filled!' : 'Game over', score: n(myScore(e)), rank: rankText(d),
      pic: svg(C * cs, Rn * cs, s, { aria: 'The snake when the game ended' }), side: true, picMax: 160,
      stats: [['Length', d.ml], ['Apples', n(d.ap), d.gl ? d.gl + ' golden' : ''], ['Speed', SP[d.sp] || d.sp], ['Edges', d.w ? 'Wrap around' : 'Solid walls', d.w && d.wr ? 'wrapped ' + d.wr + '×' : ''],
        d.t ? ['Time', mmss(d.t)] : null, d.st ? ['Moves', n(d.st)] : null],
      foot: d.why === 'full' ? 'Filled the whole board' : d.why === 'wall' ? 'Crashed into the wall' : 'Ran into its own tail', footOk: d.why === 'full'
    }));
  });

  // ═══ Pac-Man ═══
  var PMAP = [
    '############################', '#............##............#', '#.####.#####.##.#####.####.#', '#o####.#####.##.#####.####o#',
    '#.####.#####.##.#####.####.#', '#..........................#', '#.####.##.########.##.####.#', '#.####.##.########.##.####.#',
    '#......##....##....##......#', '######.##### ## #####.######', '######.##### ## #####.######', '######.##          ##.######',
    '######.## ###--### ##.######', '######.## #______# ##.######', '      .   #______#   .      ', '######.## #______# ##.######',
    '######.## ######## ##.######', '######.##          ##.######', '######.## ######## ##.######', '######.## ######## ##.######',
    '#............##............#', '#.####.#####.##.#####.####.#', '#.####.#####.##.#####.####.#', '#o..##.......  .......##..o#',
    '###.##.##.########.##.##.###', '###.##.##.########.##.##.###', '#......##....##....##......#', '#.##########.##.##########.#',
    '#.##########.##.##########.#', '#..........................#', '############################'
  ];
  var GHOST = [['Blinky', '#ff3d4a'], ['Pinky', '#ff9ee2'], ['Inky', '#3fe3ff'], ['Clyde', '#ffae42']];
  R('pacman', function (e, ui) {
    var d = e.dt; if (!d || !d.dots) return null;
    var COLS = 28, ROWS = 31, T = 8, s = '<rect width="224" height="248" fill="#000"/>';
    function wall(c, r) { if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return false; var ch = PMAP[r].charAt(c); return ch === '#'; }
    // wall outlines: an edge wherever a wall tile meets an open tile
    var path = '';
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
      if (!wall(c, r)) continue;
      var x = c * T, y = r * T;
      if (r > 0 && !wall(c, r - 1)) path += 'M' + x + ' ' + (y + 1.5) + 'h' + T;
      if (r < ROWS - 1 && !wall(c, r + 1)) path += 'M' + x + ' ' + (y + T - 1.5) + 'h' + T;
      if (c > 0 && !wall(c - 1, r)) path += 'M' + (x + 1.5) + ' ' + y + 'v' + T;
      if (c < COLS - 1 && !wall(c + 1, r)) path += 'M' + (x + T - 1.5) + ' ' + y + 'v' + T;
    }
    s += '<path d="' + path + '" stroke="#2b4dff" stroke-width="1.6" stroke-linecap="square" fill="none"/>';
    s += '<rect x="104" y="99" width="16" height="2" fill="#ffb8de"/>';
    var bits = String(d.dots).split('').map(function (h) { return ('000' + parseInt(h, 16).toString(2)).slice(-4); }).join(''), k = 0, left = 0;
    for (r = 0; r < ROWS; r++) for (c = 0; c < COLS; c++) {
      var ch = PMAP[r].charAt(c); if (ch !== '.' && ch !== 'o') continue;
      if (bits.charAt(k++) === '1') { left++; s += ch === 'o' ? '<circle cx="' + (c * T + 4) + '" cy="' + (r * T + 4) + '" r="3.2" fill="#ffb8a0"/>' : '<rect x="' + (c * T + 3) + '" y="' + (r * T + 3) + '" width="2" height="2" fill="#ffb8a0"/>'; }
    }
    // ghosts
    String(d.gh || '').split(';').forEach(function (g, i) {
      var a = g.split(','); if (a.length < 2) return;
      var gx = +a[0], gy = +a[1], st = a[2], col = st === 'f' ? '#2140ff' : GHOST[i] ? GHOST[i][1] : '#fff';
      if (st !== 'e') s += '<path d="M' + (gx - 6) + ' ' + (gy + 6) + 'v-6a6 6 0 0 1 12 0v6l-2 -2l-2 2l-2 -2l-2 2l-2 -2z" fill="' + col + '"/>';
      [-2.4, 2.4].forEach(function (o) { s += '<circle cx="' + (gx + o) + '" cy="' + (gy - 1) + '" r="1.8" fill="#fff"/><circle cx="' + (gx + o - .5) + '" cy="' + (gy - 1) + '" r=".9" fill="#1a2bd6"/>'; });
    });
    // Pac-Man where the last life was lost
    var pa = String(d.pac || '').split(',');
    if (pa.length >= 2) {
      var px = +pa[0], py = +pa[1], ang = [-90, 180, 90, 0][+pa[2] || 0] * Math.PI / 180, m = 0.7;
      var x1 = px + 6.5 * Math.cos(ang - m), y1 = py + 6.5 * Math.sin(ang - m), x2 = px + 6.5 * Math.cos(ang + m), y2 = py + 6.5 * Math.sin(ang + m);
      s += '<path d="M' + px + ' ' + py + 'L' + x1.toFixed(1) + ' ' + y1.toFixed(1) + 'A6.5 6.5 0 1 0 ' + x2.toFixed(1) + ' ' + y2.toFixed(1) + 'Z" fill="#ffd84a" transform="rotate(0)"/>';
    }
    var dd = d.dd || [], last = dd[dd.length - 1];
    var lost = dd.length ? key(ui, dd.map(function (x) { var g = GHOST.filter(function (q) { return q[0] === x.b; })[0]; return [x.b + ' · level ' + x.l, g ? g[1] : '#888']; })) : null;
    return withRun(ui, d.run, { ac: '#ffd84a' }, screen(ui, {
      ac: '#ffd84a', title: 'Game over · level ' + d.lv, score: n(myScore(e)), rank: rankText(d),
      pic: svg(224, 248, s, { aria: 'The maze when the last life was lost' }), picMax: 300,
      stats: [['Level', d.lv], ['Dots eaten', (d.ea || 0) + '/244', left ? left + ' left' : ''], ['Ghosts eaten', d.ge || 0, d.mc > 1 ? 'best streak ' + d.mc : ''],
        d.q4 ? ['All four', d.q4 + '×'] : null, ['Fruit', d.fr || 0, d.bf ? 'best: ' + d.bf.toLowerCase() : ''], d.pp ? ['Power pellets', d.pp] : null, d.el ? ['Extra life', 'Level ' + d.el] : null],
      extra: lost && !d.run ? [ui.el('div', { class: 'ar-sub', text: 'Lives lost to', style: { 'text-align': 'center' } }), lost] : null,
      foot: last ? 'Caught by ' + last.b : ''
    }));
  });

  // ═══ Breakout ═══
  var BRK = { w: '#f2f2f6', o: '#ff8a2a', c: '#2fd3e0', g: '#3ddc5a', r: '#ff3b4f', b: '#3d6cff', p: '#ff5cc8', y: '#ffd02e', s: '#b8c0d0', '#': '#d9a520' };
  var POW = { W: ['Wide', '#4d8bff'], M: ['Multiball', '#2fd3c0'], S: ['Slow', '#ff9a2e'], L: ['Laser', '#ff3b4f'], P: ['Extra life', '#b8c0d0'] };
  R('breakout', function (e, ui) {
    var d = e.dt; if (!d || !d.g) return null;
    var BW = 30, BH = 14, G = 2, C = 11, W = C * BW + (C - 1) * G + 20, top = 16, rows = d.g, left = 0, broke = 0;
    var Hh = top + rows.length * (BH + 3) + 90, s = '<rect width="' + W + '" height="' + Hh + '" fill="#0a0c18"/>';
    s += '<rect x="2" y="2" width="' + (W - 4) + '" height="' + (Hh - 2) + '" fill="none" stroke="#3a4060" stroke-width="3"/>';
    rows.forEach(function (row, r) {
      for (var c = 0; c < C; c++) {
        var ch = row.charAt(c), x = 10 + c * (BW + G), y = top + r * (BH + 3);
        if (ch === '.' || !ch) continue;
        if (ch === '-') { broke++; s += '<rect x="' + (x + .5) + '" y="' + (y + .5) + '" width="' + (BW - 1) + '" height="' + (BH - 1) + '" rx="2" fill="none" stroke="rgba(255,255,255,.12)" stroke-dasharray="2 2"/>'; continue; }
        if (ch !== '#') left++;
        s += '<rect x="' + x + '" y="' + y + '" width="' + BW + '" height="' + BH + '" rx="2" fill="' + (BRK[ch] || '#888') + '"/><rect x="' + x + '" y="' + y + '" width="' + BW + '" height="3" rx="1" fill="rgba(255,255,255,.4)"/><rect x="' + x + '" y="' + (y + BH - 3) + '" width="' + BW + '" height="3" fill="rgba(0,0,0,.25)"/>';
      }
    });
    s += '<rect x="' + (W / 2 - 31) + '" y="' + (Hh - 26) + '" width="62" height="10" rx="5" fill="#c9cfe0"/><rect x="' + (W / 2 - 31) + '" y="' + (Hh - 26) + '" width="8" height="10" rx="3" fill="#ff3b4f"/><rect x="' + (W / 2 + 23) + '" y="' + (Hh - 26) + '" width="8" height="10" rx="3" fill="#ff3b4f"/>';
    var pk = d.pk || {}, pws = Object.keys(pk).filter(function (k) { return POW[k]; }).sort(function (a, b) { return pk[b] - pk[a]; });
    var chips = pws.length ? ui.chips(pws.map(function (k) { return { t: POW[k][0] + ' ×' + pk[k], c: POW[k][1] }; })) : null;
    if (chips) chips.style.justifyContent = 'center';
    return withRun(ui, d.run, { ac: '#ff5c7a', why: function (w) { return w === 'ball' ? 'missed the ball' : w; }, lifeWord: 'Ball' }, screen(ui, {
      ac: '#ff5c7a', title: d.won ? 'All ' + (d.of || 12) + ' levels cleared!' : 'Game over · ' + d.nm, score: n(myScore(e)), rank: rankText(d),
      pic: svg(W, Hh, s, { aria: 'The wall as it was left' }), picMax: 320,
      stats: [['Level', d.lv + (d.of ? '/' + d.of : ''), d.nm], ['Bricks smashed', n(d.br)], d.won ? null : ['Bricks left', left], ['Levels cleared', d.cl || 0],
        d.mc ? ['Best chain', d.mc] : null, ['Power-ups', d.pw || 0], d.mb > 1 ? ['Most balls', d.mb] : null, d.ph ? ['Paddle hits', n(d.ph)] : null],
      extra: [chips],
      foot: d.won ? 'Beat every level' : 'Lost the last ball on level ' + d.lv, footOk: !!d.won
    }));
  });

  // ═══ Flappy Bird ═══
  var SKY = { day: ['#4fb4ea', '#8fd6f5', '#d6f3ff', '#5fbf4a'], dusk: ['#3a3a8c', '#d0739a', '#ffc27a', '#3f8f52'], night: ['#0b1636', '#1d3466', '#3b5a8c', '#2c6a48'] };
  var BIRD = [['#ffcc2e', '#e89a10'], ['#4fb8ff', '#1f7fd1'], ['#ff6a55', '#d6362a']];
  var MEDAL = [null, ['Bronze', '#cd7f32'], ['Silver', '#c9d1dc'], ['Gold', '#ffd24a'], ['Platinum', '#e8f4ff']];
  R('flappybird', function (e, ui) {
    var d = e.dt; if (!d || !d.H) return null;
    var W = 288, H = d.H, GR = d.gr || 72, sky = SKY[d.th] || SKY.day, s = '';
    s += '<defs><linearGradient id="fbsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + sky[0] + '"/><stop offset=".6" stop-color="' + sky[1] + '"/><stop offset="1" stop-color="' + sky[2] + '"/></linearGradient>' +
      '<linearGradient id="fbpipe" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#5aa832"/><stop offset=".35" stop-color="#9be15a"/><stop offset="1" stop-color="#3f7f1f"/></linearGradient></defs>';
    s += '<rect width="' + W + '" height="' + H + '" fill="url(#fbsky)"/>';
    if (d.th === 'night') for (var i = 0; i < 18; i++) s += '<rect x="' + (i * 53 % W) + '" y="' + (i * 37 % (H * .5)) + '" width="1.5" height="1.5" fill="#fff" opacity=".7"/>';
    s += '<path d="M0 ' + (H - GR - 26) + ' q20 -18 40 0 q20 -24 46 0 q22 -16 44 0 q24 -22 50 0 q20 -16 40 0 q22 -20 46 0 q12 -10 22 0 V' + (H - GR) + ' H0Z" fill="' + sky[3] + '"/>';
    (d.p || []).forEach(function (p) {
      var t = p.y - p.g / 2, b = p.y + p.g / 2;
      s += '<rect x="' + p.x + '" y="0" width="' + p.w + '" height="' + (t - 24) + '" fill="url(#fbpipe)" stroke="#2c5222" stroke-width="2"/>';
      s += '<rect x="' + (p.x - 3) + '" y="' + (t - 24) + '" width="' + (p.w + 6) + '" height="24" fill="url(#fbpipe)" stroke="#2c5222" stroke-width="2"/>';
      s += '<rect x="' + p.x + '" y="' + (b + 24) + '" width="' + p.w + '" height="' + (H - GR - b - 24) + '" fill="url(#fbpipe)" stroke="#2c5222" stroke-width="2"/>';
      s += '<rect x="' + (p.x - 3) + '" y="' + b + '" width="' + (p.w + 6) + '" height="24" fill="url(#fbpipe)" stroke="#2c5222" stroke-width="2"/>';
    });
    s += '<rect y="' + (H - GR) + '" width="' + W + '" height="' + GR + '" fill="#ded895"/><rect y="' + (H - GR) + '" width="' + W + '" height="12" fill="#7cc84a"/><rect y="' + (H - GR + 12) + '" width="' + W + '" height="2" fill="#5a9a32"/>';
    // the path it flew in its last seconds (dots trail off behind the bird)
    var tr = String(d.tr || '').split(',').filter(function (v) { return v !== ''; }).map(Number), sp = d.sp || 118, bx = d.bx || 86;
    tr.forEach(function (y, j) { var x = bx - (tr.length - 1 - j) * sp * 0.1; if (x < -4) return; s += '<circle cx="' + x.toFixed(1) + '" cy="' + y + '" r="2.4" fill="#fff" opacity="' + (0.3 + 0.6 * j / tr.length).toFixed(2) + '"/>'; });
    var bc = BIRD[d.bc] || BIRD[0];
    s += '<g transform="translate(' + bx + ' ' + d.by + ') rotate(' + (d.ba || 0) + ')"><ellipse rx="13" ry="10" fill="' + bc[0] + '" stroke="#222" stroke-width="2"/><ellipse cx="-4" cy="2" rx="7" ry="4.5" fill="#fff8d0" stroke="#222" stroke-width="1.5"/>' +
      '<circle cx="5" cy="-4" r="4.5" fill="#fff" stroke="#222" stroke-width="1.5"/><circle cx="6.5" cy="-4" r="1.8" fill="#222"/><path d="M8 1 h9 l-2 4 h-7z" fill="#ff7a1f" stroke="#222" stroke-width="1.5"/></g>';
    var m = MEDAL[d.md || 0];
    return screen(ui, {
      ac: '#7cd3ff', title: (d.wild ? 'Wild pipes · ' : '') + 'Game over', score: n(myScore(e)), unit: myScore(e) === 1 ? 'pipe' : 'pipes', rank: rankText(d, 'pipes'),
      pic: svg(W, H, s, { aria: 'The last screen of the flight' }), side: true, picMax: 150,
      stats: [['Medal', m ? m[0] : 'None', m ? '' : (10 - myScore(e)) + ' more for bronze', m ? m[1] : null], ['Time in the air', d.t ? d.t.toFixed(1) + 's' : ''], ['Flaps', d.fl],
        d.rn > 1 ? ['Flight', '#' + d.rn, 'best this sitting: ' + d.sb] : null, ['Sky', d.th === 'dusk' ? 'Sunset' : d.th === 'night' ? 'Night' : 'Day']],
      foot: d.cs === 'ground' ? 'Dropped to the ground' : 'Clipped a pipe'
    });
  });

  // ═══ Asteroids ═══
  R('asteroids', function (e, ui) {
    var d = e.dt; if (!d || !d.w) return null;
    var W = d.w, H = d.h, s = '<rect width="' + W + '" height="' + H + '" fill="#03040a" stroke="#2a2f4a" stroke-width="6"/>', rr = rnd(W * 31 + H);
    for (var i = 0; i < 40; i++) s += '<rect x="' + (rr() * W).toFixed(0) + '" y="' + (rr() * H).toFixed(0) + '" width="3" height="3" fill="#fff" opacity="' + (0.2 + rr() * 0.5).toFixed(2) + '"/>';
    var RAD = [0, 10, 19, 36];
    (d.rk || []).forEach(function (k, j) {
      var r = RAD[k.s] || 19, nn = k.s === 1 ? 8 : 11, g = rnd(j * 977 + k.x * 7 + k.y), pts = [], a0 = g() * 6.28;
      for (var q = 0; q < nn; q++) { var a = a0 + q / nn * 6.283, rad = r * (g() < 0.25 ? 0.62 + g() * 0.16 : 0.86 + g() * 0.2); pts.push((k.x + Math.cos(a) * rad).toFixed(1) + ',' + (k.y + Math.sin(a) * rad).toFixed(1)); }
      s += '<polygon points="' + pts.join(' ') + '" fill="rgba(255,255,255,.04)" stroke="#dfe6ff" stroke-width="4" stroke-linejoin="round"/>';
    });
    if (d.uf) { var u = d.uf.split(','), ux = +u[0], uy = +u[1], us = u[2] === 's' ? 0.65 : 1; s += '<g transform="translate(' + ux + ' ' + uy + ') scale(' + us + ')" fill="none" stroke="#ff7ad9" stroke-width="4"><path d="M-14 0h28l-8 6h-12zM-14 0l8 -5h12l8 5M-5 -5l2 -5h6l2 5"/></g>'; }
    if (d.sh) {
      // the lost ship, broken into its three lines
      var sh = d.sh.split(','), sx = +sh[0], sy = +sh[1], sa = (+sh[2] || 0) * 180 / Math.PI;
      s += '<g transform="translate(' + sx + ' ' + sy + ') rotate(' + sa.toFixed(1) + ')" stroke="#9ff3ff" stroke-width="4" stroke-linecap="round"><path d="M15 -2L-8 -12M15 3L-7 13M-11 -5L-10 6"/></g>';
      s += '<circle cx="' + sx + '" cy="' + sy + '" r="30" fill="none" stroke="#9ff3ff" stroke-opacity=".45" stroke-width="2.5" stroke-dasharray="6 8"/>';
    }
    var rb = d.rb || [0, 0, 0], tot = (rb[0] || 0) + (rb[1] || 0) + (rb[2] || 0), dd = d.dd || [], last = dd[dd.length - 1];
    var acc = d.sx ? Math.round((d.hx || 0) / d.sx * 100) + '%' : '';
    return withRun(ui, d.run, { ac: '#9ff3ff', unit: 'Wave', lifeWord: 'Ship' }, screen(ui, {
      ac: '#9ff3ff', title: 'Game over · wave ' + d.wv, score: n(myScore(e)), rank: rankText(d),
      pic: svg(W, H, s, { aria: 'The field when the last ship was lost' }), side: true, picMax: 150,
      stats: [['Wave', d.wv], ['Rocks', n(tot), rb[2] + ' big · ' + rb[1] + ' med · ' + rb[0] + ' small'], ['Accuracy', acc, d.sx ? n(d.sx) + ' shots' : ''],
        d.ub || d.us ? ['Saucers', (d.ub || 0) + (d.us || 0), d.us ? d.us + ' small (1,000 each)' : ''] : null,
        d.hy ? ['Hyperspace', d.hy + '×', d.hd ? 'landed on a rock ' + d.hd + '×' : ''] : null, d.ex ? ['Extra ships', d.ex] : null,
        dd.length ? ['Ships lost', dd.length] : null],
      foot: last ? 'Last ship lost to ' + last.b : ''
    }));
  });

  // ═══ Peggle ═══
  var PEG = { b: '#2f7ff0', o: '#ff7417', p: '#a24cf0', g: '#1fbf55' };
  var PEG_LV = typeof PEGGLE_LEVELS !== 'undefined' ? PEGGLE_LEVELS : ['First Light', 'Rainbow Arches', 'Spiral', 'Bubbles', 'Hourglass', 'Diamonds', 'Twin Peaks', 'The Wheel', 'Sliders', 'Orbits', 'Pendulum', 'Galaxy', 'Clockwork'];   // names from games.js
  R('peggle', function (e, ui) {
    var d = e.dt;
    // a full game: levels 1 to 13 in a row, a bar for each level's score
    if (d && d.run && Array.isArray(d.lv)) {
      var lv = d.lv.map(function (v) { return Number(v) || 0; }), top = Math.max.apply(null, lv.concat([1])), bi = lv.indexOf(top);
      var BW = 22, GP = 5, CH = 120, W = lv.length * (BW + GP) + GP, s2 = '<rect width="' + W + '" height="' + (CH + 22) + '" rx="6" fill="#0b0b1c"/>';
      lv.forEach(function (v, i) {
        var h = Math.max(2, Math.round(v / top * (CH - 10))), x = GP + i * (BW + GP);
        s2 += '<rect x="' + x + '" y="' + (CH - h) + '" width="' + BW + '" height="' + h + '" rx="3" fill="' + (d.out && i === lv.length - 1 ? '#8b93b8' : i === bi ? '#ffd45a' : PEG.o) + '"/>' +
          '<text x="' + (x + BW / 2) + '" y="' + (CH + 15) + '" text-anchor="middle" font-size="11" font-weight="800" fill="rgba(233,236,255,.6)" font-family="ui-monospace,monospace">' + (i + 1) + '</text>';
      });
      return screen(ui, {
        ac: '#ffd45a', title: d.out ? 'Full game · out on level ' + d.out : 'Full game · all ' + (d.of || lv.length) + ' levels', score: n(myScore(e)), rank: rankText(d),
        pic: svg(W, CH + 22, s2, { aria: 'Score on each level, level 1 to ' + lv.length }), picMax: 360,
        stats: [['Cleared', (d.out ? d.out - 1 : lv.length) + '/' + (d.of || lv.length), 'levels in a row'], ['Best level', n(top), (bi + 1) + ' · ' + (PEG_LV[bi] || '')],
          d.out ? ['Ended', 'Level ' + d.out, 'out of balls'] : d.rt ? ['Retries', d.rt, 'after running out of balls'] : ['Ended', 'Level ' + lv.length, 'all cleared']],
        foot: d.out ? 'Out of balls on level ' + d.out + (PEG_LV[d.out - 1] ? ' (' + PEG_LV[d.out - 1] + ')' : '') : 'Full game complete', footOk: !d.out
      });
    }
    if (!d || d.n == null) return null;
    var pic = null;
    if (d.pg) {
      var W = 360, y0 = 80, y1 = 590, s = '<defs><radialGradient id="pgbg" cx=".5" cy=".3" r=".9"><stop offset="0" stop-color="#26285a"/><stop offset="1" stop-color="#0b0b1c"/></radialGradient></defs><rect y="' + y0 + '" width="' + W + '" height="' + (y1 - y0) + '" fill="url(#pgbg)"/>';
      var hit = { o: 0, b: 0, g: 0, p: 0 };
      String(d.pg).split(';').forEach(function (t) {
        var m = /^([-\d,]+)([a-zA-Z])$/.exec(t); if (!m) return;
        var v = m[1].split(',').map(Number), c = m[2], gone = c === c.toUpperCase(), col = PEG[c.toLowerCase()] || '#888';
        if (gone) hit[c.toLowerCase()] = (hit[c.toLowerCase()] || 0) + 1;
        if (v.length === 4) s += '<line x1="' + v[0] + '" y1="' + v[1] + '" x2="' + v[2] + '" y2="' + v[3] + '" stroke="' + (gone ? 'rgba(255,255,255,.12)' : col) + '" stroke-width="10" stroke-linecap="round"' + (gone ? ' stroke-dasharray="1 4"' : '') + '/>';
        else if (gone) s += '<circle cx="' + v[0] + '" cy="' + v[1] + '" r="7.5" fill="none" stroke="' + col + '" stroke-opacity=".7" stroke-width="2" stroke-dasharray="3 2.5"/>';
        else s += '<circle cx="' + v[0] + '" cy="' + v[1] + '" r="9" fill="' + col + '"/><circle cx="' + (v[0] - 2.5) + '" cy="' + (v[1] - 3) + '" r="3" fill="rgba(255,255,255,.45)"/>';
      });
      pic = svg(W, y1 - y0, '<g transform="translate(0 ' + -y0 + ')">' + s + '</g>', { aria: 'The pegs at the end: solid pegs were left, faint rings were cleared' });
    }
    var MA = { guide: 'Super Guide', random: 'Random', off: 'None' };
    var keyNode = pic ? key(ui, [['Solid: still up', '#ff7417'], ['Ring: cleared', 'rgba(255,255,255,.35)']]) : null;
    return screen(ui, {
      ac: d.won ? '#7dff9a' : '#ff9a4a', title: 'Level ' + d.n + ' · ' + d.nm, score: n(myScore(e)), rank: rankText(d),
      pic: pic, picMax: 250,
      stats: [['Orange pegs', ((d.to || 25) - (d.ol || 0)) + '/' + (d.to || 25), d.ol ? d.ol + ' left' : 'all cleared'], ['Shots', d.sh], ['Balls left', d.bl],
        d.ms ? ['Best shot', n(d.ms)] : null, d.mh ? ['Most pegs', d.mh, 'in one shot'] : null, d.fb ? ['Fever bucket', n(d.fb)] : null,
        d.fr ? ['Free balls', d.fr] : null, d.lg ? ['Long shots', d.lg] : null, d.wl ? ['Off the wall', d.wl] : null, d.pw ? ['Green power', d.pw + '×', MA[d.ma] || ''] : null],
      extra: [keyNode],
      foot: d.won ? 'Level cleared' : 'Out of balls', footOk: !!d.won
    });
  });

  // ═══ Q*bert ═══
  var QDEATH = { red: 'a red ball', purple: 'the purple ball', coily: 'Coily', ugg: 'Ugg', wrong: 'Wrongway', fall: 'jumping off the edge' };
  R('cubehopper', function (e, ui) {
    var d = e.dt; if (!d || !d.cb) return null;
    var col = String(d.col || '').split(','), L = col[0] || '#cdb98a', Rt = col[1] || '#55636b', tops = col.slice(2), steps = d.st || 1;
    var W = 44, HW = 22, TH = 12, SH = 26, DY = TH + SH, AX = 170, AY = 22, s = '<rect width="340" height="300" fill="#06060c"/>', left = 0, cb = String(d.cb);
    function xy(r, c) { return { x: AX + (c - r / 2) * W, y: AY + r * DY }; }
    var k = 0;
    for (var r = 0; r < 7; r++) for (var c = 0; c <= r; c++) {
      var p = xy(r, c), st = +cb.charAt(k++) || 0, top = tops[steps === 1 ? (st ? 2 : 0) : Math.min(st, 2)] || '#888';
      if (st !== steps) left++;
      s += '<polygon points="' + (p.x - HW) + ',' + p.y + ' ' + p.x + ',' + (p.y + TH) + ' ' + p.x + ',' + (p.y + TH + SH) + ' ' + (p.x - HW) + ',' + (p.y + SH) + '" fill="' + L + '"/>';
      s += '<polygon points="' + (p.x + HW) + ',' + p.y + ' ' + p.x + ',' + (p.y + TH) + ' ' + p.x + ',' + (p.y + TH + SH) + ' ' + (p.x + HW) + ',' + (p.y + SH) + '" fill="' + Rt + '"/>';
      s += '<polygon points="' + p.x + ',' + (p.y - TH) + ' ' + (p.x + HW) + ',' + p.y + ' ' + p.x + ',' + (p.y + TH) + ' ' + (p.x - HW) + ',' + p.y + '" fill="' + top + '" stroke="rgba(0,0,0,.25)" stroke-width="1"/>';
    }
    String(d.ds || '').split(',').forEach(function (x) {
      var m = /^([LR])(\d)$/.exec(x); if (!m) return;
      var rw = +m[2], p = xy(rw, m[1] === 'L' ? 0 : rw), dx = m[1] === 'L' ? -W : W;
      s += '<ellipse cx="' + (p.x + dx) + '" cy="' + (p.y - 4) + '" rx="12" ry="5" fill="#ff5cc8" stroke="#ffd24a" stroke-width="2" stroke-dasharray="4 3"/>';
    });
    var q = String(d.q || '').split(',');
    if (q.length === 2) {
      var qp = xy(+q[0], +q[1]), qx = qp.x, qy = qp.y - 14;
      s += '<g><circle cx="' + qx + '" cy="' + qy + '" r="10" fill="#ff8a1f" stroke="#7a3500" stroke-width="1.5"/><path d="M' + (qx + 4) + ' ' + (qy + 1) + 'q8 1 8 7q-3 2 -6 -1q-3 -2 -4 -3z" fill="#ff8a1f" stroke="#7a3500" stroke-width="1.5"/>' +
        '<circle cx="' + (qx - 2) + '" cy="' + (qy - 3) + '" r="3" fill="#fff"/><circle cx="' + (qx + 3.5) + '" cy="' + (qy - 3) + '" r="3" fill="#fff"/><circle cx="' + (qx - 1) + '" cy="' + (qy - 3) + '" r="1.4" fill="#111"/><circle cx="' + (qx + 4.5) + '" cy="' + (qy - 3) + '" r="1.4" fill="#111"/>' +
        '<path d="M' + (qx - 4) + ' ' + (qy + 9) + 'v6h-3M' + (qx + 2) + ' ' + (qy + 9) + 'v6h-3" stroke="#7a3500" stroke-width="2" fill="none"/></g>';
    }
    var RULE = { one: 'One hop per cube', two: 'Two hops per cube', toggle: 'Hops flip cubes back', twoback: 'Two hops, slips back', tworeset: 'Two hops, resets' };
    var dths = d.d || {}, dk = Object.keys(dths).sort(function (a, b) { return dths[b] - dths[a]; });
    var lost = dk.length ? key(ui, dk.map(function (x) { return [(QDEATH[x] || x).replace(/^(a |the )/, '') + ' ×' + dths[x], x === 'coily' ? '#a24cf0' : x === 'red' ? '#ff3b4f' : x === 'purple' ? '#8a3fd0' : x === 'fall' ? '#5b6cc4' : '#3ddc5a']; })) : null;
    return withRun(ui, d.run, { ac: '#ff8a1f', unit: 'Round', why: function (w) { return QDEATH[w] || w; } }, screen(ui, {
      ac: '#ff8a1f', title: 'Game over · level ' + d.lv + '-' + d.rd, score: n(myScore(e)), rank: rankText(d),
      pic: svg(340, 300, s, { aria: 'The pyramid when the game ended' }), picMax: 300,
      stats: [['Level', d.lv + '-' + d.rd, RULE[d.rl] || ''], ['Cubes left', left + '/28'], ['Cubes changed', n(d.cu)], ['Hops', n(d.hp)], ['Rounds cleared', d.rr || 0, d.pf ? d.pf + ' without a slip' : ''],
        d.lu ? ['Coily lured', d.lu] : null, d.ca ? ['Slick & Sam', d.ca + ' caught'] : null, d.gr ? ['Green ball', d.gr + '× freeze'] : null, d.dc ? ['Disc rides', d.dc] : null, d.ex ? ['Extra lives', d.ex] : null],
      extra: lost && !d.run ? [ui.el('div', { class: 'ar-sub', text: 'Lives lost to', style: { 'text-align': 'center' } }), lost] : null,
      foot: d.ld && d.ld.k ? 'Last life lost to ' + (QDEATH[d.ld.k] || d.ld.k) : ''
    }));
  });

  // ═══ Pong ═══
  var PC = ['#38e1ff', '#ff4fa3'];
  R('paddleball', function (e, ui) {
    var d = e.dt; if (!d || d.sq == null) return null;
    var ps = e.players || [], nm = [ps[0] ? ps[0].name : 'Left', ps[1] ? ps[1].name : 'Right'], sc = [ps[0] ? ps[0].score : 0, ps[1] ? ps[1].score : 0];
    var seq = String(d.sq).split('').map(Number), rl = String(d.rl || '').split(',').filter(function (x) { return x !== ''; }).map(Number);
    var pic = null;
    if (seq.length) {
      // every point in order: bar = how long the rally went, colour = who won it, line = the lead
      var N = seq.length, W = 320, H = 150, mid = 78, bw = Math.min(14, (W - 20) / N), mx = Math.max(4, Math.max.apply(null, rl.concat([1]))), s = '<rect width="' + W + '" height="' + H + '" fill="#05060d"/>';
      s += '<line x1="10" y1="' + mid + '" x2="' + (W - 10) + '" y2="' + mid + '" stroke="rgba(255,255,255,.25)" stroke-dasharray="3 4"/>';
      var lead = 0, pts = ['10,' + mid], span = Math.max(1, (W - 20) / N), amp = Math.max(4, 0);
      var maxLead = 1; seq.forEach(function (p) { lead += p === 0 ? 1 : -1; maxLead = Math.max(maxLead, Math.abs(lead)); }); lead = 0;
      seq.forEach(function (p, i) {
        var x = 10 + i * span + (span - bw) / 2, hgt = Math.max(3, (rl[i] || 0) / mx * 52);
        s += p === 0 ? '<rect x="' + x.toFixed(1) + '" y="' + (mid - 4 - hgt).toFixed(1) + '" width="' + (bw * .8).toFixed(1) + '" height="' + hgt.toFixed(1) + '" fill="' + PC[0] + '" opacity=".85"/>'
          : '<rect x="' + x.toFixed(1) + '" y="' + (mid + 4) + '" width="' + (bw * .8).toFixed(1) + '" height="' + hgt.toFixed(1) + '" fill="' + PC[1] + '" opacity=".85"/>';
        lead += p === 0 ? 1 : -1;
        pts.push((10 + (i + 1) * span).toFixed(1) + ',' + (mid - lead / maxLead * 60).toFixed(1));
      });
      s += '<polyline points="' + pts.join(' ') + '" fill="none" stroke="#fff" stroke-opacity=".85" stroke-width="1.6" stroke-linejoin="round"/>';
      s += '<text x="12" y="12" font-size="9" font-weight="800" fill="' + PC[0] + '" font-family="ui-monospace,monospace">' + ui.esc(nm[0].toUpperCase()) + '</text><text x="12" y="' + (H - 5) + '" font-size="9" font-weight="800" fill="' + PC[1] + '" font-family="ui-monospace,monospace">' + ui.esc(nm[1].toUpperCase()) + '</text>';
      pic = svg(W, H, s, { aria: 'Every point: bars show how long each rally went, the line shows who was ahead' });
    }
    var avg = rl.length ? (rl.reduce(function (a, b) { return a + b; }, 0) / rl.length).toFixed(1) : '';
    var w = sc[0] >= sc[1] ? 0 : 1, two = function (a) { a = a || [0, 0]; return a[0] + ' – ' + a[1]; };
    var rank = d.cpu ? (d.hr === 1 ? { t: 'Longest rally record', cls: 'new' } : d.hr > 1 ? { t: 'Rally #' + d.hr + ' on the board' } : d.hb ? { t: 'Record rally: ' + d.hb } : null) : null;
    var pk = d.pk || {}, PN = { big: 'Big paddle', multi: 'Multi-ball', curve: 'Curve' };
    return screen(ui, {
      ac: PC[w], title: nm[w] + ' wins', score: sc[0] + ' – ' + sc[1], rank: rank, pic: pic, picMax: 340,
      stats: [['Longest rally', d.lg, 'hits'], avg ? ['Average rally', avg] : null, d.tp ? ['Top speed', d.tp + '×', 'the serve'] : null,
        ['Hits', two(d.ht)], ['Best run', two(d.br)], (d.md && (d.md[0] >= 3 || d.md[1] >= 3)) ? ['Most behind', two(d.md)] : null,
        (d.sm && d.sm[0] + d.sm[1]) ? ['Smashes', two(d.sm)] : null, (d.pw && d.pw[0] + d.pw[1]) ? ['Power-ups', two(d.pw), Object.keys(pk).map(function (k) { return (PN[k] || k) + ' ' + pk[k]; }).join(' · ')] : null,
        d.dc ? ['Deuce', 'Yes', 'win by 2'] : null],
      extra: pic ? [key(ui, [[nm[0] + ' point', PC[0]], [nm[1] + ' point', PC[1]], ['Lead', '#fff']])] : null,
      foot: 'First to ' + (d.to || 11), footOk: true
    });
  });
  // ═══ Pinball ═══
  // A dot-matrix picture of the game ball by ball (bar = points, label = how it drained), then the run's numbers.
  var PBT = { nebula: ['Nebula Run', '#22d3ee'], pirate: ["Pirate's Cove", '#fbbf24'], haunted: ['Haunted Manor', '#86efac'], jungle: ['Jungle Temple', '#f59e0b'], neon: ['Neon Nights', '#f472b6'], midway: ['Midway Mayhem', '#ef4444'] };
  var PBD = { L: 'LEFT', R: 'RIGHT', C: 'MIDDLE', T: 'TILT' }, PBDW = { L: 'the left outlane', R: 'the right outlane', C: 'down the middle', T: 'a tilt' };
  var PBF = [['pop', 'Pops'], ['sl', 'Slings'], ['su', 'Targets'], ['dt', 'Drops'], ['orb', 'Orbits'], ['spin', 'Spins'], ['lanes', 'Lanes'], ['lock', 'Locks'], ['wheel', 'Wheel'], ['ghost', 'Ghosts'], ['crypt', 'Crypt'], ['mag', 'Magnet'], ['dark', 'Lights out'], ['bh', 'Black holes'], ['storm', 'Storms'], ['cannon', 'Cannon shots'], ['direct', 'Direct hits'], ['idol', 'Idol strikes'], ['beat', 'On the beat'], ['kick', 'Kickbacks'], ['hand', 'Hand grabs'], ['attic', 'Attic'], ['cellar', 'Cellar'], ['mist', 'Mist freed'], ['magna', 'Magna saves'], ['grave', 'Grave Robber'], ['wiz', 'Wizard mode'], ['mode', 'Modes'], ['save', 'Saves'],
    // the 3D tables' own counters
    ['portraits', 'Portraits'], ['holo', 'Ghost sightings'], ['boo', 'Boos'],
    ['port', 'Ports plundered'], ['fort', 'Fort hits'], ['broadside', 'Broadsides'], ['kraken', 'Kraken grabs'], ['krakenmb', 'Kraken Multiball'], ['grab', 'Grabs'], ['whirl', 'Whirlpool'], ['rig', 'Rigging'], ['plank', 'Plank'], ['map', 'Map'], ['keg', 'Powder kegs'], ['dbl', 'Doubled'],
    ['ride', 'Wheel rides'], ['loop', 'Super-loops'], ['roof', 'Rooftop'], ['vip', 'VIP bank'], ['track', 'Tracks'], ['orbc', 'Orb catches'], ['orbmb', 'Orb Multiball'], ['wind', 'Wind'], ['sky', 'Skyline'], ['neo', 'N-E-O'], ['scoop', 'Backstage'], ['dj', 'DJ'],
    ['climb', 'Climbs'], ['feed', 'Serpent fed'], ['serpent', 'Serpent Multiball'], ['run', 'Boulder runs'], ['boulder', 'Boulder hits'], ['relic', 'Relics'], ['key', 'Keys'], ['temple', 'Temple collapses'], ['walls', 'Walls'], ['bridge', 'Rope bridge'],
    ['barker', 'Barker'], ['bell', 'Bells rung'], ['coaster', 'Coaster'], ['dunk', 'Dunks'], ['prize', 'Prizes'], ['ring', 'Ring toss'], ['strong', 'Strongman'], ['tickets', 'Tickets'], ['wheelmb', 'Wheel Multiball'], ['wl', 'W-I-N'],
    ['well', 'Gravity Well'], ['warp', 'Warp laps'], ['warpmb', 'Warp Multiball'], ['planet', 'Planets'], ['visit', 'Visits'], ['saucer', 'Saucer hits'], ['attack', 'Saucer attacks'], ['ship', 'Mothership'], ['tube', 'Tube ramp'], ['tp', 'Teleports'], ['am', 'Antimatter'], ['ast', 'Asteroids'], ['escape', 'Escapes']];
  // the same key means something else on some tables
  var PBX = { neon: { orb: 'Orb catches' }, midway: { ride: 'Wheel rides' }, nebula: { cannon: 'Cannon shots' } };
  R('pinball', function (e, ui) {
    var d = e.dt; if (!d || !d.b) return null;
    var tb = PBT[d.b] || [e.mode || 'Pinball', '#ff8a1c'], ac = tb[1];
    var bs = String(d.bs || '').split(',').filter(function (x) { return x !== ''; }).map(Number), dr = String(d.dr || '');
    var pic = null;
    if (bs.length) {
      var N = bs.length, W = 320, H = 150, P = 5, top = 22, base = 122, mx = Math.max.apply(null, bs.concat([1])), cw = (W - 20) / N, s = '<rect width="' + W + '" height="' + H + '" rx="6" fill="#0a0503"/>';
      // unlit dots across the whole panel, then lit columns for each ball
      for (var y = 4; y < H - 2; y += P) for (var x = 4; x < W - 2; x += P) s += '<circle cx="' + x + '" cy="' + y + '" r="1.2" fill="#2a0f04"/>';
      bs.forEach(function (v, i) {
        var x0 = 10 + i * cw, cols = Math.max(2, Math.floor((Math.min(cw - 10, 46)) / P)), rows = Math.max(1, Math.round(v / mx * (base - top) / P)), cx0 = x0 + (cw - cols * P) / 2, best = v === mx;
        for (var c = 0; c < cols; c++) for (var r = 0; r < rows; r++) {
          var px = Math.round((cx0 + c * P + 2) / P) * P - 1, py = base - r * P;
          s += '<circle cx="' + px + '" cy="' + py + '" r="2" fill="' + (best ? '#ff9a2e' : '#d8661a') + '"' + (r === rows - 1 ? ' opacity="1"' : '') + '/>';
        }
        var mid = x0 + cw / 2;
        s += '<text x="' + mid + '" y="' + (base - rows * P - 5) + '" text-anchor="middle" font-size="9" font-weight="800" fill="#ffb366" font-family="ui-monospace,monospace">' + (v >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : v >= 1e4 ? Math.round(v / 1000) + 'K' : n(v)) + '</text>';
        s += '<text x="' + mid + '" y="' + (base + 13) + '" text-anchor="middle" font-size="9" font-weight="800" fill="#ff8a2e" font-family="ui-monospace,monospace">BALL ' + (i + 1) + '</text>';
        s += '<text x="' + mid + '" y="' + (base + 23) + '" text-anchor="middle" font-size="7.5" font-weight="800" fill="#a85a20" font-family="ui-monospace,monospace">' + (PBD[dr.charAt(i)] || '') + '</text>';
      });
      pic = svg(W, H, s, { aria: 'Points for each ball, and where each ball drained' });
    }
    var f = d.f || {}, px = PBX[d.b] || {}, feats = PBF.filter(function (x) { return f[x[0]]; }).map(function (x) { return [(px[x[0]] || x[1]) + ' ' + n(f[x[0]]), ac]; });
    var last = dr.charAt(dr.length - 1);
    return screen(ui, {
      ac: ac, title: tb[0] + ' · ' + (d.bl || bs.length) + ' balls', score: n(myScore(e)), rank: rankText(d),
      pic: pic, picMax: 340,
      stats: [d.bb ? ['Best ball', n(d.bb)] : null, ['Jackpots', d.jp || 0], d.mb ? ['Multiballs', d.mb] : null, d.eb ? ['Extra balls', d.eb] : null,
        d.bx > 1 ? ['Bonus', d.bx + 'X', 'top multiplier'] : null, d.rp ? ['Ramps', d.rp] : null, d.cb ? ['Combos', d.cb] : null, d.sk ? ['Skill shots', d.sk] : null,
        f.tilt ? ['Tilts', f.tilt] : null],
      extra: feats.length ? [key(ui, feats)] : null,
      foot: last ? 'Last ball lost ' + (last === 'T' ? 'to ' : '') + PBDW[last] : '', footOk: false
    });
  });

  // ═══ Crazy Tower ═══
  // the tower from the side: each block's centre and width (world units, BASE = 3 across), colours climbing the spectrum as in the game
  R('crazytower', function (e, ui) {
    var d = e.dt; if (!d || d.h == null || d.t == null) return null;
    var bl = String(d.t || '').split(';').filter(Boolean).map(function (q) { var a = q.split(',').map(Number); return { x: (a[0] || 0) / 100, w: (a[2] || 0) / 100 }; });
    var BASE = 3, JP = 40, U = 36, BH = 6, W = 180, rows = Math.max(12, bl.length + 2), H = 16 + rows * BH + 18, gy = H - 18, cx = W / 2, s = '';
    s += '<rect width="' + W + '" height="' + H + '" fill="#0b0716"/>';
    for (var x = 10; x < W; x += 20) s += '<rect x="' + x + '" y="0" width=".6" height="' + gy + '" fill="rgba(79,210,255,.08)"/>';
    [10, 20, 30, JP].forEach(function (m) {
      if (m > rows) return;
      var y = gy - m * BH, c = m === JP ? '#ffb21a' : '#4fd2ff', on = bl.length >= m;
      s += '<line x1="0" y1="' + y + '" x2="' + W + '" y2="' + y + '" stroke="' + c + '" stroke-opacity="' + (on ? 0.8 : 0.3) + '" stroke-dasharray="3 3"/>';
      s += '<text x="' + (W - 3) + '" y="' + (y - 2) + '" text-anchor="end" font-size="7" font-weight="800" fill="' + c + '" fill-opacity="' + (on ? 1 : 0.5) + '" font-family="ui-monospace,monospace">' + (m === JP ? 'JACKPOT' : m) + '</text>';
    });
    s += '<rect x="' + (cx - BASE * U / 2 - 8) + '" y="' + gy + '" width="' + (BASE * U + 16) + '" height="18" fill="#1d1633"/><rect x="' + (cx - BASE * U / 2 - 8) + '" y="' + gy + '" width="' + (BASE * U + 16) + '" height="1.2" fill="#4fd2ff"/>';
    bl.forEach(function (b, i) {
      var hue = (192 + (i + 1) * 8.6) % 360, x0 = cx + (b.x - b.w / 2) * U, y = gy - (i + 1) * BH;
      s += '<rect x="' + x0.toFixed(1) + '" y="' + y + '" width="' + Math.max(0.5, b.w * U).toFixed(1) + '" height="' + BH + '" fill="hsl(' + hue.toFixed(0) + ',90%,60%)"/>' +
        '<rect x="' + x0.toFixed(1) + '" y="' + y + '" width="' + Math.max(0.5, b.w * U).toFixed(1) + '" height="1" fill="rgba(255,255,255,.5)"/>';
    });
    var mk = String(d.mk || '').split(',').filter(Boolean);
    return screen(ui, {
      ac: d.jp ? '#ffb21a' : '#ff4fb4', title: d.jp ? 'Jackpot!' : 'Game over', score: n(myScore(e)), rank: rankText(d),
      pic: svg(W, H, s, { aria: 'The tower as it was built' }), side: true, picMax: 150,
      stats: [['Height', plural(d.h, 'block')], ['Perfect drops', d.pf || 0], d.bs > 1 ? ['Best streak', d.bs + ' perfect'] : null,
        mk.length ? ['Marks hit', mk.join(' · ')] : null, d.jp ? ['Jackpot', 'Yes', '+100 bonus'] : null, d.rn > 1 ? ['Tower', '#' + d.rn, 'this sitting'] : null],
      foot: d.jp ? 'Reached the jackpot' : '', footOk: !!d.jp
    });
  });

  // ═══ Willy Crash ═══
  // where each of the five shots came down: a city sketch with the target roof, the jackpot tower and the sea
  var WLAND = { bull: ['Bullseye', '#ffd84a'], great: ['Great', '#7dffb3'], nice: ['Nice', '#7fe0ff'], roof: ['Target roof', '#c9b8ff'], wrong: ['Wrong roof', '#ffb0d0'],
    crash: ['Crash', '#ff8a5c'], splash: ['Splash', '#7fd0ff'], jackpot: ['JACKPOT', '#ffd84a'], jackpad: ['Tower pad', '#ffd84a'], jackroof: ['Top of the tower', '#ffd84a'] };
  // Willy Crash v2 (the arcade's seven-building points city). Records with detail.v === 2 carry
  // rb (roof building index per shot, -1 = street/gap/bay), jb (jackpot building per shot), ps (points per shot).
  var WC2_H = [190, 330, 300, 350, 315, 365, 520], WC2_V = [250, 350, 1000, 5000, 1000, 350, 250];
  function willyV2(e, ui, d) {
    var ls = String(d.ls).split(','), ps = String(d.ps || '').split(',').map(Number);
    var rb = String(d.rb || '').split(',').map(Number), jb = String(d.jb || '').split(',').map(Number);
    var W = 300, H = 150, GY = 136, BW = 27, GAP = 9, X0 = 40, SC = 104 / 520, s = '';
    s += '<defs><linearGradient id="wc2sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5fa6e6"/><stop offset=".75" stop-color="#bfe0f5"/><stop offset="1" stop-color="#ffe2a0"/></linearGradient></defs>';
    s += '<rect width="' + W + '" height="' + GY + '" fill="url(#wc2sky)"/><rect y="' + (GY - 26) + '" width="' + W + '" height="12" fill="#7fbde6"/>';
    s += '<rect y="' + GY + '" width="' + W + '" height="' + (H - GY) + '" fill="#5c5966"/><rect width="34" y="' + (GY - 1) + '" height="' + (H - GY + 1) + '" fill="#5fbf4a"/>';
    s += '<g transform="translate(16 ' + (GY - 6) + ') rotate(-70)"><rect x="-2" y="-4" width="20" height="8" fill="#fff6ea"/><rect x="4" y="-4" width="3" height="8" fill="#e5263f"/><rect x="11" y="-4" width="3" height="8" fill="#e5263f"/></g><circle cx="16" cy="' + (GY - 5) + '" r="5.5" fill="#2c52c0" stroke="#fff" stroke-width="1.5"/>';
    var jp0 = isNaN(jb[0]) ? 3 : jb[0];
    WC2_H.forEach(function (h, i) {
      var x = X0 + i * (BW + GAP), y = GY - h * SC, isJ = i === jp0, v = isJ ? 5000 : i === 3 ? WC2_V[jp0] : WC2_V[i];
      var my = (y + 3.2).toFixed(1);   // the jackpot building's mansard: slate slopes up to a small flat deck
      if (isJ) s += '<path d="M' + x + ' ' + GY + 'V' + my + 'L' + (x + 3.5) + ' ' + y.toFixed(1) + 'H' + (x + BW - 3.5) + 'L' + (x + BW) + ' ' + my + 'V' + GY + 'Z" fill="#9a4b36" stroke="#2b1e3f" stroke-width="1"/>' +
        '<path d="M' + x + ' ' + my + 'L' + (x + 3.5) + ' ' + y.toFixed(1) + 'H' + (x + BW - 3.5) + 'L' + (x + BW) + ' ' + my + 'Z" fill="#4b5262" stroke="#2b1e3f" stroke-width="1"/>';
      else s += '<rect x="' + x + '" y="' + y.toFixed(1) + '" width="' + BW + '" height="' + (GY - y).toFixed(1) + '" fill="#9a4b36" stroke="#2b1e3f" stroke-width="1"/>';
      s += '<text x="' + (x + BW / 2) + '" y="' + (y + (isJ ? 13 : 10)).toFixed(1) + '" text-anchor="middle" font-size="8" font-weight="900" fill="' + (isJ ? '#ffd23a' : '#ffd9c0') + '" font-family="ui-rounded,system-ui,sans-serif">' + v + '</text>';
      if (isJ) s += '<rect x="' + (x + 4) + '" y="' + (y - 1.5).toFixed(1) + '" width="' + (BW - 8) + '" height="2" fill="#e5263f"/><rect x="' + (x + 9) + '" y="' + (y - 1.5).toFixed(1) + '" width="' + (BW - 18) + '" height="2" fill="#fff"/>';
    });
    var used = {};
    ls.forEach(function (code, i) {
      var b = rb[i], k = used[b] = (used[b] || 0) + 1, sd = k % 2 ? -1 : 1, step = Math.floor((k - 1) / 2) + (k % 2 ? 0 : 1), x, y;
      if (b >= 0 && b < 7) { x = X0 + b * (BW + GAP) + BW / 2 + sd * step * 6; y = GY - WC2_H[b] * SC - 9; }
      else { x = X0 + 10 + ((i * 37) % 230); y = GY + 7; }
      var c = code === 'jackpot' ? '#ffd84a' : b >= 0 ? (ps[i] >= 100 ? '#7dffb3' : '#7fe0ff') : '#ff8a5c';
      s += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="6" fill="' + c + '" stroke="#1a0d24" stroke-width="1.4"/><text x="' + x.toFixed(1) + '" y="' + (y + 2.8).toFixed(1) + '" text-anchor="middle" font-size="8" font-weight="900" fill="#1a0d24" font-family="ui-monospace,monospace">' + (i + 1) + '</text>';
    });
    var roofs = rb.filter(function (b) { return b >= 0; }).length, best = Math.max.apply(null, ps.concat([0]));
    var shotsKey = key(ui, ls.map(function (code, i) {
      var b = rb[i], w = code === 'jackpot' ? ['JACKPOT', '#ffd84a'] : b >= 0 ? ['Roof', ps[i] >= 100 ? '#7dffb3' : '#7fe0ff'] : [code === 'splash' ? 'Bay' : 'Street', '#ff8a5c'];
      return ['#' + (i + 1) + ' ' + w[0] + ' · ' + n(ps[i] || 0), w[1]];
    }));
    return screen(ui, {
      ac: '#ffd84a', title: d.jp ? 'Jackpot!' : 'Show’s over', score: n(myScore(e)) + ' points', rank: rankText(d),
      pic: svg(W, H, s, { aria: 'Where each shot landed' }), picMax: 340,
      stats: [['On a roof', roofs + ' of ' + ls.length], d.jp ? ['Jackpots', d.jp] : null, best ? ['Best shot', n(best) + ' points'] : null,
        d.am === 's' ? ['Cannon', 'Aim yourself'] : null, d.wn ? ['Windows', d.wn] : null, d.pg ? ['Pigeons', d.pg] : null],
      extra: [shotsKey]
    });
  }
  R('willycrash', function (e, ui) {
    var d = e.dt; if (!d || !d.ls) return null;
    if (d.v === 2) return willyV2(e, ui, d);
    var ls = String(d.ls).split(','), ps = String(d.ps || '').split(',').map(Number);
    var W = 300, H = 150, GY = 134, s = '';
    s += '<defs><linearGradient id="wcsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1e0b3a"/><stop offset=".6" stop-color="#7a2a6e"/><stop offset="1" stop-color="#ff8a3d"/></linearGradient></defs>';
    s += '<rect width="' + W + '" height="' + GY + '" fill="url(#wcsky)"/><circle cx="120" cy="78" r="22" fill="#ffb347" opacity=".85"/>';
    [[30, 60], [44, 80], [108, 50], [128, 70], [222, 66], [236, 46]].forEach(function (b) { s += '<rect x="' + b[0] + '" y="' + (GY - b[1]) + '" width="16" height="' + b[1] + '" fill="#3b1a5a"/>'; });
    var MID = { x0: 66, x1: 104, y: 100 }, TG = { x0: 140, x1: 226, y: 76 }, JK = { x0: 246, x1: 264, y: 34 }, SEA = 272;
    s += '<rect x="' + MID.x0 + '" y="' + MID.y + '" width="' + (MID.x1 - MID.x0) + '" height="' + (GY - MID.y) + '" fill="#5a2a7a"/>';
    s += '<rect x="' + TG.x0 + '" y="' + TG.y + '" width="' + (TG.x1 - TG.x0) + '" height="' + (GY - TG.y) + '" fill="#4a1f66"/>';
    var tm = (TG.x0 + TG.x1) / 2, hw = (TG.x1 - TG.x0) / 2 * 0.72;   // the bullseye pad; the rest of the roof is plain
    [[1, '#e5263f'], [0.58, '#fff6ea'], [0.24, '#ffd84a']].forEach(function (z) { s += '<rect x="' + (tm - hw * z[0]) + '" y="' + (TG.y - 2) + '" width="' + (hw * z[0] * 2) + '" height="3" fill="' + z[1] + '"/>'; });
    s += '<rect x="' + JK.x0 + '" y="' + JK.y + '" width="' + (JK.x1 - JK.x0) + '" height="' + (GY - JK.y) + '" fill="#2c1a4a"/><rect x="' + (JK.x0 - 2) + '" y="' + (JK.y - 3) + '" width="' + (JK.x1 - JK.x0 + 4) + '" height="3" fill="#ffd84a"/>';
    s += '<rect x="' + SEA + '" y="' + (GY - 4) + '" width="' + (W - SEA) + '" height="' + (H - GY + 4) + '" fill="#2b6fb0"/><rect x="0" y="' + GY + '" width="' + SEA + '" height="' + (H - GY) + '" fill="#1a0d24"/>';
    s += '<g transform="translate(14 ' + (GY - 6) + ') rotate(-40)"><rect x="-3" y="-4" width="22" height="8" fill="#e5263f"/><rect x="5" y="-4" width="3" height="8" fill="#ffd84a"/></g><circle cx="14" cy="' + (GY - 4) + '" r="5" fill="#3f2a1d"/>';
    // the landing spots, numbered by shot; same-place shots fan out a little
    var used = {};
    function spot(code, i) {
      var k = used[code] = (used[code] || 0) + 1, sd = k % 2 ? -1 : 1, step = Math.floor((k - 1) / 2) + (k % 2 ? 0 : 1);
      switch (code) {
        case 'bull': return [tm + sd * step * 7, TG.y];
        case 'great': return [tm + sd * (hw * 0.42 + step * 3), TG.y];
        case 'nice': return [tm + sd * (hw * 0.78 + step * 3), TG.y];
        case 'roof': return [sd < 0 ? TG.x0 + 3 + step * 4 : TG.x1 - 3 - step * 4, TG.y];
        case 'wrong': return [(MID.x0 + MID.x1) / 2 + sd * step * 9, MID.y];
        case 'splash': return [SEA + 10 + ((k - 1) * 6) % 12, GY - 2];
        case 'jackpot': case 'jackpad': case 'jackroof': return [(JK.x0 + JK.x1) / 2 + sd * step * 6, JK.y - 3];
        default: return [126 + ((k - 1) * 9) % 22, GY];
      }
    }
    ls.forEach(function (code, i) {
      var p = spot(code, i), c = (WLAND[code] || WLAND.crash)[1];
      s += '<circle cx="' + p[0].toFixed(1) + '" cy="' + (p[1] - 8) + '" r="6.5" fill="' + c + '" stroke="#1a0d24" stroke-width="1.5"/><text x="' + p[0].toFixed(1) + '" y="' + (p[1] - 5.2) + '" text-anchor="middle" font-size="8" font-weight="900" fill="#1a0d24" font-family="ui-monospace,monospace">' + (i + 1) + '</text>';
    });
    var landed = ls.filter(function (c) { return /^(bull|great|nice|roof|jack)/.test(c); }).length, best = Math.max.apply(null, ps.concat([0]));
    var shotsKey = key(ui, ls.map(function (c, i) { var w = WLAND[c] || [c, '#ff8a5c']; return ['#' + (i + 1) + ' ' + w[0] + (ps[i] ? ' · ' + n(ps[i]) : ''), w[1]]; }));
    return screen(ui, {
      ac: '#ffd84a', title: d.jp ? 'Jackpot!' : 'Show’s over', score: n(myScore(e)), rank: rankText(d),
      pic: svg(W, H, s, { aria: 'Where each shot landed' }), picMax: 340,
      stats: [['Landed', landed + ' of ' + ls.length], d.bu ? ['Bullseyes', d.bu] : null, d.jp ? ['Jackpots', d.jp] : null, best ? ['Best shot', n(best)] : null,
        d.wn ? ['Windows', d.wn] : null, d.pg ? ['Pigeons', d.pg] : null, d.st ? ['Stars', d.st] : null],
      extra: [shotsKey]
    });
  });

  // ═══ Space Invaders ═══
  // the rack as it stood at the end: invaders still up in white, the ones shot down as faint outlines
  var INV = [
    ['...XXXX...', '.XXXXXXXX.', 'XXX.XX.XXX', 'XXXXXXXXXX', '..XX..XX..', '.XX....XX.'],
    ['..X...X..', '...XXX...', '.XXXXXXX.', 'XX.XXX.XX', 'XXXXXXXXX', '.X.....X.'],
    ['..XXXX..', '.XXXXXX.', 'XX.XX.XX', 'XXXXXXXX', '..X..X..', '.X.XX.X.']
  ];
  // Space Invaders Frenzy: the 50 stages as a grid (cleared ones lit, bonus-saucer stages marked, where it ended in red)
  function invFrenzy(e, ui, d) {
    var W = 300, C = 10, CW = 28, CH = 20, H = 5 * CH + 14, s = '<rect width="' + W + '" height="' + H + '" fill="#05060d"/>', w = Number(d.w) || 1;
    for (var i = 1; i <= 50; i++) {
      var c = (i - 1) % C, r = Math.floor((i - 1) / C), x = 6 + c * (CW + 1), y = 6 + r * (CH + 1);
      var done = i < w || (d.a50 && i <= 50), here = i === w && !d.a50, bonus = i % 5 === 0;
      var fill = here ? '#ff3b5c' : done ? (bonus ? '#ffd84a' : '#2fd35a') : 'rgba(255,255,255,.06)';
      s += '<rect x="' + x + '" y="' + y + '" width="' + CW + '" height="' + CH + '" rx="3" fill="' + fill + '"' + (done || here ? '' : ' stroke="rgba(255,255,255,.12)"') + '/>';
      s += '<text x="' + (x + CW / 2) + '" y="' + (y + CH / 2 + 3.5) + '" text-anchor="middle" font-size="9" font-weight="900" fill="' + (done || here ? '#06120a' : 'rgba(255,255,255,.35)') + '" font-family="ui-monospace,monospace">' + i + '</text>';
    }
    var two = d.np > 1, acc = d.sh ? Math.min(100, Math.round((d.k || 0) / d.sh * 100)) + '%' : '';
    return withRun(ui, d.run, { ac: '#2fd35a', unit: 'Stage', lifeWord: 'Base', why: function (w) { return w === 'invaded' ? 'the invaders reached the bottom' : 'the shield ran out'; } }, screen(ui, {
      ac: '#2fd35a', title: (d.a50 ? 'All 50 stages · ' : 'Game over · ') + 'stage ' + w, score: n(two ? Math.max(d.s1 || 0, d.s2 || 0) : myScore(e)), rank: rankText(d),
      pic: svg(W, H, s, { aria: 'The 50 stages: green ones cleared, gold ones were saucer bonus stages, red is where it ended' }), picMax: 340,
      stats: [two ? ['Red', n(d.s1), 'best streak ' + (d.b1 || 0), '#ff4a5a'] : null, two ? ['Blue', n(d.s2), 'best streak ' + (d.b2 || 0), '#3fa9ff'] : null,
        ['Invaders', n(d.k), (d.hv ? d.hv + ' heavy' : '') + (d.hv && d.sp ? ' · ' : '') + (d.sp ? d.sp + ' split' : '')],
        !two && d.b1 ? ['Best streak', d.b1 + ' hits'] : null, acc ? ['Hit rate', acc, n(d.sh) + ' shots'] : null,
        d.u ? ['Saucers', d.u, d.bt ? d.bu + ' of ' + d.bt + ' in bonus rounds' : ''] : null, d.bm ? ['BOMBs', d.bm, d.ch > 1 ? 'best chain x' + d.ch : ''] : null,
        d.ls ? ['Lasers shot down', d.ls] : null, d.pf ? ['Perfect stages', d.pf] : null,
        (d.w1 || d.w2) && !two ? ['Weapon', d.w1 === 'ring' ? 'Ring' : 'Missiles'] : null],
      extra: [key(ui, [['Cleared', '#2fd35a'], ['Saucer bonus', '#ffd84a'], [d.a50 ? 'Endless' : 'Ended here', '#ff3b5c']])],
      foot: d.why === 'invaded' ? 'The invaders reached the bottom' : d.a50 ? 'Beat all 50 stages' : 'The shield ran out', footOk: !!d.a50
    }));
  }
  R('invaders', function (e, ui) {
    var d = e.dt; if (d && !d.rack && d.w) return invFrenzy(e, ui, d);
    if (!d || !d.rack) return null;
    var rk = String(d.rack), CW = 16, RH = 14, P = 1.4, W = 11 * CW + 8, H = 5 * RH + 30, s = '<rect width="' + W + '" height="' + H + '" fill="#000"/>';
    for (var r = 0; r < 5; r++) for (var c = 0; c < 11; c++) {
      var on = rk.charAt(r * 11 + c) === '1', t = r < 2 ? 0 : r < 4 ? 1 : 2, rows = INV[t], w = rows[0].length;
      var x0 = 4 + c * CW + (CW - w * P) / 2, y0 = 6 + (4 - r) * RH, path = '';
      rows.forEach(function (row, j) { for (var i = 0; i < row.length; i++) if (row.charAt(i) === 'X') path += 'M' + (x0 + i * P).toFixed(1) + ' ' + (y0 + j * P).toFixed(1) + 'h' + P + 'v' + P + 'h-' + P + 'z'; });
      s += '<path d="' + path + '" fill="' + (on ? '#f2f2f2' : 'rgba(255,255,255,.08)') + '"/>';
    }
    s += '<rect x="0" y="' + (H - 6) + '" width="' + W + '" height="1.5" fill="#2fd35a"/>';
    s += '<path d="M' + (W / 2 - 8) + ' ' + (H - 8) + 'h16v-4h-6v-2h-1v-1h-2v1h-1v2h-6z" fill="' + (d.why === 'invaded' ? '#ff4a4a' : '#2fd35a') + '"/>';
    var k = String(d.k || '').split(',').map(Number), acc = d.sh ? Math.round((d.hi || 0) / d.sh * 100) + '%' : '';
    var killed = (k[0] || 0) + (k[1] || 0) + (k[2] || 0);
    return screen(ui, {
      ac: '#2fd35a', title: 'Game over · wave ' + d.w, score: n(myScore(e)), rank: rankText(d),
      pic: svg(W, H, s, { crisp: true, aria: 'The invaders left at the end: solid ones were still up, faint ones were shot down' }), picMax: 300,
      stats: [['Wave', d.w, d.cl ? 'cleared ' + d.cl : ''], ['Invaders', n(killed), (k[2] || 0) + ' top · ' + (k[1] || 0) + ' mid · ' + (k[0] || 0) + ' low'],
        ['Accuracy', acc, d.sh ? n(d.sh) + ' shots' : ''], d.u ? ['Saucers', d.u, n(d.up) + ' points' + (d.ub >= 300 ? ' · hit a 300' : '')] : null,
        d.bs ? ['Bombs shot', d.bs] : null, d.ex ? ['Extra cannon', 'Yes'] : null],
      foot: d.why === 'invaded' ? 'The invaders landed' : 'Last cannon hit', footOk: false
    });
  });
  // ═══ Crossy Road ═══
  // a sketch of the last few lanes, the chicken on the row where it ended and what got it
  var CR_WHY = { car: 'Hit by a car', truck: 'Hit by a truck', train: 'Hit by a train', water: 'Fell in the river', edge: 'Swept away on a log', eagle: 'Carried off by the eagle' };
  R('crossyroad', function (e, ui) {
    var d = e.dt; if (!d || d.sc == null) return null;
    var W = 300, LH = 22, rows = 6, H = rows * LH, R0 = rnd((Number(d.sd) || 7) + (Number(d.sc) || 0)), s = '', cs = d.cs || '', cx = 150;
    // lanes from the bottom up; the top-but-one lane is where it ended, and its kind matches the cause
    var endK = cs === 'train' ? 'rail' : cs === 'water' || cs === 'edge' ? 'river' : cs === 'eagle' ? 'grass' : 'road', kinds = [];
    for (var i = 0; i < rows; i++) kinds.push(i === rows - 2 ? endK : i === 0 ? 'grass' : ['grass', 'road', 'road', 'river', 'rail'][Math.floor(R0() * 5)]);
    kinds.forEach(function (k, i) {
      var y = H - (i + 1) * LH, j;
      if (k === 'grass') { s += '<rect y="' + y + '" width="' + W + '" height="' + LH + '" fill="' + (i % 2 ? '#94d94e' : '#8bd146') + '"/>'; for (j = 0; j < 3; j++) { var tx = 20 + R0() * 260; if (Math.abs(tx - cx) > 24) s += '<rect x="' + tx.toFixed(0) + '" y="' + (y + 4) + '" width="12" height="14" rx="2" fill="#3f8f2a"/><rect x="' + (tx + 4).toFixed(0) + '" y="' + (y + 14) + '" width="4" height="6" fill="#7a4a24"/>'; } }
      else if (k === 'road') { s += '<rect y="' + y + '" width="' + W + '" height="' + LH + '" fill="#4b4f5a"/>'; for (j = 0; j < W; j += 26) s += '<rect x="' + j + '" y="' + (y + LH / 2 - 1) + '" width="13" height="2" fill="rgba(255,255,255,.45)"/>'; if (i !== rows - 2) { var vx = R0() * 240; if (Math.abs(vx + 15 - cx) > 30) s += '<rect x="' + vx.toFixed(0) + '" y="' + (y + 4) + '" width="30" height="14" rx="3" fill="' + ['#ff5d5d', '#5db0ff', '#ffd23d'][Math.floor(R0() * 3)] + '"/>'; } }
      else if (k === 'river') { s += '<rect y="' + y + '" width="' + W + '" height="' + LH + '" fill="#4fb6f0"/>'; for (j = 0; j < 2; j++) { var lx = j * 150 + R0() * 60; if (!(i === rows - 2 && cs === 'water' && lx < cx + 20 && lx + 60 > cx - 20)) s += '<rect x="' + lx.toFixed(0) + '" y="' + (y + 4) + '" width="60" height="14" rx="5" fill="#8a5a2b"/>'; } }
      else { s += '<rect y="' + y + '" width="' + W + '" height="' + LH + '" fill="#7a6b5c"/>'; for (j = 4; j < W; j += 12) s += '<rect x="' + j + '" y="' + (y + 3) + '" width="5" height="16" fill="#5a4a3a"/>'; s += '<rect y="' + (y + 6) + '" width="' + W + '" height="2" fill="#c9c9d1"/><rect y="' + (y + 14) + '" width="' + W + '" height="2" fill="#c9c9d1"/>'; }
    });
    var ey = H - (rows - 1) * LH, chx = cs === 'edge' ? 10 : cx, chy = ey + 4;
    // what got it
    if (cs === 'car' || cs === 'truck') { var vw = cs === 'truck' ? 56 : 32; s += '<rect x="' + (cx - vw - 2) + '" y="' + (ey + 3) + '" width="' + vw + '" height="16" rx="3" fill="' + (cs === 'truck' ? '#e8e8ee' : '#ff5d5d') + '"/><rect x="' + (cx - 10) + '" y="' + (ey + 5) + '" width="6" height="12" fill="rgba(30,40,60,.7)"/>'; }
    if (cs === 'train') s += '<rect x="' + (cx - 150) + '" y="' + (ey + 2) + '" width="140" height="18" rx="3" fill="#d9363e"/><rect x="' + (cx - 30) + '" y="' + (ey + 5) + '" width="12" height="8" fill="#ffe9a0"/>';
    if (cs === 'eagle') s += '<path d="M' + (cx - 26) + ' ' + (ey - 2) + 'q13 -12 26 0q13 -12 26 0l-26 10z" fill="#3a2a1a"/><circle cx="' + cx + '" cy="' + (ey - 1) + '" r="4" fill="#f2f2f2"/>';
    if (cs === 'water') { chy = ey + 9; s += '<ellipse cx="' + cx + '" cy="' + (ey + 15) + '" rx="16" ry="4" fill="none" stroke="#e8f8ff" stroke-width="1.5"/>'; }
    // the chicken
    s += '<g transform="translate(' + (chx - 7) + ' ' + chy + ')"' + (cs === 'water' ? ' opacity=".75"' : '') + '><rect width="14" height="14" rx="2" fill="#fbfbf6"/><rect x="4" y="-4" width="6" height="4" fill="#e5263f"/><rect x="11" y="5" width="5" height="3" fill="#ff9d2a"/><rect x="8" y="3" width="2" height="2" fill="#1a1a1a"/></g>';
    s += '<rect y="' + (H - 18) + '" width="44" height="14" rx="3" fill="rgba(0,0,0,.45)"/><text x="22" y="' + (H - 8) + '" text-anchor="middle" font-size="9" font-weight="900" fill="#fff" font-family="ui-monospace,monospace">ROW ' + n(d.sc) + '</text>';
    return screen(ui, {
      ac: '#84cc16', title: 'Game over', score: n(d.sc), unit: d.sc === 1 ? 'row' : 'rows', rank: rankText(d, 'rows'),
      pic: svg(W, H, s, { aria: 'The last lanes, with the chicken where the run ended' }), picMax: 340,
      stats: [['Coins', d.co || 0], d.hp ? ['Hops', n(d.hp)] : null, d.t ? ['Time', mmss(d.t)] : null, d.rn > 1 ? ['Run', '#' + d.rn, 'best this sitting ' + n(d.sb)] : null],
      foot: CR_WHY[cs] || ''
    });
  });

  // ═══ Centipede (Chaos) ═══
  // the ten waves as a track: boss waves bigger, cleared ones lit, where it ended marked
  var CT_BOSS = { 3: ['Killer Wasp', '#ffe23d'], 6: ['Night Flyer', '#b98cff'], 9: ['Blast Beetle', '#ff4a7a'], 10: ['Mega Spider', '#ff2d8a'] };
  var CT_BY = { centipede: 'The centipede', spider: 'A spider', mini: 'A spider', flea: 'A flea', ant: 'An ant', beetle: 'A beetle', ffly: 'A firefly', wasp: 'A wasp', bwasp: 'A black wasp',
    fire: 'Fire', ember: 'Fire', spark: 'A spark', sting: 'A stinger', venom: 'Venom', shockwave: 'A shockwave', button: 'A bug', firefly: 'The Night Flyer', mega: 'The Mega Spider' };
  R('centipede', function (e, ui) {
    var d = e.dt; if (!d || !d.w) return null;
    var w = Number(d.w) || 1, loop = Math.floor((w - 1) / 10), at = (w - 1) % 10 + 1, W = 300, H = 92, s = '<rect width="' + W + '" height="' + H + '" fill="#060914"/>';
    for (var gx = 0; gx < W; gx += 20) s += '<rect x="' + gx + '" width=".6" height="' + H + '" fill="rgba(80,140,255,.10)"/>';
    var y = 48, x0 = 22, dx = 28;
    s += '<rect x="' + x0 + '" y="' + (y - 1.5) + '" width="' + (dx * 9) + '" height="3" fill="rgba(120,160,255,.25)"/>';
    for (var i = 1; i <= 10; i++) {
      var x = x0 + (i - 1) * dx, b = CT_BOSS[i], done = loop > 0 || i < at || (i === at && d.won && i === 10), here = i === at && !(d.won && i === 10 && !loop);
      var c = here ? '#ff3b5c' : done ? (b ? b[1] : '#3fa9ff') : 'rgba(255,255,255,.14)';
      if (done && i > 1) s += '<rect x="' + (x - dx) + '" y="' + (y - 1.5) + '" width="' + dx + '" height="3" fill="#3fa9ff"/>';
      if (b) s += '<path d="M' + x + ' ' + (y - 11) + 'l11 11l-11 11l-11-11z" fill="' + c + '"' + (done || here ? ' filter="drop-shadow(0 0 4px ' + c + ')"' : '') + '/>';
      else s += '<circle cx="' + x + '" cy="' + y + '" r="7" fill="' + c + '"/>';
      s += '<text x="' + x + '" y="' + (y + 3.5) + '" text-anchor="middle" font-size="9" font-weight="900" fill="' + (done || here ? '#060914' : 'rgba(255,255,255,.5)') + '" font-family="ui-monospace,monospace">' + i + '</text>';
      if (b) s += '<text x="' + (i === 10 ? x + 12 : x) + '" y="' + (i === 3 || i === 9 ? y + 26 : y - 18) + '" text-anchor="' + (i === 10 ? 'end' : 'middle') + '" font-size="7.5" font-weight="800" fill="' + (done ? b[1] : 'rgba(255,255,255,.4)') + '" font-family="ui-monospace,monospace">' + b[0].toUpperCase() + '</text>';
    }
    if (loop) s += '<text x="6" y="13" text-anchor="start" font-size="8" font-weight="900" fill="#ffd84a" font-family="ui-monospace,monospace">ENDLESS · LOOP ' + (loop + 1) + '</text>';
    var online = d.np > 1, by = CT_BY[d.by] || '';
    if (by && CT_BOSS[at] && (d.by === 'mega' || d.by === 'firefly' || (at === 3 && d.by === 'wasp') || (at === 9 && d.by === 'beetle'))) by = 'The ' + CT_BOSS[at][0];
    return withRun(ui, d.run, { ac: '#3fa9ff', unit: 'Wave', why: function (w) { var t = CT_BY[w] || w; return t.charAt(0).toLowerCase() + t.slice(1); } }, screen(ui, {
      ac: '#3fa9ff', title: d.won ? 'Mega Spider beaten · wave ' + w : 'Game over · wave ' + w, score: n(myScore(e)), rank: rankText(d),
      pic: svg(W, H, s, { aria: 'The ten waves: lit ones cleared, diamonds are boss waves, red is where it ended' }), picMax: 360,
      stats: [online ? ['Team score', n(d.ts)] : null, ['Bosses', d.b || 0, d.b && d.b < 4 ? ['Killer Wasp', 'Night Flyer', 'Blast Beetle'].slice(0, d.b).join(', ') : d.b >= 4 ? 'all four' + (d.b > 4 ? ', some twice' : '') : ''],
        d.sg ? ['Segments', n(d.sg), (d.hd || 0) + ' heads'] : null, d.sp ? ['Spiders', d.sp] : null, d.bg ? ['Other bugs', n(d.bg)] : null,
        d.pw ? ['Power-ups', d.pw] : null, d.cb >= 5 ? ['Best combo', 'x' + d.cb] : null, d.df === 'relaxed' ? ['Mode', 'Relaxed'] : null],
      foot: d.won ? 'Beat the Mega Spider' : by ? 'Last life lost to: ' + by.charAt(0).toLowerCase() + by.slice(1) : '', footOk: !!d.won
    }));
  });

  // ═══════════ Shared: a tappable strip, a chart, panels ═══════════
  // where the site's files are (for fonts and the Carmen maps), from this file's own address
  var ROOT = (function () { try { var s = document.currentScript && document.currentScript.src; if (s) return s.replace(/hist\/arcade\.js(\?.*)?$/, ''); } catch (e) {} return ''; })();
  HistView.css('hv-arcade2', [
    '.ar-road{display:flex;flex-wrap:wrap;gap:4px;}',
    '.ar-rb{appearance:none;border:0;cursor:pointer;min-width:27px;height:27px;padding:0 6px;border-radius:6px;font:900 .68rem/1 ui-monospace,"SF Mono",Menlo,Consolas,monospace;',
    'color:#fff;background:var(--rc,#3a3f5c);box-shadow:inset 0 -2px 0 rgba(0,0,0,.28);transition:transform .12s;}',
    '.ar-rb.ink{color:#141414;}',
    '.ar-rb.on{outline:2.5px solid var(--ro,#fff);outline-offset:1.5px;transform:translateY(-1px);}',
    '.ar-card{display:flex;flex-direction:column;gap:10px;}',
    '.ar-two{display:flex;gap:12px;align-items:flex-start;}',
    '.ar-two>.ar-pic{flex:0 0 40%;}',
    '.ar-two>.ar-st{flex:1;min-width:0;grid-template-columns:1fr;gap:7px;}',
    '.ar-line{font-size:.78rem;font-weight:700;color:rgba(233,236,255,.82);line-height:1.45;}',
    '.ar-line b{color:#fff;}',
    '.ar-lg{display:flex;flex-direction:column;gap:6px;margin:0;padding:0;list-style:none;}',
    '.ar-lg li{display:flex;gap:8px;align-items:baseline;font-size:.76rem;font-weight:700;color:rgba(233,236,255,.86);line-height:1.35;}',
    '.ar-lg li b{flex:none;min-width:36px;color:rgba(233,236,255,.5);font-variant-numeric:tabular-nums;}',
    '.ar-lg li i{flex:none;width:9px;height:9px;border-radius:2px;align-self:flex-start;margin-top:.3em;}',
    '.ar-chips{display:flex;flex-wrap:wrap;gap:4px;}',
    '.ar-chip{display:inline-flex;align-items:center;gap:5px;padding:3px 7px;border-radius:5px;font-size:.66rem;font-weight:900;letter-spacing:.06em;text-transform:uppercase;',
    'background:color-mix(in srgb,var(--cc,#888) 22%,transparent);color:color-mix(in srgb,var(--cc,#888) 55%,#fff);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--cc,#888) 45%,transparent);}'
  ].join(''));
  // a strip of small buttons, one per hand/level/event; tapping one shows it. items: [{t, c (colour), title, ink (dark text)}]
  function strip(ui, items, start, show, o) {
    o = o || {};
    var box = ui.el('div', { class: 'ar-road' + (o.cls ? ' ' + o.cls : '') }), btns = [];
    items.forEach(function (it, i) {
      var b = ui.el('button', { type: 'button', class: 'ar-rb' + (it.ink ? ' ink' : ''), style: { '--rc': it.c || '#3a3f5c' }, text: it.t == null ? String(i + 1) : String(it.t), title: it.title || '', 'aria-label': it.title || String(it.t || i + 1),
        onclick: function () { pick(i); } });
      btns.push(b); box.appendChild(b);
    });
    function pick(i) { btns.forEach(function (b, j) { b.classList.toggle('on', i === j); b.setAttribute('aria-pressed', i === j ? 'true' : 'false'); }); show(i); }
    if (items.length) pick(Math.max(0, Math.min(items.length - 1, start || 0)));
    return box;
  }
  // a dark arcade panel holding other pieces
  function pane(ui, kids, ac) { return ui.el('div', { class: 'ar-scr', style: { '--ac': ac || '#ffd84a' } }, [].concat(kids).filter(Boolean)); }
  function chips(ui, list) { return ui.el('div', { class: 'ar-chips' }, list.map(function (x) { return ui.el('span', { class: 'ar-chip', style: { '--cc': x[1] || '#888' }, text: x[0] }); })); }
  function legend(ui, lines) { return ui.el('ul', { class: 'ar-lg' }, lines.map(function (x) { return ui.el('li', null, [x.b != null ? ui.el('b', { text: x.b }) : null, x.c ? ui.el('i', { style: { background: x.c } }) : null, ui.el('span', { text: x.t })]); })); }
  function money(n, cents) { n = Number(n) || 0; if (cents) n = (n < 0 ? -1 : 1) * Math.floor(Math.abs(Math.round(n)) / 100);   // whole dollars, as the game shows them
    return (n < 0 ? '−$' : '$') + Math.abs(Math.round(n)).toLocaleString('en-US'); }
  function ord(k) { k = +k || 0; var v = k % 100; return k + (v >= 11 && v <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][k % 10] || 'th'); }
  function short(v) { v = Number(v) || 0; var a = Math.abs(v), s = a >= 1e6 ? (a / 1e6).toFixed(a >= 1e7 ? 0 : 1) + 'M' : a >= 1e4 ? Math.round(a / 1000) + 'K' : a >= 1000 ? (a / 1000).toFixed(1) + 'K' : String(Math.round(a)); return (v < 0 ? '−' : '') + s; }
  // A line chart on a dark screen. o: {v: values, w, h, c: line colour, fmt(v), x0, x1: end labels, base: a dashed level,
  //   goal: {v, label, c}, marks: [{i, k: 'x'|'dot'|'star'|'ring', c}], ticks: [{i, t}] labels along the bottom, area: false to skip the fill, bg}
  var chartN = 0;
  function chart(o) {
    var v = o.v || [], n = v.length; if (n < 2) return '';
    var W = o.w || 320, H = o.h || 132, pl = 10, pr = 12, pt = 16, pb = o.ticks || o.x0 ? 18 : 8, fmt = o.fmt || short, id = 'arc' + (++chartN), c = o.c || '#7dff9a';
    var all = v.concat(o.base != null ? [o.base] : [], o.goal ? [o.goal.v] : []);
    var mn = Math.min.apply(null, all.concat(o.zero === false ? [] : [0])), mx = Math.max.apply(null, all); if (mx === mn) mx = mn + 1;
    function X(i) { return pl + i * (W - pl - pr) / (n - 1); }
    function Y(val) { return pt + (mx - val) * (H - pt - pb) / (mx - mn); }
    var s = '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + c + '" stop-opacity=".38"/><stop offset="1" stop-color="' + c + '" stop-opacity="0"/></linearGradient></defs>';
    s += '<rect width="' + W + '" height="' + H + '" rx="6" fill="' + (o.bg || '#05060d') + '"/>';
    for (var g = 1; g < 4; g++) s += '<rect x="' + pl + '" y="' + (pt + g * (H - pt - pb) / 4).toFixed(1) + '" width="' + (W - pl - pr) + '" height=".6" fill="rgba(140,160,255,.10)"/>';
    if (mn < 0) s += '<rect x="' + pl + '" y="' + Y(0).toFixed(1) + '" width="' + (W - pl - pr) + '" height="1" fill="rgba(255,255,255,.28)"/>';
    if (o.base != null) s += '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + Y(o.base).toFixed(1) + '" y2="' + Y(o.base).toFixed(1) + '" stroke="rgba(255,255,255,.4)" stroke-dasharray="3 4"/>';
    if (o.goal) {
      var gy = Y(o.goal.v).toFixed(1), gc = o.goal.c || '#ffd84a';
      s += '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + gy + '" y2="' + gy + '" stroke="' + gc + '" stroke-width="1.4" stroke-dasharray="6 4"/>';
      if (o.goal.label) s += '<text x="' + (pl + 2) + '" y="' + (gy - 4) + '" font-size="9" font-weight="900" fill="' + gc + '" font-family="ui-monospace,monospace">' + o.goal.label + '</text>';
    }
    var pts = v.map(function (val, i) { return X(i).toFixed(1) + ',' + Y(val).toFixed(1); });
    var floor = Y(Math.max(mn, Math.min(0, mx))).toFixed(1);
    if (o.area !== false) s += '<polygon points="' + X(0).toFixed(1) + ',' + floor + ' ' + pts.join(' ') + ' ' + X(n - 1).toFixed(1) + ',' + floor + '" fill="url(#' + id + ')"/>';
    s += '<polyline points="' + pts.join(' ') + '" fill="none" stroke="' + c + '" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>';
    (o.marks || []).forEach(function (m) {
      if (m.i == null || m.i < 0 || m.i >= n) return;
      var x = X(m.i), y = Y(v[m.i]), mc = m.c || c;
      if (m.k === 'x') s += '<path d="M' + (x - 3.5) + ' ' + (y - 3.5) + 'l7 7M' + (x + 3.5) + ' ' + (y - 3.5) + 'l-7 7" stroke="#05060d" stroke-width="4.5" stroke-linecap="round"/><path d="M' + (x - 3.5) + ' ' + (y - 3.5) + 'l7 7M' + (x + 3.5) + ' ' + (y - 3.5) + 'l-7 7" stroke="' + mc + '" stroke-width="2.2" stroke-linecap="round"/>';
      else if (m.k === 'star') s += '<path d="' + starPath(x, y, 6.5, 2.8) + '" fill="' + mc + '" stroke="#05060d" stroke-width="1.2"/>';
      else if (m.k === 'ring') s += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="5.5" fill="none" stroke="' + mc + '" stroke-width="2"/>';
      else s += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + (m.r || 3.2) + '" fill="' + mc + '" stroke="#05060d" stroke-width="1.2"/>';
    });
    var hi = v.indexOf(Math.max.apply(null, v));
    var hx = X(hi), ha = hx > W - 44 ? 'end' : hx < pl + 30 ? 'start' : 'middle';
    s += '<text x="' + (ha === 'end' ? W - pr + 4 : ha === 'start' ? pl : hx).toFixed(1) + '" y="' + Math.max(10, Y(v[hi]) - 8).toFixed(1) + '" text-anchor="' + ha + '" font-size="9" font-weight="900" fill="#fff" font-family="ui-monospace,monospace">' + fmt(v[hi]) + '</text>';
    (o.ticks || []).forEach(function (t) { s += '<text x="' + X(t.i).toFixed(1) + '" y="' + (H - 5) + '" text-anchor="' + (t.i === 0 ? 'start' : t.i === n - 1 ? 'end' : 'middle') + '" font-size="8.5" font-weight="800" fill="rgba(233,236,255,.5)" font-family="ui-monospace,monospace">' + t.t + '</text>'; });
    if (o.x0) s += '<text x="' + pl + '" y="' + (H - 5) + '" font-size="8.5" font-weight="800" fill="rgba(233,236,255,.5)" font-family="ui-monospace,monospace">' + o.x0 + '</text>';
    if (o.x1) s += '<text x="' + (W - pr) + '" y="' + (H - 5) + '" text-anchor="end" font-size="8.5" font-weight="800" fill="rgba(233,236,255,.5)" font-family="ui-monospace,monospace">' + o.x1 + '</text>';
    return svg(W, H, s, { aria: o.aria || 'How it went' });
  }
  function starPath(x, y, R1, R2) { var p = ''; for (var i = 0; i < 10; i++) { var a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? R2 : R1; p += (i ? 'L' : 'M') + (x + Math.cos(a) * r).toFixed(1) + ' ' + (y + Math.sin(a) * r).toFixed(1); } return p + 'Z'; }

  // ═══ A run's story (d.run, from the games' trk… helpers): the score over time with each level's end and each
  // life lost marked, then every level on a tap: how long it took, what it scored, the lives it cost.
  // o: {ac, unit: 'Level' | 'Wave' | ..., why(cause) -> words, card(level number, entry) -> extra nodes, lifeWord}
  function withRun(ui, run, o, node) { return ui.wrap([node].concat(runParts(ui, run, o))); }
  function runParts(ui, run, o) {
    o = o || {};
    if (!run || !run.sk) return [];
    var unit = o.unit || 'Level', si = run.si || 2, v = String(run.sk).split(',').filter(function (x) { return x !== ''; }).map(Number), te = run.te || 0;
    if (run.se != null && (run.se !== v[v.length - 1] || te > (v.length - 1) * si + si / 2)) v.push(run.se);
    var lx = (run.lx || []).map(function (s) { var a = String(s).split('|'); return { n: a[0], t: +a[1] || 0, s: +a[2] || 0, l: +a[3] || 0, end: a[4] === '1' }; });
    var lz = lx[lx.length - 1], ly = lx[lx.length - 2];
    if (lz && lz.end && ly && ly.n === lz.n) lx.pop();   // the last level was cleared: the game ended on it, not in it
    var lf = (run.lf || []).map(function (s) { var a = String(s).split('|'); return { t: +a[0] || 0, n: a[1], why: a.slice(2).join('|') }; });
    var out = [], last = v.length - 1;
    function idx(t) { return Math.max(0, Math.min(last, t >= te ? last : Math.round(t / si))); }
    var why = o.why || function (x) { return x; }, lw = o.lifeWord || 'Life';
    if (v.length >= 3) {
      var marks = lx.filter(function (x) { return !x.end; }).map(function (x) { return { i: idx(x.t), k: 'dot', c: '#7dff9a' }; }).concat(lf.map(function (x) { return { i: idx(x.t), k: 'x', c: '#ff4058' }; }));
      var ticks = [], used = {};
      lx.forEach(function (x, k) { var i = k ? idx(lx[k - 1].t) : 0; if (lx.length <= 12 || k % Math.ceil(lx.length / 10) === 0) if (!used[i]) { used[i] = 1; ticks.push({ i: i, t: (k ? '' : unit.charAt(0)) + x.n }); } });
      var ch = chart({ v: v, c: o.ac || '#7dff9a', marks: marks, ticks: ticks.length > 1 ? ticks : null, x0: ticks.length > 1 ? null : '0:00', x1: ticks.length > 1 ? null : mmss(te), aria: 'Score over the game: dots where a ' + unit.toLowerCase() + ' was cleared, crosses where a life was lost' });
      var lives = lf.map(function (x, k) { return { b: mmss(x.t), c: '#ff4058', t: (o.lifeWord || 'Life') + ' ' + (k + 1) + ' · ' + unit.toLowerCase() + ' ' + x.n + (x.why ? ': ' + why(x.why) : '') }; });
      out.push(ui.section('How it went', pane(ui, [ui.el('div', { class: 'ar-pic', html: ch }), key(ui, [lx.some(function (x) { return !x.end; }) ? [unit + ' cleared', '#7dff9a'] : null, lf.length && !o.noLives ? [lw + ' lost', '#ff4058'] : null, [mmss(te) + ' in all', 'rgba(255,255,255,.3)']].filter(Boolean)), lives.length && !o.noLives ? legend(ui, lives) : null], o.ac), { icon: 'chart' }));
    }
    if (!o.noStrip && (lx.length >= 2 || (lx.length === 1 && lx[0].l))) {
      var card = ui.el('div', { class: 'ar-card' });
      var show = function (k) {
        var x = lx[k], p = lx[k - 1] || { t: 0, s: 0 }, dies = lf.filter(function (f) { return f.n === x.n && f.t >= p.t && f.t <= x.t + 1; });
        var st = ui.el('div', { class: 'ar-st' }, [stat(ui, unit, x.n, x.end ? 'where it ended' : 'cleared', x.end ? '#ff4058' : '#7dff9a'), stat(ui, 'Time', mmss(x.t - p.t)), stat(ui, 'Points', '+' + n(x.s - p.s), 'score ' + n(x.s)),
          o.noLives ? null : stat(ui, x.l ? (x.l === 1 ? lw + ' lost' : (lw === 'Life' ? 'Lives' : lw + 's') + ' lost') : 'No ' + lw.toLowerCase() + ' lost', x.l || '–', dies.map(function (f) { return why(f.why); }).filter(Boolean).join(', '))]);
        card.innerHTML = ''; card.appendChild(st);
        if (o.card) [].concat(o.card(x.n, x) || []).forEach(function (nd) { if (nd) card.appendChild(nd); });
      };
      var fast = null; lx.forEach(function (x, k) { var d = x.t - (k ? lx[k - 1].t : 0); if (!x.end && (fast == null || d < fast.d)) fast = { k: k, d: d }; });
      var items = lx.map(function (x, k) { return { t: x.n, c: x.end ? '#ff4058' : x.l ? '#ff9a4a' : '#2fd35a', ink: !x.end, title: unit + ' ' + x.n }; });
      out.push(ui.section('Every ' + unit.toLowerCase() + ' · tap one', pane(ui, [strip(ui, items, lx.length - 1, show), key(ui, [['Clean', '#2fd35a'], lx.some(function (x) { return x.l && !x.end; }) ? ['Cost a ' + lw.toLowerCase(), '#ff9a4a'] : null, ['Where it ended', '#ff4058']].filter(Boolean)), card], o.ac), { icon: 'flag' }));
    }
    return out;
  }

  // ═══ TetriNET ═══
  // Every field side by side as the match ended, a lane for each player showing the specials that hit them and
  // when they went out, the knockouts, and each player's field and numbers on a tap.
  var TN_SP = { a: ['Add Line', '#ff4a5c'], c: ['Clear Line', '#36c76e'], n: ['Nuke Field', '#ffd23a'], r: ['Random Clear', '#2fc2e8'], s: ['Switch Fields', '#b15ef0'],
    b: ['Clear Specials', '#5f7cff'], g: ['Gravity', '#ff9a2a'], q: ['Quake', '#ff5fae'], o: ['Block Bomb', '#eceaf6'] };
  var TN_PC = ['#ffd166', '#ff7a8a', '#4fd1c5', '#8b7cff', '#5b8cff', '#3fb56b'];
  function tnWhat(k) {
    if (!k) return '';
    if (k.charAt(0) === 'L') { var m = +k.slice(1); return m === 4 ? 'a Tetris (4 lines)' : m + (m === 1 ? ' line' : ' lines'); }
    var sp = TN_SP[k]; return sp ? (/^[AEIOU]/.test(sp[0]) ? 'an ' : 'a ') + sp[0] : k;
  }
  function tnField(f, x, y, cs) {
    var C = 12, Rn = 22; f = String(f || ''); if (f.length > C * Rn) f = f.slice(-C * Rn); f = new Array(C * Rn - f.length + 1).join('.') + f;
    var s = '<rect x="' + x + '" y="' + y + '" width="' + C * cs + '" height="' + Rn * cs + '" fill="#0c0e1c"/>';
    for (var c0 = 1; c0 < C; c0++) s += '<rect x="' + (x + c0 * cs) + '" y="' + y + '" width=".35" height="' + Rn * cs + '" fill="rgba(255,255,255,.05)"/>';
    for (var r = 0; r < Rn; r++) for (var c = 0; c < C; c++) {
      var ch = f.charAt(r * C + c); if (!ch || ch === '.') continue;
      var px = x + c * cs, py = y + r * cs, sp = TN_SP[ch];
      if (sp) {
        s += '<rect x="' + px + '" y="' + py + '" width="' + cs + '" height="' + cs + '" fill="' + sp[1] + '"/><rect x="' + (px + cs * .2) + '" y="' + (py + cs * .2) + '" width="' + cs * .6 + '" height="' + cs * .6 + '" fill="rgba(255,255,255,.45)"/>';
        if (cs >= 7) s += '<text x="' + (px + cs / 2) + '" y="' + (py + cs * .78) + '" text-anchor="middle" font-size="' + cs * .8 + '" font-weight="900" fill="#141414" font-family="ui-monospace,monospace">' + ch.toUpperCase() + '</text>';
      } else {
        s += '<rect x="' + px + '" y="' + py + '" width="' + cs + '" height="' + cs + '" fill="' + (TET[ch] || TET.G) + '"/>';
        if (cs >= 4) s += '<rect x="' + px + '" y="' + py + '" width="' + cs + '" height="' + Math.max(1, cs * .2) + '" fill="rgba(255,255,255,.35)"/><rect x="' + px + '" y="' + (py + cs * .8) + '" width="' + cs + '" height="' + cs * .2 + '" fill="rgba(0,0,0,.28)"/>';
      }
    }
    return s;
  }
  function tnUsed(u) { var out = []; String(u || '').replace(/([a-z])(\d+)/g, function (m, k, c) { out.push([k, +c]); return m; }); return out; }
  R('tetrinet', function (e, ui) {
    var d = e.dt; if (!d || !d.s || !d.s.length) return null;
    var S = d.s, N = S.length, mi = d.me || 0, me = S[mi] || S[0], st = d.st || {}, tt = Math.max(1, d.tt || 0), won = d.w === mi;
    function nm(i) { return S[i] ? S[i].nm || 'Player ' + (i + 1) : '?'; }
    function endT(i) { return i === d.w ? tt : (S[i].t || tt); }
    var order = S.map(function (p, i) { return i; }).sort(function (a, b) { return (S[a].pl || 99) - (S[b].pl || 99); });
    // the fields
    var gap = N > 4 ? 5 : 8, cs = Math.max(3, Math.min(9, Math.floor((332 - gap * (N - 1)) / (N * 12)))), fw = 12 * cs, fh = 22 * cs, top = 15, fs = N > 4 ? 7.5 : 9;
    var W = N * fw + (N - 1) * gap + 8, H = top + fh + 17, s = '<rect width="' + W + '" height="' + H + '" fill="#07080f"/>';
    S.forEach(function (p, i) {
      var x = 4 + i * (fw + gap), col = TN_PC[i % 6], win = i === d.w, maxc = Math.max(3, Math.floor(fw / (fs * .62)));
      s += '<text x="' + (x + fw / 2) + '" y="10" text-anchor="middle" font-size="' + fs + '" font-weight="900" fill="' + col + '" font-family="ui-monospace,monospace">' + ui.esc((i === mi ? nm(i) : nm(i)).toUpperCase().slice(0, maxc)) + '</text>';
      s += tnField(p.f, x, top, cs);
      if (!win) s += '<rect x="' + x + '" y="' + top + '" width="' + fw + '" height="' + fh + '" fill="rgba(5,6,12,.42)"/><text x="' + (x + fw / 2) + '" y="' + (top + fh * .42) + '" text-anchor="middle" font-size="' + (fs + 2) + '" font-weight="900" fill="#ff4058" stroke="#05060d" stroke-width="2.5" paint-order="stroke" font-family="ui-monospace,monospace">OUT</text>' +
        '<text x="' + (x + fw / 2) + '" y="' + (top + fh * .42 + fs + 3) + '" text-anchor="middle" font-size="' + (fs - .5) + '" font-weight="800" fill="#fff" stroke="#05060d" stroke-width="2.5" paint-order="stroke" font-family="ui-monospace,monospace">' + mmss(p.t) + '</text>';
      s += '<rect x="' + (x - 1) + '" y="' + (top - 1) + '" width="' + (fw + 2) + '" height="' + (fh + 2) + '" fill="none" stroke="' + (win ? '#ffd84a' : i === mi ? 'rgba(255,255,255,.75)' : 'rgba(255,255,255,.14)') + '" stroke-width="' + (win ? 2.2 : 1.2) + '"/>';
      s += '<text x="' + (x + fw / 2) + '" y="' + (H - 4) + '" text-anchor="middle" font-size="' + fs + '" font-weight="900" fill="' + (win ? '#ffd84a' : 'rgba(233,236,255,.6)') + '" font-family="ui-monospace,monospace">' + (p.pl ? ord(p.pl).toUpperCase() : '') + '</text>';
    });
    var main = screen(ui, {
      ac: won ? '#ffd84a' : '#b45ef0', title: (won ? 'Last one standing' : 'Out') + ' · ' + N + ' players' + (d.sk ? ' · ' + d.sk : ''), score: me.pl ? ord(me.pl) : '–', unit: 'of ' + N,
      rank: won ? { t: 'Winner', cls: 'new' } : d.w >= 0 ? { t: nm(d.w) + ' won' } : null,
      pic: svg(W, H, s, { aria: 'Every field as the match ended' }), picMax: 380,
      stats: [['Lines', n(st.ln != null ? st.ln : me.ln)], st.tt ? ['Tetrises', st.tt] : null, ['Specials used', st.u != null ? st.u : tnUsed(me.u).reduce(function (a, x) { return a + x[1]; }, 0)],
        ['Hit by', st.h != null ? st.h : me.r, 'specials'], st.s ? ['Lines sent', st.s] : null, st.g ? ['Picked up', st.g, 'specials'] : null, ['Lasted', mmss(endT(mi))]],
      foot: won ? 'Last one standing' : me.ko >= 0 ? 'Knocked out by ' + nm(me.ko) + ' with ' + tnWhat(me.kk) : 'Topped out', footOk: won
    });
    // how it went: a lane per player, specials landing on them, the moment each went out
    var LH = 19, L0 = 62, W2 = 332, H2 = N * LH + 26, X = function (t) { return L0 + Math.min(1, Math.max(0, t) / tt) * (W2 - L0 - 12); }, row = {};
    order.forEach(function (i, k) { row[i] = k; });
    var g = '<rect width="' + W2 + '" height="' + H2 + '" rx="6" fill="#05060d"/>';
    for (var m = 60; m < tt; m += 60) g += '<rect x="' + X(m).toFixed(1) + '" y="4" width=".7" height="' + (N * LH + 4) + '" fill="rgba(140,160,255,.14)"/><text x="' + X(m).toFixed(1) + '" y="' + (H2 - 6) + '" text-anchor="middle" font-size="8" font-weight="800" fill="rgba(233,236,255,.45)" font-family="ui-monospace,monospace">' + (m / 60) + ':00</text>';
    order.forEach(function (i, k) {
      var y = 6 + k * LH, c = TN_PC[i % 6];
      g += '<text x="6" y="' + (y + LH / 2 + 3) + '" font-size="9" font-weight="900" fill="' + c + '" font-family="ui-monospace,monospace">' + ui.esc(nm(i).toUpperCase().slice(0, 8)) + '</text>';
      g += '<rect x="' + L0 + '" y="' + (y + 4) + '" width="' + (X(endT(i)) - L0).toFixed(1) + '" height="' + (LH - 8) + '" rx="3" fill="' + c + '" opacity=".26"/>';
      if (i === d.w) g += '<path d="' + starPath(X(tt), y + LH / 2, 6.5, 2.8) + '" fill="#ffd84a" stroke="#05060d" stroke-width="1"/>';
    });
    (d.ev || []).forEach(function (str) {
      var a = String(str).split('|'), t = +a[0], f = +a[1], to = +a[2], k = a[3];
      if (k === 'X') { if (row[to] == null) return; var yx = 6 + row[to] * LH + LH / 2, xx = X(t), kc = f >= 0 ? TN_PC[f % 6] : '#8a90b0'; g += '<path d="M' + (xx - 4.5) + ' ' + (yx - 4.5) + 'l9 9M' + (xx + 4.5) + ' ' + (yx - 4.5) + 'l-9 9" stroke="#05060d" stroke-width="5" stroke-linecap="round"/><path d="M' + (xx - 4.5) + ' ' + (yx - 4.5) + 'l9 9M' + (xx + 4.5) + ' ' + (yx - 4.5) + 'l-9 9" stroke="' + kc + '" stroke-width="2.4" stroke-linecap="round"/>'; return; }
      if (k.charAt(0) === 'L') { S.forEach(function (p, i) { if (i === f || t > endT(i) || row[i] == null) return; var yl = 6 + row[i] * LH, hh = +k.slice(1) * 2 + 2; g += '<rect x="' + (X(t) - .9).toFixed(1) + '" y="' + (yl + LH - 4 - hh) + '" width="1.8" height="' + hh + '" fill="#ff4058"/>'; }); return; }
      var sp = TN_SP[k]; if (!sp || row[to] == null) return;
      var ys = 6 + row[to] * LH + LH / 2, xs = X(t).toFixed(1);
      g += to === f ? '<circle cx="' + xs + '" cy="' + ys + '" r="3" fill="none" stroke="' + sp[1] + '" stroke-width="1.6"/>' : '<circle cx="' + xs + '" cy="' + ys + '" r="3.3" fill="' + sp[1] + '" stroke="#05060d" stroke-width="1"/>';
    });
    g += '<text x="' + L0 + '" y="' + (H2 - 6) + '" font-size="8" font-weight="800" fill="rgba(233,236,255,.45)" font-family="ui-monospace,monospace">0:00</text><text x="' + (W2 - 12) + '" y="' + (H2 - 6) + '" text-anchor="end" font-size="8" font-weight="800" fill="rgba(233,236,255,.45)" font-family="ui-monospace,monospace">' + mmss(tt) + '</text>';
    var usedKinds = {}; (d.ev || []).forEach(function (str) { var k = String(str).split('|')[3]; if (TN_SP[k]) usedKinds[k] = 1; });
    var laneKey = chips(ui, Object.keys(usedKinds).map(function (k) { return [TN_SP[k][0], TN_SP[k][1]]; }).concat([['Lines added', '#ff4058'], ['Out', '#8a90b0']]));
    // knockouts, in order
    var outs = order.slice().filter(function (i) { return i !== d.w; }).sort(function (a, b) { return (S[a].t || 0) - (S[b].t || 0); });
    var koLines = outs.map(function (i) { var p = S[i]; return { b: mmss(p.t), c: p.ko >= 0 ? TN_PC[p.ko % 6] : '#8a90b0', t: p.ko >= 0 ? nm(p.ko) + ' knocked out ' + nm(i) + ' with ' + tnWhat(p.kk) : nm(i) + ' topped out' }; });
    if (d.w >= 0) koLines.push({ b: mmss(tt), c: '#ffd84a', t: nm(d.w) + ' was the last one standing' });
    // each player on a tap: their field big, and what they did
    var card = ui.el('div', { class: 'ar-card' });
    function showP(k) {
      var i = order[k], p = S[i], c9 = 9, fs2 = svg(12 * c9 + 4, 22 * c9 + 4, '<rect width="' + (12 * c9 + 4) + '" height="' + (22 * c9 + 4) + '" fill="' + (i === d.w ? '#ffd84a' : '#2a2f4a') + '"/>' + tnField(p.f, 2, 2, c9), { aria: nm(i) + '’s field' });
      var used = tnUsed(p.u), kos = S.map(function (q, j) { return q.ko === i ? nm(j) : null; }).filter(Boolean);
      card.innerHTML = '';
      card.appendChild(ui.el('div', { class: 'ar-two' }, [ui.el('div', { class: 'ar-pic', html: fs2 }), ui.el('div', { class: 'ar-st' }, [
        stat(ui, 'Finished', (p.pl ? ord(p.pl) : '–') + (i === mi ? ' · you' : ''), i === d.w ? 'last one standing' : 'out at ' + mmss(p.t), TN_PC[i % 6]),
        stat(ui, 'Lines', n(p.ln)), stat(ui, 'Hit by', p.r || 0, 'specials from rivals'), p.sl ? stat(ui, 'Lines sent', p.sl, 'to everyone else') : null,
        kos.length ? stat(ui, 'Knocked out', kos.join(', ')) : null,
        p.ko >= 0 ? stat(ui, 'Out by', nm(p.ko), tnWhat(p.kk)) : null])]));
      card.appendChild(used.length ? chips(ui, used.map(function (x) { return [TN_SP[x[0]][0] + ' ×' + x[1], TN_SP[x[0]][1]]; })) : ui.el('div', { class: 'ar-sub', text: 'Used no specials' }));
    }
    var items = order.map(function (i) { return { t: nm(i).slice(0, 9), c: TN_PC[i % 6], ink: true, title: nm(i) + ', ' + ord(S[i].pl || 0) }; });
    return ui.wrap([main,
      ui.section('How it went', pane(ui, [ui.el('div', { class: 'ar-pic', html: svg(W2, H2, g, { aria: 'A lane for each player: dots are specials that hit them, red ticks are lines added, a cross is when they went out' }) }), laneKey, legend(ui, koLines)], '#b45ef0'), { icon: 'chart' }),
      ui.section('Every player · tap one', pane(ui, [strip(ui, items, order.indexOf(mi), showP), card], '#b45ef0'), { icon: 'users' })]);
  });
  // ═══ Donkey Kong ═══
  // The stage where the last life went, drawn as the cabinet lays it out (girders, ladders, Kong, Pauline) with a mark
  // where each life ended on it; the score stage by stage; and every stage played on a tap.
  var DK_SEQ = [[1, 4], [1, 3, 4], [1, 2, 3, 4], [1, 2, 1, 3, 4], [1, 2, 1, 3, 1, 4]];
  var DK_NAME = { 1: 'Girders', 2: 'Conveyors', 3: 'Elevators', 4: 'Rivets' };
  var DK_WHY = { barrel: 'a barrel', fireball: 'a fireball', firefox: 'a firefox', pie: 'a cement pan', spring: 'a spring', dk: 'Donkey Kong himself', fall: 'a fall', time: 'the bonus timer', elevator: 'the top of an elevator' };
  // the stages as the game builds them (games/donkeykong.html buildStage): platforms by 16-pixel piece, ladders by where they stand
  function dkStage(kind) {
    var S = { kind: kind, plats: [], lads: [], elev: null, rivets: [], dk: [44, 84], pa: [96, 56], oil: null };
    function seq(a, n, d) { var r = []; for (var i = 0; i < n; i++) r.push(a + i * d); return r; }
    function flat(y, k) { return seq(y, k, 0); }
    function P(x0, ys, o) { o = o || {}; S.plats.push({ x0: x0, x1: o.x1 || x0 + ys.length * 16, ys: ys, conv: !!o.conv }); return S.plats.length - 1; }
    function surf(p, x) { var i = Math.floor((x - p.x0) / 16); return p.ys[Math.max(0, Math.min(p.ys.length - 1, i))]; }
    function L(x, lo, up, o) { o = o || {}; var yb = surf(S.plats[lo], x), yt = surf(S.plats[up], x); S.lads.push({ x: x, yb: yb, yt: yt, br: !!o.broken, stub: o.stub || Math.round((yb - yt) * .42) }); }
    if (kind === 1) {
      var g0 = P(0, [248, 248, 248, 248, 248, 248, 248, 247, 246, 245, 244, 243, 242, 241]), g1 = P(0, seq(208, 13, 1)), g2 = P(16, seq(187, 13, -1)), g3 = P(0, seq(142, 13, 1)),
        g4 = P(16, seq(121, 13, -1)), g5 = P(0, [84, 84, 84, 84, 84, 84, 84, 84, 84, 85, 86, 87, 88]), top = P(88, [56, 56, 56]);
      L(84, g0, g1, { broken: true, stub: 8 }); L(188, g0, g1); L(36, g1, g2); L(100, g1, g2); L(68, g2, g3, { broken: true, stub: 8 }); L(116, g2, g3); L(188, g2, g3);
      L(36, g3, g4); L(76, g3, g4); L(172, g3, g4, { broken: true, stub: 8 }); L(92, g4, g5, { broken: true, stub: 13 }); L(188, g4, g5); L(132, g5, top);
      S.oil = [24, 248];
    } else if (kind === 2) {
      var f0 = P(0, flat(248, 14)), c1 = P(0, flat(208, 14), { conv: 1 }), mL = P(8, flat(168, 3), { x1: 48 }), mC = P(64, flat(168, 6), { x1: 152 }), mR = P(168, flat(168, 3), { x1: 216 });
      var cL = P(0, flat(128, 6), { conv: 1 }), cR = P(128, flat(128, 6), { conv: 1 }), c4 = P(0, flat(88, 14), { conv: 1 }), pt = P(88, flat(56, 3));
      [28, 84, 140, 196].forEach(function (x) { L(x, f0, c1); });
      L(68, c1, mC); L(148, c1, mC); L(28, mL, cL); L(84, mC, cL); L(140, mC, cR); L(196, mR, cR); L(20, cL, c4, { stub: 16 }); L(204, cR, c4, { stub: 16 }); L(132, c4, pt);
      S.dk = [112, 88];
    } else if (kind === 3) {
      P(0, flat(248, 2)); P(48, flat(248, 3)); P(112, flat(248, 7)); P(32, [240], { x1: 48 }); P(96, [240], { x1: 112 });
      var l232 = P(0, [232, 232], { x1: 24 }), l192 = P(0, [192, 192], { x1: 24 }), l136 = P(0, [136, 136], { x1: 24 }), m136 = P(56, flat(136, 2)), m208 = P(64, [208, 208], { x1: 88 });
      var tg = P(0, flat(88, 11), { x1: 168 }), p3 = P(88, flat(56, 3));
      P(120, [232, 232], { x1: 144 }); P(152, [224], { x1: 168 }); P(176, [216], { x1: 192 });
      var s4 = P(200, [208, 208], { x1: 224 }), s5 = P(208, [184], { x1: 224 }), s6 = P(184, [176], { x1: 200 });
      P(160, [168], { x1: 176 }); var s8 = P(136, [160], { x1: 152 }), s9 = P(184, flat(144, 3), { x1: 224 }), s10 = P(128, [128, 128], { x1: 152 }), s11 = P(160, [120], { x1: 176 });
      P(184, [112], { x1: 200 }); var s13 = P(208, [104], { x1: 224 });
      L(12, l232, l192); L(20, l192, l136); L(68, m208, m136); L(84, m208, m136); L(132, tg, p3); L(140, s8, s10); L(164, s11, tg); L(188, s6, s9); L(212, s9, s13); L(212, s4, s5);
      S.elev = [32, 96];
    } else {
      P(0, flat(248, 14)); var q1 = P(8, flat(208, 13)), q2 = P(16, flat(168, 12)), q3 = P(24, flat(128, 11)), q4 = P(32, flat(88, 10)), q0 = 0; P(88, flat(48, 3));
      L(20, q0, q1); L(112, q0, q1); L(204, q0, q1); L(28, q1, q2); L(88, q1, q2); L(136, q1, q2); L(196, q1, q2); L(36, q2, q3); L(112, q2, q3); L(188, q2, q3); L(44, q3, q4); L(180, q3, q4);
      [q1, q2, q3, q4].forEach(function (pi) { [48, 168].forEach(function (rx) { S.rivets.push([rx, S.plats[pi].ys[0]]); }); });
      S.dk = [112, 88]; S.pa = [104, 48];
    }
    return S;
  }
  function dkMan(x, y, dead) {   // Jumpman, feet at (x, y); lying down when it cost a life
    return '<g transform="translate(' + x + ' ' + y + ')' + (dead ? ' rotate(-90)' : '') + ' translate(-6 -16)"><rect x="3" y="0" width="7" height="2" fill="#fa0000"/><rect x="2" y="2" width="10" height="2" fill="#fa0000"/>' +
      '<rect x="3" y="4" width="7" height="4" fill="#ffb27a"/><rect x="2" y="5" width="2" height="2" fill="#6a2a00"/><rect x="2" y="8" width="9" height="5" fill="#2846ff"/><rect x="0" y="8" width="3" height="3" fill="#fa0000"/>' +
      '<rect x="10" y="8" width="3" height="3" fill="#fa0000"/><rect x="2" y="13" width="3" height="3" fill="#8a4a1a"/><rect x="8" y="13" width="3" height="3" fill="#8a4a1a"/></g>';
  }
  // marks: [{x, y, n, last}]
  function dkPic(kind, marks, hud) {
    var S = dkStage(kind), s = '<rect width="224" height="256" fill="#000"/>', gp = '', cp = '', lp = '';
    S.plats.forEach(function (p) {
      for (var x = p.x0; x < p.x1; x += 16) {
        var y = p.ys[Math.min(p.ys.length - 1, Math.floor((x - p.x0) / 16))], w = Math.min(16, p.x1 - x), seg = 'M' + x + ' ' + (y + .6) + 'h' + w + 'M' + x + ' ' + (y + 7.4) + 'h' + w;
        if (w === 16) seg += 'M' + x + ' ' + (y + 1) + 'l4 6l4 -6l4 6l4 -6';
        if (p.conv) cp += seg; else gp += seg;
      }
    });
    S.lads.forEach(function (l) {
      function part(y0, y1) { if (y1 <= y0) return; lp += 'M' + (l.x - 3.5) + ' ' + y0 + 'V' + y1 + 'M' + (l.x + 3.5) + ' ' + y0 + 'V' + y1; for (var y = y0 + 2; y < y1; y += 4) lp += 'M' + (l.x - 3.5) + ' ' + y + 'h7'; }
      if (l.br) { part(l.yt + 8, l.yt + 12); part(l.yb - l.stub, l.yb); } else part(l.yt + 8, l.yb);
    });
    s += '<path d="' + lp + '" stroke="#00e8ff" stroke-width="1.2" fill="none"/>';
    if (S.elev) S.elev.forEach(function (ex, j) {
      s += '<path d="M' + (ex + 2) + ' 104V240M' + (ex + 14) + ' 104V240" stroke="#ffb000" stroke-width="1" opacity=".75"/><rect x="' + ex + '" y="98" width="16" height="6" fill="#fa2899"/><rect x="' + ex + '" y="240" width="16" height="8" fill="#fa2899"/>';
      for (var cy = 116 + j * 22; cy < 240; cy += 44) s += '<rect x="' + (ex + 1) + '" y="' + cy + '" width="14" height="6" fill="#ff8a00"/><rect x="' + (ex + 1) + '" y="' + cy + '" width="14" height="1.5" fill="#ffd27a"/>';
    });
    s += '<path d="' + gp + '" stroke="#fa2899" stroke-width="1.3" fill="none"/>';
    if (cp) s += '<path d="' + cp + '" stroke="#ff9c00" stroke-width="1.3" fill="none"/>';
    S.rivets.forEach(function (r) { s += '<rect x="' + r[0] + '" y="' + r[1] + '" width="8" height="8" fill="#fab900"/><rect x="' + (r[0] + 2) + '" y="' + (r[1] + 2) + '" width="4" height="4" fill="#990000"/>'; });
    if (S.oil) s += '<rect x="16" y="232" width="16" height="16" rx="1" fill="#2846ff"/><rect x="16" y="236" width="16" height="1.5" fill="#9fb4ff"/><rect x="16" y="243" width="16" height="1.5" fill="#9fb4ff"/><text x="24" y="242" text-anchor="middle" font-size="5" font-weight="900" fill="#fff" font-family="ui-monospace,monospace">OIL</text>' +
      '<path d="M18 232q3 -9 6 -3q2 -7 6 0q-1 -5 2 3z" fill="#ff8a00"/>';
    // Kong and Pauline
    var kx = S.dk[0], ky = S.dk[1];
    s += '<g transform="translate(' + kx + ' ' + ky + ')"><ellipse cx="0" cy="-14" rx="17" ry="13" fill="#9a3a12"/><ellipse cx="0" cy="-10" rx="9" ry="8" fill="#f0b070"/><circle cx="0" cy="-27" r="8" fill="#9a3a12"/>' +
      '<ellipse cx="0" cy="-24" rx="5" ry="3.5" fill="#f0b070"/><rect x="-4" y="-30" width="2" height="2" fill="#fff"/><rect x="2" y="-30" width="2" height="2" fill="#fff"/><rect x="-17" y="-6" width="9" height="6" rx="2" fill="#9a3a12"/><rect x="8" y="-6" width="9" height="6" rx="2" fill="#9a3a12"/></g>';
    var px = S.pa[0], py = S.pa[1];
    s += '<g transform="translate(' + px + ' ' + py + ')"><path d="M-5 0l2 -12h6l2 12z" fill="#ff5fae"/><circle cx="0" cy="-15" r="3.5" fill="#ffb27a"/><path d="M-4 -16q4 -6 8 0v6h-2v-5h-4v5h-2z" fill="#ffd200"/></g>';
    if (hud) s += '<text x="4" y="11" font-size="9" font-weight="900" fill="#fff" font-family="ui-monospace,monospace">' + hud[0] + '</text><text x="220" y="11" text-anchor="end" font-size="9" font-weight="900" fill="#00e8ff" font-family="ui-monospace,monospace">' + hud[1] + '</text>';
    (marks || []).forEach(function (m) {
      if (m.x == null || isNaN(m.x)) return;
      var x = Math.max(8, Math.min(216, m.x)), y = Math.max(20, Math.min(252, m.y));
      if (m.last) s += '<circle cx="' + x + '" cy="' + (y - 7) + '" r="13" fill="none" stroke="#fff" stroke-width="1.4" stroke-dasharray="3 2.5"/>' + dkMan(x, y, true);
      else s += '<circle cx="' + x + '" cy="' + (y - 6) + '" r="5" fill="#fa0000" stroke="#000" stroke-width="1"/>';
      if (m.n) s += '<text x="' + x + '" y="' + (y - (m.last ? 22 : 3.5)) + '" text-anchor="middle" font-size="' + (m.last ? 8 : 6.5) + '" font-weight="900" fill="#fff" stroke="#000" stroke-width="2" paint-order="stroke" font-family="ui-monospace,monospace">' + m.n + '</text>';
    });
    return svg(224, 256, s, { crisp: true, aria: 'The ' + (DK_NAME[kind] || '').toLowerCase() + ' stage' });
  }
  // the stage list from the record: each one with its height on the way up that level
  function dkEvents(d) {
    var si = 0, lv = 0, life = 0;
    return (d.ev || []).map(function (str) {
      var a = String(str).split('|'), l = +a[0], k = +a[1], seqL = DK_SEQ[Math.min(Math.max(l, 1), 5) - 1];
      if (l !== lv) { lv = l; si = 0; }
      var j = seqL.indexOf(k, si); if (j < 0) j = seqL.indexOf(k); if (j >= 0) si = j;
      var x = { l: l, k: k, r: a[2], b: +a[3] || 0, t: +a[4] || 0, s: +a[5] || 0, x: +a[6], y: +a[7], h: (si + 1) * 25 };
      if (x.r === 'C') si++; else x.life = ++life;
      return x;
    });
  }
  R('donkeykong', function (e, ui) {
    var d = e.dt; if (!d || d.lv == null) return null;
    var ev = dkEvents(d), deaths = ev.filter(function (x) { return x.r !== 'C'; }), last = deaths[deaths.length - 1], dd = d.dd || [], ldd = dd[dd.length - 1];
    var kind = last ? last.k : d.k || 1;
    var marks = deaths.filter(function (x) { return x.k === kind; }).map(function (x) { return { x: x.x, y: x.y, n: x.life, last: x === last }; });
    var main = screen(ui, {
      ac: '#fa2899', title: 'Game over · L=' + (d.lv < 10 ? '0' : '') + d.lv, score: n(myScore(e)), rank: rankText(d),
      pic: dkPic(kind, marks, ['L=' + (d.lv < 10 ? '0' : '') + d.lv, (last ? last.h : d.h) + ' m']), side: true, picMax: 170,
      stats: [['Reached', 'Level ' + d.lv, d.h + ' m · ' + (DK_NAME[d.k] || '').toLowerCase()], ['Stages cleared', d.st || 0], d.j ? ['Jumped', d.j, 'barrels and fireballs'] : null, d.sm ? ['Hammer', d.sm, 'smashed'] : null,
        d.rv ? ['Rivets', d.rv] : null, d.it ? ['Pauline’s things', d.it] : null, d.lvs && d.lvs !== 3 ? ['Lives', d.lvs] : null],
      foot: ldd ? 'Last life lost to ' + (DK_WHY[ldd.b] || ldd.b) + ' at ' + ldd.h + ' m' : ''
    });
    var out = [main];
    // how each life ended
    var lives = (deaths.length ? deaths.map(function (x) { return { b: 'Life ' + x.life, c: '#fa0000', t: 'Level ' + x.l + ', ' + x.h + ' m: ' + (DK_WHY[x.r] || x.r) + (x.t ? ' after ' + mmss(x.t) : '') }; })
      : dd.map(function (x, i) { return { b: 'Life ' + (i + 1), c: '#fa0000', t: 'Level ' + x.l + ', ' + x.h + ' m: ' + (DK_WHY[x.b] || x.b) }; }));
    if (ev.length >= 2) {
      var v = [0].concat(ev.map(function (x) { return x.s; })), lvTicks = [], seen = {};
      ev.forEach(function (x, i) { if (!seen[x.l]) { seen[x.l] = 1; lvTicks.push({ i: i, t: 'L' + x.l }); } });
      var ch = chart({ v: v, c: '#00e8ff', marks: ev.map(function (x, i) { return { i: i + 1, k: x.r === 'C' ? 'dot' : 'x', c: x.r === 'C' ? '#7dff9a' : '#ff4058' }; }), ticks: lvTicks, aria: 'Score after each stage: dots cleared, crosses cost a life' });
      out.push(ui.section('How it went', pane(ui, [ui.el('div', { class: 'ar-pic', html: ch }), key(ui, [['Stage cleared', '#7dff9a'], ['Life lost', '#ff4058']]), lives.length ? legend(ui, lives) : null], '#fa2899'), { icon: 'chart' }));
      var card = ui.el('div', { class: 'ar-card' });
      var show = function (i) {
        var x = ev[i], ok = x.r === 'C';
        card.innerHTML = '';
        card.appendChild(ui.el('div', { class: 'ar-two' }, [ui.el('div', { class: 'ar-pic', html: dkPic(x.k, ok ? [] : [{ x: x.x, y: x.y, last: true }], ['L=' + (x.l < 10 ? '0' : '') + x.l, x.h + ' m']) }), ui.el('div', { class: 'ar-st' }, [
          stat(ui, 'Stage', x.h + ' m', 'level ' + x.l + ' · ' + (DK_NAME[x.k] || '').toLowerCase()),
          ok ? stat(ui, 'Cleared', mmss(x.t), 'bonus ' + n(x.b), '#7dff9a') : stat(ui, 'Life ' + x.life + ' lost', DK_WHY[x.r] || x.r, 'after ' + mmss(x.t) + (x.b ? ' · ' + n(x.b) + ' bonus left' : ''), '#ff4058'),
          stat(ui, 'Score', n(x.s))])]));
      };
      var items = ev.map(function (x) { return { t: x.h, c: x.r === 'C' ? '#2fd35a' : '#ff4058', ink: x.r === 'C', title: 'Level ' + x.l + ', ' + x.h + ' m: ' + (x.r === 'C' ? 'cleared' : 'lost a life') }; });
      out.push(ui.section(ev.length >= 40 ? 'The last 40 stages · tap one' : 'Every stage · tap one', pane(ui, [strip(ui, items, ev.length - 1, show), card], '#fa2899'), { icon: 'flag' }));
    } else if (lives.length) out.push(ui.section('How each life ended', pane(ui, legend(ui, lives), '#fa2899'), { icon: 'heart' }));
    return ui.wrap(out);
  });

  // ═══ Carmen Sandiego ═══
  // The case file in the game's own look: the pixel travel map with your route and the thief's trail, the warrant,
  // and every stop on a tap (when you got there, and what the witnesses said).
  HistView.css('hv-carmen', [
    '@font-face{font-family:"Press Start 2P";src:url("' + ROOT + 'fonts/press-start-2p.woff2") format("woff2");font-display:swap;}',
    '@font-face{font-family:"Jersey 10";src:url("' + ROOT + 'fonts/jersey-10.woff2") format("woff2");font-display:swap;}',
    '.csh{--csp:"Press Start 2P",ui-monospace,monospace;--csv:"Jersey 10",ui-monospace,monospace;display:flex;flex-direction:column;gap:8px;padding:7px;border-radius:4px;',
    'background:linear-gradient(180deg,#b8bcc8,#9a9eac);box-shadow:inset 2px 2px 0 #e4e6ee,inset -2px -2px 0 #5a5e6c,0 6px 14px rgba(0,0,0,.45);}',
    '.csh-n{position:relative;background:#0a0c2e;border-radius:2px;padding:10px 11px;box-shadow:inset 2px 2px 0 #000,inset -1px -1px 0 #3a3e5a;color:#e8e8f0;overflow:hidden;}',
    '.csh-t{font:400 .6rem/1.6 var(--csp);color:#ffd860;text-shadow:2px 2px 0 #5a2a00;}',
    '.csh-big{font:400 .82rem/1.35 var(--csp);color:#ffd860;text-shadow:2px 2px 0 #5a2a00;margin:2px 0 4px;}',
    '.csh-v{font:400 1.22rem/1.02 var(--csv);color:#a8b4ff;}',
    '.csh-v b{font-weight:400;color:#fff;}',
    '.csh-stamp{position:absolute;right:9px;top:9px;font:400 .52rem/1 var(--csp);padding:6px 7px;border:3px solid currentColor;transform:rotate(-9deg);color:#58f070;background:rgba(0,0,0,.25);}',
    '.csh-stamp.bad{color:#ff5a5a;}',
    '.csh-map{position:relative;line-height:0;border-radius:2px;overflow:hidden;box-shadow:inset 2px 2px 0 #000;}',
    '.csh-map canvas{width:100%;height:auto;display:block;image-rendering:pixelated;aspect-ratio:384/240;background:#1e3c9a;}',
    '.csh-map svg{position:absolute;inset:0;width:100%;height:100%;}',
    '.csh-st{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;}',
    '.csh-st>div{background:#0a0c2e;border-radius:2px;padding:7px 8px;box-shadow:inset 2px 2px 0 #000,inset -1px -1px 0 #3a3e5a;min-width:0;}',
    '.csh-st b{display:block;font:400 .56rem/1.45 var(--csp);color:#ffd860;overflow-wrap:anywhere;}',
    '.csh-st small{display:block;font:400 1.02rem/1 var(--csv);color:#a8b4ff;margin-top:3px;}',
    '.csh-paper{background:#efe6cc;color:#2a2010;border-radius:2px;padding:10px 12px;font:400 1.15rem/1.08 var(--csv);box-shadow:inset 0 0 0 3px #efe6cc,inset 0 0 0 4px #5a4a30;}',
    '.csh-paper b{display:block;font:400 .55rem/1.6 var(--csp);color:#8a1010;margin:2px 0 4px;}',
    '.csh-paper .row{display:flex;flex-wrap:wrap;gap:3px 12px;}',
    '.csh-paper .row span{color:#5a4a30;}.csh-paper .row em{font-style:normal;color:#2a2010;}',
    '.csh-paper p{margin:5px 0 0;}.csh-paper p i{font-style:normal;color:#8a1010;}',
    '.csh-road .ar-rb{border-radius:2px;font:400 .5rem/1 var(--csp);min-width:28px;height:28px;box-shadow:inset -2px -2px 0 rgba(0,0,0,.3),inset 2px 2px 0 rgba(255,255,255,.3);}',
    '.csh-road .ar-rb.on{outline-color:#fff;}',
    '.csh-foot{font:400 .55rem/1.7 var(--csp);color:#2a2010;text-align:center;padding:2px 4px;}'
  ].join(''));
  var CS_VIEW = { world: { lon0: -170, lon1: 190, lat0: -50, lat1: 76 }, usa: 'usa', time: { lon0: -170, lon1: 190, lat0: -50, lat1: 76 }, europe: { lon0: -26, lon1: 42, lat0: 33, lat1: 68 },
    asia: { lon0: 24, lon1: 146, lat0: -12, lat1: 56 }, africa: { lon0: -20, lon1: 60, lat0: -37, lat1: 38 }, americas: { lon0: -168, lon1: -28, lat0: -57, lat1: 64 } };
  var CS_VER = { world: 'World', usa: 'USA', time: 'Time', europe: 'Europe', asia: 'Asia', africa: 'Africa', americas: 'Americas' };
  var CS_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Mon'];
  function csTime(h) { var d = Math.floor(h / 24), hr = Math.floor(h % 24); return CS_DAYS[Math.min(7, d)] + ' ' + (hr % 12 || 12) + ':00 ' + (hr < 12 ? 'am' : 'pm'); }
  function csHrs(h) { h = Math.max(0, Math.floor(h)); return h >= 24 ? Math.floor(h / 24) + (h >= 48 ? ' days ' : ' day ') + (h % 24) + ' hrs' : h + ' hrs'; }
  function csYear(y) { if (y === '' || y == null || isNaN(+y)) return ''; y = +y; return y < 0 ? (-y) + ' BC' : y < 1000 ? 'AD ' + y : String(y); }
  // the travel map's projection, as games/carmen/art.js makes it (384 × 240)
  function csProj(view, raw) {
    function mk(v, ox, oy, w, h) {
      var lm = (v.lat0 + v.lat1) / 2, k = Math.cos(lm * Math.PI / 180), pw = (v.lon1 - v.lon0) * k, ph = v.lat1 - v.lat0, sc = Math.min(w / pw, h / ph), dx = ox + (w - pw * sc) / 2, dy = oy + (h - ph * sc) / 2;
      return function (lat, lon) { var L = lon; if (!raw && v.lon1 > 180 && L < v.lon0) L += 360; return { x: dx + (L - v.lon0) * k * sc, y: dy + (v.lat1 - lat) * sc }; };
    }
    if (view === 'usa') {
      var main = mk({ lon0: -126, lon1: -65, lat0: 23, lat1: 50 }, 0, 0, 384, 240), ak = mk({ lon0: -170, lon1: -130, lat0: 51, lat1: 72 }, 4, 166, 88, 70), hi = mk({ lon0: -161, lon1: -154.5, lat0: 18.8, lat1: 22.4 }, 96, 200, 50, 34);
      return function (lat, lon) { if (lon < -129 && lat > 50) return ak(lat, lon); if (lon < -150 && lat < 25) return hi(lat, lon); return main(lat, lon); };
    }
    return mk(view, 0, 0, 384, 240);
  }
  var csRings = {};
  function csRingsOf(kind) {
    if (csRings[kind]) return csRings[kind];
    var src = (window.CARMEN_MAPS || {})[kind]; if (!src) return null;
    return (csRings[kind] = src.split('|').map(function (r) {
      var id = null, m = /^(\d+):/.exec(r); if (m) { id = m[1]; r = r.slice(m[0].length); }
      var parts = r.split(';'), a = parts[0].split(','), x = parseInt(a[0], 36), y = parseInt(a[1], 36), pts = [[x / 10, y / 10]];
      for (var i = 1; i < parts.length; i++) { a = parts[i].split(','); x += parseInt(a[0], 36); y += parseInt(a[1], 36); pts.push([x / 10, y / 10]); }
      return { id: id, pts: pts };
    }));
  }
  var csLoading = null;
  function csMaps(cb) {
    if (window.CARMEN_MAPS) return cb();
    if (!csLoading) csLoading = new Promise(function (res) { var sc = document.createElement('script'); sc.src = ROOT + 'games/carmen/maps.js'; sc.onload = sc.onerror = function () { res(); }; document.head.appendChild(sc); });
    csLoading.then(cb);
  }
  // land and sea in the game's colours
  function csLand(cv, vk) {
    var x = cv.getContext('2d'), view = CS_VIEW[vk] || CS_VIEW.world, usa = view === 'usa', pr = csProj(view, true);
    x.fillStyle = '#1e3c9a'; x.fillRect(0, 0, 384, 240); x.fillStyle = '#2a4cb0';
    for (var yy = 0; yy < 240; yy++) for (var xx = (23 - (yy * 3) % 23) % 23; xx < 384; xx += 23) x.fillRect(xx, yy, 1, 1);
    var rings = csRingsOf(usa ? 'usa' : 'world'); if (!rings) return;
    var STATE = ['#4a9a4a', '#5aa850', '#3c8a40', '#6ab05a', '#4c9448'];
    rings.forEach(function (r) {
      var lo = Infinity, hi = -Infinity; r.pts.forEach(function (p) { lo = Math.min(lo, p[0]); hi = Math.max(hi, p[0]); });
      if (!usa && r.pts.every(function (q) { return q[1] < -55; })) return;
      // a ring cut at the date line keeps its far-east end (Chukotka) on the east side, and western Europe where it is;
      // a ring wholly west of the view's left edge moves round to the right
      var wrap = !usa && hi - lo > 300, east = !usa && !wrap && view.lon1 > 180 && hi < view.lon0;
      var pts = r.pts.map(function (p) { return pr(p[1], (wrap && p[0] < -120) || east ? p[0] + 360 : p[0]); });
      var mnx = Infinity, mxx = -Infinity; pts.forEach(function (q) { mnx = Math.min(mnx, q.x); mxx = Math.max(mxx, q.x); });
      if (mxx < 0 || mnx > 384) return;
      x.beginPath(); pts.forEach(function (q, i) { if (i) x.lineTo(q.x, q.y); else x.moveTo(q.x, q.y); }); x.closePath();
      x.fillStyle = usa ? STATE[(parseInt(r.id, 10) || 0) % 5] : '#3c8a3c'; x.fill();
      x.strokeStyle = usa ? '#2a5a2a' : '#2a6a2a'; x.lineWidth = 1; x.stroke();
    });
    if (usa) { x.strokeStyle = '#6a8ad0'; x.lineWidth = 1; x.strokeRect(2.5, 164.5, 92, 74); x.strokeRect(94.5, 198.5, 54, 38); }
  }
  function csPlace(s) { var a = String(s).split('|'); return { name: a[0], lat: +a[1], lon: +a[2], year: a[3] }; }
  R('carmen', function (e, ui) {
    var d = e.dt; if (!d) return null;
    var el = ui.el;
    // older cases saved only a few words
    if (!d.pl) {
      if (!d.Trail) return null;
      var okOld = d.Result === 'Arrested';
      return el('div', { class: 'csh' }, [el('div', { class: 'csh-n' }, [el('div', { class: 'csh-t', text: 'ACME CASE FILE' }), el('div', { class: 'csh-v', html: 'The treasure: <b>' + ui.esc(d.Treasure || '') + '</b><br>Suspect: <b>' + ui.esc(d.Suspect || '') + '</b><br>' + ui.esc((d.Version || '') + ' · ' + (d.Rank || '')) }),
        el('div', { class: 'csh-stamp' + (okOld ? '' : ' bad'), text: okOld ? 'ARRESTED' : 'GOT AWAY' })]),
        el('div', { class: 'csh-paper' }, [el('b', { text: 'THE TRAIL' }), el('div', { text: String(d.Trail).split(' > ').join('  >  ') })])]);
    }
    var P = (d.pl || []).map(csPlace), trail = String(d.trail || '').split(',').filter(function (x) { return x !== ''; }).map(Number);
    var route = String(d.path || '').split(',').filter(Boolean).map(function (x) { var a = x.split('@'); return { p: +a[0], h: +a[1] }; });
    var said = (d.said || []).map(function (s) { var a = String(s).split('|'); return { p: +a[0], loc: a[1], t: a.slice(2).join('|') }; });
    var hide = trail[trail.length - 1], won = !!d.won, time = d.v === 'time';
    function onTrail(pi) { return trail.indexOf(pi) >= 0; }
    var head = el('div', { class: 'csh-n' }, [
      el('div', { class: 'csh-t', text: 'ACME CASE FILE · ' + (CS_VER[d.v] || d.v || '').toUpperCase() }),
      el('div', { class: 'csh-big', text: won ? 'Case closed' : d.why === 'time' ? 'Out of time' : d.why === 'wrongwarrant' ? 'Wrong warrant' : 'No warrant' }),
      el('div', { class: 'csh-v', html: 'The treasure: <b>' + ui.esc(d.tr || '') + '</b><br>The thief: <b>' + ui.esc(d.sus || '') + '</b><br>Detective rank: <b>' + ui.esc(d.rk || '') + '</b>' }),
      el('div', { class: 'csh-stamp' + (won ? '' : ' bad'), text: won ? 'ARRESTED' : 'GOT AWAY' })]);
    // the map: land first (the outlines load if this page doesn't have them), then the route on top
    var cv = el('canvas', { width: 384, height: 240 }), over = el('div', { style: { position: 'absolute', inset: '0' } });
    csMaps(function () { csLand(cv, d.v); });
    var pr = csProj(CS_VIEW[d.v] || CS_VIEW.world);
    function xy(pi) { var p = P[pi]; return p ? pr(p.lat, p.lon) : { x: -99, y: -99 }; }
    function lab(q, text, c) { var left = q.x > 270; return '<text x="' + (q.x + (left ? -7 : 7)).toFixed(1) + '" y="' + (q.y + 2.5).toFixed(1) + '" text-anchor="' + (left ? 'end' : 'start') + '" font-size="6.5" fill="' + (c || '#fff') + '" stroke="#000" stroke-width="2.4" paint-order="stroke" font-family="\'Press Start 2P\',ui-monospace,monospace">' + ui.esc(text) + '</text>'; }
    function drawMap(sel) {
      var s = '';
      // the thief's trail: red dashes from the crime to the hideout
      for (var i = 1; i < trail.length; i++) { var a = xy(trail[i - 1]), b = xy(trail[i]); s += '<line x1="' + a.x.toFixed(1) + '" y1="' + a.y.toFixed(1) + '" x2="' + b.x.toFixed(1) + '" y2="' + b.y.toFixed(1) + '" stroke="#ff4a4a" stroke-width="1.6" stroke-dasharray="3 3"/>'; }
      // your flights: arcs, as the plane flies them in the game
      for (var j = 1; j < route.length; j++) {
        var f = xy(route[j - 1].p), t = xy(route[j].p), mx = (f.x + t.x) / 2, my = (f.y + t.y) / 2 - Math.min(40, Math.hypot(t.x - f.x, t.y - f.y) * 0.3);
        s += '<path d="M' + f.x.toFixed(1) + ' ' + f.y.toFixed(1) + 'Q' + mx.toFixed(1) + ' ' + my.toFixed(1) + ' ' + t.x.toFixed(1) + ' ' + t.y.toFixed(1) + '" fill="none" stroke="' + (sel === j ? '#fff' : 'rgba(255,255,255,.75)') + '" stroke-width="' + (sel === j ? 2.2 : 1.3) + '" stroke-dasharray="' + (sel === j ? '0' : '2 2') + '"/>';
      }
      // the places: the thief's stops as red squares, yours as amber (red ring: a wrong turn), the hideout bigger
      trail.forEach(function (pi, k) { var q = xy(pi), big = pi === hide; s += '<rect x="' + (q.x - (big ? 5 : 3.5)).toFixed(1) + '" y="' + (q.y - (big ? 5 : 3.5)).toFixed(1) + '" width="' + (big ? 10 : 7) + '" height="' + (big ? 10 : 7) + '" fill="' + (big ? '#ff4a4a' : '#c81e24') + '" stroke="#000" stroke-width="1.4"/>'; });
      route.forEach(function (r, k) { var q = xy(r.p), wrong = !onTrail(r.p); s += '<rect x="' + (q.x - 2.5).toFixed(1) + '" y="' + (q.y - 2.5).toFixed(1) + '" width="5" height="5" fill="' + (wrong ? '#fff' : '#ffd860') + '" stroke="' + (wrong ? '#ff4a4a' : '#000') + '" stroke-width="1.3"/>'; });
      var st = xy(trail[0]); s += lab(st, (P[trail[0]] || {}).name || '', '#ffd860');
      if (hide != null && hide !== trail[0]) s += lab(xy(hide), (P[hide] || {}).name || '', '#ff8a8a');
      if (sel != null && route[sel] && route[sel].p !== trail[0] && route[sel].p !== hide) s += lab(xy(route[sel].p), P[route[sel].p].name, '#fff');
      if (sel != null && route[sel]) { var q2 = xy(route[sel].p); s += '<rect x="' + (q2.x - 7).toFixed(1) + '" y="' + (q2.y - 7).toFixed(1) + '" width="14" height="14" fill="none" stroke="#fff" stroke-width="1.6"/>'; }
      over.innerHTML = '<svg viewBox="0 0 384 240" role="img" aria-label="Your route and the thief’s trail">' + s + '</svg>';
    }
    var map = el('div', { class: 'csh-map' }, [cv, over]);
    var mapKey = el('div', { class: 'csh-v', style: { 'font-size': '1rem', color: '#2a2010', display: 'flex', gap: '4px 12px', 'flex-wrap': 'wrap', 'justify-content': 'center' }, html:
      '<span><i style="display:inline-block;width:9px;height:9px;background:#c81e24;border:1.5px solid #000;vertical-align:-1px"></i> The thief’s trail</span>' +
      '<span><i style="display:inline-block;width:8px;height:8px;background:#ffd860;border:1.5px solid #000;vertical-align:-1px"></i> Where you went</span>' +
      '<span><i style="display:inline-block;width:8px;height:8px;background:#fff;border:1.5px solid #ff4a4a;vertical-align:-1px"></i> Wrong turn</span>' });
    function tile(v, l) { return el('div', null, [el('b', { text: String(v) }), el('small', { text: l })]); }
    var tiles = el('div', { class: 'csh-st' }, [tile(csHrs(d.hr || 0), 'on the case'), won ? tile(csHrs(d.left || 0), 'to spare') : tile(Math.max.apply(null, route.map(function (r) { return trail.indexOf(r.p); }).concat([0])) + 1 + ' of ' + trail.length, 'stops reached'),
      tile(d.fl || 0, d.fl === 1 ? 'trip' : 'trips'), tile(d.wg || 0, d.wg === 1 ? 'wrong turn' : 'wrong turns'), tile(d.ak || 0, 'witnesses asked'), d.sc ? tile(n(d.sc), 'points') : tile(d.hm || 0, 'henchmen seen')]);
    var tt = String(d.tt || '').split('|');
    var warrant = el('div', { class: 'csh-paper' }, [el('b', { text: 'WARRANT' }),
      el('div', { html: d.wr ? 'Issued for <i style="font-style:normal;color:#8a1010">' + ui.esc(d.wr) + '</i>' + (d.wr === d.sus ? ': the right one.' : ': the wrong one.') : 'No warrant was issued.' }),
      el('b', { text: 'THE THIEF: ' + String(d.sus || '').toUpperCase() }),
      el('div', { class: 'row', html: [['Sex', d.sx], ['Hair', tt[0]], ['Hobby', tt[1]], ['Feature', tt[2]], ['Auto', tt[3]]].filter(function (x) { return x[1]; }).map(function (x) { return '<span>' + x[0] + ': <em>' + ui.esc(x[1]) + '</em></span>'; }).join('') })]);
    // every stop on a tap
    var card = el('div', { class: 'csh-paper' });
    function showStop(k) {
      var r = route[k], p = P[r.p] || {}, wrong = !onTrail(r.p), words = said.filter(function (x) { return x.p === r.p; });
      card.innerHTML = '';
      card.appendChild(el('b', { text: (k + 1) + '. ' + String(p.name || '').toUpperCase() + (time && csYear(p.year) ? ', ' + csYear(p.year) : '') }));
      card.appendChild(el('div', { text: (k ? 'Arrived ' : 'Started ') + csTime(r.h) + (r.p === hide ? ' · the hideout' : wrong ? ' · a wrong turn: nobody had seen the thief' : k === 0 ? ' · the scene of the crime' : ' · on the trail') }));
      if (words.length) words.forEach(function (w) { card.appendChild(el('p', { html: '<i>' + ui.esc(w.loc) + ':</i> ' + ui.esc(w.t) })); });
      else if (!wrong) card.appendChild(el('p', { text: r.p === hide ? 'The thief was hiding here.' : 'You moved on without asking anyone.' }));
      drawMap(k);
    }
    var items = route.map(function (r, k) { var wrong = !onTrail(r.p); return { t: k + 1, c: r.p === hide ? '#ff4a4a' : wrong ? '#f4f4f8' : '#ffd860', ink: r.p !== hide, title: (P[r.p] || {}).name }; });
    drawMap(null);
    var foot = won ? 'Arrested ' + d.sus + ' with ' + csHrs(d.left || 0) + ' to spare' + (d.pr ? '. Promoted to ' + d.pr + '!' : '')
      : d.why === 'time' ? 'Sunday 5 pm came and ' + d.sus + ' got away'
        : d.why === 'wrongwarrant' ? 'Found ' + d.sus + ', but the warrant was for ' + d.wr
          : 'Found ' + d.sus + ', but without a warrant';
    var kids = [head, map, mapKey, tiles, warrant];
    if (route.length) kids.push(el('div', { class: 'csh-t', style: { color: '#2a2010', 'text-shadow': 'none', padding: '2px 2px 0' }, text: 'EVERY STOP · TAP ONE' }), strip(ui, items, route.length - 1, showStop, { cls: 'csh-road' }), card);
    kids.push(el('div', { class: 'csh-foot', text: foot }));
    return el('div', { class: 'csh' }, kids);
  });

  // ═══ Hot Dog Stand ═══
  // The season on the stadium scoreboard: cash climbing toward the goal event by event, then each event's ticket
  // on a tap with its ledger (prices, what sold, the weather and crowd, who walked away and why, what sold out).
  HistView.css('hv-hotdog', [
    '.hds-board{border-radius:16px;padding:12px;background:linear-gradient(#141218,#0b0a0e);box-shadow:inset 0 0 0 3px #2a2630,inset 0 2px 12px rgba(0,0,0,.9),0 8px 18px -10px rgba(0,0,0,.8);color:#ffd54a;display:flex;flex-direction:column;gap:10px;}',
    '.hds-top{display:flex;justify-content:space-between;align-items:flex-end;gap:8px;flex-wrap:wrap;}',
    '.hds-top small{display:block;font-size:.64rem;font-weight:900;letter-spacing:.14em;text-transform:uppercase;color:#8d8678;}',
    '.hds-top b{display:block;font:400 2.1rem/1 var(--display);color:#7ef0b0;text-shadow:0 0 12px rgba(80,255,160,.35);font-variant-numeric:tabular-nums;}',
    '.hds-top b.short{color:#ffd54a;text-shadow:0 0 12px rgba(255,213,74,.3);}',
    '.hds-badge{font:400 .95rem/1 var(--display);letter-spacing:.04em;padding:6px 10px;border-radius:8px;border:2px solid currentColor;color:#ffd54a;transform:rotate(-3deg);}',
    '.hds-badge.no{color:#c8bfa8;}',
    '.hds-goal{position:relative;height:12px;border-radius:99px;background:#26222c;box-shadow:inset 0 1px 3px rgba(0,0,0,.6);}',
    '.hds-goal i{position:absolute;left:0;top:0;bottom:0;border-radius:99px;background:linear-gradient(180deg,#5fe39a,#23a35f);}',
    '.hds-goal.met i{background:linear-gradient(180deg,#ffe07a,#e3a51c);}',
    '.hds-board .ar-pic svg{border-radius:8px;}',
    '.hds-tk{display:flex;color:#2a2418;border-radius:8px;overflow:hidden;filter:drop-shadow(0 6px 10px rgba(0,0,0,.4));}',
    '.hds-tk .hds-stub{flex:none;width:34px;background:var(--tk,#c8322f);color:#fff;display:grid;place-items:center;border-right:2px dashed rgba(255,255,255,.65);}',
    '.hds-tk .hds-stub span{writing-mode:vertical-rl;transform:rotate(180deg);font:400 .9rem/1 var(--display);letter-spacing:.08em;white-space:nowrap;}',
    '.hds-tk .hds-bd{flex:1;min-width:0;padding:9px 11px;background:linear-gradient(180deg,#fffaf0,#f1e6cc);display:flex;flex-direction:column;gap:6px;}',
    '.hds-tk .hds-tt{font:400 1.12rem/1.1 var(--display);color:#1f1a10;}',
    '.hds-tk .hds-wx{display:flex;flex-wrap:wrap;align-items:center;gap:4px 10px;font-size:.76rem;font-weight:800;color:#6b6252;}',
    '.hds-tk .hds-wx span{display:inline-flex;align-items:center;gap:4px;}',
    '.hds-tk .hds-wx svg{width:18px;height:18px;}',
    '.hds-tk table{width:100%;border-collapse:collapse;font-size:.78rem;font-variant-numeric:tabular-nums;}',
    '.hds-tk th{font-size:.6rem;font-weight:900;letter-spacing:.1em;text-transform:uppercase;color:#8a7f68;text-align:right;padding:0 0 3px 6px;}',
    '.hds-tk th:first-child,.hds-tk td:first-child{text-align:left;padding-left:0;}',
    '.hds-tk td{text-align:right;padding:3px 0 3px 6px;border-top:1px dashed rgba(60,50,30,.22);font-weight:800;}',
    '.hds-tk td.hds-out{color:#b3262e;}',
    '.hds-tk .hds-tag{display:inline-block;margin-left:5px;padding:1px 4px;border-radius:3px;background:#b3262e;color:#fff;font-size:.56rem;font-weight:900;letter-spacing:.06em;vertical-align:1px;}',
    '.hds-tk .hds-walk{display:flex;flex-wrap:wrap;gap:4px 12px;font-size:.74rem;font-weight:800;color:#6b6252;}',
    '.hds-tk .hds-walk b{color:#2a2418;}',
    '.hds-tk .hds-sum{display:flex;justify-content:space-between;align-items:baseline;gap:8px;flex-wrap:wrap;padding-top:5px;border-top:2px solid rgba(60,50,30,.3);font-size:.78rem;font-weight:800;color:#6b6252;}',
    '.hds-tk .hds-sum b{font:400 1.2rem/1 var(--display);}',
    '.hds-tk .hds-up{color:#15803d;}.hds-tk .hds-down{color:#b3262e;}'
  ].join(''));
  var HD_TYPE = { football: ['Football', '#c8322f'], college: ['College', '#7c3aed'], highschool: ['Semifinal', '#0f766e'], soccer: ['Soccer', '#15803d'], concert: ['Concert', '#be185d'],
    trucks: ['Monster trucks', '#ea580c'], band: ['Band festival', '#1d4ed8'], bowl: ['Championship', '#b45309'] };
  var HD_MODE = { rookie: 'Rookie', pro: 'Pro', allstar: 'All-Star' };
  var HD_ITEMS = [['Hot dogs', 'd'], ['Soda', 's'], ['Chips', 'c'], ['Hot cocoa', 'k']];
  var HD_WX = { sunny: 'Sunny', cloudy: 'Cloudy', rain: 'Rain', snow: 'Snow' };
  function hdWx(c) {
    var cloud = '<path d="M7 17h10a4 4 0 0 0 .4-8A5.5 5.5 0 0 0 6.8 10.6 3.3 3.3 0 0 0 7 17Z" fill="#c9ced8" stroke="#6b7280" stroke-width="1.3"/>';
    var s = c === 'sunny' ? '<circle cx="12" cy="12" r="4.5" fill="#ffc83d"/><g stroke="#f59e0b" stroke-width="1.8" stroke-linecap="round"><path d="M12 2.5v2.5M12 19v2.5M2.5 12h2.5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/></g>'
      : c === 'rain' ? cloud + '<path d="M9 19l-1 3M13 19l-1 3M17 19l-1 3" stroke="#3b82f6" stroke-width="1.8" stroke-linecap="round"/>'
        : c === 'snow' ? cloud + '<circle cx="9" cy="20.5" r="1.2" fill="#93c5fd"/><circle cx="13" cy="21.5" r="1.2" fill="#93c5fd"/><circle cx="17" cy="20.5" r="1.2" fill="#93c5fd"/>' : cloud;
    return '<svg viewBox="0 0 24 24" aria-hidden="true">' + s + '</svg>';
  }
  function hdEvent(str) {
    var a = String(str).split('|'), num = function (i) { return a[i] === '' || a[i] == null ? null : +a[i]; }, dots = function (i) { return String(a[i] || '').split('.').map(Number); };
    return { t: a[0], ty: a[1], wx: a[2], temp: num(3), crowd: num(4), fans: num(5), served: num(6), net: +a[7] || 0, rev: +a[8] || 0, cash: num(9), spend: num(10),
      sold: dots(11), price: dots(12), walk: dots(13), outs: a[14] || '', peak: num(15), help: num(16), ad: num(17), spoil: num(18), score: a[19] || '', news: a[20] || '', day: num(21) };
  }
  R('hotdogstand', function (e, ui) {
    var d = e.dt; if (!d) return null;
    var el = ui.el, evs = d.ev ? d.ev.map(hdEvent) : (d.log || []).map(function (l) { return { t: l.t, net: +l.n || 0, rev: +l.r || 0, old: true }; });
    if (!evs.length) return null;
    var c0 = d.c0 || 50000, goal = d.g || (e.goal) || null, cash = c0;
    evs.forEach(function (x) { if (x.cash == null) x.cash = cash + x.net; cash = x.cash; });
    var end = d.c != null ? d.c : e.cash != null ? +e.cash : cash, met = goal && end >= goal, N = d.n || evs.length;
    var best = 0, worst = 0; evs.forEach(function (x, i) { if (x.net > evs[best].net) best = i; if (x.net < evs[worst].net) worst = i; });
    // the scoreboard: where the cash ended, the goal, every event's result as a dot on the way
    var dots = el('div', { style: { position: 'absolute', inset: '0', display: 'flex', 'justify-content': 'space-between', 'align-items': 'center', padding: '0 4px' } });
    for (var i = 0; i < N; i++) { var x = evs[i]; dots.appendChild(el('i', { style: { position: 'static', width: '6px', height: '6px', 'border-radius': '50%', background: x ? (x.net >= 0 ? '#3ddc84' : '#ff6b6b') : 'rgba(255,255,255,.22)', 'box-shadow': '0 0 0 1.5px #141218' } })); }
    var bar = el('div', { class: 'hds-goal' + (met ? ' met' : '') }, [el('i', { style: { width: (goal ? Math.max(2, Math.min(100, end / goal * 100)) : 100).toFixed(1) + '%' } }), dots]);
    var v = [c0].concat(evs.map(function (x) { return x.cash; }));
    var ch = chart({ v: v, c: '#7ef0b0', bg: '#0b0a0e', h: 140, fmt: function (c) { return money(c, true); }, goal: goal ? { v: goal, label: 'GOAL ' + money(goal, true), c: '#ffd54a' } : null, base: c0,
      marks: evs.map(function (x, i) { return { i: i + 1, k: i === best && x.net > 0 ? 'star' : 'dot', c: i === best && x.net > 0 ? '#ffd54a' : x.net >= 0 ? '#3ddc84' : '#ff6b6b' }; }),
      ticks: v.map(function (x, i) { return { i: i, t: i ? String(i) : 'Start' }; }).filter(function (t, i) { return v.length <= 13 || i % 2 === 0; }), aria: 'Cash after each event, with the season goal' });
    var board = el('div', { class: 'hds-board' }, [
      el('div', { class: 'hds-top' }, [el('div', null, [el('small', { text: (HD_MODE[d.m] || HD_MODE[e.mode] || e.mode || '') + ' season · ' + evs.length + (evs.length < N ? ' of ' + N : '') + ' events' }), el('b', { class: met ? '' : 'short', text: money(end, true) })]),
        goal ? el('div', { class: 'hds-badge' + (met ? '' : ' no'), text: met ? 'Goal reached' : 'Goal ' + money(goal, true) }) : null]),
      bar, el('div', { class: 'ar-pic', html: ch })]);
    var tot = { d: 0, fans: 0, served: 0, walk: 0, outs: 0 };
    evs.forEach(function (x) { if (x.sold) tot.d += x.sold[0] || 0; tot.served += x.served || 0; if (x.walk) tot.walk += (x.walk[0] || 0) + (x.walk[1] || 0) + (x.walk[2] || 0); tot.outs += (x.outs || '').length; });
    var out = [board, ui.stats([['Best day', evs[best].net > 0 ? '+' + money(evs[best].net, true) : null, evs[best].t], evs[worst].net < 0 ? ['Worst day', money(evs[worst].net, true), evs[worst].t] : null,
      tot.d ? ['Hot dogs sold', n(tot.d)] : null, tot.served ? ['Fans served', n(tot.served)] : null, tot.walk ? ['Walked away', n(tot.walk)] : null, d.ev ? ['Sold out', tot.outs ? tot.outs + (tot.outs === 1 ? ' time' : ' times') : 'Never'] : null,
      d.gear ? ['Gear', String(d.gear).split(',').length] : null])];
    // each event's ticket
    var card = el('div');
    function show(k) {
      var x = evs[k], T = HD_TYPE[x.ty] || ['Event', '#6b7280'], body = [el('div', { class: 'hds-tt', text: x.t || 'Event ' + (k + 1) })];
      if (!x.old) {
        var date = x.day ? new Date(x.day * 864e5).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }) : '';
        body.push(el('div', { class: 'hds-wx', html: (x.wx ? '<span>' + hdWx(x.wx) + ui.esc(HD_WX[x.wx] || x.wx) + (x.temp != null ? ' ' + x.temp + '°F' : '') + '</span>' : '') +
          (x.crowd ? '<span>' + n(x.crowd) + ' in the stadium</span>' : '') + (date ? '<span>' + date + '</span>' : '') + (x.score ? '<span>Final: Highlanders ' + ui.esc(x.score.replace('-', '–')) + '</span>' : '') }));
        var rows = '<tr><th>Item</th><th>Price</th><th>Sold</th><th>Took</th></tr>';
        HD_ITEMS.forEach(function (it, j) {
          var sold = x.sold[j] || 0, pr = x.price[j] || 0, out1 = x.outs.indexOf(it[1]) >= 0;
          if (!sold && !out1 && j === 3) return;
          rows += '<tr><td>' + it[0] + (out1 ? '<span class="hds-tag">SOLD OUT</span>' : '') + '</td><td>$' + (pr / 100).toFixed(pr % 100 ? 2 : 0) + '</td><td>' + n(sold) + '</td><td>' + money(sold * pr, true) + '</td></tr>';
        });
        body.push(el('table', { html: rows }));
        var w = x.walk || [0, 0, 0];
        body.push(el('div', { class: 'hds-walk', html: '<span>' + n(x.served || 0) + ' served' + (x.fans ? ' of ' + n(x.fans) + ' who came by' : '') + '</span>' +
          (w[0] || w[1] || w[2] ? '<span>Walked away: <b>' + w[0] + '</b> too pricey · <b>' + w[1] + '</b> line too long · <b>' + w[2] + '</b> sold out</span>' : '<span>Nobody walked away</span>') +
          (x.peak ? '<span>Longest line ' + x.peak + '</span>' : '') + (x.help ? '<span>' + x.help + (x.help === 1 ? ' helper' : ' helpers') + '</span>' : '') + (x.spoil ? '<span>' + x.spoil + ' went bad</span>' : '') }));
      }
      body.push(el('div', { class: 'hds-sum', html: '<span>' + (x.spend != null ? 'Spent ' + money(x.spend, true) + ' · ' : '') + 'took ' + money(x.rev, true) + '</span><b class="' + (x.net >= 0 ? 'hds-up' : 'hds-down') + '">' + (x.net >= 0 ? '+' : '') + money(x.net, true) + '</b><span>Cash ' + money(x.cash, true) + '</span>' }));
      card.innerHTML = '';
      card.appendChild(el('div', { class: 'hds-tk', style: { '--tk': T[1] } }, [el('div', { class: 'hds-stub' }, [el('span', { text: T[0] })]), el('div', { class: 'hds-bd' }, body)]));
    }
    var items = evs.map(function (x, i) { return { t: i + 1, c: i === best && x.net > 0 ? '#e3a51c' : x.net >= 0 ? '#23a35f' : '#c0392b', title: x.t + ': ' + (x.net >= 0 ? '+' : '') + money(x.net, true) }; });
    out.push(ui.section('Every event · tap one', [strip(ui, items, best, show), card], { icon: 'calendar' }));
    out.push(el('div', { class: 'ar-sub', style: { 'text-align': 'center', color: 'var(--text-3)' }, text: met ? 'Reached the ' + money(goal, true) + ' goal' + (evs[best].net > 0 ? ', best of all at ' + evs[best].t : '') : goal ? 'Finished ' + money(goal - end, true) + ' short of the goal' : '' }));
    return ui.wrap(out);
  });

  // ═══ Drug Wars (the TI-82 game) ═══
  // Drawn on the calculator's own LCD: the final screen, a graph of your worth over the month as the TI-82 would
  // plot it, every day's prices on a tap, then the best deals and Officer Hardass on scratch paper.
  HistView.css('hv-drugwars', [
    '.dwh-calc{border-radius:22px 22px 30px 30px;padding:10px 12px 14px;background:radial-gradient(140% 60% at 50% 0%,rgba(255,255,255,.08),transparent 60%),linear-gradient(180deg,#45484f,#33363c 30%,#2a2c31);',
    'box-shadow:0 14px 26px rgba(0,0,0,.5),inset 0 2px 0 rgba(255,255,255,.14),inset 0 -5px 9px rgba(0,0,0,.35);display:flex;flex-direction:column;gap:9px;}',
    '.dwh-top{display:flex;justify-content:space-between;align-items:baseline;padding:0 6px;color:#d9dbe0;}',
    '.dwh-top span{font:800 .56rem/1 "Helvetica Neue",Helvetica,Arial,sans-serif;letter-spacing:.16em;opacity:.85;}',
    '.dwh-top b{font:italic 900 1.05rem/1 "Helvetica Neue",Helvetica,Arial,sans-serif;}',
    '.dwh-bez{border-radius:10px 10px 12px 12px/10px 10px 26px 26px;padding:12px 14px 20px;background:linear-gradient(180deg,#202227,#17181c);box-shadow:inset 0 2px 5px rgba(0,0,0,.7),0 1px 0 rgba(255,255,255,.1);position:relative;}',
    '.dwh-bez::after{content:"GRAPHICS";position:absolute;left:0;right:0;bottom:6px;text-align:center;font:800 .44rem/1 "Helvetica Neue",Helvetica,Arial,sans-serif;letter-spacing:.32em;color:#7d8088;}',
    '.dwh-lcd{line-height:0;border-radius:3px;overflow:hidden;box-shadow:inset 0 0 0 2px #8f9a80;position:relative;}',
    '.dwh-lcd::after{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(160deg,rgba(255,255,255,.2),rgba(255,255,255,0) 38%),radial-gradient(130% 120% at 50% 50%,transparent 60%,rgba(40,50,30,.26));}',
    '.dwh-lcd svg{width:100%;height:auto;display:block;}',
    '.dwh-cap{font:800 .62rem/1.3 "Helvetica Neue",Helvetica,Arial,sans-serif;letter-spacing:.1em;text-transform:uppercase;color:#9fd3a7;text-align:center;}',
    '.dwh-road .ar-rb{border-radius:6px 6px 8px 8px;font:800 .66rem/1 "Helvetica Neue",Helvetica,Arial,sans-serif;color:#d9e6c6;box-shadow:0 2px 0 rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.4);}',
    '.dwh-road .ar-rb.ink{color:#1f281a;}',
    '.dwh-paper{border-radius:4px;padding:10px 14px 12px 34px;font-family:var(--hand);font-size:1.05rem;line-height:1.5;color:#2a2a4a;position:relative;transform:rotate(-.6deg);}',
    '.dwh-paper::before{content:"";position:absolute;top:0;bottom:0;left:24px;width:2px;background:rgba(220,60,70,.45);}',
    '.dwh-paper h5{margin:0 0 2px;font:400 1.2rem/1.3 var(--hand);color:#1d2a6b;}',
    '.dwh-paper p{margin:0;}.dwh-paper .owe{color:#b3262e;}.dwh-paper .ok{color:#1f7a3a;}'
  ].join(''));
  var TI_FONT = {
    ' ': '00000000000000', A: '0e11111f111111', B: '1e11111e11111e', C: '0e11101010110e', D: '1c12111111121c', E: '1f10101e10101f', F: '1f10101e101010', G: '0e11101711110f', H: '1111111f111111',
    I: '0e04040404040e', J: '0702020202120c', K: '11121418141211', L: '1010101010101f', M: '111b1515111111', N: '11111915131111', O: '0e11111111110e', P: '1e11111e101010', Q: '0e11111115120d',
    R: '1e11111e141211', S: '0f10100e01011e', T: '1f040404040404', U: '1111111111110e', V: '11111111110a04', W: '1111111515150a', X: '11110a040a1111', Y: '1111110a040404', Z: '1f01020408101f',
    0: '0e11131519110e', 1: '040c040404040e', 2: '0e11010204081f', 3: '1f02040201110e', 4: '02060a121f0202', 5: '1f101e0101110e', 6: '0608101e11110e', 7: '1f010204080808', 8: '0e11110e11110e', 9: '0e11110f01020c',
    '!': '04040404040004', '?': '0e110102040004', '.': '00000000000c0c', ',': '000000000c0408', "'": '0c040800000000', ':': '000c0c000c0c00', '(': '02040808080402', ')': '08040202020408', '=': '00001f001f0000',
    '-': '0000001f000000', '+': '0004041f040400', '/': '00010204081000', '$': '040f140e051e04', '>': '08040201020408', '~': '00000e00000000', '_': '0000000000001f'
  };
  var DW_PLACE = ['BRONX', 'GHETTO', 'CENTRAL PARK', 'MANHATTEN', 'CONEY ISLAND', 'BROOKLYN'], DW_PLACE_NM = ['the Bronx', 'the Ghetto', 'Central Park', 'Manhattan', 'Coney Island', 'Brooklyn'];
  var DW_DRUG = ['COCAINE', 'HEROINE', 'ACID', 'WEED', 'SPEED', 'LUDES'], DW_DRUG_NM = ['cocaine', 'heroin', 'acid', 'weed', 'speed', 'ludes'], DW_MID = [22000, 8500, 2700, 525, 145, 30];
  var dwN = 0;
  // the LCD: 96 × 64 pixels; lines = up to 8 strings of 16 characters ({s, inv} inverts a line), px = extra lit pixels [[x, y], ...]
  function tiLcd(lines, px) {
    var id = 'dwg' + (++dwN), on = '', sh = '';
    function dot(x, y) { on += 'M' + x + ' ' + y + 'h.86v.86h-.86z'; sh += 'M' + (x + .16) + ' ' + (y + .16) + 'h.86v.86h-.86z'; }
    (lines || []).forEach(function (ln, r) {
      if (ln == null) return; var inv = typeof ln === 'object' && ln.inv, str = String(typeof ln === 'object' ? ln.s : ln).toUpperCase().slice(0, 16);
      if (inv) while (str.length < 16) str += ' ';
      for (var c = 0; c < str.length; c++) {
        var h = TI_FONT[str.charAt(c)] || TI_FONT['?'];
        for (var y = 0; y < 8; y++) for (var x = 0; x < 6; x++) {
          var lit = y < 7 && x < 5 ? (parseInt(h.substr(y * 2, 2), 16) >> (4 - x)) & 1 : 0;
          if (inv) lit = 1 - lit;
          if (lit) dot(c * 6 + x, r * 8 + y);
        }
      }
    });
    (px || []).forEach(function (p) { dot(p[0], p[1]); });
    return '<svg viewBox="0 0 96 64" shape-rendering="crispEdges" role="img" aria-label="The calculator screen"><defs><pattern id="' + id + '" width="1" height="1" patternUnits="userSpaceOnUse"><rect x=".07" y=".07" width=".86" height=".86" fill="rgba(70,90,50,.08)"/></pattern></defs>' +
      '<rect width="96" height="64" fill="#b0bd9e"/><rect width="96" height="64" fill="url(#' + id + ')"/><path d="' + sh + '" fill="rgba(40,55,30,.12)"/><path d="' + on + '" fill="rgba(31,40,26,.94)"/></svg>';
  }
  function dwM(v) { var a = Math.abs(v); return a >= 1e6 ? (v < 0 ? '−' : '') + '$' + (a / 1e6).toFixed(2) + 'M' : a >= 1e5 ? (v < 0 ? '−' : '') + '$' + Math.round(a / 1000) + 'K' : money(v); }
  function tiRow(label, v) { var s = String(v); label = String(label); while (label.length + s.length < 16) label += ' '; return (label + s).slice(0, 16); }
  function tiNum(v) { v = Math.round(v); return (v < 0 ? '~' : '') + Math.abs(v); }
  function dwDay(str) { var a = String(str).split('|'), b = function (x) { return parseInt(x, 36) || 0; }; return { d: +a[0], l: +a[1] || 0, z: b(a[2]), v: b(a[3]), y: b(a[4]), u: +a[5] || 0, ev: a[6] || '', p: String(a[7] || '').split('.').map(b) }; }
  // a line of lit pixels, as the TI-82's Line( draws it
  function tiLine(px, x0, y0, x1, y1, dotted) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    var dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, err = dx + dy, k = 0;
    for (;;) { if (!dotted || (k++ % 2 === 0)) px.push([x0, y0]); if (x0 === x1 && y0 === y1) break; var e2 = 2 * err; if (e2 >= dy) { err += dy; x0 += sx; } if (e2 <= dx) { err += dx; y0 += sy; } }
  }
  R('drugwars', function (e, ui) {
    var d = e.dt || {}, el = ui.el;
    var net = d.net != null ? d.net : e.net, cash = d.z != null ? d.z : e.cash, bank = d.b != null ? d.b : e.bank, debt = d.y != null ? d.y : e.debt, day = d.day || e.day, sc = d.sc != null ? d.sc : (e.score != null ? e.score : null);
    if (net == null) return null;
    var end = d.end || e.end || '', endLcd = /train/.test(end) ? 'HIT BY A TRAIN' : /Shot/.test(end) ? "YOU'VE BEEN KILLED" : /day 30/.test(end) ? 'MADE IT: DAY 30' : '';
    var final = tiLcd([{ s: '   GAME OVER!', inv: false }, tiRow('DAY ' + Math.min(30, day || 0), ''), tiRow('CASH', tiNum(cash || 0)), tiRow('BANK', tiNum(bank || 0)), tiRow('DEBT', tiNum(debt || 0)), tiRow('WORTH', tiNum(net)),
      tiRow('SCORE=', sc != null ? sc : ''), endLcd.slice(0, 16)]);
    var days = (d.days || []).map(dwDay);
    var calcKids = [el('div', { class: 'dwh-top' }, [el('span', { text: 'TEXAS INSTRUMENTS' }), el('b', { text: 'TI-82' })]), el('div', { class: 'dwh-bez' }, [el('div', { class: 'dwh-lcd', html: final })])];
    // the month as a graph: worth (solid) and the loan shark's debt (dotted), day 1 to 30
    if (days.length >= 2) {
      // on the score's own square-root scale, so the early days still show next to a rich finish
      var sq = function (v) { return v < 0 ? -Math.sqrt(-v) : Math.sqrt(v); };
      var w = days.map(function (x) { return sq(x.z + x.v - x.y); }), owed = days.map(function (x) { return sq(x.y); }), all = w.concat(owed, [0]);
      var mx = Math.max.apply(null, all), mn = Math.min.apply(null, all), px = [], gx = function (dd) { return 2 + (dd - 1) / 29 * 92; }, gy = function (val) { return 61 - (val - mn) / ((mx - mn) || 1) * 57; };
      var y0 = Math.round(gy(0)); for (var x = 0; x < 96; x++) px.push([x, y0]);
      for (var t = 5; t <= 30; t += 5) { px.push([Math.round(gx(t)), y0 - 1]); px.push([Math.round(gx(t)), y0 + 1]); }
      for (var yy = 0; yy < 64; yy++) px.push([1, yy]);
      for (var i = 1; i < days.length; i++) { tiLine(px, gx(days[i - 1].d), gy(w[i - 1]), gx(days[i].d), gy(w[i])); tiLine(px, gx(days[i - 1].d), gy(owed[i - 1]), gx(days[i].d), gy(owed[i]), true); }
      var hi = w.indexOf(Math.max.apply(null, w)), hx = Math.round(gx(days[hi].d)), hy = Math.round(gy(w[hi]));
      [[0, -2], [0, 2], [-2, 0], [2, 0], [-1, -1], [1, 1], [-1, 1], [1, -1]].forEach(function (o) { px.push([hx + o[0], hy + o[1]]); });   // TRACE's cursor on the best day
      calcKids.push(el('div', { class: 'dwh-bez' }, [el('div', { class: 'dwh-lcd', html: tiLcd([], px) })]));
      calcKids.push(el('div', { class: 'dwh-cap', text: 'Worth, day 1 to ' + days[days.length - 1].d + ' (square-root scale, like the score) · dotted: what you owed · + best day ' + days[hi].d }));
    }
    var out = [el('div', { class: 'dwh-calc' }, calcKids)];
    out.push(ui.stats([['Score', sc != null ? sc + ' of 100' : null], ['Worth', dwM(net)], d.best && d.best > net ? ['Best worth', dwM(d.best)] : null, debt > 0 ? ['Still owed', dwM(debt)] : ['Loan shark', 'Paid off'],
      d.bo ? ['Bought', dwM(d.bo)] : null, d.so ? ['Sold', dwM(d.so)] : null, d.ch ? ['Cops', d.ch + (d.ch === 1 ? ' chase' : ' chases'), (d.kl ? d.kl + ' shot' : '') + (d.kl && d.es ? ' · ' : '') + (d.es ? d.es + ' lost' : '')] : null,
      d.mg ? ['Mugged', d.mg + '×'] : null, d.i ? ['Guns', d.i] : null, d.t && d.t !== 100 ? ['Trench coat', d.t] : null]));
    // every day on a tap: that day's prices on the LCD
    if (days.length) {
      var hold = el('div', { class: 'ar-card' });
      var showD = function (k) {
        var x = days[k], prev = days[k - 1], lines = [{ s: tiRow(('DAY ' + x.d + ' ' + DW_PLACE[x.l]).length <= 16 ? 'DAY ' + x.d : 'D' + x.d, DW_PLACE[x.l]), inv: true }];
        DW_DRUG.forEach(function (nm, j) { lines.push(tiRow(nm, x.p[j] || 0)); });
        lines.push(tiRow('WALLET', x.z));
        var hot = DW_DRUG_NM.filter(function (nm, j) { return x.p[j] > DW_MID[j] * 1.6; }), cheap = DW_DRUG_NM.filter(function (nm, j) { return x.p[j] && x.p[j] < DW_MID[j] * .55; });
        var worth = x.z + x.v - x.y, dw = prev ? worth - (prev.z + prev.v - prev.y) : null;
        hold.innerHTML = '';
        hold.appendChild(el('div', { class: 'dwh-calc', style: { padding: '10px' } }, [el('div', { class: 'dwh-bez' }, [el('div', { class: 'dwh-lcd', html: tiLcd(lines) })])]));
        hold.appendChild(el('div', { class: 'dwh-paper paper', html: '<h5>Day ' + x.d + ', ' + DW_PLACE_NM[x.l] + (x.ev ? ': <span class="owe">' + ui.esc(x.ev) + '</span>' : '') + '</h5>' +
          '<p>Cash ' + money(x.z) + ' · bank ' + money(x.v) + ' · <span class="owe">owe ' + money(x.y) + '</span></p>' +
          '<p>Worth ' + money(worth) + (dw != null ? ' <span class="' + (dw >= 0 ? 'ok' : 'owe') + '">(' + (dw >= 0 ? '+' : '−') + money(Math.abs(dw)).slice(1).replace(/^/, '$') + ' on the day)</span>' : '') + (x.u ? ' · carrying ' + x.u : '') + '</p>' +
          (hot.length ? '<p class="owe">Sky high: ' + hot.join(', ') + '</p>' : '') + (cheap.length ? '<p class="ok">Dirt cheap: ' + cheap.join(', ') + '</p>' : '') }));
      };
      var bestD = 0; days.forEach(function (x, i) { if (x.z + x.v - x.y > days[bestD].z + days[bestD].v - days[bestD].y) bestD = i; });
      var items = days.map(function (x, i) {
        var cop = /cops/.test(x.ev), news = !!x.ev;
        return { t: x.d, c: cop ? '#c0392b' : i === bestD ? '#ffd447' : news ? '#1f281a' : '#b0bd9e', ink: !cop && !(news && i !== bestD), title: 'Day ' + x.d + (x.ev ? ': ' + x.ev : '') };
      });
      var road = strip(ui, items, days.length - 1, showD, { cls: 'dwh-road' });
      out.push(ui.section('Every day · tap one', [road, el('div', { class: 'cz-key ar-sub', style: { color: 'var(--text-3)', 'text-transform': 'none', 'letter-spacing': '0', 'font-weight': '700' }, text: 'Dark: news on the street · red: the cops · gold: your best day' }), hold], { icon: 'calendar' }));
    }
    var deals = (d.deals || []).filter(function (x) { return x.w > 0; });
    if (deals.length) out.push(ui.section('Best deals', el('div', { class: 'dwh-paper paper', html: deals.map(function (x) {
      return '<p>Day ' + x.d + ', ' + DW_PLACE_NM[x.l] + ': sold ' + x.n + ' ' + DW_DRUG_NM[x.k] + ' at ' + money(x.p) + (x.a ? ' (paid ' + money(x.a) + ')' : ' (found it)') + ' <span class="ok">+' + money(x.w).slice(1).replace(/^/, '$') + '</span></p>';
    }).join('') }), { icon: 'coins' }));
    var enc = (d.enc || []).map(function (s) { var a = String(s).split('|'); return { d: +a[0], l: +a[1], n: +a[2], k: +a[3], h: +a[4], r: a[5], c: +a[6], u: +a[7] }; });
    if (enc.length) out.push(ui.section('Officer Hardass', el('div', { class: 'dwh-paper paper', html: enc.map(function (x) {
      var how = x.r === 'won' ? '<span class="ok">took them all down and found ' + money(x.c) + '</span>' : x.r === 'ran' ? '<span class="ok">lost them in an alley</span>' : x.r === 'dead' ? '<span class="owe">shot dead</span>' : 'still running';
      return '<p>Day ' + x.d + ', ' + DW_PLACE_NM[x.l] + ': Hardass and ' + Math.max(0, x.n - 1) + (x.n - 1 === 1 ? ' deputy' : ' deputies') + (x.u ? ' (you carried ' + x.u + ')' : '') + '. ' +
        (x.k ? 'Shot ' + x.k + '. ' : '') + (x.h ? 'Hit ' + x.h + (x.h === 1 ? ' time' : ' times') + '. ' : '') + how + '.</p>';
    }).join('') }), { icon: 'shield' }));
    out.push(el('div', { class: 'ar-sub', style: { 'text-align': 'center', color: 'var(--text-3)' }, text: (end || 'Game over') + ' · worth ' + money(net) }));
    return ui.wrap(out);
  });

  // one stat tile (the arcade screen's)
  function stat(ui, label, value, sub, dot) {
    if (value == null || value === '') return null;
    return ui.el('div', { class: 'ar-s' }, [ui.el('b', null, [dot ? ui.el('span', { class: 'ar-dot', style: { background: dot } }) : null, ui.el('span', { text: String(value) })]), ui.el('small', { text: label }), sub ? ui.el('i', { text: sub }) : null]);
  }
})();
