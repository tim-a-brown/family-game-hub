'use strict';
// History views: casino
(function () {
  if (!window.HistView) return;
  var R = HistView.register;

  // ── shared bits ──
  function signed(n) { n = Math.round(Number(n) || 0); return (n > 0 ? '+$' : n < 0 ? '−$' : '$') + Math.abs(n).toLocaleString('en-US'); }
  function cls(n) { return n > 0 ? 'good' : n < 0 ? 'bad' : ''; }
  function pname(e, i) { var p = (e.players || [])[i || 0]; return p ? p.name : ''; }
  // Bankroll start/end/net tiles for solo casino sessions
  function bankStats(ui, b, net, extra) {
    if (!b) return null;
    var list = [['Started with', b.s != null ? ui.money(b.s) : null], ['Ended with', b.e != null ? ui.money(b.e) : null], ['Net', net != null ? signed(net) : null]];
    return ui.stats(list.concat(extra || []));
  }
  // a row of buttons that pick one item; returns {node, set}
  function picker(ui, labels, start, onPick) {
    var box = ui.el('div', { class: 'cz-pick', role: 'tablist' }), btns = [];
    labels.forEach(function (l, i) {
      var b = ui.el('button', { type: 'button', class: 'cz-pb', text: l, onclick: function () { set(i); } });
      btns.push(b); box.appendChild(b);
    });
    function set(i) { btns.forEach(function (b, j) { b.classList.toggle('on', i === j); b.setAttribute('aria-selected', i === j ? 'true' : 'false'); }); onPick(i); }
    return { node: labels.length > 1 ? box : null, set: set };
  }
  HistView.css('hv-casino', [
    '.cz-pick{display:flex;flex-wrap:wrap;gap:5px;}',
    '.cz-pb{appearance:none;border:0;cursor:pointer;font:inherit;font-size:.8rem;font-weight:900;padding:6px 10px;border-radius:999px;background:rgba(255,255,255,.07);color:var(--text-2);}',
    '.cz-pb.on{background:var(--yellow);color:#1b1404;}',
    '.cz-felt{border-radius:14px;padding:10px;background:radial-gradient(120% 120% at 50% 0%,#1f7a4a,#0e4a2b);box-shadow:inset 0 0 0 2px rgba(0,0,0,.25),0 6px 16px -6px rgba(0,0,0,.6);color:#fff;display:flex;flex-direction:column;gap:8px;}',
    '.cz-felt .lab{font-size:.66rem;font-weight:900;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.6);}',
    '.cz-hand{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}',
    '.cz-hand .tag{font-size:.8rem;font-weight:800;color:rgba(255,255,255,.85);}',
    '.cz-res{margin-left:auto;font-weight:900;font-variant-numeric:tabular-nums;}',
    '.cz-res.good{color:#4ade80;}.cz-res.bad{color:#fca5a5;}',
    '.cz-wood{align-self:center;width:100%;max-width:360px;border-radius:16px;padding:7px;background:linear-gradient(135deg,#8a5a2b,#5b3716);box-shadow:inset 0 0 0 2px rgba(0,0,0,.25),0 6px 16px -6px rgba(0,0,0,.6);}',
    '.cz-board{border-radius:11px;padding:10px;background:linear-gradient(#141218,#0b0a0e);box-shadow:inset 0 2px 10px rgba(0,0,0,.9);color:#ffd54a;}',
    '.cz-board .top{display:flex;justify-content:space-between;gap:8px;font-size:.62rem;font-weight:900;letter-spacing:.12em;text-transform:uppercase;color:#8d8678;margin-bottom:6px;}',
    '.cz-board table{width:100%;border-collapse:collapse;font-variant-numeric:tabular-nums;}',
    '.cz-board th{font-size:.58rem;font-weight:900;letter-spacing:.1em;text-transform:uppercase;color:#8d8678;text-align:right;padding:0 0 4px;}',
    '.cz-board td{padding:4px 0;border-top:1px solid rgba(255,213,74,.12);font-weight:800;font-size:.86rem;text-align:right;white-space:nowrap;}',
    '.cz-board td.nm{text-align:left;color:#fff;max-width:0;width:100%;overflow:hidden;text-overflow:ellipsis;padding-left:4px;}',
    '.cz-nm{display:flex;align-items:center;gap:5px;min-width:0;}.cz-nm>span:last-child{overflow:hidden;text-overflow:ellipsis;}.cz-nm .cz-silk{margin:0;flex:none;}.cz-nm .cz-cl{flex:none;}',
    '.cz-board td.ps{text-align:left;color:#c8bfa8;width:30px;}',
    '.cz-board td.mg{color:#c8bfa8;font-size:.74rem;padding-left:8px;}',
    '.cz-board tr.w td.nm{color:#ffd54a;}',
    '.cz-board .note{margin-top:7px;font-size:.76rem;font-weight:800;color:#c8bfa8;line-height:1.35;}',
    '.cz-cl{display:inline-grid;place-items:center;min-width:17px;height:17px;padding:0 3px;border-radius:4px;font-size:.72rem;font-weight:900;vertical-align:-3px;box-shadow:inset 0 -2px 0 rgba(0,0,0,.2);}',
    '.cz-silk{width:18px;height:18px;vertical-align:-4px;margin-right:4px;}',
    '.cz-tks{display:flex;flex-direction:column;gap:5px;}',
    '.cz-tk{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:10px;background:#f6f1e3;color:#2a2418;box-shadow:0 3px 8px -4px rgba(0,0,0,.6);border-left:4px dashed rgba(0,0,0,.15);}',
    '.cz-tk .tx{display:flex;flex-direction:column;min-width:0;flex:1;}',
    '.cz-tk .tx b{font-size:.88rem;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
    '.cz-tk .tx small{font-size:.74rem;font-weight:700;color:#6b6252;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
    '.cz-tk .st{flex:none;font-size:.72rem;font-weight:900;letter-spacing:.06em;padding:3px 6px;border-radius:5px;border:2px solid currentColor;transform:rotate(-5deg);}',
    '.cz-tk .st.w{color:#15803d;}.cz-tk .st.l{color:#9a8f7a;}',
    '.cz-tk .am{flex:none;text-align:right;font-weight:900;font-variant-numeric:tabular-nums;font-size:.86rem;min-width:52px;}',
    '.cz-tk .am.good{color:#15803d;}',
    '.cz-sub{font-size:.8rem;font-weight:700;color:var(--text-3);}'
  ].join(''));

  // ═════════════ Horse Race ═════════════
  var SILK = ['#d62839', '#1f4fbf', '#f2c230', '#1d8a4b', '#ffffff', '#1a1a1a', '#f07c22', '#e85a9a', '#6a3aa2', '#2fb5c9', '#8a1c2b', '#9acd32', '#0d2f6b'];
  var PATS = ['solid', 'sash', 'hoops', 'stripes', 'dots', 'quarters', 'chevron', 'cross', 'diamond'];
  var CLOTH = [['#d42a2a', '#ffffff'], ['#f4f1ea', '#111111'], ['#1f4fbf', '#ffffff'], ['#f2d230', '#111111'], ['#1d8a4b', '#ffffff'], ['#141414', '#f2d230'], ['#f07c22', '#111111'], ['#f29ac0', '#111111']];
  var COATS = ['#7b4423', '#4a2919', '#a9572b', '#2a2426', '#a6a3a6', '#8a4e28'], MANE = ['#1b1210', '#140d0a', '#7d3a18', '#141012', '#e2e0de', '#1b1210'];
  var BT = { W: 'Win', P: 'Place', S: 'Show', EX: 'Exacta', QU: 'Quinella', TRI: 'Trifecta' };
  var uid = 0;
  function silkOf(k) {
    k = String(k || ''); function c(i) { var x = 'abcdefghijklm'.indexOf(k.charAt(i)); return SILK[x < 0 ? i : x]; }
    return { a: c(0), b: c(1), cap: c(2), pat: PATS[+k.charAt(3) || 0] || 'solid', coat: +k.charAt(4) || 0 };
  }
  // jockey silks, drawn like the game's program (a 32x32 shirt with cap)
  function silkG(s) {
    var id = 'czs' + (++uid), b = s.b, pat = '';
    var body = 'M8 9 L12 6 H20 L24 9 L30 14 L27 19 L24 16 V29 H8 V16 L5 19 L2 14 Z';
    switch (s.pat) {
      case 'sash': pat = '<path d="M6 4 L14 4 L30 26 L30 32 L24 32 Z" fill="' + b + '"/>'; break;
      case 'hoops': pat = '<rect x="0" y="11" width="32" height="4" fill="' + b + '"/><rect x="0" y="19" width="32" height="4" fill="' + b + '"/>'; break;
      case 'stripes': pat = '<rect x="10" width="3" height="32" fill="' + b + '"/><rect x="15" width="3" height="32" fill="' + b + '"/><rect x="20" width="3" height="32" fill="' + b + '"/>'; break;
      case 'dots': pat = '<circle cx="12" cy="13" r="1.8" fill="' + b + '"/><circle cx="20" cy="13" r="1.8" fill="' + b + '"/><circle cx="16" cy="19" r="1.8" fill="' + b + '"/><circle cx="12" cy="25" r="1.8" fill="' + b + '"/><circle cx="20" cy="25" r="1.8" fill="' + b + '"/>'; break;
      case 'quarters': pat = '<rect x="16" width="16" height="17" fill="' + b + '"/><rect y="17" width="16" height="16" fill="' + b + '"/>'; break;
      case 'chevron': pat = '<path d="M6 14 L16 22 L26 14 L26 18 L16 26 L6 18 Z" fill="' + b + '"/>'; break;
      case 'cross': pat = '<path d="M6 6 L10 6 L28 30 L24 30 Z M26 6 L22 6 L4 30 L8 30 Z" fill="' + b + '"/>'; break;
      case 'diamond': pat = '<path d="M16 11 L21 18 L16 25 L11 18 Z" fill="' + b + '"/>'; break;
    }
    return '<defs><clipPath id="' + id + '"><path d="' + body + '"/></clipPath></defs><g clip-path="url(#' + id + ')"><rect width="32" height="32" fill="' + s.a + '"/>' + pat +
      '<path d="M8 9 L2 14 L5 19 L8 16 Z M24 9 L30 14 L27 19 L24 16 Z" fill="' + (s.pat === 'solid' ? b : s.a) + '"/></g>' +
      '<path d="' + body + '" fill="none" stroke="rgba(0,0,0,.45)" stroke-width="1"/><circle cx="16" cy="4.6" r="3.4" fill="' + s.cap + '" stroke="rgba(0,0,0,.45)" stroke-width=".8"/>';
  }
  function silkSvg(k) { return '<svg class="cz-silk" viewBox="0 0 32 32" aria-hidden="true">' + silkG(silkOf(k)) + '</svg>'; }
  function cloth(post) { var c = CLOTH[(post - 1) % 8]; return '<span class="cz-cl" style="background:' + c[0] + ';color:' + c[1] + '">' + post + '</span>'; }
  function lengthsText(L) {
    if (L < 0.08) return 'a nose'; if (L < 0.2) return 'a head'; if (L < 0.4) return 'a neck';
    if (L < 0.65) return '½ length'; if (L < 0.9) return '¾ length';
    var h = Math.round(L * 2) / 2, w = Math.floor(h); return (w === 1 && h === w ? '1 length' : w + (h - w ? '½' : '') + ' lengths');
  }
  function shortLen(L) {
    if (L < 0.08) return 'nose'; if (L < 0.2) return 'head'; if (L < 0.4) return 'neck'; if (L < 0.65) return '½'; if (L < 0.9) return '¾';
    var h = Math.round(L * 2) / 2, w = Math.floor(h); return w + (h - w ? '½' : '');
  }
  function clock(secs) { var m = Math.floor(secs / 60), s = secs - m * 60; return m + ':' + (s < 10 ? '0' : '') + s.toFixed(2); }

  // Photo at the wire: each lane by post, horses placed by lengths behind the winner
  function finishPic(x) {
    var F = x.f, n = F.length, order = String(x.o).split('').map(Number), behind = {}, cum = 0;
    order.forEach(function (post, r) { if (r > 0) cum += (x.g && x.g[r - 1]) || 0; behind[post] = cum; });
    var W = 340, lane = 27, top = 16, H = top + n * lane + 8, fin = W - 18, left = 30;
    var span = Math.max(4, cum), ppl = Math.min(34, (fin - 46 - left) / span);
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="The finish">';
    s += '<rect width="' + W + '" height="' + H + '" rx="10" fill="#8a6a45"/>';
    s += '<rect y="' + (top - 4) + '" width="' + W + '" height="' + (n * lane + 6) + '" fill="#a77f52"/>';
    for (var i = 0; i < n; i++) s += '<rect y="' + (top + i * lane - 1) + '" width="' + W + '" height="1" fill="rgba(0,0,0,.12)"/>';
    s += '<rect x="0" y="2" width="' + W + '" height="5" fill="#f4f1ea"/>';   // rail
    for (var px = 6; px < W; px += 24) s += '<rect x="' + px + '" y="2" width="2" height="9" fill="#f4f1ea"/>';
    s += '<rect x="' + fin + '" y="0" width="3" height="' + H + '" fill="#f4f1ea"/><rect x="' + (fin - 1) + '" y="0" width="5" height="' + (top - 4) + '" fill="#d62839"/>';
        F.forEach(function (h, i) {
      var post = i + 1, sk = silkOf(h.k), y = top + i * lane, nose = fin - behind[post] * ppl, x0 = nose - 40, coat = COATS[sk.coat % 6], mane = MANE[sk.coat % 6], cl = CLOTH[i % 8];
      s += '<g transform="translate(' + x0.toFixed(1) + ',' + (y + 1) + ')">';
      s += '<path d="M8 9 Q1 10 3 19" stroke="' + mane + '" stroke-width="2.4" fill="none" stroke-linecap="round"/>';
      s += '<path d="M12 16 L8 24 M15 16 L18 24 M27 16 L31 24 M25 16 L22 24" stroke="' + coat + '" stroke-width="2.2" stroke-linecap="round"/>';
      s += '<ellipse cx="18" cy="12" rx="11" ry="5.5" fill="' + coat + '"/>';
      s += '<path d="M25 10 L34 2 L40 4 L39 7 L35 7 L30 14 Z" fill="' + coat + '"/><path d="M26 9 L34 1.5" stroke="' + mane + '" stroke-width="1.6"/>';
      s += '<rect x="13" y="9" width="8" height="7" rx="1" fill="' + cl[0] + '"/><text x="17" y="13" text-anchor="middle" dominant-baseline="central" font-size="6" font-weight="900" fill="' + cl[1] + '" font-family="system-ui">' + post + '</text>';
      s += '<g transform="translate(15,-5) scale(.42)">' + silkG(sk) + '</g>';
      s += '</g>';
      s += '<rect x="4" y="' + (y + 5) + '" width="18" height="15" rx="3" fill="' + cl[0] + '"/><text x="13" y="' + (y + 12.5) + '" text-anchor="middle" dominant-baseline="central" font-size="10" font-weight="900" fill="' + cl[1] + '" font-family="system-ui">' + post + '</text>';
      var r = order.indexOf(post);
      if (r >= 0 && r < 3) s += '<text x="' + (x0 - 4).toFixed(1) + '" y="' + (y + 13) + '" text-anchor="end" dominant-baseline="central" font-size="9" font-weight="900" fill="' + (r === 0 ? '#ffd54a' : '#fff') + '" font-family="system-ui">' + ['1st', '2nd', '3rd'][r] + '</text>';
    });
    return s + '</svg>';
  }
  function raceBoard(ui, x) {
    var F = x.f, order = String(x.o).split('').map(Number);
    var bd = ui.el('div', { class: 'cz-board' });
    bd.appendChild(ui.el('div', { class: 'top' }, [ui.el('span', { text: 'Official · Race ' + x.r }), ui.el('span', { text: [x.c, x.ck ? clock(x.ck) : ''].filter(Boolean).join(' · ') })]));
    var tb = ui.el('table');
    tb.appendChild(ui.el('tr', null, [ui.el('th', { text: '' }), ui.el('th', { text: 'Horse', style: { 'text-align': 'left', 'padding-left': '4px' } }), ui.el('th', { text: 'Odds' }), ui.el('th', { text: 'Lengths' })]));
    order.forEach(function (post, r) {
      var h = F[post - 1]; if (!h) return;
      var mg = x.g && x.g[r] != null && r < order.length - 1 ? shortLen(x.g[r]) : '';
      if (r === order.length - 1) mg = '';
      tb.appendChild(ui.el('tr', { class: r === 0 ? 'w' : '' }, [
        ui.el('td', { class: 'ps', text: ['1st', '2nd', '3rd'][r] || (r + 1) + 'th' }),
        ui.el('td', { class: 'nm', html: '<span class="cz-nm">' + cloth(post) + silkSvg(h.k) + '<span>' + ui.esc(h.n) + '</span></span>' }),
        ui.el('td', { text: h.o }),
        ui.el('td', { class: 'mg', text: mg })
      ]));
    });
    bd.appendChild(tb);
    var w0 = F[order[0] - 1];
    if (w0 && x.g && x.g[0] != null) bd.appendChild(ui.el('div', { class: 'note', text: w0.n + ' won by ' + lengthsText(x.g[0]) + (x.ph ? ' in a photo finish' : '') + '. Lengths are to the horse behind.' }));
    return ui.el('div', { class: 'cz-wood' }, [bd]);
  }
  function tickets(ui, e, x, many, F) {
    var t = x.t || []; if (!t.length) return ui.el('div', { class: 'cz-sub', text: 'No bets on this race.' });
    var box = ui.el('div', { class: 'cz-tks' });
    t.forEach(function (k) {
      var posts = String(k.s).split('').map(Number), won = k.x > 0;
      var names = F ? posts.map(function (p) { return F[p - 1] ? F[p - 1].n : '#' + p; }) : [];
      var sel = posts.map(function (p) { return cloth(p); }).join(k.b === 'QU' ? ' ' : ' › ');
      var odds = k.b === 'W' && F && F[posts[0] - 1] ? F[posts[0] - 1].o : k.m != null ? (Math.round(k.m * 100) / 100) + ' to 1' : '';
      box.appendChild(ui.el('div', { class: 'cz-tk' }, [
        ui.el('div', { class: 'tx' }, [ui.el('b', { html: (many ? ui.esc(pname(e, k.p)) + ': ' : '') + (BT[k.b] || k.b) + ' ' + sel }),
          ui.el('small', { text: ui.money(k.a) + (odds ? ' at ' + odds : '') + (names.length ? ' · ' + names.join(', ') : '') })]),
        ui.el('span', { class: 'st ' + (won ? 'w' : 'l'), text: won ? 'WINNER' : 'NO' }),
        ui.el('span', { class: 'am' + (won ? ' good' : ''), text: won ? 'paid ' + ui.money(k.x) : '−' + ui.money(k.a).replace('$', '$') })
      ]));
    });
    return box;
  }
  R('horserace', function (e, ui) {
    var d = e.dt; if (!d || !d.races || !d.races.length) return null;
    var many = (e.players || []).length > 1, races = d.races, out = [];
    // session numbers
    var bets = 0, paid = 0, hits = 0, nt = 0;
    races.forEach(function (x) { (x.t || []).forEach(function (k) { bets += k.a; paid += k.x; nt++; if (k.x > 0) hits++; }); });
    if (d.bank) out.push(bankStats(ui, d.bank, e.players && e.players[0] ? e.players[0].score : null, [['Peak', d.bank.hi > d.bank.s ? ui.money(d.bank.hi) : null], ['Bet', nt ? ui.money(bets) : null], ['Winning tickets', nt ? hits + ' of ' + nt : null]]));
    else out.push(ui.stats([['Each started with', d.stake ? ui.money(d.stake) : null], ['Total bet', nt ? ui.money(bets) : null], ['Paid out', nt ? ui.money(paid) : null], ['Winning tickets', nt ? hits + ' of ' + nt : null]]));
    // one race at a time, picked from a row of buttons
    var card = ui.el('div', { class: 'hv' });
    function show(i) {
      var x = races[i]; card.innerHTML = '';
      var head = ui.el('div', { class: 'cz-sub', html: '<b style="color:var(--text)">Race ' + x.r + '</b> · ' + ui.esc(x.w || '') + (x.wo ? ' won at ' + ui.esc(x.wo) : '') + (x.n && !many && x.n[0] != null ? ' · ' + signed(x.n[0]) : '') });
      card.appendChild(head);
      if (x.f && x.f.length) {
        card.appendChild(ui.picture(finishPic(x), { max: 360 }));
        card.appendChild(raceBoard(ui, x));
      } else {
        card.appendChild(ui.el('div', { class: 'cz-sub', html: 'Finish: ' + String(x.o || '').split('').slice(0, 3).map(function (p) { return cloth(+p); }).join(' › ') }));
      }
      if (x.t) card.appendChild(ui.section(many ? 'Tickets' : 'Your tickets', tickets(ui, e, x, many, x.f)));
    }
    var last = races.length - 1, start = last;
    var pk = picker(ui, races.map(function (x) { return 'Race ' + x.r; }), start, show);
    out.push(ui.section('The races', [pk.node, card], { icon: 'flag' }));
    pk.set(start);
    return ui.wrap(out);
  });

  // ═════════════ table helpers ═════════════
  var FELT = { blackjack: ['#156b45', '#0c4a2f'], baccarat: ['#7a1f2a', '#3c0c12'], roulette: ['#156b45', '#083721'], craps: ['#156b45', '#083721'],
    poker: ['#24407a', '#0e1d3f'], threecardpoker: ['#0f6a6a', '#063434'], paigow: ['#7a1f2a', '#3c0c12'] };
  function felt(ui, game, kids) {
    var f = FELT[game] || FELT.blackjack;
    return ui.el('div', { class: 'cz-felt', style: { background: 'radial-gradient(120% 120% at 50% 0%,' + f[0] + ',' + f[1] + ')' } }, [].concat(kids).filter(Boolean));
  }
  function codes(s) { return Array.isArray(s) ? s : String(s || '').split(' ').filter(Boolean); }
  // cards row that also knows the Pai Gow joker ('JK')
  function cardRow(ui, list, o) {
    list = codes(list); o = o || {};
    if (list.indexOf('JK') < 0) return ui.cards(list, o);
    var row = ui.el('div', { class: 'hv-cards sm' });
    list.forEach(function (c) { row.appendChild(c === 'JK' ? ui.el('div', { class: 'pcard cz-joker', html: '<span>JOKER</span>', 'aria-label': 'Joker' }) : ui.cards([c]).firstChild); });
    return row;
  }
  // one labelled line on the felt: label, cards, note on the right
  function line(ui, label, list, note, noteCls, o) {
    return ui.el('div', { class: 'cz-line' }, [ui.el('div', { class: 'lab', text: label }), ui.el('div', { class: 'cz-hand' }, [cardRow(ui, list, o),
      note ? ui.el('span', { class: 'cz-res ' + (noteCls || ''), text: note }) : null])]);
  }
  // a strip of small squares, one per hand/spin, tap one to show it
  function road(ui, items, start, show) {
    var box = ui.el('div', { class: 'cz-road' }), btns = [];
    items.forEach(function (it, i) {
      var b = ui.el('button', { type: 'button', class: 'cz-rb ' + (it.c || ''), text: it.t || '', title: it.title || '', 'aria-label': it.title || it.t || String(i + 1), onclick: function () { pick(i); } });
      btns.push(b); box.appendChild(b);
    });
    function pick(i) { btns.forEach(function (b, j) { b.classList.toggle('on', i === j); }); show(i); }
    if (items.length) pick(start);
    return box;
  }
  function mini(v, s) {
    s = s || 16; var P = { 1: [[.5, .5]], 2: [[.27, .27], [.73, .73]], 3: [[.27, .27], [.5, .5], [.73, .73]], 4: [[.27, .27], [.73, .27], [.27, .73], [.73, .73]], 5: [[.27, .27], [.73, .27], [.5, .5], [.27, .73], [.73, .73]], 6: [[.27, .25], [.73, .25], [.27, .5], [.73, .5], [.27, .75], [.73, .75]] }[v] || [];
    return '<svg width="' + s + '" height="' + s + '" viewBox="0 0 20 20" aria-hidden="true"><rect x=".5" y=".5" width="19" height="19" rx="4" fill="#f7f3ea" stroke="rgba(0,0,0,.35)"/>' +
      P.map(function (p) { return '<circle cx="' + p[0] * 20 + '" cy="' + p[1] * 20 + '" r="2.1" fill="' + (v === 1 ? '#c8102e' : '#1b1b1b') + '"/>'; }).join('') + '</svg>';
  }
  HistView.css('hv-casino2', [
    '.cz-line{display:flex;flex-direction:column;gap:4px;}',
    '.cz-line .lab{font-size:.66rem;font-weight:900;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.65);}',
    '.cz-felt .hv-cards{--cw:40px;}',
    '.cz-joker{display:grid;place-items:center;background:#fffdf6;color:#b8862a;font-weight:900;font-size:calc(var(--cw) * .2);letter-spacing:.04em;writing-mode:vertical-rl;}',
    '.cz-road{display:flex;flex-wrap:wrap;gap:3px;}',
    '.cz-rb{appearance:none;border:0;cursor:pointer;width:22px;height:22px;border-radius:5px;padding:0;font:inherit;font-size:.62rem;font-weight:900;color:#fff;background:rgba(255,255,255,.12);}',
    '.cz-rb.w{background:#16a34a;}.cz-rb.l{background:#b91c1c;}.cz-rb.p{background:#6b7280;}.cz-rb.big{background:#d4a017;color:#1b1404;}',
    '.cz-rb.on{outline:2.5px solid #fff;outline-offset:1px;}',
    '.cz-kv{display:flex;flex-wrap:wrap;gap:4px 12px;font-size:.78rem;font-weight:800;color:rgba(255,255,255,.8);}',
    '.cz-kv b{color:#fff;}',
    '.cz-ball{display:inline-grid;place-items:center;width:26px;height:26px;border-radius:50%;font-size:.74rem;font-weight:900;color:#fff;box-shadow:inset 0 -2px 0 rgba(0,0,0,.3);}',
    '.cz-ball.red{background:#c8102e;}.cz-ball.black{background:#1b1b1f;box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.25);}.cz-ball.green{background:#15803d;}',
    '.cz-ball.lg{width:54px;height:54px;font-size:1.4rem;}',
    '.cz-marq{display:flex;flex-wrap:wrap;gap:4px;padding:10px;border-radius:12px;background:linear-gradient(#141218,#0b0a0e);box-shadow:inset 0 2px 10px rgba(0,0,0,.9);}',
    '.cz-bets{width:100%;border-collapse:collapse;font-size:.82rem;font-variant-numeric:tabular-nums;}',
    '.cz-bets td{padding:4px 2px;border-top:1px solid rgba(255,255,255,.12);font-weight:800;color:#fff;}',
    '.cz-bets td:not(:first-child){text-align:right;white-space:nowrap;}',
    '.cz-bets td.good{color:#86efac;}.cz-bets td.dim{color:rgba(255,255,255,.55);}',
    '.cz-reels{align-self:center;width:100%;max-width:340px;border-radius:16px;padding:10px;background:linear-gradient(180deg,#8a1020,#4a0710);box-shadow:inset 0 0 0 3px #d4a017,0 6px 16px -6px rgba(0,0,0,.6);line-height:0;}',
    '.cz-reels svg{width:100%;height:auto;display:block;}',
    '.cz-shoot{display:flex;flex-direction:column;gap:5px;}',
    '.cz-sh{display:flex;flex-direction:column;gap:4px;padding:8px 9px;border-radius:10px;background:rgba(0,0,0,.18);}',
    '.cz-sh .hd{display:flex;justify-content:space-between;gap:8px;font-size:.76rem;font-weight:900;color:rgba(255,255,255,.85);}',
    '.cz-rolls{display:flex;flex-wrap:wrap;gap:4px;}',
    '.cz-roll{display:flex;gap:1px;padding:2px;border-radius:5px;line-height:0;}',
    '.cz-roll.P{background:#f2c230;}.cz-roll.M{background:#22c55e;}.cz-roll.S{background:#ef4444;}.cz-roll.N{background:rgba(134,239,172,.55);}.cz-roll.C{background:rgba(252,165,165,.55);}',
    '.cz-bead{align-self:flex-start;max-width:100%;overflow-x:auto;border-radius:8px;background:#fbfaf6;padding:4px;line-height:0;}',
    '.cz-vs{display:grid;grid-template-columns:1fr 1fr;gap:10px;}',
    '.cz-vs .side{display:flex;flex-direction:column;gap:4px;}',
    '.cz-vs .tot{font-size:1.6rem;font-weight:900;line-height:1;}',
    '.cz-vs .side.win .tot{color:#ffd54a;}',
    '.cz-list{display:flex;flex-direction:column;gap:6px;}',
    '.cz-row{display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:10px;background:rgba(255,255,255,.05);}',
    '.cz-row .hv-cards{--cw:30px;flex:none;}',
    '.cz-row .tx{flex:1;min-width:0;display:flex;flex-direction:column;font-size:.8rem;font-weight:800;}',
    '.cz-row .tx small{color:var(--text-3);font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
    '.cz-row .am{font-weight:900;font-variant-numeric:tabular-nums;font-size:.86rem;}',
    '.cz-row .am.good{color:#4ade80;}.cz-row .am.bad{color:#f87171;}',
    '.cz-held .pcard{opacity:.45;}.cz-held .pcard.hv-hl{opacity:1;outline:none;box-shadow:0 0 0 2.5px #ffd54a;}',
    '.cz-arrow{font-size:.7rem;font-weight:900;color:rgba(255,255,255,.6);letter-spacing:.1em;text-transform:uppercase;}'
  ].join(''));

  // ═════════════ Blackjack ═════════════
  function bjTot(list) {
    var t = 0, a = 0; codes(list).forEach(function (c) { var r = c.slice(0, -1); if (r === 'A') { a++; t += 11; } else t += /^[JQK]$/.test(r) || r === '10' ? 10 : +r; });
    while (t > 21 && a) { t -= 10; a--; }
    return { t: t, soft: a > 0 };
  }
  var BJRES = { win: 'Win', lose: 'Lose', push: 'Push', bj: 'Blackjack', even: 'Even money', surr: 'Surrender', bust: 'Bust' };
  R('blackjack', function (e, ui) {
    var d = e.dt; if (!d || !d.hands || !d.hands.length) return null;
    var out = [], hands = d.hands, many = (e.players || []).length > 1;
    out.push(bankStats(ui, d.bank, e.players && e.players[0] ? e.players[0].score : null, [['Hands', d.n || hands.length]]));
    var best = 0; hands.forEach(function (h, i) { var n = mineNet(h); if (n > mineNet(hands[best])) best = i; });
    function mineNet(h) { var n = 0, any = false; h.h.forEach(function (x) { if (x.s === 0) { n += x.n || 0; any = true; } }); return any ? n : null; }
    var card = ui.el('div', { class: 'hv' });
    function show(i) {
      var h = hands[i], dt = bjTot(h.d), kids = [];
      kids.push(ui.el('div', { class: 'cz-kv', html: '<span><b>Hand ' + h.i + '</b></span>' + (i === best && mineNet(h) > 0 ? '<span>biggest win</span>' : '') }));
      kids.push(line(ui, 'Dealer', h.d, codes(h.d).length === 2 && dt.t === 21 ? 'Blackjack' : dt.t > 21 ? 'Bust ' + dt.t : String(dt.t)));
      h.h.forEach(function (x) {
        var t = bjTot(x.c), tags = []; if (x.f && x.f.indexOf('S') >= 0) tags.push('split'); if (x.f && x.f.indexOf('D') >= 0) tags.push('doubled'); if (x.f && x.f.indexOf('I') >= 0) tags.push('insured');
        var lab = (many ? pname(e, x.s) : 'You') + ' · ' + ui.money(x.b) + (tags.length ? ' · ' + tags.join(', ') : '') + ' · ' + (t.t > 21 ? 'bust' : t.t);
        kids.push(line(ui, lab, x.c, (BJRES[x.r] || x.r || '') + ' ' + signed(x.n), cls(x.n)));
      });
      card.innerHTML = ''; card.appendChild(felt(ui, 'blackjack', kids));
    }
    var items = hands.map(function (h, i) { var n = mineNet(h); if (n == null) n = h.h.reduce(function (a, x) { return a + (x.n || 0); }, 0); return { c: i === best && n > 0 ? 'big' : n > 0 ? 'w' : n < 0 ? 'l' : 'p', t: String(h.i), title: 'Hand ' + h.i + ' ' + signed(n) }; });
    out.push(ui.section(hands.length < (d.n || 0) ? 'Last ' + hands.length + ' hands · tap one' : 'Every hand · tap one', [road(ui, items, best, show), card], { icon: 'cards' }));
    return ui.wrap(out);
  });

  // ═════════════ Poker ═════════════
  function tableHand(ui, e, x, title) {
    var kids = [ui.el('div', { class: 'cz-kv', html: '<span><b>' + ui.esc(title) + '</b></span><span>hand ' + x.no + '</span><span>pot <b>' + ui.money(x.pot) + '</b></span>' })];
    if (x.b && x.b.length) kids.push(line(ui, 'Board', x.b, null, null, { small: false }));
    (x.p || []).forEach(function (p) {
      var lab = pname(e, p.i) + (p.win ? ' · won' : p.f ? ' · folded' : '') + (p.h ? ' · ' + p.h : '');
      kids.push(line(ui, lab, p.c && p.c.length ? p.c : ['??', '??'], signed(p.w), cls(p.w), p.win ? { hl: p.c } : null));
    });
    if (x.fold) kids.push(ui.el('div', { class: 'cz-kv', text: 'Everyone else folded.' }));
    return felt(ui, 'poker', kids);
  }
  R('poker', function (e, ui) {
    var d = e.dt; if (!d) return null;
    var out = [];
    if (d.vp) {
      var net = (d.paid || 0) - (d.bet || 0);
      out.push(bankStats(ui, d.bank, net, [['Hands', d.hands], ['Winning hands', d.hands ? d.wins + ' of ' + d.hands : null], ['Coin', d.denom ? ui.money(d.denom) : null]]));
      var bars = []; (d.rows || []).forEach(function (n, r) { if (n) bars.push({ label: (d.names || [])[r] || '', value: n, color: r <= 2 ? '#d4a017' : '#4a7bd6' }); });
      if (bars.length) out.push(ui.section('Paying hands', ui.bars(bars), { icon: 'chart' }));
      function vpHand(x, title) {
        var held = []; String(x.k || '').split('').forEach(function (k, i) { if (k === '1') held.push(x.d[i]); });
        var dealt = ui.cards(x.d, { hl: held }); dealt.classList.add('cz-held');
        var nm = x.r >= 0 && d.names ? d.names[x.r] : 'No win';
        return felt(ui, 'poker', [ui.el('div', { class: 'cz-kv', html: '<span><b>' + ui.esc(title) + '</b></span><span>hand ' + x.no + '</span>' }),
          ui.el('div', { class: 'cz-line' }, [ui.el('div', { class: 'lab', text: 'Dealt · held cards lit' }), dealt]),
          line(ui, 'After the draw · ' + nm, x.c, x.p ? 'paid ' + ui.money(x.p) : 'no win', x.p ? 'good' : '')]);
      }
      if (d.best) out.push(ui.section('Best hand', vpHand(d.best, d.names ? d.names[d.best.r] : 'Best hand'), { icon: 'trophy' }));
      var last = (d.last || []).filter(function (x) { return !d.best || x.no !== d.best.no; }).slice(-6).reverse();
      if (last.length) out.push(ui.section('Last hands', ui.el('div', { class: 'cz-list' }, last.map(function (x) {
        return ui.el('div', { class: 'cz-row' }, [ui.cards(x.c), ui.el('div', { class: 'tx' }, [ui.el('span', { text: x.r >= 0 && d.names ? d.names[x.r] : 'No win' }), ui.el('small', { text: 'Hand ' + x.no + ' · bet ' + ui.money(x.b) })]),
          ui.el('span', { class: 'am ' + (x.p - x.b > 0 ? 'good' : x.p - x.b < 0 ? 'bad' : ''), text: signed(x.p - x.b) })]);
      }))));
      return ui.wrap(out);
    }
    if (d.bank) out.push(ui.stats([['Bought in', ui.money(d.bank.s)], ['Left with', ui.money(d.bank.e)], ['Hands', d.hands]]));
    else out.push(ui.stats([['Hands', d.hands], ['Game', d.game === 'omaha' ? 'Omaha' : "Hold'em"]]));
    if (d.big) out.push(ui.section('Biggest pot', tableHand(ui, e, d.big, ui.money(d.big.pot) + ' pot'), { icon: 'coins' }));
    if (d.best) out.push(ui.section('Best hand shown', tableHand(ui, e, d.best, 'Best hand'), { icon: 'trophy' }));
    if (d.last) out.push(ui.section('Last hand', tableHand(ui, e, d.last, 'Last hand'), { icon: 'cards' }));
    return ui.wrap(out);
  });

  // ═════════════ Roulette ═════════════
  var REDS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
  function rcol(n) { return n === '0' || n === '00' ? 'green' : REDS.indexOf(+n) >= 0 ? 'red' : 'black'; }
  function ball(ui, n, lg) { return ui.el('span', { class: 'cz-ball ' + rcol(String(n)) + (lg ? ' lg' : ''), text: String(n) }); }
  function spinCard(ui, x, title) {
    var rows = (x.b || []).map(function (b) { return ui.el('tr', null, [ui.el('td', { text: b.t }), ui.el('td', { class: 'dim', text: ui.money(b.a) }), ui.el('td', { class: b.p ? 'good' : 'dim', text: b.p ? 'paid ' + ui.money(b.p) : 'lost' })]); });
    return felt(ui, 'roulette', [ui.el('div', { class: 'cz-hand' }, [ball(ui, x.n, true), ui.el('div', { class: 'cz-kv', html: '<span><b>' + ui.esc(title) + '</b></span><span>spin ' + x.no + '</span><span>' + ui.esc(rcol(x.n)) + '</span>' }),
      ui.el('span', { class: 'cz-res ' + cls(x.r - x.s), text: signed(x.r - x.s) })]), rows.length ? ui.el('table', { class: 'cz-bets' }, rows) : null]);
  }
  R('roulette', function (e, ui) {
    var d = e.dt; if (!d) return null;
    var out = [], log = d.log || [];
    out.push(bankStats(ui, d.bank, e.players && e.players[0] ? e.players[0].score : null, [['Spins', d.spins], ['Bet', d.bet ? ui.money(d.bet) : null], ['Peak', d.bank && d.bank.hi > d.bank.s ? ui.money(d.bank.hi) : null]]));
    if (log.length) {
      var c = { red: 0, black: 0, green: 0 }, cnt = {}; log.forEach(function (x) { c[rcol(x.n)]++; cnt[x.n] = (cnt[x.n] || 0) + 1; });
      out.push(ui.section(log.length < d.spins ? 'Last ' + log.length + ' spins' : 'Every spin', [ui.el('div', { class: 'cz-marq' }, log.map(function (x) { var b = ball(ui, x.n); if (x.r > x.s) b.style.boxShadow = '0 0 0 2px #ffd54a'; b.title = 'Bet ' + ui.money(x.s) + ', ' + signed(x.r - x.s); return b; })),
        ui.el('div', { class: 'cz-sub', text: 'Gold ring: a winning spin.' }),
        ui.bars([{ label: 'Red', value: c.red, color: '#c8102e' }, { label: 'Black', value: c.black, color: '#3a3a44' }, { label: 'Green', value: c.green, color: '#15803d' }])], { icon: 'target' }));
      var hot = Object.keys(cnt).filter(function (k) { return cnt[k] >= 2; }).sort(function (a, b) { return cnt[b] - cnt[a]; }).slice(0, 5);
      if (hot.length) out.push(ui.section('Hot numbers', ui.el('div', { class: 'cz-hand' }, hot.map(function (k) { return ui.el('span', { class: 'cz-hand' }, [ball(ui, k), ui.el('span', { class: 'cz-sub', text: '×' + cnt[k] })]); }))));
    }
    if (d.best) out.push(ui.section('Biggest win', spinCard(ui, d.best, 'Best spin'), { icon: 'trophy' }));
    if (d.last) out.push(ui.section('Last spin', spinCard(ui, d.last, 'Last spin')));
    return ui.wrap(out);
  });

  // ═════════════ Slots ═════════════
  var SLOT_SPRITE = "<defs><radialGradient id=\"czg-cherry\" cx=\".35\" cy=\".3\" r=\".75\"><stop offset=\"0\" stop-color=\"#ff8a94\"/><stop offset=\".5\" stop-color=\"#d4142c\"/><stop offset=\"1\" stop-color=\"#6e0412\"/></radialGradient><linearGradient id=\"czg-leaf\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"><stop offset=\"0\" stop-color=\"#7cc444\"/><stop offset=\"1\" stop-color=\"#2e7a1c\"/></linearGradient><linearGradient id=\"czg-bar\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0\" stop-color=\"#3a3a40\"/><stop offset=\".5\" stop-color=\"#121216\"/><stop offset=\"1\" stop-color=\"#000\"/></linearGradient><linearGradient id=\"czg-seven\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0\" stop-color=\"#ff6a6a\"/><stop offset=\".5\" stop-color=\"#d10f22\"/><stop offset=\"1\" stop-color=\"#7a0612\"/></linearGradient><linearGradient id=\"czg-gold\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"><stop offset=\"0\" stop-color=\"#fff3b0\"/><stop offset=\".45\" stop-color=\"#f4c430\"/><stop offset=\"1\" stop-color=\"#a9740c\"/></linearGradient><linearGradient id=\"czg-gem\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0\" stop-color=\"#b8ecff\"/><stop offset=\".45\" stop-color=\"#3b9be6\"/><stop offset=\"1\" stop-color=\"#0c4a96\"/></linearGradient><radialGradient id=\"czg-plum\" cx=\".35\" cy=\".3\" r=\".8\"><stop offset=\"0\" stop-color=\"#c58cff\"/><stop offset=\".5\" stop-color=\"#6a2bb8\"/><stop offset=\"1\" stop-color=\"#2d0b5c\"/></radialGradient><radialGradient id=\"czg-orange\" cx=\".35\" cy=\".3\" r=\".8\"><stop offset=\"0\" stop-color=\"#ffd08a\"/><stop offset=\".5\" stop-color=\"#ff8a1e\"/><stop offset=\"1\" stop-color=\"#b44a00\"/></radialGradient><radialGradient id=\"czg-lemon\" cx=\".35\" cy=\".3\" r=\".85\"><stop offset=\"0\" stop-color=\"#fffbd0\"/><stop offset=\".5\" stop-color=\"#ffe03a\"/><stop offset=\"1\" stop-color=\"#c9a000\"/></radialGradient></defs><symbol id=\"czsy-CH\" viewBox=\"0 0 100 100\"><path d=\"M31 64 Q38 36 63 15\" fill=\"none\" stroke=\"#2f6b1c\" stroke-width=\"4.5\" stroke-linecap=\"round\"/><path d=\"M70 60 Q66 36 63 15\" fill=\"none\" stroke=\"#2f6b1c\" stroke-width=\"4.5\" stroke-linecap=\"round\"/><path d=\"M63 15 Q78 3 93 13 Q80 26 63 15Z\" fill=\"url(#czg-leaf)\"/><circle cx=\"30\" cy=\"70\" r=\"18\" fill=\"url(#czg-cherry)\"/><circle cx=\"70\" cy=\"65\" r=\"18\" fill=\"url(#czg-cherry)\"/><ellipse cx=\"23\" cy=\"62\" rx=\"5\" ry=\"3\" fill=\"#fff\" opacity=\".7\" transform=\"rotate(-35 23 62)\"/><ellipse cx=\"63\" cy=\"57\" rx=\"5\" ry=\"3\" fill=\"#fff\" opacity=\".7\" transform=\"rotate(-35 63 57)\"/></symbol><symbol id=\"czsy-B1\" viewBox=\"0 0 100 100\"><rect x=\"8\" y=\"35\" width=\"84\" height=\"30\" rx=\"7\" fill=\"url(#czg-bar)\" stroke=\"#e0ad2a\" stroke-width=\"3\"/><text x=\"50\" y=\"57.5\" text-anchor=\"middle\" font-family=\"Arial Black,Arial,Helvetica,sans-serif\" font-weight=\"900\" font-size=\"20\" fill=\"#fff\" letter-spacing=\"3\">BAR</text></symbol><symbol id=\"czsy-B2\" viewBox=\"0 0 100 100\"><rect x=\"8\" y=\"20\" width=\"84\" height=\"27\" rx=\"6\" fill=\"url(#czg-bar)\" stroke=\"#e0ad2a\" stroke-width=\"3\"/><rect x=\"8\" y=\"53\" width=\"84\" height=\"27\" rx=\"6\" fill=\"url(#czg-bar)\" stroke=\"#e0ad2a\" stroke-width=\"3\"/><text x=\"50\" y=\"40\" text-anchor=\"middle\" font-family=\"Arial Black,Arial,Helvetica,sans-serif\" font-weight=\"900\" font-size=\"18\" fill=\"#fff\" letter-spacing=\"3\">BAR</text><text x=\"50\" y=\"73\" text-anchor=\"middle\" font-family=\"Arial Black,Arial,Helvetica,sans-serif\" font-weight=\"900\" font-size=\"18\" fill=\"#fff\" letter-spacing=\"3\">BAR</text></symbol><symbol id=\"czsy-B3\" viewBox=\"0 0 100 100\"><rect x=\"8\" y=\"8\" width=\"84\" height=\"25\" rx=\"6\" fill=\"url(#czg-bar)\" stroke=\"#e0ad2a\" stroke-width=\"3\"/><rect x=\"8\" y=\"38\" width=\"84\" height=\"25\" rx=\"6\" fill=\"url(#czg-bar)\" stroke=\"#e0ad2a\" stroke-width=\"3\"/><rect x=\"8\" y=\"68\" width=\"84\" height=\"25\" rx=\"6\" fill=\"url(#czg-bar)\" stroke=\"#e0ad2a\" stroke-width=\"3\"/><text x=\"50\" y=\"26.5\" text-anchor=\"middle\" font-family=\"Arial Black,Arial,Helvetica,sans-serif\" font-weight=\"900\" font-size=\"16\" fill=\"#fff\" letter-spacing=\"3\">BAR</text><text x=\"50\" y=\"56.5\" text-anchor=\"middle\" font-family=\"Arial Black,Arial,Helvetica,sans-serif\" font-weight=\"900\" font-size=\"16\" fill=\"#fff\" letter-spacing=\"3\">BAR</text><text x=\"50\" y=\"86.5\" text-anchor=\"middle\" font-family=\"Arial Black,Arial,Helvetica,sans-serif\" font-weight=\"900\" font-size=\"16\" fill=\"#fff\" letter-spacing=\"3\">BAR</text></symbol><symbol id=\"czsy-S7\" viewBox=\"0 0 100 100\"><path d=\"M19 13 H83 V27 C67 44 57 63 53 89 H31 C34 66 44 47 59 31 H19 Z\" fill=\"url(#czg-seven)\" stroke=\"#f3c341\" stroke-width=\"4.5\" stroke-linejoin=\"round\"/><path d=\"M24 17 H78 V21 H24 Z\" fill=\"#fff\" opacity=\".35\"/><path d=\"M60 35 C50 48 43 62 40 80\" fill=\"none\" stroke=\"#fff\" stroke-width=\"3\" stroke-linecap=\"round\" opacity=\".25\"/></symbol><symbol id=\"czsy-BE\" viewBox=\"0 0 100 100\"><path d=\"M50 10c-4 0-7 3-7 7v2C30 23 26 37 26 51c0 11-4 17-11 22h70c-7-5-11-11-11-22 0-14-4-28-17-32v-2c0-4-3-7-7-7z\" fill=\"url(#czg-gold)\" stroke=\"#8a5a00\" stroke-width=\"2.5\"/><rect x=\"12\" y=\"71\" width=\"76\" height=\"10\" rx=\"5\" fill=\"url(#czg-gold)\" stroke=\"#8a5a00\" stroke-width=\"2.5\"/><circle cx=\"50\" cy=\"87\" r=\"7.5\" fill=\"url(#czg-gold)\" stroke=\"#8a5a00\" stroke-width=\"2.5\"/><path d=\"M36 30c-4 6-5 14-5 22\" stroke=\"#fff8d8\" stroke-width=\"4.5\" fill=\"none\" stroke-linecap=\"round\" opacity=\".75\"/></symbol><symbol id=\"czsy-D\" viewBox=\"0 0 100 100\"><polygon points=\"50,90 6,37 25,14 75,14 94,37\" fill=\"url(#czg-gem)\" stroke=\"#0a3f78\" stroke-width=\"3\" stroke-linejoin=\"round\"/><polygon points=\"6,37 94,37 75,14 25,14\" fill=\"#d6f3ff\" opacity=\".45\"/><polygon points=\"25,14 37,37 50,14\" fill=\"#fff\" opacity=\".6\"/><polygon points=\"50,14 63,37 75,14\" fill=\"#fff\" opacity=\".3\"/><polygon points=\"37,37 50,90 63,37\" fill=\"#fff\" opacity=\".22\"/><polyline points=\"6,37 25,14 37,37 50,14 63,37 75,14 94,37\" fill=\"none\" stroke=\"#0a3f78\" stroke-width=\"1.6\" opacity=\".55\"/><polyline points=\"37,37 50,90 63,37\" fill=\"none\" stroke=\"#0a3f78\" stroke-width=\"1.6\" opacity=\".45\"/><path d=\"M80 6l2.4 5.6L88 14l-5.6 2.4L80 22l-2.4-5.6L72 14l5.6-2.4z\" fill=\"#fff\"/></symbol><symbol id=\"czsy-W\" viewBox=\"0 0 100 100\"><use href=\"#czsy-D\"/></symbol><symbol id=\"czsy-PL\" viewBox=\"0 0 100 100\"><path d=\"M52 22 Q54 12 60 8\" fill=\"none\" stroke=\"#5a3a1a\" stroke-width=\"4\" stroke-linecap=\"round\"/><path d=\"M56 16 Q72 6 84 16 Q70 26 56 16Z\" fill=\"url(#czg-leaf)\"/><ellipse cx=\"50\" cy=\"57\" rx=\"31\" ry=\"34\" fill=\"url(#czg-plum)\"/><path d=\"M50 26 Q42 56 50 90\" fill=\"none\" stroke=\"#2a0a50\" stroke-width=\"2\" opacity=\".45\"/><ellipse cx=\"36\" cy=\"43\" rx=\"7\" ry=\"4\" fill=\"#fff\" opacity=\".55\" transform=\"rotate(-40 36 43)\"/></symbol><symbol id=\"czsy-OR\" viewBox=\"0 0 100 100\"><circle cx=\"50\" cy=\"55\" r=\"34\" fill=\"url(#czg-orange)\"/><g fill=\"#b85200\" opacity=\".28\"><circle cx=\"40\" cy=\"62\" r=\"1.6\"/><circle cx=\"58\" cy=\"70\" r=\"1.6\"/><circle cx=\"66\" cy=\"50\" r=\"1.6\"/><circle cx=\"48\" cy=\"78\" r=\"1.6\"/><circle cx=\"72\" cy=\"66\" r=\"1.6\"/><circle cx=\"30\" cy=\"54\" r=\"1.6\"/></g><path d=\"M50 22 Q60 6 78 12 Q68 26 50 22Z\" fill=\"url(#czg-leaf)\"/><circle cx=\"50\" cy=\"22\" r=\"3\" fill=\"#5a3a1a\"/><ellipse cx=\"36\" cy=\"40\" rx=\"7\" ry=\"4\" fill=\"#fff\" opacity=\".55\" transform=\"rotate(-40 36 40)\"/></symbol><symbol id=\"czsy-LE\" viewBox=\"0 0 100 100\"><path d=\"M7 52 Q10 47 15 46 C20 26 40 20 50 20 C60 20 80 26 85 46 Q90 47 93 52 Q90 57 85 58 C80 78 60 84 50 84 C40 84 20 78 15 58 Q10 57 7 52Z\" fill=\"url(#czg-lemon)\" stroke=\"#b08a00\" stroke-width=\"2\"/><ellipse cx=\"36\" cy=\"38\" rx=\"9\" ry=\"4\" fill=\"#fff\" opacity=\".6\" transform=\"rotate(-20 36 38)\"/></symbol>";
  var SLOT_NAMES = { classic: 'Diamond Sevens', five: 'Royal Fruits' }, LINE_COLORS = ['#ffd45a', '#ff5c9a', '#4da3ff', '#3ddc84', '#ff8a3d', '#b89bff', '#2fd3c0', '#ff4d5e', '#e8e8f0', '#c6e14a'];
  var SNAME = { D: 'Diamond', W: 'Diamond', S7: 'Seven', B3: 'Triple Bar', B2: 'Double Bar', B1: 'Bar', BE: 'Bell', CH: 'Cherry', PL: 'Plum', OR: 'Orange', LE: 'Lemon' };
  function spriteOnce() {
    if (document.getElementById('cz-slot-sprite')) return;
    var d = document.createElement('div'); d.id = 'cz-slot-sprite'; d.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
    d.innerHTML = '<svg width="0" height="0" aria-hidden="true" focusable="false">' + SLOT_SPRITE + '</svg>'; document.body.appendChild(d);
  }
  function reelsPic(x) {
    spriteOnce();
    var rows = (x.g || []).map(function (r) { return String(r).split(','); }), n = rows[0] ? rows[0].length : 3;
    var cs = 100, gap = 6, W = n * cs + (n - 1) * gap, H = 3 * cs;
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="The reels">';
    for (var c = 0; c < n; c++) s += '<rect x="' + c * (cs + gap) + '" y="0" width="' + cs + '" height="' + H + '" rx="10" fill="#fbf8f0"/>';
    var lit = {}; (x.w || []).forEach(function (w) { String(w.l).split('').forEach(function (r, i) { if (String(w.c).indexOf(String(i)) >= 0) lit[r + ',' + i] = 1; }); });
    rows.forEach(function (row, r) { row.forEach(function (k, c) {
      var px = c * (cs + gap), py = r * cs;
      if (lit[r + ',' + c]) s += '<rect x="' + (px + 3) + '" y="' + (py + 3) + '" width="' + (cs - 6) + '" height="' + (cs - 6) + '" rx="10" fill="#fff1b8"/>';
      if (k && k !== '_') s += '<use href="#czsy-' + k + '" x="' + (px + 12) + '" y="' + (py + 12) + '" width="' + (cs - 24) + '" height="' + (cs - 24) + '"/>';
    }); });
    (x.w || []).forEach(function (w, i) {
      var pts = String(w.l).split('').map(function (r, c) { return (c * (cs + gap) + cs / 2) + ',' + (+r * cs + cs / 2); }).join(' ');
      s += '<polyline points="' + pts + '" fill="none" stroke="' + LINE_COLORS[(w.li != null ? w.li : i) % 10] + '" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" opacity=".85"/>';
    });
    return s + '</svg>';
  }
  function spinShot(ui, x, title) {
    var kids = [ui.el('div', { class: 'cz-reels', html: reelsPic(x) })];
    kids.push(ui.el('div', { class: 'cz-sub', html: '<b style="color:var(--text)">' + ui.esc(title) + '</b> · spin ' + x.no + ' · bet ' + ui.money(x.tb) + (x.ln ? ' on ' + x.ln + ' line' + (x.ln === 1 ? '' : 's') : '') + (x.a ? ' · paid <b style="color:#4ade80">' + ui.money(x.a) + '</b>' : ' · no win') }));
    if (x.w && x.w.length) kids.push(ui.log(x.w.map(function (w, i) { return { t: w.t + ' · ' + ui.money(w.a), c: LINE_COLORS[(w.li != null ? w.li : i) % 10] }; })));
    return ui.wrap(kids);
  }
  R('slots', function (e, ui) {
    var d = e.dt; if (!d) return null;
    var out = [], net = (d.won || 0) - (d.bet || 0);
    out.push(bankStats(ui, d.bank, net, [['Machine', SLOT_NAMES[d.m] || null], ['Spins', d.spins], ['Winning spins', d.spins ? d.hits + ' of ' + d.spins : null]]));
    if (d.big) out.push(ui.section('Biggest win', spinShot(ui, d.big, ui.money(d.big.a) + ' win'), { icon: 'trophy' }));
    if (d.last) out.push(ui.section('Last spin', spinShot(ui, d.last, 'Last spin')));
    var cb = d.combos ? Object.keys(d.combos).filter(function (k) { return d.combos[k]; }).sort(function (a, b) { return d.combos[b] - d.combos[a]; }) : [];
    if (cb.length) out.push(ui.section('What lined up', ui.chips(cb.slice(0, 12).map(function (k) {
      var m = /^([A-Z]+?\d?)(\d)$/.exec(k), nm = k === 'DD' ? 'Two Diamonds' : k === 'DDD' ? 'Three Diamonds' : k === 'ANYBAR' ? 'Any three bars' : m && SNAME[m[1]] ? m[2] + ' × ' + SNAME[m[1]] : k;
      return nm + ' · ' + d.combos[k];
    }))));
    return ui.wrap(out);
  });

  // ═════════════ Craps ═════════════
  R('craps', function (e, ui) {
    var d = e.dt; if (!d) return null;
    var out = [];
    out.push(bankStats(ui, d.bank, e.players && e.players[0] ? e.players[0].score : null, [['Rolls', d.rolls], ['Points made', d.made], ['Seven-outs', d.sevens]]));
    if (d.best) out.push(ui.section('Best roll', felt(ui, 'craps', [ui.el('div', { class: 'cz-hand' }, [ui.el('span', { class: 'tag', html: '<b style="font-size:1.4rem">' + (d.best.h ? 'Hard ' : '') + d.best.t + '</b>' }),
      ui.el('span', { class: 'tag', text: d.best.b || '' }), ui.el('span', { class: 'cz-res good', text: signed(d.best.a) })])]), { icon: 'trophy' }));
    var r = String(d.r || ''), n = d.n || [], rolls = [];
    for (var i = 0; i + 2 < r.length + 1; i += 3) rolls.push({ a: +r.charAt(i), b: +r.charAt(i + 1), k: r.charAt(i + 2), net: n[i / 3] });
    if (!rolls.length) return ui.wrap(out);
    // split into shooters' hands (each ends with a seven-out)
    var hands = [], cur = [];
    rolls.forEach(function (x) { cur.push(x); if (x.k === 'S') { hands.push(cur); cur = []; } });
    if (cur.length) hands.push(cur);
    var shown = hands.slice(-12), box = ui.el('div', { class: 'cz-shoot' });
    shown.forEach(function (h, j) {
      var net = h.reduce(function (a, x) { return a + (x.net || 0); }, 0), pts = h.filter(function (x) { return x.k === 'M'; }).length, end = h[h.length - 1].k === 'S';
      var row = ui.el('div', { class: 'cz-rolls' });
      h.forEach(function (x) { row.appendChild(ui.el('span', { class: 'cz-roll ' + (x.k === '.' ? '' : x.k), title: (x.a + x.b) + (x.net ? ' ' + signed(x.net) : ''), html: mini(x.a) + mini(x.b) })); });
      box.appendChild(ui.el('div', { class: 'cz-sh' }, [ui.el('div', { class: 'hd' }, [ui.el('span', { text: 'Shooter ' + (hands.length - shown.length + j + 1) + ' · ' + h.length + ' roll' + (h.length === 1 ? '' : 's') + (pts ? ' · ' + pts + ' point' + (pts === 1 ? '' : 's') + ' made' : '') + (end ? '' : ' · still rolling') }),
        ui.el('span', { style: { color: net > 0 ? '#86efac' : net < 0 ? '#fca5a5' : '' }, text: signed(net) })]), row]));
    });
    var legend = ui.el('div', { class: 'cz-kv', html: '<span><span class="cz-roll P" style="display:inline-block;width:10px;height:10px;vertical-align:-1px"></span> point set</span><span><span class="cz-roll M" style="display:inline-block;width:10px;height:10px;vertical-align:-1px"></span> point made</span><span><span class="cz-roll S" style="display:inline-block;width:10px;height:10px;vertical-align:-1px"></span> seven out</span><span><span class="cz-roll N" style="display:inline-block;width:10px;height:10px;vertical-align:-1px"></span> natural</span><span><span class="cz-roll C" style="display:inline-block;width:10px;height:10px;vertical-align:-1px"></span> craps</span>' });
    out.push(ui.section(hands.length > shown.length ? 'The last ' + shown.length + ' shooters' : 'Every roll', felt(ui, 'craps', [box, legend]), { icon: 'dice' }));
    return ui.wrap(out);
  });

  // ═════════════ Baccarat ═════════════
  function bead(rd, rf) {
    var C = 17, R6 = 6, col = { B: '#e0283a', P: '#2a62d6', T: '#1f9d55' }, shoes = String(rd).split('|'), flags = String(rf).split('|'), x0 = 0, body = '';
    shoes.forEach(function (sh, si) {
      if (!sh) return;
      sh.split('').forEach(function (w, i) {
        var f = +(flags[si] || '').charAt(i) || 0, cx = x0 + Math.floor(i / R6) * C + C / 2, cy = (i % R6) * C + C / 2;
        body += '<circle cx="' + cx + '" cy="' + cy + '" r="7" fill="' + (col[w] || '#888') + '"/><text x="' + cx + '" y="' + (cy + 3.4) + '" font-size="9.5" font-weight="900" fill="#fff" text-anchor="middle" font-family="system-ui,sans-serif">' + w + '</text>';
        if (f & 2) body += '<circle cx="' + (cx - 5) + '" cy="' + (cy - 5) + '" r="2.2" fill="#e0283a" stroke="#fff" stroke-width=".8"/>';
        if (f & 1) body += '<circle cx="' + (cx + 5) + '" cy="' + (cy + 5) + '" r="2.2" fill="#2a62d6" stroke="#fff" stroke-width=".8"/>';
      });
      x0 += Math.ceil(sh.length / R6) * C;
      if (si < shoes.length - 1) { body += '<line x1="' + (x0 + 3) + '" y1="0" x2="' + (x0 + 3) + '" y2="' + R6 * C + '" stroke="#c9c2b0" stroke-width="1.5" stroke-dasharray="3 3"/>'; x0 += 6; }
    });
    var cols = Math.max(Math.ceil(x0 / C), 18), W = Math.max(x0, cols * C), H = R6 * C, grid = '';
    for (var gx = 0; gx <= W; gx += C) grid += '<line x1="' + gx + '" y1="0" x2="' + gx + '" y2="' + H + '" stroke="#e6e1d4" stroke-width=".6"/>';
    for (var gy = 0; gy <= H; gy += C) grid += '<line x1="0" y1="' + gy + '" x2="' + W + '" y2="' + gy + '" stroke="#e6e1d4" stroke-width=".6"/>';
    return '<svg width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Bead plate">' + grid + body + '</svg>';
  }
  function bacHand(ui, x, title) {
    var W = { P: 'Player wins', B: 'Banker wins', T: 'Tie' }[x.w] || '';
    var side = function (lab, cs, t, win) { return ui.el('div', { class: 'side' + (win ? ' win' : '') }, [ui.el('div', { class: 'cz-line' }, [ui.el('div', { class: 'lab', text: lab })]), ui.el('div', { class: 'tot', text: String(t) }), ui.cards(cs)]); };
    var rows = (x.bets || []).map(function (b) { return ui.el('tr', null, [ui.el('td', { text: b.t }), ui.el('td', { class: 'dim', text: ui.money(b.a) }), ui.el('td', { class: b.r > b.a ? 'good' : 'dim', text: b.r > b.a ? 'paid ' + ui.money(b.r) : b.r === b.a ? 'push' : 'lost' })]); });
    return felt(ui, 'baccarat', [ui.el('div', { class: 'cz-hand' }, [ui.el('div', { class: 'cz-kv', html: '<span><b>' + ui.esc(title) + '</b></span><span>hand ' + x.n + '</span><span>' + W + '</span>' }), ui.el('span', { class: 'cz-res ' + cls(x.net), text: signed(x.net) })]),
      ui.el('div', { class: 'cz-vs' }, [side('Player', x.p, x.pt, x.w === 'P'), side('Banker', x.b, x.bt, x.w === 'B')]), rows.length ? ui.el('table', { class: 'cz-bets' }, rows) : null]);
  }
  R('baccarat', function (e, ui) {
    var d = e.dt; if (!d) return null;
    var out = [], c = d.counts || {};
    out.push(bankStats(ui, d.bank, e.players && e.players[0] ? e.players[0].score : null, [['Hands', d.hands], ['Naturals', d.nat || null], ['Longest run', d.streak && d.streak.n >= 3 ? d.streak.n + ' ' + (d.streak.w === 'B' ? 'Banker' : 'Player') : null]]));
    if (d.rd) out.push(ui.section('The road', [ui.el('div', { class: 'cz-bead', html: bead(d.rd, d.rf) }),
      ui.bars([{ label: 'Banker', value: c.B || 0, color: '#e0283a' }, { label: 'Player', value: c.P || 0, color: '#2a62d6' }, { label: 'Tie', value: c.T || 0, color: '#1f9d55' }])], { icon: 'rows' }));
    if (d.big) out.push(ui.section('Biggest win', bacHand(ui, d.big, 'Best hand'), { icon: 'trophy' }));
    if (d.last) out.push(ui.section('Last hand', bacHand(ui, d.last, 'Last hand')));
    return ui.wrap(out);
  });

  // ═════════════ Three Card Poker ═════════════
  function tcpWhy(x) { return x.f ? 'Folded' : !x.q ? 'Dealer did not qualify' : x.c > 0 ? 'Beat the dealer' : x.c < 0 ? 'Dealer won' : 'Tie'; }
  function tcpHand(ui, x, title) {
    return felt(ui, 'threecardpoker', [ui.el('div', { class: 'cz-hand' }, [ui.el('div', { class: 'cz-kv', html: '<span><b>' + ui.esc(title) + '</b></span><span>hand ' + x.h + '</span><span>' + tcpWhy(x) + '</span>' }), ui.el('span', { class: 'cz-res ' + cls(x.n), text: signed(x.n) })]),
      line(ui, 'Dealer · ' + x.de, x.d, null, null, { small: false }), line(ui, 'You · ' + x.pe, x.p, null, null, { small: false }),
      ui.el('div', { class: 'cz-kv', html: '<span>Ante <b>' + ui.money(x.a) + '</b></span>' + (x.pl ? '<span>Play <b>' + ui.money(x.pl) + '</b></span>' : '') + (x.pp ? '<span>Pair Plus <b>' + ui.money(x.pp) + '</b></span>' : '') })]);
  }
  function handRows(ui, list, fn) { return ui.el('div', { class: 'cz-list' }, list.map(fn)); }
  R('threecardpoker', function (e, ui) {
    var d = e.dt; if (!d) return null;
    var out = [];
    out.push(bankStats(ui, d.bank, e.players && e.players[0] ? e.players[0].score : null, [['Hands', d.hands], ['Won · lost', d.won + ' · ' + d.lost], ['Pair Plus paid', d.pp ? ui.money(d.pp) : null]]));
    if (d.big) out.push(ui.section('Biggest win', tcpHand(ui, d.big, 'Best hand'), { icon: 'trophy' }));
    var last = (d.last || []).slice().reverse();
    if (last.length) out.push(ui.section('Last hands', handRows(ui, last, function (x) {
      return ui.el('div', { class: 'cz-row' }, [ui.cards(codes(x.p)), ui.el('div', { class: 'tx' }, [ui.el('span', { text: x.pe + ' vs ' + x.de }), ui.el('small', { text: 'Hand ' + x.h + ' · ' + tcpWhy(x) })]), ui.el('span', { class: 'am ' + cls(x.n), text: signed(x.n) })]);
    })));
    return ui.wrap(out);
  });

  // ═════════════ Pai Gow ═════════════
  function pgMark(v) { return v > 0 ? 'wins' : v === 0 ? 'copy' : 'loses'; }
  function pgHand(ui, x, title) {
    var o = { win: 'Won both', push: 'Push', lose: 'Lost' }[x.o] || '';
    return felt(ui, 'paigow', [ui.el('div', { class: 'cz-hand' }, [ui.el('div', { class: 'cz-kv', html: '<span><b>' + ui.esc(title) + '</b></span><span>hand ' + x.h + '</span><span>' + o + '</span><span>bet ' + ui.money(x.b) + '</span>' }), ui.el('span', { class: 'cz-res ' + cls(x.n), text: signed(x.n) })]),
      line(ui, 'Your high · ' + x.phn + ' · ' + pgMark(x.hw), x.ph), line(ui, 'Your low · ' + x.pln + ' · ' + pgMark(x.lw), x.pl),
      line(ui, 'Dealer high · ' + x.dhn, x.dh), line(ui, 'Dealer low · ' + x.dln, x.dl),
      ui.el('div', { class: 'cz-kv', text: x.way ? 'Set the house way.' : 'Set your own way.' })]);
  }
  R('paigow', function (e, ui) {
    var d = e.dt; if (!d) return null;
    var out = [];
    out.push(bankStats(ui, d.bank, e.players && e.players[0] ? e.players[0].score : null, [['Hands', d.hands], ['Won · push · lost', d.won + ' · ' + d.push + ' · ' + d.lost], ['Commission', d.comm ? ui.money(d.comm) : null]]));
    if (d.big) out.push(ui.section('Biggest win', pgHand(ui, d.big, 'Best hand'), { icon: 'trophy' }));
    var last = (d.last || []).slice().reverse();
    if (last.length) out.push(ui.section('Last hands', handRows(ui, last, function (x) {
      return ui.el('div', { class: 'cz-row' }, [cardRow(ui, codes(x.ph).concat(codes(x.pl))), ui.el('div', { class: 'tx' }, [ui.el('span', { text: x.phn + ' / ' + x.pln }), ui.el('small', { text: 'Hand ' + x.h + ' · dealer ' + x.dhn.toLowerCase() + ' / ' + x.dln.toLowerCase() })]), ui.el('span', { class: 'am ' + cls(x.n), text: signed(x.n) })]);
    })));
    return ui.wrap(out);
  });
})();
