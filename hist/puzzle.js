'use strict';
// History views: puzzle
(function () {
  if (!window.HistView) return;
  var R = HistView.register;

  // ── shared bits ──
  function f2(n) { return Math.round(n * 100) / 100; }
  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many || one + 's'); }
  function sec(t) { t = Math.round(Number(t) || 0); var h = Math.floor(t / 3600), m = Math.floor(t / 60) % 60, s = ('0' + t % 60).slice(-2); return h ? h + ':' + ('0' + m).slice(-2) + ':' + s : m + ':' + s; }
  // A step-through slider: draw(n) paints frame n (0..max) into box and returns the caption
  function replay(ui, box, max, start, draw) {
    var label = ui.el('b'), rng = ui.el('input', { type: 'range', min: '0', max: String(max), value: String(start), class: 'hv-range', 'aria-label': 'Step' });
    function show(n) { box.innerHTML = ''; var cap = draw(n); label.textContent = cap || ''; }
    rng.addEventListener('input', function () { show(+rng.value); });
    show(start);
    return ui.el('div', { class: 'hv-replay' }, [rng, label]);
  }
  HistView.css('hv-puzzle', [
    '.hv-replay{display:flex;flex-direction:column;gap:6px;}.hv-range{width:100%;accent-color:var(--yellow);}.hv-replay b{font-size:.85rem;color:var(--text-2);}',
    '.hv-pz-note{margin:0;font-size:.8rem;color:var(--text-3);font-weight:700;text-align:center;}',
    // 2048 climb
    '.hv-climb{display:flex;flex-wrap:wrap;gap:8px 6px;}',
    '.hv-climb span{display:flex;flex-direction:column;align-items:center;gap:3px;font-size:.7rem;font-weight:800;color:var(--text-3);}',
    '.hv-climb i{display:grid;place-items:center;width:42px;height:42px;border-radius:8px;font-style:normal;font-weight:900;font-size:.9rem;box-shadow:0 3px 0 var(--e),0 4px 8px rgba(0,0,0,.4);background:linear-gradient(180deg,var(--a),var(--b));color:var(--k);}',
    // memory match cards
    '.hv-mm{display:grid;gap:5px;padding:10px;border-radius:14px;align-self:center;width:100%;max-width:360px;box-sizing:border-box;}',
    '.hv-mm .c{position:relative;aspect-ratio:3/4;border-radius:7px;background:linear-gradient(170deg,#fffdf6,#efe6d2);box-shadow:0 2px 0 #b9a98a,0 3px 6px rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;text-align:center;padding:3px;overflow:hidden;}',
    '.hv-mm .c span{font-size:.62rem;line-height:1.1;font-weight:900;color:#3a2a4a;overflow-wrap:anywhere;}',
    '.hv-mm .c i{position:absolute;left:0;right:0;bottom:0;height:5px;background:var(--pc);}',
    '.hv-mm .c em{position:absolute;top:2px;right:3px;font-style:normal;font-size:.55rem;font-weight:900;color:#8a7a68;}',
    '.hv-mm .c.left{background:linear-gradient(160deg,#7b2cbf,#d946ef);box-shadow:0 2px 0 #3c1460,0 3px 6px rgba(0,0,0,.45);}',
    // math chalkboard
    '.hv-slate{border-radius:12px;padding:12px 14px;background:radial-gradient(130% 100% at 30% 0%,#2f4a3c,#1d3128);box-shadow:inset 0 0 0 5px #7a5230,inset 0 0 0 7px #4d3018,0 6px 16px -6px rgba(0,0,0,.6);}',
    '.hv-slate ol{list-style:none;margin:0;padding:4px 2px;display:flex;flex-direction:column;gap:7px;counter-reset:q;}',
    '.hv-slate li{display:grid;grid-template-columns:20px 1fr auto;gap:8px;align-items:baseline;color:#eef2ea;font-family:"Bradley Hand","Segoe Print","Comic Sans MS",cursive;font-size:1rem;line-height:1.25;}',
    '.hv-slate li::before{counter-increment:q;content:counter(q);font-family:var(--font,system-ui);font-size:.7rem;font-weight:900;color:rgba(238,242,234,.45);text-align:right;}',
    '.hv-slate .q{min-width:0;overflow-wrap:anywhere;}.hv-slate .a{font-weight:700;color:#fff6b0;white-space:nowrap;}',
    '.hv-slate .w{color:#ff9b9b;text-decoration:line-through;margin-right:6px;font-size:.88em;}',
    '.hv-slate .m{display:inline-grid;place-items:center;width:20px;height:20px;border-radius:50%;}.hv-slate .m .ico{width:15px;height:15px;}',
    '.hv-slate .ok{color:#7ee2a0;}.hv-slate .half{color:#ffd46b;}.hv-slate .no{color:#ff8a8a;}.hv-slate .skip{color:rgba(238,242,234,.5);}',
    '.hv-slate small{font-family:var(--font,system-ui);font-size:.68rem;font-weight:800;color:rgba(238,242,234,.55);margin-left:6px;}'
  ].join(''));

  // ── 2048: the final tray, when each big tile first showed up, and which way you swiped ──
  var T48 = { 2: ['#f7f1e3', '#e9dcc0', '#bfae8a', '#6b5a43'], 4: ['#f5e8c6', '#e8d4a2', '#bea36a', '#6b5a43'], 8: ['#f8c28c', '#ee9d58', '#b4672a', '#fff'],
    16: ['#f8a56c', '#ea7b3a', '#a9511b', '#fff'], 32: ['#f78f70', '#e5603f', '#a03b22', '#fff'], 64: ['#f36d4f', '#d43e22', '#8f2410', '#fff'],
    128: ['#f7e19a', '#ead06a', '#b09232', '#6a4700'], 256: ['#f6da80', '#e7c64c', '#a98824', '#634100'], 512: ['#f5d264', '#e2b931', '#9f7c15', '#5c3b00'],
    1024: ['#f4c84a', '#dca81a', '#94700a', '#553500'], 2048: ['#ffe066', '#f2a900', '#a86a00', '#fff'], 8192: ['#2f6b5c', '#173f35', '#0a221c', '#ffd34d'], 16384: ['#6b2f4a', '#3f1729', '#220a15', '#ffd34d'] };
  function t48(v) { return T48[v] || (v > 2048 ? ['#4a4670', '#24223d', '#100f1f', '#ffd34d'] : T48[2]); }
  R('2048', function (e, ui) {
    var cells = e.cells, d = e.dt || {};
    if (!Array.isArray(cells) || cells.length !== 16) return null;
    var cs = 64, g = 8, W = 4 * cs + 5 * g, s = '<svg viewBox="0 0 ' + W + ' ' + W + '" role="img" aria-label="Final board"><defs><linearGradient id="w48" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a2414"/><stop offset="1" stop-color="#2a180b"/></linearGradient></defs>';
    s += '<rect width="' + W + '" height="' + W + '" rx="14" fill="url(#w48)"/>';
    var top = Math.max.apply(null, cells);
    cells.forEach(function (v, i) {
      var x = g + (i % 4) * (cs + g), y = g + Math.floor(i / 4) * (cs + g);
      if (!v) { s += '<rect x="' + x + '" y="' + y + '" width="' + cs + '" height="' + cs + '" rx="8" fill="rgba(0,0,0,.28)"/>'; return; }
      var c = t48(v), dg = String(v).length, fs = dg < 3 ? 30 : dg === 3 ? 24 : dg === 4 ? 19 : 15;
      if (v === top && v >= 2048) s += '<rect x="' + (x - 3) + '" y="' + (y - 5) + '" width="' + (cs + 6) + '" height="' + (cs + 8) + '" rx="11" fill="rgba(255,200,40,.35)"/>';
      s += '<rect x="' + x + '" y="' + (y + 1) + '" width="' + cs + '" height="' + cs + '" rx="8" fill="' + c[2] + '"/>';
      s += '<rect x="' + x + '" y="' + (y - 3) + '" width="' + cs + '" height="' + cs + '" rx="8" fill="' + c[1] + '"/>';
      s += '<rect x="' + (x + 3) + '" y="' + (y - 1) + '" width="' + (cs - 6) + '" height="' + (cs * 0.42) + '" rx="6" fill="' + c[0] + '" opacity=".75"/>';
      s += '<text x="' + (x + cs / 2) + '" y="' + (y + cs / 2 - 2) + '" text-anchor="middle" dominant-baseline="central" font-family="var(--display),ui-rounded,system-ui" font-weight="900" font-size="' + fs + '" fill="' + c[3] + '">' + v + '</text>';
    });
    s += '</svg>';
    var out = [ui.section('Final board', ui.picture(s, { frame: 'wood', max: 300 }))];
    out.push(ui.stats([['Score', ui.num(e.score)], ['Biggest tile', e.maxTile], ['Moves', ui.num(e.moves)], ['Undos', e.undos || 0], d.merge ? ['Biggest join', d.merge] : null]));
    // the climb: first time each tile from 32 up appeared
    var fk = Object.keys(d.first || {}).map(Number).filter(function (v) { return v >= 32; }).sort(function (a, b) { return a - b; });
    if (fk.length) {
      var climb = ui.el('div', { class: 'hv-climb' });
      fk.forEach(function (v) {
        var c = t48(v);
        climb.appendChild(ui.el('span', null, [ui.el('i', { text: String(v), style: { '--a': c[0], '--b': c[1], '--e': c[2], '--k': c[3], 'font-size': String(v).length > 3 ? '.72rem' : '.9rem' } }), ui.el('span', { text: 'move ' + d.first[v] })]));
      });
      out.push(ui.section('The climb', climb));
    }
    var dirs = d.dirs || {}, tot = (dirs.l || 0) + (dirs.r || 0) + (dirs.u || 0) + (dirs.d || 0);
    if (tot) {
      out.push(ui.section('Swipes', ui.bars([['l', 'Left'], ['r', 'Right'], ['u', 'Up'], ['d', 'Down']].map(function (x, i) {
        var n = dirs[x[0]] || 0; return { label: x[1], value: n, max: tot, color: ['#ea7b3a', '#e2b931', '#d43e22', '#bea36a'][i], text: Math.round(100 * n / tot) + '%' };
      }))));
    }
    return ui.wrap(out);
  });

  // ── Marble Solitaire: the wooden board with the marbles where they ended, and a jump-by-jump replay ──
  var MS_PAL = ['#e0393e', '#2f7fd8', '#26a65b', '#f2b233', '#8e5bd6', '#19b3ad', '#f07c2c', '#e2558f', '#3b4bd0'];
  var MS_BOARDS = { english: ['english', 1], european: ['european', 0], triangle: ['triangle', 0], cross: ['english', 1], plus: ['english', 1], pyramid: ['english', 1], arrow: ['english', 1] };
  var MS_NAMES = { english: 'English', european: 'European', triangle: 'Triangle', cross: 'Cross', plus: 'Plus', pyramid: 'Pyramid', arrow: 'Arrow' };
  function msGeo(shape) {
    var holes = [], at = {}, r, c;
    if (shape === 'triangle') { for (r = 0; r < 5; r++) for (c = 0; c <= r; c++) { at[r + ',' + c] = holes.length; holes.push({ r: r, c: c, x: (c - r / 2) * 1.45, y: (r - 8 / 3) * 1.45 * 0.8660254 }); } }
    else for (r = 0; r < 7; r++) for (c = 0; c < 7; c++) {
      if ((r >= 2 && r <= 4) || (c >= 2 && c <= 4) || (shape === 'european' && (r === 1 || r === 5) && (c === 1 || c === 5))) { at[r + ',' + c] = holes.length; holes.push({ r: r, c: c, x: c - 3, y: r - 3 }); }
    }
    return { holes: holes, at: at, center: shape === 'triangle' ? -1 : at['3,3'] };
  }
  function msSvg(geo, cols, o) {
    o = o || {};
    var s = '<svg viewBox="-5 -5 10 10" role="img" aria-label="Marble board"><defs><radialGradient id="msw" cx=".42" cy=".36" r=".72"><stop offset="0" stop-color="#e2ad6c"/><stop offset=".55" stop-color="#c88a4a"/><stop offset="1" stop-color="#9b6230"/></radialGradient></defs>';
    s += '<circle r="4.92" fill="#5e3517"/><circle r="4.84" fill="url(#msw)"/><circle r="4.8" fill="none" stroke="#fff3dc" stroke-opacity=".32" stroke-width=".07"/>';
    if (o.goal && geo.center >= 0) s += '<circle r=".52" fill="none" stroke="#e6c46a" stroke-width=".07" stroke-opacity=".85"/>';
    geo.holes.forEach(function (h) { s += '<circle cx="' + f2(h.x) + '" cy="' + f2(h.y + .04) + '" r=".37" fill="#fff3dc" fill-opacity=".34"/><circle cx="' + f2(h.x) + '" cy="' + f2(h.y) + '" r=".35" fill="#1c0d04"/>'; });
    geo.holes.forEach(function (h, i) {
      var c = cols[i]; if (c == null || c === '.') return;
      var milk = c === '9', fill = milk ? '#f3eee4' : MS_PAL[+c % MS_PAL.length];
      s += '<circle cx="' + f2(h.x) + '" cy="' + f2(h.y + .05) + '" r=".43" fill="rgba(0,0,0,.35)"/><circle cx="' + f2(h.x) + '" cy="' + f2(h.y) + '" r=".42" fill="' + fill + '"' + (milk ? ' stroke="#cfc6b4" stroke-width=".04"' : '') + '/>';
      if (milk) s += '<path d="M' + f2(h.x - .3) + ' ' + f2(h.y) + 'q.3 -.25 .6 0" stroke="' + MS_PAL[i % 8] + '" stroke-width=".09" fill="none"/>';
      s += '<circle cx="' + f2(h.x - .13) + '" cy="' + f2(h.y - .15) + '" r=".13" fill="#fff" fill-opacity=".75"/>';
    });
    (o.ring || []).forEach(function (i) { var h = geo.holes[i]; if (h) s += '<circle cx="' + f2(h.x) + '" cy="' + f2(h.y) + '" r=".5" fill="none" stroke="#fff6c8" stroke-width=".08"/>'; });
    if (o.path) { var a = geo.holes[o.path[0]], b = geo.holes[o.path[1]]; if (a && b) s += '<path d="M' + f2(a.x) + ' ' + f2(a.y) + 'L' + f2(b.x) + ' ' + f2(b.y) + '" stroke="#fff6c8" stroke-width=".07" stroke-dasharray=".14 .1" opacity=".8"/>'; }
    return s + '</svg>';
  }
  R('marblesolitaire', function (e, ui) {
    var B = MS_BOARDS[e.board]; if (!B || typeof e.final !== 'string') return null;
    var geo = msGeo(B[0]), d = e.dt || {}, n = geo.holes.length, out = [];
    var mv = String(d.mv || ''), jumps = [];
    for (var k = 0; k + 3 < mv.length; k += 4) jumps.push([+mv.substr(k, 2), +mv.substr(k + 2, 2)]);
    var st = typeof d.st === 'string' && d.st.length === n ? d.st.split('') : null;
    if (st && d.pk >= 0 && st[d.pk] !== '.') st[d.pk] = '.';
    function frame(m) {
      var b = st.slice();
      for (var j = 0; j < m; j++) {
        var f = jumps[j][0], t = jumps[j][1], A = geo.holes[f], Z = geo.holes[t];
        var mid = geo.at[((A.r + Z.r) / 2) + ',' + ((A.c + Z.c) / 2)];
        b[t] = b[f]; b[f] = '.'; if (mid != null) b[mid] = '.';
      }
      return b;
    }
    var left = e.left != null ? e.left : e.final.split('').filter(function (x) { return x === '1'; }).length;
    var lastRing = [];
    if (left === 1) lastRing = [e.final.indexOf('1')];
    var snap = ui.el('div', { class: 'hv-snap', style: { 'max-width': '300px' } });
    var goal = !!B[1];
    if (st && jumps.length) {
      out.push(ui.section('Final board', snap));
      out.push(ui.section('Replay', replay(ui, snap, jumps.length, jumps.length, function (m) {
        var b = frame(m), cnt = b.filter(function (x) { return x !== '.'; }).length;
        snap.innerHTML = msSvg(geo, b, { goal: goal, ring: m === jumps.length ? lastRing : m ? [jumps[m - 1][1]] : [], path: m && m < jumps.length ? jumps[m - 1] : null });
        return m === 0 ? 'Start · ' + plural(cnt, 'marble') : m === jumps.length ? 'The end · ' + plural(cnt, 'marble') + ' left' : 'Jump ' + m + ' of ' + jumps.length + ' · ' + plural(cnt, 'marble') + ' left';
      })));
    } else {
      var cols = e.final.split('').map(function (x, i) { return x === '1' ? String(i % 9) : '.'; });
      snap.innerHTML = msSvg(geo, cols, { goal: goal, ring: lastRing });
      out.push(ui.section('Final board', snap));
    }
    out.push(ui.stats([['Marbles left', left, e.center ? 'in the center' : ''], ['Jumps', e.moves], e.chain >= 2 ? ['Longest run', e.chain, 'jumps in a row'] : null, ['Hints', e.hints || 0], ['Undos', e.undos || 0]]));
    out.push(ui.facts([['Board', (MS_NAMES[e.board] || e.board) + ' · ' + n + ' holes']]));
    return ui.wrap(out);
  });

  // ── Slide Puzzle: the shuffle, then every slide back to solved ──
  function spSvg(ui, b, N, o) {
    o = o || {};
    var cs = Math.max(30, Math.round(220 / N)), g = Math.max(3, Math.round(cs * .08)), W = N * cs + (N + 1) * g;
    var s = '<svg viewBox="0 0 ' + W + ' ' + W + '" role="img" aria-label="Puzzle board"><rect width="' + W + '" height="' + W + '" rx="10" fill="#2a180b"/>';
    b.forEach(function (v, i) {
      var x = g + (i % N) * (cs + g), y = g + Math.floor(i / N) * (cs + g);
      if (!v) { s += '<rect x="' + x + '" y="' + y + '" width="' + cs + '" height="' + cs + '" rx="' + cs * .11 + '" fill="rgba(0,0,0,.35)"/>'; return; }
      var hr = Math.floor((v - 1) / N), hc = (v - 1) % N, home = v - 1 === i;
      s += '<rect x="' + x + '" y="' + (y + 2) + '" width="' + cs + '" height="' + cs + '" rx="' + cs * .11 + '" fill="#a8916a"/>';
      s += '<rect x="' + x + '" y="' + y + '" width="' + cs + '" height="' + cs + '" rx="' + cs * .11 + '" fill="' + (o.hl === i ? '#fff3c4' : '#f6eddb') + '"/>';
      s += '<text x="' + (x + cs / 2) + '" y="' + (y + cs / 2 + 1) + '" text-anchor="middle" dominant-baseline="central" font-family="var(--display),ui-rounded,system-ui" font-weight="900" font-size="' + (v > 9 ? cs * .42 : cs * .5) + '" fill="' + ((hr + hc) % 2 ? '#1d3768' : '#8e1b25') + '"' + (o.dim && !home ? ' opacity=".55"' : '') + '>' + v + '</text>';
    });
    return s + '</svg>';
  }
  R('slidepuzzle', function (e, ui) {
    var N = e.size, st = e.start;
    if (!N || !Array.isArray(st) || st.length !== N * N) return null;
    var d = e.dt || {}, mv = String(d.mv || ''), out = [];
    var snap = ui.el('div', { class: 'hv-snap f-wood', style: { 'max-width': '300px' } });
    if (mv.length) {
      var frames = [st.slice()];
      var b = st.slice();
      for (var k = 0; k < mv.length; k++) { var to = parseInt(mv.charAt(k), 36), gp = b.indexOf(0); b[gp] = b[to]; b[to] = 0; frames.push(b.slice()); }
      out.push(ui.section('Solved', snap));
      out.push(ui.section('Replay', replay(ui, snap, mv.length, mv.length, function (m) {
        var to = m ? parseInt(mv.charAt(m - 1), 36) : -1, fb = frames[m], moved = m ? fb.indexOf(0) === to ? frames[m - 1][to] : 0 : 0;
        snap.innerHTML = spSvg(ui, fb, N, { hl: m ? fb.indexOf(moved) : -1, dim: m < mv.length });
        var home = fb.filter(function (v, i) { return v && v === i + 1; }).length;
        return m === 0 ? 'The shuffle · ' + home + ' of ' + (N * N - 1) + ' tiles in place' : m === mv.length ? 'Solved · move ' + m : 'Move ' + m + ' · ' + home + ' of ' + (N * N - 1) + ' in place';
      })));
    } else {
      snap.innerHTML = spSvg(ui, st, N, { dim: true });
      out.push(ui.section('The shuffle', snap));
    }
    out.push(ui.stats([['Moves', ui.num(e.moves)], ['Time', sec(e.seconds)], e.opt ? ['Shortest', e.opt, e.moves <= e.opt ? 'you matched it' : 'moves possible'] : null, ['Hints', e.hints || 0], ['Undos', e.undos || 0]]));
    var names = { meadow: 'Meadow', night: 'Game night', space: 'Space', harbor: 'Harbor' };
    out.push(ui.facts([['Size', N + ' × ' + N], e.pic ? ['Picture', (names[e.pic] || e.pic) + (d.nums ? ' (with numbers)' : '')] : null, e.watched ? ['Computer', 'Finished it from move ' + e.watched] : null]));
    return ui.wrap(out);
  });

  // ── Sudoku: the finished page, printed numbers vs your pen, hints and slips marked, and the order you filled it ──
  function sdSvg(given, vals, o) {
    o = o || {};
    var cs = 34, W = cs * 9 + 4, s = '<svg viewBox="0 0 ' + W + ' ' + W + '" role="img" aria-label="Sudoku grid"><rect width="' + W + '" height="' + W + '" fill="#fbf8ef"/>';
    var hi = {}, bad = {}; (o.h || []).forEach(function (i) { hi[i] = 1; }); (o.x || []).forEach(function (i) { bad[i] = 1; });
    for (var i = 0; i < 81; i++) {
      var r = Math.floor(i / 9), c = i % 9, x = 2 + c * cs, y = 2 + r * cs, v = vals[i];
      if (hi[i] && v && !given[i]) s += '<rect x="' + x + '" y="' + y + '" width="' + cs + '" height="' + cs + '" fill="#fde68a" opacity=".7"/>';
      if (o.last === i) s += '<rect x="' + x + '" y="' + y + '" width="' + cs + '" height="' + cs + '" fill="#bfdbfe"/>';
      if (bad[i] && !given[i]) s += '<path d="M' + (x + cs - 9) + ' ' + y + 'h9v9z" fill="#dc2626" opacity=".8"/>';
      if (v) s += '<text x="' + (x + cs / 2) + '" y="' + (y + cs / 2 + 1) + '" text-anchor="middle" dominant-baseline="central" font-size="' + (given[i] ? 21 : 22) + '" font-weight="' + (given[i] ? 800 : 500) + '" fill="' + (given[i] ? '#1f2430' : '#1d4ed8') + '" font-family="' + (given[i] ? 'system-ui,sans-serif' : '\'Bradley Hand\',\'Segoe Print\',\'Comic Sans MS\',cursive') + '">' + v + '</text>';
    }
    for (var k = 0; k <= 9; k++) {
      var p = 2 + k * cs, th = k % 3 === 0 ? 2.2 : .8, col = k % 3 === 0 ? '#2a2f3a' : '#b9b3a3';
      s += '<line x1="' + p + '" y1="2" x2="' + p + '" y2="' + (W - 2) + '" stroke="' + col + '" stroke-width="' + th + '"/><line x1="2" y1="' + p + '" x2="' + (W - 2) + '" y2="' + p + '" stroke="' + col + '" stroke-width="' + th + '"/>';
    }
    return s + '</svg>';
  }
  var SD_DIFF = { easy: 'Easy', medium: 'Medium', hard: 'Hard', expert: 'Expert' };
  R('sudoku', function (e, ui) {
    var d = e.dt || {}, given, vals;
    function flat(a) { return Array.isArray(a) ? [].concat.apply([], a).map(Number) : null; }
    if (typeof d.g === 'string' && d.g.length === 81) { given = d.g.split('').map(Number); vals = String(d.v || '').split('').map(Number); }
    else { given = flat(e.givens); vals = flat(e.board); }
    if (!given || given.length !== 81 || !vals || vals.length !== 81) return null;
    var out = [], snap = ui.el('div', { class: 'hv-snap f-paper', style: { 'max-width': '320px', padding: '6px' } });
    var ord = Array.isArray(d.o) ? d.o.filter(function (i) { return !given[i]; }) : [];
    snap.innerHTML = sdSvg(given, vals, { h: d.h, x: d.x });
    out.push(ui.section('The finished page', snap));
    out.push(ui.el('p', { class: 'hv-pz-note', text: 'Black: printed · Blue: your pen' + ((d.h || []).length ? ' · Yellow: hint' : '') + ((d.x || []).length ? ' · Red corner: had a wrong number' : '') }));
    if (ord.length > 4) {
      var fill = ui.el('div', { class: 'hv-snap f-paper', style: { 'max-width': '320px', padding: '6px' } });
      out.push(ui.section('How you filled it in', [fill, replay(ui, fill, ord.length, Math.min(ord.length, Math.round(ord.length / 2)), function (m) {
        var v = given.slice(); for (var j = 0; j < m; j++) v[ord[j]] = vals[ord[j]];
        fill.innerHTML = sdSvg(given, v, { last: m ? ord[m - 1] : -1, h: d.h });
        var c = m ? ord[m - 1] : -1;
        return m === 0 ? 'The printed puzzle' : 'Number ' + m + ' of ' + ord.length + ': ' + vals[c] + ' in row ' + (Math.floor(c / 9) + 1) + ', column ' + (c % 9 + 1);
      })]));
    }
    var lvl = d.lv >= 5 ? 'Advanced chains' : d.lv === 4 ? 'XY-Wing or Swordfish' : d.lv === 3 ? 'Triples or X-Wing' : '';
    out.push(ui.stats([['Time', sec(e.seconds)], ['Level', SD_DIFF[e.diff] || e.diff], ['Wrong numbers', d.mh ? '–' : e.mistakes || 0], ['Hints', e.hints || 0]]));
    out.push(ui.facts([['Puzzle', d.no ? 'No. ' + d.no + (e.daily ? ' (daily)' : '') : ''], ['Needed', lvl]]));
    return ui.wrap(out);
  });

  // ── Minesweeper: the field as it was left: numbers, flags, mines, the one that went off ──
  var MS_NUM = ['', '#1f5bd6', '#1d8a3c', '#d32b2b', '#1b2a8a', '#8a1d1d', '#138a8a', '#222', '#6b6b6b'];
  var MW_LEVELS = { beginner: 'Beginner', intermediate: 'Intermediate', expert: 'Expert' };
  function mwFlag(x, y, cs) { var u = cs / 24; return '<g transform="translate(' + x + ' ' + y + ') scale(' + u + ')"><ellipse cx="10" cy="20" rx="5" ry="1.6" fill="#2a2d36"/><path d="M10 19V4" stroke="#2b2f3a" stroke-width="1.8" stroke-linecap="round"/><path d="M10.8 4.2C14 4.6 16.5 5.8 19.4 7.6C16.5 9.3 14 10.6 10.8 11z" fill="#e1262f"/></g>'; }
  function mwMine(x, y, cs) { var cx = x + cs / 2, cy = y + cs / 2, r = cs * .26, s = '<g stroke="#1c2029" stroke-width="' + cs * .08 + '" stroke-linecap="round">'; for (var a = 0; a < 8; a++) { var t = a * Math.PI / 4; s += '<line x1="' + f2(cx + Math.cos(t) * r * .6) + '" y1="' + f2(cy + Math.sin(t) * r * .6) + '" x2="' + f2(cx + Math.cos(t) * r * 1.45) + '" y2="' + f2(cy + Math.sin(t) * r * 1.45) + '"/>'; } return s + '</g><circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="#262b36"/><circle cx="' + f2(cx - r * .35) + '" cy="' + f2(cy - r * .35) + '" r="' + f2(r * .3) + '" fill="#fff" opacity=".7"/>'; }
  R('minesweeper', function (e, ui) {
    var d = e.dt; if (!d || !Array.isArray(d.grid) || !d.grid.length) return null;
    var g = d.grid.map(String), R0 = g.length, C0 = g[0].length, flip = C0 > R0;
    var Rn = flip ? C0 : R0, Cn = flip ? R0 : C0;
    function at(r, c) { return flip ? g[c].charAt(r) : g[r].charAt(c); }
    function isMine(ch) { return ch === 'F' || ch === 'M' || ch === '*'; }
    var cs = 24, W = Cn * cs, H = Rn * cs, won = !!e.won;
    var fd = d.fd >= 0 ? (flip ? [d.fd % C0, Math.floor(d.fd / C0)] : [Math.floor(d.fd / C0), d.fd % C0]) : null;
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Minefield"><rect width="' + W + '" height="' + H + '" fill="#2a3140"/>';
    var adj = function (r, c) { var n = 0; for (var dr = -1; dr <= 1; dr++) for (var dc = -1; dc <= 1; dc++) { var rr = r + dr, cc = c + dc; if ((dr || dc) && rr >= 0 && rr < Rn && cc >= 0 && cc < Cn && isMine(at(rr, cc))) n++; } return n; };
    var opened = 0, safe = 0;
    for (var r = 0; r < Rn; r++) for (var c = 0; c < Cn; c++) {
      var ch = at(r, c), x = c * cs, y = r * cs, open = /[0-8]/.test(ch);
      if (!isMine(ch)) { safe++; if (open) opened++; }
      if (open || ch === 'M' && !won || ch === '*') {
        s += '<rect x="' + x + '" y="' + y + '" width="' + cs + '" height="' + cs + '" fill="' + (ch === '*' ? '#ff4d3d' : ch === 'M' ? '#c9c2b2' : '#dcd5c3') + '" stroke="rgba(80,70,50,.28)" stroke-width=".5"/>';
        if (ch === '*') s += '<circle cx="' + (x + cs / 2) + '" cy="' + (y + cs / 2) + '" r="' + cs * .5 + '" fill="#ffdf6b" opacity=".55"/>';
        if (open && ch !== '0') s += '<text x="' + (x + cs / 2) + '" y="' + (y + cs / 2 + 1) + '" text-anchor="middle" dominant-baseline="central" font-family="var(--display),ui-rounded,system-ui" font-weight="900" font-size="' + cs * .7 + '" fill="' + MS_NUM[+ch] + '">' + ch + '</text>';
        if (!open) s += mwMine(x, y, cs);
      } else {
        s += '<rect x="' + x + '" y="' + y + '" width="' + cs + '" height="' + cs + '" fill="#8fa2b8"/><path d="M' + x + ' ' + (y + cs) + 'V' + y + 'H' + (x + cs) + '" stroke="#b9c7d7" stroke-width="2" fill="none"/><path d="M' + (x + cs) + ' ' + y + 'V' + (y + cs) + 'H' + x + '" stroke="#5f7189" stroke-width="2" fill="none"/>';
        if (ch === 'F' || ch === 'X' || ch === 'M' && won) s += mwFlag(x, y, cs);
        if (ch === 'X') s += '<path d="M' + (x + 4) + ' ' + (y + 4) + 'L' + (x + cs - 4) + ' ' + (y + cs - 4) + 'M' + (x + cs - 4) + ' ' + (y + 4) + 'L' + (x + 4) + ' ' + (y + cs - 4) + '" stroke="#b0151f" stroke-width="2.6" stroke-linecap="round"/>';
      }
      if (fd && fd[0] === r && fd[1] === c) s += '<rect x="' + (x + 1.5) + '" y="' + (y + 1.5) + '" width="' + (cs - 3) + '" height="' + (cs - 3) + '" rx="3" fill="none" stroke="#f5b400" stroke-width="2.2"/>';
    }
    s += '</svg>';
    // fewest clicks possible (3BV): each empty opening counts once, plus numbered squares that no opening reaches
    var seen = {}, bv = 0;
    function key(r, c) { return r * Cn + c; }
    for (r = 0; r < Rn; r++) for (c = 0; c < Cn; c++) {
      if (isMine(at(r, c)) || adj(r, c) || seen[key(r, c)]) continue;
      bv++; var q = [[r, c]]; seen[key(r, c)] = 1;
      while (q.length) {
        var p = q.pop();
        for (var dr = -1; dr <= 1; dr++) for (var dc = -1; dc <= 1; dc++) {
          var rr = p[0] + dr, cc = p[1] + dc; if (rr < 0 || rr >= Rn || cc < 0 || cc >= Cn || seen[key(rr, cc)] || isMine(at(rr, cc))) continue;
          seen[key(rr, cc)] = 1; if (!adj(rr, cc)) q.push([rr, cc]);
        }
      }
    }
    for (r = 0; r < Rn; r++) for (c = 0; c < Cn; c++) if (!isMine(at(r, c)) && !seen[key(r, c)]) bv++;
    var out = [ui.section(won ? 'The cleared field' : 'Where it went off', ui.picture(s, { frame: 'dark', max: flip ? 330 : 320 }))];
    out.push(ui.el('p', { class: 'hv-pz-note', text: 'Gold square: your first dig' + (won ? '' : ' · Red: the mine that went off · Crossed flag: wrong guess') }));
    out.push(ui.stats([['Time', e.ms < 60000 ? (e.ms / 1000).toFixed(1) + 's' : sec(e.ms / 1000)], ['Cleared', Math.floor(100 * opened / Math.max(1, safe)) + '%'], ['Fewest clicks', bv, 'needed for this field'], ['Flags', d.flags || 0], d.chords ? ['Quick clears', d.chords] : null, d.first > 1 ? ['First dig', d.first, 'squares opened'] : null]));
    out.push(ui.facts([['Level', (MW_LEVELS[e.diff] || e.diff) + ' · ' + C0 + ' × ' + R0], e.undos ? ['Take-backs', e.undos] : null]));
    return ui.wrap(out);
  });

  // ── Memory Match: the table face up, who took each pair and in what order ──
  R('memorymatch', function (e, ui) {
    var d = e.dt; if (!d || typeof d.cards !== 'string' || !Array.isArray(d.nm)) return null;
    var names = (e.players || []).map(function (p) { return p.name; }), solo = names.length < 2, out = [];
    var seq = String(d.seq || ''), who = String(d.who || ''), rank = {};
    for (var k = 0; k < seq.length; k++) rank[seq.charAt(k)] = k + 1;
    var cols = d.cols || 4, box = ui.el('div', { class: 'hv-mm felt-in', style: { 'grid-template-columns': 'repeat(' + cols + ',1fr)', 'max-width': Math.min(360, cols * 62 + 20) + 'px' } });
    d.cards.split('').forEach(function (ch, i) {
      var o = String(d.own || '').charAt(i), nm = d.nm[ch.charCodeAt(0) - 97] || '';
      if (o === '.' || o === '') { box.appendChild(ui.el('div', { class: 'c left' })); return; }
      box.appendChild(ui.el('div', { class: 'c', style: { '--pc': solo ? 'transparent' : ui.color(+o) } }, [ui.el('span', { text: nm }), rank[ch] ? ui.el('em', { text: String(rank[ch]) }) : null]));
    });
    out.push(ui.section('The table', box));
    out.push(ui.el('p', { class: 'hv-pz-note', text: 'Small number: the order the pairs were found' + (solo ? '' : ' · Colour: who took it') }));
    if (seq.length) {
      var lines = seq.split('').map(function (ch, j) {
        var p = who.charAt(j), mv = (d.mv || [])[j];
        return { b: (mv ? 'Move ' + mv : '#' + (j + 1)), t: (d.nm[ch.charCodeAt(0) - 97] || '') + (solo ? '' : ' · ' + (names[+p] || '')), c: solo ? null : +p };
      });
      out.push(ui.section('Pairs in the order found', ui.log(lines)));
    }
    var pl = d.pl || [];
    if (solo) {
      var pairs = d.cards.length / 2, moves = e.moves || 0;
      out.push(ui.stats([['Moves', moves, 'perfect is ' + pairs], ['Misses', Math.max(0, moves - pairs)], ['Time', sec(e.time)], pl[0] && pl[0].b ? ['Best run', pl[0].b, 'pairs in a row'] : null, pl[0] && pl[0].l ? ['Lucky', pl[0].l, 'first-look matches'] : null]));
    } else if (pl.length) {
      out.push(ui.section('Players', ui.table(['', 'Pairs', 'Best run', 'Lucky', 'Forgot'], names.map(function (n, i) {
        var p = pl[i] || {}; return [n, (e.players[i] || {}).score, p.b || 0, p.l || 0, p.s || 0];
      }))));
      out.push(ui.stats([['Moves', e.moves], ['Time', sec(e.time)]]));
    }
    return ui.wrap(out);
  });

  // ── Mahjong Tiles: the stack replayed pair by pair, with the real faces ──
  var MJ_LAY = { turtle: 'Turtle', pyramid: 'Pyramid', castle: 'Castle', mini: 'Mini' };
  function mjLayout(name) {
    var p = [];
    function rect(x0, x1, y0, y1, z) { for (var y = y0; y <= y1; y++) for (var x = x0; x <= x1; x++) p.push({ x: x * 2, y: y * 2, z: z }); }
    if (name === 'turtle') {
      [[0, 1, 12], [1, 3, 10], [2, 2, 11], [3, 1, 12], [4, 1, 12], [5, 2, 11], [6, 3, 10], [7, 1, 12]].forEach(function (r) { rect(r[1], r[2], r[0], r[0], 0); });
      p.push({ x: 0, y: 7, z: 0 }, { x: 26, y: 7, z: 0 }, { x: 28, y: 7, z: 0 });
      rect(4, 9, 1, 6, 1); rect(5, 8, 2, 5, 2); rect(6, 7, 3, 4, 3);
      p.push({ x: 13, y: 7, z: 4 });
    } else if (name === 'pyramid') { rect(0, 7, 0, 7, 0); rect(1, 6, 1, 6, 1); rect(2, 5, 2, 5, 2); rect(3, 4, 3, 4, 3); }
    else if (name === 'castle') {
      rect(0, 9, 0, 5, 0);
      [[0, 0], [8, 0], [0, 4], [8, 4]].forEach(function (c) { rect(c[0], c[0] + 1, c[1], c[1] + 1, 1); p.push({ x: c[0] * 2 + 1, y: c[1] * 2 + 1, z: 2 }); });
      rect(3, 6, 2, 3, 1);
    } else { rect(0, 5, 0, 4, 0); rect(1, 4, 1, 3, 1); rect(2, 3, 2, 2, 2); }
    return p;
  }
  var MJ_FL = [['梅', '#d6336c'], ['蘭', '#8e44ad'], ['菊', '#e08a00'], ['竹', '#12804a']], MJ_SE = [['春', '#2f9e44'], ['夏', '#d9480f'], ['秋', '#b8860b'], ['冬', '#1c63c7']];
  function mjName(k) {
    if (k < 27) return (k % 9 + 1) + ' ' + ['Characters', 'Dots', 'Bamboo'][Math.floor(k / 9)];
    if (k < 31) return ['East', 'South', 'West', 'North'][k - 27] + ' Wind';
    if (k < 34) return ['Red', 'Green', 'White'][k - 31] + ' Dragon';
    return k < 38 ? 'Flowers' : 'Seasons';
  }
  function mjFace(k, cx, cy, w, h) {
    var t = function (txt, col, size, dy) { return '<text x="' + f2(cx) + '" y="' + f2(cy + (dy || 0)) + '" text-anchor="middle" dominant-baseline="central" font-size="' + f2(size) + '" font-weight="800" fill="' + col + '" font-family="system-ui,\'Noto Serif CJK SC\',serif">' + txt + '</text>'; };
    if (k < 27) {
      var suitCol = ['#b3202a', '#1f5bd6', '#14803c'][Math.floor(k / 9)];
      var mark = k < 9 ? t('萬', '#b3202a', w * .34, h * .24) : k < 18 ? '<circle cx="' + f2(cx) + '" cy="' + f2(cy + h * .24) + '" r="' + f2(w * .12) + '" fill="none" stroke="#1f5bd6" stroke-width="' + f2(w * .07) + '"/>' : '<rect x="' + f2(cx - w * .05) + '" y="' + f2(cy + h * .12) + '" width="' + f2(w * .1) + '" height="' + f2(h * .24) + '" rx="1" fill="#14803c"/>';
      return t(String(k % 9 + 1), suitCol, w * .5, -h * .1) + mark;
    }
    if (k < 31) return t('東南西北'.charAt(k - 27), '#1f2430', w * .56);
    if (k === 31) return t('中', '#c8102e', w * .6);
    if (k === 32) return t('發', '#12804a', w * .56);
    if (k === 33) return '<rect x="' + f2(cx - w * .26) + '" y="' + f2(cy - h * .28) + '" width="' + f2(w * .52) + '" height="' + f2(h * .56) + '" rx="1.5" fill="none" stroke="#1c63c7" stroke-width="' + f2(w * .08) + '"/>';
    var fl = k < 38 ? MJ_FL[k - 34] : MJ_SE[k - 38];
    return t(fl[0], fl[1], w * .55);
  }
  R('mahjong', function (e, ui) {
    var d = e.dt; if (!d || !Array.isArray(d.o) || !MJ_LAY[e.layout]) return null;
    var P = mjLayout(e.layout); if (P.length !== d.o.length) return null;
    var faces = [], kk = (d.k || []).slice(), pk = d.pk || [], total = pk.length;
    P.forEach(function (_, i) { faces[i] = d.o[i] > 0 ? pk[d.o[i] - 1] : kk.shift(); });
    var hu = 8, hv = 10.5, dz = [2.2, 2.6], maxX = 0, maxY = 0, maxZ = 0;
    P.forEach(function (p) { maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y); maxZ = Math.max(maxZ, p.z); });
    var pad = 6, W = (maxX + 2) * hu + pad * 2 + maxZ * dz[0], H = (maxY + 2) * hv + pad * 2 + maxZ * dz[1];
    var order = P.map(function (_, i) { return i; }).sort(function (a, b) { return P[a].z - P[b].z || (P[a].x + P[a].y) - (P[b].x + P[b].y); });
    function draw(m, last) {
      var s = '<svg viewBox="0 0 ' + f2(W) + ' ' + f2(H) + '" role="img" aria-label="Tile layout">';
      order.forEach(function (i) {
        var p = P[i], x = pad + p.x * hu + maxZ * dz[0] - p.z * dz[0], y = pad + p.y * hv + maxZ * dz[1] - p.z * dz[1], w = hu * 2 - 1, h = hv * 2 - 1;
        var gone = d.o[i] > 0 && d.o[i] <= m;
        if (gone) { if (p.z === 0) s += '<rect x="' + f2(x) + '" y="' + f2(y) + '" width="' + w + '" height="' + h + '" rx="2.5" fill="none" stroke="rgba(255,255,255,.12)" stroke-width=".8"/>'; return; }
        s += '<rect x="' + f2(x + 1.6) + '" y="' + f2(y + 1.6) + '" width="' + w + '" height="' + h + '" rx="2.5" fill="#1d6f4a"/>';
        s += '<rect x="' + f2(x + .8) + '" y="' + f2(y + .8) + '" width="' + w + '" height="' + h + '" rx="2.5" fill="#cdbb92"/>';
        s += '<rect x="' + f2(x) + '" y="' + f2(y) + '" width="' + w + '" height="' + h + '" rx="2.5" fill="#fbf6e9" stroke="' + (last && last.indexOf(i) >= 0 ? '#f5b400' : 'rgba(90,70,40,.35)') + '" stroke-width="' + (last && last.indexOf(i) >= 0 ? 1.6 : .6) + '"/>';
        s += mjFace(faces[i], x + w / 2, y + h / 2, w, h);
      });
      return s + '</svg>';
    }
    var out = [], snap = ui.el('div', { class: 'hv-snap f-felt', style: { 'max-width': '360px' } });
    var won = !!e.won, start = won ? 0 : total;
    out.push(ui.section(won ? 'The deal' : 'Where it got stuck', snap));
    if (total) {
      out.push(ui.section('Replay', replay(ui, snap, total, start, function (m) {
        var next = m < total ? P.map(function (_, i) { return i; }).filter(function (i) { return d.o[i] === m + 1; }) : null;
        snap.innerHTML = draw(m, next);
        var left = P.length - m * 2;
        return m === 0 ? 'The deal · ' + P.length + ' tiles' + (next ? ' · gold: the first pair (' + mjName(pk[0]) + ')' : '') : m === total ? (won ? 'Table cleared' : 'Stuck · ' + left + ' tiles left') : 'Pair ' + m + ' of ' + total + ' · ' + mjName(pk[m - 1]) + ' · ' + left + ' left';
      })));
    } else snap.innerHTML = draw(0);
    out.push(ui.stats([['Cleared', (P.length - (e.left || 0)) + ' / ' + P.length], ['Time', sec(e.time)], ['Hints', e.hints || 0], ['Shuffles', e.shuffles || 0], ['Undos', d.undos || 0]]));
    out.push(ui.facts([['Layout', MJ_LAY[e.layout]], won && total ? ['Last pair', mjName(pk[total - 1])] : null]));
    return ui.wrap(out);
  });

  // ── Math Puzzles: the chalkboard, every problem with its answer ──
  var MP_MODES = { ten: 'Worksheet', timed: 'Beat the clock', free: 'Practice' };
  R('mathpuzzles', function (e, ui) {
    var d = e.dt; if (!d || !Array.isArray(d.log) || !d.log.length) return null;
    var ol = ui.el('ol');
    d.log.forEach(function (l) {
      var cls = l.r === 2 ? 'ok' : l.r === 1 ? 'half' : l.r === 0 ? 'no' : 'skip';
      var q = String(l.q || l.t || '').replace(/\s*=\s*\?\s*$/, '');
      var ans = ui.el('span', { class: 'a' }, [l.w && l.r !== -1 ? ui.el('span', { class: 'w', text: String(l.w).replace(/ /g, ', ') }) : null, ui.el('span', { text: l.r === -1 ? 'skipped · ' + (l.a || '') : (l.a || '') })]);
      var mark = ui.el('span', { class: 'm ' + cls, html: l.r > 0 ? ui.icon('check') : l.r === 0 ? ui.icon('close') : ui.icon('right') });
      var meta = (l.h ? 'hint' : '') + (l.s ? (l.h ? ' · ' : '') + l.s + 's' : '');
      ol.appendChild(ui.el('li', null, [ui.el('span', { class: 'q' }, [ui.el('span', { text: q + (/[?]/.test(q) || l.q == null ? '' : ' =') }), meta ? ui.el('small', { text: meta }) : null]), ui.el('span', { style: { display: 'flex', gap: '6px', 'align-items': 'baseline' } }, [ans, mark])]));
    });
    var out = [ui.section(d.more ? 'The last ' + d.log.length + ' problems' : 'The problems', ui.el('div', { class: 'hv-slate' }, [ol]))];
    var right = e.right != null ? e.right : d.log.filter(function (l) { return l.r > 0; }).length, n = e.total || d.log.length;
    out.push(ui.stats([['Points', e.score], ['Right', right + ' / ' + n], ['Best streak', e.streak || 0], d.fast ? ['Fastest', d.fast + 's'] : null]));
    // which kinds of puzzle went well
    var kinds = {}; d.log.forEach(function (l) { var k = kinds[l.t] = kinds[l.t] || { n: 0, ok: 0 }; k.n++; if (l.r > 0) k.ok++; });
    var ks = Object.keys(kinds); if (ks.length > 1) out.push(ui.section('By kind', ui.bars(ks.map(function (k) { return { label: k, value: Math.round(100 * kinds[k].ok / kinds[k].n), max: 100, color: '#7ee2a0', text: kinds[k].ok + ' / ' + kinds[k].n }; }))));
    out.push(ui.facts([['Mode', (MP_MODES[e.modeId] || '') + (e.modeId === 'timed' && e.secs ? ' · ' + (e.secs / 60) + ' min' : '')]]));
    return ui.wrap(out);
  });
})();
