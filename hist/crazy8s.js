'use strict';
// History view: Crazy Eights. The race to the target, then every hand: the card that went out (an 8 lit), what each
// player was left holding and the points it cost them, and every 8 played with the suit it named; then the score
// sheet hand by hand. Recorded by games/crazy8s.html (Kit.record 'crazy8s'; detail.hx is one entry a hand:
// w who went out (-1 blocked with nobody lowest), g what they scored, c the points left in each hand 'a.b.c',
// b blocked, l the last card, h the cards left in each hand 'cards.cards', e the 8s played as seat+card+suit, r the
// longest stack of 2s, k went out without drawing).
(function () {
  if (!window.HistView) return;
  function K() { return window.Kit; }
  function el(t, a, k) { return K().el(t, a, k); }
  var GL = { s: '♠', h: '♥', d: '♦', c: '♣' }, SN = { s: 'spades', h: 'hearts', d: 'diamonds', c: 'clubs' };
  var FELT = ['#7a2244', '#52162d', '#3a0f20'];
  var PTS = function (c) { var r = c.charAt(0); return r === '8' ? 50 : r === 'A' ? 1 : /[TJQK]/.test(r) ? 10 : +r; };
  var ORD = { s: 0, h: 1, c: 2, d: 3 };
  function codes(s) { return String(s || '').match(/[2-9TJQKA][shdc]/g) || []; }
  function sortC(cs) { return cs.slice().sort(function (a, b) { return PTS(b) - PTS(a) || ORD[a.charAt(1)] - ORD[b.charAt(1)]; }); }
  function first(n) { return String(n || '').split(' ')[0]; }
  function plural(n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); }
  function nums(s) { return String(s == null ? '' : s).split('.').map(Number); }
  function label(c) { return (c.charAt(0) === 'T' ? '10' : c.charAt(0)) + GL[c.charAt(1)]; }

  HistView.css('hv-c8', [
    '.c8-out{display:flex;align-items:center;gap:12px;}',
    '.c8-out .hvc-row .pcard.e8{box-shadow:0 0 0 2.5px #ffd166,0 0 14px rgba(255,209,102,.6);}',
    '.c8-out b{display:block;font-size:1.02rem;}.c8-out span{font-size:.8rem;font-weight:700;color:rgba(255,255,255,.8);}',
    '.c8-left{display:flex;flex-direction:column;gap:8px;}',
    '.c8-left .r{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:4px 10px;align-items:center;}',
    '.c8-left .r .nm{display:flex;align-items:center;gap:6px;font-size:.8rem;font-weight:900;color:rgba(255,255,255,.9);min-width:0;overflow-wrap:anywhere;}',
    '.c8-left .r .nm i{flex:none;width:9px;height:9px;border-radius:50%;background:var(--pc);}',
    '.c8-left .r .pt{font-weight:900;font-variant-numeric:tabular-nums;color:rgba(255,255,255,.85);}',
    '.c8-left .r.w .pt{color:#ffd166;}',
    '.c8-left .r .hvc-row{grid-column:1 / -1;}',
    '.c8-left .r .none{grid-column:1 / -1;font-size:.74rem;font-weight:800;color:rgba(255,255,255,.55);}',
    '.c8-left .pcard.e8{box-shadow:0 0 0 2px #ff7a5a,0 0 8px rgba(255,120,90,.55);}',
    '.c8-eights{display:flex;flex-wrap:wrap;gap:8px 14px;}',
    '.c8-e{display:flex;align-items:center;gap:6px;}',
    '.c8-e .to{display:grid;place-items:center;width:28px;height:28px;border-radius:8px;background:#fffaf0;color:#1b1b22;font-size:19px;line-height:1;font-family:Georgia,serif;box-shadow:0 0 0 2px #ffd166;}',
    '.c8-e .to.red{color:#d81e3a;}',
    '.c8-e small{font-size:.72rem;font-weight:800;color:rgba(255,255,255,.8);max-width:7em;line-height:1.15;}'
  ].join(''));

  HistView.register('crazy8s', function (e, ui) {
    var d = e.dt, ck = HistView.ck; if (!d || !d.hx || !ck) return null;
    var nm = d.names || (e.players || []).map(function (p) { return p.name; }), n = nm.length, hx = d.hx, out = [];
    // a person by first name, a computer player by its whole name
    function fn(p) { return String(d.cpu || '').charAt(p) === '1' ? String(nm[p] || '') : first(nm[p]); }
    var sc = ck.scoresOf(e), run = ck.cum(sc, n), to = +d.to || 0;
    var eights = 0, best = null, stack = 0;
    hx.forEach(function (h, i) {
      if (h.l && h.l.charAt(0) === '8' && h.w >= 0 && !h.b) eights++;
      if (h.w >= 0 && (!best || h.g > best.g)) best = { g: h.g, p: h.w, i: i };
      stack = Math.max(stack, +h.r || 0);
    });
    out.push(ui.stats([
      ['Hands', hx.length, to ? 'played to ' + to : 'a single hand'],
      eights ? ['Out on an 8', eights, eights === 1 ? 'one hand ended on an 8' : 'hands ended on an 8'] : null,
      best && best.g ? ['Best hand', best.g, fn(best.p) + ', hand ' + (best.i + 1)] : null,
      stack >= 2 ? ['2s stacked', stack, stack === 4 ? 'all four in one go' : 'in a row'] : null
    ]));
    // the rules this game was played with
    var o = String(d.o || 'u');
    out.push(ui.chips([o.charAt(0) === '1' ? 'Draw one' : 'Draw until you can', o.indexOf('2') >= 0 ? '2s make the next player draw two' : null, o.indexOf('q') >= 0 ? 'The queen of spades skips' : null]));

    // the race to the target
    if (sc.length > 1) {
      var series = [];
      for (var p = 0; p < n; p++) series.push({ pts: [0].concat(run.map(function (r) { return r[p]; })), color: ui.color(p), step: true });
      var mx = Math.max(to, Math.max.apply(null, run[run.length - 1]));
      out.push(ui.section('The race to ' + (to || 'the end'), [ui.picture(ck.chart(series, { max: mx, h: 140, aria: 'Scores hand by hand', lines: to ? [{ y: to, label: String(to), c: 'rgba(255,209,102,.6)' }] : [], xlabel: plural(sc.length, 'hand') }), { frame: 'dark', max: 420 }),
        ck.key(nm.map(function (x, q) { return [fn(q), ui.color(q)]; }))], { icon: 'chart' }));
    }

    // every hand
    var panel = el('div', { class: 'hv' });
    function show(i) {
      var h = hx[i], kids = [], cnt = nums(h.c), left = h.h != null ? String(h.h).split('.') : null, w = +h.w;
      kids.push(ck.head('<b>Hand ' + (i + 1) + '</b>', h.b ? (w >= 0 ? 'Blocked, ' + fn(w) + ' held the least' : 'Blocked') : w >= 0 ? fn(w) + ' went out' : '', h.b ? 'bad' : h.l && h.l.charAt(0) === '8' ? 'big' : 'good'));
      // the card that went out
      if (h.l && w >= 0) {
        var e8 = h.l.charAt(0) === '8';
        kids.push(el('div', { class: 'c8-out' }, [ck.row([h.l], { w: 52, cls: function () { return e8 ? 'e8' : ''; } }),
          el('div', null, [el('b', { text: e8 ? fn(w) + ' went out on an 8' : fn(w) + ' went out on the ' + label(h.l) }),
            el('span', { text: fn(w) + ' scored ' + h.g + (h.k ? ' points and never drew a card.' : ' points.') })])]));
      }
      // what everyone was left holding
      var rows = el('div', { class: 'c8-left' });
      for (var q = 0; q < n; q++) {
        var cs = left ? codes(left[q]) : [];
        var r = el('div', { class: 'r' + (q === w ? ' w' : ''), style: { '--pc': ui.color(q) } }, [
          el('span', { class: 'nm' }, [el('i'), document.createTextNode(fn(q))]),
          el('span', { class: 'pt', text: q === w ? '+' + h.g : (cnt[q] || 0) + (cnt[q] === 1 ? ' point' : ' points') })
        ]);
        if (cs.length) r.appendChild(ck.row(sortC(cs), { w: 26, cls: function (c) { return c.charAt(0) === '8' ? 'e8' : ''; } }));
        else if (q !== w && left) r.appendChild(el('span', { class: 'none', text: 'No cards left' }));
        rows.appendChild(r);
      }
      kids.push(ck.grp(h.b ? 'Nobody could play, and this is what each hand held' : 'What everyone was left holding', rows, left ? null : 'The cards themselves were left out to keep this record small.'));
      // the 8s played, and the suit each one named
      var es = String(h.e || '').match(/\d8[shdc][shdc]/g) || [];
      if (es.length) {
        var box = el('div', { class: 'c8-eights' });
        es.forEach(function (x) {
          var q = +x.charAt(0), c = x.slice(1, 3), s = x.charAt(3);
          box.appendChild(el('div', { class: 'c8-e' }, [ck.row([c], { w: 26 }), el('span', { class: 'to' + (s === 'h' || s === 'd' ? ' red' : ''), text: GL[s] }), el('small', { text: fn(q) + ' named ' + SN[s] })]));
        });
        kids.push(ck.grp(es.length === 1 ? 'The 8 played' : 'The ' + es.length + ' 8s played, in order', box));
      }
      if (+h.r >= 3) kids.push(ck.grp(null, el('div', { class: 'hvc-mini', text: (+h.r === 4 ? 'All four 2s' : 'Three 2s') + ' were stacked up in this hand.' })));
      panel.innerHTML = ''; panel.appendChild(ck.felt(FELT, kids));
    }
    var items = hx.map(function (h, i) { var w = +h.w; return { t: String(i + 1), c: w >= 0 ? ui.color(w) : null, ring: !!(h.l && h.l.charAt(0) === '8' && !h.b), title: 'Hand ' + (i + 1) + (w >= 0 ? ': ' + fn(w) + (h.b ? ' held the least' : ' went out') : ': blocked') }; });
    out.push(ui.section(hx.length > 1 ? 'Every hand' : 'The hand', [hx.length > 1 ? ck.road(items, hx.length - 1, show) : (show(0), null), panel,
      hx.length > 1 ? ck.key(nm.map(function (x, q) { return ['Won by ' + fn(q), ui.color(q)]; }).concat(eights ? [['Went out on an 8', 'ring']] : [])) : null].filter(Boolean), { icon: 'cards' }));

    // the score sheet
    if (sc.length > 1) {
      var head = [''].concat(nm.map(function (x, q) { return fn(q); }));
      var rowsT = sc.map(function (r, i) { return ['H' + (i + 1)].concat(r.map(function (v, q) { return { t: v ? '+' + v : '–', c: v ? 'good' : '' }; })); });
      out.push(ui.section('The score sheet', [ui.table(head, rowsT, { foot: ['Total'].concat((e.players || []).map(function (p) { return p.score; })), headColors: [null].concat(nm.map(function (x, q) { return ui.color(q); })) }),
        el('p', { class: 'hv-note', text: 'Each hand, the player who went out scores the cards left in everyone else’s hand: 50 for an 8, 10 for a face card or a 10, 1 for an ace, and the number for the rest.' })]));
    }
    // what decided it
    if (d.ws != null && e.players && e.players[+d.ws]) {
      var ws = +d.ws, fin = e.players.map(function (p) { return p.score; }), why;
      if (hx.length === 1) why = fn(ws) + ' went out first and won the game in a single hand.';
      else {
        why = fn(ws) + ' won with ' + fin[ws] + ' after ' + plural(hx.length, 'hand') + '.';
        if (d.sw) why += ' ' + fn(ws) + ' won every hand.';
        else { var lh = hx[hx.length - 1]; if (+lh.w === ws) why += ' Going out in the last hand for ' + lh.g + ' took ' + fn(ws) + ' past ' + to + '.'; }
      }
      out.push(ck.foot(why, 'flag'));
    }
    return ui.wrap(out);
  });
})();
