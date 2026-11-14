'use strict';
// History view: Pinochle. Every hand: the deal as a diagram of all the hands, the auction by seat, the bid and trump,
// the cards passed (or the widow and what was buried), everyone's meld laid out with its points, the counters each side
// took, whether the bid was made or set, and the running score. Recorded by games/pinochle.html (Kit.record 'pinochle').
(function () {
  if (!window.HistView) return;
  function K() { return window.Kit; }
  function el(t, a, k) { return K().el(t, a, k); }
  var GL = { s: '♠', h: '♥', d: '♦', c: '♣' }, SN = { s: 'Spades', h: 'Hearts', d: 'Diamonds', c: 'Clubs' };
  var MNAME = { drun: 'Double run', run: 'Run', rm: 'Royal marriage', m: 'Marriage', dix: 'Dix', A: 'Aces around', K: 'Kings around', Q: 'Queens around', J: 'Jacks around',
    AA: 'Thousand aces', KK: 'Double kings', QQ: 'Double queens', JJ: 'Double jacks', pin: 'Pinochle', dpin: 'Double pinochle', turn9: 'Nine turned up' };
  var MV = { drun: 1500, run: 150, rm: 40, m: 20, dix: 10, A: 100, K: 80, Q: 60, J: 40, AA: 1000, KK: 800, QQ: 600, JJ: 400, pin: 40, dpin: 300, turn9: 10 };
  var BIG = { drun: 1, AA: 1, KK: 1, QQ: 1, JJ: 1, dpin: 1 };
  var FELT = ['#7a3f22', '#552a16', '#3a1c0f'];
  var ORD = { s: 0, h: 1, c: 2, d: 3 }, RK = { A: 0, T: 1, K: 2, Q: 3, J: 4, '9': 5 };
  function codes(s) { return String(s || '').match(/[9TJQKA][shdc]/g) || []; }
  function sortC(cs) { return cs.slice().sort(function (a, b) { return ORD[a.charAt(1)] - ORD[b.charAt(1)] || RK[a.charAt(0)] - RK[b.charAt(0)]; }); }
  function first(n) { return String(n || '').split(' ')[0]; }
  function plural(n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); }
  function nums(s) { return String(s == null ? '' : s).split('.').map(Number); }

  HistView.css('hv-pino', [
    '.pn-dia{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px 10px;grid-template-areas:"n n" "w e" "s s";}',
    '.pn-dia.k3{grid-template-columns:minmax(0,1fr);grid-template-areas:"w" "e" "s";}.pn-dia.k3 .h{align-items:flex-start !important;}.pn-dia.k2{grid-template-columns:minmax(0,1fr);grid-template-areas:"n" "s";}',
    '.pn-dia .h{display:flex;flex-direction:column;gap:3px;min-width:0;}',
    '.pn-dia .h.a-n,.pn-dia .h.a-s{align-items:center;}.pn-dia .h.a-e{align-items:flex-end;}',
    '.pn-dia .h small{font-size:.7rem;font-weight:900;color:rgba(255,255,255,.8);}',
    '.pn-dia .h small{display:flex;gap:5px;align-items:center;flex-wrap:wrap;}',
    '.pn-dia .h small i{font-style:normal;font-size:.62rem;padding:0 6px;border-radius:999px;background:#ffd166;color:#1b1404;}',
    '.pn-dia .h small i.dl{background:#f3e6c4;color:#3a2a14;}',
    '.pn-auc{width:100%;border-collapse:collapse;font-variant-numeric:tabular-nums;font-size:.8rem;}',
    '.pn-auc th{font-size:.68rem;font-weight:900;color:rgba(255,255,255,.75);padding:3px 2px;border-bottom:1px solid rgba(255,255,255,.18);}',
    '.pn-auc td{text-align:center;padding:3px 2px;font-weight:800;color:#fff;}',
    '.pn-auc td.p{color:rgba(255,255,255,.45);}.pn-auc td.w{color:#1b1404;background:#ffd166;border-radius:6px;}',
    '.pn-bid{display:flex;align-items:center;gap:10px;}',
    '.pn-bid .su{display:grid;place-items:center;width:40px;height:40px;border-radius:50%;background:#fffaf0;color:#1b1b22;font-size:26px;line-height:1;box-shadow:0 0 0 2px #c9a24a;flex:none;font-family:Georgia,serif;}',
    '.pn-bid .su.red{color:#d81e3a;}',
    '.pn-bid b{display:block;font-size:1.05rem;}.pn-bid span{font-size:.8rem;font-weight:700;color:rgba(255,255,255,.8);}',
    '.pn-ml{display:flex;flex-direction:column;gap:8px;}',
    '.pn-ml .pl{display:flex;flex-direction:column;gap:4px;}',
    '.pn-ml .pl .t{display:flex;justify-content:space-between;font-size:.76rem;font-weight:900;color:rgba(255,255,255,.85);}',
    '.pn-ml .pl .t b{color:#ffd166;}',
    '.pn-ml .gs{display:flex;flex-wrap:wrap;gap:6px 10px;}',
    '.pn-g{display:flex;flex-direction:column;align-items:center;gap:2px;}',
    '.pn-g .lb{font-size:.62rem;font-weight:900;padding:1px 6px;border-radius:999px;background:rgba(255,255,255,.14);white-space:nowrap;}',
    '.pn-g.big .lb{background:#ffd166;color:#1b1404;}',
    '.pn-none{font-size:.74rem;font-weight:800;color:rgba(255,255,255,.55);}'
  ].join(''));

  HistView.register('pinochle', function (e, ui) {
    var d = e.dt; if (!d || !d.hx) return null;
    var ck = HistView.ck; if (!ck) return null;
    var nm = d.names || [], n = nm.length, kind = d.kind || (n === 2 ? 'two' : n === 3 ? 'cut' : 'part'), hx = d.hx, out = [];
    var nS = kind === 'part' ? 2 : n;
    function side(p) { return kind === 'part' ? p % 2 : p; }
    function seats(s) { return kind === 'part' ? [s, s + 2] : [s]; }
    function sname(s) { return seats(s).map(fn).join(' & '); }
    // a person by first name, a computer player by its whole name
    function fn(p) { return String(d.cpu || '').charAt(p) === '1' ? String(nm[p] || '') : first(nm[p]); }
    var POS = { 4: ['s', 'w', 'n', 'e'], 3: ['s', 'w', 'e'], 2: ['s', 'n'] }[n] || ['s', 'w', 'n', 'e'];
    var sc = hx.map(function (h) { return nums(h.sc); });
    var made = d.made || [], sets = d.sets || [];
    var best = null;
    hx.forEach(function (h, i) { nums(h.mp).forEach(function (v, p) { if (!best || v > best.v) best = { v: v, p: p, i: i }; }); });
    var bigs = 0; hx.forEach(function (h) { String(h.m || '').split(/[|,]/).forEach(function (g) { if (BIG[g.split('=')[0]]) bigs++; }); });
    out.push(ui.stats([
      ['Hands', hx.length, d.to ? 'played to ' + Number(d.to).toLocaleString('en-US') : ''],
      kind !== 'two' && made.length ? ['Bids made', made.join(' – '), sname(0) + '’s count first'] : null,
      kind !== 'two' && sets.length ? ['Went set', sets.join(' – '), sname(0) + '’s count first'] : null,
      best && best.v ? ['Best meld', best.v.toLocaleString('en-US'), fn(best.p) + ', hand ' + (best.i + 1)] : null
    ]));

    var panel = el('div', { class: 'hv' });
    function cardRow(cs, w, o) { return ck.row(cs, Object.assign({ fan: true, w: w || 24, ov: -0.5 }, o || {})); }
    function show(i) {
      var h = hx[i], kids = [], pts = sc[i], tot = nums(h.tot), cp = nums(h.c), tk = nums(h.k), mp = nums(h.mp);
      var bw = h.bw != null ? +h.bw : -1, bs = bw >= 0 ? side(bw) : -1, r = h.r;
      var tag = kind === 'two' ? 'Trump ' + (SN[h.t] || '') : r === 'm' ? 'Made ' + h.b : r === 'c' ? 'Threw in ' + h.b : 'Set ' + h.b;
      kids.push(ck.head('<b>Hand ' + (i + 1) + '</b>' + (nm[h.d] ? ' · ' + K().esc(fn(h.d)) + ' dealt' : ''), tag, kind === 'two' ? '' : r === 'm' ? 'good' : 'bad'));
      // the bid and trump
      if (kind !== 'two' && h.t) {
        kids.push(el('div', { class: 'pn-bid' }, [el('span', { class: 'su' + (h.t === 'h' || h.t === 'd' ? ' red' : ''), text: GL[h.t] }),
          el('div', null, [el('b', { text: fn(bw) + ' bid ' + h.b + ' with ' + SN[h.t].toLowerCase() + ' as trump' }),
            el('span', { text: r === 'm' ? sname(bs) + ' made it' : r === 'c' ? sname(bs) + ' threw the hand in' : sname(bs) + ' went set' })])]));
      } else if (kind === 'two' && h.u) {
        kids.push(ck.grp('Turned for trump', ck.row([h.u], { w: 34 }), SN[h.t] + ' were trump'));
      }
      // the deal, every hand as dealt
      var deal = h.h ? String(h.h).split('.') : null;
      if (deal && deal.length === n) {
        var dia = el('div', { class: 'pn-dia k' + n });
        deal.forEach(function (hs, p) {
          var pos = POS[p], cs = sortC(codes(hs));
          dia.appendChild(el('div', { class: 'h a-' + pos, style: { 'grid-area': pos } }, [el('small', null, [document.createTextNode(fn(p)), p === bw ? el('i', { text: 'Bid ' + h.b }) : null, p === +h.d ? el('i', { class: 'dl', text: 'Dealer' }) : null]), cardRow(cs, n === 2 ? 26 : 22)]));
        });
        kids.push(ck.grp('The deal', dia));
      }
      // the auction by seat, starting to the dealer's left
      if (h.a) {
        var ord = []; for (var q = 1; q <= n; q++) ord.push((+h.d + q) % n);
        var bids = String(h.a).split('.').map(function (x) { var y = x.split(':'); return { p: +y[0], b: y[1] === 'p' ? 0 : +y[1] }; });
        var rows = [], row = null, col = 0;
        bids.forEach(function (x) {
          var c = ord.indexOf(x.p);
          if (!row || c <= col) { row = ord.map(function () { return null; }); rows.push(row); }
          row[c] = x; col = c;
        });
        var t = el('table', { class: 'pn-auc' }, [el('tr', null, ord.map(function (p) { return el('th', { text: fn(p), style: { color: ui.color(side(p)) } }); }))]);
        rows.forEach(function (rw, ri) {
          t.appendChild(el('tr', null, rw.map(function (x) {
            var isWin = x && x.b && x.p === bw && x.b === +h.b;
            return el('td', { class: !x ? '' : x.b ? (isWin ? 'w' : '') : 'p', text: !x ? '' : x.b ? String(x.b) : 'Pass' });
          })));
        });
        kids.push(ck.grp('The bidding', t));
      }
      // the pass, the widow and what was buried
      if (h.pg && bw >= 0) {
        var mate = (bw + 2) % 4;
        kids.push(el('div', { class: 'hvc-pair' }, [ck.grp(fn(mate) + ' passed ' + fn(bw), ck.row(sortC(codes(h.pg)), { w: 28 })), ck.grp(fn(bw) + ' passed back', ck.row(sortC(codes(h.pb)), { w: 28 }))]));
      }
      if (h.w) kids.push(el('div', { class: 'hvc-pair' }, [ck.grp('The widow', ck.row(codes(h.w), { w: 28 })), h.bu ? ck.grp(fn(bw) + ' buried', ck.row(sortC(codes(h.bu)), { w: 28 })) : null]));
      // everyone's meld
      if (h.m != null) {
        var ml = el('div', { class: 'pn-ml' }), per = String(h.m).split('|');
        per.forEach(function (gs, p) {
          var row = el('div', { class: 'gs' });
          String(gs).split(',').filter(Boolean).forEach(function (g) {
            var kv = g.split('='), k = kv[0];
            row.appendChild(el('div', { class: 'pn-g' + (BIG[k] ? ' big' : '') }, [cardRow(codes(kv[1]), 20, { ov: -0.55 }), el('span', { class: 'lb', text: (k === 'm' ? 'Marriage ' + (GL[(codes(kv[1])[0] || ' s').charAt(1)] || '') : MNAME[k] || k) + ' ' + (MV[k] || 0).toLocaleString('en-US') })]));
          });
          if (!row.children.length) row.appendChild(el('span', { class: 'pn-none', text: 'No meld' }));
          ml.appendChild(el('div', { class: 'pl' }, [el('div', { class: 't' }, [el('span', { text: fn(p) }), el('b', { text: String(mp[p] || 0) })]), row]));
        });
        kids.push(ck.grp(kind === 'two' ? 'Meld laid during the hand' : 'The meld', ml));
      }
      // the count, side by side
      var sv = String(h.sv || '');
      kids.push(ck.plates((function () { var a = []; for (var s = 0; s < nS; s++) a.push(s); return a; })().map(function (s) {
        var meld = 0; mp.forEach(function (v, p) { if (side(p) === s) meld += v || 0; });
        var lost = kind !== 'two' && sv && sv.charAt(s) === '0' && meld;
        return { n: sname(s), v: pts[s] != null ? (pts[s] > 0 ? '+' : '') + pts[s] : '–', s: (lost ? 'meld lost' : 'meld ' + meld) + ' · counters ' + cp[s], s2: plural(tk[s] || 0, 'trick') + ' · total ' + (tot[s] != null ? tot[s] : ''),
          c: ui.color(s), cls: s === bs ? (r === 'm' ? 'good' : 'bad') : '' };
      })));
      if (h.ml) {
        var lines = String(h.ml).split('.').filter(Boolean).map(function (x) { var y = x.split(':'); return { t: fn(+y[0]) + ' laid ' + (MNAME[y[1]] || y[1]).toLowerCase() + ' for ' + (MV[y[1]] || 0), c: +y[0] }; });
        if (lines.length) kids.push(ck.grp('Meld in the order it was laid', ui.log(lines)));
      }
      panel.innerHTML = ''; panel.appendChild(ck.felt(FELT, kids));
    }
    var items = hx.map(function (h, i) {
      var p = sc[i], w = 0; for (var s = 1; s < p.length; s++) if (p[s] > p[w]) w = s;
      var big = String(h.m || '').split(/[|,]/).some(function (g) { return BIG[g.split('=')[0]]; });
      return { t: String(i + 1), c: ui.color(w), ring: big, title: 'Hand ' + (i + 1) + (h.r === 's' ? ': the bidder went set' : h.r === 'c' ? ': thrown in' : '') };
    });
    out.push(ui.section('Every hand', [ck.road(items, hx.length - 1, show), panel,
      ck.key((function () { var a = []; for (var s = 0; s < nS; s++) a.push(['Best hand for ' + sname(s), ui.color(s)]); if (bigs) a.push(['A big meld', 'ring']); return a; })())], { icon: 'cards' }));
    // the score sheet: each hand's meld and counters for each side, and the bid made or set
    var head = [''].concat((function () { var a = []; for (var s = 0; s < nS; s++) a.push(sname(s)); return a; })());
    var rows = hx.map(function (h, i) {
      var mp = nums(h.mp), cp = nums(h.c), bs = h.bw != null ? side(+h.bw) : -1, out2 = ['H' + (i + 1)];
      for (var s = 0; s < nS; s++) {
        var meld = 0; mp.forEach(function (v, p) { if (side(p) === s) meld += v || 0; });
        var lost = kind !== 'two' && String(h.sv || '').charAt(s) === '0';
        var v = sc[i][s];
        out2.push({ t: (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v), c: s === bs ? (h.r === 'm' ? 'good' : 'bad') : '' });
      }
      return out2;
    });
    var fin = (e.players || []).map(function (p) { return p.score; });
    out.push(ui.section('The score pad', [ui.table(head, rows, { foot: ['Total'].concat(fin), headColors: [null].concat(head.slice(1).map(function (x, s) { return ui.color(s); })) }),
      ui.el('p', { class: 'hv-note', text: 'What each side scored in each hand. Green: the bidder made it. Red: the bidder went set or threw the hand in.' })]));
    // what decided it
    if (fin.length && d.ws != null) {
      var w = +d.ws, lh = hx[hx.length - 1], why = sname(w) + ' won with ' + fin[w] + ' after ' + plural(hx.length, 'hand') + '.';
      if (lh && kind !== 'two' && lh.bw != null && side(+lh.bw) === w && lh.r === 'm') why += ' ' + fn(+lh.bw) + ' bid ' + lh.b + ' in the last hand and made it, and the bidding side counts out first.';
      else if (lh && kind !== 'two' && lh.bw != null && side(+lh.bw) !== w && lh.r !== 'm') why += ' The other side went set in the last hand.';
      out.push(ck.foot(why, 'flag'));
    }
    return ui.wrap(out);
  });
})();
