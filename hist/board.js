'use strict';
// History views: board
// chess, checkers, tictactoe, chinesecheckers, codebreaker (Mastermind), dominoes, marbles, axisallies
(function () {
  if (!window.HistView) return;
  var R = HistView.register;
  function f2(v) { return Math.round(v * 1000) / 1000; }
  function names(e) { return (e.players || []).map(function (p) { return String(p.name || '').replace(/ \((White|Black|Red)\)$/, ''); }); }

  // ── Shared pieces (board2.js reaches them through HistView.boardUI when it draws) ──
  // A replay: back / play / forward buttons around a scrubber. show(n) redraws step n (0..max) and returns its caption.
  // o.start: the step to open on (default the end); o.ms: play speed
  function replay(ui, max, show, o) {
    o = o || {};
    var label = ui.el('b', { class: 'hvb-cap' }), cur = o.start != null ? o.start : max, timer = null;
    var rng = ui.el('input', { type: 'range', min: '0', max: String(max), value: String(cur), class: 'hvb-range', 'aria-label': 'Move' });
    function go(n) { cur = Math.max(0, Math.min(max, n)); rng.value = String(cur); label.textContent = show(cur) || ''; back.disabled = cur <= 0; fwd.disabled = cur >= max; }
    function stop() { if (timer) { clearInterval(timer); timer = null; } play.innerHTML = ui.icon('play'); play.setAttribute('aria-label', 'Play the game through'); }
    var back = ui.el('button', { type: 'button', class: 'hvb-sb', 'aria-label': 'Back one move', html: ui.icon('back'), onclick: function () { stop(); go(cur - 1); } });
    var fwd = ui.el('button', { type: 'button', class: 'hvb-sb', 'aria-label': 'Forward one move', html: ui.icon('right'), onclick: function () { stop(); go(cur + 1); } });
    var play = ui.el('button', { type: 'button', class: 'hvb-sb hvb-play', onclick: function () {
      if (timer) { stop(); return; }
      if (cur >= max) go(0);
      play.innerHTML = ui.icon('pause'); play.setAttribute('aria-label', 'Pause');
      var ms = o.ms || Math.max(120, Math.min(700, 14000 / Math.max(1, max)));
      timer = setInterval(function () { if (!rng.isConnected || cur >= max) { stop(); return; } go(cur + 1); }, ms);
    } });
    rng.addEventListener('input', function () { stop(); go(+rng.value); });
    stop(); go(cur);
    var box = ui.el('div', { class: 'hvb-replay' }, [ui.el('div', { class: 'hvb-ctl' }, [back, play, rng, fwd]), label]);
    box.go = go;
    return box;
  }
  // A line chart on a dark panel: series [{v:[..], c:'#hex', w?, fill?, dash?}]; o = {lo, hi, mid, h, from, to, aria, fmt}
  // Returns a node with .at(i): a cursor at point i (the replay moves it)
  function chart(ui, series, o) {
    o = o || {};
    var W = 320, H = o.h || 110, PL = 6, PR = 6, PT = 10, PB = o.from || o.to ? 16 : 6;
    var n = Math.max.apply(null, series.map(function (s) { return s.v.length; }).concat([2]));
    var all = [].concat.apply([], series.map(function (s) { return s.v; }));
    var lo = o.lo != null ? o.lo : Math.min.apply(null, all.concat([0])), hi = o.hi != null ? o.hi : Math.max.apply(null, all.concat([1]));
    function x(i) { return PL + i * (W - PL - PR) / (n - 1); }
    function y(v) { return PT + (hi - v) * (H - PT - PB) / ((hi - lo) || 1); }
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + ui.esc(o.aria || 'Chart') + '">';
    if (o.mid != null) s += '<line x1="' + PL + '" x2="' + (W - PR) + '" y1="' + f2(y(o.mid)) + '" y2="' + f2(y(o.mid)) + '" stroke="rgba(255,255,255,.28)" stroke-dasharray="4 4"/>';
    if (o.midLabel) s += '<text x="' + (W - PR) + '" y="' + f2(y(o.mid) - 4) + '" text-anchor="end" font-size="9" font-weight="800" fill="rgba(255,255,255,.5)" font-family="system-ui">' + ui.esc(o.midLabel) + '</text>';
    series.forEach(function (sr) {
      if (!sr.v.length) return;
      var pts = sr.v.map(function (v, i) { return f2(x(i)) + ',' + f2(y(v)); }).join(' ');
      if (sr.fill) s += '<polygon points="' + f2(x(0)) + ',' + f2(y(lo)) + ' ' + pts + ' ' + f2(x(sr.v.length - 1)) + ',' + f2(y(lo)) + '" fill="' + sr.fill + '"/>';
      s += '<polyline points="' + pts + '" fill="none" stroke="' + sr.c + '" stroke-width="' + (sr.w || 2.5) + '" stroke-linejoin="round" stroke-linecap="round"' + (sr.dash ? ' stroke-dasharray="' + sr.dash + '"' : '') + (sr.halo ? ' style="filter:drop-shadow(0 0 1.2px ' + sr.halo + ')"' : '') + '/>';
      var L = sr.v.length - 1;
      s += '<circle cx="' + f2(x(L)) + '" cy="' + f2(y(sr.v[L])) + '" r="3.6" fill="' + sr.c + '" stroke="rgba(0,0,0,.5)" stroke-width="1"/>';
    });
    if (o.from) s += '<text x="' + PL + '" y="' + (H - 3) + '" font-size="9.5" font-weight="800" fill="rgba(255,255,255,.55)" font-family="system-ui">' + ui.esc(o.from) + '</text>';
    if (o.to) s += '<text x="' + (W - PR) + '" y="' + (H - 3) + '" text-anchor="end" font-size="9.5" font-weight="800" fill="rgba(255,255,255,.55)" font-family="system-ui">' + ui.esc(o.to) + '</text>';
    s += '<line class="hvb-cur" x1="0" x2="0" y1="' + PT + '" y2="' + (H - PB) + '" stroke="#ffd54a" stroke-width="1.5" opacity="0"/></svg>';
    var node = ui.el('div', { class: 'hvb-chart', html: s });
    node.at = function (i) {
      var c = node.querySelector('.hvb-cur'); if (!c) return;
      if (i == null || i < 0) { c.setAttribute('opacity', '0'); return; }
      var X = f2(x(Math.min(n - 1, i))); c.setAttribute('x1', X); c.setAttribute('x2', X); c.setAttribute('opacity', '.9');
    };
    return node;
  }
  // a key under a chart: [[name, colour], ..]
  function key(ui, list) { return ui.el('div', { class: 'hvb-key' }, list.filter(Boolean).map(function (k) { return ui.el('span', null, [ui.el('i', { style: { background: k[1] } }), ui.el('span', { text: k[0] })]); })); }
  // A strip of tappable moves: items [{t: main text, s: small text, c: colour, hot}], tap one: pick(i)
  function strip(ui, items, start, pick) {
    var box = ui.el('div', { class: 'hvb-strip', role: 'tablist' }), btns = [];
    items.forEach(function (it, i) {
      var b = ui.el('button', { type: 'button', role: 'tab', class: 'hvb-sp' + (it.hot ? ' hot' : '') + (it.dim ? ' dim' : ''), style: it.c ? { '--pc': it.c } : null, onclick: function () { set(i); } },
        [ui.el('b', { text: it.t }), it.s != null ? ui.el('small', { text: it.s }) : null]);
      btns.push(b); box.appendChild(b);
    });
    function scroll(i) { var b = btns[i]; if (b && box.scrollWidth > box.clientWidth) box.scrollLeft = Math.max(0, b.offsetLeft - box.offsetLeft - box.clientWidth / 2 + b.offsetWidth / 2); }
    // quiet: just light it (the replay moved, so don't redraw again)
    function set(i, quiet) {
      btns.forEach(function (b, j) { b.classList.toggle('on', i === j); b.setAttribute('aria-selected', i === j ? 'true' : 'false'); });
      scroll(i);
      if (!quiet) pick(i);
    }
    box.set = set;
    if (items.length && start != null) { set(start); setTimeout(function () { scroll(start); }, 60); }
    return box;
  }
  // what decided it, in a line
  function foot(ui, text, icon) { return text ? ui.el('div', { class: 'hvb-foot', html: ui.icon(icon || 'flag') + '<span>' + ui.esc(text) + '</span>' }) : null; }
  HistView.boardUI = { replay: replay, chart: chart, key: key, strip: strip, foot: foot, f2: f2 };

  HistView.css('hv-board', [
    '.hvb-replay{display:flex;flex-direction:column;gap:6px;}',
    '.hvb-ctl{display:flex;align-items:center;gap:6px;}',
    '.hvb-range{flex:1;min-width:0;width:100%;accent-color:var(--yellow);}',
    '.hvb-sb{appearance:none;border:0;cursor:pointer;flex:none;display:grid;place-items:center;width:34px;height:34px;border-radius:50%;padding:0;background:var(--w08);color:var(--text);}',
    '.hvb-sb .ico{width:16px;height:16px;}.hvb-sb:disabled{opacity:.35;cursor:default;}.hvb-sb:active{transform:scale(.94);}',
    '.hvb-sb.hvb-play{background:var(--yellow);color:#1b1404;}',
    '.hvb-cap{font-size:.85rem;color:var(--text-2);min-height:1.25em;line-height:1.3;}',
    '.hvb-chart{line-height:0;border-radius:14px;padding:8px;background:linear-gradient(#15161f,#0c0d13);box-shadow:inset 0 0 0 1px var(--w08);}',
    '.hvb-chart svg{width:100%;height:auto;display:block;}',
    '.hvb-key{display:flex;flex-wrap:wrap;gap:4px 12px;font-size:.74rem;font-weight:800;color:var(--text-3);}',
    '.hvb-key span{display:inline-flex;align-items:center;gap:5px;}.hvb-key i{width:10px;height:10px;border-radius:3px;display:inline-block;box-shadow:inset 0 0 0 1px rgba(255,255,255,.25);}',
    '.hvb-strip{display:flex;gap:5px;overflow-x:auto;padding:2px 2px 6px;scrollbar-width:thin;}',
    '.hvb-sp{appearance:none;border:0;cursor:pointer;flex:none;display:flex;flex-direction:column;align-items:flex-start;gap:0;padding:6px 9px 5px;border-radius:10px;font:inherit;text-align:left;',
    'background:var(--w06);color:var(--text);box-shadow:inset 3px 0 0 var(--pc,var(--w15));max-width:150px;}',
    '.hvb-sp b{font-size:.8rem;font-weight:900;letter-spacing:.02em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;}',
    '.hvb-sp small{font-size:.68rem;font-weight:800;color:var(--text-3);white-space:nowrap;}',
    '.hvb-sp.hot{background:color-mix(in srgb,#d4a017 26%,var(--w06));}.hvb-sp.hot small{color:#f5c542;}',
    '.hvb-sp.dim b{color:var(--text-3);font-weight:800;}',
    '.hvb-sp.on{outline:2.5px solid var(--yellow);outline-offset:-1px;}',
    '.hvb-foot{display:flex;align-items:center;gap:8px;padding:9px 12px;border-radius:12px;background:var(--w05);font-size:.86rem;font-weight:800;color:var(--text-2);line-height:1.3;}',
    '.hvb-foot .ico{width:16px;height:16px;flex:none;color:var(--yellow);}',
    '.hvb-moves{max-height:132px;overflow-y:auto;display:flex;flex-wrap:wrap;gap:2px 4px;padding:8px 10px;border-radius:12px;background:#f6f1e3;color:#2b2218;font-size:.84rem;line-height:1.5;font-variant-numeric:tabular-nums;}',
    '.hvb-moves .no{color:#9a8a70;font-weight:800;margin-left:4px;}',
    '.hvb-moves span.mv{padding:0 3px;border-radius:4px;font-weight:700;}',
    '.hvb-moves span.mv.on{background:#2b2218;color:#f6f1e3;}',
    '.hvb-caps{display:flex;flex-direction:column;gap:4px;}',
    '.hvb-caps>div{display:flex;align-items:center;gap:8px;font-size:.84rem;font-weight:800;color:var(--text-2);}',
    '.hvb-caps>div>span:first-child{min-width:74px;}',
    '.hvb-caps svg{display:block;max-width:100%;}','.hvb-caps>div>span:nth-child(2){min-width:0;flex:1;}',
    '.hvb-caps em{font-style:normal;color:var(--text-3);font-weight:700;margin-left:8px;}',
    '.hvb-dom{display:flex;flex-wrap:wrap;gap:3px;align-items:center;justify-content:center;line-height:0;}',
    '.hvb-dom svg{height:22px;width:auto;flex:none;filter:drop-shadow(0 1px 1.5px rgba(0,0,0,.45));}',
    '.hvb-dom svg.v{height:44px;}',
    '.hvb-dom svg.hl{outline:2px solid var(--yellow);outline-offset:1px;border-radius:3px;}',
    '.hvb-hand{display:grid;grid-template-columns:minmax(64px,auto) 1fr auto;gap:8px;align-items:center;font-size:.86rem;}',
    '.hvb-hand .n{font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:110px;}',
    '.hvb-hand .t{display:flex;flex-wrap:wrap;gap:3px;line-height:0;}',
    '.hvb-hand .t svg{height:18px;width:auto;}',
    '.hvb-hand .p{font-weight:900;color:var(--text-2);font-variant-numeric:tabular-nums;}',
    '.hvb-hand em{font-style:normal;color:var(--yellow);font-weight:900;}',
    '.hvb-mm{display:flex;flex-direction:column;gap:6px;}',
    '.hvb-map{min-height:60px;}',
    '.hvb-map .ld{line-height:1.4;font-size:.8rem;color:var(--text-3);padding:12px;text-align:center;}'
  ].join(''));

  // ═════════════════════════════════════════════════════════════════════════
  // Chess: final board, a replay, the move list, captures
  // ═════════════════════════════════════════════════════════════════════════
  var CBASE = '<rect x="20" y="80" width="60" height="10" rx="4"/><rect x="27" y="72.5" width="46" height="9" rx="3"/>';
  var CBODY = '<path d="M35 73 C38 62 42 55 43 48 H57 C58 55 62 62 65 73 Z"/>';
  var CSH = {
    1: { m: '<circle cx="50" cy="35" r="12.5"/><path d="M36 73 C39 63 43 58 44 52 H56 C57 58 61 63 64 73 Z"/><ellipse cx="50" cy="51" rx="13" ry="4"/>' + '<rect x="22" y="80" width="56" height="10" rx="4"/><rect x="29" y="72.5" width="42" height="9" rx="3"/>', d: '' },
    2: { m: '<path d="M31 73 C31 64 38 58 45 52 C38 54 31 56 25 54 C19 52 16 47 19 43 L30 30 C33 24 38 19 44 17 L46 8 L53 15.5 C66 20 74 34 72 50 C71 60 68 66 70 73 Z"/>' + CBASE, d: '<circle cx="39" cy="27.5" r="2.6" class="fd"/><circle cx="22.5" cy="46.5" r="1.6" class="fd"/><path d="M55 19 C64 25 68 36 67 50"/>' },
    3: { m: '<circle cx="50" cy="12" r="5"/><path d="M50 16 C39 25 34 34 37 41 C40 46 60 46 63 41 C66 34 61 25 50 16 Z"/><path d="M36 73 C39 62 43 56 44 49 H56 C57 56 61 62 64 73 Z"/><ellipse cx="50" cy="47.5" rx="15" ry="4.5"/>' + CBASE, d: '<path d="M55.5 25 L46 35"/>' },
    4: { m: '<path d="M28 18 H37 V24 H45 V18 H55 V24 H63 V18 H72 V35 H28 Z"/><path d="M34 73 L37 37 H63 L66 73 Z"/><rect x="30" y="33" width="40" height="7" rx="2"/>' + CBASE, d: '' },
    5: { m: '<circle cx="20" cy="19" r="3.8"/><circle cx="35" cy="12" r="3.8"/><circle cx="50" cy="8" r="3.8"/><circle cx="65" cy="12" r="3.8"/><circle cx="80" cy="19" r="3.8"/><path d="M31 45 L20 21 L35 33 L35 14 L45 30 L50 10 L55 30 L65 14 L65 33 L80 21 L69 45 Z"/>' + CBODY + '<ellipse cx="50" cy="46" rx="18" ry="4.5"/>' + CBASE, d: '' },
    6: { m: '<path d="M46.5 4 H53.5 V10.5 H60 V17 H53.5 V34 H46.5 V17 H40 V10.5 H46.5 Z"/><path d="M32 44 C24 34 27 23 37 23 C43 23 47 27 50 32 C53 27 57 23 63 23 C73 23 76 34 68 44 Z"/>' + CBODY + '<ellipse cx="50" cy="46" rx="18" ry="4.5"/>' + CBASE, d: '' }
  };
  var CDEFS = '<defs><linearGradient id="hvcgw" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fffbf2"/><stop offset=".5" stop-color="#f1e6cd"/><stop offset="1" stop-color="#c7b38b"/></linearGradient>' +
    '<linearGradient id="hvcgb" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#6e6158"/><stop offset=".42" stop-color="#3a302a"/><stop offset="1" stop-color="#141009"/></linearGradient></defs>';
  // one piece (a = 1..6, white?) as an inner <svg> at x,y size s
  function chPiece(a, white, x, y, s) {
    var sh = CSH[a], stroke = white ? '#3b2a1a' : '#050302', det = white ? '#3b2a1a' : '#d9cba9';
    var d = sh.d.replace(/class="fd"/g, 'fill="' + det + '" stroke="none"');
    // a group, not a nested <svg> (frame CSS sizes every svg inside it)
    return '<g transform="translate(' + f2(x + (s - s * 86 / 88) / 2) + ' ' + y + ') scale(' + f2(s / 88) + ') translate(-7 -3)"><g fill="url(#' + (white ? 'hvcgw' : 'hvcgb') + ')" stroke="' + stroke + '" stroke-width="3" stroke-linejoin="round">' + sh.m + '</g>' +
      (d ? '<g fill="none" stroke="' + det + '" stroke-width="2.6" stroke-linecap="round">' + d + '</g>' : '') + '</g>';
  }
  var CVAL = { p: 1, n: 2, b: 3, r: 4, q: 5, k: 6 };
  function chStart() { return ['rnbqkbnr', 'pppppppp', '........', '........', '........', '........', 'PPPPPPPP', 'RNBQKBNR'].join('').split(''); }
  function chIdx(sq) { return (8 - (+sq.charAt(1))) * 8 + 'abcdefgh'.indexOf(sq.charAt(0)); }
  function chApply(b, mv) {
    var f = chIdx(mv.slice(0, 2)), t = chIdx(mv.slice(2, 4)), p = b[f], white = p !== '.' && p === p.toUpperCase(), lo = p.toLowerCase();
    if (lo === 'k' && Math.abs((t & 7) - (f & 7)) === 2) {
      var row = f & ~7;
      if ((t & 7) === 6) { b[row + 5] = b[row + 7]; b[row + 7] = '.'; } else { b[row + 3] = b[row]; b[row] = '.'; }
    }
    if (lo === 'p' && (t & 7) !== (f & 7) && b[t] === '.') b[(f & ~7) + (t & 7)] = '.';
    b[t] = mv.length > 4 ? (white ? mv.charAt(4).toUpperCase() : mv.charAt(4)) : p; b[f] = '.';
    return { f: f, t: t };
  }
  function chBoard(cells, o) {
    o = o || {};
    var cs = 40, lab = 14, W = cs * 8 + lab, flip = !!o.flip, s = '<svg viewBox="0 0 ' + W + ' ' + W + '" role="img" aria-label="' + (o.aria || 'Chess board') + '">' + CDEFS;
    function xy(i) { var r = i >> 3, c = i & 7; if (flip) { r = 7 - r; c = 7 - c; } return [lab + c * cs, r * cs]; }
    for (var i = 0; i < 64; i++) {
      var p = xy(i), light = ((i >> 3) + (i & 7)) % 2 === 0;
      s += '<rect x="' + p[0] + '" y="' + p[1] + '" width="' + cs + '" height="' + cs + '" fill="' + (light ? '#e6c896' : '#8a5230') + '"/>';
      if (o.last && (o.last.f === i || o.last.t === i)) s += '<rect x="' + p[0] + '" y="' + p[1] + '" width="' + cs + '" height="' + cs + '" fill="rgba(255,206,64,.42)"/>';
    }
    for (i = 0; i < 64; i++) {
      var ch = cells[i]; if (ch === '.' || !ch) continue;
      var q = xy(i), a = CVAL[ch.toLowerCase()];
      if (o.mated && ch === o.mated) s += '<circle cx="' + (q[0] + cs / 2) + '" cy="' + (q[1] + cs / 2) + '" r="' + cs * 0.48 + '" fill="rgba(230,30,30,.6)"/>';
      s += chPiece(a, ch !== ch.toLowerCase(), q[0] + 2, q[1] + 2, cs - 4);
    }
    for (var k = 0; k < 8; k++) {
      var file = 'abcdefgh'.charAt(flip ? 7 - k : k), rank = flip ? k + 1 : 8 - k;
      s += '<text x="' + (lab + k * cs + cs - 4) + '" y="' + (cs * 8 + 11) + '" text-anchor="end" font-size="10" font-weight="700" fill="rgba(255,236,210,.6)" font-family="system-ui">' + file + '</text>';
      s += '<text x="4" y="' + (k * cs + cs / 2) + '" dominant-baseline="central" font-size="10" font-weight="700" fill="rgba(255,236,210,.6)" font-family="system-ui">' + rank + '</text>';
    }
    return s + '</svg>';
  }
  var CH_RES = { mate: 'Checkmate', resign: 'Resigned', stalemate: 'Stalemate', repetition: 'Draw by repetition', fifty: 'Draw by the 50-move rule', material: 'Draw: not enough pieces', agreed: 'Draw agreed' };
  R('chess', function (e, ui) {
    var d = e.dt; if (!d || !d.b) return null;
    var nm = names(e), ps = e.players || [], s0 = d.s0 === -1 ? -1 : 1;
    var nameOf = function (side) { return nm[side === s0 ? 0 : 1] || (side === 1 ? 'White' : 'Black'); };
    var humanSide = ps[1] && ps[1].cpu ? s0 : ps[0] && ps[0].cpu ? -s0 : 1;
    var flip = humanSide === -1, fin = String(d.b.join ? d.b.join('') : d.b).split('');
    var uci = String(d.u || '').split(' ').filter(Boolean), san = Array.isArray(e.moves) && e.moves.length === uci.length ? e.moves : null;
    // the king that got mated
    var mated = d.res === 'mate' && d.w ? (d.w === 1 ? 'k' : 'K') : null;
    var lastFin = null;
    if (uci.length) { var tmp = chStart(); uci.forEach(function (m) { lastFin = chApply(tmp, m); }); }
    var snap = ui.picture(chBoard(fin, { flip: flip, last: lastFin, mated: mated, aria: 'Final position' }), { frame: 'wood', max: 360 });
    var out = [ui.section('Final position', snap)];
    var plies = uci.length, moveList = null, spans = [];
    if (san) {
      moveList = ui.el('div', { class: 'hvb-moves' });
      san.forEach(function (m, i) {
        if (i % 2 === 0) moveList.appendChild(ui.el('span', { class: 'no', text: (i / 2 + 1) + '.' }));
        var sp = ui.el('span', { class: 'mv', text: m }); spans.push(sp); moveList.appendChild(sp);
      });
    }
    if (plies > 1) {
      out.push(ui.section('Replay', replay(ui, plies, function (n) {
        var b = chStart(), lm = null;
        for (var i = 0; i < n; i++) lm = chApply(b, uci[i]);
        snap.innerHTML = chBoard(n === plies ? fin : b, { flip: flip, last: lm, mated: n === plies ? mated : null });
        spans.forEach(function (s, i) { s.classList.toggle('on', i === n - 1); });
        if (moveList && spans[n - 1]) moveList.scrollTop = Math.max(0, spans[n - 1].offsetTop - moveList.offsetTop - 50);
        if (!n) return 'Starting position';
        var side = n % 2 ? 1 : -1, mvNo = Math.ceil(n / 2);
        return (n === plies ? 'Final · ' : '') + 'Move ' + mvNo + ' · ' + nameOf(side) + ' (' + (side === 1 ? 'White' : 'Black') + '): ' + (san ? san[n - 1] : uci[n - 1]);
      })));
    }
    if (moveList) out.push(ui.section('Moves', moveList));
    // captures: pieces each side took, biggest first
    var VAL = [0, 1, 3, 3, 5, 9, 0];
    function capRow(str, takerWhite) {
      var list = String(str || '').split('').map(Number).filter(Boolean).sort(function (a, b) { return b - a; });
      var svg = list.length ? '<svg viewBox="0 0 ' + (list.length * 26 + 14) + ' 40" style="width:' + (list.length * 13 + 7) + 'px;height:20px">' + CDEFS + list.map(function (a, i) { return chPiece(a, !takerWhite, i * 26, 0, 40); }).join('') + '</svg>' : '';
      var pts = list.reduce(function (s, a) { return s + VAL[a]; }, 0);
      return ui.el('div', null, [ui.el('span', { text: nameOf(takerWhite ? 1 : -1) }), ui.el('span', { html: svg || '<em>none</em>' }), pts ? ui.el('em', { text: pts + ' pts' }) : null]);
    }
    if (d.cw || d.cb) out.push(ui.section('Captured', ui.el('div', { class: 'hvb-caps' }, [capRow(d.cw, true), capRow(d.cb, false)])));
    out.push(ui.facts([['Result', (CH_RES[d.res] || 'Over') + (d.w ? ': ' + nameOf(d.w) + ' won' : '')], ['Moves', Math.ceil(plies / 2) || ''], ['Computer', d.lv ? d.lv.charAt(0).toUpperCase() + d.lv.slice(1) : '']]));
    return ui.wrap(out);
  });

  // ═════════════════════════════════════════════════════════════════════════
  // Checkers: final board with kings, replay, pieces taken
  // ═════════════════════════════════════════════════════════════════════════
  function ckSq(n) { n = +n - 1; var r = Math.floor(n / 4), c = (n % 4) * 2 + (r % 2 === 0 ? 1 : 0); return r * 8 + c; }
  function ckBoard(cells, o) {
    o = o || {};
    var cs = 40, W = cs * 8, flip = !!o.flip, s = '<svg viewBox="0 0 ' + W + ' ' + W + '" role="img" aria-label="Checkers board"><defs>' +
      '<radialGradient id="hvckr" cx=".38" cy=".3" r=".75"><stop offset="0" stop-color="#ff7470"/><stop offset=".55" stop-color="#cf2230"/><stop offset="1" stop-color="#860d16"/></radialGradient>' +
      '<radialGradient id="hvckb" cx=".38" cy=".3" r=".75"><stop offset="0" stop-color="#8a8a92"/><stop offset=".55" stop-color="#2c2c31"/><stop offset="1" stop-color="#0b0b0d"/></radialGradient></defs>';
    function xy(i) { var r = i >> 3, c = i & 7; if (flip) { r = 7 - r; c = 7 - c; } return [c * cs, r * cs]; }
    for (var i = 0; i < 64; i++) {
      var p = xy(i), dark = ((i >> 3) + (i & 7)) % 2 === 1;
      s += '<rect x="' + p[0] + '" y="' + p[1] + '" width="' + cs + '" height="' + cs + '" fill="' + (dark ? '#231e1b' : '#b82b26') + '"/>';
      if (o.hl && o.hl.indexOf(i) >= 0) s += '<rect x="' + p[0] + '" y="' + p[1] + '" width="' + cs + '" height="' + cs + '" fill="rgba(255,206,64,.26)"/>';
    }
    for (i = 0; i < 64; i++) {
      var ch = cells[i]; if (!ch || ch === '.') continue;
      var q = xy(i), cx = q[0] + cs / 2, cy = q[1] + cs / 2, red = ch.toLowerCase() === 'r', king = ch !== ch.toLowerCase();
      s += '<circle cx="' + cx + '" cy="' + (cy + 2) + '" r="15.5" fill="' + (red ? '#4f070d' : '#000') + '"/>';
      s += '<circle cx="' + cx + '" cy="' + cy + '" r="15.5" fill="' + (red ? '#a5161f' : '#2a2a2f') + '"/>';
      s += '<circle cx="' + cx + '" cy="' + cy + '" r="11.5" fill="url(#' + (red ? 'hvckr' : 'hvckb') + ')" stroke="' + (red ? 'rgba(255,170,160,.35)' : 'rgba(255,255,255,.22)') + '" stroke-width="1"/>';
      if (king) s += '<path transform="translate(' + (cx - 8) + ',' + (cy - 6) + ')" d="M0 10 L1.5 2 L5 6 L8 0 L11 6 L14.5 2 L16 10 Z" fill="#ffd34d" stroke="#8a5a00" stroke-width=".8" stroke-linejoin="round"/>';
    }
    return s + '</svg>';
  }
  function ckStart() { var b = []; for (var s = 0; s < 64; s++) { var r = s >> 3, c = s & 7; b.push((r + c) % 2 ? (r < 3 ? 'b' : r > 4 ? 'r' : '.') : '.'); } return b; }
  function ckApply(b, mv) {
    var jump = mv.indexOf('x') >= 0, sq = mv.split(/[x-]/).map(ckSq), p = b[sq[0]], hl = sq.slice();
    for (var i = 1; i < sq.length; i++) if (jump) b[(sq[i - 1] + sq[i]) / 2] = '.';
    var t = sq[sq.length - 1], row = t >> 3;
    b[sq[0]] = '.';
    if (p === 'b' && row === 7) p = 'B'; else if (p === 'r' && row === 0) p = 'R';
    b[t] = p; return hl;
  }
  R('checkers', function (e, ui) {
    var d = e.dt; if (!d || !d.b) return null;
    var nm = names(e), ps = e.players || [], s0 = d.s0 === -1 ? -1 : 1;
    var nameOf = function (side) { return nm[side === s0 ? 0 : 1] || (side === 1 ? 'Black' : 'Red'); };
    var bottom = ps[1] && ps[1].cpu ? s0 : ps[0] && ps[0].cpu ? -s0 : 1;
    var flip = bottom === 1, fin = String(d.b.join ? d.b.join('') : d.b).split('');
    var mv = String(d.m || '').split(' ').filter(Boolean), lastHl = null;
    if (mv.length) { var tmp = ckStart(); mv.forEach(function (m) { lastHl = ckApply(tmp, m); }); }
    var snap = ui.picture(ckBoard(fin, { flip: flip, hl: lastHl }), { frame: 'wood', max: 340 });
    var out = [ui.section('Final board', snap)];
    if (mv.length > 1) {
      var first = d.first === -1 ? -1 : 1;
      out.push(ui.section('Replay', replay(ui, mv.length, function (n) {
        var b = ckStart(), hl = null;
        for (var i = 0; i < n; i++) hl = ckApply(b, mv[i]);
        snap.innerHTML = ckBoard(n === mv.length ? fin : b, { flip: flip, hl: hl });
        if (!n) return 'Starting board';
        var side = (n - 1) % 2 === 0 ? first : -first, m = mv[n - 1], k = (m.match(/x/g) || []).length;
        return (n === mv.length ? 'Final · ' : '') + 'Move ' + Math.ceil(n / 2) + ' · ' + nameOf(side) + (k ? ' jumped ' + (k > 1 ? k + ' pieces' : 'a piece') : ' moved') + ' (' + m + ')';
      })));
    }
    function cnt(ch) { return fin.filter(function (x) { return x.toLowerCase() === ch; }).length; }
    function kings(ch) { return fin.filter(function (x) { return x === ch.toUpperCase(); }).length; }
    var RES = { wipe: 'All captured', blocked: 'No moves left', resign: 'Resigned', draw: 'Draw' };
    out.push(ui.table(['', 'Left', 'Kings', 'Taken'], [
      [nameOf(1) + ' (Black)', cnt('b'), kings('b'), 12 - cnt('r')],
      [nameOf(-1) + ' (Red)', cnt('r'), kings('r'), 12 - cnt('b')]
    ]));
    out.push(ui.facts([['Result', (RES[d.res] || 'Over') + (d.w ? ': ' + nameOf(d.w) + ' won' : '')], ['Moves', Math.ceil(mv.length / 2) || ''], ['Jumps', d.f === 0 ? 'Optional (house rule)' : 'Must jump']]));
    return ui.wrap(out);
  });

  // ═════════════════════════════════════════════════════════════════════════
  // Tic-tac-toe: the chalk slate with the winning line, a replay
  // ═════════════════════════════════════════════════════════════════════════
  var TT_LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
  var TT_COL = { X: '#9fd3ff', O: '#ffa3b5', T: '#ffe28a' };
  function ttMark(sym, cx, cy, r, w, op) {
    var c = TT_COL[sym] || '#fff', a = ' stroke="' + c + '" stroke-width="' + w + '" stroke-linecap="round" stroke-linejoin="round" fill="none"' + (op ? ' opacity="' + op + '"' : '');
    if (sym === 'X') return '<path d="M' + f2(cx - r) + ' ' + f2(cy - r) + 'L' + f2(cx + r) + ' ' + f2(cy + r) + 'M' + f2(cx + r) + ' ' + f2(cy - r) + 'L' + f2(cx - r) + ' ' + f2(cy + r) + '"' + a + '/>';
    if (sym === 'O') return '<circle cx="' + f2(cx) + '" cy="' + f2(cy) + '" r="' + f2(r) + '"' + a + '/>';
    if (sym === 'T') return '<path d="M' + f2(cx) + ' ' + f2(cy - r) + 'L' + f2(cx + r * 1.05) + ' ' + f2(cy + r * 0.8) + 'L' + f2(cx - r * 1.05) + ' ' + f2(cy + r * 0.8) + 'Z"' + a + '/>';
    if (sym === 'D') return '';
    return '';
  }
  // one 3x3 board at x,y of size sz
  function ttGrid(cells, x, y, sz, o) {
    o = o || {};
    var c = sz / 3, s = '', w = Math.max(1.2, sz / 45), chalk = 'rgba(240,240,232,' + (o.dim ? .35 : .8) + ')';
    for (var k = 1; k < 3; k++) {
      s += '<line x1="' + f2(x + k * c) + '" y1="' + f2(y + c * 0.12) + '" x2="' + f2(x + k * c) + '" y2="' + f2(y + sz - c * 0.12) + '" stroke="' + chalk + '" stroke-width="' + w + '" stroke-linecap="round"/>';
      s += '<line x1="' + f2(x + c * 0.12) + '" y1="' + f2(y + k * c) + '" x2="' + f2(x + sz - c * 0.12) + '" y2="' + f2(y + k * c) + '" stroke="' + chalk + '" stroke-width="' + w + '" stroke-linecap="round"/>';
    }
    for (var i = 0; i < 9; i++) {
      var ch = cells.charAt(i); if (ch === '.' || !ch) continue;
      s += ttMark(ch, x + (i % 3 + .5) * c, y + (Math.floor(i / 3) + .5) * c, c * 0.3, Math.max(1.6, sz / 30), o.dim ? .45 : 0);
      if (o.last === i) s += '<circle cx="' + f2(x + (i % 3 + .5) * c) + '" cy="' + f2(y + (Math.floor(i / 3) + .5) * c) + '" r="' + f2(c * 0.44) + '" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="' + f2(w * .8) + '" stroke-dasharray="3 3"/>';
    }
    if (o.line != null && o.line >= 0) {
      var L = TT_LINES[o.line], a = L[0], b = L[2], ext = 0.3;
      var ax = (a % 3 + .5), ay = (Math.floor(a / 3) + .5), bx = (b % 3 + .5), by = (Math.floor(b / 3) + .5), dx = bx - ax, dy = by - ay, dl = Math.sqrt(dx * dx + dy * dy);
      ax -= dx / dl * ext; ay -= dy / dl * ext; bx += dx / dl * ext; by += dy / dl * ext;
      s += '<line x1="' + f2(x + ax * c) + '" y1="' + f2(y + ay * c) + '" x2="' + f2(x + bx * c) + '" y2="' + f2(y + by * c) + '" stroke="' + (o.lineCol || '#fffbe8') + '" stroke-width="' + f2(w * 2.4) + '" stroke-linecap="round" opacity=".9"/>';
    }
    return s;
  }
  function ttLine(cells) {
    for (var k = 0; k < 8; k++) { var L = TT_LINES[k], a = cells.charAt(L[0]); if (a !== '.' && a !== 'D' && a === cells.charAt(L[1]) && a === cells.charAt(L[2])) return k; }
    return -1;
  }
  function ttSlate(d, boards, meta, o) {
    o = o || {};
    var v = d.v, n = boards.length, s, W, H;
    var bg = function (w, h) { return '<rect width="' + w + '" height="' + h + '" rx="10" fill="#26302c"/><rect width="' + w + '" height="' + h + '" rx="10" fill="url(#hvttg)"/>'; };
    var defs = '<defs><radialGradient id="hvttg" cx=".3" cy=".2" r="1"><stop offset="0" stop-color="#fff" stop-opacity=".07"/><stop offset="1" stop-color="#000" stop-opacity=".25"/></radialGradient></defs>';
    if (v === 'ultimate') {
      W = H = 330; s = defs + bg(W, H);
      var big = 100, gap = 10, ox = 10;
      for (var k = 1; k < 3; k++) {
        var p = ox + k * (big + gap) - gap / 2;
        s += '<line x1="' + p + '" y1="6" x2="' + p + '" y2="' + (H - 6) + '" stroke="rgba(240,240,232,.9)" stroke-width="3" stroke-linecap="round"/><line x1="6" y1="' + p + '" x2="' + (W - 6) + '" y2="' + p + '" stroke="rgba(240,240,232,.9)" stroke-width="3" stroke-linecap="round"/>';
      }
      for (var b = 0; b < 9; b++) {
        var bx = ox + (b % 3) * (big + gap), by = ox + Math.floor(b / 3) * (big + gap), m = meta.charAt(b), won = m && m !== '.' && m !== 'D';
        s += ttGrid(boards[b], bx + 8, by + 8, big - 16, { dim: won, last: o.lastB === b ? o.lastI : -1 });
        if (won) s += ttMark(m, bx + big / 2, by + big / 2, big * 0.34, 6);
      }
      var ml = o.metaLine != null ? o.metaLine : -1;
      if (ml >= 0) s += ttGrid('.........', 10, 10, 310, { line: ml }).replace(/<line[^>]*stroke="rgba\(240[^>]*\/>/g, '');
    } else if (n === 1) {
      W = H = 240; s = defs + bg(W, H) + ttGrid(boards[0], 20, 20, 200, { line: o.lines ? o.lines[0] : -1, last: o.lastB === 0 ? o.lastI : -1 });
    } else {
      var cols = n <= 3 ? n : n === 4 ? 2 : 3, rows = Math.ceil(n / cols), sz = 100, g = 14;
      W = cols * sz + (cols + 1) * g; H = rows * (sz + 18) + (rows + 1) * g - 4; s = defs + bg(W, H);
      for (var i = 0; i < n; i++) {
        var gx = g + (i % cols) * (sz + g), gy = g + Math.floor(i / cols) * (sz + 18 + g), mm = meta.charAt(i);
        s += ttGrid(boards[i], gx, gy, sz, { line: o.lines ? o.lines[i] : -1, last: o.lastB === i ? o.lastI : -1 });
        s += '<text x="' + (gx + sz / 2) + '" y="' + (gy + sz + 14) + '" text-anchor="middle" font-size="11" font-weight="800" fill="' + (TT_COL[mm] || 'rgba(240,240,232,.5)') + '" font-family="system-ui">Board ' + (i + 1) + (mm === 'D' ? ': draw' : mm && mm !== '.' ? ': ' + (mm === 'T' ? 'triangle' : mm) : '') + '</text>';
      }
    }
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Tic-tac-toe board">' + s + '</svg>';
  }
  R('tictactoe', function (e, ui) {
    var d = e.dt; if (!d || !d.b) return null;
    var nm = names(e), sy = String(d.sy || 'XO'), boards = [].concat(d.b).map(String), meta = String(d.m || '');
    var lines = String(d.l || '').split('').map(function (ch) { return ch === '-' ? -1 : +ch; });
    var snap = ui.picture(ttSlate(d, boards, meta, { lines: lines, metaLine: d.ml }), { max: d.v === 'ultimate' ? 340 : boards.length > 1 ? 360 : 260 });
    var out = [ui.section(boards.length > 1 && d.v !== 'ultimate' ? 'Final boards' : 'Final board', snap)];
    var mv = String(d.mv || ''), N = Math.floor(mv.length / 3);
    if (N > 1) {
      out.push(ui.section('Replay', replay(ui, N, function (n) {
        if (n === N) { snap.innerHTML = ttSlate(d, boards, meta, { lines: lines, metaLine: d.ml }); }
        else {
          var bs = boards.map(function () { return '.........'.split(''); }), lb = -1, li = -1;
          for (var i = 0; i < n; i++) { lb = +mv.charAt(i * 3); li = +mv.charAt(i * 3 + 1); bs[lb][li] = sy.charAt(+mv.charAt(i * 3 + 2)) || 'X'; }
          var bstr = bs.map(function (x) { return x.join(''); }), mt = '', ls = [];
          bstr.forEach(function (x) { var l = ttLine(x); ls.push(l); mt += l >= 0 ? x.charAt(TT_LINES[l][0]) : x.indexOf('.') < 0 ? 'D' : '.'; });
          snap.innerHTML = ttSlate(d, bstr, mt, { lines: ls, lastB: lb, lastI: li });
        }
        if (!n) return 'Empty board';
        var p = +mv.charAt(n * 3 - 1), cell = +mv.charAt(n * 3 - 2), bd = +mv.charAt(n * 3 - 3);
        var where = ['top left', 'top middle', 'top right', 'middle left', 'center', 'middle right', 'bottom left', 'bottom middle', 'bottom right'][cell];
        return (n === N ? 'Final · ' : '') + 'Move ' + n + ' · ' + (nm[p] || 'Player') + ' (' + (sy.charAt(p) === 'T' ? 'triangle' : sy.charAt(p)) + ') ' + where + (boards.length > 1 ? ' of board ' + (bd + 1) : '');
      })));
    }
    out.push(ui.facts([['Moves', N || ''], ['Board', d.v === 'ultimate' ? 'Ultimate' : boards.length > 1 ? boards.length + ' boards' : 'Classic'], ['Computer', d.lv ? { easy: 'Easy', med: 'Medium', hard: 'Hard' }[d.lv] : '']]));
    return ui.wrap(out);
  });

  // ═════════════════════════════════════════════════════════════════════════
  // Chinese checkers: the star at the end, who got how far
  // ═════════════════════════════════════════════════════════════════════════
  var ccG = null;
  function ccGeo() {
    if (ccG) return ccG;
    var C = [], PX = [], PY = [], H3 = Math.sqrt(3) / 2, PT = [], IDX = {};
    for (var z = -8; z <= 8; z++) for (var x = -8; x <= 8; x++) {
      var y = -x - z; if (y < -8 || y > 8) continue;
      if (!(x <= 4 && y <= 4 && z <= 4) && !(x >= -4 && y >= -4 && z >= -4)) continue;
      IDX[x + ',' + z] = C.length; C.push([x, y, z]); PX.push(x + z / 2); PY.push(z * H3);
    }
    var regs = [];
    [[0, 1], [0, -1], [1, 1], [1, -1], [2, 1], [2, -1]].forEach(function (r) {
      var cells = []; for (var i = 0; i < C.length; i++) if (C[i][r[0]] * r[1] > 4) cells.push(i);
      var sx = 0, sy = 0; cells.forEach(function (j) { sx += PX[j]; sy += PY[j]; });
      var ang = Math.atan2(sy, sx) * 180 / Math.PI; regs.push({ cells: cells, a: ((ang - 90) % 360 + 360) % 360 });
    });
    regs.sort(function (a, b) { return a.a - b.a; });
    regs.forEach(function (r, k) { PT[k] = r.cells; });
    function hd(a, b) { var A = C[a], B = C[b]; return (Math.abs(A[0] - B[0]) + Math.abs(A[1] - B[1]) + Math.abs(A[2] - B[2])) / 2; }
    var TIP = PT.map(function (cells) { return cells.filter(function (c) { var Q = C[c]; return Math.max(Math.abs(Q[0]), Math.abs(Q[1]), Math.abs(Q[2])) === 8; })[0]; });
    var D6 = [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]], NB = C.map(function (c) { return D6.map(function (d) { var j = IDX[(c[0] + d[0]) + ',' + (c[2] + d[1])]; return j == null ? -1 : j; }); });
    ccG = { C: C, PX: PX, PY: PY, PT: PT, TIP: TIP, NB: NB, hd: hd, N: C.length };
    return ccG;
  }
  var CC_HEX = { red: '#ff5a5f', blue: '#5b9bff', green: '#3fd27a', yellow: '#ffd23f', purple: '#b18cff', white: '#f4f1e8' };
  var CC_TINT = { red: '#e0242c', blue: '#2a6ae8', green: '#1fae52', yellow: '#f5c20a', purple: '#6a3fa8', white: '#f4f1e8' };
  // the route a marble took from f to t on board b (before the move): a step, or the shortest chain of hops
  function ccPath(g, b, f, t) {
    if (g.NB[f].indexOf(t) >= 0) return [f, t];
    var par = {}, q = [f], qi = 0; par[f] = -1;
    while (qi < q.length) {
      var c = q[qi++]; if (c === t) break;
      for (var d = 0; d < 6; d++) { var m = g.NB[c][d]; if (m < 0 || m === f || !b[m]) continue; var j = g.NB[m][d]; if (j < 0 || (b[j] && j !== f) || par[j] !== undefined) continue; par[j] = c; q.push(j); }
    }
    if (par[t] === undefined) return [f, t];
    var p = [t]; while (par[p[0]] !== -1) p.unshift(par[p[0]]);
    return p;
  }
  // b: 121 numbers (0 empty, else player + 1); o.path: the move just made
  function ccSvg(g, b, pts, cols, o) {
    o = o || {};
    var poly = [], k;
    for (k = 0; k < 6; k++) { var a = (90 + 60 * k) * Math.PI / 180; poly.push(f2(7.62 * Math.cos(a)) + ',' + f2(7.62 * Math.sin(a))); }
    var s = '<svg viewBox="-7 -8.08 14 16.16" role="img" aria-label="Chinese checkers board"><defs>' +
      '<linearGradient id="hvccw" x1="0" y1="0" x2=".35" y2="1"><stop offset="0" stop-color="#9a5a2c"/><stop offset=".45" stop-color="#7a4220"/><stop offset="1" stop-color="#4f2810"/></linearGradient>' +
      '<radialGradient id="hvcch" cx=".5" cy=".58" r=".6"><stop offset="0" stop-color="#2a160a"/><stop offset="1" stop-color="#050201"/></radialGradient>' +
      '<radialGradient id="hvccm" cx=".35" cy=".3" r=".75"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".4" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".35"/></radialGradient></defs>' +
      '<polygon points="' + poly.join(' ') + '" fill="url(#hvccw)" stroke="#3a1d0a" stroke-width=".12" stroke-linejoin="round"/>';
    var star = [];
    for (k = 0; k < 12; k++) { var rr = k % 2 ? 4.72 : 7.9, aa = (90 + 30 * k) * Math.PI / 180; star.push(f2(rr * Math.cos(aa)) + ',' + f2(rr * Math.sin(aa))); }
    s += '<clipPath id="hvccclip"><polygon points="' + poly.join(' ') + '"/></clipPath><g clip-path="url(#hvccclip)"><polygon points="' + star.join(' ') + '" fill="rgba(40,16,4,.28)" stroke="rgba(255,222,170,.28)" stroke-width=".06"/></g>';
    pts.forEach(function (pt, p) {
      var cells = g.PT[pt], col = CC_TINT[cols[p]] || '#888'; if (!cells) return;
      var tip = g.TIP[pt], far = cells.filter(function (c) { return g.hd(c, tip) === 3; }), a1 = far[0], b1 = far[far.length - 1];
      var cx = (g.PX[tip] + g.PX[a1] + g.PX[b1]) / 3, cy = (g.PY[tip] + g.PY[a1] + g.PY[b1]) / 3;
      s += '<polygon points="' + [tip, a1, b1].map(function (c) { return f2(cx + (g.PX[c] - cx) * 1.46) + ',' + f2(cy + (g.PY[c] - cy) * 1.46); }).join(' ') + '" fill="' + col + '" fill-opacity="' + (cols[p] === 'white' ? .2 : .3) + '" stroke="' + col + '" stroke-opacity=".55" stroke-width=".07" stroke-linejoin="round"/>';
    });
    for (var i = 0; i < g.N; i++) {
      var x = f2(g.PX[i]), y = f2(g.PY[i]), v = b[i];
      s += '<circle cx="' + x + '" cy="' + f2(g.PY[i] + .035) + '" r=".3" fill="rgba(255,214,160,.22)"/><circle cx="' + x + '" cy="' + y + '" r=".285" fill="url(#hvcch)"/>';
      if (v) {
        var mc = CC_HEX[cols[v - 1]] || '#ccc';
        s += '<circle cx="' + x + '" cy="' + f2(g.PY[i] + .06) + '" r=".4" fill="rgba(0,0,0,.45)"/><circle cx="' + x + '" cy="' + y + '" r=".38" fill="' + mc + '"/><circle cx="' + x + '" cy="' + y + '" r=".38" fill="url(#hvccm)"/>';
      }
    }
    if (o.path && o.path.length > 1) {
      var P = o.path, ln = P.map(function (c) { return f2(g.PX[c]) + ',' + f2(g.PY[c]); }).join(' ');
      s += '<polyline points="' + ln + '" fill="none" stroke="rgba(255,236,190,.9)" stroke-width=".11" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray=".22 .16"/>';
      s += '<circle cx="' + f2(g.PX[P[0]]) + '" cy="' + f2(g.PY[P[0]]) + '" r=".36" fill="none" stroke="rgba(255,236,190,.8)" stroke-width=".07"/>';
      P.slice(1, -1).forEach(function (c) { s += '<circle cx="' + f2(g.PX[c]) + '" cy="' + f2(g.PY[c]) + '" r=".11" fill="rgba(255,236,190,.9)"/>'; });
      var e1 = P[P.length - 1]; s += '<circle cx="' + f2(g.PX[e1]) + '" cy="' + f2(g.PY[e1]) + '" r=".48" fill="none" stroke="#fff" stroke-width=".09"/>';
    }
    return s + '</svg>';
  }
  R('chinesecheckers', function (e, ui) {
    var d = e.dt; if (!d || !d.b) return null;
    var B = HistView.boardUI, g = ccGeo(), fb = String(d.b).split('').map(Number), pts = String(d.pt || '').split('').map(Number), cols = d.c || [], nm = d.n || names(e);
    if (fb.length !== g.N) return null;
    var fin = d.fin || [], mv = d.mv || [], ch = d.ch || [], hm = d.hm || [], out = [];
    // the replay: every position from the start, rebuilt from the move list
    var ml = String(d.ml || ''), steps = null;
    if (ml.length >= 8 && ml.length % 4 === 0) {
      var b = []; for (var i = 0; i < g.N; i++) b.push(0);
      pts.forEach(function (pt, p) { (g.PT[pt] || []).forEach(function (c) { b[c] = p + 1; }); });
      steps = [{ b: b }];
      for (i = 0; i < ml.length; i += 4) {
        var f = parseInt(ml.substr(i, 2), 36), t = parseInt(ml.substr(i + 2, 2), 36), p = b[f] - 1;
        if (p < 0 || b[t]) { steps = null; break; }
        var path = ccPath(g, b, f, t); b = b.slice(); b[f] = 0; b[t] = p + 1;
        steps.push({ b: b, p: p, path: path, h: path.length > 2 || g.NB[f].indexOf(t) < 0 ? path.length - 1 : 0 });
      }
      if (steps && steps[steps.length - 1].b.join('') !== fb.join('')) steps = null;
    }
    // how far each player had to go: hex steps to their goal tip, as a share of where they started
    function togo(bb, p) { var tip = g.TIP[(pts[p] + 3) % 6], s = 0; for (var c = 0; c < g.N; c++) if (bb[c] === p + 1) s += g.hd(c, tip); return s - 20; }
    var w = fin[0], bestCh = -1; ch.forEach(function (h, i) { if (bestCh < 0 || h > ch[bestCh]) bestCh = i; });
    out.push(ui.stats([['Winner', w != null ? mv[w] : null, w != null ? 'moves · ' + nm[w] : ''], ['Longest chain', bestCh >= 0 && ch[bestCh] ? ch[bestCh] : null, bestCh >= 0 && ch[bestCh] ? 'hops · ' + nm[bestCh] : ''], ['Rounds', d.r || null, nm.length + (nm.length === 1 ? ' player' : ' players')]]));
    var snap = ui.picture(ccSvg(g, fb, pts, cols, { path: steps ? steps[steps.length - 1].path : null }), { max: 330 });
    out.push(ui.section(steps ? 'The board' : 'Final board', steps ? snap : [snap, B.key(ui, nm.map(function (x, p) { return [x, CC_HEX[cols[p]] || ui.color(p)]; }))]));
    if (steps) {
      var N = steps.length - 1, start = steps[0].b, base = nm.map(function (x, p) { return togo(start, p) || 1; });
      var prog = nm.map(function () { return []; });
      steps.forEach(function (st) { nm.forEach(function (x, p) { prog[p].push(Math.round(100 * (1 - togo(st.b, p) / base[p]))); }); });
      var chart = B.chart(ui, nm.map(function (x, p) { return { v: prog[p], c: CC_HEX[cols[p]] || ui.color(p) }; }), { lo: 0, hi: 100, from: 'Start', to: 'Move ' + N, aria: 'How far across the star each player had got' });
      out.push(ui.section('Replay', B.replay(ui, N, function (n) {
        var st = steps[n];
        snap.innerHTML = ccSvg(g, st.b, pts, cols, { path: st.path });
        chart.at(n);
        if (!n) return 'Everyone in their home point';
        return 'Move ' + n + ' · ' + (nm[st.p] || 'Player') + (st.h > 1 ? ' hopped ' + st.h + ' times' : st.h === 1 ? ' hopped' : ' stepped') + ' · ' + prog[st.p][n] + '% of the way';
      }, { start: N, ms: Math.max(90, Math.min(400, 20000 / N)) })));
      out.push(ui.section('The race across the star', [chart, B.key(ui, nm.map(function (x, p) { return [x, CC_HEX[cols[p]] || ui.color(p)]; }))]));
    }
    var order = fin.slice(); nm.forEach(function (x, i) { if (order.indexOf(i) < 0) order.push(i); });
    var rows = order.map(function (i) {
      var place = fin.indexOf(i);
      return [nm[i] || 'Player', { t: place >= 0 ? ['1st', '2nd', '3rd', '4th', '5th', '6th'][place] : '–', c: place === 0 ? 'hi' : '' }, (hm[i] != null ? hm[i] : '–') + '/10', mv[i] != null ? mv[i] : '–', ch[i] || 0];
    });
    if (nm.length > 1) out.push(ui.section('How far everyone got', ui.table(['', 'Place', 'Home', 'Moves', 'Best hops'], rows)));
    // what decided it
    if (w != null && nm[w]) {
      var why = nm[w] + ' filled the goal point in ' + mv[w] + ' moves';
      if (nm.length > 1) { var ru = order[1]; why += ru != null && hm[ru] != null ? '; ' + nm[ru] + ' had ' + hm[ru] + ' of 10 home' : ''; }
      if (bestCh === w && ch[w] >= 4) why += '. A ' + ch[w] + '-hop chain helped';
      out.push(B.foot(ui, why, 'trophy'));
    }
    return ui.wrap(out);
  });

  // ═════════════════════════════════════════════════════════════════════════
  // Mastermind: the board guess by guess (the code stays covered until the end), how fast the guesses closed in
  // ═════════════════════════════════════════════════════════════════════════
  var MM_PEG = ['#e8323c', '#ff8a1f', '#ffd23a', '#27b856', '#2f78ff', '#9a4dff', '#ff6fb5', '#f2efe8'];
  var MM_NAME = ['Red', 'Orange', 'Yellow', 'Green', 'Blue', 'Purple', 'Pink', 'White'];
  // o: {upTo: rows shown (others empty holes), hide: cover the code, hot: row to light}
  function mmBoard(code, guesses, P, C, label, o) {
    o = o || {};
    var shown = o.upTo == null ? guesses.length : o.upTo;
    var hole = 26, rh = 34, keyW = P === 5 ? 34 : 26, W = 26 + P * hole + 12 + keyW + 10, H = rh + 10 + Math.max(1, guesses.length) * rh + 10;
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + (label || 'Mastermind board') + '"><defs><radialGradient id="hvmmp" cx=".35" cy=".3" r=".75"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".35"/></radialGradient></defs>';
    function empty(cx, cy, r) { return '<circle cx="' + cx + '" cy="' + cy + '" r="' + (r * .42) + '" fill="#1c120a" stroke="rgba(0,0,0,.4)" stroke-width="1"/><circle cx="' + cx + '" cy="' + (cy + .8) + '" r="' + (r * .42) + '" fill="none" stroke="rgba(255,220,170,.18)" stroke-width=".8"/>'; }
    function peg(c, cx, cy, r) {
      if (c === C || MM_PEG[c] == null) return '<circle cx="' + cx + '" cy="' + cy + '" r="' + (r - 2) + '" fill="#1c120a" stroke="rgba(255,236,210,.35)" stroke-width="1.2" stroke-dasharray="2.5 2"/>';
      return '<circle cx="' + cx + '" cy="' + (cy + 1.5) + '" r="' + r + '" fill="rgba(0,0,0,.45)"/><circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + MM_PEG[c] + '"/><circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="url(#hvmmp)"/>';
    }
    // secret code row, under a shield until it's solved
    s += '<rect x="22" y="4" width="' + (P * hole + 8) + '" height="' + (rh - 2) + '" rx="8" fill="rgba(0,0,0,.35)"/>';
    s += '<text x="12" y="' + (4 + rh / 2) + '" text-anchor="middle" dominant-baseline="central" font-size="8" font-weight="900" fill="rgba(255,236,210,.55)" font-family="system-ui" transform="rotate(-90 12 ' + (4 + rh / 2) + ')">CODE</text>';
    if (o.hide) s += '<rect x="24" y="6" width="' + (P * hole + 4) + '" height="' + (rh - 6) + '" rx="6" fill="#3a2414" stroke="rgba(255,220,170,.25)"/><text x="' + (26 + P * hole / 2) + '" y="' + (4 + rh / 2) + '" text-anchor="middle" dominant-baseline="central" font-size="13" font-weight="900" letter-spacing="6" fill="rgba(255,236,210,.45)" font-family="system-ui">' + new Array(P + 1).join('?') + '</text>';
    else code.forEach(function (c, i) { s += peg(c, 26 + i * hole + hole / 2, 4 + rh / 2 - 1, 10); });
    s += '<line x1="6" y1="' + (rh + 6) + '" x2="' + (W - 6) + '" y2="' + (rh + 6) + '" stroke="rgba(0,0,0,.4)" stroke-width="2"/>';
    guesses.forEach(function (gr, r) {
      var y = rh + 10 + r * rh + rh / 2, on = r < shown;
      if (o.hot === r) s += '<rect x="3" y="' + (y - rh / 2 + 1) + '" width="' + (W - 6) + '" height="' + (rh - 2) + '" rx="8" fill="rgba(255,213,74,.14)" stroke="rgba(255,213,74,.6)" stroke-width="1.2"/>';
      s += '<text x="12" y="' + y + '" text-anchor="middle" dominant-baseline="central" font-size="10" font-weight="800" fill="rgba(255,236,210,' + (on ? .45 : .2) + ')" font-family="system-ui">' + (r + 1) + '</text>';
      gr.g.forEach(function (c, i) { s += on ? peg(c, 26 + i * hole + hole / 2, y, 9.5) : empty(26 + i * hole + hole / 2, y, 9.5); });
      var kx = 26 + P * hole + 12, per = P === 5 ? 3 : 2;
      for (var k = 0; k < P; k++) {
        var col = k % per, row = Math.floor(k / per), cx = kx + 5 + col * 10, cy = y - 5 + row * 10;
        var fill = on ? (k < gr.b ? '#111' : k < gr.b + gr.w ? '#f4f1e8' : null) : null;
        s += fill ? '<circle cx="' + cx + '" cy="' + cy + '" r="3.8" fill="' + fill + '" stroke="' + (k < gr.b ? 'rgba(255,255,255,.35)' : 'rgba(0,0,0,.4)') + '" stroke-width=".8"/>' : '<circle cx="' + cx + '" cy="' + cy + '" r="2" fill="rgba(0,0,0,.45)"/>';
      }
    });
    return s + '</svg>';
  }
  // How many codes still fit every answer so far, after each guess (the start included)
  function mmLeft(gs, P, K, dup) {
    var codes = [], cur = [];
    (function gen(i, used) {
      if (codes.length > 60000) return;
      if (i === P) { codes.push(cur.slice()); return; }
      for (var c = 0; c < K; c++) { if (!dup && used[c]) continue; cur[i] = c; used[c] = 1; gen(i + 1, used); used[c] = 0; }
    })(0, []);
    function fb(a, b) {
      var bl = 0, ca = [], cb = [], k; for (k = 0; k < K; k++) { ca.push(0); cb.push(0); }
      for (k = 0; k < P; k++) { if (a[k] === b[k]) bl++; else { ca[a[k]]++; cb[b[k]]++; } }
      var wh = 0; for (k = 0; k < K; k++) wh += Math.min(ca[k], cb[k]);
      return bl * 10 + wh;
    }
    var out = [codes.length], live = codes;
    gs.forEach(function (gr) { var want = gr.b * 10 + gr.w; live = live.filter(function (c) { return fb(c, gr.g) === want; }); out.push(live.length); });
    return out;
  }
  R('codebreaker', function (e, ui) {
    var d = e.dt; if (!d || !d.r || !d.r.length) return null;
    var B = HistView.boardUI, nm = names(e), P = +d.P || 4, C = +d.C, K = C + (d.bl ? 1 : 0), out = [];
    var rounds = d.r.map(function (rd, ri) {
      var code = String(rd.c || '').split('').map(Number);
      var gs = String(rd.g || '').split(' ').filter(Boolean).map(function (x) { var p = x.split(':'); return { g: p[0].split('').map(Number), b: +(p[1] || '00').charAt(0), w: +(p[1] || '00').charAt(1) }; });
      return { rd: rd, code: code, gs: gs, i: ri };
    });
    // repeats allowed? (older records don't say: any repeat in a code or guess means yes; 5 pegs always allow them)
    var dup = d.dp != null ? !!d.dp : P === 5 || rounds.some(function (r) { return [r.code].concat(r.gs.map(function (g) { return g.g; })).some(function (a) { return a.some(function (c, i) { return a.indexOf(c) !== i; }); }); });
    var area = ui.el('div', { class: 'hv' });
    function show(ri) {
      var R0 = rounds[ri], rd = R0.rd, code = R0.code, gs = R0.gs, N = gs.length, kids = [];
      var cname = code.map(function (c) { return c === C ? 'Blank' : MM_NAME[c] || '?'; }).join(', ');
      var left = null; try { left = mmLeft(gs, P, K, dup); } catch (err) {}
      kids.push(ui.stats([[rd.ok ? 'Cracked in' : 'Guesses', N, rd.ok ? (N === 1 ? 'guess' : 'guesses') + (nm[rd.k] ? ' · ' + nm[rd.k] : '') : 'never cracked'], ['Possible codes', left ? left[0].toLocaleString('en-US') : null, P + ' holes · ' + K + (d.bl ? ' with blank' : ' colors') + (dup ? ' · repeats' : '')],
        ['After guess 1', left && left.length > 1 ? left[1].toLocaleString('en-US') : null, left && left.length > 1 ? 'codes still fit' : '']]));
      var snap = ui.picture(mmBoard(code, gs, P, C, 'Code: ' + cname), { frame: 'wood', max: P === 5 ? 280 : 250 });
      kids.push(snap);
      var ch = null;
      if (left && N > 1) {
        // log scale: 1296 down to 1 reads as steady steps
        var lv = left.map(function (n) { return Math.log(Math.max(1, n)) / Math.LN10; });
        ch = B.chart(ui, [{ v: lv, c: '#ffd54a', fill: 'rgba(255,213,74,.12)' }], { lo: 0, hi: Math.max(1, lv[0]), h: 90, from: left[0].toLocaleString('en-US') + ' possible', to: (left[N] === 1 ? 'One left' : left[N] + ' left'), aria: 'Codes still possible after each guess' });
      }
      if (N > 1) kids.push(B.replay(ui, N, function (n) {
        snap.innerHTML = mmBoard(code, gs, P, C, 'Code: ' + cname, { upTo: n, hide: n < N || !rd.ok && n < N, hot: n ? n - 1 : null });
        if (ch) ch.at(n);
        if (!n) return 'The code is set: ' + (left ? left[0].toLocaleString('en-US') + ' codes it could be' : 'four holes to fill');
        var g = gs[n - 1], fit = left ? left[n] : null;
        var a = 'Guess ' + n + ': ' + (g.b === P ? 'all ' + P + ' right!' : (g.b ? g.b + ' right spot' : 'none in the right spot') + (g.w ? ', ' + g.w + ' right color' : ''));
        return a + (fit != null && g.b !== P ? ' · ' + (fit === 1 ? 'only 1 code fits now' : fit.toLocaleString('en-US') + ' codes still fit') : '') + (n === N && !rd.ok ? ' · out of rows' : '');
      }, { start: N, ms: 900 }));
      if (ch) kids.push(ui.section('Codes still possible, guess by guess', ch));
      kids.push(ui.facts([['Code', cname]]));
      // what decided it
      var why = '';
      if (left && rd.ok) {
        var one = left.indexOf(1);
        why = N === 1 ? 'A lucky first guess' : one > 0 && one < N ? 'Guess ' + one + ' left only one possible code; guess ' + N + ' played it'
          : 'Guess ' + (N - 1) + ' left ' + left[N - 1].toLocaleString('en-US') + ' codes that fit, and guess ' + N + ' picked the right one';
      } else if (!rd.ok) why = 'The code held' + (left ? left[N] === 1 ? ': only one code still fit, so one more row would have cracked it' : ' with ' + left[N].toLocaleString('en-US') + ' codes still possible after the last row' : '');
      kids.push(B.foot(ui, why, rd.ok ? 'key' : 'lock'));
      area.innerHTML = ''; kids.forEach(function (k) { if (k) area.appendChild(k); });
    }
    if (rounds.length > 1) {
      out.push(ui.section('Each round · tap one', B.strip(ui, rounds.map(function (r) {
        return { t: 'Round ' + (r.i + 1), s: (nm[r.rd.m] || 'Player') + '’s code · ' + (r.rd.ok ? r.gs.length + (r.gs.length === 1 ? ' guess' : ' guesses') : 'held'), c: ui.color(r.rd.m >= 0 ? r.rd.m : 0), hot: !r.rd.ok };
      }), rounds.length - 1, show)));
    } else {
      var r0 = rounds[0].rd;
      out.push(ui.el('h4', { class: 'hv-h', text: r0.m >= 0 && nm[r0.m] ? nm[r0.m] + "'s code" : 'The secret code' }));
      show(0);
    }
    out.push(area);
    return ui.wrap(out);
  });

  // ═════════════════════════════════════════════════════════════════════════
  // Dominoes: the last hand's line of play, and what everyone was left holding
  // ═════════════════════════════════════════════════════════════════════════
  var PIPS = { 0: [], 1: [[1, 1]], 2: [[0, 0], [2, 2]], 3: [[0, 0], [1, 1], [2, 2]], 4: [[0, 0], [0, 2], [2, 0], [2, 2]], 5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]], 6: [[0, 0], [1, 0], [2, 0], [0, 2], [1, 2], [2, 2]] };
  // a tile a|b in a hand; vertical = standing up (a on top). pips = [row, col] in a 3x3 grid on each half
  function domSvg(a, b, vert, cls) {
    var u = 20, s = '';
    function half(v, ox, oy) {
      return (PIPS[v] || []).map(function (p) {
        var px = vert ? p[1] : p[0], py = vert ? p[0] : p[1];
        return '<circle cx="' + (ox + 4.5 + px * 5.5) + '" cy="' + (oy + 4.5 + py * 5.5) + '" r="1.9" fill="#1b1712"/>';
      }).join('');
    }
    var W = vert ? u : 2 * u, H = vert ? 2 * u : u;
    s += '<rect x=".5" y=".5" width="' + (W - 1) + '" height="' + (H - 1) + '" rx="3" fill="#f6f0e0" stroke="#b9ad92"/>';
    s += vert ? '<line x1="3" y1="' + u + '" x2="' + (u - 3) + '" y2="' + u + '" stroke="#8d8270" stroke-width="1"/>' : '<line x1="' + u + '" y1="3" x2="' + u + '" y2="' + (u - 3) + '" stroke="#8d8270" stroke-width="1"/>';
    s += half(a, 0, 0) + (vert ? half(b, 0, u) : half(b, u, 0));
    return '<svg class="' + (vert ? 'v' : 'h') + (cls ? ' ' + cls : '') + '" viewBox="0 0 ' + W + ' ' + H + '" aria-label="' + a + '-' + b + '">' + s + '</svg>';
  }
  function domPairs(str) { var o = []; str = String(str || ''); for (var i = 0; i + 1 < str.length; i += 2) o.push([+str.charAt(i), +str.charAt(i + 1)]); return o; }
  // ── the line of play, laid out the way the game lays it out (games/dominoes.html: place, reroot, layout) ──
  function dmPlace(L, t, end, fives) {
    if (!L) return { root: { t: [t[0], t[1]] }, arms: { E: [], W: [], N: [], S: [] }, spin: fives && t[0] === t[1] };
    L = JSON.parse(JSON.stringify(L));
    var v = dmEnds(L).filter(function (e) { return e.end === end; })[0];
    if (!v) return null;
    v = v.v;
    var o = t[0] === v ? [t[0], t[1]] : [t[1], t[0]];
    L.arms[end].push({ t: o });
    if (fives && !L.spin && o[0] === o[1]) {   // the first double in All Fives becomes the spinner
      var arm = L.arms[end], sp = arm.pop(), back = [];
      for (var j = arm.length - 1; j >= 0; j--) back.push({ t: [arm[j].t[1], arm[j].t[0]] });
      var r = L.root.t;
      if (end === 'W') { L.arms.E = back.concat([{ t: [r[0], r[1]] }], L.arms.E); L.arms.W = []; }
      else { L.arms.W = back.concat([{ t: [r[1], r[0]] }], L.arms.W); L.arms.E = []; }
      L.root = { t: sp.t }; L.spin = true;
    }
    return L;
  }
  function dmEnds(L) {
    var r = L.root, A = L.arms, last = function (a) { return a[a.length - 1]; }, out = [];
    out.push({ end: 'E', v: A.E.length ? last(A.E).t[1] : r.t[1] });
    out.push({ end: 'W', v: A.W.length ? last(A.W).t[1] : r.t[0] });
    if (L.spin && A.E.length && A.W.length) { out.push({ end: 'N', v: A.N.length ? last(A.N).t[1] : r.t[0] }); out.push({ end: 'S', v: A.S.length ? last(A.S).t[1] : r.t[0] }); }
    return out;
  }
  var DM = (function () {
    var DV = { E: [1, 0], W: [-1, 0], N: [0, -1], S: [0, 1] }, ROT = { N: 0, E: 90, S: 180, W: -90 }, OPP = { E: 'W', W: 'E', N: 'S', S: 'N' }, EPS = 0.01;
    function rectOf(g) { return { x0: g.cx - g.w / 2, x1: g.cx + g.w / 2, y0: g.cy - g.h / 2, y1: g.cy + g.h / 2 }; }
    function overlap(a, b) { return a.x0 < b.x1 - EPS && b.x0 < a.x1 - EPS && a.y0 < b.y1 - EPS && b.y0 < a.y1 - EPS; }
    function geom(st, kind, d2, dbl) {
      var P = st.P, dv = DV[st.d], horiz;
      if (kind === 's') {
        horiz = dv[1] === 0;
        if (dbl) return { cx: P[0] + .5 * dv[0], cy: P[1] + .5 * dv[1], w: horiz ? 1 : 2, h: horiz ? 2 : 1, rot: horiz ? 0 : 90, np: [P[0] + dv[0], P[1] + dv[1]], nd: st.d, cross: true };
        return { cx: P[0] + dv[0], cy: P[1] + dv[1], w: horiz ? 2 : 1, h: horiz ? 1 : 2, rot: ROT[OPP[st.d]], np: [P[0] + 2 * dv[0], P[1] + 2 * dv[1]], nd: st.d };
      }
      var d2v = DV[d2], M;
      if (kind === 't') M = [P[0] + .5 * dv[0], P[1] + .5 * dv[1]];
      else { var off = st.cx + .5; M = [P[0] - .5 * dv[0] + off * d2v[0], P[1] - .5 * dv[1] + off * d2v[1]]; }
      horiz = d2v[1] === 0;
      return { cx: M[0] + .5 * d2v[0], cy: M[1] + .5 * d2v[1], w: horiz ? 2 : 1, h: horiz ? 1 : 2, rot: ROT[OPP[d2]], np: [M[0] + 1.5 * d2v[0], M[1] + 1.5 * d2v[1]], nd: d2 };
    }
    function regionOK(arm, r, spin, RR) {
      if (!spin) {
        if (arm === 'E') return r.y0 >= -1 - EPS && (r.y0 >= 1 - EPS || r.x0 >= RR.x1 - EPS);
        return r.y1 <= 1 + EPS && (r.y1 <= -1 + EPS || r.x1 <= RR.x0 + EPS);
      }
      if (arm === 'E') return r.x0 >= .5 - EPS && r.y0 >= -1 - EPS && (r.y1 <= 1 + EPS || r.x0 >= 1 - EPS);
      if (arm === 'S') return r.y0 >= 1 - EPS && r.x1 <= 1 + EPS;
      if (arm === 'W') return r.x1 <= -.5 + EPS && r.y1 <= 1 + EPS && (r.y0 >= -1 - EPS || r.x1 <= -1 + EPS);
      return r.y1 <= -1 + EPS && r.x0 >= -1 - EPS;
    }
    function stepArm(st, ctx, dbl, relax) {
      var tries = st.mode === 'run' ? [['s'], ['t', st.pd], ['h', st.pd], ['t', OPP[st.pd]], ['h', OPP[st.pd]]] : [['t', OPP[st.lastMain]], ['h', OPP[st.lastMain]], ['s'], ['t', st.lastMain], ['h', st.lastMain]];
      for (var i = 0; i < tries.length; i++) {
        var k = tries[i][0], d2 = tries[i][1], g = geom(st, k, d2, dbl && k === 's'), r = rectOf(g);
        if (relax < 2) {
          if (r.x0 < -ctx.W / 2 - EPS || r.x1 > ctx.W / 2 + EPS || r.y0 < -ctx.H / 2 - EPS || r.y1 > ctx.H / 2 + EPS) continue;
          if (relax < 1 && !regionOK(st.arm, r, ctx.spin, ctx.RR)) continue;
          if (ctx.rects.some(function (q) { return overlap(q, r); })) continue;
        }
        var ns = { arm: st.arm, P: g.np, d: g.nd, pd: st.pd, cx: g.cross ? 1 : .5, mode: st.mode, lastMain: st.lastMain };
        if (k !== 's') { if (d2 === st.pd || d2 === OPP[st.pd]) { ns.mode = 'corner'; if (st.mode === 'run') ns.lastMain = st.d; } else ns.mode = 'run'; }
        return { g: g, r: r, st: ns };
      }
      return null;
    }
    function layout(L, W, H, relax) {
      var out = { ok: true, items: [], rects: [] }, rt = L.root.t, rd = rt[0] === rt[1];
      var root = rd ? { cx: 0, cy: 0, w: 1, h: 2, rot: 0 } : { cx: 0, cy: 0, w: 2, h: 1, rot: -90 }, RR = rectOf(root);
      out.rects.push(RR);
      out.items.push({ a: rt[0], b: rt[1], cx: 0, cy: 0, w: root.w, h: root.h, rot: root.rot, spin: L.spin, key: 'R' });
      var ctx = { W: W, H: H, spin: L.spin, RR: RR, rects: out.rects }, pd = L.spin ? { E: 'S', S: 'W', W: 'N', N: 'E' } : { E: 'S', W: 'N' };
      var starts = { E: [RR.x1, 0], W: [RR.x0, 0], N: [0, RR.y0], S: [0, RR.y1] };
      Object.keys(pd).forEach(function (arm) {
        var st = { arm: arm, P: starts[arm], d: arm, pd: pd[arm], cx: (arm === 'E' || arm === 'W') ? (rd ? 1 : .5) : .5, mode: 'run', lastMain: arm };
        (L.arms[arm] || []).forEach(function (x, k) {
          if (!out.ok && relax < 2) return;
          var res = stepArm(st, ctx, x.t[0] === x.t[1], relax);
          if (!res) { out.ok = false; return; }
          out.rects.push(res.r);
          out.items.push({ a: x.t[0], b: x.t[1], cx: res.g.cx, cy: res.g.cy, w: res.g.w, h: res.g.h, rot: res.g.rot, key: arm + k });
          st = res.st;
        });
      });
      return out;
    }
    // fit the line to a W x H picture (px): shrink the tile until the line fits, as the game does
    function fit(L, PW, PH) {
      var u = Math.min(PW, PH) / 7.2, lay = null;
      for (var k = 0; k < 8; k++) { lay = layout(L, PW / u - .3, PH / u - .3, 0); if (lay.ok) break; u *= .88; }
      if (!lay.ok) lay = layout(L, PW / u - .3, PH / u - .3, 1);
      if (!lay.ok) lay = layout(L, PW / u - .3, PH / u - .3, 2);
      return lay;
    }
    return { fit: fit };
  })();
  var DM_P = [[], [5], [3, 7], [3, 5, 7], [1, 3, 7, 9], [1, 3, 5, 7, 9], [1, 3, 4, 6, 7, 9]];
  // the line on felt. hot: key of the tile just played; o.cap: a caption on the table
  function dmTable(L, o) {
    o = o || {};
    var PW = 340, PH = 250, s = '<svg viewBox="0 0 ' + PW + ' ' + PH + '" role="img" aria-label="The line of play"><defs>' +
      '<radialGradient id="dmf" cx=".5" cy=".4" r=".75"><stop offset="0" stop-color="#1f8a5c"/><stop offset=".7" stop-color="#11603f"/><stop offset="1" stop-color="#0a4129"/></radialGradient>' +
      '<linearGradient id="dmt" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fffef8"/><stop offset=".55" stop-color="#f7f0dd"/><stop offset="1" stop-color="#e9dec4"/></linearGradient>' +
      '<radialGradient id="dmp" cx=".38" cy=".32" r=".7"><stop offset="0" stop-color="#4a4540"/><stop offset=".62" stop-color="#0b0a09"/></radialGradient>' +
      '<radialGradient id="dmb" cx=".35" cy=".3" r=".7"><stop offset="0" stop-color="#fff6cf"/><stop offset=".4" stop-color="#e2b54c"/><stop offset="1" stop-color="#9a6a18"/></radialGradient></defs>' +
      '<rect width="' + PW + '" height="' + PH + '" rx="12" fill="url(#dmf)"/>';
    if (L) {
      var lay = DM.fit(L, PW, PH), bx0 = 1e9, bx1 = -1e9, by0 = 1e9, by1 = -1e9;
      lay.rects.forEach(function (r) { bx0 = Math.min(bx0, r.x0); bx1 = Math.max(bx1, r.x1); by0 = Math.min(by0, r.y0); by1 = Math.max(by1, r.y1); });
      bx0 -= .6; bx1 += .6; by0 -= .6; by1 += .6;
      var sc = Math.min(PW / (bx1 - bx0), PH / (by1 - by0), 34), ox = PW / 2 - (bx0 + bx1) / 2 * sc, oy = PH / 2 - (by0 + by1) / 2 * sc, top = '';
      lay.items.forEach(function (it) {
        var cx = f2(ox + it.cx * sc), cy = f2(oy + it.cy * sc), u = sc, g = '<g transform="translate(' + cx + ' ' + cy + ') rotate(' + it.rot + ')">';
        g += '<rect x="' + f2(-u / 2 + .6) + '" y="' + f2(-u + 1.4) + '" width="' + f2(u) + '" height="' + f2(2 * u) + '" rx="' + f2(u * .17) + '" fill="rgba(0,0,0,.35)"/>';
        g += '<rect x="' + f2(-u / 2) + '" y="' + f2(-u) + '" width="' + f2(u) + '" height="' + f2(2 * u) + '" rx="' + f2(u * .17) + '" fill="url(#dmt)" stroke="rgba(90,70,40,.45)" stroke-width=".8"/>';
        g += '<line x1="' + f2(-u * .39) + '" x2="' + f2(u * .39) + '" y1="0" y2="0" stroke="rgba(60,45,25,.55)" stroke-width="' + f2(Math.max(.8, u * .045)) + '"/>';
        [[it.a, -u], [it.b, 0]].forEach(function (h) {
          (DM_P[h[0]] || []).forEach(function (k) { var c = (k - 1) % 3, r = Math.floor((k - 1) / 3); g += '<circle cx="' + f2(-u / 2 + u * (.24 + c * .26)) + '" cy="' + f2(h[1] + u * (.24 + r * .26)) + '" r="' + f2(u * .095) + '" fill="url(#dmp)"/>'; });
        });
        g += '<circle r="' + f2(u * .1) + '" fill="url(#dmb)"/></g>';
        s += g;
        if (it.key === o.hot || (it.spin && L.spin)) top += '<rect x="' + f2(ox + (it.cx - it.w / 2) * sc - 2) + '" y="' + f2(oy + (it.cy - it.h / 2) * sc - 2) + '" width="' + f2(it.w * sc + 4) + '" height="' + f2(it.h * sc + 4) + '" rx="' + f2(sc * .25) + '" fill="none" stroke="' + (it.key === o.hot ? (o.col || '#fff') : 'rgba(255,214,120,.8)') + '" stroke-width="' + (it.key === o.hot ? 2.6 : 1.6) + '"' + (it.key === o.hot ? '' : ' stroke-dasharray="4 3"') + '/>';
      });
      s += top;
    }
    if (o.cap) s += '<text x="' + PW / 2 + '" y="' + (PH - 9) + '" text-anchor="middle" font-size="10" font-weight="900" letter-spacing="1" fill="rgba(255,255,255,.5)" font-family="system-ui">' + o.cap + '</text>';
    return s + '</svg>';
  }
  // the line from the old record form (each arm outward from the root)
  function dmFromLn(Ln) {
    var r = domPairs(Ln.r)[0]; if (!r) return null;
    var L = { root: { t: r }, arms: {}, spin: !!Ln.sp };
    ['E', 'W', 'N', 'S'].forEach(function (k) { L.arms[k] = domPairs(Ln[k]).map(function (t) { return { t: t }; }); });
    return L;
  }
  var DOM_V = { draw: 'Draw game', block: 'Block game', fives: 'All Fives' }, DOM_END = { E: 'right', W: 'left', N: 'top', S: 'bottom' };
  R('dominoes', function (e, ui) {
    var d = e.dt; if (!d) return null;
    var B = HistView.boardUI, nm = names(e), out = [], fives = d.v === 'fives';
    var Lfin = d.ln && d.ln.r ? dmFromLn(d.ln) : null;
    // the hand move by move: plays and passes are the steps; draws are counted into the next step
    var toks = String(d.pl || '').split(' ').filter(Boolean), steps = [], L = null, drew = 0, ok = toks.length > 0;
    toks.forEach(function (t) {
      if (!ok) return;
      var p = +t.charAt(0), k = t.charAt(1);
      if (k === 'd') { drew++; return; }
      if (k === 'x') { steps.push({ p: p, pass: true, drew: drew, L: L }); drew = 0; return; }
      var tl = [+t.charAt(1), +t.charAt(2)], end = t.charAt(3), pts = +t.slice(4) || 0;
      var L2 = dmPlace(end === 'L' ? null : L, tl, end, fives);
      if (!L2) { ok = false; return; }
      L = L2;
      var A = end === 'L' ? null : L.arms[end], key = end === 'L' ? 'R' : end + (A.length - 1);
      if (L.spin && end !== 'L' && tl[0] === tl[1] && L.root.t[0] === tl[0] && !A.length) key = 'R';   // just became the spinner
      steps.push({ p: p, t: tl, end: end, pts: pts, drew: drew, L: L, key: key }); drew = 0;
    });
    if (!ok || !steps.length) steps = null;
    var finalL = steps ? steps[steps.length - 1].L : Lfin;
    var cnt = 0; if (finalL) { cnt = 1; ['E', 'W', 'N', 'S'].forEach(function (k) { cnt += (finalL.arms[k] || []).length; }); }
    var lastP = steps ? steps.filter(function (s) { return !s.pass; }).pop() : null;
    var snap = ui.picture(dmTable(finalL, { hot: lastP && lastP.key, col: lastP ? ui.color(lastP.p) : null, cap: finalL ? cnt + ' TILES' : '' }), { frame: 'wood', max: 380 });
    out.push(ui.stats([['Hands', d.h || null, DOM_V[d.v] || ''], ['Last hand', d.k === 'domino' ? 'Domino' : d.k === 'block' ? 'Blocked' : d.k === 'match' ? 'Target hit' : null, d.k === 'domino' ? (nm[d.wi] ? nm[d.wi] + ' went out' : '') : d.k === 'block' ? 'nobody could play' : d.k === 'match' ? 'mid-hand' : ''],
      ['Boneyard', d.v === 'block' ? null : d.bn != null ? d.bn : null, 'tiles left']]));
    if (finalL) out.push(ui.section('Hand ' + (d.h || '') + ': the line of play', snap));
    if (steps && steps.length > 1) {
      var N = steps.length;
      out.push(ui.section('Replay the hand', B.replay(ui, N, function (n) {
        var st = steps[n - 1], Ln = n ? st.L : null;
        snap.innerHTML = dmTable(Ln, { hot: st && !st.pass ? st.key : null, col: st ? ui.color(st.p) : null, cap: n === 0 ? 'THE DEAL' : '' });
        if (!n) return 'The deal';
        var who = nm[st.p] || 'Player', pre = st.drew ? who + ' drew ' + st.drew + ', then ' : who + ' ';
        if (st.pass) return 'Play ' + n + ' · ' + (st.drew ? who + ' drew ' + st.drew + ' and passed' : who + ' passed');
        return 'Play ' + n + ' · ' + pre + (st.end === 'L' ? 'led the ' : 'played the ') + (st.t[0] === st.t[1] ? 'double ' + st.t[0] : st.t[0] + '-' + st.t[1]) + (st.end === 'L' ? '' : ' on the ' + DOM_END[st.end]) + (st.pts ? ', scored ' + st.pts : '');
      }, { start: N, ms: 600 })));
    }
    if (d.hd && d.hd.length) {
      var rows = d.hd.map(function (h, i) {
        var ts = domPairs(h), pips = ts.reduce(function (s, t) { return s + t[0] + t[1]; }, 0);
        return ui.el('div', { class: 'hvb-hand' }, [ui.el('span', { class: 'n', text: nm[i] || 'Player', style: { color: ui.color(i) } }),
          ui.el('span', { class: 't', html: ts.length ? ts.map(function (t) { return domSvg(t[0], t[1], false); }).join('') : '' }, ts.length ? null : [ui.el('em', { text: i === d.wi && d.k === 'domino' ? 'Domino!' : 'Out' })]),
          ui.el('span', { class: 'p', text: pips + (pips === 1 ? ' dot' : ' dots') })]);
      });
      out.push(ui.section('Left in hand', ui.el('div', { class: 'hvb-mm' }, rows)));
    }
    // what decided it
    var why = '';
    if (d.k === 'domino' && nm[d.wi]) why = nm[d.wi] + ' went out' + (d.h > 1 ? ' in the last hand' : '') + ' and scored the dots left in everyone else’s hand';
    else if (d.k === 'block') why = 'Nobody could play, so the lowest count of dots took the hand';
    else if (d.k === 'match') why = 'The winning points came in the middle of a hand';
    if (fives && steps) { var fp = {}; steps.forEach(function (s) { if (s.pts) fp[s.p] = (fp[s.p] || 0) + s.pts; }); var bp = Object.keys(fp).sort(function (a, b) { return fp[b] - fp[a]; })[0]; if (bp != null && fp[bp] >= 10) why += (why ? '. ' : '') + nm[bp] + ' made ' + fp[bp] + ' points from fives in that hand'; }
    out.push(B.foot(ui, why, 'trophy'));
    return ui.wrap(out);
  });

  // ═════════════════════════════════════════════════════════════════════════
  // Marbles: the board at the end, who sent who home
  // ═════════════════════════════════════════════════════════════════════════
  var MGEO = {}, MSEG = 14, MCEN = 999;
  function mGeo(B) {
    if (MGEO[B]) return MGEO[B];
    var half = Math.PI / B, tc = 1 / Math.tan(half), r0 = tc + 1, tip = r0 + 5, track = [], home = [], base = [], baseC = [];
    function rot(x, y, a) { var c = Math.cos(a), s = Math.sin(a); return [x * c - y * s, x * s + y * c]; }
    for (var k = 0; k < B; k++) {
      var a = k * 2 * Math.PI / B, r;
      for (r = 0; r < 6; r++) track.push(rot(1, r0 + r, a));
      track.push(rot(0, tip, a));
      for (r = 5; r >= 0; r--) track.push(rot(-1, r0 + r, a));
      track.push(rot(-1, tc, a));
      var h = []; for (var i = 1; i <= 4; i++) h.push(rot(0, tip - i, a)); home.push(h);
      var ba = a + half, rb = B === 4 ? 6.35 : 6.55, cx = -Math.sin(ba) * rb, cy = Math.cos(ba) * rb;
      baseC.push([cx, cy]);
      var bs = [];
      [[-.56, -.56], [.56, -.56], [-.56, .56], [.56, .56]].forEach(function (o) { var p = rot(o[0], o[1], ba); bs.push([cx + p[0], cy + p[1]]); });
      base.push(bs);
    }
    var g = { B: B, N: MSEG * B, track: track, home: home, base: base, baseC: baseC, tip: tip };
    if (B === 4) { g.W = g.H = 2 * (tip + 0.95); } else { g.apo = tip + 0.62; g.rc = g.apo + 0.55; g.W = 2 * g.rc; g.H = 2 * g.apo; }
    MGEO[B] = g; return g;
  }
  var M_RULES = { cards: 'Cards & Marbles', agg: 'Aggravation', wahoo: 'Wahoo', plain: 'Wahoo, no center' };
  R('marbles', function (e, ui) {
    var d = e.dt; if (!d || !d.p || !d.B) return null;
    var B = +d.B, g = mGeo(B), W = g.W, H = g.H, nm = names(e), F = function (v) { return v.toFixed(3); }, s = [];
    var armCol = {}; d.p.forEach(function (p) { armCol[p.a] = p.c; });
    s.push('<svg viewBox="' + F(-W / 2) + ' ' + F(-H / 2) + ' ' + F(W) + ' ' + F(H) + '" role="img" aria-label="Final board"><defs>' +
      '<linearGradient id="hvmw" x1="0" y1="0" x2=".35" y2="1"><stop offset="0" stop-color="#e2b47a"/><stop offset=".55" stop-color="#cf9a5c"/><stop offset="1" stop-color="#b37c42"/></linearGradient>' +
      '<radialGradient id="hvmh" cx=".5" cy=".38" r=".62"><stop offset="0" stop-color="#140904"/><stop offset=".7" stop-color="#2a1608"/><stop offset="1" stop-color="#4a2a12"/></radialGradient>' +
      '<radialGradient id="hvmm" cx=".35" cy=".3" r=".75"><stop offset="0" stop-color="#fff" stop-opacity=".6"/><stop offset=".4" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".35"/></radialGradient>' +
      (B === 6 ? '<clipPath id="hvmc"><circle r="' + F(g.rc) + '"/></clipPath>' : '') + '</defs>');
    var shape;
    if (B === 4) shape = '<rect x="' + F(-W / 2) + '" y="' + F(-H / 2) + '" width="' + F(W) + '" height="' + F(H) + '" rx="1.1"';
    else { var Rr = g.apo / Math.cos(Math.PI / 6), pp = []; for (var i = 0; i < 6; i++) { var an = i * Math.PI / 3; pp.push(F(Rr * Math.cos(an)) + ',' + F(Rr * Math.sin(an))); } shape = '<polygon clip-path="url(#hvmc)" points="' + pp.join(' ') + '"'; }
    s.push(shape + ' fill="url(#hvmw)"/>');
    s.push(shape + ' fill="none" stroke="#5a3214" stroke-opacity=".7" stroke-width=".12"/>');
    s.push('<polygon points="' + g.track.map(function (p) { return F(p[0]) + ',' + F(p[1]); }).join(' ') + '" fill="none" stroke="#5a3214" stroke-opacity=".28" stroke-width=".12" stroke-linejoin="round"/>');
    for (var arm = 0; arm < B; arm++) {
      var c = armCol[arm], col = c || '#e8dcc2', op = c ? .9 : .55, hm = g.home[arm], bc = g.baseC[arm], sp = g.track[arm * MSEG + 7];
      s.push('<line x1="' + F(hm[0][0]) + '" y1="' + F(hm[0][1]) + '" x2="' + F(hm[3][0]) + '" y2="' + F(hm[3][1]) + '" stroke="' + col + '" stroke-opacity="' + op + '" stroke-width=".95" stroke-linecap="round"/>');
      s.push('<circle cx="' + F(bc[0]) + '" cy="' + F(bc[1]) + '" r="1.32" fill="' + col + '" fill-opacity="' + op + '"/>');
      s.push('<circle cx="' + F(sp[0]) + '" cy="' + F(sp[1]) + '" r=".5" fill="' + col + '" fill-opacity="' + op + '"/>');
    }
    if (d.r === 'agg') for (var sk = 0; sk < B; sk++) {
      var stp = g.track[sk * MSEG + MSEG - 1], sd = '';
      for (var si = 0; si < 10; si++) { var sa = -Math.PI / 2 + si * Math.PI / 5, sr = si % 2 ? .32 : .72; sd += (si ? 'L' : 'M') + F(stp[0] + sr * Math.cos(sa)) + ' ' + F(stp[1] + sr * Math.sin(sa)); }
      s.push('<path d="' + sd + 'Z" fill="#f6d77a" stroke="#8a5a14" stroke-opacity=".55" stroke-width=".05" stroke-linejoin="round"/>');
    }
    if (d.r === 'agg' || d.r === 'wahoo') s.push('<circle r=".82" fill="#f6d77a" stroke="#8a5a14" stroke-opacity=".55" stroke-width=".05"/>');
    function hole(p, r) { r = r || .3; return '<circle cx="' + F(p[0]) + '" cy="' + F(p[1]) + '" r="' + F(r) + '" fill="url(#hvmh)"/>'; }
    g.track.forEach(function (p) { s.push(hole(p)); });
    g.home.forEach(function (h) { h.forEach(function (p) { s.push(hole(p)); }); });
    g.base.forEach(function (h) { h.forEach(function (p) { s.push(hole(p)); }); });
    if (d.r === 'agg' || d.r === 'wahoo') s.push(hole([0, 0], .36));
    d.p.forEach(function (p) {
      String(p.m || '').split(',').forEach(function (v, mi) {
        v = +v; var xy;
        if (v === -1) xy = g.base[p.a][mi]; else if (v === MCEN) xy = [0, 0]; else if (v < g.N) xy = g.track[(p.a * MSEG + 7 + v) % g.N]; else xy = g.home[p.a][v - g.N];
        if (!xy) return;
        s.push('<circle cx="' + F(xy[0]) + '" cy="' + F(xy[1] + .06) + '" r=".42" fill="rgba(0,0,0,.4)"/><circle cx="' + F(xy[0]) + '" cy="' + F(xy[1]) + '" r=".4" fill="' + (p.c || '#ccc') + '"/><circle cx="' + F(xy[0]) + '" cy="' + F(xy[1]) + '" r=".4" fill="url(#hvmm)"/>');
      });
    });
    s.push('</svg>');
    var out = [ui.section('Final board', ui.picture(s.join(''), { max: 340 }))];
    var N = g.N, rows = d.p.map(function (p, i) {
      var home = String(p.m || '').split(',').filter(function (v) { v = +v; return v >= N && v !== MCEN; }).length;
      return [nm[i] || 'Player', { t: home + '/4', c: (d.w || []).indexOf(i) >= 0 ? 'hi' : '' }, p.t, p.s, p.g];
    });
    out.push(ui.section('Marbles', ui.table(['', 'Home', 'Turns', d.r === 'agg' ? 'Aggravated' : 'Sent back', 'Got sent'], rows)));
    out.push(ui.chips(d.p.map(function (p, i) { return { t: nm[i], c: p.c }; }).concat([{ t: M_RULES[d.r] || '' }])));
    return ui.wrap(out);
  });

  // ═════════════════════════════════════════════════════════════════════════
  // Axis & Allies: who held the map at the end, and each power's standing.
  // The map outlines live in the game page; they're read from it on demand.
  // ═════════════════════════════════════════════════════════════════════════
  var AA = { s: { p: 'su', n: 'Soviet Union', sh: 'USSR', c: '#9c3b32' }, d: { p: 'de', n: 'Germany', sh: 'Germany', c: '#5a5f5c' }, k: { p: 'uk', n: 'United Kingdom', sh: 'UK', c: '#b98e52' }, j: { p: 'jp', n: 'Japan', sh: 'Japan', c: '#e0a43a' }, u: { p: 'us', n: 'United States', sh: 'USA', c: '#5d7a3a' } };
  var AA_BY = {}; Object.keys(AA).forEach(function (k) { AA_BY[AA[k].p] = AA[k]; });
  var AA_KINDS = [['infantry', 'infantry'], ['artillery', 'artillery'], ['tank', 'tanks'], ['AA gun', 'AA guns'], ['fighter', 'fighters'], ['bomber', 'bombers'], ['sub', 'subs'], ['transport', 'transports'], ['destroyer', 'destroyers'], ['cruiser', 'cruisers'], ['carrier', 'carriers'], ['battleship', 'battleships']];
  var aaMap = null;
  function aaLoad() {
    if (aaMap) return aaMap;
    var src = '', sc = document.querySelector('script[src*="hist-view"]');
    try { src = sc ? new URL('games/axisallies.html', sc.src.replace(/hist-view\.js.*$/, '')).href : (/\/games\//.test(location.pathname) ? 'axisallies.html' : 'games/axisallies.html'); } catch (err) { src = 'axisallies.html'; }
    aaMap = fetch(src).then(function (r) { return r.text(); }).then(function (t) {
      function grab(name) { var m = new RegExp('var ' + name + '=(\\[.*?\\]);\\s*\\n').exec(t); return m ? JSON.parse(m[1]) : null; }
      var TER = grab('TER'), GEO = grab('GEO');
      if (!TER || !GEO) throw new Error('no map');
      return { TER: TER, GEO: GEO };
    });
    aaMap.catch(function () { aaMap = null; });
    return aaMap;
  }
  function aaSvg(m, d) {
    var own = String(d.own || ''), skirm = d.mp === 's', vb = skirm ? [330, 60, 640, 470] : [0, 0, 1750, 1000];
    var ic = String(d.ic || '').split(',').filter(Boolean).map(Number), s = '';
    var sea = '', land = '', marks = '';
    for (var t = 0; t < m.TER.length; t++) {
      var T = m.TER[t], geo = m.GEO[t]; if (!geo) continue;
      var ch = own.charAt(t);
      if (T[1] === 1) { sea += '<path d="' + geo + '"/>'; continue; }
      var p = AA[ch], imp = T[4] & 8, fill = p ? p.c : ch === '-' ? '#cdbb8f' : skirm ? '#22323c' : '#a89a7a', op = p ? 1 : skirm && ch === '.' ? 1 : .75;
      land += '<path d="' + geo + '" fill="' + fill + '" fill-opacity="' + op + '"' + (imp ? ' stroke-dasharray="4 3"' : '') + '/>';
      if (T[4] & 2 && (!skirm || ch !== '.')) {
        var cx = T[5], cy = T[6], r = skirm ? 8 : 11, st = '';
        for (var k = 0; k < 10; k++) { var a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? r * .42 : r; st += (k ? 'L' : 'M') + f2(cx + rr * Math.cos(a)) + ' ' + f2(cy + rr * Math.sin(a)); }
        marks += '<path d="' + st + 'Z" fill="#ffd34d" stroke="#5a3a00" stroke-width="1.4" stroke-linejoin="round"/>';
      }
      if (ic.indexOf(t) >= 0 && T[5] != null) marks += '<rect x="' + (T[5] - (skirm ? 4 : 5)) + '" y="' + (T[6] + (skirm ? 6 : 9)) + '" width="' + (skirm ? 8 : 10) + '" height="' + (skirm ? 6 : 7) + '" rx="1.5" fill="#1b1712" stroke="#fff" stroke-opacity=".6" stroke-width="1"/>';
    }
    s = '<svg viewBox="' + vb.join(' ') + '" role="img" aria-label="Map at the end"><rect x="' + vb[0] + '" y="' + vb[1] + '" width="' + vb[2] + '" height="' + vb[3] + '" fill="#2d566e"/>' +
      '<g fill="#3a6a85" stroke="#24485c" stroke-width="1.5">' + sea + '</g>' +
      '<g stroke="#2a1f12" stroke-width="' + (skirm ? 1.6 : 2.2) + '" stroke-linejoin="round">' + land + '</g>' + marks + '</svg>';
    return s;
  }
  R('axisallies', function (e, ui) {
    var d = e.dt; if (!d || !d.own) return null;
    var out = [];
    var mapBox = ui.picture('<div class="ld">Loading the map…</div>', { frame: 'wood', max: 380 });
    mapBox.classList.add('hvb-map');
    out.push(ui.section('The map at the end (round ' + (d.r || '?') + ')', mapBox));
    try {
      aaLoad().then(function (m) { mapBox.innerHTML = aaSvg(m, d); }).catch(function () { mapBox.remove(); });
    } catch (err) { mapBox.remove(); }
    var own = String(d.own), counts = {};
    own.split('').forEach(function (ch) { if (AA[ch]) counts[ch] = (counts[ch] || 0) + 1; });
    var pw = (d.pw || []).slice();
    out.push(ui.chips(pw.map(function (x) { var P = AA_BY[x.p] || {}; return { t: P.n || x.p, c: P.c, on: true }; })));
    var rows = pw.map(function (x) {
      var P = AA_BY[x.p] || {}, letter = Object.keys(AA).filter(function (k) { return AA[k].p === x.p; })[0];
      return [P.sh || x.p, counts[letter] || 0, x.i, x.v, { t: x.cap ? 'Held' : 'Lost', c: x.cap ? 'good' : 'bad' }];
    });
    out.push(ui.section('Powers at the end', ui.table(['', 'Land', 'IPCs', 'Cities', 'Capital'], rows)));
    // what armies were left, by power
    var armies = pw.map(function (x) {
      var units = String(x.u || '').split(',').map(Number), parts = [];
      units.forEach(function (n, i) { if (n && AA_KINDS[i]) parts.push(n + ' ' + AA_KINDS[i][n === 1 ? 0 : 1]); });
      return { t: parts.join(', ') || 'No units left', b: (AA_BY[x.p] || {}).sh + ': ', c: (AA_BY[x.p] || {}).c };
    });
    out.push(ui.section('Armies left', ui.log(armies)));
    return ui.wrap(out);
  });
})();
