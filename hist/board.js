'use strict';
// History views: board
// chess, checkers, tictactoe, chinesecheckers, codebreaker (Mastermind), dominoes, marbles, axisallies
(function () {
  if (!window.HistView) return;
  var R = HistView.register;
  function f2(v) { return Math.round(v * 1000) / 1000; }
  function names(e) { return (e.players || []).map(function (p) { return String(p.name || '').replace(/ \((White|Black|Red)\)$/, ''); }); }

  // A replay slider (like Connect Four's): calls show(n) for n = 0..max
  function replay(ui, max, show) {
    var label = ui.el('b'), rng = ui.el('input', { type: 'range', min: '0', max: String(max), value: String(max), class: 'hvb-range', 'aria-label': 'Move' });
    rng.addEventListener('input', function () { label.textContent = show(+rng.value) || ''; });
    label.textContent = show(max) || '';
    return ui.el('div', { class: 'hvb-replay' }, [rng, label]);
  }

  HistView.css('hv-board', [
    '.hvb-replay{display:flex;flex-direction:column;gap:6px;}',
    '.hvb-range{width:100%;accent-color:var(--yellow);}',
    '.hvb-replay b{font-size:.85rem;color:var(--text-2);}',
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
    var C = [], PX = [], PY = [], H3 = Math.sqrt(3) / 2, PT = [];
    for (var z = -8; z <= 8; z++) for (var x = -8; x <= 8; x++) {
      var y = -x - z; if (y < -8 || y > 8) continue;
      if (!(x <= 4 && y <= 4 && z <= 4) && !(x >= -4 && y >= -4 && z >= -4)) continue;
      C.push([x, y, z]); PX.push(x + z / 2); PY.push(z * H3);
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
    ccG = { C: C, PX: PX, PY: PY, PT: PT, hd: hd, N: C.length };
    return ccG;
  }
  var CC_HEX = { red: '#ff5a5f', blue: '#5b9bff', green: '#3fd27a', yellow: '#ffd23f', purple: '#b18cff', white: '#f4f1e8' };
  var CC_TINT = { red: '#e0242c', blue: '#2a6ae8', green: '#1fae52', yellow: '#f5c20a', purple: '#6a3fa8', white: '#f4f1e8' };
  R('chinesecheckers', function (e, ui) {
    var d = e.dt; if (!d || !d.b) return null;
    var g = ccGeo(), b = String(d.b), pts = String(d.pt || '').split('').map(Number), cols = d.c || [], nm = d.n || names(e);
    if (b.length !== g.N) return null;
    var poly = [], k;
    for (k = 0; k < 6; k++) { var a = (90 + 60 * k) * Math.PI / 180; poly.push(f2(7.62 * Math.cos(a)) + ',' + f2(7.62 * Math.sin(a))); }
    var s = '<svg viewBox="-7 -8.08 14 16.16" role="img" aria-label="Final board"><defs>' +
      '<linearGradient id="hvccw" x1="0" y1="0" x2=".35" y2="1"><stop offset="0" stop-color="#9a5a2c"/><stop offset=".45" stop-color="#7a4220"/><stop offset="1" stop-color="#4f2810"/></linearGradient>' +
      '<radialGradient id="hvcch" cx=".5" cy=".58" r=".6"><stop offset="0" stop-color="#2a160a"/><stop offset="1" stop-color="#050201"/></radialGradient>' +
      '<radialGradient id="hvccm" cx=".35" cy=".3" r=".75"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".4" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".35"/></radialGradient></defs>' +
      '<polygon points="' + poly.join(' ') + '" fill="url(#hvccw)" stroke="#3a1d0a" stroke-width=".12" stroke-linejoin="round"/>';
    var star = [];
    for (k = 0; k < 12; k++) { var rr = k % 2 ? 4.72 : 7.9, aa = (90 + 30 * k) * Math.PI / 180; star.push(f2(rr * Math.cos(aa)) + ',' + f2(rr * Math.sin(aa))); }
    s += '<clipPath id="hvccclip"><polygon points="' + poly.join(' ') + '"/></clipPath><g clip-path="url(#hvccclip)"><polygon points="' + star.join(' ') + '" fill="rgba(40,16,4,.28)" stroke="rgba(255,222,170,.28)" stroke-width=".06"/></g>';
    pts.forEach(function (pt, p) {
      var cells = g.PT[pt], col = CC_TINT[cols[p]] || '#888'; if (!cells) return;
      var tip = cells.filter(function (c) { var C = g.C[c]; return Math.max(Math.abs(C[0]), Math.abs(C[1]), Math.abs(C[2])) === 8; })[0];
      var far = cells.filter(function (c) { return g.hd(c, tip) === 3; }), a1 = far[0], b1 = far[far.length - 1];
      var cx = (g.PX[tip] + g.PX[a1] + g.PX[b1]) / 3, cy = (g.PY[tip] + g.PY[a1] + g.PY[b1]) / 3;
      s += '<polygon points="' + [tip, a1, b1].map(function (c) { return f2(cx + (g.PX[c] - cx) * 1.46) + ',' + f2(cy + (g.PY[c] - cy) * 1.46); }).join(' ') + '" fill="' + col + '" fill-opacity="' + (cols[p] === 'white' ? .2 : .3) + '" stroke="' + col + '" stroke-opacity=".55" stroke-width=".07" stroke-linejoin="round"/>';
    });
    for (var i = 0; i < g.N; i++) {
      var x = f2(g.PX[i]), y = f2(g.PY[i]), v = +b.charAt(i);
      s += '<circle cx="' + x + '" cy="' + f2(g.PY[i] + .035) + '" r=".3" fill="rgba(255,214,160,.22)"/><circle cx="' + x + '" cy="' + y + '" r=".285" fill="url(#hvcch)"/>';
      if (v) {
        var mc = CC_HEX[cols[v - 1]] || '#ccc';
        s += '<circle cx="' + x + '" cy="' + f2(g.PY[i] + .06) + '" r=".4" fill="rgba(0,0,0,.45)"/><circle cx="' + x + '" cy="' + y + '" r=".38" fill="' + mc + '"/><circle cx="' + x + '" cy="' + y + '" r=".38" fill="url(#hvccm)"/>';
      }
    }
    s += '</svg>';
    var out = [ui.section('Final board', ui.picture(s, { max: 330 }))];
    var fin = d.fin || [], mv = d.mv || [], ch = d.ch || [], hm = d.hm || [];
    var order = fin.slice(); nm.forEach(function (x, i) { if (order.indexOf(i) < 0) order.push(i); });
    var rows = order.map(function (i) {
      var place = fin.indexOf(i);
      var r = [nm[i] || 'Player', { t: place >= 0 ? ['1st', '2nd', '3rd', '4th', '5th', '6th'][place] : '–', c: place === 0 ? 'hi' : '' }, (hm[i] != null ? hm[i] : '–') + '/10', mv[i] != null ? mv[i] : '–', ch[i] || 0];
      return r;
    });
    out.push(ui.section('How far everyone got', ui.table(['', 'Place', 'Home', 'Moves', 'Best hops'], rows)));
    var chips = order.map(function (i) { return { t: nm[i] + ': ' + (cols[i] ? cols[i].charAt(0).toUpperCase() + cols[i].slice(1) : ''), c: CC_HEX[cols[i]] }; });
    out.push(ui.chips(chips));
    return ui.wrap(out);
  });

  // ═════════════════════════════════════════════════════════════════════════
  // Mastermind: every guess with its pegs, and the secret code
  // ═════════════════════════════════════════════════════════════════════════
  var MM_PEG = ['#e8323c', '#ff8a1f', '#ffd23a', '#27b856', '#2f78ff', '#9a4dff', '#ff6fb5', '#f2efe8'];
  var MM_NAME = ['Red', 'Orange', 'Yellow', 'Green', 'Blue', 'Purple', 'Pink', 'White'];
  function mmBoard(code, guesses, P, C, label) {
    var hole = 26, rh = 34, keyW = P === 5 ? 34 : 26, W = 26 + P * hole + 12 + keyW + 10, H = rh + 10 + Math.max(1, guesses.length) * rh + 10;
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + (label || 'Mastermind board') + '"><defs><radialGradient id="hvmmp" cx=".35" cy=".3" r=".75"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".35"/></radialGradient></defs>';
    function peg(c, cx, cy, r) {
      if (c === C || MM_PEG[c] == null) return '<circle cx="' + cx + '" cy="' + cy + '" r="' + (r - 2) + '" fill="#1c120a" stroke="rgba(255,236,210,.35)" stroke-width="1.2" stroke-dasharray="2.5 2"/>';
      return '<circle cx="' + cx + '" cy="' + (cy + 1.5) + '" r="' + r + '" fill="rgba(0,0,0,.45)"/><circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + MM_PEG[c] + '"/><circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="url(#hvmmp)"/>';
    }
    // secret code row
    s += '<rect x="22" y="4" width="' + (P * hole + 8) + '" height="' + (rh - 2) + '" rx="8" fill="rgba(0,0,0,.35)"/>';
    s += '<text x="12" y="' + (4 + rh / 2) + '" text-anchor="middle" dominant-baseline="central" font-size="8" font-weight="900" fill="rgba(255,236,210,.55)" font-family="system-ui" transform="rotate(-90 12 ' + (4 + rh / 2) + ')">CODE</text>';
    code.forEach(function (c, i) { s += peg(c, 26 + i * hole + hole / 2, 4 + rh / 2 - 1, 10); });
    s += '<line x1="6" y1="' + (rh + 6) + '" x2="' + (W - 6) + '" y2="' + (rh + 6) + '" stroke="rgba(0,0,0,.4)" stroke-width="2"/>';
    guesses.forEach(function (gr, r) {
      var y = rh + 10 + r * rh + rh / 2;
      s += '<text x="12" y="' + y + '" text-anchor="middle" dominant-baseline="central" font-size="10" font-weight="800" fill="rgba(255,236,210,.45)" font-family="system-ui">' + (r + 1) + '</text>';
      gr.g.forEach(function (c, i) { s += peg(c, 26 + i * hole + hole / 2, y, 9.5); });
      var kx = 26 + P * hole + 12, per = P === 5 ? 3 : 2;
      for (var k = 0; k < P; k++) {
        var col = k % per, row = Math.floor(k / per), cx = kx + 5 + col * 10, cy = y - 5 + row * 10;
        var fill = k < gr.b ? '#111' : k < gr.b + gr.w ? '#f4f1e8' : null;
        s += fill ? '<circle cx="' + cx + '" cy="' + cy + '" r="3.8" fill="' + fill + '" stroke="' + (k < gr.b ? 'rgba(255,255,255,.35)' : 'rgba(0,0,0,.4)') + '" stroke-width=".8"/>' : '<circle cx="' + cx + '" cy="' + cy + '" r="2" fill="rgba(0,0,0,.45)"/>';
      }
    });
    return s + '</svg>';
  }
  R('codebreaker', function (e, ui) {
    var d = e.dt; if (!d || !d.r || !d.r.length) return null;
    var nm = names(e), P = +d.P || 4, C = +d.C, out = [];
    d.r.forEach(function (rd, ri) {
      var code = String(rd.c || '').split('').map(Number);
      var gs = String(rd.g || '').split(' ').filter(Boolean).map(function (x) { var p = x.split(':'); return { g: p[0].split('').map(Number), b: +(p[1] || '00').charAt(0), w: +(p[1] || '00').charAt(1) }; });
      var title = d.r.length > 1 ? 'Round ' + (ri + 1) + ': ' + (nm[rd.m] || 'Player') + "'s code" : rd.m >= 0 && nm[rd.m] ? nm[rd.m] + "'s code" : 'The secret code';
      var cname = code.map(function (c) { return c === C ? 'Blank' : MM_NAME[c] || '?'; }).join(', ');
      var sub = rd.ok ? (nm[rd.k] || 'Breaker') + ' cracked it in ' + gs.length + (gs.length === 1 ? ' guess' : ' guesses') : 'Never cracked';
      out.push(ui.section(title, [ui.picture(mmBoard(code, gs, P, C, 'Code: ' + cname), { frame: 'wood', max: P === 5 ? 280 : 250 }), ui.facts([['Code', cname], ['Result', sub]])]));
    });
    return ui.wrap(out);
  });

  // ═════════════════════════════════════════════════════════════════════════
  // Dominoes: the last hand's line of play, and what everyone was left holding
  // ═════════════════════════════════════════════════════════════════════════
  var PIPS = { 0: [], 1: [[1, 1]], 2: [[0, 0], [2, 2]], 3: [[0, 0], [1, 1], [2, 2]], 4: [[0, 0], [0, 2], [2, 0], [2, 2]], 5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]], 6: [[0, 0], [1, 0], [2, 0], [0, 2], [1, 2], [2, 2]] };
  // a tile a|b; vertical = standing up (a on top). pips = [row, col] in a 3x3 grid on each half
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
  var DOM_V = { draw: 'Draw game', block: 'Block game', fives: 'All Fives' };
  R('dominoes', function (e, ui) {
    var d = e.dt; if (!d) return null;
    var nm = names(e), out = [];
    if (d.ln && d.ln.r) {
      var L = d.ln, r = domPairs(L.r)[0], W = domPairs(L.W), E = domPairs(L.E), html = '';
      W.slice().reverse().forEach(function (t) { html += domSvg(t[1], t[0], t[0] === t[1]); });
      html += domSvg(r[0], r[1], r[0] === r[1], L.sp ? 'hl' : '');
      E.forEach(function (t) { html += domSvg(t[0], t[1], t[0] === t[1]); });
      var line = ui.el('div', { class: 'hvb-dom', html: html });
      var nodes = [ui.el('div', { class: 'hv-snap f-felt', style: { 'max-width': '380px', 'line-height': 'normal' } }, [line])];
      ['N', 'S'].forEach(function (k) {
        var arm = domPairs(L[k]); if (!arm.length) return;
        var h2 = ''; arm.forEach(function (t) { h2 += domSvg(t[0], t[1], t[0] === t[1]); });
        nodes.push(ui.el('div', { class: 'hv-snap f-felt', style: { 'max-width': '380px', 'line-height': 'normal', padding: '6px' } }, [
          ui.el('div', { style: { color: 'rgba(255,255,255,.6)', 'font-size': '.72rem', 'font-weight': '800', 'margin-bottom': '4px', 'text-align': 'center' }, text: 'Off the spinner, ' + (k === 'N' ? 'up' : 'down') }),
          ui.el('div', { class: 'hvb-dom', html: h2 })]));
      });
      var cnt = 1 + W.length + E.length + domPairs(L.N).length + domPairs(L.S).length;
      out.push(ui.section('Hand ' + (d.h || '') + ': the line of play (' + cnt + ' tiles)', ui.el('div', { class: 'hvb-mm' }, nodes)));
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
    out.push(ui.facts([['Game', DOM_V[d.v] || ''], ['Hands', d.h || ''], ['Last hand', d.k === 'domino' ? (nm[d.wi] ? nm[d.wi] + ' dominoed' : 'Domino') : d.k === 'block' ? 'Blocked' : d.k === 'match' ? 'Reached the target mid-hand' : ''], ['Boneyard', d.v === 'block' ? '' : d.bn != null ? d.bn + ' tiles left' : '']]));
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
