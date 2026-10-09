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
    tb.appendChild(ui.el('tr', null, [ui.el('th', { text: '' }), ui.el('th', { text: 'Horse', style: { 'text-align': 'left', 'padding-left': '4px' } }), ui.el('th', { text: 'Odds' }), ui.el('th', { text: 'Margin' })]));
    order.forEach(function (post, r) {
      var h = F[post - 1]; if (!h) return;
      var mg = r === 0 ? (x.g && x.g[0] != null ? lengthsText(x.g[0]) : '') : x.g && x.g[r] != null && r < order.length - 1 ? lengthsText(x.g[r]) : '';
      if (r === order.length - 1) mg = '';
      tb.appendChild(ui.el('tr', { class: r === 0 ? 'w' : '' }, [
        ui.el('td', { class: 'ps', text: ['1st', '2nd', '3rd'][r] || (r + 1) + 'th' }),
        ui.el('td', { class: 'nm', html: '<span class="cz-nm">' + cloth(post) + silkSvg(h.k) + '<span>' + ui.esc(h.n) + '</span></span>' }),
        ui.el('td', { text: h.o }),
        ui.el('td', { class: 'mg', text: mg })
      ]));
    });
    bd.appendChild(tb);
    if (x.ph) bd.appendChild(ui.el('div', { class: 'note', text: 'Photo finish.' }));
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
})();
