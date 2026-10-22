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

  // ── Shared pieces for the puzzle and word views (words.js and the mazes view use them through HistView._pz) ──
  // Events a game keeps while you play, as one string: 'h35 x80 c120' = a hint at 0:35, a wrong try at 1:20, a check at 2:00
  var EVK = { h: ['#f5c542', 'Hint'], x: ['#f0645a', 'Wrong try'], c: ['#7cb4ff', 'Check'], s: ['#5ad17a', 'Found'], u: ['#c4a0ff', 'Undo'] };
  function evList(ev) {
    return String(ev || '').split(' ').map(function (x) { var k = x.charAt(0), t = +x.slice(1); return EVK[k] && !isNaN(t) ? { k: k, t: t } : null; }).filter(Boolean);
  }
  function evMark(k, x, y, r) {
    var c = EVK[k] ? EVK[k][0] : '#fff';
    if (k === 'x') return '<path d="M' + f2(x - r) + ' ' + f2(y - r) + 'L' + f2(x + r) + ' ' + f2(y + r) + 'M' + f2(x + r) + ' ' + f2(y - r) + 'L' + f2(x - r) + ' ' + f2(y + r) + '" stroke="' + c + '" stroke-width="2.6" stroke-linecap="round"/>';
    if (k === 'c') return '<path d="M' + f2(x) + ' ' + f2(y - r - 1) + 'L' + f2(x + r + 1) + ' ' + f2(y) + 'L' + f2(x) + ' ' + f2(y + r + 1) + 'L' + f2(x - r - 1) + ' ' + f2(y) + 'Z" fill="' + c + '"/>';
    if (k === 'h') return '<circle cx="' + f2(x) + '" cy="' + f2(y) + '" r="' + r + '" fill="' + c + '"/><path d="M' + f2(x - r * .45) + ' ' + f2(y + r + 2) + 'h' + f2(r * .9) + '" stroke="' + c + '" stroke-width="1.6" stroke-linecap="round"/>';
    return '<circle cx="' + f2(x) + '" cy="' + f2(y) + '" r="' + (r - 1) + '" fill="' + c + '"/>';
  }
  // A time line of the game: the clock along the bottom, each hint / wrong try / check where it happened,
  // and (o.line: [[sec, value], ...]) how far along the puzzle was. o: {total, ev, line, max, unit, lim, end: 'Solved', endOk}
  function howItWent(ui, o) {
    var marks = Array.isArray(o.ev) ? o.ev : evList(o.ev), line = o.line || [], total = Math.max(1, Number(o.total) || 0);
    marks.concat(line.map(function (p) { return { t: p[0] }; })).forEach(function (m) { if (m.t > total) total = m.t; });
    if (o.lim && o.lim > total) total = o.lim;
    var W = 320, pl = 8, pr = 8, hasL = line.length > 1, top = 16, track = hasL ? 92 : 30, H = track + 26;
    var x = function (t) { return pl + Math.max(0, Math.min(1, t / total)) * (W - pl - pr); };
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="How it went">';
    // minute ticks
    var step = [15, 30, 60, 120, 300, 600, 900, 1800, 3600].filter(function (v) { return total / v <= 7; })[0] || 3600;
    for (var t = step; t < total - step * 0.3; t += step) s += '<line x1="' + f2(x(t)) + '" x2="' + f2(x(t)) + '" y1="' + (top - 4) + '" y2="' + track + '" stroke="rgba(255,255,255,.08)"/>';
    s += '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + track + '" y2="' + track + '" stroke="rgba(255,255,255,.28)" stroke-width="1.5"/>';
    if (hasL) {
      var mx = o.max || Math.max.apply(null, line.map(function (p) { return p[1]; })) || 1, y = function (v) { return track - 4 - (v / mx) * (track - 4 - top); };
      var d = 'M' + f2(x(0)) + ' ' + f2(y(0)), prev = 0;
      line.forEach(function (p) { d += 'L' + f2(x(p[0])) + ' ' + f2(y(prev)) + 'L' + f2(x(p[0])) + ' ' + f2(y(p[1])); prev = p[1]; });
      var last = line[line.length - 1];
      s += '<defs><linearGradient id="hvtlg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#5ad17a" stop-opacity=".38"/><stop offset="1" stop-color="#5ad17a" stop-opacity="0"/></linearGradient></defs>';
      s += '<path d="' + d + 'L' + f2(x(last[0])) + ' ' + (track - 4) + 'L' + f2(x(0)) + ' ' + (track - 4) + 'Z" fill="url(#hvtlg)"/>';
      s += '<path d="' + d + '" fill="none" stroke="#5ad17a" stroke-width="2.2" stroke-linejoin="round"/>';
      s += '<circle cx="' + f2(x(last[0])) + '" cy="' + f2(y(last[1])) + '" r="3.6" fill="#5ad17a" stroke="#fff" stroke-width="1.4"/>';
      s += '<text x="' + pl + '" y="' + (top - 5) + '" font-size="9.5" font-weight="800" fill="rgba(255,255,255,.55)" font-family="system-ui,sans-serif">' + ui.esc(mx + (o.unit ? ' ' + o.unit : '')) + '</text>';
    }
    if (o.lim) s += '<line x1="' + f2(x(o.lim)) + '" x2="' + f2(x(o.lim)) + '" y1="' + (top - 6) + '" y2="' + (track + 4) + '" stroke="#f0645a" stroke-dasharray="3 3" stroke-width="1.4"/><text x="' + f2(x(o.lim) - 3) + '" y="' + (top - 5) + '" text-anchor="end" font-size="9.5" font-weight="800" fill="#f0645a" font-family="system-ui,sans-serif">time limit</text>';
    // the marks sit on the track; ones close together stack upwards
    var lastX = {}, row = 0;
    marks.slice().sort(function (a, b) { return a.t - b.t; }).forEach(function (m) {
      var mx2 = x(m.t), k = Math.round(mx2 / 9);
      row = lastX[k] || 0; lastX[k] = row + 1; lastX[k - 1] = Math.max(lastX[k - 1] || 0, row + 1); lastX[k + 1] = Math.max(lastX[k + 1] || 0, row + 1);
      s += evMark(m.k, mx2, track - 7 - row * 11, 3.6);
    });
    // the end: a little flag
    var ex = x(Number(o.total) || total), ok = o.endOk !== false;
    s += '<path d="M' + f2(ex) + ' ' + (track + 1) + 'V' + (track - 15) + '" stroke="' + (ok ? '#5ad17a' : '#9aa1b2') + '" stroke-width="1.6"/><path d="M' + f2(ex) + ' ' + (track - 15) + 'l' + (ex > W - 20 ? -9 : 9) + ' 3.5l' + (ex > W - 20 ? 9 : -9) + ' 3.5z" fill="' + (ok ? '#5ad17a' : '#9aa1b2') + '"/>';
    s += '<text x="' + pl + '" y="' + (H - 6) + '" font-size="10" font-weight="800" fill="rgba(255,255,255,.55)" font-family="system-ui,sans-serif">0:00</text>';
    s += '<text x="' + (W - pr) + '" y="' + (H - 6) + '" text-anchor="end" font-size="10" font-weight="800" fill="rgba(255,255,255,.75)" font-family="system-ui,sans-serif">' + ui.esc((o.end ? o.end + ' · ' : '') + sec(o.total || total)) + '</text>';
    s += '</svg>';
    var used = {}; marks.forEach(function (m) { used[m.k] = (used[m.k] || 0) + 1; });
    var key = ui.el('div', { class: 'hv-tlk' });
    Object.keys(EVK).forEach(function (k) { if (used[k]) key.appendChild(ui.el('span', { html: '<svg viewBox="-6 -6 12 14" width="12" height="13" aria-hidden="true">' + evMark(k, 0, 0, 3.6) + '</svg>' + ui.esc((o.names && o.names[k]) || EVK[k][1]) + (used[k] > 1 ? ' ×' + used[k] : '') })); });
    return ui.el('div', { class: 'hv-tl' }, [ui.el('div', { class: 'hv-tlw', html: s }), key.children.length ? key : null]);
  }
  // Columns, one per question / word / riddle: list = [{v, c: colour, lab}], o: {unit:'s', avg:true}
  function columns(ui, list, o) {
    o = o || {}; if (!list.length) return null;
    var W = 320, H = 108, pl = 4, pr = 4, top = 16, base = H - 18, n = list.length, gap = n > 24 ? 1.5 : 3, cw = (W - pl - pr - gap * (n - 1)) / n;
    var mx = Math.max.apply(null, list.map(function (x) { return x.v || 0; }).concat([1])), s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + ui.esc(o.aria || 'Chart') + '">';
    var hi = 0; list.forEach(function (x, i) { if ((x.v || 0) > (list[hi].v || 0)) hi = i; });
    list.forEach(function (x, i) {
      var h = Math.max(2, (x.v || 0) / mx * (base - top)), xx = pl + i * (cw + gap);
      s += '<rect x="' + f2(xx) + '" y="' + f2(base - h) + '" width="' + f2(cw) + '" height="' + f2(h) + '" rx="' + f2(Math.min(3, cw / 3)) + '" fill="' + (x.c || '#7cb4ff') + '"' + (x.dim ? ' opacity=".45"' : '') + '/>';
      if (n <= 14 || i === hi) s += '<text x="' + f2(xx + cw / 2) + '" y="' + f2(base - h - 3) + '" text-anchor="middle" font-size="9" font-weight="800" fill="rgba(255,255,255,.8)" font-family="system-ui,sans-serif">' + ui.esc((x.top != null ? x.top : x.v) + (o.unit || '')) + '</text>';
      if (n <= 20 || (i + 1) % 5 === 0 || i === 0) s += '<text x="' + f2(xx + cw / 2) + '" y="' + (H - 5) + '" text-anchor="middle" font-size="9" font-weight="800" fill="rgba(255,255,255,.5)" font-family="system-ui,sans-serif">' + ui.esc(x.lab != null ? x.lab : i + 1) + '</text>';
    });
    if (o.avg) {
      var vals = list.filter(function (x) { return x.v != null; }), av = vals.reduce(function (a, x) { return a + x.v; }, 0) / Math.max(1, vals.length), ay = base - av / mx * (base - top);
      s += '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + f2(ay) + '" y2="' + f2(ay) + '" stroke="rgba(255,255,255,.4)" stroke-dasharray="4 4"/>';
    }
    s += '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + base + '" y2="' + base + '" stroke="rgba(255,255,255,.25)"/></svg>';
    return ui.el('div', { class: 'hv-tl' }, [ui.el('div', { class: 'hv-tlw', html: s })]);
  }
  // A strip of small numbered squares, one per step; tap one to show it. items = [{t, c: 'ok'|'no'|'half'|'gold', title}]
  function strip(ui, items, start, show) {
    var box = ui.el('div', { class: 'hv-road' }), btns = [];
    items.forEach(function (it, i) {
      var b = ui.el('button', { type: 'button', class: 'hv-rb ' + (it.c || ''), text: it.t != null ? String(it.t) : String(i + 1), title: it.title || '', 'aria-label': it.title || String(i + 1), onclick: function () { pick(i); } });
      btns.push(b); box.appendChild(b);
    });
    function pick(i) { btns.forEach(function (b, j) { b.classList.toggle('on', i === j); }); show(i); }
    if (items.length) pick(Math.max(0, Math.min(items.length - 1, start)));
    return box;
  }
  // run fn once the node is on screen (pictures that measure themselves, like the mysteries photo)
  function whenShown(node, fn) {
    var n = 0;
    (function look() { if (node.isConnected && node.getBoundingClientRect().width > 0) { try { fn(); } catch (e) { console.warn('[hist]', e); } return; } if (++n < 300) requestAnimationFrame(look); })();
  }
  // load a game's data files on a page that doesn't have them (in order, once)
  var loaded = {};
  function loadScripts(list) {
    var base = ''; try { base = new URL('.', document.querySelector('script[src*="hist-view.js"]').src).href; } catch (e) {}
    return list.reduce(function (p, src) {
      return p.then(function () {
        return loaded[src] || (loaded[src] = new Promise(function (res) { var sc = document.createElement('script'); sc.src = base + src; sc.onload = sc.onerror = function () { res(); }; document.head.appendChild(sc); }));
      });
    }, Promise.resolve());
  }
  HistView._pz = { evList: evList, howItWent: howItWent, columns: columns, strip: strip, whenShown: whenShown, sec: sec };
  HistView.css('hv-puzzle', [
    '.hv-replay{display:flex;flex-direction:column;gap:6px;}.hv-range{width:100%;accent-color:var(--yellow);}.hv-replay b{font-size:.85rem;color:var(--text-2);}',
    '.hv-pz-note{margin:0;font-size:.8rem;color:var(--text-3);font-weight:700;text-align:center;}',
    // time line / columns / tap strip
    '.hv-tl{display:flex;flex-direction:column;gap:6px;padding:10px 10px 8px;border-radius:12px;background:linear-gradient(180deg,#1b2030,#141826);box-shadow:inset 0 0 0 1px rgba(255,255,255,.06);}',
    '.hv-tlw{line-height:0;}.hv-tlw svg{width:100%;height:auto;display:block;}',
    '.hv-tlk{display:flex;flex-wrap:wrap;gap:3px 12px;font-size:.7rem;font-weight:800;color:rgba(255,255,255,.65);}',
    '.hv-tlk span{display:inline-flex;align-items:center;gap:4px;}',
    '.hv-road{display:flex;flex-wrap:wrap;gap:4px;}',
    '.hv-rb{appearance:none;border:0;cursor:pointer;min-width:26px;height:26px;border-radius:6px;padding:0 4px;font:inherit;font-size:.7rem;font-weight:900;color:#fff;background:rgba(255,255,255,.12);font-variant-numeric:tabular-nums;}',
    '.hv-rb.ok{background:#1f9d55;}.hv-rb.no{background:#b91c1c;}.hv-rb.half{background:#b7791f;}.hv-rb.gold{background:#d4a017;color:#1b1404;}.hv-rb.skip{background:#4b5263;}',
    '.hv-rb.on{outline:2.5px solid #fff;outline-offset:1px;}',
    // 2048 climb
    '.hv-climb{display:flex;flex-wrap:wrap;gap:8px 6px;}',
    '.hv-climb span{display:flex;flex-direction:column;align-items:center;gap:3px;font-size:.7rem;font-weight:800;color:var(--text-3);}',
    '.hv-climb i{display:grid;place-items:center;width:42px;height:42px;border-radius:8px;font-style:normal;font-weight:900;font-size:.9rem;box-shadow:0 3px 0 var(--e),0 4px 8px rgba(0,0,0,.4);background:linear-gradient(180deg,var(--a),var(--b));color:var(--k);}',
    // memory match cards
    '.hv-mm{position:relative;overflow:hidden;display:grid;gap:5px;padding:10px;border-radius:14px;align-self:center;width:100%;max-width:360px;box-sizing:border-box;}',
    '.hv-mm .c{position:relative;aspect-ratio:3/4;border-radius:7px;background:linear-gradient(170deg,#fffdf6,#efe6d2);box-shadow:0 2px 0 #b9a98a,0 3px 6px rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;text-align:center;padding:3px;overflow:hidden;}',
    '.hv-mm .c span{font-size:.62rem;line-height:1.1;font-weight:900;color:#3a2a4a;overflow-wrap:anywhere;}',
    '.hv-mm .c i{position:absolute;left:0;right:0;bottom:0;height:7px;background:var(--pc);}',
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
    // squares filled before the order was kept (an old saved game) start out filled
    var inOrd = {}; ord.forEach(function (i) { inOrd[i] = 1; });
    var base = given.map(function (g, i) { return g || (inOrd[i] ? 0 : vals[i]); });
    if (ord.length > 4) {
      var fill = ui.el('div', { class: 'hv-snap f-paper', style: { 'max-width': '320px', padding: '6px' } });
      out.push(ui.section('How you filled it in', [fill, replay(ui, fill, ord.length, Math.min(ord.length, Math.round(ord.length / 2)), function (m) {
        var v = base.slice(); for (var j = 0; j < m; j++) v[ord[j]] = vals[ord[j]];
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
      box.appendChild(ui.el('div', { class: 'c', style: { '--pc': solo ? 'transparent' : ui.color(+o) } }, [ui.el('span', { text: nm }), rank[ch] ? ui.el('em', { text: String(rank[ch]) }) : null, solo ? null : ui.el('i')]));
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
    var ks = Object.keys(kinds); if (ks.length > 1 && ks.some(function (k) { return kinds[k].n > 1; })) out.push(ui.section('By kind', ui.bars(ks.map(function (k) { return { label: k, value: Math.round(100 * kinds[k].ok / kinds[k].n), max: 100, color: '#7ee2a0', text: kinds[k].ok + ' / ' + kinds[k].n }; }))));
    out.push(ui.facts([['Mode', (MP_MODES[e.modeId] || '') + (e.modeId === 'timed' && e.secs ? ' · ' + (e.secs / 60) + ' min' : '')]]));
    return ui.wrap(out);
  });
  // ── Candy Match: the run as a level path (stars and score on each), then the specials made ──
  HistView.css('hv-candy', [
    '.hv-cm{display:flex;flex-wrap:wrap;gap:10px 6px;justify-content:center;padding:12px 8px;border-radius:14px;',
    'background:radial-gradient(120% 100% at 50% 0%,#ffe1f0,#f7b6d6 60%,#e98bbb);box-shadow:inset 0 0 0 2px rgba(255,255,255,.6),0 6px 16px -8px rgba(0,0,0,.5);}',
    '.hv-cm span{display:flex;flex-direction:column;align-items:center;gap:2px;width:52px;}',
    '.hv-cm i{display:grid;place-items:center;width:38px;height:38px;border-radius:50%;font-style:normal;font-weight:900;font-size:.95rem;color:#fff;',
    'background:radial-gradient(circle at 35% 30%,#ff9ccc,#e8338a 55%,#a3145c);box-shadow:0 3px 0 #7a0f45,0 4px 8px rgba(0,0,0,.3),inset 0 2px 0 rgba(255,255,255,.5);}',
    '.hv-cm span.no i{background:radial-gradient(circle at 35% 30%,#d9d0dc,#9a8ca0 60%,#6c6072);box-shadow:0 3px 0 #4a4050,0 4px 8px rgba(0,0,0,.3);}',
    '.hv-cm .s{display:flex;gap:1px;}.hv-cm .s .ico{width:13px;height:13px;color:rgba(122,15,69,.3);}.hv-cm .s .ico.on{color:#e0a300;fill:#ffc928;filter:drop-shadow(0 1px 0 #a36b00);}',
    '.hv-cm small{font-size:.66rem;font-weight:900;color:#7a0f45;font-variant-numeric:tabular-nums;}',
    '.hv-cm span.no small{color:#5a4a60;}'
  ].join(''));
  function candyStars(ui, n) { var b = ui.el('div', { class: 's' }); for (var k = 1; k <= 3; k++) { var x = ui.el('span', { html: ui.icon('star') }).firstChild; if (k <= n) x.classList.add('on'); b.appendChild(x); } return b; }
  R('candymatch', function (e, ui) {
    var d = e.dt; if (!d || (d.lv == null && d.n == null)) return null;
    var el = ui.el, out = [], path = el('div', { class: 'hv-cm' });
    if (d.lv != null) {
      String(d.lv).split(',').filter(Boolean).forEach(function (t) {
        var q = t.split(':').map(Number), won = q.length > 3 ? !!q[3] : q[2] > 0;
        path.appendChild(el('span', { class: won ? '' : 'no', title: 'Level ' + q[0] + (won ? '' : ': out of moves') }, [el('i', { text: String(q[0]) }), won ? candyStars(ui, q[2]) : el('div', { class: 's', text: '' }), el('small', { text: (q[1] || 0).toLocaleString('en-US') })]));
      });
      out.push(ui.section(d.end === 'quit' ? 'The run (ended early)' : 'The run', path));
      out.push(ui.stats([['Level reached', d.n], ['Stars', d.st], d.hr === 1 ? ['High score', 'New best'] : d.hr > 1 ? ['High scores', '#' + d.hr] : null]));
    } else {
      path.appendChild(el('span', { class: d.won ? '' : 'no' }, [el('i', { text: String(d.n) }), d.won ? candyStars(ui, d.st) : el('div', { class: 's' }), el('small', { text: d.won ? 'Cleared' : 'Out of moves' })]));
      out.push(ui.section('Level ' + d.n + (d.nm ? ' · ' + d.nm : '') + ' (practice)', path));
      out.push(ui.stats([['Moves used', d.mv], ['Stars', d.won ? d.st : null]]));
    }
    out.push(ui.stats([['Color bombs', d.mb || null], ['Wrapped', d.mw || null], ['Striped', d.mh || null], ['Special combos', d.cb || null],
      ['Biggest cascade', d.cs >= 2 ? d.cs + ' clears' : null], ['Jelly cleared', d.jl || null]]));
    return ui.wrap(out);
  });
  // ── Riddles: each riddle of the round on a little stone, with its answer, stars and hints ──
  HistView.css('hv-riddles', [
    '.hv-rd{display:flex;flex-direction:column;gap:9px;}',
    '.hv-rd .t{position:relative;text-align:left;padding:10px 13px 11px;border-radius:12px;color:#3d2810;background:linear-gradient(172deg,#ecdbb4,#d8bd8a);box-shadow:inset 0 1px 0 rgba(255,251,238,.7),0 2px 0 #9c7b4a,0 4px 10px rgba(0,0,0,.35);}',
    '.hv-rd .t.g{background:linear-gradient(172deg,#dcd2bf,#bfb39c);}',
    '.hv-rd .top{display:flex;align-items:center;gap:8px;font:700 .62rem/1 "Cinzel",Georgia,serif;letter-spacing:.14em;color:rgba(74,50,24,.7);}',
    '.hv-rd .top .s{margin-left:auto;display:flex;gap:2px;}',
    '.hv-rd .top .s .ico{width:15px;height:15px;color:rgba(92,58,20,.38);}',
    '.hv-rd .top .s .on{color:#8d5e10;fill:#e3b04b;}',
    '.hv-rd .rq{margin:7px 0 5px;font:italic 400 .92rem/1.32 "Pagella",Georgia,serif;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;}',
    '.hv-rd .a{font:700 1rem/1.2 "Cinzel",Georgia,serif;letter-spacing:.05em;text-transform:uppercase;color:#7a4e0c;}',
    '.hv-rd .t.g .a{color:#5e4a30;}',
    '.hv-rd .n{margin-top:3px;font:400 .8rem/1.2 Georgia,serif;color:rgba(74,50,24,.75);}'
  ].join(''));
  R('riddles', function (e, ui) {
    var d = e.dt; if (!d || !d.r || !d.r.length) return null;
    var LV = { easy: 'EASY', medium: 'MEDIUM', hard: 'HARD' }, box = ui.el('div', { class: 'hv-rd' });
    d.r.forEach(function (x, i) {
      var st = ui.el('span', { class: 's', 'aria-label': (x.g ? 0 : x.s) + ' stars' });
      for (var k = 0; k < 3; k++) st.appendChild(ui.el('span', { html: ui.icon('star').replace('class="ico"', 'class="ico' + (!x.g && k < x.s ? ' on' : '') + '"') }));
      var note = x.g ? 'Gave up' : (x.h ? x.h + (x.h === 1 ? ' hint' : ' hints') : 'No hints') + ' · ' + x.t + (x.t === 1 ? ' try' : ' tries');
      box.appendChild(ui.el('div', { class: 't' + (x.g ? ' g' : '') }, [
        ui.el('div', { class: 'top' }, [ui.el('span', { text: (d.r.length > 1 ? (i + 1) + ' · ' : '') + (LV[x.d] || '') }), st]),
        ui.el('div', { class: 'rq', text: x.q }), ui.el('div', { class: 'a', text: x.a }), ui.el('div', { class: 'n', text: note })
      ]));
    });
    var solved = d.r.filter(function (x) { return !x.g; }).length, hints = d.r.reduce(function (a, x) { return a + (x.h || 0); }, 0);
    return ui.wrap([
      d.r.length > 1 ? ui.stats([['Solved', solved + ' / ' + d.r.length], ['Points', e.pts != null ? e.pts : null], ['Hints', hints]]) : null,
      ui.section(d.r.length > 1 ? 'The riddles' : 'The riddle', box)
    ]);
  });
  // ── Truth or Lies: the cast, what each one said, and who was lying ──
  HistView.css('hv-truthlies', [
    '.hvtl{align-self:center;width:100%;max-width:380px;border-radius:4px;padding:10px 12px 12px;color:#2b2118;background:linear-gradient(180deg,#fffaf0,#f1e4c6);box-shadow:0 1px 0 rgba(255,255,255,.6) inset,0 10px 22px -8px rgba(0,0,0,.6);font-family:Georgia,"Times New Roman",serif;}',
    '.hvtl h5{margin:0 0 2px;text-align:center;font-size:1rem;font-weight:700;}',
    '.hvtl .r{margin:0 0 8px;padding-bottom:6px;border-bottom:1.5px solid #2b2118;text-align:center;font-style:italic;font-size:.78rem;color:#5a4a36;}',
    '.hvtl ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px;}',
    '.hvtl li{display:grid;grid-template-columns:auto 1fr auto;gap:8px;align-items:start;font-size:.84rem;line-height:1.3;}',
    '.hvtl .who{min-width:54px;padding:1px 6px;border-radius:5px;color:#fff;font-family:var(--font,system-ui);font-weight:900;font-size:.72rem;text-align:center;}',
    '.hvtl .who small{display:block;font-weight:800;font-size:.6rem;opacity:.85;}',
    '.hvtl .w0{background:#1f9a55;}.hvtl .w1{background:#d0283c;}.hvtl .w2{background:#7a52c7;}',
    '.hvtl .say{font-family:"Patrick Hand","Bradley Hand",cursive;font-size:.98rem;}',
    '.hvtl .tf{font-family:var(--font,system-ui);font-weight:900;font-size:.62rem;letter-spacing:.1em;padding:1px 4px;border:1.5px solid currentColor;border-radius:4px;transform:rotate(-6deg);}',
    '.hvtl .tf.t{color:#1d7a46;}.hvtl .tf.f{color:#b3202f;}',
    '.hvtl .end{margin:8px 0 0;text-align:center;font-weight:700;font-size:.86rem;}',
    '.hvtl .end.g{color:#8a6a3a;font-weight:400;font-style:italic;}'
  ].join(''));
  R('truthlies', function (e, ui) {
    var d = e.dt; if (!d || !d.nm || !d.st) return null;
    var names = String(d.nm).split(','), t = String(d.t || ''), tv = String(d.tv || '');
    var SETS = { island: ['Island of Knights and Knaves', 'knight', 'knave'], castle: ['The Castle Gate', 'truth-teller', 'liar'], woods: ['The Crossroads', 'sage', 'trickster'], market: ['Market Day', 'straight talker', 'swindler'],
      bakeoff: ['The Bake-off', 'ate the cake'], museum: ['The Museum', 'moved the mask'], ship: ['Aboard the Gull', 'took the map'], library: ['The Library', 'spilled the cocoa'], train: ['The Night Train', 'pulled the cord'] };
    var RULES = { one: 'Exactly one of them is lying.', onet: 'Only one of them is telling the truth.', two: 'Exactly two of them are lying.', thief: 'Whoever did it is lying.' };
    var S = SETS[d.set] || ['Truth or Lies', 'truth-teller', 'liar'], wd = d.fam === 'wd';
    var box = ui.el('div', { class: 'hvtl' }, [
      ui.el('h5', { text: S[0] }),
      ui.el('p', { class: 'r', text: wd ? (RULES[d.rule] || '') : 'Truth-tellers and liars' + (d.spy ? ', and one spy' : '') + '.' })
    ]);
    var ul = ui.el('ul');
    [].concat(d.st).forEach(function (s, i) {
      var ty = +t.charAt(i), kind = wd ? (ty ? 'lying' : 'honest') : ty === 2 ? 'spy' : S[ty ? 2 : 1];
      ul.appendChild(ui.el('li', null, [
        ui.el('span', { class: 'who w' + ty, html: ui.esc(names[i] || '') + '<small>' + ui.esc(kind) + '</small>' }),
        ui.el('span', { class: 'say', text: s }),
        tv ? ui.el('span', { class: 'tf ' + (tv.charAt(i) === '1' ? 't' : 'f'), text: tv.charAt(i) === '1' ? 'TRUE' : 'FALSE' }) : null
      ]));
    });
    box.appendChild(ul);
    if (wd && d.c >= 0) box.appendChild(ui.el('p', { class: 'end', text: (names[d.c] || '') + ' ' + S[1] + '.' }));
    if (d.g) box.appendChild(ui.el('p', { class: 'end g', text: 'Answer shown' }));
    return ui.wrap([box, ui.stats([['Time', d.g ? '' : ui.time(e.seconds || 0)], ['Hints', d.h], ['Wrong guesses', d.w]])]);
  });
  // ── Cipher Cases: the case file with its code, the answer and the wrong tries ──
  HistView.css('hv-ciphers', '.hv-cc{position:relative;align-self:center;width:100%;max-width:380px;box-sizing:border-box;border-radius:3px 10px 10px 10px;padding:12px 14px;color:#3a2c14;background:linear-gradient(175deg,#ecd9a8,#dcc28a);box-shadow:0 3px 0 #b99c5e,0 10px 20px rgba(0,0,0,.4);font-family:"American Typewriter","Courier New",monospace;}' +
    '.hv-cc .n{font-size:.68rem;letter-spacing:.14em;font-weight:700;color:#7a6234;padding-right:80px;}' +
    '.hv-cc b{display:block;font-family:var(--display);font-weight:400;font-size:1.3rem;margin:2px 0 8px;color:#2a1f0c;}' +
    '.hv-cc .c{padding:6px 8px;border:1.5px dashed rgba(60,40,10,.35);border-radius:4px;font-weight:700;letter-spacing:.1em;font-size:.82rem;word-break:break-word;}' +
    '.hv-cc .a{margin-top:6px;font-family:var(--hand);font-size:1.35rem;color:#1f2a6b;line-height:1.15;}' +
    '.hv-cc .by{font-style:italic;font-size:.78rem;color:#6b5a3a;}' +
    '.hv-cc .st{position:absolute;right:10px;top:10px;padding:1px 8px;border:2.5px solid #c22a2a;border-radius:5px;color:#c22a2a;font-weight:700;font-size:.78rem;letter-spacing:.14em;transform:rotate(-10deg);}' +
    '.hv-cc .st.g{border-color:#6e6250;color:#6e6250;}' +
    '.hv-cc .s{font-size:.8rem;line-height:1.4;color:#4a3a1c;margin:-2px 0 8px;}' +
    '.hv-cc .lab{margin:8px 0 3px;font-size:.62rem;letter-spacing:.16em;font-weight:700;color:#7a6234;}' +
    '.hv-ccp{position:relative;line-height:0;border-radius:6px;overflow:hidden;box-shadow:0 0 0 5px #3a2614,0 0 0 6px #1c1209,0 10px 20px rgba(0,0,0,.5);margin:6px 6px 4px;}.hv-ccp svg{width:100%;height:auto;display:block;}' +
    '.hv-ccw{display:flex;flex-wrap:wrap;align-items:center;gap:4px;}' +
    '.hv-ccw span{display:grid;place-items:center;min-width:28px;height:38px;padding:0 4px;border-radius:5px;font:900 1.25rem/1 ui-monospace,Menlo,monospace;color:#1d1406;' +
    'background:linear-gradient(180deg,#8a5e14,#f6d98a 22%,#fff3cc 50%,#f6d98a 78%,#8a5e14);box-shadow:inset 0 0 0 1px rgba(60,40,0,.5),0 2px 3px rgba(0,0,0,.35);}' +
    '.hv-ccw span.d{width:40px;height:40px;border-radius:50%;background:radial-gradient(circle at 40% 35%,#5b6270,#22262e 70%);color:#f2f2f2;font-size:1rem;box-shadow:0 0 0 3px #c8962f,0 3px 5px rgba(0,0,0,.4);margin:3px;}' +
    '.hv-ccw span.k{min-width:22px;height:34px;background:linear-gradient(180deg,#1f3a2a,#10241a);color:#7dff9a;box-shadow:inset 0 0 0 1px #000,0 0 6px rgba(125,255,154,.25);text-shadow:0 0 6px rgba(125,255,154,.6);}' +
    '.hv-ccw i{font-style:normal;font-weight:900;color:#7a6234;}' +
    '.hv-cct{display:flex;flex-direction:column;gap:6px;}' +
    '.hv-cct .r{display:flex;align-items:center;gap:8px;}.hv-cct .r .hv-ccw span{opacity:.8;filter:saturate(.5);}' +
    '.hv-cct .r>b{font-size:.72rem;font-weight:900;color:#f0645a;letter-spacing:.08em;min-width:44px;}' +
    '.hv-cct .w{position:relative;}.hv-cct .w::after{content:"";position:absolute;left:-3px;right:-3px;top:50%;height:2.5px;background:#f0645a;transform:rotate(-4deg);border-radius:2px;}' +
    '.hv-cct .m{font-family:ui-monospace,Menlo,monospace;font-weight:800;font-size:.86rem;letter-spacing:.06em;color:var(--text-2);text-decoration:line-through;text-decoration-color:#f0645a;text-decoration-thickness:2px;}' +
    '.hv-cce{margin:0;padding:10px 12px;border-radius:10px;background:rgba(255,255,255,.05);font-size:.9rem;line-height:1.45;color:var(--text-2);}');
  // the lock with the answer set on it: number wheels, letter wheels, a safe's dial numbers or a keypad's screen
  function ccWheels(ui, dev, v) {
    v = String(v || ''); var box = ui.el('div', { class: 'hv-ccw' });
    if (dev === 'dial') v.split('-').forEach(function (n, i) { if (i) box.appendChild(ui.el('i', { text: '·' })); box.appendChild(ui.el('span', { class: 'd', text: n })); });
    else v.replace(/\s+/g, '').split('').forEach(function (ch) { box.appendChild(ui.el('span', { class: dev === 'keypad' ? 'k' : '', text: ch.toUpperCase() })); });
    return box;
  }
  R('ciphers', function (e, ui) {
    var d = e.dt; if (!d || !d.t) return null;
    var LV = { easy: 'Easy', medium: 'Medium', hard: 'Hard' }, lock = d.d && d.d !== 'msg', out = [];
    function sentence(s) { s = String(s || ''); return /[a-z]/.test(s) || !/[A-Z]{2}/.test(s) ? s : s.charAt(0) + s.slice(1).toLowerCase().replace(/\bi\b/g, 'I'); }
    // the case's own picture, when this page can draw it (the Cipher Cases page)
    var pic = null, A = window.CipherArt;
    if (A) {
      try {
        var c = d.id ? A.byId(d.id) : null;
        if (!c && d.g) { var g = String(d.g).split('|'); c = A.gen(g[0], g[1], +g[2], +g[3] || 0); }
        if (!c && e.cid) c = A.byId(e.cid);
        if (c) pic = ui.el('div', { class: 'hv-ccp', html: A.scene(c) });
      } catch (err) { pic = null; }
    }
    var card = ui.el('div', { class: 'hv-cc' }, [
      ui.el('span', { class: 'st' + (d.rv ? ' g' : ''), text: d.rv ? 'OPENED' : 'SOLVED' }),
      ui.el('div', { class: 'n', text: [d.no, LV[d.lv], d.k].filter(Boolean).join(' · ').toUpperCase() }),
      ui.el('b', { text: d.t }),
      d.s ? ui.el('div', { class: 's', text: d.s }) : null,
      d.c ? ui.el('div', { class: 'lab', text: 'THE CODE' }) : null,
      d.c ? ui.el('div', { class: 'c', text: d.c }) : null,
      ui.el('div', { class: 'lab', text: lock ? (d.rv ? 'IT OPENS WITH' : 'YOU OPENED IT WITH') : d.rv ? 'IT SAID' : 'YOU CRACKED IT' }),
      lock ? ccWheels(ui, d.d, d.a) : ui.el('div', { class: 'a', text: sentence(d.a) }),
      d.by ? ui.el('div', { class: 'by', text: '— ' + d.by }) : null
    ]);
    out.push(ui.section('The case', [pic, card].filter(Boolean)));
    out.push(ui.stats([['Time', ui.time(e.secs)], ['Wrong tries', e.tries || 0], ['Hints', (e.hints || 0) + ' of 2']]));
    if (d.ev && evList(d.ev).length && e.secs > 0) out.push(ui.section('How it went', howItWent(ui, { total: e.secs, ev: d.ev, end: d.rv ? 'Opened' : 'Solved', endOk: !d.rv }), { icon: 'chart' }));
    if (d.tr && d.tr.length) {
      var tr = ui.el('div', { class: 'hv-cct' });
      d.tr.forEach(function (t, i) {
        tr.appendChild(ui.el('div', { class: 'r' }, [ui.el('b', { text: 'TRY ' + (e.tries > d.tr.length ? e.tries - d.tr.length + i + 1 : i + 1) }),
          lock ? ui.el('div', { class: 'w' }, [ccWheels(ui, d.d, t)]) : ui.el('span', { class: 'm', text: t })]));
      });
      out.push(ui.section(d.tr.length < (e.tries || 0) ? 'The last wrong tries' : 'Wrong tries', tr, { icon: 'close' }));
    }
    if (d.x) out.push(ui.section('How it was cracked', ui.el('p', { class: 'hv-cce', text: d.x }), { icon: 'key' }));
    return ui.wrap(out);
  });
  // ── Logic Grids: the solved answer table, printed on a puzzle-book page ──
  var LG_LV = { easy: 'Easy 3×4', medium: 'Medium 4×4', hard: 'Hard 4×5', hard5: 'Hard 5×5' };
  HistView.css('hv-logicgrid', [
    '.hv-lg{background:linear-gradient(180deg,#fffdf6,#f4ecd8);color:#1d1b22;border-radius:6px;padding:10px 12px 8px;box-shadow:0 6px 16px -6px rgba(0,0,0,.55);}',
    '.hv-lg h5{margin:0 0 6px;padding-bottom:4px;border-bottom:1.5px solid #1d1b22;font:700 .8rem Georgia,"Times New Roman",serif;letter-spacing:.12em;text-transform:uppercase;}',
    '.hv-lg h5 i{font-weight:400;letter-spacing:0;text-transform:none;color:#6b6455;margin-left:6px;}',
    '.hv-lg table{width:100%;border-collapse:collapse;font-size:.82rem;}',
    '.hv-lg th{font:800 .6rem "Helvetica Neue",Helvetica,Arial,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#6b6455;text-align:left;padding:3px 4px;border-bottom:1px solid #1d1b22;}',
    '.hv-lg td{padding:4px;border-bottom:1px solid rgba(29,27,34,.2);font-family:"Patrick Hand","Bradley Hand",cursive;font-size:1rem;color:#1f3a8a;}',
    '.hv-lg td:first-child{font:700 .85rem Georgia,serif;color:#1d1b22;}',
    '.hv-lg tr.on td{background:#ffe36b;}.hv-lg tr[onclick],.hv-lg tr{cursor:default;}',
    '.hv-lgg{line-height:0;margin:2px 0 10px;}.hv-lgg svg{width:100%;height:auto;display:block;}',
    '.hv-lgn{margin:6px 0 0;font:italic .74rem Georgia,serif;color:#6b6455;text-align:center;}',
    '.hv-lgc{margin:0;padding:0 0 0 1.4em;display:flex;flex-direction:column;gap:5px;font:.86rem/1.35 Georgia,"Times New Roman",serif;color:#1d1b22;}',
    '.hv-lgc li::marker{font-weight:700;}'
  ].join(''));
  // the solved grid as the page prints it: categories across the top and down the side, circles where things match
  function lgSvg(ui, head, items, rowOf, hl) {
    var k = head.length, n = items[0].length, top = [], left = [0], c;
    for (c = 1; c < k; c++) top.push(c);
    for (c = k - 1; c >= 2; c--) left.push(c);
    var cw = function (s) { return String(s).length * 5.7 + 8; }, lw = 0, lh = 0;
    items.forEach(function (L, ci) { L.forEach(function (s) { if (ci === 0 || ci >= 2) lw = Math.max(lw, cw(s)); if (ci >= 1) lh = Math.max(lh, cw(s)); }); });
    lw = Math.min(lw, 92); lh = Math.min(lh, 84);
    var band = 13, C = (k - 1) * n, cs = Math.max(13, Math.min(24, Math.floor((330 - band - lw) / C))), ox = band + lw, oy = band + lh, W = ox + C * cs + 2, H = oy + C * cs + 2;
    var ink = '#1d1b22', s = '<svg viewBox="0 0 ' + f2(W) + ' ' + f2(H) + '" role="img" aria-label="The solved grid">';
    var txt = function (x, y, t, o) { return '<text x="' + f2(x) + '" y="' + f2(y) + '"' + (o || '') + ' font-family="Helvetica Neue,Helvetica,Arial,sans-serif">' + ui.esc(t) + '</text>'; };
    top.forEach(function (tc, cb) {
      var x0 = ox + cb * n * cs;
      s += '<rect x="' + f2(x0) + '" y="0" width="' + (n * cs) + '" height="' + band + '" fill="' + ink + '"/>' + txt(x0 + n * cs / 2, band / 2 + .5, String(head[tc]).toUpperCase(), ' text-anchor="middle" dominant-baseline="central" font-size="7.5" font-weight="800" letter-spacing=".6" fill="#fbf6e9"');
      for (var j = 0; j < n; j++) s += txt(0, 0, items[tc][j], ' transform="translate(' + f2(x0 + j * cs + cs / 2 + 3) + ' ' + f2(oy - 4) + ') rotate(-90)" font-size="9" font-weight="600" fill="' + ink + '"');
    });
    left.forEach(function (lc, rb) {
      var y0 = oy + rb * n * cs;
      s += '<rect x="0" y="' + f2(y0) + '" width="' + band + '" height="' + (n * cs) + '" fill="' + ink + '"/>' + txt(0, 0, String(head[lc]).toUpperCase(), ' transform="translate(' + (band / 2 + .5) + ' ' + f2(y0 + n * cs / 2) + ') rotate(-90)" text-anchor="middle" dominant-baseline="central" font-size="7.5" font-weight="800" letter-spacing=".6" fill="#fbf6e9"');
      for (var i = 0; i < n; i++) s += txt(ox - 4, y0 + i * cs + cs / 2 + 3, items[lc][i], ' text-anchor="end" font-size="9" font-weight="600" fill="' + ink + '"');
    });
    left.forEach(function (a, rb) {
      top.forEach(function (b, cb) {
        if (rb + cb > k - 2) return;
        var x0 = ox + cb * n * cs, y0 = oy + rb * n * cs;
        s += '<rect x="' + f2(x0) + '" y="' + f2(y0) + '" width="' + (n * cs) + '" height="' + (n * cs) + '" fill="#fffdf7"/>';
        for (var i = 0; i < n; i++) for (var j = 0; j < n; j++) {
          var x = x0 + j * cs, y = y0 + i * cs, r = rowOf[a][items[a][i]], yes = r != null && r === rowOf[b][items[b][j]];
          if (yes && hl === r) s += '<rect x="' + f2(x) + '" y="' + f2(y) + '" width="' + cs + '" height="' + cs + '" fill="#ffe36b"/>';
          if (yes) s += '<circle cx="' + f2(x + cs / 2) + '" cy="' + f2(y + cs / 2) + '" r="' + f2(cs * .32) + '" fill="none" stroke="#1f3a8a" stroke-width="' + f2(Math.max(1.6, cs * .1)) + '"/>';
          else { var q = cs * .3; s += '<path d="M' + f2(x + q) + ' ' + f2(y + q) + 'L' + f2(x + cs - q) + ' ' + f2(y + cs - q) + 'M' + f2(x + cs - q) + ' ' + f2(y + q) + 'L' + f2(x + q) + ' ' + f2(y + cs - q) + '" stroke="#3a3a44" stroke-width="1.1" stroke-linecap="round" opacity="' + (hl != null ? .25 : .55) + '"/>'; }
        }
        for (var g = 0; g <= n; g++) {
          var w = g === 0 || g === n ? 1.6 : .5, col = g === 0 || g === n ? ink : 'rgba(29,27,34,.3)';
          s += '<line x1="' + f2(x0 + g * cs) + '" x2="' + f2(x0 + g * cs) + '" y1="' + f2(y0) + '" y2="' + f2(y0 + n * cs) + '" stroke="' + col + '" stroke-width="' + w + '"/><line y1="' + f2(y0 + g * cs) + '" y2="' + f2(y0 + g * cs) + '" x1="' + f2(x0) + '" x2="' + f2(x0 + n * cs) + '" stroke="' + col + '" stroke-width="' + w + '"/>';
        }
      });
    });
    return s + '</svg>';
  }
  R('logicgrid', function (e, ui) {
    var d = e.dt || {};
    if (!d.h || !Array.isArray(d.a) || !d.a.length) return null;
    var head = String(d.h).split('|'), rows = d.a.map(function (r) { return String(r).split('|'); }), out = [];
    var items = Array.isArray(d.it) && d.it.length === head.length ? d.it.map(function (s) { return String(s).split('|'); }) : null;
    // which answer row each item is in
    var rowOf = head.map(function () { return {}; });
    rows.forEach(function (r, ri) { r.forEach(function (v, ci) { if (rowOf[ci]) rowOf[ci][v] = ri; }); });
    if (items && items.some(function (L) { return L.length !== rows.length; })) items = null;
    var gridBox = items ? ui.el('div', { class: 'hv-lgg' }) : null, hl = null;
    function paint() { if (gridBox) gridBox.innerHTML = lgSvg(ui, head, items, rowOf, hl); }
    var t = ui.el('table'), hr = ui.el('tr'), trs = [];
    head.forEach(function (h) { hr.appendChild(ui.el('th', { text: h })); });
    t.appendChild(hr);
    rows.forEach(function (r, ri) {
      var tr = ui.el('tr', items ? { onclick: function () { hl = hl === ri ? null : ri; trs.forEach(function (x, j) { x.classList.toggle('on', j === hl); }); paint(); } } : null);
      r.forEach(function (v) { tr.appendChild(ui.el('td', { text: v })); }); trs.push(tr); t.appendChild(tr);
    });
    paint();
    var page = ui.el('div', { class: 'hv-lg' }, [ui.el('h5', { html: ui.esc(d.t || 'Logic grid') + '<i>No. ' + ui.esc(d.no || e.no || '') + (e.daily ? ' · Daily' : '') + '</i>' }), gridBox, t,
      items ? ui.el('p', { class: 'hv-lgn', text: 'Tap a row to light up its circles' }) : null]);
    out.push(ui.section(items ? 'The solved grid' : 'The answers', page));
    var pb = d.pb || 0, best = !e.hints && (!pb || e.seconds < pb);
    out.push(ui.stats([['Time', sec(e.seconds), d.pb != null ? (best ? (pb ? 'new best' : 'first clean solve') : pb ? 'best ' + sec(pb) : '') : ''], ['Hints', e.hints || 0], ['Checks', e.checks || 0, d.w ? d.w + ' wrong marks found' : '']]));
    if (d.pg != null && e.seconds > 0) {
      var ps = d.ps || 10, line = String(d.pg || '').split(',').filter(function (x) { return x !== ''; }).map(function (v, i) { return [ps * (i + 1), +v]; }).filter(function (p) { return p[0] < e.seconds; });
      line.push([e.seconds, d.pt || 0]);
      out.push(ui.section('How it went', howItWent(ui, { total: e.seconds, ev: d.ev, line: line, max: d.pt || null, unit: 'matches circled', end: 'Solved', names: { x: 'Check with mistakes', c: 'Check, all right' } }), { icon: 'chart' }));
    }
    if (Array.isArray(d.ct) && d.ct.length) {
      var ol = ui.el('ol', { class: 'hv-lgc' }); d.ct.forEach(function (c) { ol.appendChild(ui.el('li', { text: c })); });
      out.push(ui.section('The clues', ui.el('div', { class: 'hv-lg' }, [ol]), { icon: 'search' }));
    } else if (d.cl) out.push(ui.facts([['Clues', d.cl]]));
    return ui.wrap(out);
  });
  // ── Picture Mysteries: the case file, the photo with the solution circled, the line-up, how it was solved ──
  HistView.css('hv-mysteries', [
    '.hv-msf{position:relative;margin-top:14px;padding:14px 12px 12px;border-radius:3px 12px 12px 12px;color:#3a2a14;',
    'background:radial-gradient(120% 60% at 20% 0%,rgba(255,255,255,.35),transparent 60%),repeating-linear-gradient(0deg,rgba(120,80,20,.035) 0 2px,transparent 2px 5px),linear-gradient(170deg,#f0dfb0,#dcc286);',
    'box-shadow:0 1px 0 rgba(255,255,255,.5) inset,0 10px 22px rgba(0,0,0,.45);display:flex;flex-direction:column;gap:8px;}',
    '.hv-msf .tab{position:absolute;left:14px;top:-17px;height:20px;padding:4px 14px 0;border-radius:8px 8px 0 0;background:#f0dfb0;font:700 .66rem/1.2 ui-monospace,Menlo,monospace;letter-spacing:.16em;color:#7a5a2a;}',
    '.hv-msf h5{margin:0;font-family:var(--display);font-weight:400;font-size:1.3rem;line-height:1.08;color:#4a2d10;}',
    '.hv-msp{position:relative;padding:6px;border-radius:2px;background:linear-gradient(180deg,#fdfcf7,#f1ede2);box-shadow:0 10px 20px rgba(0,0,0,.4);transform:rotate(-.5deg);}',
    '.hv-msp .v{position:relative;overflow:hidden;background:#ddd;line-height:0;min-height:60px;}.hv-msp svg{display:block;width:100%;height:auto;}',
    '.hv-msp .stp{position:absolute;right:12px;top:14px;padding:1px 8px;border:3px double rgba(192,25,43,.85);border-radius:4px;font:400 1.1rem/1.1 var(--display);letter-spacing:.14em;color:rgba(192,25,43,.9);background:rgba(255,250,240,.35);transform:rotate(-12deg);}',
    '.hv-msp .stp.g{border-color:rgba(70,70,90,.8);color:rgba(70,70,90,.85);}.hv-msp .stp.p{border-color:#b8860b;color:#9a6a00;}',
    '.hv-msq{display:flex;align-items:flex-start;gap:7px;font-family:var(--hand);font-size:1.25rem;line-height:1.15;color:#1f2a6b;}',
    '.hv-msq .ico{flex:none;width:19px;height:19px;margin-top:2px;color:#a33a2a;}',
    '.hv-msl{display:flex;flex-wrap:wrap;gap:6px;}',
    '.hv-msl span{display:inline-flex;align-items:center;gap:4px;padding:3px 9px 3px 7px;border-radius:4px;background:rgba(255,253,246,.7);box-shadow:0 1px 2px rgba(0,0,0,.25);font-weight:800;font-size:.84rem;color:#4a3a22;}',
    '.hv-msl span .ico{width:14px;height:14px;}',
    '.hv-msl span.ans{background:#fffdf6;color:#14532d;box-shadow:0 0 0 2.5px #1d7a46,0 2px 4px rgba(0,0,0,.25);}',
    '.hv-msl span.no{color:#9b1c1c;text-decoration:line-through;text-decoration-thickness:2px;opacity:.85;}',
    '.hv-mss{display:flex;flex-direction:column;gap:5px;margin:0;padding:0;list-style:none;}',
    '.hv-mss li{display:grid;grid-template-columns:22px 1fr;gap:8px;align-items:start;padding:7px 9px;border-radius:8px;background:rgba(255,255,255,.04);cursor:pointer;font-size:.88rem;line-height:1.35;color:var(--text-2);transition:background .15s;}',
    '.hv-mss li i{display:grid;place-items:center;width:20px;height:20px;border-radius:50%;background:#d0192b;color:#fff;font-style:normal;font-size:.72rem;font-weight:900;box-shadow:0 0 0 1.5px #fff;}',
    '.hv-mss li.on{background:rgba(208,25,43,.18);color:var(--text);}',
    '.hv-msv{margin:2px 0 0;padding:8px 10px;border-left:4px solid #d0192b;background:rgba(255,255,255,.04);border-radius:0 8px 8px 0;font-weight:800;font-size:.9rem;line-height:1.35;}'
  ].join(''));
  function msCase(id) {
    var L = window.MYSTERY_CASES || [];
    for (var i = 0; i < L.length; i++) if (L[i].id === id) return L[i];
    try { return window.MysteryGen && id ? MysteryGen.byId(id) : null; } catch (e) { return null; }
  }
  R('mysteries', function (e, ui) {
    var d = e.dt || {};
    if (!d.t) return null;
    var el = ui.el, LV = { easy: 'EASY', medium: 'MEDIUM', hard: 'HARD' }, solved = !!d.ok, perfect = solved && !d.h && !d.m, out = [];
    var tab = (d.dy ? 'DAILY' : /^(daily|endless)-/.test(d.c || '') ? 'EXTRA No. ' + d.n : 'CASE ' + ('0' + d.n).slice(-2)) + (LV[d.lv] ? ' · ' + LV[d.lv] : '');
    var view = el('div', { class: 'v' }), photo = el('div', { class: 'hv-msp', hidden: true }, [view, el('span', { class: 'stp' + (perfect ? ' p' : solved ? '' : ' g'), text: perfect ? 'PERFECT' : solved ? 'SOLVED' : 'CLOSED' })]);
    var q = el('div', { class: 'hv-msq', hidden: !d.q, html: ui.icon('search') + '<span>' + ui.esc(d.q || '') + '</span>' });
    var lineup = el('div', { class: 'hv-msl' });
    var file = el('div', { class: 'hv-msf' }, [el('span', { class: 'tab', text: tab }), el('h5', { text: d.t }), photo, q, lineup]);
    out.push(file);
    var wrong = d.x || [];
    function tag(label, isAns) {
      var no = wrong.indexOf(label) >= 0;
      return el('span', { class: isAns ? 'ans' : no ? 'no' : '', html: (isAns ? ui.icon('check') : no ? ui.icon('close') : '') + '<span>' + ui.esc(label) + '</span>' });
    }
    // what the record alone knows: the wrong guesses and (newer records) the answer
    function plainLineup() { lineup.innerHTML = ''; wrong.forEach(function (w) { lineup.appendChild(tag(w, false)); }); if (d.a) lineup.appendChild(tag(d.a, true)); }
    plainLineup();
    out.push(ui.stats([['Time', sec(d.s)], ['Hints', (d.h || 0) + ' of 2'], ['Wrong guesses', d.m || 0]]));
    if (evList(d.ev).length && d.s > 0) out.push(ui.section('How it went', howItWent(ui, { total: d.s, ev: d.ev, end: solved ? 'Solved' : 'Shown', endOk: solved, names: { x: 'Wrong guess' } }), { icon: 'chart' }));
    var steps = el('div', { class: 'hv' }), stepSec = ui.section('How it was solved', steps, { icon: 'lightbulb' });
    stepSec.hidden = true; out.push(stepSec);
    var box = ui.wrap(out);
    // the photo and the solution need the case itself (and its drawing code, which only the mysteries page has loaded)
    function fill() {
      var c = msCase(d.c); if (!c || !window.MysteryScene) return;
      view.innerHTML = MysteryScene.render(c, 'hvms' + Math.floor(Math.random() * 1e6));
      var svg = view.querySelector('svg'); photo.hidden = false;
      if (c.q && !d.q) { q.lastChild.textContent = c.q; q.hidden = false; }
      if (c.choices && c.choices.length) {
        var ans = (c.choices.filter(function (x) { return x.id === c.answer; })[0] || {}).label;
        lineup.innerHTML = ''; c.choices.forEach(function (x) { lineup.appendChild(tag(x.label, x.label === ans)); });
      }
      var sol = c.solution || {}, list = sol.steps || [];
      if (!list.length) return;
      var ol = el('ol', { class: 'hv-mss' }), lis = [], g = document.createElementNS('http://www.w3.org/2000/svg', 'g'), only = -1;
      function marks() {
        var s = ''; list.forEach(function (st, i) { if (only >= 0 && i !== only) return; (st.marks || []).forEach(function (m) { s += MysteryScene.markSvg(svg, m, i + 1); }); });
        g.innerHTML = s; lis.forEach(function (li, i) { li.classList.toggle('on', i === only); });
      }
      list.forEach(function (st, i) {
        var li = el('li', { onclick: function () { only = only === i ? -1 : i; marks(); } }, [el('i', { text: String(i + 1) }), el('span', { text: st.text })]);
        lis.push(li); ol.appendChild(li);
      });
      steps.appendChild(ol);
      if (sol.verdict) steps.appendChild(el('p', { class: 'hv-msv', text: sol.verdict }));
      steps.appendChild(el('p', { class: 'hv-pz-note', text: 'Tap a step to see just its clue on the photo' }));
      stepSec.hidden = false;
      var world = svg && svg.querySelector('.ms-world');
      (world ? world.parentNode : svg).appendChild(g);
      whenShown(view, marks);
    }
    if (window.MysteryScene && (window.MYSTERY_CASES || window.MysteryGen)) fill();
    else loadScripts(['data/mysteries-scene.js', 'data/mysteries-cases.js', 'data/mysteries-gen.js']).then(fill);
    return box;
  });
})();
