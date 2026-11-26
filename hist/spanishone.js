'use strict';
// History view: UNO (its id and files say spanishone). The race to the target score, every hand (who went out and with which card, drawn as the
// game's own card face, and what everyone else was left holding), the score sheet hand by hand, and the game's numbers:
// the longest draw stack, the reverses and skips, UNO calls and catches. Recorded by games/spanishone.html
// (Kit.record 'spanishone').
(function () {
  if (!window.HistView) return;
  function K() { return window.Kit; }
  function el(t, a, k) { return K().el(t, a, k); }
  var FELT = ['#7a1d22', '#541318', '#330b0e'];
  var CN = { r: 'red', y: 'yellow', g: 'green', b: 'blue' };
  var VNAME = { s: 'Skip', r: 'Reverse', d2: 'Draw Two', w: 'Wild', w4: 'Wild Draw Four' };
  // a card from its code: color then value ('r7', 'bs', 'gd2', 'ww', 'ww4'), drawn as the game draws it (games/uno-art.js)
  function face(code, w) {
    var c = String(code || '').charAt(0), v = String(code || '').slice(1);
    if (!/^[rygbw]$/.test(c) || !window.UnoArt) return null;
    var num = /^\d$/.test(v);
    return el('span', { class: 'sh-c', style: { '--w': (w || 54) + 'px' }, role: 'img', 'aria-label': c === 'w' ? VNAME[v] : CN[c] + ' ' + (num ? v : VNAME[v]), html: window.UnoArt.face(c + v) });
  }
  function cardName(code) {
    var c = String(code || '').charAt(0), v = String(code || '').slice(1);
    if (c === 'w') return 'a ' + VNAME[v];
    if (!CN[c]) return '';
    return 'a ' + CN[c] + ' ' + (/^\d$/.test(v) ? v : VNAME[v]);
  }
  function nums(s) { return String(s == null ? '' : s).split('.').filter(function (x) { return x !== ''; }).map(Number); }
  function first(n) { return String(n || '').split(' ')[0]; }
  function plural(n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); }

  HistView.css('hv-spanishone', [
    '.sh-c{--w:54px;position:relative;display:inline-block;flex:none;width:var(--w);height:calc(var(--w) * 1.46);border-radius:calc(var(--w) * .11);overflow:hidden;background:#fff;box-shadow:0 2px 0 rgba(0,0,0,.2),0 6px 14px rgba(0,0,0,.34);}',
    '.sh-c svg{position:absolute;inset:0;width:100%;height:100%;display:block;}',
    '.sh-c .cs{display:none;}',
    '.sh-out{display:flex;align-items:center;gap:14px;}',
    '.sh-out .t b{display:block;font-size:1.05rem;color:#fff;text-wrap:balance;}',
    '.sh-out .t span{display:block;font-size:.8rem;font-weight:700;color:rgba(255,255,255,.8);margin-top:2px;}',
    '.sh-left{display:flex;flex-direction:column;gap:6px;}',
    '.sh-left .r{display:grid;grid-template-columns:6.5em minmax(0,1fr) 3.4em;align-items:center;gap:8px;font-size:.78rem;font-weight:700;color:rgba(255,255,255,.88);}',
    '.sh-left .r .nm{display:flex;align-items:center;gap:6px;min-width:0;overflow-wrap:anywhere;line-height:1.1;}',
    '.sh-left .r .nm i{flex:none;width:9px;height:9px;border-radius:50%;background:var(--pc);}',
    '.sh-left .r .bk{display:flex;flex-wrap:wrap;gap:2px;}',
    '.sh-left .r .bk i{width:8px;height:12px;border-radius:2px;background:radial-gradient(40% 46% at 50% 50%,#e3242b 98%,transparent),#141414;box-shadow:inset 0 0 0 1px rgba(255,255,255,.7);}',
    '.sh-left .r b{text-align:right;font-variant-numeric:tabular-nums;color:#fff;}',
    '.sh-left .r.w b{color:#ffd166;}',
    '.sh-left .r .cnt{font-weight:650;color:rgba(255,255,255,.65);margin-left:4px;font-size:.72rem;}',
    '.sh-chart svg{width:100%;height:auto;display:block;}'
  ].join(''));

  HistView.register('spanishone', function (e, ui) {
    var d = e.dt; if (!d || !d.hx || !d.hx.length) return null;
    var ck = HistView.ck; if (!ck) return null;
    var nm = d.names || (e.players || []).map(function (p) { return p.name; }), n = nm.length, hx = d.hx, to = +d.to || 0, out = [];
    function fn(p) { return String(d.cpu || '').charAt(p) === '1' ? String(nm[p] || '') : first(nm[p]); }
    // scores hand by hand: only the player who went out scores
    var run = [], tot = []; for (var p = 0; p < n; p++) tot.push(0);
    hx.forEach(function (h) { tot[+h.w] += +h.pts || 0; run.push(tot.slice()); });
    var best = null; hx.forEach(function (h, i) { if (!best || +h.pts > best.pts) best = { pts: +h.pts, p: +h.w, i: i }; });
    var wilds = hx.filter(function (h) { return /^w/.test(h.c || ''); }).length;
    var caught = nums(d.caught).reduce(function (a, b) { return a + b; }, 0);
    out.push(ui.stats([
      ['Hands', hx.length, to ? 'played to ' + to : 'a single hand'],
      to && best ? ['Biggest hand', best.pts, fn(best.p) + ', hand ' + (best.i + 1)] : null,
      d.stack ? ['Longest draw stack', d.stack, 'cards drawn at once'] : null,
      ['Reverses and Skips', (d.rev || 0) + ' and ' + (d.skip || 0)],
      caught ? ['Caught without a call', caught] : null,
      wilds ? ['Went out with a Wild', wilds] : null
    ]));

    // the race to the target
    if (to && hx.length > 1) {
      var series = []; for (p = 0; p < n; p++) series.push({ color: ui.color(p), pts: [0].concat(run.map(function (r) { return r[p]; })), step: true });
      var mx = Math.max(to, Math.max.apply(null, run[run.length - 1]));
      out.push(ui.section('The race to ' + to, [el('div', { class: 'sh-chart' }, [ui.picture(ck.chart(series, { max: mx, lines: [{ y: to, label: String(to) }], xlabel: 'hands', aria: 'Each player’s score after every hand' }))]),
        ck.key(nm.map(function (x, i) { return [fn(i), ui.color(i)]; }))], { icon: 'chart' }));
    }

    // every hand
    var panel = el('div', { class: 'hv' });
    function show(i) {
      var h = hx[i], w = +h.w, kids = [], cn = nums(h.n), lp = nums(h.lp);
      kids.push(ck.head('<b>Hand ' + (i + 1) + '</b>' + (nm[h.d] != null && h.d !== '' ? ' · ' + K().esc(fn(+h.d)) + ' dealt' : ''), to ? '+' + h.pts : '', 'good'));
      var card = face(h.c, 58);
      var line = h.b ? 'Nobody could play, so the smallest hand won it' : (h.c ? fn(w) + ' went out with ' + cardName(h.c) : fn(w) + ' went out');
      kids.push(el('div', { class: 'sh-out' }, [card, el('div', { class: 't' }, [el('b', { text: line }), el('span', { text: to ? fn(w) + ' scored ' + h.pts + ' points from the cards left in everyone else’s hands.' : 'The others were left holding ' + h.pts + ' points of cards.' })])]));
      // what everyone else was left holding
      var rows = el('div', { class: 'sh-left' }), order = []; for (var q = 0; q < n; q++) order.push((w + q) % n);
      order.forEach(function (q) {
        var k = cn[q] || 0, bk = el('span', { class: 'bk' });
        for (var j = 0; j < Math.min(k, 30); j++) bk.appendChild(el('i'));
        rows.appendChild(el('div', { class: 'r' + (q === w ? ' w' : '') }, [el('span', { class: 'nm', style: { '--pc': ui.color(q) } }, [el('i'), document.createTextNode(fn(q))]),
          q === w ? el('span', { text: 'Went out' }) : el('span', { class: 'bk-w' }, [bk, el('span', { class: 'cnt', text: plural(k, 'card') })]),
          el('b', { text: q === w ? '+' + h.pts : lp.length ? String(lp[q] || 0) : '' })]));
      });
      kids.push(ck.grp('What everyone was left holding', rows));
      var facts = [];
      if (+h.rv) facts.push(plural(+h.rv, 'Reverse'));
      if (+h.sk) facts.push(plural(+h.sk, 'Skip'));
      if (+h.st >= 2) facts.push('a draw stack of ' + h.st);
      if (+h.ch >= 4) facts.push(h.ch + ' of the same number in a row');
      if (facts.length) kids.push(ck.grp('In this hand', ui.chips(facts.map(function (f) { return { t: f.charAt(0).toUpperCase() + f.slice(1) }; }))));
      panel.innerHTML = ''; panel.appendChild(ck.felt(FELT, kids));
    }
    var items = hx.map(function (h, i) { return { t: String(i + 1), c: ui.color(+h.w), ring: /^w/.test(h.c || ''), title: 'Hand ' + (i + 1) + ': ' + fn(+h.w) + ' went out' }; });
    out.push(ui.section('Every hand', [ck.road(items, hx.length - 1, show), panel,
      ck.key(nm.map(function (x, i) { return hx.some(function (h) { return +h.w === i; }) ? [fn(i) + ' went out', ui.color(i)] : null; }).concat([wilds ? ['Went out with a Wild', 'ring'] : null]))], { icon: 'cards' }));

    // the score sheet
    if (to) {
      var head = [''].concat(nm.map(function (x, i) { return fn(i); }));
      var rows2 = hx.map(function (h, i) { var r = ['H' + (i + 1)]; for (var q = 0; q < n; q++) r.push(+h.w === q ? { t: '+' + h.pts, c: 'good' } : '–'); return r; });
      var fin = (e.players || []).map(function (x) { return x.score; });
      out.push(ui.section('The score sheet', [ui.table(head, rows2, { foot: ['Total'].concat(fin), headColors: [null].concat(nm.map(function (x, i) { return ui.color(i); })) }),
        el('p', { class: 'hv-note', text: 'Only the player who goes out scores in a hand: the cards left in everyone else’s hands.' })]));
    }
    if (d.w != null && nm[d.w] != null) {
      var w0 = +d.w, lh = hx[hx.length - 1];
      var why = to ? fn(w0) + ' reached ' + to + ' first, with ' + (tot[w0] || 0) + ' points after ' + plural(hx.length, 'hand') + '.' : fn(w0) + ' went out first.';
      if (lh && /^w/.test(lh.c || '') && +lh.w === w0) why += ' The last card was a Wild.';
      out.push(ck.foot(why, 'flag'));
    }
    return ui.wrap(out);
  });
})();
