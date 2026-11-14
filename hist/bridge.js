'use strict';
// History view: Bridge. Every deal as a bridge diagram (the four hands round the board, with the dealer and who was
// vulnerable), the auction by seat, the contract, the opening lead, what was made, the score of the deal and its
// moments; then the whole score pad, above and below the line, and what decided the game.
// The record's detail (games/bridge/table.js recordGame): names [S, W, N, E], fmt, hx [{n deal, d dealer, v vul
// code, h 'pbnS/pbnW/pbnN/pbnE', a calls joined by '.', k contract ('4HX'), de declarer, l opening lead, t tricks
// the declarer's side took, s 'ns.ew' points, g side that made game (-1), m moments joined by '.', hn honors, po
// passed out}], rows ['side:pts:above:game:deal:why'], games 'ns.ew'.
(function () {
  if (!window.HistView) return;
  function K() { return window.Kit; }
  function el(t, a, k) { return K().el(t, a, k); }
  var SEAT = ['South', 'West', 'North', 'East'], GL = { s: '♠', h: '♥', d: '♦', c: '♣' }, STN = { C: 'c', D: 'd', H: 'h', S: 's' };
  var WORD = { c: 'clubs', d: 'diamonds', h: 'hearts', s: 'spades' };
  function first(n) { return String(n || '').split(' ')[0]; }
  function red(s) { return s === 'h' || s === 'd'; }
  function strainHtml(ch) { if (ch === 'N') return '<span class="hvb-s n">NT</span>'; var s = STN[ch]; return '<span class="hvb-s' + (red(s) ? ' r' : '') + '">' + GL[s] + '</span>'; }
  function callHtml(c) { if (c === 'P') return 'Pass'; if (c === 'X' || c === 'XX') return c; return c.charAt(0) + strainHtml(c.charAt(1)); }
  function kParse(k) { var m = /^([1-7])([CDHSN])(X{0,2})$/.exec(k || ''); return m ? { lvl: +m[1], st: m[2], dbl: m[3].length } : null; }
  function kWords(k) { var q = kParse(k); if (!q) return ''; return q.lvl + ' ' + (q.st === 'N' ? 'notrump' : WORD[STN[q.st]]) + (q.dbl === 2 ? ' redoubled' : q.dbl === 1 ? ' doubled' : ''); }
  function vulOf(code) { return code === 'B' ? [true, true] : code === 'N' ? [true, false] : code === 'E' ? [false, true] : [false, false]; }
  var MOM = { grand: 'Grand slam', slam: 'Small slam', all13: 'All thirteen tricks', xxmade: 'Redoubled and made', xmade: 'Doubled and made', xset: 'Doubled and beaten', bigset: 'Beaten by three or more', partgame: 'Part scores to game', game: 'Game', honors: 'Honors', rubber: 'Rubber' };

  HistView.css('hv-bridge', [
    '.hvb-dg{display:grid;grid-template-columns:1fr auto 1fr;grid-template-rows:auto auto auto;gap:6px 8px;align-items:center;justify-items:center;}',
    '.hvb-dg .n{grid-column:2;grid-row:1;}.hvb-dg .w{grid-column:1;grid-row:2;justify-self:start;}.hvb-dg .e{grid-column:3;grid-row:2;justify-self:end;}.hvb-dg .s{grid-column:2;grid-row:3;}',
    '.hvb-dg .ctr{grid-column:2;grid-row:2;line-height:0;}.hvb-dg .ctr svg{width:54px;height:54px;}',
    '.hvb-h{display:flex;flex-direction:column;gap:2px;min-width:0;padding-bottom:calc(var(--cw) * .82);}',
    '.hvb-h .who{font-size:.66rem;font-weight:900;letter-spacing:.07em;text-transform:uppercase;color:rgba(255,255,255,.7);white-space:nowrap;}',
    '.hvb-h .who b{color:#fff;letter-spacing:0;text-transform:none;font-size:.76rem;}',
    '.hvb-h .who.decl b{color:#ffd166;}',
    '.hvb-h .sr{display:flex;align-items:center;height:calc(var(--cw) * .62);}',
    '.hvb-h .sr .pcard{flex:none;box-shadow:0 1px 3px rgba(0,0,0,.4);}',
    '.hvb-h .sr .pcard+.pcard{margin-left:calc(var(--cw) * -.58);}',
    '.hvb-h .sr .void{font-size:.7rem;font-weight:800;color:rgba(255,255,255,.5);}',
    '.hvb-h .pcard.hv-hl{box-shadow:0 0 0 2px #ffd166,0 0 8px rgba(255,209,102,.8);}',
    '.hvb-auc{width:100%;border-collapse:collapse;table-layout:fixed;background:#fffaf0;border-radius:10px;overflow:hidden;color:#2a2a3a;}',
    '.hvb-auc th{font-size:.62rem;font-weight:900;letter-spacing:.07em;text-transform:uppercase;color:#7a1f2a;padding:6px 2px 4px;border-bottom:2px solid rgba(122,31,42,.3);}',
    '.hvb-auc th.vul{color:#d0142f;}',
    '.hvb-auc td{text-align:center;padding:3px 2px;font-family:var(--display);font-size:1rem;}',
    '.hvb-auc td.p{font-family:var(--font);font-size:.72rem;font-weight:800;color:#7a7a90;}',
    '.hvb-auc td.x{color:#c8102e;} .hvb-auc td.xx{color:#1f56b8;}',
    '.hvb-s{font-family:var(--font);font-weight:900;}.hvb-s.r{color:#d0142f;}.hvb-s.n{font-family:var(--display);font-size:.8em;}',
    '.hvb-k{display:flex;align-items:center;gap:10px;flex-wrap:wrap;}',
    '.hvb-bc{display:inline-flex;align-items:center;justify-content:center;gap:1px;min-width:46px;height:34px;padding:0 6px;border-radius:5px;background:linear-gradient(170deg,#fffdf6,#efe7d3);color:#1b1b28;font-family:var(--display);font-size:1.15rem;box-shadow:0 2px 5px rgba(0,0,0,.35);}',
    '.hvb-bc.x{background:linear-gradient(170deg,#f0475b,#b5162d);color:#fff;min-width:30px;}.hvb-bc.xx{background:linear-gradient(170deg,#4f8ff0,#1f56b8);color:#fff;min-width:34px;}',
    '.hvb-k .tx{display:flex;flex-direction:column;gap:2px;font-weight:800;font-size:.86rem;line-height:1.25;}',
    '.hvb-k .tx small{font-weight:700;color:rgba(255,255,255,.7);font-size:.76rem;}',
    '.hvb-mom{display:flex;flex-wrap:wrap;gap:5px;}',
    '.hvb-mom span{font-size:.72rem;font-weight:900;padding:3px 9px;border-radius:999px;background:#ffd166;color:#1b1404;}',
    '.hvb-pad{border-radius:6px 6px 12px 12px;background:linear-gradient(180deg,#fffaf0,#f6eedb);color:#2a2a3a;padding:8px 10px 10px;}',
    '.hvb-pad .hd{display:grid;grid-template-columns:1fr 1fr;text-align:center;font-family:var(--display);font-size:1.05rem;color:#7a1f2a;border-bottom:2px solid rgba(122,31,42,.4);padding-bottom:3px;}',
    '.hvb-pad .hd small{display:block;font-family:var(--font);font-size:.66rem;font-weight:800;color:#7a7a90;}',
    '.hvb-pad .g{display:grid;grid-template-columns:1fr 1fr;}',
    '.hvb-pad .g > div{display:flex;flex-direction:column;align-items:center;padding:3px;gap:1px;}',
    '.hvb-pad .g > div+div{border-left:2px solid rgba(122,31,42,.4);}',
    '.hvb-pad .g.a > div{flex-direction:column-reverse;justify-content:flex-end;min-height:36px;}',
    '.hvb-pad .ln{border-top:3px solid #2a2a3a;}',
    '.hvb-pad .e{font-family:var(--hand);font-size:1.15rem;line-height:1.1;}',
    '.hvb-pad .e small{font-family:var(--font);font-size:.58rem;font-weight:800;color:#8a8796;margin-left:4px;}',
    '.hvb-pad .gl{width:100%;border-top:1.5px solid #7a1f2a;margin:2px 0;}',
    '.hvb-pad .t{display:grid;grid-template-columns:1fr 1fr;text-align:center;border-top:3px double #2a2a3a;margin-top:4px;padding-top:3px;font-family:var(--hand);font-size:1.4rem;}',
    '.hvb-pad .t small{display:block;font-family:var(--font);font-size:.58rem;font-weight:900;letter-spacing:.1em;color:#7a1f2a;}'
  ].join(''));

  function boardSvg(dealer, vul) {
    var pos = { 2: [30, 6, 'N'], 3: [54, 30, 'E'], 0: [30, 54, 'S'], 1: [6, 30, 'W'] };
    var s = '<svg viewBox="0 0 60 60" aria-hidden="true"><rect x="3" y="3" width="54" height="54" rx="8" fill="#e9e1cc" stroke="#7a6a48" stroke-width="1.5"/>';
    [2, 3, 0, 1].forEach(function (p) {
      var q = pos[p], v = vul[p % 2], horiz = p === 2 || p === 0, w = horiz ? 22 : 9, h = horiz ? 9 : 22;
      s += '<rect x="' + (q[0] - w / 2) + '" y="' + (q[1] - h / 2) + '" width="' + w + '" height="' + h + '" rx="2.5" fill="' + (v ? '#d0142f' : '#fbf8f0') + '" stroke="' + (v ? '#8a0c1f' : '#a89a78') + '"/>';
      s += '<text x="' + q[0] + '" y="' + (q[1] + .5) + '" text-anchor="middle" dominant-baseline="central" font-size="7" font-weight="900" font-family="system-ui" fill="' + (v ? '#fff' : '#5a4c30') + '">' + q[2] + '</text>';
      if (p === dealer) s += '<circle cx="' + (q[0] + (horiz ? 14 : 0)) + '" cy="' + (q[1] + (horiz ? 0 : 14)) + '" r="3.6" fill="#1b1b28"/>';
    });
    return s + '</svg>';
  }
  // one hand in suit rows of small real cards (spades, hearts, diamonds, clubs)
  function hand(pbn, p, names, decl, lead, cw) {
    var parts = String(pbn || '').split('.'), ck = HistView.ck, h = el('div', { class: 'hvb-h ' + ['s', 'w', 'n', 'e'][p], style: { '--cw': cw + 'px' } });
    h.appendChild(el('div', { class: 'who' + (p === decl ? ' decl' : ''), html: SEAT[p] + ' <b>' + K().esc(first(names[p])) + '</b>' }));
    ['s', 'h', 'd', 'c'].forEach(function (s, i) {
      var r = el('div', { class: 'sr' });
      var ranks = (parts[i] || '').split('');
      if (!ranks.length) r.appendChild(el('span', { class: 'void', text: GL[s] + ' none' }));
      ranks.forEach(function (ch) { var code = ch + s; r.appendChild(ck.card(code, cw, code === lead ? 'hv-hl' : '')); });
      h.appendChild(r);
    });
    return h;
  }
  function diagram(x, names) {
    var hs = String(x.h || '').split('/'), g = el('div', { class: 'hvb-dg' }), lead = x.l || '';
    [2, 1, 3, 0].forEach(function (p) { g.appendChild(hand(hs[p], p, names, x.de, lead, 26)); });
    g.appendChild(el('div', { class: 'ctr', html: boardSvg(x.d, vulOf(x.v)) }));
    return g;
  }
  function auction(x, names) {
    var calls = String(x.a || '').split('.').filter(Boolean), cols = [1, 2, 3, 0], vul = vulOf(x.v);
    var t = el('table', { class: 'hvb-auc' }), hd = el('tr');
    cols.forEach(function (p) { hd.appendChild(el('th', { class: vul[p % 2] ? 'vul' : '', text: first(names[p]) + (p === x.d ? ' (D)' : '') })); });
    t.appendChild(hd);
    var cells = []; for (var i = 0; i < cols.indexOf(x.d); i++) cells.push(null);
    calls.forEach(function (c) { cells.push(c); });
    for (var r = 0; r < cells.length; r += 4) {
      var tr = el('tr');
      for (var j = 0; j < 4; j++) { var c = cells[r + j]; tr.appendChild(el('td', { class: c === 'P' ? 'p' : c === 'X' ? 'x' : c === 'XX' ? 'xx' : '', html: c ? callHtml(c) : '' })); }
      t.appendChild(tr);
    }
    return t;
  }
  function padNode(rows, names, w) {
    var sides = [w, 1 - w], node = el('div', { class: 'hvb-pad' });
    node.appendChild(el('div', { class: 'hd' }, sides.map(function (t) { return el('div', null, [document.createTextNode(t === 0 ? 'N-S' : 'E-W'), el('small', { text: first(names[t]) + ' & ' + first(names[t + 2]) })]); })));
    var A = el('div', { class: 'g a' }), B = el('div', { class: 'g' }), cA = [el('div'), el('div')], cB = [el('div'), el('div')];
    cA.forEach(function (c) { A.appendChild(c); }); cB.forEach(function (c) { B.appendChild(c); });
    var tot = [0, 0], lastG = 0;
    rows.forEach(function (str) {
      var q = String(str).split(':'), sd = +q[0], pts = +q[1], above = q[2] === '1', g = +q[3], why = q.slice(5).join(':');
      tot[sd] += pts;
      var e = el('div', { class: 'e' }, [document.createTextNode(String(pts)), el('small', { text: why })]), col = sides.indexOf(sd);
      if (above) cA[col].appendChild(e);
      else { for (; lastG < g; lastG++) cB.forEach(function (c) { c.appendChild(el('div', { class: 'gl' })); }); cB[col].appendChild(e); }
    });
    node.appendChild(A); node.appendChild(el('div', { class: 'ln' })); node.appendChild(B);
    node.appendChild(el('div', { class: 't' }, sides.map(function (t) { return el('div', null, [el('small', { text: 'TOTAL' }), document.createTextNode(String(tot[t]))]); })));
    return node;
  }

  HistView.register('bridge', function (e, ui) {
    var d = e.dt; if (!d || !d.names) return null;
    var ck = HistView.ck, names = d.names, hx = (d.hx || []).filter(function (x) { return !x.po; }), out = [];
    var sn = [first(names[0]) + ' & ' + first(names[2]), first(names[1]) + ' & ' + first(names[3])];
    var made = 0, slams = 0, sets = 0;
    hx.forEach(function (x) { var k = kParse(x.k); if (!k) return; if (x.t >= 6 + k.lvl) { made++; if (k.lvl >= 6) slams++; } else sets++; });
    var g = String(d.games || '0.0').split('.').map(Number);
    out.push(ui.stats([['Deals', hx.length, d.fmt === 'rubber' ? 'a rubber' : 'a Chicago'], ['Contracts made', made + ' of ' + hx.length, sets ? sets + ' beaten' : 'none beaten'],
      slams ? ['Slams made', slams] : null, d.fmt === 'rubber' ? ['Games', g[0] + ' – ' + g[1], sn[0] + ' first'] : null]));
    if (hx.length) {
      var panel = el('div', { class: 'hv' });
      var show = function (i) {
        var x = hx[i], k = kParse(x.k), kids = [], pts = String(x.s || '0.0').split('.').map(Number), ds = x.de % 2;
        var need = k ? 6 + k.lvl : 0, res = !k ? '' : x.t >= need ? (x.t > need ? 'Made with ' + (x.t - need) + ' over' : 'Made it') : 'Down ' + (need - x.t);
        var moms = String(x.m || '').split('.').filter(function (m) { return MOM[m]; });
        kids.push(ck.head('<b>Deal ' + x.n + '</b> · ' + K().esc(first(names[x.d])) + ' dealt', res, !k ? '' : moms.some(function (m) { return /slam|all13|rubber/.test(m); }) ? 'big' : x.t >= need ? 'good' : 'bad'));
        if (k) {
          var bc = el('span', { class: 'hvb-bc', html: k.lvl + strainHtml(k.st) });
          var cards = el('span', { style: { display: 'flex', gap: '3px' } }, [bc, k.dbl ? el('span', { class: 'hvb-bc ' + (k.dbl === 2 ? 'xx' : 'x'), text: k.dbl === 2 ? 'XX' : 'X' }) : null]);
          kids.push(el('div', { class: 'hvb-k' }, [cards, el('div', { class: 'tx' }, [document.createTextNode(names[x.de] + ' declared ' + kWords(x.k) + ' and took ' + x.t + ' tricks.'), el('small', { text: (pts[0] ? sn[0] + ' scored ' + pts[0] : '') + (pts[0] && pts[1] ? '. ' : '') + (pts[1] ? sn[1] + ' scored ' + pts[1] : '') + (pts[0] || pts[1] ? '.' : '') })])]));
          if (x.l) kids.push(ck.grp('The opening lead, by ' + first(names[(x.de + 1) % 4]), ck.row([x.l], { w: 34 })));
        }
        if (moms.length) kids.push(el('div', { class: 'hvb-mom' }, moms.map(function (m) { return el('span', { text: MOM[m] }); })));
        kids.push(ck.grp('The hands as dealt', diagram(x, names), 'Red pockets on the board: the vulnerable side. The dot: the dealer.'));
        kids.push(ck.grp('The auction', auction(x, names)));
        panel.innerHTML = ''; panel.appendChild(ck.felt(['#1e5a47', '#123d30', '#0b2a20'], kids));
      };
      var items = hx.map(function (x, i) {
        var k = kParse(x.k), ds = x.de % 2, ok = k && x.t >= 6 + k.lvl, w = ok ? ds : 1 - ds;
        return { t: String(x.n), c: ui.color(w), ring: /slam|grand|all13/.test(x.m || ''), title: 'Deal ' + x.n + ': ' + kWords(x.k) + (ok ? ' made' : ' beaten') };
      });
      out.push(ui.section('Every deal', [ck.road(items, 0, show), panel, ck.key([['Deal won by ' + sn[0], ui.color(0)], ['Deal won by ' + sn[1], ui.color(1)], ['A slam or all thirteen tricks', 'ring']])], { icon: 'cards' }));
    }
    if (d.rows && d.rows.length) out.push(ui.section('The score pad', padNode(d.rows, names, 0), { icon: 'pencil' }));
    var fin = (e.players || []).map(function (p) { return p.score; });
    if (fin.length === 2 && fin[0] != null) {
      var w = fin[0] === fin[1] ? -1 : fin[0] > fin[1] ? 0 : 1;
      var why = w < 0 ? 'Both sides finished on ' + fin[0] + '.' : sn[w] + ' won ' + fin[w] + ' to ' + fin[1 - w] + '.';
      var big = 0, bi = -1; hx.forEach(function (x, i) { var p = String(x.s || '0.0').split('.').map(Number), v = w >= 0 ? p[w] - p[1 - w] : 0; if (v > big) { big = v; bi = i; } });
      if (bi >= 0) why += ' Their biggest deal was deal ' + hx[bi].n + ', ' + kWords(hx[bi].k) + ' by ' + first(names[hx[bi].de]) + ', worth ' + big + '.';
      out.push(ck.foot(why, 'flag'));
    }
    return ui.wrap(out);
  });
})();
