'use strict';
// History view: Go Fish. The race for books over the game (each player's count turn by turn, a dot where each book went
// down, a ring where it came from the pond), then every player's books laid out as small fanned sets of four in the
// order they made them, and the game in numbers: how many asks, the longest run of asks that got cards, the biggest
// single catch and the fish that were wished for.
// The record's detail (games/gofish-core.js historyDetail): names, cpu ('1' a computer player), o the books in order
// "seat.rank.turn.how" joined by spaces (rank T is 10; how a ask, f fish, d deal), t the last turn, asks, s each
// player's best streak, lk the fish each wished for, bg their three-card catches (each "n.n.n"), c the biggest catch
// "seat.from.rank.count", nx 'left' | 'asked', th the themed deck's id (games/gofish/decks.js; none: the standard deck).
// A themed game names every book by its subject and shows it by its picture; the deck's names come from
// games/gofish/decks.js, fetched the first time such a game is opened away from Go Fish's page.
(function () {
  if (!window.HistView) return;
  function K() { return window.Kit; }
  function el(t, a, k) { return K().el(t, a, k); }
  var NAMES = { J: 'Jack', Q: 'Queen', K: 'King', A: 'Ace' };
  function rk(c) { return c === 'T' ? '10' : c; }
  function first(n) { return String(n || '').split(' ')[0]; }
  function nums(s) { return String(s == null ? '' : s).split('.').map(Number); }
  var NUMW = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen'];
  var base = (function () { try { var s = document.querySelector('script[src*="hist-view.js"]'); return new URL('games/', s.src).href; } catch (e) { return ''; } })();
  var waiting = null;
  function decks(then) {
    if (window.GoFishDecks) return then();
    if (!waiting) {
      waiting = [];
      var s = document.createElement('script'); s.src = base + 'gofish/decks.js';
      s.onload = s.onerror = function () { var w = waiting; waiting = []; w.forEach(function (f) { try { f(); } catch (e) {} }); };
      document.head.appendChild(s);
    }
    waiting.push(then);
  }

  HistView.css('hv-gofish', [
    '.hvg-race{display:block;width:100%;height:auto;}',
    '.hvg-rows{display:flex;flex-direction:column;gap:12px;}',
    '.hvg-row{display:flex;flex-direction:column;gap:6px;}',
    '.hvg-row .hd{display:flex;align-items:center;gap:8px;font-weight:800;font-size:.86rem;color:#fff;}',
    '.hvg-row .hd i{flex:none;width:10px;height:10px;border-radius:50%;background:var(--pc);}',
    '.hvg-row .hd span{flex:1 1 auto;min-width:0;}',
    '.hvg-row .hd b{font-family:var(--display);font-weight:400;font-size:1.2rem;color:var(--pc);font-variant-numeric:tabular-nums;}',
    '.hvg-row.win .hd b{color:#ffd166;}',
    '.hvg-bks{display:flex;flex-wrap:wrap;gap:10px 12px;padding-left:18px;}',
    '.hvg-bk{display:flex;flex-direction:column;align-items:center;gap:3px;}',
    '.hvg-bk .hv-cards{--cw:24px;display:flex;}',
    '.hvg-bk .hv-cards .pcard{flex:none;box-shadow:0 1px 3px rgba(0,0,0,.45);}',
    '.hvg-bk .hv-cards .pcard+.pcard{margin-left:-17px;}',
    '.hvg-bk small{font-size:.66rem;font-weight:700;color:rgba(255,255,255,.62);white-space:nowrap;}',
    '.hvg-bk.f small{color:#9fd8ff;}.hvg-bk.d small{color:#ffd166;}',
    '.hvg-bk small{display:inline-flex;align-items:center;gap:3px;}.hvg-bk small .ico{width:13px;height:13px;}',
    '.hvg-key{display:flex;flex-wrap:wrap;gap:4px 14px;margin-top:6px;font-size:.72rem;font-weight:700;color:rgba(255,255,255,.62);}',
    '.hvg-key span{display:inline-flex;align-items:center;gap:5px;}',
    '.hvg-key i{display:inline-block;width:7px;height:7px;border-radius:50%;background:rgba(255,255,255,.75);}',
    '.hvg-key i.o{background:none;box-shadow:inset 0 0 0 1.6px #9fd8ff;width:8px;height:8px;}',
    '.hvg-none{font-size:.78rem;font-weight:700;color:rgba(255,255,255,.5);padding-left:18px;}',
    '.hvg-pic{position:relative;width:46px;height:46px;border-radius:9px;background:#eee center/cover no-repeat;box-shadow:0 0 0 1.5px rgba(255,255,255,.85),3px 3px 0 -1px #f3ead8,3px 3px 0 .5px rgba(0,0,0,.25),0 2px 5px rgba(0,0,0,.4);}',
    '.hvg-bk b{max-width:72px;font-size:.66rem;font-weight:800;line-height:1.1;color:#fff;text-align:center;text-wrap:balance;}'
  ].join(''));

  HistView.register('gofish', function (e, ui) {
    var d = e.dt; if (!d || !d.names || d.o == null) return null;
    if (d.th && !window.GoFishDecks) {   // (the deck's names are fetched first)
      var box = el('div');
      decks(function () { var n = view(e, ui); if (n) box.appendChild(n); });
      return box;
    }
    return view(e, ui);
  });
  function view(e, ui) {
    var d = e.dt, DK = window.GoFishDecks, deck = d.th && DK && DK.get(d.th);
    var th = deck ? d.th : null;
    function plural(r) { var t = th && DK.subj(th, r); return t ? t.many : NAMES[r] ? NAMES[r] + 's' : r + 's'; }
    function single(r) { var t = th && DK.subj(th, r); return t ? t.one : NAMES[r] || r; }
    var nm = d.names, n = nm.length, out = [];
    function fn(p) { return String(d.cpu || '').charAt(p) === '1' ? String(nm[p] || '') : first(nm[p]); }
    var books = String(d.o).split(' ').filter(Boolean).map(function (x) { var q = x.split('.'); return { p: +q[0], r: rk(q[1]), t: +q[2], h: q[3] || 'a' }; });
    var tot = []; for (var p = 0; p < n; p++) tot.push(0);
    books.forEach(function (b) { tot[b.p]++; });
    var most = Math.max.apply(null, tot);

    // ── The race for books: a step line for each player, turn by turn ──
    var T = Math.max(1, +d.t || 1), W = 320, H = 150, L = 22, R = 10, Tp = 10, B = 22;
    var top = Math.max(4, most), sx = function (t) { return L + (W - L - R) * t / T; }, sy = function (k) { return Tp + (H - Tp - B) * (1 - k / top); };
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="hvg-race" role="img" aria-label="How many books each player had, turn by turn">';
    for (var k = 0; k <= top; k += top > 8 ? 2 : 1) s += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + sy(k) + '" y2="' + sy(k) + '" stroke="rgba(255,255,255,' + (k ? .08 : .25) + ')" stroke-width="1"/><text x="' + (L - 6) + '" y="' + sy(k) + '" text-anchor="end" dominant-baseline="central" font-size="9" fill="rgba(255,255,255,.55)" font-family="system-ui">' + k + '</text>';
    s += '<text x="' + L + '" y="' + (H - 6) + '" font-size="9" fill="rgba(255,255,255,.55)" font-family="system-ui">Turn 1</text><text x="' + (W - R) + '" y="' + (H - 6) + '" text-anchor="end" font-size="9" fill="rgba(255,255,255,.55)" font-family="system-ui">Turn ' + T + '</text>';
    for (p = 0; p < n; p++) {
      var c = ui.color(p), pts = [[sx(0), sy(0)]], got = 0, dots = '';
      books.forEach(function (b) {
        if (b.p !== p) return;
        var x = sx(b.t);
        pts.push([x, sy(got)]); got++; pts.push([x, sy(got)]);
        dots += b.h === 'f' ? '<circle cx="' + x + '" cy="' + sy(got) + '" r="3.2" fill="#10131f" stroke="' + c + '" stroke-width="1.8"/>' : '<circle cx="' + x + '" cy="' + sy(got) + '" r="2.8" fill="' + c + '"/>';
      });
      pts.push([sx(T), sy(got)]);
      s += '<polyline points="' + pts.map(function (q) { return q[0].toFixed(1) + ',' + q[1].toFixed(1); }).join(' ') + '" fill="none" stroke="' + c + '" stroke-width="' + (got === most ? 2.6 : 1.8) + '" stroke-linejoin="round" opacity="' + (got === most ? 1 : .8) + '"/>' + dots;
    }
    s += '</svg>';
    var key = ui.chips(nm.map(function (x, i) { return { t: fn(i) + ' ' + tot[i], c: ui.color(i), on: tot[i] === most }; }));
    var legend = el('div', { class: 'hvg-key' }, [el('span', null, [el('i'), 'A book made by asking']), el('span', null, [el('i', { class: 'o' }), 'A book finished with a fish from the pond'])]);
    out.push(ui.section('The race for books', [ui.picture(s, { frame: 'dark' }), legend, key], { icon: 'chart' }));

    // ── Every player's books, in the order made ──
    var order = []; for (p = 0; p < n; p++) order.push(p);
    order.sort(function (a, b) { return tot[b] - tot[a] || a - b; });
    var rows = el('div', { class: 'hvg-rows' });
    order.forEach(function (p) {
      var row = el('div', { class: 'hvg-row' + (tot[p] === most ? ' win' : ''), style: { '--pc': ui.color(p) } }, [
        el('div', { class: 'hd' }, [el('i'), el('span', { text: nm[p] }), el('b', { text: String(tot[p]) })])]);
      var mine = books.filter(function (b) { return b.p === p; });
      if (!mine.length) row.appendChild(el('div', { class: 'hvg-none', text: fn(p) + ' made no books.' }));
      else {
        var bx = el('div', { class: 'hvg-bks' });
        mine.forEach(function (b) {
          var r = b.r === '10' ? '10' : b.r;
          var pic = th ? [el('div', { class: 'hvg-pic', role: 'img', 'aria-label': plural(b.r), style: { backgroundImage: 'url("' + base + DK.pic(th, b.r, true) + '")' } }), el('b', { text: plural(b.r) })] : [ui.cards([r + 's', r + 'h', r + 'c', r + 'd'])];
          bx.appendChild(el('div', { class: 'hvg-bk ' + b.h, title: plural(b.r) }, pic.concat([el('small', { html: b.h === 'd' ? 'Dealt' : (b.h === 'f' ? ui.icon('fish') : '') + 'Turn ' + b.t })])));
        });
        row.appendChild(bx);
      }
      rows.appendChild(row);
    });
    out.push(ui.section('Books in the order made', rows, { icon: 'cards' }));

    // ── The game in numbers ──
    var st = nums(d.s), bs = Math.max.apply(null, st.concat([0])), bw = st.indexOf(bs);
    var lk = nums(d.lk), lkT = lk.reduce(function (a, b) { return a + (b || 0); }, 0);
    var cq = d.c ? String(d.c).split('.') : null, catchN = cq ? +cq[3] : 0;
    out.push(ui.section('The game in numbers', ui.stats([
      ['Asks', d.asks],
      bs > 1 ? ['Longest run of asks', bs, fn(bw)] : null,
      cq ? ['Biggest catch', catchN, NUMW[catchN] + ' ' + (catchN === 1 ? single(rk(cq[2])) : plural(rk(cq[2]))) + ' from ' + fn(+cq[1])] : null,
      ['Fish wished for', lkT, lkT ? nm.map(function (x, i) { return lk[i] ? fn(i) + ' ' + lk[i] : ''; }).filter(Boolean).join(', ') : 'Nobody drew the rank they asked for']
    ]), { icon: 'fish' }));
    out.push(ui.facts([['Deck', deck ? 'The ' + deck.name + ' deck' : 'The standard deck'], ['After a Go fish', d.nx === 'asked' ? 'The player who said Go fish took the next turn' : 'The turn passed to the left']]));
    return ui.wrap(out, 'hvg');
  }
})();
