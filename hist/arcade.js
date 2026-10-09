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
  R('peggle', function (e, ui) {
    var d = e.dt; if (!d || d.n == null) return null;
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
})();
