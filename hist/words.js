'use strict';
// History views: words
(function () {
  if (!window.HistView) return;
  var R = HistView.register;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function words(s) { return String(s || '').split(' ').filter(Boolean); }
  function up(s) { return String(s || '').toUpperCase(); }

  HistView.css('hv-words',
    /* paper sheet (crossword, word search) */
    '.hvw-paper{align-self:center;width:100%;max-width:360px;border-radius:4px;padding:10px 10px 12px;color:#16130f;background:linear-gradient(180deg,#fbf7ea,#efe7d2);box-shadow:0 1px 0 rgba(255,255,255,.6) inset,0 10px 22px -8px rgba(0,0,0,.6);}' +
    '.hvw-paper svg{display:block;width:100%;height:auto;}' +
    '.hvw-mast{display:flex;align-items:baseline;justify-content:space-between;gap:8px;border-bottom:2px solid #16130f;padding:0 2px 4px;margin-bottom:8px;font-family:Georgia,"Times New Roman",serif;}' +
    '.hvw-mast b{font-size:1rem;letter-spacing:.04em;font-weight:700;font-variant:small-caps;}' +
    '.hvw-mast span{font-size:.78rem;font-style:italic;color:#6b6455;white-space:nowrap;}' +
    '.hvw-key{display:flex;flex-wrap:wrap;gap:4px 12px;margin-top:8px;font-size:.72rem;color:#6b6455;font-family:Georgia,serif;font-style:italic;}' +
    '.hvw-key i{display:inline-block;width:11px;height:11px;margin-right:4px;vertical-align:-1px;border:1px solid #16130f;background:#fffdf7;position:relative;}' +
    '.hvw-key i.rv{background:linear-gradient(225deg,#d01b2a 0 34%,#fffdf7 34%);}' +
    '.hvw-key i.ck{background:#fffdf7;box-shadow:inset 0 0 0 3px #a9c7ee;}' +
    /* clue list */
    '.hvw-clues{display:grid;grid-template-columns:1fr;gap:10px;}' +
    '@media (min-width:520px){.hvw-clues{grid-template-columns:1fr 1fr;}}' +
    '.hvw-clues h5{margin:0 0 4px;font-family:Georgia,serif;font-variant:small-caps;font-size:.92rem;letter-spacing:.05em;color:var(--text-2);border-bottom:1px solid rgba(255,255,255,.1);padding-bottom:2px;}' +
    '.hvw-clue{display:grid;grid-template-columns:22px 1fr;gap:2px 6px;padding:4px 2px;font-size:.86rem;line-height:1.3;color:var(--text-2);}' +
    '.hvw-clue b{color:var(--text);font-weight:900;text-align:right;}' +
    '.hvw-clue em{grid-column:2;font-style:normal;font-weight:900;letter-spacing:.12em;font-size:.78rem;color:var(--text-3);}' +
    '.hvw-clue.miss em{color:#ff8a94;}' +
    '.hvw-clue.miss em::after{content:" · revealed";letter-spacing:0;font-weight:700;}' +
    '.hvw-more{font-size:.85rem;color:var(--text-2);}' +
    '.hvw-more summary{cursor:pointer;font-weight:800;color:var(--text-2);padding:4px 0;}' +
    /* wordle */
    '.hvw-wgrid{align-self:center;display:flex;flex-direction:column;gap:5px;padding:12px;border-radius:14px;background:#121318;box-shadow:inset 0 0 0 1px rgba(255,255,255,.06);}' +
    '.hvw-wgrid .hv-tiles{gap:5px;flex-wrap:nowrap;}' +
    '.hvw-wgrid .hv-tile{width:40px;height:40px;border-radius:4px;font-size:1.3rem;}' +
    '.hvw-wgrid .hv-tile.s-b{background:#3a3a3c;}' +
    '.hvw-wgrid .hv-tile.s-y{background:#c9a227;}' +
    '.hvw-wgrid .hv-tile.s-g{background:#4a9b4f;}' +
    '.hvw-wgrid .hv-tile.s-x{box-shadow:inset 0 0 0 2px #2b2c31;}' +
    '.hvw-ans{display:flex;align-items:center;gap:10px;flex-wrap:wrap;}' +
    '.hvw-ans .hv-tile{width:34px;height:34px;font-size:1.1rem;}' +
    '.hvw-kb{display:flex;flex-direction:column;gap:4px;align-items:center;}' +
    '.hvw-kb div{display:flex;gap:3px;}' +
    '.hvw-kb span{display:grid;place-items:center;width:24px;height:30px;border-radius:4px;font-size:.78rem;font-weight:900;background:rgba(255,255,255,.14);color:var(--text);}' +
    '.hvw-kb span.g{background:#4a9b4f;color:#fff;}.hvw-kb span.y{background:#c9a227;color:#fff;}.hvw-kb span.b{background:#26272c;color:rgba(255,255,255,.35);}' +
    /* spelling bee */
    '.hvw-bee{display:flex;gap:14px;align-items:center;flex-wrap:wrap;justify-content:center;}' +
    '.hvw-bee svg{width:150px;height:auto;flex:none;}' +
    '.hvw-ladder{display:flex;flex-direction:column;gap:3px;min-width:150px;flex:1;}' +
    '.hvw-ladder div{display:flex;align-items:center;gap:8px;font-size:.8rem;color:var(--text-3);font-weight:700;}' +
    '.hvw-ladder i{flex:none;width:10px;height:10px;border-radius:50%;background:rgba(255,255,255,.12);}' +
    '.hvw-ladder div.got{color:var(--text-2);}.hvw-ladder div.got i{background:#c99a1e;}' +
    '.hvw-ladder div.now{color:var(--text);font-weight:900;}.hvw-ladder div.now i{background:#f7c600;box-shadow:0 0 0 3px rgba(247,198,0,.25);}' +
    '.hvw-wl .hv-chip{text-transform:uppercase;letter-spacing:.04em;}' +
    /* boggle */
    '.hvw-tray{align-self:center;width:100%;max-width:300px;line-height:0;}' +
    '.hvw-tray svg{width:100%;height:auto;display:block;}' +
    '.hvw-ptl{display:flex;flex-direction:column;gap:10px;}' +
    '.hvw-pw{display:flex;flex-direction:column;gap:5px;}' +
    '.hvw-pw .h{display:flex;align-items:center;gap:8px;font-weight:800;font-size:.9rem;}' +
    '.hvw-pw .h .sp{flex:1;}.hvw-pw .h small{color:var(--text-3);font-weight:800;}' +
    '.hvw-tabs{display:flex;gap:6px;flex-wrap:wrap;}' +
    '.hvw-tabs button{border:0;border-radius:999px;padding:6px 12px;font-weight:800;font-size:.82rem;background:rgba(255,255,255,.07);color:var(--text-2);}' +
    '.hvw-tabs button.on{background:var(--text);color:var(--bg,#111);}' +
    /* hangman */
    '.hvw-hm{display:flex;flex-direction:column;gap:8px;}' +
    '.hvw-hmc{display:flex;gap:10px;align-items:center;padding:8px 10px;border-radius:12px;background:#22302a;background:linear-gradient(160deg,#2b3a33,#1d2722);box-shadow:inset 0 0 0 2px #5a4128,inset 0 0 0 4px #3b2a19;}' +
    '.hvw-hmc svg{flex:none;width:62px;height:auto;}' +
    '.hvw-hmc .info{flex:1;min-width:0;display:flex;flex-direction:column;gap:5px;}' +
    '.hvw-hmc .top{display:flex;gap:6px;align-items:baseline;font-size:.74rem;color:rgba(244,241,230,.6);font-weight:800;flex-wrap:wrap;}' +
    '.hvw-hmc .top b{color:#f4f1e6;font-size:.8rem;}' +
    '.hvw-hmc .top .ok{color:#9be3a6;}.hvw-hmc .top .no{color:#ff9d9d;}' +
    '.hvw-hmc .hv-tiles{gap:3px;}' +
    '.hvw-hmc .hv-tile{width:22px;height:26px;font-size:.85rem;border-radius:3px;background:transparent;box-shadow:inset 0 -2px 0 rgba(244,241,230,.55);color:#f4f1e6;font-family:"Chalkboard SE","Comic Sans MS",ui-rounded,sans-serif;}' +
    '.hvw-hmc .hv-tile.s-r{color:#ff9d9d;background:transparent;box-shadow:inset 0 -2px 0 rgba(255,157,157,.6);}' +
    '.hvw-hmc .hv-tile.s-n{width:10px;box-shadow:none;}' +
    '.hvw-hmc .miss{font-size:.78rem;color:rgba(244,241,230,.55);font-weight:700;}' +
    '.hvw-hmc .miss s{color:#ff9d9d;font-weight:900;letter-spacing:.12em;text-decoration-thickness:2px;margin-left:3px;}' +
    /* word scramble */
    '.hvw-sc{display:flex;flex-direction:column;gap:6px;}' +
    '.hvw-scr{display:grid;grid-template-columns:1fr auto auto;align-items:center;gap:4px 10px;padding:6px 8px;border-radius:10px;background:rgba(255,255,255,.04);}' +
    '.hvw-scr .mx{grid-column:1/-1;font-size:.7rem;font-weight:900;letter-spacing:.18em;color:var(--text-3);}' +
    '.hvw-scr .tm{font-size:.8rem;font-weight:800;color:var(--text-2);font-variant-numeric:tabular-nums;}' +
    '.hvw-scr .pt{font-size:.85rem;font-weight:900;min-width:34px;text-align:right;font-variant-numeric:tabular-nums;}' +
    '.hvw-scr .tg{grid-column:1/-1;font-size:.72rem;color:var(--text-3);font-weight:700;}' +
    '.hvw-scr.fast{box-shadow:inset 0 0 0 1.5px rgba(250,204,21,.6);}' +
    '.hvw-st{display:flex;gap:2px;flex-wrap:wrap;}' +
    '.hvw-st span{position:relative;display:grid;place-items:center;width:24px;height:26px;border-radius:4px;font-weight:900;font-size:.95rem;color:#2a1d0c;background:linear-gradient(180deg,#f6e2b4,#e3c588);box-shadow:inset 0 -2px 0 rgba(0,0,0,.18),0 1px 2px rgba(0,0,0,.4);}' +
    '.hvw-st span sub{position:absolute;right:2px;bottom:1px;font-size:.45rem;font-weight:800;line-height:1;}' +
    '.hvw-st.sk span{background:linear-gradient(180deg,#f2b8b8,#d98a8a);color:#4a1010;opacity:.85;}' +
    /* word search */
    '.hvw-wsl{display:grid;grid-template-columns:repeat(3,1fr);gap:3px 10px;margin:10px 2px 0;}' +
    '.hvw-wsl span{justify-self:start;font-weight:900;font-size:.74rem;letter-spacing:.05em;padding:1px 3px;border-radius:3px;font-family:"Courier New",ui-monospace,monospace;}' +
    '.hvw-wsl span.f{text-decoration:line-through;text-decoration-thickness:1.5px;color:rgba(22,19,15,.6);}' +
    '.hvw-wsl span.n{color:#b3122f;}' +
    '.hvw-wsl span small{font-family:system-ui;font-weight:700;font-size:.62rem;color:#6b6455;margin-left:3px;text-decoration:none;display:inline-block;}'
  );

  // ── Crossword: the filled grid like the newspaper, then the clues ──────────
  function cwNumber(g) {
    var n = g.length, num = [], words = [], k = 0;
    function blk(r, c) { return r < 0 || c < 0 || r >= n || c >= n || g[r].charAt(c) === '#'; }
    for (var r = 0; r < n; r++) { num.push([]); for (var c = 0; c < n; c++) {
      var a = !blk(r, c) && blk(r, c - 1) && !blk(r, c + 1), d = !blk(r, c) && blk(r - 1, c) && !blk(r + 1, c);
      num[r].push(a || d ? ++k : 0);
      [['a', a, 0, 1], ['d', d, 1, 0]].forEach(function (x) {
        if (!x[1]) return;
        var cells = [], rr = r, cc = c;
        while (!blk(rr, cc)) { cells.push([rr, cc]); rr += x[2]; cc += x[3]; }
        words.push({ dir: x[0], n: k, cells: cells, ans: cells.map(function (q) { return g[q[0]].charAt(q[1]); }).join('') });
      });
    } }
    return { n: n, num: num, words: words };
  }
  R('crossword', function (e, ui) {
    var d = e.dt; if (!d || !d.g || !d.g.length) return null;
    var g = d.g.map(up), m = d.m || [], M = cwNumber(g), n = M.n, cs = 40, W = n * cs + 2;
    var s = '<svg viewBox="-2 -2 ' + (W + 2) + ' ' + (W + 2) + '" role="img" aria-label="Filled crossword grid">';
    s += '<rect x="-1" y="-1" width="' + W + '" height="' + W + '" fill="#16130f"/>';
    for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) {
      var x = c * cs + 0.5, y = r * cs + 0.5, ch = g[r].charAt(c), mk = (m[r] || '').charAt(c);
      if (ch === '#') continue;
      s += '<rect x="' + x + '" y="' + y + '" width="' + (cs - 1) + '" height="' + (cs - 1) + '" fill="#fffdf7"/>';
      if (mk === 'r') s += '<path d="M' + (x + cs - 1 - 11) + ' ' + y + 'H' + (x + cs - 1) + 'V' + (y + 11) + 'Z" fill="#d01b2a"/>';
      if (M.num[r][c]) s += '<text x="' + (x + 2.5) + '" y="' + (y + 10) + '" font-size="9.5" font-family="Georgia,serif" fill="#16130f">' + M.num[r][c] + '</text>';
      s += '<text x="' + (x + cs / 2 - 0.5) + '" y="' + (y + cs * 0.66) + '" text-anchor="middle" font-size="21" font-weight="700" font-family="Helvetica Neue,Helvetica,Arial,sans-serif" fill="' + (mk === 'r' || mk === 'k' ? '#1f5fbf' : '#16130f') + '">' + esc(ch) + '</text>';
    }
    s += '</svg>';
    var anyRev = m.join('').indexOf('r') >= 0, anyChk = m.join('').indexOf('k') >= 0;
    var paper = ui.el('div', { class: 'hvw-paper' }, [
      ui.el('div', { class: 'hvw-mast', html: '<b>' + (d.sz === 'big' ? 'The Big Crossword' : 'The Mini Crossword') + '</b><span>' + esc(d.t || '') + (d.no ? ' · No. ' + d.no : '') + ' · ' + n + '×' + n + '</span>' }),
      ui.el('div', { html: s }),
      anyRev || anyChk ? ui.el('div', { class: 'hvw-key', html: (anyRev ? '<span><i class="rv"></i>Revealed</span>' : '') + (anyChk || anyRev ? '<span style="color:#1f5fbf;font-style:normal;font-weight:700;font-family:Helvetica,Arial,sans-serif">A</span><span>Blue letters were checked or revealed</span>' : '') }) : null
    ]);
    var revCells = m.join('').split('r').length - 1;
    var out = [ui.section(null, paper)];
    out.push(ui.stats([['Time', d.gu ? 'Revealed' : ui.time(d.s)], ['Checks', d.ch || 0], ['Reveals', d.rv || 0], ['Squares revealed', revCells || 0]]));
    // the clues, with the ones that needed revealing marked
    var A = d.a || [], D = d.d || [], ai = 0, di = 0;
    M.words.sort(function (x, y) { return (x.dir === y.dir ? 0 : x.dir === 'a' ? -1 : 1) || x.n - y.n; });
    M.words.forEach(function (w) { w.clue = w.dir === 'a' ? A[ai++] : D[di++]; w.miss = w.cells.some(function (q) { return (m[q[0]] || '').charAt(q[1]) === 'r'; }); });
    function list(ws) {
      var box = ui.el('div', { class: 'hvw-clues' });
      [['a', 'Across'], ['d', 'Down']].forEach(function (x) {
        var col = ui.el('div', null, [ui.el('h5', { text: x[1] })]), any = 0;
        ws.forEach(function (w) { if (w.dir !== x[0]) return; any++; col.appendChild(ui.el('div', { class: 'hvw-clue' + (w.miss ? ' miss' : '') }, [ui.el('b', { text: String(w.n) }), ui.el('span', { text: w.clue || '' }), ui.el('em', { text: w.ans })])); });
        if (any) box.appendChild(col);
      });
      return box;
    }
    var missed = M.words.filter(function (w) { return w.miss; });
    if (missed.length && !d.gu) out.push(ui.section('Clues you missed', list(missed), { icon: 'lightbulb' }));
    if (A.length || D.length) {
      if (missed.length && !d.gu) out.push(ui.el('details', { class: 'hvw-more' }, [ui.el('summary', { text: 'All ' + M.words.length + ' clues' }), list(M.words)]));
      else out.push(ui.section('Clues', list(M.words)));
    }
    return ui.wrap(out);
  });

  // ── Wordle: the guess grid, the answer, the keyboard at the end ────────────
  function wordleCheck(guess, ans) {
    var res = ['b', 'b', 'b', 'b', 'b'], left = ans.split('');
    for (var i = 0; i < 5; i++) if (guess[i] === ans[i]) { res[i] = 'g'; left[i] = null; }
    for (i = 0; i < 5; i++) { if (res[i] === 'g') continue; var k = left.indexOf(guess[i]); if (k >= 0) { res[i] = 'y'; left[k] = null; } }
    return res.join('');
  }
  R('wordle', function (e, ui) {
    var ans = up(e.answer), gs = (e.guesses || []).map(up);
    if (!ans || !gs.length) return null;
    var grid = ui.el('div', { class: 'hvw-wgrid' }), best = {}, rank = { b: 1, y: 2, g: 3 };
    for (var i = 0; i < 6; i++) {
      if (gs[i]) { var st = wordleCheck(gs[i], ans); grid.appendChild(ui.tiles(gs[i], st)); gs[i].split('').forEach(function (ch, j) { var v = st.charAt(j); if (!best[ch] || rank[v] > rank[best[ch]]) best[ch] = v; }); }
      else grid.appendChild(ui.tiles('_____', 'xxxxx'));
    }
    var won = gs[gs.length - 1] === ans;
    var out = [ui.section(null, grid)];
    out.push(ui.section('The word', ui.el('div', { class: 'hvw-ans' }, [ui.tiles(ans, won ? 'ggggg' : 'rrrrr'),
      ui.el('span', { class: 'muted', style: { 'font-weight': '800', 'font-size': '.88rem' }, text: won ? 'Solved in ' + gs.length + '/6' + (e.hard ? ' · hard mode' : '') : 'Not solved' + (e.hard ? ' · hard mode' : '') })])));
    var kb = ui.el('div', { class: 'hvw-kb' });
    ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'].forEach(function (row) {
      kb.appendChild(ui.el('div', null, row.split('').map(function (k) { return ui.el('span', { class: best[k] || '', text: k }); })));
    });
    out.push(ui.section('Keyboard at the end', kb));
    return ui.wrap(out);
  });

  // ── Spelling Bee: the hive, the rank ladder, found and missed words ────────
  var BEE_RANKS = [['Beginner', 0], ['Good Start', 2], ['Moving Up', 5], ['Good', 8], ['Solid', 15], ['Nice', 25], ['Great', 40], ['Amazing', 50], ['Genius', 70], ['Queen Bee', 100]];
  function hive(letters, center) {
    var outer = letters.replace(center, '').split(''), r = 26, h = r * Math.sqrt(3) / 2;
    function hex(cx, cy, fill, ch, ink) {
      var p = []; for (var k = 0; k < 6; k++) { var a = Math.PI / 3 * k; p.push((cx + (r - 2) * Math.cos(a)).toFixed(1) + ',' + (cy + (r - 2) * Math.sin(a)).toFixed(1)); }
      return '<polygon points="' + p.join(' ') + '" fill="' + fill + '"/><text x="' + cx + '" y="' + (cy + 1) + '" text-anchor="middle" dominant-baseline="central" font-size="20" font-weight="800" fill="' + ink + '" font-family="Helvetica Neue,Helvetica,Arial,sans-serif">' + esc(up(ch)) + '</text>';
    }
    var cx = 80, cy = 80, pos = [[0, -2 * h], [1.5 * r, -h], [1.5 * r, h], [0, 2 * h], [-1.5 * r, h], [-1.5 * r, -h]];
    var s = '<svg viewBox="0 0 160 160" role="img" aria-label="The hive">';
    pos.forEach(function (q, i) { s += hex(cx + q[0], cy + q[1], '#e6e6e6', outer[i] || '', '#16130f'); });
    s += hex(cx, cy, '#f7c600', center, '#16130f') + '</svg>';
    return s;
  }
  R('spellingbee', function (e, ui) {
    var L = String(e.letters || ''), C = String(e.center || ''), found = (e.found || []).map(String);
    if (!L || !C) return null;
    var d = e.dt || {}, pg = words(d.pg), miss = words(d.miss);
    function isPan(w) { return L.split('').every(function (ch) { return w.indexOf(ch) >= 0; }); }
    var ri = d.ri != null ? d.ri : BEE_RANKS.map(function (x) { return x[0]; }).indexOf(e.rank);
    var ladder = ui.el('div', { class: 'hvw-ladder' });
    for (var i = 9; i >= 0; i--) {
      var need = i === 9 ? e.max : Math.round(BEE_RANKS[i][1] / 100 * (e.max || 0));
      ladder.appendChild(ui.el('div', { class: i === ri ? 'now' : i < ri ? 'got' : '' }, [ui.el('i'), ui.el('span', { text: BEE_RANKS[i][0] + (e.max ? ' · ' + need : '') })]));
    }
    var out = [ui.section(null, ui.el('div', { class: 'hvw-bee' }, [ui.el('div', { html: hive(L, C) }), ri >= 0 ? ladder : null]))];
    var pansFound = found.filter(isPan);
    out.push(ui.stats([['Points', e.score != null ? e.score + (e.max ? ' / ' + e.max : '') : null], ['Words', found.length + (e.words ? ' / ' + e.words : '')], ['Pangrams', pg.length ? pansFound.length + ' / ' + pg.length : pansFound.length]]));
    var sorted = found.slice().sort(function (a, b) { return a < b ? -1 : 1; });
    out.push(ui.section('Words found', ui.el('div', { class: 'hvw-wl' }, [ui.chips(sorted.map(function (w) { return isPan(w) ? { t: w, on: true, c: '#f7c600' } : { t: w }; }))])));
    if (miss.length) {
      var more = e.words && e.words - found.length > miss.length ? e.words - found.length - miss.length : 0;
      out.push(ui.section('Words missed', ui.el('div', { class: 'hvw-wl' }, [ui.chips(miss.map(function (w) { return isPan(w) ? { t: w, on: true, c: '#f7c600' } : { t: w, c: '#8b93a7' }; }).concat(more ? [{ t: '+' + more + ' more', c: '#8b93a7' }] : []))])));
    } else if (e.dt && e.words && found.length === e.words) out.push(ui.facts([['Missed', 'Nothing. Every word found.']]));
    return ui.wrap(out);
  });

  // ── Boggle: the tray, everyone's words, what nobody found ──────────────────
  function boggleTray(board, path, size) {
    var n = size || Math.round(Math.sqrt(board.length)), cs = 46, gap = 6, pad = 12, W = pad * 2 + n * cs + (n - 1) * gap, on = {};
    (path || []).forEach(function (i) { on[i] = 1; });
    var s = '<svg viewBox="0 0 ' + W + ' ' + (W + 6) + '" role="img" aria-label="Boggle board"><defs>' +
      '<linearGradient id="hvbt" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff9a3d"/><stop offset=".55" stop-color="#f06a12"/><stop offset="1" stop-color="#c94f05"/></linearGradient>' +
      '<radialGradient id="hvbc" cx=".3" cy=".22" r="1"><stop offset="0" stop-color="#fff"/><stop offset=".45" stop-color="#f7f2e6"/><stop offset="1" stop-color="#ddd3bc"/></radialGradient>' +
      '<radialGradient id="hvbp" cx=".3" cy=".22" r="1"><stop offset="0" stop-color="#fff8d6"/><stop offset=".5" stop-color="#ffe07a"/><stop offset="1" stop-color="#f5bf2a"/></radialGradient></defs>';
    s += '<rect x="0" y="6" width="' + W + '" height="' + W + '" rx="18" fill="#8f3a04"/><rect x="0" y="0" width="' + W + '" height="' + W + '" rx="18" fill="url(#hvbt)"/>';
    var cx = function (i) { return pad + (i % n) * (cs + gap) + cs / 2; }, cy = function (i) { return pad + Math.floor(i / n) * (cs + gap) + cs / 2; };
    board.forEach(function (ch, i) {
      var x = pad + (i % n) * (cs + gap), y = pad + Math.floor(i / n) * (cs + gap);
      s += '<rect x="' + x + '" y="' + (y + 3) + '" width="' + cs + '" height="' + cs + '" rx="8" fill="' + (on[i] ? '#b88a12' : '#b8ab8e') + '"/>';
      s += '<rect x="' + x + '" y="' + y + '" width="' + cs + '" height="' + cs + '" rx="8" fill="url(#' + (on[i] ? 'hvbp' : 'hvbc') + ')"/>';
      var qu = ch.length > 1;
      s += '<text x="' + (x + cs / 2) + '" y="' + (y + cs / 2 + 1) + '" text-anchor="middle" dominant-baseline="central" font-size="' + (qu ? 18 : 25) + '" font-weight="900" fill="#1b1a24" font-family="Arial Black,Helvetica Neue,sans-serif">' + esc(qu ? 'Qu' : ch) + '</text>';
    });
    if (path && path.length > 1) s += '<polyline points="' + path.map(function (i) { return cx(i) + ',' + cy(i); }).join(' ') + '" fill="none" stroke="rgba(255,120,0,.45)" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>';
    return s + '</svg>';
  }
  function bogglePath(board, word) {
    var n = Math.round(Math.sqrt(board.length)), w = up(word), best = null;
    function go(i, at, used) {
      var f = board[i]; if (w.substr(at, f.length) !== f) return false;
      used.push(i); at += f.length;
      if (at === w.length) { best = used.slice(); return true; }
      for (var j = 0; j < board.length; j++) {
        if (used.indexOf(j) >= 0) continue;
        if (Math.abs(Math.floor(i / n) - Math.floor(j / n)) <= 1 && Math.abs(i % n - j % n) <= 1 && go(j, at, used)) return true;
      }
      used.pop(); return false;
    }
    for (var i = 0; i < board.length && !best; i++) go(i, 0, []);
    return best;
  }
  R('boggle', function (e, ui) {
    var d = e.dt, P = e.players || [];
    var rounds = d && d.r && d.r.length ? d.r : (e.boards || []).map(function (b) { return { b: b }; });
    if (!rounds.length) return null;
    var body = ui.el('div', { class: 'hv' }), cur = rounds.length - 1;
    function show(ri) {
      var r = rounds[ri], board = String(r.b || '').split(',').map(up), pw = (r.w || []).map(words), crossed = words(r.x);
      var longest = '';
      pw.forEach(function (ws) { ws.forEach(function (w) { if (crossed.indexOf(w) < 0 && (w.length > longest.length || (w.length === longest.length && w < longest))) longest = w; }); });
      body.innerHTML = '';
      var path = longest ? bogglePath(board, longest) : null;
      body.appendChild(ui.el('div', { class: 'hvw-tray', html: boggleTray(board, path, d && d.sz) }));
      if (longest) body.appendChild(ui.facts([['Longest word', up(longest) + ' (' + longest.length + ' letters' + (pw.length > 1 ? ', ' + (P[pw.findIndex(function (ws) { return ws.indexOf(longest) >= 0; })] || {}).name : '') + ')'], ['Words in the grid', r.n || null]]));
      if (pw.length) {
        var box = ui.el('div', { class: 'hvw-ptl' });
        pw.forEach(function (ws, pi) {
          var srt = ws.slice().sort(function (a, b) { return b.length - a.length || (a < b ? -1 : 1); });
          box.appendChild(ui.el('div', { class: 'hvw-pw' }, [
            ui.el('div', { class: 'h' }, [ui.who((P[pi] || {}).name || 'Player ' + (pi + 1), pi), ui.el('span', { class: 'sp' }), ui.el('small', { text: ws.length + (ws.length === 1 ? ' word' : ' words') + (r.s ? ' · ' + r.s[pi] + ' pts' : '') })]),
            ws.length ? ui.el('div', { class: 'hvw-wl' }, [ui.chips(srt.map(function (w) { return { t: w, c: ui.color(pi), off: crossed.indexOf(w) >= 0 }; }))]) : ui.el('small', { class: 'muted', text: 'No words' })
          ]));
        });
        body.appendChild(ui.section(pw.length > 1 ? 'Words found' : 'Your words', box));
        if (crossed.length) body.appendChild(ui.el('small', { class: 'muted', text: 'Crossed out: found by more than one player.' }));
      }
      var miss = words(r.m);
      if (miss.length) body.appendChild(ui.section('Words nobody found', ui.el('div', { class: 'hvw-wl' }, [ui.chips(miss.map(function (w) { return { t: w, c: '#8b93a7' }; }))])));
    }
    var out = [];
    if (rounds.length > 1) {
      var tabs = ui.el('div', { class: 'hvw-tabs' });
      rounds.forEach(function (r, i) {
        tabs.appendChild(ui.el('button', { type: 'button', class: i === cur ? 'on' : '', text: 'Round ' + (i + 1), onclick: function () { cur = i; [].forEach.call(tabs.children, function (b, j) { b.classList.toggle('on', j === i); }); show(i); } }));
      });
      out.push(tabs);
    }
    show(cur); out.push(body);
    return ui.wrap(out);
  });

  // ── Hangman: each word on its own little chalkboard ─────────────────────────
  function hmPic(w, theme) {
    var max = w.mx || 6, mi = Math.min(w.m || 0, max), lost = !w.ok, ch = '#f4f1e6', red = '#ff9d9d', s = '';
    function L(x1, y1, x2, y2, c, sw) { return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="' + (c || ch) + '" stroke-width="' + (sw || 5) + '" stroke-linecap="round"/>'; }
    if (theme === 'balloons') {
      var P = [[100, 38], [74, 50], [126, 50], [87, 18], [113, 18], [52, 32], [148, 32], [62, 66], [138, 66], [100, 64]];
      var COLS = ['#ffb3c2', '#9fd3ff', '#ffe28a', '#b6f0a8', '#d8b8ff', '#ffc999', '#9ff0e0', '#ffb3c2', '#9fd3ff', '#ffe28a'], left = max - mi;
      for (var b = max - 1; b >= 0; b--) {
        var p = P[b];
        if (b < left) s += '<path d="M' + p[0] + ' ' + (p[1] + 17) + ' L100 142" stroke="rgba(244,241,230,.4)" stroke-width="2"/><ellipse cx="' + p[0] + '" cy="' + p[1] + '" rx="14" ry="17" fill="none" stroke="' + COLS[b] + '" stroke-width="4"/>';
        else s += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="3" fill="' + COLS[b] + '" opacity=".5"/>';
      }
      var by = lost ? 175 : 146;
      s += '<path d="M82 ' + by + ' H118 L113 ' + (by + 26) + ' H87 Z" fill="none" stroke="#e2b37a" stroke-width="4" stroke-linejoin="round"/>';
      s += '<circle cx="100" cy="' + (by - 13) + '" r="7" fill="none" stroke="' + (lost ? red : ch) + '" stroke-width="3.5"/>';
      s += L(10, 207, 190, 207, 'rgba(244,241,230,.5)', 3);
      return '<svg viewBox="0 0 200 215" aria-hidden="true">' + s + '</svg>';
    }
    // classic: 10 strokes; fewer allowed misses means the first strokes were drawn from the start
    var parts = [L(18, 205, 152, 205), L(48, 205, 48, 18), L(42, 20, 140, 20) + L(48, 58, 86, 20), L(130, 20, 130, 46),
      '<circle cx="130" cy="62" r="16" fill="none" stroke="@" stroke-width="4.5"/>', L(130, 78, 130, 132, '@', 4.5), L(130, 92, 106, 116, '@', 4.5), L(130, 92, 154, 116, '@', 4.5), L(130, 132, 112, 170, '@', 4.5), L(130, 132, 148, 170, '@', 4.5)];
    var shown = 10 - max + mi;
    for (var i = 0; i < Math.min(shown, 10); i++) {
      if (i < 4) { if (i === 3 && w.ok) s += L(130, 20, 130, 30); else s += parts[i]; }
      else if (!w.ok) s += parts[i].replace(/@/g, red);
    }
    if (w.ok) {
      // freed: the figure stands on the ground beside the gallows
      var y = '#ffe28a';
      s += '<circle cx="172" cy="132" r="13" fill="none" stroke="' + y + '" stroke-width="4"/>' + L(172, 145, 172, 178, y, 4) + L(172, 156, 152, 146, y, 4) + L(172, 156, 192, 146, y, 4) + L(172, 178, 160, 204, y, 4) + L(172, 178, 184, 204, y, 4) +
        '<path d="M166 134 Q172 140 178 134" fill="none" stroke="' + y + '" stroke-width="2.5"/>';
    }
    return '<svg viewBox="0 0 200 215" aria-hidden="true">' + s + '</svg>';
  }
  R('hangman', function (e, ui) {
    var d = e.dt, P = e.players || [], duel = P.length > 1;
    var list = d && d.w ? d.w : (e.words || []).map(function (x) { return { w: x.w, ok: x.won ? 1 : 0, m: x.misses, mx: { easy: 10, medium: 8, hard: 6 }[e.diff] || 6, g: '' }; });
    if (!list.length) return null;
    var box = ui.el('div', { class: 'hvw-hm' });
    list.forEach(function (w) {
      var word = up(w.w), gs = up(w.g), have = !!gs;
      var tiles = '', st = '';
      word.split('').forEach(function (c) { if (c === ' ') { tiles += '_'; st += 'n'; } else { tiles += c; st += !w.ok && have && gs.indexOf(c) < 0 ? 'r' : 'w'; } });
      if (!w.ok && !have) st = st.replace(/w/g, 'r');
      var missed = gs.split('').filter(function (c) { return word.indexOf(c) < 0; }).join(' ');
      var top = [ui.el('b', { text: w.ok ? 'Saved' : 'Lost', class: w.ok ? 'ok' : 'no' }), ui.el('span', { text: w.m + ' of ' + w.mx + ' misses' })];
      if (w.c) top.push(ui.el('span', { text: '· ' + w.c }));
      if (duel && w.gu != null) top.push(ui.el('span', { text: '· ' + ((P[w.gu] || {}).name || '') + ' guessing' }));
      if (w.ok && w.p) top.push(ui.el('span', { text: '· +' + w.p + (w.p === 1 ? ' pt' : ' pts') }));
      if (!w.ok && w.st) top.push(ui.el('span', { text: '· +' + w.st + ' to ' + ((P[w.se] || {}).name || 'setter') }));
      var extras = [];
      if (w.wh) extras.push('solved in one go');
      if (w.cl) extras.push('used the clue');
      box.appendChild(ui.el('div', { class: 'hvw-hmc' }, [
        ui.el('div', { html: hmPic(w, d && d.th) }),
        ui.el('div', { class: 'info' }, [
          ui.el('div', { class: 'top' }, top),
          ui.tiles(tiles, st),
          missed ? ui.el('div', { class: 'miss', html: 'Wrong letters<s>' + esc(missed) + '</s>' }) : have ? ui.el('div', { class: 'miss', text: 'No wrong letters' }) : null,
          extras.length ? ui.el('div', { class: 'miss', text: extras.join(' · ') }) : null
        ])
      ]));
    });
    return ui.wrap([ui.section(list.length === 1 ? 'The word' : 'The words', box)]);
  });

  // ── Word Scramble: every word, how long it took ────────────────────────────
  var VAL = { A: 1, B: 3, C: 3, D: 2, E: 1, F: 4, G: 2, H: 4, I: 1, J: 8, K: 5, L: 1, M: 3, N: 1, O: 1, P: 3, Q: 10, R: 1, S: 1, T: 1, U: 1, V: 4, W: 4, X: 8, Y: 4, Z: 10 };
  function scTiles(w, skipped) {
    return '<div class="hvw-st' + (skipped ? ' sk' : '') + '">' + up(w).split('').map(function (c) { return '<span>' + esc(c) + '<sub>' + (VAL[c] || '') + '</sub></span>'; }).join('') + '</div>';
  }
  R('wordscramble', function (e, ui) {
    var d = e.dt; if (!d || !d.t || !d.t.length) return null;
    var P = e.players || [], multi = P.length > 1, out = [];
    var allW = [];
    d.t.forEach(function (T) {
      T.ws = words(T.w).map(function (s) { var p = s.split('.'); return { w: p[0], mix: p[1], pts: +p[2] || 0, s: p[3] === '' || p[3] == null ? null : +p[3], fl: p.slice(4).join('.') || '' }; });
      T.ws.forEach(function (x) { if (x.fl.replace(/a=.*/, '').indexOf('k') < 0) allW.push(x); });
    });
    var fastest = allW.filter(function (x) { return x.s != null; }).sort(function (a, b) { return a.s - b.s; })[0];
    var solved = allW.length, timed = allW.filter(function (x) { return x.s != null; });
    var avg = timed.length ? Math.round(timed.reduce(function (s, x) { return s + x.s; }, 0) / timed.length) : null;
    out.push(ui.stats([['Solved', solved], ['Average', avg != null ? avg + 's' : null], ['Fastest', fastest ? fastest.s + 's' : null, fastest ? up(fastest.w) : '']]));
    d.t.forEach(function (T) {
      var box = ui.el('div', { class: 'hvw-sc' });
      T.ws.forEach(function (x) {
        var base = x.fl.replace(/a=.*/, ''), sk = base.indexOf('k') >= 0, alt = (/a=([A-Z]+)/.exec(x.fl) || [])[1], tags = [];
        if (sk) tags.push('Skipped');
        if (base.indexOf('c') >= 0) tags.push('used the clue');
        if (base.indexOf('h') >= 0) tags.push('letter hint');
        if (alt) tags.push('played ' + alt + ' (we had ' + up(x.w) + ')');
        box.appendChild(ui.el('div', { class: 'hvw-scr' + (x === fastest ? ' fast' : '') }, [
          x.mix ? ui.el('div', { class: 'mx', text: up(x.mix) }) : null,
          ui.el('div', { html: scTiles(alt || x.w, sk) }),
          ui.el('span', { class: 'tm', text: x.s != null ? x.s + 's' : '' }),
          ui.el('span', { class: 'pt', text: sk ? '–' : '+' + x.pts }),
          tags.length ? ui.el('div', { class: 'tg', text: tags.join(' · ') }) : null
        ]));
      });
      if (!T.ws.length) box.appendChild(ui.el('small', { class: 'muted', text: 'No words' }));
      var title = multi ? ((P[T.p] || {}).name || 'Player') + (d.t.length > P.length ? ' · round ' + (T.r + 1) : '') + ' · ' + T.sc + ' pts' : 'Words';
      out.push(ui.section(title, box));
    });
    return ui.wrap(out);
  });

  // ── Word Search: the printed grid with highlighter marks, and the list ─────
  var WS_HL = ['#ffe14d', '#ff9ccf', '#8ee59a', '#8fd0ff', '#ffb867', '#cdb0ff', '#7fe8d8', '#ffd0a0'];
  R('wordsearch', function (e, ui) {
    var d = e.dt; if (!d || !d.g || !d.g.length) return null;
    var g = d.g.map(up), n = g.length, cs = 24, W = n * cs;
    var ws = (d.w || []).map(function (s) { var p = String(s).split(' '); return { w: p[0], r: +p[1], c: +p[2], dr: +p[3], dc: +p[4], f: +p[5] || 0, t: p[6] === '' || p[6] == null ? null : +p[6] }; });
    var s = '<svg viewBox="-2 -2 ' + (W + 4) + ' ' + (W + 4) + '" role="img" aria-label="Word search grid">';
    ws.forEach(function (w) {
      var L = w.w.length - 1, x1 = w.c * cs + cs / 2, y1 = w.r * cs + cs / 2, x2 = (w.c + w.dc * L) * cs + cs / 2, y2 = (w.r + w.dr * L) * cs + cs / 2;
      if (w.f) s += '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="' + WS_HL[(w.f - 1) % WS_HL.length] + '" stroke-width="' + cs * 0.8 + '" stroke-linecap="round" opacity=".7"/>';
      else s += '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="#b3122f" stroke-width="' + cs * 0.78 + '" stroke-linecap="round" fill="none" opacity=".12"/>' +
        '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="#b3122f" stroke-width="1.6" stroke-dasharray="3 2.5" stroke-linecap="round" opacity=".85"/>';
    });
    for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) s += '<text x="' + (c * cs + cs / 2) + '" y="' + (r * cs + cs / 2 + 1) + '" text-anchor="middle" dominant-baseline="central" font-size="15" font-weight="900" fill="#262636" font-family="Courier New,ui-monospace,monospace">' + esc(g[r].charAt(c)) + '</text>';
    s += '</svg>';
    var list = ui.el('div', { class: 'hvw-wsl' });
    ws.forEach(function (w) {
      list.appendChild(ui.el('span', { class: w.f ? 'f' : 'n', style: w.f ? { background: WS_HL[(w.f - 1) % WS_HL.length] } : null, html: esc(w.w) }));
    });
    var found = ws.filter(function (w) { return w.f; }).sort(function (a, b) { return a.f - b.f; });
    var mode = String(e.mode || '').split(' · ')[1] || e.cat || 'Word Search';
    var paper = ui.el('div', { class: 'hvw-paper' }, [ui.el('div', { class: 'hvw-mast', html: '<b>' + esc(mode) + '</b><span>' + n + '×' + n + ' · ' + found.length + ' of ' + ws.length + ' found</span>' }), ui.el('div', { html: s }), list]);
    var out = [ui.section(null, paper)];
    out.push(ui.stats([['Time', e.seconds != null ? ui.time(e.seconds) : null, d.lim ? 'of ' + ui.time(d.lim) : ''], ['Found', found.length + ' / ' + ws.length], ['Hints', e.hints || 0]]));
    if (found.length > 1 && found.some(function (w) { return w.t != null; })) {
      var prev = 0;
      out.push(ui.section('Order found', ui.log(found.map(function (w) { var gap = w.t - prev; prev = w.t; return { b: ui.time(w.t), t: w.w + (found.indexOf(w) ? '  (+' + Math.max(0, gap) + 's)' : ''), c: WS_HL[(w.f - 1) % WS_HL.length] }; }))));
    }
    if (found.length < ws.length) out.push(ui.facts([['Not found', ws.filter(function (w) { return !w.f; }).map(function (w) { return w.w; }).join(', ')]]));
    return ui.wrap(out);
  });
})();
