'use strict';
// History view: Canasta. The race to the target, every hand as the table left it (each side's canastas squared up in
// its own color, the red 3s, who went out and how), the breakdown of each side's count, and the We/They score sheet with
// that breakdown under every hand. Recorded by games/canasta.html (Kit.record 'canasta').
(function () {
  if (!window.HistView) return;
  function K() { return window.Kit; }
  function el(t, a, k) { return K().el(t, a, k); }
  var FELT = ['#7e2a2a', '#561b1c', '#3a1012'];
  var PL = { '4': 'fours', '5': 'fives', '6': 'sixes', '7': 'sevens', '8': 'eights', '9': 'nines', T: 'tens', J: 'jacks', Q: 'queens', K: 'kings', A: 'aces', '3': 'black 3s' };
  function first(n) { return String(n || '').split(' ')[0]; }
  function nums(s) { return String(s == null ? '' : s).split('.').map(Number); }
  function fmt(v) { v = Number(v) || 0; return (v < 0 ? '−' : '') + Math.abs(v).toLocaleString('en-US'); }
  function sgn(v) { v = Number(v) || 0; return (v > 0 ? '+' : '') + fmt(v); }
  function plural(n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); }

  HistView.css('hv-canasta', [
    '.cnh-sides{display:grid;grid-template-columns:repeat(var(--n,2),minmax(0,1fr));gap:10px;}',
    '.cnh-side{display:flex;flex-direction:column;gap:6px;min-width:0;padding:8px 10px 9px;border-radius:12px;background:rgba(0,0,0,.22);box-shadow:inset 0 3px 0 var(--sc);}',
    '.cnh-side .h{display:flex;justify-content:space-between;align-items:baseline;gap:8px;font-size:.8rem;font-weight:800;color:rgba(255,255,255,.88);}',
    '.cnh-side .h b{font-size:1.25rem;font-variant-numeric:tabular-nums;color:#fff;}.cnh-side .h b.neg{color:#ff9aa5;}',
    '.cnh-side .out{align-self:flex-start;font-size:.7rem;font-weight:800;padding:2px 8px;border-radius:999px;background:#ffd166;color:#1b1404;}',
    '.cnh-cans{display:flex;flex-wrap:wrap;gap:8px 10px;min-height:10px;}',
    '.cnh-can{display:flex;flex-direction:column;align-items:center;gap:2px;}',
    '.cnh-can .pl{position:relative;width:calc(var(--cw) + 6px);height:calc(var(--cw) * 1.4 + 6px);--cw:30px;}',
    '.cnh-can .pl .pcard{position:absolute;box-shadow:0 1px 2px rgba(0,0,0,.5);}',
    '.cnh-can .pl .pcard:nth-child(1){left:6px;top:6px;}.cnh-can .pl .pcard:nth-child(2){left:3px;top:3px;}.cnh-can .pl .pcard:nth-child(3){left:0;top:0;outline:2px solid var(--sc);outline-offset:1px;}',
    '.cnh-can small{font-size:.62rem;font-weight:800;padding:0 6px;border-radius:6px;color:#fff;}',
    '.cnh-can.n small{background:#c8102e;}.cnh-can.m small{background:#16161c;box-shadow:inset 0 0 0 1px rgba(255,255,255,.3);}',
    '.cnh-r3{display:flex;--cw:20px;}.cnh-r3 .pcard{box-shadow:0 1px 2px rgba(0,0,0,.4);}.cnh-r3 .pcard+.pcard{margin-left:-11px;}',
    '.cnh-lines{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:1px 10px;font-size:.76rem;font-weight:700;color:rgba(255,255,255,.75);}',
    '.cnh-lines span:nth-child(even){text-align:right;color:#fff;font-variant-numeric:tabular-nums;font-weight:800;}',
    '.cnh-lines span.neg{color:#ff9aa5 !important;}',
    '.cnh-lines .tot{border-top:1px solid rgba(255,255,255,.18);padding-top:2px;margin-top:2px;}',
    '.cnh-none{font-size:.72rem;font-weight:700;color:rgba(255,255,255,.5);}',
    '.cnh-sheet{width:100%;border-collapse:collapse;font-variant-numeric:tabular-nums;}',
    '.cnh-sheet th{font-size:.74rem;font-weight:900;padding:4px 6px;border-bottom:2px solid currentColor;text-align:right;}',
    '.cnh-sheet th.rn,.cnh-sheet td.rn{text-align:left;color:var(--text-3);width:2.4em;}',
    '.cnh-sheet td{padding:5px 6px 6px;text-align:right;vertical-align:top;border-bottom:1px solid rgba(255,255,255,.08);}',
    '.cnh-sheet td b{display:block;font-size:1.02rem;}',
    '.cnh-sheet td i{display:block;font-style:normal;font-size:.7rem;font-weight:700;color:var(--text-3);line-height:1.25;}',
    '.cnh-sheet td.lead b{color:var(--lit);}',
    '.cnh-sheet td .g{color:#4ade80;}.cnh-sheet td .r{color:#f87171;}',
    '.cnh-sheet tfoot td{font-size:1.15rem;font-weight:900;border-bottom:0;}',
    '.cnh-race{line-height:0;}.cnh-race svg{width:100%;height:auto;display:block;}'
  ].join(''));

  HistView.register('canasta', function (e, ui) {
    var d = e.dt; if (!d || !d.hx || !d.hx.length) return null;
    var ck = HistView.ck; if (!ck) return null;
    var nm = d.names || [], n = nm.length, kind = d.kind || (n === 2 ? 'two' : n === 3 ? 'three' : 'part'), hx = d.hx, out = [];
    var nS = kind === 'part' ? 2 : n, target = +d.to || 5000;
    function side(p) { return kind === 'part' ? p % 2 : p; }
    function seats(s) { return kind === 'part' ? [s, s + 2] : [s]; }
    function fn(p) { return String(d.cpu || '').charAt(p) === '1' ? String(nm[p] || '') : first(nm[p]); }
    function sname(s) { return seats(s).map(fn).join(' & '); }
    var sides = []; for (var s0 = 0; s0 < nS; s0++) sides.push(s0);
    var sc = hx.map(function (h) { return nums(h.sc); });
    var run = [], t0 = sides.map(function () { return 0; });
    sc.forEach(function (r, i) { var tt = hx[i].t ? nums(hx[i].t) : null; t0 = sides.map(function (s) { return tt ? tt[s] : t0[s] + (r[s] || 0); }); run.push(t0.slice()); });
    var canN = nums(d.canN), canM = nums(d.canM), outs = nums(d.outs), conc = nums(d.conc);

    // the numbers
    var big = d.big ? String(d.big).split('.').map(Number) : null;
    out.push(ui.stats([
      ['Hands', hx.length, 'played to ' + target.toLocaleString('en-US')],
      ['Natural canastas', canN.join(' – '), sname(0) + ' first'],
      ['Mixed canastas', canM.join(' – '), sname(0) + ' first'],
      ['Went out', outs.join(' – '), conc.some(Boolean) ? 'concealed ' + conc.join(' – ') : ''],
      big && big[0] ? ['Biggest frozen pile', big[0] + ' cards', fn(big[1]) + ', hand ' + big[2]] : null
    ]));

    // the race to the target
    var mx = Math.max(target, Math.max.apply(null, run.map(function (r) { return Math.max.apply(null, r); })));
    var mn = Math.min(0, Math.min.apply(null, run.map(function (r) { return Math.min.apply(null, r); })));
    var series = sides.map(function (s) { return { pts: [0].concat(run.map(function (r) { return r[s] - mn; })), color: ui.color(s), step: false }; });
    var race = el('div', { class: 'cnh-race', html: ck.chart(series, { w: 340, h: 170, max: mx - mn, lines: [{ y: target - mn, label: fmt(target), c: 'rgba(255,211,77,.55)' }].concat(mn < 0 ? [{ y: -mn, label: '0' }] : []), xlabel: 'hand', aria: 'The race to ' + fmt(target) }) });
    out.push(ui.section('The race to ' + fmt(target), [race, ck.key(sides.map(function (s) { return [sname(s), ui.color(s)]; }))], { icon: 'chart' }));

    // every hand: the canastas each side squared up, the red 3s, and the count
    var panel = el('div', { class: 'hv' });
    function canPile(code, s) {
      var r = code.charAt(0), nat = code.charAt(1) === 'n', rk = r === 'T' ? 'T' : r;
      var face = rk + (nat ? 'h' : 's');
      var pl = el('div', { class: 'pl' }, [ck.card('??', 30), ck.card('??', 30), ck.card(face, 30)]);
      return el('div', { class: 'cnh-can ' + (nat ? 'n' : 'm'), style: { '--sc': ui.color(s) }, title: (nat ? 'Natural canasta of ' : 'Mixed canasta of ') + (PL[r] || r) }, [pl, el('small', { text: nat ? '500' : '300' })]);
    }
    function show(i) {
      var h = hx[i], kids = [], pts = sc[i], cn = nums(h.cn), cm = nums(h.cm), r3 = nums(h.r3), ml = h.m != null ? nums(h.m) : null, lf = h.l != null ? nums(h.l) : null;
      var crs = String(h.cr || '').split('|'), o = h.o != null ? +h.o : -1;
      var tag = h.h === 'o' && o >= 0 ? fn(o) + (h.c ? ' went out concealed' : ' went out') : h.h === 'r' ? 'A red 3 ended it' : 'The stock ran out';
      kids.push(ck.head('<b>Hand ' + (i + 1) + '</b>', tag, h.c ? 'big' : ''));
      var box = el('div', { class: 'cnh-sides', style: { '--n': String(nS) } });
      sides.forEach(function (s) {
        var cans = el('div', { class: 'cnh-cans' });
        String(crs[s] || '').split(',').filter(Boolean).forEach(function (c) { cans.appendChild(canPile(c, s)); });
        if (!cans.children.length) cans.appendChild(el('span', { class: 'cnh-none', text: 'No canasta' }));
        var lines = el('div', { class: 'cnh-lines' });
        function line(label, v, cls) { if (!v && !cls) return; lines.appendChild(el('span', { class: cls || '', text: label })); lines.appendChild(el('span', { class: (cls || '') + (v < 0 ? ' neg' : ''), text: sgn(v) })); }
        if (cn[s]) line(cn[s] === 1 ? 'Natural canasta' : cn[s] + ' natural canastas', cn[s] * 500);
        if (cm[s]) line(cm[s] === 1 ? 'Mixed canasta' : cm[s] + ' mixed canastas', cm[s] * 300);
        if (r3[s]) { var k = Math.abs(r3[s]) === 800 ? 4 : Math.abs(r3[s]) / 100; line(k === 4 ? 'All four red 3s' : plural(k, 'red 3'), r3[s]); }
        if (o >= 0 && side(o) === s) line(h.c ? 'Out concealed' : 'Going out', h.c ? 200 : 100);
        if (ml) line('Cards melded', ml[s]);
        if (lf) line('Left in hand', -lf[s]);
        line('This hand', pts[s], 'tot');
        var r3row = el('div', { class: 'cnh-r3' });
        var k3 = r3[s] ? (Math.abs(r3[s]) === 800 ? 4 : Math.abs(r3[s]) / 100) : 0;
        for (var j = 0; j < k3; j++) r3row.appendChild(ck.card(j % 2 ? '3d' : '3h', 20));
        box.appendChild(el('div', { class: 'cnh-side', style: { '--sc': ui.color(s) } }, [
          el('div', { class: 'h' }, [el('span', { text: sname(s) }), el('b', { class: run[i][s] < 0 ? 'neg' : '', text: fmt(run[i][s]) })]),
          o >= 0 && side(o) === s ? el('span', { class: 'out', text: h.c ? 'Out, concealed' : 'Out' }) : null,
          cans, k3 ? r3row : null, lines
        ]));
      });
      kids.push(box);
      panel.innerHTML = ''; panel.appendChild(ck.felt(FELT, kids));
    }
    var items = hx.map(function (h, i) {
      var p = sc[i], w = 0; for (var s = 1; s < p.length; s++) if (p[s] > p[w]) w = s;
      var nat = String(h.cr || '').indexOf('n') >= 0;
      return { t: String(i + 1), c: ui.color(w), ring: !!h.c || nat, title: 'Hand ' + (i + 1) };
    });
    out.push(ui.section('Every hand', [ck.road(items, hx.length - 1, show), panel,
      ck.key(sides.map(function (s) { return ['Best hand for ' + sname(s), ui.color(s)]; }).concat([['A natural canasta or going out concealed', 'ring']]))], { icon: 'cards' }));

    // the We/They score sheet, the breakdown under each hand
    var t = el('table', { class: 'cnh-sheet' }), hr = el('tr', null, [el('th', { class: 'rn', text: 'Hand' })]);
    sides.forEach(function (s) { hr.appendChild(el('th', { text: sname(s), style: { color: ui.color(s) } })); });
    var tb = el('tbody');
    hx.forEach(function (h, i) {
      var tr = el('tr', null, [el('td', { class: 'rn', text: String(i + 1) })]), cn = nums(h.cn), cm = nums(h.cm), o = h.o != null ? +h.o : -1;
      var lead = Math.max.apply(null, run[i]);
      sides.forEach(function (s) {
        var bits = [];
        if (cn[s] || cm[s]) bits.push(cn[s] && cm[s] ? cn[s] + ' natural, ' + cm[s] + ' mixed' : cn[s] ? plural(cn[s], 'natural canasta') : plural(cm[s], 'mixed canasta'));
        if (o >= 0 && side(o) === s) bits.push(h.c ? 'out concealed' : 'went out');
        tr.appendChild(el('td', { class: run[i][s] === lead ? 'lead' : '' }, [el('b', { text: fmt(run[i][s]) }), el('i', { class: sc[i][s] < 0 ? 'r' : 'g', text: sgn(sc[i][s]) })].concat(bits.map(function (b) { return el('i', { text: b }); }))));
      });
      tb.appendChild(tr);
    });
    var fin = (e.players || []).map(function (p) { return p.score; });
    var ft = el('tr', null, [el('td', { class: 'rn', text: 'Total' })]);
    sides.forEach(function (s) { ft.appendChild(el('td', { text: fmt(fin[s] != null ? fin[s] : run[run.length - 1][s]) })); });
    t.appendChild(el('thead', null, [hr])); t.appendChild(tb); t.appendChild(el('tfoot', null, [ft]));
    out.push(ui.section('The score sheet', [t], { icon: 'history' }));

    // what decided it
    if (d.ws != null && fin.length) {
      var w = +d.ws, ranks = sides.slice().sort(function (a, b) { return fin[b] - fin[a]; }), why = sname(w) + ' reached ' + fmt(fin[w]) + ' after ' + plural(hx.length, 'hand') + ', ' + fmt(fin[w] - fin[ranks[1]]) + ' ahead.';
      if (+d.back) why += ' At one point ' + (seats(w).length > 1 ? 'they were ' : fn(seats(w)[0]) + ' was ') + fmt(+d.back) + ' behind.';
      if (canN[w] > (canN[ranks[1]] || 0)) why += ' More natural canastas made the difference.';
      out.push(ck.foot(why, 'flag'));
    }
    return ui.wrap(out);
  });
})();
