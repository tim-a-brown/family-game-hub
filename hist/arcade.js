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
    '.ar-key{display:flex;flex-wrap:wrap;gap:4px 12px;justify-content:center;font-size:.64rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:rgba(233,236,255,.6);}',
    '.ar-key span{display:inline-flex;align-items:center;gap:5px;}',
    '.ar-key span i{width:10px;height:10px;border-radius:2px;display:inline-block;}'
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
  function key(ui, list) { return ui.el('div', { class: 'ar-key' }, list.map(function (x) { return ui.el('span', null, [ui.el('i', { style: { background: x[1] } }), ui.el('span', { text: x[0] })]); })); }
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
    return screen(ui, {
      ac: '#b45ef0', title: 'Game over' + (d.cls ? ' · Classic' : ''), score: n(myScore(e)), rank: rankText(d),
      pic: svg(C * cs + 4, H + 4, s, { crisp: true, aria: 'The final stack' }), side: true, picMax: 150,
      stats: [['Level', d.lv, d.sl > 1 ? 'started at ' + d.sl : ''], ['Lines', n(d.ln)], ['Tetrises', cl[3] || 0, cl[0] || cl[1] || cl[2] ? 'singles ' + cl[0] + ' · doubles ' + cl[1] + ' · triples ' + cl[2] : ''],
        ['Blocks', n(d.pcs)], d.ts ? ['T-spins', d.ts] : null, d.cb >= 2 ? ['Best combo', d.cb + ' in a row'] : null, d.b2b ? ['Back-to-back', d.b2b] : null,
        d.pc ? ['Perfect clears', d.pc] : null, d.bm >= 300 ? ['Best move', n(d.bm), d.bmn] : null, d.t ? ['Time', mmss(d.t)] : null],
      foot: over ? 'Stacked past the top' : 'Topped out'
    });
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
    return screen(ui, {
      ac: '#7dff9a', title: d.why === 'full' ? 'Board filled!' : 'Game over', score: n(myScore(e)), rank: rankText(d),
      pic: svg(C * cs, Rn * cs, s, { aria: 'The snake when the game ended' }), side: true, picMax: 160,
      stats: [['Length', d.ml], ['Apples', n(d.ap), d.gl ? d.gl + ' golden' : ''], ['Speed', SP[d.sp] || d.sp], ['Edges', d.w ? 'Wrap around' : 'Solid walls', d.w && d.wr ? 'wrapped ' + d.wr + '×' : ''],
        d.t ? ['Time', mmss(d.t)] : null, d.st ? ['Moves', n(d.st)] : null],
      foot: d.why === 'full' ? 'Filled the whole board' : d.why === 'wall' ? 'Crashed into the wall' : 'Ran into its own tail', footOk: d.why === 'full'
    });
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
    return screen(ui, {
      ac: '#ffd84a', title: 'Game over · level ' + d.lv, score: n(myScore(e)), rank: rankText(d),
      pic: svg(224, 248, s, { aria: 'The maze when the last life was lost' }), picMax: 300,
      stats: [['Level', d.lv], ['Dots eaten', (d.ea || 0) + '/244', left ? left + ' left' : ''], ['Ghosts eaten', d.ge || 0, d.mc > 1 ? 'best streak ' + d.mc : ''],
        d.q4 ? ['All four', d.q4 + '×'] : null, ['Fruit', d.fr || 0, d.bf ? 'best: ' + d.bf.toLowerCase() : ''], d.pp ? ['Power pellets', d.pp] : null, d.el ? ['Extra life', 'Level ' + d.el] : null],
      extra: lost ? [ui.el('div', { class: 'ar-sub', text: 'Lives lost to', style: { 'text-align': 'center' } }), lost] : null,
      foot: last ? 'Caught by ' + last.b : ''
    });
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
    return screen(ui, {
      ac: '#ff5c7a', title: d.won ? 'All ' + (d.of || 12) + ' levels cleared!' : 'Game over · ' + d.nm, score: n(myScore(e)), rank: rankText(d),
      pic: svg(W, Hh, s, { aria: 'The wall as it was left' }), picMax: 320,
      stats: [['Level', d.lv + (d.of ? '/' + d.of : ''), d.nm], ['Bricks smashed', n(d.br)], d.won ? null : ['Bricks left', left], ['Levels cleared', d.cl || 0],
        d.mc ? ['Best chain', d.mc] : null, ['Power-ups', d.pw || 0], d.mb > 1 ? ['Most balls', d.mb] : null, d.ph ? ['Paddle hits', n(d.ph)] : null],
      extra: [chips],
      foot: d.won ? 'Beat every level' : 'Lost the last ball on level ' + d.lv, footOk: !!d.won
    });
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
    return screen(ui, {
      ac: '#9ff3ff', title: 'Game over · wave ' + d.wv, score: n(myScore(e)), rank: rankText(d),
      pic: svg(W, H, s, { aria: 'The field when the last ship was lost' }), side: true, picMax: 150,
      stats: [['Wave', d.wv], ['Rocks', n(tot), rb[2] + ' big · ' + rb[1] + ' med · ' + rb[0] + ' small'], ['Accuracy', acc, d.sx ? n(d.sx) + ' shots' : ''],
        d.ub || d.us ? ['Saucers', (d.ub || 0) + (d.us || 0), d.us ? d.us + ' small (1,000 each)' : ''] : null,
        d.hy ? ['Hyperspace', d.hy + '×', d.hd ? 'landed on a rock ' + d.hd + '×' : ''] : null, d.ex ? ['Extra ships', d.ex] : null,
        dd.length ? ['Ships lost', dd.length] : null],
      foot: last ? 'Last ship lost to ' + last.b : ''
    });
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
    return screen(ui, {
      ac: '#ff8a1f', title: 'Game over · level ' + d.lv + '-' + d.rd, score: n(myScore(e)), rank: rankText(d),
      pic: svg(340, 300, s, { aria: 'The pyramid when the game ended' }), picMax: 300,
      stats: [['Level', d.lv + '-' + d.rd, RULE[d.rl] || ''], ['Cubes left', left + '/28'], ['Cubes changed', n(d.cu)], ['Hops', n(d.hp)], ['Rounds cleared', d.rr || 0, d.pf ? d.pf + ' without a slip' : ''],
        d.lu ? ['Coily lured', d.lu] : null, d.ca ? ['Slick & Sam', d.ca + ' caught'] : null, d.gr ? ['Green ball', d.gr + '× freeze'] : null, d.dc ? ['Disc rides', d.dc] : null, d.ex ? ['Extra lives', d.ex] : null],
      extra: lost ? [ui.el('div', { class: 'ar-sub', text: 'Lives lost to', style: { 'text-align': 'center' } }), lost] : null,
      foot: d.ld && d.ld.k ? 'Last life lost to ' + (QDEATH[d.ld.k] || d.ld.k) : ''
    });
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
    return screen(ui, {
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
    });
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
    return screen(ui, {
      ac: '#3fa9ff', title: d.won ? 'Mega Spider beaten · wave ' + w : 'Game over · wave ' + w, score: n(myScore(e)), rank: rankText(d),
      pic: svg(W, H, s, { aria: 'The ten waves: lit ones cleared, diamonds are boss waves, red is where it ended' }), picMax: 360,
      stats: [online ? ['Team score', n(d.ts)] : null, ['Bosses', d.b || 0, d.b && d.b < 4 ? ['Killer Wasp', 'Night Flyer', 'Blast Beetle'].slice(0, d.b).join(', ') : d.b >= 4 ? 'all four' + (d.b > 4 ? ', some twice' : '') : ''],
        d.sg ? ['Segments', n(d.sg), (d.hd || 0) + ' heads'] : null, d.sp ? ['Spiders', d.sp] : null, d.bg ? ['Other bugs', n(d.bg)] : null,
        d.pw ? ['Power-ups', d.pw] : null, d.cb >= 5 ? ['Best combo', 'x' + d.cb] : null, d.df === 'relaxed' ? ['Mode', 'Relaxed'] : null],
      foot: d.won ? 'Beat the Mega Spider' : by ? 'Last life lost to: ' + by.charAt(0).toLowerCase() + by.slice(1) : '', footOk: !!d.won
    });
  });
})();
