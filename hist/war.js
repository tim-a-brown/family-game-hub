'use strict';
// History view: War. The race for the deck (each player's pile, round by round, with every war marked where it was
// won), every war with the cards that tied and the cards that settled it, the biggest swing, the lowest a winner fell
// and how the game ended. Recorded by games/war.html (Kit.record 'war'; detail() there says what each field holds).
(function () {
  if (!window.HistView) return;
  function K() { return window.Kit; }
  function el(t, a, k) { return K().el(t, a, k); }
  var FELT = ['#7a2a30', '#53191e', '#3a1014'];
  var RW = { '2': 'two', '3': 'three', '4': 'four', '5': 'five', '6': 'six', '7': 'seven', '8': 'eight', '9': 'nine', T: 'ten', J: 'jack', Q: 'queen', K: 'king', A: 'ace' };
  function first(n) { return String(n || '').split(' ')[0]; }
  function num(n) { return (Number(n) || 0).toLocaleString('en-US'); }
  function plural(n, w) { return num(n) + ' ' + w + (n === 1 ? '' : 's'); }
  function depthName(d) { return d >= 5 ? d + '-deep war' : ['', 'War', 'Double war', 'Triple war', 'Quadruple war'][d] || 'War'; }
  function ranksSay(codes) {
    var r = (codes[0] || '').charAt(0), w = RW[r] || r;
    return (codes.length === 2 ? 'Two ' : codes.length === 3 ? 'Three ' : codes.length + ' ') + (r === '6' ? 'sixes' : w + 's') + ' tied';
  }

  HistView.css('hv-war', [
    '.wv-chart{position:relative;}',
    '.wv-chart svg{display:block;width:100%;height:auto;}',
    '.wv-chart .wm{cursor:pointer;}',
    '.wv-chart .wm.on circle{stroke:#fff;stroke-width:2.4;filter:drop-shadow(0 0 4px #ffd34d) drop-shadow(0 0 2px #ffd34d);}',
    '.wv-tie{display:flex;flex-wrap:wrap;gap:14px 22px;align-items:flex-end;}',
    '.wv-tie .col{display:flex;flex-direction:column;align-items:center;gap:4px;}',
    '.wv-tie .col small{font-size:.72rem;font-weight:800;color:rgba(255,255,255,.82);}',
    '.wv-tie .col.won small{color:#ffd34d;}',
    '.wv-tie .arrow{align-self:center;font-size:1.3rem;color:rgba(255,255,255,.55);}',
    '.wv-took{font-size:.9rem;font-weight:700;line-height:1.35;}',
    '.wv-took b{color:#ffd34d;}'
  ].join(''));

  HistView.register('war', function (e, ui) {
    var d = e.dt; if (!d || !d.c) return null;
    var ck = HistView.ck; if (!ck) return null;
    var names = d.names || (e.players || []).map(function (p) { return p.name; }), n = names.length;
    function fn(p) { return String(d.cpu || '').charAt(p) === '1' ? String(names[p] || '') : first(names[p]); }
    var rows = String(d.c).split('.').map(function (r) { return r.split(',').map(Number); });
    var step = +d.st || 1, R = +d.r || (rows.length - 1) * step, tot = +d.tot || 52;
    var wars = d.wars || [], out = [], w = d.w != null ? +d.w : -1;
    var lo = String(d.lo || '').split('.').map(Number), runs = String(d.run || '').split('.').map(Number);
    var deep = 0; wars.forEach(function (x) { if (+x.d > deep) deep = +x.d; });

    // the numbers
    var br = 0; runs.forEach(function (v, p) { if (v > runs[br]) br = p; });
    out.push(ui.stats([
      ['Rounds', num(R), d.why === 'rounds' ? 'a short game' : d.why === 'cap' ? 'called at the limit' : ''],
      ['Wars', num(d.nw || wars.length), deep >= 2 ? 'the deepest was a ' + depthName(deep).toLowerCase() : ''],
      d.sw ? ['Biggest swing', '+' + d.sw.n, fn(d.sw.p) + ' in round ' + num(d.sw.r)] : null,
      w >= 0 && lo[w] != null && d.why === 'all' && lo[w] < tot / n / 2 ? ['Lowest pile', lo[w], fn(w) + ' fell this low and still won'] : runs.length ? ['Longest run', runs[br], fn(br) + ' won that many in a row'] : null
    ]));

    // the race: each pile over the game, the wars marked on the winner's line
    var Wd = 340, Hd = 180, pl = 26, pr = 10, pt = 10, pb = 20;
    function X(r) { return pl + (Wd - pl - pr) * Math.min(1, r / Math.max(1, R)); }
    function Y(v) { return pt + (Hd - pt - pb) * (1 - v / tot); }
    function at(r, p) { var i = Math.min(rows.length - 1, Math.round(r / step)); return rows[i] ? rows[i][p] : 0; }
    var s = '<svg viewBox="0 0 ' + Wd + ' ' + Hd + '" role="img" aria-label="Each player’s pile over the game">';
    var even = tot / n;
    [0, even, tot].forEach(function (v) {
      s += '<line x1="' + pl + '" x2="' + (Wd - pr) + '" y1="' + Y(v) + '" y2="' + Y(v) + '" stroke="rgba(255,255,255,' + (v === even ? '.3' : '.1') + ')"' + (v === even ? ' stroke-dasharray="3 3"' : '') + '/>';
      s += '<text x="' + (pl - 5) + '" y="' + Y(v) + '" text-anchor="end" dominant-baseline="central" font-size="9" font-weight="700" fill="rgba(255,255,255,.6)" font-family="system-ui">' + Math.round(v) + '</text>';
    });
    s += '<text x="' + (Wd - pr) + '" y="' + (Hd - 5) + '" text-anchor="end" font-size="9" fill="rgba(255,255,255,.55)" font-family="system-ui">round ' + num(R) + '</text>';
    s += '<text x="' + pl + '" y="' + (Hd - 5) + '" font-size="9" fill="rgba(255,255,255,.55)" font-family="system-ui">deal</text>';
    for (var p = 0; p < n; p++) {
      var dd = '';
      rows.forEach(function (row, i) { var r = Math.min(R, i * step); dd += (i ? ' L' : 'M') + X(r).toFixed(1) + ' ' + Y(row[p] || 0).toFixed(1); });
      s += '<path d="' + dd + '" fill="none" stroke="' + ui.color(p) + '" stroke-width="' + (p === w ? 2.6 : 1.8) + '" stroke-linejoin="round" stroke-linecap="round" opacity="' + (p === w || n === 2 ? 1 : .8) + '"/>';
    }
    // the biggest swing and the winner's lowest point
    if (d.sw) s += '<circle cx="' + X(d.sw.r) + '" cy="' + Y(at(d.sw.r, d.sw.p)) + '" r="5" fill="none" stroke="#fff" stroke-dasharray="2 2" stroke-width="1.4"/>';
    wars.forEach(function (x, i) {
      var cx = X(+x.r), cy = Y(at(+x.r, +x.w)), r = 3 + Math.min(4, +x.d) * 1.6;
      s += '<g class="wm" data-i="' + i + '"><circle cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="' + r + '" fill="' + ui.color(+x.w) + '" stroke="#fff" stroke-width="1.3"/>' +
        (+x.d >= 2 ? '<text x="' + cx.toFixed(1) + '" y="' + cy.toFixed(1) + '" text-anchor="middle" dominant-baseline="central" font-size="' + (r * 1.1).toFixed(1) + '" font-weight="900" fill="#fff" font-family="system-ui">' + x.d + '</text>' : '') + '</g>';
    });
    s += '</svg>';
    var chartBox = el('div', { class: 'wv-chart hv-snap f-dark', html: s });
    var keyL = []; for (var q = 0; q < n; q++) keyL.push([fn(q), ui.color(q)]);
    if (wars.length) keyL.push(['A war, on the line of whoever won it', 'ring']);
    out.push(ui.section('The race for the deck', [chartBox, ck.key(keyL),
      el('p', { class: 'hv-note', text: 'Each line is a player’s pile after every round. ' + (n === 2 ? 'Above the dashed line, that player held more than half the deck.' : 'Above the dashed line, that player held more than an even share.') + (d.sw ? ' The dashed ring is the biggest swing.' : '') })], { icon: 'chart' }));

    // every war
    if (wars.length) {
      var panel = el('div', { class: 'hv' }), marks = chartBox.querySelectorAll('.wm');
      var show = function (i) {
        var x = wars[i], tie = String(x.t || '').split('.').filter(Boolean), fin = String(x.f || '').split('.').filter(Boolean), kids = [];
        [].forEach.call(marks, function (m) { m.classList.toggle('on', +m.getAttribute('data-i') === i); });
        kids.push(ck.head('<b>Round ' + num(x.r) + '</b>', depthName(+x.d), +x.d >= 2 ? 'good' : ''));
        var box = el('div', { class: 'wv-tie' });
        if (tie.length) box.appendChild(el('div', { class: 'col' }, [ck.row(tie, { w: 40 }), el('small', { text: ranksSay(tie) })]));
        if (fin.length) {
          box.appendChild(el('span', { class: 'arrow', html: '&rarr;' }));
          var ac = String(d.o || '').split('.')[1], ws = 0;
          fin.forEach(function (c, j) { if (j && rank(c, ac) > rank(fin[ws], ac)) ws = j; });
          if (ac === 'two' && fin[ws].charAt(0) === 'A') fin.forEach(function (c, j) { if (c.charAt(0) === '2') ws = j; });
          box.appendChild(el('div', { class: 'col won' }, [ck.row(fin, { w: 40, hl: [fin[ws]] }), el('small', { text: 'The cards that settled it' })]));
        }
        kids.push(box);
        if (fin.length > 1 && fin.every(function (c) { return c.charAt(0) === fin[0].charAt(0); })) kids.push(el('div', { class: 'wv-took', text: 'The last cards tied as well, but nobody else had a card left to go to war with.' }));
        kids.push(el('div', { class: 'wv-took', html: '<b>' + K().esc(fn(+x.w)) + '</b> won the ' + K().esc(depthName(+x.d).toLowerCase()) + ' and took ' + plural(+x.n, 'card') + '.' }));
        panel.innerHTML = ''; panel.appendChild(ck.felt(FELT, kids));
      };
      [].forEach.call(marks, function (m) { m.addEventListener('click', function () { var i = +m.getAttribute('data-i'); pick(i); }); });
      var items = wars.map(function (x) { return { t: num(x.r), c: ui.color(+x.w), ring: +x.d >= 2, title: depthName(+x.d) + ' in round ' + num(x.r) }; });
      var big = 0; wars.forEach(function (x, i) { if (+x.d > +wars[big].d || (+x.d === +wars[big].d && +x.n > +wars[big].n)) big = i; });
      var road = ck.road(items, big, show);
      var pick = function (i) { var b = road.children[i]; if (b) b.click(); };
      out.push(ui.section(d.nw > wars.length ? 'The ' + wars.length + ' biggest of ' + d.nw + ' wars' : wars.length === 1 ? 'The war' : 'Every war', [road, panel,
        ck.key([['A double war or deeper', 'ring']])], { icon: 'bolt' }));
    }

    // how it ended
    var why = '';
    if (d.why === 'all' && w >= 0) why = fn(w) + ' won every card in ' + plural(R, 'round') + '.' + (lo[w] < 5 ? ' At one point ' + fn(w) + ' was down to ' + plural(lo[w], 'card') + '.' : '');
    else if (d.why === 'rounds' && w >= 0) why = 'The game was played to ' + plural(R, 'round') + ', and ' + fn(w) + ' held the most cards at the end.';
    else if (d.why === 'cap' && w >= 0) why = 'After ' + plural(R, 'round') + ' the game was called, and ' + fn(w) + ' held the most cards.';
    else why = 'Nobody held more cards than everyone else when the rounds were up, so it was a tie.';
    var opts = String(d.o || '').split('.');
    var vari = [];
    if (opts[1] === 'low') vari.push('aces low'); if (opts[1] === 'two') vari.push('a 2 takes an ace');
    if (opts[2] === '1') vari.push('one card face down in a war'); if (opts[3] === '1') vari.push('won cards shuffled'); if (opts[3] === '0') vari.push('won cards put under in order');
    if (vari.length) why += ' Played with ' + vari.join(', ') + '.';
    if (+d.a2) why += ' A two took an ace ' + (+d.a2 === 1 ? 'once.' : d.a2 + ' times.');
    out.push(ck.foot(why, 'flag'));
    return ui.wrap(out);
  });
  function rank(c, aces) { var r = String(c).charAt(0); return aces === 'low' && r === 'A' ? -1 : '23456789TJQKA'.indexOf(r); }
})();
