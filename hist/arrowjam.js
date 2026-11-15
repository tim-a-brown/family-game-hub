'use strict';
// History view: Arrow Jam. The level's board as it started, drawn in the game's own arrows on its tray, and a replay
// of the level: the arrows leave in the order they left, a bump shows the arrow tapped and the one in its way, and a
// hint lights the arrow it showed. Under it the stars, bumps, hints, time and best run, and a time line of the level.
// Recorded by games/arrowjam.html (Kit.record 'arrowjam'); the boards come from games/arrowjam/levels.js (in the
// list of files hist-view.js loads), so the detail keeps only the level's number and what happened:
//   o  the arrows in the order they left, 2 base-36 characters each
//   ot when each one left, tenths of a second of play, 3 characters each
//   b  each bump: the step (arrows gone by then), the arrow tapped, the arrow in its way (2 each), the time (3)
//   h  each hint: the step, the arrow lit (2 each), the time (3)
//   t  seconds of play, r the longest quick run, pb the stars this level had before, pt its quickest clear before
(function () {
  if (!window.HistView) return;
  var DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0], MG = 0.32, NS = 'http://www.w3.org/2000/svg';
  var PAL = [['#ff5d5d', '#b42a35'], ['#ff9a3c', '#b85a14'], ['#ffd447', '#b98c12'], ['#8bd450', '#4b8a23'], ['#3ddcb0', '#1a8f71'], ['#ff6fb5', '#b2356f'], ['#a77bff', '#6542bd'], ['#f2f4ff', '#9aa0c4']];
  var HEART = 'M12 20.5s-8-5-8-10.6A4.4 4.4 0 0 1 12 7.3a4.4 4.4 0 0 1 8 2.6c0 5.6-8 10.6-8 10.6z';
  function f2(v) { return Math.round(v * 1000) / 1000; }
  function first(n) { return String(n || '').split(' ')[0] || 'You'; }
  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many || one + 's'); }
  function nth(n) { var s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }
  function clock(s) { s = Math.max(0, Number(s) || 0); var m = Math.floor(s / 60), r = Math.floor(s - m * 60); return m + ':' + (r < 10 ? '0' : '') + r; }
  function chunks(s, w) { s = String(s || ''); var out = []; for (var k = 0; k + w <= s.length; k += w) out.push(parseInt(s.substr(k, w), 36)); return out; }
  function sv(tag, attrs, parent) { var n = document.createElementNS(NS, tag); for (var k in attrs) n.setAttribute(k, attrs[k]); if (parent) parent.appendChild(n); return n; }

  HistView.css('hv-arrowjam', [
    '.ajh{display:flex;flex-direction:column;gap:10px;align-items:stretch;min-width:0;}',
    '.ajh-top{display:flex;align-items:center;justify-content:center;gap:12px;flex-wrap:wrap;}',
    '.ajh-stars{display:flex;gap:4px;align-items:flex-end;}',
    '.ajh-stars i{display:block;width:30px;height:30px;background:rgba(255,255,255,.14);-webkit-mask:var(--ajh-star) center/contain no-repeat;mask:var(--ajh-star) center/contain no-repeat;}',
    '.ajh-stars i:nth-child(2){width:36px;height:36px;}',
    '.ajh-stars i.on{background:linear-gradient(180deg,#fff1a8,#ffc83d 55%,#e89a12);filter:drop-shadow(0 0 8px rgba(255,200,60,.55));}',
    '.ajh-top p{margin:0;font-size:.9rem;font-weight:700;color:var(--text-2);text-align:center;}',
    '.ajh{--ajh-star:url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\'%3E%3Cpath d=\'M12 1.8l3.1 6.5 7.1.9-5.2 4.9 1.3 7.1L12 17.8l-6.3 3.4L7 14.1 1.8 9.2l7.1-.9z\' stroke=\'%23000\' stroke-width=\'1.6\' stroke-linejoin=\'round\'/%3E%3C/svg%3E");}',
    // the counters over the board: hearts at the left, the arrows still to go at the right, the progress along the foot
    '.ajh-hud{position:relative;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:7px 12px 11px;border-radius:16px;background:var(--gl,rgba(255,255,255,.06));box-shadow:inset 0 0 0 1px var(--gl-line,rgba(255,255,255,.1));align-self:center;width:100%;max-width:var(--ajw);box-sizing:border-box;}',
    '.ajh-hearts{display:flex;gap:5px;}',
    '.ajh-ht{position:relative;width:22px;height:22px;}.ajh-ht svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible;}',
    '.ajh-ht .bg{fill:none;stroke:rgba(255,255,255,.22);stroke-width:1.6;}',
    '.ajh-ht .fg{fill:#ff3d55;transform-origin:50% 60%;transition:opacity .25s;}',
    '.ajh-ht.off .fg{opacity:0;}',
    '.ajh-ht.lose .fg{animation:ajhHeart .7s cubic-bezier(.3,.1,.6,1) forwards;}',
    '@keyframes ajhHeart{0%{opacity:1;transform:scale(1);}20%{opacity:1;transform:scale(1.4);}100%{opacity:0;transform:translateY(16px) rotate(24deg) scale(.6);}}',
    '.ajh-left{display:flex;flex-direction:column;align-items:flex-end;line-height:1.05;}',
    '.ajh-left small{font-size:.7rem;font-weight:700;color:var(--text-2);white-space:nowrap;}',
    '.ajh-left b{font-family:var(--display);font-size:1.25rem;font-variant-numeric:tabular-nums;}',
    '.ajh-prog{position:absolute;left:12px;right:12px;bottom:5px;height:3px;border-radius:2px;background:rgba(255,255,255,.08);overflow:hidden;}',
    '.ajh-prog i{position:absolute;inset:0;transform-origin:0 50%;transform:scaleX(var(--p,0));background:linear-gradient(90deg,var(--gold-lo,#f6b93b),var(--gold-hi,#ffe486));transition:transform .3s cubic-bezier(.22,1,.36,1);}',
    // the tray and its felt, in Arrow Jam's blue
    '.ajh-tray{align-self:center;overflow:hidden;width:100%;max-width:var(--ajw);box-sizing:border-box;padding:7px;border-radius:18px;background:linear-gradient(180deg,#26365e,#111a33 70%,#0c1328);box-shadow:inset 0 1.5px 0 rgba(255,255,255,.16),inset 0 -3px 0 rgba(0,0,0,.35),0 14px 30px -10px rgba(0,0,0,.65),0 0 0 1px rgba(0,0,0,.4);}',
    '.ajh-tray.shake{animation:ajhShake .34s cubic-bezier(.36,.07,.19,.97);}',
    '@keyframes ajhShake{20%{transform:translate(-4px,1px);}45%{transform:translate(3px,-1px);}70%{transform:translate(-2px,0);}}',
    '.ajh-felt{position:relative;border-radius:12px;line-height:0;background:radial-gradient(rgba(255,255,255,.035) 1px,transparent 1px) 0 0/4px 4px,radial-gradient(120% 90% at 50% 35%,#2160b8 0%,#16438a 70%,#10336d 100%);box-shadow:inset 0 6px 18px rgba(0,0,0,.55),inset 0 0 0 2px rgba(0,0,0,.25);}',
    '.ajh-felt svg{display:block;width:100%;height:auto;overflow:visible;}',
    '.ajh-felt .well{fill:rgba(0,0,0,.2);stroke:rgba(255,255,255,.05);stroke-width:.02;}',
    '.ajh-felt .well.lit{animation:ajhWell .9s ease-out both;}',
    '@keyframes ajhWell{30%{fill:rgba(255,224,130,.5);}100%{fill:rgba(0,0,0,.2);}}',
    // an arrow: its shadow on the felt, its darker side, its top and a line of light, as in the game
    '.ajh-a path{fill:none;stroke-linecap:round;stroke-linejoin:round;}',
    '.ajh-a .sh path{stroke:rgba(0,0,0,.42);}.ajh-a .sh path.h{fill:rgba(0,0,0,.42);}',
    '.ajh-a .sd path{stroke:var(--c2);}.ajh-a .sd path.h{fill:var(--c2);}',
    '.ajh-a .tp path{stroke:var(--c);}.ajh-a .tp path.h{fill:var(--c);}',
    '.ajh-a .gl{stroke:rgba(255,255,255,.5);}',
    '.ajh-a .halo path{stroke:#ffd34d;opacity:0;}.ajh-a .halo path.h{fill:#ffd34d;}',
    '.ajh-a.hint .halo path{opacity:.85;}',
    '.ajh-a.hit .halo path{stroke:#ff4d5e;opacity:.9;}.ajh-a.hit .halo path.h{fill:#ff4d5e;}',
    '.ajh-a.blk .halo path{stroke:#fff;opacity:.85;}.ajh-a.blk .halo path.h{fill:#fff;}',
    '.ajh-a.flash .halo path{animation:ajhFlash .6s ease-out;}',
    '@keyframes ajhFlash{0%{opacity:1;}100%{opacity:.75;}}',
    '.ajh-a.dim{opacity:.55;}',
    '.ajh-way{fill:none;stroke-width:.09;stroke-linecap:round;stroke-dasharray:.02 .26;}',
    // the replay's controls
    '.ajh-ctl{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:10px;align-self:center;width:100%;max-width:max(var(--ajw),300px);}',
    '.ajh-play{display:grid;place-items:center;width:44px;height:44px;border-radius:50%;border:0;padding:0;cursor:pointer;background:linear-gradient(180deg,var(--gold-hi,#ffe486),var(--gold-lo,#f6b93b));color:var(--gold-ink,#2a1c00);box-shadow:0 6px 14px -6px rgba(255,180,40,.8);-webkit-tap-highlight-color:transparent;}',
    '.ajh-play:active{transform:translateY(1px);}.ajh-play .ico{width:20px;height:20px;}',
    '.ajh-ctl input{width:100%;margin:0;accent-color:var(--gold-lo,#f6b93b);}',
    '.ajh-ctl .ck{font-size:.85rem;font-weight:800;font-variant-numeric:tabular-nums;color:var(--text-2);min-width:2.6em;text-align:right;}',
    // a phone held sideways: the board at the left, the counters, the controls and the caption in a column at the right
    '.ajh.side{display:grid;grid-template-columns:var(--ajw) minmax(0,1fr);grid-template-rows:auto auto 1fr;grid-template-areas:"tray hud" "tray ctl" "tray cap";column-gap:16px;row-gap:10px;align-items:start;}',
    '.ajh.side>.ajh-tray{grid-area:tray;max-width:none;}.ajh.side>.ajh-hud{grid-area:hud;max-width:none;}.ajh.side>.ajh-ctl{grid-area:ctl;max-width:none;}.ajh.side>.ajh-cap{grid-area:cap;max-width:none;text-align:left;}',
    '.ajh-cap{margin:0;min-height:4.05em;font-size:.86rem;font-weight:700;line-height:1.35;color:var(--text-2);text-align:center;align-self:center;max-width:max(var(--ajw),300px);}'
  ].join(''));

  HistView.register('arrowjam', function (e, ui) {
    var d = e.dt, LV = window.ARROWJAM_LEVELS;
    if (!d || !d.level || !LV || !LV[d.level - 1]) return null;
    var L = LV[d.level - 1], N = L.a.length, lv = d.level, nm = first((e.players && e.players[0] || {}).name);
    var won = d.stars != null && d.stars > 0;
    var order = chunks(d.o, 2).filter(function (i) { return i >= 0 && i < N; });
    var times = chunks(d.ot, 3); if (times.length !== order.length) times = null;
    var bumps = [], hints = [];
    var bs = String(d.b || ''); for (var k = 0; k + 9 <= bs.length; k += 9) bumps.push({ s: parseInt(bs.substr(k, 2), 36), i: parseInt(bs.substr(k + 2, 2), 36), by: parseInt(bs.substr(k + 4, 2), 36), t: parseInt(bs.substr(k + 6, 3), 36) / 10 });
    var hs = String(d.h || ''); for (k = 0; k + 7 <= hs.length; k += 7) hints.push({ s: parseInt(hs.substr(k, 2), 36), i: parseInt(hs.substr(k + 2, 2), 36), t: parseInt(hs.substr(k + 4, 3), 36) / 10 });
    bumps = bumps.filter(function (b) { return b.i < N && b.by < N; }); hints = hints.filter(function (h) { return h.i < N; });
    var out = [];

    // ── the stars it was cleared with, or the hearts that ran out ──
    var top = ui.el('div', { class: 'ajh-top' });
    var stars = ui.el('div', { class: 'ajh-stars', role: 'img', 'aria-label': won ? plural(d.stars, 'star') : 'No stars' });
    for (k = 0; k < 3; k++) stars.appendChild(ui.el('i', { class: won && k < d.stars ? 'on' : '' }));
    if (won) top.appendChild(stars);
    if (!won) top.appendChild(ui.el('p', { text: nm + ' ran out of hearts with ' + (d.cleared != null ? d.cleared : order.length) + ' of the ' + N + ' arrows cleared.' }));
    out.push(top);

    if (order.length) {
      // ── the events of the level, in order: a hint or a bump comes before the arrow that left at its step ──
      var ev = [];
      hints.forEach(function (h) { ev.push({ k: 'hint', s: h.s, i: h.i, t: h.t }); });
      bumps.forEach(function (b) { ev.push({ k: 'bump', s: b.s, i: b.i, by: b.by, t: b.t }); });
      order.forEach(function (i, s) { ev.push({ k: 'go', s: s, i: i, t: times ? times[s] / 10 : null, x: 1 }); });
      ev.sort(function (a, b) { return a.s - b.s || (a.x || 0) - (b.x || 0) || (a.t || 0) - (b.t || 0); });
      // quick runs, the way the game counts them: arrows less than 1.15 s apart with no bump between
      var run = 0, lastT = -9;
      ev.forEach(function (x) {
        if (x.k === 'bump') { run = 0; return; }
        if (x.k !== 'go') return;
        run = times && x.t - lastT < 1.15 && run > 0 ? run + 1 : 1; lastT = times ? x.t : lastT; x.run = run;
      });
      var E = ev.length;
      out.push(replayer(ui, L, lv, ev, E, nm, won, d));
    }

    // ── the numbers ──
    var pb = d.pb, pt = d.pt, t = d.t;
    var st = ui.stats([
      won ? ['Stars', d.stars + ' of 3', pb == null ? '' : !pb ? 'First clear' : d.stars > pb ? 'Up from ' + pb : ''] : ['Arrows cleared', (d.cleared != null ? d.cleared : order.length) + ' of ' + N],
      ['Bumps', d.bumps != null ? d.bumps : bumps.length],
      ['Hints', d.hints != null ? d.hints : hints.length, 'of 3'],
      t ? ['Time', clock(t), won && pt ? (t < pt ? 'New best, was ' + clock(pt) : 'Best ' + clock(pt)) : won && pb === 0 ? 'First clear' : ''] : null,
      d.r >= 2 ? ['Best run', d.r, 'arrows in a row'] : null,
      won ? null : ['Arrows', N]
    ]);
    if (st) out.push(st);

    // ── a time line: the arrows cleared as the clock ran, each bump and hint where it came ──
    var Z = HistView._pz;
    if (Z && times && t) {
      var line = order.map(function (_, s) { return [times[s] / 10, s + 1]; });
      var marks = bumps.map(function (b) { return { k: 'x', t: b.t }; }).concat(hints.map(function (h) { return { k: 'h', t: h.t }; }));
      out.push(ui.section('How it went', Z.howItWent(ui, { total: t, ev: marks, line: line, max: N, unit: 'arrows', endOk: won, names: { x: 'Bump' } }), { icon: 'chart' }));
    }
    return ui.section('Level ' + lv, ui.el('div', { class: 'ajh' }, out), { icon: 'star' });
  });

  // ── The board and its replay ─────────────────────────────────────────────
  function replayer(ui, L, lv, ev, E, nm, won, d) {
    var N = L.a.length;
    // a board on its side when the screen is a phone held sideways, as the game shows it
    var rot = window.innerWidth > window.innerHeight && window.innerHeight < 560 && L.h > L.w;
    var dw = rot ? L.h : L.w, dh = rot ? L.w : L.h, ratio = (dw + 2 * MG) / (dh + 2 * MG);
    var maxW = rot ? 'min(62%, 440px, calc(64vh * ' + ratio.toFixed(3) + '))' : 'min(100%, 330px, calc(56vh * ' + ratio.toFixed(3) + '))';
    var root = ui.el('div', { class: 'ajh' + (rot ? ' side' : ''), style: { '--ajw': maxW } });

    // counters
    var hearts = ui.el('div', { class: 'ajh-hearts', role: 'img' }), hEls = [];
    for (var h = 0; h < 3; h++) { var he = ui.el('span', { class: 'ajh-ht', html: '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="bg" d="' + HEART + '"/><path class="fg" d="' + HEART + '"/></svg>' }); hEls.push(he); hearts.appendChild(he); }
    var leftB = ui.el('b'), prog = ui.el('i');
    root.appendChild(ui.el('div', { class: 'ajh-hud' }, [hearts, ui.el('div', { class: 'ajh-left' }, [ui.el('small', { text: 'Arrows left' }), leftB]), ui.el('div', { class: 'ajh-prog', 'aria-hidden': 'true' }, [prog])]));

    // the board
    var svgEl = sv('svg', { viewBox: (-MG) + ' ' + (-MG) + ' ' + (dw + 2 * MG) + ' ' + (dh + 2 * MG), role: 'img', 'aria-label': 'Level ' + lv + ', the board' });
    var rotG = sv('g', rot ? { transform: 'translate(' + L.h + ' 0) rotate(90)' } : {}, svgEl);
    var wells = sv('g', {}, rotG);
    for (var c = 0; c < L.w * L.h; c++) if (!L.m || L.m.charAt(c) === '1') sv('rect', { class: 'well', x: (c % L.w) + 0.07, y: Math.floor(c / L.w) + 0.07, width: 0.86, height: 0.86, rx: 0.2, 'data-c': c }, wells);
    var under = sv('g', {}, rotG), arrows = sv('g', {}, rotG), fx = sv('g', {}, rotG);
    var felt = ui.el('div', { class: 'ajh-felt' }); felt.appendChild(svgEl);
    var tray = ui.el('div', { class: 'ajh-tray' }, [felt]);
    root.appendChild(tray);

    function cx(c) { return c % L.w + 0.5; }
    function cy(c) { return Math.floor(c / L.w) + 0.5; }
    function occOf(gone) { var o = new Int16Array(L.w * L.h).fill(-1); L.a.forEach(function (a, i) { if (gone && gone[i]) return; for (var k = 1; k < a.length; k++) o[a[k]] = i; }); return o; }
    function rayOf(a) { var hd = a[a.length - 1], x = hd % L.w, y = (hd - x) / L.w, dd = a[0], r = []; for (;;) { x += DX[dd]; y += DY[dd]; if (x < 0 || y < 0 || x >= L.w || y >= L.h) break; r.push(y * L.w + x); } return r; }
    // each arrow's colors, chosen as the game chooses them, so the replay shows the same board
    var occ = occOf(null), col = [];
    var A = L.a.map(function (a, i) {
      var dd = a[0], cells = a.slice(1), n = cells.length, used = {};
      cells.forEach(function (c) { var x = c % L.w, y = (c - x) / L.w; for (var k = 0; k < 4; k++) { var nx = x + DX[k], ny = y + DY[k]; if (nx < 0 || ny < 0 || nx >= L.w || ny >= L.h) continue; var j = occ[ny * L.w + nx]; if (j >= 0 && j < i && col[j] != null) used[col[j]] = 1; } });
      var start = (i * 5 + lv * 3) % PAL.length, pc = start;
      for (var t = 0; t < PAL.length; t++) { var q = (start + t) % PAL.length; if (!used[q]) { pc = q; break; } }
      col[i] = pc;
      var pts = [], hx = cx(cells[n - 1]), hy = cy(cells[n - 1]), ray = rayOf(a);
      if (n > 1) pts.push([2 * cx(cells[0]) - cx(cells[1]), 2 * cy(cells[0]) - cy(cells[1])]); else pts.push([hx - DX[dd], hy - DY[dd]]);
      cells.forEach(function (c) { pts.push([cx(c), cy(c)]); });
      for (var k = 1; k <= ray.length + n + 4; k++) pts.push([hx + DX[dd] * k, hy + DY[dd] * k]);
      var g = sv('g', { class: 'ajh-a', style: '--c:' + PAL[pc][0] + ';--c2:' + PAL[pc][1] }, arrows);
      function mk(cls, w, hw, dy) { var gg = sv('g', { class: cls, transform: dy ? 'translate(0 ' + dy + ')' : '' }, g); return { s: sv('path', { 'stroke-width': w }, gg), h: sv('path', { class: 'h', 'stroke-width': hw }, gg) }; }
      var r = { i: i, d: dd, n: n, pts: pts, ray: ray, cells: cells, g: g, color: PAL[pc][0] };
      r.halo = mk('halo', 0.56, 0.36, 0.02); r.sh = mk('sh', 0.34, 0.14, 0.11); r.sd = mk('sd', 0.34, 0.14, 0.065); r.tp = mk('tp', 0.34, 0.14, 0);
      r.gl = sv('path', { class: 'gl', 'stroke-width': 0.085, transform: 'translate(0 -0.05)' }, g);
      paint(r, 0);
      return r;
    });
    function at(r, s) { var p = r.pts, j = Math.floor(s) + 1; if (j < 0) j = 0; if (j > p.length - 2) j = p.length - 2; var f = s + 1 - j; return [p[j][0] + (p[j + 1][0] - p[j][0]) * f, p[j][1] + (p[j + 1][1] - p[j][1]) * f]; }
    function lineD(r, s0, s1) {
      var q = [at(r, s0)];
      for (var k = Math.floor(s0) + 1; k < s1; k++) q.push(r.pts[k + 1]);
      q.push(at(r, s1));
      var dd = 'M' + f2(q[0][0]) + ' ' + f2(q[0][1]);
      for (var i = 1; i < q.length - 1; i++) {
        var a = q[i - 1], b = q[i], cc = q[i + 1], ux = b[0] - a[0], uy = b[1] - a[1], vx = cc[0] - b[0], vy = cc[1] - b[1], la = Math.hypot(ux, uy), lc = Math.hypot(vx, vy);
        if (la < 1e-6 || lc < 1e-6 || Math.abs(ux * vy - uy * vx) < 1e-6) { dd += 'L' + f2(b[0]) + ' ' + f2(b[1]); continue; }
        var rr = Math.min(0.42, la / 2, lc / 2);
        dd += 'L' + f2(b[0] - ux / la * rr) + ' ' + f2(b[1] - uy / la * rr) + 'Q' + f2(b[0]) + ' ' + f2(b[1]) + ' ' + f2(b[0] + vx / lc * rr) + ' ' + f2(b[1] + vy / lc * rr);
      }
      return dd + 'L' + f2(q[q.length - 1][0]) + ' ' + f2(q[q.length - 1][1]);
    }
    function paint(r, t) {
      var tail = t - (r.n === 1 ? 0.3 : 0.1), hsx = t + r.n - 1, H = at(r, hsx), ux = DX[r.d], uy = DY[r.d];
      var sd = lineD(r, tail, hsx + 0.02), b0 = [H[0] - ux * 0.05, H[1] - uy * 0.05], tip = [H[0] + ux * 0.27, H[1] + uy * 0.27], w = 0.23;
      var hd = 'M' + f2(tip[0]) + ' ' + f2(tip[1]) + 'L' + f2(b0[0] - uy * w) + ' ' + f2(b0[1] + ux * w) + 'L' + f2(b0[0] + uy * w) + ' ' + f2(b0[1] - ux * w) + 'Z';
      [r.halo, r.sh, r.sd, r.tp].forEach(function (p) { p.s.setAttribute('d', sd); p.h.setAttribute('d', hd); });
      r.gl.setAttribute('d', lineD(r, tail + 0.12, hsx - 0.06 < tail + 0.14 ? tail + 0.2 : hsx - 0.06));
    }
    function headPt(r, k) { var hd = r.pts[r.n]; return [hd[0] + DX[r.d] * k, hd[1] + DY[r.d] * k]; }
    // how many clear cells lie between an arrow's head and the arrow in its way
    function gapTo(r, by) { for (var k = 0; k < r.ray.length; k++) if (L.a[by].indexOf(r.ray[k], 1) > 0) return k; return 0; }
    function wayLine(r, color, parent) { var a = headPt(r, 0.45), b = headPt(r, r.ray.length + 0.5); return sv('path', { class: 'ajh-way', stroke: color, d: 'M' + f2(a[0]) + ' ' + f2(a[1]) + 'L' + f2(b[0]) + ' ' + f2(b[1]) }, parent); }
    function burst(p, parent) {
      var g = sv('g', { transform: 'translate(' + f2(p[0]) + ' ' + f2(p[1]) + ')' }, parent), s = '';
      for (var k = 0; k < 8; k++) { var a = k * Math.PI / 4, r1 = k % 2 ? 0.13 : 0.18, r2 = k % 2 ? 0.27 : 0.38; s += 'M' + f2(Math.cos(a) * r1) + ' ' + f2(Math.sin(a) * r1) + 'L' + f2(Math.cos(a) * r2) + ' ' + f2(Math.sin(a) * r2); }
      sv('path', { d: s, stroke: '#ff4d5e', 'stroke-width': 0.075, 'stroke-linecap': 'round', fill: 'none' }, g);
      sv('circle', { r: 0.08, fill: '#fff' }, g);
      return g;
    }

    // controls
    var playB = ui.el('button', { type: 'button', class: 'ajh-play', 'aria-label': 'Play the replay', html: ui.icon('play') });
    var rng = ui.el('input', { type: 'range', min: '0', max: String(E), value: '0', 'aria-label': 'Step through the level' });
    var ck = ui.el('span', { class: 'ck', text: '0:00' });
    var cap = ui.el('p', { class: 'ajh-cap', role: 'status' });
    root.appendChild(ui.el('div', { class: 'ajh-ctl' }, [playB, rng, ck]));
    root.appendChild(cap);

    // the state after the first k events
    function stateAt(k) {
      var gone = {}, left = N, lost = 0;
      for (var j = 0; j < k; j++) { var x = ev[j]; if (x.k === 'go') { gone[x.i] = true; left--; } else if (x.k === 'bump') lost++; }
      return { gone: gone, left: left, lost: lost };
    }
    function timeAt(k) { for (var j = k - 1; j >= 0; j--) if (ev[j].t != null) return ev[j].t; return 0; }
    function counters(stt, anim) {
      leftB.textContent = String(stt.left);
      prog.style.setProperty('--p', ((N - stt.left) / N).toFixed(3));
      hEls.forEach(function (he, j) {
        var off = j >= 3 - stt.lost;
        if (!off) { he.classList.remove('off', 'lose'); return; }
        if (anim && !he.classList.contains('off') && !he.classList.contains('lose')) { he.classList.add('lose'); setTimeout(function () { if (he.classList.contains('lose')) { he.classList.remove('lose'); he.classList.add('off'); } }, 700); }
        else if (!anim) { he.classList.remove('lose'); he.classList.add('off'); }
      });
      hearts.setAttribute('aria-label', plural(3 - stt.lost, 'heart') + ' left');
    }
    function caption(k) {
      if (!k) return 'This is level ' + lv + ' as it started, with ' + N + ' arrows on the board.';
      var x = ev[k - 1];
      if (x.k === 'hint') return nm + ' used a hint, which lit an arrow that could leave right then.';
      if (x.k === 'bump') {
        var lost = stateAt(k).lost;
        return nm + ' tapped an arrow with another one in its way. The two bumped, and ' + (lost >= 3 ? 'that was the last heart.' : 'a heart went, leaving ' + plural(3 - lost, 'heart') + '.');
      }
      var no = N - stateAt(k).left;
      if (no === N) return 'Arrow ' + no + ' of ' + N + ' slides off, and the board is clear.';
      return 'Arrow ' + no + ' of ' + N + ' slides off the board.' + (x.run >= 3 ? ' That makes ' + x.run + ' in a row.' : '');
    }
    // draw step k at rest: what has left is gone, and the step just taken is marked where it happened
    var cur = 0;
    function still(k) {
      stopAnim();
      cur = k;
      var stt = stateAt(k);
      A.forEach(function (r) { r.g.style.display = stt.gone[r.i] ? 'none' : ''; r.g.style.opacity = ''; r.g.removeAttribute('transform'); r.g.classList.remove('hint', 'hit', 'blk', 'flash', 'dim'); paint(r, 0); });
      under.innerHTML = ''; fx.innerHTML = '';
      var x = k ? ev[k - 1] : null;
      if (x && x.k === 'go') {
        var r = A[x.i];   // where it lay, faint, and the way it went
        sv('path', { d: lineD(r, r.n === 1 ? -0.3 : -0.1, r.n - 1 + 0.02), stroke: r.color, 'stroke-width': 0.3, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', fill: 'none', opacity: 0.28 }, under);
        wayLine(r, r.color, under);
      } else if (x && x.k === 'bump') {
        var rb = A[x.i], bl = A[x.by], gp = gapTo(rb, x.by);
        rb.g.classList.add('hit'); if (bl) bl.g.classList.add('blk');
        if (gp > 0) { var a0 = headPt(rb, 0.45), a1 = headPt(rb, gp + 0.3); sv('path', { class: 'ajh-way', stroke: '#ff4d5e', d: 'M' + f2(a0[0]) + ' ' + f2(a0[1]) + 'L' + f2(a1[0]) + ' ' + f2(a1[1]) }, under); }
        burst(headPt(rb, gp + 0.55), fx);
      } else if (x && x.k === 'hint') {
        A[x.i].g.classList.add('hint'); wayLine(A[x.i], '#ffd34d', under);
      }
      counters(stt, false);
      rng.value = String(k);
      ck.textContent = clock(timeAt(k));
      cap.textContent = caption(k);
    }

    // ── motion: the arrows in flight, one frame loop ──
    var flying = [], raf = 0, timer = 0, playing = false;
    function stopAnim() { cancelAnimationFrame(raf); raf = 0; flying = []; clearTimeout(timer); timer = 0; }
    function frame(now) {
      raf = 0;
      flying = flying.filter(function (m) {
        var u = Math.min(1, (now - m.t0) / m.dur), r = m.r;
        if (m.kind === 'go') {
          var p = m.last ? u * u * u * 0.6 + u * 0.4 : 0.22 * u + 0.78 * u * u, t = p * m.dist;
          paint(r, t);
          var tl = Math.max(-0.2, t - 3.2);
          if (t - 0.15 > tl) m.trail.setAttribute('d', lineD(r, tl, t - 0.15));
          var past = t - (r.n - 1 + r.ray.length + 0.6);
          r.g.style.opacity = past > 0 ? Math.max(0, 1 - past / 1.6).toFixed(3) : '';
          if (u >= 1) { r.g.style.display = 'none'; r.g.style.opacity = ''; paint(r, 0); var tr = m.trail; tr.style.transition = 'opacity .35s'; tr.style.opacity = '0'; setTimeout(function () { tr.remove(); }, 400); return false; }
        } else {
          var e = now - m.t0, t2;
          if (e < m.fwd) { var a = e / m.fwd; t2 = m.gap * a * a; }
          else {
            if (!m.hit) {
              m.hit = true; r.g.classList.add('hit', 'flash'); if (m.bl) m.bl.g.classList.add('blk', 'flash');
              burst(headPt(r, m.gap + 0.55 - 0.36), fx);
              tray.classList.remove('shake'); void tray.offsetWidth; tray.classList.add('shake');
              counters(m.stt, true);
              if (window.Kit && Kit.haptic) Kit.haptic('light');
            }
            var cc = Math.min(1, (e - m.fwd) / m.back); t2 = m.gap * Math.pow(1 - cc, 3) + Math.sin(cc * Math.PI * 3) * 0.06 * (1 - cc);
          }
          paint(r, Math.max(0, t2));
          if (u >= 1) { paint(r, 0); return false; }
        }
        return true;
      });
      if (flying.length) raf = requestAnimationFrame(frame);
    }
    function launch(m) { m.t0 = performance.now(); flying.push(m); if (!raf) raf = requestAnimationFrame(frame); }
    // take step cur -> cur + 1 with its motion; returns how long to wait before the next one
    function stepOn() {
      var x = ev[cur], k = cur + 1, stt = stateAt(k), r = A[x.i];
      A.forEach(function (q) { q.g.classList.remove('hint', 'hit', 'blk', 'flash'); });
      under.innerHTML = ''; [].slice.call(fx.querySelectorAll('g')).forEach(function (g) { g.remove(); });
      cur = k; rng.value = String(k); ck.textContent = clock(timeAt(k)); cap.textContent = caption(k);
      var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (x.k === 'go') {
        var last = stt.left === 0, dist = r.n - 1 + r.ray.length + 2.6;
        var m = { kind: 'go', r: r, last: last, dist: dist, dur: reduce ? 200 : (last ? 600 : 230) + dist * (last ? 28 : 13) };
        m.trail = sv('path', { stroke: r.color, 'stroke-width': 0.2, opacity: 0.5, fill: 'none', 'stroke-linecap': 'round' }, fx);
        launch(m);
        counters(stt, true);
        if (last && won) setTimeout(wave, 300);
      } else if (x.k === 'bump') {
        var gp = gapTo(r, x.by) + 0.36;
        launch({ kind: 'bump', r: r, bl: A[x.by], gap: gp, fwd: 70 + gp * 30, back: 300, dur: 370 + gp * 30, stt: stt });
        return 1100;
      } else {
        r.g.classList.add('hint'); wayLine(r, '#ffd34d', under);
        return 900;
      }
      // the next arrow follows in the level's own rhythm, sped up: a quick run plays quickly, a long think briefly
      var nx = ev[k];
      if (!nx) return 0;
      if (x.t != null && nx.t != null) return Math.max(120, Math.min(650, (nx.t - x.t) * 1000 * 0.3));
      return 260;
    }
    function wave() {
      var mx = L.w / 2, my = L.h / 2;
      [].forEach.call(wells.querySelectorAll('.well'), function (w) { var c = +w.getAttribute('data-c'); w.style.animationDelay = Math.round(Math.hypot(c % L.w + 0.5 - mx, Math.floor(c / L.w) + 0.5 - my) * 45) + 'ms'; w.classList.remove('lit'); void w.getBoundingClientRect(); w.classList.add('lit'); });
    }
    function setPlaying(on) {
      playing = on;
      playB.innerHTML = ui.icon(on ? 'pause' : 'play');
      playB.setAttribute('aria-label', on ? 'Pause the replay' : 'Play the replay');
    }
    function tickPlay() {
      timer = 0;
      if (!playing) return;
      if (cur >= E) { setPlaying(false); return; }
      if (!root.isConnected) { setPlaying(false); stopAnim(); return; }
      var wait = stepOn();
      if (cur >= E) { timer = setTimeout(function () { setPlaying(false); }, 900); return; }
      timer = setTimeout(tickPlay, wait);
    }
    playB.addEventListener('click', function () {
      if (window.Kit && Kit.sfx) Kit.sfx('tap');
      if (playing) { setPlaying(false); clearTimeout(timer); timer = 0; return; }
      if (cur >= E) still(0);
      setPlaying(true);
      timer = setTimeout(tickPlay, cur ? 60 : 380);
    });
    rng.addEventListener('input', function () { setPlaying(false); still(+rng.value); });
    still(0);
    return root;
  }
})();
